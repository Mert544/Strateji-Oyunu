/**
 * H2 — Tekrar düşük kalır (karar tükenmesi yok).
 *
 * PDF tanımı: "30. günde tekrar endeksi %60 üzeri" -> vazgeç.
 *
 * Tanım: 30 günlük koşu; 4 devlet için 4 bot (sanayici, tuccar, lojistikci, militarist; her bot kendi devletinin
 * TÜM bölgelerini alır). Odak oyuncu (ilk devlet, sanayici) için HER GÜN başında:
 *   1. Planlayıcıdan en fazla `aday` (vars. 10) bireysel olarak uygulanabilir aday + "hiçbir şey yapma".
 *   2. Her aday için simülasyon klonlanır, aday uygulanır, `ufukSaat` (vars. 24) ileri koşulur; ölçüt =
 *      odak oyuncunun (üretim değeri + hazine) artışı (para). "Hiçbir şey yapma" aynı şekilde ölçülür.
 *   3. En iyi aday = en yüksek ölçütlü aday anahtarı; hiçbiri "hiçbir şey yapma"dan iyi değilse "hicbir_sey".
 *   4. Asıl simde odak bot normal kararını verir; en iyi aday da uygulanır.
 * Tekrar endeksi RI(g) = g. günün en iyi anahtarının (g-1). günle aynı olması. "hicbir_sey" -> "hicbir_sey" geçişleri
 * tekrar SAYILMAZ: "karar tükenmesi" (yapılacak iyi bir şey kalmadı) ayrı metriktir; bu geçişler RI'nin payından ve
 * paydasından çıkarılır, kaç geçişin çıkarıldığı raporlanır.
 * KARAR ölçümü: son `kararPencereGun` (vars. 10) günlük pencerenin (21-30. günler) RI'si = pencerede (g-1 -> g) geçişleri,
 * tükenme geçişleri hariç. İkincil: tüm dönem (2..N. günler, tükenme hariç) RI, bölge dahil sıkı RI, Jaccard,
 * yalnız eylem günleri RI, tükenme sayıları.
 * Pencerede tüm geçişler tükenmeyse RI tanımsızdır (null) -> tohum sonucu BELİRSİZ (karar tükenmesi ayrıca görünür).
 * RI > %60 -> kaldı.
 */
import { GUN, SAAT } from "@bolge/cekirdek";
import type { Komut, OyuncuId, Simulasyon } from "@bolge/cekirdek";
import { Bakis, adayiSec, botOlustur, genisAdaylar, kos } from "@bolge/botlar";
import type { Aday, Bot } from "@bolge/botlar";
import type { VeriPaketi } from "@bolge/veri";
import { hazinePara, oyuncuBolgeleri, uretimDegeri } from "./metrik";
import { botArketibi, devletKimlikleri, devletSirasi, devletBolgeleri, iklimUygula, karsilastir, olcumBaglami, say, veriYukle } from "./ortak";
import { genelVerdict } from "./tipler";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H2_ESIK = 0.6;
export const HICBIR_SEY = "hicbir_sey";

export interface H2Secenek extends HipotezSecenek {
  /** Koşu süresi, gün (vars. 30; hızlı 12; kısa 3). */
  gun?: number;
  /** Günlük aday sayısı (vars. 10; hızlı 6; kısa 4). */
  aday?: number;
  /** Aday ölçüm ufku, saat (vars. 24). */
  ufukSaat?: number;
  /** Karar penceresi, gün (vars. 10: 21-30. günler). */
  kararPencereGun?: number;
  veri?: VeriPaketi;
}

export interface GunKaydi {
  gun: number;
  enIyi: string;
  enIyiBolge: string;
  marjinal: number;
  pozitifSayisi: number;
  adaySayisi: number;
  pozitifAnahtarlar: string[];
  tumMarjinaller: Array<{ anahtar: string; bolge: string; marjinal: number }>;
}

/** Odak botu sarar: her gün başında klon üzerinde aday ölçümü yapar. */
class OdakBotu implements Bot {
  readonly arketip = "sanayici" as const;
  readonly kayit: GunKaydi[] = [];
  constructor(
    readonly oyuncu: OyuncuId,
    private readonly ic: Bot,
    private readonly adaySayisi: number,
    private readonly ufukSaat: number,
  ) {}

