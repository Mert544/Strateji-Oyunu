/**
 * Etkin kuralı sarmalayıcısı: `DerlenmisIcerik`'ten en küçük girdiyi (`DefterEtkinGirdisi`) kurar ve protokolün `kavramEtkin`'ine verir (kural tek yerde, istemci aynı işlevi çağırır).
 * Defter (`siradaki.etkin`) ve yazar (etkin olmayan kavram/damga değerlendirilmez) AYNI yoldan geçer. `dedektor.ts` protokole bağlı DEĞİLDİR; bu dosya sunucu tarafı yapıştırıcıdır.
 */
import type { DerlenmisIcerik } from "@bolge/cekirdek";
import { kavramEtkin as protokolKavramEtkin } from "@bolge/protokol";
import type { DefterEtkinGirdisi } from "@bolge/protokol";

const onbellek = new WeakMap<DerlenmisIcerik, DefterEtkinGirdisi>();

/** İçerikten girdi (içerik değişmezdir: `ic` başına bir kez kurulur). */
export function etkinGirdisi(ic: DerlenmisIcerik): DefterEtkinGirdisi {
  let g = onbellek.get(ic);
  if (g === undefined) {
    const mallar = new Set<string>();
    for (const y of ic.yontemler) for (const m of Object.keys(y.ciktilar)) mallar.add(m);
    g = { yontemCiktilari: mallar, perakende: ic.mulk?.perakende !== undefined };
    onbellek.set(ic, g);
  }
  return g;
}

/** Kavram içerikte etkin mi (protokol kuralı). */
export function kavramEtkin(ic: DerlenmisIcerik, kavram: string): boolean {
  return protokolKavramEtkin(etkinGirdisi(ic), kavram);
}
