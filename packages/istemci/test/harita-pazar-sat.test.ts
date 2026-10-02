/**
 * "Pazar'da sat" (mülk paneli, Mal sekmesi; alfa-0 ilk saat T-1): satır altı ek satır (düğme, emir durumu, inline form), SÜREKLİ saatlik emir dili, komut `ticaret_emri` (ihracat; oranSaat
 * mili-birim/sa, 0 = bırak), Türkçe ret, gıda/kalkan/Defter notları, depolanamaz malda düğme yok; `kayit.ts` liman koşulu mülk işletme düğümünde kalkar (bölge kipinde kalır);
 * `WsBaglanti` mal satırına emir yeri ve oranını taşır ve komutu gerçek komut çerçevesiyle yollar. DOM yok: HTML dizgesi, sahte öğe ve sahte WebSocket.
 */
import { afterEach, describe, expect, it } from "vitest";
import { kareFarki, type IlgiKaresi } from "@bolge/protokol";
import type { IcerikDosyasi, Parametreler } from "@bolge/veri";
import icerikHam from "../../veri/icerik/icerik.json";
import paramHam from "../../veri/icerik/parametreler.json";
import { icerikTablosu } from "../src/komut/tablo";
import { komutTanimi } from "../src/komut/kayit";
import type { Baglam } from "../src/komut/tipler";
import type { IsletmeDurumu, TesisSonucu, TicaretEmriIstegi } from "../src/harita/baglanti";
import { WsBaglanti } from "../src/harita/baglanti-ws";
import { pazarHatasiTurkce } from "../src/harita/hata-mulk";
import { mulkMalPaneli } from "../src/harita/mulk-panel";
import type { MulkAdlari } from "../src/harita/mulk-panel";
import { PazarSatPaneli, pazarOrani, pazarSatEylemiOku } from "../src/harita/pazar-sat";
import type { PazarSatParam } from "../src/harita/pazar-sat";
import { PAZAR_METIN, pazarMetni, pazarRetMetni } from "../src/harita/pazar-sat-metin";

const ic = icerikTablosu(icerikHam as unknown as IcerikDosyasi, paramHam as unknown as Parametreler);

type Mal = IsletmeDurumu["mallar"][number];
const tahil = (ek: Partial<Mal> = {}): Mal => ({ mal: "tahil", stokMili: 38_000, uretimMili: 200_000, satisMili: 0, alisMili: 0, satisBolge: "sn_m_ova#ali", ...ek });
const gida = (ek: Partial<Mal> = {}): Mal => ({ mal: "gida", stokMili: 199_000, uretimMili: 0, satisMili: 0, alisMili: 0, satisBolge: "sn_m_ova#ali", ...ek });
const elektrik = (): Mal => ({ mal: "elektrik", stokMili: 0, uretimMili: 50_000, satisMili: 0, alisMili: 0, satisBolge: "sn_m_ova#ali" });

function durum(mallar: Mal[], simZamani = 0): IsletmeDurumu {
  return { simZamani, hazineMili: 0, hazineOraniMili: 0, araziDegeriMili: 0, araziVergisiMili: 0, ilceHucre: [], korumaBitis: null, ayrilmisBitis: null, indirimliYapiKalan: null, yapilar: [], mallar };
}

/** Para biçimi dar/sert boşluk kullanır: karşılaştırma için düz boşluğa çevrilir. */
const n = (h: string): string => h.replace(/[\u00a0\u202f]/g, " ");

const FIYAT = 41_250; // mili-₺/birim (kare.fiyat)

function kur(mallar: Mal[], ek: Partial<PazarSatParam> & { sonuc?: TesisSonucu | Error; simZamani?: number } = {}) {
  const komutlar: TicaretEmriIstegi[] = [];
  const bildirimler: Array<[string, string]> = [];
  let ciz = 0;
  let zaman = 0;
  const { sonuc, simZamani, ...gecersiz } = ek;
  const p = new PazarSatPaneli({
    ic,
    malAdi: (m) => ic.mallar[ic.malIdx[m] ?? -1]?.ad ?? m,
    isletme: () => durum(mallar, simZamani ?? 0),
    referans: (m) => (ic.malIdx[m] === undefined ? undefined : { mili: FIYAT, yaklasik: false }),
    kalkan: () => false,
    ilkSatisOdulu: () => null,
    ilkDukkanSatisi: () => false,
    komut: async (i) => {
      komutlar.push(i);
      if (sonuc instanceof Error) throw sonuc;
      return sonuc ?? { tamam: true, t: 1 };
    },
    degisti: () => void ciz++,
    bildir: (m, t) => void bildirimler.push([m, t]),
    simdi: () => zaman,
    ...gecersiz,
  });
  return { p, komutlar, bildirimler, cizim: () => ciz, ilerlet: (ms: number) => void (zaman += ms) };
}

