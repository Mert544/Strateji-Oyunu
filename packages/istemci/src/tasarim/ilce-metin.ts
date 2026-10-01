/**
 * İlçe sözlüğü (Tasarım; veri kaynağı T3 `ilce-metin.json`): Yerleş ekranındaki ilçe kartı için "bilinen yanı", neden ve açılış
 * önerisi metinleri. YALNIZ harita/yerleş yığınından içe aktarılır (kabuğa girmez; dunya.html bütçesi). Sade Türkçe, "sen" kipi,
 * büyük harf yalnız cümle başında. Dükkân düzeyi: G6 (dükkân yok) `neden`; G7 açıkken `nedenG7`; G8 açıkken açılışta `acilisG8`.
 */
import { fmt, fmt1 } from "../arayuz/bicim";

export type AcilisOnerisi = "tarim" | "sanayi" | "pazar";
/** Dükkân düzeyi: G7 (dükkân açık), G8 (cam ve pencere açık). G8 açıkken G7 de açıktır. */
export interface DukkanDuzeyi {
  g7?: boolean;
  g8?: boolean;
}
export interface IlceMetni {
  ad: string;
  /** İlçenin bilinen yanı (ör. "Otomotiv"); yoksa null (satır gösterilmez). */
  bilinenYani: string | null;
  neden: string;
  nedenG7: string;
  oneri: AcilisOnerisi;
}

export const ILCE_ORTAK: Readonly<{ acilis: Readonly<Record<AcilisOnerisi, string>>; acilisG7: Readonly<Partial<Record<AcilisOnerisi, string>>>; acilisG8: Readonly<Partial<Record<AcilisOnerisi, string>>> }> = {
  acilis: {
    tarim: "Çiftlikle başla: tahıl yetiştir; unun ve ekmeğin ham maddesi senden çıksın.",
    sanayi: "Çiftlikle başla; sonra parça fabrikası kur, çelikten makine parçası üret.",
    pazar: "Çiftlikle başla; sonra gıda fabrikasında tahılı una, unu ekmeğe çevir.",
  },
  acilisG7: {
    pazar: "Çiftlikle başla; sonra gıda fabrikasında un ve ekmek yap, dükkânında sat.",
  },
  acilisG8: {
    sanayi: "Çiftlikle başla; sonra parça fabrikasında makine parçası, cam ve pencere yap.",
  },
};

