/** E-posta girişi birim testleri: adres ayrıştırma/normalleştirme, geçici alan listesi, belirteçler ve imza rotasyonu, posta bağdaştırıcıları, kip denetimi. */
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { AuthKimligi } from "../src/giris/auth-kimligi";
import { epostaCoz, epostaMaskele, geciciAlanMi, geciciAlanlariYukle } from "../src/giris/eposta";
import { oyuncuKimligiUret } from "../src/giris/hizmet";
import { Imzalayici, baglantiJetonuCoz, baglantiJetonuUret, biletCoz, biletUret, oturumBelirteciCoz, oturumBelirteciUret, ozet } from "../src/giris/jeton";
import { EN_KISA_URETIM_SIRRI, VARSAYILAN_BILET_SIRRI, kimlikKipiCoz } from "../src/giris/kip";
import type { KimlikKipiGirdisi } from "../src/giris/kip";
import { DosyaPostaGondericisi, KonsolPostaGondericisi, girisPostasi } from "../src/giris/posta";

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});

describe("e-posta ayristirma ve normallestirme", () => {
  it("kucuk harf, Gmail nokta ve +takma, diger alanlarda yalniz +takma; alan ve anahtar", () => {
    expect(epostaCoz("  Ali.Veli+Oyun@Gmail.COM ")).toEqual({ eposta: "ali.veli+oyun@gmail.com", anahtar: "aliveli@gmail.com", alan: "gmail.com" });
    expect(epostaCoz("a.l.i@googlemail.com")?.anahtar).toBe("ali@gmail.com");
    expect(epostaCoz("a.li+x@ornek.org")?.anahtar).toBe("a.li@ornek.org");
    expect(epostaCoz("ali@alt.ornek.org")).toMatchObject({ alan: "alt.ornek.org", anahtar: "ali@alt.ornek.org" });
    expect(epostaCoz("a_b-c'd@ornek.org")?.anahtar).toBe("a_b-c'd@ornek.org");
  });

  it("gecersiz bicimler: bosluk, cift @, nokta kurallari, uzunluk, alan etiketi, ASCII disi, satir sonu, bos yerel kisim", () => {
    for (const k of ["", "a", "a@", "@ornek.org", "a@@ornek.org", "a b@ornek.org", "a@ornek", "a@ornek.o", "a@-ornek.org", "a@ornek-.org", "a@ornek..org", ".a@ornek.org", "a.@ornek.org", "a..b@ornek.org",
      "a@ornek.org\r\nbcc:x@y.org", "a\n@ornek.org", "ç@ornek.org", "a@örnek.org", "a<script>@ornek.org", "+x@ornek.org", `${"a".repeat(65)}@ornek.org`, `a@${"b".repeat(64)}.org`, `${"a".repeat(250)}@o.org`, "a@1.2.3.4", "a@ornek.123"]) {
      expect(epostaCoz(k), JSON.stringify(k)).toBeNull();
    }
    expect(epostaCoz("a@ornek.org")).not.toBeNull();
    expect(epostaCoz("a@ornek.org\n")?.eposta).toBe("a@ornek.org"); // baştaki/sondaki boşluk ve satır sonu kırpılır (yapıştırma)
  });

  it("maske: ilk karakter + *** + alan; tam adres ya da yerel kisim yazilmaz", () => {
    expect(epostaMaskele("gizlikisi@ornek.org")).toBe("g***@ornek.org");
    expect(epostaMaskele("x")).toBe("***");
    expect(epostaMaskele("gizlikisi@ornek.org")).not.toContain("izlikisi");
  });
});

