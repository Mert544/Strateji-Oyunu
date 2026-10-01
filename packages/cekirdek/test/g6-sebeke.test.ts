/**
 * G6-4 / şebeke elektriği ve yakıtı (şartname §5.2, §16.1 `sebeke-elektrik`, §12.1, §13 K-4): mülk kipinde elektrik (anlık denge) ve yakıt (stoksuz
 * tüketim anı) kamu şebekesinden otomatik alınır; bedel TABAN fiyatla (`tabanFiyat × kamuIthalatCarpaniPpm × tavanOraniPpm`), saatlik oran olarak
 * oyuncunun hazinesinden düşer, `lavabo.sebeke` (yanan) ve `kasa.giris.sebeke` (ilçe kasası) olarak iki satıra bölünür; yeni musluk yoktur.
 *
 * Yöntemler ve sayılar SENTETİKTİR (`g6-yardimci.ts`): testler formülleri ve korunumu sınar. Beklenen sayılar durumdan türetilir
 * (ör. `sebekeMili`, `verimPpm`), sabit sayı yalnız taban fiyat ve ödeme örneğindedir.
 */
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { mulkOyuncuBul } from "../src/mulk";
import { kamuIlceKimligi } from "../src/mulk/kamu";
import { kasaBul, paraUzlastir } from "../src/mulk/kasa";
import { sayacOlcekli } from "../src/paraSayac";
import { aralik, prngOlustur } from "../src/prng";
import { carpBol } from "../src/sabit";
import { hazineEkle, anlikHazine, anlikMiktar } from "../src/stok";
import { DAKIKA, GUN, MILI, PPM, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, Komut } from "../src/tipler";
import { g6Bolge, g6Dugum, g6Dunya, g6KorunumTutar, g6MulkVeri, g6Tesis, G6Yerlestirici, mulkParam, sebekeMiliOku } from "./g6-yardimci";
import { mulkSim, tamam, ver } from "./mulk-yardimci";

/** Uzun koşularda un/tahıl biter (depo 10 000 mili, 200 000/sa); NPC arzı mal başına ≈ 200 000/sa. Yakıt buraya KONMAZ (şebekeden gelir). */
const GIRDI_ITHALATI = [
  { mal: "un", oranSaat: 90_000 },
  { mal: "tahil", oranSaat: 100_000 },
];

const ELEKTRIK_FIYAT = 10_350; // 10 000 (taban) × 1 035 000 / 1 000 000 (§5.2.4; doğrulandı: yöntem = geçici test)
const YAKIT_FIYAT = 103_500; // 100 000 × 1,035

const mo = (s: Simulasyon, o = "a") => mulkOyuncuBul(s.dunya, o)!;
const mal = (s: Simulasyon, id: string) => s.ic.malIndeks[id]!;
const stok = (s: Simulasyon, o: string, m: string) => anlikMiktar(g6Dugum(s, o).stoklar[mal(s, m)]!, s.dunya.zaman);

/** Şebeke bedeli (mili-₺/sa): elektrik + yakıt, durumdaki son çözümden (§5.2.5 `hazineKalemleri` ile aynı formül). */
function bedelBeklenen(s: Simulasyon, o: string): number {
  const b = g6Dugum(s, o);
  let t = 0;
  if ((sebekeMiliOku(b) ?? 0) > 0) t += carpBol(sebekeMiliOku(b)!, ELEKTRIK_FIYAT, MILI);
  const tuk = (b as { sebekeTuketim?: Record<string, number> }).sebekeTuketim ?? {};
  if ((tuk["yakit"] ?? 0) > 0) t += carpBol(tuk["yakit"]!, YAKIT_FIYAT, MILI);
  return t;
}

/** `paraAkisi.sebeke` (tip G6-2'de gelir; alan yoksa 0). */
const akisSebeke = (s: Simulasyon, o = "a"): number => (mo(s, o).paraAkisi as { sebeke?: number } | undefined)?.sebeke ?? 0;

