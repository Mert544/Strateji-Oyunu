/**
 * Kalıcı kimlik ve içerik göçü (G8, docs/06 §14): anlık görüntü zarfı sürüm 2 (içerik kimlik tablosu), yükleme kuralları
 * (yalnız-ekle; kaldırma hata), sona/araya ekleme göçü, sürüm 1 görüntü fikstürleri, mülk kipi, bozuk zarf, kapsam taraması.
 */
import { readFileSync } from "node:fs";
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import {
  KIMLIK_TABLOSU_ADLARI,
  icerikKimlikTablosuOlustur,
  kimlikTablolariEsit,
  yalnizEkleDenetimi,
} from "../src/goc";
import type { IcerikKimlikTablosu } from "../src/goc";
import { Simulasyon } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { anlikGoruntuCoz, anlikGoruntuOlustur, anlikGoruntuUyarla, dunyaSerilestir, kuralSurumuHesapla, SerilestirmeHatasi } from "../src/serilestir";
import { anlikHazine } from "../src/stok";
import { GUN, SAAT } from "../src/tipler";
import { diziUzunluklari, diziYollari, icerikdenCikar, icerikGenislet, kimlikliGorunum, yeniKimlikler, zenginDunya } from "./goc-yardimci";
import type { Veri } from "./goc-yardimci";
import { bitisikCift, mulkSim, mulkVeriTam, tamam } from "./mulk-yardimci";
import { senaryoKos } from "./serilestir-yardimci";

const FIKSTUR = new URL("./fikstur-goc/", import.meta.url);
const oku = (ad: string): string => readFileSync(new URL(ad, FIKSTUR), "utf8");

function siraliTablo(t: IcerikKimlikTablosu): IcerikKimlikTablosu {
  return Object.fromEntries(KIMLIK_TABLOSU_ADLARI.map((a) => [a, [...t[a]].sort()])) as IcerikKimlikTablosu;
}

function hata(f: () => unknown): SerilestirmeHatasi {
  try {
    f();
  } catch (e) {
    if (e instanceof SerilestirmeHatasi) return e;
    throw e;
  }
  throw new Error("hata bekleniyordu");
}

/** Bot koşusundan (lojistik akışı, oran_delta olayları, ticaret emirleri) mini-6 dünyası. */
function botDunyasi(): Simulasyon {
  return senaryoKos({ veri: miniVeriyiYukle(), tohum: 21, sureMs: 3 * GUN, bulanikAdet: 6 }).sim;
}

const DUNYALAR: [string, () => Simulasyon][] = [
  ["zengin (savas, parti, insaat, arastirma, teknoloji)", () => zenginDunya()],
  ["bot kosusu (lojistik akislari, oran_delta, ticaret emirleri)", botDunyasi],
];

const YOK_TABLO: IcerikKimlikTablosu = { birlikler: [], mallar: [], tarimUrunleri: [], teknolojiler: [], tesisTurleri: [], yontemler: [] };

describe("zarf sürüm 2: kimlik tablosu ve altın özet", () => {
  const s = botDunyasi();
  const veri = miniVeriyiYukle();
  const kural = kuralSurumuHesapla(veri);
  const metin = anlikGoruntuOlustur(s, kural);

  it("tablo = içerik sırası; dunya metni ve özet INDEKSLİ kanonik biçimle bayt bayt aynı", () => {
    const g = anlikGoruntuCoz(metin, kural);
    expect(g.surum).toBe(2);
    expect(g.icerikKimlikTablosu).toEqual(icerikKimlikTablosuOlustur(s.ic));
    expect(g.icerikKimlikTablosu!.mallar).toEqual(veri.icerik.mallar.map((m) => m.id));
    expect(metin.startsWith(`{"dunya":${dunyaSerilestir(s.dunya)},"durumOzeti":"${s.durumOzeti()}","icerikKimlikTablosu":{`)).toBe(true);
    expect(g.durumOzeti).toBe(s.durumOzeti());
    expect(kanonikSerilestir(JSON.parse(metin))).toBe(metin);
  });

  it("aynı içerikle yükleme: göç yok, özet aynı, kural sürümü değişmedi", () => {
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(veri, metin);
    expect(r.goc.yenidenIndekslendi).toBe(false);
    expect(r.goc.kuralDegisti).toBe(false);
    expect(r.sim.durumOzeti()).toBe(s.durumOzeti());
    expect(r.goc.eskiDurumOzeti).toBe(s.durumOzeti());
  });

  it("kimlik tablosu: tek sürüm = tek tablo; tablo karşılaştırması sıra duyarlı", () => {
    const t = icerikKimlikTablosuOlustur(s.ic);
    expect(Object.keys(t)).toEqual([...KIMLIK_TABLOSU_ADLARI]);
    const u = structuredClone(t);
    expect(kimlikTablolariEsit(t, u)).toBe(true);
    [u.mallar[0], u.mallar[1]] = [u.mallar[1]!, u.mallar[0]!];
    expect(kimlikTablolariEsit(t, u)).toBe(false);
  });
});

