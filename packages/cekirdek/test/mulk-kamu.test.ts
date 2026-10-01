/**
 * Kamu arsası (docs/12 §10, docs/06 §15.6): dört bileşen (mahalle paketi, hazine rezervi, ilçe merkezi, kıyı şeridi), fikstür
 * işaretinin kurala üstünlüğü, determinizm, dondurma, komut redleri, yurt/ayrılmış hücre/sınırlar, muhtarlık, oyuncu kimliği.
 */
import { parselFiksturuYukle, parselHucreDizini } from "@bolge/veri";
import type { ParselFiksturu } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon, SISTEM_OYUNCUSU } from "../src/motor";
import { kanonikSerilestir } from "../src/ozet";
import { hucreBul, hucreXY, kamuBilgisi, kamuBloklari, kamuHucreMi, kamuHucreleri, kenarBitisikMi } from "../src/mulk";
import { anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla, SerilestirmeHatasi } from "../src/serilestir";
import { kamuGruplariGenislet } from "../src/mulk/kamu";
import type { CekirdekVeriPaketi, KamuKumesi } from "../src/tipler";
import { KAMU_KUCUK, KAMU_VARSAYILAN, KAMU_YOGUN, YOGUN_ILCE, kamuIlce, kamuTum, kamuVeri, yogunFikstur } from "./kamu-yardimci";
import { bitisikCift, mulkSim } from "./mulk-yardimci";

const KUCUK_ILCE = "sn_m_ova_merkez";

/** Bozma testlerinde dünyanın gevşek (düzenlenebilir) görünümü. */
interface Gevsek {
  mulk: { kamu: { ilce: string; gruplar: { sahip: string; tur: string; dikdortgenler: number[] }[] }[]; ilceler: { uygunHucre: number }[] };
}

/** Yeni oyuncu paketi kapalı (yurt, ayrılmış hücre, indirim yok): sayı ve hücre seçimi saf kamu kuralını sınar. */
function sade(v: CekirdekVeriPaketi): CekirdekVeriPaketi {
  const yo = (v.param.mulk as NonNullable<typeof v.param.mulk>).yeniOyuncu;
  yo.yurtHucre = 0;
  yo.ilkYapiIndirimPpm = 0;
  yo.indirimliYapiSayisi = 0;
  yo.ayrilmisHucrePpm = 0;
  return v;
}

function yogunVeri(kamu = KAMU_YOGUN, tam = false): CekirdekVeriPaketi {
  const v = kamuVeri(kamu, (x) => {
    x.parsel = yogunFikstur();
  });
  return tam ? v : sade(v);
}

const kucukVeri = (): CekirdekVeriPaketi => sade(kamuVeri(KAMU_KUCUK));

function tur(s: Simulasyon, ilce: string): Record<string, number> {
  const t: Record<string, number> = {};
  for (const g of kamuHucreleri(s.dunya, ilce)) t[g.tur] = (t[g.tur] ?? 0) + g.hucreler.length;
  return t;
}

/** Kamu kümesindeki kenar-bitişik bileşenlerin boyutları. */
function bilesenler(ids: readonly string[]): number[] {
  const kalan = new Set(ids);
  const boyutlar: number[] = [];
  while (kalan.size > 0) {
    const [ilk] = kalan;
    const bilesen = new Set<string>([ilk as string]);
    const yigin = [ilk as string];
    while (yigin.length > 0) {
      const [x, y] = hucreXY(yigin.pop() as string);
      for (const k of [`${x + 1}:${y}`, `${x - 1}:${y}`, `${x}:${y + 1}`, `${x}:${y - 1}`]) {
        if (kalan.has(k) && !bilesen.has(k)) {
          bilesen.add(k);
          yigin.push(k);
        }
      }
    }
    for (const b of bilesen) kalan.delete(b);
    boyutlar.push(bilesen.size);
  }
  return boyutlar;
}

/** Fikstürde, kamu olmayan, kırsal, uygun ilk `n` hücre (ilçede). */
function serbest(s: Simulasyon, ilce: string, n: number, atla = 0): string[] {
  const tanim = s.ic.mulk!.ilceler.get(ilce)!;
  const l = tanim.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamuHucreMi(s.dunya, ilce, h.id) && hucreBul(s.dunya, h.id) === undefined).map((h) => h.id);
  return l.slice(atla, atla + n);
}

