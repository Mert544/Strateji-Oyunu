/**
 * Kompakt hücre dizini (G3b; docs/06 §15.11): `DerlenmisMulk.hucreler` (Map) ve `ayrilmis` (Set) hücre başına nesne tutmaz; ilçe başına BHI1 durum düzlemi.
 * Bu dosya davranış EŞDEĞERLİĞİNİ kanıtlar:
 *  1. bayt eşlemesi ve karma: çekirdeğin kopyası `@bolge/veri` ile 256 baytın hepsinde aynı; `hucreKarmasiXY` = dizeli karma;
 *  2. ayrılmış hücre: eski `Set` yöntemiyle (kopya referans) mevcut bütün fikstürlerde `has`, `size`, sıralı yineleme, ilçe sayıları ve `Set` değişiklikleri aynı;
 *     "10:2" < "9:1" tuzağı (karma eşitliğinde kimlik DİZESİ sırası) büyük ızgarada ayrı sınanır;
 *  3. `hucreler` Map yüzü: fikstür hücreleriyle birebir, fikstür sırasında yineleme (sıra bozuk fikstürde de), katı kimlik biçimi;
 *  4. dünya eşdeğerliği: aynı BHI1'den ızgara girdisiyle ve JSON fikstürüyle kurulan dünya 12 kontrol noktasında aynı `durumOzeti` (yerleşim, kamu, ayrılmış,
 *     bedava yurt, parsel_al, yapi_yerlestir, parsel_birak); fikstür sırası ters olsa da aynı (çekirdek yolları sıradan bağımsız);
 *  5. büyük ilçede tembel hücre dizisi `HucreDiziniBuyukHatasi` fırlatır (sıcak yol API'si kullanılır);
 *  6. okuma hatası komutun ortasında atılırsa dünya DEĞİŞMEMİŞ olur.
 */
import { Bit, arsaSinifi, engelAdi, parselFiksturuYukle } from "@bolge/veri";
import type { Izgara, ParselFiksturu } from "@bolge/veri";
import { describe, expect, it, vi } from "vitest";
import { hucreKarmasi } from "../src/derle";
import { Simulasyon, SISTEM_OYUNCUSU } from "../src/motor";
import { carpBol } from "../src/sabit";
import { HucreDizini, HucreDiziniBuyukHatasi, TEMBEL_HUCRE_SINIRI, durumArsaSinifi, durumEngeli, hucreKarmasiXY } from "../src/mulk/hucreDizini";
import { hucreBul } from "../src/mulk/durum";
import { kamuGrubuHucreKimlikleri, kamuHucreMi, kamuKumeleriHesapla } from "../src/mulk/kamu";
import { PPM, SAAT } from "../src/tipler";
import type { ArsaSinifi, CekirdekVeriPaketi, KamuKumesi } from "../src/tipler";
import { KAMU_KUCUK, KAMU_YOGUN, yogunFikstur } from "./kamu-yardimci";
import { sentetikDunya, sentetikIzgara, sentetikVeri } from "./hucre-dizini-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";

// ---------------------------------------------------------------------------
// 1. bayt eşlemesi ve karma
// ---------------------------------------------------------------------------

describe("1. bayt eşlemesi ve karma", () => {
  it("çekirdeğin durum baytı kopyası `@bolge/veri` ile 256 baytın hepsinde aynı (arsa sınıfı, engel adı)", () => {
    for (let d = 0; d < 256; d++) {
      expect(durumArsaSinifi(d), `durum ${d}`).toBe(arsaSinifi(d));
      expect(durumEngeli(d), `durum ${d}`).toBe(engelAdi(d));
    }
  });

  it("hucreKarmasiXY(x, y) = hucreKarmasi(`${x}:${y}`): sınır değerleri ve 20 000 sahte hücre", () => {
    const sinirlar = [0, 1, 9, 10, 11, 99, 100, 101, 999, 1000, 9999, 10_000, 99_999, 100_000, 1_048_575];
    for (const x of sinirlar) for (const y of sinirlar) expect(hucreKarmasiXY(x, y), `${x}:${y}`).toBe(hucreKarmasi(`${x}:${y}`));
    let s = 99;
    for (let i = 0; i < 20_000; i++) {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const x = s % 1_048_576;
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      const y = s % 1_048_576;
      expect(hucreKarmasiXY(x, y)).toBe(hucreKarmasi(`${x}:${y}`));
    }
  });
});

// ---------------------------------------------------------------------------
// 2. ayrılmış hücre kümesi: eski Set yöntemi (referans) ile aynı
// ---------------------------------------------------------------------------