describe("sürüm 1 görüntü fikstürleri (göç öncesi kodla yazılmış)", () => {
  for (const [ad, dosya, veriKur] of [
    ["bolge kipi (mini-6, 3 gun, 4 bot + bulanik komut)", "bolge-v1", () => miniVeriyiYukle()],
    [
      "mulk kipi (mini-6 parsel, ek yapilar)",
      "mulk-v1",
      () =>
        mulkVeriTam((x) => {
          const m = x.param.mulk!;
          m.yeniOyuncu.hibe = 2_000_000_000;
          m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
          m.yeniOyuncu.indirimliYapiSayisi = 0;
          m.yeniOyuncu.ayrilmisHucrePpm = 0;
          m.esZamanliInsaat = 10;
        }),
    ],
  ] as const) {
    const metin = oku(`${dosya}.json`);
    const ust = JSON.parse(oku(`${dosya}.ust.json`)) as { kural: string; ozet: string; zaman: number; tablo: IcerikKimlikTablosu };

    it(`${ad}: v1 zarfı çözülür, özet yazıldığı gibi doğrulanır (altın biçim korunur)`, () => {
      const g = anlikGoruntuCoz(metin);
      expect(g.surum).toBe(1);
      expect(g.icerikKimlikTablosu).toBeUndefined();
      expect(g.durumOzeti).toBe(ust.ozet);
      expect(g.kuralSurumu).toBe(ust.kural);
    });

    it(`${ad}: mevcut içerikle yükleme (gocIzni + eskiTablo); göç yoksa özet fikstürdeki özetle BİREBİR aynı`, () => {
      const r = Simulasyon.anlikGoruntudenYukleSonuclu(veriKur(), metin, [], { gocIzni: true, eskiTablo: ust.tablo });
      expect(r.sim.dunya.zaman).toBe(ust.zaman);
      // İçerik fikstürden sonra yalnız sona eklendiyse özet değişmiş olabilir; değişmediyse aynı olmalı.
      if (!r.goc.yenidenIndekslendi) expect(r.sim.durumOzeti()).toBe(ust.ozet);
      expect(r.goc.eskiDurumOzeti).toBe(ust.ozet);
      expect(r.goc.yalnizEkle).toBe(true);
      // v2 olarak yeniden yazılır; yazılan v2 aynı dünyayı verir (gidiş-dönüş)
      const v2 = anlikGoruntuOlustur(r.sim, kuralSurumuHesapla(veriKur()));
      const r2 = Simulasyon.anlikGoruntudenYukle(veriKur(), v2);
      expect(r2.durumOzeti()).toBe(r.sim.durumOzeti());
    });

    it(`${ad}: v1 + özdeş içerik: yeniden yazılan v2 'dunya' ve özeti v1'inkiyle bayt bayt aynı`, () => {
      const veri = veriKur();
      if (kuralSurumuHesapla(veri) !== ust.kural) return; // parametre/içerik fikstürden sonra değiştiyse yukarıdaki göç testi geçerli
      const sim = Simulasyon.anlikGoruntudenYukle(veri, metin);
      const v2 = JSON.parse(anlikGoruntuOlustur(sim, ust.kural)) as { dunya: unknown; durumOzeti: string };
      const v1 = JSON.parse(metin) as { dunya: unknown; durumOzeti: string };
      expect(kanonikSerilestir(v2.dunya)).toBe(kanonikSerilestir(v1.dunya));
      expect(v2.durumOzeti).toBe(v1.durumOzeti);
    });

    it(`${ad}: v1 + değişmiş içerik: eskiTablo yoksa açık hata; gocIzni yoksa kural sürümü hatası`, () => {
      const genis = icerikGenislet(veriKur(), "sona");
      expect(hata(() => Simulasyon.anlikGoruntudenYukle(genis, metin)).yol).toBe("$.kuralSurumu");
      const e = hata(() => Simulasyon.anlikGoruntudenYukle(genis, metin, [], { gocIzni: true }));
      expect(e.yol).toBe("$.icerikKimlikTablosu");
      expect(e.message).toMatch(/eskiTablo/);
    });

    it(`${ad}: v1 + sona/araya eklenmiş içerik (eskiTablo ile): yüklenir, eski her şey kimlikle aynı`, () => {
      const eski = veriKur();
      const ref = Simulasyon.anlikGoruntudenYukle(eski, metin, [], { gocIzni: true, eskiTablo: ust.tablo });
      for (const kip of ["sona", "araya"] as const) {
        const genis = icerikGenislet(veriKur(), kip);
        const r = Simulasyon.anlikGoruntudenYukleSonuclu(genis, metin, [], { gocIzni: true, eskiTablo: ust.tablo });
        expect(r.goc.yenidenIndekslendi).toBe(true);
        expect(r.goc.yalnizEkle).toBe(kip === "sona");
        expect(kanonikSerilestir(kimlikliGorunum(r.sim.dunya, r.sim.ic, ust.tablo))).toBe(kanonikSerilestir(kimlikliGorunum(ref.dunya, ref.ic, ust.tablo)));
      }
    });
  }
});

