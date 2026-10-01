/**
 * G7-3 (sartname §7.7, §9.2-9.3, §16.2 `marka-sozdizimi`): `marka_tanimla`, `dukkan_marka`, `marka_sifirla`.
 *  - MRK-01…MRK-14 ret iletileri BİREBİR; reddedilen komut durumu değiştirmez;
 *  - ad kuralı tek kaynak (`adKanonik`): çekirdek günlükteki metni olduğu gibi alır, durumda KANONİK küçük harf biçimi saklar; "IŞIK" ve "ışık" aynı `durumOzeti`;
 *  - marka tanımlamamış oyuncu ve eski dünya aynı; marka çekimi/fiyatı/satışı etkilemez (markalı ve markasız dünya aynı gelir);
 *  - `marka_sifirla` yalnız sistem yolu: ad yer tutucuya, simge/renk/dükkân bağı değişmez.
 */
import { describe, expect, it } from "vitest";
import { AD_KURALI, adKanonik, adSozdizimiHatasi } from "../src/ad";
import { SISTEM_OYUNCUSU } from "../src/motor";
import { mulkOyuncuBul } from "../src/mulk";
import { ADSIZ_MARKA } from "../src/mulk/dukkanKomut";
import { GUN } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { dukkanlar } from "./perakende-yardimci";
import { dukkanliDunya, komutVeri, reddedilir } from "./perakende-komut-yardimci";
import { mulkSim, tamam, ver } from "./mulk-yardimci";

const marka = (marka: number, ad: string, simge = 0, renk = 0): Komut => ({ tur: "marka_tanimla", marka, ad, simge, renk });
const markalar = (s: ReturnType<typeof mulkSim>, o = "a") => mulkOyuncuBul(s.dunya, o)!.markalar;

