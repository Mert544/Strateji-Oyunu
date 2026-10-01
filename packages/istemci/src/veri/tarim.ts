/**
 * Tarım ve iklim görselleştirme yardımcıları (saf; DOM ve three.js gerektirmez): iklim takvimi biçimlendirme,
 * hasat ritmi, toprak verimliliği paleti, ekim deseni, olay simgesi eşlemesi ve "Tarım" görünümünün bölge renkleri.
 * Ürün, olay türü ve iklim tipi listeleri sabit değildir; dizinden (içerikten) gelir. Bilinmeyen kimlikler için
 * genel bir görünüm kullanılır, böylece yeni türler kendiliğinden listelenir.
 */
import type { Dizin, DizinTarim, Kare, OlayKaresi } from "./kare-tipleri";
import { kullanimRengi } from "./renkler";
import type { BolgeRenkTamponu, RGB } from "./renkler";

// ---------------------------------------------------------------------------------------------
// İklim takvimi
// ---------------------------------------------------------------------------------------------

export const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"] as const;
export const AY_KISA = ["Oca", "Şub", "Mar", "Nis", "May", "Haz", "Tem", "Ağu", "Eyl", "Eki", "Kas", "Ara"] as const;

export interface TakvimParametresi {
  baslangicGunu: number;
  gunCarpani: number;
  ayGunleri: readonly number[];
}

export interface TakvimDurumu {
  /** Mutlak takvim günü (başlangıç günü dahil; yıl sınırını aşar). */
  mutlakGun: number;
  /** 1'den başlayan takvim yılı sırası (başlangıç yılı = 1). */
  yil: number;
  /** Yılın günü (0 = 1 Ocak, 0..364). */
  yilGunu: number;
  /** Ay (0 = Ocak .. 11 = Aralık). */
  ay: number;
  /** Ayın günü (1'den başlar). */
  gunAy: number;
  ayAdi: string;
}

/**
 * Sim saatinden takvim durumu. Çekirdekteki `mutlakTakvimGunu`/`takvimGunu` ile aynı kural:
 * mutlak gün = baslangicGunu + floor(simGunu x gunCarpani); takvim günü = mutlak gün mod 365.
 */
export function takvimDurumu(simSaat: number, p: TakvimParametresi): TakvimDurumu {
  const gecen = Math.floor((Math.max(0, simSaat) * p.gunCarpani) / 24 + 1e-9);
  const mutlakGun = p.baslangicGunu + gecen;
  const yil = Math.floor(mutlakGun / 365) + 1;
  const yilGunu = ((mutlakGun % 365) + 365) % 365;
  let ay = 0;
  let baslangic = 0;
  for (let m = 0; m < p.ayGunleri.length; m++) {
    const g = p.ayGunleri[m] as number;
    if (yilGunu < baslangic + g) {
      ay = m;
      break;
    }
    baslangic += g;
    ay = m;
  }
  return { mutlakGun, yil, yilGunu, ay, gunAy: yilGunu - baslangic + 1, ayAdi: AY_ADLARI[ay] ?? "?" };
}

/** "12 Ekim" biçimi. */
export function takvimMetni(d: TakvimDurumu): string {
  return `${d.gunAy} ${d.ayAdi}`;
}

/**
 * Hasat ritmi: tarım bölgelerinin aylık hasat oranlarının ortalaması (binde; 1000 = yıllık ortalama).
 * egriler: iklim tipi kimliği -> 12 aylık hasat oranı (ppm); bolgeTipleri: tarım bölgelerinin iklim tipi kimlikleri.
 */
export function hasatAylikHesapla(egriler: Readonly<Record<string, readonly number[]>>, bolgeTipleri: readonly string[]): number[] {
  const toplam = new Array<number>(12).fill(0);
  let n = 0;
  for (const tip of bolgeTipleri) {
    const e = egriler[tip];
    if (!e) continue;
    n++;
    for (let a = 0; a < 12; a++) toplam[a] = (toplam[a] as number) + (e[a] ?? 0);
  }
  if (n === 0) return new Array<number>(12).fill(1000);
  return toplam.map((x) => Math.round(x / n / 1000));
}

