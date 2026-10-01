/**
 * WebSocket bağdaştırıcısı (F4) GERÇEK sunucuya karşı: el sıkışma, abone/kare/delta, komut + idempotans, hazine formülü,
 * zaman eşitleme, yeniden bağlanma, bilinmeyen ilçe, komut zinciri (ilk başarısızlıkta durur).
 * Sunucu: packages/sunucu (bellek deposu, elle saat, mini-6 parsel fikstürü). Node 22'nin yerleşik WebSocket'i.
 */
import { afterEach, describe, expect, it } from "vitest";
import { parselFiksturuYukle } from "@bolge/veri";
import { mulkOyuncuBul, SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { kamuKumesi, katil, mulkVerisi, testSunucusu, token } from "../../sunucu/test/yardimci";
import type { TestSunucusu } from "../../sunucu/test/yardimci";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import type { MulkBaglantisi, TesisKomutu } from "../src/harita/baglanti";
import { yerlesimiUygula } from "../src/harita/zincir";
import type { YapiTanimi, YerlesimPlani } from "../src/harita/yapi";

const ILCE = "sn_m_ova_merkez";
const fiks = parselFiksturuYukle("mini-6").ilceler.find((c) => c.id === ILCE)!;
/** Uygun, kırsal, kamu dışı (satılabilir) ve yatay komşusu da öyle olan hücre çiftleri; kamu kümesi çekirdek API'sinden. */
let CIFT_A: string[] = [];
let CIFT_B: string[] = [];
/** İlçenin satılabilir hücre sayısı (kamu düşülmüş). */
let SATILABILIR = 0;
function ciftleriSec(): void {
  const kamu = kamuKumesi(ts!.yazar.sim, ILCE);
  const uygun = new Set(fiks.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamu.has(h.id)).map((h) => h.id));
  const satirlar: string[][] = [];
  for (const h of fiks.hucreler) {
    const [x, y] = h.id.split(":").map(Number) as [number, number];
    if (uygun.has(h.id) && uygun.has(`${x + 1}:${y}`)) satirlar.push([h.id, `${x + 1}:${y}`]);
  }
  CIFT_A = satirlar[0]!;
  CIFT_B = satirlar[20]!;
  SATILABILIR = fiks.uygunHucre - kamu.size;
}

let ts: TestSunucusu | null = null;
const acilanlar: WsBaglanti[] = [];
afterEach(async () => {
  for (const b of acilanlar.splice(0)) b.kapat();
  await ts?.kapat();
  ts = null;
});

async function ac(oyuncu: string, ek: Partial<ConstructorParameters<typeof Object>[0]> = {}): Promise<WsBaglanti> {
  const b = await WsBaglanti.ac({ url: ts!.url, token: token(oyuncu), istemciKimligi: `t-${oyuncu}`, geriCekilmeMs: { ilk: 30, en: 100 }, ...ek });
  acilanlar.push(b);
  return b;
}

async function bekle(kosul: () => boolean, ms = 8000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("koşul zamanında sağlanmadı");
    await new Promise((c) => setTimeout(c, 10));
  }
}

/** Yurtsuz yeni oyuncu (çekirdekteki "bedava yurt" kapalı): testler sahipliği sıfırdan sayar. */
function yurtsuzVeri(): ReturnType<typeof mulkVerisi> {
  const v = mulkVerisi();
  v.param.mulk!.yeniOyuncu.yurtHucre = 0;
  return v;
}

async function hazirla(): Promise<void> {
  ts = await testSunucusu({ veri: yurtsuzVeri() });
  ciftleriSec();
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(y, "ali", []);
  await katil(y, "veli", []);
  await y.zamanIlerlet(SAAT);
}