describe("(1) santralsiz oyuncu: elektrik şebekeden, bedel formülü", () => {
  const s = g6Dunya({ kur: (y) => y.yerlestir("gida_fabrikasi", "degirmen") });

  it("tesis verim > 0 (bugün santralsiz verim 0'dı); sebekeMili = elektrik talebi; kendi üretim 0", () => {
    const t = g6Tesis(s, "a", "degirmen");
    expect(t.verimPpm).toBeGreaterThan(0);
    const e = g6Dugum(s, "a").elektrik!;
    expect(e.uretimMili).toBe(0);
    expect(e.talepMili).toBeGreaterThan(0);
    expect(sebekeMiliOku(g6Dugum(s, "a"))).toBe(e.talepMili);
    expect(e.karsilanmaPpm).toBe(PPM);
  });

  it("birim fiyatlar tamsayı sabit (taban × 1,035): elektrik 10 350, yakıt 103 500 mili-₺/birim; kasa payı 120 000", () => {
    const sb = (s.ic.mulk as unknown as { sebeke: { elektrik: { birimFiyatMili: number }; stoksuz: { mal: number; birimFiyatMili: number }[]; kasaPayiPpm: number } }).sebeke;
    expect(sb.elektrik.birimFiyatMili).toBe(ELEKTRIK_FIYAT);
    expect(sb.stoksuz).toHaveLength(1);
    expect(sb.stoksuz[0]).toEqual({ mal: mal(s, "yakit"), birimFiyatMili: YAKIT_FIYAT });
    expect(sb.kasaPayiPpm).toBe(120_000);
  });

  it("bedel = sebekeMili × 10 350 / 1000 (saatlik oran); oyuncunun paraAkisi.sebeke ile birebir", () => {
    expect(bedelBeklenen(s, "a")).toBeGreaterThan(0);
    expect(akisSebeke(s, "a")).toBe(bedelBeklenen(s, "a"));
  });
});

describe("(1b) yakıt stoksuz mal: ekmek fırını ticaret emri OLMADAN çalışır", () => {
  const kur = (y: G6Yerlestirici) => {
    y.yerlestir("gida_fabrikasi", "degirmen");
    y.yerlestir("gida_fabrikasi", "ekmek_firini");
  };
  const s = g6Dunya({ kur: (y) => kur(y) });

  it("fırın verim > 0, ekmek üretir; yakıt stoğu 0 kalır ve hiç ticaret emri yok", () => {
    const f = g6Tesis(s, "a", "ekmek_firini");
    expect(f.verimPpm).toBeGreaterThan(0);
    expect(g6Dugum(s, "a").ticaretEmirleri.some((e) => e.mal === mal(s, "yakit"))).toBe(false); // yakıt için ticaret emri YOK (başka emir de yok)
    expect(g6Dugum(s, "a").ticaretEmirleri).toHaveLength(0);
    expect(stok(s, "a", "yakit")).toBe(0);
    expect(g6Dugum(s, "a").uretimToplam[mal(s, "ekmek")]).toBeGreaterThan(0);
  });

  it("sebekeTuketim.yakit = gerçek tüketim = Σ girdi × verim; bedel hem elektrik hem yakıtı içerir", () => {
    const f = g6Tesis(s, "a", "ekmek_firini");
    const tuk = (g6Dugum(s, "a") as { sebekeTuketim?: Record<string, number> }).sebekeTuketim;
    expect(tuk?.["yakit"]).toBe(carpBol(8_000, f.verimPpm, PPM));
    expect(akisSebeke(s, "a")).toBe(bedelBeklenen(s, "a"));
    expect(carpBol(tuk!["yakit"]!, YAKIT_FIYAT, MILI)).toBeGreaterThan(0);
  });

  it("şebeke yakıt arz/talebi pazar hacmine girmez: oyuncuTalebi ve oyuncuArzi 0", () => {
    expect(s.dunya.pazar.oyuncuTalebi[mal(s, "yakit")]).toBe(0);
    expect(s.dunya.pazar.oyuncuArzi[mal(s, "yakit")]).toBe(0);
  });

  it("yakıt `mallar[]`'dan çıkarılırsa eski davranış: fırının verimi yakıt stoğuna bağlı (stok yok → 0), sebekeTuketim yok", () => {
    const veri = g6MulkVeri({}, (v) => {
      (mulkParam(v)!["sebeke"] as { mallar: { mal: string; tavanOraniPpm: number }[] }).mallar = [{ mal: "elektrik", tavanOraniPpm: 1_000_000 }] as never;
    });
    const s2 = g6Dunya({ veri, kur: (y) => kur(y) });
    expect(g6Tesis(s2, "a", "ekmek_firini").verimPpm).toBe(0);
    expect((g6Dugum(s2, "a") as { sebekeTuketim?: unknown }).sebekeTuketim).toBeUndefined();
    expect(g6Tesis(s2, "a", "degirmen").verimPpm).toBeGreaterThan(0); // elektrik yine şebekeden
  });

  it("yakıt ithalat emri verilirse stok birikir ama şebekeli tesis onu KULLANMAZ (emir iptalinden sonra stok yalnız bozulma kadar azalır)", () => {
    const s2 = g6Dunya({ kur: (y) => kur(y), ithalat: GIRDI_ITHALATI }); // un/tahıl ithalatı: 84 saatlik koşuda girdi tükenmesin (yakıt DEĞİL)
    const bolge = g6Bolge(s2, "a");
    tamam(s2, "a", { tur: "ticaret_emri", bolge, mal: "yakit", yon: "ithalat", oranSaat: 10_000 });
    s2.calistirKadar(s2.dunya.zaman + 2 * GUN);
    const dolu = stok(s2, "a", "yakit");
    expect(dolu).toBeGreaterThan(0);
    tamam(s2, "a", { tur: "ticaret_emri", bolge, mal: "yakit", yon: "ithalat", oranSaat: 0 });
    s2.calistirKadar(s2.dunya.zaman + 12 * SAAT);
    expect(g6Tesis(s2, "a", "ekmek_firini").verimPpm).toBeGreaterThan(0);
    // fırın 12 saatte 8 000 × 12 = 96 000 yakıt tüketirdi (stoktan olsaydı ≈ %20 düşerdi); gerçek düşüş yalnız bozulma (≈ %0,25)
    expect(stok(s2, "a", "yakit")).toBeGreaterThanOrEqual(Math.floor(dolu * 0.99));
  });
});

