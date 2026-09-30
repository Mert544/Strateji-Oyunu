/**
 * v0.1 kalibrasyon yenilikleri: erken oyun hızlandırması (zaman kuralı 2), para lavaboları
 * (tesis işletme gideri, birlik maaşı, ödeme gücü) ve teknoloji yayılımı. Gerçek Simulasyon, mini harita.
 */
import { describe, expect, it } from "vitest";
import type { VeriPaketi } from "@bolge/veri";
import { carpBol } from "../src/sabit";
import { carpliSure, EN_KISA_SURE, hizlandirilmisSure, sureCarpaniPpm } from "../src/erkenOyun";
import { lojistikCoz } from "../src/lojistik/cozum";
import { oyuncuBul, stokEkle } from "../src/stok";
import { DAKIKA, GUN, PPM, SAAT } from "../src/tipler";
import type { Simulasyon } from "../src/motor";
import type { Komut } from "../src/tipler";
import { hazine, kur, saatKos, simdiyiIsle, ver, verTamam } from "./ekonomi-yardimci";

/** Erken oyun açık: katılımdan 24 saat %10, 168. saatte %100. */
function erkenAc(v: VeriPaketi): void {
  v.param.erkenOyun = { baslangicCarpaniPpm: 100_000, sabitSaat: 24, bitisSaat: 168 };
}

const carpan = (s: Simulasyon, oyuncu = "a"): number => sureCarpaniPpm(s.dunya, s.baglam, oyuncu);

/** Bölge stoğuna mal ekler (uzun koşularda lojistik çelik/parçayı başka yere taşımış olabilir). */
function malVer(s: Simulasyon, bolge: string, mal: string, miktar: number): void {
  stokEkle(s.dunya, s.baglam, s.ic.bolgeIndeks[bolge]!, s.ic.malIndeks[mal]!, miktar);
}

function katil(s: Simulasyon, oyuncu: string, bolgeler: string[]): void {
  const r = s.uygula({ t: s.dunya.zaman, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu, bolgeler } });
  expect(r).toEqual({ tamam: true });
}

describe("erken oyun: sure carpani egrisi", () => {
  it("katilim ve sabitSaat'e kadar baslangic carpani, arada dogrusal, bitisSaat ve sonrasi PPM", () => {
    const { s } = kur({ duzenle: erkenAc });
    expect(carpan(s)).toBe(100_000); // t = 0 (katilim ani)
    s.calistirKadar(1 * SAAT);
    expect(carpan(s)).toBe(100_000);
    s.calistirKadar(24 * SAAT);
    expect(carpan(s)).toBe(100_000); // sabitSaat dahil
    s.calistirKadar(24 * SAAT + DAKIKA);
    expect(carpan(s)).toBeGreaterThan(100_000); // artik yukseliyor
    expect(carpan(s)).toBeLessThan(100_200);
    s.calistirKadar(96 * SAAT); // aralarin tam ortasi: 24 + (168-24)/2
    expect(carpan(s)).toBe(100_000 + 450_000);
    s.calistirKadar(168 * SAAT - 1);
    expect(carpan(s)).toBeLessThan(PPM);
    expect(carpan(s)).toBeGreaterThan(PPM - 100);
    s.calistirKadar(168 * SAAT);
    expect(carpan(s)).toBe(PPM);
    s.calistirKadar(400 * SAAT);
    expect(carpan(s)).toBe(PPM);
  });

  it("egri tekduze artar; bilinmeyen oyuncuda hizlandirma yok; bitisSaat = sabitSaat adim olur", () => {
    const { s } = kur({ duzenle: erkenAc });
    let onceki = 0;
    for (let saat = 0; saat <= 200; saat += 4) {
      s.calistirKadar(saat * SAAT);
      const c = carpan(s);
      expect(c).toBeGreaterThanOrEqual(onceki);
      onceki = c;
    }
    expect(carpan(s, "yok")).toBe(PPM);

    const { s: adim } = kur({
      duzenle: (v) => {
        v.param.erkenOyun = { baslangicCarpaniPpm: 200_000, sabitSaat: 10, bitisSaat: 10 };
      },
    });
    adim.calistirKadar(10 * SAAT);
    expect(carpan(adim)).toBe(200_000);
    adim.calistirKadar(10 * SAAT + 1);
    expect(carpan(adim)).toBe(PPM);
  });

  it("hizlandirilmisSure: carpanla kisalir, en az 1 dakika; carpliSure kisa ozgun sureyi uzatmaz", () => {
    const { s } = kur({ duzenle: erkenAc });
    expect(hizlandirilmisSure(s.dunya, s.baglam, "a", 4 * SAAT)).toBe(24 * DAKIKA);
    expect(hizlandirilmisSure(s.dunya, s.baglam, "a", 12 * SAAT)).toBe(72 * DAKIKA);
    expect(carpliSure(4 * SAAT, 1)).toBe(EN_KISA_SURE); // 14 ms -> 1 dakika
    expect(carpliSure(30_000, 100_000)).toBe(30_000); // ozgun sure 1 dakikadan kisaysa ozgun kalir
    expect(carpliSure(4 * SAAT, PPM)).toBe(4 * SAAT);
  });
});

