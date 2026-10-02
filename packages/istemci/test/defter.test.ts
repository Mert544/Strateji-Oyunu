/**
 * Esnaf Defteri (saf): şablon metinleri (tüm kavramlar), ödül metni, sıradaki/kazanılan listesi, gizlenen yer tutucular,
 * ödül öneki ("ödül: ..."), işlenen ödül satırı (çubuk ve tavan yok), yeni kazanılan bildirimi ve birleşik metin ve sahte bağdaştırıcının örnek defteri.
 */
import { describe, expect, it } from "vitest";
import { DEFTER_DAMGALARI, DEFTER_ODUL_SIRASI, defterSablonu } from "@bolge/protokol";
import type { Defter } from "@bolge/protokol";
import { DEFTER_CERCEVE, DEFTER_METINLERI, defterBirlesikMetni, defterMetni, defterHtml, kazanimBildirimi, kazanimBildirimleri, odulMetni, odulSutunu, yeniKazanilanlar } from "../src/harita/defter";
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

  it("sağ sütun: 'ödül:' öneki ilk parçanın önünde; uzun ödül iki düzgün satır (ne, altta değeri); tutar parçaları ayrı ve bölünmez", () => {
    expect(odulSutunu({ mal: { parca: 9000 }, degerMili: 900_000 }, malAdi)).toBe(
      '<span class="dt-ana">ödül: 9 makine parçası</span><span class="dt-deger soluk">≈\u00a0900\u00a0₺ değerinde</span>',
    );
    expect(odulSutunu({ paraMili: 500_000, degerMili: 500_000 }, malAdi)).toBe('<span class="dt-ana">ödül: 500\u00a0₺</span>');
    expect(odulSutunu({ paraMili: 250_000, mal: { parca: 2000 }, degerMili: 450_000 }, malAdi)).toBe('<span class="dt-ana">ödül: 250\u00a0₺</span><span class="dt-ana">2 makine parçası</span>');
    expect(odulSutunu(undefined, malAdi)).toBe("");
  });

  it("bölüm: ödül çubuğu ve tavan YOK; işlenen ödül tek satır; sıradakiler 'ödül:' ile, yer tutucu gizli, kazanılanlar tarih ve ödülle; sayaç ya da yüzde yok", () => {
    const h = defterHtml(defter, malAdi, EPOCH);
    expect(h).not.toContain("defter-cubuk");
    expect(h).not.toContain("Defter ödülleri");
    expect(h).not.toContain("8.000");
    expect(h).not.toMatch(/\bwidth:/);
    expect(h).toContain('<p class="defter-islenen soluk" data-alan="defter-islenen">Defterine işlenen ödüller: ≈\u00a0600\u00a0₺ değerinde</p>');
    expect(h).toContain("Çiftliğinin tahılını Pazar&#39;da sat.");
    expect(h).toContain("ödül: 500\u00a0₺");
    expect(h).not.toContain("ilk_dukkan");
    expect(h).toContain("İlk yapın kuruldu; kolay gelsin.");
    expect(h).toContain("2 Ekim · 5 çelik (≈\u00a0600\u00a0₺ değerinde)");
    expect(h).toContain("1 Ekim · damga");
    expect(h).not.toMatch(/\d+\s*\/\s*\d+\s*(kavram|adım)|%\d/);
    expect(defterHtml(null, malAdi)).toContain("Defter yükleniyor");
    // hiç ödül işlenmemişse satır yok
    expect(defterHtml({ ...defter, toplamOdulMili: 0 }, malAdi, EPOCH)).not.toContain("defter-islenen");
  });

  it("yeni kazanılan bildirimi (ilk okumada yok)", () => {
    const once: Defter = { ...defter, kazanilan: defter.kazanilan.slice(0, 1) };
    expect(yeniKazanilanlar(null, defter)).toEqual([]);
    const yeni = yeniKazanilanlar(once, defter);
    expect(yeni.map((k) => k.kavram)).toEqual(["ilk_yapi"]);
    expect(kazanimBildirimi(yeni[0]!, malAdi)).toBe("Defter: İlk yapın kuruldu; kolay gelsin. Ödül: 5 çelik (≈\u00a0600\u00a0₺ değerinde).");
    // her kazanım kendi cümlesi ve değeriyle döner (birleştirme bildirim kuyruğunda: aynı 2 sn penceresindekiler tek bildirim)
    expect(kazanimBildirimleri(yeni, malAdi)).toEqual([{ mesaj: kazanimBildirimi(yeni[0]!, malAdi), deger: 600_000 }]);
    expect(kazanimBildirimleri(defter.kazanilan, malAdi).map((x) => x.deger)).toEqual([0, 600_000]);
  });

  it("birleşik bildirim metni: değer aşağı yuvarlı ve '≈' bölünmez; değer yoksa tutarsız biçim; çerçeve metinlerinde büyük harfli sözcük yok", () => {
    expect(defterBirlesikMetni(2, 600_000)).toBe("Defterine 2 adım işlendi · ≈\u00a0600\u00a0₺ değerinde");
    expect(defterBirlesikMetni(3, 600_999)).toBe("Defterine 3 adım işlendi · ≈\u00a0600\u00a0₺ değerinde");
    expect(defterBirlesikMetni(2, 0)).toBe("Defterine 2 adım işlendi");
    for (const [k, v] of Object.entries(DEFTER_CERCEVE)) {
      expect(v, k).not.toMatch(/\b[A-ZÇĞİÖŞÜ]{2,}\b/);
      expect(/₺|\bTL\b/.test(v), k).toBe(false);
    }
  });

  it("ilk saat metin kararları (T3/Tasarım): ilk_dukkan kazanıldı/sıradaki, ilk_raf sıradaki, 'satışın yolda' varyantı; 'Defterine' yazımı", () => {
    expect(defterMetni("defter.kavram.ilk_dukkan", "ilk_dukkan")).toEqual({ kazanildi: "Dükkânından da satış geldi; tezgâhın açıldı.", siradaki: "Kendi tezgâhın: bir dükkân kur ve rafından satış yap." });
    expect(defterMetni("defter.kavram.ilk_raf", "ilk_raf").siradaki).toBe("Rafına ilk malını koy.");
    expect(defterMetni("defter.kavram.ilk_satis.bekliyor", "ilk_satis").siradaki).toBe("Satışın yolda; beklerken dükkânını kur.");
    expect(defterMetni("defter.kavram.ilk_satis", "ilk_satis").siradaki).toBe("Çiftliğinin tahılını Pazar'da sat. Saatlik emrin kabulü satış değildir; gerçekleşen satışın geliri hazinene yansır.");
    for (const m of Object.values(DEFTER_METINLERI)) expect(m.kazanildi + m.siradaki).not.toMatch(/Defter'e/);
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
    expect(d.siradaki.map((k) => [k.kavram, k.etkin])).toEqual([["ilk_yapi", true], ["ilk_dukkan", false], ["ilk_satis", true]]);
    expect(d.tavanMili).toBe(8_000_000);
    expect(await new SahteBaglanti({ izgaraAl: async () => iz }).defterAl()).toBeNull();
  });

  it("sahte defterde etkin kuralı protokol işleviyle: içerik verilirse G8/dükkân kavramları açılır, verilmezse boş içerik kuralı; ilk_pencere metni cam yolunu söyler", async () => {
    const G = 20;
    const iz = { x0: 1000, y0: 2000, genislik: G, yukseklik: G, durum: new Uint8Array(G * G).fill(Bit.ICERIDE | (1 << 5)) };
    const odul = { tavanMili: 1, kavramlar: { ilk_dukkan: { paraMili: 1, degerMili: 1 }, ilk_pencere: { paraMili: 1, degerMili: 1 }, ilk_sozlesme: { paraMili: 1, degerMili: 1 } } };
    const bos = await new SahteBaglanti({ izgaraAl: async () => iz, komsular: false, saat: () => 1, defterOdulleri: odul }).defterAl();
    expect(bos?.siradaki.map((k) => [k.kavram, k.etkin])).toEqual([["ilk_dukkan", false], ["ilk_pencere", false], ["ilk_sozlesme", false]]);
    const acik = await new SahteBaglanti({ izgaraAl: async () => iz, komsular: false, saat: () => 1, defterOdulleri: odul, defterEtkin: (k) => k !== "ilk_sozlesme" }).defterAl();
    expect(acik?.siradaki.map((k) => [k.kavram, k.etkin])).toEqual([["ilk_dukkan", true], ["ilk_pencere", true], ["ilk_sozlesme", false]]);
    expect(defterMetni("defter.kavram.ilk_pencere", "ilk_pencere").siradaki).toBe("Çelik ve camdan pencere yap; camı önce silisten üret.");
  });
});