describe("(a) içeriğin SONUNA kimlik eklenmiş: eski görüntü yüklenir, mevcut her şey aynı", () => {
  for (const [ad, uret] of DUNYALAR) {
    it(`${ad}`, () => {
      const s = uret();
      const veri = s.ic === undefined ? miniVeriyiYukle() : miniVeriyiYukle();
      const eskiKural = kuralSurumuHesapla(veri);
      const metin = anlikGoruntuOlustur(s, eskiKural);
      const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
      const genis = icerikGenislet(veri, "sona");
      expect(kuralSurumuHesapla(genis)).not.toBe(eskiKural);

      // gocIzni olmadan: açık kural sürümü hatası (varsayılan davranış korunur)
      expect(hata(() => Simulasyon.anlikGoruntudenYukle(genis, metin)).message).toMatch(/kural surumu uyusmuyor/);

      const r = Simulasyon.anlikGoruntudenYukleSonuclu(genis, metin, [], { gocIzni: true });
      expect(r.goc.yenidenIndekslendi).toBe(true);
      expect(r.goc.kuralDegisti).toBe(true);
      expect(r.goc.yalnizEkle).toBe(true);
      expect(r.goc.ihlaller).toEqual([]);
      expect(r.goc.eklenen).toEqual(yeniKimlikler());
      expect(r.goc.eskiDurumOzeti).toBe(s.durumOzeti());
      expect(r.sim.durumOzeti()).not.toBe(s.durumOzeti()); // dizi uzunlukları değişti (kaçınılmaz); eskiDurumOzeti yazıldığı hali doğrular

      // Mevcut her şey kimlikle aynı
      expect(kanonikSerilestir(kimlikliGorunum(r.sim.dunya, r.sim.ic, eskiTablo))).toBe(kanonikSerilestir(kimlikliGorunum(s.dunya, s.ic, eskiTablo)));
      // Mevcut kimliklerin indeksleri DEĞİŞMEDİ (sona ekleme): eski dizi, yeni dizinin önekidir
      const eskiStok = kanonikSerilestir(s.dunya.bolgeler[0]!.stoklar);
      const yeniStok = kanonikSerilestir(r.sim.dunya.bolgeler[0]!.stoklar.slice(0, s.ic.mallar.length));
      expect(yeniStok).toBe(eskiStok);

      // Yeni kimlikler varsayılanla dolu
      const d = r.sim.dunya;
      const m0 = s.ic.mallar.length;
      const titan = r.sim.ic.malIndeks["titanyum"] as number;
      expect(titan).toBe(m0);
      for (const b of d.bolgeler) {
        for (const j of [m0, m0 + 1]) {
          const st = b.stoklar[j]!;
          expect(st).toEqual({ miktar: 0, yerelOran: 0, gelenOran: 0, t0: d.zaman, artik: 0, kapasite: st.kapasite, surum: 0 });
          expect(st.kapasite).toBe(r.sim.ic.param.ekonomi.depoKapasitesi);
          expect([b.israf[j], b.uretimToplam[j], b.uretimOrani[j], b.rezervIlk[j], b.rezervKalan[j]]).toEqual([0, 0, 0, 0, 0]);
          if (b.kesifSayisi !== undefined) expect(b.kesifSayisi[j]).toBe(0);
          expect(d.lojistik.kapsam[b.indeks]![j]).toEqual({ karsilanmaPpm: 0, enYakinKaynakMs: -1, neden: "yok" });
        }
        expect(b.birlikler.slice(s.ic.birlikler.length)).toEqual([0, 0]);
        if (b.tarim !== undefined) {
          expect(b.tarim.ekimPpm.slice(s.ic.icerik.tarimUrunleri!.length)).toEqual([0, 0]);
          expect(b.tarim.ekimPpm.reduce((a, x) => a + x, 0)).toBe(1_000_000);
        }
      }
      expect(d.pazar.fiyat[titan]).toBe(r.sim.ic.mallar[titan]!.tabanFiyat);
      expect(d.pazar.oyuncuTalebi.slice(m0)).toEqual([0, 0]);
      for (const o of d.oyuncular) for (const t of o.teknolojiler) expect(t).toBeLessThan(s.ic.teknolojiler.length);

      // Göçten sonra lojistik çözüm planlıdır; dünya yeni içerikte sorunsuz ilerler ve bir daha yazılıp yüklenince aynıdır
      expect(d.lojistik.kirli).toBe(true);
      r.sim.calistirKadar(d.zaman + 2 * GUN);
      const yeniKural = kuralSurumuHesapla(genis);
      const yeniMetin = anlikGoruntuOlustur(r.sim, yeniKural);
      const geri = Simulasyon.anlikGoruntudenYukleSonuclu(genis, yeniMetin);
      expect(geri.goc.yenidenIndekslendi).toBe(false);
      expect(geri.sim.durumOzeti()).toBe(r.sim.durumOzeti());
    });
  }

  it("ileri koşu: yeni kimlikler kullanılmadığı sürece eski ve göçmüş dünya KİMLİKLE aynı gelişir (stok, fiyat, savaş...)", () => {
    const s = botDunyasi();
    const veri = miniVeriyiYukle();
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
    const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(icerikGenislet(veri, "sona"), metin, [], { gocIzni: true });
    const hedef = s.dunya.zaman + 3 * GUN;
    s.calistirKadar(hedef);
    r.sim.calistirKadar(hedef);
    const a = kimlikliGorunum(s.dunya, s.ic, eskiTablo) as { pazar: unknown; bolgeler: { stoklar: unknown }[] };
    const b = kimlikliGorunum(r.sim.dunya, r.sim.ic, eskiTablo) as typeof a;
    expect(b.bolgeler.map((x) => x.stoklar)).toEqual(a.bolgeler.map((x) => x.stoklar));
    expect(b.pazar).toEqual(a.pazar);
    expect(anlikHazine(r.sim.dunya, "o0")).toBe(anlikHazine(s.dunya, "o0"));
  }, 120_000);
});

