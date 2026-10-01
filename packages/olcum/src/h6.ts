/**
 * H6 — Geç katılan işe yarar.
 *
 * Tanım: 4 devlet, 4 "yerleşik" bot (sanayici, tuccar, lojistikci, militarist); her devletin bölgelerinin yarısı
 * (başkentten genişlik-öncelikli sıra) yerleşik oyuncunun, diğer yarısı sahipsiz. 10. ve 20. günde her devlette 1'er geç
 * katılan (sanayici botu) sahipsiz, birbirine komşu 3 bölgeyle katılır (kalan bölge azsa 2) -> tohum başına 8 geç katılan.
 * Katılımdan 14 gün sonra: geç katılanın BÖLGE BAŞINA üretim değeri (katılım anı ile +14 gün arasındaki artış, sabit taban
 * fiyat), aynı devletteki yerleşik oyuncunun bölgelerinin aynı penceredeki bölge başına üretim değerlerinin MEDYANINA >= ise
 * "yerel ekonominin ilk yarısına ulaştı". Ulaşan oranı < %50 -> KALDI.
 */
import { GUN, SAAT, prngAralik, prngOlustur } from "@bolge/cekirdek";
import type { PrngDurumu } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { KosuOyuncusu } from "@bolge/botlar";
import type { VeriPaketi } from "@bolge/veri";
import { bolgeUretimDegeri, medyan } from "./metrik";
import { botArketibi, devletKimlikleri, devletSirasi, baskent, bfsSirasi, devletBolgeleri, iklimUygula, komsuluk, olcumBaglami, say, veriYukle } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H6_ESIK = 0.5;

export interface H6Secenek extends HipotezSecenek {
  /** Katılım günleri (vars. [10, 20]; kısa [2, 4]). */
  katilimGunleri?: number[];
  /** Katılımdan sonra ölçüm süresi, gün (vars. 14; kısa 3). */
  olcumGunu?: number;
  /** Geç katılanın bölge sayısı (vars. 3). */
  bolgeSayisi?: number;
  veri?: VeriPaketi;
}

interface Gec {
  id: string;
  devlet: string;
  devletIndeks: number;
  dalga: number;
  katilmaGun: number;
  bolgeler: string[];
}

/**
 * Bir devletin bölge düzenini belirler: yerleşik yarı + sahipsiz yarı. Başkentten genişlik-öncelikli sırada bölgeler
 * sırayla (çift/tek sıra) paylaştırılır; böylece yerleşik oyuncu başkent ve iyi bölgeleri tek başına toplamaz
 * (sahipsiz yarı yerleşiğe göre "sistematik olarak daha kötü" olmaz).
 */
function devletDuzeni(veri: VeriPaketi, devlet: string, bolgeler: string[]): { yerlesik: string[]; serbest: string[] } {
  const sira = bfsSirasi(veri.harita, bolgeler, baskent(veri.harita, devlet));
  return { yerlesik: sira.filter((_, i) => i % 2 === 0), serbest: sira.filter((_, i) => i % 2 === 1) };
}

/** Serbest kümeden, yerleşik bölgelere komşu bir başlangıçtan `n` komşu bölge (genişlik-öncelikli). */
function kumeSec(veri: VeriPaketi, serbest: string[], yerlesik: string[], n: number, akis: PrngDurumu): string[] {
  if (serbest.length === 0) return [];
  const komsu = komsuluk(veri.harita);
  const yerlesikSet = new Set(yerlesik);
  const sinira = serbest.filter((b) => (komsu[b] ?? []).some((x) => yerlesikSet.has(x)));
  const havuz = sinira.length > 0 ? sinira : serbest;
  const baslangic = havuz[prngAralik(akis, havuz.length)] as string;
  return bfsSirasi(veri.harita, serbest, baslangic).slice(0, Math.min(n, serbest.length));
}

