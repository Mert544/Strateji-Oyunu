/**
 * Serileştirici birim testleri (F1, docs/06 §14): kanonik çıktı, gidiş-dönüş, bozuk girdi reddi, içerik uyumu,
 * kural sürümü kimliği ve anlık görüntü zarfı.
 */
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { durumOzeti, fnv1a64, kanonikSerilestir } from "../src/ozet";
import {
  SerilestirmeHatasi,
  anlikGoruntuCoz,
  anlikGoruntuOlustur,
  dunyaCoz,
  dunyaSerilestir,
  kuralSurumuHesapla,
} from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { Dunya } from "../src/tipler";
import { kucukVeri } from "./fikstur";
import { b1Veri } from "./regresyon-senaryo";
import { senaryoKos } from "./serilestir-yardimci";

/** Küçük fikstürde iki oyunculu, birkaç komutlu dünya (t = 30 sa; kuyrukta bekleyen olaylar var). */
function kucukSim(): Simulasyon {
  const s = Simulasyon.olustur(kucukVeri(), 42);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p1", bolgeler: ["ova", "sehir"] } });
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "p2", bolgeler: ["dag", "gecit"] } });
  s.uygula({ t: SAAT, oyuncu: "p1", komut: { tur: "ticaret_emri", bolge: "sehir", mal: "gida", yon: "ithalat", oranSaat: 20_000 } });
  s.uygula({ t: 2 * SAAT, oyuncu: "p1", komut: { tur: "arastir", teknoloji: "teknik" } });
  s.uygula({ t: 3 * SAAT, oyuncu: "p2", komut: { tur: "birlik_uret", bolge: "dag", birlik: "piyade", adet: 2 } });
  s.calistirKadar(30 * SAAT);
  return s;
}

/** Bozuk girdi üretmek için serbest tipli JSON ağacı. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ham = Record<string, any>;

/** Metni çözüp değiştirip yeniden metne çevirir (bozuk girdi üretmek için). */
function boz(metin: string, f: (d: Ham) => void): string {
  const d = JSON.parse(metin) as Ham;
  f(d);
  return JSON.stringify(d);
}

function hataYolu(f: () => unknown): string {
  try {
    f();
  } catch (e) {
    expect(e).toBeInstanceOf(SerilestirmeHatasi);
    return (e as SerilestirmeHatasi).yol;
  }
  throw new Error("hata bekleniyordu");
}

describe("dunyaSerilestir", () => {
  it("kanonikSerilestir ile bayt bayt ayni; fnv1a64(metin) = durumOzeti", () => {
    const s = kucukSim();
    const m = dunyaSerilestir(s.dunya);
    expect(m).toBe(kanonikSerilestir(s.dunya));
    expect(fnv1a64(m)).toBe(s.durumOzeti());
    expect(m).toContain('"rng":{"ekonomi":[');
    expect(m).toContain('"sayac":{"kimlik":');
    expect(m).toContain('"kuyruk":[{');
  });

  it("gidis-donus: coz(serilestir(d)) yeniden ayni metni verir; ozet ayni; nesne bagimsiz", () => {
    for (const s of [kucukSim(), senaryoKos({ veri: miniVeriyiYukle(), tohum: 3, sureMs: 2 * GUN }).sim]) {
      const m = dunyaSerilestir(s.dunya);
      const d = dunyaCoz(m);
      expect(dunyaSerilestir(d)).toBe(m);
      expect(durumOzeti(d)).toBe(s.durumOzeti());
      d.bolgeler[0]!.nufus++;
      expect(durumOzeti(d)).not.toBe(s.durumOzeti());
    }
  });

  it("tamsayi olmayan sayi, NaN, Map, sinif, fonksiyon, paylasilan referans ve dizi deligi reddedilir (yol ile)", () => {
    const temel = (): Dunya => structuredClone(kucukSim().dunya);
    let d = temel();
    d.bolgeler[1]!.nufus = 1.5;
    expect(hataYolu(() => dunyaSerilestir(d))).toBe("$.bolgeler[1].nufus");
    d = temel();
    d.zaman = Number.NaN;
    expect(hataYolu(() => dunyaSerilestir(d))).toBe("$.zaman");
    d = temel();
    (d as unknown as Record<string, unknown>).tohum = new Map();
    expect(hataYolu(() => dunyaSerilestir(d))).toBe("$.tohum");
    d = temel();
    (d.pazar as unknown as Record<string, unknown>).fiyat = () => 1;
    expect(hataYolu(() => dunyaSerilestir(d))).toBe("$.pazar.fiyat");
    d = temel();
    d.bolgeler[2]!.israf = d.bolgeler[1]!.israf; // aynı dizi iki yerde
    expect(hataYolu(() => dunyaSerilestir(d))).toBe("$.bolgeler[2].israf");
    d = temel();
    (d.bolgeler[0]!.israf as unknown[])[1] = undefined;
    expect(hataYolu(() => dunyaSerilestir(d))).toBe("$.bolgeler[0].israf[1]");
  });
});

