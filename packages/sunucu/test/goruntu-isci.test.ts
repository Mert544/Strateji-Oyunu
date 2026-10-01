/**
 * Görüntü işçisi (worker_threads): periyodik anlık görüntünün serileştirme/özet/gzip işi ana döngüden ayrıdır.
 * Doğruluk şartları: (1) işçinin metni ve özeti ana döngüde eşzamanlı üretilenle BAYT BAYT aynı; (2) kopya, görüntü seq'inin
 * anındaki dünyadır (sonradan değişse de); (3) en çok bir iş, meşgulken görüntü atlanır; (4) işçi hatası ölümcül değil (uyarı,
 * yeniden deneme, ardışık hatada eşzamanlı yol); (5) görüntü yazılmadan çökme eski görüntü + günlükle aynı dünyayı verir.
 */
import { gunzipSync } from "node:zlib";
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, anlikGoruntuOlustur, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { GoruntuIscisi } from "../src/goruntu";
import { ElleSaat } from "../src/saat";
import { DunyaYazari } from "../src/yazar";
import type { YazarSecenekleri } from "../src/yazar";
import { bitisikSatilabilir, mulkVerisi } from "./yardimci";

const ILCE = "sn_m_ova_merkez";
const yazarlar: DunyaYazari[] = [];
afterEach(async () => {
  for (const y of yazarlar.splice(0)) await y.kapat();
});

function veri() {
  const v = mulkVerisi();
  if (v.param.mulk) v.param.mulk.yeniOyuncu.hibe = 500_000_000;
  return v;
}

/** Mülk dünyası: oyuncu katılır, parsel alır, tesis kurar (durum boş değildir). `araligiSaat` = görüntü aralığı. */
async function kur(opt: { araligiSaat?: number; goruntuIsci?: YazarSecenekleri["goruntuIsci"]; depo?: ReturnType<typeof bellekDeposu>; isciYenidenDenemeMs?: number } = {}) {
  const depo = opt.depo ?? bellekDeposu();
  const saat = new ElleSaat();
  const yazar = await DunyaYazari.ac({
    veri: veri(),
    tohum: 1,
    depo,
    saat,
    commitAraligiMs: 15,
    goruntuAraligiMs: (opt.araligiSaat ?? 1) * SAAT,
    goruntuIsci: opt.goruntuIsci ?? true,
    isciYenidenDenemeMs: opt.isciYenidenDenemeMs ?? 0,
  });
  yazarlar.push(yazar);
  let n = 0;
  const gonder = async (oyuncu: string, komut: Komut): Promise<boolean> => {
    const p = yazar.komutGonder(oyuncu, "test", `k${n++}`, komut);
    await yazar.birTur();
    return (await p).sonuc.tamam;
  };
  await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] });
  saat.ilerlet(SAAT / 2);
  await yazar.birTur();
  const hucreler = bitisikSatilabilir(yazar.sim, ILCE);
  expect(await gonder("ali", { tur: "parsel_al", ilce: ILCE, hucreler, sinif: "kirsal" })).toBe(true);
  expect(await gonder("ali", { tur: "tesis_insa_hucre", ilce: ILCE, tesisTuru: "ciftlik", hucreler })).toBe(true);
  return { yazar, depo, saat, gonder, kural: kuralSurumuHesapla(veri()) };
}