describe("(b) ARAYA ekleme / sıra değişimi: kimlik eşlemesiyle eski görüntü doğru yüklenir", () => {
  for (const [ad, uret] of DUNYALAR) {
    it(`${ad}`, () => {
      const s = uret();
      const veri = miniVeriyiYukle();
      const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
      const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
      const genis = icerikGenislet(veri, "araya");
      // Ayrıca mevcut kimlikleri yeniden sırala (mal ve tesis türü)
      [genis.icerik.mallar[0], genis.icerik.mallar[1]] = [genis.icerik.mallar[1]!, genis.icerik.mallar[0]!];
      genis.icerik.tesisTurleri.reverse();

      const r = Simulasyon.anlikGoruntudenYukleSonuclu(genis, metin, [], { gocIzni: true });
      expect(r.goc.yenidenIndekslendi).toBe(true);
      expect(r.goc.yalnizEkle).toBe(false);
      expect(r.goc.ihlaller.some((i) => i.tur === "araya_eklenen")).toBe(true);
      expect(r.goc.ihlaller.some((i) => i.tur === "tasinan")).toBe(true);
      expect(siraliTablo(r.goc.eklenen)).toEqual(siraliTablo(yeniKimlikler()));
      // mevcut her şey kimlikle aynı, indeksleri kaymış olsa da
      expect(kanonikSerilestir(kimlikliGorunum(r.sim.dunya, r.sim.ic, eskiTablo))).toBe(kanonikSerilestir(kimlikliGorunum(s.dunya, s.ic, eskiTablo)));
      expect(r.sim.ic.malIndeks["titanyum"]).not.toBe(s.ic.mallar.length);
      // dünya yeni içerikle sorunsuz ilerler (kuyruktaki mal alanları, akışlar, parti birlikleri yeni indekslerde)
      r.sim.calistirKadar(r.sim.dunya.zaman + 2 * GUN);
      for (const b of r.sim.dunya.bolgeler) for (const st of b.stoklar) expect(st.miktar).toBeGreaterThanOrEqual(0);
      // yalnızEkleZorunlu: aynı yükleme açık hata
      const e = hata(() => Simulasyon.anlikGoruntudenYukle(genis, metin, [], { gocIzni: true, yalnizEkleZorunlu: true }));
      expect(e.message).toMatch(/yalniz-ekle ihlali/);
      expect(e.yol).toMatch(/^\$\.icerikKimlikTablosu\./);
      // ... ama sona ekleme geçer
      expect(Simulasyon.anlikGoruntudenYukle(icerikGenislet(veri, "sona"), metin, [], { gocIzni: true, yalnizEkleZorunlu: true }).dunya.zaman).toBe(s.dunya.zaman);
    });
  }

  it("kaydırılan kimlikler: teknoloji listesi sıralı, savaş sonucu ve parti birliği yeni indekste", () => {
    const s = zenginDunya();
    const veri = miniVeriyiYukle();
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
    const genis = icerikGenislet(veri, "araya"); // birlik ve teknoloji 0. indekse eklenir
    const r = Simulasyon.anlikGoruntudenYukle(genis, metin, [], { gocIzni: true });
    const pi = r.ic.birlikIndeks["piyade_tumeni"] as number;
    expect(pi).toBe(s.ic.birlikIndeks["piyade_tumeni"]! + 2);
    expect(r.dunya.partiler[0]!.birlik).toBe(pi);
    expect(r.dunya.savaslar[0]!.sonuc!.saldiranBirlikKaybi.length).toBe(genis.icerik.birlikler.length);
    const tek = r.dunya.oyuncular.find((o) => o.id === "b")!.teknolojiler;
    expect(tek).toEqual([r.ic.teknolojiIndeks["mekanize_tarim"]]);
    const ar = r.dunya.oyuncular.find((o) => o.id === "a")!.arastirma!;
    expect(ar.teknoloji).toBe(r.ic.teknolojiIndeks["mekanize_tarim"]);
  });
});

