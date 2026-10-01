# 12 — Yön Taslağı (sahip yönergeleri, 1 Ekim 2026)

> Sahibin Sprint 1 değerlendirmesine verdiği yanıtın taslağı. Tekrar edilmeyecek ilkeler burada toplanır; ayrıntı ilgili belgelerdedir ([11](11-urun-donusu.md), [arastirma/](arastirma/)).

## 1. Çalışma ilkesi: Ar-Ge kodlamadan önce gelir
- Fikir ve araştırma çalışmaları sürecin ana parçasıdır; geri dönüşü zor hataları kodlamadan önce yakalar.
- Her Ar-Ge raporu öncekileri tekrar etmez, derinleştirir; sonunda **"geri dönüşü zor kararlar"** bölümü bulunur.
- Takım lideri ajanları buna göre yönetir: önce araştırma ve karar, sonra kod.
- İşler bitince **genel resme bütünüyle bakılır** ve uçtan uca hata ayıklama yapılır.

## 2. Kimlik
- **"Mahallende ya da seçtiğin yerde başla."** Oyun strateji tabanlıdır, MMORPG değildir (karakter ilerlemesi yok).
- İmza mekanikleri (mahalle ve muhtarlık, pazar günü, il imza ürünü, çay ocağı, imece ve kitabe) korunur; **yenileri araştırılır.**

## 3. Başlangıç ve yönelim
- Tarım, Sanayi, Pazar yalnız **açılış önerisidir.** Oyuncu sonradan istediği yöne döner: fabrika kurar, ticarete geçer, politikaya yönelir, askeri güç kurar. Geçişler kilitsizdir, yalnız ekonomik maliyeti vardır.

## 4. Görsel ve arayüz
- Harita detaylandırılır ve tasarım olarak güzelleştirilir.
- Renkler, paletler ve tonlamalar **profesyonel** görünmelidir; "sakin" ilkesi korunur ama amatör görünmez.
- Arayüz ve akış profesyonel olmalıdır (tutarlı tasarım dili, tipografi, geçişler).

## 5. Dünya ve sistemler
- **Sunucu:** çok oyunculu tek dünya, gerçek zaman akışı.
- **Arsa ve inşa:** fikir doğru; yapı çeşitliliği ve inşa süreci detaylandırılır.
- **Bilim ve teknoloji, askeri bilimler ve askeri teknoloji** genişletilir.
- **Canlı dünya** akışı detaylandırılır.
- **Yürüyüş:** görülen hatalar düzeltilir (kamera, ölçek, panel).

## 6. Sıradaki iş (1 Ekim, 09:10)
| İş | Tür | Durum |
|---|---|---|
| Yürüyüş kamera, ölçek ve panel düzeltmesi | Kod | Çalışıyor |
| Çekirdek: yeni oyuncu paketi, limansız ilde ilk satış, eksik yapılar | Kod | Çalışıyor |
| F4: haritayı sunucuya bağlama, yapı önce yerleşim, hazır arsalar, Yerleş ekranı | Kod | Başlıyor |
| Ar-Ge: imza mekanikleri ve oyun ortası yönelimler | Araştırma | Başlıyor |
| Ar-Ge: görsel kimlik, profesyonel palet, arayüz ve harita kartografyası | Araştırma | Başlıyor |
| Ar-Ge: bilim, teknoloji, askeri bilimler ve askeri teknoloji | Araştırma | Başlıyor |
| Ar-Ge: arsa ve inşa sürecinin derinleştirilmesi | Araştırma | Başlıyor |
| Ar-Ge: canlı dünya simülasyonunun derinleştirilmesi | Araştırma | Başlıyor |
| İl imza ürünleri (veri), askeri ayak, performans | Kod | Çekirdek işi bitince ve Ar-Ge kararlarıyla |
| Harita ve arayüzün görsel yenilenmesi | Kod | Görsel kimlik raporu ve karar sonrası |
| Genel resim incelemesi ve uçtan uca hata ayıklama | İnceleme | Dalga sonunda |

