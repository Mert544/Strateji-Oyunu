/**
 * Tek Türkçe (tr-TR) sayı, yüzde ve zaman biçimleyicisi (saf; DOM yok). Arayüzdeki tüm sayılar buradan geçer:
 *   - binlik ayırıcı ".", ondalık "," (Intl.NumberFormat('tr-TR'));
 *   - yüzde işareti sayının ÖNÜNDE ve boşluksuz: "%90" (Intl yüzde biçimi tr-TR'de zaten böyledir);
 *   - tümü büyük harf YOK (Türkçe İ/ı tuzağı; görsel kimlik kararı): yalnız cümle başı büyük harf.
 * Biçimleyiciler önbelleklenir (her çağrıda yeni Intl nesnesi kurulmaz).
 */

const YEREL = "tr-TR";
const sayiOnbellek = new Map<number, Intl.NumberFormat>();
const yuzdeOnbellek = new Map<number, Intl.NumberFormat>();

function sayiBicimi(ondalik: number): Intl.NumberFormat {
  let f = sayiOnbellek.get(ondalik);
  if (!f) {
    f = new Intl.NumberFormat(YEREL, { maximumFractionDigits: ondalik });
    sayiOnbellek.set(ondalik, f);
  }
  return f;
}

function yuzdeBicimi(ondalik: number): Intl.NumberFormat {
  let f = yuzdeOnbellek.get(ondalik);
  if (!f) {
    f = new Intl.NumberFormat(YEREL, { style: "percent", maximumFractionDigits: ondalik });
    yuzdeOnbellek.set(ondalik, f);
  }
  return f;
}

export function esc(s: string | number): string {
  return String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
}

/** Sayı (en çok `ondalik` basamak): 12345.6 -> "12.345,6". */
export function sayi(n: number, ondalik = 0): string {
  const x = Number(n);
  // -0 ve yuvarlama sonucu "-0" görünmesin
  const s = sayiBicimi(ondalik).format(x === 0 ? 0 : x);
  return s === "-0" ? "0" : s;
}

/** Tam sayı biçimi (kısa ad). */
export function fmt(n: number): string {
  return sayi(n, 0);
}

/** Bir ondalıklı biçim (kısa ad). */
export function fmt1(n: number): string {
  return sayi(n, 1);
}

/** Yüzde: girdi 0-100 ölçeğinde. yuzde(90) -> "%90", yuzde(12.5, 1) -> "%12,5". */
export function yuzde(p: number, ondalik = 0): string {
  const s = yuzdeBicimi(ondalik).format(Number(p) / 100);
  return s === "-%0" ? "%0" : s;
}

// ---------------------------------------------------------------------------------------------
// Para (T-1, sahip kararı 1 Ekim: tek biçim "1.234 ₺")
// ---------------------------------------------------------------------------------------------

/** Para simgesi. Arayüzdeki TEK kaynak: simge sayının SONUNDA ("1.234 ₺"), asla önünde; yasağı `test/tasarim.test.ts` korur. */
export const PARA_SIMGESI = "₺";
/** Sayı ile simge arası: bölünmez boşluk (U+00A0); satır sonunda "1.234" ile "₺" ayrılmaz. */
export const PARA_ARASI = "\u00a0";
/** Eksi işareti (U+2212); tire değil, sayıyla aynı yükseklikte. */
export const EKSI = "\u2212";

/**
 * Mili-para -> tam lira yuvarlaması (B4, TEK kural; "en yakın" hiçbir yerde yok). Ölçüt: paranın yönü.
 *  - YUKARI: oyuncunun ÖDEDİĞİ fiyat, maliyet, gereken ve ödenen bedel (alış fiyatı, yapı/arsa bedeli, iade edilmeyen tutar).
 *  - AŞAĞI (varsayılan): oyuncunun ELİNE GEÇEN tutar: satış birim fiyatı, hazine, gelir, net akış, ödül, dönüş ve varlık değeri.
 * Aynı kelime ("fiyat") iki yönde olabilir: oyuncu öderse YUKARI, oyuncu alırsa (satış birim fiyatı) AŞAĞI.
 */
export type ParaYuvarlama = "asagi" | "yukari";

/** Tam lira: para(1234) -> "1.234 ₺", para(-5) -> "−5 ₺". Ondalık gösterilmez (oyunda tutarlar tam liradır). */
export function para(tl: number): string {
  const m = fmt(Math.abs(tl));
  return `${tl < 0 && m !== "0" ? EKSI : ""}${m}${PARA_ARASI}${PARA_SIMGESI}`;
}

function tamLira(mili: number, yuvarlama: ParaYuvarlama): number {
  const a = Math.abs(mili) / 1000;
  const t = yuvarlama === "yukari" ? Math.ceil(a) : Math.floor(a);
  return mili < 0 ? -t : t;
}

/** Mili-para (çekirdek birimi; 1 ₺ = 1000 mili): paraMili(1_234_000) -> "1.234 ₺". Yuvarlama kuralı B4: gelir/hazine aşağı (varsayılan), maliyet yukarı. */
export function paraMili(mili: number, yuvarlama: ParaYuvarlama = "asagi"): string {
  return para(tamLira(mili, yuvarlama));
}

/** İşaretli mili-para (net sonuç, akış): "+1.960 ₺", "−180 ₺", sıfır "0 ₺". İşaret sayının önünde, simge yine sonda. */
export function paraIsaretli(mili: number, yuvarlama: ParaYuvarlama = "asagi"): string {
  const t = tamLira(mili, yuvarlama);
  return `${t > 0 ? "+" : ""}${para(t)}`;
}

