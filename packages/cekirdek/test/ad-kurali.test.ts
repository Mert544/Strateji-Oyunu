/**
 * Ad kuralı (cekirdek/src/ad.ts; marka adı ve görünen ad için TEK kaynak; şartname §7.7): sözdizimi (MRK-03...MRK-08), sabit tablolu küçük harf
 * kanonik biçimi, idempotans ve ortamdan bağımsızlık. Sunucu görünen ad ucu ve `marka_tanimla` aynı işlevleri çağırır (o testler ilgili dallarda).
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { AD_KURALI, adKanonik, adSozdizimiHatasi } from "../src/index";

const tamam = (ad: string): string => {
  const r = adKanonik(ad);
  if (!r.tamam) throw new Error(`beklenmeyen ret: ${r.hata}`);
  return r.ad;
};

describe("adSozdizimiHatasi: sözdizimi (düzeltme yok, ret iletisi MRK-03...MRK-08)", () => {
  it("geçerli adlar: uzunluk sınırları, Türkçe harfler, rakam ve noktalama, büyük harf ret değil", () => {
    for (const ad of ["ab", "A1", "İSTANBUL Fırını", "Şişli & Oğlu", "a.b-c'd", "x".repeat(24), "ÇĞİÖŞÜçğıöşü", "1a", "9. Sokak"]) expect(adSozdizimiHatasi(ad), ad).toBeNull();
  });

  it("MRK-03 metin değil", () => {
    for (const v of [undefined, null, 5, {}, ["ab"]]) expect(adSozdizimiHatasi(v)).toBe("marka adi metin olmali");
  });

  it("MRK-04 uzunluk: 2..24 (UTF-16 kod birimi)", () => {
    const m = "marka adi 2 ile 24 karakter arasinda olmali";
    expect(adSozdizimiHatasi("")).toBe(m);
    expect(adSozdizimiHatasi("a")).toBe(m);
    expect(adSozdizimiHatasi("x".repeat(25))).toBe(m);
    expect(adSozdizimiHatasi("x".repeat(24))).toBeNull();
    expect(adSozdizimiHatasi("xx")).toBeNull();
    // iletideki sayılar kuraldan gelir
    expect(m).toBe(`marka adi ${AD_KURALI.min} ile ${AD_KURALI.max} karakter arasinda olmali`);
  });

  it("MRK-05 izinli küme dışı: birleşen işaret, emoji, kontrol, akıllı ve çift tırnak, diğer noktalama, sekme/satır sonu", () => {
    const m = "marka adinda gecersiz karakter";
    for (const ad of ["abi̇", "ab\u{1F600}", "ab\u0000", "ab\n", "ab\t", "a’b", "a‘b", "a“b”", 'a"b', "a_b", "a/b", "a,b", "a@b", "a!b", "a b", "é1", "ab​"]) {
      expect(adSozdizimiHatasi(ad), JSON.stringify(ad)).toBe(m);
    }
  });

  it("MRK-06 baştan/sondan boşluk (yalnız U+0020; kırpma yok) ve MRK-07 art arda boşluk", () => {
    expect(adSozdizimiHatasi(" ab")).toBe("marka adi bastan ya da sondan bosluk icermemeli");
    expect(adSozdizimiHatasi("ab ")).toBe("marka adi bastan ya da sondan bosluk icermemeli");
    expect(adSozdizimiHatasi("a  b")).toBe("marka adinda art arda bosluk olamaz");
    expect(adSozdizimiHatasi("a b")).toBeNull();
  });

  it("MRK-08 en az bir harf", () => {
    for (const ad of ["12", "1.2", "- -", "&&"]) expect(adSozdizimiHatasi(ad), ad).toBe("marka adi en az bir harf icermeli");
    expect(adSozdizimiHatasi("1a")).toBeNull();
  });

  it("kontrol sırası: uzunluk, karakter, boşluk, harf (ilk ihlal bildirilir)", () => {
    expect(adSozdizimiHatasi(" ")).toBe("marka adi 2 ile 24 karakter arasinda olmali"); // tek boşluk: uzunluk önce
    expect(adSozdizimiHatasi("  ")).toBe("marka adi bastan ya da sondan bosluk icermemeli"); // iki boşluk: baş/son boşluk art arda boşluktan önce
    expect(adSozdizimiHatasi(" _")).toBe("marka adinda gecersiz karakter");
  });
});

describe("adKanonik: sabit tablolu küçük harf (yerel ayar yok)", () => {
  it("örnekler: İ -> i, I -> ı, Ş Ç Ğ Ö Ü", () => {
    expect(tamam("İSTANBUL Fırını")).toBe("istanbul fırını");
    expect(tamam("IŞIK")).toBe("ışık");
    expect(tamam("ISIK")).toBe("ısık");
    expect(tamam("ÇĞİÖŞÜ")).toBe("çğiöşü");
    expect(tamam("çğıöşü")).toBe("çğıöşü");
    expect(tamam("Ali & Veli - 2. Şube")).toBe("ali & veli - 2. şube");
  });

  it("A-Z'nin tamamı (iki parça; 24 sınırı) ve tablo dışı karakterler: tablo tam; rakam, boşluk ve .'&- aynen", () => {
    expect(tamam("ABCDEFGHIJKLM")).toBe("abcdefghıjklm");
    expect(tamam("NOPQRSTUVWXYZ")).toBe("nopqrstuvwxyz");
    expect(tamam("0123456789 a.b'c&d-e")).toBe("0123456789 a.b'c&d-e");
  });

  it("uzunluk korunur (bire bir BMP eşleme): çeviri sözdizimi sonucunu değiştirmez", () => {
    for (const ad of ["İİİİİİİİİİİİİİİİİİİİİİİİ", "IŞIK", "ab", "Çİ"]) expect(tamam(ad).length).toBe(ad.length);
    expect(adSozdizimiHatasi(tamam("İİİİİİİİİİİİİİİİİİİİİİİİ"))).toBeNull();
  });

  it("idempotans ve aynı girdi aynı çıktı", () => {
    for (const ad of ["İSTANBUL Fırını", "IŞIK", "Ali & Veli", "çğıöşü", "x".repeat(24)]) {
      const bir = tamam(ad);
      expect(tamam(ad)).toBe(bir);
      expect(tamam(bir)).toBe(bir);
    }
  });

  it("sözdizimi önce: geçersiz ad kanonikleştirilmez, aynı ret iletisi", () => {
    for (const ad of ["", "a", " ab", "a  b", "a_b", "12", "x".repeat(25)]) {
      const r = adKanonik(ad);
      expect(r.tamam).toBe(false);
      if (!r.tamam) expect(r.hata).toBe(adSozdizimiHatasi(ad));
    }
    expect(adKanonik(5).tamam).toBe(false);
  });

  it("çıktı her zaman kuralı sağlar ve büyük harf içermez (durum doğrulayıcı kanonik denetimi bunu kullanır)", () => {
    const harfler = "ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZabcçdefgğhıijklmnoöprsştuüvyz0123 .'&-";
    let n = 0;
    for (let i = 0; i < 4000; i++) {
      // tamsayı karmasıyla deterministik sahte ad
      let h = Math.imul(i + 1, 2654435761) >>> 0;
      let ad = "";
      const uz = 2 + (h % 23);
      for (let k = 0; k < uz; k++) {
        h = (Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) + k) >>> 0;
        ad += harfler[h % harfler.length];
      }
      const r = adKanonik(ad);
      if (!r.tamam) continue;
      n++;
      expect(adSozdizimiHatasi(r.ad)).toBeNull();
      expect(adKanonik(r.ad)).toEqual({ tamam: true, ad: r.ad });
      expect(/[A-ZÇĞİÖŞÜ]/.test(r.ad)).toBe(false);
    }
    expect(n).toBeGreaterThan(300);
  });
});

describe("ortamdan bağımsızlık", () => {
  it("ad.ts kaynağında yerel ayara bağlı küçük harf işlevlerinin adı geçmez (kaynak taraması)", () => {
    const kaynak = readFileSync(new URL("../src/ad.ts", import.meta.url), "utf8");
    expect(kaynak).not.toMatch(/toLowerCase/);
    expect(kaynak).not.toMatch(/toLocaleLowerCase/);
    expect(kaynak).not.toMatch(/toUpperCase|toLocaleUpperCase|localeCompare|normalize\(/);
  });

  it("sabit kural: min 2, max 24, küçük harf açık; izinli küme düzenli ifadesi şartnamedeki", () => {
    expect(AD_KURALI.min).toBe(2);
    expect(AD_KURALI.max).toBe(24);
    expect(AD_KURALI.kucukHarf).toBe(true);
    expect(AD_KURALI.izinli.source).toBe("^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$");
    expect(AD_KURALI.izinli.global).toBe(false);
  });
});
