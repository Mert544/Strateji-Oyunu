/**
 * Yürüyüş karakterini pişirir: Quaternius "Universal Animation Library" (CC0) mankenini ve üç animasyonunu
 * (durma pozu, yürüme, koşu, depar, zıplama: Idle_Loop ilk karesi, Walk_Loop, Jog_Fwd_Loop, Sprint_Loop, Jump_Loop) küçük bir ikili dosyaya (`src/yuru/varlik/karakter.ykr`) çevirir.
 *
 *   tsx scripts/yuru-karakter.ts <UAL1_Standard.glb>
 *
 * Kaynak: https://quaternius.itch.io/universal-animation-library (Standard paketi, `Unreal-Godot/UAL1_Standard.glb`,
 * kök hareketi kapalı sürüm). Lisans CC0 1.0 (paketteki License.txt).
 *
 * Neden pişirme: çalışma zamanında GLTFLoader + SkinnedMesh + AnimationMixer kabuğa (three köprüsü) ~40 KB gzip
 * eklerdi ve tek dosya bütçesi (400 KB) buna yer bırakmıyor. Bunun yerine kemik matrisleri kare kare örneklenir
 * (`bone.matrixWorld × boneInverse`), int16 olarak saklanır; çalışma zamanında bir animasyon dokusuna (kemik × 3 satır,
 * kare başına bir sıra) yazılır ve gölgelendiricide örneklenmiş (instanced) deri giydirme yapılır: tüm karakterler tek
 * çizim çağrısı (ileride diğer oyuncular). Durma pozu tek karedir (sakin görsel: boşta animasyon yok).
 *
 * Biçim (küçük-sonlu; ayrıntı: src/yuru/karakter-veri.ts):
 *   "YKR1" · u16 köşe · u16 kemik · u32 indeks · u16 animasyon · u16 0 · f32 konumÖlçek · f32 ofset[3] · f32 dönÖlçek · f32 ötelemeÖlçek
 *   animasyon başına: u8 ad uzunluğu · ad (utf8) · u16 kare · f32 süre (s) · f32 doğal hız (m/s)
 *   (4 bayta hizalı) i16 konum[V·3] · i8 normal[V·3] · u8 malzeme[V] · u8 kemik[V·4] · u8 ağırlık[V·4] · u16 indeks[I] · i16 kare[ΣF·B·12]
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { AnimationMixer, Box3, Matrix4, Vector3 } from "three";
import type { AnimationClip, BufferGeometry, Object3D, SkinnedMesh } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const AYRI = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const CIKTI = join(AYRI, "src", "yuru", "varlik", "karakter.ykr");

/** Pişirilecek animasyonlar: [kaynak ad, çıktı ad, kare/sn; 0 = tek kare (poz)]. */
const ANIMASYONLAR: [string, string, number][] = [
  ["Idle_Loop", "dur", 0],
  ["Walk_Loop", "yuru", 24],
  ["Jog_Fwd_Loop", "kos", 24],
  ["Sprint_Loop", "depar", 30],
  ["Jump_Loop", "zipla", 0],
];

const DON_OLCEK = 1 / 16000;
const OTELEME_OLCEK = 1 / 8000;

async function yukle(yol: string): Promise<{ sahne: Object3D; animasyonlar: AnimationClip[] }> {
  const b = readFileSync(yol);
  const ab = b.buffer.slice(b.byteOffset, b.byteOffset + b.byteLength) as ArrayBuffer;
  return new Promise((coz, red) => new GLTFLoader().parse(ab, "", (g) => coz({ sahne: g.scene, animasyonlar: g.animations }), red));
}

