/**
 * Parsel kısa ölçüm koşusu (mini-6 parsel fikstürü): duman koşusu, determinizm, rapor ve komut satırı. Ağır koşu (H6 tanımındaki 60. gün
 * katılımı, tohum 1-10) `BOLGE_AGIR_TEST=1` arkasındadır.
 */
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { GUN, Simulasyon, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import {
  PARSEL_AGIR_GEC_GUN,
  PARSEL_AGIR_TOHUM,
  KALABALIK_DAGILIM,
  ana,
  araziDegeriMili,
  hibeKitDegeri,
  olguKarsilastirmasi,
  parselAna,
  ayristirmaRaporuUret,
  parselArgumanAyristir,
  parselDuzeni,
  parselOzetle,
  parselRaporUret,
  parselTohumKos,
  stokDegeriMili,
  tl,
  yuzde,
} from "../src";
import type { ParselKosuSecenek } from "../src";
import { etkinBotTohumu, karistir, p3bKapat, yurtKapat } from "../src/parsel-kosu";
import { tohumluSira } from "@bolge/botlar";

const KISA: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 4, yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1 } };

/** Duvar saati alanı hariç JSON (determinizm karşılaştırması). */
function sabit(r: ReturnType<typeof parselTohumKos>): string {
  return JSON.stringify({ ...r, sureMs: 0 });
}

const geciciler: string[] = [];
afterEach(() => {
  for (const d of geciciler.splice(0)) rmSync(d, { recursive: true, force: true });
  vi.restoreAllMocks();
});

