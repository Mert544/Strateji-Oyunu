/**
 * "Pazar'da sat" (alfa-0 ilk saat; A1 T-1): mülk kipinde LİMAN OLMAYAN işletme düğümünde çiftliğin tahılı `ticaret_emri` (ihracat) ile yerel NPC pazarına satılır (çekirdek `ekonomi/komut.ts`:
 * liman şartı yalnız bölge kipindedir), hazine artar, gerçek WebSocket yolunda Esnaf Defteri `ilk_satis` ödülü verilir. Karşıt kanıt: aynı emir bölge kipinde limansız bölgede reddedilir
 * ("bolge liman degil"); emirsiz oyuncu ilk_satis kazanmaz ve hazinesi artmaz. Gerçek sunucu, gerçek WebSocket, elle saat.
 */
import { afterEach, describe, expect, it } from "vitest";
import { PPM, SAAT, SISTEM_OYUNCUSU, anlikHazine, odulDegeri } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { SunucuMesajiSemasi } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { ElleSaat } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { pazarTablosu } from "../../cekirdek/src/pazar";
import { SIR, bitisikSatilabilir, mulkVerisi, token, veri } from "./yardimci";

/** Ova: LİMAN DEĞİL (mülk işletme düğümü merkez bölgenin etiketlerini devralır). Liman: limanlı il (liman primi uygulanır). */
const OVA = { ilce: "sn_m_ova_merkez", dugum: "sn_m_ova#ali" };
const LIMAN = {
  ilce: "sn_m_liman_merkez",
  dugum: "sn_m_liman#ali",
  /** Mini haritada liman tanımı yok (prim 0): gerçek İzmit Körfezi (Gebze/Kocaeli) ile aynı prim için dünya kapısına 13 saat: min(%15, 13 x %0,25) = %3,25 (gercek-karadeniz `izmit` = 32 500 ppm). */
  veri: (v: ReturnType<typeof mulkVerisi>): void => {
    const b = v.harita.bolgeler.find((x) => x.id === "m_liman")!;
    b.liman = { dunyaKapisi: false, dunyaMesafeSaat: 13, kapasiteSinifi: 2 };
  },
};
type Yer = { ilce: string; dugum: string; veri?: (v: ReturnType<typeof mulkVerisi>) => void };

let sunucu: CalisanSunucu | null = null;
const istemciler: SunucuIstemcisi[] = [];
afterEach(async () => {
  for (const i of istemciler.splice(0)) await i.kapat();
  await sunucu?.kapat();
  sunucu = null;
});

