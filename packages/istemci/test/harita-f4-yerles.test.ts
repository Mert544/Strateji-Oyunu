/**
 * Yerleş ekranı mantığı (F4; saf): aday skoru, "en az biri yoğun/sakin" çeşitliliği, açılış önerisi, önerilen hazır arsa
 * (bütçe, kamu, tercih), kamu ayarı adres parametreleri, inşaat aşamaları, sunucu adresi ayrıştırma.
 */
import { describe, expect, it } from "vitest";
import { arsalariTuret, kamuAyari, KAMU_VARSAYILAN, onerilenArsa } from "../src/harita/arsa";
import { sunucuSecenekleri } from "../src/harita/baglanti-ws";
import { Bit } from "../src/harita/hucre";
import type { Izgara } from "../src/harita/hucre";
import { ACILIS, ACILIS_SIRASI, YERLES_ADAYLARI, yerlesOner, yerlesSkoru } from "../src/harita/yerles";
import type { AdayDurumu } from "../src/harita/yerles";
import { yapiAsamasi } from "../src/harita/yapi";

const durum = (ilce: string, ek: Partial<AdayDurumu> = {}): AdayDurumu => ({
  aday: YERLES_ADAYLARI.find((a) => a.ilce === ilce)!,
  ad: ilce,
  il: "",
  doluluk: 0.1,
  ayrilmis: 100,
  izgara: false,
  sunucuda: true,
  ...ek,
});

describe("Yerleş: adaylar ve skor", () => {
  it("açılış önerisi sınıf değil, üç öneri: Tarım, Sanayi, Pazar; her biri bir ilk yapı önerir", () => {
    expect(ACILIS_SIRASI).toEqual(["tarim", "sanayi", "pazar"]);
    expect(ACILIS.tarim.yapi).toBe("ciftlik");
    expect(new Set(YERLES_ADAYLARI.map((a) => a.acilis))).toEqual(new Set(["tarim", "sanayi", "pazar"]));
    for (const a of YERLES_ADAYLARI) {
      expect(a.ilce).toMatch(/^tr_\d+_[a-z]+$/);
      expect(a.uyum).toBeGreaterThan(0);
      expect(a.uyum).toBeLessThanOrEqual(1);
    }
  });

  it("skor: düşük doluluk, ayrılmış hücre ve ızgara bonusu yükseltir; bilinmeyen doluluk nötr", () => {
    const seyrek = durum("tr_41_gebze", { doluluk: 0.02 });
    const kalabalik = durum("tr_41_gebze", { doluluk: 0.9 });
    expect(yerlesSkoru(seyrek)).toBeGreaterThan(yerlesSkoru(kalabalik));
    expect(yerlesSkoru(durum("tr_41_gebze", { izgara: true }))).toBeCloseTo(yerlesSkoru(durum("tr_41_gebze")) + 0.5, 10);
    expect(yerlesSkoru(durum("tr_41_gebze", { ayrilmis: 0 }))).toBeLessThan(yerlesSkoru(durum("tr_41_gebze", { ayrilmis: 10 })));
    const bilinmeyen = yerlesSkoru(durum("tr_41_gebze", { doluluk: null, ayrilmis: null }));
    expect(bilinmeyen).toBeCloseTo(0.35 * 0.5 + 0.25 * 0.9 + 0.2 * 1 + 0.1 * 0.5 + 0.1 * 0.9, 10);
  });

  it("3 öneri, deterministik; ızgaralı ilçe önde; 'başka ilçe öner' sıradaki üçlüyü verir", () => {
    const hepsi = YERLES_ADAYLARI.map((a) => durum(a.ilce, { izgara: a.ilce === "tr_41_gebze", doluluk: null, ayrilmis: null }));
    const ilk = yerlesOner(hepsi);
    expect(ilk).toHaveLength(3);
    expect(ilk[0]!.aday.ilce).toBe("tr_41_gebze");
    expect(yerlesOner(hepsi).map((d) => d.aday.ilce)).toEqual(ilk.map((d) => d.aday.ilce));
    const sonraki = yerlesOner(hepsi, 3, 1);
    expect(sonraki).toHaveLength(3);
    expect(sonraki.map((d) => d.aday.ilce)).not.toEqual(ilk.map((d) => d.aday.ilce));
    expect(new Set([...ilk, ...sonraki].map((d) => d.aday.ilce)).size).toBe(6);
    // aday havuzu ≤ 3 ise hepsi
    expect(yerlesOner(hepsi.slice(0, 2))).toHaveLength(2);
  });

  it("çeşitlilik: doluluğu bilinenler arasında en az biri yoğun, en az biri sakin", () => {
    const d = [
      durum("tr_41_gebze", { doluluk: 0.01, izgara: true }),
      durum("tr_41_kandira", { doluluk: 0.02, izgara: true }),
      durum("tr_16_gemlik", { doluluk: 0.03, izgara: true }),
      durum("tr_54_hendek", { doluluk: 0.8, izgara: false }),
      durum("tr_41_korfez", { doluluk: 0.04, izgara: true }),
    ];
    const oner = yerlesOner(d);
    const dolulukler = oner.map((x) => x.doluluk!);
    const ortanca = [0.01, 0.02, 0.03, 0.04, 0.8].sort((a, b) => a - b)[2]!;
    expect(dolulukler.some((x) => x >= ortanca)).toBe(true);
    expect(dolulukler.some((x) => x < ortanca)).toBe(true);
    expect(oner).toHaveLength(3);
  });
});

