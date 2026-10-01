/**
 * Yurt halka araması (docs/06 §15.11): `kumeSecHalka` / `halkaGez` / `halkaSay` ve onlarla kurulan `yurtPlanla`, ESKİ tam sıralamalı `kumeSec` (kâhin:
 * `yurt-halka-kahin.ts`, birebir kopya) ve eski aday listeli `ilcePlani` ile BİREBİR aynı sonucu verir: aynı hücreler, aynı seçim sırası, aynı hata iletisi / null.
 *
 *  1. birim: rastgele aday kümeleri (yoğunluk %3-97, boşluklu, delikli, çentikli, dar şerit, kapalı merkez; koordinat basamak sayısı değişen çerçeveler:
 *     "10:2" < "9:1" tuzağı) üzerinde `halkaGez` = tam sıralı aday listesi, `halkaSay` = min(n, sayı), `kumeSecHalka` = `kumeSecEski`;
 *  2. dünya: mini-6, sentetik-50 ve Gebze'nin 1/10 kesiti (sentetik ızgara, ızgara ve JSON yolu) üzerinde, çok tohum ve katılım sırasıyla, rastgele doluluk
 *     (%0-97), kamu, orman, ayrılmış hücre yedeği (`yurtAyrilmisSonra`), n = 1..40 ve n'nin yetmediği ilçe: eski `yurtPlanla` (burada kopya) = yeni `yurtPlanla`.
 */
import { parselFiksturuYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU, Simulasyon } from "../src/motor";
import { carpBol } from "../src/sabit";
import { hucreBul, hucreEkle, ilceBul } from "../src/mulk/durum";
import { dizge, halkaGez, halkaSay, ilceMerkezi, kumeSecHalka } from "../src/mulk/geometri";
import type { HalkaCercevesi, HucreYuklemi, Nokta } from "../src/mulk/geometri";
import { durumUygunMu } from "../src/mulk/hucreDizini";
import { kamuHucreMi } from "../src/mulk/kamu";
import { yurtPlanla } from "../src/mulk/yurt";
import type { YurtPlani } from "../src/mulk/yurt";
import { PPM } from "../src/tipler";
import type { CekirdekVeriPaketi, DerlenmisIcerik, DerlenmisMulk, Dunya, IlceDurumu } from "../src/tipler";
import { KAMU_KUCUK, KAMU_YOGUN } from "./kamu-yardimci";
import { sentetikDunya, sentetikVeri } from "./hucre-dizini-yardimci";
import { mulkVeriTam } from "./mulk-yardimci";
import { kumeSecEski } from "./yurt-halka-kahin";

// ---------------------------------------------------------------------------
// Tohumlu, platformdan bağımsız rastgelelik (yalnız tamsayı)
// ---------------------------------------------------------------------------

function rastgele(tohum: number): () => number {
  let s = (tohum ^ 0x9e3779b9) >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };
}
const tam = (r: () => number, ust: number): number => Math.floor(r() * ust);

// ---------------------------------------------------------------------------
// 1. birim: kumeSecHalka / halkaGez / halkaSay ↔ kumeSecEski
// ---------------------------------------------------------------------------

interface Ornek {
  cerceve: HalkaCercevesi;
  adaylar: Nokta[];
  yuklem: HucreYuklemi;
  cx: number;
  cy: number;
}

/** Koordinat basamak sınırlarını çaprazlayan çerçeve başlangıçları ("10:2" < "9:1" ve "100:5" < "99:5" tuzakları). */
const BASLANGICLAR: [number, number][] = [
  [0, 0],
  [3, 7],
  [5, 5],
  [95, 8],
  [8, 96],
  [990, 995],
  [9_990, 9_995],
  [99_990, 99_995],
  [600_000, 400_000],
  [1_048_000, 1_048_000],
];

