/**
 * Hat orkestrasyonu: indir -> birleştir/sadeleştir -> komşuluk -> boğaz/geçit -> limanlar/deniz -> nüfus ->
 * rezervler/tesisler -> konum -> HaritaDosyasi + TopoJSON + rapor. Deterministiktir (aynı girdi -> aynı çıktı).
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { dogrulaVeriPaketi, varsayilanVeriyiYukle } from "@bolge/veri";
import type { BolgeTanimi, Etiket, HaritaDosyasi, KenarTanimi } from "@bolge/veri";
import { birlestir, type Birlesim } from "./birlestir";
import { bolgeMerkezi, cokgenlerinKutusu, haversineKm, type Kutu } from "./cografya";
import { denizKenarlariSec, denizMesafeTablosu, izgaraKur, kiyiBolgeleri, limanlariAta, type KiyiSonucu } from "./deniz";
import { kaynaklariHazirla, type KaynakOzetleri } from "./indir";
import { komsulariBul } from "./komsuluk";
import {
  DENIZ, EN_AZ_ORTAK_SINIR_KM, EN_COK_REZERV_TESISI, EN_COK_TESIS, ETIKET_SIRASI, HAVA, KARA_KURALLARI, MAL_TESIS,
  REZERV_CARPANI, SINIR_DOYGUNLUK_KM, XY_KENAR_BOSLUGU, YOL_EGRILIK_CARPANI, type KaraSinifi,
} from "./kurallar";
import { mrdsOku } from "./mrds";
import { nufusOlcekle, yerlesimleriBolgeyeAta } from "./nufus";
import { MRDS_MALLARI, mrdsKanitlari, type MrdsKaniti } from "./rezerv";
import { admin1Oku, karaCokgenleriOku, limanlariOku, yerlesimleriOku } from "./ulke-verisi";
import { yapilandirmaDogrula, yapilandirmaOku, type Yapilandirma } from "./yapilandirma";
import { HARITA_DIZINI, HARITA_DOSYASI, RAPOR_DIZINI, SINIR_DOSYASI } from "./yollar";

export const ATIF_SATIRLARI: readonly string[] = [
  "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com (kamu malı; sürüm 5.1.2: admin-1, admin-0, ports, populated places).",
  "USGS Mineral Resources Data System (MRDS), U.S. Geological Survey (kamu malı): cevher/bakır rezerv iddialarının doğrulanması.",
  "Bölge sınırları, adları ve devletler oyun tasarımıdır; hiçbir devletin resmî sınır veya egemenlik görüşünü yansıtmaz.",
];

export interface HatRaporu {
  surum: 1;
  kaynaklar: Record<string, { sha256: string; bayt: number }>;
  bolgeSayisi: number;
  kenarSayisi: { kara: number; deniz: number; hava: number };
  kiyiBolgeleri: string[];
  limanlar: Record<string, string[]>;
  elenenLimanlar: Array<{ ad: string; neden: string }>;
  darGecitler: string[];
  kaldirilanKaraKenarlari: string[];
  nufus: Record<string, { gercekToplam: number; yerlesimSayisi: number; enBuyukYerlesimler: string[]; oyunNufusu: number }>;
  mrds: Record<string, Record<string, MrdsKaniti & { iddiaBinBirim: number; muaf: boolean }>>;
  mrdsAdaylari: Array<{ bolge: string; mal: string; icerde: number; yakin: number }>;
}

export interface HatSonucu {
  harita: HaritaDosyasi;
  haritaMetni: string;
  topoMetni: string;
  rapor: HatRaporu;
  raporMetni: string;
}

const kesisimSirali = <T>(d: T[], anahtar: (x: T) => string): T[] => [...d].sort((p, q) => (anahtar(p) < anahtar(q) ? -1 : anahtar(p) > anahtar(q) ? 1 : 0));

function yuvarla(v: number, birim: number): number {
  return Math.round(v / birim) * birim;
}
function kisitla(v: number, alt: number, ust: number): number {
  return Math.min(ust, Math.max(alt, v));
}
const anahtar = (a: string, b: string): string => (a < b ? `${a}|${b}` : `${b}|${a}`);

export interface HatSecenegi {
  /** Kaynak özetlerini kilitler (yeni indirme sonrası). */
  kilitle?: boolean;
  /** İlerleme satırlarını yazmaz (testler). */
  sessiz?: boolean;
}

