/**
 * İl imza ürünleri ve ürün pencere verisi: şema, doğrulayıcı (hiyerarşi/içerik/pencere çapraz kuralları),
 * Alfa-0 illerinin tamlığı, pencere toplamları ve aralıkları, deterministik/kanonik biçim.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  ALFA0_ILLERI,
  IMZA_CARPAN_UST_PPM,
  IlImzaDosyaSema,
  PENCERE_AY_SAYISI,
  PENCERE_PPM,
  PENCERE_TOPLAM_PPM,
  UrunPencereDosyaSema,
  YASAK_MAL_KIMLIKLERI,
  YOGUNLUK_ALT_PPM,
  YOGUNLUK_ONERILEN_PPM,
  YOGUNLUK_UST_PPM,
  dogrulaIlImzaPaketi,
  dogrulaUrunPencere,
  hiyerarsiOzetiCikar,
  ilImzaIndeksi,
  ilImzaVerisiniYukle,
  kanonikMetin,
  urunPencereAyPpm,
  urunProfiliPpm,
  yilBoyuEtkinMi,
  type DogrulamaSonucu,
  type IlImzaDosyasi,
  type IlImzaPaketi,
  type UrunPencereDosyasi,
} from "../src/index";
import * as saf from "../src/saf";

const yol = (g: string) => new URL(`../${g}`, import.meta.url);
const metinOku = (g: string) => readFileSync(yol(g), "utf8");
const jsonOku = (g: string): unknown => JSON.parse(metinOku(g));

const IL_IMZA = "icerik/il-imza.json";
const PENCERE = "icerik/urun-pencere.json";

function hatalar(s: DogrulamaSonucu): string[] {
  return s.gecerli ? [] : s.hatalar;
}

function malKimlikleri(): string[] {
  return (jsonOku("icerik/icerik.json") as { mallar: Array<{ id: string }> }).mallar.map((m) => m.id);
}

const hiyerarsiHam = jsonOku("haritalar/odbl/hiyerarsi.json");

/** Dosyaların taze, değiştirilebilir kopyası. */
function paket(): { ilImza: IlImzaDosyasi; urunPencere: UrunPencereDosyasi } & IlImzaPaketi {
  return {
    ilImza: structuredClone(jsonOku(IL_IMZA)) as IlImzaDosyasi,
    urunPencere: structuredClone(jsonOku(PENCERE)) as UrunPencereDosyasi,
    hiyerarsi: hiyerarsiHam,
    malKimlikleri: malKimlikleri(),
  };
}

function dogrula(p: IlImzaPaketi): DogrulamaSonucu {
  return dogrulaIlImzaPaketi(p);
}

function il(p: { ilImza: IlImzaDosyasi }, kimlik: string) {
  const k = p.ilImza.iller.find((x) => x.il === kimlik);
  if (k === undefined) throw new Error(`il yok: ${kimlik}`);
  return k;
}

