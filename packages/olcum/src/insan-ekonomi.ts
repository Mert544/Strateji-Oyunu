/**
 * Alfa-0 canlı ekonomi izleme (A2 `docs/arastirma/alfa0-ekonomi-izleme.md`, §0 ve §8.2): günlük oynatmanın (`insan-cikarma.ts`) ek çıktısı.
 * Günde bir dünya düzeyi örnek + saatlik oyuncu gözlemi; E1–E10 metriklerini A2'nin ilk tahmin eşikleriyle değerlendirir.
 *
 * Kurallar:
 *  - YALNIZ OKUR: dünyayı değiştirmez, çekirdeğe dokunmaz. `ekonomi` seçeneği kapalıyken çıktı bayt bayt aynıdır.
 *  - Çıktıda KİŞİSEL VERİ ya da oyuncu kimliği YOKTUR: oyuncu düzeyi ölçüler (r, ilk dükkân, M, aşınma) yalnız GRUP toplamı olarak yazılır. İki grup (A2 O2-3, bot ve insan ayrı):
 *    `insan` (dışarıdan verilen test oyuncuları) ve `diger` (dünyadaki bütün ötekiler: botlar, yerleşikler).
 *  - Eşikler A2'nin İLK TAHMİNİDİR (doğrulanmadı; K-1 ve ilk canlı hafta sonrası kalibre edilir) ve `EKONOMI_ESIKLERI` tablosundadır (parametre, kodda gömülü değil).
 *    Örneklem koşulu: grupta/dünyada oyuncu < 5 ya da olay < 3 ise durum "olculmedi" (sarı/kırmızı verilmez); değer yine yazılır.
 *  - Çekirdekte henüz olmayan alanlar (`musluk.yerelNpc`, `lavabo.sebeke`, `DukkanDurumu.kurulus`) varsa okunur, yoksa 0/null sayılır (P5 sonrası dolar).
 *  - Okunamayan metrikler (E5 dükkân geri ödemesi: satış miktarı sayacı yok, A2 K2-8; E7(a) kasa kapasite karşılama: sipariş hacmi yok) "olculmedi" ve nedeniyle yazılır.
 */
import { GUN, MILI, PPM, SAAT, anlikHazine, kasaBakiyesi, sanayiTablosu } from "@bolge/cekirdek";
import type { Dunya, Ms, OyuncuId, ParaSayaci, Simulasyon, TesisDurumu } from "@bolge/cekirdek";

export type EkonomiDurumu = "yesil" | "sari" | "kirmizi" | "olculmedi";
export type EkonomiGrubu = "insan" | "diger";
export const EKONOMI_GRUPLARI: readonly EkonomiGrubu[] = ["insan", "diger"];

/** A2 §0 tablosu: ilk tahmin eşikleri (parametre). Aralıklar yeşil bandı verir; sarı bandın dışı kırmızıdır. */
export const EKONOMI_ESIKLERI = {
  /** E1 R = lavabo / (ihracat − ithalat), 7 gün: yeşil [0,30; 0,60], sarı [0,22; 0,30) ve (0,60; 0,70], üstü/altı kırmızı. */
  R: { yesilAlt: 0.3, yesilUst: 0.6, sariAlt: 0.22, sariUst: 0.7 },
  /** E2 r = yatırım / net kâr, grup medyanı: yeşil [%10; %40], sarı [%5; %10) ve (%40; %50]. */
  r: { yesilAlt: 0.1, yesilUst: 0.4, sariAlt: 0.05, sariUst: 0.5 },
  /** E3 ZP8: yeşil ≤ %45, sarı ≤ %50, kırmızı > %50 İKİ ardışık 7 günlük pencerede. */
  zp8: { yesilUst: 0.45, sariUst: 0.5 },
  /** E4 ilk dükkân süresi (saat): yeşil ≤ 36, sarı ≤ 48; kırmızı > 48 ya da 48 sa sonrası kuran payı < %30. */
  ilkDukkan: { yesilUstSaat: 36, sariUstSaat: 48, kuranPayiAlt: 0.3, payBekleSaat: 48 },
  /** E6 M: yeşil ≥ %50, sarı ≥ %30. */
  M: { yesilAlt: 0.5, sariAlt: 0.3, degirmenSaat: 24, pencereGun: 7 },
  /** E7(b) kamu kasası birikimi = Σ bakiye / 28 günlük Σ musluk: yeşil ≤ %6, sarı ≤ %10. */
  kasaBirikim: { yesilUst: 0.06, sariUst: 0.1, pencereGun: 28 },
  /** E8 fiyat sınırı: NPC fiyat/taban ≤ alt ya da ≥ üst; yeşil 0 mal, sarı 1–2, kırmızı ≥ 3 ya da bir mal ≥ 48 sa kesintisiz. */
  fiyatSiniri: { alt: 0.26, ust: 1.74, sariUstMal: 2, kesintisizSaat: 48 },
  /** E9 aşınma (k = 3 zincir çıktı kaybı; gün 14 ve gün 45): yeşil ≤ %12 / %32, sarı ≤ %18 / %40; ters kırmızı: gün 45'te aşınma < %5. */
  asinma: { gun1: 14, gun2: 45, zincirDerinligi: 3, yesil: [0.12, 0.32], sari: [0.18, 0.4], hicAsinmaAlt: 0.05 },
  /** E10 oyuncu başı ödül toplamı (₺): yeşil ≤ 6.790, sarı ≤ 8.000. */
  odul: { yesilUstTl: 6790, sariUstTl: 8000 },
  /** Örneklem koşulu. */
  enAzOyuncu: 5,
  enAzOlay: 3,
} as const;

