/** Markdown raporu: özet tablo, hipotez ayrıntıları, parametreler, çalışma süresi ve determinizm izi. */
import type { HipotezSonucu, Verdict } from "./tipler";

export interface RaporMeta {
  tohumlar: number[];
  hizli: boolean;
  /** Toplam duvar saati (ms). */
  sureMs: number;
  /** Çalıştırma komut satırı seçenekleri özeti (tarih yok: rapor deterministik adlandırılır). */
  secenekler: Record<string, unknown>;
}

const VERDICT_METIN: Record<Verdict, string> = { gecti: "GEÇTİ", kaldi: "KALDI", belirsiz: "BELİRSİZ" };

export function verdictMetni(v: Verdict): string {
  return VERDICT_METIN[v];
}

function yuzde(x: number | null | undefined, n = 1): string {
  return x === null || x === undefined ? "—" : `%${(x * 100).toFixed(n)}`;
}

function sayi(x: unknown, n = 3): string {
  return typeof x === "number" ? String(Math.round(x * 10 ** n) / 10 ** n) : String(x ?? "—");
}

function sure(ms: number): string {
  return ms < 1000 ? `${ms} ms` : ms < 60_000 ? `${(ms / 1000).toFixed(1)} sn` : `${Math.floor(ms / 60_000)} dk ${Math.round((ms % 60_000) / 1000)} sn`;
}

function tablo(baslik: readonly string[], satirlar: readonly (readonly unknown[])[]): string {
  const govde = satirlar.map((s) => `| ${s.map((x) => String(x ?? "—")).join(" | ")} |`);
  return [`| ${baslik.join(" | ")} |`, `|${baslik.map(() => "---").join("|")}|`, ...govde].join("\n");
}

type Kayit = Record<string, unknown>;
const kayit = (x: unknown): Kayit => (x ?? {}) as Kayit;
const dizi = (x: unknown): Kayit[] => (Array.isArray(x) ? (x as Kayit[]) : []);

function h1Ayrinti(h: HipotezSonucu): string {
  const a = kayit(h.ayrinti);
  const ort = kayit(a["tohumOrtalamaTop3Orani"]);
  const onayarlar = dizi(a["onayarlar"]);
  const satir1 = onayarlar.map((o) => [o["ad"], yuzde(ort[String(o["ad"])] as number), String(o["aciklama"])]);
  const parcalar = [`**İlk-üç bölge oranı (tohum ortalaması)**\n\n${tablo(["Önayar", "İlk üçte olduğu bölge oranı", "Açıklama"], satir1)}`];
  const t = h.tohumBasina.map((x) => {
    const o = kayit(x.ozet);
    return [x.tohum, String(o["enYuksekOnayar"]), yuzde(x.olcum), sayi(o["entropiBit"], 2), sayi(o["entropiNormalize"], 2), x.verdict === "gecti" ? "geçti" : "kaldı"];
  });
  parcalar.push(`**Tohum başına** (entropi: en iyi önayarın bölgelere dağılımı, bit; normalize = H / log2(${onayarlar.length}))\n\n${tablo(["Tohum", "En yüksek önayar", "Oran", "Entropi (bit)", "Norm. entropi", "Sonuç"], t)}`);
  const dh = h.tohumBasina.map((x) => [x.tohum, yuzde(kayit(x.ozet)["enYuksekDengeliHaric"] as number)]);
  parcalar.push(`**Duyarlılık: bölgeye göre uyarlanan "dengeli" önayar sıralamadan çıkarılırsa en yüksek ilk-üç oranı**\n\n${tablo(["Tohum", "En yüksek oran (dengeli hariç)"], dh)}`);
  const dag = h.tohumBasina.map((x) => {
    const d = kayit(kayit(x.ozet)["enIyiOnayarDagilimi"]);
    return [x.tohum, ...onayarlar.map((o) => d[String(o["ad"])] as number)];
  });
  parcalar.push(`**Bölge başına en iyi önayar sayımı**\n\n${tablo(["Tohum", ...onayarlar.map((o) => String(o["ad"]))], dag)}`);
  const bt = dizi(a["bolgeTablosuIlkTohum"]);
  if (bt.length > 0) {
    const adlar = onayarlar.map((o) => String(o["ad"]));
    const sat = bt.map((b) => {
      const sk = kayit(b["skorlar"]);
      return [b["bolge"], String(b["enIyi"]), ...adlar.map((n) => Math.round(((sk[n] as number) ?? 0) / 1000) + "k")];
    });
    parcalar.push(`**Bölge tablosu (ilk tohum; skor, bin para)**\n\n${tablo(["Bölge", "En iyi", ...adlar], sat)}`);
  }
  return parcalar.join("\n\n");
}

