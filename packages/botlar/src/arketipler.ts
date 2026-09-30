/**
 * Bot arketipleri: aday komutları kendi ağırlıklarıyla puanlayıp en fazla birkaçını seçen kural tabanlı botlar.
 * Hepsi deterministiktir: rastgelelik yalnızca tohumlu kendi PRNG'leriyle (küçük fayda sapması) gelir.
 */
import { SAAT, prngAralik, prngOlustur } from "@bolge/cekirdek";
import type { Komut, Ms, OyuncuId, PrngDurumu, Simulasyon } from "@bolge/cekirdek";
import type { ArketipAdi, Bot } from "./api";
import { askeriAdaylar, hedefGucKapasiteden, savunmaTepkiAdaylari } from "./askeri";
import type { AskeriSecenek } from "./askeri";
import {
  Bakis,
  adayiSec,
  arastirmaAdaylari,
  insaAdaylari,
  kenarAdaylari,
  ticaretAdaylari,
  vergiAdaylari,
  yontemAdaylari,
} from "./planlayici";
import type { Aday, AdayKategori, InsaSecenek, SecimSecenek, TicaretSecenek } from "./planlayici";

interface Profil {
  agirlik: Partial<Record<AdayKategori, number>>;
  ticaret: TicaretSecenek;
  insa?: (b: Bakis) => InsaSecenek;
  /** Askeri aday seçenekleri; null = askeri aday yok. */
  askeri?: (b: Bakis) => AskeriSecenek | null;
  /** Askeri adaylara uygulanan sıralama çarpanı (sivil adaylardan önce seçilmeleri için). */
  askeriCarpan?: number;
  maxKomut: number;
  kategoriSiniri?: SecimSecenek["kategoriSiniri"];
  /** Komut türüne göre yeniden deneme bekleme süresi (aynı anahtar + bölge). */
  bekleme: Partial<Record<AdayKategori, Ms>>;
  /** Tepkisel savunma (bana savaş ilan edilince) etkin mi. */
  tepkiSavunma: boolean;
}

const BEKLEME: Partial<Record<AdayKategori, Ms>> = {
  ticaret: 12 * SAAT,
  vergi: 48 * SAAT,
  rezerv: 48 * SAAT,
  savas: 24 * SAAT,
  savunma: 6 * SAAT,
  // Yöntem değişimi bir kez yapılınca 4 gün beklenir (git-gel salınımını önler).
  yontem: 96 * SAAT,
};

const PROFILLER: Record<"sanayici" | "tuccar" | "lojistikci" | "militarist", Profil> = {
  sanayici: {
    agirlik: { insa: 1.6, yontem: 1.3, arastir: 1.0, kenar: 0.5, ticaret: 0.3, vergi: 1 },
    ticaret: { ihracatEsigi: 0.35, ithalat: true },
    maxKomut: 4,
    bekleme: BEKLEME,
    tepkiSavunma: true,
  },
  tuccar: {
    agirlik: { insa: 0.7, yontem: 0.6, arastir: 0.4, kenar: 0.4, ticaret: 3, vergi: 1 },
    ticaret: { ihracatEsigi: 0.05, ithalat: true, carpan: 1 },
    maxKomut: 4,
    kategoriSiniri: { ticaret: 3 },
    bekleme: BEKLEME,
    tepkiSavunma: true,
  },
  lojistikci: {
    agirlik: { insa: 0.9, yontem: 0.7, arastir: 0.6, kenar: 4, ticaret: 0.4, vergi: 1 },
    ticaret: { ihracatEsigi: 0.3, ithalat: true },
    // Kapsam açıklarını kapatmak: açık mallara daha güçlü ağırlık.
    insa: (b) => ({ malAgirlik: (m) => (b.tb.askeri[m] ? 1 : 0.4 + 6 * (b.aciklik[m] as number)) }),
    maxKomut: 4,
    kategoriSiniri: { kenar: 2 },
    bekleme: BEKLEME,
    tepkiSavunma: true,
  },
  militarist: {
    agirlik: { insa: 0.8, yontem: 0.6, arastir: 0.6, kenar: 0.3, ticaret: 0.5, vergi: 1 },
    ticaret: { ihracatEsigi: 0.4, ithalat: true },
    askeri: (b) => ({
      hedefGuc: Math.max(600, hedefGucKapasiteden(b.sim, b, 0.25)),
      rezervPpm: 200_000,
      savas: true,
      savasEsigi: 1.3,
      savunmaDurusu: true,
    }),
    askeriCarpan: 1000,
    maxKomut: 4,
    kategoriSiniri: { birlik: 2, savunma: 2 },
    bekleme: BEKLEME,
    tepkiSavunma: true,
  },
};

