/**
 * Sanayi (B2) S3: bakım düzeyi ve aşınma: günlük değişim (asgari +20 000 / normal 0 / yüksek -15 000), sınırlar [0, PPM],
 * verim kaybı tavanı %40, parça kıtlığında aşınma, genel onarım (maliyet, durma, sıfırlama), işletme gideri çarpanı.
 */
import { describe, expect, it } from "vitest";
import { anlikHazine } from "../src/stok";
import { GUN, PPM, SAAT } from "../src/tipler";
import { bolge, malNo, saatKos, stok, ver, verTamam } from "./ekonomi-yardimci";
import { kurSanayi, tesisBul } from "./sanayi-yardimci";

/** m_col: santral + silis ocağı; damar büyük, stoklar dolu, hazine bol, bakım düzeyi parametreyle. */
function colKur(opt: { stokDoldur?: boolean } = {}) {
  return kurSanayi({
    oyuncular: { a: ["m_col"], b: ["m_ova"] },
    doldur: opt.stokDoldur !== false,
    duzenle: (v) => {
      const b = v.harita.bolgeler.find((x) => x.id === "m_col")!;
      b.tesisler = ["santral", "silis_ocagi"];
      b.rezervler["silis"] = 2_000_000_000_000;
      v.param.baslangic.hazine = 5_000_000_000;
      v.param.ekonomi.tesisIsletmeParasiSaat = 60_000;
      if (opt.stokDoldur === false) {
        // parça yok: bakım girdisi karşılanmaz; santral kömürü ve diğer girdiler dolu
        v.param.baslangic.stok["komur"] = 10_000_000;
        v.param.baslangic.stok["gida"] = 10_000_000;
        v.param.baslangic.stok["parca"] = 0;
      }
    },
  });
}

const ASGARI = 0;
const YUKSEK = 2;

describe("bakim_duzeyi komutu", () => {
  it("0, 1 veya 2 tamsayı; varsayılan 1 (normal); kapalı sanayide reddedilir", () => {
    const { s } = colKur();
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    expect(o.bakimDuzeyi).toBe(1);
    for (const kotu of [-1, 3, 1.5, Number.NaN]) {
      expect(ver(s, "a", { tur: "bakim_duzeyi", duzey: kotu as 0 }).tamam).toBe(false);
    }
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: ASGARI });
    expect(o.bakimDuzeyi).toBe(0);
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: YUKSEK });
    expect(o.bakimDuzeyi).toBe(2);
  });
});

