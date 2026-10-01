/**
 * G7-2 (sartname §6.3-§6.4, §16.2 `perakende-cekim`): yerel pazar BAĞLAMASI. Saf çekim hesabının kendisi (Ek B vektörleri, su-doldurma, Qr >= 1) `yerel-pazar.test.ts`'tedir (K4);
 * burada DÜNYA durumundan girdinin doğru kurulduğu sınanır: V1 vektörü dünya üzerinden birebir, sıra bağımsızlığı, üst sınır değişmezleri (Σ s <= Q - floor(Q x taban), dükkân <= kasa),
 * ilçe yalıtımı, stoksuz yuvanın çekime girmemesi ve perakende kapalıyken `null`.
 */
import { describe, expect, it } from "vitest";
import { yerelPazarCoz } from "../src/mulk/perakende";
import type { YerelCozum } from "../src/mulk/perakende";
import type { Simulasyon } from "../src/motor";
import { PPM } from "../src/tipler";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { bolgeBul, dukkanEkle, dukkanlariSil, perakendeVeri } from "./perakende-yardimci";
import { mulkSim } from "./mulk-yardimci";

const OVA = "sn_m_ova_merkez";
const LIMAN = "sn_m_liman_merkez";

/** Ek B V1 girdisi: kademeler [1 000 000, 1 080 000, 1 150 000]; Q(ekmek) = 300 000 (talep1000Saat 300 000 x olcek 1 x nufus 1000 / 1000); takvim ve bayram yok; kasa 900 000. */
function v1Veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return perakendeVeri((v, pr) => {
    pr.fiyatKademeleriPpm = [1_000_000, 1_080_000, 1_150_000];
    pr.varsayilanFiyatKademesi = 0;
    delete pr.kampanyaKademesi;
    delete pr.kampanyaGunlukEnFazlaSaat;
    delete pr.kampanyaHaftalikEnFazlaGun;
    pr.olcekler[0].kasaMiliSaat = 900_000;
    pr.talep.yerelOlcek = 1;
    pr.talep.ilceSinifiNufus = { kirsal: 1000, kasaba: 1000, sehir: 1000 };
    pr.talep.talep1000Saat = { ekmek: 300_000, un: 100_000 };
    pr.talep.gruplar = { gida: { mallar: ["ekmek", "un"], takvimPpm: Array.from({ length: 12 }, () => 1_000_000) } };
    pr.talep.bayramGunleri = [];
    v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 200_000, ekmek: 50_000_000, un: 50_000_000, sut: 50_000_000 };
    duzenle?.(v);
  });
}

const satir = (y: YerelCozum, oyuncu: string, mal: string): number => y.sonuc.satirlar.filter((x) => x.oyuncu === oyuncu && x.mal === mal).reduce((a, x) => a + x.istek, 0);

function ekmekYok(s: Simulasyon, oyuncu: string): void {
  const m = s.ic.malIndeks["ekmek"] as number;
  const st = bolgeBul(s, oyuncu).stoklar[m]!;
  st.miktar = 0;
  st.yerelOran = 0;
  st.gelenOran = 0;
  st.artik = 0;
}

describe("perakende kapalı ya da dükkân yok: null (hiçbir tahsis yok)", () => {
  it("blok yok; blok var ama dükkân yok -> null; dükkân eklenince nesne, silinince tekrar null", () => {
    const sKapali = mulkSim(["a"], perakendeVeri(undefined, false));
    expect(yerelPazarCoz(sKapali.dunya, sKapali.baglam)).toBeNull();
    const s = mulkSim(["a"], v1Veri());
    expect(yerelPazarCoz(s.dunya, s.baglam)).toBeNull();
    dukkanEkle(s, "a", [{ mal: "ekmek" }], "firin", 0, OVA);
    expect(yerelPazarCoz(s.dunya, s.baglam)).not.toBeNull();
    dukkanlariSil(s);
    expect(yerelPazarCoz(s.dunya, s.baglam)).toBeNull();
  });
});

