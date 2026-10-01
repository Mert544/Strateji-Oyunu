/**
 * Mülk kipi paneli sözleşmesi (yalnız tip; kabukta kod yok). Mülk kipinde (sunucuya bağlı ya da `?yerles=1`) sağ panel ve
 * üst çubuktaki oyuncu düğmesi bölge kipinin devlet oyununu değil, oyuncunun işletmesini gösterir. İçerik üretici harita
 * yığınındadır (`harita/mulk-panel.ts`, harita.js; tek dosya bütçesine girmez); kabuk (`panel.ts`) yalnız bağlar.
 */
import type { IkonAdi } from "../tasarim/ikon";
import type { GovdeDurumu } from "./govde";

export interface MulkPaneli {
  /** Sekmeler (sırasıyla); ilki açılışta seçilir. */
  sekmeler: ReadonlyArray<{ id: string; ad: string; ikon: IkonAdi }>;
  /** Sekme içeriği (HTML). `d`: kabuğun görünüm durumu (dizin, iklim parametreleri). */
  icerik(sekme: string, d: GovdeDurumu): string;
  /** Sekme rozetindeki sayı (0: yok). */
  sayac(sekme: string): number;
  /** Üst çubuktaki oyuncu düğmesi (ad, amblem, hazine) ve başlığı; oyuncu verisi yoksa null. */
  cubuk(): { html: string; baslik: string } | null;
  /** Sunucunun sim saati (saat; tarih ve saat şeridi için) ya da null (bilinmiyor). */
  simSaat(): number | null;
  /** Dünya epoch'u (ms): sunucu bildirdiyse o (`hosgeldin.dunyaEpochMs`), yoksa varsayılan. Gerçek an = epoch + t. */
  epochMs(): number;
  /** Panel içi tık (veri öznitelikleri); işlendiyse true. */
  tikla(t: HTMLElement): boolean;
  /** Veri değişince çağrılır; dönen işlev aboneliği kaldırır. */
  dinle(f: () => void): () => void;
}
