/**
 * Kare yayını: bağlantılar parçalar hâlinde (setImmediate) gönderilir; yavaş istemci kuralı (tampon sınırı): `enCokTampon` üstünde
 * kare ATLANIR ve yetişince TAM kare gider; `kopmaTamponu` üstünde ya da `yavasSureMs` boyunca `enCokTampon` üstünde kalırsa bağlantı
 * KOPAR. Yavaş istemci `tamponOlcer` ile kurulur (loopback'te gerçek bufferedAmount birikmez).
 */
import { afterEach, describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import type { SunucuIstemcisi } from "../src/istemci";
import { GUNEY, KUZEY, TUM_BOLGELER, katil, testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

async function bekle(kosul: () => boolean, ms = 5000): Promise<void> {
  const son = Date.now() + ms;
  while (!kosul()) {
    if (Date.now() > son) throw new Error("zaman asimi");
    await new Promise((r) => setTimeout(r, 5));
  }
}

const DURUSLAR = ["savunma", "geri_cekil", "normal"] as const;

/** ali (KUZEY) ve veli (GUNEY) katılır, ikisi de her şeye abone; `degistir()` ali'nin ova duruşunu çevirir (herkese görünür delta). */
async function kur(sunucu: Parameters<typeof testSunucusu>[0] = {}) {
  ts = await testSunucusu(sunucu);
  const y = await ts.baglan(SISTEM_OYUNCUSU);
  await katil(y, "ali", KUZEY);
  await katil(y, "veli", GUNEY);
  const ali = await ts.baglan("ali");
  const veli = await ts.baglan("veli");
  await ali.abone(TUM_BOLGELER);
  await veli.abone(TUM_BOLGELER);
  let n = 0;
  const degistir = async (): Promise<void> => {
    const r = await ali.komut(`d${n}`, { tur: "savunma_emri", bolge: "m_ova", durus: DURUSLAR[n % 3] as "savunma" } satisfies Komut);
    n++;
    expect(r.tur === "komutSonucu" && r.sonuc.tamam).toBe(true);
  };
  return { y, ali, veli, degistir };
}

const kareler = (c: SunucuIstemcisi): number => c.gelenler.filter((m) => m.tur === "kare" || m.tur === "delta").length;
const tamKareler = (c: SunucuIstemcisi): number => c.gelenler.filter((m) => m.tur === "kare").length;

describe("kare yayini parcalari", () => {
  it("parca=1: baglantilar farkli setImmediate turlarinda islenir; hepsi kareyi alir; sira bosalir", async () => {
    const turlar: number[] = [];
    let tik = 0;
    let dur = false;
    const sayac = (): void => {
      tik++;
      if (!dur) setImmediate(sayac);
    };
    setImmediate(sayac);
    const { ali, veli, degistir } = await kur({ sunucu: { yayinParca: 1, yayinButceMs: 1000, tamponOlcer: () => (turlar.push(tik), 0) } });
    const a0 = kareler(ali);
    const v0 = kareler(veli);
    turlar.length = 0;
    await degistir();
    await bekle(() => kareler(ali) > a0 && kareler(veli) > v0);
    dur = true;
    // Bir yayında iki abone: parça=1 olduğundan en az iki ayrı tur (aynı turda ikisi birden işlenseydi tek değer olurdu).
    const yayinTurlari = new Set(turlar);
    expect(yayinTurlari.size).toBeGreaterThanOrEqual(2);
    const m = await (ts as TestSunucusu).sunucu.metrikMetni();
    expect(m).toMatch(/bolge_yayin_sira 0\n/);
  });

  it("varsayilan parca: kare akisi sürer, iki istemcinin karesi ayni dunyayi gosterir", async () => {
    const { ali, veli, degistir } = await kur();
    for (let i = 0; i < 3; i++) await degistir();
    const ova = (ts as TestSunucusu).yazar.sim.ic.bolgeIndeks["m_ova"] as number;
    const durus = (c: SunucuIstemcisi): number | undefined => c.kare?.bolgeler.find((b) => b.i === ova)?.genel.durus;
    await bekle(() => durus(ali) === durus(veli) && durus(ali) === 2);
  });
});

describe("yavas istemci kurali", () => {
  it("enCokTampon ustunde kare ATLANIR (sayac), diger istemci etkilenmez; tampon dusunce TAM kare gelir", async () => {
    let veliTampon = 0;
    const { ali, veli, degistir } = await kur({ sunucu: { enCokTampon: 1000, kopmaTamponu: 1e9, yavasSureMs: 1e12, tamponOlcer: (_ws, o) => (o === "veli" ? veliTampon : 0) } });
    await degistir();
    await bekle(() => ali.kare !== null);
    const v0 = kareler(veli);
    const tam0 = tamKareler(veli);
    veliTampon = 5000; // yavaş
    await degistir();
    await degistir();
    await bekle(() => kareler(ali) >= 3 + 1);
    expect(kareler(veli)).toBe(v0); // atlandı
    const m = await (ts as TestSunucusu).sunucu.metrikMetni();
    expect(Number(/bolge_yayin_atlanan_kare_toplam (\d+)/.exec(m)?.[1])).toBeGreaterThan(0);
    expect(m).toMatch(/bolge_yayin_yavas_kopan_toplam 0\n/);
    // Yetişti: sonraki yayında delta DEĞİL tam kare (zincir atlanan karelerden sonra bozulmasın).
    veliTampon = 0;
    await degistir();
    await bekle(() => tamKareler(veli) > tam0);
    expect(veli.kare).not.toBeNull();
    const ova = (ts as TestSunucusu).yazar.sim.ic.bolgeIndeks["m_ova"] as number;
    const durus = (c: SunucuIstemcisi): number | undefined => c.kare?.bolgeler.find((b) => b.i === ova)?.genel.durus;
    await bekle(() => durus(veli) === durus(ali));
  });

  it("kopmaTamponu ustunde baglanti KOPAR (sayac); diger istemci sürer", async () => {
    let veliTampon = 0;
    const { ali, veli, degistir } = await kur({ sunucu: { enCokTampon: 1000, kopmaTamponu: 10_000, yavasSureMs: 1e12, tamponOlcer: (_ws, o) => (o === "veli" ? veliTampon : 0) } });
    await degistir();
    veliTampon = 50_000;
    await degistir();
    await bekle(() => veli.ws.readyState === veli.ws.CLOSED, 5000);
    expect(ali.ws.readyState).toBe(ali.ws.OPEN);
    const m = await (ts as TestSunucusu).sunucu.metrikMetni();
    expect(Number(/bolge_yayin_yavas_kopan_toplam (\d+)/.exec(m)?.[1])).toBe(1);
    await degistir(); // yayın sürer
    await bekle(() => kareler(ali) >= 3);
  });

  it("enCokTampon ustunde yavasSureMs boyunca kalan istemci KOPAR (sahte saat)", async () => {
    let an = 0;
    let veliTampon = 0;
    const { veli, degistir } = await kur({ sunucu: { enCokTampon: 1000, kopmaTamponu: 1e9, yavasSureMs: 30_000, duvarMs: () => an, tamponOlcer: (_ws, o) => (o === "veli" ? veliTampon : 0) } });
    await degistir();
    veliTampon = 5000;
    an = 1000;
    await degistir(); // yavaşlık başladı (atlanır)
    expect(veli.ws.readyState).toBe(veli.ws.OPEN);
    an = 20_000;
    await degistir(); // 19 sn: henüz kopmaz
    await new Promise((r) => setTimeout(r, 100));
    expect(veli.ws.readyState).toBe(veli.ws.OPEN);
    an = 32_000; // 31 sn > 30 sn
    await degistir();
    await bekle(() => veli.ws.readyState === veli.ws.CLOSED, 5000);
  });
});
