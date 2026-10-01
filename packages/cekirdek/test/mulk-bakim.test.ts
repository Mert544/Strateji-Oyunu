/**
 * Mülk bakımı C (sartname §5.10; `param.mulk.bakim`): derleme (yalnız etkin satırlar), O2 eşdeğerliği (ana kanıt), parça birimi ve `bakimParcaSaat` = çözümün tüketimi, kıtlık davranışı,
 * blok yok = no-op, bölge kipi etkisizliği (K-6). Her kanıtın negatif kontrolü aynı dosyadadır. `parametreler.json` DEĞİŞMEZ; bloklar bellekte kurulur.
 */
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import type { MulkBakimParametreleri } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikDerle } from "../src/derle";
import { bolgeHesapla } from "../src/ekonomi/uretim";
import { Simulasyon } from "../src/motor";
import { bakimGirdileriSaat, bakimParcaSaat, mulkBakim } from "../src/sanayi/carpan";
import { kuralSurumuHesapla } from "../src/serilestir";
import { GUN, PPM, SAAT } from "../src/tipler";
import type { BolgeDurumu, CekirdekVeriPaketi, TesisDurumu } from "../src/tipler";
import { bitisikGrup, mulkSim, mulkVeriTam, tamam } from "./mulk-yardimci";
import { senaryoKos } from "./serilestir-yardimci";
import { tesisEkle } from "./sanayi-yardimci";

const F = parselFiksturuYukle("mini-6");
const ILCE = "sn_m_ova_merkez";

type Duzen = (v: CekirdekVeriPaketi) => void;
type Bakim = NonNullable<NonNullable<CekirdekVeriPaketi["param"]["mulk"]>["bakim"]>;

/** Mülk dünyası: bol hazine ve malzeme, parça stoğu AZ (yalnız yapı için yeter: bakımsız çiftçi/sanayici), 1 gıda fabrikası. */
function kur(duzenle?: Duzen, fabrika = true): Simulasyon {
  const v = mulkVeriTam((x) => {
    const m = x.param.mulk!;
    m.yeniOyuncu.hibe = 5_000_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 50_000_000, parca: 25_000, gida: 200_000, tahil: 50_000_000 };
    m.yeniOyuncu.indirimliYapiSayisi = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.esZamanliInsaat = 10;
    duzenle?.(x);
  });
  const s = mulkSim(["a"], v, 7);
  if (fabrika) tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: bitisikGrup(F, ILCE, "kirsal", 2, 0), sinif: "kirsal" });
  return s;
}
const bakimli = (b: Bakim): Duzen => (v) => void (v.param.mulk!.bakim = b);
const dugum = (s: Simulasyon): BolgeDurumu => s.dunya.bolgeler.find((b) => b.merkez !== undefined && b.sahip === "a")!;
const O2_C: Duzen = (v) => {
  // O2 `<C>` global ayarı (bölge kipini de değiştirirdi): düzey 0 ve 2 hızı, kıtlık aşınması ve tavan.
  const b = v.param.sanayi!.bakim;
  b.duzeyler[0]!.asinmaPpmGun = 10_000;
  b.duzeyler[2]!.asinmaPpmGun = -7_500;
  b.kitlikAsinmaPpmGun = 10_000;
  b.asinmaVerimKaybiTavaniPpm = 250_000;
};

function noktalar(s: Simulasyon, gun: number, adet: number): string[] {
  const o: string[] = [];
  for (let i = 1; i <= adet; i++) {
    s.calistirKadar(Math.floor((gun * GUN * i) / adet));
    o.push(s.durumOzeti());
  }
  return o;
}

