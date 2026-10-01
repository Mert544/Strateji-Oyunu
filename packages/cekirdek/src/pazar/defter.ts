/**
 * Ticaret defteri (B3): komisyon, makas, liman primi, tarife ve ihracat vergisi muhasebesi (hazine korunumu).
 *
 * Kalemler lojistik çözümde saatlik ORAN olarak hesaplanır (`cozum.ts` hazineKalemleri) ve hazine oranıyla birlikte yazılır;
 * muhasebe oran değişmeden önce `oran x (t - t0) / SAAT` kadar toplama işler (üretim muhasebesi gibi). Pazar v1 kapalıysa
 * `OyuncuDurumu.ticaretDefteri` tanımsızdır ve hiçbir şey yapılmaz.
 */
import { carpBol } from "../sabit";
import { SAAT } from "../tipler";
import type { Baglam, Dunya, OyuncuDurumu, TicaretDefteri, TicaretKalemleri } from "../tipler";
import { KALEM_ALANLARI, sifirKalemler } from "./fiyat";

/** Yeni oyuncunun boş defteri. */
export function ticaretDefteriBaslat(t: number): TicaretDefteri {
  return { toplam: sifirKalemler(), oran: sifirKalemler(), t0: t };
}

/** Adım 0 (lojistik çözümün başı): her oyuncunun defterine önceki oranı `t - t0` süresince işler. */
export function pazarMuhasebesi(d: Dunya, _ctx: Baglam): void {
  const t = d.zaman;
  for (const o of d.oyuncular) {
    const df = o.ticaretDefteri;
    if (df === undefined) continue;
    const dt = t - df.t0;
    if (dt > 0) {
      for (const a of KALEM_ALANLARI) {
        const oran = df.oran[a];
        if (oran !== 0) df.toplam[a] += carpBol(oran, dt, SAAT);
      }
    }
    df.t0 = t;
  }
}

/** Çözümün son adımı: yeni saatlik oranları yazar (`t0` = şimdi; muhasebe adım 0 ile işlenmiştir). */
export function defterOranYaz(d: Dunya, o: OyuncuDurumu, kalemler: TicaretKalemleri): void {
  const df = o.ticaretDefteri;
  if (df === undefined) return;
  for (const a of KALEM_ALANLARI) df.oran[a] = kalemler[a];
  df.t0 = d.zaman;
}
