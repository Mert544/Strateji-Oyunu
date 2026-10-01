/** Sayı/metin biçimleme yardımcıları (saf). */

export function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

export function fmt(n: number): string {
  return Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 0 });
}

export function fmt1(n: number): string {
  return Number(n).toLocaleString("tr-TR", { maximumFractionDigits: 1 });
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

/** "Geçen: N gün SS sa". */
export function gecenMetni(saat: number): string {
  return `${Math.floor(saat / 24)} gün ${saat % 24} sa`;
}
