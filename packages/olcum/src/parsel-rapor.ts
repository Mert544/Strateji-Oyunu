/**
 * Parsel kısa koşusu raporu (Markdown + JSON özeti). Saf biçimlendirme: tohum sonuçlarından özet çıkarır ve Türkçe metin üretir.
 * Sayılar ppm ya da mili-₺'dir; yüzde/₺ gösterimi yalnız burada yapılır.
 */
import { PARSEL_H6_UCUZ_HUCRE_ESIK_PPM, Y_OLCUTLERI, kosullardanVerdict, y7UretimGeliri } from "./parsel";
import type { AcilisKosuluSonucu, H6AcilisSonucu, Olculemez } from "./parsel";
import { genelVerdict } from "./tipler";
import type { Verdict } from "./tipler";
import type { ParselTohumSonucu } from "./parsel-kosu";

export interface ParselRaporMeta {
  etiket: string | undefined;
  tohumlar: readonly number[];
  gun: number;
  gecGun: number;
  olcumGunu: number;
  iklim: string;
  agir: boolean;
  /** Duvar saati (ms): rapor METNİNE yazılmaz (yeniden üretim bayt bayt aynı olsun); yalnız JSON ve konsol. */
  sureMs: number;
  /** Elle yazılmış bulgular dosyasının adı (yeniden üretimde korunur; rapor yalnız bağlantı verir). */
  bulgular: string;
  /** Koşuda kullanılan yerleşik bot sayıları ve geç katılan açılışları (rapor bağlamı). */
  duzen: { yerlesik: Record<string, number>; gec: readonly string[] };
  /** Ölçüm haritası (vars. mini-6). */
  harita?: string;
  /** Tarım yönetimi açık mıydı (ekim planı + gübre dozu). */
  tarimYonetimi?: boolean;
  /** Yerleşik botlar da `ilceSec` kullandı mı (geç katılanlar her zaman). */
  yerlesikIlceSec?: boolean;
  /** Bakım yönetimi açık mıydı (parça ithalatı + genel onarım). */
  bakimYonetimi?: boolean;
  /** Yalnız onarım yönetimi açık mıydı (parça ithalatı yok). */
  onarimYonetimi?: boolean;
  /** Parametre ayarı (veri kopyası; parametreler.json değişmedi). */
  paramAyar?: Readonly<Record<string, number>>;
  /** Yaşlı spekülatörün alıma başladığı yaş (gün). */
  spekulatorGun?: number;
  /** Ayrıştırma ayarları: ilceSec ayrılmış önceliği (vars. true = AÇIK) ve P3b çok hesap kuralları kapalı mı (vars. false = AÇIK). */
  ayrilmisOnceligi?: boolean;
  p3bKapali?: boolean;
  /** P3d yurt kuralı (yurt önce ayrılmış dışından) kapalı mı (vars. false = kural parametredeki gibi AÇIK). */
  yurtKapali?: boolean;
  /** Bot tohumu (varyans); tanımsız = bugünkü sıra. */
  botTohum?: number;
  /** Önceki koşuyla karşılaştırma (aynı geç katılan açılışları; Y7 ve servet oranları yan yana). */
  karsilastirma?: ParselKarsilastirma;
}

/** Karşılaştırılacak önceki koşunun tohum sonuçları (JSON `tohumBasina`; yalnız H6 alanları okunur). */
export interface ParselKarsilastirma {
  /** Dosya adı (yol değil: rapor deterministik kalsın). */
  kaynak: string;
  etiket: string | undefined;
  sonuclar: readonly ParselTohumSonucu[];
}

/** Geç katılan başına (açılış) ortalama gelir/emsal-medyan ve servet/emsal-medyan oranı (ppm) ve Y7 payı. */
export interface OlguKarsilastirma {
  gelirOranPpm: number | null;
  servetOranPpm: number | null;
  n: number;
}

function ppmOran(pay: number, payda: number | null): number | null {
  if (payda === null || payda <= 0 || pay < 0) return null;
  return Number((BigInt(pay) * 1_000_000n) / BigInt(payda));
}

export function olguKarsilastirmasi(sonuclar: readonly ParselTohumSonucu[]): Record<string, OlguKarsilastirma> {
  const g = new Map<string, { gelir: number[]; servet: number[]; n: number }>();
  for (const s of sonuclar) {
    for (const o of s.h6.olgular) {
      const k = o.acilis ?? o.gec;
      const e = g.get(k) ?? { gelir: [], servet: [], n: 0 };
      e.n++;
      const a = ppmOran(o.gelir, o.emsalDuzeyi === "il" ? o.ilEmsalGelirMedyan : o.emsalGelirMedyan);
      const b = ppmOran(o.servetHam, o.emsalMedyanHam);
      if (a !== null) e.gelir.push(a);
      if (b !== null) e.servet.push(b);
      g.set(k, e);
    }
  }
  const sonuc: Record<string, OlguKarsilastirma> = {};
  for (const k of [...g.keys()].sort()) {
    const e = g.get(k) as { gelir: number[]; servet: number[]; n: number };
    sonuc[k] = { gelirOranPpm: ortalama(e.gelir), servetOranPpm: ortalama(e.servet), n: e.n };
  }
  return sonuc;
}

export function yuzde(ppm: number | null | undefined): string {
  if (ppm === null || ppm === undefined) return "—";
  const v = Math.round(ppm / 1000) / 10; // %0,1 hassasiyet
  return `%${String(v).replace(".", ",")}`;
}

/** mili-₺ -> "1.234.567 ₺" (kuruş yok). */
export function tl(mili: number | null | undefined): string {
  if (mili === null || mili === undefined) return "—";
  const t = Math.round(mili / 1000);
  const isaret = t < 0 ? "-" : "";
  return `${isaret}${String(Math.abs(t)).replace(/\B(?=(\d{3})+(?!\d))/g, ".")} ₺`;
}

export function verdictAd(v: Verdict): string {
  return v === "gecti" ? "GEÇTİ" : v === "kaldi" ? "KALDI" : "BELİRSİZ";
}

function ortalama(xs: readonly number[]): number | null {
  return xs.length === 0 ? null : Math.floor(xs.reduce((t, x) => t + x, 0) / xs.length);
}

