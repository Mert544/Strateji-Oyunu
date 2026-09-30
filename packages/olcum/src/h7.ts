/**
 * H7 — Ayarla ve unut ne çöker ne eşitlenir.
 *
 * PDF tanımı: "Yalnızca akış kuran oyuncunun 24/48/72. saatte ÜRETİMİ, aktif oyuncuya göre %50–85 aralığı dışındaysa".
 * Bu, KÜMÜLATİF değil o andaki üretimdir.
 *
 * Tanım: aynı tohumla iki koşu. Odak oyuncu (ilk devlet) birinde aktif bot (sanayici), diğerinde kur_ve_unut
 * (yalnızca ilk çağrıda sanayici+tüccar ilk planını verir, sonra hiç komut vermez); diğer 3 devlet aynı botlarla
 * (tuccar, lojistikci, militarist). KARAR ölçümü: 24/48/72. saatlerin her birinde, o saate kadarki son
 * `pencereSaat` (vars. 24: PDF'deki günlük ritim — o günün üretimi) saatlik pencerede odak oyuncunun ÜRETTİĞİ değer (sabit taban fiyat, brüt; canlı üretim
 * toplamının pencere sonu − pencere başı farkı) oranı = kur_ve_unut / aktif. Üç noktada da [%50, %85] içindeyse GEÇTİ.
 * Oran > %85: aktif oyun değersiz (eşitlenme); oran < %50: ayarla-unut çöküyor. Hangisi olduğu ayrıntıda yazılır.
 * İkincil (karara girmez): aynı noktalarda kümülatif üretim oranı; ayrıca 7. ve 14. günlerde (bilgi amaçlı) hem pencere
 * hem kümülatif oran, uzun ufukta ayrışmayı göstermek için.
 */
import { SAAT } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { hazinePara, oyuncuBolgeleri, uretimDegeri } from "./metrik";
import { DORT_BOT, devletSirasi, birlesikOzet, devletBolgeleri, say } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H7_ALT = 0.5;
export const H7_UST = 0.85;

export interface H7Secenek extends HipotezSecenek {
  /** Karar noktaları, saat (vars. [24, 48, 72]). */
  saatler?: number[];
  /** Üretim penceresi uzunluğu, saat (vars. 6): karar noktasına kadarki son kaç saatin üretimi oranlanır. */
  pencereSaat?: number;
  /** Ek uzun ufuk noktaları, gün (vars. [7, 14]; kısa []). */
  ekGunler?: number[];
  veri?: VeriPaketi;
}

interface Kosu {
  /** saat -> (kümülatif üretim değeri, hazine); karar/ek noktalar ve her noktadan `pencereSaat` önce. */
  deger: Map<number, { uretim: number; hazine: number }>;
  komut: number;
  komutTurleri: Record<string, number>;
  ozet: string;
}

function tekKosu(veri: VeriPaketi, tohum: number, aktif: boolean, noktalarSaat: number[], pencereSaat: number, ilerleme: (m: string) => void): Kosu {
  const devletler = devletBolgeleri(veri.harita);
  const devletIds = devletSirasi(Object.keys(devletler).slice(0, DORT_BOT.length), tohum);
  const oyuncular = devletIds.map((d, i) => ({
    id: `o${i}`,
    bolgeler: devletler[d] as string[],
    bot: botOlustur(i === 0 ? (aktif ? "sanayici" : "kur_ve_unut") : (DORT_BOT[i] as (typeof DORT_BOT)[number]), `o${i}`, tohum),
    katilmaMs: 0,
  }));
  const deger = new Map<number, { uretim: number; hazine: number }>();
  const sure = Math.max(...noktalarSaat) * SAAT;
  // Her nokta ve o noktadan pencereSaat önceki an (pencere başı) gözlenir.
  const cek = new Set(noktalarSaat.flatMap((s) => [s * SAAT, (s - pencereSaat) * SAAT]));
  const r = kos({
    veri,
    tohum,
    oyuncular,
    sureMs: sure,
    gozlemAraligiMs: SAAT,
    gozlem: (sim, t) => {
      if (cek.has(t)) deger.set(t / SAAT, { uretim: uretimDegeri(sim, oyuncuBolgeleri(sim, "o0")), hazine: hazinePara(sim, "o0") });
    },
  });
  ilerleme(`H7 tohum ${tohum} ${aktif ? "aktif" : "kur_ve_unut"} bitti (${r.sureMs} ms)`);
  return { deger, komut: r.komutSayisi["o0"] ?? 0, komutTurleri: r.komutTurleri, ozet: r.sim.durumOzeti() };
}

