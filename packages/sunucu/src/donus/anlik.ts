/**
 * Oyuncunun anlık çapa verisi (`SonGorulen`) — çekirdek durumunu YALNIZ OKUR (hiçbir şeyi uzlaştırmaz/yazmaz, `durumOzeti`ne girmez).
 * Tembel (kümülatif) sayaçlar `t = dunya.zaman` anına çekirdeğin kendi formülüyle taşınır: `toplam + oran × (t − t0) / SAAT`
 * (`pazarMuhasebesi` / `uretimMuhasebesi`). Böylece hesap adım taneciğinden bağımsızdır ve O(bölge × mal)'dır.
 */
import { SAAT, anlikMiktar, carpBol } from "@bolge/cekirdek";
import type { DerlenmisIcerik, Dunya, Ms } from "@bolge/cekirdek";
import type { SonGorulen } from "../depo/tipler";

export interface AnlikKaynagi {
  readonly dunya: Readonly<Dunya>;
  readonly ic: DerlenmisIcerik;
}

/** Tembel sayaç: `toplam` + işlenmemiş `oran × (t − t0)`. */
function tembel(toplam: number, oran: number, t0: Ms, t: Ms): number {
  const dt = t - t0;
  return dt > 0 && oran !== 0 ? toplam + carpBol(oran, dt, SAAT) : toplam;
}

/** Oyuncu yoksa null. `t` = dünyanın şimdiki zamanı (`dunya.zaman`). */
export function oyuncuAnligi(kaynak: AnlikKaynagi, oyuncu: string): SonGorulen | null {
  const d = kaynak.dunya;
  const o = d.oyuncular.find((x) => x.id === oyuncu);
  if (!o) return null;
  const t = d.zaman;
  const df = o.ticaretDefteri;
  const defter = {
    brutIhracat: df ? tembel(df.toplam.brutIhracat, df.oran.brutIhracat, df.t0, t) : 0,
    brutIthalat: df ? tembel(df.toplam.brutIthalat, df.oran.brutIthalat, df.t0, t) : 0,
    komisyon: df ? tembel(df.toplam.komisyon, df.oran.komisyon, df.t0, t) : 0,
    prim: df ? tembel(df.toplam.prim, df.oran.prim, df.t0, t) : 0,
  };
  const stok: Record<string, number> = {};
  const uretim: Record<string, number> = {};
  const mallar = kaynak.ic.mallar;
  for (const b of d.bolgeler) {
    if (b.sahip !== oyuncu) continue;
    for (let m = 0; m < mallar.length; m++) {
      const id = (mallar[m] as { id: string }).id;
      const s = b.stoklar[m];
      if (s) {
        const miktar = anlikMiktar(s, t);
        if (miktar !== 0) stok[id] = (stok[id] ?? 0) + miktar;
      }
      const u = tembel(b.uretimToplam[m] as number, b.uretimOrani[m] as number, b.uretimT0, t);
      if (u !== 0) uretim[id] = (uretim[id] ?? 0) + u;
    }
  }
  return { t, hazine: anlikMiktar(o.hazine, t), defter, stok, uretim };
}
