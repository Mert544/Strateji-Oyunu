/**
 * Atomik `yapi_yerlestir` (arsa + yapı), `parsel_birak`, yapı hücrelerinin kenar-bitişikliği ve bedava yurdun ilçe merkezine
 * göre seçimi (docs/06 §15.5), mini-6 parsel fikstürü.
 */
import { describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { araziVergisiSaat, hucreBul, ilceBul, isletmeBul, mulkOyuncuBul, parselFiyati } from "../src/mulk";
import { kenarBitisikMi } from "../src/mulk/durum";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { PPM, SAAT } from "../src/tipler";
import type { ArsaSinifi, CekirdekVeriPaketi, Komut } from "../src/tipler";
import { bitisikGrup, mulkSim, mulkVeri, mulkVeriTam, tamam, ver } from "./mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";
const OVA_IL = "sn_m_ova";
const DAG = "sn_m_dag_merkez";
const COL = "sn_m_col_merkez";

/** Yurtsuz, indirimsiz; bol hazine ve malzeme (ilk işletme kiti). */
function veri(duzenle?: (v: CekirdekVeriPaketi) => void): CekirdekVeriPaketi {
  return mulkVeri((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 500_000_000;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
    duzenle?.(v);
  });
}

const yerlestir = (ilce: string, tesisTuru: string, hucreler: string[], sinif: ArsaSinifi = "kirsal"): Komut => ({ tur: "yapi_yerlestir", ilce, tesisTuru, hucreler, sinif });
const al = (ilce: string, hucreler: string[], sinif: ArsaSinifi = "kirsal"): Komut => ({ tur: "parsel_al", ilce, hucreler, sinif });
/** Başarısız komutun dünyayı hiç değiştirmediğini doğrular (zaman dahil aynı anda). */
function reddedilir(s: Simulasyon, oyuncu: string, k: Komut, parca: string): void {
  s.calistirKadar(s.dunya.zaman);
  const once = s.durumOzeti();
  const r = ver(s, oyuncu, k);
  expect(r.tamam, `${k.tur} reddedilmeliydi`).toBe(false);
  expect((r as { hata: string }).hata).toContain(parca);
  expect(s.durumOzeti()).toBe(once);
}

describe("yapı hücreleri kenar-bitişik olmalı (tesis_insa_hucre ve yapi_yerlestir)", () => {
  /** Dağ ilçesinde (x,y), (x+1,y), (x,y+1) L üçlüsü ve I üçlüsü; hepsi uygun kırsal. */
  function uclular() {
    const c = F.ilceler.find((x) => x.id === DAG)!;
    const uygun = new Set(c.hucreler.filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id));
    const xy = (id: string) => id.split(":").map(Number) as [number, number];
    for (const id of [...uygun]) {
      const [x, y] = xy(id);
      const l = [id, `${x + 1}:${y}`, `${x}:${y + 1}`];
      const i = [id, `${x + 1}:${y}`, `${x + 2}:${y}`];
      if (l.every((k) => uygun.has(k)) && i.every((k) => uygun.has(k))) return { l, i: [`${x}:${y + 1}`, `${x + 1}:${y + 1}`, `${x + 2}:${y + 1}`].every((k) => uygun.has(k)) ? [`${x}:${y + 1}`, `${x + 1}:${y + 1}`, `${x + 2}:${y + 1}`] : i, kare: [id, `${x + 1}:${y}`] };
    }
    throw new Error("uygun L üçlüsü yok");
  }

  it("3 hücrelik yapı (Mera): L ve I biçimi kabul edilir; çapraz ve kopuk hücreler reddedilir", () => {
    const { l } = uclular();
    const s = mulkSim(["a"], veri());
    const [x, y] = l[0]!.split(":").map(Number) as [number, number];
    const sec = (ids: string[]) => ids.filter((id) => F.ilceler.find((c) => c.id === DAG)!.hucreler.some((h) => h.id === id && h.uygun && h.sinif === "kirsal"));
    // L üçlüsü + çaprazdan komşu bir hücre + uzak bir hücre satın al
    const capraz = `${x + 1}:${y + 1}`;
    const uzak = bitisikGrup(F, DAG, "kirsal", 1, 7)[0]!;
    tamam(s, "a", al(DAG, sec([...l, capraz, uzak])));
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler: [l[0]!, l[1]!, uzak] }, "kenar-bitisik");
    // çapraz: (x,y), (x+1,y+1), (x+1,y) -> (x+1,y) bitişik olduğundan bağlı; ama (x,y),(x+1,y+1) + uzak değil
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler: [l[0]!, capraz, uzak] }, "kenar-bitisik");
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler: l }); // L biçimi
    expect(s.dunya.insaatlar).toHaveLength(1);
  });

  it("kenar-bitişiklik saf denetimi: 1 hücre, I, L, T bitişik; çapraz, boşluklu ve ikiye kopuk küme değil", () => {
    expect(kenarBitisikMi(["5:5"])).toBe(true);
    expect(kenarBitisikMi(["5:5", "6:5", "7:5"])).toBe(true); // I
    expect(kenarBitisikMi(["5:5", "5:6", "6:6"])).toBe(true); // L
    expect(kenarBitisikMi(["5:5", "6:6"])).toBe(false); // çapraz
    expect(kenarBitisikMi(["5:5", "7:5"])).toBe(false); // boşluk
    expect(kenarBitisikMi(["5:5", "6:5", "9:9"])).toBe(false); // kopuk
    expect(kenarBitisikMi([])).toBe(false);
  });

  it("tesis_insa_hucre: boşluklu çift reddedilir (hata: kenar-bitişik), bitişik çift kabul edilir", () => {
    const s = mulkSim(["a"], veri());
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    const [x, y] = g[0]!.split(":").map(Number) as [number, number];
    tamam(s, "a", al(OVA, g));
    const uzak = bitisikGrup(F, OVA, "kirsal", 2, 3);
    tamam(s, "a", al(OVA, uzak));
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: [g[0]!, uzak[0]!] }, "kenar-bitisik");
    reddedilir(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: [g[0]!, `${x + 1}:${y + 1}`] }, "");
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: g });
  });
});

