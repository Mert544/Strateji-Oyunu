/**
 * Pazar fiyat kırılımı (B3, docs/08 §5.3 P1-P3): dünya referans fiyatı -> oyuncunun gerçek nakit akışı.
 *
 *   ithalat = ref x (PPM + makas/2) x (PPM + prim) x (PPM + tarife) x (PPM + komisyon)
 *   ihracat = ref x (PPM - makas/2) x (PPM - prim) x (PPM - ihracatVergisi) x (PPM - komisyon)
 *
 * Çarpanlar DEĞER üzerinde sırayla uygulanır (her adım `carpBol`, aşağı yuvarlar); böylece kesintiler tam tamsayı olarak
 * ayrışır ve toplamı korur: `brut = nakit +/- (makas + prim + komisyon)` (tarife ve ihracat vergisi hazineye geri yazılır:
 * B3'te tek hazine; net 0, defterde ayrı kalem). Pazar v1 kapalıyken prim, komisyon, tarife ve vergi 0'dır ve yalnız makas
 * çarpanı (eski ithalat/ihracat çarpanı) uygulanır: sonuç B3 öncesiyle birebir aynıdır.
 *
 * Risksiz arbitraj yoktur: ithalatın nakit bedeli her zaman >= brut değer >= ihracatın nakit geliri (aynı referans fiyat).
 */
import { pazarCarpanlari } from "../politika";
import { carpBol } from "../sabit";
import { PPM } from "../tipler";
import { hedefeYaklastir, ticaretIndirimi } from "../mulk/yapi";
import type { Baglam, BolgeDurumu, Dunya, OyuncuDurumu, TicaretKalemleri } from "../tipler";
import { pazarTablosu } from "./tablo";

/** Bir (oyuncu, liman) için tüm ticaret çarpanları (ppm). */
export interface TicaretCarpanlari {
  /** İthalat makas çarpanı (PPM + makas/2; pazar v1 kapalıyken eski ithalat çarpanı). */
  ithalatMakasPpm: number;
  /** İhracat makas çarpanı (PPM - makas/2). */
  ihracatMakasPpm: number;
  /** Liman primi (0..tavan). */
  primPpm: number;
  komisyonPpm: number;
  tarifePpm: number;
  ihracatVergisiPpm: number;
}

/** Bir ticaret işleminin kırılımı (mili-para/saat veya mili-para). */
export interface TicaretKirilimi {
  /** Hazineye net nakit etkisi: ihracatta gelir, ithalatta gider (tarife ve ihracat vergisi geri yazılmış). */
  nakit: number;
  /** NPC makası (piyasa yapıcının geliri). */
  makas: number;
  /** Liman primi (taşıma bedeli). */
  prim: number;
  /** İşlem komisyonu (sisteme). */
  komisyon: number;
  /** Tarife (ithalat) veya ihracat vergisi (devlet geliri; hazineye geri yazılmış, net 0). */
  vergi: number;
}

/** Oyuncunun yeni oyuncu koruması süresince komisyon, tarife ve ihracat vergisi yoktur (H6). */
export function ticaretKorumasindaMi(d: Dunya, o: OyuncuDurumu): boolean {
  return d.zaman < o.korumaBitis;
}

/**
 * Oyuncunun bu limandaki ticaret çarpanları. Pazar v1 kapalıysa yalnız eski makas çarpanları (prim/komisyon/tarife 0).
 * `liman`: bölge indeksi (liman primi için; mülk kipinde işletme düğümünün merkezi).
 *
 * `dugum` verilirse ve bir mülk kipi işletme düğümüyse (`merkez` tanımlı): (1) liman primi yalnız düğümün merkezi `liman`
 * etiketliyse uygulanır (limansız ilde yerel NPC pazarına satış primsizdir); (2) düğümdeki Ticaret ofisi yapıları komisyonu
 * ve makası azaltır (`mulk/yapi.ts`). `dugum` yoksa ya da bölge kipindeyse sonuç değişmez.
 */
export function ticaretCarpanlari(d: Dunya, ctx: Baglam, o: OyuncuDurumu, liman: number, dugum?: BolgeDurumu): TicaretCarpanlari {
  const c = temelTicaretCarpanlari(d, ctx, o, liman);
  if (dugum === undefined || dugum.merkez === undefined || ctx.ic.mulk === undefined) return c;
  const ind = ticaretIndirimi(ctx.ic, dugum);
  const limanli = dugum.etiketler.includes("liman");
  if (limanli && ind.komisyonIndirimPpm === 0 && ind.makasIndirimPpm === 0) return c;
  return {
    ithalatMakasPpm: hedefeYaklastir(c.ithalatMakasPpm, PPM, ind.makasIndirimPpm),
    ihracatMakasPpm: hedefeYaklastir(c.ihracatMakasPpm, PPM, ind.makasIndirimPpm),
    primPpm: limanli ? c.primPpm : 0,
    komisyonPpm: c.komisyonPpm - carpBol(c.komisyonPpm, ind.komisyonIndirimPpm, PPM),
    tarifePpm: c.tarifePpm,
    ihracatVergisiPpm: c.ihracatVergisiPpm,
  };
}

