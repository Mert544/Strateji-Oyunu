# yurt-once (K1): taze oyuncu varışta yurdunda kurar; ilk-yapı indirimi önizlemesi

Dal: `takim/k1/yurt-once`, taban `takim/k1/ayrilmis-fiyat` (fa19f6b). Kapı durumu (koşular sırasında): kapı KOŞUYORDU; yalnız tek dosya ve tek işçi vitest koşuldu, Playwright ve `pnpm dunya` koşulmadı.

## Sorun
Yerleş varışı hazır arsayı otomatik seçip "Satın al"ı birincil gösteriyordu. Oysa yurt (6 hücre) ücretsizdir ve Çiftlik'e yeter (`yapi_yerlestir` kendi hücresini kabul eder): taze oyuncu hibenin yaklaşık %20'sini boşa harcıyordu. Ayrıca yapı önizlemesi ilk-yapı indirimini bilmiyordu (çiftlik 6.000 ₺ gösterip 4.200 ₺ alınıyordu).

## Ne değişti
- **Varış kartı "Yurdun hazır"** (Tasarım metinleri birebir): yurt varsa hazır arsa OTOMATİK SEÇİLMEZ; harita yurda yaklaşır. Birincil düğme "Yurdunda kur" + `<small>ücretsiz</small>` (mevcut `birincil` sınıfı), ikincil "Arsa satın al" (sınıfsız). Yurt yoksa (yurtsuz katılım, sunucusuz kip) eski akış: önerilen arsa seçilir.
- **Tek tıkla kurma:** "Yurdunda kur" açılış önerisinin yapısını (Tarım: Çiftlik) yurdun kendi boş hücrelerine yerleştirip tek `yapi_yerlestir` ile kurar: arsa parası ödenmez, onay kartı gösterilmez, 5 dk "Geri al" şeridi açılır. Sığmazsa ya da geçersizse kurmaz ve nedeni söyler: "Yurdunda bu yapıya yer yok. Yanındaki arsayı alarak genişletebilirsin." / "{Yapı} {k} hücre ister, yurdunda {b} boş hücre kaldı." (plan geçersizse planın nedeni: hazine, rezerv vb.).
- **İlk yapıdan sonra** kartta ikincil "Genişlet: yanındaki arsayı al": yurdun yanındaki önerilen hazır arsayı seçer, varış kartı kapanır.
- **Tek birincil kuralı:** varış kartı açıkken üstteki "Yapı kur" düğmesinin `birincil` sınıfı kalkar; kart kapanınca (arsa seçimi, yapı kipi, ilçe değişimi, küre) geri gelir. Sınama: `gorunum().varisKartiAcik` kancası ve Playwright CAN adımı.
- **İlk-yapı indirimi önizlemesi (Kod lideri kararı):** `yerlesimPlani` çekirdek `yapiPlani` gibi para ve malzemeden `q − (q0 − ⌊q0·(1−ppm)⌋)` düşer (ilk `indirimliYapiSayisi` yapıda; kalan hak `MulkOzeti.indirimliYapiKalan` = karedeki `indirimliYapiKalan`). Plan `indirimli`, indirimli `yapiMili` ve `malzeme` taşır; kart "ilk yapı indirimli" notunu gösterir. Bilinmeyen hak (sunucusuz kip) indirim uygulamaz. Ölçek büyütme önizlemesi DEĞİŞMEDİ (çekirdekte yükseltme indirimsiz).

## Dosyalar
`harita/yurt.ts` (yeni, saf: `yurtBosHucreler`, `yurtPlani`, `YURT_METIN`), `harita/yapi.ts` (indirim), `harita/yerlesim.ts` (`yurdaKur`, `birincilAyarla`, `yurtDurumu`, `onayla` sonuç döndürür), `harita/gorunum.ts` (varış kartı, `yerlesVarisi` artık `boolean`), `harita/denetci.ts`, `harita/baglanti.ts` ve `baglanti-ws.ts` (`MulkOzeti.indirimliYapiKalan`), `scripts/f4-uctan-uca.ts`, testler.

## Testler
- `harita-yurt.test.ts` (10): yurt = kendi boş hücreleri; çiftlik 3×2 yurda sığar (arsa 0, deterministik); çelikhane 3 hücre; "sığmıyor" ve "yer yok" metinleri; hazine yetmezliğinde plan nedeni; Tasarım metinleri birebir; indirim çekirdek aynası (4.200 ₺, çelik 21, parça 7; hak 0 ya da bilinmiyor = tam bedel); ölçek büyütme indirimsiz.
- `harita-yurt-ws.test.ts` (1, GERÇEK sunucu, indirim AÇIK, bedava yurt): taze oyuncunun ilk Çiftliği yurtta: önizleme 4.200 ₺, arsa 0, sunucuda gerçek hazine düşüşü 4.200 ₺ birebir; ikinci yapı da indirimli ve birebir; inşaatlar bitince üçüncü yapıda indirim yok (6.000 ₺) ve önizleme yine birebir. (Test için `indirimliYapiSayisi` 2'ye indirildi; ilk iki yapı indirimli, üçüncü değil.)
- Mevcut testler aynen: harita-f4-yapi (17), harita-f4-ws (6), ayrilmis-fiyat testleri geçti; tsc ve eslint temiz.
- Playwright f4-uctan-uca güncellendi (çalıştırılmadı; kapıda koşulur): ali ve ayşe varışta kartı görüp "Arsa satın al" ile eski akışa girer (ali'nin sayıları indirimli: Çiftlik 4.200 ₺, Ahır 5.600 ₺); CAN yeni oyuncu olarak Yerleş → "Yurdun hazır" (metin, tek birincil, otomatik arsa yok) → "Yurdunda kur" (toast 4.200 ₺, hazine düşüşü 4.200 ₺ birebir, geri al şeridi, "Genişlet") → ardından G2 Büyüt akışı.

## Notlar ve açık noktalar
1. Tasarım tablosundaki "açıklama (yapı seçiliyse)" metni (`YURT_METIN.aciklamaYapi`) tanımlı ama varış kartında kullanılmıyor: kart öneri yapıyı tek eylemle kurar, yapı seçimi üstteki "Yapı kur" menüsüyle yapılır (o akışta varış kartı kapanır). İstenirse menüden yapı seçildiğinde yurt durumunu gösterecek bir satır eklenebilir.
2. "Yurdunda kur" onay kartı göstermeden kurar (ücretsiz ve 5 dk geri alınabilir olduğu için). Ek onay istenirse `yurdaKur` planı hayalet olarak gösterip beklemeye alınabilir.
3. Hak sürmeyen/yurdu olmayan oyuncuda akış eskisi gibidir.
4. Düğme biçimi ve CSS T1'in işi: yeni sınıf eklenmedi.
5. Playwright ve `pnpm dunya` bu dalda koşulmadı (kapı koşarken yasak); yeniden tabanlamadan sonra kapı boşken tek koşu yapılır. Yeni kod harita yığınındadır (`harita.js`).
