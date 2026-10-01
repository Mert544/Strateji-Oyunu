# Araştırma: Dönüş Deneyimi — "Sen Yokken" Açılış Ekranı, Kaldığın Yer Kartı, Esnaf Defteri ve Ödüllerin Gelişimi, Takvim

> **Konu.** Sahibin 1 Ekim yönergesi: "Oyun başladığında 'ne oldu, sen yokken neler oldu' tarzında bir açılış ekranı güzel olabilir. Esnaf defteri, ödüller, kaldığın yer kartı güzel; daha da geliştirilebilir. Takvim çok iyi olmuş." Bu rapor **oturum açılış ritüelini** tasarlar: oyuncu oyunu açtığı ilk 10–20 saniyede ne görür, yokluk süresine göre düzen nasıl değişir, "kaldığın yer" ve Defter dönen oyuncuya nasıl eşlik eder, ödüller avantaj yaratmadan nasıl gelişir, takvim ekranı ve bildirimler oyuncuyu **rahatsız etmeden** nasıl çalışır, bütün bunlar hangi veriyle ve hangi maliyetle üretilir. Oyun strateji tabanlıdır; **"uğramazsan kaybedersin" baskısı bilinçli olarak dışarıda tutulur.**

**Durum.** 1 Ekim 2026'da derlendi. Ar-Ge önerisidir; kod, parametre ve başka belge değiştirilmedi. Sayıların hepsi **öneridir, kalibre edilmemiştir.** **(doğrulanmadı)** birincil kaynakla teyit edilemeyen bilgiyi, **(arama özeti)** sayfa doğrudan okunamayıp yalnız arama özeti kullanılan bilgiyi gösterir. Çekirdek ve istemci gerçekleri `packages/` altındaki dosyalardan okunmuştur (§0.3). "Sezon" yerine "iklim takvimi / dönem" denir; arayüz metinlerinde büyük harf kullanılmaz (başlıklar cümle düzeninde).

İlgili belgeler: [rehber-gorevler](rehber-gorevler.md) (Defter anatomisi §2.2, öneri motoru §2.3, kaldığın yer §2.4, Takvimden §2.7, kavram ve ödül defteri §3.1, Gö1–Gö10, GK-1…GK-8) · [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) (olgu şeması §6.1, yayın zinciri §6.2, "sen yokken" §6.3, KVKK §6.4, şablon/LLM §6.5, takvim paketi §5.2, hassasiyet §5.7, çevrimdışı adalet §2.5) · [gorsel-kimlik-ve-arayuz](gorsel-kimlik-ve-arayuz.md) (Kâğıt ve Çini, hareket §5.6, akış §6, ilk 60 sn §6.4) · [oyun-kimligi-harman](oyun-kimligi-harman.md) (Akşam Defteri, geri dönen oyuncu §5.6) · [cesitlilik-yonetim-askeri-teknoloji](cesitlilik-yonetim-askeri-teknoloji.md) (§8.2 "sen yokken" kartı ve gelen kutusu) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) (Pazar Günü, Çay Ocağı, Fırsat Kartı, kitabe, K-5, K-8) · [kamu-ve-kamu-arazileri](kamu-ve-kamu-arazileri.md) (ihale, hak dönüş takvimi) · [yapay-zeka-kamu-ajanlari](yapay-zeka-kamu-ajanlari.md) (haber çelişkisi §2.5) · [baslangic-ve-ustalik](baslangic-ve-ustalik.md) (Y4 D1/D7) · [argelider-sentez-1](argelider-sentez-1.md) · [docs/11 §7.8](../11-urun-donusu.md) (hareketsizlik) · [docs/12 §7–§11](../12-yon-taslagi.md).

---

## Yönetici özeti (10 madde)

1. **Açılış ekranı yeni bir sistem değil, mevcut parçaların tek bir sakin yüzde buluşmasıdır.** Net sonuç (hazine/stok farkı), biten işler, gelenler, bülten başlıkları, takvimden yaklaşanlar, "komşular" ve **tek öneri**; hepsi çekirdek durumundan ve olgu defterinden **şablonla** üretilir (LLM yok). Ekranın adı oyuncuya **"Sen yokken"**; Defter'in **Bugün** sayfasının ilk görünümüdür (rehber-gorevler §2.2). Hedef: **ilk görünümde ≤8 satır, ≤90 kelime, ortanca ≈12 sn okuma, "Devam" 0. milisaniyeden etkin, 1 tıkla oyuna geçiş** (§2).
2. **Yokluk süresi düzeni belirler: yedi bant.** <1 sa: ekran yok; 1–6 sa: tek satırlık şerit; 6–48 sa: **Gün Sayfası** (ana ekran); 2–7 gün: **Hafta Sayfası** (gazete düzeni, Pazar Gazetesi manşeti); 7–14 gün: Hafta Sayfası + sıkıştırılmış özet; 14–45 gün (uyku), 45–90 (çürüme), ≥90 (açık artırma): rehber-gorevler §2.4'teki tek karta bağlanan **"Uyku sonrası"** düzeni. Her bantta ana kart **bir** tanedir, yargı ve geçmiş suçlaması yoktur (§2.2).
3. **Metafor: açık defter + gazete.** Masaüstünde iki sayfa: **sol "Defterin"** (senin sayıların, satır çizgili, mürekkep), **sağ "Bülten"** (dünyadan haberler, serif başlık, sütun). Telefonda üç yatay sayfa (Sen · Dünya · Bugün). Kâğıt örtü, 320 ms panel girişi, sayaç animasyonu **yok** (gorsel §5.6 #7 korunur); açılış ekranı harita yüklenirken zaten okunur, yani **yükleme süresini örter** (§2.6–2.8).
4. **"Komşular" (rakip hareketleri) üç katmanlıdır ve gözetim aracı değildir.** (a) Sana doğrudan yönelen eylemler (sözleşme/ticaret teklifi, savaş ilanı): karşı taraf zaten etkileşimin tarafıdır, tabela adı görünür. (b) Kamusal olgular (ihale kazananı, unvan değişimi): **yalnız ad anma rızası varsa** adlı. (c) Toplu ve adsız pazar hareketleri ("Salı Pazarı'nda un fiyatı %6 düştü; tezgâh sayısı 11 → 14"). **Hiçbir zaman:** başkasının çevrimiçi/çevrimdışı durumu, son görülmesi, stoğu, parası. Değişmez: özet, aynı anda ilçe panosundan okunabilecek kamusal veriden fazlasını içermez (§2.4).
5. **Tek öneri = öneri motoru + dönüş kuralları.** rehber-gorevler §2.3 kural listesi dönüş bağlamıyla (karar süresi dolan > üretimi durmuş yarım iş > olay hazırlığı > Defter kritik yolu > Fırsat Kartı > "bugün yapacak bir şey yok") genişler; her öneride **"çünkü ..."** cümlesi ve **yapılabilirlik filtresi** (hazine yetmeyen eylem önerilmez) vardır; tıklayınca doğrudan hedefe uçurur (1 tık). Ölçüt: öneri tıklama oranı ve 2 dk içinde eylem tamamlama (§2.5, Dö4).
6. **Kaldığın yer kartı ekran kapandıktan sonra da yaşar:** Dikkat panelinde küçük bir çip olarak durur; içeriği (a) son bağlam, (b) ≤3 yarım iş (biten/bekleyen inşaat, eksik girdili tesis, dolu depo, yarım bırakılmış **taslak** yerleşim, teslim vadesi yaklaşan sözleşme), (c) tek öneri. **Taslak yerleşimler** (parasız hayalet) sunucu profilinde 7 gün saklanır; çekirdek şeması değişmez (§3.1).
7. **Defter ilerlemesi "damga" ile gösterilir, sayıyla ya da yüzdeyle değil.** rehber-gorevler Gİ-8 (tamamlama yüzdesi yok) korunur: kavram tamamlanınca sayfaya bir **damga** vurulur; boş yuva çizilmez (kayıp hissi, koleksiyon baskısı yok). Defter yaşlanır: gün 1–7 öğretici, gün 7–30 "Ufuk", sonra kendiliğinden **Hatıralar** sayfasına (olgu defterinden şablonla yazılan aylık kişisel günce) dönüşür (§3.2–3.3).
8. **Ödüller v2: tek seferlik + kavram başına korunur, yeni katman avantajsızdır.** Para/mal taşıyan kavramlar çekirdek `alinanOdul` kapısında kalır (GK-1/GK-2 değişmez); **yalnız kozmetik/bilgi** taşıyan ≈16 yeni kavram (tezgâh örtüsü, tabela çerçevesi, defter damgası, kitabe satırı, türetilmiş unvan etiketi, Ürün Atlası satırı) **profil tablosunda** tutulur, çekirdeğe dokunmaz. Değişmezler: **zaman sınırlı kozmetik yok, etkinlik kozmetiği giriş şartı aramaz (etkin hesap yeter), sıralama/karşılaştırma yok** (§3.4–3.6).
9. **Takvim ekranı + kişisel hatırlatma + rahatsız etmeyen bildirim.** Üç görünüm: ajanda (telefon varsayılanı), ay, **yıl şeridi** (iklim takvimi: ürün ekim/hasat pencereleri, oyuncunun ekilileriyle). Yedi olay türü (pazar günü, iklim/hasat, resmî gün ve bayram hatırlatması, seçim/meclis, ihale ve kamu hakkı, dünya olayı ön duyurusu, kişisel). **Bildirim varsayılan kapalı**, yalnız kullanıcı niyetinde (hatırlatma kurarken) izin istenir; kategori başına seçim; **günde ≤2**, sessiz saat 22:00–08:00 TRT; streak, "seni özledik", suçluluk dili yok. Tarayıcı bildirimi (Web Push) ve e-posta isteğe bağlı; takvim `.ics` aboneliği Alfa-1+ (§4).
10. **Veri ve maliyet küçüktür; geri dönüşü zor 9 karar §8'dedir.** Özet **sunum katmanıdır** (çekirdeği okur, yazmaz, `durumOzeti`'ne girmez); şablon + olgu defteri + tohumlu varyant (aynı olgu aynı metin); saklanan şey metin değil **olgu referansıdır** (KVKK silme/anonimleştirme). Oyuncu başına: iki çapa tamsayısı + ≤200 özet kaydı (≈20 KB üst sınır) + son özet ≤6 KB; 10 bin oyuncuda toplam ≲ 260 MB üst sınırı, tipik ≲ 40 MB (tahmin). Çalışma zamanı LLM'in "kişisel özet cümlesi" olarak eklenmesi **önerilmez** (≈ $270–$2.300/ay + gecikme + determinizm + enjeksiyon). **En acil kararlar:** özet çapasının iki alanlı olması, özet içeriğinin "kamusal veri sınırı" kuralı, damga/kozmetiğin profil kapısında kalması, bildirimin varsayılan kapalı ve ≤2/gün olması (§8).

---

## 0. Çerçeve: neyi tekrar etmiyoruz, neyi ekliyoruz

### 0.1 Önceki raporların bıraktığı noktalar

| Önceki raporda (tekrar edilmez) | Bu raporda ne olur |
|---|---|
| **rehber-gorevler:** Defter anatomisi (Bugün/Sayfalar/Takvimden/Kütüphane), kart durumları, öneri motoru §2.3, "kaldığın yer" yokluk tablosu §2.4 (6 sa / 2 gün / 14 / 45 / 90), ödül ilkeleri Gİ-4, kavram sözlüğü ve ödül defteri ≈₺5.650 (§3.1), Gö1–Gö10, GK-1…GK-8 | Açılış ekranının **düzeni, blokları, görsel ve zamanlaması**; kaldığın yer kartının **kalıcı yüzü ve yarım iş türleri**; Defter'in **yaşam döngüsü ve Hatıralar**; **avantajsız ödül katmanı** (yeni kavramlar); Takvim sayfasının **ekran hâli** |
| **canlı dünya:** "sen yokken" nedensellik tablosu §6.3, olgu şeması §6.1, yayın zinciri §6.2, KVKK §6.4, şablon/LLM maliyeti §6.5, takvim paketi §5.2 | Açılış ekranının **blok bütçesi, seçim kuralı ve şablon aileleri**; "komşular" **rıza matrisi**; özetin **çapa/saklama/boyut** tasarımı; çalışma zamanı LLM'in **bu ekran için** neden önerilmediği |
| **gorsel-kimlik:** palet, tipografi, hareket tokenları, ilk 60 sn akışı, yükleme durumları | Açık defter/gazete **yerleşimi**, geri dönen oyuncunun 60 sn akışı **yerine geçen** akışı (§2.7), serif kullanımı (isteğe bağlı ek serif A4+ kararına bağlanır) |
| **cesitlilik-yonetim §8.2:** "sen yokken" kartı (≤60 sn), gelen kutusu kategorileri, 14 gün sonra "uyku sonrası" 3 kartı, push/e-posta "sonra, açık izinle" | Kartın **süresi 10–20 sn'ye indirilir**; gelen kutusu ile ilişki; bildirimin **tasarımı** (kategori, kota, sessiz saat, 6563 ve KVKK sınırları) |

### 0.2 Okurken bulunan çelişkiler ve boşluklar (kararlaştırılması gerekenler)

| # | Bulgu | Kanıt | Sonuç / öneri |
|---|---|---|---|
| DB-1 | **Ad karışıklığı.** Akşam Defteri (harman/imza), Bugün (rehber-gorevler), "Sen yokken" kartı (canlı, cesitlilik). Sabah girişte "Akşam" sözü tuhaftır | harman §3.2, rehber §2.2, canlı §6.3 | **Oyuncuya görünen ad: sekme "Bugün", ekran başlığı "Sen yokken".** "Akşam Defteri" iç terim olarak yalnız **gün kapanışı satırı** (00:00 `ilce_gunluk`, Pazar Günü 17:05 satırı) için kalır; selam saate göre değişir (günaydın / iyi günler / iyi akşamlar). Kolay geri dönülür |
| DB-2 | **"<6 sa Defter kapalı"** (rehber §2.4) ile **"her girişte Akşam Defteri 30 sn"** (harman §3.6) çelişir | rehber §2.4; harman §3.6 | Yedi bant (§2.2): <1 sa yok, 1–6 sa şerit, 6 sa+ ekran. Harman'ın 30 sn'si **20 sn'nin altına** indirilir |
| DB-3 | **"Defter ilerlemesi" isteği ↔ Gİ-8 "tamamlama yüzdesi, rozet zinciri yok"** | rehber Gİ-8 | **Damga** (§3.2): sayı yok, yüzde yok, boş yuva yok; yalnız kazanılan görünür. Gİ-8'in kapsamı korunur, **gösterim biçimi** yeni |
| DB-4 | **"Rakip hareketleri" ↔ NPC rakip firma yok, KVKK, çevrimiçi durum sızıntısı.** Oyunda rakip yalnız **gerçek oyuncudur**; adları kişisel veri olabilir | canlı §4.4, §6.4; imza K-8 | Arayüzde "rakip" sözü kullanılmaz: blok adı **"Komşular"**. Üç katman + yasak liste (§2.4). Hukuki görüş gerekir (K34, **doğrulanmadı**) |
| DB-5 | **Bülten 06:00'da yayımlanır**, oyuncu 02:00'da girer | canlı §6.2 | Bülten bloğu yalnız **yayımlanmış son sayıyı** gösterir ve tarihini yazar ("9 Ekim bülteni"); yayınlanmamış olgular bültene değil **Dikkat** maddesine (karar gerektiriyorsa) ya da Net sonuç'a girer |
| DB-6 | **Çekirdek stok/para "tembel"dir** (`ticaretDefteri {toplam, oran, t0}`); "geçmiş bir andaki değer" elle hesaplanamaz | canlı §6.3 | **İki çapa** gerekir: çıkışta anlık görüntü (`sonGorulen`) ve özetin görüldüğü an (`ozetOkunduT`). Kirli çıkış (sunucu çökmesi) için yedek: son kabul edilen komutun zamanı ve komut günlüğünden yeniden türetme (§5.1) |
| DB-7 | **"Dönüş ödülü yoktur" (cesitlilik §8.2 kural 1, K13)** ↔ `ilk_donus` damgası (rehber §3.1) | rehber §3.1; cesitlilik §8.2 | `ilk_donus` **tek seferlik, kavram başına, kozmetik+bilgi** olduğundan günlük giriş ödülü sayılmaz; yine de "dönüş ödülü" yorumuna yakındır. Öneri: korunur, ama **ikinci bir dönüş damgası hiç eklenmez** (DK-7) |
| DB-8 | **"Modal yok" (Gİ-2)** ↔ açılış ekranı tam örtü gibi görünür | rehber Gİ-2 | Açılış ekranı **engelleyici değildir:** harita arkada yüklenir, `Esc`, boş alana tık, aşağı kaydırma (telefon) ve haritada ilk etkileşim kartı şeride küçültür. Odak: `Devam` düğmesi. Gerçek modal (zorunlu seçim) yoktur |
| DB-9 | **Çekirdekte gelen olay yalnız iki kare farkıdır** (`gelenOlaylari(onceki, simdi)`); çevrimdışı pencerenin arasındaki kareler yoktur | `packages/istemci/src/arayuz/gelen-kutusu.ts` | Çevrimdışı özet **istemciden türetilemez;** sunucuda oyuncu başına özet kaydı gerekir (cesitlilik §8.2 tamponu: ≤200 kayıt). İstemci yalnız şablonu yazar |
| DB-10 | **Mevcut istemci takvimi sim-saatine bağlıdır** (`takvimDurumu(simSaat, {baslangicGunu, gunCarpani, ayGunleri})`, "N. yıl" etiketi). Gerçek takvim kararı (1:1, mutlak saat) ile uyuşmaz | `packages/istemci/src/veri/tarim.ts`, `arayuz/panel.ts` `takvimYaz` | Üst çubuk takvimi gerçek tarihe (`2026`, Europe/Istanbul) geçer; "N. yıl" etiketi kalkar. `takvimGorunumu(...)` saf modülü ona yer açar (§7) |
| DB-11 | **Anma günleri** (17 Ağustos, 6 Şubat, 10 Kasım) "sessiz gün" önerisi sahip onayındadır | canlı §5.7 | Takvim ekranında **madde olarak gösterilmez;** yalnız o gün toast, süs ve şenlik açılmaz (ton). Onaya kadar hiçbir şey eklenmez |
| DB-12 | **"Push ve e-posta sonra"** (cesitlilik §8.2) ↔ sahibin takvim beğenisi ve hatırlatma beklentisi | cesitlilik §8.2 | Bu rapor tasarımı verir, **Alfa-1+ ve yalnız açık izinle** gönderir; Alfa-0'da yalnız oyun içi hatırlatma (§7) |

### 0.3 Koddan okunan gerçekler (kısa)

| Alan | Bulgu | Dosya |
|---|---|---|
| Gelen kutusu | İstemci yalnız **iki kare arasındaki** savaş/inşaat/iklim değişimini üretir (`gelenOlaylari`), en çok 40 olay (`GELEN_EN_COK`); toast yalnız oyuncunun kendi eylemi içindir | `packages/istemci/src/arayuz/gelen-kutusu.ts`, `bildirim.ts` |
| Dikkat paneli | `dikkat.ts` mevcut; Dikkat ≤5 madde ilkesi | `packages/istemci/src/arayuz/dikkat.ts` |
| Takvim | Sim saatinden ay adı ve hasat oranı üretir; üst çubuğa yazar | `packages/istemci/src/veri/tarim.ts`, `arayuz/panel.ts` |
| El sıkışma | `merhaba → hosgeldin` (kural sürümü, dizin); dönüş özeti için **yeni alan** (`donusOzeti`) eklenebilir | `packages/protokol/src/mesajlar.ts` |
| Depo | `bellek`, `dosya`, `postgres`: oyuncu profil/çapa tabloları için yer var (şema `sunucu/src/depo/tipler.ts`) | `packages/sunucu/src/depo/` |

---

## 1. Kanıt ve karşılaştırma

