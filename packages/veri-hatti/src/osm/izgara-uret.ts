/**
 * İlçe z20 hücre ızgarası üretimi: içerde maskesi + z15 karolarından uygunluk.
 * Çıktı yoğun dizilerdir (maske çerçevesinde satır-öncelikli): durum baytı ve bina yüzdesi.
 */
import { KARO_HUCRE } from "./izgara-geometri";
import type { IcerdeMaskesi } from "./izgara-sinir";
import type { YerelPmtiles } from "./izgara-pmtiles";
import {
  Bit,
  ENGEL_MASKESI,
  KATMAN_SAYISI,
  SINIF_ADLARI,
  Sinif,
  VARSAYILAN_SECENEKLER,
  durumSinifi,
  hucreDurumu,
  karoyuOrnekle,
  kotayaSayilir,
  metrePerBirim,
  sekilleriAyikla,
  type UygunlukSecenekleri,
} from "./izgara-uygunluk";

export interface IzgaraSonucu {
  maske: IcerdeMaskesi;
  /** Hücre durum baytı (0 = dışarıda), maske çerçevesinde. */
  durum: Uint8Array;
  /** Bina kapsama yüzdesi (0..100). */
  binaYuzde: Uint8Array;
  /** Ham katman sayaçları (hücre başına KATMAN_SAYISI bayt) — eşik duyarlılık analizi için. */
  sayac: Uint8Array;
  /** İşlenen / bulunamayan z15 karo sayısı. */
  islenenKaro: number;
  eksikKaro: number;
}

/** Arşivdeki z15 karolarıyla maskedeki her hücreyi sınıflandırır. Deterministik. */
export function izgaraUret(
  arsiv: YerelPmtiles,
  maske: IcerdeMaskesi,
  secenek: UygunlukSecenekleri = VARSAYILAN_SECENEKLER,
): IzgaraSonucu {
  const { x0, y0, genislik, yukseklik, icerde } = maske;
  const n = genislik * yukseklik;
  const durum = new Uint8Array(n);
  const binaYuzde = new Uint8Array(n);
  const sayacTum = new Uint8Array(n * KATMAN_SAYISI);
  const tx0 = x0 >>> 5;
  const ty0 = y0 >>> 5;
  const tx1 = (x0 + genislik - 1) >>> 5;
  const ty1 = (y0 + yukseklik - 1) >>> 5;
  let islenenKaro = 0;
  let eksikKaro = 0;
  for (let ty = ty0; ty <= ty1; ty++) {
    for (let tx = tx0; tx <= tx1; tx++) {
      // Karoda içeride hücre var mı?
      const hucreler: [number, number, number][] = [];
      for (let hy = 0; hy < KARO_HUCRE; hy++) {
        const y = ty * KARO_HUCRE + hy - y0;
        if (y < 0 || y >= yukseklik) continue;
        for (let hx = 0; hx < KARO_HUCRE; hx++) {
          const x = tx * KARO_HUCRE + hx - x0;
          if (x < 0 || x >= genislik) continue;
          if (icerde[y * genislik + x]) hucreler.push([hx, hy, y * genislik + x]);
        }
      }
      if (hucreler.length === 0) continue;
      const vt = arsiv.vektorKaro(15, tx, ty);
      let sayac: Uint8Array;
      if (vt) {
        islenenKaro++;
        const extent = Object.values(vt.layers)[0]?.extent ?? 4096;
        sayac = karoyuOrnekle(sekilleriAyikla(vt, secenek), extent, metrePerBirim(ty, extent), secenek.ornek);
      } else {
        eksikKaro++;
        sayac = new Uint8Array(KARO_HUCRE * KARO_HUCRE * KATMAN_SAYISI);
      }
      for (const [hx, hy, i] of hucreler) {
        const of = (hy * KARO_HUCRE + hx) * KATMAN_SAYISI;
        const h = hucreDurumu(sayac, of, secenek);
        durum[i] = h.durum;
        binaYuzde[i] = h.binaYuzde;
        sayacTum.set(sayac.subarray(of, of + KATMAN_SAYISI), i * KATMAN_SAYISI);
      }
    }
  }
  return { maske, durum, binaYuzde, sayac: sayacTum, islenenKaro, eksikKaro };
}

