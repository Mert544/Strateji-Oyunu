/** Dükkân kaynağı (içerikten girdiler) ve dükkân komutu ret çevirileri (`hata-mulk.ts`). Saf; DOM yok. */
import { describe, expect, it } from "vitest";
import type { Icerik } from "../src/komut/tablo";
import type { DukkanKaresi } from "../src/harita/baglanti";
import { dukkanKaynagiKur, dukkanKurmaKarsilaniyor, kopruParam, referansFiyati } from "../src/harita/dukkan-kaynak";
import { mulkHatasiTurkce } from "../src/harita/hata-mulk";
import type { YapiTanimi } from "../src/harita/yapi";

const DUKKAN: YapiTanimi = {
  id: "dukkan",
  ad: "Dükkân",
  grup: "Kent ve altyapı",
  yuva: 1,
  paraMili: 12_000_000,
  malzeme: [
    { id: "celik", ad: "Çelik", miktar: 8_000 },
    { id: "parca", ad: "Makine parçası", miktar: 2_000 },
  ],
  sureSaat: 1,
  ilkGunSureSaat: 0.1,
  ek: true,
};

function icerik(perakende = true): Icerik {
  return {
    mallar: [
      { id: "tahil", ad: "Tahıl", kategori: "x", taban: 40_000, depolanabilir: true },
      { id: "gida", ad: "Gıda", kategori: "x", taban: 60_000, depolanabilir: true },
    ],
    malIdx: { tahil: 0, gida: 1 },
    yontemler: [],
    param: {
      pazar: { ihracatCarpaniPpm: 900_000, ithalatCarpaniPpm: 1_100_000, islemKomisyonuPpm: 10_000 },
      mulk: perakende
        ? {
            perakende: {
              fiyatKademeleriPpm: [850_000, 950_000, 1_050_000, 1_150_000],
              fiyatDegisimEnAzSaat: 6,
              olcekler: [{ giderMiliSaat: 132_000 }],
              dukkanTurleri: [{ id: "bakkal", mallar: ["gida"] }],
            },
          }
        : {},
    },
  } as unknown as Icerik;
}

describe("kurma bedeli karşılanıyor (D0 koşulu)", () => {
  const stok = (m: Record<string, number>) => (mal: string): number => m[mal] ?? 0;
  it("para ve malzeme yeterliyse true; hazine ya da stok yetmezse false; dükkân yoksa false", () => {
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 50_000_000, stokMili: stok({ celik: 8_000, parca: 2_000 }) })).toBe(true);
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 11_999_999, stokMili: stok({ celik: 8_000, parca: 2_000 }) })).toBe(false);
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 50_000_000, stokMili: stok({ celik: 7_999, parca: 2_000 }) })).toBe(false);
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 50_000_000, stokMili: stok({ celik: 8_000 }) })).toBe(false);
    expect(dukkanKurmaKarsilaniyor(undefined, { hazineMili: 1e12, stokMili: () => 1e12 })).toBe(false);
  });

  it("hazine bilinmiyorsa para denetlenmez; ilk yapı indirimi para ve malzemeye (maliyet kartıyla aynı sayı)", () => {
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: null, stokMili: stok({ celik: 8_000, parca: 2_000 }) })).toBe(true);
    // %30 indirim: para 8.400, çelik 5,6, parça 1,4
    const d = { ppm: 300_000, kalan: 2 };
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 8_400_000, stokMili: stok({ celik: 5_600, parca: 1_400 }), indirim: d })).toBe(true);
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 8_399_999, stokMili: stok({ celik: 5_600, parca: 1_400 }), indirim: d })).toBe(false);
    // hak bitmişse (kalan 0) indirim yok
    expect(dukkanKurmaKarsilaniyor(DUKKAN, { hazineMili: 8_400_000, stokMili: stok({ celik: 5_600, parca: 1_400 }), indirim: { ppm: 300_000, kalan: 0 } })).toBe(false);
  });
});