describe("(c) kaldırılmış kimlik: açık hata (yalnız-ekle ilkesi)", () => {
  const s = zenginDunya();
  const veri = miniVeriyiYukle();
  const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
  const cikarilacak: [keyof IcerikKimlikTablosu, string][] = [
    ["mallar", "gubre"],
    ["tesisTurleri", "muhimmat_fabrikasi"],
    ["yontemler", "mekanize_tarim"],
    ["birlikler", "zirhli_tumen"],
    ["teknolojiler", "mekanize_tarim"],
    ["tarimUrunleri", "nadas"],
  ];
  for (const [uzay, kimlik] of cikarilacak) {
    it(`${uzay}: ${kimlik} çıkarılırsa SerilestirmeHatasi (yol tablo uzayını gösterir)`, () => {
      const az = icerikdenCikar(veri, uzay, kimlik);
      const e = hata(() => Simulasyon.anlikGoruntudenYukle(az, metin, [], { gocIzni: true }));
      expect(e).toBeInstanceOf(SerilestirmeHatasi);
      expect(e.yol).toMatch(new RegExp(`^\\$\\.icerikKimlikTablosu\\.${uzay}\\[\\d+\\]$`));
      expect(e.message).toContain(`kaldirilmis kimlik: ${kimlik}`);
      // gocIzni olmadan da yüklenemez (kural sürümü)
      expect(hata(() => Simulasyon.anlikGoruntudenYukle(az, metin)).yol).toBe("$.kuralSurumu");
    });
  }

  it("çıkarma + ekleme birlikte: yine hata (bir kimlik kaybolduysa yeni eklenenler kurtarmaz)", () => {
    const v = icerikGenislet(icerikdenCikar(veri, "mallar", "gubre"), "sona");
    expect(hata(() => Simulasyon.anlikGoruntudenYukle(v, metin, [], { gocIzni: true })).message).toMatch(/kaldirilmis kimlik: gubre/);
  });
});

describe("kural sürümü politikası", () => {
  const s = botDunyasi();
  const veri = miniVeriyiYukle();
  const kural = kuralSurumuHesapla(veri);
  const metin = anlikGoruntuOlustur(s, kural);

  it("yalnız parametre değişti (kimlikler aynı): gocIzni olmadan hata, gocIzni ile yüklenir ve yeniden indekslenmez", () => {
    const v = structuredClone(veri);
    v.param.ekonomi.varsayilanVergiPpm++;
    expect(hata(() => Simulasyon.anlikGoruntudenYukle(v, metin)).message).toMatch(/gocIzni/);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(v, metin, [], { gocIzni: true });
    expect(r.goc).toMatchObject({ yenidenIndekslendi: false, kuralDegisti: true, yalnizEkle: true });
    expect(r.sim.durumOzeti()).toBe(s.durumOzeti());
  });

  it("kural sürümü aynı ama tablo mevcut içerikten farklı: bozuk görüntü hatası", () => {
    const ham = JSON.parse(metin) as { icerikKimlikTablosu: IcerikKimlikTablosu };
    const t = ham.icerikKimlikTablosu;
    [t.mallar[0], t.mallar[1]] = [t.mallar[1]!, t.mallar[0]!];
    const e = hata(() => Simulasyon.anlikGoruntudenYukle(veri, JSON.stringify(ham)));
    expect(e.yol).toBe("$.icerikKimlikTablosu");
    expect(e.message).toMatch(/bozuk goruntu/);
  });

  it("anlikGoruntuUyarla doğrudan: göç raporu ve yerinde dönüşüm", () => {
    const g = anlikGoruntuCoz(metin);
    const genis = icerikGenislet(veri, "sona");
    const ic = Simulasyon.olustur(genis, 1).ic;
    const { dunya, goc } = anlikGoruntuUyarla(g, ic, kuralSurumuHesapla(genis), { gocIzni: true });
    expect(dunya).toBe(g.dunya);
    expect(dunya.bolgeler[0]!.stoklar.length).toBe(genis.icerik.mallar.length);
    expect(goc.eskiKuralSurumu).toBe(kural);
    expect(goc.yeniKuralSurumu).toBe(kuralSurumuHesapla(genis));
  });
});

