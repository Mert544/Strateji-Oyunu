/**
 * G7 kare alanları (hepsi İSTEĞE BAĞLI nesne alanı; demetler büyümez, `PROTOKOL_SURUMU` aynı): `genel.dukkanlar` (herkese tabela), `ozel.dukkanlar` (sahibine raf görünümü, kasa,
 * kampanya hakkı, neden satmıyor; raf demeti `fiyatT` ile İLK tanımda tamam), `oyuncu.markalar` ve `oyuncu.ilkSatisT` (yalnız kendisine), `ilce.talep` (dükkânı olan oyuncuya Q).
 * Dükkânsız dünyada kare ESKİ KARE ile bire bir aynıdır; yıkımda alanlar kaybolur; delta; dondurulmuş (alanları bilmeyen) şema yeni kareyi kabul eder.
 * Dükkân DURUMU çekirdek test yardımcısıyla doğrudan yazılır (kurma komutu G7-3'tedir; burada yalnız okuma yolu sınanır).
 */
import { describe, expect, it } from "vitest";
import { PPM, SAAT, GUN } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { bolgeBul, dukkanEkle, dukkanlariSil, perakendeVeri } from "../../cekirdek/test/perakende-yardimci";
import { mulkSim } from "../../cekirdek/test/mulk-yardimci";
import { IlgiKaresiSemasi, KareDeltasiSemasi, deltaUygula, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar, kareFarki } from "../src/index";
import type { IlgiKaresi } from "../src/index";

function dunya(blok = true): Simulasyon {
  const s = mulkSim(["a", "b"], perakendeVeri(undefined, blok));
  s.calistirKadar(12 * SAAT);
  return s;
}

function kare(s: Simulasyon, oyuncu: string | null): IlgiKaresi {
  const bolgeler = s.dunya.bolgeler.map((_, i) => i);
  const ilceler = s.dunya.mulk?.ilceler.map((c) => c.id) ?? [];
  return ilgiKaresiCikar(s, ilgiAlaniKur(s, bolgeler, oyuncu), oyuncu, ilceIlgisiKur(s, ilceler, oyuncu), {});
}

const ALANLAR = /dukkanlar|markalar|ilkSatisT|"talep"/;

describe("dukkansiz dunya: kare eski kareyle ayni (alanlar yazilmaz)", () => {
  it("perakende bloku yokken de, blok var ama dukkan yokken de hicbir yeni alan yok", () => {
    for (const blok of [false, true]) {
      const s = dunya(blok);
      for (const o of ["a", "b", null]) {
        const k = kare(s, o);
        expect(JSON.stringify(k), `blok=${blok} oyuncu=${o}`).not.toMatch(ALANLAR);
        expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
      }
    }
  });
});

