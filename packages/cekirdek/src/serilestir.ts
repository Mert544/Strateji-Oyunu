/**
 * Dünya serileştiricisi ve anlık görüntü zarfı (F1, docs/06 §14).
 *
 * - `dunyaSerilestir`: kanonik JSON (nesne anahtarları sıralı, boşluksuz). Çıktı `kanonikSerilestir(d)` ile bayt bayt
 *   aynıdır; dolayısıyla `durumOzeti(d) === fnv1a64(dunyaSerilestir(d))`. Tüm durum içindedir: PRNG akış durumları,
 *   olay kuyruğunun yığın dizisi (sırasıyla), sayaçlar, lojistik bayrakları. Tamsayı olmayan sayı, bigint, fonksiyon,
 *   düz olmayan nesne (Map/Set/sınıf) ve PAYLAŞILAN REFERANS (aynı nesne iki yerde) reddedilir: JSON'dan dönüşte
 *   paylaşım kaybolacağından davranış değişebilirdi.
 * - `dunyaCoz`: JSON.parse + biçim doğrulaması (üst düzey alanlar, tipler, dizi uzunluklarının tutarlılığı, indeks
 *   aralıkları, kuyruk yığın düzeni ve öncelikleri). Bozuk girdide yolu belirten `SerilestirmeHatasi` fırlatır.
 * - Anlık görüntü zarfı: `{ surum: 1, kuralSurumu, simZamani, durumOzeti, dunya }` (kendisi de kanonik JSON).
 * - `kuralSurumuHesapla(veri)`: içerik + parametre JSON'larının kanonik özetinden türetilen kimlik ("k1-<16 hex>").
 *
 * Bu modül motoru (Simulasyon) yalnız TİP olarak içe aktarır; yükleme `Simulasyon.yukle` / `anlikGoruntudenYukle`'dedir.
 */
import type { VeriPaketi } from "@bolge/veri";
import { PRNG_AKISLARI } from "./kurulum";
import { kuyrukOnce } from "./kuyruk";
import type { Simulasyon } from "./motor";
import { fnv1a64 } from "./ozet";
import { OLAY_ONCELIGI } from "./tipler";
import type { DerlenmisIcerik, Dunya, Ms } from "./tipler";

/** Serileştirme/çözme hatası: `yol` hatalı değerin JSON yolu ($ = kök). */
export class SerilestirmeHatasi extends Error {
  constructor(
    readonly yol: string,
    mesaj: string,
  ) {
    super(`${yol}: ${mesaj}`);
    this.name = "SerilestirmeHatasi";
  }
}

// ---------------------------------------------------------------------------
// Serileştirme
// ---------------------------------------------------------------------------

/** Hızlı yolda hata: yol sonradan (yavaş tanı yürüyüşüyle) bulunur. */
const HATA = Symbol("serilestirme-hatasi");

function yaz(v: unknown, cikti: string[], gorulen: Set<object>): void {
  if (v === null) {
    cikti.push("null");
    return;
  }
  switch (typeof v) {
    case "boolean":
      cikti.push(v ? "true" : "false");
      return;
    case "number":
      if (!Number.isInteger(v)) throw HATA;
      cikti.push(Object.is(v, -0) ? "0" : String(v));
      return;
    case "string":
      cikti.push(JSON.stringify(v));
      return;
    case "object": {
      if (gorulen.has(v)) throw HATA;
      gorulen.add(v);
      if (Array.isArray(v)) {
        cikti.push("[");
        for (let i = 0; i < v.length; i++) {
          if (i > 0) cikti.push(",");
          const x: unknown = v[i];
          // Dizide tanımsız eleman (delik) JSON'da null olurdu: dönüşte farklı değer -> reddedilir.
          if (x === undefined) throw HATA;
          yaz(x, cikti, gorulen);
        }
        cikti.push("]");
        return;
      }
      const p: unknown = Object.getPrototypeOf(v);
      if (p !== Object.prototype && p !== null) throw HATA;
      const o = v as Record<string, unknown>;
      const anahtarlar = Object.keys(o).sort();
      cikti.push("{");
      let ilk = true;
      for (const k of anahtarlar) {
        const deger = o[k];
        if (deger === undefined) continue; // tanımsız isteğe bağlı alan yazılmaz (özetle aynı kural)
        if (!ilk) cikti.push(",");
        ilk = false;
        cikti.push(JSON.stringify(k), ":");
        yaz(deger, cikti, gorulen);
      }
      cikti.push("}");
      return;
    }
    default:
      throw HATA;
  }
}