  private skor(sim: Simulasyon): number {
    return uretimDegeri(sim, oyuncuBolgeleri(sim, this.oyuncu)) + hazinePara(sim, this.oyuncu);
  }

  /**
   * Günlük aday kümesi: geniş (süzgeçsiz) uygulanabilir eylemler; kategori kotasıyla (inşa 3, yöntem 2, araştırma 1,
   * kenar 1, ticaret 2, vergi 1) en fazla `adaySayisi` aday. Seçimi bot heuristiği değil klon ölçümü yapar.
   */
  private adaylar(sim: Simulasyon): Aday[] {
    const b = new Bakis(sim, this.oyuncu);
    if (b.bolgeler.length === 0) return [];
    const tum = genisAdaylar(b).filter((a) => !a.anahtar.includes("_iptal_"));
    tum.sort((x, y) => y.tahminiFayda - x.tahminiFayda || karsilastir(x.anahtar, y.anahtar) || karsilastir(x.bolge ?? "", y.bolge ?? ""));
    const kota: Record<string, number> = { insa: 3, yontem: 2, arastir: 1, kenar: 1, ticaret: 2, vergi: 1 };
    const sayac: Record<string, number> = {};
    const gorulen = new Set<string>();
    const cikti: Aday[] = [];
    for (const a of tum) {
      if (cikti.length >= this.adaySayisi) break;
      if ((sayac[a.kategori] ?? 0) >= (kota[a.kategori] ?? 0)) continue;
      const anahtar = a.anahtar;
      if (gorulen.has(anahtar)) continue; // anahtar başına en iyi bölge
      // Bireysel uygulanabilirlik (bütçe + bölge stoğu)
      if (adayiSec([{ ...a, tahminiFayda: 1 }], b, { n: 1, tampon: 0 }).length === 0) continue;
      gorulen.add(anahtar);
      sayac[a.kategori] = (sayac[a.kategori] ?? 0) + 1;
      cikti.push(a);
    }
    return cikti;
  }

  karar(sim: Simulasyon): Komut[] {
    const t = sim.dunya.zaman;
    let eklenen: Komut | null = null;
    if (t % GUN === 0) {
      const adaylar = this.adaylar(sim);
      const s0 = this.skor(sim);
      const temel = sim.klonla();
      temel.calistirKadar(t + this.ufukSaat * SAAT);
      const temelSkor = this.skor(temel) - s0;
      const olcumler: Array<{ anahtar: string; bolge: string; marjinal: number; komut: Komut }> = [];
      for (const a of adaylar) {
        const klon = sim.klonla();
        const r = klon.uygula({ t, oyuncu: this.oyuncu, komut: a.komut });
        if (!r.tamam) continue;
        klon.calistirKadar(t + this.ufukSaat * SAAT);
        olcumler.push({ anahtar: a.anahtar, bolge: a.bolge ?? "", marjinal: this.skor(klon) - s0 - temelSkor, komut: a.komut });
      }
      let en: (typeof olcumler)[number] | null = null;
      for (const o of olcumler) if (o.marjinal > 0 && (en === null || o.marjinal > en.marjinal)) en = o;
      const pozitif = olcumler.filter((o) => o.marjinal > 0);
      this.kayit.push({
        gun: Math.floor(t / GUN) + 1,
        enIyi: en ? en.anahtar : HICBIR_SEY,
        enIyiBolge: en ? en.bolge : "",
        marjinal: en ? say(en.marjinal, 1) : 0,
        pozitifSayisi: pozitif.length,
        adaySayisi: olcumler.length,
        pozitifAnahtarlar: pozitif.map((o) => o.anahtar).sort(),
        tumMarjinaller: olcumler.map((o) => ({ anahtar: o.anahtar, bolge: o.bolge, marjinal: say(o.marjinal, 1) })),
      });
      eklenen = en ? en.komut : null;
    }
    const normal = this.ic.karar(sim);
    if (!eklenen) return normal;
    const e = JSON.stringify(eklenen);
    return [eklenen, ...normal.filter((k) => JSON.stringify(k) !== e)];
  }
}

