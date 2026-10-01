/**
 * Mülk kipi (S3) özellik testleri, mini-6 parsel fikstürü: bayrak, katılım, arsa fiyatı, sınırlar, çakışma ve uygunluk,
 * hücreli inşaat ve aşamaları, iptal iadesi, tembel arazi vergisi, işletme düğümünün merkeze bağlanıp üretimin pazara
 * ulaşması (merkezler arası MCF ve il içi havuz).
 */
import { describe, expect, it } from "vitest";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { Simulasyon } from "../src/motor";
import { insaatAsamasi, isletmeBul, mulkOyuncuBul, parselFiyati } from "../src/mulk";
import { anlikHazine, anlikMiktar } from "../src/stok";
import { GUN, PPM, SAAT } from "../src/tipler";
import type { BolgeDurumu, CekirdekVeriPaketi, Komut } from "../src/tipler";
import { bitisikGrup, hucreSec, ikinciIlEkle, mulkSim, mulkVeri, tamam, ver } from "./mulk-yardimci";

const F = parselFiksturuYukle("mini-6");
const OVA = "sn_m_ova_merkez";
const OVA_IL = "sn_m_ova";
const LIMAN = "sn_m_liman_merkez";
const LIMAN_IL = "sn_m_liman";
const BIN = 1_000_000; // 1.000 ₺ (mili-para)

function al(ilce: string, hucreler: string[], sinif: "kirsal" | "kasaba" | "sehir" = "kirsal"): Komut {
  return { tur: "parsel_al", ilce, hucreler, sinif };
}

describe("bayrak: mülk kipi yalnız param.mulk + parsel fikstürüyle açılır", () => {
  it("parsel fikstürü yoksa (param.mulk olsa da) bölge kipi: mülk durumu yok, mülk komutları reddedilir", () => {
    const v = miniVeriyiYukle();
    expect(v.param.mulk).toBeDefined();
    const s = Simulasyon.olustur(v, 3);
    expect(s.ic.mulk).toBeUndefined();
    expect(s.dunya.mulk).toBeUndefined();
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova"] } });
    const r = ver(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 1)));
    expect(r).toEqual({ tamam: false, hata: "mulk kipi kapali" });
    expect(ver(s, "a", { tur: "insaat_iptal", insaat: 1 }).tamam).toBe(false);
  });

  it("mülk açık: ilçeler fikstürden, işletme/hücre yok; harita bölgeleri sahipsiz", () => {
    const s = mulkSim([]);
    const m = s.dunya.mulk!;
    expect(m.ilceler.map((c) => c.id)).toEqual(F.ilceler.map((c) => c.id).sort());
    expect(m.ilceler.every((c) => c.satilmisHucre === 0)).toBe(true);
    expect(m.hucreler).toEqual([]);
    expect(s.dunya.bolgeler.every((b) => b.sahip === null && b.merkez === undefined)).toBe(true);
  });
});

describe("katılım (H6 parametre yeri)", () => {
  it("bölgesiz katılım; hazine = hibe (50.000 ₺); bölge listesi reddedilir; tekrar katılım reddedilir", () => {
    const s = mulkSim(["a"]);
    const hibe = s.ic.mulk!.p.yeniOyuncu.hibe;
    expect(hibe).toBe(50_000 * 1000);
    expect(anlikHazine(s.dunya, "a")).toBe(hibe);
    expect(mulkOyuncuBul(s.dunya, "a")).toMatchObject({ araziDegeriMili: 0, ilceHucre: [], sonEtkinlik: 0 });
    const r = s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: ["m_ova"] } });
    expect(r.tamam).toBe(false);
    expect(s.dunya.bolgeler[0]?.sahip).toBeNull();
    expect(s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [] } }).tamam).toBe(false);
  });
});