describe("marka_tanimla: ad sözdizimi (MRK-03…MRK-08) ve kanonik biçim", () => {
  it("MRK-03…MRK-08 iletileri birebir; durum değişmez; marka hiç yazılmaz", () => {
    const s = mulkSim(["a"], komutVeri());
    expect(reddedilir(s, "a", marka(0, 123 as unknown as string), "marka adi metin olmali")).toBe("marka adi metin olmali");
    expect(reddedilir(s, "a", marka(0, "x"), "marka adi 2 ile 24 karakter arasinda olmali")).toBe("marka adi 2 ile 24 karakter arasinda olmali");
    expect(reddedilir(s, "a", marka(0, "a".repeat(25)), "marka adi 2 ile 24 karakter arasinda olmali")).toBe("marka adi 2 ile 24 karakter arasinda olmali");
    expect(reddedilir(s, "a", marka(0, "Firin@"), "marka adinda gecersiz karakter")).toBe("marka adinda gecersiz karakter");
    expect(reddedilir(s, "a", marka(0, "Fırın 😀"), "marka adinda gecersiz karakter")).toBe("marka adinda gecersiz karakter"); // emoji
    expect(reddedilir(s, "a", marka(0, "Fırın’s"), "marka adinda gecersiz karakter")).toBe("marka adinda gecersiz karakter"); // akıllı tırnak
    expect(reddedilir(s, "a", marka(0, "ékmek"), "marka adinda gecersiz karakter")).toBe("marka adinda gecersiz karakter"); // birleşen işaret
    expect(reddedilir(s, "a", marka(0, " Firin"), "marka adi bastan ya da sondan bosluk icermemeli")).toBe("marka adi bastan ya da sondan bosluk icermemeli");
    expect(reddedilir(s, "a", marka(0, "Firin "), "marka adi bastan ya da sondan bosluk icermemeli")).toBe("marka adi bastan ya da sondan bosluk icermemeli");
    expect(reddedilir(s, "a", marka(0, "Kose  Bakkal"), "marka adinda art arda bosluk olamaz")).toBe("marka adinda art arda bosluk olamaz");
    expect(reddedilir(s, "a", marka(0, "12 .'&-"), "marka adi en az bir harf icermeli")).toBe("marka adi en az bir harf icermeli");
    expect(markalar(s)).toBeUndefined();
  });

  it("izinli küme ve Türkçe harfler: her Türkçe harf tek karakter; sınırlar 2 ve 24 geçerli; `.'&-` ve rakam geçerli", () => {
    const s = mulkSim(["a"], komutVeri());
    expect(AD_KURALI.min).toBe(2);
    expect(AD_KURALI.max).toBe(24);
    for (const ad of ["ab", "a".repeat(24), "Çiğ Köfte & Sütçü", "Ali'nin Yeri-1", "A.Ş. 5", "İĞÜŞÖÇ ığüşöç"]) expect(adSozdizimiHatasi(ad), ad).toBeNull();
    for (const harf of ["ç", "ğ", "ı", "i", "ö", "ş", "ü", "İ"]) expect(harf.length).toBe(1);
    tamam(s, "a", marka(0, "Çiğ Köfte & Sütçü"));
    expect(markalar(s)).toEqual([{ ad: "çiğ köfte & sütçü", simge: 0, renk: 0 }]);
  });

  it("kanonik: \"İSTANBUL Fırını\" -> \"istanbul fırını\"; \"IŞIK\" -> \"ışık\"; \"ISIK\" -> \"ısık\"; idempotent; günlükteki metin girilen biçimdir", () => {
    const s = mulkSim(["a"], komutVeri());
    tamam(s, "a", marka(0, "İSTANBUL Fırını"));
    tamam(s, "a", marka(1, "IŞIK"));
    expect(markalar(s)!.map((m) => m.ad)).toEqual(["istanbul fırını", "ışık"]);
    expect(adKanonik("ISIK")).toEqual({ tamam: true, ad: "ısık" });
    const k = adKanonik("İSTANBUL Fırını");
    expect(k.tamam && adKanonik(k.ad)).toEqual(k);
    // günlük girilen metni olduğu gibi tutar (yeniden oynatma güvenli: çeviri saf ve sabit tablolu)
    expect(s.gunluk.filter((g) => g.komut.tur === "marka_tanimla").map((g) => (g.komut as { ad: string }).ad)).toEqual(["İSTANBUL Fırını", "IŞIK"]);
  });

  it("özet etkisi: \"IŞIK\" ve \"ışık\" ile tanımlanan marka AYNI durumOzeti'ni verir (günlük farklı, durum aynı); farklı ad farklı özet", () => {
    const a = mulkSim(["a"], komutVeri(), 3);
    const b = mulkSim(["a"], komutVeri(), 3);
    const c = mulkSim(["a"], komutVeri(), 3);
    tamam(a, "a", marka(0, "IŞIK", 2, 3));
    tamam(b, "a", marka(0, "ışık", 2, 3));
    tamam(c, "a", marka(0, "isik", 2, 3));
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    expect(a.durumOzeti()).not.toBe(c.durumOzeti());
  });

  it("marka tanımlamamış oyuncu: durum özeti marka komutu hiç verilmemiş dünyayla aynı (3 gün); eski dünya aynı", () => {
    const a = mulkSim(["a"], komutVeri(undefined, false), 5);
    const b = mulkSim(["a"], komutVeri(), 5);
    a.calistirKadar(3 * GUN);
    b.calistirKadar(3 * GUN);
    expect(b.durumOzeti()).toBe(a.durumOzeti());
    expect(markalar(b)).toBeUndefined();
  });
});

