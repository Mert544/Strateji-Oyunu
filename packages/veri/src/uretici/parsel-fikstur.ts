/**
 * Deterministik sentetik parsel fikstürü üreticisi (S9; docs/11 §8.3).
 *
 * Çalıştırma (veri paketinden): `pnpm --filter @bolge/veri parsel:uret`
 *   (eşdeğeri: `tsx packages/veri/src/uretici/parsel-fikstur.ts`)
 *   -> packages/veri/haritalar/parsel/{mini-6,sentetik-50}.parsel.json
 *
 * Kurallar (kurgusal; gerçek yer yok):
 * - Her bölge = 1 il ("sn_<bolge>"), il başına 2 ilçe: "<il>_merkez" ve "<il>_tasra"; ilçe başına 10×10 z20 hücre.
 * - İl bloğu 20×10 hücredir (solda merkez, sağda taşra). Bloğun sol üst köşesi bölgenin soyut (x, y) konumundan
 *   türetilir: (X0 + 24·x, Y0 + 12·y). Tamsayı (x, y) farklı olan iki bölgenin blokları asla çakışmaz (24 > 20, 12 > 10).
 * - İlçe sınıfı bölge nüfusundan: merkez ilçe ≥200 bin şehir, ≥100 bin kasaba, değilse kırsal; taşra ≥400 bin kasaba,
 *   değilse kırsal. Hücre sınıfı ilçe merkezinden halkalarla azalır (şehir çekirdeği → kasaba → kırsal), çekirdek dışı
 *   hücrelerin ~1/8'i bir sınıf aşağı iner (tohumlu). İlçe sınıfı = en yüksek hücre sınıfı (merkez 2×2 asla inmez).
 * - Başlangıç seviyesi en yüksek hücre sınıfından: kırsal 0 (Köy), kasaba 1 (Kasaba), şehir 3 (Şehir; §7.4 "şehir sınıfı
 *   hücreler" Şehir seviyesinde açılır). 2 (Merkez) yalnız büyümeyle gelir. Başlangıç değeridir, kalibre edilmedi.
 * - Uygunsuz hücreler: iki ilçeyi kesen yatay yol (satır 3..6); şehir/kasaba merkez ilçesinde ayrıca dikey yol;
 *   kıyı bölgelerinde taşranın dış sütunu deniz (+ girintili ikinci sütun); dağ bölgelerinde taşrada dere (dikey su);
 *   diğerlerinde yarı olasılıkla 2×2 gölet. Yol suyun üstüne yazılır (köprü/dolgu).
 *
 * Rastgelelik yalnız kendi tohumlu tamsayı PRNG'sinden (mulberry32) gelir; il başına tohum = tohum XOR fnv1a32(bölge kimliği),
 * böylece haritaya bölge eklemek diğer illerin hücrelerini değiştirmez. Math.random ve kayan nokta yok. Aynı tohum ->
 * bayt bayt aynı çıktı.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { hucreIdOlustur } from "../parsel";
import type { ArsaSinifi, HucreEngeli, IlceSeviyesi, ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi, ParselIlTanimi } from "../parsel";
import type { BolgeTanimi, HaritaDosyasi } from "../tipler";

export const PARSEL_VARSAYILAN_TOHUM = 20261001;
/** İlçe kenarı (hücre). */
export const ILCE_KENAR = 10;
/** Sentetik dünyanın z20 başlangıç köşesi (kurgusal; ~40°K bandına yakın bir karo aralığı). */
export const PARSEL_X0 = 600_000;
export const PARSEL_Y0 = 380_000;
/** Bölge soyut koordinatı (0..1000) başına hücre ölçeği. */
export const PARSEL_X_OLCEK = 24;
export const PARSEL_Y_OLCEK = 12;

/** Üretilen fikstürler: harita dosyası adı -> çıktı adı. */
export const PARSEL_FIKSTURLERI: readonly string[] = ["mini-6", "sentetik-50"];

// ---------------------------------------------------------------------------
// Tamsayı PRNG ve kimlik karması
// ---------------------------------------------------------------------------

