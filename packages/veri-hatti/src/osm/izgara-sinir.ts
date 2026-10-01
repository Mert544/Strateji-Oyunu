/**
 * Izgara denemesi için idari sınır: OSM ilişkisi (Overpass `out geom`) -> halkalar -> z20 içerde maskesi.
 *
 * Bilerek bağımsız: il/ilçe hiyerarşisi başka bir modülde üretiliyor; bu deneme yalnız tek bir
 * ilişkiyi (ör. Gebze r1211496) Overpass'tan çeker ve .onbellek/osm/iliski-<kimlik>.json olarak saklar.
 * Hücre üyeliği kuralı: hücre MERKEZİ sınır poligonunun içindeyse (çift-tek kuralı) hücre ilçenindir.
 * Böylece her hücre tam olarak bir ilçeye düşer (komşu ilçeler ortak kenarı paylaşsa bile).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { boylamdanX, enlemdenY } from "./izgara-geometri";

/** [boylam, enlem] noktalarından kapalı halka (ilk = son). */
export type Halka = [number, number][];

interface OverpassUye {
  type: string;
  role: string;
  geometry?: { lat: number; lon: number }[];
}
interface OverpassIliski {
  type: string;
  id: number;
  tags?: Record<string, string>;
  members?: OverpassUye[];
}
export interface OverpassYaniti {
  osm3s?: { timestamp_osm_base?: string };
  elements: OverpassIliski[];
}

const anahtar = (p: [number, number]): string => `${p[0]},${p[1]}`;

/**
 * Yolları uç noktalarından birleştirip kapalı halkalar kurar. Girdi sırasından bağımsız olsun diye
 * yollar önce kanonik biçime getirilip sıralanır (determinizm).
 */
export function yollariHalkalaraBirlestir(yollar: [number, number][][]): Halka[] {
  const kalan = yollar
    .filter((y) => y.length >= 2)
    .map((y) => y.map((p) => [p[0], p[1]] as [number, number]))
    // Kanonik yön: ilk uç anahtarı son uçtan küçük olsun (girdi yönünden bağımsızlık)
    .map((y) => (anahtar(y[y.length - 1]!) < anahtar(y[0]!) ? y.reverse() : y))
    .sort((a, b) => (anahtar(a[0]!) < anahtar(b[0]!) ? -1 : anahtar(a[0]!) > anahtar(b[0]!) ? 1 : a.length - b.length));
  const halkalar: Halka[] = [];
  while (kalan.length > 0) {
    let zincir = kalan.shift()!;
    for (;;) {
      const bas = anahtar(zincir[0]!);
      const son = anahtar(zincir[zincir.length - 1]!);
      if (bas === son && zincir.length >= 4) break;
      const i = kalan.findIndex((y) => anahtar(y[0]!) === son || anahtar(y[y.length - 1]!) === son);
      if (i < 0) {
        throw new Error(`Halka kapanmiyor: ${son} ucuna baglanan yol yok`);
      }
      const y = kalan.splice(i, 1)[0]!;
      const ek = anahtar(y[0]!) === son ? y : [...y].reverse();
      zincir = zincir.concat(ek.slice(1));
    }
    halkalar.push(zincir);
  }
  return halkalar;
}

/** Overpass `rel(<id>);out geom;` yanıtından dış+iç halkalar (çift-tek dolgu için ayrım gerekmez). */
export function overpassHalkalari(yanit: OverpassYaniti, iliskiKimligi: number): Halka[] {
  const r = yanit.elements.find((e) => e.type === "relation" && e.id === iliskiKimligi);
  if (!r || !r.members) throw new Error(`Overpass yanitinda iliski yok: r${iliskiKimligi}`);
  const yollar = r.members
    .filter((m) => m.type === "way" && (m.role === "outer" || m.role === "inner" || m.role === "") && m.geometry)
    .map((m) => m.geometry!.map((g) => [g.lon, g.lat] as [number, number]));
  return yollariHalkalaraBirlestir(yollar);
}

