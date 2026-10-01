/**
 * Gerçek Postgres'e karşı (yalnız `BOLGE_PG_URL` tanımlıysa; yoksa atlanır): şema sürümü ve göç adımı (eski şemalı veritabanı
 * yükseltilir), en son görüntü seçiminin determinizmi, içerik göçü (yedek `snapshot_yedek`, geri dönüş, yedek hatasında durma,
 * günlük doluyken ret), zarf v2 + kamu arsası kurtarması, profil deposu sözleşmesi ve "sen yokken" kayıtlarının kalıcılığı.
 * Bellek ve dosya depolarının aynı sözleşmeleri `depolar.test.ts`, `icerik-goc.test.ts`, `donus.test.ts`'tedir.
 */
import { spawn } from "node:child_process";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterAll, describe, expect, it } from "vitest";
import pg from "pg";
import { SAAT, SISTEM_OYUNCUSU, kamuBloklari, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { postgresDeposu, postgresSemaSurumu, postgresSemasiKur, SQL_SEMA_SURUMU } from "../src/depo/postgres";
import type { AnlikGoruntuKaydi } from "../src/depo/tipler";
import { ElleSaat } from "../src/saat";
import { ac, arayaMal, eskiDunya, sonaMal } from "./goc-yardimci";
import { profilSozlesmesi } from "./profil-sozlesmesi";
import { KUZEY, mulkVerisi, veri } from "./yardimci";

const PG = process.env.BOLGE_PG_URL;
const ON = "pgt";
let sayac = 0;
const yeniDunya = (ad: string): string => `${ON}-${ad}-${process.pid}-${Date.now()}-${sayac++}`;
const pgAc = (dunya: string, semaKur = true) => postgresDeposu({ baglanti: PG as string, dunya, semaKur });

const TABLOLAR = ["log", "snapshots", "snapshot_yedek", "profil_capa", "profil_kayit", "profil_damga"];

afterAll(async () => {
  if (!PG) return;
  const h = new pg.Pool({ connectionString: PG, max: 1 });
  for (const t of TABLOLAR) await h.query(`DELETE FROM ${t} WHERE dunya LIKE $1`, [`${ON}-%`]).catch(() => undefined);
  await h.end();
});

function goruntu(seq: number, simZamani: number, kural: string, ozet = "0123456789abcdef"): AnlikGoruntuKaydi {
  return { seq, simZamani, kuralSurumu: kural, semaSurumu: 1, durumOzeti: ozet, metin: `{"x":${seq}}`, ek: { tohum: 1, idempotans: [] } };
}

/** `ac` reddedilmeli (açık hata); reddedilince depo (ve advisory kilit) bırakılır. */
async function acReddet(dunya: string, v: ReturnType<typeof veri>, ek: Parameters<typeof ac>[3], hata: RegExp): Promise<void> {
  const depo = await pgAc(dunya, false);
  try {
    await expect(ac(depo, v, new ElleSaat(), ek)).rejects.toThrow(hata);
  } finally {
    await depo.gunluk.kapat();
  }
}

async function sorgu<T extends pg.QueryResultRow>(sql: string, p: unknown[] = []): Promise<T[]> {
  const h = new pg.Pool({ connectionString: PG, max: 1 });
  try {
    return (await h.query<T>(sql, p)).rows;
  } finally {
    await h.end();
  }
}

describe.skipIf(!PG)("postgres: sema surumu ve goc adimi", () => {
  it("eski semayla (001, surum kaydi yok, eski birincil anahtar) acilmis veritabani yeni kodla yukseltilir; veri korunur; idempotent", async () => {
    const ad = `bolge_eski_${process.pid}_${Date.now()}`;
    const yonetici = new pg.Pool({ connectionString: PG, max: 1 });
    await yonetici.query(`CREATE DATABASE ${ad}`);
    const u = new URL(PG as string);
    u.pathname = `/${ad}`;
    const baglanti = u.toString();
    const havuz = new pg.Pool({ connectionString: baglanti, max: 2 });
    try {
      // Eski dünya: yalnız 001 uygulanmış (log + snapshots, PK (dunya, seq, sim_t)), sürüm kaydı yok.
      await havuz.query(await readFile(new URL("../sql/001-baslangic.sql", import.meta.url), "utf8"));
      expect(await postgresSemaSurumu(havuz)).toBe(1);
      await havuz.query(
        "INSERT INTO log (dunya, seq, t, hesap, istemci, anahtar, komut, kural_sur, sema_sur) VALUES ('eskidunya',1,10,'ali','i','a1','{\"tur\":\"vergi_ayarla\",\"oranPpm\":5}'::jsonb,'k-eski',1)",
      );
      const g = goruntu(1, 10, "k-eski", "aaaaaaaaaaaaaaaa");
      await havuz.query("INSERT INTO snapshots (dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob) VALUES ('eskidunya',1,10,'k-eski',1,$1,$2::jsonb,'gzip',$3)", [g.durumOzeti, JSON.stringify(g.ek), gzipSync(g.metin)]);
      // Eski anahtar aynı (seq, sim_t)'de ikinci (göç) görüntüyü reddeder: yükseltme bu yüzden gerekli.
      await expect(
        havuz.query("INSERT INTO snapshots (dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob) VALUES ('eskidunya',1,10,'k-yeni',1,$1,$2::jsonb,'gzip',$3)", [g.durumOzeti, JSON.stringify(g.ek), gzipSync(g.metin)]),
      ).rejects.toThrow(/duplicate key|unique/i);

      // Göçsüz açılış açık hatayla reddedilir (sessizce eski şemada çalışmaz).
      await expect(postgresDeposu({ baglanti, dunya: "eskidunya", semaKur: false })).rejects.toThrow(/sema surumu eski: 1 < 3/);

      // Yeni kodla (semaKur) yükseltme.
      const depo = await postgresDeposu({ baglanti, dunya: "eskidunya", semaKur: true });
      try {
        expect(await postgresSemaSurumu(havuz)).toBe(SQL_SEMA_SURUMU);
        expect((await havuz.query("SELECT surum FROM sunucu_sema ORDER BY surum")).rows.map((r) => r.surum)).toEqual([1, 2, 3]);
        // Veri korunur.
        expect((await depo.gunluk.oku(0)).map((k) => [k.seq, k.kuralSurumu])).toEqual([[1, "k-eski"]]);
        expect(await depo.goruntu.sonuncu()).toEqual(g);
        // Yeni anahtar: aynı (seq, sim_t)'de farklı kural sürümlü görüntü artık yazılır ve en yenisi odur; eskisi yerinde.
        await depo.goruntu.kaydet(goruntu(1, 10, "k-yeni", "bbbbbbbbbbbbbbbb"));
        expect((await depo.goruntu.sonuncu())?.kuralSurumu).toBe("k-yeni");
        expect((await havuz.query("SELECT kural_sur FROM snapshots WHERE dunya = 'eskidunya' ORDER BY kural_sur")).rows.map((r) => r.kural_sur)).toEqual(["k-eski", "k-yeni"]);
        // Profil tabloları kuruldu.
        await depo.profil?.capaYaz("ali", { ozetOkunduT: 3 });
        expect(await depo.profil?.capaOku("ali")).toEqual({ ozetOkunduT: 3 });
      } finally {
        await depo.gunluk.kapat();
      }
      // İdempotent: ikinci kurulum hiçbir adım uygulamaz.
      expect(await postgresSemasiKur(havuz)).toEqual([]);
    } finally {
      await havuz.end();
      await yonetici.query(`DROP DATABASE ${ad} WITH (FORCE)`);
      await yonetici.end();
    }
  });

  it("sifirdan kurulum iki adimi uygular; en son goruntu secimi deterministik (seq, sim_t, olusturma, kural_sur)", async () => {
    const ad = `bolge_yeni_${process.pid}_${Date.now()}`;
    const yonetici = new pg.Pool({ connectionString: PG, max: 1 });
    await yonetici.query(`CREATE DATABASE ${ad}`);
    const u = new URL(PG as string);
    u.pathname = `/${ad}`;
    const baglanti = u.toString();
    const havuz = new pg.Pool({ connectionString: baglanti, max: 1 });
    try {
      expect(await postgresSemasiKur(havuz)).toEqual([1, 2, 3]);
      expect(await postgresSemasiKur(havuz)).toEqual([]);
    } finally {
      await havuz.end();
      await yonetici.query(`DROP DATABASE ${ad} WITH (FORCE)`);
      await yonetici.end();
    }

    const dunya = yeniDunya("secim");
    const depo = await pgAc(dunya);
    try {
      const g = depo.goruntu;
      expect(await g.sonuncu()).toBeNull();
      await g.kaydet(goruntu(5, 100, "kA"));
      await g.kaydet(goruntu(5, 100, "kB"));
      expect((await g.sonuncu())?.kuralSurumu).toBe("kB"); // aynı (seq, t): en son yazılan
      await g.kaydet(goruntu(5, 100, "kA", "cccccccccccccccc")); // yeniden yazım (ON CONFLICT): yenilenir ve en yeni olur
      const s = await g.sonuncu();
      expect(s?.kuralSurumu).toBe("kA");
      expect(s?.durumOzeti).toBe("cccccccccccccccc");
      expect((await sorgu("SELECT 1 FROM snapshots WHERE dunya = $1", [dunya])).length).toBe(2); // yinelenen satır yok
      await g.kaydet(goruntu(4, 999, "kC")); // daha küçük seq: seçilmez
      expect((await g.sonuncu())?.seq).toBe(5);
      await g.kaydet(goruntu(5, 200, "kA")); // aynı seq, daha büyük sim zamanı: o seçilir
      expect((await g.sonuncu())?.simZamani).toBe(200);
      await g.kaydet(goruntu(6, 1, "kA")); // daha büyük seq her şeyi geçer
      expect((await g.sonuncu())?.seq).toBe(6);
    } finally {
      await depo.gunluk.kapat();
    }
  });
});

describe.skipIf(!PG)("postgres: profil deposu sozlesmesi (bellek ve dosyayla ayni)", () => {
  it("capalar, idempotans, omur, halka 200", async () => {
    const depo = await pgAc(yeniDunya("profil"));
    try {
      await profilSozlesmesi(depo);
    } finally {
      await depo.gunluk.kapat();
    }
  });

  it("profil verisi yeniden acilista kalir; dunyalar birbirinden ayridir", async () => {
    const d1 = yeniDunya("profil-kalici");
    const a = await pgAc(d1);
    await a.profil?.capaYaz("ali", { ozetOkunduT: 7 });
    await a.profil?.kayitEkle("ali", [{ t: 10, tur: "insaat_bitti", ilce: "i", degerler: ["x", 2], sira: 1 }], 10);
    await a.gunluk.kapat();
    const b = await pgAc(d1, false);
    expect(await b.profil?.capaOku("ali")).toEqual({ ozetOkunduT: 7 });
    expect((await b.profil?.kayitOku("ali"))?.length).toBe(1);
    await b.gunluk.kapat();
    const baska = await pgAc(yeniDunya("profil-baska"));
    expect(await baska.profil?.capaOku("ali")).toBeNull();
    expect(await baska.profil?.kayitOku("ali")).toEqual([]);
    await baska.gunluk.kapat();
  });
});

describe.skipIf(!PG)("postgres: icerik gocu (--goc), yedek ve geri donus", () => {
  it("goc: rapor, snapshot_yedek, eski kural satiri yerinde, hemen yeni goruntu; ikinci acilista goc yok", async () => {
    const dunya = yeniDunya("goc");
    const e = await eskiDunya(await pgAc(dunya));
    const eskiKural = kuralSurumuHesapla(veri());
    const yeniKural = kuralSurumuHesapla(sonaMal());
    const eskiSatir = (await sorgu<{ durum_ozeti: string }>("SELECT durum_ozeti FROM snapshots WHERE dunya = $1 AND kural_sur = $2 ORDER BY seq DESC, sim_t DESC LIMIT 1", [dunya, eskiKural]))[0];
    expect(eskiSatir?.durum_ozeti).toBe(e.ozet);

    const depo = await pgAc(dunya, false);
    const y = await ac(depo, sonaMal(), new ElleSaat(), { gocIzni: true });
    expect(y.kurtarma.goc).toMatchObject({ yenidenIndekslendi: true, eskiKuralSurumu: eskiKural, yeniKuralSurumu: yeniKural, eklenenSayisi: 1, ihlalSayisi: 0 });
    expect(y.kurtarma.goc?.yedek).toBe(`pg:snapshot_yedek:${dunya}:goc-${eskiKural}`);
    await y.kapat();
    // Yedek var ve eski görüntüyle aynı; eski kural satırı hâlâ yerinde; yeni kural satırı eklendi (aynı seq/zaman).
    const yedek = await sorgu<{ durum_ozeti: string; seq: string; sim_t: string }>("SELECT durum_ozeti, seq, sim_t FROM snapshot_yedek WHERE dunya = $1 AND etiket = $2", [dunya, `goc-${eskiKural}`]);
    expect(yedek).toHaveLength(1);
    expect(yedek[0]?.durum_ozeti).toBe(e.ozet);
    expect(Number(yedek[0]?.seq)).toBe(e.seq);
    expect((await sorgu<{ kural_sur: string }>("SELECT kural_sur FROM snapshots WHERE dunya = $1 AND seq = $2 AND sim_t = $3 ORDER BY kural_sur", [dunya, e.seq, e.t])).map((r) => r.kural_sur).sort()).toEqual([eskiKural, yeniKural].sort());
    // İkinci açılış: bayraksız, göç yok.
    const depo2 = await pgAc(dunya, false);
    const y2 = await ac(depo2, sonaMal(), new ElleSaat());
    expect(y2.kurtarma.goc).toBeNull();
    expect(y2.kurtarma.seq).toBe(e.seq);
    await y2.kapat();
  });

  it("geri donus: yedektenDon yedegi en yeni goruntu yapar, eski icerikle acilis mumkun, ozet ayni", async () => {
    const dunya = yeniDunya("geri");
    const e = await eskiDunya(await pgAc(dunya));
    const eskiKural = kuralSurumuHesapla(veri());
    const y = await ac(await pgAc(dunya, false), sonaMal(), new ElleSaat(), { gocIzni: true });
    await y.kapat();
    // Göçten sonra en yeni görüntü yeni kuraldadır: eski içerikle açılış kural uyuşmazlığıyla reddedilir.
    await acReddet(dunya, veri(), {}, /kural surumu uyusmuyor/);
    const depo = await pgAc(dunya, false);
    const geri = await depo.yedektenDon(`goc-${eskiKural}`);
    expect(geri).toMatchObject({ kuralSurumu: eskiKural, seq: e.seq, simZamani: e.t, durumOzeti: e.ozet });
    await depo.gunluk.kapat();
    const eski = await ac(await pgAc(dunya, false), veri(), new ElleSaat());
    expect(eski.kurtarma.goc).toBeNull();
    expect(eski.kurtarma.durumOzeti).toBe(e.ozet);
    await eski.kapat();
    const d3 = await pgAc(dunya, false);
    await expect(d3.yedektenDon("yok-etiket")).rejects.toThrow(/goc yedegi yok/);
    await d3.gunluk.kapat();
  });

  it("yedekleme basarisizsa goc durur: goruntu satirlari degismez", async () => {
    const dunya = yeniDunya("yedeksiz");
    await eskiDunya(await pgAc(dunya));
    const once = (await sorgu("SELECT 1 FROM snapshots WHERE dunya = $1", [dunya])).length;
    const depo = await pgAc(dunya, false);
    depo.goruntu.yedekle = async () => {
      throw new Error("disk dolu");
    };
    await expect(ac(depo, sonaMal(), new ElleSaat(), { gocIzni: true })).rejects.toThrow(/goc yedegi alinamadi \(disk dolu\)/);
    expect((await sorgu("SELECT 1 FROM snapshots WHERE dunya = $1", [dunya])).length).toBe(once);
    expect((await sorgu("SELECT 1 FROM snapshot_yedek WHERE dunya = $1", [dunya])).length).toBe(0);
    await depo.gunluk.kapat();
  });

  it("gunluk kuyrugu doluyken goc reddedilir; araya ekleme varsayilanda reddedilir", async () => {
    const dunya = yeniDunya("kuyruk");
    const depo = await pgAc(dunya);
    const saat = new ElleSaat();
    const y = await ac(depo, veri(), saat); // kapat YOK (çökme benzeri): açılış görüntüsü + dolu günlük
    let n = 0;
    for (const [o, k] of [
      [SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }],
      ["ali", { tur: "vergi_ayarla", oranPpm: 81_000 }],
    ] as Array<[string, Komut]>) {
      const p = y.komutGonder(o, "test", `k${n++}`, k);
      await y.birTur();
      await p;
    }
    await depo.gunluk.kapat(); // kilidi bırak
    await acReddet(dunya, sonaMal(), { gocIzni: true }, /goc yalniz donem sinirinda: goruntuden \(seq 0\) sonra 2 gunluk kaydi var/);
    // Eski kuralla açıp kapat: kuyruk boşalır, göç mümkün; araya ekleme yalnız-ekle ihlaliyle reddedilir.
    const eski = await ac(await pgAc(dunya, false), veri(), new ElleSaat());
    expect(eski.kurtarma.kalanKayit).toBe(2);
    await eski.kapat();
    await acReddet(dunya, arayaMal(), { gocIzni: true }, /yalniz-ekle ihlali/);
    const yeni = await ac(await pgAc(dunya, false), sonaMal(), new ElleSaat(), { gocIzni: true });
    expect(yeni.kurtarma.goc?.eklenenSayisi).toBe(1);
    expect(yeni.kurtarma.seq).toBe(2);
    await yeni.kapat();
  });
});