export interface H2Metrikleri {
  /** KARAR ölçümü: son `kararPencereGun` günün RI'si, tükenme geçişleri hariç (null = pencerede hiç geçiş kalmadı). */
  tekrarEndeksi: number | null;
  /** Karar penceresinin ilk günü ve son günü (gün numarası; pencere boşsa null). */
  pencereGunleri: [number, number] | null;
  /** Karar penceresinde RI paydası (tükenme hariç geçiş sayısı). */
  pencereCiftSayisi: number;
  /** İkincil: tüm dönem (2..N. günler) RI, tükenme geçişleri hariç. */
  tekrarEndeksiTumDonem: number | null;
  /** Karar penceresi, bölge dahil sıkı RI (tükenme hariç). */
  tekrarEndeksiSikiBolgeli: number | null;
  /** Tüm dönem, yalnız iki gün de eylem olan geçişler (hicbir_sey içeren hiçbir geçiş yok). */
  tekrarEndeksiEylemGunleri: number | null;
  jaccardOrtalama: number;
  /** Karar tükenmesi: tüm dönemde hicbir_sey -> hicbir_sey geçişi sayısı (RI'den çıkarılan). */
  tukenmeGecisSayisi: number;
  /** Karar penceresinde çıkarılan tükenme geçişi sayısı. */
  pencereTukenmeGecisSayisi: number;
  /** Tüm geçişlerin sayısı (N-1). */
  gecisSayisi: number;
  /** Tüm dönem tükenme oranı = tukenmeGecisSayisi / gecisSayisi. */
  tukenmeOrani: number;
  /** Gün başına "hiçbir şey yapma"dan iyi aday sayısı. */
  tukenmeSerisi: number[];
  ilkSifirGun: number | null;
  sifirGunSayisi: number;
}

/**
 * Günlük kayıtlardan tekrar endeksi ve karar tükenmesi metrikleri.
 * `pencereGun`: karar penceresi uzunluğu (vars. 10): son `pencereGun` günün (g-1 -> g) geçişleri.
 */
export function h2Metrikleri(kayit: readonly GunKaydi[], pencereGun = 10): H2Metrikleri {
  const ciftler: Array<[GunKaydi, GunKaydi]> = [];
  for (let i = 1; i < kayit.length; i++) ciftler.push([kayit[i - 1] as GunKaydi, kayit[i] as GunKaydi]);
  const tukenme = (a: GunKaydi, b: GunKaydi): boolean => a.enIyi === HICBIR_SEY && b.enIyi === HICBIR_SEY;
  /** Tükenme geçişlerini paydadan çıkararak oran (null = payda 0). */
  const oran = (cift: Array<[GunKaydi, GunKaydi]>, ayni: (a: GunKaydi, b: GunKaydi) => boolean): number | null => {
    const kalan = cift.filter(([a, b]) => !tukenme(a, b));
    return kalan.length === 0 ? null : kalan.filter(([a, b]) => ayni(a, b)).length / kalan.length;
  };
  const pencere = pencereGun > 0 ? ciftler.slice(-pencereGun) : [];
  const pencereKalan = pencere.filter(([a, b]) => !tukenme(a, b));
  const eylem = ciftler.filter(([a, b]) => a.enIyi !== HICBIR_SEY && b.enIyi !== HICBIR_SEY);
  const jaccard = ciftler.map(([a, b]) => {
    const A = new Set(a.pozitifAnahtarlar);
    const B = new Set(b.pozitifAnahtarlar);
    const kesisim = [...A].filter((x) => B.has(x)).length;
    const birlesim = new Set([...A, ...B]).size;
    return birlesim === 0 ? 1 : kesisim / birlesim;
  });
  const seri = kayit.map((k) => k.pozitifSayisi);
  let ilkSifir: number | null = null;
  for (let i = 0; i < seri.length; i++) {
    if (seri.slice(i).every((x) => x === 0)) {
      ilkSifir = (kayit[i] as GunKaydi).gun;
      break;
    }
  }
  const tukenmeToplam = ciftler.filter(([a, b]) => tukenme(a, b)).length;
  const ilkPencere = pencere[0];
  const sonPencere = pencere[pencere.length - 1];
  return {
    tekrarEndeksi: oran(pencere, (a, b) => a.enIyi === b.enIyi),
    pencereGunleri: ilkPencere && sonPencere ? [ilkPencere[1].gun, sonPencere[1].gun] : null,
    pencereCiftSayisi: pencereKalan.length,
    tekrarEndeksiTumDonem: oran(ciftler, (a, b) => a.enIyi === b.enIyi),
    tekrarEndeksiSikiBolgeli: oran(pencere, (a, b) => a.enIyi === b.enIyi && a.enIyiBolge === b.enIyiBolge),
    tekrarEndeksiEylemGunleri: eylem.length === 0 ? null : eylem.filter(([a, b]) => a.enIyi === b.enIyi).length / eylem.length,
    jaccardOrtalama: jaccard.length === 0 ? 0 : jaccard.reduce((t, x) => t + x, 0) / jaccard.length,
    tukenmeGecisSayisi: tukenmeToplam,
    pencereTukenmeGecisSayisi: pencere.length - pencereKalan.length,
    gecisSayisi: ciftler.length,
    tukenmeOrani: ciftler.length === 0 ? 0 : tukenmeToplam / ciftler.length,
    tukenmeSerisi: seri,
    ilkSifirGun: ilkSifir,
    sifirGunSayisi: seri.filter((x) => x === 0).length,
  };
}

