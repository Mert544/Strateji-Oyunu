/** Postgres oyun oturumu deposu (`sql/005-oyun-oturum.sql`): bellek ve dosya depolarıyla AYNI sözleşme (test/oyun-oturum-sozlesmesi.ts). Dünya başınadır. */
import type { Pool } from "pg";
import { OTURUM_GUN_MS, OYUN_OTURUM_OMRU_MS } from "./tipler";
import type { GunlukOturumSayisi, OyunOturumDeposu, OyunOturumu } from "./tipler";

interface Satir {
  id: string;
  oyuncu: string;
  acilis: string;
  kapanis: string | null;
}
const kayit = (x: Satir): OyunOturumu => ({ id: Number(x.id), oyuncu: x.oyuncu, acilis: Number(x.acilis), kapanis: x.kapanis === null ? null : Number(x.kapanis) });

export class PostgresOyunOturumDeposu implements OyunOturumDeposu {
  constructor(
    private readonly havuz: Pool,
    private readonly dunya: string,
  ) {}

  async ac(oyuncu: string, acilis: number): Promise<OyunOturumu> {
    const r = await this.havuz.query<Satir>("INSERT INTO oyun_oturum (dunya, oyuncu, acilis) VALUES ($1,$2,$3) RETURNING id, oyuncu, acilis, kapanis", [this.dunya, oyuncu, acilis]);
    return kayit(r.rows[0] as Satir);
  }

  async sonOturum(oyuncu: string): Promise<OyunOturumu | null> {
    const r = await this.havuz.query<Satir>("SELECT id, oyuncu, acilis, kapanis FROM oyun_oturum WHERE dunya = $1 AND oyuncu = $2 ORDER BY acilis DESC, id DESC LIMIT 1", [this.dunya, oyuncu]);
    return r.rows[0] ? kayit(r.rows[0]) : null;
  }

  async kapanisYaz(id: number, kapanis: number | null): Promise<void> {
    await this.havuz.query("UPDATE oyun_oturum SET kapanis = $3 WHERE dunya = $1 AND id = $2", [this.dunya, id, kapanis]);
  }

  async oku(oyuncu?: string): Promise<OyunOturumu[]> {
    const r = await this.havuz.query<Satir>(
      `SELECT id, oyuncu, acilis, kapanis FROM oyun_oturum WHERE dunya = $1 ${oyuncu === undefined ? "" : "AND oyuncu = $2"} ORDER BY acilis, id`,
      oyuncu === undefined ? [this.dunya] : [this.dunya, oyuncu],
    );
    return r.rows.map(kayit);
  }

  async toplulastir(simdi: number, omurMs = OYUN_OTURUM_OMRU_MS): Promise<number> {
    const kesim = Math.floor((simdi - omurMs) / OTURUM_GUN_MS) * OTURUM_GUN_MS;
    const c = await this.havuz.connect();
    try {
      await c.query("BEGIN");
      // Tam günler tek işlemde: günlük toplu sayılar eklenir (varsa artırılır), ayrıntı satırları silinir.
      await c.query(
        `INSERT INTO oyun_oturum_gunluk (dunya, gun, oturum, oyuncu, sure_ms)
         SELECT dunya, (acilis / $3) * $3, count(*)::int, count(DISTINCT oyuncu)::int, coalesce(sum(greatest(0, kapanis - acilis)) FILTER (WHERE kapanis IS NOT NULL), 0)
           FROM oyun_oturum WHERE dunya = $1 AND acilis < $2 GROUP BY dunya, (acilis / $3) * $3
         ON CONFLICT (dunya, gun) DO UPDATE SET oturum = oyun_oturum_gunluk.oturum + EXCLUDED.oturum, oyuncu = oyun_oturum_gunluk.oyuncu + EXCLUDED.oyuncu, sure_ms = oyun_oturum_gunluk.sure_ms + EXCLUDED.sure_ms`,
        [this.dunya, kesim, OTURUM_GUN_MS],
      );
      const sil = await c.query("DELETE FROM oyun_oturum WHERE dunya = $1 AND acilis < $2", [this.dunya, kesim]);
      await c.query("COMMIT");
      return sil.rowCount ?? 0;
    } catch (e) {
      await c.query("ROLLBACK").catch(() => undefined);
      throw e;
    } finally {
      c.release();
    }
  }

  async gunlukSayilar(): Promise<GunlukOturumSayisi[]> {
    const r = await this.havuz.query<{ gun: string; oturum: number; oyuncu: number; sure_ms: string }>("SELECT gun, oturum, oyuncu, sure_ms FROM oyun_oturum_gunluk WHERE dunya = $1 ORDER BY gun", [this.dunya]);
    return r.rows.map((x) => ({ gun: Number(x.gun), oturum: x.oturum, oyuncu: x.oyuncu, sureMs: Number(x.sure_ms) }));
  }

  async dunyayiSil(): Promise<{ oturum: number; gunluk: number }> {
    const a = await this.havuz.query("DELETE FROM oyun_oturum WHERE dunya = $1", [this.dunya]);
    const b = await this.havuz.query("DELETE FROM oyun_oturum_gunluk WHERE dunya = $1", [this.dunya]);
    return { oturum: a.rowCount ?? 0, gunluk: b.rowCount ?? 0 };
  }

  async esitle(): Promise<void> {}

  async kapat(): Promise<void> {}
}
