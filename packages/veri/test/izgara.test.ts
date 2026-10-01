/**
 * BHI1 okuyucusu ve durum baytı eşlemesi (G3b; docs/06 §15.11): `@bolge/veri` saf okuyucusu istemcideki (`istemci/src/harita/hucre.ts`, `fiyat.ts`)
 * eşdeğeriyle aynı baytlar için AYNI çıktıyı verir; iki kod çözücü bu testle bağlıdır.
 */
import { describe, expect, it } from "vitest";
import { arsaSinifi as istemciArsaSinifi } from "../../istemci/src/harita/fiyat";
import { Bit as istemciBit, bhiCoz as istemciBhiCoz, durumSinifi as istemciDurumSinifi, satinAlinabilir as istemciSatinAlinabilir } from "../../istemci/src/harita/hucre";
import { Bit, ENGEL_MASKESI, arsaSinifi, bhiCoz, durumSinifi, engelAdi, ilceSeviyesiTuret, ilceSinifiTuret, izgaraSay, parselIzgaraHatalari, satinAlinabilir } from "../src/index";
import type { Izgara, ParselIzgaraGirdisi } from "../src/index";

/** 24 bayt başlık + durum düzlemi (+ isteğe bağlı ikinci düzlem). */
function bhiBayt(x0: number, y0: number, w: number, h: number, durum: Uint8Array, duzlem = 1): Uint8Array {
  const t = new Uint8Array(24 + w * h * duzlem);
  t.set([66, 72, 73, 49, 20, 1], 0); // "BHI1", z20, sürüm 1
  const v = new DataView(t.buffer);
  v.setUint16(6, duzlem, true);
  v.setUint32(8, x0, true);
  v.setUint32(12, y0, true);
  v.setUint32(16, w, true);
  v.setUint32(20, h, true);
  t.set(durum, 24);
  return t;
}

/** Deterministik sahte durum düzlemi (tam sayı karması; her bit düzeni görünür). */
function sahteDurum(n: number): Uint8Array {
  const d = new Uint8Array(n);
  let s = 12345;
  for (let i = 0; i < n; i++) {
    s = (Math.imul(s, 1103515245) + 12345) >>> 0;
    d[i] = (s >>> 16) & 255;
  }
  return d;
}

describe("BHI1 okuyucusu: istemci okuyucusuyla eşdeğer", () => {
  it("aynı bayt dizisi: aynı çerçeve ve aynı durum düzlemi (tek ve çift düzlemli)", () => {
    for (const duzlem of [1, 2]) {
      const w = 37;
      const h = 23;
      const durum = sahteDurum(w * h * duzlem);
      const t = bhiBayt(912_345, 478_901, w, h, durum.subarray(0, w * h), duzlem);
      if (duzlem === 2) t.set(durum.subarray(w * h), 24 + w * h);
      const a = bhiCoz(t);
      const b = istemciBhiCoz(t);
      expect({ x0: a.x0, y0: a.y0, genislik: a.genislik, yukseklik: a.yukseklik }).toEqual({ x0: b.x0, y0: b.y0, genislik: b.genislik, yukseklik: b.yukseklik });
      expect(Array.from(a.durum)).toEqual(Array.from(b.durum));
    }
  });

  it("bozuk girdi aynı iletiyle reddedilir: kısa, sihir, sürüm, boyut", () => {
    const iyi = bhiBayt(1, 2, 3, 4, sahteDurum(12));
    const kisa = iyi.slice(0, 10);
    const sihir = iyi.slice();
    sihir[0] = 88;
    const surum = iyi.slice();
    surum[5] = 2;
    const boyut = iyi.slice(0, iyi.length - 1);
    for (const t of [kisa, sihir, surum, boyut]) {
      let a = "";
      let b = "";
      try {
        bhiCoz(t);
      } catch (e) {
        a = (e as Error).message;
      }
      try {
        istemciBhiCoz(t);
      } catch (e) {
        b = (e as Error).message;
      }
      expect(a).not.toBe("");
      expect(a).toBe(b);
    }
  });

  it("durum düzlemi girdinin görünümüdür (kopyalanmaz)", () => {
    const t = bhiBayt(0, 0, 2, 2, new Uint8Array([1, 3, 5, 7]));
    const g = bhiCoz(t);
    expect(g.durum.buffer).toBe(t.buffer);
    expect(g.durum.byteOffset).toBe(24);
  });
});

