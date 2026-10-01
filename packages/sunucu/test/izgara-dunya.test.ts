/**
 * Manifestten (BHI1) kurulan dünya == JSON fikstüründen kurulan dünya (G3b): aynı durumOzeti, aynı komut sonuçları, aynı KARE çıktısı (protokol), gerçek
 * `@bolge/veri` kod çözücüsüyle. Veri bellekte üretilir ve geçici dizine yazılır (depoya ikili dosya girmez). Büyük (> 50 bin hücre) ilçede hücre dizisinin
 * açılmadığı (K3 getter) ve kare hesabının dizin üzerinden gittiği de gösterilir.
 */
import { afterEach, describe, expect, it } from "vitest";
import { SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import type { CekirdekVeriPaketi } from "@bolge/cekirdek";
import { Bit, arsaSinifi, engelAdi, ilceSeviyesiTuret, ilceSinifiTuret } from "@bolge/veri";
import type { Izgara, ParselFiksturu, ParselHucreTanimi, ParselIlceTanimi } from "@bolge/veri";
import { ilceIlgisiKur, ilgiAlaniKur, ilgiKaresiCikar } from "@bolge/protokol";
import { hiyerarsiCoz, izgaraGirdisiKur, izgaraManifestiOku, izgaralariYukle, izgarayiVeriyeBagla, varsayilanIzgaraBagimliliklari } from "../src/izgara/manifest";
import { izgaraDizini, zenginDurum } from "./izgara-yardimci";
import type { IzgaraDizini, TestIlcesi } from "./izgara-yardimci";
import { mulkVerisi } from "./yardimci";

const ILCELER: TestIlcesi[] = [
  // Manifest ilçeleri kimliğe göre sıralıdır.
  { kimlik: "sn_m_liman_merkez", ad: "Liman Merkez", il: "sn_m_liman", x0: 90, y0: 95, genislik: 68, yukseklik: 60, tohum: 2, nufus: 183_077 },
  { kimlik: "sn_m_ova_merkez", ad: "Ova Merkez", il: "sn_m_ova", x0: 900_000, y0: 905_000, genislik: 60, yukseklik: 56, tohum: 1 },
];
const HIYERARSI = {
  bolgeler: [
    { kimlik: "m_ova", iller: [{ kimlik: "sn_m_ova", ad: "Ova", ilceler: [{ kimlik: "sn_m_ova_merkez", ad: "Ova Merkez" }] }] },
    { kimlik: "m_liman", iller: [{ kimlik: "sn_m_liman", ad: "Liman", ilceler: [{ kimlik: "sn_m_liman_merkez", ad: "Liman Merkez" }] }] },
  ],
};

/** Izgaradan JSON fikstür ilçesi (satır öncelikli; engel su > askeri > yol; K3 test yardımcısıyla aynı eşleme). */
function izgaradanIlce(id: string, ad: string, il: string, bolge: string, ig: Izgara, nufus?: number): ParselIlceTanimi {
  const hucreler: ParselHucreTanimi[] = [];
  let uygun = 0;
  for (let dy = 0; dy < ig.yukseklik; dy++) {
    for (let dx = 0; dx < ig.genislik; dx++) {
      const d = ig.durum[dy * ig.genislik + dx] as number;
      if (!(d & Bit.ICERIDE)) continue;
      const hid = `${ig.x0 + dx}:${ig.y0 + dy}`;
      const engel = engelAdi(d);
      if (engel !== undefined) hucreler.push({ id: hid, sinif: arsaSinifi(d), uygun: false, engel });
      else {
        uygun++;
        hucreler.push({ id: hid, sinif: arsaSinifi(d), uygun: true });
      }
    }
  }
  const sinif = ilceSinifiTuret(ig);
  return { id, ad, il, bolge, sinif, seviye: ilceSeviyesiTuret(sinif), hucreSayisi: hucreler.length, uygunHucre: uygun, hucreler, ...(nufus !== undefined ? { nufus } : {}) };
}

let d: IzgaraDizini | null = null;
afterEach(async () => {
  await d?.temizle();
  d = null;
});

/** İki veri paketi: manifestten (gerçek çözücü) ve aynı ızgaralardan JSON fikstürü. */
async function iki(): Promise<{ izgara: CekirdekVeriPaketi; json: CekirdekVeriPaketi; ilceSayisi: number }> {
  d = await izgaraDizini(ILCELER, (c) => zenginDurum(c.genislik, c.yukseklik, c.tohum));
  const yuklenen = izgaralariYukle(izgaraManifestiOku(d.manifestYolu), d.kok, varsayilanIzgaraBagimliliklari);
  const baz = mulkVerisi();
  const girdi = izgaraGirdisiKur(yuklenen, { ad: "izgara-manifest", harita: "mini-6", hiyerarsi: hiyerarsiCoz(HIYERARSI), haritaBolgeleri: new Set(baz.harita.bolgeler.map((b) => b.id)) });
  const izgara = mulkVerisi();
  delete izgara.parsel;
  izgarayiVeriyeBagla(izgara, girdi);
  const json = mulkVerisi();
  const fikstur: ParselFiksturu = {
    surum: 1,
    ad: girdi.ad,
    harita: girdi.harita,
    tohum: girdi.tohum,
    zoom: 20,
    iller: girdi.iller.map((il) => ({ ...il })),
    ilceler: girdi.ilceler.map((c) => izgaradanIlce(c.id, c.ad, c.il, c.bolge, c.izgara, c.nufus)),
  };
  json.parsel = fikstur;
  return { izgara, json, ilceSayisi: girdi.ilceler.length };
}

const kare = (sim: Simulasyon, oyuncu: string | null, ilceler: string[]) =>
  ilgiKaresiCikar(sim, ilgiAlaniKur(sim, [], oyuncu), oyuncu, ilceIlgisiKur(sim, ilceler, oyuncu), { ayrilmisListesi: true, kamuListesi: true });

describe("manifestten kurulan dünya == JSON fikstüründen kurulan dünya (gerçek BHI1 çözücüsü)", () => {
  it("aynı durumOzeti, aynı komut sonuçları (katılım, parsel_al, yapı, bırakma) ve aynı kare çıktısı (herkese ve oyuncuya; ayrılmış liste ve kamu listesi dahil)", async () => {
    const v = await iki();
    const a = Simulasyon.olustur(v.izgara, 3);
    const b = Simulasyon.olustur(v.json, 3);
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    const ilceler = ILCELER.map((c) => c.kimlik);
    expect(kare(a, null, ilceler)).toEqual(kare(b, null, ilceler));

    const ilce0 = ILCELER[1]?.kimlik as string;
    const ayrilmis = (sim: Simulasyon, ilce: string): string[] => [...((sim.ic.mulk?.dizin.ayrilmisListe(ilce) ?? []) as readonly string[])];
    expect(ayrilmis(a, ilce0)).toEqual(ayrilmis(b, ilce0));
    expect(ayrilmis(a, ilce0).length).toBeGreaterThan(0);

    const ilce = ILCELER[1]?.kimlik as string;
    const komutlar = [
      { t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil" as const, oyuncu: "ali", bolgeler: [], ilce } },
      { t: 3_600_000, oyuncu: "ali", komut: { tur: "parsel_al" as const, ilce, hucreler: ayrilmis(a, ilce).slice(0, 2), sinif: "kirsal" as const } },
    ];
    for (const k of komutlar) {
      const ra = a.uygula(k);
      const rb = b.uygula(k);
      expect(ra, JSON.stringify(k)).toEqual(rb);
    }
    expect(a.durumOzeti()).toBe(b.durumOzeti());
    for (const o of [null, "ali"] as const) expect(kare(a, o, ilceler), `kare ${o}`).toEqual(kare(b, o, ilceler));
    const ka = kare(a, "ali", ilceler);
    expect(ka.ilceler?.find((c) => c.id === ilce)?.ayrilmis?.length).toBeGreaterThan(0);
    expect(ka.ilceler?.find((c) => c.id === ilce)?.satilmisHucre).toBeGreaterThan(0);
  });

  it("izgara dünyasında kare hesabı ilçe hücre dizisini AÇMAZ (sıcak yol dizin üzerinden); getter büyük ilçede hata atar, kare etkilenmez", async () => {
    const v = await iki();
    const sim = Simulasyon.olustur(v.izgara, 3);
    const mk = sim.ic.mulk as unknown as { ilceler: Map<string, object> };
    for (const t of mk.ilceler.values()) Object.defineProperty(t, "hucreler", { get: () => { throw new Error("hucre dizisi acilmamali"); } });
    const k = kare(sim, null, ILCELER.map((c) => c.kimlik));
    expect(k.ilceler?.[0]?.ayrilmis?.length).toBeGreaterThan(0);
    expect(k.ilceler?.[0]?.satilmisHucre).toBe(0);
  });
});