/** Yavaş tanı: ilk desteklenmeyen değerin yolunu ve nedenini bulur. */
function tani(v: unknown, yol: string, gorulen: Map<object, string>): SerilestirmeHatasi | null {
  if (v === null || typeof v === "boolean" || typeof v === "string") return null;
  if (typeof v === "number") return Number.isInteger(v) ? null : new SerilestirmeHatasi(yol, `tamsayi olmayan sayi: ${String(v)}`);
  if (typeof v !== "object") return new SerilestirmeHatasi(yol, `desteklenmeyen tip: ${typeof v}`);
  const once = gorulen.get(v);
  if (once !== undefined) return new SerilestirmeHatasi(yol, `paylasilan referans (ayni nesne ${once} yolunda da var)`);
  gorulen.set(v, yol);
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      if (v[i] === undefined) return new SerilestirmeHatasi(`${yol}[${i}]`, "dizide tanimsiz eleman");
      const r = tani(v[i], `${yol}[${i}]`, gorulen);
      if (r) return r;
    }
    return null;
  }
  const p: unknown = Object.getPrototypeOf(v);
  if (p !== Object.prototype && p !== null) return new SerilestirmeHatasi(yol, "duz olmayan nesne (Map/Set/sinif)");
  for (const k of Object.keys(v).sort()) {
    const x = (v as Record<string, unknown>)[k];
    if (x === undefined) continue;
    const r = tani(x, `${yol}.${k}`, gorulen);
    if (r) return r;
  }
  return null;
}

/**
 * Dünyayı kanonik JSON'a çevirir (anahtarlar sıralı). `kanonikSerilestir(d)` ile aynı çıktı; ek olarak paylaşılan
 * referans ve dizi deliği reddedilir. Hata: `SerilestirmeHatasi` (yol ile).
 */
export function dunyaSerilestir(d: Dunya): string {
  const cikti: string[] = [];
  try {
    yaz(d, cikti, new Set());
  } catch (e) {
    if (e !== HATA) throw e;
    throw tani(d, "$", new Map()) ?? new SerilestirmeHatasi("$", "serilestirilemedi");
  }
  return cikti.join("");
}

// ---------------------------------------------------------------------------
// Doğrulama yardımcıları
// ---------------------------------------------------------------------------

type Nesne = Record<string, unknown>;

function hata(yol: string, mesaj: string): never {
  throw new SerilestirmeHatasi(yol, mesaj);
}

function nesne(v: unknown, yol: string): Nesne {
  if (typeof v !== "object" || v === null || Array.isArray(v)) hata(yol, "nesne bekleniyordu");
  return v as Nesne;
}

function dizi(v: unknown, yol: string, uzunluk?: number): unknown[] {
  if (!Array.isArray(v)) hata(yol, "dizi bekleniyordu");
  if (uzunluk !== undefined && v.length !== uzunluk) hata(yol, `dizi uzunlugu ${v.length}, beklenen ${uzunluk}`);
  return v;
}

function tamsayi(v: unknown, yol: string, min = Number.MIN_SAFE_INTEGER, max = Number.MAX_SAFE_INTEGER): number {
  if (typeof v !== "number" || !Number.isSafeInteger(v)) hata(yol, `guvenli tamsayi bekleniyordu (${JSON.stringify(v)})`);
  if (v < min || v > max) hata(yol, `aralik disi: ${v} (${min}..${max})`);
  return v;
}

/** İndeks: [0, n). */
function indeks(v: unknown, yol: string, n: number): number {
  return tamsayi(v, yol, 0, n - 1);
}

function dize(v: unknown, yol: string): string {
  if (typeof v !== "string") hata(yol, "dize bekleniyordu");
  return v;
}

function mantik(v: unknown, yol: string): boolean {
  if (typeof v !== "boolean") hata(yol, "boolean bekleniyordu");
  return v;
}

/** Zorunlu alanlar var mı (ek alanlara izin verilir; üst düzey ayrıca sıkı denetlenir). */
function alanlar(o: Nesne, yol: string, zorunlu: readonly string[]): void {
  for (const k of zorunlu) if (!(k in o)) hata(`${yol}.${k}`, "zorunlu alan eksik");
}

/** Tüm sayılar tamsayı mı (JSON.parse ondalık / 1e400 = Infinity üretebilir). */
function tamsayiKurali(v: unknown, yol: string): void {
  if (typeof v === "number") {
    if (!Number.isInteger(v)) hata(yol, `tamsayi olmayan sayi: ${String(v)}`);
    return;
  }
  if (typeof v !== "object" || v === null) return;
  if (Array.isArray(v)) {
    for (let i = 0; i < v.length; i++) {
      const x: unknown = v[i];
      if (typeof x === "number") {
        if (!Number.isInteger(x)) hata(`${yol}[${i}]`, `tamsayi olmayan sayi: ${String(x)}`);
      } else if (typeof x === "object" && x !== null) tamsayiKurali(x, `${yol}[${i}]`);
    }
    return;
  }
  for (const k in v as Nesne) tamsayiKurali((v as Nesne)[k], `${yol}.${k}`);
}

const STOK_ALANLARI = ["miktar", "yerelOran", "gelenOran", "t0", "artik", "kapasite", "surum"] as const;

function stokDogrula(v: unknown, yol: string): void {
  const s = nesne(v, yol);
  for (const k of STOK_ALANLARI) tamsayi(s[k], `${yol}.${k}`);
}

/** Dünyanın üst düzey alanları: sıkı (bilinmeyen alan reddedilir; Dunya'ya alan eklenince buraya da eklenmeli). */
const DUNYA_ZORUNLU = [
  "zaman",
  "tohum",
  "bolgeler",
  "kenarlar",
  "oyuncular",
  "pazar",
  "savaslar",
  "anlasmalar",
  "yaptirimlar",
  "insaatlar",
  "partiler",
  "lojistik",
  "rng",
  "sayac",
  "kuyruk",
] as const;
const DUNYA_ISTEGE_BAGLI = ["iklim", "mulk"] as const;