class Prng {
  private durum: number;
  constructor(tohum: number) {
    this.durum = tohum >>> 0;
  }
  /** [0, 2^32) tamsayı (mulberry32). */
  sonraki(): number {
    this.durum = (this.durum + 0x6d2b79f5) >>> 0;
    let t = this.durum;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return (t ^ (t >>> 14)) >>> 0;
  }
  /** [min, maks] tamsayı (iki uç dahil). */
  aralik(min: number, maks: number): number {
    return min + (this.sonraki() % (maks - min + 1));
  }
  /** 1/n olasılıkla true. */
  birBolu(n: number): boolean {
    return this.sonraki() % n === 0;
  }
}

/** FNV-1a 32 bit (UTF-16 kod birimleri üzerinden; kimlikler ASCII). */
export function fnv1a32(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

// ---------------------------------------------------------------------------
// Sınıf ve seviye kuralları
// ---------------------------------------------------------------------------

const SINIF_SIRASI: readonly ArsaSinifi[] = ["kirsal", "kasaba", "sehir"];
const SEVIYE: Record<ArsaSinifi, IlceSeviyesi> = { kirsal: 0, kasaba: 1, sehir: 3 };

export function merkezIlceSinifi(nufus: number): ArsaSinifi {
  return nufus >= 200_000 ? "sehir" : nufus >= 100_000 ? "kasaba" : "kirsal";
}

export function tasraIlceSinifi(nufus: number): ArsaSinifi {
  return nufus >= 400_000 ? "kasaba" : "kirsal";
}

/** Yerel (i, j) için halka: ilçe merkezinden Chebyshev uzaklığı, 0 (merkez 2×2) .. 4 (kenar). */
function halka(i: number, j: number): number {
  return Math.max(Math.abs(2 * i - 9), Math.abs(2 * j - 9)) >> 1;
}

/** Halkaya göre temel sınıf: şehir ilçesi 0-1 şehir, 2-3 kasaba, 4 kırsal; kasaba ilçesi 0-1 kasaba; kırsal hep kırsal. */
function temelSinif(ilceSinifi: ArsaSinifi, r: number): ArsaSinifi {
  if (ilceSinifi === "sehir") return r <= 1 ? "sehir" : r <= 3 ? "kasaba" : "kirsal";
  if (ilceSinifi === "kasaba") return r <= 1 ? "kasaba" : "kirsal";
  return "kirsal";
}

function birAsagi(s: ArsaSinifi): ArsaSinifi {
  return SINIF_SIRASI[Math.max(0, SINIF_SIRASI.indexOf(s) - 1)] as ArsaSinifi;
}

// ---------------------------------------------------------------------------
// Üretim
// ---------------------------------------------------------------------------

type Izgara<T> = T[][]; // [j][i]

function izgara<T>(deger: T): Izgara<T> {
  return Array.from({ length: ILCE_KENAR }, () => Array.from({ length: ILCE_KENAR }, () => deger));
}

/** Bir ilin iki ilçesinin hücre sınıfları ve engelleri (tohumlu). */
function ilUret(b: BolgeTanimi, tohum: number): { sinif: [Izgara<ArsaSinifi>, Izgara<ArsaSinifi>]; engel: [Izgara<HucreEngeli | null>, Izgara<HucreEngeli | null>]; ilceSinifi: [ArsaSinifi, ArsaSinifi] } {
  const rng = new Prng((tohum ^ fnv1a32(b.id)) >>> 0);
  const ilceSinifi: [ArsaSinifi, ArsaSinifi] = [merkezIlceSinifi(b.nufus), tasraIlceSinifi(b.nufus)];
  const sinif: [Izgara<ArsaSinifi>, Izgara<ArsaSinifi>] = [izgara<ArsaSinifi>("kirsal"), izgara<ArsaSinifi>("kirsal")];
  for (let k = 0; k < 2; k++) {
    for (let j = 0; j < ILCE_KENAR; j++) {
      for (let i = 0; i < ILCE_KENAR; i++) {
        const r = halka(i, j);
        const t = temelSinif(ilceSinifi[k] as ArsaSinifi, r);
        // Çekirdek (r = 0) asla inmez: ilçe sınıfı = en yüksek hücre sınıfı garantisi.
        (sinif[k] as Izgara<ArsaSinifi>)[j]![i] = r > 0 && rng.birBolu(8) ? birAsagi(t) : t;
      }
    }
  }

  const engel: [Izgara<HucreEngeli | null>, Izgara<HucreEngeli | null>] = [izgara<HucreEngeli | null>(null), izgara<HucreEngeli | null>(null)];
  const merkez = engel[0];
  const tasra = engel[1];
  // Su: kıyı -> taşranın dış sütunu deniz (+ girinti); dağ -> taşrada dere; diğer -> yarı olasılıkla 2×2 gölet (taşra).
  if (b.etiketler.includes("kiyi")) {
    for (let j = 0; j < ILCE_KENAR; j++) {
      tasra[j]![ILCE_KENAR - 1] = "su";
      if (rng.birBolu(3)) tasra[j]![ILCE_KENAR - 2] = "su";
    }
  } else if (b.etiketler.includes("dag")) {
    const s = rng.aralik(2, 7);
    for (let j = 0; j < ILCE_KENAR; j++) tasra[j]![s] = "su";
  } else if (rng.birBolu(2)) {
    const gi = rng.aralik(1, 7);
    const gj = rng.aralik(1, 7);
    for (let j = gj; j < gj + 2; j++) for (let i = gi; i < gi + 2; i++) tasra[j]![i] = "su";
  }
  // Yol: iki ilçeyi kesen yatay yol; şehir/kasaba merkezinde dikey yol. Yol suyun üstüne yazılır.
  const yolSatiri = rng.aralik(3, 6);
  for (let i = 0; i < ILCE_KENAR; i++) {
    merkez[yolSatiri]![i] = "yol";
    tasra[yolSatiri]![i] = "yol";
  }
  if (ilceSinifi[0] !== "kirsal") {
    const yolSutunu = rng.aralik(3, 6);
    for (let j = 0; j < ILCE_KENAR; j++) merkez[j]![yolSutunu] = "yol";
  }
  return { sinif, engel, ilceSinifi };
}

export interface ParselUretimSecenekleri {
  /** Kaynak harita adı (çıktıya yazılır), ör. "mini-6". */
  haritaAdi: string;
  tohum?: number;
}

/** Bölge haritasından sentetik parsel fikstürü üretir (saf; dosya sistemi yok). İl ve ilçe sırası harita sırasıdır. */
export function uretParselFiksturu(harita: HaritaDosyasi, secenek: ParselUretimSecenekleri): ParselFiksturu {
  const tohum = (secenek.tohum ?? PARSEL_VARSAYILAN_TOHUM) >>> 0;
  const iller: ParselIlTanimi[] = [];
  const ilceler: ParselIlceTanimi[] = [];
  for (const b of harita.bolgeler) {
    const il = `sn_${b.id}`;
    iller.push({ id: il, ad: b.ad, bolge: b.id });
    const u = ilUret(b, tohum);
    const x0 = PARSEL_X0 + PARSEL_X_OLCEK * b.x;
    const y0 = PARSEL_Y0 + PARSEL_Y_OLCEK * b.y;
    const adlar: Array<[string, string]> = [
      ["merkez", `${b.ad} Merkez`],
      ["tasra", `${b.ad} Taşra`],
    ];
    adlar.forEach(([ek, ad], k) => {
      const hucreler: ParselHucreTanimi[] = [];
      let uygun = 0;
      for (let j = 0; j < ILCE_KENAR; j++) {
        for (let i = 0; i < ILCE_KENAR; i++) {
          const e = u.engel[k]![j]![i] as HucreEngeli | null;
          const h: ParselHucreTanimi = { id: hucreIdOlustur(x0 + k * ILCE_KENAR + i, y0 + j), sinif: u.sinif[k]![j]![i] as ArsaSinifi, uygun: e === null };
          if (e !== null) h.engel = e;
          else uygun++;
          hucreler.push(h);
        }
      }
      const sinif = u.ilceSinifi[k] as ArsaSinifi;
      ilceler.push({ id: `${il}_${ek}`, ad, il, bolge: b.id, sinif, seviye: SEVIYE[sinif], hucreSayisi: hucreler.length, uygunHucre: uygun, hucreler });
    });
  }
  return { surum: 1, ad: `${harita.ad} — sentetik parsel fikstürü`, harita: secenek.haritaAdi, tohum, zoom: 20, iller, ilceler };
}

/**
 * Kanonik JSON metni: üst düzey ve il/ilçe başlıkları girintili, her hücre tek satırda (fark incelemesi ve boyut için).
 * Alan sırası sabittir; sonda satır sonu.
 */
export function parselFiksturuJson(f: ParselFiksturu): string {
  const j = (x: unknown): string => JSON.stringify(x);
  const s: string[] = [];
  s.push("{");
  s.push(`  "surum": ${j(f.surum)},`);
  s.push(`  "ad": ${j(f.ad)},`);
  s.push(`  "harita": ${j(f.harita)},`);
  s.push(`  "tohum": ${j(f.tohum)},`);
  s.push(`  "zoom": ${j(f.zoom)},`);
  s.push('  "iller": [');
  f.iller.forEach((il, n) => s.push(`    ${j({ id: il.id, ad: il.ad, bolge: il.bolge })}${n < f.iller.length - 1 ? "," : ""}`));
  s.push("  ],");
  s.push('  "ilceler": [');
  f.ilceler.forEach((c, n) => {
    s.push("    {");
    s.push(`      "id": ${j(c.id)}, "ad": ${j(c.ad)}, "il": ${j(c.il)}, "bolge": ${j(c.bolge)},`);
    s.push(`      "sinif": ${j(c.sinif)}, "seviye": ${j(c.seviye)}, "hucreSayisi": ${j(c.hucreSayisi)}, "uygunHucre": ${j(c.uygunHucre)},`);
    s.push('      "hucreler": [');
    c.hucreler.forEach((h, m) => {
      const kayit: Record<string, unknown> = { id: h.id, sinif: h.sinif, uygun: h.uygun };
      if (h.engel !== undefined) kayit["engel"] = h.engel;
      s.push(`        ${j(kayit)}${m < c.hucreler.length - 1 ? "," : ""}`);
    });
    s.push("      ]");
    s.push(`    }${n < f.ilceler.length - 1 ? "," : ""}`);
  });
  s.push("  ]");
  s.push("}");
  return `${s.join("\n")}\n`;
}

const BURASI = dirname(fileURLToPath(import.meta.url));
/** Bölge haritalarının klasörü (packages/veri/haritalar). */
export const HARITA_KLASORU = resolve(BURASI, "../../haritalar");
/** Parsel fikstürlerinin klasörü (packages/veri/haritalar/parsel). */
export const PARSEL_KLASORU = resolve(HARITA_KLASORU, "parsel");

/** Harita adının parsel fikstürü yolu. */
export function parselCiktiYolu(haritaAdi: string): string {
  return resolve(PARSEL_KLASORU, `${haritaAdi}.parsel.json`);
}

/** Harita dosyasını okuyup fikstür metnini üretir (Node). */
export function parselFiksturuMetni(haritaAdi: string, tohum: number = PARSEL_VARSAYILAN_TOHUM): string {
  const harita = JSON.parse(readFileSync(resolve(HARITA_KLASORU, `${haritaAdi}.json`), "utf8")) as HaritaDosyasi;
  return parselFiksturuJson(uretParselFiksturu(harita, { haritaAdi, tohum }));
}

// Doğrudan çalıştırılırsa (tsx packages/veri/src/uretici/parsel-fikstur.ts) fikstürleri yazar.
if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  mkdirSync(PARSEL_KLASORU, { recursive: true });
  for (const ad of PARSEL_FIKSTURLERI) {
    const yol = parselCiktiYolu(ad);
    writeFileSync(yol, parselFiksturuMetni(ad), "utf8");
    console.log(`Yazildi: ${yol}`);
  }
}