export const ILCE_METIN: Readonly<Record<string, IlceMetni>> = {
  tr_41_basiskele: { ad: "Başiskele", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_41_cayirova: { ad: "Çayırova", bilinenYani: "Otomotiv", neden: "Otomotiviyle bilinir, kalabalık; çiftlikten sonra parça fabrikası yakışır.", nedenG7: "Otomotiviyle bilinir, kalabalık; çiftlikten sonra parça fabrikası yakışır.", oneri: "sanayi" },
  tr_41_darica: { ad: "Darıca", bilinenYani: null, neden: "Çok kalabalık; güçlü pazar.", nedenG7: "Çok kalabalık; dükkân için güçlü pazar.", oneri: "pazar" },
  tr_41_derince: { ad: "Derince", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_41_dilovasi: { ad: "Dilovası", bilinenYani: null, neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_41_gebze: { ad: "Gebze", bilinenYani: "Gebze bayram çöreği", neden: "Kocaeli'nin en kalabalık ilçesi; sanayi iş bulur.", nedenG7: "Kocaeli'nin en kalabalık ilçesi; sanayi de dükkân da iş bulur.", oneri: "sanayi" },
  tr_41_golcuk: { ad: "Gölcük", bilinenYani: "Otomotiv", neden: "Otomotiviyle bilinir, kalabalık; çiftlikten sonra parça fabrikası yakışır.", nedenG7: "Otomotiviyle bilinir, kalabalık; çiftlikten sonra parça fabrikası yakışır.", oneri: "sanayi" },
  tr_41_izmit: { ad: "İzmit", bilinenYani: "Otomotiv, karton", neden: "Otomotiv ve kartonuyla bilinen il merkezi; üretim iş bulur.", nedenG7: "Otomotiv ve kartonuyla bilinen il merkezi; üretim de dükkân da iş bulur.", oneri: "sanayi" },
  tr_41_kandira: { ad: "Kandıra", bilinenYani: "Manda yoğurdu, karpuz", neden: "Süt ve karpuzuyla bilinir; ahır ve çiftlikle başlarsın.", nedenG7: "Süt ve karpuzuyla bilinir; ahır ve çiftlikle başlarsın.", oneri: "tarim" },
  tr_41_karamursel: { ad: "Karamürsel", bilinenYani: "Karamürsel sepeti", neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_41_kartepe: { ad: "Kartepe", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_41_korfez: { ad: "Körfez", bilinenYani: "Rafineri, petrokimya", neden: "Rafineri ve petrokimyasıyla bilinir; çiftlikten sonra sanayi yakışır.", nedenG7: "Rafineri ve petrokimyasıyla bilinir; çiftlikten sonra sanayi yakışır.", oneri: "sanayi" },
  tr_54_adapazari: { ad: "Adapazarı", bilinenYani: "Otomotiv, mısır", neden: "Sakarya'nın kalabalık merkezi; güçlü pazar.", nedenG7: "Sakarya'nın kalabalık merkezi; dükkân için güçlü pazar.", oneri: "pazar" },
  tr_54_akyazi: { ad: "Akyazı", bilinenYani: "Fındık", neden: "Fındığıyla bilinir, kalabalık; çiftlikten sonra un ve ekmek.", nedenG7: "Fındığıyla bilinir, kalabalık; çiftlikten sonra un, ekmek ve dükkân.", oneri: "pazar" },
  tr_54_arifiye: { ad: "Arifiye", bilinenYani: "Otomotiv", neden: "Otomotiviyle bilinir; çiftlikten sonra parça fabrikası yakışır.", nedenG7: "Otomotiviyle bilinir; çiftlikten sonra parça fabrikası yakışır.", oneri: "sanayi" },
  tr_54_erenler: { ad: "Erenler", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_54_ferizli: { ad: "Ferizli", bilinenYani: null, neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_54_geyve: { ad: "Geyve", bilinenYani: "Geyve ayvası", neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_54_hendek: { ad: "Hendek", bilinenYani: "Mısır, fındık", neden: "Mısır ve fındığıyla bilinir; tarımla başlamak yakışır.", nedenG7: "Mısır ve fındığıyla bilinir; tarımla başlamak yakışır.", oneri: "tarim" },
  tr_54_karapurcek: { ad: "Karapürçek", bilinenYani: null, neden: "Küçük ilçe; üretimle başla.", nedenG7: "Küçük ilçe; üretimle başla.", oneri: "tarim" },
  tr_54_karasu: { ad: "Karasu", bilinenYani: "Fındık", neden: "Fındığıyla bilinir, kalabalık; çiftlikten sonra un ve ekmek.", nedenG7: "Fındığıyla bilinir, kalabalık; çiftlikten sonra un, ekmek ve dükkân.", oneri: "pazar" },
  tr_54_kaynarca: { ad: "Kaynarca", bilinenYani: "Fındık", neden: "Fındığıyla bilinir; orta boy, üretimle başla.", nedenG7: "Fındığıyla bilinir; orta boy, üretimle başla.", oneri: "tarim" },
  tr_54_kocaali: { ad: "Kocaali", bilinenYani: "Fındık, hurma kurusu", neden: "Fındığıyla bilinir; orta boy, üretimle başla.", nedenG7: "Fındığıyla bilinir; orta boy, üretimle başla.", oneri: "tarim" },
  tr_54_pamukova: { ad: "Pamukova", bilinenYani: "Ceviz ezmesi, kavun", neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_54_sapanca: { ad: "Sapanca", bilinenYani: null, neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_54_serdivan: { ad: "Serdivan", bilinenYani: null, neden: "Çok kalabalık; güçlü pazar.", nedenG7: "Çok kalabalık; dükkân için güçlü pazar.", oneri: "pazar" },
  tr_54_sogutlu: { ad: "Söğütlü", bilinenYani: null, neden: "Küçük ilçe; üretimle başla.", nedenG7: "Küçük ilçe; üretimle başla.", oneri: "tarim" },
  tr_54_tarakli: { ad: "Taraklı", bilinenYani: "Uğut tatlısı", neden: "Çok küçük ilçe; üretimle başla.", nedenG7: "Çok küçük ilçe; dükkâna değmez, üretimle başla.", oneri: "tarim" },
  tr_16_buyukorhan: { ad: "Büyükorhan", bilinenYani: null, neden: "Çok küçük ilçe; üretimle başla.", nedenG7: "Çok küçük ilçe; dükkâna değmez, üretimle başla.", oneri: "tarim" },
  tr_16_gemlik: { ad: "Gemlik", bilinenYani: "Gemlik zeytini", neden: "Zeytini ünlü, kalabalık ilçe; çiftlikten sonra un ve ekmek.", nedenG7: "Zeytini ünlü, kalabalık ilçe; çiftlikten sonra un, ekmek ve dükkân.", oneri: "pazar" },
  tr_16_gursu: { ad: "Gürsu", bilinenYani: "Deveci armudu", neden: "Armuduyla bilinir, kalabalık; mahalleli çok.", nedenG7: "Armuduyla bilinir, kalabalık; dükkân için iyi.", oneri: "pazar" },
  tr_16_harmancik: { ad: "Harmancık", bilinenYani: null, neden: "Çok küçük ilçe; üretimle başla.", nedenG7: "Çok küçük ilçe; dükkâna değmez, üretimle başla.", oneri: "tarim" },
  tr_16_inegol: { ad: "İnegöl", bilinenYani: "Mobilya", neden: "Mobilyasıyla bilinir; kalabalık, atölye işi bol.", nedenG7: "Mobilyasıyla bilinir; kalabalık, atölye ve dükkân bir arada.", oneri: "sanayi" },
  tr_16_iznik: { ad: "İznik", bilinenYani: "İznik çinisi", neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_16_karacabey: { ad: "Karacabey", bilinenYani: "Karacabey soğanı", neden: "Soğanıyla bilinir, kalabalık; tarımla başlarsın.", nedenG7: "Soğanıyla bilinir, kalabalık; tarımla başlarsın.", oneri: "tarim" },
  tr_16_keles: { ad: "Keles", bilinenYani: null, neden: "Küçük ilçe; üretimle başla.", nedenG7: "Küçük ilçe; üretimle başla.", oneri: "tarim" },
  tr_16_kestel: { ad: "Kestel", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_16_mudanya: { ad: "Mudanya", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_16_mustafakemalpasa: { ad: "Mustafakemalpaşa", bilinenYani: "Kemalpaşa tatlısı", neden: "Tatlısıyla bilinir, kalabalık; tarımla başlarsın.", nedenG7: "Tatlısıyla bilinir, kalabalık; tarımla başlarsın.", oneri: "tarim" },
  tr_16_nilufer: { ad: "Nilüfer", bilinenYani: "Otomotiv, yan sanayi", neden: "Otomotiv yan sanayisiyle bilinir; çok kalabalık, parça işi iş görür.", nedenG7: "Otomotiv yan sanayisiyle bilinir; çok kalabalık, parça işi iş görür.", oneri: "sanayi" },
  tr_16_orhaneli: { ad: "Orhaneli", bilinenYani: null, neden: "Küçük ilçe; üretimle başla.", nedenG7: "Küçük ilçe; üretimle başla.", oneri: "tarim" },
  tr_16_orhangazi: { ad: "Orhangazi", bilinenYani: null, neden: "Kalabalık ilçe; mahalleli çok.", nedenG7: "Kalabalık ilçe; dükkân için mahalleli çok.", oneri: "pazar" },
  tr_16_osmangazi: { ad: "Osmangazi", bilinenYani: "Otomotiv, Bursa ipeği", neden: "Bölgenin en kalabalık ilçesi; en geniş pazar.", nedenG7: "Bölgenin en kalabalık ilçesi; dükkân için en geniş pazar.", oneri: "pazar" },
  tr_16_yenisehir: { ad: "Yenişehir", bilinenYani: "Yenişehir biberi", neden: "Orta boy ilçe; üretimle başla.", nedenG7: "Orta boy ilçe; dükkân yavaş döner, üretimle başla.", oneri: "tarim" },
  tr_16_yildirim: { ad: "Yıldırım", bilinenYani: null, neden: "Çok kalabalık; güçlü pazar.", nedenG7: "Çok kalabalık; dükkân için güçlü pazar.", oneri: "pazar" },
};

/** İlçenin metin kaydı; bilinmeyen kimlik için undefined (arayüz uydurma metin göstermez). */
export function ilceMetni(kimlik: string): IlceMetni | undefined {
  return ILCE_METIN[kimlik];
}

/** Neden satırı: dükkân (G7) açıkken `nedenG7`, değilse `neden`. */
export function ilceNedeni(kimlik: string, duzey: DukkanDuzeyi = {}): string | undefined {
  const m = ILCE_METIN[kimlik];
  if (!m) return undefined;
  return duzey.g7 || duzey.g8 ? m.nedenG7 : m.neden;
}

/** Açılış önerisi cümlesi: G8 açıkken `acilisG8`, G7 açıkken `acilisG7` (varsa), yoksa `acilis`. */
export function acilisMetni(oneri: AcilisOnerisi, duzey: DukkanDuzeyi = {}): string {
  if (duzey.g8) {
    const t = ILCE_ORTAK.acilisG8[oneri];
    if (t) return t;
  }
  if (duzey.g7 || duzey.g8) {
    const t = ILCE_ORTAK.acilisG7[oneri];
    if (t) return t;
  }
  return ILCE_ORTAK.acilis[oneri];
}

/** "Bilinen yanı" satırı (etiket ve değer); `bilinenYani` null ise satır yok (null döner). */
export function bilinenYaniSatiri(kimlik: string): { etiket: string; deger: string } | null {
  const b = ILCE_METIN[kimlik]?.bilinenYani;
  return b ? { etiket: "Bilinen yanı", deger: b } : null;
}

/** Nüfus: 1.000 altı tam sayı ("850"), binlerde "415 bin", milyonda "1,2 milyon" (tr-TR); sayı yoksa ya da geçersizse null (satır yok). */
export function nufusMetni(n: number | null | undefined): string | null {
  if (n === null || n === undefined || !Number.isFinite(n) || n < 0) return null;
  if (n < 999.5) return fmt(Math.round(n));
  // 999.500 ve üstü milyon dalı: "1.000 bin" çıkmasın.
  if (n < 999_500) return `${fmt(Math.round(n / 1000))} bin`;
  const m = fmt1(n / 1_000_000);
  return `${m.endsWith(",0") ? m.slice(0, -2) : m} milyon`;
}