describe("dunyaCoz: bozuk girdi reddi", () => {
  const metin = dunyaSerilestir(kucukSim().dunya);
  const durumlar: [string, string, string][] = [
    ["gecersiz JSON", "{", "$"],
    ["kesik metin", metin.slice(0, metin.length - 7), "$"],
    ["dizi kok", "[]", "$"],
    ["eksik ust alan", boz(metin, (d) => delete d.kuyruk), "$.kuyruk"],
    ["bilinmeyen ust alan", boz(metin, (d) => (d.fazla = 1)), "$.fazla"],
    ["ondalik sayi", metin.replace('"zaman":108000000', '"zaman":108000000.5'), "$.zaman"],
    ["sonsuz sayi", metin.replace('"zaman":108000000', '"zaman":1e400'), "$.zaman"],
    ["negatif zaman", boz(metin, (d) => (d.zaman = -1)), "$.zaman"],
    ["stok dizisi kisa", boz(metin, (d) => d.bolgeler[2].stoklar.pop()), "$.bolgeler[2].stoklar"],
    ["israf dizisi uzun", boz(metin, (d) => d.bolgeler[1].israf.push(0)), "$.bolgeler[1].israf"],
    ["birlik dizisi tutarsiz", boz(metin, (d) => d.bolgeler[3].birlikler.push(0)), "$.bolgeler[3].birlikler"],
    ["stok alani dize", boz(metin, (d) => (d.bolgeler[0].stoklar[1].miktar = "5")), "$.bolgeler[0].stoklar[1].miktar"],
    ["bolge indeksi yanlis", boz(metin, (d) => (d.bolgeler[1].indeks = 0)), "$.bolgeler[1].indeks"],
    ["tekrarlanan bolge", boz(metin, (d) => (d.bolgeler[1].id = d.bolgeler[0].id)), "$.bolgeler[1].id"],
    ["kenar ucu aralik disi", boz(metin, (d) => (d.kenarlar[0].b = 99)), "$.kenarlar[0].b"],
    ["oyuncular sirasiz", boz(metin, (d) => d.oyuncular.reverse()), "$.oyuncular[1].id"],
    ["kapsam satiri eksik", boz(metin, (d) => d.lojistik.kapsam.pop()), "$.lojistik.kapsam"],
    ["fiyat dizisi kisa", boz(metin, (d) => d.pazar.fiyat.pop()), "$.pazar.fiyat"],
    ["prng akisi eksik", boz(metin, (d) => delete d.rng.savas), "$.rng"],
    ["prng durumu 3 eleman", boz(metin, (d) => d.rng.olay.pop()), "$.rng.olay"],
    ["prng uint32 disi", boz(metin, (d) => (d.rng.pazar[0] = 2 ** 32)), "$.rng.pazar[0]"],
    ["olay onceligi yanlis", boz(metin, (d) => (d.kuyruk[0].oncelik = 7)), "$.kuyruk[0].oncelik"],
    ["bilinmeyen olay", boz(metin, (d) => (d.kuyruk[0].veri.tur = "uydurma")), "$.kuyruk[0].veri.tur"],
    ["olay sirasi sayactan buyuk", boz(metin, (d) => (d.kuyruk[0].sira = d.sayac.olay)), "$.kuyruk[0].sira"],
    ["gecmis olay", boz(metin, (d) => (d.kuyruk[0].t = d.zaman - 1)), "$.kuyruk[0].t"],
    ["yigin duzeni bozuk", boz(metin, (d) => (d.kuyruk[0].t = d.zaman + 1000 * GUN)), "$.kuyruk[1]"],
    [
      "saatlik tik yok",
      // Aynı öncelikli başka türe çevrilir (yığın düzeni bozulmasın)
      boz(metin, (d) => d.kuyruk.forEach((o: Ham) => o.veri.tur === "saatlik_tik" && (o.veri.tur = "iklim_gunluk"))),
      "$.kuyruk",
    ],
  ];
  for (const [ad, girdi, yol] of durumlar) {
    it(`${ad} -> ${yol}`, () => {
      expect(hataYolu(() => dunyaCoz(girdi))).toBe(yol);
    });
  }

  it("hata iletisi yolu ve nedeni icerir", () => {
    expect(() => dunyaCoz(boz(metin, (d) => d.bolgeler[2].stoklar.pop()))).toThrow(/\$\.bolgeler\[2\]\.stoklar: dizi uzunlugu \d+, beklenen \d+/);
  });

  it("yukle: icerikle uyumsuz dunya reddedilir (farkli harita / farkli mal sayisi)", () => {
    const d = dunyaCoz(metin);
    expect(() => Simulasyon.yukle(miniVeriyiYukle(), d)).toThrow(SerilestirmeHatasi);
    const v = kucukVeri();
    v.icerik.mallar.pop();
    expect(() => Simulasyon.yukle(v, dunyaCoz(metin))).toThrow(SerilestirmeHatasi);
  });
});

