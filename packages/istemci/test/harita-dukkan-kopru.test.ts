/**
 * Dükkân köprüsü (saf modül): gerçek sunucu karesi (`ilgiKaresiCikar`, çekirdek test yardımcılarıyla kurulan dünya) -> `DukkanGorunumu`; §6.8b türetilmiş değerler (A2 örneği birebir:
 * 727 ₺/sa, 8.945 ₺, 13 sa; kademe 0,85'te negatif net); G7 komut kurucuları protokol `KomutSemasi`'ndan geçer ve çekirdek tarafından kabul edilir.
 */
import { describe, expect, it } from "vitest";
import { PPM, SAAT } from "@bolge/cekirdek";
import type { Simulasyon } from "@bolge/cekirdek";
import { KomutSemasi, ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "@bolge/protokol";
import type { IlgiKaresi } from "@bolge/protokol";
import { mulkSim } from "../../cekirdek/test/mulk-yardimci";
import { dukkanEkle, perakendeVeri } from "../../cekirdek/test/perakende-yardimci";
import {
  asagiTL,
  beklemeSaati,
  dukkanGorunumuKur,
  dukkanKurArsasizKomutu,
  dukkanKurKomutu,
  dukkanNetMili,
  fiyatKomutu,
  ihrNetPpm,
  ithNetPpm,
  markaKomutu,
  odemeSaat,
  rafKomutu,
  yatirimMili,
  yuvaMili,
} from "../src/harita/dukkan-kopru";
import type { KopruParam, KopruPazar } from "../src/harita/dukkan-kopru";

// --- A2 sabitleri (docs/arastirma/p4-p5-ekonomi.md §1.9): ihracat 0,90, ithalat 1,10, komisyon %1, kademeler 0,85/0,95/1,05/1,15 -------------------------------------------------
const PAZAR: KopruPazar = { ihracatCarpaniPpm: 900_000, ithalatCarpaniPpm: 1_100_000, islemKomisyonuPpm: 10_000 };
const KADEMELER = [850_000, 950_000, 1_050_000, 1_150_000];
/** A2 satırı: şehir, 1 dükkân, ekmek, 90 birim/sa (kasa dolu), R = 60 ₺, gider 132 ₺/sa. */
const R_EKMEK = 60_000;
const ISTEK = 90_000;
const GIDER_S = 132_000;

describe("§6.8b: yuva neti, dükkân neti, kendini ödeme süresi (A2 örneği)", () => {
  it("ihrNet 0,891 SABİT DEĞİL: param.pazar'dan (komisyon sıfırlanınca 0,900); ithNet ≈ 1,111111", () => {
    expect(ihrNetPpm(PAZAR)).toBe(891_000);
    expect(ihrNetPpm({ ...PAZAR, islemKomisyonuPpm: 0 })).toBe(900_000);
    expect(ihrNetPpm({ ...PAZAR, ihracatCarpaniPpm: 800_000 })).toBe(792_000);
    expect(ithNetPpm(PAZAR)).toBe(1_111_111);
  });

  it("A2: 90 x 60 x 1,05 - 90 x 60 x 0,891 - 132 = 726,6 ₺/sa (A2 tablosu 727); yatırım 8.945 ₺ -> 12,3 -> 13 sa (yukarı)", () => {
    const y = yuvaMili({ dolu: true, mevcut: true, istekMiliSaat: ISTEK, etkinKademe: 2, referansMili: R_EKMEK }, PPM, KADEMELER, PAZAR);
    expect(y).toEqual({ satisMiliSaat: 90_000, gelirMiliSaat: 5_670_000, altMiliSaat: 4_811_400, netMiliSaat: 858_600 });
    const net = dukkanNetMili([y.netMiliSaat, 0, 0, 0], GIDER_S);
    expect(net).toBe(726_600);
    expect(Math.round(net / 1000)).toBe(727); // A2 tablosundaki sayı (en yakın)
    expect(asagiTL(net)).toBe(726); // ekranda tam ₺ AŞAĞI
    expect(odemeSaat(8_945_000, net)).toBe(13); // 12,31 -> yukarı
    expect(odemeSaat(11_225_000, net)).toBe(16); // indirimsiz 15,45 -> 16 (A2 "15": yuvarlamaz)
  });

  it("A2 dukkan-yuva-rakam D5c/D5e: gıda R = 97 ₺, normal kademe, gider 132, istek 90; karşılanma 0,55 → satış 49,5, yuva +763, dükkân +631; 0,055 → dükkân −55,66 (−56), geri ödemez", () => {
    const R = 97_000;
    const c = yuvaMili({ dolu: true, mevcut: true, istekMiliSaat: ISTEK, etkinKademe: 2, referansMili: R }, 550_000, KADEMELER, PAZAR);
    expect(c.satisMiliSaat).toBe(49_500);
    expect(Math.floor(c.gelirMiliSaat / 1000)).toBe(5_041); // ekranda gelir 5.040-5.041 ₺/sa (A2 5.040)
    expect(Math.floor(c.netMiliSaat / 1000)).toBe(763);
    const netC = dukkanNetMili([c.netMiliSaat, 0, 0, 0], GIDER_S);
    expect(asagiTL(netC)).toBe(631);
    expect(Math.floor((c.gelirMiliSaat - GIDER_S) / 1000)).toBe(4_909); // gelir - gider: ekrandaki YANLIŞ sayı (A2 +4.908)
    const e = yuvaMili({ dolu: true, mevcut: true, istekMiliSaat: ISTEK, etkinKademe: 2, referansMili: R }, 55_000, KADEMELER, PAZAR);
    expect(e.satisMiliSaat).toBe(4_950);
    const netE = dukkanNetMili([e.netMiliSaat, 0, 0, 0], GIDER_S);
    expect(asagiTL(netE)).toBe(-56);
    expect(Math.floor((e.gelirMiliSaat - GIDER_S) / 1000)).toBe(372); // gelir - gider: ekrandaki YANLIŞ sayı (A2 +370)
    expect(odemeSaat(8_945_000, netE)).toBeNull(); // geri ödemez
    expect(odemeSaat(8_945_000, netC)).toBe(Math.ceil(8_945_000 / netC));
  });

  it("kademe 0,85 (kampanya) NEGATİF net: yuva -221,4 ₺/sa, dükkân -353,4 ₺/sa (A2 -353); geri ödemez (null)", () => {
    const y = yuvaMili({ dolu: true, mevcut: true, istekMiliSaat: ISTEK, etkinKademe: 0, referansMili: R_EKMEK }, PPM, KADEMELER, PAZAR);
    expect(y.netMiliSaat).toBe(-221_400);
    expect(y.gelirMiliSaat).toBe(4_590_000);
    const net = dukkanNetMili([y.netMiliSaat], GIDER_S);
    expect(net).toBe(-353_400);
    expect(Math.round(net / 1000)).toBe(-353);
    expect(asagiTL(net)).toBe(-354); // negatifte de matematiksel floor
    expect(odemeSaat(8_945_000, net)).toBeNull();
    expect(odemeSaat(8_945_000, 0)).toBeNull();
  });

  it("boş ya da stoksuz yuva net 0; karşılanma < PPM satışı düşürür; kademe 0,891 civarında net ~0", () => {
    expect(yuvaMili({ dolu: false, mevcut: false, istekMiliSaat: ISTEK, etkinKademe: 2, referansMili: R_EKMEK }, PPM, KADEMELER, PAZAR).netMiliSaat).toBe(0);
    expect(yuvaMili({ dolu: true, mevcut: false, istekMiliSaat: ISTEK, etkinKademe: 2, referansMili: R_EKMEK }, PPM, KADEMELER, PAZAR).netMiliSaat).toBe(0);
    const yarim = yuvaMili({ dolu: true, mevcut: true, istekMiliSaat: ISTEK, etkinKademe: 2, referansMili: R_EKMEK }, 500_000, KADEMELER, PAZAR);
    expect(yarim.satisMiliSaat).toBe(45_000);
    expect(yarim.netMiliSaat).toBe(429_300);
    const esit = yuvaMili({ dolu: true, mevcut: true, istekMiliSaat: ISTEK, etkinKademe: 0, referansMili: R_EKMEK }, PPM, [891_000], PAZAR);
    expect(esit.netMiliSaat).toBe(0);
  });

  it("ödeme süresi YUKARI: tam bölünürse tam, 1 mili fazlası bir saat daha; yatırım 0 -> 0 sa", () => {
    expect(odemeSaat(1_000, 500)).toBe(2);
    expect(odemeSaat(1_001, 500)).toBe(3);
    expect(odemeSaat(0, 500)).toBe(0);
  });

  it("nakit yatırım: indirimli bedel + eksik mal x R x ithNet (stok yeterliyse yalnız para); aşağı yuvarlama tutarlı", () => {
    expect(yatirimMili(8_945_000, [{ mal: "celik", gerekliMili: 14_000, stokMili: 120_000, referansMili: 120_000 }], PAZAR)).toBe(8_945_000); // stok yeterli
    // 10 pencere eksik: 10 x 360 ₺ x 1,111111 = 3.999,999 ₺ (aşağı)
    expect(yatirimMili(4_200_000, [{ mal: "pencere", gerekliMili: 10_000, stokMili: 0, referansMili: 360_000 }], PAZAR)).toBe(8_199_999);
    // kısmi stok: yalnız eksik kısım
    expect(yatirimMili(0, [{ mal: "parca", gerekliMili: 5_600, stokMili: 3_600, referansMili: 180_000 }], PAZAR)).toBe(399_999);
  });

  it("bekleme saati: fiyatT 0 = serbest; pencere içinde yukarı; dolunca 0; sınır 0 = sınırsız", () => {
    expect(beklemeSaati(10 * SAAT, 0, 6)).toBe(0);
    expect(beklemeSaati(10 * SAAT, 8 * SAAT, 6)).toBe(4);
    expect(beklemeSaati(10 * SAAT + 1, 8 * SAAT, 6)).toBe(4);
    expect(beklemeSaati(10 * SAAT, 8 * SAAT - 1, 6)).toBe(4); // kalan 4 sa - 1 ms: yukarı 4
    expect(beklemeSaati(14 * SAAT, 8 * SAAT, 6)).toBe(0);
    expect(beklemeSaati(14 * SAAT - 1, 8 * SAAT, 6)).toBe(1);
    expect(beklemeSaati(10 * SAAT, 8 * SAAT, 0)).toBe(0);
  });
});

// --- gerçek kare -> görünüm ---------------------------------------------------------------------------------------------------------------------------------------------------

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

function paramOku(s: Simulasyon): KopruParam {
  const pk = s.ic.param.mulk?.perakende;
  return { perakende: pk ?? null, pazar: s.ic.param.pazar };
}

function referansOku(s: Simulasyon, k: IlgiKaresi) {
  return (mal: string) => {
    const i = s.ic.malIndeks[mal];
    const v = i === undefined ? undefined : k.fiyat[i];
    return v === undefined ? undefined : { mili: v, yaklasik: false };
  };
}

describe("kare -> DukkanGorunumu (gerçek sunucu karesi)", () => {
  function kur() {
    const s = dunya();
    const e = dukkanEkle(s, "a", [{ mal: "gida" }, { mal: "ekmek", fiyat: 3 }, {}]);
    const dk = e.dukkan as NonNullable<typeof e.dukkan>;
    dk.raf[1]!.fiyatT = 5 * SAAT; // dolu yuva: son fiyat değişimi
    dk.raf[2]!.fiyatT = 11 * SAAT; // BOŞ yuva (boşaltılmış): fiyatT korunur
    const mo = s.dunya.mulk?.oyuncular.find((x) => x.id === "a");
    if (!mo) throw new Error("kurulum");
    mo.markalar = [{ ad: "ali market", simge: 3, renk: 5 }];
    dk.marka = 0;
    mo.ilkSatisT = 8 * SAAT;
    return { s, e, dk };
  }

  it("alanlar: tür/ölçek/marka tabeladan, raf yuvaları, boş yuva null + fiyatT, bekleme = kalan pencere (yukarı), markalar ve ilkSatisT", () => {
    const { s, e } = kur();
    const k = kare(s, "a");
    const param = paramOku(s);
    const sonuc = dukkanGorunumuKur({ kare: k, param, referans: referansOku(s, k), kurmaKarsilaniyor: true });
    expect(sonuc).not.toBeNull();
    const g = sonuc!.gorunum;
    const enAz = param.perakende!.fiyatDegisimEnAzSaat;
    expect(g.kapali).toBe(false);
    expect(g.kurmaKarsilaniyor).toBe(true);
    expect(g.kampanyaAcik).toBe(true);
    expect(g.markalar).toEqual([["ali market", 3, 5]]);
    expect(g.ilkSatisT).toBe(8 * SAAT);
    expect(g.satilabilirMallar.has("gida") && g.satilabilirMallar.has("ekmek") && g.satilabilirMallar.has("un")).toBe(true);
    expect(g.dukkanlar).toHaveLength(1);
    const d = g.dukkanlar[0]!;
    expect(d.id).toBe(e.id);
    expect(d.tur).toBe("bakkal");
    expect(d.durum).toBe("acik");
    expect(d.markaAd).toBe("ali market");
    expect(d.simge).toBe(3);
    expect(d.renk).toBe(5);
    expect(d.yuvalar).toHaveLength(e.dukkan!.raf.length);
    const [y0, y1, y2] = d.yuvalar;
    expect(y0!.mal).toBe("gida");
    expect(y1!.mal).toBe("ekmek");
    expect(y1!.kademe).toBe(3);
    expect(y1!.fiyatT).toBe(5 * SAAT);
    expect(y1!.beklemeSaat).toBe(Math.max(0, Math.ceil((5 * SAAT + enAz * SAAT - k.t) / SAAT)));
    expect(y2!.mal).toBeNull();
    expect(y2!.fiyatT).toBe(11 * SAAT); // boş yuvada da
    expect(y2!.beklemeSaat).toBe(Math.max(0, Math.ceil((11 * SAAT + enAz * SAAT - k.t) / SAAT)));
    expect(y2!.beklemeSaat).toBeGreaterThan(0);
    expect(y2!.netMiliSaat).toBe(0);
    expect(y0!.beklemeSaat).toBe(0); // fiyatT hiç yazılmamış
    expect(d.kampanya).toEqual({ bitis: 0, kalanSaat: expect.any(Number), kalanGun: expect.any(Number) });
    expect(d.giderMiliSa).toBe(param.perakende!.olcekler[0]!.giderMiliSaat);
  });

  it("ham kare demetleriyle birebir tutarlılık: istek, mevcut -> stokVar, etkin kademe, fiyat = R x etkin kademe, net ve gelir §6.8b'den", () => {
    const { s, e } = kur();
    const k = kare(s, "a");
    const param = paramOku(s);
    const ref = referansOku(s, k);
    const sonuc = dukkanGorunumuKur({ kare: k, param, referans: ref, kurmaKarsilaniyor: false })!;
    const ham = k.bolgeler.flatMap((b) => b.ozel?.dukkanlar ?? []).find((x) => x[0] === e.id)!;
    const d = sonuc.gorunum.dukkanlar[0]!;
    let gelir = 0;
    const netler: number[] = [];
    ham[1].forEach((r, i) => {
      const y = d.yuvalar[i]!;
      expect(y.istekMiliSaat).toBe(r[4]);
      expect(y.stokVar).toBe(r[3] === 1);
      expect(y.etkinKademe).toBe(r[2]);
      const R = r[0] === "" ? 0 : ref(r[0])!.mili;
      expect(y.fiyatMili).toBe(Math.floor((R * param.perakende!.fiyatKademeleriPpm[r[2]]!) / PPM));
      const m = yuvaMili({ dolu: r[0] !== "", mevcut: r[3] === 1, istekMiliSaat: r[4], etkinKademe: r[2], referansMili: R }, ham[4], param.perakende!.fiyatKademeleriPpm, param.pazar);
      expect(y.netMiliSaat).toBe(m.netMiliSaat);
      gelir += m.gelirMiliSaat;
      netler.push(m.netMiliSaat);
    });
    expect(d.gelirMiliSa).toBe(gelir);
    expect(d.kasaPpm).toBe(ham[2]);
    expect(d.karsilanmaPpm).toBe(ham[4]);
    expect(sonuc.dukkanNetMili[e.id]).toBe(dukkanNetMili(netler, param.perakende!.olcekler[0]!.giderMiliSaat));
    expect(d.netMiliSa).toBe(sonuc.dukkanNetMili[e.id]); // kartta gösterilen net = köprünün fırsat maliyetli dükkân neti (gelir - gider değil)
    ham[1].forEach((r, i) => expect(d.yuvalar[i]!.satisMiliSaat).toBe(r[3] === 1 && r[0] !== "" ? Math.floor((r[4] * ham[4]) / PPM) : 0)); // satış = istek x karşılanma
    expect(sonuc.yaklasik).toBe(false);
    expect(sonuc.gorunum.kurmaKarsilaniyor).toBe(false);
  });

  it("referans fiyat bilinmiyorsa net 0 ve 'yaklaşık' işareti; başkası/izleyici karesi: dükkân yok / null", () => {
    const { s } = kur();
    const k = kare(s, "a");
    const bilinmez = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: () => undefined, kurmaKarsilaniyor: true })!;
    expect(bilinmez.yaklasik).toBe(true);
    expect(bilinmez.gorunum.dukkanlar[0]!.yuvalar.every((y) => y.netMiliSaat === 0 && y.fiyatMili === 0)).toBe(true);
    const taban = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: () => ({ mili: 100_000, yaklasik: true }), kurmaKarsilaniyor: true })!;
    expect(taban.yaklasik).toBe(true);
    const b = dukkanGorunumuKur({ kare: kare(s, "b"), param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    expect(b.gorunum.dukkanlar).toEqual([]); // b'nin dükkânı yok; a'nın dükkânı b'ye gelmez (ozel yalnız sahibine)
    expect(dukkanGorunumuKur({ kare: kare(s, null), param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })).toBeNull(); // oyuncu karesi yok
    expect(dukkanGorunumuKur({ kare: null, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })).toBeNull();
  });

  it("ilceler[].talep taşınır (yalnız isteyenin dükkân mallarında); dükkân yoksa boş", () => {
    const { s } = kur();
    const k = kare(s, "a");
    const sonuc = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    const beklenen = (k.ilceler ?? []).flatMap((c) => (c.talep ?? []).map(([mal, q]) => ({ ilce: c.id, mal, qMiliSaat: q })));
    expect(sonuc.talep).toEqual(beklenen);
    expect(beklenen.length).toBeGreaterThan(0);
    const bos = dukkanGorunumuKur({ kare: kare(s, "b"), param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    expect(bos.talep).toEqual([]);
  });

  it("süren dükkân inşaatı (oyuncu.insaatlar, ekYapi 'dukkan'): durum insaat, bitis, id = -inşaat kimliği; TÜR TAHMİN EDİLMEZ (null); dükkân olmayan inşaat sayılmaz; hücre karede yoksa ilçe/hücre boş", () => {
    const s = dunya();
    const k = kare(s, "a");
    k.oyuncu!.insaatlar.push([42, "tesis", 0, 3, 99 * SAAT, 12 * SAAT, "dukkan"], [43, "tesis", 0, 1, 50 * SAAT, 12 * SAAT]);
    const sonuc = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    expect(sonuc.gorunum.dukkanlar).toHaveLength(1);
    expect(sonuc.gorunum.dukkanlar[0]).toMatchObject({ id: -42, durum: "insaat", bitis: 99 * SAAT, yuvalar: [], tur: null, hucreler: [] });
    expect(sonuc.gorunum.dukkanlar[0]).not.toHaveProperty("ilce");
  });

  it("hücre ve ilçe: süren inşaat hücresi (`insaat` = inşaat kimliği) ve biten dükkân hücresi (`tesis` = ek yapı kimliği) ilçeler[].hucreler'den bulunur; başka türdeki hücre sayılmaz", () => {
    const s = dunya();
    const e = dukkanEkle(s, "a", [{ mal: "gida" }]);
    const hid = e.hucreler[0]!;
    const h = s.dunya.mulk!.hucreler.find((x) => x.id === hid)!;
    h.tesis = e.id; // `ekYapiTamamla`: h.tesis = ek yapı kimliği
    const k = kare(s, "a");
    const ilce = (k.ilceler ?? []).find((c) => c.hucreler.some((x) => x[0] === hid))!;
    // Süren inşaat hücreleri (sentetik): iki hücre, aynı ilçe; bir de başka türde hücre (sayılmaz).
    ilce.hucreler.push(["900:1", "a", "kirsal", -1, 42, "dukkan", 0], ["901:1", "a", "kirsal", -1, 42, "dukkan", 0], ["902:1", "a", "kirsal", -1, 77, "ciftlik", 0]);
    k.oyuncu!.insaatlar.push([42, "tesis", 0, 3, 99 * SAAT, 12 * SAAT, "dukkan"]);
    const sonuc = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    const [acik, insaat] = sonuc.gorunum.dukkanlar;
    expect(acik).toMatchObject({ id: e.id, durum: "acik", tur: "bakkal", hucreler: [hid], ilce: ilce.id });
    expect(insaat).toMatchObject({ id: -42, durum: "insaat", tur: null, hucreler: ["900:1", "901:1"], ilce: ilce.id });
  });

  it("tabelada tanımsız tür (tanınmayan dize) de null: tahmin yok", () => {
    const s = dunya();
    const e = dukkanEkle(s, "a", [{ mal: "gida" }], "bakkal");
    const k = kare(s, "a");
    for (const b of k.bolgeler) for (const x of b.genel.dukkanlar ?? []) if (x[0] === e.id) x[1] = "bilinmeyen_tur";
    const sonuc = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    expect(sonuc.gorunum.dukkanlar[0]!.tur).toBeNull();
  });

  it("dükkân kuralı kapalı (perakende bloğu yok): kapali true, liste boş, null değil; kare ESKİ KARE ile aynı (dükkân alanı yok)", () => {
    const s = dunya(false);
    const k = kare(s, "a");
    expect(JSON.stringify(k)).not.toMatch(/dukkanlar|markalar|ilkSatisT/);
    const sonuc = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: false })!;
    expect(paramOku(s).perakende).toBeNull();
    expect(sonuc.gorunum).toMatchObject({ kapali: true, dukkanlar: [], markalar: [], ilkSatisT: null, kampanyaAcik: false });
  });

  it("kampanya kuralı: kademe/gün/hafta sınırlarından biri 0 ya da kademe yoksa kampanyaAcik false", () => {
    const { s } = kur();
    const k = kare(s, "a");
    const pk = paramOku(s).perakende!;
    const ac = (p: Partial<typeof pk>) => dukkanGorunumuKur({ kare: k, param: { perakende: { ...pk, ...p }, pazar: s.ic.param.pazar }, referans: referansOku(s, k), kurmaKarsilaniyor: true })!.gorunum.kampanyaAcik;
    expect(ac({})).toBe(true);
    expect(ac({ kampanyaGunlukEnFazlaSaat: 0 })).toBe(false);
    expect(ac({ kampanyaHaftalikEnFazlaGun: 0 })).toBe(false);
    const { kampanyaKademesi: _k, ...yok } = pk;
    expect(dukkanGorunumuKur({ kare: k, param: { perakende: yok, pazar: s.ic.param.pazar }, referans: referansOku(s, k), kurmaKarsilaniyor: true })!.gorunum.kampanyaAcik).toBe(false);
  });
});