/** İlişkiyi önbellekten okur; yoksa Overpass'tan tek sorguyla indirir. */
export async function iliskiGetir(onbellekDizini: string, iliskiKimligi: number): Promise<OverpassYaniti> {
  const dizin = resolve(onbellekDizini, "osm");
  const yol = resolve(dizin, `iliski-${iliskiKimligi}.json`);
  if (!existsSync(yol)) {
    const vekil = process.env["HTTPS_PROXY"] ?? process.env["https_proxy"];
    if (vekil) {
      const { ProxyAgent, setGlobalDispatcher } = await import("undici");
      setGlobalDispatcher(new ProxyAgent(vekil));
    }
    const sorgu = `[out:json][timeout:120];rel(${iliskiKimligi});out geom;`;
    const yanit = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", "user-agent": "bolge-stratejisi-veri-hatti/0.1" },
      body: `data=${encodeURIComponent(sorgu)}`,
    });
    if (!yanit.ok) throw new Error(`Overpass basarisiz (${yanit.status}) r${iliskiKimligi}`);
    mkdirSync(dizin, { recursive: true });
    writeFileSync(yol, await yanit.text(), "utf8");
  }
  return JSON.parse(readFileSync(yol, "utf8")) as OverpassYaniti;
}

/** Yoğun z20 içerde maskesi: (x0, y0) köşeli genislik x yukseklik dizisi, 1 = hücre merkezi içeride. */
export interface IcerdeMaskesi {
  x0: number;
  y0: number;
  genislik: number;
  yukseklik: number;
  icerde: Uint8Array;
  /** İçerideki hücre sayısı. */
  sayi: number;
}

/**
 * Satır tarama ile hücre merkezi poligon içinde mi (çift-tek). Kenar üzerindeki merkezler için
 * yarı açık kural (y1 <= yc < y2) kullanılır; sonuç girdiye göre deterministiktir.
 */
export function icerdeMaskesi(halkalar: Halka[]): IcerdeMaskesi {
  // Halkaları z20 karo koordinatına çevir
  const hk = halkalar.map((h) => h.map(([lon, lat]) => [boylamdanX(lon), enlemdenY(lat)] as [number, number]));
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const h of hk)
    for (const [x, y] of h) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  const x0 = Math.floor(minX);
  const y0 = Math.floor(minY);
  const genislik = Math.floor(maxX) - x0 + 1;
  const yukseklik = Math.floor(maxY) - y0 + 1;
  const icerde = new Uint8Array(genislik * yukseklik);
  // Kenarları y'ye göre kovala: her satır için yalnız ilgili kenarlar taranır
  const kovalar: number[][] = Array.from({ length: yukseklik }, () => []);
  const kenarlar: [number, number, number, number][] = [];
  for (const h of hk) {
    for (let i = 0; i + 1 < h.length; i++) {
      const [ax, ay] = h[i]!;
      const [bx, by] = h[i + 1]!;
      if (ay === by) continue;
      const e = kenarlar.push([ax, ay, bx, by]) - 1;
      const s0 = Math.max(0, Math.floor(Math.min(ay, by) - 0.5) - y0);
      const s1 = Math.min(yukseklik - 1, Math.ceil(Math.max(ay, by) - 0.5) - y0);
      for (let s = s0; s <= s1; s++) kovalar[s]!.push(e);
    }
  }
  let sayi = 0;
  const kesisimler: number[] = [];
  for (let s = 0; s < yukseklik; s++) {
    const yc = y0 + s + 0.5;
    kesisimler.length = 0;
    for (const e of kovalar[s]!) {
      const [ax, ay, bx, by] = kenarlar[e]!;
      const alt = Math.min(ay, by);
      const ust = Math.max(ay, by);
      if (yc < alt || yc >= ust) continue;
      kesisimler.push(ax + ((yc - ay) / (by - ay)) * (bx - ax));
    }
    kesisimler.sort((a, b) => a - b);
    for (let k = 0; k + 1 < kesisimler.length; k += 2) {
      // merkez x+0.5 aralıkta: x+0.5 >= sol && x+0.5 < sag
      const ilk = Math.max(x0, Math.ceil(kesisimler[k]! - 0.5));
      const son = Math.min(x0 + genislik - 1, Math.ceil(kesisimler[k + 1]! - 0.5) - 1);
      for (let x = ilk; x <= son; x++) {
        icerde[s * genislik + (x - x0)] = 1;
        sayi++;
      }
    }
  }
  return { x0, y0, genislik, yukseklik, icerde, sayi };
}
