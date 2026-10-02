/** Seçim veya kasa yetkisi vermeyen, sahibine özel ilçe meclisi katılım kartı. */
import { esc, sayi } from "../arayuz/bicim";
import { ikon } from "../tasarim/ikon";

export interface MeclisGorunumu {
  ilce: string;
  kayitliIlce?: string;
  kayitZamani?: number;
  etkinGunSayisi: number;
  gerekliGun: number;
  pencereGun: number;
  kayitliIlcedeArsa: boolean;
  buIlcedeArsa: boolean;
  katilimKosulu: boolean;
  kayitUygun: boolean;
  /** Sunucunun oyuncuya uygun kısa açıklaması. */
  engel?: string;
}

export interface MeclisKatilimParam {
  ilce: string;
  katilim?: MeclisGorunumu;
  bekliyor: boolean;
  sonuc?: string;
  hata?: boolean;
  ilceAdi: (id: string) => string;
  destek?: boolean;
}

const satir = (ad: string, deger: string): string => `<div><dt>${esc(ad)}</dt><dd>${esc(deger)}</dd></div>`;

/** Kayıt, etkinlik ve uygunluk sunucu görünümüdür; eylem/pending/ack sahibi İlçe panelidir. */
export function meclisKatilimHtml(p: MeclisKatilimParam): string {
  let h = `<section class="mk-panel" aria-label="İlçe meclisine katılım"><h4>${ikon("landmark", 18)} İlçe meclisine katılım</h4>`;
  h += '<p class="mk-secim">Seçimler henüz açık değil.</p>';
  if (p.sonuc) h += `<p class="mk-sonuc${p.hata ? " mk-hata" : ""}" role="${p.hata ? "alert" : "status"}">${esc(p.sonuc)}</p>`;
  const k = p.katilim;
  if (!k || k.ilce !== p.ilce) return h + '<p class="mk-bos">Meclis katılım bilgisi henüz alınmadı.</p></section>';
  const buradaKayitli = k.kayitliIlce === p.ilce;
  const tasima = k.kayitliIlce !== undefined && !buradaKayitli;
  const kayitAdi = k.kayitliIlce === undefined ? undefined : p.ilceAdi(k.kayitliIlce);
  h += '<div class="mk-kart"><dl class="mk-veri">';
  h += satir("Kayıtlı ilçe", kayitAdi ?? "Henüz kayıt yok");
  h += satir(`${p.ilceAdi(p.ilce)} ilçesinde arsan`, k.buIlcedeArsa ? "Var" : "Yok");
  if (kayitAdi !== undefined) {
    h += satir(`${kayitAdi} kaydının etkinliği`, `${sayi(k.etkinGunSayisi)} etkin gün · gereken ${sayi(k.gerekliGun)}`);
    h += satir("Etkinlik dönemi", `Son ${sayi(k.pencereGun)} oyun günü`);
  }
  h += "</dl>";
  if (buradaKayitli) {
    h += `<p class="mk-kosul${k.katilimKosulu ? " mk-saglandi" : ""}">${k.katilimKosulu ? `${ikon("check", 16)} Etkinlik koşulu sağlandı.` : k.kayitliIlcedeArsa ? `Etkinlik koşulu için son ${sayi(k.pencereGun)} oyun gününün ${sayi(k.gerekliGun)}’ünde etkin olmalısın.` : "Katılım koşulu için kayıtlı ilçende bir arsan bulunmalı."}</p>`;
  } else {
    if (tasima) h += '<p class="mk-tasima">Kaydı taşırsan önceki etkinlik günlerin sıfırlanır. Yeni ilçede bugünün kaydıyla başlanır.</p>';
    else h += `<p class="mk-kosul">Kaydolduktan sonra son ${sayi(k.pencereGun)} oyun gününün ${sayi(k.gerekliGun)}’ünde etkinlik kaydı gerekir.</p>`;
    const neden = p.bekliyor ? "Kayıt sonucu bekleniyor."
      : p.destek !== true ? "Kayıt için oyun sunucusuna bağlan."
      : !k.kayitUygun ? k.engel || "Bu ilçede sana ait bir arsa gerekiyor."
      : undefined;
    const onceki = esc(JSON.stringify(k.kayitliIlce ?? null));
    h += `<button type="button" class="mk-katil" data-meclis-eylem="katil" data-ilce="${esc(p.ilce)}" data-onceki-ilce="${onceki}"${neden ? ' disabled aria-disabled="true"' : ""}>${p.bekliyor ? "Kayıt bekleniyor…" : tasima ? "Kaydı bu ilçeye taşı" : "Bu ilçeye kaydol"}</button>`;
    if (neden) h += `<p class="mk-neden">${esc(neden)}</p>`;
  }
  h += `<details class="mk-detay" data-meclis-detay="${esc(p.ilce)}"><summary>Etkinlik nasıl sayılır?</summary><p>Kayıtlı ilçede arsan varsa, farklı oyun günlerindeki başarılı işlemlerin etkinlik kaydına sayılır. Bir oyun günü 24 saattir; aynı günün işlemleri tek gün sayılır. Otomatik satışlar bu kaydı artırmaz.</p><p>Bu kayıt ve etkinlik koşulu, oy hakkı veya kamu kasasını yönetme yetkisi vermez.</p></details></div></section>`;
  return h;
}
