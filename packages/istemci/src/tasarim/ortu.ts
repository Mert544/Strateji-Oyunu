/**
 * "Kâğıt örtü" (görsel kimlik §6.1): büyük görünüm geçişlerinde (küre ↔ harita, harita → sokak) zemin renginde kısa bir
 * örtü (α 0 → 0,85 → 0; 240 + 240 ms): siyah/beyaz flaş ya da kesme olmaz, tuval değişimi örtünün altında olur.
 * Azaltılmış harekette örtü yoktur (anında geçiş). Örtü işaretçi olaylarını engellemez.
 */
const SURE = 240;

function hareketAz(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

const bekle = (ms: number): Promise<void> => new Promise((coz) => window.setTimeout(coz, ms));

/** `is` örtü kapalıyken (görünür) çalışır; bitince örtü çekilir. Hata da örtüyü kaldırır. */
export async function ortuIle<T>(is: () => Promise<T> | T): Promise<T> {
  const o = document.getElementById("kagit-ortu");
  if (!o || hareketAz()) return is();
  o.classList.add("acik");
  await bekle(SURE);
  try {
    return await is();
  } finally {
    // Bir sonraki karede çek: yeni tuval ilk karesini çizmiş olsun
    window.requestAnimationFrame(() => o.classList.remove("acik"));
  }
}