/** Hasat oranı (binde) -> "%94" metni. */
export function hasatMetni(binde: number): string {
  return `%${Math.round(binde / 10)}`;
}

/** Hasat ritmi çubuğu için 0..1 yükseklik (en yüksek aya göre; tek renkli çubuk grafiği). */
export function hasatYukseklikleri(aylik: readonly number[]): number[] {
  const mx = Math.max(1, ...aylik);
  return aylik.map((v) => Math.min(1, Math.max(0, v / mx)));
}

/** Takvim parametresini dizinden çıkarır. */
export function takvimParametresi(t: DizinTarim): TakvimParametresi {
  return { baslangicGunu: t.baslangicGunu, gunCarpani: t.gunCarpani, ayGunleri: t.ayGunleri };
}

// ---------------------------------------------------------------------------------------------
// Adlar
// ---------------------------------------------------------------------------------------------

export const IKLIM_TIPI_AD: Record<string, string> = {
  akdeniz: "Akdeniz",
  karasal: "Karasal",
  karadeniz: "Karadeniz (yağışlı)",
  balkan_kita: "Balkan karasal",
  kurak: "Kurak",
  dag_yayla: "Dağ ve yayla",
};

/** "yeni_tip" -> "Yeni tip" (bilinmeyen kimlikler için okunur ad). */
export function kimlikAdi(id: string): string {
  const s = id.replace(/_/g, " ");
  return s.charAt(0).toLocaleUpperCase("tr-TR") + s.slice(1);
}

export function iklimTipiAdi(id: string): string {
  return IKLIM_TIPI_AD[id] ?? kimlikAdi(id);
}

// ---------------------------------------------------------------------------------------------
// Olay simgeleri
// ---------------------------------------------------------------------------------------------

export interface OlaySimgesi {
  /** SDF glif kodu (simge gölgelendiricisindeki tür). */
  glif: number;
  ad: string;
  /** Kısa açıklama (liste satırı). */
  etki: string;
  /** Rozet içi çizim: 20x20 (-10..10) SVG iç işaretlemesi, beyaz çizgi (HTML liste ve lejant için; küredeki glifle aynı simge). */
  ikon: string;
  /** CSS özel özelliği (tema belirteci). */
  renkDegiskeni: string;
}

/** Simge gölgelendiricisindeki olay glif kodları: 8 kuraklık, 9 don, 10 sel, 11 kış fırtınası, 12 bilinmeyen. */
export const OLAY_SIMGELERI: Readonly<Record<string, OlaySimgesi>> = {
  kuraklik: {
    glif: 8,
    ad: "Kuraklık",
    etki: "ekili tarım çıktısı düşer",
    ikon: '<circle r="3.1"/><path d="M0 -5.2V-7.4M0 5.2V7.4M-5.2 0H-7.4M5.2 0H7.4M-3.7 -3.7L-5.2 -5.2M3.7 3.7L5.2 5.2M-3.7 3.7L-5.2 5.2M3.7 -3.7L5.2 -5.2"/>',
    renkDegiskeni: "--olay-kuraklik",
  },
  don: {
    glif: 9,
    ad: "Don",
    etki: "ekili tarım çıktısı düşer",
    ikon: '<path d="M0 -7.5V7.5M-6.5 -3.75L6.5 3.75M-6.5 3.75L6.5 -3.75"/>',
    renkDegiskeni: "--olay-don",
  },
  sel: {
    glif: 10,
    ad: "Sel",
    etki: "tarım çıktısı düşer, yollar etkilenir",
    ikon: '<path d="M-7.5 -2.4q1.9 -2.4 3.75 0t3.75 0t3.75 0t3.75 0M-7.5 3q1.9 -2.4 3.75 0t3.75 0t3.75 0t3.75 0"/>',
    renkDegiskeni: "--olay-sel",
  },
  kis_firtinasi: {
    glif: 11,
    ad: "Kış fırtınası",
    etki: "yol kapasitesi düşer",
    ikon: '<path d="M2.5 -8L-3 0.5H3L-2.5 8"/>',
    renkDegiskeni: "--olay-kis",
  },
};