describe("(1c) fiyat TABAN sabit: oyuncu ve pazar bağımsız", () => {
  it("başka oyuncunun büyük yakıt ithalatı sürerken şebeke bedeli pazar durumundan bağımsız 103 500 ile hesaplanır (pazar fiyatının oynaması ön koşul değil)", () => {
    const s = g6Dunya({
      oyuncular: ["a", "b"],
      ithalat: GIRDI_ITHALATI,
      kur: (y, o) => {
        y.yerlestir("gida_fabrikasi", "degirmen");
        if (o === "a") y.yerlestir("gida_fabrikasi", "ekmek_firini");
      },
    });
    tamam(s, "b", { tur: "ticaret_emri", bolge: g6Bolge(s, "b"), mal: "yakit", yon: "ithalat", oranSaat: 80_000 });
    s.calistirKadar(s.dunya.zaman + 3 * GUN);
    expect(akisSebeke(s, "a")).toBe(bedelBeklenen(s, "a")); // ama a'nın bedeli tabanla
    expect(akisSebeke(s, "a")).toBeGreaterThan(0);
  });
});

describe("(2)-(4) kendi santral önce; kalan açık şebekeden", () => {
  it("(2) santral talebi karşılıyor: sebekeMili yazılmaz, bedel yakıt yok → paraAkisi.sebeke yok; santral üretir", () => {
    const s = g6Dunya({
      kur: (y) => {
        y.yerlestir("santral", "komur_santrali");
        y.yerlestir("gida_fabrikasi", "degirmen");
      },
    });
    const e = g6Dugum(s, "a").elektrik!;
    expect(e.uretimMili).toBeGreaterThan(0);
    expect(sebekeMiliOku(g6Dugum(s, "a"))).toBeUndefined();
    expect(akisSebeke(s, "a")).toBe(0);
    expect(g6Tesis(s, "a", "degirmen").verimPpm).toBeGreaterThan(0);
  });

  it("(3)+(4) kısmi santral: santral TAM yükte, açık = talep − arz (iletim kaybı sonrası) şebekeden; bedel yalnız açık için", () => {
    const veri = g6MulkVeri({}, (v) => {
      const y = v.icerik.yontemler.find((x) => x.id === "komur_santrali")!;
      y.ciktilar["elektrik"] = 6_000; // talep (12 000) santral arzının (≈ 5 700) üstünde
    });
    const s = g6Dunya({
      veri,
      kur: (y) => {
        y.yerlestir("santral", "komur_santrali");
        y.yerlestir("gida_fabrikasi", "degirmen");
      },
    });
    const e = g6Dugum(s, "a").elektrik!;
    const iletim = (s.ic as unknown as { sanayi?: { iletimKaybiPpm: number } }).sanayi?.iletimKaybiPpm ?? 50_000;
    expect(e.yukPpm).toBe(PPM);
    const arz = carpBol(e.uretimMili, PPM - iletim, PPM);
    const acik = sebekeMiliOku(g6Dugum(s, "a"));
    expect(acik).toBe(e.talepMili - arz);
    expect(acik!).toBeGreaterThan(0);
    expect(akisSebeke(s, "a")).toBe(carpBol(acik!, ELEKTRIK_FIYAT, MILI));
  });
});