describe("dört bileşen (yoğun sentetik ilçe, 70 x 70, lider kararı parametreleriyle)", () => {
  const s = mulkSim([], yogunVeri());
  const f = s.ic.mulk!.fikstur;
  const tanim = f.ilceler.find((c) => c.id === YOGUN_ILCE)!;
  const grup = (turu: string) => kamuHucreleri(s.dunya, YOGUN_ILCE).filter((g) => g.tur === turu);

  it("A. mahalle paketi: her mahalle sabit 20 hücre = meydan 5 + pazar 7 + park 8; her blok kenar-bitişik; sahip k:mahalle:*", () => {
    const mahalleler = new Set(kamuHucreleri(s.dunya, YOGUN_ILCE).filter((g) => g.sahip.startsWith("k:mahalle:")).map((g) => g.sahip));
    expect(mahalleler.size).toBe(Math.floor((2 * tanim.uygunHucre + 500) / 1000)); // uygun / 500, yarım yukarı
    expect(mahalleler.size).toBe(9);
    for (const m of mahalleler) {
      for (const [t, n] of [["meydan", 5], ["pazar", 7], ["park", 8]] as const) {
        const g = kamuHucreleri(s.dunya, YOGUN_ILCE).find((x) => x.sahip === m && x.tur === t)!;
        expect(g.hucreler.length, `${m} ${t}`).toBe(n);
        expect(kenarBitisikMi(g.hucreler)).toBe(true);
      }
    }
    expect(mahalleler.has(`k:mahalle:${YOGUN_ILCE}_1`)).toBe(true);
  });

  it("B. hazine rezervi: uygun hücrelerin %4'ü (aşağı yuvarlanır), sahip k:ilce:*, kenar-bitişik adalar", () => {
    const hazine = grup("hazine");
    expect(hazine.map((g) => g.sahip)).toEqual([`k:ilce:${YOGUN_ILCE}`]);
    expect(hazine[0]!.hucreler.length).toBe(Math.floor((tanim.uygunHucre * 40_000) / 1_000_000));
    expect(hazine[0]!.hucreler.length).toBe(182);
    expect(bilesenler(hazine[0]!.hucreler).every((b) => b >= 1)).toBe(true);
  });

  it("C. ilçe merkezi: 10 hücre, kenar-bitişik, ilçe merkezine yakın (hizmet)", () => {
    const h = grup("hizmet");
    expect(h.length).toBe(1);
    expect(h[0]!.hucreler.length).toBe(10);
    expect(kenarBitisikMi(h[0]!.hucreler)).toBe(true);
    for (const id of h[0]!.hucreler) {
      const [x, y] = hucreXY(id);
      expect(Math.max(Math.abs(x - 900_035), Math.abs(y - 900_035))).toBeLessThanOrEqual(5);
    }
  });

  it("D. kıyı şeridi: su hücresine en çok 2 (Manhattan) uzaklıktaki TÜM uygun hücreler kiyi; başka kiyi yok", () => {
    const dizin = parselHucreDizini(f);
    const beklenen: string[] = [];
    for (const h of tanim.hucreler) {
      if (!h.uygun) continue;
      const [x, y] = hucreXY(h.id);
      let yakin = false;
      for (let dx = -2; dx <= 2; dx++) for (let dy = -2; dy <= 2; dy++) if (Math.abs(dx) + Math.abs(dy) <= 2 && dizin.get(`${x + dx}:${y + dy}`)?.hucre.engel === "su") yakin = true;
      if (yakin) beklenen.push(h.id);
    }
    const kiyi = grup("kiyi")[0]!.hucreler;
    expect(kiyi).toEqual(beklenen.sort());
    expect(kiyi.length).toBe(138); // 2 sütun x 69 satır (bir satır yol)
  });

  it("kümeler ayrık; kamu hücreleri uygun hücrelerdir; toplam = bileşenlerin toplamı; uygunHucre kamu düşülmüş", () => {
    const t = tur(s, YOGUN_ILCE);
    const toplam = Object.values(t).reduce((a, b) => a + b, 0);
    expect(t).toEqual({ hazine: 182, hizmet: 10, kiyi: 138, meydan: 45, park: 72, pazar: 63 });
    const hepsi = kamuHucreleri(s.dunya, YOGUN_ILCE).flatMap((g) => g.hucreler);
    expect(new Set(hepsi).size).toBe(toplam);
    const uygunlar = new Set(tanim.hucreler.filter((h) => h.uygun).map((h) => h.id));
    for (const h of hepsi) expect(uygunlar.has(h)).toBe(true);
    expect(s.dunya.mulk!.ilceler.find((c) => c.id === YOGUN_ILCE)!.uygunHucre).toBe(tanim.uygunHucre - toplam);
  });

  it("iç bölgede (kıyısız) yoğun ilçede toplam ≈ %8-9 (lider kararı)", () => {
    const v = yogunVeri({ ...KAMU_YOGUN, kiyiDerinlik: 0 });
    const s2 = mulkSim([], v);
    const t = tur(s2, YOGUN_ILCE);
    const toplam = Object.values(t).reduce((a, b) => a + b, 0);
    const oran = (toplam * 1000) / tanim.uygunHucre; // binde
    expect(oran).toBeGreaterThanOrEqual(80);
    expect(oran).toBeLessThanOrEqual(90);
    expect(t.kiyi).toBeUndefined();
  });

  it("kıyı ilçesi eşiği: az sulu ilçe kıyı sayılmaz (kiyiIlceMinSuHucre)", () => {
    const v = yogunVeri({ ...KAMU_YOGUN, kiyiIlceMinSuHucre: 100_000 });
    expect(tur(mulkSim([], v), YOGUN_ILCE).kiyi).toBeUndefined();
  });
});

