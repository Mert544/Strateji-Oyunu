# 00 — Vizyon ve Kararlar

> **Özet.** "Bölge Stratejisi", gerçek Dünya haritasında gerçek zamanlı akan, oyuncunun bir bölge veya devlet yöneticisi olduğu bir strateji oyunudur; Capital Rift'in görünür üretim ağı hissini devlet ölçeğine taşır. Bu belge vizyonu, verilmiş kararları (ve her kararın kaynağını), zaman modelini, katman derinliklerini, prototip kapsamını ve hâlâ açık olan kararları toplar. Plan koda *kapılarla* geçer: önce arayüzsüz simülasyon, arayüz yalnızca hipotezler sınandıktan sonra.

**Kaynak kısaltmaları.** **[PDF]** = sahibin "Bölge Stratejisi — Prototip Planı v1" belgesi (30 Eylül 2026, @Mert); **[Oturum]** = takım liderinin bu çalışma oturumunda verdiği kararlar; **[Ar-Ge]** = bu repodaki araştırma/Ar-Ge dokümanlarından türeyen öneri (henüz karar değil); **[Sahip 1 Ekim]** = sahibin 1 Ekim 2026 yön değişikliği kararları (bağlayıcı); **[Lider 1 Ekim]** = takım liderinin onaylı geçiş planındaki uygulama kararları (değiştirilebilir).

İlgili belgeler: [01 — Rakip ve Pazar Araştırması](01-rakip-ve-pazar-arastirmasi.md) · [02 — Tasarım Ar-Ge](02-tasarim-arge.md) · [03 — Teknik Mimari](03-teknik-mimari.md) · [04 — Yol Haritası](04-yol-haritasi.md) · [06 — Simülasyon Spesifikasyonu](06-simulasyon-spesifikasyonu.md) · [08 — Altı Katman](08-alti-katman.md) · [11 — Ürün Dönüşü (ADR)](11-urun-donusu.md) · [Araştırma raporları](arastirma/)

> **Güncelleme (1 Ekim 2026, K23–K35): ürün dönüşü.** Sahip oyunun yönünü değiştirdi. Oyun artık **baştan paylaşılan, kalıcı ve hesaplı bir gerçek dünya**dır. Oyuncu devlet seçmez; **bir ilçede arsa alarak** başlar, arsasına yapı **inşa eder**, üretir ve satar. Harita bölge → il → ilçe → arsa diye derinleşir; 3D karakterle sokakta yürünebilir. Kürede sürekli akan çizgi ağı kalkar, lojistik otomatik ve arka plandadır; altı katman sürer. Yöneticilik artık başlangıç rolü değil, **seçilen makamdır** (muhtar, vali). Aşağıdaki eski metin tarihsel kayıt olarak korunmuştur; etkilenen kararlar "güncellendi (K23+)" notuyla işaretlidir. Gerekçe, seçenekler, fazlar ve v1 tasarımı: [11 — Ürün Dönüşü](11-urun-donusu.md).

---

## 1. Vizyon

> **Güncelleme (K23+).** Aşağıdaki vizyon metni 30 Eylül hâliyle korunmuştur. 1 Ekim'den itibaren oyuncu bölge veya devlet yöneticisi olarak değil, **paylaşılan gerçek dünyada arsa sahibi** olarak başlar; "görünür akış ağı" hissi yerine sakin görsel ve arka plan lojistik geçerlidir (K25, K29). 20–25. gün hedefi ve kapılı, kanıta dayalı yöntem aynen sürer. Yeni yön: [11](11-urun-donusu.md).

- Oyun, **gerçek Dünya haritasında** gerçek zamanlı akan bir stratejidir. Oyuncu bir bölgenin veya devletin doğrudan yöneticisidir.
- Capital Rift'te oyuncuyu tatmin eden şey, üretim ve taşıma ağının **görünür** olmasıdır (talep düğümde görünür, kapasite eklemek tek aksiyondur, etkisi akış çizgisinde okunur; bkz. [01](01-rakip-ve-pazar-arastirmasi.md)). Biz bu hissi **devlet ölçeğine** taşıyoruz: tek tek mülkler değil, bölgeler ve bölgeler arası taşıma ağı.
- Ana tasarım hedefi: **20–25. günde sistemlerin tekrarından doğan sıkılmayı tasarımla önlemek.** Bu, projenin en büyük riskidir ve şu anda yalnızca ekibin gözlemine dayanır (bağımsız tutma verisi yoktur; bkz. §9).
- Yöntem: kapılı geliştirme. Önce arayüzsüz, deterministik bir simülasyon yazılır; yedi hipotez (H1–H7) bot simülasyonuyla ve (H4 için) insan testiyle sınanır; arayüz bundan sonra gelir. Kapılar **kanıt sırasıdır, takvim taahhüdü değildir** ([04](04-yol-haritasi.md)).

