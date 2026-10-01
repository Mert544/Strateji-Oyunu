/**
 * Botlar ve sanayi katmanı (B2): santral (elektrik açığı, yakıt yöntemi), ölçek, bakım düzeyi/onarım ve keşif sondajı adayları;
 * kur_ve_unut ilk planında bakım düzeyi; kapalı mod; determinizm; entegrasyon (çekirdek komutları kabul eder).
 */
import { describe, expect, it } from "vitest";
import { GUN, PPM, SAAT, Simulasyon } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { Bakis, botOlustur, kos, sanayiAdaylari } from "../src";

/** Mini harita (varsayılan: sanayi açık, başlangıç santralleri var); verilen bölgeler `a` oyuncusunundur. */
function kur(bolgeler: string[], duzenle?: (v: VeriPaketi) => void, tohum = 1): Simulasyon {
  const v = miniVeriyiYukle();
  v.param.baslangic.hazine = 5_000_000_000;
  for (const m of v.icerik.mallar) if (m.depolanabilir !== false) v.param.baslangic.stok[m.id] = 3_000_000;
  duzenle?.(v);
  const s = Simulasyon.olustur(v, tohum);
  s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler } });
  s.calistirKadar(0);
  return s;
}

/** Bölgenin başlangıç santrallerini söker. */
function santralsiz(v: VeriPaketi, ...bolgeler: string[]): void {
  for (const b of v.harita.bolgeler) if (bolgeler.includes(b.id)) b.tesisler = b.tesisler.filter((t) => t !== "santral" && t !== "hidro_santrali");
}

function bolgeDurumu(s: Simulasyon, id: string) {
  return s.dunya.bolgeler[s.ic.bolgeIndeks[id] as number]!;
}

function kabul(s: Simulasyon, komut: Komut): void {
  const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut });
  if (!r.tamam) throw new Error(`komut reddedildi (${komut.tur}): ${r.hata}`);
}

describe("sanayiAdaylari: kapalı mod ve genel", () => {
  it("sanayi kapalıysa boş döner; bölge elektrik durumu olmayan dünyada hata vermez", () => {
    const v = miniVeriyiYukle();
    delete v.param.sanayi;
    const s = Simulasyon.olustur(v, 1);
    s.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_sehir"] } });
    s.calistirKadar(2 * SAAT);
    expect(sanayiAdaylari(new Bakis(s, "a"), { santral: true, olcek: true, bakim: "dengeli", sondaj: true })).toEqual([]);
  });

  it("deterministik: aynı durumda aynı adaylar", () => {
    const s = kur(["m_sehir", "m_liman"], (v) => santralsiz(v, "m_sehir"));
    s.calistirKadar(3 * SAAT);
    const a = JSON.stringify(sanayiAdaylari(new Bakis(s, "a"), { santral: true, olcek: true, bakim: "dengeli", sondaj: true }));
    const b = JSON.stringify(sanayiAdaylari(new Bakis(s, "a"), { santral: true, olcek: true, bakim: "dengeli", sondaj: true }));
    expect(a).toBe(b);
  });
});