async function kur(ilce: string, duzenle?: (v: ReturnType<typeof mulkVerisi>) => void): Promise<{ y: DunyaYazari; saat: ElleSaat; ali: SunucuIstemcisi; depo: ReturnType<typeof bellekDeposu> }> {
  const v = mulkVerisi();
  duzenle?.(v);
  const depo = bellekDeposu();
  const saat = new ElleSaat();
  const y = await DunyaYazari.ac({ veri: v, tohum: 4, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
  sunucu = await sunucuBaslat({ yazar: y, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
  const url = `ws://127.0.0.1:${sunucu.port}`;
  const yonetici = await SunucuIstemcisi.baglan(url, token(SISTEM_OYUNCUSU), "yon");
  istemciler.push(yonetici);
  const k = await yonetici.komut("k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce } as Komut);
  expect(k.tur === "komutSonucu" && k.sonuc.tamam).toBe(true);
  const ali = await SunucuIstemcisi.baglan(url, token("ali"), "ali-ist");
  istemciler.push(ali);
  return { y, saat, ali, depo };
}

async function saatIlerlet(y: DunyaYazari, saat: ElleSaat, adet: number): Promise<void> {
  for (let i = 0; i < adet; i++) {
    saat.ilerlet(saat.simdi() + SAAT);
    await y.birTur();
  }
}

async function komut(ali: SunucuIstemcisi, anahtar: string, k: Komut) {
  const r = await ali.komut(anahtar, k);
  if (r.tur !== "komutSonucu") throw new Error(`komut sonucu yok (${anahtar}): ${JSON.stringify(r)}`);
  return r.sonuc;
}

/** Çiftlik kurar (parsel + inşaat), biter. */
async function ciftlikKur(y: DunyaYazari, saat: ElleSaat, ali: SunucuIstemcisi, ilce: string): Promise<void> {
  await saatIlerlet(y, saat, 1);
  const hucreler = bitisikSatilabilir(y.sim, ilce);
  expect(await komut(ali, "p1", { tur: "parsel_al", ilce, hucreler: [...hucreler], sinif: "kirsal" })).toEqual({ tamam: true });
  expect(await komut(ali, "i1", { tur: "tesis_insa_hucre", ilce, tesisTuru: "ciftlik", hucreler: [...hucreler] })).toEqual({ tamam: true });
  await saatIlerlet(y, saat, 3); // çiftlik biter ve tahıl üretir
}

const satEmri = (dugum: string, oranSaat: number, mal = "tahil"): Komut => ({ tur: "ticaret_emri", bolge: dugum, mal, yon: "ihracat", oranSaat });

async function defterKavramlari(ali: SunucuIstemcisi): Promise<{ kazanilan: string[]; odulMili: number }> {
  ali.gonder({ tur: "defterIste", istek: 7 });
  const m = await ali.bekle((x) => x.tur === "defter");
  expect(SunucuMesajiSemasi.safeParse(m).success).toBe(true);
  if (m.tur !== "defter") throw new Error("defter bekleniyordu");
  return { kazanilan: m.kazanilan.filter((k) => k.tur === "odul").map((k) => k.kavram), odulMili: m.toplamOdulMili };
}

async function kapat(): Promise<void> {
  for (const i of istemciler.splice(0)) await i.kapat();
  await sunucu?.kapat();
  sunucu = null;
}

interface Kosu {
  hazine: number;
  ihracatOrani: number;
  kazanilan: string[];
  odulSatiri: number;
  limanli: boolean;
  emirSonucu: unknown;
  /** Emrin verildiği sim anı, ilk gerçekleştiği an (tahıl emri gerceklesenSaat > 0) ve ilk_satis ödülünün günlüğe girdiği an. */
  emirT: number;
  ilkGerceklesmeT: number | null;
  odulT: number | null;
  /** Gerçekleşen emir (mili-birim/sa), dünya referans fiyatı (mili-₺/birim) ve ihracat net çarpanı (ppm; gelir / (gerçekleşen x fiyat)). */
  gerceklesen: number;
  fiyat: number;
  netPpm: number;
  /** Düğümün liman primi (ppm; limansızda 0). */
  primPpm: number;
  /** Defter toplam ödülü (Defter okuması), kazanılan kavramların tablo değerleri toplamı (`odulDegeri`) ve `ilk_satis` ödülünün tablo değeri (hepsi mili-para). */
  odulMili: number;
  kazanilanDegerMili: number;
  ilkSatisOdulMili: number;
}

/** Aynı dünya, aynı süre: `emir` verilirse tahıl ihracat emri (saatte 100 birim) çiftlik bittikten sonra verilir; 10 dakikalık adımlarla 6 saat işler (gerçekleşme ve ödül anları ölçülür). */
async function kos(emir: boolean, yer: Yer = OVA, mal = "tahil"): Promise<Kosu> {
  const { y, saat, ali, depo } = await kur(yer.ilce, yer.veri);
  if (mal === "tahil") await ciftlikKur(y, saat, ali, yer.ilce);
  else {
    // Başlangıç kitindeki mal (çelik) satılır: çiftlik kurulamayan (ova etiketsiz) limanlı ilde de aynı koşu; yalnız parsel (işletme düğümü doğar)
    await saatIlerlet(y, saat, 1);
    expect(await komut(ali, "p1", { tur: "parsel_al", ilce: yer.ilce, hucreler: [...bitisikSatilabilir(y.sim, yer.ilce)], sinif: "kirsal" })).toEqual({ tamam: true });
    await saatIlerlet(y, saat, 3);
  }
  const dugum = y.sim.dunya.bolgeler.find((b) => b.id === yer.dugum)!;
  const limanli = dugum.etiketler.includes("liman");
  const emirT = saat.simdi() + 25 * 60_000; // saat sınırının ORTASINDA ver (tık hemen gerçekleştirmesin)
  saat.ilerlet(emirT);
  await y.birTur();
  const emirSonucu = emir ? await komut(ali, "t1", satEmri(yer.dugum, mal === "tahil" ? 100_000 : 10_000, mal)) : null;
  let ilkGerceklesmeT: number | null = null;
  for (let i = 0; i < 36; i++) {
    saat.ilerlet(saat.simdi() + 10 * 60_000);
    await y.birTur();
    const e = y.sim.dunya.bolgeler.find((b) => b.id === yer.dugum)?.ticaretEmirleri[0];
    if (ilkGerceklesmeT === null && e !== undefined && e.gerceklesenSaat > 0) ilkGerceklesmeT = y.sim.dunya.zaman;
  }
  const mo = y.sim.dunya.mulk?.oyuncular.find((x) => x.id === "ali");
  const d = await defterKavramlari(ali);
  const odul = (await depo.gunluk.oku(0)).filter((g) => g.oyuncu === SISTEM_OYUNCUSU && g.anahtar === "odul:ali:ilk_satis");
  const mi = y.sim.ic.malIndeks[mal]!;
  const e = y.sim.dunya.bolgeler.find((b) => b.id === yer.dugum)?.ticaretEmirleri[0];
  const fiyat = y.sim.dunya.pazar.fiyat[mi] as number;
  const gerceklesen = e?.gerceklesenSaat ?? 0;
  const ihracat = mo?.paraAkisi?.ihracat ?? 0;
  const prim = pazarTablosu(y.sim.ic)?.limanPrimPpm[dugum.merkez as number] ?? 0;
  const sonuc: Kosu = {
    hazine: anlikHazine(y.sim.dunya, "ali"),
    ihracatOrani: ihracat,
    kazanilan: d.kazanilan,
    odulSatiri: odul.length,
    limanli,
    emirSonucu,
    emirT,
    ilkGerceklesmeT,
    odulT: odul[0]?.t ?? null,
    gerceklesen,
    fiyat,
    netPpm: gerceklesen > 0 ? Math.floor((ihracat * 1000 * PPM) / (gerceklesen * fiyat)) : 0,
    primPpm: limanli ? prim : 0,
    odulMili: d.odulMili,
    kazanilanDegerMili: d.kazanilan.reduce((t, kv) => t + (odulDegeri(y.sim.ic, kv) ?? 0), 0),
    ilkSatisOdulMili: odulDegeri(y.sim.ic, "ilk_satis") ?? 0,
  };
  await kapat();
  return sonuc;
}

describe("Pazar'da sat: mülk kipinde limansız düğümde tahıl satışı (gerçek sunucu, ws)", () => {
  it("ticaret_emri (ihracat) KABUL edilir, hazine emirsiz koşudan YÜKSEK, ilk_satis ödülü günlüğe girer ve Defter'de görünür; emirsiz koşuda ilk_satis YOK", async () => {
    const e = await kos(true);
    const k = await kos(false); // karşıt kanıt: aynı dünya, aynı süre, emir yok
    expect(e.limanli).toBe(false); // düğüm limansız: şart aranmıyor
    expect(e.emirSonucu).toEqual({ tamam: true });
    expect(e.ihracatOrani).toBeGreaterThan(0);
    expect(k.ihracatOrani).toBe(0);
    expect(e.hazine).toBeGreaterThan(k.hazine);
    expect(e.kazanilan).toContain("ilk_satis");
    expect(e.odulSatiri).toBe(1);
    expect(k.kazanilan).not.toContain("ilk_satis");
    expect(k.odulSatiri).toBe(0);
    // ilk_satis ödülünün TUTARI: tablo değeri (odul.kavramlar.ilk_satis) pozitif; Defter toplamı kazanılan kavramların tablo değerleri toplamıdır; emirli ve emirsiz koşunun farkı tam ilk_satis ödülüdür
    expect(e.ilkSatisOdulMili).toBeGreaterThan(0);
    expect(e.odulMili).toBe(e.kazanilanDegerMili);
    expect(e.odulMili - k.odulMili).toBe(e.ilkSatisOdulMili);
  }, 120_000);

  it("SAAT SINIRI: emir saat ortasında verilir; ilk gerçekleşme bir sonraki TAM sim-saatinde (saatlik tık), ilk_satis ödülü de saat sınırında ve gerçekleşmeden sonra; UI sayacı (kalan = bir sonraki tam saate) bununla örtüşür", async () => {
    const e = await kos(true);
    const sonraki = (Math.floor(e.emirT / SAAT) + 1) * SAAT;
    expect(e.emirT % SAAT).toBeGreaterThan(0);
    expect(e.ilkGerceklesmeT).not.toBeNull();
    // 10 dk adımlarla gözlenir: ilk görülen an sınırdan SONRAKİ ilk adımdır (bir önceki adımda gerçekleşme yoktu: emir sınırdan önce gerçekleşmez)
    expect(e.ilkGerceklesmeT!).toBeGreaterThanOrEqual(sonraki);
    expect(e.ilkGerceklesmeT!).toBeLessThan(sonraki + 10 * 60_000);
    expect(e.odulT).not.toBeNull();
    expect(e.odulT! % SAAT).toBe(0);
    expect(e.odulT).toBe(sonraki + SAAT); // brutIhracat tembel (toplam + oran x dt) gerçekleşme anında 0: ödül BİR sonraki sınırda
    expect(e.odulT! - e.emirT).toBeLessThanOrEqual(2 * SAAT);
  }, 120_000);

  it("LİMAN PRİMİ: limanlı düğümde ihracat net çarpanı = 0,90 x (1 - prim) (kalkanda komisyon yok), limansızda 0,90; limanlı net DAHA DÜŞÜK; ret yok, emir her ikisinde kabul", async () => {
    const o = await kos(true, OVA, "celik"); // aynı mal (başlangıç kiti çeliği) iki ilde
    const l = await kos(true, LIMAN, "celik");
    expect(o.limanli).toBe(false);
    expect(l.limanli).toBe(true);
    expect(o.emirSonucu).toEqual({ tamam: true });
    expect(l.emirSonucu, JSON.stringify(l.emirSonucu)).toEqual({ tamam: true });
    expect(l.primPpm).toBeGreaterThan(0);
    expect(o.netPpm).toBeGreaterThanOrEqual(899_000); // 0,90 (yuvarlama payı)
    expect(o.netPpm).toBeLessThanOrEqual(900_000);
    const beklenen = Math.floor((900_000 * (PPM - l.primPpm)) / PPM);
    expect(Math.abs(l.netPpm - beklenen)).toBeLessThanOrEqual(1_000);
    expect(l.netPpm).toBeLessThan(o.netPpm);
  }, 180_000);

  it("bölge kipi: aynı emir limansız bölgede REDDEDİLİR (liman şartı bölge kipinde kalır)", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: veri(), tohum: 4, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, odul: true });
    sunucu = await sunucuBaslat({ yazar: y, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
    const url = `ws://127.0.0.1:${sunucu.port}`;
    const yonetici = await SunucuIstemcisi.baglan(url, token(SISTEM_OYUNCUSU), "yon");
    istemciler.push(yonetici);
    await yonetici.komut("k", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: ["m_ova", "m_liman"] });
    const ali = await SunucuIstemcisi.baglan(url, token("ali"), "ali-ist");
    istemciler.push(ali);
    const r = await komut(ali, "t", { tur: "ticaret_emri", bolge: "m_ova", mal: "tahil", yon: "ihracat", oranSaat: 100_000 });
    expect(r).toEqual({ tamam: false, hata: "bolge liman degil: m_ova" });
    expect(await komut(ali, "t2", { tur: "ticaret_emri", bolge: "m_liman", mal: "tahil", yon: "ihracat", oranSaat: 100_000 })).toEqual({ tamam: true }); // limanda geçer
  });
});
