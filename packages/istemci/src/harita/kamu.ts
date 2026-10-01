/**
 * Kamu arsası (satılmayan hücreler; docs/06 §15.6): sunucunun yayınladığı dikdörtgen bloklar (`IlceKaresi.kamu`, abone
 * `{kamu: true}`) için Türkçe adlar, açıklamalar ve ret nedeni (saf; DOM ve harita yok). Kural çekirdektedir; istemci yalnız
 * okur ve gösterir. Bağımsız (sunucusuz) kipte `SahteBaglanti` aynı biçimde küçük bir örnek küme üretir (`ornekKamu`).
 */
import type { KamuBlogu, KamuGrubuKaresi } from "@bolge/protokol";
import { satinAlinabilir } from "./hucre";
import type { Izgara } from "./hucre";

export type KamuTuru = KamuGrubuKaresi["tur"];

/** Kart ve ipucunda görünen tür adı. */
export const KAMU_TUR_ADI: Readonly<Record<KamuTuru, string>> = {
  meydan: "Meydan",
  pazar: "Pazar yeri",
  park: "Park",
  hizmet: "İlçe merkezi",
  kiyi: "Kıyı şeridi",
  sanayi_rezervi: "Sanayi rezervi",
  hazine: "Hazine arazisi",
};

/** Kartta türün kısa açıklaması (mekanik vaat etmez: kamu arsasının bugünkü tek anlamı "satılmaz"dır). */
export const KAMU_ACIKLAMA: Readonly<Record<KamuTuru, string>> = {
  meydan: "Mahallenin ortak meydanı.",
  pazar: "Mahalle pazarı için ayrılmış alan.",
  park: "Mahallenin ortak parkı.",
  hizmet: "Belediye ve kamu hizmetleri için ayrılmış alan.",
  kiyi: "Kıyı herkesindir: kıyı şeridi kamuya açık kalır.",
  sanayi_rezervi: "Sanayi için devletin elinde tutulan arazi.",
  hazine: "Devletin elinde tutulan yedek arazi.",
};

/** Kamu sahibinin görünen adı: `k:mahalle:<id>` → "Mahalle", `k:ilce:<id>` → "İlçe", `k:il:<id>` → "İl". */
export function kamuSahibiAdi(sahip: string): string {
  if (sahip.startsWith("k:mahalle:")) return "Mahalle";
  if (sahip.startsWith("k:ilce:")) return "İlçe";
  if (sahip.startsWith("k:il:")) return "İl";
  return "Kamu";
}

/** Satın alma ve yerleşim reddinin Türkçe nedeni. */
export function kamuNedeni(tur: KamuTuru): string {
  return `Kamu arsası (${KAMU_TUR_ADI[tur] ?? tur}): satışa kapalı`;
}

/** Hücre ("x:y") kamu bloklarından birinde mi? Grup döner (yoksa null). Doğrusal tarama: blok sayısı küçüktür. */
export function kamuGrubuBul(kamu: readonly KamuGrubuKaresi[] | undefined, x: number, y: number): KamuGrubuKaresi | null {
  if (!kamu) return null;
  for (const g of kamu) for (const [x0, y0, x1, y1] of g.blok) if (x >= x0 && x <= x1 && y >= y0 && y <= y1) return g;
  return null;
}

/** Blok alanları toplamı (kamu hücre sayısı). */
export function kamuAlani(kamu: readonly KamuGrubuKaresi[] | undefined): number {
  let n = 0;
  for (const g of kamu ?? []) for (const [x0, y0, x1, y1] of g.blok) n += (x1 - x0 + 1) * (y1 - y0 + 1);
  return n;
}

/**
 * Sunucusuz kip için örnek kamu kümesi (deterministik; çekirdek kuralının küçük bir taklidi): ızgara merkezine yakın ilçe
 * merkezi (2×5), çevresinde meydan (2×3), pazar yeri (2×4) ve park (3×3), merkezden uzak bir hazine adası (8×8). Her blok
 * hedefe en yakın TAMAMEN satın alınabilir ve boş dikdörtgendir (yol ve su bloğa girmez); sığmazsa atlanır.
 */