const BOLGE_ZORUNLU = [
  "indeks",
  "id",
  "devlet",
  "etiketler",
  "sahip",
  "nufus",
  "stoklar",
  "israf",
  "uretimToplam",
  "uretimOrani",
  "uretimT0",
  "rezervIlk",
  "rezervKalan",
  "tesisler",
  "ticaretEmirleri",
  "birlikler",
  "savunma",
  "gidaKarsilanmaPpm",
  "ikmalKarsilanmaPpm",
] as const;

/**
 * Ayrıştırılmış (JSON.parse) değeri Dunya olarak doğrular ve döndürür (kopyalamaz). Denetimler: üst düzey alanlar
 * (sıkı), tüm sayıların tamsayılığı, mal/birlik/bölge/kenar sayısına bağlı dizi uzunluklarının tutarlılığı, indeks
 * aralıkları, oyuncu sırası, PRNG akışları, sayaçlar ve olay kuyruğu (öncelik, sıra < sayaç, t >= zaman, yığın düzeni,
 * bekleyen saatlik tık). İçerikle uyum ayrıca `dunyaIcerikUyumu` ile denetlenir.
 */
export function dunyaDogrula(deger: unknown): Dunya {
  const d = nesne(deger, "$");
  for (const k of DUNYA_ZORUNLU) if (!(k in d)) hata(`$.${k}`, "zorunlu alan eksik");
  const izinli = new Set<string>([...DUNYA_ZORUNLU, ...DUNYA_ISTEGE_BAGLI]);
  for (const k of Object.keys(d)) if (!izinli.has(k)) hata(`$.${k}`, "bilinmeyen ust duzey alan");
  tamsayiKurali(d, "$");

  const zaman = tamsayi(d.zaman, "$.zaman", 0);
  tamsayi(d.tohum, "$.tohum");

  // Bölgeler ve tutarlı uzunluklar
  const bolgeler = dizi(d.bolgeler, "$.bolgeler");
  const n = bolgeler.length;
  if (n === 0) hata("$.bolgeler", "bos");
  const ilk = nesne(bolgeler[0], "$.bolgeler[0]");
  const m = dizi(ilk.stoklar, "$.bolgeler[0].stoklar").length;
  const birlikSayisi = dizi(ilk.birlikler, "$.bolgeler[0].birlikler").length;
  const kenarlar = dizi(d.kenarlar, "$.kenarlar");
  const kSayisi = kenarlar.length;
  const idler = new Set<string>();
  for (let i = 0; i < n; i++) {
    const y = `$.bolgeler[${i}]`;
    const b = nesne(bolgeler[i], y);
    alanlar(b, y, BOLGE_ZORUNLU);
    if (tamsayi(b.indeks, `${y}.indeks`) !== i) hata(`${y}.indeks`, `indeks ${String(b.indeks)}, beklenen ${i}`);
    const id = dize(b.id, `${y}.id`);
    if (idler.has(id)) hata(`${y}.id`, `tekrarlanan bolge kimligi: ${id}`);
    idler.add(id);
    dize(b.devlet, `${y}.devlet`);
    dizi(b.etiketler, `${y}.etiketler`).forEach((e, j) => dize(e, `${y}.etiketler[${j}]`));
    if (b.sahip !== null) dize(b.sahip, `${y}.sahip`);
    tamsayi(b.nufus, `${y}.nufus`, 0);
    dizi(b.stoklar, `${y}.stoklar`, m).forEach((s, j) => stokDogrula(s, `${y}.stoklar[${j}]`));
    for (const k of ["israf", "uretimToplam", "uretimOrani", "rezervIlk", "rezervKalan"] as const) dizi(b[k], `${y}.${k}`, m);
    if (b.kesifSayisi !== undefined) dizi(b.kesifSayisi, `${y}.kesifSayisi`, m);
    tamsayi(b.uretimT0, `${y}.uretimT0`);
    dizi(b.birlikler, `${y}.birlikler`, birlikSayisi).forEach((x, j) => tamsayi(x, `${y}.birlikler[${j}]`, 0));
    dizi(b.tesisler, `${y}.tesisler`).forEach((t, j) => {
      const ty = `${y}.tesisler[${j}]`;
      const te = nesne(t, ty);
      alanlar(te, ty, ["id", "tur", "yontem", "aktif", "verimPpm", "isciPpm"]);
      tamsayi(te.tur, `${ty}.tur`, 0);
      tamsayi(te.yontem, `${ty}.yontem`, 0);
      mantik(te.aktif, `${ty}.aktif`);
    });
    dizi(b.ticaretEmirleri, `${y}.ticaretEmirleri`).forEach((e, j) => {
      const ey = `${y}.ticaretEmirleri[${j}]`;
      const em = nesne(e, ey);
      indeks(em.mal, `${ey}.mal`, m);
      if (em.yon !== "ihracat" && em.yon !== "ithalat") hata(`${ey}.yon`, `gecersiz yon: ${JSON.stringify(em.yon)}`);
    });
    alanlar(nesne(b.savunma, `${y}.savunma`), `${y}.savunma`, ["durus"]);
    if (b.merkez !== undefined) indeks(b.merkez, `${y}.merkez`, n);
  }
  // Mülk kipi (S3): işletme düğümünün merkezi harita bölgesi olmalı (merkezin kendi merkezi olmaz).
  for (let i = 0; i < n; i++) {
    const mz = (bolgeler[i] as Nesne).merkez;
    if (mz !== undefined && (bolgeler[mz as number] as Nesne).merkez !== undefined) hata(`$.bolgeler[${i}].merkez`, "merkez bir isletme dugumu olamaz");
  }
  for (let i = 0; i < kSayisi; i++) {
    const y = `$.kenarlar[${i}]`;
    const k = nesne(kenarlar[i], y);
    alanlar(k, y, ["indeks", "a", "b", "tur", "kapasiteSaat", "sureMs", "kullanilanSaat", "askeriKullanilanSaat"]);
    if (k.indeks !== i) hata(`${y}.indeks`, `indeks ${String(k.indeks)}, beklenen ${i}`);
    indeks(k.a, `${y}.a`, n);
    indeks(k.b, `${y}.b`, n);
  }

  // Oyuncular: kimliğe göre kesin artan (oyuncuBul ikili arama yapar)
  const oyuncular = dizi(d.oyuncular, "$.oyuncular");
  let onceki: string | null = null;
  oyuncular.forEach((v, i) => {
    const y = `$.oyuncular[${i}]`;
    const o = nesne(v, y);
    alanlar(o, y, ["id", "hazine", "vergiPpm", "teknolojiler", "arastirma", "askeriRezervPpm", "katilmaZamani", "korumaBitis", "kararlar"]);
    const id = dize(o.id, `${y}.id`);
    if (onceki !== null && !(onceki < id)) hata(`${y}.id`, `oyuncular kimlige gore kesin artan sirali olmali (${onceki} >= ${id})`);
    onceki = id;
    stokDogrula(o.hazine, `${y}.hazine`);
    dizi(o.teknolojiler, `${y}.teknolojiler`).forEach((t, j) => tamsayi(t, `${y}.teknolojiler[${j}]`, 0));
    if (o.arastirma !== null) alanlar(nesne(o.arastirma, `${y}.arastirma`), `${y}.arastirma`, ["teknoloji", "bitis"]);
    dizi(o.kararlar, `${y}.kararlar`).forEach((k, j) => dize(k, `${y}.kararlar[${j}]`));
  });

  // Pazar
  const pazar = nesne(d.pazar, "$.pazar");
  for (const k of ["fiyat", "oyuncuTalebi", "oyuncuArzi"] as const) dizi(pazar[k], `$.pazar.${k}`, m);

  // Diğer listeler
  dizi(d.savaslar, "$.savaslar").forEach((v, i) => {
    const s = nesne(v, `$.savaslar[${i}]`);
    indeks(s.saldiranBolge, `$.savaslar[${i}].saldiranBolge`, n);
    indeks(s.hedefBolge, `$.savaslar[${i}].hedefBolge`, n);
  });
  dizi(d.anlasmalar, "$.anlasmalar").forEach((v, i) => dizi(nesne(v, `$.anlasmalar[${i}]`).taraflar, `$.anlasmalar[${i}].taraflar`, 2));
  dizi(d.yaptirimlar, "$.yaptirimlar").forEach((v, i) => alanlar(nesne(v, `$.yaptirimlar[${i}]`), `$.yaptirimlar[${i}]`, ["uygulayan", "hedef"]));
  dizi(d.insaatlar, "$.insaatlar").forEach((v, i) => {
    const s = nesne(v, `$.insaatlar[${i}]`);
    alanlar(s, `$.insaatlar[${i}]`, ["id", "tur", "sahip", "bolge", "hedef", "bitis"]);
    indeks(s.bolge, `$.insaatlar[${i}].bolge`, n);
  });
  dizi(d.partiler, "$.partiler").forEach((v, i) => {
    const s = nesne(v, `$.partiler[${i}]`);
    alanlar(s, `$.partiler[${i}]`, ["id", "sahip", "bolge", "birlik", "adet", "bitis"]);
    indeks(s.bolge, `$.partiler[${i}].bolge`, n);
    indeks(s.birlik, `$.partiler[${i}].birlik`, birlikSayisi);
  });

  // Lojistik
  const l = nesne(d.lojistik, "$.lojistik");
  alanlar(l, "$.lojistik", ["akislar", "kirli", "cozumPlanli", "sonCozum", "cozumSayisi", "kapsam"]);
  mantik(l.kirli, "$.lojistik.kirli");
  mantik(l.cozumPlanli, "$.lojistik.cozumPlanli");
  tamsayi(l.sonCozum, "$.lojistik.sonCozum");
  tamsayi(l.cozumSayisi, "$.lojistik.cozumSayisi", 0);
  dizi(l.akislar, "$.lojistik.akislar").forEach((v, i) => {
    const y = `$.lojistik.akislar[${i}]`;
    const a = nesne(v, y);
    indeks(a.mal, `${y}.mal`, m);
    indeks(a.kaynak, `${y}.kaynak`, n);
    indeks(a.hedef, `${y}.hedef`, n);
    dizi(a.yol, `${y}.yol`).forEach((k, j) => indeks(k, `${y}.yol[${j}]`, kSayisi));
  });
  dizi(l.kapsam, "$.lojistik.kapsam", n).forEach((satir, i) => dizi(satir, `$.lojistik.kapsam[${i}]`, m));

  // İklim (isteğe bağlı)
  if (d.iklim !== undefined) {
    const ik = nesne(d.iklim, "$.iklim");
    dizi(ik.olaylar, "$.iklim.olaylar");
    tamsayi(ik.sonGun, "$.iklim.sonGun");
  }

  // Mülk (isteğe bağlı)
  if (d.mulk !== undefined) mulkDogrula(d.mulk, bolgeler, n);

  // PRNG: tam olarak bilinen akışlar, her biri 4 adet uint32
  const rng = nesne(d.rng, "$.rng");
  const akislar = Object.keys(rng).sort();
  const beklenen = [...PRNG_AKISLARI].sort();
  if (akislar.join(",") !== beklenen.join(",")) hata("$.rng", `akislar ${akislar.join(",")}, beklenen ${beklenen.join(",")}`);
  for (const a of beklenen) dizi(rng[a], `$.rng.${a}`, 4).forEach((x, j) => tamsayi(x, `$.rng.${a}[${j}]`, 0, 0xffffffff));

  // Sayaçlar ve kuyruk
  const sayac = nesne(d.sayac, "$.sayac");
  const olaySayaci = tamsayi(sayac.olay, "$.sayac.olay", 0);
  tamsayi(sayac.kimlik, "$.sayac.kimlik", 0);
  const kuyruk = dizi(d.kuyruk, "$.kuyruk");
  const siralar = new Set<number>();
  let tikVar = false;
  for (let i = 0; i < kuyruk.length; i++) {
    const y = `$.kuyruk[${i}]`;
    const o = nesne(kuyruk[i], y);
    tamsayi(o.t, `${y}.t`, zaman);
    const sira = tamsayi(o.sira, `${y}.sira`, 0, olaySayaci - 1);
    if (siralar.has(sira)) hata(`${y}.sira`, `tekrarlanan olay sirasi: ${sira}`);
    siralar.add(sira);
    const veri = nesne(o.veri, `${y}.veri`);
    const tur = dize(veri.tur, `${y}.veri.tur`);
    if (!Object.prototype.hasOwnProperty.call(OLAY_ONCELIGI, tur)) hata(`${y}.veri.tur`, `bilinmeyen olay turu: ${tur}`);
    if (o.oncelik !== OLAY_ONCELIGI[tur as keyof typeof OLAY_ONCELIGI]) hata(`${y}.oncelik`, `olay turu ${tur} icin oncelik yanlis: ${String(o.oncelik)}`);
    if (tur === "saatlik_tik") tikVar = true;
    if (tur === "oran_delta" || tur === "esik" || tur === "sondaj_bitti") {
      indeks(veri.bolge, `${y}.veri.bolge`, n);
      indeks(veri.mal, `${y}.veri.mal`, m);
    }
    // Yığın düzeni: ebeveyn çocuktan sonra gelemez
    if (i > 0) {
      const ebeveyn = kuyruk[(i - 1) >> 1] as Dunya["kuyruk"][number];
      if (kuyrukOnce(o as unknown as Dunya["kuyruk"][number], ebeveyn)) hata(y, `kuyruk yigin duzeni bozuk (ebeveyn ${(i - 1) >> 1})`);
    }
  }
  if (!tikVar) hata("$.kuyruk", "bekleyen saatlik_tik yok (saatlik tik zinciri kopuk)");
  return d as unknown as Dunya;
}

