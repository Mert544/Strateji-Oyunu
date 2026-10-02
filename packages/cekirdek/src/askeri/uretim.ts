/**
 * Askeri üretim: birlik üretim partileri ve ordunun ikmal talebi (spesifikasyon §6).
 */
import { bolgeIndeksiBul } from "../dugum";
import { hizlandirilmisSure } from "../erkenOyun";
import { ekYapiSayisi, ekYapiToplami } from "../mulk/yapi";
import { carpBol } from "../sabit";
import { anlikMiktar, oyuncuBul, stokEkle } from "../stok";
import { birlikAcikMi } from "../teknoloji";
import { PPM, SAAT } from "../tipler";
import type { Baglam, DerlenmisIcerik, Dunya, Komut, KomutSonucu, Mili, OyuncuId } from "../tipler";

/** Tek komutta üretilebilecek en fazla birlik adedi. */
export const EN_COK_PARTI_ADEDI = 100;

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

/**
 * Komut: birlik_uret. Maliyet (× adet) bölge stoğunda anlık mevcut olmalıdır; yoksa hata ve hiçbir
 * değişiklik yapılmaz. Maliyet hemen düşer, parti `partiSuresiSaat` sonra birlik olarak eklenir.
 */
export function birlikUret(
  d: Dunya,
  ctx: Baglam,
  oyuncu: OyuncuId,
  k: Extract<Komut, { tur: "birlik_uret" }>,
): KomutSonucu {
  const ic = ctx.ic;
  const bi = bolgeIndeksiBul(d, ic, k.bolge);
  const bolge = bi === undefined ? undefined : d.bolgeler[bi];
  if (bi === undefined || !bolge) return hata(`bilinmeyen bolge: ${k.bolge}`);
  if (bolge.sahip !== oyuncu) return hata(`bolge oyuncunun degil: ${k.bolge}`);
  const birlikIdx = ic.birlikIndeks[k.birlik];
  const tanim = birlikIdx === undefined ? undefined : ic.birlikler[birlikIdx];
  if (birlikIdx === undefined || !tanim) return hata(`bilinmeyen birlik: ${k.birlik}`);
  if (!oyuncuBul(d, oyuncu) || !birlikAcikMi(d, ctx, oyuncu, birlikIdx)) return hata(`birlik acik degil: ${k.birlik}`);
  if (!Number.isSafeInteger(k.adet) || k.adet < 1 || k.adet > EN_COK_PARTI_ADEDI) {
    return hata(`gecersiz adet: ${k.adet} (1..${EN_COK_PARTI_ADEDI})`);
  }

  // Yalnız işletme düğümleri: süren inşaat kapasite sağlamaz; süren partiler kapasite tüketir.
  if (ic.mulk !== undefined && bolge.merkez !== undefined) {
    if (ekYapiSayisi(bolge, "ordugah") === 0) return hata(`ordugah gerekli: ${k.bolge}`);
    const kapasite = ekYapiToplami(ic, bolge, "birlikKapasitesi");
    let kullanilan = 0;
    for (const adet of bolge.birlikler) kullanilan += adet;
    for (const parti of d.partiler) if (parti.bolge === bi) kullanilan += parti.adet;
    if (kullanilan + k.adet > kapasite) {
      return hata(`ordugah kapasitesi yetersiz: ${kullanilan} + ${k.adet} > ${kapasite}`);
    }
  }

  // Önce tüm malların yeterliliği denetlenir (atomik), sonra düşülür.
  const kalemler: { mal: number; miktar: Mili }[] = [];
  for (const malId of Object.keys(tanim.maliyet).sort()) {
    const mal = ic.malIndeks[malId];
    const stok = mal === undefined ? undefined : bolge.stoklar[mal];
    if (mal === undefined || !stok) return hata(`birlik maliyetinde bilinmeyen mal: ${malId}`);
    const miktar = (tanim.maliyet[malId] as number) * k.adet;
    if (anlikMiktar(stok, d.zaman) < miktar) return hata(`stok yetersiz: ${malId}`);
    kalemler.push({ mal, miktar });
  }
  kalemler.sort((a, b) => a.mal - b.mal);
  for (const { mal, miktar } of kalemler) stokEkle(d, ctx, bi, mal, -miktar);

  const id = ctx.yeniKimlik(d);
  const bitis = d.zaman + hizlandirilmisSure(d, ctx, oyuncu, tanim.partiSuresiSaat * SAAT);
  d.partiler.push({ id, sahip: oyuncu, bolge: bi, birlik: birlikIdx, adet: k.adet, bitis });
  ctx.planla(d, bitis, { tur: "parti_bitti", parti: id });
  return { tamam: true };
}

/**
 * Olay: parti_bitti. Bölge hâlâ parti sahibinindeyse birlikler[birlik] += adet. Bölge el
 * değiştirmişse parti boşa gider (birlik eklenmez). Parti her durumda listeden çıkar.
 */
export function partiBitti(d: Dunya, ctx: Baglam, partiId: number): void {
  const i = d.partiler.findIndex((p) => p.id === partiId);
  if (i < 0) return;
  const parti = d.partiler[i];
  if (!parti) return;
  d.partiler.splice(i, 1);
  const bolge = d.bolgeler[parti.bolge];
  if (!bolge || bolge.sahip !== parti.sahip) return;
  bolge.birlikler[parti.birlik] = (bolge.birlikler[parti.birlik] ?? 0) + parti.adet;
  ctx.kirlet(d);
}

/** Birlik başına ikmal tablosu [malIndeksi, miktar][] ; içerik başına bir kez hesaplanır (yalnızca önbellek). */
const ikmalOnbellegi = new WeakMap<DerlenmisIcerik, [number, Mili][][]>();

function ikmalTablosu(ic: DerlenmisIcerik): [number, Mili][][] {
  let t = ikmalOnbellegi.get(ic);
  if (t) return t;
  t = ic.birlikler.map((b) => {
    const satir: [number, Mili][] = [];
    for (const malId of Object.keys(b.ikmal).sort()) {
      const mi = ic.malIndeks[malId];
      if (mi !== undefined) satir.push([mi, b.ikmal[malId] as number]);
    }
    return satir;
  });
  ikmalOnbellegi.set(ic, t);
  return t;
}

/**
 * Lojistik kancası: bölgedeki birliklerin saatlik ikmal talebi (mal indeksine göre, mili-birim/saat).
 * Uzunluk = mal sayısı. Duruşa bakılmaz (savunma duruşu ikmal talebini artırmaz).
 */
export function ikmalTalebi(d: Dunya, ctx: Baglam, bolge: number): Mili[] {
  const ic = ctx.ic;
  const sonuc = new Array<number>(ic.mallar.length).fill(0);
  const b = d.bolgeler[bolge];
  if (!b) return sonuc;
  const carpan = ic.mulk !== undefined && b.merkez !== undefined ? (ic.param.askeri.ikmalCarpaniPpm ?? PPM) : PPM;
  const tablo = ikmalTablosu(ic);
  for (let bi = 0; bi < b.birlikler.length; bi++) {
    const adet = b.birlikler[bi] ?? 0;
    if (adet <= 0) continue;
    for (const [mal, miktar] of tablo[bi] ?? []) {
      const talep = adet * miktar;
      sonuc[mal] = (sonuc[mal] as number) + (carpan === PPM ? talep : carpBol(talep, carpan, PPM));
    }
  }
  return sonuc;
}
