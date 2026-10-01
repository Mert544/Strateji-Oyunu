/**
 * F4 kare eklemeleri (mülk kipi, hepsi isteğe bağlı alan): hücrede tesis/ek yapı türü (herkese) ve değer (yalnız sahibine),
 * inşaat demetinde başlangıç + ek yapı kimliği, ilçede değişmez ayrılmış hücre kümesi (deltada tekrarlanmaz), oyuncuya
 * özel erken oyun formülü / indirimli yapı hakkı / ayrılmış bitişi. Şema doğrulaması ve `deltaUygula(a, kareFarki(a, b)) ≡ b`.
 */
import { describe, expect, it } from "vitest";
import { GUN, SAAT, SISTEM_OYUNCUSU, Simulasyon, kamuBilgisi, kamuBloklari, kamuHucreleri, sureCarpaniPpm } from "@bolge/cekirdek";
import type { Baglam, CekirdekVeriPaketi } from "@bolge/cekirdek";
import { miniVeriyiYukle, parselFiksturuYukle } from "@bolge/veri";
import { IlgiKaresiSemasi, KareDeltasiSemasi, blokHucreleri, deltaUygula, erkenOyunCarpani, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar, kamuBilgisiBul, kareFarki } from "../src/index";
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
  // Kamu arsası satılmaz: kamu olmayan, uygun, bitişik iki kırsal hücre.
  const kamu = kamuKumesi(sim);
  const uygun = new Set((v.parsel?.ilceler.find((c) => c.id === ILCE)?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id)).map((h) => h.id));
  const h1 = [...uygun].find((id) => uygun.has(`${Number(id.split(":")[0]) + 1}:${id.split(":")[1]}`)) as string;
  const h2 = `${Number(h1.split(":")[0]) + 1}:${h1.split(":")[1]}`;
  expect(sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" } }).tamam).toBe(true);
  return { sim, h1, h2 };
}

/** Kamu arsası hücreleri (çekirdeğin `kamuHucreleri` API'si). */
function kamuKumesi(sim: Simulasyon, ilce = ILCE): Set<string> {
  return new Set(kamuHucreleri(sim.dunya, ilce).flatMap((g) => g.hucreler));
}

function kare(sim: Simulasyon, oyuncu: string | null, liste = true): IlgiKaresi {
  return ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], oyuncu), oyuncu, ilceIlgisiKur(sim, [ILCE], oyuncu), { ayrilmisListesi: liste, kamuListesi: liste });
}

