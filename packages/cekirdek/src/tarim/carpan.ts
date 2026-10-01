/**
 * Tarımsal yöntem çıktı çarpanı (B1, docs/08 §0.2-b): toprak x iklim x olay x gübre.
 *
 *   toprak  = toprakTabanPpm x toprakPpm              (1_000_000 = referans ova, tam toprak)
 *   iklim   = günlük hasat oranı (sulama dahil; yıllık ortalama PPM)
 *   urun    = ekili yöntem: Σ ekim[i] x ciktiPpm[i] x (1 - olayKaybi x duyarlilik[i]);  ekilmeyen (mera): 1 - olayKaybi
 *   gubre   = 1 + doz x gubreCiktiEkiPpm x gubreKarsilanma
 *
 * Her çarpım `carpBol` ile yapılır; çarpan PPM'i aşabilir (verimli toprak, bol hasat, gübre).
 */
import { carpBol } from "../sabit";
import { PPM } from "../tipler";
import type { BolgeDurumu, DerlenmisIcerik } from "../tipler";
import type { TarimTablosu } from "./tablo";

/**
 * Bölgenin tarımsal yöntemi için çıktı çarpanı (ppm). `ekili`: yöntem ekili ürün yöntemi mi (ekim karışımı uygulanır).
 * `gubreKarsilanma`: bu çözümde gübre girdisinin karşılanma oranı (ppm). Bölge tarım durumu/tanımı yoksa PPM.
 */
export function tarimCiktiCarpani(tb: TarimTablosu, ic: DerlenmisIcerik, b: BolgeDurumu, ekili: boolean, gubreKarsilanma: number): number {
  const ts = b.tarim;
  const tanim = ic.harita.bolgeler[b.indeks]?.tarim;
  if (ts === undefined || tanim === undefined) return PPM;
  const toprak = carpBol(tanim.toprakTabanPpm, ts.toprakPpm, PPM);
  const kayip = ts.olayKaybiPpm;
  let urun: number;
  if (ekili) {
    urun = 0;
    for (let i = 0; i < tb.urun.length; i++) {
      const u = tb.urun[i] as { ciktiPpm: number; olayDuyarliligiPpm: number };
      const pay = carpBol(ts.ekimPpm[i] as number, u.ciktiPpm, PPM);
      if (pay === 0) continue;
      urun += carpBol(pay, PPM - carpBol(kayip, u.olayDuyarliligiPpm, PPM), PPM);
    }
  } else {
    urun = PPM - kayip;
  }
  const gubre = PPM + (ts.gubreDozu > 0 ? carpBol(ts.gubreDozu * tb.tarim.gubreCiktiEkiPpm, gubreKarsilanma, PPM) : 0);
  let c = carpBol(toprak, ts.iklimPpm, PPM);
  c = carpBol(c, urun, PPM);
  c = carpBol(c, gubre, PPM);
  return c;
}
