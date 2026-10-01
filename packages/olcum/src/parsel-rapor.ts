/**
 * Parsel kısa koşusu raporu (Markdown + JSON özeti). Saf biçimlendirme: tohum sonuçlarından özet çıkarır ve Türkçe metin üretir.
 * Sayılar ppm ya da mili-₺'dir; yüzde/₺ gösterimi yalnız burada yapılır.
 */
import { Y_OLCUTLERI, y7UretimGeliri } from "./parsel";
import type { Olculemez } from "./parsel";
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
    /** HİPOTEZ KARARI (birincil): hibeden bağımsız üretim geliri (Y7) + ucuz hücre. */
    verdict: Verdict;
    y7PayiPpm: number | null;
    y7Verdict: Verdict;
    /** İKİNCİL (bilgi): servet tabanlı medyana ulaşma, ham (arındırılmış servetle aynı karar). */
    servetVerdict: Verdict;
    servetBasariPpm: number | null;
    ucuzPayPpm: number | null;
    genelUcuzPayPpm: number | null;
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
        ["**H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı", `${verdictAd(oz.h6.verdict)} · Y7 ${yuzde(oz.h6.y7PayiPpm)} oyuncu`, "Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20", "hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez"],
        ["H6 ikincil: servet medyana ulaşma (bilgi)", `${verdictAd(oz.h6.servetVerdict)} · ulaşan ${yuzde(oz.h6.servetBasariPpm)}`, "(karara girmez; eski tanım: ulaşan < %50)", "hibe + kit ham servetin ~" + yuzde(oz.h6.hibePayiPpm) + "'i; hibe/kit arındırması ulaşma kararını değiştirmez"],
        ["H6 ucuz hücre payı (≤ 2× taban)", `${yuzde(oz.h6.ucuzPayPpm)} (eski oyuncuya açık: ${yuzde(oz.h6.genelUcuzPayPpm)})`, "< %20", "ayrılmış hücreler yalnız yeni oyuncuya"],
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
  k.push("**Karar kaynağı (lider kararı).** H6'nın BİRİNCİL ölçüsü hibeden bağımsız üretim gelirinin akışıdır (**Y7**: katılımdan 14 gün sonraki son 7 günün net üretim geliri = hazine akışı − sermaye harcaması; hibe/kit akışa girmediği için tanım gereği bağımsız). Hipotez kararı Y7 + ucuz hücre koşulundan gelir. **Servet** tabanlı ulaşma İKİNCİL olarak raporlanır: ham servet ile hibe/kit'ten arındırılmış servet AYNI kararı verir (ortak ofset altında `servet ≥ medyan` değişmez; yalnız servet/medyan oranı değişir).");
  k.push("");
  for (const s of sonuclar) {
    k.push(`### Tohum ${s.tohum}`);
    k.push("");
    k.push("**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**");
    k.push("");
    k.push(
      tablo(
        ["Geç katılan", "İlçe", "Emsal", "Üretim geliri (7 gün)", "Emsal geliri medyan", "Emsal medyanının ≥ %50'si"],
        s.h6.olgular.map((o) => {
          const y = y7UretimGeliri([{ gelir: o.gelir, ilceGelirleri: o.emsalGelir }]);
          const ok = !y.olculebilir ? "ölçülemez" : y.ulasan === 1 ? "evet" : "hayır";
          return [o.gec, o.ilce ?? "—", `${o.emsal.length}`, tl(o.gelir), tl(o.emsalGelirMedyan), ok];
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
      `Ucuz hücre (katılım anında): ${yuzde(u.payPpm)} (${u.ucuzHucre}/${u.uygunHucre}); bunun ${u.ayrilmisUcuz} hücresi ayrılmış (yalnız yeni oyuncu), ${u.genelUcuz} hücresi genel (${yuzde(u.genelPayPpm)}). Satılmamış ayrılmış hücre: ${ay}. ` +
        `**H6 kararı (Y7 + ucuz): ${verdictAd(s.h6.karar.birincil.verdict)}** · Y7 ${s.h6.y7.olculebilir ? `${yuzde(s.h6.y7.oyuncuPayiPpm)} (${s.h6.y7.ulasan}/${s.h6.y7.olculebilirOyuncu})` : "ölçülemez: " + s.h6.y7.neden}. İkincil servet ulaşma: ${verdictAd(s.h6.karar.ikincil.ham.verdict)}.`,
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
  k.push("Not: botlar yalnızca yurt + birkaç hücre aldığından yoğunlaşma düşüktür; H8'in asıl sınavı spekülatör botuyla (henüz yok) yapılır. Yeniden satış mekanizması çekirdekte yok (`parsel_birak` devlete %70 iade); koşul 3 bu yüzden BELİRSİZ kalır.");
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
    k.push(
      tablo(
        ["Oyuncu", "Katılım (gün)", "İlçe", "Hücre", "Yapı", "Komut", "Reddedilen", "Hazine", "Stok", "Arazi", "Yapı bedeli", "Ham servet"],
        ilk.oyuncular.map((o) => [
          o.id,
          String(o.katilmaGun),
          o.ilce ?? "—",
          String(o.hucre),
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
    k.push("Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + " + meta.olcumGunu + " gündür; koşu bitişiyle aynı).");
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
