/**
 * İlçe başına z20 arsa ızgarası üretim hattı (Gebze üretim yolunun ilçe parametresiyle genellenmiş hâli).
 *
 *   sınır : odbl/hiyerarsi.json'daki OSM ilişkisi -> KİLİTLİ ülke indirmesinden (.onbellek/osm/idari-<ülke>.json,
 *           sha256 `yapilandirma/osm-kaynak-ozetleri.json` ile doğrulanır) halkalar -> içerde maskesi
 *   karo  : Protomaps yapısından z15 bbox özütü (.onbellek/karolar/<kimlik>-z15.pmtiles, Gebze için gebze-z15; yoksa `pmtiles extract`)
 *   ızgara: izgaraUret (>= %50 yol/su, askeri kesişim; su hücreleri kota dışı) -> BHI1 (gzip -9) + şerit PMTiles
 * Girdiler sabit (yapı tarihi, kilitli sınır) ve hat tamsayı/sıralı olduğundan çıktı bayt bayt aynıdır.
 * Kamu kuralı çekirdektedir; bu hat yalnız uygunluk (yol/su/askeri) üretir.
 * Açık yerel sınır seçimi `yerelTopojsonHalkalari` ile okunup `sinir` seçeneğinden geçirilir; nicemlenmiş bu
 * girdi ham OSM ile aynı çıktı sayılmaz. CLI yerel üretimi ayrı hedef ve manifestte tutar.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { ONBELLEK } from "../yollar";
import { iliskiGeometrisi, type OsmIliski, type OsmVeri } from "./halka";
import { geojsonSeqYaz, ikiliKodla, sikistir } from "./izgara-cikti";
import { karoOzutle, tippecanoe } from "./izgara-arac";
import { YerelPmtiles } from "./izgara-pmtiles";
import { icerdeMaskesi, type Halka } from "./izgara-sinir";
import { izgaraIstatistigi, izgaraUret, type IzgaraIstatistigi } from "./izgara-uret";
import { VARSAYILAN_SECENEKLER } from "./izgara-uygunluk";
import { ODBL_DIZINI, OSM_KILIT_YOLU, OSM_ONBELLEK, HIYERARSI_DOSYASI } from "./ortak";

/** Sabitlenmiş Protomaps yapısı (docs/arastirma/karo-ve-izgara-denemesi.md §1). Yeni yapı bilinçli güncellemedir. */
export const KARO_YAPISI = "20260930";
export const KARO_KAYNAK_URL = `https://build.protomaps.com/${KARO_YAPISI}.pmtiles`;

/** Sprint 1'de elle özütlenen karo önbelleği adları (istemci derlemesi ve eski testler bu adı okur). */
const ESKI_KARO_ADI: Readonly<Record<string, string>> = { tr_41_gebze: "gebze" };

/** İlçenin karo özütü önbellek yolu. */
export const karoOnbellekYolu = (kimlik: string): string => resolve(ONBELLEK, "karolar", `${ESKI_KARO_ADI[kimlik] ?? kimlik}-z15.pmtiles`);

export interface IlceBilgisi {
  kimlik: string;
  ad: string;
  /** Ebeveyn il kimliği (ör. "tr_16"). */
  il: string;
  ulke: string;
  osmIliski: number;
}

/** hiyerarsi.json'dan ilçe kaydı (OSM ilişki kimliği, ülke). */
export function ilceBilgisi(kimlik: string): IlceBilgisi {
  const h = JSON.parse(readFileSync(resolve(ODBL_DIZINI, HIYERARSI_DOSYASI), "utf8")) as {
    bolgeler: { iller: { ulke: string; ilceler: { kimlik: string; ad: string; ebeveyn: string; osm: number }[] }[] }[];
  };
  for (const b of h.bolgeler)
    for (const il of b.iller)
      for (const c of il.ilceler)
        if (c.kimlik === kimlik) return { kimlik, ad: c.ad, il: c.ebeveyn, ulke: il.ulke, osmIliski: c.osm };
  throw new Error(`ilce hiyerarside yok: ${kimlik}`);
}

export interface SinirKaynagi {
  dosya: string;
  osmZamani: string;
  sha256: string;
}