async function main(): Promise<void> {
  const girdi = process.argv[2];
  if (!girdi) throw new Error("kullanım: tsx scripts/yuru-karakter.ts <UAL1_Standard.glb>");
  const { sahne, animasyonlar } = await yukle(girdi);
  const agler: SkinnedMesh[] = [];
  sahne.traverse((o) => {
    if ((o as SkinnedMesh).isSkinnedMesh) agler.push(o as SkinnedMesh);
  });
  if (!agler.length) throw new Error("deri giydirilmiş ağ yok");
  const iskelet = agler[0]!.skeleton;
  for (const a of agler) if (a.skeleton.bones.length !== iskelet.bones.length) throw new Error("ağlar farklı iskelet kullanıyor");
  sahne.updateMatrixWorld(true);

  // --- Köşeleri birleştir (konum + malzeme + deri aynıysa kaynak) ---
  interface Kose {
    p: [number, number, number];
    n: [number, number, number];
    m: number;
    j: [number, number, number, number];
    w: [number, number, number, number];
  }
  const koseler: Kose[] = [];
  const anahtar = new Map<string, number>();
  const indeks: number[] = [];
  agler.forEach((ag, m) => {
    const g = ag.geometry as BufferGeometry;
    const P = g.getAttribute("position");
    const N = g.getAttribute("normal");
    const J = g.getAttribute("skinIndex");
    const W = g.getAttribute("skinWeight");
    const yeni: number[] = [];
    for (let i = 0; i < P.count; i++) {
      const p: [number, number, number] = [P.getX(i), P.getY(i), P.getZ(i)];
      const j: [number, number, number, number] = [J.getX(i), J.getY(i), J.getZ(i), J.getW(i)];
      const wr = [W.getX(i), W.getY(i), W.getZ(i), W.getW(i)];
      const top = wr.reduce((a, b) => a + b, 0) || 1;
      // Ağırlıkları 0–255'e niceleyip toplamı 255'e tamamla
      const wq = wr.map((x) => Math.round((x / top) * 255));
      const fark = 255 - wq.reduce((a, b) => a + b, 0);
      wq[wq.indexOf(Math.max(...wq))]! += fark;
      const w = wq as [number, number, number, number];
      for (let k = 0; k < 4; k++) if (w[k] === 0) j[k] = 0;
      const a = `${m}|${p.map((x) => Math.round(x * 2000)).join(",")}|${j.join(",")}|${w.join(",")}`;
      let ix = anahtar.get(a);
      if (ix === undefined) {
        ix = koseler.length;
        anahtar.set(a, ix);
        koseler.push({ p, n: [0, 0, 0], m, j, w });
      }
      const k = koseler[ix]!;
      k.n[0] += N.getX(i);
      k.n[1] += N.getY(i);
      k.n[2] += N.getZ(i);
      yeni.push(ix);
    }
    const I = g.getIndex();
    if (!I) throw new Error("indekssiz geometri");
    for (let i = 0; i < I.count; i += 3) {
      const a = yeni[I.getX(i)]!;
      const b = yeni[I.getX(i + 1)]!;
      const c = yeni[I.getX(i + 2)]!;
      if (a !== b && b !== c && a !== c) indeks.push(a, b, c);
    }
  });
  const V = koseler.length;
  if (V >= 65536) throw new Error(`çok köşe: ${V}`);

  // --- Kullanılan kemikler ---
  const kullanilan = [...new Set(koseler.flatMap((k) => k.j.filter((_, i) => k.w[i]! > 0)))].sort((a, b) => a - b);
  const yeniKemik = new Map(kullanilan.map((b, i) => [b, i]));
  const B = kullanilan.length;
  for (const k of koseler) k.j = k.j.map((b, i) => (k.w[i]! > 0 ? yeniKemik.get(b)! : 0)) as Kose["j"];

  // --- Kare örnekleme: F_i = ağDünya × bindMatrixInverse × kemikDünya × boneInverse × bindMatrix ---
  const ag0 = agler[0]!;
  const karisici = new AnimationMixer(sahne);
  const kareler: Float32Array[] = [];
  const animBilgi: { ad: string; kare: number; sure: number; hiz: number }[] = [];
  const kutu = new Box3();
  const M = new Matrix4();
  const v = new Vector3();
  const ayakAdi = iskelet.bones.findIndex((b) => /^ball_l$/.test(b.name));
  for (const [kaynak, ad, fps] of ANIMASYONLAR) {
    const klip = animasyonlar.find((a) => a.name === kaynak);
    if (!klip) throw new Error(`animasyon yok: ${kaynak}`);
    karisici.stopAllAction();
    const eylem = karisici.clipAction(klip);
    eylem.reset().play();
    const F = fps === 0 ? 1 : Math.max(2, Math.round(klip.duration * fps));
    let zMin = Infinity;
    let zMax = -Infinity;
    for (let f = 0; f < F; f++) {
      karisici.setTime(fps === 0 ? 0 : (f / F) * klip.duration);
      sahne.updateMatrixWorld(true);
      const kare = new Float32Array(B * 12);
      kullanilan.forEach((b, i) => {
        M.multiplyMatrices(iskelet.bones[b]!.matrixWorld, iskelet.boneInverses[b]!);
        M.premultiply(ag0.bindMatrixInverse).premultiply(ag0.matrixWorld).multiply(ag0.bindMatrix);
        const e = M.elements; // sütun öncelikli
        for (let r = 0; r < 3; r++) for (let c = 0; c < 4; c++) kare[i * 12 + r * 4 + c] = e[c * 4 + r]!;
      });
      kareler.push(kare);
      if (ayakAdi >= 0) {
        const z = new Vector3().setFromMatrixPosition(iskelet.bones[ayakAdi]!.matrixWorld).z;
        zMin = Math.min(zMin, z);
        zMax = Math.max(zMax, z);
      }
      if (f === 0 && ad === "dur") {
        // Durma pozunda sınırlayıcı kutu (ayak tabanı y = 0'a oturtulur)
        for (const k of koseler) {
          v.set(0, 0, 0);
          for (let q = 0; q < 4; q++) {
            const w = k.w[q]! / 255;
            if (!w) continue;
            const bi = k.j[q]!;
            const x = kare[bi * 12 + 0]! * k.p[0] + kare[bi * 12 + 1]! * k.p[1] + kare[bi * 12 + 2]! * k.p[2] + kare[bi * 12 + 3]!;
            const y = kare[bi * 12 + 4]! * k.p[0] + kare[bi * 12 + 5]! * k.p[1] + kare[bi * 12 + 6]! * k.p[2] + kare[bi * 12 + 7]!;
            const z = kare[bi * 12 + 8]! * k.p[0] + kare[bi * 12 + 9]! * k.p[1] + kare[bi * 12 + 10]! * k.p[2] + kare[bi * 12 + 11]!;
            v.x += w * x;
            v.y += w * y;
            v.z += w * z;
          }
          kutu.expandByPoint(v);
        }
      }
    }
    // Doğal hız (yaklaşık): döngüde iki adım; her adımda gövde, ayak ucunun ileri-geri genliği kadar ilerler.
    const hiz = fps === 0 || !Number.isFinite(zMax) ? 0 : (2 * (zMax - zMin)) / klip.duration;
    animBilgi.push({ ad, kare: F, sure: fps === 0 ? 0 : klip.duration, hiz });
  }
  const boy = kutu.max.y - kutu.min.y;
  console.log(`köşe ${V} (kaynak ${agler.reduce((s, a) => s + a.geometry.getAttribute("position").count, 0)}), üçgen ${indeks.length / 3}, kemik ${B}/${iskelet.bones.length}`);
  console.log(`boy ${boy.toFixed(2)} m, kutu x ${kutu.min.x.toFixed(2)}..${kutu.max.x.toFixed(2)} z ${kutu.min.z.toFixed(2)}..${kutu.max.z.toFixed(2)}`);
  console.log("animasyonlar:", animBilgi.map((a) => `${a.ad} ${a.kare} kare ${a.sure.toFixed(2)} s, ~${a.hiz.toFixed(2)} m/s`).join("; "));

  // Ayak tabanını y = 0'a indir: tüm karelerin öteleme sütununa −minY eklemek, deri giydirilmiş sonucu kaydırır
  // (ağırlıklar toplamı 1 olduğundan).
  for (const k of kareler) for (let i = 0; i < B; i++) k[i * 12 + 7]! -= kutu.min.y;

  // --- Niceleme ---
  const pMin = [Infinity, Infinity, Infinity];
  const pMax = [-Infinity, -Infinity, -Infinity];
  for (const k of koseler)
    for (let a = 0; a < 3; a++) {
      pMin[a] = Math.min(pMin[a]!, k.p[a]!);
      pMax[a] = Math.max(pMax[a]!, k.p[a]!);
    }
  const ofset = pMin.map((m, a) => (m + pMax[a]!) / 2);
  const olcek = Math.max(...pMax.map((m, a) => (m - pMin[a]!) / 2)) / 32767;
  const ad = new TextEncoder();
  const parcalar: Uint8Array[] = [];
  const dv = (n: number): DataView => new DataView(new ArrayBuffer(n));
  {
    const h = dv(4 + 2 + 2 + 4 + 2 + 2 + 4 + 12 + 4 + 4);
    [..."YKR1"].forEach((c, i) => h.setUint8(i, c.charCodeAt(0)));
    h.setUint16(4, V, true);
    h.setUint16(6, B, true);
    h.setUint32(8, indeks.length, true);
    h.setUint16(12, animBilgi.length, true);
    h.setUint16(14, 0, true);
    h.setFloat32(16, olcek, true);
    h.setFloat32(20, ofset[0]!, true);
    h.setFloat32(24, ofset[1]!, true);
    h.setFloat32(28, ofset[2]!, true);
    h.setFloat32(32, DON_OLCEK, true);
    h.setFloat32(36, OTELEME_OLCEK, true);
    parcalar.push(new Uint8Array(h.buffer));
  }
  for (const a of animBilgi) {
    const b = ad.encode(a.ad);
    const h = dv(1 + b.length + 2 + 4 + 4);
    h.setUint8(0, b.length);
    b.forEach((x, i) => h.setUint8(1 + i, x));
    h.setUint16(1 + b.length, a.kare, true);
    h.setFloat32(3 + b.length, a.sure, true);
    h.setFloat32(7 + b.length, a.hiz, true);
    parcalar.push(new Uint8Array(h.buffer));
  }
  const hizala = (): void => {
    const n = parcalar.reduce((s, p) => s + p.length, 0);
    if (n % 4) parcalar.push(new Uint8Array(4 - (n % 4)));
  };
  hizala();
  const konum = new Int16Array(V * 3);
  const normal = new Int8Array(V * 3);
  const malzeme = new Uint8Array(V);
  const kemik = new Uint8Array(V * 4);
  const agirlik = new Uint8Array(V * 4);
  koseler.forEach((k, i) => {
    for (let a = 0; a < 3; a++) konum[i * 3 + a] = Math.round((k.p[a]! - ofset[a]!) / olcek);
    const L = Math.hypot(...k.n) || 1;
    for (let a = 0; a < 3; a++) normal[i * 3 + a] = Math.round((k.n[a]! / L) * 127);
    malzeme[i] = k.m;
    for (let q = 0; q < 4; q++) {
      kemik[i * 4 + q] = k.j[q]!;
      agirlik[i * 4 + q] = k.w[q]!;
    }
  });
  const kareSayi = kareler.length * B * 12;
  const kareDizi = new Int16Array(kareSayi);
  kareler.forEach((k, f) => {
    for (let i = 0; i < B * 12; i++) {
      const otel = i % 4 === 3;
      const q = Math.round(k[i]! / (otel ? OTELEME_OLCEK : DON_OLCEK));
      if (Math.abs(q) > 32767) throw new Error(`niceleme taşması: kare ${f} öğe ${i} = ${k[i]}`);
      kareDizi[f * B * 12 + i] = q;
    }
  });
  for (const d of [konum, normal, malzeme, kemik, agirlik, new Uint16Array(indeks), kareDizi]) {
    parcalar.push(new Uint8Array(d.buffer, d.byteOffset, d.byteLength));
    hizala();
  }
  const toplam = parcalar.reduce((s, p) => s + p.length, 0);
  const cikti = new Uint8Array(toplam);
  let o = 0;
  for (const p of parcalar) {
    cikti.set(p, o);
    o += p.length;
  }
  mkdirSync(dirname(CIKTI), { recursive: true });
  writeFileSync(CIKTI, cikti);
  console.log(`${CIKTI}: ${(toplam / 1024).toFixed(1)} KB / gzip ${(gzipSync(cikti, { level: 9 }).length / 1024).toFixed(1)} KB`);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
