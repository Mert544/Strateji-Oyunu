/**
 * Oyuncu başına token-kova hız sınırı (bağlantı başına değil: çok bağlantı açmak sınırı aşmaz). Duvar saatine
 * bağlıdır (sim saatine değil); dünyaya etkisi yoktur, yalnız komutun kabulünü belirler (reddedilen komut günlüğe girmez).
 */
export interface HizSiniriSecenekleri {
  /** Kova kapasitesi (ani yük). */
  kapasite: number;
  /** Saniyede dolan jeton. */
  saniyeBasina: number;
}

export const VARSAYILAN_HIZ_SINIRI: HizSiniriSecenekleri = { kapasite: 20, saniyeBasina: 5 };

interface Kova {
  jeton: number;
  son: number;
}

export class HizSiniri {
  private readonly kovalar = new Map<string, Kova>();

  constructor(
    private readonly s: HizSiniriSecenekleri = VARSAYILAN_HIZ_SINIRI,
    private readonly duvar: () => number = () => performance.now(),
  ) {}

  /** `bedel` jeton alınabildiyse true (ve düşer); değilse false (kova değişmez). */
  al(anahtar: string, bedel = 1): boolean {
    const simdi = this.duvar();
    let k = this.kovalar.get(anahtar);
    if (!k) {
      k = { jeton: this.s.kapasite, son: simdi };
      this.kovalar.set(anahtar, k);
    }
    k.jeton = Math.min(this.s.kapasite, k.jeton + ((simdi - k.son) / 1000) * this.s.saniyeBasina);
    k.son = simdi;
    if (k.jeton < bedel) return false;
    k.jeton -= bedel;
    return true;
  }

  /** Dolu kovaları atar (bellek sınırı; ara sıra çağrılır). */
  temizle(): void {
    const simdi = this.duvar();
    for (const [a, k] of this.kovalar) {
      if (k.jeton + ((simdi - k.son) / 1000) * this.s.saniyeBasina >= this.s.kapasite) this.kovalar.delete(a);
    }
  }
}
