/** Ana iş parçacığı <-> simülasyon işçisi mesaj sözleşmesi. */
import type { HaritaDosyasi, IcerikDosyasi, Parametreler } from "@bolge/veri";
import type { Dizin, Kare } from "../veri/kare-tipleri";

/** İşçiye verilen veri paketi (işçi node:fs kullanmaz; JSON'lar ana iş parçacığında içe aktarılır). */
export interface IsciVeriPaketi {
  harita: HaritaDosyasi;
  icerik: IcerikDosyasi;
  param: Parametreler;
}

export type IsciyeMesaj =
  | { tur: "baslat"; veri: IsciVeriPaketi; tohum: number; botlar: string[]; hiz: number; duraklat: boolean }
  | { tur: "hiz"; hiz: number }
  | { tur: "duraklat"; duraklat: boolean };

export type IsciMesaji =
  | { tur: "hazir"; dizin: Dizin }
  | { tur: "kare"; kare: Kare; simMs: number }
  /** Sık, hafif zaman bildirimi (güneş ve saat göstergesi için). */
  | { tur: "zaman"; simMs: number; hiz: number; duraklat: boolean; gerideMi: boolean; adimMs: number }
  | { tur: "hata"; mesaj: string };

/** Dünya hızı seçenekleri: sim saniyesi / gerçek saniye. */
export const HIZ_SECENEKLERI: ReadonlyArray<{ hiz: number; ad: string }> = [
  { hiz: 600, ad: "600×" },
  { hiz: 3600, ad: "3600×" },
  { hiz: 21600, ad: "21600×" },
  { hiz: 86400, ad: "86400×" },
];