function h2Ayrinti(h: HipotezSonucu): string {
  const t = h.tohumBasina.map((x) => {
    const o = kayit(x.ozet);
    return [x.tohum, yuzde(o["tekrarEndeksi"] as number), yuzde(o["tekrarEndeksiSon10"] as number), yuzde(o["tekrarEndeksiSikiBolgeli"] as number), yuzde(o["tekrarEndeksiEylemGunleri"] as number), sayi(o["jaccardOrtalama"], 2), sayi(o["sifirGunSayisi"], 0), sayi(o["ilkSifirGun"], 0), `${o["odakKomut"]}/${o["odakBasarisiz"]}`];
  });
  const p = [
    `${tablo(["Tohum", "RI (tüm)", "RI (son 10 gün)", "RI (bölge dahil)", "RI (yalnız eylem günleri)", "Jaccard", "Sıfır-aday günü", "Kalıcı sıfır günü", "Odak komut/başarısız"], t)}`,
  ];
  const tohumlar = dizi(kayit(h.ayrinti)["tohumlar"]);
  const ilk = tohumlar[0];
  if (ilk) {
    const gunler = dizi(ilk["gunler"]);
    const sat = gunler.map((g) => [g["gun"], String(g["enIyi"]), String(g["bolge"] || "—"), sayi(g["marjinal"], 0), g["pozitif"], g["aday"]]);
    p.push(`**Gün gün en iyi düzenleme ve karar tükenmesi (tohum ${String(ilk["tohum"])})**\n\n${tablo(["Gün", "En iyi anahtar", "Bölge", "Marjinal değer (para)", "Pozitif aday sayısı", "Ölçülen aday"], sat)}`);
  }
  return p.join("\n\n");
}

function h3Ayrinti(h: HipotezSonucu): string {
  const t = h.tohumBasina.map((x) => {
    const o = kayit(x.ozet);
    return [x.tohum, yuzde(x.olcum), String(o["enBuyukMal"]), yuzde(o["gurultuTabani"] as number), `${o["temelBirlik"]} → ${o["mudahaleBirlik"]}`, `${o["temelSavas"]} → ${o["mudahaleSavas"]}`, x.verdict === "gecti" ? "geçti" : x.verdict === "kaldi" ? "kaldı" : "belirsiz"];
  });
  const p = [tablo(["Tohum", "En büyük değişim", "Mal", "Gürültü tabanı", "Toplam birlik (temel → müdahale)", "Savaş sayısı", "Sonuç"], t)];
  const ilk = h.tohumBasina[0];
  if (ilk) {
    const satirlar = dizi(kayit(ilk.ozet)["degisimTablosu"]).map((s) => [
      s["mal"],
      sayi(s["fiyatTemel14"], 2),
      sayi(s["fiyatMudahale14"], 2),
      yuzde(s["fiyatDegisim14"] as number),
      yuzde(s["fiyatDegisimOrt"] as number),
      yuzde(s["kapsamTemel14"] as number),
      yuzde(s["kapsamMudahale14"] as number),
      yuzde(s["kapsamDegisim14"] as number),
      yuzde(s["kapsamDegisimOrt"] as number),
    ]);
    p.push(`**Değişim tablosu (tohum ${ilk.tohum}; fiyat = taban oranı; değişim göreli)**\n\n${tablo(["Mal", "Fiyat temel", "Fiyat müdahale", "Δ fiyat (14. gün)", "Δ fiyat (7-14 ort.)", "Kapsam temel", "Kapsam müdahale", "Δ kapsam (14. gün)", "Δ kapsam (7-14 ort.)"], satirlar)}`);
  }
  return p.join("\n\n");
}

