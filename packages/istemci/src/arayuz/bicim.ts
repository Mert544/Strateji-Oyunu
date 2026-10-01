/**
 * Tek Türkçe (tr-TR) sayı, yüzde ve zaman biçimleyicisi (saf; DOM yok). Arayüzdeki tüm sayılar buradan geçer:
 *   - binlik ayırıcı ".", ondalık "," (Intl.NumberFormat('tr-TR'));
 *   - yüzde işareti sayının ÖNÜNDE ve boşluksuz: "%90" (Intl yüzde biçimi tr-TR'de zaten böyledir);
 *   - tümü büyük harf YOK (Türkçe İ/ı tuzağı; görsel kimlik kararı): yalnız cümle başı büyük harf.
 * Biçimleyiciler önbelleklenir (her çağrıda yeni Intl nesnesi kurulmaz).
 */

const YEREL = "tr-TR";
const sayiOnbellek = new Map<number, Intl.NumberFormat>();
const yuzdeOnbellek = new Map<number, Intl.NumberFormat>();

function sayiBicimi(ondalik: number): Intl.NumberFormat {
  let f = sayiOnbellek.get(ondalik);
  if (!f) {
    f = new Intl.NumberFormat(YEREL, { maximumFractionDigits: ondalik });
    sayiOnbellek.set(ondalik, f);
  }
  return f;
}

function yuzdeBicimi(ondalik: number): Intl.NumberFormat {
  let f = yuzdeOnbellek.get(ondalik);
  if (!f) {
    f = new Intl.NumberFormat(YEREL, { style: "percent", maximumFractionDigits: ondalik });
    yuzdeOnbellek.set(ondalik, f);
  }
  return f;
}

export function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Sayı (en çok `ondalik` basamak): 12345.6 -> "12.345,6". */
export function sayi(n: number, ondalik = 0): string {
  const x = Number(n);
  // -0 ve yuvarlama sonucu "-0" görünmesin
  const s = sayiBicimi(ondalik).format(x === 0 ? 0 : x);
  return s === "-0" ? "0" : s;
}

/** Tam sayı biçimi (kısa ad). */
export function fmt(n: number): string {
  return sayi(n, 0);
}

/** Bir ondalıklı biçim (kısa ad). */
export function fmt1(n: number): string {
  return sayi(n, 1);
}

/** Yüzde: girdi 0-100 ölçeğinde. yuzde(90) -> "%90", yuzde(12.5, 1) -> "%12,5". */
export function yuzde(p: number, ondalik = 0): string {
  const s = yuzdeBicimi(ondalik).format(Number(p) / 100);
  return s === "-%0" ? "%0" : s;
}

/** 12 345 -> "12,3 B"; 1 200 000 -> "1,2 Mn". */
export function kisalt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return fmt1(n / 1e6) + " Mn";
  if (a >= 1e4) return fmt1(n / 1e3) + " B";
  return fmt(n);
}

export function sinirla(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

// ---------------------------------------------------------------------------------------------
// Zaman
// ---------------------------------------------------------------------------------------------

/** Sim saat 0'ın UTC saati (başlangıçta Türkiye/Karadeniz gündüz olsun diye 09:00). */
export const BASLANGIC_SAAT_UTC = 9;

/** "Gün N · SS:00" biçiminde sim saati (UTC saat dilimi). */
export function simSaatMetni(simSaat: number): string {
  const s = Math.floor(simSaat);
  const gun = Math.floor(s / 24) + 1;
  const utc = (((s + BASLANGIC_SAAT_UTC) % 24) + 24) % 24;
  return `Gün ${gun} · ${String(utc).padStart(2, "0")}:00`;
}

/** Süre (saat girdili): "40 dk" / "5 sa" / "1,5 sa" / "1 gün" / "2 gün 3 sa"; negatif -> "0 sa". */
export function sureMetni(saat: number): string {
  if (!(saat > 0)) return "0 sa";
  if (saat < 1) return `${Math.max(1, Math.round(saat * 60))} dk`;
  if (saat < 24) return `${fmt1(saat)} sa`;
  let g = Math.floor(saat / 24);
  let k = Math.round(saat - g * 24);
  if (k === 24) {
    g++;
    k = 0;
  }
  return k === 0 ? `${g} gün` : `${g} gün ${k} sa`;
}

/** "Geçen: N gün SS sa". */
export function gecenMetni(saat: number): string {
  return `${Math.floor(saat / 24)} gün ${saat % 24} sa`;
}
