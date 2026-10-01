/**
 * Çözüm önbellekleri ve hızlı yollar (P3c; docs/06 §15.9): çıktı BİREBİR aynı kalmalı. Önbellekler durum metnine girmez (bellekte, girdi karşılaştırmalı);
 * soğuk önbellek (yeni yükleme) aynı sonucu verir. Altın testler ve yeniden oynatma testleri ayrıca kanıttır.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { kasaOranlari } from "../src/mulk/kasa";
import { anlikGoruntuOlustur, kuralSurumuHesapla } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { bitisikCift, mulkSim, mulkVeriTam, tamam } from "./mulk-yardimci";
import { parselFiksturuYukle } from "@bolge/veri";

const F = parselFiksturuYukle("mini-6");
const hucre = (ilce: string, sinif: "kirsal" | "kasaba" = "kirsal", n = 3, atla = 0): string[] =>
  F.ilceler.find((c) => c.id === ilce)!.hucreler.filter((h) => h.uygun && h.sinif === sinif).slice(atla, atla + n).map((h) => h.id);

function veri(): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    const m = v.param.mulk!;
    m.yeniOyuncu.hibe = 5_000_000_000;
    m.yeniOyuncu.yurtHucre = 0;
    m.yeniOyuncu.ayrilmisHucrePpm = 0;
    m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 500_000 };
    m.yeniOyuncu.kalkanGun = 0;
    m.araziVergisiHaftalikPpm = 100_000;
    m.esZamanliInsaat = 10;
  });
}

/** Vergi, ithalat (makas + komisyon kasası) ve ihracat akışları olan küçük mülk dünyası. */
function hazirla(): Simulasyon {
  const s = mulkSim(["a", "b"], veri(), 9);
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: hucre("sn_m_ova_merkez", "kasaba", 4), sinif: "kasaba" });
  tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: hucre("sn_m_liman_merkez", "kasaba", 3), sinif: "kasaba" });
  tamam(s, "b", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: hucre("sn_m_ova_merkez", "kirsal", 2), sinif: "kirsal" });
  tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_ova#a", mal: "gida", yon: "ithalat", oranSaat: 20_000 });
  tamam(s, "b", { tur: "ticaret_emri", bolge: "sn_m_ova#b", mal: "tahil", yon: "ihracat", oranSaat: 10_000 });
  s.calistirKadar(s.dunya.zaman + 2 * GUN);
  return s;
}

describe("çözüm önbelleği: soğuk önbellek aynı sonucu verir (yükle → koş = kesintisiz koşu)", () => {
  it("anlık görüntüden yüklenen dünya (soğuk önbellek) kesintisiz koşuyla aynı durum özetini verir; değişiklikler (parsel, emir) arada da", () => {
    const kesintisiz = hazirla();
    const yarida = hazirla();
    const metin = anlikGoruntuOlustur(yarida, kuralSurumuHesapla(veri()));
    const yuklu = Simulasyon.anlikGoruntudenYukle(veri(), metin, []);
    for (const s of [kesintisiz, yuklu]) {
      s.calistirKadar(s.dunya.zaman + 2 * GUN);
      tamam(s, "a", { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: hucre("sn_m_ova_merkez", "kasaba", 2, 4), sinif: "kasaba" }); // girdi değişir: önbellek geçersiz
      s.calistirKadar(s.dunya.zaman + 5 * GUN);
      tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_ova#a", mal: "gida", yon: "ithalat", oranSaat: 5_000 });
      s.calistirKadar(s.dunya.zaman + 3 * GUN);
    }
    expect(yuklu.durumOzeti()).toBe(kesintisiz.durumOzeti());
  }, 60_000);

  it("kasaOranlari: aynı girdi aynı sonucu (önbellekten) verir; girdi değişince yeniden hesaplanır ve soğuk hesapla birebir aynıdır", () => {
    const s = hazirla();
    const d = s.dunya;
    const kolon = (vergi: number, makas: [string, number][] = []) => kasaOranlari(d, s.ic, "a", vergi, new Map(makas), new Map());
    const v1 = kolon(1_000_000);
    expect(kolon(1_000_000)).toBe(v1); // aynı girdi: aynı sonuç
    expect(v1.length).toBeGreaterThan(0);
    // soğuk karşılaştırma: dünyanın derin kopyasında (önbellek anahtarı farklı nesne) aynı girdiyle aynı sonuç
    const kopya = structuredClone(d);
    expect(kasaOranlari(kopya, s.ic, "a", 1_000_000, new Map(), new Map())).toEqual(v1);
    // girdi değişimi: vergi, makas ilçe tutarı
    const v2 = kolon(2_000_000);
    expect(v2).not.toEqual(v1);
    expect(kasaOranlari(kopya, s.ic, "a", 2_000_000, new Map(), new Map())).toEqual(v2);
    const v3 = kolon(2_000_000, [["sn_m_ova_merkez", 500_000]]);
    expect(v3.some((e) => e.kalem === "ithalatMakas")).toBe(true);
    expect(kasaOranlari(kopya, s.ic, "a", 2_000_000, new Map([["sn_m_ova_merkez", 500_000]]), new Map())).toEqual(v3);
    // sonra eski girdiye dönüş: önceki sonuç değeri
    expect(kolon(1_000_000)).toEqual(v1);
  });

  it("kasaOranlari ilçe hücre sayısı değişince geçersizleşir (parsel alımı sonrası oranlar yeni dağılıma uyar)", () => {
    const s = hazirla();
    const d = s.dunya;
    const once = kasaOranlari(d, s.ic, "b", 1_000_000, new Map(), new Map());
    tamam(s, "b", { tur: "parsel_al", ilce: "sn_m_liman_merkez", hucreler: hucre("sn_m_liman_merkez", "kirsal", 2), sinif: "kirsal" });
    const sonra = kasaOranlari(d, s.ic, "b", 1_000_000, new Map(), new Map());
    expect(sonra).not.toEqual(once);
    expect(sonra.some((e) => e.sahip.includes("liman"))).toBe(true);
    const soguk = kasaOranlari(structuredClone(d), s.ic, "b", 1_000_000, new Map(), new Map());
    expect(soguk).toEqual(sonra);
  });

  it("para akışı kaydı yerinde güncellenir (aynı oranlar) ve değişen girdide yenilenir; uzun koşuda kasa kayıtları sürer (korunum ayrıca para-guvenligi testlerinde)", () => {
    const s = hazirla();
    for (let i = 0; i < 20; i++) {
      s.calistirKadar(s.dunya.zaman + 7 * SAAT);
      if (i === 7) tamam(s, "a", { tur: "tesis_insa_hucre", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler: bitisikCift(hucre("sn_m_ova_merkez", "kasaba", 4)) });
    }
    const akis = s.dunya.mulk!.oyuncular.find((o) => o.id === "a")!.paraAkisi!;
    expect(akis.t0).toBeLessThanOrEqual(s.dunya.zaman); // son çözümün anı
    expect(akis.kasa.length).toBeGreaterThan(0);
  });
});
