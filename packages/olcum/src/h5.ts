/**
 * H5 — Çevrimdışı kayıp sınırlı.
 *
 * PDF tanımı: "48 saat çevrimdışı oyuncunun tek pencerede stok kaybı %25 üst sınırını aşarsa" -> vazgeç.
 *
 * Neden eski senaryo yetersizdi: her hedefe tek saldırı yapılıyor ve yalnızca tek pencere oranına bakılıyordu; bu çekirdeğin
 * tek nokta tavanının (kayipTavaniUygula) birim testini yinelemekten ibaretti. Burada ÇEVRİMDIŞI oyuncuya karşı EN KÖTÜ durum denenir.
 *
 * Tanım: sentetik-50'de iki komşu devlet (en çok ortak sınır kenarı olan çift). Oyuncu A (militarist) bir devletin,
 * oyuncu B (çevrimdışı) diğer devletin tüm bölgelerini alır; mümkünse B'ye komşu üçüncü bir devletin oyuncusu C (militarist)
 * ikinci saldıran olur (`ikinciSaldiran`, vars. açık). İlk 8 gün (B'nin 7 günlük yeni oyuncu koruması biter) A ve C ekonomilerini
 * ve ordularını kurar, B hiçbir şey yapmaz. 8. günden (t0) başlayarak 48 saat boyunca HER SAAT koşucu, saldıranların birlikli
 * bölgelerinden B'nin komşu bölgelerine, en güçlü saldıran önce, TÜM uygun (saldıran bölge, hedef bölge) çiftleri için
 * savaş ilanı dener: aynı hedefe birden çok komşu bölgeden ve iki oyuncudan paralel ve ardışık ilanlar. Çekirdek kuralları
 * (hedefte bitmemiş savaş varken ilan reddi, yağma sonrası bekleme vb.) bir ilanı reddedebilir: bu NORMALdir; reddedilen
 * ilan denemesi sayısı ve nedenleri raporlanır. Saldıranların kendi bot ilanları kapalıdır (yalnızca koşucu ilan verir).
 * İlanlar biten savaşlar tümü çözülene dek (en çok t0+120 saat) sürülür; B bu sürede hiç komut vermez.
 * İki varyant: "pasif" (B hiç emir vermez) ve "savunma_emri" (B t=0'da bir kez tüm bölgelerine savunma duruşu verir, sonra pasif).
 *
 * KARAR ölçümü: B'nin HER bölgesi için, HERHANGİ bir 24 saatlik kayan pencerede (başlangıçlar 15 dakikalık ızgara + her pencere
 * kapanışından 1 ms önce) toplam stok kaybı oranı:
 *   - değer ağırlıklı: Σ_mal kayıp × taban fiyat / pencere içi en yüksek toplam stok değeri;
 *   - mal başına en büyük: max_mal kayıp / pencere içi en yüksek mal stoku (stoku ≥ 10 birim olan mallar).
 * Pencere içindeki kayıplar = o bölgeye yönelik tüm savaşların (her iki saldıran, paralel/ardışık) yağma kayıpları toplamı
 * (yağma kapanış anında olur; pencere (başlangıç, başlangıç+24s]). Payda pencere içi EN YÜKSEK stoktur (pencere başı stok değil):
 * çevrimdışı oyuncunun üretimi stoğu pencere içinde büyütebilir ve tek savaşın %25 tavanlı kaybı başlangıç stokuna oranlanınca
 * tavanı aşmış görünür (ölçüm yapaylığı). Başlangıç stokuna göre (daha sıkı) oran ikincil olarak raporlanır. İki varyant ve tüm pencereler içinde en büyük değer > %25 -> KALDI.
 * Hiç yağma olmazsa (saldıran kazanmazsa) ölçülemez -> BELİRSİZ.
 * İkincil: tek savaş penceresi kaybı (değer ve mal başına), 48 saat kümülatif kayıp (bölge başına en büyük ve B toplamı; t0'daki stoka oranla),
 * reddedilen ilan sayısı, hedef başına en çok eşzamanlı savaş.
 */
