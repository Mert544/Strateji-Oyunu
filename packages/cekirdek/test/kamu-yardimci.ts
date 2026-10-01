/**
 * Kamu arsası (docs/06 §15.6) test yardımcıları: kamu bloklu veri paketi ve yoğun sentetik ilçe fikstürü.
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { MulkKamuParametreleri, ParselFiksturu, ParselHucreTanimi } from "@bolge/veri";
import { kamuGruplariGenislet, kamuKumeleriHesapla } from "../src/mulk/kamu";
import type { CekirdekVeriPaketi, KamuGrubu, KamuKumesi } from "../src/tipler";

/** Baş liderin kararı (docs/12 §10): parametreler.json'daki varsayılanlarla aynı. */
export const KAMU_VARSAYILAN: MulkKamuParametreleri = {
  mahallePaketi: [
    { tur: "meydan", hucre: 5 },
    { tur: "pazar", hucre: 7 },
    { tur: "park", hucre: 8 },
  ],
  mahalleHucreHedefi: 7_000,
  hazineRezerviPpm: 40_000,
  hazineAdaHucre: 400,
  hazineEnFazlaAda: 24,
  ilceMerkeziHucre: 10,
  kiyiDerinlik: 2,
  kiyiIlceMinSuHucre: 10,
  oyuncuyaKapaliYapilar: ["muhtarlik"],
};

/**
 * 4 500 hücrelik yoğun ilçe için gerçekçi mahalle büyüklüğü (≈ 500 hücre) ve küçük hazine adaları: lider kararındaki %8–9 oranı bu ölçekte
 * sınanır (gerçek Gebze'de mahalle ≈ 7 000 hücre ve ada 400'dür; varsayılan budur).
 */
export const KAMU_YOGUN: MulkKamuParametreleri = { ...KAMU_VARSAYILAN, mahalleHucreHedefi: 500, hazineAdaHucre: 12, hazineEnFazlaAda: 64 };

/** mini-6 küçük ilçeleri (~85 uygun hücre) için ölçeklenmiş paket: 2 + 2 + 3 = 7 hücre, hedef 40 hücre/mahalle, merkez 6. */
export const KAMU_KUCUK: MulkKamuParametreleri = {
  mahallePaketi: [
    { tur: "meydan", hucre: 2 },
    { tur: "pazar", hucre: 2 },
    { tur: "park", hucre: 3 },
  ],
  mahalleHucreHedefi: 40,
  hazineRezerviPpm: 40_000,
  hazineAdaHucre: 4,
  hazineEnFazlaAda: 8,
  ilceMerkeziHucre: 6,
  kiyiDerinlik: 1,
  kiyiIlceMinSuHucre: 3,
  oyuncuyaKapaliYapilar: ["muhtarlik"],
};

/** mini-6 + parsel fikstürü, `param.mulk.kamu` = `kamu` (varsayılan: lider kararı). `duzenle` paket üzerinde ek değişiklik yapar. */
export function kamuVeri(kamu: MulkKamuParametreleri | null = KAMU_VARSAYILAN, duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  const m = v.param.mulk as NonNullable<typeof v.param.mulk>;
  if (kamu === null) delete m.kamu;
  else m.kamu = structuredClone(kamu);
  duzenle?.(v);
  return v;
}

export const YOGUN_ILCE = "sn_m_ova_merkez";

/**
 * mini-6 fikstüründe `YOGUN_ILCE`yi 70 x 70 hücrelik yoğun bir kentsel ilçeyle değiştirir (≈ 4 900 hücre; yollar iki hat, doğu kenarında
 * 3 hücre genişliğinde su şeridi = kıyı; merkezde şehir, çevresinde kasaba, kalanı kırsal). Gerçek ilçe ölçeği için.
 */
export function yogunFikstur(N = 70): ParselFiksturu {
  const f = structuredClone(parselFiksturuYukle("mini-6"));
  const ilce = f.ilceler.find((c) => c.id === YOGUN_ILCE) as NonNullable<(typeof f.ilceler)[number]>;
  const X0 = 900_000;
  const Y0 = 900_000;
  const kiyiGenislik = Math.max(3, Math.floor(N / 90)); // doğu kenarında su şeridi
  const yolAralik = Math.max(30, Math.floor(N / 7)); // yollar (N = 70: tek hat x = y = 30)
  const hucreler: ParselHucreTanimi[] = [];
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const id = `${X0 + x}:${Y0 + y}`;
      if (x >= N - kiyiGenislik) hucreler.push({ id, sinif: "kirsal", uygun: false, engel: "su" });
      else if (N === 70 ? x === 30 || y === 30 : x % yolAralik === yolAralik - 1 || y % yolAralik === yolAralik - 1) hucreler.push({ id, sinif: "kirsal", uygun: false, engel: "yol" });
      else {
        const merkezMesafe = Math.max(Math.abs(x - N / 2), Math.abs(y - N / 2)) * (70 / N);
        hucreler.push({ id, sinif: merkezMesafe <= 10 ? "sehir" : merkezMesafe <= 22 ? "kasaba" : "kirsal", uygun: true });
      }
    }
  }
  ilce.hucreler = hucreler;
  ilce.hucreSayisi = hucreler.length;
  ilce.uygunHucre = hucreler.filter((h) => h.uygun).length;
  ilce.sinif = "sehir";
  return f;
}

/** Fikstürün tüm ilçeleri için kamu kümeleri (saf hesap; dünya kurmaz). */
export function kamuTum(f: ParselFiksturu, kp: MulkKamuParametreleri): Map<string, KamuKumesi> {
  return kamuKumeleriHesapla(f, kp);
}

/** Tek ilçenin kamu kümesi ve açık biçimi. */
export function kamuIlce(f: ParselFiksturu, ilce: string, kp: MulkKamuParametreleri): { kume: KamuKumesi; gruplar: KamuGrubu[] } {
  const kume = kamuTum(f, kp).get(ilce) as KamuKumesi;
  return { kume, gruplar: kamuGruplariGenislet(kume.gruplar) };
}