describe("Simulasyon.yukle", () => {
  it("yeni ic ile (onbellekler bos) yuklenen dunya, orijinalle ayni komutlarla ayni ozete gider", () => {
    for (const veri of [kucukVeri, miniVeriyiYukle, b1Veri] as (() => VeriPaketi)[]) {
      const a = senaryoKos({ veri: veri(), tohum: 9, sureMs: GUN }).sim;
      const b = Simulasyon.yukle(veri(), dunyaCoz(dunyaSerilestir(a.dunya)), a.gunluk);
      expect(b.ic).not.toBe(a.ic);
      expect(b.durumOzeti()).toBe(a.durumOzeti());
      expect(b.gunluk).toEqual(a.gunluk);
      expect(b.gunluk).not.toBe(a.gunluk);
      // Devam: aynı (bulanık + bot) komut akışı ikisine de
      const devamA = senaryoKos({ veri: veri(), tohum: 9, sureMs: 2 * GUN }).adimlar.filter((x) => x.k.t >= GUN);
      for (const x of devamA) expect(b.uygula(x.k)).toEqual(a.uygula(x.k));
      a.calistirKadar(3 * GUN);
      b.calistirKadar(3 * GUN);
      expect(b.durumOzeti()).toBe(a.durumOzeti());
    }
  });

  it("gunluk verilmezse bos baslar; dunya kopyalanmaz (sahiplik gecer)", () => {
    const a = kucukSim();
    const d = dunyaCoz(dunyaSerilestir(a.dunya));
    const b = Simulasyon.yukle(kucukVeri(), d);
    expect(b.gunluk).toEqual([]);
    expect(b.dunya).toBe(d);
  });
});

