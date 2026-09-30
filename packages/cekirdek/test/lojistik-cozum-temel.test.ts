/**
 * Lojistik çözüm: akış, gecikme ve yoldaki mal korunumu, kenar kapasitesi, askeri rezerv,
 * kenar geliştirme, stok 0 iken öncelik sırası, kapsam nedenleri ve determinizm.
 */
import { describe, expect, it } from "vitest";
import type { VeriPaketi } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { PPM, SAAT } from "../src/tipler";
import { bolge, hazine, kur, malNo, saatKos, simdiyiIsle, stok, ver, verTamam } from "./ekonomi-yardimci";

/** Tüm bölge × mal için: gelenOran + bekleyen oran_delta toplamı = güncel akışların hedefe giden toplamı. */
function korunumHatalari(s: Simulasyon): string[] {
  const d = s.dunya;
  const nm = s.ic.mallar.length;
  const bekleyen = d.bolgeler.map(() => new Array<number>(nm).fill(0));
  for (const o of d.kuyruk) if (o.veri.tur === "oran_delta") bekleyen[o.veri.bolge]![o.veri.mal]! += o.veri.delta;
  const akis = d.bolgeler.map(() => new Array<number>(nm).fill(0));
  for (const a of d.lojistik.akislar) akis[a.hedef]![a.mal]! += a.oranSaat;
  const hatalar: string[] = [];
  d.bolgeler.forEach((b, r) => {
    for (let m = 0; m < nm; m++) {
      const beklenen = akis[r]![m]!;
      const gercek = b.stoklar[m]!.gelenOran + bekleyen[r]![m]!;
      if (gercek !== beklenen) hatalar.push(`${b.id}/${s.ic.mallar[m]!.id}: gelen+yolda=${gercek} akis=${beklenen}`);
    }
  });
  return hatalar;
}

/** Bir kenarın şu anki sivil kullanımı (toplam − askeri). */
function sivilKullanim(s: Simulasyon, kenar: number): number {
  const k = s.dunya.kenarlar[kenar]!;
  return k.kullanilanSaat - k.askeriKullanilanSaat;
}

/** İki bölgeli (m_ova, m_liman) sıkışık ağ: gıda stokları 0, kenar kapasitesi düşük. */
function sikisikAg(kapasite: number) {
  return kur({
    oyuncular: { a: ["m_ova", "m_liman"], b: ["m_col"] },
    duzenle: (v: VeriPaketi) => {
      v.param.baslangic.stok["gida"] = 0;
      v.param.baslangic.birlikler = {}; // ordu ikmali karışmasın
      v.harita.kenarlar[0]!.kapasiteSaat = kapasite;
    },
  });
}

