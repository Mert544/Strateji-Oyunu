/**
 * Gerçek Postgres'e karşı (yalnız `BOLGE_PG_URL` tanımlıysa; yoksa atlanır): şema sürümü ve göç adımı (eski şemalı veritabanı
 * yükseltilir), en son görüntü seçiminin determinizmi, içerik göçü (yedek `snapshot_yedek`, geri dönüş, yedek hatasında durma,
 * günlük doluyken ret), zarf v2 + kamu arsası kurtarması, profil deposu sözleşmesi ve "sen yokken" kayıtlarının kalıcılığı.
 * Bellek ve dosya depolarının aynı sözleşmeleri `depolar.test.ts`, `icerik-goc.test.ts`, `donus.test.ts`'tedir.
 */
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { gzipSync } from "node:zlib";
import { afterAll, describe, expect, it, vi } from "vitest";
import pg from "pg";
import { SAAT, SISTEM_OYUNCUSU, kamuBloklari, kuralSurumuHesapla } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { dosyaDeposu } from "../src/depo/dosya";
import { depoyuDok } from "../src/dok";
import { pgTestDunyasiSay, pgTestDunyasiSil } from "../src/test-dunya";
import { postgresDeposu, postgresSemaSurumu, postgresSemasiKur, SQL_SEMA_SURUMU } from "../src/depo/postgres";
import type { AnlikGoruntuKaydi } from "../src/depo/tipler";
import { GelistirmeKimligi } from "../src/kimlik";
import { ElleSaat } from "../src/saat";
import { sunucuBaslat } from "../src/sunucu";
import type { CalisanSunucu } from "../src/sunucu";
import { DunyaYazari } from "../src/yazar";
import { hesapSozlesmesi } from "./hesap-sozlesmesi";
import { girisOrtami } from "./giris-yardimci";
import { ac, arayaMal, eskiDunya, sonaMal } from "./goc-yardimci";
import { oyunOturumSozlesmesi } from "./oyun-oturum-sozlesmesi";
import { profilSozlesmesi } from "./profil-sozlesmesi";
import { KUZEY, SIR, mulkVerisi, veri } from "./yardimci";

const PG = process.env.BOLGE_PG_URL;
const ON = "pgt";
let sayac = 0;
/** Test dünyası silme komutunun önek korumasını geçen dünya adları (`test` ile başlar). */
const TEST_DUNYA_ON = "test-pgt";
const testDunyasi = (ad: string): string => `${TEST_DUNYA_ON}-${ad}-${process.pid}-${Date.now()}-${sayac++}`;
const yeniDunya = (ad: string): string => `${ON}-${ad}-${process.pid}-${Date.now()}-${sayac++}`;
const pgAc = (dunya: string, semaKur = true) => postgresDeposu({ baglanti: PG as string, dunya, semaKur });

const TABLOLAR = ["log", "snapshots", "snapshot_yedek", "profil_capa", "profil_kayit", "profil_damga", "oyun_oturum", "oyun_oturum_gunluk"];

/** Hesap tabloları dünyadan bağımsızdır: testler `pgh` önekiyle yazar, hesap silinince hesap_oyuncu ve oturum ON DELETE CASCADE ile gider. */
const HESAP_ONEKI = "pgh";
const hesapOnek = (): string => `${HESAP_ONEKI}${Date.now().toString(36)}${process.pid.toString(36)}${sayac++}`;

