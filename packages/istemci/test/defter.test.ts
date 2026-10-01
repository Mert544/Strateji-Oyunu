/**
 * Esnaf Defteri (saf): şablon metinleri (tüm kavramlar), ödül metni, sıradaki/kazanılan listesi, gizlenen yer tutucular,
 * ödül çubuğu (toplam / tavan), yeni kazanılan bildirimi ve sahte bağdaştırıcının örnek defteri.
 */
import { describe, expect, it } from "vitest";
import { DEFTER_DAMGALARI, DEFTER_ODUL_SIRASI, defterSablonu } from "@bolge/protokol";
import type { Defter } from "@bolge/protokol";
import { DEFTER_METINLERI, defterHtml, kazanimBildirimi, kazanimBildirimleri, odulMetni, odulSutunu, yeniKazanilanlar } from "../src/harita/defter";
import { SahteBaglanti } from "../src/harita/baglanti";
import { Bit, hucreId } from "../src/harita/hucre";

const malAdi = (m: string): string => ({ celik: "Çelik", parca: "Makine Parçası" })[m] ?? m;
const EPOCH = Date.parse("2026-09-30T21:00:00Z");

const defter: Defter = {
  kazanilan: [
    { kavram: "ilk_parsel", sablon: defterSablonu("ilk_parsel"), tur: "damga", t: 2 * 3_600_000 },
    { kavram: "ilk_yapi", sablon: defterSablonu("ilk_yapi"), tur: "odul", t: 30 * 3_600_000, odul: { mal: { celik: 5000 }, degerMili: 600_000 } },
  ],
  siradaki: [
    { kavram: "ilk_satis", sablon: defterSablonu("ilk_satis"), etkin: true, odul: { paraMili: 500_000, degerMili: 500_000 } },
    { kavram: "ilk_dukkan", sablon: defterSablonu("ilk_dukkan"), etkin: false, odul: { mal: { celik: 10_000 }, degerMili: 1_200_000 } },
  ],
  toplamOdulMili: 600_000,
  tavanMili: 8_000_000,
};