describe("santral: elektrik açığında inşa ve yakıt yöntemi", () => {
  it("santralsiz bölgede tüketici tesis varsa santral inşası önerilir; çekirdek kabul eder ve elektrik gelir", () => {
    const s = kur(["m_sehir", "m_liman"], (v) => santralsiz(v, "m_sehir"));
    s.calistirKadar(3 * SAAT);
    expect(bolgeDurumu(s, "m_sehir").elektrik!.karsilanmaPpm).toBe(0);
    const adaylar = sanayiAdaylari(new Bakis(s, "a"), { santral: true });
    const insa = adaylar.find((x) => x.komut.tur === "tesis_insa" && x.komut.bolge === "m_sehir");
    expect(insa).toBeDefined();
    expect(insa!.kategori).toBe("enerji");
    expect((insa!.komut as { tesisTuru: string }).tesisTuru).toBe("santral");
    expect(insa!.tahminiFayda).toBeGreaterThan(0);
    kabul(s, insa!.komut);
    s.calistirKadar(s.dunya.zaman + 9 * SAAT);
    expect(bolgeDurumu(s, "m_sehir").elektrik!.karsilanmaPpm).toBe(PPM);
    // açık kapandı: yeni santral önerilmez
    expect(sanayiAdaylari(new Bakis(s, "a"), { santral: true }).filter((x) => x.komut.tur === "tesis_insa")).toEqual([]);
  });

  it("inşaat sürerken aynı bölge için ikinci santral önerilmez (kapasite inşaattakini de sayar)", () => {
    const s = kur(["m_sehir", "m_liman"], (v) => santralsiz(v, "m_sehir"));
    s.calistirKadar(3 * SAAT);
    const insa = sanayiAdaylari(new Bakis(s, "a"), { santral: true }).find((x) => x.komut.tur === "tesis_insa")!;
    kabul(s, insa.komut);
    expect(sanayiAdaylari(new Bakis(s, "a"), { santral: true }).filter((x) => x.komut.tur === "tesis_insa" && x.komut.bolge === "m_sehir")).toEqual([]);
  });

  it("kömür erişilemez, yakıt bolsa kömür santrali yakıt jeneratörüne geçer; elektrik geri gelir", () => {
    // a: yalnız m_sehir + m_liman (kömür üreten bölge yok); m_sehir'de kömür stoku yok, yakıt bol
    const s = kur(["m_sehir", "m_liman"], (v) => {
      v.param.baslangic.stok["komur"] = 0;
      v.param.baslangic.stok["yakit"] = 9_000_000;
    });
    s.calistirKadar(6 * SAAT);
    expect(bolgeDurumu(s, "m_sehir").elektrik!.karsilanmaPpm).toBeLessThan(900_000);
    const gecis = sanayiAdaylari(new Bakis(s, "a"), { santral: true }).find((x) => x.komut.tur === "yontem_degistir" && x.komut.bolge === "m_sehir");
    expect(gecis).toBeDefined();
    expect((gecis!.komut as { yontem: string }).yontem).toBe("yakit_jeneratoru");
    kabul(s, gecis!.komut);
    s.calistirKadar(s.dunya.zaman + 3 * SAAT);
    expect(bolgeDurumu(s, "m_sehir").elektrik!.karsilanmaPpm).toBe(PPM);
  });

  it("elektrik girdili yeni tesis, elektriği kıt bölgede inşa edilmez (önce santral)", async () => {
    const { insaAdaylari } = await import("../src");
    const s = kur(["m_sehir", "m_liman"], (v) => santralsiz(v, "m_sehir"));
    s.calistirKadar(3 * SAAT);
    const adaylar = insaAdaylari(new Bakis(s, "a"), { hepsi: true });
    // m_sehir şebekesi çökmüş (K = 0): hiçbir elektrik girdili tesis m_sehir'de önerilmez
    for (const a of adaylar) {
      if (a.komut.tur === "tesis_insa" && a.komut.bolge === "m_sehir") {
        const tur = s.ic.tesisTurleri[s.ic.tesisTuruIndeks[a.komut.tesisTuru] as number]!;
        const y = s.ic.yontemler[s.ic.yontemIndeks[tur.yontemler[0] as string] as number]!;
        expect(y.girdiler["elektrik"] ?? 0).toBe(0);
      }
    }
  });
});

describe("ölçek yükseltme", () => {
  it("elektrik payı, işgücü ve girdisi olan iyi çalışan tesiste aday çıkar; çekirdek kabul eder, kademe artar", () => {
    const s = kur(["m_dag", "m_col", "m_gecit", "m_ova"], (v) => {
      for (const b of v.harita.bolgeler) b.nufus = 600_000;
    });
    s.calistirKadar(2 * GUN);
    const adaylar = sanayiAdaylari(new Bakis(s, "a"), { santral: false, olcek: true, bakim: false });
    expect(adaylar.length).toBeGreaterThan(0);
    const a = adaylar[0]!;
    expect(a.komut.tur).toBe("tesis_olcek_yukselt");
    expect(a.kategori).toBe("olcek");
    kabul(s, a.komut);
    s.calistirKadar(s.dunya.zaman + 12 * SAAT);
    const k = a.komut as { bolge: string; tesis: number; olcek: 1 | 2 };
    expect(bolgeDurumu(s, k.bolge).tesisler.find((t) => t.id === k.tesis)!.olcek).toBe(k.olcek);
  });

  it("aday en çok 3; L ölçek `otomasyon` olmadan önerilmez", () => {
    const s = kur(["m_dag", "m_col", "m_gecit", "m_ova"], (v) => {
      for (const b of v.harita.bolgeler) b.nufus = 600_000;
    });
    s.calistirKadar(2 * GUN);
    const adaylar = sanayiAdaylari(new Bakis(s, "a"), { santral: false, olcek: true, bakim: false });
    expect(adaylar.length).toBeLessThanOrEqual(3);
    for (const a of adaylar) expect((a.komut as { olcek: number }).olcek).toBe(1);
  });
});

