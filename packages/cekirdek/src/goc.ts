/**
 * Kalıcı kimlik ve içerik göçü (G8, docs/06 §14 "Kalıcı kimlik ve içerik göçü").
 *
 * Bellek içi dünya (performans için) içerik dizilerini İNDEKSLE tutar: mal, tesis türü, yöntem, birlik, teknoloji ve
 * tarım ürünü. İçeriğe düğüm/mal/birlik eklenirse indeksler kayar ve eski anlık görüntüler bozulurdu. Çözüm: anlık
 * görüntü zarfı (sürüm 2) `icerikKimlikTablosu` taşır = her indeks uzayı için SIRALI kimlik listesi (yazıldığı andaki
 * içerik). Yüklemede bu tablo mevcut içerikle KİMLİĞE göre eşlenir ve dünya yeniden indekslenir.
 *
 * Kurallar (yalnız-ekle ilkesi):
 * - Görüntüde olup içerikte olmayan kimlik: açık `SerilestirmeHatasi` (kaldırma desteklenmez).
 * - İçerikte olup görüntüde olmayan kimlik: varsayılanla doldurulur (aşağıdaki "varsayılanlar").
 * - Sıra değişmiş / araya eklenmiş içerik yüklenir (eşleme kimlikle yapılır) ama `yalnizEkleDenetimi` bunu İHLAL
 *   olarak raporlar: indeks sırasına bağlı kararlar (lojistik önceliğinde eşitlik kırma gibi) değişir. Üretimde içerik
 *   yalnız SONA eklenmelidir; `yalnizEkleZorunlu` seçeneği ihlali hata yapar.
 *
 * Varsayılanlar (yeni kimlik, görüntü anı t): stok {miktar 0, oran 0, t0 = t, kapasite = depoKapasitesi (+ Ambar eki,
 * depolanabilir mal)}; israf/üretim/ticaret alanı 0; rezerv = harita bölgesinin (işletme düğümünde merkezin) tanımı;
 * pazar fiyatı = `tabanFiyat`; kapsam hücresi "yok"; birlik 0; tarım ürün payı 0 (toplam PPM korunur). Yeni tesis türü /
 * yöntem / teknoloji hiçbir örnek yaratmaz. Başlangıç kiti yeni mala VERİLMEZ (geç eklenen mal bedava stok dağıtmaz).
 *
 * Bu modül yalnız çekirdek tiplerine ve `kurulum`a bağlıdır; motoru içe aktarmaz.
 */
import { dunyaKur } from "./kurulum";
import { ekYapiToplami } from "./mulk/yapi";
import type { BolgeDurumu, DerlenmisIcerik, Dunya, KapsamHucresi, Stok } from "./tipler";

/** Hata sınıfı serilestir.ts'te; döngüsel içe aktarma olmasın diye burada yalnız imza (kurucu) enjekte edilir. */
export type GocHatasiUretici = (yol: string, mesaj: string) => Error;

/** İçerik kimlik tablosunun indeks uzayları (alfabetik; kanonik JSON anahtar sırası). */
export const KIMLIK_TABLOSU_ADLARI = ["birlikler", "mallar", "tarimUrunleri", "teknolojiler", "tesisTurleri", "yontemler"] as const;
export type KimlikTablosuAdi = (typeof KIMLIK_TABLOSU_ADLARI)[number];

/** Her indeks uzayı için sıralı kimlik listesi: `tablo.mallar[i]` = dünyadaki mal indeksi i'nin kimliği. */
export type IcerikKimlikTablosu = Record<KimlikTablosuAdi, string[]>;

/** Mevcut içerikten kimlik tablosu (derlenmiş içerikteki dizi sırası = indeks sırası). */
export function icerikKimlikTablosuOlustur(ic: Pick<DerlenmisIcerik, "icerik">): IcerikKimlikTablosu {
  const i = ic.icerik;
  return {
    birlikler: i.birlikler.map((x) => x.id),
    mallar: i.mallar.map((x) => x.id),
    tarimUrunleri: (i.tarimUrunleri ?? []).map((x) => x.id),
    teknolojiler: i.teknolojiler.map((x) => x.id),
    tesisTurleri: i.tesisTurleri.map((x) => x.id),
    yontemler: i.yontemler.map((x) => x.id),
  };
}

/** İki tablo bire bir aynı mı (sıra dahil)? */
export function kimlikTablolariEsit(a: IcerikKimlikTablosu, b: IcerikKimlikTablosu): boolean {
  for (const ad of KIMLIK_TABLOSU_ADLARI) {
    const x = a[ad];
    const y = b[ad];
    if (x.length !== y.length) return false;
    for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) return false;
  }
  return true;
}