describe("oyuncu.mulk.katilimIlcesi (yalniz sahibine, istege bagli)", () => {
  function katilimli(ilce?: string): Simulasyon {
    const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
    const yo = v.param.mulk?.yeniOyuncu;
    if (yo) {
      yo.hibe = 500_000_000;
      yo.yurtHucre = 0;
    }
    const sim = Simulasyon.olustur(v, 3);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ...(ilce ? { ilce } : {}) } });
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [] } }); // katilim ilcesi yok
    return sim;
  }

  it("cekirdekte varsa yalniz sahibinin oyuncu karesinde; yoksa alan HIC yok; izleyici ve baskasi gormez; sema gecerli", () => {
    const sim = katilimli("sn_m_ova_tasra");
    const cekirdek = sim.dunya.mulk?.oyuncular.find((o) => o.id === "ali")?.katilimIlcesi;
    expect(cekirdek).toBe("sn_m_ova_tasra");
    const ali = kare(sim, "ali");
    const veli = kare(sim, "veli");
    const izleyici = kare(sim, null);
    expect(ali.oyuncu?.mulk?.katilimIlcesi).toBe("sn_m_ova_tasra");
    expect(IlgiKaresiSemasi.parse(ali)).toEqual(ali);
    // Katilim ilcesi olmayan oyuncuda alan hic gonderilmez (undefined bile degil).
    expect(veli.oyuncu?.mulk).toBeDefined();
    expect("katilimIlcesi" in (veli.oyuncu?.mulk ?? {})).toBe(false);
    expect(JSON.stringify(veli)).not.toContain("katilimIlcesi");
    // Baskasinin degeri sizmaz; izleyicide oyuncu karesi yok.
    expect(izleyici.oyuncu).toBeUndefined();
    expect(JSON.stringify(izleyici)).not.toContain("katilimIlcesi");
    expect(JSON.stringify(veli)).not.toContain("sn_m_ova_tasra");
    // Delta: sahibinin karesine yansir ve uygulayinca ayni kare.
    const bos = kare(sim, "veli");
    const d = kareFarki(bos, ali);
    expect(KareDeltasiSemasi.parse(d)).toEqual(d);
    expect(deltaUygula(bos, d)).toEqual(ali);
  });

  it("bolge kipinde (mulk yok) alan yoktur", () => {
    const sim = Simulasyon.olustur(miniVeriyiYukle(), 3);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: ["m_ova"] } });
    const k = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [0], "ali"), "ali", ilceIlgisiKur(sim, [], "ali"));
    expect(k.oyuncu?.mulk).toBeUndefined();
    expect(JSON.stringify(k)).not.toContain("katilimIlcesi");
  });
});

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
    sim.uygula({ t: 2 * SAAT, oyuncu: "veli", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [sim.ic.mulk!.fikstur.ilceler.find((c) => c.id === ILCE)!.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamuKumesi(sim).has(h.id) && !sim.ic.mulk!.ayrilmis.has(h.id)).at(-1)!.id], sinif: "kirsal" } });
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

