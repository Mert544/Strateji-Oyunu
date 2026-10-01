/**
 * Kamuya satış fiyat tavanının çarpanı (para güvenliği, docs/06 §15.7): oyunda ULAŞILABİLECEK EN DÜŞÜK NPC ithalat nakit çarpanı.
 *
 * Kamu sipariş/ihale/esnaf siparişi birim fiyatı ≤ referans × bu çarpandır; böylece NPC'den ithal edip kamuya satmak HİÇBİR oyuncu için pozitif
 * marj bırakmaz (en iyi durumdaki oyuncuda marj tam 0'dır). Çarpan içerik ve parametrelerden DERLEME ZAMANINDA bir kez hesaplanır; oyuncu durumuna bakmaz.
 *
 * İthalat nakit bedeli (`pazar/fiyat.ts` `ithalatKirilimi`): makas çarpanı v1 = brüt × c; liman primi, komisyon ve tarife yalnız bedeli ARTIRIR
 * (komisyon ≥ 0, prim ≥ 0; tarife nakitten düşülüp hazineye geri yazıldığı için nakit çarpana girmez), dolayısıyla alt sınır yalnız makas çarpanıdır:
 *   c = min(ithalatCarpaniPpm, anlasmaIthalatCarpaniPpm, yaptirimIthalatCarpaniPpm)        (yaptırım ≥ normal ≥ anlaşma; yine de min alınır)
 *   c' = c, Ticaret ofisi makas indirimiyle PPM'e doğru `hedefeYaklastir` ile kapanır (en çok: Σ tür.makasIndirimPpm × enFazlaIlBasina, PPM ile sınırlı).
 * (Doğrulayıcı pazar v1'deki makas alanlarının eski çarpanlarla tutarlı olduğunu denetler; bu yüzden eski çarpan alanları yeterlidir.)
 */
import type { DerlenmisEkYapi } from "../tipler";
import { PPM } from "../tipler";
import type { PazarTemelParametreleri } from "@bolge/veri";
import { hedefeYaklastir } from "./yapi";

export function kamuIthalatCarpaniHesapla(pazar: Pick<PazarTemelParametreleri, "ithalatCarpaniPpm" | "anlasmaIthalatCarpaniPpm" | "yaptirimIthalatCarpaniPpm">, ekYapilar: readonly DerlenmisEkYapi[]): number {
  const c = Math.min(pazar.ithalatCarpaniPpm, pazar.anlasmaIthalatCarpaniPpm, pazar.yaptirimIthalatCarpaniPpm);
  let indirim = 0;
  for (const y of ekYapilar) indirim += y.makasIndirimPpm * y.enFazlaIlBasina;
  return hedefeYaklastir(c, PPM, indirim > PPM ? PPM : indirim);
}
