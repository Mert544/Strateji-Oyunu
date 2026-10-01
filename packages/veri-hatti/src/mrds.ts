/**
 * USGS MRDS (Mineral Resources Data System) okuyucusu.
 *
 * MRDS metal/endüstriyel mineral yataklarının noktasal kayıtlarını içerir; kömür ve petrol/gaz KAPSAMAZ
 * (bunlar için rezerv tablosu elle/genel bilgiyle doğrulanır ve DATA_SOURCES.md'de öyle işaretlenir).
 * Kullanım: rezerv tablosundaki cevher (Iron), bakır (Copper) ve silis (Silica) iddialarının bölge
 * başına kayıt sayısıyla desteklenip desteklenmediğini denetlemek. Doğrudan rezerv miktarı alınmaz
 * (MRDS miktar vermez; ölçek oyun tasarımıdır).
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { unzipSync } from "fflate";
import { KAYNAKLAR } from "./kaynaklar";
import { onbellekYolu, sha256 } from "./indir";
import { ONBELLEK } from "./yollar";

export interface MrdsKaydi {
  kimlik: string;
  ad: string;
  boylam: number;
  enlem: number;
  ulke: string;
  /** Oyun malına eşlenen emtia (cevher/bakir/silis) veya boş. */
  mallar: string[];
  /** MRDS emtia adları (commod1-3). */
  emtialar: string[];
  durum: string;
}

/** MRDS emtia adı -> oyun malı. Kömür ve petrol MRDS'te yoktur. */
export const EMTIA_MAL: Readonly<Record<string, string>> = {
  Iron: "cevher",
  Copper: "bakir",
  Silica: "silis",
};

/** Dilim sınır kutusu (MRDS filtresi). */
export const MRDS_KUTU = { minB: 18, maxB: 47, minE: 34, maxE: 49 };

/** RFC4180 benzeri CSV ayrıştırıcı (tırnaklı alanlar, çift tırnak kaçışı, alan içi satır sonu). */
export function csvSatirlari(metin: string, satirCagir: (alanlar: string[]) => void): void {
  let alanlar: string[] = [];
  let alan = "";
  let tirnakta = false;
  const n = metin.length;
  for (let i = 0; i < n; i++) {
    const c = metin.charCodeAt(i);
    if (tirnakta) {
      if (c === 34) {
        if (metin.charCodeAt(i + 1) === 34) {
          alan += '"';
          i++;
        } else tirnakta = false;
      } else alan += metin[i];
    } else if (c === 34) tirnakta = true;
    else if (c === 44) {
      alanlar.push(alan);
      alan = "";
    } else if (c === 10 || c === 13) {
      if (c === 13 && metin.charCodeAt(i + 1) === 10) i++;
      alanlar.push(alan);
      alan = "";
      satirCagir(alanlar);
      alanlar = [];
    } else alan += metin[i];
  }
  if (alan !== "" || alanlar.length > 0) {
    alanlar.push(alan);
    satirCagir(alanlar);
  }
}

/** mrds-csv.zip dosyasından dilim kutusundaki kayıtları okur (sonuç önbelleğe yazılır). */
export function mrdsOku(): MrdsKaydi[] {
  const k = KAYNAKLAR.find((x) => x.kimlik === "usgs_mrds");
  if (k === undefined) throw new Error("usgs_mrds kaynagi tanimli degil");
  const zip = readFileSync(onbellekYolu(k));
  const onbellek = resolve(ONBELLEK, `mrds-dilim-${sha256(zip).slice(0, 12)}.json`);
  if (existsSync(onbellek)) return JSON.parse(readFileSync(onbellek, "utf8")) as MrdsKaydi[];

  const dosyalar = unzipSync(new Uint8Array(zip), { filter: (d) => d.name === "mrds.csv" });
  const csv = dosyalar["mrds.csv"];
  if (csv === undefined) throw new Error("mrds-csv.zip icinde mrds.csv yok");
  const metin = new TextDecoder("utf-8").decode(csv);

  let basliklar: string[] | null = null;
  const kayitlar: MrdsKaydi[] = [];
  csvSatirlari(metin, (alanlar) => {
    if (basliklar === null) {
      basliklar = alanlar;
      return;
    }
    const indeks = (ad: string): number => (basliklar as string[]).indexOf(ad);
    const enlem = Number.parseFloat(alanlar[indeks("latitude")] ?? "");
    const boylam = Number.parseFloat(alanlar[indeks("longitude")] ?? "");
    if (!Number.isFinite(enlem) || !Number.isFinite(boylam)) return;
    if (boylam < MRDS_KUTU.minB || boylam > MRDS_KUTU.maxB || enlem < MRDS_KUTU.minE || enlem > MRDS_KUTU.maxE) return;
    const emtialar: string[] = [];
    for (const s of ["commod1", "commod2", "commod3"]) {
      for (const parca of (alanlar[indeks(s)] ?? "").split(",")) {
        const e = parca.trim();
        if (e !== "" && !emtialar.includes(e)) emtialar.push(e);
      }
    }
    const mallar = [...new Set(emtialar.map((e) => EMTIA_MAL[e]).filter((m): m is string => m !== undefined))];
    kayitlar.push({
      kimlik: alanlar[indeks("dep_id")] ?? "",
      ad: alanlar[indeks("site_name")] ?? "",
      boylam,
      enlem,
      ulke: alanlar[indeks("country")] ?? "",
      mallar,
      emtialar,
      durum: alanlar[indeks("dev_stat")] ?? "",
    });
  });
  kayitlar.sort((a, b) => (a.kimlik < b.kimlik ? -1 : a.kimlik > b.kimlik ? 1 : 0));
  writeFileSync(onbellek, JSON.stringify(kayitlar), "utf8");
  return kayitlar;
}
