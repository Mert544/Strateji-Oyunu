/**
 * H1 — Bölgeler gerçekten farklı.
 *
 * Tanım: sentetik-50'deki HER bölge için tek bölgeli bir oyuncu o bölgeyi alır (diğer bölgeler sahipsiz).
 * Her önayar ayrı koşuda t=0'da ve 24 saatte bir yeniden uygulanır; 7 gün koşulur.
 * Skor = bölgenin üretim değeri (sabit taban fiyat, para) + hazine değişimi (para).
 * Önayarlar bölge başına skora göre sıralanır; eşit skorlar ortalama sıra alır.
 * Ölçüm: her önayarın ilk üçte olduğu bölge oranı; en yüksek oran > %70 -> kaldı (baskın strateji var).
 * Ayrıca: en iyi önayarın bölgelere dağılımı ve Shannon entropisi (bit).
 */
import { GUN, SISTEM_OYUNCUSU, Simulasyon } from "@bolge/cekirdek";
import { ONAYARLAR } from "@bolge/botlar";
import type { Onayar } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { hazinePara, uretimDegeri } from "./metrik";
import { birlesikOzet, say, shannon } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H1_ESIK = 0.7;

export interface H1Secenek extends HipotezSecenek {
  /** Değerlendirilecek bölge sayısı (vars.: tümü; hızlı: 12; kısa: 3). Eşit aralıkla seçilir. */
  bolgeSayisi?: number;
  /** Koşu süresi, gün (vars. 7; kısa: 1). */
  gun?: number;
  /** Önayar adları (vars.: tümü; kısa: ilk 3). */
  onayarlar?: string[];
  veri?: VeriPaketi;
}

interface KosuBilgisi {
  skor: number;
  uretim: number;
  hazineDegisimi: number;
  komut: number;
  basarisiz: number;
  ozet: string;
}

function tekKosu(veri: VeriPaketi, tohum: number, bolge: string, onayar: Onayar, gun: number): KosuBilgisi {
  const sim = Simulasyon.olustur(veri, tohum);
  const r = sim.uygula({ t: 0, oyuncu: SISTEM_OYUNCUSU, komut: { tur: "oyuncu_katil", oyuncu: "o1", bolgeler: [bolge] } });
  if (!r.tamam) throw new Error(`H1: katilim basarisiz: ${r.hata}`);
  const h0 = hazinePara(sim, "o1");
  let komut = 0;
  let basarisiz = 0;
  for (let g = 0; g < gun; g++) {
    const t = g * GUN;
    sim.calistirKadar(t);
    for (const k of onayar.uygula(sim, "o1")) {
      const s = sim.uygula({ t, oyuncu: "o1", komut: k });
      if (s.tamam) komut++;
      else basarisiz++;
    }
  }
  sim.calistirKadar(gun * GUN);
  const uretim = uretimDegeri(sim, [bolge]);
  const hd = hazinePara(sim, "o1") - h0;
  return { skor: uretim + hd, uretim, hazineDegisimi: hd, komut, basarisiz, ozet: sim.durumOzeti() };
}

/** Ortalama sıra (1 = en iyi; eşitlikte paylaşılır). */
export function ortalamaSira(skorlar: readonly number[]): number[] {
  return skorlar.map((s, i) => {
    let ustte = 0;
    let esit = 0;
    skorlar.forEach((x, j) => {
      if (j === i) return;
      if (x > s) ustte++;
      else if (x === s) esit++;
    });
    return 1 + ustte + esit / 2;
  });
}

