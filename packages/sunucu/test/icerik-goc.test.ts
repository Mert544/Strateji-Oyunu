/**
 * İçerik göçü (docs/06 §14.2): `gocIzni` (CLI `--goc`) varsayılan KAPALI. Kapalıyken kural sürümü uyuşmazlığı hata (eski
 * davranış). Açıkken ve YALNIZ görüntüden sonra günlük kaydı yokken (dönem sınırı) görüntü göçürülür, hemen yeni görüntü
 * alınır (sonraki açılış göçmez). Günlük kuyruğu doluyken göç reddedilir (günlük yeniden oynatılmaz). `yalnizEkleZorunlu`
 * varsayılan açık. Zarf v1 görüntüden kurtarma (kural aynıyken) ayrıca sınanır.
 */
import { spawn } from "node:child_process";
import { copyFile, mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { IcerikKimlikTablosu, Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { dosyaDeposu } from "../src/depo/dosya";
import { ElleSaat } from "../src/saat";
import { ac, arayaMal, eskiDunya, sonaMal } from "./goc-yardimci";
import { GUNEY, KUZEY, veri } from "./yardimci";

const KOK = fileURLToPath(new URL("../../../", import.meta.url));
const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

describe("zarf v1 goruntuden kurtarma (kural ayni)", () => {
  it("v2 goruntunun tablosuz/surum 1 hali (dunya ve ozet bayt bayt ayni) bayraksiz acilir; ozet ayni", async () => {
    const e = await eskiDunya(bellekDeposu());
    const g = await e.depo.goruntu.sonuncu();
    expect(g).not.toBeNull();
    const zarf = JSON.parse((g as NonNullable<typeof g>).metin) as Record<string, unknown>;
    expect(zarf.surum).toBe(2);
    delete zarf.icerikKimlikTablosu;
    zarf.surum = 1;
    const v1 = { ...(g as NonNullable<typeof g>), metin: JSON.stringify(zarf) };
    const depo = bellekDeposu();
    await depo.goruntu.kaydet(v1);
    const y = await ac(depo, veri(), new ElleSaat());
    expect(y.kurtarma.goc).toBeNull();
    expect(y.kurtarma.simZamani).toBe(e.t);
    expect(y.ozet().durumOzeti).toBe(e.ozet);
    await y.kapat();
    // Yeniden yazılan görüntü zarf v2'dir.
    expect(JSON.parse((await depo.goruntu.sonuncu())!.metin).surum).toBe(2);
  });

  it("G2'nin gercek v1 fikstur goruntusu (eski cekirdekle yazilmis): kural ayniysa bayraksiz; degismisse bayraksiz hata, bayrakla eskiTablo ister, tabloyla goc eder", async () => {
    const dizin = new URL("../../cekirdek/test/fikstur-goc/", import.meta.url);
    const ust = JSON.parse(readFileSync(new URL("bolge-v1.ust.json", dizin), "utf8")) as { kural: string; ozet: string; zaman: number; tablo: IcerikKimlikTablosu };
    const metin = readFileSync(new URL("bolge-v1.json", dizin), "utf8");
    const kayit = { seq: 0, simZamani: ust.zaman, kuralSurumu: ust.kural, semaSurumu: 1, durumOzeti: ust.ozet, metin, ek: { tohum: 21, idempotans: [] } };
    const depo = () => {
      const d = bellekDeposu();
      void d.goruntu.kaydet(structuredClone(kayit));
      return d;
    };
    if (ust.kural === kuralSurumuHesapla(veri())) {
      const y = await ac(depo(), veri(), new ElleSaat());
      expect(y.kurtarma.goc).toBeNull();
      expect(y.kurtarma.durumOzeti).toBe(ust.ozet);
      await y.kapat();
      return;
    }
    // Parametre/içerik fikstürden sonra değişmiş (kural farklı): bayraksız hata; bayrakla v1 tablosuz olduğundan eskiTablo ister;
    // yazıldığı içeriğin tablosu verilince göç eder (tablo mevcutla aynıysa yeniden indeksleme yok, özet yazıldığı haliyle aynı).
    await expect(ac(depo(), veri(), new ElleSaat())).rejects.toThrow(/kural surumu uyusmuyor/);
    await expect(ac(depo(), veri(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/eskiTablo/);
    const y = await ac(depo(), veri(), new ElleSaat(), { gocIzni: true, gocEskiTablo: ust.tablo });
    expect(y.kurtarma.goc?.eskiKuralSurumu).toBe(ust.kural);
    expect(y.kurtarma.goc?.ihlalSayisi).toBe(0);
    expect(y.kurtarma.simZamani).toBe(ust.zaman);
    if (!y.kurtarma.goc?.yenidenIndekslendi) expect(y.kurtarma.durumOzeti).toBe(ust.ozet);
    await y.kapat();
  });
});

describe("icerik gocu: --goc / gocIzni", () => {
  it("bayraksiz (varsayilan) kural surumu degismisse hata; veri dokunulmaz", async () => {
    const e = await eskiDunya(bellekDeposu());
    await expect(ac(e.depo, sonaMal(), new ElleSaat())).rejects.toThrow(/kural surumu uyusmuyor/);
    // Eski içerikle açılış hala çalışır.
    const y = await ac(e.depo, veri(), new ElleSaat());
    expect(y.kurtarma.durumOzeti).toBe(e.ozet);
    await y.kapat();
  });

  it("bayrakla sona eklenmis icerik goc eder: rapor, ozet denetimi, hemen yeni goruntu, ikinci acilista goc yok", async () => {
    const e = await eskiDunya(bellekDeposu());
    const eskiKural = kuralSurumuHesapla(veri());
    const yeniKural = kuralSurumuHesapla(sonaMal());
    expect(yeniKural).not.toBe(eskiKural);
    const saat = new ElleSaat();
    const y = await ac(e.depo, sonaMal(), saat, { gocIzni: true });
    expect(y.kurtarma.goc).toMatchObject({ yenidenIndekslendi: true, eskiKuralSurumu: eskiKural, yeniKuralSurumu: yeniKural, yalnizEkle: true, eklenenSayisi: 1, ihlalSayisi: 0 });
    expect(y.kurtarma.goc?.eklenen.mallar).toEqual(["titanyum"]);
    // Göç öncesi görüntü AYRI yedeklendi (bellek deposu): eski kural sürümlü, aynı seq/zaman/özet.
    expect(y.kurtarma.goc?.yedek).toBe(`bellek:goc-${eskiKural}`);
    expect(e.depo.goruntu.yedekler.get(`goc-${eskiKural}`)).toMatchObject({ kuralSurumu: eskiKural, seq: e.seq, simZamani: e.t, durumOzeti: e.ozet });
    expect(y.kuralSurumu).toBe(yeniKural);
    expect(y.kurtarma.simZamani).toBe(e.t);
    expect(y.kurtarma.seq).toBe(e.seq);
    expect(y.kurtarma.durumOzeti).not.toBe(e.ozet); // dizi uzunlukları değişti
    expect(y.sim.ic.malIndeks["titanyum"]).toBe(veri().icerik.mallar.length);
    // Hemen yeni görüntü: güncel kural sürümlü, zarf v2, aynı seq/zaman.
    const g = (await e.depo.goruntu.sonuncu())!;
    expect(g).toMatchObject({ kuralSurumu: yeniKural, seq: e.seq, simZamani: e.t, durumOzeti: y.kurtarma.durumOzeti });
    expect(JSON.parse(g.metin).surum).toBe(2);
    // Göçmüş dünya çalışır: komut ve zaman ilerlemesi.
    saat.ilerlet(e.t + 6 * SAAT);
    const p = y.komutGonder("ali", "test", "goc-sonrasi", { tur: "vergi_ayarla", oranPpm: 91_000 });
    await y.birTur();
    expect((await p).sonuc.tamam).toBe(true);
    const ozet = y.ozet();
    await y.kapat();
    // İkinci açılış: bayraksız, göç yok, aynı özet.
    const y2 = await ac(e.depo, sonaMal(), new ElleSaat());
    expect(y2.kurtarma.goc).toBeNull();
    expect(y2.kurtarma.durumOzeti).toBe(ozet.durumOzeti);
    expect(y2.kurtarma.seq).toBe(ozet.seq);
    await y2.kapat();
  });

  it("gunluk kuyrugu doluyken goc reddedilir (gunluk yeniden oynatilmaz); once eski kuralla acip goruntu alinca goc eder", async () => {
    const depo = bellekDeposu();
    const saat = new ElleSaat();
    const y = await ac(depo, veri(), saat); // acilis goruntusu seq 0; kapat YOK (kill -9 benzeri): kuyruk dolu
    let n = 0;
    for (const [o, k] of [
      [SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }],
      [SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY }],
      ["ali", { tur: "vergi_ayarla", oranPpm: 81_000 }],
    ] as Array<[string, Komut]>) {
      const p = y.komutGonder(o, "test", `k${n++}`, k);
      await y.birTur();
      await p;
    }
    expect((await depo.gunluk.oku(0)).length).toBe(3);
    await expect(ac(depo, sonaMal(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/goc yalniz donem sinirinda: goruntuden \(seq 0\) sonra 3 gunluk kaydi var/);
    // Eski kuralla (bayraksız) açıp düzgün kapatınca görüntü güncellenir; kuyruk boşalır; göç mümkün.
    const eski = await ac(depo, veri(), new ElleSaat());
    expect(eski.kurtarma.kalanKayit).toBe(3);
    await eski.kapat();
    const yeni = await ac(depo, sonaMal(), new ElleSaat(), { gocIzni: true });
    expect(yeni.kurtarma.goc?.eklenenSayisi).toBe(1);
    expect(yeni.kurtarma.seq).toBe(3);
    await yeni.kapat();
  });

  it("yalnizEkleZorunlu varsayilan acik: araya ekleme reddedilir; kapaliyken (gelistirme) rapora yazilir", async () => {
    const e = await eskiDunya(bellekDeposu());
    await expect(ac(e.depo, arayaMal(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/yalniz-ekle ihlali/);
    const y = await ac(e.depo, arayaMal(), new ElleSaat(), { gocIzni: true, yalnizEkleZorunlu: false });
    expect(y.kurtarma.goc).toMatchObject({ yenidenIndekslendi: true, yalnizEkle: false, eklenenSayisi: 1 });
    expect(y.kurtarma.goc?.ihlalSayisi).toBeGreaterThan(0);
    await y.kapat();
  });

  it("ust verideki ozet bozuksa goc de reddedilir (eskiDurumOzeti'ne karsi); gocIzni kural ayniyken etkisizdir", async () => {
    const e = await eskiDunya(bellekDeposu());
    const g = (await e.depo.goruntu.sonuncu())!;
    const bozuk = bellekDeposu();
    await bozuk.goruntu.kaydet({ ...g, durumOzeti: "0000000000000000" });
    await expect(ac(bozuk, sonaMal(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/ozet uyusmuyor/);
    // Kural aynı: gocIzni açık olsa da göç yapılmaz, normal kurtarma.
    const y = await ac(e.depo, veri(), new ElleSaat(), { gocIzni: true });
    expect(y.kurtarma.goc).toBeNull();
    expect(y.kurtarma.durumOzeti).toBe(e.ozet);
    await y.kapat();
  });
});

describe("CLI --goc", () => {
  it("bayrak taninir; kural ayniyken kurtarma raporunda goc null", async () => {
    const p = spawn(process.execPath, ["--import", "tsx", CLI, "--port", "0", "--harita", "mini", "--depo", "bellek", "--elle-saat", "--goc"], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] });
    try {
      const olay = await new Promise<Record<string, unknown>>((coz, reddet) => {
        let tampon = "";
        p.stdout?.on("data", (b: Buffer) => {
          tampon += b.toString();
          for (const satir of tampon.split("\n")) if (satir.startsWith("{") && JSON.parse(satir).olay === "hazir") coz(JSON.parse(satir) as Record<string, unknown>);
        });
        p.once("exit", (kod) => reddet(new Error(`cikti: ${kod}`)));
      });
      expect((olay.kurtarma as { goc: unknown }).goc).toBeNull();
    } finally {
      p.kill("SIGKILL");
    }
  }, 30_000);
});

// --- dosya deposu: göç öncesi görüntünün yedeği (üzerine yazma yok) ---------------------------------------------------

const dizinler: string[] = [];
afterEach(async () => {
  for (const d of dizinler.splice(0)) await rm(d, { recursive: true, force: true });
});

async function dosyaDunyasi(): Promise<{ dizin: string; t: number; ozet: string; seq: number }> {
  const dizin = await mkdtemp(join(tmpdir(), "bolge-goc-"));
  dizinler.push(dizin);
  const depo = await dosyaDeposu(dizin);
  const saat = new ElleSaat();
  const y = await ac(depo , veri(), saat);
  let n = 0;
  for (const [o, k] of [
    [SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }],
    [SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "veli", bolgeler: GUNEY }],
  ] as Array<[string, Komut]>) {
    const p = y.komutGonder(o, "test", `d${n++}`, k);
    await y.birTur();
    await p;
  }
  saat.ilerlet(8 * SAAT);
  await y.birTur();
  const ozet = y.ozet();
  await y.kapat();
  return { dizin, t: ozet.t, ozet: ozet.durumOzeti, seq: ozet.seq };
}

const goruntuDosyalari = async (dizin: string): Promise<string[]> => (await readdir(join(dizin, "goruntu"))).sort();

describe("goc yedegi: dosya deposu", () => {
  it("goctan sonra yedek dosya var ve eski goruntuyle bayt bayt ayni; goc yedegin uzerine yazmaz", async () => {
    const d = await dosyaDunyasi();
    const eskiKural = kuralSurumuHesapla(veri());
    const once = await goruntuDosyalari(d.dizin);
    const eskiAd = once.filter((x) => x.endsWith(".goruntu")).at(-1) as string;
    const eskiBayt = await readFile(join(d.dizin, "goruntu", eskiAd));
    const y = await ac(await dosyaDeposu(d.dizin) , sonaMal(), new ElleSaat(), { gocIzni: true });
    const yedekAd = `${eskiAd}.goc-${eskiKural}.yedek`;
    expect(y.kurtarma.goc?.yedek).toBe(join(d.dizin, "goruntu", yedekAd));
    await y.kapat();
    const sonra = await goruntuDosyalari(d.dizin);
    expect(sonra).toContain(yedekAd);
    expect(await readFile(join(d.dizin, "goruntu", yedekAd))).toEqual(eskiBayt); // bayt bayt aynı
    // Yeni görüntü aynı adla yazıldı (eski kopya yedekte): içerik farklı, kural sürümü yeni.
    const yeniBayt = await readFile(join(d.dizin, "goruntu", eskiAd));
    expect(yeniBayt.equals(eskiBayt)).toBe(false);
    expect(JSON.parse(yeniBayt.toString("utf8").split("\n")[0] as string).kuralSurumu).toBe(kuralSurumuHesapla(sonaMal()));
    // Yedek `sonuncu()`a girmez ve saklama sınırıyla silinmez (.goruntu ile bitmez).
    expect(yedekAd.endsWith(".goruntu")).toBe(false);
  });

  it("geri donus: yedek geri kopyalanirsa eski icerikle yeniden acilis mumkun, ozet ayni", async () => {
    const d = await dosyaDunyasi();
    const eskiKural = kuralSurumuHesapla(veri());
    const eskiAd = (await goruntuDosyalari(d.dizin)).filter((x) => x.endsWith(".goruntu")).at(-1) as string;
    const y = await ac(await dosyaDeposu(d.dizin) , sonaMal(), new ElleSaat(), { gocIzni: true });
    await y.kapat();
    // Göç hatalıysa: sunucu kapalıyken yedeği geri kopyala.
    await copyFile(join(d.dizin, "goruntu", `${eskiAd}.goc-${eskiKural}.yedek`), join(d.dizin, "goruntu", eskiAd));
    const eski = await ac(await dosyaDeposu(d.dizin) , veri(), new ElleSaat());
    expect(eski.kurtarma.goc).toBeNull();
    expect(eski.kurtarma.durumOzeti).toBe(d.ozet);
    expect(eski.kurtarma.simZamani).toBe(d.t);
    await eski.kapat();
  });

  it("yedekleme basarisizsa goc durur: dunya, goruntu ve gunluk degismez", async () => {
    const e = await eskiDunya(bellekDeposu());
    const g0 = await e.depo.goruntu.sonuncu();
    const sayi0 = e.depo.goruntu.sayi;
    e.depo.goruntu.yedekle = async () => {
      throw new Error("disk dolu");
    };
    await expect(ac(e.depo, sonaMal(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/goc yedegi alinamadi \(disk dolu\); goc durdu, depo ve dunya degismedi/);
    expect(e.depo.goruntu.sayi).toBe(sayi0);
    expect(await e.depo.goruntu.sonuncu()).toEqual(g0); // eski görüntü dokunulmadı
    // Yedek yeteneği hiç yoksa da göç reddedilir.
    (e.depo.goruntu as { yedekle?: unknown }).yedekle = undefined;
    await expect(ac(e.depo, sonaMal(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/goruntu\.yedekle|yedek/);
    expect(e.depo.goruntu.sayi).toBe(sayi0);
  });

  it("dosya deposu: kaynak goruntu dosyasi yoksa yedekle fırlatir (yedek alinamadi)", async () => {
    const d = await dosyaDunyasi();
    const depo = await dosyaDeposu(d.dizin);
    await expect(depo.goruntu.yedekle?.({ seq: 999, simZamani: 1, kuralSurumu: "k", semaSurumu: 1, durumOzeti: "x", metin: "{}", ek: { tohum: 1, idempotans: [] } }, "goc-x")).rejects.toThrow(/ENOENT/);
    await depo.gunluk.kapat();
  });
});
