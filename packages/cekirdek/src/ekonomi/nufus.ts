/**
 * Nüfus (saatlik tık, adım 3): gıda karşılanma >= %95 ve vergi eşiğin altındaysa büyür, < %80 ise küçülür.
 * Sahipsiz bölgeler uykudadır: nüfus sabit kalır (büyümez, küçülmez). Nüfus en az 1000 kişiye kadar küçülür.
 */
import { carpBol } from "../sabit";
import { oyuncuBul } from "../stok";
import { PPM } from "../tipler";
import type { Baglam, Dunya } from "../tipler";

const BUYUME_ESIGI_PPM = 950_000;
const KUCULME_ESIGI_PPM = 800_000;
const EN_AZ_NUFUS = 1000;

export function nufusTik(d: Dunya, ctx: Baglam): void {
  const p = ctx.ic.param;
  for (const b of d.bolgeler) {
    if (b.sahip === null) continue; // uykuda: nüfus sabit
    if (b.gidaKarsilanmaPpm >= BUYUME_ESIGI_PPM) {
      const sahip = oyuncuBul(d, b.sahip);
      const vergiTamam = sahip === undefined || sahip.vergiPpm <= p.ekonomi.vergiBuyumeEsigiPpm;
      if (vergiTamam) b.nufus += carpBol(b.nufus, p.nufus.buyumePpmGun, 24 * PPM);
    } else if (b.gidaKarsilanmaPpm < KUCULME_ESIGI_PPM) {
      const yeni = b.nufus - carpBol(b.nufus, p.nufus.kuculmePpmGun, 24 * PPM);
      const alt = b.nufus < EN_AZ_NUFUS ? b.nufus : EN_AZ_NUFUS;
      b.nufus = yeni < alt ? alt : yeni;
    }
  }
}
