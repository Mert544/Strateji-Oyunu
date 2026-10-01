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
 * - Anlık görüntü zarfı (sürüm 2): `{ dunya, durumOzeti, icerikKimlikTablosu, kuralSurumu, simZamani, surum: 2 }` (kendisi de
 *   kanonik JSON). `dunya` ve `durumOzeti` sürüm 1 ile BAYT BAYT aynıdır (indeksli kanonik metin; bölge kipi altınları
 *   değişmez); sürüm 2 yalnız içerik kimlik tablosunu ekler (docs/06 §14 "Kalıcı kimlik ve içerik göçü"). Sürüm 1
 *   görüntüleri (tablosuz) yüklenir; göç `anlikGoruntuUyarla` ile yapılır.
 * - `kuralSurumuHesapla(veri)`: içerik + parametre JSON'larının kanonik özetinden türetilen kimlik ("k1-<16 hex>").
 *
 * Bu modül motoru (Simulasyon) yalnız TİP olarak içe aktarır; yükleme `Simulasyon.yukle` / `anlikGoruntudenYukle`'dedir.
 */
import type { VeriPaketi } from "@bolge/veri";
import { PRNG_AKISLARI } from "./kurulum";
import { kuyrukOnce } from "./kuyruk";
import type { Simulasyon } from "./motor";
import {
  KIMLIK_TABLOSU_ADLARI,
  dunyaTabloUyumu,
  dunyaYenidenIndeksle,
  icerikKimlikTablosuOlustur,
  kimlikTablolariEsit,
  kimlikTablosuMetni,
  yalnizEkleDenetimi,
} from "./goc";
import type { EkleIhlali, IcerikKimlikTablosu } from "./goc";
import { durumIlceNo, durumUygunMu } from "./mulk/hucreDizini";
import { KAMU_ALGORITMA_SURUMU, kamuIndeksiAra, kamuIndeksiKur } from "./mulk/kamu";
import { fnv1a64 } from "./ozet";
import { KASA_GIRIS_KALEMLERI, LAVABO_KALEMLERI, MUSLUK_KALEMLERI, OLAY_ONCELIGI, SAAT } from "./tipler";
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

const KAMU_TURLERI = ["meydan", "pazar", "park", "hizmet", "kiyi", "sanayi_rezervi", "hazine"] as const;

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
    if (b.ekYapilar !== undefined) {
      if (b.merkez === undefined) hata(`${y}.ekYapilar`, "ek yapi yalniz isletme dugumunde olabilir");
      dizi(b.ekYapilar, `${y}.ekYapilar`).forEach((e, j) => {
        const ey = `${y}.ekYapilar[${j}]`;
        const ek = nesne(e, ey);
        tamsayi(ek.id, `${ey}.id`, 0);
        dize(ek.tur, `${ey}.tur`);
        dizi(ek.hucreler, `${ey}.hucreler`).forEach((h, k) => dize(h, `${ey}.hucreler[${k}]`));
      });
    }
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
    if (o.alinanOdul !== undefined) {
      let onceki: string | null = null;
      dizi(o.alinanOdul, `${y}.alinanOdul`).forEach((k, j) => {
        const kid = dize(k, `${y}.alinanOdul[${j}]`);
        if (onceki !== null && !(onceki < kid)) hata(`${y}.alinanOdul[${j}]`, `alinanOdul kimlige gore kesin artan sirali olmali (${onceki} >= ${kid})`);
        onceki = kid;
      });
    }
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
    if (s.ekYapi !== undefined) dize(s.ekYapi, `$.insaatlar[${i}].ekYapi`);
    if (s.indirimli !== undefined && s.indirimli !== true) hata(`$.insaatlar[${i}].indirimli`, "true ya da tanimsiz olmali");
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

/** Sayaç: { n, a } tamsayı; a ∈ [0, SAAT). */
function sayacDogrula(v: unknown, yol: string): void {
  const s = nesne(v, yol);
  alanlar(s, yol, ["n", "a"]);
  tamsayi(s.n, `${yol}.n`, 0);
  tamsayi(s.a, `${yol}.a`, 0, SAAT - 1);
}

