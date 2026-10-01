/**
 * G6-4 / yükseltme yolu (şartname §5.7 madde 3, §11.3, §16.1 `serilestir-goc`): eski (G6 öncesi) anlık görüntüler `gocIzni + yalnizEkleZorunlu` ile
 * İHLALSİZ yüklenir; `eklenen.yontemler` = yeni yöntemler; ileri koşu P4 öncesi içerikle yüklenmiş koşuyla AYNI (bölge kipi) ya da para korunumunu
 * bozmaz (mülk kipi, şebeke açık). Yeni durum alanlarının hepsi isteğe bağlı olduğundan eski görüntü yeni kodla da yüklenmeye devam eder.
 */
import { readFileSync } from "node:fs";
import { miniVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import type { IcerikKimlikTablosu } from "../src/goc";
import { Simulasyon } from "../src/motor";
import { anlikGoruntuCoz, anlikGoruntuOlustur, kuralSurumuHesapla } from "../src/serilestir";
import { GUN } from "../src/tipler";
import { G6_YONTEMLER, g6Dunya, g6KorunumTutar, g6MulkVeri, g6Veri, p4Oncesi } from "./g6-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";

const FIKSTUR = new URL("./fikstur-goc/", import.meta.url);
const oku = (ad: string): string => readFileSync(new URL(ad, FIKSTUR), "utf8");

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
      expect(r.goc.eklenen.yontemler).toEqual([...G6_YONTEMLER]);
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

      it("para defterli G6 öncesi mülk görüntüsü (bu testte üretilir) şebekeli içerikle yüklenir; ileri koşuda para korunumu her gün tam", () => {
        const eski = p4Oncesi(g6MulkVeri());
        const s0 = g6Dunya({ veri: eski, bekleMs: 12 * 3_600_000, kur: (y) => y.yerlestir("gida_fabrikasi") });
        expect(s0.dunya.mulk!.para).toBeDefined();
        const metin2 = anlikGoruntuOlustur(s0, kuralSurumuHesapla(eski));
        const guncel = g6MulkVeri(); // yeni yöntemler + şebeke + kilma (kapalı)
        const r = Simulasyon.anlikGoruntudenYukleSonuclu(guncel, metin2, [], { gocIzni: true, yalnizEkleZorunlu: true });
        expect(r.goc.ihlaller).toEqual([]);
        expect(r.goc.eklenen.yontemler).toEqual([...G6_YONTEMLER]);
        g6KorunumTutar(r.sim, "yukleme");
        for (let g = 1; g <= 2; g++) {
          r.sim.calistirKadar(s0.dunya.zaman + g * GUN);
          g6KorunumTutar(r.sim, `gun ${g}`);
        }
        // şebeke artık devrede: santralsiz gida_fabrikasi verim kazanır, defter şebeke kalemlerini yazar
        expect(r.sim.dunya.mulk!.para!.lavabo).toHaveProperty("sebeke");
      }, 120_000);
    }
  });
}