/** Günlük dünya düzeyi örnek (kişisel veri yok). Para sayaçları kümülatif (mili-₺, tamsayı). */
export interface EkonomiGunlukOrnegi {
  tMs: Ms;
  trt: string | null;
  oyuncuSayisi: { insan: number; diger: number };
  /** `mulk.para` yoksa null. Kalem adları dünyadaki sayaçlardan (P4/P5 kalemleri `yerelNpc`, `sebeke` varsa görünür). */
  para: { musluk: Record<string, number>; lavabo: Record<string, number>; kasaGiris: number; kasaBakiye: number } | null;
  /** NPC fiyatı tabana göre sınırda olan mal kimlikleri (≤ alt / ≥ üst). */
  sinirdaMal: { alt: string[]; ust: string[] };
  /** Yöntem kimliği -> tesis sayısı (tüm oyuncular; sıralı anahtarlar). */
  yontemDagilimi: Record<string, number>;
}

export interface EkonomiMetrik {
  durum: EkonomiDurumu;
  /** Ölçülemeyen ya da koşulsuz notlar. */
  not?: string;
  [alan: string]: unknown;
}

export interface EkonomiCiktisi {
  surum: 1;
  /** Örnek aralığı (ms): günde bir. */
  aralikMs: number;
  /** Eşik tablosu (çıktıyla birlikte yazılır: yorumlayan aynı tabloyu görsün). */
  esikler: typeof EKONOMI_ESIKLERI;
  gunluk: EkonomiGunlukOrnegi[];
  /** E1–E10 (anahtar "E1"…"E10"). */
  metrikler: Record<string, EkonomiMetrik>;
  notlar: string[];
}

interface OyuncuIzi {
  katilma: Ms | null;
  /** Katılımdan `M.pencereGun` gün içinde en az bir gıda fabrikası görüldü mü. */
  fabrikaKurdu: boolean;
  /** Pencerede `degirmen` yönteminde geçen süre (ms; saatlik gözlem toplamı). */
  degirmenMs: number;
  dukkanKurulus: Ms | null;
  /** Günlük (t, hazine). */
  hazine: Array<[Ms, number]>;
  /** Günlük (yaş gün, tesis aşınma medyanı ppm). */
  asinma: Array<[number, number]>;
}

/** Çekirdekte henüz tanımlı olmayabilir: ek yapı üstündeki dükkân durumu (A3 §12.4). Yapısal ve gevşek okunur. */
interface GevsekEkYapi {
  dukkan?: { kurulus?: number };
}