describe("arsa fiyatı: taban × (1 + 2 · ilçede satılmış pay), hücre başına artımlı, tamsayı", () => {
  it("parselFiyati formülü", () => {
    expect(parselFiyati(BIN, 2 * PPM, 0, 81, 1)).toBe(BIN);
    // satılmış pay %25 (20/80) -> × 1,5
    expect(parselFiyati(BIN, 2 * PPM, 20, 80, 1)).toBe(1_500_000);
    // üç hücre: 0/81, 1/81, 2/81
    // Her hücre tam liraya YUKARI yuvarlanır (§9.4; G7-4): eski değer (aşağı) 3 074 073 idi, yeni 3 075 000 (3 hücre, 81 uygun).
    const yukari = (mili: number): number => Math.ceil(mili / 1000) * 1000;
    const beklenen = [0, 1, 2].reduce((t, k) => t + yukari(Math.floor((BIN * (PPM + Math.floor((2 * PPM * k) / 81))) / PPM)), 0);
    expect(beklenen).toBe(3_075_000);
    expect(parselFiyati(BIN, 2 * PPM, 0, 81, 3)).toBe(beklenen);
    expect(parselFiyati(2_500_000, 2 * PPM, 40, 80, 1)).toBe(5_000_000);
  });

  it("parsel_al hazineden tam fiyatı düşer; hücre değeri, ilçe satılmış sayısı ve arazi değeri güncellenir; ikinci alıcı daha pahalı öder", () => {
    const s = mulkSim(["a", "b"]);
    const d = s.dunya;
    const uygun = d.mulk!.ilceler.find((c) => c.id === OVA)!.uygunHucre;
    const h0 = anlikHazine(d, "a");
    const hA = hucreSec(F, OVA, "kirsal", 3);
    tamam(s, "a", al(OVA, hA));
    const fiyatA = parselFiyati(BIN, 2 * PPM, 0, uygun, 3);
    expect(h0 - anlikHazine(d, "a")).toBe(fiyatA);
    expect(d.mulk!.ilceler.find((c) => c.id === OVA)!.satilmisHucre).toBe(3);
    expect(mulkOyuncuBul(d, "a")!.araziDegeriMili).toBe(fiyatA);
    expect(mulkOyuncuBul(d, "a")!.ilceHucre).toEqual([{ ilce: OVA, hucre: 3 }]);
    const hucreler = d.mulk!.hucreler;
    expect(hucreler.map((h) => h.id)).toEqual([...hA].sort());
    expect(hucreler.reduce((t, h) => t + h.degerMili, 0)).toBe(fiyatA);
    // b aynı ilçede 3 hücre: satılmış 3'ten başlar
    const hb0 = anlikHazine(d, "b");
    tamam(s, "b", al(OVA, hucreSec(F, OVA, "kirsal", 3, 3)));
    const fiyatB = parselFiyati(BIN, 2 * PPM, 3, uygun, 3);
    expect(hb0 - anlikHazine(d, "b")).toBe(fiyatB);
    expect(fiyatB).toBeGreaterThan(fiyatA);
    // kasaba sınıfı taban 2.500 ₺
    const hb1 = anlikHazine(d, "b");
    tamam(s, "b", al(OVA, hucreSec(F, OVA, "kasaba", 1), "kasaba"));
    expect(hb1 - anlikHazine(d, "b")).toBe(parselFiyati(2_500_000, 2 * PPM, 6, uygun, 1));
  });

  it("şehir sınıfı taban 6.500 ₺", () => {
    const s = mulkSim(["a"]);
    const ilce = "sn_m_sehir_merkez";
    const h0 = anlikHazine(s.dunya, "a");
    tamam(s, "a", al(ilce, hucreSec(F, ilce, "sehir", 2), "sehir"));
    const uygun = s.dunya.mulk!.ilceler.find((c) => c.id === ilce)!.uygunHucre;
    expect(h0 - anlikHazine(s.dunya, "a")).toBe(parselFiyati(6_500_000, 2 * PPM, 0, uygun, 2));
  });
});

