/**
 * İnşaat tamamlanması: yeni tesis ya da kenar kapasite geliştirmesi.
 */
import { icerikTablosu } from "./tablo";
import { hucreBul } from "../mulk/durum";
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
      // Sanayi (B2): yeni tesis S ölçekte ve aşınmasız başlar; kapalıyken alanlar yazılmaz (özet değişmez).
      if (ctx.ic.param.sanayi !== undefined) {
        tesis.olcek = 0;
        tesis.asinmaPpm = 0;
      }
      // Mülk kipi (S3): hücreli inşaatın tesisi hücrelerini kaplar; hücreler inşaattan tesise geçer.
      if (insaat.hucreler !== undefined) {
        tesis.hucreler = [...insaat.hucreler];
        for (const hid of insaat.hucreler) {
          const h = hucreBul(d, hid);
          if (h === undefined) continue;
          delete h.insaat;
          h.tesis = tesis.id;
        }
      }
      bolge.tesisler.push(tesis);
    }
  } else if (insaat.tur === "olcek") {
    // Ölçek yükseltmesi biter: tesis hâlâ varsa kademe yükselir (yükseltme sırasında tesis çalışmaya devam etmiştir).
    const ts = d.bolgeler[insaat.bolge]?.tesisler.find((x) => x.id === insaat.hedef);
    if (ts && insaat.olcek !== undefined && (ts.olcek ?? 0) < insaat.olcek) ts.olcek = insaat.olcek;
  } else if (insaat.tur === "onarim") {
    // Genel onarım durması biter: süresi dolan tesisler çalışmaya döner.
    const b = d.bolgeler[insaat.bolge];
    if (b) for (const ts of b.tesisler) if (ts.onarimBitis !== undefined && ts.onarimBitis <= d.zaman) delete ts.onarimBitis;
  } else {
    const kenar = d.kenarlar[insaat.hedef] as KenarDurumu | undefined;
    if (kenar) kenar.kapasiteSaat += ppmUygula(kenar.kapasiteSaat, ctx.ic.param.lojistik.gelistirmeArtisPpm);
  }
  ctx.kirlet(d);
}