/** ESKİ yöntem (derle.ts `ayrilmisHucreler`, G3b öncesi; kopya referans): ilçe uygun ∧ ¬kamu hücreleri (karma, kimlik DİZESİ) sırasıyla; ilk `floor(n × ppm / PPM)`. */
function ayrilmisReferans(f: ParselFiksturu, ayrilmisPpm: number, kamu?: ReadonlyMap<string, KamuKumesi>): { kume: Set<string>; sayilar: Map<string, number> } {
  const kume = new Set<string>();
  const sayilar = new Map<string, number>();
  if (ayrilmisPpm <= 0) return { kume, sayilar };
  for (const c of f.ilceler) {
    const kk = kamu?.get(c.id);
    const kamuKimlikleri = new Set<string>();
    for (const gr of kk?.gruplar ?? []) for (const id of kamuGrubuHucreKimlikleri(gr)) kamuKimlikleri.add(id);
    const uygun = c.hucreler.filter((h) => h.uygun && !kamuKimlikleri.has(h.id)).map((h) => ({ id: h.id, k: hucreKarmasi(h.id) }));
    const adet = carpBol(uygun.length, ayrilmisPpm, PPM);
    if (adet <= 0) continue;
    uygun.sort((x, y) => x.k - y.k || (x.id < y.id ? -1 : x.id > y.id ? 1 : 0));
    for (let i = 0; i < adet; i++) kume.add((uygun[i] as { id: string }).id);
    sayilar.set(c.id, adet);
  }
  return { kume, sayilar };
}

const SONDALAR = ["0:0", "1:2", "01:2", " 1:2", "1:2 ", "1:2:3", "a:b", "-1:2", "1:-2", ":", "1:", ":1", "", "999999999:1", "1.5:2", "1e3:2"];

function ayrilmisKarsilastir(f: ParselFiksturu, ppm: number, kamu: ReadonlyMap<string, KamuKumesi> | undefined): void {
  const ref = ayrilmisReferans(f, ppm, kamu);
  const dz = HucreDizini.fiksturden(f);
  const sayilar = dz.ayrilmisKur(ppm, kamu);
  expect([...sayilar]).toEqual([...ref.sayilar]);
  expect(dz.ayrilmis.size).toBe(ref.kume.size);
  // her hücrede ve sonda kimliklerde `has`
  for (const c of f.ilceler) for (const h of c.hucreler) expect(dz.ayrilmis.has(h.id), h.id).toBe(ref.kume.has(h.id));
  for (const id of SONDALAR) expect(dz.ayrilmis.has(id), `sonda "${id}"`).toBe(false);
  // sıralı yineleme: ESKİ Set ekleme sırası (ilçe sırası; ilçe içinde (karma, kimlik) artan)
  expect([...dz.ayrilmis]).toEqual([...ref.kume]);
  // ilçe listesi: kimliğe göre sıralı
  for (const c of f.ilceler) expect([...dz.ayrilmisListe(c.id)], c.id).toEqual([...ref.kume].filter((id) => c.hucreler.some((h) => h.id === id)).sort());
  expect(dz.ayrilmisListe("yok")).toEqual([]);
}

