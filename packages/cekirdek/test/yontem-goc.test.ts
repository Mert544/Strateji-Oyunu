/**
 * G6 göç provası (sartname §11): içeriğin yöntem listesinin SONUNA yeni yöntemler eklenir (gocIzni + yalnizEkleZorunlu); eski mülk görüntüsü yüklenir, mevcut her şey
 * kimlikle aynı kalır, yeni yöntem seçilebilir. Test-yerel sentetik yöntemlerle (gerçek içerik G6-3'te).
 */
import { parselFiksturuYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { icerikKimlikTablosuOlustur } from "../src/goc";
import { Simulasyon } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { anlikGoruntuOlustur, kuralSurumuHesapla } from "../src/serilestir";
import { SAAT } from "../src/tipler";
import { kimlikliGorunum } from "./goc-yardimci";
import { bitisikGrup, mulkSim, tamam } from "./mulk-yardimci";
import { BAYRAKSIZ_T, DEGIRMEN_T, KILITLI_T, yontemliMulkVeri } from "./yontem-yardimci";

const F = parselFiksturuYukle("mini-6");
const ILCE = "sn_m_ova_merkez";
const eski = () => yontemliMulkVeri((v) => {
  // "eski" içerik: sentetik yöntemler HENÜZ yok
  v.icerik.yontemler = v.icerik.yontemler.filter((y) => ![DEGIRMEN_T, BAYRAKSIZ_T, KILITLI_T].includes(y.id));
  const gida = v.icerik.tesisTurleri.find((t) => t.id === "gida_fabrikasi")!;
  gida.yontemler = gida.yontemler.filter((y) => ![DEGIRMEN_T, BAYRAKSIZ_T, KILITLI_T].includes(y));
});

describe("yöntem sona ekleme göçü (mülk kipi)", () => {
  it("eski görüntü yeni yöntemli içerikle yüklenir: gocIzni gerekir, yalnız-ekle, eklenen yöntemler listelenir, mevcut her şey kimlikle aynı, yeni yöntem seçilebilir", () => {
    const s = mulkSim(["a", "b"], eski());
    tamam(s, "a", { tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: bitisikGrup(F, ILCE, "kirsal", 2, 0), sinif: "kirsal" });
    s.calistirKadar(s.dunya.zaman + 24 * SAAT);
    const metin = anlikGoruntuOlustur(s, kuralSurumuHesapla(eski()));
    const eskiTablo = icerikKimlikTablosuOlustur(s.ic);
    const yeni = yontemliMulkVeri();
    expect(kuralSurumuHesapla(yeni)).not.toBe(kuralSurumuHesapla(eski()));

    // gocIzni olmadan açık hata (varsayılan korunur)
    expect(() => Simulasyon.anlikGoruntudenYukle(yeni, metin)).toThrow(/kural surumu uyusmuyor/);

    const r = Simulasyon.anlikGoruntudenYukleSonuclu(yeni, metin, [], { gocIzni: true });
    expect(r.goc.yalnizEkle).toBe(true);
    expect(r.goc.ihlaller).toEqual([]);
    expect(r.goc.eklenen.yontemler).toEqual([DEGIRMEN_T, BAYRAKSIZ_T, KILITLI_T]);
    expect(r.goc.eskiDurumOzeti).toBe(s.durumOzeti());
    expect(kanonikSerilestir(kimlikliGorunum(r.sim.dunya, r.sim.ic, eskiTablo))).toBe(kanonikSerilestir(kimlikliGorunum(s.dunya, s.ic, eskiTablo)));
    // mevcut yöntem indeksleri değişmedi (sona ekleme): eski tesis aynı yöntemde
    const t0 = s.dunya.bolgeler.flatMap((b) => b.tesisler).find((t) => t.tur === s.ic.tesisTuruIndeks["gida_fabrikasi"])!;
    const t1 = r.sim.dunya.bolgeler.flatMap((b) => b.tesisler).find((t) => t.tur === r.sim.ic.tesisTuruIndeks["gida_fabrikasi"])!;
    expect(r.sim.ic.yontemler[t1.yontem]!.id).toBe(s.ic.yontemler[t0.yontem]!.id);
    expect(r.sim.ic.yontemIndeks[DEGIRMEN_T]).toBe(s.ic.yontemler.length); // yeni yöntemler dizinin sonunda

    // yüklenen dünyada yeni yöntem gerçekten seçilebilir ve tesis o yöntemle başlar
    r.sim.calistirKadar(r.sim.dunya.zaman + 1);
    tamam(r.sim, "b", { tur: "yapi_yerlestir", ilce: ILCE, tesisTuru: "gida_fabrikasi", hucreler: bitisikGrup(F, ILCE, "kirsal", 2, 3), sinif: "kirsal", yontem: DEGIRMEN_T });
    r.sim.calistirKadar(r.sim.dunya.zaman + 24 * SAAT);
    const tb = r.sim.dunya.bolgeler.filter((b) => b.sahip === "b" && b.merkez !== undefined).flatMap((b) => b.tesisler);
    expect(tb.map((t) => r.sim.ic.yontemler[t.yontem]!.id)).toContain(DEGIRMEN_T);

    // yaz -> yükle kararlı (yeniden indeksleme yok)
    const geri = Simulasyon.anlikGoruntudenYukleSonuclu(yeni, anlikGoruntuOlustur(r.sim, kuralSurumuHesapla(yeni)));
    expect(geri.goc.yenidenIndekslendi).toBe(false);
    expect(geri.sim.durumOzeti()).toBe(r.sim.durumOzeti());
  });
});