describe("sınırlar: ilçede ≤ %25 ve ≤ 72 hücre", () => {
  it("%25 sınırı: 81 uygun hücreli ilçede en çok 20 hücre (tek ya da parça parça)", () => {
    const s = mulkSim(["a"]);
    const uygun = s.dunya.mulk!.ilceler.find((c) => c.id === OVA)!.uygunHucre;
    const tavan = Math.floor((uygun * 250_000) / PPM);
    expect(tavan).toBe(20);
    expect(ver(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", tavan + 1))).tamam).toBe(false);
    tamam(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", tavan - 2)));
    expect(ver(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 3, tavan - 2))).tamam).toBe(false);
    tamam(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 2, tavan - 2)));
    expect(ver(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 1, tavan))).tamam).toBe(false);
    // başka ilçede sınır ayrıdır
    tamam(s, "a", al("sn_m_ova_tasra", hucreSec(F, "sn_m_ova_tasra", "kirsal", 5)));
  });

  it("72 sınırı (pay sınırı %100 yapılınca bağlayıcı)", () => {
    const v = mulkVeri((x) => {
      x.param.mulk!.ilcePayTavaniPpm = PPM;
      x.param.mulk!.yeniOyuncu.hibe = 1_000_000_000;
    });
    const s = mulkSim(["a"], v);
    const ilce = "sn_m_gecit_merkez"; // 90 uygun kırsal
    expect(ver(s, "a", al(ilce, hucreSec(F, ilce, "kirsal", 73))).tamam).toBe(false);
    tamam(s, "a", al(ilce, hucreSec(F, ilce, "kirsal", 70)));
    expect(ver(s, "a", al(ilce, hucreSec(F, ilce, "kirsal", 3, 70))).tamam).toBe(false);
    tamam(s, "a", al(ilce, hucreSec(F, ilce, "kirsal", 2, 70)));
    expect(mulkOyuncuBul(s.dunya, "a")!.ilceHucre).toEqual([{ ilce, hucre: 72 }]);
  });

  it("yetersiz hazine: reddedilir ve hazine değişmez", () => {
    const v = mulkVeri((x) => (x.param.mulk!.yeniOyuncu.hibe = 2_500_000));
    const s = mulkSim(["a"], v);
    s.calistirKadar(s.dunya.zaman); // bekleyen (aynı t) çözüm işlensin: özet yalnız komutun etkisini ölçsün
    const ozet = s.durumOzeti();
    expect(ver(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 3))).tamam).toBe(false);
    expect(s.durumOzeti()).toBe(ozet);
    tamam(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 2)));
  });
});

describe("çakışma ve uygunluk", () => {
  it("sahipli, tekrarlanan, başka ilçenin, uygun olmayan, sınıfı uyuşmayan ve bilinmeyen hücre reddedilir; başarısız komut özeti değiştirmez", () => {
    const s = mulkSim(["a", "b"]);
    const hA = hucreSec(F, OVA, "kirsal", 2);
    tamam(s, "a", al(OVA, hA));
    s.calistirKadar(s.dunya.zaman);
    const ozet = s.durumOzeti();
    const reddedilenler: Komut[] = [
      al(OVA, [hA[0] as string]), // a'nın hücresi
      al(OVA, [...hucreSec(F, OVA, "kirsal", 1, 5), ...hucreSec(F, OVA, "kirsal", 1, 5)]), // tekrar
      al(OVA, hucreSec(F, LIMAN, "kirsal", 1)), // başka ilçe
      al(OVA, hucreSec(F, OVA, "kirsal", 1, 0, false)), // uygun değil
      al(OVA, hucreSec(F, OVA, "kasaba", 1)), // sınıf uyuşmuyor (komut kırsal)
      al(OVA, ["1:1"]), // fikstürde yok
      al(OVA, []), // boş
      al("yok_ilce", hucreSec(F, OVA, "kirsal", 1, 5)),
      { tur: "parsel_al", ilce: OVA, hucreler: hucreSec(F, OVA, "kirsal", 1, 5), sinif: "saray" as "kirsal" },
    ];
    for (const k of reddedilenler) {
      expect(ver(s, "b", k).tamam, JSON.stringify(k)).toBe(false);
      expect(s.durumOzeti()).toBe(ozet);
    }
    // aynı hücre kümesinin geri kalanı b için uygundur
    tamam(s, "b", al(OVA, hucreSec(F, OVA, "kirsal", 2, 2)));
    const sahipler = s.dunya.mulk!.hucreler.map((h) => h.sahip).sort();
    expect(sahipler).toEqual(["a", "a", "b", "b"]);
  });
});