export function h1Kos(secenek: H1Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const tumBolgeler = veri.harita.bolgeler.map((b) => b.id);
  const hedefSayi = secenek.bolgeSayisi ?? (secenek.kisa ? 3 : secenek.hizli ? 12 : tumBolgeler.length);
  const bolgeler =
    hedefSayi >= tumBolgeler.length
      ? tumBolgeler
      : Array.from({ length: hedefSayi }, (_, i) => tumBolgeler[Math.floor((i * tumBolgeler.length) / hedefSayi)] as string);
  const gun = secenek.gun ?? (secenek.kisa ? 1 : 7);
  const onayarlar = secenek.onayarlar
    ? ONAYARLAR.filter((o) => secenek.onayarlar?.includes(o.ad))
    : secenek.kisa
      ? ONAYARLAR.slice(0, 3)
      : ONAYARLAR;
  const ilerleme = secenek.ilerleme ?? (() => {});

  const tohumBasina: TohumSonucu[] = [];
  let ilkBolgeTablosu: Array<Record<string, unknown>> = [];
  const tohumTopRate: number[][] = [];

  for (const tohum of secenek.tohumlar) {
    const skorlar: number[][] = []; // [bolge][onayar]
    const ozetler: string[] = [];
    let komutToplam = 0;
    let basarisizToplam = 0;
    bolgeler.forEach((bolge, bi) => {
      const satir: number[] = [];
      for (const o of onayarlar) {
        const k = tekKosu(veri, tohum, bolge, o, gun);
        satir.push(k.skor);
        ozetler.push(k.ozet);
        komutToplam += k.komut;
        basarisizToplam += k.basarisiz;
      }
      skorlar.push(satir);
      if ((bi + 1) % 10 === 0 || bi === bolgeler.length - 1) ilerleme(`H1 tohum ${tohum}: ${bi + 1}/${bolgeler.length} bolge`);
    });

    const siralar = skorlar.map((s) => ortalamaSira(s));
    const top3 = onayarlar.map((_, oi) => siralar.filter((s) => (s[oi] as number) <= 3).length / bolgeler.length);
    // Duyarlılık: bölgeye göre uyarlanan "dengeli" (genel amaçlı açgözlü) önayar hariç, ilk üç oranı.
    const dengeliIdx = onayarlar.findIndex((o) => o.ad === "dengeli");
    const dengeliHaric = onayarlar.map((_, oi) => {
      if (oi === dengeliIdx || dengeliIdx < 0) return top3[oi] as number;
      const altKume = onayarlar.map((__, j) => j).filter((j) => j !== dengeliIdx);
      let say_ = 0;
      for (const satir of skorlar) {
        const altSkor = altKume.map((j) => satir[j] as number);
        const altSira = ortalamaSira(altSkor);
        if ((altSira[altKume.indexOf(oi)] as number) <= 3) say_++;
      }
      return say_ / bolgeler.length;
    });
    const enYuksekDengelisiz = Math.max(...dengeliHaric.filter((_, oi) => oi !== dengeliIdx));
    const enIyiSayim = onayarlar.map(() => 0);
    for (const s of skorlar) {
      let en = 0;
      s.forEach((x, i) => {
        if (x > (s[en] as number)) en = i;
      });
      enIyiSayim[en] = (enIyiSayim[en] as number) + 1;
    }
    const entropi = shannon(enIyiSayim);
    const enYuksek = Math.max(...top3);
    const verdict: Verdict = enYuksek > H1_ESIK ? "kaldi" : "gecti";
    const enYuksekOnayar = (onayarlar[top3.indexOf(enYuksek)] as Onayar).ad;
    tohumTopRate.push(top3);
    tohumBasina.push({
      tohum,
      olcum: say(enYuksek),
      verdict,
      durumOzeti: birlesikOzet(ozetler),
      ozet: {
        enYuksekOnayar,
        top3Orani: Object.fromEntries(onayarlar.map((o, i) => [o.ad, say(top3[i] as number)])),
        top3OraniDengeliHaric: Object.fromEntries(onayarlar.map((o, i) => [o.ad, say(dengeliHaric[i] as number)])),
        enYuksekDengeliHaric: say(enYuksekDengelisiz),
        enIyiOnayarDagilimi: Object.fromEntries(onayarlar.map((o, i) => [o.ad, enIyiSayim[i] as number])),
        entropiBit: say(entropi),
        entropiNormalize: say(onayarlar.length > 1 ? entropi / Math.log2(onayarlar.length) : 0),
        komut: komutToplam,
        basarisizKomut: basarisizToplam,
      },
    });
    if (ilkBolgeTablosu.length === 0) {
      ilkBolgeTablosu = bolgeler.map((b, bi) => ({
        bolge: b,
        skorlar: Object.fromEntries(onayarlar.map((o, oi) => [o.ad, say((skorlar[bi] as number[])[oi] as number, 1)])),
        enIyi: (onayarlar[(skorlar[bi] as number[]).indexOf(Math.max(...(skorlar[bi] as number[])))] as Onayar).ad,
      }));
    }
  }

  const n = tohumBasina.length;
  const top3Ort = onayarlar.map((_, oi) => tohumTopRate.reduce((t, r) => t + (r[oi] as number), 0) / n);
  const enYuksekOrt = Math.max(...top3Ort);
  const verdict = genelVerdict(tohumBasina.map((t) => t.verdict));
  return {
    kimlik: "H1",
    hipotez: "Bölgeler gerçekten farklı: aynı politika bölgelerin %70'inden fazlasında ilk üçte değil",
    olcum: {
      ad: "En yüksek önayarın ilk-üç bölge oranı",
      deger: say(enYuksekOrt),
      birim: "oran",
      aciklama: "Her önayarın (t=0 ve 24 saatte bir uygulanan, 7 gün) bölge başına skor sıralamasında ilk üçte olduğu bölge oranı; en yükseği.",
    },
    esik: { aciklama: "En yüksek oran > %70 ise vazgeç (kaldı)", deger: H1_ESIK },
    verdict,
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / n,
    tohumBasina,
    ayrinti: {
      onayarlar: onayarlar.map((o) => ({ ad: o.ad, aciklama: o.aciklama })),
      tohumOrtalamaTop3Orani: Object.fromEntries(onayarlar.map((o, i) => [o.ad, say(top3Ort[i] as number)])),
      duyarlilikDengeliHaric: {
        aciklama: "Bolgeye gore uyarlanan 'dengeli' onayar siralamadan cikarilinca (yalniz sabit temali onayarlar) en yuksek ilk-uc orani",
        tohumlar: tohumBasina.map((t) => ({ tohum: t.tohum, enYuksek: (t.ozet as { enYuksekDengeliHaric: number }).enYuksekDengeliHaric })),
      },
      bolgeSayisi: bolgeler.length,
      bolgeTablosuIlkTohum: ilkBolgeTablosu,
    },
    parametreler: {
      bolgeSayisi: bolgeler.length,
      tumBolgeSayisi: tumBolgeler.length,
      gun,
      onayarSayisi: onayarlar.length,
      uygulamaAraligiSaat: 24,
      skor: "uretimDegeri(sabit taban fiyat) + hazine degisimi (para)",
      sira: "esit skorlar ortalama sira",
      hizli: secenek.hizli === true,
    },
    sureMs: Date.now() - basla,
  };
}
