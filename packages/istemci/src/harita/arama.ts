/**
 * Aksan duyarsız il/ilçe araması (saf). "istanbul" -> İstanbul, "kadikoy" -> Kadıköy, "GÖLCÜK" -> Gölcük.
 * Katlama Türkçe yerel ayarla küçültür (İ -> i, I -> ı), ardından Türkçe harfleri ve kalan birleşik
 * aksanları (NFD) ASCII'ye indirger; ı -> i olduğundan "ISTANBUL" da eşleşir.
 */

const TR: Record<string, string> = { ı: "i", ğ: "g", ş: "s", ç: "c", ö: "o", ü: "u", â: "a", î: "i", û: "u", ș: "s", ț: "t", ţ: "t", ă: "a" };

/** Aramada kullanılan katlanmış biçim. */
export function katla(s: string): string {
  let k = "";
  for (const h of s.toLocaleLowerCase("tr")) k += TR[h] ?? h;
  return k
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[\s\-–'’.()]+/g, " ")
    .trim();
}

export type AramaTuru = "il" | "ilce" | "mulk";

export interface AramaKaydi {
  tur: AramaTuru;
  kimlik: string;
  ad: string;
  /** Ek açıklama (ilçe için il adı, il için bölge adı). */
  ust: string;
}

export interface AramaDizini {
  kayitlar: AramaKaydi[];
  katli: string[];
}

export function dizinKur(kayitlar: AramaKaydi[]): AramaDizini {
  return { kayitlar, katli: kayitlar.map((k) => katla(k.ad)) };
}

export interface AramaSonucu {
  il: AramaKaydi[];
  ilce: AramaKaydi[];
  mulk: AramaKaydi[];
}

/**
 * Sıralama: tam eşleşme > ad başı > kelime başı > içinde. Eşitlikte kısa ad, sonra alfabetik (tr).
 * Her grupta en çok `enCok` sonuç.
 */
export function ara(dizin: AramaDizini, sorgu: string, enCok = 6): AramaSonucu {
  const q = katla(sorgu);
  const bos: AramaSonucu = { il: [], ilce: [], mulk: [] };
  if (!q) return bos;
  const adaylar: { k: AramaKaydi; puan: number }[] = [];
  for (let i = 0; i < dizin.kayitlar.length; i++) {
    const a = dizin.katli[i]!;
    let puan: number;
    if (a === q) puan = 0;
    else if (a.startsWith(q)) puan = 1;
    else if (a.includes(" " + q)) puan = 2;
    else if (a.includes(q)) puan = 3;
    else continue;
    adaylar.push({ k: dizin.kayitlar[i]!, puan });
  }
  adaylar.sort((p, r) => p.puan - r.puan || p.k.ad.length - r.k.ad.length || p.k.ad.localeCompare(r.k.ad, "tr"));
  for (const { k } of adaylar) {
    const g = bos[k.tur];
    if (g.length < enCok) g.push(k);
  }
  return bos;
}