describe("determinizm ve fikstür işareti", () => {
  it("aynı fikstür ve parametre: aynı küme (iki bağımsız kurulum, saf hesap ve dünya durumu)", () => {
    const a = mulkSim([], yogunVeri());
    const b = mulkSim([], yogunVeri());
    expect(kanonikSerilestir(a.dunya.mulk!.kamu)).toBe(kanonikSerilestir(b.dunya.mulk!.kamu));
    const f = a.ic.mulk!.fikstur;
    const k1 = kamuIlce(f, YOGUN_ILCE, KAMU_YOGUN);
    const k2 = kamuIlce(f, YOGUN_ILCE, KAMU_YOGUN);
    expect(k1.kume.gruplar).toEqual(k2.kume.gruplar);
    expect(k1.gruplar).toEqual(kamuHucreleri(a.dunya, YOGUN_ILCE));
    // mini-6 / sentetik-50'de de tekrarlanabilir
    for (const ad of ["mini-6", "sentetik-50"]) {
      const fx = parselFiksturuYukle(ad);
      expect(kamuTum(fx, KAMU_KUCUK)).toEqual(kamuTum(fx, KAMU_KUCUK));
    }
  });

  it("fikstür işareti kurala üstün: işaretli bileşen KURALLA üretilmez; işaretsiz bileşenler yine kuralla", () => {
    const f: ParselFiksturu = structuredClone(parselFiksturuYukle("mini-6"));
    const c = f.ilceler.find((x) => x.id === KUCUK_ILCE)!;
    const uygun = c.hucreler.filter((h) => h.uygun);
    // park (paket bileşeni) 3 hücre, hazine 2 hücre işaretli; merkez ve kıyı kuralla
    for (const h of uygun.slice(0, 3)) h.kamu = "park";
    for (const h of uygun.slice(-2)) h.kamu = "hazine";
    c.mahalleler = [{ id: "mh_a", ad: "A", hucreler: uygun.slice(0, 3).map((h) => h.id) }];
    const v = sade(kamuVeri(KAMU_KUCUK, (x) => {
      x.parsel = f;
    }));
    const s = mulkSim([], v);
    const t = tur(s, KUCUK_ILCE);
    expect(t.park).toBe(3);
    expect(t.meydan).toBeUndefined(); // paket bileşeni işaretliydi: kuralla meydan/pazar üretilmez
    expect(t.pazar).toBeUndefined();
    expect(t.hazine).toBe(2); // %4 (3 hücre) yerine işaret
    expect(t.hizmet).toBe(6); // işaretsiz: kuralla (ilceMerkeziHucre)
    // işaretli park hücrelerinin sahibi mahalle (veri), hazine işaretinin sahibi ilçe
    expect(kamuBilgisi(s.dunya, KUCUK_ILCE, uygun[0]!.id)).toEqual({ tur: "park", sahip: "k:mahalle:mh_a" });
    expect(kamuBilgisi(s.dunya, KUCUK_ILCE, uygun[uygun.length - 1]!.id)).toEqual({ tur: "hazine", sahip: `k:ilce:${KUCUK_ILCE}` });
  });

  it("mahalle verisi varsa mahalle paketi o mahallelerden (kendi sahibiyle) ayrılır; küme yoksa dengeli kd-bölme", () => {
    const f: ParselFiksturu = structuredClone(parselFiksturuYukle("mini-6"));
    const c = f.ilceler.find((x) => x.id === KUCUK_ILCE)!;
    const uygun = c.hucreler.filter((h) => h.uygun).map((h) => h.id);
    c.mahalleler = [
      { id: "mh_yeni", ad: "Yeni", hucreler: uygun.slice(0, 30) },
      { id: "mh_eski", ad: "Eski", hucreler: uygun.slice(30, 60) },
    ];
    const s = mulkSim([], sade(kamuVeri(KAMU_KUCUK, (x) => {
      x.parsel = f;
    })));
    const sahipler = new Set(kamuHucreleri(s.dunya, KUCUK_ILCE).filter((g) => ["meydan", "pazar", "park"].includes(g.tur)).map((g) => g.sahip));
    expect([...sahipler].sort()).toEqual(["k:mahalle:mh_eski", "k:mahalle:mh_yeni"]);
    // verisiz ilçede kd-bölme: ilçe kimliğinden türetilmiş mahalle kimlikleri
    const s2 = mulkSim([], kucukVeri());
    const sahipler2 = new Set(kamuHucreleri(s2.dunya, KUCUK_ILCE).filter((g) => g.tur === "meydan").map((g) => g.sahip));
    expect([...sahipler2].sort()).toEqual([`k:mahalle:${KUCUK_ILCE}_1`, `k:mahalle:${KUCUK_ILCE}_2`]);
  });
});

