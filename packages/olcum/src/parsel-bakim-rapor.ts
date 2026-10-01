/**
 * Bakım ve aşınma özet raporu (`--bakim-ozet`): `--bakim-olc` ile üretilmiş parsel JSON'larından ham karşılaştırma tabloları.
 * YORUM YOKTUR: yalnız sayı (medyan, p10–p90, ortalama) ve yöntem notu. Duvar saati içermez: aynı girdiyle bayt bayt aynı üretilir.
 * Gruplar: yerleşik çiftçi, sanayici, tüccar (onayar) ve geç katılanlar (açılışa göre); medyanlar tohumlar ve oyuncular üzerinden havuzlanır.
 */
import { MILI } from "@bolge/cekirdek";
import { miniVeriyiYukle } from "@bolge/veri";
import { olguKarsilastirmasi, parselOzetle, tl, verdictAd, yuzde } from "./parsel-rapor";
import type { ParselTohumSonucu } from "./parsel-kosu";
import type { BakimDonemi, ParselBakimOlcumu } from "./parsel-bakim";

export interface BakimOzetKosusu {
  dosya: string;
  json: {
    etiket?: string;
    tarimYonetimi?: boolean;
    bakimYonetimi?: boolean;
    onarimYonetimi?: boolean;
    paramAyar?: Record<string, number>;
    tohumlar?: number[];
    gun?: number;
    gecGun?: number;
    olcumGunu?: number;
    agir?: boolean;
    harita?: string;
    kip?: string;
    duzen?: { yerlesik: Record<string, number>; gec: string[] };
    tohumBasina: Array<ParselTohumSonucu & { bakim?: ParselBakimOlcumu }>;
  };
}

function tablo(baslik: readonly string[], satirlar: readonly (readonly string[])[]): string {
  const s = [`| ${baslik.join(" | ")} |`, `|${baslik.map(() => "---").join("|")}|`];
  for (const r of satirlar) s.push(`| ${r.join(" | ")} |`);
  return s.join("\n");
}

/** En yakın sıra yüzdeliği (0..100) tamsayı dizisinden; boşsa null. */
export function yuzdelik(xs: readonly number[], p: number): number | null {
  if (xs.length === 0) return null;
  const s = [...xs].sort((a, b) => a - b);
  const i = Math.min(s.length - 1, Math.max(0, Math.ceil((p / 100) * s.length) - 1));
  return s[i] as number;
}

const medyan = (xs: readonly number[]): number | null => yuzdelik(xs, 50);

const GRUPLAR = ["ciftci", "sanayici", "tuccar", "gec"] as const;
type Grup = (typeof GRUPLAR)[number];
const GRUP_AD: Record<Grup, string> = { ciftci: "yerleşik çiftçi", sanayici: "yerleşik sanayici", tuccar: "yerleşik tüccar", gec: "geç katılan (üçü)" };

function grubu(o: { onayar: string }): Grup | null {
  if (o.onayar === "ciftci" || o.onayar === "sanayici" || o.onayar === "tuccar") return o.onayar;
  if (o.onayar === "gec_katilan") return "gec";
  return null;
}

function ad(k: BakimOzetKosusu): string {
  return k.json.etiket ?? k.dosya;
}

function yonetimAd(k: BakimOzetKosusu): string {
  const ayar = k.json.paramAyar !== undefined && Object.keys(k.json.paramAyar).length > 0 ? ` · ayar ${Object.entries(k.json.paramAyar).map(([y, d]) => `${y.replace(/^sanayi\.bakim\./, "")}=${d}`).join(",")}` : "";
  return `tarım ${k.json.tarimYonetimi === true ? "AÇIK" : "kapalı"} · bakım ${k.json.bakimYonetimi === true ? "AÇIK" : k.json.onarimYonetimi === true ? "yalnız onarım" : "kapalı"}${ayar}`;
}

/** Havuzlanmış oyuncu kayıtları: [grup, oyuncu özeti, bakım izi] (tohumlar üzerinden). */
function oyuncular(k: BakimOzetKosusu): Array<{ grup: Grup; tohum: number; ozet: ParselTohumSonucu["oyuncular"][number]; bakim: ParselBakimOlcumu["oyuncular"][number] }> {
  const s: Array<{ grup: Grup; tohum: number; ozet: ParselTohumSonucu["oyuncular"][number]; bakim: ParselBakimOlcumu["oyuncular"][number] }> = [];
  for (const t of k.json.tohumBasina) {
    if (t.bakim === undefined) continue;
    const ozetler = new Map(t.oyuncular.map((o) => [o.id, o] as const));
    for (const b of t.bakim.oyuncular) {
      const g = grubu(b);
      const o = ozetler.get(b.id);
      if (g === null || o === undefined) continue;
      s.push({ grup: g, tohum: t.tohum, ozet: o, bakim: b });
    }
  }
  return s;
}

const yuzdeHucre = (ppm: number | null): string => (ppm === null ? "—" : yuzde(ppm));
const ondalik = (x: number | null, hane = 1): string => (x === null ? "—" : (Math.round(x * 10 ** hane) / 10 ** hane).toFixed(hane).replace(".", ","));
const medP = (xs: readonly number[], f: (x: number) => string): string => {
  const m = medyan(xs);
  if (m === null) return "—";
  return `${f(m)} (${f(yuzdelik(xs, 10) as number)}–${f(yuzdelik(xs, 90) as number)})`;
};
/** mili-birim/saat veya mili-birim -> birim, 2 ondalık. */
const birim = (mili: number): string => ondalik(mili / MILI, 2);