describe("(6) defter: lavabo + kasa girişi = bedel birikimi (kayıpsız); kasa payı tamsayı kuralı", () => {
  it("ödeme örneği: 397.576.620 mili-₺ → kasa 47.709.194 + lavabo 349.867.426 (kasaPayiPpm 120 000; kasa = floor(ödeme × pay / 1e6))", () => {
    const kasa = carpBol(397_576_620, 120_000, PPM);
    expect(kasa).toBe(47_709_194);
    expect(397_576_620 - kasa).toBe(349_867_426);
    expect(kasa + (397_576_620 - kasa)).toBe(397_576_620);
  });

  it("24 saatlik koşu: Σ lavabo.sebeke + Σ kasa.giris.sebeke = Σ bedel dt (SAAT ölçekli, tam); kasa kısmı = Σ floor(oran × pay) dt; ithalat kalemleri etkilenmez", () => {
    const s = g6Dunya({
      kur: (y) => {
        y.yerlestir("gida_fabrikasi", "degirmen");
        y.yerlestir("gida_fabrikasi", "ekmek_firini");
      },
    });
    s.calistirKadar(Math.ceil(s.dunya.zaman / SAAT) * SAAT); // tam saate hizala (komut yok: yalnız saatlik çözüm)
    const k0 = g6KorunumTutar(s, "baslangic");
    let toplam = 0n;
    let kasaBeklenen = 0n;
    for (let i = 0; i < 24; i++) {
      const oran = akisSebeke(s, "a");
      toplam += BigInt(oran) * BigInt(SAAT);
      kasaBeklenen += BigInt(carpBol(oran, 120_000, PPM)) * BigInt(SAAT);
      s.calistirKadar(s.dunya.zaman + SAAT);
    }
    const k1 = g6KorunumTutar(s, "son");
    expect(toplam).toBeGreaterThan(0n);
    expect(k1.lavaboSebeke - k0.lavaboSebeke + (k1.kasaSebeke - k0.kasaSebeke)).toBe(toplam);
    expect(k1.kasaSebeke - k0.kasaSebeke).toBe(kasaBeklenen);
    // kasa girişi ilçe kasasına yazılmıştır
    const para = s.dunya.mulk!.para!;
    const ilceKasa = kasaBul(para, kamuIlceKimligi(s.dunya.mulk!.hucreler.find((h) => h.sahip === "a")!.ilce));
    expect(ilceKasa).toBeDefined();
    expect((ilceKasa!.giris as Record<string, { n: number }>)["sebeke"]!.n).toBeGreaterThan(0);
    // ithKasa kolu AYRI: şebeke ithalat kalemlerine karışmaz (ithalat yok)
    expect(para.lavabo.ithalatNpc.n).toBe(0);
    for (const k of para.kasalar) {
      expect(k.giris.ithalatMakas.n).toBe(0);
      expect(k.giris.ithalatKomisyon.n).toBe(0);
    }
  });

  it("kasaPayiPpm = 0: `kasa.giris.sebeke` hiç yazılmaz; bedel tümü lavaboda", () => {
    const veri = g6MulkVeri({}, (v) => {
      (mulkParam(v)!["sebeke"] as { kasaPayiPpm: number }).kasaPayiPpm = 0;
    });
    const s = g6Dunya({ veri, kur: (y) => y.yerlestir("gida_fabrikasi", "degirmen") });
    const para = s.dunya.mulk!.para!;
    paraUzlastir(s.dunya, s.ic);
    for (const k of para.kasalar) expect((k.giris as Record<string, unknown>)["sebeke"]).toBeUndefined();
    expect((para.lavabo as Record<string, { n: number }>)["sebeke"]!.n).toBeGreaterThan(0);
    g6KorunumTutar(s, "kasa payi 0");
  });
});

