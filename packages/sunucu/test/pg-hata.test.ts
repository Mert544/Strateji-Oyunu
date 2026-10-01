/**
 * pg asenkron ölümcül hata (Postgres'siz, sahte havuzla): bağlantı koptuğunda havuz ve dünya kilidini tutan istemci `error` olayı yayar. Dinleyici
 * yoksa Node işlenmemiş `error` olayıyla süreci çökertirdi (`olumcul` olayı ve `/saglik` 503 olmadan). Beklenen: yazar ölümcül olur
 * (`olumculHata` dinleyicisi çağrılır, `/saglik` 503, `bolge_olumcul 1`, komut reddedilir), süreç çökmez, kapanış kontrollüdür.
 * Gerçek pg'de bağlantı zorla kesme testi: test/pg.test.ts (yalnız BOLGE_PG_URL ile).
 */
import { EventEmitter } from "node:events";
import { afterEach, describe, expect, it } from "vitest";
import type { Pool } from "pg";
import { postgresDeposu, SQL_SEMA_SURUMU } from "../src/depo/postgres";
import { havuzaDinleyiciTak } from "../src/depo/pg-havuz";
import { GelistirmeKimligi } from "../src/kimlik";
import { ElleSaat } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { SIR, veri } from "./yardimci";

type Sonuc = { rows: unknown[]; rowCount: number };

