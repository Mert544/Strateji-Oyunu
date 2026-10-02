/** Sondajın ortak saf teklifi ve yalnız original sahibine kalıcı iş görünümü. */
import { hizlandirilmisSure } from "../erkenOyun";
import { anlikMiktar } from "../stok";
import { tarimTablosu } from "../tarim/tablo";
import { PPM, SAAT } from "../tipler";
import type { DerlenmisIcerik, Dunya, OyuncuId, SondajDurumu, SondajGorunumu, SondajOyuncuGorunumu, SondajTeklifi } from "../tipler";
import { sanayiTablosu } from "./tablo";

/** Sayaç tüketmez; kanonik JSON demeti kimlik ayraçlarının çakışmasını önler. */
export function sondajKimligi(bolge: string, mal: string, deneme: number): string {
  return JSON.stringify(["sondaj", bolge, mal, deneme]);
}

function isKopyasi(j: SondajDurumu): SondajDurumu {
  return {
    id: j.id, sahip: j.sahip, bolge: j.bolge, mal: j.mal, deneme: j.deneme,
    baslangic: j.baslangic, bitis: j.bitis, evre: j.evre,
    odenenTeklif: {
      mal: j.odenenTeklif.mal, kullanilanHak: j.odenenTeklif.kullanilanHak, hakTavani: j.odenenTeklif.hakTavani,
      paraMili: j.odenenTeklif.paraMili, malMaliyeti: j.odenenTeklif.malMaliyeti.map(([m, q]) => [m, q]),
      temelSureMs: j.odenenTeklif.temelSureMs, sureMs: j.odenenTeklif.sureMs,
      olasilikPpm: j.odenenTeklif.olasilikPpm, ekMinPpm: j.odenenTeklif.ekMinPpm, ekMaxPpm: j.odenenTeklif.ekMaxPpm,
    },
    ...(j.sonuc === undefined ? {} : { sonuc: { basarili: j.sonuc.basarili, ekMili: j.sonuc.ekMili, ...(j.sonuc.neden === undefined ? {} : { neden: j.sonuc.neden }) } }),
  };
}

/** Tüm bekleyen işler + son on gerçek sonuç; tarihsel sahibi değişmez ve okuma kayıt yazmaz. */
function kendiIsleri(d: Readonly<Dunya>, oyuncu: OyuncuId, bolge?: string): SondajDurumu[] {
  const kendi = (d.sondajlar ?? []).filter((j) => j.sahip === oyuncu);
  const sira = (a: SondajDurumu, b: SondajDurumu): number => a.bitis - b.bitis || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const biten = kendi.filter((j) => j.evre === "bitti").sort(sira).slice(-10);
  return [...kendi.filter((j) => j.evre === "suruyor"), ...biten].filter((j) => bolge === undefined || j.bolge === bolge).sort(sira).map(isKopyasi);
}

export function sondajOyuncuGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: OyuncuId): SondajOyuncuGorunumu | undefined {
  if (!d.oyuncular.some((o) => o.id === oyuncu) || (ic.param.sanayi === undefined && d.sondajlar === undefined)) return undefined;
  return { isler: kendiIsleri(d, oyuncu) };
}