function ornekUret(r: () => number): Ornek {
  const [bx, by] = BASLANGICLAR[tam(r, BASLANGICLAR.length)] as [number, number];
  const bicim = tam(r, 5);
  // 0: kare-ish, 1: dar yatay şerit, 2: dar dikey şerit, 3: küçük, 4: orta
  const w = bicim === 1 ? 1 + tam(r, 3) + (r() < 0.5 ? 0 : 30) : bicim === 3 ? 2 + tam(r, 6) : 6 + tam(r, 50);
  const h = bicim === 2 ? 1 + tam(r, 3) + (r() < 0.5 ? 0 : 30) : bicim === 3 ? 2 + tam(r, 6) : 6 + tam(r, 50);
  const yogunluk = [0.03, 0.1, 0.25, 0.5, 0.75, 0.9, 0.97][tam(r, 7)] as number;
  const desen = tam(r, 5); // 0 düz rastgele, 1 delikli (merkez kapalı), 2 çentikli köşeler, 3 satır/sütun şeritli, 4 kümeli
  const uyelik = new Set<string>();
  const adaylar: Nokta[] = [];
  const x1 = bx + w - 1;
  const y1 = by + h - 1;
  const mx = (bx + x1) / 2;
  const my = (by + y1) / 2;
  const kume = Array.from({ length: 4 }, () => [bx + tam(r, w), by + tam(r, h)] as const);
  for (let y = by; y <= y1; y++) {
    for (let x = bx; x <= x1; x++) {
      let var_ = r() < yogunluk;
      if (desen === 1 && (x - mx) * (x - mx) + (y - my) * (y - my) < (Math.min(w, h) / 3) ** 2) var_ = false;
      if (desen === 2 && (x - bx) + (y - by) < Math.min(w, h) / 4) var_ = false;
      if (desen === 3 && ((x - bx) % 5 === 4 || (y - by) % 7 === 6)) var_ = false;
      if (desen === 4) {
        const yakin = kume.some(([kx, ky]) => (x - kx) * (x - kx) + (y - ky) * (y - ky) <= 9 + tam(r, 4));
        var_ = yakin && r() < 0.9;
      }
      if (var_) {
        uyelik.add(`${x}:${y}`);
        adaylar.push({ id: `${x}:${y}`, x, y });
      }
    }
  }
  // Adaylar listesi rastgele karışık sırada (kâhin kendi sıralar; sıradan bağımsızlık)
  for (let i = adaylar.length - 1; i > 0; i--) {
    const j = tam(r, i + 1);
    [adaylar[i], adaylar[j]] = [adaylar[j] as Nokta, adaylar[i] as Nokta];
  }
  // Merkez: çoğunlukla çerçeve içinde (ilçe merkezi çerçevenin içindedir), bazen dışarıda
  const disari = r() < 0.15;
  const cx = disari ? bx - 5 + tam(r, w + 10) : bx + tam(r, w);
  const cy = disari ? by - 5 + tam(r, h + 10) : by + tam(r, h);
  return { cerceve: { x0: bx, y0: by, x1, y1 }, adaylar, yuklem: (x, y) => uyelik.has(`${x}:${y}`), cx, cy };
}