describe.skipIf(!PG)("postgres: zarf v2 + kamu arsasi kurtarma ve sen yokken", () => {
  async function ilerle(y: Awaited<ReturnType<typeof ac>>, saat: ElleSaat, t: number): Promise<void> {
    saat.ilerlet(t);
    for (let n = 0; y.sim.dunya.zaman < t && n < 1000; n++) await y.birTur();
  }

  it("kamu acik mulk dunyasi pg'de kurtarilir: kamuBloklari ve durumOzeti ayni; uyari yok", async () => {
    const dunya = yeniDunya("kamu");
    const depo = await pgAc(dunya);
    const saat = new ElleSaat();
    const y = await mulkAc(depo, saat);
    const p = y.komutGonder(SISTEM_OYUNCUSU, "t", "k1", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: [] });
    await y.birTur();
    await p;
    await ilerle(y, saat, 2 * SAAT);
    const ilceler = y.sim.dunya.mulk?.ilceler.map((c) => c.id) ?? [];
    expect(ilceler.length).toBeGreaterThan(0);
    const bloklar = ilceler.map((i) => kamuBloklari(y.sim.dunya, i));
    expect(bloklar.some((b) => b.length > 0)).toBe(true);
    const ozet = y.ozet();
    await y.kapat();
    const depo2 = await pgAc(dunya, false);
    const k = await mulkAc(depo2, new ElleSaat());
    expect(k.kurtarma.kamuKapali).toBe(false);
    expect(k.kurtarma.uyarilar).toEqual([]);
    expect(ilceler.map((i) => kamuBloklari(k.sim.dunya, i))).toEqual(bloklar);
    expect(k.ozet()).toEqual(ozet);
    const g = await depo2.goruntu.sonuncu();
    expect(JSON.parse((g as NonNullable<typeof g>).metin).surum).toBe(2); // zarf v2
    await k.kapat();
  });

  it("pg'de ozet acik (uyari yok); cikis capasi ve ozet kayitlari yeniden acilista kalir; ozet uretilir", async () => {
    const dunya = yeniDunya("donus");
    const depo = await pgAc(dunya);
    const saat = new ElleSaat();
    const y = await ac(depo, veri(), saat);
    expect(y.donusAcik).toBe(true);
    expect(y.kurtarma.uyarilar.some((m) => /profil/.test(m))).toBe(false);
    const gonder = async (o: string, k: Komut, a: string): Promise<void> => {
      const p = y.komutGonder(o, "t", a, k);
      await y.birTur();
      await p;
    };
    await gonder(SISTEM_OYUNCUSU, { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }, "k1");
    await ilerle(y, saat, 2 * SAAT);
    await gonder("ali", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ahir" }, "i1"); // 36 dk: yokluk sırasında biter
    await y.cikis("ali");
    await ilerle(y, saat, 10 * SAAT);
    const ozet = await y.donusOzeti("ali");
    expect(ozet?.bant).toBe("K2");
    expect(ozet?.maddeler.some((m) => m.blok === "B2")).toBe(true);
    await y.profilBekle();
    const kayitlar = await depo.profil?.kayitOku("ali");
    expect(kayitlar?.some((k) => k.tur === "insaat_bitti")).toBe(true);
    await y.kapat();
    // Yeniden açılış: aynı özet ve aynı kayıtlar (çift yok).
    const depo2 = await pgAc(dunya, false);
    const y2 = await ac(depo2, veri(), new ElleSaat());
    expect(await depo2.profil?.kayitOku("ali")).toEqual(kayitlar);
    const sg = (await depo2.profil?.capaOku("ali"))?.sonGorulen;
    expect(sg?.t).toBeGreaterThanOrEqual(2 * SAAT);
    expect(sg?.t).toBeLessThan(3 * SAAT);
    await y2.kapat();
  });
});