/** Dizinin `anahtar`a göre kesin artan (JS dize sırası) olduğunu denetler. */
function kesinArtan(dizi: unknown[], yol: string, anahtar: (x: Nesne, y: string) => string): void {
  let onceki: string | null = null;
  dizi.forEach((v, i) => {
    const y = `${yol}[${i}]`;
    const k = anahtar(nesne(v, y), y);
    if (onceki !== null && !(onceki < k)) hata(y, `kesin artan sirali olmali (${onceki} >= ${k})`);
    onceki = k;
  });
}

/** Mülk durumu biçimi: sıralı listeler, hücre/ilçe/işletme/oyuncu alanları, işletme düğümü indeksleri. */
function mulkDogrula(v: unknown, bolgeler: unknown[], n: number): void {
  const m = nesne(v, "$.mulk");
  alanlar(m, "$.mulk", ["hucreler", "ilceler", "isletmeler", "oyuncular"]);
  const hucreler = dizi(m.hucreler, "$.mulk.hucreler");
  kesinArtan(hucreler, "$.mulk.hucreler", (h, y) => {
    alanlar(h, y, ["id", "ilce", "sinif", "sahip", "degerMili", "alinma"]);
    if (h.sinif !== "kirsal" && h.sinif !== "kasaba" && h.sinif !== "sehir") hata(`${y}.sinif`, `gecersiz arsa sinifi: ${JSON.stringify(h.sinif)}`);
    dize(h.ilce, `${y}.ilce`);
    dize(h.sahip, `${y}.sahip`);
    tamsayi(h.degerMili, `${y}.degerMili`, 0);
    return dize(h.id, `${y}.id`);
  });
  kesinArtan(dizi(m.ilceler, "$.mulk.ilceler"), "$.mulk.ilceler", (c, y) => {
    alanlar(c, y, ["id", "il", "seviye", "uygunHucre", "satilmisHucre"]);
    const uygun = tamsayi(c.uygunHucre, `${y}.uygunHucre`, 0);
    tamsayi(c.satilmisHucre, `${y}.satilmisHucre`, 0, uygun);
    tamsayi(c.seviye, `${y}.seviye`, 0, 3);
    return dize(c.id, `${y}.id`);
  });
  kesinArtan(dizi(m.isletmeler, "$.mulk.isletmeler"), "$.mulk.isletmeler", (e, y) => {
    alanlar(e, y, ["oyuncu", "il", "merkezBolge", "bolgeIndeksi"]);
    const bi = indeks(e.bolgeIndeksi, `${y}.bolgeIndeksi`, n);
    const b = bolgeler[bi] as Nesne;
    const oyuncu = dize(e.oyuncu, `${y}.oyuncu`);
    const il = dize(e.il, `${y}.il`);
    if (b.merkez === undefined) hata(`${y}.bolgeIndeksi`, "isletme dugumu degil (merkez yok)");
    if (b.sahip !== oyuncu) hata(`${y}.oyuncu`, `dugumun sahibi ${String(b.sahip)}`);
    if (b.id !== `${il}#${oyuncu}`) hata(`${y}.bolgeIndeksi`, `dugum kimligi ${String(b.id)}, beklenen ${il}#${oyuncu}`);
    // (oyuncu, il) sırası: "\u0000" ayracı dize sırasını korur (kimlikler denetimli ASCII).
    return `${oyuncu}\u0000${il}`;
  });
  kesinArtan(dizi(m.oyuncular, "$.mulk.oyuncular"), "$.mulk.oyuncular", (o, y) => {
    alanlar(o, y, ["id", "araziDegeriMili", "ilceHucre", "araziVergisi", "sonEtkinlik"]);
    tamsayi(o.araziDegeriMili, `${y}.araziDegeriMili`, 0);
    stokDogrula(o.araziVergisi, `${y}.araziVergisi`);
    tamsayi(o.sonEtkinlik, `${y}.sonEtkinlik`);
    kesinArtan(dizi(o.ilceHucre, `${y}.ilceHucre`), `${y}.ilceHucre`, (k, ky) => {
      tamsayi(k.hucre, `${ky}.hucre`, 1);
      return dize(k.ilce, `${ky}.ilce`);
    });
    return dize(o.id, `${y}.id`);
  });
  // Her işletme düğümü kayıtlı olmalı
  let dugum = 0;
  for (const b of bolgeler) if ((b as Nesne).merkez !== undefined) dugum++;
  if (dugum !== dizi(m.isletmeler, "$.mulk.isletmeler").length) hata("$.mulk.isletmeler", `isletme kaydi ${dizi(m.isletmeler, "$.mulk.isletmeler").length}, isletme dugumu ${dugum}`);
}

