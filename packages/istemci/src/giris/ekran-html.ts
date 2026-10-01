/**
 * Giriş ekranları iskeleti (G9-b; saf: DOM yok, dizge üretir): T1 arayüz sözleşmesi (`SP/takim/t1/g9-sozlesme.md` A bölümü) adları
 * (`#giris.gr`, `gr-*`, `data-ekran`, `data-durum`, `data-eylem`, `data-kod`) ve A1/T1 metin tablosu (`giris-metin.ts`).
 * K1 sınıf/stil satırı yazmaz (CSS T1'in `arayuz/giris.css`'i); durum öznitelikleri burada yazılır.
 *
 * Her çağrı YALNIZ etkin ekranın `<section class="gr-ekran" data-ekran=…>` bölümünü üretir. Geri sayım metinleri (`[data-sayim]`)
 * `sayimMetni` ile her saniye yerinde güncellenir (görünüm katmanı); tam yeniden çizim yalnız durum değişince olur.
 */
import { ikon } from "../tasarim/ikon";
import { esc, sureMetni } from "../arayuz/bicim";
import type { GirisDurumu } from "./akis";
import { AD_MAX, adCanliHatasi, adHataAnahtari, adOnizleme } from "./ad";
import { destekEpostasi, kvkkAdresi, metin, metinHam, metinVar, rizaMetni } from "./giris-metin";

export interface EkranBaglami {
  /** Geri sayım için kalan tam saniye (`GirisAkisi.kalanSn`). */
  kalanSn: (bitis: number) => number;
  /** g1 giriş alanının şimdiki değeri (yeniden çizimde korunur). */
  epostaDegeri: string;
  /** g4 görünen ad alanının şimdiki değeri (yeniden çizimde korunur; yoksa `durum.adGirdi`). */
  adDegeri?: string;
}

const dugmeAdi = (s: string): string => esc(s);

/** `m:ss` (geri sayım satırı). */
export function sayimMetni(sn: number): string {
  const d = Math.floor(sn / 60);
  const s = sn % 60;
  return `${d}:${String(s).padStart(2, "0")}`;
}

/** Maskeli adres (G-8): `ali@ornek.org` → `a***@ornek.org`. Yerel kısmı yoksa olduğu gibi. */
export function epostaMaske(eposta: string): string {
  const i = eposta.lastIndexOf("@");
  if (i < 1) return eposta;
  return `${eposta.slice(0, 1)}***${eposta.slice(i)}`;
}

/** İlk cümle ve kalanı (G-7 başlık/gövde ayrımı: `giris.G7.doldu` tek cümleler dizisidir). */
export function cumleBol(t: string): { ilk: string; kalan: string } {
  const i = t.indexOf(". ");
  if (i < 0) return { ilk: t.replace(/\.$/, ""), kalan: "" };
  return { ilk: t.slice(0, i), kalan: t.slice(i + 2) };
}

/** Yer tutucu `{ad}`'ı HTML ile değiştirir (metin kaçışlı, yer tutucu içeriği kaçışlı `html` olarak verilir). */
function yerHtml(t: string, yer: Readonly<Record<string, string>>): string {
  return t
    .split(/(\{[a-z_]+\})/)
    .map((p) => {
      const m = /^\{([a-z_]+)\}$/.exec(p);
      return m && m[1] !== undefined && m[1] in yer ? yer[m[1]]! : esc(p);
    })
    .join("");
}

function baslik(anahtar: string): string {
  return `<h1 id="gr-baslik" class="gr-baslik" tabindex="-1">${esc(metin(anahtar))}</h1>`;
}

/** Hata satırı (`role=alert`, `data-kod`); hız sınırı için dakika yer tutucusu. */
function hataSatiri(d: GirisDurumu, id: string): string {
  const h = d.hata;
  if (!h) return `<p id="${id}" class="gr-hata" role="alert"></p>`;
  const t = metin(h.anahtar, { n: h.dakika ?? 1 });
  return `<p id="${id}" class="gr-hata" role="alert" data-kod="${esc(h.kod)}">${esc(t)}</p>`;
}

