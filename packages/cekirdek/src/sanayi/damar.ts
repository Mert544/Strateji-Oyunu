/**
 * Damar ölçeği, tükenme ve keşif sondajı (B2, docs/08 §2.3 S5; docs/07 Ö7).
 *
 * - Verim tabanı: `rezervVerimi` (ekonomi/uretim.ts) damar tükenince sıfıra değil `rezervVerimTabaniPpm`'e iner.
 * - Ölçek: harita verisi zaten ölçeklidir; `damar.rezervOlcegiPpm` kurulumda ek ölçek uygular (varsayılan 1 000 000).
 * - Keşif sondajı: `arama_sondaji` komutu (para + parça) `kesifSureSaat` sonra `sondaj_bitti` olayı; olay "olay" akışından
 *   TAM İKİ çekim yapar (olasılık, boyut; çekim sayısı sonuçtan bağımsız sabit) ve başarılıysa damarı büyütür.
 */
import { carpBol } from "../sabit";
import { PPM } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya } from "../tipler";
import { sanayiTablosu } from "./tablo";

/**
 * Olay: sondaj_bitti. İki çekim her zaman yapılır (akış kaymaz): (1) başarı olasılığı, (2) yeni damar boyutu
 * rezervIlk x U(kesifEkiMin, kesifEkiMax) / PPM. Başarılıysa rezervIlk ve rezervKalan aynı miktar artar.
 * Başarılı olup olmadığı `BolgeDurumu` dışında iz bırakmaz (keşif hakkı komutta harcanmıştır).
 */
export function sondajBitti(d: Dunya, ctx: Baglam, bolge: number, mal: number): void {
  const sn = sanayiTablosu(ctx.ic);
  const b = d.bolgeler[bolge] as BolgeDurumu | undefined;
  if (sn === null || b === undefined) return;
  const dp = sn.p.damar;
  const sans = ctx.rastgeleAralik(d, "olay", PPM);
  const aralikGenislik = dp.kesifEkiMaxPpm - dp.kesifEkiMinPpm + 1;
  const boyut = dp.kesifEkiMinPpm + ctx.rastgeleAralik(d, "olay", aralikGenislik > 0 ? aralikGenislik : 1);
  if (sans >= dp.kesifOlasilikPpm) return;
  const ilk = b.rezervIlk[mal] as number;
  if (ilk <= 0) return;
  const eki = carpBol(ilk, boyut, PPM);
  if (eki <= 0) return;
  b.rezervIlk[mal] = ilk + eki;
  b.rezervKalan[mal] = (b.rezervKalan[mal] as number) + eki;
  ctx.kirlet(d);
}