describe("yapi_yerlestir: arsa + yapı tek atomik komut", () => {
  it("boş hücreleri satın alır ve inşaatı başlatır; ilk işletme (kitle) açılır; bedel = arsa + yapı", () => {
    const s = mulkSim(["a"], veri());
    const d = s.dunya;
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    const uygun = ilceBul(d, OVA)!.uygunHucre;
    const hz0 = anlikHazine(d, "a");
    tamam(s, "a", yerlestir(OVA, "ciftlik", g));
    const tanim = s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!;
    expect(hz0 - anlikHazine(d, "a")).toBe(parselFiyati(1_000_000, 2 * PPM, 0, uygun, 2) + tanim.insaParasi);
    expect(g.every((id) => hucreBul(d, id)?.sahip === "a")).toBe(true);
    expect(d.insaatlar).toHaveLength(1);
    expect(d.insaatlar[0]!.hucreler).toEqual([...g].sort());
    expect(g.every((id) => hucreBul(d, id)?.insaat === d.insaatlar[0]!.id)).toBe(true);
    expect(ilceBul(d, OVA)!.satilmisHucre).toBe(2);
    expect(mulkOyuncuBul(d, "a")!.ilceHucre).toEqual([{ ilce: OVA, hucre: 2 }]);
    const b = d.bolgeler[isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi]!;
    const celik = s.ic.malIndeks["celik"]!;
    expect(anlikMiktar(b.stoklar[celik]!, d.zaman)).toBe(5_000_000 - tanim.insaMaliyeti["celik"]!);
    // bitince tesis kurulur (parsel_al + tesis_insa_hucre zinciriyle aynı sonuç)
    s.calistirKadar(d.zaman + 2 * SAAT);
    expect(b.tesisler).toHaveLength(1);
    expect(b.tesisler[0]!.hucreler).toEqual([...g].sort());
  });

  it("sonuç zincirle aynıdır: yapi_yerlestir = parsel_al + tesis_insa_hucre (hücreler, inşaat, tesis, hazine)", () => {
    // Zincirde iki komut arasında bir lojistik çözümü koşar (olay sayaçları farklı), bu yüzden tam özet değil, durum alanları karşılaştırılır.
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    const a = mulkSim(["a"], veri());
    const b = mulkSim(["a"], veri());
    tamam(a, "a", yerlestir(OVA, "ciftlik", g));
    tamam(b, "a", al(OVA, g));
    tamam(b, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: g });
    a.calistirKadar(2 * SAAT);
    b.calistirKadar(2 * SAAT);
    expect(JSON.stringify(a.dunya.mulk)).toBe(JSON.stringify(b.dunya.mulk));
    expect(JSON.stringify(a.dunya.insaatlar)).toBe(JSON.stringify(b.dunya.insaatlar));
    expect(a.dunya.oyuncular[0]!.hazine.miktar).toBe(b.dunya.oyuncular[0]!.hazine.miktar);
    const ba = a.dunya.bolgeler[isletmeBul(a.dunya, "a", OVA_IL)!.bolgeIndeksi]!;
    const bb = b.dunya.bolgeler[isletmeBul(b.dunya, "a", OVA_IL)!.bolgeIndeksi]!;
    expect(JSON.stringify(ba.tesisler)).toBe(JSON.stringify(bb.tesisler));
  });

  it("karma: oyuncunun boş hücresi sayılır, yalnız sahipsiz olanlar satın alınır; arsası olan oyuncuda işletme zaten vardır", () => {
    const s = mulkSim(["a"], veri());
    const d = s.dunya;
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    tamam(s, "a", al(OVA, [g[0]!]));
    const hz0 = anlikHazine(d, "a");
    tamam(s, "a", yerlestir(OVA, "ciftlik", g));
    const tanim = s.ic.icerik.tesisTurleri.find((t) => t.id === "ciftlik")!;
    expect(hz0 - anlikHazine(d, "a")).toBe(parselFiyati(1_000_000, 2 * PPM, 1, ilceBul(d, OVA)!.uygunHucre, 1) + tanim.insaParasi);
    expect(ilceBul(d, OVA)!.satilmisHucre).toBe(2);
    // yalnız kendi boş hücreleri üzerinde (satın alma yok)
    const g2 = bitisikGrup(F, OVA, "kirsal", 2, 1);
    tamam(s, "a", al(OVA, g2));
    const hz1 = anlikHazine(d, "a");
    tamam(s, "a", yerlestir(OVA, "ciftlik", g2));
    expect(hz1 - anlikHazine(d, "a")).toBe(tanim.insaParasi);
  });

  it("hepsi ya da hiçbiri: arsa alınabilse bile yapı reddedilirse hiçbir şey değişmez", () => {
    const s = mulkSim(["a", "b"], veri());
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    const col = bitisikGrup(F, COL, "kirsal", 2, 0);
    // il etiketi yok (çöl ilinde ova yok): arsa kısmı geçerli, yapı kısmı reddedilir -> arsa da alınmaz
    reddedilir(s, "a", yerlestir(COL, "ciftlik", col), "il etiketi yetersiz: ova");
    expect(hucreBul(s.dunya, col[0]!)).toBeUndefined();
    expect(isletmeBul(s.dunya, "a", "sn_m_col")).toBeUndefined();
    expect(ilceBul(s.dunya, COL)!.satilmisHucre).toBe(0);
    // yanlış sınıf, tekrarlayan ve yuvaya uymayan sayı
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", g, "kasaba"), "hucre sinifi uyusmuyor");
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", [g[0]!]), "2 hucre kaplar");
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", [g[0]!, g[0]!]), "tekrarlanan");
    reddedilir(s, "a", yerlestir(OVA, "yok_yapi", g), "bilinmeyen tesis turu");
    reddedilir(s, "a", yerlestir("yok_ilce", "ciftlik", g), "bilinmeyen ilce");
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", g, "saray" as ArsaSinifi), "gecersiz arsa sinifi");
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", [g[0]!, "1:1"]), "kenar-bitisik");
    // başkasının hücresi
    tamam(s, "b", al(OVA, [g[1]!]));
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", g), "hucre zaten sahipli");
    expect(hucreBul(s.dunya, g[0]!)).toBeUndefined();
  });

  it("yetersiz hazine ve yetersiz malzeme (açılacak düğümün kiti) atomiktir", () => {
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    // hazine arsayı karşılar ama yapıyı karşılamaz
    const fakir = mulkSim(["a"], veri((v) => (v.param.mulk!.yeniOyuncu.hibe = 7_000_000)));
    reddedilir(fakir, "a", yerlestir(OVA, "ciftlik", g), "yetersiz hazine");
    expect(hucreBul(fakir.dunya, g[0]!)).toBeUndefined();
    expect(anlikHazine(fakir.dunya, "a")).toBe(7_000_000);
    // malzeme: ilk işletme kiti (çelik 10 birim) çiftliğe (30 birim) yetmez; düğüm de açılmaz
    const az = mulkSim(["a"], veri((v) => (v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 10_000, parca: 40_000 })));
    reddedilir(az, "a", yerlestir(OVA, "ciftlik", g), "yetersiz stok: sn_m_ova#a");
    expect(isletmeBul(az.dunya, "a", OVA_IL)).toBeUndefined();
    // ikinci il: ilk işletmesi başka ilde olan oyuncunun yeni ildeki düğümü BOŞ stokla açılır -> malzeme yok
    const s = mulkSim(["a"], veri());
    tamam(s, "a", al(DAG, bitisikGrup(F, DAG, "kirsal", 1, 0)));
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", g), "yetersiz stok: sn_m_ova#a");
    // aynı il (düğüm var, stok kitle dolu): olur
    tamam(s, "a", yerlestir(DAG, "mera", [...bitisikGrup(F, DAG, "kirsal", 3, 1)]));
  });

  it("eşzamanlı inşaat sınırı, ayrılmış hücre ve %25 sınırı yerleştirmede de geçerlidir", () => {
    const s = mulkSim(["a"], veri((v) => (v.param.mulk!.esZamanliInsaat = 1)));
    tamam(s, "a", yerlestir(OVA, "ciftlik", bitisikGrup(F, OVA, "kirsal", 2, 0)));
    const g2 = bitisikGrup(F, OVA, "kirsal", 2, 1);
    reddedilir(s, "a", yerlestir(OVA, "ciftlik", g2), "ayni anda en cok 1");
    expect(hucreBul(s.dunya, g2[0]!)).toBeUndefined();
    // ayrılmış hücre: katılımdan 14+ gün sonra yeni oyuncu değil
    const r = mulkSim(["a"], mulkVeriTam((v) => {
      v.param.mulk!.yeniOyuncu.yurtHucre = 0;
      v.param.mulk!.yeniOyuncu.hibe = 500_000_000;
      v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000 };
    }));
    r.calistirKadar(15 * 24 * SAAT);
    const ayr = [...r.ic.mulk!.ayrilmis].find((id) => r.ic.mulk!.hucreler.get(id)!.ilce === OVA && r.ic.mulk!.hucreler.get(id)!.hucre.sinif === "kirsal")!;
    const [x, y] = ayr.split(":").map(Number) as [number, number];
    const komsu = [`${x + 1}:${y}`, `${x - 1}:${y}`].find((k) => r.ic.mulk!.hucreler.get(k)?.hucre.uygun === true && r.ic.mulk!.hucreler.get(k)?.hucre.sinif === "kirsal")!;
    reddedilir(r, "a", yerlestir(OVA, "ciftlik", [ayr, komsu]), "yeni oyunculara ayrilmis");
  });

  it("ek yapı ve indirim: ilk yapı %30 indirimli ve sayaç artar; ek yapı tek hücrede yerleştirilir", () => {
    const s = mulkSim(["a"], veri((v) => {
      v.param.mulk!.yeniOyuncu.ilkYapiIndirimPpm = 300_000;
      v.param.mulk!.yeniOyuncu.indirimliYapiSayisi = 5;
    }));
    const d = s.dunya;
    const [h] = bitisikGrup(F, OVA, "kirsal", 1, 0);
    const ambar = s.ic.mulk!.ekYapilar.find((y) => y.id === "ambar")!;
    const hz0 = anlikHazine(d, "a");
    tamam(s, "a", yerlestir(OVA, "ambar", [h!]));
    expect(hz0 - anlikHazine(d, "a")).toBe(1_000_000 + Math.floor((ambar.insaParasi * (PPM - 300_000)) / PPM));
    expect(mulkOyuncuBul(d, "a")!.indirimliYapi).toBe(1);
    expect(d.insaatlar[0]!.ekYapi).toBe("ambar");
    // iptal: ödenen yapı bedelinin %50'si iade, hücre sahipte kalır (arsa iadesi parsel_birak'la)
    tamam(s, "a", { tur: "insaat_iptal", insaat: d.insaatlar[0]!.id });
    expect(hucreBul(d, h!)!.sahip).toBe("a");
    expect(mulkOyuncuBul(d, "a")!.indirimliYapi).toBeUndefined();
  });

  it("serileştirme ve yeniden oynatma: yapi_yerlestir günlükte aynı özeti verir", () => {
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    const a = mulkSim(["a"], veri());
    tamam(a, "a", yerlestir(OVA, "ciftlik", g));
    a.calistirKadar(6 * SAAT);
    const oynat = Simulasyon.yenidenOynat(veri(), 7, a.gunluk);
    oynat.calistirKadar(6 * SAAT);
    expect(oynat.durumOzeti()).toBe(a.durumOzeti());
  });
});

