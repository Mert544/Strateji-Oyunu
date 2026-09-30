/**
 * H1 — Bölgeler gerçekten farklı (v0.1: rekabetli dünya, net değer skoru, dengeli referans).
 *
 * İşletimsel tanım (tam metin docs/olcum ve rapor "Parametre özeti"nde):
 *  - Dünya: her devletin bölgeleri bir arka plan botuna verilir (sanayici, tuccar, lojistikci, sanayici; devlet sırası
 *    tohumla döner). ODAK bölge, o devletin arka plan botundan çıkarılıp tek bölgeli ayrı bir oyuncuya ("odak") verilir.
 *    Arka plan davranışı her önayar koşusunda aynı kurulum ve aynı tohumla başlar (ortak rastgele sayılar); yalnızca odak
 *    oyuncunun önayarı değişir.
 *  - Odak oyuncu t=0'da ve 24 saatte bir önayarı uygular; 7 gün koşulur.
 *  - Sıralamaya giren önayarlar: sabit tematik önayarlar. Bölgeye uyarlanan genel amaçlı "dengeli" sıralama DIŞINDA
 *    koşulur ve referans sütununda ayrıca raporlanır.
 *  - BİRİNCİL SKOR = net değer değişimi = Δhazine + Δstok değeri (taban fiyat) + yatırım; yatırım = odak oyuncunun
 *    başarıyla başlattığı tesis inşaatlarının ve kenar kapasite geliştirmelerinin bedeli (mal maliyeti taban fiyatla +
 *    para). Ara mallar (tahıl -> gıda) çift sayılmaz: yalnızca eldeki değer (para + stok) sayılır. Yatırım varlık olarak
 *    maliyet bedeliyle eklenir (amortisman yok): inşa etmek kendi başına skoru ne artırır ne azaltır, getirisi hazine ve
 *    stok üzerinden ölçülür; aksi halde 7 günlük ufukta sermaye malı yatırımı haksız cezalanırdı.
 *  - İKİNCİL SKORLAR (raporda karşılaştırma): eski skor (brüt üretim değeri + Δhazine) ve yatırımsız net skor.
 *  - Ölçüm: her sabit önayarın bölge başına ilk üçte (ortalama sıra <= 3; eşit skorlar sırayı paylaşır) olduğu bölge
 *    oranı; en yükseği > %70 -> kaldı. Ayrıca: en iyi önayarın dağılımı (eşitlikler paylaşılır) ve Shannon entropisi (bit)
 *    ve bölge türüne göre en iyi önayar tablosu.
 */
import { GUN } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { ONAYARLAR, botOlustur, kos } from "@bolge/botlar";
import type { ArketipAdi, KosuOyuncusu, Onayar } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { BolgeTanimi, HaritaDosyasi, VeriPaketi } from "@bolge/veri";
import { hazinePara, kenarGelistirmeBedeli, netDeger, tesisInsaBedeli, uretimDegeri } from "./metrik";
import { birlesikOzet, devletBolgeleri, devletSirasi, say, shannon } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H1_ESIK = 0.7;
/** Sıralamaya girmeyen, yalnızca referans olarak raporlanan önayar. */
export const H1_REFERANS_ONAYAR = "dengeli";
/** Arka plan botları (devlet sırasıyla; devlet sırası tohumla döner). */
export const H1_ARKA_PLAN_BOTLARI: readonly ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "sanayici"];
/** Varsayılan bölge örneği (devlet başına eşit, 4 devlet x 4); `tam` ile hepsi, `bolgeSayisi` ile ayarlanır. Gerekçe rapor/belgede. */
export const H1_VARSAYILAN_BOLGE = 16;
export const H1_HIZLI_BOLGE = 4;
const ODAK = "odak";

export type BolgeTuru = "baskent" | "liman" | "ova_tarim" | "petrol" | "maden_dag" | "maden_kiyi_col" | "diger";
export const BOLGE_TURLERI: readonly BolgeTuru[] = ["baskent", "liman", "ova_tarim", "petrol", "maden_dag", "maden_kiyi_col", "diger"];
export const BOLGE_TURU_ACIKLAMA: Record<BolgeTuru, string> = {
  baskent: "nüfus >= 400 bin (kent)",
  liman: "liman etiketli",
  ova_tarim: "baskın rezerv tahıl",
  petrol: "baskın rezerv petrol (kıyı/çöl)",
  maden_dag: "baskın rezerv cevher/kömür/bakır/silis; dağ veya dar geçit",
  maden_kiyi_col: "baskın rezerv cevher/kömür/bakır/silis; kıyı, ova veya etiketsiz",
  diger: "rezervsiz, limansız",
};