/** 12 345 -> "12,3 B"; 1 200 000 -> "1,2 Mn". */
export function kisalt(n: number): string {
  const a = Math.abs(n);
  if (a >= 1e6) return fmt1(n / 1e6) + " Mn";
  if (a >= 1e4) return fmt1(n / 1e3) + " B";
  return fmt(n);
}

export function sinirla(x: number, a: number, b: number): number {
  return x < a ? a : x > b ? b : x;
}

// ---------------------------------------------------------------------------------------------
// Zaman
// ---------------------------------------------------------------------------------------------

/**
 * Küre güneşi için sim saat 0'ın UTC saati (başlangıçta Türkiye/Karadeniz gündüz olsun diye 09:00). Yalnız küredeki
 * terminatör içindir; saat METNİ Türkiye saatidir (`simSaatMetni`, dünya epoch'u TRT gece yarısı).
 */
export const BASLANGIC_SAAT_UTC = 9;

/**
 * Dünya epoch'u: 2026-09-30T21:00Z = 1 Ekim 2026 00:00 Türkiye saati (sunucunun varsayılanı; mutlak saatte
 * `t = duvar − epoch`; docs/arastirma/canli-dunya-simulasyonu.md §2.2). Protokol epoch'u taşımaz; değişirse burası da değişir.
 */
export const DUNYA_EPOCH_MS = 1_790_802_000_000;
/** Türkiye kalıcı UTC+3 (yaz saati yok): gün sınırı `(t + 3 sa) mod 24 sa`. */
export const TURKIYE_OFSETI_MS = 3 * 3_600_000;

/** Sade saat: "SS:DD" (Türkiye saati; sim saat 0 = 1 Ekim 00:00 TRT). Gün sayısı yazılmaz: tarih zaten gerçek takvimdendir (`simGunNo` ipucu içindir). */
export function simSaatMetni(simSaat: number): string {
  const dk = Math.floor(Math.max(0, simSaat) * 60 + 1e-6);
  const saat = Math.floor((dk % 1440) / 60);
  return `${String(saat).padStart(2, "0")}:${String(dk % 60).padStart(2, "0")}`;
}

/** Oyunun kaçıncı günü (1 Ekim = 1). Yalnız ipucunda (title) kullanılır; arayüz metninde "Gün N" gösterilmez. */
export function simGunNo(simSaat: number): number {
  return Math.floor(Math.floor(Math.max(0, simSaat) * 60 + 1e-6) / 1440) + 1;
}

export const AY_ADLARI = ["Ocak", "Şubat", "Mart", "Nisan", "Mayıs", "Haziran", "Temmuz", "Ağustos", "Eylül", "Ekim", "Kasım", "Aralık"] as const;
const GUNLER = ["Pazar", "Pazartesi", "Salı", "Çarşamba", "Perşembe", "Cuma", "Cumartesi"] as const;

export interface GercekTarih {
  yil: number;
  /** 0 = Ocak */
  ay: number;
  gun: number;
  ayAdi: string;
  gunAdi: string;
}

/**
 * Sim saatinden gerçek tarih (Europe/Istanbul = sabit UTC+3): epoch + t. Artık yıllar `Date` ile doğru. `epochMs`: sunucunun
 * bildirdiği dünya epoch'u (`hosgeldin.dunyaEpochMs`); yoksa varsayılan.
 */
export function gercekTarih(simSaat: number, epochMs = DUNYA_EPOCH_MS): GercekTarih {
  const d = new Date(epochMs + TURKIYE_OFSETI_MS + Math.floor(Math.max(0, simSaat) * 3_600_000));
  const ay = d.getUTCMonth();
  return { yil: d.getUTCFullYear(), ay, gun: d.getUTCDate(), ayAdi: AY_ADLARI[ay] ?? "", gunAdi: GUNLER[d.getUTCDay()] ?? "" };
}

/** "2 Ekim" */
export const tarihMetni = (g: GercekTarih): string => `${g.gun} ${g.ayAdi}`;
/** Tarih ve saat tek ifadede (tarihsiz listeler: gelen kutusu, rehber): "1 Ekim · 01:01". `epochMs`: sunucunun dünya epoch'u. */
export const tarihSaatMetni = (simSaat: number, epochMs = DUNYA_EPOCH_MS): string => `${tarihMetni(gercekTarih(simSaat, epochMs))} · ${simSaatMetni(simSaat)}`;
/** "2 Ekim 2026 Cuma" */
export const tamTarihMetni = (g: GercekTarih): string => `${g.gun} ${g.ayAdi} ${g.yil} ${g.gunAdi}`;

/** Süre (saat girdili): "40 dk" / "5 sa" / "1,5 sa" / "1 gün" / "2 gün 3 sa"; negatif -> "0 sa". */
export function sureMetni(saat: number): string {
  if (!(saat > 0)) return "0 sa";
  if (saat < 1) return `${Math.max(1, Math.round(saat * 60))} dk`;
  if (saat < 24) return `${fmt1(saat)} sa`;
  let g = Math.floor(saat / 24);
  let k = Math.round(saat - g * 24);
  if (k === 24) {
    g++;
    k = 0;
  }
  return k === 0 ? `${g} gün` : `${g} gün ${k} sa`;
}

/** Kalan süre (ms), DAKİKAYA YUKARI yuvarlı: 61 sn -> "2 dk", 59 dk 10 sn -> "60 dk" yerine "1 sa", 1,5 saat -> "1,5 sa"; ≤ 0 -> "1 dk" (bitmek üzere). */
export function kalanSureMetni(ms: number): string {
  const dk = Math.max(1, Math.ceil(ms / 60_000));
  return dk < 60 ? `${dk} dk` : sureMetni(dk / 60);
}

/** "Geçen: N gün SS sa". */
export function gecenMetni(saat: number): string {
  return `${Math.floor(saat / 24)} gün ${saat % 24} sa`;
}
