/**
 * Sanayi katmanı (B2) için içerikten türetilmiş sabit tablolar (docs/08 §2).
 * Dünya durumuna girmez; DerlenmisIcerik başına bir kez üretilip önbelleklenir.
 *
 * Sanayi "açık" sayılır: `param.sanayi` tanımlıysa. Kapalıyken `sanayiTablosu` null döner ve çekirdek Tarım v1
 * davranışını birebir verir (elektrik/ölçek/aşınma/kirlilik/damar kuralları uygulanmaz, `Dunya`'ya yeni alan yazılmaz).
 */
import type { SanayiParametreleri } from "@bolge/veri";
import { hasatEnterpole, hasatGunlukNormallestir, tarimTablosu } from "../tarim/tablo";
import { PPM } from "../tipler";
import type { DerlenmisIcerik, Ms } from "../tipler";
import { mutlakTakvimGunu } from "../tarim/iklim";

/** Takvim yok (tarım kapalı) iken hidro eğrisi için varsayılan ay uzunlukları. */
const AY_GUNLERI: readonly number[] = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export interface SanayiTablosu {
  p: SanayiParametreleri;
  /** elektrik malının indeksi. */
  elektrikMal: number;
  /** Yöntem indeksi -> tam verimde S ölçekte elektrik girdisi (mili-birim/saat; santralde 0). */
  yontemElektrikGirdi: number[];
  /** Yöntem indeksi -> tam verimde S ölçekte elektrik çıktısı (mili-birim/saat; santral olmayanda 0). */
  yontemElektrikCikti: number[];
  /** Yöntem indeksi -> saatlik emisyon (ppm; tam verim, S ölçek). */
  yontemKirlilik: number[];
  /** Yöntem indeksi -> hidro santral yöntemi mi. */
  yontemHidro: boolean[];
  /** Hane elektrik tüketimi: 1000 kişi başına mili-birim/saat. */
  haneElektrik: number;
  /** Takvim günü (0..364) -> akarsu çarpanı (ppm; yıllık ortalama tam PPM). */
  akarsuGunluk: number[];
  /** Ölçek kademesi -> gerekli teknoloji indeksi (yoksa -1). */
  olcekTeknoloji: number[];
  /** Mal indeksi -> keşif sondajına konu olabilir mi (ham ve tarımsal olmayan rezerv). */
  hamMal: boolean[];
}

const onbellek = new WeakMap<DerlenmisIcerik, SanayiTablosu | null>();

/** Sanayi açıksa tabloyu (önbellekli) döndürür, kapalıysa null. Tutarsız veri (elektrik malı yok) hata fırlatır. */
export function sanayiTablosu(ic: DerlenmisIcerik): SanayiTablosu | null {
  const mevcut = onbellek.get(ic);
  if (mevcut !== undefined) return mevcut;
  const tablo = tabloUret(ic);
  onbellek.set(ic, tablo);
  return tablo;
}

function tabloUret(ic: DerlenmisIcerik): SanayiTablosu | null {
  const p = ic.param.sanayi;
  if (p === undefined) return null;
  const elektrikMal = ic.malIndeks["elektrik"];
  if (elektrikMal === undefined) throw new Error('sanayi acik ama icerikte "elektrik" mali yok');
  if (ic.mallar[elektrikMal]?.depolanabilir !== false) throw new Error('"elektrik" mali depolanabilir: false olmali');

  const yontemElektrikGirdi = ic.yontemler.map((y) => y.girdiler["elektrik"] ?? 0);
  const yontemElektrikCikti = ic.yontemler.map((y) => y.ciktilar["elektrik"] ?? 0);
  const yontemKirlilik = ic.yontemler.map((y) => y.kirlilikPpmSaat ?? 0);
  const yontemHidro = ic.yontemler.map((y) => y.hidro === true);

  const ayGunleri = ic.param.iklim?.ayGunleri ?? AY_GUNLERI;
  const gunluk: number[] = [];
  for (let g = 0; g < 365; g++) gunluk.push(hasatEnterpole(p.hidro.akarsuEgrisiPpm, ayGunleri, g));
  const akarsuGunluk = hasatGunlukNormallestir(gunluk);

  const olcekTeknoloji = p.olcekKademeleri.map((k) => (k.gerekliTeknoloji === null ? -1 : (ic.teknolojiIndeks[k.gerekliTeknoloji] ?? -1)));
  const hamMal = ic.mallar.map((m) => m.kategori === "ham");

  return {
    p,
    elektrikMal,
    yontemElektrikGirdi,
    yontemElektrikCikti,
    yontemKirlilik,
    yontemHidro,
    haneElektrik: ic.param.nufus.tuketim1000Saat["elektrik"] ?? 0,
    akarsuGunluk,
    olcekTeknoloji,
    hamMal,
  };
}

/** t anındaki akarsu çarpanı (ppm): tarım takvimi açıksa takvim gününe göre, kapalıysa PPM (mevsim yok). */
export function akarsuCarpani(sn: SanayiTablosu, ic: DerlenmisIcerik, t: Ms): number {
  const tt = tarimTablosu(ic);
  if (tt === null) return PPM;
  const gun = mutlakTakvimGunu(tt.iklim.baslangicGunu, tt.iklim.gunCarpani, t) % 365;
  return sn.akarsuGunluk[gun < 0 ? gun + 365 : gun] as number;
}