/** Oyuncunun düğümlerindeki en erken `DukkanDurumu.kurulus` (sim ms) ya da null (alan çekirdekte yoksa/dükkân yoksa). Gevşek okunur: P5 öncesi çekirdekte tanımsızdır. */
export function dukkanKurulusuOku(d: Dunya, oyuncu: OyuncuId): Ms | null {
  let en: Ms | null = null;
  if (d.mulk === undefined) return null;
  for (const e of d.mulk.isletmeler) {
    if (e.oyuncu !== oyuncu) continue;
    for (const y of (d.bolgeler[e.bolgeIndeksi]?.ekYapilar ?? []) as GevsekEkYapi[]) {
      const k = y.dukkan?.kurulus;
      if (typeof k === "number" && (en === null || k < en)) en = k;
    }
  }
  return en;
}

const medyan = (l: readonly number[]): number | null => {
  if (l.length === 0) return null;
  const s = [...l].sort((a, b) => a - b);
  const o = s.length >> 1;
  return s.length % 2 === 1 ? (s[o] as number) : Math.floor(((s[o - 1] as number) + (s[o] as number)) / 2);
};

const sayacDegeri = (s: ParaSayaci): number => Math.floor(s.n + s.a / SAAT);

/** Dünyadaki bir kalem kayıt demetini (bilinmeyen kalem adları dahil) tamsayıya çevirir; sıralı anahtar. */
function sayaclar(k: Readonly<Record<string, ParaSayaci | undefined>>): Record<string, number> {
  const o: Record<string, number> = {};
  for (const ad of Object.keys(k).sort()) {
    const s = k[ad];
    if (s !== undefined) o[ad] = sayacDegeri(s);
  }
  return o;
}

const topla = (o: Readonly<Record<string, number>>, adlar?: readonly string[]): number => {
  let t = 0;
  for (const [a, v] of Object.entries(o)) if (adlar === undefined || adlar.includes(a)) t += v;
  return t;
};

/** Durumu bantlarla belirler: yeşil bandın içi yeşil, sarı bandın içi sarı, dışı kırmızı. */
function bantDurumu(v: number, yesilAlt: number, yesilUst: number, sariAlt: number, sariUst: number): EkonomiDurumu {
  if (v >= yesilAlt && v <= yesilUst) return "yesil";
  if (v >= sariAlt && v <= sariUst) return "sari";
  return "kirmizi";
}

/**
 * Günlük oynatmanın ekonomi toplayıcısı: `ilerle` adımlarında saatlik (`adim`) ve gün sınırlarında günlük (`ornekle`) çağrılır; oyuncu düzeyi iz YALNIZ bellekte tutulur
 * ve çıktıda grup toplamı olarak görünür. Dünyayı değiştirmez.
 */
export class EkonomiToplayici {
  private readonly iz = new Map<OyuncuId, OyuncuIzi>();
  private readonly gunluk: EkonomiGunlukOrnegi[] = [];
  /** Mal başına ardışık "sınırda" günlük örnek sayısı (en uzun). */
  private readonly sinirSerisi = new Map<string, { seri: number; enUzun: number }>();
  private sonT: Ms;

  constructor(
    private readonly sim: () => Simulasyon,
    private readonly insan: ReadonlySet<OyuncuId>,
    private readonly trt: (t: Ms) => string | null,
    /** Oyuncu başına sermaye komutları (t, tutar): r hesabı için (cikar() zaten tutar). */
    private readonly sermaye: ReadonlyMap<OyuncuId, ReadonlyArray<{ t: Ms; tutar: number }>>,
  ) {
    this.sonT = sim().dunya.zaman;
  }

  private grup(id: OyuncuId): EkonomiGrubu {
    return this.insan.has(id) ? "insan" : "diger";
  }

  private izi(id: OyuncuId): OyuncuIzi {
    let i = this.iz.get(id);
    if (i === undefined) {
      i = { katilma: null, fabrikaKurdu: false, degirmenMs: 0, dukkanKurulus: null, hazine: [], asinma: [] };
      this.iz.set(id, i);
    }
    return i;
  }

  /** Oyuncunun düğümlerindeki tesisler (mülk kipi işletme düğümleri; bölge kipinde sahip düğümleri). */
  private tesisler(d: Dunya, id: OyuncuId): TesisDurumu[] {
    const l: TesisDurumu[] = [];
    if (d.mulk !== undefined) {
      for (const e of d.mulk.isletmeler) if (e.oyuncu === id) l.push(...((d.bolgeler[e.bolgeIndeksi]?.tesisler ?? []) as TesisDurumu[]));
    } else {
      for (const b of d.bolgeler) if (b.sahip === id) l.push(...b.tesisler);
    }
    return l;
  }