/** Profil ağırlıklarıyla puanlanmış sivil adaylar (+ isteğe bağlı askeri). */
function adaylariUret(b: Bakis, p: Profil): Aday[] {
  const adaylar: Aday[] = [
    ...insaAdaylari(b, p.insa ? p.insa(b) : {}),
    ...yontemAdaylari(b),
    ...arastirmaAdaylari(b),
    ...kenarAdaylari(b),
    ...ticaretAdaylari(b, p.ticaret),
    ...vergiAdaylari(b),
  ].map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * (p.agirlik[a.kategori] ?? 1) }));
  if (p.askeri) {
    const s = p.askeri(b);
    if (s) {
      const c = p.askeriCarpan ?? 1;
      adaylar.push(...askeriAdaylar(b, s).map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * c })));
    }
  }
  if (p.tepkiSavunma) adaylar.push(...savunmaTepkiAdaylari(b));
  return adaylar;
}

/** Kural tabanlı bot: her karar çağrısında puanlı adaylardan en fazla `maxKomut` komut verir. */
class KuralBotu implements Bot {
  private readonly akis: PrngDurumu;
  private readonly sonZaman = new Map<string, Ms>();
  /** Tesis -> son yöntem değişimi (geri dönüş tespiti için). */
  private readonly yontemGecmisi = new Map<number, { onceki: string; yeni: string }>();
  /** "tesis|yöntem" -> yasağın bitiş anı: bir yönteme geçip kısa sürede geri dönülen tesiste yöntem bir süre denenmez. */
  private readonly yasak = new Map<string, Ms>();

  constructor(
    readonly oyuncu: OyuncuId,
    readonly arketip: ArketipAdi,
    tohum: number,
    private readonly profil: Profil,
  ) {
    this.akis = prngOlustur(tohum, `bot:${oyuncu}`);
  }

  karar(sim: Simulasyon): Komut[] {
    const b = this.bakisKur(sim);
    if (!b) return [];
    const secilen = this.sec(b, adaylariUret(b, this.profil), this.profil.maxKomut);
    return secilen.map((a) => a.komut);
  }

  protected bakisKur(sim: Simulasyon): Bakis | null {
    if (!sim.dunya.oyuncular.some((o) => o.id === this.oyuncu)) return null;
    const b = new Bakis(sim, this.oyuncu);
    return b.bolgeler.length === 0 ? null : b;
  }