describe("WsBaglanti: gerçek sunucu", () => {
  it("katılım protokolün katil mesajıyla ve seçilen ilçeyle (ayrılmış hak yalnız katılım ilçesinde); hosgeldin epoch'u okunur", async () => {
    ts = await testSunucusu({ veri: yurtsuzVeri() });
    const b = await ac("ayse");
    expect(b.ozet()).toBeNull();
    expect(await b.katil("")).toMatchObject({ tamam: false });
    expect(b.sonKatil).toBeNull();
    const r = await b.katil(ILCE);
    expect(r).toEqual({ tamam: true });
    expect(b.sonKatil?.ilce).toBe(ILCE);
    expect(mulkOyuncuBul(ts.yazar.sim.dunya, "ayse")?.katilimIlcesi).toBe(ILCE);
    await bekle(() => b.isletme() !== null);
    expect(b.isletme()?.katilimIlcesi).toBe(ILCE);
    const e = b.dunyaEpochMs();
    expect(e === null || Number.isSafeInteger(e)).toBe(true);
  });

  it("el sıkışma, ilçe aboneliği, hazine formülü; parsel_al ve tesis_insa_hucre; iki istemci aynı kareyi görür", async () => {
    await hazirla();
    const a = await ac("ali");
    const v = await ac("veli");
    expect(a.ben).toEqual({ id: "ali", ad: "ali" });
    expect(a.tesisTurleri).toContain("ciftlik");
    const sa = await a.sahiplikAl(ILCE);
    expect(sa).not.toBeNull();
    expect(sa!.uygun).toBe(SATILABILIR);
    expect(sa!.hucreler.size).toBe(0);
    await v.sahiplikAl(ILCE);

    // Hazine sunucudakiyle bit bit aynı (hibe 50.000 ₺); zaman eşitlendi (elle saat: hız 0, sim = 1 saat)
    await bekle(() => a.ozet() !== null);
    expect(a.hiz).toBe(0);
    expect(a.ozet()!.simZamani).toBe(SAAT);
    expect(a.ozet()!.hazineMili).toBe(50_000_000);

    let degisim = 0;
    const birak = v.dinle(() => degisim++);
    const p = await a.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: CIFT_A, sinif: "kirsal" });
    expect(p.tamam).toBe(true);
    if (p.tamam) expect(p.toplamMili).toBeGreaterThan(2_000_000);
    await bekle(() => a.ozet()!.ilceHucre.length === 1);
    expect(a.ozet()!.ilceHucre).toEqual([[ILCE, 2]]);
    expect(a.ozet()!.hazineMili).toBeLessThan(50_000_000);

    // İkinci istemci (başkası) sahipliği delta ile görür; kendi özeti bunu içermez
    await bekle(() => degisim > 0);
    const sv = await v.sahiplikAl(ILCE);
    expect(sv!.hucreler.get(CIFT_A[0]!)).toMatchObject({ sahip: "ali", sinif: "kirsal" });
    expect(sv!.satilmis).toBe(2);
    expect(v.ozet()!.ilceHucre).toEqual([]);
    birak();

    // Aynı hücreyi veli alamaz: Türkçe neden
    const red = await v.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: [CIFT_A[0]!], sinif: "kirsal" });
    expect(red).toMatchObject({ tamam: false, hata: "sunucu", mesaj: "Bir hücre az önce ali tarafından alındı.", hucre: CIFT_A[0] });

    // Yapı: çiftlik 2 hücre
    const insa: TesisKomutu = { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: CIFT_A };
    const r = await a.tesisInsa(insa);
    expect(r.tamam).toBe(true);
    await bekle(() => a.ozet()!.surenInsaat === 1);
    const s2 = await a.sahiplikAl(ILCE);
    expect(s2!.yapilar).toHaveLength(1);
    expect(s2!.yapilar![0]).toMatchObject({ durum: "insaat", sahip: "ali", tur: "ciftlik", hucreler: [...CIFT_A].sort() });
    expect(s2!.yapilar![0]!.bitis).toBeGreaterThan(SAAT);
    expect(s2!.yapilar![0]!.baslangic).toBe(SAAT); // bu oturumda başlatıldı: komut sonucunun t'si
    expect(s2!.hucreler.get(CIFT_A[0]!)!.insaat).toBeGreaterThanOrEqual(0);
    // Başkasının gözünde: inşaat var ama türü bilinmez
    await bekle(() => v.kare?.ilceler?.[0]?.hucreler.every((h) => h[4] >= 0) === true);
    const sv2 = await v.sahiplikAl(ILCE);
    expect(sv2!.yapilar![0]).toMatchObject({ durum: "insaat", sahip: "ali" });
    expect(sv2!.yapilar![0]!.tur).toBeUndefined();
    expect(v.ozet()!.surenInsaat).toBe(0);

    // İnşaat biter (yönetici zamanı ilerletir): tesise döner, sahibinde tür kalır
    const y = ts!.istemciler[0]!;
    await y.zamanIlerlet(SAAT + 5 * SAAT);
    await bekle(() => a.ozet()!.surenInsaat === 0);
    await bekle(() => a.ozet()!.simZamani >= 6 * SAAT);
    const s3 = await a.sahiplikAl(ILCE);
    expect(s3!.yapilar![0]).toMatchObject({ durum: "tesis", tur: "ciftlik" });
    expect(a.sunucuHatalari).toEqual([]);
    expect(v.sunucuHatalari).toEqual([]);
  });

  it("atomik yerleşim (yapi_yerlestir) tek komutla; başarısızsa hiçbir şey değişmez; geri al (insaat_iptal + parsel_birak)", async () => {
    await hazirla();
    const a = await ac("ali");
    await a.sahiplikAl(ILCE);
    // Protokol paketi komutu tanıyorsa sunucu da tanır (aynı depo, aynı şema)
    expect(a.atomikYerlestirme()).toBe(true);
    const seq0 = ts!.yazar.seq;
    const r = await a.yapiYerlestir({ ilce: ILCE, tesisTuru: "ciftlik", hucreler: CIFT_A, sinif: "kirsal" });
    expect(r.tamam).toBe(true);
    expect(ts!.yazar.seq - seq0).toBe(1);
    await bekle(() => a.ozet()!.surenInsaat === 1);
    expect(a.ozet()!.ilceHucre).toEqual([[ILCE, 2]]);
    const hazineSonra = a.ozet()!.hazineMili!;
    expect(hazineSonra).toBeLessThan(50_000_000 - 4_000_000);
    // Başarısız (aynı hücreler dolu): hiçbir şey değişmez
    const red = await a.yapiYerlestir({ ilce: ILCE, tesisTuru: "ciftlik", hucreler: CIFT_A, sinif: "kirsal" });
    expect(red).toMatchObject({ tamam: false, hata: "sunucu" });
    expect(red.tamam ? "" : red.mesaj).toBe("Hücrede zaten yapı ya da inşaat var.");
    expect(a.ozet()!.ilceHucre).toEqual([[ILCE, 2]]);
    // Geri al: inşaat iptal + alınan hücreler bırakılır
    const g = await a.yapiGeriAl({ ilce: ILCE, hucreler: CIFT_A, alinan: CIFT_A });
    expect(g).toMatchObject({ tamam: true });
    await bekle(() => a.ozet()!.surenInsaat === 0 && a.ozet()!.ilceHucre.length === 0);
    expect((await a.sahiplikAl(ILCE))!.hucreler.size).toBe(0);
    expect(a.ozet()!.hazineMili!).toBeGreaterThan(hazineSonra);
    expect(await a.yapiGeriAl({ ilce: ILCE, hucreler: CIFT_A, alinan: CIFT_A })).toMatchObject({ tamam: false, hata: "yapi_yok" });
    expect(a.sunucuHatalari).toEqual([]);
  });

  it("bilinmeyen ilçe null döner, diğer ilçeler çalışmaya devam eder; kimlik reddi Türkçe hata", async () => {
    await hazirla();
    const a = await ac("ali");
    expect(a.ilceVarMi("tr_41_gebze")).toBeNull();
    expect(await a.sahiplikAl("tr_41_gebze")).toBeNull();
    expect(a.ilceVarMi("tr_41_gebze")).toBe(false);
    expect((await a.sahiplikAl(ILCE))?.uygun).toBe(SATILABILIR);
    expect(a.ilceVarMi(ILCE)).toBe(true);
    await expect(WsBaglanti.ac({ url: ts!.url, token: "gel1.ali.sahte", acZamanAsimiMs: 3000 })).rejects.toThrow(/Oturum doğrulanamadı/);
  });

  it("bağlantı kopunca yeniden bağlanır; kopukken verilen komut yeniden bağlanınca uygulanır (tek kez)", async () => {
    await hazirla();
    const a = await ac("ali");
    await a.sahiplikAl(ILCE);
    const eskiWs = (a as unknown as { ws: WebSocket }).ws;
    eskiWs.close();
    await bekle(() => a.durum === "kopuk");
    const sonuc = a.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: CIFT_B, sinif: "kirsal" });
    await bekle(() => a.durum === "bagli");
    expect((await sonuc).tamam).toBe(true);
    await bekle(() => a.ozet()?.ilceHucre.length === 1);
    expect(a.ozet()!.ilceHucre).toEqual([[ILCE, 2]]);
    // Yeniden bağlanma sonrası abonelik geri geldi: ilçe karesi var
    expect((await a.sahiplikAl(ILCE))!.hucreler.size).toBe(2);
    // Sunucuda yalnızca BİR parsel_al uygulandı (başarılı komut sayısı)
    const gunluk = (await ts!.depo.gunluk.oku(0)).filter((k) => k.komut.tur === "parsel_al");
    expect(gunluk).toHaveLength(1);
  });

  it("komut zinciri: arsa alınamazsa yapı komutu GÖNDERİLMEZ; arsa alınır ama yapı olmazsa Türkçe bildirim", async () => {
    await hazirla();
    const a = await ac("ali");
    const v = await ac("veli");
    await a.sahiplikAl(ILCE);
    await v.sahiplikAl(ILCE);
    // veli iki hücreyi alır
    expect((await v.parselAl({ tur: "parsel_al", ilce: ILCE, hucreler: CIFT_B, sinif: "kirsal" })).tamam).toBe(true);
    const ciftlik: YapiTanimi = { id: "ciftlik", ad: "Çiftlik", grup: "Tarım", yuva: 2, paraMili: 6_000_000, malzeme: [], sureSaat: 2, ilkGunSureSaat: 0.2 };
    const plan = (hucreler: string[], alinacak: string[]): YerlesimPlani => ({
      yapi: ciftlik,
      hucreler: hucreler.map((id) => ({ id, x: 0, y: 0, neden: null, benim: !alinacak.includes(id) })),
      gecerli: true,
      neden: null,
      alinacak,
      parseller: alinacak.length ? [{ sinif: "kirsal", hucreler: alinacak, mili: 2_000_000 }] : [],
      arsaMili: 2_000_000,
      yapiMili: 6_000_000,
      toplamMili: 8_000_000,
      hazineYetmez: false,
    });
    let insaCagri = 0;
    const sarmal: MulkBaglantisi = {
      ben: a.ben,
      oyuncuAdi: (x) => a.oyuncuAdi(x),
      parselAl: (k) => a.parselAl(k),
      sahiplikAl: (i) => a.sahiplikAl(i),
      tesisInsa: (k) => {
        insaCagri++;
        return a.tesisInsa(k);
      },
    };
    // 1) arsa başarısız (veli'nin hücreleri): yapı gönderilmez
    const k1 = await yerlesimiUygula(sarmal, ILCE, plan(CIFT_B, CIFT_B));
    expect(k1).toMatchObject({ tamam: false, asama: "parsel", yol: "zincir", gonderilen: 1, alinan: [] });
    expect(k1.mesaj).toBe("Arsa alınamadı, Çiftlik kurulmadı: Bir hücre az önce veli tarafından alındı.");
    expect(insaCagri).toBe(0);
    // 2) arsa başarılı, yapı başarısız: yanlış yuva (1 hücre) -> sunucu reddeder; arsa sende kalır
    const k2 = await yerlesimiUygula(sarmal, ILCE, plan([CIFT_A[0]!], [CIFT_A[0]!]));
    expect(k2).toMatchObject({ tamam: false, asama: "insa", gonderilen: 2, alinan: [CIFT_A[0]] });
    expect(k2.mesaj).toContain("Arsa alındı (1 hücre");
    expect(k2.mesaj).toContain("Bu yapı 2 hücre kaplar (seçilen 1).");
    expect(insaCagri).toBe(1);
    // 3) tam başarı: kendi hücren (CIFT_A[0]) + 1 yeni hücre alınır, sonra yapı kurulur (2 komut)
    const k3 = await yerlesimiUygula(sarmal, ILCE, plan([CIFT_A[0]!, CIFT_A[1]!], [CIFT_A[1]!]));
    expect(k3).toMatchObject({ tamam: true, gonderilen: 2, alinan: [CIFT_A[1]] });
    expect(k3.mesaj).toMatch(/^Çiftlik kuruluyor: arsa 1 hücre, [\d.]+\u00a0₺ \+ yapı 6\.000\u00a0₺\.$/);
    expect(insaCagri).toBe(2);
  });
});