import { GUN, SAAT, anlikMiktar } from "@bolge/cekirdek";
import type { Komut, SavasDurumu, Simulasyon } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { Bot } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { birlesikOzet, devletBolgeleri, karsilastir, komsuluk, say } from "./ortak";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H5_ESIK_PPM = 250_000;
/**
 * Karar karşılaştırması toleransı (ppm): stok anlık görüntüsü kapanıştan 1 ms önce alınır, çekirdek kaybı kapanış anındaki
 * stoktan hesaplar (1 ms üretim farkı + floor); tek savaşın tam tavan (%25) kaybı %25,01 görünmesin. Gerçek bir yığılma
 * (ikinci yağma ≈ +%19) bu tolerans içinde gizlenemez.
 */
export const H5_TOLERANS_PPM = 500;
/** Mal başına orana katılan en düşük anlık stok (mili-birim; 10 birim). */
const EN_AZ_STOK = 10_000;
/** Kayan pencere uzunluğu (PDF: "tek pencerede"; burada savaş penceresi değil, 24 saatlik kayan ölçüm penceresi). */
const KAYAN_PENCERE = 24 * SAAT;
/** İlan dalgası süresi (çevrimdışılık süresi). */
const DALGA = 48 * SAAT;
/** Son ilandan sonra savaşların çözülmesi için en çok ek süre (hazırlık ≤24s + pencere 24s + pay). */
const COZUM_EK = 72 * SAAT;
/** Stok anlık görüntü ızgarası. */
const ADIM = 15 * 60_000;
export type H5Varyant = "pasif" | "savunma_emri";

export interface H5Secenek extends HipotezSecenek {
  /** Hazırlık süresi, gün (vars. 8; kısa 8 — koruma bitmeli). */
  hazirlikGun?: number;
  /** En çok eşzamanlı (bitmemiş) savaş (vars. 16; kısa 6). */
  enCokSavas?: number;
  /** B'ye komşu üçüncü devletten ikinci saldıran oyuncu (vars. true; uygun devlet yoksa yok sayılır). */
  ikinciSaldiran?: boolean;
  varyantlar?: H5Varyant[];
  veri?: VeriPaketi;
}

/** Militarist botun kendi savaş ilanlarını süzer (H5'te ilanları koşucu verir). */
class IlansizBot implements Bot {
  constructor(private readonly ic: Bot) {}
  get oyuncu(): string {
    return this.ic.oyuncu;
  }
  get arketip(): Bot["arketip"] {
    return this.ic.arketip;
  }
  karar(sim: Simulasyon): Komut[] {
    return this.ic.karar(sim).filter((k) => k.tur !== "savas_ilan");
  }
}

/** t=0'da bir kez tüm bölgelere savunma duruşu verir, sonra pasiftir. */
class TekSavunmaBotu implements Bot {
  readonly arketip = "pasif" as const;
  private verildi = false;
  constructor(readonly oyuncu: string) {}
  karar(sim: Simulasyon): Komut[] {
    if (this.verildi) return [];
    this.verildi = true;
    return sim.dunya.bolgeler.filter((b) => b.sahip === this.oyuncu).map((b) => ({ tur: "savunma_emri" as const, bolge: b.id, durus: "savunma" as const }));
  }
}

/** Devletler arası ortak sınır kenarı sayıları: "a|b" (a < b) -> kenar sayısı. */
function sinirSayilari(veri: VeriPaketi): Record<string, number> {
  const devlet: Record<string, string> = {};
  for (const b of veri.harita.bolgeler) devlet[b.id] = b.devlet;
  const sayi: Record<string, number> = {};
  for (const k of veri.harita.kenarlar) {
    const a = devlet[k.a] as string;
    const b = devlet[k.b] as string;
    if (a === b) continue;
    const anahtar = a < b ? `${a}|${b}` : `${b}|${a}`;
    sayi[anahtar] = (sayi[anahtar] ?? 0) + 1;
  }
  return sayi;
}

/**
 * Komşu devlet çifti (A saldıran, B çevrimdışı). Çiftler ortak sınır kenarı sayısına göre azalan sıralanır; `tohum` k
 * için (k-1) mod min(3, çift sayısı) numaralı çift seçilir; her üç tohumda bir roller yer değiştirir (B saldıran olur).
 */