function hizSayimi(d: GirisDurumu, b: EkranBaglami): string {
  const bitis = d.hata?.kod === "hiz_siniri" ? d.hata.bitis : undefined;
  if (bitis === undefined) return "";
  const sn = b.kalanSn(bitis);
  return sn > 0 ? `<p class="gr-sayim" data-sayim="hiz" data-saniye="${sn}">${sayimMetni(sn)}</p>` : "";
}

/** G-1: e-posta. */
function g1(d: GirisDurumu, b: EkranBaglami): string {
  const hata = d.hata;
  const hizda = hata?.kod === "hiz_siniri" && hata.bitis !== undefined && b.kalanSn(hata.bitis) > 0;
  const gonderiyor = d.gonderiyor;
  const hataAlan = hata && hata.eylem !== "yenile" ? "true" : "false";
  const kvkk = kvkkAdresi();
  const riza = rizaMetni();
  const dugmeDurum = gonderiyor ? ' data-durum="yukleniyor"' : "";
  return `<section class="gr-ekran" data-ekran="g1" data-durum="${gonderiyor ? "yukleniyor" : hizda ? "hiz" : hata ? "hata" : "bos"}" aria-labelledby="gr-baslik">
  ${baslik("giris.G1.baslik")}
  <p class="gr-govde">${esc(metin("giris.G1.alt"))}</p>
  ${d.cikisYapildi ? `<p class="gr-govde" role="status" data-kod="cikis">${esc(metin("giris.G8.sonuc"))}</p>` : ""}
  <form class="gr-form" novalidate autocomplete="on" data-eylem="baglanti-gonder-form">
    <div class="gr-alan">
      <label class="gr-etiket" for="gr-eposta">${esc(metin("giris.G1.alan"))}</label>
      <input id="gr-eposta" class="gr-girdi" type="email" name="email" autocomplete="email" autocapitalize="off" spellcheck="false" inputmode="email" required placeholder="${esc(metin("giris.G1.ornek"))}" value="${esc(b.epostaDegeri)}" aria-describedby="gr-hata-g1"${hata ? ` aria-invalid="${hataAlan}"` : ""}${hata ? ' data-durum="hata"' : ""}>
      ${hataSatiri(d, "gr-hata-g1")}
    </div>
    ${hizSayimi(d, b)}
    <div class="gr-eylemler">
      <button class="birincil gr-dugme" type="submit" data-eylem="baglanti-gonder"${dugmeDurum}${gonderiyor ? " disabled" : hizda ? ' aria-disabled="true"' : ""}>${dugmeAdi(metin(gonderiyor ? "giris.G1.gonderiliyor" : "giris.G1.dugme"))}</button>
    </div>
  </form>
  <p class="gr-kucuk">${esc(metin("giris.G1.kucuk_yazi"))}</p>
  ${riza !== "" ? `<p class="gr-kucuk" data-kod="riza">${esc(riza)}</p>` : ""}
  ${kvkk !== "" ? `<a class="gr-baglanti" data-eylem="veri-kullanimi" href="${esc(kvkk)}" target="_blank" rel="noopener noreferrer">${esc(metin("giris.G1.veri_baglanti"))}</a>` : ""}
</section>`;
}