/** Bölge türü: kent > liman > baskın rezerv (tahıl, petrol, maden) > diğer. */
export function bolgeTuru(b: BolgeTanimi): BolgeTuru {
  if (b.nufus >= 400_000) return "baskent";
  if (b.etiketler.includes("liman")) return "liman";
  let baskin = "";
  let en = 0;
  for (const [mal, miktar] of Object.entries(b.rezervler)) {
    if (miktar > en) {
      en = miktar;
      baskin = mal;
    }
  }
  if (baskin === "") return "diger";
  if (baskin === "tahil") return "ova_tarim";
  if (baskin === "petrol") return "petrol";
  return b.etiketler.includes("dag") || b.etiketler.includes("dar_gecit") ? "maden_dag" : "maden_kiyi_col";
}

/**
 * Devlet başına eşit sayıda bölge örneği; sonuç harita sırasındadır. Devlet içinde bölgeler önce türe göre (BOLGE_TURLERI
 * sırası, eşitlikte harita sırası) dizilir ve bu dizilimden eşit aralıklı, devlet sırasına göre kaydırılmış
 * konumlardan seçilir; böylece küçük örnekte de türler karışık temsil edilir. hedef >= toplam ise tüm bölgeler. Kota devletlere eşit bölünür (artan kalan ilk devletlere
 * gider) ve devlet boyutuyla sınırlanır.
 */
export function bolgeOrnekle(harita: HaritaDosyasi, hedef: number): string[] {
  const tum = harita.bolgeler.map((b) => b.id);
  if (hedef >= tum.length) return tum;
  const dev = devletBolgeleri(harita);
  const devIds = harita.devletler.map((d) => d.id).filter((d) => (dev[d] ?? []).length > 0);
  const n = devIds.length;
  const kota = devIds.map((_, i) => Math.floor(hedef / n) + (i < hedef % n ? 1 : 0));
  const secilen = new Set<string>();
  devIds.forEach((d, i) => {
    const tur = (id: string): number => BOLGE_TURLERI.indexOf(bolgeTuru(harita.bolgeler.find((b) => b.id === id) as BolgeTanimi));
    const l = [...(dev[d] as string[])].map((id, k) => ({ id, k, t: tur(id) })).sort((x, y) => x.t - y.t || x.k - y.k).map((x) => x.id);
    const q = Math.min(kota[i] as number, l.length);
    // devlet sırasına göre kaydırılmış eşit aralıklı konumlar: devletler farklı türlerden başlar
    for (let j = 0; j < q; j++) secilen.add(l[Math.floor(((j + (i + 0.5) / n) * l.length) / q)] as string);
  });
  return tum.filter((b) => secilen.has(b));
}

export interface H1Secenek extends HipotezSecenek {
  /** Koşu süresi, gün (vars. 7; kısa: 1). */
  gun?: number;
  /** Önayar adları (vars.: tümü; kısa: ilk 3 sabit + dengeli). */
  onayarlar?: string[];
  veri?: VeriPaketi;
}

interface KosuBilgisi {
  /** Birincil: net değer değişimi + yatırım. */
  skor: number;
  /** Yatırımsız net değer değişimi. */
  netYatirimsiz: number;
  /** Eski skor: brüt üretim değeri + Δhazine. */
  eskiSkor: number;
  yatirim: number;
  komut: number;
  basarisiz: number;
  ozet: string;
}