describe("satır eki: düğme, durum, depolanamaz mal", () => {
  it("satılabilir malın altında 'Pazar'da sat' (aria-label mal adıyla); depolanamaz malda ve emrin yeri bilinmeyen malda HİÇBİR ŞEY", () => {
    const { p } = kur([]);
    const h = p.satirEki(tahil());
    expect(h).toContain('data-eylem="pazar-ac" data-mal="tahil" aria-expanded="false"');
    expect(h).toContain('aria-label="Tahıl için Pazar&#39;da sat"');
    expect(h).toContain(">Pazar&#39;da sat<");
    expect(h).not.toContain("pz-form"); // kapalı
    expect(p.satirEki(elektrik())).toBe("");
    expect(p.satirEki(tahil({ satisBolge: undefined }))).toBe("");
  });

  it("emir varken: durum satırı 'Satışta: saatte N birim · şu an G/sa' ve düğme 'Satışı değiştir'; gerçekleşen 0 ve satılacak mal (stok, üretim) yoksa 'satılacak mal yok'", () => {
    const { p } = kur([]);
    const h = p.satirEki(tahil({ satisEmirMili: 100_000, satisMili: 100_000 }));
    expect(h).toContain("Satışta: saatte 100 birim · şu an 100 birim/sa");
    expect(h).toContain(">Satışı değiştir<");
    expect(h).not.toContain(">Pazar&#39;da sat<");
    expect(p.satirEki(tahil({ satisEmirMili: 100_000, satisMili: 0, stokMili: 0, uretimMili: 0 }))).toContain("Satışta: saatte 100 birim · şu an satılacak mal yok");
  });

  it("bekliyor: emir var, gerçekleşen 0, satılacak mal VAR => 'Satış emirleri saat başında işlenir · bir sonraki işlem ≈ {sure} sonra' (süre sunucunun sim zamanından bir sonraki tam saate, yukarı yuvarlı dk); 'satılacak mal yok' ÇIKMAZ", () => {
    const x = tahil({ satisEmirMili: 100_000, satisMili: 0 });
    const SA = 3_600_000;
    const dk = (simZamani: number): string => kur([x], { simZamani }).p.satirEki(x);
    expect(dk(5 * SA + 30 * 60_000)).toContain("Satış emirleri saat başında işlenir · bir sonraki işlem ≈ 30 dk sonra");
    expect(dk(5 * SA)).toContain("bir sonraki işlem ≈ 1 sa sonra"); // tam saatte: bir sonraki tık 1 sa sonra
    expect(dk(5 * SA + 59 * 60_000 + 30_000)).toContain("bir sonraki işlem ≈ 1 dk sonra"); // 30 sn -> yukarı: 1 dk
    expect(dk(5 * SA + 10 * 60_000)).toContain("bir sonraki işlem ≈ 50 dk sonra");
    expect(dk(5 * SA + 30 * 60_000)).not.toContain("satılacak mal yok");
    expect(dk(5 * SA + 30 * 60_000)).not.toContain("Satışta: saatte");
    // yalnız üretim varsa da (stok 0) bekleyiş; tık gerçekleştirince normal durum satırı
    const uretimli = tahil({ satisEmirMili: 100_000, satisMili: 0, stokMili: 0 });
    expect(kur([uretimli], { simZamani: 5 * SA + 30 * 60_000 }).p.satirEki(uretimli)).toContain("bir sonraki işlem ≈ 30 dk sonra");
    const gerceklesti = tahil({ satisEmirMili: 100_000, satisMili: 100_000 });
    expect(kur([gerceklesti], { simZamani: 6 * SA + 1000 }).p.satirEki(gerceklesti)).toContain("Satışta: saatte 100 birim · şu an 100 birim/sa");
  });

  it("mulkMalPaneli: kanca yokken tablo eskisi gibi (ek satır yok); kanca varken satırın altında <tr class=mal-eylem>", () => {
    const { p } = kur([]);
    const ad: MulkAdlari = { yapi: (t) => t, mal: (m) => ic.mallar[ic.malIdx[m] ?? -1]?.ad ?? m, ilce: (i) => i, il: (i) => i };
    const d = durum([tahil(), elektrik()]);
    expect(mulkMalPaneli(d, ad)).not.toContain("mal-eylem");
    ad.pazar = (x) => p.satirEki(x);
    const h = mulkMalPaneli(d, ad);
    expect(h.match(/class="mal-eylem"/g)).toHaveLength(1); // elektrik satırında ek satır yok
    expect(h).toContain('<tr class="mal-eylem"><td colspan="4">');
  });
});

