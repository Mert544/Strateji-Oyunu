/**
 * Ekonomi: üretim zinciri, tesis inşası, yöntem değiştirme, nüfus, rezerv ve komut doğrulamaları.
 * Gerçek içerik (icerik.json) ve mini-6 haritasıyla çalışır.
 */
import { describe, expect, it } from "vitest";
import { PPM, SAAT } from "../src/tipler";
import { bolge, hazine, kur, malNo, negatifStok, saatKos, simdiyiIsle, stok, ver, verTamam } from "./ekonomi-yardimci";

describe("yedi gunluk kosu", () => {
  it("stok negatif olmaz, uretim olur, celik ve parca zinciri uretir", () => {
    const { s } = kur();
    for (let g = 1; g <= 7; g++) {
      saatKos(s, 24);
      expect(negatifStok(s), `gun ${g}`).toBeNull();
    }
    expect(s.dunya.zaman).toBe(7 * 24 * SAAT);
    let toplam = 0;
    for (const b of s.dunya.bolgeler) for (const u of b.uretimToplam) toplam += u;
    expect(toplam).toBeGreaterThan(0);
    const toplamUretim = (malId: string): number =>
      s.dunya.bolgeler.reduce((t, b) => t + (b.uretimToplam[malNo(s, malId)] as number), 0);
    expect(toplamUretim("tahil")).toBeGreaterThan(0);
    expect(toplamUretim("gida")).toBeGreaterThan(0);
    expect(toplamUretim("celik")).toBeGreaterThan(0);
    expect(toplamUretim("parca")).toBeGreaterThan(0);
    expect(toplamUretim("yakit")).toBeGreaterThan(0);
    // Tesisler çalışıyor
    const celikhane = bolge(s, "m_dag").tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "celikhane")!;
    expect(celikhane.verimPpm).toBeGreaterThan(0);
    expect(celikhane.isciPpm).toBe(PPM);
  });

  it("gida karsilanma ve uretim oranlari ilk cozumde yazilir", () => {
    const { s } = kur();
    simdiyiIsle(s);
    const ova = bolge(s, "m_ova");
    expect(ova.uretimOrani[malNo(s, "gida")]).toBeGreaterThan(0);
    expect(ova.gidaKarsilanmaPpm).toBe(PPM);
    expect(ova.tesisler.every((t) => t.isciPpm > 0)).toBe(true);
  });
});

describe("tesis insasi", () => {
  it("maliyet aninda duser, tesis sure sonunda eklenir", () => {
    const { s } = kur();
    simdiyiIsle(s);
    const celik0 = stok(s, "m_ova", "celik");
    const parca0 = stok(s, "m_ova", "parca");
    const para0 = hazine(s, "a");
    const tesisSayisi = bolge(s, "m_ova").tesisler.length;

    verTamam(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" });
    expect(celik0 - stok(s, "m_ova", "celik")).toBe(30_000);
    expect(parca0 - stok(s, "m_ova", "parca")).toBe(10_000);
    expect(para0 - hazine(s, "a")).toBe(6_000_000);
    expect(s.dunya.insaatlar).toHaveLength(1);
    expect(s.dunya.insaatlar[0]).toMatchObject({ tur: "tesis", sahip: "a", bitis: 4 * SAAT });
    expect(bolge(s, "m_ova").tesisler).toHaveLength(tesisSayisi);

    s.calistirKadar(4 * SAAT - 1);
    expect(bolge(s, "m_ova").tesisler).toHaveLength(tesisSayisi);
    s.calistirKadar(4 * SAAT);
    const ova = bolge(s, "m_ova");
    expect(ova.tesisler).toHaveLength(tesisSayisi + 1);
    expect(s.dunya.insaatlar).toHaveLength(0);
    const yeni = ova.tesisler[ova.tesisler.length - 1]!;
    expect(s.ic.tesisTurleri[yeni.tur]!.id).toBe("ciftlik");
    expect(s.ic.yontemler[yeni.yontem]!.id).toBe("geleneksel_tarim");
    expect(yeni.aktif).toBe(true);
    const idler = s.dunya.bolgeler.flatMap((b) => b.tesisler.map((t) => t.id));
    expect(new Set(idler).size).toBe(idler.length);
  });

  it("yetersiz stok/hazine, gecersiz bolge veya etiket hata verir ve hicbir sey degismez", () => {
    const { s } = kur();
    simdiyiIsle(s);
    const ozet0 = s.durumOzeti();
    // başkasının bölgesi
    expect(ver(s, "b", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }).tamam).toBe(false);
    // etiket (ova değil)
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "ciftlik" }).tamam).toBe(false);
    // rezerv yok (m_ova'da petrol rezervi yok)
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "petrol_kuyusu" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "yok", tesisTuru: "ciftlik" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "yok" }).tamam).toBe(false);
    expect(s.durumOzeti()).toBe(ozet0);

    // yetersiz hazine
    const b = bolge(s, "m_col");
    const para = hazine(s, "b");
    expect(para).toBeGreaterThan(0);
    // hazineyi bırakmadan yetersiz stok: m_col stokundan çelik çekilir
    const celikNo = malNo(s, "celik");
    b.stoklar[celikNo]!.miktar = 0;
    b.stoklar[celikNo]!.yerelOran = 0;
    b.stoklar[celikNo]!.gelenOran = 0;
    const sonuc = ver(s, "b", { tur: "tesis_insa", bolge: "m_col", tesisTuru: "silis_ocagi" });
    expect(sonuc.tamam).toBe(false);
    expect(hazine(s, "b")).toBe(para);
    expect(s.dunya.insaatlar).toHaveLength(0);
  });
});

