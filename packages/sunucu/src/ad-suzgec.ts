/**
 * Ortak yasaklı ad süzgeci (docs/arastirma/p4-p5-sartname.md §7.7 madde 4, 4a): oyuncunun GÖRÜNEN ADI ve (G7'de) MARKA ADI aynı süzgeçten geçer; günlüğe/profile
 * yazılmadan ÖNCE sunucuda uygulanır. Çekirdekte YOKTUR (liste moderasyonla güncellenir; replay güvenliği için çekirdeğe girmez).
 *
 * Liste: `packages/veri/icerik/yasakli-adlar.json` (T3; yol PARAMETRE: `yasakliAdSuzgeciYukle({ yol })`). Biçim:
 *   { "yasakliKelimeler": ["bim", "a101", ...], "yasakliIcerik": ["migros", "carrefour", ...] }
 * - `yasakliKelimeler`: katlanmış KELİME eşitliği (ad ayırıcılardan kelimelere bölünür; kısa adlar: "bim", "sok"). Bitişik kelimelerin birleşimi de sayılır
 *   ("b.i.m" ya da "a-101" ayırıcıyla gizlenemez); başka kelimenin PARÇASI sayılmaz ("bimbo", "sokak" yasaklı değildir).
 * - `yasakliIcerik`: katlanmış, ayırıcısız adın ALT DİZGİSİ (uzun adlar >= 5 karakter: "migros").
 * Katlama (yerel ayar YOK, sabit tablo): A-Z -> a-z; İ I ı i -> i; Ç ç -> c; Ğ ğ -> g; Ö ö -> o; Ş ş -> s; Ü ü -> u; ayırıcılar (boşluk . ' - &) kaldırılır
 * (kelime karşılaştırmasında ayırıcı kelime sınırıdır). Büyük/küçük harf ve aksan duyarsızdır.
 *
 * Dosya yoksa ya da biçimi bozuksa: ÜRETİMDE açılış durur (`yasakliAdSuzgeciYukle({ uretim: true })` fırlatır); geliştirmede UYARI verilir ve BOŞ listeyle
 * devam edilir (süzgeç hiçbir adı reddetmez). Liste içeriği istemci paketine, günlüğe, metriğe ve hata iletilerine ASLA girmez (yalnız adet).
 */
import { readFileSync } from "node:fs";

/** Hizmetin gördüğü süzgeç arayüzü. */
export interface AdSuzgeci {
  /** Ad (kanonik ya da ham) yasaklı listede mi (katlanmış karşılaştırma). */
  yasakliMi(ad: string): boolean;
}

/** Katlama tablosu (sabit; yerel ayar ve toLowerCase/toLocaleLowerCase YOK). Tabloda olmayan karakter olduğu gibi geçer. */
const KATLA: Readonly<Record<string, string>> = {
  A: "a", B: "b", C: "c", D: "d", E: "e", F: "f", G: "g", H: "h", I: "i", J: "j", K: "k", L: "l", M: "m", N: "n", O: "o", P: "p", Q: "q", R: "r", S: "s", T: "t",
  U: "u", V: "v", W: "w", X: "x", Y: "y", Z: "z",
  "İ": "i", "ı": "i", "Ç": "c", "ç": "c", "Ğ": "g", "ğ": "g", "Ö": "o", "ö": "o", "Ş": "s", "ş": "s", "Ü": "u", "ü": "u",
};
const AYIRICI = new Set([" ", ".", "'", "-", "&"]);

/** Bir kelimeyi katlar (ayırıcı içermemeli; içeriyorsa kaldırır). */
export function adKatla(s: string): string {
  let c = "";
  for (let i = 0; i < s.length; i++) {
    const h = s.charAt(i);
    if (AYIRICI.has(h)) continue;
    c += KATLA[h] ?? h;
  }
  return c;
}

/** Adı ayırıcılardan kelimelere böler ve her kelimeyi katlar. */
function kelimeler(ad: string): string[] {
  const k: string[] = [];
  let simdiki = "";
  for (let i = 0; i < ad.length; i++) {
    const h = ad.charAt(i);
    if (AYIRICI.has(h)) {
      if (simdiki !== "") k.push(simdiki);
      simdiki = "";
    } else simdiki += KATLA[h] ?? h;
  }
  if (simdiki !== "") k.push(simdiki);
  return k;
}

