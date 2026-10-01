/**
 * Ekonomi izleme metrikleri (A2 alfa0-ekonomi-izleme.md §8.2 K2-1..K2-6 + sermaye hazine farkı): `/metrik`'te DÜNYA TOPLAMI gauge'ları, oyuncu etiketi YOK.
 * Kanıtlar: para defteri kalemleri anahtarlardan okunur (isteğe bağlı `sebeke`/`yerelNpc` kalemleri varken satır çıkar), kasa, pazar fiyat/taban ve sınırdaki mal,
 * yöntem dağılımı, aşınma çeyrekleri, saf okuma (özet değişmez), kişisel veri yok; sermaye komutlarında hazine farkı (başarısız sayılmaz, gerçek bedel, dağılım,
 * kurtarma oynatması) ve sunucu `/metrik` metni.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi, Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { ekonomiOlcumu, SermayeSayaci, SERMAYE_KOMUTLARI } from "../src/ekonomi-metrik";
import { Histogram, metrikMetni } from "../src/metrik";
import type { MetrikGirdisi } from "../src/metrik";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import { bitisikSatilabilir, katil, mulkVerisi, testSunucusu, veri } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

const ILCE = "sn_m_ova_merkez";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

function bolMulk(): CekirdekVeriPaketi {
  const v = mulkVerisi();
  const yo = v.param.mulk?.yeniOyuncu;
  if (yo) {
    yo.hibe = 500_000_000;
    yo.baslangicStok.parca = 400_000;
  }
  return v;
}

/** İki oyunculu mülk dünyası (ali: ova merkez, 2 hücre alır, çiftlik kurar; veli yalnız katılır). 6 saat koşar. */
function mulkSim(): Simulasyon {
  const sim = Simulasyon.olustur(bolMulk(), 7);
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut });
  sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [], ilce: ILCE } as Komut });
  const [h1, h2] = bitisikSatilabilir(sim, ILCE);
  sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" } });
  sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: [h1, h2] } });
  sim.calistirKadar(40 * SAAT);
  return sim;
}

function girdi(ek: Partial<MetrikGirdisi> = {}): MetrikGirdisi {
  return {
    baglanti: 0, bagliOyuncu: 0, komutTamam: 0, komutBasarisiz: 0, reddedilen: { hizSiniri: 0, yetisiyor: 0 }, tur: 0, seq: 0, simZamaniMs: 0, bekleyenKomut: 0, yetisiyor: false, yetismeKalanMs: 0,
    saatGerideMs: 0, olumcul: false, goruntuSayisi: 0, goruntuHatasi: 0, goruntuYasiSimMs: 0, goruntuYasiSaniye: 0, goruntuBayt: 0, goruntuSureSonMs: 0, goruntuSureEnUzunMs: 0,
    goruntuIsci: { kopyaSonMs: 0, kopyaEnUzunMs: 0, isciSonMs: 0, alinan: 0, atlanan: 0, hata: 0 }, yayin: { atlananKare: 0, yavasKopan: 0, sira: 0 }, olayDongusu: { p50Ms: 0, p99Ms: 0, maxMs: 0 },
    odul: { verilen: 0, reddedilen: 0, taramaToplamMs: 0, izgara: 0, taramaSonMs: 0, taramaEnUzunMs: 0 }, depo: null, commit: new Histogram(), surec: { rssBayt: 0, heapBayt: 0, cpuSaniye: 0 }, calismaSaniye: 0,
    ...ek,
  };
}

const metin = (sim: Simulasyon, ek: Partial<MetrikGirdisi> = {}): string => metrikMetni(girdi({ ekonomi: ekonomiOlcumu(sim.dunya, sim.ic), ...ek }));
const deger = (m: string, ad: string): number | undefined => {
  const l = m.split("\n").find((x) => x.startsWith(`${ad} `));
  return l === undefined ? undefined : Number(l.slice(ad.length + 1));
};

