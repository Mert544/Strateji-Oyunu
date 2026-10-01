# Toplantı notu 1 — sahip ve baş lider (son durum, 1 Ekim 2026)

Amaç: bu turun sonunda durumu tek yerde görmek, sahibin vermesi gereken kararları ayırmak, açık işleri ve sonraki fazı onaylatmak. Tur sahip kararıyla kapandı: süren işler bitirildi, yeni görev açılmadı.

## 1. Bitenler (hepsi GitHub'da, `claude/brave-hawking-flv1y0`)

| Alan | Ne oldu |
|---|---|
| Ar-Ge dalga 4 | Üretim ağı, perakende kademeleri, dönüş deneyimi, askeri katman v1; **oyun tasarım belgesi v1** tek doğruluk kaynağı (Y-01…Y-39); birleşik mal ve yapı kimlik listesi |
| Kamu arsası (P1) | Mahalle paketi, %4 hazine, ilçe merkezi, kıyı; dikdörtgen bloklar. Gebze'de ~0,6 sn ve 54 KB. Sunucu yayımlıyor, istemci gösteriyor (satılamaz, nedeni Türkçe) |
| Para güvenliği (P2) | Komutlar tutar taşımaz; ödül tablosu çekirdekte; para korunumu her ara noktada tam eşit; kamu kasaları ve kamu alıcısı; kamu fiyat tavanı ithalat arbitrajını kapatır (1,035) |
| Mal kimlik kilidi (P3) | Makinece denetlenen kimlik listesi; Alfa-0'ın 10 malı (un, ekmek, cam, pencere, süt, süt ürünü, fındık, fındık ürünü, şekerleme, kepek). Eski 14 mal davranışı birebir |
| Ayrılmış hücre kuralları (P3b, P3d) | Hesap başına 12, yalnız katılım ilçesinde ve ilk 14 günde, ilçe başına günlük tavan; yurt önce ayrılmış dışından |
| Çekirdek hız (P3c) | Lojistik çözümü ~%21 hızlandı, çıktı birebir |
| Ölçek kilitsiz (P4a) | Mülk kipinde doğrudan M/L kurulum, teknoloji ya da ilçe şartı yok; ayak izi ölçekle büyür (≤ 5 hücre); "S kur + yükselt" = "doğrudan büyük" bedeli |
| Sunucu | "Sen yokken" özeti; Postgres şema/göç/profil; Esnaf Defteri ödülleri (kötüye kullanıma kapalı, kesintisiz = yetişen = kurtarılan); görüntü işçisi ve parçalı yayın; sağlık/metrik ucu; Docker; yedek-geri yükleme tatbikatı; Alfa-0 açılış kontrol listesi; giriş tasarım notu (KIMLIK.md) |
| İstemci | "Kâğıt ve Çini" görsel kimliği; mülk kipi kabuğu (İşletmem, Hazine, Mal, Dikkat, Olaylar; devlet/savaş yok); gerçek tarih ve güneş; Yerleş ekranı; "sen yokken" ekranı; Esnaf Defteri; telefon düzeni |
| Ölçüm | Parsel-v1 raporları; H6 yeni tanımı; ayrıştırma (§3f) |

Son doğrulama: temiz kopyada tip denetimi, lint, tüm testler ve istemci boyutu (dunya.html ≈ 372 KB / 400 KB). Ekran görüntüleri: `docs/toplanti/2/` (yeni set), `docs/toplanti/1/` (önce/sonra).

## 2. Ölçüm sonuçları (kısa)
- **H6 (geç gelen ucuz arsa bulup başlayabiliyor mu):** seyrek dünyada, spekülatörlü koşularda ve sentetik-50 kalabalıkta artık geçiyor. Bunu P3b (spekülatörün kaptığı ayrılmış hücre 461 → ~150) ve yurt kuralı sağlıyor; ikisinden biri yetiyor. Mini-6 kalabalıkta "belirsiz" (yurt verebilen ilçe kalmıyor). 14 günde ilk yapı koşulu bot ölçeğinde bilgisiz; **insan testi gerekli**.
- **Sunucu gecikmesi (100 bot, kademeli katılım):** ısınmış p95 ≈ 120–230 ms, hedef ≤ 300 ms tutuyor (Esnaf Defteri açıkken de). Katılım dalgasında p95 ≈ 400 ms; kaynak çekirdeğin komut maliyeti.

