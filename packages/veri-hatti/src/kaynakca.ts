/**
 * DATA_SOURCES.md içindeki üretilen tablolar (rezerv ve nüfus satırları). Belgedeki işaretli bloklar
 * `pnpm harita:gercek kaynakca` ile yeniden yazılır; testler belgenin güncel olduğunu denetler.
 */
import { readFileSync, writeFileSync } from "node:fs";
import type { HatRaporu } from "./uret";
import type { Yapilandirma } from "./yapilandirma";
import { DATA_SOURCES_YOLU, RAPOR_DIZINI } from "./yollar";
import { resolve } from "node:path";

export const REZERV_BLOK = { basla: "<!-- REZERV-TABLOSU-BASLA -->", bitis: "<!-- REZERV-TABLOSU-BITIS -->" } as const;
export const NUFUS_BLOK = { basla: "<!-- NUFUS-TABLOSU-BASLA -->", bitis: "<!-- NUFUS-TABLOSU-BITIS -->" } as const;

const hucre = (m: string): string => m.replaceAll("|", "\\|");

/** Bölge başına: rezervler (bin birim), MRDS doğrulaması ve gerekçe. */
export function rezervTablosu(yap: Yapilandirma, rapor: Pick<HatRaporu, "mrds">): string {
  const satirlar = ["| Bölge | Rezervler (bin birim) | MRDS doğrulaması (cevher/bakır) | Gerekçe ve kaynak |", "|---|---|---|---|"];
  for (const b of yap.bolgeler) {
    const rez = Object.entries(b.rezervler)
      .sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1))
      .map(([m, v]) => `${m} ${v}`)
      .join(", ");
    const mrds = Object.entries(rapor.mrds[b.id] ?? {})
      .map(([m, k]) =>
        k.muaf
          ? `${m}: MUAF (MRDS'te kayıt yok/kaba konumlu; gerekçe sağda)`
          : `${m}: içeride ${k.icerde}, yakın ${k.yakin}${k.ornekler.length > 0 ? ` (${k.ornekler.join("; ")})` : ""}`,
      )
      .join("<br>");
    satirlar.push(`| \`${b.id}\` | ${hucre(rez === "" ? "yok" : rez)} | ${hucre(mrds === "" ? "—" : mrds)} | ${hucre(b.rezervKaynak)} |`);
  }
  return satirlar.join("\n");
}

/** Bölge başına: NE yerleşim toplamı, en büyük yerleşimler ve ölçeklenmiş oyun nüfusu. */
export function nufusTablosu(yap: Yapilandirma, rapor: Pick<HatRaporu, "nufus">): string {
  const satirlar = ["| Bölge | NE yerleşim pop_max toplamı | Yerleşim sayısı | En büyük yerleşimler (pop_max) | Oyun nüfusu |", "|---|---:|---:|---|---:|"];
  for (const b of yap.bolgeler) {
    const n = rapor.nufus[b.id];
    if (n === undefined) throw new Error(`rapor.nufus eksik: ${b.id}`);
    satirlar.push(`| \`${b.id}\` | ${n.gercekToplam} | ${n.yerlesimSayisi} | ${hucre(n.enBuyukYerlesimler.join(", ") || "—")} | ${n.oyunNufusu} |`);
  }
  return satirlar.join("\n");
}

function blokDegistir(metin: string, blok: { basla: string; bitis: string }, yeni: string): string {
  const i = metin.indexOf(blok.basla);
  const j = metin.indexOf(blok.bitis);
  if (i < 0 || j < i) throw new Error(`DATA_SOURCES.md'de ${blok.basla} ... ${blok.bitis} blogu yok`);
  return `${metin.slice(0, i + blok.basla.length)}\n${yeni}\n${metin.slice(j)}`;
}

export function blokIcerigi(metin: string, blok: { basla: string; bitis: string }): string {
  const i = metin.indexOf(blok.basla);
  const j = metin.indexOf(blok.bitis);
  if (i < 0 || j < i) throw new Error(`DATA_SOURCES.md'de ${blok.basla} ... ${blok.bitis} blogu yok`);
  return metin.slice(i + blok.basla.length, j).trim();
}

export function raporuOku(): HatRaporu {
  return JSON.parse(readFileSync(resolve(RAPOR_DIZINI, "hat-raporu.json"), "utf8")) as HatRaporu;
}

/** DATA_SOURCES.md'deki üretilen blokları rapordan yeniden yazar. */
export function kaynakcayiGuncelle(yap: Yapilandirma, rapor: HatRaporu): void {
  let metin = readFileSync(DATA_SOURCES_YOLU, "utf8");
  metin = blokDegistir(metin, REZERV_BLOK, rezervTablosu(yap, rapor));
  metin = blokDegistir(metin, NUFUS_BLOK, nufusTablosu(yap, rapor));
  writeFileSync(DATA_SOURCES_YOLU, metin, "utf8");
}
