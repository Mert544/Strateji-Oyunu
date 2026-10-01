/**
 * Kapsam hesabı (çözümün 8. adımı): her sahipli bölge × mal için karşılanma oranı, en yakın kaynağa süre
 * ve açıklık nedeni. Sahipsiz bölgeler yalnızca yerel (kendi kendine yeter) değerlendirilir.
 */
import type { BolgeHesabi } from "../ekonomi/uretim";
import type { Baglam, Dunya, KapsamHucresi, Mili } from "../tipler";
import { SAAT } from "../tipler";
import type { OyuncuAgi } from "./akis";
import type { GrafKenari } from "./graf";
import { EN_AZ_AKIS } from "./akis";
import { aciklikNedeni, cokKaynakliDijkstra, karsilanmaPpm } from "./kapsam";

const MESAFE_ESIGI_MS = 72 * SAAT;

function hucre(karsilanma: number, mesafe: number, neden: KapsamHucresi["neden"]): KapsamHucresi {
  return { karsilanmaPpm: karsilanma, enYakinKaynakMs: mesafe, neden };
}

/**
 * Kapsam satırı hücresini yazar. Hücre varsa YERİNDE güncellenir (çıktı aynı; her çözümde bölge × mal nesne üretilmez: GC yükü); yoksa oluşturulur.
 * Durum metni değişmez (hücre içeriği aynı alanlardır). Satır nesneleri çözüm dışında paylaşılmaz (anlık görüntü ve klon derin kopyadır).
 */
function yaz(satir: KapsamHucresi[], m: number, karsilanma: number, mesafe: number, neden: KapsamHucresi["neden"]): void {
  const c = satir[m];
  if (c === undefined) {
    satir[m] = hucre(karsilanma, mesafe, neden);
    return;
  }
  c.karsilanmaPpm = karsilanma;
  c.enYakinKaynakMs = mesafe;
  c.neden = neden;
}

/** Yerel karşılanan miktar: yerel arz + gelen akış (+ stok). Stok en az 1 saatlik talebi karşılıyorsa tam karşılanır. */
function karsilanan(h: BolgeHesabi, m: number, gelenAkis: number): number {
  const talep = h.talep[m] as number;
  const s = h.stok[m] as number;
  if (s > 0 && s >= talep) return talep;
  return (h.arz[m] as number) + gelenAkis + (s > 0 ? s : 0);
}