describe("yalnizEkleDenetimi ve içerik kimlik kilidi", () => {
  const t = (mallar: string[]): IcerikKimlikTablosu => ({ ...YOK_TABLO, mallar });

  it("sona ekleme geçer; silme, taşıma ve araya ekleme ihlaldir", () => {
    expect(yalnizEkleDenetimi(t(["a", "b"]), t(["a", "b", "c"]))).toMatchObject({ yalnizEkle: true, eklenen: { mallar: ["c"] } });
    expect(yalnizEkleDenetimi(t(["a", "b"]), t(["a", "b"])).yalnizEkle).toBe(true);
    const silme = yalnizEkleDenetimi(t(["a", "b", "c"]), t(["a", "c"]));
    expect(silme.yalnizEkle).toBe(false);
    expect(silme.silinen.mallar).toEqual(["b"]);
    expect(silme.ihlaller.map((i) => i.tur)).toEqual(["silinen", "tasinan"]);
    const araya = yalnizEkleDenetimi(t(["a", "b"]), t(["a", "x", "b"]));
    expect(araya.ihlaller).toEqual([
      { tablo: "mallar", tur: "tasinan", kimlik: "b", eskiIndeks: 1, yeniIndeks: 2 },
      { tablo: "mallar", tur: "araya_eklenen", kimlik: "x", eskiIndeks: -1, yeniIndeks: 1 },
    ]);
    const sira = yalnizEkleDenetimi(t(["a", "b"]), t(["b", "a"]));
    expect(sira.ihlaller.map((i) => i.tur)).toEqual(["tasinan", "tasinan"]);
  });

  it("gerçek içerik KİLİDİ: icerik.json'daki kimlik sırası kilit dosyasının üzerine yalnız ekleme olmalı (silme/yeniden sıralama yasak)", () => {
    const kilit = JSON.parse(oku("icerik-kimlik-kilidi.json")) as IcerikKimlikTablosu;
    const mevcut = icerikKimlikTablosuOlustur(Simulasyon.olustur(miniVeriyiYukle(), 1).ic);
    const d = yalnizEkleDenetimi(kilit, mevcut);
    expect(d.ihlaller, "icerik.json yalniz sona eklenebilir; kasitli kirici degisiklik icin fikstur-goc/icerik-kimlik-kilidi.json bilincli guncellenmeli").toEqual([]);
  });
});