export function ornekKamu(iz: Izgara, ilce: string): KamuGrubuKaresi[] {
  const G = iz.genislik;
  const Y = iz.yukseklik;
  const dolu = new Uint8Array(G * Y);
  const cx = Math.floor(G / 2);
  const cy = Math.floor(Y / 2);
  // Hazine hedefi: merkezden en uzak satın alınabilir örnek hücre (8 hücrelik seyrek tarama), merkeze %15 çekilmiş
  let uzak: [number, number] = [Math.floor(G * 0.82), Math.floor(Y * 0.82)];
  let enUzak = -1;
  for (let y = 0; y < Y; y += 8)
    for (let x = 0; x < G; x += 8) {
      const d = (x - cx) ** 2 + (y - cy) ** 2;
      if (d > enUzak && satinAlinabilir(iz.durum[y * G + x]!)) {
        enUzak = d;
        uzak = [x, y];
      }
    }
  const hazineX = Math.round(uzak[0] + (cx - uzak[0]) * 0.15);
  const hazineY = Math.round(uzak[1] + (cy - uzak[1]) * 0.15);
  const istek: Array<{ tur: KamuTuru; sahip: string; en: number; boy: number; hx: number; hy: number }> = [
    { tur: "hizmet", sahip: `k:ilce:${ilce}`, en: 5, boy: 2, hx: cx + 4, hy: cy - 4 },
    { tur: "meydan", sahip: `k:mahalle:${ilce}_1`, en: 3, boy: 2, hx: cx + 24, hy: cy - 20 },
    { tur: "pazar", sahip: `k:mahalle:${ilce}_1`, en: 4, boy: 2, hx: cx - 26, hy: cy + 18 },
    { tur: "park", sahip: `k:mahalle:${ilce}_1`, en: 3, boy: 3, hx: cx + 20, hy: cy + 22 },
    { tur: "hazine", sahip: `k:ilce:${ilce}`, en: 8, boy: 8, hx: hazineX - 4, hy: hazineY - 4 },
  ];
  const uygun = (x: number, y: number, en: number, boy: number): boolean => {
    if (x < 0 || y < 0 || x + en > G || y + boy > Y) return false;
    for (let j = y; j < y + boy; j++) for (let i = x; i < x + en; i++) if (dolu[j * G + i] || !satinAlinabilir(iz.durum[j * G + i]!)) return false;
    return true;
  };
  const gruplar = new Map<string, KamuGrubuKaresi>();
  for (const s of istek) {
    let bulunan: [number, number] | null = null;
    // Hedeften halka halka (Chebyshev); halkada (y, x) sırası
    for (let r = 0; r <= 48 && !bulunan; r++)
      for (let dy = -r; dy <= r && !bulunan; dy++)
        for (let dx = -r; dx <= r; dx++) {
          if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
          if (uygun(s.hx + dx, s.hy + dy, s.en, s.boy)) {
            bulunan = [s.hx + dx, s.hy + dy];
            break;
          }
        }
    if (!bulunan) continue;
    const [x, y] = bulunan;
    for (let j = y; j < y + s.boy; j++) for (let i = x; i < x + s.en; i++) dolu[j * G + i] = 1;
    const blok: KamuBlogu = [iz.x0 + x, iz.y0 + y, iz.x0 + x + s.en - 1, iz.y0 + y + s.boy - 1];
    const anahtar = `${s.sahip}|${s.tur}`;
    const g = gruplar.get(anahtar);
    if (g) g.blok.push(blok);
    else gruplar.set(anahtar, { sahip: s.sahip, tur: s.tur, blok: [blok] });
  }
  return [...gruplar.values()].sort((a, b) => (a.sahip < b.sahip ? -1 : a.sahip > b.sahip ? 1 : a.tur < b.tur ? -1 : a.tur > b.tur ? 1 : 0));
}