export function h7Kos(secenek: H7Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const saatler = secenek.saatler ?? [24, 48, 72];
  const ekGunler = secenek.ekGunler ?? (secenek.kisa ? [] : [7, 14]);
  const tumSaatler = [...saatler, ...ekGunler.map((g) => g * 24)];
  const pencereSaat = secenek.pencereSaat ?? 24;
  if (!Number.isInteger(pencereSaat) || pencereSaat < 1 || pencereSaat > Math.min(...tumSaatler)) {
    throw new Error(`H7: pencereSaat 1..${Math.min(...tumSaatler)} araliginda tamsayi olmali: ${pencereSaat}`);
  }
  const ilerleme = secenek.ilerleme ?? (() => {});

  const tohumBasina: TohumSonucu[] = [];
  const oranlarTum: number[][] = [];
  const kumulatifTum: number[][] = [];
  for (const tohum of secenek.tohumlar) {
    const aktif = tekKosu(veri, tohum, true, tumSaatler, pencereSaat, ilerleme);
    const unut = tekKosu(veri, tohum, false, tumSaatler, pencereSaat, ilerleme);
    const satirlar = tumSaatler.map((s) => {
      const a = aktif.deger.get(s) as { uretim: number; hazine: number };
      const u = unut.deger.get(s) as { uretim: number; hazine: number };
      const a0 = aktif.deger.get(s - pencereSaat) as { uretim: number; hazine: number };
      const u0 = unut.deger.get(s - pencereSaat) as { uretim: number; hazine: number };
      const aPencere = a.uretim - a0.uretim;
      const uPencere = u.uretim - u0.uretim;
      return {
        saat: s,
        /** KARAR oranı: son `pencereSaat` saatte üretilen değer, kur_ve_unut / aktif. */
        oran: aPencere > 0 ? uPencere / aPencere : 0,
        aktifPencereUretim: say(aPencere, 1),
        unutPencereUretim: say(uPencere, 1),
        /** İkincil: kümülatif üretim değeri oranı. */
        oranKumulatif: a.uretim > 0 ? u.uretim / a.uretim : 0,
        aktifUretim: say(a.uretim, 1),
        unutUretim: say(u.uretim, 1),
        aktifHazine: say(a.hazine, 1),
        unutHazine: say(u.hazine, 1),
        kararNoktasi: saatler.includes(s),
      };
    });
    const karar = satirlar.filter((s) => s.kararNoktasi);
    const icinde = karar.every((s) => s.oran >= H7_ALT && s.oran <= H7_UST);
    const verdict: Verdict = icinde ? "gecti" : "kaldi";
    const nokta = (s: { saat: number; oran: number }): string =>
      `${s.saat}s %${(s.oran * 100).toFixed(1)} ${s.oran > H7_UST ? "> %85 (esitlenme: aktif oyun degersiz)" : s.oran < H7_ALT ? "< %50 (ayarla-unut cokuyor)" : "aralik ici"}`;
    const son = karar[karar.length - 1] as { oran: number };
    oranlarTum.push(karar.map((s) => s.oran));
    kumulatifTum.push(karar.map((s) => s.oranKumulatif));
    tohumBasina.push({
      tohum,
      olcum: say(son.oran),
      verdict,
      durumOzeti: birlesikOzet([aktif.ozet, unut.ozet]),
      ozet: {
        neden: karar.map(nokta).join("; "),
        pencereSaat,
        oranlar: satirlar.map((s) => ({ saat: s.saat, oran: say(s.oran), oranKumulatif: say(s.oranKumulatif), karar: s.kararNoktasi })),
        aktifKomut: aktif.komut,
        unutKomut: unut.komut,
        satirlar: satirlar.map((s) => ({ ...s, oran: say(s.oran), oranKumulatif: say(s.oranKumulatif) })),
      },
    });
  }
  const n = tohumBasina.length;
  const ort = saatler.map((_, i) => oranlarTum.reduce((t, r) => t + (r[i] as number), 0) / Math.max(1, n));
  const ortSon = ort[ort.length - 1] as number;
  const ortKum = saatler.map((_, i) => kumulatifTum.reduce((t, r) => t + (r[i] as number), 0) / Math.max(1, n));
  return {
    kimlik: "H7",
    hipotez: "Ayarla ve unut ne çöker ne eşitlenir: 24/48/72. saatte (o anki) üretim oranı %50-85 aralığında",
    olcum: {
      ad: `${saatler[saatler.length - 1]}. saatte kur_ve_unut / aktif son ${pencereSaat} saatlik üretim değeri oranı`,
      deger: say(ortSon),
      birim: "oran",
      aciklama: `Odak oyuncunun, karar noktasına (${saatler.join("/")}. saat) kadarki son ${pencereSaat} saatte ürettiği değerin (taban fiyat, brüt) oranı; kümülatif değil, o anki üretimdir. Ortalama oranlar: ${ort.map((x) => say(x, 3)).join(" / ")}. İkincil kümülatif oranlar: ${ortKum.map((x) => say(x, 3)).join(" / ")}.`,
    },
    esik: { aciklama: "Üç noktanın hepsi [%50, %85] içinde olmalı; dışında ise vazgeç (kaldı)", deger: H7_UST },
    verdict: genelVerdict(tohumBasina.map((t) => t.verdict)),
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / Math.max(1, n),
    tohumBasina,
    ayrinti: {
      ortalamaOranlar: Object.fromEntries(saatler.map((s, i) => [`${s}s`, say(ort[i] as number)])),
      ortalamaKumulatifOranlar: Object.fromEntries(saatler.map((s, i) => [`${s}s`, say(ortKum[i] as number)])),
    },
    parametreler: {
      karar: "kur_ve_unut / aktif (sanayici), odak = ilk devlet",
      saatler,
      pencereSaat,
      ekGunler,
      diger: DORT_BOT.slice(1),
      kurVeUnutIlkPlanKomut: "en fazla 10 (sanayici + tuccar ilk plani)",
      hizli: secenek.hizli === true,
    },
    sureMs: Date.now() - basla,
  };
}

