/**
 * pg havuzu sağlamlık yardımcıları (57P01 kararsızlığı kök nedeni):
 *
 * `pg.Pool.end()` istemcilerin soket kapanışını BEKLEMEZ (`_remove` -> `client.end(cb)` çağrılır, havuz hemen biter). Hemen ardından sunucu tarafı bir
 * yönetici kesmesi gelirse (`DROP DATABASE ... WITH (FORCE)`, `pg_terminate_backend`, yeniden başlatma) hâlâ açık soket
 * `57P01 terminating connection due to administrator command` alır; istemci `error` yayar, havuzun boşta dinleyicisi bunu `pool.emit("error")`a çevirir.
 * Havuzda `error` dinleyicisi YOKSA Node bunu işlenmemiş `error` olayı sayıp süreci düşürür (test dosyası "Unhandled Error"la kırılır, üretimde fail-stop
 * yolu atlanır). Ödünç alınmış (checkout) istemcide havuzun dinleyicisi yoktur: bağlantı o sırada kopsa istemci `error`u da dinleyicisiz kalır.
 *
 * Kural: bu pakette ve testlerde her `pg.Pool` bu yardımcıyla ya da `postgresDeposu`nun kendi dinleyicisiyle (`hataBildir`) kurulur.
 * Dinleyici hatayı yutar: sorgu sırasındaki kopma zaten sorgunun reddiyle, kalıcı kopma depo ölümcül yoluyla (`Depo.hataDinle`) görünür.
 */
import type { Pool, PoolClient, PoolConfig } from "pg";

/** Boşta/kapanmakta olan bağlantı hataları (ör. 57P01) süreci düşürmesin: havuza ve her yeni istemciye (ödünç alınmışken de) dinleyici takar. */
export function havuzaDinleyiciTak<H extends Pick<Pool, "on">>(havuz: H, bildir: (e: Error) => void = () => undefined): H {
  havuz.on("error", (e: Error) => bildir(e));
  havuz.on("connect", (c: PoolClient) => {
    c.on("error", (e: Error) => bildir(e));
  });
  return havuz;
}

/** `pg.Pool` + `havuzaDinleyiciTak`. */
export async function pgHavuzuAc(ayar: PoolConfig, bildir?: (e: Error) => void): Promise<Pool> {
  const pg = (await import("pg")).default;
  return havuzaDinleyiciTak(new pg.Pool(ayar), bildir);
}
