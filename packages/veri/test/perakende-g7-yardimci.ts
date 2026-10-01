/**
 * G7-1a test yardımcısı: bugünkü mini veri paketine (JSON DEĞİŞMEDEN, bellekte) geçerli bir `mulk.perakende` bloğu ve `ekYapilar.dukkan` ekleyen kurucu.
 * Değerler A2 §1.9/§1.13 ölçeğindedir (test verisi; T3'ün gerçek değerleri G7-4'te JSON'a girer).
 */
import { miniVeriyiYukle } from "../src/index";
import type { MulkPerakendeParametreleri, VeriPaketi } from "../src/index";

export const kopya = <T>(x: T): T => structuredClone(x);

export function perakendeBlogu(): MulkPerakendeParametreleri {
  return {
    surum: 1,
    acikOlcekler: [0],
    ilceBasinaEnFazla: 2,
    fiyatBandiPpm: [700_000, 1_400_000],
    fiyatKademeleriPpm: [850_000, 950_000, 1_050_000, 1_150_000],
    varsayilanFiyatKademesi: 2,
    kampanyaKademesi: 0,
    kampanyaGunlukEnFazlaSaat: 6,
    kampanyaHaftalikEnFazlaGun: 2,
    fiyatDegisimEnAzSaat: 6,
    cesitKatsayiPpm: 250_000,
    esnaf: { fiyatPpm: 1_120_000, tabanPayPpm: 250_000 },
    olcekler: [
      { rafYuvasi: 6, kasaMiliSaat: 90_000, giderMiliSaat: 1_500, cekimCarpaniPpm: 1_000_000 },
      { rafYuvasi: 12, kasaMiliSaat: 220_000, giderMiliSaat: 4_000, cekimCarpaniPpm: 1_600_000 },
      { rafYuvasi: 24, kasaMiliSaat: 500_000, giderMiliSaat: 9_000, cekimCarpaniPpm: 2_400_000 },
    ],
    dukkanTurleri: [
      { id: "bakkal", ad: "Bakkal", mallar: ["gida", "ekmek", "un", "sut", "sut_urunu", "sekerleme"], tamCesit: 6, olcekAraligi: [0] },
      { id: "firin", ad: "Firin", mallar: ["ekmek", "un"], tamCesit: 2, olcekAraligi: [0] },
    ],
    talep: {
      yerelOlcek: 40,
      ilceSinifiNufus: { kirsal: 4_000, kasaba: 12_000, sehir: 60_000 },
      talep1000Saat: { gida: 90_000, ekmek: 60_000, un: 10_000, sut: 20_000, sut_urunu: 20_000, sekerleme: 15_000 },
      gruplar: {
        gida: {
          mallar: ["gida", "ekmek", "un", "sut", "sut_urunu"],
          takvimPpm: [1_100_000, 1_000_000, 1_000_000, 900_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000, 1_000_000],
          bayram: { oncesiGun: 3, oncesiPpm: 1_200_000, sonrasiGun: 3, sonrasiPpm: 800_000 },
        },
        tatli: { mallar: ["sekerleme"], takvimPpm: Array.from({ length: 12 }, () => 1_000_000) },
      },
      bayramGunleri: [10, 30],
    },
    marka: { hesapBasinaEnFazla: 2, simgeSayisi: 8, renkSayisi: 8 },
  };
}

/** mini paket + perakende bloğu + `ekYapilar.dukkan` (P-İthal bedeli, `olcekHucre [1, 2, 3]`). `duzenle` ile bozulabilir. */
export function perakendeliPaket(duzenle?: (v: VeriPaketi) => void): VeriPaketi {
  const v = miniVeriyiYukle();
  const mulk = v.param.mulk!;
  mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
  mulk.perakende = perakendeBlogu();
  duzenle?.(v);
  return v;
}

/** Blok ve `dukkan` ek yapısı OLMAYAN paket (JSON'da bugün yoktur; G7-4'te T3 ekleyince de bu kurucu aynı kalır: blok bellekte silinir). */
export function perakendesizPaket(yukle: () => VeriPaketi = miniVeriyiYukle): VeriPaketi {
  const v = yukle();
  delete v.param.mulk!.perakende;
  if (v.param.mulk!.ekYapilar !== undefined) delete v.param.mulk!.ekYapilar["dukkan"];
  return v;
}