function temelTicaretCarpanlari(d: Dunya, ctx: Baglam, o: OyuncuDurumu, liman: number): TicaretCarpanlari {
  const m = pazarCarpanlari(d, ctx, o.id);
  const pz = pazarTablosu(ctx.ic);
  if (pz === null) {
    return { ithalatMakasPpm: m.ithalatPpm, ihracatMakasPpm: m.ihracatPpm, primPpm: 0, komisyonPpm: 0, tarifePpm: 0, ihracatVergisiPpm: 0 };
  }
  const korumada = ticaretKorumasindaMi(d, o);
  const rejim = o.ticaretRejimi;
  return {
    ithalatMakasPpm: m.ithalatPpm,
    ihracatMakasPpm: m.ihracatPpm,
    primPpm: pz.limanPrimPpm[liman] ?? 0,
    komisyonPpm: korumada ? 0 : pz.p.islemKomisyonuPpm,
    tarifePpm: korumada || rejim === undefined ? 0 : rejim.ithalatTarifePpm,
    ihracatVergisiPpm: korumada || rejim === undefined ? 0 : rejim.ihracatVergisiPpm,
  };
}

/** İhracat: `brut` = referans fiyat değeri. Çarpan 1 olan adımlar atlanır (eski tek çarpımla birebir aynı sonuç). */
export function ihracatKirilimi(brut: number, c: TicaretCarpanlari): TicaretKirilimi {
  const v1 = carpBol(brut, c.ihracatMakasPpm, PPM);
  const v2 = c.primPpm === 0 ? v1 : carpBol(v1, PPM - c.primPpm, PPM);
  const v3 = c.ihracatVergisiPpm === 0 ? v2 : carpBol(v2, PPM - c.ihracatVergisiPpm, PPM);
  const v4 = c.komisyonPpm === 0 ? v3 : carpBol(v3, PPM - c.komisyonPpm, PPM);
  return { nakit: v4 + (v2 - v3), makas: brut - v1, prim: v1 - v2, komisyon: v3 - v4, vergi: v2 - v3 };
}

/** İthalat: `brut` = referans fiyat değeri. */
export function ithalatKirilimi(brut: number, c: TicaretCarpanlari): TicaretKirilimi {
  const v1 = carpBol(brut, c.ithalatMakasPpm, PPM);
  const v2 = c.primPpm === 0 ? v1 : carpBol(v1, PPM + c.primPpm, PPM);
  const v3 = c.tarifePpm === 0 ? v2 : carpBol(v2, PPM + c.tarifePpm, PPM);
  const v4 = c.komisyonPpm === 0 ? v3 : carpBol(v3, PPM + c.komisyonPpm, PPM);
  return { nakit: v4 - (v3 - v2), makas: v1 - brut, prim: v2 - v1, komisyon: v4 - v3, vergi: v3 - v2 };
}

/**
 * Birim nakit çarpanları (ppm; botlar ve arayüz için): ithalatta 1 birimin referans fiyata oranı (>= PPM), ihracatta
 * (<= PPM). Tarife ve ihracat vergisi hazineye geri yazıldığından nakit çarpana girmez; `etiket*` onları da içerir
 * (arayüzdeki görünen fiyat). Pazar v1 kapalıysa yalnız makas.
 */
export function ticaretNakitCarpanlari(
  d: Dunya,
  ctx: Baglam,
  o: OyuncuDurumu,
  liman: number,
  dugum?: BolgeDurumu,
): { ithalatPpm: number; ihracatPpm: number; etiketIthalatPpm: number; etiketIhracatPpm: number } {
  const c = ticaretCarpanlari(d, ctx, o, liman, dugum);
  // PPM'lik referans değer üzerinden kırılım: sonuç doğrudan ppm çarpanıdır.
  const ith = ithalatKirilimi(PPM, c);
  const ihr = ihracatKirilimi(PPM, c);
  return { ithalatPpm: ith.nakit, ihracatPpm: ihr.nakit, etiketIthalatPpm: ith.nakit + ith.vergi, etiketIhracatPpm: ihr.nakit - ihr.vergi };
}

/** Boş kalem kümesi. */
export function sifirKalemler(): TicaretKalemleri {
  return { brutIhracat: 0, brutIthalat: 0, makas: 0, prim: 0, komisyon: 0, ithalatTarifesi: 0, ihracatVergisi: 0 };
}

/** Kalem kümesinin alan adları (sabit sıra). */
export const KALEM_ALANLARI = ["brutIhracat", "brutIthalat", "makas", "prim", "komisyon", "ithalatTarifesi", "ihracatVergisi"] as const;
