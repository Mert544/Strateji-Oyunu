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

async function bekle(kosul: () => boolean | Promise<boolean>, ms = 20_000): Promise<void> {
  const son = Date.now() + ms;
  while (!(await kosul())) {
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

/** Sunucunun şimdiki ova duruşu (gerçek durum; protokol kodu: 0 normal, 1 savunma, 2 geri çekil). Karşılaştırma gerçek duruma dayanır: ara kareler birleşebilir. */
const DURUS_KODU = { normal: 0, savunma: 1, geri_cekil: 2 } as const;
const sunucuDurusu = (): number => {
  const y = (ts as TestSunucusu).yazar;
  return DURUS_KODU[y.sim.dunya.bolgeler[y.sim.ic.bolgeIndeks["m_ova"] as number]?.savunma.durus ?? "normal"];
};
const istemciDurusu = (c: SunucuIstemcisi): number | undefined => {
  const ova = (ts as TestSunucusu).yazar.sim.ic.bolgeIndeks["m_ova"] as number;
  return c.kare?.bolgeler.find((b) => b.i === ova)?.genel.durus;
};
/** İstemcinin karesi sunucunun gerçek durumuna yetişene kadar bekler. */
const yetis = (c: SunucuIstemcisi): Promise<void> => bekle(() => istemciDurusu(c) === sunucuDurusu());
const metrik = async (ad: string): Promise<number> => Number(new RegExp(`${ad} (\\d+)`).exec(await (ts as TestSunucusu).sunucu.metrikMetni())?.[1]);

const kareler = (c: SunucuIstemcisi): number => c.gelenler.filter((m) => m.tur === "kare" || m.tur === "delta").length;
const tamKareler = (c: SunucuIstemcisi): number => c.gelenler.filter((m) => m.tur === "kare").length;

describe("kare yayini parcalari", () => {
  it("parca=1 ve elle surulen 'sonraki tur': 2 abone en az 2 turda islenir (gercek zamana/yuke bagli degil); hepsi kareyi alir; sira bosalir", async () => {
    const kuyruk: Array<() => void> = [];
    // Idle turlar yayin kuyruguna girmesin (yayinAraligiMs buyuk): yalniz komut turlari yayin dogurur.
    const { ali, veli, degistir } = await kur({ sunucu: { yayinParca: 1, yayinButceMs: 1e9, yayinAraligiMs: 1e12, sonrakiTur: (f) => void kuyruk.push(f) } });
    while (kuyruk.length > 0) (kuyruk.shift() as () => void)(); // kurulumdan kalan yayin turlari (varsa) bosaltilir
    const a0 = kareler(ali);
    const v0 = kareler(veli);
    await degistir(); // komut turu: yayin sirasina iki abone girer, parca zamanlanir (elle surulene kadar calismaz)
    await bekle(() => kuyruk.length > 0);
    expect(await metrik("bolge_yayin_sira")).toBe(2);
    expect(kareler(ali)).toBe(a0); // henuz kimseye kare gitmedi
    expect(kareler(veli)).toBe(v0);
    // Elle say: her tur tek baglanti isler; kuyruk bosalana kadar.
    let turSayisi = 0;
    while (kuyruk.length > 0) {
      (kuyruk.shift() as () => void)();
      turSayisi++;
      expect(turSayisi).toBeLessThan(100);
    }
    expect(turSayisi).toBeGreaterThanOrEqual(2); // parca=1: iki baglanti en az iki ayri turda
    expect(await metrik("bolge_yayin_sira")).toBe(0); // sira bosaldi
    await bekle(() => kareler(ali) > a0 && kareler(veli) > v0); // hepsi kareyi aldi
    await yetis(ali);
    await yetis(veli);
  });

  it("varsayilan parca: kare akisi surer, iki istemcinin karesi sunucunun gercek durumuna yetisir", async () => {
    const { ali, veli, degistir } = await kur();
    for (let i = 0; i < 3; i++) await degistir();
    await yetis(ali);
    await yetis(veli);
    expect(istemciDurusu(ali)).toBe(istemciDurusu(veli));
  });
});

describe("yavas istemci kurali", () => {
  it("enCokTampon ustunde kare ATLANIR (sayac), diger istemci etkilenmez; tampon dusunce TAM kare gelir", async () => {
    let veliTampon = 0;
    const { ali, veli, degistir } = await kur({ sunucu: { enCokTampon: 1000, kopmaTamponu: 1e9, yavasSureMs: 1e12, tamponOlcer: (_ws, o) => (o === "veli" ? veliTampon : 0) } });
    await degistir();
    await yetis(ali);
    await yetis(veli); // yolda kare kalmasin
    const v0 = kareler(veli);
    const tam0 = tamKareler(veli);
    veliTampon = 5000; // yavaş
    await degistir();
    await degistir();
    await yetis(ali); // yayin gecti
    await bekle(async () => (await metrik("bolge_yayin_atlanan_kare_toplam")) > 0);
    expect(kareler(veli)).toBe(v0); // atlandı
    expect(await metrik("bolge_yayin_yavas_kopan_toplam")).toBe(0);
    // Yetişti: sonraki yayında delta DEĞİL tam kare (zincir atlanan karelerden sonra bozulmasın).
    veliTampon = 0;
    await degistir();
    await bekle(() => tamKareler(veli) > tam0);
    await yetis(veli);
  });

  it("kopmaTamponu ustunde baglanti KOPAR (sayac); diger istemci sürer", async () => {
    let veliTampon = 0;
    const { ali, veli, degistir } = await kur({ sunucu: { enCokTampon: 1000, kopmaTamponu: 10_000, yavasSureMs: 1e12, tamponOlcer: (_ws, o) => (o === "veli" ? veliTampon : 0) } });
    await degistir();
    await yetis(ali);
    veliTampon = 50_000;
    await degistir();
    await bekle(() => veli.ws.readyState === veli.ws.CLOSED);
    expect(ali.ws.readyState).toBe(ali.ws.OPEN);
    expect(await metrik("bolge_yayin_yavas_kopan_toplam")).toBe(1);
    await degistir(); // yayın sürer
    await yetis(ali);
  });

  it("enCokTampon ustunde yavasSureMs boyunca kalan istemci KOPAR (sahte saat)", async () => {
    let an = 0;
    let veliTampon = 0;
    const { veli, degistir } = await kur({ sunucu: { enCokTampon: 1000, kopmaTamponu: 1e9, yavasSureMs: 30_000, duvarMs: () => an, tamponOlcer: (_ws, o) => (o === "veli" ? veliTampon : 0) } });
    await degistir();
    await yetis(veli);
    veliTampon = 5000;
    an = 1000;
    await degistir(); // yavaşlık başladı (atlanır)
    await bekle(async () => (await metrik("bolge_yayin_atlanan_kare_toplam")) > 0);
    expect(veli.ws.readyState).toBe(veli.ws.OPEN);
    an = 20_000;
    await degistir(); // 19 sn: henüz kopmaz (atlama sayaci artar)
    const atlanan = await metrik("bolge_yayin_atlanan_kare_toplam");
    await degistir();
    await bekle(async () => (await metrik("bolge_yayin_atlanan_kare_toplam")) > atlanan);
    expect(veli.ws.readyState).toBe(veli.ws.OPEN);
    an = 32_000; // 31 sn > 30 sn
    await degistir();
    await bekle(() => veli.ws.readyState === veli.ws.CLOSED);
  });
});