describe("durum baytı eşlemesi (256 baytın hepsi)", () => {
  it("bit sabitleri, arazi sınıfı, arsa sınıfı ve satın alınabilirlik istemciyle aynı", () => {
    expect(Bit).toEqual(istemciBit);
    for (let d = 0; d < 256; d++) {
      expect(durumSinifi(d), `durum ${d}`).toBe(istemciDurumSinifi(d));
      expect(arsaSinifi(d), `durum ${d}`).toBe(istemciArsaSinifi(d));
      expect(satinAlinabilir(d), `durum ${d}`).toBe(istemciSatinAlinabilir(d));
    }
  });

  it("engel adı: su > askeri > yol; engelsiz tanımsız; uygunluk = içeride ∧ engelsiz", () => {
    for (let d = 0; d < 256; d++) {
      const beklenen = d & Bit.SU ? "su" : d & Bit.ASKERI ? "askeri" : d & Bit.YOL ? "yol" : undefined;
      expect(engelAdi(d), `durum ${d}`).toBe(beklenen);
      expect((d & ENGEL_MASKESI) === 0, `durum ${d}`).toBe(engelAdi(d) === undefined);
    }
  });

  it("ilçe sınıfı en yüksek hücre sınıfı; seviye şehir 3, kasaba 1, kırsal 0; içeride hücre yoksa kırsal", () => {
    const kirsal: Izgara = { x0: 0, y0: 0, genislik: 2, yukseklik: 1, durum: new Uint8Array([Bit.ICERIDE | (1 << 5), 0]) };
    const kasaba: Izgara = { ...kirsal, durum: new Uint8Array([Bit.ICERIDE | (1 << 5), Bit.ICERIDE | (2 << 5)]) };
    const sehir: Izgara = { ...kirsal, durum: new Uint8Array([Bit.ICERIDE | (2 << 5), Bit.ICERIDE | (3 << 5)]) };
    const disarida: Izgara = { ...kirsal, durum: new Uint8Array([3 << 5, 5 << 5]) }; // içeride bayrağı yok
    expect(ilceSinifiTuret(kirsal)).toBe("kirsal");
    expect(ilceSinifiTuret(kasaba)).toBe("kasaba");
    expect(ilceSinifiTuret(sehir)).toBe("sehir");
    expect(ilceSinifiTuret(disarida)).toBe("kirsal");
    expect([ilceSeviyesiTuret("kirsal"), ilceSeviyesiTuret("kasaba"), ilceSeviyesiTuret("sehir")]).toEqual([0, 1, 3]);
  });

  it("izgaraSay: içerideki ve uygun hücre sayıları", () => {
    const g: Izgara = { x0: 0, y0: 0, genislik: 4, yukseklik: 1, durum: new Uint8Array([Bit.ICERIDE, Bit.ICERIDE | Bit.YOL, 0, Bit.ICERIDE | Bit.SU]) };
    expect(izgaraSay(g)).toEqual({ hucre: 3, uygun: 1 });
  });
});

describe("parselIzgaraHatalari", () => {
  const ig = (w: number, h: number, x0 = 10, y0 = 10): Izgara => ({ x0, y0, genislik: w, yukseklik: h, durum: new Uint8Array(w * h) });
  const temel = (): ParselIzgaraGirdisi => ({
    ad: "t",
    harita: "mini-6",
    tohum: 0,
    iller: [{ id: "i1", ad: "I1", bolge: "b1" }],
    ilceler: [{ id: "i1_a", ad: "A", il: "i1", bolge: "b1", izgara: ig(2, 2) }],
  });

  it("geçerli girdi: hata yok", () => {
    expect(parselIzgaraHatalari(temel())).toEqual([]);
  });

  it("yinelenen kimlikler, bilinmeyen il, bölge uyuşmazlığı, boyut ve çerçeve ihlalleri, ilçesiz il yakalanır", () => {
    const g = temel();
    g.iller.push({ id: "i1", ad: "kopya", bolge: "b1" }, { id: "i2", ad: "I2", bolge: "b2" });
    g.ilceler.push(
      { id: "i1_a", ad: "A2", il: "i1", bolge: "b1", izgara: ig(1, 1) },
      { id: "x", ad: "X", il: "yok", bolge: "b1", izgara: ig(1, 1) },
      { id: "y", ad: "Y", il: "i1", bolge: "baska", izgara: ig(1, 1) },
      { id: "z", ad: "Z", il: "i1", bolge: "b1", izgara: { x0: 0, y0: 0, genislik: 3, yukseklik: 3, durum: new Uint8Array(4) } },
      { id: "t", ad: "T", il: "i1", bolge: "b1", izgara: ig(2, 2, (1 << 20) - 1, 0) },
    );
    const m = parselIzgaraHatalari(g).join("\n");
    expect(m).toMatch(/iller: yinelenen kimlik "i1"/);
    expect(m).toMatch(/ilceler: yinelenen kimlik "i1_a"/);
    expect(m).toMatch(/bilinmeyen il "yok"/);
    expect(m).toMatch(/bolge "baska" ilin bolgesiyle \("b1"\) ayni degil/);
    expect(m).toMatch(/durum duzlemi 4 bayt, beklenen 9/);
    expect(m).toMatch(/cerceve z20 araliginin/);
    expect(m).toMatch(/il "i2": hic ilcesi yok/);
  });
});
