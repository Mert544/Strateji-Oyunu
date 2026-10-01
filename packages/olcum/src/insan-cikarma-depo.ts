/**
 * İnsan testi çıkarması için dosya deposunu YALNIZ OKUR (sunucu çalışmıyorken ya da durmuş bir dizinin kopyasında): `gunluk.jsonl` ve en son
 * `goruntu/*.goruntu`. Hiçbir şey yazmaz, kilit almaz, sondaki yarım satırı KESMEZ (sunucunun `DosyaGunlukDeposu.ac`'sından farkı budur); yarım
 * son satır (son "\n"den sonrası) atılır ve bildirilir. Ortadaki bozuk satır ya da seq boşluğu hatadır.
 * Biçim: sunucu/src/depo/dosya.ts başlık açıklaması (gunluk: satır başına bir `GunlukKaydi`; görüntü: ilk satır üst veri JSON'u, kalanı zarf).
 * Postgres için K2'nin dosya biçimine döken aracı (`--dok`) kullanılır; bu okuyucu yalnız dosya biçimini bilir.
 */
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { CikarmaGoruntusu, CikarmaGunlukKaydi } from "./insan-cikarma";

export interface DosyaDeposuOkuma {
  gunluk: CikarmaGunlukKaydi[];
  goruntu: CikarmaGoruntusu | null;
  /** Okuma uyarıları (ör. atılan yarım son satır). */
  uyarilar: string[];
}

export function dosyaDeposundanOku(dizin: string): DosyaDeposuOkuma {
  const uyarilar: string[] = [];
  const gunlukYolu = join(dizin, "gunluk.jsonl");
  const gunluk: CikarmaGunlukKaydi[] = [];
  if (existsSync(gunlukYolu)) {
    const metin = readFileSync(gunlukYolu, "utf8");
    const sonSatirSonu = metin.lastIndexOf("\n");
    const tam = sonSatirSonu < 0 ? "" : metin.slice(0, sonSatirSonu);
    if (sonSatirSonu < metin.length - 1) uyarilar.push(`gunluk.jsonl sonunda tamamlanmamis satir atildi (${metin.length - 1 - sonSatirSonu} bayt)`);
    if (tam !== "") {
      const satirlar = tam.split("\n");
      for (let i = 0; i < satirlar.length; i++) {
        let ham: unknown;
        try {
          ham = JSON.parse(satirlar[i] as string);
        } catch {
          throw new Error(`gunluk satiri ${i + 1} bozuk JSON`);
        }
        const k = ham as Partial<CikarmaGunlukKaydi>;
        if (!Number.isSafeInteger(k.seq) || !Number.isSafeInteger(k.t) || typeof k.oyuncu !== "string" || typeof k.komut !== "object" || k.komut === null) throw new Error(`gunluk satiri ${i + 1} gecersiz (seq, t, oyuncu, komut)`);
        const onceki = gunluk.at(-1);
        if (onceki !== undefined && (k.seq as number) !== onceki.seq + 1) throw new Error(`gunluk seq boslugu: ${onceki.seq} -> ${k.seq as number}`);
        if (onceki === undefined && (k.seq as number) < 1) throw new Error("gunluk seq 1'den kucuk");
        gunluk.push({ seq: k.seq as number, t: k.t as number, oyuncu: k.oyuncu, komut: k.komut });
      }
    }
  } else uyarilar.push("gunluk.jsonl yok: bos gunluk");
  let goruntu: CikarmaGoruntusu | null = null;
  const gDizin = join(dizin, "goruntu");
  if (existsSync(gDizin)) {
    const adlar = readdirSync(gDizin).filter((x) => x.endsWith(".goruntu")).sort().reverse();
    for (const ad of adlar) {
      const icerik = readFileSync(join(gDizin, ad), "utf8");
      const ayrac = icerik.indexOf("\n");
      if (ayrac < 0) continue;
      try {
        const ust = JSON.parse(icerik.slice(0, ayrac)) as Partial<CikarmaGoruntusu>;
        const metin = icerik.slice(ayrac + 1);
        if (!Number.isSafeInteger(ust.seq) || !Number.isSafeInteger(ust.simZamani) || typeof ust.kuralSurumu !== "string" || typeof ust.durumOzeti !== "string" || metin === "") continue;
        goruntu = { seq: ust.seq as number, simZamani: ust.simZamani as number, kuralSurumu: ust.kuralSurumu, durumOzeti: ust.durumOzeti, metin, ...(ust.ek !== undefined ? { ek: ust.ek } : {}) };
        break;
      } catch {
        continue;
      }
    }
  }
  return { gunluk, goruntu, uyarilar };
}