export function kapsamiHesapla(
  d: Dunya,
  _ctx: Baglam,
  hesaplar: readonly BolgeHesabi[],
  fazla: readonly (readonly Mili[])[],
  gelen: readonly (readonly Mili[])[],
  giden: readonly (readonly Mili[])[],
  agler: readonly OyuncuAgi[],
  kalan: readonly number[],
): void {
  const nm = d.pazar.fiyat.length;
  const kapsam = d.lojistik.kapsam;

  // Sahipsiz bölgeler: yalnızca yerel.
  for (const h of hesaplar) {
    if (h.bolge.sahip !== null) continue;
    const satir = kapsam[h.indeks] as KapsamHucresi[];
    for (let m = 0; m < nm; m++) {
      const talep = h.talep[m] as number;
      if (talep <= 0) {
        yaz(satir, m, 1_000_000, -1, "yok");
        continue;
      }
      const k = karsilanan(h, m, 0);
      const arzVar = (h.arz[m] as number) > 0;
      yaz(satir, m, karsilanmaPpm(talep, k), arzVar ? 0 : -1, aciklikNedeni({
        talep,
        karsilanan: k,
        arzVarMi: arzVar,
        mesafe: arzVar ? 0 : -1,
        mesafeKapasiteliKenarlarla: arzVar ? 0 : -1,
        mesafeEsigiMs: MESAFE_ESIGI_MS,
      }));
    }
  }

  // Sahipli bölgeler: oyuncu ağı üzerinden.
  // Aynı ağ imzalı oyuncular (mülk kipinde hepsi: merkez ağı) aynı graf kenarlarını paylaşır; bir kez kurulur.
  let sonImza: string | null = null;
  const mesafeOnbellegi = new Map<string, { mesafe: number[]; kap: number[] }>();
  let gk: GrafKenari[] = [];
  for (const ag of agler) {
    if (ag.bolgeler.length === 0) continue;
    if (ag.imza !== sonImza) {
      sonImza = ag.imza;
      gk = [];
      for (const e of ag.kenarlar) {
        const k = d.kenarlar[e]!;
        gk.push({ u: ag.dugumIndeks[k.a] as number, v: ag.dugumIndeks[k.b] as number, kapasite: k.kapasiteSaat, maliyet: k.sureMs });
      }
    }
    const nd = ag.dugumler.length;
    for (let m = 0; m < nm; m++) {
      // Hızlı yol: ağda bu mala TALEP eden bölge yoksa her satır "yok" (kaynak/Dijkstra/akış gerekmez; sonuç aynı).
      let talepVar = false;
      for (const r of ag.bolgeler) {
        if (((hesaplar[r] as BolgeHesabi).talep[m] as number) > 0) {
          talepVar = true;
          break;
        }
      }
      if (!talepVar) {
        for (const r of ag.bolgeler) yaz(kapsam[r] as KapsamHucresi[], m, 1_000_000, -1, "yok");
        continue;
      }
      // Hücreler ve ihtiyaç: yerelde tam karşılanmayan var mı?
      const karsilananlar: number[] = [];
      let dijkstraGerek = false;
      const kaynaklar: number[] = [];
      let arzVar = false;
      for (const r of ag.bolgeler) {
        const f = (fazla[r] as readonly Mili[])[m] as number;
        if (f > 0) kaynaklar.push(ag.dugumIndeks[r] as number);
        // Ağda "arz var" = akışlar dağıtıldıktan sonra da kullanılmamış belirgin bir fazla kalmış (nicemleme ve ölü
        // bant artığını saymamak için fazlanın 1/8'i ve EN_AZ_AKIS üstünde). Fazla dağıtılmışsa eksik gerçekten
        // girdi kıtlığıdır; fazla kaldıysa kapasite/mesafe/erişim sorunudur.
        const artan = f - ((giden[r] as readonly Mili[])[m] as number);
        if (f > 0 && artan >= EN_AZ_AKIS && artan * 8 >= f) arzVar = true;
      }
      for (const r of ag.bolgeler) {
        const h = hesaplar[r] as BolgeHesabi;
        const talep = h.talep[m] as number;
        const k = talep > 0 ? karsilanan(h, m, (gelen[r] as readonly Mili[])[m] as number) : 0;
        karsilananlar.push(k);
        if (talep > 0 && karsilanmaPpm(talep, k) < 990_000) dijkstraGerek = true;
      }
      let mesafe: number[] | null = null;
      let mesafeKap: number[] | null = null;
      if (dijkstraGerek && kaynaklar.length > 0) {
        // Mülk kipi: aynı ağ ve aynı kaynak kümesi aynı mesafeleri verir (çok oyuncu aynı merkezlerdedir): çağrı içi önbellek.
        const anahtar = ag.uyeler === undefined ? null : `${ag.imza}|${kaynaklar.join(",")}`;
        let m2 = anahtar === null ? undefined : mesafeOnbellegi.get(anahtar);
        if (m2 === undefined) {
          m2 = {
            mesafe: cokKaynakliDijkstra(nd, gk, kaynaklar).mesafe,
            kap: cokKaynakliDijkstra(nd, gk, kaynaklar, { kapasiteliMi: (i) => ((kalan[ag.kenarlar[i] as number] as number) > 0) }).mesafe,
          };
          if (anahtar !== null) mesafeOnbellegi.set(anahtar, m2);
        }
        mesafe = m2.mesafe;
        mesafeKap = m2.kap;
      }
      for (let i = 0; i < ag.bolgeler.length; i++) {
        const r = ag.bolgeler[i] as number;
        const h = hesaplar[r] as BolgeHesabi;
        const talep = h.talep[m] as number;
        const satir = kapsam[r] as KapsamHucresi[];
        if (talep <= 0) {
          yaz(satir, m, 1_000_000, -1, "yok");
          continue;
        }
        const k = karsilananlar[i] as number;
        const ppm = karsilanmaPpm(talep, k);
        const dn = ag.dugumIndeks[r] as number;
        const ms = mesafe ? (mesafe[dn] as number) : (fazla[r] as readonly Mili[])[m]! > 0 ? 0 : -1;
        const msKap = mesafeKap ? (mesafeKap[dn] as number) : ms;
        yaz(satir, m, ppm, ms, aciklikNedeni({
          talep,
          karsilanan: k,
          arzVarMi: arzVar,
          mesafe: ms,
          mesafeKapasiteliKenarlarla: msKap,
          mesafeEsigiMs: MESAFE_ESIGI_MS,
        }));
      }
    }
  }
}
