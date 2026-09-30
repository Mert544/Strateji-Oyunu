# 02 — Tasarım Ar-Ge

> **Özet.** Bu belge, oyunun 20–25. günde tekrara ve stok birikmesine düşmemesi için araştırılan **tazelik mekanizmalarını**, lavabo/musluk dengesini, v0 ekonomi formüllerini, lojistik okunurluğu için arayüz önerilerini (Aşama 3), çevrimdışı koruma ve yetişme önerilerini ve H1–H7 hipotezlerinin ölçüm tanımlarını içerir. **Sayıların çoğu öneridir ve doğrulanmamıştır;** kalibrasyon taramasından önce kalibre sayılmamalıdır. Uygulama kuralları için tek kaynak [06 — Simülasyon Spesifikasyonu](06-simulasyon-spesifikasyonu.md)'dur; bu belge ile 06 çelişirse **06 önceliklidir.**

İlgili belgeler: [00 — Vizyon](00-vizyon-ve-kararlar.md) · [01 — Rakip Araştırması](01-rakip-ve-pazar-arastirmasi.md) · [03 — Teknik Mimari](03-teknik-mimari.md) · [04 — Yol Haritası](04-yol-haritasi.md)

**Durum etiketleri.** Bu belgede her mekanizma için 06'ya göre durum belirtilir: **v0'da var** (06'da tanımlı), **kısmen** (06'da daha basit biçimi var), **v0 dışı** (öneri; henüz spesifikasyonda yok).

---

## 1. Problem: stok birikmesi ve karar tükenmesi