describe("Ek B V1 dünya üzerinden birebir (iki oyuncu, aynı ilçe, tek mal)", () => {
  it("A (kademe 0, 1 000 000) 116 916; B (kademe 1, 1 080 000) 100 236; Q 300 000; dükkân gideri düğüm başına yazılır", () => {
    const s = mulkSim(["a", "b"], v1Veri());
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 1 }], "firin", 0, OVA);
    const y = yerelPazarCoz(s.dunya, s.baglam)!;
    expect(y.talep.get(OVA)!.get("ekmek")).toBe(300_000);
    expect(satir(y, "a", "ekmek")).toBe(116_916);
    expect(satir(y, "b", "ekmek")).toBe(100_236);
    expect(y.gider.get(bolgeBul(s, "a").indeks)).toBe(1_500);
    expect(y.gider.get(bolgeBul(s, "b").indeks)).toBe(1_500);
    // düğüm x mal isteği (h.dukkan girdisi) satırlarla aynı
    const ekmek = s.ic.malIndeks["ekmek"] as number;
    expect(y.istek.get(bolgeBul(s, "a").indeks)![ekmek]).toBe(116_916);
  });

  it("negatif kontrol: B'nin kademesi değişince sonuç V1 vektöründen sapar (test duyarlı); kademe 2'de B daha az alır", () => {
    const s = mulkSim(["a", "b"], v1Veri());
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 2 }], "firin", 0, OVA);
    const y = yerelPazarCoz(s.dunya, s.baglam)!;
    expect(satir(y, "b", "ekmek")).toBeLessThan(100_236);
    expect(satir(y, "a", "ekmek")).toBeGreaterThan(116_916);
  });
});

describe("stoksuz (mevcut olmayan) yuva çekime girmez; payı diğerlerine kalır", () => {
  it("B'nin ağında ekmek yok: B satırı yok, A tek dükkân sonucunu alır (V1'e göre daha fazla); ekmek gelince B geri döner", () => {
    const s = mulkSim(["a", "b"], v1Veri());
    ekmekYok(s, "b");
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 1 }], "firin", 0, OVA);
    const y = yerelPazarCoz(s.dunya, s.baglam)!;
    expect(satir(y, "b", "ekmek")).toBe(0);
    expect(y.sonuc.satirlar.some((x) => x.oyuncu === "b")).toBe(false);
    expect(satir(y, "a", "ekmek")).toBeGreaterThan(116_916);
    // B'nin dükkânı yine de gider yazar (dükkân var, satışı yok)
    expect(y.gider.get(bolgeBul(s, "b").indeks)).toBe(1_500);
    // B'nin düğümüne gelen akış varsa mevcut sayılır (Adım 1: stok > 0 ya da üretim > 0 ya da gelenOran > 0)
    bolgeBul(s, "b").stoklar[s.ic.malIndeks["ekmek"] as number]!.gelenOran = 10;
    const y2 = yerelPazarCoz(s.dunya, s.baglam)!;
    expect(satir(y2, "b", "ekmek")).toBeGreaterThan(0);
    expect(satir(y2, "a", "ekmek")).toBeLessThan(satir(y, "a", "ekmek"));
  });

  it("türün mal kümesinde olmayan mal (firin: yalnız ekmek ve un) çekime girmez", () => {
    const s = mulkSim(["a"], v1Veri());
    // `sut` firin türünde yok; yine de yuvada yazılı (bozuk durum savunması: çekime girmez)
    dukkanEkle(s, "a", [{ mal: "sut" }, { mal: "ekmek" }], "firin", 0, OVA);
    const y = yerelPazarCoz(s.dunya, s.baglam)!;
    expect(satir(y, "a", "sut")).toBe(0);
    expect(satir(y, "a", "ekmek")).toBeGreaterThan(0);
  });
});

describe("sıra bağımsızlığı ve ilçe yalıtımı", () => {
  it("aynı düğümde iki dükkânın ek yapı dizisi sırası değişince sonuç AYNI; iki kez aynı", () => {
    const s = mulkSim(["a", "b"], v1Veri());
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 2 }, { mal: "un", fiyat: 1 }], "firin", 0, OVA);
    dukkanEkle(s, "b", [{ mal: "un", fiyat: 1 }], "firin", 0, OVA);
    const once = JSON.stringify(yerelPazarCoz(s.dunya, s.baglam)!.sonuc);
    expect(JSON.stringify(yerelPazarCoz(s.dunya, s.baglam)!.sonuc)).toBe(once);
    const b = bolgeBul(s, "a");
    b.ekYapilar!.reverse();
    expect(JSON.stringify(yerelPazarCoz(s.dunya, s.baglam)!.sonuc)).toBe(once);
    // negatif kontrol: ölçüt boş değil (en az 3 satır) ve ağırlıkları gerçekten farklı
    expect(yerelPazarCoz(s.dunya, s.baglam)!.sonuc.satirlar.length).toBeGreaterThanOrEqual(3);
  });

  it("başka ilçeye dükkân eklemek/çıkarmak bu ilçenin payını DEĞİŞTİRMEZ", () => {
    const s = mulkSim(["a", "b"], v1Veri());
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    const yalniz = satir(yerelPazarCoz(s.dunya, s.baglam)!, "a", "ekmek");
    dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, LIMAN);
    const y = yerelPazarCoz(s.dunya, s.baglam)!;
    expect(satir(y, "a", "ekmek")).toBe(yalniz);
    expect(satir(y, "b", "ekmek")).toBe(yalniz); // iki ilçe aynı Q (aynı nüfus), aynı fiyat: aynı pay
    // negatif kontrol: AYNI ilçeye eklenseydi A'nın payı düşerdi
    dukkanlariSil(s);
    dukkanEkle(s, "a", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    dukkanEkle(s, "b", [{ mal: "ekmek", fiyat: 0 }], "firin", 0, OVA);
    expect(satir(yerelPazarCoz(s.dunya, s.baglam)!, "a", "ekmek")).toBeLessThan(yalniz);
  });
});