describe("para defteri, kasa (K2-1, K2-2, K2-6)", () => {
  it("musluk ve lavabo kalemleri anahtarlardan okunur; hibe musluk ve yapi lavabo satirlari var; odul musluk ayrica; kasa bakiye ve giris", () => {
    const sim = mulkSim();
    const para = sim.dunya.mulk?.para;
    expect(para).toBeDefined();
    const m = metin(sim);
    expect(m).toContain("# TYPE bolge_para_musluk_mili gauge");
    for (const k of Object.keys(para?.musluk ?? {})) expect(m, `musluk ${k}`).toContain(`bolge_para_musluk_mili{kalem="${k}"} `);
    for (const k of Object.keys(para?.lavabo ?? {})) expect(m, `lavabo ${k}`).toContain(`bolge_para_lavabo_mili{kalem="${k}"} `);
    expect(deger(m, 'bolge_para_musluk_mili{kalem="hibe"}')).toBe((para?.musluk.hibe.n ?? 0) + Math.floor(((para?.musluk.hibe.a ?? 0) / SAAT) * 1000) / 1000);
    expect(deger(m, 'bolge_para_musluk_mili{kalem="hibe"}')).toBeGreaterThan(0);
    expect(deger(m, 'bolge_para_lavabo_mili{kalem="arsa"}')).toBeGreaterThan(0); // parsel_al arsa lavabosu
    expect(deger(m, "bolge_odul_musluk_mili")).toBe(deger(m, 'bolge_para_musluk_mili{kalem="odul"}'));
    expect(deger(m, "bolge_kasa_sayisi")).toBe(para?.kasalar.length);
    expect(m).toContain("bolge_kasa_bakiye_mili ");
  });

  it("ISTEGE BAGLI kalem varken satir CIKAR (sabit liste yok): musluk.yerelNpc, lavabo.sebeke ve kasa.giris.sebeke eklenince ayni anahtarla gauge gorunur; yokken yok", () => {
    const sim = mulkSim();
    const once = metin(sim);
    expect(once).not.toContain('kalem="sebeke"');
    expect(once).not.toContain('kalem="yerelNpc"');
    const para = sim.dunya.mulk?.para as unknown as {
      musluk: Record<string, { n: number; a: number }>;
      lavabo: Record<string, { n: number; a: number }>;
      kasalar: Array<{ giris: Record<string, { n: number; a: number }> }>;
    };
    para.musluk["yerelNpc"] = { n: 7_000, a: 0 };
    para.lavabo["sebeke"] = { n: 4_500, a: SAAT / 2 }; // 4500,5
    const kasa = para.kasalar[0];
    if (kasa) kasa.giris["sebeke"] = { n: 1_200, a: 0 };
    const m = metin(sim);
    expect(deger(m, 'bolge_para_musluk_mili{kalem="yerelNpc"}')).toBe(7_000);
    expect(deger(m, 'bolge_para_lavabo_mili{kalem="sebeke"}')).toBe(4_500.5);
    if (kasa) expect(deger(m, 'bolge_kasa_giris_mili{kalem="sebeke"}')).toBe(1_200);
    // Siralama deterministik, gecersiz (sayac olmayan) girdi atlanir.
    (para.lavabo as Record<string, unknown>)["bozuk"] = "x";
    expect(metin(sim)).not.toContain('kalem="bozuk"');
    expect(metin(sim)).toBe(metin(sim));
  });

  it("bolge kipinde (para defteri yok) para ve kasa aileleri yazilmaz; pazar ve yontem aileleri yazilir", () => {
    const sim = Simulasyon.olustur(veri(), 3);
    sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: ["m_ova"] } });
    sim.uygula({ t: SAAT, oyuncu: "ali", komut: { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" } });
    sim.calistirKadar(30 * SAAT);
    const m = metin(sim);
    expect(sim.dunya.mulk).toBeUndefined();
    expect(m).not.toContain("bolge_para_");
    expect(m).not.toContain("bolge_kasa_");
    expect(m).toContain("bolge_pazar_fiyat_taban_orani{");
    expect(m).toMatch(/bolge_tesis_yontem\{tur="ciftlik",yontem="[a-z_]+"\} [1-9][0-9]*/);
  });
});