describe("önerilen hazır arsa", () => {
  const KIRSAL_TARLA = Bit.ICERIDE | (1 << 5);
  const SANAYI = Bit.ICERIDE | (2 << 5);
  const izgara = (f: (x: number, y: number) => number): Izgara => {
    const durumlar = new Uint8Array(120 * 60);
    for (let y = 0; y < 60; y++) for (let x = 0; x < 120; x++) durumlar[y * 120 + x] = f(x, y);
    return { x0: 3000, y0: 4000, genislik: 120, yukseklik: 60, durum: durumlar };
  };

  it("merkeze en yakın boş arsa; açılış önerisinin arazisine uyan öne geçer; sahipli, kamu ve pahalı arsa atlanır", () => {
    // Sol yarı tarla, sağ yarı sanayi
    const k = arsalariTuret(izgara((x) => (x < 60 ? KIRSAL_TARLA : SANAYI)), { acik: false });
    const merkezX = 3000 + 60;
    const merkezY = 4000 + 30;
    const tarim = onerilenArsa(k, () => false, merkezX, merkezY, "tarim")!;
    const sanayi = onerilenArsa(k, () => false, merkezX, merkezY, "sanayi")!;
    expect(tarim.arazi).toBe(1);
    expect(sanayi.arazi).toBe(2);
    expect(tarim.hucreler.length).toBeGreaterThanOrEqual(8);
    // Aynı arsa sahipliyse bir sonrakine geçer
    const sahipli = new Set(tarim.hucreler);
    const sonraki = onerilenArsa(k, (id) => sahipli.has(id), merkezX, merkezY, "tarim")!;
    expect(sonraki.kimlik).not.toBe(tarim.kimlik);
    // Bütçe: her arsa pahalı sayılırsa öneri yok; yalnız tarım arsaları ucuzsa tarım seçilir
    expect(onerilenArsa(k, () => false, merkezX, merkezY, "tarim", { fiyat: () => 100, tavanMili: 50 })).toBeNull();
    const butceli = onerilenArsa(k, () => false, merkezX, merkezY, "sanayi", { fiyat: (a) => (a.arazi === 1 ? 10 : 1000), tavanMili: 100 })!;
    expect(butceli.arazi).toBe(1);
    // Kamu arsası önerilmez
    const kk = arsalariTuret(izgara(() => KIRSAL_TARLA), { oran: 0.2 });
    const oneri = onerilenArsa(kk, () => false, merkezX, merkezY, "tarim")!;
    expect(oneri.kamu).toBe(false);
  });
});

describe("kamu ayarı ve adres parametreleri", () => {
  it("varsayılan açık %4; ?kamu=0 kapatır; ?kamu-oran= oranı değiştirir (geçersiz oran yok sayılır)", () => {
    expect(kamuAyari("")).toEqual(KAMU_VARSAYILAN);
    expect(kamuAyari("?kamu=0").acik).toBe(false);
    expect(kamuAyari("?kamu-oran=0.1").oran).toBe(0.1);
    expect(kamuAyari("?kamu-oran=7").oran).toBe(0.04);
    expect(kamuAyari("?kamu-oran=abc").oran).toBe(0.04);
  });

  it("?sunucu= ve ?token= ayrıştırılır; sunucu yoksa null (sahte bağdaştırıcı)", () => {
    expect(sunucuSecenekleri("")).toBeNull();
    expect(sunucuSecenekleri("?adaptif=0")).toBeNull();
    expect(sunucuSecenekleri("?sunucu=ws%3A%2F%2F127.0.0.1%3A8787&token=gel1.ali.x")).toEqual({ url: "ws://127.0.0.1:8787", token: "gel1.ali.x" });
    expect(sunucuSecenekleri("?sunucu=ws://h:1")).toEqual({ url: "ws://h:1", token: "" });
  });
});

describe("inşaat aşaması", () => {
  it("sürenin üçte birlik dilimleri: Temel, İskele, Gövde, Tamam; biten tesis her zaman Tamam", () => {
    const y = { durum: "insaat" as const, baslangic: 0, bitis: 12 };
    expect([0, 3, 4, 7, 8, 11, 12, 99].map((t) => yapiAsamasi(y, t, 0))).toEqual([0, 0, 1, 1, 2, 2, 3, 3]);
    expect(yapiAsamasi({ durum: "tesis" }, 0, 0)).toBe(3);
  });

  it("başlangıç bilinmiyorsa tahmini süre; bitiş de bilinmiyorsa (başkasının inşaatı) İskele", () => {
    expect(yapiAsamasi({ durum: "insaat", bitis: 1200 }, 1100, 1200)).toBe(2); // başlangıç 0 sayılır: 1100/1200 ≥ 2/3
    expect(yapiAsamasi({ durum: "insaat", bitis: 1200 }, 0, 1200)).toBe(0);
    expect(yapiAsamasi({ durum: "insaat" }, 5, 100)).toBe(1);
  });
});
