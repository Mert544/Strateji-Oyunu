/**
 * Repodaki OSM (ODbL) il/ilçe çıktılarının yapı, eşleme ve boyut testleri
 * (packages/veri/haritalar/odbl/). Ağ/önbellek gerekmez.
 */
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { neighbors } from "topojson-client";
import type { Topology } from "topojson-specification";

/** TopoJSON geometri koleksiyonu (yalnız kullanılan alanlar). */
interface Koleksiyon {
  type: "GeometryCollection";
  geometries: Array<{ type: string; properties: { kimlik: string; ebeveyn: string } }>;
}
import { HIYERARSI_DOSYASI, ILCE_DIZINI, ILLER_DOSYASI, KIMLIK_BICIMI, ODBL_DIZINI, ODBL_LISANSI } from "../src/osm/ortak";
import { osmYapilandirmaOku } from "../src/osm/yapilandirma";
import { yapilandirmaOku } from "../src/yapilandirma";

interface Birim {
  kimlik: string;
  ad: string;
  ebeveyn: string;
  osm: number;
  merkez: { enlemMikro: number; boylamMikro: number };
  alanKm2: number;
}
interface Il extends Birim {
  ulke: string;
  iso: string;
  ne: string;
  ilceler: Birim[];
}
interface Hiyerarsi {
  lisans: string;
  atif: string;
  sayilar: { il: number; ilce: number; ulkeler: Record<string, { il: number; ilce: number }> };
  bolgeler: Array<{ kimlik: string; ad: string; iller: Il[] }>;
}

/** Boyut sınırları (bayt). İlçe dosyası hedefi 20-60 KB (ortalama); çok ilçeli/adalı tek tük il için tek dosya üst sınırı 100 KB. */
const BOYUT = { illerEnFazla: 600 * 1024, ilceEnFazla: 100 * 1024, ilceOrtalamaEnFazla: 60 * 1024 };

const yap = yapilandirmaOku();
const osm = osmYapilandirmaOku();
const h = JSON.parse(readFileSync(resolve(ODBL_DIZINI, HIYERARSI_DOSYASI), "utf8")) as Hiyerarsi;
const iller = h.bolgeler.flatMap((b) => b.iller);
const ilceler = iller.flatMap((il) => il.ilceler);
const bolgeAdmin1 = new Map(yap.bolgeler.map((b) => [b.id, b.admin1.map((a) => a.split(" ")[0] as string)]));

describe("OSM il/ilce hiyerarsisi", () => {
  it("lisans ve atif", () => {
    expect(h.lisans).toBe(ODBL_LISANSI);
    expect(h.atif).toContain("OpenStreetMap");
  });

  it("Turkiye: 81 il ve ilce sayisi beklenen aralikta", () => {
    const tr = iller.filter((il) => il.ulke === "tr");
    expect(tr.length).toBe(81);
    const plakalar = new Set(tr.map((il) => il.iso));
    for (let i = 1; i <= 81; i++) expect(plakalar.has(`TR-${String(i).padStart(2, "0")}`), `TR-${i}`).toBe(true);
    const n = tr.reduce((s, il) => s + il.ilceler.length, 0);
    expect(n).toBeGreaterThanOrEqual(960);
    expect(n).toBeLessThanOrEqual(990);
  });

  it("her ulke yapilandirmadaki beklenen il/ilce araliginda", () => {
    for (const [kod, s] of Object.entries(h.sayilar.ulkeler)) {
      const u = osm.ulkeler.find((x) => x.kod === kod)!;
      expect(s.il, kod).toBeGreaterThanOrEqual(u.beklenenIl[0]);
      expect(s.il, kod).toBeLessThanOrEqual(u.beklenenIl[1]);
      expect(s.ilce, kod).toBeGreaterThanOrEqual(u.beklenenIlce[0]);
      expect(s.ilce, kod).toBeLessThanOrEqual(u.beklenenIlce[1]);
    }
    expect(h.sayilar.il).toBe(iller.length);
    expect(h.sayilar.ilce).toBe(ilceler.length);
  });

  it("kimlikler ASCII, benzersiz; ilce kimligi il kimligiyle baslar", () => {
    const hepsi = [...h.bolgeler.map((b) => b.kimlik), ...iller.map((x) => x.kimlik), ...ilceler.map((x) => x.kimlik)];
    for (const k of hepsi) expect(k).toMatch(KIMLIK_BICIMI);
    expect(new Set(hepsi).size).toBe(hepsi.length);
    for (const il of iller) for (const c of il.ilceler) expect(c.kimlik.startsWith(`${il.kimlik}_`), c.kimlik).toBe(true);
  });

  it("her ilcenin ebeveyni bir il; her ilin en az bir ilcesi var", () => {
    const ilKimlik = new Set(iller.map((il) => il.kimlik));
    for (const il of iller) {
      expect(il.ilceler.length, il.kimlik).toBeGreaterThan(0);
      for (const c of il.ilceler) {
        expect(c.ebeveyn).toBe(il.kimlik);
        expect(ilKimlik.has(c.ebeveyn)).toBe(true);
      }
    }
  });

  it("her il tam olarak bir oyun bolgesine eslenir ve NE admin-1 kodu o bolgenin listesindedir", () => {
    const bolgeler = new Set(yap.bolgeler.map((b) => b.id));
    const gorulen = new Map<string, number>();
    for (const b of h.bolgeler) {
      expect(bolgeler.has(b.kimlik), b.kimlik).toBe(true);
      for (const il of b.iller) {
        expect(il.ebeveyn).toBe(b.kimlik);
        gorulen.set(il.kimlik, (gorulen.get(il.kimlik) ?? 0) + 1);
        const liste = bolgeAdmin1.get(b.kimlik)!;
        // ULKE:XXX seçicili bölgeler (Sırbistan vb.) bu ülkelerde yok; doğrudan kod listesi beklenir
        expect(liste.includes(il.ne), `${il.kimlik} (${il.ne}) -> ${b.kimlik}`).toBe(true);
      }
    }
    for (const [k, n] of gorulen) expect(n, k).toBe(1);
    // NE admin-1 kodları tekil: iki il aynı admin-1'e düşmez
    const ne = iller.map((il) => il.ne);
    expect(new Set(ne).size).toBe(ne.length);
  });

  it("Turkiye'nin tum oyun bolgeleri il kapsar ve her TUR admin-1 kodu tam bir ile karsilik gelir", () => {
    const ilNe = new Set(iller.map((il) => il.ne));
    for (const b of yap.bolgeler) {
      for (const kod of bolgeAdmin1.get(b.id)!) if (kod.startsWith("TUR-")) expect(ilNe.has(kod), `${b.id}: ${kod}`).toBe(true);
    }
  });

  it("alan ve merkez makul: ilce alanlari toplami il alanina yakin, merkez Turkiye kutusunda", () => {
    for (const il of iller) {
      const t = il.ilceler.reduce((s, c) => s + c.alanKm2, 0);
      expect(Math.abs(t - il.alanKm2) / il.alanKm2, il.kimlik).toBeLessThan(0.02);
      expect(Number.isInteger(il.merkez.enlemMikro) && Number.isInteger(il.merkez.boylamMikro)).toBe(true);
    }
    for (const il of iller.filter((x) => x.ulke === "tr")) {
      expect(il.merkez.enlemMikro).toBeGreaterThan(35_800_000);
      expect(il.merkez.enlemMikro).toBeLessThan(42_200_000);
      expect(il.merkez.boylamMikro).toBeGreaterThan(25_600_000);
      expect(il.merkez.boylamMikro).toBeLessThan(44_900_000);
    }
    const tr = iller.filter((x) => x.ulke === "tr").reduce((s, il) => s + il.alanKm2, 0);
    // Türkiye kara alanı ~783 600 km² (sınırlar kıyıyı izler; büyük göller dahil)
    expect(tr).toBeGreaterThan(760_000);
    expect(tr).toBeLessThan(800_000);
  });
});

