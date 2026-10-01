/**
 * Adım 1: indirme. Önbellekli (dosya varsa yeniden indirilmez), bayt özeti (sha256) kayıtlı.
 *
 * - Kilit dosyası (yapilandirma/kaynak-ozetleri.json) repoda durur; indirilen/önbellekteki dosyanın
 *   özeti kilitle uyuşmazsa hat DURUR (sessizce farklı veriyle çıktı üretilmez). Kaynak bilerek
 *   güncellendiyse `pnpm harita:gercek kilitle` özetleri yeniden yazar.
 * - Ağ proxy'si (HTTPS_PROXY) varsa undici ProxyAgent ile kullanılır.
 */
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { KAYNAKLAR, type KaynakTanimi } from "./kaynaklar";
import { KAYNAK_OZETLERI_YOLU, ONBELLEK } from "./yollar";

export interface KaynakOzeti {
  url: string;
  sha256: string;
  bayt: number;
}
export type KaynakOzetleri = Record<string, KaynakOzeti>;

export function sha256(veri: Uint8Array): string {
  return createHash("sha256").update(veri).digest("hex");
}

export function onbellekYolu(k: KaynakTanimi): string {
  return resolve(ONBELLEK, k.dosya);
}

export function kilitleriOku(): KaynakOzetleri {
  if (!existsSync(KAYNAK_OZETLERI_YOLU)) return {};
  return JSON.parse(readFileSync(KAYNAK_OZETLERI_YOLU, "utf8")) as KaynakOzetleri;
}

async function proxyKur(): Promise<void> {
  const vekil = process.env["HTTPS_PROXY"] ?? process.env["https_proxy"];
  if (vekil === undefined || vekil === "") return;
  const { ProxyAgent, setGlobalDispatcher } = await import("undici");
  setGlobalDispatcher(new ProxyAgent(vekil));
}

async function indirDosya(k: KaynakTanimi): Promise<void> {
  console.log(`  indiriliyor: ${k.url}`);
  const yanit = await fetch(k.url, { redirect: "follow" });
  if (!yanit.ok) throw new Error(`Indirme basarisiz (${yanit.status}): ${k.url}`);
  const tampon = new Uint8Array(await yanit.arrayBuffer());
  mkdirSync(ONBELLEK, { recursive: true });
  writeFileSync(onbellekYolu(k), tampon);
}

export interface IndirmeSecenegi {
  /** Özetleri kilit dosyasına (yeniden) yazar. */
  kilitle?: boolean;
}

/** Tüm kaynakları hazırlar (gerekirse indirir), özetlerini kilitle doğrular ve özet tablosunu döndürür. */
export async function kaynaklariHazirla(secenek: IndirmeSecenegi = {}): Promise<KaynakOzetleri> {
  await proxyKur();
  const kilit = kilitleriOku();
  const sonuc: KaynakOzetleri = {};
  for (const k of KAYNAKLAR) {
    if (!existsSync(onbellekYolu(k))) await indirDosya(k);
    const veri = readFileSync(onbellekYolu(k));
    const ozet: KaynakOzeti = { url: k.url, sha256: sha256(veri), bayt: veri.byteLength };
    const beklenen = kilit[k.kimlik];
    if (!secenek.kilitle && beklenen !== undefined && beklenen.sha256 !== ozet.sha256) {
      throw new Error(
        `Kaynak ozeti kilitle uyusmuyor: ${k.kimlik} (${k.dosya})\n beklenen ${beklenen.sha256}\n bulunan  ${ozet.sha256}\n` +
          `Kaynak bilerek guncellendiyse: pnpm harita:gercek kilitle (ve DATA_SOURCES.md'yi gozden gecirin).`,
      );
    }
    sonuc[k.kimlik] = ozet;
  }
  if (secenek.kilitle || Object.keys(kilit).length === 0) {
    writeFileSync(KAYNAK_OZETLERI_YOLU, `${JSON.stringify(sonuc, null, 2)}\n`, "utf8");
    console.log(`  kaynak ozetleri kilitlendi: ${KAYNAK_OZETLERI_YOLU}`);
  }
  return sonuc;
}