describe("dondurma ve serileştirme", () => {
  it("dünya kurulurken her ilçe için dondurulur; mulk.kamu parametresi yoksa alan HİÇ yazılmaz (kural kapalı)", () => {
    const s = mulkSim([], kucukVeri());
    expect(s.dunya.mulk!.kamu!.length).toBe(s.ic.mulk!.fikstur.ilceler.length);
    expect(s.dunya.mulk!.kamu!.map((k) => k.ilce)).toEqual([...s.dunya.mulk!.ilceler.map((c) => c.id)]);
    const kapali = mulkSim([], sade(kamuVeri(null)));
    expect("kamu" in kapali.dunya.mulk!).toBe(false);
    expect(kapali.dunya.mulk!.ilceler.find((c) => c.id === KUCUK_ILCE)!.uygunHucre).toBe(81);
  });

  it("serileştirme gidiş-dönüş (dünya ve anlık görüntü): kamu aynen; özet aynı", () => {
    const veri = kucukVeri();
    const s = mulkSim(["a"], veri);
    const metin = dunyaSerilestir(s.dunya);
    expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
    const g = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
    const y = Simulasyon.anlikGoruntudenYukle(veri, g);
    expect(y.durumOzeti()).toBe(s.durumOzeti());
    expect(kanonikSerilestir(y.dunya.mulk!.kamu)).toBe(kanonikSerilestir(s.dunya.mulk!.kamu));
  });

  it("parametre değişse de dondurulmuş küme kayma yapmaz (dünya durumu esastır)", () => {
    const veri = kucukVeri();
    const s = mulkSim(["a"], veri);
    const once = kanonikSerilestir(s.dunya.mulk!.kamu);
    // Yeni parametre: tamamen farklı kamu kuralı (paket 1 hücre, hazine yok, merkez yok)
    const yeni = sade(kamuVeri({ ...KAMU_KUCUK, mahallePaketi: [{ tur: "meydan", hucre: 1 }], hazineRezerviPpm: 0, ilceMerkeziHucre: 0 }));
    const g = anlikGoruntuOlustur(s, kuralSurumuHesapla(veri));
    expect(() => Simulasyon.anlikGoruntudenYukle(yeni, g)).toThrow(/kural surumu uyusmuyor/); // kural sürümü değişti: göç izni gerekir
    const y = Simulasyon.anlikGoruntudenYukle(yeni, g, [], { gocIzni: true });
    expect(kanonikSerilestir(y.dunya.mulk!.kamu)).toBe(once);
    // Eski kamu hücresi yeni kuralda kamu DEĞİL olsa da satılamaz; yeni kuralda kamu olacak ama dondurulmuş kümede olmayan hücre satılabilir
    const eskiKamu = kamuHucreleri(s.dunya, KUCUK_ILCE).find((g2) => g2.tur === "hazine")!.hucreler[0]!;
    const r = y.uygula({ t: y.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: KUCUK_ILCE, hucreler: [eskiKamu], sinif: y.ic.mulk!.hucreler.get(eskiKamu)!.hucre.sinif } });
    expect(r.tamam).toBe(false);
    expect(r.tamam === false && r.hata).toMatch(/kamu arsasi \(satilmaz\)/);
  });

  it("kamu kuralından ÖNCE kurulmuş dünya (kamu alanı yok) yeni parametreyle yüklenir; kural o dünyada kapalıdır", () => {
    const eski = mulkSim(["a"], sade(kamuVeri(null)));
    const veri = kucukVeri();
    const g = anlikGoruntuOlustur(eski, kuralSurumuHesapla(sade(kamuVeri(null))));
    const y = Simulasyon.anlikGoruntudenYukle(veri, g, [], { gocIzni: true });
    expect(y.dunya.mulk!.kamu).toBeUndefined();
    const hucre = y.ic.mulk!.fikstur.ilceler.find((c) => c.id === KUCUK_ILCE)!.hucreler.find((h) => h.uygun && h.sinif === "kirsal" && hucreBul(y.dunya, h.id) === undefined)!;
    expect(y.uygula({ t: y.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: KUCUK_ILCE, hucreler: [hucre.id], sinif: "kirsal" } })).toEqual({ tamam: true });
  });

  it("bozuk kamu durumu reddedilir: sıra, sahipli kamu hücresi, uygunHucre tutarsızlığı, sahip öneki, parametre yok", () => {
    const veri = kucukVeri();
    const s = mulkSim(["a"], veri);
    const metin = dunyaSerilestir(s.dunya);
    const boz = (f: (d: Gevsek) => void): string => {
      const d = JSON.parse(metin) as Gevsek;
      f(d);
      return JSON.stringify(d);
    };
    const hata = (m: string): string => {
      try {
        Simulasyon.yukle(veri, dunyaCoz(m));
      } catch (e) {
        if (e instanceof SerilestirmeHatasi) return e.message;
        throw e;
      }
      return "";
    };
    expect(hata(boz((d) => d.mulk.kamu.reverse()))).toMatch(/kesin artan/);
    expect(hata(boz((d) => (d.mulk.kamu[0]!.gruplar[0]!.sahip = "oyuncu_x")))).toMatch(/'k:' ile baslamali/);
    expect(hata(boz((d) => (d.mulk.kamu[0]!.gruplar[0]!.tur = "yok")))).toMatch(/gecersiz kamu turu/);
    expect(hata(boz((d) => (d.mulk.ilceler[0]!.uygunHucre += 1)))).toMatch(/uygunHucre/);
    expect(hata(boz((d) => d.mulk.kamu.pop()))).toMatch(/her ilce icin bir kayit/);
    // blok kodlaması kanonik olmalı
    expect(hata(boz((d) => d.mulk.kamu[0]!.gruplar[0]!.dikdortgenler.pop()))).toMatch(/dortlusu listesi/);
    expect(hata(boz((d) => { const g = d.mulk.kamu[0]!.gruplar[0]!; g.dikdortgenler[0] = g.dikdortgenler[2]! + 5; }))).toMatch(/dikdortgen ters/);
    // aynı dikdörtgeni iki kez ekle: sıra ihlali (ve çakışma)
    expect(hata(boz((d) => { const g = d.mulk.kamu[0]!.gruplar[0]!; g.dikdortgenler.push(g.dikdortgenler[0]!, g.dikdortgenler[1]!, g.dikdortgenler[2]!, g.dikdortgenler[3]!); }))).toMatch(/kesin artan|cakisan/);
    // iki farklı grubun dikdörtgenleri çakışırsa reddedilir
    expect(hata(boz((d) => { const gs = d.mulk.kamu[0]!.gruplar; gs[1]!.dikdortgenler = [...gs[0]!.dikdortgenler]; }))).toMatch(/cakisan/);
    // kamu dikdörtgeni uygun olmayan hücre (yol/su) içeremez: hücreyi ilçe dışına taşı
    expect(hata(boz((d) => { const g = d.mulk.kamu[0]!.gruplar[0]!; g.dikdortgenler[2] = g.dikdortgenler[2]! + 400; }))).toMatch(/uygun hucre degil|uygunHucre/);
    const kapali = sade(kamuVeri(null));
    expect(() => Simulasyon.yukle(kapali, dunyaCoz(metin))).toThrow(/kamu parametresi/);
  });
});