describe("dosyalar yüklenir ve geçerlidir", () => {
  it("varsayılan paket doğrulamadan geçer (hatalar boş)", () => {
    expect(hatalar(dogrula(paket()))).toEqual([]);
  });

  it("Node yükleyici tipli nesneleri döndürür; her çağrıda yeni kopya", () => {
    const a = ilImzaVerisiniYukle();
    const b = ilImzaVerisiniYukle();
    expect(a).toEqual(b);
    expect(a.ilImza).not.toBe(b.ilImza);
    a.ilImza.iller.pop();
    expect(ilImzaVerisiniYukle().ilImza.iller).toHaveLength(81);
  });

  it("saf API (tarayıcı/worker) aynı doğrulayıcıyı dışa açar ve node:fs'e bağlı değildir", () => {
    expect(saf.dogrulaIlImzaPaketi).toBe(dogrulaIlImzaPaketi);
    expect(Object.keys(saf)).not.toContain("ilImzaVerisiniYukle");
    const kaynak = readFileSync(new URL("../src/il-imza.ts", import.meta.url), "utf8");
    expect(kaynak).not.toMatch(/from\s+"node:/);
  });

  it("81 il kayıtlıdır; il kimlikleri hiyerarşiyle birebir örtüşür", () => {
    const { ilImza } = ilImzaVerisiniYukle();
    const hiy = hiyerarsiOzetiCikar(hiyerarsiHam);
    const trIller = [...hiy].filter(([, h]) => h.ulke === "tr").map(([k]) => k).sort();
    expect(trIller).toHaveLength(81);
    expect(ilImza.iller.map((k) => k.il)).toEqual(trIller);
    expect(ilImza.iller.every((k) => k.ulke === "TR")).toBe(true);
  });

  it("içerikteki (24) mal 'planli' değildir; içerikte olmayan her imza malı 'ileride' listesindedir", () => {
    const mevcut = new Set(malKimlikleri());
    const { ilImza } = ilImzaVerisiniYukle();
    const ileride = new Set(ilImza.ileride.map((m) => m.malId));
    expect(ileride.size).toBe(ilImza.ileride.length);
    for (const m of ileride) expect(mevcut.has(m)).toBe(false);
    for (const k of ilImza.iller) {
      for (const m of k.imza) {
        expect(m.planli).toBe(!mevcut.has(m.malId));
        expect(ileride.has(m.malId)).toBe(m.planli);
      }
    }
    // rapor §7 kataloğu 82 mal; mal kimlik kilidi: -tekstil -sarkuteri +9 (ekmek, sekerleme, cam, pencere, boksit, alumina, aluminyum, kumas, hazir_giyim) = 89; 14'ü mevcut.
    // P3: Alfa-0'ın 9 'ileride' malı (un, ekmek, cam, pencere, sut, sut_urunu, findik, findik_urunu, sekerleme) içeriğe girdi ve 'ileride'den çıktı (eski değer 89 - 14 = 75);
    // kepek 'ileride'de hiç yoktu (kimlik listesinde aşamasıyla durur). Kalan: 89 - 14 - 9 = 66.
    expect(ilImza.ileride).toHaveLength(89 - 14 - 9);
  });

  it("mal kimlik kilidi: 17 kimlik 'ileride'de dikey §9.2 adı ve öncelik etiketiyle aynen bulunur (içeriğe girenler hariç)", () => {
    const KILIT: Record<string, [string, string]> = {
      un: ["Un", "A0"], ekmek: ["Ekmek", "A0"], cam: ["Cam", "A0"], pencere: ["Pencere", "A0"], sut: ["Süt", "A0"],
      sut_urunu: ["Süt Ürünleri", "A0"], findik: ["Fındık (kabuklu)", "A0"], findik_urunu: ["Fındık İçi", "A0"], sekerleme: ["Şekerleme", "A0"],
      cimento: ["Çimento", "A0-ops"], boksit: ["Boksit", "A0-ops"], alumina: ["Alümina", "A0-ops"], aluminyum: ["Alüminyum", "A0-ops"],
      pamuk: ["Pamuk", "A1"], iplik: ["İplik", "A1"], kumas: ["Kumaş", "A1"], hazir_giyim: ["Hazır Giyim", "A1"],
    };
    expect(Object.keys(KILIT)).toHaveLength(17);
    const mevcut = new Set(malKimlikleri());
    const ileride = new Map(ilImzaVerisiniYukle().ilImza.ileride.map((m) => [m.malId, m]));
    for (const [id, [ad, oncelik]] of Object.entries(KILIT)) {
      if (mevcut.has(id)) continue;
      expect(ileride.get(id), id).toMatchObject({ ad, oncelik });
    }
    // kumas ve hazir_giyim Tier 1 (hâlâ 'ileride'); ekmek ve sekerleme Tier 1 idi ve P3'te içeriğe girdi ('ileride'de yok, içerikte var)
    for (const id of ["kumas", "hazir_giyim"]) expect(ileride.get(id)!.kademe).toBe("t1");
    for (const id of ["ekmek", "sekerleme"]) {
      expect(ileride.has(id), id).toBe(false);
      expect(mevcut.has(id), id).toBe(true);
    }
    // eş anlamlı ikinci kimlik yok
    for (const yanlis of ["aluminium", "alüminyum", "alumin", "findik_ici", "seker", "giyim", "kumaş"]) expect(ileride.has(yanlis), yanlis).toBe(false);
  });

  it("yasak kimlikler (tekstil, sarkuteri) hiçbir yerde mal olarak geçmez; doğrulayıcı bunları reddeder", () => {
    expect([...YASAK_MAL_KIMLIKLERI]).toEqual(["sarkuteri", "tekstil"]);
    const { ilImza, urunPencere } = ilImzaVerisiniYukle();
    const mallar = [
      ...ilImza.ileride.map((m) => m.malId),
      ...ilImza.iller.flatMap((k) => [...k.imza, ...k.aday].map((m) => m.malId)),
      ...ilImza.iller.flatMap((k) => k.cografiIsaretler.map((g) => g.malId)),
      ...Object.keys(urunPencere.urunler),
    ];
    for (const y of YASAK_MAL_KIMLIKLERI) expect(mallar).not.toContain(y);
    for (const dosya of [IL_IMZA, PENCERE]) for (const y of YASAK_MAL_KIMLIKLERI) expect(metinOku(dosya)).not.toMatch(new RegExp(`\\b${y}\\b`));
    for (const y of YASAK_MAL_KIMLIKLERI) {
      let p = paket();
      p.ilImza.ileride.push({ malId: y, ad: "X", kademe: "t1", oncelik: "A1" });
      p.ilImza.ileride.sort((a, b) => ((a.kademe < b.kademe ? -1 : a.kademe > b.kademe ? 1 : 0) || (a.malId < b.malId ? -1 : 1)));
      expect(hatalar(dogrula(p)).join("\n")).toMatch(/yasak mal kimligi/);
      p = paket();
      const k = il(p, "tr_16");
      k.aday[0]!.malId = y;
      expect(hatalar(dogrula(p)).join("\n")).toMatch(/yasak mal kimligi/);
      p = paket();
      il(p, "tr_16").cografiIsaretler[0]!.malId = y;
      expect(hatalar(dogrula(p)).join("\n")).toMatch(/yasak mal kimligi/);
      p = paket();
      p.malKimlikleri = [...malKimlikleri(), y];
      expect(hatalar(dogrula(p)).join("\n")).toMatch(/icerik mal kimligi .* yasak/);
      const d = structuredClone(jsonOku(PENCERE)) as UrunPencereDosyasi;
      d.urunler[y] = d.urunler["et"]!;
      expect(hatalar(dogrulaUrunPencere(d, new Set([...malKimlikleri(), y]))).join("\n")).toMatch(/yasak mal kimligi/);
    }
  });

  it("islenmis (A) mallar ve zanaat/sanayi malları pencere almaz; sut ve findik pencerelidir", () => {
    const { ilImza, urunPencere } = ilImzaVerisiniYukle();
    for (const m of ilImza.ileride.filter((x) => x.tur === "A" || x.kademe === "t3a" || x.tur === "S")) {
      expect(urunPencere.urunler[m.malId], m.malId).toBeUndefined();
    }
    expect(urunPencere.urunler["sut"]!.tur).toBe("yil_boyu");
    expect(urunPencere.urunler["findik"]!.tur).toBe("mevsimli");
    const p = paket();
    p.urunPencere.urunler["zeytinyagi"] = structuredClone(p.urunPencere.urunler["et"]!);
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/zeytinyagi: islenmis \(A\) mal pencere almaz/);
  });
});