describe("erken oyun: sureler", () => {
  it("tesis insasi katilimdan sonra dakikalar surer; 168. saatten sonra ozgun sure", () => {
    const { s } = kur({ duzenle: erkenAc });
    simdiyiIsle(s);
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }); // 4 saat -> 24 dakika
    expect(s.dunya.insaatlar[0]!.bitis).toBe(24 * DAKIKA);
    const n0 = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!.tesisler.length;
    s.calistirKadar(24 * DAKIKA - 1);
    expect(s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!.tesisler).toHaveLength(n0);
    s.calistirKadar(24 * DAKIKA);
    expect(s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!.tesisler).toHaveLength(n0 + 1);

    // Orta nokta (96. saat): carpan %55 -> 4 saat x 0.55 = 2.2 saat
    s.calistirKadar(96 * SAAT);
    malVer(s, "m_ova", "celik", 1_000_000);
    malVer(s, "m_ova", "parca", 1_000_000);
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    expect(s.dunya.insaatlar[0]!.bitis).toBe(96 * SAAT + carpBol(4 * SAAT, 550_000, PPM));

    // 168. saatten sonra: ozgun sure
    s.calistirKadar(200 * SAAT);
    malVer(s, "m_ova", "celik", 1_000_000);
    malVer(s, "m_ova", "parca", 1_000_000);
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    expect(s.dunya.insaatlar.at(-1)!.bitis).toBe(200 * SAAT + 4 * SAAT);
  });

  it("kenar gelistirme ve birlik partisi de hizlanir", () => {
    const { s } = kur({ duzenle: erkenAc });
    simdiyiIsle(s);
    verTamam(s, "a", { tur: "kenar_gelistir", kenar: 0 });
    const gelistirmeSaat = s.ic.param.lojistik.gelistirmeSuresiSaat;
    expect(s.dunya.insaatlar.find((i) => i.tur === "kenar")!.bitis).toBe(carpBol(gelistirmeSaat * SAAT, 100_000, PPM));
    verTamam(s, "a", { tur: "birlik_uret", bolge: "m_ova", birlik: "piyade_tumeni", adet: 1 });
    const partiSaat = s.ic.birlikler[s.ic.birlikIndeks["piyade_tumeni"]!]!.partiSuresiSaat;
    expect(s.dunya.partiler[0]!.bitis).toBe(carpBol(partiSaat * SAAT, 100_000, PPM));
  });

  it("arastirma hizlanir (yayilim yokken yalnizca erken oyun carpani)", () => {
    const { s } = kur({ duzenle: erkenAc });
    verTamam(s, "a", { tur: "arastir", teknoloji: "mekanize_tarim" });
    const tek = s.ic.teknolojiler[s.ic.teknolojiIndeks["mekanize_tarim"]!]!;
    expect(oyuncuBul(s.dunya, "a")!.arastirma!.bitis).toBe(carpBol(tek.sureGun * GUN, 100_000, PPM));
  });

  it("gec katilan oyuncu da kendi katilimindan itibaren hizlanir; yerlesik oyuncu etkilenmez", () => {
    const { s } = kur({
      oyuncular: { a: ["m_ova", "m_liman"], b: ["m_col"] },
      duzenle: erkenAc,
    });
    s.calistirKadar(200 * SAAT); // a ve b hizlandirma penceresini bitirdi
    katil(s, "c", ["m_sehir"]);
    expect(carpan(s, "a")).toBe(PPM);
    expect(carpan(s, "c")).toBe(100_000);
    simdiyiIsle(s);
    malVer(s, "m_sehir", "celik", 1_000_000);
    malVer(s, "m_sehir", "parca", 1_000_000);
    verTamam(s, "c", { tur: "tesis_insa", bolge: "m_sehir", tesisTuru: "celikhane" }); // 12 saat -> 72 dakika
    const t = 200 * SAAT;
    expect(s.dunya.insaatlar.find((i) => i.sahip === "c")!.bitis).toBe(t + 72 * DAKIKA);
    malVer(s, "m_ova", "celik", 1_000_000);
    malVer(s, "m_ova", "parca", 1_000_000);
    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    expect(s.dunya.insaatlar.find((i) => i.sahip === "a")!.bitis).toBe(t + 4 * SAAT);
    // Gec katilanin penceresi de 168. saatte kapanir.
    s.calistirKadar(t + 168 * SAAT);
    expect(carpan(s, "c")).toBe(PPM);
  });

  it("savas hazirlik ve pencere sureleri hizlandirmadan etkilenmez", () => {
    const { s } = kur({
      oyuncular: { a: ["m_ova"], b: ["m_liman"] },
      duzenle: erkenAc,
    });
    for (const o of s.dunya.oyuncular) o.korumaBitis = 0;
    simdiyiIsle(s);
    verTamam(s, "a", { tur: "savas_ilan", saldiranBolge: "m_ova", hedefBolge: "m_liman" });
    const sv = s.dunya.savaslar[0]!;
    const p = s.ic.param.askeri;
    expect(carpan(s)).toBe(100_000); // hizlandirma aktif
    expect(sv.pencereBaslangic - sv.ilan).toBeGreaterThanOrEqual(p.ilanHazirlikSaatMin * SAAT);
    expect(sv.pencereBaslangic - sv.ilan).toBeLessThanOrEqual(p.ilanHazirlikSaatMax * SAAT);
    expect(sv.pencereBitis - sv.pencereBaslangic).toBe(p.pencereSaat * SAAT);
  });
});

