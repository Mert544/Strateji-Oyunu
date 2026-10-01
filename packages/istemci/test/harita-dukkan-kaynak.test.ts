/** Dükkân kaynağı (içerikten girdiler) ve dükkân komutu ret çevirileri (`hata-mulk.ts`). Saf; DOM yok. */
import { describe, expect, it } from "vitest";
import type { Icerik } from "../src/komut/tablo";
import type { DukkanKaresi } from "../src/harita/baglanti";
import { dukkanEksikMalzeme, dukkanKaynagiKur, dukkanKurBilgisi, dukkanKurmaKarsilaniyor, dukkanMaliyetDurumu, dukkanMaliyetGirdisi, kopruParam, referansFiyati } from "../src/harita/dukkan-kaynak";
import type { DukkanKartGirdisi } from "../src/harita/dukkan-kaynak";
import type { DukkanGorunumu, DukkanKaydi } from "../src/harita/dukkan-veri";
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

// --- yapı kurma akışında dükkân bilgisi (D2/D3) --------------------------------------------------------------------------------------------------------------------

const PENCERELI: YapiTanimi = { ...DUKKAN, malzeme: [...DUKKAN.malzeme, { id: "pencere", ad: "Pencere", miktar: 4_000 }], enFazlaIlBasina: 6 };

function icerikKurma(): Icerik {
  const ic = icerik();
  const mulk = (ic.param as unknown as { mulk: { perakende: { ilceBasinaEnFazla: number; dukkanTurleri: unknown[] }; esZamanliInsaat: number; yeniOyuncu: { ilkYapiIndirimPpm: number; indirimliYapiSayisi: number } } }).mulk;
  mulk.perakende.ilceBasinaEnFazla = 2;
  mulk.perakende.dukkanTurleri = [
    { id: "bakkal", mallar: ["gida"] },
    { id: "sekerci", mallar: ["tahil"] },
  ];
  mulk.esZamanliInsaat = 2;
  mulk.yeniOyuncu = { ilkYapiIndirimPpm: 300_000, indirimliYapiSayisi: 2 };
  return ic;
}

const kayit = (ilce: string | undefined): DukkanKaydi => ({ id: 1, tur: "bakkal", durum: "acik", ...(ilce !== undefined ? { ilce } : {}), markaAd: "", yuvalar: [], kasaPpm: 0, karsilanmaPpm: 0, gelirMiliSa: 0, giderMiliSa: 0, kampanya: { bitis: 0, kalanSaat: 0, kalanGun: 0 } });
const gorunum = (dukkanlar: DukkanKaydi[], kapali = false): DukkanGorunumu => ({ kapali, dukkanlar, markalar: [], ilkSatisT: null, satilabilirMallar: new Set(), kurmaKarsilaniyor: true, kampanyaAcik: false });
const ILCE_IL: Record<string, string> = { a: "il1", b: "il1", c: "il2" };

describe("dukkanKurBilgisi", () => {
  const g = (o: Partial<Parameters<typeof dukkanKurBilgisi>[0]> = {}) =>
    dukkanKurBilgisi({ ic: icerikKurma(), katalog: [PENCERELI], gorunum: gorunum([kayit("a"), kayit("b"), kayit("c")]), ilce: "a", ilceIl: (i) => ILCE_IL[i] ?? null, stokMili: () => 0, indirim: undefined, referans: referansFiyati(icerikKurma(), { fiyat: [0, 0] }), ...o });

  it("dükkân yoksa (katalog, perakende bloğu, kapalı görünüm, görünüm yok) tanımsız", () => {
    expect(g({ katalog: [] })).toBeUndefined();
    expect(g({ ic: icerik(false) })).toBeUndefined();
    expect(g({ gorunum: gorunum([], true) })).toBeUndefined();
    expect(g({ gorunum: null })).toBeUndefined();
  });

  it("ilçe ve il sayaçları görünümden; ilçesi bilinmeyen dükkân sayılmaz; sınırlar içerikten", () => {
    const b = g({ gorunum: gorunum([kayit("a"), kayit("b"), kayit("c"), kayit(undefined)]) })!;
    expect(b.ilceSayi).toBe(1);
    expect(b.ilSayi).toBe(2); // a ve b aynı ilde
    expect(b.ilceSinir).toBe(2);
    expect(b.ilSinir).toBe(6);
    expect(b.hucre).toBe(1);
    expect(b.esZamanliInsaat).toBe(2);
    expect(b.indirim).toEqual({ n: 2, ppm: 300_000 });
    expect(b.turler).toEqual(["bakkal", "sekerci"]);
  });

  it("tür uyumu depodaki mala bakar; pencere satırı indirimli gereken, stok ve eksik bedeli (R x eksik x ithalat net)", () => {
    const stok = (m: string): number => (m === "gida" ? 5_000 : m === "pencere" ? 1_500 : 0);
    const b = g({ stokMili: stok, referans: () => ({ mili: 30_000, yaklasik: false }) })!;
    expect(b.uyum).toEqual({ bakkal: true, sekerci: false });
    // indirimsiz: gereken 4, depoda 1 (1,5 aşağı), eksik 2,5 birim x 30.000 x ithalat net çarpanı yukarı yuvarlı
    expect(b.pencere?.gereken).toBe(4);
    expect(b.pencere?.var).toBe(1);
    expect(b.pencere?.tutarMili).toBeGreaterThan(2.5 * 30_000);
    // %30 indirim: gereken 2,8 -> 3 (yukarı); depo 1,5 -> eksik 1,3
    const i = g({ stokMili: stok, indirim: { ppm: 300_000, kalan: 2 }, referans: () => ({ mili: 30_000, yaklasik: false }) })!;
    expect(i.pencere?.gereken).toBe(3);
    // stok yeterse eksik bedel yok
    expect(g({ stokMili: () => 9_000 })!.pencere?.tutarMili).toBe(0);
  });

  it("katalogda pencere malzemesi yoksa pencere satırı tanımsız", () => {
    expect(g({ katalog: [DUKKAN] })!.pencere).toBeUndefined();
  });
});

