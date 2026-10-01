/**
 * Giriş yığını yükleyicisi: giriş kodu kabuğa (dunya.html) girmez, `giris.js`'ten yüklenir (tek dosya derlemesi) ya da tembel parça olarak gelir
 * (geliştirme, test). Test ortamında tembel yol: modül yüklenir ve `girisBaslat` dışa açılır; kabuğun içe aktardığı küçük kip modülü
 * protokol, zod ya da giriş ekranı kodunu çekmez.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { girisModulu } from "../src/giris/yukle";

const SRC = join(dirname(fileURLToPath(import.meta.url)), "..", "src");

describe("giriş yığını ayrı", () => {
  it("tembel yol: modül yüklenir ve girisBaslat dışa açılır", async () => {
    const m = await girisModulu();
    expect(typeof m.girisBaslat).toBe("function");
  });

  it("kabuğun (main.ts) içe aktarımları: yalnız kip.ts ve yukle.ts; baslat/api/akis/ekran-html/gorunum/giris-metin statik içe aktarılmaz", () => {
    const main = readFileSync(join(SRC, "main.ts"), "utf8");
    const girisIcerikleri = [...main.matchAll(/^import[^;]*from "\.\/giris\/([^"]+)";/gm)].map((x) => x[1]);
    expect(girisIcerikleri.sort()).toEqual(["kip", "yukle"]);
    expect(main).not.toMatch(/giris\.css/);
  });

  it("kip.ts ve yukle.ts hafiftir: protokol, zod ve giriş ekranı modüllerini içe aktarmaz (yukle.ts yalnız tip ve dinamik içe aktarım)", () => {
    for (const ad of ["kip.ts", "yukle.ts"]) {
      const k = readFileSync(join(SRC, "giris", ad), "utf8");
      const statik = [...k.matchAll(/^import\s[^;]*from\s+"([^"]+)";/gm)].map((x) => x[1]!);
      for (const i of statik) expect(i, `${ad}: ${i}`).not.toMatch(/protokol|zod|api|akis|ekran-html|gorunum|giris-metin|oturum|baslat/);
    }
  });
});