describe("parsel kısa koşu: düzen ve servet bileşenleri", () => {
  it("varsayılan düzen 8 yerleşik + 3 geç katılan = 11 bot (8–12 aralığında); kimlikler sabit", () => {
    const d = parselDuzeni(undefined, ["ciftci", "sanayici", "pazar"], 10);
    expect(d.oyuncular).toHaveLength(11);
    expect(d.oyuncular.map((o) => o.id)).toEqual(["ciftci_1", "ciftci_2", "ciftci_3", "sanayici_1", "sanayici_2", "tuccar_1", "tuccar_2", "pasif_1", "gec_ciftci", "gec_sanayici", "gec_pazar"]);
    expect(d.oyuncular.filter((o) => o.katilmaGun === 10).map((o) => o.id)).toEqual(["gec_ciftci", "gec_sanayici", "gec_pazar"]);
    expect(() => parselDuzeni({ ciftci: -1 }, [], 10)).toThrow(/gecersiz/);
  });

  it("taze katılımda servet = hibe + kit (stok), arazi 0 (yurt değeri 0); hibe/kit değeri çekirdek parametresinden", () => {
    const veri: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
    const s = Simulasyon.olustur(veri, 1);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_ova_merkez" } });
    const pk = hibeKitDegeri(s);
    expect(pk).toEqual({ hibe: 50_000_000, kit: 35_600_000, toplam: 85_600_000 });
    expect(stokDegeriMili(s, "a")).toBe(pk.kit);
    expect(araziDegeriMili(s, "a")).toBe(0); // 6 yurt hücresi: degerMili 0
    expect(s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a")).toHaveLength(6);
  });

  it("bölge kipi simülasyonunda hibe/kit değeri istenirse açık hata", () => {
    const s = Simulasyon.olustur(miniVeriyiYukle(), 1);
    expect(() => hibeKitDegeri(s)).toThrow(/mulk kipi kapali/);
  });
});

describe("parsel kısa koşu: duman koşusu", () => {
  const r = parselTohumKos(KISA, 1);

  it("tüm botlar katılır ve komut verir; reddedilen komut yok", () => {
    expect(r.oyuncular).toHaveLength(8);
    expect(r.sureGun).toBe(6);
    for (const o of r.oyuncular) {
      expect(o.hucre, o.id).toBeGreaterThanOrEqual(6);
      expect(o.komut, o.id).toBeGreaterThan(0);
      expect(o.basarisiz, o.id).toBe(0);
    }
    expect(r.basarisizNedenleri).toEqual({});
    expect(Object.keys(r.komutTurleri).sort()).toEqual(["ticaret_emri", "yapi_yerlestir"]);
  });

  it("H6: 3 geç katılan olgusu; iki servet biçimi AYNI karar (değişmezlik), arındırılmış karar Y7 + açılış koşulu", () => {
    expect(r.h6.olgular.map((o) => o.gec)).toEqual(["gec_ciftci", "gec_sanayici", "gec_pazar"]);
    for (const o of r.h6.olgular) {
      expect(o.emsal.length, o.gec).toBeGreaterThan(0);
      // Y7 emsal kuralı: medyan yalnız üreten (gelir > 0) emsallerden
      expect(o.emsalUretenSayisi).toBe(o.emsalGelir.filter((x) => x > 0).length);
      expect(o.emsalUretenSayisi).toBeLessThanOrEqual(o.emsal.length);
      expect(o.servetArindirilmis).toBe(o.servetHam - r.hibeKitDegeri);
      expect(o.ulastiHam).toBe(o.ulastiArindirilmis);
      // servet = bileşenlerin toplamı
      expect(o.servetHam).toBe(o.servet.hazine + o.servet.stok + o.servet.arazi + o.servet.yapi);
      // emsal yalnız geç katılandan ÖNCE katılmış, ilçesinde hücresi olan oyuncular
      for (const e of o.emsal) expect(e.startsWith("gec_")).toBe(false);
    }
    expect(r.h6.karar.ikincil.ham.gecKatilan.olguSayisi).toBe(3);
    expect(r.h6.karar.ikincil.arindirilmisServet.verdict).toBe(r.h6.karar.ikincil.ham.verdict);
    expect(r.h6.karar.birincil.y7.olculebilir).toBe(true);
    // Karar kaynağı: birincil karar Y7 + açılış koşulundan türer (servetten ve eski ucuz ölçütten değil)
    const y7 = r.h6.karar.birincil.y7;
    const ac = r.h6.karar.birincil.acilis;
    const beklenen = y7.olculebilir && y7.hedefGecti && ac.olculebilir && ac.hedefGecti ? "gecti" : "kaldi";
    expect(r.h6.karar.birincil.verdict).toBe(beklenen);
    expect(r.h6.karar.birincil.kaynak).toBe("y7_gelir+acilis_kosulu");
  });

  it("Y7 il yedeği ve H6 açılış koşulu olguları: düzey ilçe → il sırasıyla; ayak izi tür yuvasından; ayrılmış boş katılım anı ilçe sayımından", () => {
    const sim = Simulasyon.olustur({ ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") }, 1);
    const mk = sim.ic.mulk!;
    for (const o of r.h6.olgular) {
      // il emsali ilçe emsalini kapsar; düzey seçimi kurala uyar
      for (const e of o.emsal) expect(o.ilEmsal, o.gec).toContain(e);
      expect(o.il, o.gec).toBe(mk.ilceler.get(o.ilce as string)?.il);
      expect(o.ilEmsalUretenSayisi).toBe(o.ilEmsalGelir.filter((x) => x > 0).length);
      expect(o.emsalDuzeyi).toBe(o.emsalUretenSayisi > 0 ? "ilce" : o.ilEmsalUretenSayisi > 0 ? "il" : null);
      // ayak izi: açılışın ilk yapı türlerinin en küçük yuvası (tür verisinden; sabit sayı değil), yurt hariç
      const yuvalar = (o.acilis === "sanayici" ? ["hidro_santrali"] : ["ciftlik", "mera"]).map((t) => mk.yuva[sim.ic.tesisTuruIndeks[t] as number] as number);
      expect(o.ayakIzi, o.gec).toBe(Math.min(...yuvalar));
      expect(o.yurtHucre).toBe(mk.p.yeniOyuncu.yurtHucre);
      // katılım anı ayrılmış boş = o ilçenin geç katılımdan önceki sayımı
      expect(o.ayrilmisBosKatilim, o.gec).toBe(r.h6.ilceler.find((c) => c.ilce === o.ilce)?.ayrilmisBos);
      // olgu kararı kurala uyar: (i) boş ≥ ayak izi; (ii) pencerede yapı
      expect(o.acilisKosulu.tabanYeter).toBe(o.ayrilmisBosKatilim >= o.ayakIzi);
      expect(o.acilisKosulu.tabanYeterYurtDahil).toBe(o.ayrilmisBosKatilim + o.yurtHucre >= o.ayakIzi);
      const pencerede = o.acilisYapiMs.some((t) => t >= o.katilmaGun * GUN && t <= o.katilmaGun * GUN + 14 * GUN);
      if (pencerede) expect(o.acilisKosulu.yapiKuruldu).toBe(true);
    }
    const ac = r.h6.karar.birincil.acilis;
    expect(ac.olculebilir).toBe(true);
    if (ac.olculebilir) expect(ac.olguSayisi).toBe(r.h6.olgular.length);
  });

  it("ucuz hücre: katılımdan hemen ÖNCE ilçe doluluğu (geç katılanın yurdu hariç); ayrılmış hücreler ayrıdır ve garanti ayrıntısıyla tutarlıdır", () => {
    expect(r.h6.ilceler).toHaveLength(12);
    const satilmis = r.h6.ilceler.reduce((t, c) => t + c.satilmisHucre, 0);
    // 5 yerleşik × (6 yurt + en fazla birkaç hücre); geç katılanların 3 × 6 yurdu henüz verilmedi
    expect(satilmis).toBeGreaterThanOrEqual(30);
    expect(satilmis).toBeLessThan(30 + 5 * 4);
    const ayrilmis = r.h6.ilceler.reduce((t, c) => t + c.ayrilmisBos, 0);
    expect(ayrilmis).toBeGreaterThan(50);
    expect(ayrilmis).toBe(r.ayrilmis.gecOncesi.bos); // aynı sayım iki yoldan
    expect(r.h6.ucuz.ayrilmisUcuz + r.h6.ucuz.genelUcuz).toBe(r.h6.ucuz.ucuzHucre);
    expect(r.h6.ucuz.uygunHucre).toBe(r.h6.ilceler.reduce((t, c) => t + c.uygunHucre, 0));
  });

  it("ilçe seçimi: normal (seyrek) dünyada geç katılanlar `ilceSec` ile katılır ('uygun ilçe yok' = 0) ve yapı kurar; neden kaydı olgularda", () => {
    expect(r.uygunIlceYok).toEqual([]);
    expect(r.oyuncular.filter((o) => o.id.startsWith("gec_"))).toHaveLength(3);
    for (const o of r.oyuncular.filter((x) => x.id.startsWith("gec_"))) expect(o.yapi, o.id).toBeGreaterThan(0);
  });

  it("yerlesikIlceSec seçeneği yerleşikleri de `ilceSec`e geçirir; seyrek dünyada hepsi katılır ve sonuç deterministik", () => {
    const a = parselTohumKos({ ...KISA, yerlesikIlceSec: true }, 1);
    expect(a.uygunIlceYok).toEqual([]);
    expect(a.oyuncular).toHaveLength(8);
    expect(sabit(parselTohumKos({ ...KISA, yerlesikIlceSec: true }, 1))).toBe(sabit(a));
  });

  it("ayrılmış hücre garantisi: ihlal yok; geç katılımdan önce ve sonda tutarlı sayım", () => {
    for (const a of [r.ayrilmis.gecOncesi, r.ayrilmis.sonda]) {
      expect(a.ihlal).toBe(0);
      expect(a.guvenceTuttu).toBe(true);
      expect(a.satilan + a.bos).toBe(a.ayrilmisToplam);
    }
    expect(r.ayrilmis.sonda.bos).toBeLessThanOrEqual(r.ayrilmis.gecOncesi.bos); // satış tek yönlü
    expect(r.katilamayan).toEqual([]);
    expect(r.yurtsuz).toBe(0);
  });

  it("H8: Gini ve ilçe payı hesaplanır; yeniden satış yok → karar belirsiz", () => {
    expect(r.h8.gini.oyuncuSayisi).toBe(8);
    expect(r.h8.ilce.tavanAsanCift).toBe(0);
    expect(r.h8.yenidenSatis.satisSayisi).toBe(0);
    expect(r.h8.verdict).toBe("belirsiz");
  });

  it("Y ölçütleri: Y1 anında kurulum, Y2 ölçülür, Y3 ölçülemez (sözleşme yok), Y5 katmanlar, Y6 yön değiştirme yok", () => {
    expect(r.y.y1.sonuc.olculebilir && r.y.y1.sonuc.oranPpm).toBe(1_000_000);
    expect(r.y.y2.dk60.olculebilir).toBe(true);
    expect(r.y.y3.sonuc.olculebilir).toBe(false);
    expect(r.y.y3.hedefGecti).toBeNull();
    expect(r.y.y5.olculebilir).toBe(true);
    // Yeni oyuncu 2 günde ölçülür mü: 6 günlük koşuda 7 gün gözlenemez → Y6 ölçülemez
    expect(r.y.y6.olculebilir).toBe(false);
  });

  it("determinizm: aynı seçenek + tohum → birebir aynı sonuç (durum özeti dahil); farklı tohum farklı özet", () => {
    expect(sabit(parselTohumKos(KISA, 1))).toBe(sabit(r));
    expect(parselTohumKos(KISA, 2).durumOzeti).not.toBe(r.durumOzeti);
  });

  it("sermaye ve gelir tutarlılığı: net üretim geliri = hazine farkı + sermaye; yapı bedeli ödenen (indirimli) tutardır", () => {
    for (const o of r.h6.olgular) {
      expect(o.servet.yapi, o.gec).toBeGreaterThan(0);
      expect(Number.isSafeInteger(o.gelir)).toBe(true);
    }
    // Ciftlik 4.200 ₺ (6.000 × %70) + malzeme: yapı bedeli en az iki indirimli yapıdan büyük olmalı
    const c = r.h6.olgular.find((o) => o.gec === "gec_ciftci")!;
    expect(c.servet.yapi).toBeGreaterThan(2 * 4_200_000);
  });
});

describe("parsel kısa koşu: geç katılan yok ve sınır seçenekleri", () => {
  it("geç katılan yoksa H6 ölçülemez (belirsiz)", () => {
    const r = parselTohumKos({ ...KISA, gecAcilislari: [] }, 1);
    expect(r.h6.olgular).toEqual([]);
    expect(r.h6.karar.ikincil.ham.verdict).toBe("belirsiz");
    expect(r.h6.karar.birincil.verdict).toBe("belirsiz");
    expect(r.h6.y7.olculebilir).toBe(false);
  });

  it("gun < gecGun + olcumGunu reddedilir; gecGun/olcumGunu >= 1", () => {
    expect(() => parselTohumKos({ ...KISA, gun: 5 }, 1)).toThrow(/en az gecGun/);
    expect(() => parselTohumKos({ ...KISA, gecGun: 0 }, 1)).toThrow(/gecGun/);
    expect(() => parselTohumKos({ ...KISA, olcumGunu: 0 }, 1)).toThrow(/olcumGunu/);
  });

  it("7 gün gözlenen oyuncular için Y6 ölçülür (süre ≥ 7 gün)", () => {
    const r = parselTohumKos({ ...KISA, gun: 10, gecGun: 2, olcumGunu: 4 }, 1);
    expect(r.y.y6.olculebilir).toBe(true); // yerleşikler 10 gün gözlendi
  });
});

describe("parsel kısa koşu: spekülatör, ayrılmış hücre garantisi ve H8", () => {
  const SPEK: ParselKosuSecenek = { tohumlar: [1], gecGun: 20, olcumGunu: 10, yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1, spekulator: 3, spekulatorYasli: 3 }, spekulatorGun: 15 };
  const temel = parselTohumKos({ ...SPEK, yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1 } }, 1);
  const r = parselTohumKos(SPEK, 1);

  it("spekülatörler tavanlara dayanır: H8 ilçe payı ≤ %25 (tam %25 'aşmaz'), 72 hücre aşılmaz; yeniden satış yok → belirsiz (neden raporda)", () => {
    expect(r.h8.ilce.enBuyukPayPpm).toBeLessThanOrEqual(250_000);
    expect(r.h8.ilce.payAsanCift).toBe(0);
    expect(r.h8.ilce.tavanAsanCift).toBe(0);
    expect(r.h8.ilce.enBuyuk?.oyuncu.startsWith("spekulator")).toBe(true);
    expect(r.h8.verdict).toBe("belirsiz");
    expect(r.h8.yenidenSatis.satisSayisi).toBe(0);
    const md = parselRaporUret([r], { etiket: "s", tohumlar: [1], gun: 30, gecGun: 20, olcumGunu: 10, iklim: "hizli", agir: false, sureMs: 1, bulgular: "b.md", duzen: { yerlesik: { ...SPEK.yerlesik } as Record<string, number>, gec: ["ciftci"] } });
    expect(md).toContain("çekirdekte oyuncular arası arsa devri/satışı yoktur");
    expect(md).toContain("spekülatör botları");
  });

  it("spekülatörler arsa Gini'sini yükseltir (hücresi olmayanlar dahil nüfus) ama eşiği (%60) aşmaz bu ölçekte", () => {
    expect(r.h8.gini.degerGiniPpm).toBeGreaterThan(temel.h8.gini.degerGiniPpm);
    expect(r.h8.gini.oyuncuSayisi).toBe(r.oyuncular.length);
  });

  it("ayrılmış hücre: ihlal 0 (eski oyuncuya satılmaz); yeni spekülatörler önceki yeni oyuncu olarak ayrılmışı tüketir (kalan pay tabana göre düşük)", () => {
    expect(r.ayrilmis.gecOncesi.ihlal).toBe(0);
    expect(r.ayrilmis.sonda.ihlal).toBe(0);
    expect(r.ayrilmis.gecOncesi.kalanPayPpm).toBeLessThan(temel.ayrilmis.gecOncesi.kalanPayPpm);
    expect(r.ayrilmis.gecOncesi.satilan).toBeGreaterThan(temel.ayrilmis.gecOncesi.satilan);
  });

  it("P2: hiçbir hesap ayrılmış hücre tavanını aşmaz; spekülatörler ayrılmışı tüketir (tavan parametreden okunur)", () => {
    const sim = Simulasyon.olustur({ ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") }, 1);
    const tavan = sim.ic.mulk!.p.yeniOyuncu.ayrilmisHucreHesapTavani;
    expect(tavan).toBeGreaterThan(0);
    for (const o of r.oyuncular) expect(o.ayrilmisHucre, o.id).toBeLessThanOrEqual(tavan as number);
    const spek = r.oyuncular.filter((o) => o.id.startsWith("spekulator"));
    expect(spek.length).toBeGreaterThan(0);
    expect(spek.some((o) => o.ayrilmisHucre > 0)).toBe(true);
  });

  it("spekülatör kalabalığı geç katılan için ucuz hücre payını düşürür", () => {
    expect(r.h6.ucuz.payPpm).toBeLessThan(temel.h6.ucuz.payPpm);
  });

  it("spekülatör koşusu deterministik ve reddedilen komut yok", () => {
    expect(sabit(parselTohumKos(SPEK, 1))).toBe(sabit(r));
    for (const o of r.oyuncular) expect(o.basarisiz, o.id).toBe(0);
  });
});

describe("parsel kısa koşu: tarım ve bakım yönetimi seçenekleri ve karşılaştırma", () => {
  const A: ParselKosuSecenek = { ...KISA, gecGun: 12, olcumGunu: 8 };
  const yok = parselTohumKos(A, 1);
  const yon = parselTohumKos({ ...A, tarimYonetimi: true, bakimYonetimi: true }, 1);

  it("yönetim seçenekleri botlara akar (ekim planı / gübre / parça ithalatı); reddedilen komut yok; durum özeti değişir", () => {
    expect(yon.komutTurleri["ekim_plani"]).toBeGreaterThan(0);
    expect(yok.komutTurleri["ekim_plani"]).toBeUndefined();
    expect(yon.durumOzeti).not.toBe(yok.durumOzeti);
    for (const o of yon.oyuncular) expect(o.basarisiz, o.id).toBe(0);
  });

  it("olguKarsilastirmasi: açılış başına gelir/emsal ve servet/emsal ortalaması (ppm); medyan ≤ 0 olguları dışarıda", () => {
    const k = olguKarsilastirmasi([yok]);
    expect(Object.keys(k).sort()).toEqual(["ciftci", "pazar", "sanayici"]);
    for (const v of Object.values(k)) {
      expect(v.n).toBe(1);
      expect(v.gelirOranPpm === null || v.gelirOranPpm >= 0).toBe(true);
    }
    // Sınır: gelir tam emsal medyanına eşitse oran 1.000.000
    const o0 = yok.h6.olgular[0]!;
    const sahte = { ...yok, h6: { ...yok.h6, olgular: [{ ...o0, gelir: 500, emsalGelirMedyan: 500 }] } };
    expect(Object.values(olguKarsilastirmasi([sahte]))[0]?.gelirOranPpm).toBe(1_000_000);
    const sifir = { ...yok, h6: { ...yok.h6, olgular: [{ ...o0, gelir: 500, emsalGelirMedyan: 0 }] } };
    expect(Object.values(olguKarsilastirmasi([sifir]))[0]?.gelirOranPpm).toBeNull();
  });

  it("rapor: karşılaştırma bölümü, tarım/bakım satırları ve deterministik metin", () => {
    const meta = { etiket: "yon", tohumlar: [1], gun: 20, gecGun: 12, olcumGunu: 8, iklim: "hizli", agir: false, sureMs: 1, bulgular: "b.md", tarimYonetimi: true, bakimYonetimi: true, duzen: { yerlesik: { ciftci: 2 } as Record<string, number>, gec: ["ciftci", "sanayici", "pazar"] as readonly string[] }, karsilastirma: { kaynak: "temel.json", etiket: "temel", sonuclar: [yok] } };
    const md = parselRaporUret([yon], meta);
    expect(md).toContain("## 5a. Önceki koşuyla karşılaştırma (temel)");
    expect(md).toContain("Tarım yönetimi | AÇIK");
    expect(md).toContain("Bakım yönetimi | AÇIK");
    expect(md).toBe(parselRaporUret([yon], meta));
    expect(parselRaporUret([yon], { ...meta, karsilastirma: undefined, tarimYonetimi: false, bakimYonetimi: false })).not.toContain("## 5a.");
  });
});

describe("parsel kalabalık koşu", () => {
  it("varsayılan kalabalık dağılımlar: mini-6 62, sentetik-50 310 yerleşik bot", () => {
    const top = (d: Record<string, number>) => Object.values(d).reduce((t, x) => t + x, 0);
    expect(top(KALABALIK_DAGILIM["mini-6"])).toBe(62);
    expect(top(KALABALIK_DAGILIM["sentetik-50"])).toBe(310);
  });

  it("duman: mini-6'da kalabalık (yerleşik 40+) koşu tamamlanır; doluluk yüksek; yurtsuz oyuncular raporlanır; deterministik", () => {
    const sec: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 3, yerlesik: { ciftci: 14, sanayici: 6, tuccar: 6, pasif: 4, spekulator: 6, spekulatorYasli: 6 } };
    const r = parselTohumKos(sec, 1);
    // Geç katılanlar doygun dünyada `ilceSec` ile "uygun ilçe yok" alabilir (katılmaz, ayrı sayaçta); yerleşikler yedekle katılır.
    expect(r.oyuncular.length + r.uygunIlceYok.length + r.katilamayan.length).toBe(42 + 3);
    expect(r.oyuncular.length).toBeGreaterThanOrEqual(42);
    const sat = r.h6.ilceler.reduce((t, c) => t + c.satilmisHucre, 0);
    const uygun = r.h6.ilceler.reduce((t, c) => t + c.uygunHucre, 0);
    expect(sat * 100).toBeGreaterThan(uygun * 25); // %25'ten fazla dolu
    expect(r.h6.ucuz.payPpm).toBeLessThan(900_000);
    expect(r.ayrilmis.sonda.ihlal).toBe(0);
    expect(sabit(parselTohumKos(sec, 1))).toBe(sabit(r));
    const md = parselRaporUret([r], { etiket: "k", tohumlar: [1], gun: 5, gecGun: 2, olcumGunu: 3, iklim: "hizli", agir: false, sureMs: 1, bulgular: "b.md", duzen: { yerlesik: sec.yerlesik as Record<string, number>, gec: ["ciftci", "sanayici", "pazar"] } });
    expect(md).toContain("| Grup | Oyuncu |");
    expect(md).toContain("Yalnız ilk 16 oyuncu gösterilir");
    if (r.uygunIlceYok.length > 0) expect(md).toContain(`**Uygun ilçe yok: ${r.uygunIlceYok.length}**`);
  }, 120_000);

  it.skipIf(process.env.BOLGE_AGIR_TEST !== "1")("AGIR: sentetik-50'de ~310 bot, 10 gün; süre raporlanır", () => {
    const bas = Date.now();
    const r = parselTohumKos({ tohumlar: [1], harita: "sentetik-50", gecGun: 6, olcumGunu: 4, yerlesik: { ...KALABALIK_DAGILIM["sentetik-50"] } }, 1);
    const sure = Date.now() - bas;
    console.log(`parsel kalabalik sentetik-50: ${r.oyuncular.length} oyuncu, ${r.sureGun} gun, ${(sure / 1000).toFixed(1)} sn, yurtsuz ${r.yurtsuz}, ayrilmis kalan ${r.ayrilmis.gecOncesi.kalanPayPpm}`);
    expect(r.oyuncular.length).toBeGreaterThan(300);
    expect(r.ayrilmis.sonda.ihlal).toBe(0);
  }, 1_800_000);
});

describe("parsel raporu", () => {
  const r = parselTohumKos(KISA, 1);
  const meta = { etiket: "test", tohumlar: [1], gun: 6, gecGun: 2, olcumGunu: 4, iklim: "hizli", agir: false, sureMs: 1234, bulgular: "parsel-test-bulgular.md", duzen: { yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1 }, gec: ["ciftci", "sanayici", "pazar"] as readonly string[] } };

  it("biçim yardımcıları: yüzde ve ₺", () => {
    expect(yuzde(333_333)).toBe("%33,3");
    expect(yuzde(1_000_000)).toBe("%100");
    expect(yuzde(null)).toBe("—");
    expect(tl(85_600_000)).toBe("85.600 ₺");
    expect(tl(-1_234_000)).toBe("-1.234 ₺");
    expect(tl(undefined)).toBe("—");
  });

  it("özet ve Markdown: tüm bölümler, ilk parsel ölçümü uyarısı, v0.3 karşılaştırma notu, insan testi işaretleri", () => {
    const oz = parselOzetle([r]);
    expect(["gecti", "kaldi", "belirsiz"]).toContain(oz.h6.verdict);
    expect(oz.h6.verdict).toBe(r.h6.karar.birincil.verdict); // özet kararı birincilden gelir
    const md = parselRaporUret([r], meta);
    for (const b of ["# Parsel dünyası ölçümü — test", "ilk parsel (mülk kipi) ölçümüdür", "## 1. Özet", "## 2. H6", "## 3. H8", "## 4. Y ölçütleri", "## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu", "v0.3-gercek-t1-3.md", "insan testi", "OLÇÜLEMEZ", "Karar kaynağı", "parsel-test-bulgular.md", "Tohum 1"]) {
      expect(md.toLowerCase(), b).toContain(b.toLowerCase());
    }
    for (const y of ["Y1", "Y2", "Y3", "Y4", "Y5", "Y6", "Y7", "Y8", "Y9", "Y10"]) expect(md).toContain(`| ${y} |`);
  });

  it("rapor determinizmi: aynı sonuç → aynı metin; duvar saati metne girmez (süre değişse de aynı)", () => {
    expect(parselRaporUret([r], meta)).toBe(parselRaporUret([r], meta));
    expect(parselRaporUret([r], meta)).toBe(parselRaporUret([{ ...r, sureMs: 99_999 }], { ...meta, sureMs: 7 }));
  });
});

describe("parsel komut satırı", () => {
  it("argüman ayrıştırma: varsayılanlar, --agir, değerli ve =li biçimler, hatalar", () => {
    const v = parselArgumanAyristir([]);
    expect(v).toMatchObject({ tohum: "1-3", cikti: "raporlar", iklim: "hizli", agir: false, gec: undefined, gun: undefined });
    expect(parselArgumanAyristir(["--agir"]).tohum).toBe(PARSEL_AGIR_TOHUM);
    expect(parselArgumanAyristir(["--agir", "--tohum", "2"]).tohum).toBe("2");
    expect(PARSEL_AGIR_GEC_GUN).toBe(60);
    const a = parselArgumanAyristir(["--tohum=1,3", "--gun", "30", "--gec-gun=5", "--olcum-gunu", "10", "--bot", "ciftci=1,pasif=0", "--gec", "pazar", "--iklim=gercek", "--ad", "v0", "--cikti=x"]);
    expect(parselArgumanAyristir(["--bulgular", "x-bulgular.md"]).bulgular).toBe("x-bulgular.md");
    expect(() => parselArgumanAyristir(["--bulgular", "../x.md"])).toThrow(/--bulgular/);
    expect(a).toMatchObject({ tohum: "1,3", gun: 30, gecGun: 5, olcumGunu: 10, bot: { ciftci: 1, pasif: 0 }, gec: ["pazar"], iklim: "gercek", ad: "v0", cikti: "x" });
    expect(parselArgumanAyristir(["--gec", "yok"]).gec).toEqual([]);
    expect(() => parselArgumanAyristir(["--gun", "1"])).toThrow(/--gun/);
    expect(() => parselArgumanAyristir(["--bot", "ciftci3"])).toThrow(/--bot/);
    expect(() => parselArgumanAyristir(["--gec", "uzay"])).toThrow(/--gec/);
    expect(() => parselArgumanAyristir(["--iklim", "yok"])).toThrow(/--iklim/);
    expect(() => parselArgumanAyristir(["--ad", "a/b"])).toThrow(/--ad/);
    expect(() => parselArgumanAyristir(["--bilinmeyen"])).toThrow(/bilinmeyen/);
    expect(() => parselArgumanAyristir(["--tohum"])).toThrow(/deger/);
  });

  it("yeni seçenekler: --kalabalik, --harita, --tarim-yonetimi, --bakim-yonetimi, --spekulator-gun, --karsilastir ve hatalar", () => {
    const a = parselArgumanAyristir(["--kalabalik", "--harita", "sentetik-50", "--tarim-yonetimi", "--bakim-yonetimi", "--spekulator-gun=20", "--karsilastir", "x.json", "--bot", "spekulator=2,spekulatorYasli=3"]);
    expect(a).toMatchObject({ kalabalik: true, harita: "sentetik-50", tarimYonetimi: true, bakimYonetimi: true, spekulatorGun: 20, karsilastir: "x.json", bot: { spekulator: 2, spekulatorYasli: 3 } });
    expect(parselArgumanAyristir([])).toMatchObject({ kalabalik: false, harita: "mini-6", tarimYonetimi: false, bakimYonetimi: false, spekulatorGun: undefined, karsilastir: undefined });
    expect(parselArgumanAyristir(["--ilce-sec"]).yerlesikIlceSec).toBe(true);
    expect(parselArgumanAyristir([]).yerlesikIlceSec).toBe(false);
    expect(() => parselArgumanAyristir(["--harita", "ankara"])).toThrow(/--harita/);
    expect(() => parselArgumanAyristir(["--spekulator-gun", "-1"])).toThrow(/--spekulator-gun/);
  });

  it("kalabalık + tarım/bakım + karşılaştırma uçtan uca: iki dosya yazılır, karşılaştırma bölümü ve yurtsuz/grup tablosu raporda", () => {
    const dizin = mkdtempSync(join(tmpdir(), "parsel-olcum-"));
    geciciler.push(dizin);
    vi.spyOn(console, "log").mockImplementation(() => {});
    const ortak = ["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "3", "--cikti", dizin];
    parselAna([...ortak, "--ad", "temel"]);
    parselAna([...ortak, "--kalabalik", "--tarim-yonetimi", "--bakim-yonetimi", "--karsilastir", join(dizin, "parsel-temel.json"), "--ad", "kal", "--bulgular", "parsel-x-bulgular.md"]);
    const md = readFileSync(join(dizin, "parsel-kal.md"), "utf8");
    expect(md).toContain("## 5a. Önceki koşuyla karşılaştırma");
    expect(md).toContain("| Grup | Oyuncu |");
    expect(md).toContain("[parsel-x-bulgular.md](parsel-x-bulgular.md)");
    expect(md).not.toContain("Toplam süre");
    const j = JSON.parse(readFileSync(join(dizin, "parsel-kal.json"), "utf8")) as { kalabalik: boolean; tarimYonetimi: boolean; bakimYonetimi: boolean; karsilastirma?: unknown; duzen: { yerlesik: Record<string, number> } };
    expect(j).toMatchObject({ kalabalik: true, tarimYonetimi: true, bakimYonetimi: true });
    expect(j.karsilastirma).toBeUndefined(); // önceki koşunun tamamı JSON'a kopyalanmaz
    expect(j.duzen.yerlesik["spekulator"]).toBe(8);
    expect(() => parselAna([...ortak, "--karsilastir", join(dizin, "yok.json"), "--ad", "z"])).toThrow();
    writeFileSync(join(dizin, "bozuk.json"), "{}");
    expect(() => parselAna([...ortak, "--karsilastir", join(dizin, "bozuk.json"), "--ad", "z"])).toThrow(/gecerli bir parsel/);
  }, 120_000);

  it("--kip: parsel yönlenir (yardım basar, koşu yapmaz); geçersiz kip hata; kip verilmezse bölge yolu (yardım)", () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    ana(["--kip", "parsel", "--yardim"]);
    expect(log.mock.calls.join("\n")).toContain("Kisa parsel olcumu");
    log.mockClear();
    ana(["--yardim"]);
    expect(log.mock.calls.join("\n")).toContain("--hip");
    expect(() => ana(["--kip", "yok"])).toThrow(/--kip/);
    expect(() => ana(["--kip=yok"])).toThrow(/--kip/);
  });

  it("kısa koşu rapor dosyalarını yazar (parsel-<ad>.json/.md); gun < gec+olcum hata", () => {
    const dizin = mkdtempSync(join(tmpdir(), "parsel-olcum-"));
    geciciler.push(dizin);
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    parselAna(["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "4", "--bot", "ciftci=2,sanayici=1,tuccar=1,pasif=1", "--cikti", dizin, "--ad", "duman"]);
    expect(log).toHaveBeenCalled();
    expect(existsSync(join(dizin, "parsel-duman.json"))).toBe(true);
    expect(existsSync(join(dizin, "parsel-duman.md"))).toBe(true);
    const j = JSON.parse(readFileSync(join(dizin, "parsel-duman.json"), "utf8")) as { kip: string; tohumBasina: unknown[]; gun: number; ozet: { h6: unknown } };
    expect(j.kip).toBe("parsel");
    expect(j.gun).toBe(6);
    expect(j.tohumBasina).toHaveLength(1);
    expect(j.ozet.h6).toBeDefined();
    expect(() => parselAna(["--gun", "3", "--gec-gun", "2", "--olcum-gunu", "4", "--cikti", dizin])).toThrow(/en az/);
  });
});

describe("ayrıştırma: P3b kapatma, ilceSec önceliği ve ayrıştırma tablosu", () => {
  const SPEK: ParselKosuSecenek = { tohumlar: [1], gecGun: 20, olcumGunu: 10, yerlesik: { ciftci: 2, sanayici: 1, tuccar: 1, pasif: 1, spekulator: 3, spekulatorYasli: 3 }, spekulatorGun: 15 };

  it("p3bKapat: yalnız veri kopyasını değiştirir (orijinal ve parametreler.json değişmez); kapalı değilse aynı nesne", () => {
    const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
    const yo0 = JSON.stringify(v.param.mulk!.yeniOyuncu);
    expect(p3bKapat(v, false)).toBe(v);
    const k = p3bKapat(v, true);
    expect(k).not.toBe(v);
    const yo = k.param.mulk!.yeniOyuncu;
    expect(yo.ayrilmisYalnizKatilimIlcesi).toBe(false);
    expect(yo.ayrilmisIlceGunlukPpm).toBeUndefined();
    expect(yo.ayrilmisIlceGunlukEnAz).toBeUndefined();
    expect(yo.ayrilmisHucreHesapTavani).toBe(v.param.mulk!.yeniOyuncu.ayrilmisHucreHesapTavani); // 12 tavanı sürer
    expect(JSON.stringify(v.param.mulk!.yeniOyuncu)).toBe(yo0); // orijinal dokunulmadı
    // Parametre dosyasında kurallar AÇIK olmalı (kapatma gerçekten bir şeyi kapatıyor)
    expect(v.param.mulk!.yeniOyuncu.ayrilmisYalnizKatilimIlcesi).toBe(true);
    expect(v.param.mulk!.yeniOyuncu.ayrilmisIlceGunlukPpm).toBeGreaterThan(0);
  });

  it("p3bKapali koşusu: kapalıyken genç spekülatörler daha çok ayrılmış alır, hesap tavanı (12) sürer, reddedilen komut yok, deterministik", () => {
    const acik = parselTohumKos(SPEK, 1);
    const kapali = parselTohumKos({ ...SPEK, p3bKapali: true }, 1);
    for (const o of acik.oyuncular.filter((x) => x.id.startsWith("spekulator") && !x.id.startsWith("spekulator_yasli"))) expect(o.ayrilmisHucre, o.id).toBeLessThanOrEqual(12);
    // Kapalıyken genç spekülatörler daha çok ayrılmış alır (kurallar bunu kısıyordu)
    const genc = (r: typeof acik) => r.oyuncular.filter((x) => x.id.startsWith("spekulator") && !x.id.startsWith("spekulator_yasli")).reduce((t, x) => t + x.ayrilmisHucre, 0);
    expect(genc(kapali)).toBeGreaterThan(genc(acik));
    // Hesap tavanı (12/hesap) kapalıyken de sürer; reddedilen komut yok
    for (const o of kapali.oyuncular) {
      expect(o.ayrilmisHucre, o.id).toBeLessThanOrEqual(12);
      expect(o.basarisiz, o.id).toBe(0);
    }
    expect(parselTohumKos({ ...SPEK, p3bKapali: true }, 1).ayrilmis.gecOncesi).toEqual(kapali.ayrilmis.gecOncesi); // deterministik
  });

  it("ilceSec önceliği kapatılabilir (varsayılan AÇIK); aynı koşuda açık ile kapalı olgu alanları tutarlı", () => {
    const a = parselTohumKos({ ...SPEK, ayrilmisOnceligi: false }, 1);
    const b = parselTohumKos(SPEK, 1);
    for (const r of [a, b]) for (const o of r.h6.olgular) expect(o.acilisKosulu.tabanYeter).toBe(o.ayrilmisBosKatilim >= o.ayakIzi);
    expect(a.h6.olgular.map((o) => o.ilceNedeni).join("|")).not.toContain("once taban hucre");
    expect(b.h6.olgular.map((o) => o.ilceNedeni).join("|")).toContain("once taban hucre");
  });

  it("CLI bayrakları: --oncelik-kapali, --p3b-kapali, --ayristirma; ayrıştırma raporu deterministik ve ayarları gösterir", () => {
    expect(parselArgumanAyristir([])).toMatchObject({ ayrilmisOnceligi: true, p3bKapali: false, ayristirma: undefined });
    expect(parselArgumanAyristir(["--oncelik-kapali", "--p3b-kapali"])).toMatchObject({ ayrilmisOnceligi: false, p3bKapali: true });
    expect(parselArgumanAyristir(["--ayristirma", "a.json,b.json"]).ayristirma).toEqual(["a.json", "b.json"]);
    expect(() => parselArgumanAyristir(["--ayristirma", "a.json"])).toThrow(/en az iki/);
    const a = parselTohumKos(SPEK, 1);
    const b = parselTohumKos({ ...SPEK, p3bKapali: true }, 1);
    const girdiler = [
      { dosya: "a.json", etiket: "a", ayrilmisOnceligi: true, p3bKapali: false, sonuclar: [a] },
      { dosya: "b.json", etiket: "b", ayrilmisOnceligi: true, p3bKapali: true, sonuclar: [b] },
    ];
    const md = ayristirmaRaporuUret(girdiler, { etiket: "t", bulgular: "x.md" });
    expect(md).toBe(ayristirmaRaporuUret(girdiler, { etiket: "t", bulgular: "x.md" }));
    expect(md).toContain("P3b KAPALI · ilceSec önceliği AÇIK");
    expect(md).toContain("P3b AÇIK · ilceSec önceliği AÇIK");
    expect(md).not.toMatch(/\d+ ms|sureMs/);
    // tablodaki genç spekülatör sayıları sonuçlardan türer
    const gencA = a.oyuncular.filter((x) => x.id.startsWith("spekulator") && !x.id.startsWith("spekulator_yasli")).reduce((t, x) => t + x.ayrilmisHucre, 0);
    expect(md).toContain(`| a | 1 | ${a.ayrilmis.gecOncesi.bos} / ${a.ayrilmis.gecOncesi.ayrilmisToplam} |`);
    expect(md).toContain(`| ${gencA} |`);
  });

  it("--p3b-kapali ve --oncelik-kapali raporda görünür (meta satırları); varsayılanda görünmez", () => {
    const dizin = mkdtempSync(join(tmpdir(), "parsel-ayr-"));
    geciciler.push(dizin);
    vi.spyOn(console, "log").mockImplementation(() => {});
    parselAna(["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "4", "--bot", "ciftci=2,sanayici=1,tuccar=1,pasif=1", "--cikti", dizin, "--ad", "kapali", "--p3b-kapali", "--oncelik-kapali"]);
    parselAna(["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "4", "--bot", "ciftci=2,sanayici=1,tuccar=1,pasif=1", "--cikti", dizin, "--ad", "acik"]);
    const kapali = readFileSync(join(dizin, "parsel-kapali.md"), "utf8");
    const acik = readFileSync(join(dizin, "parsel-acik.md"), "utf8");
    expect(kapali).toContain("AYRIŞTIRMA: P3b çok hesap kuralları");
    expect(kapali).toContain("AYRIŞTIRMA: ilceSec ayrılmış önceliği");
    expect(acik).not.toContain("AYRIŞTIRMA");
    // ayrıştırma modu koşu yapmadan iki JSON'dan tablo üretir
    parselAna(["--ayristirma", `${join(dizin, "parsel-acik.json")},${join(dizin, "parsel-kapali.json")}`, "--cikti", dizin, "--ad", "tablo"]);
    const tablo = readFileSync(join(dizin, "parsel-tablo.md"), "utf8");
    expect(tablo).toContain("P3b KAPALI · ilceSec önceliği KAPALI");
    expect(tablo).toContain("P3b AÇIK · ilceSec önceliği AÇIK");
  });
});

describe("ayrıştırma: P3d yurt kuralı kapatma", () => {
  it("yurtKapat: yalnız veri kopyası; kural parametrede AÇIKken kapalı koşuda yurt ayrılmış hücre alabilir (sayı ≥), CLI bayrağı ve rapor satırı", () => {
    const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
    expect(v.param.mulk!.yeniOyuncu.yurtAyrilmisSonra).toBe(true); // parametrede AÇIK
    expect(yurtKapat(v, false)).toBe(v);
    const k = yurtKapat(v, true);
    expect(k.param.mulk!.yeniOyuncu.yurtAyrilmisSonra).toBe(false);
    expect(v.param.mulk!.yeniOyuncu.yurtAyrilmisSonra).toBe(true); // orijinal dokunulmadı
    expect(k.param.mulk!.yeniOyuncu.ayrilmisYalnizKatilimIlcesi).toBe(v.param.mulk!.yeniOyuncu.ayrilmisYalnizKatilimIlcesi); // P3b ayarına dokunmaz
    const SEC: ParselKosuSecenek = { tohumlar: [1], gecGun: 2, olcumGunu: 4, yerlesik: { ciftci: 4, sanayici: 2, tuccar: 2, pasif: 2 } };
    const acik = parselTohumKos(SEC, 1);
    const kapali = parselTohumKos({ ...SEC, yurtKapali: true }, 1);
    // Yurt kuralı AÇIKken yurt hücrelerinden ayrılmış olan, kapalıdakinden fazla olamaz
    const yurtAyr = (r: typeof acik) => r.oyuncular.reduce((t, o) => t + o.ayrilmisHucre, 0);
    expect(yurtAyr(acik)).toBeLessThanOrEqual(yurtAyr(kapali));
    expect(parselArgumanAyristir(["--yurt-kurali-kapali"]).yurtKapali).toBe(true);
    expect(parselArgumanAyristir([]).yurtKapali).toBe(false);
    const dizin = mkdtempSync(join(tmpdir(), "parsel-yurt-"));
    geciciler.push(dizin);
    vi.spyOn(console, "log").mockImplementation(() => {});
    parselAna(["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "4", "--bot", "ciftci=2,sanayici=1,tuccar=1,pasif=1", "--cikti", dizin, "--ad", "yk", "--yurt-kurali-kapali"]);
    expect(readFileSync(join(dizin, "parsel-yk.md"), "utf8")).toContain("AYRIŞTIRMA: P3d yurt kuralı");
    const md = ayristirmaRaporuUret([
      { dosya: "a.json", etiket: "a", ayrilmisOnceligi: true, p3bKapali: false, yurtKapali: false, sonuclar: [acik] },
      { dosya: "d.json", etiket: "d", ayrilmisOnceligi: true, p3bKapali: false, yurtKapali: true, sonuclar: [kapali] },
    ], { etiket: "t", bulgular: "x.md" });
    expect(md).toContain("yurt kuralı AÇIK");
    expect(md).toContain("yurt kuralı KAPALI");
  });
});

describe("bot tohumu: deterministik varyans kaynağı (varsayılan davranış değişmez)", () => {
  const SPEK: ParselKosuSecenek = { tohumlar: [1], gecGun: 20, olcumGunu: 10, yerlesik: { ciftci: 3, sanayici: 2, tuccar: 2, pasif: 1, spekulator: 3, spekulatorYasli: 3 }, spekulatorGun: 15 };

  it("karistir: deterministik permütasyon, girdiyi değiştirmez; etkinBotTohumu: tanımsızsa tanımsız, aksi halde (bot, koşu) tohumuna bağlı", () => {
    const g = [1, 2, 3, 4, 5, 6, 7, 8];
    expect(karistir(g, 5)).toEqual(karistir(g, 5));
    expect([...karistir(g, 5)].sort((a, b) => a - b)).toEqual(g);
    expect(g).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(karistir(g, 5)).not.toEqual(karistir(g, 6));
    expect(etkinBotTohumu(undefined, 3)).toBeUndefined();
    expect(etkinBotTohumu(7, 1)).not.toBe(etkinBotTohumu(7, 2));
    expect(etkinBotTohumu(7, 1)).not.toBe(etkinBotTohumu(8, 1));
    expect(etkinBotTohumu(7, 1)).toBe(etkinBotTohumu(7, 1));
  });

  it("tohumluSira: tohum yoksa kimlik sırası (eski davranış); tohumluyken eşitlik hariç antisimetrik, deterministik ve tohuma bağlı", () => {
    expect(tohumluSira(undefined, "b", "x", "y")).toBe(-1);
    expect(tohumluSira(undefined, "b", "y", "x")).toBe(1);
    expect(tohumluSira(undefined, "b", "x", "x")).toBe(0);
    const ids = ["a", "b", "c", "d", "e", "f", "g", "h"];
    for (const a of ids) for (const b of ids) expect(Math.sign(tohumluSira(3, "bot", a, b)) + Math.sign(tohumluSira(3, "bot", b, a))).toBe(0);
    const sira = (t: number) => [...ids].sort((a, b) => tohumluSira(t, "bot", a, b)).join("");
    expect(sira(3)).toBe(sira(3));
    expect(new Set([1, 2, 3, 4, 5].map(sira)).size).toBeGreaterThan(1); // tohum sırayı değiştirir
  });

  it("VARSAYILAN DEĞİŞMEZ: botTohum verilmezse sonuç tohumsuz koşuyla bayt bayt aynı; verilince farklı tohumlar farklı sonuç verir, aynı tohum tekrar aynı, reddedilen komut yok", () => {
    const j = (r: ReturnType<typeof parselTohumKos>) => JSON.stringify({ ...r, sureMs: 0 });
    const temel = parselTohumKos(SPEK, 1);
    expect(j(parselTohumKos({ ...SPEK, botTohum: undefined }, 1))).toBe(j(temel));
    const farkli = [1, 2, 3].map((b) => parselTohumKos({ ...SPEK, botTohum: b }, 1));
    expect(j(parselTohumKos({ ...SPEK, botTohum: 2 }, 1))).toBe(j(farkli[1] as typeof temel));
    expect(new Set(farkli.map((r) => r.durumOzeti)).size).toBeGreaterThan(1); // varyans gerçekten var
    for (const r of farkli) {
      for (const o of r.oyuncular) expect(o.basarisiz, o.id).toBe(0);
      expect(r.ayrilmis.gecOncesi.ihlal).toBe(0);
      expect(r.h6.olgular.map((o) => o.gec)).toEqual(["gec_ciftci", "gec_sanayici", "gec_pazar"]); // rapor sırası sabit
    }
  });

  it("CLI: --bot-tohum ayrıştırılır (negatif/kesirli hata); raporda ve JSON'da görünür, varsayılanda görünmez", () => {
    expect(parselArgumanAyristir([]).botTohum).toBeUndefined();
    expect(parselArgumanAyristir(["--bot-tohum", "7"]).botTohum).toBe(7);
    expect(() => parselArgumanAyristir(["--bot-tohum", "-1"])).toThrow(/--bot-tohum/);
    expect(() => parselArgumanAyristir(["--bot-tohum", "1.5"])).toThrow(/--bot-tohum/);
    const dizin = mkdtempSync(join(tmpdir(), "parsel-bt-"));
    geciciler.push(dizin);
    vi.spyOn(console, "log").mockImplementation(() => {});
    const ortak = ["--tohum", "1", "--gec-gun", "2", "--olcum-gunu", "4", "--bot", "ciftci=2,sanayici=1,tuccar=1,pasif=1", "--cikti", dizin];
    parselAna([...ortak, "--ad", "bt", "--bot-tohum", "7"]);
    parselAna([...ortak, "--ad", "yok"]);
    expect(readFileSync(join(dizin, "parsel-bt.md"), "utf8")).toContain("BOT TOHUMU (varyans) | 7");
    expect(readFileSync(join(dizin, "parsel-yok.md"), "utf8")).not.toContain("BOT TOHUMU");
    expect((JSON.parse(readFileSync(join(dizin, "parsel-bt.json"), "utf8")) as { botTohum?: number }).botTohum).toBe(7);
    expect((JSON.parse(readFileSync(join(dizin, "parsel-yok.json"), "utf8")) as { botTohum?: number }).botTohum).toBeUndefined();
  });
});

describe("parsel ağır koşu (BOLGE_AGIR_TEST=1)", () => {
  it.skipIf(process.env.BOLGE_AGIR_TEST !== "1")("H6 tanımındaki 60. gün katılımı: 74 gün, tohum 1-3; geç katılan olguları ölçülür", () => {
    for (const t of [1, 2, 3]) {
      const r = parselTohumKos({ tohumlar: [t], gecGun: 60, olcumGunu: 14 }, t);
      expect(r.sureGun).toBe(74);
      expect(r.h6.olgular).toHaveLength(3);
      expect(r.h6.karar.ikincil.ham.gecKatilan.olculebilir).toBeGreaterThan(0);
      expect(GUN).toBe(86_400_000);
    }
  }, 600_000);
});
