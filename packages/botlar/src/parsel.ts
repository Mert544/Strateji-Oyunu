/**
 * Parsel botları (mülk kipi; docs/06 §15, docs/olcum/h1-h9-parsel-tanimlari.md): çiftçi, sanayici, tüccar, geç katılan, pasif,
 * tarım yönetimli çiftçi ve spekülatör.
 *
 * Bölge kipi botlarından (arketipler.ts) AYRIDIR: yalnız mülk komutlarıyla oynar ve yalnız parsel kipinde (`sim.ic.mulk`) çalışır.
 * Komut kümesi: `oyuncu_katil {ilce}` (koşucu, `katilimIlcesi`), `yapi_yerlestir` (arsa + yapı atomik), `ticaret_emri`.
 * Deterministiktir: rastgelelik yoktur; hücre ve ilçe seçimi tamamen durumdan ve kimlik sırasından türer (aynı dünya → aynı komutlar).
 * Botlar durumsuzdur: her `karar` çağrısı yalnızca `sim`i okur (kendi geçmişini tutmaz); "yapıldı mı" sorusu dünyadan çözülür.
 *
 * Önayarlar (hepsi yeni oyuncu paketini kullanır: yurt, %30 indirimli ilk 5 yapı, 14 gün kalkan):
 *  - ciftci:     ova ilinde Çiftlik → Ahır → Çiftlik (ova ili doluysa dağ ilinde Mera); fazla tahıl/gıda/gübreyi ihraç eder.
 *  - sanayici:   dağ ilinde Hidro santral → Cevher madeni (×2) → Ambar; cevheri ihraç eder, malzeme açığını ithal eder.
 *  - tuccar:     kıyı/ova ilinde üretim (Çiftlik/Mera) + Ticaret ofisi; ihracat emri yuvalarını (4 + ofis) doldurur.
 *  - pasif:      kur-unut: ilk kurulumu bir kez yapar (tek yapı + emirler), sonra hiçbir komut vermez.
 *  - ciftci_tarim: çiftçi + tarım yönetimi (`ekim_plani`, `gubre_dozu`); `tarimYonetimi` / `bakimYonetimi` seçenekleri her önayara eklenebilir.
 *  - spekulator: arsa biriktirir, üretmez; kit stoğunu satıp nakde çevirir, en ucuz sınıf ve en boş ilçelerden tavana (72 / ilçenin %25'i)
 *    dayanana kadar `parsel_al`; kamu arsasını almaz; yeni oyuncuyken ayrılmış hücreleri önce tüketir; `baslangicGun` ile yaşlanınca başlar.
 *  - gec_katilan: `acilis` ∈ ciftci | sanayici | pazar (tuccar); aynı paket, farklı açılış (Ar-Ge `gec_ciftci/gec_sanayici/gec_pazar`).
 *    Yerleşiklerin bulunduğu (en çok sahipli) ilçeye katılır: ilçe medyanı ile karşılaştırılabilsin.
 */
import { GUN, anlikHazine, anlikMiktar, isletmeBul, kamuHucreMi, mulkOyuncuBul, parselToplamFiyatiMili, ticaretEmirYuvasi, yurtPlanla } from "@bolge/cekirdek";
import type { ArsaSinifi, BolgeDurumu, DerlenmisMulk, Dunya, HucreDurumu, IlceDurumu, Komut, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { icerikBilgisi } from "./tablo";
import type { IcerikBilgisi } from "./tablo";

export type ParselOnayari = "ciftci" | "sanayici" | "tuccar" | "gec_katilan" | "pasif" | "ciftci_tarim" | "spekulator";
export const PARSEL_ONAYARLARI: readonly ParselOnayari[] = ["ciftci", "sanayici", "tuccar", "gec_katilan", "pasif", "ciftci_tarim", "spekulator"];

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
  /**
   * Açık ilçe kararı (yalnız `ilceSec` açık botlarda: geç katılan, ya da `ilceSec` seçeneği): ilçe + nedeni ya da "uygun ilçe yok"
   * (`ilce: null`). Koşucu `ilce: null` ise oyuncuyu KATMAZ ve ayrı sayaca ("uygun ilçe yok") yazar; çekirdeğin yedek ilçe seçimine
   * bırakmaz. Tanımsızsa bot eski davranışı (`katilimIlcesi` + çekirdek yedeği) kullanır.
   */
  readonly ilceKarari?: (sim: Simulasyon) => IlceSecimi;
  /** O anki dünya durumuna göre komut listesi; durum değiştirmez. */
  karar(sim: Simulasyon): Komut[];
}

