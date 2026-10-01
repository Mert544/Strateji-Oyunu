/**
 * İklim takvimi ve yayılan iklim olayları (B1, docs/08 §0.2-a ve §1.3 T2-T3).
 *
 * - Takvim: takvim günü = (baslangicGunu + floor(t x gunCarpani / GUN)) mod 365 (0 = 1 Ocak). Gerçek takvim
 *   gunCarpani = 1'dir; ölçüm için 12 (1 ay ~ 2,5 gün) kullanılabilir. Ay hesabı tamsayı bölmesiyledir.
 * - Hasat oranı: iklim tipinin 12 aylık eğrisi, ay ortaları arasında doğrusal enterpolasyonla günlük değere çevrilir
 *   (tablo.ts `hasatGunluk`); sulama yalnız 1'in altındaki dipleri yumuşatır.
 * - Olaylar: günlük tikte her bölge x olay türü için TAM BİR çekim (çekim sayısı olaydan bağımsız sabit), olay
 *   oluşursa şiddet ve süre için iki ek çekim. Rastgelelik yalnız ctx.rastgele(d, "olay"). Olay önce uyarı ilan eder
 *   (`uyariSaat`), sonra etki başlar; şiddet merkezde tam, kara komşularında `yayilimPpm` kadar azalarak yayılır
 *   (yayılma yaratılırken bir kez hesaplanır, deterministik BFS) ve etki süresince doğrusal söner.
 * - Günlük tikte toprak da güncellenir (yalnız sahipli bölgelerde; sahipsiz bölge uykudadır).
 */
import { carpBol, carpBolTavan, kelepce } from "../sabit";
import { PPM, SAAT } from "../tipler";
import type { Baglam, BolgeDurumu, Dunya, IklimOlayi, Ms } from "../tipler";
import { IKLIM_TIPI_SIRASI, OLAY_TURU_SIRASI, TARIMI_ETKILEYEN_OLAY, tarimTablosu } from "./tablo";
import type { TarimTablosu } from "./tablo";

const YIL_GUNU = 365;

/** Takvim süresi (ms): gunCarpani > 1 iken süre o oranda kısalır (en az 1 ms). */
function takvimMs(tb: TarimTablosu, ms: Ms): Ms {
  const g = tb.iklim.gunCarpani;
  if (g === 1) return ms;
  const x = carpBol(ms, 1, g);
  return x < 1 ? 1 : x;
}

/** Mutlak takvim günü: baslangicGunu + floor(t x gunCarpani / GUN) (modsuz). */
export function mutlakTakvimGunu(baslangicGunu: number, gunCarpani: number, t: Ms): number {
  return baslangicGunu + carpBol(t, gunCarpani, 86_400_000);
}

/** Takvim günü (0..364; 0 = 1 Ocak). Tarım kapalıysa null. */
export function takvimGunu(ic: Baglam["ic"], t: Ms): number | null {
  const tb = tarimTablosu(ic);
  if (tb === null) return null;
  const m = mutlakTakvimGunu(tb.iklim.baslangicGunu, tb.iklim.gunCarpani, t);
  return ((m % YIL_GUNU) + YIL_GUNU) % YIL_GUNU;
}

/** Takvim ayı (0 = Ocak .. 11 = Aralık). Tarım kapalıysa null. */
export function takvimAyi(ic: Baglam["ic"], t: Ms): number | null {
  const tb = tarimTablosu(ic);
  const g = takvimGunu(ic, t);
  if (tb === null || g === null) return null;
  return tb.gunAyi[g] as number;
}

/** Bölgenin sulama düzeyi (ppm): aktif sulama tesislerinin son çözümdeki verimlerinin toplamı, en çok PPM. */
function sulamaDuzeyi(tb: TarimTablosu, b: BolgeDurumu): number {
  let s = 0;
  for (const ts of b.tesisler) {
    if (ts.aktif && tb.yontemSulama[ts.yontem]) s += ts.verimPpm;
  }
  return s > PPM ? PPM : s;
}

/** Bölgenin ekili (rezervli tarımsal) aktif tesisi var mı: toprak yalnız işlenen bölgede sürüklenir. */
function ekiliTesisVar(tb: TarimTablosu, b: BolgeDurumu): boolean {
  for (const ts of b.tesisler) {
    if (ts.aktif && tb.yontemEkili[ts.yontem]) return true;
  }
  return false;
}