## 3. Baş liderin verdiği kararlar (itiraz edersen geri alınır)
- Y-35/Y-36 askeri: Alfa-0'da bayraklı eşkıya PvE; yağma %60/%40; ikmal ×0,25.
- Y-37: kepek 24. mal; yerel pazar ve "sen yokken" Alfa-0'da.
- Y-38: kamu arsası dikdörtgen adalar. Y-39: Muhtar = mahalle, İlçe Başkanı = ilçe, NPC Kaymakam = makam boşken, kayyum = devralma.
- Kamu fiyat tavanı = ulaşılabilir en düşük ithalat çarpanı.
- H6 ölçütü: "%20 ucuz hücre" yerine "katılım ilçesinde ilk yapıya yetecek taban fiyatlı arsa".
- Ayrılmış hücre: katılım ilçesi + 14 gün + günlük ilçe tavanı; yurt önce ayrılmış dışından.
- "İlk parsel" yalnız damga, para ödülü yok; para ödülleri üretim adımlarına bağlı.
- "Aynı andaki komutlar tek çözüm" kural değişikliği ertelendi (hedef zaten tutuyor).

## 4. Senin kararını bekleyenler
> **Kapandı (1 Ekim akşam, [12 §14](12-yon-taslagi.md)):** S4-2…S4-10, T-2 ve Y-1 önerildiği gibi onaylandı. T-1: `1.234 ₺`. A-1: yalnız e-posta bağlantısı (Google yok). A-2 sahip işi olarak açık.

| # | Soru | Öneri |
|---|---|---|
| S4-2 | Askeri birim adı: "müfreze / bölük" mü, "tümen / alay" mı? | Müfreze / bölük |
| S4-3 | Askeri sonuçta ses (varsayılan kapalı) | Evet, kapalı |
| S4-4 | Süpermarket 3 hücre mi 2 mi? | 3 |
| S4-5 | Hareketsizlik uyarı e-postası varsayılan açık mı? (hukuki görüş) | Açık, kapatılabilir |
| S4-6 | Günlük selam şeridi | Alfa-1 |
| S4-7 | Yılda bir "arşiv hakkı" | Evet |
| S4-8 | Bayram haftasında et/şekerleme talep dalgası | Evet |
| S4-9 | Yürüyüş Alfa-0'da isteğe bağlı | Evet |
| S4-10 | Tasarım belgesi tek kaynak, bakımı baş liderde | Evet |
| T-1 | Para biçimi `1.234 ₺` mi `₺1.234` mü? | Uygulamada karışık; tek biçim seçilmeli |
| T-2 | Sokak altlığı (Protomaps) çıkarımı ve barındırma | Alfa-0'da yalnız alfa illeri |
| A-1 | Gerçek giriş: e-posta bağlantısı + Google (KIMLIK.md) | Onay |
| A-2 | Barındırma (Hetzner + Cloudflare, ~€20/ay), OSM lisansı için hukuki görüş | Alfa-0 öncesi başlat |
| Y-1 | Yükseltme süresi doğrudan kurulumdan kısa (bedel eşit) | Bilinçli bırakıldı; onaylarsan kalır |

## 5. Açık işler (yeni görev açılmadığı için bekliyor)
- **İstemci görsel kusurları:** il düzeyinde yapı etiketi ilçe adına biniyor (tek satır); mülk kipinde küre hâlâ bölge renkleri; telefonda Defter bildirimi maliyet kartını örtüyor; telefonda hazine iki yerde; uzun ödül tutarı satır kırıyor; geri al şeridi küre düzeyinde de kalıyor; yakın planda arsa dolgusu baskın; "Gün N" ifadesi tarihin yanında fazlalık.
- **İstemci işlev:** ölçek yükseltme formu ek hücre göndermiyor (ek hücre isteyen yükseltme reddedilir); Gemlik/Körfez gibi ilçelerde arsa ızgarası henüz yok ("yalnız gezebilirsin").
- **Sunucu:** pg testlerinde iki kez görülüp tekrarlanamayan tek seferlik hata (izleniyor); Docker imajı ilk gerçek makinede derlenecek; gerçek giriş uygulaması.
- **Çekirdek:** bakım/aşınma kalibrasyonu; P4 (ekmek zinciri + dükkân), P5 (cam → pencere); askeri 0a.

## 6. Alfa-0'a giden yol
1. Görsel kusurlar ve yükseltme formu (kısa istemci turu).
2. P4 ekmek zinciri + dükkân, P5 cam → pencere.
3. Gerçek giriş + Alfa-0 kurulumu (kontrol listesiyle).
4. Askeri 0a şema → 0b bayraklı eşkıya.
5. İnsan testi: H6'nın ikinci koşulu ve ilk saat deneyimi.