describe("gecici alan listesi (veri dosyasi)", () => {
  it("dosyadan yuklenir; alt alanlar ve buyuk harf kapsanir; olagan alanlar kapsanmaz; bozuk dosya reddedilir", async () => {
    const liste = geciciAlanlariYukle();
    expect(liste.size).toBeGreaterThan(100);
    for (const a of ["mailinator.com", "yopmail.com", "guerrillamail.com", "10minutemail.com", "temp-mail.org"]) expect(geciciAlanMi(a, liste), a).toBe(true);
    expect(geciciAlanMi("x.y.Mailinator.COM", liste)).toBe(true);
    for (const a of ["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "yandex.com", "ornek.org", "mailinator.com.tr", "notmailinator.com"]) expect(geciciAlanMi(a, liste), a).toBe(false);
    const d = await mkdtemp(join(tmpdir(), "bolge-gecici-"));
    dizinler.push(d);
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(d, "iyi.json"), JSON.stringify({ alanlar: [" Kotu.Example ", ""] }));
    expect([...geciciAlanlariYukle(join(d, "iyi.json"))]).toEqual(["kotu.example"]);
    await writeFile(join(d, "bozuk.json"), JSON.stringify({ alanlar: "yok" }));
    expect(() => geciciAlanlariYukle(join(d, "bozuk.json"))).toThrow(/gecersiz/);
  });
});

describe("belirtecler", () => {
  const imz = new Imzalayici(["bir-sir-0123456789abcdef"]);

  it("imza: amac basina alt anahtar (baglanti imzasi biletle gecmez); rotasyonda eski sir dogrular, yeni imzalar", () => {
    const s = imz.imzala("baglanti", "veri");
    expect(imz.dogrula("baglanti", "veri", s)).toBe(true);
    expect(imz.dogrula("bilet", "veri", s)).toBe(false);
    expect(imz.dogrula("baglanti", "veri2", s)).toBe(false);
    expect(imz.dogrula("baglanti", "veri", s.slice(0, -1))).toBe(false);
    const eski = new Imzalayici(["eski-sir-0123456789abcdef"]);
    const donusum = new Imzalayici(["yeni-sir-0123456789abcdef", "eski-sir-0123456789abcdef"]);
    expect(donusum.dogrula("baglanti", "veri", eski.imzala("baglanti", "veri"))).toBe(true);
    expect(eski.dogrula("baglanti", "veri", donusum.imzala("baglanti", "veri"))).toBe(false); // yeni imza eski sırrı olan sunucuda geçmez
    expect(() => new Imzalayici([])).toThrow();
    expect(() => new Imzalayici(["kisa"])).toThrow();
  });

  it("baglanti jetonu: en az 32 bayt rastgele, imzali, sureli; ozet jetonun SHA-256'si; her seferinde farkli", () => {
    const a = baglantiJetonuUret(imz, 10_000);
    const b = baglantiJetonuUret(imz, 10_000);
    expect(a.jeton).not.toBe(b.jeton);
    const [onek, rastgele, bitis] = a.jeton.split(".") as [string, string, string];
    expect(onek).toBe("bag1");
    expect(Buffer.from(rastgele, "base64url")).toHaveLength(32);
    expect(bitis).toBe("10000");
    expect(a.ozet).toBe(ozet(a.jeton));
    expect(a.ozet).toHaveLength(43);
    expect(a.ozet).not.toContain(rastgele);
    expect(baglantiJetonuCoz(imz, a.jeton, 9_999)).toEqual({ ozet: a.ozet, bitis: 10_000 });
    expect(baglantiJetonuCoz(imz, a.jeton, 10_000)).toBeNull(); // süre dolu (bitis <= şimdi)
    expect(baglantiJetonuCoz(imz, a.jeton.slice(0, -1), 0)).toBeNull();
    expect(baglantiJetonuCoz(new Imzalayici(["baska-sir-0123456789abcdef"]), a.jeton, 0)).toBeNull();
    for (const kotu of ["", "bag1", "bag1.a.b.c", `x${a.jeton}`, "bag2.a.1.b"]) expect(baglantiJetonuCoz(imz, kotu, 0)).toBeNull();
  });

  it("oturum belirteci: 12 + 32 bayt rastgele; yalniz gizlinin ozeti saklanir; biçim denetlenir", () => {
    const o = oturumBelirteciUret();
    const [onek, id, gizli] = o.belirtec.split(".") as [string, string, string];
    expect(onek).toBe("ot1");
    expect(Buffer.from(id, "base64url")).toHaveLength(12);
    expect(Buffer.from(gizli, "base64url")).toHaveLength(32);
    expect(o.id).toBe(id);
    expect(o.gizliOzet).toBe(ozet(gizli));
    expect(oturumBelirteciCoz(o.belirtec)).toEqual({ id, gizliOzet: o.gizliOzet });
    for (const kotu of [undefined, "", "ot1", `${o.belirtec}x`, o.belirtec.slice(0, -1), `ot2.${id}.${gizli}`, `ot1.${id}`, "x".repeat(200)]) expect(oturumBelirteciCoz(kotu)).toBeNull();
    expect(oturumBelirteciUret().belirtec).not.toBe(o.belirtec);
  });

  it("bilet: imzali yuk; jti her seferinde farkli; kurcalama ve biçim hatalari reddedilir", () => {
    const a = biletUret(imz, { hesap: "h", oyuncu: "o_abcdefgh", oturum: "oo", bitis: 5_000 });
    const b = biletUret(imz, { hesap: "h", oyuncu: "o_abcdefgh", oturum: "oo", bitis: 5_000 });
    expect(a.jti).not.toBe(b.jti);
    expect(biletCoz(imz, a.bilet)).toEqual({ hesap: "h", oyuncu: "o_abcdefgh", oturum: "oo", bitis: 5_000, jti: a.jti });
    expect(biletCoz(imz, a.bilet.slice(0, -2))).toBeNull();
    expect(biletCoz(new Imzalayici(["baska-sir-0123456789abcdef"]), a.bilet)).toBeNull();
    for (const kotu of ["", "bil1", "bil1.x", "bil1..", "bil2.a.b", "x".repeat(2000)]) expect(biletCoz(imz, kotu)).toBeNull();
    // Geçerli imzalı ama yük biçimi bozuk: reddedilir.
    const yuk = Buffer.from(JSON.stringify({ h: 1, o: "x", s: "y", e: "z", j: "k" })).toString("base64url");
    expect(biletCoz(imz, `bil1.${yuk}.${imz.imzala("bilet", yuk)}`)).toBeNull();
  });
});

describe("AuthKimligi (enjekte saat)", () => {
  it("sure siniri, tek kullanim (jti), iptal; iptal kaydi bilet omru + pay sonra temizlenir; asiri uzun omurlu bilet reddedilir", async () => {
    const imz = new Imzalayici(["bir-sir-0123456789abcdef"]);
    let t = 1_000_000;
    const k = new AuthKimligi({ imzalayici: imz, simdi: () => t, biletOmruMs: 60_000 });
    const yeni = (ek: Partial<{ oturum: string; bitis: number }> = {}) => biletUret(imz, { hesap: "h", oyuncu: "o_abcdefgh", oturum: ek.oturum ?? "s1", bitis: ek.bitis ?? t + 60_000 }).bilet;
    const b = yeni();
    expect((await k.dogrula(b))?.oturum).toBe("s1");
    expect(await k.dogrula(b)).toBeNull(); // tekrar
    expect(await k.dogrula(yeni({ bitis: t + 61_000 }))).not.toBeNull(); // 5 sn pay içinde
    expect(await k.dogrula(yeni({ bitis: t + 120_000 }))).toBeNull(); // ömür sınırını aşan: reddedilir
    expect(await k.dogrula(yeni({ bitis: t }))).toBeNull(); // süresi dolmuş
    const iptalOncesi = yeni({ oturum: "s2" });
    k.oturumlariIptalEt(["s2"]);
    expect(await k.dogrula(iptalOncesi)).toBeNull();
    expect(await k.dogrula(yeni({ oturum: "s2" }))).toBeNull();
    expect(await k.dogrula(yeni({ oturum: "s3" }))).not.toBeNull();
    // İptal kaydı 2 bilet ömrü sonra silinir (o oturumdan alınmış hiçbir bilet o zamana kadar geçerli kalamaz).
    t += 121_000;
    expect(await k.dogrula(yeni({ oturum: "s2" }))).not.toBeNull();
  });
});

describe("oyuncu kimligi", () => {
  it("opak, sunucu uretimli, biçim ^o_[0-9a-z]{8}$ (OYUNCU_KIMLIGI'ne uyar); yeterince rastgele", () => {
    const kume = new Set<string>();
    for (let i = 0; i < 2000; i++) kume.add(oyuncuKimligiUret());
    expect(kume.size).toBe(2000);
    for (const k of kume) expect(k).toMatch(/^o_[0-9a-hjkmnp-tv-z]{8}$/);
  });
});

describe("posta bagdastiricilari", () => {
  it("dosya: her posta ayri JSON dosyasi; sirali (ayni ms'de gonderim sirasi); yarim dosya birakmaz; gonderen sir tasimaz", async () => {
    const d = await mkdtemp(join(tmpdir(), "bolge-posta-birim-"));
    dizinler.push(d);
    const g = new DosyaPostaGondericisi(join(d, "alt", "dizin"), () => 42);
    for (let i = 0; i < 12; i++) await g.gonder(girisPostasi(`k${i}@ornek.org`, `http://x/giris/onay?j=jeton${i}`, 10, true));
    const dizin = join(d, "alt", "dizin");
    const adlar = (await readdir(dizin)).sort();
    expect(adlar).toHaveLength(12);
    expect(adlar.every((a) => a.endsWith(".json"))).toBe(true); // .tmp kalmadı
    const kimler = await Promise.all(adlar.map(async (a) => (JSON.parse(await readFile(join(dizin, a), "utf8")) as { kime: string }).kime));
    expect(kimler).toEqual(Array.from({ length: 12 }, (_, i) => `k${i}@ornek.org`));
  });

  it("konsol: satir basina bir JSON; posta metni Turkce, baglanti ve gecerlilik icerir; tarayici bagli notu", async () => {
    const satirlar: string[] = [];
    await new KonsolPostaGondericisi((s) => void satirlar.push(s)).gonder(girisPostasi("a@ornek.org", "http://x/giris/onay?j=t", 10, false));
    expect(satirlar).toHaveLength(1);
    expect(JSON.parse(satirlar[0] as string)).toMatchObject({ olay: "posta", kime: "a@ornek.org", baglanti: "http://x/giris/onay?j=t" });
    const p = girisPostasi("a@ornek.org", "http://x?j=t", 10, true);
    expect(p.metin).toContain("10 dakika");
    expect(p.metin).toContain("http://x?j=t");
    expect(p.metin).toContain("tarayıcıda açın");
    expect(girisPostasi("a@ornek.org", "http://x?j=t", 10, false).metin).not.toContain("tarayıcıda açın");
  });
});

describe("kimlik kipi ve uretim denetimleri", () => {
  const uretim = (ek: Partial<KimlikKipiGirdisi> = {}): KimlikKipiGirdisi => ({
    uretim: true,
    biletSirri: "uretim-icin-uzun-rastgele-bilet-sirri-0123456789",
    izinliKokenler: ["https://oyun.ornek.org"],
    genelUrl: "https://sunucu.ornek.org",
    tokenKomutu: false,
    gelistirmeSirriVerildi: false,
    ...ek,
  });
  const gelistirme = (ek: Partial<KimlikKipiGirdisi> = {}): KimlikKipiGirdisi => ({ uretim: false, izinliKokenler: [], tokenKomutu: false, gelistirmeSirriVerildi: false, ...ek });

  it("varsayilan: gelistirmede gelistirme kimligi (bugunku gibi); uretimde eposta", () => {
    expect(kimlikKipiCoz(gelistirme()).kip).toBe("gelistirme");
    expect(kimlikKipiCoz(uretim()).kip).toBe("eposta");
    expect(kimlikKipiCoz(gelistirme({ kimlik: "eposta" }))).toMatchObject({ kip: "eposta", sirlar: [VARSAYILAN_BILET_SIRRI], posta: "dosya" });
    expect(() => kimlikKipiCoz(gelistirme({ kimlik: "google" }))).toThrow(/bilinmeyen kimlik kipi/);
  });

  it("--uretim: gelistirme kimligi REDDEDILIR, --token kapali; gelistirme sirri verilse de kullanilmaz (uyari)", () => {
    expect(() => kimlikKipiCoz(uretim({ kimlik: "gelistirme" }))).toThrow(/gelistirme kimligi kapali/);
    expect(() => kimlikKipiCoz(uretim({ tokenKomutu: true }))).toThrow(/--token/);
    const s = kimlikKipiCoz(uretim({ gelistirmeSirriVerildi: true }));
    expect(s.kip).toBe("eposta");
    expect(s.uyarilar.join(" ")).toMatch(/GELISTIRME_SIRRI yok sayilir/);
    // Geliştirmede --token serbest.
    expect(() => kimlikKipiCoz(gelistirme({ tokenKomutu: true }))).not.toThrow();
  });

  it("--uretim: varsayilan/ornek ve kisa sirlar reddedilir; eski sir yeniden kullanilamaz; rotasyon iki sir verir", () => {
    expect(() => kimlikKipiCoz(uretim({ biletSirri: undefined } as unknown as Partial<KimlikKipiGirdisi>))).toThrow(/BOLGE_BILET_SIRRI acikca/);
    expect(() => kimlikKipiCoz(uretim({ biletSirri: "x".repeat(EN_KISA_URETIM_SIRRI - 1) }))).toThrow(/32 karakter/);
    for (const kotu of [VARSAYILAN_BILET_SIRRI, `degistir-${"x".repeat(40)}`, `gelistirme-${"x".repeat(40)}`]) expect(() => kimlikKipiCoz(uretim({ biletSirri: kotu })), kotu).toThrow(/varsayilan\/ornek/);
    const iyi = "y".repeat(40);
    expect(() => kimlikKipiCoz(uretim({ biletSirriEski: iyi, biletSirri: iyi }))).toThrow(/farkli/);
    expect(() => kimlikKipiCoz(uretim({ biletSirriEski: "kisa" }))).toThrow(/BOLGE_BILET_SIRRI_ESKI/);
    expect(kimlikKipiCoz(uretim({ biletSirriEski: "z".repeat(40) })).sirlar).toEqual([uretim().biletSirri, "z".repeat(40)]);
  });

  it("--uretim: konsol postacisi reddedilir (baglanti gunluge sizmasin), dosya kabul; Origin listesi, genel adres ve https zorunlu", () => {
    expect(() => kimlikKipiCoz(uretim({ posta: "konsol" }))).toThrow(/konsol postacisi kapali/);
    expect(kimlikKipiCoz(uretim({ posta: "dosya" })).posta).toBe("dosya");
    expect(() => kimlikKipiCoz(uretim({ izinliKokenler: [] }))).toThrow(/BOLGE_IZINLI_KOKENLER/);
    expect(() => kimlikKipiCoz(uretim({ genelUrl: undefined } as unknown as Partial<KimlikKipiGirdisi>))).toThrow(/BOLGE_GENEL_URL/);
    expect(() => kimlikKipiCoz(uretim({ genelUrl: "http://sunucu.ornek.org" }))).toThrow(/https/);
    expect(() => kimlikKipiCoz(uretim({ genelUrl: "bu bir url degil" }))).toThrow(/gecersiz/);
    expect(() => kimlikKipiCoz(uretim({ genelUrl: "http://127.0.0.1:8787" }))).not.toThrow(); // yerel prova
    expect(() => kimlikKipiCoz(uretim({ posta: "smtp" }))).toThrow(/bilinmeyen posta/);
    // Geliştirmede konsol serbest.
    expect(kimlikKipiCoz(gelistirme({ kimlik: "eposta", posta: "konsol" })).posta).toBe("konsol");
  });
});
