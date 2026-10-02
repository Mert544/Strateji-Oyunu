/**
 * ÜRETİM yapılandırması test yardımcıları (gerçek harita + gerçek arsa ızgarası manifesti: Gebze, Gemlik, Körfez): `uretim-katilim`, `uretim-kamu`, `uretim-kilitsizlik`.
 * Kurulum sunucu CLI'sinin `--izgara-manifest` yoluyla ve `istemci/scripts/f4-sunucu.ts manifestVerisi` ile AYNIDIR.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { gercekVeriyiYukle } from "@bolge/veri";
import { hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari, varsayilanIzgaraKoku } from "../src/izgara/manifest";
import type { SunucuIstemcisi } from "../src/istemci";
import type { TestSunucusu } from "./yardimci";

export const MANIFEST = fileURLToPath(new URL("../../veri/haritalar/odbl/izgara/manifest.json", import.meta.url));
export const MANIFEST_VAR = existsSync(MANIFEST);
/** Üç Alfa-0 ilçesi (Gebze, Gemlik, Körfez). */
export const ILCELER = ["tr_41_gebze", "tr_16_gemlik", "tr_41_korfez"] as const;

export function uretimVerisi(): CekirdekVeriPaketi {
  const kok = varsayilanIzgaraKoku(MANIFEST);
  const yuklenen = izgaralariYukle(izgaraManifestiOku(MANIFEST), kok, varsayilanIzgaraBagimliliklari);
  const veri = gercekVeriyiYukle();
  izgarayiVeriyeBagla(veri, izgaraGirdisiKur(yuklenen, { ad: "izgara-manifest", harita: veri.harita.ad, hiyerarsi: hiyerarsiOku(`${kok}/hiyerarsi.json`), haritaBolgeleri: new Set(veri.harita.bolgeler.map((b) => b.id)) }));
  return veri;
}

/** Oyuncu `katil {ilce}` ile kendi katılımını yapar (yurtlu); sonuç tamam değilse `Error`. Süre (ms) döner. */
export async function ilceyeKatil(ts: TestSunucusu, oyuncu: string, ilce: string): Promise<{ ist: SunucuIstemcisi; sureMs: number }> {
  const ist = await ts.baglan(oyuncu);
  const t0 = Date.now();
  const r = await ist.katil(`katil-${oyuncu}`, ilce);
  const sureMs = Date.now() - t0;
  if (r.tur !== "komutSonucu" || !r.sonuc.tamam) throw new Error(`katilim basarisiz (${oyuncu}, ${ilce}): ${JSON.stringify(r)}`);
  return { ist, sureMs };
}
