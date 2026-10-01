/**
 * Komut sınırında `HucreDiziniBuyukHatasi` (G3b): çekirdek, sınırı aşan ilçede tembel hücre dizisi açılmak istenince bu hatayı fırlatır. Üretimde
 * süreç çökmez, yazar durmaz, komut reddedilir ve yan etkisiz kalır, Türkçe günlük satırı yazılır; günlükteki kayıt yeniden oynatmada aynı sonucu verir.
 * Gerçek çekirdek sınıfı (`@bolge/cekirdek` `HucreDiziniBuyukHatasi`) `instanceof` ile tanınır; aynı adlı yabancı sınıf TANINMAZ (ad denetimi kalktı).
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { HucreDiziniBuyukHatasi, SISTEM_OYUNCUSU, Simulasyon, TEMBEL_HUCRE_SINIRI } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { bellekDeposu } from "../src/depo/bellek";
import { ElleSaat } from "../src/saat";
import { DunyaYazari, hucreDiziniBuyukMu } from "../src/yazar";
import { KUZEY, testSunucusu, veri } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

/** Aynı adlı ama çekirdeğe ait OLMAYAN sınıf: tanınmamalı (ad denetimi değil `instanceof`). */
class SahteHucreDiziniBuyukHatasi extends Error {
  constructor() {
    super("sahte");
    this.name = "HucreDiziniBuyukHatasi";
  }
}

const KOTU_ORAN = 777;
const kotuMu = (k: Komut): boolean => k.tur === "vergi_ayarla" && k.oranPpm === KOTU_ORAN;

/** `Simulasyon.uygula` kötü komutta hücre dizini hatası fırlatır (durum değiştirmeden); diğerleri gerçek uygulama. */
function hatayiKur(): void {
  const gercek = Simulasyon.prototype.uygula;
  vi.spyOn(Simulasyon.prototype, "uygula").mockImplementation(function (this: Simulasyon, ...a: Parameters<Simulasyon["uygula"]>) {
    if (kotuMu(a[0].komut)) throw new HucreDiziniBuyukHatasi("tr_41_gebze", 400_000);
    return gercek.apply(this, a);
  });
}

let ts: TestSunucusu | null = null;
const yazarlar: DunyaYazari[] = [];
afterEach(async () => {
  vi.restoreAllMocks();
  await ts?.kapat();
  ts = null;
  for (const y of yazarlar.splice(0)) await y.kapat().catch(() => undefined);
});

async function ac(depo = bellekDeposu(), saat = new ElleSaat()): Promise<{ yazar: DunyaYazari; saat: ElleSaat; depo: ReturnType<typeof bellekDeposu>; uyarilar: string[] }> {
  const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat, commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
  yazarlar.push(yazar);
  const uyarilar: string[] = [];
  yazar.uyari((m) => uyarilar.push(m));
  return { yazar, saat, depo, uyarilar };
}

async function gonder(y: DunyaYazari, oyuncu: string, anahtar: string, komut: Komut) {
  const p = y.komutGonder(oyuncu, "test", anahtar, komut);
  await y.birTur();
  return p;
}

