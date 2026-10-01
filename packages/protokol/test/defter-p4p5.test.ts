/**
 * Defter P4/P5 (yalnız ekleme): `ilk_ekmek`, `ilk_pencere` (ödüllü kavram) ve `ilk_raf`, `ilk_cam` (damga) eklendi. DONMUŞ ESKİ ŞEMA: eski sürümün listeleri ve eski
 * `defter` yükü yeni şemada AYNEN geçerlidir; eski kavramların göreli sırası ve damga indeksleri kaymaz; yeni kavramlar serbest dize olarak taşınır (şema alanı eklenmedi).
 */
import { describe, expect, it } from "vitest";
import { DEFTER_DAMGALARI, DEFTER_ODUL_SIRASI, DefterSemasi, defterSablonu, sunucuMesajiCoz } from "../src";

/** Eski sürümün (P4/P5 öncesi) listeleri: DEĞİŞTİRME. */
const ESKI_SIRA = ["ilk_yapi", "ilk_satis", "ilk_isleme", "zincir_kapandi", "ilk_dukkan", "ilk_sozlesme", "ikinci_ilce", "ilk_arastirma"] as const;
const ESKI_DAMGALAR = ["ilk_parsel", "ilk_uretim", "ilk_donus"] as const;

/** Eski `defter` yükü (yeni kavram yok). */
const ESKI_DEFTER = {
  tur: "defter",
  kazanilan: [
    { kavram: "ilk_parsel", sablon: "defter.kavram.ilk_parsel", tur: "damga", t: 1000 },
    { kavram: "ilk_yapi", sablon: "defter.kavram.ilk_yapi", tur: "odul", t: 2000, odul: { mal: { celik: 5000 }, degerMili: 600_000 } },
  ],
  siradaki: [{ kavram: "ilk_satis", sablon: "defter.kavram.ilk_satis", etkin: true, odul: { paraMili: 500_000, degerMili: 500_000 } }],
  toplamOdulMili: 600_000,
  tavanMili: 8_000_000,
};

describe("Defter P4/P5: yalnız ekleme, geriye uyum", () => {
  it("eski ödül sırası yeni sıranın ALT DİZİSİDİR (göreli sıra kaymaz); yeni kavramlar kritik yolda yerinde", () => {
    const yeni = [...DEFTER_ODUL_SIRASI] as string[];
    let i = 0;
    for (const k of yeni) if (k === ESKI_SIRA[i]) i++;
    expect(i).toBe(ESKI_SIRA.length);
    expect(yeni.indexOf("ilk_ekmek")).toBe(yeni.indexOf("ilk_isleme") + 1);
    expect(yeni.indexOf("ilk_pencere")).toBe(yeni.indexOf("ilk_dukkan") + 1);
    expect(new Set(yeni).size).toBe(yeni.length);
  });

  it("eski damga listesi yeni listenin BAŞINDA (indeksler kaymaz: istemci DEFTER_DAMGALARI[0] = ilk_parsel); ilk_raf ve ilk_cam sonda", () => {
    expect(DEFTER_DAMGALARI.slice(0, ESKI_DAMGALAR.length)).toEqual([...ESKI_DAMGALAR]);
    expect(DEFTER_DAMGALARI).toEqual(["ilk_parsel", "ilk_uretim", "ilk_donus", "ilk_raf", "ilk_cam"]);
    // Ödül ve damga kümeleri ayrık (damga para/mal taşımaz).
    for (const d of DEFTER_DAMGALARI) expect((DEFTER_ODUL_SIRASI as readonly string[]).includes(d)).toBe(false);
  });

  it("eski defter yükü yeni şemada AYNEN geçerli", () => {
    const c = sunucuMesajiCoz(JSON.stringify(ESKI_DEFTER));
    expect(c.tamam).toBe(true);
    const { tur: _t, ...govde } = ESKI_DEFTER;
    expect(DefterSemasi.safeParse(govde).success).toBe(true);
  });

  it("yeni kavramlar ve damgalar serbest dize olarak taşınır: ilk_raf/ilk_cam damga, ilk_ekmek/ilk_pencere ödül (mal); şema alanı eklenmedi", () => {
    const yeni = {
      ...ESKI_DEFTER,
      kazanilan: [
        ...ESKI_DEFTER.kazanilan,
        { kavram: "ilk_raf", sablon: defterSablonu("ilk_raf"), tur: "damga", t: 3000 },
        { kavram: "ilk_cam", sablon: defterSablonu("ilk_cam"), tur: "damga", t: 4000 },
        { kavram: "ilk_ekmek", sablon: defterSablonu("ilk_ekmek"), tur: "odul", t: 5000, odul: { mal: { ekmek: 5000 }, degerMili: 300_000 } },
      ],
      siradaki: [{ kavram: "ilk_pencere", sablon: defterSablonu("ilk_pencere"), etkin: false, odul: { mal: { parca: 8000 }, degerMili: 1_440_000 } }],
    };
    const c = sunucuMesajiCoz(JSON.stringify(yeni));
    expect(c.tamam).toBe(true);
    expect(c.tamam && c.mesaj.tur === "defter" ? c.mesaj.kazanilan.map((k) => k.kavram) : []).toEqual(["ilk_parsel", "ilk_yapi", "ilk_raf", "ilk_cam", "ilk_ekmek"]);
    // `etkin` alanı değişmedi: yine mantıksal ve zorunlu (istemci içerik dizininden de hesaplar; sunucu yalnız bayrağı yazar).
    expect(sunucuMesajiCoz(JSON.stringify({ ...yeni, siradaki: [{ kavram: "ilk_pencere", sablon: "s", odul: { degerMili: 1 } }] })).tamam).toBe(false);
    expect(defterSablonu("ilk_cam")).toBe("defter.kavram.ilk_cam");
  });
});