/**
 * Kilitli ülke indirmesinden verilen ilişkilerin halkalarını (dış + iç; çift-tek dolgu) çıkarır.
 * Dosyanın sha256'sı kilitle uyuşmazsa DURUR (canlı Overpass'a düşülmez).
 */
export function idariHalkalar(ulke: string, osmIliskiler: readonly number[]): { halkalar: Map<number, Halka[]>; kaynak: SinirKaynagi } {
  const dosyaAdi = `idari-${ulke}.json`;
  const yol = resolve(OSM_ONBELLEK, dosyaAdi);
  if (!existsSync(yol)) throw new Error(`kilitli sinir indirmesi yok: ${yol} (pnpm harita:osm ile indirilir; ag gerekir)`);
  const kilit = (JSON.parse(readFileSync(OSM_KILIT_YOLU, "utf8")) as Record<string, { sha256: string; osmZamani: string }>)[ulke];
  if (!kilit) throw new Error(`osm-kaynak-ozetleri.json'da ${ulke} kilidi yok`);
  const ham = readFileSync(yol);
  const sha = createHash("sha256").update(ham).digest("hex");
  if (sha !== kilit.sha256) throw new Error(`${dosyaAdi} kilitle uyusmuyor (sha256 ${sha} != ${kilit.sha256}); hat durdu`);
  const j = JSON.parse(ham.toString("utf8")) as { elements: Record<string, unknown>[] };
  const hedef = new Set(osmIliskiler);
  const iliskiler = new Map<number, OsmIliski>();
  const yolKimlikleri = new Set<number>();
  for (const e of j.elements)
    if (e["type"] === "relation" && hedef.has(e["id"] as number)) {
      const r: OsmIliski = { id: e["id"] as number, tags: (e["tags"] as Record<string, string>) ?? {}, members: (e["members"] as OsmIliski["members"]) ?? [] };
      iliskiler.set(r.id, r);
      for (const u of r.members) if (u.type === "way") yolKimlikleri.add(u.ref);
    }
  const yollar = new Map<number, number[]>();
  const dugumKimlikleri = new Set<number>();
  for (const e of j.elements)
    if (e["type"] === "way" && yolKimlikleri.has(e["id"] as number)) {
      const n = e["nodes"] as number[];
      yollar.set(e["id"] as number, n);
      for (const d of n) dugumKimlikleri.add(d);
    }
  const dugumler = new Map<number, [number, number]>();
  for (const e of j.elements) if (e["type"] === "node" && dugumKimlikleri.has(e["id"] as number)) dugumler.set(e["id"] as number, [e["lon"] as number, e["lat"] as number]);
  const veri: OsmVeri = { dugumler, yollar, iliskiler };
  const halkalar = new Map<number, Halka[]>();
  for (const id of osmIliskiler) {
    const r = iliskiler.get(id);
    if (!r) throw new Error(`${dosyaAdi}: iliski yok r${id}`);
    const g = iliskiGeometrisi(r, veri);
    if (g.sorunlar.length > 0) throw new Error(`r${id} sinir sorunlari: ${g.sorunlar.join("; ")}`);
    halkalar.set(id, g.cokgenler.flatMap((c) => c) as Halka[]);
  }
  return { halkalar, kaynak: { dosya: dosyaAdi, osmZamani: kilit.osmZamani, sha256: sha } };
}

/** Halkaların [batı, güney, doğu, kuzey] sınırı (derece). */
export function halkaSiniri(halkalar: readonly Halka[]): [number, number, number, number] {
  let b = Infinity, g = Infinity, d = -Infinity, k = -Infinity;
  for (const h of halkalar)
    for (const [lon, lat] of h) {
      if (lon < b) b = lon;
      if (lon > d) d = lon;
      if (lat < g) g = lat;
      if (lat > k) k = lat;
    }
  return [b, g, d, k];
}

export interface IlceUretimi {
  bilgi: IlceBilgisi;
  bhiYol: string;
  bhiBayt: number;
  bhiHamBayt: number;
  bhiSha256: string;
  seritYol: string;
  seritBayt: number;
  seritSha256: string;
  cerceve: { x0: number; y0: number; genislik: number; yukseklik: number };
  istatistik: IzgaraIstatistigi;
  karo: { yapi: string; bbox: [number, number, number, number]; bayt: number; sha256: string; semaSurumu: string; osmZamani: string };
  eksikKaro: number;
  sinir: SinirKaynagi;
  sureMs: number;
}

