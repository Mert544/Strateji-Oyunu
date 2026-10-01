/**
 * İl imza ve ürün pencere verisini diskten yükleme (Node). Şema ve doğrulama il-imza.ts'dedir.
 * Not: node:fs kullanır; tarayıcı paketine girmez (orada `@bolge/veri/saf` ile il-imza.ts kullanılır).
 */
import { readFileSync } from "node:fs";
import { ilImzaPaketiniAyristir, type IlImzaDosyasi, type UrunPencereDosyasi } from "./il-imza";

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

export interface IlImzaVerisi {
  ilImza: IlImzaDosyasi;
  urunPencere: UrunPencereDosyasi;
}

/**
 * icerik/il-imza.json ve icerik/urun-pencere.json dosyalarını okur; haritalar/odbl/hiyerarsi.json (il/ilçe kimlikleri)
 * ve icerik/icerik.json (mal kimlikleri) ile çapraz doğrular. Geçersizse ayrıntılı hata fırlatır. Her çağrıda yeni kopya döner.
 * Çekirdek bu veriyi (henüz) kullanmaz; icerik.json'a ve parametrelere dokunmaz.
 */
export function ilImzaVerisiniYukle(): IlImzaVerisi {
  const icerik = jsonOku("icerik/icerik.json") as { mallar?: Array<{ id?: unknown }> };
  const malKimlikleri = (icerik.mallar ?? []).map((m) => m.id).filter((x): x is string => typeof x === "string");
  return ilImzaPaketiniAyristir({
    ilImza: jsonOku("icerik/il-imza.json"),
    urunPencere: jsonOku("icerik/urun-pencere.json"),
    hiyerarsi: jsonOku("haritalar/odbl/hiyerarsi.json"),
    malKimlikleri,
  });
}