describe("komutlar: kamu arsası satılmaz", () => {
  const veri = yogunVeri();
  const s = mulkSim(["a"], veri);
  s.calistirKadar(s.dunya.zaman); // t = 0'da bekleyen olaylar işlensin: başarısız komut karşılaştırması temiz başlasın
  const kamuHucre = (turu: string): string => kamuHucreleri(s.dunya, YOGUN_ILCE).find((g) => g.tur === turu)!.hucreler[0]!;
  const sinifi = (id: string) => s.ic.mulk!.hucreler.get(id)!.hucre.sinif;

  it("parsel_al: her kamu türü açık hatayla reddedilir; dünya değişmez", () => {
    for (const turu of ["meydan", "pazar", "park", "hizmet", "hazine", "kiyi"]) {
      const h = kamuHucre(turu);
      const once = s.durumOzeti();
      const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: YOGUN_ILCE, hucreler: [h], sinif: sinifi(h) } });
      expect(r.tamam).toBe(false);
      expect(r.tamam === false && r.hata).toBe(`hucre kamu arsasi (satilmaz): ${h} (${turu}, ${kamuBilgisi(s.dunya, YOGUN_ILCE, h)!.sahip})`);
      expect(s.durumOzeti()).toBe(once);
    }
  });

  it("yapi_yerlestir: kamu hücresi içeren yerleşim reddedilir (hiçbir şey değişmez); kamu olmayan bitişik çift başarılı", () => {
    const m = bitisikCift(kamuHucreleri(s.dunya, YOGUN_ILCE).find((g) => g.tur === "meydan")!.hucreler);
    const once = s.durumOzeti();
    const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "yapi_yerlestir", ilce: YOGUN_ILCE, tesisTuru: "ciftlik", hucreler: m, sinif: sinifi(m[0]) } });
    expect(r.tamam).toBe(false);
    expect(r.tamam === false && r.hata).toMatch(/hucre kamu arsasi \(satilmaz\)/);
    expect(s.durumOzeti()).toBe(once);
    // kamu olmayan, kırsal, bitişik iki hücre
    const tanim = s.ic.mulk!.fikstur.ilceler.find((c) => c.id === YOGUN_ILCE)!;
    const uygunKirsal = new Set(tanim.hucreler.filter((h) => h.uygun && h.sinif === "kirsal" && !kamuHucreMi(s.dunya, YOGUN_ILCE, h.id)).map((h) => h.id));
    let cift: [string, string] | null = null;
    for (const id of [...uygunKirsal].sort()) {
      const [x, y] = hucreXY(id);
      if (uygunKirsal.has(`${x + 1}:${y}`)) {
        cift = [id, `${x + 1}:${y}`];
        break;
      }
    }
    expect(cift).not.toBeNull();
    const ok = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "yapi_yerlestir", ilce: YOGUN_ILCE, tesisTuru: "ciftlik", hucreler: cift as [string, string], sinif: "kirsal" } });
    // ciftlik il etiketine (ova) bağlıdır: yerleşim kamu denetimini geçtiyse hata kamu hatası olmamalı
    expect(ok.tamam === false ? ok.hata : "").not.toMatch(/kamu/);
  });

  it("parsel_birak: kamu hücresi oyuncunun olamaz", () => {
    const h = kamuHucre("park");
    const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_birak", ilce: YOGUN_ILCE, hucreler: [h] } });
    expect(r).toEqual({ tamam: false, hata: `hucre oyuncunun degil: ${h}` });
  });

  it("kamu olmayan hücre satılır (kamu denetimi yalnız kamuyu keser); kamu hücreleri mulk.hucreler'e hiç girmez", () => {
    const id = serbest(s, YOGUN_ILCE, 1)[0]!;
    expect(s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: YOGUN_ILCE, hucreler: [id], sinif: "kirsal" } })).toEqual({ tamam: true });
    for (const g of kamuHucreleri(s.dunya, YOGUN_ILCE)) for (const h of g.hucreler) expect(hucreBul(s.dunya, h)).toBeUndefined();
  });

  it("satılabilir hücre (uygun - kamu) paydadır: %25 sınırı ve fiyat çarpanı", () => {
    const k = mulkSim(["a"], kucukVeri());
    const ilce = k.dunya.mulk!.ilceler.find((c) => c.id === KUCUK_ILCE)!;
    expect(ilce.uygunHucre).toBe(81 - 23);
    // 25% x 58 = 14 hücre
    const ids = serbest(k, KUCUK_ILCE, 15);
    expect(ids.length).toBe(15);
    expect(k.uygula({ t: k.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: KUCUK_ILCE, hucreler: ids, sinif: "kirsal" } })).toEqual({
      tamam: false,
      hata: "ilcenin en cok %25'i (14 hucre; mevcut 0)",
    });
    expect(k.uygula({ t: k.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: KUCUK_ILCE, hucreler: ids.slice(0, 14), sinif: "kirsal" } })).toEqual({ tamam: true });
  });
});