describe("pazar fiyat/taban (K2-3), yontem dagilimi (K2-4), asinma ceyrekleri (K2-5)", () => {
  it("her mal icin oran satiri; sinirdaki mal alt/ust sayilir (<= 0,26 ve >= 1,74); orta bantta sayilmaz", () => {
    const sim = mulkSim();
    const e = ekonomiOlcumu(sim.dunya, sim.ic);
    expect(e.pazar.oran).toHaveLength(sim.ic.mallar.length);
    const m0 = sim.ic.mallar[0];
    const m1 = sim.ic.mallar[1];
    const m2 = sim.ic.mallar[2];
    if (!m0 || !m1 || !m2) throw new Error("mal yok");
    const once = ekonomiOlcumu(sim.dunya, sim.ic).pazar.sinirda;
    sim.dunya.pazar.fiyat[0] = Math.floor(m0.tabanFiyat * 0.25); // alt sinir
    sim.dunya.pazar.fiyat[1] = Math.ceil(m1.tabanFiyat * 1.75); // ust sinir
    sim.dunya.pazar.fiyat[2] = m2.tabanFiyat; // orta
    const s = ekonomiOlcumu(sim.dunya, sim.ic);
    expect(s.pazar.oran[0]).toEqual([m0.id, expect.closeTo(0.25, 2)]);
    expect(s.pazar.oran[2]).toEqual([m2.id, 1]);
    expect(s.pazar.sinirda.alt).toBeGreaterThanOrEqual(1);
    expect(s.pazar.sinirda.ust).toBeGreaterThanOrEqual(1);
    expect(s.pazar.sinirda.alt + s.pazar.sinirda.ust).toBeGreaterThanOrEqual(once.alt + once.ust);
    const m = metin(sim);
    expect(deger(m, 'bolge_pazar_sinirda_mal{sinir="alt"}')).toBe(s.pazar.sinirda.alt);
    expect(deger(m, 'bolge_pazar_sinirda_mal{sinir="ust"}')).toBe(s.pazar.sinirda.ust);
    expect(deger(m, `bolge_pazar_fiyat_taban_orani{mal="${m2.id}"}`)).toBe(1);
  });

  it("yontem dagilimi: tur ve aktif yontem basina adet (dunyadan bagimsiz sayimla ayni); yontem degisince bir tesis eski yontemden yenisine gecer", () => {
    const sim = mulkSim();
    const say = (): Map<string, number> => {
      const m = new Map<string, number>();
      for (const b of sim.dunya.bolgeler) for (const t of b.tesisler) {
        const k = `${sim.ic.tesisTurleri[t.tur]?.id}|${sim.ic.yontemler[t.yontem]?.id}`;
        m.set(k, (m.get(k) ?? 0) + 1);
      }
      return m;
    };
    const olcum = (): Map<string, number> => new Map(ekonomiOlcumu(sim.dunya, sim.ic).yontem.map((y) => [`${y.tur}|${y.yontem}`, y.adet]));
    expect(olcum()).toEqual(say());
    const dugum = sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.merkez !== undefined);
    const tesis = dugum?.tesisler.find((t) => sim.ic.tesisTurleri[t.tur]?.id === "ciftlik");
    expect(tesis).toBeDefined();
    if (!tesis || !dugum) return;
    const eski = sim.ic.yontemler[tesis.yontem]?.id as string;
    const diger = sim.ic.tesisTurleri[tesis.tur]?.yontemler.find((y) => y !== eski);
    expect(diger, "ciftlik icin ikinci yontem").toBeDefined();
    if (diger === undefined) return;
    const once = olcum();
    sim.dunya.oyuncular.find((x) => x.id === "ali")?.teknolojiler.push(sim.ic.teknolojiIndeks["mekanize_tarim"] as number); // mekanize yontem teknoloji sartli
    expect(sim.uygula({ t: sim.dunya.zaman, oyuncu: "ali", komut: { tur: "yontem_degistir", bolge: dugum.id, tesis: tesis.id, yontem: diger } }).tamam).toBe(true);
    const sonra = olcum();
    expect(sonra).toEqual(say());
    expect(sonra.get(`ciftlik|${diger}`)).toBe((once.get(`ciftlik|${diger}`) ?? 0) + 1);
    expect(sonra.get(`ciftlik|${eski}`) ?? 0).toBe((once.get(`ciftlik|${eski}`) ?? 0) - 1);
    expect(metin(sim)).toContain(`bolge_tesis_yontem{tur="ciftlik",yontem="${diger}"} ${sonra.get(`ciftlik|${diger}`)}`);
  });

  it("asinma ceyrekleri tur basina: en yakin sira ceyrekleri (bagimsiz hesapla ayni); asinma verisi olmayan tur yazilmaz", () => {
    const sim = mulkSim();
    const dugum = sim.dunya.bolgeler.find((b) => b.sahip === "ali" && b.merkez !== undefined);
    const t0 = dugum?.tesisler.find((t) => sim.ic.tesisTurleri[t.tur]?.id === "ciftlik");
    if (!dugum || !t0) throw new Error("ciftlik yok");
    [1, 2, 3].forEach((i) => dugum.tesisler.push({ ...t0, id: 9_000 + i }));
    const ciftlikler = sim.dunya.bolgeler.flatMap((b) => b.tesisler).filter((t) => sim.ic.tesisTurleri[t.tur]?.id === "ciftlik");
    expect(ciftlikler.length).toBeGreaterThanOrEqual(4);
    const dizi = [400_000, 100_000, 300_000, 200_000];
    ciftlikler.forEach((t, i) => (t.asinmaPpm = dizi[i % dizi.length] as number));
    const sirali = ciftlikler.map((t) => t.asinmaPpm as number).sort((a, b) => a - b);
    const q = (p: number): number => sirali[Math.ceil((p * sirali.length) / 100) - 1] as number;
    const a = ekonomiOlcumu(sim.dunya, sim.ic).asinma.find((x) => x.tur === "ciftlik");
    expect(a).toEqual({ tur: "ciftlik", adet: ciftlikler.length, c25: q(25), c50: q(50), c75: q(75) });
    const m = metin(sim);
    expect(deger(m, 'bolge_tesis_asinma_ppm{tur="ciftlik",ceyrek="50"}')).toBe(q(50));
    expect(deger(m, 'bolge_tesis_asinma_adet{tur="ciftlik"}')).toBe(ciftlikler.length);
    // Asinma verisi tanimsiz (sanayi kapali) tur: satir yok.
    for (const t of ciftlikler) delete t.asinmaPpm;
    expect(ekonomiOlcumu(sim.dunya, sim.ic).asinma.find((x) => x.tur === "ciftlik")).toBeUndefined();
  });
});

