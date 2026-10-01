/**
 * Sanayi (B2) S2: tesis ölçek kademesi (S/M/L): çıktı/girdi/elektrik x2,2 / x3,6, işçi x1,8 / x2,6, bakım ve işletme x2 / x3,2,
 * inşa maliyeti x2,5 / x4,5; L için `otomasyon`; yükseltme süresi yarım; yükseltme sırasında tesis çalışır.
 */
import { describe, expect, it } from "vitest";
import { anlikHazine } from "../src/stok";
import { PPM, SAAT } from "../src/tipler";
import { bolge, kur, malNo, saatKos, stok, ver, verTamam } from "./ekonomi-yardimci";
import { kurSanayi, sanayiParam, tesisBul } from "./sanayi-yardimci";

/** Rezerv verimi ~1 (damar çok büyük): sayılar tam değil, %0,01 içinde eşittir. */
function yakin(deger: number, beklenen: number): void {
  expect(Math.abs(deger - beklenen)).toBeLessThanOrEqual(Math.max(2, beklenen / 10_000));
}

/** m_col: santral + silis ocağı (silis çıkarımı, elektrik 5 000, işçi 6 000, bakım parça 600); işgücü bol. */
function colKur(opt: { nufus?: number; para?: number } = {}) {
  return kurSanayi({
    oyuncular: { a: ["m_col"], b: ["m_ova"] },
    duzenle: (v) => {
      const b = v.harita.bolgeler.find((x) => x.id === "m_col")!;
      b.tesisler = ["santral", "silis_ocagi"];
      b.rezervler["silis"] = 2_000_000_000_000; // damar çok büyük: rezerv verimi ~1 (ölçek testi tükenmeden bağımsız)
      if (opt.nufus !== undefined) b.nufus = opt.nufus;
      v.param.baslangic.hazine = opt.para ?? 5_000_000_000;
      v.param.ekonomi.tesisIsletmeParasiSaat = 60_000;
    },
  });
}