export function sinirCifti(veri: VeriPaketi, tohum = 1): [string, string] {
  const sayi = sinirSayilari(veri);
  const sirali = Object.keys(sayi).sort((x, y) => (sayi[y] as number) - (sayi[x] as number) || karsilastir(x, y));
  if (sirali.length === 0) throw new Error("H5: komsu devlet cifti yok");
  const havuz = Math.min(3, sirali.length);
  const indeks = (tohum - 1) % havuz;
  const tur = Math.floor((tohum - 1) / havuz) % 2;
  const [a, b] = (sirali[indeks] as string).split("|") as [string, string];
  return tur === 0 ? [a, b] : [b, a];
}

/** B'ye en çok ortak sınırı olan, A dışındaki komşu devlet (ikinci saldıran); yoksa null. */
export function ikinciSaldiranDevleti(veri: VeriPaketi, a: string, b: string): string | null {
  const sayi = sinirSayilari(veri);
  const adaylar: Array<{ devlet: string; kenar: number }> = [];
  for (const [anahtar, kenar] of Object.entries(sayi)) {
    const [x, y] = anahtar.split("|") as [string, string];
    if (x !== b && y !== b) continue;
    const diger = x === b ? y : x;
    if (diger !== a) adaylar.push({ devlet: diger, kenar });
  }
  adaylar.sort((x, y) => y.kenar - x.kenar || karsilastir(x.devlet, y.devlet));
  return adaylar[0]?.devlet ?? null;
}

/** Tek savaşın pencere sonucu (kapanıştan 1 ms önceki stoğa göre). */
interface Pencere {
  saldiran: string;
  saldiranBolge: string;
  hedefBolge: string;
  kazanan: string;
  saldiranGuc: number;
  savunanGuc: number;
  kayipOraniPpm: number;
  malBazliEnBuyukOranPpm: number;
  enBuyukMal: string;
  saldiranKazandi: boolean;
}

/** Yağma olayı: B'nin bir bölgesinden, bir savaşın kapanışında alınan stok. */
interface Olay {
  t: number;
  /** B bölgeleri listesindeki sıra. */
  r: number;
  kayip: number[];
}

/** B'nin bölgelerinin stok anlık görüntüsü: stok[r][mal] (mili-birim). */
interface Anlik {
  t: number;
  stok: number[][];
}

interface KayanSonuc {
  /** KARAR: kayıp / pencere içi (başlangıç dahil) en yüksek stok; değer ağırlıklı, ppm. */
  degerPpm: number;
  /** KARAR: mal başına en büyük kayıp / pencere içi en yüksek stok, ppm. */
  malPpm: number;
  /** İkincil (daha sıkı): kayıp / pencere BAŞI stok; üretim büyümesi oranı şişirebilir. */
  baslangicDegerPpm: number;
  baslangicMalPpm: number;
  /** Değer bazlı en kötü pencerenin bölgesi ve başlangıcı (t0'dan saat); mal = mal bazlı en kötü mal. */
  bolge: string;
  mal: string;
  baslangicSaat: number;
}

/**
 * Kayan 24 saatlik kayıp ölçümü (B'nin her bölgesi için ayrı). Pencere başlangıcı her anlık görüntü anıdır:
 * pencere = (s, s + 24 saat]; kayıp = pencerede kapanan TÜM savaşların (paralel/ardışık, her saldıran) yağması toplamı.
 * Payda = pencere içindeki (s dahil, s+24s'ye kadarki anlık görüntüler) EN YÜKSEK stok: çevrimdışı oyuncunun üretimi
 * pencere sırasında stoğu büyütebilir ve tek bir savaşın (çekirdek tavanı %25) kaybı pencere BAŞI stoğa oranlanınca
 * tavanı aşmış görünürdü (ölçüm yapaylığı); en yüksek stok bu yapaylığı dışlar, art arda yağmaları ise yine toplar
 * (iki %25'lik yağma ≈ %44). Pencere BAŞI stoğa göre oran ikincil olarak ayrıca döner.
 * Değer: taban fiyatla Σ kayıp / Σ stok (toplam değerin pencere içi en yükseği);
 * mal: stoku ≥ EN_AZ_STOK olan mallar içinde en büyük kayıp/stok. Dışa açık: birim testi için.
 */
