/** İçerik göçü testlerinin ortak yardımcıları (bellek, dosya ve pg depoları için aynı senaryo). */
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut } from "@bolge/cekirdek";
import type { Depo } from "../src/depo/tipler";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import type { YazarSecenekleri } from "../src/yazar";
import { GUNEY, KUZEY, veri } from "./yardimci";

export const TOHUM = 5;

/** İçeriğe SONA bir mal ekler (yalnız-ekle: yeni kimlik; mevcut indeksler değişmez). */
export function sonaMal(): CekirdekVeriPaketi {
  const v = veri();
  v.icerik.mallar.push({ id: "titanyum", ad: "Titanyum", kategori: "ara", tabanFiyat: 45_000, lojistikOnceligi: 9, bozulmaPpmGun: 0 });
  return v;
}

/** İçeriğe ARAYA bir mal ekler (indeksler kayar: yalnız-ekle ihlali). */
export function arayaMal(): CekirdekVeriPaketi {
  const v = veri();
  v.icerik.mallar.splice(3, 0, { id: "titanyum", ad: "Titanyum", kategori: "ara", tabanFiyat: 45_000, lojistikOnceligi: 9, bozulmaPpmGun: 0 });
  return v;
}

export function komutlar(adim: number): Array<[string, Komut]> {
  return [
    ["ali", { tur: "vergi_ayarla", oranPpm: 80_000 + adim * 1_000 }],
    ["ali", { tur: "tesis_insa", bolge: KUZEY[adim % 3] as string, tesisTuru: adim % 2 ? "ciftlik" : "gida_fabrikasi" }],
    ["veli", { tur: "savunma_emri", bolge: GUNEY[adim % 3] as string, durus: adim % 2 ? "savunma" : "normal" }],
  ];
}

export async function ac(depo: Depo, v: CekirdekVeriPaketi, saat: ElleSaat, ek: Partial<YazarSecenekleri> = {}): Promise<DunyaYazari> {
  return DunyaYazari.ac({ veri: v, tohum: TOHUM, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, ...ek });
}

/** Eski içerikle dünya kurar, 30 sim-saat koşturur, düzgün kapatır (kapanış görüntüsü; kuyruk boş). */
export async function eskiDunya<D extends Depo>(depo: D): Promise<{ depo: D; t: number; ozet: string; seq: number }> {
  const saat = new ElleSaat();
  const y = await ac(depo, veri(), saat);
  let n = 0;
  const gonder = async (o: string, k: Komut): Promise<void> => {
    const p = y.komutGonder(o, "test", `a${n++}`, k);
    await y.birTur();
    await p;
  };
  await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
  await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY });
  for (let adim = 1; adim <= 10; adim++) {
    saat.ilerlet(adim * 3 * SAAT);
    for (const [o, k] of komutlar(adim)) await gonder(o, k);
  }
  const ozet = y.ozet();
  await y.kapat();
  return { depo, t: ozet.t, ozet: ozet.durumOzeti, seq: ozet.seq };
}

