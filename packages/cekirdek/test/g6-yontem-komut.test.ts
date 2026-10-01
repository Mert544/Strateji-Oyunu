/**
 * G6-4 / `yontem?` inşa komutu alanı (şartname §5.8, §16.1 `yontem-komut`): `tesis_insa_hucre` ve `yapi_yerlestir` isteğe bağlı `yontem` (kimlik) alır;
 * tesis tamamlanınca o yöntemle başlar. Denetimler `yontem_degistir` ile aynı iletilerle; reddedilen komut durumu DEĞİŞTİRMEZ; alan olmadan eski
 * komut aynı sonucu verir (geriye uyum).
 */
import { describe, expect, it } from "vitest";
import { GUN } from "../src/tipler";
import type { Komut } from "../src/tipler";
import { g6Dugum, g6Dunya, g6MulkVeri, g6Tesis, G6Yerlestirici, p4Oncesi } from "./g6-yardimci";
import { mulkSim, ver } from "./mulk-yardimci";

/** `yapi_yerlestir` komutu (yontem alanı K3 tiplerine G6-1'de girer: bu yüzden komut gevşek kurulur). */
function yerlestirKomutu(y: G6Yerlestirici, tur: string, hucreler: string[], sinif: string, yontem?: unknown): Komut {
  return { tur: "yapi_yerlestir", ilce: y.ilce, tesisTuru: tur, hucreler, sinif, ...(yontem === undefined ? {} : { yontem }) } as unknown as Komut;
}

describe("yontem alanı: tesis o yöntemle başlar", () => {
  it("`yapi_yerlestir` + yontem: inşaat sürerken InsaatDurumu.yontem (dize kimlik); bitince tesis o yöntemle", () => {
    const s = mulkSim(["a"], g6MulkVeri(), 7);
    const y = new G6Yerlestirici(s, "a");
    y.yerlestir("gida_fabrikasi", "ekmek_firini");
    const ins = s.dunya.insaatlar.find((i) => i.sahip === "a")!;
    expect((ins as { yontem?: string }).yontem).toBe("ekmek_firini");
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    expect(s.dunya.insaatlar).toHaveLength(0);
    expect(s.ic.yontemler[g6Tesis(s, "a", "ekmek_firini").yontem]!.id).toBe("ekmek_firini");
  });

  it("yontem verilmezse varsayılan `tur.yontemler[0]` (standart_gida_isleme); InsaatDurumu.yontem yazılmaz", () => {
    const s = mulkSim(["a"], g6MulkVeri(), 7);
    new G6Yerlestirici(s, "a").yerlestir("gida_fabrikasi");
    const ins = s.dunya.insaatlar.find((i) => i.sahip === "a")!;
    expect("yontem" in ins).toBe(false);
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    expect(g6Dugum(s, "a").tesisler.map((t) => s.ic.yontemler[t.yontem]!.id)).toEqual(["standart_gida_isleme"]);
  });

  it("`tesis_insa_hucre` + yontem: aynı sonuç (kendi hücreleri)", () => {
    const s = mulkSim(["a"], g6MulkVeri(), 7);
    const d = s.dunya;
    const sahip = d.mulk!.hucreler.filter((h) => h.sahip === "a");
    const ilce = sahip[0]!.ilce;
    const [x, yy] = sahip[0]!.id.split(":").map(Number) as [number, number];
    const ids = new Set(sahip.map((h) => h.id));
    const komsu = [`${x + 1}:${yy}`, `${x}:${yy + 1}`, `${x - 1}:${yy}`, `${x}:${yy - 1}`].find((k) => ids.has(k))!;
    const r = ver(s, "a", { tur: "tesis_insa_hucre", ilce, tesisTuru: "gida_fabrikasi", hucreler: [sahip[0]!.id, komsu], yontem: "degirmen" } as unknown as Komut);
    expect(r).toEqual({ tamam: true });
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    expect(s.ic.yontemler[g6Tesis(s, "a", "degirmen").yontem]!.id).toBe("degirmen");
  });
});

describe("denetimler (yontem_degistir ile aynı iletiler) ve başarısız komut durumu değiştirmez", () => {
  function reddet(veri: ReturnType<typeof g6MulkVeri>, yontem: unknown, tur: string, beklenen: RegExp): void {
    const s = mulkSim(["a"], veri, 7);
    const y = new G6Yerlestirici(s, "a");
    const sahip = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a");
    const once = s.durumOzeti();
    // yurt hücrelerinden 2 bitişik hücre: `yapi_yerlestir` hücreleri sahipli de olsa denetimler komut başında çalışır
    const [x, yy] = sahip[0]!.id.split(":").map(Number) as [number, number];
    const hs = [sahip[0]!.id, `${x + 1}:${yy}`];
    const r = ver(s, "a", yerlestirKomutu(y, tur, hs, "kirsal", yontem));
    expect(r.tamam).toBe(false);
    if (!r.tamam) expect(r.hata).toMatch(beklenen);
    expect(s.durumOzeti()).toBe(once);
  }

  it("bilinmeyen yöntem", () => reddet(g6MulkVeri(), "yok_yontem", "gida_fabrikasi", /bilinmeyen yontem: yok_yontem/));
  it("türde olmayan yöntem (kepek_gubresi ahır yöntemi, gida_fabrikasi değil)", () => reddet(g6MulkVeri(), "kepek_gubresi", "gida_fabrikasi", /yontem bu tesis turunde yok: kepek_gubresi/));
  it("yöntem açık değil (teknoloji şartı): sentetik veride `degirmen` teknoloji ister", () => {
    const veri = g6MulkVeri({}, (v) => {
      v.icerik.yontemler.find((y) => y.id === "degirmen")!.gerekliTeknoloji = v.icerik.teknolojiler[0]!.id;
    });
    reddet(veri, "degirmen", "gida_fabrikasi", /yontem acik degil: degirmen/);
  });
  it("ek yapıda yontem verilemez", () => reddet(g6MulkVeri(), "degirmen", "ambar", /yontem yalniz tesis turunde verilebilir: ambar/));
  it("yontem dize değil (sayı)", () => reddet(g6MulkVeri(), 5, "gida_fabrikasi", /yontem/));
});

describe("`yontem_degistir` mülk kipinde yeni yönteme geçer (bedelsiz, anlık) ve geriye uyum", () => {
  it("standart_gida_isleme → degirmen → ekmek_firini: tesis yöntemi değişir", () => {
    const s = g6Dunya({ kur: (y) => y.yerlestir("gida_fabrikasi") });
    const t = g6Tesis(s, "a", "standart_gida_isleme");
    for (const yontem of ["degirmen", "ekmek_firini"]) {
      const r = ver(s, "a", { tur: "yontem_degistir", bolge: g6Dugum(s, "a").id, tesis: t.id, yontem });
      expect(r).toEqual({ tamam: true });
      expect(s.ic.yontemler[t.yontem]!.id).toBe(yontem);
    }
  });

  it("GERİYE UYUM: `yontem` alanı OLMADAN eski komut, yeni yöntemler veride dururken (şebekesiz, kapalı kilma) P4 öncesi içerikle aynı `durumOzeti`", () => {
    const ham = g6MulkVeri({ sebeke: false, kilma: false });
    const kos = (veri: typeof ham) => g6Dunya({ veri, kur: (y) => y.yerlestir("gida_fabrikasi") });
    expect(kos(ham).durumOzeti()).toBe(kos(p4Oncesi(ham)).durumOzeti());
  });
});