function h5Ayrinti(h: HipotezSonucu): string {
  const sat: unknown[][] = [];
  for (const x of h.tohumBasina) {
    for (const v of dizi(kayit(x.ozet)["varyantlar"])) {
      sat.push([x.tohum, v["varyant"], v["savasSayisi"], v["saldiranKazanma"], yuzde(v["enBuyukDegerKayipOrani"] as number, 2), yuzde(v["enBuyukMalKayipOrani"] as number, 2), yuzde(v["kumulatifKayipOrani48s"] as number, 2), v["saldiranBirlik"]]);
    }
  }
  const p = [tablo(["Tohum", "Varyant", "Savaş", "Saldıran galip", "Tek pencere değer kaybı (maks)", "Tek pencere mal kaybı (maks)", "48 saat kümülatif değer kaybı", "Saldıran birlik"], sat)];
  const t0 = dizi(kayit(h.ayrinti)["pencereler"])[0];
  const v0 = t0 ? dizi(t0["varyantlar"])[0] : undefined;
  if (t0 && v0) {
    const s = dizi(v0["pencereler"]).map((w) => [w["saldiranBolge"], w["hedefBolge"], w["kazanan"], w["saldiranGuc"], w["savunanGuc"], yuzde((w["kayipOraniPpm"] as number) / 1_000_000, 2), yuzde((w["malBazliEnBuyukOranPpm"] as number) / 1_000_000, 2), String(w["enBuyukMal"] || "—")]);
    p.push(`**Pencereler (tohum ${String(t0["tohum"])}, varyant ${String(v0["varyant"])})**\n\n${tablo(["Saldıran bölge", "Hedef bölge", "Kazanan", "Saldıran güç", "Savunan güç", "Değer kaybı", "Mal kaybı (maks)", "Mal"], s)}`);
  }
  return p.join("\n\n");
}

function h6Ayrinti(h: HipotezSonucu): string {
  const t = h.tohumBasina.map((x) => {
    const o = kayit(x.ozet);
    return [x.tohum, o["gecKatilanSayisi"], o["ulasan"], yuzde(o["ulasmaOrani"] as number), sayi(o["ortalamaOran"], 2), x.verdict === "gecti" ? "geçti" : x.verdict === "kaldi" ? "kaldı" : "belirsiz"];
  });
  const p = [tablo(["Tohum", "Geç katılan", "Ulaşan", "Oran", "Ort. geç/medyan", "Sonuç"], t)];
  const ilk = dizi(kayit(h.ayrinti)["tohumlar"])[0];
  if (ilk) {
    const s = dizi(ilk["gecKatilanlar"]).map((g) => [g["gec"], g["devlet"], g["katilmaGun"], (g["bolgeler"] as string[]).join(", "), Math.round((g["gecBolgeBasinaUretim"] as number) / 1000) + "k", Math.round((g["yerlesikMedyan"] as number) / 1000) + "k", sayi(g["oran"], 2), g["ulasti"] ? "evet" : "hayır"]);
    p.push(`**Geç katılanlar (tohum ${String(ilk["tohum"])}; bölge başına 14 günlük üretim değeri, para)**\n\n${tablo(["Oyuncu", "Devlet", "Katılım günü", "Bölgeler", "Geç katılan", "Yerleşik medyan", "Oran", "Ulaştı"], s)}`);
  }
  return p.join("\n\n");
}

function h7Ayrinti(h: HipotezSonucu): string {
  const sat: unknown[][] = [];
  for (const x of h.tohumBasina) {
    for (const s of dizi(kayit(x.ozet)["satirlar"])) {
      sat.push([x.tohum, `${String(s["saat"])} s${s["kararNoktasi"] ? "" : " (ek)"}`, Math.round((s["aktifUretim"] as number) / 1000) + "k", Math.round((s["unutUretim"] as number) / 1000) + "k", yuzde(s["oran"] as number), Math.round(s["aktifHazine"] as number) + " / " + Math.round(s["unutHazine"] as number)]);
    }
  }
  const n = h.tohumBasina.map((x) => `- Tohum ${x.tohum}: ${String(kayit(x.ozet)["neden"])} (aktif komut ${String(kayit(x.ozet)["aktifKomut"])}, kur_ve_unut komut ${String(kayit(x.ozet)["unutKomut"])})`);
  return `${tablo(["Tohum", "Nokta", "Aktif üretim", "kur_ve_unut üretim", "Oran", "Hazine (aktif / unut)"], sat)}\n\n${n.join("\n")}`;
}

