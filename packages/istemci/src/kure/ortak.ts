/** Malzemeler arası paylaşılan uniform'lar ve tema uygulama yardımcıları. */
import { Vector2, Vector3 } from "three";
import type { SahnePaleti } from "./tema";

export interface Ortak {
  uGunes: { value: Vector3 };
  uZaman: { value: number };
  uPikselOran: { value: number };
  /** drawingBufferHeight / (2 tan(fov/2)): dünya boyutunu piksele çevirir. */
  uOdak: { value: number };
  uEkran: { value: Vector2 };
  /** Kamera uzaklığına göre şerit genişlik ölçeği. */
  uGenislikOlcek: { value: number };
  /** Yakınlık (0-1): liman/dar geçit simgeleri yakında belirir. */
  uYakin: { value: number };
}

export function ortakOlustur(): Ortak {
  return {
    uGunes: { value: new Vector3(0, 0, 1) },
    uZaman: { value: 0 },
    uPikselOran: { value: 1 },
    uOdak: { value: 1000 },
    uEkran: { value: new Vector2(1, 1) },
    uGenislikOlcek: { value: 1 },
    uYakin: { value: 0 },
  };
}

export function v3(c: readonly number[]): Vector3 {
  return new Vector3(c[0], c[1], c[2]);
}

/** Bir tema-duyarlı malzeme: palet değişince uniform'larını günceller. */
export interface TemaliMalzeme {
  temaUygula(p: SahnePaleti): void;
}
