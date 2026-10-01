/**
 * Pazar (B3) testleri için ortak yardımcılar: pazar v1'i açma (varsayılan parametreler ya da nötr), B3 alanlarını özetten
 * çıkarma ve iki limanlı mini harita.
 */
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { durumOzeti } from "../src/ozet";
import type { Dunya } from "../src/tipler";

/** Pazar v1'in tüm B3 alan adları (parametre). */
export const PAZAR_EK_ALANLARI = [
  "makasPpm",
  "anlasmaMakasPpm",
  "yaptirimMakasPpm",
  "limanPrimPpmSaat",
  "limanPrimTavaniPpm",
  "islemKomisyonuPpm",
  "npcLikiditeTabanOyuncu",
  "kitlik",
  "tarife",
] as const;

export interface PazarAcSecenegi {
  /** Nötr: prim 0, komisyon 0, kıtlık cezası 0, tarife 0 (yalnız makas = eski çarpanlar); B3 öncesiyle ekonomik eşdeğer. */
  notr?: boolean;
}

/**
 * Pazar v1'i açar: varsayılan parametrelerdeki B3 alanlarını pakete kopyalar (`yenilikleriKapat` siler). Eski çarpan alanları
 * makasla tutarlı yapılır (doğrulayıcı kuralı). Paketi yerinde değiştirir ve döndürür.
 */
export function pazarAc(veri: VeriPaketi, sec: PazarAcSecenegi = {}): VeriPaketi {
  const v = varsayilanVeriyiYukle().param.pazar;
  const p = veri.param.pazar;
  for (const a of PAZAR_EK_ALANLARI) (p as unknown as Record<string, unknown>)[a] = structuredClone(v[a]);
  if (sec.notr === true) {
    p.limanPrimPpmSaat = 0;
    p.islemKomisyonuPpm = 0;
    if (p.kitlik !== undefined) p.kitlik.cezaPpm = [0, 0, 0];
  }
  // Eski çarpanlar makasla tutarlı
  const makas = p.makasPpm as number;
  const anlasma = p.anlasmaMakasPpm as number;
  const yaptirim = p.yaptirimMakasPpm as number;
  p.ithalatCarpaniPpm = 1_000_000 + makas / 2;
  p.ihracatCarpaniPpm = 1_000_000 - makas / 2;
  p.anlasmaIthalatCarpaniPpm = 1_000_000 + anlasma / 2;
  p.anlasmaIhracatCarpaniPpm = 1_000_000 - anlasma / 2;
  p.yaptirimIthalatCarpaniPpm = 1_000_000 + yaptirim / 2;
  p.yaptirimIhracatCarpaniPpm = 1_000_000 - yaptirim / 2;
  return veri;
}

/** Pazar v1'i kapatır (B3 alanlarını siler). */
export function pazarKapat(veri: VeriPaketi): VeriPaketi {
  for (const a of PAZAR_EK_ALANLARI) delete (veri.param.pazar as unknown as Record<string, unknown>)[a];
  return veri;
}

/** Durum özeti, pazar v1'in eklediği alanlar çıkarılmış (kapalı moddaki özetle karşılaştırmak için). */
export function pazarOzetiEkAlansiz(d: Dunya): string {
  const k = structuredClone(d);
  delete k.pazar.kaynak;
  for (const b of k.bolgeler) {
    delete b.kitlikKademesi;
    delete b.kitlikT;
    delete b.temelKarsilanmaPpm;
  }
  for (const o of k.oyuncular) {
    delete o.ticaretRejimi;
    delete o.ticaretDefteri;
  }
  return durumOzeti(k);
}

// ---------------------------------------------------------------------------
// İki limanlı mini harita (m_liman: dünya kapısı, m_sehir: 24 saat uzakta) ve pazar açık kurulum
// ---------------------------------------------------------------------------

import { bolge, kur } from "./ekonomi-yardimci";
import type { KurulumSecenegi } from "./ekonomi-yardimci";
import type { Simulasyon } from "../src/motor";

export interface PazarKurulum extends KurulumSecenegi {
  /** Pazar v1 nötr (prim, komisyon, kıtlık cezası 0) mi (varsayılan false: varsayılan B3 parametreleri). */
  notr?: boolean;
  /** m_sehir limanın dünya kapısına uzaklığı (saat; varsayılan 24). */
  sehirMesafeSaat?: number;
  /** false ise m_sehir liman yapılmaz (tek limanlı). */
  ikiLiman?: boolean;
}

/** Pazar v1 açık mini dünya: m_liman dünya kapısı (prim 0), m_sehir liman ve `sehirMesafeSaat` saat uzakta. Yeniliklerin geri kalanı kapalı. */
export function kurPazar(sec: PazarKurulum = {}): { s: Simulasyon; veri: VeriPaketi } {
  return kur({
    ...sec,
    duzenle: (v) => {
      pazarAc(v, { notr: sec.notr });
      const liman = v.harita.bolgeler.find((b) => b.id === "m_liman");
      if (liman !== undefined) liman.liman = { dunyaKapisi: true, dunyaMesafeSaat: 0, kapasiteSinifi: 2 };
      if (sec.ikiLiman !== false) {
        const sehir = v.harita.bolgeler.find((b) => b.id === "m_sehir");
        if (sehir !== undefined) {
          if (!sehir.etiketler.includes("liman")) sehir.etiketler.push("liman");
          sehir.liman = { dunyaKapisi: false, dunyaMesafeSaat: sec.sehirMesafeSaat ?? 24, kapasiteSinifi: 1 };
        }
      }
      sec.duzenle?.(v);
    },
  });
}

/** Oyuncunun yeni oyuncu korumasını (komisyon ve tarife muafiyeti) bitirir: koruma bitişini 0'a çeker. */
export function korumayiBitir(s: Simulasyon, oyuncu: string): void {
  const o = s.dunya.oyuncular.find((x) => x.id === oyuncu);
  if (o === undefined) throw new Error(`bilinmeyen oyuncu: ${oyuncu}`);
  o.korumaBitis = 0;
}

export { bolge };