function degerliOlanlar<T>(xs: readonly (T | null | undefined)[]): T[] {
  return xs.filter((x): x is T => x !== null && x !== undefined);
}

export interface ParselOzeti {
  h6: {
    /** HİPOTEZ KARARI (birincil): hibeden bağımsız üretim geliri (Y7) + açılış koşulu. */
    verdict: Verdict;
    y7PayiPpm: number | null;
    y7Verdict: Verdict;
    /** İKİNCİL (bilgi): servet tabanlı medyana ulaşma, ham (arındırılmış servetle aynı karar). */
    servetVerdict: Verdict;
    servetBasariPpm: number | null;
    /** ESKİ TANIM (bilgi): ucuz hücre payı (≤ 2× taban) ve eski oyuncuya açık kısmı. */
    ucuzPayPpm: number | null;
    genelUcuzPayPpm: number | null;
    /** İkinci koşul (açılış koşulu): karar, (i) tutan / yurt dahil (i) tutan / (ii) tutan olgu payı ve Y7'de il yedeğiyle ölçülen olgu payı (ppm; tüm tohumların olguları). */
    acilisVerdict: Verdict;
    tabanYeterPpm: number | null;
    tabanYeterYurtDahilPpm: number | null;
    yapiKurulduPpm: number | null;
    y7IlYedegiPpm: number | null;
    /** Paketin (hibe + kit) geç katılan ham servetindeki ortalama payı, ppm. */
    hibePayiPpm: number | null;
  };
  h8: { verdict: Verdict; giniPpm: number | null; enBuyukIlcePayiPpm: number | null };
  y: {
    y1Ppm: number | null;
    y2Dk60Ppm: number | null;
    y2Dk10Ppm: number | null;
    y5EnBuyukPayPpm: number | null;
    y5HibritPpm: number | null;
    y6Ppm: number | null;
  };
}

function sayisal<T extends { olculebilir: true }>(x: T | Olculemez, al: (x: T) => number): number | null {
  return x.olculebilir ? al(x) : null;
}

/** Olguların `f` null olmayan kısmında true payı (ppm); hiç ölçülebilir olgu yoksa null. */
function olguPayi(sonuclar: readonly ParselTohumSonucu[], f: (o: ParselTohumSonucu["h6"]["olgular"][number]) => boolean | null): number | null {
  const olgular = sonuclar.flatMap((s) => s.h6.olgular).map(f).filter((x): x is boolean => x !== null);
  return olgular.length === 0 ? null : Number((BigInt(olgular.filter((x) => x).length) * 1_000_000n) / BigInt(olgular.length));
}

export function parselOzetle(sonuclar: readonly ParselTohumSonucu[]): ParselOzeti {
  const y7Verdict = (s: ParselTohumSonucu): Verdict => (s.h6.y7.olculebilir ? (s.h6.y7.hedefGecti ? "gecti" : "kaldi") : "belirsiz");
  return {
    h6: {
      verdict: genelVerdict(sonuclar.map((s) => s.h6.karar.birincil.verdict)),
      servetVerdict: genelVerdict(sonuclar.map((s) => s.h6.karar.ikincil.ham.verdict)),
      servetBasariPpm: ortalama(degerliOlanlar(sonuclar.map((s) => s.h6.karar.ikincil.ham.gecKatilan.basariPpm))),
      y7PayiPpm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.h6.y7, (x: { oyuncuPayiPpm: number }) => x.oyuncuPayiPpm)))),
      y7Verdict: genelVerdict(sonuclar.map(y7Verdict)),
      ucuzPayPpm: ortalama(sonuclar.map((s) => s.h6.ucuz.payPpm)),
      genelUcuzPayPpm: ortalama(sonuclar.map((s) => s.h6.ucuz.genelPayPpm)),
      // Eski (açılış koşulu öncesi) JSON'larda alanlar yoktur: karşılaştırma için belirsiz / null döner.
      acilisVerdict: genelVerdict(sonuclar.map((s) => { const a = s.h6.karar.birincil.acilis as H6AcilisSonucu | Olculemez | undefined; return a?.olculebilir === true ? (a.hedefGecti ? "gecti" : "kaldi") : "belirsiz"; })),
      tabanYeterPpm: olguPayi(sonuclar, (o) => (o.acilisKosulu as AcilisKosuluSonucu | undefined)?.tabanYeter ?? null),
      tabanYeterYurtDahilPpm: olguPayi(sonuclar, (o) => (o.acilisKosulu as AcilisKosuluSonucu | undefined)?.tabanYeterYurtDahil ?? null),
      yapiKurulduPpm: olguPayi(sonuclar, (o) => (o.acilisKosulu as AcilisKosuluSonucu | undefined)?.yapiKuruldu ?? null),
      y7IlYedegiPpm: olguPayi(sonuclar, (o) => (o.emsalDuzeyi === null ? null : o.emsalDuzeyi === "il")),
      hibePayiPpm: ortalama(degerliOlanlar(sonuclar.flatMap((s) => s.h6.karar.ikincil.oranlar.map((o) => o.hibePayiPpm)))),
    },
    h8: {
      verdict: genelVerdict(sonuclar.map((s) => s.h8.verdict)),
      giniPpm: ortalama(sonuclar.map((s) => s.h8.gini.degerGiniPpm)),
      enBuyukIlcePayiPpm: ortalama(sonuclar.map((s) => s.h8.ilce.enBuyukPayPpm)),
    },
    y: {
      y1Ppm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.y.y1.sonuc, (x: { oranPpm: number }) => x.oranPpm)))),
      y2Dk60Ppm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.y.y2.dk60, (x: { oranPpm: number }) => x.oranPpm)))),
      y2Dk10Ppm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.y.y2.dk10, (x: { oranPpm: number }) => x.oranPpm)))),
      y5EnBuyukPayPpm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.y.y5, (x: { enBuyukPayPpm: number }) => x.enBuyukPayPpm)))),
      y5HibritPpm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.y.y5, (x: { hibritPayPpm: number }) => x.hibritPayPpm)))),
      y6Ppm: ortalama(degerliOlanlar(sonuclar.map((s) => sayisal(s.y.y6, (x: { oranPpm: number }) => x.oranPpm)))),
    },
  };
}

