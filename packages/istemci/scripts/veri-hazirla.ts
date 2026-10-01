/**
 * Natural Earth (kamu malı) verisinden istemcinin gömdüğü küçük TopoJSON dosyalarını üretir.
 *
 *   pnpm --filter @bolge/istemci veri:hazirla
 *
 * Çıktılar (src/veri/):
 *  - dunya-ulkeler.topo.json : 50m ülkeler, sadeleştirilmiş (kıta dolgusu + ülke sınırları), nesne "ulkeler"
 *  - gecici-bolgeler.topo.json : GEÇİCİ oyun bölge katmanı (Türkiye + Balkanlar admin-1, 10m), nesne "bolgeler".
 *    Her geometrinin properties'i: { id: sentetik-50 bölge kimliği, ad: il adı, enlemMikro, boylamMikro }.
 *    Gerçek harita dosyası (gercek-karadeniz.json) hazır olunca yükleyici onu tercih eder; bu dosya yedektir.
 * Ham indirmeler .onbellek/ altında tutulur (git'e girmez).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { topology } from "topojson-server";
import { presimplify, simplify, quantile } from "topojson-simplify";
import { quantize } from "topojson-client";
import type { Feature, FeatureCollection, Geometry, Position } from "geojson";

const KOK = join(dirname(fileURLToPath(import.meta.url)), "..");
const ONBELLEK = join(KOK, ".onbellek");
const CIKTI = join(KOK, "src", "veri");
const TABAN = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

function indir(ad: string): FeatureCollection {
  mkdirSync(ONBELLEK, { recursive: true });
  const yol = join(ONBELLEK, `${ad}.geojson`);
  if (!existsSync(yol)) {
    console.log(`indiriliyor: ${ad}`);
    execFileSync("curl", ["-sSL", "--fail", "-o", yol, `${TABAN}/${ad}.geojson`], { stdio: "inherit" });
  }
  return JSON.parse(readFileSync(yol, "utf8")) as FeatureCollection;
}

/** Halka alanı ağırlıklı ağırlık merkezi ([boylam, enlem]) ve mutlak alan (düzlemsel, derece²). */
function halkaMerkezi(halka: Position[]): { c: [number, number]; alan: number } {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < halka.length - 1; i++) {
    const p = halka[i] as Position, q = halka[i + 1] as Position;
    const f = (p[0] as number) * (q[1] as number) - (q[0] as number) * (p[1] as number);
    a += f;
    cx += ((p[0] as number) + (q[0] as number)) * f;
    cy += ((p[1] as number) + (q[1] as number)) * f;
  }
  if (Math.abs(a) < 1e-12) return { c: [halka[0]?.[0] ?? 0, halka[0]?.[1] ?? 0], alan: 0 };
  return { c: [cx / (3 * a), cy / (3 * a)], alan: Math.abs(a / 2) };
}

/** Çokgenin en büyük parçasının merkezi ve alanı (derece²). */
function ozellikMerkezi(g: Geometry): [number, number, number] {
  let en: { c: [number, number]; alan: number } = { c: [0, 0], alan: -1 };
  const dis: Position[][] = g.type === "Polygon" ? [g.coordinates[0] as Position[]] : g.type === "MultiPolygon" ? g.coordinates.map((p) => p[0] as Position[]) : [];
  for (const h of dis) {
    const r = halkaMerkezi(h);
    if (r.alan > en.alan) en = r;
  }
  return [en.c[0], en.c[1], en.alan];
}

function kucult(fc: FeatureCollection, nesneAdi: string, nicemleme: number, ozellikler: (f: Feature) => Record<string, unknown>, tutulanOran: number): unknown {
  const ozFc: FeatureCollection = {
    type: "FeatureCollection",
    features: fc.features.map((f) => ({ type: "Feature", properties: ozellikler(f), geometry: f.geometry })),
  };
  const topo = topology({ [nesneAdi]: ozFc }) as unknown as Parameters<typeof presimplify>[0];
  const ps = presimplify(topo);
  const esik = quantile(ps, tutulanOran);
  // simplify mutlak koordinat döndürür; yeniden nicemleyerek delta kodlu küçük dosya elde edilir.
  return quantize(simplify(ps, esik), nicemleme);
}

