/**
 * Arsa ızgarası manifesti ve BHI1 yükleme (G3b): manifest biçimi, gz bayt/sha256 denetimi, ham bayt ve hücre sayıları (ikinci denetim), eksik dosya,
 * çerçeve uyuşmazlığı, il-bölge eşlemesi. Küçük sentetik BHI1 (tek dosya << 1 MB); kod çözücü arayüzün arkasındadır.
 */
import { readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { createHash } from "node:crypto";
import { afterEach, describe, expect, it, vi } from "vitest";
import { IzgaraHatasi, hiyerarsiCoz, hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiCoz, izgaraManifestiOku, izgaralariYukle, varsayilanIzgaraKoku } from "../src/izgara/manifest";
import { ILCELER, bhiBaytlari, izgaraDizini, sentetikDurum, testCozucusu } from "./izgara-yardimci";
import type { IzgaraDizini } from "./izgara-yardimci";

let d: IzgaraDizini | null = null;
afterEach(async () => {
  await d?.temizle();
  d = null;
});

const bag = () => testCozucusu;

describe("manifest biçimi", () => {
  it("geçerli manifest okunur; varsayılan kök manifestin ÜST dizinidir (odbl/)", async () => {
    d = await izgaraDizini();
    const m = izgaraManifestiOku(d.manifestYolu);
    expect(m.ilceler.map((c) => c.kimlik)).toEqual(["tr_16_gemlik", "tr_41_korfez"]);
    expect(m.ilceler[0]).toMatchObject({ il: "tr_16", bhi: { yol: "izgara/tr_16_gemlik.bhi.gz" }, cerceve: { x0: 600, y0: 400, genislik: 40, yukseklik: 30 } });
    expect(varsayilanIzgaraKoku(d.manifestYolu)).toBe(d.kok);
  });

  it("gerçek manifestin fazladan alanları (karo, seritler, osmIliski...) yok sayılır; eksik/bozuk alanlar, sırasızlık, yinelenen kimlik reddedilir", async () => {
    d = await izgaraDizini();
    const ham = JSON.parse(await readFile(d.manifestYolu, "utf8")) as Record<string, unknown> & { ilceler: Array<Record<string, unknown>> };
    expect(() => izgaraManifestiCoz({ ...ham, lisans: "ODbL-1.0", kaynak: {}, ilceler: ham.ilceler.map((c) => ({ ...c, osmIliski: 1, seritler: {}, karo: {} })) })).not.toThrow();
    const hata = (m: unknown): string => {
      try {
        izgaraManifestiCoz(m);
      } catch (e) {
        expect(e).toBeInstanceOf(IzgaraHatasi);
        return (e as Error).message;
      }
      throw new Error("hata bekleniyordu");
    };
    expect(hata(null)).toMatch(/nesne bekleniyordu/);
    expect(hata({ ...ham, surum: 2 })).toMatch(/surum 1 olmali/);
    expect(hata({ ...ham, hucreZ: 15 })).toMatch(/hucreZ 20/);
    expect(hata({ ...ham, ilceler: [] })).toMatch(/bos olmayan dizi/);
    const c0 = ham.ilceler[0] as Record<string, unknown>;
    expect(hata({ ...ham, ilceler: [{ ...c0, bhi: { ...(c0.bhi as object), sha256: "xyz" } }] })).toMatch(/ilceler\[0\]: bhi/);
    expect(hata({ ...ham, ilceler: [{ ...c0, bhi: undefined }] })).toMatch(/ilceler\[0\]: bhi/);
    expect(hata({ ...ham, ilceler: [{ ...c0, cerceve: { x0: 1, y0: 1, genislik: 0, yukseklik: 1 } }] })).toMatch(/cerceve/);
    expect(hata({ ...ham, ilceler: [{ ...c0, hucre: { icerde: 0, uygun: 0 } }] })).toMatch(/hucre/);
    expect(hata({ ...ham, ilceler: [{ ...c0, kimlik: "Buyuk Harf" }] })).toMatch(/kimlik gecersiz/);
    expect(hata({ ...ham, ilceler: [...ham.ilceler].reverse() })).toMatch(/sirali degil/);
    expect(hata({ ...ham, ilceler: [c0, c0] })).toMatch(/yinelenen kimlik/);
  });

  it("dosya yok ya da JSON değil: okunur hata", async () => {
    d = await izgaraDizini();
    expect(() => izgaraManifestiOku(join(d?.kok ?? "", "yok.json"))).toThrow(/izgara manifesti okunamadi/);
    await writeFile(join(d.kok, "bozuk.json"), "{ bu json degil");
    expect(() => izgaraManifestiOku(join(d?.kok ?? "", "bozuk.json"))).toThrow(/gecerli JSON degil/);
  });
});

describe("izgaralariYukle: gz bayt, sha256, ham bayt, çerçeve, hücre sayıları", () => {
  it("geçerli manifest: her ilçe çözülür; sayılar ve çerçeve manifestle aynı; durum düzlemi dosyadaki baytlar", async () => {
    d = await izgaraDizini();
    const y = izgaralariYukle(izgaraManifestiOku(d.manifestYolu), d.kok, bag);
    expect(y.map((x) => x.ilce.kimlik)).toEqual(["tr_16_gemlik", "tr_41_korfez"]);
    for (const [i, c] of ILCELER.entries()) {
      const ig = y[i]?.izgara;
      expect(ig).toMatchObject({ x0: c.x0, y0: c.y0, genislik: c.genislik, yukseklik: c.yukseklik });
      expect(Buffer.from(ig?.durum ?? [])).toEqual(Buffer.from(sentetikDurum(c.genislik, c.yukseklik, c.tohum)));
    }
  });

  const kos = (m: IzgaraDizini): unknown => izgaralariYukle(izgaraManifestiOku(m.manifestYolu), m.kok, bag);
  const yaz = (m: IzgaraDizini): Promise<void> => writeFile(m.manifestYolu, JSON.stringify(m.ham));
  const ilk = (m: IzgaraDizini): Record<string, Record<string, unknown>> => m.ham.ilceler[0] as Record<string, Record<string, unknown>>;

  it("eksik dosya: açılış okunur hatayla durur; kod çözücü hiç çağrılmaz", async () => {
    d = await izgaraDizini();
    await rm(join(d.kok, "izgara", "tr_41_korfez.bhi.gz"));
    const cagri = vi.fn(bag);
    expect(() => izgaralariYukle(izgaraManifestiOku(d?.manifestYolu ?? ""), d?.kok ?? "", cagri)).toThrow(/izgara dosyasi yok: tr_41_korfez \(izgara\/tr_41_korfez\.bhi\.gz/);
    expect(() => izgaralariYukle(izgaraManifestiOku(d?.manifestYolu ?? ""), d?.kok ?? "", cagri)).toThrow(IzgaraHatasi);
  });

  it("gz bayt sayısı uyuşmazlığı: sha256 bakılmadan reddedilir", async () => {
    d = await izgaraDizini();
    (ilk(d).bhi as Record<string, unknown>).bayt = (ilk(d).bhi?.bayt as number) + 1;
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/bayt sayisi uyusmuyor: tr_16_gemlik gz \d+ bayt, manifest \d+/);
  });

  it("sha256 uyuşmazlığı GZ baytları üzerinde: tek bit bozulma (aynı uzunluk) ve manifestteki yanlış özet reddedilir", async () => {
    d = await izgaraDizini();
    const yol = join(d.kok, "izgara", "tr_16_gemlik.bhi.gz");
    const gz = await readFile(yol);
    gz[gz.length - 9] = (gz[gz.length - 9] as number) ^ 1; // aynı uzunluk, tek bit
    await writeFile(yol, gz);
    expect(() => kos(d as IzgaraDizini)).toThrow(/sha256 uyusmuyor: tr_16_gemlik/);
    const ham2 = await izgaraDizini();
    await d.temizle();
    d = ham2;
    (ilk(d).bhi as Record<string, unknown>).sha256 = "0".repeat(64);
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/sha256 uyusmuyor/);
  });

  it("gzip olmayan (ama manifestle bayt ve sha256 tutarlı) dosya: gzip açılamadı", async () => {
    d = await izgaraDizini();
    const cop = Buffer.from("bu bir gzip degil, ama boyutu ve ozeti manifestte yazili");
    await writeFile(join(d.kok, "izgara", "tr_16_gemlik.bhi.gz"), cop);
    ilk(d).bhi = { yol: "izgara/tr_16_gemlik.bhi.gz", bayt: cop.length, sha256: createHash("sha256").update(cop).digest("hex"), hamBayt: 10 };
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/gzip acilamadi: tr_16_gemlik/);
  });

  it("açılmış bayt (hamBayt) ikinci denetimi", async () => {
    d = await izgaraDizini();
    (ilk(d).bhi as Record<string, unknown>).hamBayt = (ilk(d).bhi?.hamBayt as number) - 1;
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/acilmis bayt sayisi uyusmuyor: tr_16_gemlik \d+ bayt, manifest hamBayt \d+/);
  });

  it("BHI1 olmayan içerik (sha, bayt ve hamBayt tutarlı): çözülemedi; çerçeve uyuşmazlığı; hücre sayısı (içerde ve uygun) uyuşmazlığı", async () => {
    d = await izgaraDizini();
    const raw = Buffer.from("XXXX".padEnd(64, "x"));
    const gz = gzipSync(raw);
    await writeFile(join(d.kok, "izgara", "tr_16_gemlik.bhi.gz"), gz);
    ilk(d).bhi = { yol: "izgara/tr_16_gemlik.bhi.gz", bayt: gz.length, sha256: createHash("sha256").update(gz).digest("hex"), hamBayt: raw.length };
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/BHI1 cozulemedi: tr_16_gemlik: BHI1 degil/);

    const e = await izgaraDizini();
    await d.temizle();
    d = e;
    ilk(d).cerceve = { x0: 601, y0: 400, genislik: 40, yukseklik: 30 };
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/cercevesi uyusmuyor: tr_16_gemlik/);

    const f = await izgaraDizini();
    await d.temizle();
    d = f;
    (ilk(d).hucre as Record<string, unknown>).uygun = (ilk(d).hucre?.uygun as number) + 1;
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/hucre sayilari uyusmuyor: tr_16_gemlik/);
    const g = await izgaraDizini();
    await d.temizle();
    d = g;
    (ilk(d).hucre as Record<string, unknown>).icerde = (ilk(d).hucre?.icerde as number) - 1;
    await yaz(d);
    expect(() => kos(d as IzgaraDizini)).toThrow(/hucre sayilari uyusmuyor/);
  });

  it("ilk uyuşmazlıkta durur: sonraki ilçelerin dosyaları okunmaz; çözücü bağımlılığı tembel (denetimlerden önce istenmez)", async () => {
    d = await izgaraDizini();
    (ilk(d).bhi as Record<string, unknown>).sha256 = "1".repeat(64);
    await yaz(d);
    const cagri = vi.fn(bag);
    expect(() => izgaralariYukle(izgaraManifestiOku(d?.manifestYolu ?? ""), d?.kok ?? "", cagri)).toThrow(/sha256/);
    expect(cagri).not.toHaveBeenCalled();
  });
});

