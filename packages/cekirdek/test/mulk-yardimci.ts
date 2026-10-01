/**
 * Mülk kipi (S3) test yardımcıları: mini-6 parsel fikstürüyle veri paketi, hücre seçimi ve kısa yollar.
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { ParselFiksturu } from "@bolge/veri";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import type { ArsaSinifi, CekirdekVeriPaketi, Komut, KomutSonucu, Ms } from "../src/tipler";

/**
 * mini-6 + mini-6 parsel fikstürü; `parametreler.json`'daki `mulk` bloğu ile mülk kipi açık. YENİ OYUNCU PAKETİ KAPALIDIR
 * (bedava yurt, ilk yapı indirimi, ayrılmış hücre = 0): hücreleri ve maliyetleri elle seçen eski testlerin varsayımları
 * korunur. Paketin kendisi için `mulkVeriTam` kullanılır (kalkan 14 gün her iki durumda geçerlidir).
 */
export function mulkVeri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  const v = mulkVeriTam((x) => {
    const yo = (x.param.mulk as NonNullable<typeof x.param.mulk>).yeniOyuncu;
    yo.yurtHucre = 0;
    yo.ilkYapiIndirimPpm = 0;
    yo.indirimliYapiSayisi = 0;
    yo.ayrilmisHucrePpm = 0;
  });
  duzenle?.(v);
  return v;
}

/** `mulkVeri` ile aynı, ama `parametreler.json`'daki yeni oyuncu paketi (yurt, indirim, ayrılmış hücre) açık. */
export function mulkVeriTam(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  // Kamu arsası (docs/06 §15.6) KAPALI: mini-6 ilçeleri ~85 uygun hücre; lider kararındaki 20 hücrelik mahalle paketi ilçenin ~%40'ını alırdı.
  // Eski mülk testlerinin sayı ve hücre varsayımları (72/%25 sınırları, hücre seçimi, yurt) korunur; kamu kuralı `mulk-kamu.test.ts`'te sınanır.
  delete v.param.mulk?.kamu;
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
 * Yapı yerleşimi için kenar-bitişik grup: ilçenin `sinif` sınıfındaki uygun hücrelerinden, yatayda ardışık `adet` hücrelik, birbirine
 * ayrık grupların `kume`. (0'dan) sayılanı (fikstür sırasıyla). Yol hücreleri aralarda boşluk bıraktığı için `hucreSec` dilimleri
 * bitişik olmayabilir; `tesis_insa_hucre` / `yapi_yerlestir` kenar-bitişik küme ister.
 */
export function bitisikGrup(f: ParselFiksturu, ilce: string, sinif: ArsaSinifi, adet: number, kume = 0): string[] {
  const c = f.ilceler.find((x) => x.id === ilce);
  if (!c) throw new Error(`fiksturde ilce yok: ${ilce}`);
  const uygun = new Set(c.hucreler.filter((h) => h.uygun && h.sinif === sinif).map((h) => h.id));
  const kullanildi = new Set<string>();
  let sayac = 0;
  for (const h of c.hucreler) {
    if (!uygun.has(h.id) || kullanildi.has(h.id)) continue;
    const [x, y] = h.id.split(":").map(Number) as [number, number];
    const grup = Array.from({ length: adet }, (_, i) => `${x + i}:${y}`);
    if (!grup.every((g) => uygun.has(g) && !kullanildi.has(g))) continue;
    for (const g of grup) kullanildi.add(g);
    if (sayac++ === kume) return grup;
  }
  throw new Error(`ilcede yeterli bitisik ${sinif} grup yok: ${ilce}`);
}

/** Kimlik listesinden kenar-bitişik (4 komşuluk) ilk çift; yoksa hata. */
export function bitisikCift(idler: readonly string[], atla: readonly string[] = []): [string, string] {
  const kume = new Set(idler.filter((i) => !atla.includes(i)));
  for (const id of [...kume].sort()) {
    const [x, y] = id.split(":").map(Number) as [number, number];
    for (const k of [`${x + 1}:${y}`, `${x}:${y + 1}`, `${x - 1}:${y}`, `${x}:${y - 1}`]) if (kume.has(k)) return [id, k].sort() as [string, string];
  }
  throw new Error("kenar-bitisik cift yok");
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
