/**
 * Sunucu sim saati: komutlara basılan `t` buradan gelir (istemci zamanı yok sayılır).
 * - `DuvarSaati`: monoton duvar saatine bağlı; `simdi = baslangic + ⌊(duvar − duvar0) × hiz⌋`.
 * - `ElleSaat`: yalnız `ilerlet` ile ilerler (testler ve elle sürülen geliştirme dünyası).
 * Kurtarmadan sonra saat kurtarılan dünyanın zamanından başlar (sunucu kapalıyken dünya durur; bkz. sunucu-tasarimi.md).
 */
import type { Ms } from "@bolge/cekirdek";

export interface Saat {
  /** Şu anki hedef sim zamanı (ms, tamsayı, monoton artmayan değil). */
  simdi(): Ms;
  /** Sim ms / gerçek ms (elle saatte 0). */
  readonly hiz: number;
  /** Elle saat mi (zamanIlerlet yalnız bunda geçerli). */
  readonly elle: boolean;
  /** Saati verilen sim zamanından başlatır (kurtarma sonrası). */
  baslat(simZamani: Ms): void;
}

function monotonMs(): number {
  return Number(process.hrtime.bigint() / 1_000_000n);
}

export class DuvarSaati implements Saat {
  readonly elle = false;
  private baslangic = 0;
  private duvar0 = monotonMs();

  constructor(
    readonly hiz: number,
    private readonly duvar: () => number = monotonMs,
  ) {
    if (!(hiz > 0)) throw new Error(`hiz pozitif olmali: ${hiz}`);
  }

  baslat(simZamani: Ms): void {
    this.baslangic = simZamani;
    this.duvar0 = this.duvar();
  }

  simdi(): Ms {
    return this.baslangic + Math.floor(Math.max(0, this.duvar() - this.duvar0) * this.hiz);
  }
}

export class ElleSaat implements Saat {
  readonly elle = true;
  readonly hiz = 0;
  private t = 0;

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
