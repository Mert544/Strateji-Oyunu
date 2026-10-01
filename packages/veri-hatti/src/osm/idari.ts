/**
 * OSM il/ilçe hattı orkestrasyonu: Overpass önbelleği -> halka kurma -> il/ilçe ağacı ve bölge eşlemesi ->
 * mapshaper sadeleştirme -> packages/veri/haritalar/odbl/{iller.topo.json, ilceler/<il>.topo.json, hiyerarsi.json,
 * osm-raporu.json}. Aynı önbellek + yapılandırma -> bayt bayt aynı çıktı (saat/rastgelelik yok).
 */
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { yapilandirmaOku } from "../yapilandirma";
import { overpassAyristir } from "./halka";
import { ilKaralariniUygula, neBolgeEslemesi, ulkeHiyerarsisi, type EslemeRaporu, type IdariBirim, type Il } from "./hiyerarsi";
import { osmKaynaklariniHazirla, osmOnbellekYolu, type OsmKaynakOzetleri } from "./indir";
import { HIYERARSI_DOSYASI, ILCE_DIZINI, ILLER_DOSYASI, ODBL_DIZINI, ODBL_LISANSI, OSM_ATIF, OSM_ATIF_UZUN } from "./ortak";
import { ilceleriBirlestir, ilcelerTopo, illerTopo, ILCE_SADELESTIRME_M, IL_SADELESTIRME_M, NICEMLEME } from "./topoloji";
import { osmYapilandirmaOku } from "./yapilandirma";

export const RAPOR_DOSYASI = "osm-raporu.json";

export interface IdariSecenek {
  kilitle?: boolean;
  sessiz?: boolean;
  /** Yalnızca bu ülkeler (varsayılan: önbellekte/kilitte olan tüm yapılandırılmış ülkeler). */
  ulkeler?: readonly string[];
  /** Önbellekte olmayan ülkeyi indirmeden atla (testler). */
  indirme?: boolean;
}

export interface IdariSonuc {
  hiyerarsiMetni: string;
  illerMetni: string;
  /** il kimliği -> TopoJSON metni */
  ilceMetinleri: Map<string, string>;
  raporMetni: string;
  iller: Il[];
  raporlar: EslemeRaporu[];
}

const yuvarla1 = (x: number): number => Math.round(x * 10) / 10;

function birimKaydi(b: IdariBirim): Record<string, unknown> {
  const k: Record<string, unknown> = { kimlik: b.kimlik, ad: b.ad };
  if (b.yerelAd !== undefined) k["yerelAd"] = b.yerelAd;
  if (b.latinAd !== undefined) k["latinAd"] = b.latinAd;
  k["ebeveyn"] = b.ebeveyn;
  k["osm"] = b.osm;
  k["merkez"] = b.merkez;
  k["alanKm2"] = b.alanKm2;
  return k;
}

