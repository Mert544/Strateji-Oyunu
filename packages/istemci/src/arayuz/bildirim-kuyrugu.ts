/**
 * Bildirim kuyruğu (A5; saf): DOM'da AYNI ANDA yalnız bir bildirim bulunur (masaüstünde de; G9 §0.4, ilk saat B5). Gerisi bellekte sırada
 * bekler ve süresi GÖRÜNÜR olunca başlar (CSS ile gizleme yok: gizli bildirimin zamanlayıcısı akardı, f4 görünürlük bekler).
 *
 * Kurallar:
 * - Sıra gelişle; hata türü sıranın ÖNÜNE geçer (görünen bildirim bitince ilk o gösterilir; başka hata varsa onların arkasına).
 * - Sırada bekleyen varsa görünen bildirim en az `enAzMs` (okunabilirlik) sonra kapanır; sıra boşsa tam süresince kalır.
 * - Birleştirme: aynı `grup` adlı (ör. Defter) bildirimler, ilkinin geldiği andan `birlestirmeMs` içinde tek bildirimde toplanır
 *   (görünüyorsa metin yerinde güncellenir ve süresi yenilenir; sıradaysa sıradaki güncellenir).
 * - Sıra üst sınırı `enCokKuyruk`: aşılırsa en eski hata-olmayan bildirim düşer.
 * Saat ve zamanlayıcı enjekte edilir (sınama); çizim `Cizici` arayüzündedir.
 */
export type BildirimTuru = "tamam" | "hata" | "bilgi";

export interface GrupBilgisi {
  ad: string;
  /** Birleşen bildirim sayısı (ilk bildirim için 1). */
  n: number;
  /** Birleşen değerlerin toplamı (mili-₺; metin için). */
  deger: number;
  /** n ≥ 2 iken gösterilecek birleşik metin. */
  birlestir: (n: number, deger: number) => string;
}

export interface BildirimOgesi {
  mesaj: string;
  tur: BildirimTuru;
  grup?: GrupBilgisi;
}

export interface Cizici<H> {
  /** Bildirimi DOM'a koyar; tutamaç döner. */
  goster(oge: BildirimOgesi): H;
  /** Görünen bildirimin metnini yerinde günceller. */
  guncelle(h: H, oge: BildirimOgesi): void;
  /** Kapanış (çıkış hareketi); bitince `bitti` çağrılır ve DOM'dan kalkmış olmalıdır. */
  kapat(h: H, bitti: () => void): void;
}

export interface KuyrukSecenekleri<H> {
  cizici: Cizici<H>;
  simdi: () => number;
  zamanla: (f: () => void, ms: number) => () => void;
  /** Görünme süresi (ms), türe göre. */
  sure: (tur: BildirimTuru) => number;
  /** Sırada bekleyen varken en az görünme süresi (ms). Varsayılan 1500. */
  enAzMs?: number;
  /** Aynı grubun birleşme penceresi (ms). Varsayılan 2000. */
  birlestirmeMs?: number;
  /** Sıra üst sınırı. Varsayılan 8. */
  enCokKuyruk?: number;
}

interface Bekleyen {
  oge: BildirimOgesi;
  /** Bildirimin ilk geliş zamanı (birleşme penceresi buradan). */
  ilk: number;
}

export class BildirimKuyrugu<H> {
  private readonly cizici: Cizici<H>;
  private readonly simdi: () => number;
  private readonly zamanla: KuyrukSecenekleri<H>["zamanla"];
  private readonly sure: KuyrukSecenekleri<H>["sure"];
  private readonly enAzMs: number;
  private readonly birlestirmeMs: number;
  private readonly enCokKuyruk: number;
  private readonly sira: Bekleyen[] = [];
  private gorunen: { b: Bekleyen; h: H; basladi: number; iptal: () => void; erken: (() => void) | null } | null = null;
  private kapaniyor = false;

