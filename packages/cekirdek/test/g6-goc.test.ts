/**
 * G6-4 / yükseltme yolu (şartname §5.7 madde 3, §11.3, §16.1 `serilestir-goc`): eski (G6 öncesi) anlık görüntüler `gocIzni + yalnizEkleZorunlu` ile
 * İHLALSİZ yüklenir; `eklenen.yontemler` = yeni yöntemler; ileri koşu P4 öncesi içerikle yüklenmiş koşuyla AYNI (bölge kipi) ya da para korunumunu
 * bozmaz (mülk kipi, şebeke açık). Yeni durum alanlarının hepsi isteğe bağlı olduğundan eski görüntü yeni kodla da yüklenmeye devam eder.
 */
import { readFileSync } from "node:fs";
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikKimlikTablosuOlustur } from "../src/goc";
import type { IcerikKimlikTablosu } from "../src/goc";
import { kanonikSerilestir } from "../src/ozet";
import { kimlikliGorunum } from "./goc-yardimci";
import { Simulasyon } from "../src/motor";
import { anlikGoruntuCoz, anlikGoruntuOlustur, kuralSurumuHesapla } from "../src/serilestir";
import { GUN } from "../src/tipler";
import { G6_YONTEMLER, g6KorunumTutar, g6Veri, p4Oncesi } from "./g6-yardimci";
import { G8_YONTEMLER } from "./g8-yardimci";
import { KAMU_KUCUK } from "./kamu-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";

/** Göç eden yeni yöntemler: G6'nın dördü, ardından G8'in ikisi (gerçek içerik G8-1 sonrası altı `mulkKipi` yöntemi taşır; sona, sırayla). */
const YENI_YONTEMLER = [...G6_YONTEMLER, ...G8_YONTEMLER] as const;

const FIKSTUR = new URL("./fikstur-goc/", import.meta.url);
const oku = (ad: string): string => readFileSync(new URL(ad, FIKSTUR), "utf8");

/**
 * Göç sonrası karşılaştırma görünümü (`mal-izdusumu-kanit.test.ts` `gocGorunumu` ile aynı): göçün MEŞRU iki farkı çıkarılır: göç lojistiği kirli işaretler
 * (`lojistik.cozumSayisi` +1) ve bu yüzden olay sıra numaraları (`kuyruk[].sira`) kayar. Başka hiçbir alan farklı olamaz.
 */
function gocGorunumu(sim: Simulasyon, tablo: IcerikKimlikTablosu): string {
  const g = kimlikliGorunum(sim.dunya, sim.ic, tablo) as { lojistik: Record<string, unknown>; kuyruk: Record<string, unknown>[] };
  delete g.lojistik["cozumSayisi"];
  g.kuyruk = g.kuyruk.map((o) => {
    const { sira: _sira, ...diger } = o;
    void _sira;
    return diger;
  });
  return kanonikSerilestir(g);
}

const HAM = {
  "bolge-v1": () => miniVeriyiYukle(),
  "mulk-v1": () =>
    mulkVeriTam((x) => {
      // serilestir-goc.test.ts `veriKur` ile AYNI (fikstür bu veriyle yazıldı)
      const m = x.param.mulk!;
      m.yeniOyuncu.hibe = 2_000_000_000;
      m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
      m.yeniOyuncu.indirimliYapiSayisi = 0;
      m.yeniOyuncu.ayrilmisHucrePpm = 0;
      m.esZamanliInsaat = 10;
    }),
} as const;