describe("işletme düğümü", () => {
  it("ilk parsel ilde (oyuncu, il) işletme düğümünü açar: merkez bağlı, etiketler merkezden, başlangıç kiti yalnız ilk işletmede", () => {
    const s = mulkSim(["a"]);
    const d = s.dunya;
    const n0 = d.bolgeler.length;
    tamam(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 1)));
    tamam(s, "a", al("sn_m_ova_tasra", hucreSec(F, "sn_m_ova_tasra", "kirsal", 1)));
    expect(d.bolgeler.length).toBe(n0 + 1); // aynı ilin iki ilçesi tek düğüm
    tamam(s, "a", al(LIMAN, hucreSec(F, LIMAN, "kirsal", 1)));
    expect(d.bolgeler.length).toBe(n0 + 2);
    const ova = isletmeBul(d, "a", OVA_IL)!;
    const liman = isletmeBul(d, "a", LIMAN_IL)!;
    const bo = d.bolgeler[ova.bolgeIndeksi] as BolgeDurumu;
    const bl = d.bolgeler[liman.bolgeIndeksi] as BolgeDurumu;
    expect(bo).toMatchObject({ id: `${OVA_IL}#a`, sahip: "a", merkez: s.ic.bolgeIndeks["m_ova"], nufus: 0, etiketler: ["ova"] });
    expect(bl.etiketler).toContain("liman");
    expect(ova.merkezBolge).toBe("m_ova");
    const celik = s.ic.malIndeks["celik"] as number;
    expect(anlikMiktar(bo.stoklar[celik]!, d.zaman)).toBe(120_000);
    expect(anlikMiktar(bl.stoklar[celik]!, d.zaman)).toBe(0);
    expect(d.lojistik.kapsam.length).toBe(d.bolgeler.length);
    expect(d.mulk!.isletmeler.map((x) => x.il)).toEqual([LIMAN_IL, OVA_IL].sort());
  });
});

// Yapılar kenar-bitişik hücre ister: yol hücreleri `hucreSec` dilimlerinde boşluk bırakır, bu yüzden bitişik çiftler kullanılır.
const GRUPLAR_A = [0, 1, 2, 3].flatMap((k) => bitisikGrup(F, OVA, "kirsal", 2, k)); // a: 4 çift (8 hücre)
const GRUP_B = bitisikGrup(F, OVA, "kirsal", 2, 4); // b: 1 çift