describe("kural surumu", () => {
  it("deterministik; anahtar sirasindan bagimsiz; harita dahil degil", () => {
    const v = kucukVeri();
    const k = kuralSurumuHesapla(v);
    expect(k).toMatch(/^k1-[0-9a-f]{16}$/);
    expect(kuralSurumuHesapla(kucukVeri())).toBe(k);
    const ters = { icerik: JSON.parse(JSON.stringify(v.icerik)), param: Object.fromEntries(Object.entries(v.param).reverse()) } as VeriPaketi;
    expect(kuralSurumuHesapla(ters)).toBe(k);
    const baskaHarita = kucukVeri();
    baskaHarita.harita.bolgeler[0]!.nufus++;
    expect(kuralSurumuHesapla(baskaHarita)).toBe(k);
  });

  it("parametre veya icerik degisince farkli kimlik", () => {
    const k = kuralSurumuHesapla(kucukVeri());
    const p = kucukVeri();
    p.param.ekonomi.varsayilanVergiPpm++;
    const i = kucukVeri();
    i.icerik.mallar[0]!.tabanFiyat++;
    const t = kucukVeri();
    t.icerik.teknolojiler[0]!.ad = "Teknik 2";
    const kimlikler = [k, kuralSurumuHesapla(p), kuralSurumuHesapla(i), kuralSurumuHesapla(t)];
    expect(new Set(kimlikler).size).toBe(4);
  });
});

describe("anlik goruntu zarfi", () => {
  const s = kucukSim();
  const kural = kuralSurumuHesapla(kucukVeri());
  const metin = anlikGoruntuOlustur(s, kural);

  it("zarf kanonik JSON; alanlar dogru; coz -> ayni dunya", () => {
    const ham = JSON.parse(metin) as Record<string, unknown>;
    expect(Object.keys(ham)).toEqual(["dunya", "durumOzeti", "icerikKimlikTablosu", "kuralSurumu", "simZamani", "surum"]);
    expect(kanonikSerilestir(ham)).toBe(metin);
    const g = anlikGoruntuCoz(metin, kural);
    expect(g.surum).toBe(2);
    expect(g.kuralSurumu).toBe(kural);
    expect(g.simZamani).toBe(30 * SAAT);
    expect(g.durumOzeti).toBe(s.durumOzeti());
    expect(dunyaSerilestir(g.dunya)).toBe(dunyaSerilestir(s.dunya));
  });

  it("anlikGoruntudenYukle: kural surumu uyusmazsa reddeder", () => {
    const v = kucukVeri();
    v.param.ekonomi.varsayilanVergiPpm++;
    expect(() => Simulasyon.anlikGoruntudenYukle(v, metin)).toThrow(/kural surumu uyusmuyor/);
    expect(Simulasyon.anlikGoruntudenYukle(kucukVeri(), metin).durumOzeti()).toBe(s.durumOzeti());
  });

  it("bozuk zarf reddedilir: surum, ozet (dunya ile oynanmis), simZamani, eksik/fazla alan, dunya ici yol", () => {
    expect(hataYolu(() => anlikGoruntuCoz(boz(metin, (z) => (z.surum = 3))))).toBe("$.surum");
    expect(() => anlikGoruntuCoz(boz(metin, (z) => (z.surum = 3)))).toThrow(/desteklenmeyen anlik goruntu surumu/);
    expect(hataYolu(() => anlikGoruntuCoz(boz(metin, (z) => z.dunya.bolgeler[0].nufus++)))).toBe("$.durumOzeti");
    expect(hataYolu(() => anlikGoruntuCoz(boz(metin, (z) => (z.simZamani = 0))))).toBe("$.simZamani");
    expect(hataYolu(() => anlikGoruntuCoz(boz(metin, (z) => delete z.durumOzeti)))).toBe("$.durumOzeti");
    expect(hataYolu(() => anlikGoruntuCoz(boz(metin, (z) => (z.gunluk = []))))).toBe("$.gunluk");
    expect(hataYolu(() => anlikGoruntuCoz(boz(metin, (z) => z.dunya.bolgeler[1].stoklar.pop())))).toBe("$.dunya.bolgeler[1].stoklar");
    expect(hataYolu(() => anlikGoruntuCoz(metin, "k1-0000000000000000"))).toBe("$.kuralSurumu");
  });
});