describe("goruntu isci: bayt bayt esitlik ve kopya anı", () => {
  it("isci metni ve ozeti ana donguda eszamanli uretilenle bayt bayt ayni; gzip ayni metne acilir", async () => {
    const { yazar, saat, depo, kural } = await kur({ araligiSaat: 6 });
    let karsilastirilan = 0;
    for (let saatNo = 1; saatNo <= 3 * 24; saatNo++) {
      saat.ilerlet(saatNo * SAAT + SAAT);
      await yazar.birTur();
      if (!yazar.goruntuIsiSuruyor) continue;
      // İş şimdi başladı; dünya tur sonu hâlinde (sonraki tur henüz yok): eşzamanlı üretim = kopya anının görüntüsü.
      const esz = anlikGoruntuOlustur(yazar.sim, kural);
      const ozet = yazar.sim.durumOzeti();
      const seq = yazar.seq;
      await yazar.goruntuIsiBekle();
      const kayit = await depo.goruntu.sonuncu();
      expect(kayit?.seq).toBe(seq);
      expect(kayit?.metin).toBe(esz); // bayt bayt
      expect(kayit?.durumOzeti).toBe(ozet);
      karsilastirilan++;
    }
    expect(karsilastirilan).toBeGreaterThanOrEqual(10);
    expect(yazar.sonGoruntuHatasi).toBeNull();
    expect(yazar.metrikler.isciGoruntu).toBe(karsilastirilan);
    expect(yazar.metrikler.sonKopyaMs).toBeGreaterThan(0);
  }, 60_000);

  it("kopya goruntu seq'inin anindaki dunyadir: is surerken dunya degisse de kaydedilen metin degismez", async () => {
    const { yazar, saat, depo, kural, gonder } = await kur({ araligiSaat: 1, goruntuIsci: true });
    saat.ilerlet(2 * SAAT);
    await yazar.birTur();
    expect(yazar.goruntuIsiSuruyor).toBe(true);
    const onceki = anlikGoruntuOlustur(yazar.sim, kural);
    const ozetOnce = yazar.sim.durumOzeti();
    const seqOnce = yazar.seq;
    // İş sürerken dünya DEĞİŞİR: komut + ilerleme (işçiye giden kopya bundan etkilenmemeli).
    yazar.sim.calistirKadar(yazar.sim.dunya.zaman + 3 * SAAT);
    expect(yazar.sim.durumOzeti()).not.toBe(ozetOnce);
    expect(anlikGoruntuOlustur(yazar.sim, kural)).not.toBe(onceki);
    await yazar.goruntuIsiBekle();
    void gonder;
    const kayit = await depo.goruntu.sonuncu();
    expect(kayit?.seq).toBe(seqOnce);
    expect(kayit?.metin).toBe(onceki);
    expect(kayit?.durumOzeti).toBe(ozetOnce);
  }, 60_000);

  it("GoruntuIscisi: gzip istenirse metnin gzip'i doner; kopya maliyeti olculur; en cok bir is", async () => {
    const { yazar, kural } = await kur({ goruntuIsci: false });
    const { icerikKimlikTablosuOlustur } = await import("@bolge/cekirdek");
    const isci = new GoruntuIscisi(icerikKimlikTablosuOlustur(yazar.sim.ic), kural);
    try {
      const a = isci.calistir(yazar.sim.dunya, true);
      expect(a).not.toBeNull();
      expect(a?.kopyaMs).toBeGreaterThanOrEqual(0);
      expect(isci.mesgul).toBe(true);
      expect(isci.calistir(yazar.sim.dunya, true)).toBeNull(); // meşgul: ikinci iş reddedilir (atlanır)
      const r = await a!.sonuc;
      const metin = anlikGoruntuOlustur(yazar.sim, kural);
      expect(r.metin).toBe(metin);
      expect(r.durumOzeti).toBe(yazar.sim.durumOzeti());
      expect(r.gzip).toBeDefined();
      expect(gunzipSync(r.gzip as Uint8Array).toString("utf8")).toBe(metin);
      expect(isci.mesgul).toBe(false);
      // gzip istenmezse yok.
      const b = isci.calistir(yazar.sim.dunya, false);
      expect((await b!.sonuc).gzip).toBeUndefined();
    } finally {
      await isci.kapat();
    }
  }, 60_000);
});