export function h6Kos(secenek: H6Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = veriYukle(secenek);
  const katilimGunleri = secenek.katilimGunleri ?? (secenek.kisa ? [2, 4] : [10, 20]);
  const olcumGunu = secenek.olcumGunu ?? (secenek.kisa ? 3 : 14);
  const kumeBoyu = secenek.bolgeSayisi ?? 3;
  const ilerleme = secenek.ilerleme ?? (() => {});
  const devletler = devletBolgeleri(veri.harita);
  const tumDevletler = devletKimlikleri(veri.harita);
  const sureGun = Math.max(...katilimGunleri) + olcumGunu;

  const tohumBasina: TohumSonucu[] = [];
  const ayrintiTohum: Array<Record<string, unknown>> = [];
  for (const tohum of secenek.tohumlar) {
    const devletIds = devletSirasi(tumDevletler, tohum);
    const akis = prngOlustur(tohum, "olcum:h6");
    const duzen = devletIds.map((d) => devletDuzeni(veri, d, devletler[d] as string[]));
    const serbestKalan = duzen.map((x) => [...x.serbest]);
    const gecler: Gec[] = [];
    katilimGunleri.forEach((gun, dalga) => {
      devletIds.forEach((d, di) => {
        const kume = kumeSec(veri, serbestKalan[di] as string[], (duzen[di] as { yerlesik: string[] }).yerlesik, kumeBoyu, akis);
        if (kume.length === 0) return;
        serbestKalan[di] = (serbestKalan[di] as string[]).filter((b) => !kume.includes(b));
        gecler.push({ id: `g${di}_${dalga}`, devlet: d, devletIndeks: di, dalga, katilmaGun: gun, bolgeler: kume });
      });
    });

    const oyuncular: KosuOyuncusu[] = devletIds.map((_, i) => ({
      id: `o${i}`,
      bolgeler: (duzen[i] as { yerlesik: string[] }).yerlesik,
      bot: botOlustur(botArketibi(i), `o${i}`, tohum),
      katilmaMs: 0,
    }));
    for (const g of gecler) {
      oyuncular.push({ id: g.id, bolgeler: g.bolgeler, bot: botOlustur("sanayici", g.id, tohum), katilmaMs: g.katilmaGun * GUN });
    }

    // Anlık görüntü zamanları: her katılım ve +olcumGunu
    const anlar = new Set<number>();
    for (const g of gecler) {
      anlar.add(g.katilmaGun * GUN);
      anlar.add((g.katilmaGun + olcumGunu) * GUN);
    }
    const goruntu = new Map<number, number[]>();
    const sonuc = kos({
      veri: iklimUygula(veri, secenek.iklim, tohum),
      tohum,
      oyuncular,
      sureMs: sureGun * GUN,
      gozlemAraligiMs: 6 * SAAT,
      gozlem: (sim, t) => {
        if (anlar.has(t)) goruntu.set(t, sim.dunya.bolgeler.map((b) => bolgeUretimDegeri(sim, b.indeks)));
        if (t % (5 * GUN) === 0 && t > 0) ilerleme(`H6 tohum ${tohum}: gun ${t / GUN}/${sureGun}`);
      },
    });

    const satirlar = gecler.map((g) => {
      const t0 = g.katilmaGun * GUN;
      const t1 = (g.katilmaGun + olcumGunu) * GUN;
      const v0 = goruntu.get(t0) as number[];
      const v1 = goruntu.get(t1) as number[];
      const artis = (id: string): number => {
        const i = sonuc.sim.ic.bolgeIndeks[id] as number;
        return (v1[i] as number) - (v0[i] as number);
      };
      const gecBolgeBasina = g.bolgeler.reduce((t, id) => t + artis(id), 0) / g.bolgeler.length;
      const yerlesikBolgeler = (duzen[g.devletIndeks] as { yerlesik: string[] }).yerlesik;
      const yerlesikDegerler = yerlesikBolgeler.map(artis);
      const med = medyan(yerlesikDegerler);
      return {
        gec: g.id,
        devlet: g.devlet,
        katilmaGun: g.katilmaGun,
        bolgeler: g.bolgeler,
        gecBolgeBasinaUretim: say(gecBolgeBasina, 1),
        yerlesikMedyan: say(med, 1),
        oran: say(med > 0 ? gecBolgeBasina / med : 0),
        ulasti: gecBolgeBasina >= med,
      };
    });
    const ulasan = satirlar.filter((s) => s.ulasti).length;
    const oran = satirlar.length > 0 ? ulasan / satirlar.length : 0;
    const verdict: Verdict = satirlar.length === 0 ? "belirsiz" : oran < H6_ESIK ? "kaldi" : "gecti";
    tohumBasina.push({
      tohum,
      olcum: say(oran),
      verdict,
      durumOzeti: sonuc.sim.durumOzeti(),
      ozet: {
        gecKatilanSayisi: satirlar.length,
        ulasan,
        ulasmaOrani: say(oran),
        ortalamaOran: say(satirlar.reduce((t, s) => t + s.oran, 0) / Math.max(1, satirlar.length)),
        gecKomut: gecler.reduce((t, g) => t + (sonuc.komutSayisi[g.id] ?? 0), 0),
        gecBasarisiz: gecler.reduce((t, g) => t + (sonuc.basarisizSayisi[g.id] ?? 0), 0),
      },
    });
    ayrintiTohum.push({ tohum, gecKatilanlar: satirlar });
  }
  const n = tohumBasina.length;
  const ortOran = tohumBasina.reduce((t, x) => t + (x.olcum ?? 0), 0) / Math.max(1, n);
  return {
    kimlik: "H6",
    hipotez: "Geç katılan işe yarar: yeni oyuncu 14 günde yerel ekonominin ilk yarısına ulaşma oranı %50'den az değil",
    olcum: {
      ad: "Geç katılanın yerel medyana ulaşma oranı",
      deger: say(ortOran),
      birim: "oran",
      aciklama: "Katılımdan 14 gün sonra, bölge başına üretim artışı (taban fiyat) aynı devletteki yerleşik bölgelerin medyanına ≥ olan geç katılanların oranı.",
    },
    esik: { aciklama: "Ulaşan oranı < %50 ise vazgeç (kaldı)", deger: H6_ESIK },
    verdict: genelVerdict(tohumBasina.map((t) => t.verdict)),
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / Math.max(1, n),
    tohumBasina,
    ayrinti: { tohumlar: ayrintiTohum },
    parametreler: {
      katilimGunleri,
      olcumGunu,
      geceKatilanBolgeSayisi: kumeBoyu,
      yerlesikOyuncular: tumDevletler.map((_, i) => botArketibi(i)),
      gecKatilanBot: "sanayici",
      yerlesikBolgeOrani: 0.5,
      bolgeDagitimi: "baskentten BFS sirasinda cift indeks yerlesik, tek indeks sahipsiz",
      hizli: secenek.hizli === true,
      ...olcumBaglami(secenek, veri, secenek.tohumlar),
    },
    sureMs: Date.now() - basla,
  };
}