describe("(d) mülk kipi ve ek yapılar (dize kimlikli): gidiş-dönüş ve göç", () => {
  function mulkVeri2(): Veri {
    return mulkVeriTam((x) => {
      const m = x.param.mulk!;
      m.yeniOyuncu.hibe = 2_000_000_000;
      m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
      m.yeniOyuncu.indirimliYapiSayisi = 0;
      m.yeniOyuncu.ayrilmisHucrePpm = 0;
      m.esZamanliInsaat = 10;
    });
  }
  const ILCE = "sn_m_ova_merkez";

  function mulkDunyasi(): Simulasyon {
    const s = mulkSim(["a", "b"], mulkVeri2(), 7);
    const hs = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ambar", hucreler: [hs[0]!] });
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ticaret_ofisi", hucreler: [hs[1]!] });
    s.calistirKadar(5 * SAAT);
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "konut", hucreler: [hs[2]!] });
    s.calistirKadar(s.dunya.zaman + 3 * SAAT);
    tamam(s, "a", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: bitisikCift(hs, hs.slice(0, 3)) }); // süren inşaat (odenenMal)
    s.calistirKadar(s.dunya.zaman + 10 * 60_000);
    expect(s.dunya.insaatlar.length).toBeGreaterThan(0);
    return s;
  }

  it("aynı içerik: v2 gidiş-dönüş (ek yapılar, işletme düğümleri, inşaat ödenen malzeme, özet) birebir", () => {
    const s = mulkDunyasi();
    const veri = mulkVeri2();
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(veri, metin);
    expect(r.goc.yenidenIndekslendi).toBe(false);
    expect(r.sim.durumOzeti()).toBe(s.durumOzeti());
    const ek = r.sim.dunya.bolgeler.flatMap((b) => (b.ekYapilar ?? []).map((e) => e.tur)).sort();
    expect(ek).toEqual(["ambar", "konut", "ticaret_ofisi"].sort());
    expect(r.sim.dunya.insaatlar.some((i) => i.odenenMal !== undefined)).toBe(true);
    // yükleneni ilerlet = orijinali ilerlet
    s.calistirKadar(s.dunya.zaman + GUN);
    r.sim.calistirKadar(r.sim.dunya.zaman + GUN);
    expect(r.sim.durumOzeti()).toBe(s.durumOzeti());
  });

  for (const kip of ["sona", "araya"] as const) {
    it(`içerik '${kip}' genişletilmiş: ek yapılar korunur; işletme düğümü yeni mala merkezden rezerv ve Ambar kapasitesi alır; gidiş-dönüş kararlı`, () => {
      const s = mulkDunyasi();
      const veri = mulkVeri2();
      const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
      const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
      const genis = icerikGenislet(veri, kip);
      const r = Simulasyon.anlikGoruntudenYukleSonuclu(genis, metin, [], { gocIzni: true });
      expect(r.goc.yenidenIndekslendi).toBe(true);
      expect(r.goc.yalnizEkle).toBe(kip === "sona");
      expect(kanonikSerilestir(kimlikliGorunum(r.sim.dunya, r.sim.ic, eskiTablo))).toBe(kanonikSerilestir(kimlikliGorunum(s.dunya, s.ic, eskiTablo)));
      const d = r.sim.dunya;
      const ambar = r.sim.ic.mulk!.ekYapilar.find((y) => y.id === "ambar")!;
      const isletme = d.bolgeler.find((b) => b.merkez !== undefined && (b.ekYapilar ?? []).some((e) => e.tur === "ambar"))!;
      const ti = r.sim.ic.malIndeks["titanyum"] as number;
      expect(isletme.stoklar[ti]!.kapasite).toBe(r.sim.ic.param.ekonomi.depoKapasitesi + ambar.depoKapasiteEkiMili);
      const merkez = d.bolgeler[isletme.merkez!]!;
      expect(isletme.rezervIlk[ti]).toBe(merkez.rezervIlk[ti]);
      expect(isletme.rezervKalan[ti]).toBe(isletme.rezervIlk[ti]);
      // ek yapı dize kimlikleri değişmeden durur
      expect(d.bolgeler.flatMap((b) => (b.ekYapilar ?? []).map((e) => e.tur)).sort()).toEqual(["ambar", "konut", "ticaret_ofisi"].sort());
      // ilerlet, yaz, yükle: kararlı
      r.sim.calistirKadar(d.zaman + GUN);
      const yeni = anlikGoruntuOlustur(r.sim, kuralSurumuHesapla(genis));
      const geri = Simulasyon.anlikGoruntudenYukle(genis, yeni);
      expect(geri.durumOzeti()).toBe(r.sim.durumOzeti());
      // Mülk kipinde yeni tesis türü de kullanılabilir (yeni kimlik gerçekten işler)
      expect(r.sim.ic.tesisTuruIndeks["titan_tesisi"]).toBeDefined();
    });
  }

  it("mülk durumu olan görüntü mülksüz içerikle yüklenemez (mevcut denetim korunur)", () => {
    const s = mulkDunyasi();
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(mulkVeri2()));
    const bolgeVeri = miniVeriyiYukle();
    expect(() => Simulasyon.anlikGoruntudenYukle(bolgeVeri, metin, [], { gocIzni: true })).toThrow(SerilestirmeHatasi);
  });
});

/** Bozma testlerinde zarfın gevşek (düzenlenebilir) görünümü. */
type Zarf = { icerikKimlikTablosu?: Record<string, string[] | undefined>; surum?: number; [k: string]: unknown };

describe("bozuk zarf", () => {
  const s = botDunyasi();
  const kural = kuralSurumuHesapla(miniVeriyiYukle());
  const metin = anlikGoruntuOlustur(s, kural);
  function boz(f: (z: Zarf) => void): string {
    const z = JSON.parse(metin) as Zarf;
    f(z);
    return JSON.stringify(z);
  }
  it("v2 zarfta kimlik tablosu zorunlu; v1 zarfta olmamalı; bilinmeyen sürüm reddedilir", () => {
    expect(hata(() => anlikGoruntuCoz(boz((z) => delete z.icerikKimlikTablosu))).yol).toBe("$.icerikKimlikTablosu");
    expect(hata(() => anlikGoruntuCoz(boz((z) => (z.surum = 1)))).yol).toBe("$.icerikKimlikTablosu");
    expect(hata(() => anlikGoruntuCoz(boz((z) => (z.surum = 3)))).yol).toBe("$.surum");
    expect(hata(() => anlikGoruntuCoz(boz((z) => delete z.surum))).yol).toBe("$.surum");
  });
  it("kimlik tablosu bozuklukları: tekrar, boş kimlik, bilinmeyen uzay, eksik uzay, dünya ile uzunluk uyumsuzluğu", () => {
    expect(hata(() => anlikGoruntuCoz(boz((z) => z.icerikKimlikTablosu!.mallar!.push(z.icerikKimlikTablosu!.mallar![0]!)))).message).toMatch(/tekrarlanan kimlik/);
    expect(hata(() => anlikGoruntuCoz(boz((z) => (z.icerikKimlikTablosu!.mallar![0] = "")))).message).toMatch(/bos kimlik/);
    expect(hata(() => anlikGoruntuCoz(boz((z) => (z.icerikKimlikTablosu!.yok = [])))).yol).toBe("$.icerikKimlikTablosu.yok");
    expect(hata(() => anlikGoruntuCoz(boz((z) => delete z.icerikKimlikTablosu!.birlikler))).yol).toBe("$.icerikKimlikTablosu.birlikler");
    const e = hata(() => anlikGoruntuCoz(boz((z) => z.icerikKimlikTablosu!.mallar!.push("fazla"))));
    expect(e.yol).toBe("$.dunya.bolgeler[0].stoklar");
    expect(e.message).toMatch(/kimlik tablosunda/);
  });
  it("tablodaki sayısal indeksler dünya ile uyumsuzsa (tesis türü aralık dışı) çözümde yakalanır", () => {
    const e = hata(() => anlikGoruntuCoz(boz((z) => (z.icerikKimlikTablosu!.tesisTurleri = z.icerikKimlikTablosu!.tesisTurleri!.slice(0, 2)))));
    expect(e.yol).toMatch(/^\$\.dunya\.bolgeler\[\d+\]\.tesisler\[\d+\]\.tur$/);
  });
});

