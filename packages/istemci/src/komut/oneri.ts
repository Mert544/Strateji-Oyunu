/**
 * "Önerilen eylemler": botlar paketindeki ortak planlayıcı oyuncu için çalıştırılır (planlayıcı DEĞİŞTİRİLMEZ,
 * yalnızca içe aktarılır). Yalnız işçide ve testlerde kullanılır; ana paket bunu içe aktarmaz. Metinler arayüzde üretilir.
 */
import { Bakis, adayiSec, sivilAdaylar } from "@bolge/botlar";
import type { Simulasyon } from "@bolge/cekirdek";
import type { Oneri } from "../isci/protokol";

/** En iyi `n` aday (bütçe ve stok içinde kalarak). */
export function oneriUret(sim: Simulasyon, oyuncu: string, n = 5): Oneri[] {
  const b = new Bakis(sim, oyuncu);
  return adayiSec(sivilAdaylar(b), b, { n }).map((a) => ({
    komut: a.komut,
    fayda: Math.round(a.tahminiFayda),
    kategori: a.kategori,
    bolge: a.bolge !== undefined ? (sim.ic.bolgeIndeks[a.bolge] ?? -1) : -1,
  }));
}
