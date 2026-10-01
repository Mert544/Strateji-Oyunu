/**
 * H3 — Askeri üretim ekonomiyi değiştirir.
 *
 * Tanım: 14 günlük TEMEL koşu (4 devlet, 4 bot: sanayici, tuccar, lojistikci, militarist) ile aynı tohumla
 * MÜDAHALE koşusu. Müdahalede 3. günden itibaren TÜM oyuncular askeri_rezerv %20 verir ve "kapasitenin %20'si
 * askeriye" olacak şekilde askeri üretime kayar: savaş gücü hedefi = brüt üretim değerinin %20'sini piyade
 * ikmaline (gıda + mühimmat) harcayacak birlik sayısı; mühimmat fabrikası (gerekirse) ve birlik üretimi.
 * Karşılaştırma: her malın dünya fiyatı (taban orana göre) ve oyuncuların ortalama kapsam karşılanması;
 * 14. gün değeri ve 7-14. gün ortalaması (6 saatlik örnekler).
 * Değişim = göreli (|müdahale − temel| / temel). Herhangi bir mal fiyatı veya kapsamı >= %10 değişirse GEÇTİ.
 */
import { GUN, SAAT } from "@bolge/cekirdek";
import type { Komut, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { Bakis, adayiSec, askeriAdaylar, botOlustur, hedefGucKapasiteden, kos } from "@bolge/botlar";
import type { Bot } from "@bolge/botlar";
import type { VeriPaketi } from "@bolge/veri";
import { fiyatOrani, kapsamOzeti, ortalama } from "./metrik";
import { botArketibi, devletKimlikleri, devletSirasi, birlesikOzet, devletBolgeleri, iklimUygula, olcumBaglami, say, veriYukle } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H3_ESIK = 0.1;

export interface H3Secenek extends HipotezSecenek {
  /** Toplam gün (vars. 14; kısa 5). */
  gun?: number;
  /** Müdahale başlangıç günü (vars. 3; kısa 1). */
  baslangicGun?: number;
  /** Askeriyeye kayan kapasite oranı (vars. 0.2). */
  oran?: number;
  veri?: VeriPaketi;
}

/** Botu sarar: müdahale gününden itibaren askeri kayma komutlarını başa ekler. */
class KaymaBotu implements Bot {
  constructor(
    private readonly ic: Bot,
    private readonly baslangicMs: number,
    private readonly oran: number,
  ) {}
  get oyuncu(): OyuncuId {
    return this.ic.oyuncu;
  }
  get arketip(): Bot["arketip"] {
    return this.ic.arketip;
  }
  karar(sim: Simulasyon): Komut[] {
    const normal = this.ic.karar(sim);
    if (sim.dunya.zaman < this.baslangicMs) return normal;
    const b = new Bakis(sim, this.ic.oyuncu);
    if (b.bolgeler.length === 0) return normal;
    const adaylar = askeriAdaylar(b, {
      hedefGuc: hedefGucKapasiteden(sim, b, this.oran),
      rezervPpm: Math.round(this.oran * 1_000_000),
      savas: false,
      savunmaDurusu: false,
    }).map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * 1000 }));
    const ek = adayiSec(adaylar, b, { n: 3, kategoriSiniri: { birlik: 2, rezerv: 1 } }).map((a) => a.komut);
    const gorulen = new Set(ek.map((k) => JSON.stringify(k)));
    return [...ek, ...normal.filter((k) => !gorulen.has(JSON.stringify(k)))];
  }
}

interface Ornek {
  gun: number;
  fiyat: Record<string, number>;
  kapsam: Record<string, number>;
}

interface KosuCiktisi {
  d14: Ornek;
  ort7_14: Ornek;
  ozet: string;
  komut: Record<string, number>;
  birlik: number;
  savas: number;
}

