/**
 * Depodaki GERÇEK arsa ızgaraları (`packages/veri/haritalar/odbl/izgara/manifest.json`, O3 G3: Gemlik, Gebze, Körfez; Gebze dosyası `ornek/` altındadır, yollar `odbl/` köküne göredir): manifest denetimleri (gz bayt, sha256, hamBayt,
 * çerçeve, hücre sayıları) gerçek `@bolge/veri` çözücüsüyle geçer, hiyerarşiden il/bölge çözülür, dünya kurulur ve kare hesabı ilçe hücre dizisini açmadan
 * (dizin üzerinden) çalışır. Oyuncu katılımı (yurt araması) burada KOŞULMAZ (ağır; K3 ölçümü ve CLI testi sentetikte).
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { Simulasyon } from "@bolge/cekirdek";
import { gercekVeriyiYukle } from "@bolge/veri";
import { ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "@bolge/protokol";
import { hiyerarsiOku, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari, varsayilanIzgaraKoku } from "../src/izgara/manifest";

const MANIFEST = fileURLToPath(new URL("../../veri/haritalar/odbl/izgara/manifest.json", import.meta.url));

describe.skipIf(!existsSync(MANIFEST))("gerçek izgara manifesti (Alfa-0 ilçeleri)", () => {
  it("manifest gerçek çözücüyle yüklenir (tüm denetimler); hiyerarşiden il/bölge; dünya kurulur; kare dizinden hesaplanır", () => {
    const manifest = izgaraManifestiOku(MANIFEST);
    const kok = varsayilanIzgaraKoku(MANIFEST);
    const yuklenen = izgaralariYukle(manifest, kok, varsayilanIzgaraBagimliliklari);
    expect(yuklenen.length).toBe(manifest.ilceler.length);
    // Üç Alfa-0 ilçesi de (Gebze `ornek/` yolundan) yüklenir; Gebze 500 binden fazla hücredir.
    expect(manifest.ilceler.map((c) => c.kimlik)).toEqual(["tr_16_gemlik", "tr_41_gebze", "tr_41_korfez"]);
    expect(yuklenen.map((y) => y.ilce.kimlik)).toEqual(["tr_16_gemlik", "tr_41_gebze", "tr_41_korfez"]);
    expect(yuklenen.find((y) => y.ilce.kimlik === "tr_41_gebze")?.ilce.hucre.icerde).toBeGreaterThan(500_000);
    for (const y of yuklenen) expect(y.ilce.hucre.uygun).toBeGreaterThan(1000);

    const veri = gercekVeriyiYukle();
    const girdi = izgaraGirdisiKur(yuklenen, {
      ad: "izgara-manifest",
      harita: veri.harita.ad,
      hiyerarsi: hiyerarsiOku(`${kok}/hiyerarsi.json`),
      haritaBolgeleri: new Set(veri.harita.bolgeler.map((b) => b.id)),
    });
    expect(girdi.ilceler.map((c) => c.id)).toEqual(manifest.ilceler.map((c) => c.kimlik));
    expect(girdi.iller.length).toBeGreaterThanOrEqual(1);
    for (const il of girdi.iller) expect(il.bolge).toMatch(/\S/);
    // Manifestte ilçe nüfusu varsa (O3 G7) aynen ParselIzgaraIlce.nufus'a geçer; yoksa alan yok.
    for (const c of manifest.ilceler) {
      const gi = girdi.ilceler.find((x) => x.id === c.kimlik);
      if (c.nufus !== undefined) expect(gi?.nufus, c.kimlik).toBe(c.nufus);
      else expect("nufus" in (gi as object), c.kimlik).toBe(false);
    }
    izgarayiVeriyeBagla(veri, girdi);
    const sim = Simulasyon.olustur(veri, 3);
    expect(sim.durumOzeti()).toMatch(/^[0-9a-f]{16}$/);

    // Kare: ilçe tanımının hücre dizisi AÇILMAZ (sıcak yol dizin üzerinden); ayrılmış liste ilçe başına bir kez hesaplanır.
    const mk = sim.ic.mulk as unknown as { ilceler: Map<string, object> };
    for (const t of mk.ilceler.values()) Object.defineProperty(t, "hucreler", { get: () => { throw new Error("hucre dizisi acilmamali"); } });
    const ilceler = girdi.ilceler.map((c) => c.id);
    const k = ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], null), null, ilceIlgisiKur(sim, ilceler, null), { ayrilmisListesi: true });
    expect(k.ilceler?.map((c) => c.id)).toEqual(ilceler);
    for (const c of k.ilceler ?? []) expect(c.ayrilmis?.length ?? 0).toBeGreaterThan(0);
  }, 120_000);
});