  /** Saatlik gözlem (adım sonu `t`): M için fabrika ve değirmen süresi, dükkân kuruluşu. */
  adim(t: Ms): void {
    const sim = this.sim();
    const d = sim.dunya;
    const dt = Math.max(0, t - this.sonT);
    this.sonT = t;
    const fabrika = sim.ic.tesisTuruIndeks["gida_fabrikasi"];
    const degirmen = sim.ic.yontemIndeks["degirmen"];
    for (const o of d.oyuncular) {
      const i = this.izi(o.id);
      i.katilma ??= o.katilmaZamani;
      const pencerede = i.katilma !== null && t <= i.katilma + EKONOMI_ESIKLERI.M.pencereGun * GUN;
      if (pencerede && fabrika !== undefined) {
        for (const ts of this.tesisler(d, o.id)) {
          if (ts.tur !== fabrika) continue;
          i.fabrikaKurdu = true;
          if (degirmen !== undefined && ts.yontem === degirmen && ts.aktif) i.degirmenMs += dt;
        }
      }
      if (i.dukkanKurulus === null) i.dukkanKurulus = dukkanKurulusuOku(d, o.id);
    }
  }

  /** Günlük örnek (gün sınırı, `t` = k × GUN): dünya düzeyi ölçüler ve oyuncu izleri. */
  ornekle(t: Ms): void {
    const sim = this.sim();
    const d = sim.dunya;
    let insan = 0;
    let diger = 0;
    for (const o of d.oyuncular) {
      if (this.insan.has(o.id)) insan++;
      else diger++;
      const i = this.izi(o.id);
      i.hazine.push([t, Math.floor(anlikHazine(d, o.id))]);
      const km = i.katilma ?? o.katilmaZamani;
      const ts = this.tesisler(d, o.id);
      const ppm = ts.map((x) => x.asinmaPpm ?? 0);
      const md = medyan(ppm);
      if (md !== null) i.asinma.push([Math.floor((t - km) / GUN), md]);
    }
    const p = d.mulk?.para;
    const para = p === undefined ? null : { musluk: sayaclar(p.musluk as unknown as Record<string, ParaSayaci>), lavabo: sayaclar(p.lavabo as unknown as Record<string, ParaSayaci>), kasaGiris: 0, kasaBakiye: 0 };
    if (p !== undefined && para !== null) {
      for (const k of p.kasalar) {
        para.kasaBakiye += kasaBakiyesi(k);
        para.kasaGiris += topla(sayaclar(k.giris as unknown as Record<string, ParaSayaci>));
      }
    }
    const alt: string[] = [];
    const ust: string[] = [];
    sim.ic.mallar.forEach((m, mi) => {
      const f = d.pazar.fiyat[mi];
      if (f === undefined || m.tabanFiyat <= 0) return;
      const oran = f / m.tabanFiyat;
      const sinirda = oran <= EKONOMI_ESIKLERI.fiyatSiniri.alt || oran >= EKONOMI_ESIKLERI.fiyatSiniri.ust;
      const s = this.sinirSerisi.get(m.id) ?? { seri: 0, enUzun: 0 };
      s.seri = sinirda ? s.seri + 1 : 0;
      s.enUzun = Math.max(s.enUzun, s.seri);
      this.sinirSerisi.set(m.id, s);
      if (oran <= EKONOMI_ESIKLERI.fiyatSiniri.alt) alt.push(m.id);
      else if (oran >= EKONOMI_ESIKLERI.fiyatSiniri.ust) ust.push(m.id);
    });
    const yontemDagilimi: Record<string, number> = {};
    for (const o of d.oyuncular) for (const ts of this.tesisler(d, o.id)) {
      const ad = sim.ic.yontemler[ts.yontem]?.id ?? String(ts.yontem);
      yontemDagilimi[ad] = (yontemDagilimi[ad] ?? 0) + 1;
    }
    const sirali: Record<string, number> = {};
    for (const k of Object.keys(yontemDagilimi).sort()) sirali[k] = yontemDagilimi[k] as number;
    this.gunluk.push({ tMs: t, trt: this.trt(t), oyuncuSayisi: { insan, diger }, para, sinirdaMal: { alt, ust }, yontemDagilimi: sirali });
  }