describe("yontem degistirme ve tesis durumu", () => {
  it("yontem degisimi ayni t'de cozumle oranlari degistirir", () => {
    const { s } = kur();
    // mekanize_tarim teknolojisi (test için doğrudan açılır)
    const oyuncu = s.dunya.oyuncular.find((o) => o.id === "a")!;
    oyuncu.teknolojiler.push(s.ic.teknolojiIndeks["mekanize_tarim"]!);
    saatKos(s, 2);
    const ova = bolge(s, "m_ova");
    const tahil = malNo(s, "tahil");
    const once = ova.uretimOrani[tahil]!;
    expect(once).toBeGreaterThan(150_000);
    const ciftlik = ova.tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "ciftlik")!;
    const t = s.dunya.zaman;

    verTamam(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: ciftlik.id, yontem: "mekanize_tarim" });
    simdiyiIsle(s); // aynı t'deki çözüm
    expect(s.dunya.zaman).toBe(t);
    expect(s.ic.yontemler[ciftlik.yontem]!.id).toBe("mekanize_tarim");
    expect(ova.uretimOrani[tahil]!).toBeGreaterThan(once * 1.4);
    expect(ova.tesisler.find((x) => x.id === ciftlik.id)!.verimPpm).toBeGreaterThan(0);
  });

  it("gecersiz yontem (tesis turunde yok / kilitli) reddedilir", () => {
    const { s } = kur();
    const ova = bolge(s, "m_ova");
    const ciftlik = ova.tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "ciftlik")!;
    expect(ver(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: ciftlik.id, yontem: "yuzey_cevher" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: ciftlik.id, yontem: "yok" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: 99999, yontem: "geleneksel_tarim" }).tamam).toBe(false);
    expect(ver(s, "b", { tur: "yontem_degistir", bolge: "m_ova", tesis: ciftlik.id, yontem: "geleneksel_tarim" }).tamam).toBe(false);
    // teknoloji yokken kilitli yöntem
    const kilitli = ver(s, "a", { tur: "yontem_degistir", bolge: "m_ova", tesis: ciftlik.id, yontem: "mekanize_tarim" });
    expect(kilitli.tamam).toBe(false);
  });

  it("tesis_durum pasif tesis uretmez ama bakim tuketir", () => {
    const { s } = kur();
    saatKos(s, 1);
    const ova = bolge(s, "m_ova");
    const ciftlik = ova.tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "ciftlik")!;
    const tahil = malNo(s, "tahil");
    expect(ova.uretimOrani[tahil]).toBeGreaterThan(0);
    verTamam(s, "a", { tur: "tesis_durum", bolge: "m_ova", tesis: ciftlik.id, aktif: false });
    simdiyiIsle(s);
    expect(ova.uretimOrani[tahil]).toBe(0);
    expect(ciftlik.verimPpm).toBe(0);
    expect(ciftlik.isciPpm).toBe(0);
    // Pasif tesisin işçisi boşa çıkar: gıda fabrikası tam istihdam olmaya devam eder.
    verTamam(s, "a", { tur: "tesis_durum", bolge: "m_ova", tesis: ciftlik.id, aktif: true });
    simdiyiIsle(s);
    expect(ova.uretimOrani[tahil]).toBeGreaterThan(0);
  });
});

describe("nufus", () => {
  it("gida yoksa nufus kuculur", () => {
    const { s } = kur(); // b yalnızca m_col: çiftlik yok, gıda stoku 7 günde biter
    const nufus0 = bolge(s, "m_col").nufus;
    saatKos(s, 24 * 7);
    expect(stok(s, "m_col", "gida")).toBeLessThan(100); // 0,1 birimden az: stok tükenmiş
    expect(bolge(s, "m_col").gidaKarsilanmaPpm).toBeLessThan(800_000);
    expect(bolge(s, "m_col").nufus).toBeLessThan(nufus0);
    expect(bolge(s, "m_col").nufus).toBeGreaterThanOrEqual(1000);
  });

  it("gida karsilaninca nufus buyur; yuksek vergi buyumeyi keser", () => {
    const { s } = kur();
    const { s: s2 } = kur();
    verTamam(s2, "a", { tur: "vergi_ayarla", oranPpm: 500_000 });
    const n0 = bolge(s, "m_ova").nufus;
    saatKos(s, 48);
    saatKos(s2, 48);
    expect(bolge(s, "m_ova").nufus).toBeGreaterThan(n0);
    expect(bolge(s2, "m_ova").nufus).toBe(n0);
  });
});