describe("tesis_olcek_yukselt: çıktı, girdi, işçi, bakım ve işletme", () => {
  it("M: çıktı x2,2 (girdi ve elektrik de x2,2); L: x3,6; yükseltme tamamlanınca kademe artar", () => {
    const { s } = colKur();
    saatKos(s, 2);
    const silis = malNo(s, "silis");
    const ts = tesisBul(s, "m_col", "silis_ocagi");
    expect(ts.olcek).toBe(0);
    yakin(bolge(s, "m_col").uretimOrani[silis]!, 60_000);
    const elektrikS = bolge(s, "m_col").elektrik!.talepMili - Math.floor((bolge(s, "m_col").nufus * 150) / 1000);
    yakin(elektrikS, 5_000);

    verTamam(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1 });
    // silis ocağı inşa süresi 4 saat -> yükseltme 2 saat; sürerken tesis çalışmaya devam eder (kademe S)
    saatKos(s, 1);
    expect(ts.olcek).toBe(0);
    yakin(bolge(s, "m_col").uretimOrani[silis]!, 60_000);
    expect(s.dunya.insaatlar.filter((i) => i.tur === "olcek")).toHaveLength(1);
    saatKos(s, 2);
    expect(ts.olcek).toBe(1);
    expect(s.dunya.insaatlar.filter((i) => i.tur === "olcek")).toHaveLength(0);
    yakin(bolge(s, "m_col").uretimOrani[silis]!, 132_000);
    yakin(bolge(s, "m_col").elektrik!.talepMili - Math.floor((bolge(s, "m_col").nufus * 150) / 1000), 11_000);

    // L: otomasyon gerekir
    const r = ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 2 });
    expect(r.tamam).toBe(false);
    s.dunya.oyuncular.find((o) => o.id === "a")!.teknolojiler.push(s.ic.teknolojiIndeks["otomasyon"]!);
    verTamam(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 2 });
    saatKos(s, 3);
    expect(ts.olcek).toBe(2);
    yakin(bolge(s, "m_col").uretimOrani[silis]!, 216_000);
  });

  it("işçi başına çıktı: M ~1,22, L ~1,38 kat (işçi sınırlı bölgede)", () => {
    // santral önce (işçi alır), silis kalan işgücüyle: toplam işçi 7 000 (nufus 14 000 x %50)
    const olc = (k: 0 | 1 | 2): { cikti: number; isciPpm: number } => {
      const { s } = colKur({ nufus: 14_000 });
      const ts = tesisBul(s, "m_col", "silis_ocagi");
      ts.olcek = k;
      s.baglam.kirlet(s.dunya);
      saatKos(s, 2);
      return { cikti: bolge(s, "m_col").uretimOrani[malNo(s, "silis")]!, isciPpm: ts.isciPpm };
    };
    const S = olc(0);
    const M = olc(1);
    const L = olc(2);
    // atanan işçi sabit (3 000 civarı): çıktı x ölçek çarpanı / işçi gerek x ölçek
    expect(M.isciPpm / S.isciPpm).toBeCloseTo(1_000_000 / 1_800_000, 2);
    expect(L.isciPpm / S.isciPpm).toBeCloseTo(1_000_000 / 2_600_000, 2);
    expect(M.cikti / S.cikti).toBeGreaterThan(1.2);
    expect(M.cikti / S.cikti).toBeLessThan(1.25);
    expect(L.cikti / S.cikti).toBeGreaterThan(1.36);
    expect(L.cikti / S.cikti).toBeLessThan(1.4);
  });

  it("maliyet = hedef kademe maliyeti - mevcut kademe maliyeti (para ve mal); süre = inşa süresinin yarısı", () => {
    const { s } = colKur();
    saatKos(s, 1);
    const ts = tesisBul(s, "m_col", "silis_ocagi");
    const tur = s.ic.tesisTurleri[s.ic.tesisTuruIndeks["silis_ocagi"]!]!;
    const hazineOnce = anlikHazine(s.dunya, "a");
    const stokOnce = [stok(s, "m_col", "celik"), stok(s, "m_col", "parca")];
    const t0 = s.dunya.zaman;
    verTamam(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1 });
    // S -> M: 2,5 - 1,0 = 1,5 x inşa maliyeti
    expect(hazineOnce - anlikHazine(s.dunya, "a")).toBe(Math.floor((tur.insaParasi * 1_500_000) / PPM));
    expect(stokOnce[0]! - stok(s, "m_col", "celik")).toBe(Math.floor(((tur.insaMaliyeti["celik"] ?? 0) * 1_500_000) / PPM));
    expect(stokOnce[1]! - stok(s, "m_col", "parca")).toBe(Math.floor(((tur.insaMaliyeti["parca"] ?? 0) * 1_500_000) / PPM));
    const insaat = s.dunya.insaatlar.find((i) => i.tur === "olcek")!;
    expect(insaat.bitis - t0).toBe(Math.floor((tur.insaSuresiSaat * SAAT * sanayiParam(s).olcekYukseltmeSureCarpaniPpm) / PPM));
    expect(insaat.olcek).toBe(1);
    // M -> L: 4,5 - 2,5 = 2,0 x
    saatKos(s, 3);
    s.dunya.oyuncular.find((o) => o.id === "a")!.teknolojiler.push(s.ic.teknolojiIndeks["otomasyon"]!);
    const h2 = anlikHazine(s.dunya, "a");
    verTamam(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 2 });
    expect(h2 - anlikHazine(s.dunya, "a")).toBe(Math.floor((tur.insaParasi * 2_000_000) / PPM));
  });

  it("bakım ve işletme gideri ölçekle büyür (M: x2)", () => {
    const { s } = colKur();
    saatKos(s, 1);
    const o = s.dunya.oyuncular.find((x) => x.id === "a")!;
    const parca = malNo(s, "parca");
    const yerel0 = bolge(s, "m_col").stoklar[parca]!.yerelOran;
    const hazineOran0 = o.hazine.yerelOran;
    const ts = tesisBul(s, "m_col", "silis_ocagi");
    ts.olcek = 1;
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman);
    // silis ocağı bakım parça 600 -> 1 200; işletme gideri 60 000 -> 120 000
    expect(yerel0 - bolge(s, "m_col").stoklar[parca]!.yerelOran).toBe(600);
    const fark = hazineOran0 - o.hazine.yerelOran;
    expect(fark).toBe(60_000);
  });

  it("komut doğrulama: sahip, tesis, kademe, yineleme, sürerken ikinci yükseltme, kaynak yetersizliği", () => {
    const { s } = colKur({ para: 100_000 });
    const ts = tesisBul(s, "m_col", "silis_ocagi");
    expect(ver(s, "b", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: 99_999, olcek: 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "yok", tesis: ts.id, olcek: 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 0 as unknown as 1 }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 3 as unknown as 1 }).tamam).toBe(false);
    // hazine 100 para: yetersiz
    const r = ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1 });
    expect(r.tamam).toBe(false);
    expect(ts.olcek).toBe(0);
    expect(s.dunya.insaatlar).toHaveLength(0);
    const { s: z } = colKur();
    const t2 = tesisBul(z, "m_col", "silis_ocagi");
    verTamam(z, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: t2.id, olcek: 1 });
    expect(ver(z, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: t2.id, olcek: 1 }).tamam).toBe(false);
    saatKos(z, 3);
    expect(ver(z, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: t2.id, olcek: 1 }).tamam).toBe(false);
  });

  it("sanayi kapalıyken ölçek komutu reddedilir ve tesislerde ölçek alanı yoktur", () => {
    const { s } = kur({ duzenle: (v) => { delete v.param.sanayi; } });
    const ts = s.dunya.bolgeler.find((b) => b.id === "m_col")!.tesisler[0]!;
    expect(ts.olcek).toBeUndefined();
    const r = ver(s, "a", { tur: "tesis_olcek_yukselt", bolge: "m_col", tesis: ts.id, olcek: 1 });
    expect(r.tamam).toBe(false);
  });
});
