# p4-bildirim: bildirim kuyruğu, Defter, koruma özeti, arsa etiketleri (K1)

Dal: `takim/k1/p4-bildirim` (taban `takim/k1/yerles-ad` 62c0655). Kapı durumu: Playwright ve pnpm dunya koşulmadı (kapı koşuyordu: O1 entegrasyon paketi); f4 betiği yerelde koşulmadı.

## Yapılanlar

1. **Bildirim kuyruğu (A5)**: `arayuz/bildirim-kuyrugu.ts` (`BildirimKuyrugu<H>`, saf, enjekte saat): DOM'da TEK görünür bildirim; süre görünür olunca başlar; hata öne geçer (bilgi bekler); aynı gruptaki (Defter) bildirimler 2 sn pencerede tek bildirimde birleşir. `arayuz/bildirim.ts` yalnız çizici: `bildir(mesaj, tur, { grup })`. CSS ile gizleme yok.
2. **"Kuruluyor / büyütülüyor" (A4)**: yerleştirme ve ölçek kartlarında inşa başlayınca bilgi türünde bildirim. Alt arsa şeridinde, arsada yapı ya da inşaat varsa "Yapı kur" ipucu kalkar; yerine durum ("Çiftlik inşa ediliyor." / "kurulu"; `arsaYapiMetni`).
3. **Defter**: `ilk_satis` sıradaki hedef "Çiftliğinin tahılını sat."; ödül sütunu "ödül: " öneki; ödül çubuğu ve tavan kalktı; yerine `<p class="defter-islenen soluk" data-alan="defter-islenen">` işlenen ödül satırı; kazanım bildirimleri `{mesaj, deger}` olup Defter grubunda birleşir (`defterBirlesikMetni`).
4. **Koruma özeti (A6/B7 hazırlığı)**: İşletmem "yeni oyuncu hakların" `details.mk-ozet` (telefonda kapalı, masaüstünde açık; tercih oturumda hatırlanır): `summary` "Yeni oyuncu hakların · {n}" ve altında kalkan, ayrılmış hücre ve ilk yapı indirimi satırları. Metinler `harita/mulk-metin.ts` (`mulk.koruma.*`); indirim yüzdesi parametreden (sabit yok), ilçe adı yoksa yersiz metin ("Katılım ilçende…").
5. **Arsa etiketleri**: alt şerit ve parsel kartında "Sınıf" yerine "Fiyat bölgesi"; "{ilçe} payın" yerine "Bu ilçede hücre sınırın" (ilçe adı artık şeritte yok).

## Test ve betik güncellemeleri

- Yeni: `bildirim-kuyrugu` (9), `defter` (7 güncel). `mulk-panel` (5) koruma metinleri güncellendi. f4 betiği: bildirim seçicisi `.bildirim`, Defter beklemeleri yeni metne.
- tsc ve eslint temiz (istemci src+test); tek dosya vitest 1 işçi: mulk-panel 5, defter 7, bildirim-kuyrugu 9 geçti.

## Boyut

pnpm dunya koşulmadığından ölçüm yok; kaba tahmin (esbuild minify + gzip, ayrı dosya): `bildirim-kuyrugu` 0,76 KB, `bildirim` 0,70 KB (eskisi 0,52), toplam kabukta yaklaşık +0,9 KB gzip. `mulk-metin`, Defter ve arsa etiketleri harita.js'te. Kesin fark kapıda ölçülecek.

## Açık notlar

- "Geri al kartı İşletmem düğmesini itmesin" yalnız CSS'tir (T1); JS tarafında değişiklik yok.
- Üst çubuk hasat etiketi (`ust.hasat_etiket`) yapılmadı (G.3, isteğe bağlı).
- f4'te yurt/büyütme etiketi beklemeleri kapıda doğrulanacak.