describe("form: açma, hızlı seçim, doğrulama", () => {
  it("açılışta alan üretimin kadar dolu; hızlı seçimler 'Üretimin kadar: 200 birim/sa' ve (gıda dışı) 'Depodaki kadar: 38 birim/sa'; sayı alanı en çok 1.000.000; birincil tek düğme", async () => {
    const { p } = kur([tahil()]);
    await p.eylem({ eylem: "ac", mal: "tahil" });
    expect(p.durum).toMatchObject({ acik: "tahil", girdi: "200" });
    const h = p.satirEki(tahil());
    expect(h).toContain("Tahıl: Pazar&#39;da sat");
    expect(h).toContain("Saatte kaç birim satılsın? Satış sen bırakana kadar sürer.");
    expect(h).toContain("Üretimin kadar: 200 birim/sa");
    expect(h).toContain("Depodaki kadar: 38 birim/sa");
    expect(h).toContain('type="text" inputmode="decimal" autocomplete="off" aria-describedby="pz-birim" value="200"');
    expect(h).toContain(">Satış emri ver<");
    expect(h.match(/class="eylem birincil"/g)).toHaveLength(1);
    expect(h).not.toContain("Satışı bırak"); // emir yok
  });

  it("fiyat bloğu: Piyasa fiyatı (kare.fiyat) her zaman; 'Eline geçen ≈ N/birim' ve 'Eline geçen en çok ≈ G/sa' YALNIZ sunucu düğümün net çarpanını (satisNetPpm) veriyorsa, AŞAĞI yuvarlı; alan YOKSA ikisi de gizli (sabit çarpanla rakam yok); kare yoksa ≈ yaklaşık", async () => {
    // alan var: limanlı düğüm (Gebze/Körfez 0,862): 41,25 x 0,862 = 35,5575 -> 35 ₺; 100 birim/sa -> 3.555,7 -> 3.555 ₺/sa
    const var_ = tahil({ satisNetPpm: 862_000 });
    const a = kur([var_]);
    await a.p.eylem({ eylem: "ac", mal: "tahil" });
    a.p.girdi("100");
    const h = n(a.p.ozetHtml("tahil"));
    expect(h).toContain("Piyasa fiyatı: 41 ₺"); // 41,25 aşağı
    expect(h).toContain("Eline geçen ≈ 35 ₺/birim");
    expect(h).toContain("Eline geçen en çok ≈ 3.555 ₺/sa");
    // limansız düğüm 0,90: 37,125 -> 37 ₺; 3.712,5 -> 3.712 ₺/sa (çarpan sunucudan; istemci kendisi 0,891/0,90 varsaymaz)
    const limansiz = tahil({ satisNetPpm: 900_000 });
    const k = kur([limansiz], { kalkan: () => true });
    await k.p.eylem({ eylem: "ac", mal: "tahil" });
    k.p.girdi("100");
    const hk = n(k.p.ozetHtml("tahil"));
    expect(hk).toContain("Eline geçen ≈ 37 ₺/birim");
    expect(hk).toContain("Eline geçen en çok ≈ 3.712 ₺/sa");
    expect(hk).toContain("Pazarla ticarette vergi ve komisyon ödemezsin.");
    // alan YOK: net ve gelir satırı yok; fiyat ve uyarılar kalır
    const yok = kur([tahil()]);
    await yok.p.eylem({ eylem: "ac", mal: "tahil" });
    yok.p.girdi("100");
    const hy = n(yok.p.ozetHtml("tahil"));
    expect(hy).toContain("Piyasa fiyatı: 41 ₺");
    expect(hy).not.toContain("Eline geçen");
    expect(hy).not.toContain("₺/sa");
    expect(hy).not.toContain("/birim");
    const y = kur([var_], { referans: () => ({ mili: 30_000, yaklasik: true }) });
    await y.p.eylem({ eylem: "ac", mal: "tahil" });
    expect(n(y.p.ozetHtml("tahil"))).toContain("Piyasa fiyatı ≈ 30 ₺ (veri henüz gelmedi)");
  });

  it("oran boş: 'Geçerli bir saatlik miktar yaz; 0 mevcut emri iptal eder.' ve birincil aria-disabled; tavandan büyük: ret metni; geçerli oranda uyarı yok", async () => {
    const { p, komutlar } = kur([tahil({ uretimMili: 0 })]);
    await p.eylem({ eylem: "ac", mal: "tahil" });
    expect(p.durum.girdi).toBe(""); // üretim yok: alan boş
    let h = p.satirEki(tahil({ uretimMili: 0 }));
    expect(h).toContain("Geçerli bir saatlik miktar yaz; 0 mevcut emri iptal eder.");
    expect(h).toContain('data-eylem="pazar-ver" aria-disabled="true"');
    p.girdi("0");
    expect(p.ozetHtml("tahil")).not.toContain("data-alan=\"pazar-gerekli\"");
    p.girdi("2000000");
    expect(p.ozetHtml("tahil")).toContain("Saatte 0 ile 1.000.000 arasında bir sayı yaz.");
    p.girdi("12");
    expect(p.ozetHtml("tahil")).not.toContain("en az 1 birim");
    h = p.satirEki(tahil({ uretimMili: 0 }));
    expect(h).not.toContain('aria-disabled="true"');
    p.girdi("0");
    await p.eylem({ eylem: "ver" });
    expect(komutlar).toEqual([{ bolge: "sn_m_ova#ali", mal: "tahil", oranSaat: 0 }]); // 0 mevcut emri iptal eder
    expect([pazarOrani(""), pazarOrani("1,5"), pazarOrani("abc"), pazarOrani("1"), pazarOrani("1000000"), pazarOrani("1000001")]).toEqual([null, 1.5, null, 1, 1_000_000, null]);
  });

  it("gıda: 'Depodaki kadar' kısayolu YOK, tek cümle uyarı (ilk dükkân satışı yokken); dükkân satışı olduysa uyarı da yok; tahılda uyarı yok", async () => {
    const g = kur([gida({ uretimMili: 120_000 })]);
    await g.p.eylem({ eylem: "ac", mal: "gida" });
    const h = g.p.satirEki(gida({ uretimMili: 120_000 }));
    expect(h).toContain("Üretimin kadar: 120 birim/sa");
    expect(h).not.toContain("Depodaki kadar");
    expect(h).toContain("Başlangıç gıdan ilk dükkânının rafı için gerekebilir.");
    const d = kur([gida()], { ilkDukkanSatisi: () => true });
    await d.p.eylem({ eylem: "ac", mal: "gida" });
    expect(d.p.satirEki(gida())).not.toContain("Başlangıç gıdan");
    const t = kur([tahil()]);
    await t.p.eylem({ eylem: "ac", mal: "tahil" });
    expect(t.p.satirEki(tahil())).not.toContain("Başlangıç gıdan");
  });

  it("Defter notu: emir var, ilk gelir geldi ve ilk_satis sıradaysa 'İlk satışın saat başında Defterine işlenir; ödülün 500 ₺.'; bekliyor satırı görünürken (tekrar olmasın), emir yokken ya da ödül alınmışsa yok", async () => {
    const gerceklesen = tahil({ satisEmirMili: 100_000, satisMili: 100_000 });
    const e = kur([gerceklesen], { ilkSatisOdulu: () => 500_000 });
    await e.p.eylem({ eylem: "ac", mal: "tahil" });
    expect(n(e.p.satirEki(gerceklesen))).toContain("İlk satışın saat başında Defterine işlenir; ödülün 500 ₺.");
    const bekleyen = tahil({ satisEmirMili: 100_000, satisMili: 0 });
    const b = kur([bekleyen], { ilkSatisOdulu: () => 500_000, simZamani: 1800_000 });
    await b.p.eylem({ eylem: "ac", mal: "tahil" });
    const hb = b.p.satirEki(bekleyen);
    expect(hb).toContain("bir sonraki işlem ≈ 30 dk sonra");
    expect(hb).not.toContain("Defterine"); // bekliyor satırı varken defter notu yok
    const y = kur([tahil()], { ilkSatisOdulu: () => 500_000 });
    await y.p.eylem({ eylem: "ac", mal: "tahil" });
    expect(y.p.satirEki(tahil())).not.toContain("Defter");
    const a = kur([gerceklesen]);
    await a.p.eylem({ eylem: "ac", mal: "tahil" });
    expect(a.p.satirEki(gerceklesen)).not.toContain("Defter");
  });
});