describe("kamu arsasi yayini (dikdortgen blok)", () => {
  it("blokHucreleri ve kamuBilgisiBul: dort uc dahil, blok disi tanimsiz, negatif koordinat, gecersiz kimlik", () => {
    const kamu = [
      { sahip: "k:mahalle:m1", tur: "park" as const, blok: [[3, 1, 5, 2], [10, 10, 10, 10]] as Array<[number, number, number, number]> },
      { sahip: "k:ilce:i1", tur: "hazine" as const, blok: [[-3, 7, -2, 7]] as Array<[number, number, number, number]> },
    ];
    expect(blokHucreleri(kamu[0]!.blok)).toEqual(["3:1", "4:1", "5:1", "3:2", "4:2", "5:2", "10:10"]);
    expect(blokHucreleri(kamu[1]!.blok)).toEqual(["-3:7", "-2:7"]);
    expect(blokHucreleri([])).toEqual([]);
    for (const h of ["3:1", "5:1", "3:2", "5:2", "4:2", "10:10"]) expect(kamuBilgisiBul(kamu, h)).toEqual({ tur: "park", sahip: "k:mahalle:m1" });
    for (const h of ["-3:7", "-2:7"]) expect(kamuBilgisiBul(kamu, h)).toEqual({ tur: "hazine", sahip: "k:ilce:i1" });
    for (const h of ["2:1", "6:1", "3:0", "3:3", "10:11", "11:10", "-1:7", "-4:7"]) expect(kamuBilgisiBul(kamu, h)).toBeUndefined();
    expect(kamuBilgisiBul(kamu, "x:1")).toBeUndefined();
    expect(kamuBilgisiBul(kamu, "12")).toBeUndefined();
    expect(kamuBilgisiBul(undefined, "1:1")).toBeUndefined();
  });

  it("kare: kamuAdet her zaman, kamu gruplari yalniz istenince; cekirdek kamuBloklari/kamuHucreleri ile ayni; her blok hucresi kamu; delta tekrarlamaz", () => {
    const { sim } = kurulum();
    const grup = kamuHucreleri(sim.dunya, ILCE);
    const toplam = grup.reduce((n, g) => n + g.hucreler.length, 0);
    expect(toplam).toBeGreaterThan(0);
    const tam = kare(sim, null, true).ilceler?.[0];
    const sade = kare(sim, null, false).ilceler?.[0];
    expect(sade?.kamuAdet).toBe(toplam);
    expect(sade?.kamu).toBeUndefined();
    expect(tam?.kamuAdet).toBe(toplam);
    // Gruplar çekirdeğin (sahip, tür) gruplarıyla aynı; açılmış blok hücreleri aynı küme; blok sayısı kamuBloklari ile aynı.
    expect(tam?.kamu?.map((g) => [g.sahip, g.tur])).toEqual(grup.map((g) => [g.sahip, g.tur]));
    for (const [i, g] of grup.entries()) expect([...blokHucreleri(tam?.kamu?.[i]?.blok ?? [])].sort()).toEqual([...g.hucreler].sort());
    expect(tam?.kamu?.reduce((n, g) => n + g.blok.length, 0)).toBe(kamuBloklari(sim.dunya, ILCE).length);
    // Bloğun içindeki her hücre bir kamu hücresidir (çekirdek bilgisi tür ve sahibi doğrular).
    for (const g of tam?.kamu ?? []) for (const h of blokHucreleri(g.blok)) expect(kamuBilgisi(sim.dunya, ILCE, h)).toEqual({ tur: g.tur, sahip: g.sahip });
    // Hücre sorgusu (istemci hücre kartı): kamu hücresi tür ve sahibi verir; kamu olmayan tanımsız.
    for (const g of grup) for (const h of g.hucreler.slice(0, 3)) expect(kamuBilgisiBul(tam?.kamu, h)).toEqual({ tur: g.tur, sahip: g.sahip });
    const kamuIds = kamuKumesi(sim);
    const satilabilir = (sim.ic.mulk?.fikstur.ilceler.find((c) => c.id === ILCE)?.hucreler ?? []).find((h) => h.uygun && !kamuIds.has(h.id));
    expect(kamuBilgisiBul(tam?.kamu, satilabilir?.id ?? "")).toBeUndefined();
    expect(kamuBilgisiBul(undefined, "1:1")).toBeUndefined();
    // Kamu hücresi mulk.hucreler'de (satılmış hücre listesinde) yok.
    expect((tam?.hucreler ?? []).every((h) => !kamuIds.has(h[0]))).toBe(true);
    expect(IlgiKaresiSemasi.parse(kare(sim, "ali", true))).toEqual(kare(sim, "ali", true));
    // Şema dört elemanlı bloğu ister.
    const bozuk = structuredClone(kare(sim, null, true));
    (bozuk.ilceler?.[0]?.kamu?.[0]?.blok as unknown as number[][]).push([1, 2, 3]);
    expect(IlgiKaresiSemasi.safeParse(bozuk).success).toBe(false);
    // Delta: ilçe zaten istemcideyken kamu tekrarlanmaz; uygulayınca korunur.
    const a = kare(sim, null, true);
    const satilacak = [...(sim.ic.mulk?.fikstur.ilceler.find((c) => c.id === ILCE)?.hucreler ?? [])].reverse().find((h) => h.uygun && h.sinif === "kirsal" && !kamuIds.has(h.id) && !sim.ic.mulk!.ayrilmis.has(h.id) && !sim.dunya.mulk?.hucreler.some((x) => x.id === h.id));
    sim.uygula({ t: 3 * SAAT, oyuncu: "veli", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [satilacak!.id], sinif: "kirsal" } });
    const b = kare(sim, null, true);
    const delta = kareFarki(a, b);
    expect(delta.ilceler).toHaveLength(1);
    expect(delta.ilceler?.[0]?.kamu).toBeUndefined();
    expect(delta.ilceler?.[0]?.ayrilmis).toBeUndefined();
    expect(KareDeltasiSemasi.parse(delta)).toEqual(delta);
    expect(deltaUygula(a, delta)).toEqual(b);
    expect(deltaUygula(a, delta).ilceler?.[0]?.kamu).toEqual(a.ilceler?.[0]?.kamu);
    // İlçe karede yokken delta kamuyu da taşır.
    const bos: IlgiKaresi = { ...a, ilceler: [] };
    const taze = kareFarki(bos, b);
    expect(taze.ilceler?.[0]?.kamu?.length).toBeGreaterThan(0);
    expect(deltaUygula(bos, taze)).toEqual(b);
  });
});

