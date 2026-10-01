/**
 * E-posta biçimi, normalleştirme ve geçici (tek kullanımlık) alan engeli (KIMLIK.md §5).
 *
 * - Biçim: yalnız ASCII, en çok 254 karakter; tam RFC 5322 değil, bilerek dar ve güvenli bir alt küme (başlık/komut enjeksiyonu yok).
 * - Normalleştirme (benzersizlik anahtarı): küçük harf; `+takma` her alanda atılır; Gmail/Googlemail'de ayrıca yerel kısımdaki noktalar atılır
 *   ve alan `gmail.com` olur. Posta, kullanıcının yazdığı (küçük harfli) adrese gider; anahtar yalnız "bir adres, bir hesap" içindir.
 * - Geçici alan listesi VERİ dosyasıdır (`veri/gecici-eposta-alanlari.json`): kod değişmeden güncellenir.
 */
import { readFileSync } from "node:fs";

const YEREL = /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+$/;
const ETIKET = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
const GMAIL = new Set(["gmail.com", "googlemail.com"]);

export interface EpostaBicimi {
  /** Küçük harfli adres (postanın gideceği). */
  eposta: string;
  /** Benzersizlik anahtarı (normalleştirilmiş). */
  anahtar: string;
  /** Alan (küçük harf). */
  alan: string;
}

/** Adresi ayrıştırır ve normalleştirir; biçim geçersizse null. */
export function epostaCoz(girdi: string): EpostaBicimi | null {
  const eposta = girdi.trim().toLowerCase();
  if (eposta.length < 3 || eposta.length > 254) return null;
  const at = eposta.indexOf("@");
  if (at < 1 || at !== eposta.lastIndexOf("@")) return null;
  const yerel = eposta.slice(0, at);
  const alan = eposta.slice(at + 1);
  if (yerel.length > 64 || !YEREL.test(yerel) || yerel.startsWith(".") || yerel.endsWith(".") || yerel.includes("..")) return null;
  const etiketler = alan.split(".");
  if (etiketler.length < 2 || !etiketler.every((e) => ETIKET.test(e)) || !/^[a-z]{2,}$/.test(etiketler.at(-1) as string)) return null;
  let anahtarYerel = yerel.split("+")[0] as string;
  let anahtarAlan = alan;
  if (GMAIL.has(alan)) {
    anahtarYerel = anahtarYerel.replaceAll(".", "");
    anahtarAlan = "gmail.com";
  }
  if (anahtarYerel === "") return null;
  return { eposta, anahtar: `${anahtarYerel}@${anahtarAlan}`, alan };
}

/** Günlük ve metrik için maskelenmiş adres (`a***@alan`); adres günlüğe ASLA tam yazılmaz. */
export function epostaMaskele(eposta: string): string {
  const at = eposta.indexOf("@");
  if (at < 1) return "***";
  return `${eposta.slice(0, 1)}***${eposta.slice(at)}`;
}

/** Geçici alan listesini dosyadan yükler (`{ "alanlar": ["a.com", ...] }`); küçük harfe çevrilir. */
export function geciciAlanlariYukle(yol: URL | string = new URL("../../veri/gecici-eposta-alanlari.json", import.meta.url)): Set<string> {
  const ham = JSON.parse(readFileSync(yol, "utf8")) as { alanlar?: unknown };
  if (!Array.isArray(ham.alanlar) || !ham.alanlar.every((a) => typeof a === "string")) throw new Error("gecici alan listesi gecersiz: { alanlar: string[] } bekleniyordu");
  return new Set((ham.alanlar as string[]).map((a) => a.trim().toLowerCase()).filter((a) => a !== ""));
}

/** Alan ya da üst alanlarından biri listedeyse true (`x.mailinator.com` -> `mailinator.com`). */
export function geciciAlanMi(alan: string, liste: ReadonlySet<string>): boolean {
  const e = alan.toLowerCase().split(".");
  for (let i = 0; i < e.length - 1; i++) if (liste.has(e.slice(i).join("."))) return true;
  return false;
}
