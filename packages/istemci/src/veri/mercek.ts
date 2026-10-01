/**
 * Mercekler (harita görünümleri; saf): aynı anda tek mercek etkindir. Varsayılan "Genel" sakin bir görünümdür:
 * oyuncunun bölgeleri doygun devlet renginde, diğerleri soluk; akış/çizgi yoktur. Diğer mercekler istek üzerine
 * bir katmanı öne çıkarır (Tarım, Sanayi, Pazar, Sahiplik) ya da seçili malın tedarik durumunu boyar ("mal").
 */
import type { Dizin, Kare } from "./kare-tipleri";
import { bolgeRenkleriniHesapla, karistir, kullanimRengi } from "./renkler";
import type { BolgeRenkTamponu, Palet, RGB } from "./renkler";

export type Mercek = "genel" | "tarim" | "sanayi" | "pazar" | "sahiplik" | "mal";

export interface MercekTanimi {
  id: Exclude<Mercek, "mal">;
  ad: string;
  aciklama: string;
  /** Klavye kısayolu (1-5). */
  tus: string;
}

/** "Görünüm" menüsündeki sabit mercekler (sıra = kısayol). Mal seçici ayrıca listelenir. */
export const MERCEKLER: readonly MercekTanimi[] = [
  { id: "genel", ad: "Genel", aciklama: "Sakin görünüm: sizin bölgeleriniz renkli, diğerleri soluk", tus: "1" },
  { id: "tarim", ad: "Tarım", aciklama: "Toprak verimliliği ve ekim deseni", tus: "2" },
  { id: "sanayi", ad: "Sanayi", aciklama: "Çalışan sanayi tesisleri (verimle ağırlıklı)", tus: "3" },
  { id: "pazar", ad: "Pazar", aciklama: "Bölge stoklarının piyasa değeri", tus: "4" },
  { id: "sahiplik", ad: "Sahiplik", aciklama: "Tüm devletler tam renkte", tus: "5" },
];

export function mercekAdi(m: Mercek, d: Dizin | null, mal: number): string {
  if (m === "mal") return d?.mallar[mal]?.ad ?? "Mal";
  return MERCEKLER.find((x) => x.id === m)?.ad ?? "Genel";
}

/** "Genel" merceğinde başkasının bölgesinin nötre doğru soldurulma payı (izleme kipinde daha az). */
export const SOLUK_PAY = 0.74;
export const IZLE_SOLUK_PAY = 0.5;

function yaz(cikti: BolgeRenkTamponu, i: number, r: RGB, desen = 0): void {
  cikti.renk[3 * i] = r[0];
  cikti.renk[3 * i + 1] = r[1];
  cikti.renk[3 * i + 2] = r[2];
  cikti.desen[i] = desen;
  cikti.glif[i] = -1;
}

/**
 * "Genel": sahiplik renkleri, ama yalnız oyuncunun (`ben` >= 0) bölgeleri doygun; diğerleri nötre soldurulur.
 * İzleme kipinde (`ben` < 0) tüm devletler hafifçe soluk (ayırt edilebilir) kalır.
 */
export function genelRenkleri(kare: Kare | null, dizin: Dizin, ben: number, palet: Palet, cikti: BolgeRenkTamponu): void {
  bolgeRenkleriniHesapla(kare, dizin, -1, palet, cikti);
  const pay = ben >= 0 ? SOLUK_PAY : IZLE_SOLUK_PAY;
  for (let i = 0; i < dizin.bolgeler.length; i++) {
    const sahip = kare?.bolgeler[i]?.sahip ?? -2;
    if (ben >= 0 && sahip === ben) continue;
    const r: RGB = [cikti.renk[3 * i] as number, cikti.renk[3 * i + 1] as number, cikti.renk[3 * i + 2] as number];
    yaz(cikti, i, karistir(r, palet.notr, sahip < 0 ? 0.6 : pay));
  }
}

/** Bölgenin sanayi puanı: tarım dışı ve çalışan tesislerin verim toplamı (verim %100 = 1). */
export function sanayiPuani(kare: Kare, dizin: Dizin, i: number): number {
  const bk = kare.bolgeler[i];
  if (!bk) return 0;
  let p = 0;
  for (const x of bk.tesis) if (x[2] && dizin.tesisTurleri[x[0]]?.tarim !== true) p += x[3] / 100;
  return p;
}

/** Bölge stoklarının piyasa değeri (para): Σ stok × taban fiyat × (fiyat / taban). */
export function pazarDegeri(kare: Kare, dizin: Dizin, i: number): number {
  const bk = kare.bolgeler[i];
  if (!bk) return 0;
  let v = 0;
  bk.stok.forEach((q, m) => {
    v += q * (dizin.mallar[m]?.taban ?? 0) * ((kare.fiyat[m] ?? 1000) / 1000);
  });
  return v;
}

/** Sıralı mercek (sanayi/pazar): değer 0 ise nötr, aksi hâlde log ölçekli rampa; sahipsiz bölge soluk. */
function siraliRenkler(kare: Kare | null, dizin: Dizin, deger: (i: number) => number, rampa: readonly RGB[], palet: Palet, cikti: BolgeRenkTamponu): void {
  const nb = dizin.bolgeler.length;
  const v = Array.from({ length: nb }, (_, i) => (kare ? Math.max(0, deger(i)) : 0));
  const mx = Math.max(0, ...v);
  for (let i = 0; i < nb; i++) {
    const sahip = kare?.bolgeler[i]?.sahip ?? -1;
    const x = v[i] as number;
    if (sahip < 0 || x <= 0 || mx <= 0) yaz(cikti, i, sahip < 0 ? karistir(palet.sahipsiz, palet.notr, 0.6) : palet.notr);
    else yaz(cikti, i, kullanimRengi(Math.log1p(x) / Math.log1p(mx), rampa));
  }
}

export function sanayiRenkleri(kare: Kare | null, dizin: Dizin, palet: Palet, cikti: BolgeRenkTamponu): void {
  siraliRenkler(kare, dizin, (i) => (kare ? sanayiPuani(kare, dizin, i) : 0), palet.sanayi, palet, cikti);
}

export function pazarRenkleri(kare: Kare | null, dizin: Dizin, palet: Palet, cikti: BolgeRenkTamponu): void {
  siraliRenkler(kare, dizin, (i) => (kare ? pazarDegeri(kare, dizin, i) : 0), palet.pazar, palet, cikti);
}
