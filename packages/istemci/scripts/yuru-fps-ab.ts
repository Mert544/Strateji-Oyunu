/**
 * Yürüyüş kare hızı A/B (SwiftShader): iki derleme kökünde aynı noktada sokak sahnesini açar ve `__yuru.olc()` ölçer.
 *   tsx scripts/yuru-fps-ab.ts <kok-A> <kok-B> [tekrar]
 */
import { createReadStream, existsSync, readdirSync, statSync } from "node:fs";
import { createServer } from "node:http";
import type { AddressInfo } from "node:net";
import { join, normalize } from "node:path";
import { chromium } from "playwright-core";

const kokler = [process.argv[2]!, process.argv[3]!];
const tekrar = Number(process.argv[4] ?? 2);
let exe = "";
for (const d of readdirSync("/opt/pw-browsers")) {
  const y = join("/opt/pw-browsers", d, "chrome-linux", "chrome");
  if (d.startsWith("chromium-") && existsSync(y)) exe = y;
}
function sunucu(kok: string): Promise<{ adres: string; kapat: () => void }> {
  const s = createServer((i, y) => {
    const f = normalize(join(kok, decodeURIComponent((i.url ?? "/").split("?")[0]!)));
    if (!existsSync(f) || !statSync(f).isFile()) return void y.writeHead(404).end();
    const b = statSync(f).size;
    const ct = f.endsWith(".js") ? "text/javascript" : f.endsWith(".html") ? "text/html" : "application/octet-stream";
    const a = /bytes=(\d+)-(\d*)/.exec(i.headers.range ?? "");
    if (a) {
      const bas = Number(a[1]);
      const son = Math.min(b - 1, a[2] ? Number(a[2]) : b - 1);
      y.writeHead(206, { "Content-Type": ct, "Content-Range": `bytes ${bas}-${son}/${b}`, "Content-Length": son - bas + 1 });
      createReadStream(f, { start: bas, end: son }).pipe(y);
    } else {
      y.writeHead(200, { "Content-Type": ct });
      createReadStream(f).pipe(y);
    }
  });
  return new Promise((c) => s.listen(0, "127.0.0.1", () => c({ adres: `http://127.0.0.1:${(s.address() as AddressInfo).port}`, kapat: () => s.close() })));
}
type W = { __olcum?: { hazir: () => boolean; duraklat: (d: boolean) => void }; __harita?: { ilceAc: (x: string) => Promise<void>; hazir: () => boolean; gorunum: () => { ml: { jumpTo: (o: unknown) => void } } }; __yuru?: { durum: () => { acik: boolean; hazir: boolean }; git: (a: number, b: number) => void; olc: (ms: number) => Promise<{ fps: number }> } };
const t = await chromium.launch({ executablePath: exe, args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--no-sandbox"] });
for (let r = 0; r < tekrar; r++)
  for (const kok of kokler) {
    const sv = await sunucu(kok);
    const p = await (await t.newContext({ viewport: { width: 1440, height: 900 } })).newPage();
    await p.addInitScript("window.__name = (f) => f;");
    await p.goto(`${sv.adres}/dunya.html?adaptif=0&hiz=3600&acilis=0#izle`);
    await p.waitForFunction(() => (window as unknown as W).__olcum?.hazir() === true, null, { timeout: 120000 });
    await p.evaluate(() => (window as unknown as W).__olcum?.duraklat(true));
    await p.evaluate(() => (window as unknown as W).__harita?.ilceAc("tr_41_gebze"));
    await p.waitForFunction(() => (window as unknown as W).__harita?.hazir() === true, null, { timeout: 90000 });
    await p.evaluate(() => (window as unknown as W).__harita?.gorunum().ml.jumpTo({ center: [29.42714, 40.81348], zoom: 17.2 }));
    await p.waitForTimeout(1500);
    await p.locator("#harita-kap canvas").focus();
    await p.keyboard.press("y");
    await p.waitForFunction(() => (window as unknown as W).__yuru?.durum().hazir === true, null, { timeout: 90000 });
    await p.waitForTimeout(1500);
    const o = await p.evaluate(() => (window as unknown as W).__yuru!.olc(4000));
    console.log(`${kok.includes("once") ? "temel" : "yeni "} fps ${o.fps.toFixed(1)}`);
    await p.context().close();
    sv.kapat();
  }
await t.close();