Önceki Gate 0 prototipinde bot taraması, kararların ~10–15. turda tükendiğini gösterdi: tüm yatırımlar bitti, stok birikti ([00 R2](00-vizyon-ve-kararlar.md)). Bu, ekonomi tasarımında klasik bir teşhistir: **stok birikmesi = musluklar > lavabolar** (mallar sistemde kalıcı olarak oluşuyor ama yeterince yok olmuyor). MMO ekonomi yazılarında işe yarayan lavabolar, tek seferlik harcamalar değil, **zamanla veya kullanımla ölçeklenen** bozulma, onarım, bakım ve tüketimdir ([MassivelyOP](https://massivelyop.com/2015/09/13/mmo-mechanics-economic-stagnation-in-mmo-economies/), [Gold sink — Wikipedia](https://en.wikipedia.org/wiki/Gold_sink)).

Uyarı: Victoria 3, likidite tuzaklarından kaçınmak için ekonomiyi her tıkta sıfırdan çözer ve gerçek stok tutmaz ([Game Developer — Modeling the global economy in Victoria 3](https://www.gamedeveloper.com/design/deep-dive-modeling-the-global-economy-in-victoria-3)). Bizim oyunumuzda stoklar kalıcı olduğundan **tavan ve bozulma isteğe bağlı değildir.**

## 2. Tazelik mekanizmaları

Aşağıdaki yedi mekanizma Ar-Ge raporundan gelir. **Öncelik sırası** bizim önerimizdir: Gate 0 gözlemine (stok birikmesi) en doğrudan cevap veren ve Aşama 2'de 06 ile zaten uygulanan mekanizmalar önce gelir.

| Öncelik | Mekanizma | İçerik | Hedef hipotez | 06 durumu |
|---|---|---|---|---|
| 1 | **Kapasiteye bağlı yinelenen lavabolar** | Yapılar/yollar zamanla bozulur ve bakım ister (öneri: %1–2/gün); nüfus sürekli tüketir, refahla talep kademeleri artar; birlikler var oldukları her gün ikmal tüketir; depo üstü stok bozulur (öneri: fazlanın %2/gün) | H2 (karar tükenmesi), H3 | **Kısmen/var:** tesis bakım girdisi (her zaman tüketilir), nüfus tüketimi, ordu ikmali, tüm stokta bozulma ve depo tavanı var ([06 §4, §6](06-simulasyon-spesifikasyonu.md)). Yapı/yol yıpranması yüzdesi ve refaha bağlı talep kademeleri **v0 dışı** |
| 2 | **Paylaşılan kapasitenin fırsat maliyeti** | Sivil ve askeri mal aynı kenar kapasitesini paylaşır; askeriyeye kayan kapasite ekonomiden çıkar | **H3** (çekirdek), H1 | **v0'da var** ([06 §5](06-simulasyon-spesifikasyonu.md): ortak kenar kapasitesi, `askeriRezervPpm`) |
| 3 | **Kelepçeli doğal fiyatlar** | Victoria 3 tarzı: `fiyat = taban × [1 + 0,75 × clamp((ALIŞ−SATIŞ)/min(ALIŞ,SATIŞ), ±1)]` → taban fiyatın %25–%175'i ([Vic3 Wiki — Market](https://vic3.paradoxwikis.com/Market)) | H3, H1 | **v0'da var** ([06 §4](06-simulasyon-spesifikasyonu.md): esneklik `fiyatEsnekligiPpm` parametresi; 0,75 Vic3 örneğidir) |
| 4 | **Yüzde değil yöntem** | Teknoloji yüzde artış vermez, *üretim yöntemi* açar; yöntem girdi/çıktı/istihdamı değiştirir; **her yöntemin bir bedeli** olmalı ([Vic3 Dev Diary 5](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-5-production-methods.1480760/), [Vic3 Wiki — Production method](https://vic3.paradoxwikis.com/Production_method)) | H1, H2 | **v0'da var** (6 düğüm, [06 §7](06-simulasyon-spesifikasyonu.md)); "her yöntemin bir bedeli var" kuralı içerik tasarımında uygulanmalı |
| 5 | **Tükenme ve kayan yataklar** | Verim = taban × (kalan/ilk)^0,5; keşif olayları; 15–25. günlerde yer değiştirme/ikame zorlar | H1, H2 | **Kısmen:** `sqrt(rezervKalan/rezervIlk)` ve rezerv azalması var; **keşif olayları v0 dışı** |
| 6 | **Azalan getiri** | İstihdam eğrisi çıktı ∝ işçi^0,8, merkezlerde tıkanıklık, bölgesel pazar doygunluğu | H2 | **Kısmen:** pazar emilim/arz sınırı ve tesis başı istihdam tavanı var; **istihdam eğrisi v0'da doğrusaldır** (bkz. §4) |
| 7 | **Şoklar** | Hasat kaybı (−%30, 3 gün), komşu savaşından talep artışı, liman ablukası, dünya fiyat şoku; bölgesel ve kısmen öngörülebilir (24 saat uyarı) | H2, H1 | **v0 dışı** |

**Okuma kılavuzu.** Mekanizma 1–3 "bizim ekonomimizin ağırlık merkezi"dir (kapasite, ortak ağ, fiyat); 4–5 bölgeleri birbirinden ayırır (H1); 6–7 sonraki kalibrasyon turunda eklenecek adaylardır (v0 sayılarının ilk taramasından sonra karar verilecek).

## 3. Lavabo/musluk dengesi

Amaç: uzun vadede **her mal için üretim ≈ tüketim + bozulma + batma** (küçük ve pozitif bir fazla) ve bu dengenin **oyuncu kararlarıyla kaydırılabilir** olması; kalıcı fazla veya kalıcı açık olmaması.

| Musluk (mal kaynağı) | Lavabo (mal yok eden) | 06'daki karşılığı |
|---|---|---|
| Tesis çıktısı (istihdam ve girdi verimiyle sınırlı) | Tesis girdisi (zincir tüketimi) | [06 §4](06-simulasyon-spesifikasyonu.md) tesis çalışması |
| Ham çıkarım (rezerv azaldıkça düşer) | Tesis **bakım** girdisi (tesis aktif olmasa da) | `bakim` alanı; `sqrt` rezerv verimi |
| Dünya pazarına ithalat | Nüfus tüketimi (gıda, yakıt, elektronik; 1000 kişi başına saatlik) | `tuketim1000Saat` |
| Bölgeler arası taşıma (akış; yoldaki mal korunur) | Ordu ikmal tüketimi | `ikmal` malı, saatlik |
| Yağma (savaşta saldıranın kazancı; diğer tarafın kaybı) | **Bozulma:** her mal için saatlik `miktar × bozulmaPpmGun/24/PPM` | [06 §4](06-simulasyon-spesifikasyonu.md) bozulma |
| — | **Depo tavanı:** taşan üretim `israf` olur | `depoKapasitesi`, `israf` |
| — | İhracat (pazarın emebileceği hacimle sınırlı) | `emilimSaat` |

**İzleme.** Aşama 2 ölçüm takımı şu göstergeleri üretir ([06 §9](06-simulasyon-spesifikasyonu.md)): `uretimToplam`, `israf`, `pazar.fiyat`, `lojistik.kapsam`. Sağlık kontrolü taslağı (öneri): her mal için 30 günde `israf` toplamı ve depo doluluk oranı; kalıcı olarak depo tavanında bekleyen mal = musluk > lavabo bulgusu; kalıcı olarak sıfır stok + açık kapsam = lavabo > musluk.

## 4. v0 ekonomi formülleri (06 ile uyum)

Ar-Ge raporunun önerdiği v0 modeli ile 06'nın uyguladığı kurallar arasında farklar vardır. Tablo her kalemi yan yana koyar. **06 sütunu uygulama kaynağıdır.**

| Kalem | Ar-Ge önerisi | 06'da uygulanan | Not |
|---|---|---|---|
| Zincirler | gıda, çelik, makine, elektronik, yakıt, askeri | Aynı: 12 mal, 6 zincir ([06 §4](06-simulasyon-spesifikasyonu.md)) | Uyumlu |
| İstihdam | `işçi = min(nüfus × pay, kadro)` | Bölgenin işgücü (`nufus × isgucuPpm`) tesislere **id sırasıyla** dağıtılır; `isciPpm = atanan / yontem.isci` | Benzer; 06 bölge işgücünü tesisler arasında paylaştırır |
| **Çıktı eğrisi** | **çıktı ∝ (işçi/kadro)^0,8** (azalan getiri) | **Doğrusal:** `verimPpm = min(isciPpm, girdi yeterliliği)` | **Fark.** v0'da azalan getiri *uygulanmamıştır*; istihdam doğrusaldır. 0,8 üssü kalibrasyon turunda aday değişikliktir (mekanizma 6) |
| Girdi yeterliliği | — | Girdi stoğu > 0 ise %100; stok 0 ise `(yerel üretim + gelen akış)/ihtiyaç` | Yalnızca 06'da |
| Ham çıkarım | Verim = taban × (kalan/ilk)^0,5 | `sqrt(rezervKalan/rezervIlk)` ile çarpılır; rezerv saatlik tıkta üretim kadar azalır | Uyumlu |
| Nüfus tüketimi | 1000 kişi/gün: gıda 10, mal 2, yakıt 1 | 1000 kişi başına `tuketim1000Saat` (gıda, yakıt, elektronik); değerler `parametreler.json`'da | Sayıların 06'daki kesin değerleri parametre dosyasındadır (bu belgede doğrulanmadı) |
| Nüfus büyümesi | — | Gıda karşılanma ≥ %95 ve vergi eşik altındaysa `buyumePpmGun/24` büyür; gıda < %80 ise küçülür | Yalnızca 06'da |
| Bozulma | Depo üstü %2/gün | **Her mal için** stok üzerinden saatlik `bozulmaPpmGun/24` oranı; ayrıca depo tavanı, taşan `israf` | **Fark.** 06'da bozulma yalnızca depo üstüne değil tüm stoğa uygulanır; tavan ayrı bir lavabodur |
| Fiyat | `taban × [1 + 0,75·clamp((ALIŞ−SATIŞ)/min(ALIŞ,SATIŞ), ±1)]` | `taban × (1 + e × clamp((T−A)/min(T,A), −1, +1))`, `e = fiyatEsnekligiPpm` | Aynı biçim; T = talep (ALIŞ), A = arz (SATIŞ). `min(T,A)=0` kenar durumu 06 metninde belirtilmemiştir (kod davranışı doğrulanmalı) |
| Pazar hacmi | Emebileceği hacim sınırı, esneklik ≈ −1,5 | Gerçekleşen ihracat ≤ `emilimSaat`, ithalat ≤ `arzSaat` | **Esneklik −1,5 v0'da uygulanmamıştır**; yalnızca hacim sınırı vardır |
| İhracat/ithalat çarpanı | 0,9× / 1,1× | `ihracatCarpani` / `ithalatCarpani` (anlaşma/yaptırım çarpanları yerine geçer) | Değerler parametre dosyasında; bu belgede doğrulanmadı |
| Taşıma maliyeti | mesafe × tarife (para) | Yol maliyeti = **taşıma süresi**; parasal tarife yok; sınır kenar kapasitesidir | **Fark.** v0'da taşıma parasal değil, kapasite ve süre ile bedellendirilir |
| Yapı/yol bakımı | %1,5/gün yıpranma | Tesis `bakim` malı (sabit, saatlik) | **Fark.** Yüzde yıpranma modeli v0 dışı |
| Ordu bakımı | Ordu bakımı | Ordu her gün `ikmal` tüketir; karşılanma oranı savaş gücünü çarpar | Uyumlu |

**Ana belirsizlik.** Ar-Ge sayılarının hepsi sezgiseldir. **Kalibrasyon taramasından önce kalibre sayılmamalıdır.** Tarama yöntemi §8.3'tedir.

## 5. Dünya pazarı tasarımı notları

- Pazar yalnızca `liman` etiketli bölgelerden erişilir; oyuncular arası emir defteri **yoktur** (düşük nüfusta pazar çökmesi riskine karşı; [01 §3](01-rakip-ve-pazar-arastirmasi.md)).
- Pazar **açıkça işaretli** bir sistem olarak sunulmalıdır: oyuncu "bu fiyatı kim belirliyor?" sorusunu bilmelidir (arz/talep ve kelepçe aralığı arayüzde gösterilir).
- Politika katmanı pazar erişimini değiştirir: ticaret anlaşması çarpanları iyileştirir, yaptırım kötüleştirir ([06 §8](06-simulasyon-spesifikasyonu.md)).

## 6. Lojistik okunurluk UX önerisi (Aşama 3 için)

Hedef: H4 — 5 kişilik testte oyuncu **"neresi açık ve neden"** sorusunu 60 saniye içinde yanıtlayabilmeli. Kapsam verisi çekirdekte hazırdır ([06 §5](06-simulasyon-spesifikasyonu.md): karşılanma oranı, en yakın kaynağa süre, neden sınıfı). Aşağıdakiler **öneridir;** insan testiyle sınanmadıkça kanıtlanmış sayılmaz.

### 6.1 Referans oyunlar

| Oyun | Öğrenilen |
|---|---|
| HoI4 F4 ikmal haritası | Ayrı bir harita modu; ikmal durumu tek bakışta okunur ([eip.gg rehberi](https://eip.gg/hoi4/guides/heres-how-supply-works-in-hearts-of-iron-iv/)) |
| OpenTTD bağlantı grafı | Sarı/kırmızı az kapasite, soluk yeşil/beyaz fazla kapasite ([OpenTTD Manual](https://wiki.openttd.org/en/Manual/Passenger%20and%20cargo%20distribution); palet istekleri: [issue #6651](https://github.com/OpenTTD/OpenTTD/issues/6651)) |
| Mini Metro | İstasyonda dolan halka ve yanıp sönme: darboğaz **yerinde** ve zamanla tırmanır ([Mini Metro Wiki](https://mini-metro.fandom.com/wiki/Normal)) |
| Factorio | Bant kademesi renkleri ([Wiki — Transport belt](https://wiki.factorio.com/Transport_belt)); talebi arzı aşan eşyaları listeleyen mod ([Logistics Insights](https://mods.factorio.com/mod/logistics-insights)) |

### 6.2 Öneriler

| # | Öneri | Gerekçe |
|---|---|---|
| U1 | **3–4 durum:** karşılanan, kısmi, açık, engelli — bölge/düğüm dolum durumuna göre | Karşılanma oranı ([06 §5](06-simulasyon-spesifikasyonu.md) kapsamı) doğrudan eşlenir |
| U2 | **Renk körü güvenli rampa + ikinci kanal** (tarama deseni veya ikon) | Yalnızca renge dayanmamak |
| U3 | **Kenar genişliği = kapasite, renk = kullanım** | Kapasite ile doluluk ayrı kanallarda okunur (`kenarlar[].kullanilanSaat`) |
| U4 | **Neden glifi** her sorunda: kapasite, girdi eksik, mesafe, abluka | 06 neden sınıfları: `kapasite`, `girdi_eksik`, `mesafe`, `erisim_yok` ( "abluka" 06'da yok; ablukalı liman şoku v0 dışı) |
| U5 | **Tık → tek satır neden** (ör. "Çelik: %40 eksik, A–B demiryolu dolu") | H4'ün 60 saniye hedefini doğrudan hedefler |
| U6 | **Darboğaz yerinde tırmanır** (zamanla artan vurgu) | Mini Metro dersi |
| U7 | **"Ya olursa" önizleme:** planlanan kenar geliştirmesinin kapsam farkı | Çekirdek yeniden çözüm ile ucuza hesaplanabilir ([03 §5](03-teknik-mimari.md)); Aşama 3'te tasarlanacak |

## 7. Çevrimdışı koruma ve yetişme önerileri

### 7.1 Rakiplerden çıkarımlar

| Oyun | Mekanizma | Değerlendirme |
|---|---|---|
| Travian | 7 gün başlangıç koruması (nüfus 200 veya ikinci köyde erken biter; [Fandom](https://travian.fandom.com/wiki/Newbie_protection)); tatil modu 1–15 gün; gizli kaynak (cranny 200–2000; [destek](https://support.travian.com/en/support/solutions/articles/7000068298-hiding-resources-cranny)) | Başlangıç koruması ve eşikte erken bitme yararlı; gizli kaynak bir kayıp tavanı biçimi |
| OGame | "Fleetsave" işe yarar ama oyuncuyu çevrimdışı kaygı ritüeline zorlar | **Tasarım kokusu:** kaçınılacak |
| Tribal Wars | Saldırılar çevrimdışıyken de iner; hesap bakıcılığı | Kaçınılacak |
| EVE | Çaylak sistemleri ve beceri tavanları | Yetişme/puan bandı fikri |

### 7.2 Öneriler ve 06 durumu

| # | Öneri | 06 durumu |
|---|---|---|
| C1 | **Yapısal kayıp tavanı:** pencere, stokun %25'inden fazlasını alamaz | **v0'da var:** `kayipTavaniPpm × stok`, tek noktada kelepçe ([06 §6](06-simulasyon-spesifikasyonu.md)) |
| C2 | **Yağma saldıranın taşıma kapasitesiyle orantılı** (saldıran da lojistiği kullanır) | **v0 dışı:** 06'da `yagmaOraniPpm` ve tavan var; taşıma kapasitesine bağlama yok |
| C3 | **Hazır emirler:** savunma duruşu, otomatik tayınlama, rezervler; manuel oyunun ~%60–70 verimi (H7: aktif oyun değerli kalsın) | **Kısmen:** `savunma` ve `geri_cekil` duruşları var, çevrimdışıyken geçerli; otomatik tayınlama/rezerv v0 dışı |
| C4 | **12–24 saat haberli pencereler** | **v0'da var:** ilan hazırlığı `U(ilanHazirlikSaatMin, ilanHazirlikSaatMax)` + `pencereSaat` |
| C5 | **Yeni oyuncu koruması** (7–14 gün) | **v0'da var:** `yeniOyuncuKorumasiGun`; korumadaki oyuncuya savaş ilan edilemez |
| C6 | **Yetişme: yeni bölgenin inşa maliyeti %40'a kadar ucuz**, yetiştikçe azalır | **v0 dışı** |
| C7 | **Teknoloji yayılımı:** komşuların >%50'sinin bildiği teknoloji ucuzlar | **v0 dışı** |
| C8 | **Puan bandıyla saldırı eşleştirme** | **v0 dışı** |
| C9 | **Eşiklerde erken biten koruma** | **v0 dışı** (koruma sabit süreli) |

**Yetişme hakkında not.** C6–C9 v0'da yoktur; H6 ilk turda yalnızca koruma süresiyle ölçülecektir. H6 başarısız olursa önce bu mekanizmalar eklenir, sonra sezon seçeneği düşünülür ([00 A3](00-vizyon-ve-kararlar.md)).

**Oyuncuya söz.** Kayıp tavanının dışında çevrimdışıyken hiçbir şeyin kaybedilemeyeceği oyuncuya açıkça söylenmelidir ([01 §4.2](01-rakip-ve-pazar-arastirmasi.md)).

## 8. Bot tabanlı denge testi ve hipotez ölçümleri

### 8.1 Yaklaşım

Denge, dünyayı hızlı ileri sarabilen deterministik simülasyon üzerinde **botlarla** ölçülür. Kısıtlı ve kısıtsız ajanlar arasındaki performans farkı, mekaniğin önemini ve baskın stratejiyi gösterir ([Jaffe vd., AIIDE 2012](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf)). Diğer dayanaklar: "prosedürel personalar" ([Holmgård vd.](https://arxiv.org/pdf/1802.06881)), oyun testinde yapay zekâ ajanları ([Politowski vd.](https://arxiv.org/abs/2304.08699)), meta-oyun otomatik dengeleme ([arXiv 2006.04419](https://arxiv.org/pdf/2006.04419)), evrimsel dengeleme (Morosan & Poli; bağlantı verilmedi).

### 8.2 Bot arketipleri

| Ar-Ge arketipi | Aşama 2'deki karşılığı (`packages/botlar`) | Amaç |
|---|---|---|
| Kendine yeten | `sanayici` (yakın karşılık; birebir eşleme doğrulanmadı) | Yerel zincir kurma |
| İhracatçı | `tuccar` | Dünya pazarı ve ticaret |
| Önce-askeri | `militarist` | H3, savaş/ikmal baskısı |
| Lojistik maksimize eden | `lojistikci` | Ağ derinliği |
| Ayarla-unut (H7 tabanı) | `kur-ve-unut` | H7, H5 (çevrimdışı) |
| Yeni oyuncu | `gec-katilan` | H6 |
| Rastgele-geçerli | Aşama 2 listesinde yok (öneri) | Taban çizgisi |
| Politika önayarları | `botlar` içinde politika önayarları | H1 karşılaştırması |

**Daha güçlü ajanlar (sonraki aşama önerisi):** açgözlü tek adım değer fonksiyonlu ajan; hızlı ileri modelle rollout/MCTS; politika parametreleri üzerinde evrimsel arama. Bunlar Aşama 2 kapsamında **değildir.**

### 8.3 İstatistik ve duyarlılık

- **Tohum sayısı:** hedef ≥200 tohumla güven aralığı; ilk turda 10 tohum (`--tohum 1-10`).
- **Eşli test:** karşılaştırmalar ortak rastgele sayılarla (aynı tohum, yalnızca tek değişken).
- **Duyarlılık:** sabitler üzerinde Sobol analizi veya tek-tek duyarlılık taraması. Kalibrasyon bu taramadan sonra yapılır.

### 8.4 H1–H7 ölçüm tanımları

Eşikler **başlangıç önerisidir; ilk simülasyondan sonra kalibre edilir** ([00 §6](00-vizyon-ve-kararlar.md)). "Skor" gibi taslak tanımlar ölçüm paketinde sabitlenene kadar öneridir.

| # | Hipotez | Ölçüm tanımı | Vazgeçme ölçütü | Yöntem |
|---|---|---|---|---|
| **H1** | Bölgeler gerçekten farklı | Tüm bölgelerde arketip/politika turnuvası çalıştırılır; her bölgede politikalar bir başarı skoruyla sıralanır (skor taslağı: 30. gün kümülatif üretim değeri, `uretimToplam` × taban fiyat; ölçüm paketinde sabitlenecek). Ek gösterge: bölge başına en iyi yapılandırma seçiminin **Shannon entropisi** | Aynı politika bölgelerin **%70'inden fazlasında ilk üçte** → baskın strateji var | Bot simülasyonu |
| **H2** | Tekrar düşük kalır | `RI_t = 1[en_iyi(t) == en_iyi(t−1)]`: oyuncunun her girişinde yapılan en iyi düzenlemenin bir öncekiyle aynı olma oranı, 30 günlük simülasyon. Yardımcı: ardışık aksiyon kümeleri arası **Jaccard** benzerliği; **"karar tükenmesi"** = gün başına pozitif marjinal değerli aksiyon sayısı (30. güne kadar > 0 kalmalı; Gate 0 prototipi bunda kalırdı) | 30. günde tekrar endeksi **%60 üzeri** | Bot simülasyonu |
| **H3** | Askeri üretim ekonomiyi değiştirir | Kapasitenin %20'si askeriyeye kaydırılır; taban koşuyla eşli karşılaştırmada her malın fiyat (`pazar.fiyat`) ve kapsam (`lojistik.kapsam`) değişimi ölçülür | **Hiçbir mal fiyatı veya kapsam %10 değişmiyorsa** | Bot simülasyonu |
| **H4** | Lojistik okunur | 5 kişilik insan testi: "neresi açık ve neden?" (protokol taslağı [04 §5](04-yol-haritasi.md)) | 5 kişiden **en az 4'ü 60 saniyede yanıtlayamıyorsa** (bu ölçüt gevşektir; [00 A5](00-vizyon-ve-kararlar.md)) | İnsan testi (Aşama 3) |
| **H5** | Çevrimdışı kayıp sınırlı | 48 saat çevrimdışı oyuncunun stok kaybı: savaş pencerelerinde mal başına ve toplam stoğa oranla kayıp (`savaslar[].sonuc`). Bozulma/tüketim kayıp sayılmaz. Ek öneri: ardışık pencerelerde kümülatif kayıp da raporlanır | **Tek pencerede %25 üst sınırını aşarsa.** Not: 06'da tavan tek noktada kelepçelendiğinden (`kayipTavaniPpm`) bu hipotez uçtan uca bir doğrulamadır | Simülasyon |
| **H6** | Geç katılan işe yarar | Olgun dünyaya (ör. 30. gün; **öneri**) giren yeni oyuncu botun 14 günde "yerel ekonominin ilk yarısına" ulaşma oranı (işletimsel taslak: 14. günde kümülatif üretim değeri, yerel oyuncular medyanının altında kalmama; **tanım netleşmeli**, [00 A6](00-vizyon-ve-kararlar.md)) | Oran **%50'den azsa** | Bot (`gec-katilan`) |
| **H7** | Ayarla ve unut ne çöker ne eşitlenir | Yalnızca akış kurup bırakan bot ile aktif bot aynı tohumda; 24/48/72. saatte kur-ve-unut üretiminin aktif oyuncuya oranı (`uretimToplam`) | Oran **%50–85 aralığı dışındaysa** (çöküş veya eşitlenme) | Bot (`kur-ve-unut`) |

**Kayıt.** H1–H3 ve H5–H7 `pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-10` ile çalıştırılır; JSON ve Markdown raporları üretilir (ölçüm raporları ileride `docs/05-…` numarasını kullanacaktır; şimdilik ayrılmıştır).

## 9. Araştırma kaynakçası

**Tazelik, lavabo ve ekonomi**
- [MassivelyOP — MMO mechanics: economic stagnation](https://massivelyop.com/2015/09/13/mmo-mechanics-economic-stagnation-in-mmo-economies/)
- [Wikipedia — Gold sink](https://en.wikipedia.org/wiki/Gold_sink)
- [Vic3 Wiki — Market](https://vic3.paradoxwikis.com/Market)
- [Vic3 Dev Diary 5 — Production methods](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-5-production-methods.1480760/)
- [Vic3 Wiki — Production method](https://vic3.paradoxwikis.com/Production_method)
- [Game Developer — Deep dive: modeling the global economy in Victoria 3](https://www.gamedeveloper.com/design/deep-dive-modeling-the-global-economy-in-victoria-3)

**Bot tabanlı denge testi**
- [Holmgård vd. — Personas (arXiv 1802.06881)](https://arxiv.org/pdf/1802.06881)
- [Jaffe vd. — Evaluating competitive game balance with restricted play (AIIDE 2012)](https://homes.cs.washington.edu/~zoran/jaffe2012ecg.pdf)
- [Politowski vd. (arXiv 2304.08699)](https://arxiv.org/abs/2304.08699)
- [Metaoyun otomatik dengeleme (arXiv 2006.04419)](https://arxiv.org/pdf/2006.04419)
- Morosan & Poli — evrimsel dengeleme (bağlantı verilmedi)

**Lojistik okunurluğu**
- [eip.gg — HoI4 supply](https://eip.gg/hoi4/guides/heres-how-supply-works-in-hearts-of-iron-iv/)
- [OpenTTD Manual — cargo distribution](https://wiki.openttd.org/en/Manual/Passenger%20and%20cargo%20distribution)
- [OpenTTD issue #6651](https://github.com/OpenTTD/OpenTTD/issues/6651)
- [Mini Metro Wiki — Normal](https://mini-metro.fandom.com/wiki/Normal)
- [Factorio Wiki — Transport belt](https://wiki.factorio.com/Transport_belt)
- [Factorio mod — Logistics Insights](https://mods.factorio.com/mod/logistics-insights)

**Çevrimdışı koruma ve yetişme**
- [Travian Fandom — Newbie protection](https://travian.fandom.com/wiki/Newbie_protection)
- [Travian destek — Hiding resources (cranny)](https://support.travian.com/en/support/solutions/articles/7000068298-hiding-resources-cranny)

Rakip oyun kaynakları için bkz. [01 §6](01-rakip-ve-pazar-arastirmasi.md).
