/**
 * Dükkân köprüsü (saf; G9 B): sunucu karesinden `DukkanGorunumu`'na (`dukkan-veri.ts`) çeviri, §6.8b türetilmiş değerler ve G7 komut kurucuları.
 * HENÜZ KİMSE İÇE AKTARMIYOR (bağlamayı K1 yapar); DOM, ağ ve depo yoktur, kare şeması bilgisi yalnız burada.
 *
 * 1) `dukkanGorunumuKur`: kare (`oyuncu.markalar/ilkSatisT/insaatlar`, `bolgeler[].ozel.dukkanlar`, `.genel.dukkanlar`, `ilceler[].talep`) + param -> `DukkanGorunumu`.
 *    - Yuva: `mal ""` -> null; `fiyat`/`etkin` kademe indeksi; `mevcut` -> `stokVar`; `fiyatT` BOŞ yuvada da taşınır; `beklemeSaat` = `fiyatT + fiyatDegisimEnAzSaat` penceresinden kalan
 *      saat, YUKARI yuvarlanır (çekirdek `hizSiniri` ile aynı; `fiyatT` 0 = hiç değişmedi = serbest).
 *    - Biten dükkân `ozel.dukkanlar`'dan (ek yapı kimliği = komutların `dukkan` alanı), tabela `genel.dukkanlar`'dan (tür, ölçek, marka); süren dükkân inşaatı `oyuncu.insaatlar`'dan
 *      (`ekYapi === "dukkan"`): `durum: "insaat"`, `id` = -inşaat kimliği (NEGATİF: ek yapı kimliğiyle çakışmaz, komutta kullanılmaz). Süren inşaatta tür karede YOKTUR: `tur: null`
 *      (TAHMİN EDİLMEZ; görünüm türsüz "Dükkân (inşaatta)" çizer). Tür bilinmeyen/tanımsız tabela için de null.
 *    - Hücre/ilçe: `ilceler[].hucreler` içinde biten dükkân `tesis` alanı = ek yapı kimliği (çekirdek `ekYapiTamamla`: `h.tesis = id`), süren inşaat `insaat` alanı = inşaat kimliği
 *      (tür `dukkan`); bulunan hücre kimlikleri `hucreler`e, ilçesi `ilce`ye yazılır. Karede hücre yoksa ikisi de boş kalır (ilçe uydurulmaz).
 * 2) §6.8b (A3 6beb93a; A2 §1.9): yuva neti FIRSAT MALİYETLİDİR = dükkân geliri - aynı birim NPC'ye ihraç edilseydi alınacak para; dükkân neti = Σ yuva neti - ölçek gideri;
 *    ödeme süresi = ceil(yatırım / net) (net <= 0: yok = "geri ödemez"). 0,891 SABİT DEĞİL: `ihrNetPpm = ihracatCarpaniPpm x (PPM - islemKomisyonuPpm) / PPM` param.pazar'dan.
 *    Net AŞAĞI, süre YUKARI yuvarlanır. Tutarlar mili-₺; ekranda tam ₺ gerekirse `asagiTL`.
 * 3) G7 komut kurucuları (`dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, dükkân kurulumu `yapi_yerlestir`/`tesis_insa_hucre`): çıktı `Komut`; protokol `KomutSemasi` testte doğrular.
 */
import { PPM, SAAT, carpBol } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import type { BolgeKaresi, IlgiKaresi, SahipDukkan } from "@bolge/protokol";
import { DUKKAN_TURLERI } from "./dukkan-veri";
import type { DukkanGorunumu, DukkanKaydi, DukkanTuru, DukkanYuvasi, Kademe } from "./dukkan-veri";

/**
 * Köprünün dükkân kaydı: `DukkanKaydi`'ndan iki fark. `tur` null olabilir (süren inşaatta türü karede yok; TAHMİN EDİLMEZ) ve `hucreler` (dükkânın hücre kimlikleri; karede yoksa boş).
 * `DukkanKaydi.tur` zorunlu olduğundan bağlamada K1 tipi `DukkanTuru | null` yapar ve türsüz çizer (bu dosya K1 dosyalarına dokunmaz).
 */
