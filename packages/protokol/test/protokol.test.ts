/** Protokol: mesaj şemaları (kabul/ret, alan atma) ve ilgi alanı karesi (süzgeç, özel veri, formül, delta). */
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { AD_KURALI, MILI, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikMiktar } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import {
  DEFTER_ODUL_SIRASI,
  DONUS_SABLON,
  DefterSemasi,
  DonusOzetiSemasi,
  IlgiKaresiSemasi,
  KomutSemasi,
  PROTOKOL_SURUMU,
  defterSablonu,
  deltaBosMu,
  deltaUygula,
  ilgiAlaniKur,
  ilgiKaresiCikar,
  istemciMesajiCoz,
  kareFarki,
  stokAraDeger,
  sunucuMesajiCoz,
} from "../src/index";
import type { SunucuMesaji } from "../src/index";

const HER_KOMUT: Komut[] = [
  { tur: "tesis_insa", bolge: "b", tesisTuru: "ciftlik" },
  { tur: "yontem_degistir", bolge: "b", tesis: 1, yontem: "y" },
  { tur: "tesis_durum", bolge: "b", tesis: 1, aktif: false },
  { tur: "ticaret_emri", bolge: "b", mal: "m", yon: "ithalat", oranSaat: 10 },
  { tur: "vergi_ayarla", oranPpm: 5 },
  { tur: "ekim_plani", bolge: "b", ekimPpm: [1, 2, 3] },
  { tur: "gubre_dozu", bolge: "b", doz: 2 },
  { tur: "tesis_olcek_yukselt", bolge: "b", tesis: 1, olcek: 2 },
  { tur: "genel_onarim", bolge: "b" },
  { tur: "bakim_duzeyi", duzey: 0 },
  { tur: "arama_sondaji", bolge: "b", mal: "m" },
  { tur: "kenar_gelistir", kenar: 3 },
  { tur: "askeri_rezerv", oranPpm: 7 },
  { tur: "birlik_uret", bolge: "b", birlik: "piyade", adet: 2 },
  { tur: "savas_ilan", saldiranBolge: "a", hedefBolge: "b" },
  { tur: "savunma_emri", bolge: "b", durus: "geri_cekil" },
  { tur: "arastir", teknoloji: "t" },
  { tur: "anlasma_teklif", karsi: "o", anlasma: "ticaret" },
  { tur: "anlasma_feshet", karsi: "o", anlasma: "ortak_altyapi" },
  { tur: "yaptirim", hedef: "o", aktif: true },
  { tur: "oyuncu_katil", oyuncu: "o", bolgeler: ["a", "b"] },
  { tur: "sistem_odul", oyuncu: "o", kavram: "ilk_hasat" },
];