describe("aşınma: günlük değişim ve sınırlar", () => {
  it("normal düzey + bakım karşılanıyor: aşınma 0'da kalır", () => {
    const { s } = colKur();
    s.calistirKadar(5 * GUN + SAAT);
    for (const t of bolge(s, "m_col").tesisler) expect(t.asinmaPpm).toBe(0);
    expect(bolge(s, "m_col").bakimKarsilanmaPpm).toBe(PPM);
  });

  it("asgari düzey: her gün +20 000 (5 günde 100 000), tesis çalışsın veya çalışmasın yalnız aktif tesis aşınır", () => {
    const { s } = colKur();
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: ASGARI });
    const pasif = tesisBul(s, "m_col", "santral");
    s.calistirKadar(5 * GUN + SAAT);
    const silis = tesisBul(s, "m_col", "silis_ocagi");
    expect(silis.asinmaPpm).toBe(100_000);
    expect(pasif.asinmaPpm).toBe(100_000);
    verTamam(s, "a", { tur: "tesis_durum", bolge: "m_col", tesis: silis.id, aktif: false });
    s.calistirKadar(7 * GUN + SAAT);
    expect(silis.asinmaPpm).toBe(100_000); // pasif tesis aşınmaz
    expect(pasif.asinmaPpm).toBe(140_000);
  });

  it("aşınma [0, PPM] aralığında kelepçelenir ve verim kaybı en çok %40'tır (çıktı x0,6)", () => {
    const { s } = colKur();
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: ASGARI });
    const silis = tesisBul(s, "m_col", "silis_ocagi");
    s.calistirKadar(2 * SAAT);
    const taze = bolge(s, "m_col").uretimOrani[malNo(s, "silis")]!;
    s.calistirKadar(60 * GUN + SAAT);
    expect(silis.asinmaPpm).toBe(PPM); // 60 x 20 000 = 1 200 000 -> PPM
    const eskimis = bolge(s, "m_col").uretimOrani[malNo(s, "silis")]!;
    expect(Math.abs(eskimis - Math.floor((taze * 600_000) / PPM))).toBeLessThanOrEqual(Math.max(3, taze / 5_000));
    expect(eskimis).toBeGreaterThanOrEqual(Math.floor(taze * 0.6) - 3);
  });

  it("yüksek düzey: günlük -15 000 iyileşir, 0'ın altına inmez", () => {
    const { s } = colKur();
    const silis = tesisBul(s, "m_col", "silis_ocagi");
    silis.asinmaPpm = 100_000;
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: YUKSEK });
    s.calistirKadar(3 * GUN + SAAT);
    expect(silis.asinmaPpm).toBe(100_000 - 3 * 15_000);
    s.calistirKadar(10 * GUN + SAAT);
    expect(silis.asinmaPpm).toBe(0);
  });

  it("yüksek düzey bakım girdisini x1,5, asgari x0,5 tüketir (işletme gideri de aynı çarpanla)", () => {
    const { s } = colKur();
    s.calistirKadar(2 * SAAT);
    const parca = malNo(s, "parca");
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    const yerelNormal = bolge(s, "m_col").stoklar[parca]!.yerelOran;
    const hazineNormal = o.hazine.yerelOran;
    // m_col: santral (bakım 1 200, işletme muaf %0: santralIsletmePpm) + silis ocağı (bakım 600, işletme 60 000)
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: ASGARI });
    s.calistirKadar(s.dunya.zaman);
    // (bozulma etkisi nedeniyle stok oranında en çok 2 mili-birim/saat yuvarlama farkı olabilir)
    expect(Math.abs(bolge(s, "m_col").stoklar[parca]!.yerelOran - yerelNormal - 900)).toBeLessThanOrEqual(2);
    expect(o.hazine.yerelOran - hazineNormal).toBe(30_000); // silis ocağı: 60 000 x (1 - 0,5)
    verTamam(s, "a", { tur: "bakim_duzeyi", duzey: YUKSEK });
    s.calistirKadar(s.dunya.zaman);
    expect(Math.abs(bolge(s, "m_col").stoklar[parca]!.yerelOran - yerelNormal + 900)).toBeLessThanOrEqual(2);
    expect(o.hazine.yerelOran - hazineNormal).toBe(-30_000);
  });

  it("bakım girdisi (parça) karşılanmıyorsa normal düzeyde de aşınma günde en az +20 000 olur", () => {
    const { s } = colKur({ stokDoldur: false });
    s.calistirKadar(3 * GUN + SAAT);
    expect(bolge(s, "m_col").bakimKarsilanmaPpm!).toBeLessThan(950_000);
    expect(tesisBul(s, "m_col", "silis_ocagi").asinmaPpm).toBe(60_000);
  });
});

