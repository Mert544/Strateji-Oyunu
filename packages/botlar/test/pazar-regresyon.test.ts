/**
 * Pazar (B3) regresyon kalkanı, bot düzeyi: B3 öncesi veri (sentetik-50, pazar v1 yok) ile 4 botlu koşu, B3 öncesi çekirdek ve
 * botlarla üretilmiş altın durum özetleriyle BİREBİR aynıdır (pazar kapalıyken botların karar mantığı da değişmemelidir).
 */
import { describe, expect, it } from "vitest";
import { GUN } from "@bolge/cekirdek";
import { b2SentetikVeri } from "../../cekirdek/test/regresyon-pazar-senaryo";
import { botOlustur, kos } from "../src";
import type { ArketipAdi } from "../src";

const DORT: ArketipAdi[] = ["sanayici", "tuccar", "lojistikci", "militarist"];

function kosuOzeti(tohum: number, gun: number): string {
  const veri = b2SentetikVeri();
  const devletler: Record<string, string[]> = {};
  for (const b of veri.harita.bolgeler) (devletler[b.devlet] ??= []).push(b.id);
  const dIds = Object.keys(devletler).slice(0, 4);
  const oyuncular = dIds.map((d, i) => ({ id: `o${i}`, bolgeler: devletler[d] as string[], bot: botOlustur(DORT[i] as ArketipAdi, `o${i}`, tohum), katilmaMs: 0 }));
  return kos({ veri, tohum, oyuncular, sureMs: gun * GUN }).sim.durumOzeti();
}

/**
 * B3 öncesi koddan (Sanayi v1 commit'i ee4ee50) üretilmiş altın özetler: 4 botlu koşu, sentetik-50, 6 gün. S3 eşik budamasıyla
 * (docs/06 §14.1) yeniden üretildi: yalnız kuyruk değişti (kanıt: cekirdek/test/esik-budama-kanit.test.ts, "bot-kalkani").
 * Budama öncesi: 1 = 917f853accb02117, 2 = 2fd502cf574370c4.
 */
const ALTIN: Record<number, string> = { 1: "4a8cdda1319b68f6", 2: "feb934bbc7e87a82" };

describe("regresyon kalkanı: B3 öncesi veri + B3 sonrası kod ve botlar = B3 öncesi özetler", () => {
  it.each([1, 2])("tohum %i: 4 botlu 6 günlük koşu özeti aynıdır", (tohum) => {
    const o = kosuOzeti(tohum, 6);
    expect(o).toBe(ALTIN[tohum]);
  });
});