export function bakimOzetiUret(kosular: readonly BakimOzetKosusu[], meta: { etiket?: string; bulgular: string }): string {
  const k: string[] = [];
  k.push(`# Parsel ölçümü — bakım ve aşınma özeti (${meta.etiket ?? "bakim-ozet"})`);
  k.push("");
  k.push("`--bakim-olc` ile üretilmiş koşulardan ham tablolar. **Yorum yoktur**; kalibrasyon yorumu Ar-Ge'nindir (A2). Medyanlar ve yüzdelikler tohumlar ve oyuncular üzerinden havuzlanır; \"med (p10–p90)\" biçimindedir. Yöntem ve sınırlar [bakim-asinma-temel.md](bakim-asinma-temel.md) içindedir.");
  k.push("");
  k.push(`**Bulgular ve yorum (elle yazılmış):** [${meta.bulgular}](${meta.bulgular})`);
  k.push("");

  // 1. Koşular
  k.push("## 1. Koşular");
  k.push("");
  k.push(
    tablo(
      ["Etiket", "Dosya", "Yönetim", "Tohumlar", "Süre (gün)", "Geç katılım günü", "Düzen (yerleşik · geç)"],
      kosular.map((c) => [ad(c), c.dosya, yonetimAd(c), (c.json.tohumlar ?? []).join(", "), String(c.json.gun ?? "—"), String(c.json.gecGun ?? "—"), `${Object.entries(c.json.duzen?.yerlesik ?? {}).filter(([, v]) => v > 0).map(([a, v]) => `${a}=${v}`).join(", ")} · ${(c.json.duzen?.gec ?? []).join(", ")}`]),
    ),
  );
  k.push("");

  // 2. Y7 gelir/emsal
  k.push("## 2. Y7: gelir / emsal (geç katılanın son 7 gün net üretim geliri / üreten ilçe emsallerinin medyanı)");
  k.push("");
  k.push("Oran = tohumlar üzerinden ortalama (Y7'nin ham oranı; parsel-rapor §5a ile aynı yöntem). Gelir ve emsal sütunları tohumlar üzerinden ortalamadır (ölçülebilen olgular).");
  k.push("");
  const acilislar = ["ciftci", "sanayici", "pazar"];
  k.push(
    tablo(
      ["Koşu", "Yönetim", "Y7 oyuncu payı", "Y7 kararı", ...acilislar.map((a) => `Gelir/emsal ${a}`)],
      kosular.map((c) => {
        const oz = parselOzetle(c.json.tohumBasina);
        const o = olguKarsilastirmasi(c.json.tohumBasina);
        return [ad(c), yonetimAd(c), yuzdeHucre(oz.h6.y7PayiPpm), verdictAd(oz.h6.y7Verdict), ...acilislar.map((a) => yuzdeHucre(o[a]?.gelirOranPpm ?? null))];
      }),
    ),
  );
  k.push("");
  k.push("Geç katılanın geliri ve kullanılan emsal medyanı (7 gün, ₺; tohum ortalaması):");
  k.push("");
  {
    const satir: string[][] = [];
    for (const c of kosular) {
      for (const a of acilislar) {
        const g: number[] = [];
        const e: number[] = [];
        for (const t of c.json.tohumBasina) {
          for (const o of t.h6.olgular) {
            if ((o.acilis ?? o.gec) !== a) continue;
            const em = o.emsalDuzeyi === "il" ? o.ilEmsalGelirMedyan : o.emsalGelirMedyan;
            if (em === null || em <= 0) continue;
            g.push(o.gelir);
            e.push(em);
          }
        }
        satir.push([ad(c), a, String(g.length), g.length === 0 ? "—" : tl(Math.floor(g.reduce((x, y) => x + y, 0) / g.length)), e.length === 0 ? "—" : tl(Math.floor(e.reduce((x, y) => x + y, 0) / e.length))]);
      }
    }
    k.push(tablo(["Koşu", "Geç açılış", "Ölçülebilen olgu", "Geç katılan geliri (ort.)", "Emsal geliri medyanı (ort.)"], satir));
  }
  k.push("");
  k.push("Yerleşik oyuncuların son 7 gün net üretim geliri (₺; yerleşik oyuncu başına, tohumlar üzerinden havuzlanmış medyan ve p10–p90):");
  k.push("");
  k.push(
    tablo(
      ["Koşu", "Yönetim", ...GRUPLAR.map((g) => GRUP_AD[g]), "Havuzdaki oyuncu (çiftçi/sanayici/tüccar)"],
      kosular.map((c) => {
        const o = oyuncular(c);
        const sayi = (g: Grup): number => o.filter((x) => x.grup === g).length;
        return [ad(c), yonetimAd(c), ...GRUPLAR.map((g) => medP(o.filter((x) => x.grup === g).map((x) => x.ozet.gelir7Gun), tl)), `${sayi("ciftci")}/${sayi("sanayici")}/${sayi("tuccar")}`];
      }),
    ),
  );
  k.push("");

  // 3. Aşınma yörüngesi
  k.push("## 3. Aşınma yörüngesi (tesis düzeyi, havuzlanmış)");
  k.push("");
  k.push("Hücre: tesislerin aşınma yüzdesi, medyan (p10–p90). Kaynak: ölçüm anlarında tesis başına `asinmaPpm`. Geç katılan tesisleri katılımdan önce yoktur (— ya da az örnek). Satır başına \"n\" ilgili günde havuzlanan tesis sayısıdır.");
  k.push("");
  for (const c of kosular) {
    const o = oyuncular(c);
    const gunler = [...new Set(o.flatMap((x) => x.bakim.anlar.map((a) => a.gun)))].sort((a, b) => a - b);
    k.push(`### ${ad(c)} (${yonetimAd(c)})`);
    k.push("");
    const satir: string[][] = [];
    for (const g of GRUPLAR) {
      const ayni = o.filter((x) => x.grup === g);
      satir.push([
        GRUP_AD[g],
        ...gunler.map((gun) => {
          const v = ayni.flatMap((x) => x.bakim.anlar.filter((a) => a.gun === gun).flatMap((a) => a.tesisler.map((t) => t[1])));
          return v.length === 0 ? "—" : `${medP(v, yuzde)} n=${v.length}`;
        }),
      ]);
    }
    k.push(tablo(["Grup", ...gunler.map((x) => `${x}. gün`)], satir));
    k.push("");
    k.push("Bakım parçası karşılanma (`bakimKarsilanmaPpm`), düğüm düzeyi, medyan (p10–p90):");
    k.push("");
    const satir2: string[][] = [];
    for (const g of GRUPLAR) {
      const ayni = o.filter((x) => x.grup === g);
      satir2.push([GRUP_AD[g], ...gunler.map((gun) => {
        const v = ayni.flatMap((x) => x.bakim.anlar.filter((a) => a.gun === gun).flatMap((a) => a.karsilanma));
        return v.length === 0 ? "—" : medP(v, yuzde);
      })]);
    }
    k.push(tablo(["Grup", ...gunler.map((x) => `${x}. gün`)], satir2));
    k.push("");
    // Eşikler
    k.push("Aşınmanın %50 ve %100'e vardığı gün (tesisin ilk görüldüğü andan itibaren geçen gün; medyan (p10–p90)) ve ölçüm anına kadar varan tesis payı:");
    k.push("");
    const satir3: string[][] = [];
    for (const g of GRUPLAR) {
      const tesisler = k_esikler(c, g);
      const g50 = tesisler.filter((e) => e.saat50 !== null).map((e) => Math.round((((e.saat50 as number) - e.dogus) / 24) * 10) / 10);
      const g100 = tesisler.filter((e) => e.saat100 !== null).map((e) => Math.round((((e.saat100 as number) - e.dogus) / 24) * 10) / 10);
      const m50 = tesisler.filter((e) => e.saat50 !== null).map((e) => Math.round(((e.saat50 as number) / 24) * 10) / 10);
      const m100 = tesisler.filter((e) => e.saat100 !== null).map((e) => Math.round(((e.saat100 as number) / 24) * 10) / 10);
      const f = (x: number): string => ondalik(x, 1);
      satir3.push([
        GRUP_AD[g],
        String(tesisler.length),
        tesisler.length === 0 ? "—" : yuzde(Math.floor((g50.length * 1_000_000) / tesisler.length)),
        medP(g50, f),
        medP(m50, f),
        tesisler.length === 0 ? "—" : yuzde(Math.floor((g100.length * 1_000_000) / tesisler.length)),
        medP(g100, f),
        medP(m100, f),
      ]);
    }
    k.push(tablo(["Grup", "Tesis (n)", "%50'ye varan", "%50 gün (kurulumdan)", "%50 gün (mutlak sim günü)", "%100'e varan", "%100 gün (kurulumdan)", "%100 gün (mutlak)"], satir3));
    k.push("");
    // Tesis türü, son ölçüm anı
    const son = gunler[gunler.length - 1];
    if (son !== undefined) {
      const turAdlari = c.json.tohumBasina.find((t) => t.bakim !== undefined)?.bakim?.turAdlari ?? [];
      k.push(`Yerleşik tesis türüne göre ${son}. günde (ölçüm anı) aşınma ve verim (\`verimPpm\`: son çözümdeki girdi yeterliliği), medyan (p10–p90):`);
      k.push("");
      const satir4: string[][] = [];
      for (const g of ["ciftci", "sanayici", "tuccar"] as const) {
        const ayni = o.filter((x) => x.grup === g);
        const byTur = new Map<number, Array<[number, number, number, number]>>();
        for (const x of ayni) for (const a of x.bakim.anlar.filter((a) => a.gun === son)) for (const t of a.tesisler) byTur.set(t[0], [...(byTur.get(t[0]) ?? []), t]);
        for (const tur of [...byTur.keys()].sort((a, b) => a - b)) {
          const l = byTur.get(tur) as Array<[number, number, number, number]>;
          satir4.push([GRUP_AD[g], turAdlari[tur] ?? String(tur), String(l.length), medP(l.map((t) => t[1]), yuzde), medP(l.map((t) => t[2]), yuzde), medP(l.map((t) => t[3]), yuzde)]);
        }
      }
      k.push(tablo(["Grup", "Tesis türü", "n", "Aşınma", "Verim", "İşçi"], satir4));
      k.push("");
    }
  }

  // 4. Gelir kalemleri
  k.push("## 4. Son 7 günlük gelir kalemleri, aşınma kaybı ve bakım harcaması (yerleşik ve geç oyuncu başına, havuzlanmış medyan)");
  k.push("");
  k.push("Kalemler çekirdeğin para defterindeki saatlik akışların (`paraAkisi`) saatlik örneklemeyle toplamıdır (mili-₺ → ₺). **Net üretim geliri** koşucunun Y7 ölçüsüdür (hazine farkı + sermaye harcaması). **Hesaplanan net** = ihracat + nüfus − ithalat − işletme − vergi − genel onarım parası; **uzlaşma farkı** = net üretim geliri − hesaplanan net (örnekleme, komutla alınan ek giderler, hazine kelepçesi). **Aşınma kaybı TAHMİNDİR** (yöntem notuna bakın). Genel onarım malzemesi hazineden değil düğüm stoğundan çıkar (taban fiyatla değer, ayrı sütun; net gelire girmez). Medyanlar sütun sütun alınır: sütunlar birbirinin toplamı olmak zorunda değildir.");
  k.push("");
  for (const c of kosular) {
    const o = oyuncular(c);
    k.push(`### ${ad(c)} (${yonetimAd(c)})`);
    k.push("");
    const kalemler: Array<[string, (d: BakimDonemi, gelir: number) => number | null, (x: number) => string]> = [
      ["Net üretim geliri (Y7)", (_d, g) => g, tl],
      ["Brüt çıktı değeri (ihracat + nüfus)", (d) => d.akis.ihracat + d.akis.nufus, tl],
      ["Aşınma kaybı (TAHMİN)", (d) => d.akis.asinmaKaybiTahmin, tl],
      ["İşletme gideri", (d) => d.akis.isletme, tl],
      ["İthalat (tüm mal)", (d) => d.akis.ithalat, tl],
      ["· bunun bakım parçası payı", (d) => d.akis.parcaIthalat, tl],
      ["Genel onarım: para", (d) => d.onarim.para, tl],
      ["Genel onarım: malzeme (stok değeri)", (d) => d.onarim.mal, tl],
      ["Genel onarım: sayı (7 gün)", (d) => d.onarim.sayi, (x) => String(x)],
      ["Genel onarım duruşu (tesis-saat payı)", (d) => (d.tesisSaat === 0 ? null : Math.floor((d.durusTesisSaat * 1_000_000) / d.tesisSaat)), yuzde],
      ["Arazi vergisi", (d) => d.akis.vergi, tl],
      ["Hesaplanan net", (d) => d.akis.ihracat + d.akis.nufus - d.akis.ithalat - d.akis.isletme - d.akis.vergi - d.onarim.para, tl],
      ["Uzlaşma farkı", (d, g) => g - (d.akis.ihracat + d.akis.nufus - d.akis.ithalat - d.akis.isletme - d.akis.vergi - d.onarim.para), tl],
      ["Ortalama aşınma (pencere)", (d) => d.asinmaOrtPpm, yuzde],
      ["Aşınmanın verim cezası (pencere)", (d) => d.uretimKaybiPpm, yuzde],
      ["Bakım karşılanma (pencere)", (d) => d.bakimKarsilanmaPpm, yuzde],
    ];
    const satirlar: string[][] = [];
    for (const [ad2, f, bicim] of kalemler) {
      satirlar.push([ad2, ...GRUPLAR.map((g) => {
        const v = o.filter((x) => x.grup === g).map((x) => f(x.bakim.pencere, x.ozet.gelir7Gun)).filter((x): x is number => x !== null);
        return medP(v, bicim);
      })]);
    }
    k.push(tablo(["Kalem (7 gün)", ...GRUPLAR.map((g) => GRUP_AD[g])], satirlar));
    k.push("");
    k.push("Katılımdan ölçüm anına TOPLAM bakım harcaması (oyuncu başına medyan):");
    k.push("");
    const toplamKalem: Array<[string, (d: BakimDonemi) => number, (x: number) => string]> = [
      ["Bakım parçası ithalatı (nakit)", (d) => d.akis.parcaIthalat, tl],
      ["Genel onarım: para", (d) => d.onarim.para, tl],
      ["Genel onarım: malzeme (stok değeri)", (d) => d.onarim.mal, tl],
      ["Genel onarım sayısı", (d) => d.onarim.sayi, (x) => String(x)],
      ["Genel onarım reddi (yetersiz kaynak vb.)", (d) => d.onarim.red, (x) => String(x)],
      ["Onarım duruşu (tesis-saat)", (d) => d.durusTesisSaat, (x) => String(x)],
      ["Brüt çıktı değeri (ihracat + nüfus)", (d) => d.akis.ihracat + d.akis.nufus, tl],
      ["Aşınma kaybı (TAHMİN)", (d) => d.akis.asinmaKaybiTahmin, tl],
      ["Ortalama aşınma", (d) => d.asinmaOrtPpm ?? 0, yuzde],
      ["Aşınmanın verim cezası", (d) => d.uretimKaybiPpm ?? 0, yuzde],
    ];
    k.push(tablo(["Kalem (toplam)", ...GRUPLAR.map((g) => GRUP_AD[g])], toplamKalem.map(([ad2, f, bicim]) => [ad2, ...GRUPLAR.map((g) => medP(o.filter((x) => x.grup === g).map((x) => f(x.bakim.toplam)), bicim))])));
    k.push("");
  }

  // 5. Parça piyasası
  k.push("## 5. Bakım parçası piyasası (1–30. gün; günün saatlik ortalamaları, tohumlar üzerinden medyan)");
  k.push("");
  k.push("İstenen: botların parça ithalat emri toplamı (parça/saat). Gerçekleşen: pazarın emirlere verdiği. NPC arzı: pazarın bu saatteki parça arz limiti (oyuncu sayısına göre ölçeklenmiş). Oyuncu talebi: pazarın kaydettiği saatlik talep. Fiyat/taban: parça referans fiyatının taban fiyata oranı.");
  k.push("");
  for (const c of kosular) {
    const gunlerHepsi = [...new Set(c.json.tohumBasina.flatMap((t) => (t.bakim?.parcaPiyasasi ?? []).map((x) => x.gun)))].filter((g) => g >= 5 && g <= 30).sort((a, b) => a - b);
    const oranNpc = (x: { istenen: number; npcArz: number }): number => (x.npcArz === 0 ? 0 : Math.floor((x.istenen * 1_000_000) / x.npcArz));
    const satir: string[][] = [];
    const tum: Record<string, number[]> = { istenen: [], gerceklesen: [], npc: [], talep: [], fiyat: [], oran: [] };
    for (const g of gunlerHepsi) {
      const l = c.json.tohumBasina.flatMap((t) => (t.bakim?.parcaPiyasasi ?? []).filter((x) => x.gun === g));
      satir.push([`${g}`, medP(l.map((x) => x.istenen), birim), medP(l.map((x) => x.gerceklesen), birim), medP(l.map((x) => x.oyuncuTalebi), birim), medP(l.map((x) => x.npcArz), birim), medP(l.map(oranNpc), yuzde), medP(l.map((x) => x.fiyatTabanPpm), yuzde)]);
    }
    let istenenGun = 0;
    let toplamGun = 0;
    for (const t of c.json.tohumBasina) {
      for (const x of (t.bakim?.parcaPiyasasi ?? []).filter((x) => x.gun >= 5 && x.gun <= 30)) {
        tum.istenen!.push(x.istenen);
        tum.gerceklesen!.push(x.gerceklesen);
        tum.npc!.push(x.npcArz);
        tum.talep!.push(x.oyuncuTalebi);
        tum.fiyat!.push(x.fiyatTabanPpm);
        tum.oran!.push(oranNpc(x));
        toplamGun++;
        if (x.istenen > 0) istenenGun++;
      }
    }
    const ort = (xs: readonly number[]): number => (xs.length === 0 ? 0 : Math.floor(xs.reduce((t, x) => t + x, 0) / xs.length));
    k.push(`### ${ad(c)} (${yonetimAd(c)})`);
    k.push("");
    if (istenenGun === 0) k.push("Bu koşuda 5–30. günlerde hiçbir bot parça ithalat emri vermedi; günlük satırlar yazılmadı.\n");
    k.push(`5–30. günler, tohum × gün havuzu (${toplamGun} gün-örneği): parça ithalat emri olan gün payı ${toplamGun === 0 ? "—" : yuzde(Math.floor((istenenGun * 1_000_000) / toplamGun))}; ortalamalar (parça/saat): istenen ${birim(ort(tum.istenen!))}, gerçekleşen ${birim(ort(tum.gerceklesen!))}, oyuncu talebi ${birim(ort(tum.talep!))}, NPC arzı ${birim(ort(tum.npc!))}; en yüksek günlük istenen ${birim(Math.max(0, ...tum.istenen!))}, en yüksek günlük gerçekleşen ${birim(Math.max(0, ...tum.gerceklesen!))}.`);
    k.push("");
    k.push(tablo(["Gün", "İstenen (parça/sa)", "Gerçekleşen (parça/sa)", "Oyuncu talebi (parça/sa)", "NPC arzı (parça/sa)", "İstenen / NPC arzı", "Fiyat / taban"], [...(istenenGun > 0 ? satir : []), ["5–30 tümü (medyan)", medP(tum.istenen!, birim), medP(tum.gerceklesen!, birim), medP(tum.talep!, birim), medP(tum.npc!, birim), medP(tum.oran!, yuzde), medP(tum.fiyat!, yuzde)]]));
    k.push("");
  }

  // 6. Parça stoğu
  k.push("## 6. Parça stoğu (başlangıç kiti ve ilk 15 gün; düğümlerdeki toplam, oyuncu başına medyan)");
  k.push("");
  for (const c of kosular) {
    const o = oyuncular(c);
    const kit = c.json.tohumBasina.find((t) => t.bakim !== undefined)?.bakim?.kitParca ?? 0;
    k.push(`### ${ad(c)} (${yonetimAd(c)}) — başlangıç kitindeki parça: ${birim(kit)}`);
    k.push("");
    const gunler = [1, 2, 3, 4, 5, 7, 10, 15];
    k.push(
      tablo(
        ["Grup", ...gunler.map((x) => `${x}. gün sonu`), "Stoğu 1 parçanın altına inen oyuncu (gün medyanı)"],
        GRUPLAR.map((g) => {
          const ayni = o.filter((x) => x.grup === g && x.bakim.katilmaGun === 0);
          const sifirGun = ayni.map((x) => x.bakim.parcaStokSerisi.find((s) => s.stok < 1000)?.gun ?? null);
          const sifirlayan = sifirGun.filter((x): x is number => x !== null);
          return [GRUP_AD[g], ...gunler.map((gun) => (ayni.length === 0 ? "—" : medP(ayni.map((x) => x.bakim.parcaStokSerisi.find((s) => s.gun === gun)?.stok ?? 0), birim))), ayni.length === 0 ? "—" : `${sifirlayan.length}/${ayni.length} (${sifirlayan.length === 0 ? "—" : ondalik(medyan(sifirlayan), 1)})`];
        }),
      ),
    );
    k.push("");
  }
  k.push("Notlar: saat başına bir örnek; \"gün N sonu\" = N × 24. saat. \"Stoğu 1 parçanın altına inen\": serideki ilk gün sonu ölçümünde parça stoğu 1 parçadan az olan oyuncu sayısı / yalnız gün 0'da katılanlar.");

  // 7. Parça ithalatı zamanlaması
  const ithalatli = kosular.filter((c) => oyuncular(c).some((x) => x.bakim.toplam.akis.parcaIthalat > 0 && x.grup !== "gec"));
  if (ithalatli.length > 0) {
    k.push("## 7. Bakım parçası ithalatının zamanlaması (gün düzeyi; yalnız gün 0'da katılan yerleşik oyuncular)");
    k.push("");
    k.push("İthalat günü = o gün saatlik örneklerde parça ithalatı nakit bedeli > 0 olan gün. Dönem payları toplam ithalatın gün 1–30, 31–60 ve 61–son gün paylarıdır. \"Haftalık ort. / Y7 net\" = (toplam parça ithalatı / (gün sayısı / 7)) ÷ son 7 günlük net üretim geliri (Y7 ölçüsü parça giderini görmeyen pencerede ne kadar sapma olduğunu verir: son 7 günlük gerçek ithalat ayrı satırdadır).");
    k.push("");
    for (const c of ithalatli) {
      const o = oyuncular(c).filter((x) => x.grup !== "gec" && x.bakim.katilmaGun === 0 && x.bakim.gunluk.length > 0);
      k.push(`### ${ad(c)} (${yonetimAd(c)})`);
      k.push("");
      const satir: string[][] = [];
      for (const g of ["ciftci", "sanayici", "tuccar"] as const) {
        const ayni = o.filter((x) => x.grup === g);
        const gun = (x: (typeof ayni)[number]): number[] => x.bakim.gunluk.map((d, i) => (d[0] > 0 ? i + 1 : 0)).filter((d) => d > 0);
        const toplam = (x: (typeof ayni)[number]): number => x.bakim.gunluk.reduce((t, d) => t + d[0], 0);
        const pay = (x: (typeof ayni)[number], a2: number, b2: number): number => {
          const t = toplam(x);
          return t === 0 ? 0 : Math.floor((x.bakim.gunluk.slice(a2 - 1, b2).reduce((u, d) => u + d[0], 0) * 1_000_000) / t);
        };
        const aralik = ayni.flatMap((x) => {
          const gl = gun(x);
          return gl.slice(1).map((d, i) => d - (gl[i] as number));
        });
        const hafta = (x: (typeof ayni)[number]): number => Math.floor(toplam(x) / (x.bakim.gunluk.length / 7));
        const oran = (x: (typeof ayni)[number]): number => (x.ozet.gelir7Gun <= 0 ? 0 : Math.floor((hafta(x) * 1_000_000) / x.ozet.gelir7Gun));
        satir.push([
          GRUP_AD[g],
          String(ayni.length),
          medP(ayni.map((x) => gun(x).length), (v) => String(v)),
          medP(ayni.map((x) => gun(x)[0] ?? 0), (v) => String(v)),
          medP(ayni.map((x) => gun(x).at(-1) ?? 0), (v) => String(v)),
          medP(ayni.map((x) => pay(x, 1, 30)), yuzde),
          medP(ayni.map((x) => pay(x, 31, 60)), yuzde),
          medP(ayni.map((x) => pay(x, 61, x.bakim.gunluk.length)), yuzde),
          medP(aralik, (v) => String(v)),
          medP(ayni.map(toplam), tl),
          medP(ayni.map((x) => x.bakim.pencere.akis.parcaIthalat), tl),
          medP(ayni.map(hafta), tl),
          medP(ayni.map(oran), yuzde),
        ]);
      }
      k.push(tablo(["Grup", "Oyuncu", "İthalat günü sayısı", "İlk ithalat günü", "Son ithalat günü", "Pay gün 1–30", "Pay gün 31–60", "Pay gün 61–son", "İthalat günleri arası (gün)", "Toplam ithalat", "Son 7 gün ithalatı", "Haftalık ortalama ithalat", "Haftalık ort. / Y7 net"], satir));
      k.push("");
      // Örnek: tohum 1'in ilk oyuncusu, ithalat olan günler
      const orn: string[] = [];
      for (const g of ["ciftci", "sanayici", "tuccar"] as const) {
        const x = o.find((y) => y.grup === g && y.tohum === (o[0]?.tohum ?? 1));
        if (x === undefined) continue;
        const l = x.bakim.gunluk.map((d, i) => (d[0] > 0 ? `g${i + 1}: ${tl(d[0])}` : "")).filter((t) => t !== "");
        orn.push(`**${GRUP_AD[g]} (örnek oyuncu, ilk tohum)** — ${l.length} ithalat günü: ${l.join("; ") || "yok"}.`);
      }
      k.push(...orn.map((t) => `- ${t}`));
      k.push("");
    }
  }

  // 8. Tesis türü başına başabaş (mevcut içerikten)
  {
    const turAdlari = new Set<string>();
    for (const c of kosular) for (const t of c.json.tohumBasina) for (const tur of t.bakim?.turAdlari ?? []) turAdlari.add(tur);
    const kullanilan = new Set<string>();
    for (const c of kosular) for (const t of c.json.tohumBasina) for (const b of t.bakim?.oyuncular ?? []) for (const an of b.anlar) for (const ts of an.tesisler) kullanilan.add((t.bakim?.turAdlari ?? [])[ts[0]] ?? "");
    const veri = miniVeriyiYukle();
    const fiyat = new Map(veri.icerik.mallar.map((m) => [m.id, m.tabanFiyat] as const));
    const yontem = new Map(veri.icerik.yontemler.map((y) => [y.id, y] as const));
    const parcaFiyat = fiyat.get("parca") ?? 0;
    const ilkKosu = kosular[0];
    const ayar = ilkKosu?.json.paramAyar ?? {};
    const tavan = ayar["sanayi.bakim.asinmaVerimKaybiTavaniPpm"] ?? veri.param.sanayi?.bakim.asinmaVerimKaybiTavaniPpm ?? 0;
    const deger = (kayit: Record<string, number>): number => Object.entries(kayit).reduce((t, [m, q]) => t + Math.floor((q * (fiyat.get(m) ?? 0)) / MILI), 0);
    k.push("## 8. Tesis türü başına bakım başabaşı (içerik tablosundan; tam verim ve tam kadro, taban fiyat)");
    k.push("");
    k.push(`Eşik: T = aşınmanın verim kaybı tavanı = ${yuzde(tavan)}; (1 − T) / T = ${ondalik(tavan === 0 ? 0 : (1_000_000 - tavan) / tavan, 3)}, 1 / T = ${ondalik(tavan === 0 ? 0 : 1_000_000 / tavan, 3)}. **R** = katma değer (çıktı − girdi değeri) / bakım parçası maliyeti (parça/sa × parça taban fiyatı ${tl(parcaFiyat)}); "R ≥ (1−T)/T": bakımsız çıktı baz alındığında bakım kazandırır (A2 tanımı); "R ≥ 1/T": bakımlı çıktı baz alındığında. Değerler ₺/saat ve taban fiyatlıdır (pazar fiyatı ve ithalat çarpanı hariç); girdisi ya da çıktısı pazarda taban fiyatı olmayan mal 0 sayılır. Doğrudan değerdir: santralin elektriği tesislerin girdisidir, dolaylı değeri (zincir) burada yoktur.`);
    k.push("");
    const satir: string[][] = [];
    for (const tur of [...turAdlari].sort()) {
      if (!kullanilan.has(tur)) continue;
      const td = veri.icerik.tesisTurleri.find((x) => x.id === tur);
      const y = td === undefined ? undefined : yontem.get(td.yontemler[0] as string);
      if (y === undefined) continue;
      const parca = Object.entries(y.bakim).reduce((t, [m, q]) => t + (m === "parca" ? q : 0), 0);
      const parcaMal = deger({ parca: parca });
      const cikti = deger(y.ciktilar);
      const girdi = deger(y.girdiler);
      const katma = cikti - girdi;
      const r = parcaMal === 0 ? null : katma / parcaMal;
      satir.push([tur, y.id, birim(parca), tl(parcaMal), tl(cikti), tl(girdi), tl(katma), r === null ? "—" : ondalik(r, 2), r === null || tavan === 0 ? "—" : r >= (1_000_000 - tavan) / tavan ? "evet" : "HAYIR", r === null || tavan === 0 ? "—" : r >= 1_000_000 / tavan ? "evet" : "HAYIR"]);
    }
    k.push(tablo(["Tesis türü", "İlk yöntem", "Bakım parçası (parça/sa)", "Parça maliyeti (₺/sa)", "Çıktı değeri (₺/sa)", "Girdi değeri (₺/sa)", "Katma değer (₺/sa)", "R", "R ≥ (1−T)/T", "R ≥ 1/T"], satir));
    k.push("");
    // Ölçülen verim (bakımsız koşuların son ölçüm anı) — yönetimsiz koşu varsa
    const yonetimsiz = kosular.find((c) => c.json.bakimYonetimi !== true && c.json.onarimYonetimi !== true);
    if (yonetimsiz !== undefined) {
      const o = oyuncular(yonetimsiz).filter((x) => x.grup !== "gec");
      const son = Math.max(0, ...o.flatMap((x) => x.bakim.anlar.map((a) => a.gun)));
      const turAd = yonetimsiz.json.tohumBasina.find((t) => t.bakim !== undefined)?.bakim?.turAdlari ?? [];
      const satir2: string[][] = [];
      for (const tur of [...turAdlari].sort()) {
        const v = o.flatMap((x) => x.bakim.anlar.filter((a) => a.gun === son).flatMap((a) => a.tesisler.filter((t) => turAd[t[0]] === tur).map((t) => t[2])));
        if (v.length > 0) satir2.push([tur, String(v.length), medP(v, yuzde)]);
      }
      k.push(`Yönetimsiz koşuda (${ad(yonetimsiz)}) ${son}. günde ölçülen verim (\`verimPpm\`, yerleşik oyuncular, medyan (p10–p90)):`);
      k.push("");
      k.push(tablo(["Tesis türü", "n", "Verim"], satir2));
      k.push("");
    }
  }
  k.push("");
  return k.join("\n");
}