/** G-2: postanı kontrol et. */
function g2(d: GirisDurumu, b: EkranBaglami): string {
  const gonderiyor = d.gonderiyor;
  const kalan = b.kalanSn(d.yenidenGonderBitis);
  const hata = d.hata;
  const hizda = hata?.kod === "hiz_siniri" && hata.bitis !== undefined && b.kalanSn(hata.bitis) > 0;
  const bekliyor = kalan > 0 || hizda;
  const durum = gonderiyor ? "gonderiyor" : bekliyor ? "bekliyor" : "hazir";
  const destek = destekEpostasi();
  const tekrarYazi = gonderiyor ? metin("giris.G2.gonderiliyor") : kalan > 0 ? metin("giris.G2.dugme_tekrar_bekle", { n: kalan }) : metin("giris.G2.dugme_tekrar");
  return `<section class="gr-ekran" data-ekran="g2" data-durum="${hata && !gonderiyor ? "hata" : durum}" aria-labelledby="gr-baslik">
  <span class="gr-simge" aria-hidden="true">${ikon("mail", 28)}</span>
  ${baslik("giris.G2.baslik")}
  <p class="gr-govde">${yerHtml(metinHam("giris.G2.govde"), { adres: `<b class="gr-adres">${esc(d.eposta)}</b>`, gecerlilik: esc(sureMetni(d.gecerlilikSn / 3600)) })}</p>
  <p class="gr-ipucu">${esc(metin("giris.G2.yeni_baglanti"))}</p>
  ${d.tekrarGonderildi && !gonderiyor ? `<p class="gr-ipucu" role="status" data-kod="tekrar-gonderildi">${esc(metin("giris.G2.tekrar_gonderildi"))}</p>` : ""}
  ${d.tekrarSiniri ? `<p class="gr-ipucu" data-kod="tekrar-siniri">${esc(metin("giris.G2.tekrar_siniri"))}</p>` : ""}
  ${d.tekrarSiniri && destek !== "" ? `<p class="gr-ipucu" data-kod="destek">${yerHtml(metinHam("giris.G2.destek"), { destek_eposta: `<a class="gr-baglanti" href="mailto:${esc(destek)}">${esc(destek)}</a>` })}</p>` : ""}
  <details class="gr-yardim"><summary>${esc(metin("giris.G2.yardim_baslik"))}</summary><p class="gr-yardim-metin">${esc(metin("giris.G2.yardim"))}</p></details>
  ${hataSatiri(d, "gr-hata-g2")}
  ${hizSayimi(d, b)}
  <div class="gr-eylemler">
    <button class="birincil gr-dugme" type="button" data-eylem="yeniden-gonder" data-sayim="tekrar"${gonderiyor ? ' data-durum="yukleniyor" disabled' : bekliyor ? ' aria-disabled="true"' : ""}>${dugmeAdi(tekrarYazi)}</button>
    <button class="eylem gr-dugme" type="button" data-eylem="adresi-degistir"${gonderiyor ? " disabled" : ""}>${dugmeAdi(metin("giris.G2.dugme_degistir"))}</button>
  </div>
</section>`;
}

/** G-3: bağlantı onayı (istemci sayfası: `?j=<jeton>`). */
function g3(d: GirisDurumu, b: EkranBaglami): string {
  const hata = d.hata;
  const gecersiz = hata !== null && !d.jetonVar;
  const gonderiyor = d.gonderiyor;
  const basari = d.basari;
  const hizda = hata?.kod === "hiz_siniri" && hata.bitis !== undefined && b.kalanSn(hata.bitis) > 0;
  const durum = gecersiz ? "gecersiz" : basari ? "basari" : gonderiyor ? "yukleniyor" : "bos";
  const birincil = gecersiz
    ? `<button class="birincil gr-dugme" type="button" data-eylem="yeni-baglanti-iste">${dugmeAdi(metin("giris.G3.yeni_iste"))}</button>`
    : `<button class="birincil gr-dugme" type="button" data-eylem="giris-yap"${gonderiyor || basari ? ' data-durum="yukleniyor" disabled' : hizda ? ' aria-disabled="true"' : ""}>${dugmeAdi(metin(gonderiyor || basari ? "giris.G3.giriliyor" : "giris.G3.dugme"))}</button>`;
  return `<section class="gr-ekran" data-ekran="g3" data-durum="${durum}" aria-labelledby="gr-baslik">
  ${baslik(gecersiz ? "giris.G3.gecersiz_baslik" : "giris.G3.baslik")}
  ${gecersiz ? "" : `<p class="gr-govde">${esc(metin("giris.G3.govde"))}</p>`}
  ${basari ? `<p class="gr-govde" role="status">${esc(metin("giris.G3.basari"))}</p>` : ""}
  ${hataSatiri(d, "gr-hata-g3")}
  ${hizSayimi(d, b)}
  <div class="gr-eylemler">${birincil}</div>
  ${gecersiz ? "" : `<p class="gr-kucuk">${esc(metin("giris.G3.baska_tarayici"))}</p>`}
</section>`;
}

