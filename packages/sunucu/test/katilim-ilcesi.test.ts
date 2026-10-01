/**
 * `oyuncu.mulk.katilimIlcesi` (protokole yalnız ekleme, isteğe bağlı): çekirdekteki katılım ilçesi YALNIZ sahibinin oyuncu karesinde gelir;
 * çekirdekte yoksa (ilçesiz katılım) alan hiç gönderilmez; başkasına/izleyiciye sızmaz.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { IlgiKaresiSemasi } from "@bolge/protokol";
import { kareBekle, mulkVerisi, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

describe("katilimIlcesi (WebSocket)", () => {
  it("ilceli katilimda yalniz sahibine gelir; ilcesiz katilimda alan yok; baskasinin karesinde ve ham mesajda sizmaz; sema gecerli", async () => {
    ts = await testSunucusu({ veri: mulkVerisi() });
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    const k1 = await y.komut("k-ali", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [], ilce: "sn_m_ova_tasra" } as Komut);
    const k2 = await y.komut("k-veli", { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: [] } as Komut);
    expect(k1.tur === "komutSonucu" && k1.sonuc.tamam).toBe(true);
    expect(k2.tur === "komutSonucu" && k2.sonuc.tamam).toBe(true);
    expect(ts.yazar.sim.dunya.mulk?.oyuncular.find((o) => o.id === "ali")?.katilimIlcesi).toBe("sn_m_ova_tasra");
    expect(ts.yazar.sim.dunya.mulk?.oyuncular.find((o) => o.id === "veli")?.katilimIlcesi).toBeUndefined();
    const ali = await ts.baglan("ali");
    const veli = await ts.baglan("veli");
    const ka = await ali.abone([]);
    const kv = await veli.abone([]);
    await kareBekle(ali, () => ali.kare?.oyuncu?.mulk !== undefined);
    expect(ka.kare.oyuncu?.mulk?.katilimIlcesi).toBe("sn_m_ova_tasra");
    expect(IlgiKaresiSemasi.parse(ka.kare)).toEqual(ka.kare);
    // Katilim ilcesi olmayan oyuncuda alan hic yok; baskasinin degeri sizmaz.
    expect(kv.kare.oyuncu?.mulk).toBeDefined();
    expect("katilimIlcesi" in (kv.kare.oyuncu?.mulk ?? {})).toBe(false);
    const hamVeli = JSON.stringify(veli.gelenler);
    expect(hamVeli).not.toContain("katilimIlcesi");
    expect(hamVeli).not.toContain("sn_m_ova_tasra");
    // Yonetici (oyuncu degil) abone olunca oyuncu karesi yok.
    const yk = await y.abone([]);
    expect(yk.kare.oyuncu).toBeUndefined();
    expect(JSON.stringify(y.gelenler)).not.toContain("katilimIlcesi");
  }, 30_000);
});