function tekKosu(veri: VeriPaketi, tohum: number, bolge: string, onayar: Onayar, gun: number): KosuBilgisi {
  const dev = devletBolgeleri(veri.harita);
  const devIds = devletSirasi(Object.keys(dev), tohum).filter((d) => (dev[d] ?? []).length > 0);
  const oyuncular: KosuOyuncusu[] = devIds
    .map((d, i) => ({ id: `g${i}`, bolgeler: (dev[d] as string[]).filter((b) => b !== bolge), i }))
    .filter((o) => o.bolgeler.length > 0)
    .map((o) => ({
      id: o.id,
      bolgeler: o.bolgeler,
      bot: botOlustur(H1_ARKA_PLAN_BOTLARI[o.i % H1_ARKA_PLAN_BOTLARI.length] as ArketipAdi, o.id, tohum),
      katilmaMs: 0,
    }));
  oyuncular.push({ id: ODAK, bolgeler: [bolge], bot: null, katilmaMs: 0 });

  let n0 = 0;
  let h0 = 0;
  let yatirim = 0;
  let komut = 0;
  let basarisiz = 0;
  const r = kos({
    veri,
    tohum,
    oyuncular,
    sureMs: gun * GUN,
    gozlemAraligiMs: GUN,
    // Gözlem, aynı andaki arka plan kararlarından SONRA çağrılır; odak oyuncu önayarını burada uygular (yatırımı
    // başarılı komutlardan tam olarak sayabilmek için komutlar doğrudan uygulanır).
    gozlem: (sim: Simulasyon, t: number) => {
      if (t === 0) {
        n0 = netDeger(sim, ODAK, [bolge]);
        h0 = hazinePara(sim, ODAK);
      }
      if (t >= gun * GUN) return;
      for (const k of onayar.uygula(sim, ODAK)) {
        const s = sim.uygula({ t, oyuncu: ODAK, komut: k });
        if (!s.tamam) {
          basarisiz++;
          continue;
        }
        komut++;
        if (k.tur === "tesis_insa") yatirim += tesisInsaBedeli(sim, k.tesisTuru);
        else if (k.tur === "kenar_gelistir") yatirim += kenarGelistirmeBedeli(sim);
      }
    },
  });
  const sim = r.sim;
  const netYatirimsiz = netDeger(sim, ODAK, [bolge]) - n0;
  return {
    skor: netYatirimsiz + yatirim,
    netYatirimsiz,
    eskiSkor: uretimDegeri(sim, [bolge]) + (hazinePara(sim, ODAK) - h0),
    yatirim,
    komut,
    basarisiz,
    ozet: sim.durumOzeti(),
  };
}

/** Ortalama sıra (1 = en iyi; eşitlikte paylaşılır). */
export function ortalamaSira(skorlar: readonly number[]): number[] {
  return skorlar.map((s, i) => {
    let ustte = 0;
    let esit = 0;
    skorlar.forEach((x, j) => {
      if (j === i) return;
      if (x > s) ustte++;
      else if (x === s) esit++;
    });
    return 1 + ustte + esit / 2;
  });
}

/** Skor yuvarlama (mili-para altı farklar eşit sayılır). */
const yuv = (x: number): number => Math.round(x * 1000) / 1000;

export interface SiralamaOzeti {
  /** Sabit önayar başına ilk-üç bölge oranı (yalnızca sabit önayarlar arasında sıralama). */
  top3: number[];
  /** Sabit önayar başına "en iyi" sayımı (eşitlikler paylaşılır). */
  enIyiSayim: number[];
  entropi: number;
  /** Tüm sabit önayarların skoru eşit olan bölge sayısı (önayarlar ayırt edilemedi). */
  esitBolge: number;
  /** Referans (dengeli): tüm önayarlar (sabit + referans) arasında ilk-üç oranı; yoksa null. */
  referansTop3: number | null;
  /** Referans: sabit önayarların en iyisini (kesin) geçtiği bölge oranı; yoksa null. */
  referansEnIyiOrani: number | null;
}

/** skorlar[bolge][onayar]; sabit = sıralamaya giren sütunlar, referans = dengeli sütunu (-1 = yok). */
export function siralamaOzeti(skorlar: readonly (readonly number[])[], sabit: readonly number[], referans: number): SiralamaOzeti {
  const nb = skorlar.length;
  const top3 = sabit.map(() => 0);
  const enIyi = sabit.map(() => 0);
  let esitBolge = 0;
  let refTop = 0;
  let refEnIyi = 0;
  for (const satir of skorlar) {
    const s = sabit.map((j) => yuv(satir[j] as number));
    const sira = ortalamaSira(s);
    sira.forEach((r, i) => {
      if (r <= 3) top3[i] = (top3[i] as number) + 1;
    });
    const mx = Math.max(...s);
    const eniyiler = s.map((x, i) => (x === mx ? i : -1)).filter((i) => i >= 0);
    for (const i of eniyiler) enIyi[i] = (enIyi[i] as number) + 1 / eniyiler.length;
    if (eniyiler.length === s.length) esitBolge++;
    if (referans >= 0) {
      const tum = [...sabit, referans].map((j) => yuv(satir[j] as number));
      if ((ortalamaSira(tum)[tum.length - 1] as number) <= 3) refTop++;
      if ((tum[tum.length - 1] as number) > mx) refEnIyi++;
    }
  }
  return {
    top3: top3.map((x) => x / nb),
    enIyiSayim: enIyi,
    entropi: shannon(enIyi),
    esitBolge,
    referansTop3: referans >= 0 ? refTop / nb : null,
    referansEnIyiOrani: referans >= 0 ? refEnIyi / nb : null,
  };
}

