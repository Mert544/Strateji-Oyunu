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
 * Kimlikli yeni işte sonuç original sahibin kaydına yazılır; eski kimliksiz olayda yalnız rezerv değişir.
 * Kullanılan başarı/range parametreleri tamamlanma anının kurallarıdır; ödenen teklif başlatmanın tarihsel bilgisidir.
 */
export function sondajBitti(d: Dunya, ctx: Baglam, bolge: number, mal: number, sondaj?: string): void {
  const b = d.bolgeler[bolge] as BolgeDurumu | undefined;
  const is = sondaj === undefined ? undefined : d.sondajlar?.find((j) => j.id === sondaj);
  if (sondaj !== undefined && (is === undefined || is.evre !== "suruyor" || b === undefined || b.id !== is.bolge || ctx.ic.mallar[mal]?.id !== is.mal ||
    is.bitis !== d.zaman || is.deneme !== is.odenenTeklif.kullanilanHak + 1 || (b.kesifSayisi?.[mal] ?? 0) < is.deneme || !d.oyuncular.some((o) => o.id === is.sahip))) return;
  const sn = sanayiTablosu(ctx.ic);
  if (sn === null) {
    if (is !== undefined) { is.evre = "bitti"; is.sonuc = { basarili: false, ekMili: 0, neden: "sanayi_kapali" }; }
    return;
  }
  if (b === undefined) return;
  const dp = sn.p.damar;
  const sans = ctx.rastgeleAralik(d, "olay", PPM);
  const aralikGenislik = dp.kesifEkiMaxPpm - dp.kesifEkiMinPpm + 1;
  const boyut = dp.kesifEkiMinPpm + ctx.rastgeleAralik(d, "olay", aralikGenislik > 0 ? aralikGenislik : 1);
  const basarili = sans < dp.kesifOlasilikPpm;
  if (is !== undefined) { is.evre = "bitti"; is.sonuc = { basarili, ekMili: 0 }; }
  if (!basarili) return;
  const ilk = b.rezervIlk[mal] as number;
  if (ilk <= 0) return;
  const eki = carpBol(ilk, boyut, PPM);
  if (eki <= 0) return;
  b.rezervIlk[mal] = ilk + eki;
  b.rezervKalan[mal] = (b.rezervKalan[mal] as number) + eki;
  if (is !== undefined) is.sonuc!.ekMili = eki;
  ctx.kirlet(d);
}