/** Para defteri (docs/06 §15.7): musluk/lavabo sayaçları ve kasalar. */
function paraDogrula(v: unknown): void {
  const p = nesne(v, "$.mulk.para");
  alanlar(p, "$.mulk.para", ["surum", "musluk", "lavabo", "kasalar"]);
  if (p.surum !== 1) hata("$.mulk.para.surum", `desteklenmeyen para defteri surumu: ${JSON.stringify(p.surum)}`);
  const musluk = nesne(p.musluk, "$.mulk.para.musluk");
  for (const k of Object.keys(musluk)) if (!(MUSLUK_KALEMLERI as readonly string[]).includes(k)) hata(`$.mulk.para.musluk.${k}`, "bilinmeyen musluk kalemi");
  for (const k of MUSLUK_KALEMLERI) sayacDogrula(musluk[k], `$.mulk.para.musluk.${k}`);
  const lavabo = nesne(p.lavabo, "$.mulk.para.lavabo");
  for (const k of Object.keys(lavabo)) if (!(LAVABO_KALEMLERI as readonly string[]).includes(k)) hata(`$.mulk.para.lavabo.${k}`, "bilinmeyen lavabo kalemi");
  for (const k of LAVABO_KALEMLERI) sayacDogrula(lavabo[k], `$.mulk.para.lavabo.${k}`);
  kesinArtan(dizi(p.kasalar, "$.mulk.para.kasalar"), "$.mulk.para.kasalar", (k, y) => {
    alanlar(k, y, ["sahip", "giris", "cikisOyuncu", "cikisNpc", "rezervOyuncu", "rezervNpc", "gunler"]);
    const sahip = dize(k.sahip, `${y}.sahip`);
    if (!sahip.startsWith("k:")) hata(`${y}.sahip`, `kasa sahibi 'k:' ile baslamali: ${sahip}`);
    const giris = nesne(k.giris, `${y}.giris`);
    for (const g of Object.keys(giris)) if (!(KASA_GIRIS_KALEMLERI as readonly string[]).includes(g)) hata(`${y}.giris.${g}`, "bilinmeyen kasa giris kalemi");
    for (const g of KASA_GIRIS_KALEMLERI) sayacDogrula(giris[g], `${y}.giris.${g}`);
    for (const f of ["cikisOyuncu", "cikisNpc", "rezervOyuncu", "rezervNpc"] as const) tamsayi(k[f], `${y}.${f}`, 0);
    let oncekiGun = -1;
    dizi(k.gunler, `${y}.gunler`).forEach((g, j) => {
      const gy = `${y}.gunler[${j}]`;
      const gn = nesne(g, gy);
      alanlar(gn, gy, ["gun", "giris", "oyuncu", "npc"]);
      const gun = tamsayi(gn.gun, `${gy}.gun`, 0);
      if (gun <= oncekiGun) hata(`${gy}.gun`, "gunler kesin artan olmali");
      oncekiGun = gun;
      for (const f of ["giris", "oyuncu", "npc"] as const) tamsayi(gn[f], `${gy}.${f}`, 0);
    });
    return sahip;
  });
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
    const satilmis = tamsayi(c.satilmisHucre, `${y}.satilmisHucre`, 0, uygun);
    if (c.ayrilmisSatilmis !== undefined) tamsayi(c.ayrilmisSatilmis, `${y}.ayrilmisSatilmis`, 1, satilmis);
    if (c.ayrilmisGunluk !== undefined) {
      const g = nesne(c.ayrilmisGunluk, `${y}.ayrilmisGunluk`);
      alanlar(g, `${y}.ayrilmisGunluk`, ["gun", "adet"]);
      tamsayi(g.gun, `${y}.ayrilmisGunluk.gun`, 0);
      tamsayi(g.adet, `${y}.ayrilmisGunluk.adet`, 1, uygun);
    }
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
    if (o.indirimliYapi !== undefined) tamsayi(o.indirimliYapi, `${y}.indirimliYapi`, 1);
    if (o.ayrilmisHucre !== undefined) tamsayi(o.ayrilmisHucre, `${y}.ayrilmisHucre`, 1);
    if (o.katilimIlcesi !== undefined) dize(o.katilimIlcesi, `${y}.katilimIlcesi`);
    if (o.paraAkisi !== undefined) {
      const pa = nesne(o.paraAkisi, `${y}.paraAkisi`);
      alanlar(pa, `${y}.paraAkisi`, ["t0", "ihracat", "nufus", "ithalat", "isletme", "vergi", "kasa"]);
      tamsayi(pa.t0, `${y}.paraAkisi.t0`, 0);
      for (const k of ["ihracat", "nufus", "ithalat", "isletme", "vergi"] as const) tamsayi(pa[k], `${y}.paraAkisi.${k}`);
      let oncekiKasa: string | null = null;
      dizi(pa.kasa, `${y}.paraAkisi.kasa`).forEach((e, j) => {
        const ey = `${y}.paraAkisi.kasa[${j}]`;
        const en = nesne(e, ey);
        alanlar(en, ey, ["sahip", "kalem", "oran"]);
        const sahip = dize(en.sahip, `${ey}.sahip`);
        if (!sahip.startsWith("k:")) hata(`${ey}.sahip`, `kasa sahibi 'k:' ile baslamali: ${sahip}`);
        const kalem = dize(en.kalem, `${ey}.kalem`);
        if (!(KASA_GIRIS_KALEMLERI as readonly string[]).includes(kalem)) hata(`${ey}.kalem`, `gecersiz kasa kalemi: ${kalem}`);
        tamsayi(en.oran, `${ey}.oran`, 1);
        const anahtar = `${sahip}\u0000${kalem}`;
        if (oncekiKasa !== null && !(oncekiKasa < anahtar)) hata(ey, "kasa oranlari (sahip, kalem) siraliyla kesin artan olmali");
        oncekiKasa = anahtar;
      });
    }
    kesinArtan(dizi(o.ilceHucre, `${y}.ilceHucre`), `${y}.ilceHucre`, (k, ky) => {
      tamsayi(k.hucre, `${ky}.hucre`, 1);
      return dize(k.ilce, `${ky}.ilce`);
    });
    return dize(o.id, `${y}.id`);
  });
  // Kamu arsası (isteğe bağlı): ilçe kimliğine göre kesin artan; her grup (sahip, tür) kesin artan; kompakt satır aralıkları kanonik
  if ((m.kamuParametre !== undefined || m.kamuSurumu !== undefined) && m.kamu === undefined) hata("$.mulk.kamu", "kamuParametre/kamuSurumu var ama kamu durumu yok");
  if (m.kamu !== undefined) {
    if (m.kamuParametre === undefined) hata("$.mulk.kamuParametre", "zorunlu alan eksik (kamu ile birlikte yazilir)");
    nesne(m.kamuParametre, "$.mulk.kamuParametre");
    tamsayi(m.kamuSurumu, "$.mulk.kamuSurumu", 1, KAMU_ALGORITMA_SURUMU);
    const ilceKimlikleri = new Set(dizi(m.ilceler, "$.mulk.ilceler").map((c) => (c as Nesne).id as string));
    const kamuDizisi = dizi(m.kamu, "$.mulk.kamu");
    if (kamuDizisi.length !== ilceKimlikleri.size) hata("$.mulk.kamu", `kamu kaydi ${kamuDizisi.length}, ilce ${ilceKimlikleri.size} (her ilce icin bir kayit)`);
    kesinArtan(kamuDizisi, "$.mulk.kamu", (k, y) => {
      alanlar(k, y, ["ilce", "gruplar"]);
      const ilce = dize(k.ilce, `${y}.ilce`);
      if (!ilceKimlikleri.has(ilce)) hata(`${y}.ilce`, `bilinmeyen ilce: ${ilce}`);
      let oncekiGrup: string | null = null;
      const gruplar: { sahip: string; tur: string; dikdortgenler: number[] }[] = [];
      dizi(k.gruplar, `${y}.gruplar`).forEach((gv, j) => {
        const gy = `${y}.gruplar[${j}]`;
        const g = nesne(gv, gy);
        alanlar(g, gy, ["sahip", "tur", "dikdortgenler"]);
        const sahip = dize(g.sahip, `${gy}.sahip`);
        if (!sahip.startsWith("k:")) hata(`${gy}.sahip`, `kamu sahibi 'k:' ile baslamali: ${sahip}`);
        const tur = dize(g.tur, `${gy}.tur`);
        if (!(KAMU_TURLERI as readonly string[]).includes(tur)) hata(`${gy}.tur`, `gecersiz kamu turu: ${tur}`);
        const anahtar = `${sahip}\u0000${tur}`;
        if (oncekiGrup !== null && !(oncekiGrup < anahtar)) hata(gy, "gruplar (sahip, tur) siraliyla kesin artan olmali");
        oncekiGrup = anahtar;
        const dik = dizi(g.dikdortgenler, `${gy}.dikdortgenler`);
        if (dik.length === 0 || dik.length % 4 !== 0) hata(`${gy}.dikdortgenler`, "bos olmayan [x0, y0, x1, y1] dortlusu listesi bekleniyordu");
        const l: number[] = [];
        let oy = -1;
        let ox = -1;
        for (let i = 0; i < dik.length; i += 4) {
          const x0 = tamsayi(dik[i], `${gy}.dikdortgenler[${i}]`, 0, (1 << 20) - 1);
          const y0 = tamsayi(dik[i + 1], `${gy}.dikdortgenler[${i + 1}]`, 0, (1 << 20) - 1);
          const x1 = tamsayi(dik[i + 2], `${gy}.dikdortgenler[${i + 2}]`, 0, (1 << 20) - 1);
          const y1 = tamsayi(dik[i + 3], `${gy}.dikdortgenler[${i + 3}]`, 0, (1 << 20) - 1);
          if (x0 > x1 || y0 > y1) hata(`${gy}.dikdortgenler[${i}]`, `dikdortgen ters: (${x0},${y0})-(${x1},${y1})`);
          // kanonik: (y0, x0) kesin artan
          if (y0 < oy || (y0 === oy && x0 <= ox)) hata(`${gy}.dikdortgenler[${i}]`, "dikdortgenler (y0, x0) siraliyla kesin artan olmali");
          oy = y0;
          ox = x0;
          l.push(x0, y0, x1, y1);
        }
        gruplar.push({ sahip, tur, dikdortgenler: l });
      });
      // gruplar arası çakışma ve sahipli hücrelerle çakışma
      let ix;
      try {
        ix = kamuIndeksiKur(gruplar);
      } catch (e) {
        hata(`${y}.gruplar`, e instanceof Error ? e.message : String(e));
      }
      for (const [j, h] of (m.hucreler as Nesne[]).entries()) {
        if (h.ilce !== ilce) continue;
        const [hx, hy] = (h.id as string).split(":").map(Number) as [number, number];
        if (kamuIndeksiAra(ix, hx, hy) >= 0) hata(`$.mulk.hucreler[${j}]`, `kamu hucresi sahipli: ${String(h.id)}`);
      }
      return ilce;
    });
  }
  if (m.para !== undefined) paraDogrula(m.para);
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
 * yöntem / teknoloji indeks aralıkları, tarım ürünü sayısı, iklim durumunun varlığı (tarım açıklığı). Uyumsuzlukta
 * `SerilestirmeHatasi`. İçerik değişmişse (kimlik ekleme) önce `anlikGoruntuUyarla` ile dünya yeniden indekslenir.
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
    for (const [j, e] of (b.ekYapilar ?? []).entries()) {
      if (ic.mulk?.ekYapiIndeks.has(e.tur) !== true) hata(`${y}.ekYapilar[${j}].tur`, `icerikte olmayan ek yapi: ${e.tur}`);
    }
    b.tesisler.forEach((t, j) => {
      indeks(t.tur, `${y}.tesisler[${j}].tur`, ic.tesisTurleri.length);
      indeks(t.yontem, `${y}.tesisler[${j}].yontem`, ic.yontemler.length);
    });
    const urunSayisi = ic.icerik.tarimUrunleri?.length ?? 0;
    if (b.tarim !== undefined && b.tarim.ekimPpm.length !== urunSayisi) hata(`${y}.tarim.ekimPpm`, `tarim urunu sayisi ${b.tarim.ekimPpm.length}, icerikte ${urunSayisi}`);
  });
  if (d.kenarlar.length !== ic.harita.kenarlar.length) hata("$.kenarlar", `kenar sayisi ${d.kenarlar.length}, icerikte ${ic.harita.kenarlar.length}`);
  d.oyuncular.forEach((o, i) => {
    o.teknolojiler.forEach((t, j) => indeks(t, `$.oyuncular[${i}].teknolojiler[${j}]`, ic.teknolojiler.length));
    if (o.arastirma !== null) indeks(o.arastirma.teknoloji, `$.oyuncular[${i}].arastirma.teknoloji`, ic.teknolojiler.length);
  });
  if (d.mulk !== undefined && ic.mulk !== undefined) {
    const mk = ic.mulk;
    if (d.mulk.ilceler.length !== mk.ilceler.size) hata("$.mulk.ilceler", `ilce sayisi ${d.mulk.ilceler.length}, fiksturde ${mk.ilceler.size}`);
    if (d.mulk.para !== undefined && mk.p.kasa === undefined) hata("$.mulk.para", "para defteri var ama kasa parametresi (mulk.kasa) tanimli degil");
    const kamuKaydi = new Map((d.mulk.kamu ?? []).map((k) => [k.ilce, k]));
    if (d.mulk.kamu !== undefined && mk.p.kamu === undefined) hata("$.mulk.kamu", "kamu durumu var ama kamu parametresi (mulk.kamu) tanimli degil");
    d.mulk.ilceler.forEach((c, i) => {
      const tanim = mk.ilceler.get(c.id);
      if (tanim === undefined) hata(`$.mulk.ilceler[${i}].id`, `fiksturde olmayan ilce: ${c.id}`);
      // Kamu kuralıyla kurulmuş dünyada uygunHucre = fikstür uygun - kamu; kamu hücreleri fikstürde bu ilçenin UYGUN hücreleridir.
      const kamu = kamuKaydi.get(c.id);
      if (d.mulk?.kamu !== undefined) {
        if (kamu === undefined) hata(`$.mulk.ilceler[${i}].id`, `kamu kaydi yok: ${c.id}`);
        let sayi = 0;
        for (const g of kamu.gruplar) {
          for (let i = 0; i < g.dikdortgenler.length; i += 4) {
            for (let yy = g.dikdortgenler[i + 1] as number; yy <= (g.dikdortgenler[i + 3] as number); yy++) {
              for (let xx = g.dikdortgenler[i] as number; xx <= (g.dikdortgenler[i + 2] as number); xx++) {
                const hd = mk.dizin.hucreDurum(xx, yy);
                if (hd < 0 || mk.dizin.ilceKimligi(durumIlceNo(hd)) !== c.id || !durumUygunMu(hd)) hata(`$.mulk.kamu`, `kamu hucresi ilcede uygun hucre degil: ${xx}:${yy} (${c.id})`);
                sayi++;
              }
            }
          }
        }
        if (c.uygunHucre !== tanim.uygunHucre - sayi) hata(`$.mulk.ilceler[${i}].uygunHucre`, `uygunHucre ${c.uygunHucre}, beklenen ${tanim.uygunHucre - sayi} (fikstur ${tanim.uygunHucre} - kamu ${sayi})`);
      }
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

/** Anlık görüntü zarfı biçim sürümü (yazılan): 2 = içerik kimlik tablosu var. */
export const ANLIK_GORUNTU_SURUMU = 2;
/** Okunabilen eski zarf sürümü: 1 = kimlik tablosu yok (göç için `GocSecenegi.eskiTablo` gerekebilir). */
export const ANLIK_GORUNTU_ESKI_SURUMU = 1;

export interface AnlikGoruntu {
  surum: 1 | 2;
  /** `kuralSurumuHesapla(veri)` ile üretilmiş kural kimliği. */
  kuralSurumu: string;
  /** Görüntü anındaki simülasyon zamanı (= dunya.zaman). */
  simZamani: Ms;
  /** `durumOzeti(dunya)` (FNV-1a 64, 16 hex): YAZILDIĞI HALİYLE dünyanın özeti (göçten sonraki dünyanın değil). */
  durumOzeti: string;
  /** Yazıldığı andaki içerik kimlik tablosu (yalnız sürüm 2). `dunya`nın indeks uzayları bu tabloya göredir. */
  icerikKimlikTablosu?: IcerikKimlikTablosu;
  /** Yazıldığı haliyle dünya (içerik indeksleri `icerikKimlikTablosu`na göre; mevcut içeriğe `anlikGoruntuUyarla` uyarlar). */
  dunya: Dunya;
}

/**
 * Simülasyonun anlık görüntüsü (kanonik JSON metni): `{ dunya, durumOzeti, icerikKimlikTablosu, kuralSurumu, simZamani, surum: 2 }`.
 * Dünya bir kez serileştirilir; özet aynı metinden hesaplanır (= sim.durumOzeti()). Günlük zarfa girmez (sunucuda ayrı
 * tutulur: görüntüden sonraki başarılı komutlar `anlikGoruntudenYukle`'ye kuyruk olarak verilir).
 */
export function anlikGoruntuOlustur(sim: Pick<Simulasyon, "dunya" | "ic">, kuralSurumu: string): string {
  return anlikGoruntuOlusturOzetli(sim, kuralSurumu).metin;
}

/**
 * `anlikGoruntuOlustur` ile aynı metin, ek olarak dünyanın durum özeti (aynı serileştirmeden; `sim.durumOzeti()` ile eşit).
 * Sunucu özeti ayrıca saklamak için dünyayı ikinci kez serileştirmek zorunda kalmaz.
 */
export function anlikGoruntuOlusturOzetli(sim: Pick<Simulasyon, "dunya" | "ic">, kuralSurumu: string): { metin: string; durumOzeti: string } {
  if (typeof kuralSurumu !== "string" || kuralSurumu === "") hata("$.kuralSurumu", "bos olmayan dize bekleniyordu");
  const dunyaMetni = dunyaSerilestir(sim.dunya);
  const ozet = fnv1a64(dunyaMetni);
  const tablo = icerikKimlikTablosuOlustur(sim.ic);
  // Anahtarlar sıralı: dunya < durumOzeti < icerikKimlikTablosu < kuralSurumu < simZamani < surum (zarf da kanonik JSON'dur).
  const metin =
    `{"dunya":${dunyaMetni},"durumOzeti":${JSON.stringify(ozet)},"icerikKimlikTablosu":${kimlikTablosuMetni(tablo)},` +
    `"kuralSurumu":${JSON.stringify(kuralSurumu)},"simZamani":${sim.dunya.zaman},"surum":${ANLIK_GORUNTU_SURUMU}}`;
  return { metin, durumOzeti: ozet };
}

/** Zarf düzeyindeki kimlik tablosunu doğrular: bilinen altı uzay, her biri benzersiz boş olmayan dizelerden dizi. */
function kimlikTablosuDogrula(v: unknown, yol: string): IcerikKimlikTablosu {
  const o = nesne(v, yol);
  for (const k of Object.keys(o)) if (!(KIMLIK_TABLOSU_ADLARI as readonly string[]).includes(k)) hata(`${yol}.${k}`, "bilinmeyen kimlik tablosu");
  const t = {} as IcerikKimlikTablosu;
  for (const ad of KIMLIK_TABLOSU_ADLARI) {
    if (!(ad in o)) hata(`${yol}.${ad}`, "zorunlu alan eksik");
    const goruldu = new Set<string>();
    t[ad] = dizi(o[ad], `${yol}.${ad}`).map((x, i) => {
      const id = dize(x, `${yol}.${ad}[${i}]`);
      if (id === "") hata(`${yol}.${ad}[${i}]`, "bos kimlik");
      if (goruldu.has(id)) hata(`${yol}.${ad}[${i}]`, `tekrarlanan kimlik: ${id}`);
      goruldu.add(id);
      return id;
    });
  }
  return t;
}

/** Dünya yolu ($.bolgeler...) hatasını zarf yoluna ($.dunya.bolgeler...) çevirir. */
function dunyaYoluHatasi(yol: string, mesaj: string): SerilestirmeHatasi {
  return new SerilestirmeHatasi(yol.replace(/^\$/, "$.dunya"), mesaj);
}

function zarfYoluHatasi(yol: string, mesaj: string): SerilestirmeHatasi {
  return new SerilestirmeHatasi(yol, mesaj);
}

/**
 * Anlık görüntü metnini çözer ve doğrular: zarf alanları (sıkı), `surum` 1 ya da 2, (verilmişse) beklenen kural sürümü,
 * `simZamani === dunya.zaman`, dünya biçimi (`dunyaDogrula`), sürüm 2'de kimlik tablosu ve dünyanın tabloyla uyumu, ve özet
 * (dünya yeniden kanonik serileştirilip `durumOzeti` ile karşılaştırılır: bozulma/elle düzenleme yakalanır). Dönen dünya
 * YAZILDIĞI HALİYLEDİR; içerik değişmişse `anlikGoruntuUyarla` ile mevcut içeriğe göçürülür. Hata: `SerilestirmeHatasi`.
 */
export function anlikGoruntuCoz(metin: string, beklenenKuralSurumu?: string): AnlikGoruntu {
  let deger: unknown;
  try {
    deger = JSON.parse(metin);
  } catch (e) {
    hata("$", `gecersiz JSON: ${e instanceof Error ? e.message : String(e)}`);
  }
  const z = nesne(deger, "$");
  if (!("surum" in z)) hata("$.surum", "zorunlu alan eksik");
  if (z.surum !== ANLIK_GORUNTU_SURUMU && z.surum !== ANLIK_GORUNTU_ESKI_SURUMU) hata("$.surum", `desteklenmeyen anlik goruntu surumu: ${JSON.stringify(z.surum)}`);
  const surum = z.surum as 1 | 2;
  const zarfAlanlari = surum === 2 ? ["dunya", "durumOzeti", "icerikKimlikTablosu", "kuralSurumu", "simZamani", "surum"] : ["dunya", "durumOzeti", "kuralSurumu", "simZamani", "surum"];
  for (const k of zarfAlanlari) if (!(k in z)) hata(`$.${k}`, "zorunlu alan eksik");
  for (const k of Object.keys(z)) if (!zarfAlanlari.includes(k)) hata(`$.${k}`, "bilinmeyen zarf alani");
  const kuralSurumu = dize(z.kuralSurumu, "$.kuralSurumu");
  if (beklenenKuralSurumu !== undefined && kuralSurumu !== beklenenKuralSurumu) {
    hata("$.kuralSurumu", `kural surumu uyusmuyor: goruntu ${kuralSurumu}, beklenen ${beklenenKuralSurumu}`);
  }
  const simZamani = tamsayi(z.simZamani, "$.simZamani", 0);
  const durumOzeti = dize(z.durumOzeti, "$.durumOzeti");
  if (!/^[0-9a-f]{16}$/.test(durumOzeti)) hata("$.durumOzeti", "16 haneli kucuk harf onaltilik bekleniyordu");
  const tablo = surum === 2 ? kimlikTablosuDogrula(z.icerikKimlikTablosu, "$.icerikKimlikTablosu") : undefined;
  let dunya: Dunya;
  try {
    dunya = dunyaDogrula(z.dunya);
  } catch (e) {
    if (e instanceof SerilestirmeHatasi) throw dunyaYoluHatasi(e.yol, e.message.slice(e.yol.length + 2));
    throw e;
  }
  if (dunya.zaman !== simZamani) hata("$.simZamani", `simZamani ${simZamani} != dunya.zaman ${dunya.zaman}`);
  if (tablo !== undefined) dunyaTabloUyumu(tablo, dunya, dunyaYoluHatasi);
  const gercek = fnv1a64(dunyaSerilestir(dunya));
  if (gercek !== durumOzeti) hata("$.durumOzeti", `ozet uyusmuyor (bozuk anlik goruntu): kayitli ${durumOzeti}, hesaplanan ${gercek}`);
  return { surum, kuralSurumu, simZamani, durumOzeti, ...(tablo !== undefined ? { icerikKimlikTablosu: tablo } : {}), dunya };
}

// ---------------------------------------------------------------------------
// İçerik göçü (G8): kural sürümü politikası + kimlik eşlemesi
// ---------------------------------------------------------------------------

/** Anlık görüntü göç seçenekleri. */
export interface GocSecenegi {
  /**
   * Kural sürümü farklıysa (içerik/parametre değişmiş) yüklemeye izin ver. Varsayılan false: sürüm uyuşmazlığı hata
   * (davranış değişmez). Yetki açıktır ve işletmecinin kararıdır (dönem sınırı); izin verilse bile kaldırılmış kimlik
   * hatadır ve yalnız kimlik EKLEME (ve parametre/denge değişimi) yüklenir.
   */
  gocIzni?: boolean;
  /** true: araya ekleme / sıra değişimi de hata (yalnız sona ekleme kabul). Varsayılan false (kimlikle eşlenir, rapora yazılır). */
  yalnizEkleZorunlu?: boolean;
  /**
   * Yalnız SÜRÜM 1 görüntüler için: görüntünün yazıldığı içeriğin kimlik tablosu (`icerikKimlikTablosuOlustur`). Sürüm 1
   * zarfında tablo yoktur; kural sürümü mevcutla aynıysa tablo mevcut içeriktir (gerekmez), farklıysa bu seçenek şarttır.
   */
  eskiTablo?: IcerikKimlikTablosu;
}

/** Göç raporu (sunucu / ölçüm tarafı için). */
export interface GocRaporu {
  /** Dünya yeniden indekslendi mi (kimlik tabloları farklıydı)? */
  yenidenIndekslendi: boolean;
  /** Kural sürümü (içerik/parametre) görüntüyle farklı mı? */
  kuralDegisti: boolean;
  eskiKuralSurumu: string;
  yeniKuralSurumu: string;
  /** Görüntüdeki (yazıldığı haliyle) dünyanın özeti. `yenidenIndekslendi` ise yüklenen dünyanın özetiyle EŞİT OLMAZ. */
  eskiDurumOzeti: string;
  /** Yalnızca sona ekleme miydi? */
  yalnizEkle: boolean;
  /** İçerikte yeni olan, varsayılanla doldurulan kimlikler. */
  eklenen: IcerikKimlikTablosu;
  /** Yalnız-ekle ihlalleri (araya ekleme / taşıma; silme zaten hata). */
  ihlaller: EkleIhlali[];
}

/**
 * Anlık görüntüyü mevcut içeriğe uyarlar (yükleme kuralları):
 * 1. Kural sürümü aynıysa: kimlik tablosu mevcut içerikle birebir aynı olmalıdır (aksi halde bozuk görüntü); dünya olduğu gibi döner.
 * 2. Kural sürümü farklıysa: `gocIzni` yoksa `kural surumu uyusmuyor` hatası; varsa göç denenir.
 * 3. Göç: görüntüdeki her kimlik mevcut içerikte olmalıdır (kaldırılmış kimlik = açık hata); yeni kimlikler varsayılanla
 *    doldurulur; sıra farkı kimlikle eşlenir (`yalnizEkleZorunlu` ise araya ekleme/taşıma hata).
 * Dünya YERİNDE dönüştürülür (kopyalanmaz). Sürüm 1 görüntüler için `GocSecenegi.eskiTablo`.
 */
export function anlikGoruntuUyarla(
  g: AnlikGoruntu,
  ic: DerlenmisIcerik,
  kuralSurumu: string,
  secenek: GocSecenegi = {},
): { dunya: Dunya; goc: GocRaporu } {
  const yeniTablo = icerikKimlikTablosuOlustur(ic);
  const kuralAyni = g.kuralSurumu === kuralSurumu;
  if (!kuralAyni && secenek.gocIzni !== true) {
    hata("$.kuralSurumu", `kural surumu uyusmuyor: goruntu ${g.kuralSurumu}, beklenen ${kuralSurumu} (icerik/parametre degismis: goc icin gocIzni gerekir)`);
  }
  let eskiTablo: IcerikKimlikTablosu;
  if (g.icerikKimlikTablosu !== undefined) eskiTablo = g.icerikKimlikTablosu;
  else if (kuralAyni) eskiTablo = yeniTablo;
  else if (secenek.eskiTablo !== undefined) eskiTablo = kimlikTablosuDogrula(secenek.eskiTablo, "$.eskiTablo");
  else {
    hata(
      "$.icerikKimlikTablosu",
      `surum ${g.surum} goruntude kimlik tablosu yok ve kural surumu uyusmuyor (goruntu ${g.kuralSurumu}, beklenen ${kuralSurumu}): ` +
        "goruntunun yazildigi icerigin tablosu `eskiTablo` ile verilmeli",
    );
  }
  const tabloAyni = kimlikTablolariEsit(eskiTablo, yeniTablo);
  if (kuralAyni && !tabloAyni) hata("$.icerikKimlikTablosu", "kural surumu ayni ama kimlik tablosu mevcut icerikten farkli (bozuk goruntu)");
  const denetim = yalnizEkleDenetimi(eskiTablo, yeniTablo);
  for (const ad of KIMLIK_TABLOSU_ADLARI) {
    const k = denetim.silinen[ad][0];
    if (k !== undefined) hata(`$.icerikKimlikTablosu.${ad}[${eskiTablo[ad].indexOf(k)}]`, `kaldirilmis kimlik: ${k} (yalniz-ekle ilkesi: icerikten kimlik silinemez)`);
  }
  const ihlal = denetim.ihlaller[0];
  if (secenek.yalnizEkleZorunlu === true && ihlal !== undefined) {
    const yer = ihlal.tur === "tasinan" ? `${ihlal.eskiIndeks} -> ${ihlal.yeniIndeks}` : `indeks ${ihlal.yeniIndeks}`;
    hata(`$.icerikKimlikTablosu.${ihlal.tablo}`, `yalniz-ekle ihlali (${ihlal.tur}): ${ihlal.kimlik} (${yer}); icerik yalniz sona eklenebilir`);
  }
  if (g.icerikKimlikTablosu === undefined) dunyaTabloUyumu(eskiTablo, g.dunya, dunyaYoluHatasi);
  const dunya = tabloAyni ? g.dunya : dunyaYenidenIndeksle(g.dunya, eskiTablo, ic, zarfYoluHatasi);
  return {
    dunya,
    goc: {
      yenidenIndekslendi: !tabloAyni,
      kuralDegisti: !kuralAyni,
      eskiKuralSurumu: g.kuralSurumu,
      yeniKuralSurumu: kuralSurumu,
      eskiDurumOzeti: g.durumOzeti,
      yalnizEkle: denetim.yalnizEkle,
      eklenen: denetim.eklenen,
      ihlaller: denetim.ihlaller,
    },
  };
}