describe("hücreli inşaat: aşamalar, sınırlar, tamamlanma ve iptal iadesi", () => {
  function hazir() {
    const s = mulkSim(["a", "b"]);
    tamam(s, "a", al(OVA, GRUPLAR_A));
    tamam(s, "b", al(OVA, GRUP_B));
    return s;
  }

  it("yuva, sahiplik, ilçe ve boşluk denetimleri; eşzamanlı en çok 2 inşaat", () => {
    const s = hazir();
    const h = GRUPLAR_A;
    const insa = (hucreler: string[], tesisTuru = "ciftlik"): Komut => ({ tur: "tesis_insa_hucre", ilce: OVA, tesisTuru, hucreler });
    expect(ver(s, "a", insa(h.slice(0, 1))).tamam).toBe(false); // çiftlik 2 yuva
    expect(ver(s, "a", insa(h.slice(0, 3))).tamam).toBe(false);
    expect(ver(s, "a", insa(GRUP_B)).tamam).toBe(false); // b'nin hücreleri
    expect(ver(s, "a", insa(h.slice(0, 1), "rafineri")).tamam).toBe(false); // mülkte yapılamaz
    expect(ver(s, "a", { tur: "tesis_insa", bolge: `${OVA_IL}#a`, tesisTuru: "ciftlik" }).tamam).toBe(false); // eski komut
    tamam(s, "a", insa(h.slice(0, 2)));
    expect(ver(s, "a", insa(h.slice(0, 2))).tamam).toBe(false); // dolu hücre
    expect(ver(s, "a", insa([h[1] as string, h[4] as string])).tamam).toBe(false); // bitişik olmayan hücreler
    tamam(s, "a", insa(h.slice(2, 4)));
    expect(ver(s, "a", insa(h.slice(4, 6))).tamam).toBe(false); // 3. eşzamanlı
    const ins = s.dunya.insaatlar.filter((i) => i.sahip === "a");
    expect(ins.length).toBe(2);
    expect(s.dunya.mulk!.hucreler.filter((x) => x.insaat !== undefined).length).toBe(4);
  });

  it("aşamalar Temel → İskele → Gövde → Tamam (türetilir, olay yok); bitişte tesis hücrelere kurulur", () => {
    const s = hazir();
    const h = hucreSec(F, OVA, "kirsal", 2);
    const kuyrukOnce = s.dunya.kuyruk.filter((o) => o.veri.tur === "insaat_bitti").length;
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: [...h].reverse() });
    expect(s.dunya.kuyruk.filter((o) => o.veri.tur === "insaat_bitti").length).toBe(kuyrukOnce + 1);
    const ins = s.dunya.insaatlar.find((i) => i.sahip === "a")!;
    expect(ins.hucreler).toEqual([...h].sort());
    expect(ins.baslangic).toBe(0);
    const sure = ins.bitis - ins.baslangic!;
    expect(sure).toBeGreaterThan(0);
    expect(insaatAsamasi(ins, 0)).toBe(0);
    expect(insaatAsamasi(ins, Math.floor(sure / 3) + 1)).toBe(1);
    expect(insaatAsamasi(ins, Math.floor((2 * sure) / 3) + 1)).toBe(2);
    expect(insaatAsamasi(ins, ins.bitis - 1)).toBe(2);
    expect(insaatAsamasi(ins, ins.bitis)).toBe(3);
    s.calistirKadar(ins.bitis);
    const b = s.dunya.bolgeler[isletmeBul(s.dunya, "a", OVA_IL)!.bolgeIndeksi]!;
    expect(b.tesisler.length).toBe(1);
    const t = b.tesisler[0]!;
    expect(t.tur).toBe(s.ic.tesisTuruIndeks["ciftlik"]);
    expect(t.hucreler).toEqual([...h].sort());
    for (const id of h) {
      const hc = s.dunya.mulk!.hucreler.find((x) => x.id === id)!;
      expect(hc.tesis).toBe(t.id);
      expect(hc.insaat).toBeUndefined();
    }
    expect(s.dunya.insaatlar.length).toBe(0);
  });

  it("iptal: ödenen para ve malzemenin %50'si iade; hücreler boşalır; planlı insaat_bitti etkisiz", () => {
    const s = hazir();
    const d = s.dunya;
    const h = hucreSec(F, OVA, "kirsal", 2);
    const bi = isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi;
    const celik = s.ic.malIndeks["celik"] as number;
    const parca = s.ic.malIndeks["parca"] as number;
    const tanim = s.ic.tesisTurleri[s.ic.tesisTuruIndeks["ciftlik"] as number]!;
    const hz0 = anlikHazine(d, "a");
    const c0 = anlikMiktar(d.bolgeler[bi]!.stoklar[celik]!, d.zaman);
    const p0 = anlikMiktar(d.bolgeler[bi]!.stoklar[parca]!, d.zaman);
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: h });
    const ins = d.insaatlar.find((i) => i.sahip === "a")!;
    expect(hz0 - anlikHazine(d, "a")).toBe(tanim.insaParasi);
    // b iptal edemez, bilinmeyen inşaat reddedilir
    expect(ver(s, "b", { tur: "insaat_iptal", insaat: ins.id }).tamam).toBe(false);
    expect(ver(s, "a", { tur: "insaat_iptal", insaat: 999_999 }).tamam).toBe(false);
    tamam(s, "a", { tur: "insaat_iptal", insaat: ins.id });
    expect(hz0 - anlikHazine(d, "a")).toBe(tanim.insaParasi - Math.floor(tanim.insaParasi / 2));
    const st = d.bolgeler[bi]!.stoklar;
    expect(c0 - anlikMiktar(st[celik]!, d.zaman)).toBe(tanim.insaMaliyeti["celik"]! / 2);
    expect(p0 - anlikMiktar(st[parca]!, d.zaman)).toBe(tanim.insaMaliyeti["parca"]! / 2);
    expect(d.insaatlar.length).toBe(0);
    expect(d.mulk!.hucreler.every((x) => x.insaat === undefined && x.tesis === undefined)).toBe(true);
    s.calistirKadar(ins.bitis + SAAT);
    expect(d.bolgeler[bi]!.tesisler.length).toBe(0);
    // hücreler yeniden kullanılabilir
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: h });
  });
});