describe("1. birim: halka araması = eski tam sıralamalı kumeSec", () => {
  it("halkaGez: yüklemi sağlayan hücreleri (uzaklık², kimlik DİZESİ) tam sırasıyla verir (2 000 rastgele örnek)", () => {
    const r = rastgele(101);
    let bos = 0;
    for (let i = 0; i < 2_000; i++) {
      const o = ornekUret(r);
      const beklenen = o.adaylar
        .map((c) => ({ id: c.id, u: (c.x - o.cx) ** 2 + (c.y - o.cy) ** 2 }))
        .sort((a, b) => a.u - b.u || dizge(a.id, b.id))
        .map((c) => c.id);
      const gelen = [...halkaGez(o.yuklem, o.cerceve, o.cx, o.cy)].map((c) => c.id);
      expect(gelen, `örnek ${i}`).toEqual(beklenen);
      if (beklenen.length === 0) bos++;
    }
    expect(bos).toBeLessThan(400); // test anlamlı: çoğu örnekte aday var
  });

  it("halkaSay: min(n, aday sayısı); n'den küçükse TAM sayı (2 000 örnek, n = 1..40)", () => {
    const r = rastgele(102);
    for (let i = 0; i < 2_000; i++) {
      const o = ornekUret(r);
      const n = 1 + tam(r, 40);
      expect(halkaSay(o.yuklem, o.cerceve, o.cx, o.cy, n), `örnek ${i} n=${n}`).toBe(Math.min(n, o.adaylar.length));
    }
  });

  it("kumeSecHalka = kumeSecEski: aynı hücreler, aynı seçim sırası, aynı null (8 000 örnek, n = 1..40)", () => {
    const r = rastgele(103);
    let basarili = 0;
    let bosDonen = 0;
    for (let i = 0; i < 8_000; i++) {
      const o = ornekUret(r);
      const n = 1 + tam(r, 40);
      const eski = kumeSecEski(o.adaylar, n, o.cx, o.cy);
      const yeni = kumeSecHalka(o.yuklem, o.cerceve, n, o.cx, o.cy);
      expect(yeni, `örnek ${i} n=${n} cerceve=${JSON.stringify(o.cerceve)} merkez=${o.cx},${o.cy}`).toEqual(eski);
      if (eski === null) bosDonen++;
      else basarili++;
    }
    // test anlamlı: hem küme bulunan hem bulunamayan örnek çok
    expect(basarili).toBeGreaterThan(2_000);
    expect(bosDonen).toBeGreaterThan(500);
  });

  it("merkez hücre kapalıyken, çentikli ya da delikli alanda ve çerçeve dışı merkezde de aynı (özel durumlar)", () => {
    const tumu = (x0: number, y0: number, w: number, h: number, cikar: (x: number, y: number) => boolean): Ornek => {
      const adaylar: Nokta[] = [];
      const uyelik = new Set<string>();
      for (let y = y0; y < y0 + h; y++)
        for (let x = x0; x < x0 + w; x++)
          if (!cikar(x, y)) {
            adaylar.push({ id: `${x}:${y}`, x, y });
            uyelik.add(`${x}:${y}`);
          }
      return { cerceve: { x0, y0, x1: x0 + w - 1, y1: y0 + h - 1 }, adaylar, yuklem: (x, y) => uyelik.has(`${x}:${y}`), cx: 0, cy: 0 };
    };
    const durumlar: [string, Ornek, number, number][] = [
      ["merkez dolu, çevresi boş", tumu(5, 5, 21, 21, (x, y) => Math.abs(x - 15) <= 3 && Math.abs(y - 15) <= 3), 15, 15],
      ["çerçeve dışı merkez (sol üst)", tumu(40, 40, 30, 30, () => false), 10, 10],
      ["çerçeve dışı merkez (sağ alt)", tumu(40, 40, 30, 30, () => false), 500, 500],
      ["tek hücre", tumu(7, 7, 1, 1, () => false), 7, 7],
      ["tek sütun", tumu(9, 1, 1, 60, () => false), 9, 30],
      ["tek satır, ortası kesik", tumu(1, 9, 60, 1, (x) => x === 30), 30, 9],
      ["dama tahtası (hiç bitişik yok)", tumu(95, 95, 20, 20, (x, y) => (x + y) % 2 === 0), 105, 105],
      ["iki ada: sol küçük (n'den az), sağ büyük", tumu(98, 98, 30, 6, (x) => x === 101 || x === 102), 98, 100],
    ];
    for (const [ad, o, cx, cy] of durumlar) {
      for (let n = 1; n <= 40; n++) {
        const eski = kumeSecEski(o.adaylar, n, cx, cy);
        expect(kumeSecHalka(o.yuklem, o.cerceve, n, cx, cy), `${ad} n=${n}`).toEqual(eski);
        expect(halkaSay(o.yuklem, o.cerceve, cx, cy, n), `${ad} sayı n=${n}`).toBe(Math.min(n, o.adaylar.length));
      }
    }
  });

  it('"10:2" < "9:1" tuzağı: u eşit hücrelerde sıra kimlik DİZESİyledir (sayısal değil)', () => {
    // Merkez (10, 10); (9, 11) ile (11, 9) ve (10, 12) ile (12, 10) vb. u eşit; basamak sayısı değişen koordinatlarda dize sırası sayısal sıradan farklıdır.
    const yuklem: HucreYuklemi = (x, y) => x >= 8 && x <= 12 && y >= 8 && y <= 12;
    const cerceve = { x0: 8, y0: 8, x1: 12, y1: 12 };
    const adaylar: Nokta[] = [];
    for (let y = 8; y <= 12; y++) for (let x = 8; x <= 12; x++) adaylar.push({ id: `${x}:${y}`, x, y });
    for (let n = 1; n <= 25; n++) expect(kumeSecHalka(yuklem, cerceve, n, 10, 10), `n=${n}`).toEqual(kumeSecEski(adaylar, n, 10, 10));
    const gelen = [...halkaGez(yuklem, cerceve, 10, 10)].map((c) => c.id);
    // dize sırası: "10:9" < "9:10" (sayısal sırayla 9 < 10 olurdu)
    expect(gelen.indexOf("10:9")).toBeLessThan(gelen.indexOf("9:10"));
  });
});