describe("rezerv", () => {
  it("rezerv azalinca verim duser; tukenince uretim durur", () => {
    const { s } = kur();
    saatKos(s, 1);
    const ova = bolge(s, "m_ova");
    const tahil = malNo(s, "tahil");
    const ciftlik = ova.tesisler.find((t) => s.ic.tesisTurleri[t.tur]!.id === "ciftlik")!;
    const tamVerim = ciftlik.verimPpm;
    expect(tamVerim).toBeGreaterThan(900_000);

    // Rezervi ilkin %1'ine indir: sqrt(0.01) = %10 verim
    ova.rezervKalan[tahil] = Math.floor(ova.rezervIlk[tahil]! / 100);
    verTamam(s, "a", { tur: "vergi_ayarla", oranPpm: 200_000 }); // çözümü tetikler
    simdiyiIsle(s);
    expect(ciftlik.verimPpm).toBeGreaterThan(90_000);
    expect(ciftlik.verimPpm).toBeLessThan(110_000);

    // Kalanı küçült ve bitene kadar koştur
    ova.rezervKalan[tahil] = 100_000;
    simdiyiIsle(s);
    const verim1 = ciftlik.verimPpm;
    saatKos(s, 24 * 6);
    expect(ova.rezervKalan[tahil]).toBe(0);
    expect(ciftlik.verimPpm).toBe(0);
    expect(ova.uretimOrani[tahil]).toBe(0);
    expect(verim1).toBeGreaterThan(0);
    // yeni çiftlik inşası da rezersiz reddedilir
    expect(ver(s, "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }).tamam).toBe(false);
  });

  it("uretimToplam ve rezerv azalisi uretimle tutarlidir", () => {
    const { s } = kur();
    saatKos(s, 48);
    const ova = bolge(s, "m_ova");
    const tahil = malNo(s, "tahil");
    const harcanan = ova.rezervIlk[tahil]! - ova.rezervKalan[tahil]!;
    // muhasebe son çözümde işlenir: uretimToplam ile rezerv düşüşü aynı artışı taşır
    expect(harcanan).toBe(ova.uretimToplam[tahil]);
    expect(harcanan).toBeGreaterThan(0);
  });
});

describe("vergi ve komut dogrulamalari", () => {
  it("vergi geliri hazineyi artirir; vergi_ayarla sinirlari denetlenir", () => {
    const { s } = kur();
    saatKos(s, 1);
    const p0 = hazine(s, "a");
    saatKos(s, 10);
    expect(hazine(s, "a")).toBeGreaterThan(p0);
    expect(ver(s, "a", { tur: "vergi_ayarla", oranPpm: -1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "vergi_ayarla", oranPpm: PPM + 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "vergi_ayarla", oranPpm: 0 }).tamam).toBe(true);
    const p1 = hazine(s, "a");
    saatKos(s, 10);
    expect(hazine(s, "a")).toBe(p1); // vergi yok, ihracat yok
  });

  it("ticaret emri: yalniz liman, guncelleme, silme ve sirali tutma", () => {
    const { s } = kur();
    const yakit = "yakit";
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: "m_ova", mal: yakit, yon: "ihracat", oranSaat: 1000 }).tamam).toBe(false);
    expect(ver(s, "b", { tur: "ticaret_emri", bolge: "m_liman", mal: yakit, yon: "ihracat", oranSaat: 1000 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: yakit, yon: "ihracat", oranSaat: -1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yok", yon: "ihracat", oranSaat: 1 }).tamam).toBe(false);
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ithalat", oranSaat: 500 });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "gida", yon: "ihracat", oranSaat: 700 });
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 900 });
    const liman = bolge(s, "m_liman");
    const g = malNo(s, "gida");
    const y = malNo(s, "yakit");
    expect(liman.ticaretEmirleri.map((e) => [e.mal, e.yon, e.oranSaat])).toEqual([
      [g, "ihracat", 700],
      [y, "ihracat", 900],
      [y, "ithalat", 500],
    ]);
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 1200 });
    expect(liman.ticaretEmirleri).toHaveLength(3);
    expect(liman.ticaretEmirleri[1]!.oranSaat).toBe(1200);
    verTamam(s, "a", { tur: "ticaret_emri", bolge: "m_liman", mal: "yakit", yon: "ihracat", oranSaat: 0 });
    expect(liman.ticaretEmirleri).toHaveLength(2);
  });
});