function kosu(veri: VeriPaketi, tohum: number, gun: number, baslangicGun: number, oran: number, mudahale: boolean, botTohum: number, ilerleme: (m: string) => void): KosuCiktisi {
  const devletler = devletBolgeleri(veri.harita);
  const devletIds = devletSirasi(devletKimlikleri(veri.harita), tohum);
  const ornekler: Ornek[] = [];
  const oyuncular = devletIds.map((d, i) => {
    const id = `o${i}`;
    const bot = botOlustur(botArketibi(i), id, botTohum);
    return { id, bolgeler: devletler[d] as string[], bot: mudahale ? new KaymaBotu(bot, baslangicGun * GUN, oran) : bot, katilmaMs: 0 };
  });
  const r = kos({
    veri,
    tohum,
    oyuncular,
    sureMs: gun * GUN,
    gozlemAraligiMs: 6 * SAAT,
    gozlem: (sim, t) => {
      ornekler.push({ gun: t / GUN, fiyat: fiyatOrani(sim), kapsam: kapsamOzeti(sim).ortalama });
    },
  });
  ilerleme(`H3 tohum ${tohum} ${mudahale ? "mudahale" : "temel"} bitti (${r.sureMs} ms)`);
  const son = ornekler[ornekler.length - 1] as Ornek;
  const pencere = ornekler.filter((o) => o.gun >= gun / 2 && o.gun <= gun);
  const ortOrnek = (f: (o: Ornek) => Record<string, number>): Record<string, number> => {
    const s: Record<string, number> = {};
    for (const k of Object.keys(f(son))) s[k] = ortalama(pencere.map((o) => f(o)[k] as number));
    return s;
  };
  const d = r.sim.dunya;
  return {
    d14: son,
    ort7_14: { gun, fiyat: ortOrnek((o) => o.fiyat), kapsam: ortOrnek((o) => o.kapsam) },
    ozet: r.sim.durumOzeti(),
    komut: r.komutTurleri,
    birlik: d.bolgeler.reduce((t, b) => t + b.birlikler.reduce((s, a) => s + a, 0), 0),
    savas: d.savaslar.length,
  };
}