// ---------------------------------------------------------------------------
// 2. dünya: eski yurtPlanla (kopya) = yeni yurtPlanla
// ---------------------------------------------------------------------------

/** ESKİ `ilcePlani` (halka öncesi, aday listeli; `git show 701e938:packages/cekirdek/src/mulk/yurt.ts`) + `kumeSecEski`. Kâhin: değiştirilmez. */
function eskiIlcePlani(d: Dunya, mk: DerlenmisMulk, ilce: IlceDurumu, n: number): YurtPlani | string {
  const p = mk.p;
  if (n > p.ilceHucreTavani) return `yurt ilce hucre tavanini asar: ${n} > ${p.ilceHucreTavani}`;
  if (n > carpBol(ilce.uygunHucre, p.ilcePayTavaniPpm, PPM)) return `ilce yurt icin cok kucuk: ${ilce.id}`;
  const tanim = mk.ilceler.get(ilce.id);
  if (tanim === undefined) return `bilinmeyen ilce: ${ilce.id}`;
  const dz = mk.dizin;
  const no = dz.ilceNo(ilce.id);
  const [cx, cy] = dz.ilceMerkezi(no);
  const bos: { id: string; x: number; y: number; orman: boolean }[] = [];
  dz.gez(no, (x, y, b) => {
    if (!durumUygunMu(b)) return;
    const id = `${x}:${y}`;
    if (hucreBul(d, id) === undefined && !kamuHucreMi(d, ilce.id, id)) bos.push({ id, x, y, orman: dz.ormanMi(no, x, y) });
  });
  if (bos.length < n) return `ilcede yeterli bos hucre yok: ${ilce.id} (${bos.length} < ${n})`;
  const ormansiz = bos.filter((c) => !c.orman);
  if (p.yeniOyuncu.yurtAyrilmisSonra === true) {
    const ayrilmamis = bos.filter((c) => !mk.ayrilmis.has(c.id));
    const ayrilmamisOrmansiz = ayrilmamis.filter((c) => !c.orman);
    const ilk = ayrilmamisOrmansiz.length >= n ? kumeSecEski(ayrilmamisOrmansiz, n, cx, cy) : null;
    const ikinci = ilk ?? (ayrilmamis.length >= n ? kumeSecEski(ayrilmamis, n, cx, cy) : null);
    if (ikinci !== null) return { ilce: ilce.id, hucreler: ikinci.sort(dizge) };
  }
  const plan = ormansiz.length >= n ? kumeSecEski(ormansiz, n, cx, cy) : null;
  const sonuc = plan ?? kumeSecEski(bos, n, cx, cy);
  if (sonuc === null) return `ilcede ${n} hucrelik bitisik bos alan yok: ${ilce.id}`;
  return { ilce: ilce.id, hucreler: sonuc.sort(dizge) };
}

