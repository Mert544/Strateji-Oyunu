/**
 * OSM il/ilçe hiyerarşisi komut satırı (ODbL çıktılar: packages/veri/haritalar/odbl/).
 *
 *   pnpm harita:osm                 indir (önbellekli, kilitli) -> il/ilçe ağacı -> TopoJSON + hiyerarsi.json
 *   pnpm harita:osm kilitle         önbellekteki OSM yanıtlarının özetlerini yeniden kilitler (önbellek dosyası
 *                                   silinmişse önce yeniden indirir: OSM verisini bilerek güncellemek için)
 *   pnpm harita:osm uret tr bg      yalnızca verilen ülkeler (kimlikler/çıktı yalnız bu ülkeleri kapsar)
 */
import { statSync } from "node:fs";
import { idariCiktilariYaz, idariHatCalistir } from "./idari";

const [komut = "uret", ...ulkeler] = process.argv.slice(2);
if (komut !== "uret" && komut !== "kilitle") {
  console.error(`Bilinmeyen komut "${komut}". Kullanim: pnpm harita:osm [uret|kilitle] [ulke kodlari...]`);
  process.exit(2);
}
const s = await idariHatCalistir({ kilitle: komut === "kilitle", ulkeler });
const yollar = idariCiktilariYaz(s);
for (const y of yollar.filter((x) => !x.includes("/ilceler/"))) console.log(`Yazildi: ${y} (${(statSync(y).size / 1024).toFixed(1)} KB)`);
const ilce = yollar.filter((x) => x.includes("/ilceler/")).map((y) => statSync(y).size / 1024);
console.log(
  `Yazildi: ${ilce.length} ilce dosyasi (en kucuk ${Math.min(...ilce).toFixed(1)} KB, en buyuk ${Math.max(...ilce).toFixed(1)} KB, ` +
    `ortalama ${(ilce.reduce((a, b) => a + b, 0) / ilce.length).toFixed(1)} KB)`,
);
for (const r of s.raporlar) {
  console.log(
    `${r.ulke}: ${r.ilSayisi} il, ${r.ilceSayisi} ilce; oyun disi il ${r.oyunDisiIller.length}, uzamsal uyusmazlik ${r.uzamsalUyusmazliklar.length}, ` +
      `geometri sorunu ${r.geometriSorunlari.length}, kimlik cakismasi ${r.kimlikCakismalari.length}`,
  );
}