## 7. Sahip kararları (1 Ekim, Ar-Ge sonrası)
- **Zaman:** dünya sunucu kapalıyken de akar; mutlak duvar saati, 1:1 tek takvim. Sunucu yeniden açılınca kaçan süreyi işleterek yetişir. (Önceki "kapalıyken durur" kararının yerine geçer.)
- **NPC arsa sahibi yok:** boş arsa boş kalabilir; her oyuncu gelip alabilir. Arsalar NPC'lere verilmez, NPC rakip firma yoktur.
- **Oyuncular arası arsa pazarlığı:** oyuncular arsaları kendi aralarında gönüllü olarak alıp satabilir, pazarlık yapabilir. "Parsel asla **zorla** el değiştirmez" ilkesi korunur (savaş ve yağma arsa almaz).
- **Hassas içerik:** deprem olayı yok. Dini bayramlar talep eğrisinde görünür ve oyun içi **hatırlatma takvimi** olarak gösterilir.
- **Görsel ve tasarım:** bina modellemeleri daha detaylı, renk tonlamaları ve paneller daha güzel olacak; tasarım işi daha güçlü modelli ayrı bir tasarım ajanına verilir. Karakter binaların yanında küçük kalıyor; bir tık büyütülür.
- **Ürün yaklaşımı:** prototipten sonra sürekli güncelleme ve yatırım; tasarım kararları buna göre genişletilebilir kurulur.