describe("goruntu isci: tek is kurali, hata, cokme", () => {
  it("isci meşgulken periyodik goruntu ATLANIR (kuyruklanmaz); is bitince sonraki turda alinir", async () => {
    process.env.BOLGE_TEST_ISCI_GECIKME_MS = "800";
    const { yazar, saat, depo } = await kur({ araligiSaat: 1, goruntuIsci: { betik: new URL("./yavas-isci.ts", import.meta.url) } });
    const ilkSayi = depo.goruntu.sayi; // açılış görüntüsü
    saat.ilerlet(2 * SAAT);
    await yazar.birTur();
    expect(yazar.goruntuIsiSuruyor).toBe(true);
    // İş sürerken birkaç tur daha: görüntü koşulu sağlanıyor ama iş yeni başlamaz.
    for (let i = 3; i <= 8; i++) {
      saat.ilerlet(i * SAAT);
      await yazar.birTur();
    }
    expect(yazar.metrikler.goruntuAtlanan).toBe(1); // aynı bekleyen görüntü bir kez sayılır
    expect(depo.goruntu.sayi).toBe(ilkSayi); // henüz hiçbiri yazılmadı, kuyruk da yok
    await yazar.goruntuIsiBekle();
    expect(depo.goruntu.sayi).toBe(ilkSayi + 1);
    saat.ilerlet(9 * SAAT);
    await yazar.birTur(); // iş bitti: yeni görüntü başlar
    expect(yazar.goruntuIsiSuruyor).toBe(true);
    await yazar.goruntuIsiBekle();
    expect(depo.goruntu.sayi).toBe(ilkSayi + 2);
    delete process.env.BOLGE_TEST_ISCI_GECIKME_MS;
  }, 60_000);

  it("isci hatasi olumcul degil: uyari, yeniden deneme; ardisik 3 hatada eszamanli goruntu; komutlar sürer", async () => {
    const { yazar, saat, depo, gonder } = await kur({ araligiSaat: 1, goruntuIsci: { betik: new URL("./olmayan-isci.ts", import.meta.url) } });
    const uyarilar: string[] = [];
    yazar.uyari((m) => uyarilar.push(m));
    const ilkSayi = depo.goruntu.sayi;
    for (let i = 2; i <= 12; i++) {
      saat.ilerlet(i * SAAT);
      await yazar.birTur();
      await yazar.goruntuIsiBekle();
    }
    expect(yazar.olumculMu).toBe(false);
    expect(yazar.metrikler.isciHatasi).toBeGreaterThanOrEqual(3);
    expect(uyarilar.some((m) => m.includes("isci"))).toBe(true);
    // Ardışık 3 hatadan sonra görüntü eşzamanlı alındı: görüntüler kaybolmadı.
    expect(depo.goruntu.sayi).toBeGreaterThan(ilkSayi);
    expect(await gonder("ali", { tur: "vergi_ayarla", oranPpm: 100_000 })).toBe(true); // yazar sağlam
  }, 60_000);

  it("goruntu yazilmadan cokme: eski goruntu + gunluk ayni dunyayi verir", async () => {
    process.env.BOLGE_TEST_ISCI_GECIKME_MS = "1500";
    const depo = bellekDeposu();
    const { yazar, saat, gonder } = await kur({ araligiSaat: 1, depo, goruntuIsci: { betik: new URL("./yavas-isci.ts", import.meta.url) } });
    saat.ilerlet(2 * SAAT);
    await yazar.birTur();
    expect(yazar.goruntuIsiSuruyor).toBe(true); // iş sürüyor, görüntü HENÜZ yazılmadı
    await gonder("ali", { tur: "vergi_ayarla", oranPpm: 150_000 }); // görüntüden sonraki günlük kaydı
    const t = yazar.sim.dunya.zaman;
    const ozet = yazar.ozet();
    // "Çökme": yeni yazar aynı depodan (eski görüntü + günlük) kurtarır; süren iş hiç yazılmamış sayılır.
    const kurtarilan = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    yazarlar.push(kurtarilan);
    expect(kurtarilan.kurtarma.kalanKayit).toBeGreaterThan(0);
    kurtarilan.sim.calistirKadar(t);
    expect(kurtarilan.seq).toBe(ozet.seq);
    expect(kurtarilan.sim.durumOzeti()).toBe(ozet.durumOzeti);
    delete process.env.BOLGE_TEST_ISCI_GECIKME_MS;
  }, 60_000);
});