/**
 * Kanonik JSON metninden dünya: JSON.parse + `dunyaDogrula`. Bozuk JSON veya biçim hatasında `SerilestirmeHatasi`.
 * Dönen nesne bağımsızdır (paylaşılan referans yok).
 */
export function dunyaCoz(metin: string): Dunya {
  if (typeof metin !== "string") hata("$", "metin bekleniyordu");
  let deger: unknown;
  try {
    deger = JSON.parse(metin);
  } catch (e) {
    hata("$", `gecersiz JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  return dunyaDogrula(deger);
}

/**
 * Dünyanın derlenmiş içerikle uyumu: bölge sayısı ve kimlikleri (sırayla), kenar, mal ve birlik sayıları, tesis türü /
 * yöntem / teknoloji indeks aralıkları, iklim durumunun varlığı (tarım açıklığı). Uyumsuzlukta `SerilestirmeHatasi`.
 */
export function dunyaIcerikUyumu(ic: DerlenmisIcerik, d: Dunya): void {
  const hb = ic.harita.bolgeler;
  const mulkAcik = ic.mulk !== undefined;
  if (mulkAcik !== (d.mulk !== undefined)) hata("$.mulk", mulkAcik ? "mulk kipi acik ama mulk durumu yok" : "mulk kipi kapali ama mulk durumu var");
  // Mülk kipinde harita bölgelerinden sonra işletme düğümleri gelir (büyüyebilen düğüm kümesi).
  if (mulkAcik ? d.bolgeler.length < hb.length : d.bolgeler.length !== hb.length) hata("$.bolgeler", `bolge sayisi ${d.bolgeler.length}, icerikte ${hb.length}`);
  d.bolgeler.forEach((b, i) => {
    const y = `$.bolgeler[${i}]`;
    if (i >= hb.length) {
      const ayrac = b.id.indexOf("#");
      const merkez = ayrac > 0 ? ic.mulk?.ilMerkezi.get(b.id.slice(0, ayrac)) : undefined;
      if (b.merkez === undefined || merkez !== b.merkez) hata(`${y}.merkez`, `isletme dugumu ilin merkezine bagli degil: ${b.id}`);
    } else {
      if (b.id !== hb[i]?.id) hata(`${y}.id`, `bolge kimligi ${b.id}, icerikte ${hb[i]?.id ?? "-"}`);
      if (b.merkez !== undefined) hata(`${y}.merkez`, "harita bolgesi isletme dugumu olamaz");
    }
    if (b.stoklar.length !== ic.mallar.length) hata(`${y}.stoklar`, `mal sayisi ${b.stoklar.length}, icerikte ${ic.mallar.length}`);
    if (b.birlikler.length !== ic.birlikler.length) hata(`${y}.birlikler`, `birlik sayisi ${b.birlikler.length}, icerikte ${ic.birlikler.length}`);
    b.tesisler.forEach((t, j) => {
      indeks(t.tur, `${y}.tesisler[${j}].tur`, ic.tesisTurleri.length);
      indeks(t.yontem, `${y}.tesisler[${j}].yontem`, ic.yontemler.length);
    });
  });
  if (d.kenarlar.length !== ic.harita.kenarlar.length) hata("$.kenarlar", `kenar sayisi ${d.kenarlar.length}, icerikte ${ic.harita.kenarlar.length}`);
  d.oyuncular.forEach((o, i) => {
    o.teknolojiler.forEach((t, j) => indeks(t, `$.oyuncular[${i}].teknolojiler[${j}]`, ic.teknolojiler.length));
    if (o.arastirma !== null) indeks(o.arastirma.teknoloji, `$.oyuncular[${i}].arastirma.teknoloji`, ic.teknolojiler.length);
  });
  if (d.mulk !== undefined && ic.mulk !== undefined) {
    const mk = ic.mulk;
    if (d.mulk.ilceler.length !== mk.ilceler.size) hata("$.mulk.ilceler", `ilce sayisi ${d.mulk.ilceler.length}, fiksturde ${mk.ilceler.size}`);
    d.mulk.ilceler.forEach((c, i) => {
      if (!mk.ilceler.has(c.id)) hata(`$.mulk.ilceler[${i}].id`, `fiksturde olmayan ilce: ${c.id}`);
    });
  }
  const tarimAcik = ic.param.tarim !== undefined;
  if (tarimAcik !== (d.iklim !== undefined)) hata("$.iklim", tarimAcik ? "tarim acik ama iklim durumu yok" : "tarim kapali ama iklim durumu var");
}

// ---------------------------------------------------------------------------
// Kural sürümü ve anlık görüntü zarfı
// ---------------------------------------------------------------------------

/** Kural verisinin kanonik JSON'u: anahtarlar sıralı; sayılar JSON biçiminde (ondalık veriye de izin verir). */
function kuralKanonik(v: unknown, cikti: string[], yol: string): void {
  if (v === null) {
    cikti.push("null");
    return;
  }
  switch (typeof v) {
    case "boolean":
      cikti.push(v ? "true" : "false");
      return;
    case "number":
      if (!Number.isFinite(v)) hata(yol, `sonlu olmayan sayi: ${String(v)}`);
      cikti.push(Object.is(v, -0) ? "0" : JSON.stringify(v));
      return;
    case "string":
      cikti.push(JSON.stringify(v));
      return;
    case "object": {
      if (Array.isArray(v)) {
        cikti.push("[");
        v.forEach((x: unknown, i) => {
          if (i > 0) cikti.push(",");
          if (x === undefined) cikti.push("null");
          else kuralKanonik(x, cikti, `${yol}[${i}]`);
        });
        cikti.push("]");
        return;
      }
      cikti.push("{");
      let ilk = true;
      for (const k of Object.keys(v).sort()) {
        const x = (v as Nesne)[k];
        if (x === undefined) continue;
        if (!ilk) cikti.push(",");
        ilk = false;
        cikti.push(JSON.stringify(k), ":");
        kuralKanonik(x, cikti, `${yol}.${k}`);
      }
      cikti.push("}");
      return;
    }
    default:
      hata(yol, `desteklenmeyen tip: ${typeof v}`);
  }
}

/**
 * Kural sürümü kimliği: içerik (`icerik.json`) ve parametre (`parametreler.json`) verisinin kanonik JSON'unun
 * FNV-1a 64 özeti, "k1-<16 hex>". Harita dahil DEĞİLDİR (dünya kimliği; uyumu `dunyaIcerikUyumu` denetler).
 * Herhangi bir içerik/parametre değeri değişirse kimlik değişir; anahtar sırası ve biçim boşlukları etkilemez.
 */
export function kuralSurumuHesapla(veri: Pick<VeriPaketi, "icerik" | "param">): string {
  const cikti: string[] = [];
  kuralKanonik({ icerik: veri.icerik, param: veri.param }, cikti, "$");
  return `k1-${fnv1a64(cikti.join(""))}`;
}

/** Anlık görüntü zarfı biçim sürümü. */
export const ANLIK_GORUNTU_SURUMU = 1;

export interface AnlikGoruntu {
  surum: 1;
  /** `kuralSurumuHesapla(veri)` ile üretilmiş kural kimliği. */
  kuralSurumu: string;
  /** Görüntü anındaki simülasyon zamanı (= dunya.zaman). */
  simZamani: Ms;
  /** `durumOzeti(dunya)` (FNV-1a 64, 16 hex). */
  durumOzeti: string;
  dunya: Dunya;
}

/**
 * Simülasyonun anlık görüntüsü (kanonik JSON metni): `{ dunya, durumOzeti, kuralSurumu, simZamani, surum: 1 }`.
 * Dünya bir kez serileştirilir; özet aynı metinden hesaplanır (= sim.durumOzeti()). Günlük zarfa girmez (sunucuda ayrı
 * tutulur: görüntüden sonraki başarılı komutlar `anlikGoruntudenYukle`'ye kuyruk olarak verilir).
 */
export function anlikGoruntuOlustur(sim: Pick<Simulasyon, "dunya">, kuralSurumu: string): string {
  return anlikGoruntuOlusturOzetli(sim, kuralSurumu).metin;
}

/**
 * `anlikGoruntuOlustur` ile aynı metin, ek olarak dünyanın durum özeti (aynı serileştirmeden; `sim.durumOzeti()` ile eşit).
 * Sunucu özeti ayrıca saklamak için dünyayı ikinci kez serileştirmek zorunda kalmaz.
 */
export function anlikGoruntuOlusturOzetli(sim: Pick<Simulasyon, "dunya">, kuralSurumu: string): { metin: string; durumOzeti: string } {
  if (typeof kuralSurumu !== "string" || kuralSurumu === "") hata("$.kuralSurumu", "bos olmayan dize bekleniyordu");
  const dunyaMetni = dunyaSerilestir(sim.dunya);
  const ozet = fnv1a64(dunyaMetni);
  // Anahtarlar sıralı: dunya < durumOzeti < kuralSurumu < simZamani < surum (zarf da kanonik JSON'dur).
  const metin =
    `{"dunya":${dunyaMetni},"durumOzeti":${JSON.stringify(ozet)},"kuralSurumu":${JSON.stringify(kuralSurumu)},` +
    `"simZamani":${sim.dunya.zaman},"surum":${ANLIK_GORUNTU_SURUMU}}`;
  return { metin, durumOzeti: ozet };
}

/**
 * Anlık görüntü metnini çözer ve doğrular: zarf alanları (sıkı), `surum === 1`, (verilmişse) beklenen kural sürümü,
 * `simZamani === dunya.zaman`, dünya biçimi (`dunyaDogrula`) ve özet (dünya yeniden kanonik serileştirilip
 * `durumOzeti` ile karşılaştırılır: bozulma/elle düzenleme yakalanır). Hata: `SerilestirmeHatasi`.
 */
export function anlikGoruntuCoz(metin: string, beklenenKuralSurumu?: string): AnlikGoruntu {
  let deger: unknown;
  try {
    deger = JSON.parse(metin);
  } catch (e) {
    hata("$", `gecersiz JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  const z = nesne(deger, "$");
  const zarfAlanlari = ["dunya", "durumOzeti", "kuralSurumu", "simZamani", "surum"];
  for (const k of zarfAlanlari) if (!(k in z)) hata(`$.${k}`, "zorunlu alan eksik");
  for (const k of Object.keys(z)) if (!zarfAlanlari.includes(k)) hata(`$.${k}`, "bilinmeyen zarf alani");
  if (z.surum !== ANLIK_GORUNTU_SURUMU) hata("$.surum", `desteklenmeyen anlik goruntu surumu: ${JSON.stringify(z.surum)}`);
  const kuralSurumu = dize(z.kuralSurumu, "$.kuralSurumu");
  if (beklenenKuralSurumu !== undefined && kuralSurumu !== beklenenKuralSurumu) {
    hata("$.kuralSurumu", `kural surumu uyusmuyor: goruntu ${kuralSurumu}, beklenen ${beklenenKuralSurumu}`);
  }
  const simZamani = tamsayi(z.simZamani, "$.simZamani", 0);
  const durumOzeti = dize(z.durumOzeti, "$.durumOzeti");
  if (!/^[0-9a-f]{16}$/.test(durumOzeti)) hata("$.durumOzeti", "16 haneli kucuk harf onaltilik bekleniyordu");
  let dunya: Dunya;
  try {
    dunya = dunyaDogrula(z.dunya);
  } catch (e) {
    if (e instanceof SerilestirmeHatasi) throw new SerilestirmeHatasi(e.yol.replace(/^\$/, "$.dunya"), e.message.slice(e.yol.length + 2));
    throw e;
  }
  if (dunya.zaman !== simZamani) hata("$.simZamani", `simZamani ${simZamani} != dunya.zaman ${dunya.zaman}`);
  const gercek = fnv1a64(dunyaSerilestir(dunya));
  if (gercek !== durumOzeti) hata("$.durumOzeti", `ozet uyusmuyor (bozuk anlik goruntu): kayitli ${durumOzeti}, hesaplanan ${gercek}`);
  return { surum: ANLIK_GORUNTU_SURUMU, kuralSurumu, simZamani, durumOzeti, dunya };
}
