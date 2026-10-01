/**
 * Eşik budaması kanıtı (docs/06 §14.1). Budama (çözümden sonra eskimiş `esik` olaylarını kuyruktan atmak) yalnız kuyruğu
 * değiştirir:
 *
 * (a) Kuyruk ve `sayac.olay` HARİÇ dünya durumu, budamasız S2 çekirdeğiyle (git 425c9b2'nin ağacında üretilmiş
 *     `fikstur-kanit/esik-budama-referans.json`) tüm altın fikstürlerde ve senaryo başına 12 kontrol noktasında birebir aynı;
 * (b) işlenen ETKİN olay dizisi (t, öncelik, sıra, tür; eskimiş eşikler hariç) her kontrol noktasına kadar aynı; kuyruktaki
 *     etkin olay kümesi de aynı; `sayac.olay` da aynı (eşikler yine planlanır, yalnız eskiyince atılır);
 * (c) budama kapatılınca (`esikBudamasi.acik = false`, yalnız bu test için) çekirdek S2 davranışını tam verir: durum özeti
 *     (kuyruk dahil) eski altın değerlerle aynı.
 */
import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import { esikBudamasi } from "../src/stok";
import { esitNoktalar, kanitKaydi, kanitSenaryolari, NOKTA_SAYISI } from "./esik-budama-kanit";
import type { KontrolNoktasi } from "./esik-budama-kanit";

interface Referans {
  kaynak: string;
  senaryolar: Record<string, { sonOzet: string; kuyruk: number; eskimis: number; islenenEskimis: number; noktalar: KontrolNoktasi[] }>;
}

const REFERANS = JSON.parse(readFileSync(new URL("./fikstur-kanit/esik-budama-referans.json", import.meta.url), "utf8")) as Referans;

afterEach(() => {
  esikBudamasi.acik = true;
});

describe("eşik budaması: budamasız S2 çekirdeğiyle kuyruk hariç birebir", () => {
  it("referans tüm senaryoları kapsar; her senaryoda en az 10 kontrol noktası var", () => {
    const adlar = kanitSenaryolari().map((s) => s.ad);
    expect(Object.keys(REFERANS.senaryolar).sort()).toEqual([...adlar].sort());
    for (const r of Object.values(REFERANS.senaryolar)) expect(r.noktalar.length).toBeGreaterThanOrEqual(10);
  });

  it.each(kanitSenaryolari().map((s) => [s.ad, s] as const))("%s: kontrol noktalarında durum, etkin kuyruk, işlenen etkin olaylar ve olay sayacı aynı", (ad, s) => {
    const ref = REFERANS.senaryolar[ad];
    if (!ref) throw new Error(`referans yok: ${ad}`);
    const k = kanitKaydi(esitNoktalar(s.son, NOKTA_SAYISI), s.calistir);
    expect(k.noktalar.map((n) => n.t)).toEqual(ref.noktalar.map((n) => n.t));
    // Alan alan karşılaştır: hata iletisi hangi noktada, hangi alanda ayrıştığını göstersin.
    k.noktalar.forEach((n, i) => expect({ i, ...n }).toEqual({ i, ...(ref.noktalar[i] as KontrolNoktasi) }));
    // Budama gerçekten çalıştı: çözümden hemen sonra kuyrukta eskimiş eşik kalmaz; kuyruk küçüldü.
    expect(k.cozumSonrasiEnCokEskimis).toBe(0);
    expect(k.kuyruk).toBeLessThan(ref.kuyruk);
    expect(k.kuyruk - k.eskimis).toBe(ref.kuyruk - ref.eskimis);
    // Tam özet (kuyruk dahil) ise değişir: altınlar bu yüzden yeniden üretildi.
    expect(k.sonOzet).not.toBe(ref.sonOzet);
  }, 120_000);

  it("budama kapalıyken çekirdek S2 ile tam aynı: son durum özeti (kuyruk dahil) eski altın değer", () => {
    esikBudamasi.acik = false;
    for (const s of kanitSenaryolari().slice(0, 3)) {
      const k = kanitKaydi(esitNoktalar(s.son, NOKTA_SAYISI), s.calistir);
      const ref = REFERANS.senaryolar[s.ad];
      expect(k.sonOzet).toBe(ref?.sonOzet);
      expect(k.kuyruk).toBe(ref?.kuyruk);
      expect(k.noktalar).toEqual(ref?.noktalar);
    }
  }, 120_000);
});
