/**
 * Sanayi (B2) testleri için ortak yardımcılar: mini harita + sanayi açık (varsayılan sanayi parametreleri) + başlangıç santrali.
 */
import type { VeriPaketi } from "@bolge/veri";
import type { BolgeDurumu, TesisDurumu } from "../src/tipler";
import type { Simulasyon } from "../src/motor";
import { bolge, kur } from "./ekonomi-yardimci";
import type { KurulumSecenegi } from "./ekonomi-yardimci";
import { sanayiAc, tarimAc } from "./yenilikler";

/** Haritadaki bölgenin başlangıç tesislerine tür ekler (mini-6 bölge kimlikleri). */
export function tesisEkle(v: VeriPaketi, bolgeId: string, ...turler: string[]): void {
  const b = v.harita.bolgeler.find((x) => x.id === bolgeId);
  if (!b) throw new Error(`bilinmeyen bolge: ${bolgeId}`);
  b.tesisler.push(...turler);
}

/** Bütün ham olmayan malların başlangıç stokunu depo tavanına çıkarır (girdi kıtlığı testi bozmasın). */
export function stokDoldur(v: VeriPaketi): void {
  for (const m of v.icerik.mallar) {
    if (m.depolanabilir === false) continue;
    v.param.baslangic.stok[m.id] = v.param.ekonomi.depoKapasitesi;
  }
}

export interface SanayiKurulum extends KurulumSecenegi {
  /** Tarım katmanı da açılsın mı (varsayılan kapalı). */
  tarim?: boolean;
  /** Bölge -> eklenecek başlangıç tesisleri. */
  tesisler?: Record<string, string[]>;
  /** Girdi kıtlığı olmasın diye stoklar doldurulsun (varsayılan true). */
  doldur?: boolean;
}

/** Sanayi açık mini dünya: oyuncular, santraller ve stoklar ayarlı. */
export function kurSanayi(sec: SanayiKurulum = {}): { s: Simulasyon; veri: VeriPaketi } {
  return kur({
    ...sec,
    duzenle: (v) => {
      sanayiAc(v);
      // mini-6'nın başlangıç santralleri sanayi testlerinde kontrollü kurulum için sökülür; testler `tesisler` ile ekler.
      for (const b of v.harita.bolgeler) b.tesisler = b.tesisler.filter((t) => t !== "santral" && t !== "hidro_santrali");
      if (sec.tarim === true) tarimAc(v);
      if (sec.doldur !== false) stokDoldur(v);
      for (const [b, turler] of Object.entries(sec.tesisler ?? {})) tesisEkle(v, b, ...turler);
      sec.duzenle?.(v);
    },
  });
}

/** Bölgedeki ilk (verilen türde) tesis. */
export function tesisBul(s: Simulasyon, bolgeId: string, turId: string): TesisDurumu {
  const b: BolgeDurumu = bolge(s, bolgeId);
  const ti = s.ic.tesisTuruIndeks[turId];
  const ts = b.tesisler.find((t) => t.tur === ti);
  if (!ts) throw new Error(`tesis yok: ${bolgeId}/${turId}`);
  return ts;
}

/** Tüm bölgelerin tüm tesislerini kapatır (yalnız seçilenler çalışsın). */
export function hepsiniKapat(s: Simulasyon): void {
  for (const b of s.dunya.bolgeler) for (const t of b.tesisler) t.aktif = false;
}

/** Santral çıktısını (komur_santrali) sabit bir değere indirir: brownout testleri için kapasiteyi kontrollü kılar. */
export function santralKapasitesi(v: VeriPaketi, elektrikMili: number): void {
  const y = v.icerik.yontemler.find((x) => x.id === "komur_santrali");
  if (!y) throw new Error("komur_santrali yok");
  y.ciktilar["elektrik"] = elektrikMili;
}

/** Sanayi parametrelerinden ölçek/aşınma gibi değerlere erişim kısayolu. */
export function sanayiParam(s: Simulasyon) {
  const p = s.ic.param.sanayi;
  if (!p) throw new Error("sanayi kapali");
  return p;
}

