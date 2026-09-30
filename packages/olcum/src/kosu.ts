/** Hipotez seçimi ve sıralı çalıştırma (CLI ve testler için ortak giriş). */
import { h1Kos } from "./h1";
import { h2Kos } from "./h2";
import { h3Kos } from "./h3";
import { h5Kos } from "./h5";
import { h6Kos } from "./h6";
import { h7Kos } from "./h7";
import { TUM_HIPOTEZLER } from "./tipler";
import type { HipotezKimligi, HipotezSecenek, HipotezSonucu } from "./tipler";

export function hipotezAyristir(metin: string): HipotezKimligi[] {
  const sonuc = new Set<HipotezKimligi>();
  for (const p of metin.split(",")) {
    const k = p.trim().toUpperCase();
    if (k === "") continue;
    if (k === "TUMU" || k === "HEPSI") {
      TUM_HIPOTEZLER.forEach((h) => sonuc.add(h));
      continue;
    }
    if (!(TUM_HIPOTEZLER as readonly string[]).includes(k)) throw new Error(`bilinmeyen hipotez: ${p} (gecerli: ${TUM_HIPOTEZLER.join(", ")})`);
    sonuc.add(k as HipotezKimligi);
  }
  if (sonuc.size === 0) throw new Error("hipotez listesi bos");
  return TUM_HIPOTEZLER.filter((h) => sonuc.has(h));
}

const KOSUCULAR: Record<HipotezKimligi, (s: HipotezSecenek) => HipotezSonucu> = {
  H1: h1Kos,
  H2: h2Kos,
  H3: h3Kos,
  H5: h5Kos,
  H6: h6Kos,
  H7: h7Kos,
};

export function calistir(s: HipotezSecenek & { hipotezler: readonly HipotezKimligi[] }): HipotezSonucu[] {
  const { hipotezler, ...secenek } = s;
  return hipotezler.map((h) => {
    secenek.ilerleme?.(`== ${h} basliyor ==`);
    const r = (KOSUCULAR[h] as (s: HipotezSecenek) => HipotezSonucu)(secenek);
    secenek.ilerleme?.(`== ${h} bitti: ${r.verdict} (${(r.sureMs / 1000).toFixed(1)} sn) ==`);
    return r;
  });
}