describe("(a) derleme: yalnız etkin satırlar", () => {
  it("blok yok, {} ve kimlik değerleri (çarpan 1 000 000, tavan = sanayi değeri, parça çarpanı 1 000 000 / boş): ic.mulk.bakim OLUŞMAZ", () => {
    expect(icerikDerle(kur(undefined, false).dunya && mulkVeriTam()).mulk!.bakim).toBeUndefined();
    const kimlikler: MulkBakimParametreleri[] = [{}, { asinmaHizCarpaniPpm: PPM }, { asinmaVerimKaybiTavaniPpm: 400_000 }, { yontemParcaPpm: {} }, { yontemParcaPpm: { yuzey_cevher: PPM } }, { asinmaHizCarpaniPpm: PPM, asinmaVerimKaybiTavaniPpm: 400_000, yontemParcaPpm: { yuzey_cevher: PPM } }];
    for (const b of kimlikler) {
      expect(icerikDerle(mulkVeriTam(bakimli(b))).mulk!.bakim, JSON.stringify(b)).toBeUndefined();
    }
  });

  it("asinmaHizCarpaniPpm 500 000: düzey aşınması [10 000, 0, -7 500] ve kıtlık 10 000; tavan sanayi değeriyle aynıysa yok; yalnız !== PPM parça çarpanı, yöntem indeksiyle", () => {
    const ic = icerikDerle(mulkVeriTam(bakimli({ asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 400_000, yontemParcaPpm: { yuzey_cevher: 200_000, hidro_santrali: PPM } })));
    expect(ic.mulk!.bakim).toEqual({ duzeyAsinmaPpmGun: [10_000, 0, -7_500], kitlikAsinmaPpmGun: 10_000, yontemParcaPpm: { [ic.yontemIndeks["yuzey_cevher"] as number]: 200_000 } });
    expect(ic.mulk!.bakim!.tavanPpm).toBeUndefined();
    const t = icerikDerle(mulkVeriTam(bakimli({ asinmaVerimKaybiTavaniPpm: 250_000 })));
    expect(t.mulk!.bakim).toEqual({ tavanPpm: 250_000 });
    // NEGATİF KONTROL: başka çarpan başka değerler (derleme çarpana duyarlı)
    expect(icerikDerle(mulkVeriTam(bakimli({ asinmaHizCarpaniPpm: 600_000 }))).mulk!.bakim).toEqual({ duzeyAsinmaPpmGun: [12_000, 0, -9_000], kitlikAsinmaPpmGun: 12_000 });
  });

  it("geçersiz değer ve içerik uyumsuzluğu Error: bilinmeyen yöntem, bakım girdisi boş yöntem, miktar 0'a iner, aralık dışı", () => {
    const hata = (b: Bakim, d?: Duzen) => () => icerikDerle(mulkVeriTam((v) => (bakimli(b)(v), d?.(v))));
    expect(hata({ yontemParcaPpm: { olmayan_yontem: 200_000 } })).toThrow("icerikDerle: mulk.bakim.yontemParcaPpm bilinmeyen yontem: olmayan_yontem");
    expect(hata({ yontemParcaPpm: { standart_gida_isleme: 200_000 } }, (v) => (v.icerik.yontemler.find((y) => y.id === "standart_gida_isleme")!.bakim = {}))).toThrow("bakim girdisi bos yontem: standart_gida_isleme");
    expect(hata({ yontemParcaPpm: { yuzey_cevher: 500 } })).toThrow("miktar 0'a iner: yuzey_cevher"); // 1000 x 0,0005 = 0
    expect(hata({ asinmaHizCarpaniPpm: 0 })).toThrow("asinmaHizCarpaniPpm");
    expect(hata({ asinmaVerimKaybiTavaniPpm: PPM + 1 })).toThrow("asinmaVerimKaybiTavaniPpm");
    expect(hata({ yontemParcaPpm: { yuzey_cevher: 2 * PPM + 1 } })).toThrow("yuzey_cevher");
  });
});

describe("(b) ANA KANIT: mulk.bakim { 500 000, 250 000 } = O2 <C> global sanayi.bakim ayarı (mülk kipinde tam durumOzeti aynı)", () => {
  it("25 gün, 12 kontrol noktası: A (sanayi.bakim O2 <C>) = B (mulk.bakim, sanayi.bakim taban); aşınma > 0 ve verim kaybı gerçekten oluşur", () => {
    const A = kur(O2_C);
    const B = kur(bakimli({ asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 250_000 }));
    expect(noktalar(B, 25, 12)).toEqual(noktalar(A, 25, 12));
    const ts = dugum(B).tesisler[0] as TesisDurumu;
    expect(ts.asinmaPpm).toBeGreaterThan(200_000); // kanıt boş geçmedi: aşınma birikti (yarım hızla ~250 000)
    expect(ts.asinmaPpm).toBeLessThan(300_000); // tam hızda ~500 000 olurdu
    expect(dugum(A).tesisler[0]!.asinmaPpm).toBe(ts.asinmaPpm);
  });

  it("NEGATİF KONTROL: blok yok (C) ve yalnız hız bloğu (tavan 400 000; D) özetten FARKLI; kural sürümü blok eklenince farklı, blok yokken aynı", () => {
    const A = noktalar(kur(O2_C), 25, 12);
    const C = noktalar(kur(), 25, 12);
    const D = noktalar(kur(bakimli({ asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 400_000 })), 25, 12);
    expect(C[11]).not.toBe(A[11]);
    expect(D[11]).not.toBe(A[11]);
    const v0 = mulkVeriTam();
    const v1 = mulkVeriTam(bakimli({ asinmaHizCarpaniPpm: 500_000 }));
    expect(kuralSurumuHesapla(v1)).not.toBe(kuralSurumuHesapla(v0));
    expect(kuralSurumuHesapla(mulkVeriTam())).toBe(kuralSurumuHesapla(v0));
  });
});

