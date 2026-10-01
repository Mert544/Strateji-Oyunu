# G9 giriş CSS ve ikonlar (T1)

Dal: `takim/t1/g9-gorsel` (taban `entegrasyon` 7553b55). Sözleşme: `g9-sozlesme.md` (SP/takim/t1; Tasarım lideri onaylı, K1'e iletildi).

- `src/arayuz/giris.css` (yeni): `#giris`, `.gr-*` sınıfları (kart, ekran, alan, girdi, hata, düğme, yardım, hesap, onay). **1,6 KB gzip** (hedef ≤ 2 KB). Yalnız belirteç, hex ve büyük harf yok, yalnız opacity canlanır; telefonda düğme 48 px, yardım özeti 44 px, onay alt sayfası. `main.ts` içe aktarması K1'in iskelet dalındadır (`import "./arayuz/giris.css"`); bu dalda içe aktarılmadığı için `dunya.html` boyutu değişmez.
- `src/tasarim/ikon.ts` + `ikon-veri.ts`: 11 yeni Lucide simgesi (lucide-static 1.49.0): `candy`, `croissant`, `ellipsis`, `ham`, `inbox`, `log-out`, `mail`, `shopping-basket`, `tag`, `trash-2`, `user-round` (`hammer`, `store` zaten vardı). Dükkân türü eşlemesi: bakkal `shopping-basket`, fırın `croissant`, şarküteri `ham`, şekerci `candy`, yapı market `hammer`.
- Görsel denetim: sabit HTML önizlemesi (depoda yok), 390×844 açık ve 1440×900 koyu; g1, g2, g4; yatay taşma yok. Düğme `.birincil.gr-dugme` tek başına çalışır (çerçeve burada, zemin temel.css'te).
- Doğrulama: tipkontrol temiz; `tasarim.test.ts` yeşil (büyük harf yasağı giris.css'i de tarar). Playwright ve `pnpm dunya` koşulmadı (talimat).
- `src/harita/dukkan-panel.css` (yeni, ek commit): `.dk-*` sınıfları; harita.js ile yüklenir (dunya.html bütçesine girmez); 2,0 KB gzip. Metin: `g9-dukkan-metin-son.md` (A1'in 138 anahtarı + T1 kararları; SP/takim/t1).