describe("gönderim: sürekli saatlik emir", () => {
  it("'Satış emri ver': ticaret_emri {bolge: işletme düğümü, mal, oranSaat = birim/sa x 1000}; toast 'Tahıl satışa çıktı: saatte 150 birim.'; form kapanır", async () => {
    const { p, komutlar, bildirimler } = kur([tahil()]);
    await p.eylem({ eylem: "ac", mal: "tahil" });
    await p.eylem({ eylem: "oran", oran: "150" });
    expect(p.durum.girdi).toBe("150");
    await p.eylem({ eylem: "ver" });
    expect(komutlar).toEqual([{ bolge: "sn_m_ova#ali", mal: "tahil", oranSaat: 150_000 }]);
    expect(bildirimler).toEqual([["Tahıl satışa çıktı: saatte 150 birim.", "bilgi"]]);
    expect(p.durum.acik).toBeNull();
    expect(p.durum.gonderiyor).toBe(false);
  });

  it("iyimser emir: kabul edilen emir kare yetişene kadar durum satırında görünür; kare yetişince karedeki değer; 20 sn'de düşer", async () => {
    const { p, ilerlet } = kur([tahil()]);
    await p.eylem({ eylem: "ac", mal: "tahil" });
    await p.eylem({ eylem: "ver" }); // alan üretimin kadar: 200
    const kareyok = p.satirEki(tahil());
    expect(kareyok).toContain("Satış emirleri saat başında işlenir · bir sonraki işlem ≈ 1 sa sonra"); // iyimser emir: gerçekleşen henüz 0, mal var -> bekliyor
    expect(kareyok).toContain(">Satışı değiştir<");
    expect(p.satirEki(tahil({ satisEmirMili: 200_000, satisMili: 200_000 }))).toContain("şu an 200 birim/sa"); // kare yetişti
    expect(p.satirEki(tahil())).not.toContain("Satışta"); // kare artık emir göstermiyor: iyimser silindi
    await p.eylem({ eylem: "ac", mal: "tahil" });
    await p.eylem({ eylem: "ver" });
    ilerlet(21_000);
    expect(p.satirEki(tahil())).not.toContain("Satışta");
  });

  it("emir varken: açılışta mevcut oran, 'Emri güncelle', toast 'satış oranı'; 'Satışı bırak' (onaysız, soluk ikincil) oranSaat 0 gönderir ve 'satışı bırakıldı' der", async () => {
    const x = tahil({ satisEmirMili: 100_000, satisMili: 100_000 });
    const { p, komutlar, bildirimler } = kur([x]);
    await p.eylem({ eylem: "ac", mal: "tahil" });
    expect(p.durum.girdi).toBe("100");
    const h = p.satirEki(x);
    expect(h).toContain(">Emri güncelle<");
    expect(h).toContain('data-eylem="pazar-birak"');
    expect(h.match(/class="eylem birincil"/g)).toHaveLength(1);
    await p.eylem({ eylem: "oran", oran: "80" });
    await p.eylem({ eylem: "ver" });
    expect(komutlar.at(-1)).toEqual({ bolge: "sn_m_ova#ali", mal: "tahil", oranSaat: 80_000 });
    expect(bildirimler.at(-1)).toEqual(["Tahıl satış oranı: saatte 80 birim.", "bilgi"]);
    await p.eylem({ eylem: "ac", mal: "tahil" });
    await p.eylem({ eylem: "birak" });
    expect(komutlar.at(-1)).toEqual({ bolge: "sn_m_ova#ali", mal: "tahil", oranSaat: 0 });
    expect(bildirimler.at(-1)).toEqual(["Tahıl satışı bırakıldı.", "bilgi"]);
  });

  it("ret: sunucu iletisi formda kalır (dk-hata role=alert), toast yok, form açık; ağ hatası da formda; vazgeç kapatır", async () => {
    const ret = kur([tahil()], { sonuc: { tamam: false, hata: "sunucu", mesaj: "Satış ve alış emri yuvaların dolu (4). Bir emri bırak ya da Ticaret ofisi kur." } });
    await ret.p.eylem({ eylem: "ac", mal: "tahil" });
    await ret.p.eylem({ eylem: "ver" });
    expect(ret.bildirimler).toEqual([]);
    expect(ret.p.durum.acik).toBe("tahil");
    expect(ret.p.satirEki(tahil())).toContain('<p class="dk-hata" role="alert">Satış ve alış emri yuvaların dolu (4). Bir emri bırak ya da Ticaret ofisi kur.</p>');
    const ag = kur([tahil()], { sonuc: new Error("bağlantı koptu") });
    await ag.p.eylem({ eylem: "ac", mal: "tahil" });
    await ag.p.eylem({ eylem: "ver" });
    expect(ag.p.satirEki(tahil())).toContain("bağlantı koptu");
    await ag.p.eylem({ eylem: "vazgec" });
    expect(ag.p.durum.acik).toBeNull();
    await ag.p.eylem({ eylem: "ac", mal: "tahil" });
    await ag.p.eylem({ eylem: "ac", mal: "tahil" }); // aynı düğme tekrar: kapanır
    expect(ag.p.durum.acik).toBeNull();
  });
});