describe("referans fiyat ve parametre görünümü", () => {
  it("kare dünya fiyatı varsa o (yaklaşık değil); yoksa taban ve yaklaşık; bilinmeyen mal undefined", () => {
    const ic = icerik();
    const r = referansFiyati(ic, { fiyat: [0, 66_000] });
    expect(r("gida")).toEqual({ mili: 66_000, yaklasik: false });
    expect(r("tahil")).toEqual({ mili: 40_000, yaklasik: true }); // fiyat 0: taban
    expect(r("yok")).toBeUndefined();
    expect(referansFiyati(ic, null)("gida")).toEqual({ mili: 60_000, yaklasik: true });
  });

  it("kopruParam: dükkân kuralı ve pazar içerikten; perakende bloğu yoksa null", () => {
    expect(kopruParam(icerik()).perakende?.fiyatDegisimEnAzSaat).toBe(6);
    expect(kopruParam(icerik()).pazar.ihracatCarpaniPpm).toBe(900_000);
    expect(kopruParam(icerik(false)).perakende).toBeNull();
  });
});

describe("dukkanKaynagiKur", () => {
  const kare = (o: { insaat?: boolean } = {}): DukkanKaresi =>
    ({
      t: 1000,
      bolgeler: [],
      fiyat: [0, 66_000],
      oyuncu: { id: "ali", insaatlar: o.insaat ? [[7, "tesis", 0, 0, 5000, 100, "dukkan"]] : [] },
      ilceler: [],
    }) as unknown as DukkanKaresi;
  const girdi = (k: DukkanKaresi | null, ic = icerik(), katalog: readonly YapiTanimi[] = [DUKKAN]) => ({ kare: () => k, ic, katalog, hazineMili: () => 50_000_000, stokMili: () => 1e9, indirim: () => undefined });

  it("kare yoksa görünüm null (dükkân yüzeyleri çıkmaz)", () => {
    expect(dukkanKaynagiKur(girdi(null)).gorunum()).toBeNull();
    expect(dukkanKaynagiKur(girdi(null)).sonuc()).toBeNull();
  });

  it("dükkân kuralı yoksa ya da katalogda dukkan ek yapısı yoksa kapalı", () => {
    expect(dukkanKaynagiKur(girdi(kare(), icerik(false))).gorunum()?.kapali).toBe(true);
    expect(dukkanKaynagiKur(girdi(kare(), icerik(), [])).gorunum()?.kapali).toBe(true);
  });

  it("açık dünya: süren dükkân inşaatı türsüz (null) görünür; kurmaKarsilaniyor planlayıcıdan; satılabilir mallar içerikten", () => {
    const g = dukkanKaynagiKur(girdi(kare({ insaat: true }))).gorunum()!;
    expect(g.kapali).toBe(false);
    expect(g.dukkanlar).toHaveLength(1);
    expect(g.dukkanlar[0]).toMatchObject({ durum: "insaat", tur: null });
    expect(g.kurmaKarsilaniyor).toBe(true);
    expect([...g.satilabilirMallar]).toEqual(["gida"]);
    const az = dukkanKaynagiKur({ ...girdi(kare()), hazineMili: () => 1 }).gorunum()!;
    expect(az.kurmaKarsilaniyor).toBe(false);
  });
});