describe("marka_tanimla: sıra, sayı, simge, renk, tekrar (MRK-01, MRK-02, MRK-09, MRK-10, MRK-11)", () => {
  it("MRK-01 geçersiz sıra (boşluk bırakan, negatif, ondalık, dize); MRK-02 hesap başına sınır; üzerine yazma; MRK-11 aynı değer", () => {
    const s = mulkSim(["a"], komutVeri()); // hesapBasinaEnFazla = 2
    expect(reddedilir(s, "a", marka(1, "Firin"), "gecersiz marka sirasi: 1")).toBe("gecersiz marka sirasi: 1"); // boşluk bırakır (hiç marka yok)
    reddedilir(s, "a", marka(-1, "Firin"), "gecersiz marka sirasi: -1");
    reddedilir(s, "a", marka(0.5, "Firin"), "gecersiz marka sirasi: 0.5");
    reddedilir(s, "a", marka("0" as unknown as number, "Firin"), "gecersiz marka sirasi: 0");
    tamam(s, "a", marka(0, "Firin", 1, 1));
    expect(reddedilir(s, "a", marka(0, "FİRİN", 1, 1), "marka zaten bu degerlerde")).toBe("marka zaten bu degerlerde"); // kanonik ad aynı
    tamam(s, "a", marka(0, "Firin Iki", 1, 1)); // üzerine yazma
    expect(markalar(s)).toEqual([{ ad: "firin ıki", simge: 1, renk: 1 }]);
    tamam(s, "a", marka(1, "Bakkal", 0, 0));
    expect(reddedilir(s, "a", marka(2, "Uc"), "hesap basina en cok 2 marka")).toBe("hesap basina en cok 2 marka");
    reddedilir(s, "a", marka(3, "Uc"), "gecersiz marka sirasi: 3");
    expect(markalar(s)).toHaveLength(2);
  });

  it("MRK-09 simge ve MRK-10 renk aralığı (8 simge, 8 renk); MRK-04 uzunluk MRK-09'dan önce", () => {
    const s = mulkSim(["a"], komutVeri());
    expect(reddedilir(s, "a", marka(0, "Firin", 8, 0), "gecersiz marka simgesi: 8 (0..7)")).toBe("gecersiz marka simgesi: 8 (0..7)");
    reddedilir(s, "a", marka(0, "Firin", -1, 0), "gecersiz marka simgesi: -1 (0..7)");
    reddedilir(s, "a", marka(0, "Firin", 1.5, 0), "gecersiz marka simgesi: 1.5");
    expect(reddedilir(s, "a", marka(0, "Firin", 0, 8), "gecersiz marka rengi: 8 (0..7)")).toBe("gecersiz marka rengi: 8 (0..7)");
    reddedilir(s, "a", marka(0, "Firin", 0, -2), "gecersiz marka rengi: -2 (0..7)");
    expect(reddedilir(s, "a", marka(0, "x", 99, 0), "marka adi 2 ile 24 karakter arasinda olmali")).toBe("marka adi 2 ile 24 karakter arasinda olmali");
    tamam(s, "a", marka(0, "Firin", 7, 7)); // son geçerli değerler
  });

  it("markalar hesaba bağlıdır: başka oyuncunun markası ayrı; ilk marka mülk kaydını gerektirmeden yazılır", () => {
    const s = mulkSim(["a", "b"], komutVeri());
    tamam(s, "a", marka(0, "Firin A"));
    expect(markalar(s, "b")).toBeUndefined();
    tamam(s, "b", marka(0, "Firin B"));
    expect(markalar(s, "a")![0]!.ad).toBe("firin a");
    expect(markalar(s, "b")![0]!.ad).toBe("firin b");
  });
});