/** Kanonik JSON (anahtarlar alfabetik, boşluksuz): zarfa yazılan biçim. */
export function kimlikTablosuMetni(t: IcerikKimlikTablosu): string {
  return `{${KIMLIK_TABLOSU_ADLARI.map((ad) => `${JSON.stringify(ad)}:${JSON.stringify(t[ad])}`).join(",")}}`;
}

// ---------------------------------------------------------------------------
// Yalnız-ekle denetimi
// ---------------------------------------------------------------------------

export type EkleIhlaliTuru = "silinen" | "tasinan" | "araya_eklenen";

export interface EkleIhlali {
  tablo: KimlikTablosuAdi;
  tur: EkleIhlaliTuru;
  kimlik: string;
  /** Eski tablodaki indeks (araya_eklenen için -1). */
  eskiIndeks: number;
  /** Yeni tablodaki indeks (silinen için -1). */
  yeniIndeks: number;
}

export interface EkleDenetimi {
  /** Yalnızca sona ekleme (eski tablo yeni tablonun öneki) mi? Silme, taşıma ve araya ekleme false yapar. */
  yalnizEkle: boolean;
  /** Eski tabloda olup yenide olmayanlar (kaldırma: yükleme bunları HATA sayar). */
  silinen: IcerikKimlikTablosu;
  /** Yeni tabloda olup eskide olmayanlar (yükleme bunları varsayılanla doldurur). */
  eklenen: IcerikKimlikTablosu;
  ihlaller: EkleIhlali[];
}

function bosTablo(): IcerikKimlikTablosu {
  return { birlikler: [], mallar: [], tarimUrunleri: [], teknolojiler: [], tesisTurleri: [], yontemler: [] };
}

/**
 * Eski kimlik tablosundan yenisine geçişin yalnız-ekle ilkesine uygunluğunu denetler: her eski kimlik yenide AYNI indekste
 * olmalı (silme, taşıma ve araya ekleme ihlaldir). Saf işlev; CI'da (`icerik-kimlik-kilidi` testi) ve göç öncesi kullanılır.
 */
export function yalnizEkleDenetimi(eski: IcerikKimlikTablosu, yeni: IcerikKimlikTablosu): EkleDenetimi {
  const silinen = bosTablo();
  const eklenen = bosTablo();
  const ihlaller: EkleIhlali[] = [];
  for (const ad of KIMLIK_TABLOSU_ADLARI) {
    const e = eski[ad];
    const y = yeni[ad];
    const yeniIndeks = new Map<string, number>(y.map((k, i) => [k, i]));
    const eskiKume = new Set<string>(e);
    e.forEach((k, i) => {
      const j = yeniIndeks.get(k);
      if (j === undefined) {
        silinen[ad].push(k);
        ihlaller.push({ tablo: ad, tur: "silinen", kimlik: k, eskiIndeks: i, yeniIndeks: -1 });
      } else if (j !== i) {
        ihlaller.push({ tablo: ad, tur: "tasinan", kimlik: k, eskiIndeks: i, yeniIndeks: j });
      }
    });
    y.forEach((k, j) => {
      if (eskiKume.has(k)) return;
      eklenen[ad].push(k);
      if (j < e.length) ihlaller.push({ tablo: ad, tur: "araya_eklenen", kimlik: k, eskiIndeks: -1, yeniIndeks: j });
    });
  }
  return { yalnizEkle: ihlaller.length === 0, silinen, eklenen, ihlaller };
}

// ---------------------------------------------------------------------------
// Yeniden indeksleme
// ---------------------------------------------------------------------------

/** Bir indeks uzayının eski -> yeni eşlemesi. */
interface Esleme {
  /** eski indeks -> yeni indeks */
  eskiYeni: number[];
  /** yeni indeks -> eski indeks (-1: görüntüde yok, yeni eklenmiş) */
  yeniEski: number[];
  yeniN: number;
  eskiN: number;
  /** Eşleme özdeşlik mi (aynı kimlikler, aynı sıra)? */
  ozdes: boolean;
}

