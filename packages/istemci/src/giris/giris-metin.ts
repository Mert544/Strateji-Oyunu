/**
 * Giriş ekranları metin tablosu (G9-b): A1'in metin tablosu, T1'in cümle düzenine çevrilmiş son hâli (`SP/takim/t1/g9-giris-metin-son.md`).
 * Anahtarlar A1'inkiyle birebir: `giris.G1.baslik`, hata anahtarları `giris.G6.<kod>` (kod = K2 `GirisHataKodu` + `ag_hatasi`,
 * `zaman_asimi`). Yer tutucular `{ad}` biçimindedir ve tek yerde doldurulur (`metin`). Metinler HİÇBİR YERDE kod içine yazılmaz.
 *
 * SAHİP METNİ, KOD DIŞINDA TEK YER: `giris.destek_eposta` ve `giris.kvkk_url` (baş lider kararı). İkisi de sahip söyleyene dek
 * BOŞTUR; boşken destek satırları ve veri kullanımı bağlantısı GÖSTERİLMEZ. Sahip söyleyince yalnız bu iki satır değişir.
 *
 * Sızdırmazlık: hiçbir metinde davetli olup olmama, hesabın varlığı, e-posta sınırı ya da posta sonucu ima edilmez.
 */

export const GIRIS_METIN = {
  "giris.G1.baslik": "Bölge Stratejisi'ne gir",
  "giris.G1.alt": "E-posta adresini yaz; sana bir giriş bağlantısı gönderelim. Parola gerekmez.",
  "giris.G1.alan": "E-posta adresin",
  "giris.G1.dugme": "Bağlantı gönder",
  "giris.G1.gonderiliyor": "Gönderiliyor…",
  "giris.G1.kucuk_yazi": "Adresin yalnız giriş için kullanılır. Başkalarına görünmez. Bölge Stratejisi şu an davetle açıktır.",
  "giris.G1.veri_baglanti": "Veri kullanımı",
  "giris.G1.riza": "{riza_metni}",
  "giris.G6.gecersiz_eposta": "Bu adres geçerli görünmüyor. Kontrol edip yeniden dene.",
  "giris.G6.gecici_eposta": "Geçici e-posta adresleri kabul edilmiyor. Kalıcı bir adres kullan.",
  "giris.G6.hiz_siniri": "Çok sık denendi. {n} dakika sonra yeniden dene.",
  "giris.G6.origin": "Giriş şu an yapılamıyor. Sayfayı yenileyip yeniden dene.",
  "giris.G6.gecersiz_istek": "Giriş şu an yapılamıyor. Sayfayı yenileyip yeniden dene.",
  "giris.G6.ic_hata": "Giriş şu an yapılamıyor. Biraz sonra yeniden dene.",
  "giris.G6.ag_hatasi": "Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.",
  "giris.G2.baslik": "Postanı kontrol et",
  "giris.G2.govde": "{adres} adresine bir giriş bağlantısı gönderdik. Bağlantı {gecerlilik} geçerli ve yalnız bir kez kullanılır.",
  "giris.G2.yardim_baslik": "Gelmedi mi?",
  "giris.G2.yardim": "Gelmediyse gereksiz ya da spam klasörüne bak. Adresi yanlış yazdıysan değiştir. Davet edildiğin adresi kullandığından emin ol.",
  "giris.G2.yeni_baglanti": "Yeni bağlantı gönderince eskisi geçersiz olur.",
  "giris.G2.dugme_degistir": "Adresi değiştir",
  "giris.G2.dugme_tekrar": "Yeniden gönder",
  "giris.G2.dugme_tekrar_bekle": "Yeniden gönder ({n} sn)",
  "giris.G2.tekrar_gonderildi": "Yeni bir bağlantı gönderdik.",
  "giris.G2.tekrar_siniri": "Birkaç kez gönderdin. Biraz bekleyip posta kutunu yeniden kontrol et.",
  "giris.G2.destek": "Hâlâ gelmediyse bize yaz: {destek_eposta}",
  "giris.G3.baslik": "Giriş yapıyorsun",
  "giris.G3.govde": "Bu bağlantıyla Bölge Stratejisi'ne gireceksin.",
  "giris.G3.dugme": "Giriş yap",
  "giris.G3.giriliyor": "Giriş yapılıyor…",
  "giris.G3.basari": "Giriş yaptın.",
  "giris.G3.baska_tarayici": "Başka bir tarayıcıdan oynamak istersen orada yeniden bağlantı iste.",
  "giris.G6.baglanti_gecersiz": "Bu bağlantı artık geçerli değil (kullanılmış ya da süresi dolmuş olabilir). Yeni bir bağlantı iste.",
  "giris.G6.tarayici_uyumsuz": "Bu bağlantıyı isteği yaptığın tarayıcıda aç.",
  "giris.G4.oneri_yukleniyor": "Sana bir ad hazırlıyoruz.",
  "giris.G4.baslik": "Sana ne diyelim?",
  "giris.G4.govde": "Bu ad dünyadaki herkese görünür. Gerçek adını yazman gerekmez. Adını günde bir kez değiştirebilirsin.",
  "giris.G4.alan": "Görünen adın",
  "giris.G4.sayac": "{n} / {en_cok}",
  "giris.G4.buyuk_harf": "Büyük harf yazabilirsin; adın küçük harfle kaydedilir.",
  "giris.G4.onizleme": "Dünyada böyle görünürsün: {ad}",
  "giris.G4.dugme": "Tamam",
  "giris.G4.dugme_oner": "Başka öner",
  "giris.G4.ad_yasakli": "Bu ad kullanılamaz; başka bir ad dene.",
  "giris.G4.uzunluk": "Ad {en_az} ile {en_cok} karakter arasında olmalı.",
  "giris.G4.karakter": "Adında yalnız harf, rakam, boşluk, nokta, kesme işareti, tire ve & kullanılabilir.",
  "giris.G4.bosluk_kenar": "Ad boşlukla başlayıp bitemez.",
  "giris.G4.bosluk_art_arda": "Art arda boşluk olamaz.",
  "giris.G4.harf_gerekli": "Adında en az bir harf olmalı.",
  "giris.G4.cift_tirnak_tire": "Çift tırnak ya da uzun tire yerine düz kesme işareti (') ve tire (-) kullan.",
  "giris.G4.gunluk_sinir": "Adını bugün zaten değiştirdin; yarın yeniden değiştirebilirsin.",
  "giris.G4.ayar_satiri": "Görünen adın: {ad}",
  "giris.G4.ayar_degistir": "Değiştir",
  "giris.G4.ayar_sonuc": "Adın güncellendi: {ad}",
  "giris.G5.baglaniyor": "Dünyana bağlanıyoruz.",
  "giris.G5.yeniden_baglaniyor": "Bağlantı kesildi. Yeniden bağlanıyoruz.",
  "giris.G7.doldu": "Oturumun doldu. Devam etmek için yeniden giriş yap.",
  "giris.G7.alt": "İlerlemen korunuyor; hesabın aynı kalır.",
  "giris.G7.dugme": "Giriş yap",
  "giris.G7.ayar_bitis": "Oturum bitişi: {tarih}",
  "giris.G8.cikis": "Çıkış yap",
  "giris.G8.cikis_tumu": "Tüm cihazlardan çık",
  "giris.G8.cikis_tumu_onay": "Hesabının bütün oturumları kapanır. Devam edilsin mi?",
  "giris.G8.sonuc": "Çıkış yaptın. Yeniden girmek için bağlantı iste.",
  "giris.G8.eposta_satiri": "E-posta: {adres}",
  "giris.G8.silme_bilgi": "Hesabını silmek istersen bize yaz: {destek_eposta}",
  // T1 arayüz sözleşmesinden (A1 tablosunda ayrı satırı yok): yer tutucu, g3 geçersiz bağlantı başlığı ve eylemi, çıkış onayı vazgeç
  "giris.G1.ornek": "ad@ornek.com",
  "giris.G2.gonderiliyor": "Gönderiliyor…",
  "giris.G3.gecersiz_baslik": "Bu bağlantı geçerli değil",
  "giris.G3.yeni_iste": "Yeni bağlantı iste",
  "giris.G8.vazgec": "Vazgeç",
  // Sahip metni (boş: ilgili satır gösterilmez)
  "giris.destek_eposta": "",
  "giris.kvkk_url": "",
} as const;