function tablo(baslik: readonly string[], satirlar: readonly (readonly string[])[]): string {
  const s = [`| ${baslik.join(" | ")} |`, `|${baslik.map(() => "---").join("|")}|`];
  for (const r of satirlar) s.push(`| ${r.join(" | ")} |`);
  return s.join("\n");
}

const ACILIS_AD: Record<string, string> = { ciftci: "çiftçi", sanayici: "sanayici", pazar: "pazar (tüccar)" };

export function parselRaporUret(sonuclar: readonly ParselTohumSonucu[], meta: ParselRaporMeta): string {
  const oz = parselOzetle(sonuclar);
  const k: string[] = [];
  const baslik = meta.etiket ?? "kosu";
  k.push(`# Parsel dünyası ölçümü — ${baslik}`);
  k.push("");
  k.push(
    "> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. " +
      "Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; " +
      "karar değil, yön gösterir.",
  );
  k.push("");
  k.push("| Alan | Değer |");
  k.push("|---|---|");
  k.push(`| Sürüm/etiket | ${meta.etiket ?? "—"} |`);
  k.push(`| Kip | parsel (mülk kipi; \`parametreler.mulk\` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |`);
  k.push(`| Tohumlar | ${meta.tohumlar.join(", ")} |`);
  k.push(`| Süre | ${meta.gun} sim günü (geç katılım ${meta.gecGun}. gün, ölçüm katılımdan ${meta.olcumGunu} gün sonra) |`);
  k.push(`| Düzen | ${Object.entries(meta.duzen.yerlesik).filter(([, n]) => n > 0).map(([a, n]) => `${n} ${a}`).join(", ")} yerleşik + geç katılan: ${meta.duzen.gec.map((a) => ACILIS_AD[a] ?? a).join(", ") || "yok"} |`);
  k.push(`| İklim | ${meta.iklim} (başlangıç ayı tohumla döner) |`);
  k.push(`| Harita | ${meta.harita ?? "mini-6"} |`);
  k.push(`| Tarım yönetimi | ${meta.tarimYonetimi === true ? "AÇIK (ekim planı + gübre dozu; pasif ve spekülatör hariç)" : "kapalı"} |`);
  k.push(`| Bakım yönetimi | ${meta.bakimYonetimi === true ? "AÇIK (parça ithalatı + aşınma eşiğinde genel onarım; pasif ve spekülatör hariç)" : "kapalı"} |`);
  if (meta.onarimYonetimi === true) k.push(`| Onarım yönetimi | AÇIK (yalnız aşınma eşiğinde genel onarım; süregiden bakım parçası ithalatı YOK; onarımın malzeme açığı ithal edilir) |`);
  if (meta.paramAyar !== undefined && Object.keys(meta.paramAyar).length > 0) k.push(`| PARAMETRE AYARI | ${Object.entries(meta.paramAyar).map(([y, d]) => `\`${y}\`=${d}`).join(", ")} (koşucu seçeneği: veri kopyası; parametreler.json değişmedi) |`);
  if (meta.botTohum !== undefined) k.push(`| BOT TOHUMU (varyans) | ${meta.botTohum} (bot katılım/karar sırası karışık, tam eşit seçimler tohumlu; koşu tohumuyla birleşir) |`);
  if (meta.ayrilmisOnceligi === false) k.push("| AYRIŞTIRMA: ilceSec ayrılmış önceliği | **KAPALI** (ayak izine yeten ilçe öne alınmaz; eski sıra: il tercihi, emsal, doluluk, kimlik) |");
  if (meta.yurtKapali === true) k.push("| AYRIŞTIRMA: P3d yurt kuralı (yurt önce ayrılmış dışından) | **KAPALI** (koşucu seçeneği: yurt ayrılmış hücreleri de kullanabilir; parametreler.json değişmedi) |");
  if (meta.p3bKapali === true) k.push("| AYRIŞTIRMA: P3b çok hesap kuralları | **KAPALI** (koşucu seçeneği: ayrılmış hücre her ilçede satılır, günlük ilçe tavanı yok; hesap başına 12 ve ilk 14 gün kuralı sürer; parametreler.json değişmedi) |");
  if (meta.yerlesikIlceSec === true) k.push("| İlçe seçimi | yerleşikler dahil `ilceSec` (yurt verebilen + açılışa uygun); geç katılanlar her zaman `ilceSec` |");
  if ((meta.duzen.yerlesik["spekulatorYasli"] ?? 0) > 0) k.push(`| Yaşlı spekülatör | ${meta.spekulatorGun ?? 15}. günden itibaren arsa alır (ayrılmış hücre süresi sonrası) |`);
  k.push(`| Ağır koşu | ${meta.agir ? "EVET (H6 tanımındaki gerçek 60. gün katılımı)" : "hayır (varsayılan; H6'nın 60. gün katılımı için `--agir`)"} |`);
  k.push("");

  k.push(`**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [${meta.bulgular}](${meta.bulgular})`);
  k.push("");

  // 1. Özet
  k.push("## 1. Özet");
  k.push("");
  k.push(
    tablo(
      ["Ölçüt", "Sonuç", "Eşik (vazgeçme)", "Not"],
      [
        ["**H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı", `${verdictAd(oz.h6.verdict)} · Y7 ${yuzde(oz.h6.y7PayiPpm)} oyuncu`, "Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor", "hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez"],
        ["H6 ikinci koşul: açılış koşulu (docs/12 §13)", `${verdictAd(oz.h6.acilisVerdict)} · (i) taban hücre ayak izine yeter ${yuzde(oz.h6.tabanYeterPpm)} (yurt dahil: ${yuzde(oz.h6.tabanYeterYurtDahilPpm)}) · (ii, bilgi) 14 günde açılış yapısı ${yuzde(oz.h6.yapiKurulduPpm)} — insan testi gerekli`, "TÜM olgular (i)'yi sağlamalı; (ii) karara girmez", "ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir"],
        ["H6 Y7 emsal düzeyi", `il yedeğiyle ölçülen olgu ${yuzde(oz.h6.y7IlYedegiPpm)}`, "(bilgi)", "önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler"],
        ["H6 ikincil: servet medyana ulaşma (bilgi)", `${verdictAd(oz.h6.servetVerdict)} · ulaşan ${yuzde(oz.h6.servetBasariPpm)}`, "(karara girmez; eski tanım: ulaşan < %50)", "hibe + kit ham servetin ~" + yuzde(oz.h6.hibePayiPpm) + "'i; hibe/kit arındırması ulaşma kararını değiştirmez"],
        ["H6 eski tanım (ucuz hücre payı ≥ %20)", `${yuzde(oz.h6.ucuzPayPpm)} (eski oyuncuya açık: ${yuzde(oz.h6.genelUcuzPayPpm)})`, "(karara girmez; eski eşik: < %20)", "yalnız bilgi; ayrılmış hücre uygun hücrelerin ~%19'u olduğundan eşik yapısal olarak tutmuyordu"],
        ["**H8** (Gini · en büyük ilçe payı · yeniden satış)", `${verdictAd(oz.h8.verdict)} · Gini ${yuzde(oz.h8.giniPpm)} · ilçe payı ${yuzde(oz.h8.enBuyukIlcePayiPpm)}`, "Gini > %60 ya da pay > %25 ya da > 10 hf", "yeniden satış yok: koşul 3 ölçülemez"],
      ],
    ),
  );
  k.push("");

  // 2. H6
  k.push("## 2. H6 — geç katılan işe yarar");
  k.push("");
  k.push("Paket çekirdeğin gerçek davranışına göre okunur (docs/06 §15.1; botlar `yapi_yerlestir` kullanır):");
  k.push("");
  k.push("- **Hibe (₺50.000) ve başlangıç kiti** hazineye/stoğa anında girer → ham servete girer (hibe + kit = " + tl(sonuclar[0]?.hibeKitDegeri) + ").");
  k.push("- **Yurt (6 hücre) değeri 0**: hücrenin `degerMili`'si 0, arazi bedeline girmez → ham servet yurdu SAYMAZ (yurt serveti olduğundan düşük gösterir; geç katılan ve yerleşik için aynı).");
  k.push("- **İndirimli yapı**: ilk 5 yapıda yapı değeri = ÖDENEN tutar (para + malzeme %70'i), tam bedel değil (koşucu, inşaatın `odenenPara`/`odenenMal` kaydından okur).");
  k.push("- **Ayrılmış hücre**: ilçenin %20'si yalnız katılımın ilk 14 gününde olan oyuncuya satılır. Geç katılan 14. günde ayrılmış hücrelere hâlâ erişir; yerleşikler gün 14'ten sonra erişemez.");
  k.push("");
  k.push("**Karar kaynağı (lider kararı).** H6'nın BİRİNCİL ölçüsü hibeden bağımsız üretim gelirinin akışıdır (**Y7**: katılımdan 14 gün sonraki son 7 günün net üretim geliri = hazine akışı − sermaye harcaması; hibe/kit akışa girmediği için tanım gereği bağımsız; emsal önce ilçenin üreten yerleşikleri, ilçede üreten yoksa aynı ilin üreten yerleşikleridir). Hipotez kararı Y7 + açılış koşulundan gelir (açılış koşulu: katılımda katılınan ilçede taban fiyatlı hücre açılışın ayak izine yeter; KARARA YALNIZ (i) girer; (ii) katılımdan sonra 14 günde açılış yapısı kuruldu bilgidir ve insan testi gerektirir; ayak izi yurt hariçtir, çünkü yurt ayrı ve ücretsizdir; eski ucuz hücre payı ölçütü bilgi olarak ayrı satırdadır). **Servet** tabanlı ulaşma İKİNCİL olarak raporlanır: ham servet ile hibe/kit'ten arındırılmış servet AYNI kararı verir (ortak ofset altında `servet ≥ medyan` değişmez; yalnız servet/medyan oranı değişir).");
  k.push("");
  for (const s of sonuclar) {
    k.push(`### Tohum ${s.tohum}`);
    k.push("");
    k.push("**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**");
    k.push("");
    k.push(
      tablo(
        ["Geç katılan", "İlçe", "İl", "İlçe emsali (üreten / toplam)", "İl emsali (üreten / toplam)", "Emsal düzeyi", "Üretim geliri (7 gün)", "Kullanılan emsal geliri medyan", "Üreten emsal medyanının ≥ %50'si"],
        s.h6.olgular.map((o) => {
          const y = y7UretimGeliri([{ gelir: o.gelir, ilceGelirleri: o.emsalGelir, ilGelirleri: o.ilEmsalGelir }]);
          const ok = !y.olculebilir ? "ölçülemez" : y.ulasan === 1 ? "evet" : "hayır";
          const duzey = o.emsalDuzeyi === "ilce" ? "ilçe" : o.emsalDuzeyi === "il" ? "il (yedek)" : "—";
          const medyan = o.emsalDuzeyi === "il" ? o.ilEmsalGelirMedyan : o.emsalDuzeyi === "ilce" ? o.emsalGelirMedyan : null;
          return [o.gec, o.ilce ?? "—", o.il ?? "—", `${o.emsalUretenSayisi} / ${o.emsal.length}`, `${o.ilEmsalUretenSayisi} / ${o.ilEmsal.length}`, duzey, tl(o.gelir), tl(medyan), ok];
        }),
      ),
    );
    k.push("");
    k.push("**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**");
    k.push("");
    k.push(
      tablo(
        ["Geç katılan", "İlçe", "Ayrılmış boş (katılım anı)", "Ayak izi (yurt hariç)", "(i) boş ≥ ayak izi", "Bilgi: yurt dahil (boş + " + String(s.h6.olgular[0]?.yurtHucre ?? "—") + " yurt)", "İlk açılış yapısı (katılımdan sonra)", "(ii) 14 günde yapı (bilgi; insan testi gerekli)", "Olgu (= (i))", "İlçe seçimi (ilceSec)"],
        s.h6.olgular.map((o) => {
          const a = o.acilisKosulu;
          const evetHayir = (u: boolean | null): string => (u === null ? "ölçülemez" : u ? "evet" : "hayır");
          const gec = a.ilkYapiGecikmeMs === null ? "—" : `${(a.ilkYapiGecikmeMs / 86_400_000).toFixed(2)} gün`;
          return [o.gec, o.ilce ?? "—", String(o.ayrilmisBosKatilim), String(o.ayakIzi), evetHayir(a.tabanYeter), evetHayir(a.tabanYeterYurtDahil), gec, evetHayir(a.yapiKuruldu), a.gecti ? "geçti" : "kaldı", o.ilceNedeni ?? "—"];
        }),
      ),
    );
    k.push("");
    k.push("**İkincil — servet (bilgi; karara girmez):**");
    k.push("");
    k.push(
      tablo(
        ["Geç katılan", "Servet (ham)", "Emsal medyan (ham)", "Servet/medyan (ham)", "Servet/medyan (arınd.)", "Hibe+kit payı", "Medyana ulaştı"],
        s.h6.olgular.map((o) => {
          const evetHayir = (u: boolean | null): string => (u === null ? "—" : u ? "evet" : "hayır");
          return [o.gec, tl(o.servetHam), tl(o.emsalMedyanHam), yuzde(o.oran.hamPpm), yuzde(o.oran.arindirilmisPpm), yuzde(o.oran.hibePayiPpm), evetHayir(o.ulastiHam)];
        }),
      ),
    );
    k.push("");
    const u = s.h6.ucuz;
    const ay = s.h6.ilceler.reduce((t, c) => t + c.ayrilmisBos, 0);
    k.push(
      `**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** ${yuzde(u.payPpm)} (${u.ucuzHucre}/${u.uygunHucre}); bunun ${u.ayrilmisUcuz} hücresi ayrılmış (yalnız yeni oyuncu), ${u.genelUcuz} hücresi genel (${yuzde(u.genelPayPpm)}). Satılmamış ayrılmış hücre: ${ay}. ` +
        `**H6 kararı (Y7 + açılış koşulu): ${verdictAd(s.h6.karar.birincil.verdict)}** · Y7 ${s.h6.y7.olculebilir ? `${yuzde(s.h6.y7.oyuncuPayiPpm)} (${s.h6.y7.ulasan}/${s.h6.y7.olculebilirOyuncu}; emsal düzeyi: ${s.h6.y7.ilceDuzeyi} ilçe, ${s.h6.y7.ilDuzeyi} il yedeği)` : "ölçülemez: " + s.h6.y7.neden} · açılış koşulu ${s.h6.karar.birincil.acilis.olculebilir ? `${s.h6.karar.birincil.acilis.gecen}/${s.h6.karar.birincil.acilis.olguSayisi} olgu (i)'yi sağladı; (ii) bilgi: ${s.h6.karar.birincil.acilis.yapiKurulduSayisi}/${s.h6.karar.birincil.acilis.yapiOlculenOlgu} olguda 14 günde açılış yapısı (insan testi gerekli)` : "ölçülemez: " + s.h6.karar.birincil.acilis.neden}. İkincil servet ulaşma: ${verdictAd(s.h6.karar.ikincil.ham.verdict)}.`,
    );
    k.push("");
  }

  // 3. H8
  k.push("## 3. H8 — arazi yoğunlaşması");
  k.push("");
  k.push(
    tablo(
      ["Tohum", "Karar", "Gini (değer)", "Gini (hücre)", "Gini (yalnız sahipler)", "En büyük ilçe payı", "Pay > %25 çift", "Yeniden satış"],
      sonuclar.map((s) => [
        String(s.tohum),
        verdictAd(s.h8.verdict),
        yuzde(s.h8.gini.degerGiniPpm),
        yuzde(s.h8.gini.hucreGiniPpm),
        yuzde(s.h8.gini.sahiplerDegerGiniPpm),
        `${yuzde(s.h8.ilce.enBuyukPayPpm)}${s.h8.ilce.enBuyuk ? ` (${s.h8.ilce.enBuyuk.oyuncu}, ${s.h8.ilce.enBuyuk.hucre} hücre)` : ""}`,
        String(s.h8.ilce.payAsanCift),
        s.h8.yenidenSatis.satisSayisi === 0 ? "yok (ölçülemez)" : `${s.h8.yenidenSatis.satisSayisi}`,
      ]),
    ),
  );
  k.push("");
  k.push(
    (meta.duzen.yerlesik["spekulator"] ?? 0) + (meta.duzen.yerlesik["spekulatorYasli"] ?? 0) > 0
      ? "Not: spekülatör botları (arsa biriktirir, üretmez) koşuda; Gini ve ilçe payı onların tavanlara (72 hücre / ilçenin %25'i) dayanmasıyla ölçülür. En büyük ilçe payı %25'e tam dayanabilir ama aşamaz (tavan çekirdekte); eşik \"> %25\" olduğundan tam %25 geçer."
      : "Not: botlar yalnızca yurt + birkaç hücre aldığından yoğunlaşma düşüktür; H8'in asıl sınavı spekülatör botuyla yapılır (`--bot ...,spekulator=N`).",
  );
  k.push("");
  k.push("**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından \"fiyat / haftalık arazi geliri\" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.");
  k.push("");

  // 3a. Ayrılmış hücre garantisi
  k.push("## 3a. Ayrılmış hücre garantisi");
  k.push("");
  k.push("Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).");
  k.push("");
  k.push(
    tablo(
      ["Tohum", "An", "Ayrılmış toplam", "Satılan", "Boş", "Kalan pay", "İhlal", "Güvence"],
      sonuclar.flatMap((s) => [
        [String(s.tohum), "geç katılımdan hemen önce", String(s.ayrilmis.gecOncesi.ayrilmisToplam), String(s.ayrilmis.gecOncesi.satilan), String(s.ayrilmis.gecOncesi.bos), yuzde(s.ayrilmis.gecOncesi.kalanPayPpm), String(s.ayrilmis.gecOncesi.ihlal), s.ayrilmis.gecOncesi.guvenceTuttu ? "tuttu" : "İHLAL"],
        [String(s.tohum), "koşu sonu", String(s.ayrilmis.sonda.ayrilmisToplam), String(s.ayrilmis.sonda.satilan), String(s.ayrilmis.sonda.bos), yuzde(s.ayrilmis.sonda.kalanPayPpm), String(s.ayrilmis.sonda.ihlal), s.ayrilmis.sonda.guvenceTuttu ? "tuttu" : "İHLAL"],
      ]),
    ),
  );
  k.push("");
  k.push("Okuma: İHLAL = 0 ise çekirdek kuralı (eski oyuncuya satmama) tutuyor. Kalan pay düşükse ayrılmış hücreler **önceki yeni oyuncular** (ör. ilk 14 günde alım yapan spekülatörler) tarafından tüketilmiş demektir: kural eski oyuncudan korur, aynı dönemdeki yeni oyuncudan korumaz.");
  k.push("");

  // 4. Y ölçütleri
  k.push("## 4. Y ölçütleri (Y1–Y10)");
  k.push("");
  k.push("**Botlar eğlenceyi ölçmez** (docs/00 R5): *insan testi* işaretli ölçütlerde aşağıdaki bot sayıları yalnız **gözlemdir**, hedef denetimi sayılmaz. Çekirdek durumundan türetilemeyenler **ölçülemez** işaretiyle gösterilir.");
  k.push("");
  const ilk = sonuclar[0];
  const y = (kod: string): string => {
    if (!ilk) return "—";
    const ort = (f: (s: ParselTohumSonucu) => number | null): string => yuzde(ortalama(degerliOlanlar(sonuclar.map(f))));
    switch (kod) {
      case "Y1":
        return `bot gözlemi: ≤ 10 dk ${ort((s) => sayisal(s.y.y1.sonuc, (x: { oranPpm: number }) => x.oranPpm))} (botlar katılımda anında kurar)`;
      case "Y2":
        return `bot gözlemi: ≤ 60 dk ${ort((s) => sayisal(s.y.y2.dk60, (x: { oranPpm: number }) => x.oranPpm))}, ≤ 10 dk ${ort((s) => sayisal(s.y.y2.dk10, (x: { oranPpm: number }) => x.oranPpm))}`;
      case "Y3":
        return "ölçülemez (sözleşme komutu yok)";
      case "Y5":
        return `en büyük katman ${ort((s) => sayisal(s.y.y5, (x: { enBuyukPayPpm: number }) => x.enBuyukPayPpm))}; hibrit portföy ${ort((s) => sayisal(s.y.y5, (x: { hibritPayPpm: number }) => x.hibritPayPpm))}`;
      case "Y6":
        return `bot gözlemi: yön değiştiren ${ort((s) => sayisal(s.y.y6, (x: { oranPpm: number }) => x.oranPpm))} (botlar bırakmaz/iptal etmez); D7 farkı ölçülemez`;
      case "Y7":
        return `${verdictAd(oz.h6.y7Verdict)} · ${yuzde(oz.h6.y7PayiPpm)} oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2)`;
      default:
        return "ölçülemez";
    }
  };
  k.push(
    tablo(
      ["#", "Ölçüt", "Hedef", "Kaynak", "Bu koşuda"],
      Y_OLCUTLERI.map((t) => [t.kod, t.ad, t.hedef, t.insanTesti ? "**insan testi**" : "bot + insan (karma)", `${y(t.kod)} — ${t.not}`]),
    ),
  );
  k.push("");

  // 5. Oyuncular (ilk tohum)
  if (ilk) {
    k.push(`## 5. Oyuncu özeti (tohum ${ilk.tohum})`);
    k.push("");
    if (ilk.katilamayan.length > 0) {
      k.push(`**Katılamayan oyuncular** (hiçbir ilçe yurt veremedi; ölçüm dışı): ${ilk.katilamayan.length} (${ilk.katilamayan.slice(0, 8).join(", ")}${ilk.katilamayan.length > 8 ? ", …" : ""})`);
      k.push("");
    }
    {
      const toplamYok = sonuclar.reduce((t, x) => t + x.uygunIlceYok.length, 0);
      if (toplamYok > 0 || ilk.uygunIlceYok.length > 0) {
        k.push(`**Uygun ilçe yok: ${ilk.uygunIlceYok.length}** (ilçe seçimi hiçbir ilçeyi "yurt verebilen + açılışa uygun" bulmadı; oyuncu katılmadı, ölçüm dışı)${ilk.uygunIlceYok.length > 0 ? ": " + ilk.uygunIlceYok.slice(0, 6).map((x) => `${x.oyuncu} (${x.neden})`).join("; ") : ""}. Tüm tohumlarda toplam: ${toplamYok}.`);
        k.push("");
      }
    }
    if (ilk.yurtsuz > 0) {
      k.push(`**Yurtsuz oyuncu:** ${ilk.yurtsuz} / ${ilk.oyuncular.length} (ilçelerde yurt kalmadı: katıldı ama hücresiz; bot komut veremez). Doluluk doygunluğa ulaştı.`);
      k.push("");
    }
    if (ilk.oyuncular.length > 16) {
      const gruplar = new Map<string, ParselTohumSonucu["oyuncular"]>();
      for (const o of ilk.oyuncular) gruplar.set(o.id.replace(/_\d+$/, ""), [...(gruplar.get(o.id.replace(/_\d+$/, "")) ?? []), o]);
      k.push(
        tablo(
          ["Grup", "Oyuncu", "Ort. hücre", "En çok hücre", "Ort. ham servet", "Ort. komut", "Reddedilen"],
          [...gruplar.entries()].map(([ad, l]) => {
            const servet = l.map((o) => o.servet.hazine + o.servet.stok + o.servet.arazi + o.servet.yapi);
            return [ad, String(l.length), String(Math.floor(l.reduce((t, o) => t + o.hucre, 0) / l.length)), String(Math.max(...l.map((o) => o.hucre))), tl(ortalama(servet)), String(Math.floor(l.reduce((t, o) => t + o.komut, 0) / l.length)), String(l.reduce((t, o) => t + o.basarisiz, 0))];
          }),
        ),
      );
      k.push("");
    }
    k.push(
      tablo(
        ["Oyuncu", "Katılım (gün)", "İlçe", "Hücre", "Ayrılmış", "Yapı", "Komut", "Reddedilen", "Hazine", "Stok", "Arazi", "Yapı bedeli", "Ham servet"],
        ilk.oyuncular.slice(0, 16).map((o) => [
          o.id,
          String(o.katilmaGun),
          o.ilce ?? "—",
          String(o.hucre),
          String(o.ayrilmisHucre),
          String(o.yapi),
          String(o.komut),
          String(o.basarisiz),
          tl(o.servet.hazine),
          tl(o.servet.stok),
          tl(o.servet.arazi),
          tl(o.servet.yapi),
          tl(o.servet.hazine + o.servet.stok + o.servet.arazi + o.servet.yapi),
        ]),
      ),
    );
    k.push("");
    if (ilk.oyuncular.length > 16) k.push(`(Yalnız ilk 16 oyuncu gösterilir; toplam ${ilk.oyuncular.length}.)`);
    k.push("Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + " + meta.olcumGunu + " gündür; koşu bitişiyle aynı).");
    k.push("");
  }

  // 5a. Önceki koşuyla karşılaştırma
  if (meta.karsilastirma !== undefined) {
    const kr = meta.karsilastirma;
    const onceki = olguKarsilastirmasi(kr.sonuclar);
    const simdi = olguKarsilastirmasi(sonuclar);
    const ozOnce = parselOzetle(kr.sonuclar);
    k.push(`## 5a. Önceki koşuyla karşılaştırma (${kr.etiket ?? kr.kaynak})`);
    k.push("");
    k.push(`Karşılaştırılan koşu: \`${kr.kaynak}\` (${kr.sonuclar.length} tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.`);
    k.push("");
    const acilislar = [...new Set([...Object.keys(onceki), ...Object.keys(simdi)])].sort();
    k.push(
      tablo(
        ["Geç katılan açılışı", "Gelir/emsal (önceki)", "Gelir/emsal (bu koşu)", "Servet/emsal (önceki)", "Servet/emsal (bu koşu)"],
        acilislar.map((a) => [a, yuzde(onceki[a]?.gelirOranPpm), yuzde(simdi[a]?.gelirOranPpm), yuzde(onceki[a]?.servetOranPpm), yuzde(simdi[a]?.servetOranPpm)]),
      ),
    );
    k.push("");
    k.push(
      tablo(
        ["Ölçüt", "Önceki", "Bu koşu"],
        [
          ["Y7 oyuncu payı (≥ %50 emsal medyanı)", yuzde(ozOnce.h6.y7PayiPpm), yuzde(oz.h6.y7PayiPpm)],
          ["Y7 kararı", verdictAd(ozOnce.h6.y7Verdict), verdictAd(oz.h6.y7Verdict)],
          ["H6 açılış koşulu (ayak izine yeter ve 14 günde yapı)", ozOnce.h6.tabanYeterPpm === null ? "— (önceki koşuda ölçülmedi)" : verdictAd(ozOnce.h6.acilisVerdict), verdictAd(oz.h6.acilisVerdict)],
          ["İkincil servet ulaşma", yuzde(ozOnce.h6.servetBasariPpm), yuzde(oz.h6.servetBasariPpm)],
        ],
      ),
    );
    k.push("");
  }

  // 6. Determinizm
  k.push("## 6. Determinizm izi");
  k.push("");
  k.push(tablo(["Tohum", "durumOzeti"], sonuclar.map((s) => [String(s.tohum), `\`${s.durumOzeti}\``])));
  k.push("");

  // 7. Karşılaştırma notu
  k.push("## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu");
  k.push("");
  k.push("Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.");
  k.push("");
  k.push(
    tablo(
      ["Hipotez", "v0.3 (bölge kipi)", "Parsel v0 (bu koşu)", "Karşılaştırılabilirlik / uyarı"],
      [
        ["H6", "0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı)", `${verdictAd(oz.h6.verdict)} (birincil Y7 ${yuzde(oz.h6.y7PayiPpm)}); ikincil servet ${verdictAd(oz.h6.servetVerdict)} (ulaşan ${yuzde(oz.h6.servetBasariPpm)})`, "Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır."],
        ["H8", "— (yeni, temel çizgi yok)", `${verdictAd(oz.h8.verdict)} · Gini ${yuzde(oz.h8.giniPpm)}`, "Temel çizgi yok."],
      ],
    ),
  );
  k.push("");
  k.push(
    "**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). " +
      "Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.",
  );
  k.push("");

  // 8. Sınırlar
  k.push("## 8. Sınırlar ve uyarılar");
  k.push("");
  k.push("- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.");
  k.push("- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.");
  k.push("- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.");
  k.push("- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.");
  k.push("- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.");
  k.push("");
  return k.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// Ayrıştırma tablosu (baş lider kararı): bir sonucun hangi ayarın etkisi olduğunu ayrı ayrı gösterir