describe("dükkân komutu ret çevirisi (DUK-xx / MRK-xx → metin tablosu)", () => {
  const t = (ham: string): string => mulkHatasiTurkce(ham);
  it("tür, ölçek ve sınır", () => {
    expect(t("perakende kapali")).toBe("Bu dünyada dükkân henüz açık değil.");
    expect(t("dukkan turu gerekli (dukkanTuru)")).toBe("Dükkân türünü seçmelisin.");
    expect(t("bilinmeyen dukkan turu: x")).toBe("Bu dükkân türü yok.");
    expect(t("dukkan olcegi henuz acik degil: M")).toBe("Bu dükkân boyu henüz açılmadı.");
    expect(t("bakkal dukkani M olceginde kurulamaz")).toBe("Bu dükkân türü bu boyda kurulamaz.");
    expect(t("dukkanTuru yalniz dukkan yapisinda verilebilir: ciftlik")).toBe("Dükkân türü yalnız dükkân kurarken seçilir.");
    expect(t("ilcede en cok 2 dukkan (biten + suren)")).toBe("Bu ilçede en çok 2 dükkânın olabilir.");
    expect(t("ilde en cok 6 Dükkân (biten + suren)")).toBe("Bu ilde en çok 6 dükkânın olabilir.");
  });

  it("raf ve fiyat: yuva dili, süre doldurulmuş, ham yer tutucu yok", () => {
    expect(t("gecersiz yuva: 9 (0..3)")).toBe("Geçersiz raf yuvası.");
    expect(t("fiyat degisimi icin 3 saat beklenmeli")).toBe("Bu yuvaya en erken 3 sa sonra mal koyabilirsin.");
    expect(t("yuva zaten bos")).toBe("Raf zaten boş.");
    expect(t("bilinmeyen mal: x")).toBe("Bilinmeyen mal.");
    expect(t("bu mal bu dukkan turunde satilamaz: celik")).toBe("Bu dükkânda bu mal satılamaz.");
    expect(t("bu mal baska yuvada: gida")).toBe("Bu mal zaten başka yuvada.");
    expect(t("yuva zaten bu malla dolu: gida")).toBe("Bu raf zaten bu malla dolu.");
    expect(t("bos yuvaya fiyat verilemez")).toBe("Önce rafa mal koy.");
    expect(t("gecersiz fiyat kademesi: 9 (0..3)")).toBe("Geçersiz fiyat.");
    expect(t("fiyat zaten bu kademede")).toBe("Fiyat zaten bu seviyede.");
    expect(t("kampanya kademesi acik degil")).toBe("Kampanya fiyatı şu an kullanılamıyor.");
    expect(t("kampanya haftalik gun siniri (en cok 3 gun)")).toBe("Bu hafta en çok 3 gün kampanya yapabilirsin.");
    expect(t("kampanya gunluk saat siniri (en cok 4 saat)")).toBe("Bugün en çok 4 saat kampanya yapabilirsin.");
    for (const m of ["fiyat degisimi icin 3 saat beklenmeli", "kampanya haftalik gun siniri (en cok 3 gun)", "hesap basina en cok 4 marka", "marka adi 2 ile 24 karakter arasinda olmali"]) expect(t(m)).not.toMatch(/\{[a-z_]+\}/);
  });

  it("marka ve kaldırma", () => {
    expect(t("hesap basina en cok 4 marka")).toBe("En çok 4 marka tanımlayabilirsin.");
    expect(t("marka adi metin olmali")).toBe("Marka adı yazılmalı.");
    expect(t("marka adi 2 ile 24 karakter arasinda olmali")).toBe("Marka adı 2 ile 24 karakter arasında olmalı.");
    expect(t("marka adinda gecersiz karakter")).toContain("yalnız harf, rakam");
    expect(t("marka adi bastan ya da sondan bosluk icermemeli")).toBe("Marka adı boşlukla başlayıp bitemez.");
    expect(t("marka adinda art arda bosluk olamaz")).toBe("Art arda boşluk olamaz.");
    expect(t("marka adi en az bir harf icermeli")).toBe("Marka adında en az bir harf olmalı.");
    expect(t("gecersiz marka simgesi: 9 (0..7)")).toBe("Geçersiz simge. · Geçersiz renk.");
    expect(t("marka zaten bu degerlerde")).toBe("Marka zaten böyle.");
    expect(t("bilinmeyen marka: 5")).toBe("Geçersiz marka. · Önce marka tanımlamalısın.");
    expect(t("dukkan zaten bu markada")).toBe("Dükkân zaten bu markada.");
    expect(t("dukkan henuz tamamlanmadi: insaat_iptal kullanin (7)")).toBe("Dükkân henüz bitmedi; inşaatı iptal edebilirsin.");
    expect(t("dukkan bulunamadi: 9")).toBe("Bu dükkân yok.");
  });

  it("dükkân dışı iletiler eskisi gibi", () => {
    expect(t("hucre bos degil")).toBe("Hücrede zaten yapı ya da inşaat var.");
    expect(t("ilde en cok 2 Ambar (biten + suren)")).toBe("Bu ilde en çok 2 Ambar olabilir (biten + süren).");
    expect(t("tamamen bilinmeyen")).toBe("Sunucu isteği reddetti: tamamen bilinmeyen");
  });
});