describe("mesaj semalari", () => {
  it("her komut turu kabul edilir ve aynen doner", () => {
    for (const k of HER_KOMUT) expect(KomutSemasi.parse(k)).toEqual(k);
  });

  it("insa komutlarinda istege bagli yontem (yalniz ekleme): yontemli ve yontemsiz komut gecer; eski komut aynen; dize olmayan reddedilir", () => {
    const temel = { tesis_insa_hucre: { tur: "tesis_insa_hucre", ilce: "tr_41_gebze", tesisTuru: "gida_fabrikasi", hucreler: ["1:1", "2:1"] }, yapi_yerlestir: { tur: "yapi_yerlestir", ilce: "tr_41_gebze", tesisTuru: "gida_fabrikasi", hucreler: ["1:1", "2:1"], sinif: "kirsal" } };
    for (const [tur, govde] of Object.entries(temel)) {
      // (b) geriye uyum: yontemsiz eski komut aynen kabul edilir ve aynen doner (alan eklenmez).
      expect(KomutSemasi.parse(govde), tur).toEqual(govde);
      expect("yontem" in KomutSemasi.parse(govde), tur).toBe(false);
      // (a) yontemli komut aynen kabul edilir (olcek ile birlikte de).
      expect(KomutSemasi.parse({ ...govde, yontem: "degirmen" }), tur).toEqual({ ...govde, yontem: "degirmen" });
      expect(KomutSemasi.parse({ ...govde, olcek: 1, yontem: "ekmek_firini" }), tur).toEqual({ ...govde, olcek: 1, yontem: "ekmek_firini" });
      // (c) dize olmayan, bos ya da cok uzun deger reddedilir.
      for (const kotu of [123, null, true, {}, ["degirmen"], "", "x".repeat(65)]) expect(KomutSemasi.safeParse({ ...govde, yontem: kotu }).success, `${tur} yontem=${JSON.stringify(kotu)}`).toBe(false);
      // Ws zarfinda da gecer.
      const z = istemciMesajiCoz(JSON.stringify({ tur: "komut", anahtar: "k1", komut: { ...govde, yontem: "degirmen" } }));
      expect(z.tamam && z.mesaj.tur === "komut" && (z.mesaj.komut as { yontem?: string }).yontem).toBe("degirmen");
    }
    // Baska komutlara yontem eklenmez: fazla alan atilir (mevcut kural).
    expect("yontem" in KomutSemasi.parse({ tur: "parsel_al", ilce: "i", hucreler: ["1:1"], sinif: "kirsal", yontem: "degirmen" })).toBe(false);
  });

  it("perakende komutlari (G7; yalniz ekleme): biçim kabul/ret; ad 2..24 = AD_KURALI; dukkanTuru istege bagli; marka_sifirla; tutar/oran/adet alani yok", () => {
    const yeniler: Komut[] = [
      { tur: "dukkan_raf", dukkan: 7, yuva: 0, mal: "ekmek" },
      { tur: "dukkan_raf", dukkan: 7, yuva: 1, mal: null },
      { tur: "dukkan_fiyat", dukkan: 7, yuva: 0, fiyat: 2 },
      { tur: "marka_tanimla", marka: 0, ad: "Istanbul Firini", simge: 1, renk: 2 },
      { tur: "dukkan_marka", dukkan: 7, marka: 0 },
      { tur: "dukkan_yik", dukkan: 7 },
      { tur: "marka_sifirla", oyuncu: "p1", marka: 0 },
    ];
    for (const k of yeniler) expect(KomutSemasi.parse(k), k.tur).toEqual(k);
    // ad sinirlari cekirdek AD_KURALI ile ayni (protokol cekirdegi calisma zamaninda ice aktarmaz: esitlik burada baglanir)
    const ad = (n: number): unknown => ({ tur: "marka_tanimla", marka: 0, ad: "a".repeat(n), simge: 0, renk: 0 });
    expect(KomutSemasi.safeParse(ad(AD_KURALI.min - 1)).success).toBe(false);
    expect(KomutSemasi.safeParse(ad(AD_KURALI.min)).success).toBe(true);
    expect(KomutSemasi.safeParse(ad(AD_KURALI.max)).success).toBe(true);
    expect(KomutSemasi.safeParse(ad(AD_KURALI.max + 1)).success).toBe(false);
    // bicim hatalari
    for (const kotu of [
      { tur: "dukkan_raf", dukkan: 1.5, yuva: 0, mal: "ekmek" },
      { tur: "dukkan_raf", dukkan: 1, yuva: 0, mal: 5 },
      { tur: "dukkan_raf", dukkan: 1, yuva: 0 },
      { tur: "dukkan_fiyat", dukkan: 1, yuva: 0, fiyat: "2" },
      { tur: "marka_tanimla", marka: 0, ad: 5, simge: 0, renk: 0 },
      { tur: "dukkan_yik", dukkan: "7" },
      { tur: "marka_sifirla", oyuncu: "", marka: 0 },
    ]) expect(KomutSemasi.safeParse(kotu).success, JSON.stringify(kotu)).toBe(false);
    // inşa komutlarinda dukkanTuru istege bagli (yontem ile birlikte da); geriye uyum: alan olmadan ayni
    const govde = { tur: "yapi_yerlestir", ilce: "i", tesisTuru: "dukkan", hucreler: ["1:1"], sinif: "kirsal" };
    expect(KomutSemasi.parse(govde)).toEqual(govde);
    expect("dukkanTuru" in KomutSemasi.parse(govde)).toBe(false);
    expect(KomutSemasi.parse({ ...govde, dukkanTuru: "bakkal" })).toEqual({ ...govde, dukkanTuru: "bakkal" });
    expect(KomutSemasi.safeParse({ ...govde, dukkanTuru: 5 }).success).toBe(false);
    const z = istemciMesajiCoz(JSON.stringify({ tur: "komut", anahtar: "k9", komut: { tur: "dukkan_fiyat", dukkan: 3, yuva: 0, fiyat: 1 } }));
    expect(z.tamam && z.mesaj.tur === "komut" && (z.mesaj.komut as { tur: string }).tur).toBe("dukkan_fiyat");
    // dukkanTuru baska komutlara eklenmez (fazla alan atilir)
    expect("dukkanTuru" in KomutSemasi.parse({ tur: "parsel_al", ilce: "i", hucreler: ["1:1"], sinif: "kirsal", dukkanTuru: "bakkal" })).toBe(false);
  });

  it("hata kodlari: marka adi reddi ad_gecersiz / ad_yasakli (/giris/ad ile ayni dizgeler) komuta bagli hata mesajinda gecer; bilinmeyen kod reddedilir", () => {
    for (const kod of ["ad_gecersiz", "ad_yasakli"]) {
      const m = { tur: "hata", kod, mesaj: "marka adi kullanilamaz", anahtar: "m1" };
      const r = sunucuMesajiCoz(JSON.stringify(m));
      expect(r.tamam, kod).toBe(true);
      expect(r.tamam && r.mesaj).toEqual(m);
    }
    expect(sunucuMesajiCoz(JSON.stringify({ tur: "hata", kod: "ad_bilinmeyen", mesaj: "x" })).tamam).toBe(false);
  });

  it("komut zarfindaki ve komuttaki fazla alanlar (t, oyuncu) atilir", () => {
    const r = istemciMesajiCoz(
      JSON.stringify({ tur: "komut", anahtar: "a-1", t: 5, oyuncu: "x", komut: { tur: "vergi_ayarla", oranPpm: 3, t: 9, oyuncu: "y" } }),
    );
    expect(r.tamam).toBe(true);
    if (r.tamam) expect(r.mesaj).toEqual({ tur: "komut", anahtar: "a-1", komut: { tur: "vergi_ayarla", oranPpm: 3 } });
  });

  it("bicimsiz mesajlar reddedilir", () => {
    const kotu: unknown[] = [
      "{bozuk",
      { tur: "bilinmeyen" },
      { tur: "merhaba", protokolSurumu: PROTOKOL_SURUMU, token: "", istemciKimligi: "x" },
      { tur: "merhaba", protokolSurumu: PROTOKOL_SURUMU, token: "t", istemciKimligi: "bosluk var" },
      { tur: "komut", anahtar: "x".repeat(65), komut: { tur: "vergi_ayarla", oranPpm: 1 } },
      { tur: "komut", anahtar: "a", komut: { tur: "vergi_ayarla", oranPpm: 1.5 } },
      { tur: "komut", anahtar: "a", komut: { tur: "vergi_ayarla", oranPpm: 2 ** 60 } },
      { tur: "komut", anahtar: "a", komut: { tur: "bakim_duzeyi", duzey: 3 } },
      { tur: "komut", anahtar: "a", komut: { tur: "uydurma" } },
      { tur: "komut", anahtar: "a", komut: { tur: "tesis_insa", bolge: "x".repeat(65), tesisTuru: "c" } },
      { tur: "abone", bolgeler: Array.from({ length: 513 }, (_, i) => `b${i}`) },
      { tur: "zamanIlerlet", t: -1 },
    ];
    for (const m of kotu) expect(istemciMesajiCoz(typeof m === "string" ? m : JSON.stringify(m)).tamam).toBe(false);
  });

  it("sunucu mesajlari istemci tarafinda dogrulanir", () => {
    const m: SunucuMesaji = { tur: "komutSonucu", anahtar: "a", seq: 3, t: 10, komut: { tur: "genel_onarim", bolge: "b" }, sonuc: { tamam: false, hata: "x" }, tekrar: true };
    expect(sunucuMesajiCoz(JSON.stringify(m))).toEqual({ tamam: true, mesaj: m });
    expect(sunucuMesajiCoz(JSON.stringify({ tur: "hata", kod: "uydurma", mesaj: "" })).tamam).toBe(false);
  });

  it("yetisme durumu (yalniz ekleme): durum mesaji, yetisiyor hata kodu ve istege bagli hosgeldin alanlari", () => {
    const durum: SunucuMesaji = { tur: "durum", yetisiyor: true, simZamani: 3_600_000, hedefZamani: 864_000_000 };
    expect(sunucuMesajiCoz(JSON.stringify(durum))).toEqual({ tamam: true, mesaj: durum });
    expect(sunucuMesajiCoz(JSON.stringify({ tur: "durum", yetisiyor: "evet", simZamani: 1, hedefZamani: 2 })).tamam).toBe(false);
    const hata: SunucuMesaji = { tur: "hata", kod: "yetisiyor", mesaj: "yetisiyor", anahtar: "a" };
    expect(sunucuMesajiCoz(JSON.stringify(hata))).toEqual({ tamam: true, mesaj: hata });
    // Eski sunucunun hosgeldin'i (yetisiyor/hedefZamani yok) hala gecerlidir.
    const hos = { tur: "hosgeldin", protokolSurumu: PROTOKOL_SURUMU, kuralSurumu: "k", oyuncu: "o", yonetici: false, simZamani: 0, seq: 0, hiz: 1, dizin: { bolgeler: [], mallar: [], tesisTurleri: [], yontemler: [], birlikler: [], teknolojiler: [] } };
    expect(sunucuMesajiCoz(JSON.stringify(hos)).tamam).toBe(true);
    expect(sunucuMesajiCoz(JSON.stringify({ ...hos, yetisiyor: true, hedefZamani: 99 })).tamam).toBe(true);
  });
});

