# Davet metni taslağı (sahibin onayına; A1)

> Taslak, yalnız belge. Kaynak: A3 `uc-ilce-pilot-davet.md` (ilçe dağılımı), A1 ilk saat akışı (`alfa0-ilk-saat-akisi.md`, 344dd73), kod ve veri `5c8e704`. Üslup: sade, "sen" kipi; **tamamı büyük harfli sözcük yok** (cümle başı ve özel adlar normal yazılır; "büyük harf yok" kuralını bu şekilde okudum, sahip hepsi küçük harf isterse tek geçişle değişir). **Kelime sayısı: ana metin 80 (sınır 150); ilçe varyantları ayrı: Gemlik 10, Körfez 11, Gebze 13.**

## Ana metin

Bölge Stratejisi, kendi çiftliğini, dükkânını ve üretimini adım adım kurduğun bir tarayıcı oyunu. Acele yok, zorunlu yol yok; istediğin zaman çıkıp dönebilirsin.

İlçeni sen seçersin. Yumuşak bir önerimiz var: {onerilen_ilce}. Başka bir ilçeyi seçmen de olur.

İlk saatte bedava yurdunda çiftliğini kurarsın, tahılını Pazar'da satarsın, sonra ilk dükkânını açarsın. Tahıl satışı saat başlarında işlenir; paran ya da Defter satırın hemen görünmeyebilir.

Takıldığın ya da şaşırdığın her yeri bize yaz: {destek_eposta}. Adresin yalnız giriş için kullanılır; ayrıntılar ve rıza metni: {kvkk_url}.

## İlçe varyantları (ana metnin 2. paragrafından sonra, davetliye atanan ilçeye göre tek cümle)

- **Gemlik:** Gemlik'te zeytiniyle bilinen, yaklaşık 124 bin kişilik bir ilçede başlarsın.
- **Körfez:** Körfez'de Hereke halısıyla bilinen, yaklaşık 183 bin kişilik bir ilçede başlarsın.
- **Gebze:** Gebze'de bayram çöreğiyle bilinen, Kocaeli'nin en kalabalık ilçesinde (yaklaşık 415 bin kişi) başlarsın.

`{onerilen_ilce}` = o davetliye atanan ilçe adı. Atama dağılımı (yalnız davet listesinde; metinde yazmaz): Gemlik 5 (+2 yedek), Körfez 6, Gebze 9 (A3 `uc-ilce-pilot-davet.md` §2). Seçim serbesttir, öneri bağlayıcı değildir.

## Yer tutucular

`{onerilen_ilce}`, `{destek_eposta}` (sahip metni; giriş ekranındaki `giris.destek_eposta` ile aynı değer), `{kvkk_url}` (veri kullanımı ve rıza/aydınlatma metni; `giris.kvkk_url` ile aynı). İkisi de sahip söyleyene dek boştur; gönderilmeden önce doldurulmalıdır.

## Notlar (sahip için)

- **Olgular kaynaklı, vaat yok:** Gemlik zeytini (tescilli menşe adı, 2005) ve Gebze bayram çöreği, Hereke halısı (tescilli coğrafi işaretler) `veri/icerik/il-imza.json`; nüfus TÜİK ADNKS 2025 (ikincil derleme; `izgara/manifest.json`); Gebze Kocaeli'nin en kalabalık ilçesi (`ilce-nufus.tsv`: 414.960, İzmit 381.254). Oyunda olmayan yapı ya da zincir (rafineri, halı, zeytin işleme) anılmaz.
- **"Tahıl satışı saat başlarında işlenir"** ilk saat akışı belgesiyle uyumludur (emirden sonraki saat sınırı; dükkân satışı anında). **Bu cümle, "Pazar'da sat" (Mal sekmesi) ana dala girmeden ekranda kolay bir yola dayanmaz:** bugün satış emri eski komut panelindedir (A1 ilk saat akışı T-1); davet P13'ten önce gidecekse 3. paragraf yeniden yazılmalıdır.
- Geri bildirim yolu yalnız e-postadır (`{destek_eposta}`); ayrı form ya da kanal yoktur.
