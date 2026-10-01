/**
 * Arsa ızgarası ilçeleri manifestten (G3 köprüsü; saf): istemcinin `IZGARALI_ILCELER` tablosu ve `derle.ts`'in kopyaladığı
 * dosyalar `odbl/izgara/manifest.json`'dan türer; el ile ilçe tablosu yoktur. Sunucu aynı manifesti okur.
 */
import { existsSync, readFileSync, statSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { beforeAll, describe, expect, it, vi } from "vitest";
import { bhiCoz, izgaraSay } from "../src/harita/hucre";
import { IZGARALI_ILCELER, izgaraVarMi, seritUrl } from "../src/harita/veri";
import { haritaVerisiDosyalari } from "../scripts/harita-verisi-listesi";
import type { IzgaraManifesti } from "../scripts/harita-verisi-listesi";

const ODBL = resolve(dirname(fileURLToPath(import.meta.url)), "..", "..", "veri", "haritalar", "odbl");
interface Manifest extends IzgaraManifesti {
  ilceler: Array<IzgaraManifesti["ilceler"][number] & { cerceve: { x0: number; y0: number; genislik: number; yukseklik: number }; hucre: { uygun: number } }>;
}
const manifest = JSON.parse(readFileSync(join(ODBL, "izgara", "manifest.json"), "utf8")) as Manifest;

describe("izgara manifesti ve istemci tablosu", () => {
  beforeAll(() => {
    vi.stubGlobal("location", new URL("http://localhost/dunya.html")); // `seritUrl` sayfa adresine göre çözer
  });

  it("Alfa-0 ilçeleri manifestte: Gebze, Gemlik, Körfez", () => {
    expect(manifest.ilceler.map((i) => i.kimlik).sort()).toEqual(["tr_16_gemlik", "tr_41_gebze", "tr_41_korfez"]);
  });

  it("manifestteki her ilçe için izgaraVarMi doğru; tablo yalnız manifestten (fazla ilçe yok)", () => {
    for (const i of manifest.ilceler) expect(izgaraVarMi(i.kimlik), i.kimlik).toBe(true);
    expect(Object.keys(IZGARALI_ILCELER).sort()).toEqual(manifest.ilceler.map((i) => i.kimlik).sort());
    expect(izgaraVarMi("tr_41_izmit")).toBe(false);
  });

  it("tablo yolları manifesttekiyle aynı; şerit adresi harita verisi köküne göre", () => {
    for (const i of manifest.ilceler) {
      expect(IZGARALI_ILCELER[i.kimlik]).toEqual({ seritler: i.seritler.yol, hucreler: i.bhi.yol });
      expect(seritUrl(i.kimlik)?.endsWith(i.seritler.yol)).toBe(true);
    }
    expect(seritUrl("tr_41_izmit")).toBeNull();
  });
});

describe("derle.ts dosya listesi (haritaVerisiDosyalari)", () => {
  const liste = haritaVerisiDosyalari(manifest);

  it("manifestteki her BHI1 ve şerit dosyası listede; manifestin kendisi ve lisansı da", () => {
    for (const i of manifest.ilceler) {
      expect(liste, i.kimlik).toContain(i.bhi.yol);
      expect(liste, i.kimlik).toContain(i.seritler.yol);
    }
    expect(liste).toContain("izgara/manifest.json");
    expect(liste).toContain("izgara/LISANS.txt");
    expect(liste).toEqual(expect.arrayContaining(["hiyerarsi.json", "iller.topo.json", "ilceler"]));
  });

  it("listedeki her dosya kaynakta var (derle kopyalayabilir); yinelenen yok", () => {
    for (const d of liste) expect(existsSync(join(ODBL, d)), d).toBe(true);
    expect(new Set(liste).size).toBe(liste.length);
  });

  it("eski sabit Gebze örnek yolları listede ancak manifest üzerinden (el ile yol yok)", () => {
    const gebze = manifest.ilceler.find((i) => i.kimlik === "tr_41_gebze")!;
    expect(liste).toContain(gebze.bhi.yol);
    expect(liste).toContain(gebze.seritler.yol);
  });
});

describe("manifest dosyaları geçerli BHI1", () => {
  it.each(manifest.ilceler.map((i) => [i.kimlik, i] as const))("%s: BHI1 çözülür, çerçeve ve uygun hücre sayısı manifestle aynı", (_k, i) => {
    const yol = join(ODBL, i.bhi.yol);
    expect(statSync(yol).size).toBeGreaterThan(0);
    const iz = bhiCoz(new Uint8Array(gunzipSync(readFileSync(yol))));
    expect({ x0: iz.x0, y0: iz.y0, genislik: iz.genislik, yukseklik: iz.yukseklik }).toEqual(i.cerceve);
    expect(izgaraSay(iz).uygun).toBe(i.hucre.uygun);
  });
});
