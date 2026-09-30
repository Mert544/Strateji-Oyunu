/**
 * Determinizm testleri: alt sistemler GERCEK modullerdir (Faz 2 uygulamalari geldikce bu testler
 * onlari da kapsar). Komutlar rastgele uretilir; basarisizlar gunluge girmez.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { aralik, prngOlustur } from "../src/prng";
import { stokOranAyarla } from "../src/stok";
import { DAKIKA, GUN, SAAT } from "../src/tipler";
import type { Dunya, Komut, PrngAkisi } from "../src/tipler";
import { kucukVeri } from "./fikstur";

const BOLGELER = ["ova", "sehir", "dag", "gecit"];
const MALLAR = ["tahil", "gida", "celik"];

function rastgeleKomut(r: ReturnType<typeof prngOlustur>): { oyuncu: string; komut: Komut } {
  const oyuncu = aralik(r, 2) === 0 ? "p1" : "p2";
  const bolge = BOLGELER[aralik(r, 4)]!;
  const diger = oyuncu === "p1" ? "p2" : "p1";
  const komutlar: Komut[] = [
    { tur: "tesis_insa", bolge, tesisTuru: aralik(r, 2) === 0 ? "ciftlik" : "fabrika" },
    { tur: "yontem_degistir", bolge, tesis: 1 + aralik(r, 3), yontem: "gida_isleme" },
    { tur: "tesis_durum", bolge, tesis: 1 + aralik(r, 3), aktif: aralik(r, 2) === 0 },
    { tur: "ticaret_emri", bolge, mal: MALLAR[aralik(r, 3)]!, yon: aralik(r, 2) === 0 ? "ihracat" : "ithalat", oranSaat: aralik(r, 50_000) },
    { tur: "vergi_ayarla", oranPpm: aralik(r, 600_000) },
    { tur: "kenar_gelistir", kenar: aralik(r, 4) },
    { tur: "askeri_rezerv", oranPpm: aralik(r, 1_000_001) },
    { tur: "birlik_uret", bolge, birlik: "piyade", adet: 1 + aralik(r, 5) },
    { tur: "savas_ilan", saldiranBolge: bolge, hedefBolge: BOLGELER[aralik(r, 4)]! },
    { tur: "savunma_emri", bolge, durus: (["normal", "savunma", "geri_cekil"] as const)[aralik(r, 3)]! },
    { tur: "arastir", teknoloji: "teknik" },
    { tur: "anlasma_teklif", karsi: diger, anlasma: aralik(r, 2) === 0 ? "ticaret" : "ortak_altyapi" },
    { tur: "anlasma_feshet", karsi: diger, anlasma: "ticaret" },
    { tur: "yaptirim", hedef: diger, aktif: aralik(r, 2) === 0 },
  ];
  return { oyuncu, komut: komutlar[aralik(r, komutlar.length)]! };
}

/** Sabit tohumlu komut akisi uygular; motorun kendi rng'sine dokunmaz. Son zamani dondurur. */
function senaryoUygula(s: Simulasyon, akisTohumu: number, adet: number): number {
  const r = prngOlustur(akisTohumu, "test");
  let t = s.dunya.zaman;
  if (s.dunya.oyuncular.length === 0) {
    s.uygula({ t, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p1", bolgeler: ["ova", "sehir"] } });
    s.uygula({ t, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p2", bolgeler: ["dag", "gecit"] } });
  }
  for (let i = 0; i < adet; i++) {
    t += aralik(r, 3 * SAAT);
    const { oyuncu, komut } = rastgeleKomut(r);
    s.uygula({ t, oyuncu, komut });
  }
  return t;
}

describe("determinizm", () => {
  it("ayni tohum + ayni komutlar -> ayni ozet", () => {
    const a = Simulasyon.olustur(kucukVeri(), 123);
    const b = Simulasyon.olustur(kucukVeri(), 123);
    const ta = senaryoUygula(a, 7, 60);
    const tb = senaryoUygula(b, 7, 60);
    expect(ta).toBe(tb);
    a.calistirKadar(ta + 2 * GUN);
    b.calistirKadar(tb + 2 * GUN);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(a.gunluk).toEqual(b.gunluk);
    expect(a.dunya.oyuncular.length).toBe(2);
  });

  it("yenidenOynat(gunluk) orijinalle ayni ozet (ayni son zamanla)", () => {
    const a = Simulasyon.olustur(kucukVeri(), 55);
    const t = senaryoUygula(a, 9, 80);
    a.calistirKadar(t + GUN);
    const r = Simulasyon.yenidenOynat(kucukVeri(), 55, a.gunluk);
    r.calistirKadar(t + GUN);
    expect(r.durumOzeti()).toBe(a.durumOzeti());
    expect(r.gunluk).toEqual(a.gunluk);
    expect(r.dunya.zaman).toBe(a.dunya.zaman);
  });

  it("yenidenOynat: son islem komutsa dogrudan ayni ozet", () => {
    const a = Simulasyon.olustur(kucukVeri(), 56);
    senaryoUygula(a, 10, 40);
    const r = Simulasyon.yenidenOynat(kucukVeri(), 56, a.gunluk);
    const son = a.gunluk.at(-1);
    // Basarisiz son komutlar zamani ilerlettigi icin once esitlenir
    r.calistirKadar(a.dunya.zaman);
    a.calistirKadar(a.dunya.zaman);
    expect(son).toBeDefined();
    expect(r.durumOzeti()).toBe(a.durumOzeti());
  });

  it("klonla sonra ikisi ayni komutlarla -> ayni ozet; klon orijinali etkilemez", () => {
    const a = Simulasyon.olustur(kucukVeri(), 321);
    const t0 = senaryoUygula(a, 11, 20);
    const k = a.klonla();
    expect(k.durumOzeti()).toBe(a.durumOzeti());
    const once = a.durumOzeti();
    // Yalniz klona komut ver: orijinal degismez
    senaryoUygula(k, 12, 10);
    expect(a.durumOzeti()).toBe(once);
    expect(k.durumOzeti()).not.toBe(once);
    // Simdi ikisine de ayni devam
    const b = a.klonla();
    const ta = senaryoUygula(a, 13, 30);
    const tb = senaryoUygula(b, 13, 30);
    expect(ta).toBe(tb);
    expect(ta).toBeGreaterThanOrEqual(t0);
    a.calistirKadar(ta + GUN);
    b.calistirKadar(tb + GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
  });

  it("farkli tohum -> farkli rng durumu ve ozet", () => {
    const a = Simulasyon.olustur(kucukVeri(), 1);
    const b = Simulasyon.olustur(kucukVeri(), 2);
    for (const akis of ["ekonomi", "pazar", "savas", "olay"] as PrngAkisi[]) {
      expect(a.dunya.rng[akis]).not.toEqual(b.dunya.rng[akis]);
    }
    expect(a.durumOzeti()).not.toBe(b.durumOzeti());
  });

  it("dogrudan stok/olay manipulasyonu da kopyada ayni sonucu verir", () => {
    const a = Simulasyon.olustur(kucukVeri(), 4);
    a.calistirKadar(0);
    const b = a.klonla();
    for (const s of [a, b]) {
      const d = s.dunya;
      stokOranAyarla(d, s.baglam, 0, 0, -700_000);
      stokOranAyarla(d, s.baglam, 1, 1, 900_000);
      s.baglam.planla(d, 25 * DAKIKA, { tur: "oran_delta", bolge: 2, mal: 2, delta: 40_000 });
      s.baglam.planla(d, 3 * SAAT, { tur: "oran_delta", bolge: 2, mal: 2, delta: -40_000 });
      s.calistirKadar(3 * GUN);
    }
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  });

  it("dunya duz veridir: Map/Set/sinif/fonksiyon yok, tum sayilar tamsayi", () => {
    const s = Simulasyon.olustur(kucukVeri(), 8);
    const t = senaryoUygula(s, 14, 30);
    s.calistirKadar(t + GUN);
    const kontrol = (v: unknown, yol: string): void => {
      if (v === null || typeof v === "string" || typeof v === "boolean") return;
      if (typeof v === "number") {
        if (!Number.isInteger(v)) throw new Error(`tamsayi degil: ${yol} = ${v}`);
        return;
      }
      if (Array.isArray(v)) return v.forEach((x, i) => kontrol(x, `${yol}[${i}]`));
      if (typeof v === "object") {
        const p = Object.getPrototypeOf(v);
        if (p !== Object.prototype) throw new Error(`duz nesne degil: ${yol}`);
        for (const [k, x] of Object.entries(v)) kontrol(x, `${yol}.${k}`);
        return;
      }
      throw new Error(`desteklenmeyen tur: ${yol} ${typeof v}`);
    };
    kontrol(s.dunya as Dunya, "dunya");
    expect(() => s.durumOzeti()).not.toThrow();
    expect(s.durumOzeti()).toMatch(/^[0-9a-f]{16}$/);
    expect(structuredClone(s.dunya)).toEqual(s.dunya);
  });

  it("uzun kosu (7 gun): saatlik tik surekli planli, zaman t'de", () => {
    const s = Simulasyon.olustur(kucukVeri(), 99);
    s.calistirKadar(7 * GUN);
    expect(s.dunya.zaman).toBe(7 * GUN);
    const tikler = s.dunya.kuyruk.filter((o) => o.veri.tur === "saatlik_tik");
    expect(tikler.map((o) => o.t)).toEqual([7 * GUN + SAAT]);
    const s2 = Simulasyon.olustur(kucukVeri(), 99);
    s2.calistirKadar(7 * GUN);
    expect(s2.durumOzeti()).toBe(s.durumOzeti());
    // Parcali calistirma ile tek seferlik calistirma ayni
    const s3 = Simulasyon.olustur(kucukVeri(), 99);
    for (let t = 0; t <= 7 * GUN; t += 5 * SAAT + 13 * DAKIKA) s3.calistirKadar(t);
    s3.calistirKadar(7 * GUN);
    expect(s3.durumOzeti()).toBe(s.durumOzeti());
  });
});