describe("OSM TopoJSON ciktilari", () => {
  const illerYolu = resolve(ODBL_DIZINI, ILLER_DOSYASI);
  const illerTopo = JSON.parse(readFileSync(illerYolu, "utf8")) as Topology & { lisans: string; atif: string };

  it("iller.topo.json: tum iller, lisans damgasi, boyut siniri", () => {
    expect(illerTopo.lisans).toBe(ODBL_LISANSI);
    expect(illerTopo.atif).toContain("OpenStreetMap");
    const geo = (illerTopo.objects["iller"] as unknown as Koleksiyon).geometries;
    expect(geo.map((g) => g.properties.kimlik).sort()).toEqual(iller.map((il) => il.kimlik).sort());
    expect(statSync(illerYolu).size).toBeLessThanOrEqual(BOYUT.illerEnFazla);
  });

  it("iller ortak yaylari paylasir: Turkiye'nin 81 ili tek bagli komsuluk bileseni (bosluksuz topoloji)", () => {
    const nesne = illerTopo.objects["iller"] as unknown as Koleksiyon;
    const komsu = neighbors(nesne.geometries as never);
    const kimlik = nesne.geometries.map((g) => g.properties.kimlik);
    const tr = kimlik.map((k, i) => (k.startsWith("tr_") ? i : -1)).filter((i) => i >= 0);
    const goruldu = new Set<number>([tr[0]!]);
    const yigin = [tr[0]!];
    while (yigin.length > 0) {
      const i = yigin.pop()!;
      for (const j of komsu[i] ?? []) {
        if (!goruldu.has(j) && kimlik[j]!.startsWith("tr_")) {
          goruldu.add(j);
          yigin.push(j);
        }
      }
    }
    expect(goruldu.size).toBe(81);
  });

  it("il basina ilce dosyasi: kimlik kumesi hiyerarsiyle ayni, boyut sinirlari", () => {
    const dosyalar = readdirSync(ILCE_DIZINI).filter((d) => d.endsWith(".topo.json")).sort();
    expect(dosyalar).toEqual(iller.map((il) => `${il.kimlik}.topo.json`).sort());
    let toplam = 0;
    for (const il of iller) {
      const yol = resolve(ILCE_DIZINI, `${il.kimlik}.topo.json`);
      expect(existsSync(yol)).toBe(true);
      const t = JSON.parse(readFileSync(yol, "utf8")) as Topology & { lisans: string };
      expect(t.lisans).toBe(ODBL_LISANSI);
      const geo = (t.objects["ilceler"] as unknown as Koleksiyon).geometries;
      expect(geo.map((g) => g.properties.kimlik).sort(), il.kimlik).toEqual(il.ilceler.map((c) => c.kimlik).sort());
      for (const g of geo) expect(g.properties.ebeveyn).toBe(il.kimlik);
      const boyut = statSync(yol).size;
      toplam += boyut;
      expect(boyut, il.kimlik).toBeLessThanOrEqual(BOYUT.ilceEnFazla);
    }
    expect(toplam / iller.length).toBeLessThanOrEqual(BOYUT.ilceOrtalamaEnFazla);
  });
});
