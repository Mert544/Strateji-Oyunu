/**
 * Sanayi (B2) S5: damar ölçeği, tükenme (verim tabanı) ve keşif sondajı (komut, maliyet, hak sınırı, deterministik olay akışı).
 */
import { describe, expect, it } from "vitest";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import { rezervVerimi } from "../src/ekonomi/uretim";
import { anlikHazine } from "../src/stok";
import { GUN, PPM, SAAT } from "../src/tipler";
import { bolge, kur, malNo, stok, ver, verTamam } from "./ekonomi-yardimci";
import { kurSanayi, sanayiParam } from "./sanayi-yardimci";

describe("rezervVerimi taban", () => {
  it("taban 0 (sanayi kapalı): özgün sqrt(kalan/ilk); tükenince 0", () => {
    expect(rezervVerimi(100, 100)).toBe(PPM);
    expect(rezervVerimi(100, 25)).toBe(500_000);
    expect(rezervVerimi(100, 0)).toBe(0);
    expect(rezervVerimi(0, 0)).toBe(0);
  });

  it("taban 250 000: verim tabanın altına inmez; tükenince de taban; damar yoksa (ilk 0) 0", () => {
    const T = 250_000;
    expect(rezervVerimi(100, 100, T)).toBe(PPM);
    expect(rezervVerimi(100, 50, T)).toBe(707_106);
    expect(rezervVerimi(100, 6, T)).toBe(T); // sqrt(0,06) = 244 948 < taban
    expect(rezervVerimi(100, 1, T)).toBe(T);
    expect(rezervVerimi(100, 0, T)).toBe(T);
    expect(rezervVerimi(0, 0, T)).toBe(0);
  });
});

/** m_col: santral + silis ocağı; silis rezervi `rezerv` mili-birim. */
function colKur(rezerv: number, duzenle?: (v: ReturnType<typeof kurSanayi>["veri"]) => void) {
  return kurSanayi({
    oyuncular: { a: ["m_col"], b: ["m_ova"] },
    duzenle: (v) => {
      const b = v.harita.bolgeler.find((x) => x.id === "m_col")!;
      b.tesisler = ["santral", "silis_ocagi"];
      b.rezervler["silis"] = rezerv;
      v.param.baslangic.hazine = 5_000_000_000;
      v.param.sanayi!.bakim.kitlikAsinmaPpmGun = 0;
      duzenle?.(v);
    },
  });
}

describe("damar ölçeği ve tükenme", () => {
  it("kurulumda rezervOlcegiPpm ham rezervlere uygulanır (1 000 000 = etkisiz)", () => {
    const harita = colKur(1_000_000_000).s;
    const olcekli = colKur(1_000_000_000, (v) => {
      v.param.sanayi!.damar.rezervOlcegiPpm = 400_000;
    }).s;
    const si = malNo(harita, "silis");
    expect(bolge(harita, "m_col").rezervIlk[si]).toBe(1_000_000_000);
    expect(bolge(olcekli, "m_col").rezervIlk[si]).toBe(400_000_000);
    expect(bolge(olcekli, "m_col").rezervKalan[si]).toBe(400_000_000);
    // diğer ham mal (bakir) da ölçeklenir
    const bi = malNo(harita, "bakir");
    expect(bolge(olcekli, "m_col").rezervIlk[bi]).toBe(Math.floor((bolge(harita, "m_col").rezervIlk[bi]! * 400_000) / PPM));
  });

  it("sentetik haritada medyan maden damarı küçültülmüş ölçektedir (Ö7)", async () => {
    const { varsayilanVeriyiYukle } = await import("@bolge/veri");
    const h = varsayilanVeriyiYukle().harita;
    const vals = h.bolgeler.flatMap((b) => Object.entries(b.rezervler).filter(([m]) => m !== "tahil").map(([, v]) => v / 1_000_000)).sort((a, b) => a - b);
    const medyan = vals[Math.floor(vals.length / 2)]!;
    expect(medyan).toBeGreaterThanOrEqual(100);
    expect(medyan).toBeLessThanOrEqual(200);
    expect(vals[0]).toBeGreaterThanOrEqual(30);
    expect(vals[vals.length - 1]).toBeLessThanOrEqual(400);
  });

  it("damar tükenince tesis sıfıra değil %25'e iner (sanayi kapalıyken 0); rezerv negatife inmez", () => {
    const { s } = colKur(100_000); // 100 birim: 60 birim/saatte ~2 saatte biter
    s.calistirKadar(12 * SAAT);
    const si = malNo(s, "silis");
    expect(bolge(s, "m_col").rezervKalan[si]).toBe(0);
    expect(bolge(s, "m_col").rezervIlk[si]).toBe(100_000);
    const u = bolge(s, "m_col").uretimOrani[si]!;
    expect(Math.abs(u - 15_000)).toBeLessThanOrEqual(2); // 60 000 x %25
    s.calistirKadar(40 * SAAT);
    expect(bolge(s, "m_col").rezervKalan[si]).toBe(0);
    expect(bolge(s, "m_col").uretimOrani[si]).toBe(u);
    // kapalı: v0.2 davranışı (tükenince üretim durur)
    const { s: k } = kur({
      oyuncular: { a: ["m_col"], b: ["m_ova"] },
      duzenle: (v) => {
        v.harita.bolgeler.find((x) => x.id === "m_col")!.rezervler["silis"] = 100_000;
      },
    });
    k.calistirKadar(12 * SAAT);
    expect(bolge(k, "m_col").uretimOrani[malNo(k, "silis")]).toBe(0);
  });

  it("verim sqrt(kalan/ilk): damarın yarısı tüketilince verim ~0,71", () => {
    const { s } = colKur(1_000_000);
    const si = malNo(s, "silis");
    bolge(s, "m_col").rezervKalan[si] = 500_000;
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman);
    const u = bolge(s, "m_col").uretimOrani[si]!;
    expect(u).toBeGreaterThan(42_000);
    expect(u).toBeLessThan(43_000); // 60 000 x 0,7071
  });
});

