/**
 * Postgres'siz statik denetim (57P01 kararsızlığının tekrarını önler): paketteki HER `pg.Pool` `error` dinleyicili kurulur.
 * - `src`: `Pool(` yalnız `pg-havuz.ts` (yardımcı) ve `depo/postgres.ts` (kendi `havuz.on("error", hataBildir)` dinleyicisi) içinde geçebilir.
 * - `test`: doğrudan `new pg.Pool(` yok; `pg-yardimci.ts`'teki `pgHavuzu` kullanılır (`pg-yardimci.ts` hariç).
 * Davranış kanıtı: test/pg-hata.test.ts (sahte havuz).
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

const KOK = fileURLToPath(new URL("..", import.meta.url));

function dosyalar(dizin: string): string[] {
  return readdirSync(dizin, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? dosyalar(join(dizin, d.name)) : /\.(ts|mjs|js)$/.test(d.name) ? [join(dizin, d.name)] : []));
}

const HAVUZ_KURMA = /\bPool\(/;

describe("pg havuzlari error dinleyicilidir (statik tarama)", () => {
  it("src: Pool kuran dosyalar yalniz pg-havuz.ts ve depo/postgres.ts; ikisi de dinleyici takar; test-dunya.ts yardimciyi kullanir", () => {
    const kuranlar = dosyalar(join(KOK, "src"))
      .filter((f) => HAVUZ_KURMA.test(readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "")))
      .map((f) => f.slice(KOK.length))
      .sort();
    expect(kuranlar).toEqual(["src/depo/pg-havuz.ts", "src/depo/postgres.ts"]);
    expect(readFileSync(join(KOK, "src/depo/pg-havuz.ts"), "utf8")).toContain('havuz.on("error"');
    expect(readFileSync(join(KOK, "src/depo/postgres.ts"), "utf8")).toContain('havuz.on("error", hataBildir)');
    expect(readFileSync(join(KOK, "src/test-dunya.ts"), "utf8")).toContain("pgHavuzuAc(");
  });

  it("test: dogrudan new pg.Pool yok (pg-yardimci.ts disinda)", () => {
    const ihlal = dosyalar(join(KOK, "test"))
      .filter((f) => !f.endsWith("pg-yardimci.ts") && !f.endsWith("pg-havuz-tarama.test.ts"))
      .filter((f) => /new\s+(pg\.)?Pool\(/.test(readFileSync(f, "utf8")))
      .map((f) => f.slice(KOK.length));
    expect(ihlal).toEqual([]);
  });
});