describe("2. ayrılmış hücre: eşik + eşitlik kümesi, eski Set yöntemiyle aynı", () => {
  const fikstürler: [string, () => ParselFiksturu, ReturnType<typeof kamuAyari>][] = [
    ["mini-6", () => parselFiksturuYukle("mini-6"), kamuAyari(KAMU_KUCUK)],
    ["sentetik-50", () => parselFiksturuYukle("sentetik-50"), kamuAyari(KAMU_KUCUK)],
    ["yoğun 70 x 70", () => yogunFikstur(), kamuAyari(KAMU_YOGUN)],
  ];
  function kamuAyari(kp: typeof KAMU_KUCUK): (f: ParselFiksturu) => Map<string, KamuKumesi> {
    return (f) => kamuKumeleriHesapla(f, kp);
  }

  for (const [ad, yukle, kamuHesap] of fikstürler) {
    for (const ppm of [1, 200_000, 333_333, 999_999, PPM]) {
      for (const kamuVar of [false, true]) {
        it(`${ad}, ppm ${ppm}, kamu ${kamuVar ? "var" : "yok"}: has, size, yineleme, ilçe sayıları ve listeler aynı`, () => {
          const f = yukle();
          ayrilmisKarsilastir(f, ppm, kamuVar ? kamuHesap(f) : undefined);
        });
      }
    }
    it(`${ad}: ppm 0 ve negatif ayrılmış hücre üretmez`, () => {
      const f = yukle();
      for (const ppm of [0, -5]) {
        const dz = HucreDizini.fiksturden(f);
        expect([...dz.ayrilmisKur(ppm)]).toEqual([]);
        expect(dz.ayrilmis.size).toBe(0);
        expect([...dz.ayrilmis]).toEqual([]);
      }
    });
  }

  it("Set değişiklikleri (add, delete, clear) eski Set ile aynı davranır: has, size, yineleme sırası", () => {
    const f = yogunFikstur();
    const kamu = kamuKumeleriHesapla(f, KAMU_YOGUN);
    const ref = ayrilmisReferans(f, 200_000, kamu).kume;
    const dz = HucreDizini.fiksturden(f);
    dz.ayrilmisKur(200_000, kamu);
    const ilk = [...ref];
    expect([...dz.ayrilmis]).toEqual(ilk);
    const bos = f.ilceler[0]!.hucreler.find((h) => h.uygun && !ref.has(h.id))!.id;
    // silme: üyeler çıkar, olmayan silinmez; geri ekleme tabana döner
    for (const id of ilk.slice(0, 5)) {
      expect(dz.ayrilmis.delete(id)).toBe(ref.delete(id));
      expect(dz.ayrilmis.has(id)).toBe(false);
    }
    expect(dz.ayrilmis.delete(bos)).toBe(ref.delete(bos));
    expect(dz.ayrilmis.size).toBe(ref.size);
    expect([...dz.ayrilmis]).toEqual([...ref]);
    // ekleme: taban dışı hücre sona girer; zaten üye olan eklenmez
    dz.ayrilmis.add(bos);
    ref.add(bos);
    dz.ayrilmis.add(ilk[10]!);
    ref.add(ilk[10]!);
    expect(dz.ayrilmis.size).toBe(ref.size);
    expect([...dz.ayrilmis]).toEqual([...ref]);
    // silinen üye geri eklenir: eski Set'te sona girer, burada tabana döner (sıra farkı yalnız bu uç durumda; küme eşit)
    const gecici = ilk[0]!;
    dz.ayrilmis.add(gecici);
    expect(dz.ayrilmis.has(gecici)).toBe(true);
    // clear: boşalır; sonra eklenenler yalnızca eklenenlerdir
    dz.ayrilmis.clear();
    ref.clear();
    expect(dz.ayrilmis.size).toBe(0);
    expect([...dz.ayrilmis]).toEqual([]);
    expect(dz.ayrilmis.has(ilk[3]!)).toBe(false);
    dz.ayrilmis.add(bos);
    ref.add(bos);
    expect(dz.ayrilmis.has(bos)).toBe(true);
    expect(dz.ayrilmis.size).toBe(ref.size);
    expect([...dz.ayrilmis]).toEqual([...ref]);
    expect(dz.ayrilmisListe(f.ilceler[0]!.id)).toEqual([bos]);
  });

  it('"10:2" < "9:1" tuzağı: karması eşit hücrelerde sıra kimlik DİZESİYLEdir (sayısal sıra değil); eşik eşitlik grubunun ortasına düşer', () => {
    const N = 1200; // x: 0..1199 (1, 2, 3 ve 4 haneli); 1,44 M hücre
    const ig: Izgara = { x0: 0, y0: 0, genislik: N, yukseklik: N, durum: new Uint8Array(N * N).fill(Bit.ICERIDE | (1 << 5)) };
    const dz = HucreDizini.izgaradan({ ad: "tuzak", harita: "mini-6", tohum: 0, iller: [{ id: "i", ad: "I", bolge: "b" }], ilceler: [{ id: "i_a", ad: "A", il: "i", bolge: "b", izgara: ig }] });
    const m = N * N;
    const KATSAYI = 2_097_152; // 2^21 > m
    const anahtarlar = new Float64Array(m);
    for (let i = 0; i < m; i++) anahtarlar[i] = hucreKarmasiXY(i % N, Math.floor(i / N)) * KATSAYI + i;
    anahtarlar.sort();
    // eşitlik grupları; eşik değerinin grubun ORTASINA düşeceği (1 <= gerek < boyut) ve dize sırası ile sayısal sırası ayrışan bir grup
    let secilen: { baslangic: number; boyut: number; gerek: number; ppm: number; tuzak: boolean } | null = null;
    for (let i = 0; i < m && secilen === null; ) {
      let j = i + 1;
      const k = Math.floor((anahtarlar[i] as number) / KATSAYI);
      while (j < m && Math.floor((anahtarlar[j] as number) / KATSAYI) === k) j++;
      const boyut = j - i;
      if (boyut >= 2) {
        for (let gerek = 1; gerek < boyut; gerek++) {
          const adet = i + gerek;
          const ppm = Math.ceil((adet * PPM) / m);
          if (carpBol(m, ppm, PPM) !== adet) continue;
          const uyeler = [];
          for (let q = i; q < j; q++) {
            const idx = (anahtarlar[q] as number) % KATSAYI;
            uyeler.push({ x: idx % N, y: Math.floor(idx / N) });
          }
          const kimlik = uyeler.map((u) => `${u.x}:${u.y}`);
          const diziSirasi = [...kimlik].sort();
          const sayisal = [...uyeler].sort((a, b) => a.y - b.y || a.x - b.x).map((u) => `${u.x}:${u.y}`);
          const tuzak = diziSirasi[0] !== sayisal[0];
          if (tuzak || i > m / 2) {
            secilen = { baslangic: i, boyut, gerek, ppm, tuzak };
            break;
          }
        }
      }
      i = j;
    }
    expect(secilen, "karması eşit hücre grubu (1,44 M hücrede beklenen ≈ 240 grup)").not.toBeNull();
    const s = secilen as NonNullable<typeof secilen>;
    expect(s.tuzak, "dize sırası ile sayısal sıra ayrışan eşik grubu bulundu").toBe(true);
    dz.ayrilmisKur(s.ppm);
    const adet = s.baslangic + s.gerek;
    expect(dz.ayrilmis.size).toBe(adet);
    // beklenen: eşitlik grubunun (kimlik DİZESİ sırasıyla) ilk `gerek` üyesi ayrılmış
    const k = Math.floor((anahtarlar[s.baslangic] as number) / KATSAYI);
    const grup: string[] = [];
    for (let q = s.baslangic; q < s.baslangic + s.boyut; q++) {
      const idx = (anahtarlar[q] as number) % KATSAYI;
      grup.push(`${idx % N}:${Math.floor(idx / N)}`);
    }
    grup.sort();
    // dizeli karma ile de eşit (tuzağın kendisi karma eşitliğine dayanır)
    for (const id of grup) expect(hucreKarmasi(id)).toBe(k);
    grup.forEach((id, i) => expect(dz.ayrilmis.has(id), `${id} (dize sırası ${i}/${s.gerek})`).toBe(i < s.gerek));
    // tüm hücrelerde sayım: ayrılmış sayısı `size` ile aynı
    let sayi = 0;
    dz.gez(0, (x, y, b) => {
      if (dz.tabanAyrilmisMi(0, x, y, b)) sayi++;
    });
    expect(sayi).toBe(adet);
  }, 120_000);
});

