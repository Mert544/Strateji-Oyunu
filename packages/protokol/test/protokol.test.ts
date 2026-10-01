/** Protokol: mesaj şemaları (kabul/ret, alan atma) ve ilgi alanı karesi (süzgeç, özel veri, formül, delta). */
import { describe, expect, it } from "vitest";
import { MILI, SAAT, SISTEM_OYUNCUSU, Simulasyon, anlikMiktar } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import {
  IlgiKaresiSemasi,
  KomutSemasi,
  PROTOKOL_SURUMU,
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
];

describe("mesaj semalari", () => {
  it("her komut turu kabul edilir ve aynen doner", () => {
    for (const k of HER_KOMUT) expect(KomutSemasi.parse(k)).toEqual(k);
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