describe("üst sınır değişmezleri (tohumlu rastgele dükkân kümeleri)", () => {
  it("her (ilçe, mal): Σ s <= Q - floor(Q x tabanPay / PPM); her dükkân: toplam <= kasa; satırlar sıralı; 40 deneme", () => {
    const veri = perakendeVeri((v, pr) => {
      v.param.mulk!.yeniOyuncu.baslangicStok = { gida: 5_000_000, ekmek: 5_000_000, un: 5_000_000, sut: 5_000_000, sut_urunu: 5_000_000, sekerleme: 5_000_000 };
      pr.talep.ilceSinifiNufus = { kirsal: 400, kasaba: 400, sehir: 400 }; // küçük Q: kasa ve talep sınırı sık devreye girsin
    });
    const s = mulkSim(["a", "b", "c"], veri);
    const pk = s.ic.mulk!.perakende!;
    const taban = pk.p.esnaf.tabanPayPpm;
    const malHavuzu = ["gida", "ekmek", "un", "sut", "sut_urunu", "sekerleme"];
    let x = 12345;
    const rnd = (n: number): number => {
      x = (Math.imul(x, 1103515245) + 12345) >>> 0;
      return (x >>> 8) % n;
    };
    let satirToplam = 0;
    let kasaBagladi = 0;
    for (let deneme = 0; deneme < 40; deneme++) {
      dukkanlariSil(s);
      pk.p.olcekler[0].kasaMiliSaat = 2_000 + rnd(60_000);
      for (const o of ["a", "b", "c"]) {
        for (let k = rnd(3); k > 0; k--) {
          const raf = Array.from({ length: 1 + rnd(6) }, () => ({ mal: malHavuzu[rnd(malHavuzu.length)]!, fiyat: rnd(4) }));
          dukkanEkle(s, o, raf, "bakkal", 0, rnd(2) === 0 ? OVA : LIMAN);
        }
      }
      const y = yerelPazarCoz(s.dunya, s.baglam);
      if (y === null) continue;
      const toplam = new Map<string, number>();
      const dukkanToplam = new Map<string, number>();
      for (const sr of y.sonuc.satirlar) {
        toplam.set(`${sr.ilce}|${sr.mal}`, (toplam.get(`${sr.ilce}|${sr.mal}`) ?? 0) + sr.istek);
        dukkanToplam.set(`${sr.oyuncu}|${sr.ekYapi}`, (dukkanToplam.get(`${sr.oyuncu}|${sr.ekYapi}`) ?? 0) + sr.istek);
        expect(sr.istek).toBeGreaterThan(0);
        satirToplam++;
      }
      for (const [k, t] of toplam) {
        const [ilce, mal] = k.split("|") as [string, string];
        const q = y.talep.get(ilce)!.get(mal)!;
        expect(t, `${k} deneme ${deneme}`).toBeLessThanOrEqual(q - Math.floor((q * taban) / PPM));
      }
      for (const [, t] of dukkanToplam) {
        expect(t).toBeLessThanOrEqual(pk.p.olcekler[0].kasaMiliSaat);
        if (t >= pk.p.olcekler[0].kasaMiliSaat - 8) kasaBagladi++;
      }
      // satırlar (dugum, mal, ekYapi, yuva) sıralı
      for (let i = 1; i < y.sonuc.satirlar.length; i++) {
        const p = y.sonuc.satirlar[i - 1]!;
        const c = y.sonuc.satirlar[i]!;
        expect(p.dugum <= c.dugum).toBe(true);
      }
    }
    // ölçüt boş değil: satırlar üretildi ve kasa en az birkaç denemede bağlayıcıydı (negatif kontrol: üst sınır testi anlamlı)
    expect(satirToplam).toBeGreaterThan(100);
    expect(kasaBagladi).toBeGreaterThan(3);
  });
});