describe("DOM eylem okuma (sahte öğe)", () => {
  type Sahte = { closest: (s: string) => Sahte | null; dataset: Record<string, string | undefined>; getAttribute: (a: string) => string | null };
  const oge = (dataset: Record<string, string>, aria?: string): Sahte => {
    const o: Sahte = { dataset, getAttribute: (a) => (a === "aria-disabled" ? (aria ?? null) : null), closest: (s) => (s.includes("pazar-") ? o : null) };
    return o;
  };
  it("aç, hızlı seçim, ver, bırak, vazgeç okunur; aria-disabled yutulur; ilgisiz öğe null", () => {
    const as = (o: Sahte): HTMLElement => o as unknown as HTMLElement;
    expect(pazarSatEylemiOku(as(oge({ eylem: "pazar-ac", mal: "tahil" })))).toEqual({ eylem: "ac", mal: "tahil" });
    expect(pazarSatEylemiOku(as(oge({ eylem: "pazar-oran", oran: "38" })))).toEqual({ eylem: "oran", oran: "38" });
    expect(pazarSatEylemiOku(as(oge({ eylem: "pazar-ver" })))).toEqual({ eylem: "ver" });
    expect(pazarSatEylemiOku(as(oge({ eylem: "pazar-birak" })))).toEqual({ eylem: "birak" });
    expect(pazarSatEylemiOku(as(oge({ eylem: "pazar-vazgec" })))).toEqual({ eylem: "vazgec" });
    expect(pazarSatEylemiOku(as(oge({ eylem: "pazar-ver" }, "true")))).toBeNull();
    expect(pazarSatEylemiOku(as({ closest: () => null, dataset: {}, getAttribute: () => null }))).toBeNull();
  });
});

