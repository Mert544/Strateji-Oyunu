/**
 * Tarım katmanı (B1, docs/08 §1): iklim takvimi ve olayları, toprak, ekim planı, gübre dozu.
 * Motor yalnızca `iklimGunluk` ve `tarimKomutu`'nu çağırır; üretim çarpanı ekonomi/uretim.ts içinden uygulanır.
 */
export { iklimGunluk, takvimGunu, takvimAyi, mutlakTakvimGunu } from "./iklim";
export { tarimKomutu } from "./komut";
export { tarimCiktiCarpani } from "./carpan";
export { tarimTablosu, hasatEnterpole, hasatGunlukNormallestir, IKLIM_TIPI_SIRASI, OLAY_TURU_SIRASI, TARIMI_ETKILEYEN_OLAY } from "./tablo";
export type { TarimTablosu } from "./tablo";