function k_esikler(c: BakimOzetKosusu, g: Grup): Array<{ saat50: number | null; saat100: number | null; dogus: number }> {
  const s: Array<{ saat50: number | null; saat100: number | null; dogus: number }> = [];
  for (const t of c.json.tohumBasina) {
    if (t.bakim === undefined) continue;
    const grup = new Map(t.bakim.oyuncular.map((o) => [o.id, grubu(o)] as const));
    for (const e of t.bakim.esikler) if (grup.get(e.oyuncu) === g) s.push(e);
  }
  return s;
}


/**
 * Duyarlılık ızgarası özeti (`--bakim-izgara`): her (kıtlık aşınması, ceza tavanı) ayarı için bakımsız (yönetim kapalı) ve bakımlı (bakım AÇIK) koşu çiftinin
 * yerleşik gelirleri (çiftçi, sanayici, tüccar AYRI satır), bakımlı/bakımsız oranı, Y7 oyuncu payı ve geç katılan gelir/emsal oranı. Yorum yoktur.
 * Girdi: `--bakim-olc` açık olması gerekmez (yalnız oyuncu özetleri ve H6 olguları okunur). Ayar anahtarları `sanayi.bakim.*` JSON `paramAyar`ından okunur;
 * ayarı olmayan koşu "varsayılan" sayılır.
 */