describe("gizlilik, saf okuma", () => {
  it("oyuncu kimligi etiketi/degeri YOK; olcum durumu degistirmez; ayni durumda ayni metin", () => {
    const sim = mulkSim();
    const once = sim.durumOzeti();
    const sayac = new SermayeSayaci();
    sayac.kaydet("ali", "insan", "parsel_al", 5_000);
    sayac.kaydet("veli", "insan", "parsel_al", 9_000);
    const m = metin(sim, { sermaye: sayac.ozet() });
    expect(m).not.toMatch(/\bali\b|\bveli\b|oyuncu=/);
    for (const satir of m.split("\n")) if (satir.includes("bolge_sermaye")) expect(satir).not.toMatch(/ali|veli/);
    expect(metin(sim, { sermaye: sayac.ozet() })).toBe(m);
    expect(sim.durumOzeti()).toBe(once);
  });
});

describe("sermaye komutlari hazine farki (K2-7 yerine; sunucu tarafi)", () => {
  it("SermayeSayaci: komut basina toplam, insan/bot ayrimi, insan oyuncu dagilimi (ceyrekler, kimlik yok)", () => {
    const s = new SermayeSayaci();
    expect(s.ozet().insanOyuncu).toEqual({ sayi: 0, c25: 0, c50: 0, c75: 0, c100: 0 });
    s.kaydet("a", "insan", "parsel_al", 100);
    s.kaydet("a", "insan", "yapi_yerlestir", 400);
    s.kaydet("b", "insan", "parsel_al", 200);
    s.kaydet("c", "insan", "parsel_al", 1_000);
    s.kaydet("d", "insan", "parsel_al", 50);
    s.kaydet("bot1", "bot", "parsel_al", 999_999);
    const o = s.ozet();
    expect(o.komutlar).toEqual([
      { komut: "parsel_al", kaynak: "bot", adet: 1, fark: 999_999 },
      { komut: "parsel_al", kaynak: "insan", adet: 4, fark: 1_350 },
      { komut: "yapi_yerlestir", kaynak: "insan", adet: 1, fark: 400 },
    ]);
    // Insan toplamlari: a=500, b=200, c=1000, d=50 -> sirali 50,200,500,1000 (bot dagilima girmez).
    expect(o.insanOyuncu).toEqual({ sayi: 4, c25: 50, c50: 200, c75: 500, c100: 1_000 });
    expect([...SERMAYE_KOMUTLARI].sort()).toEqual(["kenar_gelistir", "parsel_al", "tesis_insa_hucre", "tesis_olcek_yukselt", "yapi_yerlestir"]);
  });

  it("yazar: basarili sermaye komutu GERCEK hazine farkini yazar (arsa + yapi), basarisiz ve sermaye olmayan komut yazmaz; ozet gunlukten oynatma ile ayni", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await DunyaYazari.ac({ veri: bolMulk(), tohum: 7, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    const gonder = async (o: string, a: string, k: Komut): Promise<boolean> => {
      const p = y.komutGonder(o, "test", a, k);
      await y.birTur();
      return (await p).sonuc.tamam;
    };
    expect(await gonder(SISTEM_OYUNCUSU, "k1", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut)).toBe(true);
    expect(await gonder(SISTEM_OYUNCUSU, "k2", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [], ilce: ILCE } as Komut)).toBe(true);
    saat.ilerlet(SAAT);
    await y.birTur();
    expect(y.metrikler.sermaye.ozet().komutlar).toEqual([]); // katilim sermaye degil
    const [h1, h2] = bitisikSatilabilir(y.sim, ILCE);
    const arsaToplami = (): number => y.sim.dunya.mulk?.para?.lavabo.arsa.n ?? 0; // lavabo.arsa = oyunculardan cikan arsa bedeli
    const arsaOnce = arsaToplami();
    expect(await gonder("ali", "p1", { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" })).toBe(true);
    const arsaFarki = arsaToplami() - arsaOnce;
    expect(arsaFarki).toBeGreaterThan(0);
    let o = y.metrikler.sermaye.ozet();
    const p1 = o.komutlar.find((k) => k.komut === "parsel_al" && k.kaynak === "insan");
    expect(p1?.adet).toBe(1);
    expect(p1?.fark).toBeGreaterThanOrEqual(arsaFarki - 1); // hazine farki >= arsa bedeli (zaman akisiyla gelen kucuk gelir farki kadar sapabilir; kayip yok)
    expect(p1?.fark).toBeLessThanOrEqual(arsaFarki + 1_000_000);
    // Basarisiz sermaye komutu (sahipli hucre) sayilmaz; sermaye olmayan komut sayilmaz.
    expect(await gonder("veli", "p2", { tur: "parsel_al", ilce: ILCE, hucreler: [h1], sinif: "kirsal" })).toBe(false);
    expect(await gonder("ali", "v1", { tur: "vergi_ayarla", oranPpm: 90_000 })).toBe(true);
    expect(y.metrikler.sermaye.ozet().komutlar.find((k) => k.komut === "parsel_al")?.adet).toBe(1);
    expect(y.metrikler.sermaye.ozet().komutlar.some((k) => k.komut === "vergi_ayarla")).toBe(false);
    expect(await gonder("ali", "i1", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler: [h1, h2] })).toBe(true);
    o = y.metrikler.sermaye.ozet();
    const insa = o.komutlar.find((k) => k.komut === "tesis_insa_hucre");
    expect(insa?.adet).toBe(1);
    expect(insa?.fark).toBeGreaterThan(0);
    expect(o.insanOyuncu.sayi).toBe(1); // yalniz ali
    // Metin: dunya toplami ve dagilim, oyuncu etiketi yok.
    const m = metrikMetni(girdi({ sermaye: o }));
    expect(m).toContain('bolge_sermaye_komut_toplam{komut="parsel_al",kaynak="insan"} 1');
    expect(m).toContain("bolge_sermaye_insan_oyuncu_sayisi 1");
    expect(m).toContain('bolge_sermaye_insan_oyuncu_mili{ceyrek="100"} ');
    expect(m).not.toMatch(/\bali\b|\bveli\b/);
    // Ozet DEGISMEDI: gunlugun sifirdan oynatilmasi canli dunya ile ayni (olcum calistirKadar'i onceden cagirir ama notrdur).
    const t = y.sim.dunya.zaman;
    const canli = y.ozet().durumOzeti;
    const yeni = Simulasyon.olustur(bolMulk(), 7);
    for (const k of await depo.gunluk.oku(0)) yeni.uygula({ t: k.t, oyuncu: k.oyuncu, komut: k.komut });
    yeni.calistirKadar(t);
    expect(yeni.durumOzeti()).toBe(canli);
    await y.kapat();
  }, 30_000);

  it("kurtarma: kalan gunluk oynatmasindaki sermaye komutlari da sayilir (kill -9 benzeri); bot sermayesi 'bot' kaynagiyla ayrilir degil -> insan olarak sayilmaz", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const ac = (): Promise<DunyaYazari> => DunyaYazari.ac({ veri: bolMulk(), tohum: 7, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    const y = await ac();
    const gonder = async (o: string, a: string, k: Komut): Promise<void> => {
      const p = y.komutGonder(o, "test", a, k);
      await y.birTur();
      expect((await p).sonuc.tamam, a).toBe(true);
    };
    await gonder(SISTEM_OYUNCUSU, "k1", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: ILCE } as Komut);
    saat.ilerlet(SAAT);
    await y.birTur();
    const [h1, h2] = bitisikSatilabilir(y.sim, ILCE);
    await gonder("ali", "p1", { tur: "parsel_al", ilce: ILCE, hucreler: [h1, h2], sinif: "kirsal" });
    const canli = y.metrikler.sermaye.ozet();
    // kapat YOK: gunluk kuyrugu dolu; yeni yazar kalan kayitlari oynatir.
    const k = await ac();
    const kurtarilan = k.metrikler.sermaye.ozet();
    expect(kurtarilan.komutlar).toEqual(canli.komutlar);
    await k.kapat();
  }, 30_000);

  it("sunucu /metrik: ekonomi ve sermaye aileleri metinde; mulk kipinde para ailesi var; tum metin gecerli Prometheus satirlari", async () => {
    ts = await testSunucusu({ veri: bolMulk() });
    const yonetici = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(yonetici, "ali", []);
    const metinS = await ts.sunucu.metrikMetni();
    expect(metinS).toContain("# TYPE bolge_para_musluk_mili gauge");
    expect(metinS).toContain("# TYPE bolge_pazar_fiyat_taban_orani gauge");
    expect(metinS).toContain("bolge_sermaye_insan_oyuncu_sayisi 0");
    expect(metinS).not.toMatch(/oyuncu="|\bali\b/);
    for (const satir of metinS.split("\n")) {
      if (satir === "" || satir.startsWith("#")) continue;
      expect(satir, satir).toMatch(/^[a-z_][a-z0-9_]*(\{[^}]*\})? -?[0-9.]+(e[+-]?[0-9]+)?$/);
    }
  });
});