  /** Küçük tohumlu sapma + bekleme süresi süzgeci + bütçeli seçim; seçilenleri kaydeder. */
  protected sec(b: Bakis, adaylar: Aday[], n: number, kategoriSiniri?: SecimSecenek["kategoriSiniri"]): Aday[] {
    const uygun: Aday[] = [];
    for (const a of adaylar) {
      if (a.komut.tur === "yontem_degistir") {
        const bitis = this.yasak.get(`${a.komut.tesis}|${a.komut.yontem}`);
        if (bitis !== undefined && b.t < bitis) continue;
      }
      const bekleme = this.profil.bekleme[a.kategori] ?? 0;
      // İptal komutları (çakışan ters yön emirleri, hazine koruması) bekleme süresine takılmaz.
      if (bekleme > 0 && !a.anahtar.includes("_iptal_")) {
        const son = this.sonZaman.get(a.kilit ?? `${a.anahtar}|${a.bolge ?? ""}`);
        if (son !== undefined && b.t - son < bekleme) continue;
      }
      // Sapma: ±%4 (aynı girdi, aynı tohum => aynı sonuç).
      const sapma = 0.96 + prngAralik(this.akis, 81) / 1000;
      uygun.push({ ...a, tahminiFayda: a.tahminiFayda * sapma });
    }
    const secilen = adayiSec(uygun, b, { n, kategoriSiniri: kategoriSiniri ?? this.profil.kategoriSiniri });
    for (const a of secilen) {
      this.sonZaman.set(a.kilit ?? `${a.anahtar}|${a.bolge ?? ""}`, b.t);
      if (a.komut.tur === "yontem_degistir") this.yontemKaydet(b, a.komut.bolge, a.komut.tesis, a.komut.yontem);
    }
    return secilen;
  }

  /** Yöntem değişimini kaydeder; hızlı geri dönüşte (ör. girdisi yetmeyen yöntem) eski yöntemi 25 gün yasaklar. */
  private yontemKaydet(b: Bakis, bolgeId: string, tesisId: number, yeni: string): void {
    const bolge = b.d.bolgeler[b.sim.ic.bolgeIndeks[bolgeId] as number];
    const ts = bolge?.tesisler.find((x) => x.id === tesisId);
    const mevcut = ts ? (b.sim.ic.yontemler[ts.yontem]?.id ?? "") : "";
    const onceki = this.yontemGecmisi.get(tesisId);
    if (onceki && onceki.onceki === yeni && onceki.yeni === mevcut) {
      this.yasak.set(`${tesisId}|${mevcut}`, b.t + 25 * 24 * SAAT);
    }
    this.yontemGecmisi.set(tesisId, { onceki: mevcut, yeni });
  }
}

/** Yalnızca akış kuran oyuncu: ilk çağrıda sanayici + tüccarın ilk planını verir, sonra hiç komut vermez. */
class KurVeUnutBotu extends KuralBotu {
  private verildi = false;

  constructor(oyuncu: OyuncuId, tohum: number) {
    super(oyuncu, "kur_ve_unut", tohum, { ...PROFILLER.sanayici, maxKomut: 10 });
  }

  override karar(sim: Simulasyon): Komut[] {
    if (this.verildi) return [];
    const b = this.bakisKur(sim);
    if (!b) return [];
    this.verildi = true;
    const san = PROFILLER.sanayici;
    const tuc = PROFILLER.tuccar;
    const adaylar: Aday[] = [
      ...insaAdaylari(b, {}),
      ...yontemAdaylari(b),
      ...arastirmaAdaylari(b),
      ...vergiAdaylari(b),
    ].map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * (san.agirlik[a.kategori] ?? 1) }));
    adaylar.push(
      ...ticaretAdaylari(b, tuc.ticaret).map((a) => ({ ...a, tahminiFayda: a.tahminiFayda * (tuc.agirlik.ticaret ?? 1) })),
    );
    return this.sec(b, adaylar, 10, { ticaret: 4, arastir: 1, vergi: 1 }).map((a) => a.komut);
  }
}

/** Hiç komut vermeyen bot (H5'te çevrimdışı oyuncu). */
class PasifBot implements Bot {
  readonly arketip = "pasif" as const;
  constructor(readonly oyuncu: OyuncuId) {}
  karar(): Komut[] {
    return [];
  }
}

export function arketipBotu(arketip: ArketipAdi, oyuncu: OyuncuId, tohum: number): Bot {
  switch (arketip) {
    case "sanayici":
    case "tuccar":
    case "lojistikci":
    case "militarist":
      return new KuralBotu(oyuncu, arketip, tohum, PROFILLER[arketip]);
    case "kur_ve_unut":
      return new KurVeUnutBotu(oyuncu, tohum);
    case "pasif":
      return new PasifBot(oyuncu);
  }
}

