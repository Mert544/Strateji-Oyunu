/**
 * Yürüyüş karo işçisi: PMTiles (HTTP aralık istekleri) → MVT çözümü → birleştirilmiş geometri.
 * Tamponlar aktarılabilir olarak döner (kopya yok). Ana iş parçacığı yalnız GPU'ya yükler.
 */
import { PMTiles } from "pmtiles";
import { ISTENEN_KATMANLAR, karoGeometrisi } from "./karo-geometri";
import type { KaroGeometrisi } from "./karo-geometri";
import { mvtCoz } from "./mvt";

export type IsciyeKaro = { tur: "kur"; url: string } | { tur: "karo"; no: number; z: number; x: number; y: number; olcek: number };

export type KarodanMesaj =
  | { tur: "karo"; no: number; x: number; y: number; geo: KaroGeometrisi; bayt: number; ms: number; bos: boolean }
  | { tur: "hata"; no: number; x: number; y: number; mesaj: string };

let arsiv: PMTiles | null = null;

const kapsam = self as unknown as { onmessage: ((e: MessageEvent<IsciyeKaro>) => void) | null; postMessage: (m: KarodanMesaj, aktar?: Transferable[]) => void };

kapsam.onmessage = (e) => {
  const m = e.data;
  if (m.tur === "kur") {
    arsiv = new PMTiles(m.url);
    return;
  }
  void karoIsle(m);
};

async function karoIsle(m: Extract<IsciyeKaro, { tur: "karo" }>): Promise<void> {
  const t0 = performance.now();
  try {
    if (!arsiv) throw new Error("karo arşivi kurulmadı");
    const r = await arsiv.getZxy(m.z, m.x, m.y);
    const bayt = r ? new Uint8Array(r.data) : null;
    const geo = karoGeometrisi(bayt ? { katmanlar: mvtCoz(bayt, ISTENEN_KATMANLAR), olcek: m.olcek } : { katmanlar: new Map(), olcek: m.olcek, bos: true });
    const aktar: Transferable[] = [];
    for (const p of [geo.yer, geo.bina]) aktar.push(p.konum.buffer, p.sinif.buffer, p.golge.buffer, p.indeks.buffer);
    aktar.push(geo.cizgi.konum.buffer, geo.cizgi.sinif.buffer);
    aktar.push(geo.iz.nokta.buffer, geo.iz.halkaBas.buffer, geo.iz.bina.buffer, geo.iz.ust.buffer);
    kapsam.postMessage({ tur: "karo", no: m.no, x: m.x, y: m.y, geo, bayt: bayt?.length ?? 0, ms: performance.now() - t0, bos: !bayt }, aktar);
  } catch (e) {
    kapsam.postMessage({ tur: "hata", no: m.no, x: m.x, y: m.y, mesaj: e instanceof Error ? e.message : String(e) });
  }
}
