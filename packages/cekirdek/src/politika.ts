/**
 * Politika alt sistemi (spesifikasyon §8): anlaşmalar, yaptırımlar, pazar çarpanları.
 *
 * Deterministik sıra: `d.anlasmalar` (taraflar[0], taraflar[1], tur) ve `d.yaptirimlar`
 * (uygulayan, hedef) anahtarlarına göre sıralı tutulur; ekleme sırasından bağımsızdır.
 * Anlaşma listeleri küçüktür; kenarKullanilabilirMi/pazarCarpanlari doğrudan tarama yapar.
 */
import { oyuncuBul } from "./stok";
import type { AnlasmaDurumu, Baglam, Dunya, Komut, KomutSonucu, OyuncuId, YaptirimDurumu } from "./tipler";

function hata(mesaj: string): KomutSonucu {
  return { tamam: false, hata: mesaj };
}

/** Dize karşılaştırması (JS sıralaması, oyuncuBul ile tutarlı). */
function karsilastir(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

function anlasmaSirasi(a: AnlasmaDurumu, b: AnlasmaDurumu): number {
  return (
    karsilastir(a.taraflar[0], b.taraflar[0]) ||
    karsilastir(a.taraflar[1], b.taraflar[1]) ||
    karsilastir(a.tur, b.tur)
  );
}

function yaptirimSirasi(a: YaptirimDurumu, b: YaptirimDurumu): number {
  return karsilastir(a.uygulayan, b.uygulayan) || karsilastir(a.hedef, b.hedef);
}

/** Sıralı dizide karşılaştırmaya göre ekleme konumu (ilk büyük eleman). */
function eklemeKonumu<T>(dizi: T[], yeni: T, sira: (a: T, b: T) => number): number {
  let konum = dizi.findIndex((x) => sira(x, yeni) > 0);
  if (konum < 0) konum = dizi.length;
  return konum;
}

/** Komut: anlasma_teklif, anlasma_feshet, yaptirim. */
export function politikaKomutu(d: Dunya, _ctx: Baglam, oyuncu: OyuncuId, k: Komut): KomutSonucu {
  switch (k.tur) {
    case "anlasma_teklif": {
      if (k.karsi === oyuncu) return hata("kendinizle anlasma yapilamaz");
      if (!oyuncuBul(d, k.karsi)) return hata(`bilinmeyen oyuncu: ${k.karsi}`);
      const taraflar: [OyuncuId, OyuncuId] = oyuncu < k.karsi ? [oyuncu, k.karsi] : [k.karsi, oyuncu];
      let kayit = d.anlasmalar.find(
        (a) => a.tur === k.anlasma && a.taraflar[0] === taraflar[0] && a.taraflar[1] === taraflar[1],
      );
      if (!kayit) {
        kayit = { tur: k.anlasma, taraflar, teklifler: [], aktif: false };
        d.anlasmalar.splice(eklemeKonumu(d.anlasmalar, kayit, anlasmaSirasi), 0, kayit);
      }
      if (!kayit.teklifler.includes(oyuncu)) {
        kayit.teklifler.push(oyuncu);
        kayit.teklifler.sort(karsilastir);
      }
      if (kayit.teklifler.includes(taraflar[0]) && kayit.teklifler.includes(taraflar[1])) kayit.aktif = true;
      return { tamam: true };
    }
    case "anlasma_feshet": {
      if (k.karsi === oyuncu) return hata("kendinizle anlasma yoktur");
      const t0 = oyuncu < k.karsi ? oyuncu : k.karsi;
      const t1 = oyuncu < k.karsi ? k.karsi : oyuncu;
      const i = d.anlasmalar.findIndex((a) => a.tur === k.anlasma && a.taraflar[0] === t0 && a.taraflar[1] === t1);
      if (i < 0) return hata("boyle bir anlasma veya teklif yok");
      d.anlasmalar.splice(i, 1);
      return { tamam: true };
    }
    case "yaptirim": {
      if (k.hedef === oyuncu) return hata("kendinize yaptirim uygulanamaz");
      if (!oyuncuBul(d, k.hedef)) return hata(`bilinmeyen oyuncu: ${k.hedef}`);
      const i = d.yaptirimlar.findIndex((y) => y.uygulayan === oyuncu && y.hedef === k.hedef);
      if (k.aktif) {
        if (i < 0) {
          const yeni: YaptirimDurumu = { uygulayan: oyuncu, hedef: k.hedef };
          d.yaptirimlar.splice(eklemeKonumu(d.yaptirimlar, yeni, yaptirimSirasi), 0, yeni);
        }
      } else if (i >= 0) {
        d.yaptirimlar.splice(i, 1);
      }
      return { tamam: true };
    }
    default:
      return hata(`politika alt sistemi bu komutu bilmiyor: ${k.tur}`);
  }
}

/** a ve b arasında aktif "ortak_altyapi" anlaşması var mı? */
function ortakAltyapiVarMi(d: Dunya, a: OyuncuId, b: OyuncuId): boolean {
  for (const an of d.anlasmalar) {
    if (an.tur !== "ortak_altyapi" || !an.aktif) continue;
    if ((an.taraflar[0] === a && an.taraflar[1] === b) || (an.taraflar[0] === b && an.taraflar[1] === a)) return true;
  }
  return false;
}

/**
 * Oyuncu bu kenarı lojistikte kullanabilir mi? Kural: kenarın iki ucunun sahibi de oyuncu ya da
 * oyuncuyla AKTİF "ortak_altyapi" anlaşması olan bir oyuncu olmalıdır. Sahipsiz uç -> false.
 */
export function kenarKullanilabilirMi(d: Dunya, _ctx: Baglam, oyuncu: OyuncuId, kenar: number): boolean {
  const k = d.kenarlar[kenar];
  if (!k) return false;
  const a = d.bolgeler[k.a]?.sahip ?? null;
  const b = d.bolgeler[k.b]?.sahip ?? null;
  if (a === null || b === null) return false;
  return (a === oyuncu || ortakAltyapiVarMi(d, oyuncu, a)) && (b === oyuncu || ortakAltyapiVarMi(d, oyuncu, b));
}

/**
 * Oyuncunun dünya pazarı fiyat çarpanları (ppm). Öncelik: yaptırım (oyuncuya en az bir yaptırım
 * uygulanıyorsa) > aktif "ticaret" anlaşması > varsayılan.
 */
export function pazarCarpanlari(
  d: Dunya,
  ctx: Baglam,
  oyuncu: OyuncuId,
): { ithalatPpm: number; ihracatPpm: number } {
  const p = ctx.ic.param.pazar;
  for (const y of d.yaptirimlar) {
    if (y.hedef === oyuncu) {
      return { ithalatPpm: p.yaptirimIthalatCarpaniPpm, ihracatPpm: p.yaptirimIhracatCarpaniPpm };
    }
  }
  for (const an of d.anlasmalar) {
    if (an.tur === "ticaret" && an.aktif && (an.taraflar[0] === oyuncu || an.taraflar[1] === oyuncu)) {
      return { ithalatPpm: p.anlasmaIthalatCarpaniPpm, ihracatPpm: p.anlasmaIhracatCarpaniPpm };
    }
  }
  return { ithalatPpm: p.ithalatCarpaniPpm, ihracatPpm: p.ihracatCarpaniPpm };
}