function mulkAc(depo: Awaited<ReturnType<typeof pgAc>>, saat: ElleSaat) {
  return ac(depo, mulkVerisi(), saat);
}

describe.skipIf(!PG)("postgres: CLI (--depo pg)", () => {
  it("CLI pg deposuyla acilir (sema kurulur, profil acik, uyari yok), SIGTERM'de duzgun kapanir; ikinci acilis kurtarir", async () => {
    const dunya = yeniDunya("cli");
    const KOK = fileURLToPath(new URL("../../../", import.meta.url));
    const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const kos = async (): Promise<Array<Record<string, unknown>>> => {
      const p = spawn(process.execPath, ["--import", "tsx", CLI, "--port", "0", "--harita", "mini", "--depo", "pg", "--pg-url", PG as string, "--dunya", dunya, "--elle-saat"], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] });
      const olaylar: Array<Record<string, unknown>> = [];
      try {
        await new Promise<void>((coz, reddet) => {
          let tampon = "";
          p.stdout?.on("data", (b: Buffer) => {
            tampon += b.toString();
            for (const satir of tampon.split("\n")) {
              if (!satir.startsWith("{")) continue;
              const o = JSON.parse(satir) as Record<string, unknown>;
              if (!olaylar.some((x) => JSON.stringify(x) === satir)) olaylar.push(o);
              if (o.olay === "hazir") coz();
              if (o.olay === "olumcul") reddet(new Error(String(o.hata)));
            }
          });
          p.once("exit", (kod) => reddet(new Error(`cikti: ${kod}`)));
        });
        p.kill("SIGTERM");
        await new Promise<void>((coz) => p.once("close", () => coz()));
      } finally {
        if (p.exitCode === null) p.kill("SIGKILL");
      }
      return olaylar;
    };
    const ilk = await kos();
    const hazir = ilk.find((o) => o.olay === "hazir") as { kurtarma: { donusAcik: boolean; uyarilar: string[]; goruntuSeq: number | null } };
    expect(hazir.kurtarma.donusAcik).toBe(true);
    expect(hazir.kurtarma.uyarilar).toEqual([]);
    expect(hazir.kurtarma.goruntuSeq).toBeNull();
    expect(ilk.some((o) => o.olay === "kapandi")).toBe(true);
    const ikinci = await kos();
    expect((ikinci.find((o) => o.olay === "hazir") as { kurtarma: { goruntuSeq: number | null } }).kurtarma.goruntuSeq).not.toBeNull();
  }, 60_000);
});