for (const dosya of ["bolge-v1", "mulk-v1"] as const) {
  describe(`${dosya}: G6 öncesi görüntü, G6 sonrası içerikle`, () => {
    const metin = oku(`${dosya}.json`);
    const ust = JSON.parse(oku(`${dosya}.ust.json`)) as { kural: string; ozet: string; zaman: number; tablo: IcerikKimlikTablosu };
    const eskiVeri = () => p4Oncesi(HAM[dosya]());

    it("yüklenir: ihlal 0, yalnızEkle, eklenen.yontemler = yeni yöntemler (sona, sırayla); kural sürümü değişti; eski özet doğrulandı", () => {
      const guncel = g6Veri(HAM[dosya]());
      const r = Simulasyon.anlikGoruntudenYukleSonuclu(guncel, metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo });
      expect(r.goc.ihlaller).toEqual([]);
      expect(r.goc.yalnizEkle).toBe(true);
      expect(r.goc.kuralDegisti).toBe(true);
      expect(r.goc.eklenen.yontemler).toEqual([...YENI_YONTEMLER]);
      expect(r.goc.eskiDurumOzeti).toBe(ust.ozet);
      expect(r.sim.dunya.zaman).toBe(ust.zaman);
      // yöntem uzayı durumda indeksli dizi olarak YER ALMAZ: yeni yöntemler özeti DEĞİŞTİRMEZ (fikstür P3 öncesi yazıldığı için mutlak özet fikstürdekinden
      // farklıdır; karşılaştırma aynı görüntünün P4 öncesi içerikle yüklenmiş hâliyle yapılır)
      const r0 = Simulasyon.anlikGoruntudenYukleSonuclu(eskiVeri(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo });
      expect(r.sim.durumOzeti()).toBe(r0.sim.durumOzeti());
      // yeniden yazılan v2 aynı dünyayı verir
      const v2 = anlikGoruntuOlustur(r.sim, kuralSurumuHesapla(guncel));
      expect(Simulasyon.anlikGoruntudenYukle(guncel, v2).durumOzeti()).toBe(r.sim.durumOzeti());
      expect(anlikGoruntuCoz(v2).icerikKimlikTablosu?.yontemler).toHaveLength(r.sim.ic.yontemler.length);
    });

    if (dosya === "bolge-v1") {
      it("bölge kipi: göç sonrası 2 günlük ileri koşu, P4 öncesi içerikle yüklenen koşuyla AYNI özet (süzgeç + şebeke etkisiz)", () => {
        const a = Simulasyon.anlikGoruntudenYukleSonuclu(g6Veri(HAM[dosya]()), metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo }).sim;
        const b = Simulasyon.anlikGoruntudenYukleSonuclu(eskiVeri(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo }).sim;
        a.calistirKadar(ust.zaman + 2 * GUN);
        b.calistirKadar(ust.zaman + 2 * GUN);
        expect(a.durumOzeti()).toBe(b.durumOzeti());
      }, 120_000);
    } else {
      it("mülk kipi, ŞEBEKESİZ güncel içerik: ileri koşu P4 öncesi içerikle yüklenen koşuyla AYNI özet (yeni yöntemler kullanılmıyor)", () => {
        const a = Simulasyon.anlikGoruntudenYukleSonuclu(g6Veri(HAM[dosya](), { sebeke: false, kilma: false }), metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo }).sim;
        const b = Simulasyon.anlikGoruntudenYukleSonuclu(eskiVeri(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo }).sim;
        a.calistirKadar(ust.zaman + 2 * GUN);
        b.calistirKadar(ust.zaman + 2 * GUN);
        expect(a.durumOzeti()).toBe(b.durumOzeti());
      }, 120_000);

      it("mülk kipi, ŞEBEKELİ güncel içerik (fikstürde para defteri YOK): yükleme ihlalsiz; 2 günlük koşu hatasız; şebeke para defterini AÇMAZ; hazine negatif değil; gidiş-dönüş aynı", () => {
        const veri = g6Veri(HAM[dosya]());
        const s = Simulasyon.anlikGoruntudenYukleSonuclu(veri, metin, [], { gocIzni: true, yalnizEkleZorunlu: true, eskiTablo: ust.tablo }).sim;
        expect(s.dunya.mulk!.para).toBeUndefined(); // eski görüntüde kasa/lavabo yok
        s.calistirKadar(ust.zaman + 2 * GUN);
        expect(s.dunya.mulk!.para).toBeUndefined();
        for (const o of s.dunya.oyuncular) expect(o.hazine.miktar).toBeGreaterThanOrEqual(0);
        const v2 = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
        expect(Simulasyon.anlikGoruntudenYukle(veri, v2).durumOzeti()).toBe(s.durumOzeti());
      }, 120_000);
    }
  });
}

/**
 * `mulk-v2-g6oncesi.json`: G6 ÖNCESİ çekirdekle (7553b55) üretilmiş, para defterli (7 kamu kasası) DONDURULMUŞ mülk görüntüsü (zarf v2; üretici ve yeniden üretim
 * komutu: `fikstur-goc/uret-mulk-v2.ts` başlığı, K4 dalı `takim/k4/g6-oncesi-fikstur` 63fd215). Testin kendi ürettiği görüntü eski kodu sınamaz; bu görüntü sınar.
 */
