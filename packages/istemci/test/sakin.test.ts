/**
 * F0 sakin görsel: rozet önceliği, biten inşaat izleyicisi, "Dikkat" madde üretimi, gelen kutusu olayları ve
 * tek tr-TR biçimleyici (sahte küçük dünya; DOM yok).
 */
import { describe, expect, it } from "vitest";
import { DUNYA_EPOCH_MS, fmt, fmt1, gercekTarih, kisalt, sayi, simSaatMetni, sureMetni, tamTarihMetni, tarihMetni, yuzde } from "../src/arayuz/bicim";
import { DIKKAT_EN_COK, dikkatMaddeleri, dikkatPaneli } from "../src/arayuz/dikkat";
import { gelenOlaylari } from "../src/arayuz/gelen-kutusu";
import type { GovdeDurumu } from "../src/arayuz/govde";
import { yeniOyunDurumu } from "../src/arayuz/komut-govde";
import { icerikTablosu } from "../src/komut/tablo";
import { gercekVeriyiYukle } from "@bolge/veri";
import { BITTI_SURESI, InsaatIzleyici, ROZET_ONCELIK, rozetNedenleri, rozetSec, rozetleriHesapla } from "../src/veri/rozet";
import type { BitenInsaat, RozetNedenleri } from "../src/veri/rozet";
import type { BolgeKaresi, Dizin, Kare, SavasKaresi } from "../src/veri/kare-tipleri";

const dizin: Dizin = {
  devletler: [{ id: "a", ad: "Korvan", blok: "x" }, { id: "b", ad: "İsvend", blok: "x" }],
  mallar: [
    { id: "gida", ad: "Gıda", kategori: "tuketim", taban: 10 },
    { id: "celik", ad: "Çelik", kategori: "ara", taban: 20 },
  ],
  bolgeler: ["Ankara Platosu", "Varna Körfezi", "Bucak", "Tuna", "Sahipsiz Ova"].map((ad, i) => ({ id: `b${i}`, ad, devlet: i % 2, etiketler: i === 1 ? ["liman"] : [], x: 0, y: 0, nufus0: 1000 })),
  kenarlar: [],
  oyuncular: [{ id: "o0", devlet: 0, arketip: "oyuncu" }, { id: "o1", devlet: 1, arketip: "tuccar" }],
  tesisTurleri: [{ id: "celikhane", ad: "Çelikhane", tarim: false }, { id: "ciftlik", ad: "Çiftlik", tarim: true }],
  yontemler: [],
  birlikler: [],
};

function bolge(sahip: number, ek: Partial<BolgeKaresi> = {}): BolgeKaresi {
  return { sahip, nufus: 1000, gida: 100, ikmal: 100, stok: [10, 10], uretim: [0, 0], tesis: [], ordu: [], durus: 0, ...ek };
}

/**
 * b0 (o0): gıda %60 karşılanıyor (kıtlık) + çelikhane durmuş -> ▲ (öncelik)
 * b1 (o0, liman): çelikhane verimi %10 -> ◯
 * b2 (o0): sorunsuz (biten inşaat verilirse ✓)
 * b3 (o1): savaş hedefi + gıda açığı -> ⚔ (öncelik)
 * b4: sahipsiz
 */
const savas: SavasKaresi = { id: 9, saldiran: 1, savunan: 0, saldiranBolge: 3, hedefBolge: 0, evre: "hazirlik", ilan: 90, pencereBasi: 104, pencereBitis: 110, sonuc: null };
function kareKur(ek: Partial<Kare> = {}): Kare {
  return {
    saat: 100,
    bolgeler: [
      bolge(0, { gida: 60, tesis: [[0, 0, 0, 0, 0]] }),
      bolge(0, { tesis: [[0, 0, 1, 10, 100]] }),
      bolge(0, { tesis: [[1, 0, 1, 90, 100]] }),
      bolge(1, { gida: 30 }),
      bolge(-1),
    ],
    kapsam: [[1, 1, 70, 2, -1]],
    fiyat: [1000, 1000],
    savaslar: [],
    hazine: [100, 100],
    hazineOrani: [0, 0],
    ...ek,
  };
}