describe("kapsam taraması: indeksli her dizi göçte taşınır (yeni indeksli alan eklenip unutulursa bu test kırılır)", () => {
  /** Dünyada MAL uzunluğunda olabilecek bilinen dizi yolları ([*] normalleştirilmiş). */
  const MAL_DIZILERI = new Set([
    "$.bolgeler[*].stoklar",
    "$.bolgeler[*].israf",
    "$.bolgeler[*].uretimToplam",
    "$.bolgeler[*].uretimOrani",
    "$.bolgeler[*].rezervIlk",
    "$.bolgeler[*].rezervKalan",
    "$.bolgeler[*].kesifSayisi",
    "$.pazar.fiyat",
    "$.pazar.oyuncuTalebi",
    "$.pazar.oyuncuArzi",
    "$.lojistik.kapsam[*]",
    "$.savaslar[*].sonuc.stokKaybi",
  ]);
  const BIRLIK_DIZILERI = new Set(["$.bolgeler[*].birlikler", "$.savaslar[*].sonuc.saldiranBirlikKaybi", "$.savaslar[*].sonuc.savunanBirlikKaybi"]);
  const URUN_DIZILERI = new Set(["$.bolgeler[*].tarim.ekimPpm"]);

  for (const [ad, uret] of DUNYALAR) {
    it(`${ad}`, () => {
      const s = uret();
      const veri = miniVeriyiYukle();
      const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
      const yasak = diziUzunluklari(s.dunya);
      const genis = icerikGenislet(veri, "sona");
      // Her uzayı, dünyadaki başka hiçbir dizinin uzunluğu olmayan bir boyuta getir
      const hedef = { mallar: genis.icerik.mallar.length, birlikler: genis.icerik.birlikler.length, tarimUrunleri: genis.icerik.tarimUrunleri!.length };
      const digerleri = (uzay: keyof typeof hedef): number[] => Object.entries(hedef).filter(([k]) => k !== uzay).map(([, n]) => n);
      for (const uzay of ["mallar", "birlikler", "tarimUrunleri"] as const) {
        while (yasak.has(hedef[uzay]) || digerleri(uzay).includes(hedef[uzay])) {
          const liste = genis.icerik[uzay] as unknown as { id: string }[];
          liste.push({ ...structuredClone(liste[liste.length - 1]!), id: `yer_tutucu_${uzay}_${liste.length}` });
          hedef[uzay] = liste.length;
        }
      }
      const r = Simulasyon.anlikGoruntudenYukle(genis, metin, [], { gocIzni: true });
      const sec = (uzay: keyof typeof hedef, bilinen: Set<string>): void => {
        const bulunan = diziYollari(r.dunya, hedef[uzay]);
        const bilinmeyen = [...bulunan].filter((y) => !bilinen.has(y));
        expect(bilinmeyen, `${uzay} uzunlugunda (${hedef[uzay]}) bilinmeyen dizi: goc kodu (goc.ts dunyaYenidenIndeksle) ve bu liste guncellenmeli`).toEqual([]);
        // Eski içerikte o uzunlukta olan her bilinen dizi, göçten sonra yeni uzunlukta bulunur (taşınmayan dizi yok)
        const eskiBoy = { mallar: s.ic.mallar.length, birlikler: s.ic.birlikler.length, tarimUrunleri: s.ic.icerik.tarimUrunleri!.length }[uzay];
        const eskiBilinen = [...diziYollari(s.dunya, eskiBoy)].filter((y) => bilinen.has(y));
        for (const y of eskiBilinen) expect(bulunan.has(y), `${uzay}: ${y} goc sonrasi yeni uzunlukta degil`).toBe(true);
      };
      sec("mallar", MAL_DIZILERI);
      sec("birlikler", BIRLIK_DIZILERI);
      sec("tarimUrunleri", URUN_DIZILERI);
    });
  }
});
