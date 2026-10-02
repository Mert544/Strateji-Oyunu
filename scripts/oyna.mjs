/** Yerel oyuncu oturumu: gerçek sunucu + istemci, tek komut. */
import { createHmac, randomBytes } from "node:crypto";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";
import { createInterface } from "node:readline";
import { fileURLToPath, pathToFileURL } from "node:url";
import { resolve } from "node:path";

const kok = fileURLToPath(new URL("../", import.meta.url));
const istemci = resolve(kok, "packages/istemci");
const requireIstemci = createRequire(resolve(istemci, "package.json"));
const { createServer } = await import(pathToFileURL(requireIstemci.resolve("vite")).href);
const sir = randomBytes(32).toString("hex");
const oyuncu = "yerel_oyuncu";
const token = `gel1.${oyuncu}.${createHmac("sha256", sir).update(`gel1.${oyuncu}`).digest("base64url")}`;
let web;
let kapaniyor = false;
const oyun = spawn(process.execPath, [
  "--import", import.meta.resolve("tsx"), "packages/sunucu/src/cli.ts",
  "--host", "127.0.0.1", "--port", "0", "--harita", "gercek",
  "--izgara-manifest", "packages/veri/haritalar/odbl/izgara/manifest.json",
  "--depo", "dosya", "--dizin", "raporlar/oyun-yerel", "--birikimli",
  "--kimlik", "gelistirme",
], { cwd: kok, env: { ...process.env, BOLGE_GELISTIRME_SIRRI: sir }, stdio: ["ignore", "pipe", "inherit"] });

async function kapat(kod = 0) {
  if (kapaniyor) return;
  kapaniyor = true;
  process.exitCode = kod;
  await web?.close();
  if (oyun.exitCode === null && oyun.signalCode === null) oyun.kill("SIGTERM");
}
process.on("SIGINT", () => { void kapat(); });
process.on("SIGTERM", () => { void kapat(); });

try {
  const port = await new Promise((coz, reddet) => {
    const zamanlayici = setTimeout(() => reddet(new Error("Oyun sunucusu zamanında açılamadı.")), 30_000);
    const satirlar = createInterface({ input: oyun.stdout });
    oyun.once("error", (e) => { clearTimeout(zamanlayici); reddet(e); });
    oyun.once("exit", (kod) => {
      clearTimeout(zamanlayici);
      reddet(new Error(`Oyun sunucusu kapandı (${kod}).`));
      if (!kapaniyor) void kapat(kod || 1);
    });
    satirlar.on("line", (satir) => {
      let veri;
      try { veri = JSON.parse(satir); } catch { return; }
      if (veri.olay === "hazir") { clearTimeout(zamanlayici); coz(veri.port); }
      else if (veri.olay === "hata" || veri.olay === "uyari") console.error(veri.mesaj ?? satir);
    });
  });
  web = await createServer({
    configFile: resolve(istemci, "vite.config.ts"),
    server: { host: "127.0.0.1", port: 5173, strictPort: true,
      proxy: { "/oyun-ws": { target: `ws://127.0.0.1:${port}`, ws: true } } },
    plugins: [{ name: "yerel-oyun-girisi", configureServer(sunucu) {
      sunucu.middlewares.use((istek, yanit, sonraki) => {
        if (istek.url !== "/oyna") return sonraki();
        yanit.setHeader("Content-Type", "text/html; charset=utf-8");
        yanit.setHeader("Cache-Control", "no-store");
        yanit.end(`<!doctype html><meta charset="utf-8"><title>Oyun açılıyor</title><p>Oyun açılıyor…</p><script>
          const u = new URL('/', location.href);
          u.searchParams.set('sunucu', 'ws://' + location.host + '/oyun-ws');
          u.searchParams.set('token', ${JSON.stringify(token)});
          location.replace(u.href);
        </script>`);
      });
    } }],
  });
  await web.listen();
  const adres = "http://127.0.0.1:5173/oyna";
  console.log(`\nOyunu aç: ${adres}\nKayıtlar: raporlar/oyun-yerel\nKapatmak için Ctrl+C.\n`);
  if (!process.argv.includes("--tarayici-yok")) {
    const [komut, ...argumanlar] = process.platform === "win32"
      ? ["cmd", "/c", "start", "", adres]
      : process.platform === "darwin" ? ["open", adres] : ["xdg-open", adres];
    const tarayici = spawn(komut, argumanlar, { stdio: "ignore" });
    tarayici.on("error", () => {}); // Bağlantı terminalde de görünür.
    tarayici.unref();
  }
} catch (e) {
  console.error(e instanceof Error ? e.message : e);
  await kapat(1);
}
