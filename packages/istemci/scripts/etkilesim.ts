/**
 * Etkileşim doğrulaması (Playwright): sürükleme, tekerlek, çift tıklama uçuşu, klavye gezinme, dokunmatik çift dokunma,
 * hız/duraklat düğmeleri, mal seçici, sekmeler; ardından OYUN KİPİ (devlet seç, tesis kur, ticaret emri, hata mesajları, öneriler;
 * masaüstü ve mobil). Hata olursa süreç kodu 1 ile çıkar.
 *
 * Kullanım: tsx scripts/etkilesim.ts [dunya.html] [ekran-klasoru]   (ekran görüntüleri: dunya3-<ad>-<masaustu|mobil>.png)
 * ETKILESIM_SADECE_OYUN=1 yalnızca oyun kipi sınamasını koşar.
 */
import { existsSync, mkdirSync, readdirSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import type { BrowserContext, Page } from "playwright-core";

declare global {
  interface Window {
    __name?: (f: unknown) => unknown;
  }
}

const DEPO = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");
/** Ekran görüntüleri (dunya3-*.png). İkinci argüman ya da ETKILESIM_EKRAN ile değiştirilebilir. */
const EKRAN = resolve(process.argv[3] ?? process.env["ETKILESIM_EKRAN"] ?? join(DEPO, "raporlar", "dunya"));

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


/**
 * Oyun kipi (E10-G1): devlet seç -> tesis kur -> bildirim "Tamam" -> zaman ilerleyince inşaat biter ve tesis panelde görünür ->
 * ticaret emri -> geçersiz komutlarda anlaşılır hata. Ekran görüntüleri dunya3-*.png.
 */
async function oyunKipi(baglam: BrowserContext, html: string, mobil: boolean): Promise<void> {
  const e = mobil ? "mobil" : "masaüstü";
  const dosya = mobil ? "mobil" : "masaustu";
  mkdirSync(EKRAN, { recursive: true });
  const sayfa: Page = await baglam.newPage();
  await sayfa.addInitScript("window.__name = (f) => f; window.__bildirimCarpan = 8;");
  const konsol: string[] = [];
  sayfa.on("pageerror", (x) => konsol.push(x.message));
  sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
  const toastlar = (): Promise<string[]> => sayfa.locator("#bildirimler .bildirim").allInnerTexts();
  const ekran = async (ad: string): Promise<void> => {
    await sayfa.screenshot({ path: join(EKRAN, `dunya3-${ad}-${dosya}.png`) });
  };

  // 1. Seçim ekranı (URL belirteci yok)
  await sayfa.goto(`file://${html}?adaptif=0&acilis=0&hiz=21600`);
  await sayfa.waitForSelector("#devlet-sec:not([hidden]) .ds-kart", { timeout: 60000 });
  const kartMetni = await sayfa.locator("#devlet-sec").innerText();
  kontrol(`${e}: açılışta Devlet seç ekranı: dört devlet + Yalnızca izle`, (await sayfa.locator(".ds-kart").count()) === 4 && /Yalnızca izle/.test(kartMetni));
  kontrol(`${e}: kartlarda bölge sayısı ve kaynak profili`, /\d+ bölge/.test(kartMetni) && /Kaynaklar:/.test(kartMetni) && /Korvan/.test(kartMetni));
  await sayfa.waitForTimeout(600);
  await ekran("secim");
  await sayfa.locator('.ds-kart[data-devlet="0"]').click();
  await sayfa.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 120000 });
  kontrol(`${e}: seçim URL'de #korvan olarak hatırlanır`, (await sayfa.evaluate(() => location.hash)) === "#korvan");
  kontrol(`${e}: oyuncu devleti 0`, (await sayfa.evaluate(() => window.__olcum?.devlet())) === 0);
  await sayfa.waitForFunction(() => (window.__olcum?.kare()?.oyuncu ? true : false), null, { timeout: 60000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  // Devlet sekmesi ve önerilen eylemler (onboarding)
  if (mobil) await sayfa.locator("#panel-tutamac").click();
  kontrol(`${e}: Devlet sekmesi açık`, (await sayfa.locator("#sek-devlet").getAttribute("aria-selected")) === "true");
  await sayfa.waitForSelector(".oneri-satir", { timeout: 30000 });
  const oneriSayisi = await sayfa.locator(".oneri-satir").count();
  kontrol(`${e}: önerilen eylemler 1-5 satır, "Tek tıkla uygula" düğmeli`, oneriSayisi >= 1 && oneriSayisi <= 5 && (await sayfa.locator("[data-oneri]").count()) === oneriSayisi, `(${oneriSayisi})`);
  kontrol(`${e}: üst çubukta devlet ve hazine`, /Korvan/.test(await sayfa.locator("#oyuncu-cubuk").innerHTML()) || mobil);
  await sayfa.waitForTimeout(500);
  await ekran("devlet");

  // 2. Bir bölgede tesis kur (Varna: liman + ova)
  const varna = await sayfa.evaluate(() => window.__olcum?.bolgeIndeksi("varna") ?? -1);
  await sayfa.evaluate((i) => window.__olcum?.bolgeSec(i, true), varna);
  await sayfa.waitForSelector('form[data-form="tesis_insa"]');
  const tesisSayisi = (): Promise<number> => sayfa.evaluate((i) => window.__olcum?.kare()?.oyuncu?.bolgeler[i]?.tesisler.length ?? -1, varna);
  const once = await tesisSayisi();
  const secenekler = await sayfa.locator('form[data-form="tesis_insa"] select[name="tesisTuru"] option:not([disabled])').evaluateAll((l) => l.map((o) => (o as HTMLOptionElement).value));
  kontrol(`${e}: tesis seçenekleri içerikten (en az 3 açık tür)`, secenekler.length >= 3, `(${secenekler.join(",")})`);
  const tur = secenekler.includes("ciftlik") ? "ciftlik" : (secenekler[0] as string);
  await sayfa.locator('form[data-form="tesis_insa"] select[name="tesisTuru"]').selectOption(tur);
  const onizleme = await sayfa.locator('form[data-form="tesis_insa"] .onizleme').innerText();
  kontrol(`${e}: maliyet önizlemesi (para, süre)`, /Para:/.test(onizleme) && /Süre:/.test(onizleme), `(${onizleme.replace(/\s+/g, " ").slice(0, 90)})`);
  await sayfa.locator('form[data-form="tesis_insa"]').scrollIntoViewIfNeeded();
  await ekran("bolge");
  await sayfa.locator('form[data-form="tesis_insa"] button[type="submit"]').click();
  await sayfa.waitForSelector("#bildirimler .bildirim.tamam", { timeout: 15000 });
  const t1 = (await toastlar()).join(" | ");
  kontrol(`${e}: tesis kur -> bildirim "Tamam"`, /Tamam/.test(t1) && /inşaatı başladı/.test(t1), `(${t1})`);
  await sayfa.waitForTimeout(900); // giriş animasyonu bitsin
  await ekran("bildirim");
  await sayfa.waitForFunction((i) => (window.__olcum?.kare()?.oyuncu?.insaatlar.some((x) => x.bolge === i && x.tur === "tesis") ? true : false), varna, { timeout: 15000 });
  kontrol(`${e}: bölge panelinde "Devam eden işler" inşaatı gösterir`, /Devam eden işler/.test((await sayfa.locator("#sekme-icerik").textContent()) ?? ""));
  // zaman ilerleyince inşaat biter ve tesis panelde görünür
  await sayfa.evaluate(() => window.__olcum?.duraklat(false));
  await sayfa.waitForFunction(([i, n]) => (window.__olcum?.kare()?.oyuncu?.bolgeler[i as number]?.tesisler.length ?? 0) > (n as number), [varna, once], { timeout: 120000 });
  await sayfa.evaluate(() => window.__olcum?.duraklat(true));
  await sayfa.waitForTimeout(600);
  const panel = (await sayfa.locator("#sekme-icerik").textContent()) ?? "";
  kontrol(`${e}: inşaat bitti, tesis sayısı arttı ve panelde görünür`, (await tesisSayisi()) === once + 1 && new RegExp(`Tesisler \\(${once + 1}\\)`).test(panel), `(${once} -> ${await tesisSayisi()})`);

  // 3. Ticaret emri (liman)
  await sayfa.locator('details[data-ac="ticaret_emri"] > summary').click();
  await sayfa.locator('form[data-form="ticaret_emri"] select[name="mal"]').selectOption("tahil");
  await sayfa.locator('form[data-form="ticaret_emri"] select[name="yon"]').selectOption("ihracat");
  await sayfa.locator('form[data-form="ticaret_emri"] input[name="oran"]').fill("8");
  const tOnizleme = await sayfa.locator('form[data-form="ticaret_emri"] .onizleme').innerText();
  kontrol(`${e}: ticaret önizlemesi fiyat ve pazar hacmi gösterir`, /Dünya fiyatı/.test(tOnizleme) && /Dünya pazarı/.test(tOnizleme), `(${tOnizleme.replace(/\s+/g, " ").slice(0, 80)})`);
  await sayfa.locator('form[data-form="ticaret_emri"] button[type="submit"]').click();
  await sayfa.waitForFunction((i) => (window.__olcum?.kare()?.oyuncu?.bolgeler[i]?.emirler.length ?? 0) === 1, varna, { timeout: 15000 });
  const emir = await sayfa.evaluate((i) => window.__olcum?.kare()?.oyuncu?.bolgeler[i]?.emirler[0], varna);
  kontrol(`${e}: ticaret emri verildi (tahıl ihracat 8/sa)`, emir?.[1] === 0 && emir?.[2] === 8, `(${JSON.stringify(emir)})`);
  await sayfa.waitForTimeout(400);
  kontrol(`${e}: ticaret emirleri listesi ve Kaldır düğmesi`, /Ticaret emirleri/.test((await sayfa.locator("#sekme-icerik").textContent()) ?? "") && /Kaldır/.test((await sayfa.locator("#sekme-icerik").textContent()) ?? ""));

  // 4. Geçersiz komutlar: anlaşılır Türkçe hata
  await sayfa.locator('form[data-form="ticaret_emri"] input[name="oran"]').fill("-4");
  await sayfa.locator('form[data-form="ticaret_emri"] button[type="submit"]').click();
  await sayfa.waitForSelector("#bildirimler .bildirim.hata", { timeout: 10000 });
  const h1 = (await sayfa.locator("#bildirimler .bildirim.hata").last().innerText()).trim();
  kontrol(`${e}: form hatası: negatif oran anlaşılır mesaj`, /Oran 0 ile/.test(h1), `(${h1})`);
  await sayfa.locator('details[data-ac="birlik_uret"] > summary').click();
  await sayfa.locator('form[data-form="birlik_uret"] input[name="adet"]').fill("100");
  await sayfa.locator('form[data-form="birlik_uret"] button[type="submit"]').click();
  await sayfa.waitForFunction(() => document.querySelectorAll("#bildirimler .bildirim.hata").length >= 2 || /Olmadı/.test(document.getElementById("bildirimler")?.textContent ?? ""), null, { timeout: 10000 });
  const h2 = (await toastlar()).filter((x) => /Olmadı/.test(x)).join(" | ");
  kontrol(`${e}: çekirdek reddi Türkçeye çevrilir (yetersiz stok/hazine)`, /Olmadı: .*(deposunda yeterli|Hazinede yeterli)/.test(h2) && !/stok yetersiz|yetersiz hazine/.test(h2), `(${h2})`);
  await ekran("hata");

  // 5. Öneriyi tek tıkla uygula (Devlet sekmesi)
  await sayfa.locator("#sek-devlet").click({ force: true });
  await sayfa.waitForSelector("[data-oneri]", { timeout: 20000 });
  await sayfa.evaluate(() => {
    const k = document.getElementById("bildirimler");
    if (k) k.innerHTML = "";
  });
  await sayfa.locator("[data-oneri]").first().click();
  await sayfa.waitForSelector("#bildirimler .bildirim", { timeout: 10000 });
  const t5 = (await toastlar()).join(" | ");
  kontrol(`${e}: "Tek tıkla uygula" bir bildirim üretir`, /Tamam|Olmadı/.test(t5), `(${t5})`);

  // 5b. Darboğaz listesi: oyun kipinde "Kenarı geliştir" (varsa)
  await sayfa.locator("#sek-darbogaz").click({ force: true });
  await sayfa.waitForTimeout(500);
  const kenarDugmeleri = await sayfa.locator("[data-komut*='kenar_gelistir']").count();
  kontrol(`${e}: Darboğaz sekmesi oyun kipinde açılır (geliştirilebilir yol: ${kenarDugmeleri})`, ((await sayfa.locator("#sekme-icerik").textContent()) ?? "").length > 40);
  if (kenarDugmeleri > 0) {
    await sayfa.evaluate(() => {
      const k = document.getElementById("bildirimler");
      if (k) k.innerHTML = "";
    });
    await sayfa.locator("[data-komut*='kenar_gelistir']").first().click();
    await sayfa.waitForSelector("#bildirimler .bildirim", { timeout: 10000 });
    const t6 = (await toastlar()).join(" | ");
    kontrol(`${e}: Kenarı geliştir komutu bildirim üretir`, /Tamam|Olmadı/.test(t6), `(${t6})`);
  }

  // 6. Yalnızca izleme: komut yok
  const ucuncu = await baglam.newPage();
  await ucuncu.addInitScript("window.__name = (f) => f;");
  await ucuncu.goto(`file://${html}?adaptif=0&acilis=0&hiz=21600#izle`);
  await ucuncu.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 120000 });
  kontrol(`${e}: #izle ile devlet seçimi atlanır; Devlet sekmesi yok`, (await ucuncu.evaluate(() => window.__olcum?.devlet())) === -1 && (await ucuncu.locator("#sek-devlet").count()) === 0 && (await ucuncu.locator("#devlet-sec").isHidden()));
  await ucuncu.close();

  const tasma = await sayfa.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  kontrol(`${e}: oyun kipinde yatay sayfa kaydırması yok`, !tasma);
  kontrol(`${e}: oyun kipinde konsol hatası yok`, konsol.length === 0, konsol.join(" | "));
  await sayfa.close();
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
    if (process.env["ETKILESIM_SADECE_OYUN"] === "1") {
      await oyunKipi(baglam, html, mobil);
      await baglam.close();
      continue;
    }
    const sayfa = await baglam.newPage();
    await sayfa.addInitScript("window.__name = (f) => f;");
    const konsol: string[] = [];
    sayfa.on("pageerror", (e) => konsol.push(e.message));
    sayfa.on("console", (m) => m.type() === "error" && konsol.push(m.text()));
    await sayfa.goto(`file://${html}?adaptif=0&acilis=0&hiz=21600#izle`);
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
    kontrol(`${etiket}: bölge paneli dolu`, /Nüfus/.test(panelMetni) && /Komutlar/i.test(panelMetni) && /Devlet seç/.test(panelMetni));

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
    for (const sek of ["mal", "hazine", "darbogaz", "savas", "olaylar", "bolge"]) {
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
    // tarım görünümü ve iklim olayı: ileri sarılmış dünyada bir olay etkin/uyarıdayken
    const sayfa2 = await baglam.newPage();
    await sayfa2.addInitScript("window.__name = (f) => f;");
    const konsol2: string[] = [];
    sayfa2.on("pageerror", (e) => konsol2.push(e.message));
    sayfa2.on("console", (m) => m.type() === "error" && konsol2.push(m.text()));
    await sayfa2.goto(`file://${html}?adaptif=0&acilis=0&hiz=3600&ileri=230#izle`);
    await sayfa2.waitForFunction(() => window.__olcum?.hazir() === true, null, { timeout: 240000 });
    await sayfa2.waitForFunction(() => (window.__olcum?.kare()?.iklim?.olaylar.length ?? 0) > 0, null, { timeout: 120000 });
    const takvim = await sayfa2.locator("#takvim").innerText();
    kontrol(`${etiket}: üst çubukta iklim takvimi (tarih ve hasat)`, /\d+ (Ocak|Şubat|Mart|Nisan|Mayıs|Haziran|Temmuz|Ağustos|Eylül|Ekim|Kasım|Aralık)/.test(takvim) && /%\d+/.test(takvim), `(${takvim.replace(/\s+/g, " ")})`);
    await sayfa2.locator('#mal-cubugu button[data-gorunum="tarim"]').click();
    kontrol(`${etiket}: Tarım çipi görünümü açar`, (await sayfa2.evaluate(() => window.__olcum?.sahne.tarimGorunumu)) === true && (await sayfa2.locator('#mal-cubugu button[data-gorunum="tarim"]').getAttribute("aria-pressed")) === "true");
    await sayfa2.locator('#mal-cubugu button[data-mal="1"]').click();
    kontrol(`${etiket}: mal çipi Tarım görünümünü kapatır`, (await sayfa2.evaluate(() => window.__olcum?.sahne.tarimGorunumu)) === false);
    await sayfa2.locator("#sek-olaylar").click({ force: true });
    const satirlar = sayfa2.locator("#sekme-icerik .olay-satir");
    kontrol(`${etiket}: Olaylar sekmesi olayı listeler`, (await satirlar.count()) > 0);
    const hedef = Number(await satirlar.first().getAttribute("data-bolge"));
    await satirlar.first().dispatchEvent("click");
    await sayfa2.waitForTimeout(300);
    const sec = await sayfa2.evaluate(() => window.__olcum?.sahne.secili);
    kontrol(`${etiket}: olay satırına tıklayınca merkez bölge seçilir ve uçuş başlar`, sec === hedef && (await sayfa2.evaluate(() => window.__olcum?.sahne.kontrol.ucuyorMu() === true)), `(seçili=${sec}, hedef=${hedef})`);
    const bolgeMetni = await sayfa2.locator("#sekme-icerik").innerText();
    kontrol(`${etiket}: bölge panelinde Tarım bölümü ve kararlar`, /Toprak durumu/.test(bolgeMetni) && /Ekim karışımı/.test(bolgeMetni) && /Gübre dozu/.test(bolgeMetni));
    kontrol(`${etiket}: mal çubuğunda gübre (içerikten) var`, (await sayfa2.locator("#mal-cubugu").innerText()).includes("Gübre"));
    kontrol(`${etiket}: tarım sayfasında konsol hatası yok`, konsol2.length === 0, konsol2.join(" | "));
    await oyunKipi(baglam, html, mobil);
    await baglam.close();
  }
  await tarayici.close();
  if (hata > 0) process.exit(1);
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