// --- G7 komut kurucuları ------------------------------------------------------------------------------------------------------------------------------------------------------

describe("G7 komut kurucuları: protokol şemasından geçer ve çekirdek kabul eder", () => {
  it("şema: dukkan_raf (mal / null), dukkan_fiyat, marka_tanimla (ad kırpılır), dükkân kurulumu (yapi_yerlestir tek sınıf / çok sınıf / ölçek, tesis_insa_hucre)", () => {
    const komutlar = [
      rafKomutu(7, 0, "gida"),
      rafKomutu(7, 3, null),
      fiyatKomutu(7, 1, 3),
      markaKomutu(0, "  ali market ", 3, 5),
      dukkanKurKomutu({ ilce: "sn_m_ova_merkez", hucreler: ["4:7"], sinif: "kirsal", dukkanTuru: "bakkal" }),
      dukkanKurKomutu({ ilce: "sn_m_ova_merkez", hucreler: ["4:7", "5:7"], sinif: "kirsal", siniflar: ["kirsal", "kasaba"], olcek: 0, dukkanTuru: "firin" }),
      dukkanKurArsasizKomutu({ ilce: "sn_m_ova_merkez", hucreler: ["4:7"], dukkanTuru: "bakkal", olcek: 0 }),
    ];
    for (const k of komutlar) {
      const r = KomutSemasi.safeParse(k);
      expect(r.success, JSON.stringify(k)).toBe(true);
      expect(r.success && r.data).toEqual(k); // şema hiçbir alanı atmadı: kurucu çıktısı tam
    }
    expect(komutlar[3]).toMatchObject({ ad: "ali market" });
    expect(komutlar[4]).toMatchObject({ tur: "yapi_yerlestir", tesisTuru: "dukkan", dukkanTuru: "bakkal" });
    expect(komutlar[4]).not.toHaveProperty("siniflar");
    expect(komutlar[6]).toMatchObject({ tur: "tesis_insa_hucre", tesisTuru: "dukkan" });
  });

  it("tamsayı olmayan indeks/kimlik kurucuda reddedilir (RangeError); ad uzunluğu şemada (2..24) reddedilir", () => {
    expect(() => rafKomutu(1.5, 0, "gida")).toThrow(RangeError);
    expect(() => rafKomutu(1, Number.NaN, null)).toThrow(RangeError);
    expect(() => fiyatKomutu(1, 0, 2.2)).toThrow(RangeError);
    expect(() => markaKomutu(0, "ab", Number.POSITIVE_INFINITY, 1)).toThrow(RangeError);
    expect(KomutSemasi.safeParse(markaKomutu(0, "a", 1, 1)).success).toBe(false);
    expect(KomutSemasi.safeParse(markaKomutu(0, "x".repeat(25), 1, 1)).success).toBe(false);
  });

  it("çekirdek kabul eder: dukkan_raf (boş yuvaya mal), marka_tanimla, dukkan_marka sonrası kare; yuvayı boşaltınca fiyatT korunur ve köprü beklemeyi gösterir", () => {
    const s = dunya();
    const e = dukkanEkle(s, "a", [{ mal: "gida" }, {}]);
    const uygula = (komut: Parameters<Simulasyon["uygula"]>[0]["komut"]) => s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut });
    expect(uygula(markaKomutu(0, "ali market", 3, 5)).tamam).toBe(true);
    const r1 = uygula(rafKomutu(e.id, 1, "ekmek"));
    expect(r1.tamam, JSON.stringify(r1)).toBe(true);
    const bos = uygula(rafKomutu(e.id, 0, null));
    expect(bos.tamam, JSON.stringify(bos)).toBe(true);
    const k = kare(s, "a");
    const sonuc = dukkanGorunumuKur({ kare: k, param: paramOku(s), referans: referansOku(s, k), kurmaKarsilaniyor: true })!;
    expect(sonuc.gorunum.markalar).toEqual([["ali market", 3, 5]]);
    const [y0, y1] = sonuc.gorunum.dukkanlar[0]!.yuvalar;
    expect(y0!.mal).toBeNull();
    expect(y1!.mal).toBe("ekmek");
    expect(y0!.beklemeSaat + y1!.beklemeSaat).toBeGreaterThanOrEqual(0);
  });
});
