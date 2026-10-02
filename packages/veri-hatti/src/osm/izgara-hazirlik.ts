/** Üretim önkoşullarını dosya yazmadan, araç çalıştırmadan ve ağa çıkmadan toplar. */
import { accessSync, constants, statSync } from "node:fs";
import { PMTILES, TIPPECANOE } from "./izgara-arac";
import { karoOnbellekYolu, halkaSiniri, type IlceBilgisi } from "./izgara-ilce";
import type { IlceSiniri } from "./izgara-yerel-sinir";

export interface IzgaraHazirligi {
  hazir: boolean;
  agGerekli: boolean;
  ilceler: { kimlik: string; sinir?: IlceSiniri["kaynak"]; bbox?: [number, number, number, number]; karoYolu: string; karoVar: boolean }[];
  araclar: { ad: string; yol: string; var: boolean; gerekli: boolean }[];
  sorunlar: string[];
}

const calistirilabilir = (yol: string): boolean => {
  try { accessSync(yol, constants.X_OK); return statSync(yol).isFile(); } catch { return false; }
};

export function izgaraHazirligi(bilgiler: readonly IlceBilgisi[], sinirlar: ReadonlyMap<string, IlceSiniri>, sorunlar: readonly string[] = []): IzgaraHazirligi {
  const hata = [...sorunlar];
  const ilceler = bilgiler.map((b) => {
    const sinir = sinirlar.get(b.kimlik);
    const karoYolu = karoOnbellekYolu(b.kimlik);
    let karoVar = false;
    try { const s = statSync(karoYolu); karoVar = s.isFile() && s.size > 0; } catch { /* Eksik veya erişilemeyen karo aşağıda raporlanır. */ }
    if (!sinir) hata.push(`${b.kimlik}: gecerli sinir hazir degil`);
    if (!karoVar) hata.push(`${b.kimlik}: karo ozutu yok veya bos (${karoYolu}); edinmek icin ag gerekir`);
    return { kimlik: b.kimlik, ...(sinir ? { sinir: sinir.kaynak, bbox: halkaSiniri(sinir.halkalar) } : {}), karoYolu, karoVar };
  });
  const agGerekli = ilceler.some((i) => !i.karoVar);
  const araclar = [
    { ad: "tippecanoe", yol: TIPPECANOE, var: calistirilabilir(TIPPECANOE), gerekli: true },
    { ad: "pmtiles", yol: PMTILES, var: calistirilabilir(PMTILES), gerekli: agGerekli },
  ];
  for (const a of araclar) if (a.gerekli && !a.var) hata.push(`${a.ad}: calistirilabilir arac yok (${a.yol})`);
  return { hazir: hata.length === 0, agGerekli, ilceler, araclar, sorunlar: hata };
}