describe("dukkan_marka (MRK-13, MRK-14)", () => {
  it("dükkâna marka bağlanır; MRK-13 tanımsız marka; MRK-14 aynı marka; DUK-10 başkasının dükkânı; marka çekimi, fiyatı ve satışı ETKİLEMEZ (markalı ve markasız aynı gelir)", () => {
    const { s, dukkan } = dukkanliDunya(["a", "b"], komutVeri(), 4);
    const id = dukkan["a"]!.id;
    tamam(s, "a", { tur: "dukkan_raf", dukkan: id, yuva: 0, mal: "ekmek" });
    tamam(s, "b", { tur: "dukkan_raf", dukkan: dukkan["b"]!.id, yuva: 0, mal: "ekmek" });
    expect(reddedilir(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 0 }, "bilinmeyen marka: 0")).toBe("bilinmeyen marka: 0"); // marka yok
    tamam(s, "a", marka(0, "Firin A", 2, 3));
    reddedilir(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 1 }, "bilinmeyen marka: 1");
    reddedilir(s, "a", { tur: "dukkan_marka", dukkan: id, marka: -1 }, "bilinmeyen marka: -1");
    reddedilir(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 0.5 }, "bilinmeyen marka: 0.5");
    reddedilir(s, "b", { tur: "dukkan_marka", dukkan: id, marka: 0 }, `dukkan bulunamadi: ${id}`);
    reddedilir(s, "a", { tur: "dukkan_marka", dukkan: 424_242, marka: 0 }, "dukkan bulunamadi: 424242");
    const t0 = s.dunya.zaman;
    // karşılaştırma için markasız kopya dünya (aynı komutlar, marka bağı yok): marka çekimi etkilemez
    const markasiz = dukkanliDunya(["a", "b"], komutVeri(), 4);
    tamam(markasiz.s, "a", { tur: "dukkan_raf", dukkan: markasiz.dukkan["a"]!.id, yuva: 0, mal: "ekmek" });
    tamam(markasiz.s, "b", { tur: "dukkan_raf", dukkan: markasiz.dukkan["b"]!.id, yuva: 0, mal: "ekmek" });
    tamam(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 0 });
    expect(dukkanlar(s).find((x) => x.e.id === id)!.e.dukkan!.marka).toBe(0);
    expect(reddedilir(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 0 }, "dukkan zaten bu markada")).toBe("dukkan zaten bu markada");
    s.calistirKadar(t0 + 2 * GUN);
    markasiz.s.calistirKadar(t0 + 2 * GUN);
    const gelir = (x: typeof s, o: string): unknown => mulkOyuncuBul(x.dunya, o)!.dukkanGeliri;
    expect(gelir(s, "a")).toEqual(gelir(markasiz.s, "a"));
    expect(gelir(s, "b")).toEqual(gelir(markasiz.s, "b"));
    expect(gelir(s, "a")).toBeDefined(); // satış gerçekten oldu (ölçüt anlamlı)
    const yuva = (x: typeof s, o: string) => dukkanlar(x).find((d) => d.oyuncu === o)!.e.dukkan!.raf[0]!;
    expect(yuva(s, "a").satis).toEqual(yuva(markasiz.s, "a").satis);
  });
});

describe("marka_sifirla (moderasyon; yalnız sistem yolu)", () => {
  it("ad yer tutucuya döner; simge, renk ve dükkân bağı değişmez; yer tutucu kanoniktir ve ad kuralından geçer; marka yok MRK-13; bilinmeyen oyuncu; oyuncu yolu SIS-01", () => {
    const { s, dukkan } = dukkanliDunya(["a"], komutVeri());
    const id = dukkan["a"]!.id;
    tamam(s, "a", marka(0, "Kötü Ad", 4, 5));
    tamam(s, "a", { tur: "dukkan_marka", dukkan: id, marka: 0 });
    expect(adSozdizimiHatasi(ADSIZ_MARKA)).toBeNull();
    expect(adKanonik(ADSIZ_MARKA)).toEqual({ tamam: true, ad: ADSIZ_MARKA });
    const sistem = (k: Komut) => s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: k });
    expect(ver(s, "a", { tur: "marka_sifirla", oyuncu: "a", marka: 0 })).toEqual({ tamam: false, hata: "marka_sifirla yalnizca 'sistem' ile verilebilir" });
    expect(markalar(s)![0]!.ad).toBe("kötü ad"); // oyuncu yolu etkisiz
    const once = s.durumOzeti();
    expect(sistem({ tur: "marka_sifirla", oyuncu: "a", marka: 1 })).toEqual({ tamam: false, hata: "bilinmeyen marka: 1" });
    expect(sistem({ tur: "marka_sifirla", oyuncu: "a", marka: -1 })).toEqual({ tamam: false, hata: "bilinmeyen marka: -1" });
    expect(sistem({ tur: "marka_sifirla", oyuncu: "yok", marka: 0 })).toEqual({ tamam: false, hata: "bilinmeyen oyuncu: yok" });
    expect(s.durumOzeti()).toBe(once);
    expect(sistem({ tur: "marka_sifirla", oyuncu: "a", marka: 0 })).toEqual({ tamam: true });
    expect(markalar(s)).toEqual([{ ad: ADSIZ_MARKA, simge: 4, renk: 5 }]);
    expect(dukkanlar(s)[0]!.e.dukkan!.marka).toBe(0); // dükkân bağlantısı kalır
    // yeniden tanımlama mümkün (sıfırlanmış ad MRK-11'e takılmaz)
    tamam(s, "a", marka(0, "Yeni Ad", 4, 5));
    expect(markalar(s)![0]!.ad).toBe("yeni ad");
  });
});