describe("Alfa-0 illeri (Kocaeli, Sakarya, Bursa) tamdır", () => {
  it("kapsam 'tam' yalnız Alfa-0 illeridir; diğer 78 il 'ozet' ve dogrulandi=false", () => {
    const { ilImza } = ilImzaVerisiniYukle();
    expect([...ALFA0_ILLERI]).toEqual(["tr_16", "tr_41", "tr_54"]);
    expect(ilImza.iller.filter((k) => k.kapsam === "tam").map((k) => k.il)).toEqual(["tr_16", "tr_41", "tr_54"]);
    const ozetler = ilImza.iller.filter((k) => k.kapsam === "ozet");
    expect(ozetler).toHaveLength(78);
    for (const k of ozetler) {
      for (const m of [...k.imza, ...k.aday]) expect(m.dogrulandi).toBe(false);
      for (const g of k.cografiIsaretler) expect(g.dogrulandi).toBe(false);
    }
  });

  it("Alfa-0: toplam 2-4 imza (kademeden bağımsız), hepsi +%10 ve kaynaklı; ilçe başına en çok 2 imza", () => {
    const idx = ilImzaIndeksi(ilImzaVerisiniYukle().ilImza);
    for (const kimlik of ALFA0_ILLERI) {
      const k = idx.get(kimlik)!;
      expect(k.imza.length).toBeGreaterThanOrEqual(2);
      expect(k.imza.length).toBeLessThanOrEqual(4);
      for (const m of k.imza) {
        expect(m.carpanPpm).toBe(1_100_000);
        expect(m.kaynak.length).toBeGreaterThan(0);
      }
      const ilce = new Map<string, number>();
      for (const m of k.imza) for (const c of m.ilceler ?? []) ilce.set(c, (ilce.get(c) ?? 0) + 1);
      for (const n of ilce.values()) expect(n).toBeLessThanOrEqual(2);
      expect(k.cografiIsaretler.length).toBeGreaterThan(0);
    }
  });

  it("tüm illerde imza en çok 4; adaylarda çarpan alanı yoktur ve imzayla çakışmaz", () => {
    const { ilImza } = ilImzaVerisiniYukle();
    for (const k of ilImza.iller) {
      expect(k.imza.length).toBeLessThanOrEqual(4);
      const imzaMallari = new Set(k.imza.map((m) => m.malId));
      for (const a of k.aday) {
        expect("carpanPpm" in a).toBe(false);
        expect(imzaMallari.has(a.malId)).toBe(false);
      }
    }
  });

  it("Alfa-0 imza ve aday listeleri (rapor §4.2'deki en güçlü kanıtlılar imza)", () => {
    const idx = ilImzaIndeksi(ilImzaVerisiniYukle().ilImza);
    const imza = (kimlik: string) => idx.get(kimlik)!.imza.map((m) => m.malId).sort();
    const aday = (kimlik: string) => idx.get(kimlik)!.aday.map((m) => m.malId).sort();
    expect(imza("tr_41")).toEqual(["arac", "hali", "kagit", "petrokimya"]);
    expect(aday("tr_41")).toEqual(["dokuma_zanaat", "findik", "sepet_hasir", "sut", "zeytin"]);
    expect(imza("tr_54")).toEqual(["arac", "findik", "misir"]);
    expect(aday("tr_54")).toEqual(["ceviz", "parca", "sut"]);
    expect(imza("tr_16")).toEqual(["arac", "koza", "mobilya", "zeytin"]);
    expect(aday("tr_16")).toEqual(["bicak_demir", "cini", "ipek_kumas", "kestane", "kumas", "parca", "seftali"]);
    const findik = idx.get("tr_54")!.imza.find((m) => m.malId === "findik")!;
    expect(findik.ilceler).toEqual(["tr_54_akyazi", "tr_54_hendek", "tr_54_karasu", "tr_54_kaynarca", "tr_54_kocaali"]);
  });

  it("yalnızca coğrafi işaret BAŞVURUSUna dayanan adaylar dogrulandi=false; başvuru kayıtları açıklamada belirtilir", () => {
    const idx = ilImzaIndeksi(ilImzaVerisiniYukle().ilImza);
    const aday = (il: string, mal: string) => idx.get(il)!.aday.find((m) => m.malId === mal)!;
    expect(aday("tr_41", "findik").dogrulandi).toBe(false);
    expect(aday("tr_41", "zeytin").dogrulandi).toBe(false);
    expect(aday("tr_54", "ceviz").dogrulandi).toBe(false);
    for (const k of idx.values()) {
      for (const g of k.cografiIsaretler.filter((x) => x.durum === "basvuru")) expect(g.aciklama ?? "", g.kimlik).toMatch(/Başvuru aşamasında/);
    }
  });

  it("Kocaeli otomotiv kaynağı zayıf turizm sitesi değil; OSD verisini aktaran haberlerdir", () => {
    const arac = ilImzaIndeksi(ilImzaVerisiniYukle().ilImza).get("tr_41")!.imza.find((m) => m.malId === "arac")!;
    expect(arac.kaynak.some((x) => x.includes("cometoturkey"))).toBe(false);
    expect(arac.kaynak.some((x) => x.includes("aa.com.tr"))).toBe(true);
    expect(arac.ilceler).toEqual(["tr_41_cayirova", "tr_41_golcuk", "tr_41_izmit"]);
  });

  it("coğrafi işaret sayıları: Bursa 29, Kocaeli 13 tescilli, Sakarya 10 tescilli", () => {
    const idx = ilImzaIndeksi(ilImzaVerisiniYukle().ilImza);
    const tescilli = (k: string) => idx.get(k)!.cografiIsaretler.filter((g) => g.durum === "tescilli").length;
    expect(tescilli("tr_16")).toBe(29);
    expect(tescilli("tr_41")).toBe(13);
    expect(tescilli("tr_54")).toBe(10);
    const bursa = idx.get("tr_16")!.cografiIsaretler;
    expect(bursa.find((g) => g.ad === "Gemlik Zeytini")).toMatchObject({ malId: "zeytin", tur: "mensei", yil: 2005 });
    expect(bursa.find((g) => g.ad === "Bursa Kestane Şekeri")).toMatchObject({ tur: "mahrec", yil: 2021 });
  });

  it("Alfa-0 illerinde en az bir yıl boyu etkin imza vardır", () => {
    const { ilImza, urunPencere } = ilImzaVerisiniYukle();
    for (const k of ilImza.iller.filter((x) => x.kapsam === "tam")) {
      expect(k.imza.some((m) => yilBoyuEtkinMi(m.malId, urunPencere))).toBe(true);
    }
  });

  it("dogrulandi=true olan her kayıt en az bir http(s) kaynağa dayanır", () => {
    const { ilImza } = ilImzaVerisiniYukle();
    for (const k of ilImza.iller) {
      for (const m of [...k.imza, ...k.cografiIsaretler]) {
        if (m.dogrulandi) expect(m.kaynak.some((x) => x.startsWith("http"))).toBe(true);
      }
    }
  });
});

