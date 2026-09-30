/** Markdown raporu: özet tablo, hipotez ayrıntıları, parametreler, çalışma süresi ve determinizm izi. */
import { TOHUM_NOTU } from "./ortak";
import type { HipotezSonucu, Verdict } from "./tipler";

/** `--karsilastir` ile okunan önceki ölçüm (JSON'dan; yalnızca özet tablo için gereken alanlar). */
export interface KarsilastirmaVerisi {
  /** Dosya yolu (raporda gösterilir). */
  kaynak: string;
  /** Önceki ölçümün sürüm/etiketi (varsa). */
  etiket?: string | undefined;
  hipotezler: ReadonlyArray<{
    kimlik: string;
    verdict: Verdict;
    olcum?: { ad?: string; deger?: number | null; birim?: string };
  }>;
}

export interface RaporMeta {
  tohumlar: number[];
  hizli: boolean;
  /** Tam boyut koşusu mu. */
  tam?: boolean;
  /** Sürüm/etiket (`--ad`). */
  etiket?: string | undefined;
  /** Önceki ölçüm (`--karsilastir`): özet tabloda yan yana gösterilir. */
  karsilastirma?: KarsilastirmaVerisi | undefined;
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

function dagilimMetni(d: Kayit, adlar: readonly string[]): string {
  return adlar
    .map((a) => [a, (d[a] as number) ?? 0] as const)
    .filter(([, v]) => v > 0)
    .sort((x, y) => y[1] - x[1])
    .map(([a, v]) => `${a} ${yuzde(v, 0)}`)
    .join(", ");
}

function tamYuzde(x: unknown, n = 0): string {
  return typeof x === "number" ? yuzde(x, n) : "—";
}

function bin(x: unknown): string {
  return typeof x === "number" ? `${Math.round(x / 100) / 10}k` : "—";
}

function h1Ayrinti(h: HipotezSonucu): string {
  const a = kayit(h.ayrinti);
  const ort = kayit(a["tohumOrtalamaAnlamliIlkUcOrani"]);
  const ortT = kayit(a["tohumOrtalamaIlkUcOraniToplam7Gun"]);
  const regret = kayit(a["tohumOrtalamaRegret"]);
  const regretK = kayit(a["tohumOrtalamaRegretKirpilmamis"]);
  const enIyiDag = kayit(a["tohumOrtalamaEnIyiDagilimi"]);
  const onayarlar = dizi(a["onayarlar"]);
  const adlar = onayarlar.map((o) => String(o["ad"]));
  const referans = a["referans"] ? kayit(a["referans"]) : null;
  const prm = kayit(h.parametreler);
  const tie = kayit(a["tieOzeti"]);
  const bilgi = kayit(a["bilgiGostergeleri"]);
  const tanim = Array.isArray(a["isletimselTanim"]) ? (a["isletimselTanim"] as string[]) : [];
  const pencere = String(prm["pencereAdi"] ?? "birincil pencere");
  const parcalar: string[] = [];
  parcalar.push(
    `**İşletimsel tanım (H1 düzeneği v0.2)**\n\n${tanim.map((t, i) => `${i + 1}. ${t}`).join("\n")}\n\n` +
      `*Yukarıdaki metin varsayılan düzenektir (7 gün, 4-7. gün penceresi); bu koşuda geçerli pencere: ${pencere}, süre: ${String(prm["gun"])} gün.*\n\n` +
      `**Bu koşunun kurulumu**\n\n` +
      `- **Odak kurulumu: ${String(prm["odakKurulumu"])}** (\`--odak bolge_liman\` = odak bölge + en yakın liman; \`--odak bolge\` = yalnız odak bölge, limansız bölgede ticaret yok).\n` +
      `- Arka plan: ${String(prm["dunya"])}.\n` +
      `- Koşu: ${String(prm["gun"])} gün; skor penceresi: ${String(prm["skorPenceresi"])}. Bölge örneği: ${String(prm["bolgeSayisi"])}/${String(prm["tumBolgeSayisi"])} (${String(prm["ornekleme"])}).\n` +
      `- Sıralamaya giren önayarlar: ${adlar.join(", ")}. Pasif referans: ${String(prm["pasifReferans"])}. Genel amaçlı referans (sıralama dışı): ${String(prm["referansOnayar"])}.\n` +
      `- Skor: ${String(prm["skor"])}.\n` +
      `- Anlamlı fark: ${String(prm["anlamliFark"])}.\n` +
      `- Sıra: ${String(prm["sira"])}. **Verdict (PDF eşiği): en yüksek anlamlı ilk-üç oranı > %70 ise KALDI.**`,
  );
  const ek = kayit(a["ekDegerBilesenleri"]);
  const ekT = kayit(a["ekDegerBilesenleriToplam7Gun"]);
  const satir1 = onayarlar.map((o) => {
    const ad = String(o["ad"]);
    return [
      ad,
      `**${yuzde(ort[ad] as number)}**`,
      yuzde(ortT[ad] as number),
      yuzde(enIyiDag[ad] as number),
      bin(kayit(ek[ad])["skor"]),
      yuzde(regret[ad] as number),
      String(o["aciklama"]),
    ];
  });
  parcalar.push(
    `**Anlamlı ilk-üç bölge oranı (tohum ortalaması; yalnızca sabit önayarlar sıralanır; verdict birincil sütunla)**\n\nBirincil = ${pencere} akışında anlamlı ilk-üç oranı. İkincil = 7 günlük toplam skorda aynı kuralla ilk-üç oranı. "Ort. eklenen değer" = önayar − pasif, bölge ve tohum ortalaması (akış penceresi, para).\n\n${tablo(["Önayar", "Anlamlı ilk-üç (birincil)", "İlk-üç (7 gün toplam, ikincil)", "En iyi payı", "Ort. eklenen değer", "Ort. regret", "Açıklama"], satir1)}`,
  );
  const t = h.tohumBasina.map((x) => {
    const o = kayit(x.ozet);
    return [
      x.tohum,
      String(o["enYuksekOnayar"]),
      `**${yuzde(x.olcum)}**`,
      yuzde(o["enYuksekToplam7Gun"] as number),
      sayi(o["entropiNormalize"], 2),
      yuzde(o["enIyiTekOnayarRegret"] as number),
      `${o["anlamliBolge"]}/${String(prm["bolgeSayisi"])}`,
      sayi(o["ilkUcOrtalamaBuyuklugu"], 2),
      `${o["ilkUcTasanBolge"]} / ${o["esitlikleIlkUcGirenCift"]}`,
      x.verdict === "gecti" ? "geçti" : x.verdict === "kaldi" ? "kaldı" : "belirsiz",
    ];
  });
  parcalar.push(
    `**Tohum başına** ("Anlamlı bölge" = en az bir önayarın pasife göre anlamlı artı değer ürettiği bölge; "İlk-üç büyüklüğü" = bölge başına ilk üçe sayılan önayar sayısı ortalaması; "Taşan bölge / eşitlikle giren" = ilk üçe 3'ten çok önayar sayılan bölge sayısı / eşitlik toleransı olmasaydı ilk üçe girmeyecek önayar-bölge çifti sayısı; "En iyi tek önayar regret" = ortalama regret'i en düşük sabit önayarın regret'i)\n\n${tablo(["Tohum", "En yüksek önayar", "Oran (birincil)", "En yüksek (7 gün toplam)", "Norm. entropi", "En iyi tek önayar regret", "Anlamlı bölge", "İlk-üç büyüklüğü", "Taşan bölge / eşitlikle giren", "Sonuç"], t)}`,
  );
  parcalar.push(
    `**Eşitlik kuralının etkisi (tohum ortalaması)**: bölge başına ilk üçe sayılan ortalama önayar sayısı ${sayi(tie["ilkUcOrtalamaBuyuklugu"], 2)}; ilk üçe 3'ten çok önayar sayılan bölge sayısı ${sayi(tie["ilkUcTasanBolge"], 1)}; **ilk-üçe eşit sayılarak giren önayar-bölge çifti sayısı ${sayi(tie["esitlikleIlkUcGirenCift"], 1)}** (eşitlik toleransı olmadan girmeyecekler); en az bir anlamlı önayarı olan bölge ${sayi(tie["anlamliBolge"], 1)}/${String(prm["bolgeSayisi"])}, hiçbir önayarın pasifi anlamlı aşamadığı bölge ${sayi(tie["hicbiriAnlamliDegil"], 1)}.`,
  );
  const bilesenSat = onayarlar.map((o) => {
    const ad = String(o["ad"]);
    const b = kayit(ek[ad]);
    const bt = kayit(ekT[ad]);
    return [ad, bin(b["hazine"]), bin(b["stok"]), bin(b["yatirim"]), `**${bin(b["skor"])}**`, bin(b["israf"]), bin(bt["hazine"]), bin(bt["stok"]), bin(bt["yatirim"]), `**${bin(bt["skor"])}**`];
  });
  parcalar.push(
    `**Ayrıştırma: eklenen değerin bileşenleri (önayar − pasif; tüm bölgeler ve tohumlar üzerinden ortalama, bin para)**\n\nSkor = Δhazine + Δstok (taban fiyat) + yatırım (yatırım maliyetle geri eklenir). "İsraf farkı" bilgi amaçlıdır (depo taşması + bozulma değeri, skora girmez). Pasif referansın ortalama skoru: ${bin(a["pasifOrtalamaSkor"])} (akış penceresi).\n\n${tablo(["Önayar", "Δhazine (akış)", "Δstok (akış)", "yatırım (akış)", "Eklenen değer (akış)", "İsraf farkı (akış)", "Δhazine (7 gün)", "Δstok (7 gün)", "yatırım (7 gün)", "Eklenen değer (7 gün)"], bilesenSat)}`,
  );
  const regSat = onayarlar.map((o) => {
    const ad = String(o["ad"]);
    return [ad, yuzde(regret[ad] as number), yuzde(regretK[ad] as number, 0)];
  });
  parcalar.push(
    `**Regret: her sabit önayarın bölge başına en iyi önayara göre kaybı (tohum ortalaması)**\n\nRegret = (en iyi eklenen değer − önayarın eklenen değeri) / en iyi eklenen değer; bölgede hiçbir önayar anlamlı artı değer üretmediyse o bölge regret dışıdır. Birincil sütun [0, %100]'e kırpılır (pasiften kötü = tüm değer kaybı); kırpmasız sütun pasiften kötü önayarların ağırlığını gösterir.\n\n${tablo(["Önayar", "Ortalama regret (kırpılmış)", "Ortalama regret (kırpmasız)"], regSat)}`,
  );
  const gos = (x: unknown, yuzdeMi: boolean): string => {
    const o = kayit(x);
    const d = o["deger"] as number;
    const e = o["esik"] as number;
    return `${yuzdeMi ? yuzde(d) : sayi(d, 2)} (eşik ${yuzdeMi ? `>= ${yuzde(e, 0)}` : `>= ${sayi(e, 2)}`}) → ${o["saglandi"] ? "sağlandı" : "sağlanmadı"}`;
  };
  const rg = kayit(bilgi["regret"]);
  const tf = kayit(bilgi["turBasinaFarkliEnIyi"]);
  parcalar.push(
    `**Bilgi göstergeleri (verdict'e KATILMAZ; PDF eşiği bağlayıcıdır)**\n\n${tablo(
      ["Gösterge", "Değer", "Durum"],
      [
        ["Tek sabit önayarın ortalama regret'i (en iyi tek önayar: " + String(rg["onayar"]) + ")", yuzde(rg["deger"] as number), gos(bilgi["regret"], true)],
        ["Normalize entropi (en iyi önayarın bölgelere dağılımı)", sayi(kayit(bilgi["normalizeEntropi"])["deger"], 2), gos(bilgi["normalizeEntropi"], false)],
        ["Bölge türü başına farklı en iyi önayar sayısı", String(tf["deger"]), `${String(tf["deger"])} (eşik >= ${String(tf["esik"])}) → ${tf["saglandi"] ? "sağlandı" : "sağlanmadı"}`],
      ],
    )}`,
  );
  parcalar.push(
    `**Tohum başına entropi ve regret ayrıntısı**\n\n${tablo(
      ["Tohum", "Entropi (bit)", "Norm. entropi", ...adlar.map((n) => `regret ${n}`)],
      h.tohumBasina.map((x) => {
        const o = kayit(x.ozet);
        const rt = kayit(o["regretOrtalama"]);
        return [x.tohum, sayi(o["entropiBit"], 2), sayi(o["entropiNormalize"], 2), ...adlar.map((n) => yuzde(rt[n] as number, 0))];
      }),
    )}`,
  );
  if (referans) {
    const rt = h.tohumBasina.map((x) => {
      const o = kayit(x.ozet);
      return [x.tohum, tamYuzde(o["referansIlkUc"], 1), tamYuzde(o["referansSabitlerinEniyisiniGecti"], 1)];
    });
    parcalar.push(
      `**Referans: "${String(referans["ad"])}" (sıralama dışı)** — ${String(referans["aciklama"])} Sıralamaya ve verdict'e girmez; aynı anlamlılık kuralıyla sabit önayarlarla kıyaslanır.\n\n${tablo(["Tohum", "İlk üç (sabit önayarlarla birlikte sıralanırsa)", "En iyi sabit önayardan anlamlı biçimde daha iyi olduğu bölge oranı"], rt)}`,
    );
  }
  const duy = dizi(a["pencereDuyarliligi"]);
  if (duy.length > 1) {
    const sat = duy.map((d) => {
      const o = kayit(d["oranlar"]);
      return [`${d["birincil"] ? "**" : ""}${String(d["pencere"])}${d["birincil"] ? " (birincil)**" : d["baslangicGunu"] === 0 ? " (7 gün toplam)" : ""}`, String(d["enYuksek"]), yuzde(d["enYuksekOran"] as number), ...adlar.map((n) => yuzde(o[n] as number, 0))];
    });
    parcalar.push(
      `**Skor penceresi duyarlılığı (tohum ortalaması; aynı koşulların gün sonu görüntülerinden, anlamlı ilk-üç oranı)** — Depo tavanı skoru kırptığı için pencere başlangıcı sonucu etkiler: pasif referans tavana en geç ulaşır, daha erken tavana dayanan önayarlar ileri pencerelerde pasife göre geride görünür (ayrıştırma tablosundaki stok bileşenine bakın). Verdict yalnızca birincil satırdır.\n\n${tablo(["Pencere", "En yüksek önayar", "Oran", ...adlar], sat)}`,
    );
  }
  const tur = dizi(a["turTablosu"]);
  if (tur.length > 0) {
    const sat = tur.map((x) => [String(x["tur"]), String(x["aciklama"]), sayi(x["bolgeSayisi"], 1), `**${String(x["enIyi"])}**`, yuzde(x["enIyiPay"] as number, 0), yuzde(x["hicbiriPayi"] as number, 0), dagilimMetni(kayit(x["dagilim"]), adlar)]);
    parcalar.push(
      `**Bölge türüne göre en iyi önayar (tohum ortalaması)** — bölgeler gerçekten farklıysa farklı türlerin en iyisi farklı önayarlar olmalıdır. "Hiçbiri payı" = o türde hiçbir önayarın anlamlı artı değer üretmediği bölge oranı.\n\n${tablo(["Tür", "Tanım", "Bölge", "En iyi önayar", "Payı", "Hiçbiri payı", "Dağılım"], sat)}`,
    );
  }
  const bt = dizi(a["bolgeTablosuIlkTohum"]);
  if (bt.length > 0) {
    const sat = bt.map((b) => {
      const ev = kayit(b["ekDegerler"]);
      const kume = Array.isArray(b["kume"]) ? (b["kume"] as string[]) : [];
      const kurulum = kume.length > 1 ? `bölge+liman (${kume[1]})` : "bölge";
      const uc = Array.isArray(b["ilkUc"]) ? (b["ilkUc"] as string[]).join(", ") : "";
      return [b["bolge"], String(b["tur"]), kurulum, bin(b["pasifSkor"]), bin(b["esik"]), ...adlar.map((n) => bin(ev[n])), String(b["enIyi"]), uc || "—"];
    });
    parcalar.push(
      `**Bölge tablosu (ilk tohum; eklenen değer = önayar − pasif, ${pencere} akışı, bin para)** — "Odak kurulumu" her bölge için bölge mi bölge+liman mı olduğunu gösterir; "Pasif" pasif referansın akış skoru, "θ" anlamlı fark eşiğidir.\n\n${tablo(["Bölge", "Tür", "Odak kurulumu", "Pasif", "θ", ...adlar, "En iyi", "Anlamlı ilk üç"], sat)}`,
    );
  }
  return parcalar.join("\n\n");
}

function h2Ayrinti(h: HipotezSonucu): string {
  const t = h.tohumBasina.map((x) => {
    const o = kayit(x.ozet);
    const pg = Array.isArray(o["pencereGunleri"]) ? (o["pencereGunleri"] as number[]).join("-") : "—";
    return [
      x.tohum,
      `**${yuzde(o["tekrarEndeksi"] as number | null)}**`,
      pg,
      `${sayi(o["pencereCiftSayisi"], 0)} (${sayi(o["pencereTukenmeGecisSayisi"], 0)} çıkarıldı)`,
      yuzde(o["tekrarEndeksiTumDonem"] as number | null),
      yuzde(o["tekrarEndeksiSikiBolgeli"] as number | null),
      yuzde(o["tekrarEndeksiEylemGunleri"] as number | null),
      sayi(o["jaccardOrtalama"], 2),
      `${sayi(o["tukenmeGecisSayisi"], 0)}/${sayi(o["gecisSayisi"], 0)} (${yuzde(o["tukenmeOrani"] as number, 0)})`,
      sayi(o["sifirGunSayisi"], 0),
      sayi(o["ilkSifirGun"], 0),
      `${o["odakKomut"]}/${o["odakBasarisiz"]}`,
    ];
  });
  const p = [
    "**Karar ölçümü** = son 10 günlük pencere (30 günlük koşuda 21-30. günler) tekrar endeksi (RI): (g-1 → g) geçişlerinde en iyi anahtarın aynı olma oranı. " +
      "\"hicbir_sey\" → \"hicbir_sey\" geçişleri tekrar sayılmaz; ayrı **karar tükenmesi** metriğidir, RI'nin payından ve paydasından çıkarılır (sütunlarda kaç geçiş çıkarıldığı yazılıdır). " +
      "Tüm dönem (2..N. gün) RI ikincildir.",
    `${tablo(["Tohum", "RI (karar: son 10 gün)", "Pencere günleri", "Pencere payda", "RI (tüm dönem, ikincil)", "RI (bölge dahil, pencere)", "RI (yalnız eylem günleri)", "Jaccard", "Karar tükenmesi (hicbir_sey→hicbir_sey / geçiş)", "Sıfır-aday günü", "Kalıcı sıfır günü", "Odak komut/başarısız"], t)}`,
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
  const red: string[] = [];
  for (const x of h.tohumBasina) {
    for (const v of dizi(kayit(x.ozet)["varyantlar"])) {
      sat.push([
        x.tohum,
        v["varyant"],
        `${(v["saldiranlar"] as string[]).join("+")}`,
        `${v["kabulEdilenIlan"]} / ${v["reddedilenIlan"]}`,
        v["saldiranKazanma"],
        v["enCokParalelHedef"],
        `**${yuzde(v["enBuyukKayan24sDeger"] as number, 2)}**`,
        `**${yuzde(v["enBuyukKayan24sMal"] as number, 2)}** (${String(v["kayanMal"] || "—")})`,
        `${yuzde(v["enBuyukKayan24sDegerBaslangicStoku"] as number, 2)} / ${yuzde(v["enBuyukKayan24sMalBaslangicStoku"] as number, 2)}`,
        `${String(v["kayanBolge"] || "—")} @ ${sayi(v["kayanBaslangicSaat"], 2)} s`,
        yuzde(v["enBuyukTekPencereDeger"] as number, 2),
        yuzde(v["enBuyukTekPencereMal"] as number, 2),
        `${yuzde(v["kumulatifKayipBolge48s"] as number, 2)} / ${yuzde(v["kumulatifKayipToplam48s"] as number, 2)}`,
        v["saldiranBirlik"],
      ]);
      const nedenler = Object.entries(kayit(v["redNedenleri"])).sort((p, q) => (q[1] as number) - (p[1] as number));
      if (nedenler.length > 0) red.push(`- Tohum ${x.tohum}, ${String(v["varyant"])}: ${nedenler.map(([k, n]) => `${k} ×${String(n)}`).join("; ")}`);
    }
  }
  const p = [
    "**Karar ölçümü**: B'nin herhangi bir bölgesinde herhangi bir 24 saatlik kayan pencerede toplam stok kaybı / pencere içi en yüksek stok (değer ağırlıklı ve mal başına en büyük; pencere başı stoğa oran ikincil); 48 saat boyunca her saat tüm uygun (saldıran bölge → B bölgesi) çiftleri için ilan denenir (paralel ve ardışık, iki saldıran). Çekirdeğin reddettiği ilanlar normaldir ve sayılır.",
    tablo(
      ["Tohum", "Varyant", "Saldıran", "İlan kabul / red", "Saldıran galip", "Hedef başına en çok eşzamanlı savaş", "24 sa kayan: değer kaybı (maks)", "24 sa kayan: mal kaybı (maks)", "Başlangıç stokuna oranla (ikincil): değer / mal", "En kötü pencere (bölge @ başlangıç)", "Tek savaş penceresi değer (maks)", "Tek savaş penceresi mal (maks)", "48 sa kümülatif (bölge maks / B toplam)", "Saldıran birlik"],
      sat,
    ),
  ];
  if (red.length > 0) p.push(`**Reddedilen ilan denemeleri (nedene göre)**\n\n${red.join("\n")}`);
  const t0 = dizi(kayit(h.ayrinti)["pencereler"])[0];
  const v0 = t0 ? dizi(t0["varyantlar"])[0] : undefined;
  if (t0 && v0) {
    const s = dizi(v0["pencereler"]).map((w) => [w["saldiran"], w["saldiranBolge"], w["hedefBolge"], w["kazanan"], w["saldiranGuc"], w["savunanGuc"], yuzde((w["kayipOraniPpm"] as number) / 1_000_000, 2), yuzde((w["malBazliEnBuyukOranPpm"] as number) / 1_000_000, 2), String(w["enBuyukMal"] || "—")]);
    p.push(`**Savaş pencereleri (tohum ${String(t0["tohum"])}, varyant ${String(v0["varyant"])})**\n\n${tablo(["Saldıran", "Saldıran bölge", "Hedef bölge", "Kazanan", "Saldıran güç", "Savunan güç", "Değer kaybı", "Mal kaybı (maks)", "Mal"], s)}`);
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
      sat.push([
        x.tohum,
        `${String(s["saat"])} s${s["kararNoktasi"] ? "" : " (ek)"}`,
        Math.round((s["aktifPencereUretim"] as number) / 100) / 10 + "k",
        Math.round((s["unutPencereUretim"] as number) / 100) / 10 + "k",
        `**${yuzde(s["oran"] as number)}**`,
        yuzde(s["oranKumulatif"] as number),
        Math.round((s["aktifUretim"] as number) / 1000) + "k / " + Math.round((s["unutUretim"] as number) / 1000) + "k",
        Math.round(s["aktifHazine"] as number) + " / " + Math.round(s["unutHazine"] as number),
      ]);
    }
  }
  const n = h.tohumBasina.map((x) => `- Tohum ${x.tohum}: ${String(kayit(x.ozet)["neden"])} (aktif komut ${String(kayit(x.ozet)["aktifKomut"])}, kur_ve_unut komut ${String(kayit(x.ozet)["unutKomut"])})`);
  return (
    `**Karar ölçümü** (PDF: "24/48/72. saatte ÜRETİM"): her karar saatinde, o saate kadarki son ${String(kayit(h.parametreler)["pencereSaat"])} saatlik pencerede odak oyuncunun ürettiği değerin (brüt, taban fiyat) oranı = kur_ve_unut / aktif; kümülatif oran ikincildir. "(ek)" satırları bilgi amaçlıdır, karara girmez.\n\n` +
    `${tablo(["Tohum", "Nokta", "Aktif pencere üretimi", "kur_ve_unut pencere üretimi", "Oran (karar)", "Oran (kümülatif, ikincil)", "Kümülatif üretim (aktif / unut)", "Hazine (aktif / unut)"], sat)}\n\n${n.join("\n")}`
  );
}

const AYRINTI: Record<string, (h: HipotezSonucu) => string> = { H1: h1Ayrinti, H2: h2Ayrinti, H3: h3Ayrinti, H5: h5Ayrinti, H6: h6Ayrinti, H7: h7Ayrinti };

/** Markdown raporu üretir. */
export function raporUret(sonuclar: readonly HipotezSonucu[], meta: RaporMeta): string {
  const s: string[] = [];
  s.push(`# Ölçüm raporu: ${sonuclar.map((x) => x.kimlik).join(", ")} (tohum ${meta.tohumlar.join(", ")})${meta.etiket ? ` — ${meta.etiket}` : ""}`);
  s.push(`Bu rapor \`pnpm olcum\` ile üretilmiştir. Simülasyon deterministiktir: aynı tohum ve kod için sonuçlar (duvar saati hariç) birebir aynıdır.${meta.hizli ? " **Hızlı mod: boyutlar küçültülmüştür.**" : ""}`);

  s.push(`**Sürüm/etiket**: ${meta.etiket ?? "(belirtilmedi)"}${meta.tam ? " (tam boyut)" : ""}`);
  if (meta.karsilastirma) {
    s.push(`**Karşılaştırma**: önceki ölçüm \`${meta.karsilastirma.kaynak}\`${meta.karsilastirma.etiket ? ` (etiket: ${meta.karsilastirma.etiket})` : ""}. Önceki sütunlar o dosyadaki değerlerdir; ölçüm tanımı değiştiyse ölçüm adı yanında belirtilir.`);
  }

  s.push("## Özet");
  const onceki = new Map((meta.karsilastirma?.hipotezler ?? []).map((x) => [x.kimlik, x]));
  const karsi = meta.karsilastirma !== undefined;
  const degerMetni = (b: string | undefined, d: number | null | undefined): string => (d === null || d === undefined ? "—" : b === "oran" ? yuzde(d) : String(d));
  s.push(
    tablo(
      ["Hipotez", "Ölçüm", "Eşik", "Sonuç", "Koşul başarı oranı", ...(karsi ? ["Önceki ölçüm", "Önceki sonuç"] : [])],
      sonuclar.map((h) => {
        const p = onceki.get(h.kimlik);
        const farkliTanim = p?.olcum?.ad !== undefined && p.olcum.ad !== h.olcum.ad;
        return [
          `**${h.kimlik}** ${h.hipotez}`,
          `${h.olcum.ad}: ${degerMetni(h.olcum.birim, h.olcum.deger)}`,
          h.esik.aciklama,
          `**${verdictMetni(h.verdict)}**`,
          `${yuzde(h.tohumBasariOrani, 0)} (${h.tohumBasina.filter((t) => t.verdict === "gecti").length}/${h.tohumBasina.length})`,
          ...(karsi ? [p ? `${degerMetni(p.olcum?.birim, p.olcum?.deger)}${farkliTanim ? ` (önceki tanım: ${String(p.olcum?.ad)})` : ""}` : "—", p ? verdictMetni(p.verdict) : "—"] : []),
        ];
      }),
    ),
  );
  s.push("Sonuç sözlüğü: GEÇTİ = vazgeçme ölçütü tetiklenmedi (hipotez ayakta); KALDI = ölçüt tetiklendi; BELİRSİZ = tohumlar çelişiyor veya ölçüm güvenilir değil. \"Koşul başarı oranı\" = GEÇTİ diyen koşulların (tohumların) oranıdır. Her tohum bağımsız bir örnek değil, bir koşuldur: tohum = devlet sırası rotasyonu (hangi devletin odak/ilk oyuncu olduğu) + savaş rastgeleliği; bu yüzden oran bir güven aralığı değil, koşullar üzerinden sayımdır.");

  for (const h of sonuclar) {
    s.push(`## ${h.kimlik} — ${h.hipotez}`);
    s.push(`- **Ölçüm**: ${h.olcum.ad} = ${h.olcum.deger === null ? "—" : h.olcum.birim === "oran" ? yuzde(h.olcum.deger, 2) : h.olcum.deger}. ${h.olcum.aciklama}`);
    s.push(`- **Eşik**: ${h.esik.aciklama}`);
    s.push(`- **Sonuç**: ${verdictMetni(h.verdict)} (koşul başarı oranı ${yuzde(h.tohumBasariOrani, 0)})`);
    s.push(`> **Tohum notu**: ${TOHUM_NOTU}`);
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