describe("metin tablosu ve ret eşlemesi", () => {
  it("büyük harf yalnız cümle başında değil: A1 metinleri (sürekli emir dili), ASCII yer tutucular; tek seferlik satış sözleri yok", () => {
    for (const [k, v] of Object.entries(PAZAR_METIN)) {
      expect(/\{[a-z_]+\}/.test(v) ? v.replace(/\{[a-z_]+\}/g, "") : v, k).not.toMatch(/₺/); // para yer tutucuyla gelir, şablonda ₺ yok
      expect(v, k).not.toMatch(/Depodaki \{n\} birimi sat|bir kerelik|tek seferlik/i);
    }
    expect(pazarMetni("pazar.sat.net", { net: "37 ₺" })).toBe("Eline geçen ≈ 37 ₺/birim");
    expect(pazarMetni("pazar.sat.dugme_kaldir")).toBe("Satışı bırak");
  });

  it("çekirdek ret iletileri Türkçe: yuva dolu (Ticaret ofisi), depolanamaz, geçersiz oran, sahip değil, liman; tanınmayan ileti genel eşlemeye düşer", () => {
    expect(pazarHatasiTurkce("ticaret emri yuvasi dolu (4); Ticaret ofisi yuva ekler")).toBe("Satış ve alış emri yuvaların dolu (4). Bir emri bırak ya da Ticaret ofisi kur.");
    expect(pazarHatasiTurkce("depolanamaz mal ticarete konu olamaz: elektrik")).toBe("Bu mal depolanamadığı için satılamaz.");
    expect(pazarHatasiTurkce("gecersiz oran: -5 (0..1000000000)")).toBe("Saatte 0 ile 1.000.000 arasında bir sayı yaz.");
    expect(pazarHatasiTurkce("bolge oyuncunun degil: sn_m_ova#veli")).toBe("Bu işletme senin değil.");
    expect(pazarHatasiTurkce("bolge liman degil: m_ova")).toBe("Bu bölgede Pazar'a satış yapılamaz.");
    expect(pazarHatasiTurkce("bilinmeyen mal: x")).toBe("Bu mal bulunamadı.");
    expect(pazarRetMetni("tamamen baska bir ileti")).toBeNull();
    expect(pazarHatasiTurkce("tamamen baska bir ileti")).toContain("tamamen baska bir ileti"); // hiçbir hata sessizce yutulmaz
  });
});

describe("kayit.ts: ticaret emri liman koşulu", () => {
  const baglam = (id: string, etiketler: string[], mulk: boolean): Baglam =>
    ({ ic: { param: mulk ? { mulk: {} } : {} }, dizin: { bolgeler: [{ id, etiketler }] }, bolge: 0 }) as unknown as Baglam;
  it("mülk kipinde işletme düğümü (<il>#<oyuncu>) limansız da uygun; bölge kipinde limansız bölgede 'Yalnızca liman bölgelerinde' KALIR; limanda her kipte uygun; mülk kipinde '#'sız bölge hâlâ kapalı", () => {
    const t = komutTanimi("ticaret_emri")!;
    expect(t.uygun(baglam("sn_m_ova#ali", [], true))).toBeNull();
    expect(t.uygun(baglam("m_ova", [], false))).toBe("Yalnızca liman bölgelerinde");
    expect(t.uygun(baglam("m_ova#ali", [], false))).toBe("Yalnızca liman bölgelerinde"); // mülk parametresi yok = bölge kipi
    expect(t.uygun(baglam("m_liman", ["liman"], false))).toBeNull();
    expect(t.uygun(baglam("sn_m_liman#ali", ["liman"], true))).toBeNull();
    expect(t.uygun(baglam("sn_m_ova", [], true))).toBe("Yalnızca liman bölgelerinde");
  });
});

// --- WsBaglanti: kare -> mal satırı (emir yeri ve oranı), komut çerçevesi ----------------------------------------------------------------------------------------------------

type Dinleyici = (e: { data?: string; code?: number }) => void;
class SahteWs {
  static ornekler: SahteWs[] = [];
  readyState = 0;
  readonly gonderilen: Array<Record<string, unknown>> = [];
  private dinleyiciler = new Map<string, Dinleyici[]>();
  constructor(readonly url: string) {
    SahteWs.ornekler.push(this);
  }
  addEventListener(tur: string, f: Dinleyici): void {
    const l = this.dinleyiciler.get(tur) ?? [];
    l.push(f);
    this.dinleyiciler.set(tur, l);
  }
  send(m: string): void {
    this.gonderilen.push(JSON.parse(m) as Record<string, unknown>);
  }
  close(): void {
    this.readyState = 3;
  }
  ac(): void {
    this.readyState = 1;
    for (const f of this.dinleyiciler.get("open") ?? []) f({});
  }
  mesaj(m: Record<string, unknown>): void {
    for (const f of this.dinleyiciler.get("message") ?? []) f({ data: JSON.stringify(m) });
  }
}