/** Görünen ad alanı parçaları (g4 ve Ayarlar düzenleyicisi ortak): etiket, alan, sayaç, büyük harf notu, önizleme, hata. `ek` kimlik önekidir. */
export function adAlaniHtml(deger: string, hata: { anahtar: string; kod: string } | null, o: { yukleniyor: boolean; onek: string }): string {
  const canli = adCanliHatasi(deger);
  const goster = hata ?? (canli !== null ? { anahtar: adHataAnahtari(canli), kod: "ad_gecersiz" } : null);
  const onizleme = adOnizleme(deger);
  const id = `${o.onek}ad`;
  return `<div class="gr-alan">
      <label class="gr-etiket" for="${id}">${esc(metin("giris.G4.alan"))}</label>
      <input id="${id}" class="gr-girdi" type="text" name="ad" maxlength="${AD_MAX}" autocomplete="nickname" autocapitalize="off" spellcheck="false" value="${esc(deger)}" aria-describedby="${o.onek}ad-ipucu ${o.onek}ad-hata"${goster ? ` aria-invalid="true" data-durum="hata"` : ""}${o.yukleniyor ? ` aria-busy="true"` : ""}>
      <span class="gr-sayac" data-alan="ad-sayac">${esc(metin("giris.G4.sayac", { n: deger.length }))}</span>
      <p id="${o.onek}ad-ipucu" class="gr-ipucu">${esc(metin("giris.G4.buyuk_harf"))}</p>
      <p class="gr-onizleme" data-alan="ad-onizleme" aria-live="polite">${onizleme !== null ? esc(metin("giris.G4.onizleme", { ad: onizleme })) : ""}</p>
      <p id="${o.onek}ad-hata" class="gr-hata" role="alert"${goster ? ` data-kod="${esc(goster.kod)}"` : ""}>${goster ? esc(metin(goster.anahtar)) : ""}</p>
    </div>`;
}

/** G-4: görünen ad (yeni hesap ya da adı hiç seçilmemiş hesap). Alan sunucunun şimdiki adıyla dolu gelir; "Başka öner" yeni öneri, "Tamam" seçer. */
function g4(d: GirisDurumu, b: EkranBaglami): string {
  const deger = b.adDegeri ?? d.adGirdi;
  const gonderiyor = d.gonderiyor;
  const yukleniyor = d.adYukleniyor;
  const hata = d.hata ? { anahtar: d.hata.anahtar, kod: d.hata.kod } : null;
  const durum = gonderiyor ? "yukleniyor" : yukleniyor ? "oneri" : hata ? "hata" : "bos";
  return `<section class="gr-ekran" data-ekran="g4" data-durum="${durum}" aria-labelledby="gr-baslik">
  ${baslik("giris.G4.baslik")}
  <p class="gr-govde">${esc(metin("giris.G4.govde"))}</p>
  <form class="gr-form" novalidate data-eylem="ad-form">
    ${adAlaniHtml(deger, hata, { yukleniyor, onek: "gr-" })}
    ${yukleniyor ? `<p class="gr-ipucu" role="status" data-kod="oneri-yukleniyor">${esc(metin("giris.G4.oneri_yukleniyor"))}</p>` : ""}
    <div class="gr-eylemler">
      <button class="birincil gr-dugme" type="submit" data-eylem="ad-tamam"${gonderiyor ? ' data-durum="yukleniyor" disabled' : yukleniyor ? ' aria-disabled="true"' : ""}>${dugmeAdi(metin("giris.G4.dugme"))}</button>
      <button class="eylem gr-dugme" type="button" data-eylem="ad-oner"${gonderiyor ? " disabled" : yukleniyor ? ' aria-disabled="true"' : ""}>${ikon("refresh-cw", 16)} ${esc(metin("giris.G4.dugme_oner"))}</button>
    </div>
  </form>
</section>`;
}

