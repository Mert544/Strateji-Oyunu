/**
 * Simülasyon izleyici CLI:
 *   pnpm izle [--gun 14] [--tohum 1] [--rapor docs/olcum/v0-t1-3.json] [--cikti izleyici/izleyici.html]
 * Koşuyu çalıştırır ve tek dosyalık HTML sayfasını yazar.
 */
import { existsSync, mkdirSync, statSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { kosuyuDisariAktar } from "./disari-aktar";
import { raporOku } from "./rapor";
import { sayfaUret } from "./sayfa";

const DEPO_KOKU = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

interface Argumanlar {
  gun: number;
  tohum: number;
  rapor: string | null;
  cikti: string;
}

function yardim(): string {
  return [
    "Kullanim: pnpm izle [--gun 14] [--tohum 1] [--rapor <json>] [--cikti izleyici/izleyici.html]",
    "  --gun    Kosu suresi (gun), vars. 14",
    "  --tohum  Simulasyon ve bot tohumu, vars. 1",
    "  --rapor  Olcum raporu JSON'u (packages/olcum ciktisi); yoksa hipotez bolumu gizlenir",
    "  --cikti  Yazilacak HTML dosyasi (vars. izleyici/izleyici.html, depo kokune gore)",
  ].join("\n");
}

function ayristir(argv: string[]): Argumanlar {
  const a: Argumanlar = { gun: 14, tohum: 1, rapor: null, cikti: "izleyici/izleyici.html" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i] as string;
    if (k === "--yardim" || k === "-h") {
      console.log(yardim());
      process.exit(0);
    }
    const v = argv[i + 1];
    if (v === undefined) throw new Error(`${k} icin deger eksik`);
    i++;
    switch (k) {
      case "--gun":
        a.gun = Number(v);
        break;
      case "--tohum":
        a.tohum = Number(v);
        break;
      case "--rapor":
        a.rapor = v;
        break;
      case "--cikti":
        a.cikti = v;
        break;
      default:
        throw new Error(`bilinmeyen secenek: ${k}\n${yardim()}`);
    }
  }
  if (!Number.isInteger(a.gun) || a.gun < 1 || a.gun > 120) throw new Error(`gecersiz --gun: ${a.gun}`);
  if (!Number.isInteger(a.tohum) || a.tohum < 0) throw new Error(`gecersiz --tohum: ${a.tohum}`);
  return a;
}

function yolCoz(yol: string): string {
  // Çalışma dizinine göre; yoksa depo köküne göre dene.
  const cwd = resolve(process.cwd(), yol);
  if (existsSync(cwd)) return cwd;
  return resolve(DEPO_KOKU, yol);
}

function main(): void {
  const a = ayristir(process.argv.slice(2));
  const bas = Date.now();
  console.log(`kosu basliyor: ${a.gun} gun, tohum ${a.tohum}`);
  const veri = kosuyuDisariAktar({ gun: a.gun, tohum: a.tohum });
  console.log(`kosu bitti: ${veri.kareler.length} kare, simulasyon ${(veri.kosuSureMs / 1000).toFixed(1)} sn`);

  let rapor = null;
  if (a.rapor !== null) {
    const yol = yolCoz(a.rapor);
    rapor = raporOku(yol);
    console.log(rapor ? `rapor okundu: ${yol} (${rapor.hipotezler.length} hipotez)` : `uyari: rapor okunamadi veya bos (${yol}); hipotez bolumu gizlendi`);
  }

  const html = sayfaUret({ veri, rapor });
  const cikti = existsSync(dirname(resolve(process.cwd(), a.cikti))) || a.cikti.startsWith("/") ? resolve(process.cwd(), a.cikti) : resolve(DEPO_KOKU, a.cikti);
  mkdirSync(dirname(cikti), { recursive: true });
  writeFileSync(cikti, html, "utf8");
  const kb = statSync(cikti).size / 1024;
  console.log(`yazildi: ${cikti} (${kb >= 1024 ? (kb / 1024).toFixed(2) + " MB" : kb.toFixed(0) + " KB"}), toplam ${((Date.now() - bas) / 1000).toFixed(1)} sn`);
}

try {
  main();
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
}