describe("(8) tavanOraniPpm < 1 000 000 şebeke fiyatını tavanın altına çeker", () => {
  it("elektrik 500 000: birim fiyat 5 175, bedel yarıya iner (yakıt aynı)", () => {
    const veri = g6MulkVeri({}, (v) => {
      const m = (mulkParam(v)!["sebeke"] as { mallar: { mal: string; tavanOraniPpm: number }[] }).mallar;
      m.find((x) => x.mal === "elektrik")!.tavanOraniPpm = 500_000;
    });
    const s = g6Dunya({ veri, kur: (y) => y.yerlestir("gida_fabrikasi", "degirmen") });
    const sb = (s.ic.mulk as unknown as { sebeke: { elektrik: { birimFiyatMili: number } } }).sebeke;
    expect(sb.elektrik.birimFiyatMili).toBe(5_175);
    expect(akisSebeke(s, "a")).toBe(carpBol(sebekeMiliOku(g6Dugum(s, "a"))!, 5_175, MILI));
  });
});

describe("(7) hazine 0: ödeme gücü, borcSilme, korunum tam, tekrarlanabilir", () => {
  function sifirHazineKosu(): Simulasyon {
    const s = g6Dunya({
      kur: (y) => {
        y.yerlestir("gida_fabrikasi", "degirmen");
        y.yerlestir("gida_fabrikasi", "ekmek_firini");
      },
    });
    // hazineyi boşalt (harcama): şebeke bedeli ödenemez hale gelir
    const h = anlikHazine(s.dunya, "a");
    expect(hazineEkle(s.dunya, "a", -h)).toBe(true);
    for (let i = 0; i < 48; i++) {
      s.calistirKadar(s.dunya.zaman + SAAT);
      if (i % 6 === 0) g6KorunumTutar(s, `saat ${i}`);
    }
    return s;
  }

  it("48 saat: hazine 0'da kelepçeli (negatif değil), şebeke kesilmez, borç musluğa yazılır, korunum tam", () => {
    const s = sifirHazineKosu();
    expect(anlikHazine(s.dunya, "a")).toBeGreaterThanOrEqual(0);
    const p = s.dunya.mulk!.para!;
    expect((p.lavabo as Record<string, { n: number }>)["sebeke"]!.n).toBeGreaterThan(0);
    expect(sayacOlcekli(p.musluk.borcSilme)).toBeGreaterThan(0n);
    g6KorunumTutar(s, "son");
  });

  it("aynı koşu iki kez aynı durumOzeti (salınım belirlenimcidir)", () => {
    expect(sifirHazineKosu().durumOzeti()).toBe(sifirHazineKosu().durumOzeti());
  });
});

describe("(9) yetişme nötrlüğü: tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma", () => {
  const kur = (y: G6Yerlestirici) => {
    y.yerlestir("gida_fabrikasi", "degirmen");
    y.yerlestir("gida_fabrikasi", "ekmek_firini");
  };
  const komutlar: { t: number; komut: Komut }[] = [];
  it("3 koşu aynı özet", () => {
    const hedef = 5 * GUN;
    const kos = (adim: number | null) => {
      const s = mulkSim(["a"], g6MulkVeri(), 7);
      kur(new G6Yerlestirici(s, "a"));
      komutlar.length = 0;
      if (adim === null) s.calistirKadar(hedef);
      else for (let t = s.dunya.zaman; t < hedef; ) s.calistirKadar((t = Math.min(hedef, t + adim)));
      return s.durumOzeti();
    };
    const tek = kos(null);
    expect(kos(7 * SAAT + 13 * DAKIKA)).toBe(tek); // parçalı (saat sınırlarına denk gelmeyen adımlar)
    expect(kos(SAAT)).toBe(tek);
    expect(kos(null)).toBe(tek); // aynı komut günlüğü ile ikinci koşu = yeniden oynatma
  });
});

