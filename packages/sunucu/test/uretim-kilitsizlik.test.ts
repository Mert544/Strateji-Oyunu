/**
 * ÜRETİM yapılandırması, gerçek arsa ızgarası (Gebze, Gemlik, Körfez; WS düzeyi): KİLİTSİZLİK ilçe başına (K7). Açık yapı kümesi (teknoloji kilidi) üç ilçede AYNIDIR ve ilçeye bağlı ret yalnız FİZİKSELDİR
 * (il etiketi, rezerv; sıra, ilçe seviyesi ya da ilçe şartı YOK):
 *  - çiftlik üç ilçede de yurtlu katılımla kurulur (WS `tesis_insa_hucre`; yurt >= 6 bitişik hücre, `ova` etiketi);
 *  - her inşa edilebilir tesis türü ve ek yapı, oyuncunun KENDİ yurt hücrelerinde dünyanın bağımsız kopyasında denenir (kopya: durum birikmez); her ret üç sınıftan biridir: fiziksel (etiket/rezerv),
 *    kaynak (oyuncu stoğu/hazinesi: ilçeden bağımsız) ya da teknoloji kilidi (`acik degil`: üç ilçede AYNI tür kümesi); başka ret nedeni YOKTUR;
 *  - fiziksel ret, düğümün gerçek etiketi/rezervinden TÜRETİLEN beklentiyle birebir uyuşur (etiket yoksa ret, varsa ret yok).
 */
import { afterEach, describe, expect, it } from "vitest";
import { hucreXY } from "@bolge/cekirdek";
import type { BolgeDurumu, Komut } from "@bolge/cekirdek";
import { testSunucusu } from "./yardimci";
import type { TestSunucusu } from "./yardimci";
import { ILCELER, MANIFEST_VAR, ilceyeKatil, uretimVerisi } from "./uretim-yardimci";

let ts: TestSunucusu | null = null;
afterEach(async () => {
  await ts?.kapat();
  ts = null;
});

type Sinif = "tamam" | "fiziksel" | "kaynak" | "kilit" | `diger: ${string}`;
function sinifla(hata: string | undefined): Sinif {
  if (hata === undefined) return "tamam";
  if (/^il etiketi yetersiz: |^gerekli rezerv yok: /.test(hata)) return "fiziksel";
  if (/^yetersiz stok|^yetersiz hazine|^ayni anda en cok/.test(hata)) return "kaynak";
  if (/^tesis turu acik degil: |^yontem acik degil: /.test(hata)) return "kilit";
  return `diger: ${hata}`;
}

/** `hucreler` içinde `adet` hücrelik kenar-bitişik bir küme (BFS); yoksa hata. */
function bitisikKume(hucreler: string[], adet: number): string[] {
  const xy = new Map(hucreler.map((h) => [h, hucreXY(h)] as const));
  const komsu = (a: string, b: string): boolean => {
    const [ax, ay] = xy.get(a) as readonly [number, number];
    const [bx, by] = xy.get(b) as readonly [number, number];
    return Math.abs(ax - bx) + Math.abs(ay - by) === 1;
  };
  for (const bas of hucreler) {
    const kume = [bas];
    for (let i = 0; i < kume.length && kume.length < adet; i++) for (const h of hucreler) if (!kume.includes(h) && komsu(kume[i] as string, h) && kume.length < adet) kume.push(h);
    if (kume.length === adet) return kume;
  }
  throw new Error(`yurtta ${adet} bitisik hucre yok`);
}