## 8. Sahip yönergeleri (1 Ekim, öğle)
- **Döngüsel zincirler oyunun kalbi:** buğday → un → ekmek → kendi marketin / pazar; maden → cevher → demir, alüminyum → pencere → kendi pencere mağazan. Üretim, lojistik ve satışın birbirini döngü hâlinde beslemesi (Capital Rift'in oyuncuyu içine çeken yanı). Kendi perakende dükkânı ana kanal olur.
- **Rehber görevler:** yeni oyuncuya rehberlik ve rehber görev zincirleri.
- **Beğenilenler:** gurbetçi yaz dönüşü, olaylar, zorluk katmanı, kamu ihalesi.
- **Yapay zekâ ajanlı kamu:** kamu ihalesi ve kamu kararlarını oyuna sunulacak API anahtarıyla yapay zekâ ajanları yürütür (deterministik çekirdeğin dışında; karar doğrulanmış komut olarak girer).
- **Kamu arazileri ve politikaları:** kamu, oyuncuya hitap eden bir fırsat ve rekabet aracına dönüştürülür; araştırılacak.

## 9. Takım yapısı (sahip önerisi, uygulandı)
- **Baş lider** (takım lideri): iki takımın ve liderlerin başı, genel denetçi; görevleri dağıtır, son doğrulamayı yapar, commit/push eder ve **genel kararları verir** (sahibe sunar).
- **Ar-Ge lideri** + 4 araştırmacı: araştırmaları dağıtır, eleştirel inceler, sentez raporu yazar.
- **Geliştirme lideri** + 4 geliştirici: kod işlerini dosya sahipliği kuralıyla (çekirdekte aynı anda tek yazar) dağıtır, doğrular, baş lidere teslim eder; commit ve push baş liderde kalır.
- Görsel tasarım işi ayrı, daha güçlü modelli bir tasarım ajanında.
- **Modeller:** takım liderleri ve tasarım ajanı güçlü model, alt ajanlar hızlı model.
- **Akış:** ajan raporunu kendi liderine gönderir → lider inceler, gerekirse düzeltme ister → onaylanan iş ve sentez baş lidere gelir → baş lider doğrular, karar verir, GitHub'a gönderir.
- **Teknik not:** alt ajanlar kendi ajanlarını açamadığı için tüm ajanları baş lider açar; ajanlar raporlarını mesajla doğrudan liderlerine gönderir.
- **Profesyonel ürün ilkesi:** renkler, bina yapıları ve 3B görselleme amatör görünmemeli; haritada ve arayüzde büyük harf kullanılmaz.

## 10. Baş lider kararları — Ar-Ge dalgası 3 (sentez: [argelider-sentez-1](arastirma/argelider-sentez-1.md))
Sahip "genel kararları baş lider versin" dedi; aşağıdakiler sentezin önerileri üzerine verildi. Sahip itiraz ederse değişir.
- **Şimdi kilitlenenler (G1–G7):** kamu arsası çekirdekte zorunlu (satılmaz, `parsel_al`/`yapi_yerlestir` reddeder, yurt atlar); kamu kimliği `k:mahalle` / `k:ilce` / `k:il`; `kamu_karar` v1 günlük şeması + gündem ve zaman aşımı kural yedeği; **para alanı taşıyan sistem ya da ajan komutu yok** (ödüller çekirdek tablosundan); mal kimlikleri ilk içerik sürümünden önce kilitli; oyuncu serbest metni ajana girmez, değerlendirme kör; kural yedeği her zaman açık.
- **Kamu arsası (S3):** kabul. Mahalle paketi 20 hücre (meydan + pazar yeri + park) + %4 hazine rezervi + ilçe merkezi 8–12 hücre + kıyı şeridi 2 hücre; yoğun ilçede toplam ≈%8–9. Oranlar parametre; rezerv halkanın ilk arsası satılmadan dondurulur.
- **Perakende (S4, S6):** kendi dükkânın küçük primi (≈%3–16) kabul; asıl değeri pazar doyunca zinciri kurtarması. Üretmeyen dükkânın ithal alıp satması meşru ticaret oyunudur; ZP11 ölçütüyle izlenir, gerekirse raf fiyat tavanı açılır.
- **Uzmanlaşma (S5):** Alfa-0'da tek oyuncunun kapalı zinciri; ara kademe uzmanlığı Alfa-1'de oyuncular arası sözleşmeyle gelir.
- **Muhtarlık (S9):** oyuncu ek yapısı olmaktan çıkar, kamu yapısı olur (mülk kipinde oyuncuya kapalı).
- **Mal kimlikleri:** `tekstil` → `kumas` + `hazir_giyim`; `ekmek` ve `sekerleme` ayrı mal; `findik_urunu` taban 240. Alfa-0 için 4 zincir (ekmek, cam → pencere, süt → şarküteri, fındık → şekerleme) ve 23 mal; tek yeni yapı `dukkan` (tür verisiyle).
- **Kamu ihalesi ve fiyat tavanı:** tek ihale motoru, ağırlık profilleri (Alfa-0 öncesi profil M = yalnız fiyat; sonra profil Y = %70/%20/%10), sunucu-mühürlü kapalı teklif; tüm kamu/sipariş tavanları ithalat paritesinde (1,10 R). Kamu bütçesi yalnız zaten yanan paradan (ithalat makası ve komisyonu, arazi vergisi, hak bedelleri).
- **Yapay zekâ (S1, S2) — sahip kararı (1 Ekim):** ihale yetkisi **(b)**: ajan ihaleyi tasarlar ve gerekçeyi yazar, kazananı kural seçer (kör teknik puan yok). API anahtarı yalnız sunucudaki kamu ajanında; **oyuncunun kendi ajanı ya da oyun API'si yok** (tam otomatik oyun istenmiyor). Tüm işler yapay zekâya verilmez (maliyet); yapay zekâ kamusal alanlarda NPC'lere sınırlı ve tavanlı olarak can verebilir. Ajan Alfa-0'ın kritik yolunda değil.
- **Alfa-0 P0 (sıra):** kamu arsası verisi ve çekirdek reddi → para güvenliği (ödül tablosu, kamu kasası, kamu NPC alıcısı) → mal kimlik kilidi ve 9 yeni mal → ekmek zinciri + dükkân → cam → pencere zinciri → Esnaf Defteri P0 → sabit fiyatlı kamu siparişi v0. Alfa-0'a girmeyenler: ihale, kira ve haklar, canlı ajan.

## 11. Sahip yönergeleri (1 Ekim, Ar-Ge dalgası 3 sonrası)
- **Takım:** liderlerin önemli hataları yakalaması takım kurmanın değerini gösterdi; yapı korunur.
- **Odak:** Ar-Ge sürer ama çalışma yönü kaymamalı; tüm kararlar tek bir oyun tasarım belgesinde toplanır.
- **Gerçekçilik sınırı:** bu bir oyun; her şey birebir gerçekçi olamaz, oynanabilirlik önce gelir.
- **Üretim döngüsü genişler:** mal, kaynak ve zincirler artırılır (buğday → un → ekmek; hayvancılık: inek → süt, et, deri → deri ürünleri; madencilik ve fabrikalar); perakende kademeleri: bakkal, market, süpermarket; üretimhaneler ve fabrikalar.
- **Dönüş deneyimi:** oyun açıldığında "sen yokken neler oldu" açılış ekranı; Esnaf Defteri, ödüller ve kaldığın yer kartı geliştirilir. Takvim beğenildi.
- **Toplantı:** tüm işler bitince sahip ile baş lider toplantı yapar.