// ---------------------------------------------------------------------------

export interface AyristirmaGirdisi {
  /** JSON dosya adı (yol değil: rapor deterministik kalsın) ve rapor etiketi. */
  dosya: string;
  etiket: string;
  /** Koşunun ayarları: ilceSec ayrılmış önceliği AÇIK mıydı, P3b kuralları KAPALI mıydı. */
  ayrilmisOnceligi: boolean;
  p3bKapali: boolean;
  yurtKapali?: boolean;
  botTohum?: number | undefined;
  sonuclar: readonly ParselTohumSonucu[];
}

function kosuSatiri(t: ParselTohumSonucu): {
  kalan: number;
  toplam: number;
  tabanOlgu: number;
  olgu: number;
  y7Olculen: number;
  h6Yeni: Verdict;
  h6Eski: Verdict;
  genc: number;
  yasli: number;
  yerlesikYurt: number;
  gec: number;
} {
  const y7 = t.h6.y7;
  const y7Hedef = y7.olculebilir ? y7.hedefGecti : null;
  const ucuzHedef = t.h6.ucuz.uygunHucre === 0 ? null : t.h6.ucuz.payPpm >= PARSEL_H6_UCUZ_HUCRE_ESIK_PPM;
  const topla = (f: (id: string) => boolean): number => t.oyuncular.filter((o) => f(o.id)).reduce((x, o) => x + o.ayrilmisHucre, 0);
  const yaslimi = (id: string): boolean => id.startsWith("spekulator_yasli");
  const gencmi = (id: string): boolean => id.startsWith("spekulator") && !yaslimi(id);
  const gecmi = (id: string): boolean => id.startsWith("gec_");
  return {
    kalan: t.ayrilmis.gecOncesi.bos,
    toplam: t.ayrilmis.gecOncesi.ayrilmisToplam,
    tabanOlgu: t.h6.olgular.filter((o) => o.acilisKosulu.tabanYeter).length,
    olgu: t.h6.olgular.length,
    y7Olculen: y7.olculebilir ? y7.olculebilirOyuncu : 0,
    h6Yeni: t.h6.karar.birincil.verdict,
    h6Eski: kosullardanVerdict([y7Hedef, ucuzHedef]),
    genc: topla(gencmi),
    yasli: topla(yaslimi),
    yerlesikYurt: topla((id) => !id.startsWith("spekulator") && !gecmi(id)),
    gec: topla(gecmi),
  };
}

