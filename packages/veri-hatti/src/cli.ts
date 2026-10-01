/**
 * Gerçek dünya veri hattı komut satırı.
 *
 *   pnpm harita:gercek            tüm hat: indir (önbellekli) -> üret -> yaz -> özet
 *   pnpm harita:gercek kilitle    kaynak bayt özetlerini yeniden kilitler (kaynak bilerek güncellendiyse)
 *   pnpm harita:gercek kaynakca   DATA_SOURCES.md'deki üretilen tabloları (rezerv, nüfus) rapordan yeniden yazar
 */
import { statSync } from "node:fs";
import { kaynakcayiGuncelle, raporuOku } from "./kaynakca";
import { ciktilariYaz, hatCalistir } from "./uret";
import { yapilandirmaOku } from "./yapilandirma";

const komut = process.argv[2] ?? "uret";
if (komut !== "uret" && komut !== "kilitle" && komut !== "kaynakca") {
  console.error(`Bilinmeyen komut "${komut}". Kullanim: pnpm harita:gercek [uret|kilitle|kaynakca]`);
  process.exit(2);
}
if (komut === "kaynakca") {
  kaynakcayiGuncelle(yapilandirmaOku(), raporuOku());
  console.log("DATA_SOURCES.md tablolari guncellendi.");
  process.exit(0);
}

const sonuc = await hatCalistir({ kilitle: komut === "kilitle" });
const yollar = ciktilariYaz(sonuc);
for (const y of yollar) console.log(`Yazildi: ${y} (${(statSync(y).size / 1024).toFixed(1)} KB)`);
kaynakcayiGuncelle(yapilandirmaOku(), sonuc.rapor);
console.log("DATA_SOURCES.md tablolari guncellendi.");
const r = sonuc.rapor;
console.log(
  `Ozet: ${r.bolgeSayisi} bolge; kenar kara ${r.kenarSayisi.kara}, deniz ${r.kenarSayisi.deniz}, hava ${r.kenarSayisi.hava}; ` +
    `${Object.keys(r.limanlar).length} liman bolgesi; dar gecitler: ${r.darGecitler.join(", ")}`,
);