export interface ParselBotSecenegi {
  /** `gec_katilan` için açılış (vars. "ciftci"). */
  acilis?: GecAcilis;
  /**
   * Tarım yönetimi: tarım tesisi olan bot `ekim_plani` (toprağa göre buğday/baklagil/nadas; histerezisli nöbet) ve `gubre_dozu`
   * (gübre stoğuna göre) ile toprağı yönetir; toprak taban altına inmez. `ciftci_tarim` önayarında hep açık; `pasif` (kur-unut) ve
   * `spekulator` için etkisiz. Vars. kapalı.
   */
  tarimYonetimi?: boolean;
  /**
   * Bakım yönetimi: tesislerin bakım parçası (yöntemin `bakim` girdisi) için parça ithalatı ve aşınma eşiği aşılınca `genel_onarim`.
   * Etkisiz: `pasif`, `spekulator`. Vars. kapalı. (Kural: stok < 24 saatlik bakım ihtiyacıysa 72 saatliğe tamamlanır.)
   */
  bakimYonetimi?: boolean;
  /**
   * İlçeyi `ilceSec` ile seç (yurt verebilen + açılışa uygun; bkz. `ilceSec`). `gec_katilan` için vars. AÇIK; diğer önayarlarda vars. kapalı
   * (eski davranış: önayarın ilçe sıralaması, olmazsa çekirdeğin yedeği). Açıkken "uygun ilçe yok" ise oyuncu katılmaz.
   */
  ilceSec?: boolean;
  /** `spekulator`: arsa alımına başlama yaşı (gün; katılımdan itibaren). Vars. 0. 15 ⇒ ayrılmış hücre süresi (14 gün) bittikten sonra. */
  baslangicGun?: number;
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

// Ova ili dolunca (kalabalık dünya) dağ ilinde Mera kurar: plandaki uygun olmayan türler atlanır, yani ova ilinde davranış değişmez.
const CIFTCI: Tanim = { acilisTurleri: ["ciftlik", "mera"], plan: ["ciftlik", "mera", "ahir", "ciftlik", "mera"], ilSirasi: "ova", birKez: false, ithalat: false, yerlesikIlce: false };
const SANAYICI: Tanim = { acilisTurleri: ["hidro_santrali"], plan: ["hidro_santrali", "cevher_madeni", "cevher_madeni", "ambar"], ilSirasi: "dag", birKez: false, ithalat: true, yerlesikIlce: false };
const TUCCAR: Tanim = { acilisTurleri: ["ciftlik", "mera"], plan: ["ciftlik", "mera", "ticaret_ofisi", "ahir"], ilSirasi: "kiyi_ova", birKez: false, ithalat: false, yerlesikIlce: false };
const SPEKULATOR: Tanim = { acilisTurleri: [], plan: [], ilSirasi: "ova", birKez: false, ithalat: false, yerlesikIlce: false };
const PASIF: Tanim = { acilisTurleri: ["ciftlik", "mera"], plan: ["ciftlik", "mera"], ilSirasi: "ova", birKez: true, ithalat: false, yerlesikIlce: false };

function tanimSec(onayar: ParselOnayari, acilis: GecAcilis): Tanim {
  switch (onayar) {
    case "ciftci":
    case "ciftci_tarim":
      return CIFTCI;
    case "spekulator":
      return SPEKULATOR;
    case "sanayici":
      return SANAYICI;
    case "tuccar":
      return TUCCAR;
    case "pasif":
      return PASIF;
    case "gec_katilan": {
      const t = acilis === "sanayici" ? SANAYICI : acilis === "pazar" ? TUCCAR : CIFTCI;
      return { ...t, acilisTurleri: ACILIS_ESLEMESI[acilis].ilkYapiTurleri, ilSirasi: ACILIS_ESLEMESI[acilis].ilTercihi, yerlesikIlce: true };
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
 * Oyuncunun kalan AYRILMIŞ hücre kotası (docs/06 §15.7): hesap başına tavan (`yeniOyuncu.ayrilmisHucreHesapTavani`) − sahip olduğu ayrılmış
 * hücre (yurt dahil). Tavan tanımsızsa sınırsız (Infinity).
 */
function ayrilmisKota(g: Gorunum): number {
  const tavan = g.mk.p.yeniOyuncu.ayrilmisHucreHesapTavani;
  if (tavan === undefined) return Infinity;
  return Math.max(0, tavan - (mulkOyuncuBul(g.d, g.oyuncu)?.ayrilmisHucre ?? 0));
}

/**
 * İlçede BU hesabın bugün ayrılmış hücre alabileceği en çok adet (docs/06 §15.1, P3b çok hesap kuralları): (1) ayrılmış hücre yalnız hesabın
 * KATILIM ilçesinde satılır (`MulkOyuncuDurumu.katilimIlcesi`; kural `ayrilmisYalnizKatilimIlcesi` ile açıksa; katılım ilçesi yoksa 0);
 * (2) ilçe başına GÜNLÜK ayrılmış satış tavanı: max(`ayrilmisIlceGunlukEnAz`, ilçenin ayrılmış stoku × `ayrilmisIlceGunlukPpm`), sayaç
 * `IlceDurumu.ayrilmisGunluk {gun, adet}`, gün = floor(zaman / GUN). Kurallar parametrede kapalıysa sınırsız (Infinity).
 */
function ayrilmisIlceKalan(g: Gorunum, durum: IlceDurumu): number {
  const yo = g.mk.p.yeniOyuncu;
  if (yo.ayrilmisYalnizKatilimIlcesi === true && mulkOyuncuBul(g.d, g.oyuncu)?.katilimIlcesi !== durum.id) return 0;
  const ppm = yo.ayrilmisIlceGunlukPpm;
  if (ppm === undefined) return Infinity;
  const tavan = Math.max(yo.ayrilmisIlceGunlukEnAz ?? 0, Math.floor(((g.mk.ayrilmisIlceSayisi.get(durum.id) ?? 0) * ppm) / 1_000_000));
  const bugun = durum.ayrilmisGunluk !== undefined && durum.ayrilmisGunluk.gun === Math.floor(g.d.zaman / GUN) ? durum.ayrilmisGunluk.adet : 0;
  return Math.max(0, tavan - bugun);
}

/**
 * `parsel_al` / `yapi_yerlestir` arsa bedeli tahmini: ÇEKİRDEĞİN dışa aktardığı tek kaynak `parselToplamFiyatiMili` (docs/06 §15.7): AYRILMIŞ hücre
 * taban (sınıf) fiyatından, kıtlık eğrisinden muaf; normal hücreler artımlı (eğri `satilmisHucre − ayrilmisSatilmis`).
 */
function arsaFiyati(g: Gorunum, durum: IlceDurumu, sinif: ArsaSinifi, ayrilmisAdet: number, normalAdet: number): number {
  return parselToplamFiyatiMili(g.sim.ic, durum, sinif, normalAdet, ayrilmisAdet);
}

/**
 * Arsa bedeli tahmini (public; testler komutun gerçek hazine farkıyla eşitliği denetler): `ayrilmisAdet` AYRILMIŞ hücre taban fiyattan,
 * `normalAdet` normal hücre artımlı; çekirdeğin `parselToplamFiyatiMili` yardımcısına devreder (yerel kopya yok).
 */
export function parselArsaFiyati(sim: Simulasyon, ilce: string, sinif: ArsaSinifi, ayrilmisAdet: number, normalAdet: number): number {
  const g = gorunumKur(sim, "aday");
  const durum = g?.d.mulk?.ilceler.find((i) => i.id === ilce);
  if (g === null || durum === undefined) throw new Error(`parselArsaFiyati: mulk kipi kapali ya da bilinmeyen ilce: ${ilce}`);
  return arsaFiyati(g, durum, sinif, ayrilmisAdet, normalAdet);
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
  // Bu turda önceki komutlarla alınacak ayrılmış hücreler de hesap kotasından düşer.
  // Ayrılmış hücre yalnız katılım ilçesinde ve günlük ilçe tavanı içinde alınabilir (`ayrilmisIlceKalan`); gerisi normal hücreden.
  const kota = Math.min(ayrilmisKota(g), ayrilmisIlceKalan(g, durum)) - [...kullanilan].filter((id) => !g.sahipli.has(id) && g.mk.ayrilmis.has(id)).length;
  const tavan = Math.min(p.ilceHucreTavani, Math.floor((durum.uygunHucre * p.ilcePayTavaniPpm) / 1_000_000));

  const tanim = new Map(ilce.hucreler.map((h) => [h.id, h]));
  type Durum = "benim" | "alinabilir" | "dolu";
  const durumu = (id: string): Durum => {
    const f = tanim.get(id);
    // Kamu arsası (mahalle paketi, ilçe merkezi, kıyı, hazine rezervi; docs/06 §15.6) satılmaz: dolu sayılır.
    if (f === undefined || !f.uygun || kullanilan.has(id) || kamuHucreMi(g.d, ilceId, id)) return "dolu";
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
      const yeniAyrilmis = yeniler.filter((id) => g.mk.ayrilmis.has(id)).length;
      if (yeniAyrilmis > kota) continue; // hesap başına ayrılmış hücre tavanı (yurt dahil)
      const sinif: ArsaSinifi = siniflar.size === 1 ? ([...siniflar][0] as ArsaSinifi) : (tanim.get(grup[0] as string) as { sinif: ArsaSinifi }).sinif;
      const arsa = yeniler.length === 0 ? 0 : arsaFiyati(g, durum, sinif, yeniAyrilmis, yeniler.length - yeniAyrilmis);
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
function netCikti(g: Gorunum, ekTurler: readonly string[], gubreAyir = 0): Map<number, number> {
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
  // Tarım yönetimi: gübre ihraç edilmez, çiftlikte kalır (stok birikir, doz stoğa göre ayarlanır). Sınırsız ayırma = tümü.
  if (gubreAyir !== 0 && g.bilgi.gubre >= 0) net.set(g.bilgi.gubre, 0); // 0 ⇒ var olan gübre ihracat emri silinir
  return net;
}

/**
 * İhracat emirleri: net çıktısı pozitif, depolanabilir her mal için net oranda ihracat (iç tüketim payı düşülür; böylece emir
 * kendi girdisini boşaltmaz). Yuva doluysa yeni mal eklenmez; net ≤ 0 olan eski emir silinir. Var olan emir aynıysa komut verilmez.
 */
function ihracatEmirleri(g: Gorunum, dugum: BolgeDurumu, ekTurler: readonly string[], gubreAyir = 0): Komut[] {
  const net = netCikti(g, ekTurler, gubreAyir);
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

/** İlçede, üzerinde yapı (biten ya da süren inşaat) olan hücresi bulunan farklı oyuncu sayısı (kendisi hariç): ÜRETEN emsal adayları. */
function ureticiSahipSayisi(g: Gorunum, ilce: string): number {
  const s = new Set<string>();
  for (const h of g.d.mulk!.hucreler) if (h.ilce === ilce && h.sahip !== g.oyuncu && (h.tesis !== undefined || h.insaat !== undefined)) s.add(h.sahip);
  return s.size;
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
// Tarım yönetimi (ekim planı ve gübre dozu)
// ---------------------------------------------------------------------------

/** Ekim planı şablonları (buğday / baklagil / nadas; toplam PPM). Bölge kipi planlayıcısıyla (planlayici.ts) aynı değerler. */
const EKIM_A: readonly number[] = [1_000_000, 0, 0]; // monokültür: en yüksek çıktı, toprağı tüketir
const EKIM_B: readonly number[] = [500_000, 250_000, 250_000]; // ekim nöbeti: toprağı korur
const EKIM_C: readonly number[] = [200_000, 300_000, 500_000]; // toparlanma: toprağı yeniler

function ayniPlan(a: readonly number[], b: readonly number[]): boolean {
  return a.length === b.length && a.every((x, i) => x === b[i]);
}

/** Toprağa ve mevcut plana göre hedef ekim planı (histerezisli, deterministik; gübre dozu azamiyse monokültür sürdürülebilir). */
export function hedefEkimPlani(toprakPpm: number, mevcut: readonly number[], gubreli: boolean): readonly number[] {
  if (gubreli) return EKIM_A;
  const cNde = ayniPlan(mevcut, EKIM_C);
  const aDa = ayniPlan(mevcut, EKIM_A);
  if (toprakPpm < 500_000) return EKIM_C;
  if (toprakPpm < 700_000) return cNde && toprakPpm < 650_000 ? EKIM_C : EKIM_B;
  if (toprakPpm < 900_000) return aDa ? EKIM_A : EKIM_B;
  return EKIM_A;
}

/** Tarım tesisi (ekili, aktif, rezervli tarımsal yöntem) sayısı. */
function ekiliCiftlikSayisi(g: Gorunum, dugum: BolgeDurumu): number {
  let n = 0;
  for (const t of dugum.tesisler) {
    const y = g.sim.ic.yontemler[t.yontem];
    if (t.aktif && y !== undefined && y.tarimsal === true && y.rezerv !== undefined) n++;
  }
  return n;
}

/** Gübre dozu: düğümdeki gübre stoğunun 48 saatlik tüketimi karşıladığı en yüksek doz (0..azami). */
function gubreDozuHedefi(g: Gorunum, dugum: BolgeDurumu, ciftlik: number): number {
  const tp = g.sim.ic.param.tarim;
  if (tp === undefined || g.bilgi.gubre < 0 || ciftlik === 0) return 0;
  const ihtiyacSaat = tp.gubreTuketimiSaat * ciftlik;
  if (ihtiyacSaat <= 0) return 0;
  return Math.max(0, Math.min(tp.azamiGubreDozu, Math.floor(stok(g, dugum, g.bilgi.gubre) / (ihtiyacSaat * 48))));
}

/** Toprak yönetimi komutları; `gubreAyir` ≠ 0 ise gübre ihraç edilmez (gübre dozu için stokta tutulur). */
function tarimKomutlari(g: Gorunum, dugum: BolgeDurumu): { komutlar: Komut[]; gubreAyir: number } {
  const tp = g.sim.ic.param.tarim;
  const ts = dugum.tarim;
  const urunler = g.sim.ic.icerik.tarimUrunleri ?? [];
  if (tp === undefined || ts === undefined || urunler.length !== 3) return { komutlar: [], gubreAyir: 1 };
  const ciftlik = ekiliCiftlikSayisi(g, dugum);
  if (ciftlik === 0) return { komutlar: [], gubreAyir: 1 };
  const komutlar: Komut[] = [];
  let doz = gubreDozuHedefi(g, dugum, ciftlik);
  // Histerezis: mevcut doz hâlâ en az 24 saatlik gübre stoğuyla karşılanıyorsa düşürülmez (her turda doz salınımı olmasın).
  if (ts.gubreDozu > doz && stok(g, dugum, g.bilgi.gubre) >= ts.gubreDozu * tp.gubreTuketimiSaat * ciftlik * 24) doz = ts.gubreDozu;
  const hedef = hedefEkimPlani(ts.toprakPpm, ts.ekimPpm, doz >= tp.azamiGubreDozu && tp.azamiGubreDozu > 0);
  if (!ayniPlan(hedef, ts.ekimPpm)) komutlar.push({ tur: "ekim_plani", bolge: dugum.id, ekimPpm: [...hedef] });
  if (doz !== ts.gubreDozu) komutlar.push({ tur: "gubre_dozu", bolge: dugum.id, doz });
  return { komutlar, gubreAyir: 1 };
}

// ---------------------------------------------------------------------------
// Bakım yönetimi (parça ithalatı + genel onarım)
// ---------------------------------------------------------------------------

/** Genel onarım eşiği: herhangi bir tesisin aşınması bu değeri (ppm) geçince. */
const ONARIM_ESIGI_PPM = 400_000;
const GENEL_ONARIM_MALIYET_PPM = 200_000;

/**
 * Bakım komutları: (a) tesislerin saatlik bakım malı (yöntem `bakim`) için stok 24 saatin altındaysa 72 saate tamamlayan açık
 * (`acik`: ithalat emriyle kapatılır); (b) aşınma eşiği aşıldıysa ve onarım maliyeti (inşa maliyetinin %20'si) karşılanıyorsa `genel_onarim`
 * (karşılanmıyorsa eksik malzeme `acik`a eklenir).
 */
function bakimKomutlari(g: Gorunum, dugum: BolgeDurumu): { komutlar: Komut[]; acik: Map<number, number> } {
  const komutlar: Komut[] = [];
  const acik = new Map<number, number>();
  const saatlik = new Map<number, number>();
  for (const t of dugum.tesisler) {
    for (const [m, q] of g.bilgi.yontem[t.yontem]?.bakim ?? []) saatlik.set(m, (saatlik.get(m) ?? 0) + q);
  }
  for (const [m, q] of saatlik) {
    const elde = stok(g, dugum, m);
    if (elde < q * 24) acik.set(m, q * 72 - elde);
  }
  let hizmetVar = false;
  for (const i of g.d.insaatlar) if (i.tur === "onarim" && i.bolge === dugum.indeks) hizmetVar = true;
  const asinan = dugum.tesisler.filter((t) => (t.asinmaPpm ?? 0) >= ONARIM_ESIGI_PPM);
  if (asinan.length > 0 && !hizmetVar) {
    const onarilacak = dugum.tesisler.filter((t) => (t.asinmaPpm ?? 0) > 0);
    const mal = new Map<number, number>();
    let para = 0;
    for (const t of onarilacak) {
      const tur = g.bilgi.tur[t.tur];
      if (tur === undefined) continue;
      // Ölçek kademesi (S = 1,0x) varsayılır: botlar ölçek yükseltmez.
      para += Math.floor((tur.para * GENEL_ONARIM_MALIYET_PPM) / 1_000_000);
      for (const [m, q] of tur.maliyet) mal.set(m, (mal.get(m) ?? 0) + Math.floor((q * GENEL_ONARIM_MALIYET_PPM) / 1_000_000));
    }
    let yeter = anlikHazine(g.d, g.oyuncu) >= para;
    for (const [m, q] of mal) {
      if (stok(g, dugum, m) < q) {
        yeter = false;
        acik.set(m, Math.max(acik.get(m) ?? 0, q - stok(g, dugum, m)));
      }
    }
    if (yeter) komutlar.push({ tur: "genel_onarim", bolge: dugum.id });
  }
  return { komutlar, acik };
}

// ---------------------------------------------------------------------------
// Spekülatör: arsa biriktirir, üretmez
// ---------------------------------------------------------------------------

/** Spekülatörün bir ilçedeki alım adayı. */
interface SpekAday {
  ilce: string;
  sinif: ArsaSinifi;
  /** Satın alınabilir AYRILMIŞ hücreler (yalnız yeni oyuncuda dolu; hesap kotasına kadar alınır), fikstür sırasıyla. */
  ayrilmis: string[];
  /** Satın alınabilir normal hücreler, fikstür sırasıyla. */
  normal: string[];
  /** İlçede alınabilecek en çok hücre (72 ve %25 tavanı, ilçe doluluğu). */
  oda: number;
  /** Bu hesabın bugün bu ilçede alabileceği en çok ayrılmış hücre (katılım ilçesi + günlük tavan). */
  ayrilmisKalan: number;
  /** Kıtlık eğrisine giren (normal) satılmış hücre: `satilmisHucre − ayrilmisSatilmis`. */
  satilmis: number;
  uygun: number;
  durum: IlceDurumu;
}

const SINIF_SIRASI: readonly ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];

function spekAdaylari(g: Gorunum, yeniOyuncu: boolean): SpekAday[] {
  const p = g.mk.p;
  const sonuc: SpekAday[] = [];
  for (const durum of g.d.mulk!.ilceler) {
    const tanim = g.mk.ilceler.get(durum.id);
    if (tanim === undefined) continue;
    const benim = ilceHucreleri(g, durum.id).length;
    const tavan = Math.min(p.ilceHucreTavani, Math.floor((durum.uygunHucre * p.ilcePayTavaniPpm) / 1_000_000));
    const oda = Math.min(tavan - benim, durum.uygunHucre - durum.satilmisHucre);
    if (oda <= 0) continue;
    // En ucuz sınıf (kırsal < kasaba < şehir) ve o sınıftan alınabilir hücreler.
    let secilen: ArsaSinifi | null = null;
    let adaylar: string[] = [];
    for (const sinif of SINIF_SIRASI) {
      const l = tanim.hucreler.filter((h) => h.uygun && h.sinif === sinif && !g.sahipli.has(h.id) && !kamuHucreMi(g.d, durum.id, h.id) && (yeniOyuncu || !g.mk.ayrilmis.has(h.id))).map((h) => h.id);
      if (l.length > 0) {
        secilen = sinif;
        adaylar = l;
        break;
      }
    }
    if (secilen === null) continue;
    // Yeni oyuncu ayrılmış hücreleri hesap kotasına kadar önce alır (yalnız yeni oyuncuya açık olanı tüketir; taban fiyat), kalanı normal hücreden.
    sonuc.push({
      ilce: durum.id,
      sinif: secilen,
      ayrilmis: yeniOyuncu ? adaylar.filter((id) => g.mk.ayrilmis.has(id)) : [],
      normal: adaylar.filter((id) => !g.mk.ayrilmis.has(id)),
      oda,
      ayrilmisKalan: ayrilmisIlceKalan(g, durum),
      satilmis: durum.satilmisHucre - (durum.ayrilmisSatilmis ?? 0),
      uygun: durum.uygunHucre,
      durum,
    });
  }
  // Ucuz sınıf, boş ilçe (düşük fiyat çarpanı), kimlik sırası.
  return sonuc.sort((a, b) => {
    const sa = SINIF_SIRASI.indexOf(a.sinif);
    const sb = SINIF_SIRASI.indexOf(b.sinif);
    const x = a.satilmis * b.uygun;
    const y = b.satilmis * a.uygun;
    return sa - sb || (x < y ? -1 : x > y ? 1 : 0) || dizgeSirala(a.ilce, b.ilce);
  });
}

// ---------------------------------------------------------------------------
// Açılış eşlemesi ve ilçe seçimi (`ilceSec`)
// ---------------------------------------------------------------------------

/**
 * Geç katılan açılışı -> açılışın İLK yapısını kurabilen il koşulu (VERİ: tek kaynak; `tanimSec` de buradan okur).
 * `ilkYapiTurleri`: bunlardan en az biri ilde kurulabilmeli (etiket + rezerv; `ilIcinUygunMu`); `ekYapilar`: ek yapı türleri mülk
 * parametrelerinde tanımlı olmalı (il koşulu yoktur). `ilTercihi`: uygun ilçeler arasında il etiketi önceliği (ova / dağ / kıyı+ova).
 */
export const ACILIS_ESLEMESI: Readonly<Record<GecAcilis, { ilkYapiTurleri: readonly string[]; ekYapilar: readonly string[]; ilTercihi: "ova" | "dag" | "kiyi_ova" }>> = {
  ciftci: { ilkYapiTurleri: ["ciftlik", "mera"], ekYapilar: [], ilTercihi: "ova" },
  sanayici: { ilkYapiTurleri: ["hidro_santrali"], ekYapilar: [], ilTercihi: "dag" },
  pazar: { ilkYapiTurleri: ["ciftlik", "mera"], ekYapilar: ["ticaret_ofisi"], ilTercihi: "kiyi_ova" },
};

/**
 * Açılışın AYAK İZİ: açılışın ilk yapı türlerinin (`ilkYapiTurleri`) en küçük hücre sayısı (tür yuvası; docs/12 §13: ayak izi ölçekle
 * büyür, çekirdekte S = tür yuvası). YURT HÜCRELERİ HARİÇ: yurt ayrı ve ücretsiz verilir. Ölçüm (H6 açılış koşulu) için saf okuma.
 */
export function acilisAyakIzi(sim: Simulasyon, acilis: GecAcilis): number {
  const mk = sim.ic.mulk;
  if (mk === undefined) throw new Error("acilisAyakIzi: mulk kipi kapali");
  let en = Infinity;
  for (const t of ACILIS_ESLEMESI[acilis].ilkYapiTurleri) {
    const ti = sim.ic.tesisTuruIndeks[t];
    const y = ti === undefined ? 0 : (mk.yuva[ti] as number);
    if (y > 0 && y < en) en = y;
  }
  if (!Number.isFinite(en)) throw new Error(`acilisAyakIzi: ${acilis} acilisinin ilk yapi turlerinden hicbiri insa edilebilir degil`);
  return en;
}

/**
 * İlçedeki satılmamış AYRILMIŞ (taban fiyatlı) hücre sayısı: fikstürde uygun, ayrılmış ve sahipsiz hücreler (saf okuma). Ölçüm koşucusu
 * (katılım anı sayımı) ve `ilceSec` sıralaması AYNI işlevi kullanır.
 */
export function ilceAyrilmisBos(sim: Simulasyon, ilce: string): number {
  const mk = sim.ic.mulk;
  const m = sim.dunya.mulk;
  if (mk === undefined || m === undefined) return 0;
  const tanim = mk.ilceler.get(ilce);
  if (tanim === undefined) return 0;
  const sahipli = new Set(m.hucreler.filter((h) => h.ilce === ilce).map((h) => h.id));
  let n = 0;
  for (const h of tanim.hucreler) if (h.uygun && mk.ayrilmis.has(h.id) && !sahipli.has(h.id)) n++;
  return n;
}

export interface IlceSecimi {
  /** Seçilen ilçe; hiçbiri uygun değilse null ("uygun ilçe yok"). */
  ilce: string | null;
  /** Karar nedeni (başarıda seçim özeti, başarısızlıkta hangi aşamada elendiği). */
  neden: string;
  /** a) yurt verebilen ilçe sayısı. */
  yurtVerebilen: number;
  /** b) bunlardan açılışa uygun olanların sayısı. */
  acilisaUygun: number;
}

export interface IlceSecimSecenegi {
  /** Aday ilçeleri değerlendirilen oyuncu (yalnız il/işletme bağlamı için; katılmamış olabilir). Vars. "aday". */
  oyuncu?: OyuncuId;
  /**
   * Sıralama: "doluluk" (vars.): il tercihi, en düşük doluluk, kimlik. "emsal": il tercihi, EN ÇOK ÜRETEN diğer sahibi (üzerinde yapı olan
   * hücresi bulunan; Y7 emsali ölçülebilsin), sonra en çok diğer sahip, doluluk, kimlik. Geç katılan botu "emsal" kullanır.
   */
  siralama?: "doluluk" | "emsal";
}

/**
 * Saf ve deterministik ilçe seçimi (çekirdeği yalnız okur; dünyayı değiştirmez). Aşamalar:
 *  a) YURT VEREBİLEN ilçeler: çekirdeğin herkese açık `yurtPlanla(dunya, ic, ilce)` yardımcısı (kamu dışı, uygun, sahipsiz, kenar-bitişik
 *     yeterli hücre; %25 ilçe payı; ayrılmış hücre kuralından muaf) — kendi kopyamız YOKTUR, çekirdekle birebir aynı kural.
 *  b) AÇILIŞA UYGUN ilçeler: `ACILIS_ESLEMESI` (açılışın ilk yapısı ilin etiket ve rezervine uyar; ek yapılar tanımlı).
 *  c) Sıralama: ÖNCE ayrılmış boş hücresi açılış ayak izine yeten ilçeler (`ilceAyrilmisBos ≥ acilisAyakIzi`), sonra il tercihi (açılışın ova/dağ/kıyı önceliği), (emsal seçeneğinde) çok sahipli, en düşük doluluk, kimlik sırası.
 *  d) a ∩ b boşsa `ilce: null` ve nedeni (hangi aşamada elendiği): "uygun ilçe yok".
 */
export function ilceSec(sim: Simulasyon, acilis: GecAcilis, secenek: IlceSecimSecenegi = {}): IlceSecimi {
  const g = gorunumKur(sim, secenek.oyuncu ?? "aday");
  if (g === null) return { ilce: null, neden: "mulk kipi kapali", yurtVerebilen: 0, acilisaUygun: 0 };
  const e = ACILIS_ESLEMESI[acilis];
  const tanim: Tanim = { ...CIFTCI, acilisTurleri: e.ilkYapiTurleri, ilSirasi: e.ilTercihi };
  const ilOf = (c: string): string => (g.mk.ilceler.get(c) as { il: string }).il;
  const yurtVerebilir = [...g.mk.ilceler.keys()].sort(dizgeSirala).filter((c) => {
    const plan = yurtPlanla(g.d, sim.ic, c);
    return plan === null || typeof plan !== "string"; // null: yurt kuralı kapalı (yurtHucre 0): her ilçe uygun
  });
  const ekTamam = e.ekYapilar.every((t) => g.mk.ekYapiIndeks.has(t));
  const uygun = ekTamam ? yurtVerebilir.filter((c) => e.ilkYapiTurleri.some((t) => ilIcinUygunMu(g, ilOf(c), t))) : [];
  if (uygun.length === 0) {
    const neden = yurtVerebilir.length === 0
      ? "yurt verebilen ilce yok (ilceler dolu / bitisik bos alan yok)"
      : !ekTamam
        ? `acilis ek yapisi tanimli degil: ${e.ekYapilar.join(",")}`
        : `yurt verebilen ${yurtVerebilir.length} ilcenin hicbirinde acilisin ilk yapisi (${e.ilkYapiTurleri.join("|")}) kurulamaz`;
    return { ilce: null, neden, yurtVerebilen: yurtVerebilir.length, acilisaUygun: 0 };
  }
  const emsal = secenek.siralama === "emsal";
  // 0) ÖNCE: ayrılmış boş hücresi açılış ayak izine yeten ilçeler (gerçek oyuncunun Yerleş ekranı da aynı ölçütle öneri verir; H6 açılış koşulu (i)).
  const ayakIzi = acilisAyakIzi(sim, acilis);
  const tabanYeter = (c: string): number => (ilceAyrilmisBos(sim, c) >= ayakIzi ? 0 : 1);
  const sirali = [...uygun].sort(
    (a, b) => tabanYeter(a) - tabanYeter(b) || ilOnceligi(g, tanim, ilOf(a)) - ilOnceligi(g, tanim, ilOf(b)) || (emsal ? ureticiSahipSayisi(g, b) - ureticiSahipSayisi(g, a) || sahipSayisi(g, b) - sahipSayisi(g, a) : 0) || dahaBos(g, a, b),
  );
  const yeterli = uygun.filter((c) => tabanYeter(c) === 0).length;
  return { ilce: sirali[0] as string, neden: `yurt verebilen ${yurtVerebilir.length}, acilisa uygun ${uygun.length}, taban hucre ayak izine yeten ${yeterli}; once taban hucre, ${emsal ? "il tercihi, emsal, doluluk" : "il tercihi, doluluk"} sirasiyla`, yurtVerebilen: yurtVerebilir.length, acilisaUygun: uygun.length };
}

// ---------------------------------------------------------------------------
// Bot
// ---------------------------------------------------------------------------

class Bot implements ParselBotu {
  readonly acilis: GecAcilis | undefined;
  private readonly tanim: Tanim;
  private readonly tarim: boolean;
  private readonly bakim: boolean;
  private readonly baslangicMs: number;
  /** Açık ilçe kararı (`ilceSec`) kullanılıyor mu. */
  private readonly ilceSecAcik: boolean;
  readonly ilceKarari?: (sim: Simulasyon) => IlceSecimi;

  constructor(
    readonly oyuncu: OyuncuId,
    readonly onayar: ParselOnayari,
    acilis: GecAcilis,
    secenek: ParselBotSecenegi,
  ) {
    this.acilis = onayar === "gec_katilan" ? acilis : undefined;
    this.tanim = tanimSec(onayar, acilis);
    this.tarim = onayar === "ciftci_tarim" || (secenek.tarimYonetimi === true && onayar !== "pasif" && onayar !== "spekulator");
    this.ilceSecAcik = secenek.ilceSec ?? onayar === "gec_katilan";
    if (this.ilceSecAcik && onayar !== "spekulator") {
      const acilisAnahtari: GecAcilis = onayar === "gec_katilan" ? acilis : onayar === "sanayici" ? "sanayici" : onayar === "tuccar" ? "pazar" : "ciftci";
      this.ilceKarari = (sim: Simulasyon): IlceSecimi => ilceSec(sim, acilisAnahtari, { oyuncu, siralama: onayar === "gec_katilan" ? "emsal" : "doluluk" });
    }
    this.bakim = secenek.bakimYonetimi === true && onayar !== "pasif" && onayar !== "spekulator";
    const gun = secenek.baslangicGun ?? 0;
    if (!Number.isSafeInteger(gun) || gun < 0) throw new Error(`parsel bot: baslangicGun negatif olmayan tamsayi olmali: ${String(secenek.baslangicGun)}`);
    this.baslangicMs = gun * 86_400_000;
  }

  katilimIlcesi(sim: Simulasyon): string | undefined {
    const g = gorunumKur(sim, this.oyuncu);
    if (g === null) return undefined;
    if (this.onayar === "spekulator") {
      // Yurt verebilen, en çok boş uygun hücreli ilçe (alım odası geniş); eşitlikte kimlik sırası.
      const bos = (c: string): number => {
        const d = g.d.mulk!.ilceler.find((i) => i.id === c)!;
        return d.uygunHucre - d.satilmisHucre;
      };
      return [...g.mk.ilceler.keys()].sort(dizgeSirala).filter((c) => yurtVerebilir(g, c)).sort((a, b) => bos(b) - bos(a) || dizgeSirala(a, b))[0];
    }
    if (this.ilceKarari !== undefined) return this.ilceKarari(sim).ilce ?? undefined;
    return adayIlceler(g, this.tanim)[0];
  }

  /** Spekülatör: kit stoğunu satıp nakde çevirir; yaşı `baslangicGun`'ü geçince ilçe tavanlarına dayanana kadar arsa alır. */
  private spekulatorKarar(g: Gorunum): Komut[] {
    const komutlar: Komut[] = [];
    const katilma = g.d.oyuncular.find((o) => o.id === this.oyuncu)?.katilmaZamani ?? 0;
    const yas = g.d.zaman - katilma;
    const yeniOyuncu = yas < g.mk.ayrilmisSureMs;
    // 1. Kit satışı: işletme düğümündeki gıda/çelik/parça için 24 saatlik ihracat emri (üretmez, sadece nakde çevirir).
    const ilce = anaIlce(g);
    if (ilce !== null) {
      const dugum = ilBolgesi(g, (g.mk.ilceler.get(ilce) as { il: string }).il);
      const isl = dugum === undefined ? undefined : isletmeBul(g.d, g.oyuncu, (g.mk.ilceler.get(ilce) as { il: string }).il);
      const b = isl === undefined ? undefined : g.d.bolgeler[isl.bolgeIndeksi];
      if (b !== undefined) {
        const yuva = ticaretEmirYuvasi(g.sim.ic, b);
        let kullanilan = b.ticaretEmirleri.length;
        for (const id of ["gida", "celik", "parca"]) {
          const mi = g.sim.ic.malIndeks[id];
          if (mi === undefined) continue;
          const q = stok(g, b, mi);
          const mevcut = b.ticaretEmirleri.find((e) => e.yon === "ihracat" && e.mal === mi);
          if (q <= 0 || mevcut !== undefined || kullanilan >= yuva) continue;
          kullanilan++;
          komutlar.push({ tur: "ticaret_emri", bolge: b.id, mal: id, yon: "ihracat", oranSaat: Math.max(1, Math.ceil(q / 24)) });
        }
      }
    }
    // 2. Arsa: en ucuz sınıf ve en boş ilçelerden başlayıp tavana (72 / %25) dayanana kadar; hazinenin %5'i vergi tamponu.
    if (yas >= this.baslangicMs) {
      let hazine = Math.floor((anlikHazine(g.d, g.oyuncu) * 95) / 100);
      let komut = 0;
      let kota = ayrilmisKota(g);
      for (const a of spekAdaylari(g, yeniOyuncu)) {
        if (komut >= 3) break;
        // Liste: önce ayrılmış hücreler (hesap kotası, katılım ilçesi ve günlük ilçe tavanı içinde), kalanı normal hücreden.
        const ayrilmisAlinabilir = a.ayrilmis.slice(0, Math.min(a.ayrilmis.length, kota, a.ayrilmisKalan));
        const sira = [...ayrilmisAlinabilir, ...a.normal];
        let n = Math.min(a.oda, sira.length);
        const fiyat = (adet: number): number => {
          const r = Math.min(adet, ayrilmisAlinabilir.length);
          return arsaFiyati(g, a.durum, a.sinif, r, adet - r);
        };
        while (n > 0 && fiyat(n) > hazine) n--;
        if (n <= 0) continue;
        hazine -= fiyat(n);
        kota -= Math.min(n, ayrilmisAlinabilir.length);
        komutlar.push({ tur: "parsel_al", ilce: a.ilce, hucreler: sira.slice(0, n), sinif: a.sinif });
        komut++;
      }
    }
    return komutlar;
  }

  karar(sim: Simulasyon): Komut[] {
    const g = gorunumKur(sim, this.oyuncu);
    if (g === null) return [];
    if (!g.d.oyuncular.some((o) => o.id === this.oyuncu)) return [];
    if (this.onayar === "spekulator") return this.spekulatorKarar(g);
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
      const tarim = this.tarim ? tarimKomutlari(g, dugum) : { komutlar: [] as Komut[], gubreAyir: 0 };
      komutlar.push(...tarim.komutlar);
      const bakim = this.bakim ? bakimKomutlari(g, dugum) : { komutlar: [] as Komut[], acik: new Map<number, number>() };
      komutlar.push(...bakim.komutlar);
      komutlar.push(...ihracatEmirleri(g, dugum, ekTurler, tarim.gubreAyir));
      if (this.tanim.ithalat || this.bakim) {
        // Yapı malzemesi açığı ile bakım açığı birleştirilir (aynı mal için büyük olan).
        const birlesik = new Map(acik);
        for (const [m, q] of bakim.acik) birlesik.set(m, Math.max(birlesik.get(m) ?? 0, q));
        komutlar.push(...ithalatEmirleri(g, dugum, birlesik));
      }
    }
    return komutlar;
  }
}

/** Önayardan parsel botu üretir. Deterministiktir; `gec_katilan` için `acilis` verilebilir (vars. ciftci). */
export function parselBotuOlustur(onayar: ParselOnayari, oyuncu: OyuncuId, secenek: ParselBotSecenegi = {}): ParselBotu {
  return new Bot(oyuncu, onayar, secenek.acilis ?? "ciftci", secenek);
}