const sayN = (x: number | null): number | null => (x === null ? null : say(x));

export function h2Kos(secenek: H2Secenek): HipotezSonucu {
  const basla = Date.now();
  const temelVeri = veriYukle(secenek);
  const gun = secenek.gun ?? (secenek.kisa ? 3 : secenek.hizli ? 12 : 30);
  const adaySayisi = secenek.aday ?? (secenek.kisa ? 4 : secenek.hizli ? 6 : 10);
  const ufukSaat = secenek.ufukSaat ?? 24;
  const kararPencereGun = secenek.kararPencereGun ?? 10;
  const ilerleme = secenek.ilerleme ?? (() => {});
  const devletler = devletBolgeleri(temelVeri.harita);
  const tumDevletler = devletKimlikleri(temelVeri.harita);

  const tohumBasina: TohumSonucu[] = [];
  const ayrintiTohum: Array<Record<string, unknown>> = [];
  const metrikler: H2Metrikleri[] = [];
  for (const tohum of secenek.tohumlar) {
    const veri = iklimUygula(temelVeri, secenek.iklim, tohum);
    const devletIds = devletSirasi(tumDevletler, tohum);
    const odakId = "o0";
    const odak = new OdakBotu(odakId, botOlustur("sanayici", odakId, tohum), adaySayisi, ufukSaat);
    const oyuncular = devletIds.map((d, i) => ({
      id: `o${i}`,
      bolgeler: devletler[d] as string[],
      bot: i === 0 ? odak : botOlustur(botArketibi(i), `o${i}`, tohum),
      katilmaMs: 0,
    }));
    const sonuc = kos({
      veri,
      tohum,
      oyuncular,
      sureMs: gun * GUN,
      gozlemAraligiMs: GUN,
      gozlem: (_s, t) => {
        if (t > 0 && (t / GUN) % 5 === 0) ilerleme(`H2 tohum ${tohum}: gun ${t / GUN}/${gun}`);
      },
    });
    const m = h2Metrikleri(odak.kayit, kararPencereGun);
    metrikler.push(m);
    const verdict: Verdict = m.tekrarEndeksi === null ? "belirsiz" : m.tekrarEndeksi > H2_ESIK ? "kaldi" : "gecti";
    tohumBasina.push({
      tohum,
      olcum: m.tekrarEndeksi === null ? null : say(m.tekrarEndeksi),
      verdict,
      durumOzeti: sonuc.sim.durumOzeti(),
      ozet: {
        tekrarEndeksi: sayN(m.tekrarEndeksi),
        pencereGunleri: m.pencereGunleri,
        pencereCiftSayisi: m.pencereCiftSayisi,
        tekrarEndeksiTumDonem: sayN(m.tekrarEndeksiTumDonem),
        tekrarEndeksiSikiBolgeli: sayN(m.tekrarEndeksiSikiBolgeli),
        tekrarEndeksiEylemGunleri: sayN(m.tekrarEndeksiEylemGunleri),
        jaccardOrtalama: say(m.jaccardOrtalama),
        tukenmeGecisSayisi: m.tukenmeGecisSayisi,
        pencereTukenmeGecisSayisi: m.pencereTukenmeGecisSayisi,
        gecisSayisi: m.gecisSayisi,
        tukenmeOrani: say(m.tukenmeOrani),
        ilkSifirGun: m.ilkSifirGun,
        sifirGunSayisi: m.sifirGunSayisi,
        odakKomut: sonuc.komutSayisi[odakId] ?? 0,
        odakBasarisiz: sonuc.basarisizSayisi[odakId] ?? 0,
      },
    });
    ayrintiTohum.push({
      tohum,
      gunler: odak.kayit.map((k) => ({
        gun: k.gun,
        enIyi: k.enIyi,
        bolge: k.enIyiBolge,
        marjinal: k.marjinal,
        pozitif: k.pozitifSayisi,
        aday: k.adaySayisi,
      })),
      tukenmeSerisi: m.tukenmeSerisi,
    });
  }

  const n = tohumBasina.length;
  /** Null olmayanların ortalaması (hiç yoksa null). */
  const ort = (f: (m: H2Metrikleri) => number | null): number | null => {
    const v = metrikler.map(f).filter((x): x is number => x !== null);
    return v.length === 0 ? null : v.reduce((t, x) => t + x, 0) / v.length;
  };
  const ort0 = (f: (m: H2Metrikleri) => number): number => metrikler.reduce((t, m) => t + f(m), 0) / Math.max(1, n);
  const ortKarar = ort((m) => m.tekrarEndeksi);
  const ortTum = ort((m) => m.tekrarEndeksiTumDonem);
  return {
    kimlik: "H2",
    hipotez: "Tekrar düşük kalır: 30. günde tekrar endeksi %60'ı aşmaz; karar tükenmesi ayrıca raporlanır",
    olcum: {
      ad: `Tekrar endeksi (karar: son ${kararPencereGun} gün, tükenme hariç)`,
      deger: ortKarar === null ? null : say(ortKarar),
      birim: "oran",
      aciklama:
        `Son ${kararPencereGun} günlük pencerede (30 günlük koşuda 21-30. günler) en iyi düzenleme anahtarının bir önceki günle aynı olduğu geçişlerin oranı ` +
        `(odak oyuncu, klon üzerinde ${ufukSaat} saatlik ileri ölçüm). "hicbir_sey" -> "hicbir_sey" geçişleri tekrar sayılmaz; ` +
        `ayrı "karar tükenmesi" metriğidir ve paydadan çıkarılır (pencerede ortalama ${say(ort0((m) => m.pencereTukenmeGecisSayisi), 1)} geçiş çıkarıldı). ` +
        `Tüm dönem (2..N. gün) ortalaması ikincildir: ${ortTum === null ? "—" : say(ortTum)}.`,
    },
    esik: { aciklama: "Karar penceresi tekrar endeksi > %60 ise vazgeç (kaldı)", deger: H2_ESIK },
    verdict: genelVerdict(tohumBasina.map((t) => t.verdict)),
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / Math.max(1, n),
    tohumBasina,
    ayrinti: {
      ortalamalar: {
        tekrarEndeksiKarar: ortKarar === null ? null : say(ortKarar),
        tekrarEndeksiTumDonem: sayN(ortTum),
        tekrarEndeksiSikiBolgeli: sayN(ort((m) => m.tekrarEndeksiSikiBolgeli)),
        jaccard: say(ort0((m) => m.jaccardOrtalama)),
        tukenmeGecisSayisi: say(ort0((m) => m.tukenmeGecisSayisi), 2),
        pencereTukenmeGecisSayisi: say(ort0((m) => m.pencereTukenmeGecisSayisi), 2),
        tukenmeOrani: say(ort0((m) => m.tukenmeOrani)),
        sifirGunSayisi: say(ort0((m) => m.sifirGunSayisi), 2),
      },
      tohumlar: ayrintiTohum,
    },
    parametreler: {
      gun,
      adaySayisi,
      ufukSaat,
      kararPencereGun,
      tukenmeGecisleriRIdenCikarilir: true,
      oyuncular: tumDevletler.map((_, i) => botArketibi(i)),
      odak: "o0 (devlet sirasi tohumla doner; ilk devlet, sanayici)",
      kararAraligiSaat: 6,
      hizli: secenek.hizli === true,
      ...olcumBaglami(secenek, temelVeri, secenek.tohumlar),
    },
    sureMs: Date.now() - basla,
  };
}