/** Toplam vergi geliri (mili-para/saat): oyuncunun bolgelerinde nufus x vergiTabani x vergiPpm. */
function vergiToplami(s: Simulasyon, oyuncu: string): number {
  const o = oyuncuBul(s.dunya, oyuncu)!;
  let t = 0;
  for (const b of s.dunya.bolgeler) {
    if (b.sahip !== oyuncu) continue;
    t += carpBol(carpBol(b.nufus, s.ic.param.ekonomi.vergiTabani1000Saat, 1000), o.vergiPpm, PPM);
  }
  return t;
}

function aktifTesisSayisi(s: Simulasyon, oyuncu: string): number {
  let n = 0;
  for (const b of s.dunya.bolgeler) if (b.sahip === oyuncu) n += b.tesisler.filter((t) => t.aktif).length;
  return n;
}

function birlikSayisi(s: Simulasyon, oyuncu: string): number {
  let n = 0;
  for (const b of s.dunya.bolgeler) if (b.sahip === oyuncu) n += b.birlikler.reduce((x, y) => x + y, 0);
  return n;
}

describe("para lavaboları", () => {
  const TESIS_GIDERI = 40_000;
  const BIRLIK_MAASI = 7_000;
  const lavaboAc = (v: VeriPaketi): void => {
    v.param.ekonomi.tesisIsletmeParasiSaat = TESIS_GIDERI;
    v.param.askeri.birlikMaasiSaat = BIRLIK_MAASI;
  };

  it("hazine orani = vergi - aktif tesis x isletme gideri - birlik x maas (ticaret yokken tam esitlik)", () => {
    const { s: kapali } = kur();
    const { s } = kur({ duzenle: lavaboAc });
    simdiyiIsle(kapali);
    simdiyiIsle(s);
    const tesis = aktifTesisSayisi(s, "a");
    const birlik = birlikSayisi(s, "a");
    expect(tesis).toBeGreaterThan(0);
    expect(birlik).toBeGreaterThan(0);
    const vergi = vergiToplami(s, "a");
    expect(oyuncuBul(kapali.dunya, "a")!.hazine.yerelOran).toBe(vergi); // lavabo yok: yalniz vergi
    expect(oyuncuBul(s.dunya, "a")!.hazine.yerelOran).toBe(vergi - tesis * TESIS_GIDERI - birlik * BIRLIK_MAASI);
  });

  it("pasif (tesis_durum aktif=false) tesis gider yazmaz; hazine gercekten azalir", () => {
    const { s } = kur({ duzenle: (v) => { lavaboAc(v); v.param.ekonomi.tesisIsletmeParasiSaat = 1_000; } });
    simdiyiIsle(s);
    const once = aktifTesisSayisi(s, "a");
    const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!;
    verTamam(s, "a", { tur: "tesis_durum", bolge: "m_ova", tesis: ova.tesisler[0]!.id, aktif: false });
    simdiyiIsle(s);
    expect(aktifTesisSayisi(s, "a")).toBe(once - 1);
    expect(oyuncuBul(s.dunya, "a")!.hazine.yerelOran).toBe(vergiToplami(s, "a") - (once - 1) * 1_000 - birlikSayisi(s, "a") * BIRLIK_MAASI);

    // Saatler gecince hazine, lavabosiz dunyadan az olur.
    const { s: lavabosiz } = kur();
    saatKos(s, 10);
    saatKos(lavabosiz, 10);
    expect(hazine(s, "a")).toBeLessThan(hazine(lavabosiz, "a"));
  });

  it("hazine 0 ve net oran negatifken tesis verimi odeme gucu (gelir/gider) oraninda kisilir", () => {
    const { s } = kur({ duzenle: (v) => { v.param.ekonomi.tesisIsletmeParasiSaat = 400_000; } });
    simdiyiIsle(s);
    const ova = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!;
    const ciftlik = ova.tesisler[0]!; // m_ova: ciftlik (girdisiz), istihdam tam
    expect(s.ic.tesisTurleri[ciftlik.tur]!.id).toBe("ciftlik");

    // 1) Hazine > 0: net negatif olsa da tam verim (hazine gider karsilar).
    expect(hazine(s, "a")).toBeGreaterThan(0);
    const tamVerim = ciftlik.verimPpm;
    expect(tamVerim).toBe(ciftlik.isciPpm);
    expect(oyuncuBul(s.dunya, "a")!.hazine.yerelOran).toBeLessThan(0);

    // 2) Hazine 0: verim = istihdam x odeme gucu.
    const o = oyuncuBul(s.dunya, "a")!;
    o.hazine.miktar = 0;
    o.hazine.artik = 0;
    lojistikCoz(s.dunya, s.baglam);
    const gelir = vergiToplami(s, "a");
    const gider = aktifTesisSayisi(s, "a") * 400_000 + birlikSayisi(s, "a") * s.ic.param.askeri.birlikMaasiSaat;
    const odeme = carpBol(gelir, PPM, gider);
    expect(odeme).toBeGreaterThan(0);
    expect(odeme).toBeLessThan(PPM);
    expect(ciftlik.verimPpm).toBe(carpBol(tamVerim, odeme, PPM));
    expect(ciftlik.verimPpm).toBeLessThan(tamVerim);
    // Hazine negatife dusmez: oran negatif ama miktar 0'da kalir.
    saatKos(s, 5);
    expect(hazine(s, "a")).toBe(0);

    // 3) Gelir gideri karsiliyorsa (hazine 0 iken bile) kisinti yok.
    const { s: rahat } = kur({ duzenle: (v) => { v.param.ekonomi.tesisIsletmeParasiSaat = 1_000; } });
    simdiyiIsle(rahat);
    const ro = oyuncuBul(rahat.dunya, "a")!;
    ro.hazine.miktar = 0;
    lojistikCoz(rahat.dunya, rahat.baglam);
    const rc = rahat.dunya.bolgeler[rahat.ic.bolgeIndeks["m_ova"]!]!.tesisler[0]!;
    expect(rc.verimPpm).toBe(tamVerim);
  });

  it("hazine pozitif olunca verim tam hale doner", () => {
    const { s } = kur({ duzenle: (v) => { v.param.ekonomi.tesisIsletmeParasiSaat = 400_000; } });
    simdiyiIsle(s);
    const o = oyuncuBul(s.dunya, "a")!;
    const ciftlik = s.dunya.bolgeler[s.ic.bolgeIndeks["m_ova"]!]!.tesisler[0]!;
    const tam = ciftlik.verimPpm;
    o.hazine.miktar = 0;
    lojistikCoz(s.dunya, s.baglam);
    expect(ciftlik.verimPpm).toBeLessThan(tam);
    o.hazine.miktar = 5_000_000;
    lojistikCoz(s.dunya, s.baglam);
    expect(ciftlik.verimPpm).toBe(tam);
  });
});

