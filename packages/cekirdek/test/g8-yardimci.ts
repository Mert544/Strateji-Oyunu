/**
 * G8-2 kanıt testlerinin ortak yardımcıları (sartname docs/arastirma/p4-p5-sartname.md §8, §13.1 K-1, §16.2). G8'in iki yöntemi (`cam_firini`, `celik_dograma`; ev sahibi
 * `parca_fabrikasi`, `mulkKipi: true`) ve `yapi_market` dükkân türü, G8-1 verisi (T3, K4 commit'i) gelmeden de koşsun diye bellekte eklenir; veri paketinde zaten varsa DOKUNULMAZ.
 * Böylece aynı testler G8-1'den sonra gerçek paketle de aynı kodla koşar. Değerler A2 §1.4/§1.13 (t3 g8-icerik.patch) ile aynıdır; testler yalnız ilişkileri sınar.
 */
import type { MulkPerakendeParametreleri, VeriPaketi } from "@bolge/veri";
import { perakendeBlogu } from "../../veri/test/perakende-g7-yardimci";
import type { CekirdekVeriPaketi } from "../src/tipler";
import { g6MulkVeri, g6Veri } from "./g6-yardimci";
import type { G6Secenek } from "./g6-yardimci";

/** Şartname §3.2 sırası (G8): indeks 28 ve 29; G6'nın dört yönteminden SONRA. */
export const G8_YONTEMLER = ["cam_firini", "celik_dograma"] as const;

const SENTETIK_G8 = [
  { id: "cam_firini", ad: "Cam firini", girdiler: { silis: 60_000, yakit: 12_000, elektrik: 18_000 }, ciktilar: { cam: 50_000 }, isci: 5_000, bakim: { parca: 1_000 }, kirlilikPpmSaat: 60, mulkKipi: true },
  { id: "celik_dograma", ad: "Celik dograma", girdiler: { celik: 24_000, cam: 32_000, parca: 5_000, elektrik: 15_000 }, ciktilar: { pencere: 30_000 }, isci: 7_000, bakim: { parca: 1_000 }, kirlilikPpmSaat: 20, mulkKipi: true },
] as const;

/** G6 yöntemleri + G8'in iki yöntemi (toplam altı `mulkKipi` yöntemi); yeni kopya. `sec.bayrak === false`: `mulkKipi` bayrağı yok (karşıt kanıt). */
export function g8Veri<V extends VeriPaketi>(v: V, sec: G6Secenek = {}): V {
  const c = g6Veri(v, sec);
  const tur = c.icerik.tesisTurleri.find((t) => t.id === "parca_fabrikasi");
  if (tur === undefined) throw new Error("parca_fabrikasi yok");
  for (const y of SENTETIK_G8) {
    const var_ = c.icerik.yontemler.find((x) => x.id === y.id);
    if (var_ !== undefined) {
      // Gerçek G8-1 içeriği ZATEN taşır: `bayrak === false` bayrağı yine de siler (karşıt kanıt).
      if (sec.bayrak === false) delete (var_ as { mulkKipi?: true }).mulkKipi;
      continue;
    }
    const { mulkKipi, ...govde } = y;
    c.icerik.yontemler.push((sec.bayrak === false ? { ...govde } : { ...govde, mulkKipi }) as never);
    if (!tur.yontemler.includes(y.id)) tur.yontemler.push(y.id);
  }
  return c;
}

/** G6 dönemi içerik: G8 yöntemleri (ve tür listelerindeki kimlikleri) çıkarılır; gerçek G8-1 paketi üzerinde "yalnız G6 yöntemleri" içeriği (göç provası, karşıt kanıt). */
export function g6Icerigi<V extends VeriPaketi>(v: V): V {
  const c = structuredClone(v);
  const g8 = G8_YONTEMLER as readonly string[];
  c.icerik.yontemler = c.icerik.yontemler.filter((y) => !g8.includes(y.id));
  for (const t of c.icerik.tesisTurleri) t.yontemler = t.yontemler.filter((id) => !g8.includes(id));
  return c;
}

/** `yapi_market` dükkân türü (şartname §7.3, §8.1): pencere, çelik, cam, parça; `tamCesit` 4; yalnız S. */
export const YAPI_MARKET = { id: "yapi_market", ad: "Yapi market", mallar: ["pencere", "celik", "parca", "cam"], tamCesit: 4, olcekAraligi: [0] as (0 | 1 | 2)[] };

/** Mülk dünyası: G6+G8 yöntemleri, şebeke, `ekYapilar.dukkan` + perakende bloğu (`yapi_market` türü ve yapı malları için talep satırları). */
export function g8MulkVeri(sec: G6Secenek = {}, duzenle?: (v: CekirdekVeriPaketi, pr: MulkPerakendeParametreleri) => void): CekirdekVeriPaketi {
  const v = g8Veri(g6MulkVeri(sec), sec);
  const mulk = v.param.mulk!;
  mulk.ekYapilar = { ...(mulk.ekYapilar ?? {}), dukkan: { ad: "Dukkan", yuva: 1, insaSaati: 4, insaParasi: 6_000_000, insaMaliyeti: { celik: 20_000, parca: 8_000 }, enFazlaIlBasina: 6, olcekHucre: [1, 2, 3] } };
  const pr = perakendeBlogu();
  if (!pr.dukkanTurleri.some((t) => t.id === YAPI_MARKET.id)) pr.dukkanTurleri.push({ ...YAPI_MARKET, mallar: [...YAPI_MARKET.mallar], olcekAraligi: [...YAPI_MARKET.olcekAraligi] });
  Object.assign(pr.talep.talep1000Saat, { pencere: 8_000, cam: 4_000, celik: 6_000, parca: 5_000 });
  pr.talep.gruplar["yapi"] = { mallar: ["pencere", "cam", "celik", "parca"], takvimPpm: [650_000, 650_000, 900_000, 1_150_000, 1_300_000, 1_250_000, 1_200_000, 1_200_000, 1_200_000, 1_100_000, 800_000, 600_000] };
  mulk.perakende = pr;
  duzenle?.(v, pr);
  return v;
}