## 2. Kararlar tablosu

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| K1 | Oyuncu rolü | Doğrudan bölge/devlet yöneticisi. **→ Güncellendi (K23+): oyuncu ilçede arsa sahibi olarak başlar; yöneticilik seçilen makamdır, bkz. K25** | [PDF] |
| K2 | Harita | Gerçek Dünya; gerçek coğrafya ve ülkeler. Sınır ve isim politikası **açık karar** (§8). İlk gerçek dilim: K18. **→ Güncellendi (K23+): bölge → il → ilçe → arsa derinliği (K26), gerçek il/ilçe adları ve NPC ülke çerçevesi (K33)** | [PDF] |
| K3 | Yapı | Beş ayrı katman: ekonomi, lojistik, araştırma-teknoloji, politika, askeri; ortak veriyle bağlı. **→ Güncellendi: 6 katman, bkz. K19** | [PDF] |
| K4 | Zaman | Tur yok; gerçek zaman 1x, günlük ritim; dünya hızı ayarlanabilir parametre | [PDF] |
| K5 | Çağ ve sezon | Kullanılmayacak. **Kapsam notu (K21):** "sezon yok" kuralı dünya sıfırlaması ve sezonluk sunucu anlamındadır; oyun içi iklim takvimi (K20) bu kuralı çiğnemez | [PDF] |
| K6 | Görsel biçim | 2D harita; üretim ve taşıma akışı görünür. **→ Güncellendi: 3D gerçek Dünya, bkz. K17** (akışın görünürlüğü ilkesi aynen sürer). **→ Güncellendi (K23+): akışın görünürlüğü ilkesi kalktı; sakin görsel, rozet ve mercek, bkz. K29** | [PDF] |
| K7 | Ana hedef | 20–25. gün sıkılmasını tasarımla önlemek | [PDF] |
| K8 | Kapsam | Ar-Ge dokümanları + Aşama 2 kodu (arayüzsüz simülasyon) | [Oturum] |
| K9 | Teknoloji yığını | TypeScript, pnpm monorepo, Vitest | [Oturum] |
| K10 | Dünya modeli | **Kalıcı tek dünya** (sezon yok; K5 ile uyumlu). Geç katılım sorunu koruma süresi, puan bandı ve yetişme yardımıyla (H6) çözülür. Sezon seçeneği açık not olarak kalır (§8). **→ Güncellendi (K23+): kalıcı tek dünya baştan çok oyunculu ve hesaplıdır (K23); yetişme paketi K25 / [11 §7.9](11-urun-donusu.md#79-yeni-oyuncu-h6)** | [Oturum] |
| K11 | Dil | Her şey Türkçe; kodda tanımlayıcılar ASCII Türkçe | [Oturum] |
| K12 | Ekip | Takım lideri (Claude) + uygulayıcı ajanlar. **→ Güncellendi (K23+), bkz. K35** | [Oturum] |
| K13 | Gelir modeli ilkesi | Kritik kararlarda parayla güç yok. Gelir modeli prototip kapsamı dışında | [PDF] |
| K14 | İçerik üretimi | Şablonlu, veriyle tanımlanan içerik (içerik üretimi pahalı) | [PDF] |
| K15 | Test haritası | Sentetik (kıyı, dağ, ova, liman, dar geçit taşıyan kurgusal bölge grafiği); gerçek dilim seçilince aynı veri biçimine geçilir | [PDF] |
| K16 | Plan biçimi | Kapılar kanıt sırasıdır; geçilmeyen kapıda önceki aşama yinelenir | [PDF] |
| K17 | Görsel biçim (yeni) | **3D gerçek Dünya:** stilize küre (stratejik katman, three.js) + bölge yakın planı (MapLibre globe + PMTiles, isteğe bağlı). Akış çizgileri, tesisler ve iklim durumu 3D'de görünür. Ayrıntı ve bütçeler: [arastirma/3d-teknoloji](arastirma/3d-teknoloji.md). **→ Güncellendi (K23+): küre L0 olarak kalır; yakın plan yerine MapLibre il/ilçe/arsa kademeleri (K26) ve ayrı three.js yürüyüş sahnesi (K28); akış çizgileri kalkar (K29)** | [Oturum] |
| K18 | İlk gerçek dilim | **Türkiye + Balkanlar + Karadeniz** (30–60 bölge hedefi; ölçütler §5). Gerçek veri sözleşmesi (`konum`, `sinirDosyasi`, `atif`) veri paketinde hazırdır. Sentetik harita ölçüm ve test için kalır (K15). Dilimin bölge listesi ve sınır/isim politikası (A2) **açık**. **→ Güncellendi (K23+): ilk açılış Alfa-0 = Kocaeli + Sakarya + Bursa; Balkanlar Alfa-1 (K32); ad politikası K33** | [Oturum] |
| K19 | Altı katman (K3'ün yerine) | **Tarım, Sanayi, Lojistik, Teknoloji, Pazar, Devlet.** Devlet; nüfus/toplum ihtiyaçları + politika/yasa/bütçe + askeri/diplomasi'yi birleştiren karma katmandır ve yasa ve bütçe kollarıyla diğer beş katmanı yönlendirir (tarım sübvansiyonu, sanayi teşviki, tarife, araştırma bütçesi, seferberlik). Derinlik yine lojistiktedir. Tasarım: [08](08-alti-katman.md). **→ Güncellendi (K23+): altı katman sürer; lojistik otomatik ve arka plandadır, "derinlik lojistikte" ilkesi kalktı (K29); Devlet yasa ve bütçesi oyuncudan seçilmiş il hükümetine geçer (K25)** | [Oturum] |
| K20 | İklim takvimi | Gerçek takvim aylarına bağlı iklim döngüsü; **hasat oranını, buzlu limanları ve dağ geçitlerini** etkiler; yayılan iklim olayları deterministiktir (PRNG akışı `olay`). Adı "iklim takvimi"dir | [Oturum] |
| K21 | "Sezon yok" kuralının kapsamı | K5'teki kural **dünya sıfırlaması ve sezonluk sunucu** anlamında korunur: dünya asla sıfırlanmaz, sezon bitişi, sezon ödülü ve yeniden başlatma yoktur. İklim takvimi bir **sıfırlama değil, sürekli bir zaman eğrisidir**; bu yüzden K5 ile çelişmez. Karışıklığı önlemek için oyunda ve belgelerde "sezon" sözcüğü **kullanılmaz** | [Oturum] |
| K22 | Açık kaynak ve veri lisans ilkesi | **GPL/AGPL kod kopyalanmaz:** bu projeler (OpenFrontIO, OpenTTD, Symphony of Empires, Mindustry, Widelands, Freeciv-web) yalnızca tasarım referansıdır; algoritmalar yayımlanmış açıklamadan yeniden yazılır. MPL-2.0 (Unciv) dosya düzeyinde sınırlı yükümlülükle kullanılabilir. Veri: CC BY/CC0/kamu malı kaynaklar atıfla kullanılır; **ticari olmayan (NC) kaynaklar kullanılmaz** (FAOSTAT, WorldClim, GADM, UN Comtrade; PortWatch izinsiz değil); OSM türevi veri ayrı ODbL dosyasında tutulur. Ayrıntı: [arastirma/acik-kaynak-ve-veri](arastirma/acik-kaynak-ve-veri.md). **→ Güncellendi (K23+): OpenStreetMap (ODbL) kabul edildi; ayrı ODbL klasörü kuralı sürer (K24)** | [Oturum] |
| K23 | Paylaşılan kalıcı dünya | **Baştan paylaşılan, kalıcı ve hesaplı tek dünya.** Dünya başına tek yazar Node + `ws` süreci; Postgres'te yalnız eklenen komut günlüğü + anlık görüntü; zaman damgasını sunucu basar; Better Auth (magic link + Google). K10'u genişletir, A8'i kapatır. Ayrıntı: [11 §10](11-urun-donusu.md#10-teknik-mimari-özeti) | [Sahip 1 Ekim], [Lider 1 Ekim] |
| K24 | OpenStreetMap (ODbL) | OSM il/ilçe sınırları, karolar (Protomaps PMTiles özütü) ve hücre uygunluğu için kullanılır. OSM türevi veri ayrı klasörde (`veri/haritalar/odbl/`), atıfla; türetilmiş uygunluk verisi ODbL ile yayımlanır, sahiplik verisi ayrı tutulur. Açık alfadan önce dış hukuki görüş (K34) | [Sahip 1 Ekim] |
| K25 | Başlangıç: arsa | **Devlet seçimi yok.** Oyuncu bir ilçede **arsa** alarak başlar (hibe + doluluğu düşük ilçede bedava yurt). Roller seçilmez; inşa edilen yapılardan ve tutulan makamdan doğar (Çiftçi, Sanayici, Tüccar, Müteahhit, Komutan, Muhtar, Vali). Devlet yasa ve bütçesi seçilmiş il hükümetinindir. K1'in yerine geçer | [Sahip 1 Ekim] |
| K26 | Harita derinliği | **Bölge → il → ilçe → arsa (→ sokak).** L0 küre (three.js), L1–L3 MapLibre, L4 yürüyüş sahnesi; kırıntı yolu ve aksan duyarsız arama. Bkz. [11 §9.1](11-urun-donusu.md#91-görünüm-düzeyleri) | [Sahip 1 Ekim] |
| K27 | İnşa süreci | Oyuncu yapıyı arsasındaki hücrelere yerleştirir (hayalet önizleme); inşa 4 aşamalıdır (Temel, İskele, Gövde, Tamam), 2–12 saat sürer, aynı anda 2 kuyruk, iptalde %50 iade. Aşama sunucu zamanından türetilir. 18 yapı: [11 §7.3](11-urun-donusu.md#73-yapılar-18-tür) | [Sahip 1 Ekim] |
| K28 | Yürüyüş | Basit bir 3D karakterle gerçek sokakta ve arazide dolaşma (az ayrıntı); ayrı three.js sahnesi, Protomaps karoları, Mapterhorn DEM, kendi kinematik kontrolcümüz, CC0 karakter. Alfa-1'de açılır, paralel geliştirilir | [Sahip 1 Ekim], [Lider 1 Ekim] |
| K29 | Sakin görsel ve arka plan lojistik | Kürede sürekli akan çizgi ve parçacık ağı **kalkar** (göz yoruyor). Okunurluk rozetler (▲ ◯ ✓), 8 mercek ve en çok 5 maddelik Dikkat paneliyle sağlanır. **Lojistik otomatiktir ve arka plandadır:** oyuncu rota kurmaz; MCF yalnız 53 merkez arasında çözülür, il içi havuzlanır; rota yalnız seçili yapı için durağan noktalı çizgidir. Altı katman sürer (Tarım, Sanayi, Lojistik-arka plan, Teknoloji, Pazar, Devlet-yönetici). K6/K17'deki "akış görünür" ve K19'daki "derinlik lojistikte" ilkelerinin yerine geçer | [Sahip 1 Ekim] |
| K30 | Arsa atomu | **z20 kare hücre** (~30 m, quadkey). 1 hücre = 1 yapı yuvası; yapılar 1–3 hücre kaplar. Sahiplik hücre kimliğiyle seyrek tutulur. H3 altıgen yalnız toplama mercekleri için ikincil | [Lider 1 Ekim] |
| K31 | Merkez düğümler | 53 bölge lojistik ve pazar **merkez düğümü** olarak kalır; her il tam olarak bir bölgeye eşlenir. Oyuncunun bir ildeki varlığı çekirdekte bir "işletme düğümü"dür | [Lider 1 Ekim] |
| K32 | Alfa-0 kapsamı | **Kocaeli + Sakarya + Bursa** (~40 ilçe, ≤200 davetli). Alfa-0'da askeri, seçimler (NPC vali varsayılan yasalarla) ve yürüyüş **yok**; Alfa-1'e kalır. Balkanlar Alfa-1'de; ilçeler %70 doluluğa göre kademeli açılır | [Lider 1 Ekim] |
| K33 | Ad ve sınır politikası | **Gerçek il ve ilçe adları** kullanılır; ülke düzeyi NPC çerçevedir (sabit taban tarifeler); ihtilaflı alanlar dilim dışında kalır. A2'yi kısmen kapatır; yazılı dışlama listesi Balkan açılışından önce | [Lider 1 Ekim] |
| K34 | Altyapı ve hukuk | Hetzner (CX33) + aynı makinede Postgres + Cloudflare (proxy, Turnstile, R2 yedek); alfa ~€15–20/ay (tahmin). Açık alfadan önce ODbL (ve kişisel veri) için dış hukuki görüş | [Lider 1 Ekim] |
| K35 | Ekip (güncel) | Takım lideri + uygulayıcı ajanlar (model seçimi sahibin tercihine göre); en çok 4–5 eşzamanlı ajan; çekirdekte aynı anda tek yazar; `tipler.ts` sözleşmesi takım liderinde; ölçümler sabit commit'ten açılan ayrı git worktree'de. K12'nin yerine geçer | [Sahip 1 Ekim], [Lider 1 Ekim] |

## 3. Zaman modeli

**Dünya saati 1x; ritim günlük; tur yok.** Simülasyon sürekli zamanlıdır: olaylar arasında tüm oranlar sabittir, üretim "zaman damgası × oran" ile hesaplanır (her tıklamada değil). Teknik karşılığı [03](03-teknik-mimari.md) ve [06 §2–3](06-simulasyon-spesifikasyonu.md) içindedir.

### 3.1 Dört zaman kuralı [PDF]

1. **İlk geri bildirim saatler içinde;** hiçbir karar 72 saatten uzun sessiz kalmaz.
2. **Erken oyun hızlı, sonra yavaşlar:** ilk oturumda dakikalar, bölge büyüdükçe saat/gün.
3. **Çevrimdışı kayıp sınırı:** tek savaş penceresinde kaybedilebilecek stok oranı üst sınıra bağlıdır; önceden verilen savunma emirleri geçerlidir.
4. **Dünya hızı parametredir:** 1x, 6x, 24x denenir. Uzun vadeli ölçümler yüksek hızlı simülasyonla, insan testi 1x'te yapılır.

### 3.2 Olay süreleri [PDF]

| Olay | Süre |
|---|---|
| Üretim | Sürekli (çevrimdışıyken birikir) |
| Emir değiştirme | Anında |
| Tesis inşası | 2–12 saat |
| Bölge içi taşıma | 1–8 saat |
| Askeri üretim partisi | 6–24 saat |
| Teknoloji araştırması | 1–5 gün |
| Uzak deniz taşımacılığı | 1–3 gün |
| Savaş ilanı + hazırlık | 12–24 saat |
| Çatışma penceresi | 24 saat |
| Yeni oyuncu koruması | 7–14 gün |

Bu aralıklar PDF'deki tasarım hedefleridir. Kodda kesin değerler `packages/veri/icerik/parametreler.json` içinde tutulur ve kalibrasyonla değişebilir (savaş hazırlığı için [06 §6](06-simulasyon-spesifikasyonu.md) `ilanHazirlikSaatMin/Max` ve `pencereSaat` parametrelerini kullanır).

## 4. Katman derinlikleri

> **Güncelleme (1 Ekim, K29).** Altı katman sürer, ama "derinlik lojistikte" ilkesi kalktı: lojistik otomatik ve arka plandadır. Katmanlar artık oyuncuya **yapılar** üzerinden ulaşır (18 yapı; [11 §7.3](11-urun-donusu.md#73-yapılar-18-tür)); Devlet yasa ve bütçesi seçilmiş il hükümetinindir (K25). Aşağıdaki tablolar tarihsel kayıttır.

> **Güncelleme (30 Eylül gece, K19).** Oyun artık **altı katmandır** (Tarım, Sanayi, Lojistik, Teknoloji, Pazar, Devlet). Aşağıdaki tablo PDF'in beş katmanlı özetidir ve korunmuştur; eşleme: *Ekonomi* → Tarım + Sanayi + Pazar; *Politika* ve *Askeri* → Devlet; *Lojistik* ve *Teknoloji* değişmez. Altı katmanın mekanikleri, sayıları ve Faz B sırası [08](08-alti-katman.md) içindedir. Teknoloji düğüm sayısı PDF'in 5–8 aralığından ≈ 17'ye çıkarılması **önerilir** (katman başına 2–4 düğüm, derinlik ≤ 4; her düğüm yüzde değil yöntem açar); bu genişleme takım lideri onayına bağlıdır.

Beş katmanın hepsi **sığ ama bağlıdır; derinlik lojistiktedir.**

| Katman | Derinlik | Kural (v0) [PDF] | Spesifikasyon |
|---|---|---|---|
| Ekonomi | Orta | 4–5 üretim zinciri (cevher, çelik, makine parçası, elektronik zinciri); nüfus istihdamı sürekli üretir; bölgeler arası ticaret sınırlı derinlikli dünya pazarıyla tamamlanır | [06 §4](06-simulasyon-spesifikasyonu.md) |
| Lojistik | **Derin (ana yenilik)** | Kara/deniz/hava kapasitesi ağda paylaşılır; sivil ve askeri mal aynı ağdan geçer; "neresi açık" kapsam görünümü | [06 §5](06-simulasyon-spesifikasyonu.md) |
| Askeri | Sığ | Birlikler ekonomi zincirinden üretilir, ikmal ağından beslenir; çatışma önceden ilan edilir, 24 saatlik pencerede otomatik çözülür; kayıp üst sınırı vardır | [06 §6](06-simulasyon-spesifikasyonu.md) |
| Teknoloji | Sığ | 5–8 düğüm; her düğüm yeni yöntem/karar açar, yalnızca yüzde artışı vermez | [06 §7](06-simulasyon-spesifikasyonu.md) |
| Politika | Sığ | Anlaşma ve yaptırım pazar erişimini değiştirir; vergi ve ortak altyapı kararları açık yetki sınırları içinde | [06 §8](06-simulasyon-spesifikasyonu.md) |

> Not: 06 spesifikasyonu 12 mal ve altı zincir tanımlar (gıda, çelik, makine, elektronik, yakıt birer sivil zincir; mühimmat askeri zincir) ile altı teknoloji düğümü içerir. Teknoloji düğüm sayısı PDF'in 5–8 aralığındadır; zincir sayısı, askeri zincir sayılmazsa PDF'in 4–5 aralığının üst sınırındadır. Çelişki halinde 06 uygulama kaynağıdır.

## 5. Prototip kapsamı

> **Güncelleme (1 Ekim, K23–K34).** Hesap/giriş, çok oyunculu sunucu, gerçek harita karoları ve lisans işleri artık **kapsam içidir**: ilk hedef çevrimiçi kapalı alfa **Alfa-0**'dır (Kocaeli + Sakarya + Bursa, ≤200 davetli). Ödeme ve gelir modeli hâlâ kapsam dışıdır. Alfa-0 ve Alfa-1 kapsamı ve kapıları: [11 §6](11-urun-donusu.md#6-alfa-0-ve-alfa-1-kapsamı), [04 §9](04-yol-haritasi.md).

**Kapsam içi [PDF]:**

- Gerçek Dünya'nın **tek coğrafya dilimi (~30–60 bölge)**; beş katmanın hepsi sığ ama bağlı, derinlik lojistikte.
- Dilim seçiminde aranan: kaynak çeşitliliği, birden çok liman, en az iki dar geçit, 3–4 devlet veya blok.
- Gerçek dilim seçilene kadar **sentetik test haritası** (`packages/veri/haritalar/sentetik-50.json`, küçük doğrulama haritası `mini-6.json`).
- Arayüzsüz çekirdek simülasyon ve ölçüm koşum takımı (Aşama 2).

**Kapsam dışı [PDF]:** hesap/giriş, ödeme, çok oyunculu eşzamanlı sunucu (ilk aşamada), mobil uygulama, 3D, gerçek harita karoları ve lisans işleri.

> **Güncelleme (K17–K18).** 3D ve gerçek harita/veri hattı artık yönün parçasıdır; ancak **Aşama 2 (arayüzsüz simülasyon) önce gelir**, 3D istemci ve gerçek veri hattı simülasyon kapısından sonra uygulanır. İlk gerçek dilim Türkiye + Balkanlar + Karadeniz'dir. Lisans işleri K22 ilkesiyle yönetilir. Yukarıdaki "kapsam dışı" listesi **Aşama 2 kodunun** kapsamıdır ([04 güncellemesi](04-yol-haritasi.md)).

## 6. Hipotezler (özet)

> **Güncelleme (1 Ekim).** Hipotezler parsel dünyasına göre yeniden ifade edildi ve iki yeni hipotez eklendi: **H8** arazi yoğunlaşması (Gini ≤0,6), **H9** emir dolumu ve oy katılımı. Yeni ifadeler ve bot arketipleri: [11 §8](11-urun-donusu.md#8-ölçüm). Aşağıdaki tablo bölge kipinin (v0.3 donmuş temel çizgi) ifadeleridir.

Tam ölçüm tanımları [02 §8](02-tasarim-arge.md) içindedir. **Eşikler başlangıç önerisidir; ilk simülasyondan sonra kalibre edilir** [PDF].

| # | Hipotez | Vazgeçme ölçütü |
|---|---|---|
| H1 | Bölgeler gerçekten farklı | Aynı politika bölgelerin %70'inden fazlasında ilk üçte |
| H2 | Tekrar düşük kalır | 30. günde tekrar endeksi %60 üzeri |
| H3 | Askeri üretim ekonomiyi değiştirir | Kapasitenin %20'si askeriyeye kayınca hiçbir mal fiyatı veya kapsam %10 değişmiyorsa |
| H4 | Lojistik okunur | 5 kişilik testte en az 4 kişi "neresi açık ve neden" sorusunu 60 saniyede yanıtlayamıyorsa |
| H5 | Çevrimdışı kayıp sınırlı | 48 saat çevrimdışı oyuncunun tek pencerede stok kaybı %25 üst sınırını aşarsa |
| H6 | Geç katılan işe yarar | Yeni oyuncu 14 günde yerel ekonominin ilk yarısına ulaşma oranı %50'den azsa |
| H7 | Ayarla ve unut ne çöker ne eşitlenir | Yalnızca akış kuran oyuncunun 24/48/72. saatte üretimi, aktif oyuncuya göre %50–85 aralığı dışındaysa |

## 7. Rakip derslerinden türeyen ilkeler

Ayrıntı ve kaynaklar [01 §4](01-rakip-ve-pazar-arastirmasi.md) içindedir. Prototip kuralları [PDF]:

- Kritik kararlarda ücretli avantaj yok; günlük giriş ödülü yok (angarya algısı).
- Her bölgede farklı en iyi strateji; tekrar endeksi ölçülür (H1, H2).
- Politika düzeyinde emir; kendiliğinden çalışan lojistik ağı (mikro yönetim yok).
- Hazır savunma emirleri ve kayıp üst sınırı (çevrimdışı vurulma yok).
- Koruma süresi, puan bandı, geri dönüş/yetişme yardımı (kartopu ve eski oyuncu avantajına karşı).
- Sınırlı derinlikli, açıkça işaretli dünya pazarı (düşük nüfusta pazar çökmesine karşı).
- Sınır ve isim politikası önceden yazılı.

## 8. Açık kararlar ve öneriler

| # | Açık karar | Durum / öneri | Kaynak |
|---|---|---|---|
| A1 | **Coğrafya dilimi** | **Kısmen kapandı (K18): Türkiye + Balkanlar + Karadeniz.** Bölge listesi (30–60 bölge) ve sınırlar açık; sentetik haritayla ilerlenir. Seçim ölçütleri §5'te. Gerçek dilimde admin-1 poligonları sadeleştirilip 30–60 bölgeye birleştirmek önerilir ([03 §7](03-teknik-mimari.md)). **Güncellendi (K23+):** Alfa-0 = Kocaeli + Sakarya + Bursa; 53 bölge merkez düğüm olarak kalır (K31, K32). | [PDF], [Ar-Ge] |
| A2 | **Sınır ve isim politikası** | Açık. **Öneri:** oyuncu *gerçek bir ülkeyi değil*, gerçek coğrafyadaki bir *bölgeyi* yönetir; ittifaklar oyun içi bloklardır; güncel gerçek çatışmalar senaryo yapılmaz. Gerekçe: eRepublik'te Tayvan'ın 2010'da eklenmesi sınır hassasiyeti örneği olarak anılır (topluluk yorumu, tek kaynak). **K18 sonrası önem kazandı:** Balkan ve Karadeniz diliminde ihtilaflı bölgeler (örn. Kırım, Kosova, Kıbrıs) ve güncel çatışma bölgeleri vardır; politika dilim verisi üretilmeden önce yazılı olmalıdır (08 §6.5). **Güncellendi (K23+): kısmen kapandı (K33):** gerçek il/ilçe adları, NPC ülke çerçevesi, ihtilaflı alanlar dilim dışı; yazılı dışlama listesi açık ([11 Ü13](11-urun-donusu.md#12-açık-konular)). | [PDF] |
| A3 | **Sezon seçeneği** | Kalıcı dünya seçildi (K10). Geç katılım çözümü (koruma, puan bandı, yetişme) H6'da başarısız olursa sezonlu/raundlu model yeniden masaya gelir. Açık not olarak kalır. **Güncellendi (K23+):** H6 artık yeni oyuncu paketiyle (hibe, bedava yurt, %20 ayrılmış hücre, 14 gün kalkan) ölçülür. | [Oturum] |
| A4 | **Gelir modeli** | Prototip kapsamı dışında. İlke: kritik kararlarda parayla güç yok; kolaylık ve kozmetik satılabilir, zaman atlama ve kapasite satılmaz ([01](01-rakip-ve-pazar-arastirmasi.md)) | [PDF], [Ar-Ge] |
| A5 | **H4 vazgeçme ölçütü sıkılığı** | PDF'teki ölçüt (5 kişiden ≥4'ü yanıtlayamazsa vazgeç) gevşektir: 5 kişiden 2'si yanıtlasa bile geçilir. Daha sıkı bir geçme eşiği (ör. ≥4/5 yanıtlar) önerilir; karar takım liderine aittir ([04 §5](04-yol-haritasi.md)) | [Ar-Ge] |
| A6 | **H6 işletimsel tanımı** | "Yerel ekonominin ilk yarısı" ifadesinin ölçüm tanımı netleştirilmelidir ([02 §8](02-tasarim-arge.md)'de taslak) | [Ar-Ge] |
| A7 | **Yetişme mekanizmalarının kapsamı** | 06 v0'da yalnızca yeni oyuncu koruması vardır; inşa maliyeti indirimi, teknoloji yayılımı ve puan bandı henüz spesifikasyonda yok ([02 §7](02-tasarim-arge.md)). **Güncellendi (K23+):** yetişme paketi artık v1 tasarımının parçasıdır, koşullu değildir ([11 §7.9](11-urun-donusu.md#79-yeni-oyuncu-h6)). | [Ar-Ge] |
| A8 | **Çok oyunculu sunucu** | Ön aşamada kapsam dışı; mimari buna hazır tutulur ([03 §8](03-teknik-mimari.md)). **Güncellendi (K23+): kapandı (K23)** — paylaşılan dünya baştan. | [PDF] |

Ürün dönüşünün açık konuları (Ü1–Ü14: ODbL yayımı, Mercator alan farkı, gelişim eşikleri, kişisel veri vb.) [11 §12](11-urun-donusu.md#12-açık-konular) içindedir.

## 9. Riskler

> **Güncelleme (1 Ekim).** Ürün dönüşünün riskleri (serileştirici, düğüm patlaması, determinizm, ODbL, boş dünya, spekülasyon, mobil performans vb.) [11 §11](11-urun-donusu.md#11-riskler) içindedir; aşağıdakiler geçerliliğini korur.

| Risk | Açıklama | Azaltma |
|---|---|---|
| **R1: 20–25. gün sorunu yalnızca gözlem** | Bağımsız tutma verisi yoktur; sorun şu an yalnızca ekibin gözlemidir. Yayımlanmış bir kaynak da bulunamadı ([01 §5](01-rakip-ve-pazar-arastirmasi.md)) | Hipotez olarak ele alınır (H2); tekrar endeksi ve karar tükenmesi ölçülür |
| R2: Önceki prototip dersi | Gate 0 prototipinde bot taraması kararların ~10–15. turda tükendiğini gösterdi (tüm yatırımlar bitti, stok birikti) | Kapasiteye bağlı yinelenen lavabolar, bozulma, depo tavanı ([02 §2–3](02-tasarim-arge.md)); "karar tükenmesi" metriği |
| R3: Akış modelinin riski | Ayarla-unut eğilimi (H7) ile sürekli çevrimiçi oyuncunun avantajı | Kuyruk derinliği ve kalibrasyon; H7 eşiği |
| R4: Ekip kapasitesi | İçerik üretimi pahalı (bir Game Developer kuramına göre içerik saati başına ~8 geliştirme saati; **tahmin**) | Şablonlu, veriyle tanımlanan içerik |
| R5: Kanıt sınırı | İnsan tutma verisi ancak oynanabilir prototipte ölçülür. **Simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz** | Aşama 3 insan testleri ([04](04-yol-haritasi.md)) |
| R6: Kaynak kalitesi | Rakip araştırmasının bir kısmı tek kaynaklı topluluk yorumlarına dayanır; Capital Rift bilgisi büyük ölçüde geliştirici videolarından gelir | Kaynaklar "yön göstergesi" sayılır; doğrulanmamış bilgi açıkça işaretlenir |
