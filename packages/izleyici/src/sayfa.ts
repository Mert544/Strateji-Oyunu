/**
 * Tek dosyalık HTML üretici: veri (JSON), stil, betik ve iskelet tek belgeye gömülür; harici bağımlılık yoktur.
 * İstemci kaynakları packages/izleyici/istemci/ altındadır (sablon.html, stil.css, istemci.js) ve üretim anında okunur.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import type { KosuVerisi, RaporOzeti } from "./tipler";

const ISTEMCI_KLASORU = join(dirname(fileURLToPath(import.meta.url)), "..", "istemci");

function oku(ad: string): string {
  return readFileSync(join(ISTEMCI_KLASORU, ad), "utf8");
}

/** JSON'u <script> içine güvenle gömmek için: '<' ve satır ayırıcıları kaçırılır (JSON geçerli kalır). */
export function jsonGom(veri: unknown): string {
  return JSON.stringify(veri).replace(/</g, "\\u003c").replace(/\u2028/g, "\\u2028").replace(/\u2029/g, "\\u2029");
}

const RAPOR_BOLUMU = `
<section class="kart rapor-bolumu" id="rapor-bolumu" aria-label="Hipotez ölçüm sonuçları">
  <h2>Hipotez ölçüm sonuçları</h2>
  <p class="ipucu-metin" id="rapor-meta" style="margin-bottom:8px"></p>
  <div id="rapor-icerik"></div>
</section>`;

export interface SayfaSecenegi {
  veri: KosuVerisi;
  /** Ölçüm raporu özeti; yoksa rapor bölümü hiç yazılmaz. */
  rapor?: RaporOzeti | null;
}

/** Bütün sayfayı dizgi olarak üretir. */
export function sayfaUret(secenek: SayfaSecenegi): string {
  const { veri, rapor } = secenek;
  const yerler: Record<string, string> = {
    "/*@@STIL@@*/": oku("stil.css"),
    "/*@@ISTEMCI@@*/": oku("istemci.js"),
    "@@VERI@@": jsonGom(veri),
    "@@RAPOR_BOLUMU@@": rapor ? RAPOR_BOLUMU : "",
    "@@RAPOR_JSON@@": rapor ? `<script type="application/json" id="rapor-json">${jsonGom(rapor)}</script>` : "",
  };
  let html = oku("sablon.html");
  // İşlev değiştirici: değiştirme dizgisindeki "$&" gibi kalıplar yorumlanmaz.
  for (const [anahtar, deger] of Object.entries(yerler)) html = html.split(anahtar).join(deger);
  return html;
}