export function kayanKayipOlc(
  anlikler: readonly Anlik[],
  olaylar: readonly Olay[],
  bolgeKimlikleri: readonly string[],
  mallar: readonly string[],
  taban: readonly number[],
  t0: number,
): KayanSonuc {
  const en: KayanSonuc = { degerPpm: 0, malPpm: 0, baslangicDegerPpm: 0, baslangicMalPpm: 0, bolge: "", mal: "", baslangicSaat: 0 };
  for (let i = 0; i < anlikler.length; i++) {
    const s = anlikler[i] as Anlik;
    for (let r = 0; r < bolgeKimlikleri.length; r++) {
      const kayip = new Array<number>(mallar.length).fill(0);
      let varMi = false;
      for (const o of olaylar) {
        if (o.r !== r || o.t <= s.t || o.t > s.t + KAYAN_PENCERE) continue;
        varMi = true;
        o.kayip.forEach((k, m) => {
          kayip[m] = (kayip[m] as number) + k;
        });
      }
      if (!varMi) continue;
      // Pencere içi en yüksek stok (mal başına) ve en yüksek toplam değer; başlangıç stoku ayrıca.
      const enStok = new Array<number>(mallar.length).fill(0);
      let enDeger = 0;
      for (let j = i; j < anlikler.length && (anlikler[j] as Anlik).t <= s.t + KAYAN_PENCERE; j++) {
        const st = ((anlikler[j] as Anlik).stok[r] as number[]);
        let dg = 0;
        for (let m = 0; m < mallar.length; m++) {
          enStok[m] = Math.max(enStok[m] as number, st[m] as number);
          dg += (st[m] as number) * (taban[m] as number);
        }
        enDeger = Math.max(enDeger, dg);
      }
      const bas = s.stok[r] as number[];
      let kd = 0;
      let bd = 0;
      let enMalPpm = 0;
      let enMal = "";
      let basMalPpm = 0;
      for (let m = 0; m < mallar.length; m++) {
        const k = kayip[m] as number;
        kd += k * (taban[m] as number);
        bd += (bas[m] as number) * (taban[m] as number);
        if (k <= 0) continue;
        if ((enStok[m] as number) >= EN_AZ_STOK) {
          const oran = Math.floor((k * 1_000_000) / (enStok[m] as number));
          if (oran > enMalPpm) {
            enMalPpm = oran;
            enMal = mallar[m] as string;
          }
        }
        if ((bas[m] as number) >= EN_AZ_STOK) basMalPpm = Math.max(basMalPpm, Math.floor((k * 1_000_000) / (bas[m] as number)));
      }
      const deger = enDeger > 0 ? Math.floor((kd * 1_000_000) / enDeger) : 0;
      const basDeger = bd > 0 ? Math.floor((kd * 1_000_000) / bd) : 0;
      en.baslangicMalPpm = Math.max(en.baslangicMalPpm, basMalPpm);
      en.baslangicDegerPpm = Math.max(en.baslangicDegerPpm, basDeger);
      if (enMalPpm > en.malPpm) {
        en.malPpm = enMalPpm;
        en.mal = enMal;
      }
      if (deger > en.degerPpm) {
        en.degerPpm = deger;
        en.bolge = bolgeKimlikleri[r] as string;
        en.baslangicSaat = say((s.t - t0) / SAAT, 2);
      }
    }
  }
  return en;
}

interface VaryantCiktisi {
  varyant: H5Varyant;
  saldiranlar: string[];
  pencereler: Pencere[];
  kabulEdilenIlan: number;
  reddedilenIlan: number;
  redNedenleri: Record<string, number>;
  enBuyukTekDegerOrani: number;
  enBuyukTekMalOrani: number;
  kayan: KayanSonuc;
  /** 48 saat (t0 .. t0+48s) kümülatif değer kaybı: bölge başına en büyük ve B toplamı (ppm, t0 stokuna oranla). */
  kumulatif48sBolge: number;
  kumulatif48sToplam: number;
  enCokParalelHedef: number;
  saldiranKazanma: number;
  savasSayisi: number;
  ozet: string;
  saldiranBirlik: number;
  hazirlikKomut: number;
}