describe("ürün pencere verisi", () => {
  it("HAM pencere: her ürünün 12 aylık toplamı tam 12 000 000; tamsayı; ay >= 0", () => {
    const { urunPencere } = ilImzaVerisiniYukle();
    expect(PENCERE_TOPLAM_PPM).toBe(12_000_000);
    const urunler = Object.entries(urunPencere.urunler);
    expect(urunler.length).toBeGreaterThanOrEqual(35);
    for (const [mal, p] of urunler) {
      expect(p.ppm, mal).toHaveLength(PENCERE_AY_SAYISI);
      expect(p.ppm.reduce((t, x) => t + x, 0), mal).toBe(12_000_000);
      for (const x of p.ppm) {
        expect(Number.isInteger(x)).toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("mevsimli ürünün en az bir ayı 0; yil_boyu ürünün tüm ayları > 0; yilBoyuEtkinMi türetilir", () => {
    const { urunPencere } = ilImzaVerisiniYukle();
    for (const [mal, p] of Object.entries(urunPencere.urunler)) {
      if (p.tur === "mevsimli") expect(p.ppm.includes(0), mal).toBe(true);
      else expect(Math.min(...p.ppm), mal).toBeGreaterThan(0);
      expect(yilBoyuEtkinMi(mal, urunPencere)).toBe(p.tur === "yil_boyu");
    }
    expect(yilBoyuEtkinMi("arac", urunPencere)).toBe(true); // penceresi olmayan mal
    expect(yilBoyuEtkinMi("findik", urunPencere)).toBe(false);
    expect(yilBoyuEtkinMi("sut", urunPencere)).toBe(true);
  });

  it("varsayilanYogunlukPpm 100 000-300 000 aralığında (öneri 200 000)", () => {
    const { urunPencere } = ilImzaVerisiniYukle();
    expect(urunPencere.varsayilanYogunlukPpm).toBe(YOGUNLUK_ONERILEN_PPM);
    expect(YOGUNLUK_ONERILEN_PPM).toBe(200_000);
    expect(urunPencere.varsayilanYogunlukPpm).toBeGreaterThanOrEqual(YOGUNLUK_ALT_PPM);
    expect(urunPencere.varsayilanYogunlukPpm).toBeLessThanOrEqual(YOGUNLUK_UST_PPM);
  });

  it("rapor §4.5 örnekleri birebir: fındık Ağu 7 / Eyl 5, zeytin Eki 3 Kas 4 Ara 3 Oca 2, kayısı Haz 6 Tem 6, çay May-Eki 2'şer", () => {
    const { urunPencere: p } = ilImzaVerisiniYukle();
    const M = 1_000_000;
    expect(p.urunler["findik"]!.ppm).toEqual([0, 0, 0, 0, 0, 0, 0, 7 * M, 5 * M, 0, 0, 0]);
    expect(p.urunler["zeytin"]!.ppm).toEqual([2 * M, 0, 0, 0, 0, 0, 0, 0, 0, 3 * M, 4 * M, 3 * M]);
    expect(p.urunler["kayisi"]!.ppm).toEqual([0, 0, 0, 0, 0, 6 * M, 6 * M, 0, 0, 0, 0, 0]);
    expect(p.urunler["yas_cay"]!.ppm).toEqual([0, 0, 0, 0, 2 * M, 2 * M, 2 * M, 2 * M, 2 * M, 2 * M, 0, 0]);
    expect(urunPencereAyPpm(p, "findik", 7)).toBe(7_000_000);
    expect(urunPencereAyPpm(p, "yok_mal", 3)).toBe(PENCERE_PPM);
    expect(() => urunPencereAyPpm(p, "findik", 12)).toThrow();
  });

  it("pencere anahtarları içerik.json ya da 'ileride' listesindedir; tarım (H) ürünlerinin hepsi pencerelidir", () => {
    const { ilImza, urunPencere } = ilImzaVerisiniYukle();
    const bilinen = new Set([...malKimlikleri(), ...ilImza.ileride.map((m) => m.malId)]);
    for (const mal of Object.keys(urunPencere.urunler)) expect(bilinen.has(mal)).toBe(true);
    for (const m of ilImza.ileride.filter((x) => x.tur === "H")) expect(urunPencere.urunler[m.malId], m.malId).toBeDefined();
  });
});

describe("urunProfiliPpm: profil = (PPM - y) + y x pencere / PPM", () => {
  const ham = () => ilImzaVerisiniYukle().urunPencere;

  it("her ürün ve y için toplam tam 12 000 000, her ay >= PPM - y, tamsayı", () => {
    const { urunler } = ham();
    for (const y of [0, 1, 100_000, 123_457, 200_000, 299_999, 300_000, 999_999, 1_000_000]) {
      for (const [mal, p] of Object.entries(urunler)) {
        const profil = urunProfiliPpm(p.ppm, y);
        expect(profil, `${mal} y=${y}`).toHaveLength(12);
        expect(profil.reduce((t, x) => t + x, 0), `${mal} y=${y}`).toBe(12_000_000);
        for (const x of profil) {
          expect(Number.isInteger(x)).toBe(true);
          expect(x).toBeGreaterThanOrEqual(PENCERE_PPM - y);
        }
      }
    }
  });

  it("y = 0 düz profil, y = PPM ham pencereyi verir", () => {
    for (const [mal, p] of Object.entries(ham().urunler)) {
      expect(urunProfiliPpm(p.ppm, 0), mal).toEqual(new Array<number>(12).fill(1_000_000));
      expect(urunProfiliPpm(p.ppm, 1_000_000), mal).toEqual(p.ppm);
    }
  });

  it("fındık y = 200 000: Ağustos 800 000 + 200 000 x 7 = 2 200 000, Eylül 1 800 000, hasat dışı 800 000", () => {
    const f = urunProfiliPpm(ham().urunler["findik"]!.ppm, 200_000);
    expect(f).toEqual([800_000, 800_000, 800_000, 800_000, 800_000, 800_000, 800_000, 2_200_000, 1_800_000, 800_000, 800_000, 800_000]);
    expect(Math.min(...f)).toBe(800_000);
  });

  it("aşağı yuvarlama kalanı en büyük pencere değerli aya eklenir", () => {
    // y = 1: ay payı floor(p / PPM); gerçek toplam 12, floor toplamı 2 + 9 = 11 -> kalan 1 en büyük aya (Aralık)
    const pencere = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2_500_000, 9_500_000];
    const profil = urunProfiliPpm(pencere, 1);
    expect(profil).toEqual([...new Array<number>(10).fill(999_999), 1_000_001, 1_000_009]);
    expect(profil.reduce((t, x) => t + x, 0)).toBe(12_000_000);
  });

  it("eşitlikte kalan küçük ay indeksine eklenir", () => {
    // 8 ay x 1 500 000: her pay floor = 1; gerçek 1,5 -> toplam eksik 4; tüm en büyükler eşit -> Ocak (indeks 0)
    const pencere = [...new Array<number>(8).fill(1_500_000), 0, 0, 0, 0];
    const profil = urunProfiliPpm(pencere, 1);
    expect(profil).toEqual([999_999 + 1 + 4, ...new Array<number>(7).fill(999_999 + 1), 999_999, 999_999, 999_999, 999_999]);
    expect(profil.reduce((t, x) => t + x, 0)).toBe(12_000_000);
    // eşit en büyükler Şubat ve Aralık: kalan Şubat'a (küçük indeks)
    const p2 = [0, 6_000_000, 0, 0, 0, 0, 0, 0, 0, 0, 0, 6_000_000];
    const e = urunProfiliPpm(p2, 123_457);
    expect(e.reduce((t, x) => t + x, 0)).toBe(12_000_000);
    const gercekTaban = (i: number) => 1_000_000 - 123_457 + Math.floor((123_457 * (p2[i] as number)) / 1_000_000);
    expect((e[1] as number) - gercekTaban(1)).toBeGreaterThanOrEqual(0);
    expect(e[11]).toBe(gercekTaban(11));
  });

  it("deterministik: aynı girdi aynı çıktı; girdi değişmez", () => {
    const p = [...ham().urunler["zeytin"]!.ppm];
    const kopya = [...p];
    expect(urunProfiliPpm(p, 150_000)).toEqual(urunProfiliPpm(p, 150_000));
    expect(p).toEqual(kopya);
  });

  it("sınır ve geçersiz girdiler hata verir", () => {
    const p = ham().urunler["findik"]!.ppm;
    expect(() => urunProfiliPpm(p, -1)).toThrow();
    expect(() => urunProfiliPpm(p, 1_000_001)).toThrow();
    expect(() => urunProfiliPpm(p, 0.5)).toThrow();
    expect(() => urunProfiliPpm(p.slice(1), 100_000)).toThrow();
    expect(() => urunProfiliPpm(p.map((x, i) => (i === 0 ? x + 1 : x)), 100_000)).toThrow();
    expect(() => urunProfiliPpm(p.map((x, i) => (i === 0 ? -1 : i === 7 ? x + 1 : x)), 100_000)).toThrow();
  });
});

describe("doğrulayıcı kötü girdiyi yakalar", () => {
  it("şema: bilinmeyen alan, ondalık sayı, geçersiz kaynak, eksik alan", () => {
    const p = paket();
    expect(IlImzaDosyaSema.safeParse({ ...p.ilImza, fazla: 1 }).success).toBe(false);
    const k = structuredClone(p.urunPencere);
    k.urunler["findik"]!.ppm[0] = 100_000.5;
    expect(UrunPencereDosyaSema.safeParse(k).success).toBe(false);
    const x = paket();
    il(x, "tr_41").imza[0]!.kaynak = ["not a url"];
    expect(hatalar(dogrula(x)).some((h) => h.includes("kaynak http(s)"))).toBe(true);
    const y = paket();
    delete (il(y, "tr_41").imza[0] as { planli?: boolean }).planli;
    expect(dogrula(y).gecerli).toBe(false);
    expect(dogrula({ ...paket(), ilImza: 5 }).gecerli).toBe(false);
  });

  it("bilinmeyen il, ilçe başka ile ait, il adı/ülke uyuşmazlığı", () => {
    let p = paket();
    il(p, "tr_41").il = "tr_99";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/tr_99: il hiyerarsi\.json'da yok/);
    p = paket();
    il(p, "tr_41").imza.find((m) => m.malId === "arac")!.ilceler = ["tr_54_arifiye"];
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/ilce tr_54_arifiye bu ilin ilcesi degil/);
    p = paket();
    il(p, "tr_41").ad = "Izmit";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/hiyerarsideki ad/);
    p = paket();
    il(p, "tr_41").ulke = "BG";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/hiyerarsideki ulke/);
  });

  it("eksik il kaydı ve Alfa-0 ilinin 'ozet' olması reddedilir", () => {
    let p = paket();
    p.ilImza.iller = p.ilImza.iller.filter((k) => k.il !== "tr_06");
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/tr_06 \(Ankara\) icin kayit yok/);
    p = paket();
    il(p, "tr_16").kapsam = "ozet";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/Alfa-0 ili kapsam "tam" olmali/);
  });

  it("mal kimliği bilinmiyor / planli tutarsız / ileride listesinde olmayan planlı mal", () => {
    let p = paket();
    il(p, "tr_41").imza.find((m) => m.malId === "arac")!.malId = "uydurma_mal";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/uydurma_mal: mal kimligi ne icerikte ne 'ileride'/);
    p = paket();
    il(p, "tr_41").imza.find((m) => m.malId === "arac")!.planli = false;
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/planli=false ama mal icerikte YOK/);
    p = paket();
    p.ilImza.ileride = p.ilImza.ileride.filter((m) => m.malId !== "arac");
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/planli mal 'ileride' listesinde olmali/);
  });

  it("mal içeriğe eklenince 'ileride' kaydı ve planli bayrağı güncellenmek zorundadır", () => {
    const p = paket();
    p.malKimlikleri = [...malKimlikleri(), "arac"];
    const h = hatalar(dogrula(p)).join("\n");
    expect(h).toMatch(/ileride\.arac: mal artik icerik\.json'da var/);
    expect(h).toMatch(/planli=true ama mal icerikte VAR/);
  });

  it("çarpan sınırları: +%10 üstü, 1,0 altı ve Alfa-0'da eksik çarpan", () => {
    let p = paket();
    il(p, "tr_16").imza[0]!.carpanPpm = IMZA_CARPAN_UST_PPM + 1;
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/carpanPpm .* araliginda olmali/);
    p = paket();
    il(p, "tr_16").imza[0]!.carpanPpm = 999_999;
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/carpanPpm .* araliginda olmali/);
    p = paket();
    il(p, "tr_16").imza[0]!.carpanPpm = 1_050_000;
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/tam kapsamda carpanPpm 1100000/);
  });

  it("imza sayısı (Alfa-0'da 2-4, her ilde en çok 4), ilçe başına en çok 2, aday/imza çakışması", () => {
    let p = paket();
    const k = il(p, "tr_41");
    k.imza = k.imza.filter((m) => m.malId === "arac");
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/tam kapsamda imza sayisi 2-4 olmali \(su an 1\)/);

    // 5. imza: adaydan imzaya terfi (carpan ekleyerek) -> en cok 4 kurali
    p = paket();
    const b = il(p, "tr_16");
    const adayKaydi = b.aday.find((m) => m.malId === "seftali")!;
    b.imza.push({ ...adayKaydi, carpanPpm: 1_100_000 });
    b.aday = b.aday.filter((m) => m.malId !== "seftali");
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/imza sayisi 5, en cok 4 olmali/);

    // ilce basina en cok 2: Sakarya adapazari'ni uc imzaya yay
    p = paket();
    const s = il(p, "tr_54");
    s.imza.find((m) => m.malId === "findik")!.ilceler = ["tr_54_adapazari", "tr_54_hendek"];
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/ilce tr_54_adapazari icin 3 imza var, en cok 2 olmali/);

    p = paket();
    il(p, "tr_41").aday.push({ ...il(p, "tr_41").aday[0]!, malId: "arac", kademe: "t1" });
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/ayni mal hem imza hem aday olamaz/);
  });

  it("adayda çarpan alanı şemada reddedilir", () => {
    const p = paket();
    (il(p, "tr_41").aday[0] as Record<string, unknown>)["carpanPpm"] = 1_100_000;
    expect(IlImzaDosyaSema.safeParse(p.ilImza).success).toBe(false);
  });

  it("yıl boyu etkin imza şartı", () => {
    const p = paket();
    const s = il(p, "tr_54");
    // Sakarya'nın mevsimsiz imzası (arac) çıkar; mısır ve fındık mevsimli kalır
    s.imza = s.imza.filter((m) => m.malId !== "arac");
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/yil boyu etkin imza yok/);
  });

  it("dogrulandi=true ama http(s) kaynak yok", () => {
    const p = paket();
    il(p, "tr_16").imza[0]!.kaynak = ["docs/arastirma/cesitlilik-uretim-katmanlari.md#4.3"];
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/dogrulandi=true icin en az bir http\(s\) kaynak/);
  });

  it("coğrafi işaret: yinelenen kimlik, yanlış önek, bilinmeyen mal", () => {
    let p = paket();
    il(p, "tr_16").cografiIsaretler[1]!.kimlik = il(p, "tr_16").cografiIsaretler[0]!.kimlik;
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/cografi isaret kimligi .* tekrar ediyor/);
    p = paket();
    il(p, "tr_16").cografiIsaretler[0]!.kimlik = "ci_tr_41_baska";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/kimlik "ci_tr_16_" ile baslamali/);
    p = paket();
    il(p, "tr_16").cografiIsaretler.find((g) => g.malId === "zeytin")!.malId = "uydurma_mal";
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/malId uydurma_mal ne icerikte/);
  });

  it("pencere: toplam, tur tutarlılığı, yoğunluk aralığı, bilinmeyen ürün", () => {
    const bilinen = new Set([...malKimlikleri(), ...ilImzaVerisiniYukle().ilImza.ileride.map((m) => m.malId)]);
    const taze = () => structuredClone(jsonOku(PENCERE)) as UrunPencereDosyasi;
    expect(dogrulaUrunPencere(taze(), bilinen)).toEqual({ gecerli: true });

    let d = taze();
    d.urunler["findik"]!.ppm[0] = d.urunler["findik"]!.ppm[0]! + 1;
    expect(hatalar(dogrulaUrunPencere(d, bilinen)).join("\n")).toMatch(/findik: ppm toplami 12000001/);

    d = taze();
    d.urunler["findik"]!.ppm[0] = -1;
    d.urunler["findik"]!.ppm[7] = d.urunler["findik"]!.ppm[7]! + 1;
    expect(dogrulaUrunPencere(d, bilinen).gecerli).toBe(false); // negatif

    d = taze();
    d.urunler["findik"]!.tur = "yil_boyu";
    expect(hatalar(dogrulaUrunPencere(d, bilinen)).join("\n")).toMatch(/findik: yil_boyu urunde tum aylar > 0 olmali/);

    d = taze();
    d.urunler["et"]!.tur = "mevsimli";
    expect(hatalar(dogrulaUrunPencere(d, bilinen)).join("\n")).toMatch(/et: mevsimli urunde en az bir ay 0 olmali/);

    for (const y of [99_999, 300_001, 0, 1_000_000]) {
      d = taze();
      d.varsayilanYogunlukPpm = y;
      expect(hatalar(dogrulaUrunPencere(d, bilinen)).join("\n"), String(y)).toMatch(/varsayilanYogunlukPpm .* araliginda olmali/);
    }
    for (const y of [100_000, 200_000, 300_000]) {
      d = taze();
      d.varsayilanYogunlukPpm = y;
      expect(dogrulaUrunPencere(d, bilinen)).toEqual({ gecerli: true });
    }
    d = taze();
    d.varsayilanYogunlukPpm = 200_000.5;
    expect(dogrulaUrunPencere(d, bilinen).gecerli).toBe(false);

    d = taze();
    d.urunler["uydurma_mal"] = d.urunler["et"]!;
    expect(hatalar(dogrulaUrunPencere(d, bilinen)).join("\n")).toMatch(/uydurma_mal: mal kimligi ne icerikte/);

    d = taze();
    d.urunler["findik"]!.ppm.pop();
    expect(dogrulaUrunPencere(d, bilinen).gecerli).toBe(false);
  });

  it("tarım (H) ürününün penceresi silinirse paket reddedilir", () => {
    const p = paket();
    // P3: findik içeriğe girdi (artık 'ileride' değil); hâlâ 'ileride' olan bir H ürünü (antep_fistigi) kullanılır.
    delete p.urunPencere.urunler["antep_fistigi"];
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/ileride\.antep_fistigi: tarim \(H\) urunu icin urun-pencere kaydi yok/);
  });
});