function eslemeKur(ad: KimlikTablosuAdi, eski: readonly string[], yeni: readonly string[], hata: GocHatasiUretici): Esleme {
  const yeniIndeks = new Map<string, number>(yeni.map((k, i) => [k, i]));
  const eskiYeni: number[] = [];
  eski.forEach((k, i) => {
    const j = yeniIndeks.get(k);
    if (j === undefined) throw hata(`$.icerikKimlikTablosu.${ad}[${i}]`, `kaldirilmis kimlik: ${k} (yalniz-ekle ilkesi: icerikten kimlik silinemez)`);
    eskiYeni.push(j);
  });
  const yeniEski: number[] = yeni.map(() => -1);
  eskiYeni.forEach((j, i) => {
    yeniEski[j] = i;
  });
  const ozdes = eski.length === yeni.length && eskiYeni.every((j, i) => j === i);
  return { eskiYeni, yeniEski, yeniN: yeni.length, eskiN: eski.length, ozdes };
}

/** Eski dizinin elemanlarını yeni indekslere taşır; görüntüde olmayan konumlar `varsayilan(yeniIndeks)` ile dolar. */
function diziTasi<T>(eski: readonly T[], e: Esleme, varsayilan: (yeniIndeks: number) => T): T[] {
  if (e.ozdes) return eski as T[];
  const y: T[] = new Array<T>(e.yeniN);
  for (let j = 0; j < e.yeniN; j++) {
    const i = e.yeniEski[j] as number;
    y[j] = i < 0 ? varsayilan(j) : (eski[i] as T);
  }
  return y;
}

/**
 * Dünyanın indeks sayılarının `tablo` ile uyumu (indeks aralıkları ve dizi uzunlukları). Göçten ÖNCE eski tabloya göre
 * çağrılır; böylece bozuk bir görüntü yeniden indekslemede sessizce yanlış yere taşınmaz.
 */
export function dunyaTabloUyumu(tablo: IcerikKimlikTablosu, d: Dunya, hata: GocHatasiUretici): void {
  const m = tablo.mallar.length;
  const nb = tablo.birlikler.length;
  const nt = tablo.tesisTurleri.length;
  const ny = tablo.yontemler.length;
  const nk = tablo.teknolojiler.length;
  const nu = tablo.tarimUrunleri.length;
  const uzunluk = (v: readonly unknown[], n: number, yol: string, ad: string): void => {
    if (v.length !== n) throw hata(yol, `${ad} sayisi ${v.length}, kimlik tablosunda ${n}`);
  };
  const aralik = (v: number, n: number, yol: string, ad: string): void => {
    if (!Number.isInteger(v) || v < 0 || v >= n) throw hata(yol, `${ad} indeksi ${v} aralik disi (0..${n - 1})`);
  };
  d.bolgeler.forEach((b, i) => {
    const y = `$.bolgeler[${i}]`;
    uzunluk(b.stoklar, m, `${y}.stoklar`, "mal");
    for (const k of ["israf", "uretimToplam", "uretimOrani", "rezervIlk", "rezervKalan"] as const) uzunluk(b[k], m, `${y}.${k}`, "mal");
    if (b.kesifSayisi !== undefined) uzunluk(b.kesifSayisi, m, `${y}.kesifSayisi`, "mal");
    if (b.yakitTedariki !== undefined && !tablo.mallar.includes(b.yakitTedariki.mal)) throw hata(`${y}.yakitTedariki.mal`, "kimlik tablosunda olmayan yakit");
    uzunluk(b.birlikler, nb, `${y}.birlikler`, "birlik");
    if (b.tarim !== undefined) uzunluk(b.tarim.ekimPpm, nu, `${y}.tarim.ekimPpm`, "tarim urunu");
    b.tesisler.forEach((t, j) => {
      aralik(t.tur, nt, `${y}.tesisler[${j}].tur`, "tesis turu");
      aralik(t.yontem, ny, `${y}.tesisler[${j}].yontem`, "yontem");
    });
    b.ticaretEmirleri.forEach((e, j) => aralik(e.mal, m, `${y}.ticaretEmirleri[${j}].mal`, "mal"));
  });
  d.oyuncular.forEach((o, i) => {
    const y = `$.oyuncular[${i}]`;
    o.teknolojiler.forEach((t, j) => aralik(t, nk, `${y}.teknolojiler[${j}]`, "teknoloji"));
    if (o.arastirma !== null) aralik(o.arastirma.teknoloji, nk, `${y}.arastirma.teknoloji`, "teknoloji");
  });
  for (const k of ["fiyat", "oyuncuTalebi", "oyuncuArzi"] as const) uzunluk(d.pazar[k], m, `$.pazar.${k}`, "mal");
  d.savaslar.forEach((s, i) => {
    if (s.sonuc === null) return;
    const y = `$.savaslar[${i}].sonuc`;
    uzunluk(s.sonuc.stokKaybi, m, `${y}.stokKaybi`, "mal");
    uzunluk(s.sonuc.saldiranBirlikKaybi, nb, `${y}.saldiranBirlikKaybi`, "birlik");
    uzunluk(s.sonuc.savunanBirlikKaybi, nb, `${y}.savunanBirlikKaybi`, "birlik");
  });
  d.insaatlar.forEach((s, i) => {
    const y = `$.insaatlar[${i}]`;
    if (s.tur === "tesis" && s.hedef >= 0) aralik(s.hedef, nt, `${y}.hedef`, "tesis turu");
    (s.odenenMal ?? []).forEach((c, j) => aralik(c[0], m, `${y}.odenenMal[${j}][0]`, "mal"));
  });
  d.partiler.forEach((p, i) => aralik(p.birlik, nb, `$.partiler[${i}].birlik`, "birlik"));
  d.lojistik.akislar.forEach((a, i) => aralik(a.mal, m, `$.lojistik.akislar[${i}].mal`, "mal"));
  d.lojistik.kapsam.forEach((s, i) => uzunluk(s, m, `$.lojistik.kapsam[${i}]`, "mal"));
  d.kuyruk.forEach((o, i) => {
    const v = o.veri;
    if (v.tur === "oran_delta" || v.tur === "esik" || v.tur === "sondaj_bitti") aralik(v.mal, m, `$.kuyruk[${i}].veri.mal`, "mal");
  });
}