export interface KopruDukkanKaydi extends Omit<DukkanKaydi, "tur"> {
  tur: DukkanTuru | null;
  hucreler: string[];
}

export interface KopruGorunumu extends Omit<DukkanGorunumu, "dukkanlar"> {
  dukkanlar: KopruDukkanKaydi[];
}

// --- param görünümü (yapısal: `MulkPerakendeParametreleri` ve `Parametreler.pazar` doğrudan uyar; değer içe aktarılmaz) --------------------------------------------

export interface KopruPerakende {
  fiyatKademeleriPpm: readonly number[];
  varsayilanFiyatKademesi?: number;
  kampanyaKademesi?: number;
  kampanyaGunlukEnFazlaSaat?: number;
  kampanyaHaftalikEnFazlaGun?: number;
  fiyatDegisimEnAzSaat: number;
  /** İndeks 0 = S, 1 = M, 2 = L. */
  olcekler: ReadonlyArray<{ giderMiliSaat: number }>;
  dukkanTurleri: ReadonlyArray<{ id: string; mallar: readonly string[] }>;
}

export interface KopruPazar {
  ihracatCarpaniPpm: number;
  ithalatCarpaniPpm: number;
  /** Pazar v1 alanı: yoksa (eski pazar) komisyon 0. */
  islemKomisyonuPpm?: number;
}

export interface KopruParam {
  /** Dükkân kuralları (`param.mulk.perakende`); yok = G7 kapalı (`kapali: true`). */
  perakende: KopruPerakende | null;
  pazar: KopruPazar;
}

/** Referans fiyat (mili-₺/birim): kare `fiyat[malIndeksi]`; yoksa taban fiyat ve `yaklasik: true`. Bilinmeyen mal: undefined (net 0, yaklaşık). */
export type ReferansFiyati = (mal: string) => { mili: number; yaklasik: boolean } | undefined;

// --- §6.8b türetilmiş değerler ------------------------------------------------------------------------------------------------------------------------------------

/** İhracat net çarpanı (ppm): `ihracatCarpaniPpm x (PPM - islemKomisyonuPpm) / PPM` (900 000 x 0,99 = 891 000). */
export function ihrNetPpm(p: KopruPazar): number {
  return carpBol(p.ihracatCarpaniPpm, PPM - (p.islemKomisyonuPpm ?? 0), PPM);
}

/** İthalat net çarpanı (ppm): `ithalatCarpaniPpm x PPM / (PPM - islemKomisyonuPpm)` (1 100 000 / 0,99 ≈ 1 111 111; aşağı). */
export function ithNetPpm(p: KopruPazar): number {
  return carpBol(p.ithalatCarpaniPpm, PPM, PPM - (p.islemKomisyonuPpm ?? 0));
}

export interface YuvaGirdisi {
  /** Rafta mal var (boş yuvada net 0). */
  dolu: boolean;
  /** Stok var (`mevcut`); yoksa yuva çekime girmez, net 0. */
  mevcut: boolean;
  /** Kasa kırpmalı satış isteği (mili-birim/saat). */
  istekMiliSaat: number;
  /** Etkin kademe indeksi. */
  etkinKademe: number;
  /** Referans fiyat R (mili-₺/birim). */
  referansMili: number;
}

export interface YuvaMili {
  /** Tahmini satış (mili-birim/saat): `mevcut ? istek x karsilanma : 0`. */
  satisMiliSaat: number;
  /** Dükkân satış geliri (mili-₺/saat) = R x kademe x satış. */
  gelirMiliSaat: number;
  /** Aynı birimi NPC'ye ihraç etseydi alınacak para (mili-₺/saat; fırsat maliyeti). */
  altMiliSaat: number;
  /** Yuva neti = gelir - alternatif (negatif olabilir: kademe < ihrNet, ör. kampanya). */
  netMiliSaat: number;
}

