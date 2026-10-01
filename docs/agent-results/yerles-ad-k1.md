# yerles-ad: Yerleş kartı, katalogdan ad, erişim maddeleri, küçük P4 düzeltmeleri (K1)

Dal: `takim/k1/yerles-ad` (taban `takim/k1/yurt-once` 40dcb04; T1 ilçe sözlüğü e8c66a3, c2aa290, 3bade29 cherry-pick'in kopyaları). Kapı durumu: Playwright ve pnpm dunya koşulmadı (kapı koşuyordu).

## Yapılanlar

1. **Yerleş ilçe kartı (sözleşme "H. Ek")**: `arayuz/yerles-ekrani.ts` `yerlesKartiHtml` (saf, testli): ad, neden (`ilceNedeni`), bilinen yanı (`bilinenYaniSatiri`; "İmza" kalktı), açılış (`yerles.kart.acilis` + `acilisMetni`), doluluk, ayrılmış hücre, rozet. Satırı olmayan veri hiç yazılmaz (sözlükte yoksa neden ve bilinen yanı; ızgara yoksa doluluk; bilinmeyen ayrılmışta ayrılmış satırı). Ayrılmış hücre SAYISIZ, dört durum (`ayrilmisDurumu`: bol ≥100 tek sabit `AYRILMIS_BOL_ESIGI`, var, az, yok). Rozet `durumRozeti` (hazır / ızgara yakında / ilçe henüz açık değil). Dükkân düzeyi (`dukkanDuzeyi?: () => {g7,g8}`) sözlük metinlerini seçer; G6'da dükkân sözü yok. Nüfus satırı (isteğe bağlı) veri hiyerarşide olmadığından yazılmadı.
2. **Metin tablosu**: `arayuz/yerles-metin.ts` (`yerles.*`: T1 tablosu birebir; yer tutucular tek yerde; HTML'e kalın ad gibi parçalar `yerlesMetniHtml` ile kaçışlı verilir). Başlık, alt, düğmeler, segment, not hep anahtardan; eski "sınıf değil... Kilit yok" ve "imza ürüne göre" metinleri kalktı. Yalnız harita yığınından içe aktarılır.
3. **Üç açılışta da ilk yapı çiftlik** (`harita/yerles.ts` `ACILIS`: yalnız `{ yapi: "ciftlik" }`; `ad`, `ozet`, `yapiAd` alanları kalktı, sabit yapı adı yok; yapı adı katalogdan). `yapi.ts` yorumundaki "Makine Parçası" güncellendi.
4. **Erişim turu 1 ve 2** (`harita/kart-durum.ts`): kapalı onay düğmesi `disabled` yerine `aria-disabled="true"` + `aria-describedby="yk-neden"` (yapı yerleştirme ve ölçek büyütme kartları); neden satırı artık her kart yenilemesinde yeniden oluşan `role=alert` değil, KALICI tek `role=status` bölgesi (yalnız metin değişince yazılır); kapalı düğmede tıklama/Enter etkisiz.
5. **Tek birincil**: "Yapı kur" düğmesi `aria-pressed` (yapı kartı ya da alt arsa şeridi açıkken true, kapanınca false; şerit `hidden` değişimi MutationObserver ile). Tonlu görünüm T1'in CSS'inde. f4'e denetim eklendi: kart açıkken görünür dolu birincil sayısı 1.
6. **Küçük düzeltmeler**: Yerleş doluluk çubuğu %0'da 0 (`yog > 0 ? max(2, ...) : 0`); arama kutusu ≤600 px'te yer tutucu "Ara" (aria-label tam metin kalır); İşletmem "Net akış" `+1.960 ₺/sa` (bitişik).

## Betik ve test güncellemeleri

- `f4-uctan-uca`: kartlarda "Bilinen yanı" ve "Yeni oyunculara ayrılmış arsa" (sayı yok, "İmza" yok); açılış notunda "Çiftlikle başla", "yalnız bir öneri", "istediğin zaman"; Pazar açılışında yapı menüsünde ÇİFTLİK "Önerilen"; kart açıkken tek dolu birincil.
- `harita-f4-yapi.test.ts:56` ESKİ hâlinde ("Makine Parçası 10"): K4 `icerik-adlar` (d9e89c6) aynı satırı "Makine parçası" yapar, güncelleme onun commit'indedir (çakışma yok). `defter.test`/`harita-olcek.test` yalnız kendi sahte verisindeki adı kullanır, değişmedi. f4 betiğinde yeni ad beklentisi YOK; yeni beklentiler yalnız "Çiftlik" (K4 ad yamasında değişmez) ve ilçe sözlüğü/yerles metinleridir.
- Yeni testler: `harita-yerles-kart` (11), `harita-kart-durum` (5); `mulk-panel` ("₺/sa") güncellendi.

## Doğrulama

tsc ve eslint temiz; tek dosya vitest 1 işçi: yerles-kart 11, kart-durum 5, f4-yerles 9, f4-yapi 17, f4-ws 6, mulk-panel 5, olcek 33 ve ws 6, yurt 10 ve ws 1, zincir 7, cok-sinif-ws 2, tasarim 30 geçti. dunya.html: yerles kartı ve sözlük YALNIZ harita.js'tedir (`arayuz/yerles-metin.ts`, `tasarim/ilce-metin.ts` kabuğa girmez); kart-durum/yerlesim/olcek-kipi harita yığınında; kabuk boyutu değişmez (ölçüm kapıda).