afterAll(async () => {
  if (!PG) return;
  const h = new pg.Pool({ connectionString: PG, max: 1 });
  for (const t of TABLOLAR) await h.query(`DELETE FROM ${t} WHERE dunya LIKE $1`, [`${ON}-%`]).catch(() => undefined);
  await h.query("DELETE FROM giris_baglanti WHERE ozet LIKE $1 OR eposta_anahtar LIKE $1", [`${HESAP_ONEKI}%`]).catch(() => undefined);
  await h.query("DELETE FROM hesap WHERE id LIKE $1", [`${HESAP_ONEKI}%`]).catch(() => undefined);
  for (const t of TABLOLAR) await h.query(`DELETE FROM ${t} WHERE dunya LIKE $1`, [`${TEST_DUNYA_ON}-%`]).catch(() => undefined);
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
      await expect(postgresDeposu({ baglanti, dunya: "eskidunya", semaKur: false })).rejects.toThrow(new RegExp(`sema surumu eski: 1 < ${SQL_SEMA_SURUMU}`));

      // Yeni kodla (semaKur) yükseltme.
      const depo = await postgresDeposu({ baglanti, dunya: "eskidunya", semaKur: true });
      try {
        expect(await postgresSemaSurumu(havuz)).toBe(SQL_SEMA_SURUMU);
        expect((await havuz.query("SELECT surum FROM sunucu_sema ORDER BY surum")).rows.map((r) => r.surum)).toEqual([1, 2, 3, 4, 5]);
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

  it("sifirdan kurulum bes adimi uygular; en son goruntu secimi deterministik (seq, sim_t, olusturma, kural_sur)", async () => {
    const ad = `bolge_yeni_${process.pid}_${Date.now()}`;
    const yonetici = new pg.Pool({ connectionString: PG, max: 1 });
    await yonetici.query(`CREATE DATABASE ${ad}`);
    const u = new URL(PG as string);
    u.pathname = `/${ad}`;
    const baglanti = u.toString();
    const havuz = new pg.Pool({ connectionString: baglanti, max: 1 });
    try {
      expect(await postgresSemasiKur(havuz)).toEqual([1, 2, 3, 4, 5]);
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

  it("CLI --yedekten-don: yedegi en yeni goruntu yapar ve cikar; eski icerikle acilis ozeti ayni; yok etiket hata kodu 1", async () => {
    const dunya = yeniDunya("clidon");
    const KOK = fileURLToPath(new URL("../../../", import.meta.url));
    const CLI = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
    const e = await eskiDunya(await pgAc(dunya));
    const eskiKural = kuralSurumuHesapla(veri());
    const y = await ac(await pgAc(dunya, false), sonaMal(), new ElleSaat(), { gocIzni: true });
    await y.kapat();
    const calistir = (etiket: string): Promise<{ kod: number | null; cikti: string }> =>
      new Promise((coz) => {
        const p = spawn(process.execPath, ["--import", "tsx", CLI, "--depo", "pg", "--pg-url", PG as string, "--dunya", dunya, "--yedekten-don", etiket], { cwd: KOK, stdio: ["ignore", "pipe", "pipe"] });
        let c = "";
        p.stdout?.on("data", (b: Buffer) => (c += b.toString()));
        p.once("close", (kod) => coz({ kod, cikti: c }));
      });
    const r = await calistir(`goc-${eskiKural}`);
    expect(r.kod).toBe(0);
    expect(JSON.parse(r.cikti.trim())).toMatchObject({ olay: "yedektenDon", etiket: `goc-${eskiKural}`, seq: e.seq, simZamani: e.t, kuralSurumu: eskiKural, durumOzeti: e.ozet });
    const eski = await ac(await pgAc(dunya, false), veri(), new ElleSaat());
    expect(eski.kurtarma.durumOzeti).toBe(e.ozet);
    await eski.kapat();
    const yok = await calistir("yok-etiket");
    expect(yok.kod).toBe(1);
    expect(yok.cikti).toContain("goc yedegi yok");
  }, 180_000);

  it("geri donus, gocten sonra DAHA GEC sim_t'li kapanis goruntusu varken de calisir (mutlak saat tuzagi): yedek en yeni olur, yeni-kural goruntuleri snapshot_yedek'e tasinir, eski icerikle acilis ozeti yedekle ayni", async () => {
    const dunya = yeniDunya("geri-saat");
    const e = await eskiDunya(await pgAc(dunya));
    const eskiKural = kuralSurumuHesapla(veri());
    const yeniKural = kuralSurumuHesapla(sonaMal());
    // Göç açılışı ElleSaat'le (0'dan) aynı sim_t'de kapanırdı ve tuzağı gizlerdi: gerçek (mutlak) saatte olduğu gibi dünya göçten sonra ilerler.
    const saat = new ElleSaat();
    const y = await ac(await pgAc(dunya, false), sonaMal(), saat, { gocIzni: true });
    saat.ilerlet(e.t + 6 * SAAT);
    await y.birTur();
    expect(y.ozet().t).toBeGreaterThan(e.t);
    await y.kapat(); // normal kapanış: AYNI seq, DAHA GEÇ sim_t, yeni kural sürümü
    const once = await sorgu<{ kural_sur: string; sim_t: string }>("SELECT kural_sur, sim_t FROM snapshots WHERE dunya = $1 AND seq = $2 ORDER BY sim_t DESC, olusturma DESC", [dunya, e.seq]);
    expect(once[0]?.kural_sur, "tuzak kurulmadi: kapanis goruntusu yeni kural ve daha gec sim_t'de olmali").toBe(yeniKural);
    expect(Number(once[0]?.sim_t)).toBeGreaterThan(e.t);
    await acReddet(dunya, veri(), {}, /kural surumu uyusmuyor/); // yedekten dönmeden eski içerik açılmaz
    const depo = await pgAc(dunya, false);
    const geri = await depo.yedektenDon(`goc-${eskiKural}`);
    expect(geri).toMatchObject({ kuralSurumu: eskiKural, seq: e.seq, simZamani: e.t, durumOzeti: e.ozet, gocSonrasiKomut: false });
    expect(geri.temizlenenGoruntu).toBeGreaterThanOrEqual(1);
    await depo.gunluk.kapat();
    // Bu seq'te yalnız eski kural kaldı; yeni-kural görüntüleri silinmedi, snapshot_yedek'e taşındı.
    expect((await sorgu<{ kural_sur: string }>("SELECT DISTINCT kural_sur FROM snapshots WHERE dunya = $1 AND seq = $2", [dunya, e.seq])).map((r) => r.kural_sur)).toEqual([eskiKural]);
    const tasinan = await sorgu<{ etiket: string; kural_sur: string }>("SELECT etiket, kural_sur FROM snapshot_yedek WHERE dunya = $1 AND etiket LIKE 'yedektenDon:%'", [dunya]);
    expect(tasinan).toHaveLength(geri.temizlenenGoruntu);
    expect(tasinan.every((t) => t.kural_sur === yeniKural)).toBe(true);
    // Eski içerikle açılış yedeğin özetini verir (CLI yolu aynı işlevi çağırır).
    const eski = await ac(await pgAc(dunya, false), veri(), new ElleSaat());
    expect(eski.kurtarma.goc).toBeNull();
    expect(eski.kurtarma.durumOzeti).toBe(e.ozet);
    await eski.kapat();
    // İdempotent: ikinci geri dönüş bir şey taşımaz.
    const d2 = await pgAc(dunya, false);
    expect((await d2.yedektenDon(`goc-${eskiKural}`)).temizlenenGoruntu).toBeGreaterThanOrEqual(0);
    await d2.gunluk.kapat();
  });

  it("gocten sonra KOMUT kabul edildiyse yedektenDon yeni-kural goruntulerine DOKUNMAZ (bugunku davranis aynen): gocSonrasiKomut true, eski icerikle acilis reddedilir", async () => {
    const dunya = yeniDunya("geri-komut");
    const e = await eskiDunya(await pgAc(dunya));
    const eskiKural = kuralSurumuHesapla(veri());
    const yeniKural = kuralSurumuHesapla(sonaMal());
    const saat = new ElleSaat();
    const y = await ac(await pgAc(dunya, false), sonaMal(), saat, { gocIzni: true });
    saat.ilerlet(e.t + SAAT);
    const p = y.komutGonder("ali", "test", "gocsonrasi", { tur: "vergi_ayarla", oranPpm: 91_000 });
    await y.birTur();
    expect((await p).sonuc.tamam).toBe(true);
    await y.kapat();
    const say = async (): Promise<number> => (await sorgu<{ n: number }>("SELECT count(*)::int AS n FROM snapshots WHERE dunya = $1 AND kural_sur = $2", [dunya, yeniKural]))[0]?.n ?? 0;
    const once = await say();
    expect(once).toBeGreaterThanOrEqual(1);
    const depo = await pgAc(dunya, false);
    const geri = await depo.yedektenDon(`goc-${eskiKural}`);
    expect(geri).toMatchObject({ kuralSurumu: eskiKural, seq: e.seq, gocSonrasiKomut: true, temizlenenGoruntu: 0 });
    await depo.gunluk.kapat();
    expect(await say()).toBe(once); // yeni-kural görüntülerine dokunulmadı
    await acReddet(dunya, veri(), {}, /kural surumu uyusmuyor/); // geri dönüş yalnız hiç komut kabul edilmediyse geçerlidir (README)
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
  }, 180_000);
});

describe.skipIf(!PG)("postgres: baglanti kopmasi (fail-stop)", () => {
  it("pg baglantilari zorla kesilince surec cokmez: yazar olumcul olur (olumculHata), /saglik 503, bolge_olumcul 1", async () => {
    const ad = `bolge_kes_${process.pid}_${Date.now()}`;
    const yonetici = new pg.Pool({ connectionString: PG, max: 1 });
    await yonetici.query(`CREATE DATABASE ${ad}`);
    const u = new URL(PG as string);
    u.pathname = `/${ad}`;
    const baglanti = u.toString();
    let sunucu: CalisanSunucu | undefined;
    try {
      const depo = await postgresDeposu({ baglanti, dunya: "kes", semaKur: true });
      const yazar = await DunyaYazari.ac({ veri: veri(), tohum: 1, depo, saat: new ElleSaat(), commitAraligiMs: 15, goruntuAraligiMs: 1e12 });
      const olumculler: Error[] = [];
      yazar.olumculHata((e) => olumculler.push(e));
      sunucu = await sunucuBaslat({ yazar, kimlik: new GelistirmeKimligi(SIR), port: 0, yayinAraligiMs: 0 });
      expect((await fetch(`http://127.0.0.1:${sunucu.port}/saglik`)).status).toBe(200);
      // Boştaki havuz bağlantısı ve dünya kilidini tutan bağlantı sunucu tarafında sonlandırılır. Dinleyici olmasaydı süreç işlenmemiş
      // `error` olayıyla çökerdi (vitest "Unhandled Error" ile bu dosyayı kırardı).
      const kes = await yonetici.query<{ n: number }>("SELECT count(pg_terminate_backend(pid))::int AS n FROM pg_stat_activity WHERE datname = $1", [ad]);
      expect(kes.rows[0]?.n).toBeGreaterThan(0);
      await vi.waitFor(() => expect(yazar.olumculMu).toBe(true), { timeout: 10_000, interval: 50 });
      expect(olumculler[0]?.message).toMatch(/depo baglantisi koptu; yazar durdu/);
      const r = await fetch(`http://127.0.0.1:${sunucu.port}/saglik`);
      expect(r.status).toBe(503);
      expect(((await r.json()) as { durum: string }).durum).toBe("olumcul");
      expect(await sunucu.metrikMetni()).toContain("bolge_olumcul 1");
    } finally {
      await sunucu?.kapat().catch(() => undefined);
      await yonetici.query(`DROP DATABASE ${ad} WITH (FORCE)`);
      await yonetici.end();
    }
  }, 60_000);
});

describe.skipIf(!PG)("postgres: hesap, oturum ve giris baglantisi (sema surumu 4)", () => {
  it("surum 3 veritabani 4'e yukseltilir (yalniz ekleme): veri korunur, hesap tablolari gelir; 004 idempotent; semaKur:false acik hata verir", async () => {
    const ad = `bolge_s3_${process.pid}_${Date.now()}`;
    const yonetici = new pg.Pool({ connectionString: PG, max: 1 });
    await yonetici.query(`CREATE DATABASE ${ad}`);
    const u = new URL(PG as string);
    u.pathname = `/${ad}`;
    const baglanti = u.toString();
    const havuz = new pg.Pool({ connectionString: baglanti, max: 2 });
    try {
      // Sürüm 3 veritabanı: 001, 002, 003 uygulanmış ve kayıtlı (004 yok).
      await havuz.query("CREATE TABLE sunucu_sema (surum integer PRIMARY KEY, ad text NOT NULL, uygulandi timestamptz NOT NULL DEFAULT now())");
      for (const [surum, ad2, dosya] of [[1, "baslangic", "001-baslangic"], [2, "goc-profil", "002-goc-profil"], [3, "defter", "003-defter"]] as const) {
        await havuz.query(await readFile(new URL(`../sql/${dosya}.sql`, import.meta.url), "utf8"));
        await havuz.query("INSERT INTO sunucu_sema (surum, ad) VALUES ($1, $2)", [surum, ad2]);
      }
      expect(await postgresSemaSurumu(havuz)).toBe(3);
      expect((await havuz.query("SELECT to_regclass('hesap') IS NULL AS yok")).rows[0]?.yok).toBe(true);
      await havuz.query(
        "INSERT INTO log (dunya, seq, t, hesap, istemci, anahtar, komut, kural_sur, sema_sur) VALUES ('s3dunya',1,10,'ali','i','a1','{\"tur\":\"vergi_ayarla\",\"oranPpm\":5}'::jsonb,'k3',1)",
      );
      await havuz.query("INSERT INTO profil_damga (dunya, oyuncu, kavram, t, kaynak) VALUES ('s3dunya','ali','ilk_yapi',5,'odul')");
      // Göçsüz açılış açık hata verir; semaKur ile yalnız 4. adım uygulanır.
      await expect(postgresDeposu({ baglanti, dunya: "s3dunya", semaKur: false })).rejects.toThrow(/sema surumu eski: 3 < 5/);
      expect(await postgresSemasiKur(havuz)).toEqual([4, 5]);
      expect(await postgresSemaSurumu(havuz)).toBe(5);
      expect((await havuz.query("SELECT max(surum) AS m FROM sunucu_sema")).rows[0]?.m).toBe(5);
      expect((await havuz.query("SELECT surum, ad FROM sunucu_sema ORDER BY surum")).rows.map((r) => `${r.surum} ${r.ad}`)).toEqual(["1 baslangic", "2 goc-profil", "3 defter", "4 hesap", "5 oyun-oturum"]);
      expect(await postgresSemasiKur(havuz)).toEqual([]); // idempotent
      // 004'ün kendisi de iki kez koşunca hata vermez (IF NOT EXISTS) ve veriye dokunmaz.
      const sql004 = await readFile(new URL("../sql/004-hesap.sql", import.meta.url), "utf8");
      await havuz.query(sql004);
      await havuz.query(sql004);
      expect((await havuz.query("SELECT count(*)::int AS n FROM log WHERE dunya = 's3dunya'")).rows[0]?.n).toBe(1);
      expect((await havuz.query("SELECT count(*)::int AS n FROM profil_damga WHERE dunya = 's3dunya'")).rows[0]?.n).toBe(1);
      for (const t of ["hesap", "hesap_oyuncu", "giris_baglanti", "oturum"]) expect((await havuz.query("SELECT to_regclass($1) IS NOT NULL AS var", [t])).rows[0]?.var, t).toBe(true);
      // Açılışta eski veri okunur, hesap deposu çalışır.
      const depo = await postgresDeposu({ baglanti, dunya: "s3dunya", semaKur: false });
      try {
        expect((await depo.gunluk.oku(0)).map((k) => k.seq)).toEqual([1]);
        expect(await depo.profil?.damgaOku("ali")).toEqual([{ kavram: "ilk_yapi", t: 5, kaynak: "odul" }]);
        expect((await depo.hesap?.sayilar())).toEqual({ hesap: 0, oturum: 0, baglanti: 0 });
      } finally {
        await depo.gunluk.kapat();
      }
    } finally {
      await havuz.end();
      await yonetici.query(`DROP DATABASE ${ad} WITH (FORCE)`);
      await yonetici.end();
    }
  });

  it("REGRESYON havuz kilitlenmesi: ayni e-postayla 5 ESZAMANLI hesapOlustur (havuz max 4, biri advisory kilitte) < 5 sn biter; tek hesap olusur, diger 4 cagri mevcut hesabi dogru doner", async () => {
    const depo = await pgAc(yeniDunya("hesap-yaris"));
    const onek = hesapOnek();
    const h = depo.hesap as NonNullable<typeof depo.hesap>;
    const anahtar = `${onek}-yaris@ornek.org`;
    const bas = Date.now();
    const sonuclar = await Promise.all(
      [0, 1, 2, 3, 4].map((i) => h.hesapOlustur({ id: `${onek}-h-${i}`, eposta: anahtar, anahtar, oyuncu: `${onek}-o${i}`.slice(0, 32), olusturma: 1_000 + i })),
    );
    expect(Date.now() - bas, "havuz kilitlenmedi (5 sn altinda bitti)").toBeLessThan(5_000);
    const yeniler = sonuclar.filter((r) => r.yeni);
    expect(yeniler).toHaveLength(1);
    expect(sonuclar.filter((r) => !r.yeni)).toHaveLength(4);
    const kazanan = (yeniler[0] as (typeof sonuclar)[number]).hesap;
    for (const r of sonuclar) expect(r.hesap).toEqual(kazanan); // hepsi ayni (kazanan) hesabi gorur
    expect(await h.hesapBulAnahtar(anahtar)).toEqual(kazanan);
    expect((await sorgu<{ n: number }>("SELECT count(*)::int AS n FROM hesap WHERE eposta_anahtar = $1", [anahtar]))[0]?.n).toBe(1);
    // Havuz sonra da calisir (baglanti sizintisi yok): ardisik islemler hemen donmeli.
    expect((await h.sayilar()).hesap).toBeGreaterThanOrEqual(1);
    await depo.gunluk.kapat();
  });

  it("hesap deposu sozlesmesi (bellek ve dosya ile ayni): hesap basina bir oyuncu, tek kullanimlik sureli baglanti, oturum, silme", async () => {
    const depo = await pgAc(yeniDunya("hesap"));
    try {
      await hesapSozlesmesi(depo.hesap as NonNullable<typeof depo.hesap>, hesapOnek());
    } finally {
      await depo.gunluk.kapat();
    }
  });

  it("veritabani kisitlari: hesap_oyuncu(hesap_id PK, oyuncu_id UNIQUE), eposta_anahtar UNIQUE; test oneki tek islemde silinir (ON DELETE CASCADE, artik kalmaz)", async () => {
    const depo = await pgAc(yeniDunya("hesap-kisit"));
    const onek = hesapOnek();
    try {
      const h = depo.hesap as NonNullable<typeof depo.hesap>;
      const a = { id: `${onek}-a`, eposta: "a@ornek.org", anahtar: `${onek}-a@ornek.org`, oyuncu: `${onek}-oa`, olusturma: 1 };
      const b = { id: `${onek}-b`, eposta: "b@ornek.org", anahtar: `${onek}-b@ornek.org`, oyuncu: `${onek}-ob`, olusturma: 1 };
      await h.hesapOlustur(a);
      await h.hesapOlustur(b);
      for (const hesap of [a, b]) {
        await h.oturumEkle({ id: `${onek}-o-${hesap.id}`, hesap: hesap.id, gizliOzet: "x", olusturma: 1, sonKullanim: 1, bitis: 9, mutlakBitis: 9 });
        await h.baglantiEkle({ ozet: `${onek}-bag-${hesap.id}`, eposta: hesap.eposta, anahtar: hesap.anahtar, bitis: 9, tarayiciOzeti: null, olusturma: 1 });
      }
      // Şema düzeyinde kısıtlar (uygulama hatası olsa bile veritabanı korur).
      await expect(sorgu("INSERT INTO hesap_oyuncu (hesap_id, oyuncu_id) VALUES ($1, 'baska')", [a.id])).rejects.toThrow(/duplicate key|unique/i); // hesap başına bir oyuncu
      await expect(sorgu("INSERT INTO hesap_oyuncu (hesap_id, oyuncu_id) VALUES ($1, $2)", [b.id, a.oyuncu])).rejects.toThrow(/duplicate key|unique/i); // oyuncu başına bir hesap
      await expect(sorgu("INSERT INTO oturum (id, hesap_id, gizli_ozet, olusturma, son_kullanim, bitis, mutlak_bitis) VALUES ('x', 'yok-hesap', 'g', 1, 1, 1, 1)")).rejects.toThrow(/foreign key/i);
      // Test önekiyle tek işlemde silme: hesap_oyuncu ve oturum zincirle gider; bağlantılar adres anahtarıyla.
      const c = await sorgu<{ n: number }>("WITH a AS (DELETE FROM giris_baglanti WHERE eposta_anahtar LIKE $1 RETURNING 1), b AS (DELETE FROM hesap WHERE id LIKE $1 RETURNING 1) SELECT (SELECT count(*) FROM b)::int AS n", [`${onek}%`]);
      expect(c[0]?.n).toBe(2);
      for (const t of ["hesap", "hesap_oyuncu", "oturum"]) expect((await sorgu<{ n: number }>(`SELECT count(*)::int AS n FROM ${t} WHERE ${t === "hesap_oyuncu" ? "oyuncu_id" : "id"} LIKE $1`, [`${onek}%`]))[0]?.n, t).toBe(0);
      expect((await sorgu<{ n: number }>("SELECT count(*)::int AS n FROM giris_baglanti WHERE eposta_anahtar LIKE $1", [`${onek}%`]))[0]?.n).toBe(0);
    } finally {
      await depo.gunluk.kapat();
    }
  });

  it("e-posta girisi pg hesap deposuyla uctan uca: istek -> posta -> onay -> bilet -> ws; ikinci giris ayni oyuncu", async () => {
    const depo = await pgAc(yeniDunya("giris"));
    const onek = hesapOnek();
    const eposta = `${onek}@ornek.org`;
    const ortam = await girisOrtami({ depo });
    try {
      const t = ortam.yeniTarayici();
      const ilk = await ortam.girisYap(t, eposta);
      expect(ilk.yeniHesap).toBe(true);
      const bilet = (await t.post("/giris/bilet")).json?.bilet as string;
      const { SunucuIstemcisi } = await import("../src/istemci");
      const ws = await SunucuIstemcisi.baglan(ortam.ts.url, bilet, "pg-ist");
      expect(ws.hosgeldin?.oyuncu).toBe(ilk.oyuncu);
      await ws.kapat();
      expect(await ortam.girisYap(ortam.yeniTarayici(), eposta.toUpperCase())).toEqual({ oyuncu: ilk.oyuncu, yeniHesap: false });
      expect((await t.post("/giris/cikis")).durum).toBe(200);
      expect((await t.istek("/giris/ben")).durum).toBe(401);
      // Silme: hesap ve oturumlar gider.
      const hesap = await depo.hesap?.hesapBulAnahtar(eposta);
      expect(await ortam.hizmet.hesapSil(hesap?.id as string)).toBe(true);
      expect(await depo.hesap?.hesapBulAnahtar(eposta)).toBeNull();
    } finally {
      await ortam.kapat();
      await depo.gunluk.kapat();
    }
  });
});

describe.skipIf(!PG)("postgres: oyun oturumu kaydi, test dunyasi silme ve dokum (sema surumu 5)", () => {
  it("005 idempotent; oyun oturumu deposu sozlesmesi (bellek ve dosyayla ayni); dunyalar birbirinden ayridir", async () => {
    const sql005 = await readFile(new URL("../sql/005-oyun-oturum.sql", import.meta.url), "utf8");
    const h = new pg.Pool({ connectionString: PG, max: 1 });
    try {
      await h.query(sql005);
      await h.query(sql005);
    } finally {
      await h.end();
    }
    const a = await pgAc(yeniDunya("oturum-a"));
    const b = await pgAc(yeniDunya("oturum-b"));
    try {
      await oyunOturumSozlesmesi(a.oyunOturumu as NonNullable<typeof a.oyunOturumu>, b.oyunOturumu as NonNullable<typeof b.oyunOturumu>);
    } finally {
      await a.gunluk.kapat();
      await b.gunluk.kapat();
    }
  });

  it("test dunyasi silme: yalniz o dunyanin gunlugu, goruntusu, profili, oturum kaydi ve YALNIZ o dunyanin oyuncularinin hesaplari gider; baska dunyada da kullanilan hesap ve baska dunya korunur; sayim 0", async () => {
    const w1 = testDunyasi("w1");
    const w2 = testDunyasi("w2");
    const onek = hesapOnek();
    const a = { id: `${onek}-h-a`, eposta: `${onek}-a@ornek.org`, anahtar: `${onek}-a@ornek.org`, oyuncu: `${onek}-o_a`.slice(0, 32), olusturma: 1 };
    const b = { id: `${onek}-h-b`, eposta: `${onek}-b@ornek.org`, anahtar: `${onek}-b@ornek.org`, oyuncu: `${onek}-o_b`.slice(0, 32), olusturma: 1 };
    const katil = (seq: number, oyuncu: string) => ({ seq, t: seq, oyuncu: "sistem", komut: { tur: "oyuncu_katil" as const, oyuncu, bolgeler: [] as string[] }, istemci: "i", anahtar: `k${seq}`, kuralSurumu: "k", semaSurumu: 1 });
    const d1 = await pgAc(w1);
    const d2 = await pgAc(w2);
    try {
      await d1.gunluk.ekle([katil(1, a.oyuncu), katil(2, b.oyuncu)]);
      await d2.gunluk.ekle([katil(1, b.oyuncu)]);
      await d1.goruntu.kaydet(goruntu(2, 5, "k"));
      await d2.goruntu.kaydet(goruntu(1, 5, "k"));
      await d1.oyunOturumu?.ac(a.oyuncu, 1_000);
      await d2.oyunOturumu?.ac(b.oyuncu, 1_000);
      await d1.oyunOturumu?.ac(b.oyuncu, 2_000);
      const h = d1.hesap as NonNullable<typeof d1.hesap>;
      await h.hesapOlustur(a);
      await h.hesapOlustur(b);
      for (const x of [a, b]) {
        await h.oturumEkle({ id: `${x.id}-ot`, hesap: x.id, gizliOzet: "g", olusturma: 1, sonKullanim: 1, bitis: 9, mutlakBitis: 9 });
        await h.baglantiEkle({ ozet: `${x.id}-bag`, eposta: x.eposta, anahtar: x.anahtar, bitis: 9, tarayiciOzeti: null, olusturma: 1 });
      }
      // Dünya açıkken (yazar kilidi) ve paylaşılan ad reddedilir; hiçbir şey silinmez.
      await expect(pgTestDunyasiSil(PG as string, { dunya: w1 })).rejects.toThrow(/acik|kilit/);
      await expect(pgTestDunyasiSil(PG as string, { dunya: "ana" })).rejects.toThrow(/reddedildi/);
      expect((await d1.gunluk.oku(0)).length).toBe(2);
    } finally {
      await d1.gunluk.kapat();
    }

    const once = await pgTestDunyasiSay(PG as string, { dunya: w1, oyuncular: [a.oyuncu, b.oyuncu] });
    expect(once.kalan["log"]).toBe(2);
    expect(once.kalan["oyun_oturum"]).toBe(2);
    const rapor = await pgTestDunyasiSil(PG as string, { dunya: w1 });
    expect(rapor.depo).toBe("pg");
    expect(rapor.silinen["log"]).toBe(2);
    expect(rapor.silinen["snapshots"]).toBe(1);
    expect(rapor.silinen["oyun_oturum"]).toBe(2);
    expect(rapor.silinen["hesap"]).toBe(1); // yalniz a: b baska dunyada da var
    expect(rapor.silinen["oturum"]).toBe(1);
    expect(rapor.silinen["giris_baglanti"]).toBe(1);
    expect(rapor.korunanHesap).toBe(1);
    expect(rapor.oyuncular).toEqual([a.oyuncu, b.oyuncu].sort());

    const sonra = await pgTestDunyasiSay(PG as string, { dunya: w1, oyuncular: [a.oyuncu] });
    expect(Object.values(sonra.kalan).every((n) => n === 0), JSON.stringify(sonra)).toBe(true);
    expect(sonra.toplam).toBe(0);
    expect((await sorgu("SELECT 1 FROM hesap WHERE id = $1", [a.id])).length).toBe(0);
    expect((await sorgu("SELECT 1 FROM hesap_oyuncu WHERE hesap_id = $1", [a.id])).length).toBe(0);
    expect((await sorgu("SELECT 1 FROM hesap WHERE id = $1", [b.id])).length).toBe(1); // korundu
    expect((await sorgu("SELECT 1 FROM oturum WHERE hesap_id = $1", [b.id])).length).toBe(1);
    // Diğer dünya dokunulmadan kalır.
    expect((await sorgu("SELECT 1 FROM log WHERE dunya = $1", [w2])).length).toBe(1);
    expect((await sorgu("SELECT 1 FROM snapshots WHERE dunya = $1", [w2])).length).toBe(1);
    expect((await sorgu("SELECT 1 FROM oyun_oturum WHERE dunya = $1", [w2])).length).toBe(1);
    // İkinci silme boş çalışır; kalan dünya silinince b'nin hesabı da gider.
    expect((await pgTestDunyasiSil(PG as string, { dunya: w1 })).toplam).toBe(0);
    await d2.gunluk.kapat();
    const r2 = await pgTestDunyasiSil(PG as string, { dunya: w2 });
    expect(r2.silinen["hesap"]).toBe(1);
    expect((await sorgu("SELECT 1 FROM hesap WHERE id = $1", [b.id])).length).toBe(0);
  });

  it("dokum: pg dunyasi (yazar ACIKKEN, kilitsiz) dosya deposu bicimine dokulur; dokumden acilan dunya ayni durumOzeti'ni verir", async () => {
    const dunya = yeniDunya("dok");
    const saat = new ElleSaat();
    const depo = await pgAc(dunya);
    const y = await DunyaYazari.ac({ veri: veri(), tohum: 4, depo, saat, goruntuAraligiMs: 3 * SAAT });
    const p = [
      y.komutGonder(SISTEM_OYUNCUSU, "t", "k", { tur: "oyuncu_katil", oyuncu: "ali", bolgeler: KUZEY }),
      y.komutGonder("ali", "t", "a", { tur: "tesis_insa", bolge: "m_ova", tesisTuru: "ciftlik" }),
    ];
    await y.birTur();
    saat.ilerlet(5 * SAAT);
    await y.birTur();
    p.push(y.komutGonder("ali", "t", "b", { tur: "vergi_ayarla", oranPpm: 120_000 }));
    await y.birTur();
    await Promise.all(p);
    const beklenen = y.ozet();
    const hedef = await mkdtemp(join(tmpdir(), "bolge-pg-dok-"));
    const kaynak = await postgresDeposu({ baglanti: PG as string, dunya, semaKur: false, kilitsiz: true }); // yazar hala acik
    try {
      const sonuc = await depoyuDok(kaynak, hedef, 2);
      expect(sonuc.sonSeq).toBe(beklenen.seq);
      const d = await dosyaDeposu(hedef);
      try {
        const k = await DunyaYazari.ac({ veri: veri(), tohum: 999, depo: d, saat: new ElleSaat(), goruntuAraligiMs: 1e12 });
        expect(k.ozet().durumOzeti).toBe(beklenen.durumOzeti);
      } finally {
        await d.gunluk.kapat();
      }
    } finally {
      await kaynak.gunluk.kapat();
      await rm(hedef, { recursive: true, force: true });
      await y.kapat(); // depoyu (ve yazar kilidini) da kapatir
    }
  });
});
