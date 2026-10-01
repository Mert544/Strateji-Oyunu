/**
 * Esnaf Defteri okuması (saf): çekirdek durumu + profil damgalarından `Defter` kurar. Tutar YAZILMAZ: ödül miktarları çekirdeğin ödül
 * tablosundan (`param.odul`) okunur; değerler çekirdeğin `odulDegeri`/`alinanOdulDegeri` işlevleriyle hesaplanır. Metin yoktur (şablon anahtarı).
 */
import { alinanOdulDegeri, odulDegeri } from "@bolge/cekirdek";
import type { DerlenmisIcerik, Dunya } from "@bolge/cekirdek";
import { DEFTER_ODUL_SIRASI, defterSablonu } from "@bolge/protokol";
import type { Defter, DefterKazanilan, DefterOdulu, DefterSiradaki } from "@bolge/protokol";
import type { Damga } from "../depo/tipler";
import { kavramEtkin } from "./etkin";

/** Kavramın ödülü çekirdek tablosundan (yoksa null). */
export function defterOdulu(ic: DerlenmisIcerik, kavram: string): DefterOdulu | null {
  const t = ic.param.odul;
  const deger = odulDegeri(ic, kavram);
  if (t === undefined || deger === undefined) return null;
  const k = t.kavramlar[kavram] as NonNullable<(typeof t.kavramlar)[string]>;
  const o: DefterOdulu = { degerMili: deger };
  if ((k.para ?? 0) > 0) o.paraMili = k.para as number;
  const mal = k.mal;
  if (mal !== undefined && Object.keys(mal).length > 0) {
    o.mal = {};
    for (const m of Object.keys(mal).sort()) o.mal[m] = mal[m] as number;
  }
  return o;
}

export function defterKur(ic: DerlenmisIcerik, d: Readonly<Dunya>, oyuncu: string, damgalar: readonly Damga[]): Defter | null {
  const o = d.oyuncular.find((x) => x.id === oyuncu);
  if (!o) return null;
  const tablo = ic.param.odul;
  const alinan = new Set(o.alinanOdul ?? []);
  const tByKavram = new Map(damgalar.filter((x) => x.kaynak === "odul").map((x) => [x.kavram, x.t]));
  const kazanilan: DefterKazanilan[] = [];
  for (const kavram of [...alinan].sort()) {
    const odul = defterOdulu(ic, kavram);
    const t = tByKavram.get(kavram);
    kazanilan.push({ kavram, sablon: defterSablonu(kavram), tur: "odul", ...(t !== undefined ? { t } : {}), ...(odul ? { odul } : {}) });
  }
  for (const g of damgalar) if (g.kaynak === "damga") kazanilan.push({ kavram: g.kavram, sablon: defterSablonu(g.kavram), tur: "damga", t: g.t });
  kazanilan.sort((a, b) => (a.t ?? Number.POSITIVE_INFINITY) - (b.t ?? Number.POSITIVE_INFINITY) || (a.kavram < b.kavram ? -1 : a.kavram > b.kavram ? 1 : 0));
  const siradaki: DefterSiradaki[] = [];
  if (tablo !== undefined) {
    const bilinen = new Set<string>(DEFTER_ODUL_SIRASI);
    const sira = [...DEFTER_ODUL_SIRASI, ...Object.keys(tablo.kavramlar).filter((k) => !bilinen.has(k)).sort()];
    for (const kavram of sira) {
      if (alinan.has(kavram)) continue;
      const odul = defterOdulu(ic, kavram);
      if (!odul) continue; // tabloda yok
      siradaki.push({ kavram, sablon: defterSablonu(kavram), etkin: kavramEtkin(ic, kavram), odul });
    }
  }
  return { kazanilan, siradaki, toplamOdulMili: alinanOdulDegeri(ic, o), tavanMili: tablo?.tavanMili ?? 0 };
}