describe("teknoloji yayilimi", () => {
  const yayilimAc = (v: VeriPaketi): void => {
    v.param.teknoloji.yayilimIndirimiPpm = 500_000;
  };
  const uc = { a: ["m_ova", "m_liman"], b: ["m_col"], c: ["m_sehir"] };

  function bilsin(s: Simulasyon, oyuncu: string, teknoloji: string): void {
    oyuncuBul(s.dunya, oyuncu)!.teknolojiler.push(s.ic.teknolojiIndeks[teknoloji]!);
  }

  it("bilen diger oyuncularin payi p = bilen/(n-1) maliyet ve sureyi (1 - p x indirim) ile carpar", () => {
    const tekIndeks = "mekanize_tarim";
    const { s: yok } = kur({ oyuncular: uc, duzenle: yayilimAc });
    const tek = yok.ic.teknolojiler[yok.ic.teknolojiIndeks[tekIndeks]!]!;

    // Kimse bilmiyor: indirim yok.
    const p0 = hazine(yok, "a");
    verTamam(yok, "a", { tur: "arastir", teknoloji: tekIndeks });
    expect(p0 - hazine(yok, "a")).toBe(tek.maliyet);
    expect(oyuncuBul(yok.dunya, "a")!.arastirma!.bitis).toBe(tek.sureGun * GUN);

    // 3 oyuncudan biri biliyor: p = 1/2 -> %75
    const { s: biri } = kur({ oyuncular: uc, duzenle: yayilimAc });
    bilsin(biri, "b", tekIndeks);
    const p1 = hazine(biri, "a");
    verTamam(biri, "a", { tur: "arastir", teknoloji: tekIndeks });
    expect(p1 - hazine(biri, "a")).toBe(carpBol(tek.maliyet, 750_000, PPM));
    expect(oyuncuBul(biri.dunya, "a")!.arastirma!.bitis).toBe(carpBol(tek.sureGun * GUN, 750_000, PPM));

    // Ikisi de biliyor: p = 1 -> %50
    const { s: ikisi } = kur({ oyuncular: uc, duzenle: yayilimAc });
    bilsin(ikisi, "b", tekIndeks);
    bilsin(ikisi, "c", tekIndeks);
    const p2 = hazine(ikisi, "a");
    verTamam(ikisi, "a", { tur: "arastir", teknoloji: tekIndeks });
    expect(p2 - hazine(ikisi, "a")).toBe(carpBol(tek.maliyet, 500_000, PPM));
    expect(oyuncuBul(ikisi.dunya, "a")!.arastirma!.bitis).toBe(carpBol(tek.sureGun * GUN, 500_000, PPM));
  });

  it("tek oyuncuda yayilim 0; yayilim kapaliysa indirim yok; kendi bilgisi sayilmaz", () => {
    const { s: tekOyuncu } = kur({ oyuncular: { a: ["m_ova"] }, duzenle: yayilimAc });
    const tek = tekOyuncu.ic.teknolojiler[tekOyuncu.ic.teknolojiIndeks["mekanize_tarim"]!]!;
    verTamam(tekOyuncu, "a", { tur: "arastir", teknoloji: "mekanize_tarim" });
    expect(oyuncuBul(tekOyuncu.dunya, "a")!.arastirma!.bitis).toBe(tek.sureGun * GUN);

    const { s: kapali } = kur({ oyuncular: uc });
    bilsin(kapali, "b", "mekanize_tarim");
    bilsin(kapali, "c", "mekanize_tarim");
    verTamam(kapali, "a", { tur: "arastir", teknoloji: "mekanize_tarim" });
    expect(oyuncuBul(kapali.dunya, "a")!.arastirma!.bitis).toBe(tek.sureGun * GUN);

    // Ikinci arastirma: a'nin kendi bilgisi p'ye katilmaz, b'nin bilgisi katilir.
    const { s } = kur({ oyuncular: uc, duzenle: yayilimAc });
    bilsin(s, "a", "mekanize_tarim");
    bilsin(s, "b", "derin_madencilik");
    const derin = s.ic.teknolojiler[s.ic.teknolojiIndeks["derin_madencilik"]!]!;
    verTamam(s, "a", { tur: "arastir", teknoloji: "derin_madencilik" });
    expect(oyuncuBul(s.dunya, "a")!.arastirma!.bitis).toBe(carpBol(derin.sureGun * GUN, 750_000, PPM));
  });

  it("yayilim ve erken oyun birlikte: maliyet yalniz yayilimla, sure ikisiyle kisalir", () => {
    const { s } = kur({ oyuncular: uc, duzenle: (v) => { yayilimAc(v); erkenAc(v); } });
    bilsin(s, "b", "mekanize_tarim");
    const tek = s.ic.teknolojiler[s.ic.teknolojiIndeks["mekanize_tarim"]!]!;
    const p0 = hazine(s, "a");
    verTamam(s, "a", { tur: "arastir", teknoloji: "mekanize_tarim" });
    expect(p0 - hazine(s, "a")).toBe(carpBol(tek.maliyet, 750_000, PPM));
    expect(oyuncuBul(s.dunya, "a")!.arastirma!.bitis).toBe(carpBol(carpBol(tek.sureGun * GUN, 750_000, PPM), 100_000, PPM));
  });
});