describe("dukkanMaliyetDurumu / dukkanMaliyetGirdisi", () => {
  const bilgi = () => dukkanKurBilgisi({ ic: icerikKurma(), katalog: [PENCERELI], gorunum: gorunum([]), ilce: "a", ilceIl: (i) => ILCE_IL[i] ?? null, stokMili: () => 99_000, indirim: undefined, referans: () => ({ mili: 30_000, yaklasik: false }) })!;
  const stok99 = (): number => 99_000;
  const girdi = (o: Partial<DukkanKartGirdisi> = {}): DukkanKartGirdisi => ({
    tur: "bakkal",
    bilgi: bilgi(),
    plan: { gecerli: true, hazineYetmez: false, arsaMili: 0, yapiMili: 12_000_000, toplamMili: 12_000_000, indirimli: false, malzeme: PENCERELI.malzeme },
    yapi: PENCERELI,
    hazineMili: 50_000_000,
    surenInsaat: 0,
    stokMili: stok99,
    gonderiyor: false,
    ...o,
  });

  it("öncelik: gönderim, tür, sınır, inşaat sayısı, hazine, malzeme, pencere; hepsi tamamsa uygun", () => {
    expect(dukkanMaliyetDurumu(girdi())).toBe("uygun");
    expect(dukkanMaliyetDurumu(girdi({ gonderiyor: true, tur: null }))).toBe("gonderiliyor");
    expect(dukkanMaliyetDurumu(girdi({ tur: null }))).toBe("tur-secilmedi");
    expect(dukkanMaliyetDurumu(girdi({ bilgi: { ...bilgi(), ilceSayi: 2 } }))).toBe("sinir-dolu");
    expect(dukkanMaliyetDurumu(girdi({ bilgi: { ...bilgi(), ilSayi: 6 } }))).toBe("sinir-dolu");
    expect(dukkanMaliyetDurumu(girdi({ surenInsaat: 2 }))).toBe("insaat-siniri");
    expect(dukkanMaliyetDurumu(girdi({ plan: { ...girdi().plan, hazineYetmez: true } }))).toBe("hazine-yetmiyor");
    expect(dukkanMaliyetDurumu(girdi({ stokMili: (m) => (m === "celik" ? 0 : 99_000) }))).toBe("stok-eksik");
    expect(dukkanMaliyetDurumu(girdi({ bilgi: { ...bilgi(), pencere: { gereken: 4, var: 1, tutarMili: 100 } } }))).toBe("stok-eksik");
  });

  it("girdi: tür yoksa null; adet birim (yukarı), indirim notu yalnız indirimli planda, hazine bilinmiyorsa 0", () => {
    expect(dukkanMaliyetGirdisi(girdi({ tur: null }))).toBeNull();
    const g = dukkanMaliyetGirdisi(girdi())!;
    expect(g).toMatchObject({ tur: "bakkal", hucre: 1, durum: "uygun", celikAdet: 8, parcaAdet: 2, dukkanMili: 12_000_000, toplamMili: 12_000_000, hazineMili: 50_000_000, esZamanliInsaat: 2 });
    expect(g.indirim).toBeUndefined();
    expect(g.stokEksik).toBeUndefined();
    const i = dukkanMaliyetGirdisi(girdi({ plan: { ...girdi().plan, indirimli: true }, hazineMili: null }))!;
    expect(i.indirim).toEqual({ n: 2, yuzde: "%30" });
    expect(i.hazineMili).toBe(0);
  });

  it("eksik malzeme: çelik ve parça (pencere hariç), birim aşağı/yukarı", () => {
    expect(dukkanEksikMalzeme({ malzeme: PENCERELI.malzeme }, stok99)).toBeNull();
    expect(dukkanEksikMalzeme({ malzeme: PENCERELI.malzeme }, (m) => (m === "parca" ? 1_500 : 99_000))).toEqual({ mal: "parca", ad: "Makine parçası", var: 1, gereken: 2 });
    expect(dukkanEksikMalzeme({ malzeme: [{ id: "celik", ad: "Çelik", miktar: 8_000 }] }, () => 3_000)).toEqual({ mal: "celik", ad: "Çelik", var: 3, gereken: 8 });
    expect(dukkanMaliyetGirdisi(girdi({ plan: { ...girdi().plan, malzeme: [{ id: "celik", ad: "Çelik", miktar: 8_000 }] }, stokMili: () => 3_000 }))!.stokEksik).toEqual({ ad: "Çelik", var: 3, gereken: 8 });
    expect(dukkanEksikMalzeme({ malzeme: [{ id: "pencere", miktar: 4_000 }] }, () => 0)).toBeNull();
  });
});