describe("(5) korunum I1: tohumlu rastgele şebekeli koşu, her kontrol noktasında tam eşitlik", () => {
  /** santralli/santralsiz oyuncular; parsel/yapı/ithalat/ihracat/ödül/araştırma karışımı. */
  function rastgeleKosu(tohum: number, adim: number, veri: CekirdekVeriPaketi): Simulasyon {
    const oyuncular = ["a", "b", "c"];
    const s = mulkSim(oyuncular, veri, tohum);
    // belirleyici önek: a santralsiz zincir; b santrallı zincir; c yalnız değirmen (şebeke çalışsın)
    const ya = new G6Yerlestirici(s, "a");
    ya.yerlestir("gida_fabrikasi", "degirmen");
    ya.yerlestir("gida_fabrikasi", "ekmek_firini");
    const yb = new G6Yerlestirici(s, "b");
    yb.yerlestir("santral", "komur_santrali");
    yb.yerlestir("gida_fabrikasi", "degirmen");
    new G6Yerlestirici(s, "c").yerlestir("gida_fabrikasi", "degirmen");
    const rng = prngOlustur(tohum, "g6-sebeke-korunum");
    const mallar = ["tahil", "gida", "celik", "parca", "yakit", "un", "ekmek"];
    for (let i = 0; i < adim; i++) {
      s.calistirKadar(s.dunya.zaman + (aralik(rng, 90) + 1) * DAKIKA);
      if (aralik(rng, 3) === 0) g6KorunumTutar(s, `adim ${i} oncesi`);
      const o = oyuncular[aralik(rng, oyuncular.length)] as string;
      const secim = aralik(rng, 6);
      if (secim <= 2) {
        const m = mallar[aralik(rng, mallar.length)] as string;
        const yon = aralik(rng, 2) === 0 ? "ithalat" : "ihracat";
        const oranSaat = aralik(rng, 4) === 0 ? 0 : (1 + aralik(rng, 40)) * 1000;
        ver(s, o, { tur: "ticaret_emri", bolge: g6Bolge(s, o), mal: m, yon, oranSaat });
      } else if (secim === 3) {
        const gecerli = ["degirmen", "ekmek_firini", "standart_gida_isleme"];
        const t = g6Dugum(s, o).tesisler.find((x) => s.ic.tesisTurleri[x.tur]!.id === "gida_fabrikasi");
        if (t !== undefined) ver(s, o, { tur: "yontem_degistir", bolge: g6Bolge(s, o), tesis: t.id, yontem: gecerli[aralik(rng, gecerli.length)] as string });
      } else if (secim === 4) {
        const t = g6Dugum(s, o).tesisler[aralik(rng, g6Dugum(s, o).tesisler.length)];
        if (t !== undefined) ver(s, o, { tur: "tesis_durum", bolge: g6Bolge(s, o), tesis: t.id, aktif: aralik(rng, 3) !== 0 });
      } else {
        const tk = s.ic.icerik.teknolojiler[aralik(rng, s.ic.icerik.teknolojiler.length)];
        if (tk !== undefined) ver(s, o, { tur: "arastir", teknoloji: tk.id });
      }
      if (aralik(rng, 3) === 0) g6KorunumTutar(s, `adim ${i} sonrasi`);
    }
    return s;
  }

  for (const tohum of [11, 2024, 90210]) {
    it(`tohum ${tohum}, kasa payı 120 000: eşitlik tam; şebeke defteri dolu; kasa girişi var`, () => {
      const s = rastgeleKosu(tohum, 140, g6MulkVeri());
      const k = g6KorunumTutar(s, "son");
      expect(k.musluk).toBeGreaterThan(0n);
      expect(k.lavaboSebeke).toBeGreaterThan(0n);
      expect(k.kasaSebeke).toBeGreaterThan(0n);
    }, 120_000);

    it(`tohum ${tohum}, kasa payı 0: eşitlik tam; kasa girişi hiç yok`, () => {
      const veri = g6MulkVeri({}, (v) => {
        (mulkParam(v)!["sebeke"] as { kasaPayiPpm: number }).kasaPayiPpm = 0;
      });
      const s = rastgeleKosu(tohum, 140, veri);
      const k = g6KorunumTutar(s, "son");
      expect(k.lavaboSebeke).toBeGreaterThan(0n);
      expect(k.kasaSebeke).toBe(0n);
    }, 120_000);
  }
});