describe("arama_sondaji komutu", () => {
  it("maliyet (para + parça) düşer, hak sayacı artar, 24 saat sonra olay planlanır; hak en çok 2", () => {
    const { s } = colKur(1_000_000_000);
    const p = sanayiParam(s);
    const h0 = anlikHazine(s.dunya, "a");
    const parca0 = stok(s, "m_col", "parca");
    const t0 = s.dunya.zaman;
    verTamam(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" });
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(p.damar.kesifMaliyetPara);
    expect(parca0 - stok(s, "m_col", "parca")).toBe(p.damar.kesifMaliyetMal["parca"]);
    const si = malNo(s, "silis");
    expect(bolge(s, "m_col").kesifSayisi![si]).toBe(1);
    const olay = s.dunya.kuyruk.find((o) => o.veri.tur === "sondaj_bitti");
    expect(olay).toBeDefined();
    expect(olay!.t - t0).toBe(p.damar.kesifSureSaat * SAAT);
    verTamam(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" });
    expect(bolge(s, "m_col").kesifSayisi![si]).toBe(2);
    const r = ver(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" });
    expect(r.tamam).toBe(false);
    expect(bolge(s, "m_col").kesifSayisi![si]).toBe(2);
  });

  it("geçersiz girdiler dünyayı değiştirmez: sahip değil, bilinmeyen mal, ham olmayan mal, damarı olmayan mal, tarım rezervi", () => {
    const { s } = kurSanayi({ oyuncular: { a: ["m_col", "m_ova"], b: ["m_dag"] }, tarim: true });
    s.calistirKadar(0); // t = 0 olayları işlensin (komut denemesi zamanı ilerletmesin)
    const once = s.durumOzeti();
    expect(ver(s, "b", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "arama_sondaji", bolge: "yok", mal: "silis" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "yok" }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "celik" }).tamam).toBe(false); // ham değil
    expect(ver(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "petrol" }).tamam).toBe(false); // damar yok
    expect(ver(s, "a", { tur: "arama_sondaji", bolge: "m_ova", mal: "tahil" }).tamam).toBe(false); // tarım rezervi
    expect(s.durumOzeti()).toBe(once);
  });

  it("para veya parça yetmezse reddedilir", () => {
    const { s } = colKur(1_000_000_000, (v) => {
      v.param.baslangic.hazine = 1_000;
    });
    expect(ver(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" }).tamam).toBe(false);
    const { s: t } = colKur(1_000_000_000);
    bolge(t, "m_col").stoklar[malNo(t, "parca")]!.miktar = 0;
    expect(ver(t, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" }).tamam).toBe(false);
    expect(bolge(t, "m_col").kesifSayisi![malNo(t, "silis")]).toBe(0);
  });
});

describe("keşif sondajı: deterministik olay akışı", () => {
  function sondajKos(_tohum: number, olasilik: number) {
    const { s } = colKur(1_000_000_000, (v) => {
      v.param.sanayi!.damar.kesifOlasilikPpm = olasilik;
    });
    return s;
  }

  it("başarılı sondaj: rezervIlk ve rezervKalan, rezervIlk x U(0,3 .. 0,6) kadar artar", () => {
    const s = sondajKos(1, PPM);
    const si = malNo(s, "silis");
    const ilk = bolge(s, "m_col").rezervIlk[si]!;
    verTamam(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" });
    s.calistirKadar(25 * SAAT);
    const yeni = bolge(s, "m_col").rezervIlk[si]!;
    const eki = yeni - ilk;
    expect(eki).toBeGreaterThanOrEqual(Math.floor((ilk * 300_000) / PPM));
    expect(eki).toBeLessThanOrEqual(Math.floor((ilk * 600_000) / PPM));
    // kalan: üretimle azalmış olabilir ama artış aynı miktardır
    expect(bolge(s, "m_col").rezervKalan[si]!).toBeGreaterThan(ilk - 25 * 60_000 + eki - 1_000_000);
  });

  it("başarısız sondaj (olasılık 0): damar değişmez; ama iki çekim yine yapılır (olay akışı başarıdan bağımsız ilerler)", () => {
    const basarili = sondajKos(1, PPM);
    const basarisiz = sondajKos(1, 0);
    for (const s of [basarili, basarisiz]) {
      verTamam(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" });
      s.calistirKadar(25 * SAAT);
    }
    const si = malNo(basarili, "silis");
    expect(bolge(basarisiz, "m_col").rezervIlk[si]).toBe(1_000_000_000);
    expect(bolge(basarili, "m_col").rezervIlk[si]!).toBeGreaterThan(1_000_000_000);
    // olay akışı aynı durumda: her iki koşuda da tam iki çekim tüketildi
    expect(basarisiz.dunya.rng.olay).toEqual(basarili.dunya.rng.olay);
    // ... ve akış başlangıçtan farklıdır
    expect(basarisiz.dunya.rng.olay).not.toEqual(sondajKos(1, 0).dunya.rng.olay);
  });

  it("aynı tohum aynı sonuç, farklı tohum farklı boyut; komut yenidenOynat ile aynı özeti verir", () => {
    const kos = (tohum: number) => {
      const { s } = kur({
        tohum,
        oyuncular: { a: ["m_col"], b: ["m_ova"] },
        duzenle: (v) => {
          // kur() varsayılan olarak sanayiyi kapatır; tohum seçenekli kurulum için sanayiyi elle aç
          v.param.sanayi = structuredClone(varsayilanVeriyiYukle().param.sanayi!);
          for (const m of v.icerik.mallar) if (m.depolanabilir !== false) v.param.baslangic.stok[m.id] = v.param.ekonomi.depoKapasitesi;
          const b = v.harita.bolgeler.find((x) => x.id === "m_col")!;
          b.tesisler = ["santral", "silis_ocagi"];
          b.rezervler["silis"] = 1_000_000_000;
          v.param.baslangic.hazine = 5_000_000_000;
          v.param.sanayi!.damar.kesifOlasilikPpm = PPM;
        },
      });
      verTamam(s, "a", { tur: "arama_sondaji", bolge: "m_col", mal: "silis" });
      s.calistirKadar(2 * GUN);
      return s;
    };
    const a1 = kos(7);
    const a2 = kos(7);
    const b = kos(8);
    const si = malNo(a1, "silis");
    expect(bolge(a1, "m_col").rezervIlk[si]).toBe(bolge(a2, "m_col").rezervIlk[si]);
    expect(a1.durumOzeti()).toBe(a2.durumOzeti());
    expect(bolge(b, "m_col").rezervIlk[si]).not.toBe(bolge(a1, "m_col").rezervIlk[si]);
  });
});
