/** SAPLAMA (stub) — Ajan B tarafından uygulanacak. */
import type { Dunya, Mili, OyuncuId, Stok } from "./tipler";

/** Stoğu değiştirmeden t anındaki miktarı döndürür ([0, kapasite]). */
export function anlikMiktar(_s: Stok, _t: number): Mili {
  throw new Error("uygulanmadı");
}

export function anlikHazine(_d: Dunya, _oyuncu: OyuncuId): Mili {
  throw new Error("uygulanmadı");
}
