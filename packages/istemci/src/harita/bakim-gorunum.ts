/** Oyuncunun bütün işletmelerini kapsayan bakım tercihinin saf görünümü. */
import { esc, sayi } from "../arayuz/bicim";

export type BakimDuzeyi = 0 | 1 | 2;
export interface BakimOnayi { oncekiDuzey: BakimDuzeyi; duzey: BakimDuzeyi }
export interface BakimDuzeyiEtkisi {
  duzey: BakimDuzeyi;
  girdiPpm?: number;
  /** Yapılandırmadan türeyen, bakım karşılandığında aktif tesisteki günlük değişim. */
  asinmaPpmGun?: number;
}
export interface BakimGorunumParam {
  duzey?: BakimDuzeyi;
  destek: boolean;
  etkiler: readonly BakimDuzeyiEtkisi[];
  onay: Readonly<BakimOnayi> | null;
  bekliyor: boolean;
  degisti: boolean;
  hata?: string;
  sonuc?: string;
}
export const BAKIM_ADLARI = ["Düşük", "Normal", "Yüksek"] as const;
export const bakimDuzeyiGecerli = (d: unknown): d is BakimDuzeyi => d === 0 || d === 1 || d === 2;

export function bakimGorunumuHtml(p: BakimGorunumParam): string {
  const biliniyor = bakimDuzeyiGecerli(p.duzey);
  let h = '<section class="bkp-panel" aria-label="Bütün işletmelerinin bakım tercihi"><h4 data-bakim-baslik tabindex="-1">Bakım tercihi</h4><p class="bkp-kapsam">Bütün illerdeki kendi işletmelerine uygulanır.</p>';
  h += `<p class="bkp-guncel">Güncel düzey: <strong>${biliniyor ? BAKIM_ADLARI[p.duzey!] : "Bilinmiyor"}</strong></p>`;
  if (!biliniyor) h += '<p class="bkp-bilgi">Sunucudan güncel bakım düzeyi alınmadan tercih değiştirilemez.</p>';
  else if (!p.destek) h += '<p class="bkp-bilgi">Bu bağlantıda bakım tercihi değiştirilemiyor.</p>';
  const kilitli = !biliniyor || !p.destek || p.bekliyor || p.onay !== null;
  const normalGirdiPpm = p.etkiler.find((e) => e.duzey === 1)?.girdiPpm;
  h += '<div class="bkp-duzeyler" role="group" aria-label="Bakım düzeyleri">';
  for (const duzey of [0, 1, 2] as const) {
    const etki = p.etkiler.find((e) => e.duzey === duzey);
    let aciklama = etki?.girdiPpm === undefined || normalGirdiPpm === undefined || normalGirdiPpm <= 0 ? "Bakım etkisi bilgisi alınmadı." : `Normal düzeye göre bakım girdisi ve aktif tesis işletme gideri ×${sayi(etki.girdiPpm / normalGirdiPpm, 2)}.`;
    if (etki?.asinmaPpmGun !== undefined) {
      const n = etki.asinmaPpmGun;
      aciklama += n === 0 ? " Bakım karşılanırsa günlük aşınma değişimi yok." : ` Bakım karşılanırsa aktif tesiste günlük aşınma ${n > 0 ? "+" : "−"}${sayi(Math.abs(n) / 10_000, 2)} yüzde puan.`;
    }
    const mevcut = biliniyor && p.duzey === duzey;
    h += `<button type="button" class="bkp-duzey" data-bakim-eylem="sec" data-duzey="${duzey}"${biliniyor ? ` data-onceki-duzey="${p.duzey}"` : ""} aria-pressed="${mevcut}"${kilitli || mevcut ? " disabled" : ""}><strong>${BAKIM_ADLARI[duzey]}${mevcut ? " · Güncel" : ""}</strong><span>${esc(aciklama)}</span></button>`;
  }
  h += '</div><p class="bkp-bilgi">Yüksek bakım anında onarım veya iyileşme garantisi değildir; bakım girdisi kıtlığı sonucu değiştirir. Duran tesiste bakım tüketimi sürer, günlük aşınma ve iyileşme işlemez.</p>';
  if (p.sonuc) h += `<p class="bkp-sonuc" role="status">${esc(p.sonuc)}</p>`;
  if (p.onay) {
    const o = p.onay;
    h += `<div class="bkp-onay" role="alertdialog" aria-labelledby="bkp-onay-baslik" aria-busy="${p.bekliyor}"><h5 id="bkp-onay-baslik">Bakım tercihini değiştir</h5><p class="bkp-bilgi">Gördüğün düzey: ${BAKIM_ADLARI[o.oncekiDuzey]} → ${BAKIM_ADLARI[o.duzey]}. Değişiklik bütün kendi işletmelerine uygulanır.</p>`;
    if (p.degisti) h += '<p class="bkp-hata" role="alert">Bakım düzeyi değişmiş veya güncel bilgi alınamamış. Vazgeçip yeni tercihi incele.</p>';
    if (p.bekliyor) h += '<p class="bkp-bilgi" role="status">Sunucu yanıtı bekleniyor.</p>';
    if (p.hata) h += `<p class="bkp-hata" role="alert">${esc(p.hata)}</p>`;
    h += `<div class="bkp-eylemler"><button type="button" class="bkp-dugme" data-bakim-eylem="vazgec" data-bakim-varsayilan-odak="1"${p.bekliyor ? " disabled" : ""}>Vazgeç</button><button type="button" class="bkp-dugme bkp-onayla" data-bakim-eylem="onayla" data-bakim-onayi="${esc(JSON.stringify(o))}"${p.bekliyor || p.degisti || !p.destek ? " disabled" : ""}>${BAKIM_ADLARI[o.duzey]} bakımı uygula</button></div></div>`;
  } else if (p.hata) h += `<p class="bkp-hata" role="alert">${esc(p.hata)}</p>`;
  return h + '</section>';
}