### 1.1 Rakipler ve benzer oyunlar: ne yapıyorlar, bizim için ne anlama geliyor

| Oyun / örüntü | Dönüşte ne olur | Bizim için ders | Kaynak |
|---|---|---|---|
| **Mobil idle/tycoon "hoş geldin" ekranı** | Dönüşte çevrimdışı birikim **modal** olarak gösterilir; birikime **üst sınır** (çoğunlukla 2–24 saat) konur; kazancı katlamak için **ödüllü reklam** önerilir | Doğru olan: birikimi **hemen** göstermek ve bir tıkla geçmek. **Almıyoruz:** modal engelleme, reklam kapısı, çevrimdışı birikimde sınır ve "katla" baskısı; üretim bizde tembel formülle zaten birikir ve sınırsızdır | [Game-Ace](https://game-ace.com/blog/idle-game-development/) · [Design the Game](https://www.designthegame.com/learning/courses/course/designing-mobile-idle-genre/a-deep-dive-idle-genre-game-design) (arama özeti) |
| **Animal Crossing: New Horizons** | Gerçek saat 1:1; oyuncu her girişte **Isabelle** ile günün tarihini ve özel olayları duyurur; olay yoksa ziyaretçi/küçük haber verir, yani **her gün küçük bir selam ritüeli** vardır; olaylar yalnız gerçek tarihte açılır | **Selam şeridi** (§2.10) ve gerçek takvim bağlı olaylar. **Almıyoruz:** olayı o gün girmeyenin kaçırması baskısı (bizde olay kozmetiği giriş şartı aramaz) | [Nookipedia: Isabelle](https://nookipedia.com/wiki/Isabelle) · [Clock](https://nookipedia.com/wiki/Clock) · [Events](https://nookipedia.com/wiki/Event/New_Horizons) (arama özeti) |
| **Stardew Valley** | **Gün sonu özeti:** uyuyunca kazanç ekranı; **takvim** (festival ve doğum günleri) mahalle panosunda ve evde durur, oyuncu bakmak istediğinde bakar | Özetin **tek bir yüze** sığması ve takvimin **sessiz bir pano** olması. **Almıyoruz:** özetin zorunlu uyku/gün sonu eylemine bağlanması | [Wiki: Shipping](https://stardewvalleywiki.com/Shipping) · [Wiki: Calendar](https://stardewvalleywiki.com/Calendar) (arama özeti) |
| **EVE Online** | Beceri eğitimi **gerçek zamanda, çevrimdışıyken de** sürer; kuyruk oyuncuyu uzun süre "dolu" tutar | Çevrimdışı ilerleme **bir sözdür** ve oyuncuyu cezalandırmaz. **Almıyoruz:** abonelik/hesap türüne bağlı kuyruk sınırı. Bizde kuyruk yerine "Genel Talimat" (canlı §2.5 F2) | [EVE dev blog](https://community.eveonline.com/news/dev-blogs/longer-queues-expected-skill-training-above-and-beyond-24-hours) (arama özeti) |
| **Albion Online** | Adada **işçi + günlük defteri** (journal) ile çevrimdışı üretim; işçi belirli saat sonra malzemeyle döner; Journal görevleri "oyunla yapılmışsa tamamlanmış" sayılır | Dönüşte **teslim edilecek bir şey** olmasının hoşluğu; Journal ilkesi zaten rehber-gorevler Gİ-3'te. **Almıyoruz:** "22 saat sonra topla" gibi zaman penceresi mekaniği (uğrama baskısı) | [Albion Wiki: Journal](https://wiki.albiononline.com/wiki/Journal) · [Laborers](https://www.albioncodex.com/guides/albion-online-laborers-guide) (arama özeti) |
| **Clash of Clans** | **Savunma kaydı:** saldırılar listelenir, her kayıt **tekrar** izlenebilir (mantık + dokunuşlardan yeniden oynatma, video değil); "Revenge" için **12 saat** pencere | Kayıt fikri komut günlüğüyle ucuzdur; **içeriği ve yeniden oynatma askeri raporun konusudur** (§2.4 notu). **Almıyoruz:** intikam penceresi (zaman baskısı) ve "seni saldırdılar" bildirimi; bizde savaş ilanı ≥12–24 sa önceden yazılıdır (docs/11 §7.7) | [CoC Revenge](https://clashofclans.fandom.com/f/p/2539460356997402692) · [Supercell/X: replay](https://x.com/ClashofClans/status/1737801293370884157) · [Sportskeeda](https://www.sportskeeda.com/mobile-games/how-new-revenge-feature-works-clash-clans) (arama özeti) |
| **Capital Rift** | Üretim ve satış çevrimdışıyken sürer; günlük görev/ödül **bulunamadı** | Hedeflenen duygu "gelince işler yürümüş"; günlük seri yok. Bizim çizgi aynı | [capital-rift-mekanikleri §1.3](capital-rift-mekanikleri.md) (iç belge) |
| **Duolingo streak ve bildirimleri** | Seri kaybı korkusu giriş nedeni olur; suçluluk dilli bildirimler ("Duo üzüldü") eleştirilir; "streak creep" | **Karşı örnek.** Seri, günlük giriş ödülü, suçluluk dili ve "son şans" tonu yok; §1.3 denetim listesi | [The Decision Lab](https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification) · [Screenwise](https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids) (arama özeti) |
| **Tarayıcı bildirim izni** | Etkileşim sinyali olmadan sorulan izin istemleri **%12**, kullanıcı etkileşiminden sonra **%30** kabul edilir; Chrome düşük etkileşimli ve çok bildirim gönderen sitelerin iznini **otomatik kaldırır** ve Push API'ye 2026'dan itibaren oran sınırı uygular; iOS'ta Web Push yalnız **Ana Ekrana eklenmiş** web uygulamasında ve kullanıcı dokunuşuyla çalışır | Bildirimi **niyet anında** isteriz, az göndeririz, e-postayı eşit alternatif sunarız (§4.6) | [web.dev permissions](https://web.dev/articles/permissions-best-practices) · [Chrome push rate limits](https://developer.chrome.com/blog/web-push-rate-limits) · [Chrome auto-revoke](https://blog.google/chromium/automatic-notification-permission/) · [WebKit: Web Push iOS](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/) |

### 1.2 Karşılaştırmanın sonucu (al / uyarla / alma)

| Karar | Ne |
|---|---|
| **Al** | Dönüşte tek yüzlü özet (Stardew, mobil); günlük küçük selam ritüeli (Animal Crossing); çevrimdışı ilerleme sözü (EVE, Capital Rift); olay kayıtları (Clash; yeniden oynatma askeri raporun konusu); sessiz takvim panosu (Stardew) |
| **Uyarla** | Isabelle'in duyurusu → **selam şeridi** (kapatılabilir); Clash savunma kaydı → katman 1'de yalnız bir özet satırı (intikam penceresi yok; kayıt içeriği askeri rapor); Albion journal → Defter damgası (zaman penceresi yok) |
| **Alma** | Reklam kapılı "katla"; birikim üst sınırı; dönüş/giriş ödülü; seri; zaman penceresi mekaniği (intikam, "22 saatte topla"); suçluluk ve "son şans" dili; bildirimi sayfa yüklemede isteme |

### 1.3 "Uğramazsan kaybedersin" baskısından kaçınma: denetim listesi

Bu liste kabul testidir. Her satırın karşısındaki kural **ürün değişmezi**dir; ihlali hata sayılır.

| # | Baskı örüntüsü | Bizdeki kural | Nasıl korunur |
|---|---|---|---|
| U1 | Günlük/haftalık seri | **Yok.** Hiçbir sayaç ardışık gün saymaz | Şema: ardışık gün alanı tutulmaz (veri minimizasyonu); kod incelemesi |
| U2 | Günlük giriş ödülü, dönüş bonusu | **Yok** (K13). Para ve mal ödülü yalnız kavrama bağlıdır | `sistem_odul` yalnız `kavram` taşır (rehber GK-1); özet ekranında ödül düğmesi yok |
| U3 | Zaman sınırlı kozmetik ("son 3 gün") | **Yok.** Etkinlik kozmetiği o dönemde **etkin hesap** olana otomatik verilir; kaçıran bir sonraki yıl alır ya da "arşiv"den kozmetik hakkını kullanır | §3.4 Ö3 |
| U4 | Geri sayımla baskı ("2 saat kaldı!") | Yaklaşan tarih **yalnız tarihtir**: "Salı 14:00" yazılır, "kalan süre" kırmızıya boyanmaz, geri sayım sayacı yoktur. Karar süresi (ihale, seçim) **ön duyuru ≥24 sa** ve yazılı | §2.9 yasaklı kalıp sözlüğü |
| U5 | Suçluluk ve kayıp dili ("kaçırdın", "kaybettin", "geç kaldın", "son şans", "seni özledik") | **Yok.** "Kaçırdığın talep" karşı-olgusu hiç hesaplanmaz (canlı §6.3) | Metin sözlüğü lint testi (§6) |
| U6 | Sosyal kıyas ("arkadaşın seni geçti") | **Yok.** Damga ve unvan sıralanmaz, sayı gösterilmez | §3.2, §3.4 Ö4 |
| U7 | Reklam/gecikme kapılı "Devam" | **Yok.** `Devam` 0 ms'den etkin | §2.7 |
| U8 | Bildirimle geri çağırma ("saldırı altındasın!" gibi) | Bildirim **varsayılan kapalı**, günde ≤2, sessiz saat, pazarlama yok; savunma ön duyurusu yalnız **kullanıcının açtığı** "acil" kategorisinde | §4.6 |
| U9 | Gerçek kayıp merdiveni | Var ama **uzun ve önceden yazılı:** 14 gün uyku (üretim durur, ceza değil), 45 gün %2 çürüme, 90 gün açık artırma (docs/11 §7.8). **Girmek yeter:** oyuncunun "bir şey yapması" gerekmez, giriş zamanı sıfırlar. Uyarılar gün sayısıyla tek kez, sakin | §2.2 son satırlar, §4.6 koruyucu sınıf |
| U10 | Özetin kendisinin korku kaynağı olması | Gider/kayıp satırları **nötr dille** ve net toplamın içinde ("vergi ve bakım −₺120"); kırmızı yalnız hata/başarısızlık durumunda, normal giderde kullanılmaz | §2.6 renk kuralı |

---

## 2. Açılış ekranı: "Sen yokken"

### 2.1 İlkeler

| # | İlke | Dayanak |
|---|---|---|
| Dİ-1 | **Yargılamaz, sürüklemez, ödüllendirmez.** Özet bilgi verir; geçmişi suçlamaz; "buradayken şunu yapardın" yok | canlı §6.3; K13 |
| Dİ-2 | **Süre bütçesi:** ilk görünümde ≤8 satır, ≤90 kelime; ortanca okuma ≈12 sn, 90. yüzdelik ≤30 sn. Daha fazlası "Ayrıntı" ile açılır | Hedef; ölçüt Dö2 |
| Dİ-3 | **1 tıkla oyuna:** `Devam` (çini, birincil) 0 ms'den etkindir; `Enter`, `Esc`, boş alana tık, telefonda aşağı kaydırma aynı işi görür; **tek birincil düğme** | gorsel §5.3; Dİ-8 |
| Dİ-4 | **Atlanabilir ve ayarlanabilir:** ekran alt satırında "Ne zaman gösterilsin" (Her zaman · 6 saatten sonra · Yalnız şerit); atlama bedelsizdir ve hesaba yazılır | rehber Gİ-7 |
| Dİ-5 | **Tek öneri** (iki ya da üç değil) ve her zaman "çünkü" cümlesiyle | rehber §2.3 |
| Dİ-6 | **Her satır bir yere götürür** ("Git" tek eylem): satıra tık, ilgili yapı/panel/haritaya uçar | arayuz-ux Dikkat "Git" |
| Dİ-7 | **Şablon + olgu; LLM yok.** Metin render anında üretilir; saklanan olgudur | canlı §6.5; yapay-zeka §2.5 |
| Dİ-8 | **Aynı veri, iki yüzey:** her satır Dikkat paneli/Defter'den de erişilir; açılış ekranı tek yol değildir (erişilebilirlik, "zorunlu uğrama yok") | docs/11 §7.1 |
| Dİ-9 | **Boş ekran meşrudur:** hiçbir şey olmadıysa ekran **açılmaz**; küçük bir selam şeridi yeter ("Dünya sakindi.") | Fırsat Kartı kuralı |
| Dİ-10 | **Harita yüklenirken okunur:** ekran, `hosgeldin` ve özet gelir gelmez küre/harita arkada yüklenirken açılır; `Devam` harita hazır olunca kamera inişini başlatır | gorsel §6.2 |
| Dİ-11 | **Kamusal veri sınırı:** özet, aynı anda ilçe panosunda herkese açık olan göstergeler dışında başkası hakkında bilgi içermez (§2.4) | KVKK, adalet |
| Dİ-12 | **Erişilebilirlik:** `prefers-reduced-motion` ve oyun içi ayar tüm geçişleri ≤80 ms opaklığa indirir; ekran okuyucu için sıra: başlık → net sonuç → öneri → diğerleri; renk yalnız taşıyıcı değildir (+/− işareti, ikon) | gorsel §5.6 |

### 2.2 Yokluk bantları ve düzen

"Yokluk" = son **etkin** oturum bitişinden bu yana geçen süre (çıkış çapası `sonGorulen.t`, §5.1). Eşikler öneridir. Bantlar rehber-gorevler §2.4'ü **bozmaz, ayrıntılandırır:** orada "<6 sa" tek satır olarak geçer; burada 0–1 ve 1–6 sa ayrılır.

| Bant | Yokluk | Ad ve yüz | Bloklar (bölüm kodu §2.3) | Madde bütçesi | Okuma | Atlama |
|---|---|---|---|---|---|---|
| **K0** | < 1 sa | Yok; yalnız Dikkat paneli güncellenir | — | — | 0 sn | — |
| **K1** | 1–6 sa | **Şerit** (Dikkat paneli üstünde tek satır) | B1 net sonuç özeti (tek cümle) + varsa "karar bekleyen" sayısı | 1 satır | 2–3 sn | Kapat (×), tıklayınca Gün Sayfası açılır |
| **K2** | 6–48 sa | **Gün Sayfası** (açık defter / telefonda 3 sayfa) | B0 başlık, B1 net sonuç, B2 biten işler, B3 gelenler, B5 takvimden (≤2), B6 komşular (≤2), B7 öneri; B4 bülten **1 başlık** | ≤8 satır ilk görünüm | ≈12 sn | `Devam` |
| **K3** | 2–7 gün | **Hafta Sayfası** (gazete düzeni) | K2'nin hepsi + **Pazar Gazetesi manşeti** (Haftalık Dünya Raporu) + B4 **3 başlık** + günlere göre mini döküm (≤7 nokta) | ≤10 satır | ≈18 sn | `Devam` |
| **K4** | 7–14 gün | **Hafta Sayfası, sıkıştırılmış** | K3, ama B1–B3 **toplamlar ve "en büyük 3 değişim"** biçiminde; B7 öneri; olay/ihale **karar bekleyenler** öne | ≤10 satır | ≈18 sn | `Devam` |
| **K5** | 14–45 gün (**uyku**: üretim durur, vergi donar; docs/11 §7.8) | **"Yurdun seni bekliyordu"** tek kart + 3 kart (**ne değişti · yurdun hâli · ilk 3 öneri**; cesitlilik §8.2) | Ana kart: **"Üretimi yeniden aç"** (rehber §2.4); B4 1 başlık; kaybedilen üretim sayısı **gösterilmez** | 3 kart | ≈20 sn | `Devam` |
| **K6** | 45–90 gün (yapı çürümesi %2/gün) | K5 + "Yapıların yıpranmış" | Ana kart: **"Onarım"** (`genel_onarim`, rehber §2.4) | 3 kart | ≈20 sn | `Devam` |
| **K7** | ≥ 90 gün (açık artırma) | "Parselin satışa çıktı/satıldı; alacağın var." **Kamu hakkın varsa:** "Kamu hakkın ve üzerindeki yapı açık artırmaya çıktı (kamu arsası açık artırılmaz, yalnız hak ve yapı); borç düşüldükten sonra alacağın var" (docs/12 §10, sentez-1 G18) | Ana kart: **"Alacağını gör"** (hak ve/veya parsel satıldıysa), ardından **"Yeniden başlangıç"** (rehber GS-4: sahip kararı) | 3 kart | ≈25 sn | `Devam` |

**Kurallar.**

1. **Sık giren oyuncunun ekranı değişmez** (K0–K1): günde 5 kez giren kişiye her seferinde kart gösterilmez.
2. **Bir bant geçişi aynı gün içinde tek ekran gösterir:** ekran kapandıktan sonra çapa ilerler (`ozetOkunduT`, §5.1); 3 saat sonra dönen kişi K1 olur, yeni bir Gün Sayfası görmez.
3. **Tatil modu** (yılda ≤30 gün) bitişinde ekran **"Hoş geldin, tatil modun bitti"** der ve K2/K3 düzenini kullanır; uyku/çürüme dili hiç kullanılmaz (tatil modunda hareketsizlik sayacı akmaz; docs/11 §7.8).
4. **Girmek yeter** cümlesi K5–K7'de kartın alt satırında yazılıdır: "Bir şey yapman gerekmiyor; girmen sayacı sıfırlar." (U9).
5. **Aynı hesap iki cihazda:** çapa hesaba bağlıdır (sunucu); ikinci cihazda ikinci ekran gösterilmez; Defter > Bugün > "Son özet" ile yeniden açılabilir (24 sa, §5.3).
6. **İlk giriş** (çapa yok): ekran yoktur; ilk 60 sn akışı sürer (gorsel §6.4).

### 2.3 Bloklar ve içerik kuralları

Her blok bir **madde listesidir;** madde = `{şablonKodu, tohum, değerler[], git, önem}` (§5.2). Seçim: önem puanı + blok kotası + tür çeşitliliği (canlı §6.2 DF dersi: aynı türden en çok 1).

| Blok | Ne gösterir | Kaynak | Alfa | Kural |
|---|---|---|---|---|
| **B0 Başlık şeridi** | Selam (saate göre), tarih ("Cumartesi 10 Ekim 2026"), yokluk ("dün 19:40'tan beri"), iklim bir satır ("Bu hafta Marmara'da don riski yok"), **sakin gün** işareti | Saat, takvim paketi, iklim olay kuyruğu | A0 | Kişi adı yok; tek satır |
| **B1 Net sonuç** | **Hazine farkı** (`nakit(şimdi) − nakit(sonGörülen)`) tek cümlede ve **üç kalem:** satış geliri, giderler (vergi, bakım, komisyon), diğer (sözleşme, kamu siparişi); **üretim:** en çok 3 mal; **stok uyarısı** (depo dolu ya da kritik düşük) | Çekirdek defter farkı (O(1)); `ticaretDefteri` | A0 | Her kalem **işaretli** (+/−) ve nötr dil; "neden" üç rengi (olay/piyasa/senin kararın; canlı §6.3) **Alfa-0'da yalnız piyasa/senin kararın**, olay etiketli satırlar A0-3 olgu defteriyle gelir |
| **B2 Biten işler** | Biten inşaat, biten araştırma, kasadan çıkan hasat, teslim edilen sözleşme | Oyuncu özet kayıtları | A0 | Aynı türden çoğunu **topla** ("3 yapı bitti"); ilk iki ad ve "Git" |
| **B3 Gelenler** | Yeni sipariş/sözleşme teklifi, kamu siparişi ilanı, ihale ilanı, ticaret anlaşması teklifi, rehberlik daveti | Olgu defteri + özet kayıtları | A0 (kamu siparişi) · A1 (ihale, sözleşme) | **Karar gerektirenler** üstte; süre/vade tarih olarak yazılır (geri sayım yok) |
| **B4 Bülten** | İlçe Bülteni başlıkları (K2: 1, K3–K4: 3) + **Haftalık Dünya Raporu** manşeti (Pazar Gazetesi, K3+) + "Çay ocağından" (yalnız **doğrulanmış ve yaklaşan** olay ipucu; imza İ-4) | Olgu → şablon (canlı §6.2); statik JSON, CDN | A0-3 (ilçe bülteni) · A1-2 (il gazetesi, haftalık rapor) | Yalnız **yayımlanmış son sayı** (DB-5); başlık serif, 1 satır + 1 cümle; **ihale tutanağı alıntısı** kutusu kamu belgesi olarak (yapay-zeka §2.5) |
| **B5 Takvimden** | En yakın ≤2 madde: pazar günü, bayram hatırlatması, hasat penceresi, seçim, ihale kapanışı, hak bitişi | Takvim paketi + çekirdek/ihale durumu | A0 (hasat, kış hazırlığı, Cumhuriyet Bayramı) | Tarih yazılır; kırmızı/ geri sayım yok; hassas olaylar §4.4 |
| **B6 Komşular** | §2.4'e göre üç katman | Olgu + özet kayıtları | A0 (adsız pazar) · A1 (adlı, sözleşme/savaş) | **Yasak liste** ve rıza matrisi (§2.4) |
| **B7 Öneri** | Tek öneri + "çünkü" + `Git` | Öneri motoru (§2.5) | A0 | Yapılabilirlik filtresi; 3 kez art arda gösterilip etkileşim yoksa sıradaki kural |

**Örnek içerik (Gün Sayfası, Cumartesi 10 Ekim 2026 sabahı; oyuncu Cuma 19:40'ta çıktı).** Sayılar uydurmadır, yalnız düzen içindir.

```
Günaydın · Cumartesi 10 Ekim 2026 · dün akşamdan beri 14 saat
Sen yokken
 +₺1.960: satış +₺2.140 (38 satış, gıda), giderler −₺180 (vergi ve bakım)
 Çiftlikten 220 tahıl, Ahırdan 60 gıda ve 12 gübre çıktı  (depo %88)
 Ahır bitti · Çelikhane elektrik bekliyor ▲                         [Git]
 Yeni: İlçe esnaf siparişi (gıda, 60 adet, teslim Salı)             [Git]
 Salı Pazarı: başvuru Pazar 07:00'de açılır, Pazartesi 07:00'ye kadar
 Komşular: mahallende un fiyatı %6 düştü, tezgâh sayısı 11 → 14
 Bülten: "Nilüfer'de hasat bereketli geçti"
Bugün şuna bakabilirsin
 Çelikhane için elektrik sağla. Çünkü çelik hattın 9 saattir elektrik bekliyor.   [Git]
                                                  [Devam]
```

### 2.4 "Komşular" bloğu: rakip hareketleri, KVKK ve rıza

Oyunda NPC rakip firma **yoktur** (canlı §4.4); "rakip" gerçek oyuncudur. Başkasının adı, tabela adı bile olsa, KVKK açısından **kişisel veri olabilir** ve takma adlaştırma anonimleştirme değildir (canlı §6.4; [24] orada). Bu yüzden blok üç katmanlıdır.

| Katman | İçerik | Ad gösterilir mi? | Dayanak |
|---|---|---|---|
| **1 · Sana doğrudan yönelen** | Gelen sözleşme/ticaret teklifi, savaş ilanı, baskın ön duyurusu (A1), rehberlik daveti, **savunma kaydı** (A1) | **Evet, tabela adı:** karşı taraf zaten etkileşimin tarafıdır; yanıt vermek için kim olduğu gerekir | Etkileşimin doğası; **hukuki görüş gerekir (K34, doğrulanmadı)** |
| **2 · Kamusal olgu** | İhale kazananı, "ilçenin en büyük işvereni değişti" (unvan), imece kitabesi | **Yalnız ad anma rızası varsa;** yoksa "bir esnaf", "bir hemşehrimiz" | canlı §6.4; imza K-8 (`gorunurKimlikRef`); kamu KK-12 |
| **3 · Toplu ve adsız** | Fiyat, tezgâh sayısı, yeni esnaf sayısı, ilçe seviyesi, arz yoğunluğu | Hiç ad yok | İlçe panosu/Pazar Endeksi |

**Yasak liste (hiçbir koşulda gösterilmez):** başkasının çevrimiçi/çevrimdışı olması, son görülme/giriş saati, stoğu, nakdi, aktif komut sayısı, yürüyüşteki konumu, "senden önce şunu aldı" gibi **tek kişiye** bağlanabilen ayrıntı; ayrıca "kim seni izledi" ya da profil ziyareti. Nedeni: (i) gözetim ve taciz yüzeyi, (ii) baskın zamanlaması sızıntısı (H5 koruması), (iii) KVKK.

**Değişmez (test edilir):** özet bloğu B6'nın her satırı, aynı anda **kamusal ilçe panosunda** ya da etkileşimin tarafı olarak sana zaten açık veriden türetilebilir. `komsular_kamusal_sinir.test`: B6 üreticisi yalnız `kamusal` etiketli alanlara erişir; başka alan okumaya çalışırsa derleme/test hatası.

**Savunma kaydı (kapsam dışı).** Askeri çatışma varsa özet, katman 1'de yalnız bir **özet satırı** gösterir (kim, hangi pencere, sonuç, onarım gerekli mi) ve ilgili askeri panele götürür. Savunma kaydının içeriği ve olayın **yeniden oynatılması** askeri raporun konusudur, bu raporda tasarlanmaz. Bu raporun kuralı yalnız şudur: **intikam penceresi ve "saldırıya uğradın!" bildirimi yok** (U8); savaş zaten ≥12–24 sa önceden ilan edilir (docs/11 §7.7), parsel el değiştirmez (kayıp 0).

### 2.5 Tek öneri: kurallar

rehber-gorevler §2.3'ün kural listesi (1. olay ≤3 gün, 2. yarım iş, 3. kritik yol, 4. yan görev, 5. hiçbiri) **dönüş bağlamıyla** şöyle genişler. İlk eşleşen kural öneri olur; öneri **yapılabilir** değilse (hazine, stok, izin yetmiyor) sıradaki kural denenir.

| Sıra | Kural | Örnek öneri ve "çünkü" |
|---|---|---|
| 1 | **Karar süresi dolan** (ihale kapanışı, seçim kapanışı, tezgâh başvurusu, hak bitişi T−14/T−7; hepsi ≥24 sa önce yazılı) | "Salı Pazarı başvurusunu yap. Çünkü başvuru Pazartesi 07:00'ye kadar." |
| 2 | **Yarım iş**, üretimi durdurmuş (eksik girdi ▲, elektriksiz tesis, yöntemsiz tesis) | "Çelikhane için elektrik sağla. Çünkü çelik hattın 9 saattir elektrik bekliyor." |
| 3 | **Yarım iş**, israf eden (depo dolu, taslak yerleşim yarım) | "Ambarını yükselt ya da fazla buğdayı sat. Çünkü depo %88 dolu." |
| 4 | **Olay hazırlığı** (≤3 gün; rehber §2.3 kural 1) | "Kışa hazır ol. Çünkü yakıt stoğun düşük, kış hazırlığı 3 gün sonra." |
| 5 | **Defter kritik yolu** (ilk_yapı → ilk_satis → ilk_isleme → zincir → ilk_dukkan → ilk_sozlesme) | "Bereket: ilk satışını yap." |
| 6 | **Fırsat Kartı** (imza §4.2, günde ≤1) | "İlçende gıda fabrikası yok: hasat zirvesinde fiyat %30 düşüyor." |
| 7 | Hiçbiri | **Öneri yok;** "Bugün yapacak bir şey yok. Bereket versin." (meşru) |

**Ek kurallar.**

- **Sürdürme:** aynı öneri 3 kez art arda gösterilip tıklanmadıysa sonraki kural seçilir (48 sa gizleme, rehber Gİ-7).
- **Yapılabilirlik filtresi:** öneri hazine/stok/hak şartını **şimdi** sağlıyor olmalı; sağlamayan eylem için "önce şunu yap" zinciri **yazılmaz** (iki öneri olur).
- **Para önerisi yok:** "daha çok harca/yatırım yap" türü genel öneri üretilmez; yalnız **somut eksik** (girdi, elektrik, depo, tarih) önerilir.
- **Önerinin kaynağı çekirdek durumudur;** yeni sayaç/puan yoktur. Önerinin **hangi kural**dan geldiği günlüğe yazılır (Dö4 kırılımı).
- **Dönüş bağlamı:** K5–K7'de ana kart bandın kuralıdır ("Üretimi yeniden aç", "Onarım", "Alacağını gör / Yeniden başlangıç"); öneri motoru orada tek kart olarak onu seçer. **Kamu hakkı sahibi** için K6/K7 metni hak ve yapıdan söz eder: 90. günde hak ve üzerindeki yapı açık artırmaya çıkar, gelir borç düşüldükten sonra alacak olur; kamu arsasının kendisi satılmaz.

### 2.6 Görsel düzen: "Kâğıt ve Çini" içinde açık defter ve gazete

**Ruh hali.** "Sabahın erken saatinde semt pazarı… ekran bir defter sayfası gibi sakin durur" (gorsel §2.1). Açılış ekranı bu cümlenin somut yüzüdür: gazete bayiinden alınan küçük bir gazete ve kendi veresiye defterin yan yana.

**Yerleşim.**

| Bölge | Masaüstü (≥1024 px) | Telefon (≤640 px) |
|---|---|---|
| Kap | Ortada **açık defter**, en çok 880 × 560 px, `yuzey`, `r-lg`, `golge-2`; arka plan: harita/küre `soluk` + kâğıt örtü α 0,85 → 0,6 | Alttan **tam yükseklikli sayfa** (bottom sheet), üstte 16 px gutter, `r-lg` üst köşeler |
| Sol sayfa **"Defterin"** | B0, B1, B2, B3 (satır çizgili: her madde bir "satır", ince ayırıcı `cizgi`; sayılar Inter tabular, sağa hizalı) | **Sayfa 1/3 "Sen":** aynı içerik, tek kolon |
| Sağ sayfa **"Bülten"** | Üstte künye (ilçe adı, tarih, serif); B4 başlıklar (serif), B5 takvimden, B6 komşular | **Sayfa 2/3 "Dünya":** aynı içerik; yatay `scroll-snap` ile geçiş, sayfa noktaları |
| Alt şerit | **"Bugün şuna bakabilirsin"** (B7) ve `Devam`; B7 sol sayfanın altı değil, iki sayfayı kapsayan şerittir | **Sayfa 3/3 "Bugün":** B7 tek kart + `Devam` (sabit alt çubuk, 44 px) |
| Alt satır (küçük) | "Ne zaman gösterilsin ▾" · "Son özet" bağlantısı | Aynı |

**Masaüstü wireframe (K2, Gün Sayfası).**

```
┌───────────────────────────────────────────────────────────────────────────┐
│ Günaydın · Cumartesi 10 Ekim 2026               dün akşamdan beri 14 sa   │
├──────────────────────────────────┬────────────────────────────────────────┤
│ Sen yokken                       │  Nilüfer Bülteni · 9 Ekim              │
│ ──────────────────────────────── │  ────────────────────────────────────  │
│ +₺1.960   38 satış, giderler     │  Hasat bereketli geçti                 │
│           −₺180                  │  (serif başlık, tek cümle)             │
│ ──────────────────────────────── │  ────────────────────────────────────  │
│ Üretimden çıkanlar               │  Takvimden                             │
│ Çiftlik 220 tahıl · Ahır 60 gıda│  Paz  Salı Pazarı: başvuru 07:00'de    │
│ ──────────────────────────────── │  28 Eki  Cumhuriyet Bayramı (18 gün)   │
│ Ahır bitti · Çelikhane ▲  [Git]  │  ────────────────────────────────────  │
│ ──────────────────────────────── │  Komşular                              │
│ Yeni esnaf siparişi        [Git] │  Mahallende un fiyatı %6 düştü;        │
│ gıda · 60 adet · teslim Salı     │  tezgâh sayısı 11 → 14                 │
├──────────────────────────────────┴────────────────────────────────────────┤
│ Bugün şuna bakabilirsin: Çelikhane için elektrik sağla.           [Git]   │
│ Çünkü çelik hattın 9 saattir elektrik bekliyor.                 [Devam]   │
│ Ne zaman gösterilsin ▾                                  Son özet · Esc    │
└───────────────────────────────────────────────────────────────────────────┘
```

**Telefon wireframe (3 yatay sayfa).**

```
┌──────────────────────┐   ┌──────────────────────┐   ┌──────────────────────┐
│ Günaydın             │   │ Nilüfer Bülteni      │   │ Bugün şuna           │
│ 10 Ekim · dün akşam  │   │ 9 Ekim               │   │ bakabilirsin         │
│ ──────────────────── │   │ ──────────────────── │   │                      │
│ +₺1.960              │   │ Hasat bereketli      │   │ Çelikhane için       │
│ 38 satış, −₺180      │   │ geçti                │   │ elektrik sağla.      │
│ ──────────────────── │   │ ──────────────────── │   │ Çünkü çelik hattın   │
│ Çiftlik, Ahır: çıktı │   │ Salı Pazarı: başvuru │   │ 9 saattir elektrik   │
│ Ahır bitti           │   │ Pazar 07:00'de açılır│   │ bekliyor.  [Git]     │
│ Çelikhane ▲  [Git]   │   │ Komşular: un %6      │   │                      │
│ Yeni sipariş [Git]   │   │ ucuzladı             │   │ [      Devam      ]  │
│        ● ○ ○         │   │        ○ ● ○         │   │        ○ ○ ●         │
└──────────────────────┘   └──────────────────────┘   └──────────────────────┘
```

**Görsel kurallar (gorsel-kimlik ile uyumlu).**

- **Renk:** zemin `yuzey` (kâğıt), metin mürekkep; **tek birincil renk** çini `Devam` düğmesi; "Git" bağlantıları ikincil metin düğmesi; artı değerler `basari.ink`, eksi değerler **nötr mürekkep + "−" işareti** (U10: normal giderde kırmızı yok); `hata` tint yalnız gerçek hata/uyarıda (kritik stok, süre dolan karar); kiremit ikincil yalnız takvimdeki **kutlama/özel gün** işaretinde.
- **Tipografi:** Inter (gövde 14 px, başlık 600); **bülten başlıkları** için serif: isteğe bağlı ek serif (Source Serif 4, ≈33 KB, ayrı dosya; gorsel §5.1 "Ek serif A4+") yoksa sistem serif yığını. Sayılar `tabular-nums`. Büyük harf yok.
- **Çizgi gerekçesi:** satır ayırıcı çizgi **işlevseldir** (tarama yapısı); kâğıt dokusu, gölgeli sayfa kıvrımı, 3B sayfa çevirme **yok** (süs animasyonu yasağı, gorsel §5.6).
- **Koyu tema (Arduvaz)** eş değerdir; saat 19:00'dan sonra otomatik geçiş **yoktur** (sistem tercihi izlenir). "Akşam Defteri" adı yalnız bir isim, ayrı bir kimlik değil.
- **Boyut:** dokunma ≥44 px, telefonda yazı ≥14 px, en çok 9 kolon satırı; satır başına tek bilgi.

### 2.7 Hareket ve zamanlama: ilk 10–20 saniye

Geri dönen oyuncu **ilk 60 sn akışını** (gorsel §6.4) görmez; yerine aşağıdaki akış gelir. Süreler gorsel §5.6 tokenlarıdır.

| Süre | Ekranda | Hareket | Not |
|---|---|---|---|
| **0:00–0:02** | Kâğıt zemin + küre (yükleme çubuğu ≤300 ms ise yok, gorsel §6.2); `hosgeldin` gelince açılış kartı | Kâğıt örtü α 0 → 0,85 (200 ms); kart 16 px yukarıdan **320 ms** `ease-cikis` | Harita arkada yüklenmeye başlar; sayaç animasyonu **yok** |
| **0:02–0:05** | Başlık + **B1 net sonuç** satırı; satırlar 60 ms arayla belirir (≤6 satır, toplam ≤360 ms) | Değer anında yazılır; artış tint'i 600 ms (gorsel §5.6 #7) | `Devam` görünür ve **etkin** |
| **0:05–0:12** | B2 biten işler, B3 gelenler; sağ sayfada B4/B5/B6 | Hareket yok | Oyuncu okur; **ortanca çıkış ≈12 sn** hedefi |
| **0:12–0:20** | **B7 öneri** şeridi (ilk görünümde zaten vardır; vurgu yok) | — | Öneri tıklanırsa kamera hedefe uçar |
| **`Devam`** | Kart 200 ms `ease-giris` çıkar; örtü çekilir | Kamera **son yapının önüne** (yürüyüşte doğuş) 700 ms `easeTo`; harita hazır değilse küre ekranda kalır, üst kenarda 2 px ilerleme çizgisi | Harita L1 yüklenirken ekran zaten okunmuş olur: **yükleme süresi örtülür** |
| **Öneriye git** | Aynı çıkış; kamera öneri hedefine (yapı/panel) uçar; ilgili paneli açar | 700 ms | 1 tık |
| **Haritada ilk etkileşim (kaydırma/tık)** | Kart **şeride küçülür** (200 ms), Dikkat'te "Kaldığın yer" çipi kalır | — | DB-8: engelleyici değil |
| **Azaltılmış hareket** | Tüm hareket 0, yalnız 80 ms opaklık | — | Dİ-12 |

**Hafif dönüş (telefon, düşük bant).** Açılış kartı **harita yüklenmeden** çizilebilir (veri küçük, yalnız `hosgeldin` + özet + yazı tipi). "Bakıp çıkma" oturumu mümkündür: `Devam` yerine **Kapat** (uygulamadan çıkma) harita indirmeden de çalışır; `Devam` haritayı yükler (`harita.js` ≈293 KB gzip, gorsel §6.2). Sık giren telefon oyuncusunun veri maliyeti ve pil tüketimi düşer. PWA kabuğu önbellekte olduğundan özet ekranı çevrimdışı kabuktan açılır (özet verisi ağdan gelir).

### 2.8 Hata ve kenar durumlar

| Durum | Davranış |
|---|---|
| Özet hesabı ≥2 sn sürüyor (sunucu kapalı kalmışsa **yetişme** sürüyor olabilir, §5.1) | Kart "Özet hazırlanıyor" (yetişmede "Dünya yetişiyor") iskeletiyle açılır; `Devam` etkin; özet gelince **200 ms solarak** dolar; 5 sn'de gelmezse "Özet şimdi getirilemedi; Dikkat'ten görebilirsin." ve yeniden dene |
| Çapa yok/bozuk | Ekran açılmaz; yalnız Dikkat; sunucu yeni çapa yazar (hata günlüğü) |
| Saat dilimi | Metinde "Türkiye saati"; selam yerel saatle |
| Çok uzun yokluk, çok sayıda olay | Toplamlar + en büyük 3 değişim; kalan "Ayrıntı"da; **sıralı döküm** Gelen kutusunda (30 gün saklanır, cesitlilik §8.2) |
| Hesap silme/rıza geri alma | Saklanan özet kaydı **olgu referansıdır;** adlar render anında çözüldüğünden anonimleşir (§5.7) |
| Kirli çıkış (bağlantı koptu) | WebSocket kapanış işleyicisi çapayı yazar; yazılamazsa son kabul edilen komut zamanı yedek çapadır (§5.1) |

### 2.9 Metin rehberi ve şablon aileleri

**Ton.** Sıcak, kısa, yargısız (rehber Gİ-10): "Kolay gelsin", "Hayırlı olsun", "Bereket". "Sen" kipi; resmî ekranlarda (seçim, savaş ilanı) "siz". 2 cümleyi geçmez.

| Aile | Şablon örneği (değişkenler `{}`) | Varyant sayısı (öneri) |
|---|---|---|
| `donus.net.artı` | "Sen yokken {n} satış yapıldı: +₺{tutar}." | 6 |
| `donus.net.sakin` | "Dünya sakindi; satış olmadı, her şey yerinde." | 4 |
| `donus.gider` | "Giderler −₺{tutar} (vergi ve bakım)." | 3 |
| `donus.uretim` | "{tesis} çıktısı: {mal}, {miktar}." | 6 |
| `donus.bitti.insaat` | "{yapi} bitti; hayırlı olsun." | 6 |
| `donus.bekleyen.elektrik` | "{tesis} elektrik bekliyor." | 3 |
| `donus.gelen.siparis` | "Yeni esnaf siparişi: {mal}, {adet} adet, teslim {gun}." | 4 |
| `takvim.pazar` | "{gun} Salı Pazarı için başvuru {saat}'e kadar." | 3 |
| `takvim.hasat` | "{ay} ayında {urun} hasat penceresi açılıyor." | 4 |
| `komsu.pazar.fiyat` | "{mahalle} pazarında {mal} fiyatı %{yuzde} {yon}." | 4 |
| `oneri.elektrik` | "{tesis} için elektrik sağla. Çünkü {neden}." | 4 |
| `oneri.yok` | "Bugün yapacak bir şey yok. Bereket versin." | 3 |

Varyant seçimi **tohumludur:** `hash32(oyuncuId, olguSeq, şablonKodu) mod varyantSayısı`; aynı olgu aynı metni üretir, ekran yeniden açılınca değişmez. Hedef: 30 günde aynı (şablon, varyant) bir oyuncuda ≥2 kez görülme oranı ≤%10 (canlı H-C8); açılış ekranı sık görüldüğünden bu aile **havuzu bülten havuzundan ayrı** büyütülür. Havuz genişletme **çevrimdışı** AI yardımıyla yapılabilir, insan onayından geçer (canlı §6.5 hibrit).

**Yasaklı kalıp sözlüğü (lint testi).** Şablon deposunda şu kalıplar bulunamaz: "kaçırdın", "kaybettin", "geç kaldın", "son şans", "acele", "sadece … saat", "seni özledik", "neredesin", "hemen", "fırsatı kaçırma", "yapmazsan", "kaybedeceksin", büyük harfli sözcük (kısaltmalar ve ₺ hariç). Dönüş metni yalnız bilgi verir.

### 2.10 Düzenli oyuncu için günlük selam şeridi (oturum açılış ritüeli)

Günde 1–2 kez giren oyuncuya Gün Sayfası göstermek rahatsız edicidir. Animal Crossing'in Isabelle selamı gibi **küçük, kapatılabilir ve içeriği değişen** bir ritüel önerilir:

| Öğe | Davranış |
|---|---|
| **Selam şeridi** | Saat dilimine göre ilk giriş (K1 bandı; en çok günde 1 kez): "Günaydın. Bugün Salı: Pazar günü. İlçende 1 yeni haber." — tek satır, 6 sn sonra kendiliğinden söner; tıklayınca Gün Sayfası/Takvim açılır |
| **Pazar sabahı** | Haftalık Dünya Raporu manşeti (İl Gazetesi, canlı §6.2 adım 4) şeritte **yalnız Pazar ya da Pazartesi ilk girişte** bir kez önerilir ("Haftanın gazetesi çıktı"), K1–K2 bandında da |
| **Olay günü** | Takvimde o gün bir olay varsa şerit onu söyler ("Bugün Cumhuriyet Bayramı: meydan süslendi") |
| **Kapatma** | Ayarlarda tek anahtar; kapatan kişi yalnız Dikkat paneli görür |
| **Anlam** | Ritüel **zorunlu değil, ödülsüz ve seri saymaz;** o gün girmeyen hiçbir şey kaybetmez |

### 2.11 Üç somut dönüş senaryosu (kabul ölçütü)

Aşağıdaki üç akış, bu bölümün **kabul ölçütüdür:** gerçek tarih/saat, yokluk bandı, ekranda görünen satırların **tam metni** (§2.9 şablon ailelerinden), tek önerinin "çünkü" cümlesi, ilk 60 sn'deki tıklamalar, Dikkat çipinin sonraki hâli ve her satırın **veri kaynağı** verilir. Sayılar uydurmadır, kurallarla tutarlıdır: ilk görünümde ≤8 madde satırı ve **≤90 kelime** (başlık şeridi ve düğmeler sayılmaz; kelime sayısı başlık dahil verilmiştir), net sonuç = hazine farkı = **satış − gider**, öneri **yapılabilirlik filtresinden** geçmiştir. Üç senaryo da **golden fixture** olarak CI'a girer (§5.6 Test 3). Tarihler 2026 takvimine uyar (1 Ekim 2026 Perşembe).

**Kullanılan kayıt türleri (öneri adları).** Özet kaydı (`ozet_kaydi {oyuncu, t, tür, değerler}`; `t` olayın sim zamanı): `satis_toplam`, `gider_toplam`, `uretim_cikti`, `insaat_bitti`, `siparis_ilan`, `raf_bosaldi`, `asinma_esigi`. Olgu (yan kanal, canlı §6.1): `ilan_yayinlandi`, `fiyat_degisti`, `ilce_yeni_esnaf`, `bulten_yayinlandi`. Çapa: `sonGorulen`, `ozetOkunduT` (§5.1).

#### Senaryo (a): 14 saat sonra dönen Tarım oyuncusu, Gebze (Kocaeli), Ekim 2026; sunucu 2 saat bakımdaydı

| Alan | Değer |
|---|---|
| Çıkış / giriş | **Çarşamba 7 Ekim 2026 20:10** → **Perşembe 8 Ekim 2026 10:10** (14 saat) |
| Bant | **K2 (6–48 sa): Gün Sayfası** |
| Bakım | Perşembe 04:00–06:00 sunucu bakımda; 06:00'da açılışta çekirdek `calistirKadar` ile 2 saati işledi (§5.1). **Özette bakım satırı yok** (karar §5.1 madde 5) |
| Oyuncunun durumu | 3. gün; Çiftlik, Ahır, yeni biten Ticaret ofisi ("kendi tezgâhın", Alfa-0) |

**Ekranda (Gün Sayfası, ilk görünüm; 7 madde satırı, 75 kelime).**

```
Günaydın · Perşembe 8 Ekim 2026 · dün 20:10'dan beri 14 saat
 +₺1.480: satış +₺1.575, giderler −₺95 (vergi ve bakım)
 Çiftlikten 180 tahıl, Ahırdan 45 gıda ve 9 gübre çıktı.
 Ticaret ofisin bitti; hayırlı olsun.                              [Git]
 Yeni sipariş (mahalle kasası): gıda, 40 adet, teslim Cuma.       [Git]
 Takvimden: 28 Ekim Cumhuriyet Bayramı (20 gün).
 Gebze Bülteni, 8 Ekim: hasat bereketli geçti.
Bugün şuna bakabilirsin
 Ticaret ofisine gıda için satış emri ver. Çünkü ofisin hazır ama emir yuvası boş.   [Git]
                                                                  [Devam]
```

**Öneri ve filtre.** Kural **2** (yarım iş: bitmiş ama pasif tesis, §3.1) seçildi; kural 1 (karar süresi dolan) boş (Salı Pazarı başvurusu yalnız Pazar 07:00'de açılır). Yapılabilirlik: Ticaret ofisi hazır, gıda stoğu >0, emir bedelsiz (komisyon gerçekleşmede) → geçer. "Çünkü" cümlesi: *ofisin hazır ama emir yuvası boş.* (`oneri.ticaret_emri`)

**İlk 60 saniye (oyuncunun tıklamaları).**

| Süre | Tık | Ne olur |
|---|---|---|
| 0:00–0:02 | — | Kâğıt zemin + küre; `hosgeldin` gelince kart 320 ms girer; harita arkada yüklenir |
| 0:02–0:11 | — | Oyuncu okur (≈9 sn; ortanca hedefi içinde) |
| 0:11 | **1 · "Öneriye git"** (ya da öneri satırının `[Git]`'i) | Kart 200 ms kapanır; kamera Ticaret ofisine 700 ms uçar; ticaret emri paneli açılır |
| 0:20 | **2 · mal seçimi: gıda** | Miktar öntanımlı (stoğun %80'i) |
| 0:27 | **3 · "Emri ver"** | Komut (`ticaret_emri`); toast "Emir verildi." (oyuncunun kendi eyleminin sonucu; gorsel §5.6) |
| 0:30–0:60 | 4 · isteğe bağlı: sipariş satırı `[Git]` | Teslim paneli (siparişi karşılamak) |

**Dikkat çipi sonra.** Yarım iş kalmadı → **"Kaldığın yer" çipi kaybolur** (yoksa görünmez, §3.1); Dikkat'te yalnız sipariş maddesi durur ("Mahalle kasası siparişi: teslim Cuma [Git]").

**Veri kaynağı.**

| Satır | Kaynak |
|---|---|
| Başlık: "14 saat" | `sonGorulen.t` (çıkış 20:10) → şimdi |
| "+₺1.480 … +₺1.575 … −₺95" | `defter(şimdi) − sonGorulen` (hazine ve `ticaretDefteri` toplamları); kalemler `satis_toplam` (22 satış, bakım dahil kayıtlar `t` sıralı) ve `gider_toplam` özet kayıtları |
| "Çiftlikten … çıktı" | `uretimToplam` farkı (tesis başına) / `uretim_cikti` kayıtları |
| "Ticaret ofisin bitti" | `insaat_bitti` kaydı, `t` = Perşembe 02:40 (bakımdan **önce**; yetişmeden bağımsız) |
| "Yeni sipariş (mahalle kasası)" | Olgu `ilan_yayinlandi` (kamu siparişi v0, sabit fiyatlı), `t` = Çarşamba 22:00 |
| "Takvimden: 28 Ekim" | Takvim paketi (Cumhuriyet Bayramı, 28 Ekim 13:00; E8, A0) |
| "Gebze Bülteni, 8 Ekim" | Olgu `bulten_yayinlandi` (06:00 yayını bakım bitince 06:00'da çıktı; DB-5) |
| Öneri | Öneri motoru kural 2: `tesisler[tur=ticaret_ofisi]` ∧ `ticaretEmirleri` boş |
| Bakım | Hiçbir satır; 05:12'deki satış kaydı `t=05:12` ile özette toplanır (yazılma zamanı 06:00, `yazildiT`; §5.1 madde 2) |

#### Senaryo (b): 5 gün sonra dönen Pazar oyuncusu, Nilüfer (Bursa); dükkân rafı boşalmış; Salı Pazarı ve kış hazırlığı yaklaşıyor; komşu ilçede fiyat düşmüş

| Alan | Değer |
|---|---|
| Çıkış / giriş | **Salı 13 Ekim 2026 21:00** → **Pazar 18 Ekim 2026 21:00** (5 gün = 120 saat) |
| Bant | **K3 (2–7 gün): Hafta Sayfası** (gazete düzeni; Pazar Gazetesi manşeti, 09:00 yayını) |
| Oyuncunun durumu | Pazar açılışı; Alfa-0 `dukkan` (bakkal) ile ekmek ve süt satıyor, tedarik ithalat/siparişle |

**Ekranda (Hafta Sayfası, ilk görünüm; 7 madde satırı, 80 kelime).**

```
İyi akşamlar · Pazar 18 Ekim 2026 · 13 Ekim Salı 21:00'den beri 5 gün
 Haftanın gazetesi: Bursa'da ekmek fiyatları geriledi.
 +₺3.340: satış +₺3.610, giderler −₺270 (vergi ve bakım)
 Bakkal rafında ekmek ve süt Perşembe 14:20'den beri tükendi.      [Git]
 Mahalle kasası siparişi: ekmek, 60 adet, teslim Çarşamba.         [Git]
 Salı Pazarı için başvuru Pazartesi 07:00'ye kadar; kış hazırlığı 2 Kasım.
 Komşular: Osmangazi pazarında ekmek fiyatı %7 düştü.
Bugün şuna bakabilirsin
 Bakkalın için ekmek tedarik emri ver. Çünkü raf boş ve Salı Pazarı yaklaşıyor.   [Git]
                                                                  [Devam]
```

(Gün başına küçük döküm noktaları sağ sayfada çizilir, kelime sayısına girmez. Kış hazırlığı 2 Kasım örnek tarihtir; gerçek tarih takvim paketi sürümünde belirlenir, E2 ön duyuru 21 gün, canlı §5.3.)

**Öneri ve filtre (yapılabilirlik filtresi işliyor).** Kural **1** (karar süresi dolan) aday: *Salı Pazarı başvurusu* (Pazartesi 07:00'ye kadar açık; imza §2.2: başvuru 48–24 sa önce). **Elenir:** tezgâha konacak stok ve yoldaki sevkiyat yok; stoksuz başvuru boş tezgâh tutmak demektir (teminat kasaya geçer, kura ağırlığı −1; imza İ-2), yani yapılabilir ama **anlamsız** öneri. Kural **2** seçilir (üretimi/satışı durmuş yarım iş: raf boş); ithalat emri hazineyle karşılanır (hazine ≥ emir bedeli) → geçer. "Çünkü" cümlesi: *raf boş ve Salı Pazarı yaklaşıyor.* (`oneri.tedarik_emri`; yeni bir sayaç değil, durumdan: raf stoğu = 0 ∧ yaklaşan Pazar günü).

**İlk 60 saniye.**

| Süre | Tık | Ne olur |
|---|---|---|
| 0:00–0:03 | — | Kart girer; Pazar sabahı yayımlanan haftanın gazetesi manşeti en üstte |
| 0:03–0:14 | — | Okur (≈11 sn) |
| 0:14 | **1 · "Öneriye git"** | Kamera bakkala 700 ms; tedarik emri paneli açılır (ekmek) |
| 0:22 | **2 · miktar: 60** (öntanımlı siparişin adedi) | Maliyet ve tahmini varış gösterilir |
| 0:30 | **3 · "Emri ver"** | Toast "Emir verildi."; stok **tahmini Pazartesi 03:00**'te gelir (lojistik süresi örnek) |
| 0:34 | — | Kart şeride küçülmüştür (haritada etkileşim) |

**Dikkat çipi sonra.** Emir yoldadır; stok Pazartesi 03:00'e kadar gelecektir → **kural 1 artık yapılabilir:** çip: **"Kaldığın yer: Salı Pazarı başvurusu Pazartesi 07:00'ye kadar [Git]"** ("Çünkü ekmek stoğu yolda."). Başvurulunca çip kaybolur; Takvim'e Salı Pazarı satırı eklidir.

**Veri kaynağı.**

| Satır | Kaynak |
|---|---|
| "Haftanın gazetesi: …" | Olgu `bulten_yayinlandi` (İl Gazetesi/Haftalık Dünya Raporu, Pazar 09:00; canlı §6.2 adım 4) |
| "+₺3.340 … +₺3.610 … −₺270" | `defter(şimdi) − sonGorulen`; kalemler `satis_toplam`/`gider_toplam` |
| "Bakkal rafında … tükendi" | Özet kaydı `raf_bosaldi`, `t` = Perşembe 15 Ekim 14:20 (stok = 0 eşiği; yarım iş türü: depo/raf boş) |
| "Mahalle kasası siparişi" | Olgu `ilan_yayinlandi`, `t` = Cumartesi 17 Ekim |
| "Salı Pazarı … Pazartesi 07:00" | Takvim: İ-2 pazar günü (mahalle gün + 48–24 sa başvuru penceresi); "kış hazırlığı 2 Kasım" takvim paketi (E2) |
| "Komşular: Osmangazi …" | Olgu `fiyat_degisti` (ilçe pazarı fiyat panosu; **katman 3, adsız**, §2.4); kamusal ilçe panosunda da görünür |
| Öneri | Kural 1 elendi (stok yok), kural 2 seçildi: `raf stoğu = 0` ∧ hazine ≥ emir |

#### Senaryo (c): 50 gün sonra dönen oyuncu; çürüme bandı; kamu hakkı varsa onun durumu da gösterilir

| Alan | Değer |
|---|---|
| Çıkış / giriş | **Pazartesi 12 Ekim 2026 19:00** → **Salı 1 Aralık 2026 19:00** (50 gün) |
| Bant | **K6 (45–90 gün):** üretim 14. günden (26 Ekim) beri durmuş, vergi donmuş; **yapı çürümesi 45. günde (26 Kasım) başladı**, 5 gün ≈ %10 (günde %2, docs/11 §7.8) |
| Kamu hakkı (A1, varsa) | **Atölye üst hakkı:** 8 Ekim'de alındı, 112 gün → **28 Ocak 2027'ye kadar** (üst hakkı süreleri 28/56/112 gün, kamu-ve-kamu-arazileri hak türleri). 90. gün **10 Ocak 2027**: giriş yapmasaydı hak **ve üzerindeki yapı** açık artırmaya çıkardı; **bu giriş sayacı sıfırladı** |

**Ekranda ("Yurdun seni bekliyordu"; ana kart + iki destek kartı, 67 kelime).**

```
İyi akşamlar · Salı 1 Aralık 2026 · 12 Ekim Pazartesi'den beri 50 gün
Yurdun seni bekliyordu.
 +₺420: son stoğun satışı; vergi donmuştu. İlçende 3 yeni esnaf var.
 Yapıların %10 yıpranmış. Kamu hakkın (Atölye üst hakkı) 28 Ocak 2027'ye kadar sürüyor.
Bugün şuna bakabilirsin
 Yapılarını onar. Çünkü yıpranma %10 ve onarım ₺310.                [Git]
 Sonra: üretimi yeniden aç · kış stoğuna bak.
Bir şey yapman gerekmiyor; girmen sayacı sıfırladı.               [Devam]
```

**Kurallar ve filtre.** K6 bandında ana kart **Onarım**'dır (rehber §2.4: koşul `asinmaPpm` eşiğin altında); "Sonra" iki kısa satır rehber "≤1 ana + 2 isteğe bağlı" kuralıdır, **tek öneri** bozulmaz. Yapılabilirlik: hazine (₺2.870, örnek) ≥ onarım bedeli ₺310 → geçer; yetmeseydi ana kart "Üretimi yeniden aç" olurdu (bedelsiz). **Gösterilmeyenler:** kaybedilen üretim sayısı (rehber §2.4), "kaçırdığın talep", "ceza" dili (U5). Kamu hakkı satırı yalnız **durumu** söyler; bitiş tarihi Takvim'e eklenir, T−14 hatırlatması 14 Ocak 2027'dedir (kamu hak dönüş takvimi, §4.2).

**≥90 gün varyantı (K7).** Giriş 10 Ocak 2027'den sonra olsaydı satır şöyle olurdu: *"Kamu hakkın ve üzerindeki yapı açık artırmaya çıktı (kamu arsası açık artırılmaz); borç düşüldükten sonra alacağın var."* Ana kart **"Alacağını gör"** (docs/12 §10; sentez-1 G18; §2.2 K7).

**İlk 60 saniye.**

| Süre | Tık | Ne olur |
|---|---|---|
| 0:00–0:03 | — | Kart girer; kamera hâlâ küre; "Yurdun seni bekliyordu." tek başına başlıktır |
| 0:03–0:16 | — | Okur (≈13 sn) |
| 0:16 | **1 · "Öneriye git"** | Kamera **son yapının önüne** (yürüyüşte doğuş) 700 ms; onarım paneli açılır |
| 0:26 | **2 · "Tümünü onar (₺310)"** | Komut `genel_onarim`; toast "Hayırlı olsun, yapıların onarıldı." |
| 0:33 | **3 · Dikkat çipi "Üretimi yeniden aç"** | 2 pasif tesis için yöntem seçim paneli |
| 0:48 | **4 · yöntem seç + onay** | Üretim açılır; çip kaybolur |

**Dikkat çipi sonra.** Onarımdan hemen sonra: **"Üretimi yeniden aç: 2 tesis pasif [Git]"** (kural 2); üretim açılınca çip kaybolur ve yalnız Takvim'de "Atölye üst hakkı: 28 Ocak 2027" durur (T−14 hatırlatması). Hiçbir çip kalıcı baskı değildir; ≤24 sa.

**Veri kaynağı.**

| Satır | Kaynak |
|---|---|
| "50 gün", bant K6 | `sonGorulen.t` (12 Ekim 19:00) ve hareketsizlik sayacı (docs/11 §7.8) |
| "+₺420 … vergi donmuştu" | `defter(şimdi) − sonGorulen` (kalem `satis_toplam` = son stok; `gider_toplam` = 0, vergi uykuda donar) |
| "İlçende 3 yeni esnaf var" | Olgu `ilce_yeni_esnaf` (**adsız toplu**, katman 3; ilçe panosunda da görünür) |
| "Yapıların %10 yıpranmış" | `asinmaPpm` (çekirdek durumu) ve `asinma_esigi` özet kaydı (`t` = 26 Kasım) |
| "Kamu hakkın … 28 Ocak 2027" | Çekirdek kamu hak durumu (hak bitiş zamanı; **durumdan**, olgu değil); takvim paketine hak olayı eklenir (§4.2) |
| "kış hazırlığı geçti" (kullanılırsa) | Takvim paketi (E2 penceresi geçti); bülten olgusu |
| Öneri | K6 kuralı: `asinmaPpm ≥ eşik` ∧ hazine ≥ onarım bedeli |
| "Girmen sayacı sıfırladı" | Giriş = hareketsizlik sayacı sıfırlanır (docs/11 §7.8); sabit şablon |

**Üç senaryonun ortak kabul listesi.** (1) Hiçbir senaryoda "kaçırdın/kaybettin/geç kaldın" yok (§2.9 lint). (2) Net sonuç = hazine farkı birebir (Test 2). (3) Her öneri o an yapılabilir (Test 6); (a) ve (c)'de yapılabilirlik geçti, (b)'de bir aday **elendi**. (4) Yetişme ve bakım (a) özet kayıtlarını bozmaz (Test 8). (5) Başka oyuncuya dair her satır kamusal (b, c; Test 4). (6) İlk görünüm ≤8 madde satırı ve ≤90 kelime.

---

## 3. Kaldığın yer kartı ve Esnaf Defteri'nin gelişimi

### 3.1 Kaldığın yer kartı

rehber-gorevler §2.4 "kaldığın yer"i dönüşte **tek ana kart** olarak tanımladı. Burada kartın **kalıcı yüzü, içeriği ve yarım iş türleri** eklenir. Kart iki yerde yaşar: (a) açılış ekranının B7 öneri şeridi, (b) ekran kapandıktan sonra **Dikkat panelinde "Kaldığın yer" çipi** (en çok bir, kapatılabilir, ≤24 sa).

| Bölüm | İçerik | Kaynak | Not |
|---|---|---|---|
| **Bağlam** | "Son: Gebze'de Ahır'ı yerleştirdin, 14 saat önce." | Son kabul edilen komut + yer | Yargı yok; **yer** ve **eylem** |
| **Yarım işler (≤3)** | Aşağıdaki tabloya göre | Çekirdek durumu + profil | En çok 3, sıra önem puanı |
| **Öneri** | Tek öneri (§2.5) | Öneri motoru | `Git` |
| **Sıradaki sayfa** (isteğe bağlı) | Defter: "Fabrika sayfasında bir sonraki adım: ilk çelik" | Defter durumu | **Sayı/yüzde yok** (§3.2) |

**Yarım iş türleri.**

| Tür | Tespit | Kaynak | Alfa |
|---|---|---|---|
| Bitmiş ama pasif tesis | İnşaat tamam ∧ yöntemsiz/elektriksiz/eksik girdi (▲) | Çekirdek durumu | A0 |
| Bekleyen inşaat | İnşaat sırada/yürüyor; bitiş zamanı | Çekirdek | A0 |
| Depo dolu / kritik düşük stok | Stok ≥ kapasite %85 ya da eşik altı | Çekirdek | A0 |
| **Taslak (hayalet) yerleşim yarım** | Oyuncu hayaleti yerleştirdi ama onaylamadı | **Profil tablosu** (`taslak`, ≤3, 7 gün) | A0-hafif |
| Teslim vadesi yaklaşan sözleşme | Vade ≤48 sa ∧ stok eksik | Sözleşme durumu | A1 |
| Başvuru bekleyen | Pazar günü/ihale başvurusu açık, yapılmamış | Takvim + durum | A1 |
| Tatil modu bitişi | Tatil modunun son günü | Profil | A0 |
| **Kamu hakkı hareketsizlikte (K6/K7)** | Hak sahibi ∧ hareketsizlik ≥45 gün (çürüme) ya da ≥90 gün (hak + yapı açık artırmada; alacak oluştu) | Kamu hak durumu + hareketsizlik sayacı | A1 |

**Taslak saklama.** Taslak yerleşim para harcamaz (parasız önizleme, harman §3.2); bu yüzden **çekirdek dışı** profil tablosunda tutulur: `taslak {hesap, id, hucreRef, yapiTur, olcek, olusturT}`; ≤3 satır/hesap, 7 gün sonra silinir; ≈60 B/satır. Taslağı onaylamak normal komuttur (`yapi_yerlestir`); taslak **hiçbir sistem tarafından koşul olarak okunmaz** (rehber GK-3 ruhu).

**Çıp davranışı.** Çip yalnız bir yarım iş ya da öneri varsa görünür; yoksa görünmez ("bugün yapacak bir şey yok" meşrudur). Ekran kapanınca açılış ekranındaki ana kart çipe **küçülerek** kayar (200 ms), böylece kart "kaybolmaz".

### 3.2 Defter ilerlemesi: damga

**Sorun.** Sahip "Esnaf defteri… daha da geliştirilebilir" diyor. Ama rehber-gorevler Gİ-8 **tamamlama yüzdesi, rozet zinciri ve günlük seri yok** der ve haklıdır: yüzde/sayaç koleksiyon baskısı ve "uğramazsan eksik kalır" duygusu yaratır. Çözüm: ilerleme **gösterilir ama sayılmaz.**

| Öğe | Kural |
|---|---|
| **Damga** | Her kavram (rehber §3.1) tamamlanınca Defter sayfasına **bir damga** (çini mühür, kavrama özgü basit çizim; 24 px) vurulur; damga **tamamlanma anıyla** (tarih) birlikte saklanır (`tamamT`, GK-5 sticky) |
| **Yuva yok** | Kazanılmamış damga için **boş çerçeve çizilmez**; sayfa bomboş başlar, damgalar eklendikçe dolar. "7/13" ya da yüzde **hiçbir yerde yazmaz** |
| **Sıradaki adım** | Her sayfada **bir** "sıradaki adım" satırı (rehber öneri motoru; isteğe bağlı kart); sonu "kapanış" değildir |
| **Vitrin** | Esnaf Kartı'nda damgalar **varsayılan gizlidir;** oyuncu en çok **3 damgayı vitrine** seçebilir (opt-in, K-8 `gorunurKimlikRef` mantığı: damga kimlik taşımaz ama hesaba bağlıdır) |
| **Sıralama/kıyas yok** | Damga sayısı, kim önce aldı, nadirlik **gösterilmez**; unvan/başarım listesi yok |
| **Geriye dönük** | Önceden yapılan iş damgalanır (rehber Gİ-3); damga tarihi gerçek tamamlanma anıdır (komut günlüğünden) |
| **Kayıp yok** | Damga kimlik değil kayıttır: yıkım/satış damgayı silmez |

Veri: damga = kavram kimliği + tarih. Para/mal taşıyan kavramlar için aynı kayıt çekirdekteki `alinanOdul` ile eşlenir; **yalnız kozmetik/bilgi kavramlar için** profil tablosu yeterlidir (§3.5, DK-4).

### 3.3 Defterin yaşam döngüsü ve "Hatıralar" sayfası

Defter bir "görev listesi" olarak kalırsa 7. günden sonra anlamını yitirir. Önerilen yaşam döngüsü (Gİ-1…Gİ-12 değişmez):

| Dönem | Defter nedir | Yüz |
|---|---|---|
| **Gün 1–7** | Öğretici: açılış sayfası (Tarım/Sanayi/Pazar), İlk gün + Hafta bölümleri; tek ana + ≤2 isteğe bağlı kart | rehber §2.2 |
| **Gün 7–30** | **Ufuk:** yön sayfaları, Takvimden sayfası, ikinci perde (komşu ilçe, ihale, ortak proje); "önerilen gün" etiketi kalkar | rehber §2.2, §2.5 |
| **Gün 30+** | Kılavuz kendiliğinden **geri çekilir:** açık kart yoksa Defter yalnız **Bugün, Takvim ve Hatıralar** gösterir; "Kılavuzu kapat" anahtarı hesapta (rehber Gİ) | Yeni |
| **Her ay** | **Hatıralar sayfası:** aydan bir sayfa, **olgu defterinden şablonla yazılmış** kişisel günce | §3.3.1 |

**3.3.1 Hatıralar (kişisel günce).** Ayın "ilk"leri ve dönüm noktaları olgu defterinden türetilir ve şablonla yazılır:

> "Ekim 2026. Bu ay ilk hasadını yaptın, Salı Pazarı'nda ilk tezgâhını kurdun ve Nilüfer'in 3. ilçe seviyesine ulaşmasında imeceye katıldın. Kış hazırlığı 28 Ekim'e denk geldi."

- **Kaynak:** oyuncunun olguları (`ilk_*`, `unvan_degisti`, imece katkısı, ihale sonucu, ilçe seviyesi); olgu **oyuncuya özel** filtredir; ad içermez ("sen").
- **Gizlilik:** özeldir; paylaşım yok (A1+ "görüntü olarak kaydet" isteğe bağlı, ad anma rızasıyla). Üretilmiş **metin saklanmaz**, olgular saklanır (canlı §6.4); sayfa render anında yazılır.
- **Neden:** uzun vadede (20–25. gün sorunu, docs/11 §7.11) oyuncuya **ilerlemeyi hissettirir** ama sayıya/seriye bağlamaz; "benim mahallem" duygusuna eşlik eder (imza §1.4). Avantaj yok.
- **Maliyet:** aylık ≤12 cümle, oyuncu başına olgu ≈30 türden küçük kayıt; render bedelsiz; çevrimdışı havuz genişletme.
- **Aşama:** A1 (olgu defteri A0-3'te zaten gelir; Hatıralar şablonları A1-2).

### 3.4 Ödül ilkeleri v2

rehber-gorevler §3.1 ödül kuralı (**adım bedelinin ≤%25'i; bedelsiz/gelirsiz adımlar yalnız kozmetik/bilgi; kavram başına bir kez; tavan ₺8.000; para payı ≤%50**) ve GK-1/GK-2 **aynen korunur.** Aşağıdaki ilkeler yeni katmanı (avantajsız ödüller) düzenler.

| # | İlke | Gerekçe |
|---|---|---|
| Ö1 | **Tek seferlik + kavram başına:** her kavram hesapta bir kez ödüllenir; kavram kimliği donmuş sözlüktür, yalnız **ekleme** yapılır (rehber GK-4) | Çifte tahsil ve çiftlik önleme |
| Ö2 | **Avantajsız yeni katman:** yeni kavramlar yalnız **kozmetik (K)** ve **bilgi (B)** verir; hazine, stok, verim, talep, ihale puanı, sicil, oy, kilit etkilemez | K-5 (para korunumu); imza "tabela/unvan/kitabe çekimi etkilemez" |
| Ö3 | **Zaman sınırlı yok; giriş şartı yok.** Etkinlik/tarih kozmetiği (bayram süsü hariç dinî olmayan, tarım/dönem kozmetiği), o dönemde **etkin hesaba** (yapısı olan, uykuda olmayan) otomatik verilir; giriş yapmış olmak şart değildir; kaçıran kişi sonraki yıl aynı dönemde alır ya da **arşiv hakkıyla** (yılda 1, takvimden seçer) alır | U3 |
| Ö4 | **Sayı, yüzde, sıra, nadirlik gösterilmez;** damga/kozmetik yalnız sahibine ve (opt-in) vitrine görünür | U6; Gİ-8 |
| Ö5 | **Kozmetik para ile satılmaz, devredilmez, ticaret edilmez** (ekonomiye sızmaz) | K-5 |
| Ö6 | **Ödül tablosu iki kapıdır:** para/mal taşıyan kavramlar çekirdek `alinanOdul`+ödül tablosu (GK-1/2); **yalnız K/B taşıyan kavramlar** profil tablosu `damga` (çekirdek şeması değişmez) | Çekirdek yüzeyi büyütmemek |
| Ö7 | **Unvan türetilmiştir, atanmaz;** avantaj vermez; etiket çekirdek durumundan hesaplanır (imza: "Hizmet Muhtarı", "Fuar Birincisi"); el değiştiren unvan olgu olarak yayımlanır, rıza ile adlı | imza §2.5; canlı §6.4 |
| Ö8 | **Kitabe hesap başına tek satır** (imece), pay eşiği ve hesap yaşı şartı ile; çiftlik önleme (imza İ-5); anonim seçenek | imza İ-5, K-8 |

### 3.5 Yeni kavramlar ve ödüller (orta ve geç oyun)

Aşağıdaki kavramlar rehber-gorevler §3.1 tablosuna **eklenir** (tüm ödüller avantajsız). "Alan" çekirdek durumundan türetilen koşuldur (GK-6: kapalı yüklem kümesi).

| Kavram (kimlik) | Koşul (çekirdek alanı) | Ödül | Tür | Aşama | Not / risk |
|---|---|---|---|---|---|
| `ilk_pazar_tezgahi` | `pazar_kapanis` çözümünde oyuncu satışı > 0 (İ-2) | Tezgâh örtüsü deseni (3 desen) | K | A1 | Kura kazanma şansı verilmez |
| `ilk_ihale_teklif` (mevcut) | `ihale_teklif ≥ 1` | Defter damgası | K | A1 | rehber §3.1 |
| `ilk_ihale_kazan` | Kural kazananı seçti ∧ oyuncu | İhale **tutanağı nüshası** (çerçeveli kopya; ad rızasıyla) | K | A1 | KK-12: ad rızası |
| `ilk_imece_katki` | İmece katkı kaydı | **Kitabe satırı** (hesap başına tek; pay eşiği) | K | A1 | İ-5; K-8 |
| `ilk_ihracat` | İlk liman/ihracat satışı (`brutIhracat` ihracat kolu) | **Ürün Atlası** satırı | B | A0 | Bilgi, üretim izni değil (çeşitlilik §3) |
| `il_imza_uretim` | İl imza ürününden ilk üretim (İ-3) | Tabela alt satırı "{il} imza ürünü" | K | A1 | Coğrafi işaret **adı** gerçek kaydı değil, oyun içi tanım |
| `ilk_gurbetci_satis` | Gurbetçi havuzundan ≥1 satış (N8) | Hoş geldin tezgâh süsü (dinî/siyasi içerik yok) | K | A1 | N8 penceresi 15 Haz–31 Ağu |
| `ilk_kis` | Hesabın ilk Aralık–Şubat dönemini **etkin** yaşaması (en az bir aktif tesis) | "Kışı gördün" damgası + kış kenarı (tabela) | K | A0 | **Hazırlık şartı yok** (başarısızlık yargısı doğmasın) |
| `ilk_hasat_donemi` | İklim takviminde bir ürünün hasat penceresinde ilk hasat | Hasat damgası (ürün resmi) | K | A0 | İlk hasatla çakışmasın: `ilk_uretim` damgasından ayrı sembol |
| `ikinci_zincir` | İki farklı zincirde `zincirTamligi ≥ 1` | "Zincir" tabela nişanı | K | A0 | Portföy özeti A11 |
| `ilk_birlik` | Kooperatif/esnaf odası üyeliği (N1/N13) | Oda üye levhası | K | A1 | Güç/verim yok (imza N1) |
| `ilk_savunma_hazir` | Savunma duruşu ≠ normal bir kez (A1 askeri) | Defter damgası | K | A1 | Askeri kozmetik ödül avantaj sayılmaz (rehber §2.5) |
| `dort_iklim_donemi` | Hesabın dört iklim dönemini (kış, ilkbahar, yaz, sonbahar) yaşaması | Yıl şeridi çerçevesi (Takvim görünümü) | K | A1 | Kıdem sinyali; salt kozmetik |
| `ilk_yil` | Hesap yıl dönümü ∧ en az bir aktif tesis | Tabela çerçevesi "bir yıl" | K | A1 | Giriş ödülü değildir: **etkin hesap** yeter, giriş şartı yok |
| `ilk_tamir` | `genel_onarim` komutu ilk kez | Bilgi satırı: aşınma ve bakım | B | A0 | Öğretici bilgi |
| `ilk_donus` (mevcut) | ≥6 sa sonra dönüş | Defter damgası + bilgi | K+B | A0 | DB-7: ikinci dönüş damgası yok (DK-7) |

**Etkinlik kozmetiği (Ö3).** Örnek: *Cumhuriyet Bayramı meydan süsü* (28 Ekim 13:00–29 Ekim) etkin her hesaba, mahalle meydanındaki kamu süsü olarak **kendiliğinden** görünür; hesap sahibine ayrıca "tebrik kartı" damgası verilir. Dinî bayramlarda **kozmetik yoktur** (canlı §5.7, rehber §2.7: yalnız hatırlatma + talep); bu raporun hiçbir kavramı dinî bayrama bağlanmaz.

### 3.6 Kozmetik katalog ve saklama

| Öğe | Karar |
|---|---|
| **Katalog** | `veri/icerik/kozmetik.json` (sürümlü): `{kavramId, tur: tabela|ortu|damga|kitabe|cerceve, varyantlar[], hassas}`; ≈24 kayıt ile başlanır |
| **Hesap kaydı** | `damga {hesap, kavramId, tamamT, secilen, vitrin}`; ≤45 satır/hesap, ≈50 B/satır → 10 bin hesapta ≈ 22 MB üst sınır (tahmin) |
| **Para/mal ödüllü kavramlar** | Çekirdek `alinanOdul` (GK-2); damga satırı yine profile yazılır, tek doğruluk çekirdektir |
| **Görünüm** | İstemci katalogdan çizer; **yeni kozmetik eklemek veri güncellemesidir** (sürüm). Eski kayıtlar bozulmaz (donmuş kimlik) |
| **KVKK** | Damga kimlik taşımaz; vitrin opt-in; hesap silmede satırlar silinir |

---

## 4. Takvim

### 4.1 Rol

Takvim sahibin "çok iyi olmuş" dediği, **Stardew panosu gibi sessiz** bir yüzdür: baskı yapmaz, oyuncunun **planını** kolaylaştırır. Bu rapor üç şey ekler: (a) **takvim ekranı** (rehber-gorevler yalnız Takvimden *kart listesi* verdi), (b) **kişisel hatırlatmalar**, (c) **bildirimler**. Takvim bir **karar** sistemi değildir; oyuncuya tarihler ve hazırlık fırsatları gösterir, hiçbir olayda otomatik komut çalıştırmaz.

### 4.2 Olay türleri ve kaynakları

| Tür | Örnekler | Kaynak ve yetki | Ön duyuru | Bildirim sınıfı | Alfa |
|---|---|---|---|---|---|
| **Pazar günü** | "Salı Pazarı" (mahalle başına tohumlu gün), başvuru/kura sonucu/tezgâh stoğu saatleri | İ-2 (imza §2.2): mahalle gün + saat (07:00–17:00) | 48/24/6 sa (İ-2 akışı) | Hatırlatma | A0-hafif · A1 |
| **İklim/hasat** | Ürün ekim/hasat pencereleri, don, kuraklık, sel riski; kış hazırlığı | İklim takvimi (08 T2) + oyuncunun ekili ürünleri | İklim olayı ≥24 sa (canlı F1) | Hatırlatma | A0 |
| **Resmî gün ve okul** | Cumhuriyet Bayramı (28 Ekim 13:00 – 29 Ekim 2026), okul açılışı, ara tatiller, karne | Takvim paketi (canlı §5.2; resmî kaynaklar MEB/Diyanet) | Paket sürümüne göre | Yok (yalnız takvim) | A0 |
| **Bayram hatırlatması** | Ramazan Bayramı 9–11 Mart 2027; Kurban Bayramı 16–19 Mayıs 2027 (resmî ad; "Kurban" sözcüğü talep etiketinde yok) | Takvim paketi; **sahip onayı** (GS-3) | 14 gün | **Hatırlatma** (ödül/kozmetik yok) | A1 |
| **Seçim ve meclis** | Muhtarlık seçimi kapanışı, ilçe meclisi günü değişikliği, vaat karnesi | İ-1; çekirdek seçim durumu | ≥24 sa | Hatırlatma | A1 |
| **İhale ve kamu hakkı** | İhale ilanı kapanışı, teslim vadesi, **hak bitişi T−14/T−7**, T+3 boşaltma | Kamu: ihale/hak durumu (kamu §5, hak dönüş takvimi) | T−14 hatırlatma, T−7 yenileme penceresi | Hatırlatma + koruyucu | A1 |
| **Dünya olayı** | Don uyarısı, gurbetçi dönemi, düğün dönemi, fuar | Olay anlatıcısı (canlı §5.4) | ≥24 sa | Hatırlatma | A0 (kısmi) · A1 |
| **Kişisel** | Oyuncunun kendi hatırlatması | Profil (`hatirlatma`) | Kullanıcı seçer | Kullanıcının kanalı | A0-hafif |

**Anma günleri** (17 Ağustos, 6 Şubat, 10 Kasım) **takvimde madde olarak yoktur** (DB-11); o gün şenlik/süs açılmaz, sahip onayı bekler.

### 4.3 Ekran tasarımı

Takvim, Defter'in **Takvim** sekmesidir (rehber "Takvimden" listesinin genişlemiş hâli) ve üst çubuktaki tarih hapından da açılır. Üç görünüm:

| Görünüm | Ne | Varsayılan |
|---|---|---|
| **Ajanda** | Önümüzdeki 30 gün, günlere göre liste (bugün, yarın, bu hafta, sonra); her satırda tür ikonu + kısa ad + saat | **Telefon varsayılanı** |
| **Ay** | Pzt başlangıçlı ay ızgarası; gün hücresinde ≤3 işaret (şekil + renk, yalnız renk değil); gün seçilince sağ panelde o günün listesi | **Masaüstü varsayılanı** |
| **Yıl şeridi (iklim takvimi)** | 12 aylık yatay şerit; satırlar: iklim eğrisi (hasat oranı), **ekili ürünlerin ekim/hasat pencereleri** (oyuncunun ekimi varsa kendi satırı), resmî/bayram işaretleri, okul dönemleri | Sekme; ürün satırları oyuncuya özel |

**Masaüstü wireframe (Ay görünümü, Ekim 2026).**

```
┌───────────────────────────────────────────────────────────────────────────┐
│ ‹  Ekim 2026  ›     [ Ajanda | Ay | Yıl ]      Katman: ☑Pazar ☑İklim ☑Resmî ☑Kamu ☑Kişisel │
├───────────────────────────────────────────────┬───────────────────────────┤
│ Pzt   Sal   Çar   Per   Cum   Cmt   Paz       │ 6 Ekim Salı                │
│                  1     2     3     4          │ ─────────────────────────  │
│  5     6●    7     8     9    10    11         │ ● Salı Pazarı              │
│ 12    13●   14    15    16    17    18         │   Başvuru Pzt 07:00'ye kadar│
│ 19    20●   21    22    23    24    25         │   [Başvur]   [Hatırlat]    │
│ 26    27●   28▲   29▲   30    31               │ ─────────────────────────  │
│                                               │ ◆ Hasat: zeytin dönemi     │
│ ● pazar günü  ▲ resmî  ◆ iklim  ■ kamu        │ + Hatırlatma ekle          │
└───────────────────────────────────────────────┴───────────────────────────┘
```

**Mobil Ajanda.**

```
┌──────────────────────┐
│ Takvim    Ajanda ▾   │
│ Bugün · Cmt 10 Ekim  │
│  ◆ Hasat: zeytin     │
│ Yarın · Paz 11 Ekim  │
│  (olay yok)          │
│ Salı 13 Ekim         │
│  ● Salı Pazarı       │
│  Başvuru Pzt 07:00   │
│ 28 Ekim Çarşamba     │
│  ▲ Cumhuriyet Bayramı│
│  (13:00'te başlar)   │
│ [+ Hatırlatma]       │
└──────────────────────┘
```

**Etkileşim.** Satıra tık: ayrıntı + **eylem** ("Başvur", "Stoğa bak", "Hasat planına git"); eylem her zaman bağlı panele götürür, takvimden doğrudan komut çalıştırmaz (komut tek yerde, ilgili panelde). **Filtreler** katman bazlı; durum `localStorage` değil hesapta (profil) tutulur. **Tarih biçimi** Türkçe (gün adı + "10 Ekim 2026"; saat 24 saat). **İklim şeridi** mevcut `takvimDurumu`/hasat oranı verisini (istemci `veri/tarim.ts`) **gerçek tarihe** bağlar (DB-10).

**Kesinlik etiketi.** Resmî tarihler "kesin", Ramazan başlangıcı/MEB gelecek yıl tarihi "tahmini" etiketlidir (canlı §5.2: bayramdan geri hesap **doğrulanmadı**); paket güncellemesi ≥24 sa öncesine yapılır.

### 4.4 Gerçek tarih, iklim takvimi ve hassasiyet kuralları

- **Tek takvim:** gerçek tarih, Europe/Istanbul; "N. yıl" etiketi yok. `t = 0` TRT gece yarısı (canlı §2.2).
- **İklim takvimi** `gunCarpani = 1`; ay adı, hasat oranı, ürün pencereleri gerçek ayla eşleşir (çelişki yok: Haziran iklimi + Kasım okulu doğmaz).
- **Alfa-0 takvimi gerçeği:** Ekim 2026'dan başlayan oyuncu ilk 5 ayda **dinî bayram görmez** (ilk 9 Mart 2027); ilk aylarda yalnız hasat, kış hazırlığı, Cumhuriyet Bayramı ve okul ritmi görünür (rehber GB-4).
- **Hassasiyet:** deprem yok; dinî bayram yalnız **hatırlatma + talep eğrisi**, resmî ad, figür/dua/kutlama metni yok; "Kurban" sözcüğü yok; siyasi günler (15 Temmuz, 1 Mayıs) yalnız tatil ritmi, **mesaj yok**; anma günleri takvimde yok (DB-11); hepsi sahip onayı (canlı §5.7).
- **Dünya saati:** gurbetçi (Avrupa) oyuncular için saatler "Türkiye saati" ile yazılır ve yerel saat farkı gösterilir (canlı F8).

### 4.5 Kişisel hatırlatmalar

Oyuncu **kendine** hatırlatma kurar. Takvim sayfasındaki "+ Hatırlatma" ve satırlardaki "Hatırlat" düğmesi tetikler.

| Tür | Tetik | Not |
|---|---|---|
| **Tarihli** | Tarih/saat seçimi | Serbest not ≤80 karakter, **yalnız sahibine görünür**; ajana/LLM'e girmez; moderasyon gerekmez (paylaşılmaz) |
| **Olay öncesi** | Takvim olayına bağlı ("Salı Pazarı −24 sa", "ihale kapanışı −24 sa", "hak bitişi −7 gün") | Olay iptal/öteleme olursa hatırlatma da güncellenir |
| **Durum tabanlı** | "İnşaat bitince", "stok X altına inince", "depo %90 olunca", "sipariş vadesinden 6 sa önce" | Sunucu eşiği **günlük kuantumda ya da olay anında** değerlendirir; yeni sayaç yok (mevcut durum) |
| **Tekrar** | Haftalık (ör. her Pazar akşamı "haftayı gözden geçir") | ≤3 tekrarlı hatırlatma |

**Sınırlar:** ≤20 aktif hatırlatma/hesap; tekrar ≤3; en kısa aralık 1 sa; **ödül, puan, seri yok** (hatırlatmayı "yapmak" damga vermez). **Çıkış kanalları:** oyun içi (Dikkat paneli + Bugün; **varsayılan**), tarayıcı bildirimi, e-posta (§4.6). Oyuncu kanalı her hatırlatma için ayrı seçer; varsayılan oyun içidir.

**Veri:** `hatirlatma {hesap, id, tur, hedefRef, t, tekrar, kanal, not?, olusturT}` ≈ 80–150 B; tetikleme **dakikalık zamanlayıcı** (indeksli `t`) ile; yük ihmal edilebilir.

### 4.6 Bildirimler: rahatsız etmeyen tasarım

**İlkeler (hepsi ürün değişmezi).**

| # | İlke |
|---|---|
| Bİ-1 | **Varsayılan kapalı.** Hiçbir bildirim kanalı, oyuncu açıkça seçmeden gönderilmez |
| Bİ-2 | **İzin yalnız niyet anında istenir:** oyuncu hatırlatma kurarken ya da "Bana bildir" düğmesine basarken; **sayfa yüklenirken ya da ilk girişte asla** (web.dev: sinyalsiz istemler %12, etkileşim sonrası %30 kabul) |
| Bİ-3 | **Ön izin ekranı:** tarayıcı istemi çıkmadan önce oyun içi açıklama: "Hangi şeyler için bildirim istersin?" (kategori listesi, hepsi kapalı başlar) |
| Bİ-4 | **E-posta eşit alternatiftir** (web.dev önerisi): push reddedilirse e-posta önerilir; ikisi de reddedilirse oyun içi yeter |
| Bİ-5 | **Günde en çok 2 bildirim** (kanal başına değil toplam), **sessiz saat 22:00–08:00 TRT** (olay açılış penceresi 08–22 ile uyumlu, canlı §2.5 F1); sunucu tarafında zorunlu kota; aynı kategoriden bir günde bir |
| Bİ-6 | **Toplu (digest) tercih:** isteyen için günde 1 özet (Gün Sayfası içeriğinin yüzü), tek e-posta |
| Bİ-7 | **Pazarlama yok.** Bildirim yalnız oyuncunun kendi kurduğu hatırlatma ya da kendi oyunundaki bilgilendirme/koruyucu mesajdır. **Seri, "seni özledik", suçluluk, "son şans" dili yok** (§2.9 lint) |
| Bİ-8 | **Kilit ekranı gizliliği:** bildirim gövdesi **minimal** ("Bölge Stratejisi: 1 hatırlatman var"); ayrıntı gösterme isteğe bağlı (ayar) |
| Bİ-9 | **Tek tıkla kapatma:** her e-postada tek tıkla abonelikten çıkma; Ayarlar'da kategori başına anahtar; push izni tarayıcıdan geri alınırsa bu hesapta kapanmış sayılır |
| Bİ-10 | **Oran sınırlarına saygı:** Chrome Push API oran sınırı ve izin otomatik geri alma (düşük etkileşim + yüksek hacim) için hacmimiz zaten çok küçüktür; tıklama/etkileşim oranı izlenir (Dö7) |

**Kategoriler.**

| Kategori | Ne | Varsayılan | Sınıf |
|---|---|---|---|
| **Hatırlatmalarım** | Oyuncunun kurduğu hatırlatmalar | Kapalı; kurunca o hatırlatmanın kanalı açılır | Hizmet (kullanıcı talebi) |
| **Takvim** | Pazar günü başvurusu, ihale kapanışı, hak bitişi T−14/T−7 | Kapalı | Hizmet |
| **Acil** (Alfa-1 askeri) | Savaş ilanı/baskın ön duyurusu (≥12–24 sa önceden yazılı) | Kapalı | Hizmet |
| **Hesap koruma** | Hareketsizlik merdiveninin eşikleri (14 gün uyku, 45 gün çürüme, 90 gün açık artırma öncesi T−7/T−2; **kamu hakkı sahibiyse mesaj hak ve üzerindeki yapının açık artırmaya çıkacağını söyler**); **tek tek, en çok 3 mesaj/dönem** | **Açık (yalnız e-posta ve oyun içi), kapatılabilir** | Hizmet/koruyucu; **hukuki görüş gerekir** |
| **Haftalık özet** | Pazar Gazetesi digest | Kapalı | Hizmet |

**Hesap koruma sınıfı** ayrı düşünülür: parsel kaybı riski gerçek bir mülkiyet sonucudur; oyuncuya **önceden bilgi verilmesi adalet gereğidir** (docs/11 §7.8: "uyarılar önceden yazılır"). Bu mesajlar pazarlama değil hizmet bilgilendirmesi olarak tasarlanır (içerikte promosyon yok); yine de varsayılan açık olması **sahip/hukuk kararıdır** (DS-4, DK-9).

**Hukuki çerçeve (öneri; hukuki görüş gerekir, doğrulanmadı).**

- **6563 sayılı Kanun:** ticari elektronik ileti (pazarlama, promosyon, tanıtım vb.) **önceden onay (opt-in) ve İYS kaydı** ister; hizmet/işlem bilgilendirmeleri (hesap, güvenlik, sözleşme) ticari ileti sayılmaz **ama içeriğe tek bir promosyon cümlesi girerse ticari sayılır** ([6563](https://mevzuat.gov.tr/MevzuatMetin/1.5.6563.pdf) · [İYS](https://iys.org.tr/iys/kanun) · [özet](https://www.cenuta.com/blog/6563-sayili-kanun-ve-iys-nedir-ticari-elektronik-ileti-yukumlulukleri-ve-ceza-rehberi-2026/), arama özeti). Bu yüzden **bildirimler ve e-postalar hiçbir promosyon içeriği taşımaz** (Bİ-7).
- **KVKK:** e-posta adresi hesap için alınır; **bildirim amacıyla kullanma** ayrı bir aydınlatma ve açık rıza (tercih anahtarı) ile belgelenir; push abonelik uç noktası kişisel veri sayılabilir; hesap silmede abonelikler silinir (K-8 ruhu).
- **E-posta toplu gönderici kuralları** (tek tıkla abonelikten çıkma vb.) ayrı bir teknik inceleme konusudur (**doğrulanmadı**).

**Teknik.**

| Kanal | Mekanizma | Not |
|---|---|---|
| **Oyun içi** | Dikkat paneli + Bugün + Gelen kutusu (30 gün) | Varsayılan; kota yok (sessiz) |
| **Tarayıcı bildirimi (Web Push)** | Service worker + Push API + Notifications API; VAPID; sunucu `web-push` ile gönderir | iOS/iPadOS 16.4+: **yalnız Ana Ekrana eklenmiş** PWA'da ve **kullanıcı dokunuşuyla** izin; `manifest` `display: standalone` ([WebKit](https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/)); Chrome oran sınırı ve izin geri alma ([Chrome](https://developer.chrome.com/blog/web-push-rate-limits), [Chrome](https://blog.google/chromium/automatic-notification-permission/)) |
| **E-posta** | SES (≈$0,10/1.000; paylasilan-dunya-mimarisi) | En çok günde 2; digest; tek tık çıkış |
| **Takvim aboneliği (.ics)** | Salt okunur, tokenli, iptal edilebilir URL; `VEVENT` (RFC 5545) | Oyuncunun kendi hatırlatmaları + kamusal olaylar (pazar günü, ihale kapanışı, resmî gün); **ad ve kişisel veri yok**; A1+ |

**Hacim ve maliyet (tahmin).** 10 bin oyuncu, %30 bildirim açmış, ortalama 1/gün: 3 bin gönderim/gün ≈ 90 bin/ay; e-posta payı %50 ise ≈ 45 bin × $0,0001 ≈ **$4,5/ay**; üst sınır (2/gün, 3 bin kişi): 180 bin/ay ≈ **$18/ay**. Push sunucu maliyeti ihmal edilebilir.

### 4.7 Takvim ve Defter ilişkisi

Takvim sayfası Defter "Takvimden" sayfasının (rehber §2.7) **ekranıdır:** olay kartı ve hazırlık koşulu aynıdır; ödül yoktur. Takvimdeki madde bir **Defter kartına** dönüşmez; Defter yalnız ön duyurusu başlamış en yakın olayı isteğe bağlı kart olarak gösterir (rehber §2.7 "ilk hafta"). Takvimden yaklaşan olay **öneri motorunun kural 4'ünü** besler (§2.5).

---

## 5. Veri, maliyet ve determinizm

### 5.1 Veri akışı

```
 [Çekirdek (deterministik)]                [Sunucu yan kanalı]            [İstemci]
  Dunya durumu, komut günlüğü   ──okur──▶  Olgu defteri (Postgres)
  ticaretDefteri {toplam,oran,t0}          Oyuncu özet kayıtları (≤200)
                                           Profil: sonGorulen, ozetOkunduT,
                                                   damga, taslak, hatirlatma
                                           Takvim paketi (sürümlü)
                                           Bülten JSON (CDN, 06:00)
                       │
                       ▼   oturum açılışında (hosgeldin)
        donusOzeti(simdi, anlik, çapa, olgular, takvim, profil)   [saf fonksiyon, sunucu]
                       │
                       ▼
        DonusOzeti {bant, maddeler[], oneri, takvim[], bulten[]}  (≤6 KB)
                       │
                       ▼   istemci şablonu render eder (i18n anahtarı + değerler + tohum)
        Açılış ekranı · Dikkat çipi · Gelen kutusu · Defter/Bugün
```

**İki çapa (DB-6).**

| Çapa | Ne | Ne zaman yazılır | Neden |
|---|---|---|---|
| `sonGorulen {t, hazine, defterToplamlari, stokOzet}` | **Çıkış anı** anlık görüntüsü (hazine, `ticaretDefteri` toplamları, stok özeti; oyuncu başına birkaç tamsayı) | WebSocket kapanışında (normal/koparma); yedek: son kabul edilen komut zamanı | Net sonuç = `şimdi − sonGorulen` (O(1); canlı §6.3) |
| `ozetOkunduT` | Özetin **gösterildiği** an | Açılış ekranı gösterilince (istemci onayı) ya da `Devam`'da | Ekran/çökme/yenileme sonrası özet **kaybolmasın**; K1 bandı doğru çalışsın |

Özet aralığı `[ozetOkunduT, şimdi]`'dir; `sonGorulen` yalnız **kıyas değerleri** içindir. Yenileme (F5) ile 2 dakika içinde dönen oyuncu için aralık kısa kalır ve K0/K1 olur.

**Kirli çıkış yedeği.** Sunucu çöküşünde kapanış işleyicisi çalışmaz; çapa yazılamamışsa yedek: son kabul edilen komutun zamanı (komut günlüğü) ve o ana en yakın anlık görüntüden tekrar oynatma ile `sonGorulen` **yeniden türetilir**. Bu bir uç durumdur; ölçüt Dö9 çapa yeniden türetme oranını izler.

**Sunucu kapalıyken geçen süre (dünya akar).** Sahip ilkesi: dünya kapalıyken de akar, açılışta kaçan süre işlenerek yetişilir (docs/12 §7; canlı §2.1: `calistirKadar(şimdi)`, tur başına en çok +6 sa). "Sen yokken" verisi bu süreyi **kapsar**; ayrı bir "kesinti" mekanizması yoktur. Kurallar:

1. **Kancalar çekirdek olaylarından türetilir** (olgu yan kanalıyla aynı kaynak, canlı §6.1) ve **yetişme sırasında da çalışır:** çekirdek `calistirKadar(t)` ile ilerlerken (canlı çalışma ya da açılış yetişmesi fark etmeksizin) aynı olayları aynı sırayla üretir; kanca saf ve deterministiktir. Sunucu açılınca kaçan süre önce işlenir, özet **bu işlemden** üretilir; yani 8 saat kapalı kalan sunucunun ardından giren oyuncu o 8 saatteki satış, biten inşaat ve olay kayıtlarını görür.
2. **Kaydın zamanı olayın sim zamanıdır (`t`), yazılma zamanı değil.** Özet aralığı süzmesi `t`'ye göre yapılır; yazılma zamanı (`yazildiT`) yalnız denetim içindir. Yetişmede toplu yazılan kayıtlar bu yüzden gerçek sırasını ve gününü korur.
3. **İdempotent yazım:** kayıt anahtarı `(oyuncu, seq, t, tür, sıra)` (olgu defteriyle aynı kalıp); kurtarma/yeniden oynatma çift kayıt üretmez (kill -9 sonrası günlük oynatması dahil; sunucu-tasarimi §5).
4. **Giriş sırası:** `hosgeldin` ve `donusOzeti`, çekirdek `calistirKadar(şimdi)` ile **yerleştirilmiş** durumdan üretilir (özet ve görüntü önce yerleştirilir, sunucu-tasarimi §5). Yetişme tamamlanmadan özet üretilmez; yetişme uzunsa istemci "Dünya yetişiyor" iskeletini gösterir (§2.8).
5. **Bakım kesintisi oyuncuya gösterilmez.** Karar: özette "sunucu kapalıydı" satırı yoktur; dünya akmıştır ve oyuncu açısından kesinti yalnız bir yokluk süresidir (yokluk bandı bunu kapsar). Planlı bakım duyurusu **ayrı kanaldadır** (oyun dışı durum sayfası/duyuru), özetin parçası değildir. Bakım sırasında açılacak olaylar canlı §2.2 ötelenme kuralıyla ertelenir; ertelenen olay **olgu olarak** bültende ya da Takvimde görünebilir, kesinti olarak değil.
6. **Kirli çıkışla ilişki:** sunucu çökmesi iki ayrı şeyi bozmaz ve bir şeyi etkiler. (a) Yetişme sırasında üretilen **özet kayıtları çapadan bağımsızdır;** çapa yazılamasa da kayıtlar yeniden oynatmayla yeniden oluşur. (b) `sonGorulen` yazılamadıysa yedek çapa (son kabul edilen komut zamanı) **çıkış anından daha eski** olabilir; bu durumda özet aralığı gerçekten daha geniş olur: hata **aşırı kapsama** yönündedir (fazla bilgi, kayıp yok); net sonuç, yeniden türetilen `sonGorulen` ile hesaplanır. (c) `ozetOkunduT` özetin görülmeden kaybolmasını engelleyen çapadır ve kapalı kalma süresinden etkilenmez.

### 5.2 `DonusOzeti` şeması (öneri)

```ts
interface DonusOzeti {
  surum: 1;
  bant: "K1" | "K2" | "K3" | "K4" | "K5" | "K6" | "K7";
  araliks: { baslangicT: number; bitisT: number };    // epoch ms, TRT hizalı
  net: {
    hazineFarki: number;                               // tamsayı kuruş değil, mevcut para birimi
    kalemler: { satis: number; gider: number; diger: number };
    uretim: { mal: string; miktar: number }[];         // ≤3
    stokUyari?: { mal: string; durum: "dolu" | "dusuk" }[];
  };
  maddeler: Madde[];                                   // blok B2..B6, önem sıralı
  oneri: Oneri | null;                                 // tek öneri
  takvim: TakvimOlayiOzet[];                           // ≤2
  bulten: { yayinT: number; baslikRefs: number[] };    // olgu referansları, metin değil
}
interface Madde {
  blok: "B2" | "B3" | "B4" | "B5" | "B6";
  sablon: string;                                      // "donus.bitti.insaat"
  tohum: number;                                       // hash32(oyuncuId, olguSeq, sablon)
  degerler: (string | number)[];
  git?: { bolge?: number; panel?: string };
  onem: number;                                        // 0..PPM
  kimlikRef?: string;                                  // gorunurKimlikRef; ad render anında
}
interface Oneri {
  kural: 1 | 2 | 3 | 4 | 5 | 6;                        // §2.5; günlüğe yazılır
  sablon: string; degerler: (string | number)[];
  neden: { sablon: string; degerler: (string | number)[] };
  git: { bolge?: number; panel?: string; komutOnerisi?: string };  // komutu çalıştırmaz
}
```

**Not:** `degerler` olgunun **değerleridir;** metin yok (§5.7). `kimlikRef` çözümü sunucuda/istemcide render anında ad anma rızasına göre yapılır.

### 5.3 Saklama ve boyut (tahmin, ölçülmedi)

| Veri | Yer | Boyut/oyuncu | 10 bin oyuncu | Saklama süresi |
|---|---|---|---|---|
| `sonGorulen` + `ozetOkunduT` | Profil tablosu | ≈ 100–200 B | ≈ 2 MB | Hesap ömrü (üzerine yazılır) |
| Özet kayıtları (olay → sahip) | Postgres tablosu (oyuncu başına halka ≤200) | ≈ 100 B × ≤200 = ≤20 KB; tipik 20–60 kayıt/gün (cesitlilik §8.2) → **2–6 KB** | **tipik ≈ 20–60 MB; üst sınır ≈ 200 MB** | 30 gün (TTL) |
| Son özet (yeniden aç) | Profil `donus_ozeti` | ≤6 KB (sıkıştırmasız) | ≈ 60 MB üst sınır | Son 1 özet, 24 sa |
| `taslak` | Profil | ≤3 × 60 B | ≈ 2 MB | 7 gün |
| `hatirlatma` | Profil | ≤20 × 150 B ≈ 3 KB üst | ≈ 30 MB üst sınır (tipik <5 MB) | Tetikten sonra silinir |
| `damga` | Profil | ≤45 × 50 B ≈ 2 KB | ≈ 22 MB üst sınır | Hesap ömrü |
| `bildirim_abone` | Profil | ≈ 400 B (uç nokta + anahtarlar) | Açanlar için <2 MB | Geri alınca silinir |
| Takvim paketi | Sürümlü veri | ≈ 60–120 olay × ≈120 B ≈ **10 KB** (gz ≈3 KB) | Tek kopya | Yıllık |
| Bülten JSON | CDN | ≈ 5–10 KB/ilçe/gün | Alfa-0 45 ilçe ≈ 0,4 MB/gün | 30 gün |

**Toplam üst sınır ≈ 260 MB (10 bin oyuncu), tipik ≈ 40 MB;** tek bir Postgres tablosu boyutunda (tahmin). Özet kayıtlarının günlük hacmi 1k oyuncu için ≈6 MB/gün (cesitlilik §8.2 tahmini ile uyumlu).

### 5.4 Hesaplama maliyeti ve gecikme

| İş | Yöntem | Maliyet |
|---|---|---|
| Net sonuç | `defter(şimdi) − sonGorulen` | O(1) |
| Özet kayıtları toplama | Oyuncunun ≤200 kaydı, tür başına topla | O(kayıt) ≈ µs–ms |
| Bülten bloğu | Önceden üretilmiş statik JSON | CDN okuma |
| Takvim | Paket + 2–3 durum sorgusu (pazar günü, ihale, hak) | ≈ 3 sorgu |
| Öneri | Saf kural listesi (çekirdek durumu okur) | O(yapı sayısı) |
| **Toplam** | ≤5 depo okuması | **Hedef p95 ≤150 ms (ölçülmedi)** |

Çakışma: 08:00 civarı eşzamanlı girişler. 10 bin oyuncunun aynı dakikada girmesi **en kötü** durumdur (≈10 bin × ~5 ms CPU ≈ 50 sn toplam CPU, çok çekirdekte saniyeler; tahmin); bülten ve takvim paketi **önbellekten** okunduğu için asıl maliyet oyuncu başına küçük bir sorgudur. Özet hesabı **idempotenttir** ve gerekirse ikinci kez çağrılabilir.

### 5.5 Şablon üretimi, LLM sınırı ve maliyet

**Karar: açılış ekranı için çalışma zamanı LLM önerilmez.** Gerekçe (canlı §6.5 tablosunun bu ekrana uygulanışı):

| Ölçüt | Şablon + olgu (öneri) | Çalışma zamanı LLM "kişisel özet cümlesi" |
|---|---|---|
| Gecikme | Anlık | Girişte **1–3 sn** beklenir; açılış ekranı 10–20 sn hedefiyle çelişir, batch kullanılamaz (anlık) |
| Determinizm | Aynı olgu aynı metin; yeniden açınca aynı | Aynı özet iki farklı cümle; saklamak zorunlu → KVKK silme zor |
| KVKK | Olgu saklanır, metin render anında; rıza geri alınca anonimleşir | Üretilmiş metin ad içerebilir |
| Enjeksiyon | Oyuncu metni (tabela) değer olarak girer | Tabela adı istemde → dolaylı enjeksiyon yüzeyi |
| Hassas içerik | Şablon bir kez incelenir | Her çıktı incelenmeli |
| **Maliyet (tahmin)** | **≈ $0** | ≈ $0,003–0,008/çağrı (Haiku 4.5, yapay-zeka K7 satırı ve liste fiyatı) × (DAU × 30): **3 bin DAU ≈ $270–$700/ay; 10 bin DAU ≈ $900–$2.300/ay** |

**Maliyet tek başına bağlayıcı değildir;** bağlayıcı olan gecikme, determinizm, KVKK ve enjeksiyondur. LLM **yalnız çevrimdışı**: şablon havuzu genişletme (insan onaylı), Hatıralar şablon çeşitliliği, bülten havuzu. **Sonra:** yalnız oyuncu-izinli, oyuncu metni içermeyen, asenkron ve isteğe bağlı "kişisel özet cümlesi" düşünülebilir (canlı §6.5, yapay-zeka §2.5); sahip onayı ve §8 çıkış ölçütleri şart.

### 5.6 Determinizm ve testler

- **Sunum katmanıdır:** `donusOzeti` çekirdek durumunu **yalnız okur**, `durumOzeti`'ne girmez; çapalar ve profil tabloları çekirdek dışıdır (rehber GK-2 B yolu). **Tek istisna:** para/mal taşıyan ödül çekirdekte (`sistem_odul`), bu raporun özet/takvim/bildirim/kozmetik parçalarında **yoktur.**
- `donusOzeti`, `Math.random` ve `Date.now` kullanmaz; `simdi` parametredir; varyant **tohumludur.**
- **Test 1 (H-C6 uyumlu):** özet/takvim/bildirim katmanı kapatıldığında 100 koşuda `durumOzeti` aynıdır (`sunum-kapali.test`).
- **Test 2 (mutabakat):** özet net sonuç toplamı = hazine farkı birebir (bot koşusunda, 1/6/24/168 sa yokluk).
- **Test 3 (determinizm):** aynı (çapa, olgular) ⇒ aynı `DonusOzeti` (golden); yeniden açınca aynı metin. **§2.11'deki üç senaryo golden fixture'dır.**
- **Test 4 (kamusal sınır):** B6 üreticisi yalnız `kamusal` etiketli alanlara erişir (§2.4).
- **Test 5 (dil):** şablon deposunda yasaklı kalıp yok (§2.9); büyük harfli sözcük yok.
- **Test 6 (yapılabilirlik):** öneri, oyuncunun o andaki durumunda **yapılabilir** (hazine/stok/hak); bot 1.000 koşuda yapılamaz öneri üretmemeli.
- **Test 7 (öneri döngüsü):** aynı öneri art arda 3 kez gösterilip tıklanmadıysa sıradaki kural seçilir.
- **Test 8 (yetişme, dünya kapalıyken akar):** sunucu N saat (1/8/48) kapatılıp açıldığında, oyuncunun özeti kesintisiz çalışan sunucudakiyle **aynıdır** (kayıtlar `t` sıralı, aynı toplamlar); kill -9 sonrası kurtarmada çift kayıt yoktur.

### 5.7 KVKK ve olgu/metin ayrımı

- **Saklanan olgudur, metin değil** (canlı §6.4): özet kaydı `{t, tür, ilçe, değerler, aktorRef}`; ad **render anında** ad anma rızasına göre çözülür; rıza geri alınınca ya da hesap silinince bütün özetler anında anonimleşir.
- **Son özet** (24 sa, ≤6 KB) `kimlikRef` içerir, ad içermez.
- **Başkası hakkında bilgi** yalnız §2.4'ün üç katmanıyla; çevrimiçi/çevrimdışı bilgisi hiçbir kayıtta yoktur.
- **Telemetri:** özet metrikleri (ekran açıldı/kapandı, süre, öneri tıklandı) **toplu sayaçlar** ve komut günlüğünden türer; ek kişisel veri yok (rehber R-Ü16 ile aynı çizgi); telemetri anahtarı ayrı.
- **Rıza yönetimi:** bildirim ve e-posta rıza kayıtları hesap düzeyinde, sürümlü (aydınlatma metni sürümü).
- **Hukuki görüş** (K34): ad anma, e-posta/push amaç sınırlaması, hesap koruma e-postası **doğrulanmadı**, açık alfa öncesi alınmalı.

---

## 6. Ölçütler

Hepsi komut günlüğünden, istemci olay sayaçlarından (toplu) ve sunucu profil tablosundan hesaplanır; ek kişisel veri yok. Eşikler **hipotezdir** ("eşik yok, hipotez", docs/11 A1-7). Rehber-gorevler Gö1–Gö10 ve baslangic Y4 **tekrar edilmez;** aşağıdakiler dönüş ekranına özgü kırılımlar ekler.

| # | Ölçüt | Tanım | Hedef (hipotez) | Bot/İnsan | Not |
|---|---|---|---|---|---|
| **Dö1** | **D1 / D7 (dönüş kırılımı)** | Y4 tanımıyla (katılımın 2. ve 8. günü ≥1 oturum), **ilk özet bandı** (K1/K2) ve ekranı kısa/uzun okuyanlara göre | D1 ≥%35, D7 ≥%15 (Y4); özet ekranı **kısa okuyanlarda** D7'nin düşmemesi (fark ≥ −3 puan) | İnsan | **Seçilim yanlılığı:** nedensel değildir; sürüm A/B (kart sırası/metin), gizli kontrol grubu yok (rehber GS-2) |
| **Dö2** | **Açılış ekranında geçen süre** | `donus_ekrani_acildi` → `kapandi {neden}` süresi; ortanca ve 90. yüzdelik; bant başına | Ortanca ≤12 sn, p90 ≤30 sn (K2); K5–K7 ≤25 sn; **>45 sn** ise aşırı yoğunluk uyarısı | İnsan | Okuma süresi >40 sn ve `Devam` yoksa içerik fazla |
| **Dö3** | **Atlama oranı** | `Devam` ≤3 sn içinde ya da ekran hiç okunmadan kapanan oran (satır bazlı kırılım yok; blok bazlı) | ≤%50 (yüksekse içerik gereksiz ya da yanlış yerde; **atlama kötü sayılmaz**) | İnsan | Gö4 ile aynı ruh |
| **Dö4** | **Öneri tıklama oranı ve tamamlama** | `oneri.gosterildi → tikla`; ardından **2 dk içinde** önerinin hedef eylemi tamamlandı mı; **kural 1–6 kırılımı** | CTR ≥%30; 2 dk tamamlama ≥%50 (Gö8 ile uyumlu); kural 6 (Fırsat Kartı) kırılımı ayrı | İnsan | Aşırı yüksek CTR "baskıcı öneri"; çok düşük "yanlış öneri" göstergesi |
| **Dö5** | **Öneri kalitesi (yapılamaz öneri)** | Tıklanıp **reddedilen** (yetersiz hazine/hak) öneri oranı | ≤%2 (yapılabilirlik filtresi) | Bot + insan | Test 6 CI'da |
| **Dö6** | **Takvim kullanımı** | Takvim sekmesi açan oyuncu oranı (7 gün), hatırlatma kuran oranı, olaydan önce hazırlık eylemi oranı | Bilgi (hedef yok; ödül yok); hazırlık oranı rehber Gö10 ile birlikte okunur | İnsan | Takvim planlamayı kolaylaştırıyor mu |
| **Dö7** | **Bildirim sağlığı (guardrail)** | İzin verme oranı (niyet anında sorulanda); bildirim → oturum dönüşümü; **kapatma/izin geri alma oranı**; bildirim başına etkileşim | İzin ≥%25 (web.dev: etkileşim sonrası %30 kabul); geri alma ≤%10/30 gün; **etkileşim <%1 ise Chrome geri alır** (hedef ≥%5) | İnsan | Düşerse **gönderimi azalt, artırma** |
| **Dö8** | **Baskı karşıtı guardrail (U1–U10)** | (a) bildirim sonrası **aynı gün ikinci oturum** payı; (b) bildirimden gelen oturumların uzunluğu; (c) **oturum başına süre bimodalitesi**; (d) uyku/çürüme eşiğinden sonra dönenlerin **şikâyet/yardım** oranı | (a) bildirimle tetiklenen oturum payı ≤%25; (d) şikâyet <0,5% | İnsan | Zorunlu uğrama göstergesi: D1 yüksek ama D7 düşük + kısa oturum + bildirim bağımlı |
| **Dö9** | **Çapa sağlığı** | Çapa yazılamayıp yeniden türetilen oran; özet net ↔ hazine farkı uyuşmazlığı | Yeniden türetme ≤%1; uyuşmazlık **0** | Bot | Test 2 |
| **Dö10** | **Uzun yokluk dönüşü** | ≥14 gün yokluktan sonra geri dönüp ≥1 komut veren oran; K5/K6/K7 kart tıklama; 90 gün sonrası "yeniden başlangıç" kullanımı | Bilgi (hedef yok); D7 dönüş sonrası ≥%30 (öneri) | İnsan | "Yurdun seni bekliyordu" tonunun çalışıp çalışmadığı |

**Bot ne ölçer?** Botlar eğlenceyi ölçmez (00 R5) ama **doğruluk ve sınır testlerini** koşar: Test 1–7 (§5.6), farklı yokluk süreleriyle (1/6/24/48/168/336/1080 sa) özet üretir; kamusal sınır ihlali, yasaklı kalıp, yapılamaz öneri, çapa uyuşmazlığı bulunamaz. Bu test içerik değişince **kendi kendini uyarır** (yeni şablon yasaklı kalıp içeriyorsa kırılır).

---

## 7. Uygulama

**Etiket:** S ≈ ≤3 iş günü, tek modül · M ≈ 1–2 hafta · L ≈ 3+ hafta ya da çekirdek+sunucu+istemci birlikte (tahmin).

| # | Parça | Katman | Maliyet | Alfa | Öncelik | Bağımlılık |
|---|---|---|---|---|---|---|
| **D1** | `donusOzeti` saf modülü: **net sonuç, biten işler, gelenler** + birim/determinizm testi. **Kaldığın yer + öneri kısmı rehber-gorevler B6 (S, P0) ile aynı iştir** (çift iş değil; D1 yalnız net sonuç ve bitenleri ekler, öneriyi B1 öneri motorundan alır) | Çekirdek paketi (`gorev/` yanında, **çekirdek durumunu okur**) | **M** | 0 | **P0** | rehber B1 (öneri motoru), B6 |
| **D2** | **İki çapa** (`sonGorulen`, `ozetOkunduT`) + kirli çıkış yedeği + `hosgeldin` yanıtına özet alanı | Sunucu + protokol | **M** | 0 | **P0** | `sunucu-tasarimi`, protokol |
| **D3** | Oyuncu **özet kayıtları** tablosu (≤200/oyuncu, 30 gün TTL) ve yazıcı kancaları (inşaat bitti, sipariş geldi, satış toplamı). **Kancalar çekirdek olaylarından türetilir, `calistirKadar` yetişmesinde de çalışır (deterministik), kayıt zamanı = olayın sim zamanı `t`, anahtar idempotent** (§5.1); bakım kesintisi özette gösterilmez | Sunucu | **M** | 0 | **P0** | Olay kancaları; `calistirKadar` yetişmesi (sunucu-tasarimi §5, canlı §2.1) |
| **D4a** | **K2 Gün Sayfası, en küçük hâl** (blok B1 net sonuç, B2 biten işler, B3 gelenler, B7 öneri; masaüstü ve telefon tek kolon) + `Devam`/Öneriye git. **Defter Bugün sayfası olarak rehber B4 (Defter arayüzü) içinde yapılır**, ayrı ekran değil | İstemci | **M** | 0 | **P0** | D1–D3; rehber B4; gorsel token'lar |
| **D4b** | K1 şerit, B0 başlık, B5 takvimden, B6 komşular (katman 3), telefon 3 yatay sayfa, Dikkat çipi (rehber B6 kartının kalıcı yüzü) | İstemci | **M** | 0 | P1 | D4a |
| **D5** | **Şablon deposu** (donus.* aileleri, ≈12 aile × ≈4 varyant), yasaklı kalıp lint testi | Veri/metin | **S** | 0 | **P0** | metin rehberi |
| **D6** | **Taslak** profil tablosu ve "Kaldığın yer" ek yarım iş türleri (rehber B6'nın temel kartı P0'da zaten vardır) | İstemci + sunucu | **S** | 0 | P1 | D4a, rehber B6 |
| **D7** | **Takvim sayfası** (ajanda + ay; gerçek tarih; üst çubuk takvim değişimi) + `takvimGorunumu` saf modülü; **takvim paketi** (resmî gün, hasat, kış hazırlığı, Cumhuriyet Bayramı) | İstemci + veri | **M** | 0 (kısmi) | P1 | Takvim paketi (canlı §5.2), DB-10 |
| **D8** | **Kişisel hatırlatma** (oyun içi) + `hatirlatma` tablosu + dakikalık zamanlayıcı | Sunucu + istemci | **S** | 0–1 | P1 | D7 |
| **D9** | **Bülten bloğu** (olgu defteri → şablon → statik JSON) + Haftalık Dünya Raporu manşeti | Sunucu + istemci | **M** | A0-3 / A1-2 | P1/P2 | canlı §11 (A0-3 anlatı) |
| **D10** | **Komşular** bloğu (katman 3 adsız pazar → katman 2 rızalı → katman 1 adlı) + `kamusal-sinir.test` | Sunucu + istemci | **M** | 0 (katman 3) · 1 | P1/P2 | Olgu şeması; K-8 |
| **D11** | **Damga** profil tablosu ve Defter damga gösterimi (yüzdesiz) + vitrin; `kozmetik.json` | Veri + sunucu + istemci | **S–M** | 0–1 | P1 | rehber B1–B4 |
| **D12** | **Yeni kavramlar** (§3.5) yüklem kütüphanesine ve ödül/kozmetik tablosuna ekleme | Çekirdek yüklem + veri | **S** | 0–1 | P2 | GK-6 yüklem kütüphanesi |
| **D13** | **Hatıralar sayfası** (aylık günce) | Sunucu + istemci | **M** | 1 | P2 | Olgu defteri A0-3 |
| **D14** | **Bildirim:** Web Push (service worker, VAPID, kategori, kota 2/gün, sessiz saat) + e-posta (SES, digest, tek tık çıkış) + rıza kayıtları | Sunucu + istemci + hukuk | **L** | 1+ | P2 | Hukuki görüş (K34), D8 |
| **D15** | **.ics aboneliği** (tokenli) | Sunucu | **S** | 1+ | P3 | D7 |

**Alfa-0 sırası ve en küçük dilim.** Baş lider kararına göre (docs/12 §10) Alfa-0 P0 sırası: kamu arsası → para güvenliği → mal kilidi → ekmek zinciri + dükkân → cam → pencere zinciri → **Esnaf Defteri P0** → kamu siparişi v0. Dönüş ekranı **Esnaf Defteri P0'ın hemen arkasına, Defter arayüzünün (rehber B4) Bugün sayfası olarak** yerleşir; ayrı bir yatırım değildir. **Alfa-0 en küçük dilim = D1 + D2 + D3 + D4a (K2 Gün Sayfası: B1, B2, B3, B7) + D5**; rehber B6 ile birleştiği için ek iş yaklaşık **3 M + 1 S** (tahmin). Sahip özellikle istediği için Alfa-0'da kalabilir, ama **kapsam bu dilimle sınırlı tutulur.** Geri kalanlar P1: K1 şerit, telefon 3 yatay sayfa, B0/B5/B6 blokları, Dikkat çipi, taslak, takvim ekranı (D4b, D6, D7, D8).

**Özet.** Alfa-0 P0 = **D1–D3, D4a, D5 (≈4 M + 1 S; rehber B4/B6 ile birleşince ≈3 M + 1 S);** P1 = D4b, D6–D8, D10 (katman 3), D11 (≈1 S + 3 M); P2+ = bildirim (L), bülten (A1-2), kitabe/ihale damgaları, Hatıralar. **Çekirdek şeması bu raporun hiçbir parçasında değişmez** (rehber `alinanOdul` dışında). **İstemci boyut bütçesi:** açılış ekranı + takvim ≈ +12–18 KB (tahmin; ek serif ayrı dosya, +≈33 KB, A4+).

**Aşama özeti.**

| Alfa | Dönüş deneyimi kapsamı |
|---|---|
| **A0 (en küçük dilim)** | K2 Gün Sayfası (B1, B2, B3, B7), iki çapa, özet kayıtları (yetişmede de çalışan kancalar), şablon deposu; kaldığın yer kartı rehber B6 ile ortak |
| **A0 (P1, kapsam küçük tutulursa sonra)** | K1 şerit, B0, B5 ≤2, B6 katman 3, telefon 3 sayfa, Dikkat çipi, taslak, takvim ajanda/ay, oyun içi hatırlatma, 3–5 yeni damga (`ilk_ihracat`, `ilk_kis`, `ilk_hasat_donemi`, `ikinci_zincir`, `ilk_tamir`) |
| **A0-3 / A1-2** | Bülten (ilçe bülteni), Pazar Gazetesi, Komşular katman 2–3, Hatıralar |
| **A1** | Komşular katman 1 (adlı: sözleşme/savaş), pazar günü/ihale/hak takvimi, kitabe/ihale damgaları, hesap koruma bildirimi |
| **A1+** | Web Push, e-posta digest, .ics, arşiv hakkı |
| **Kapsam dışı** | Savunma kaydı içeriği ve yeniden oynatma (askeri raporun konusu); bu rapor yalnız Komşular katman 1'de bir özet satırını tanımlar |

---

## 8. Geri dönüşü zor kararlar (şimdi verilmesi gerekenler)

| # | Karar | Seçenekler | Neden geri dönüşü zor | Öneri | Aciliyet |
|---|---|---|---|---|---|
| **DK-1** | **Özet çapasının iki alanlı olması** (`sonGorulen` + `ozetOkunduT`) ve yeri (profil, çekirdek dışı) | (a) tek çapa (`sonGorulen`) · (b) iki çapa (öneri) · (c) çekirdekte | Çapa şeması komut günlüğü/anlık görüntü ve ölçüm huni hesabıyla bağlanır; tek çapa ile ekran ve çökme senaryosu özet kaybettirir; çekirdeğe girerse **snapshot göçü** ister | **(b), profil tablosunda**; çekirdek durumu değişmez | **Alfa-0 öncesi** |
| **DK-2** | **Kamusal veri sınırı kuralı** (§2.4) | Serbest · üç katman + yasak liste (öneri) | Oyuncu bir kez "başkasının durumunu özette gördü"yse alışkanlık ve şikâyet kalıcıdır; KVKK ve baskın zamanlaması sızıntısı sonradan düzeltilemez | **Üç katman + yasak liste, testle korunur** | Alfa-0 öncesi |
| **DK-3** | **Saklanan: olgu mu, metin mi** (özet için) | Metin · olgu referansı (öneri) | Metin saklanırsa ad anma rızası geri alma/hesap silme zorlaşır; arşivi yeniden yazmak gerekir (K-8) | **Olgu referansı; metin render anında** | **Alfa-0 öncesi (olgu şeması yazılmadan)** |
| **DK-4** | **Kozmetik/bilgi ödüllerinin kapısı** (profil mi, çekirdek mi) | Hepsi `alinanOdul` · yalnız para/mal çekirdekte, K/B profilde (öneri) | Çekirdeğe giren her alan şema göçü ve determinizm yüzeyidir; sonradan çekirdekten çıkarmak snapshot göçü | **K/B profilde (`damga`); para/mal çekirdekte** | Alfa-0 öncesi |
| **DK-5** | **Defter ilerlemesi gösterimi** (sayı/yüzde mi, damga mı) | Yüzde · sayı · damga, boş yuvasız (öneri) | Bir kez "7/13" gösterilirse koleksiyon ve karşılaştırma beklentisi kalıcı olur; sonradan kaldırmak "ceza" gibi algılanır | **Damga, yuvasız, sayısız** | Alfa-0 |
| **DK-6** | **"Zaman sınırlı kozmetik yok, etkinlik kozmetiği giriş şartı aramaz"** | Sınırlı süreli · her zaman erişilebilir (öneri) | Bir kez FOMO kozmetiği verilirse sonraki her etkinlikte beklenti ve baskı kalıcı olur (Duolingo dersi) | **Her zaman erişilebilir, etkin hesap yeter** | Alfa-0 öncesi (ilk kozmetik içerik) |
| **DK-7** | **İkinci dönüş damgası/ödülü yok** (DB-7) | Dönüş damgaları · yalnız `ilk_donus` (öneri) | Dönüş ödülü bir kez genişlerse "günlük giriş ödülü" yasağı (K13) delinir | **`ilk_donus` tek ve kozmetik/bilgi** | Alfa-0 |
| **DK-8** | **Bildirim varsayılanı ve kota** | Açık/kapalı; kota yok/≤2 (öneri) | Bir kez "açık" yayınlanırsa geri çekmek izin ve güven kaybıdır; kota gevşetilirse tarayıcı izin geri alma ve oyuncu şikâyeti doğar | **Varsayılan kapalı; niyet anında izin; ≤2/gün; sessiz saat** | Alfa-1 öncesi |
| **DK-9** | **"Hesap koruma" sınıfı** (hareketsizlik merdiveni uyarıları) varsayılan açık mı | Kapalı · açık, kapatılabilir (öneri) · hiç yok | Parsel kaybı gerçek sonuçtur; uyarmamak adaletsiz, fazla uyarmak baskı; **hukuki sınıflandırma** (hizmet/ticari) sonradan değiştirilemez | **Açık, yalnız e-posta ve oyun içi, ≤3 mesaj/dönem, kapatılabilir; hukuki görüş** | Alfa-1 öncesi |

**Kolay geri dönülür:** ekran adı ("Sen yokken"), bant eşikleri, madde bütçeleri, şablon metinleri, öneri kural sırası, yeni kavram listesi, damga çizimleri, selam şeridi, takvim görünümleri.

---

## 9. Açık sorular (sahip / lider için)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| DS-1 | Açılış ekranı adı **"Sen yokken"** ve sekme adı **"Bugün"** olsun mu ("Akşam Defteri" iç terim)? | Evet (DB-1) |
| DS-2 | Selam şeridi (günlük, Isabelle benzeri) Alfa-0'da yer alsın mı, yoksa yalnız Gün Sayfası mı? | Yalnız K2; selam şeridi Alfa-1 |
| DS-3 | Ek serif (bülten başlığı) A4+ bütçesine girsin mi (+≈33 KB)? | Evet, ayrı dosya; yoksa sistem serif |
| DS-4 | **Hesap koruma e-postası** (hareketsizlik merdiveni) varsayılan açık olsun mu? Hukuki sınıflandırma kimde? | Açık, kapatılabilir; hukuki görüş (K34) sonrası |
| DS-5 | **Damga vitrini** (Esnaf Kartı'nda ≤3) Alfa-1'de mi, hiç mi? | Alfa-1, opt-in |
| DS-6 | "Komşular" blokunda **adlı** (katman 1) savaş ilanı/sözleşme teklifi için hukuki görüş şart mı? | Evet; A1'e kadar yalnız katman 2–3 |
| DS-7 | **Kozmetik arşiv hakkı** (yılda 1, kaçırılan etkinlik kozmetiğini seçme) kabul mü? | Evet (U3) |
| DS-8 | Kişisel hatırlatma **serbest notu** (≤80 karakter) izinli mi (yalnız sahibine, ajana girmez)? | Evet |
| DS-9 | Web Push ve e-posta Alfa-1'de **birlikte** mi, önce e-posta mı? iOS Ana Ekrana ekleme şartı kabul mü? | Önce oyun içi + e-posta; Web Push sonra |
| DS-10 | "Dönüş ekranı" için ilk alfa kullanıcılarına **sürüm A/B** (metin/öneri sırası) kabul mü (gizli kontrol yok)? | Evet (rehber GS-2) |

---

## 10. Doğrulanmayanlar ve sınırlar

| Konu | Durum |
|---|---|
| Tüm süre, eşik, boyut ve maliyet sayıları (bantlar, ≤8 satır/≤90 kelime, ortanca 12 sn, 260 MB, $270–$2.300/ay, p95 150 ms) | **Öneri/tahmin;** ölçülmedi |
| Clash of Clans savunma kaydı, Revenge (12 saat), replay mantığı | **Arama özeti** (fandom/X/Sportskeeda); oyun güncellemeleriyle değişir |
| EVE beceri kuyruğu, Albion işçi/journal ayrıntıları (22 saat vb.) | **Arama özeti** |
| Animal Crossing Isabelle günlük duyurusu, Stardew gün sonu ekranı ve takvimi | **Arama özeti** (Nookipedia, Stardew Wiki) |
| Mobil idle "hoş geldin" modal ve reklam kapısı | **Arama özeti**; tür genellemesi, tek oyun değil |
| Duolingo bildirim dili ve streak eleştirisi | **Arama özeti** (üçüncü taraf analizler) |
| Chrome Push oran sınırı (Ocak 2026), izin otomatik geri alma, web.dev %12/%30 | **Doğrulandı** (resmî sayfalar okundu); davranış sürüme göre değişebilir |
| iOS Web Push şartları (Ana Ekran, dokunuşla izin) | **Doğrulandı** (WebKit blogu okundu; sonraki iOS sürümlerinde gevşemiş olabilir, **doğrulanmadı**) |
| 6563 sayılı Kanun/İYS: ticari ileti onayı, hizmet iletisi muafiyeti | **Arama özeti**; **hukuki görüş gerekir** (e-posta/push için sınıflandırma, hesap koruma mesajı) |
| KVKK: takma adın kişisel veri olabilmesi, ad anma rızası, amaç sınırlaması | **Doğrulanmadı;** açık alfa öncesi hukuki görüş (K34) |
| E-posta toplu gönderici kuralları (tek tık çıkış vb.) | **Doğrulanmadı;** ayrı teknik inceleme |
| Gerçek takvim tarihleri (Ramazan başlangıcı, MEB gelecek yıl takvimi) | **Tahmini** etiketli; resmî duyuruyla güncellenir (canlı §5.2) |
| Dini bayram hatırlatma görünümü, anma günü politikası | **Sahip onayı** bekler |
| Çevrimdışı özet kayıt hacmi (20–60 kayıt/gün/oyuncu) | **Tahmin** (cesitlilik §8.2); ölçülmedi |
| Kirli çıkışta çapayı komut günlüğünden yeniden türetme | **Mimari beklenti;** ayrıntı sunucu/serileştirici sahibinde |

---

## 11. Kaynaklar

**Oyun ve ürün örnekleri**
1. Clash of Clans, Revenge ve savunma kaydı: https://clashofclans.fandom.com/f/p/2539460356997402692 · https://www.sportskeeda.com/mobile-games/how-new-revenge-feature-works-clash-clans · replay açıklaması: https://x.com/ClashofClans/status/1737801293370884157 (arama özeti)
2. EVE Online, beceri eğitimi çevrimdışı ve kuyruk: https://community.eveonline.com/news/dev-blogs/longer-queues-expected-skill-training-above-and-beyond-24-hours (arama özeti)
3. Albion Online, Journal ve işçi: https://wiki.albiononline.com/wiki/Journal · https://www.albioncodex.com/guides/albion-online-laborers-guide (arama özeti)
4. Animal Crossing: New Horizons, Isabelle duyurusu, saat ve olaylar: https://nookipedia.com/wiki/Isabelle · https://nookipedia.com/wiki/Clock · https://nookipedia.com/wiki/Event/New_Horizons (arama özeti)
5. Stardew Valley, gün sonu (Shipping) ve takvim: https://stardewvalleywiki.com/Shipping · https://stardewvalleywiki.com/Calendar (arama özeti)
6. Mobil idle, çevrimdışı kazanç ve ödüllü reklam: https://game-ace.com/blog/idle-game-development/ · https://www.designthegame.com/learning/courses/course/designing-mobile-idle-genre/a-deep-dive-idle-genre-game-design (arama özeti)
7. Seri ve suçluluk dili eleştirisi: https://thedecisionlab.com/insights/consumer-insights/streak-creep-the-perils-of-too-much-gamification · https://screenwiseapp.com/guides/duolingo-streaks-and-anxiety-in-kids (arama özeti)
8. Mobil strateji/tycoon D1/D7 kıyas (baslangic-ve-ustalik'ten): https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies

**Tarayıcı bildirimi ve takvim standartları**
9. Chrome, web push oran sınırları (Ocak 2026): https://developer.chrome.com/blog/web-push-rate-limits (okundu)
10. Chrome, kullanılmayan sitelerde bildirim izninin otomatik kaldırılması: https://blog.google/chromium/automatic-notification-permission/ (okundu)
11. web.dev, izin istemi pratikleri (%12 / %30): https://web.dev/articles/permissions-best-practices (okundu)
12. WebKit, iOS ve iPadOS Web Push (Ana Ekran, dokunuşla izin): https://webkit.org/blog/13878/web-push-for-web-apps-on-ios-and-ipados/ (okundu)
13. MDN, Push API: https://developer.mozilla.org/en-US/docs/Web/API/Push_API · RFC 8030 (Web Push): https://www.rfc-editor.org/rfc/rfc8030 · RFC 8292 (VAPID): https://www.rfc-editor.org/rfc/rfc8292 · RFC 5545 (iCalendar): https://www.rfc-editor.org/rfc/rfc5545 (standart adları; sayfa içeriği bu çalışmada okunmadı)

**Hukuk (Türkiye)**
14. 6563 sayılı Elektronik Ticaretin Düzenlenmesi Hakkında Kanun: https://mevzuat.gov.tr/MevzuatMetin/1.5.6563.pdf · İleti Yönetim Sistemi: https://iys.org.tr/iys/kanun · özet: https://www.cenuta.com/blog/6563-sayili-kanun-ve-iys-nedir-ticari-elektronik-ileti-yukumlulukleri-ve-ceza-rehberi-2026/ (arama özeti; hukuki görüş gerekir)

**İç belgeler ve kod**
15. [rehber-gorevler](rehber-gorevler.md) · [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) · [gorsel-kimlik-ve-arayuz](gorsel-kimlik-ve-arayuz.md) · [oyun-kimligi-harman](oyun-kimligi-harman.md) · [cesitlilik-yonetim-askeri-teknoloji](cesitlilik-yonetim-askeri-teknoloji.md) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) · [kamu-ve-kamu-arazileri](kamu-ve-kamu-arazileri.md) · [yapay-zeka-kamu-ajanlari](yapay-zeka-kamu-ajanlari.md) · [baslangic-ve-ustalik](baslangic-ve-ustalik.md) · [capital-rift-mekanikleri](capital-rift-mekanikleri.md) · [paylasilan-dunya-mimarisi](paylasilan-dunya-mimarisi.md) · [argelider-sentez-1](argelider-sentez-1.md) · [docs/11](../11-urun-donusu.md) · [docs/12](../12-yon-taslagi.md)
16. Kod: `packages/istemci/src/arayuz/gelen-kutusu.ts`, `dikkat.ts`, `bildirim.ts`, `panel.ts` (`takvimYaz`); `packages/istemci/src/veri/tarim.ts` (`takvimDurumu`); `packages/protokol/src/mesajlar.ts` (`hosgeldin`); `packages/sunucu/src/depo/`.
