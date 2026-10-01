/**
 * Bölge adı etiketleri (HTML yerleşimi, LOD): uzaktayken gizli; yaklaştıkça önce büyük (nüfuslu) bölgeler.
 * Sakin görsel: aynı anda en çok ETIKET_EN_COK etiket; arka yarımküredekiler ve çakışanlar (geniş bir boşlukla)
 * gösterilmez; seçili bölge her zaman gösterilir.
 */
import type { KameraKontrol } from "../kamera/kontrol";
import type { Vek3 } from "../kure/matematik";
import { olcekle } from "../kure/matematik";

/** Ekranda aynı anda en çok bu kadar bölge etiketi (yakınlaşma ne olursa olsun). */
export const ETIKET_EN_COK = 14;

/** Yakınlaşmaya (kamera uzaklığı) göre izin verilen etiket sayısı. */
export function etiketSayisi(dist: number, toplam: number): number {
  if (dist > 1.4) return 0;
  if (dist > 0.9) return Math.min(toplam, 4);
  if (dist > 0.55) return Math.min(toplam, 8);
  if (dist > 0.3) return Math.min(toplam, 11);
  return Math.min(toplam, ETIKET_EN_COK);
}

export class Etiketler {
  private oge: HTMLElement[] = [];
  private sira: number[];
  private sonSurum = -1;
  private sonSecili = -2;
  private sonZaman = 0;

  constructor(
    private kap: HTMLElement,
    private adlar: () => string[],
    private merkezler: readonly Vek3[],
    nufus: readonly number[],
  ) {
    this.sira = nufus.map((_, i) => i).sort((a, b) => (nufus[b] ?? 0) - (nufus[a] ?? 0));
    const a = adlar();
    for (let i = 0; i < merkezler.length; i++) {
      const e = document.createElement("div");
      e.className = "bolge-etiket";
      e.textContent = a[i] ?? "";
      e.hidden = true;
      kap.appendChild(e);
      this.oge.push(e);
    }
  }

  adlariYenile(): void {
    const a = this.adlar();
    this.oge.forEach((e, i) => {
      if (e.textContent !== (a[i] ?? "")) e.textContent = a[i] ?? "";
    });
  }

  guncelle(k: KameraKontrol, secili: number, simdi: number): void {
    if (k.surum === this.sonSurum && secili === this.sonSecili) return;
    if (simdi - this.sonZaman < 60 && secili === this.sonSecili) return;
    this.sonSurum = k.surum;
    this.sonSecili = secili;
    this.sonZaman = simdi;
    const izinli = etiketSayisi(k.durum.dist, this.sira.length);
    const boyut = k.boyutPx;
    const dolu: Array<[number, number, number, number]> = [];
    let gosterilen = 0;
    const adaylar = secili >= 0 ? [secili, ...this.sira.filter((i) => i !== secili)] : this.sira;
    const gorunur = new Set<number>();
    for (const i of adaylar) {
      const zorunlu = i === secili;
      if (!zorunlu && gosterilen >= izinli) continue;
      const c = this.merkezler[i] as Vek3;
      if (!k.onYuzde(c)) continue;
      const p = k.ekranaProje(olcekle(c, 1.01));
      if (!p || p.x < -40 || p.y < -20 || p.x > boyut.w + 40 || p.y > boyut.h + 20) continue;
      const e = this.oge[i] as HTMLElement;
      // Geniş çakışma kutusu: etiketler arasında hava kalsın.
      const gen = (e.textContent?.length ?? 6) * 6.4 + 36;
      const r: [number, number, number, number] = [p.x - gen / 2, p.y + 4, p.x + gen / 2, p.y + 34];
      if (!zorunlu && dolu.some((d) => r[0] < d[2] && r[2] > d[0] && r[1] < d[3] && r[3] > d[1])) continue;
      dolu.push(r);
      gosterilen++;
      gorunur.add(i);
      e.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px) translate(-50%, 8px)`;
      e.classList.toggle("secili", zorunlu);
    }
    this.oge.forEach((e, i) => {
      const g = gorunur.has(i);
      if (e.hidden === g) e.hidden = !g;
    });
  }
}