/** Bir yuvanın §6.8b değerleri (mili-₺/saat). `karsilanmaPpm` düğümün en düşük karşılama oranıdır (muhafazakâr, yaklaşık). Boş ya da stoksuz yuvada hepsi 0. */
export function yuvaMili(y: YuvaGirdisi, karsilanmaPpm: number, kademelerPpm: readonly number[], pazar: KopruPazar): YuvaMili {
  if (!y.dolu || !y.mevcut) return { satisMiliSaat: 0, gelirMiliSaat: 0, altMiliSaat: 0, netMiliSaat: 0 };
  const satis = carpBol(y.istekMiliSaat, karsilanmaPpm, PPM);
  const brut = carpBol(satis, y.referansMili, 1000);
  const kademe = kademelerPpm[y.etkinKademe] ?? PPM;
  const gelir = carpBol(brut, kademe, PPM);
  const alt = carpBol(brut, ihrNetPpm(pazar), PPM);
  return { satisMiliSaat: satis, gelirMiliSaat: gelir, altMiliSaat: alt, netMiliSaat: gelir - alt };
}

/** Dükkân neti (mili-₺/saat) = Σ yuva neti - ölçek işletme gideri (bakım yok: ek yapıda parça tüketimi/aşınma yoktur). */
export function dukkanNetMili(yuvaNetleriMili: readonly number[], giderMiliSaat: number): number {
  let t = 0;
  for (const n of yuvaNetleriMili) t += n;
  return t - giderMiliSaat;
}

export interface EksikMal {
  mal: string;
  /** İndirimli gereken miktar (mili-birim; `q_efektif`). */
  gerekliMili: number;
  /** Depodaki stok (mili-birim). */
  stokMili: number;
  /** Referans fiyat (mili-₺/birim). */
  referansMili: number;
}

/**
 * Nakit yatırım (mili-₺) = `insaParasi_efektif + Σ max(0, q_efektif - stok) x R x ithNetPpm / PPM` (stok yeterliyse yalnız para). Girdiler K1 maliyet kartıyla AYNI sayıdır
 * (ilk 5 yapı indirimi uygulanmış).
 */
export function yatirimMili(insaParasiMili: number, eksikler: readonly EksikMal[], pazar: KopruPazar): number {
  const ith = ithNetPpm(pazar);
  let t = insaParasiMili;
  for (const e of eksikler) {
    const eksik = Math.max(0, e.gerekliMili - e.stokMili);
    if (eksik > 0) t += carpBol(carpBol(eksik, e.referansMili, 1000), ith, PPM);
  }
  return t;
}

/** Kendini ödeme süresi (saat, YUKARI yuvarlanır); net <= 0 ise null ("geri ödemez": sayı gösterilmez). */
export function odemeSaat(yatirim: number, netMiliSaat: number): number | null {
  if (!(netMiliSaat > 0)) return null;
  if (yatirim <= 0) return 0;
  return Math.ceil(yatirim / netMiliSaat);
}

/** Mili-₺ -> tam ₺, AŞAĞI (yuva neti ekranı; negatifte de matematiksel floor). */
export function asagiTL(miliParasi: number): number {
  return Math.floor(miliParasi / 1000);
}

// --- kare -> DukkanGorunumu ----------------------------------------------------------------------------------------------------------------------------------------

export interface KopruGirdisi {
  /** Şimdiki kare (birikimli); yoksa ya da `oyuncu` yoksa görünüm null. */
  kare: Pick<IlgiKaresi, "t" | "bolgeler" | "oyuncu" | "ilceler"> | null;
  param: KopruParam;
  referans: ReferansFiyati;
  /** Dükkân kurma maliyet planlayıcısı (K1) S bedelinin tamamını karşılıyor mu. */
  kurmaKarsilaniyor: boolean;
}

/** Köprü çıktısı: görünüm + görünüme sığmayan türetilmiş değerler. */
export interface KopruSonucu {
  gorunum: KopruGorunumu;
  /** Referans fiyatı taban fiyattan geldi (ya da bilinmiyor) -> sayılar "yaklaşık" etiketlenmeli. */
  yaklasik: boolean;
  /** Dükkân kimliği -> fırsat maliyetli net (mili-₺/saat; Σ yuva neti - ölçek gideri; §6.8b). */
  dukkanNetMili: Readonly<Record<number, number>>;
  /** `ilceler[].talep`: `{ ilce, mal, qMiliSaat }` (yalnız isteyenin kendi dükkân mallarında; esnaf payı gösterimi). */
  talep: ReadonlyArray<{ ilce: string; mal: string; qMiliSaat: number }>;
}

