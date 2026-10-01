/**
 * Esnaf Defteri dedektörü ve G6 yöntemleri (çok çıktılı değirmen, fırın): `kavramSaglandi` aktif YÖNTEMİ (tesisin o anki yöntemi) ve kümülatif ÜRETİMİ okur.
 * Gerçek G6-3 yöntemleriyle (`degirmen`, `ekmek_firini`; `yontem-yardimci.ts`); dedektör yalnız `@bolge/cekirdek`'e bağlıdır, burada çekirdek durumu doğrudan kurulur (sunucu/ws yok).
 * Kanıtlar: kurulu ama girdisiz yapı tetiklemez; çok çıktılı yöntemde yan ürün ara üretim sayılır ama TEK BAŞINA zincir kapatmaz; değirmen -> fırın zinciri
 * ve yöntem değişimi sonrası kavramlar; dedektör durumu DEĞİŞTİRMEZ (saf okuma).
 */
import { describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut, KomutSonucu } from "@bolge/cekirdek";
import { ODUL_IZGARA_KAVRAMLARI, kavramSaglandi } from "../src/odul/dedektor";
import { mulkVerisi } from "./yardimci";
import { DEGIRMEN, FIRIN, bitisikCiftler, bolMulk } from "./yontem-yardimci";

const ILCE = "sn_m_ova_merkez";
const GUN = 24 * SAAT;

/** Mülk kipi dünyası (gerçek G6-3 içeriği): başlangıç tahıl stoğu `tahilStok` (mili-birim) ile kontrol edilir. */
function kur(tahilStok: number): Simulasyon {
  const v: CekirdekVeriPaketi = bolMulk(mulkVerisi(), (x) => {
    const m = x.param.mulk;
    if (m) m.yeniOyuncu.baslangicStok = { ...m.yeniOyuncu.baslangicStok, tahil: tahilStok, un: 0 };
  });
  const sim = Simulasyon.olustur(v, 11);
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut });
  return sim;
}

const ciftler = (sim: Simulasyon, adet: number): string[][] => bitisikCiftler(sim, ILCE, adet);

function tamam(sim: Simulasyon, komut: Komut, oyuncu = "ali"): KomutSonucu {
  const r = sim.uygula({ t: sim.dunya.zaman, oyuncu, komut });
  expect(r.tamam, JSON.stringify(komut) + " -> " + JSON.stringify(r)).toBe(true);
  return r;
}