describe("akis, gecikme ve korunum", () => {
  it("yoldaki mal korunur: gelenOran + bekleyen delta = akislarin toplami (her an)", () => {
    const { s } = kur();
    for (let h = 1; h <= 72; h += 5) {
      s.calistirKadar(h * SAAT + 12_345);
      expect(korunumHatalari(s), `t=${h}sa`).toEqual([]);
    }
    expect(s.dunya.lojistik.akislar.length).toBeGreaterThan(0);
  });

  it("akis kaydi tutarli: yol bos degil, sure = kenar sureleri toplami, kaynak/hedef sahip ag icinde", () => {
    const { s } = kur();
    saatKos(s, 36);
    for (const a of s.dunya.lojistik.akislar) {
      expect(a.yol.length).toBeGreaterThan(0);
      expect(a.oranSaat).toBeGreaterThan(0);
      expect(a.sureMs).toBe(a.yol.reduce((t, k) => t + s.dunya.kenarlar[k]!.sureMs, 0));
      expect(s.dunya.bolgeler[a.kaynak]!.sahip).toBe(a.sahip);
      expect(s.dunya.bolgeler[a.hedef]!.sahip).toBe(a.sahip);
      expect(a.kaynak).not.toBe(a.hedef);
    }
    // b'nin tek bölgesi var: akış yok
    expect(s.dunya.lojistik.akislar.some((a) => a.sahip === "b")).toBe(false);
  });

  it("kenar kullanimi kapasiteyi asmaz (nicemleme asagi yuvarlar)", () => {
    const { s } = kur();
    for (let h = 1; h <= 48; h += 3) {
      s.calistirKadar(h * SAAT);
      for (const k of s.dunya.kenarlar) {
        expect(k.kullanilanSaat).toBeLessThanOrEqual(k.kapasiteSaat);
        expect(k.askeriKullanilanSaat).toBeLessThanOrEqual(k.kullanilanSaat);
      }
    }
  });

  it("akis gecikmeli ulasir: hedefte t + sure'de oran_delta, kaynakta cikis hemen", () => {
    const { s } = sikisikAg(600_000);
    simdiyiIsle(s); // t=0: ilk çözüm
    expect(s.dunya.zaman).toBe(0);
    const gida = malNo(s, "gida");
    const a = s.dunya.lojistik.akislar.find((x) => x.mal === gida);
    expect(a).toBeDefined();
    const hedef = s.dunya.bolgeler[a!.hedef]!.stoklar[gida]!;
    const kaynak = s.dunya.bolgeler[a!.kaynak]!;
    // Hedefe hiçbir şey henüz ulaşmadı; teslimler kuyrukta
    expect(hedef.gelenOran).toBe(0);
    const teslim = s.dunya.kuyruk.filter((o) => o.veri.tur === "oran_delta" && o.veri.mal === gida && o.veri.bolge === a!.hedef);
    expect(teslim.length).toBeGreaterThan(0);
    const ilkTeslim = Math.min(...teslim.map((o) => o.t));
    expect(ilkTeslim).toBeGreaterThanOrEqual(3 * SAAT); // en kısa kenar 3 saat
    // Kaynakta çıkış hemen yerel orana yansır
    expect(kaynak.stoklar[gida]!.yerelOran).toBeLessThan(kaynak.uretimOrani[gida]!);
    s.calistirKadar(ilkTeslim - 1);
    expect(hedef.gelenOran).toBe(0);
    s.calistirKadar(ilkTeslim);
    expect(hedef.gelenOran).toBeGreaterThan(0);
    s.calistirKadar(ilkTeslim + 6 * SAAT);
    expect(korunumHatalari(s)).toEqual([]);
  });

  it("stok tuketicilere gonderilir: gida ureticisinden yoksun bolgeye gida ulasir", () => {
    const { s } = sikisikAg(600_000);
    saatKos(s, 48);
    expect(stok(s, "m_liman", "gida")).toBeGreaterThan(0);
    expect(bolge(s, "m_liman").gidaKarsilanmaPpm).toBe(PPM);
  });
});

describe("kenar kapasitesi ve askeri rezerv", () => {
  it("askeri_rezerv sivil akisi kisar", () => {
    const { s } = sikisikAg(20_000);
    saatKos(s, 8);
    const once = sivilKullanim(s, 0);
    expect(once).toBeGreaterThan(18_000);
    expect(once).toBeLessThanOrEqual(20_000);
    expect(ver(s, "a", { tur: "askeri_rezerv", oranPpm: 500_001 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "askeri_rezerv", oranPpm: -1 }).tamam).toBe(false);
    verTamam(s, "a", { tur: "askeri_rezerv", oranPpm: 500_000 });
    simdiyiIsle(s);
    const sonra = sivilKullanim(s, 0);
    expect(sonra).toBeLessThanOrEqual(10_000);
    expect(sonra).toBeGreaterThan(8_000);
    expect(sonra).toBeLessThan(once);
    // rezervi geri al
    verTamam(s, "a", { tur: "askeri_rezerv", oranPpm: 0 });
    simdiyiIsle(s);
    expect(sivilKullanim(s, 0)).toBeGreaterThan(18_000);
  });

  it("kapasite yetmeyen hedef icin kapsam nedeni 'kapasite' olur", () => {
    const { s } = sikisikAg(20_000);
    saatKos(s, 6);
    const hucre = s.dunya.lojistik.kapsam[s.ic.bolgeIndeks["m_liman"]!]![malNo(s, "gida")]!;
    // Liman nüfusu 30 birim/sa gıda ister, kenar en çok 20 taşır; ova'da fazla kalır
    expect(hucre.karsilanmaPpm).toBeLessThan(900_000);
    expect(hucre.neden).toBe("kapasite");
    expect(hucre.enYakinKaynakMs).toBe(3 * SAAT);
    expect(s.dunya.bolgeler[s.ic.bolgeIndeks["m_liman"]!]!.gidaKarsilanmaPpm).toBeLessThan(PPM);
  });
});