export function bakimIzgarasiUret(kosular: readonly BakimOzetKosusu[], meta: { etiket?: string; bulgular: string }): string {
  const k: string[] = [];
  k.push(`# Parsel ölçümü — bakım duyarlılık ızgarası (${meta.etiket ?? "bakim-izgara"})`);
  k.push("");
  k.push("Her satır bir (kıtlık aşınması `kitlikAsinmaPpmGun`, ceza tavanı `asinmaVerimKaybiTavaniPpm`) ayarıdır; bakımsız = yönetim kapalı, bakımlı = bakım yönetimi AÇIK; hücreler \"bakımsız / bakımlı / oran\" biçimindedir. Gelir = yerleşik oyuncunun son 7 gün net üretim geliri, oyuncu başına medyan (tohumlar ve oyuncular üzerinden havuzlanmış). **Yorum yoktur**; kalibrasyon yorumu Ar-Ge'nindir.");
  k.push("");
  k.push(`**Bulgular ve yorum (elle yazılmış):** [${meta.bulgular}](${meta.bulgular})`);
  k.push("");
  const anahtar = (c: BakimOzetKosusu): string => `${c.json.paramAyar?.["sanayi.bakim.kitlikAsinmaPpmGun"] ?? "vars"}|${c.json.paramAyar?.["sanayi.bakim.asinmaVerimKaybiTavaniPpm"] ?? "vars"}`;
  const gruplar = new Map<string, { bakimsiz?: BakimOzetKosusu; bakimli?: BakimOzetKosusu }>();
  for (const c of kosular) {
    const e = gruplar.get(anahtar(c)) ?? {};
    if (c.json.bakimYonetimi === true) e.bakimli = c;
    else e.bakimsiz = c;
    gruplar.set(anahtar(c), e);
  }
  const sirali = [...gruplar.entries()].sort((a, b) => {
    const [ak, at] = a[0].split("|").map((x) => (x === "vars" ? -1 : Number(x)));
    const [bk, bt] = b[0].split("|").map((x) => (x === "vars" ? -1 : Number(x)));
    return (ak as number) - (bk as number) || (at as number) - (bt as number);
  });
  const gelirMed = (c: BakimOzetKosusu | undefined, g: Grup): number | null => {
    if (c === undefined) return null;
    return medyan(oyuncular(c).filter((x) => x.grup === g).map((x) => x.ozet.gelir7Gun));
  };
  const oranG = (a: number | null, b: number | null): string => (a === null || b === null || a <= 0 ? "—" : yuzde(Math.floor((b * 1_000_000) / a)));
  k.push("## 1. Yerleşik oyuncu geliri (7 gün, ₺): bakımsız / bakımlı / bakımlı÷bakımsız");
  k.push("");
  const satir1: string[][] = [];
  for (const [ky, e] of sirali) {
    const [kit, tav] = ky.split("|");
    const hucre = (g: Grup): string => {
      const a = gelirMed(e.bakimsiz, g);
      const b = gelirMed(e.bakimli, g);
      return `${a === null ? "—" : tl(a)} / ${b === null ? "—" : tl(b)} / ${oranG(a, b)}`;
    };
    satir1.push([kit === "vars" ? "varsayılan" : String(kit), tav === "vars" ? "varsayılan" : String(tav), hucre("ciftci"), hucre("sanayici"), hucre("tuccar")]);
  }
  k.push(tablo(["Kıtlık aşınması (ppm/gün)", "Ceza tavanı (ppm)", "Çiftçi", "Sanayici", "Tüccar"], satir1));
  k.push("");
  k.push("## 2. Y7 ve geç katılan gelir/emsal (tohum ortalaması): bakımsız / bakımlı");
  k.push("");
  const satir2: string[][] = [];
  for (const [ky, e] of sirali) {
    const [kit, tav] = ky.split("|");
    const y = (c: BakimOzetKosusu | undefined): string => (c === undefined ? "—" : yuzdeHucre(parselOzetle(c.json.tohumBasina).h6.y7PayiPpm));
    const og = (c: BakimOzetKosusu | undefined, a: string): string => (c === undefined ? "—" : yuzdeHucre(olguKarsilastirmasi(c.json.tohumBasina)[a]?.gelirOranPpm ?? null));
    satir2.push([kit === "vars" ? "varsayılan" : String(kit), tav === "vars" ? "varsayılan" : String(tav), `${y(e.bakimsiz)} / ${y(e.bakimli)}`, ...["ciftci", "sanayici", "pazar"].map((a) => `${og(e.bakimsiz, a)} / ${og(e.bakimli, a)}`)]);
  }
  k.push(tablo(["Kıtlık aşınması", "Ceza tavanı", "Y7 oyuncu payı", "Geç çiftçi/emsal", "Geç sanayici/emsal", "Geç pazar/emsal"], satir2));
  k.push("");
  k.push("Koşular: " + kosular.map((c) => `${ad(c)} (${yonetimAd(c)}; tohum ${(c.json.tohumlar ?? []).join(",")})`).join("; ") + ".");
  k.push("");
  return k.join("\n");
}