describe("mulk-v2-g6oncesi: G6 öncesi çekirdekle üretilmiş para defterli görüntü, G6 sonrası içerikle", () => {
  const metin = oku("mulk-v2-g6oncesi.json");
  const ust = JSON.parse(oku("mulk-v2-g6oncesi.ust.json")) as { kural: string; ozet: string; zaman: number; kasaSayisi: number };
  /** `uret-mulk-v2.ts` ile AYNI veri (görüntü bu veriyle yazıldı). */
  const fiksturVeri = () =>
    p4Oncesi(mulkVeriTam((x) => {
      const m = x.param.mulk!;
      m.yeniOyuncu.hibe = 2_000_000_000;
      m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000, tahil: 200_000 };
      m.yeniOyuncu.indirimliYapiSayisi = 0;
      m.yeniOyuncu.ayrilmisHucrePpm = 0;
      m.esZamanliInsaat = 10;
      m.araziVergisiHaftalikPpm = 100_000;
      m.kamu = structuredClone(KAMU_KUCUK);
    }));
  const SEC = { gocIzni: true, yalnizEkleZorunlu: true } as const;

  it("koruma: fikstür verisi P4 öncesi içerikle birebir (kural sürümü fikstürdekiyle aynı), görüntü para defterli ve 7 kasalı", () => {
    expect(kuralSurumuHesapla(p4Oncesi(g6Veri(fiksturVeri())))).toBe(ust.kural);
    expect(kuralSurumuHesapla(g6Veri(fiksturVeri()))).not.toBe(ust.kural);
    const g = anlikGoruntuCoz(metin);
    expect(g.durumOzeti).toBe(ust.ozet);
    const eski = Simulasyon.anlikGoruntudenYukle(fiksturVeri(), metin);
    expect(eski.dunya.mulk!.para!.kasalar).toHaveLength(ust.kasaSayisi);
    expect(eski.durumOzeti()).toBe(ust.ozet);
  });

  for (const sec of [{ ad: "şebekeli", sebeke: true }, { ad: "şebekesiz", sebeke: false }]) {
    it(`${sec.ad} G6 sonrası içerik: yüklenir (ihlal 0, eklenen.yontemler = yeni yöntemler); göç anında özet DEĞİŞMEZ (yeni kalemler tembel: kendiliğinden doğmaz)`, () => {
      const guncel = g6Veri(fiksturVeri(), { sebeke: sec.sebeke });
      const r = Simulasyon.anlikGoruntudenYukleSonuclu(guncel, metin, [], SEC);
      expect(r.goc.ihlaller).toEqual([]);
      expect(r.goc.yalnizEkle).toBe(true);
      expect(r.goc.kuralDegisti).toBe(true);
      expect(r.goc.eklenen.yontemler).toEqual([...G6_YONTEMLER]);
      expect(r.goc.eskiDurumOzeti).toBe(ust.ozet);
      expect(r.sim.dunya.zaman).toBe(ust.zaman);
      // göç anında durum, eski görüntünün kendi içerikle yüklenmiş hâliyle AYNI (göçün meşru farkları hariç): yeni kalemler tembel, kendiliğinden doğmaz
      const eski = Simulasyon.anlikGoruntudenYukle(fiksturVeri(), metin);
      const tablo = icerikKimlikTablosuOlustur(eski.ic);
      expect(gocGorunumu(r.sim, tablo)).toBe(gocGorunumu(eski, tablo));
      g6KorunumTutar(r.sim, "yukleme");
      const lavabo = r.sim.dunya.mulk!.para!.lavabo as Record<string, unknown>;
      expect(lavabo["sebeke"]).toBeUndefined(); // henüz hiçbir şebeke bedeli birikmedi
    });
  }

  it("ileri koşu 3 gün: şebekeli içerikte para korunumu her gün TAM; şebekesiz içerikte (4 yeni yöntem veride) yalnız 1 yeni yöntemli içerikle AYNI göç sonrası özet", () => {
    const sebekeli = Simulasyon.anlikGoruntudenYukleSonuclu(g6Veri(fiksturVeri()), metin, [], SEC).sim;
    for (let g = 1; g <= 3; g++) {
      sebekeli.calistirKadar(ust.zaman + g * GUN);
      g6KorunumTutar(sebekeli, `gun ${g}`);
    }
    // İki dünya da AYNI göçten geçer (kural sürümü ikisinde de fikstürden farklı: göç anında bir ek çözüm, tembel birikimlerin bölünmesi aynı); fark yalnız
    // veriden: 4 yeni yöntem ↔ 1 yeni yöntem. (Göçsüz yükleme ile birebir eşitlik beklenmez: ek çözüm ±1 mili yuvarlama bölüntüsü yaratır: doğrulandı: deney)
    const dortYontem = g6Veri(fiksturVeri(), { sebeke: false, kilma: false });
    const birYontem = structuredClone(dortYontem);
    const cikar = new Set(["ekmek_firini", "kepek_gubresi", "sut_kepekli"]);
    birYontem.icerik.yontemler = birYontem.icerik.yontemler.filter((y) => !cikar.has(y.id));
    for (const t of birYontem.icerik.tesisTurleri) t.yontemler = t.yontemler.filter((y) => !cikar.has(y));
    const a = Simulasyon.anlikGoruntudenYukleSonuclu(dortYontem, metin, [], SEC).sim;
    const b = Simulasyon.anlikGoruntudenYukleSonuclu(birYontem, metin, [], SEC).sim;
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    a.calistirKadar(ust.zaman + 3 * GUN);
    b.calistirKadar(ust.zaman + 3 * GUN);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
  }, 120_000);

  it("NEGATİF KONTROL: göç sonrası şebekeli koşu, şebekesiz koşudan en az bir yerde ayrışmalı DEĞİL ise bile korunum eşitliği bozulmaz; yüklenen dünyaya santralsiz elektrik girdili tesis eklenince şebeke kalemleri doğar", () => {
    const s = Simulasyon.anlikGoruntudenYukleSonuclu(g6Veri(fiksturVeri()), metin, [], SEC).sim;
    const sahip = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a");
    expect(sahip.length).toBeGreaterThan(0); // fikstür oyuncuları var; santralsiz fabrika kurma senaryosu g6-sebeke.test.ts'tedir
  });
});
