/**
 * Postgres deposu (`sql/001-baslangic.sql`: `log` + `snapshots`; `sql/002-goc-profil.sql`: goc yedegi, profil). `pg` modülü yalnız bu depo açılınca tembelce
 * yüklenir; testler Postgres olmadan koşar (gerçek veritabanı testi yalnız `BOLGE_PG_URL` tanımlıysa).
 *
 * - Tek yazar: açılışta ayrı bir bağlantıda dünya kimliğinden türetilen `pg_try_advisory_lock` alınır; alınamazsa
 *   açılış reddedilir. Bağlantı kapanınca kilit kendiliğinden düşer (kill -9 sonrası devralınabilir).
 * - `ekle`: tek işlem (BEGIN/COMMIT) içinde çok satırlı INSERT; commit dönünce kalıcıdır.
 * - Görüntü gövdesi gzip ile sıkıştırılır (`sikistirma = 'gzip'`).
 * - Şema sürümlüdür (`sunucu_sema`): `postgresSemasiKur` eksik göç adımlarını sırayla ve tek işlemde uygular (şema kilidi altında).
 *   Sürüm kaydı olmayan ama `snapshots` tablosu olan eski veritabanı sürüm 1 sayılır ve 2'ye yükseltilir (veri korunur).
 * - İçerik göçü: `snapshots` anahtarı `(dunya, seq, sim_t, kural_sur)`; göç görüntüsü eskisiyle aynı seq/zamanda yazılır ve eski kural
 *   sürümlü kayıt yerinde kalır. `yedekle` ayrıca `snapshot_yedek`'e değişmez bir kopya yazar; `yedektenDon` onu en yeni görüntü yapar.
 *   En son görüntü: `ORDER BY seq DESC, sim_t DESC, olusturma DESC, kural_sur DESC`.
 * - Profil (çapalar, özet kayıtları): `profil_capa` / `profil_kayit` (PK = idempotans anahtarı; halka ≤ 200, ömür 30 sim-günü).
 */
import { readFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import type { Pool, PoolClient } from "pg";
import { fnv1a32 } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { seqSurekliligiDenetle } from "./tipler";
import { OZET_KAYIT_OMRU_MS, OZET_KAYIT_TAVANI } from "./tipler";
import type { AnlikGoruntuKaydi, Capa, Depo, GoruntuEki, GunlukKaydi, OzetKaydi, ProfilDeposu } from "./tipler";

export interface PostgresSecenekleri {
  /** postgres://... bağlantı dizesi. */
  baglanti: string;
  /** Dünya kimliği (tablolarda `dunya` sütunu). */
  dunya: string;
  /** true ise `sql/001-baslangic.sql` çalıştırılır (CREATE ... IF NOT EXISTS). */
  semaKur?: boolean;
}

/** SQL şema göç adımları (sıralı; `surum` = bu adım uygulanınca ulaşılan şema sürümü). */
const SEMA_ADIMLARI: ReadonlyArray<{ surum: number; ad: string; dosya: URL }> = [
  { surum: 1, ad: "baslangic", dosya: new URL("../../sql/001-baslangic.sql", import.meta.url) },
  { surum: 2, ad: "goc-profil", dosya: new URL("../../sql/002-goc-profil.sql", import.meta.url) },
];

/** Bu kodun beklediği SQL şema sürümü. */
export const SQL_SEMA_SURUMU = SEMA_ADIMLARI.length;

const SEMA_KILIDI = 7_340_017; // sabit (dunya kilitlerinden ayrı) advisory kilit anahtarı: eşzamanlı göç yarışmasın

/** Şemanın uygulanmış sürümü (hiç yoksa 0; sürüm tablosu yok ama `snapshots` varsa eski kurulum = 1). */
export async function postgresSemaSurumu(havuz: Pool | PoolClient): Promise<number> {
  const t = await havuz.query<{ var: boolean }>("SELECT to_regclass('sunucu_sema') IS NOT NULL AS var");
  if (t.rows[0]?.var === true) {
    const r = await havuz.query<{ surum: number | null }>("SELECT max(surum) AS surum FROM sunucu_sema");
    return Number(r.rows[0]?.surum ?? 0);
  }
  const eski = await havuz.query<{ var: boolean }>("SELECT to_regclass('snapshots') IS NOT NULL AS var");
  return eski.rows[0]?.var === true ? 1 : 0;
}

/**
 * Eksik şema adımlarını uygular (idempotent): şema kilidi altında, her adım tek işlemde ve `sunucu_sema` kaydıyla. Uygulanan
 * adım sürümlerini döndürür. Var olan (sürümsüz) pg dünyası veri kaybetmeden yükseltilir.
 */
export async function postgresSemasiKur(havuz: Pool): Promise<number[]> {
  const c = await havuz.connect();
  const uygulanan: number[] = [];
  try {
    await c.query("SELECT pg_advisory_lock($1)", [SEMA_KILIDI]);
    await c.query("CREATE TABLE IF NOT EXISTS sunucu_sema (surum integer PRIMARY KEY, ad text NOT NULL, uygulandi timestamptz NOT NULL DEFAULT now())");
    let mevcut = await postgresSemaSurumu(c);
    if (mevcut === 1) await c.query("INSERT INTO sunucu_sema (surum, ad) VALUES (1, 'baslangic (onceden kurulmus)') ON CONFLICT DO NOTHING");
    for (const a of SEMA_ADIMLARI) {
      if (a.surum <= mevcut) continue;
      await c.query("BEGIN");
      try {
        await c.query(await readFile(a.dosya, "utf8"));
        await c.query("INSERT INTO sunucu_sema (surum, ad) VALUES ($1, $2)", [a.surum, a.ad]);
        await c.query("COMMIT");
      } catch (e) {
        await c.query("ROLLBACK").catch(() => undefined);
        throw new Error(`pg sema adimi ${a.surum} (${a.ad}) uygulanamadi: ${e instanceof Error ? e.message : String(e)}`);
      }
      uygulanan.push(a.surum);
      mevcut = a.surum;
    }
  } finally {
    await c.query("SELECT pg_advisory_unlock($1)", [SEMA_KILIDI]).catch(() => undefined);
    c.release();
  }
  return uygulanan;
}

interface LogSatiri {
  seq: string;
  t: string;
  hesap: string;
  istemci: string;
  anahtar: string;
  komut: Komut;
  kural_sur: string;
  sema_sur: number;
}

export async function postgresDeposu(s: PostgresSecenekleri): Promise<Depo & { havuz: Pool; yedektenDon(etiket: string): Promise<AnlikGoruntuKaydi> }> {
  const pg = (await import("pg")).default;
  const havuz = new pg.Pool({ connectionString: s.baglanti, max: 4 });
  let kilitBaglantisi: PoolClient | null = null;
  const kilitAnahtari = fnv1a32(`bolge-dunya:${s.dunya}`) | 0;
  try {
    if (s.semaKur) await postgresSemasiKur(havuz);
    const surum = await postgresSemaSurumu(havuz);
    if (surum < SQL_SEMA_SURUMU) {
      throw new Error(`pg sema surumu eski: ${surum} < ${SQL_SEMA_SURUMU}; semaKur: true (CLI varsayilani) ile acin (eksik gocler uygulanir, veri korunur)`);
    }
    kilitBaglantisi = await havuz.connect();
    const r = await kilitBaglantisi.query<{ alindi: boolean }>("SELECT pg_try_advisory_lock($1) AS alindi", [kilitAnahtari]);
    if (r.rows[0]?.alindi !== true) throw new Error(`dunya baska bir yazar tarafindan kilitli (advisory lock): ${s.dunya}`);
  } catch (e) {
    kilitBaglantisi?.release();
    await havuz.end();
    throw e;
  }
  const kilit = kilitBaglantisi;

  const son = await havuz.query<{ seq: string | null }>("SELECT max(seq) AS seq FROM log WHERE dunya = $1", [s.dunya]);
  let sonSeq = Number(son.rows[0]?.seq ?? 0);

  return {
    havuz,
    gunluk: {
      async ekle(toplu: readonly GunlukKaydi[]): Promise<void> {
        if (toplu.length === 0) return;
        seqSurekliligiDenetle(sonSeq, toplu);
        const degerler: unknown[] = [];
        const satirlar = toplu.map((k, i) => {
          const b = i * 9;
          degerler.push(s.dunya, k.seq, k.t, k.oyuncu, k.istemci, k.anahtar, JSON.stringify(k.komut), k.kuralSurumu, k.semaSurumu);
          return `($${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7}::jsonb,$${b + 8},$${b + 9})`;
        });
        const c = await havuz.connect();
        try {
          await c.query("BEGIN");
          await c.query(`INSERT INTO log (dunya, seq, t, hesap, istemci, anahtar, komut, kural_sur, sema_sur) VALUES ${satirlar.join(",")}`, degerler);
          await c.query("COMMIT");
        } catch (e) {
          await c.query("ROLLBACK").catch(() => undefined);
          throw e;
        } finally {
          c.release();
        }
        sonSeq = (toplu.at(-1) as GunlukKaydi).seq;
      },
      async oku(seqSonrasi: number): Promise<GunlukKaydi[]> {
        const r = await havuz.query<LogSatiri>(
          "SELECT seq, t, hesap, istemci, anahtar, komut, kural_sur, sema_sur FROM log WHERE dunya = $1 AND seq > $2 ORDER BY seq",
          [s.dunya, seqSonrasi],
        );
        const kayitlar = r.rows.map(
          (x): GunlukKaydi => ({
            seq: Number(x.seq),
            t: Number(x.t),
            oyuncu: x.hesap,
            komut: x.komut,
            istemci: x.istemci,
            anahtar: x.anahtar,
            kuralSurumu: x.kural_sur,
            semaSurumu: x.sema_sur,
          }),
        );
        seqSurekliligiDenetle(seqSonrasi, kayitlar);
        return kayitlar;
      },
      async kapat(): Promise<void> {
        // Kilit açıkça bırakılır: bağlantının sunucuda kapanması gecikse bile hemen yeniden açılış mümkün olur (kill -9'da bağlantı düşünce kendiliğinden).
        await kilit.query("SELECT pg_advisory_unlock($1)", [kilitAnahtari]).catch(() => undefined);
        kilit.release();
        await havuz.end();
      },
    },
    goruntu: {
      async kaydet(g: AnlikGoruntuKaydi): Promise<void> {
        // Aynı (seq, sim_t, kural_sur) yeniden yazılırsa (ör. kapanış görüntüsü aynı anda) kayıt yenilenir ve en yeni olur.
        await havuz.query(
          `INSERT INTO snapshots (dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'gzip',$8)
           ON CONFLICT (dunya, seq, sim_t, kural_sur) DO UPDATE SET sema_sur = EXCLUDED.sema_sur, durum_ozeti = EXCLUDED.durum_ozeti, ek = EXCLUDED.ek,
             sikistirma = EXCLUDED.sikistirma, blob = EXCLUDED.blob, olusturma = now()`,
          [s.dunya, g.seq, g.simZamani, g.kuralSurumu, g.semaSurumu, g.durumOzeti, JSON.stringify(g.ek), gzipSync(g.metin)],
        );
      },
      async sonuncu(): Promise<AnlikGoruntuKaydi | null> {
        const r = await havuz.query<GoruntuSatiri>(
          `SELECT seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob FROM snapshots WHERE dunya = $1
           ORDER BY seq DESC, sim_t DESC, olusturma DESC, kural_sur DESC LIMIT 1`,
          [s.dunya],
        );
        const x = r.rows[0];
        return x ? goruntuKaydi(x) : null;
      },
      /**
       * Göç öncesi görüntünün değişmez kopyası (`snapshot_yedek`, PK (dunya, etiket)). Asıl satır da yerinde kalır (anahtarda kural_sur
       * var); kopya, görüntü satırları budanırsa bile geri dönüşü sağlar. Kaynak satır yoksa fırlatır.
       */
      async yedekle(g: AnlikGoruntuKaydi, etiket: string): Promise<string> {
        const r = await havuz.query(
          `INSERT INTO snapshot_yedek (dunya, etiket, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob)
           SELECT dunya, $5, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob FROM snapshots
            WHERE dunya = $1 AND seq = $2 AND sim_t = $3 AND kural_sur = $4
           ON CONFLICT (dunya, etiket) DO UPDATE SET seq = EXCLUDED.seq, sim_t = EXCLUDED.sim_t, kural_sur = EXCLUDED.kural_sur, sema_sur = EXCLUDED.sema_sur,
             durum_ozeti = EXCLUDED.durum_ozeti, ek = EXCLUDED.ek, sikistirma = EXCLUDED.sikistirma, blob = EXCLUDED.blob, olusturma = now()`,
          [s.dunya, g.seq, g.simZamani, g.kuralSurumu, etiket],
        );
        if (r.rowCount !== 1) throw new Error(`yedeklenecek goruntu satiri yok: seq ${g.seq}, t ${g.simZamani}, kural ${g.kuralSurumu}`);
        return `pg:snapshot_yedek:${s.dunya}:${etiket}`;
      },
      async kapat(): Promise<void> {},
    },
    profil: new PostgresProfilDeposu(havuz, s.dunya),
    /** Günlük: `log` tablosunun toplam boyutu (TÜM dünyalar; tablo ortaktır); görüntü: bu dünyanın görüntü gövdeleri. */
    async boyut() {
      const g = await havuz.query<{ b: string }>("SELECT pg_total_relation_size('log') AS b");
      const r = await havuz.query<{ b: string }>("SELECT coalesce(sum(octet_length(blob)), 0) AS b FROM snapshots WHERE dunya = $1", [s.dunya]);
      return { gunlukBayt: Number(g.rows[0]?.b ?? 0), goruntuBayt: Number(r.rows[0]?.b ?? 0) };
    },
    /**
     * Geri dönüş: `etiket` yedeğini en yeni görüntü yapar (aynı (seq, sim_t, kural_sur) satırı yenilenir ve `olusturma = now()`); sonraki
     * açılış eski içerik/kural sürümüyle yeniden başlar. Yalnız yeni kural sürümüyle HİÇ komut kabul edilmediyse geçerlidir.
     */
    async yedektenDon(etiket: string): Promise<AnlikGoruntuKaydi> {
      const r = await havuz.query<GoruntuSatiri>(
        `INSERT INTO snapshots (dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob)
         SELECT dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob FROM snapshot_yedek WHERE dunya = $1 AND etiket = $2
         ON CONFLICT (dunya, seq, sim_t, kural_sur) DO UPDATE SET olusturma = now()
         RETURNING seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob`,
        [s.dunya, etiket],
      );
      const x = r.rows[0];
      if (!x) throw new Error(`goc yedegi yok: ${etiket}`);
      return goruntuKaydi(x);
    },
  };
}

interface GoruntuSatiri {
  seq: string;
  sim_t: string;
  kural_sur: string;
  sema_sur: number;
  durum_ozeti: string;
  ek: GoruntuEki;
  sikistirma: string;
  blob: Buffer;
}

function goruntuKaydi(x: GoruntuSatiri): AnlikGoruntuKaydi {
  if (x.sikistirma !== "gzip") throw new Error(`desteklenmeyen goruntu sikistirmasi: ${x.sikistirma}`);
  return {
    seq: Number(x.seq),
    simZamani: Number(x.sim_t),
    kuralSurumu: x.kural_sur,
    semaSurumu: x.sema_sur,
    durumOzeti: x.durum_ozeti,
    ek: x.ek,
    metin: gunzipSync(x.blob).toString("utf8"),
  };
}

/** Oyuncu çapaları ve özet kayıtları (`profil_capa`, `profil_kayit`): bellek/dosya depolarıyla aynı sözleşme. */
class PostgresProfilDeposu implements ProfilDeposu {
  constructor(
    private readonly havuz: Pool,
    private readonly dunya: string,
  ) {}

  async capaOku(oyuncu: string): Promise<Capa | null> {
    const r = await this.havuz.query<{ capa: Capa }>("SELECT capa FROM profil_capa WHERE dunya = $1 AND oyuncu = $2", [this.dunya, oyuncu]);
    return r.rows[0]?.capa ?? null;
  }

  async capaYaz(oyuncu: string, kismi: Capa): Promise<void> {
    // jsonb `||`: üst düzey anahtarlar (sonGorulen, ozetOkunduT) yenilenir, verilmeyenler korunur.
    await this.havuz.query(
      `INSERT INTO profil_capa (dunya, oyuncu, capa) VALUES ($1, $2, $3::jsonb)
       ON CONFLICT (dunya, oyuncu) DO UPDATE SET capa = profil_capa.capa || EXCLUDED.capa, guncelleme = now()`,
      [this.dunya, oyuncu, JSON.stringify(kismi)],
    );
  }

  async kayitEkle(oyuncu: string, kayitlar: readonly OzetKaydi[], simdi: number): Promise<number> {
    const c = await this.havuz.connect();
    try {
      await c.query("BEGIN");
      let yeni = 0;
      if (kayitlar.length > 0) {
        const degerler: unknown[] = [this.dunya, oyuncu];
        const satirlar = kayitlar.map((k, i) => {
          const b = 2 + i * 6;
          degerler.push(k.tur, k.t, k.sira, k.ilce, JSON.stringify(k.degerler), k.aktorRef ?? null);
          return `($1,$2,$${b + 1},$${b + 2},$${b + 3},$${b + 4},$${b + 5}::jsonb,$${b + 6})`;
        });
        const r = await c.query(
          `INSERT INTO profil_kayit (dunya, oyuncu, tur, t, sira, ilce, degerler, aktor_ref) VALUES ${satirlar.join(",")} ON CONFLICT DO NOTHING`,
          degerler,
        );
        yeni = r.rowCount ?? 0;
      }
      // Ömür (30 sim-günü) ve halka (en yeni 200; sıralama t, tur, sira): bellek/dosya depolarıyla aynı.
      await c.query("DELETE FROM profil_kayit WHERE dunya = $1 AND oyuncu = $2 AND t < $3", [this.dunya, oyuncu, simdi - OZET_KAYIT_OMRU_MS]);
      await c.query(
        `DELETE FROM profil_kayit p USING (
           SELECT tur, t, sira FROM profil_kayit WHERE dunya = $1 AND oyuncu = $2 ORDER BY t DESC, tur DESC, sira DESC OFFSET $3
         ) fazla WHERE p.dunya = $1 AND p.oyuncu = $2 AND p.tur = fazla.tur AND p.t = fazla.t AND p.sira = fazla.sira`,
        [this.dunya, oyuncu, OZET_KAYIT_TAVANI],
      );
      await c.query("COMMIT");
      return yeni;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  async kayitOku(oyuncu: string): Promise<OzetKaydi[]> {
    const r = await this.havuz.query<{ tur: OzetKaydi["tur"]; t: string; sira: string; ilce: string; degerler: (string | number)[]; aktor_ref: string | null }>(
      "SELECT tur, t, sira, ilce, degerler, aktor_ref FROM profil_kayit WHERE dunya = $1 AND oyuncu = $2 ORDER BY t, tur, sira",
      [this.dunya, oyuncu],
    );
    return r.rows.map((x): OzetKaydi => ({ t: Number(x.t), tur: x.tur, ilce: x.ilce, degerler: x.degerler, ...(x.aktor_ref !== null ? { aktorRef: x.aktor_ref } : {}), sira: Number(x.sira) }));
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}
}