// ---------------------------------------------------------------------------
// 3. hucreler Map yüzü
// ---------------------------------------------------------------------------

describe("3. hucreler (Map yüzü): fikstür hücreleriyle birebir", () => {
  it("mini-6, sentetik-50, yoğun: get = fikstür hücresi, has, size, anahtar sırası = fikstür sırası", () => {
    for (const f of [parselFiksturuYukle("mini-6"), parselFiksturuYukle("sentetik-50"), yogunFikstur()]) {
      const dz = HucreDizini.fiksturden(f);
      let toplam = 0;
      const sira: string[] = [];
      for (const c of f.ilceler) {
        for (const h of c.hucreler) {
          toplam++;
          sira.push(h.id);
          const k = dz.hucreler.get(h.id);
          expect(k, h.id).toEqual({ ilce: c.id, hucre: h });
          expect(dz.hucreler.has(h.id)).toBe(true);
        }
      }
      expect(dz.hucreler.size).toBe(toplam);
      expect([...dz.hucreler.keys()]).toEqual(sira);
      for (const id of SONDALAR) {
        expect(dz.hucreler.get(id), `sonda "${id}"`).toBeUndefined();
        expect(dz.hucreler.has(id)).toBe(false);
      }
    }
  });

  it("alanlar korunur: kamu işareti, orman kullanımı, koruma engeli, sınıflar; sıra satır öncelikli olmayan fikstürde de fikstür sırası", () => {
    const f = structuredClone(parselFiksturuYukle("mini-6"));
    const c = f.ilceler[0] as ParselFiksturu["ilceler"][number];
    c.hucreler.reverse(); // satır öncelikli değil
    const uygun = c.hucreler.filter((h) => h.uygun);
    (uygun[0] as { kamu?: string }).kamu = "park";
    (uygun[1] as unknown as { kullanim: string }).kullanim = "orman";
    const engelli = c.hucreler.find((h) => !h.uygun) as ParselFiksturu["ilceler"][number]["hucreler"][number];
    engelli.engel = "koruma";
    const dz = HucreDizini.fiksturden(f);
    expect([...dz.hucreler.keys()].slice(0, c.hucreler.length)).toEqual(c.hucreler.map((h) => h.id));
    expect(dz.hucreler.get(uygun[0]!.id)!.hucre.kamu).toBe("park");
    expect((dz.hucreler.get(uygun[1]!.id)!.hucre as unknown as { kullanim?: string }).kullanim).toBe("orman");
    expect(dz.hucreler.get(engelli.id)!.hucre).toEqual({ id: engelli.id, sinif: engelli.sinif, uygun: false, engel: "koruma" });
    expect(dz.ormanMi(0, ...(uygun[1]!.id.split(":").map(Number) as [number, number]))).toBe(true);
    const ids = [...dz.ilceHucreleri(c.id)].map((h) => `${h.x}:${h.y}`);
    expect(ids).toEqual(c.hucreler.map((h) => h.id));
    for (const h of c.hucreler) expect(dz.hucreler.get(h.id)).toEqual({ ilce: c.id, hucre: h });
  });

  it("kurucu hataları: ilçe içinde ve ilçeler arasında tekrarlanan hücre, tutarsız uygun/engel, geçersiz kimlik", () => {
    const tekrar = structuredClone(parselFiksturuYukle("mini-6"));
    tekrar.ilceler[0]!.hucreler.push({ ...tekrar.ilceler[0]!.hucreler[0]! });
    expect(() => HucreDizini.fiksturden(tekrar)).toThrow(/hucre iki kez tanimli: \d+:\d+/);
    const capraz = structuredClone(parselFiksturuYukle("mini-6"));
    capraz.ilceler[1]!.hucreler[0] = { ...capraz.ilceler[1]!.hucreler[0]!, id: capraz.ilceler[0]!.hucreler[0]!.id };
    expect(() => HucreDizini.fiksturden(capraz)).toThrow(/hucre iki kez tanimli: /);
    const tutarsiz = structuredClone(parselFiksturuYukle("mini-6"));
    tutarsiz.ilceler[0]!.hucreler.find((h) => h.uygun)!.engel = "yol";
    expect(() => HucreDizini.fiksturden(tutarsiz)).toThrow(/uygun hucre engel tasiyamaz/);
    const engelsiz = structuredClone(parselFiksturuYukle("mini-6"));
    delete engelsiz.ilceler[0]!.hucreler.find((h) => !h.uygun)!.engel;
    expect(() => HucreDizini.fiksturden(engelsiz)).toThrow(/engel nedeni zorunlu/);
    const kotu = structuredClone(parselFiksturuYukle("mini-6"));
    kotu.ilceler[0]!.hucreler[0]!.id = "01:2";
    expect(() => HucreDizini.fiksturden(kotu)).toThrow(/gecersiz hucre kimligi/);
  });

  it("iki girdi birlikte verilemez; parselIzgara tek başına mülk kipini açar", () => {
    const d = sentetikDunya(20);
    const v = sentetikVeri("izgara", d);
    expect(Simulasyon.olustur(v, 1).ic.mulk).toBeDefined();
    const ikisi = sentetikVeri("izgara", d);
    ikisi.parsel = structuredClone(d.fikstur);
    expect(() => Simulasyon.olustur(ikisi, 1)).toThrow(/parsel ve parselIzgara birlikte verilemez/);
    const mulksuz = sentetikVeri("izgara", d);
    delete mulksuz.param.mulk;
    expect(Simulasyon.olustur(mulksuz, 1).ic.mulk).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// 4. dünya eşdeğerliği: ızgara girdisi = JSON fikstürü
// ---------------------------------------------------------------------------

interface Kosu {
  ozetler: string[];
  sonuclar: string[];
  basarili: number;
  sim: Simulasyon;
}

/** Aynı komut dizisi (hücre seçimi dizinden, deterministik): bedava yurtlu katılımlar, parsel_al, yapi_yerlestir, parsel_birak; 12 kontrol noktasında tam özet. */
function senaryo(veri: CekirdekVeriPaketi, tohum = 11): Kosu {
  const s = Simulasyon.olustur(veri, tohum);
  const dz = s.ic.mulk!.dizin;
  const ozetler: string[] = [];
  const sonuclar: string[] = [];
  let basarili = 0;
  const kaydet = (ad: string, r: { tamam: true } | { tamam: false; hata: string }): void => {
    sonuclar.push(`${ad}: ${r.tamam ? "tamam" : r.hata}`);
    if (r.tamam) basarili++;
  };
  const oyuncular: [string, string | undefined][] = [
    ["a", "sn_m_ova_merkez"],
    ["b", "sn_m_liman_merkez"],
    ["c", "sn_m_ova_merkez"],
    ["d", undefined],
  ];
  for (const [o, ilce] of oyuncular) {
    kaydet(`katil ${o}`, s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: o, bolgeler: [], ...(ilce !== undefined ? { ilce } : {}) } }));
  }
  ozetler.push(s.durumOzeti());
  // Aday hücreler (y, x) sırasına SIRALANIR: seçim fikstür/dizin yineleme sırasından bağımsızdır (sıra bağımsızlığı testi için).
  const adaylar = (ilce: string, sinif: ArsaSinifi): { x: number; y: number; id: string }[] => {
    const l: { x: number; y: number; id: string }[] = [];
    for (const h of dz.ilceHucreleri(ilce)) {
      const id = `${h.x}:${h.y}`;
      if ((h.durum & 14) !== 0 || arsaSinifi(h.durum) !== sinif) continue;
      if (hucreBul(s.dunya, id) !== undefined || kamuHucreMi(s.dunya, ilce, id)) continue;
      l.push({ x: h.x, y: h.y, id });
    }
    return l.sort((p, q) => p.y - q.y || p.x - q.x);
  };
  const serbest = (ilce: string, sinif: ArsaSinifi, atla: number, adet: number): string[] => adaylar(ilce, sinif).slice(atla, atla + adet).map((c) => c.id);
  const bitisikCift = (ilce: string, sinif: ArsaSinifi, atla: number): string[] => {
    const l = adaylar(ilce, sinif);
    let n = 0;
    for (let i = 1; i < l.length; i++) {
      const p = l[i - 1] as { x: number; y: number; id: string };
      const q = l[i] as { x: number; y: number; id: string };
      if (p.y === q.y && p.x + 1 === q.x && n++ >= atla) return [p.id, q.id];
    }
    return [];
  };
  for (let k = 1; k <= 12; k++) {
    s.calistirKadar(k * 12 * SAAT);
    const t = s.dunya.zaman;
    for (const [o, ilce] of oyuncular) {
      const il = ilce ?? "sn_m_ova_merkez";
      const kirsal = serbest(il, "kirsal", k * 7, 3);
      if (kirsal.length === 3) kaydet(`al ${o} ${k}`, s.uygula({ t, oyuncu: o, komut: { tur: "parsel_al", ilce: il, hucreler: kirsal, sinif: "kirsal" } }));
      if (k % 3 === 0) {
        const cift = bitisikCift(il, "kirsal", k);
        if (cift.length === 2) kaydet(`yapi ${o} ${k}`, s.uygula({ t, oyuncu: o, komut: { tur: "yapi_yerlestir", ilce: il, tesisTuru: "ciftlik", hucreler: cift, sinif: "kirsal" } }));
      }
      if (k === 8) {
        const benim = s.dunya.mulk!.hucreler.filter((h) => h.sahip === o && h.tesis === undefined && h.insaat === undefined && h.degerMili > 0).slice(0, 2).map((h) => h.id);
        if (benim.length > 0) kaydet(`birak ${o}`, s.uygula({ t, oyuncu: o, komut: { tur: "parsel_birak", ilce: s.dunya.mulk!.hucreler.find((h) => h.id === benim[0])!.ilce, hucreler: benim } }));
      }
    }
    ozetler.push(s.durumOzeti());
  }
  return { ozetler, sonuclar, basarili, sim: s };
}

describe("4. dünya eşdeğerliği: aynı BHI1'den ızgara girdisi ve JSON fikstürü", () => {
  const d = sentetikDunya(60);

  it("12 kontrol noktasında tam durumOzeti ve komut sonuçları aynı (yerleşim, kamu, ayrılmış, yurt, parsel_al, yapi_yerlestir, parsel_birak)", () => {
    const iz = senaryo(sentetikVeri("izgara", d));
    const js = senaryo(sentetikVeri("json", d));
    expect(iz.ozetler).toHaveLength(13);
    expect(iz.ozetler).toEqual(js.ozetler);
    expect(iz.sonuclar).toEqual(js.sonuclar);
    // kanıt boş değil: yurt, arsa alımı ve yapı yerleşimi gerçekten gerçekleşti; kamu ve ayrılmış hücre var
    expect(iz.basarili).toBeGreaterThan(30);
    expect(iz.sonuclar.some((r) => r.startsWith("yapi") && r.endsWith("tamam"))).toBe(true);
    expect(iz.sonuclar.some((r) => r.startsWith("birak") && r.endsWith("tamam"))).toBe(true);
    const mk = iz.sim.ic.mulk!;
    expect(iz.sim.dunya.mulk!.kamu!.every((k) => k.gruplar.length > 0)).toBe(true);
    expect(mk.ayrilmis.size).toBeGreaterThan(100);
    expect(iz.sim.dunya.mulk!.hucreler.some((h) => h.degerMili === 0)).toBe(true); // bedava yurt
    expect(new Set(iz.ozetler).size).toBeGreaterThan(8); // dünya gerçekten ilerliyor
    // dizin yüzleri iki yoldan aynı
    const mj = js.sim.ic.mulk!;
    expect([...mk.ayrilmis]).toEqual([...mj.ayrilmis]);
    expect([...mk.ayrilmisIlceSayisi]).toEqual([...mj.ayrilmisIlceSayisi]);
    expect(mk.hucreler.size).toBe(mj.hucreler.size);
    for (const c of d.fikstur.ilceler) for (const h of c.hucreler) expect(mk.hucreler.get(h.id), h.id).toEqual(mj.hucreler.get(h.id));
    expect([...mk.hucreler.keys()]).toEqual([...mj.hucreler.keys()]);
    expect(mk.fikstur.ilceler.map((c) => ({ id: c.id, il: c.il, sinif: c.sinif, seviye: c.seviye, hucreSayisi: c.hucreSayisi, uygunHucre: c.uygunHucre }))).toEqual(
      mj.fikstur.ilceler.map((c) => ({ id: c.id, il: c.il, sinif: c.sinif, seviye: c.seviye, hucreSayisi: c.hucreSayisi, uygunHucre: c.uygunHucre })),
    );
  }, 120_000);

  it("fikstür hücre sırası ters olsa da aynı dünya (kamu, yurt, ayrılmış seçimi dizi sırasından bağımsız); iki tohumda", () => {
    const ters = (v: CekirdekVeriPaketi): CekirdekVeriPaketi => {
      for (const c of v.parsel!.ilceler) c.hucreler.reverse();
      return v;
    };
    for (const tohum of [3, 11]) {
      const duz = senaryo(sentetikVeri("json", d), tohum);
      const tr = senaryo(ters(sentetikVeri("json", d)), tohum);
      expect(tr.ozetler).toEqual(duz.ozetler);
      expect(tr.sonuclar).toEqual(duz.sonuclar);
    }
  }, 120_000);

  it("serileştir → çöz → yükle: ızgara dünyasının anlık görüntüsü JSON dünyasıyla aynı özete yüklenir", async () => {
    const { anlikGoruntuOlustur, kuralSurumuHesapla } = await import("../src/serilestir");
    const veri = sentetikVeri("izgara", d);
    const k = senaryo(veri);
    const metin = anlikGoruntuOlustur(k.sim, kuralSurumuHesapla(veri));
    const yuklenen = Simulasyon.anlikGoruntudenYukle(sentetikVeri("json", d), metin, []);
    expect(yuklenen.durumOzeti()).toBe(k.sim.durumOzeti());
  }, 120_000);
});

describe("4b. Gebze'nin ~1/10'u (~50 bin hücre, kapı boyutu): ızgara girdisi = JSON fikstürü", () => {
  it("iki ilçede toplam ~50 bin hücre; 12 kontrol noktasında tam durumOzeti ve komut sonuçları aynı", () => {
    const d = sentetikDunya(165);
    const toplam = d.fikstur.ilceler.reduce((a, c) => a + c.hucreSayisi, 0);
    expect(toplam).toBeGreaterThan(45_000);
    expect(toplam).toBeLessThan(65_000);
    const iz = senaryo(sentetikVeri("izgara", d));
    const js = senaryo(sentetikVeri("json", d));
    expect(iz.ozetler).toEqual(js.ozetler);
    expect(iz.sonuclar).toEqual(js.sonuclar);
    expect(iz.basarili).toBeGreaterThan(30);
    expect(new Set(iz.ozetler).size).toBeGreaterThan(8);
    expect([...iz.sim.ic.mulk!.ayrilmis]).toEqual([...js.sim.ic.mulk!.ayrilmis]);
  }, 240_000);
});

// ---------------------------------------------------------------------------
// 5. tembel hücre dizisi sınırı
// ---------------------------------------------------------------------------

describe("5. büyük ilçede tembel hücre dizisi: HucreDiziniBuyukHatasi", () => {
  it("≤ sınır: dizi açılır ve fikstür sırasında doğru hücreleri verir; numaralandırılamaz alan (JSON/structuredClone tetiklemez)", () => {
    const d = sentetikDunya(60);
    const s = Simulasyon.olustur(sentetikVeri("izgara", d), 1);
    const c = s.ic.mulk!.fikstur.ilceler.find((x) => x.id === "sn_m_ova_merkez")!;
    expect(Object.keys(c)).not.toContain("hucreler");
    expect(() => structuredClone({ ...c })).not.toThrow();
    const ref = d.fikstur.ilceler.find((x) => x.id === "sn_m_ova_merkez")!;
    expect(c.hucreler).toEqual(ref.hucreler);
    expect(c.hucreler).toBe(c.hucreler); // önbellek
  });

  it(`> ${TEMBEL_HUCRE_SINIRI} hücre: okunur hata, ileti sıcak yol API'sini söyler; ilceHucreleri() ve hucreDurum() çalışır`, () => {
    const N = 300; // 90 000 hücre
    const veri = mulkVeriTam();
    delete veri.parsel;
    veri.parselIzgara = {
      ad: "buyuk",
      harita: "mini-6",
      tohum: 0,
      iller: [{ id: "sn_m_ova", ad: "Ova", bolge: "m_ova" }],
      ilceler: [{ id: "sn_m_ova_merkez", ad: "Ova", il: "sn_m_ova", bolge: "m_ova", izgara: sentetikIzgara(N, 500_000, 500_000, 4) }],
    };
    const s = Simulasyon.olustur(veri, 1);
    const c = s.ic.mulk!.fikstur.ilceler[0]!;
    expect(c.hucreSayisi).toBeGreaterThan(TEMBEL_HUCRE_SINIRI);
    let hata: unknown;
    try {
      void c.hucreler;
    } catch (e) {
      hata = e;
    }
    expect(hata).toBeInstanceOf(HucreDiziniBuyukHatasi);
    expect((hata as HucreDiziniBuyukHatasi).message).toMatch(/ilceHucreleri\(\) ya da hucreDurum\(\) kullan/);
    expect((hata as HucreDiziniBuyukHatasi).ilce).toBe("sn_m_ova_merkez");
    expect((hata as HucreDiziniBuyukHatasi).hucreSayisi).toBe(c.hucreSayisi);
    expect((hata as Error).name).toBe("HucreDiziniBuyukHatasi");
    // sıcak yol çalışır
    const dz = s.ic.mulk!.dizin;
    let n = 0;
    for (const h of dz.ilceHucreleri("sn_m_ova_merkez")) {
      n++;
      expect(dz.hucreDurum(h.x, h.y) & 255).toBe(h.durum);
    }
    expect(n).toBe(c.hucreSayisi);
    expect(dz.hucreDurum(0, 0)).toBe(-1);
  }, 60_000);
});

// ---------------------------------------------------------------------------
// 6. okuma hatası komutun ortasında: dünya değişmez
// ---------------------------------------------------------------------------

describe("6. okuma hatası (HucreDiziniBuyukHatasi) komut sırasında atılırsa dünya DEĞİŞMEMİŞ olur", () => {
  function hazirDunya(): Simulasyon {
    const s = Simulasyon.olustur(sentetikVeri("izgara", sentetikDunya(40)), 5);
    s.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "a", bolgeler: [], ilce: "sn_m_ova_merkez" } });
    s.calistirKadar(3 * SAAT);
    return s;
  }
  const hata = (): never => {
    throw new HucreDiziniBuyukHatasi("sn_m_ova_merkez", 99_999);
  };

  it("parsel_al ve yapi_yerlestir: hücre okuması (hucreler.get) atar; özet, hazine ve günlük aynı", () => {
    const s = hazirDunya();
    const dz = s.ic.mulk!.dizin;
    const l: { x: number; y: number; id: string }[] = [];
    for (const h of dz.ilceHucreleri("sn_m_ova_merkez")) {
      const id = `${h.x}:${h.y}`;
      if ((h.durum & 14) === 0 && arsaSinifi(h.durum) === "kirsal" && hucreBul(s.dunya, id) === undefined && !kamuHucreMi(s.dunya, "sn_m_ova_merkez", id)) l.push({ x: h.x, y: h.y, id });
    }
    l.sort((p, q) => p.y - q.y || p.x - q.x);
    const i = l.findIndex((p, k) => k > 0 && (l[k - 1] as { y: number }).y === p.y && (l[k - 1] as { x: number }).x + 1 === p.x);
    expect(i, "kenar-bitişik serbest kırsal çift").toBeGreaterThan(0);
    const serbest = [(l[i - 1] as { id: string }).id, (l[i] as { id: string }).id];
    const once = s.durumOzeti();
    const hazine = s.dunya.oyuncular.find((o) => o.id === "a")!.hazine.miktar;
    const gunluk = s.gunluk.length;
    const spy = vi.spyOn(HucreDizini.prototype, "hucreBilgisi").mockImplementation(hata);
    try {
      expect(() => s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: serbest.slice(0, 2), sinif: "kirsal" } })).toThrow(HucreDiziniBuyukHatasi);
      expect(() => s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "yapi_yerlestir", ilce: "sn_m_ova_merkez", tesisTuru: "ciftlik", hucreler: serbest.slice(0, 2), sinif: "kirsal" } })).toThrow(HucreDiziniBuyukHatasi);
    } finally {
      spy.mockRestore();
    }
    expect(s.durumOzeti()).toBe(once);
    expect(s.dunya.oyuncular.find((o) => o.id === "a")!.hazine.miktar).toBe(hazine);
    expect(s.gunluk.length).toBe(gunluk);
    // hata geçtikten sonra aynı komut normal çalışır
    expect(s.uygula({ t: s.dunya.zaman, oyuncu: "a", komut: { tur: "parsel_al", ilce: "sn_m_ova_merkez", hucreler: serbest.slice(0, 2), sinif: "kirsal" } }).tamam).toBe(true);
  });

  it("oyuncu_katil (bedava yurt planı hücreleri gezerken atar): oyuncu eklenmez, dünya aynı", () => {
    const s = hazirDunya();
    const once = s.durumOzeti();
    const oyuncular = s.dunya.oyuncular.length;
    const spy = vi.spyOn(HucreDizini.prototype, "gez").mockImplementation(hata);
    try {
      expect(() => s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: [], ilce: "sn_m_ova_merkez" } })).toThrow(HucreDiziniBuyukHatasi);
    } finally {
      spy.mockRestore();
    }
    expect(s.dunya.oyuncular.length).toBe(oyuncular);
    expect(s.durumOzeti()).toBe(once);
    expect(s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "b", bolgeler: [], ilce: "sn_m_ova_merkez" } }).tamam).toBe(true);
  });
});