const AYRINTI: Record<string, (h: HipotezSonucu) => string> = { H1: h1Ayrinti, H2: h2Ayrinti, H3: h3Ayrinti, H5: h5Ayrinti, H6: h6Ayrinti, H7: h7Ayrinti };

/** Markdown raporu üretir. */
export function raporUret(sonuclar: readonly HipotezSonucu[], meta: RaporMeta): string {
  const s: string[] = [];
  s.push(`# Ölçüm raporu: ${sonuclar.map((x) => x.kimlik).join(", ")} (tohum ${meta.tohumlar.join(", ")})`);
  s.push(`Bu rapor \`pnpm olcum\` ile üretilmiştir. Simülasyon deterministiktir: aynı tohum ve kod için sonuçlar (duvar saati hariç) birebir aynıdır.${meta.hizli ? " **Hızlı mod: boyutlar küçültülmüştür.**" : ""}`);

  s.push("## Özet");
  s.push(
    tablo(
      ["Hipotez", "Ölçüm", "Eşik", "Sonuç", "Tohum başarı oranı"],
      sonuclar.map((h) => [
        `**${h.kimlik}** ${h.hipotez}`,
        `${h.olcum.ad}: ${h.olcum.deger === null ? "—" : h.olcum.birim === "oran" ? yuzde(h.olcum.deger) : h.olcum.deger}`,
        h.esik.aciklama,
        `**${verdictMetni(h.verdict)}**`,
        `${yuzde(h.tohumBasariOrani, 0)} (${h.tohumBasina.filter((t) => t.verdict === "gecti").length}/${h.tohumBasina.length})`,
      ]),
    ),
  );
  s.push("Sonuç sözlüğü: GEÇTİ = vazgeçme ölçütü tetiklenmedi (hipotez ayakta); KALDI = ölçüt tetiklendi; BELİRSİZ = tohumlar çelişiyor veya ölçüm güvenilir değil. \"Tohum başarı oranı\" = GEÇTİ diyen tohumların oranı.");

  for (const h of sonuclar) {
    s.push(`## ${h.kimlik} — ${h.hipotez}`);
    s.push(`- **Ölçüm**: ${h.olcum.ad} = ${h.olcum.deger === null ? "—" : h.olcum.birim === "oran" ? yuzde(h.olcum.deger, 2) : h.olcum.deger}. ${h.olcum.aciklama}`);
    s.push(`- **Eşik**: ${h.esik.aciklama}`);
    s.push(`- **Sonuç**: ${verdictMetni(h.verdict)} (tohum başarı oranı ${yuzde(h.tohumBasariOrani, 0)})`);
    const f = AYRINTI[h.kimlik];
    s.push(f ? f(h) : "```json\n" + JSON.stringify(h.ayrinti, null, 1) + "\n```");
  }

  s.push("## Parametre özeti");
  s.push(
    tablo(
      ["Hipotez", "Parametreler"],
      sonuclar.map((h) => [h.kimlik, Object.entries(h.parametreler).map(([k, v]) => `${k}=${typeof v === "object" ? JSON.stringify(v) : String(v)}`).join("; ")]),
    ),
  );
  s.push(`Seçenekler: \`${JSON.stringify(meta.secenekler)}\``);

  s.push("## Çalışma süresi (duvar saati)");
  s.push(tablo(["Hipotez", "Süre"], [...sonuclar.map((h) => [h.kimlik, sure(h.sureMs)]), ["**Toplam**", `**${sure(meta.sureMs)}**`]]));

  s.push("## Determinizm izi (durumOzeti)");
  s.push("Aynı tohum ve aynı kodla bu değerlerin aynı çıkması gerekir.");
  const iz: unknown[][] = [];
  for (const h of sonuclar) for (const t of h.tohumBasina) iz.push([h.kimlik, t.tohum, `\`${t.durumOzeti}\``]);
  s.push(tablo(["Hipotez", "Tohum", "durumOzeti"], iz));
  return s.join("\n\n") + "\n";
}