/** Yalnız bu testin gereksindiği sorulara cevap veren sahte istemci/havuz. */
class SahteIstemci extends EventEmitter {
  serbest = 0;
  async query(sql: string): Promise<Sonuc> {
    if (sql.includes("pg_try_advisory_lock")) return { rows: [{ alindi: true }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
  release(): void {
    this.serbest++;
  }
}

class SahteHavuz extends EventEmitter {
  readonly istemciler: SahteIstemci[] = [];
  bitti = false;
  async query(sql: string): Promise<Sonuc> {
    if (sql.includes("to_regclass('sunucu_sema')")) return { rows: [{ var: true }], rowCount: 1 };
    if (sql.includes("max(surum)")) return { rows: [{ surum: SQL_SEMA_SURUMU }], rowCount: 1 };
    if (sql.includes("max(seq)")) return { rows: [{ seq: null }], rowCount: 1 };
    return { rows: [], rowCount: 0 };
  }
  async connect(): Promise<SahteIstemci> {
    const c = new SahteIstemci();
    this.istemciler.push(c);
    this.emit("connect", c); // gercek havuz her yeni istemci icin baglanti kurulunca 'connect' yayar (ilk odunc almadan once)
    return c;
  }
  async end(): Promise<void> {
    this.bitti = true;
  }
}

const kapatilacak: Array<() => Promise<void>> = [];
afterEach(async () => {
  for (const f of kapatilacak.splice(0).reverse()) await f().catch(() => undefined);
});

async function kur(): Promise<{ havuz: SahteHavuz; depo: Awaited<ReturnType<typeof postgresDeposu>> }> {
  const havuz = new SahteHavuz();
  const depo = await postgresDeposu({ baglanti: "", dunya: "sahte", semaKur: false, havuz: havuz as unknown as Pool });
  return { havuz, depo };
}

async function yazarVeSunucu(depo: Awaited<ReturnType<typeof postgresDeposu>>): Promise<{ yazar: DunyaYazari; sunucu: CalisanSunucu; olumculler: Error[] }> {
  const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
  const olumculler: Error[] = [];
  yazar.olumculHata((e) => olumculler.push(e));
  const sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
  kapatilacak.push(() => sunucu.kapat());
  return { yazar, sunucu, olumculler };
}

const saglik = async (sunucu: CalisanSunucu): Promise<{ kod: number; durum: string }> => {
  const r = await fetch(`http://127.0.0.1:${sunucu.port}/saglik`);
  return { kod: r.status, durum: ((await r.json()) as { durum: string }).durum };
};

describe("pg asenkron olumcul hata (sahte havuz)", () => {
  it("havuz 'error' olayi: surec cokmez, yazar olumcul olur (olumculHata cagrilir), /saglik 503, bolge_olumcul 1, komut reddedilir, kapanis kontrollu", async () => {
    const { havuz, depo } = await kur();
    expect(havuz.listenerCount("error")).toBeGreaterThan(0); // dinleyici yoksa emit('error') fırlatır ve süreç çöker
    const { yazar, sunucu, olumculler } = await yazarVeSunucu(depo);
    expect(await saglik(sunucu)).toEqual({ kod: 200, durum: "ok" });
    expect(() => havuz.emit("error", new Error("Connection terminated unexpectedly"))).not.toThrow();
    expect(yazar.olumculMu).toBe(true);
    expect(olumculler).toHaveLength(1);
    expect(olumculler[0]?.message).toMatch(/depo baglantisi koptu; yazar durdu: Connection terminated unexpectedly/);
    expect(await saglik(sunucu)).toEqual({ kod: 503, durum: "olumcul" });
    expect(await sunucu.metrikMetni()).toContain("bolge_olumcul 1");
    await expect(yazar.komutGonder("ali", "i", "k1", { tur: "vergi_ayarla", oranPpm: 1 })).rejects.toThrow(/yazar durdu/);
    // İkinci hata (bağlantı birden çok yerden kopar) tekrar bildirmez.
    havuz.emit("error", new Error("ikinci"));
    expect(olumculler).toHaveLength(1);
    // Kontrollü çıkış: kapanış takılmaz (ölümcül yazar son görüntü almaz), depo kapatılır.
    await sunucu.kapat();
    expect(havuz.bitti).toBe(true);
  });

  it("dunya kilidini tutan istemcinin 'error' olayi da ayni yoldan olumculdur (kilit gittiyse tek yazar garantisi yoktur)", async () => {
    const { havuz, depo } = await kur();
    const { yazar, sunucu, olumculler } = await yazarVeSunucu(depo);
    const kilit = havuz.istemciler[0] as SahteIstemci; // postgresDeposu'nun tuttuğu ilk (kilit) bağlantısı
    expect(kilit.listenerCount("error")).toBeGreaterThan(0);
    expect(() => kilit.emit("error", new Error("terminating connection due to administrator command"))).not.toThrow();
    expect(yazar.olumculMu).toBe(true);
    expect(olumculler[0]?.message).toContain("terminating connection");
    expect(await saglik(sunucu)).toEqual({ kod: 503, durum: "olumcul" });
  });

  it("ODUNC ALINMIS (kilit olmayan) istemcinin 'error' olayi da surec dusurmez ve olumcul yoldan gider; ayni hata nesnesi havuzdan ve istemciden gelse de BIR kez bildirilir", async () => {
    const { havuz, depo } = await kur();
    const { yazar, olumculler } = await yazarVeSunucu(depo);
    const c = (await havuz.connect()) as SahteIstemci; // islem sirasinda alinan baska bir baglanti (hesap/profil/gunluk yazimi gibi)
    expect(c.listenerCount("error")).toBeGreaterThan(0); // havuzun dinleyicisi checkout'ta kalkar: dinleyiciyi depo takar
    const e = new Error("terminating connection due to administrator command");
    expect(() => c.emit("error", e)).not.toThrow();
    expect(() => havuz.emit("error", e)).not.toThrow();
    expect(yazar.olumculMu).toBe(true);
    expect(olumculler).toHaveLength(1);
    expect(olumculler[0]?.message).toContain("terminating connection");
  });

  it("havuzaDinleyiciTak (test ve arac havuzlari): havuz ve her yeni istemci 'error'u yutar (dinleyicisiz EventEmitter'da emit('error') firlatir: sureci dusururdu); bildir cagrilir", () => {
    const sahip = new SahteHavuz();
    expect(() => new SahteHavuz().emit("error", new Error("dinleyicisiz"))).toThrow(/dinleyicisiz/); // karsit kanit: dinleyicisiz bugunku kirilma
    const gelen: string[] = [];
    havuzaDinleyiciTak(sahip as unknown as Pool, (e) => gelen.push(e.message));
    expect(() => sahip.emit("error", new Error("bosta 57P01"))).not.toThrow();
    const c = new SahteIstemci();
    sahip.emit("connect", c);
    expect(() => c.emit("error", new Error("odunc 57P01"))).not.toThrow();
    expect(gelen).toEqual(["bosta 57P01", "odunc 57P01"]);
    // Varsayilan bildir: hata yutulur.
    const sessiz = havuzaDinleyiciTak(new SahteHavuz() as unknown as Pool);
    expect(() => (sessiz as unknown as EventEmitter).emit("error", new Error("x"))).not.toThrow();
  });

  it("yazar kurulmadan once gelen hata kaybolmaz: yazar kurulunca olumcul olur ve olumculHata dinleyicisi eklenince hemen bildirilir", async () => {
    const { havuz, depo } = await kur();
    expect(() => havuz.emit("error", new Error("acilista koptu"))).not.toThrow();
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    kapatilacak.push(() => yazar.kapat());
    expect(yazar.olumculMu).toBe(true);
    const gelen: Error[] = [];
    yazar.olumculHata((e) => gelen.push(e));
    expect(gelen).toHaveLength(1);
    expect(gelen[0]?.message).toContain("acilista koptu");
  });

  it("kapanistan sonraki hata yok sayilir (normal kapanista olumcul olay uretmez)", async () => {
    const { havuz, depo } = await kur();
    const { yazar, sunucu, olumculler } = await yazarVeSunucu(depo);
    await sunucu.kapat();
    expect(() => havuz.emit("error", new Error("kapanista"))).not.toThrow();
    expect(yazar.olumculMu).toBe(false);
    expect(olumculler).toHaveLength(0);
  });

  it("dinleyicisiz depolar (bellek, dosya) etkilenmez: hataDinle yok", async () => {
    const { bellekDeposu } = await import("../src/depo/bellek");
    expect(bellekDeposu().hataDinle).toBeUndefined();
    const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo: bellekDeposu(), saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
    kapatilacak.push(() => yazar.kapat());
    expect(yazar.olumculMu).toBe(false);
  });
});