function insa(sim: Simulasyon, hucreler: string[], tesisTuru: string, yontem?: string): void {
  tamam(sim, { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" });
  tamam(sim, { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru, hucreler, ...(yontem === undefined ? {} : { yontem }) } as Komut);
}

function ilerlet(sim: Simulasyon, gun: number): void {
  sim.calistirKadar(sim.dunya.zaman + gun * GUN);
}

/** Dedektörün sağladığı kavramlar (sıralı, ali için). */
function saglanan(sim: Simulasyon): string[] {
  const o = sim.dunya.oyuncular.find((x) => x.id === "ali");
  if (!o) throw new Error("ali yok");
  return ODUL_IZGARA_KAVRAMLARI.filter((k) => kavramSaglandi(sim.ic, sim.dunya, o, k, sim.dunya.zaman)).slice().sort();
}

/** Oyuncunun düğümündeki tesisler ve yöntem kimlikleri. */
function tesisler(sim: Simulasyon): Array<{ id: number; tur: string; yontem: string; aktif: boolean }> {
  return sim.dunya.bolgeler
    .filter((b) => b.sahip === "ali" && b.merkez !== undefined)
    .flatMap((b) => b.tesisler.map((t) => ({ id: t.id, tur: sim.ic.tesisTurleri[t.tur]?.id ?? "?", yontem: sim.ic.yontemler[t.yontem]?.id ?? "?", aktif: t.aktif })));
}

function uretim(sim: Simulasyon, mal: string): number {
  const mi = sim.ic.malIndeks[mal] as number;
  return sim.dunya.bolgeler.filter((b) => b.sahip === "ali" && b.merkez !== undefined).reduce((n, b) => n + (b.uretimToplam[mi] ?? 0), 0);
}

describe("dedektor ve G6 yontemleri (mulk kipi, gercek G6-3 icerigi)", () => {
  it("kurulu ama girdisiz degirmen ilk_isleme/zincir_kapandi TETIKLEMEZ (yalniz ilk_yapi); girdi gelince un ve kepek uretilir, ilk_isleme tetiklenir, TEK BASINA zincir kapatmaz", () => {
    const sim = kur(0); // tahil stogu yok
    const [g] = ciftler(sim, 1) as [string[]];
    sim.calistirKadar(SAAT);
    insa(sim, g, "gida_fabrikasi", DEGIRMEN);
    ilerlet(sim, 3);
    expect(tesisler(sim)).toEqual([{ id: expect.any(Number), tur: "gida_fabrikasi", yontem: DEGIRMEN, aktif: true }]);
    expect(uretim(sim, "un")).toBe(0);
    expect(saglanan(sim)).toEqual(["ilk_yapi"]);
    // Girdi: ayni isletmede bir ciftlik (tahil) kurulur; degirmen onunla calisir.
    const [g2] = ciftler(sim, 2).slice(1) as [string[]];
    insa(sim, g2, "ciftlik");
    ilerlet(sim, 6);
    expect(uretim(sim, "tahil")).toBeGreaterThan(0);
    expect(uretim(sim, "un")).toBeGreaterThan(0);
    expect(uretim(sim, "kepek")).toBeGreaterThan(0);
    expect(saglanan(sim)).toEqual(["ilk_isleme", "ilk_yapi", "zincir_kapandi"]); // ciftlik(tahil) -> degirmen(un, kepek): zincir; un/kepek tuketicisi henuz yok
  });

  it("tek basina degirmen (tahil stoklu): un ve kepek uretilir, ilk_isleme tetiklenir; ciktisini TUKETEN baska yapi yoksa zincir_kapandi YOK (yan urun zincir sayilmaz)", () => {
    const sim = kur(50_000_000);
    const [g] = ciftler(sim, 1) as [string[]];
    sim.calistirKadar(SAAT);
    insa(sim, g, "gida_fabrikasi", DEGIRMEN);
    ilerlet(sim, 3);
    expect(uretim(sim, "un")).toBeGreaterThan(0);
    expect(uretim(sim, "kepek")).toBeGreaterThan(0);
    expect(uretim(sim, "ekmek")).toBe(0);
    expect(saglanan(sim)).toEqual(["ilk_isleme", "ilk_yapi"]);
  });

  it("degirmen -> firin zinciri: firin un ile calisinca zincir_kapandi; ilk_isleme ikisinden de dogar", () => {
    const sim = kur(50_000_000);
    const [g1, g2] = ciftler(sim, 2) as [string[], string[]];
    sim.calistirKadar(SAAT);
    insa(sim, g1, "gida_fabrikasi", DEGIRMEN);
    insa(sim, g2, "gida_fabrikasi", FIRIN);
    ilerlet(sim, 4);
    expect(tesisler(sim).map((t) => t.yontem).sort()).toEqual([DEGIRMEN, FIRIN].sort());
    expect(uretim(sim, "un")).toBeGreaterThan(0);
    expect(uretim(sim, "ekmek")).toBeGreaterThan(0); // firin degirmenin unuyla (ayni dugum stogu) calisti
    expect(saglanan(sim)).toEqual(["ilk_ekmek", "ilk_isleme", "ilk_yapi", "zincir_kapandi"]); // firin ekmek uretti: ilk_ekmek (P4/P5) de saglanir
  });

  it("yontem degistirme: dedektor tesisin O ANKI yontemini okur; ciftlik(tahil) -> gida fabrikasi zinciri yontem degisince kapanir/acilir (standart: tahil girdisi var; firin: un ister; degirmen: tahil)", () => {
    const sim = kur(0);
    const [g1, g2] = ciftler(sim, 2) as [string[], string[]];
    sim.calistirKadar(SAAT);
    insa(sim, g1, "ciftlik");
    insa(sim, g2, "gida_fabrikasi"); // varsayilan yontem: standart_gida_isleme (girdi tahil)
    ilerlet(sim, 6);
    expect(tesisler(sim).map((t) => t.yontem).sort()).toEqual(["geleneksel_tarim", "standart_gida_isleme"]);
    expect(uretim(sim, "tahil")).toBeGreaterThan(0);
    expect(saglanan(sim)).toContain("zincir_kapandi"); // tahil -> standart_gida_isleme
    const dugum = sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.merkez !== undefined) as NonNullable<ReturnType<Simulasyon["dunya"]["bolgeler"]["find"]>>;
    const fabrika = (tesisler(sim).find((t) => t.tur === "gida_fabrikasi") as { id: number }).id;
    // Firin un ister: un uretilmedigi surece ciftligin tahili hicbir aktif yapinin girdisi degildir -> zincir YOK.
    tamam(sim, { tur: "yontem_degistir", bolge: dugum.id, tesis: fabrika, yontem: FIRIN });
    expect(tesisler(sim).find((t) => t.tur === "gida_fabrikasi")?.yontem).toBe(FIRIN);
    expect(uretim(sim, "un")).toBe(0);
    expect(saglanan(sim)).not.toContain("zincir_kapandi");
    // Degirmen tahil ister: zincir yeniden kurulur (ayni dedektor, yalniz aktif yontem degisti).
    tamam(sim, { tur: "yontem_degistir", bolge: dugum.id, tesis: fabrika, yontem: DEGIRMEN });
    expect(saglanan(sim)).toContain("zincir_kapandi");
    ilerlet(sim, 2);
    expect(uretim(sim, "un")).toBeGreaterThan(0);
    expect(saglanan(sim)).toContain("zincir_kapandi");
  });

  it("dedektor SAF okumadir: cagri durumOzeti'ni degistirmez, ayni durumda ayni sonuc", () => {
    const sim = kur(50_000_000);
    const [g1, g2] = ciftler(sim, 2) as [string[], string[]];
    sim.calistirKadar(SAAT);
    insa(sim, g1, "gida_fabrikasi", DEGIRMEN);
    insa(sim, g2, "gida_fabrikasi", FIRIN);
    ilerlet(sim, 3);
    const once = sim.durumOzeti();
    const a = saglanan(sim);
    const b = saglanan(sim);
    expect(a).toEqual(b);
    expect(sim.durumOzeti()).toBe(once);
  });
});