/** G-7: oturum süresi doldu. */
function g7(): string {
  const { ilk, kalan } = cumleBol(metin("giris.G7.doldu"));
  return `<section class="gr-ekran" data-ekran="g7" aria-labelledby="gr-baslik">
  <h1 id="gr-baslik" class="gr-baslik" tabindex="-1">${esc(ilk)}</h1>
  <p class="gr-govde">${esc(`${kalan} ${metin("giris.G7.alt")}`.trim())}</p>
  <div class="gr-eylemler"><button class="birincil gr-dugme" type="button" data-eylem="yeniden-giris">${dugmeAdi(metin("giris.G7.dugme"))}</button></div>
</section>`;
}

/** G-5: yükleniyor (açılışta oturum sınanırken). */
function yukleniyor(): string {
  return `<section class="gr-ekran" data-ekran="g5" aria-labelledby="gr-baslik">
  <div class="gr-yukleniyor" role="status"><span class="ilerleme" aria-hidden="true"><i></i></span><p id="gr-baslik" class="gr-govde" tabindex="-1">${esc(metin("giris.G5.baglaniyor"))}</p></div>
</section>`;
}

/** Etkin ekranın kartı (`<main class="gr-kart">`); `oyun` ekranında kök gizlenir, bu işlev boş döner. */
export function girisHtml(d: GirisDurumu, b: EkranBaglami): string {
  let ekran = "";
  switch (d.ekran) {
    case "yukleniyor":
      ekran = yukleniyor();
      break;
    case "g1":
      ekran = g1(d, b);
      break;
    case "g2":
      ekran = g2(d, b);
      break;
    case "g3":
      ekran = g3(d, b);
      break;
    case "g4":
      ekran = g4(d, b);
      break;
    case "g7":
      ekran = g7();
      break;
    case "oyun":
      return "";
  }
  return `<main class="gr-kart"><div class="gr-marka">Bölge Stratejisi</div>${ekran}</main>`;
}

/** G-8: Ayarlar'daki hesap bölümü (e-posta maskeli) ve "tüm cihazlardan çık" onayı. */
/** Ayarlar'daki görünen ad satırı ve düzenleyicisi (G-4 Ayarlar satırı). */
export interface HesapAdi {
  /** Şimdiki ad (yoksa satır yazılmaz: sunucuda özellik kapalı). */
  ad: string | null;
  duzenle: boolean;
  /** Düzenleyici alan değeri ve hata (metin anahtarı). */
  girdi: string;
  hata: { anahtar: string; kod: string } | null;
  /** Günlük sınır dolu: "Değiştir" aria-disabled + `gunluk_sinir`. */
  sinir: boolean;
  /** Son başarılı değişiklik (`ayar_sonuc`). */
  sonuc: string | null;
  gonderiyor: boolean;
}

function hesapAdiHtml(a: HesapAdi): string {
  if (a.ad === null) return "";
  let s = `<p class="gr-hesap-ad">${esc(metin("giris.G4.ayar_satiri", { ad: a.ad }))}</p>`;
  if (!a.duzenle) {
    s += `<button class="eylem mini-dugme" type="button" data-eylem="ad-degistir"${a.sinir ? ' aria-disabled="true" aria-describedby="gr-hesap-ad-sinir"' : ""}>${esc(metin("giris.G4.ayar_degistir"))}</button>`;
    if (a.sinir) s += `<p id="gr-hesap-ad-sinir" class="gr-ipucu">${esc(metin("giris.G4.gunluk_sinir"))}</p>`;
    if (a.sonuc !== null) s += `<p class="gr-ipucu" role="status" data-kod="ad-sonuc">${esc(metin("giris.G4.ayar_sonuc", { ad: a.sonuc }))}</p>`;
    return s;
  }
  return (
    s +
    `<form class="gr-form" novalidate data-eylem="ad-ayar-form">${adAlaniHtml(a.girdi, a.hata, { yukleniyor: false, onek: "gr-hesap-" })}` +
    `<div class="gr-eylemler"><button class="birincil gr-dugme" type="submit" data-eylem="ad-kaydet"${a.gonderiyor ? ' data-durum="yukleniyor" disabled' : ""}>${esc(metin("giris.G4.dugme"))}</button>` +
    `<button class="eylem gr-dugme" type="button" data-eylem="ad-vazgec"${a.gonderiyor ? " disabled" : ""}>${esc(metin("giris.G8.vazgec"))}</button></div></form>`
  );
}

