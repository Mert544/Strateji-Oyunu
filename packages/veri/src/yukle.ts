/**
 * Veri dosyalarını diskten yükleme (Node). Doğrulama ve türetme dogrula.ts'dedir.
 * Not: node:fs kullanır; tarayıcı paketine girmez — orada `@bolge/veri/saf` kullanılır.
 */
import { readFileSync } from "node:fs";
import {
  MINI_HARITA_SECENEKLERI,
  dogrulaVeriPaketi,
  limanlariTamamla,
  tarimAlanlariniTamamla,
  type HaritaSecenekleri,
  type VeriPaketi,
} from "./dogrula";
import { dogrulaKimlikKilidi } from "./kimlik-listesi";
import { dogrulaPerakende } from "./perakende-dogrula";

// ---------------------------------------------------------------------------
// Yükleme
// ---------------------------------------------------------------------------

function jsonOku(goreliYol: string): unknown {
  const url = new URL(`../${goreliYol}`, import.meta.url);
  let metin: string;
  try {
    metin = readFileSync(url, "utf8");
  } catch (e) {
    throw new Error(`Veri dosyasi okunamadi (${goreliYol}): ${e instanceof Error ? e.message : String(e)}`);
  }
  try {
    return JSON.parse(metin) as unknown;
  } catch (e) {
    throw new Error(`Veri dosyasi gecerli JSON degil (${goreliYol}): ${e instanceof Error ? e.message : String(e)}`);
  }
}

let sonUyarilar: string[] = [];

/** Son yüklenen paketin doğrulama UYARILARI (hata değil; `dogrulaPerakende`). */
export function veriUyarilari(): readonly string[] {
  return sonUyarilar;
}

function paketYukle(haritaDosyasi: string, secenek: HaritaSecenekleri): VeriPaketi {
  const paket = {
    harita: jsonOku(haritaDosyasi),
    icerik: jsonOku("icerik/icerik.json"),
    param: jsonOku("icerik/parametreler.json"),
    kimlikListesi: jsonOku("icerik/kimlik-listesi.json"),
  } as VeriPaketi;
  // Çapraz kontroller yapısal olarak geçerli veri ister; önce tek tek, sonra paket.
  const sonucu = dogrulaVeriPaketi(paket, secenek);
  if (!sonucu.gecerli) {
    throw new Error(`Veri paketi gecersiz (${haritaDosyasi}):\n - ${sonucu.hatalar.join("\n - ")}`);
  }
  // Mal ve yapı kimlik kilidi (docs/06 §15.8): yalnız Node yükleyicilerinde (tarayıcı paketine girmez).
  const kilit = dogrulaKimlikKilidi(paket);
  if (!kilit.gecerli) {
    throw new Error(`Veri paketi gecersiz (${haritaDosyasi}):\n - ${kilit.hatalar.join("\n - ")}`);
  }
  // Ek semantik kurallar (sartname §4.5 Katman 2; yalnız Node): hata paketi reddeder, uyarılar `veriUyarilari()` ile okunur ve BOLGE_VERI_UYARI=1 iken stderr'e yazılır
  // (varsayılan sessizdir: yükleyici test ve ölçümlerde binlerce kez çağrılır; A0 çıkmaz mal uyarıları bugünkü veride bilinen ve tutarlıdır).
  const ek = dogrulaPerakende(paket);
  if (!ek.gecerli) {
    throw new Error(`Veri paketi gecersiz (${haritaDosyasi}):\n - ${ek.hatalar.join("\n - ")}`);
  }
  sonUyarilar = ek.uyarilar;
  if (process.env["BOLGE_VERI_UYARI"] === "1") for (const u of ek.uyarilar) console.warn(`[veri uyarisi] ${u}`);
  // Tarım açıksa ve harita tarım alanı taşımıyorsa (ör. gerçek harita) etiket/konumdan varsayılan türet.
  tarimAlanlariniTamamla(paket);
  // Pazar v1 açıksa liman tanımı olmayan liman bölgelerine (ör. gerçek harita) dünya kapısı ve mesafe türet.
  limanlariTamamla(paket);
  return paket;
}

/**
 * haritalar/sentetik-50.json, icerik/icerik.json ve icerik/parametreler.json dosyalarını
 * okur, doğrular ve döndürür. Geçersizse ayrıntılı hata fırlatır. Her çağrıda yeni kopya döner.
 */
export function varsayilanVeriyiYukle(): VeriPaketi {
  return paketYukle("haritalar/sentetik-50.json", {});
}

/**
 * Birim testleri için küçük harita: haritalar/mini-6.json + aynı içerik ve parametreler.
 * Doğrulama MINI_HARITA_SECENEKLERI ile yapılır.
 */
export function miniVeriyiYukle(): VeriPaketi {
  return paketYukle("haritalar/mini-6.json", MINI_HARITA_SECENEKLERI);
}

/**
 * Gerçek dünya haritası: haritalar/<ad>.json (packages/veri-hatti çıktısı; varsayılan "gercek-karadeniz") +
 * varsayılan içerik ve parametreler. Doğrulama varsayılan aralıklarla yapılır (dogrulaVeriPaketi).
 * Haritada `sinirDosyasi` varsa dosya okunur ve her bölgenin sınır geometrisi (TopoJSON "bolgeler"
 * nesnesi, `properties.id`) bulunmalıdır; yoksa ayrıntılı hata fırlatır. Her çağrıda yeni kopya döner.
 */
export function gercekVeriyiYukle(ad = "gercek-karadeniz"): VeriPaketi {
  if (!/^[a-z0-9][a-z0-9-]*$/.test(ad)) throw new Error(`Gecersiz gercek harita adi: "${ad}"`);
  const paket = paketYukle(`haritalar/${ad}.json`, {});
  const sinirDosyasi = paket.harita.sinirDosyasi;
  if (sinirDosyasi !== undefined) {
    const topo = jsonOku(`haritalar/${sinirDosyasi}`) as { objects?: { bolgeler?: { geometries?: Array<{ properties?: { id?: string } }> } } };
    const geometriler = topo.objects?.bolgeler?.geometries;
    if (geometriler === undefined) throw new Error(`Sinir dosyasinda "bolgeler" nesnesi yok (${sinirDosyasi})`);
    const kimlikler = new Set(geometriler.map((g) => g.properties?.id));
    const eksik = paket.harita.bolgeler.filter((b) => !kimlikler.has(b.id)).map((b) => b.id);
    if (eksik.length > 0) throw new Error(`Sinir dosyasinda geometrisi olmayan bolgeler (${sinirDosyasi}): ${eksik.join(", ")}`);
  }
  return paket;
}