describe("deterministik ve kanonik biçim", () => {
  it("dosya metni kanonik biçimle birebir aynıdır (1 boşluk girinti, sonda yeni satır, şema anahtar sırası)", () => {
    const v = ilImzaVerisiniYukle();
    expect(metinOku(IL_IMZA)).toBe(kanonikMetin(v.ilImza));
    expect(metinOku(PENCERE)).toBe(kanonikMetin(v.urunPencere));
    expect(metinOku(IL_IMZA).endsWith("}\n")).toBe(true);
  });

  it("ayrıştırma idempotent: iki yükleme ve yeniden serileştirme aynı metni verir", () => {
    const a = kanonikMetin(ilImzaVerisiniYukle().ilImza);
    const b = kanonikMetin(ilImzaVerisiniYukle().ilImza);
    expect(a).toBe(b);
    expect(kanonikMetin(JSON.parse(a))).toBe(a);
  });

  it("kanonik sıra: iller, imza (kademe, malId), ileride, coğrafi işaret, ilçe ve kaynak dizileri sıralı", () => {
    const { ilImza, urunPencere } = ilImzaVerisiniYukle();
    const sirali = (d: readonly string[]) => [...d].sort((x, y) => (x < y ? -1 : x > y ? 1 : 0));
    const k = { t1: 0, t2: 1, t3a: 2 } as const;
    expect(ilImza.iller.map((x) => x.il)).toEqual(sirali(ilImza.iller.map((x) => x.il)));
    const kademeSirali = <T extends { malId: string; kademe: "t1" | "t2" | "t3a" }>(l: T[]) =>
      [...l].sort((a, b) => k[a.kademe] - k[b.kademe] || (a.malId < b.malId ? -1 : a.malId > b.malId ? 1 : 0));
    expect(ilImza.ileride).toEqual(kademeSirali(ilImza.ileride));
    for (const il of ilImza.iller) {
      expect(il.imza).toEqual(kademeSirali(il.imza));
      expect(il.aday).toEqual(kademeSirali(il.aday));
      expect(il.cografiIsaretler.map((g) => g.kimlik)).toEqual(sirali(il.cografiIsaretler.map((g) => g.kimlik)));
      for (const m of [...il.imza, ...il.aday, ...il.cografiIsaretler]) {
        expect(m.kaynak).toEqual(sirali(m.kaynak));
        if (m.ilceler !== undefined) expect(m.ilceler).toEqual(sirali(m.ilceler));
      }
    }
    expect(Object.keys(urunPencere.urunler)).toEqual(sirali(Object.keys(urunPencere.urunler)));
  });

  it("bozuk sıra doğrulayıcıda hata verir", () => {
    let p = paket();
    p.ilImza.iller.reverse();
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/il kimligine gore alfabetik sirali olmali/);
    p = paket();
    il(p, "tr_16").imza.reverse();
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/imza: kanonik sira/);
    p = paket();
    il(p, "tr_16").aday.reverse();
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/aday: kanonik sira/);
    p = paket();
    p.ilImza.ileride.reverse();
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/ileride: kanonik sira/);
    p = paket();
    const pk = p.urunPencere.urunler;
    p.urunPencere.urunler = Object.fromEntries(Object.entries(pk).reverse());
    expect(hatalar(dogrula(p)).join("\n")).toMatch(/anahtarlar alfabetik sirali olmali/);
  });

  it("içerik dosyası: 24 mal (eski 14 + P3'ün 10'u, sona eklenmiş); 'ileride' kimlikleri içeriğe sızmamış", () => {
    expect(malKimlikleri()).toHaveLength(24);
    expect(malKimlikleri().slice(0, 14)).toEqual(["tahil", "gida", "cevher", "komur", "celik", "bakir", "silis", "parca", "elektronik", "petrol", "yakit", "muhimmat", "gubre", "elektrik"]);
    const { ilImza } = ilImzaVerisiniYukle();
    const mevcut = new Set(malKimlikleri());
    for (const m of ilImza.ileride) expect(mevcut.has(m.malId), m.malId).toBe(false);
  });
});