describe("genel_onarim", () => {
  function onarimHazirla() {
    const k = colKur();
    const silis = tesisBul(k.s, "m_col", "silis_ocagi");
    silis.asinmaPpm = 600_000;
    k.s.baglam.kirlet(k.s.dunya);
    saatKos(k.s, 2);
    return { ...k, silis };
  }

  it("aşınmayı sıfırlar; maliyet = aşınmış tesislerin inşa maliyetinin %20'si (para + mal)", () => {
    const { s, silis } = onarimHazirla();
    const tur = s.ic.tesisTurleri[s.ic.tesisTuruIndeks["silis_ocagi"]!]!;
    const h0 = anlikHazine(s.dunya, "a");
    const celik0 = stok(s, "m_col", "celik");
    const parca0 = stok(s, "m_col", "parca");
    verTamam(s, "a", { tur: "genel_onarim", bolge: "m_col" });
    expect(silis.asinmaPpm).toBe(0);
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(Math.floor((tur.insaParasi * 200_000) / PPM));
    expect(celik0 - stok(s, "m_col", "celik")).toBe(Math.floor(((tur.insaMaliyeti["celik"] ?? 0) * 200_000) / PPM));
    expect(parca0 - stok(s, "m_col", "parca")).toBe(Math.floor(((tur.insaMaliyeti["parca"] ?? 0) * 200_000) / PPM));
    // santral aşınmamıştı: ücretlendirilmedi
    expect(tesisBul(s, "m_col", "santral").asinmaPpm).toBe(0);
  });

  it("onarılan tesis 6 saat durur (üretim 0), sonra çalışır; sürerken ikinci onarım reddedilir", () => {
    const { s, silis } = onarimHazirla();
    const silisMal = malNo(s, "silis");
    expect(bolge(s, "m_col").uretimOrani[silisMal]!).toBeGreaterThan(0);
    const t0 = s.dunya.zaman;
    verTamam(s, "a", { tur: "genel_onarim", bolge: "m_col" });
    expect(silis.onarimBitis).toBe(t0 + 6 * SAAT);
    s.calistirKadar(t0);
    expect(bolge(s, "m_col").uretimOrani[silisMal]).toBe(0);
    expect(ver(s, "a", { tur: "genel_onarim", bolge: "m_col" }).tamam).toBe(false);
    s.calistirKadar(t0 + 5 * SAAT);
    expect(bolge(s, "m_col").uretimOrani[silisMal]).toBe(0);
    s.calistirKadar(t0 + 6 * SAAT + 1);
    expect(silis.onarimBitis).toBeUndefined();
    expect(bolge(s, "m_col").uretimOrani[silisMal]!).toBeGreaterThan(0);
    expect(s.dunya.insaatlar.filter((i) => i.tur === "onarim")).toHaveLength(0);
  });

  it("aşınma yoksa, bölge oyuncunun değilse veya kaynak yetmiyorsa reddedilir; dünya değişmez", () => {
    const { s, silis } = onarimHazirla();
    expect(ver(s, "b", { tur: "genel_onarim", bolge: "m_col" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "genel_onarim", bolge: "yok" }).tamam).toBe(false);
    const stokKopya = structuredClone(bolge(s, "m_col").stoklar);
    // parça yetersiz
    bolge(s, "m_col").stoklar[malNo(s, "parca")]!.miktar = 0;
    expect(ver(s, "a", { tur: "genel_onarim", bolge: "m_col" }).tamam).toBe(false);
    expect(silis.asinmaPpm).toBe(600_000);
    void stokKopya;
    const { s: t } = colKur();
    expect(ver(t, "a", { tur: "genel_onarim", bolge: "m_col" }).tamam).toBe(false); // aşınma yok
  });
});

describe("bakım düzeyi ve aşınma özet etkisi", () => {
  it("sanayi kapalıyken tesislerde aşınma/ölçek alanı ve oyuncuda bakım düzeyi yoktur", async () => {
    const { kur } = await import("./ekonomi-yardimci");
    const { s } = kur({ duzenle: (v) => { delete v.param.sanayi; } });
    s.calistirKadar(2 * GUN);
    for (const b of s.dunya.bolgeler) {
      expect(b.elektrik).toBeUndefined();
      expect(b.kirlilikPpm).toBeUndefined();
      expect(b.kesifSayisi).toBeUndefined();
      for (const t of b.tesisler) {
        expect(t.olcek).toBeUndefined();
        expect(t.asinmaPpm).toBeUndefined();
      }
    }
    for (const o of s.dunya.oyuncular) expect(o.bakimDuzeyi).toBeUndefined();
    expect(ver(s, "a", { tur: "bakim_duzeyi", duzey: 1 }).tamam).toBe(false);
  });
});
