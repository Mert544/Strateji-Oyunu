/**
 * Oyuncu komutunun işçi tarafı (saf; test edilebilir): komut, simülasyonun o anki zamanında uygulanır ve aynı
 * andaki çözüm (lojistik) işlenir; böylece hemen ardından alınan kare komutun etkisini gösterir.
 */
import { Simulasyon } from "@bolge/cekirdek";
import type { Komut, KomutSonucu } from "@bolge/cekirdek";

export const IZLEME_HATASI = "izleme kipi";

export function oyuncuKomutu(sim: Simulasyon, oyuncu: string | null, komut: Komut): KomutSonucu {
  if (oyuncu === null) return { tamam: false, hata: IZLEME_HATASI };
  const t = sim.dunya.zaman;
  const sonuc = sim.uygula({ t, oyuncu, komut });
  if (sonuc.tamam) sim.calistirKadar(t);
  return sonuc;
}