export async function idariHatCalistir(secenek: IdariSecenek = {}): Promise<IdariSonuc> {
  const gunluk = (m: string): void => {
    if (secenek.sessiz !== true) console.log(m);
  };
  const osmYap = osmYapilandirmaOku();
  const yap = yapilandirmaOku();
  const ulkeler = osmYap.ulkeler.filter(
    (u) =>
      (secenek.ulkeler === undefined || secenek.ulkeler.length === 0 || secenek.ulkeler.includes(u.kod)) &&
      (secenek.indirme !== false || existsSync(osmOnbellekYolu(u))),
  );
  if (ulkeler.length === 0) throw new Error("Islenecek ulke yok (onbellek bos ve indirme kapali)");

  gunluk("[1/4] OSM kaynaklari (Overpass, onbellekli, sha256 kilitli)");
  const ozetler: OsmKaynakOzetleri = await osmKaynaklariniHazirla(osmYap, {
    kilitle: secenek.kilitle === true,
    ulkeler: ulkeler.map((u) => u.kod),
    gunluk,
  });

  gunluk("[2/4] halkalar, il/ilce agaci, bolge eslemesi");
  const { neBolge, neBirimleri } = neBolgeEslemesi(yap);
  const iller: Il[] = [];
  const raporlar: EslemeRaporu[] = [];
  for (const u of ulkeler) {
    const veri = overpassAyristir(readFileSync(osmOnbellekYolu(u), "utf8"));
    const s = ulkeHiyerarsisi(u, veri, osmYap, neBolge, neBirimleri);
    gunluk(`  ${u.ad}: ${s.rapor.ilSayisi} il, ${s.rapor.ilceSayisi} ilce`);
    iller.push(...s.iller);
    raporlar.push(s.rapor);
  }
  const bolgeSirasi = new Map(yap.bolgeler.map((b, i) => [b.id, i]));
  for (const il of iller) if (!bolgeSirasi.has(il.ebeveyn)) throw new Error(`il ${il.kimlik}: bilinmeyen bolge "${il.ebeveyn}"`);

  gunluk(`[3/4] il kara cokgenleri (ilce birlesimi) ve mapshaper sadelestirme (il ${IL_SADELESTIRME_M} m, ilce ${ILCE_SADELESTIRME_M} m)`);
  const ilceGirdileri = iller.flatMap((il) => il.ilceler.map((c) => ({ kimlik: c.kimlik, ad: c.ad, ebeveyn: c.ebeveyn, cokgenler: c.cokgenler })));
  ilKaralariniUygula(iller, await ilceleriBirlestir(ilceGirdileri), neBirimleri, raporlar);
  const illerMetni = await illerTopo(iller.map((il) => ({ kimlik: il.kimlik, ad: il.ad, ebeveyn: il.ebeveyn, cokgenler: il.cokgenler })));
  const ilceMetinleri = await ilcelerTopo(ilceGirdileri);

  gunluk("[4/4] hiyerarsi ve rapor");
  const bolgeler = yap.bolgeler
    .map((b) => {
      const bIller = iller.filter((il) => il.ebeveyn === b.id);
      return {
        kimlik: b.id,
        ad: b.ad,
        devlet: b.devlet,
        alanKm2: yuvarla1(bIller.reduce((s, il) => s + il.alanKm2, 0)),
        iller: bIller.map((il) => ({
          ...birimKaydi(il),
          ulke: il.ulke,
          iso: il.iso,
          ne: il.ne,
          ilceler: il.ilceler.map(birimKaydi),
        })),
      };
    })
    .filter((b) => b.iller.length > 0);
  const kaynak: Record<string, { osmZamani: string; sha256: string; bayt: number }> = {};
  for (const u of ulkeler) {
    const o = ozetler[u.kod]!;
    kaynak[u.kod] = { osmZamani: o.osmZamani, sha256: o.sha256, bayt: o.bayt };
  }
  const hiyerarsi = {
    surum: 1,
    lisans: ODBL_LISANSI,
    atif: OSM_ATIF,
    aciklama: `${OSM_ATIF_UZUN}. Bölge düzeyi oyun tasarımıdır (karadeniz.json); il/ilçe sınırları ve adları OpenStreetMap'ten türetilmiştir.`,
    kaynak: { ad: "OpenStreetMap (Overpass API)", ulkeler: kaynak },
    sayilar: {
      bolge: bolgeler.length,
      il: iller.length,
      ilce: iller.reduce((s, il) => s + il.ilceler.length, 0),
      ulkeler: Object.fromEntries(raporlar.map((r) => [r.ulke, { il: r.ilSayisi, ilce: r.ilceSayisi }])),
    },
    kapsamDisiBolgeler: yap.bolgeler.filter((b) => !bolgeler.some((x) => x.kimlik === b.id)).map((b) => b.id),
    bolgeler,
  };
  const hiyerarsiMetni = `${JSON.stringify(hiyerarsi, null, 1)}\n`;

  const boyutlar = [...ilceMetinleri.values()].map((m) => Buffer.byteLength(m));
  const rapor = {
    surum: 1,
    lisans: ODBL_LISANSI,
    atif: OSM_ATIF,
    sadelestirme: { ilMetre: IL_SADELESTIRME_M, ilceMetre: ILCE_SADELESTIRME_M, nicemleme: NICEMLEME },
    boyutlar: {
      illerBayt: Buffer.byteLength(illerMetni),
      hiyerarsiBayt: Buffer.byteLength(hiyerarsiMetni),
      ilceDosyaSayisi: boyutlar.length,
      ilceEnKucukBayt: Math.min(...boyutlar),
      ilceEnBuyukBayt: Math.max(...boyutlar),
      ilceOrtalamaBayt: Math.round(boyutlar.reduce((s, x) => s + x, 0) / boyutlar.length),
      ilceToplamBayt: boyutlar.reduce((s, x) => s + x, 0),
    },
    ulkeler: raporlar,
  };
  const raporMetni = `${JSON.stringify(rapor, null, 1)}\n`;
  return { hiyerarsiMetni, illerMetni, ilceMetinleri, raporMetni, iller, raporlar };
}

/** Çıktıları odbl/ klasörüne yazar; artık üretilmeyen ilçe dosyalarını siler. Yazılan yolları döndürür. */
export function idariCiktilariYaz(s: IdariSonuc): string[] {
  mkdirSync(ILCE_DIZINI, { recursive: true });
  const yollar: string[] = [];
  const yaz = (yol: string, m: string): void => {
    writeFileSync(yol, m, "utf8");
    yollar.push(yol);
  };
  yaz(resolve(ODBL_DIZINI, ILLER_DOSYASI), s.illerMetni);
  yaz(resolve(ODBL_DIZINI, HIYERARSI_DOSYASI), s.hiyerarsiMetni);
  yaz(resolve(ODBL_DIZINI, RAPOR_DOSYASI), s.raporMetni);
  const beklenen = new Set<string>();
  for (const [il, m] of s.ilceMetinleri) {
    beklenen.add(`${il}.topo.json`);
    yaz(resolve(ILCE_DIZINI, `${il}.topo.json`), m);
  }
  for (const d of readdirSync(ILCE_DIZINI)) if (d.endsWith(".topo.json") && !beklenen.has(d)) rmSync(resolve(ILCE_DIZINI, d));
  return yollar;
}