describe("dukkanli dunya", () => {
  function kur(): { s: Simulasyon; e: ReturnType<typeof dukkanEkle> } {
    const s = dunya();
    const e = dukkanEkle(s, "a", [{ mal: "gida" }, { mal: "ekmek", fiyat: 3 }, {}]);
    const dk = e.dukkan as NonNullable<typeof e.dukkan>;
    dk.raf[1]!.fiyatT = 5 * SAAT;
    return { s, e };
  }

  it("genel.dukkanlar herkese (izleyici dahil): [id, tur, olcek, markaAd, simge, renk]; markasizsa '' ve 0; marka baglaninca sahibinin markasi", () => {
    const { s, e } = kur();
    const i = s.dunya.bolgeler.indexOf(bolgeBul(s, "a"));
    for (const o of ["a", "b", null]) {
      const b = kare(s, o).bolgeler.find((x) => x.i === i);
      expect(b?.genel.dukkanlar, `oyuncu=${o}`).toEqual([[e.id, "bakkal", 0, "", 0, 0]]);
    }
    const mo = s.dunya.mulk?.oyuncular.find((x) => x.id === "a");
    if (!mo || !e.dukkan) throw new Error("kurulum");
    mo.markalar = [{ ad: "ali market", simge: 3, renk: 5 }];
    e.dukkan.marka = 0;
    expect(kare(s, null).bolgeler.find((x) => x.i === i)?.genel.dukkanlar).toEqual([[e.id, "bakkal", 0, "ali market", 3, 5]]);
    // Baska bolgede (b'nin dugumu) dukkan yok: alan yok.
    const ib = s.dunya.bolgeler.indexOf(bolgeBul(s, "b"));
    expect(kare(s, "b").bolgeler.find((x) => x.i === ib)?.genel.dukkanlar).toBeUndefined();
  });

  it("ozel.dukkanlar YALNIZ sahibine: raf yuva sirasiyla [mal, fiyat, etkin, mevcut, istek, fiyatT] (6 oge); bos yuva mal ''; fiyatT yoksa 0; kasaPpm <= PPM; kampanya [0,0,0] eskisi gibi hakla; karsilanmaPpm", () => {
    const { s, e } = kur();
    const pk = s.ic.mulk?.perakende?.p;
    if (!pk) throw new Error("perakende yok");
    const i = s.dunya.bolgeler.indexOf(bolgeBul(s, "a"));
    const sahip = kare(s, "a").bolgeler.find((x) => x.i === i)?.ozel?.dukkanlar;
    expect(sahip).toHaveLength(1);
    const [id, raf, kasaPpm, kampanya, karsilanma] = (sahip as NonNullable<typeof sahip>)[0]!;
    expect(id).toBe(e.id);
    expect(raf).toHaveLength(pk.olcekler[0].rafYuvasi);
    for (const y of raf) expect(y).toHaveLength(6); // demete oge EKLENMEZ
    expect(raf[0]!.slice(0, 2)).toEqual(["gida", pk.varsayilanFiyatKademesi]);
    expect(raf[0]![5]).toBe(0); // fiyatT tanimsiz -> 0
    expect(raf[1]!.slice(0, 2)).toEqual(["ekmek", 3]);
    expect(raf[1]![5]).toBe(5 * SAAT);
    expect(raf[2]![0]).toBe(""); // bos yuva
    expect([0, 1]).toContain(raf[0]![3]);
    expect(raf[0]![2]).toBeGreaterThanOrEqual(0);
    expect(kasaPpm).toBeGreaterThanOrEqual(0);
    expect(kasaPpm).toBeLessThanOrEqual(PPM);
    expect(kampanya).toEqual([0, pk.kampanyaGunlukEnFazlaSaat, pk.kampanyaHaftalikEnFazlaGun]); // kampanya acik, hic baslatilmadi: tam hak
    expect(karsilanma).toBe(bolgeBul(s, "a").yerelKarsilanmaPpm ?? PPM);
    // Baskasi ve izleyici ozel veriyi gormez.
    expect(kare(s, "b").bolgeler.find((x) => x.i === i)?.ozel).toBeUndefined();
    expect(kare(s, null).bolgeler.find((x) => x.i === i)?.ozel).toBeUndefined();
  });

  it("kampanya hakki: etkin kampanyada bitis > 0; bugunku saat ve haftalik gun dusulur; baska gunde/haftada tam hak; kampanya kapaliysa [0, 0, 0]", () => {
    const { s, e } = kur();
    const pk = s.ic.mulk?.perakende?.p;
    const dk = e.dukkan;
    if (!pk || !dk) throw new Error("kurulum");
    const i = s.dunya.bolgeler.indexOf(bolgeBul(s, "a"));
    const kampanya = (): number[] => (kare(s, "a").bolgeler.find((x) => x.i === i)?.ozel?.dukkanlar?.[0]?.[3] ?? []) as number[];
    const bugun = Math.floor(s.dunya.zaman / GUN);
    const hafta = Math.floor(bugun / 7);
    dk.kampanya = { hafta, gunSayisi: 1, gun: bugun, saat: 2, bitis: s.dunya.zaman + 3 * SAAT };
    expect(kampanya()).toEqual([s.dunya.zaman + 3 * SAAT, (pk.kampanyaGunlukEnFazlaSaat ?? 0) - 2, (pk.kampanyaHaftalikEnFazlaGun ?? 0) - 1]);
    dk.kampanya = { hafta, gunSayisi: 2, gun: bugun - 1, saat: 6, bitis: s.dunya.zaman - SAAT }; // dun kullanildi, bitti
    expect(kampanya()).toEqual([0, pk.kampanyaGunlukEnFazlaSaat, 0]);
    dk.kampanya = { hafta: hafta - 1, gunSayisi: 2, gun: bugun - 8, saat: 6, bitis: 0 };
    expect(kampanya()).toEqual([0, pk.kampanyaGunlukEnFazlaSaat, pk.kampanyaHaftalikEnFazlaGun]);
    // Kapali kampanya: veri bloğunda kampanya yok.
    delete (pk as { kampanyaKademesi?: number }).kampanyaKademesi;
    expect(kampanya()).toEqual([0, 0, 0]);
  });

  it("oyuncu.markalar ve oyuncu.ilkSatisT yalniz kendisine; yoksa alan yok", () => {
    const { s } = kur();
    expect(kare(s, "a").oyuncu).not.toHaveProperty("markalar");
    expect(kare(s, "a").oyuncu).not.toHaveProperty("ilkSatisT");
    const mo = s.dunya.mulk?.oyuncular.find((x) => x.id === "a");
    if (!mo) throw new Error("kurulum");
    mo.markalar = [{ ad: "ali market", simge: 3, renk: 5 }, { ad: "ikinci", simge: 0, renk: 1 }];
    mo.ilkSatisT = 7 * SAAT;
    const k = kare(s, "a");
    expect(k.oyuncu?.markalar).toEqual([["ali market", 3, 5], ["ikinci", 0, 1]]);
    expect(k.oyuncu?.ilkSatisT).toBe(7 * SAAT);
    expect(IlgiKaresiSemasi.parse(k)).toEqual(k);
    for (const o of ["b", null]) expect(JSON.stringify(kare(s, o)), `oyuncu=${o}`).not.toMatch(/ali market|ilkSatisT/);
  });

  it("ilce.talep: yalniz dukkani olan oyuncuya, kendi raf mallarinin Q'su (mal sirali, q > 0); dukkansiz oyuncuda ve izleyicide yok", () => {
    const { s } = kur();
    const k = kare(s, "a");
    const talepli = (k.ilceler ?? []).filter((c) => c.talep !== undefined);
    expect(talepli.length).toBeGreaterThan(0);
    for (const c of talepli) {
      const mallar = (c.talep ?? []).map((x) => x[0]);
      expect(mallar).toEqual([...mallar].sort());
      expect(mallar.every((m) => m === "gida" || m === "ekmek")).toBe(true);
      for (const [, q] of c.talep ?? []) expect(q).toBeGreaterThan(0);
    }
    for (const o of ["b", null]) expect((kare(s, o).ilceler ?? []).every((c) => c.talep === undefined), `oyuncu=${o}`).toBe(true);
  });

  it("yikim (dukkan_yik sonucu): yapi silinince genel/ozel dukkanlar ve ilce talebi kaybolur (kare dukkansiz kareyle ayni); delta ikisini de tasir; deltaUygula(a, kareFarki(a, b)) = b", () => {
    const { s } = kur();
    const once = kare(s, "a");
    expect(JSON.stringify(once)).toMatch(/dukkanlar/);
    dukkanlariSil(s);
    const sonra = kare(s, "a");
    expect(JSON.stringify(sonra)).not.toMatch(ALANLAR);
    const d = kareFarki(once, sonra);
    expect(KareDeltasiSemasi.parse(d)).toEqual(d);
    expect(deltaUygula(once, d)).toEqual(sonra);
    // Ters yon: dukkan gelince de delta kareyi kurar.
    const d2 = kareFarki(sonra, once);
    expect(deltaUygula(sonra, d2)).toEqual(once);
  });

  it("DONDURULMUS eski sema (yeni alanlari bilmeyen; z.object bilinmeyen anahtari atar, z.tuple fazla ogeyi reddeder) yeni kareyi kabul eder ve alanlari atar; demetler ayni uzunlukta", () => {
    const { s } = kur();
    const mo = s.dunya.mulk?.oyuncular.find((x) => x.id === "a");
    if (!mo) throw new Error("kurulum");
    mo.markalar = [{ ad: "ali market", simge: 3, renk: 5 }];
    mo.ilkSatisT = 7 * SAAT;
    const k = kare(s, "a");
    expect(JSON.stringify(k)).toMatch(/dukkanlar/);
    // Eski sema = bugunku semadan YALNIZ bu alanlar cikarilmis hali.
    const bolge = IlgiKaresiSemasi.shape.bolgeler.element;
    const eskiGenel = bolge.shape.genel.omit({ dukkanlar: true });
    const eskiOzel = bolge.shape.ozel.unwrap().omit({ dukkanlar: true });
    const eskiOyuncu = IlgiKaresiSemasi.shape.oyuncu.unwrap().omit({ markalar: true, ilkSatisT: true });
    const eskiIlce = IlgiKaresiSemasi.shape.ilceler.unwrap().element.omit({ talep: true });
    const agdaki = JSON.parse(JSON.stringify(k)) as IlgiKaresi;
    for (const b of agdaki.bolgeler) {
      expect(eskiGenel.safeParse(b.genel).success).toBe(true);
      expect(JSON.stringify(eskiGenel.parse(b.genel))).not.toContain("dukkanlar");
      if (b.ozel) {
        const r = eskiOzel.safeParse(b.ozel);
        expect(r.success).toBe(true);
        if (r.success) expect(JSON.stringify(r.data)).not.toContain("dukkanlar");
      }
    }
    expect(eskiOyuncu.parse(agdaki.oyuncu)).not.toHaveProperty("markalar");
    for (const c of agdaki.ilceler ?? []) expect(JSON.stringify(eskiIlce.parse(c))).not.toContain("talep");
    // Raf demeti ve tabela demeti uzunluklari KALICIDIR (oge eklenirse bu test ve eski istemci kirilir).
    const ozel = agdaki.bolgeler.flatMap((b) => b.ozel?.dukkanlar ?? []);
    expect(ozel).toHaveLength(1);
    expect(ozel[0]).toHaveLength(5);
    for (const y of ozel[0]![1]) expect(y).toHaveLength(6);
    expect(ozel[0]![3]).toHaveLength(3);
    for (const g of agdaki.bolgeler.flatMap((b) => b.genel.dukkanlar ?? [])) expect(g).toHaveLength(6);
    // Fazla ogeli demet sema tarafindan reddedilir (eski istemci davranisinin kaniti).
    const kotu = structuredClone(agdaki);
    (kotu.bolgeler.find((b) => b.ozel?.dukkanlar)?.ozel?.dukkanlar?.[0]?.[1][0] as unknown[]).push(1);
    expect(IlgiKaresiSemasi.safeParse(kotu).success).toBe(false);
  });

  it("sema: bicim denetlenir (mevcut 0/1 disi, olcek 3, eksik kampanya elemani reddedilir)", () => {
    const { s } = kur();
    const k = kare(s, "a");
    const dene = (duz: (c: IlgiKaresi) => void): boolean => {
      const c = structuredClone(k);
      duz(c);
      return IlgiKaresiSemasi.safeParse(c).success;
    };
    const ozel = (c: IlgiKaresi) => c.bolgeler.find((b) => b.ozel?.dukkanlar)?.ozel?.dukkanlar?.[0] as NonNullable<NonNullable<IlgiKaresi["bolgeler"][number]["ozel"]>["dukkanlar"]>[number];
    expect(dene(() => undefined)).toBe(true);
    expect(dene((c) => { (ozel(c)[1][0] as unknown[])[3] = 2; })).toBe(false);
    expect(dene((c) => { (ozel(c)[3] as unknown[]).pop(); })).toBe(false);
    expect(dene((c) => { (c.bolgeler.find((b) => b.genel.dukkanlar)?.genel.dukkanlar?.[0] as unknown[])[2] = 3; })).toBe(false);
  });
});
