/**
 * Pişirilmiş karakter dosyası (`varlik/karakter.ykr`) çözücüsü ve kare karıştırma (saf).
 * Biçim ve üretim: scripts/yuru-karakter.ts. Kaynak: Quaternius Universal Animation Library (CC0).
 */

export interface KarakterAnimasyonu {
  ad: string;
  kare: number;
  /** Döngü süresi (s); tek kareli pozda 0. */
  sure: number;
  /** Animasyonun doğal ilerleme hızı (m/s, yaklaşık); oynatma hızı = karakter hızı / doğal hız. */
  hiz: number;
  /** Kare verisinin `kareler` içindeki başlangıcı (kare indeksi). */
  bas: number;
}

export interface KarakterVerisi {
  kose: number;
  kemik: number;
  /** Çözülmüş konum (m, bağlama pozu). */
  konum: Float32Array;
  normal: Float32Array;
  /** 0 gövde, 1 eklem. */
  malzeme: Uint8Array;
  kemikIndeks: Uint8Array;
  /** 0–255 (toplam 255). */
  agirlik: Uint8Array;
  indeks: Uint16Array;
  /** Kare başına kemik × 12 (3×4 satır öncelikli) niceli değer. */
  kareler: Int16Array;
  donOlcek: number;
  otelemeOlcek: number;
  animasyonlar: KarakterAnimasyonu[];
}

export function karakterCoz(ab: ArrayBuffer): KarakterVerisi {
  const d = new DataView(ab);
  const sihir = String.fromCharCode(d.getUint8(0), d.getUint8(1), d.getUint8(2), d.getUint8(3));
  if (sihir !== "YKR1") throw new Error(`Karakter dosyası değil: ${sihir}`);
  const V = d.getUint16(4, true);
  const B = d.getUint16(6, true);
  const I = d.getUint32(8, true);
  const A = d.getUint16(12, true);
  const olcek = d.getFloat32(16, true);
  const ofset = [d.getFloat32(20, true), d.getFloat32(24, true), d.getFloat32(28, true)];
  const donOlcek = d.getFloat32(32, true);
  const otelemeOlcek = d.getFloat32(36, true);
  let o = 40;
  const animasyonlar: KarakterAnimasyonu[] = [];
  let kareTop = 0;
  const cozucu = new TextDecoder();
  for (let i = 0; i < A; i++) {
    const n = d.getUint8(o);
    const ad = cozucu.decode(new Uint8Array(ab, o + 1, n));
    const kare = d.getUint16(o + 1 + n, true);
    const sure = d.getFloat32(o + 3 + n, true);
    const hiz = d.getFloat32(o + 7 + n, true);
    animasyonlar.push({ ad, kare, sure, hiz, bas: kareTop });
    kareTop += kare;
    o += 11 + n;
  }
  const hizala = (): void => {
    o = (o + 3) & ~3;
  };
  hizala();
  const konumQ = new Int16Array(ab, o, V * 3);
  o += V * 6;
  hizala();
  const normalQ = new Int8Array(ab, o, V * 3);
  o += V * 3;
  hizala();
  const malzeme = new Uint8Array(ab, o, V);
  o += V;
  hizala();
  const kemikIndeks = new Uint8Array(ab, o, V * 4);
  o += V * 4;
  hizala();
  const agirlik = new Uint8Array(ab, o, V * 4);
  o += V * 4;
  hizala();
  const indeks = new Uint16Array(ab, o, I);
  o += I * 2;
  hizala();
  const kareler = new Int16Array(ab, o, kareTop * B * 12);
  o += kareTop * B * 24;
  if (o > ab.byteLength) throw new Error("Karakter dosyası kısa");
  const konum = new Float32Array(V * 3);
  const normal = new Float32Array(V * 3);
  for (let i = 0; i < V * 3; i++) {
    konum[i] = konumQ[i]! * olcek + ofset[i % 3]!;
    normal[i] = normalQ[i]! / 127;
  }
  return { kose: V, kemik: B, konum, normal, malzeme, kemikIndeks, agirlik, indeks, kareler, donOlcek, otelemeOlcek, animasyonlar };
}

/**
 * Animasyonun `t` saniyesindeki kemik matrislerini `cikti`ya yazar (kemik × 12 float; 3×4 satır öncelikli).
 * Kareler arasında doğrusal karıştırma; döngü sarar.
 */
export function kareKaristir(v: KarakterVerisi, a: KarakterAnimasyonu, t: number, cikti: Float32Array): void {
  const n = v.kemik * 12;
  let f0 = 0;
  let f1 = 0;
  let u = 0;
  if (a.kare > 1 && a.sure > 0) {
    const f = ((((t / a.sure) % 1) + 1) % 1) * a.kare;
    f0 = Math.floor(f) % a.kare;
    f1 = (f0 + 1) % a.kare;
    u = f - Math.floor(f);
  }
  const b0 = (a.bas + f0) * n;
  const b1 = (a.bas + f1) * n;
  const k = v.kareler;
  for (let i = 0; i < n; i++) {
    const s = i % 4 === 3 ? v.otelemeOlcek : v.donOlcek;
    cikti[i] = (k[b0 + i]! * (1 - u) + k[b1 + i]! * u) * s;
  }
}

/** Animasyonun `t` anındaki küresel kare indeksleri ve karışım: [kare0, kare1, u] (örnekli çizim için). */
export function kareIndeksi(a: KarakterAnimasyonu, t: number): [number, number, number] {
  if (a.kare <= 1 || a.sure <= 0) return [a.bas, a.bas, 0];
  const f = ((((t / a.sure) % 1) + 1) % 1) * a.kare;
  const f0 = Math.floor(f) % a.kare;
  return [a.bas + f0, a.bas + ((f0 + 1) % a.kare), f - Math.floor(f)];
}

/**
 * Animasyon dokusu (RGBA float): genişlik kemik × 3 (matris satırları), yükseklik toplam kare. Gölgelendirici
 * `texelFetch` ile okur; böylece her karakter örneği kendi karesini taşır ve hepsi tek çizim çağrısında çizilir.
 */
export function animasyonDokusu(v: KarakterVerisi): { veri: Float32Array; genislik: number; yukseklik: number } {
  const genislik = v.kemik * 3;
  const yukseklik = v.kareler.length / (v.kemik * 12);
  const veri = new Float32Array(genislik * yukseklik * 4);
  for (let i = 0; i < v.kareler.length; i++) veri[i] = v.kareler[i]! * (i % 4 === 3 ? v.otelemeOlcek : v.donOlcek);
  return { veri, genislik, yukseklik };
}

/** Köşenin deri giydirilmiş konumu (CPU; test ve seçme için). */
export function deriKonumu(v: KarakterVerisi, kemikler: Float32Array, i: number): [number, number, number] {
  const x = v.konum[i * 3]!;
  const y = v.konum[i * 3 + 1]!;
  const z = v.konum[i * 3 + 2]!;
  const s: [number, number, number] = [0, 0, 0];
  for (let q = 0; q < 4; q++) {
    const w = v.agirlik[i * 4 + q]! / 255;
    if (!w) continue;
    const b = v.kemikIndeks[i * 4 + q]! * 12;
    for (let r = 0; r < 3; r++) s[r] = s[r]! + w * (kemikler[b + r * 4]! * x + kemikler[b + r * 4 + 1]! * y + kemikler[b + r * 4 + 2]! * z + kemikler[b + r * 4 + 3]!);
  }
  return s;
}