describe("kenar gelistirme", () => {
  it("maliyet dusulur, sure sonunda kapasite artar, devam eden gelistirme reddedilir", () => {
    const { s } = kur();
    simdiyiIsle(s);
    const k0 = s.dunya.kenarlar[0]!.kapasiteSaat;
    const celik0 = stok(s, "m_ova", "celik");
    const parca0 = stok(s, "m_ova", "parca");
    const para0 = hazine(s, "a");
    const p = s.ic.param.lojistik;
    verTamam(s, "a", { tur: "kenar_gelistir", kenar: 0 });
    expect(celik0 - stok(s, "m_ova", "celik")).toBe(p.gelistirmeMaliyeti["celik"]);
    expect(parca0 - stok(s, "m_ova", "parca")).toBe(p.gelistirmeMaliyeti["parca"]);
    expect(para0 - hazine(s, "a")).toBe(p.gelistirmeParasi);
    expect(s.dunya.insaatlar).toHaveLength(1);
    expect(s.dunya.insaatlar[0]).toMatchObject({ tur: "kenar", hedef: 0, bolge: s.ic.bolgeIndeks["m_ova"] });
    expect(ver(s, "a", { tur: "kenar_gelistir", kenar: 0 }).tamam).toBe(false); // devam ediyor

    s.calistirKadar(p.gelistirmeSuresiSaat * SAAT - 1);
    expect(s.dunya.kenarlar[0]!.kapasiteSaat).toBe(k0);
    s.calistirKadar(p.gelistirmeSuresiSaat * SAAT);
    expect(s.dunya.kenarlar[0]!.kapasiteSaat).toBe(k0 + Math.floor((k0 * p.gelistirmeArtisPpm) / PPM));
    expect(s.dunya.insaatlar).toHaveLength(0);
  });

  it("denetimler: kullanilamayan kenar, baskasinin kenari, deniz karari, yetersiz maliyet", () => {
    const { s } = kur();
    simdiyiIsle(s);
    // kenar 2: m_gecit(a) - m_dag(a) ... a'nın; kenar 3: m_dag(a) - m_col(b) kullanılamaz
    expect(ver(s, "a", { tur: "kenar_gelistir", kenar: 3 }).tamam).toBe(false);
    expect(ver(s, "b", { tur: "kenar_gelistir", kenar: 0 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "kenar_gelistir", kenar: 99 }).tamam).toBe(false);
    const ozet0 = s.durumOzeti();
    // deniz kenarı (6: liman-şehir) karar gerektirir
    expect(ver(s, "a", { tur: "kenar_gelistir", kenar: 6 }).tamam).toBe(false);
    expect(s.durumOzeti()).toBe(ozet0);
    s.dunya.oyuncular.find((o) => o.id === "a")!.kararlar.push("deniz_kenar_gelistir");
    verTamam(s, "a", { tur: "kenar_gelistir", kenar: 6 });
    expect(s.dunya.insaatlar[0]).toMatchObject({ tur: "kenar", hedef: 6 });
    // maliyet kenarın oyuncuya ait ilk ucundaki (a) bölgeden düşer: m_liman
    // yetersiz stok
    const { s: s2 } = kur();
    simdiyiIsle(s2);
    const ova = bolge(s2, "m_ova");
    ova.stoklar[malNo(s2, "celik")]!.miktar = 0;
    const r = ver(s2, "a", { tur: "kenar_gelistir", kenar: 0 });
    expect(r.tamam).toBe(false);
    expect(s2.dunya.insaatlar).toHaveLength(0);
  });
});

