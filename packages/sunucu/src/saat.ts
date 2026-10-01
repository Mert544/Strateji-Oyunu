/**
 * Sunucu sim saati: komutlara basılan `t` buradan gelir (istemci zamanı yok sayılır).
 * - `DuvarSaati` (varsayılan, `hiz = 1`): MUTLAK saat. `t = duvar saati − dunyaEpochMs` (docs/arastirma/
 *   canli-dunya-simulasyonu.md §2.2); sunucu kapalıyken de akar, açılışta `DunyaYazari` dünyayı şimdiye yetiştirir.
 *   Epoch dünyayla birlikte saklanır (anlık görüntü üst verisi) ve bir Türkiye gece yarısına hizalıdır (kalıcı UTC+3).
 *   Duvar saati geri giderse (NTP, elle ayar) `simdi()` ASLA geri gitmez: saat, eski değere yeniden ulaşana kadar
 *   olduğu yerde bekler (`gerideMs` > 0; yazar uyarı verir).
 * - `DuvarSaati` birikimli kip (`hiz ≠ 1` ya da `birikimli: true`): eski davranış; dünya yalnız sunucu açıkken akar
 *   (saat kurtarılan dünyanın zamanından başlar, `simdi = baslangic + ⌊(duvar − duvar0) × hiz⌋`). Hızlandırılmış
 *   geliştirme dünyaları içindir; mutlak saat hız çarpanıyla anlamsızdır (kapalı süre çarpılırdı).
 * - `ElleSaat`: yalnız `ilerlet` ile ilerler (testler ve elle sürülen geliştirme dünyası).
 *
 * Duvar saati işlevi (epoch ms) enjekte edilebilir: testler sahte saatle koşar, gerçek bekleme gerekmez. Çekirdeğe
 * `Date` sızmaz; yalnız bu dosya ve ağ katmanı duvar saatine bakar.
 */
import type { Ms } from "@bolge/cekirdek";

/** Türkiye kalıcı UTC+3 (2016'dan beri yaz saati yok): gün sınırı `(t + 3 sa) mod 24 sa`. */
export const TURKIYE_OFSETI_MS = 3 * 3_600_000;
const GUN_MS = 24 * 3_600_000;

/** Varsayılan dünya epoch'u: 2026-09-30T21:00Z = 1 Ekim 2026 00:00 TRT (docs/arastirma/canli-dunya-simulasyonu.md §2.2). */
export const VARSAYILAN_DUNYA_EPOCH_MS = 1_790_802_000_000;

/** `ms` anından önceki (ya da o ana eşit) en son Türkiye gece yarısı (epoch ms). */
export function turkiyeGeceYarisi(ms: number): number {
  return Math.floor((ms + TURKIYE_OFSETI_MS) / GUN_MS) * GUN_MS - TURKIYE_OFSETI_MS;
}

/** Epoch ms bir Türkiye gece yarısı mı. */
export function turkiyeGeceYarisiMi(ms: number): boolean {
  return Number.isSafeInteger(ms) && (((ms + TURKIYE_OFSETI_MS) % GUN_MS) + GUN_MS) % GUN_MS === 0;
}

export interface Saat {
  /** Şu anki hedef sim zamanı (ms, tamsayı). Mutlak saatte monoton: asla azalmaz. */
  simdi(): Ms;
  /** Sim ms / gerçek ms (elle saatte 0). */
  readonly hiz: number;
  /** Elle saat mi (zamanIlerlet yalnız bunda geçerli). */
  readonly elle: boolean;
  /** Mutlak saat mi: `t = duvar − dunyaEpochMs`; kapalıyken geçen süre yetiştirilir. */
  readonly mutlak: boolean;
  /** Şu anki duvar saati (epoch ms); elle saatte `null`. */
  duvarMs(): number | null;
  /** Duvar saati monoton korumasının gerisinde mi (ms; geri gitmediyse 0). */
  readonly gerideMs: number;
  /**
   * Saati başlatır (kurtarma sonrası). Mutlak saatte `dunyaEpochMs` zorunludur: `simdi()` bundan sonra
   * `max(simZamani, duvar − epoch)`'tir. Birikimli ve elle saatlerde saat `simZamani`'ndan başlar.
   */
  baslat(simZamani: Ms, dunyaEpochMs?: number): void;
}

function monotonMs(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

export interface DuvarSaatiSecenekleri {
  /**
   * Duvar saati kaynağı. Mutlak kipte epoch ms (varsayılan `Date.now`); birikimli kipte yalnız farklar kullanılır
   * (varsayılan monoton `hrtime`).
   */
  duvar?: () => number;
  /** Kapalıyken duran eski davranış. Varsayılan: `hiz ≠ 1`. */
  birikimli?: boolean;
}

export class DuvarSaati implements Saat {
  readonly elle = false;
  readonly mutlak: boolean;
  private readonly duvar: () => number;
  // Mutlak kip
  private epoch: number | null = null;
  private enYuksek = 0;
  // Birikimli kip
  private baslangic = 0;
  private duvar0 = 0;

  constructor(
    readonly hiz: number,
    secenek: DuvarSaatiSecenekleri | (() => number) = {},
  ) {
    if (!(hiz > 0)) throw new Error(`hiz pozitif olmali: ${hiz}`);
    const s: DuvarSaatiSecenekleri = typeof secenek === "function" ? { duvar: secenek, birikimli: true } : secenek;
    this.mutlak = !(s.birikimli ?? hiz !== 1);
    if (this.mutlak && hiz !== 1) throw new Error(`mutlak saat yalniz hiz 1 ile olur: ${hiz}`);
    this.duvar = s.duvar ?? (this.mutlak ? () => Date.now() : monotonMs);
    this.duvar0 = this.duvar();
  }

  duvarMs(): number | null {
    return this.mutlak ? this.duvar() : null;
  }

  get gerideMs(): number {
    if (!this.mutlak || this.epoch === null) return 0;
    return Math.max(0, this.enYuksek - this.ham());
  }

  private ham(): number {
    return Math.floor(this.duvar() - (this.epoch as number));
  }

  baslat(simZamani: Ms, dunyaEpochMs?: number): void {
    if (this.mutlak) {
      if (dunyaEpochMs === undefined || !Number.isSafeInteger(dunyaEpochMs)) throw new Error("mutlak saat icin dunyaEpochMs gerekli (tamsayi, epoch ms)");
      this.epoch = dunyaEpochMs;
      this.enYuksek = simZamani;
      return;
    }
    this.baslangic = simZamani;
    this.duvar0 = this.duvar();
  }

  simdi(): Ms {
    if (this.mutlak) {
      if (this.epoch === null) throw new Error("saat baslatilmadi");
      // Monoton koruma: duvar geri giderse (NTP) sim zamanı eski en yüksek değerde kalır.
      const h = this.ham();
      if (h > this.enYuksek) this.enYuksek = h;
      return this.enYuksek;
    }
    return this.baslangic + Math.floor(Math.max(0, this.duvar() - this.duvar0) * this.hiz);
  }
}

export class ElleSaat implements Saat {
  readonly elle = true;
  readonly mutlak = false;
  readonly hiz = 0;
  readonly gerideMs = 0;
  private t = 0;

  duvarMs(): number | null {
    return null;
  }

  baslat(simZamani: Ms): void {
    this.t = simZamani;
  }

  simdi(): Ms {
    return this.t;
  }

  /** Geri gidilemez; geçmişe istek yok sayılır. */
  ilerlet(t: Ms): void {
    if (!Number.isSafeInteger(t)) throw new RangeError(`gecersiz zaman: ${t}`);
    if (t > this.t) this.t = t;
  }
}