export async function hatCalistir(secenek: HatSecenegi = {}): Promise<HatSonucu> {
  const gunluk = (m: string): void => {
    if (secenek.sessiz !== true) console.log(m);
  };
  gunluk("[1/9] kaynaklar");
  const ozetler: KaynakOzetleri = await kaynaklariHazirla({ kilitle: secenek.kilitle === true });
  const yap: Yapilandirma = yapilandirmaOku();
  const yapHatalari = yapilandirmaDogrula(yap);
  if (yapHatalari.length > 0) throw new Error(`Yapilandirma hatalari:\n - ${yapHatalari.join("\n - ")}`);

  gunluk("[2/9] admin-1 birlestirme ve sadelestirme (mapshaper)");
  const birlesim: Birlesim = await birlestir(yap, admin1Oku());

  gunluk("[3/9] kara/deniz izgarasi, kiyi ve limanlar");
  const hepsi: Kutu = cokgenlerinKutusu(birlesim.bolgeler.flatMap((b) => b.cokgenler));
  const kutu: Kutu = {
    minB: Math.floor(hepsi.minB - 1.5),
    maxB: Math.ceil(hepsi.maxB + 1.5),
    minE: Math.floor(hepsi.minE - 1.5),
    maxE: Math.ceil(hepsi.maxE + 1.5),
  };
  const izgara = izgaraKur(karaCokgenleriOku(kutu), yap, kutu);
  const kiyiKumesi = kiyiBolgeleri(birlesim.bolgeler, izgara);
  const yerlesimler = yerlesimleriOku();
  const kiyi: KiyiSonucu = limanlariAta(birlesim.bolgeler, kiyiKumesi, izgara, limanlariOku(), yerlesimler, yap);

  gunluk("[4/9] komsuluk ve kara kenarlari");
  const tumKomsular = komsulariBul(birlesim.topoloji);
  const kaldirilan = new Set(yap.kaldirilanKaraKenarlari.map((k) => anahtar(k.a, k.b)));
  const komsular = tumKomsular.filter((k) => k.ortakSinirKm >= EN_AZ_ORTAK_SINIR_KM);
  for (const k of yap.kaldirilanKaraKenarlari) {
    if (!komsular.some((x) => anahtar(x.a, x.b) === anahtar(k.a, k.b))) {
      throw new Error(`kaldirilanKaraKenarlari: ${k.a} - ${k.b} zaten komsu degil`);
    }
  }
  const karaKomsular = komsular.filter((k) => !kaldirilan.has(anahtar(k.a, k.b))).map((k) => ({ a: k.a, b: k.b, ortakSinirKm: k.ortakSinirKm }));
  for (const k of yap.eklenenKaraKenarlari) {
    if (karaKomsular.some((x) => anahtar(x.a, x.b) === anahtar(k.a, k.b))) throw new Error(`eklenenKaraKenarlari: ${k.a} - ${k.b} zaten komsu`);
    const [a, b] = k.a < k.b ? [k.a, k.b] : [k.b, k.a];
    karaKomsular.push({ a, b, ortakSinirKm: 0 });
  }

  gunluk("[5/9] merkez, nufus");
  const merkezler = new Map(birlesim.bolgeler.map((b) => [b.id, bolgeMerkezi(b.cokgenler)]));
  const kiyidaMi = (b: number, e: number): boolean => {
    const [ci, cj] = izgara.hucreBul(b, e);
    for (let dj = -1; dj <= 1; dj++) for (let di = -1; di <= 1; di++) if (izgara.denizMi(ci + di, cj + dj)) return true;
    return false;
  };
  const atanan = yerlesimleriBolgeyeAta(birlesim.bolgeler, yerlesimler, kiyidaMi);
  const { nufus, t: nufusT } = nufusOlcekle(new Map([...atanan].map(([id, v]) => [id, v.toplam])));

  gunluk("[6/9] rezervler, MRDS dogrulamasi, tesisler");
  const kanitlar = mrdsKanitlari(birlesim.bolgeler, mrdsOku());
  const mrdsRaporu: HatRaporu["mrds"] = {};
  const mrdsHatalari: string[] = [];
  for (const b of yap.bolgeler) {
    for (const mal of MRDS_MALLARI) {
      const iddia = b.rezervler[mal];
      if (iddia === undefined) continue;
      const k = kanitlar.get(b.id)?.[mal];
      const destek = k !== undefined && k.icerde + k.yakin > 0;
      const muaf = b.mrdsMuaf.includes(mal);
      (mrdsRaporu[b.id] ??= {})[mal] = { icerde: k?.icerde ?? 0, yakin: k?.yakin ?? 0, ornekler: k?.ornekler ?? [], iddiaBinBirim: iddia, muaf };
      if (!destek && !muaf) mrdsHatalari.push(`${b.id}: "${mal}" rezervi icin MRDS kaniti yok (mrdsMuaf ile gerekcelendirin veya iddiayi kaldirin)`);
      if (destek && muaf) mrdsHatalari.push(`${b.id}: "${mal}" MRDS kanitli ama mrdsMuaf isaretli (gereksiz muafiyet)`);
    }
  }
  if (mrdsHatalari.length > 0) throw new Error(`MRDS dogrulama hatalari:\n - ${mrdsHatalari.join("\n - ")}`);
  const adaylar: HatRaporu["mrdsAdaylari"] = [];
  for (const b of yap.bolgeler) {
    for (const mal of MRDS_MALLARI) {
      const k = kanitlar.get(b.id)?.[mal];
      if (k !== undefined && b.rezervler[mal] === undefined && k.icerde >= 3) adaylar.push({ bolge: b.id, mal, icerde: k.icerde, yakin: k.yakin });
    }
  }

  gunluk("[7/9] etiketler");
  const etiketler = new Map<string, Etiket[]>();
  for (const b of yap.bolgeler) {
    const e = new Set<Etiket>(b.etiketler);
    if (kiyi.kiyi.has(b.id)) e.add("kiyi");
    if ((kiyi.limanlar.get(b.id)?.length ?? 0) > 0) e.add("liman");
    for (const x of b.etiketEkle) e.add(x);
    for (const x of b.etiketCikar) e.delete(x);
    etiketler.set(b.id, ETIKET_SIRASI.filter((x) => e.has(x)));
  }

  gunluk("[8/9] kenarlar (kara, deniz, hava)");
  const kenarlar: KenarTanimi[] = [];
  const sinif = (a: string, b: string): KaraSinifi => {
    const ea = etiketler.get(a) as Etiket[];
    const eb = etiketler.get(b) as Etiket[];
    if (ea.includes("dar_gecit") || eb.includes("dar_gecit")) return "gecit";
    if (ea.includes("dag") || eb.includes("dag")) return "dag";
    return "ova";
  };
  for (const k of karaKomsular) {
    const kural = KARA_KURALLARI[sinif(k.a, k.b)];
    const ma = merkezler.get(k.a)!;
    const mb = merkezler.get(k.b)!;
    const yolKm = haversineKm(ma.b, ma.e, mb.b, mb.e) * YOL_EGRILIK_CARPANI;
    const doygunluk = Math.min(1, k.ortakSinirKm / SINIR_DOYGUNLUK_KM);
    kenarlar.push({
      a: k.a,
      b: k.b,
      tur: "kara",
      kapasiteSaat: yuvarla(kural.kapasiteMin + (kural.kapasiteMaks - kural.kapasiteMin) * doygunluk, 10_000),
      sureSaat: kisitla(Math.ceil(yolKm / kural.hizKmSaat), kural.sureMin, kural.sureMaks),
    });
  }
  const karaCiftleri = new Set(karaKomsular.map((k) => anahtar(k.a, k.b)));
  const mesafe = denizMesafeTablosu(kiyi.limanlar, izgara);
  const havzalar = new Map(yap.bolgeler.map((b) => [b.id, b.havzalar]));
  const denizAdaylari = denizKenarlariSec(havzalar, mesafe, karaCiftleri);
  for (const d of denizAdaylari) {
    const tMin = Math.min(nufusT.get(d.a) as number, nufusT.get(d.b) as number);
    kenarlar.push({
      a: d.a,
      b: d.b,
      tur: "deniz",
      kapasiteSaat: yuvarla(DENIZ.kapasiteMin + (DENIZ.kapasiteMaks - DENIZ.kapasiteMin) * tMin, DENIZ.kapasiteAdim),
      sureSaat: kisitla(Math.ceil(d.km / DENIZ.hizKmSaat), DENIZ.sureMin, DENIZ.sureMaks),
    });
  }
  // Hava: devletlerin en büyük (nüfuslu) bölgeleri arasında; aynı çifte başka kenar varsa atlanır.
  const devletBuyugu = new Map<string, string>();
  for (const b of yap.bolgeler) {
    const mevcut = devletBuyugu.get(b.devlet);
    if (mevcut === undefined || (nufus.get(b.id) as number) > (nufus.get(mevcut) as number)) devletBuyugu.set(b.devlet, b.id);
  }
  const mevcutCiftler = new Set(kenarlar.map((k) => anahtar(k.a, k.b)));
  for (const [da, db] of yap.havaKenarlari) {
    const a = devletBuyugu.get(da) as string;
    const b = devletBuyugu.get(db) as string;
    if (mevcutCiftler.has(anahtar(a, b))) continue;
    const ma = merkezler.get(a)!;
    const mb = merkezler.get(b)!;
    const km = haversineKm(ma.b, ma.e, mb.b, mb.e);
    const tMin = Math.min(nufusT.get(a) as number, nufusT.get(b) as number);
    const [x, y] = a < b ? [a, b] : [b, a];
    kenarlar.push({
      a: x,
      b: y,
      tur: "hava",
      kapasiteSaat: yuvarla(HAVA.kapasiteMin + (HAVA.kapasiteMaks - HAVA.kapasiteMin) * tMin, HAVA.kapasiteAdim),
      sureSaat: Math.max(HAVA.sureMin, Math.ceil(km / HAVA.hizKmSaat + HAVA.yerIslemSaat)),
    });
  }
  const turSirasi = { kara: 0, deniz: 1, hava: 2 } as const;
  kenarlar.sort((p, q) => turSirasi[p.tur] - turSirasi[q.tur] || (p.a < q.a ? -1 : p.a > q.a ? 1 : p.b < q.b ? -1 : p.b > q.b ? 1 : 0));

  gunluk("[9/9] harita dosyasi, dogrulama, cikti");
  // x/y: merkezlerin denk dikdörtgensel izdüşümü, 0-1000 karesine tek ölçekle oturtulur.
  const enlemOrta = [...merkezler.values()].reduce((s, m) => s + m.e, 0) / merkezler.size;
  const kx = Math.cos((enlemOrta * Math.PI) / 180);
  const xs = [...merkezler.values()].map((m) => m.b * kx);
  const ys = [...merkezler.values()].map((m) => m.e);
  const minX = Math.min(...xs);
  const maxX = Math.max(...xs);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const olcek = (1000 - 2 * XY_KENAR_BOSLUGU) / Math.max(maxX - minX, maxY - minY);
  const ofsX = (1000 - (maxX - minX) * olcek) / 2;
  const ofsY = (1000 - (maxY - minY) * olcek) / 2;

  const bolgeler: BolgeTanimi[] = yap.bolgeler.map((b) => {
    const m = merkezler.get(b.id)!;
    const rezervler: Record<string, number> = {};
    const rezervSirali = Object.entries(b.rezervler).sort((p, q) => q[1] - p[1] || (p[0] < q[0] ? -1 : 1));
    for (const [mal, bin] of rezervSirali) rezervler[mal] = bin * REZERV_CARPANI;
    const tesisler: string[] = [];
    for (const [mal] of rezervSirali.slice(0, EN_COK_REZERV_TESISI)) tesisler.push(MAL_TESIS[mal] as string);
    for (const s of b.sanayi) if (tesisler.length < EN_COK_TESIS) tesisler.push(s);
    return {
      id: b.id,
      ad: b.ad,
      devlet: b.devlet,
      etiketler: etiketler.get(b.id) as Etiket[],
      nufus: nufus.get(b.id) as number,
      rezervler,
      tesisler,
      x: Math.round(ofsX + (m.b * kx - minX) * olcek),
      y: Math.round(ofsY + (maxY - m.e) * olcek),
      konum: { enlemMikro: Math.round(m.e * 1e6), boylamMikro: Math.round(m.b * 1e6) },
    };
  });

  const harita: HaritaDosyasi = {
    surum: 1,
    ad: yap.ad,
    devletler: yap.devletler.map((d) => ({ ...d })),
    bolgeler,
    kenarlar,
    sinirDosyasi: SINIR_DOSYASI,
    atif: [...ATIF_SATIRLARI],
  };

  // Oyun paketiyle (icerik + parametreler) çapraz doğrulama
  const varsayilan = varsayilanVeriyiYukle();
  const sonuc = dogrulaVeriPaketi({ harita, icerik: varsayilan.icerik, param: varsayilan.param });
  if (!sonuc.gecerli) throw new Error(`Uretilen harita gecersiz:\n - ${sonuc.hatalar.join("\n - ")}`);

  const rapor: HatRaporu = {
    surum: 1,
    kaynaklar: Object.fromEntries(Object.entries(ozetler).map(([k, v]) => [k, { sha256: v.sha256, bayt: v.bayt }])),
    bolgeSayisi: bolgeler.length,
    kenarSayisi: {
      kara: kenarlar.filter((k) => k.tur === "kara").length,
      deniz: kenarlar.filter((k) => k.tur === "deniz").length,
      hava: kenarlar.filter((k) => k.tur === "hava").length,
    },
    kiyiBolgeleri: [...kiyi.kiyi].sort(),
    limanlar: Object.fromEntries([...kiyi.limanlar].sort((p, q) => (p[0] < q[0] ? -1 : 1)).map(([id, l]) => [id, l.map((x) => `${x.ad} (${x.kaynak})`)])),
    elenenLimanlar: kesisimSirali(kiyi.elenenler, (x) => x.ad),
    darGecitler: bolgeler.filter((b) => b.etiketler.includes("dar_gecit")).map((b) => b.id),
    kaldirilanKaraKenarlari: yap.kaldirilanKaraKenarlari.map((k) => `${k.a} - ${k.b}`),
    nufus: Object.fromEntries(
      bolgeler.map((b) => {
        const a = atanan.get(b.id)!;
        return [
          b.id,
          {
            gercekToplam: a.toplam,
            yerlesimSayisi: a.yerlesimler.length,
            enBuyukYerlesimler: [...a.yerlesimler].sort((p, q) => q.nufus - p.nufus || (p.ad < q.ad ? -1 : 1)).slice(0, 3).map((y) => `${y.ad} ${y.nufus}`),
            oyunNufusu: b.nufus,
          },
        ];
      }),
    ),
    mrds: mrdsRaporu,
    mrdsAdaylari: adaylar,
  };

  return {
    harita,
    haritaMetni: `${JSON.stringify(harita, null, 2)}\n`,
    topoMetni: `${birlesim.topoMetni}\n`,
    rapor,
    raporMetni: `${JSON.stringify(rapor, null, 2)}\n`,
  };
}

export function ciktilariYaz(s: HatSonucu): string[] {
  mkdirSync(HARITA_DIZINI, { recursive: true });
  mkdirSync(RAPOR_DIZINI, { recursive: true });
  const yollar = [resolve(HARITA_DIZINI, HARITA_DOSYASI), resolve(HARITA_DIZINI, SINIR_DOSYASI), resolve(RAPOR_DIZINI, "hat-raporu.json")];
  writeFileSync(yollar[0] as string, s.haritaMetni, "utf8");
  writeFileSync(yollar[1] as string, s.topoMetni, "utf8");
  writeFileSync(yollar[2] as string, s.raporMetni, "utf8");
  return yollar;
}
