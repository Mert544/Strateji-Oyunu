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
import { adKanonik } from "./ad";
import { MULKSUZ_PAKET } from "./mulksuz";
import { KASA_GIRIS_ISTEGE_BAGLI, KASA_GIRIS_KALEMLERI, LAVABO_ISTEGE_BAGLI, LAVABO_KALEMLERI, MUSLUK_ISTEGE_BAGLI, MUSLUK_KALEMLERI, OLAY_ONCELIGI, PPM, SAAT, GUN } from "./tipler";
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
const DUNYA_ISTEGE_BAGLI = ["iklim", "mulk", "baskinlar", "eskiyaTakvim"] as const;

/** Yeni PvE kayıtları strict'tir; bilinmeyen alt alan sessizce kabul edilmez. */
function pveNesne(v: unknown, yol: string, zorunlu: readonly string[], istegeBagli: readonly string[] = []): Nesne {
  const n = nesne(v, yol);
  alanlar(n, yol, zorunlu);
  const izinli = new Set([...zorunlu, ...istegeBagli]);
  for (const k of Object.keys(n)) if (!izinli.has(k)) hata(`${yol}.${k}`, "bilinmeyen PvE alani");
  return n;
}

function pveCiftler(v: unknown, yol: string, kimlik: "dize" | "sayi", enAz = 1): void {
  const gorulen = new Set<string | number>();
  dizi(v, yol).forEach((c, i) => {
    const cy = `${yol}[${i}]`;
    const t = dizi(c, cy, 2);
    const id = kimlik === "dize" ? dize(t[0], `${cy}[0]`) : tamsayi(t[0], `${cy}[0]`, 0);
    if (gorulen.has(id)) hata(cy, "tekrarlanan PvE kimligi");
    gorulen.add(id);
    tamsayi(t[1], `${cy}[1]`, enAz);
  });
}