describe("parsel_birak", () => {
  it("bedelin %70'i iade edilir; hücre sahipsiz olur; arazi değeri, sayaç, ilçe satılmışı ve vergi düşer", () => {
    const s = mulkSim(["a", "b"], veri());
    const d = s.dunya;
    const g = bitisikGrup(F, OVA, "kirsal", 4, 0);
    tamam(s, "a", al(OVA, g));
    const mo = mulkOyuncuBul(d, "a")!;
    const deger0 = mo.araziDegeriMili;
    const birak = g.slice(0, 2);
    const degerler = birak.map((id) => hucreBul(d, id)!.degerMili);
    const vergi0 = araziVergisiSaat(d, s.ic, "a");
    const hz0 = anlikHazine(d, "a");
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: birak });
    // İade: Σ hücre değeri x %70, sonra AŞAĞI tam liraya (§9.4; G7-4; eski: hücre başına mili aşağı = 1 417 500, yeni 1 417 000)
    const iade = Math.floor(Math.floor((degerler.reduce((t, x) => t + x, 0) * 700_000) / PPM) / 1000) * 1000;
    expect(iade).toBeGreaterThan(0);
    // iade tam hazineye gider (tembel vergi oranı ayrıca akar; aynı anda ölçüldüğü için fark kesin)
    expect(anlikHazine(d, "a") - hz0).toBe(iade);
    for (const id of birak) expect(hucreBul(d, id)).toBeUndefined();
    expect(g.slice(2).every((id) => hucreBul(d, id)?.sahip === "a")).toBe(true);
    expect(mo.araziDegeriMili).toBe(deger0 - degerler.reduce((t, x) => t + x, 0));
    expect(mo.ilceHucre).toEqual([{ ilce: OVA, hucre: 2 }]);
    expect(ilceBul(d, OVA)!.satilmisHucre).toBe(2);
    expect(araziVergisiSaat(d, s.ic, "a")).toBeLessThan(vergi0);
    expect(isletmeBul(d, "a", OVA_IL)).toBeDefined(); // işletme düğümü kalır
    // hepsini bırak: ilçe kaydı silinir, sayaç 0
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: g.slice(2) });
    expect(mo.ilceHucre).toEqual([]);
    expect(mo.araziDegeriMili).toBe(0);
    expect(ilceBul(d, OVA)!.satilmisHucre).toBe(0);
    // bırakılan hücre başkasına satılabilir ve fiyat çarpanı geri inmiştir (satılmış 0'dan başlar)
    const hb = anlikHazine(d, "b");
    tamam(s, "b", al(OVA, [g[0]!]));
    expect(hb - anlikHazine(d, "b")).toBe(parselFiyati(1_000_000, 2 * PPM, 0, ilceBul(d, OVA)!.uygunHucre, 1));
  });

  it("denetimler: başkasının, yapılı, inşaatlı, başka ilçedeki, boş ve tekrarlı liste reddedilir; yan etkisizdir", () => {
    const s = mulkSim(["a", "b"], veri());
    const g = bitisikGrup(F, OVA, "kirsal", 4, 0);
    tamam(s, "a", al(OVA, g));
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: g.slice(0, 2) });
    const birak = (hucreler: string[], ilce = OVA): Komut => ({ tur: "parsel_birak", ilce, hucreler });
    reddedilir(s, "b", birak(g.slice(2)), "oyuncunun degil");
    reddedilir(s, "a", birak([g[0]!]), "yapi ya da insaat var"); // inşaatlı
    reddedilir(s, "a", birak(g.slice(2), "sn_m_ova_tasra"), "bu ilcede degil");
    reddedilir(s, "a", birak(g.slice(2), "yok"), "bilinmeyen ilce");
    reddedilir(s, "a", birak([]), "bos olamaz");
    reddedilir(s, "a", birak([g[2]!, g[2]!]), "tekrarlanan");
    reddedilir(s, "a", birak(["1:1"]), "oyuncunun degil");
    s.calistirKadar(s.dunya.zaman + 2 * SAAT); // inşaat biter -> yapılı hücre
    reddedilir(s, "a", birak([g[0]!]), "yapi ya da insaat var");
    tamam(s, "a", birak(g.slice(2)));
  });

  it("iade payı parametresi; yurt hücresi (değer 0) iade vermez; al-bırak döngüsü kâr getirmez", () => {
    const tam = mulkSim(["a"], veri((v) => (v.param.mulk!.parselBirakIadePpm = PPM)));
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    tamam(tam, "a", al(OVA, g));
    const h0 = anlikHazine(tam.dunya, "a");
    tamam(tam, "a", { tur: "parsel_birak", ilce: OVA, hucreler: g });
    expect(anlikHazine(tam.dunya, "a") - h0).toBe(parselFiyati(1_000_000, 2 * PPM, 0, ilceBul(tam.dunya, OVA)!.uygunHucre, 2));
    // parametre yoksa varsayılan %70
    const v = veri();
    delete v.param.mulk!.parselBirakIadePpm;
    const vsy = mulkSim(["a"], v);
    tamam(vsy, "a", al(OVA, g));
    const hv = anlikHazine(vsy.dunya, "a");
    const deger = hucreBul(vsy.dunya, g[0]!)!.degerMili + hucreBul(vsy.dunya, g[1]!)!.degerMili;
    tamam(vsy, "a", { tur: "parsel_birak", ilce: OVA, hucreler: g });
    // iade aşağı tam lira: %70'in altında en çok 999 mili (§9.4)
    expect(anlikHazine(vsy.dunya, "a") - hv).toBeLessThanOrEqual(Math.floor((deger * 700_000) / PPM));
    expect(anlikHazine(vsy.dunya, "a") - hv).toBeGreaterThanOrEqual(Math.floor((deger * 700_000) / PPM) - 999);
    // al-bırak döngüsü: her tur hazineyi azaltır
    const d = vsy.dunya;
    let onceki = anlikHazine(d, "a");
    for (let i = 0; i < 3; i++) {
      tamam(vsy, "a", al(OVA, g));
      tamam(vsy, "a", { tur: "parsel_birak", ilce: OVA, hucreler: g });
      expect(anlikHazine(d, "a")).toBeLessThan(onceki);
      onceki = anlikHazine(d, "a");
    }
    // yurt hücresi: değer 0, iade 0 ama bırakılabilir
    const y = mulkSim(["a"], mulkVeriTam());
    const yh = y.dunya.mulk!.hucreler.filter((h) => h.sahip === "a")[0]!;
    const hz = anlikHazine(y.dunya, "a");
    tamam(y, "a", { tur: "parsel_birak", ilce: yh.ilce, hucreler: [yh.id] });
    expect(anlikHazine(y.dunya, "a")).toBe(hz);
    expect(hucreBul(y.dunya, yh.id)).toBeUndefined();
    expect(mulkOyuncuBul(y.dunya, "a")!.ilceHucre).toEqual([{ ilce: yh.ilce, hucre: 5 }]);
  });

  it("serileştirme: bırakma sonrası dünya geçerli, yeniden oynatma aynı özet", () => {
    const s = mulkSim(["a"], veri());
    const g = bitisikGrup(F, OVA, "kirsal", 2, 0);
    tamam(s, "a", al(OVA, g));
    tamam(s, "a", { tur: "parsel_birak", ilce: OVA, hucreler: [g[0]!] });
    s.calistirKadar(SAAT);
    const y = Simulasyon.yenidenOynat(veri(), 7, s.gunluk);
    y.calistirKadar(SAAT);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
  });
});