describe("stok 0 iken oncelik sirasi", () => {
  it("nufus once karsilanir; kalan akis tesis girdilerine oransal dagilir", () => {
    // m_sehir: yakıt stoku 0; tek kaynak ithalat (10000/sa). Nüfus 7500, muhimmat+parça fabrikası 20000 ister.
    const { s } = kur({
      oyuncular: { a: ["m_sehir"], b: ["m_col"] },
      duzenle: (v) => {
        v.harita.bolgeler.find((b) => b.id === "m_sehir")!.etiketler.push("liman");
        v.param.baslangic.stok["yakit"] = 0;
        v.param.baslangic.birlikler = {};
      },
    });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_sehir", mal: "yakit", yon: "ithalat", oranSaat: 10_000 });
    saatKos(s, 3);
    const sehir = bolge(s, "m_sehir");
    const tur = (t: number) => s.ic.tesisTurleri[t]!.id;
    const parca = sehir.tesisler.find((t) => tur(t.tur) === "parca_fabrikasi")!;
    const muhimmat = sehir.tesisler.find((t) => tur(t.tur) === "muhimmat_fabrikasi")!;
    // (10000 − 7500) / 20000 = %12,5
    expect(parca.verimPpm).toBeGreaterThan(115_000);
    expect(parca.verimPpm).toBeLessThan(135_000);
    expect(muhimmat.verimPpm).toBe(parca.verimPpm);
    // nüfus tüketimi tam karşılandı: yakıt stoku büyümez
    expect(stok(s, "m_sehir", "yakit")).toBe(0);
    expect(sehir.gidaKarsilanmaPpm).toBe(PPM);
  });
});

describe("kapsam nedenleri", () => {
  it("erisim_yok: ag disinda kalan bolge gida kitligi", () => {
    const { s } = kur({ oyuncular: { a: ["m_ova", "m_col"], b: ["m_dag"] } });
    saatKos(s, 24 * 7);
    const hucre = s.dunya.lojistik.kapsam[s.ic.bolgeIndeks["m_col"]!]![malNo(s, "gida")]!;
    expect(hucre.karsilanmaPpm).toBeLessThan(990_000);
    expect(hucre.neden).toBe("erisim_yok");
    expect(hucre.enYakinKaynakMs).toBe(-1);
    // ova yerel üretimiyle doyuyor
    expect(s.dunya.lojistik.kapsam[s.ic.bolgeIndeks["m_ova"]!]![malNo(s, "gida")]!.neden).toBe("yok");
  });

  it("girdi_eksik: agda hicbir yerde arz yok", () => {
    const { s } = kur();
    saatKos(s, 24 * 7);
    const hucre = s.dunya.lojistik.kapsam[s.ic.bolgeIndeks["m_col"]!]![malNo(s, "gida")]!;
    expect(hucre.karsilanmaPpm).toBeLessThan(990_000);
    expect(hucre.neden).toBe("girdi_eksik");
  });

  it("talebi olmayan hucre 'yok' ve %100", () => {
    const { s } = kur();
    saatKos(s, 2);
    const satir = s.dunya.lojistik.kapsam[s.ic.bolgeIndeks["m_ova"]!]!;
    const petrol = satir[malNo(s, "petrol")]!;
    expect(petrol).toMatchObject({ karsilanmaPpm: PPM, neden: "yok" });
  });
});

describe("determinizm", () => {
  it("ayni tohum + gunluk ayni durum ozeti verir (yenidenOynat) ve klon ayni gider", () => {
    const { s, veri } = kur({ tohum: 42 });
    const komutlar: [number, string, Parameters<Simulasyon["uygula"]>[0]["komut"]][] = [
      [2, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 60_000 }],
      [3, "a", { tur: "kenar_gelistir", kenar: 1 }],
      [5, "a", { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "cevher_madeni" }],
      [9, "a", { tur: "vergi_ayarla", oranPpm: 300_000 }],
      [20, "a", { tur: "askeri_rezerv", oranPpm: 200_000 }],
    ];
    for (const [saat, oyuncu, komut] of komutlar) {
      const r = s.uygula({ t: saat * SAAT, oyuncu, komut });
      expect(r.tamam, `${komut.tur}`).toBe(true);
    }
    s.calistirKadar(24 * 4 * SAAT);
    const klon = s.klonla();
    const yeniden = Simulasyon.yenidenOynat(veri, 42, s.gunluk);
    yeniden.calistirKadar(24 * 4 * SAAT);
    expect(yeniden.durumOzeti()).toBe(s.durumOzeti());
    s.calistirKadar(24 * 6 * SAAT);
    klon.calistirKadar(24 * 6 * SAAT);
    expect(klon.durumOzeti()).toBe(s.durumOzeti());
  });
});