describe.skipIf(!MANIFEST_VAR)("üretim yapılandırması: kilitsizlik ilçe başına (WS)", () => {
  it("K7: çiftlik 3/3 yurtlu; her yapı denemesinin reddi yalnız fiziksel / kaynak / teknoloji kilidi; kilit kümesi üç ilçede aynı; fiziksel ret düğümün gerçek etiket ve rezervine uyar", async () => {
    const veri = uretimVerisi();
    ts = await testSunucusu({ veri });
    const sim = ts.yazar.sim;
    const tablo: Record<string, Record<string, Sinif>> = {};
    for (const ilce of ILCELER) {
      const oyuncu = `kilit_${ilce}`;
      const { ist } = await ilceyeKatil(ts, oyuncu, ilce);
      sim.calistirKadar(sim.dunya.zaman);
      const yurt = sim.dunya.mulk!.hucreler.filter((h) => h.sahip === oyuncu).map((h) => h.id);
      expect(yurt.length, `${ilce}: yurt`).toBeGreaterThanOrEqual(6);
      const isl = sim.dunya.mulk!.isletmeler.find((x) => x.oyuncu === oyuncu)!;
      const dugum = sim.dunya.bolgeler[isl.bolgeIndeksi] as BolgeDurumu;
      expect(dugum.etiketler, `${ilce}: il etiketi`).toContain("ova"); // çiftlik `ova` ister (il bazlı; Kocaeli ve Bursa)
      // ÇİFTLİK: WS ile gerçek kurulum (yurtlu katılım, yurt hücrelerinde)
      const ciftlikHucre = bitisikKume(yurt, 2);
      const r = await ist.komut(`ciftlik-${ilce}`, { tur: "tesis_insa_hucre", ilce, tesisTuru: "ciftlik", hucreler: ciftlikHucre });
      expect(r.tur, ilce).toBe("komutSonucu");
      expect(r.tur === "komutSonucu" && r.sonuc.tamam, `${ilce}: çiftlik kurulamadı: ${JSON.stringify(r)}`).toBe(true);
      // Diğer yapı denemeleri: kopyada (kuruldu çiftlik dahil bir kopya; durum birikmez)
      const sonuc: Record<string, Sinif> = {};
      const merkezRezerv = (m: number): number => (dugum.rezervKalan[m] as number) ?? 0;
      for (const t of sim.ic.tesisTurleri) {
        if (t.id === "ciftlik") continue;
        const yuva = sim.ic.mulk!.yuva[sim.ic.tesisTuruIndeks[t.id] as number] as number;
        if (!(yuva > 0)) continue; // mülk kipinde inşa edilemeyen tür
        const kopya = sim.klonla();
        const hucre = bitisikKume(yurt.filter((h) => !ciftlikHucre.includes(h)).length >= yuva ? yurt.filter((h) => !ciftlikHucre.includes(h)) : yurt, yuva);
        const komut = { tur: "tesis_insa_hucre", ilce, tesisTuru: t.id, hucreler: hucre } as Komut;
        const k = kopya.uygula({ t: kopya.dunya.zaman, oyuncu, komut });
        const sinif = sinifla(k.tamam ? undefined : k.hata);
        sonuc[t.id] = sinif;
        expect(sinif.startsWith("diger"), `${ilce}/${t.id}: beklenmeyen ret nedeni: ${k.tamam ? "" : k.hata}`).toBe(false);
        // fiziksel ret düğümün gerçek durumundan türetilir
        if (!k.tamam && sinif === "fiziksel") {
          if (k.hata.startsWith("il etiketi yetersiz: ")) expect(dugum.etiketler.includes(t.gerekliEtiket as never), `${ilce}/${t.id}: etiket zaten var`).toBe(false);
          else {
            const ri = t.gerekliRezerv === undefined ? -1 : (sim.ic.malIndeks[t.gerekliRezerv] as number);
            expect(merkezRezerv(ri), `${ilce}/${t.id}: rezerv zaten var`).toBeLessThanOrEqual(0);
          }
        }
      }
      // Ek yapılar (ambar, konut, garaj, atölye, ticaret ofisi, dükkân; muhtarlık kamu yapısı: oyuncuya kapalı): ilçe şartı yok, ret yalnız kaynak ya da kamu kapalılığı
      for (const e of sim.ic.mulk!.ekYapilar) {
        const kopya = sim.klonla();
        const ek = e.id === "dukkan" ? { dukkanTuru: "bakkal" } : {};
        const komut = { tur: "tesis_insa_hucre", ilce, tesisTuru: e.id, hucreler: bitisikKume(yurt.filter((h) => !ciftlikHucre.includes(h)), e.yuva), ...ek } as Komut;
        const k = kopya.uygula({ t: kopya.dunya.zaman, oyuncu, komut });
        const hata = k.tamam ? undefined : k.hata;
        const sinif: Sinif = e.id === "muhtarlik" ? (hata?.includes("kamu yapisidir") ? "kilit" : `diger: ${hata}`) : sinifla(hata);
        sonuc[`ek:${e.id}`] = sinif;
        expect(sinif === "tamam" || sinif === "kaynak" || (e.id === "muhtarlik" && sinif === "kilit"), `${ilce}/ek:${e.id}: ${hata}`).toBe(true);
      }
      tablo[ilce] = sonuc;
    }
    // teknoloji kilidi kümesi üç ilçede AYNI (ilçe/seviye/sıra şartı yok); sınıf farkı yalnız fiziksel olabilir
    const kilit = (ilce: string): string => Object.entries(tablo[ilce] as Record<string, Sinif>).filter(([, s]) => s === "kilit").map(([t]) => t).sort().join(",");
    expect(kilit(ILCELER[1])).toBe(kilit(ILCELER[0]));
    expect(kilit(ILCELER[2])).toBe(kilit(ILCELER[0]));
    const turler = Object.keys(tablo[ILCELER[0]] as object);
    expect(turler.length).toBeGreaterThan(3);
    for (const t of turler) {
      for (const ilce of ILCELER) {
        const a = (tablo[ILCELER[0]] as Record<string, Sinif>)[t] as Sinif;
        const b = (tablo[ilce] as Record<string, Sinif>)[t] as Sinif;
        // ilçeler arası fark: biri fiziksel ret ise öteki fiziksel olmayabilir; ikisi de fiziksel değilse sınıf AYNI olmalı
        if (a !== "fiziksel" && b !== "fiziksel") expect(b, `${t}: ${ILCELER[0]} ${a} / ${ilce} ${b}`).toBe(a);
      }
    }
    console.log(`K7 yapı denemesi tablosu: ${JSON.stringify(tablo)}`);
  }, 300_000);
});