describe("bakım düzeyi ve genel onarım", () => {
  it("aşınma yüksekse yüksek düzey önerilir; hazine tehlikedeyken ve aşınma azken asgari; tasarrufçu hep asgari", () => {
    const s = kur(["m_sehir", "m_ova"]);
    s.calistirKadar(2 * SAAT);
    for (const b of s.dunya.bolgeler) for (const t of b.tesisler) t.asinmaPpm = b.sahip === "a" ? 400_000 : 0;
    const yuksek = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: "dengeli" }).find((x) => x.komut.tur === "bakim_duzeyi");
    expect(yuksek).toBeDefined();
    expect((yuksek!.komut as { duzey: number }).duzey).toBe(2);
    const tasarruf = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: "tasarruf" });
    expect(tasarruf.map((x) => x.komut)).toEqual([{ tur: "bakim_duzeyi", duzey: 0 }]);
    // tasarrufçu aşınmış tesisi onarmaz (yalnız düzey)
    expect(tasarruf.some((x) => x.komut.tur === "genel_onarim")).toBe(false);
    kabul(s, yuksek!.komut);
    expect(s.dunya.oyuncular.find((o) => o.id === "a")!.bakimDuzeyi).toBe(2);
    // yüksekteyken aşınma azsa normale döner
    for (const b of s.dunya.bolgeler) for (const t of b.tesisler) t.asinmaPpm = 0;
    const geri = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: "dengeli" }).find((x) => x.komut.tur === "bakim_duzeyi");
    expect((geri!.komut as { duzey: number }).duzey).toBe(1);
  });

  it("ağır aşınmada genel onarım önerilir ve çekirdek kabul eder; aşınma sıfırlanır", () => {
    const s = kur(["m_sehir", "m_ova"]);
    s.calistirKadar(2 * SAAT);
    const b = bolgeDurumu(s, "m_sehir");
    for (const t of b.tesisler) t.asinmaPpm = PPM;
    s.baglam.kirlet(s.dunya);
    s.calistirKadar(s.dunya.zaman);
    const onarim = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: "dengeli" }).find((x) => x.komut.tur === "genel_onarim");
    expect(onarim).toBeDefined();
    expect(onarim!.komut).toEqual({ tur: "genel_onarim", bolge: "m_sehir" });
    kabul(s, onarim!.komut);
    for (const t of b.tesisler) expect(t.asinmaPpm).toBe(0);
  });

  it("aşınma yoksa onarım ve düzey adayı yoktur", () => {
    const s = kur(["m_sehir", "m_ova"]);
    s.calistirKadar(2 * SAAT);
    expect(sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: "dengeli" })).toEqual([]);
  });
});

describe("keşif sondajı", () => {
  it("damar yarıdan çok tükenmişse sondaj önerilir ve çekirdek kabul eder; hak bitince önerilmez", () => {
    const s = kur(["m_col", "m_ova"]);
    s.calistirKadar(2 * SAAT);
    const col = bolgeDurumu(s, "m_col");
    const si = s.ic.malIndeks["silis"] as number;
    expect(sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: false, sondaj: true })).toEqual([]);
    col.rezervKalan[si] = Math.floor((col.rezervIlk[si] as number) * 0.2);
    const adaylar = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: false, sondaj: true });
    const a = adaylar.find((x) => x.komut.tur === "arama_sondaji" && x.komut.mal === "silis");
    expect(a).toBeDefined();
    expect(a!.kategori).toBe("sondaj");
    kabul(s, a!.komut);
    kabul(s, a!.komut);
    // 2 hak kullanıldı: aynı mal için başka sondaj yok
    const sonra = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: false, sondaj: true });
    expect(sonra.some((x) => x.komut.tur === "arama_sondaji" && x.komut.mal === "silis")).toBe(false);
  });

  it("tarım rezervi (tahıl) için sondaj önerilmez", () => {
    const s = kur(["m_ova", "m_sehir"]);
    s.calistirKadar(2 * SAAT);
    const ova = bolgeDurumu(s, "m_ova");
    const ti = s.ic.malIndeks["tahil"] as number;
    ova.rezervKalan[ti] = 1;
    const adaylar = sanayiAdaylari(new Bakis(s, "a"), { santral: false, bakim: false, sondaj: true });
    expect(adaylar.some((x) => x.komut.tur === "arama_sondaji" && x.komut.mal === "tahil")).toBe(false);
  });
});

