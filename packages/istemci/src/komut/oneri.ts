/**
 * "Önerilen eylemler": botlar paketindeki ortak planlayıcı oyuncu için çalıştırılır (planlayıcı DEĞİŞTİRİLMEZ,
 * yalnızca içe aktarılır). Yalnız işçide ve testlerde kullanılır; ana paket bunu içe aktarmaz. Metinler arayüzde üretilir.
 */
import { Bakis, adayiSec, sivilAdaylar } from "@bolge/botlar";
import type { Simulasyon } from "@bolge/cekirdek";
import type { Oneri } from "../isci/protokol";
import { GIZLI_KOMUTLAR } from "./gizli";

/**
 * En iyi `n` aday (bütçe ve stok içinde kalarak). Arayüzde formu olmayan (gizli: lojistik) komutların adayları
 * seçimden önce elenir; planlayıcının sıralaması değişmez.
 */
export function oneriUret(sim: Simulasyon, oyuncu: string, n = 5): Oneri[] {
  const b = new Bakis(sim, oyuncu);
  const gizli = new Set<string>(GIZLI_KOMUTLAR);
  const adaylar = sivilAdaylar(b).filter((a) => !gizli.has(a.komut.tur));
  return adayiSec(adaylar, b, { n }).map((a) => ({
    komut: a.komut,
    fayda: Math.round(a.tahminiFayda),
    kategori: a.kategori,
    bolge: a.bolge !== undefined ? (sim.ic.bolgeIndeks[a.bolge] ?? -1) : -1,
  }));
}