describe("hosgeldin.dunyaEpochMs (yalniz ekleme)", () => {
  const hos = { tur: "hosgeldin", protokolSurumu: PROTOKOL_SURUMU, kuralSurumu: "k", oyuncu: "o", yonetici: false, simZamani: 0, seq: 0, hiz: 1, dizin: { bolgeler: [], mallar: [], tesisTurleri: [], yontemler: [], birlikler: [], teknolojiler: [] } };
  it("alan yoksa gecerli (eski/elle saatli sunucu); varsa tamsayi epoch ms gecerli; gecersiz tipler reddedilir", () => {
    expect(sunucuMesajiCoz(JSON.stringify(hos)).tamam).toBe(true);
    const r = sunucuMesajiCoz(JSON.stringify({ ...hos, dunyaEpochMs: 1_790_802_000_000 }));
    expect(r.tamam).toBe(true);
    expect(r.tamam && r.mesaj.tur === "hosgeldin" ? r.mesaj.dunyaEpochMs : null).toBe(1_790_802_000_000);
    expect(sunucuMesajiCoz(JSON.stringify({ ...hos, dunyaEpochMs: "2026-09-30" })).tamam).toBe(false);
    expect(sunucuMesajiCoz(JSON.stringify({ ...hos, dunyaEpochMs: 1.5 })).tamam).toBe(false);
  });
});