describe("olcek yukseltme insaatinda ek hucrenin tur adi (hedef = TESIS kimligi, tur indeksi degil)", () => {
  const DAG = "sn_m_dag_merkez";

  function yukseltmeKurulumu(): { sim: Simulasyon; ek: string; govde: string[] } {
    const v: CekirdekVeriPaketi = { ...miniVeriyiYukle(), parsel: parselFiksturuYukle("mini-6") };
    delete v.param.mulk?.kamu;
    const yo = v.param.mulk?.yeniOyuncu;
    if (yo) {
      yo.hibe = 5_000_000_000;
      yo.yurtHucre = 0;
      yo.ilkYapiIndirimPpm = 0;
      yo.indirimliYapiSayisi = 0;
      yo.ayrilmisHucrePpm = 0;
      yo.baslangicStok = { celik: 50_000_000, parca: 50_000_000, gida: 200_000 };
    }
    const sim = Simulasyon.olustur(v, 7);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] } });
    // Yatayda ardışık 4 uygun kırsal hücre: 3'ü S mera, 4.'sü yükseltmenin ek hücresi.
    const c = v.parsel?.ilceler.find((x) => x.id === DAG);
    const uygun = new Set((c?.hucreler ?? []).filter((h) => h.uygun && h.sinif === "kirsal").map((h) => h.id));
    const g = [...uygun].map((id) => [0, 1, 2, 3].map((i) => `${Number(id.split(":")[0]) + i}:${id.split(":")[1]}`)).find((l) => l.every((id) => uygun.has(id))) as string[];
    const t = 200 * SAAT;
    expect(sim.uygula({ t, oyuncu: "ali", komut: { tur: "parsel_al", ilce: DAG, hucreler: g.slice(0, 3), sinif: "kirsal" } }).tamam).toBe(true);
    expect(sim.uygula({ t, oyuncu: "ali", komut: { tur: "tesis_insa_hucre", ilce: DAG, tesisTuru: "mera", hucreler: g.slice(0, 3), olcek: 0 } }).tamam).toBe(true);
    sim.calistirKadar(t + 30 * SAAT);
    const dugum = sim.dunya.bolgeler.find((b) => b.merkez !== undefined && b.tesisler.length > 0);
    const tesis = dugum?.tesisler[0];
    expect(tesis).toBeDefined();
    const r = sim.uygula({ t: sim.dunya.zaman, oyuncu: "ali", komut: { tur: "tesis_olcek_yukselt", bolge: dugum?.id as string, tesis: tesis?.id as number, olcek: 1, ekHucreler: [g[3] as string], sinif: "kirsal" } });
    expect(r.tamam, JSON.stringify(r)).toBe(true);
    return { sim, ek: g[3] as string, govde: g.slice(0, 3) };
  }

  it("suren yukseltmede ek hucre tesisin turuyle gorunur (hem sahibine hem baskasina/izleyiciye); S hucreleri de ayni", () => {
    const { sim, ek, govde } = yukseltmeKurulumu();
    expect(sim.dunya.insaatlar.some((i) => i.tur === "olcek" && i.hucreler?.includes(ek))).toBe(true);
    for (const oyuncu of ["ali", null] as const) {
      const k = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], oyuncu), oyuncu, ilceIlgisiKur(sim, [DAG], oyuncu), {});
      const hucreler = k.ilceler?.find((c) => c.id === DAG)?.hucreler ?? [];
      const tur = (id: string): string | undefined => hucreler.find((h) => h[0] === id)?.[5];
      expect(tur(ek), `ek hucre (${oyuncu})`).toBe("mera");
      for (const id of govde) expect(tur(id), `tesis hucresi ${id} (${oyuncu})`).toBe("mera");
      expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
    }
  });
});