/** ESKİ `yurtPlanla` (dış mantık aynı; `ilcePlani` yerine eski sürüm). */
function eskiYurtPlanla(d: Dunya, ic: DerlenmisIcerik, ilceKimligi?: string): YurtPlani | string | null {
  const mk = ic.mulk;
  const m = d.mulk;
  if (mk === undefined || m === undefined) return null;
  const n = mk.p.yeniOyuncu.yurtHucre;
  if (ilceKimligi !== undefined) {
    const ilce = typeof ilceKimligi === "string" ? ilceBul(d, ilceKimligi) : undefined;
    if (ilce === undefined) return `bilinmeyen ilce: ${String(ilceKimligi)}`;
    return n > 0 ? eskiIlcePlani(d, mk, ilce, n) : null;
  }
  if (n <= 0) return null;
  const tarlaIndeksi = ic.tesisTuruIndeks["ciftlik"];
  const gerekli = tarlaIndeksi === undefined ? undefined : ic.tesisTurleri[tarlaIndeksi]?.gerekliEtiket;
  const tarlaIli = (c: IlceDurumu): boolean => {
    if (tarlaIndeksi === undefined || gerekli === undefined) return true;
    const merkez = mk.ilMerkezi.get(c.il);
    return merkez !== undefined && (d.bolgeler[merkez]?.etiketler.includes(gerekli) ?? false);
  };
  const adaylar = m.ilceler
    .filter((c) => c.uygunHucre > 0 && c.uygunHucre - c.satilmisHucre >= n)
    .sort(
      (a, b) =>
        Number(tarlaIli(b)) - Number(tarlaIli(a)) ||
        a.satilmisHucre * b.uygunHucre - b.satilmisHucre * a.uygunHucre ||
        (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
    );
  for (const c of adaylar) {
    const plan = eskiIlcePlani(d, mk, c, n);
    if (typeof plan !== "string") return plan;
  }
  return null;
}

/** Dünyaya sahipli hücre ekler (planlama için yeterli: `hucreBul` dolu, ilçe `satilmisHucre` tutarlı). */
function doldur(s: Simulasyon, ilceId: string, oran: number, r: () => number, sahip = "dolgu"): number {
  const mk = s.ic.mulk as DerlenmisMulk;
  const m = s.dunya.mulk as NonNullable<Dunya["mulk"]>;
  const dz = mk.dizin;
  const no = dz.ilceNo(ilceId);
  const ilce = ilceBul(s.dunya, ilceId) as IlceDurumu;
  const sec: string[] = [];
  dz.gez(no, (x, y, b) => {
    if (!durumUygunMu(b)) return;
    const id = `${x}:${y}`;
    if (hucreBul(s.dunya, id) === undefined && !kamuHucreMi(s.dunya, ilceId, id) && r() < oran) sec.push(id);
  });
  for (const id of sec) {
    hucreEkle(m, { id, ilce: ilceId, sinif: "kirsal", sahip, degerMili: 0, alinma: s.dunya.zaman });
    ilce.satilmisHucre++;
  }
  return sec.length;
}

/** Eski ve yeni yurt planı: otomatik ilçe seçimi ve her ilçe için açık ilçe; hepsi birebir eşit olmalı. Karşılaştırılan plan sayısını döndürür. */
function karsilastir(s: Simulasyon, etiket: string, ozet?: { plan: number; hata: number; bos: number }): number {
  let k = 0;
  const say = (a: YurtPlani | string | null): void => {
    if (ozet === undefined) return;
    if (a === null) ozet.bos++;
    else if (typeof a === "string") ozet.hata++;
    else ozet.plan++;
  };
  const oto = yurtPlanla(s.dunya, s.ic);
  expect(oto, `${etiket} (otomatik ilçe)`).toEqual(eskiYurtPlanla(s.dunya, s.ic));
  say(oto);
  k++;
  for (const c of (s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler) {
    const yeni = yurtPlanla(s.dunya, s.ic, c.id);
    expect(yeni, `${etiket} (${c.id})`).toEqual(eskiYurtPlanla(s.dunya, s.ic, c.id));
    say(yeni);
    k++;
  }
  return k;
}

type Duzen = (v: CekirdekVeriPaketi) => void;
function yurtDuzeni(n: number, ayrilmisSonra: boolean | undefined, ayrilmisPpm: number): Duzen {
  return (v) => {
    const y = (v.param.mulk as NonNullable<typeof v.param.mulk>).yeniOyuncu;
    y.yurtHucre = n;
    y.ayrilmisHucrePpm = ayrilmisPpm;
    if (ayrilmisSonra === undefined) delete y.yurtAyrilmisSonra;
    else y.yurtAyrilmisSonra = ayrilmisSonra;
  };
}

function mini6(duzen: Duzen, kamu: boolean): CekirdekVeriPaketi {
  return mulkVeriTam((v) => {
    if (kamu) (v.param.mulk as NonNullable<typeof v.param.mulk>).kamu = structuredClone(KAMU_KUCUK);
    duzen(v);
  });
}

function sentetik50(duzen: Duzen, kamu: boolean): CekirdekVeriPaketi {
  const v: CekirdekVeriPaketi = { ...varsayilanVeriyiYukle(), parsel: parselFiksturuYukle("sentetik-50") };
  if (kamu) (v.param.mulk as NonNullable<typeof v.param.mulk>).kamu = structuredClone(KAMU_YOGUN);
  duzen(v);
  return v;
}

describe("2. dünya: eski yurtPlanla (kopya) = yeni yurtPlanla", () => {
  it("mini-6: n = 1..40, ayrılmış yedek açık/kapalı/yok, kamu açık/kapalı, boş dünya ve rastgele doluluk (%0-97), çok tohum", () => {
    const ozet = { plan: 0, hata: 0, bos: 0 };
    let karsilastirilan = 0;
    for (const kamu of [false, true]) {
      for (const sonra of [undefined, false, true]) {
        for (const ppm of [0, 200_000, 600_000, PPM]) {
          for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 10, 12, 17, 24, 30, 40]) {
            const s = Simulasyon.olustur(mini6(yurtDuzeni(n, sonra, ppm), kamu), 5);
            const etiket = `mini-6 kamu=${kamu} sonra=${sonra} ppm=${ppm} n=${n}`;
            karsilastirilan += karsilastir(s, `${etiket} boş`, ozet);
            for (const tohum of [1, 2]) {
              const r = rastgele(tohum * 1_000 + n);
              for (const c of (s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler) doldur(s, c.id, [0.1, 0.3, 0.5, 0.7, 0.9, 0.97][tam(r, 6)] as number, r);
              karsilastirilan += karsilastir(s, `${etiket} dolu tohum=${tohum}`, ozet);
            }
          }
        }
      }
    }
    // test anlamlı: planlar da, hata iletileri de, null da karşılaştırıldı
    expect(karsilastirilan).toBeGreaterThan(2_000);
    expect(ozet.plan).toBeGreaterThan(500);
    expect(ozet.hata).toBeGreaterThan(200);
  });

  it("mini-6: katılım sırası (oyuncu_katil ardışık, yeni kodla uygulanır); her katılımdan önce eski = yeni (otomatik ve açık ilçe)", () => {
    for (const sonra of [undefined, true]) {
      for (const n of [3, 6, 11]) {
        const s = Simulasyon.olustur(mini6(yurtDuzeni(n, sonra, 300_000), true), 9);
        let katilan = 0;
        for (let i = 0; i < 60; i++) {
          karsilastir(s, `katılım sırası sonra=${sonra} n=${n} #${i}`);
          const ilce = i % 3 === 0 ? (s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler[i % 3 + 1]?.id : undefined;
          const r = s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: `o${i}`, bolgeler: [], ...(ilce === undefined ? {} : { ilce }) } });
          if (r.tamam) katilan++;
        }
        expect(katilan, `sonra=${sonra} n=${n}`).toBeGreaterThan(3);
      }
    }
  });

  it("sentetik-50: çok tohum, rastgele doluluk, kamu açık/kapalı, ayrılmış yedek, n = 1..40", () => {
    const ozet = { plan: 0, hata: 0, bos: 0 };
    let karsilastirilan = 0;
    for (const kamu of [false, true]) {
      for (const [sonra, ppm] of [
        [undefined, 200_000],
        [false, 400_000],
        [true, 200_000],
        [true, PPM],
      ] as const) {
        for (const n of [1, 3, 6, 9, 16, 25, 40]) {
          const s = Simulasyon.olustur(sentetik50(yurtDuzeni(n, sonra, ppm), kamu), 3);
          const etiket = `sentetik-50 kamu=${kamu} sonra=${sonra} ppm=${ppm} n=${n}`;
          karsilastirilan += karsilastir(s, `${etiket} boş`, ozet);
          for (const tohum of [1, 2, 3]) {
            const r = rastgele(tohum * 7_919 + n);
            const oran = [0.2, 0.6, 0.85][tohum - 1] as number;
            for (const c of (s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler) doldur(s, c.id, oran * r(), r);
            karsilastirilan += karsilastir(s, `${etiket} dolu tohum=${tohum}`, ozet);
          }
        }
      }
    }
    expect(karsilastirilan).toBeGreaterThan(1_500);
    expect(ozet.plan).toBeGreaterThan(400);
  });

  it("sentetik-50: katılım sırası, 40 ardışık oyuncu (kıyı ve dar ilçeler dahil tüm ilçeler sırayla dolar), her katılımda eski = yeni", () => {
    const s = Simulasyon.olustur(sentetik50(yurtDuzeni(8, true, 200_000), true), 4);
    const ilceler = (s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler.map((c) => c.id);
    for (let i = 0; i < 40; i++) {
      karsilastir(s, `sentetik-50 katılım #${i}`);
      const ilce = i % 2 === 0 ? ilceler[(i * 7) % ilceler.length] : undefined;
      s.uygula({ t: s.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: `o${i}`, bolgeler: [], ...(ilce === undefined ? {} : { ilce }) } });
    }
  });

  for (const yol of ["izgara", "json"] as const) {
    it(`Gebze 1/10 kesiti (sentetik 165 x 165 ızgara, ${yol} yolu): orman (JSON), kamu, ayrılmış yedek, çok tohum ve katılım sırası`, () => {
      const dunya = sentetikDunya(165);
      const ozet = { plan: 0, hata: 0, bos: 0 };
      let karsilastirilan = 0;
      for (const [sonra, ppm, n] of [
        [true, 200_000, 6],
        [true, 700_000, 12],
        [false, 200_000, 6],
        [undefined, 0, 30],
        [true, PPM, 9],
      ] as const) {
        const veri = sentetikVeri(yol, dunya, (v) => {
          yurtDuzeni(n, sonra, ppm)(v);
          if (yol === "json") {
            // Orman: fikstür şemasında isteğe bağlı `kullanim` alanı (kümeler halinde: her 13. satır dilimi)
            for (const c of (v.parsel as NonNullable<typeof v.parsel>).ilceler)
              c.hucreler.forEach((h, i) => {
                if (Math.floor(i / 400) % 13 === 4 || i % 97 === 0) (h as { kullanim?: string }).kullanim = "orman";
              });
          }
        });
        const s = Simulasyon.olustur(veri, 6);
        const etiket = `gebze-1/10 ${yol} sonra=${sonra} ppm=${ppm} n=${n}`;
        karsilastirilan += karsilastir(s, `${etiket} boş`, ozet);
        for (const tohum of [1, 2]) {
          const r = rastgele(tohum * 31 + n);
          for (const c of (s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler) doldur(s, c.id, [0.4, 0.9][tohum - 1] as number, r);
          karsilastirilan += karsilastir(s, `${etiket} dolu tohum=${tohum}`, ozet);
        }
        // katılım sırası: yeni kodla gerçek katılım; her adımda eski = yeni
        const t = Simulasyon.olustur(veri, 6);
        for (let i = 0; i < 8; i++) {
          karsilastirilan += karsilastir(t, `${etiket} katılım #${i}`, ozet);
          t.uygula({ t: t.dunya.zaman, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: `o${i}`, bolgeler: [] } });
        }
      }
      expect(karsilastirilan).toBeGreaterThan(40);
      expect(ozet.plan).toBeGreaterThan(15);
    }, 120_000);
  }

  it("n'nin yetmediği ilçe: hata iletisindeki sayı (bos < n) ve 'bitisik bos alan yok' iletisi eski ile birebir", () => {
    const s = Simulasyon.olustur(mini6(yurtDuzeni(6, true, 0), false), 5);
    const ilceId = ((s.dunya.mulk as NonNullable<Dunya["mulk"]>).ilceler[0] as IlceDurumu).id;
    // yalnız 4 serbest hücre bırak: "ilcede yeterli bos hucre yok: ... (4 < 6)"
    const mk = s.ic.mulk as DerlenmisMulk;
    const serbest: string[] = [];
    mk.dizin.gez(mk.dizin.ilceNo(ilceId), (x, y, b) => {
      if (durumUygunMu(b)) serbest.push(`${x}:${y}`);
    });
    const m = s.dunya.mulk as NonNullable<Dunya["mulk"]>;
    const ilce = ilceBul(s.dunya, ilceId) as IlceDurumu;
    for (const id of serbest.slice(4)) {
      hucreEkle(m, { id, ilce: ilceId, sinif: "kirsal", sahip: "dolgu", degerMili: 0, alinma: 0 });
      ilce.satilmisHucre++;
    }
    const yeni = yurtPlanla(s.dunya, s.ic, ilceId);
    expect(yeni).toBe(eskiYurtPlanla(s.dunya, s.ic, ilceId));
    expect(yeni).toMatch(/\(4 < 6\)/);
    // bitişik olmayan 6 serbest hücre (dama): "ilcede 6 hucrelik bitisik bos alan yok"
    const s2 = Simulasyon.olustur(mini6(yurtDuzeni(6, false, 0), false), 5);
    const mk2 = s2.ic.mulk as DerlenmisMulk;
    const m2 = s2.dunya.mulk as NonNullable<Dunya["mulk"]>;
    const ilce2 = ilceBul(s2.dunya, ilceId) as IlceDurumu;
    let serbestSay = 0;
    mk2.dizin.gez(mk2.dizin.ilceNo(ilceId), (x, y, b) => {
      if (!durumUygunMu(b)) return;
      if ((x + y) % 2 === 0 && serbestSay < 12) {
        serbestSay++;
        return;
      }
      hucreEkle(m2, { id: `${x}:${y}`, ilce: ilceId, sinif: "kirsal", sahip: "dolgu", degerMili: 0, alinma: 0 });
      ilce2.satilmisHucre++;
    });
    const yeni2 = yurtPlanla(s2.dunya, s2.ic, ilceId);
    expect(yeni2).toBe(eskiYurtPlanla(s2.dunya, s2.ic, ilceId));
    expect(typeof yeni2).toBe("string");
  });

  it("ilçe merkezi: önbellekli dizin merkezi = geometri.ilceMerkezi (fikstür ilçe tanımından) tüm ilçelerde", () => {
    for (const s of [Simulasyon.olustur(mini6(yurtDuzeni(6, true, 200_000), true), 1), Simulasyon.olustur(sentetik50(yurtDuzeni(6, true, 200_000), true), 1)]) {
      const mk = s.ic.mulk as DerlenmisMulk;
      for (const [id, tanim] of mk.ilceler) {
        const no = mk.dizin.ilceNo(id);
        expect(mk.dizin.ilceMerkezi(no)).toEqual(ilceMerkezi(tanim));
        expect(mk.dizin.ilceMerkezi(no)).toBe(mk.dizin.ilceMerkezi(no)); // önbellek aynı nesne
      }
    }
  });
});