  /** Örnekleri ve oyuncu izlerini E1–E10 metriklerine çevirir. */
  sonuc(): EkonomiCiktisi {
    const notlar: string[] = [];
    const E = EKONOMI_ESIKLERI;
    const g = this.gunluk;
    const son = g.at(-1);
    const sim = this.sim();
    const sn = sanayiTablosu(sim.ic);
    const toplamOyuncu = son === undefined ? 0 : son.oyuncuSayisi.insan + son.oyuncuSayisi.diger;
    /** `gun` gün önceki örnek (tam gün sınırı) varsa. */
    const onceki = (gun: number, referans: EkonomiGunlukOrnegi | undefined = son): EkonomiGunlukOrnegi | undefined => (referans === undefined ? undefined : g.find((x) => x.tMs === referans.tMs - gun * GUN));
    const fark = (a: EkonomiGunlukOrnegi, b: EkonomiGunlukOrnegi, k: "musluk" | "lavabo", adlar?: readonly string[]): number | null => (a.para === null || b.para === null ? null : topla(a.para[k], adlar) - topla(b.para[k], adlar));
    const metrikler: Record<string, EkonomiMetrik> = {};

    // ---- E1 R ve E3 ZP8 (7 günlük pencere) ------------------------------------------------------------------------------------
    const pencere = (referans: EkonomiGunlukOrnegi | undefined): { R: number | null; Rkasa: number | null; zp8: number | null; ihracat: number; ithalat: number; lavabo: number; yerel: number } | null => {
      const bas = onceki(7, referans);
      if (referans === undefined || bas === undefined || referans.para === null || bas.para === null) return null;
      const dIhr = fark(referans, bas, "musluk", ["ihracatNpc"]) as number;
      const dYerel = fark(referans, bas, "musluk", ["yerelNpc"]) as number;
      const dIth = fark(referans, bas, "lavabo", ["ithalatNpc"]) as number;
      const dLav = fark(referans, bas, "lavabo", ["isletme", "sebeke", "araziVergisi", "harcama", "arsa"]) as number;
      const dKasa = referans.para.kasaGiris - bas.para.kasaGiris;
      const net = dIhr + dYerel - dIth;
      return {
        R: net > 0 ? dLav / net : null,
        Rkasa: net > 0 ? (dLav + dKasa) / net : null,
        zp8: dYerel + dIhr > 0 ? dYerel / (dYerel + dIhr) : null,
        ihracat: dIhr + dYerel,
        ithalat: dIth,
        lavabo: dLav,
        yerel: dYerel,
      };
    };
    const w1 = pencere(son);
    const w0 = pencere(son === undefined ? undefined : onceki(7));
    const kucuk = toplamOyuncu < E.enAzOyuncu;
    if (w1 === null) {
      metrikler["E1"] = { durum: "olculmedi", not: "7 gunluk pencere icin ornek ya da para defteri yok" };
      metrikler["E3"] = { durum: "olculmedi", not: "7 gunluk pencere icin ornek ya da para defteri yok" };
    } else {
      metrikler["E1"] = {
        durum: w1.R === null ? "olculmedi" : kucuk ? "olculmedi" : bantDurumu(w1.R, E.R.yesilAlt, E.R.yesilUst, E.R.sariAlt, E.R.sariUst),
        R: w1.R,
        Rkasa: w1.Rkasa,
        pencereGun: 7,
        ihracatMili: w1.ihracat,
        ithalatMili: w1.ithalat,
        lavaboMili: w1.lavabo,
        ...(w1.R === null ? { not: "ihracat - ithalat <= 0: R tanimsiz" } : kucuk ? { not: `dunyada < ${E.enAzOyuncu} oyuncu: durum verilmez` } : {}),
      };
      let durum3: EkonomiDurumu = "olculmedi";
      if (w1.zp8 !== null && !kucuk) {
        if (w1.zp8 <= E.zp8.yesilUst) durum3 = "yesil";
        else if (w1.zp8 <= E.zp8.sariUst) durum3 = "sari";
        else durum3 = w0 !== null && w0.zp8 !== null && w0.zp8 > E.zp8.sariUst ? "kirmizi" : "sari"; // kırmızı: iki ardışık pencere > %50
      }
      metrikler["E3"] = { durum: durum3, zp8: w1.zp8, oncekiPencereZp8: w0?.zp8 ?? null, yerelNpcMili: w1.yerel, ...(w1.yerel === 0 ? { not: "yerelNpc sayaci yok ya da 0 (G7a oncesi): ZP8 = 0" } : {}) };
    }

    // ---- E2 r (grup medyanı; 7 gün) -----------------------------------------------------------------------------------------------
    const rGrup: Record<EkonomiGrubu, number[]> = { insan: [], diger: [] };
    for (const [id, i] of this.iz) {
      if (son === undefined) break;
      const h1 = i.hazine.find((x) => x[0] === son.tMs);
      const h0 = i.hazine.find((x) => x[0] === son.tMs - 7 * GUN);
      if (h1 === undefined || h0 === undefined) continue;
      let yat = 0;
      for (const x of this.sermaye.get(id) ?? []) if (x.t > h0[0] && x.t <= h1[0]) yat += x.tutar;
      const netKar = h1[1] - h0[1] + yat;
      if (netKar > 0 && yat >= 0) rGrup[this.grup(id)].push(yat / netKar);
    }
    const e2: EkonomiMetrik = { durum: "olculmedi", not: "oyuncu basina r: hazine farki + sermaye komutu tutari (7 gun; net kar > 0 olanlar)", gruplar: {} };
    for (const gr of EKONOMI_GRUPLARI) {
      const m = medyan(rGrup[gr].map((x) => Math.round(x * 1e6)));
      const r = m === null ? null : m / 1e6;
      const durum: EkonomiDurumu = r === null || rGrup[gr].length < E.enAzOyuncu ? "olculmedi" : bantDurumu(r, E.r.yesilAlt, E.r.yesilUst, E.r.sariAlt, E.r.sariUst);
      (e2.gruplar as Record<string, unknown>)[gr] = { durum, medyan: r, oyuncu: rGrup[gr].length };
    }
    e2.durum = en(EKONOMI_GRUPLARI.map((gr) => ((e2.gruplar as Record<string, { durum: EkonomiDurumu }>)[gr] as { durum: EkonomiDurumu }).durum));
    metrikler["E2"] = e2;

    // ---- E4 ilk dükkân (grup) -----------------------------------------------------------------------------------------------------
    const e4: EkonomiMetrik = { durum: "olculmedi", gruplar: {}, not: "dukkan kurulusu DukkanDurumu.kurulus alanindan okunur (P5 sonrasi); alan yoksa olculmedi" };
    const bitisT = son?.tMs ?? 0;
    for (const gr of EKONOMI_GRUPLARI) {
      const suredler: number[] = [];
      let bekleyenKurmayan = 0;
      let uygun = 0;
      for (const [id, i] of this.iz) {
        if (this.grup(id) !== gr || i.katilma === null) continue;
        if (i.dukkanKurulus !== null) suredler.push(i.dukkanKurulus - i.katilma);
        if (bitisT - i.katilma >= E.ilkDukkan.payBekleSaat * SAAT) {
          uygun++;
          if (i.dukkanKurulus === null || i.dukkanKurulus - i.katilma > E.ilkDukkan.payBekleSaat * SAAT) bekleyenKurmayan++;
        }
      }
      const md = medyan(suredler);
      let durum: EkonomiDurumu = "olculmedi";
      if (md !== null && suredler.length >= E.enAzOlay) {
        const saat = md / SAAT;
        const kuranPayi = uygun === 0 ? null : 1 - bekleyenKurmayan / uygun;
        durum = saat <= E.ilkDukkan.yesilUstSaat ? "yesil" : saat <= E.ilkDukkan.sariUstSaat ? "sari" : "kirmizi";
        if (kuranPayi !== null && kuranPayi < E.ilkDukkan.kuranPayiAlt) durum = "kirmizi";
      }
      (e4.gruplar as Record<string, unknown>)[gr] = { durum, medyanSaat: md === null ? null : md / SAAT, kuran: suredler.length, uygunOyuncu: uygun, kuranPayi48Saat: uygun === 0 ? null : (uygun - bekleyenKurmayan) / uygun };
    }
    e4.durum = en(EKONOMI_GRUPLARI.map((gr) => ((e4.gruplar as Record<string, { durum: EkonomiDurumu }>)[gr] as { durum: EkonomiDurumu }).durum));
    metrikler["E4"] = e4;

    // ---- E5 geri ödeme ------------------------------------------------------------------------------------------------------------
    metrikler["E5"] = { durum: "olculmedi", not: "dukkan basina kumulatif satis miktari sayaci yok (A2 K2-8); geri odeme olculemez" };

    // ---- E6 M (grup) --------------------------------------------------------------------------------------------------------------
    const e6: EkonomiMetrik = { durum: "olculmedi", gruplar: {}, not: "M = pencerede >= 24 sa degirmen tesisi olan / pencerede >= 1 gida fabrikasi kuran; G4 tetigi botta yalniz secici botlardan (burada gruplar bot/insan ayrimidir, secici/rehberli degil)" };
    for (const gr of EKONOMI_GRUPLARI) {
      let pay = 0;
      let payda = 0;
      for (const [id, i] of this.iz) {
        if (this.grup(id) !== gr || !i.fabrikaKurdu) continue;
        payda++;
        if (i.degirmenMs >= E.M.degirmenSaat * SAAT) pay++;
      }
      const m = payda === 0 ? null : pay / payda;
      const durum: EkonomiDurumu = m === null || payda < E.enAzOyuncu ? "olculmedi" : m >= E.M.yesilAlt ? "yesil" : m >= E.M.sariAlt ? "sari" : "kirmizi";
      (e6.gruplar as Record<string, unknown>)[gr] = { durum, M: m, degirmenli: pay, fabrikaKuran: payda };
    }
    e6.durum = en(EKONOMI_GRUPLARI.map((gr) => ((e6.gruplar as Record<string, { durum: EkonomiDurumu }>)[gr] as { durum: EkonomiDurumu }).durum));
    metrikler["E6"] = e6;

    // ---- E7 kamu kasaları ---------------------------------------------------------------------------------------------------------
    {
      const bas = onceki(E.kasaBirikim.pencereGun);
      if (son === undefined || son.para === null || bas === undefined || bas.para === null) {
        metrikler["E7"] = { durum: "olculmedi", not: `${E.kasaBirikim.pencereGun} gunluk pencere icin ornek yok; (a) kapasite karsilama icin siparis hacmi okunamaz` };
      } else {
        const musluk = topla(son.para.musluk) - topla(bas.para.musluk);
        const birikim = musluk > 0 ? son.para.kasaBakiye / musluk : null;
        metrikler["E7"] = {
          durum: birikim === null || kucuk ? "olculmedi" : birikim <= E.kasaBirikim.yesilUst ? "yesil" : birikim <= E.kasaBirikim.sariUst ? "sari" : "kirmizi",
          birikim,
          kasaBakiyeMili: son.para.kasaBakiye,
          muslukMili28Gun: musluk,
          not: "(a) kapasite karsilama olculmedi: kamu siparis hacmi okunamaz",
        };
      }
    }

    // ---- E8 fiyat sınırı ----------------------------------------------------------------------------------------------------------
    {
      let enUzunSaat = 0;
      let enUzunMal: string | null = null;
      for (const [mal, s] of this.sinirSerisi) {
        if (s.enUzun * 24 > enUzunSaat) {
          enUzunSaat = s.enUzun * 24;
          enUzunMal = mal;
        }
      }
      if (son === undefined) metrikler["E8"] = { durum: "olculmedi", not: "gunluk ornek yok" };
      else {
        const sayi = son.sinirdaMal.alt.length + son.sinirdaMal.ust.length;
        const durum: EkonomiDurumu = kucuk ? "olculmedi" : sayi >= 3 || enUzunSaat >= E.fiyatSiniri.kesintisizSaat ? "kirmizi" : sayi >= 1 ? "sari" : "yesil";
        metrikler["E8"] = { durum, sinirdaMalSayisi: sayi, alt: son.sinirdaMal.alt, ust: son.sinirdaMal.ust, enUzunKesintisizSaat: enUzunSaat, enUzunMal, ...(kucuk ? { not: `dunyada < ${E.enAzOyuncu} oyuncu: durum verilmez` } : {}) };
      }
    }

    // ---- E9 bakım / aşınma (grup; oyuncu yaşı gün 14 ve 45) ------------------------------------------------------------------------
    const e9: EkonomiMetrik = { durum: "olculmedi", gruplar: {}, not: "k = 3 zincir cikti kaybi = 1 - (1 - asinma x tavan)^3, oyuncu yasinin 14. ve 45. gununde tesis asinma medyani (grup medyani); tavan param.sanayi.bakim.asinmaVerimKaybiTavaniPpm" };
    const tavan = sn === null ? null : sn.p.bakim.asinmaVerimKaybiTavaniPpm;
    for (const gr of EKONOMI_GRUPLARI) {
      const olc = (gun: number): { medyanAsinmaPpm: number | null; zincirKaybi: number | null; oyuncu: number } => {
        const l: number[] = [];
        for (const [id, i] of this.iz) {
          if (this.grup(id) !== gr) continue;
          const x = i.asinma.find((a) => a[0] === gun);
          if (x !== undefined) l.push(x[1]);
        }
        const m = medyan(l);
        const kayip = m === null || tavan === null ? null : 1 - Math.pow(1 - (m * tavan) / (PPM * PPM), E.asinma.zincirDerinligi);
        return { medyanAsinmaPpm: m, zincirKaybi: kayip, oyuncu: l.length };
      };
      const a = olc(E.asinma.gun1);
      const b = olc(E.asinma.gun2);
      let durum: EkonomiDurumu = "olculmedi";
      if (b.zincirKaybi !== null && b.oyuncu >= E.enAzOyuncu) {
        const g1 = a.zincirKaybi ?? 0;
        const kirmizi = g1 > E.asinma.sari[0] || b.zincirKaybi > E.asinma.sari[1] || (b.medyanAsinmaPpm !== null && b.medyanAsinmaPpm / PPM < E.asinma.hicAsinmaAlt);
        durum = kirmizi ? "kirmizi" : g1 <= E.asinma.yesil[0] && b.zincirKaybi <= E.asinma.yesil[1] ? "yesil" : "sari";
      }
      (e9.gruplar as Record<string, unknown>)[gr] = { durum, gun14: a, gun45: b };
    }
    e9.durum = en(EKONOMI_GRUPLARI.map((gr) => ((e9.gruplar as Record<string, { durum: EkonomiDurumu }>)[gr] as { durum: EkonomiDurumu }).durum));
    metrikler["E9"] = e9;

    // ---- E10 ödül -----------------------------------------------------------------------------------------------------------------
    if (son === undefined || son.para === null) metrikler["E10"] = { durum: "olculmedi", not: "para defteri yok" };
    else {
      const odul = son.para.musluk["odul"] ?? 0;
      const kisiBasi = toplamOyuncu === 0 ? null : odul / toplamOyuncu / MILI;
      metrikler["E10"] = {
        durum: kisiBasi === null || kucuk ? "olculmedi" : kisiBasi <= E.odul.yesilUstTl ? "yesil" : kisiBasi <= E.odul.sariUstTl ? "sari" : "kirmizi",
        oyuncuBasiOdulTl: kisiBasi,
        toplamOdulMili: odul,
        not: "oyuncu basina ortalama (dunya geneli); reddedilen odul sayaci dunya durumunda yok (sunucu /metrik)",
      };
    }

    notlar.push("Esikler A2'nin ilk tahminidir (dogrulanmadi); n < 5 oyuncu ya da n < 3 olayda durum 'olculmedi'.");
    notlar.push("Gruplar: 'insan' = disaridan verilen test oyunculari, 'diger' = dunyadaki tum otekiler (botlar, yerlesikler). Oyuncu kimligi ciktiya yazilmaz.");
    return { surum: 1, aralikMs: GUN, esikler: EKONOMI_ESIKLERI, gunluk: this.gunluk, metrikler, notlar };
  }
}

/** Grup durumlarından birleşik durum: hiçbiri ölçülmediyse olculmedi; biri kırmızıysa kırmızı; sarı varsa sarı; aksi yeşil. */
function en(l: readonly EkonomiDurumu[]): EkonomiDurumu {
  const olculen = l.filter((x) => x !== "olculmedi");
  if (olculen.length === 0) return "olculmedi";
  if (olculen.includes("kirmizi")) return "kirmizi";
  if (olculen.includes("sari")) return "sari";
  return "yesil";
}
