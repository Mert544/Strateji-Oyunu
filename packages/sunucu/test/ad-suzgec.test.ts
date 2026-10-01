/**
 * Ortak yasaklı ad süzgeci (§7.7 madde 4/4a): katlama (büyük/küçük harf, aksan, ayırıcı), kelime eşitliği ve alt dizgi, geçici listeyle; dosya yok/bozuk
 * davranışı (üretimde açılış durur, geliştirmede uyarı + boş liste); liste içeriği ve yolu istemci/çekirdek/protokol kaynağında GEÇMEZ.
 */
import { mkdtemp, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { YasakliAdSuzgeci, adKatla, yasakliAdSuzgeciYukle } from "../src/ad-suzgec";

const gecici: string[] = [];
afterEach(async () => {
  for (const d of gecici.splice(0)) await rm(d, { recursive: true, force: true });
});
async function liste(icerik: unknown): Promise<string> {
  const d = await mkdtemp(join(tmpdir(), "bolge-yasakli-"));
  gecici.push(d);
  const yol = join(d, "yasakli-adlar.json");
  await writeFile(yol, typeof icerik === "string" ? icerik : JSON.stringify(icerik));
  return yol;
}

describe("katlama (sabit tablo, yerel ayar yok)", () => {
  it("A-Z, İ I ı i -> i, Ç ç -> c, Ğ ğ -> g, Ö ö -> o, Ş ş -> s, Ü ü -> u; ayırıcılar kalkar", () => {
    expect(adKatla("İıIi")).toBe("iiii");
    expect(adKatla("ÇçĞğÖöŞşÜü")).toBe("ccggoossuu");
    expect(adKatla("A B.C'D-E&F")).toBe("abcdef");
    expect(adKatla("Migros")).toBe("migros");
    expect(adKatla("a101")).toBe("a101");
  });
});

describe("süzgeç (geçici listeyle)", () => {
  const s = new YasakliAdSuzgeci(["bim", "a101", "şok", "Sok"], ["migros", "carrefour", "KÖFTECİ"]);

  it("kelime eşitliği: katlanmış, büyük/küçük harf ve aksan duyarsız; ayırıcıyla gizlenme yakalanır, kelime parçası yakalanmaz", () => {
    for (const ad of ["bim", "BİM", "Bim", "bım", "A101", "a-101", "şok", "ŞOK", "sok", "SOK", "benim bim", "bim market", "x.bim.y", "foo-şok-bar"]) expect(s.yasakliMi(ad), ad).toBe(true);
    // Ayırıcıyla gizlenen yasaklı kelime de yakalanır (bitişik kelime dizilerinin birleşimi).
    for (const ad of ["b i m", "b.i.m", "ali a 101", "ş-o-k"]) expect(s.yasakliMi(ad), ad).toBe(true);
    // Kelime eşitliğidir: başka kelimenin PARÇASI yasaklı DEĞİLDİR (alt dizgi yalnız içerik listesinde).
    for (const ad of ["bimbo", "kombim", "sokak", "ali", "a1010", "bi mart", "ali veli"]) expect(s.yasakliMi(ad), ad).toBe(false);
  });

  it("içerik listesi: katlanmış, ayırıcısız adın ALT DİZGİSİ; ayırıcıyla bölünmüş olsa da yakalar", () => {
    for (const ad of ["migros", "Migros Şubesi", "supermigros", "MIGROS", "mi-gros", "mı gros", "bizim Carrefour", "carre.four", "köfteci ali", "KOFTECI", "kofte ci"]) expect(s.yasakliMi(ad), ad).toBe(true);
    for (const ad of ["migro", "carefour", "ali veli", "kofte"]) expect(s.yasakliMi(ad), ad).toBe(false);
  });

  it("bos liste hicbir adi reddetmez; adetler listeyi sizdirmaz", () => {
    const bos = new YasakliAdSuzgeci([], []);
    expect(bos.yasakliMi("migros")).toBe(false);
    expect(s.adet).toEqual({ kelime: 3, icerik: 3 }); // 'şok' ve 'Sok' aynı katlanmış kelime
  });
});

describe("yükleme: yol parametre; dosya yok/bozuk", () => {
  it("geçerli dosya: süzgeç çalışır ve uyarı yok", async () => {
    const yol = await liste({ yasakliKelimeler: ["bim"], yasakliIcerik: ["migros"] });
    const r = yasakliAdSuzgeciYukle({ yol });
    expect(r.uyari).toBeNull();
    expect(r.suzgec.yasakliMi("BİM")).toBe(true);
    expect(r.suzgec.yasakliMi("Migros")).toBe(true);
    expect(yasakliAdSuzgeciYukle({ yol, uretim: true }).suzgec.yasakliMi("bim")).toBe(true);
  });

  it("dosya yok / JSON değil / biçim bozuk: ÜRETİMDE açılış durur; geliştirmede uyarı ve BOŞ liste; iletide liste içeriği yok", async () => {
    const d = await mkdtemp(join(tmpdir(), "bolge-yasakli-"));
    gecici.push(d);
    const yok = join(d, "yok.json");
    const bozuklar = [
      { yol: yok, deger: /dosya yok/ },
      { yol: await liste("{ json degil"), deger: /gecerli JSON degil/ },
      { yol: await liste({ yasakliKelimeler: "bim", yasakliIcerik: [] }), deger: /bicim gecersiz/ },
      { yol: await liste({ yasakliKelimeler: ["gizli-kelime"] }), deger: /bicim gecersiz/ },
      { yol: await liste([1, 2]), deger: /bicim gecersiz/ },
    ];
    for (const b of bozuklar) {
      expect(() => yasakliAdSuzgeciYukle({ yol: b.yol, uretim: true }), b.yol).toThrow(b.deger);
      const r = yasakliAdSuzgeciYukle({ yol: b.yol });
      expect(r.uyari).toMatch(b.deger);
      expect(r.uyari).toMatch(/BOS listeyle devam/);
      expect(r.uyari).not.toContain("gizli-kelime");
      expect(r.suzgec.yasakliMi("bim")).toBe(false);
    }
  });

  it("varsayılan yol packages/veri/icerik/yasakli-adlar.json: yoksa (T3 henüz yazmadı) geliştirmede uyarı + boş liste, üretimde hata; varsa geçerli biçimde", async () => {
    const varsayilan = fileURLToPath(new URL("../../veri/icerik/yasakli-adlar.json", import.meta.url));
    const var_ = await stat(varsayilan).then(() => true, () => false);
    if (var_) {
      const r = yasakliAdSuzgeciYukle({ uretim: true });
      expect(r.uyari).toBeNull();
      expect(r.suzgec.adet.kelime + r.suzgec.adet.icerik).toBeGreaterThan(0);
    } else {
      expect(yasakliAdSuzgeciYukle().uyari).toMatch(/dosya yok/);
      expect(() => yasakliAdSuzgeciYukle({ uretim: true })).toThrow(/uretimde acilis durur/);
    }
  });
});

describe("liste yalnız sunucuda: istemci, çekirdek ve protokol kaynağında geçmez", () => {
  it("packages/{istemci,cekirdek,protokol}/src altında 'yasakli-adlar' ya da liste dosyasına başvuru yok", async () => {
    const kok = fileURLToPath(new URL("../../", import.meta.url));
    async function tara(dizin: string): Promise<string[]> {
      const bulunan: string[] = [];
      for (const ad of await readdir(dizin, { withFileTypes: true }).catch(() => [])) {
        const yol = join(dizin, ad.name);
        if (ad.isDirectory()) bulunan.push(...(await tara(yol)));
        else if (/\.(ts|tsx|js|json|html)$/.test(ad.name) && /yasakli-adlar|yasakliKelimeler|yasakliIcerik/.test(await readFile(yol, "utf8"))) bulunan.push(yol);
      }
      return bulunan;
    }
    for (const p of ["istemci/src", "cekirdek/src", "protokol/src"]) expect(await tara(join(kok, p)), p).toEqual([]);
  });
});