const kademeMi = (n: number): n is Kademe => n === 0 || n === 1 || n === 2 || n === 3;

/** Kademe indeksi (0..3) ya da güvenli varsayılan (`varsayilan`, o da değilse 2 = normal). */
function kademeye(n: number, varsayilan: number | undefined): Kademe {
  if (kademeMi(n)) return n;
  return varsayilan !== undefined && kademeMi(varsayilan) ? varsayilan : 2;
}

const turMu = (s: string): s is DukkanTuru => (DUKKAN_TURLERI as readonly string[]).includes(s);

/** Yuvada fiyat/mal değişimi için kalan bekleme (saat, YUKARI); `fiyatT` 0 = hiç değişmedi = serbest; `enAz` 0 = sınır yok. */
export function beklemeSaati(t: number, fiyatT: number, enAzSaat: number): number {
  if (!(enAzSaat > 0) || !(fiyatT > 0)) return 0;
  const kalan = fiyatT + enAzSaat * SAAT - t;
  return kalan > 0 ? Math.ceil(kalan / SAAT) : 0;
}

/** Kampanya kuralı açık mı (çekirdek `kampanyaAcik` ile aynı koşul). */
export function kampanyaAcikMi(p: KopruPerakende): boolean {
  return p.kampanyaKademesi !== undefined && (p.kampanyaGunlukEnFazlaSaat ?? 0) > 0 && (p.kampanyaHaftalikEnFazlaGun ?? 0) > 0;
}

/**
 * Kareden dükkân görünümü. `null`: kare ya da oyuncu karesi yok (henüz gelmedi). Dükkân kuralı kapalıysa (`param.perakende` yok) `kapali: true` ve boş liste.
 * Sunucu dükkân alanlarını yalnız çözüm bağlamı varsa yazar: alan yoksa dükkân listesi boş kalır (süren inşaatlar yine görünür).
 */