/** Kara kenarlarıyla BFS: merkezden menzil kenara kadar (bölge indeksi, şiddet) çiftleri, bölge indeksine göre artan. */
function yayilimHesapla(tb: TarimTablosu, merkez: number, siddetPpm: number, menzil: number, yayilimPpm: number): Array<{ bolge: number; siddetPpm: number }> {
  const goruldu = new Map<number, number>(); // bolge -> mesafe
  goruldu.set(merkez, 0);
  let sinir: number[] = [merkez];
  const sonuc: Array<{ bolge: number; siddetPpm: number }> = [];
  let siddet = siddetPpm;
  for (let mesafe = 0; mesafe <= menzil; mesafe++) {
    if (siddet <= 0) break;
    for (const bo of sinir) sonuc.push({ bolge: bo, siddetPpm: siddet });
    if (mesafe === menzil) break;
    const yeni: number[] = [];
    for (const bo of sinir) {
      for (const k of tb.karaKomsu[bo] as number[]) {
        if (!goruldu.has(k)) {
          goruldu.set(k, mesafe + 1);
          yeni.push(k);
        }
      }
    }
    sinir = yeni;
    siddet = carpBol(siddet, yayilimPpm, PPM);
  }
  sonuc.sort((x, y) => x.bolge - y.bolge);
  return sonuc;
}

/**
 * Günlük tik (olay `iklim_gunluk`): her takvim günü başında çalışır. Sırası:
 * (1) gün sayacı, (2) biten olaylar silinir, (3) olay çekimleri (her bölge x tür için tam bir çekim),
 * (4) bölgelerin iklim hasat oranı ve olay şiddeti, sahipli bölgelerde toprak güncellenir, (5) sonraki tık planlanır
 * ve lojistik kirletilir (çıktı çarpanları değişti).
 */
