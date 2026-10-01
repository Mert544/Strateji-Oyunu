/**
 * Veri hattının dizin ve dosya yolları.
 * Ham indirmeler repo dışında kalır (.onbellek, .gitignore'da); üretilen çıktılar repodadır.
 */
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

/** packages/veri-hatti */
export const PAKET_KOKU = resolve(dirname(fileURLToPath(import.meta.url)), "..");
/** Ham indirme önbelleği (git'e girmez). */
export const ONBELLEK = resolve(PAKET_KOKU, ".onbellek");
/** Elle yazılan yapılandırma ve kaynak sağlama toplamları. */
export const YAPILANDIRMA_DIZINI = resolve(PAKET_KOKU, "yapilandirma");
export const YAPILANDIRMA_YOLU = resolve(YAPILANDIRMA_DIZINI, "karadeniz.json");
export const KAYNAK_OZETLERI_YOLU = resolve(YAPILANDIRMA_DIZINI, "kaynak-ozetleri.json");
/** Üretilen doğrulama raporları (repoda). */
export const RAPOR_DIZINI = resolve(PAKET_KOKU, "rapor");
/** packages/veri/haritalar: oyunun okuduğu çıktılar. */
export const HARITA_DIZINI = resolve(PAKET_KOKU, "../veri/haritalar");
/** Depo kökündeki kaynak belgesi. */
export const DATA_SOURCES_YOLU = resolve(PAKET_KOKU, "../../DATA_SOURCES.md");

export const HARITA_DOSYASI = "gercek-karadeniz.json";
export const SINIR_DOSYASI = "gercek-karadeniz-sinirlar.topo.json";
