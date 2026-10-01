/**
 * Parsel botları (mülk kipi; docs/06 §15, docs/olcum/h1-h9-parsel-tanimlari.md): çiftçi, sanayici, tüccar, geç katılan, pasif.
 *
 * Bölge kipi botlarından (arketipler.ts) AYRIDIR: yalnız mülk komutlarıyla oynar ve yalnız parsel kipinde (`sim.ic.mulk`) çalışır.
 * Komut kümesi: `oyuncu_katil {ilce}` (koşucu, `katilimIlcesi`), `yapi_yerlestir` (arsa + yapı atomik), `ticaret_emri`.
 * Deterministiktir: rastgelelik yoktur; hücre ve ilçe seçimi tamamen durumdan ve kimlik sırasından türer (aynı dünya → aynı komutlar).
 * Botlar durumsuzdur: her `karar` çağrısı yalnızca `sim`i okur (kendi geçmişini tutmaz); "yapıldı mı" sorusu dünyadan çözülür.
 *
 * Önayarlar (hepsi yeni oyuncu paketini kullanır: yurt, %30 indirimli ilk 5 yapı, 14 gün kalkan):
 *  - ciftci:     ova ilinde Çiftlik → Ahır → Çiftlik; fazla tahıl/gıda/gübreyi ihraç eder.
 *  - sanayici:   dağ ilinde Hidro santral → Cevher madeni (×2) → Ambar; cevheri ihraç eder, malzeme açığını ithal eder.
 *  - tuccar:     kıyı/ova ilinde üretim (Çiftlik/Mera) + Ticaret ofisi; ihracat emri yuvalarını (4 + ofis) doldurur.
 *  - pasif:      kur-unut: ilk kurulumu bir kez yapar (tek yapı + emirler), sonra hiçbir komut vermez.
 *  - gec_katilan: `acilis` ∈ ciftci | sanayici | pazar (tuccar); aynı paket, farklı açılış (Ar-Ge `gec_ciftci/gec_sanayici/gec_pazar`).
 *    Yerleşiklerin bulunduğu (en çok sahipli) ilçeye katılır: ilçe medyanı ile karşılaştırılabilsin.
 */