const DIZIN = { bolgeler: [], mallar: ["tahil", "gida"], tesisTurleri: ["ciftlik"], yontemler: [], birlikler: [], teknolojiler: [] };
const hos = (): Record<string, unknown> => ({ tur: "hosgeldin", protokolSurumu: 1, kuralSurumu: "k", oyuncu: "ali", yonetici: false, simZamani: 0, seq: 0, hiz: 1, dizin: DIZIN });

/** İki işletme düğümü: il1 (tahıl stoku 10, emir YOK) ve il2 (tahıl stoku 40 ve tahıl ihracat emri 100/sa, gerçekleşen 80). */
function kare(netVar = true): Record<string, unknown> {
  const bolge = (i: number, id: string, stoklar: number[][], emirler: number[][]) => ({
    i,
    id,
    genel: { sahip: "ali", nufus: 0, tesisler: [], durus: 0 },
    ozel: { stoklar, uretimOrani: [], tesisler: [], emirler, birlikler: [], gidaPpm: 0, ikmalPpm: 0, rezervKalan: [], ...(i === 2 && netVar ? { isletme: { ihrNetPpm: 862_000 } } : {}) },
  });
  return {
    tur: "kare",
    rev: 1,
    seq: 0,
    ilgi: [],
    ilceIlgisi: [],
    kare: {
      t: 0,
      bolgeler: [
        bolge(1, "il1#ali", [[10_000, 0, 0, 0, 1e9], [0, 0, 0, 0, 1e9]], []),
        bolge(2, "il2#ali", [[40_000, 0, 0, 0, 1e9], [5_000, 0, 0, 0, 1e9]], [[0, 0, 100_000, 80_000]]),
      ],
      fiyat: [41_250, 90_000],
      oyuncu: { id: "ali", hazine: [50_000_000, 0, 0, 0, 1e15], vergiPpm: 0, askeriRezervPpm: 0, teknolojiler: [], arastirma: null, korumaBitis: 0, insaatlar: [], mulk: { araziDegeriMili: 0, araziVergisi: [0, 0, 0, 0, 1e15], ilceHucre: [], sonEtkinlik: 0 } },
    },
  };
}

async function bagla(netVar = true): Promise<{ b: WsBaglanti; ws: SahteWs }> {
  const p = WsBaglanti.ac({ url: "ws://sahte", token: "t", istemciKimligi: "t-ali", WebSocketCtor: SahteWs as unknown as typeof WebSocket, komutZamanAsimiMs: 60_000 });
  const ws = SahteWs.ornekler.at(-1)!;
  ws.ac();
  ws.mesaj(hos());
  const b = await p;
  ws.mesaj(kare(netVar));
  await b.hazirBekle();
  return { b, ws };
}

afterEach(() => {
  SahteWs.ornekler = [];
});

