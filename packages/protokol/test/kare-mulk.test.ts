/**
 * F4 kare eklemeleri (mülk kipi, hepsi isteğe bağlı alan): hücrede tesis/ek yapı türü (herkese) ve değer (yalnız sahibine),
 * inşaat demetinde başlangıç + ek yapı kimliği, ilçede değişmez ayrılmış hücre kümesi (deltada tekrarlanmaz), oyuncuya
 * özel erken oyun formülü / indirimli yapı hakkı / ayrılmış bitişi. Şema doğrulaması ve `deltaUygula(a, kareFarki(a, b)) ≡ b`.
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, SISTEM_OYUNCUSU, Simulasyon, sureCarpaniPpm } from "@bolge/cekirdek";
import type { Baglam, CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaUygula, erkenOyunCarpani, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";
import type { IlgiKaresi } from "../src/index";

const ILCE = "sn_m_ova_merkez";

function kurulum(): { sim: Simulasyon; h1: string; h2: string } {
  const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
  const yo = v.param.mulk?.yeniOyuncu;
  if (yo) {
    yo.hibe = 500_000_000;
    yo.yurtHucre = 0;
  }
  const sim = Simulasyon.olustur(v, 3);
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] } });
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [] } });
  const uygun = (v.parsel?.ilceler.find((c) => c.id === ILCE)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id);
  const [h1, h2] = [uygun[0] as string, uygun[1] as string];
  expect(sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" } }).tamam).toBe(true);
  return { sim, h1, h2 };
}

function kare(sim: Simulasyon, oyuncu: string | null, liste = true): IlgiKaresi {
  return ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], oyuncu), oyuncu, ilceIlgisiKur(sim, [ILCE], oyuncu), { ayrilmisListesi: liste });
}

describe("mulk kare eklemeleri", () => {
  it("hucre degeri yalniz sahibine; ayrilmis kume herkese, sirali ve cekirdek kumesiyle ayni; semadan gecer", () => {
    const { sim, h1 } = kurulum();
    const ali = kare(sim, "ali");
    const izleyici = kare(sim, null);
    const veli = kare(sim, "veli");
    const hucreAli = ali.ilceler?.[0]?.hucreler.find((h) => h[0] === h1);
    expect(hucreAli?.[6]).toBeGreaterThan(0);
    expect(hucreAli?.[5]).toBe(""); // üzerinde yapı yok
    expect(izleyici.ilceler?.[0]?.hucreler.find((h) => h[0] === h1)).toHaveLength(5);
    expect(veli.ilceler?.[0]?.hucreler.find((h) => h[0] === h1)).toHaveLength(5);
    // Ayrılmış hücreler: türetilmiş küme (çekirdek derlemesi) ile aynı.
    const mk = sim.ic.mulk;
    const beklenen = (mk?.fikstur.ilceler.find((c) => c.id === ILCE)?.hucreler ?? []).filter((h) => mk?.ayrilmis.has(h.id)).map((h) => h.id).sort();
    expect(beklenen.length).toBeGreaterThan(0);
    for (const k of [ali, izleyici, veli]) {
      expect(k.ilceler?.[0]?.ayrilmis).toEqual(beklenen);
      expect(k.ilceler?.[0]?.ayrilmisAdet).toBe(beklenen.length);
    }
    // Liste istenmezse yalnız sayı gelir (büyük ilçelerde kare boyutu).
    const listesiz = kare(sim, null, false).ilceler?.[0];
    expect(listesiz?.ayrilmis).toBeUndefined();
    expect(listesiz?.ayrilmisAdet).toBe(beklenen.length);
    for (const k of [ali, izleyici]) expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
    // Oyuncuya özel alanlar yalnız kendi karesinde.
    expect(izleyici.oyuncu).toBeUndefined();
    expect(ali.oyuncu?.mulk?.indirimliYapiKalan).toBe(sim.ic.mulk?.p.yeniOyuncu.indirimliYapiSayisi);
    expect(ali.oyuncu?.mulk?.ayrilmisBitis).toBe(sim.dunya.oyuncular.find((o) => o.id === "ali")!.katilmaZamani + (mk?.ayrilmisSureMs ?? 0));
    expect(JSON.stringify(izleyici)).not.toMatch(/erkenOyun|indirimliYapiKalan|ayrilmisBitis/);
  });

  it("tesis / ek yapi turu herkese gorunur; insaat demetinde baslangic ve ek yapi kimligi; delta cevrimi", () => {
    const { sim, h1, h2 } = kurulum();
    const once = kare(sim, "ali");
    const onceIzleyici = kare(sim, null);
    // Ek yapı ve süren ek yapı inşaatı (çekirdek durumuna doğrudan yazılır: kare çıkarma saf okur).
    const d = sim.dunya;
    const isletme = d.bolgeler.find((b) => b.sahip === "ali");
    expect(isletme?.merkez).toBeDefined();
    (isletme as NonNullable<typeof isletme>).ekYapilar = [{ id: 900_001, tur: "ambar", hucreler: [h1] }];
    const c1 = d.mulk?.hucreler.find((h) => h.id === h1) as NonNullable<typeof d.mulk>["hucreler"][number];
    c1.tesis = 900_001;
    const c2 = d.mulk?.hucreler.find((h) => h.id === h2) as NonNullable<typeof d.mulk>["hucreler"][number];
    c2.insaat = 900_002;
    d.insaatlar.push({ id: 900_002, tur: "tesis", sahip: "ali", bolge: isletme!.indeks, hedef: -1, bitis: 5 * SAAT, hucreler: [h2], baslangic: 2 * SAAT, ekYapi: "ticaret_ofisi" });
    const sonra = kare(sim, "ali");
    const sonraIzleyici = kare(sim, null);
    const tur = (k: IlgiKaresi, h: string) => k.ilceler?.[0]?.hucreler.find((x) => x[0] === h)?.[5];
    for (const k of [sonra, sonraIzleyici]) {
      expect(tur(k, h1)).toBe("ambar");
      expect(tur(k, h2)).toBe("ticaret_ofisi"); // tesis yoksa süren inşaatın türü
    }
    expect(sonra.oyuncu?.insaatlar.at(-1)).toEqual([900_002, "tesis", isletme!.indeks, -1, 5 * SAAT, 2 * SAAT, "ticaret_ofisi"]);
    expect(IlgiKaresiSemasi.parse(sonra)).toEqual(sonra);
    // Delta: ayrılmış küme değişmez, ilçe zaten istemcideyken tekrarlanmaz; uygulayınca yeni kareyi verir.
    for (const [a, b] of [[once, sonra], [onceIzleyici, sonraIzleyici]] as const) {
      const delta = kareFarki(a, b);
      expect(delta.ilceler?.[0]?.ayrilmis).toBeUndefined();
      expect(KareDeltasiSemasi.parse(delta)).toEqual(delta);
      expect(deltaUygula(a, delta)).toEqual(b);
    }
    // İlçe karede yokken delta ilçeyi küme ile birlikte taşır.
    const bos: IlgiKaresi = { ...onceIzleyici, ilceler: [] };
    const taze = kareFarki(bos, sonraIzleyici);
    expect(taze.ilceler?.[0]?.ayrilmis?.length).toBeGreaterThan(0);
    expect(deltaUygula(bos, taze)).toEqual(sonraIzleyici);
  });

  it("yalnizca sahip degisince: delta ayrilmis tasimaz ve ilceAyni referans onbellegiyle ucuz", () => {
    const { sim } = kurulum();
    const a = kare(sim, null);
    sim.uygula({ t: 2 * SAAT, oyuncu: "veli", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [sim.ic.mulk!.fikstur.ilceler.find((c) => c.id === ILCE)!.hucreler.filter((h) => h.uygun && h.sinif === "kirsal")[5]!.id], sinif: "kirsal" } });
    const b = kare(sim, null);
    expect(a.ilceler?.[0]?.ayrilmis).toBe(b.ilceler?.[0]?.ayrilmis); // aynı önbellek dizisi
    const delta = kareFarki(a, b);
    expect(delta.ilceler).toHaveLength(1);
    expect(delta.ilceler?.[0]?.ayrilmis).toBeUndefined();
    expect(delta.ilceler?.[0]?.satilmisHucre).toBe(3);
    expect(deltaUygula(a, delta)).toEqual(b);
  });
});

describe("erkenOyunCarpani", () => {
  it("cekirdegin sureCarpaniPpm'iyle her t'de ayni (sabit, dogrusal, bitis sonrasi)", () => {
    const { sim } = kurulum();
    const k = kare(sim, "ali");
    const f = k.oyuncu?.erkenOyun;
    expect(f).toBeDefined();
    const e = sim.ic.param.erkenOyun;
    const ctx = { ic: sim.ic } as unknown as Baglam;
    const noktalar = [0, 1, e.sabitSaat * SAAT, e.sabitSaat * SAAT + 1, ((e.sabitSaat + e.bitisSaat) / 2) * SAAT, e.bitisSaat * SAAT - 1, e.bitisSaat * SAAT, e.bitisSaat * SAAT + 5 * GUN];
    for (const dt of noktalar) {
      const t = Math.floor(sim.dunya.oyuncular.find((o) => o.id === "ali")!.katilmaZamani + dt);
      sim.calistirKadar(Math.max(t, sim.dunya.zaman));
      expect(erkenOyunCarpani(f!, sim.dunya.zaman)).toBe(sureCarpaniPpm(sim.dunya, ctx, "ali"));
    }
    // Formül sabittir: zaman ilerleyince oyuncu karesi bu yüzden kirlenmez.
    expect(kare(sim, "ali").oyuncu?.erkenOyun).toEqual(f);
  });
});