/**
 * Dünyayı eski kimlik tablosunun indeks uzaylarından `ic` (mevcut içerik) uzaylarına YERİNDE taşır ve aynı nesneyi döndürür.
 * `eski`deki her kimlik `ic`te bulunmalıdır (aksi halde `hata` ile üretilen hata fırlatılır). Yeni kimliklere ilişkin
 * varsayılanlar modül başlığında. Tablolar özdeşse (ve `ic` tablosuyla aynıysa) dünyaya hiç dokunulmaz.
 *
 * Kapsam (indeksle saklanan her şey): bölge mal dizileri (stok, israf, üretim, rezerv, keşif), birlik adetleri, tesis türü ve
 * yöntem, ticaret emri malı, tarım ekim payları, oyuncu teknolojileri ve aktif araştırma, pazar dizileri, savaş sonucu dizileri,
 * inşaat hedefi (tesis türü) ve ödenen malzeme, üretim partisi birliği, lojistik akışı malı ve kapsam hücreleri, olay kuyruğunda
 * mal alanı taşıyan olaylar.
 */
export function dunyaYenidenIndeksle(d: Dunya, eski: IcerikKimlikTablosu, ic: DerlenmisIcerik, hata: GocHatasiUretici): Dunya {
  const yeni = icerikKimlikTablosuOlustur(ic);
  const mal = eslemeKur("mallar", eski.mallar, yeni.mallar, hata);
  const tur = eslemeKur("tesisTurleri", eski.tesisTurleri, yeni.tesisTurleri, hata);
  const yontem = eslemeKur("yontemler", eski.yontemler, yeni.yontemler, hata);
  const birlik = eslemeKur("birlikler", eski.birlikler, yeni.birlikler, hata);
  const tek = eslemeKur("teknolojiler", eski.teknolojiler, yeni.teknolojiler, hata);
  const urun = eslemeKur("tarimUrunleri", eski.tarimUrunleri, yeni.tarimUrunleri, hata);
  if (mal.ozdes && tur.ozdes && yontem.ozdes && birlik.ozdes && tek.ozdes && urun.ozdes) return d;

  // Varsayılanlar taze dünyadan okunur (yalnız harita bölgesi rezervi ve pazar fiyatı için); PRNG tüketmez, d'ye dokunmaz.
  const taze = mal.ozdes ? null : dunyaKur(ic, d.tohum);
  const t0 = d.zaman;
  const depoKapasitesi = ic.param.ekonomi.depoKapasitesi;
  const hb = ic.harita.bolgeler.length;
  const sifir = (): number => 0;

  // Önce harita bölgeleri (rezerv varsayılanı taze dünyadan), sonra işletme düğümleri (rezerv varsayılanı merkezden).
  const bolgeSirasi = d.bolgeler.map((_, i) => i).sort((a, b) => (a < hb ? 0 : 1) - (b < hb ? 0 : 1) || a - b);
  for (const bi of bolgeSirasi) {
    const b: BolgeDurumu = d.bolgeler[bi] as BolgeDurumu;
    const merkez: BolgeDurumu | undefined = b.merkez === undefined ? undefined : d.bolgeler[b.merkez];
    const rezervVarsayilan = (j: number): number => {
      if (merkez !== undefined) return merkez.rezervIlk[j] ?? 0;
      return taze?.bolgeler[bi]?.rezervIlk[j] ?? 0;
    };
    if (!mal.ozdes) {
      b.stoklar = diziTasi<Stok>(b.stoklar, mal, (j) => {
        const depolanabilir = ic.mallar[j]?.depolanabilir !== false;
        const kapasite = depoKapasitesi + (depolanabilir ? ekYapiToplami(ic, b, "depoKapasiteEkiMili") : 0);
        return { miktar: 0, yerelOran: 0, gelenOran: 0, t0, artik: 0, kapasite, surum: 0 };
      });
      b.israf = diziTasi(b.israf, mal, sifir);
      b.uretimToplam = diziTasi(b.uretimToplam, mal, sifir);
      b.uretimOrani = diziTasi(b.uretimOrani, mal, sifir);
      // rezervKalan, rezervIlk'in önce yeniden indekslenmiş kopyasına göre doldurulur (yeni mal tüketilmemiştir).
      b.rezervIlk = diziTasi(b.rezervIlk, mal, rezervVarsayilan);
      b.rezervKalan = diziTasi(b.rezervKalan, mal, (j) => b.rezervIlk[j] as number);
      if (b.kesifSayisi !== undefined) b.kesifSayisi = diziTasi(b.kesifSayisi, mal, sifir);
      for (const e of b.ticaretEmirleri) e.mal = mal.eskiYeni[e.mal] as number;
    }
    if (!birlik.ozdes) b.birlikler = diziTasi(b.birlikler, birlik, sifir);
    if (!tur.ozdes || !yontem.ozdes) {
      for (const t of b.tesisler) {
        t.tur = tur.eskiYeni[t.tur] as number;
        t.yontem = yontem.eskiYeni[t.yontem] as number;
      }
    }
    if (!urun.ozdes && b.tarim !== undefined) b.tarim.ekimPpm = diziTasi(b.tarim.ekimPpm, urun, sifir);
  }

  if (!tek.ozdes) {
    for (const o of d.oyuncular) {
      o.teknolojiler = o.teknolojiler.map((t) => tek.eskiYeni[t] as number).sort((a, b) => a - b);
      if (o.arastirma !== null) o.arastirma.teknoloji = tek.eskiYeni[o.arastirma.teknoloji] as number;
    }
  }

  if (!mal.ozdes) {
    d.pazar.fiyat = diziTasi(d.pazar.fiyat, mal, (j) => taze?.pazar.fiyat[j] ?? 0);
    d.pazar.oyuncuTalebi = diziTasi(d.pazar.oyuncuTalebi, mal, sifir);
    d.pazar.oyuncuArzi = diziTasi(d.pazar.oyuncuArzi, mal, sifir);
    for (const s of d.lojistik.akislar) s.mal = mal.eskiYeni[s.mal] as number;
    d.lojistik.kapsam = d.lojistik.kapsam.map((satir) =>
      diziTasi<KapsamHucresi>(satir, mal, () => ({ karsilanmaPpm: 0, enYakinKaynakMs: -1, neden: "yok" })),
    );
    for (const o of d.kuyruk) {
      const v = o.veri;
      if (v.tur === "oran_delta" || v.tur === "esik" || v.tur === "sondaj_bitti") v.mal = mal.eskiYeni[v.mal] as number;
    }
    for (const s of d.insaatlar) {
      if (s.odenenMal !== undefined) s.odenenMal = s.odenenMal.map(([m, q]): [number, number] => [mal.eskiYeni[m] as number, q]).sort((a, b) => a[0] - b[0]);
    }
  }
  if (!mal.ozdes || !birlik.ozdes) {
    for (const s of d.savaslar) {
      if (s.sonuc === null) continue;
      if (!mal.ozdes) s.sonuc.stokKaybi = diziTasi(s.sonuc.stokKaybi, mal, sifir);
      if (!birlik.ozdes) {
        s.sonuc.saldiranBirlikKaybi = diziTasi(s.sonuc.saldiranBirlikKaybi, birlik, sifir);
        s.sonuc.savunanBirlikKaybi = diziTasi(s.sonuc.savunanBirlikKaybi, birlik, sifir);
      }
    }
  }
  if (!birlik.ozdes) for (const p of d.partiler) p.birlik = birlik.eskiYeni[p.birlik] as number;
  if (!tur.ozdes) {
    for (const s of d.insaatlar) if (s.tur === "tesis" && s.hedef >= 0) s.hedef = tur.eskiYeni[s.hedef] as number;
  }
  return d;
}