const bos: RozetNedenleri = { savas: false, eksik: null, gida: null, bosta: -1, bitti: null };
const biten = (bolge: number, saat: number): BitenInsaat => ({ bolge, saat, tesisTuru: 1, benim: true });

describe("rozetler: bölge başına en çok bir, öncelik ⚔ > ▲ > ◯ > ✓", () => {
  it("öncelik sırası sabit", () => {
    expect(ROZET_ONCELIK).toEqual(["savas", "eksik", "bosta", "bitti"]);
    const hepsi: RozetNedenleri = { savas: true, eksik: { mal: 1, hucre: { d: "acik", pct: 10, neden: "girdi_eksik", sure: -1 } }, gida: 40, bosta: 0, bitti: biten(0, 100) };
    expect(rozetSec(hepsi)).toBe("savas");
    expect(rozetSec({ ...hepsi, savas: false })).toBe("eksik");
    expect(rozetSec({ ...hepsi, savas: false, eksik: null })).toBe("eksik"); // yalnız gıda kıtlığı
    expect(rozetSec({ ...hepsi, savas: false, eksik: null, gida: null })).toBe("bosta");
    expect(rozetSec({ ...bos, bitti: biten(0, 100) })).toBe("bitti");
    expect(rozetSec(bos)).toBeNull();
  });
  it("oyuncu kipinde yalnız kendi bölgeleri; izlemede sahipli tüm bölgeler; sahipsiz hiç", () => {
    const kare = kareKur({ savaslar: [{ ...savas, hedefBolge: 3, saldiran: 0, savunan: 1, saldiranBolge: 0 }] });
    const bitenler = new Map([[2, biten(2, 97)]]);
    expect(rozetleriHesapla(kare, dizin, 0, bitenler)).toEqual(["eksik", "bosta", "bitti", null, null]);
    expect(rozetleriHesapla(kare, dizin, -1, bitenler)).toEqual(["eksik", "bosta", "bitti", "savas", null]);
    expect(rozetleriHesapla(null, dizin, 0, bitenler)).toEqual([null, null, null, null, null]);
  });
  it("tedarik açığı (kapsam < %50 veya engelli) ▲ verir; kısmi açık vermez", () => {
    const kare = kareKur({ kapsam: [[2, 1, 30, 2, -1]] });
    expect(rozetNedenleri(kare, dizin, 2, new Map()).eksik?.mal).toBe(1);
    expect(rozetNedenleri(kareKur(), dizin, 1, new Map()).eksik).toBeNull(); // %70 kısmi
  });
  it("✓ yalnız son BITTI_SURESI sim-saat görünür", () => {
    expect(rozetNedenleri(kareKur(), dizin, 2, new Map([[2, biten(2, 100 - BITTI_SURESI)]])).bitti).not.toBeNull();
    expect(rozetNedenleri(kareKur(), dizin, 2, new Map([[2, biten(2, 100 - BITTI_SURESI - 1)]])).bitti).toBeNull();
  });
});

describe("biten inşaat izleyicisi", () => {
  it("tesis sayısı artan bölgeyi ve kuyruktan düşen oyuncu inşaatını bulur; süre dolunca unutur", () => {
    const iz = new InsaatIzleyici();
    const k0 = kareKur();
    k0.oyuncu = { idx: 0, insaatlar: [{ id: 5, tur: "tesis", bolge: 1, hedef: 1, bitis: 101 }] } as unknown as Kare["oyuncu"];
    expect(iz.guncelle(k0)).toEqual([]);
    const k1 = kareKur({ saat: 101 });
    k1.bolgeler[2] = bolge(0, { tesis: [[1, 0, 1, 90, 100], [0, 0, 1, 0, 0]] });
    k1.oyuncu = { idx: 0, insaatlar: [] } as unknown as Kare["oyuncu"];
    const yeni = iz.guncelle(k1);
    expect(yeni.map((x) => x.bolge).sort()).toEqual([1, 2]);
    expect(yeni.find((x) => x.bolge === 1)).toEqual({ bolge: 1, saat: 101, tesisTuru: 1, benim: true });
    expect(yeni.find((x) => x.bolge === 2)?.tesisTuru).toBe(0);
    expect(iz.bitenler.size).toBe(2);
    iz.guncelle(kareKur({ saat: 101 + BITTI_SURESI + 1 }));
    expect(iz.bitenler.size).toBe(0);
    // sim saati geri giderse (yeni oyun) sıfırlanır
    iz.guncelle(k1);
    expect(iz.guncelle(kareKur({ saat: 1 }))).toEqual([]);
  });
});

