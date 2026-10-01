/**
 * Tıkla-git için yol bulma (saf).
 *
 * Önce düz hat denenir (görüş varsa tek ara nokta). Yoksa başlangıca hizalı kaba ızgarada (varsayılan 2 m)
 * 8 komşulu A* koşar; düğüm sınırı aşılırsa ya da hedef ulaşılmazsa hedefe en yakın ulaşılan hücreye gidilir.
 * Sonra yol "ip çekme" ile görüş hattına göre sadeleştirilir. Bina ayak izleri dışında engel yoktur
 * (yayalar yolda da yürür); bu dilimde amaç binaların arkasına takılmadan yürümektir.
 */

export interface YolSorgusu {
  /** Nokta (hücre merkezi) yürünemez mi? */
  engelli(x: number, z: number): boolean;
  /** a → b düz hattı serbest mi (karakter yarıçapı dahil)? */
  gorus(ax: number, az: number, bx: number, bz: number): boolean;
}

export interface YolSecenekleri {
  /** Izgara adımı (m). */
  adim: number;
  /** Arama kutusu, başlangıç–hedef çerçevesinin bu kadar dışına taşabilir (m). */
  pay: number;
  /** En çok açılacak düğüm. */
  azamiDugum: number;
}

export const VARSAYILAN_YOL: YolSecenekleri = { adim: 2, pay: 60, azamiDugum: 60_000 };

/** İkili yığın (en küçük f). */
class Yigin {
  private d: number[] = [];
  private f: number[] = [];
  get bos(): boolean {
    return this.d.length === 0;
  }
  ekle(dugum: number, f: number): void {
    const d = this.d;
    const ff = this.f;
    d.push(dugum);
    ff.push(f);
    let i = d.length - 1;
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (ff[p]! <= ff[i]!) break;
      [d[p], d[i]] = [d[i]!, d[p]!];
      [ff[p], ff[i]] = [ff[i]!, ff[p]!];
      i = p;
    }
  }
  al(): number {
    const d = this.d;
    const ff = this.f;
    const ust = d[0]!;
    const sd = d.pop()!;
    const sf = ff.pop()!;
    if (d.length) {
      d[0] = sd;
      ff[0] = sf;
      let i = 0;
      for (;;) {
        const l = i * 2 + 1;
        const r = l + 1;
        let m = i;
        if (l < d.length && ff[l]! < ff[m]!) m = l;
        if (r < d.length && ff[r]! < ff[m]!) m = r;
        if (m === i) break;
        [d[m], d[i]] = [d[i]!, d[m]!];
        [ff[m], ff[i]] = [ff[i]!, ff[m]!];
        i = m;
      }
    }
    return ust;
  }
}

/**
 * Yol: başlangıç hariç ara noktalar ve son nokta. Engelli başlangıçta ya da hiç yol yoksa [hedef] (düz yürü,
 * kayarak). Hedef engelliyse hedefe en yakın ulaşılabilir noktada biter.
 */