export function iklimGunluk(d: Dunya, ctx: Baglam): void {
  const tb = tarimTablosu(ctx.ic);
  const iklim = d.iklim;
  if (tb === null || iklim === undefined) return;
  const t = d.zaman;
  const ik = tb.iklim;
  const gun = iklim.sonGun + 1;
  iklim.sonGun = gun;
  const takvim = ((gun % YIL_GUNU) + YIL_GUNU) % YIL_GUNU;
  const ay = tb.gunAyi[takvim] as number;
  const n = d.bolgeler.length;
  // Olay çekimleri yalnız harita (merkez) bölgelerinde: mülk kipinin işletme düğümleri merkezlerinin iklimini paylaşır
  // (bölge kipinde nh = n; çekim sayısı ve sırası değişmez).
  const nh = ctx.ic.harita.bolgeler.length < n ? ctx.ic.harita.bolgeler.length : n;

  // (2) Biten olayları sil (bitis <= t).
  if (iklim.olaylar.some((o) => o.bitis <= t)) iklim.olaylar = iklim.olaylar.filter((o) => o.bitis > t);

  // (3) Olay çekimleri: bölge indeksi artan, her bölge için olay türü sırasıyla tam bir çekim.
  for (let bi = 0; bi < nh; bi++) {
    const tip = ctx.ic.harita.bolgeler[bi]?.tarim?.iklimTipi;
    const tipIndeks = tip === undefined ? -1 : IKLIM_TIPI_SIRASI.indexOf(tip);
    for (const tur of OLAY_TURU_SIRASI) {
      const cekim = ctx.rastgeleAralik(d, "olay", PPM);
      if (tipIndeks < 0) continue;
      const profil = ik.olaylar[tur];
      const carpan = ik.tipOlasilikCarpaniPpm[tur][tip as keyof typeof ik.hasatEgrisiPpm];
      const olasilik = carpBol(profil.olasilikPpmGun[ay] as number, carpan, PPM);
      if (cekim >= olasilik) continue;
      // Olay oluştu: şiddet ve süre için iki ek çekim.
      const siddet = profil.siddetMinPpm + ctx.rastgeleAralik(d, "olay", profil.siddetMaxPpm - profil.siddetMinPpm + 1);
      const sureGun = profil.sureGunMin + ctx.rastgeleAralik(d, "olay", profil.sureGunMax - profil.sureGunMin + 1);
      const etkiBaslangic = t + takvimMs(tb, ik.uyariSaat * SAAT);
      const olay: IklimOlayi = {
        id: ctx.yeniKimlik(d),
        tur,
        merkez: bi,
        uyari: t,
        etkiBaslangic,
        bitis: etkiBaslangic + takvimMs(tb, sureGun * 86_400_000),
        siddetPpm: siddet,
        etki: yayilimHesapla(tb, bi, siddet, profil.menzilKenar, profil.yayilimPpm),
      };
      iklim.olaylar.push(olay);
    }
  }

  // (4) Bölge başına iklim hasat oranı, olay şiddeti ve toprak.
  // Etkin tarım olaylarının bölge başına birleşimi: kalan = Π (PPM - şiddet) / PPM (kuraklık şiddeti sulamayla azalır).
  const kalan: number[] = new Array<number>(n).fill(PPM);
  // Mülk kipi: merkez bölge -> o merkeze bağlı işletme düğümleri (olay etkisi merkezle aynı; sulama koruması düğümün kendi sulamasıyla).
  let bagli: number[][] | null = null;
  if (nh < n) {
    bagli = [];
    for (let i = 0; i < nh; i++) bagli.push([]);
    for (let i = nh; i < n; i++) {
      const mz = (d.bolgeler[i] as BolgeDurumu).merkez;
      if (mz !== undefined) (bagli[mz] as number[]).push(i);
    }
  }
  for (const o of iklim.olaylar) {
    if (!TARIMI_ETKILEYEN_OLAY[o.tur]) continue;
    if (t < o.etkiBaslangic || t >= o.bitis) continue;
    const kalanSure = o.bitis - t;
    const toplamSure = o.bitis - o.etkiBaslangic;
    for (const e of o.etki) {
      const tarimTanim = ctx.ic.harita.bolgeler[e.bolge]?.tarim;
      const uygula = (hedef: number): void => {
        const b = d.bolgeler[hedef];
        if (b === undefined || b.tarim === undefined) return;
        let s = carpBol(e.siddetPpm, kalanSure, toplamSure);
        if (o.tur === "kuraklik" && tarimTanim !== undefined) {
          const koruma = carpBol(carpBol(sulamaDuzeyi(tb, b), ik.sulamaKuraklikKorumaPpm, PPM), tarimTanim.sulanabilirPpm, PPM);
          s = carpBol(s, PPM - koruma, PPM);
        }
        kalan[hedef] = carpBol(kalan[hedef] as number, PPM - s, PPM);
      };
      uygula(e.bolge);
      if (bagli !== null) for (const i of bagli[e.bolge] ?? []) uygula(i);
    }
  }

  const tp = tb.tarim;
  for (let bi = 0; bi < n; bi++) {
    const b = d.bolgeler[bi] as BolgeDurumu;
    const ts = b.tarim;
    if (ts === undefined) continue;
    const tanim = ctx.ic.harita.bolgeler[b.merkez ?? bi]?.tarim;
    if (tanim === undefined) continue;
    const tipIndeks = IKLIM_TIPI_SIRASI.indexOf(tanim.iklimTipi);
    const hasat = (tb.hasatGunluk[tipIndeks] as number[])[takvim] as number;
    const sulamaEtkisi = carpBol(carpBol(sulamaDuzeyi(tb, b), ik.sulamaDipPpm, PPM), tanim.sulanabilirPpm, PPM);
    ts.iklimPpm = hasat + carpBol(sulamaEtkisi, hasat < PPM ? PPM - hasat : 0, PPM);
    ts.olayKaybiPpm = PPM - (kalan[bi] as number);

    // Toprak: yalnız sahipli bölgede ve işlenen (ekili tesisi olan) bölgede sürüklenir; sahipsiz bölge uykudadır.
    if (b.sahip !== null && ekiliTesisVar(tb, b)) {
      let agirlikli = 0;
      for (let i = 0; i < tb.urun.length; i++) {
        agirlikli += (ts.ekimPpm[i] as number) * (tb.urun[i] as { toprakDegisimPpmGun: number }).toprakDegisimPpmGun;
      }
      let delta = carpBol(agirlikli, 1, PPM);
      if (ts.gubreDozu > 0) {
        delta += carpBol(ts.gubreDozu * tp.gubreToprakPpmGun, ts.gubreKarsilanmaPpm, PPM);
      }
      ts.toprakPpm = kelepce(ts.toprakPpm + delta, tp.toprakTabaniPpm, PPM);
    }
  }

  // (5) Sonraki günlük tık: takvim günü (gun - baslangicGunu + 1). tık zamanı = ceil(j x GUN / gunCarpani).
  const j = gun - ik.baslangicGunu + 1;
  ctx.planla(d, carpBolTavan(j, 86_400_000, ik.gunCarpani), { tur: "iklim_gunluk" });
  ctx.kirlet(d);
}
