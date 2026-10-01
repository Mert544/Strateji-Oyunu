/**
 * Sanayi zamanlı kuralları (B2): saatlik emisyon ve günlük aşınma + kirlilik yayılımı/sönümü.
 *
 * Her ikisi de mevcut `saatlik_tik` içinden çağrılır (ayrı olay türü yok; sanayi kapalıyken hiçbir şey çalışmaz):
 * - `sanayiSaatlik`: her saat, çalışan tesislerin emisyonu bölge kirliliğine eklenir.
 * - `sanayiGunluk`: her sim-günü başında (t > 0 ve t mod GUN = 0): aşınma değişimi, kirlilik yayılımı (kara komşularına)
 *   ve doğal sönüm. Yalnız sahipli bölgeler işlenir (sahipsiz bölge uykudadır: kirlilik donar, almaz ve vermez).
 */
import { carpBol, carpBolTavan, kelepce } from "../sabit";
import { PPM } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya } from "../tipler";
import { bakimDuzeyiIndeksi, olcekKademesi } from "./carpan";
import { sanayiTablosu } from "./tablo";

/** Saatlik emisyon: Σ yöntem.kirlilikPpmSaat x verim x ölçek (son çözümdeki verimle). */
export function sanayiSaatlik(d: Dunya, ctx: Baglam): void {
  const sn = sanayiTablosu(ctx.ic);
  if (sn === null) return;
  for (const b of d.bolgeler) {
    if (b.sahip === null || b.kirlilikPpm === undefined) continue;
    let ek = 0;
    for (const ts of b.tesisler) {
      const k = sn.yontemKirlilik[ts.yontem] as number;
      if (k <= 0 || !ts.aktif || ts.verimPpm <= 0) continue;
      const kademe = olcekKademesi(sn, ts).ciktiPpm;
      // Yukarı yuvarlanır: küçük emisyonlar (10-20 ppm/saat) verim 0,999999 iken 1 ppm kaybetmesin.
      ek += carpBolTavan(carpBolTavan(k, ts.verimPpm, PPM), kademe, PPM);
    }
    if (ek > 0) b.kirlilikPpm = kelepce(b.kirlilikPpm + ek, 0, PPM);
  }
}

/** Günlük tik: aşınma, kirlilik yayılımı ve sönümü. Çağıran saatlik tık sonunda lojistiği zaten kirletir. */
export function sanayiGunluk(d: Dunya, ctx: Baglam): void {
  const sn = sanayiTablosu(ctx.ic);
  if (sn === null) return;
  const bk = sn.p.bakim;

  // 1. Aşınma: bakım düzeyine göre günlük değişim; bakım girdisi karşılanmıyorsa en az kitlikAsinmaPpmGun.
  for (const b of d.bolgeler) {
    if (b.sahip === null) continue;
    const duzey = bakimDuzeyiIndeksi(d, b);
    let delta = (bk.duzeyler[duzey] as { asinmaPpmGun: number }).asinmaPpmGun;
    // Parça kıtlığı: bakım girdisi karşılanma eşiğinin altındaysa günlük aşınma en az kitlikAsinmaPpmGun x (1 - karşılanma)
    // olur (tam kıtlıkta +20 000, yarım kıtlıkta +10 000; eşik üstünde ek aşınma yok).
    const karsilanma = b.bakimKarsilanmaPpm ?? PPM;
    if (karsilanma < bk.kitlikEsigiPpm) {
      const kitlik = carpBolTavan(bk.kitlikAsinmaPpmGun, PPM - karsilanma, PPM);
      if (delta < kitlik) delta = kitlik;
    }
    if (delta === 0) continue;
    for (const ts of b.tesisler) {
      if (!ts.aktif || ts.asinmaPpm === undefined) continue;
      ts.asinmaPpm = kelepce(ts.asinmaPpm + delta, 0, PPM);
    }
  }

  // 2. Kirlilik: önce kara komşularına yayılım (hesap önce, uygulama sonra), sonra doğal sönüm.
  const n = d.bolgeler.length;
  const fark: number[] = new Array<number>(n).fill(0);
  const kp = sn.p.kirlilik;
  for (let i = 0; i < n; i++) {
    const b = d.bolgeler[i] as BolgeDurumu;
    const k = b.kirlilikPpm;
    if (b.sahip === null || k === undefined || k <= 0 || kp.komsuYayilimPpmGun <= 0) continue;
    const komsular = komsuListesi(d, ctx, i);
    if (komsular.length === 0) continue;
    const toplam = carpBol(k, kp.komsuYayilimPpmGun, PPM);
    const pay = Math.floor(toplam / komsular.length);
    if (pay <= 0) continue;
    for (const j of komsular) {
      fark[j] = (fark[j] as number) + pay;
      fark[i] = (fark[i] as number) - pay;
    }
  }
  for (let i = 0; i < n; i++) {
    const b = d.bolgeler[i] as BolgeDurumu;
    if (b.sahip === null || b.kirlilikPpm === undefined) continue;
    let k = kelepce(b.kirlilikPpm + (fark[i] as number), 0, PPM);
    if (k > 0 && kp.azalmaPpmGun > 0) {
      k -= carpBolTavan(k, kp.azalmaPpmGun, PPM);
      if (k < 0) k = 0;
    }
    b.kirlilikPpm = k;
  }
}

const komsuOnbellegi = new WeakMap<object, number[][]>();

/** Sahipli kara komşuları (kenar indeksi artan; yinelenen tek). Yalnız sahipli bölgelerle yayılım olur. */
function komsuListesi(d: Dunya, ctx: Baglam, i: number): number[] {
  let tum = komsuOnbellegi.get(ctx.ic);
  if (tum === undefined) {
    tum = ctx.ic.harita.bolgeler.map(() => []);
    for (const kenar of ctx.ic.harita.kenarlar) {
      if (kenar.tur !== "kara") continue;
      const a = ctx.ic.bolgeIndeks[kenar.a];
      const bb = ctx.ic.bolgeIndeks[kenar.b];
      if (a === undefined || bb === undefined || a === bb) continue;
      const la = tum[a] as number[];
      const lb = tum[bb] as number[];
      if (!la.includes(bb)) la.push(bb);
      if (!lb.includes(a)) lb.push(a);
    }
    komsuOnbellegi.set(ctx.ic, tum);
  }
  return (tum[i] as number[]).filter((j) => (d.bolgeler[j] as BolgeDurumu).sahip !== null && (d.bolgeler[j] as BolgeDurumu).kirlilikPpm !== undefined);
}

