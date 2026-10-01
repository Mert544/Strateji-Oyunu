/**
 * Yürüyüş girişi (kabukta, küçük): L4 yığınını ilk kullanımda tembel yükler ve açar.
 *
 * Tek dosya HTML'de (mode "tek") yığın ayrı `yuru.js` dosyasıdır (harita.js gibi HTML'in yanında; satır içine
 * gömülmez, 400 KB bütçesi korunur). three.js yeniden paketlenmez: kabuk köprü nesnesini (three-kopru.ts)
 * `globalThis`'e koyar, yuru.js onu kullanır. Çok dosyalı derlemede ve geliştirmede vite'ın tembel parçası.
 */
import "./giris.css";
import type { MulkBaglantisi } from "../harita/baglanti";
import type { Izgara } from "../harita/hucre";
import { veriKoku } from "../harita/veri";
import { KOPRU_ADI, THREE_KOPRU } from "./three-kopru";

type YuruModulu = typeof import("./sahne");

export interface YuruAcma {
  boylam: number;
  enlem: number;
  ilce: string | null;
  ilceAd: string;
  izgaraAl: () => Promise<Izgara | null>;
  baglanti: MulkBaglantisi | null;
  donus: () => void;
}

function yuruModulu(): Promise<YuruModulu> {
  if (import.meta.env.MODE === "tek") {
    (globalThis as Record<string, unknown>)[KOPRU_ADI] = THREE_KOPRU;
    const url = new URL("./yuru.js", location.href).href;
    return (import(/* @vite-ignore */ url) as Promise<YuruModulu>).catch(() => {
      throw new Error("Yürüyüş yığını (yuru.js) yüklenemedi; dunya.html'in yanında olmalı ve sayfa HTTP üzerinden açılmalı.");
    });
  }
  return import("./sahne");
}

/** Protomaps z15 özütü: `?yuru-karo=<url>` (ya da haritanın `?altlik=`), yoksa `harita-verisi/karolar/gebze-z15.pmtiles`. */
export function yuruKaroUrl(): string {
  const q = new URLSearchParams(location.search);
  const u = q.get("yuru-karo") ?? q.get("altlik");
  return new URL(u ?? veriKoku() + "karolar/gebze-z15.pmtiles", location.href).href;
}

let modul: Promise<YuruModulu> | null = null;

export async function yuruAc(sahneKap: HTMLElement, a: YuruAcma): Promise<void> {
  if (location.protocol === "file:") throw new Error("Sokak yürüyüşü file:// altında açılamaz; sayfayı bir HTTP sunucusundan açın.");
  modul ??= yuruModulu().catch((e: unknown) => {
    modul = null;
    throw e;
  });
  const m = await modul;
  await m.yuruSahnesi(sahneKap).ac({ ...a, karoUrl: yuruKaroUrl() });
}