describe("WsBaglanti: Pazar'da sat", () => {
  it("R1 rezerv: kendi kaynakları ayrı kalır, sıfır stoktan bağımsızdır, eksik veya bozuk kayıt bilinmez ve canlı delta kalan değeri taşır", async () => {
    const { b, ws } = await bagla();
    try {
      const mesaj = kare();
      const ilk = mesaj["kare"] as unknown as IlgiKaresi;
      ilk.bolgeler[0]!.ozel!.rezervKalan = [0, 9_000];
      ilk.bolgeler[1]!.ozel!.rezervKalan = [123_000, 0];
      const kaynak = ilk.bolgeler[0]!;
      ilk.bolgeler.push(
        { ...structuredClone(kaynak), i: 3, id: "il3#ali", ozel: undefined },
        { ...structuredClone(kaynak), i: 4, id: "il4#ali", ozel: { ...structuredClone(kaynak.ozel!), rezervKalan: [77] } },
        { ...structuredClone(kaynak), i: 5, id: "il5#ali", ozel: { ...structuredClone(kaynak.ozel!), rezervKalan: [0, -1] } },
        { ...structuredClone(kaynak), i: 6, id: "yabanci#ali", genel: { ...kaynak.genel, sahip: "veli" } },
        { ...structuredClone(kaynak), i: 7, id: "il1", ozel: { ...structuredClone(kaynak.ozel!), stoklar: [] } },
        { ...structuredClone(kaynak), i: 8, id: "il1#veli", ozel: { ...structuredClone(kaynak.ozel!), stoklar: [] } },
      );
      ws.mesaj(mesaj);
      expect(b.isletme()!.rezervler).toEqual([
        { bolge: "il1#ali", il: "il1", rezervKalan: [["tahil", 0], ["gida", 9_000]] },
        { bolge: "il2#ali", il: "il2", rezervKalan: [["tahil", 123_000], ["gida", 0]] },
        { bolge: "il3#ali", il: "il3" },
        { bolge: "il4#ali", il: "il4" },
        { bolge: "il5#ali", il: "il5" },
      ]);
      // Rezerv sıfırken pozitif depo stoğu vardır; rezerv tutarı stoğa eklenmez.
      const stoklar = b.isletme()!.mallar.map((m) => [m.mal, m.stokMili]);
      expect(stoklar).toEqual([["tahil", 70_000], ["gida", 5_000]]);

      const sonraki = structuredClone(ilk);
      sonraki.t = 60_000;
      sonraki.bolgeler[0]!.ozel!.rezervKalan = [0, 8_750];
      ws.mesaj({ tur: "delta", onceki: 1, rev: 2, seq: 0, delta: kareFarki(ilk, sonraki) });
      expect(b.isletme()!.rezervler![0]!.rezervKalan).toEqual([["tahil", 0], ["gida", 8_750]]);
      expect(b.isletme()!.rezervler![1]!.rezervKalan).toEqual([["tahil", 123_000], ["gida", 0]]);
      expect(b.isletme()!.mallar.map((m) => [m.mal, m.stokMili])).toEqual(stoklar);

      const bos = structuredClone(sonraki);
      bos.bolgeler = [];
      ws.mesaj({ tur: "delta", onceki: 2, rev: 3, seq: 0, delta: kareFarki(sonraki, bos) });
      expect(b.isletme()!.rezervler).toEqual([]);
      const eski = structuredClone(bos);
      delete eski.oyuncu!.mulk;
      ws.mesaj({ tur: "delta", onceki: 3, rev: 4, seq: 0, delta: kareFarki(bos, eski) });
      expect(b.isletme()!.rezervler).toBeUndefined();
      expect(b.sunucuHatalari).toEqual([]);
    } finally {
      b.kapat();
    }
  });

  it("isletme().mallar: emri olan düğüm kazanır (satisBolge, satisEmirMili = emir oranı, satisMili = gerçekleşen); emri olmayan malda stoğu en çok tutan düğüm", async () => {
    const { b } = await bagla();
    const m = b.isletme()!.mallar;
    const t = m.find((x) => x.mal === "tahil")!;
    expect(t).toMatchObject({ stokMili: 50_000, satisMili: 80_000, satisEmirMili: 100_000, satisBolge: "il2#ali" });
    const g = m.find((x) => x.mal === "gida")!;
    expect(g.satisEmirMili).toBeUndefined(); // emir yok: alan yok
    expect(g.satisBolge).toBe("il2#ali"); // gıda stoku yalnız il2'de
  });

  // Protokol şeması `ozel.isletme.ihrNetPpm`'i tanır (K2 ihr-net): alan ayrıştırmada düşmez.
  it("sunucunun düğüm başına ihracat net çarpanı (ozel.isletme.ihrNetPpm) emrin yerindeki düğümden mal satırına taşınır", async () => {
    const { b } = await bagla(true);
    const m = b.isletme()!.mallar;
    expect(m.find((x) => x.mal === "tahil")!.satisNetPpm).toBe(862_000);
    expect(m.find((x) => x.mal === "gida")!.satisNetPpm).toBe(862_000);
  });

  it("ozel.isletme.ihrNetPpm YOKSA (eski sunucu): mal satırında satisNetPpm alanı YOK (istemci 'Eline geçen'i göstermez)", async () => {
    const { b } = await bagla(false);
    for (const x of b.isletme()!.mallar) expect("satisNetPpm" in x).toBe(false);
  });

  it("ticaretEmri: komut çerçevesi ticaret_emri {bolge, mal, yon: ihracat, oranSaat}; kabul -> tamam; ret iletisi Türkçe (yuva dolu)", async () => {
    const { b, ws } = await bagla();
    const p = b.ticaretEmri!({ bolge: "il1#ali", mal: "tahil", oranSaat: 150_000 });
    const k = ws.gonderilen.filter((x) => x["tur"] === "komut").at(-1)!;
    expect(k["komut"]).toEqual({ tur: "ticaret_emri", bolge: "il1#ali", mal: "tahil", yon: "ihracat", oranSaat: 150_000 });
    ws.mesaj({ tur: "komutSonucu", anahtar: k["anahtar"], seq: 1, t: 5, komut: k["komut"], sonuc: { tamam: true }, tekrar: false });
    expect(await p).toEqual({ tamam: true, t: 5 });
    const q = b.ticaretEmri!({ bolge: "il1#ali", mal: "gida", oranSaat: 1000 });
    const k2 = ws.gonderilen.filter((x) => x["tur"] === "komut").at(-1)!;
    ws.mesaj({ tur: "komutSonucu", anahtar: k2["anahtar"], seq: 2, t: 6, komut: k2["komut"], sonuc: { tamam: false, hata: "ticaret emri yuvasi dolu (4); Ticaret ofisi yuva ekler" }, tekrar: false });
    expect(await q).toEqual({ tamam: false, hata: "sunucu", mesaj: "Satış ve alış emri yuvaların dolu (4). Bir emri bırak ya da Ticaret ofisi kur." });
  });
});
