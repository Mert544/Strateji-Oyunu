/**
 * belirtec.ts → CSS metni (saf). Çıktı YALNIZ onaltılık renk (#rrggbb) ve rgba() (yalnız CSS'in okuduğu perde/gölge)
 * yazar; asla oklch() yazmaz (§3.1). Üç blok: :root (açık), @media (prefers-color-scheme: dark) :root:not([data-theme=light])
 * ve :root[data-theme=dark]. Eski dağınık değişken adları geçiş süresince TAKMA AD olarak aynı onaltılık değerle yazılır.
 */
import { AILE, ARSA, DEVLET_OYUNCU_INDEKSI, GOLGE, HARITA, KATMAN, NOTR, OLCEK, OYUNCU, RAMPA, ROZET, SAHNE, SAHNE_SAYI, SOLUK, YAZI_AILESI, YURU } from "./belirtec";
import type { Cift } from "./belirtec";
import { hexRgba, oklchHex } from "./renk";
import type { Oklch } from "./renk";

type Tema = 0 | 1;

/** Tema başına belirteç adı → değer (renk belirteçleri hex). */
export type BelirtecTablosu = Map<string, string>;

const yuvarla = (x: number): number => Math.round(x * 1000) / 1000;

/** Soluk oyuncu tonu: kroma × 0,45; açıklık kara'ya %30 yaklaşır (§3.5). */
export function solukTon(dolgu: Oklch, kara: Oklch): Oklch {
  return [yuvarla(dolgu[0] + (kara[0] - dolgu[0]) * SOLUK.karaYakinlik), yuvarla(dolgu[1] * SOLUK.kroma), dolgu[2]];
}

/** Bir tema için tüm renk belirteçleri (ad → hex). Testler ve üretici aynı tabloyu kullanır. */
export function renkTablosu(t: Tema): BelirtecTablosu {
  const m: BelirtecTablosu = new Map();
  const ekle = (ad: string, c: Cift): void => {
    m.set(ad, oklchHex(c[t]));
  };
  for (const [k, c] of Object.entries(NOTR)) ekle(k, c);
  for (const [k, c] of Object.entries(AILE)) ekle(k, c);
  // Birincil üstü metin: açıkta beyaz, koyuda zemin rengi (§3.3); odak = birincil ink; "Sen" = birincil; seçim = mürekkep.
  m.set("birincil-ustu", t === 0 ? "#ffffff" : oklchHex(NOTR.zemin[1]));
  m.set("odak", oklchHex(AILE["birincil-ink"][t]));
  m.set("sen", oklchHex(AILE.birincil[t]));
  m.set("sen-kenar", oklchHex(AILE["birincil-ink"][t]));
  m.set("secim", oklchHex(NOTR.murekkep[t]));
  for (const [k, c] of Object.entries(KATMAN)) ekle(`katman-${k}`, c);
  for (const [k, r] of Object.entries(RAMPA)) r.forEach((c, i) => ekle(`rampa-${k}-${i}`, c));
  OYUNCU.forEach((o, i) => {
    ekle(`oyuncu-${i}`, o.dolgu);
    ekle(`oyuncu-${i}-kenar`, o.kenar);
    m.set(`oyuncu-${i}-soluk`, oklchHex(solukTon(o.dolgu[t], HARITA.kara[t])));
  });
  for (const [k, c] of Object.entries(ROZET)) ekle(`rozet-${k}`, c);
  for (const [k, c] of Object.entries(HARITA)) ekle(`harita-${k}`, c);
  for (const [k, c] of Object.entries(ARSA)) ekle(`arsa-${k}`, c);
  for (const [k, c] of Object.entries(SAHNE)) ekle(`sahne-${k}`, c);
  // Küre çizgileri: hex + ayrı alfa (JS okur; rgba değil)
  m.set("sahne-sinir", oklchHex(HARITA["sinir-il"][t]));
  m.set("sahne-kiyi", oklchHex(HARITA["kiyi-cizgisi"][t]));
  m.set("sahne-bolge-cizgi", oklchHex(NOTR.yuzey[t]));
  m.set("sahne-secim", oklchHex(NOTR.murekkep[t]));
  m.set("sahne-kenar-isik", oklchHex(SAHNE.atmosfer[t]));
  for (const [k, c] of Object.entries(YURU)) ekle(`yuru-${k}`, c);
  return m;
}