/** Gerçek sahip düğümünde her uygun damar için canlı, mutasyonsuz maliyet/hak/süre tahmini. */
export function sondajGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: OyuncuId, bolge: string): SondajGorunumu | undefined {
  if (ic.param.sanayi === undefined) return undefined;
  const b = d.bolgeler.find((x) => x.id === bolge);
  const o = d.oyuncular.find((x) => x.id === oyuncu);
  if (b === undefined || b.sahip !== oyuncu || o === undefined) return undefined;
  const sn = sanayiTablosu(ic);
  if (sn === null) return undefined;
  const tt = tarimTablosu(ic);
  const dp = sn.p.damar;
  const malMaliyeti: Array<[string, number]> = Object.keys(dp.kesifMaliyetMal).sort().flatMap((id): Array<[string, number]> => {
    const q = dp.kesifMaliyetMal[id]!;
    return ic.malIndeks[id] !== undefined && q > 0 ? [[id, q]] : [];
  });
  const temelSureMs = dp.kesifSureSaat * SAAT;
  const sureMs = hizlandirilmisSure(d, { ic }, oyuncu, temelSureMs);
  const g: SondajGorunumu = { teklifler: [], isler: kendiIsleri(d, oyuncu, bolge) };
  for (let m = 0; m < ic.mallar.length; m++) {
    if (!sn.hamMal[m] || (b.rezervIlk[m] ?? 0) <= 0 || (tt !== null && b.tarim !== undefined && tt.tarimsalRezervMal[m] === true)) continue;
    const teklif: SondajTeklifi = {
      mal: ic.mallar[m]!.id, kullanilanHak: b.kesifSayisi?.[m] ?? 0, hakTavani: dp.kesifHakkiBolgeMal,
      paraMili: dp.kesifMaliyetPara, malMaliyeti: malMaliyeti.map(([id, q]) => [id, q]),
      temelSureMs, sureMs, olasilikPpm: dp.kesifOlasilikPpm, ekMinPpm: dp.kesifEkiMinPpm, ekMaxPpm: dp.kesifEkiMaxPpm,
    };
    let engel: string | undefined;
    if (teklif.kullanilanHak >= teklif.hakTavani) engel = `kesif hakki bitti: ${bolge} / ${teklif.mal}`;
    else {
      for (const [id, q] of [...malMaliyeti].sort((a, z) => ic.malIndeks[a[0]]! - ic.malIndeks[z[0]]!)) {
        const mi = ic.malIndeks[id]!;
        if (anlikMiktar(b.stoklar[mi]!, d.zaman) < q) { engel = `yetersiz stok: ${bolge} (mal indeksi ${mi})`; break; }
      }
      if (engel === undefined && anlikMiktar(o.hazine, d.zaman) < teklif.paraMili) engel = "yetersiz hazine";
    }
    g.teklifler.push({ teklif, uygun: engel === undefined, ...(engel === undefined ? {} : { engel }) });
  }
  g.teklifler.sort((a, z) => a.teklif.mal < z.teklif.mal ? -1 : a.teklif.mal > z.teklif.mal ? 1 : 0);
  return g;
}

export function sondajTeklifiGecerliMi(v: unknown): v is SondajTeklifi {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Record<string, unknown>;
  const sayi = (q: unknown): q is number => typeof q === "number" && Number.isSafeInteger(q) && q >= 0;
  if (typeof x.mal !== "string" || x.mal.length === 0) return false;
  for (const k of ["kullanilanHak", "hakTavani", "paraMili", "temelSureMs", "sureMs", "olasilikPpm", "ekMinPpm", "ekMaxPpm"]) if (!sayi(x[k])) return false;
  if ((x.olasilikPpm as number) > PPM || (x.ekMinPpm as number) > PPM || (x.ekMaxPpm as number) > 10 * PPM || (x.ekMinPpm as number) > (x.ekMaxPpm as number)) return false;
  return Array.isArray(x.malMaliyeti) && x.malMaliyeti.every((m: unknown) => Array.isArray(m) && m.length === 2 && typeof m[0] === "string" && m[0].length > 0 && sayi(m[1]) && m[1] > 0);
}

/** Süre tahmini guard dışındadır; başlatma anının gerçek süresi iş kaydında kesinleşir. */
export function sondajTeklifleriAyniMi(a: SondajTeklifi, b: SondajTeklifi): boolean {
  return a.mal === b.mal && a.kullanilanHak === b.kullanilanHak && a.hakTavani === b.hakTavani && a.paraMili === b.paraMili &&
    a.temelSureMs === b.temelSureMs && a.olasilikPpm === b.olasilikPpm && a.ekMinPpm === b.ekMinPpm && a.ekMaxPpm === b.ekMaxPpm &&
    a.malMaliyeti.length === b.malMaliyeti.length && a.malMaliyeti.every((x, i) => x[0] === b.malMaliyeti[i]![0] && x[1] === b.malMaliyeti[i]![1]);
}