describe("yurt, ayrılmış hücre, oyuncu kimliği, muhtarlık", () => {
  it("yurt kamu hücrelerini atlar: yurt hücreleri kamu değildir ve kenar-bitişiktir (merkeze en yakın kamu alanı atlanır)", () => {
    const v = kamuVeri(KAMU_VARSAYILAN, (x) => {
      x.parsel = yogunFikstur();
      const yo = (x.param.mulk as NonNullable<typeof x.param.mulk>).yeniOyuncu;
      yo.ayrilmisHucrePpm = 0;
    });
    const s = Simulasyon.olustur(v, 3);
    expect(s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: YOGUN_ILCE } })).toEqual({ tamam: true });
    const yurt = s.dunya.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
    expect(yurt.length).toBe(6);
    expect(kenarBitisikMi(yurt)).toBe(true);
    for (const id of yurt) expect(kamuHucreMi(s.dunya, YOGUN_ILCE, id)).toBe(false);
    // kamu olmasaydı yurt merkez bloğunda olurdu: kamusuz kurulumla farklıdır
    const kamusuz = Simulasyon.olustur(kamuVeri(null, (x) => {
      x.parsel = yogunFikstur();
      (x.param.mulk as NonNullable<typeof x.param.mulk>).yeniOyuncu.ayrilmisHucrePpm = 0;
    }), 3);
    kamusuz.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: YOGUN_ILCE } });
    const yurt2 = kamusuz.dunya.mulk!.hucreler.filter((h) => h.sahip === "a").map((h) => h.id);
    expect(yurt2.some((id) => kamuHucreMi(s.dunya, YOGUN_ILCE, id))).toBe(true);
  });

  it("ayrılmış hücre: kamu hücreleri paydaya ve kümeye girmez (satılabilir uygun hücrenin %20'si)", () => {
    const v = kamuVeri(KAMU_KUCUK);
    const s = Simulasyon.olustur(v, 3);
    const mk = s.ic.mulk!;
    for (const c of mk.fikstur.ilceler) {
      const tum = c.hucreler.filter((h) => h.uygun);
      const kamu = new Set(kamuHucreleri(s.dunya, c.id).flatMap((g) => g.hucreler));
      const ayr = [...mk.ayrilmis].filter((h) => mk.hucreler.get(h)!.ilce === c.id);
      expect(ayr.length, c.id).toBe(Math.floor(((tum.length - kamu.size) * 200_000) / 1_000_000));
      for (const h of ayr) expect(kamu.has(h)).toBe(false);
    }
  });

  it("oyuncu_katil: 'k:' önekli kimlik reddedilir (mülk ve bölge kipi)", () => {
    const s = Simulasyon.olustur(kucukVeri(), 3);
    for (const id of ["k:mahalle:x", "k:ilce:sn_m_ova_merkez", "k:il:sn_m_ova", "k:"]) {
      const r = s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: id, bolgeler: [] } });
      expect(r.tamam).toBe(false);
      expect(r.tamam === false && r.hata).toMatch(/'k:' oneki kamu sahiplerine ayrilmis/);
    }
    expect(s.dunya.oyuncular.length).toBe(0);
    const bolge = Simulasyon.olustur({ ...kucukVeri(), parsel: undefined }, 3);
    expect(bolge.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "k:ilce:x", bolgeler: [] } }).tamam).toBe(false);
  });

  it("Muhtarlık mülk kipinde oyuncuya kapalı (kamu yapısı); Ambar açık; kamu bloku yoksa eski davranış", () => {
    const s = mulkSim(["a"], kucukVeri());
    const ids = serbest(s, KUCUK_ILCE, 2);
    s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: KUCUK_ILCE, hucreler: ids, sinif: "kirsal" } });
    const r = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "tesis_insa_hucre", ilce: KUCUK_ILCE, tesisTuru: "muhtarlik", hucreler: [ids[0]!] } });
    expect(r).toEqual({ tamam: false, hata: "muhtarlik kamu yapisidir (oyuncuya kapali)" });
    const r2 = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "tesis_insa_hucre", ilce: KUCUK_ILCE, tesisTuru: "ambar", hucreler: [ids[0]!] } });
    expect(r2.tamam).toBe(true);
    // yapi_yerlestir de aynı kuralı uygular
    const r3 = s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "yapi_yerlestir", ilce: KUCUK_ILCE, tesisTuru: "muhtarlik", hucreler: [serbest(s, KUCUK_ILCE, 1, 3)[0]!], sinif: "kirsal" } });
    expect(r3).toEqual({ tamam: false, hata: "muhtarlik kamu yapisidir (oyuncuya kapali)" });
    // kamu kuralı kapalıysa (eski dünyalar): Muhtarlık yer tutucusu eskisi gibi kurulabilir
    const eski = mulkSim(["a"], sade(kamuVeri(null)));
    const id = serbest(eski, KUCUK_ILCE, 1)[0]!;
    eski.uygula({ t: eski.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: KUCUK_ILCE, hucreler: [id], sinif: "kirsal" } });
    const r4 = eski.uygula({ t: eski.dunya.zaman, oyuncu: "a", komut: { tur: "tesis_insa_hucre", ilce: KUCUK_ILCE, tesisTuru: "muhtarlik", hucreler: [id] } });
    expect(r4.tamam === false ? r4.hata : "").not.toMatch(/kamu yapisidir/);
  });
});

