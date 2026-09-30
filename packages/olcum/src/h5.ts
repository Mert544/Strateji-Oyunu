/**
 * H5 — Çevrimdışı kayıp sınırlı.
 *
 * Tanım: sentetik-50'de iki komşu devlet (en çok ortak sınır kenarı olan çift). Oyuncu A (militarist) bir devletin,
 * oyuncu B (çevrimdışı) diğer devletin tüm bölgelerini alır. İlk 8 gün (B'nin 7 günlük yeni oyuncu koruması biter)
 * A ekonomisini ve ordusunu kurar, B hiçbir şey yapmaz. 8. günde koşucu, A'nın birliği olan bölgelerinden B'nin
 * komşu bölgelerine (en çok 6) doğrudan savaş ilanı verir (A'nın botunun kendi ilanları bu koşuda kapalıdır).
 * B 48 saat hiçbir komut vermez; ilan hazırlığı 12-24 saat + 24 saatlik pencere = hepsi 48 saat içinde kapanır.
 * Her pencerenin kapanmasından 1 ms önce B'nin hedef bölge stokları anlık alınır; pencere sonucunda:
 *   tek pencere kayıp oranı = SavasSonucu.kayipOraniPpm (değer bazlı) ve mal başına en büyük oran (alınan / anlık stok).
 * İki varyant: "pasif" (B hiç emir vermez) ve "savunma_emri" (B t=0'da bir kez tüm bölgelerine savunma duruşu verir, sonra pasif).
 * Herhangi bir pencerede herhangi bir oran > %25 -> KALDI. Hiç yağma olmazsa (saldıran kazanmazsa) ölçülemez -> BELİRSİZ.
 */
import { GUN, SAAT, anlikMiktar } from "@bolge/cekirdek";
import type { Komut, Simulasyon } from "@bolge/cekirdek";
import { botOlustur, kos } from "@bolge/botlar";
import type { Bot } from "@bolge/botlar";
import { varsayilanVeriyiYukle } from "@bolge/veri";
import type { VeriPaketi } from "@bolge/veri";
import { stokDegeri } from "./metrik";
import { birlesikOzet, devletBolgeleri, komsuluk, say } from "./ortak";
import type { HipotezSecenek, HipotezSonucu, TohumSonucu, Verdict } from "./tipler";

export const H5_ESIK_PPM = 250_000;
/**
 * Mal başına oran için ölçüm toleransı (ppm): stok anlık görüntüsü kapanıştan 1 ms önce alınır ve çekirdek
 * kaybı kapanış anındaki stoktan floor ile hesaplar; küçük stoklarda 1-2 mili-birimlik fark oranı oynatabilir.
 * Değer bazlı oran (SavasSonucu.kayipOraniPpm) çekirdeğin kendi hesabıdır ve tolerans almaz.
 */
export const H5_TOLERANS_PPM = 500;
/** Mal başına orana katılan en düşük anlık stok (mili-birim; 10 birim). */
const EN_AZ_STOK = 10_000;
export type H5Varyant = "pasif" | "savunma_emri";

