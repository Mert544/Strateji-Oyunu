import { MULKSUZ_PAKET } from "../mulksuz";
import type { BolgeDurumu, DerlenmisIcerik } from "../tipler";

/** L2 yalnız işletme düğümündeki açık yakıt kuralında çalışır; eski/bölge yolunda -1. */
export function stokOncelikliYakit(ic: DerlenmisIcerik, b: BolgeDurumu): number {
  if (MULKSUZ_PAKET || b.merkez === undefined) return -1;
  const sb = ic.mulk?.sebeke;
  const m = ic.malIndeks.yakit;
  if (sb === undefined || m === undefined) return -1;
  const i = sb.stoksuzIndeks[m] ?? -1;
  return i >= 0 && sb.stoksuz[i]?.stokOncelikli === true ? m : -1;
}
