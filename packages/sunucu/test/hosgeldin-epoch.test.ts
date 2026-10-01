/**
 * `hosgeldin.dunyaEpochMs` (protokola yalniz ekleme, istege bagli): mutlak saatli ve epoch'lu dunyada gonderilir (istemci gercek tarihi
 * `dunyaEpochMs + simZamani` ile hesaplar); elle saatli ya da epoch'suz dunyada HIC gonderilmez. Sahte duvar saati.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SunucuMesajiSemasi } from "@bolge/protokol";
import { bellekDeposu } from "../src/depo/bellek";
import { GelistirmeKimligi } from "../src/kimlik";
import { SunucuIstemcisi } from "../src/istemci";
import { DuvarSaati, ElleSaat, VARSAYILAN_DUNYA_EPOCH_MS } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import type { Saat } from "../src/saat";
import { SIR, token, veri } from "./yardimci";

const kapat: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const f of kapat.splice(0).reverse()) await f().catch(() => undefined);
});

async function hosgeldin(saat: Saat, ek: { dunyaEpochMs?: number } = {}): Promise<{ ham: Record<string, unknown>; ist: SunucuIstemcisi; sunucu: CalisanSunucu }> {
  const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12, ...ek });
  const sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
  kapat.push(() => sunucu.kapat());
  const ist = await SunucuIstemcisi.baglan(`ws://127.0.0.1:${sunucu.port}`, token("sistem"), "epoch-test");
  kapat.push(() => ist.kapat());
  return { ham: ist.hosgeldin as unknown as Record<string, unknown>, ist, sunucu };
}

describe("hosgeldin.dunyaEpochMs", () => {
  it("mutlak saatli dunyada epoch gelir; gercek tarih = epoch + simZamani; sema gecerli", async () => {
    const duvar = VARSAYILAN_DUNYA_EPOCH_MS + 3_600_000;
    const { ham, ist } = await hosgeldin(new DuvarSaati(1, { duvar: () => duvar }));
    expect(ham["dunyaEpochMs"]).toBe(VARSAYILAN_DUNYA_EPOCH_MS);
    expect(SunucuMesajiSemasi.safeParse(ham).success).toBe(true);
    const h = ist.hosgeldin;
    expect((h?.dunyaEpochMs ?? 0) + (h?.simZamani ?? 0)).toBeGreaterThanOrEqual(VARSAYILAN_DUNYA_EPOCH_MS);
  });

  it("ozel epoch (Turkiye gece yarisi) aynen gelir", async () => {
    const ozel = VARSAYILAN_DUNYA_EPOCH_MS - 3 * 86_400_000;
    const { ham } = await hosgeldin(new DuvarSaati(1, { duvar: () => VARSAYILAN_DUNYA_EPOCH_MS + 1000 }), { dunyaEpochMs: ozel });
    expect(ham["dunyaEpochMs"]).toBe(ozel);
  });

  it("elle saatli dunyada alan HIC gonderilmez (epoch secenegi verilse bile); sema yine gecerli", async () => {
    const { ham } = await hosgeldin(new ElleSaat(), { dunyaEpochMs: VARSAYILAN_DUNYA_EPOCH_MS });
    expect("dunyaEpochMs" in ham).toBe(false);
    expect(SunucuMesajiSemasi.safeParse(ham).success).toBe(true);
  });

  it("birikimli (eski kapaliyken-duran) saatte de alan yok", async () => {
    const { ham } = await hosgeldin(new DuvarSaati(1, { birikimli: true }));
    expect("dunyaEpochMs" in ham).toBe(false);
  });
});
