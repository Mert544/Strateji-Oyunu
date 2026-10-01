/**
 * OSM idari sınır verisinin indirilmesi (Overpass API, ülke başına tek sorgu) ve önbellek/kilit yönetimi.
 *
 * - Önbellek: .onbellek/osm/idari-<ulke>.json (ham Overpass JSON yanıtı; git'e girmez).
 * - Kilit: yapilandirma/osm-kaynak-ozetleri.json (sha256 + bayt + OSM veri zamanı). Önbellekteki dosya kilitle
 *   uyuşmazsa hat DURUR. Overpass canlı veri döndürdüğü için yeniden indirme farklı bayt üretir; bilerek
 *   güncelleme: önbellek dosyası silinir, `pnpm harita:osm kilitle` yeniden indirir ve özeti kilitler.
 * - Overpass'a nazik: ülkeler sırayla, istekler arası bekleme, hız sınırı/meşgul yanıtlarında artan geri çekilme.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { OSM_KILIT_YOLU, OSM_ONBELLEK } from "./ortak";
import { overpassSorgusu, type OsmUlke, type OsmYapilandirma } from "./yapilandirma";

export interface OsmKaynakOzeti {
  sorgu: string;
  sha256: string;
  bayt: number;
  /** Overpass yanıtındaki osm3s.timestamp_osm_base (verinin OSM zamanı). */
  osmZamani: string;
}
export type OsmKaynakOzetleri = Record<string, OsmKaynakOzeti>;

const KULLANICI_AJANI = "BolgeStratejisi-veri-hatti/0.1 (+https://github.com; OSM idari sinir ozutu, ulke basina tek sorgu)";

export function osmOnbellekYolu(u: OsmUlke): string {
  return resolve(OSM_ONBELLEK, `idari-${u.kod}.json`);
}

export function osmKilitleriOku(): OsmKaynakOzetleri {
  if (!existsSync(OSM_KILIT_YOLU)) return {};
  return JSON.parse(readFileSync(OSM_KILIT_YOLU, "utf8")) as OsmKaynakOzetleri;
}

function sha256(veri: Uint8Array): string {
  return createHash("sha256").update(veri).digest("hex");
}

async function proxyKur(): Promise<void> {
  const vekil = process.env["HTTPS_PROXY"] ?? process.env["https_proxy"];
  if (vekil === undefined || vekil === "") return;
  const { ProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new ProxyAgent({ uri: vekil, bodyTimeout: 1_800_000, headersTimeout: 1_800_000 }));
}

const bekle = (ms: number): Promise<void> => new Promise((r) => setTimeout(r, ms));

/** Yanıtın tam ve hatasız bir Overpass JSON'u olduğunu doğrular; osm3s zamanını döndürür. */
export function overpassYanitiDogrula(metin: string): string {
  if (!metin.startsWith("{")) throw new Error(`Overpass JSON degil: ${metin.slice(0, 300).replace(/\s+/g, " ")}`);
  const j = JSON.parse(metin) as { osm3s?: { timestamp_osm_base?: string }; elements?: unknown[]; remark?: string };
  if (j.remark !== undefined) throw new Error(`Overpass yaniti eksik (remark): ${j.remark}`);
  if (!Array.isArray(j.elements) || j.elements.length === 0) throw new Error("Overpass yaniti bos");
  return j.osm3s?.timestamp_osm_base ?? "bilinmiyor";
}

/** Overpass HTML hata sayfasından okunur hata satırını çıkarır. */
function overpassHataMetni(metin: string): string {
  const m = /Error<\/strong>:([^<]*)/.exec(metin);
  return (m?.[1] ?? metin.slice(0, 300)).replace(/\s+/g, " ").trim();
}