export type GirisMetinAnahtari = keyof typeof GIRIS_METIN;

/**
 * Metni başka bir anahtarla AYNI olan durumlar (T1 kararı): `zaman_asimi` metni `ag_hatasi` ile, `oturum_yok` metni G-7 "doldu" ile aynıdır.
 * Mantık katmanı (`hata.ts`) `giris.G6.<kod>` anahtarını verir; görünüm bu takma adlarla metne çözer.
 */
const TAKMA: Readonly<Record<string, string>> = {
  "giris.G6.zaman_asimi": "giris.G6.ag_hatasi",
  "giris.G6.oturum_yok": "giris.G7.doldu",
};

export function metinAnahtari(anahtar: string): string {
  return TAKMA[anahtar] ?? anahtar;
}

/** Yer tutucuları DOLDURULMAMIŞ metin (görünüm, yer tutucuyu HTML ile değiştirmek istediğinde). Bilinmeyen anahtar: anahtarın kendisi. */
export function metinHam(anahtar: string): string {
  return (GIRIS_METIN as Readonly<Record<string, string>>)[metinAnahtari(anahtar)] ?? anahtar;
}

/** `{ad}` yer tutucularını doldurur; bilinmeyen anahtar anahtarın kendisini döndürür (eksik metin ekranda sırıtır, test yakalar). */
export function metin(anahtar: string, yer: Readonly<Record<string, string | number>> = {}): string {
  const t = (GIRIS_METIN as Readonly<Record<string, string>>)[metinAnahtari(anahtar)];
  if (t === undefined) return anahtar;
  return t.replace(/\{([a-z_]+)\}/g, (tum, ad: string) => (ad in yer ? String(yer[ad]) : tum));
}

/** Metin tablosunda var mı (hata anahtarı eşlemesinin tam olduğunu sınamak için). */
export function metinVar(anahtar: string): boolean {
  return Object.prototype.hasOwnProperty.call(GIRIS_METIN, metinAnahtari(anahtar));
}

/** Sahip metni dolu mu (boşsa satır/bağlantı gösterilmez). */
export const destekEpostasi = (): string => GIRIS_METIN["giris.destek_eposta"];
export const kvkkAdresi = (): string => GIRIS_METIN["giris.kvkk_url"];
