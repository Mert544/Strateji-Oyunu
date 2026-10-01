/**
 * Etkileşim doğrulaması (Playwright): sürükleme, tekerlek, çift tıklama uçuşu, klavye gezinme, dokunmatik çift dokunma,
 * hız/duraklat düğmeleri, mal seçici, sekmeler. Hata olursa süreç kodu 1 ile çıkar.
 */
import { existsSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";

declare global {
  interface Window {
    __name?: (f: unknown) => unknown;
  }
}

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

function chromeBul(): string {
  const kok = "/opt/pw-browsers";
  for (const d of readdirSync(kok)) {
    const y = join(kok, d, "chrome-linux", "chrome");
    if (d.startsWith("chromium-") && existsSync(y)) return y;
  }
  throw new Error("chromium bulunamadi");
}

let hata = 0;
function kontrol(ad: string, tamam: boolean, ek = ""): void {
  console.log(`${tamam ? "OK  " : "HATA"} ${ad} ${ek}`);
  if (!tamam) hata++;
}

async function main(): Promise<void> {
  const html = resolve(process.argv[2] ?? join(DEPO, "istemci", "dunya.html"));
  const tarayici = await chromium.launch({
    executablePath: chromeBul(),
    args: ["--use-angle=swiftshader", "--use-gl=angle", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist", "--no-sandbox"],
  });
  for (const mobil of [false, true]) {
    const baglam = await tarayici.newContext({
      viewport: mobil ? { width: 390, height: 844 } : { width: 1200, height: 800 },
      hasTouch: mobil,
      isMobile: mobil,
      deviceScaleFactor: 1,
    });
    const sayfa = await baglam.newPage();
    await sayfa.addInitScript("window.__name = (f) => f;");
    const konsol: string[] = [];
    sayfa.on("pageerror", (e) => konsol.push(e.message));
    sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
    await sayfa.goto(`file://${html}?adaptif=0&acilis=0&hiz=21600`);
    await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 60000 });
    await sayfa.waitForFunction(() => (window.__olcum?.simSaat() ?? 0) >= 30, null, { timeout: 120000 });
    const durum = (): Promise<{ p: number[]; dist: number; secili: number; surum: number }> =>
      sayfa.evaluate(() => {
        const s = window.__olcum?.sahne;
        return { p: [...(s?.kontrol.durum.p ?? [0, 0, 0])], dist: s?.kontrol.durum.dist ?? 0, secili: s?.secili ?? -9, surum: s?.kontrol.surum ?? 0 };
      });
    const etiket = mobil ? "mobil" : "masaüstü";
    const kutu = await sayfa.locator("#sahne").boundingBox();
    if (!kutu) throw new Error("canvas yok");
    const cx = kutu.x + kutu.width / 2, cy = kutu.y + kutu.height / 2;

    const d0 = await durum();
    if (!mobil) {
      await sayfa.mouse.move(cx, cy);
      await sayfa.mouse.down();
      await sayfa.mouse.move(cx + 120, cy + 40, { steps: 6 });
      await sayfa.mouse.up();
      await sayfa.waitForTimeout(400);
      const d1 = await durum();
      kontrol(`${etiket}: sürükleme kamerayı kaydırır`, Math.hypot(d1.p[0]! - d0.p[0]!, d1.p[1]! - d0.p[1]!, d1.p[2]! - d0.p[2]!) > 0.01);
      await sayfa.mouse.move(cx, cy);
      await sayfa.mouse.wheel(0, -400);
      await sayfa.waitForTimeout(400);
      const d2 = await durum();
      kontrol(`${etiket}: tekerlek yakınlaştırır`, d2.dist < d1.dist, `(${d1.dist.toFixed(2)} -> ${d2.dist.toFixed(2)})`);
      await sayfa.keyboard.down("d");
      await sayfa.waitForTimeout(600);
      await sayfa.keyboard.up("d");
      const d3 = await durum();
      kontrol(`${etiket}: D tuşu gezinir`, Math.hypot(d3.p[0]! - d2.p[0]!, d3.p[1]! - d2.p[1]!, d3.p[2]! - d2.p[2]!) > 0.001);
      await sayfa.keyboard.press("n");
    }
    if (mobil) {
      // İki parmakla çimdik (CDP dokunma olayları): uzaklaşan parmaklar yakınlaştırır; bir parmakla sürükleme kaydırır.
      const cdp = await baglam.newCDPSession(sayfa);
      const dok = async (tur: "touchStart" | "touchMove" | "touchEnd", pts: Array<{ x: number; y: number; id: number }>): Promise<void> => {
        await cdp.send("Input.dispatchTouchEvent", { type: tur, touchPoints: pts.map((p) => ({ x: p.x, y: p.y, id: p.id })) });
      };
      const a0 = await durum();
      await dok("touchStart", [{ x: cx - 40, y: cy, id: 1 }, { x: cx + 40, y: cy, id: 2 }]);
      for (let i = 1; i <= 8; i++) await dok("touchMove", [{ x: cx - 40 - i * 12, y: cy, id: 1 }, { x: cx + 40 + i * 12, y: cy, id: 2 }]);
      await dok("touchEnd", []);
      await sayfa.waitForTimeout(300);
      const a1 = await durum();
      kontrol(`${etiket}: çimdik (iki parmak açılması) yakınlaştırır`, a1.dist < a0.dist, `(${a0.dist.toFixed(2)} -> ${a1.dist.toFixed(2)})`);
      await dok("touchStart", [{ x: cx, y: cy, id: 1 }]);
      for (let i = 1; i <= 8; i++) await dok("touchMove", [{ x: cx + i * 10, y: cy + i * 4, id: 1 }]);
      await dok("touchEnd", []);
      await sayfa.waitForTimeout(400);
      const a2 = await durum();
      kontrol(`${etiket}: tek parmak sürükleme kaydırır`, Math.hypot(a2.p[0]! - a1.p[0]!, a2.p[1]! - a1.p[1]!, a2.p[2]! - a1.p[2]!) > 0.005);
    }
    // bölgeye çift tık / çift dokunma: önce bölgeyi ortaya getir
    await sayfa.evaluate(() => window.__olcum?.sahne.bolgeyeUc(10));
    await sayfa.waitForFunction(() => window.__olcum?.sahne.kontrol.ucuyorMu() === false, null, { timeout: 60000 });
    const onceki = await durum();
    if (mobil) {
      await sayfa.touchscreen.tap(cx, cy);
      await sayfa.waitForTimeout(120);
      await sayfa.touchscreen.tap(cx, cy);
    } else {
      await sayfa.mouse.dblclick(cx, cy);
    }
    await sayfa.waitForTimeout(500);
    const d4 = await durum();
    kontrol(`${etiket}: merkezdeki bölge seçilir`, d4.secili >= 0, `(seçili=${d4.secili})`);
    kontrol(`${etiket}: çift tık/dokunma uçuşu başlatır veya yakınlaştırır`, d4.dist <= onceki.dist + 1e-6 || (await sayfa.evaluate(() => window.__olcum?.sahne.kontrol.ucuyorMu() === true)));
    const panelMetni = await sayfa.locator("#sekme-icerik").innerText();
    kontrol(`${etiket}: bölge paneli dolu`, /Nüfus/.test(panelMetni) && /Komutlar/i.test(panelMetni) && /yakında/i.test(panelMetni));

    // hız ve duraklat
    await sayfa.locator('#hizlar button[data-hiz="3600"]').click();
    const hizSecili = await sayfa.locator('#hizlar button[data-hiz="3600"]').getAttribute("aria-pressed");
    kontrol(`${etiket}: hız düğmesi`, hizSecili === "true");
    await sayfa.locator("#duraklat").click();
    const t1 = await sayfa.evaluate(() => window.__olcum?.simSaat() ?? 0);
    await sayfa.waitForTimeout(800);
    const t2 = await sayfa.evaluate(() => window.__olcum?.simSaat() ?? 0);
    kontrol(`${etiket}: duraklatınca sim saati ilerlemez`, Math.abs(t2 - t1) < 0.15, `(${t1.toFixed(2)} -> ${t2.toFixed(2)})`);
    await sayfa.locator("#duraklat").click();
    // mal seçici ve sekmeler
    await sayfa.locator('#mal-cubugu button[data-mal="1"]').click();
    kontrol(`${etiket}: mal çubuğu seçer`, (await sayfa.evaluate(() => window.__olcum?.sahne.malSecili)) === 1);
    for (const sek of ["mal", "hazine", "darbogaz", "savas", "bolge"]) {
      await sayfa.locator(`#sek-${sek}`).click({ force: true });
      const aria = await sayfa.locator(`#sek-${sek}`).getAttribute("aria-selected");
      kontrol(`${etiket}: sekme ${sek}`, aria === "true" && (await sayfa.locator("#sekme-icerik").innerText()).length > 10);
    }
    // tema düğmesi
    await sayfa.locator("#tema").click();
    const tema = await sayfa.evaluate(() => document.documentElement.getAttribute("data-theme"));
    kontrol(`${etiket}: tema düğmesi data-theme`, tema === "light" || tema === "dark", `(${tema})`);
    // yatay kaydırma olmamalı
    const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    kontrol(`${etiket}: yatay sayfa kaydırması yok`, !tasma);
    kontrol(`${etiket}: konsol hatası yok`, konsol.length === 0, konsol.join(" | "));
    await baglam.close();
  }
  await tarayici.close();
  if (hata > 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