import { anlikHazine, anlikMiktar, isletmeBul, mulkOyuncuBul, parselFiyati, ticaretEmirYuvasi } from "@bolge/cekirdek";
import type { ArsaSinifi, BolgeDurumu, DerlenmisMulk, Dunya, HucreDurumu, Komut, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { icerikBilgisi } from "./tablo";
import type { IcerikBilgisi } from "./tablo";

export type ParselOnayari = "ciftci" | "sanayici" | "tuccar" | "gec_katilan" | "pasif";
export const PARSEL_ONAYARLARI: readonly ParselOnayari[] = ["ciftci", "sanayici", "tuccar", "gec_katilan", "pasif"];

/** Geç katılanın açılışı: çiftçi, sanayici ya da pazar (tüccar) planı. */
export type GecAcilis = "ciftci" | "sanayici" | "pazar";
export const GEC_ACILISLARI: readonly GecAcilis[] = ["ciftci", "sanayici", "pazar"];

export interface ParselBotu {
  readonly oyuncu: OyuncuId;
  readonly onayar: ParselOnayari;
  /** Geç katılanın açılışı; diğer önayarlarda tanımsız. */
  readonly acilis: GecAcilis | undefined;
  /**
   * `oyuncu_katil` komutundaki `ilce` (bedava yurdun verileceği ilçe). Katılımdan ÖNCE çağrılır (dünyada henüz kaydı yoktur).
   * Tanımsız dönerse çekirdek ilçeyi seçer.
   */
  katilimIlcesi(sim: Simulasyon): string | undefined;
  /** O anki dünya durumuna göre komut listesi; durum değiştirmez. */
  karar(sim: Simulasyon): Komut[];
}

export interface ParselBotSecenegi {
  /** `gec_katilan` için açılış (vars. "ciftci"). */
  acilis?: GecAcilis;
}

// ---------------------------------------------------------------------------
// Önayar tanımları
// ---------------------------------------------------------------------------

interface Tanim {
  /** Açılış planı: yapı türleri sırasıyla (aynı tür tekrarı kadar adet). İlin etiket/rezerv uygunluğuna göre süzülür. */
  plan: readonly string[];
  /** Yurt ilçesinin ilinde bunlardan en az biri kurulabilmeli (açılış yapısı; alternatifler). */
  acilisTurleri: readonly string[];
  /** İlk yapının kurulacağı ilin seçim ölçütü. */
  ilSirasi: "ova" | "dag" | "kiyi_ova";
  /** Yalnız ilk kurulum yapılır (kur-unut). */
  birKez: boolean;
  /** Malzeme açığını ithalatla kapat. */
  ithalat: boolean;
  /** Yerleşiklerin ilçesini seç (geç katılan). */
  yerlesikIlce: boolean;
}

const CIFTCI: Tanim = { acilisTurleri: ["ciftlik"], plan: ["ciftlik", "ahir", "ciftlik"], ilSirasi: "ova", birKez: false, ithalat: false, yerlesikIlce: false };
const SANAYICI: Tanim = { acilisTurleri: ["hidro_santrali"], plan: ["hidro_santrali", "cevher_madeni", "cevher_madeni", "ambar"], ilSirasi: "dag", birKez: false, ithalat: true, yerlesikIlce: false };
const TUCCAR: Tanim = { acilisTurleri: ["ciftlik", "mera"], plan: ["ciftlik", "mera", "ticaret_ofisi", "ahir"], ilSirasi: "kiyi_ova", birKez: false, ithalat: false, yerlesikIlce: false };
const PASIF: Tanim = { acilisTurleri: ["ciftlik", "mera"], plan: ["ciftlik", "mera"], ilSirasi: "ova", birKez: true, ithalat: false, yerlesikIlce: false };

function tanimSec(onayar: ParselOnayari, acilis: GecAcilis): Tanim {
  switch (onayar) {
    case "ciftci":
      return CIFTCI;
    case "sanayici":
      return SANAYICI;
    case "tuccar":
      return TUCCAR;
    case "pasif":
      return PASIF;
    case "gec_katilan": {
      const t = acilis === "sanayici" ? SANAYICI : acilis === "pazar" ? TUCCAR : CIFTCI;
      return { ...t, yerlesikIlce: true };
    }
  }
}

// ---------------------------------------------------------------------------
// Dünya okuma yardımcıları (salt okunur)
// ---------------------------------------------------------------------------

interface Gorunum {
  sim: Simulasyon;
  d: Dunya;
  mk: DerlenmisMulk;
  bilgi: IcerikBilgisi;
  oyuncu: OyuncuId;
  /** Hücre kimliği -> sahipli hücre (tüm dünya). */
  sahipli: Map<string, HucreDurumu>;
}

function gorunumKur(sim: Simulasyon, oyuncu: OyuncuId): Gorunum | null {
  const mk = sim.ic.mulk;
  const d = sim.dunya;
  if (mk === undefined || d.mulk === undefined) return null;
  const sahipli = new Map<string, HucreDurumu>();
  for (const h of d.mulk.hucreler) sahipli.set(h.id, h);
  return { sim, d, mk, bilgi: icerikBilgisi(sim.ic), oyuncu, sahipli };
}

function xy(id: string): [number, number] {
  const i = id.indexOf(":");
  return [Number(id.slice(0, i)), Number(id.slice(i + 1))];
}

function dizgeSirala(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

/** İlin işletme düğümü ya da (yoksa) merkez bölgesi: etiket ve rezerv bilgisi için. */
function ilBolgesi(g: Gorunum, il: string): BolgeDurumu | undefined {
  const isl = isletmeBul(g.d, g.oyuncu, il);
  if (isl !== undefined) return g.d.bolgeler[isl.bolgeIndeksi];
  const mi = g.mk.ilMerkezi.get(il);
  return mi === undefined ? undefined : g.d.bolgeler[mi];
}

/** Yapı türü bu ilde kurulabilir mi (yuva, etiket, rezerv; ek yapılar için ilde azami sayı hariç). Teknoloji kilitli türler elenir. */
function ilIcinUygunMu(g: Gorunum, il: string, tur: string): boolean {
  const b = ilBolgesi(g, il);
  if (b === undefined) return false;
  if (g.mk.ekYapiIndeks.has(tur)) return true;
  const ti = g.sim.ic.tesisTuruIndeks[tur];
  if (ti === undefined) return false;
  if ((g.mk.yuva[ti] as number) <= 0) return false;
  const t = g.bilgi.tur[ti] as IcerikBilgisi["tur"][number];
  if (t.gerekliTeknoloji !== undefined) return false;
  if (t.gerekliEtiket !== undefined && !b.etiketler.includes(t.gerekliEtiket)) return false;
  if (t.gerekliRezerv >= 0 && ((b.rezervKalan[t.gerekliRezerv] as number) ?? 0) <= 0 && ((b.rezervIlk[t.gerekliRezerv] as number) ?? 0) <= 0) return false;
  return true;
}

/** Oyuncunun işletme düğümleri (il sırasıyla). */
function dugumleri(g: Gorunum): BolgeDurumu[] {
  const m = g.d.mulk;
  if (m === undefined) return [];
  return m.isletmeler.filter((i) => i.oyuncu === g.oyuncu).map((i) => g.d.bolgeler[i.bolgeIndeksi] as BolgeDurumu);
}

/** Yapı türünün adı (içerik tesis türü ya da ek yapı) -> mevcut + süren adet. */
function yapiSayilari(g: Gorunum): Map<string, number> {
  const s = new Map<string, number>();
  const ekle = (k: string): void => void s.set(k, (s.get(k) ?? 0) + 1);
  for (const b of dugumleri(g)) {
    for (const t of b.tesisler) ekle((g.sim.ic.tesisTurleri[t.tur] as { id: string }).id);
    for (const e of b.ekYapilar ?? []) ekle(e.tur);
  }
  for (const i of g.d.insaatlar) {
    if (i.sahip !== g.oyuncu || i.hucreler === undefined) continue;
    if (i.ekYapi !== undefined) ekle(i.ekYapi);
    else if (i.hedef >= 0) ekle((g.sim.ic.tesisTurleri[i.hedef] as { id: string }).id);
  }
  return s;
}

function surenInsaat(g: Gorunum): number {
  let n = 0;
  for (const i of g.d.insaatlar) if (i.sahip === g.oyuncu && i.hucreler !== undefined) n++;
  return n;
}

/** Oyuncunun ilçedeki hücre sayısı. */
function ilceHucreleri(g: Gorunum, ilce: string): HucreDurumu[] {
  return g.d.mulk!.hucreler.filter((h) => h.sahip === g.oyuncu && h.ilce === ilce);
}

/** Oyuncunun en çok hücreye sahip olduğu ilçe (eşitlikte kimlik sırası); hiç hücre yoksa null. */
function anaIlce(g: Gorunum): string | null {
  const sayac = new Map<string, number>();
  for (const h of g.d.mulk!.hucreler) if (h.sahip === g.oyuncu) sayac.set(h.ilce, (sayac.get(h.ilce) ?? 0) + 1);
  let en: string | null = null;
  let enSayi = 0;
  for (const k of [...sayac.keys()].sort(dizgeSirala)) {
    const n = sayac.get(k) as number;
    if (n > enSayi) {
      en = k;
      enSayi = n;
    }
  }
  return en;
}

// ---------------------------------------------------------------------------
// Yerleşim: ilçede yapı için kenar-bitişik hücre grubu
// ---------------------------------------------------------------------------

interface Yerlesim {
  hucreler: string[];
  sinif: ArsaSinifi;
  /** Satın alınacak (sahipsiz) hücre sayısı. */
  yeni: number;
  /** Tahmini arsa bedeli (mili-para). */
  arsa: number;
}

/**
 * İlçede `yuva` hücrelik (yatay ya da dikey, kenar-bitişik) en iyi grubu bulur. Hücreler oyuncunun boş hücresi ya da satın
 * alınabilir sahipsiz uygun hücre olabilir; satın alınanlar tek sınıfta olmalı (komuttaki `sinif`). Sıra: tahmini arsa bedeli
 * (küçük), oyuncunun hücrelerine komşuluk (çok), çapa sırası (fikstür sırası). Ayrılmış hücreler yalnız yeni oyuncuya açıktır.
 */
function yerlesimBul(g: Gorunum, ilceId: string, yuva: number, kullanilan: ReadonlySet<string>): Yerlesim | null {
  const ilce = g.mk.ilceler.get(ilceId);
  const durum = g.d.mulk!.ilceler.find((i) => i.id === ilceId);
  if (ilce === undefined || durum === undefined) return null;
  const katilma = g.d.oyuncular.find((o) => o.id === g.oyuncu)?.katilmaZamani;
  const yeniOyuncu = katilma !== undefined && g.d.zaman < katilma + g.mk.ayrilmisSureMs;
  const p = g.mk.p;
  const benimSayi = ilceHucreleri(g, ilceId).length + [...kullanilan].filter((id) => !g.sahipli.has(id)).length;
  const tavan = Math.min(p.ilceHucreTavani, Math.floor((durum.uygunHucre * p.ilcePayTavaniPpm) / 1_000_000));

  const tanim = new Map(ilce.hucreler.map((h) => [h.id, h]));
  type Durum = "benim" | "alinabilir" | "dolu";
  const durumu = (id: string): Durum => {
    const f = tanim.get(id);
    if (f === undefined || !f.uygun || kullanilan.has(id)) return "dolu";
    const s = g.sahipli.get(id);
    if (s === undefined) return !yeniOyuncu && g.mk.ayrilmis.has(id) ? "dolu" : "alinabilir";
    return s.sahip === g.oyuncu && s.tesis === undefined && s.insaat === undefined ? "benim" : "dolu";
  };
  const benimMi = (id: string): boolean => g.sahipli.get(id)?.sahip === g.oyuncu;

  let en: Yerlesim | null = null;
  let enKomsu = 0;
  for (const h of ilce.hucreler) {
    if (!h.uygun) continue;
    const [x, y] = xy(h.id);
    const sekiller: string[][] = yuva === 1 ? [[h.id]] : [Array.from({ length: yuva }, (_, i) => `${x + i}:${y}`), Array.from({ length: yuva }, (_, i) => `${x}:${y + i}`)];
    for (const grup of sekiller) {
      const durumlar = grup.map(durumu);
      if (durumlar.includes("dolu")) continue;
      const yeniler = grup.filter((_, i) => durumlar[i] === "alinabilir");
      const siniflar = new Set(yeniler.map((id) => (tanim.get(id) as { sinif: ArsaSinifi }).sinif));
      if (siniflar.size > 1) continue;
      if (benimSayi + yeniler.length > tavan) continue;
      if (durum.satilmisHucre + yeniler.length > durum.uygunHucre) continue;
      const sinif: ArsaSinifi = siniflar.size === 1 ? ([...siniflar][0] as ArsaSinifi) : (tanim.get(grup[0] as string) as { sinif: ArsaSinifi }).sinif;
      const arsa = yeniler.length === 0 ? 0 : parselFiyati(p.hucreFiyati[sinif], p.satisPayiCarpaniPpm, durum.satilmisHucre, durum.uygunHucre, yeniler.length);
      let komsu = 0;
      for (const id of grup) {
        const [cx, cy] = xy(id);
        for (const k of [`${cx + 1}:${cy}`, `${cx - 1}:${cy}`, `${cx}:${cy + 1}`, `${cx}:${cy - 1}`]) if (!grup.includes(k) && benimMi(k)) komsu++;
      }
      if (en === null || arsa < en.arsa || (arsa === en.arsa && komsu > enKomsu)) {
        en = { hucreler: grup, sinif, yeni: yeniler.length, arsa };
        enKomsu = komsu;
      }
    }
  }
  return en;
}

// ---------------------------------------------------------------------------
// Maliyet ve yeterlilik
// ---------------------------------------------------------------------------

interface YapiMaliyeti {
  para: number;
  mal: Array<[number, number]>;
  yuva: number;
}

/** Yapının (indirim dahil) para ve malzeme maliyeti; ek yapı ya da içerik türü. `ayniTurdaOnceki`: aynı komut turunda bu yapıdan önce verilen komut sayısı (indirim sayacı henüz artmadı). */
function yapiMaliyeti(g: Gorunum, tur: string, ayniTurdaOnceki: number): YapiMaliyeti | null {
  const yo = g.mk.p.yeniOyuncu;
  const mo = mulkOyuncuBul(g.d, g.oyuncu);
  const indirimli = yo.ilkYapiIndirimPpm > 0 && (mo?.indirimliYapi ?? 0) + ayniTurdaOnceki < yo.indirimliYapiSayisi;
  const carp = (x: number): number => (indirimli ? Math.floor((x * (1_000_000 - yo.ilkYapiIndirimPpm)) / 1_000_000) : x);
  const ei = g.mk.ekYapiIndeks.get(tur);
  if (ei !== undefined) {
    const e = g.mk.ekYapilar[ei]!;
    return { para: carp(e.insaParasi), mal: e.insaMaliyeti.map(([m, q]) => [m, carp(q)] as [number, number]), yuva: e.yuva };
  }
  const ti = g.sim.ic.tesisTuruIndeks[tur];
  if (ti === undefined) return null;
  const t = g.bilgi.tur[ti]!;
  return { para: carp(t.para), mal: t.maliyet.map(([m, q]) => [m, carp(q)] as [number, number]), yuva: g.mk.yuva[ti] as number };
}

/** Düğümdeki mal stoğu (mili-birim). */
function stok(g: Gorunum, b: BolgeDurumu, mal: number): number {
  const s = b.stoklar[mal];
  return s === undefined ? 0 : anlikMiktar(s, g.d.zaman);
}

// ---------------------------------------------------------------------------
// Ticaret emirleri
// ---------------------------------------------------------------------------

/** Tesis listesinden (biten + planlanan) mal başına net saatlik çıktı (mili-birim/saat; çıktı − girdi, tam kadro). */
function netCikti(g: Gorunum, ekTurler: readonly string[]): Map<number, number> {
  const net = new Map<number, number>();
  const ekle = (yontem: number): void => {
    const y = g.bilgi.yontem[yontem]!;
    for (const [m, q] of y.cikti) net.set(m, (net.get(m) ?? 0) + q);
    for (const [m, q] of y.girdi) net.set(m, (net.get(m) ?? 0) - q);
  };
  for (const b of dugumleri(g)) for (const t of b.tesisler) ekle(t.yontem);
  for (const i of g.d.insaatlar) {
    if (i.sahip !== g.oyuncu || i.hucreler === undefined || i.hedef < 0) continue;
    ekle((g.bilgi.tur[i.hedef] as { yontemler: number[] }).yontemler[0] as number);
  }
  for (const tur of ekTurler) {
    const ti = g.sim.ic.tesisTuruIndeks[tur];
    if (ti !== undefined) ekle((g.bilgi.tur[ti] as { yontemler: number[] }).yontemler[0] as number);
  }
  return net;
}

/**
 * İhracat emirleri: net çıktısı pozitif, depolanabilir her mal için net oranda ihracat (iç tüketim payı düşülür; böylece emir
 * kendi girdisini boşaltmaz). Yuva doluysa yeni mal eklenmez; net ≤ 0 olan eski emir silinir. Var olan emir aynıysa komut verilmez.
 */
function ihracatEmirleri(g: Gorunum, dugum: BolgeDurumu, ekTurler: readonly string[]): Komut[] {
  const net = netCikti(g, ekTurler);
  const yuva = ticaretEmirYuvasi(g.sim.ic, dugum);
  const emirler = dugum.ticaretEmirleri.filter((e) => e.yon === "ihracat");
  const bolge = dugum.id;
  const k: Komut[] = [];
  let kullanilan = dugum.ticaretEmirleri.length;
  for (const m of [...net.keys()].sort((a, b) => a - b)) {
    if (g.bilgi.depolanamaz[m]) continue;
    const oran = net.get(m) as number;
    const mevcut = emirler.find((e) => e.mal === m);
    const malId = g.bilgi.malId[m] as string;
    if (oran <= 0) {
      if (mevcut !== undefined) k.push({ tur: "ticaret_emri", bolge, mal: malId, yon: "ihracat", oranSaat: 0 });
      continue;
    }
    if (mevcut === undefined) {
      if (kullanilan >= yuva) continue;
      kullanilan++;
    } else if (mevcut.oranSaat === oran) continue;
    k.push({ tur: "ticaret_emri", bolge, mal: malId, yon: "ihracat", oranSaat: oran });
  }
  return k;
}

/** Malzeme açığı ithalatı: hedef yapının eksik malzemesi için 1 saatte kapanacak oranda ithalat emri (süren bakım tüketimini aşmak için); açık yoksa emri sil. */
function ithalatEmirleri(g: Gorunum, dugum: BolgeDurumu, acik: ReadonlyMap<number, number>): Komut[] {
  const k: Komut[] = [];
  const yuva = ticaretEmirYuvasi(g.sim.ic, dugum);
  let kullanilan = dugum.ticaretEmirleri.length;
  const bolge = dugum.id;
  for (const e of dugum.ticaretEmirleri) {
    if (e.yon !== "ithalat") continue;
    if (!acik.has(e.mal)) k.push({ tur: "ticaret_emri", bolge, mal: g.bilgi.malId[e.mal] as string, yon: "ithalat", oranSaat: 0 });
  }
  for (const m of [...acik.keys()].sort((a, b) => a - b)) {
    if (g.bilgi.depolanamaz[m]) continue;
    const oran = Math.max(1, acik.get(m) as number);
    const mevcut = dugum.ticaretEmirleri.find((e) => e.yon === "ithalat" && e.mal === m);
    if (mevcut === undefined) {
      if (kullanilan >= yuva) continue;
      kullanilan++;
    } else if (mevcut.oranSaat === oran) continue;
    k.push({ tur: "ticaret_emri", bolge, mal: g.bilgi.malId[m] as string, yon: "ithalat", oranSaat: oran });
  }
  return k;
}

// ---------------------------------------------------------------------------
// İl ve ilçe seçimi
// ---------------------------------------------------------------------------

/** İlçe doluluğu: satılmış / uygun (çapraz çarpımla karşılaştırılır). */
function dahaBos(g: Gorunum, a: string, b: string): number {
  const ia = g.d.mulk!.ilceler.find((i) => i.id === a)!;
  const ib = g.d.mulk!.ilceler.find((i) => i.id === b)!;
  const x = ia.satilmisHucre * ib.uygunHucre;
  const y = ib.satilmisHucre * ia.uygunHucre;
  return x < y ? -1 : x > y ? 1 : dizgeSirala(a, b);
}

/** İlçede kaç farklı oyuncu hücre sahibi (kendisi hariç). */
function sahipSayisi(g: Gorunum, ilce: string): number {
  const s = new Set<string>();
  for (const h of g.d.mulk!.hucreler) if (h.ilce === ilce && h.sahip !== g.oyuncu) s.add(h.sahip);
  return s.size;
}

/** İlçenin yurt verebilecek kadar (yurt + pay tavanı) boş uygun hücresi var mı. */
function yurtVerebilir(g: Gorunum, ilceId: string): boolean {
  const durum = g.d.mulk!.ilceler.find((i) => i.id === ilceId);
  if (durum === undefined) return false;
  return durum.uygunHucre - durum.satilmisHucre >= g.mk.p.yeniOyuncu.yurtHucre;
}

/** İlin öncelik sınıfı (küçük = tercih): önayarın ilSirasi'na göre. */
function ilOnceligi(g: Gorunum, tanim: Tanim, il: string): number {
  const b = ilBolgesi(g, il);
  if (b === undefined) return 9;
  if (tanim.ilSirasi === "dag") return b.etiketler.includes("dag") ? 0 : 1;
  if (tanim.ilSirasi === "kiyi_ova") return b.etiketler.includes("kiyi") && b.etiketler.includes("ova") ? 0 : b.etiketler.includes("ova") ? 1 : 2;
  return b.etiketler.includes("ova") ? 0 : 1;
}

/** Açılış yapısını kurabilen ve yurt verebilen ilçeler, tercih sırasıyla: il önceliği, sonra (yerleşik arayan için çok sahipli, aksi halde boş), kimlik. */
function adayIlceler(g: Gorunum, tanim: Tanim): string[] {
  const ilceler = [...g.mk.ilceler.keys()].sort(dizgeSirala);
  const ilOf = (c: string): string => (g.mk.ilceler.get(c) as { il: string }).il;
  const uygun = ilceler.filter((c) => yurtVerebilir(g, c) && tanim.acilisTurleri.some((t) => ilIcinUygunMu(g, ilOf(c), t)));
  return uygun.sort(
    (a, b) =>
      ilOnceligi(g, tanim, ilOf(a)) - ilOnceligi(g, tanim, ilOf(b)) ||
      (tanim.yerlesikIlce ? sahipSayisi(g, b) - sahipSayisi(g, a) : 0) ||
      dahaBos(g, a, b),
  );
}

// ---------------------------------------------------------------------------
// Bot
// ---------------------------------------------------------------------------

class Bot implements ParselBotu {
  readonly acilis: GecAcilis | undefined;
  private readonly tanim: Tanim;

  constructor(
    readonly oyuncu: OyuncuId,
    readonly onayar: ParselOnayari,
    acilis: GecAcilis,
  ) {
    this.acilis = onayar === "gec_katilan" ? acilis : undefined;
    this.tanim = tanimSec(onayar, acilis);
  }

  katilimIlcesi(sim: Simulasyon): string | undefined {
    const g = gorunumKur(sim, this.oyuncu);
    return g === null ? undefined : adayIlceler(g, this.tanim)[0];
  }

  karar(sim: Simulasyon): Komut[] {
    const g = gorunumKur(sim, this.oyuncu);
    if (g === null) return [];
    if (!g.d.oyuncular.some((o) => o.id === this.oyuncu)) return [];
    const komutlar: Komut[] = [];
    const ilce = anaIlce(g);
    if (ilce === null) return komutlar; // yurt verilemedi: hücre yok, yapacak bir şey yok
    const il = (g.mk.ilceler.get(ilce) as { il: string }).il;
    const sayilar = yapiSayilari(g);
    const toplamYapi = [...sayilar.values()].reduce((t, x) => t + x, 0);

    // Kur-unut: ilk kurulumdan sonra hiçbir şey yapma (yapı ve emir varsa bitti).
    if (this.tanim.birKez && toplamYapi > 0) return [];

    const isl0 = isletmeBul(g.d, g.oyuncu, il);
    const dugum = isl0 === undefined ? undefined : g.d.bolgeler[isl0.bolgeIndeksi];
    const ekTurler: string[] = [];
    const acik = new Map<number, number>();

    // Yapı komutları: planda henüz karşılanmamış, bu ilde uygun türler sırasıyla; eşzamanlı inşaat sınırı dolana kadar. Aynı turda
    // verilen komutlar hazine, düğüm stoğu, hücre ve indirim sayacından düşülerek (sanal) hesaplanır.
    if (dugum !== undefined) {
      let hazine = anlikHazine(g.d, g.oyuncu);
      const kalanStok = new Map<number, number>();
      const stoku = (mi: number): number => kalanStok.get(mi) ?? stok(g, dugum, mi);
      const kullanilan = new Set<string>();
      const gorulen = new Map<string, number>();
      let bosYuva = g.mk.p.esZamanliInsaat - surenInsaat(g);
      let verilen = 0;
      for (const tur of this.tanim.plan) {
        const sira = (gorulen.get(tur) ?? 0) + 1;
        gorulen.set(tur, sira);
        if ((sayilar.get(tur) ?? 0) >= sira) continue;
        if (!ilIcinUygunMu(g, il, tur)) continue;
        const ei = g.mk.ekYapiIndeks.get(tur);
        if (ei !== undefined && (sayilar.get(tur) ?? 0) >= (g.mk.ekYapilar[ei] as { enFazlaIlBasina: number }).enFazlaIlBasina) continue;
        if (bosYuva <= 0) break;
        const m = yapiMaliyeti(g, tur, verilen);
        const y = m === null ? null : yerlesimBul(g, ilce, m.yuva, kullanilan);
        if (m === null || y === null) continue;
        const eksik = new Map<number, number>();
        for (const [mi, q] of m.mal) if (stoku(mi) < q) eksik.set(mi, q - stoku(mi));
        if (eksik.size > 0 || hazine < m.para + y.arsa) {
          // Bu yapı karşılanamıyor: sıradaki (ve ithalat için eksik malzeme) bu yapıya göre beklenir; sonraki yapılara geçilmez.
          for (const [mi, q] of eksik) acik.set(mi, q);
          break;
        }
        komutlar.push({ tur: "yapi_yerlestir", ilce, tesisTuru: tur, hucreler: y.hucreler, sinif: y.sinif });
        if (!g.mk.ekYapiIndeks.has(tur)) ekTurler.push(tur);
        for (const id of y.hucreler) kullanilan.add(id);
        for (const [mi, q] of m.mal) kalanStok.set(mi, stoku(mi) - q);
        hazine -= m.para + y.arsa;
        sayilar.set(tur, (sayilar.get(tur) ?? 0) + 1);
        bosYuva--;
        verilen++;
      }
    }

    // Ticaret emirleri (ihracat; sanayicide malzeme ithalatı). İşletme düğümü yalnız ilde bir kez açılmışsa mevcuttur.
    if (dugum !== undefined) {
      komutlar.push(...ihracatEmirleri(g, dugum, ekTurler));
      if (this.tanim.ithalat) komutlar.push(...ithalatEmirleri(g, dugum, acik));
    }
    return komutlar;
  }
}

/** Önayardan parsel botu üretir. Deterministiktir; `gec_katilan` için `acilis` verilebilir (vars. ciftci). */
export function parselBotuOlustur(onayar: ParselOnayari, oyuncu: OyuncuId, secenek: ParselBotSecenegi = {}): ParselBotu {
  return new Bot(oyuncu, onayar, secenek.acilis ?? "ciftci");
}
