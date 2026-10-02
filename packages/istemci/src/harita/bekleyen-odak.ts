/**
 * Bekleyen odak (saf): bir eylem (Pazar'da sat formunu aç, hızlı seçim, yöntem seçimi, formu kapatıp satıra dön) odağın ÇİZİMDEN SONRA belli bir öğeye verilmesini ister.
 * Kabuk yeniden çizimi erteleyebilir (fareyle basılıyken ya da bir form alanı odaktayken `icerikCiz`), bu yüzden hedef öğe eylem döndüğünde henüz DOM'da olmayabilir ya da
 * bir sonraki çizimle yeniden kurulabilir; `setTimeout(focus, 0)` bu durumda boşa gider (P13 f4:714). Burada istek tutulur ve her çizimden sonra (`cizildi`) hedef DOM'daysa odak verilir.
 *
 * - `iste`: isteği yazar ve hedef şimdi DOM'daysa hemen dener (çizim zaten yapılmışsa); istek yine de çizim görene kadar KALIR (eski düğüm yeniden kurulabilir).
 * - `cizildi`: çizimden sonra çağrılır; hedef DOM'daysa odaklar ve isteği temizler (bir kez); hedef yokken ya da süre dolmadan bekler; süre dolduysa unutur (oyuncu başka yere geçmiş olabilir: odak çalınmaz).
 */
export interface OdakHedefi {
  focus(): void;
}

export interface OdakKoku {
  querySelector(secici: string): OdakHedefi | null;
}

export class BekleyenOdak {
  private secici: string | null = null;
  private bitis = 0;

  /** `simdi`: ms saati (sınamada sahte); `omurMs`: isteğin geçerli kaldığı süre. */
  constructor(
    private readonly simdi: () => number,
    private readonly omurMs = 3000,
  ) {}

  get bekliyor(): boolean {
    return this.secici !== null && this.simdi() < this.bitis;
  }

  iste(secici: string, kok?: OdakKoku): void {
    this.secici = secici;
    this.bitis = this.simdi() + this.omurMs;
    kok?.querySelector(secici)?.focus();
  }

  cizildi(kok: OdakKoku): void {
    if (this.secici === null) return;
    if (this.simdi() >= this.bitis) {
      this.secici = null;
      return;
    }
    const e = kok.querySelector(this.secici);
    if (!e) return;
    this.secici = null;
    e.focus();
  }

  iptal(): void {
    this.secici = null;
  }
}
