/**
 * G8-2 göç provası (sartname §11.3, §17.3 `serilestir-goc` `eklenen.yontemler = 2`): G6 içeriğiyle (4 yöntem) yazılmış mülk görüntüsü G8 içeriğiyle (6 yöntem: `cam_firini`, `celik_dograma` sona
 * eklenmiş) `gocIzni + yalnizEkleZorunlu` ile yüklenir; yalnız-ekle, ihlal 0, eklenen yöntemler tam iki kimlik, dünya (kuyruk hariç) kimlikli görünümle aynı, `eskiDurumOzeti` yazıldığı gibi, mevcut her şey
 * kimlikle aynı kalır ve yeni yöntemler seçilebilir (santralsiz cam → pencere zinciri yüklenen dünyada çalışır).
 */
import { describe, expect, it } from "vitest";
import { icerikKimlikTablosuOlustur } from "../src/goc";
import { Simulasyon } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { anlikGoruntuOlustur, kuralSurumuHesapla } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import { kimlikliGorunum } from "./goc-yardimci";
import { G6Yerlestirici, g6Dugum, g6MulkVeri, g6Tesis } from "./g6-yardimci";
import { G8_YONTEMLER, g6Icerigi, g8Veri } from "./g8-yardimci";
import { mulkSim } from "./mulk-yardimci";

const g6 = () => g6Icerigi(g6MulkVeri({}, (v) => Object.assign(v.param.mulk!.yeniOyuncu.baslangicStok, { silis: 10_000_000 })));
const g8 = () => g8Veri(g6());

describe("G6 görüntüsü -> G8 içeriği (yöntem sona ekleme göçü)", () => {
  it("gocIzni gerekir; yalnız-ekle; eklenen.yontemler = [cam_firini, celik_dograma]; özet ve kimlikli görünüm aynı; yeni yöntemler dizinin sonunda", () => {
    const s = mulkSim(["a", "b"], g6());
    new G6Yerlestirici(s, "a").yerlestir("gida_fabrikasi", "degirmen");
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(g6()));
    const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
    expect(kuralSurumuHesapla(g8())).not.toBe(kuralSurumuHesapla(g6()));
    expect(() => Simulasyon.anlikGoruntudenYukle(g8(), metin)).toThrow(/kural surumu uyusmuyor/);

    const r = Simulasyon.anlikGoruntudenYukleSonuclu(g8(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true });
    expect(r.goc.yalnizEkle).toBe(true);
    expect(r.goc.ihlaller).toEqual([]);
    expect(r.goc.eklenen.yontemler).toEqual([...G8_YONTEMLER]);
    expect(r.goc.eklenen.yontemler).toHaveLength(2);
    // Yöntem uzayı durumda indeksli dizi değildir: dünya (kuyruk hariç) kimlikli görünümle AYNI (aşağıda); göç yalnız bir çözüm olayı kirletir (kuyruk farkı), `eskiDurumOzeti` yazıldığı gibi.
    expect(r.goc.eskiDurumOzeti).toBe(s.durumOzeti());
    expect(kanonikSerilestir(kimlikliGorunum(r.sim.dunya, r.sim.ic, eskiTablo))).toBe(kanonikSerilestir(kimlikliGorunum(s.dunya, s.ic, eskiTablo)));
    expect(r.sim.ic.yontemIndeks["cam_firini"]).toBe(s.ic.yontemler.length);
    expect(r.sim.ic.yontemIndeks["celik_dograma"]).toBe(s.ic.yontemler.length + 1);
    // mevcut tesis aynı yöntemde
    expect(r.sim.ic.yontemler[g6Tesis(r.sim, "a", "degirmen").yontem]!.id).toBe("degirmen");
  });

  it("yüklenen dünyada G8 yöntemleri seçilebilir: santralsiz cam fırını + çelik doğrama pencere üretir; yaz -> yükle kararlı", () => {
    const s = mulkSim(["a", "b"], g6());
    new G6Yerlestirici(s, "a").yerlestir("gida_fabrikasi", "degirmen");
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(g8(), anlikGoruntuOlustur(s, kuralSurumuHesapla(g6())), [], { gocIzni: true, yalnizEkleZorunlu: true });
    r.sim.calistirKadar(r.sim.dunya.zaman + 1);
    const yb = new G6Yerlestirici(r.sim, "b");
    yb.yerlestir("parca_fabrikasi", "cam_firini");
    yb.yerlestir("parca_fabrikasi", "celik_dograma");
    r.sim.calistirKadar(r.sim.dunya.zaman + 3 * GUN);
    const b = g6Dugum(r.sim, "b");
    expect(b.tesisler.some((t) => r.sim.ic.tesisTurleri[t.tur]!.id === "santral")).toBe(false);
    expect(b.uretimToplam[r.sim.ic.malIndeks["pencere"]!]).toBeGreaterThan(0);
    const geri = Simulasyon.anlikGoruntudenYukleSonuclu(g8(), anlikGoruntuOlustur(r.sim, kuralSurumuHesapla(g8())));
    expect(geri.goc.yenidenIndekslendi).toBe(false);
    expect(geri.sim.durumOzeti()).toBe(r.sim.durumOzeti());
  });

  it("negatif kontrol: G8 görüntüsü G6 içeriğiyle yüklenemez (yöntem kaldırmak yasak: yalnız-ekle)", () => {
    const s = mulkSim(["a"], g8());
    const yb = new G6Yerlestirici(s, "a");
    yb.yerlestir("parca_fabrikasi", "cam_firini");
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(g8()));
    expect(() => Simulasyon.anlikGoruntudenYukleSonuclu(g6(), metin, [], { gocIzni: true, yalnizEkleZorunlu: true })).toThrow();
  });
});