describe("Dikkat paneli", () => {
  const veri = gercekVeriyiYukle();
  const ic = icerikTablosu(veri.icerik, veri.param);
  const g = (kare: Kare, ek: Partial<GovdeDurumu> = {}): GovdeDurumu => ({ kare, dizin, mal: -1, bolge: -1, bolgeAd: (i) => dizin.bolgeler[i]?.ad ?? "?", hazineGecmisi: [], ...ek });
  const oyuncuKaresi = (kare: Kare): Kare => ({
    ...kare,
    oyuncu: { idx: 0, bolgeler: { 0: { tesisler: [{ id: 41, tur: 0, yontem: 0, aktif: false }] }, 1: { tesisler: [{ id: 42, tur: 0, yontem: 0, aktif: true }] }, 2: { tesisler: [] } } } as unknown as Kare["oyuncu"],
  });

  it("maddeler önem sırasında: savaş, eksik (en kötü önce), boşta, bitti; eyleme dönük metin", () => {
    const kare = oyuncuKaresi(kareKur({ savaslar: [savas], kapsam: [[1, 1, 20, 2, -1]] }));
    const m = dikkatMaddeleri(g(kare, { oyun: yeniOyunDurumu(ic), bitenler: new Map([[2, biten(2, 99)]]) }));
    expect(m.map((x) => x.tur)).toEqual(["savas", "eksik", "eksik", "bosta", "bosta", "bitti"]);
    expect(m[0]?.baslik).toBe("Ankara Platosu: İsvend saldırıyor");
    expect(m[0]?.ayrinti).toContain("başlamasına 4 sa");
    // en kötü eksik önce: Varna çelik %20 (=%80 eksik), Ankara gıda %60 (=%40 eksik)
    expect(m[1]?.baslik).toBe("Varna Körfezi: çelik %80 eksik");
    expect(m[2]?.baslik).toBe("Ankara Platosu: gıda %40 eksik");
    // liman -> ithalat formu (oranı oyuncu seçer); limansız -> üretici tesis formu
    expect(m[1]?.eylem).toEqual({ etiket: "İthalat aç", form: { id: "ticaret_emri", degerler: { mal: "celik", yon: "ithalat" } } });
    expect(m[2]?.eylem?.form?.id).toBe("tesis_insa");
    // durmuş tesis doğrudan "Başlat" komutu alır; verimi düşük olan yalnız "Git"
    expect(m[3]?.baslik).toBe("Ankara Platosu: Çelikhane boşta");
    expect(m[3]?.eylem?.komut).toEqual({ tur: "tesis_durum", bolge: "b0", tesis: 41, aktif: true });
    expect(m[4]?.ayrinti).toContain("verim %10");
    expect(m[4]?.eylem).toBeUndefined();
    expect(m[5]?.baslik).toBe("Bucak: Çiftlik inşaatı bitti");
  });
  it("panel en çok DIKKAT_EN_COK madde, her birinde Git; fazlası sayılır; boşken sakin metin", () => {
    const kare = oyuncuKaresi(kareKur({ savaslar: [savas], kapsam: [[1, 1, 20, 2, -1]] }));
    const h = dikkatPaneli(g(kare, { oyun: yeniOyunDurumu(ic), bitenler: new Map([[2, biten(2, 99)]]) }));
    expect((h.match(/class="dikkat-satir"/g) ?? []).length).toBe(DIKKAT_EN_COK);
    expect((h.match(/>Git</g) ?? []).length).toBe(DIKKAT_EN_COK);
    expect(h).toContain("+1 madde daha");
    expect(h).toContain("data-form-ac=");
    expect(h).toContain("İthalat aç");
    const sakin = kareKur({ bolgeler: [bolge(0), bolge(0), bolge(0), bolge(1), bolge(-1)], kapsam: [] });
    expect(dikkatPaneli(g(oyuncuKaresi(sakin), { oyun: yeniOyunDurumu(ic) }))).toContain("ilgilenmen gereken bir şey yok");
  });
  it("izleme kipinde eylem düğmesi yok (yalnız Git); başkalarının bölgeleri de listelenir", () => {
    const m = dikkatMaddeleri(g(kareKur({ savaslar: [savas] })));
    expect(m.some((x) => x.bolge === 3 && x.tur === "eksik")).toBe(true);
    expect(m.every((x) => x.eylem === undefined)).toBe(true);
  });
});