describe("Esnaf Defteri (defterIste / defter, yalniz ekleme)", () => {
  const defter = {
    tur: "defter",
    istek: 7,
    kazanilan: [
      { kavram: "ilk_parsel", sablon: "defter.kavram.ilk_parsel", tur: "damga", t: 3_600_000 },
      { kavram: "ilk_yapi", sablon: "defter.kavram.ilk_yapi", tur: "odul", t: 7_200_000, odul: { mal: { celik: 5000 }, degerMili: 600_000 } },
      { kavram: "ilk_satis", sablon: "defter.kavram.ilk_satis", tur: "odul", odul: { paraMili: 500_000, degerMili: 500_000 } },
    ],
    siradaki: [{ kavram: "ilk_dukkan", sablon: "defter.kavram.ilk_dukkan", etkin: false, odul: { mal: { celik: 10_000 }, degerMili: 1_200_000 } }],
    toplamOdulMili: 1_100_000,
    tavanMili: 8_000_000,
  };

  it("istemci defterIste (istek istege bagli) ve sunucu defter mesaji gecerli; metin alani yok, sablon anahtari var", () => {
    expect(istemciMesajiCoz(JSON.stringify({ tur: "defterIste" })).tamam).toBe(true);
    const r = istemciMesajiCoz(JSON.stringify({ tur: "defterIste", istek: 3 }));
    expect(r.tamam && r.mesaj.tur === "defterIste" ? r.mesaj.istek : null).toBe(3);
    expect(istemciMesajiCoz(JSON.stringify({ tur: "defterIste", istek: "x" })).tamam).toBe(false);
    const c = sunucuMesajiCoz(JSON.stringify(defter));
    expect(c.tamam).toBe(true);
    expect(c.tamam && c.mesaj.tur === "defter" ? c.mesaj.kazanilan[1]?.odul?.degerMili : null).toBe(600_000);
    expect(DEFTER_ODUL_SIRASI).toEqual(["ilk_yapi", "ilk_satis", "ilk_isleme", "ilk_ekmek", "zincir_kapandi", "ilk_dukkan", "ilk_pencere", "ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"]); // eski sira: defter-p4p5.test.ts (donmus)
    expect(defterSablonu("ilk_yapi")).toBe("defter.kavram.ilk_yapi");
  });

  it("defter sema: tur, tamsayi alanlar ve bilinmeyen tur reddedilir; t ve odul istege bagli", () => {
    expect(sunucuMesajiCoz(JSON.stringify({ ...defter, kazanilan: [{ kavram: "a", sablon: "s", tur: "metin" }] })).tamam).toBe(false);
    expect(sunucuMesajiCoz(JSON.stringify({ ...defter, toplamOdulMili: 1.5 })).tamam).toBe(false);
    expect(sunucuMesajiCoz(JSON.stringify({ ...defter, kazanilan: [{ kavram: "a", sablon: "s", tur: "damga" }] })).tamam).toBe(true);
    const { tavanMili: _t, ...eksik } = defter;
    expect(sunucuMesajiCoz(JSON.stringify(eksik)).tamam).toBe(false);
    expect(DefterSemasi.safeParse({ kazanilan: [], siradaki: [], toplamOdulMili: 0, tavanMili: 0 }).success).toBe(true);
  });
});