describe("mini-6 ve sentetik-50: oranlar ve değişmezler", () => {
  for (const ad of ["mini-6", "sentetik-50"]) {
    it(`${ad}: ölçeklenmiş paketle her ilçe: hazine = %4, merkez 6, paket mahalle sayısı kadar, hepsi uygun ve ayrık`, () => {
      const f = parselFiksturuYukle(ad);
      const tum = parselHucreDizini(f);
      const kumeler = kamuTum(f, KAMU_KUCUK);
      let toplam = 0;
      let uygun = 0;
      for (const c of f.ilceler) {
        const k = { gruplar: kamuGruplariGenislet((kumeler.get(c.id) as KamuKumesi).gruplar), sayi: (kumeler.get(c.id) as KamuKumesi).sayi };
        const t: Record<string, number> = {};
        for (const g of k.gruplar) t[g.tur] = (t[g.tur] ?? 0) + g.hucreler.length;
        expect(t.hazine ?? 0).toBe(Math.floor((c.uygunHucre * 40_000) / 1_000_000));
        expect(t.hizmet).toBe(6);
        const mahalle = Math.max(1, Math.floor((2 * c.uygunHucre + 40) / 80));
        expect(t.meydan).toBe(2 * mahalle);
        expect(t.park).toBe(3 * mahalle);
        for (const id of k.gruplar.flatMap((g) => g.hucreler)) expect(tum.get(id)!.hucre.uygun).toBe(true);
        toplam += k.sayi;
        uygun += c.uygunHucre;
      }
      // ölçek notu: bu fikstürlerde ilçe başına ~85 uygun hücre var; sabit paket yüzdeyi yükseltir (docs/06 §15.6)
      expect(toplam / uygun).toBeGreaterThan(0.2);
      expect(toplam / uygun).toBeLessThan(0.45);
    });
  }

  it("varsayılan (lider kararı) paket küçük fikstürde ilçeyi %40 kısıtlar: bu yüzden mini/sentetik testleri kamu bloku olmadan koşar", () => {
    const f = parselFiksturuYukle("mini-6");
    expect(kamuIlce(f, KUCUK_ILCE, KAMU_VARSAYILAN).kume.sayi).toBe(33); // 20 + 10 + 3
  });
});