async function overpassIndir(yap: OsmYapilandirma, u: OsmUlke, gunluk: (m: string) => void): Promise<void> {
  const sorgu = overpassSorgusu(u);
  let sonHata: unknown;
  for (let deneme = 0; deneme < 8; deneme++) {
    const uc = yap.overpassUclari[deneme % yap.overpassUclari.length] as string;
    if (deneme > 0) {
      const ms = Math.min(240_000, 20_000 * 2 ** (deneme - 1));
      gunluk(`    yeniden deneme ${deneme} (${Math.round(ms / 1000)} sn sonra): ${String(sonHata).slice(0, 200)}`);
      await bekle(ms);
    }
    try {
      gunluk(`  indiriliyor: ${u.ad} (${uc})`);
      const yanit = await fetch(uc, {
        method: "POST",
        headers: { "User-Agent": KULLANICI_AJANI, "Content-Type": "application/x-www-form-urlencoded" },
        body: `data=${encodeURIComponent(sorgu)}`,
      });
      const tampon = new Uint8Array(await yanit.arrayBuffer());
      const metin = Buffer.from(tampon).toString("utf8");
      if (!yanit.ok) throw new Error(`HTTP ${yanit.status}: ${overpassHataMetni(metin)}`);
      overpassYanitiDogrula(metin);
      mkdirSync(OSM_ONBELLEK, { recursive: true });
      const gecici = `${osmOnbellekYolu(u)}.indiriliyor`;
      writeFileSync(gecici, tampon);
      renameSync(gecici, osmOnbellekYolu(u));
      gunluk(`  ${u.ad}: ${(tampon.byteLength / 1e6).toFixed(1)} MB`);
      return;
    } catch (e) {
      sonHata = e;
    }
  }
  throw new Error(`Overpass indirmesi basarisiz (${u.ad}): ${String(sonHata)}`);
}

/** Önbellek dosyasının başından OSM veri zamanını okur (tüm dosyayı ayrıştırmadan). */
export function osmZamaniOku(veri: Uint8Array): string {
  const bas = Buffer.from(veri.subarray(0, 4096)).toString("utf8");
  return /"timestamp_osm_base":\s*"([^"]+)"/.exec(bas)?.[1] ?? "bilinmiyor";
}

export interface OsmIndirmeSecenegi {
  kilitle?: boolean;
  /** Yalnızca bu ülke kodları (boşsa yapılandırmadaki tümü). */
  ulkeler?: readonly string[];
  gunluk?: (m: string) => void;
}

/** Ülke verilerini hazırlar (gerekirse indirir), kilitle doğrular; özet tablosunu döndürür. */
export async function osmKaynaklariniHazirla(yap: OsmYapilandirma, secenek: OsmIndirmeSecenegi = {}): Promise<OsmKaynakOzetleri> {
  const gunluk = secenek.gunluk ?? ((): void => undefined);
  const kilit = osmKilitleriOku();
  const sonuc: OsmKaynakOzetleri = {};
  const secili = yap.ulkeler.filter((u) => secenek.ulkeler === undefined || secenek.ulkeler.length === 0 || secenek.ulkeler.includes(u.kod));
  let ilk = true;
  for (const u of secili) {
    if (!existsSync(osmOnbellekYolu(u))) {
      if (!ilk) await bekle(15_000); // Overpass'a nazik: sorgular arası bekleme
      await proxyKur();
      await overpassIndir(yap, u, gunluk);
      ilk = false;
    }
    const veri = readFileSync(osmOnbellekYolu(u));
    const osmZamani = osmZamaniOku(veri);
    const ozet: OsmKaynakOzeti = { sorgu: overpassSorgusu(u), sha256: sha256(veri), bayt: veri.byteLength, osmZamani };
    const beklenen = kilit[u.kod];
    if (secenek.kilitle !== true && beklenen !== undefined && beklenen.sha256 !== ozet.sha256) {
      throw new Error(
        `OSM kaynak ozeti kilitle uyusmuyor: ${u.kod}\n beklenen ${beklenen.sha256} (${beklenen.osmZamani})\n bulunan  ${ozet.sha256} (${osmZamani})\n` +
          `Kaynak bilerek guncellendiyse: pnpm harita:osm kilitle`,
      );
    }
    sonuc[u.kod] = ozet;
  }
  const yeni = { ...kilit, ...sonuc };
  const sirali: OsmKaynakOzetleri = {};
  for (const k of Object.keys(yeni).sort()) sirali[k] = yeni[k] as OsmKaynakOzeti;
  if (secenek.kilitle === true || secili.some((u) => kilit[u.kod] === undefined)) {
    writeFileSync(OSM_KILIT_YOLU, `${JSON.stringify(sirali, null, 2)}\n`, "utf8");
    gunluk(`  OSM kaynak ozetleri kilitlendi: ${OSM_KILIT_YOLU}`);
  }
  return sonuc;
}