/** Renk olmayan, temaya bağlı belirteçler (alfa sayıları, gölgeler, perde). */
function digerTablo(t: Tema): Map<string, string> {
  const m = new Map<string, string>();
  m.set("harita-izgara-alfa", t === 0 ? "0.22" : "0.14");
  m.set("sahne-sinir-alfa", "0.55");
  m.set("sahne-kiyi-alfa", t === 0 ? "0.9" : "0.75");
  m.set("sahne-bolge-cizgi-alfa", t === 0 ? "0.9" : "0.55");
  m.set("sahne-secim-alfa", "1");
  for (const [k, v] of Object.entries(SAHNE_SAYI)) m.set(`sahne-${k}`, String(v[t]));
  for (const [k, v] of Object.entries(GOLGE)) m.set(k, v[t]);
  m.set("perde", t === 0 ? "rgba(19, 28, 35, 0.42)" : "rgba(0, 0, 1, 0.62)");
  m.set("yuzey-saydam", hexRgba(oklchHex(NOTR.yuzey[t]), 0.94));
  m.set("ortu", oklchHex(NOTR.zemin[t]));
  return m;
}

/**
 * Eski değişken adları → yeni belirteç (geçiş takma adları; §7.2). Değer, üretimde aynı temanın hex'i olarak yazılır.
 * Bir ad doğrudan Cift ise o değer kullanılır.
 */
export const TAKMA_AD: Record<string, string | Cift> = {
  "--bg": "zemin",
  "--panel": "yuzey",
  "--panel2": "yuzey-2",
  "--ink": "murekkep",
  "--ink2": "murekkep-2",
  "--line": "cizgi-ince",
  "--vurgu": "birincil",
  "--vurgu-ink": "birincil-ustu",
  "--iyi": "basari-ink",
  "--kotu": "hata-ink",
  "--sahipsiz": [
    [0.905, 0.011, 85],
    [0.33, 0.012, 240],
  ],
  "--genel-notr": [
    [0.915, 0.012, 85],
    [0.315, 0.012, 240],
  ],
  "--d0": `oyuncu-${DEVLET_OYUNCU_INDEKSI[0]}`,
  "--d1": `oyuncu-${DEVLET_OYUNCU_INDEKSI[1]}`,
  "--d2": `oyuncu-${DEVLET_OYUNCU_INDEKSI[2]}`,
  "--d3": `oyuncu-${DEVLET_OYUNCU_INDEKSI[3]}`,
  "--s0": "rampa-sanayi-0",
  "--s1": "rampa-sanayi-1",
  "--s2": "rampa-sanayi-2",
  "--s3": "rampa-sanayi-3",
  "--s4": "rampa-sanayi-4",
  "--p0": "rampa-pazar-0",
  "--p1": "rampa-pazar-1",
  "--p2": "rampa-pazar-2",
  "--p3": "rampa-pazar-3",
  "--p4": "rampa-pazar-4",
  "--t0": "rampa-tarim-0",
  "--t1": "rampa-tarim-1",
  "--t2": "rampa-tarim-2",
  "--t3": "rampa-tarim-3",
  "--t4": "rampa-tarim-4",
  "--k-karsilanan": "bilgi",
  "--k-kismi": "uyari",
  "--k-acik": "hata",
  "--k-engelli": "katman-teknoloji-ink",
  "--k-ilgisiz": "yuzey-3",
  "--desen-rgb": [NOTR.yuzey[0], NOTR.murekkep[1]],
  "--tarim-disi": "yuzey-3",
  "--olay-kuraklik": "ikincil",
  "--olay-don": "katman-lojistik",
  "--olay-sel": "bilgi",
  "--olay-kis": "katman-teknoloji",
  "--olay-diger": "murekkep-3",
  "--sahne-zemin": "sahne-uzay",
  "--sahne-kara2": "sahne-kara-2",
};

