/**
 * Mülk kipi (S3) test yardımcıları: mini-6 parsel fikstürüyle veri paketi, hücre seçimi ve kısa yollar.
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { ParselFiksturu } from "@bolge/veri";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import type { ArsaSinifi, CekirdekVeriPaketi, Komut, KomutSonucu, Ms } from "../src/tipler";

/** mini-6 + mini-6 parsel fikstürü; `parametreler.json`'daki `mulk` bloğu ile mülk kipi açık. */
export function mulkVeri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  duzenle?.(v);
  return v;
}

/** Fikstürde ilçenin `sinif` sınıfındaki uygun (ya da `uygun = false` ise uygun olmayan) hücreleri, fikstür sırasıyla. */
export function hucreSec(f: ParselFiksturu, ilce: string, sinif: ArsaSinifi, adet: number, atla = 0, uygun = true): string[] {
  const c = f.ilceler.find((x) => x.id === ilce);
  if (!c) throw new Error(`fiksturde ilce yok: ${ilce}`);
  const l = c.hucreler.filter((h) => h.sinif === sinif && h.uygun === uygun).map((h) => h.id);
  if (l.length < atla + adet) throw new Error(`ilcede yeterli ${sinif} hucre yok: ${ilce}`);
  return l.slice(atla, atla + adet);
}

/**
 * Fikstüre, `kaynakIl`in ilk ilçesinin kopyası olan ikinci bir il ekler (aynı merkez bölgeye bağlı): il içi havuz testi
 * için. Hücre kimliklerinin y'si `kayma` kadar kaydırılır.
 */
export function ikinciIlEkle(f: ParselFiksturu, kaynakIl: string, yeniIl: string, kayma = 10_000): void {
  const il = f.iller.find((x) => x.id === kaynakIl);
  const ilce = f.ilceler.find((x) => x.il === kaynakIl);
  if (!il || !ilce) throw new Error(`il yok: ${kaynakIl}`);
  f.iller.push({ id: yeniIl, ad: `${il.ad} 2`, bolge: il.bolge });
  f.ilceler.push({
    ...ilce,
    id: `${yeniIl}_merkez`,
    il: yeniIl,
    hucreler: ilce.hucreler.map((h) => {
      const [x, y] = h.id.split(":").map(Number) as [number, number];
      return { ...h, id: `${x}:${y + kayma}` };
    }),
  });
}

/** Mülk kipinde simülasyon; verilen oyuncular t = 0'da bölgesiz katılır. */
export function mulkSim(oyuncular: readonly string[] = ["a", "b"], veri: CekirdekVeriPaketi = mulkVeri(), tohum = 7): Simulasyon {
  const s = Simulasyon.olustur(veri, tohum);
  for (const o of oyuncular) {
    const r = s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [] } });
    if (!r.tamam) throw new Error(`katilim basarisiz: ${r.hata}`);
  }
  return s;
}

/** Komutu uygular (zaman dünyanın şimdiki anı ya da `t`). */
export function ver(s: Simulasyon, oyuncu: string, komut: Komut, t: Ms = s.dunya.zaman): KomutSonucu {
  return s.uygula({ t, oyuncu, komut });
}

/** Başarılı olmalı. */
export function tamam(s: Simulasyon, oyuncu: string, komut: Komut, t: Ms = s.dunya.zaman): void {
  const r = ver(s, oyuncu, komut, t);
  if (!r.tamam) throw new Error(`komut basarisiz (${komut.tur}): ${r.hata}`);
}
