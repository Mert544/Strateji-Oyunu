import { beforeAll, describe, expect, it } from "vitest";
import { raporUret } from "../src";
import type { HipotezSonucu } from "../src";
import { kisaSonuclar } from "./olcum-yardimci";

describe("hipotez koşucuları (kısa sürüm)", () => {
  const tohumlar = [1];
  let sonuclar: HipotezSonucu[] = [];

  beforeAll(() => {
    sonuclar = kisaSonuclar();
  }, 600_000);

  it("rapor Markdown üretir", () => {
    expect(sonuclar.length).toBe(6);
    const md = raporUret(sonuclar, { tohumlar, hizli: false, sureMs: 1234, secenekler: {} });
    expect(md).toContain("## Özet");
    expect(md).toContain("Determinizm izi");
    expect(md).toContain("**Sürüm/etiket**: (belirtilmedi)");
    expect(md).not.toContain("Önceki ölçüm");
    for (const h of sonuclar) expect(md).toContain(`## ${h.kimlik}`);
    // H1 v0.2 bölümleri
    expect(md).toContain("İşletimsel tanım (H1 düzeneği v0.2)");
    expect(md).toContain("Odak kurulumu: bolge+liman");
    expect(md).toContain("Ayrıştırma: eklenen değerin bileşenleri");
    expect(md).toContain("Regret: her sabit önayarın");
    expect(md).toContain("Bilgi göstergeleri (verdict'e KATILMAZ");
    expect(md).toContain("Eşitlik kuralının etkisi");
    expect(md).toContain("Bölge türüne göre en iyi önayar");
  });

  it("rapor: etiket ve önceki ölçümle karşılaştırma sütunları", () => {
    const md = raporUret(sonuclar, {
      tohumlar,
      hizli: false,
      sureMs: 1,
      etiket: "v0.1",
      secenekler: {},
      karsilastirma: {
        kaynak: "docs/olcum/v0-t1-3.json",
        hipotezler: [
          { kimlik: "H1", verdict: "kaldi", olcum: { ad: "Eski ölçüm adı", deger: 0.96, birim: "oran" } },
          { kimlik: "H2", verdict: "gecti", olcum: { ad: sonuclar[1]!.olcum.ad, deger: 0.425, birim: "oran" } },
        ],
      },
    });
    expect(md).toContain("**Sürüm/etiket**: v0.1");
    expect(md).toContain("| Önceki ölçüm | Önceki sonuç |");
    expect(md).toContain("%96.0 (önceki tanım: Eski ölçüm adı) | KALDI |");
    expect(md).toMatch(/%42\.5 \| GEÇTİ \|/);
    // önceki ölçümde olmayan hipotez için "—"
    expect(md).toMatch(/\| — \| — \|\n/);
  });
});