export function dukkanGorunumuKur(g: KopruGirdisi): KopruSonucu | null {
  const kare = g.kare;
  const o = kare?.oyuncu;
  if (kare === null || o === undefined) return null;
  const pk = g.param.perakende;
  const markalar = (o.markalar ?? []).map((m): [string, number, number] => [m[0], m[1], m[2]]);
  const ilkSatisT = o.ilkSatisT ?? null;
  const talep: Array<{ ilce: string; mal: string; qMiliSaat: number }> = [];
  for (const ic of kare.ilceler ?? []) for (const [mal, q] of ic.talep ?? []) talep.push({ ilce: ic.id, mal, qMiliSaat: q });
  if (pk === null) {
    return { gorunum: { kapali: true, dukkanlar: [], markalar, ilkSatisT, satilabilirMallar: new Set(), kurmaKarsilaniyor: g.kurmaKarsilaniyor, kampanyaAcik: false }, yaklasik: false, dukkanNetMili: {}, talep };
  }
  const satilabilir = new Set<string>();
  for (const t of pk.dukkanTurleri) for (const m of t.mallar) satilabilir.add(m);
  const tabela = new Map<number, [tur: string, olcek: 0 | 1 | 2, markaAd: string, simge: number, renk: number]>();
  const acik: Array<{ b: BolgeKaresi; d: SahipDukkan }> = [];
  for (const b of kare.bolgeler) {
    for (const x of b.genel.dukkanlar ?? []) tabela.set(x[0], [x[1], x[2], x[3], x[4], x[5]]);
    for (const d of b.ozel?.dukkanlar ?? []) acik.push({ b, d });
  }
  let yaklasik = false;
  const net: Record<number, number> = {};
  const kayitlar: KopruDukkanKaydi[] = [];
  // Hücre dizini: biten dükkân (`tesis` = ek yapı kimliği) ve süren inşaat (`insaat` = inşaat kimliği); yalnız tür `dukkan` hücreleri.
  const tesisHucre = new Map<number, { ilce: string; hucreler: string[] }>();
  const insaatHucre = new Map<number, { ilce: string; hucreler: string[] }>();
  const ekle = (m: Map<number, { ilce: string; hucreler: string[] }>, anahtar: number, ilce: string, hucre: string): void => {
    const x = m.get(anahtar);
    if (x === undefined) m.set(anahtar, { ilce, hucreler: [hucre] });
    else x.hucreler.push(hucre);
  };
  for (const ic of kare.ilceler ?? []) {
    for (const h of ic.hucreler) {
      if (h[5] !== "dukkan") continue;
      if (h[3] >= 0) ekle(tesisHucre, h[3], ic.id, h[0]);
      if (h[4] >= 0) ekle(insaatHucre, h[4], ic.id, h[0]);
    }
  }
  for (const { b, d } of [...acik].sort((x, y) => x.d[0] - y.d[0])) {
    const [id, raf, kasaPpm, kamp, karsilanmaPpm] = d;
    const tb = tabela.get(id);
    const olcek = tb?.[1] ?? 0;
    const tur = tb !== undefined && turMu(tb[0]) ? tb[0] : null;
    const hc = tesisHucre.get(id);
    let gelir = 0;
    const netler: number[] = [];
    const yuvalar = raf.map((r): DukkanYuvasi => {
      const [mal, fiyat, etkin, mevcut, istek, fiyatT] = r;
      const dolu = mal !== "";
      const ref = dolu ? g.referans(mal) : undefined;
      if (dolu && (ref === undefined || ref.yaklasik)) yaklasik = true;
      const R = ref?.mili ?? 0;
      const m = yuvaMili({ dolu, mevcut: mevcut === 1, istekMiliSaat: istek, etkinKademe: etkin, referansMili: R }, karsilanmaPpm, pk.fiyatKademeleriPpm, g.param.pazar);
      gelir += m.gelirMiliSaat;
      netler.push(m.netMiliSaat);
      const kademe = kademeye(fiyat, pk.varsayilanFiyatKademesi);
      return {
        mal: dolu ? mal : null,
        kademe,
        etkinKademe: kademeye(etkin, kademe),
        stokVar: mevcut === 1,
        istekMiliSaat: istek,
        fiyatMili: carpBol(R, pk.fiyatKademeleriPpm[etkin] ?? PPM, PPM),
        netMiliSaat: m.netMiliSaat,
        fiyatT,
        beklemeSaat: beklemeSaati(kare.t, fiyatT, pk.fiyatDegisimEnAzSaat),
      };
    });
    const gider = pk.olcekler[olcek]?.giderMiliSaat ?? 0;
    net[id] = dukkanNetMili(netler, gider);
    const k: KopruDukkanKaydi = {
      id,
      tur,
      durum: "acik",
      hucreler: hc?.hucreler ?? [],
      markaAd: tb?.[2] ?? "",
      yuvalar,
      kasaPpm,
      karsilanmaPpm,
      gelirMiliSa: gelir,
      giderMiliSa: gider,
      kampanya: { bitis: kamp[0], kalanSaat: kamp[1], kalanGun: kamp[2] },
    };
    if (hc !== undefined) k.ilce = hc.ilce;
    if (tb !== undefined && tb[2] !== "") {
      k.simge = tb[3];
      k.renk = tb[4];
    }
    void b;
    kayitlar.push(k);
  }
  // Süren dükkân inşaatları (tür karede yok: null).
  for (const ins of [...o.insaatlar].filter((x) => x[6] === "dukkan").sort((x, y) => x[0] - y[0])) {
    const hc = insaatHucre.get(ins[0]);
    kayitlar.push({
      id: -ins[0],
      tur: null,
      durum: "insaat",
      hucreler: hc?.hucreler ?? [],
      ...(hc !== undefined ? { ilce: hc.ilce } : {}),
      markaAd: "",
      bitis: ins[4],
      yuvalar: [],
      kasaPpm: 0,
      karsilanmaPpm: 0,
      gelirMiliSa: 0,
      giderMiliSa: 0,
      kampanya: { bitis: 0, kalanSaat: 0, kalanGun: 0 },
    });
  }
  return {
    gorunum: { kapali: false, dukkanlar: kayitlar, markalar, ilkSatisT, satilabilirMallar: satilabilir, kurmaKarsilaniyor: g.kurmaKarsilaniyor, kampanyaAcik: kampanyaAcikMi(pk) },
    yaklasik,
    dukkanNetMili: net,
    talep,
  };
}

