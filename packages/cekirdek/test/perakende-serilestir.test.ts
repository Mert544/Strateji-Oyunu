/**
 * G7-2 (sartname §11.1-§11.3, §7.1b, §16.2 `perakende-serilestir`): yeni durum alanlarının serileştirme gidiş-dönüşü ve doğrulayıcıları: `dukkan` (raf, `satis`/`satisOran`, `kurulus`),
 * `markalar`, `dukkanGeliri`, `ilkSatisT`, `BolgeDurumu.yerelKarsilanmaPpm`, `ParaAkisi.yerel`, `musluk.yerelNpc`; `dunyaIcerikUyumu` (§11.2); `fikstur-goc/mulk-v1.json` yeni kodla ve perakende bloğuyla
 * yüklenir (özet aynı). G7-3 (komutlar, kampanya) bu dosyayı genişletir.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { anlikGoruntuOlustur, dunyaCoz, dunyaIcerikUyumu, dunyaSerilestir, kuralSurumuHesapla, SerilestirmeHatasi } from "../src/serilestir";
import { GUN, SAAT } from "../src/tipler";
import type { CekirdekVeriPaketi, Dunya } from "../src/tipler";
import type { IcerikKimlikTablosu } from "../src/goc";
import { dukkanEkle, dukkanlar, perakendeVeri } from "./perakende-yardimci";
import { mulkSim, mulkVeriTam } from "./mulk-yardimci";

const OVA = "sn_m_ova_merkez";

function veri(): CekirdekVeriPaketi {
  return perakendeVeri((v) => {
    v.param.mulk!.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 9_000_000, ekmek: 9_000_000, un: 9_000_000, tahil: 200_000 };
  });
}

/** Satışı olan, markalı bir dünya (3 gün). */
function dunya(): { s: Simulasyon; d: Dunya } {
  const s = mulkSim(["a"], veri(), 4);
  s.dunya.mulk!.oyuncular[0]!.markalar = [{ ad: "firin 1", simge: 2, renk: 3 }];
  const e = dukkanEkle(s, "a", [{ mal: "gida", fiyat: 1 }, { mal: "ekmek", fiyat: 2 }], "bakkal", 0, OVA);
  e.dukkan!.marka = 0;
  s.calistirKadar(3 * GUN);
  return { s, d: s.dunya };
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

/** Dünyayı metne çevirir, `duzenle` ile bozar, geri çözer; hata yolunu döner. */
function bozulmus(d: Dunya, duzenle: (x: Dunya) => void): string {
  const kopya = JSON.parse(dunyaSerilestir(d)) as Dunya;
  duzenle(kopya);
  const h = hata(() => dunyaCoz(JSON.stringify(kopya)));
  return h.message;
}

describe("gidiş-dönüş", () => {
  it("dükkân (raf, satis, satisOran, kurulus), markalar, dukkanGeliri, ilkSatisT, paraAkisi.yerel, musluk.yerelNpc tam gidiş-dönüş; metin ve özet aynı", () => {
    const { s, d } = dunya();
    const metin = dunyaSerilestir(d);
    for (const alan of ['"satis"', '"satisOran"', '"kurulus"', '"markalar"', '"dukkanGeliri"', '"ilkSatisT"', '"yerelNpc"']) expect(metin).toContain(alan);
    const geri = dunyaCoz(metin);
    expect(dunyaSerilestir(geri)).toBe(metin);
    dunyaIcerikUyumu(s.ic, geri); // içerik uyumu da geçer
    expect(dukkanlar(s)[0]!.e.dukkan!.raf[0]!.satis!.n).toBeGreaterThan(0);
  });

  it("anlık görüntüden yüklenen sim aynı özet; yüklemeden sonra devam eden koşu kesintisiz koşuyla aynı", () => {
    const { s } = dunya();
    const v = veri();
    const y = Simulasyon.anlikGoruntudenYukle(v, anlikGoruntuOlustur(s, kuralSurumuHesapla(v)));
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    s.calistirKadar(s.dunya.zaman + 2 * GUN);
    y.calistirKadar(y.dunya.zaman + 2 * GUN);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
  });

  it("satışsız dükkân: yuvada yalnız mal ve fiyat; satis/satisOran/ilkSatisT/dukkanGeliri/yerelNpc ALANLARI YOK; dükkân kaydı geçerli", () => {
    const s = mulkSim(["a"], veri(), 4);
    dukkanEkle(s, "a", [{ mal: "sut" }, {}], "bakkal", 0, OVA); // sut ağda yok
    s.calistirKadar(GUN);
    const metin = dunyaSerilestir(s.dunya);
    for (const alan of ['"satis"', '"satisOran"', '"ilkSatisT"', '"dukkanGeliri"', '"yerelNpc"', '"yerelKarsilanmaPpm"']) expect(metin).not.toContain(alan);
    expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
  });
});

describe("bozuk değer reddi (dunyaDogrula)", () => {
  const e = (x: Dunya) => bolgeBulYol(x);
  function bolgeBulYol(x: Dunya) {
    const b = x.bolgeler.find((z) => z.ekYapilar?.some((k) => k.dukkan !== undefined))!;
    return { b, ek: b.ekYapilar!.find((k) => k.dukkan !== undefined)!, yuva: b.ekYapilar!.find((k) => k.dukkan !== undefined)!.dukkan!.raf[0]! };
  }

  it("yuva: satis.a >= SAAT, negatif n, satisOran 0 ve ondalık, negatif fiyat, fiyatT negatif", () => {
    const { d } = dunya();
    expect(bozulmus(d, (x) => (e(x).yuva.satis = { n: 1, a: SAAT }) as unknown)).toMatch(/satis\.a/);
    expect(bozulmus(d, (x) => (e(x).yuva.satis = { n: -1, a: 0 }))).toMatch(/satis\.n/);
    expect(bozulmus(d, (x) => (e(x).yuva.satisOran = 0))).toMatch(/satisOran/);
    expect(bozulmus(d, (x) => (e(x).yuva.satisOran = 1.5))).toMatch(/./); // tamsayı kuralı
    expect(bozulmus(d, (x) => (e(x).yuva.fiyat = -1))).toMatch(/fiyat/);
    expect(bozulmus(d, (x) => (e(x).yuva.fiyatT = -5))).toMatch(/fiyatT/);
  });

  it("dükkân: olcek 3, baslangic > kurulus, zorunlu alan eksik, dukkan olmayan ek yapıda dukkan alanı", () => {
    const { d } = dunya();
    expect(bozulmus(d, (x) => (e(x).ek.dukkan!.olcek = 3 as 0))).toMatch(/olcek/);
    expect(bozulmus(d, (x) => (e(x).ek.dukkan!.baslangic = e(x).ek.dukkan!.kurulus + 1))).toMatch(/baslangic/);
    expect(bozulmus(d, (x) => delete (e(x).ek.dukkan as { kurulus?: number }).kurulus)).toMatch(/kurulus/);
    expect(bozulmus(d, (x) => (e(x).ek.tur = "ambar"))).toMatch(/dukkan alani yalniz/);
  });

  it("bölge: yerelKarsilanmaPpm PPM ya da negatif ya da harita bölgesinde; para: paraAkisi.yerel 0, musluk bilinmeyen anahtar, dukkanGeliri sayacı; marka: kanonik olmayan ad, ad kuralı", () => {
    const { d } = dunya();
    expect(bozulmus(d, (x) => (e(x).b.yerelKarsilanmaPpm = 1_000_000))).toMatch(/yerelKarsilanmaPpm/);
    expect(bozulmus(d, (x) => (e(x).b.yerelKarsilanmaPpm = -1))).toMatch(/yerelKarsilanmaPpm/);
    expect(bozulmus(d, (x) => (x.bolgeler[0]!.yerelKarsilanmaPpm = 5))).toMatch(/yalniz isletme/);
    expect(bozulmus(d, (x) => (x.mulk!.oyuncular[0]!.paraAkisi!.yerel = 0))).toMatch(/paraAkisi\.yerel/);
    expect(bozulmus(d, (x) => ((x.mulk!.para!.musluk as unknown as Record<string, unknown>)["bilinmeyen"] = { n: 0, a: 0 }))).toMatch(/bilinmeyen musluk kalemi/);
    expect(bozulmus(d, (x) => (x.mulk!.oyuncular[0]!.dukkanGeliri = { n: 0, a: SAAT }))).toMatch(/dukkanGeliri/);
    expect(bozulmus(d, (x) => (x.mulk!.oyuncular[0]!.ilkSatisT = -1))).toMatch(/ilkSatisT/);
    expect(bozulmus(d, (x) => (x.mulk!.oyuncular[0]!.markalar![0]!.ad = "Firin 1"))).toMatch(/kanonik/);
    expect(bozulmus(d, (x) => (x.mulk!.oyuncular[0]!.markalar![0]!.ad = "a"))).toMatch(/marka adi gecersiz/);
    // negatif kontrol: bozulmamış dünya çözülür
    expect(() => dunyaCoz(dunyaSerilestir(d))).not.toThrow();
  });
});

describe("dunyaIcerikUyumu (§11.2)", () => {
  function uyum(duzenle: (x: Dunya) => void, ic = dunya().s.ic): string {
    const { d } = dunya();
    const kopya = dunyaCoz(dunyaSerilestir(d));
    duzenle(kopya);
    return hata(() => dunyaIcerikUyumu(ic, kopya)).message;
  }
  const ek = (x: Dunya) => x.bolgeler.flatMap((b) => b.ekYapilar ?? []).find((k) => k.dukkan !== undefined)!;

  it("bilinmeyen tür, türün dışında mal, bilinmeyen mal, kademe aralık dışı, raf uzunluğu, marka indeksi, kampanya (parametre yokken)", () => {
    expect(uyum((x) => (ek(x).dukkan!.tur = "yok_tur"))).toMatch(/icerikte olmayan dukkan turu/);
    expect(uyum((x) => (ek(x).dukkan!.raf[0]!.mal = "celik"))).toMatch(/mal dukkan turunde yok/);
    expect(uyum((x) => (ek(x).dukkan!.raf[0]!.mal = "yok_mal"))).toMatch(/icerikte olmayan mal/);
    expect(uyum((x) => (ek(x).dukkan!.raf[0]!.fiyat = 99))).toMatch(/fiyat kademesi/);
    expect(uyum((x) => ek(x).dukkan!.raf.pop())).toMatch(/raf yuvasi/);
    expect(uyum((x) => (ek(x).dukkan!.marka = 5))).toMatch(/marka indeksi/);
    const sKampanyasiz = mulkSim(["a"], perakendeVeri((_, pr) => delete pr.kampanyaKademesi), 4);
    expect(
      uyum((x) => (ek(x).dukkan!.kampanya = { hafta: 0, gunSayisi: 1, gun: 0, saat: 1, bitis: 1 }), sKampanyasiz.ic),
    ).toMatch(/kampanya kapali/);
  });

  it("perakende tanımsızken dükkân hata; perakende varken geçerli dükkân uyumlu (negatif kontrol)", () => {
    const { d } = dunya();
    const kopya = dunyaCoz(dunyaSerilestir(d));
    const sBlokYok = mulkSim(["a"], perakendeVeri(undefined, false), 4);
    expect(hata(() => dunyaIcerikUyumu(sBlokYok.ic, kopya)).message).toMatch(/icerikte olmayan ek yapi: dukkan|perakende \(mulk\.perakende\) tanimli degil/);
    expect(() => dunyaIcerikUyumu(dunya().s.ic, kopya)).not.toThrow();
  });
});

describe("eski dünya + yeni kod: fikstur-goc/mulk-v1.json (G7 öncesi görüntü)", () => {
  const FIKSTUR = new URL("./fikstur-goc/", import.meta.url);
  const metin = readFileSync(new URL("mulk-v1.json", FIKSTUR), "utf8");
  const ust = JSON.parse(readFileSync(new URL("mulk-v1.ust.json", FIKSTUR), "utf8")) as { ozet: string; tablo: IcerikKimlikTablosu; zaman: number };
  const eskiVeri = (blok: boolean): CekirdekVeriPaketi =>
    mulkVeriTam((x) => {
      const m = x.param.mulk!;
      m.yeniOyuncu.hibe = 2_000_000_000;
      m.yeniOyuncu.baslangicStok = { celik: 5_000_000, parca: 5_000_000, gida: 200_000 };
      m.yeniOyuncu.indirimliYapiSayisi = 0;
      m.yeniOyuncu.ayrilmisHucrePpm = 0;
      m.esZamanliInsaat = 10;
      if (blok) {
        const p = perakendeVeri().param.mulk!;
        m.ekYapilar = { ...(m.ekYapilar ?? {}), dukkan: p.ekYapilar!["dukkan"]! };
        m.perakende = p.perakende!;
      }
    });

  it("perakende bloğu EKLENMİŞ içerikle yüklenir (gocIzni): dünya durumu fikstürdekiyle aynı özet; dükkân/para alanı oluşmaz; sonra koşar", () => {
    const r = Simulasyon.anlikGoruntudenYukleSonuclu(eskiVeri(true), metin, [], { gocIzni: true, eskiTablo: ust.tablo });
    expect(r.goc.eskiDurumOzeti).toBe(ust.ozet);
    if (!r.goc.yenidenIndekslendi) expect(r.sim.durumOzeti()).toBe(ust.ozet);
    r.sim.calistirKadar(r.sim.dunya.zaman + 2 * GUN);
    expect(r.sim.dunya.mulk!.para?.musluk.yerelNpc).toBeUndefined();
    expect(dukkanlar(r.sim)).toEqual([]);
    // blok yok ve blok var AYNI dünyayı AYNI biçimde ilerletir (dükkânsız no-op)
    const b = Simulasyon.anlikGoruntudenYukleSonuclu(eskiVeri(false), metin, [], { gocIzni: true, eskiTablo: ust.tablo });
    b.sim.calistirKadar(b.sim.dunya.zaman + 2 * GUN);
    expect(r.sim.durumOzeti()).toBe(b.sim.durumOzeti());
    // negatif kontrol: gerçekten ilerledi
    expect(r.sim.dunya.zaman).toBeGreaterThan(ust.zaman);
  });
});
