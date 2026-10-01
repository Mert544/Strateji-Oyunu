/**
 * Postgres deposu (`sql/001-baslangic.sql`: `log` + `snapshots`). `pg` modülü yalnız bu depo açılınca tembelce
 * yüklenir; testler Postgres olmadan koşar (gerçek veritabanı testi yalnız `BOLGE_PG_URL` tanımlıysa).
 *
 * - Tek yazar: açılışta ayrı bir bağlantıda dünya kimliğinden türetilen `pg_try_advisory_lock` alınır; alınamazsa
 *   açılış reddedilir. Bağlantı kapanınca kilit kendiliğinden düşer (kill -9 sonrası devralınabilir).
 * - `ekle`: tek işlem (BEGIN/COMMIT) içinde çok satırlı INSERT; commit dönünce kalıcıdır.
 * - Görüntü gövdesi gzip ile sıkıştırılır (`sikistirma = 'gzip'`).
 */
import { readFile } from "node:fs/promises";
import { gunzipSync, gzipSync } from "node:zlib";
import type { Pool, PoolClient } from "pg";
import { fnv1a32 } from "@bolge/cekirdek";
import type { Komut } from "@bolge/cekirdek";
import { seqSurekliligiDenetle } from "./tipler";
import type { AnlikGoruntuKaydi, Depo, GoruntuEki, GunlukKaydi } from "./tipler";

export interface PostgresSecenekleri {
  /** postgres://... bağlantı dizesi. */
  baglanti: string;
  /** Dünya kimliği (tablolarda `dunya` sütunu). */
  dunya: string;
  /** true ise `sql/001-baslangic.sql` çalıştırılır (CREATE ... IF NOT EXISTS). */
  semaKur?: boolean;
}

const SEMA_DOSYASI = new URL("../../sql/001-baslangic.sql", import.meta.url);

export async function postgresSemasiKur(havuz: Pool): Promise<void> {
  await havuz.query(await readFile(SEMA_DOSYASI, "utf8"));
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

export async function postgresDeposu(s: PostgresSecenekleri): Promise<Depo & { havuz: Pool }> {
  const pg = (await import("pg")).default;
  const havuz = new pg.Pool({ connectionString: s.baglanti, max: 4 });
  let kilitBaglantisi: PoolClient | null = null;
  try {
    if (s.semaKur) await postgresSemasiKur(havuz);
    kilitBaglantisi = await havuz.connect();
    const kilitAnahtari = fnv1a32(`bolge-dunya:${s.dunya}`) | 0;
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
        kilit.release();
        await havuz.end();
      },
    },
    goruntu: {
      async kaydet(g: AnlikGoruntuKaydi): Promise<void> {
        await havuz.query(
          "INSERT INTO snapshots (dunya, seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,'gzip',$8)",
          [s.dunya, g.seq, g.simZamani, g.kuralSurumu, g.semaSurumu, g.durumOzeti, JSON.stringify(g.ek), gzipSync(g.metin)],
        );
      },
      async yedekle(): Promise<string> {
        // `snapshots` birincil anahtarı (dunya, seq, sim_t) göç görüntüsünün eskisiyle AYNI seq/zamanda yazılmasını da reddeder.
        throw new Error("pg deposunda icerik gocu henuz desteklenmiyor (snapshots birincil anahtari ayni seq/zamandaki goc goruntusune izin vermez); goc icin dosya deposu kullanin");
      },
      async sonuncu(): Promise<AnlikGoruntuKaydi | null> {
        const r = await havuz.query<{ seq: string; sim_t: string; kural_sur: string; sema_sur: number; durum_ozeti: string; ek: GoruntuEki; sikistirma: string; blob: Buffer }>(
          "SELECT seq, sim_t, kural_sur, sema_sur, durum_ozeti, ek, sikistirma, blob FROM snapshots WHERE dunya = $1 ORDER BY seq DESC, sim_t DESC LIMIT 1",
          [s.dunya],
        );
        const x = r.rows[0];
        if (!x) return null;
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
      },
      async kapat(): Promise<void> {},
    },
  };
}