describe("gelen kutusu: toast olmayan olaylar", () => {
  const ad = (i: number): string => dizin.bolgeler[i]?.ad ?? "?";
  it("bana ilan edilen savaş, biten kendi inşaatım; başkalarının savaşı oyuncu kipinde gelmez", () => {
    const once = kareKur();
    const simdi = kareKur({ saat: 101, savaslar: [savas, { ...savas, id: 10, saldiran: 1, savunan: 1 }] });
    const o = gelenOlaylari(once, simdi, dizin, 0, [biten(2, 101), { ...biten(3, 101), benim: false }], ad);
    expect(o.map((x) => x.metin)).toEqual(["İsvend, Ankara Platosu bölgenize savaş ilan etti.", "Bucak: Çiftlik inşaatı bitti."]);
    expect(gelenOlaylari(null, simdi, dizin, 0, [], ad)).toEqual([]);
  });
  it("savaş bitişi ve izleme kipinde tüm savaşlar", () => {
    const once = kareKur({ savaslar: [savas] });
    const simdi = kareKur({ saat: 120, savaslar: [{ ...savas, evre: "bitti", sonuc: { kazanan: 0, saldiranGuc: 1, savunanGuc: 2, kayipYuzde: 5 } }] });
    expect(gelenOlaylari(once, simdi, dizin, -1, [], ad)[0]?.metin).toBe("Savaş bitti (Ankara Platosu): savunan kazandı.");
  });
});

describe("tek tr-TR biçimleyici", () => {
  it("sayı: binlik nokta, ondalık virgül", () => {
    expect(sayi(12345.67, 1)).toBe("12.345,7");
    expect(fmt(1234567)).toBe("1.234.567");
    expect(fmt1(0.25)).toBe("0,3");
    expect(fmt(-0.2)).toBe("0");
    expect(kisalt(12_345)).toBe("12,3 B");
    expect(kisalt(2_500_000)).toBe("2,5 Mn");
  });
  it("yüzde: işaret önde, boşluksuz (%90)", () => {
    expect(yuzde(90)).toBe("%90");
    expect(yuzde(12.5, 1)).toBe("%12,5");
    expect(yuzde(0)).toBe("%0");
    expect(yuzde(-0.2)).toBe("%0");
    expect(yuzde(1234)).toBe("%1.234");
  });
  it("zaman biçimleri", () => {
    expect(simSaatMetni(0)).toBe("Gün 1 · 00:00");
    // Gerçek tarih: epoch (1 Ekim 2026 00:00 TRT) + t; Türkiye sabit UTC+3; artık yıl
    expect(tamTarihMetni(gercekTarih(0))).toBe("1 Ekim 2026 Perşembe");
    expect(tarihMetni(gercekTarih(23.99))).toBe("1 Ekim");
    expect(tamTarihMetni(gercekTarih(24))).toBe("2 Ekim 2026 Cuma");
    const saat = (iso: string): number => (Date.parse(iso) - DUNYA_EPOCH_MS) / 3_600_000;
    expect(tamTarihMetni(gercekTarih(saat("2028-02-28T21:00:00Z")))).toBe("29 Şubat 2028 Salı");
    expect(tarihMetni(gercekTarih(saat("2027-01-01T20:59:00Z")))).toBe("1 Ocak"); // 23:59 TRT
    expect(simSaatMetni(saat("2026-10-01T12:39:00Z"))).toBe("Gün 1 · 15:39");
    expect(sureMetni(0.5)).toBe("30 dk");
    expect(sureMetni(1.5)).toBe("1,5 sa");
    expect(sureMetni(24)).toBe("1 gün");
    expect(sureMetni(50)).toBe("2 gün 2 sa");
    expect(sureMetni(-3)).toBe("0 sa");
  });
});
