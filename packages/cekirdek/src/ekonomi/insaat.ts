/**
 * İnşaat tamamlanması: yeni tesis ya da kenar kapasite geliştirmesi.
 */
import { icerikTablosu } from "./tablo";
import { ppmUygula } from "../sabit";
import type { Baglam, Dunya, KenarDurumu, TesisDurumu } from "../tipler";

/** Bir inşaat bittiğinde (tesis veya kenar geliştirme). İnşaatı listeden çıkarır ve lojistiği kirletir. */
export function insaatBitti(d: Dunya, ctx: Baglam, insaatId: number): void {
  const konum = d.insaatlar.findIndex((i) => i.id === insaatId);
  if (konum < 0) return;
  const insaat = d.insaatlar[konum]!;
  d.insaatlar.splice(konum, 1);

  if (insaat.tur === "tesis") {
    const tb = icerikTablosu(ctx.ic);
    const bolge = d.bolgeler[insaat.bolge];
    const tur = tb.tur[insaat.hedef];
    const yontem = tur?.yontemler[0];
    if (bolge && tur && yontem !== undefined) {
      const tesis: TesisDurumu = {
        id: ctx.yeniKimlik(d),
        tur: insaat.hedef,
        yontem,
        aktif: true,
        verimPpm: 0,
        isciPpm: 0,
      };
      bolge.tesisler.push(tesis);
    }
  } else {
    const kenar = d.kenarlar[insaat.hedef] as KenarDurumu | undefined;
    if (kenar) kenar.kapasiteSaat += ppmUygula(kenar.kapasiteSaat, ctx.ic.param.lojistik.gelistirmeArtisPpm);
  }
  ctx.kirlet(d);
}
