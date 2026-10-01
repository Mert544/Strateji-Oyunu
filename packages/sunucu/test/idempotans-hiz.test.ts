/**
 * (b) İdempotans, hız sınırı, damgalama ve kimlik: aynı anahtar ikinci kez uygulanmaz (ilk sonuç döner), oyuncu başına
 * token-kova aşılınca komut reddedilir ve günlüğe girmez, istemcinin gönderdiği `t`/`oyuncu` yok sayılır, oyuncu
 * kimliği yalnız token'dan çözülür.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SAAT, SISTEM_OYUNCUSU } from "@bolge/cekirdek";
import { KAPANIS, PROTOKOL_SURUMU } from "@bolge/protokol";
import { SunucuIstemcisi } from "../src/istemci";
import { GUNEY, KUZEY, katil, testSunucusu, token } from "./yardimci";
import type { TestSunucusu } from "./yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

describe("idempotans", () => {
  it("ayni anahtar bir kez uygulanir; tekrarlar ilk sonucu doner (bekleyen ve bitmis durumda)", async () => {
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", KUZEY);
    const ali = await ts.baglan("ali");

    const komut = { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" } as const;
    // İkisi de aynı turda kuyruğa girer: ikincisi bekleyen girdiye bağlanır.
    const sonuclar = () => ali.gelenler.filter((m) => m.tur === "komutSonucu" && m.anahtar === "a1");
    ali.gonder({ tur: "komut", anahtar: "a1", komut });
    ali.gonder({ tur: "komut", anahtar: "a1", komut });
    while (sonuclar().length < 2) await ali.bekle((m) => m.tur === "komutSonucu");
    const [r1, r2] = sonuclar();
    if (!r1 || !r2) throw new Error("beklenmedik");
    expect(r1.tur).toBe("komutSonucu");
    expect(r2.tur).toBe("komutSonucu");
    if (r1.tur !== "komutSonucu" || r2.tur !== "komutSonucu") return;
    expect(r1.sonuc).toEqual({ tamam: true });
    expect(r2.sonuc).toEqual(r1.sonuc);
    expect(r2.seq).toBe(r1.seq);
    expect([r1.tekrar, r2.tekrar].sort()).toEqual([false, true]);

    // Commit'ten sonra yeniden gönderim: uygulanmaz, aynı seq.
    const r3 = await ali.komut("a1", komut);
    expect(r3.tur === "komutSonucu" && r3.tekrar && r3.seq === r1.seq).toBe(true);

    const gunluk = await ts.depo.gunluk.oku(0);
    expect(gunluk.filter((k) => k.anahtar === "a1")).toHaveLength(1);
    expect(ts.yazar.sim.dunya.insaatlar.filter((i) => i.sahip === "ali")).toHaveLength(1);

    // Kapsam (oyuncu, istemci, anahtar): başka istemci kimliğiyle aynı anahtar yeni komuttur.
    const ali2 = await ts.baglan("ali", "baska-sekme");
    const r4 = await ali2.komut("a1", komut);
    expect(r4.tur === "komutSonucu" && !r4.tekrar && r4.seq > r1.seq).toBe(true);
    expect(ts.yazar.sim.dunya.insaatlar.filter((i) => i.sahip === "ali")).toHaveLength(2);
  });

  it("basarisiz komutun tekrari da ayni hatayi doner ve yeniden uygulanmaz", async () => {
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", KUZEY);
    const ali = await ts.baglan("ali");
    const yabanci = { tur: "tesis_insa", bolge: "m_dag", tesisTuru: "ciftlik" } as const;
    const r1 = await ali.komut("b1", yabanci);
    const r2 = await ali.komut("b1", yabanci);
    expect(r1.tur === "komutSonucu" && !r1.sonuc.tamam).toBe(true);
    expect(r2.tur === "komutSonucu" && r2.tekrar && r1.tur === "komutSonucu" && r2.seq === r1.seq).toBe(true);
    if (r1.tur === "komutSonucu" && r2.tur === "komutSonucu") expect(r2.sonuc).toEqual(r1.sonuc);
    expect((await ts.depo.gunluk.oku(0)).filter((k) => k.anahtar === "b1")).toHaveLength(1);
  });
});

describe("damgalama ve kimlik", () => {
  it("t'yi sunucu basar; istemcinin t/oyuncu alanlari yok sayilir; oyuncu token'dan cozulur", async () => {
    ts = await testSunucusu();
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", KUZEY);
    await katil(y, "veli", GUNEY);
    await y.zamanIlerlet(5 * SAAT);
    const ali = await ts.baglan("ali");
    const bekle = ali.bekle((m) => m.tur === "komutSonucu" && m.anahtar === "c1");
    // Kötü niyetli alanlar: zarfta t/oyuncu, komutta oyuncu ve t.
    ali.gonder({ tur: "komut", anahtar: "c1", t: 1, oyuncu: "veli", istemciZamani: 123, komut: { tur: "vergi_ayarla", oranPpm: 150_000, t: 999, oyuncu: "veli" } });
    const r = await bekle;
    expect(r.tur === "komutSonucu" && r.sonuc.tamam && r.t === 5 * SAAT).toBe(true);
    const kayit = (await ts.depo.gunluk.oku(0)).find((k) => k.anahtar === "c1");
    expect(kayit).toMatchObject({ oyuncu: "ali", t: 5 * SAAT, komut: { tur: "vergi_ayarla", oranPpm: 150_000 } });
    expect(Object.keys(kayit?.komut ?? {}).sort()).toEqual(["oranPpm", "tur"]);
    expect(ts.yazar.sim.dunya.oyuncular.find((o) => o.id === "ali")?.vergiPpm).toBe(150_000);
    expect(ts.yazar.sim.dunya.oyuncular.find((o) => o.id === "veli")?.vergiPpm).not.toBe(150_000);
  });

  it("gecersiz token, eski protokol ve merhabasiz mesaj reddedilir; oyuncu_katil yalniz yonetici", async () => {
    ts = await testSunucusu();
    await expect(SunucuIstemcisi.baglan(ts.url, token("ali").slice(0, -2) + "xx")).rejects.toThrow(/kimlik/);
    await expect(SunucuIstemcisi.baglan(ts.url, `gel1.ali.${"A".repeat(43)}`)).rejects.toThrow(/kimlik/);

    const eski = await SunucuIstemcisi.baglan(ts.url);
    ts.istemciler.push(eski);
    eski.gonder({ tur: "merhaba", protokolSurumu: PROTOKOL_SURUMU + 1, token: token("ali"), istemciKimligi: "x" });
    await expect(eski.bekle(() => false, 3000)).rejects.toThrow(/kapandi/);
    expect(eski.kapanis?.kod).toBe(KAPANIS.protokol);

    const sirasiz = await SunucuIstemcisi.baglan(ts.url);
    ts.istemciler.push(sirasiz);
    sirasiz.gonder({ tur: "ozetIste" });
    await expect(sirasiz.bekle(() => false, 3000)).rejects.toThrow(/kapandi/);
    expect(sirasiz.kapanis?.kod).toBe(KAPANIS.kimlik);

    const ali = await ts.baglan("ali");
    const r = await ali.komut("k", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY });
    expect(r.tur === "hata" && r.kod === "yetki").toBe(true);
    const z = await ali.bekle((m) => m.tur === "hata", 300).catch(() => null);
    expect(z).toBeNull();
    ali.gonder({ tur: "zamanIlerlet", t: SAAT, istek: 1 });
    const h = await ali.bekle((m) => m.tur === "hata" && m.istek === 1);
    expect(h.tur === "hata" && h.kod).toBe("yetki");
    // Biçimsiz komut (zod): reddedilir, günlüğe girmez.
    ali.gonder({ tur: "komut", anahtar: "bozuk", komut: { tur: "vergi_ayarla", oranPpm: 0.5 } });
    const g = await ali.bekle((m) => m.tur === "hata");
    expect(g.tur === "hata" && g.kod).toBe("gecersiz_mesaj");
    expect((await ts.depo.gunluk.oku(0)).some((k) => k.anahtar === "bozuk" || k.anahtar === "k")).toBe(false);
  });
});

describe("hiz siniri", () => {
  it("oyuncu basina token-kova: kapasite asilinca hiz_siniri, reddedilen gunluge girmez; tekrarlar jeton harcamaz", async () => {
    ts = await testSunucusu({ hizSiniri: { kapasite: 5, saniyeBasina: 0.001 } });
    const y = await ts.baglan(SISTEM_OYUNCUSU);
    await katil(y, "ali", KUZEY);
    const ali = await ts.baglan("ali");
    const ali2 = await ts.baglan("ali", "ikinci-baglanti");
    const komut = (i: number) => ({ tur: "vergi_ayarla", oranPpm: 100_000 + i }) as const;
    // İki bağlantıdan toplam 7 farklı anahtar: kova oyuncu başınadır (bağlantı başına değil).
    const yanitlar = await Promise.all([
      ...[0, 1, 2, 3].map((i) => ali.komut(`h${i}`, komut(i))),
      ...[4, 5, 6].map((i) => ali2.komut(`h${i}`, komut(i))),
    ]);
    const kabul = yanitlar.filter((r) => r.tur === "komutSonucu");
    const red = yanitlar.filter((r) => r.tur === "hata");
    expect(kabul).toHaveLength(5);
    expect(red).toHaveLength(2);
    expect(red.every((r) => r.tur === "hata" && r.kod === "hiz_siniri")).toBe(true);
    const gunluk = await ts.depo.gunluk.oku(0);
    expect(gunluk.filter((k) => k.oyuncu === "ali")).toHaveLength(5);
    // Kabul edilmiş bir anahtarın tekrarı kova boşken de yanıtlanır (jeton harcamaz).
    const ilk = kabul[0];
    if (ilk?.tur !== "komutSonucu") throw new Error("beklenmedik");
    const tekrar = await (ilk.anahtar.startsWith("h") && Number(ilk.anahtar.slice(1)) >= 4 ? ali2 : ali).komut(ilk.anahtar, ilk.komut);
    expect(tekrar.tur === "komutSonucu" && tekrar.tekrar).toBe(true);
    // Başka oyuncunun kovası ayrıdır.
    await katil(y, "veli", GUNEY);
    const veli = await ts.baglan("veli");
    const v = await veli.komut("v1", komut(9));
    expect(v.tur).toBe("komutSonucu");
  });
});