function baskinlariDogrula(d: Nesne, zaman: number): Set<number> {
  const kimlikler = new Set<number>();
  let sonKimlik = 0;
  if (d.eskiyaTakvim !== undefined) {
    const t = pveNesne(d.eskiyaTakvim, "$.eskiyaTakvim", ["sonGun", "etkin"]);
    tamsayi(t.sonGun, "$.eskiyaTakvim.sonGun", -1, Math.floor(zaman / 86_400_000));
    mantik(t.etkin, "$.eskiyaTakvim.etkin");
  }
  if (d.baskinlar === undefined) {
    if (d.eskiyaTakvim !== undefined) hata("$.baskinlar", "takvim varken baskin kaydi gerekli");
    return kimlikler;
  }
  if (d.mulk === undefined || d.eskiyaTakvim === undefined) hata("$.baskinlar", "baskinlar yalniz mulk ve takvimle olabilir");
  const dugumler = new Set(dizi(d.bolgeler, "$.bolgeler").map((b) => dize(nesne(b, "$.bolgeler[]").id, "$.bolgeler[].id")));
  const oyuncular = new Set(dizi(d.oyuncular, "$.oyuncular").map((o) => dize(nesne(o, "$.oyuncular[]").id, "$.oyuncular[].id")));
  const bag = (oyuncu: unknown, dugum: unknown, y: string): void => {
    if (!oyuncular.has(dize(oyuncu, `${y}.oyuncu`))) hata(`${y}.oyuncu`, "bilinmeyen oyuncu");
    if (!dugumler.has(dize(dugum, `${y}.dugum`))) hata(`${y}.dugum`, "bilinmeyen dugum");
  };
  dizi(d.baskinlar, "$.baskinlar").forEach((v, i) => {
    const y = `$.baskinlar[${i}]`;
    const b = pveNesne(v, y, ["id", "il", "ilce", "boy", "gb", "bant", "duyuruZamani", "pencereBaslangic", "pencereBitis", "tahminAltGuc", "tahminUstGuc", "evre", "duyuruldu", "katilimcilar", "hedefler", "sonuc"]);
    const id = tamsayi(b.id, `${y}.id`, sonKimlik + 1, tamsayi(nesne(d.sayac, "$.sayac").kimlik, "$.sayac.kimlik") - 1);
    sonKimlik = id;
    if (kimlikler.has(id)) hata(`${y}.id`, "tekrarlanan baskin kimligi");
    kimlikler.add(id);
    mantik(b.duyuruldu, `${y}.duyuruldu`);
    dize(b.il, `${y}.il`); dize(b.ilce, `${y}.ilce`);
    tamsayi(b.boy, `${y}.boy`, 1); tamsayi(b.gb, `${y}.gb`, 1); tamsayi(b.bant, `${y}.bant`, 0);
    const duyuru = tamsayi(b.duyuruZamani, `${y}.duyuruZamani`, 0);
    const bas = tamsayi(b.pencereBaslangic, `${y}.pencereBaslangic`, duyuru);
    const bit = tamsayi(b.pencereBitis, `${y}.pencereBitis`, bas + 1);
    const alt = tamsayi(b.tahminAltGuc, `${y}.tahminAltGuc`, 0);
    tamsayi(b.tahminUstGuc, `${y}.tahminUstGuc`, alt);
    if (!["planli", "duyuru", "pencere", "bitti", "iptal"].includes(dize(b.evre, `${y}.evre`))) hata(`${y}.evre`, "gecersiz baskin evresi");
    if (b.evre === "bitti" && bit > zaman) hata(`${y}.pencereBitis`, "biten baskin gelecekte");
    if ((b.evre === "bitti") !== (b.sonuc !== null)) hata(`${y}.sonuc`, "sonuc yalniz biten baskinda gerekli");
    if (["duyuru", "pencere", "bitti"].includes(b.evre as string) && b.duyuruldu !== true) hata(`${y}.duyuruldu`, "duyuru olmadan acik baskin");
    const kaynaklar = new Set<string>();
    dizi(b.katilimcilar, `${y}.katilimcilar`).forEach((v, j) => {
      const ky = `${y}.katilimcilar[${j}]`;
      const k = pveNesne(v, ky, ["oyuncu", "dugum", "guc", "birlikler"]);
      bag(k.oyuncu, k.dugum, ky);
      const dugum = k.dugum as string;
      if (kaynaklar.has(dugum)) hata(`${ky}.dugum`, "yinelenen katilimci");
      kaynaklar.add(dugum);
      tamsayi(k.guc, `${ky}.guc`, 0); pveCiftler(k.birlikler, `${ky}.birlikler`, "dize");
    });
    const hedefler = new Set<string>();
    dizi(b.hedefler, `${y}.hedefler`).forEach((v, j) => {
      const hy = `${y}.hedefler[${j}]`;
      const h = pveNesne(v, hy, ["oyuncu", "dugum", "payPpm", "tesisler"]);
      bag(h.oyuncu, h.dugum, hy);
      if (hedefler.has(h.dugum as string)) hata(`${hy}.dugum`, "yinelenen hedef");
      hedefler.add(h.dugum as string);
      tamsayi(h.payPpm, `${hy}.payPpm`, 0, PPM); pveCiftler(h.tesisler, `${hy}.tesisler`, "sayi");
    });
    if (b.sonuc === null) return;
    const sy = `${y}.sonuc`;
    const s = pveNesne(b.sonuc, sy, ["kazandi", "baskinGucu", "savunmaGucu", "kamuGucu", "ganimetDegeriMili", "oyuncular"]);
    mantik(s.kazandi, `${sy}.kazandi`);
    for (const alan of ["baskinGucu", "savunmaGucu", "kamuGucu", "ganimetDegeriMili"]) tamsayi(s[alan], `${sy}.${alan}`, 0);
    const sonucDugumler = new Set<string>();
    dizi(s.oyuncular, `${sy}.oyuncular`).forEach((v, j) => {
      const oy = `${sy}.oyuncular[${j}]`;
      const o = pveNesne(v, oy, ["oyuncu", "kayit"], ["revir"]);
      const ky = `${oy}.kayit`;
      const k = pveNesne(o.kayit, ky, ["baskin", "il", "ilce", "dugum", "zaman", "kazandi", "katkiGuc", "birlikKaybi", "malKaybi", "ganimet", "ganimetTasma", "onarim"]);
      bag(o.oyuncu, k.dugum, oy);
      if (sonucDugumler.has(k.dugum as string)) hata(`${ky}.dugum`, "yinelenen sonuc dugumu");
      sonucDugumler.add(k.dugum as string);
      if (k.baskin !== id || k.il !== b.il || k.ilce !== b.ilce || k.kazandi !== s.kazandi) hata(ky, "baskin sonuc baglantisi tutarsiz");
      if (!kaynaklar.has(k.dugum as string) && !hedefler.has(k.dugum as string)) hata(ky, "kilitlenmemis sonuc dugumu");
      const kilitler = [...dizi(b.katilimcilar, `${y}.katilimcilar`), ...dizi(b.hedefler, `${y}.hedefler`)];
      if (!kilitler.some((v) => { const h = nesne(v, y); return h.dugum === k.dugum && h.oyuncu === o.oyuncu; })) hata(ky, "sonuc sahibi kilitle uyumsuz");
      tamsayi(k.zaman, `${ky}.zaman`, bit, zaman); tamsayi(k.katkiGuc, `${ky}.katkiGuc`, 0);
      for (const alan of ["birlikKaybi", "malKaybi", "ganimet", "ganimetTasma"]) pveCiftler(k[alan], `${ky}.${alan}`, "dize");
      pveCiftler(k.onarim, `${ky}.onarim`, "sayi", bit);
      if (o.revir !== undefined) {
        const ry = `${oy}.revir`;
        const r = pveNesne(o.revir, ry, ["baskin", "dugum", "donusZamani", "birlikler", "evre"]);
        if (r.baskin !== id || r.dugum !== k.dugum) hata(ry, "revir sonuc baglantisi tutarsiz");
        tamsayi(r.donusZamani, `${ry}.donusZamani`, bit);
        pveCiftler(r.birlikler, `${ry}.birlikler`, "dize");
        if (!["bekliyor", "dondu", "iptal"].includes(dize(r.evre, `${ry}.evre`))) hata(`${ry}.evre`, "gecersiz revir evresi");
      }
    });
  });
  return kimlikler;
}

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
    // Mülk kipi şebeke (G6; sartname §11.1): isteğe bağlı alanlar, yalnız kullanılınca yazılır.
    if (b.elektrik !== undefined && nesne(b.elektrik, `${y}.elektrik`).sebekeMili !== undefined) tamsayi((b.elektrik as Nesne).sebekeMili, `${y}.elektrik.sebekeMili`, 1);
    if (b.sebekeTuketim !== undefined) {
      const st = nesne(b.sebekeTuketim, `${y}.sebekeTuketim`);
      for (const k of Object.keys(st)) tamsayi(st[k], `${y}.sebekeTuketim.${k}`, 1);
    }
    if (b.tasimaBedeliMiliSaat !== undefined) {
      tamsayi(b.tasimaBedeliMiliSaat, `${y}.tasimaBedeliMiliSaat`, 0);
      if (d.mulk === undefined || b.merkez === undefined || b.sahip === null) hata(`${y}.tasimaBedeliMiliSaat`, "tasima bedeli yalniz sahipli mulk isletmesinde olabilir");
    }
    if (b.yakitTedariki !== undefined) {
      const yy = `${y}.yakitTedariki`;
      if (b.merkez === undefined || d.mulk === undefined) hata(yy, "yakit tedariki yalniz mulk isletmesinde olabilir");
      const yt = nesne(b.yakitTedariki, yy);
      const adlar = ["mal", "tuketimMiliSaat", "stokMiliSaat", "sebekeMiliSaat"];
      alanlar(yt, yy, adlar);
      for (const k of Object.keys(yt)) if (!adlar.includes(k)) hata(`${yy}.${k}`, "bilinmeyen yakit tedariki alani");
      if (dize(yt.mal, `${yy}.mal`) !== "yakit") hata(`${yy}.mal`, "yakit kimligi bekleniyordu");
      const tuketim = tamsayi(yt.tuketimMiliSaat, `${yy}.tuketimMiliSaat`, 0);
      const stok = tamsayi(yt.stokMiliSaat, `${yy}.stokMiliSaat`, 0, tuketim);
      const sebeke = tamsayi(yt.sebekeMiliSaat, `${yy}.sebekeMiliSaat`, 0, tuketim);
      if (stok + sebeke !== tuketim) hata(yy, "stok ve sebeke toplami tuketime esit olmali");
      if (sebeke !== ((b.sebekeTuketim as Nesne | undefined)?.yakit ?? 0)) hata(yy, "sebeke tuketimi ile yakit tahsisi tutarsiz");
    }
    // Mülk kipi yerel pazar (G7-2; sartname §11.1): dükkân isteği karşılanma oranı, yalnız < PPM iken yazılır; yalnız işletme düğümünde.
    if (!MULKSUZ_PAKET && b.yerelKarsilanmaPpm !== undefined) {
      tamsayi(b.yerelKarsilanmaPpm, `${y}.yerelKarsilanmaPpm`, 0, PPM - 1);
      if (b.merkez === undefined) hata(`${y}.yerelKarsilanmaPpm`, "yerel karsilanma yalniz isletme dugumunde olabilir");
    }
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
    if (b.yagmaPenceresi !== undefined) {
      if (b.merkez === undefined || d.mulk === undefined) hata(`${y}.yagmaPenceresi`, "yagma penceresi yalniz mulk isletmesinde olabilir");
      const w = pveNesne(b.yagmaPenceresi, `${y}.yagmaPenceresi`, ["baslangic", "kullanilanPpm"]);
      tamsayi(w.baslangic, `${y}.yagmaPenceresi.baslangic`, 0, zaman);
      tamsayi(w.kullanilanPpm, `${y}.yagmaPenceresi.kullanilanPpm`, 1, PPM);
    }
    if (b.ekYapilar !== undefined) {
      if (b.merkez === undefined) hata(`${y}.ekYapilar`, "ek yapi yalniz isletme dugumunde olabilir");
      dizi(b.ekYapilar, `${y}.ekYapilar`).forEach((e, j) => {
        const ey = `${y}.ekYapilar[${j}]`;
        const ek = nesne(e, ey);
        tamsayi(ek.id, `${ey}.id`, 0);
        dize(ek.tur, `${ey}.tur`);
        dizi(ek.hucreler, `${ey}.hucreler`).forEach((h, k) => dize(h, `${ey}.hucreler[${k}]`));
        // Dükkân (G7-2; sartname §7.1, §11.1): yalnız `tur === "dukkan"` ek yapıda; içerik uyumu (tür, mal, kademe, raf uzunluğu) `dunyaIcerikUyumu`'nda.
        if (!MULKSUZ_PAKET && ek.dukkan !== undefined) {
          if (ek.tur !== "dukkan") hata(`${ey}.dukkan`, "dukkan alani yalniz tur 'dukkan' olan ek yapida olabilir");
          dukkanDogrula(ek.dukkan, `${ey}.dukkan`);
        }
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
    if (s.yontem !== undefined) dize(s.yontem, `$.insaatlar[${i}].yontem`);
    if (!MULKSUZ_PAKET && s.dukkanTuru !== undefined) dize(s.dukkanTuru, `$.insaatlar[${i}].dukkanTuru`); // dükkân inşaatı türü (G7-3; sartname §7.2, §11.1)
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
  const tasimaToplamlari = new Map<number, number>();
  dizi(l.akislar, "$.lojistik.akislar").forEach((v, i) => {
    const y = `$.lojistik.akislar[${i}]`;
    const a = nesne(v, y);
    indeks(a.mal, `${y}.mal`, m);
    indeks(a.kaynak, `${y}.kaynak`, n);
    indeks(a.hedef, `${y}.hedef`, n);
    dizi(a.yol, `${y}.yol`).forEach((k, j) => indeks(k, `${y}.yol[${j}]`, kSayisi));
    if (a.tasimaBedeliMiliSaat !== undefined) {
      const bedel = tamsayi(a.tasimaBedeliMiliSaat, `${y}.tasimaBedeliMiliSaat`, 0);
      const kaynak = bolgeler[a.kaynak as number] as Nesne;
      const hedef = bolgeler[a.hedef as number] as Nesne;
      if (d.mulk === undefined || kaynak.merkez === undefined || hedef.merkez === undefined || kaynak.sahip !== a.sahip || hedef.sahip !== a.sahip) hata(`${y}.tasimaBedeliMiliSaat`, "tasima yalniz kendi mulk dugumleri arasinda olabilir");
      if (kaynak.tasimaBedeliMiliSaat === undefined) hata(`${y}.tasimaBedeliMiliSaat`, "kaynak tasima toplami eksik");
      if ((a.yol as unknown[]).length === 0 && bedel !== 0) hata(`${y}.tasimaBedeliMiliSaat`, "yolsuz havuz ucretsiz olmali");
      tamsayi(a.oranSaat, `${y}.oranSaat`, 0);
      const toplam = (tasimaToplamlari.get(a.kaynak as number) ?? 0) + bedel;
      if (!Number.isSafeInteger(toplam)) hata(`${y}.tasimaBedeliMiliSaat`, "tasima toplami guvenli tamsayi olmali");
      tasimaToplamlari.set(a.kaynak as number, toplam);
    } else if ((bolgeler[a.kaynak as number] as Nesne).tasimaBedeliMiliSaat !== undefined) hata(`${y}.tasimaBedeliMiliSaat`, "tasima toplamli kaynakta akis bedeli eksik");
  });
  bolgeler.forEach((v, i) => {
    const b = v as Nesne;
    if (b.tasimaBedeliMiliSaat !== undefined && b.tasimaBedeliMiliSaat !== (tasimaToplamlari.get(i) ?? 0)) hata(`$.bolgeler[${i}].tasimaBedeliMiliSaat`, "kaynak tasima toplami akislarla tutarsiz");
  });
  dizi(l.kapsam, "$.lojistik.kapsam", n).forEach((satir, i) => dizi(satir, `$.lojistik.kapsam[${i}]`, m));

  // İklim (isteğe bağlı)
  if (d.iklim !== undefined) {
    const ik = nesne(d.iklim, "$.iklim");
    dizi(ik.olaylar, "$.iklim.olaylar");
    tamsayi(ik.sonGun, "$.iklim.sonGun");
  }

  // Mülk (isteğe bağlı)
  if (d.mulk !== undefined) mulkDogrula(d.mulk, bolgeler, n, tamsayi(d.zaman, "$.zaman", 0), tamsayi(nesne(d.sayac, "$.sayac").kimlik, "$.sayac.kimlik", 0));

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
  const baskinKimlikleri = baskinlariDogrula(d, zaman);
  let eskiyaGunlukSayisi = 0;
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
    if (tur === "eskiya_gunluk") {
      pveNesne(veri, `${y}.veri`, ["tur"]);
      if (d.eskiyaTakvim === undefined || ++eskiyaGunlukSayisi > 1) hata(`${y}.veri`, "takvim olmadan ya da birden cok gunluk olay");
      if ((o.t as number) % 86_400_000 !== 0) hata(`${y}.t`, "eskiya gunlugu oyun gun sinirinda olmali");
    } else if (tur.startsWith("eskiya_")) {
      pveNesne(veri, `${y}.veri`, ["tur", "baskin"]);
      if (!baskinKimlikleri.has(tamsayi(veri.baskin, `${y}.veri.baskin`, 1))) hata(`${y}.veri.baskin`, "bilinmeyen baskin");
    }
    if (!Object.prototype.hasOwnProperty.call(OLAY_ONCELIGI, tur)) hata(`${y}.veri.tur`, `bilinmeyen olay turu: ${tur}`);
    if (o.oncelik !== OLAY_ONCELIGI[tur as keyof typeof OLAY_ONCELIGI]) hata(`${y}.oncelik`, `olay turu ${tur} icin oncelik yanlis: ${String(o.oncelik)}`);
    if (tur === "saatlik_tik") tikVar = true;
    if (tur === "tasima_hazine_esik") {
      const oy = `${y}.veri`;
      const izinli = ["tur", "oyuncu", "surum"];
      alanlar(veri, oy, izinli);
      for (const k of Object.keys(veri)) if (!izinli.includes(k)) hata(`${oy}.${k}`, "bilinmeyen tasima esik alani");
      const id = dize(veri.oyuncu, `${oy}.oyuncu`);
      if (!dizi(d.oyuncular, "$.oyuncular").some((o) => (o as Nesne).id === id)) hata(`${oy}.oyuncu`, "bilinmeyen oyuncu");
      if (d.mulk === undefined) hata(oy, "tasima esigi yalniz mulk kipinde olabilir");
      tamsayi(veri.surum, `${oy}.surum`, 0);
    }
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

/** Dükkân durumu biçimi (G7-2; sartname §7.1, §7.1b): tür, ölçek, marka, raf yuvaları (mal, fiyat kademesi, hız sınırı anı, kümülatif satış ve oranı), kampanya sayaçları, kuruluş zamanları. */
function dukkanDogrula(v: unknown, yol: string): void {
  const dk = nesne(v, yol);
  alanlar(dk, yol, ["tur", "olcek", "raf", "baslangic", "kurulus"]);
  dize(dk.tur, `${yol}.tur`);
  tamsayi(dk.olcek, `${yol}.olcek`, 0, 2);
  if (dk.marka !== undefined) tamsayi(dk.marka, `${yol}.marka`, 0);
  const baslangic = tamsayi(dk.baslangic, `${yol}.baslangic`, 0);
  const kurulus = tamsayi(dk.kurulus, `${yol}.kurulus`, 0);
  if (baslangic > kurulus) hata(`${yol}.baslangic`, `baslangic (${baslangic}) kurulustan (${kurulus}) sonra olamaz`);
  dizi(dk.raf, `${yol}.raf`).forEach((r, j) => {
    const ry = `${yol}.raf[${j}]`;
    const y = nesne(r, ry);
    alanlar(y, ry, ["fiyat"]);
    if (y.mal !== undefined) dize(y.mal, `${ry}.mal`);
    tamsayi(y.fiyat, `${ry}.fiyat`, 0);
    if (y.fiyatT !== undefined) tamsayi(y.fiyatT, `${ry}.fiyatT`, 0);
    if (y.satis !== undefined) sayacDogrula(y.satis, `${ry}.satis`); // kümülatif satılan miktar (mili-birim); mal değişince korunur
    if (y.satisOran !== undefined) tamsayi(y.satisOran, `${ry}.satisOran`, 1); // 0 iken alan silinir
  });
  if (dk.kampanya !== undefined) {
    const k = nesne(dk.kampanya, `${yol}.kampanya`);
    alanlar(k, `${yol}.kampanya`, ["hafta", "gunSayisi", "gun", "saat", "bitis"]);
    for (const f of ["hafta", "gunSayisi", "gun", "saat", "bitis"] as const) tamsayi(k[f], `${yol}.kampanya.${f}`, 0);
  }
}

/** Para defteri (docs/06 §15.7): musluk/lavabo sayaçları ve kasalar. */
function paraDogrula(v: unknown): void {
  const p = nesne(v, "$.mulk.para");
  alanlar(p, "$.mulk.para", ["surum", "musluk", "lavabo", "kasalar"]);
  if (p.surum !== 1) hata("$.mulk.para.surum", `desteklenmeyen para defteri surumu: ${JSON.stringify(p.surum)}`);
  const musluk = nesne(p.musluk, "$.mulk.para.musluk");
  for (const k of Object.keys(musluk)) if (!(MUSLUK_KALEMLERI as readonly string[]).includes(k) && !(MUSLUK_ISTEGE_BAGLI as readonly string[]).includes(k)) hata(`$.mulk.para.musluk.${k}`, "bilinmeyen musluk kalemi");
  for (const k of MUSLUK_KALEMLERI) sayacDogrula(musluk[k], `$.mulk.para.musluk.${k}`);
  for (const k of MUSLUK_ISTEGE_BAGLI) if (musluk[k] !== undefined) sayacDogrula(musluk[k], `$.mulk.para.musluk.${k}`); // isteğe bağlı (tembel) kalem: yerelNpc (G7-2)
  const lavabo = nesne(p.lavabo, "$.mulk.para.lavabo");
  for (const k of Object.keys(lavabo)) if (!(LAVABO_KALEMLERI as readonly string[]).includes(k) && !(LAVABO_ISTEGE_BAGLI as readonly string[]).includes(k)) hata(`$.mulk.para.lavabo.${k}`, "bilinmeyen lavabo kalemi");
  for (const k of LAVABO_KALEMLERI) sayacDogrula(lavabo[k], `$.mulk.para.lavabo.${k}`);
  for (const k of LAVABO_ISTEGE_BAGLI) if (lavabo[k] !== undefined) sayacDogrula(lavabo[k], `$.mulk.para.lavabo.${k}`); // isteğe bağlı (tembel) kalem
  kesinArtan(dizi(p.kasalar, "$.mulk.para.kasalar"), "$.mulk.para.kasalar", (k, y) => {
    alanlar(k, y, ["sahip", "giris", "cikisOyuncu", "cikisNpc", "rezervOyuncu", "rezervNpc", "gunler"]);
    const sahip = dize(k.sahip, `${y}.sahip`);
    if (!sahip.startsWith("k:")) hata(`${y}.sahip`, `kasa sahibi 'k:' ile baslamali: ${sahip}`);
    const giris = nesne(k.giris, `${y}.giris`);
    for (const g of Object.keys(giris)) if (!(KASA_GIRIS_KALEMLERI as readonly string[]).includes(g) && !(KASA_GIRIS_ISTEGE_BAGLI as readonly string[]).includes(g)) hata(`${y}.giris.${g}`, "bilinmeyen kasa giris kalemi");
    for (const g of KASA_GIRIS_KALEMLERI) sayacDogrula(giris[g], `${y}.giris.${g}`);
    for (const g of KASA_GIRIS_ISTEGE_BAGLI) if (giris[g] !== undefined) sayacDogrula(giris[g], `${y}.giris.${g}`); // isteğe bağlı (tembel) kalem
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
function mulkDogrula(v: unknown, bolgeler: unknown[], n: number, zaman: number, kimlikSayaci: number): void {
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
    if (o.meclis !== undefined) {
      const my = `${y}.meclis`;
      const r = nesne(o.meclis, my);
      alanlar(r, my, ["ilce", "kayitZamani", "etkinGunler"]);
      for (const k of Object.keys(r)) if (k !== "ilce" && k !== "kayitZamani" && k !== "etkinGunler") hata(`${my}.${k}`, "bilinmeyen meclis alani");
      const ilce = dize(r.ilce, `${my}.ilce`);
      if (!(m.ilceler as Nesne[]).some((c) => c.id === ilce)) hata(`${my}.ilce`, "kayitli olmayan meclis ilcesi");
      const kayit = tamsayi(r.kayitZamani, `${my}.kayitZamani`, 0, zaman);
      const gunler = dizi(r.etkinGunler, `${my}.etkinGunler`);
      if (gunler.length < 1 || gunler.length > 7) hata(`${my}.etkinGunler`, "etkinlik kaydi bir ila yedi gun icermeli");
      let son = -1;
      for (const [i, gv] of gunler.entries()) {
        const g = tamsayi(gv, `${my}.etkinGunler[${i}]`, Math.floor(kayit / GUN), Math.floor(zaman / GUN));
        if (g <= son) hata(`${my}.etkinGunler[${i}]`, "gunler artan ve essiz olmali");
        son = g;
      }
      if (son - (gunler[0] as number) > 6) hata(`${my}.etkinGunler`, "yazilmis gunler yedi gunluk pencereye sigmali");
      // Zaman ilerledikçe günler stale kalabilir: okuma/yükleme yazmadığından bugun-6 alt sınırı uygulanmaz.
    }
    // Perakende (G7-2; sartname §11.1): isteğe bağlı, yalnız kullanılınca yazılır.
    if (!MULKSUZ_PAKET && o.dukkanGeliri !== undefined) sayacDogrula(o.dukkanGeliri, `${y}.dukkanGeliri`);
    if (!MULKSUZ_PAKET && o.ilkSatisT !== undefined) tamsayi(o.ilkSatisT, `${y}.ilkSatisT`, 0);
    if (!MULKSUZ_PAKET && o.markalar !== undefined) {
      dizi(o.markalar, `${y}.markalar`).forEach((mv, j) => {
        const my = `${y}.markalar[${j}]`;
        const mr = nesne(mv, my);
        alanlar(mr, my, ["ad", "simge", "renk"]);
        const ad = dize(mr.ad, `${my}.ad`);
        const kn = adKanonik(ad);
        if (!kn.tamam) hata(`${my}.ad`, `marka adi gecersiz: ${kn.hata}`);
        else if (kn.ad !== ad) hata(`${my}.ad`, `marka adi kanonik (kucuk harf) bicimde saklanmali: ${JSON.stringify(ad)}`);
        tamsayi(mr.simge, `${my}.simge`, 0);
        tamsayi(mr.renk, `${my}.renk`, 0);
      });
    }
    if (o.paraAkisi !== undefined) {
      const pa = nesne(o.paraAkisi, `${y}.paraAkisi`);
      alanlar(pa, `${y}.paraAkisi`, ["t0", "ihracat", "nufus", "ithalat", "isletme", "vergi", "kasa"]);
      tamsayi(pa.t0, `${y}.paraAkisi.t0`, 0);
      for (const k of ["ihracat", "nufus", "ithalat", "isletme", "vergi"] as const) tamsayi(pa[k], `${y}.paraAkisi.${k}`);
      if (pa.sebeke !== undefined) tamsayi(pa.sebeke, `${y}.paraAkisi.sebeke`, 1); // isteğe bağlı (şebeke > 0 iken yazılır)
      if (pa.tasima !== undefined) tamsayi(pa.tasima, `${y}.paraAkisi.tasima`, 1);
      if (!MULKSUZ_PAKET && pa.yerel !== undefined) tamsayi(pa.yerel, `${y}.paraAkisi.yerel`, 1); // isteğe bağlı (yerel satış geliri > 0 iken yazılır; G7-2)
      let oncekiKasa: string | null = null;
      dizi(pa.kasa, `${y}.paraAkisi.kasa`).forEach((e, j) => {
        const ey = `${y}.paraAkisi.kasa[${j}]`;
        const en = nesne(e, ey);
        alanlar(en, ey, ["sahip", "kalem", "oran"]);
        const sahip = dize(en.sahip, `${ey}.sahip`);
        if (!sahip.startsWith("k:")) hata(`${ey}.sahip`, `kasa sahibi 'k:' ile baslamali: ${sahip}`);
        const kalem = dize(en.kalem, `${ey}.kalem`);
        if (!(KASA_GIRIS_KALEMLERI as readonly string[]).includes(kalem) && !(KASA_GIRIS_ISTEGE_BAGLI as readonly string[]).includes(kalem)) hata(`${ey}.kalem`, `gecersiz kasa kalemi: ${kalem}`);
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
  if (m.kamuSiparis !== undefined) kamuSiparisDogrula(m, zaman, kimlikSayaci);
  // Her işletme düğümü kayıtlı olmalı
  let dugum = 0;
  for (const b of bolgeler) if ((b as Nesne).merkez !== undefined) dugum++;
  if (dugum !== dizi(m.isletmeler, "$.mulk.isletmeler").length) hata("$.mulk.isletmeler", `isletme kaydi ${dizi(m.isletmeler, "$.mulk.isletmeler").length}, isletme dugumu ${dugum}`);
}

/** Yeni sipariş alt kaydı strict; fiyat üst sınırı ve rezerv her paket için ayrı korunur. */
function kamuSiparisDogrula(m: Nesne, zaman: number, kimlikSayaci: number): void {
  const y = "$.mulk.kamuSiparis";
  const strict = (v: unknown, yol: string, zorunlu: readonly string[], istege: readonly string[] = []): Nesne => {
    const o = nesne(v, yol);
    alanlar(o, yol, zorunlu);
    const izin = new Set([...zorunlu, ...istege]);
    for (const k of Object.keys(o)) if (!izin.has(k)) hata(`${yol}.${k}`, "bilinmeyen kamu siparis alani");
    return o;
  };
  const p = strict(m.kamuSiparis, y, ["sonDenemeSaati", "ilceler"]);
  tamsayi(p.sonDenemeSaati, `${y}.sonDenemeSaati`, 0, Math.floor(zaman / SAAT));
  if (m.para === undefined) hata(y, "kamu siparisi para defteri gerektirir");
  const para = nesne(m.para, "$.mulk.para");
  const ids = new Set<string>();
  const ilceler = new Set((m.ilceler as Nesne[]).map((c) => c.id));
  kesinArtan(dizi(p.ilceler, `${y}.ilceler`), `${y}.ilceler`, (cv, cy) => {
    const c = strict(cv, cy, ["ilce", "siparis", "toplamTeslimMili", "toplamOdemeMili"]);
    const ilce = dize(c.ilce, `${cy}.ilce`);
    if (!ilceler.has(ilce)) hata(`${cy}.ilce`, "kayitli olmayan ilce");
    const sy = `${cy}.siparis`;
    const a = strict(c.siparis, sy, ["id", "ilce", "mal", "paketMili", "hedefPaket", "kalanPaket", "teslimSirasi", "ilanBirimFiyatMili", "ilanPaketBedeliMili", "fiyatPpm", "acilisZamani", "bitis", "tekrarMs", "durum", "rezervMili", "odenenMili", "serbestMili"], ["kapanisZamani"]);
    const id = dize(a.id, `${sy}.id`);
    if (!/^kamu:[1-9][0-9]*$/.test(id) || !Number.isSafeInteger(Number(id.slice(5))) || Number(id.slice(5)) >= kimlikSayaci || ids.has(id)) hata(`${sy}.id`, "gecersiz veya tekrarlanan siparis kimligi");
    ids.add(id);
    if (a.ilce !== ilce || a.mal !== "gida") hata(sy, "siparis ilcesi/mali uyusmuyor");
    const paket = tamsayi(a.paketMili, `${sy}.paketMili`, 1, 1000000);
    const hedef = tamsayi(a.hedefPaket, `${sy}.hedefPaket`, 1, 100);
    const kalan = tamsayi(a.kalanPaket, `${sy}.kalanPaket`, 0, hedef);
    const teslim = tamsayi(a.teslimSirasi, `${sy}.teslimSirasi`, 0, hedef);
    if (kalan + teslim !== hedef) hata(sy, "paket sayilari korunmuyor");
    const fiyat = tamsayi(a.ilanBirimFiyatMili, `${sy}.ilanBirimFiyatMili`, 1);
    const bedel = tamsayi(a.ilanPaketBedeliMili, `${sy}.ilanPaketBedeliMili`, 1);
    if (BigInt(bedel) !== BigInt(paket) * BigInt(fiyat) / 1000n) hata(`${sy}.ilanPaketBedeliMili`, "paket bedeli birim fiyatla uyusmuyor");
    tamsayi(a.fiyatPpm, `${sy}.fiyatPpm`, 1, PPM);
    const acilis = tamsayi(a.acilisZamani, `${sy}.acilisZamani`, 0, zaman);
    const bitis = tamsayi(a.bitis, `${sy}.bitis`, acilis + SAAT, acilis + 168 * SAAT);
    const tekrar = tamsayi(a.tekrarMs, `${sy}.tekrarMs`, SAAT, 168 * SAAT);
    if (acilis % SAAT !== 0 || (bitis - acilis) % SAAT !== 0 || tekrar % SAAT !== 0) hata(sy, "siparis saat kosullari tam saat olmali");
    const rezerv = tamsayi(a.rezervMili, `${sy}.rezervMili`, 0);
    const odenen = tamsayi(a.odenenMili, `${sy}.odenenMili`, teslim);
    const serbest = tamsayi(a.serbestMili, `${sy}.serbestMili`, 0);
    if (BigInt(rezerv) + BigInt(odenen) + BigInt(serbest) !== BigInt(hedef) * BigInt(bedel) || BigInt(odenen) > BigInt(teslim) * BigInt(bedel)) hata(sy, "siparis rezerv/odeme korunumu bozuk");
    if (a.durum === "acik") {
      if (kalan === 0 || a.kapanisZamani !== undefined || BigInt(rezerv) !== BigInt(kalan) * BigInt(bedel)) hata(sy, "acik siparis paket/rezerv uyumsuz");
    } else {
      if (a.durum !== "tamamlandi" && a.durum !== "suresi_doldu" && a.durum !== "iptal") hata(`${sy}.durum`, "bilinmeyen siparis durumu");
      const kapanis = tamsayi(a.kapanisZamani, `${sy}.kapanisZamani`, acilis, zaman);
      if (rezerv !== 0 || (a.durum === "tamamlandi" && kalan !== 0) || (a.durum === "suresi_doldu" && kapanis < bitis)) hata(sy, "kapali siparis rezerv/vade uyumsuz");
    }
    tamsayi(c.toplamTeslimMili, `${cy}.toplamTeslimMili`, teslim * paket);
    tamsayi(c.toplamOdemeMili, `${cy}.toplamOdemeMili`, odenen);
    const kasa = (para.kasalar as Nesne[]).find((k) => k.sahip === `k:ilce:${ilce}`);
    if (kasa === undefined || (kasa.rezervOyuncu as number) < rezerv) hata(`${sy}.rezervMili`, "siparisin kasa rezervi yok");
    return ilce;
  });
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
      if (!MULKSUZ_PAKET && e.dukkan !== undefined) {
        // Dükkân içerik uyumu (G7-2; sartname §11.2): perakende tanımlı, tür türler içinde, raf malları türün mal kümesinde, kademe aralıkta, raf uzunluğu ölçekle aynı, marka var, kampanya yalnız açıkken.
        const dy = `${y}.ekYapilar[${j}].dukkan`;
        const pk = ic.mulk?.perakende;
        if (pk === undefined) hata(dy, "dukkan var ama perakende (mulk.perakende) tanimli degil");
        const tur = pk.turler.get(e.dukkan.tur);
        if (tur === undefined) hata(`${dy}.tur`, `icerikte olmayan dukkan turu: ${e.dukkan.tur}`);
        const olcek = pk.p.olcekler[e.dukkan.olcek];
        if (e.dukkan.raf.length !== olcek.rafYuvasi) hata(`${dy}.raf`, `raf yuvasi ${e.dukkan.raf.length}, olcekte ${olcek.rafYuvasi}`);
        e.dukkan.raf.forEach((r, k) => {
          if (r.mal !== undefined) {
            const mi = ic.malIndeks[r.mal];
            if (mi === undefined) hata(`${dy}.raf[${k}].mal`, `icerikte olmayan mal: ${r.mal}`);
            if (!tur.malKumesi.has(mi)) hata(`${dy}.raf[${k}].mal`, `mal dukkan turunde yok: ${r.mal}`);
          }
          if (r.fiyat >= pk.p.fiyatKademeleriPpm.length) hata(`${dy}.raf[${k}].fiyat`, `fiyat kademesi ${r.fiyat}, kademe sayisi ${pk.p.fiyatKademeleriPpm.length}`);
        });
        if (e.dukkan.marka !== undefined && b.sahip !== null) {
          const sayi = d.mulk?.oyuncular.find((o) => o.id === b.sahip)?.markalar?.length ?? 0;
          if (e.dukkan.marka >= sayi) hata(`${dy}.marka`, `marka indeksi ${e.dukkan.marka}, oyuncunun ${sayi} markasi var`);
        }
        if (e.dukkan.kampanya !== undefined && !pk.kampanyaAcik) hata(`${dy}.kampanya`, "kampanya parametresi yok (kampanya kapali)");
      }
    }
    // Şebeke stoksuz tüketimi (G6): mal KİMLİĞİ anahtarları içerikte olmalı.
    for (const mid of Object.keys(b.sebekeTuketim ?? {})) if (ic.malIndeks[mid] === undefined) hata(`${y}.sebekeTuketim.${mid}`, `icerikte olmayan mal: ${mid}`);
    if (b.yakitTedariki !== undefined) {
      const m = ic.malIndeks[b.yakitTedariki.mal];
      if (m === undefined || ic.mallar[m]?.depolanabilir === false) hata(`${y}.yakitTedariki.mal`, "icerikte depolanabilir yakit gerekli");
    }
    b.tesisler.forEach((t, j) => {
      indeks(t.tur, `${y}.tesisler[${j}].tur`, ic.tesisTurleri.length);
      indeks(t.yontem, `${y}.tesisler[${j}].yontem`, ic.yontemler.length);
    });
    const urunSayisi = ic.icerik.tarimUrunleri?.length ?? 0;
    if (b.tarim !== undefined && b.tarim.ekimPpm.length !== urunSayisi) hata(`${y}.tarim.ekimPpm`, `tarim urunu sayisi ${b.tarim.ekimPpm.length}, icerikte ${urunSayisi}`);
  });
  if (d.kenarlar.length !== ic.harita.kenarlar.length) hata("$.kenarlar", `kenar sayisi ${d.kenarlar.length}, icerikte ${ic.harita.kenarlar.length}`);
  // İnşaatta seçilen yöntem (G6, sartname §5.8): içerikte tanımlı, tesis türü inşaatında ve türün yöntem listesinde olmalı (ek yapı ve diğer inşaat türlerinde yazılmaz).
  d.insaatlar.forEach((ins, i) => {
    if (ins.yontem === undefined) return;
    const y = `$.insaatlar[${i}].yontem`;
    if (ic.yontemIndeks[ins.yontem] === undefined) hata(y, `icerikte olmayan yontem: ${ins.yontem}`);
    if (ins.tur !== "tesis" || ins.ekYapi !== undefined) hata(y, "yontem yalniz tesis turu insaatinda olabilir");
    const tur = ic.tesisTurleri[ins.hedef];
    if (tur === undefined || !tur.yontemler.includes(ins.yontem)) hata(y, `yontem tesis turunde yok: ${ins.yontem}`);
  });
  // Dükkân inşaatı (G7-3; sartname §7.2, §11.2): `dukkanTuru` yalnız `ekYapi === "dukkan"` hücreli inşaatında olabilir ve perakendede tanımlı türdür; ölçek perakendenin ölçeğidir.
  d.insaatlar.forEach((ins, i) => {
    const y = `$.insaatlar[${i}]`;
    if (!MULKSUZ_PAKET && ins.dukkanTuru !== undefined) {
      if (ins.ekYapi !== "dukkan") hata(`${y}.dukkanTuru`, "dukkanTuru yalniz dukkan yapisi insaatinda olabilir");
      const pk = ic.mulk?.perakende;
      if (pk === undefined) hata(`${y}.dukkanTuru`, "dukkan insaati var ama perakende (mulk.perakende) tanimli degil");
      if (!pk.turler.has(ins.dukkanTuru)) hata(`${y}.dukkanTuru`, `icerikte olmayan dukkan turu: ${ins.dukkanTuru}`);
    }
  });
  d.oyuncular.forEach((o, i) => {
    o.teknolojiler.forEach((t, j) => indeks(t, `$.oyuncular[${i}].teknolojiler[${j}]`, ic.teknolojiler.length));
    if (o.arastirma !== null) indeks(o.arastirma.teknoloji, `$.oyuncular[${i}].arastirma.teknoloji`, ic.teknolojiler.length);
  });
  if (d.mulk !== undefined && ic.mulk !== undefined) {
    const mk = ic.mulk;
    if (d.mulk.ilceler.length !== mk.ilceler.size) hata("$.mulk.ilceler", `ilce sayisi ${d.mulk.ilceler.length}, fiksturde ${mk.ilceler.size}`);
    if (d.mulk.para !== undefined && mk.p.kasa === undefined) hata("$.mulk.para", "para defteri var ama kasa parametresi (mulk.kasa) tanimli degil");
    for (const [i, c] of (d.mulk.kamuSiparis?.ilceler ?? []).entries()) {
      const y = `$.mulk.kamuSiparis.ilceler[${i}]`;
      if (!mk.ilceler.has(c.ilce)) hata(`${y}.ilce`, "icerikte olmayan siparis ilcesi");
      const mal = ic.malIndeks[c.siparis.mal];
      if (mal === undefined || ic.mallar[mal]?.depolanabilir === false) hata(`${y}.siparis.mal`, "siparis mali bilinmeyen veya depolanamaz");
    }
    // Marka sınırları (G7-3; sartname §11.1-11.2): perakende tanımlıyken sayı <= `marka.hesapBasinaEnFazla`, simge < `simgeSayisi`, renk < `renkSayisi`; perakende yokken marka olamaz.
    d.mulk.oyuncular.forEach((o, i) => {
      if (o.meclis !== undefined && !mk.ilceler.has(o.meclis.ilce)) hata(`$.mulk.oyuncular[${i}].meclis.ilce`, "icerikte olmayan meclis ilcesi");
      if (MULKSUZ_PAKET || o.markalar === undefined) return;
      const y = `$.mulk.oyuncular[${i}].markalar`;
      const pk = mk.perakende;
      if (pk === undefined) hata(y, "marka var ama perakende (mulk.perakende) tanimli degil");
      const en = pk.p.marka;
      if (o.markalar.length > en.hesapBasinaEnFazla) hata(y, `marka sayisi ${o.markalar.length}, hesap basina en cok ${en.hesapBasinaEnFazla}`);
      o.markalar.forEach((m, j) => {
        if (m.simge >= en.simgeSayisi) hata(`${y}[${j}].simge`, `simge ${m.simge}, simge sayisi ${en.simgeSayisi}`);
        if (m.renk >= en.renkSayisi) hata(`${y}[${j}].renk`, `renk ${m.renk}, renk sayisi ${en.renkSayisi}`);
      });
    });
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
  for (const [i, b] of (d.baskinlar ?? []).entries()) {
    const y = `$.baskinlar[${i}]`;
    if (ic.mulk?.ilceler.get(b.ilce)?.il !== b.il) hata(`${y}.ilce`, "baskin ilcesi ve il icerikte uyumsuz");
    const dugum = (id: string, oyuncu: string, yol: string): void => {
      const e = d.mulk?.isletmeler.find((e) => d.bolgeler[e.bolgeIndeksi]?.id === id);
      // Geçmiş sahipliği kilitte tutulur; güncel sahiplik sonuç/dönüş sırasında tekrar denetlenir.
      if (e === undefined || e.il !== b.il || !d.oyuncular.some((o) => o.id === oyuncu)) hata(yol, "baskin dugumu/oyuncusu/ili uyumsuz");
    };
    const birlikler = (ciftler: readonly [string, number][], yol: string): void => {
      for (const [id] of ciftler) if (ic.birlikIndeks[id] === undefined) hata(yol, `icerikte olmayan birlik: ${id}`);
    };
    const mallar = (ciftler: readonly [string, number][], yol: string): void => {
      for (const [id] of ciftler) { const m = ic.mallar[ic.malIndeks[id]!]; if (m === undefined || m.depolanabilir === false) hata(yol, `icerikte olmayan/depolanamaz mal: ${id}`); }
    };
    for (const [j, k] of b.katilimcilar.entries()) { dugum(k.dugum, k.oyuncu, `${y}.katilimcilar[${j}]`); birlikler(k.birlikler, `${y}.katilimcilar[${j}].birlikler`); }
    for (const [j, h] of b.hedefler.entries()) dugum(h.dugum, h.oyuncu, `${y}.hedefler[${j}]`);
    for (const [j, s] of (b.sonuc?.oyuncular ?? []).entries()) {
      const sy = `${y}.sonuc.oyuncular[${j}]`;
      dugum(s.kayit.dugum, s.oyuncu, sy);
      birlikler(s.kayit.birlikKaybi, `${sy}.kayit.birlikKaybi`);
      mallar(s.kayit.malKaybi, `${sy}.kayit.malKaybi`); mallar(s.kayit.ganimet, `${sy}.kayit.ganimet`); mallar(s.kayit.ganimetTasma, `${sy}.kayit.ganimetTasma`);
      if (s.revir !== undefined) birlikler(s.revir.birlikler, `${sy}.revir.birlikler`);
    }
  }
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
