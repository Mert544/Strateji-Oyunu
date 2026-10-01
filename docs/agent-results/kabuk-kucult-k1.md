# kabuk-kucult: giriş yığını ayrı dosya (giris.js) (K1)

Dal: `takim/k1/kabuk-kucult` (taban `takim/k1/g9b-giris-ekran` 91e1620). Kapı durumu: Playwright koşulmadı; yalnız `pnpm dunya` (kapı boştu) ve hedefli vitest.

## Ne yapıldı

Giriş ekranları (`giris/baslat.ts` ve altındakiler: api, akis, oturum, hata, eposta, ekran-html, gorunum, giris-metin) ve `giris.css` kabuk paketinden (dunya.html) çıkarılıp ayrı `giris.js` dosyasına alındı (harita.js ve yuru.js deseni). Yalnız e-posta kipinde yüklenir.

- `giris/yukle.ts` (kabuk, küçük): `girisModulu()`; tek dosya derlemesinde `new URL("./giris.js", location.href)`, geliştirme/çok dosyalı derlemede tembel parça. Yükleme hatasında Türkçe hata metni (`giris.js yüklenemedi...`), yükleme perdesi kalkar ve hata kutusu görünür.
- `main.ts`: `girisKipi` (kip.ts) kip `eposta` ise `girisModulu()` HEMEN çağrılır (kip belirlenir belirlenmez yükleme başlar; uygulamanın geri kalanı zaten giriş tamamlanana dek başlamaz). `?token=` (geliştirme) ve sahte bağdaştırıcı yolları `giris.js`'yi HİÇ yüklemez. `import "./arayuz/giris.css"` kalktı.
- `baslat.ts`: `giris.css?inline` ile CSS'i kendisi `<style id="giris-stil">` olarak ekler (kabuğun CSS'ine girmez; sıra eskisi gibi stil.css'ten sonra).
- `kip.ts`: `httpTabani` buraya taşındı (kabuk `api.ts`'yi çekmesin); `api.ts` yeniden dışa aktarır (testler değişmedi).
- `scripts/derle.ts`: `giris.js` derlemesi, kopyalama ve boyut satırı.
- `test/giris-yukle.test.ts`: tembel yol yüklenir; main.ts'in giris içe aktarımları yalnız `kip` ve `yukle`; kip.ts/yukle.ts protokol, zod ve giriş ekranı modüllerini içe aktarmaz.

## Boyut (pnpm dunya; gzip)

| | dunya.html | giris.js (ayrı) |
|---|---|---|
| g9b-giris-ekran 91e1620 (taban) | 380,2 KB | yok |
| bu dal | 372,8 KB (-7,4 KB) | 10,0 KB (ham 30,8 KB) |

harita.js değişmedi (419,3 KB). Kalan kabuk payı: kip.ts + yukle.ts (≈0,4 KB). giris.js'de giriş JS (≈7,3), giris.css (≈1,6) ve küçük yardımcılar (esc, ikon) vardır.

## Not (ilk boyama)

Giriş ekranı artık `giris.js` yüklenince boyanır (aynı kökenden tek istek, 10 KB gzip); yükleme kip belirlenir belirlenmez başlar ve sayfa başka ağır iş yapmaz. `#yukleme` perdesi giriş ekranı gelene dek görünür kalır.