const OLAY_BILINMEYEN: OlaySimgesi = { glif: 12, ad: "", etki: "iklim olayı", ikon: '<path d="M0 -7V1.5"/><circle cx="0" cy="6" r="0.9"/>', renkDegiskeni: "--olay-diger" };

/** Olay türü kimliğinden simge (bilinmeyen türler genel simgeyle, adı kimlikten türetilir). */
export function olaySimgesi(tur: string): OlaySimgesi {
  return OLAY_SIMGELERI[tur] ?? { ...OLAY_BILINMEYEN, ad: kimlikAdi(tur) };
}

export type OlayEvresi = "uyari" | "aktif" | "bitti";

/** Olayın evresi: etki başlamadan önce uyarı, sonra aktif, bitişten sonra bitti. */
export function olayEvresi(o: Pick<OlayKaresi, "baslangic" | "bitis">, saat: number): OlayEvresi {
  if (saat < o.baslangic) return "uyari";
  if (saat < o.bitis) return "aktif";
  return "bitti";
}

/** Şu anki etki payı (0..1): aktif olayda doğrusal sönüm, uyarıda 1 (henüz başlamadı), bitince 0. */
export function olaySonumu(o: Pick<OlayKaresi, "baslangic" | "bitis">, saat: number): number {
  if (saat < o.baslangic) return 1;
  if (saat >= o.bitis) return 0;
  return (o.bitis - saat) / Math.max(1, o.bitis - o.baslangic);
}

/** Olayları listeler: önce aktif (kalan süreye göre), sonra uyarıdakiler (başlangıca göre); biten olaylar atılır. */
export function olaylariSirala(olaylar: readonly OlayKaresi[], saat: number): Array<{ olay: OlayKaresi; evre: OlayEvresi }> {
  const l = olaylar.map((olay) => ({ olay, evre: olayEvresi(olay, saat) })).filter((x) => x.evre !== "bitti");
  l.sort((a, b) => {
    if (a.evre !== b.evre) return a.evre === "aktif" ? -1 : 1;
    return a.evre === "aktif" ? a.olay.bitis - b.olay.bitis : a.olay.baslangic - b.olay.baslangic;
  });
  return l;
}

/** "3 gün 4 sa" / "5 sa" biçiminde süre (saat girdili). */
export function sureMetni(saat: number): string {
  const s = Math.max(0, Math.round(saat));
  if (s < 24) return `${s} sa`;
  const g = Math.floor(s / 24);
  const k = s % 24;
  return k === 0 ? `${g} gün` : `${g} gün ${k} sa`;
}

// ---------------------------------------------------------------------------------------------
// Tarım görünümü: renk ve desen
// ---------------------------------------------------------------------------------------------

export interface TarimPaleti {
  /** Toprak verimliliği sıralı paleti (düşük -> yüksek; 5 durak). */
  toprak: RGB[];
  /** Tarım dışı bölge dolgusu. */
  tarimDisi: RGB;
}

/** Toprak verimliliği (toprak tabanı x toprak durumu; 1 = referans ova) -> 0..1 palet konumu (0,2..1,2 aralığı). */
export function verimKonumu(verim: number): number {
  return Math.min(1, Math.max(0, (verim - 0.2) / 1.0));
}

/** Bölgenin toprak verimliliği (1 = referans ova); tarım dışıysa null. Girdiler binde. */
export function toprakVerimi(tabanBinde: number, toprakBinde: number): number {
  return (tabanBinde / 1000) * (toprakBinde / 1000);
}