describe("Esnaf Defteri", () => {
  it("her ödüllü kavram ve damga için Türkçe metin var; büyük harfli sözcük ve baskı dili yok", () => {
    for (const k of [...DEFTER_ODUL_SIRASI, ...DEFTER_DAMGALARI]) {
      const m = DEFTER_METINLERI[defterSablonu(k)];
      expect(m, k).toBeDefined();
      for (const x of [m!.kazanildi, m!.siradaki]) {
        expect(x).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,}\b/);
        expect(x).not.toMatch(/kaçır|kaybet|acele|hemen|son şans/i);
      }
    }
  });

  it("ödül metni: para, mal, değer", () => {
    // Tek para biçimi "1.234 ₺": sayı ile simge arası bölünmez boşluk; "≈" ile sayı da bölünmez
    expect(odulMetni({ paraMili: 500_000, degerMili: 500_000 }, malAdi)).toBe("500\u00a0₺");
    expect(odulMetni({ mal: { celik: 5000 }, degerMili: 600_000 }, malAdi)).toBe("5 çelik (≈\u00a0600\u00a0₺ değerinde)");
    expect(odulMetni({ paraMili: 250_000, mal: { parca: 2000 }, degerMili: 450_000 }, malAdi)).toBe("250\u00a0₺ ve 2 makine parçası");
  });

  it("sağ sütun: uzun ödül iki düzgün satır (ne, altta değeri); tutar parçaları ayrı ve bölünmez", () => {
    expect(odulSutunu({ mal: { parca: 9000 }, degerMili: 900_000 }, malAdi)).toBe(
      '<span class="dt-ana">9 makine parçası</span><span class="dt-deger soluk">≈\u00a0900\u00a0₺ değerinde</span>',
    );
    expect(odulSutunu({ paraMili: 500_000, degerMili: 500_000 }, malAdi)).toBe('<span class="dt-ana">500\u00a0₺</span>');
    expect(odulSutunu({ paraMili: 250_000, mal: { parca: 2000 }, degerMili: 450_000 }, malAdi)).toBe('<span class="dt-ana">250\u00a0₺</span><span class="dt-ana">2 makine parçası</span>');
    expect(odulSutunu(undefined, malAdi)).toBe("");
  });

  it("bölüm: ödül çubuğu (toplam / tavan), sıradakiler tutarla, yer tutucu gizli, kazanılanlar tarih ve ödülle; sayaç ya da yüzde yok", () => {
    const h = defterHtml(defter, malAdi, EPOCH);
    expect(h).toContain("600\u00a0₺ <span class=\"soluk\">/ 8.000\u00a0₺</span>");
    expect(h).toContain('style="width:7.5%"');
    expect(h).toContain("İlk satışını yap");
    expect(h).toContain("500\u00a0₺");
    expect(h).not.toContain("ilk_dukkan");
    expect(h).toContain("İlk yapın kuruldu; kolay gelsin.");
    expect(h).toContain("2 Ekim · 5 çelik (≈\u00a0600\u00a0₺ değerinde)");
    expect(h).toContain("1 Ekim · damga");
    expect(h).not.toMatch(/\d+\s*\/\s*\d+\s*(kavram|adım)|%\d/);
    expect(defterHtml(null, malAdi)).toContain("Defter yükleniyor");
  });

  it("yeni kazanılan bildirimi (ilk okumada yok)", () => {
    const once: Defter = { ...defter, kazanilan: defter.kazanilan.slice(0, 1) };
    expect(yeniKazanilanlar(null, defter)).toEqual([]);
    const yeni = yeniKazanilanlar(once, defter);
    expect(yeni.map((k) => k.kavram)).toEqual(["ilk_yapi"]);
    expect(kazanimBildirimi(yeni[0]!, malAdi)).toBe("Defter: İlk yapın kuruldu; kolay gelsin. Ödül: 5 çelik (≈\u00a0600\u00a0₺ değerinde).");
    expect(kazanimBildirimleri(yeni, malAdi)).toEqual([kazanimBildirimi(yeni[0]!, malAdi)]);
    expect(kazanimBildirimleri(defter.kazanilan, malAdi)).toEqual(["Defterine 2 yeni satır işlendi; ödüllerin toplamı ≈\u00a0600\u00a0₺. Ayrıntı İşletmem'de."]);
  });

  it("sahte bağdaştırıcı örnek defter verir: arsa alınınca ilk arsa damgası; sıradakiler kritik yol sırasıyla", async () => {
    const G = 20;
    const durum = new Uint8Array(G * G).fill(Bit.ICERIDE | (1 << 5));
    const iz = { x0: 1000, y0: 2000, genislik: G, yukseklik: G, durum };
    const odul = { tavanMili: 8_000_000, kavramlar: { ilk_yapi: { mal: { celik: 5000 }, degerMili: 600_000 }, ilk_satis: { paraMili: 500_000, degerMili: 500_000 }, ilk_dukkan: { mal: { celik: 10_000 }, degerMili: 1_200_000 } } };
    const b = new SahteBaglanti({ izgaraAl: async () => iz, komsular: false, saat: () => 1, defterOdulleri: odul });
    expect((await b.defterAl())?.kazanilan).toEqual([]);
    await b.sahiplikAl("i");
    expect((await b.parselAl({ tur: "parsel_al", ilce: "i", hucreler: [hucreId(1005, 2005)], sinif: "kirsal" })).tamam).toBe(true);
    const d = (await b.defterAl())!;
    expect(d.kazanilan.map((k) => [k.kavram, k.tur])).toEqual([["ilk_parsel", "damga"]]);
    expect(d.siradaki.map((k) => [k.kavram, k.etkin])).toEqual([["ilk_yapi", true], ["ilk_satis", true], ["ilk_dukkan", false]]);
    expect(d.tavanMili).toBe(8_000_000);
    expect(await new SahteBaglanti({ izgaraAl: async () => iz }).defterAl()).toBeNull();
  });
});