describe("tembel arazi vergisi: haftalık %1 arazi değerine", () => {
  it("vergi oranı = floor(değer × 10 000 / (PPM × 168)); bir haftada değerin ~%1'i tahakkuk eder ve hazine oranına gider olarak girer", () => {
    const v = mulkVeri((x) => (x.param.mulk!.yeniOyuncu.hibe = 500_000_000));
    const s = mulkSim(["a", "b"], v);
    tamam(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 20)));
    s.calistirKadar(1);
    const mo = mulkOyuncuBul(s.dunya, "a")!;
    const deger = mo.araziDegeriMili;
    const oran = Math.floor((deger * 10_000) / (PPM * 168));
    expect(mo.araziVergisi.yerelOran).toBe(oran);
    expect(oran).toBeGreaterThan(0);
    // b'nin arazisi yok: aynı hazine akışında fark yalnız vergidir (iki oyuncu da üretimsiz ve nüfussuz)
    const oa = s.dunya.oyuncular.find((o) => o.id === "a")!;
    const ob = s.dunya.oyuncular.find((o) => o.id === "b")!;
    expect(ob.hazine.yerelOran - oa.hazine.yerelOran).toBe(oran);
    s.calistirKadar(7 * GUN + 1);
    const tahakkuk = anlikMiktar(mo.araziVergisi, s.dunya.zaman);
    expect(tahakkuk).toBe(oran * 168);
    expect(Math.abs(tahakkuk - Math.floor(deger / 100))).toBeLessThanOrEqual(168);
  });
});