const ayarAd = (g: AyristirmaGirdisi): string => `P3b ${g.p3bKapali ? "KAPALI" : "AÇIK"} · ilceSec önceliği ${g.ayrilmisOnceligi ? "AÇIK" : "KAPALI"} · yurt kuralı ${g.yurtKapali === true ? "KAPALI" : "AÇIK"}`;

function aralik(xs: readonly number[]): string {
  const mn = Math.min(...xs);
  const mx = Math.max(...xs);
  const ort = xs.reduce((t, x) => t + x, 0) / xs.length;
  return mn === mx ? String(mn) : `${Math.round(ort * 10) / 10} (${mn}–${mx})`;
}

/** Ayrıştırma raporu: koşu başına özet (tohumlar üzerinden ortalama ve aralık) ve tohum başına döküm. Duvar saati içermez: deterministik. */
export function ayristirmaRaporuUret(girdiler: readonly AyristirmaGirdisi[], meta: { etiket?: string; bulgular: string }): string {
  const k: string[] = [];
  k.push(`# Parsel ölçümü — ayrıştırma (${meta.etiket ?? "ayristirma"})`);
  k.push("");
  k.push("Aynı bot dağılımı ve aynı tohumlarla, üç ayarın etkisini ayrı ayrı ölçer: **P3d yurt kuralı** (yurt önce ayrılmış dışından), **P3b çok hesap kuralları** (ayrılmış hücre yalnız katılım ilçesinde + günlük ilçe tavanı) ve **ilceSec ayrılmış önceliği** (ayak izine yeten ilçe önce). P3b kapatma yalnız koşucu seçeneğidir (veri kopyası; parametreler.json değişmez).");
  k.push("");
  k.push(`**Bulgular ve yorum (elle yazılmış):** [${meta.bulgular}](${meta.bulgular})`);
  k.push("");
  k.push("## 1. Koşular");
  k.push("");
  k.push(tablo(["Etiket", "Dosya", "Ayarlar", "Bot tohumu", "Koşu tohumları"], girdiler.map((g) => [g.etiket, g.dosya, ayarAd(g), g.botTohum === undefined ? "yok" : String(g.botTohum), g.sonuclar.map((s) => s.tohum).join(", ")])));
  k.push("");
  k.push("## 2. Özet (tohumlar üzerinden ortalama; en düşük–en yüksek parantezde)");
  k.push("");
  k.push(
    tablo(
      ["Etiket", "Ayrılmış kalan (geç katılımdan önce, boş)", "Açılış (i) tutan olgu", "Y7 ölçülebilen olgu", "H6 yeni (tohum başına)", "H6 eski tanım (tohum başına)", "Genç spekülatör ayrılmış", "Yerleşik + yurt ayrılmış", "Yaşlı spekülatör", "Geç katılan"],
      girdiler.map((g) => {
        const r = g.sonuclar.map(kosuSatiri);
        const topOlgu = r.reduce((t, x) => t + x.olgu, 0);
        return [
          g.etiket,
          `${aralik(r.map((x) => x.kalan))} / ${r[0]?.toplam ?? "—"}`,
          `${r.reduce((t, x) => t + x.tabanOlgu, 0)} / ${topOlgu} (tohum başına ${Math.min(...r.map((x) => x.tabanOlgu))}–${Math.max(...r.map((x) => x.tabanOlgu))} / ${r[0]?.olgu ?? "—"})`,
          `${r.reduce((t, x) => t + x.y7Olculen, 0)} / ${topOlgu} (tohum başına ${Math.min(...r.map((x) => x.y7Olculen))}–${Math.max(...r.map((x) => x.y7Olculen))} / ${r[0]?.olgu ?? "—"})`,
          r.map((x) => verdictAd(x.h6Yeni)).join(" · "),
          r.map((x) => verdictAd(x.h6Eski)).join(" · "),
          aralik(r.map((x) => x.genc)),
          aralik(r.map((x) => x.yerlesikYurt)),
          aralik(r.map((x) => x.yasli)),
          aralik(r.map((x) => x.gec)),
        ];
      }),
    ),
  );
  k.push("");
  k.push("## 3. Tohum başına döküm");
  k.push("");
  k.push(
    tablo(
      ["Etiket", "Tohum", "Ayrılmış kalan", "Açılış (i)", "Y7 ölçülebilen", "H6 yeni", "H6 eski", "Genç spekülatör", "Yerleşik + yurt", "Yaşlı", "Geç"],
      girdiler.flatMap((g) =>
        g.sonuclar.map((t) => {
          const x = kosuSatiri(t);
          return [g.etiket, String(t.tohum), `${x.kalan} / ${x.toplam}`, `${x.tabanOlgu} / ${x.olgu}`, `${x.y7Olculen} / ${x.olgu}`, verdictAd(x.h6Yeni), verdictAd(x.h6Eski), String(x.genc), String(x.yerlesikYurt), String(x.yasli), String(x.gec)];
        }),
      ),
    ),
  );
  k.push("");
  k.push("Notlar: \"H6 yeni\" = Y7 + açılış koşulu (i) (docs/12 §13); \"H6 eski tanım\" = Y7 + ucuz hücre payı ≥ %20 (bilgi). Ayrılmış hücre sayıları koşu sonundaki sahiplik (yurt dahil). \"Yerleşik + yurt\": spekülatör ve geç katılan dışındaki tüm oyuncular (yurt hücrelerinin ayrılmış payı dahil).");
  k.push("");
  return k.join("\n");
}
