/** Genel onarım için komut ve sahip karesinin ortak, salt okunan hesabı. */
import { icerikTablosu } from "../ekonomi/tablo";
import { carpBol } from "../sabit";
import { anlikMiktar } from "../stok";
import { PPM, SAAT } from "../tipler";
import type { DerlenmisIcerik, Dunya, GenelOnarimGorunumu, GenelOnarimTeklifi, OyuncuId } from "../tipler";
import { olcekKademesi } from "./carpan";
import { sanayiTablosu } from "./tablo";

/** Hesap, uzlaştırma, RNG, kuyruk veya dünya kaydı yazmaz. */
export function genelOnarimGorunumu(d: Readonly<Dunya>, ic: DerlenmisIcerik, oyuncu: OyuncuId, bolge: string): GenelOnarimGorunumu | undefined {
  if (ic.param.sanayi === undefined) return undefined;
  const b = d.bolgeler.find((x) => x.id === bolge);
  const o = d.oyuncular.find((x) => x.id === oyuncu);
  if (b === undefined || b.sahip !== oyuncu || o === undefined) return undefined;
  const sn = sanayiTablosu(ic);
  if (sn === null) return undefined;
  const tb = icerikTablosu(ic);
  const hedefler = b.tesisler.filter((x) => (x.asinmaPpm ?? 0) > 0);
  const onarim = d.insaatlar.find((x) => x.tur === "onarim" && x.bolge === b.indeks);
  const g: GenelOnarimGorunumu = { uygun: false };
  if (onarim !== undefined) {
    g.suruyor = {
      bitis: onarim.bitis,
      tesisler: b.tesisler.filter((x) => x.onarimBitis === onarim.bitis && x.onarimBitis > d.zaman).map((x) => x.id).sort((a, z) => a - z),
    };
  }
  if (hedefler.length > 0) {
    const toplamMal = new Map<number, number>();
    let para = 0;
    // Eski komutla aynı iki floor, her tesis ve mal kalemi için toplamadan önce uygulanır.
    for (const ts of hedefler) {
      const tur = tb.tur[ts.tur];
      if (tur === undefined) continue;
      const oran = carpBol(olcekKademesi(sn, ts).insaPpm, sn.p.bakim.genelOnarimMaliyetPpm, PPM);
      for (const [m, q] of tur.insaMaliyeti) {
        const miktar = carpBol(q, oran, PPM);
        if (miktar > 0) toplamMal.set(m, (toplamMal.get(m) ?? 0) + miktar);
      }
      para += carpBol(tur.insaParasi, oran, PPM);
    }
    g.teklif = {
      tesisler: hedefler.map((x) => ({ tesis: x.id, tur: ic.tesisTurleri[x.tur]!.id, olcek: x.olcek ?? 0 })).sort((a, z) => a.tesis - z.tesis),
      paraMili: para,
      mal: [...toplamMal].map(([m, q]): [string, number] => [ic.mallar[m]!.id, q]).sort((a, z) => a[0] < z[0] ? -1 : a[0] > z[0] ? 1 : 0),
      durusMs: sn.p.bakim.genelOnarimDurusSaat * SAAT,
    };
    // Canlı yeterlilik salt okunur; legacy ilk eksik mal mesajı için içerik indeks sırası korunur.
    for (const [m, q] of [...toplamMal].sort((a, z) => a[0] - z[0])) {
      if (anlikMiktar(b.stoklar[m]!, d.zaman) < q) {
        g.engel = `yetersiz stok: ${b.id} (mal indeksi ${m})`;
        break;
      }
    }
    if (g.engel === undefined && anlikMiktar(o.hazine, d.zaman) < para) g.engel = "yetersiz hazine";
  }
  if (onarim !== undefined) g.engel = `bolgede onarim suruyor: ${bolge}`;
  else if (g.teklif === undefined) g.engel = `onarilacak asinma yok: ${bolge}`;
  else if (g.engel === undefined) g.uygun = true;
  return g;
}

/** İç protokol atlanmışsa da bozuk görülen teklif mutasyon öncesinde reddedilir. */
export function genelOnarimTeklifiGecerliMi(v: unknown): v is GenelOnarimTeklifi {
  if (v === null || typeof v !== "object" || Array.isArray(v)) return false;
  const x = v as Record<string, unknown>;
  const miktar = (q: unknown): q is number => typeof q === "number" && Number.isSafeInteger(q) && q >= 0;
  return miktar(x.paraMili) && miktar(x.durusMs) && Array.isArray(x.tesisler) && x.tesisler.length > 0 && x.tesisler.every((t: unknown) => {
    if (t === null || typeof t !== "object" || Array.isArray(t)) return false;
    const ts = t as Record<string, unknown>;
    return miktar(ts.tesis) && typeof ts.tur === "string" && ts.tur.length > 0 && (ts.olcek === 0 || ts.olcek === 1 || ts.olcek === 2);
  }) && Array.isArray(x.mal) && x.mal.every((m: unknown) => Array.isArray(m) && m.length === 2 && typeof m[0] === "string" && m[0].length > 0 && miktar(m[1]) && m[1] > 0);
}

/** Alanların nesne içindeki yazım sırasından bağımsız; kanonik dizi sıraları teklifin parçasıdır. */
export function genelOnarimTeklifleriAyniMi(a: GenelOnarimTeklifi, b: GenelOnarimTeklifi): boolean {
  return a.paraMili === b.paraMili && a.durusMs === b.durusMs && a.tesisler.length === b.tesisler.length && a.mal.length === b.mal.length &&
    a.tesisler.every((x, i) => x.tesis === b.tesisler[i]!.tesis && x.tur === b.tesisler[i]!.tur && x.olcek === b.tesisler[i]!.olcek) &&
    a.mal.every((x, i) => x[0] === b.mal[i]![0] && x[1] === b.mal[i]![1]);
}
