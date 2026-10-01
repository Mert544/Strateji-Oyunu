# G9-c: görünen ad (G-4), Ayarlar ad satırı, D-7 marka formu, Hesabı sil (K1)

Dal `takim/k1/g9c-gorunen-ad` (taban `takim/k1/dukkan-duzelt` 6e4b227). Kapı durumu: Playwright ve pnpm dunya koşulmadı (kapı koşuyordu). Doğrulama: istemci tsc ve eslint temiz; tek dosya, tek işçi vitest: giris-ad 21, giris-mantik 51, giris-ekran 23, giris-ws 17 (gerçek sunucu, adKurali açık), harita-dukkan-html 47, harita-dukkan-metin 6, harita-dukkan-veri 11, mulk-panel 8, tasarim-metin 12 geçti.

## Yapılanlar

1. **G-4 (`giris/akis.ts`, `ekran-html.ts`, `gorunum.ts`)**: sunucu onay/ben yanıtında `adSecildi === false` ise g4 (yeni hesap ya da adı hiç seçilmemiş hesap, sayfa yenilense de); alan sunucunun otomatik adıyla dolu gelir, "Başka öner" `GET /giris/ad-oner` (kaydetmez; hız sınırı g4'te alan hatası), "Tamam" `POST /giris/ad` (sunucu kanonik küçük harfe çevirir) sonra oyun. Ad alanı yoksa (sunucuda özellik kapalı) g4 görünmez. Yazarken alan ezilmez (`adSurumu`), sayaç/küçük hâl önizlemesi/canlı hata yerinde güncellenir. `ad_gecersiz`, `ad_yasakli`, `ad_sinir`, `oturum_yok` (G-7) eşlendi.
2. **İstemci ad denetimi (`giris/ad.ts`)**: çekirdek `adKanonik` kuralı ve sabit Türkçe tablonun KOPYASI (çekirdek içe aktarılmaz: giris.js boyutu); `giris-ad.test` kopyayı çekirdekle bir örnek kümesinde sınar. Hata türleri `giris.G4.*` anahtarına çevrilir; çift tırnak ve uzun tire ayrı ileti.
3. **Ayarlar ad satırı**: "Görünen adın: {ad}" + "Değiştir" (aynı alan parçaları, Tamam/Vazgeç); günlük sınır dolunca `aria-disabled` + `gunluk_sinir`; sonuç `ayar_sonuc`.
4. **Rıza sahip metni**: `giris.riza_metni` boş sabit (`giris-metin.ts`), G-1'de `.gr-kucuk` altında; boşsa satır yok.
5. **D-7 marka formu (`harita/dukkan-html.ts` `markaFormuHtml`)**: dialog, alan, sayaç, tabela önizlemesi, canlı hata (çekirdek kuralı), simge ve renk `radiogroup` (roving tabindex, `MARKA_SIMGELERI`, 12 renk, `--renk:var(--oyuncu-N)`), tek birincil Kaydet, "Şimdilik markasız" (K1 ek anahtarı `D7.markasiz_dugme`). Akışa bağlanmadı (G7 marka komutu köprüsüyle).
6. **Hesabı sil (Ayarlar)**: düğme, onay sorusu (alertdialog; Vazgeç varsayılan odak), `POST /giris/hesap-sil` (gövdesiz, `credentials: "same-origin"`), 202 sonrası "Onay bağlantısı e-postana gönderildi." bildirimi ve kalıcı durum satırı; hata satır içi (`hiz_siniri` dakika, `oturum_yok` G-7). İstemci hiçbir şey silmez; silme sunucunun onay sayfasındadır. Metinler K1 GEÇİCİ anahtarlar (`giris.G8.hesap_sil*`; T1 onaylayınca değişir).

## Boyut

Kaba ölçüm (esbuild bundle + minify + gzip, `giris/baslat.ts` girişi): 10,7 KB → 15,3 KB. Bu sayı `arayuz/bildirim` (kabukla paylaşılır) ve `bicim` bağımlılıklarını da sayar; gerçek giris.js farkı yaklaşık +3 KB. D-7 ve dukkan-html farkı harita.js'te (+0,6 KB). dunya.html gzip kapıda ölçülecek (giris.js dunya.html dışındadır).

## Açık notlar

- T1 md tablosundaki dala girmemiş değişiklikler (`{hucre}`, `{ilce_enfazla}`, `{il_enfazla}`, D3 `{sure}`, D7 `{kucuk_hali}` ve `{en_az}/{en_cok}`, adsız `D2.tur_yapi_market`) dala girince işlenecek. D7 önizlemesi şimdilik dalın `{kucuk}` yer tutucusunu kullanıyor.
- D-7 canlı denetimi çekirdek kuralının kopyasıdır; marka sunucu ret kodları (MRK-xx) `DUKKAN_RET_ANAHTARI` ile çevrilir.