describe("Gebze ölçeği (700 x 700 ≈ 476 bin uygun hücre, kıyılı): bütçe", () => {
  const f = yogunFikstur(700);
  const tanim = f.ilceler.find((c) => c.id === YOGUN_ILCE)!;

  it("kamu durumu ≤ 100 KB ham (kompakt satır aralıkları), hesap ≤ 1 sn (ilçe başına), bileşen sayıları beklenen", () => {
    expect(tanim.uygunHucre).toBeGreaterThan(450_000);
    const t0 = Date.now();
    const { kume, gruplar } = kamuIlce(f, YOGUN_ILCE, KAMU_VARSAYILAN);
    const sure = Date.now() - t0;
    expect(sure).toBeLessThan(3000); // hedef ≤ 1 sn; paylaşımlı makinede gürültüye pay
    const kayit = JSON.stringify({ ilce: YOGUN_ILCE, gruplar: kume.gruplar });
    expect(kayit.length).toBeLessThan(100_000);
    const t: Record<string, number> = {};
    for (const g of gruplar) t[g.tur] = (t[g.tur] ?? 0) + g.hucreler.length;
    expect(t.hazine).toBe(Math.floor((tanim.uygunHucre * 40_000) / 1_000_000));
    expect(t.hizmet).toBe(10);
    const mahalle = Math.max(1, Math.floor((2 * tanim.uygunHucre + 7000) / 14000));
    expect(mahalle).toBeGreaterThan(60);
    expect(t.meydan).toBe(5 * mahalle);
    expect(t.pazar).toBe(7 * mahalle);
    expect(t.park).toBe(8 * mahalle);
    expect(t.kiyi).toBeGreaterThan(1000);
    // her hücre uygun ve tekil
    const hepsi = gruplar.flatMap((g) => g.hucreler);
    expect(new Set(hepsi).size).toBe(hepsi.length);
    expect(hepsi.length).toBe(kume.sayi);
  }, 60_000);

  it("dünya kurulur (kamu dahil), nokta sorgusu ve serileştirme gidiş-dönüşü çalışır; durumOzeti ucuz", () => {
    const v = kamuVeri(KAMU_VARSAYILAN, (x) => {
      x.parsel = f;
    });
    const s = Simulasyon.olustur(v, 3);
    const uygun0 = s.dunya.mulk!.ilceler.find((c) => c.id === YOGUN_ILCE)!.uygunHucre;
    const kamu = s.dunya.mulk!.kamu!.find((k) => k.ilce === YOGUN_ILCE)!;
    let sayi = 0;
    let blok = 0;
    for (const g of kamu.gruplar) for (let i = 0; i < g.dikdortgenler.length; i += 4) {
      sayi += (g.dikdortgenler[i + 2]! - g.dikdortgenler[i]! + 1) * (g.dikdortgenler[i + 3]! - g.dikdortgenler[i + 1]! + 1);
      blok++;
    }
    expect(uygun0).toBe(tanim.uygunHucre - sayi);
    expect(blok).toBeLessThan(5000); // hücre sayısıyla değil geometriyle ölçeklenir
    expect(kamuBloklari(s.dunya, YOGUN_ILCE).length).toBe(blok);
    const g0 = kamu.gruplar[0]!;
    const ornek = `${g0.dikdortgenler[0]}:${g0.dikdortgenler[1]}`;
    expect(kamuHucreMi(s.dunya, YOGUN_ILCE, ornek)).toBe(true);
    expect(kamuHucreMi(s.dunya, YOGUN_ILCE, "1:1")).toBe(false);
    const metin = dunyaSerilestir(s.dunya);
    expect(dunyaSerilestir(dunyaCoz(metin))).toBe(metin);
    const t0 = Date.now();
    s.durumOzeti();
    expect(Date.now() - t0).toBeLessThan(500);
  }, 120_000);
});