export function yolBul(s: YolSorgusu, ax: number, az: number, hx: number, hz: number, sec: YolSecenekleri = VARSAYILAN_YOL): [number, number][] {
  if (s.gorus(ax, az, hx, hz) && !s.engelli(hx, hz)) return [[hx, hz]];
  const a = sec.adim;
  const x0 = Math.min(ax, hx) - sec.pay;
  const z0 = Math.min(az, hz) - sec.pay;
  const g = Math.ceil((Math.max(ax, hx) + sec.pay - x0) / a) + 1;
  const y = Math.ceil((Math.max(az, hz) + sec.pay - z0) / a) + 1;
  if (g * y > 4_000_000) return [[hx, hz]];
  const hucre = (x: number, z: number): number => {
    const i = Math.min(g - 1, Math.max(0, Math.round((x - x0) / a)));
    const j = Math.min(y - 1, Math.max(0, Math.round((z - z0) / a)));
    return j * g + i;
  };
  const merkezX = (n: number): number => x0 + (n % g) * a;
  const merkezZ = (n: number): number => z0 + Math.floor(n / g) * a;
  const bas = hucre(ax, az);
  const hedef = hucre(hx, hz);
  // Durum: 0 bilinmiyor, 1 serbest, 2 engelli (tembel değerlendirilir)
  const durum = new Uint8Array(g * y);
  const serbest = (n: number): boolean => {
    if (durum[n] === 0) durum[n] = s.engelli(merkezX(n), merkezZ(n)) ? 2 : 1;
    return durum[n] === 1;
  };
  const gs = new Float32Array(g * y).fill(Infinity);
  const onceki = new Int32Array(g * y).fill(-1);
  const kapali = new Uint8Array(g * y);
  const h = (n: number): number => {
    const dx = Math.abs((n % g) - (hedef % g));
    const dz = Math.abs(Math.floor(n / g) - Math.floor(hedef / g));
    return (Math.max(dx, dz) + (Math.SQRT2 - 1) * Math.min(dx, dz)) * a;
  };
  const yig = new Yigin();
  gs[bas] = 0;
  yig.ekle(bas, h(bas));
  let enIyi = bas;
  let enIyiH = h(bas);
  let acilan = 0;
  const KOMSU: [number, number, number][] = [
    [1, 0, 1],
    [-1, 0, 1],
    [0, 1, 1],
    [0, -1, 1],
    [1, 1, Math.SQRT2],
    [1, -1, Math.SQRT2],
    [-1, 1, Math.SQRT2],
    [-1, -1, Math.SQRT2],
  ];
  while (!yig.bos && acilan < sec.azamiDugum) {
    const n = yig.al();
    if (kapali[n]) continue;
    kapali[n] = 1;
    acilan++;
    const hn = h(n);
    if (hn < enIyiH) {
      enIyiH = hn;
      enIyi = n;
    }
    if (n === hedef) break;
    const i = n % g;
    const j = Math.floor(n / g);
    for (const [di, dj, c] of KOMSU) {
      const ii = i + di;
      const jj = j + dj;
      if (ii < 0 || jj < 0 || ii >= g || jj >= y) continue;
      const m = jj * g + ii;
      if (kapali[m] || !serbest(m)) continue;
      // Çaprazda köşe kesme yok
      if (di !== 0 && dj !== 0 && (!serbest(j * g + ii) || !serbest(jj * g + i))) continue;
      const yeni = gs[n]! + c * a;
      if (yeni < gs[m]!) {
        gs[m] = yeni;
        onceki[m] = n;
        yig.ekle(m, yeni + h(m));
      }
    }
  }
  const son = kapali[hedef] ? hedef : enIyi;
  if (son === bas) return [[hx, hz]];
  const hucreler: number[] = [];
  for (let n = son; n !== -1 && n !== bas; n = onceki[n]!) hucreler.push(n);
  hucreler.reverse();
  const noktalar: [number, number][] = hucreler.map((n) => [merkezX(n), merkezZ(n)]);
  if (son === hedef && !s.engelli(hx, hz)) noktalar[noktalar.length - 1] = [hx, hz];
  return ipCek(s, ax, az, noktalar);
}

/** İp çekme: her noktadan görüş hattındaki en uzak noktaya atla. */
export function ipCek(s: YolSorgusu, ax: number, az: number, noktalar: [number, number][]): [number, number][] {
  const sonuc: [number, number][] = [];
  let cx = ax;
  let cz = az;
  let i = 0;
  while (i < noktalar.length) {
    let j = noktalar.length - 1;
    while (j > i && !s.gorus(cx, cz, noktalar[j]![0], noktalar[j]![1])) j--;
    const p = noktalar[j]!;
    sonuc.push(p);
    cx = p[0];
    cz = p[1];
    i = j + 1;
  }
  return sonuc;
}