  constructor(s: KuyrukSecenekleri<H>) {
    this.cizici = s.cizici;
    this.simdi = s.simdi;
    this.zamanla = s.zamanla;
    this.sure = s.sure;
    this.enAzMs = s.enAzMs ?? 1500;
    this.birlestirmeMs = s.birlestirmeMs ?? 2000;
    this.enCokKuyruk = s.enCokKuyruk ?? 8;
  }

  /** Sırada bekleyen bildirim sayısı (görünen hariç; sınama). */
  get bekleyen(): number {
    return this.sira.length;
  }

  /** Görünen bildirimin metni (yoksa null; sınama). */
  get gorunenMesaj(): string | null {
    return this.gorunen?.b.oge.mesaj ?? null;
  }

  ekle(oge: BildirimOgesi): void {
    const t = this.simdi();
    if (oge.grup && this.birlestir(oge, t)) return;
    const b: Bekleyen = { oge: { ...oge, ...(oge.grup ? { grup: { ...oge.grup } } : {}) }, ilk: t };
    if (oge.tur === "hata") {
      // hata, sıradaki hata-olmayanların önüne (öteki hataların arkasına) girer
      const i = this.sira.findIndex((x) => x.oge.tur !== "hata");
      if (i < 0) this.sira.push(b);
      else this.sira.splice(i, 0, b);
    } else this.sira.push(b);
    while (this.sira.length > this.enCokKuyruk) {
      const i = this.sira.findIndex((x) => x.oge.tur !== "hata");
      this.sira.splice(i < 0 ? 0 : i, 1);
    }
    this.ilerlet();
  }

  /** Kullanıcı kapatma düğmesine bastı. */
  kapatGorunen(): void {
    const g = this.gorunen;
    if (!g || this.kapaniyor) return;
    g.iptal();
    g.erken?.();
    this.kapaniyor = true;
    this.cizici.kapat(g.h, () => {
      this.gorunen = null;
      this.kapaniyor = false;
      this.ilerlet();
    });
  }

  private birlestir(oge: BildirimOgesi, t: number): boolean {
    const grup = oge.grup!;
    const uygun = (b: Bekleyen): boolean => b.oge.grup?.ad === grup.ad && t - b.ilk <= this.birlestirmeMs;
    const hedefGorunen = this.gorunen && !this.kapaniyor && uygun(this.gorunen.b) ? this.gorunen : null;
    const hedef = hedefGorunen?.b ?? this.sira.find(uygun);
    if (!hedef?.oge.grup) return false;
    hedef.oge.grup.n += grup.n;
    hedef.oge.grup.deger += grup.deger;
    hedef.oge.mesaj = hedef.oge.grup.birlestir(hedef.oge.grup.n, hedef.oge.grup.deger);
    if (hedefGorunen) {
      this.cizici.guncelle(hedefGorunen.h, hedef.oge);
      // yeni içerik: süre yenilenir
      hedefGorunen.iptal();
      hedefGorunen.basladi = t;
      hedefGorunen.iptal = this.zamanla(() => this.kapatGorunen(), this.sure(hedef.oge.tur));
    }
    return true;
  }

  private ilerlet(): void {
    if (this.kapaniyor) return;
    const g = this.gorunen;
    if (g) {
      // Sırada bekleyen var: görünen en az `enAzMs` sonra kapanır (bir kez zamanlanır)
      if (this.sira.length > 0 && !g.erken) {
        const gecen = this.simdi() - g.basladi;
        g.erken = this.zamanla(() => this.kapatGorunen(), Math.max(0, this.enAzMs - gecen));
      }
      return;
    }
    const b = this.sira.shift();
    if (!b) return;
    const h = this.cizici.goster(b.oge);
    const basladi = this.simdi();
    const iptal = this.zamanla(() => this.kapatGorunen(), this.sure(b.oge.tur));
    this.gorunen = { b, h, basladi, iptal, erken: null };
    if (this.sira.length > 0) this.ilerlet();
  }
}