function varyantKos(
  veri: VeriPaketi,
  tohum: number,
  varyant: H5Varyant,
  hazirlikGun: number,
  enCokSavas: number,
  ikinciSaldiran: boolean,
  ilerleme: (m: string) => void,
): VaryantCiktisi {
  const devletler = devletBolgeleri(veri.harita);
  const [da, db] = sinirCifti(veri, tohum);
  const dc = ikinciSaldiran ? ikinciSaldiranDevleti(veri, da, db) : null;
  const saldiranlar: Array<{ id: string; bolgeler: string[] }> = [{ id: "a", bolgeler: devletler[da] as string[] }];
  if (dc !== null) saldiranlar.push({ id: "c", bolgeler: devletler[dc] as string[] });
  const bBolgeler = devletler[db] as string[];
  const komsu = komsuluk(veri.harita);
  const bBot: Bot = varyant === "pasif" ? botOlustur("pasif", "b", tohum) : new TekSavunmaBotu("b");
  const r = kos({
    veri,
    tohum,
    oyuncular: [
      ...saldiranlar.map((s) => ({ id: s.id, bolgeler: s.bolgeler, bot: new IlansizBot(botOlustur("militarist", s.id, tohum)), katilmaMs: 0 })),
      { id: "b", bolgeler: bBolgeler, bot: bBot, katilmaMs: 0 },
    ],
    sureMs: hazirlikGun * GUN,
  });
  const sim = r.sim;
  const d = sim.dunya;
  const t0 = d.zaman;
  const mallar = veri.icerik.mallar.map((m) => m.id);
  const taban = sim.ic.mallar.map((m) => m.tabanFiyat / 1000);
  const bIdx = bBolgeler.map((id) => sim.ic.bolgeIndeks[id] as number);
  const bKume = new Set(bBolgeler);

  const onceki = new Set(d.savaslar.map((s) => s.id));
  const yeni: SavasDurumu[] = [];
  let kabul = 0;
  let red = 0;
  const redNedenleri: Record<string, number> = {};
  const anlikler: Anlik[] = [];
  const anlikAl = (): void => {
    anlikler.push({ t: d.zaman, stok: bIdx.map((i) => d.bolgeler[i]!.stoklar.map((st) => anlikMiktar(st, d.zaman))) });
  };

  /** Bir dalga turu: tüm uygun (saldıran bölge, B bölgesi) çiftleri, en güçlü saldıran önce. */
  const ilanTuru = (): void => {
    const cift: Array<{ o: string; a: string; h: string; guc: number }> = [];
    for (const sa of saldiranlar) {
      for (const ab of sa.bolgeler) {
        const b = d.bolgeler[sim.ic.bolgeIndeks[ab] as number]!;
        // Etkin güç = Σ adet×güç × ikmal karşılanma (ikmalsiz ordu güçsüzdür); saldıranlar buna göre sıralanır.
        const guc = (b.birlikler.reduce((t, x, i) => t + x * (sim.ic.birlikler[i]?.guc ?? 0), 0) * b.ikmalKarsilanmaPpm) / 1_000_000;
        if (guc <= 0) continue;
        for (const n of komsu[ab] ?? []) if (bKume.has(n)) cift.push({ o: sa.id, a: ab, h: n, guc });
      }
    }
    cift.sort((x, y) => y.guc - x.guc || karsilastir(x.o + x.a + x.h, y.o + y.a + y.h));
    for (const c of cift) {
      if (yeni.filter((s) => s.evre !== "bitti").length >= enCokSavas) break;
      const komut: Komut = { tur: "savas_ilan", saldiranBolge: c.a, hedefBolge: c.h };
      const s = sim.uygula({ t: d.zaman, oyuncu: c.o, komut });
      if (s.tamam) {
        kabul++;
        for (const sv of d.savaslar) {
          if (!onceki.has(sv.id)) {
            onceki.add(sv.id);
            yeni.push(sv);
          }
        }
      } else {
        red++;
        const neden = s.hata.replace(/-?\d+/g, "#");
        redNedenleri[neden] = (redNedenleri[neden] ?? 0) + 1;
      }
    }
  };

  // Dalga: t0'dan itibaren 48 saat boyunca her saat ilan turu; savaşlar bitene dek (en çok 120 saat) sim sürer.
  // Anlık görüntüler 15 dakikalık ızgarada ve her pencere kapanışından 1 ms önce/sonra alınır.
  let t = t0;
  let sonrakiIlan = t0;
  for (;;) {
    sim.calistirKadar(t);
    anlikAl();
    if (t >= sonrakiIlan && t <= t0 + DALGA) {
      ilanTuru();
      sonrakiIlan += SAAT;
    }
    const bitmeyen = yeni.filter((s) => s.evre !== "bitti");
    if (t >= t0 + DALGA && bitmeyen.length === 0) break;
    if (t >= t0 + DALGA + COZUM_EK) break;
    let sonraki = t0 + (Math.floor((t - t0) / ADIM) + 1) * ADIM;
    for (const s of bitmeyen) {
      if (s.pencereBitis - 1 > t) sonraki = Math.min(sonraki, s.pencereBitis - 1);
      if (s.pencereBitis > t) sonraki = Math.min(sonraki, s.pencereBitis);
    }
    t = sonraki;
  }
  const anlikAt = new Map(anlikler.map((a) => [a.t, a]));

  const pencereler: Pencere[] = [];
  const olaylar: Olay[] = [];
  let enBuyukTekDeger = 0;
  let enBuyukTekMal = 0;
  for (const s of yeni) {
    const sonuc = s.sonuc;
    if (!sonuc) continue;
    const once = anlikAt.get(s.pencereBitis - 1);
    const rIndeks = bIdx.indexOf(s.hedefBolge);
    let enBuyuk = 0;
    let enMal = "";
    sonuc.stokKaybi.forEach((k, m) => {
      const stok = once?.stok[rIndeks]?.[m] ?? 0;
      if (k <= 0 || stok < EN_AZ_STOK) return;
      const oran = Math.floor((k * 1_000_000) / Math.max(stok, k));
      if (oran > enBuyuk) {
        enBuyuk = oran;
        enMal = mallar[m] as string;
      }
    });
    if (sonuc.stokKaybi.some((k) => k > 0)) olaylar.push({ t: s.pencereBitis, r: rIndeks, kayip: sonuc.stokKaybi });
    enBuyukTekDeger = Math.max(enBuyukTekDeger, sonuc.kayipOraniPpm);
    enBuyukTekMal = Math.max(enBuyukTekMal, enBuyuk);
    pencereler.push({
      saldiran: s.saldiran,
      saldiranBolge: d.bolgeler[s.saldiranBolge]!.id,
      hedefBolge: d.bolgeler[s.hedefBolge]!.id,
      kazanan: sonuc.kazanan,
      saldiranGuc: sonuc.saldiranGuc,
      savunanGuc: sonuc.savunanGuc,
      kayipOraniPpm: sonuc.kayipOraniPpm,
      malBazliEnBuyukOranPpm: enBuyuk,
      enBuyukMal: enMal,
      saldiranKazandi: sonuc.kazanan === s.saldiran,
    });
  }

  const kayan = kayanKayipOlc(anlikler, olaylar, bBolgeler, mallar, taban, t0);

  // 48 saat kümülatif: yalnız t0 .. t0+48s arasında kapanan yağmalar, t0'daki stoka oranla.
  const deger = (kayip: readonly number[]): number => kayip.reduce((tp, k, m) => tp + k * (taban[m] as number), 0);
  const stok0 = (anlikler[0] as Anlik).stok;
  const bolgeKayip = new Array<number>(bBolgeler.length).fill(0);
  for (const o of olaylar) if (o.t <= t0 + DALGA) bolgeKayip[o.r] = (bolgeKayip[o.r] as number) + deger(o.kayip);
  let kumBolge = 0;
  let toplamKayip = 0;
  let toplamStok = 0;
  bBolgeler.forEach((_, i) => {
    const sd = deger(stok0[i] as number[]);
    toplamKayip += bolgeKayip[i] as number;
    toplamStok += sd;
    if (sd > 0) kumBolge = Math.max(kumBolge, Math.round(((bolgeKayip[i] as number) * 1_000_000) / sd));
  });

  // Hedef başına en çok eşzamanlı (bitmemiş) savaş: [ilan, pencereBitis) aralıklarının çakışması.
  let enCokParalel = 0;
  for (const h of new Set(yeni.map((s) => s.hedefBolge))) {
    const olay: Array<[number, number]> = [];
    for (const s of yeni) if (s.hedefBolge === h) olay.push([s.ilan, 1], [s.pencereBitis, -1]);
    olay.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
    let acik = 0;
    for (const [, dlt] of olay) {
      acik += dlt;
      enCokParalel = Math.max(enCokParalel, acik);
    }
  }

  ilerleme(`H5 tohum ${tohum} ${varyant}: ${kabul} ilan kabul, ${red} red, ${pencereler.length} pencere`);
  return {
    varyant,
    saldiranlar: saldiranlar.map((s) => s.id),
    pencereler,
    kabulEdilenIlan: kabul,
    reddedilenIlan: red,
    redNedenleri,
    enBuyukTekDegerOrani: enBuyukTekDeger,
    enBuyukTekMalOrani: enBuyukTekMal,
    kayan,
    kumulatif48sBolge: kumBolge,
    kumulatif48sToplam: toplamStok > 0 ? Math.round((toplamKayip * 1_000_000) / toplamStok) : 0,
    enCokParalelHedef: enCokParalel,
    saldiranKazanma: pencereler.filter((p) => p.saldiranKazandi).length,
    savasSayisi: yeni.length,
    ozet: sim.durumOzeti(),
    saldiranBirlik: saldiranlar.reduce(
      (tp, sa) => tp + sa.bolgeler.reduce((tt, id) => tt + d.bolgeler[sim.ic.bolgeIndeks[id] as number]!.birlikler.reduce((x, y) => x + y, 0), 0),
      0,
    ),
    hazirlikKomut: saldiranlar.reduce((tp, sa) => tp + (r.komutSayisi[sa.id] ?? 0), 0),
  };
}