const sha256Dosya = (yol: string): string => createHash("sha256").update(readFileSync(yol)).digest("hex");

export interface UretimSecenegi {
  /** Çıktı dizini (ara dosyalar dahil). Varsayılan .onbellek/izgara/<kimlik>. */
  hedef?: string;
  /** Karo özütü yolu. Varsayılan .onbellek/karolar/<kimlik>-z15.pmtiles; yoksa özütlenir. */
  karoYolu?: string;
  /** Daha önce okunmuş sınır. Yerel TopoJSON için `yerelTopojsonHalkalari` gerçek dosya SHA256'sıyla bu biçimi üretir. */
  sinir?: { halkalar: Halka[]; kaynak: SinirKaynagi };
}

/** Bir ilçenin ızgarasını üretir. Deterministik: aynı girdiyle bayt bayt aynı BHI1 ve şerit PMTiles. */
export function ilceIzgarasiUret(bilgi: IlceBilgisi, sec: UretimSecenegi = {}): IlceUretimi {
  const t0 = performance.now();
  const hedef = sec.hedef ?? resolve(ONBELLEK, "izgara", bilgi.kimlik);
  mkdirSync(hedef, { recursive: true });
  const sinir = sec.sinir ?? (() => {
    const s = idariHalkalar(bilgi.ulke, [bilgi.osmIliski]);
    return { halkalar: s.halkalar.get(bilgi.osmIliski)!, kaynak: s.kaynak };
  })();
  const bbox = halkaSiniri(sinir.halkalar).map((v) => Math.round(v * 1e7) / 1e7) as [number, number, number, number];
  const karoYolu = sec.karoYolu ?? karoOnbellekYolu(bilgi.kimlik);
  if (!existsSync(karoYolu)) {
    mkdirSync(resolve(karoYolu, ".."), { recursive: true });
    karoOzutle(KARO_KAYNAK_URL, karoYolu, bbox);
  }
  const maske = icerdeMaskesi(sinir.halkalar);
  const arsiv = new YerelPmtiles(karoYolu);
  const meta = arsiv.metaveri();
  const s = izgaraUret(arsiv, maske, VARSAYILAN_SECENEKLER);
  arsiv.kapat();
  const ham = ikiliKodla({ ...maske, durum: s.durum, binaYuzde: s.binaYuzde });
  const gz = sikistir(ham);
  const bhiYol = resolve(hedef, `${bilgi.kimlik}.bhi.gz`);
  writeFileSync(bhiYol, gz);
  const seq = resolve(hedef, `${bilgi.kimlik}-seritler.geojsonseq`);
  geojsonSeqYaz(seq, maske, s.durum, s.binaYuzde, "serit");
  const seritYol = resolve(hedef, `${bilgi.kimlik}-seritler.pmtiles`);
  if (!tippecanoe(seq, seritYol, "seritler")) throw new Error(`tippecanoe yok: ${bilgi.kimlik} serit katmani uretilemedi`);
  rmSync(seq, { force: true });
  return {
    bilgi,
    bhiYol,
    bhiBayt: gz.length,
    bhiHamBayt: ham.length,
    bhiSha256: createHash("sha256").update(gz).digest("hex"),
    seritYol,
    seritBayt: statSync(seritYol).size,
    seritSha256: sha256Dosya(seritYol),
    cerceve: { x0: maske.x0, y0: maske.y0, genislik: maske.genislik, yukseklik: maske.yukseklik },
    istatistik: izgaraIstatistigi(s.durum),
    karo: {
      yapi: KARO_YAPISI,
      bbox,
      bayt: statSync(karoYolu).size,
      sha256: sha256Dosya(karoYolu),
      semaSurumu: String(meta["version"] ?? ""),
      osmZamani: String(meta["planetiler:osm:osmosisreplicationtime"] ?? ""),
    },
    eksikKaro: s.eksikKaro,
    sinir: sinir.kaynak,
    sureMs: Math.round(performance.now() - t0),
  };
}