// ---------------------------------------------------------------------------
// 1. Dünya ülkeleri (50m)
// ---------------------------------------------------------------------------
function dunyaUret(): void {
  const fc = indir("ne_50m_admin_0_countries");
  const topo = kucult(fc, "ulkeler", 1e4, () => ({}), 0.2);
  const metin = JSON.stringify(topo);
  writeFileSync(join(CIKTI, "dunya-ulkeler.topo.json"), metin);
  console.log(`dunya-ulkeler.topo.json: ${(metin.length / 1024).toFixed(0)} KB`);
}

// ---------------------------------------------------------------------------
// 2. Geçici bölge katmanı
// ---------------------------------------------------------------------------
const BALKAN_TR_ULKELERI = new Set(["TR", "BG", "RO", "RS", "GR", "AL", "MK", "ME", "BA", "HR", "XK", "MD", "UA", "GE", "SI", "HU", "CY"]);
const KUTU = { bat: 19, dog: 45.5, gun: 35.5, kuz: 47.5 };

interface Aday {
  f: Feature;
  merkez: [number, number];
  alan: number;
}

function geciciUret(): void {
  const harita = JSON.parse(readFileSync(join(KOK, "..", "veri", "haritalar", "sentetik-50.json"), "utf8")) as {
    bolgeler: Array<{ id: string; x: number; y: number }>;
  };
  const fc = indir("ne_10m_admin_1_states_provinces");
  const adaylar: Aday[] = [];
  for (const f of fc.features) {
    const p = f.properties as Record<string, unknown>;
    if (!BALKAN_TR_ULKELERI.has(String(p["iso_a2"]))) continue;
    const m = ozellikMerkezi(f.geometry);
    if (m[0] < KUTU.bat || m[0] > KUTU.dog || m[1] < KUTU.gun || m[1] > KUTU.kuz) continue;
    // Küçük belediye/ilçe çokgenlerini ele: yalnızca il ölçeğindeki (>= ~4000 km²) alanlar.
    if (m[2] < 0.4) continue;
    adaylar.push({ f, merkez: [m[0], m[1]], alan: m[2] });
  }
  console.log(`aday il sayısı: ${adaylar.length}`);

  // Sentetik bölge (x,y) -> kutu içine doğrusal eşleme; en yakın boş il (açgözlü, küresel sıralı).
  const xs = harita.bolgeler.map((b) => b.x), ys = harita.bolgeler.map((b) => b.y);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const hedef = harita.bolgeler.map((b) => ({
    id: b.id,
    lon: KUTU.bat + ((b.x - x0) / (x1 - x0)) * (KUTU.dog - KUTU.bat),
    lat: KUTU.kuz - ((b.y - y0) / (y1 - y0)) * (KUTU.kuz - KUTU.gun),
  }));
  const cift: Array<{ d: number; h: number; a: number }> = [];
  hedef.forEach((h, hi) =>
    adaylar.forEach((a, ai) => {
      const dx = (a.merkez[0] - h.lon) * Math.cos((h.lat * Math.PI) / 180), dy = a.merkez[1] - h.lat;
      cift.push({ d: dx * dx + dy * dy, h: hi, a: ai });
    }),
  );
  cift.sort((p, q) => p.d - q.d);
  const hedefAtandi = new Set<number>(), adayAtandi = new Set<number>();
  const secilen: Feature[] = [];
  for (const c of cift) {
    if (hedefAtandi.has(c.h) || adayAtandi.has(c.a)) continue;
    hedefAtandi.add(c.h);
    adayAtandi.add(c.a);
    const a = adaylar[c.a] as Aday, h = hedef[c.h] as (typeof hedef)[number];
    const p = a.f.properties as Record<string, unknown>;
    secilen.push({
      type: "Feature",
      properties: {
        id: h.id,
        ad: String(p["name_tr"] ?? p["name"] ?? h.id),
        enlemMikro: Math.round(a.merkez[1] * 1e6),
        boylamMikro: Math.round(a.merkez[0] * 1e6),
      },
      geometry: a.f.geometry,
    });
    if (hedefAtandi.size === hedef.length) break;
  }
  const topo = kucult({ type: "FeatureCollection", features: secilen }, "bolgeler", 2e5, (f) => f.properties ?? {}, 0.25);
  const metin = JSON.stringify(topo);
  writeFileSync(join(CIKTI, "gecici-bolgeler.topo.json"), metin);
  console.log(`gecici-bolgeler.topo.json: ${secilen.length} bölge, ${(metin.length / 1024).toFixed(0)} KB`);
}

mkdirSync(CIKTI, { recursive: true });
dunyaUret();
geciciUret();