export function h3Kos(secenek: H3Secenek): HipotezSonucu {
  const basla = Date.now();
  const temelVeri = veriYukle(secenek);
  const gun = secenek.gun ?? (secenek.kisa ? 5 : 14);
  const baslangicGun = secenek.baslangicGun ?? (secenek.kisa ? 1 : 3);
  const oran = secenek.oran ?? 0.2;
  const ilerleme = secenek.ilerleme ?? (() => {});
  const mallar = temelVeri.icerik.mallar.map((m) => m.id);

  const tohumBasina: TohumSonucu[] = [];
  const degisimTablosu: Array<Record<string, unknown>> = [];
  const enBuyukler: number[] = [];
  for (const tohum of secenek.tohumlar) {
    const veri = iklimUygula(temelVeri, secenek.iklim, tohum);
    const temel = kosu(veri, tohum, gun, baslangicGun, oran, false, tohum, ilerleme);
    const mud = kosu(veri, tohum, gun, baslangicGun, oran, true, tohum, ilerleme);
    // Gürültü tabanı: aynı dünya tohumu, yalnızca bot sapma tohumu farklı (müdahale yok). Kaos duyarlılığını ölçer.
    const gur = kosu(veri, tohum, gun, baslangicGun, oran, false, tohum + 1000, ilerleme);
    const goreli = (a: number, b: number, taban = 0.05): number => (b - a) / Math.max(Math.abs(a), taban);
    const enBuyukFark = (x: KosuCiktisi, y: KosuCiktisi): number =>
      Math.max(
        ...mallar.map((m) =>
          Math.max(
            Math.abs(goreli(x.d14.fiyat[m] as number, y.d14.fiyat[m] as number)),
            Math.abs(goreli(x.ort7_14.fiyat[m] as number, y.ort7_14.fiyat[m] as number)),
            Math.abs(goreli(x.d14.kapsam[m] as number, y.d14.kapsam[m] as number)),
            Math.abs(goreli(x.ort7_14.kapsam[m] as number, y.ort7_14.kapsam[m] as number)),
          ),
        ),
      );
    const gurultu = enBuyukFark(temel, gur);
    const satirlar = mallar.map((m) => {
      const f14 = goreli(temel.d14.fiyat[m] as number, mud.d14.fiyat[m] as number);
      const fOrt = goreli(temel.ort7_14.fiyat[m] as number, mud.ort7_14.fiyat[m] as number);
      const k14 = goreli(temel.d14.kapsam[m] as number, mud.d14.kapsam[m] as number);
      const kOrt = goreli(temel.ort7_14.kapsam[m] as number, mud.ort7_14.kapsam[m] as number);
      return {
        mal: m,
        fiyatTemel14: say(temel.d14.fiyat[m] as number),
        fiyatMudahale14: say(mud.d14.fiyat[m] as number),
        fiyatDegisim14: say(f14),
        fiyatDegisimOrt: say(fOrt),
        kapsamTemel14: say(temel.d14.kapsam[m] as number),
        kapsamMudahale14: say(mud.d14.kapsam[m] as number),
        kapsamDegisim14: say(k14),
        kapsamDegisimOrt: say(kOrt),
        kapsamMutlakFarkPp14: say(((mud.d14.kapsam[m] as number) - (temel.d14.kapsam[m] as number)) * 100, 2),
        enBuyuk: Math.max(Math.abs(f14), Math.abs(fOrt), Math.abs(k14), Math.abs(kOrt)),
      };
    });
    const enBuyuk = Math.max(...satirlar.map((s) => s.enBuyuk));
    // Gürültü tabanı eşiği aşıyorsa (aynı dünyada bot sapması bile >= %10 oynatıyorsa) sonuç güvenilir değildir.
    const verdict: Verdict = enBuyuk < H3_ESIK ? "kaldi" : gurultu >= H3_ESIK && enBuyuk < 2 * gurultu ? "belirsiz" : "gecti";
    enBuyukler.push(enBuyuk);
    if (degisimTablosu.length === 0) degisimTablosu.push(...satirlar.map((s) => ({ ...s })));
    tohumBasina.push({
      tohum,
      olcum: say(enBuyuk),
      verdict,
      durumOzeti: birlesikOzet([temel.ozet, mud.ozet]),
      ozet: {
        enBuyukDegisim: say(enBuyuk),
        gurultuTabani: say(gurultu),
        enBuyukMal: (satirlar.find((s) => s.enBuyuk === enBuyuk) as { mal: string }).mal,
        temelBirlik: temel.birlik,
        mudahaleBirlik: mud.birlik,
        temelSavas: temel.savas,
        mudahaleSavas: mud.savas,
        mudahaleKomutlari: mud.komut,
        temelKomutlari: temel.komut,
        degisimTablosu: satirlar.map((s) => ({ ...s, enBuyuk: say(s.enBuyuk) })),
      },
    });
  }
  const n = tohumBasina.length;
  return {
    kimlik: "H3",
    hipotez: "Askeri üretim ekonomiyi değiştirir: kapasitenin %20'si askeriyeye kayınca en az bir mal fiyatı veya kapsamı %10 değişir",
    olcum: {
      ad: "En büyük göreli değişim (fiyat veya kapsam)",
      deger: say(ortalama(enBuyukler)),
      birim: "oran",
      aciklama: "Temel ve müdahale koşusu arasında, 14. gün ve 7-14. gün ortalamasında, malların fiyat (taban oranı) ve kapsam karşılanması göreli değişiminin en büyüğü.",
    },
    esik: { aciklama: "Hiçbir mal fiyatı veya kapsam >= %10 değişmezse vazgeç (kaldı); biri değişirse geçti", deger: H3_ESIK },
    verdict: genelVerdict(tohumBasina.map((t) => t.verdict)),
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / Math.max(1, n),
    tohumBasina,
    ayrinti: { degisimTablosuIlkTohum: degisimTablosu },
    parametreler: {
      gun,
      mudahaleBaslangicGun: baslangicGun,
      askeriyeKayanKapasite: oran,
      oyuncular: devletKimlikleri(temelVeri.harita).map((_, i) => botArketibi(i)),
      ornekAraligiSaat: 6,
      degisimTanimi: "goreli; payda max(|temel|, 0.05)",
      gurultuTabani: "ayni dunya tohumu, yalniz bot sapma tohumu +1000 (mudahalesiz); mudahale < 2x gurultu ve gurultu >= %10 ise belirsiz",
      hizli: secenek.hizli === true,
      ...olcumBaglami(secenek, temelVeri, secenek.tohumlar),
    },
    sureMs: Date.now() - basla,
  };
}