describe("determinizm", () => {
  function oyna(duzenle?: (v: VeriPaketi) => void): { ozet: string; s: Simulasyon } {
    const { s } = kur({ duzenle, tohum: 5, oyuncular: { a: ["m_ova", "m_liman", "m_gecit"], b: ["m_col", "m_sehir"] } });
    const komutlar: Array<[number, string, Komut]> = [
      [0, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }],
      [0, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "petrol", yon: "ihracat", oranSaat: 20_000 }],
      [1 * SAAT, "b", { tur: "arastir", teknoloji: "mekanize_tarim" }],
      [2 * SAAT, "a", { tur: "arastir", teknoloji: "mekanize_tarim" }],
      [3 * SAAT, "a", { tur: "kenar_gelistir", kenar: 0 }],
      [30 * SAAT, "b", { tur: "birlik_uret", bolge: "m_sehir", birlik: "piyade_tumeni", adet: 2 }],
      [60 * SAAT, "a", { tur: "tesis_insa", bolge: "m_gecit", tesisTuru: "komur_ocagi" }],
    ];
    for (const [t, o, komut] of komutlar) {
      const r = ver(s, o, komut);
      void r;
      s.calistirKadar(Math.max(s.dunya.zaman, t));
    }
    s.calistirKadar(10 * GUN);
    return { ozet: s.durumOzeti(), s };
  }
  const hepsiAcik = (v: VeriPaketi): void => {
    erkenAc(v);
    v.param.ekonomi.tesisIsletmeParasiSaat = 60_000;
    v.param.askeri.birlikMaasiSaat = 8_000;
    v.param.teknoloji.yayilimIndirimiPpm = 500_000;
  };

  it("ayni tohum ve komutlarla ayni durum ozeti; yenilikler dunyayi gercekten degistirir", () => {
    const a = oyna(hepsiAcik);
    const b = oyna(hepsiAcik);
    expect(a.ozet).toBe(b.ozet);
    expect(oyna().ozet).not.toBe(a.ozet);
  });

  it("klon ve yeniden oynatma ayni sonucu verir", () => {
    const { s } = oyna(hepsiAcik);
    const klon = s.klonla();
    s.calistirKadar(s.dunya.zaman + 3 * GUN);
    klon.calistirKadar(klon.dunya.zaman + 3 * GUN);
    expect(klon.durumOzeti()).toBe(s.durumOzeti());
  });
});
