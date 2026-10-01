/**
 * Pazar katmanı (B3, docs/08 §5) için içerikten türetilmiş sabit tablolar.
 * Dünya durumuna girmez; DerlenmisIcerik başına bir kez üretilip önbelleklenir.
 *
 * Pazar v1 "açık" sayılır: `param.pazar` B3 ek alanlarını (makas, prim, komisyon, kıtlık, tarife...) taşıyorsa. Kapalıyken
 * `pazarTablosu` null döner ve çekirdek Sanayi v1 davranışını birebir verir (liman primi, komisyon, kıtlık cezası, NPC
 * likidite ölçeği yok; `Dunya`'ya yeni alan yazılmaz).
 */
import type { PazarEkAlanlari } from "@bolge/veri";
import { PPM } from "../tipler";
import type { DerlenmisIcerik } from "../tipler";

/** Zorunlu alanlı (açık) pazar parametreleri: B3 ek alanları. */
export type PazarAcikParametreleri = PazarEkAlanlari;

export interface PazarTablosu {
  p: PazarAcikParametreleri;
  /**
   * Bölge indeksi -> liman primi (ppm): min(limanPrimTavaniPpm, dunyaMesafeSaat x limanPrimPpmSaat). `liman` tanımı olmayan
   * bölge (limansız ya da tanımsız) 0 (dünya kapısı gibi) sayılır: yükleyici (`limanlariTamamla`) tanımı doldurur.
   */
  limanPrimPpm: number[];
  /** "yakit" malının indeksi (kıtlık: yakıt karşılanması); yoksa -1. */
  yakitMal: number;
}

const onbellek = new WeakMap<DerlenmisIcerik, PazarTablosu | null>();

/** Pazar v1 açıksa tabloyu (önbellekli) döndürür, kapalıysa null. */
export function pazarTablosu(ic: DerlenmisIcerik): PazarTablosu | null {
  const mevcut = onbellek.get(ic);
  if (mevcut !== undefined) return mevcut;
  const tablo = tabloUret(ic);
  onbellek.set(ic, tablo);
  return tablo;
}

function tabloUret(ic: DerlenmisIcerik): PazarTablosu | null {
  const pp = ic.param.pazar;
  // Doğrulayıcı "ya hiçbiri ya hepsi" kuralını uygular; burada makasPpm kapı bekçisidir, diğerleri hazır varsayılır.
  if (
    pp.makasPpm === undefined ||
    pp.anlasmaMakasPpm === undefined ||
    pp.yaptirimMakasPpm === undefined ||
    pp.limanPrimPpmSaat === undefined ||
    pp.limanPrimTavaniPpm === undefined ||
    pp.islemKomisyonuPpm === undefined ||
    pp.npcLikiditeTabanOyuncu === undefined ||
    pp.kitlik === undefined ||
    pp.tarife === undefined
  ) {
    return null;
  }
  const p: PazarAcikParametreleri = {
    makasPpm: pp.makasPpm,
    anlasmaMakasPpm: pp.anlasmaMakasPpm,
    yaptirimMakasPpm: pp.yaptirimMakasPpm,
    limanPrimPpmSaat: pp.limanPrimPpmSaat,
    limanPrimTavaniPpm: pp.limanPrimTavaniPpm,
    islemKomisyonuPpm: pp.islemKomisyonuPpm,
    npcLikiditeTabanOyuncu: pp.npcLikiditeTabanOyuncu,
    kitlik: pp.kitlik,
    tarife: pp.tarife,
  };
  const limanPrimPpm = ic.harita.bolgeler.map((b) => {
    if (b.liman === undefined) return 0;
    const prim = b.liman.dunyaMesafeSaat * p.limanPrimPpmSaat;
    return prim > p.limanPrimTavaniPpm ? p.limanPrimTavaniPpm : prim;
  });
  return { p, limanPrimPpm, yakitMal: ic.malIndeks["yakit"] ?? -1 };
}

/** NPC likidite ölçeği (ppm): oyuncu sayısı taban değerin üstüne çıkınca orantılı büyür (docs/08 §5.3 P2), aksi halde PPM. */
export function npcLikiditeOlcekPpm(pz: PazarTablosu | null, oyuncuSayisi: number): number {
  if (pz === null) return PPM;
  const taban = pz.p.npcLikiditeTabanOyuncu;
  if (oyuncuSayisi <= taban) return PPM;
  return Math.floor((PPM * oyuncuSayisi) / taban);
}