/** `hiyerarsi.json` yapısı (O3 veri hattı çıktısı; fazladan alanlar gerçek dosyadaki gibi var). */
const HIYERARSI = {
  surum: 1,
  bolgeler: [
    { kimlik: "kuzey", ad: "Kuzey", devlet: "x", iller: [{ kimlik: "tr_16", ad: "Bursa", ebeveyn: "kuzey", ilceler: [{ kimlik: "tr_16_gemlik", ad: "Gemlik", ebeveyn: "tr_16", osm: 1 }, { kimlik: "tr_16_orhangazi", ad: "Orhangazi" }] }] },
    { kimlik: "guney", ad: "Guney", iller: [{ kimlik: "tr_41", ad: "Kocaeli", ilceler: [{ kimlik: "tr_41_korfez", ad: "Körfez" }] }] },
  ],
};

describe("çekirdek girdisi: il, bölge ve adlar hiyerarşiden", () => {
  it("ilçeler manifest sırasıyla, iller ilk görülme sırasıyla; il/bölge/ilçe/il adları hiyerarşiden; tohum sabit", async () => {
    d = await izgaraDizini();
    const y = izgaralariYukle(izgaraManifestiOku(d.manifestYolu), d.kok, bag);
    const g = izgaraGirdisiKur(y, { ad: "izgara-manifest", harita: "mini-6", hiyerarsi: hiyerarsiCoz(HIYERARSI), haritaBolgeleri: new Set(["kuzey", "guney", "baska"]) });
    expect(g.iller).toEqual([{ id: "tr_16", ad: "Bursa", bolge: "kuzey" }, { id: "tr_41", ad: "Kocaeli", bolge: "guney" }]);
    expect(g.ilceler.map((c) => [c.id, c.ad, c.il, c.bolge])).toEqual([["tr_16_gemlik", "Gemlik", "tr_16", "kuzey"], ["tr_41_korfez", "Körfez", "tr_41", "guney"]]);
    expect(g.ilceler[0]?.izgara).toBe(y[0]?.izgara);
    expect(g.tohum).toBe(1);
  });

  it("ilçe hiyerarşide yok, ilçenin ili manifestle uyuşmuyor ya da bölge haritada yok: açılış okunur hatayla durur", async () => {
    d = await izgaraDizini();
    const y = izgaralariYukle(izgaraManifestiOku(d.manifestYolu), d.kok, bag);
    const kur = (h: unknown, bolgeler: string[]) => izgaraGirdisiKur(y, { ad: "x", harita: "mini-6", hiyerarsi: hiyerarsiCoz(h), haritaBolgeleri: new Set(bolgeler) });
    const eksik = { bolgeler: [HIYERARSI.bolgeler[0]] };
    expect(() => kur(eksik, ["kuzey"])).toThrow(/ilce hiyerarsi dosyasinda yok: tr_41_korfez/);
    expect(() => kur(HIYERARSI, ["kuzey"])).toThrow(/ilcenin bolgesi haritada yok: tr_41_korfez -> bolge guney \(harita mini-6\)/);
    const yanlisIl = { bolgeler: [{ kimlik: "kuzey", iller: [{ kimlik: "tr_99", ad: "X", ilceler: [{ kimlik: "tr_16_gemlik", ad: "G" }, { kimlik: "tr_41_korfez", ad: "K" }] }] }] };
    expect(() => kur(yanlisIl, ["kuzey"])).toThrow(/ilinin hiyerarsiyle uyusmuyor: tr_16_gemlik manifest tr_16, hiyerarsi tr_99/);
    expect(() => kur(HIYERARSI, [])).toThrow(IzgaraHatasi);
  });

  it("hiyerarşi biçimi ve dosya okuma: bozuk yapı, eksik dosya, geçerli dosya", async () => {
    for (const kotu of [null, {}, { bolgeler: [{}] }, { bolgeler: [{ kimlik: "b", iller: [{ kimlik: "i" }] }] }, { bolgeler: [{ kimlik: "b", iller: [{ kimlik: "i", ad: "I", ilceler: [{ kimlik: 1 }] }] }] }]) {
      expect(() => hiyerarsiCoz(kotu), JSON.stringify(kotu)).toThrow(/hiyerarsi gecersiz/);
    }
    expect(hiyerarsiCoz(HIYERARSI).get("tr_16_orhangazi")).toEqual({ ilceAd: "Orhangazi", il: "tr_16", ilAd: "Bursa", bolge: "kuzey" });
    d = await izgaraDizini();
    expect(() => hiyerarsiOku(join(d?.kok ?? "", "yok.json"))).toThrow(/hiyerarsi okunamadi/);
    await writeFile(join(d.kok, "hiyerarsi.json"), JSON.stringify(HIYERARSI));
    expect(hiyerarsiOku(join(d.kok, "hiyerarsi.json")).size).toBe(3);
  });

  it("test yardımcısı: sentetik BHI1 küçük (tek dosya < 1 MB) ve deterministik", () => {
    const a = bhiBaytlari(1, 2, 40, 30, sentetikDurum(40, 30, 3));
    const b = bhiBaytlari(1, 2, 40, 30, sentetikDurum(40, 30, 3));
    expect(Buffer.from(a)).toEqual(Buffer.from(b));
    expect(a.length).toBeLessThan(1_000_000);
  });
});
