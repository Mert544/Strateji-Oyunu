/**
 * OSM (ODbL) alt hattının ortak sabitleri ve küçük yardımcıları.
 *
 * Bu dosya osm/ altındaki diğer modüllerin (il/ilçe hiyerarşisi, hücre ızgarası) paylaştığı tek yerdir:
 * dizin yolları, atıf satırı, ASCII kimlik üretimi ve mikro derece dönüşümü. Hepsi deterministiktir.
 */
import { resolve } from "node:path";
import { HARITA_DIZINI, ONBELLEK, YAPILANDIRMA_DIZINI } from "../yollar";

/** ODbL lisanslı türetilmiş çıktıların klasörü (diğer çıktılardan ayrı tutulur; bkz. DATA_SOURCES.md). */
export const ODBL_DIZINI = resolve(HARITA_DIZINI, "odbl");
/** İl başına ilçe TopoJSON dosyaları. */
export const ILCE_DIZINI = resolve(ODBL_DIZINI, "ilceler");
export const ILLER_DOSYASI = "iller.topo.json";
export const HIYERARSI_DOSYASI = "hiyerarsi.json";
/** Ham OSM indirmeleri (git'e girmez). */
export const OSM_ONBELLEK = resolve(ONBELLEK, "osm");
/** OSM alt hattının elle yazılan yapılandırması ve kaynak özet kilidi. */
export const OSM_YAPILANDIRMA_YOLU = resolve(YAPILANDIRMA_DIZINI, "osm-idari.json");
export const OSM_KILIT_YOLU = resolve(YAPILANDIRMA_DIZINI, "osm-kaynak-ozetleri.json");

export const ODBL_LISANSI = "ODbL-1.0";
export const OSM_ATIF = "© OpenStreetMap katkıcıları";
export const OSM_ATIF_UZUN =
  "© OpenStreetMap katkıcıları — veriler Open Database License (ODbL) 1.0 altındadır: https://www.openstreetmap.org/copyright";

/** Kimlik biçimi (veri paketindeki KIMLIK_BICIMI ile aynı). */
export const KIMLIK_BICIMI = /^[a-z][a-z0-9_]*$/;

/** Kiril (Bulgarca, "streamlined system") ve Yunanca (ELOT 743 sadeleştirilmiş) harf çevirisi. */
const CEVIRI: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh",
  щ: "sht", ъ: "a", ь: "y", ю: "yu", я: "ya", ѝ: "i", ё: "yo", ы: "y", э: "e", ј: "j", љ: "lj", њ: "nj",
  ћ: "c", ђ: "dj", џ: "dz", ѓ: "gj", ќ: "kj", ѕ: "dz",
  α: "a", β: "v", γ: "g", δ: "d", ε: "e", ζ: "z", η: "i", θ: "th", ι: "i", κ: "k", λ: "l", μ: "m",
  ν: "n", ξ: "x", ο: "o", π: "p", ρ: "r", σ: "s", ς: "s", τ: "t", υ: "y", φ: "f", χ: "ch", ψ: "ps", ω: "o",
  ά: "a", έ: "e", ή: "i", ί: "i", ό: "o", ύ: "y", ώ: "o", ϊ: "i", ϋ: "y", ΐ: "i", ΰ: "y",
  ı: "i", ğ: "g", ş: "s", ç: "c", ö: "o", ü: "u", â: "a", î: "i", û: "u", ș: "s", ț: "t", ţ: "t",
  ă: "a", đ: "d", ß: "ss", æ: "ae", ø: "o", ł: "l",
};

/** Herhangi bir adı Latin harflere çevirir (büyük/küçük harf korunmaz; yalnızca küçük harf döner). */
export function latinlestir(ad: string): string {
  // Yunanca çift harfler (ELOT 743): ου -> ou, αυ -> av, ευ -> ev, ηυ -> iv
  const kucuk = ad
    .toLocaleLowerCase("tr")
    .replace(/ο[υύ]/g, "ou")
    .replace(/ό[υ]/g, "ou")
    .replace(/[αά][υύ]/g, "av")
    .replace(/[εέ][υύ]/g, "ev")
    .replace(/[ηή][υύ]/g, "iv");
  let s = "";
  for (const h of kucuk) s += CEVIRI[h] ?? h;
  // Kalan aksanları ayır (é -> e)
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

/** Addan ASCII kimlik parçası: "Kadıköy" -> "kadikoy", "Βόρειο Αιγαίο" -> "voreio_aigaio". */
export function asciiKimlik(ad: string): string {
  const s = latinlestir(ad)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
  return s === "" ? "x" : s;
}

/** Baş harfi büyük Latin yazımı (Kiril/Yunanca adlar için okunur karşılık). */
export function latinAd(ad: string): string {
  return latinlestir(ad).replace(/(^|[\s\-(])(\p{L})/gu, (_m, a: string, b: string) => a + b.toLocaleUpperCase("en"));
}

/** Derece -> tamsayı mikro derece. */
export function mikro(derece: number): number {
  return Math.round(derece * 1_000_000);
}

/** Kod noktası sırasıyla karşılaştırma (yerel ayardan bağımsız, deterministik). */
export function sirala(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}
