/**
 * SAPLAMA (stub) — Ajan A tarafından uygulanacak.
 * Zod şemalarıyla doğrulama + anlamsal kontroller ve varsayılan veri yükleme.
 */
import type { HaritaDosyasi, IcerikDosyasi, Parametreler } from "./tipler";

export interface VeriPaketi {
  harita: HaritaDosyasi;
  icerik: IcerikDosyasi;
  param: Parametreler;
}

export type DogrulamaSonucu = { gecerli: true } | { gecerli: false; hatalar: string[] };

/** Şema + anlamsal kontroller (bağlılık, >=2 dar geçit, 30-60 bölge, benzersiz kimlikler...). */
export function dogrulaHarita(_ham: unknown): DogrulamaSonucu {
  throw new Error("uygulanmadı: dogrulaHarita");
}

/** Şema + çapraz referans kontrolleri (yöntem/tesis/teknoloji/mal kimlikleri). */
export function dogrulaIcerik(_ham: unknown): DogrulamaSonucu {
  throw new Error("uygulanmadı: dogrulaIcerik");
}

export function dogrulaParametreler(_ham: unknown, _icerik?: IcerikDosyasi): DogrulamaSonucu {
  throw new Error("uygulanmadı: dogrulaParametreler");
}

/**
 * haritalar/sentetik-50.json, icerik/icerik.json ve icerik/parametreler.json dosyalarını
 * okur, doğrular ve döndürür. Geçersizse hata fırlatır.
 */
export function varsayilanVeriyiYukle(): VeriPaketi {
  throw new Error("uygulanmadı: varsayilanVeriyiYukle");
}