export function h5Kos(secenek: H5Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const hazirlikGun = secenek.hazirlikGun ?? 8;
  const enCokSavas = secenek.enCokSavas ?? (secenek.kisa ? 6 : 16);
  const ikinciSaldiran = secenek.ikinciSaldiran ?? true;
  const varyantlar = secenek.varyantlar ?? (secenek.kisa ? ["pasif"] : ["pasif", "savunma_emri"]);
  const ilerleme = secenek.ilerleme ?? (() => {});

  const tohumBasina: TohumSonucu[] = [];
  const degerOranlari: number[] = [];
  const ayrintiTohum: Array<Record<string, unknown>> = [];
  for (const tohum of secenek.tohumlar) {
    const ciktilar = varyantlar.map((v) => varyantKos(veri, tohum, v, hazirlikGun, enCokSavas, ikinciSaldiran, ilerleme));
    const enBuyuk = Math.max(0, ...ciktilar.flatMap((c) => [c.kayan.degerPpm, c.kayan.malPpm]));
    const kazanma = ciktilar.reduce((t, c) => t + c.saldiranKazanma, 0);
    const verdict: Verdict = enBuyuk > H5_ESIK_PPM + H5_TOLERANS_PPM ? "kaldi" : kazanma === 0 ? "belirsiz" : "gecti";
    degerOranlari.push(enBuyuk / 1_000_000);
    tohumBasina.push({
      tohum,
      olcum: say(enBuyuk / 1_000_000),
      verdict,
      durumOzeti: birlesikOzet(ciktilar.map((c) => c.ozet)),
      ozet: {
        enBuyukKayan24s: say(enBuyuk / 1_000_000),
        varyantlar: ciktilar.map((c) => ({
          varyant: c.varyant,
          saldiranlar: c.saldiranlar,
          kabulEdilenIlan: c.kabulEdilenIlan,
          reddedilenIlan: c.reddedilenIlan,
          redNedenleri: c.redNedenleri,
          savasSayisi: c.savasSayisi,
          pencereSayisi: c.pencereler.length,
          saldiranKazanma: c.saldiranKazanma,
          enBuyukKayan24sDeger: say(c.kayan.degerPpm / 1_000_000),
          enBuyukKayan24sMal: say(c.kayan.malPpm / 1_000_000),
          enBuyukKayan24sDegerBaslangicStoku: say(c.kayan.baslangicDegerPpm / 1_000_000),
          enBuyukKayan24sMalBaslangicStoku: say(c.kayan.baslangicMalPpm / 1_000_000),
          kayanBolge: c.kayan.bolge,
          kayanMal: c.kayan.mal,
          kayanBaslangicSaat: c.kayan.baslangicSaat,
          enBuyukTekPencereDeger: say(c.enBuyukTekDegerOrani / 1_000_000),
          enBuyukTekPencereMal: say(c.enBuyukTekMalOrani / 1_000_000),
          kumulatifKayipBolge48s: say(c.kumulatif48sBolge / 1_000_000),
          kumulatifKayipToplam48s: say(c.kumulatif48sToplam / 1_000_000),
          enCokParalelHedef: c.enCokParalelHedef,
          saldiranBirlik: c.saldiranBirlik,
        })),
      },
    });
    ayrintiTohum.push({ tohum, varyantlar: ciktilar.map((c) => ({ varyant: c.varyant, pencereler: c.pencereler })) });
  }
  const n = tohumBasina.length;
  const ortalama = degerOranlari.reduce((t, x) => t + x, 0) / Math.max(1, n);
  const tum = tohumBasina.map((t) => t.verdict);
  const verdict: Verdict = tum.includes("kaldi") ? "kaldi" : tum.every((v) => v === "gecti") ? "gecti" : "belirsiz";
  return {
    kimlik: "H5",
    hipotez: "Çevrimdışı kayıp sınırlı: 48 saat çevrimdışı oyuncu, en kötü saldırı dalgasında bir bölgesinde 24 saatlik kayan pencerede %25'ten fazla stok kaybetmez",
    olcum: {
      ad: "B'nin bir bölgesinde en büyük 24 saatlik kayan pencere stok kaybı oranı",
      deger: say(ortalama),
      birim: "oran",
      aciklama:
        "48 saat boyunca paralel ve ardışık saldırı dalgası (aynı hedefe çok bölgeden, en çok iki saldıran oyuncudan); ölçüm: B'nin her bölgesi için herhangi bir 24 saatlik kayan pencerede toplam kayıp / pencere başı stok, " +
        "değer ağırlıklı ve mal başına en büyük; iki varyant ve tüm pencereler içinde maksimum. Tek savaş penceresi kaybı ve 48 saat kümülatif kayıp ikincil olarak raporlanır; reddedilen ilanlar sayılır.",
    },
    esik: { aciklama: "Herhangi bir bölgede herhangi bir 24 saatlik kayan pencerede herhangi bir kayıp oranı > %25 (+%0,05 ölçüm toleransı) ise vazgeç (kaldı)", deger: H5_ESIK_PPM / 1_000_000 },
    verdict,
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / Math.max(1, n),
    tohumBasina,
    ayrinti: { pencereler: ayrintiTohum },
    parametreler: {
      devletCiftiSecimi: "sinir kenari sayisina gore ilk 3 cift, tohum k icin (k-1) mod 3; her 3 tohumda roller yer degistirir",
      ciftler: secenek.tohumlar.map((t) => {
        const [x, y] = sinirCifti(veri, t);
        const c = ikinciSaldiran ? ikinciSaldiranDevleti(veri, x, y) : null;
        return `${x}${c ? `+${c}` : ""} -> ${y}`;
      }),
      hazirlikGun,
      enCokSavas,
      ikinciSaldiran,
      ilanDalgasiSaat: 48,
      kayanPencereSaat: 24,
      varyantlar,
      saldiranBot: "militarist (kendi savas ilani kapali; ilanlari koşucu verir, her saat tum uygun ciftler denenir)",
      hizli: secenek.hizli === true,
    },
    sureMs: Date.now() - basla,
  };
}