/** Mülk düğümünde (gıda fabrikası olmadan) verilen yöntemle bir tesis ekler ve çözümün tükettiği bakım parçasını döndürür. */
function parcaTuketimi(s: Simulasyon, yontem: string, duzenle?: (ts: TesisDurumu) => void): { cozum: number; yardimci: number } {
  const b = dugum(s);
  const r = s.dunya.bolgeler.indexOf(b);
  const ts: TesisDurumu = { id: 90 + b.tesisler.length, tur: s.ic.tesisTuruIndeks["cevher_madeni"] as number, yontem: s.ic.yontemIndeks[yontem] as number, aktif: true, verimPpm: 0, isciPpm: 0, olcek: 0, asinmaPpm: 0 };
  duzenle?.(ts);
  b.tesisler.push(ts);
  const parca = s.ic.malIndeks["parca"] as number;
  const h = bolgeHesapla(s.dunya, s.baglam, r);
  const cozum = h.bakim[parca] as number;
  b.tesisler.pop();
  const yardimci = bakimParcaSaat(s.dunya, s.ic, b, ts);
  return { cozum, yardimci };
}

describe("(c) parça birimi ve bakimParcaSaat = çözümün gerçek tüketimi", () => {
  const blok: Bakim = { yontemParcaPpm: { yuzey_cevher: 200_000, hidro_santrali: 200_000 } };

  it("yuzey_cevher: düzey normal S = 200, asgari düzey = 100, M ölçek = 400; hidro_santrali = 400; derin_cevher 1 500 (listede yok) aynı; her biri bakimParcaSaat ile BİREBİR", () => {
    const s = kur(bakimli(blok), false);
    const o = parcaTuketimi(s, "yuzey_cevher");
    expect(o).toEqual({ cozum: 200, yardimci: 200 });
    expect(parcaTuketimi(s, "yuzey_cevher", (t) => (t.olcek = 1))).toEqual({ cozum: 400, yardimci: 400 });
    expect(parcaTuketimi(s, "hidro_santrali")).toEqual({ cozum: 400, yardimci: 400 });
    expect(parcaTuketimi(s, "derin_cevher")).toEqual({ cozum: 1_500, yardimci: 1_500 });
    s.dunya.oyuncular.find((x) => x.id === "a")!.bakimDuzeyi = 0;
    expect(parcaTuketimi(s, "yuzey_cevher")).toEqual({ cozum: 100, yardimci: 100 }); // asgari düzey girdiPpm 500 000
    s.dunya.oyuncular.find((x) => x.id === "a")!.bakimDuzeyi = 1;
    // girdi, çıktı ve işçi aynı: yalnız bakım ölçeklenir
    const y = s.ic.yontemler[s.ic.yontemIndeks["yuzey_cevher"] as number]!;
    expect(y.girdiler).toEqual({ elektrik: 5_000 });
    const g = bakimGirdileriSaat(s.dunya, s.ic, dugum(s), { id: 1, tur: 0, yontem: s.ic.yontemIndeks["yuzey_cevher"] as number, aktif: true, verimPpm: 0, isciPpm: 0, olcek: 0, asinmaPpm: 0 });
    expect(g).toEqual([[s.ic.malIndeks["parca"], 200]]);
  });

  it("NEGATİF KONTROL: blok yok = 1 000 ve hidro 2 000; bölge kipi (b.merkez yok; blok veride olsa da) = 1 000; mulkBakim bölge/yok için undefined", () => {
    const s = kur(undefined, false);
    expect(parcaTuketimi(s, "yuzey_cevher")).toEqual({ cozum: 1_000, yardimci: 1_000 });
    expect(parcaTuketimi(s, "hidro_santrali")).toEqual({ cozum: 2_000, yardimci: 2_000 });
    expect(mulkBakim(s.ic, dugum(s))).toBeUndefined();
    // bölge kipi: aynı bloğu taşıyan veri, parsel dünyası yok => ic.mulk yok
    const bv = miniVeriyiYukle() as CekirdekVeriPaketi;
    bv.param.mulk!.bakim = blok;
    tesisEkle(bv, "m_dag", "cevher_madeni");
    const bs = Simulasyon.olustur(bv, 3);
    expect(bs.ic.mulk).toBeUndefined();
    tamam(bs, "sistem", { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_dag"] });
    const r = bs.ic.bolgeIndeks["m_dag"] as number;
    const b = bs.dunya.bolgeler[r] as BolgeDurumu;
    expect(mulkBakim(bs.ic, b)).toBeUndefined();
    const ts = b.tesisler.find((t) => t.yontem === (bs.ic.yontemIndeks["yuzey_cevher"] as number))!;
    expect(ts).toBeDefined();
    const h = bolgeHesapla(bs.dunya, bs.baglam, r);
    expect(h.bakim[bs.ic.malIndeks["parca"] as number]).toBeGreaterThanOrEqual(1_000); // 200 DEĞİL: çarpan uygulanmadı
    expect(bakimParcaSaat(bs.dunya, bs.ic, b, ts)).toBe(1_000);
  });
});

describe("(d) kıtlık davranışı: 0,2 parça/sa'ya 24 saatlik stok yeter", () => {
  /** Düğümde yalnız `yuzey_cevher` tesisi ve verilen parça stoğu; 25 saat (ilk günlük aşınma tikini içerir) çalıştırır. */
  function kitlik(duzenle: Duzen | undefined, stok: number): { karsilanma: number; asinma: number } {
    const s = kur((v) => {
      duzenle?.(v);
      v.param.mulk!.yeniOyuncu.baslangicStok = { parca: stok };
    }, false);
    const b = dugum(s);
    b.tesisler.push({ id: 90, tur: s.ic.tesisTuruIndeks["cevher_madeni"] as number, yontem: s.ic.yontemIndeks["yuzey_cevher"] as number, aktif: true, verimPpm: 0, isciPpm: 0, olcek: 0, asinmaPpm: 0 });
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman + GUN + SAAT);
    return { karsilanma: b.bakimKarsilanmaPpm ?? PPM, asinma: b.tesisler[0]!.asinmaPpm as number };
  }

  it("blokluda (200 mili/sa) 7 200 mili stok 24 saate (4 800) yeter: karşılanma PPM, aşınma artmaz; blok yokta aynı stokla (1 000/sa: 7,2 saat) karşılanma eşiğin altına düşer ve aşınma kıtlık hızıyla artar", () => {
    const blokluSonuc = kitlik(bakimli({ yontemParcaPpm: { yuzey_cevher: 200_000 } }), 7_200);
    expect(blokluSonuc.karsilanma).toBe(PPM);
    expect(blokluSonuc.asinma).toBe(0);
    const yokSonuc = kitlik(undefined, 7_200);
    expect(yokSonuc.karsilanma).toBeLessThan(950_000); // eşik: sanayi.bakim.kitlikEsigiPpm
    expect(yokSonuc.asinma).toBeGreaterThan(0);
  });
});

describe("(e) blok yok ↔ {} ↔ kimlik değerleri: aynı durumOzeti ve kural sürümü; korunum", () => {
  it("12 noktada aynı durumOzeti; kuralSurumuHesapla blok yokken yeni parametre özetine göre aynı (`{}` ve kimlik değerli blok veriyi değiştirdiği için farklı olabilir, durum özeti değil)", () => {
    const ref = noktalar(kur(), 10, 12);
    for (const b of [{}, { asinmaHizCarpaniPpm: PPM, asinmaVerimKaybiTavaniPpm: 400_000, yontemParcaPpm: { yuzey_cevher: PPM } }] as Bakim[]) {
      expect(noktalar(kur(bakimli(b)), 10, 12)).toEqual(ref);
    }
  });
});

describe("K-6: bölge kipi etkisizliği (bölge kipi altınları BİREBİR)", () => {
  const kos = (duzenle: Duzen): string[] => {
    const v = miniVeriyiYukle() as CekirdekVeriPaketi;
    duzenle(v);
    const r = senaryoKos({ veri: v, tohum: 3, sureMs: 10 * GUN });
    return [r.sim.durumOzeti(), String(r.sim.gunluk.length)];
  };
  it("bölge kipi veri kopyasına TAM mulk.bakim (üç mekanizma) eklenince özet aynı; aynı değerler global sanayi.bakim'e yazılınca FARKLI (kanıtın duyarlılığı)", () => {
    const temel = kos(() => undefined);
    expect(kos((v) => void (v.param.mulk!.bakim = { asinmaHizCarpaniPpm: 500_000, asinmaVerimKaybiTavaniPpm: 250_000, yontemParcaPpm: { yuzey_cevher: 200_000, hidro_santrali: 200_000 } }))).toEqual(temel);
    expect(kos(O2_C)).not.toEqual(temel);
  });
});
