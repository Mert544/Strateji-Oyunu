/// <reference types="vite/client" />

declare module "virtual:harita-verisi" {
  /** Gerçek Karadeniz haritası varsa dolu; yoksa null. */
  export const gercek: { harita: unknown; sinir: unknown } | null;
  /** Gerçek harita yoksa geçici katman. */
  export const yedek: { harita: unknown; sinir: unknown } | null;
}