// --- G7 komut kurucuları -------------------------------------------------------------------------------------------------------------------------------------------

type DukkanRafKomutu = Extract<Komut, { tur: "dukkan_raf" }>;
type DukkanFiyatKomutu = Extract<Komut, { tur: "dukkan_fiyat" }>;
type MarkaTanimlaKomutu = Extract<Komut, { tur: "marka_tanimla" }>;
type YapiYerlestirKomutu = Extract<Komut, { tur: "yapi_yerlestir" }>;
type TesisInsaHucreKomutu = Extract<Komut, { tur: "tesis_insa_hucre" }>;

function tam(ad: string, n: number): number {
  if (!Number.isSafeInteger(n)) throw new RangeError(`${ad}: tamsayi bekleniyor (${String(n)})`);
  return n;
}

/** Rafa mal koy (`mal` verilir) ya da yuvayı boşalt (`null`). Tutar/miktar yoktur. */
export function rafKomutu(dukkan: number, yuva: number, mal: string | null): DukkanRafKomutu {
  return { tur: "dukkan_raf", dukkan: tam("dukkan", dukkan), yuva: tam("yuva", yuva), mal };
}

/** Yuvanın fiyat kademesi (indeks; tutar değil). */
export function fiyatKomutu(dukkan: number, yuva: number, kademe: number): DukkanFiyatKomutu {
  return { tur: "dukkan_fiyat", dukkan: tam("dukkan", dukkan), yuva: tam("yuva", yuva), fiyat: tam("kademe", kademe) };
}

/** Marka tanımı (`marka`: oyuncunun marka dizini). Ad kırpılır; kanonikleştirme ve yasaklı ad denetimi SUNUCUDADIR (ret: `ad_gecersiz`/`ad_yasakli`). */
export function markaKomutu(marka: number, ad: string, simge: number, renk: number): MarkaTanimlaKomutu {
  return { tur: "marka_tanimla", marka: tam("marka", marka), ad: ad.trim(), simge: tam("simge", simge), renk: tam("renk", renk) };
}

export interface DukkanKurGirdisi {
  ilce: string;
  hucreler: readonly string[];
  /** Dükkân türü kimliği (`param.mulk.perakende.dukkanTurleri[].id`). */
  dukkanTuru: string;
  /** 0 = S (varsayılan), 1 = M, 2 = L. */
  olcek?: 0 | 1 | 2;
}

/**
 * Dükkân kurulumu: arsa + inşaat TEK atomik `yapi_yerlestir` (`sinif` zorunlu; hücreler birden çok sınıftaysa `siniflar` hücre başına). `tesisTuru` `dukkan`, `dukkanTuru` zorunlu.
 */
export function dukkanKurKomutu(g: DukkanKurGirdisi & { sinif: "kirsal" | "kasaba" | "sehir"; siniflar?: ReadonlyArray<"kirsal" | "kasaba" | "sehir"> }): YapiYerlestirKomutu {
  const k: YapiYerlestirKomutu = { tur: "yapi_yerlestir", ilce: g.ilce, tesisTuru: "dukkan", hucreler: [...g.hucreler], sinif: g.sinif, dukkanTuru: g.dukkanTuru };
  if (g.siniflar !== undefined) k.siniflar = [...g.siniflar];
  if (g.olcek !== undefined) k.olcek = g.olcek;
  return k;
}

/** Arsası zaten oyuncunun olan hücrede dükkân (arsa alımı yok): `tesis_insa_hucre` (atomik komut yoksa ya da yurtta kurulumda). */
export function dukkanKurArsasizKomutu(g: DukkanKurGirdisi): TesisInsaHucreKomutu {
  const k: TesisInsaHucreKomutu = { tur: "tesis_insa_hucre", ilce: g.ilce, tesisTuru: "dukkan", hucreler: [...g.hucreler], dukkanTuru: g.dukkanTuru };
  if (g.olcek !== undefined) k.olcek = g.olcek;
  return k;
}