export interface IzgaraIstatistigi {
  /** İlçedeki tüm hücreler (su dahil). */
  icerdeTum: number;
  /** Su hücreleri (SU biti; karasuları, göl, nehir) — kota ve sayımlardan hariç. */
  suHucre: number;
  /** Kota tabanı: ilçedeki su olmayan hücreler. Aşağıdaki tüm sayımlar bu küme üzerindendir. */
  toplam: number;
  satinAlinabilir: number;
  engel: { yol: number; askeri: number; herhangi: number };
  binaKesisen: number;
  /** Satın alınabilir hücrelerde bina kesişimi olanlar. */
  binaKesisenUygun: number;
  sinif: Record<string, number>;
  sinifUygun: Record<string, number>;
}

export function izgaraIstatistigi(durum: Uint8Array): IzgaraIstatistigi {
  const st: IzgaraIstatistigi = {
    icerdeTum: 0,
    suHucre: 0,
    toplam: 0,
    satinAlinabilir: 0,
    engel: { yol: 0, askeri: 0, herhangi: 0 },
    binaKesisen: 0,
    binaKesisenUygun: 0,
    sinif: Object.fromEntries(SINIF_ADLARI.map((a) => [a, 0])),
    sinifUygun: Object.fromEntries(SINIF_ADLARI.map((a) => [a, 0])),
  };
  for (const d of durum) {
    if (!(d & Bit.ICERIDE)) continue;
    st.icerdeTum++;
    if (!kotayaSayilir(d)) {
      st.suHucre++;
      continue;
    }
    st.toplam++;
    const ad = SINIF_ADLARI[durumSinifi(d)] ?? "diger";
    st.sinif[ad]!++;
    if (d & Bit.YOL) st.engel.yol++;
    if (d & Bit.ASKERI) st.engel.askeri++;
    if (d & Bit.BINA) st.binaKesisen++;
    if (d & ENGEL_MASKESI) st.engel.herhangi++;
    else {
      st.satinAlinabilir++;
      st.sinifUygun[ad]!++;
      if (d & Bit.BINA) st.binaKesisenUygun++;
    }
  }
  return st;
}

/**
 * Eşik duyarlılığı: ham sayaçlardan, verilen eşiklerle satın alınabilir hücre sayısı. Su sayacı
 * eşiği aşan hücreler (o kurala göre su) kota tabanından (`kara`) çıkarılır. Kentsel = bina
 * kapsaması >= %10 ya da sınıf konut/yapılı. (Durum baytını yeniden üretmeden kuralları kıyaslamak için.)
 */
export function esikDuyarliligi(
  sonuc: IzgaraSonucu,
  esik: { yol: number; su: number; askeri: number },
): { kara: number; uygun: number; kentsel: number; kentselUygun: number } {
  let kara = 0;
  let uygun = 0;
  let kentsel = 0;
  let kentselUygun = 0;
  const { icerde } = sonuc.maske;
  const s = sonuc.sayac;
  for (let i = 0; i < icerde.length; i++) {
    if (!icerde[i]) continue;
    const o = i * KATMAN_SAYISI;
    if (s[o + 1]! >= esik.su) continue;
    kara++;
    const sinif = durumSinifi(sonuc.durum[i]!);
    const k = sonuc.binaYuzde[i]! >= 10 || sinif === Sinif.KONUT || sinif === Sinif.YAPILI;
    if (k) kentsel++;
    if (s[o]! >= esik.yol || s[o + 2]! >= esik.askeri) continue;
    uygun++;
    if (k) kentselUygun++;
  }
  return { kara, uygun, kentsel, kentselUygun };
}