describe("kur_ve_unut ve arketip entegrasyonu", () => {
  it("kur_ve_unut ilk planında normal bakım düzeyi komutu vardır (sanayi açıkken); kapalıyken yoktur; sonra komut vermez", () => {
    const acik = kur(["m_ova", "m_liman", "m_gecit", "m_sehir"]);
    const bot = botOlustur("kur_ve_unut", "a", 1);
    const plan = bot.karar(acik);
    expect(plan).toContainEqual({ tur: "bakim_duzeyi", duzey: 1 });
    expect(bot.karar(acik)).toEqual([]);
    const v = miniVeriyiYukle();
    delete v.param.sanayi;
    const kapali = Simulasyon.olustur(v, 1);
    kapali.uygula({ t: 0, oyuncu: "sistem", komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: ["m_ova", "m_liman", "m_gecit", "m_sehir"] } });
    kapali.calistirKadar(0);
    const plan2 = botOlustur("kur_ve_unut", "a", 1).karar(kapali);
    expect(plan2.some((k) => k.tur === "bakim_duzeyi")).toBe(false);
  });

  it("dört arketip + kur_ve_unut 6 günlük koşuda: sanayi komutları reddedilmez; elektrik dengesi korunur", () => {
    for (const arketip of ["sanayici", "tuccar", "lojistikci", "militarist"] as const) {
      const r = kos({
        veri: miniVeriyiYukle(),
        tohum: 1,
        oyuncular: [
          { id: "a", bolgeler: ["m_ova", "m_liman", "m_gecit"], bot: botOlustur(arketip, "a", 1), katilmaMs: 0 },
          { id: "b", bolgeler: ["m_dag", "m_col", "m_sehir"], bot: botOlustur("kur_ve_unut", "b", 1), katilmaMs: 0 },
        ],
        sureMs: 6 * GUN,
      });
      const kotu = Object.keys(r.basarisizNedenleri).filter((n) => /^(tesis_olcek_yukselt|genel_onarim|bakim_duzeyi|arama_sondaji)/.test(n));
      expect(kotu).toEqual([]);
      // şebeke: aktif botun elektrik tüketen tesisi olan her bölgesinde karşılanma makul (brownout kalıcı değil).
      // (Mini haritada güney yarıda kömür/yakıt üretimi yoktur: ayarla-unut oyuncusunun şebekesi yakıt bitince söner.)
      let kalici = 0;
      for (const b of r.sim.dunya.bolgeler) {
        if (b.sahip !== "a" || b.elektrik === undefined) continue;
        const tuketici = b.tesisler.some((t) => (r.sim.ic.yontemler[t.yontem]!.girdiler["elektrik"] ?? 0) > 0 && t.aktif);
        if (tuketici && b.elektrik.karsilanmaPpm < 500_000) kalici++;
      }
      expect(kalici).toBe(0);
    }
  });

  it("sanayi komutları günlükten yeniden oynatılır (özet eşit)", () => {
    const r = kos({
      veri: miniVeriyiYukle(),
      tohum: 2,
      oyuncular: [
        { id: "a", bolgeler: ["m_ova", "m_liman", "m_gecit"], bot: botOlustur("sanayici", "a", 2), katilmaMs: 0 },
        { id: "b", bolgeler: ["m_dag", "m_col", "m_sehir"], bot: botOlustur("tuccar", "b", 2), katilmaMs: 0 },
      ],
      sureMs: 8 * GUN,
    });
    const tekrar = Simulasyon.yenidenOynat(miniVeriyiYukle(), 2, r.sim.gunluk);
    tekrar.calistirKadar(r.sim.dunya.zaman);
    expect(tekrar.durumOzeti()).toBe(r.sim.durumOzeti());
  });
});