export function toprakRengi(verim: number, palet: TarimPaleti): RGB {
  return kullanimRengi(verimKonumu(verim), palet.toprak);
}

/**
 * Ekim karışımı -> desen kodu (bölge gölgelendiricisinin desen kanalı): payı en yüksek ürün %70 veya daha fazlaysa
 * o ürünün deseni (0 düz, 1 noktalı, 2 çizgili, 3+ çapraz); hiçbiri %70'e varmıyorsa karışık = çapraz (3).
 */
export function ekimDeseni(ekimYuzde: readonly number[]): number {
  let en = 0;
  let enPay = -1;
  let top = 0;
  for (let i = 0; i < ekimYuzde.length; i++) {
    const p = ekimYuzde[i] as number;
    top += p;
    if (p > enPay) {
      enPay = p;
      en = i;
    }
  }
  if (top <= 0) return 0;
  if (enPay * 100 < top * 70) return 3;
  return Math.min(3, en);
}

/** Ekim karışımının kısa metni: "Buğday %50 · Baklagil %25 · Nadas %25" (sıfır paylar atlanır). */
export function ekimMetni(ekimYuzde: readonly number[], urunler: ReadonlyArray<{ ad: string }>): string {
  const p: string[] = [];
  ekimYuzde.forEach((y, i) => {
    if (y > 0) p.push(`${urunler[i]?.ad ?? `Ürün ${i + 1}`} %${y}`);
  });
  return p.length ? p.join(" · ") : "—";
}

/**
 * "Tarım" görünümünün bölge renkleri: dolgu = toprak verimliliği (sıralı palet), ikinci kanal = ekim karışımı deseni.
 * Tarım dışı bölge nötr renkte, desensiz. Tarım kapalıysa (kare veya dizin tarımı yoksa) hepsi tarım dışı gibi boyanır.
 */
export function tarimRenkleriniHesapla(kare: Kare | null, dizin: Dizin, palet: TarimPaleti, cikti: BolgeRenkTamponu): void {
  const nb = dizin.bolgeler.length;
  for (let i = 0; i < nb; i++) {
    const tk = kare?.bolgeler[i]?.tarim;
    const tanim = dizin.tarim?.bolgeler[i];
    let renk: RGB = palet.tarimDisi;
    let desen = 0;
    if (tk && tanim) {
      renk = toprakRengi(toprakVerimi(tanim[1], tk[0]), palet);
      desen = ekimDeseni(tk[5]);
    }
    cikti.renk[3 * i] = renk[0];
    cikti.renk[3 * i + 1] = renk[1];
    cikti.renk[3 * i + 2] = renk[2];
    cikti.desen[i] = desen;
    cikti.glif[i] = -1;
  }
}

/** Tarım görünümü özeti için istatistik: tarım bölgesi sayısı, ortalama ve en düşük verimlilik. */
export interface TarimOzeti {
  tarimBolgesi: number;
  ortVerim: number;
  enDusuk: { bolge: number; verim: number } | null;
  enYuksek: { bolge: number; verim: number } | null;
}

export function tarimOzeti(kare: Kare, dizin: Dizin): TarimOzeti {
  let n = 0;
  let top = 0;
  let dusuk: TarimOzeti["enDusuk"] = null;
  let yuksek: TarimOzeti["enYuksek"] = null;
  const nb = dizin.bolgeler.length;
  for (let i = 0; i < nb; i++) {
    const tk = kare.bolgeler[i]?.tarim;
    const tanim = dizin.tarim?.bolgeler[i];
    if (!tk || !tanim) continue;
    const v = toprakVerimi(tanim[1], tk[0]);
    n++;
    top += v;
    if (!dusuk || v < dusuk.verim) dusuk = { bolge: i, verim: v };
    if (!yuksek || v > yuksek.verim) yuksek = { bolge: i, verim: v };
  }
  return { tarimBolgesi: n, ortVerim: n ? top / n : 0, enDusuk: dusuk, enYuksek: yuksek };
}