describe("bedava yurt: ilçe merkezine yakın, kenar-bitişik, deterministik", () => {
  /** Şehir ilçesinde kasaba/şehir hücrelerinin tamsayı ağırlık merkezi. */
  function merkez(ilce: string): [number, number] {
    const c = F.ilceler.find((x) => x.id === ilce)!;
    const y = c.hucreler.filter((h) => h.uygun && h.sinif !== "kirsal").map((h) => h.id.split(":").map(Number) as [number, number]);
    return [Math.floor(y.reduce((t, a) => t + a[0], 0) / y.length), Math.floor(y.reduce((t, a) => t + a[1], 0) / y.length)];
  }

  it("yurt, kasaba/şehir hücrelerinin ağırlık merkezine en yakın uygun hücreyi içerir ve tüm hücrelerin merkeze uzaklığı küçüktür", () => {
    const s = mulkSim([], mulkVeriTam());
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_sehir_merkez" } });
    const hs = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
    expect(hs).toHaveLength(6);
    expect(kenarBitisikMi(hs)).toBe(true);
    const [cx, cy] = merkez("sn_m_sehir_merkez");
    const c = F.ilceler.find((x) => x.id === "sn_m_sehir_merkez")!;
    const uzak = (id: string) => {
      const [x, y] = id.split(":").map(Number) as [number, number];
      return (x - cx) ** 2 + (y - cy) ** 2;
    };
    const enYakin = Math.min(...c.hucreler.filter((h) => h.uygun).map((h) => uzak(h.id)));
    expect(Math.min(...hs.map(uzak))).toBe(enYakin);
    // Tüm uygun hücrelerin merkezi yerine yerleşik doku merkezi: yurt sınıfı kırsal kenar hücrelerine kaymaz
    const siniflar = hs.map((id) => c.hucreler.find((h) => h.id === id)!.sinif);
    expect(siniflar.filter((x) => x !== "kirsal").length).toBeGreaterThan(0);
    // deterministik
    const t = mulkSim([], mulkVeriTam());
    t.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_sehir_merkez" } });
    expect(t.durumOzeti()).toBe(s.durumOzeti());
  });

  it("orman kullanımlı hücreler (fikstürde `kullanim` varsa) yeterli başka hücre varken seçilmez", () => {
    const v = mulkVeriTam((x) => {
      // Merkeze yakın tüm hücreleri orman say: yurt ormansız hücrelere (daha uzak) gitmeli
      const c = x.parsel!.ilceler.find((i) => i.id === "sn_m_sehir_merkez")!;
      for (const h of c.hucreler) if (h.sinif !== "kirsal") (h as unknown as { kullanim: string }).kullanim = "orman";
    });
    const s = mulkSim([], v);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_sehir_merkez" } });
    const hs = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a");
    expect(hs).toHaveLength(6);
    expect(hs.every((h) => h.sinif === "kirsal")).toBe(true);
    expect(kenarBitisikMi(hs.map((h) => h.id))).toBe(true);
    // ormansız hücre yetmezse orman da verilir (yurt yine 6 hücre)
    const hepsi = mulkVeriTam((x) => {
      const c = x.parsel!.ilceler.find((i) => i.id === "sn_m_sehir_merkez")!;
      for (const h of c.hucreler) (h as unknown as { kullanim: string }).kullanim = "orman";
    });
    const t = mulkSim([], hepsi);
    t.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_sehir_merkez" } });
    expect(t.dunya.mulk!.hucreler.filter((h) => h.sahip === "a")).toHaveLength(6);
  });
});