describe("sen yokken (donus ozeti) mesajlari", () => {
  const ozet = {
    surum: 1 as const,
    bant: "K2" as const,
    aralik: { baslangicT: 3_600_000, bitisT: 36_000_000 },
    net: { hazineFarki: -500, kalemler: { satis: 100, gider: -50, diger: -550 }, uretim: [{ mal: "tahil", miktar: 7 }] },
    maddeler: [{ blok: "B2" as const, sablon: DONUS_SABLON.bittiInsaat, tohum: 12345, degerler: ["ciftlik", "ilceA"], git: { bolge: 2 }, onem: 600_000 }],
    oneri: null,
  };

  it("DonusOzeti semasi: gecerli ozet kabul; metin yok; sablon anahtarlari sabit; bozuk alanlar reddedilir", () => {
    expect(DonusOzetiSemasi.parse(ozet)).toEqual(ozet);
    expect(Object.values(DONUS_SABLON)).toEqual(["donus.bitti.insaat", "donus.bitti.insaat.cok", "donus.gelen.siparis"]);
    expect(DonusOzetiSemasi.safeParse({ ...ozet, bant: "K0" }).success).toBe(false);
    expect(DonusOzetiSemasi.safeParse({ ...ozet, surum: 2 }).success).toBe(false);
    expect(DonusOzetiSemasi.safeParse({ ...ozet, net: { ...ozet.net, hazineFarki: 1.5 } }).success).toBe(false);
    expect(DonusOzetiSemasi.safeParse({ ...ozet, net: { ...ozet.net, uretim: Array.from({ length: 4 }, () => ({ mal: "x", miktar: 1 })) } }).success).toBe(false);
    expect(DonusOzetiSemasi.safeParse({ ...ozet, maddeler: [{ ...ozet.maddeler[0], sablon: "serbest metin" }] }).success).toBe(false);
  });

  it("sunucu mesajlari: hosgeldin.donusOzeti (istege bagli) ve 'donusOzeti' mesaji; istemci 'ozetOkundu'", () => {
    const hos = { tur: "hosgeldin", protokolSurumu: PROTOKOL_SURUMU, kuralSurumu: "k", oyuncu: "o", yonetici: false, simZamani: 0, seq: 0, hiz: 1, dizin: { bolgeler: [], mallar: [], tesisTurleri: [], yontemler: [], birlikler: [], teknolojiler: [] } };
    expect(sunucuMesajiCoz(JSON.stringify(hos)).tamam).toBe(true); // eski biçim geçerli
    expect(sunucuMesajiCoz(JSON.stringify({ ...hos, donusOzeti: ozet })).tamam).toBe(true);
    expect(sunucuMesajiCoz(JSON.stringify({ ...hos, donusOzeti: { ...ozet, bant: "X" } })).tamam).toBe(false);
    const m: SunucuMesaji = { tur: "donusOzeti", ozet };
    expect(sunucuMesajiCoz(JSON.stringify(m))).toEqual({ tamam: true, mesaj: m });
    expect(istemciMesajiCoz(JSON.stringify({ tur: "ozetOkundu", t: 36_000_000 })).tamam).toBe(true);
    for (const kotu of [{ tur: "ozetOkundu" }, { tur: "ozetOkundu", t: -1 }, { tur: "ozetOkundu", t: 1.5 }, { tur: "ozetOkundu", t: "5" }]) {
      expect(istemciMesajiCoz(JSON.stringify(kotu)).tamam).toBe(false);
    }
  });
});