describe("HucreDiziniBuyukHatasi komut sınırında", () => {
  it("yalnız çekirdeğin sınıfı tanınır (instanceof); aynı adlı yabancı sınıf, düz Error ve dize tanınmaz", () => {
    expect(hucreDiziniBuyukMu(new HucreDiziniBuyukHatasi("x", TEMBEL_HUCRE_SINIRI + 1))).toBe(true);
    expect(hucreDiziniBuyukMu(new SahteHucreDiziniBuyukHatasi())).toBe(false);
    expect(hucreDiziniBuyukMu(new Error("baska"))).toBe(false);
    expect(hucreDiziniBuyukMu("HucreDiziniBuyukHatasi")).toBe(false);
  });

  it("komut reddedilir (başarısız sonuç), dünya değişmez, yazar durmaz, Türkçe günlük satırı; sonraki komut normal işlenir", async () => {
    hatayiKur();
    const { yazar, uyarilar } = await ac();
    expect((await gonder(yazar, SISTEM_OYUNCUSU, "k0", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY })).sonuc.tamam).toBe(true);
    const once = yazar.sim.durumOzeti();
    const r = await gonder(yazar, "ali", "kotu", { tur: "vergi_ayarla", oranPpm: KOTU_ORAN });
    expect(r.sonuc.tamam).toBe(false);
    expect((r.sonuc as { hata: string }).hata).toMatch(/^hucre dizini siniri: komut reddedildi \(ilce tr_41_gebze 400000 hucre/);
    expect(yazar.olumculMu).toBe(false);
    expect(yazar.sim.durumOzeti()).toBe(once); // yan etkisiz
    expect(uyarilar).toHaveLength(1);
    expect(uyarilar[0]).toMatch(/^komut reddedildi \(hucre dizini cok buyuk: ilce tr_41_gebze\); seq 2, oyuncu ali, komut vergi_ayarla$/);
    expect(yazar.metrikler.komutBasarisiz).toBe(1);
    // Sonraki komut normal işlenir; aynı anahtarla tekrar ilk (reddedilmiş) sonucu döner.
    const iyi = await gonder(yazar, "ali", "iyi", { tur: "vergi_ayarla", oranPpm: 90_000 });
    expect(iyi.sonuc.tamam).toBe(true);
    expect(yazar.seq).toBe(3);
    const tekrar = await gonder(yazar, "ali", "kotu", { tur: "vergi_ayarla", oranPpm: KOTU_ORAN });
    expect(tekrar.tekrar).toBe(true);
    expect(tekrar.sonuc.tamam).toBe(false);
    expect(uyarilar).toHaveLength(1); // yeniden uygulanmadı
  });

  it("günlükteki reddedilmiş komut yeniden oynatmada (kurtarma) AYNI sonucu verir: açılış çökmez, özet aynı", async () => {
    hatayiKur();
    const a = await ac();
    await gonder(a.yazar, SISTEM_OYUNCUSU, "k0", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    await gonder(a.yazar, "ali", "kotu", { tur: "vergi_ayarla", oranPpm: KOTU_ORAN });
    await gonder(a.yazar, "ali", "iyi", { tur: "vergi_ayarla", oranPpm: 91_000 });
    const ozet = a.yazar.sim.durumOzeti();
    // Görüntü yok (kapanış görüntüsü alınmadı): ikinci yazar günlüğün tamamını yeniden oynatır.
    const b = await ac(a.depo);
    expect(b.yazar.kurtarma.kalanKayit).toBe(3);
    expect(b.yazar.olumculMu).toBe(false);
    expect(b.yazar.sim.durumOzeti()).toBe(ozet);
    expect(b.yazar.kurtarma.uyarilar).toEqual(["komut reddedildi (hucre dizini cok buyuk: ilce tr_41_gebze); seq 2, oyuncu ali, komut vergi_ayarla"]); // açılış günlüğüne yazılır
    expect(b.yazar.kurtarma.kalanBasarisiz).toBe(1);
  });

  it("gerçek ws: oyuncuya komutSonucu (tamam: false) gider, bağlantı ve sunucu ayakta; sonraki komut tamam", async () => {
    hatayiKur();
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    expect((await y.komut("k0", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY })).tur).toBe("komutSonucu");
    const ali = await ts.baglan("ali");
    const r = await ali.komut("kotu", { tur: "vergi_ayarla", oranPpm: KOTU_ORAN });
    expect(r.tur === "komutSonucu" && !r.sonuc.tamam && r.sonuc.hata).toMatch(/hucre dizini siniri/);
    const iyi = await ali.komut("iyi", { tur: "vergi_ayarla", oranPpm: 80_000 });
    expect(iyi.tur === "komutSonucu" && iyi.sonuc.tamam).toBe(true);
    expect(ts.yazar.olumculMu).toBe(false);
    expect((await fetch(`http://127.0.0.1:${ts.sunucu.port}/saglik`)).status).toBe(200);
  });
});
