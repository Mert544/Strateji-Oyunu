/** Sahibinin işletmelerinin son üretim hesabında kaydedilmiş rezervleri; depo stoku değildir. */
import { esc, sayi } from "../arayuz/bicim";

export interface RezervKaynakGorunumu {
  bolge: string;
  il: string;
  rezervKalan?: ReadonlyArray<readonly [mal: string, miktarMili: number]>;
}

export interface RezervGorunumParam {
  mal: string;
  /** Yokluk kaynak bilgisi alınmadı; [] bilinen işletme yok. */
  rezervler?: readonly RezervKaynakGorunumu[];
  ilAdi?: (il: string) => string;
}

/** Seçili malın maden rezervi kapsamı çağıran tarafından içerikten doğrulanır. */
export function rezervGorunumuHtml(p: RezervGorunumParam): string {
  let h = '<section class="rv-panel" aria-label="İşletmelerindeki kayıtlı yeraltı rezervi"><h5>Kaydedilmiş kalan rezerv</h5>';
  if (p.rezervler === undefined) return h + '<p class="rv-bilgi">— · Rezerv bilgisi henüz bilinmiyor.</p></section>';
  if (!p.rezervler.length) return h + '<p class="rv-bilgi">Kendi işletme kaynağın bulunmuyor.</p></section>';
  h += '<dl class="rv-kaynaklar">';
  for (const kaynak of p.rezervler) {
    const ad = p.ilAdi?.(kaynak.il);
    const ilAdi = ad && ad !== kaynak.il ? ad : "İşletmenin ili";
    const dizi = kaynak.rezervKalan;
    const gecerli = dizi !== undefined && dizi.every((r) => r.length === 2 && typeof r[0] === "string" && Number.isSafeInteger(r[1]) && r[1] >= 0);
    const eslesen = gecerli ? dizi.filter(([mal]) => mal === p.mal) : [];
    const miktar = eslesen.length === 1 ? eslesen[0]![1] : undefined;
    h += `<div data-rezerv-bolge="${esc(kaynak.bolge)}" data-rezerv-mal="${esc(p.mal)}"><dt>${esc(ilAdi)} · kendi işletmen</dt><dd${miktar === undefined ? '' : ` data-rezerv-miktar-mili="${miktar}"`}>${miktar === undefined ? '— <span class="rv-bilinmiyor">· Bilinmiyor</span>' : `${sayi(miktar / 1000, 3)} birim`}</dd></div>`;
  }
  return h + '</dl><p class="rv-bilgi">Son üretim hesabında kaydedilen değerdir; ildeki kendi işletmene aittir. Depo stoğundan ayrıdır, ortak ilçe veya parsel damarı değildir.</p></section>';
}
