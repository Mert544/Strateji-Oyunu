/**
 * Serileştirme performansı ve boyutu (F1). Varsayılan: sentetik-50, 3. gün (yumuşak sınırlar). Ağır ölçüm
 * (gerçek harita, 4 bot, 30. gün) yalnız `BOLGE_AGIR_TEST=1` ile koşar:
 *   BOLGE_AGIR_TEST=1 nice -n 10 pnpm vitest run packages/cekirdek/test/serilestir-performans.test.ts
 */
import { gzipSync } from "node:zlib";
import * as zlib from "node:zlib";
import { gercekVeriyiYukle, varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "../src/motor";
import { anlikGoruntuCoz, anlikGoruntuOlustur, dunyaCoz, dunyaSerilestir, kuralSurumuHesapla } from "../src/serilestir";
import { GUN } from "../src/tipler";
import { senaryoKos } from "./serilestir-yardimci";

/** En iyi 3 ölçüm (ms) */
function sure<T>(f: () => T): { ms: number; deger: T } {
  let en = Infinity;
  let deger: T | undefined;
  for (let i = 0; i < 3; i++) {
    const t0 = performance.now();
    deger = f();
    en = Math.min(en, performance.now() - t0);
  }
  return { ms: Math.round(en * 10) / 10, deger: deger as T };
}

function olc(ad: string, veri: () => VeriPaketi, gun: number): Record<string, number | string> {
  const kosuT0 = performance.now();
  const sim = senaryoKos({ veri: veri(), tohum: 1, sureMs: gun * GUN, bulanikAdet: 0 }).sim;
  const kosuMs = Math.round(performance.now() - kosuT0);
  const kural = kuralSurumuHesapla(veri());
  const ser = sure(() => dunyaSerilestir(sim.dunya));
  const coz = sure(() => dunyaCoz(ser.deger));
  const ozet = sure(() => sim.durumOzeti());
  const klon = sure(() => structuredClone(sim.dunya));
  const zarf = sure(() => anlikGoruntuOlustur(sim, kural));
  const zarfCoz = sure(() => anlikGoruntuCoz(zarf.deger, kural));
  const yukle = sure(() => Simulasyon.yukle(veri(), dunyaCoz(ser.deger)));
  expect(yukle.deger.durumOzeti()).toBe(sim.durumOzeti());
  const bayt = Buffer.byteLength(ser.deger, "utf8");
  const gz = sure(() => gzipSync(ser.deger, { level: 6 }).length);
  const zstdSikistir = (zlib as unknown as { zstdCompressSync?: (b: string) => Buffer }).zstdCompressSync;
  const zstd = zstdSikistir ? sure(() => zstdSikistir(ser.deger).length) : null;
  const sonuc: Record<string, number | string> = {
    ad,
    gun,
    kosuMs,
    bolge: sim.dunya.bolgeler.length,
    oyuncu: sim.dunya.oyuncular.length,
    kuyruk: sim.dunya.kuyruk.length,
    akis: sim.dunya.lojistik.akislar.length,
    baytMB: Math.round((bayt / 1e6) * 100) / 100,
    gzipKB: Math.round(gz.deger / 1000),
    gzipMs: gz.ms,
    zstdKB: zstd ? Math.round(zstd.deger / 1000) : "yok",
    zstdMs: zstd ? zstd.ms : "yok",
    serilestirMs: ser.ms,
    cozMs: coz.ms,
    durumOzetiMs: ozet.ms,
    structuredCloneMs: klon.ms,
    zarfOlusturMs: zarf.ms,
    zarfCozMs: zarfCoz.ms,
    yukleMs: yukle.ms,
  };
  console.log(`serilestirme olcumu: ${JSON.stringify(sonuc)}`);
  return sonuc;
}

describe("serilestirme performansi", () => {
  it("sentetik-50, 3. gun: serilestir ve coz < 2 sn (yumusak sinir), boyut raporlanir", () => {
    const r = olc("sentetik-50", varsayilanVeriyiYukle, 3);
    expect(r.serilestirMs as number).toBeLessThan(2000);
    expect(r.cozMs as number).toBeLessThan(2000);
  }, 180_000);

  it.skipIf(process.env.BOLGE_AGIR_TEST !== "1")("AGIR: gercek harita, 4 bot, 30. gun", () => {
    const r = olc("gercek harita", gercekVeriyiYukle, 30);
    expect(r.serilestirMs as number).toBeLessThan(5000);
  }, 600_000);
});