export class YasakliAdSuzgeci implements AdSuzgeci {
  private readonly kelime: ReadonlySet<string>;
  private readonly icerik: readonly string[];

  constructor(yasakliKelimeler: readonly string[], yasakliIcerik: readonly string[]) {
    this.kelime = new Set(yasakliKelimeler.map(adKatla).filter((x) => x !== ""));
    this.icerik = [...new Set(yasakliIcerik.map(adKatla).filter((x) => x !== ""))];
  }

  /** Listelerin adetleri (içerik DEĞİL; açılış günlüğü için). */
  get adet(): { kelime: number; icerik: number } {
    return { kelime: this.kelime.size, icerik: this.icerik.length };
  }

  yasakliMi(ad: string): boolean {
    const ks = kelimeler(ad);
    // Kelime eşitliği: her kelime VE bitişik kelime dizilerinin birleşimi ("b.i.m", "a-101", "a 101" yasaklı "bim"/"a101" kelimesini ayırıcıyla gizleyemez).
    for (let i = 0; i < ks.length; i++) {
      let birlesim = "";
      for (let j = i; j < ks.length; j++) {
        birlesim += ks[j] as string;
        if (this.kelime.has(birlesim)) return true;
      }
    }
    const bitisik = ks.join("");
    for (const x of this.icerik) if (bitisik.includes(x)) return true;
    return false;
  }
}

export interface YasakliAdSuzgeciSecenekleri {
  /** Liste dosyası (varsayılan `packages/veri/icerik/yasakli-adlar.json`). */
  yol?: string;
  /** Üretim: dosya yok/bozuksa açılış durur. Değilse uyarı ve boş liste. */
  uretim?: boolean;
}

export const VARSAYILAN_YASAKLI_AD_DOSYASI = new URL("../../veri/icerik/yasakli-adlar.json", import.meta.url);

/** Süzgeç ve (geliştirmede dosya yok/bozuksa) uyarı iletisi. Üretimde hata fırlatır. İleti liste içeriği taşımaz. */
export function yasakliAdSuzgeciYukle(s: YasakliAdSuzgeciSecenekleri = {}): { suzgec: YasakliAdSuzgeci; uyari: string | null } {
  const yol = s.yol ?? VARSAYILAN_YASAKLI_AD_DOSYASI;
  const goster = typeof yol === "string" ? yol : yol.pathname;
  let hata: string | null = null;
  let liste: { yasakliKelimeler: string[]; yasakliIcerik: string[] } | null = null;
  try {
    const ham = JSON.parse(readFileSync(yol, "utf8")) as { yasakliKelimeler?: unknown; yasakliIcerik?: unknown };
    const dizge = (x: unknown): x is string[] => Array.isArray(x) && x.every((e) => typeof e === "string");
    if (!dizge(ham.yasakliKelimeler) || !dizge(ham.yasakliIcerik)) hata = "bicim gecersiz ({ yasakliKelimeler: string[], yasakliIcerik: string[] } bekleniyordu)";
    else liste = { yasakliKelimeler: ham.yasakliKelimeler, yasakliIcerik: ham.yasakliIcerik };
  } catch (e) {
    hata = (e as NodeJS.ErrnoException).code === "ENOENT" ? "dosya yok" : e instanceof SyntaxError ? "gecerli JSON degil" : `okunamadi (${(e as NodeJS.ErrnoException).code ?? "hata"})`;
  }
  if (liste !== null) return { suzgec: new YasakliAdSuzgeci(liste.yasakliKelimeler, liste.yasakliIcerik), uyari: null };
  const mesaj = `yasakli ad listesi ${hata}: ${goster}`;
  if (s.uretim === true) throw new Error(`${mesaj} (uretimde acilis durur; gecerli bir liste verin: --yasakli-adlar)`);
  return { suzgec: new YasakliAdSuzgeci([], []), uyari: `${mesaj}; BOS listeyle devam ediliyor (yasakli ad suzgeci hicbir adi reddetmez)` };
}