/** Ayarlar "Hesabı sil" akışı: onay sorusu, gönderim, sonuç ve hata (silme sunucunun onay sayfasındadır). */
export interface HesapSilme {
  onayAcik: boolean;
  gonderiyor: boolean;
  /** Onay bağlantısı gönderildi (`hesap_sil_sonuc`). */
  gonderildi: boolean;
  hata: { anahtar: string; dakika?: number; kod: string } | null;
}

function hesapSilHtml(h: HesapSilme): string {
  const dis = h.gonderiyor ? " disabled" : "";
  let s = `<button class="eylem" type="button" data-eylem="hesap-sil"${h.gonderiyor ? " disabled" : ""}>${esc(metin("giris.G8.hesap_sil"))}</button>`;
  if (h.gonderildi) s += `<p class="gr-ipucu" role="status" data-kod="hesap-sil-sonuc">${esc(metin("giris.G8.hesap_sil_sonuc"))}</p>`;
  if (h.hata) s += `<p class="gr-hata" role="alert" data-kod="${esc(h.hata.kod)}">${esc(metin(h.hata.anahtar, { n: h.hata.dakika ?? 1 }))}</p>`;
  if (h.onayAcik)
    s += `<div class="gr-onay" role="alertdialog" aria-modal="true" aria-labelledby="gr-sil-onay" data-giris-onay="hesap-sil"><p id="gr-sil-onay">${esc(metin("giris.G8.hesap_sil_onay"))}</p><button class="tehlike" type="button" data-eylem="hesap-sil-onayla"${dis}>${esc(metin("giris.G8.hesap_sil_gonder"))}</button><button class="eylem" type="button" data-eylem="hesap-sil-vazgec" data-varsayilan-odak="1">${esc(metin("giris.G8.vazgec"))}</button></div>`;
  return s;
}

export function hesapHtml(o: { eposta: string; onayAcik: boolean; cikiyor: boolean; ad?: HesapAdi; sil?: HesapSilme }): string {
  const destek = destekEpostasi();
  const dis = o.cikiyor ? " disabled" : "";
  return `<section class="gr-hesap" aria-label="${esc(metin("giris.G8.cikis"))}" data-giris-hesap>
  ${o.eposta !== "" ? `<p class="gr-hesap-eposta">${esc(metin("giris.G8.eposta_satiri", { adres: epostaMaske(o.eposta) }))}</p>` : ""}
  ${o.ad ? hesapAdiHtml(o.ad) : ""}
  <button class="eylem" type="button" data-eylem="cikis"${dis}>${ikon("log-out", 16)} ${esc(metin("giris.G8.cikis"))}</button>
  <button class="eylem" type="button" data-eylem="cikis-tumu"${dis}>${esc(metin("giris.G8.cikis_tumu"))}</button>
  ${o.sil ? hesapSilHtml(o.sil) : ""}
  ${destek !== "" ? `<p class="gr-ipucu">${yerHtml(metinHam("giris.G8.silme_bilgi"), { destek_eposta: `<a class="gr-baglanti" href="mailto:${esc(destek)}">${esc(destek)}</a>` })}</p>` : ""}
</section>${
    o.onayAcik
      ? `<div class="gr-onay" role="alertdialog" aria-modal="true" aria-label="${esc(metin("giris.G8.cikis_tumu"))}" data-giris-onay><p>${esc(metin("giris.G8.cikis_tumu_onay"))}</p><button class="tehlike" type="button" data-eylem="cikis-tumu-onayla"${dis}>${esc(metin("giris.G8.cikis_tumu"))}</button><button class="eylem" type="button" data-eylem="cikis-tumu-vazgec">${esc(metin("giris.G8.vazgec"))}</button></div>`
      : ""
  }`;
}

/** Sınama: bir hata anahtarının metni tabloda var mı. */
export const hataMetniVar = (anahtar: string): boolean => metinVar(anahtar);
