/**
 * Kompakt hücre dizini (docs/06 §15.11) test yardımcıları: sentetik BHI1 ızgarası, ızgaradan JSON fikstürü (f4 `gebzeFiksturu` eşlemesi) ve iki yoldan veri paketi.
 * Test verisi KÜÇÜKTÜR (bellek içinde üretilir; depoya ikili dosya girmez).
 */
import { Bit, arsaSinifi, engelAdi, ilceSeviyesiTuret, ilceSinifiTuret, parselFiksturuYukle } from "@bolge/veri";
import type { Izgara, ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi, ParselIzgaraGirdisi } from "@bolge/veri";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { KAMU_YOGUN } from "./kamu-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";

/** Tam sayı karması (platformdan bağımsız). */
function karma(a: number, b: number, c: number): number {
  let h = (Math.imul(a, 73856093) ^ Math.imul(b, 19349663) ^ Math.imul(c, 83492791)) >>> 0;
  h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0;
  return (h ^ (h >>> 12)) >>> 0;
}

/**
 * N x N sentetik ızgara (yol hatları, doğu kenarında su şeridi, askeri blok, merkezde konut/yapılı, çevresinde sanayi, kalanı tarla/orman/diğer;
 * köşelerde ilçe dışı çentikler: sınır dikdörtgen değil). `tohum` farklı ilçelerde farklı doku verir.
 */
export function sentetikIzgara(N: number, x0: number, y0: number, tohum = 0): Izgara {
  const durum = new Uint8Array(N * N);
  const su = Math.max(3, Math.floor(N / 20));
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      if (i + j < Math.floor(N / 10) || N - 1 - i + (N - 1 - j) < Math.floor(N / 12)) continue; // ilçe dışı
      let b = Bit.ICERIDE;
      if (i >= N - su) b |= Bit.SU;
      if (i % 17 === 16 || j % 19 === 18) b |= Bit.YOL;
      if (i >= Math.floor(N / 2) && i < Math.floor(N / 2) + 5 && j >= Math.floor(N / 4) && j < Math.floor(N / 4) + 5) b |= Bit.ASKERI;
      const d = Math.max(Math.abs(i - N / 2), Math.abs(j - N / 2));
      const h = karma(i, j, tohum);
      let sinif: number;
      if (d <= N / 8) sinif = h % 7 === 0 ? 5 : 3;
      else if (d <= N / 4) sinif = 2;
      else sinif = h % 5 === 0 ? 4 : h % 3 === 0 ? 0 : 1;
      b |= sinif << 5;
      if (h % 11 === 0) b |= Bit.BINA;
      durum[j * N + i] = b;
    }
  }
  return { x0, y0, genislik: N, yukseklik: N, durum };
}

/** Izgaradan JSON fikstür ilçesi (`istemci/scripts/f4-sunucu.ts gebzeFiksturu` eşlemesi: satır öncelikli, engel su > askeri > yol). */
export function izgaradanIlce(id: string, ad: string, il: string, bolge: string, ig: Izgara): ParselIlceTanimi {
  const hucreler: ParselHucreTanimi[] = [];
  let uygun = 0;
  for (let dy = 0; dy < ig.yukseklik; dy++) {
    for (let dx = 0; dx < ig.genislik; dx++) {
      const d = ig.durum[dy * ig.genislik + dx] as number;
      if (!(d & Bit.ICERIDE)) continue;
      const hid = `${ig.x0 + dx}:${ig.y0 + dy}`;
      const engel = engelAdi(d);
      if (engel !== undefined) hucreler.push({ id: hid, sinif: arsaSinifi(d), uygun: false, engel });
      else {
        uygun++;
        hucreler.push({ id: hid, sinif: arsaSinifi(d), uygun: true });
      }
    }
  }
  const sinif = ilceSinifiTuret(ig);
  return { id, ad, il, bolge, sinif, seviye: ilceSeviyesiTuret(sinif), hucreSayisi: hucreler.length, uygunHucre: uygun, hucreler };
}

export interface SentetikDunya {
  izgara: ParselIzgaraGirdisi;
  fikstur: ParselFiksturu;
}

/** İki ilçeli sentetik dünya (mini-6'nın ova ve liman illerine bağlı): aynı veri iki biçimde (ızgara girdisi ve JSON fikstürü). */
export function sentetikDunya(N = 60): SentetikDunya {
  const taban = parselFiksturuYukle("mini-6");
  const iller = taban.iller.filter((il) => il.id === "sn_m_ova" || il.id === "sn_m_liman").map((il) => ({ ...il }));
  const a = { id: "sn_m_ova_merkez", ad: "Ova Merkez", il: "sn_m_ova", bolge: "m_ova", izgara: sentetikIzgara(N, 900_000, 905_000, 1) };
  const b = { id: "sn_m_liman_merkez", ad: "Liman Merkez", il: "sn_m_liman", bolge: "m_liman", izgara: sentetikIzgara(N + 8, 90, 95, 2) };
  const izgara: ParselIzgaraGirdisi = { ad: "sentetik-izgara", harita: "mini-6", tohum: 0, iller, ilceler: [a, b] };
  const fikstur: ParselFiksturu = {
    surum: 1,
    ad: izgara.ad,
    harita: izgara.harita,
    tohum: 0,
    zoom: 20,
    iller: iller.map((il) => ({ ...il })),
    ilceler: izgara.ilceler.map((c) => izgaradanIlce(c.id, c.ad, c.il, c.bolge, c.izgara)),
  };
  return { izgara, fikstur };
}

/** Kamu bloğu açık (ölçeklenmiş yoğun paket), yeni oyuncu paketi açık veri paketi; `yol` hangi girdinin kullanılacağını söyler. */
export function sentetikVeri(yol: "izgara" | "json", d: SentetikDunya = sentetikDunya(), duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  const v = mulkVeriTam();
  const mk = v.param.mulk as NonNullable<typeof v.param.mulk>;
  mk.kamu = { ...structuredClone(KAMU_YOGUN), mahalleHucreHedefi: 400, hazineAdaHucre: 12, ilceMerkeziHucre: 8 };
  if (yol === "izgara") {
    delete v.parsel;
    v.parselIzgara = d.izgara;
  } else {
    v.parsel = structuredClone(d.fikstur);
  }
  duzenle?.(v);
  return v;
}