export interface H5Secenek extends HipotezSecenek {
  /** Hazırlık süresi, gün (vars. 8; kısa 8 — koruma bitmeli). */
  hazirlikGun?: number;
  /** En çok eşzamanlı savaş ilanı (vars. 6). */
  enCokSavas?: number;
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

/**
 * Komşu devlet çifti (A saldıran, B çevrimdışı). Çiftler ortak sınır kenarı sayısına göre azalan sıralanır; `tohum` k
 * için (k-1) mod min(3, çift sayısı) numaralı çift seçilir; her üç tohumda bir roller yer değiştirir (B saldıran olur).
 */
export function sinirCifti(veri: VeriPaketi, tohum = 1): [string, string] {
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
  const sirali = Object.keys(sayi).sort((x, y) => (sayi[y] as number) - (sayi[x] as number) || (x < y ? -1 : 1));
  if (sirali.length === 0) throw new Error("H5: komsu devlet cifti yok");
  const havuz = Math.min(3, sirali.length);
  const indeks = (tohum - 1) % havuz;
  const tur = Math.floor((tohum - 1) / havuz) % 2;
  const [a, b] = (sirali[indeks] as string).split("|") as [string, string];
  return tur === 0 ? [a, b] : [b, a];
}

interface Pencere {
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

interface VaryantCiktisi {
  varyant: H5Varyant;
  pencereler: Pencere[];
  enBuyukDegerOrani: number;
  enBuyukMalOrani: number;
  kumulatifKayipOrani: number;
  saldiranKazanma: number;
  savasSayisi: number;
  ozet: string;
  saldiranBirlik: number;
  hazirlikKomut: number;
}

function varyantKos(veri: VeriPaketi, tohum: number, varyant: H5Varyant, hazirlikGun: number, enCokSavas: number, ilerleme: (m: string) => void): VaryantCiktisi {
  const devletler = devletBolgeleri(veri.harita);
  const [da, db] = sinirCifti(veri, tohum);
  const aBolgeler = devletler[da] as string[];
  const bBolgeler = devletler[db] as string[];
  const komsu = komsuluk(veri.harita);
  const bBot: Bot = varyant === "pasif" ? botOlustur("pasif", "b", tohum) : new TekSavunmaBotu("b");
  const r = kos({
    veri,
    tohum,
    oyuncular: [
      { id: "a", bolgeler: aBolgeler, bot: new IlansizBot(botOlustur("militarist", "a", tohum)), katilmaMs: 0 },
      { id: "b", bolgeler: bBolgeler, bot: bBot, katilmaMs: 0 },
    ],
    sureMs: hazirlikGun * GUN,
  });
  const sim = r.sim;
  const d = sim.dunya;
  const t0 = d.zaman;

  // A'nın birlikli bölgelerinden B'nin komşu bölgelerine ilan (en güçlü saldıran önce).
  const cift: Array<{ a: string; h: string; guc: number }> = [];
  for (const ab of aBolgeler) {
    const b = d.bolgeler[sim.ic.bolgeIndeks[ab] as number]!;
    // Etkin güç = Σ adet×güç × ikmal karşılanma (ikmalsiz ordu güçsüzdür); saldıranlar buna göre sıralanır.
    const guc = (b.birlikler.reduce((t, x, i) => t + x * (sim.ic.birlikler[i]?.guc ?? 0), 0) * b.ikmalKarsilanmaPpm) / 1_000_000;
    if (guc <= 0) continue;
    for (const n of komsu[ab] ?? []) if (bBolgeler.includes(n)) cift.push({ a: ab, h: n, guc });
  }
  cift.sort((x, y) => y.guc - x.guc || (x.a + x.h < y.a + y.h ? -1 : 1));
  const onceki = new Set(d.savaslar.map((s) => s.id));
  let ilanlar = 0;
  const kullanilanHedef = new Set<string>();
  for (const c of cift) {
    if (ilanlar >= enCokSavas) break;
    if (kullanilanHedef.has(c.h)) continue; // her hedef bölgeye tek saldırı (tek-pencere ölçümü sade kalsın)
    const s = sim.uygula({ t: t0, oyuncu: "a", komut: { tur: "savas_ilan", saldiranBolge: c.a, hedefBolge: c.h } });
    if (s.tamam) {
      ilanlar++;
      kullanilanHedef.add(c.h);
    }
  }
  const yeniSavaslar = d.savaslar.filter((s) => !onceki.has(s.id));
  const bDegerBaslangic = stokDegeri(sim, bBolgeler);

  // Pencere kapanışları: her kapanıştan 1 ms önce B'nin hedef stoklarını al, sonra kapat.
  const kapanislar = [...new Set(yeniSavaslar.map((s) => s.pencereBitis))].sort((x, y) => x - y);
  const pencereler: Pencere[] = [];
  const mallar = veri.icerik.mallar.map((m) => m.id);
  let kumulatifKayipDeger = 0;
  for (const tk of kapanislar) {
    sim.calistirKadar(tk - 1);
    const anlik = new Map<number, number[]>();
    for (const s of yeniSavaslar.filter((x) => x.pencereBitis === tk)) {
      anlik.set(s.hedefBolge, d.bolgeler[s.hedefBolge]!.stoklar.map((st) => anlikMiktar(st, sim.dunya.zaman)));
    }
    sim.calistirKadar(tk);
    for (const s of yeniSavaslar.filter((x) => x.pencereBitis === tk)) {
      const sonuc = s.sonuc;
      if (!sonuc) continue;
      const once = anlik.get(s.hedefBolge) as number[];
      let enBuyuk = 0;
      let enMal = "";
      sonuc.stokKaybi.forEach((k, m) => {
        const stok = once[m] as number;
        if (k <= 0 || stok < EN_AZ_STOK) return;
        const oran = Math.floor((k * 1_000_000) / Math.max(stok, k));
        if (oran > enBuyuk) {
          enBuyuk = oran;
          enMal = mallar[m] as string;
        }
        kumulatifKayipDeger += (k / 1000) * ((sim.ic.mallar[m]?.tabanFiyat ?? 0) / 1000);
      });
      pencereler.push({
        saldiranBolge: d.bolgeler[s.saldiranBolge]!.id,
        hedefBolge: d.bolgeler[s.hedefBolge]!.id,
        kazanan: sonuc.kazanan,
        saldiranGuc: sonuc.saldiranGuc,
        savunanGuc: sonuc.savunanGuc,
        kayipOraniPpm: sonuc.kayipOraniPpm,
        malBazliEnBuyukOranPpm: enBuyuk,
        enBuyukMal: enMal,
        saldiranKazandi: sonuc.kazanan === "a",
      });
    }
  }
  sim.calistirKadar(t0 + 48 * SAAT);
  ilerleme(`H5 tohum ${tohum} ${varyant}: ${pencereler.length} pencere`);
  return {
    varyant,
    pencereler,
    enBuyukDegerOrani: Math.max(0, ...pencereler.map((p) => p.kayipOraniPpm)),
    enBuyukMalOrani: Math.max(0, ...pencereler.map((p) => p.malBazliEnBuyukOranPpm)),
    kumulatifKayipOrani: bDegerBaslangic > 0 ? Math.round((kumulatifKayipDeger * 1_000_000) / bDegerBaslangic) : 0,
    saldiranKazanma: pencereler.filter((p) => p.saldiranKazandi).length,
    savasSayisi: yeniSavaslar.length,
    ozet: sim.durumOzeti(),
    saldiranBirlik: aBolgeler.reduce((t, id) => t + d.bolgeler[sim.ic.bolgeIndeks[id] as number]!.birlikler.reduce((s, a) => s + a, 0), 0),
    hazirlikKomut: r.komutSayisi["a"] ?? 0,
  };
}

export function h5Kos(secenek: H5Secenek): HipotezSonucu {
  const basla = Date.now();
  const veri = secenek.veri ?? varsayilanVeriyiYukle();
  const hazirlikGun = secenek.hazirlikGun ?? 8;
  const enCokSavas = secenek.enCokSavas ?? (secenek.kisa ? 2 : 6);
  const varyantlar = secenek.varyantlar ?? (secenek.kisa ? ["pasif"] : ["pasif", "savunma_emri"]);
  const ilerleme = secenek.ilerleme ?? (() => {});

  const tohumBasina: TohumSonucu[] = [];
  const degerOranlari: number[] = [];
  const ayrintiTohum: Array<Record<string, unknown>> = [];
  for (const tohum of secenek.tohumlar) {
    const ciktilar = varyantlar.map((v) => varyantKos(veri, tohum, v, hazirlikGun, enCokSavas, ilerleme));
    const enBuyuk = Math.max(0, ...ciktilar.flatMap((c) => [c.enBuyukDegerOrani, Math.max(0, c.enBuyukMalOrani - H5_TOLERANS_PPM)]));
    const kazanma = ciktilar.reduce((t, c) => t + c.saldiranKazanma, 0);
    const verdict: Verdict = enBuyuk > H5_ESIK_PPM ? "kaldi" : kazanma === 0 ? "belirsiz" : "gecti";
    degerOranlari.push(enBuyuk / 1_000_000);
    tohumBasina.push({
      tohum,
      olcum: say(enBuyuk / 1_000_000),
      verdict,
      durumOzeti: birlesikOzet(ciktilar.map((c) => c.ozet)),
      ozet: {
        enBuyukTekPencereKayip: say(enBuyuk / 1_000_000),
        varyantlar: ciktilar.map((c) => ({
          varyant: c.varyant,
          savasSayisi: c.savasSayisi,
          pencereSayisi: c.pencereler.length,
          saldiranKazanma: c.saldiranKazanma,
          enBuyukDegerKayipOrani: say(c.enBuyukDegerOrani / 1_000_000),
          enBuyukMalKayipOrani: say(c.enBuyukMalOrani / 1_000_000),
          kumulatifKayipOrani48s: say(c.kumulatifKayipOrani / 1_000_000),
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
    hipotez: "Çevrimdışı kayıp sınırlı: 48 saat çevrimdışı oyuncu tek pencerede %25'ten fazla stok kaybetmez",
    olcum: {
      ad: "En büyük tek pencere kayıp oranı",
      deger: say(ortalama),
      birim: "oran",
      aciklama: "B'nin tek savaş penceresinde kaybettiği stok: değer bazlı (kayipOraniPpm) ve mal başına en büyük oran; tüm pencereler ve iki varyant içinde maksimum.",
    },
    esik: { aciklama: "Herhangi bir pencerede herhangi bir kayıp oranı > %25 ise vazgeç (kaldı)", deger: H5_ESIK_PPM / 1_000_000 },
    verdict,
    tohumBasariOrani: tohumBasina.filter((t) => t.verdict === "gecti").length / Math.max(1, n),
    tohumBasina,
    ayrinti: { pencereler: ayrintiTohum },
    parametreler: {
      devletCiftiSecimi: "sinir kenari sayisina gore ilk 3 cift, tohum k icin (k-1) mod 3; her 3 tohumda roller yer degistirir",
      ciftler: secenek.tohumlar.map((t) => sinirCifti(veri, t).join(" -> ")),
      hazirlikGun,
      enCokSavas,
      varyantlar,
      cevrimdisiSaat: 48,
      saldiranBot: "militarist (kendi savas ilani kapali; ilanlari koşucu verir)",
      hizli: secenek.hizli === true,
    },
    sureMs: Date.now() - basla,
  };
}
