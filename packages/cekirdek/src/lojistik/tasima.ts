import { MULKSUZ_PAKET } from "../mulksuz";
import { stokEsikMesafesi } from "../stok";
import { kuyrukSuz } from "../kuyruk";
import { MILI, PPM, SAAT } from "../tipler";
import type { Akis, Baglam, DerlenmisIcerik, Dunya, KenarDurumu, OyuncuDurumu } from "../tipler";

export function tasimaEtkin(d: Dunya, ic: DerlenmisIcerik): boolean {
  return !MULKSUZ_PAKET && d.mulk !== undefined && ic.mulk !== undefined && ic.param.lojistik.tasima?.etkin === true;
}

/** Tarifesi sıfır olan fiziksel kenarlar da ücretsiz havuz gibi açık kalır. */
export function maliyetliTasimaKenari(d: Dunya, ic: DerlenmisIcerik, k: KenarDurumu): boolean {
  const p = ic.param.lojistik.tasima;
  if (!tasimaEtkin(d, ic) || p === undefined || k.sureMs <= 0 || p.turCarpaniPpm[k.tur] <= 0) return false;
  const fiyat = d.pazar.fiyat[ic.malIndeks.yakit ?? -1] ?? 0;
  return p.isletmeBirimMili > 0 || (fiyat > 0 && p.yakitBirimPpm > 0);
}

/** Bütün yol ve iki hizmet bileşeni tek rasyonelde, akış başına bir kez aşağı yuvarlanır. */
function akisBedeli(d: Dunya, ic: DerlenmisIcerik, a: Akis): number {
  const p = ic.param.lojistik.tasima!;
  if (a.oranSaat <= 0) return 0;
  let sure = 0n;
  for (const e of a.yol) {
    const k = d.kenarlar[e]!;
    sure += BigInt(k.sureMs) * BigInt(p.turCarpaniPpm[k.tur]);
  }
  const fiyat = d.pazar.fiyat[ic.malIndeks.yakit!] as number;
  const birim = BigInt(p.isletmeBirimMili) * BigInt(PPM) + BigInt(fiyat) * BigInt(p.yakitBirimPpm);
  const x = BigInt(a.oranSaat) * sure * birim / (BigInt(MILI) * BigInt(SAAT) * BigInt(PPM) ** 2n);
  const bedel = Number(x);
  if (!Number.isSafeInteger(bedel)) throw new RangeError("tasima bedeli guvenli tamsayi araligini asti");
  return bedel;
}

/** Yalnız kendi işletmeleri arasındaki gerçek sevk; ulaşmış/yoldaki teslim ayrıca ücretlendirilmez. */
export function tasimaBedelleriniYaz(d: Dunya, ic: DerlenmisIcerik, akislar: readonly Akis[]): void {
  const etkin = tasimaEtkin(d, ic);
  for (const b of d.bolgeler) {
    if (etkin && b.merkez !== undefined && b.sahip !== null) b.tasimaBedeliMiliSaat = 0;
    else if (b.tasimaBedeliMiliSaat !== undefined) delete b.tasimaBedeliMiliSaat;
  }
  for (const a of akislar) {
    const kaynak = d.bolgeler[a.kaynak];
    const hedef = d.bolgeler[a.hedef];
    if (!etkin || kaynak?.merkez === undefined || hedef?.merkez === undefined || kaynak.sahip !== a.sahip || hedef.sahip !== a.sahip) {
      if (a.tasimaBedeliMiliSaat !== undefined) delete a.tasimaBedeliMiliSaat;
      continue;
    }
    const bedel = akisBedeli(d, ic, a);
    a.tasimaBedeliMiliSaat = bedel;
    const toplam = (kaynak.tasimaBedeliMiliSaat ?? 0) + bedel;
    if (!Number.isSafeInteger(toplam)) throw new RangeError("tasima kaynak toplami guvenli tamsayi araligini asti");
    kaynak.tasimaBedeliMiliSaat = toplam;
  }
}

/** Aynı hazine sürümü/eşik için tekrar çözüm yeni olay yığmaz. */
export function tasimaHazineEsigiPlanla(d: Dunya, ctx: Baglam, o: OyuncuDurumu, bedel: number): void {
  if (!tasimaEtkin(d, ctx.ic) || bedel <= 0 || o.hazine.yerelOran >= 0 || o.hazine.miktar <= 0) return;
  const dt = stokEsikMesafesi(o.hazine);
  if (dt < 1) return;
  const t = d.zaman + dt;
  if (!Number.isSafeInteger(t)) throw new RangeError("tasima hazine esigi guvenli zaman araligini asti");
  if (d.kuyruk.some((e) => e.t === t && e.veri.tur === "tasima_hazine_esik" && e.veri.oyuncu === o.id && e.veri.surum === o.hazine.surum)) return;
  ctx.planla(d, t, { tur: "tasima_hazine_esik", oyuncu: o.id, surum: o.hazine.surum });
}

/** Bakiye komutla değişince sürüm aynı kalabilir: eski eşik zamanı da geçerliliğe dahildir. */
export function tasimaEsikleriniBuda(d: Dunya, ic: DerlenmisIcerik): void {
  if (!d.kuyruk.some((e) => e.veri.tur === "tasima_hazine_esik")) return;
  const etkin = tasimaEtkin(d, ic);
  const sahipler = new Map(d.oyuncular.map((o) => [o.id, o]));
  const ucretli = new Set(d.lojistik.akislar.filter((a) => (a.tasimaBedeliMiliSaat ?? 0) > 0).map((a) => a.sahip));
  kuyrukSuz(d.kuyruk, (e) => {
    if (e.veri.tur !== "tasima_hazine_esik") return true;
    const o = sahipler.get(e.veri.oyuncu);
    if (!etkin || !o || !ucretli.has(o.id) || o.hazine.surum !== e.veri.surum) return false;
    const dt = stokEsikMesafesi(o.hazine);
    return dt >= 1 && e.t === d.zaman + dt;
  });
}