function aliasDegeri(hedef: string | Cift, t: Tema, renk: BelirtecTablosu): string {
  if (typeof hedef !== "string") return oklchHex(hedef[t]);
  const v = renk.get(hedef);
  if (!v) throw new Error(`takma ad hedefi yok: ${hedef}`);
  return v;
}

/** Yürüyüş (L4) belirteçleri kabuk CSS'ine girmez: yuru.js kendi `yuru-tema.css`'ini satır içi ekler (tek dosya bütçesi). */
const YURU_ONEK = "yuru-";

function temaGovdesi(t: Tema, girinti: string): string {
  const renk = renkTablosu(t);
  const satir: string[] = [`color-scheme: ${t === 0 ? "light" : "dark"};`];
  for (const [k, v] of renk) if (!k.startsWith(YURU_ONEK)) satir.push(`--${k}: ${v};`);
  for (const [k, v] of digerTablo(t)) satir.push(`--${k}: ${v};`);
  satir.push("/* geçiş takma adları (eski adlar; yeni kodda kullanmayın) */");
  for (const [k, h] of Object.entries(TAKMA_AD)) satir.push(`${k}: ${aliasDegeri(h, t, renk)};`);
  satir.push("--golge: var(--golge-2);", "--yari-panel: var(--yuzey-saydam);");
  return satir.map((s) => girinti + s).join("\n");
}

function olcekGovdesi(girinti: string): string {
  const s: string[] = [`--yazi-ailesi: ${YAZI_AILESI};`];
  for (const [k, v] of Object.entries(OLCEK.bosluk)) s.push(`--s-${k}: ${v}px;`);
  for (const [k, v] of Object.entries(OLCEK.yaricap)) s.push(`--r-${k}: ${v}px;`);
  for (const [k, [px, sat]] of Object.entries(OLCEK.yazi)) s.push(`--yazi-${k}: ${px}px;`, `--satir-${k}: ${sat}px;`);
  for (const [k, v] of Object.entries(OLCEK.sure)) s.push(`--sure-${k}: ${v}ms;`);
  for (const [k, v] of Object.entries(OLCEK.ease)) s.push(`--ease-${k}: ${v};`);
  for (const [k, v] of Object.entries(OLCEK.z)) s.push(`--z-${k}: ${v};`);
  return s.map((x) => girinti + x).join("\n");
}

/** Yalnız `--yuru-*` belirteçleri (üç blok; yuru.js satır içi ekler). */
export function yuruTemaCss(): string {
  const govde = (t: Tema, g: string): string =>
    [...renkTablosu(t)]
      .filter(([k]) => k.startsWith(YURU_ONEK))
      .map(([k, v]) => `${g}--${k}: ${v};`)
      .join("\n");
  return [
    "/* ÜRETİLDİ: scripts/belirtec-uret.ts (kaynak: src/tasarim/belirtec.ts YURU). Elle düzenlemeyin. */",
    ":root {",
    govde(0, "  "),
    "}",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    govde(1, "    "),
    "  }",
    "}",
    ':root[data-theme="dark"] {',
    govde(1, "  "),
    "}",
    "",
  ].join("\n");
}

/** Üretilen tema.css metni. */
export function temaCss(): string {
  return [
    "/* ÜRETİLDİ: scripts/belirtec-uret.ts (kaynak: src/tasarim/belirtec.ts). Elle düzenlemeyin; `pnpm --filter @bolge/istemci tasarim`. */",
    ":root {",
    olcekGovdesi("  "),
    temaGovdesi(0, "  "),
    "}",
    "@media (prefers-color-scheme: dark) {",
    '  :root:not([data-theme="light"]) {',
    temaGovdesi(1, "    "),
    "  }",
    "}",
    ':root[data-theme="dark"] {',
    temaGovdesi(1, "  "),
    "}",
    "@media (prefers-reduced-motion: reduce) {",
    "  :root {",
    ...Object.keys(OLCEK.sure)
      .filter((k) => k !== "anlik")
      .map((k) => `    --sure-${k}: 0ms;`),
    "  }",
    "}",
    "",
  ].join("\n");
}
