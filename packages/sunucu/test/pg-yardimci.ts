/**
 * Postgres testlerinin havuz kurucusu: HER test havuzu `error` dinleyicilidir (bkz. `src/depo/pg-havuz.ts`). `Pool.end()` soket kapanışını beklemediği için
 * `DROP DATABASE ... WITH (FORCE)` hâlâ açık soketlere 57P01 gönderebilir; dinleyicisiz havuz bunu işlenmemiş hataya çevirir ve test dosyasını (süreci) düşürür.
 * `new pg.Pool` doğrudan KULLANILMAZ (`pg-havuz-tarama.test.ts` denetler).
 */
import pg from "pg";
import { havuzaDinleyiciTak } from "../src/depo/pg-havuz";

export function pgHavuzu(ayar: pg.PoolConfig): pg.Pool {
  return havuzaDinleyiciTak(new pg.Pool(ayar));
}
