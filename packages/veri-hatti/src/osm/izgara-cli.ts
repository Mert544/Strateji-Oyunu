/**
 * Karo + hücre ızgarası denemesi (Sprint 1 / S6) komut satırı.
 *
 *   tsx packages/veri-hatti/src/osm/izgara-cli.ts --ad gebze --iliski 1211496 \
 *       --karo packages/veri-hatti/.onbellek/karolar/gebze-z15.pmtiles [--ornek]
 *
 * Girdi PMTiles özütü önceden `pmtiles extract` ile alınır (bkz. docs/arastirma/karo-ve-izgara-denemesi.md).
 * Ara/büyük çıktılar .onbellek/izgara/<ad>/ altına; --ornek verilirse ölçüm JSON'u ve 2 MB'tan küçük
 * örnek çıktılar packages/veri/haritalar/odbl/ornek/ altına yazılır. tippecanoe yoksa (a) adımı atlanır.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, resolve } from "node:path";
import { brotliCompressSync, constants as zc } from "node:zlib";
import { HARITA_DIZINI, ONBELLEK } from "../yollar";
import { geojsonSeqYaz, ikiliKodla, onizlemePng, sikistir } from "./izgara-cikti";
import { hucreKenariMetre } from "./izgara-geometri";
import { KARO_BUTCESI_BAYT, duzeyOlcumleri, katmanOlcumleri } from "./izgara-olcum";
import { YerelPmtiles } from "./izgara-pmtiles";
import { icerdeMaskesi, iliskiGetir, overpassHalkalari } from "./izgara-sinir";
import { esikDuyarliligi, izgaraIstatistigi, izgaraUret } from "./izgara-uret";
import { VARSAYILAN_SECENEKLER, KATMAN_SAYISI } from "./izgara-uygunluk";

export const ORNEK_DIZINI = resolve(HARITA_DIZINI, "odbl/ornek");
const TIPPECANOE = resolve(ONBELLEK, "araclar/tippecanoe");
const ORNEK_SINIRI = 2 * 1024 * 1024;

function arg(ad: string): string | undefined {
  const i = process.argv.indexOf(`--${ad}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

function tippecanoe(girdi: string, cikti: string, katman: string): boolean {
  if (!existsSync(TIPPECANOE)) return false;
  rmSync(cikti, { force: true });
  execFileSync(
    "nice",
    [
      "-n", "10", TIPPECANOE, "-q", "--force", "-o", cikti, "-l", katman,
      "-Z15", "-z15", "--no-feature-limit", "--no-tile-size-limit", "--no-tiny-polygon-reduction",
      "--no-line-simplification", girdi,
    ],
    { stdio: "inherit" },
  );
  return true;
}

async function main(): Promise<void> {
  const ad = arg("ad") ?? "gebze";
  const iliski = Number(arg("iliski") ?? 1211496);
  const karoYolu = resolve(arg("karo") ?? resolve(ONBELLEK, `karolar/${ad}-z15.pmtiles`));
  const ornek = process.argv.includes("--ornek");
  const dizin = resolve(ONBELLEK, "izgara", ad);
  mkdirSync(dizin, { recursive: true });

  const t0 = performance.now();
  const arsiv = new YerelPmtiles(karoYolu);
  const meta = arsiv.metaveri();
  console.log(`[${ad}] karo arsivi: ${basename(karoYolu)} (${statSync(karoYolu).size} B)`);

  // 1) Sınır + maske
  const halkalar = overpassHalkalari(await iliskiGetir(ONBELLEK, iliski), iliski);
  const maske = icerdeMaskesi(halkalar);
  console.log(`[${ad}] ${halkalar.length} halka, cerceve ${maske.genislik}x${maske.yukseklik}, icerde ${maske.sayi} hucre`);

  // 2) Karo ölçümü
  const duzeyler = duzeyOlcumleri(arsiv, [12, 13, 14, 15]);
  const tumDuzeyler = duzeyOlcumleri(arsiv, Array.from({ length: 16 }, (_, z) => z));
  const icKaro = new Set<string>();
  for (let s = 0; s < maske.yukseklik; s++)
    for (let i = 0; i < maske.genislik; i++)
      if (maske.icerde[s * maske.genislik + i]) icKaro.add(`${(maske.x0 + i) >>> 5}/${(maske.y0 + s) >>> 5}`);
  const katmanlar = katmanOlcumleri(arsiv, 15, (x, y) => icKaro.has(`${x}/${y}`));
  const icKaroBoyut = arsiv
    .tumKarolar()
    .filter((r) => r.z === 15 && icKaro.has(`${r.x}/${r.y}`))
    .map((r) => r.bayt);

  // 3) Izgara
  const t1 = performance.now();
  const sonuc = izgaraUret(arsiv, maske, VARSAYILAN_SECENEKLER);
  const sure = Math.round(performance.now() - t1);
  const ist = izgaraIstatistigi(sonuc.durum);
  const yuzde = (p: number): number => Math.round(p * VARSAYILAN_SECENEKLER.ornek ** 2);
  const duyarlilik = {
    kesisim: esikDuyarliligi(sonuc, { yol: 1, su: 1, askeri: 1 }),
    kapsama25: esikDuyarliligi(sonuc, { yol: yuzde(0.25), su: yuzde(0.25), askeri: 1 }),
    kapsama50: esikDuyarliligi(sonuc, { yol: yuzde(0.5), su: yuzde(0.5), askeri: 1 }),
  };
  console.log(`[${ad}] izgara ${sure} ms, uygun ${ist.satinAlinabilir}/${ist.toplam}`, duyarlilik);

  // 4) Çıktılar
  const ham = ikiliKodla({ ...maske, durum: sonuc.durum, binaYuzde: sonuc.binaYuzde });
  const hamDurum = ikiliKodla({ ...maske, durum: sonuc.durum });
  const gz = sikistir(ham);
  const gzDurum = sikistir(hamDurum);
  const br = brotliCompressSync(ham, { params: { [zc.BROTLI_PARAM_QUALITY]: 11, [zc.BROTLI_PARAM_LGWIN]: 24 } });
  writeFileSync(resolve(dizin, `${ad}-hucreler.bhi.gz`), gz);
  writeFileSync(resolve(dizin, `${ad}-hucreler-durum.bhi.gz`), gzDurum);
  writeFileSync(resolve(dizin, `${ad}-onizleme.png`), onizlemePng(maske.genislik, maske.yukseklik, sonuc.durum));
  const hucreSeq = resolve(dizin, `${ad}-hucreler.geojsonseq`);
  const seritSeq = resolve(dizin, `${ad}-seritler.geojsonseq`);
  const hucreSayisi = geojsonSeqYaz(hucreSeq, maske, sonuc.durum, sonuc.binaYuzde, "hucre");
  const seritSayisi = geojsonSeqYaz(seritSeq, maske, sonuc.durum, sonuc.binaYuzde, "serit");
  const hucrePm = resolve(dizin, `${ad}-hucreler.pmtiles`);
  const seritPm = resolve(dizin, `${ad}-seritler.pmtiles`);
  const tipVar = tippecanoe(hucreSeq, hucrePm, "hucreler") && tippecanoe(seritSeq, seritPm, "seritler");
  const pmOlcum = (yol: string): object | null => {
    if (!tipVar) return null;
    const a = new YerelPmtiles(yol);
    const [o] = duzeyOlcumleri(a, [15]);
    a.kapat();
    return { dosyaBayt: statSync(yol).size, z15: o };
  };

  const kenar = hucreKenariMetre(maske.y0 + (maske.yukseklik >> 1));
  const rapor = {
    ad,
    osmIliski: `r${iliski}`,
    kaynak: {
      karo: "Protomaps Basemap (builds.protomaps.com), pmtiles extract --maxzoom=15",
      semaSurumu: meta["version"] ?? null,
      osmZamani: meta["planetiler:osm:osmosisreplicationtime"] ?? null,
      karoDosyasiBayt: statSync(karoYolu).size,
      lisans: "ODbL (c) OpenStreetMap katkıcıları",
    },
    karo: {
      butceBayt: KARO_BUTCESI_BAYT,
      tumDuzeyKaro: tumDuzeyler.reduce((a, d) => a + d.karo, 0),
      duzeyler,
      z15IlceKaro: {
        karo: icKaroBoyut.length,
        ortalamaBayt: Math.round(icKaroBoyut.reduce((a, b) => a + b, 0) / Math.max(1, icKaroBoyut.length)),
        enBuyukBayt: Math.max(0, ...icKaroBoyut),
      },
      z15Katmanlar: katmanlar,
    },
    izgara: {
      hucreZ: 20,
      hucreKenariMetre: Math.round(kenar * 100) / 100,
      cerceve: { x0: maske.x0, y0: maske.y0, genislik: maske.genislik, yukseklik: maske.yukseklik },
      secenekler: VARSAYILAN_SECENEKLER,
      istatistik: ist,
      esikDuyarliligi: duyarlilik,
      islenenKaro: sonuc.islenenKaro,
      eksikKaro: sonuc.eksikKaro,
    },
    ciktilar: {
      bhiHamBayt: ham.length,
      bhiGzBayt: gz.length,
      bhiBrBayt: br.length,
      bhiYalnizDurumGzBayt: gzDurum.length,
      geojsonSeq: {
        hucre: { ozellik: hucreSayisi, bayt: statSync(hucreSeq).size },
        serit: { ozellik: seritSayisi, bayt: statSync(seritSeq).size },
      },
      pmtiles: tipVar ? { hucre: pmOlcum(hucrePm), serit: pmOlcum(seritPm) } : null,
      sayacBaytHucreBasina: KATMAN_SAYISI,
    },
  };
  arsiv.kapat();
  const raporMetni = `${JSON.stringify(rapor, null, 2)}\n`;
  writeFileSync(resolve(dizin, `${ad}-olcum.json`), raporMetni);
  console.log(`[${ad}] toplam ${Math.round(performance.now() - t0)} ms -> ${dizin}`);

  if (ornek) {
    mkdirSync(ORNEK_DIZINI, { recursive: true });
    writeFileSync(resolve(ORNEK_DIZINI, `${ad}-olcum.json`), raporMetni);
    for (const dosya of [`${ad}-hucreler.bhi.gz`, `${ad}-onizleme.png`, `${ad}-hucreler.pmtiles`, `${ad}-seritler.pmtiles`]) {
      const kaynak = resolve(dizin, dosya);
      if (existsSync(kaynak) && statSync(kaynak).size <= ORNEK_SINIRI) {
        copyFileSync(kaynak, resolve(ORNEK_DIZINI, dosya));
        console.log(`  ornek: ${dosya} (${statSync(kaynak).size} B)`);
      } else if (existsSync(kaynak)) {
        console.log(`  ornek ATLANDI (> 2 MB): ${dosya} (${statSync(kaynak).size} B)`);
      }
    }
  }
}

main().catch((e: unknown) => {
  console.error(e);
  process.exit(1);
});