interface TurOzeti {
  n: number;
  /** Sabit önayar sırasıyla "en iyi" payı (sayım; eşitlikler paylaşılır). */
  pay: number[];
}

function turBazli(skorlar: readonly (readonly number[])[], turler: readonly BolgeTuru[], sabit: readonly number[]): Record<string, TurOzeti> {
  const s: Record<string, TurOzeti> = {};
  skorlar.forEach((satir, bi) => {
    const tur = turler[bi] as BolgeTuru;
    const o = (s[tur] ??= { n: 0, pay: sabit.map(() => 0) });
    o.n++;
    const v = sabit.map((j) => yuv(satir[j] as number));
    const mx = Math.max(...v);
    const e = v.map((x, i) => (x === mx ? i : -1)).filter((i) => i >= 0);
    for (const i of e) o.pay[i] = (o.pay[i] as number) + 1 / e.length;
  });
  return s;
}

export function h1Kos(secenek: H1Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const tumBolgeler = veri.harita.bolgeler.map((b) => b.id);
  const devletSayisi = new Set(veri.harita.bolgeler.map((b) => b.devlet)).size;
  const hedefSayi = secenek.tam
    ? tumBolgeler.length
    : (secenek.bolgeSayisi ?? (secenek.kisa ? devletSayisi : secenek.hizli ? H1_HIZLI_BOLGE : H1_VARSAYILAN_BOLGE));
  const bolgeler = bolgeOrnekle(veri.harita, hedefSayi);
  const bolgeTurleri = bolgeler.map((id) => bolgeTuru(veri.harita.bolgeler.find((b) => b.id === id) as BolgeTanimi));
  const gun = secenek.gun ?? (secenek.kisa ? 1 : 7);
  const sabitAdlar = ONAYARLAR.filter((o) => o.ad !== H1_REFERANS_ONAYAR).map((o) => o.ad);
  const secilenSabit = secenek.onayarlar
    ? sabitAdlar.filter((a) => secenek.onayarlar?.includes(a))
    : secenek.kisa
      ? sabitAdlar.slice(0, 3)
      : sabitAdlar;
  const referansVar = secenek.onayarlar ? secenek.onayarlar.includes(H1_REFERANS_ONAYAR) : true;
  // Sütun sırası: sabit önayarlar, sonra (varsa) referans.
  const onayarlar = [...secilenSabit, ...(referansVar ? [H1_REFERANS_ONAYAR] : [])].map((a) => ONAYARLAR.find((o) => o.ad === a) as Onayar);
  const sabit = onayarlar.map((_, i) => i).filter((i) => (onayarlar[i] as Onayar).ad !== H1_REFERANS_ONAYAR);
  const referans = onayarlar.findIndex((o) => o.ad === H1_REFERANS_ONAYAR);
  const sabitAd = sabit.map((i) => (onayarlar[i] as Onayar).ad);
  const ilerleme = secenek.ilerleme ?? (() => {});

  const tohumBasina: TohumSonucu[] = [];
  let ilkBolgeTablosu: Array<Record<string, unknown>> = [];
  const tohumTopRate: number[][] = [];
  const tohumEskiTop: number[][] = [];
  const tohumNetYTop: number[][] = [];
  const tohumEnIyi: number[][] = [];
  const tohumRef: number[] = [];
  const tohumRefEnIyi: number[] = [];
  const turToplam: Record<string, TurOzeti> = {};

  for (const tohum of secenek.tohumlar) {
    const skor: number[][] = []; // birincil [bolge][onayar]
    const eski: number[][] = [];
    const netY: number[][] = [];
    const ozetler: string[] = [];
    let komutToplam = 0;
    let basarisizToplam = 0;
    let yatirimToplam = 0;
    bolgeler.forEach((bolge, bi) => {
      const s: number[] = [];
      const e: number[] = [];
      const ny: number[] = [];
      for (const o of onayarlar) {
        const k = tekKosu(veri, tohum, bolge, o, gun);
        s.push(k.skor);
        e.push(k.eskiSkor);
        ny.push(k.netYatirimsiz);
        ozetler.push(k.ozet);
        komutToplam += k.komut;
        basarisizToplam += k.basarisiz;
        yatirimToplam += k.yatirim;
      }
      skor.push(s);
      eski.push(e);
      netY.push(ny);
      ilerleme(`H1 tohum ${tohum}: ${bi + 1}/${bolgeler.length} bolge (${bolge})`);
    });

    const ana = siralamaOzeti(skor, sabit, referans);
    const eskiOz = siralamaOzeti(eski, sabit, referans);
    const netYOz = siralamaOzeti(netY, sabit, referans);
    const tur = turBazli(skor, bolgeTurleri, sabit);
    for (const [t, o] of Object.entries(tur)) {
      const a = (turToplam[t] ??= { n: 0, pay: sabit.map(() => 0) });
      a.n += o.n;
      o.pay.forEach((x, i) => (a.pay[i] = (a.pay[i] as number) + x));
    }
    const enYuksek = Math.max(...ana.top3);
    const verdict: Verdict = enYuksek > H1_ESIK ? "kaldi" : "gecti";
    const enYuksekOnayar = sabitAd[ana.top3.indexOf(enYuksek)] as string;
    const adla = (d: readonly number[]): Record<string, number> => Object.fromEntries(sabitAd.map((a, i) => [a, say(d[i] as number)]));
    tohumEnIyi.push(ana.enIyiSayim.map((x) => x / bolgeler.length));
    tohumTopRate.push(ana.top3);
    tohumEskiTop.push(eskiOz.top3);
    tohumNetYTop.push(netYOz.top3);
    tohumRef.push(ana.referansTop3 ?? 0);
    tohumRefEnIyi.push(ana.referansEnIyiOrani ?? 0);
    tohumBasina.push({
      tohum,
      olcum: say(enYuksek),
      verdict,
      durumOzeti: birlesikOzet(ozetler),
      ozet: {
        enYuksekOnayar,
        top3Orani: adla(ana.top3),
        top3OraniEskiSkor: adla(eskiOz.top3),
        top3OraniYatirimsizNet: adla(netYOz.top3),
        enYuksekEskiSkor: say(Math.max(...eskiOz.top3)),
        enYuksekYatirimsizNet: say(Math.max(...netYOz.top3)),
        referansTop3: ana.referansTop3 === null ? null : say(ana.referansTop3),
        referansEnIyiOrani: ana.referansEnIyiOrani === null ? null : say(ana.referansEnIyiOrani),
        enIyiOnayarPayi: adla(ana.enIyiSayim.map((x) => x / bolgeler.length)),
        enIyiOnayarSayimi: adla(ana.enIyiSayim),
        entropiBit: say(ana.entropi),
        entropiNormalize: say(sabit.length > 1 ? ana.entropi / Math.log2(sabit.length) : 0),
        esitBolge: ana.esitBolge,
        komut: komutToplam,
        basarisizKomut: basarisizToplam,
        ortalamaYatirim: say(yatirimToplam / (bolgeler.length * onayarlar.length), 1),
      },
    });
    if (ilkBolgeTablosu.length === 0) {
      ilkBolgeTablosu = bolgeler.map((b, bi) => {
        const satir = skor[bi] as number[];
        const mx = Math.max(...sabit.map((j) => yuv(satir[j] as number)));
        return {
          bolge: b,
          tur: bolgeTurleri[bi],
          skorlar: Object.fromEntries(onayarlar.map((o, oi) => [o.ad, say(satir[oi] as number, 1)])),
          enIyi: sabit.filter((j) => yuv(satir[j] as number) === mx).map((j) => (onayarlar[j] as Onayar).ad).join("="),
        };
      });
    }
  }

  const n = tohumBasina.length;
  const ort = (m: readonly number[][], i: number): number => m.reduce((t, r) => t + (r[i] as number), 0) / n;
  const top3Ort = sabit.map((_, i) => ort(tohumTopRate, i));
  const eskiTop3Ort = sabit.map((_, i) => ort(tohumEskiTop, i));
  const netYTop3Ort = sabit.map((_, i) => ort(tohumNetYTop, i));
  const enYuksekOrt = Math.max(...top3Ort);
  const verdict = genelVerdict(tohumBasina.map((t) => t.verdict));
  const turTablosu = BOLGE_TURLERI.filter((t) => turToplam[t]).map((t) => {
    const o = turToplam[t] as TurOzeti;
    const pay = o.pay.map((x) => x / o.n); // tohumlar üzerinden toplam / (n × tohum sayısı)
    const enYuksekPay = Math.max(...pay);
    return {
      tur: t,
      aciklama: BOLGE_TURU_ACIKLAMA[t],
      bolgeSayisi: o.n / n,
      enIyi: sabitAd.filter((_, i) => (pay[i] as number) === enYuksekPay).join("="),
      enIyiPay: say(enYuksekPay),
      dagilim: Object.fromEntries(sabitAd.map((a, i) => [a, say(pay[i] as number)])),
    };
  });
  const dagilimTohumOrt = sabitAd.map((_, i) => ort(tohumEnIyi, i));
  const adla = (d: readonly number[]): Record<string, number> => Object.fromEntries(sabitAd.map((a, i) => [a, say(d[i] as number)]));
  return {
    kimlik: "H1",
    hipotez: "Bölgeler gerçekten farklı: aynı politika bölgelerin %70'inden fazlasında ilk üçte değil",
    olcum: {
      ad: "En yüksek sabit önayarın ilk-üç bölge oranı (rekabetli dünya, net değer skoru)",
      deger: say(enYuksekOrt),
      birim: "oran",
      aciklama: `Rekabetli dünyada (arka plan: ${H1_ARKA_PLAN_BOTLARI.join(", ")}) odak bölge tek bölgeli oyuncu; her sabit tematik önayarın (dengeli hariç; t=0 ve 24 saatte bir uygulanan, ${gun} gün) bölge başına net değer değişimi (Δhazine + Δstok + yatırım) sıralamasında ilk üçte olduğu bölge oranı; en yükseği.`,
    },
    esik: { aciklama: "En yüksek oran > %70 ise vazgeç (kaldı)", deger: H1_ESIK },
    verdict,
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / n,
    tohumBasina,
    ayrinti: {
      onayarlar: sabit.map((i) => ({ ad: (onayarlar[i] as Onayar).ad, aciklama: (onayarlar[i] as Onayar).aciklama })),
      referans: referans >= 0 ? { ad: H1_REFERANS_ONAYAR, aciklama: (onayarlar[referans] as Onayar).aciklama } : null,
      tohumOrtalamaTop3Orani: adla(top3Ort),
      tohumOrtalamaTop3OraniEskiSkor: adla(eskiTop3Ort),
      tohumOrtalamaTop3OraniYatirimsizNet: adla(netYTop3Ort),
      tohumOrtalamaEnIyiDagilimi: adla(dagilimTohumOrt),
      referansTop3Ortalama: referans >= 0 ? say(tohumRef.reduce((t, x) => t + x, 0) / n) : null,
      referansEnIyiOraniOrtalama: referans >= 0 ? say(tohumRefEnIyi.reduce((t, x) => t + x, 0) / n) : null,
      turTablosu,
      bolgeSayisi: bolgeler.length,
      bolgeTurleri: Object.fromEntries(bolgeler.map((b, i) => [b, bolgeTurleri[i]])),
      bolgeTablosuIlkTohum: ilkBolgeTablosu,
    },
    parametreler: {
      bolgeSayisi: bolgeler.length,
      tumBolgeSayisi: tumBolgeler.length,
      ornekleme: secenek.tam ? "tam (tum bolgeler)" : "devlet basina esit; devlet icinde ture gore siralanip esit aralikli, devlete gore kaydirilmis konumlar",
      gun,
      onayarSayisi: sabit.length,
      onayarlar: sabitAd,
      referansOnayar: referans >= 0 ? H1_REFERANS_ONAYAR : "yok",
      uygulamaAraligiSaat: 24,
      dunya: `rekabetli: her devlet bir arka plan botu (${H1_ARKA_PLAN_BOTLARI.join(", ")}; devlet sirasi tohumla doner), odak bolge devletinden cikarilip tek bolgeli 'odak' oyuncuya verilir`,
      skor: "birincil = net deger degisimi = Δhazine + Δstok (taban fiyat) + yatirim (baslatilan tesis insaati ve kenar gelistirme bedeli, maliyet bedeliyle, amortismansiz); ikincil = eski skor (uretimDegeri + Δhazine) ve yatirimsiz net",
      sira: "sabit onayarlar arasinda; esit skorlar ortalama sira; ilk uc = sira <= 3",
      hizli: secenek.hizli === true,
      tam: secenek.tam === true,
    },
    sureMs: Date.now() - basla,
  };
}