function kurulum(): Simulasyon {
  const veri = miniVeriyiYukle();
  const sim = Simulasyon.olustur(veri, 5);
  const kuzey = veri.harita.bolgeler.filter((b) => b.devlet === "kuzey").map((b) => b.id);
  const guney = veri.harita.bolgeler.filter((b) => b.devlet === "guney").map((b) => b.id);
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: kuzey } });
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: guney } });
  sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" } });
  sim.calistirKadar(5 * SAAT);
  return sim;
}

describe("ilgi alani karesi", () => {
  it("yalniz ilgi alanindaki bolgeler; ozel veri ve oyuncu karesi yalniz sahibine", () => {
    const sim = kurulum();
    const ilgi = ilgiAlaniKur(sim, [5, 5, 99, -1], "ali");
    expect(ilgi).toEqual([0, 1, 2, 5]);
    const kare = ilgiKaresiCikar(sim, ilgi, "ali");
    expect(kare.bolgeler.map((b) => b.i)).toEqual([0, 1, 2, 5]);
    expect(kare.bolgeler.filter((b) => b.ozel).map((b) => b.i)).toEqual([0, 1, 2]);
    expect(kare.bolgeler.find((b) => b.i === 5)?.genel.sahip).toBe("veli");
    expect(kare.oyuncu?.id).toBe("ali");
    expect(kare.t).toBe(5 * SAAT);
    expect(IlgiKaresiSemasi.parse(kare)).toEqual(kare);
    const izleyici = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0, 1], null), null);
    expect(izleyici.bolgeler.every((b) => b.ozel === undefined) && izleyici.oyuncu === undefined).toBe(true);
    // Kare dünyaya bağlı değildir (kopyadır).
    const ozel = kare.bolgeler[0]?.ozel;
    if (ozel) ozel.birlikler[0] = 123_456;
    expect(sim.dunya.bolgeler[0]?.birlikler[0]).not.toBe(123_456);
  });

  it("tesis olcegi isteğe bagli nesne alani (tesisOlcek): M/L listelenir, S listelenmez; alan bos ise hic yazilmaz; demetler 6 ogeli kalir", () => {
    const sim = kurulum();
    const ilgi = ilgiAlaniKur(sim, [0, 1, 2], "ali");
    const once = ilgiKaresiCikar(sim, ilgi, "ali");
    for (const b of once.bolgeler) {
      for (const t of b.ozel?.tesisler ?? []) expect(t).toHaveLength(6); // demete öğe EKLENMEZ (zod tuple fazla öğeyi reddeder)
      expect(b.ozel !== undefined && "tesisOlcek" in b.ozel, `S/yok: alan yazilmaz (bolge ${b.i})`).toBe(false);
    }
    // Çekirdekteki kademe (1 = M, 2 = L) listelenir; S (0 ya da tanımsız) listelenmez.
    const t0 = sim.dunya.bolgeler[0]?.tesisler[0];
    const t1 = sim.dunya.bolgeler[1]?.tesisler[0];
    const t2 = sim.dunya.bolgeler[2]?.tesisler[0];
    expect(t0 && t1 && t2).toBeTruthy();
    if (!t0 || !t1 || !t2) return;
    t0.olcek = 2;
    t1.olcek = 1;
    t2.olcek = 0; // açık S
    const sonra = ilgiKaresiCikar(sim, ilgi, "ali");
    expect(sonra.bolgeler[0]?.ozel?.tesisOlcek).toEqual([[t0.id, 2]]);
    expect(sonra.bolgeler[1]?.ozel?.tesisOlcek).toEqual([[t1.id, 1]]);
    expect(sonra.bolgeler[2]?.ozel !== undefined && "tesisOlcek" in (sonra.bolgeler[2]?.ozel ?? {})).toBe(false);
    for (const b of sonra.bolgeler) for (const t of b.ozel?.tesisler ?? []) expect(t).toHaveLength(6);
    // Yalnız sahibine: izleyici özel veriyi ve ölçeği görmez.
    expect(JSON.stringify(ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0], null), null))).not.toContain("tesisOlcek");
    expect(IlgiKaresiSemasi.parse(sonra)).toEqual(sonra);
    // Delta ile taşınır.
    expect(deltaUygula(once, kareFarki(once, sonra))).toEqual(sonra);
    // Kademe değeri doğrulanır.
    const kotu = structuredClone(sonra);
    (kotu.bolgeler[0]?.ozel?.tesisOlcek as unknown[][])[0]![1] = 3;
    expect(IlgiKaresiSemasi.safeParse(kotu).success).toBe(false);
  });

  it("GERIYE UYUM: entegrasyon 8064ded semasi (dondurulmus kopya) yeni sunucunun karesini REDDETMEZ; demete ogeler eklenirse bu test kirilir", () => {
    // 8064ded `mesajlar.ts` `bolgeKaresiSemasi`: bolge karesinin tamami (z.object bilinmeyen anahtari atar, z.tuple fazla ogeyi REDDEDER).
    const tam = z.number().int();
    const eskiStok = z.tuple([tam, tam, tam, tam, tam]);
    const eskiBolge = z.object({
      i: tam,
      id: z.string(),
      genel: z.object({
        sahip: z.string().nullable(),
        nufus: tam,
        tesisler: z.array(z.tuple([tam, z.union([z.literal(0), z.literal(1)])])),
        durus: z.union([z.literal(0), z.literal(1), z.literal(2)]),
      }),
      ozel: z
        .object({
          stoklar: z.array(eskiStok),
          uretimOrani: z.array(tam),
          tesisler: z.array(z.tuple([tam, tam, tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
          emirler: z.array(z.tuple([tam, z.union([z.literal(0), z.literal(1)]), tam, tam])),
          birlikler: z.array(tam),
          gidaPpm: tam,
          ikmalPpm: tam,
          rezervKalan: z.array(tam),
        })
        .optional(),
    });
    const sim = kurulum();
    const t = sim.dunya.bolgeler[0]?.tesisler[0];
    if (t) t.olcek = 2;
    const kare = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0, 1, 2], "ali"), "ali");
    expect(kare.bolgeler[0]?.ozel?.tesisOlcek).toBeDefined();
    // JSON'dan geçirilir (ağdaki hâl): eski şema kareyi kabul eder ve yeni alanı sessizce atar.
    const agdaki = JSON.parse(JSON.stringify(kare)) as { bolgeler: unknown[] };
    for (const b of agdaki.bolgeler) {
      const r = eskiBolge.safeParse(b);
      expect(r.success, JSON.stringify(r)).toBe(true);
      if (r.success) expect(JSON.stringify(r.data)).not.toContain("tesisOlcek");
    }
    // Aynı denetim yeni şemadan da geçer; bir demete öğe eklenirse eski şema reddeder (bu yüzden demetler 6 ogeli kalmalı).
    expect(sunucuMesajiCoz(JSON.stringify({ tur: "kare", rev: 1, seq: 1, ilgi: [0, 1, 2], kare })).tamam).toBe(true);
    const ekli = structuredClone(agdaki) as { bolgeler: Array<{ ozel?: { tesisler: unknown[][] } }> };
    ekli.bolgeler[0]?.ozel?.tesisler[0]?.push(2);
    expect(eskiBolge.safeParse(ekli.bolgeler[0]).success).toBe(false);
  });

  it("stok formulunden ara deger, oran degismedigi surece canli dunyayla bit bit ayni", () => {
    const sim = kurulum();
    const kare = ilgiKaresiCikar(sim, [0, 1, 2], "ali");
    const bas = sim.dunya.zaman;
    let karsilastirilan = 0;
    for (const dt of [0, 1, 59_999, 17 * 60_000, SAAT - 1]) {
      const t = bas + dt;
      for (const b of kare.bolgeler) {
        b.ozel?.stoklar.forEach((f, m) => {
          const s = sim.dunya.bolgeler[b.i]?.stoklar[m];
          if (!s) return;
          expect(stokAraDeger(f, t)).toBe(anlikMiktar(s, t));
          karsilastirilan++;
        });
      }
      const hz = sim.dunya.oyuncular.find((o) => o.id === "ali")?.hazine;
      if (hz && kare.oyuncu) expect(stokAraDeger(kare.oyuncu.hazine, t)).toBe(anlikMiktar(hz, t));
    }
    expect(karsilastirilan).toBeGreaterThan(50);
    // Formül gerçekten akıyor: en az bir stok saatte birim mertebesinde değişiyor.
    expect(kare.bolgeler.some((b) => b.ozel?.stoklar.some((f) => Math.abs(f[1]) >= MILI))).toBe(true);
  });

  it("kareFarki + deltaUygula yeni kareyi kurar; yalniz t degisince delta bos", () => {
    const sim = kurulum();
    const a = ilgiKaresiCikar(sim, [0, 1, 2, 3], "ali");
    expect(deltaBosMu(kareFarki(a, ilgiKaresiCikar(sim, [0, 1, 2, 3], "ali")))).toBe(true);
    sim.uygula({ t: sim.dunya.zaman, oyuncu: "ali", komut: { tur: "savunma_emri", bolge: "m_gecit", durus: "savunma" } });
    sim.calistirKadar(sim.dunya.zaman + 12 * SAAT);
    const b = ilgiKaresiCikar(sim, [0, 1, 2, 4], "ali");
    const d = kareFarki(a, b);
    expect(deltaBosMu(d)).toBe(false);
    expect(d.cikan).toEqual([3]);
    expect(d.bolgeler.map((x) => x.i)).toContain(4);
    expect(d.bolgeler.map((x) => x.i)).toContain(2);
    expect(deltaUygula(a, d)).toEqual(b);
    // Oyuncu karesi kalkarsa (izleyiciye geçiş) null ile bildirilir.
    const c = ilgiKaresiCikar(sim, [0, 1, 2, 4], null);
    const dc = kareFarki(b, c);
    expect(dc.oyuncu).toBeNull();
    expect(deltaUygula(b, dc)).toEqual(c);
  });
});