describe("işletme düğümü merkeze bağlanır, üretim pazara ulaşır", () => {
  it("ova işletmesindeki çiftliğin tahılı merkezler arası kenarla liman işletmesine taşınır ve ihraç edilir", () => {
    const v = mulkVeri((x) => (x.param.mulk!.yeniOyuncu.hibe = 500_000_000));
    const s = mulkSim(["a"], v);
    const d = s.dunya;
    tamam(s, "a", al(OVA, [0, 1].flatMap((k) => bitisikGrup(F, OVA, "kirsal", 2, k))));
    tamam(s, "a", al(LIMAN, hucreSec(F, LIMAN, "kirsal", 1)));
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: bitisikGrup(F, OVA, "kirsal", 2, 0) });
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: bitisikGrup(F, OVA, "kirsal", 2, 1) });
    const tahil = s.ic.malIndeks["tahil"] as number;
    tamam(s, "a", { tur: "ticaret_emri", bolge: `${LIMAN_IL}#a`, mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    s.calistirKadar(4 * GUN);
    const ova = isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi;
    const liman = isletmeBul(d, "a", LIMAN_IL)!.bolgeIndeksi;
    expect(d.bolgeler[ova]!.uretimToplam[tahil]).toBeGreaterThan(0);
    const akis = d.lojistik.akislar.filter((a) => a.mal === tahil && a.kaynak === ova && a.hedef === liman);
    expect(akis.length).toBeGreaterThan(0);
    // yol merkezler arasıdır (m_ova - m_liman kenarı), süre kenar süresidir
    const kenar = d.kenarlar.find((k) => (k.a === s.ic.bolgeIndeks["m_ova"] && k.b === s.ic.bolgeIndeks["m_liman"]) || (k.b === s.ic.bolgeIndeks["m_ova"] && k.a === s.ic.bolgeIndeks["m_liman"]))!;
    expect(akis[0]!.yol).toEqual([kenar.indeks]);
    expect(akis[0]!.sureMs).toBe(kenar.sureMs);
    const emir = d.bolgeler[liman]!.ticaretEmirleri[0]!;
    expect(emir.gerceklesenSaat).toBeGreaterThan(0);
    expect(d.pazar.oyuncuArzi[tahil]).toBeGreaterThan(0);
    // harita bölgeleri uyur: merkezlerde üretim yok
    expect(d.bolgeler[s.ic.bolgeIndeks["m_ova"] as number]!.uretimToplam[tahil]).toBe(0);
  });

  it("il içi havuz: aynı merkeze bağlı iki ilin işletmeleri arasında yolsuz, süresiz akış", () => {
    const parsel = parselFiksturuYukle("mini-6");
    ikinciIlEkle(parsel, OVA_IL, "sn_m_ova2");
    const v: CekirdekVeriPaketi = mulkVeri((x) => {
      x.parsel = parsel;
      x.param.mulk!.yeniOyuncu.hibe = 500_000_000;
      // ova'ya liman etiketi: ikinci il ihracatı aynı merkezden yapabilsin
      x.harita.bolgeler.find((b) => b.id === "m_ova")!.etiketler.push("liman");
    });
    const s = mulkSim(["a"], v);
    const d = s.dunya;
    tamam(s, "a", al(OVA, hucreSec(parsel, OVA, "kirsal", 2)));
    const ilce2 = "sn_m_ova2_merkez";
    tamam(s, "a", al(ilce2, hucreSec(parsel, ilce2, "kirsal", 1)));
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: OVA, tesisTuru: "ciftlik", hucreler: hucreSec(parsel, OVA, "kirsal", 2) });
    tamam(s, "a", { tur: "ticaret_emri", bolge: "sn_m_ova2#a", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    s.calistirKadar(3 * GUN);
    const tahil = s.ic.malIndeks["tahil"] as number;
    const i1 = isletmeBul(d, "a", OVA_IL)!.bolgeIndeksi;
    const i2 = isletmeBul(d, "a", "sn_m_ova2")!.bolgeIndeksi;
    expect(d.bolgeler[i1]!.merkez).toBe(d.bolgeler[i2]!.merkez);
    const akis = d.lojistik.akislar.find((a) => a.mal === tahil && a.kaynak === i1 && a.hedef === i2);
    expect(akis).toBeDefined();
    expect(akis!.yol).toEqual([]);
    expect(akis!.sureMs).toBe(0);
    expect(d.bolgeler[i2]!.ticaretEmirleri[0]!.gerceklesenSaat).toBeGreaterThan(0);
  });
});

describe("hareketsizlik verisi", () => {
  it("sonEtkinlik yalnız başarılı komutla ilerler", () => {
    const s = mulkSim(["a"]);
    tamam(s, "a", al(OVA, hucreSec(F, OVA, "kirsal", 1)), 5 * SAAT);
    expect(mulkOyuncuBul(s.dunya, "a")!.sonEtkinlik).toBe(5 * SAAT);
    expect(ver(s, "a", al(OVA, ["1:1"]), 9 * SAAT).tamam).toBe(false);
    expect(mulkOyuncuBul(s.dunya, "a")!.sonEtkinlik).toBe(5 * SAAT);
  });
});
