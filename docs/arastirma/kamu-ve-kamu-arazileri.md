# Araştırma: Kamu ve Kamu Arazileri

> **Konu.** Kamuyu "sıkıcı bürokrasi" olmaktan çıkarıp oyuncuya hitap eden bir **fırsat ve rekabet aracına** dönüştürmek: kamu arazileri (tür, oran, kullanım hakkı, süre sonu dönüşü), kamu politikaları (kim karar verir, oyuncu nasıl etkiler), kamunun oyuncuya sunduğu fırsatlar (ihale, sipariş, hizmet alımı, ortaklık, teşvik), bütçenin kaynağı ve **para korunumu**, oyun döngüsüne ve arayüze bağı. Sahip yönergesi (1 Ekim 2026): "Kamu ihalesini bilgisayarda ya da oyuna sunacağımız API anahtarıyla ajanlar halledecek. Kamu arazileri olabilir; kamu arazileri için politikalar gerekebilir. Kamu, oyuncuya hitap etmesi için dönüştürmemiz gereken bir araç olabilir."

**Durum.** 1 Ekim 2026'da derlendi. Ar-Ge önerisidir; kod, parametre ve başka belge değiştirilmedi. Sayıların hepsi **öneridir, kalibre edilmemiştir** ve Alfa-0/Alfa-1 ölçümüyle sınanır. **(doğrulanmadı)** birincil kaynakla teyit edilemeyen bilgiyi, **(arama özeti)** sayfa okunamadığı için yalnız arama sonucunun kullanıldığı bilgiyi gösterir. **Mevzuat bu raporda mevzuat.gov.tr tam metin PDF'lerinden okunarak doğrulandı** (4706, 2886, 5393, 3996, 4734, 4562, 3194, 3621, 4342; §6 tablosu). Mevzuat **esin kaynağıdır, kopya değildir**; oyunda hukuk danışmanlığı yoktur, yalnız tanıdık kurum hissi ve sınanmış dengeler alınır.

İlgili belgeler: [12 — Yön taslağı](../12-yon-taslagi.md) (§7–§9) · [11 — Ürün dönüşü](../11-urun-donusu.md) (§7.2 arsa, §7.6 yönetişim, §7.8 hareketsizlik, §7.11 ortak projeler) · [imza mekanikleri](imza-mekanikleri-ve-yonelimler.md) (§2.0 kamu arsası ve Kamu Kasası, İ-1 muhtarlık, İ-2 pazar günü, İ-5 imece, N4 ihale, K-1, K-2, K-5, K-8, K-9) · [canlı dünya](canli-dunya-simulasyonu.md) (§4.5 ihale, §4.6 faucet–lavabo, §6.5 haber) · [arsa ve inşa](arsa-ve-insa-derinlestirme.md) (§2.4 rıza ilkesi, §2.6 üst hakkı, §2.8 hareketsiz arsa, Z7, Z8) · [çeşitlilik: yönetim](cesitlilik-yonetim-askeri-teknoloji.md) (§3–§4) · [çeşitlilik: üretim](cesitlilik-uretim-katmanlari.md) (§5.4 OSB) · [başlangıç ve ustalık](baslangic-ve-ustalik.md) (Esnaf Defteri, sicil, Y8) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · `packages/veri/icerik/parametreler.json`, `packages/cekirdek/src/mulk/vergi.ts`.

---

## Yönetici özeti (10 madde)

1. **Kamu bir NPC firma değildir; bir kurallar ve kasalar ağıdır.** Kamu varlığı (`k:` ad alanı) arsa tutar, kasası vardır, ihale açar; ama **rakip firma, arsa sahibi NPC ya da piyasa oyuncusu olmaz**. Kamu arsası **satılmaz**; oyuncuya yalnız **süreli kullanım hakkı** verilir. Hak ≠ mülk: süre sonu dönüşü "zorla el değiştirme" değil, **baştan kabul edilmiş bir hakkın bitişidir** (§1.5).
2. **K-2'nin "%4 + mahalle başına meydan" kuralı iki ayrı amacı tek yüzdede karıştırıyor ve boyut olarak tutmuyor.** Alfa-0'da satışa çıkan hücre havuzu toplamın %1'inin altındadır (≈≤220 bin hücre; ilçe başına ≈5 bin); %4 ≈ ilçe başına ≈200 hücre eder, oysa yoğun bir ilçede yalnız "mahalle paketi" (meydan + pazar yeri + park ≈ 20 hücre × 15–25 mahalle) 300–500 hücre ister. **Öneri: iki parçalı kural** — (a) **Mahalle Paketi** (sabit, mahalle başına ≈20 hücre; oran değil kimlik garantisi), (b) **%4 hazine rezervi** (süreli tahsise açılabilen arsa: sanayi rezervi, hazine arsası) + (c) **kıyı şeridi** (2 hücre derinlik, 3621 esinli). Bileşik oran yoğun kentte ≈%8–9, seyrek yerde mutlak olarak küçüktür (§1.2).
3. **Ayrılma zamanı "dünya kurulurken" değil, "halka açılırken"dir.** Sorunsuz tek yön: **satılan arsa geri alınamaz**; ama hiç açılmamış halkada kamu işaretlemesi serbesttir. Kural: oran ve paket, bir halkanın **ilk arsası satılmadan önce** dondurulur; sonra değişmez (§1.2).
4. **Beş hak türü, tek makine:** kullanım izni (kira), kamu üst hakkı, tahsis (kamu yararı), KÖİ (yap-işlet-devret esinli), sanayi tahsisi (OSB esinli). Üst hakkı sözleşmesi ([arsa ve inşa §2.6](arsa-ve-insa-derinlestirme.md)) kamu için **aynı makine ile** çalışır; fark yalnız arsa sahibinin `k:` olması ve bedelin ihaleyle belirlenmesidir (§1.3, §1.7).
5. **İhale için tek model: tek motor + üç ağırlık profili.** Canlı dünya §4.5 ("en düşük fiyat, 3–7 gün") ile N4 ("kapalı teklif, puanlama") **çelişmez**: ilki, fiyat ağırlığı %100 olan **Profil M**'dir (mal alımı); ikincisi fiyat %70 + süre %20 + sicil %10 olan **Profil Y**'dir (yapım). Tahsis (artırma yönlü) için **Profil T**. Kapalı teklif **sunucu-mühürlüdür**; commit–reveal şifrelemesine gerek yoktur (§3.2).
6. **Karar yetkisi katmanlıdır; bu rapor ajanın kazananı seçmediği varyantı (b) varsayar (sahip sorusu Q2).** Katman 0 **NPC kural motoru** (deterministik; kazanan hesabı, fesih, itiraz yeniden hesabı), Katman 1 **yapay zekâ ajanı** (ihale/tahsis **ilanı ve takvimi önerir**, kural zarfı içinde; öneri sunucuda doğrulanır ve damgalı komut olarak günlüğe girer), Katman 2 **ilçe meclisi** ve **oyuncular** (politika kartı, dilekçe, oy, itiraz). Bu, §6.5/§8.4 "haber LLM'siz" ilkesiyle **çelişmez**: ajan *metin* değil *komut önerisi* üretir, metin şablonda kalır (§2.2).
7. **Bütçe kapalı döngüdür ve küçüktür; dürüst ölçek: kamu fırsatı Alfa-0'da gelir değil prestij ve renk kaynağıdır.** Arazi vergisi tabanı küçüktür (haftada ilçe başına ≈₺3 bin; hesap §4.3). Yeni kaynak **yalnız gerçekten yanan paradan** gelir: oyuncunun **ithalat** tarafında ödediği makas ve işlem komisyonunun bir payı (ihracat tarafındaki makas ve komisyon hiç basılmamış paradır, kasaya yazılamaz) ve hak bedelleridir. **Oyuncuya akan kamu payı ≤%50, NPC'ye akan ≥%50** (K-5); ihale ilanı **ödenek rezervi** ister (4734 m.5 esinli). NPC nüfus vergisi **Alfa-0'da kullanılmaz** (para musluğudur) (§4).
8. **Bir arbitraj açığı yakalandı:** [canlı dünya §4.5](canli-dunya-simulasyonu.md) ve [Capital Rift siparişi](capital-rift-mekanikleri.md) "referans +%5–15" öder; NPC pazarı ise **ithalatı ×1,10'dan** satar. NPC'den al, kamuya sat = risksiz kâr (para musluğu). **Kamu fiyat tavanı = ithalat paritesi (≤ ×1,10)** olmalı (§4.4).
9. **"Sıkıcı bürokrasi değil":** zarf açılışı anı, "İlçenin Müteahhidi" unvanı ve kitabe, yeni esnaf ihalesi (yeni hesaplara ayrılmış kota), kamu siparişiyle üretim zincirini kapatma (buğday → … → okul yemeği), imece ile ihalenin **tek Proje Kartı**nda birleşmesi, harita üzerinde **Kamu katmanı** ve tek ekranlık **Sözleşme Kartı** (§5).
10. **Alfa-0 hafif sürüm (NPC kural motorlu):** kamu arsası (veri + görünüm + `parsel_al` reddi), sabit fiyatlı **kamu siparişi** panosu (mahalle kasası ilanı Muhtar'dan, ilçe kasası ilanı İlçe Başkanlığı'ndan; yöneticisiz hâli NPC Kaymakam), Kamu Kasası (açık defter), `NpcAlici{tur:"kamu"}` bütçesi; **hak, ihale ve ajan yok**, yalnız şema alanları ve günlük `kaynak` alanı ayrılır. Alfa-1: Profil M ihale, kısa kira, ajan A/B, meclis kartları, dilekçe/itiraz, Proje Kartı. Sonrası: üst hakkı, Profil Y/T, KÖİ, oyuncu ajanı (§7). **Geri dönüşü zor 12 karar** §9'dadır; en acili **kamu arsası oranı ve halka-dondurma kuralı** (F4 hazır arsa üretiminden önce).

---

## 0. Çerçeve

### 0.1 Bugünkü durum (okunan kaynaklar)

| Konu | Mevcut | Kaynak |
|---|---|---|
| Kamu arsası | **Çekirdekte ve sunucuda yok.** Kamulaştırma da yok; kamu arsası ancak dünya kurulurken ayrılırsa ya da bağışla gelir ([imza §0 T4](imza-mekanikleri-ve-yonelimler.md)). **F4'te yalnız istemcide geçici bir türetme var:** `packages/istemci/src/harita/arsa.ts` (`KamuAyari`, `KAMU_VARSAYILAN = {acik: true, oran: 0.04, enAzArsa: 6, mahalle: 48}`; `?kamu=0` kapatır, `?kamu-oran=` oranı değiştirir). Sunucu ve çekirdek bunu **bilmez**: doğrudan `parsel_al` ile kamu hücresi satın alınabilir | kod okundu |
| K-2 | Ada üretiminde ilçe uygun hücrelerinin **%4**'ü `kamu` sınıfı ve `k:`-sahipli; her mahallede ≥1 meydan (4–6 hücre) ve ≥1 pazar yeri (6–8 hücre); ≤72 hücre ve ≤%25 sınırlarına sayılmaz | [imza §5.2](imza-mekanikleri-ve-yonelimler.md) |
| K-1 | Ad alanlı `VarlikId` (`o:`, `k:`, `d:`, `v:`, `n:`) + `adina` | aynı |
| Kamu Kasası | Mahalle / İlçe / İl: açık defter; kaynak: arazi vergisi payı (%20 / %40 / %15, **%25 yanar**), tezgâh ücreti, bağış, fuar harcı | [imza §2.0](imza-mekanikleri-ve-yonelimler.md) |
| İhale (A) | İlçe ihalesi, **en düşük fiyat**, ilan 3–7 gün, teslim vadesi 3–10 gün, fiyat tavanı **referans +%15**, hesap başına ≤2 açık teklif, ödeme teslimde | [canlı dünya §4.5](canli-dunya-simulasyonu.md) |
| İhale (B) | N4: **kapalı teklif** (commit–reveal), geçici teminat %3, kesin %6, puan = fiyat %70 + süre %20 + portföy %10, aşırı düşük sorgusu (<%75), kendi ihalesine giremez; v1.5 / L | [imza §3 N4](imza-mekanikleri-ve-yonelimler.md) |
| Para | Para yalnız hibeyle ve NPC piyasa yapıcıyla girer (ihracat ×0,9, ithalat ×1,1); `NpcAlici` kaydı; kamu harcamasının ≥%50'si NPC'ye | K-5 |
| Arazi vergisi | `araziVergisiHaftalikPpm = 10000` (%1/hafta), yalnız **arazi alış değeri** üzerinden, tembel; hücre fiyatı 1.000 / 2.500 / 6.500 ₺ | `mulk/vergi.ts`, `parametreler.json` |
| Hareketsizlik | 14 gün uyku → 45 gün çürüme → 90 gün Hollanda usulü açık artırma; gelir borç düşüldükten sonra eski sahibe **alacak** | [11 §7.8](../11-urun-donusu.md) |
| Üst hakkı | Alfa-1 sonu / v1.5; süre 14/28/56 gün; kiracı hücreleri **tavana sayılır** (Z8) | [arsa ve inşa §2.6](arsa-ve-insa-derinlestirme.md) |
| Rıza ilkesi | Arsanın türü/yapısı sahibinin başvurusu olmadan değişmez (Z7) | [arsa ve inşa §2.4](arsa-ve-insa-derinlestirme.md) |
| Kamu için LLM | "Haber LLM'siz, şablon + olgu defteri; LLM yalnız çevrimdışı" (§6.5, §8.4) **ile** sahibin yeni yönergesi (çalışma zamanında ajan) çatışıyor | [12 §8](../12-yon-taslagi.md) |

### 0.2 Bu raporun tespit ettiği tutarsızlıklar ve düzeltmeler

| # | Tutarsızlık | Düzeltme | Bölüm |
|---|---|---|---|
| T1 | K-2 "%4" hem kalıcı kamu alanını (meydan, pazar) hem de "fırsat" arsasını tek yüzdede topluyor; pay tabanı "açılan hücreler"dir ve meydan şartı mahalle sayısına bağlıdır, oran sabittir | İki parçalı kural: Mahalle Paketi (sabit) + %4 hazine rezervi + kıyı şeridi | §1.2 |
| T2 | §4.5 "en düşük fiyat" ile N4 "puanlama" iki ayrı model gibi duruyor | Tek motor, üç profil | §3.2 |
| T3 | §4.5 fiyat tavanı **ref +%15** > NPC ithalat fiyatı **ref ×1,10**: risksiz arbitraj | Tavan = ithalat paritesi | §4.4 |
| T4 | 11 §7.6 "il nüfus vergisi il hazinesine gider", ama [08](../08-alti-katman.md) "nüfus tüketimi yalnız lavabo, gelir üretmez" → nüfus vergisi **para musluğu** | Alfa-0'da kullanılmaz; gerekirse `NpcKaynak` + haftalık tavan | §4.1 |
| T5 | `ekYapilar.muhtarlik` oyuncunun kendi arsasına kurulan yapı (il başına 1, ₺8.000); mahalle tasarımında Muhtarlık kamu **meydanında** | Meydan kuralı: Muhtarlık meydandaki kamu yapısıdır; bugünkü `muhtarlik` ek yapısı yer tutucudur, F6'da kamu yapısına dönüşür (§10 açık soru) | §10 |
| T6 | N4 "kapalı teklif = commit–reveal" sunucu otoritesinde gereksiz karmaşıklık | Sunucu-mühürlü teklif; günlükte var, istemciye kapanışa kadar gitmez | §3.2 |
| T7 | "Kamu için LLM" çelişkisi | Ajan komut önerir; metin şablonda kalır | §2.2 |
| T8 | **İstemci geçici türetmesi ≠ K-3 ve Mahalle Paketi.** (i) İstemcide "mahalle" = bileşen ∩ **48×48 hücrelik mutlak blok** (≈1,4 km kenar; yapay, konuma bağlı); K-3'te mahalle kalıcı iç kimlikli, OSM `admin_level=8` ya da yol ağı kümelemeli, dünya kurulurken dondurulmuş birimdir. (ii) Oran **mahalledeki arsa sayısının %4'ü** (arsa düzeyi; ≥6 arsalı mahallede en az 1); bu raporda Mahalle Paketi **sabit 20 hücre**dir. (iii) Mahalle başına ilk arsa (ağırlık merkezine en yakın) "meydan"dır, **tür ayrımı yok** (pazar, park, hizmet, kıyı, hazine rezervi yok). (iv) Yalnız görsel ve istemcidedir; sunucu doğrulamaz | Veri hattı ve çekirdek kamu arsası üretimini devralır; istemci türetmesi kalkar ve yalnız okur | §1.2, §7.1 |

---

## 1. Kamu arazileri

### 1.1 Türler

Kamu arsası **hücre düzeyinde** bir sınıftır (`HucreDurumu.sinif = "kamu"`, `kamuTur`, sahip `k:…`). Kenar tabanlı altyapı (yol, hat, köprü) hücre değil **ortak proje** kalır ([11 §7.11](../11-urun-donusu.md)).

| # | Tür | Boyut (öneri) | Satılır? | Kullanım | Gelir (kasa) | Gerçek esin |
|---|---|---|---|---|---|---|
| 1 | **Meydan** | 4–6 hücre / mahalle | Hayır, hak da verilmez | Muhtarlık, çay ocağı (kamu işletir, İ-4), ilan/ihale panosu | — | Mahalle meydanı; imar planında "genel hizmet alanı" |
| 2 | **Pazar yeri** | 6–8 hücre / mahalle; yuva 4/8/16 (ilçe seviyesine göre) | Hayır | Haftalık tezgâh **kullanım izni** (kura, İ-2) | Tezgâh ücreti → **Mahalle Kasası** | Semt pazarı |
| 3 | **Park / yeşil alan** | 8–12 hücre / mahalle | Hayır | Yapı yok; komşu adalara "yeşil komşu" etkisi (hassas yapı çarpanı, kirlilik tamponu; değer [arsa ve inşa §3.4](arsa-ve-insa-derinlestirme.md) ile kalibre edilir) | — | Park/yeşil alan; Cities: Skylines'ta parklar arsa değerini artırır |
| 4 | **Hizmet arsası** | 2–4 hücre/slot (okul, sağlık ocağı, çeşme, han) | Hayır | Yapıyı **imece** ya da **ihale** kurar; han KÖİ adayıdır | Han/hal tarifesi (KÖİ) | Okul, sağlık, hayrat (vakıf) |
| 5 | **Kıyı şeridi** | Kıyı kenar çizgisinden **2 hücre derinlik** (≈58 m ≥ 50 m) | Hayır | Yapı yok; iskele/balıkçı barınağı için **kıyı kullanım izni** (kısa kira, ihale) | İzin bedeli → İlçe Kasası | 3621 m.5–6: kıyı herkesin eşit ve serbest yararlanmasına açık; sahil şeridinde yapı kıyı kenar çizgisine ≤50 m yaklaşabilir; kıyıda yapı yapılamaz |
| 6 | **Sanayi rezervi** | İlçede (Kasaba+) 1 ada (4–12 hücre) | Hayır | **Sanayi tahsisi** (OSB esinli): Sanayi Adası bonusları hak sahiplerine ([üretim §5.4](cesitlilik-uretim-katmanlari.md)) | Tahsis bedeli, aidat %0,2/hafta | 4562 m.18: OSB'de parsel *tahsisi*, tahsis amacı dışında kullanılamaz |
| 7 | **Hazine arsası** | Kalan boş kamu hücreleri (tarla/arsa) | Hayır (bkz. §9 KK-2) | Kira, üst hakkı; **yeni oyuncu önceliği** | Hak bedelleri → İlçe Kasası | Hazine taşınmazı (2886 m.64 kira; 4706 satış odaklı) |

Beş ayrım önemlidir: (1) **meydan, pazar, park, hizmet ve kıyı kalıcı kamu kullanımıdır**, hak verilmez ya da yalnız kısa izinle; (2) **sanayi rezervi ve hazine arsası fırsat arsasıdır**, süreli hak alır; (3) mera/orman gibi bugünkü arazi sınıfları kamu türü **değildir** (4342 m.14: mera "tahsis amacı değiştirilmedikçe" başka kullanıma açılamaz; oyunda mera zaten Orman sınıfı hücreler arasındadır ve satışa halka dışında açılmaz); (4) kamu arsası ≤72 hücre/≤%25 sınırlarına **sayılmaz** ama oyuncunun **kamu hakkı** hücreleri sayılır (§9 KK-11); (5) kamu arsası arsa-ve-insa'daki "satın alınamaz hücre" listesine eklenir (11 §7.2).

### 1.2 Oran: K-2 yeterli mi?

**Soru.** "%4 + mahalle başına meydan" yeterli mi?

**Hesap (varsayımlar işaretli).**

| Girdi | Değer | Kaynak |
|---|---|---|
| Alfa-0 toplam hücre | ≈20–25 M | [arsa ve inşa §0](arsa-ve-insa-derinlestirme.md) |
| Satışa açılan hazır arsa | **<%1** ≈ ≤220 bin hücre | aynı; halka açılışı |
| Alfa-0 ilçe sayısı | 45 | canlı dünya |
| İlçe başına açılan hücre | ≈≤4.900 (ortalama) | hesap |
| %4 kamu | ≈≤196 hücre/ilçe | hesap |
| Mahalle sayısı | ≈33/ilçe (32.254 resmî mahalle / 973 ilçe; **hesap**, Gebze için doğrulanmadı) | [imza §1.7](imza-mekanikleri-ve-yonelimler.md) |
| İlk halkada açılan mahalle | seyrek ilçede 5–10; yoğun merkezde 15–25 (**tahmin**) | — |
| Gebze satın alınabilir / kentsel hücre | 485.856 / 18.890 | [karo denemesi §3.2](karo-ve-izgara-denemesi.md) |

| Mahalle Paketi (meydan 5 + pazar 7 + park 8 = 20 hücre) × açılan mahalle | Toplam | %4 (≈196) ile karşılaştırma |
|---|---|---|
| Seyrek ilçe, 5–10 mahalle | 100–200 | sığar |
| Yoğun merkez ilçe, 15–25 mahalle | 300–500 | **%4'ü aşar (1,5–2,5×)** |
| Yalnız meydan + pazar (12 hücre) × 15–25 | 180–300 | yine sınırda |

**Değerlendirme.**
1. **Tek yüzde yanlış birimdir:** meydan/pazar/park mahalle başına *sabit* bir ihtiyaçtır; yüzde ise ilçenin açtığı hücre sayısına bağlıdır. Sığ ilçede fazla, yoğun ilçede eksik ayırır.
2. **Fırsat arsası ayrı bir ihtiyaçtır:** K-2'nin %4'ü kalıcı kamu alanına yetse bile, sanayi rezervi ve hazine arsası (süreli tahsis edilecek arsa) için yer kalmaz; kamu "fırsat aracı" olamaz.
3. **Asimetri doğrudur:** "az ayrılan sonradan geri alınamaz, fazla ayrılan rezerv sonra satışa açılabilir" ([K-2](imza-mekanikleri-ve-yonelimler.md)). Hata yönü fazla ayırmaktır; ama **kalıcı kamu çekirdeği hiç satılmaz**, yalnız hazine rezervi bir valfe sahip olabilir (§9 KK-2).

**Öneri (iki parçalı + kıyı).**

| Parça | Kural | Neden |
|---|---|---|
| **A. Mahalle Paketi** | Her mahallenin **ilk adası açılmadan önce** 20 hücre ayrılır: meydan 5 + pazar yeri 7 + park 8. Konum: dondurulmuş haritada mahalle merkezine en yakın adalar (K-3); OSM `amenity=marketplace`, `place=square`, `leisure=park` tohumdur. Hücre sayısı mahalle başına **sabit**, oran değil | Kimlik garantisi: her mahallenin meydanı ve pazarı vardır |
| **B. Hazine rezervi** | İlçenin açtığı hücrelerin **%4'ü**: sanayi rezervi (Kasaba+ ilçede 1 ada, kalan %0–3) + hazine arsası. Ada bütünlüğü korunur (hücre değil ada ayrılır) | Fırsat arsası; ihale ve tahsis için hammadde |
| **C. İlçe merkezi alanı** | İlçe başına 8–12 hücre: İlçe Başkanlığı, ilçe pazarı genişleme alanı | İlçe düzeyinin kimliği (İ-1) |
| **D. Kıyı şeridi** | Kıyı ilçesinde kıyı kenar çizgisinden 2 hücre derinlik; satılmaz | 3621 esinli; kıyının özel mülk olmaması |
| **Toplam (tahmin)** | Yoğun kentsel ilçe ≈%8–9; seyrek ilçe mutlak olarak küçük (paket ≈100–200 hücre) | K-2'nin 2 katı, ama amaçlara ayrışmış |

**Ayrılma zamanı ve dondurma kuralı (en kritik bulgu).**
- K-2 "dünya kurulurken" der. Daha incesi: **geri dönüşü zor olan, bir arsanın satılmasıdır**; hiç açılmamış halkada kamu işaretlemesi serbesttir.
- **Kural:** her halkada oran ve paket **o halkanın ilk arsası satılmadan** dondurulur; sonra *artırılamaz ve azaltılamaz* (artırmak satılmış arsayı geri almak olur; azaltmak serbest bırakma = satış kapısıdır, §9 KK-2).
- Dondurulmuş harita (K-3) bütün ilçelerin **Mahalle Paketi** ve kıyı şeridi işaretlerini **önceden** taşır (Türkiye çapında 32 bin mahalle × 20 hücre ≈ 650 bin hücre = 0,07% tahmini); halka açılışı yalnız bunları "ortaya çıkarır".
- **Ek karar (F4 hazır arsa üretimiyle birlikte):** `parsel_al` komutu `kamu` sınıfı hücrede `ret` döner; hazır arsa üreticisi paket hücrelerini ada bölmeden **önce** çıkarır (yoksa arsa karması %20 ayrılmış-hücre ve ada kimlikleriyle çakışır).

### 1.3 Nasıl kullanılır: satılmaz, süreli hak verilir

Kamu arsası **hiçbir koşulda oyuncunun mülkü olmaz**. Hak sahibi hücrenin **mülkiyetini değil kullanım hakkını** (ve kendi kurduğu yapının mülkiyetini) edinir.

| Hak türü | Süre (öneri) | Yapı | Bedel | Dönüş (ilanda tek tür) | Esin |
|---|---|---|---|---|---|
| **Kullanım izni (kira)** | 7–28 gün; yenileme yok, yeni kura/ihale | Geçici (tezgâh, açık depo, tarla); kalıcı yapı yok | Günlük/haftalık; kura ya da artırma | Hak biter; geçici donanım 3 gün içinde çıkarılır | 2886 m.64: kira ≤10 yıl; >3 yıl üst izin; kira bedeli her yıl yeniden tespit |
| **Kamu üst hakkı** | 28 / 56 / 112 gün | Hak sahibi **kendi işletme düğümünde** yapı kurar; ÜHS makinesi ([arsa ve inşa §2.6](arsa-ve-insa-derinlestirme.md)) | Taban + ihale bedeli; **vergi yok** (arsa kamudur); bakım hak sahibine | D1 söküm (varsayılan) ya da D3 tazminatlı devir | TMK 826 üst hakkı; 5393 m.18(e): sınırlı aynî hak ≤30 yıl, meclis kararı |
| **Tahsis (kamu yararı)** | 56–112 gün; **yeniden tahsis mümkün** | Oda, kooperatif, vakıf, dernek (`d:`/`v:`) ya da imece; kamu hizmeti yapısı | Bedelsiz ya da indirimli; **amaç dışı kullanımda iptal** | Yükümlülük bitişi; D2 bedelsiz devir | 5393 m.75(d): ≤25 yıl tahsis, amaç dışında kullanımda iptal, süre sonunda yeniden tahsis; 4562 m.18 |
| **KÖİ (yap–işlet–devret)** | 56–168 gün (§1.4) | Operatör finanse eder, kurar, işletir; tarife tavanlı | Kamuya hak bedeli + hasılat payı | **D2 bedelsiz devir**, bakımlı ve çalışır | 3996 m.7, m.9 |
| **Sanayi tahsisi (OSB esinli)** | 56–168 gün | Yatırım taahhüdü: ≤14–28 gün içinde üretime geçme | Tahsis bedeli (ihale) + aidat | Taahhüt ihlalinde **yargısız fesih**; yapı ≥%50 tamamsa tazminat | 4562 m.18, Ek m.3 |

**Tahsis yolları.** (a) **Kura** (düşük değer, çok başvuru: pazar tezgâhı, hazine tarlası yeni oyuncu) — hesap yaşı ≥14 gün, hesap başına 1 başvuru, yeni hesaplara ayrılmış %20 yuva ([imza İ-2](imza-mekanikleri-ve-yonelimler.md)); (b) **İhale** (artırma ya da puanlı; §3.2); (c) **doğrudan tahsis** yalnız kamu yararı (imece, vakıf, oda): kural motoru onayı + A1'de ilçe meclisi kararı; **kimseye "adam kayırma" tahsisi yoktur**.

**Hak ticaretini engelleyen kurallar** (spekülasyon ve tavan delme): hak **devredilemez** (yalnız §1.6'daki açık artırma ve tek yönlü devir kuralı); devirde alıcı **ilk ihale şartlarını** sağlamalı (2886 m.66 esinli: devir ancak idare izniyle, ilk ihaledeki şartlar aranır; izinsiz devir sözleşmeyi bozar); hesap başına en çok **2 aktif kamu hakkı**; hak hücreleri **sahiplik tavanına sayılır** (Z8 ile tutarlı; KK-11); aynı arsa için hak sona erdikten sonra **7 gün** yeniden ihale yok (anti-flip).

### 1.4 Kamu–özel ortaklığı (KÖİ, yap–işlet–devret esinli)

**Gerçek.** 3996 sayılı Kanun: kamu idaresinin ifa ettiği, ileri teknoloji veya yüksek maddi kaynak gerektiren yatırım ve hizmetlerin yap–işlet–devret modeliyle yaptırılması (m.1). Kapsam: köprü, tünel, baraj, sulama, arıtma, kongre merkezi, **silo ve depo tesisleri, toptancı halleri**, otoyol, demiryolu, limanlar vb. (m.2). **Sözleşme özel hukuk hükümlerine tabidir** (m.5). **Süre 49 yılı geçemez** ve yatırım bedeli ile geri ödeme süresi gözetilerek belirlenir (m.7). **Sözleşme bitince yatırım bedelsiz, borçsuz, bakımlı ve çalışır durumda idareye geçer** (m.9) ([mevzuat.gov.tr/3996](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3996.pdf)).

**Oyun karşılığı.** Kamu bir hizmet **ihtiyacını** ilan eder (il toptancı hali, soğuk depo, pazar çatısı, han, rıhtım genişletmesi); kamu arsasını **hak** olarak verir; operatör sermaye ve yapıyı sağlar, **tarife tavanı** içinde kullanıcılardan ücret alır; süre sonunda yapı kamuya **bedelsiz** geçer.

| Konu | Kural (öneri) |
|---|---|
| Süre | `süre ≥ 1,3 × yatırımın tahmini geri dönüş süresi`; üst sınır 168 gün; ilanda "tahmini geri dönüş" gösterilir (3996 m.7: süre yatırım bedeli ve geri ödemeye göre) |
| Tarife | Kamu tavan koyar (ör. hal komisyonu ≤%6; depo ücreti ≤ ref × 1,1); tavan aşılamaz |
| Kamuya pay | Hak bedeli (ihale) + **hasılat payı %5** (4706 Ek m.2: irtifak/kullanma izni bedeline ek olarak hasılatın %1'i; oyunda %5 öneri) |
| Kamu garantisi | **Talep garantisi yok** (risk operatördedir); kamu "kullanım kuralı" verir (ör. il halinde zorunlu komisyoncu kaydı) |
| Dönüş | D2 bedelsiz devir + son 14 günde **bakım denetimi** (aşınma <%20; aksi hâlde fark teminattan kesilir) |
| Boyut | v1.5'te ≤12 hücre; daha büyüğü ortaklık (`d:`) ister (N2 kooperatif) |
| Neden "zorla el değiştirme" değil | Bedelsiz devir **ihale ilanında yazılıdır** ve süre bunu karşılayacak biçimde uzundur (§1.5) |

Örnekler: **İl Toptancı Hali** ([N3 hal ve komisyoncu](imza-mekanikleri-ve-yonelimler.md) ile aynı yapı; operatör komisyonculuk altyapısını kurar), **soğuk depo** (bozulan mallar), **pazar çatısı** (imece alternatifi), **liman rıhtım genişletmesi** (il ortak projesi; operatör rıhtım ücreti toplar).

### 1.5 Süre sonu dönüşü: "zorla el değiştirme" sayılmaması için sözleşme tasarımı

**İlke.** "Parsel asla zorla el değiştirmez" ilkesi **mülkiyet** içindir. Kamu arsasının mülkiyeti baştan beri kamudadır; hak sahibine geçen şey süreli bir haktır. Dönüş **hakkın bitişi**dir; yalnız kuralların *baştan, sürpriz olmadan ve değişmeden* uygulanması bunu güvenilir kılar.

**Yedi sözleşme kuralı.**

1. **Hak ≠ mülk, her yerde aynı dil.** Arayüz "Kiralık/Süreli hak" der, "Satın al" demez. Hücre kartında "Arsa kamunundur; hakkın 28 Ekim 14:20'de biter."
2. **Sözleşme Kartı (tek ekran).** Süre (mutlak bitiş saati), hak türü, **dönüş türü**, tazminat formülü, fesih nedenleri (kapalı liste), teminat, yenileme koşulu. Teklif/başvuru ekranından önce görünür; "modal yok" ilkesine uygun, tek aktif kart.
3. **Rıza komutu = teklif.** `ihale_teklif {ihale, fiyat, …, sozlesmeSurumu, kabul}` komutu, sözleşme şablonunun **sürüm özetini** günlüğe yazar. Kabul edilmemiş şartlar uygulanmaz; sunucu tarafından damgalı ve yeniden oynatılabilir.
4. **Dondurma (grandfathering).** Sözleşme şartları imza anında **dondurulur**. Kural dönemi değişse de ([11 §10](../11-urun-donusu.md)) yürürlükteki sözleşme eski şartlarda biter; yeni şablon yalnız **yeni ilanlara** uygulanır. (Z8: "kurallar sonradan değişirse mevcut sözleşmeler çelişir" riskini çözer.)
5. **Kapalı fesih listesi.** Kamu hakkı yalnız şunlarla erken biter: (i) bedel **temerrüdü** (hazine 0'da 7 gün; [arsa ve inşa §2.6](arsa-ve-insa-derinlestirme.md) ile aynı), (ii) **amaç dışı kullanım** (5393 m.75(d) esinli), (iii) **taahhüt ihlali** (üretime geçmeme / yatırım gecikmesi; 4562 Ek m.3 esinli), (iv) **90 gün hareketsizlik** (§1.6), (v) hak sahibinin **feragati**. **"Kamu ihtiyacı" feshi yoktur** — kamulaştırma gibi bir araç oyunda olmadığı için kamu, hak sahibini kamu yararı gerekçesiyle çıkaramaz.
6. **Öngörülebilir dönüş takvimi.** T−14 hatırlatma (Dikkat paneli + e-posta); T−7 **yenileme penceresi**: mevcut hak sahibine ihalede **öncelik puanı +%5** (eşleştirme hakkı yok: ihaleyi çökertir); T bitiş; **T+3 gün boşaltma süresi**: yapı içindeki stok otomatik olarak sahibin en yakın Ambar'ına taşınır (1 kez bedelsiz).
7. **Dönüş türü ilanda tek ve açık.**

| Dönüş | Ne olur | Kim öder | Ne zaman kullanılır |
|---|---|---|---|
| **D1 Söküm** (varsayılan) | Hak sahibi T+3 içinde yapıyı söker; malzeme geri kazanımı ([arsa ve inşa §3.6](arsa-ve-insa-derinlestirme.md), inşa iptali %50 iade kuralıyla uyumlu) | Kimse (kamu riski sıfır) | Kira, üst hakkı |
| **D2 Bedelsiz devir** | Yapı kamu yapısı olarak kalır; son 14 gün bakım denetimi | Kimse; süre yatırımı karşılayacak kadar uzundur | KÖİ, tahsisli kamu yapıları |
| **D3 Tazminatlı devir** | Yapı kamuya `rayiç × %60` ile geçer ([arsa ve inşa ÜHS dönem sonu](arsa-ve-insa-derinlestirme.md) ile aynı oran) | Kamu kasası; **ödenek rezervi ilan anında bloke** | Kamu için kritik yapı (ör. okul) |

**Neden bu tasarım "zorla" değildir.** (a) Mülkiyet hiç geçmedi; (b) dönüş koşulu **teklifle birlikte kabul edildi** ve günlükte; (c) şartlar sözleşme boyunca **değişmez**; (d) bitiş saati mutlak ve gösterilir; (e) erken fesih nedenleri **kapalı ve hak sahibinin kendi eylemine bağlıdır**; (f) yapı için söküm veya tazminat hakkı vardır; (g) **ödenek rezervi** olmadan tazminatlı sözleşme ilan edilemez. Aynı tasarım gerçekte de yürür: 3996 m.9 bedelsiz devir yatırım süresine bağlı olarak kabul edilir; 4562 Ek m.3 bedelsiz tahsiste süreli yatırım koşulu aranır ve yerine getirilmeyen tahsis iptal olur.

### 1.6 Hareketsizlik (docs/11 §7.8) ile etkileşim

[11 §7.8](../11-urun-donusu.md): 14 gün uyku, 45 gün çürüme (%2/gün), 90 gün azalan fiyatlı açık artırma (Hollanda usulü); gelir borç düşüldükten sonra eski sahibe alacak; tatil modu yılda ≤30 gün. Bu merdiven **oyuncunun mülk parselleri** içindir ve "zorla el değiştirmenin tek istisnasıdır". Kamu hakkı için **yeni bir istisna açılmaz**; aynı merdiven, **hak + yapı** üzerinde çalışır.

| Aşama | Mülk parsel (11 §7.8) | Kamu hakkı (bu rapor) |
|---|---|---|
| Kamu arsasının kendisi | — | **Hareketsizlik yoktur ve asla açık artırılmaz** (`k:` varlığı) |
| 14 gün uyku | Üretim durur, vergi donar | **Süre akar**, bedel **donar**, taahhüt kontrolü **askıya** alınır |
| 45 gün | Yapı çürümesi %2/gün | Aynı; kamu arsasındaki yapı da çürür; **uyarı** gönderilir (60. gün son uyarı) |
| 90 gün | Arsa + yapı açık artırma | **Hak + yapı** (kalan süre için) açık artırmaya çıkar; başlangıç `1,2 × yapı değeri` (aşınma düşülmüş; arsa değeri yok), günde %5 düşer, taban `0,5 ×`; alıcı **ilk ihale şartlarını** sağlamalı (2886 m.66 esinli); **geri alma hakkı** arsa-ve-insa §2.8 ile aynı |
| Teklif gelmezse | Taban fiyata iner | Hak biter; kamu yapıyı **D1 söküm** ile temizler (malzeme değeri hak sahibine alacak) |
| Gelir | Borç düşülür, kalan eski sahibe alacak | Aynı; kamu kasası yalnız borç kalemini alır |
| Tatil modu | Açık artırmayı durdurur | Bedel ve taahhüt askıda, **süre akar**; tatilde **yeni hak başvurusu/ihale teklifi verilemez**; teslim vadeleri akar |

**Tavan delme koruması.** Hak hücreleri tavana sayıldığı için "hareketsiz görünmeden bloke etme" yolu şudur: aktif ama üretmeyen hak sahibi. Karşılık: **kullanım şartı** (her 28 günde yapının `sonEtkinlik` çıktısı ≥ eşik); aksi hâlde taahhüt ihlali feshi (§1.5 madde 5).

### 1.7 Şema ve kimlik

| Alan | Öneri | Neden |
|---|---|---|
| Sahip | `k:mahalle:{id}` (meydan, pazar, park), `k:ilce:{id}` (hazine rezervi, ilçe merkezi, kıyı, sanayi rezervi) | K-1; gelir kasası sahiple eşleşir (geri dönüşü zor, §9 KK-3) |
| `HucreDurumu.sinif` | `"kamu"` + `kamuTur: "meydan"\|"pazar"\|"park"\|"hizmet"\|"kiyi"\|"sanayi_rezervi"\|"hazine"` | K-2; tür kodları veridir |
| `HucreDurumu.hak?` | `{sahip: OyuncuId, tur, bitis, sozlesmeSurumu, donusTuru}` — ÜHS'nin `kiraci?/kiraBitis?` alanları **bununla birleştirilir**: tek makine, hem özel arsa hem kamu arsası | Alanlar boşsa özet değişmez (şema geri dönülebilir); kurallar zordur |
| Komut aileleri (K-9) | `ihale_ilan`, `ihale_teklif`, `ihale_itiraz`, `hak_basvur`, `hak_birak`, `dilekce_ver`; olaylar `ihale_kapanis`, `hak_hatirlatma`, `hak_bitis` | Mekanik başına PRNG akışı `kamu` |
| Günlük alanı | `kaynak: "kural"\|"ajan"`, `ajanSurumu`, `istemOzeti` | §2.2; yeniden oynatma deterministiktir |

---

## 2. Kamu politikaları: kim karar verir

### 2.1 Üç katman

| Karar | Alfa-0 | Alfa-1 | Neden bu katman |
|---|---|---|---|
| Kamu arsasının **konumu, türü, oranı** | Veri hattı (dondurulmuş harita; kural dönemi) | Aynı | Oyuncu etkisi **yok**: anayasal çerçeve |
| İhale/tahsis **kataloğu ve takvimi** (ne, ne zaman, hangi kasadan) | **NPC kural motoru** | Kural motoru + **ajan önerisi** | Çeşitlilik ve bağlam uyumu; ajan *önerir* |
| Tahsis **bedeli ve süresi** (taban, ağırlık profili) | Kural motoru varsayılanları | **İlçe meclisi** politika kartı (bant içi) | Rıza ilkesi (Z7): meclis yalnız **yeni** ilanlar için kural koyar |
| İhale **kazananı** | **Kural motoru** (puan formülü) | Aynı | Deterministik, izlenebilir, kayırmasız; **ajan seçmez** |
| Sözleşme **uygulaması** (gecikme cezası, teminat müsaderesi, fesih) | Kural motoru | Aynı | Yeniden oynatılabilirlik |
| **İtiraz** | — | Kural motoru yeniden hesaplar | İnsan/LLM yargısı yok |
| **Katılma yasağı** | — | Kural motoru + NPC Kaymakam teftiş raporu | 4734 m.58 esinli |
| **Öncelik** (hangi proje önce) | NPC | **Meclis oyu + dilekçe → ajanın girdisi** | Oyuncu etkisi buradan girer |

**NPC kural motoru** = deterministik tetikleyici tablosu: ilçe ihtiyaç vektörü (K1/K2 karşılanma), takvim olayları ([canlı dünya E1–E12](canli-dunya-simulasyonu.md)), kasa bakiyesi, açık ilan sayısı (≤3), PRNG akışı `kamu`. Örnek tetikleyiciler: `gida karşılanma <%80 (7 gün)` → gıda siparişi; `Eki–Kas` → kış yakıtı; `okul açılışı −14 gün` → kırtasiye/giyim siparişi; `pazar çatısı vaadi + kasa ≥ eşik` → imece/ihale Proje Kartı.

### 2.2 Yapay zekâ ajanı

> **Bölüşüm notu.** Ajan **mimarisi, komut biçimi ve maliyeti** için esas rapor [yapay-zeka-kamu-ajanlari.md](yapay-zeka-kamu-ajanlari.md)'dir (Karar Köprüsü, gündem ve zaman aşımı yedeği, doğrulayıcı, maliyet §5, anahtar modelleri §5.6). O rapor kamu arazisi **kuralları** için bu raporu esas alır. Bu bölüm yalnız kamu arazisi ve ihale açısından ajanın yetki **zarfını** özetler. İki fark açıkça kayıtlıdır ve kodlamadan önce o rapora hizalanır:
> - **(a) Gerekçe.** O raporda ajan kimliksiz, ≤280 karakterlik bir **gerekçe notu** yazar ("kamu belgesi", yan tabloda saklanır, `gerekceRef`). Bu raporda ajan yalnız **gerekçe kodu** seçer, metin şablondadır. Hizalama önerisi: o raporun notu esas; kod, notun yapılandırılmış yanı olarak kalır.
> - **(b) Komut.** O raporda komut `kamu_karar` (v1, `kaynak`, `model`, `istemSurumu`, `girdiOzeti`) ve çekirdekte **gündem + zaman aşımı yedeği** vardır. Bu raporda `ihale_ilan` + `kaynak` alanı vardır. Hizalama önerisi: `kamu_karar` esas; `ihale_ilan` onun altındaki karar türüdür.

**Çelişki ve çözüm.** [Canlı dünya §6.5](canli-dunya-simulasyonu.md) ve [çeşitlilik §8.4](cesitlilik-yonetim-askeri-teknoloji.md): "haber LLM'siz; olgu defteri + şablon". Sahip yönergesi: kamu ihalesi ve kamu kararlarını API anahtarıyla ajanlar yürütür. **Çözüm: iki kanal.**

| Kanal | Ne | Kim üretir | Saklanan |
|---|---|---|---|
| **Karar kanalı** | `ihale_ilan`, `hak_ilan` **komut önerisi** | Ajan (yapılandırılmış çıktı) | Doğrulanmış, sunucu damgalı **komut** (günlük) |
| **Anlatım kanalı** | İlan metni, haber, gerekçe satırı | **Şablon + olgu** (ajan metin yazmaz; yalnız gerekçe **kodlarını** seçer) | Olgu; metin render anında üretilir |

Böylece (a) §6.5'in nedenleri (uydurma, KVKK silinebilirlik, enjeksiyon, determinizm) **korunur**; (b) ajan çalışma zamanında kamu kararlarına **gerçekten** katılır; (c) komut kişisel veri taşımaz (KVKK etkilenmez).

**Ajanın yetki zarfı.**

| Ajan **yapabilir** | Ajan **yapamaz** |
|---|---|
| İlan **önerir**: tür, profil (M/Y/T/K), mal, miktar, tavan fiyat, vade, ilan süresi, arsa seçimi | Kazananı seçmek ya da puanı değiştirmek (varyant (b); (b+) için Q2) |
| Takvim: 7 günlük ihale planı önerisi | Bütçeyi aşmak; ödenek rezervi olmadan ilan |
| Meclis önceliği ve dilekçe sayaçlarını **ağırlık** olarak yorumlamak | Sözleşme şablonu dışında süre/dönüş koymak |
| Gerekçe **kodu** seçmek (ör. `K1_dusuk`, `kis_hazirlik`) | Oyuncu hesabına doğrudan para, ceza, yasak |
| Ayrıca `ihale_iptal` **önerisi** (bütçe/ihtiyaç değişti) | İhale iptalini kendi uygulamak (kural motoru koşulu doğrular) |
| — | Serbest metin yayımlamak; oyuncu serbest metnini girdi almak |

**Doğrulayıcı hattı.** (1) strict JSON şeması (`tool_choice: auto` + yapılandırılmış çıktı; zorlanmış `tool_choice` yok); (2) zarf: ilan sayısı ≤3, ilan süresi aralığı, fiyat tavanı ≤ ithalat paritesi (§4.4), hak süresi bant içinde; (3) bütçe: ödenek rezervi + oyuncu payı ≤%50 kuralı; (4) çakışma: aynı mal/ilçe için 14 gün içinde bölünmüş ihale yasağı (4734 m.5); (5) sunucu `t` basar ve günlüğe `{kaynak:"ajan", ajanSurumu, istemOzeti}` yazar. **Yanıt gelmezse ya da geçersizse** kural motoru şablon ilanı (`kaynak:"kural"`). Yeniden oynatmada ajan **çağrılmaz**; günlükteki komut oynatılır.

**Güvenlik.** Ajan girdisi yalnız **yapılandırılmış olgu** (sayılar, kodlar); tabela adı gibi serbest metin **girmez** (`gorunurKimlikRef`, K-8); dilekçe **kapalı tür listesi**dir (§2.4). Kamu ajanı bir `kamu_ajan_kapali` kural-dönemi bayrağıyla anında kapatılabilir; hâlâ kural motoru yürür.

**Maliyet.** Bu raporun önceki taslağındaki maliyet tablosu farklı varsayımlarla hesaplanmıştı ve **kaldırıldı**; maliyet, model seçimi ve devre kesici için **[yapay-zeka-kamu-ajanlari §5](yapay-zeka-kamu-ajanlari.md) esastır**.

Asıl soru maliyet değil değerdir: kural motoru da ilan üretebilir; ajanın **marjinal değeri** bağlama uyum ve ilan çeşitliliğidir (örn. kuraklık sonrası farklı mal karması). Bu yüzden **Alfa-1'de ajan ile kural motoru A/B koşulur** (ilan başına teklif sayısı, ilan çeşitliliği, oyuncu ilgisi); ajan bir **katman**dır, çekirdek bağımlılığı değildir.

**Model seçimi:** [yapay-zeka-kamu-ajanlari §5.3](yapay-zeka-kamu-ajanlari.md) esastır.

### 2.3 İlçe meclisi ve politika kartları (Alfa-1, F6 sonrası)

Mevcut meclis düzeni ([11 §7.6](../11-urun-donusu.md): aktif parsel sahipleri, hesap başına 1 oy, 14 günde bir seçim) kartlarla kamu politikasına bağlanır. Kartların bedeli ve bekleme süresi [çeşitlilik §4.3](cesitlilik-yonetim-askeri-teknoloji.md) çerçevesindedir.

| Kart | Etki | Bant (öneri) | Risk / koruma |
|---|---|---|---|
| `yerli_oncelik` | Ihalelerde ilçe sakini tekliflere **puan avantajı** (4734 m.63: yerli istekli lehine ≤%15 fiyat avantajı) | ≤%10 puan | Kapalı ilçe: avantaj ilçenin ihale gücünü düşürür; **bant** sınırı |
| `esnaf_kotasi` | İhale kontenjanının **≥%30'u yeni hesaplara** (yeni esnaf ihalesi, Y8) | %20–40 | Çoklu hesap: hesap yaşı + sicil eşiği |
| `kamu_arsa_bedeli` | Tahsis taban bedeli çarpanı | ×0,5…×2 | Bedelsiz tahsis → kasa gelir kaybı |
| `ihale_butce_payi` | Kasanın oyuncuya akan payı | %30–50 (≤%50 sert tavan) | ≥%50 NPC kuralı bozulamaz |
| `imece_onceligi` | Hangi proje önce (park, pazar çatısı, okul) | listeden | Ajanın önceliğine **ağırlık** olur |

Karar çerçevesi yine **bant içidir**: meclis kuralı değil **parametreyi** oynatır; çıkar çatışması bayrağı ve makam sahibinin kendi ihalesine girememe kuralı geçerlidir.

### 2.4 Oyuncunun etkisi: dilekçe, oy, itiraz

| Araç | Kural (öneri) | Koruma |
|---|---|---|
| **Dilekçe** | `dilekce_ver {mahalle\|ilce, tur}`; tür **kapalı liste** (≈12: pazar çatısı, çeşme, park bakımı, yol onarımı, kış yakıtı, okul malzemesi…); mahalle sakinlerinin ≥%20'si ya da ≥3 kişi imzalarsa "talep puanı" oluşur; mahalle başına ayda ≤1 aktif dilekçe | Sakin = ≥14 gün hesap + ≥3 hücre; serbest metin yok (enjeksiyon yok) |
| **Oy** | Meclis kartı (kendi ilçende), muhtar önceliği (İ-1); seçim yalnız güvence düzeyi 2'de (K-16) | Seçim haftasında transfer tavanı; hesap başına 1 oy |
| **İtiraz** | İhale sonucuna **24 saat** içinde; hesap başına ihale başına ≤1; **itiraz bedeli** (teminat %1, kamu kasasına); gerekçe seçilir (`hesap_hatasi`, `kosul_ihlali`, `cikar_catismasi`); sonuç: kural motoru **yeniden hesaplar** | Haksız itirazda bedel kaybı; 4734 m.54: ihale sürecinde hak kaybı iddiası için şikâyet/itirazen şikâyet yolu |
| **Komşu itirazı** (kirli tahsis) | Sanayi rezervi tahsisi 24 sa askıya çıkar; hassas komşuların ≥%50'si itiraz ederse ret ([arsa ve inşa §2.4](arsa-ve-insa-derinlestirme.md) imar başvurusuyla aynı kural) | — |

### 2.5 Şeffaflık

| Ne | Nasıl |
|---|---|
| **Kamu Defteri** | Kasa gelir/gider satırları herkese açık ([imza İ-1](imza-mekanikleri-ve-yonelimler.md) açık defter); mahalle/ilçe/il |
| **İhale sonuç kartı** | Kapanıştan **sonra**: tüm tekliflerin fiyat ve süresi; kazananın tabela adı; puan dökümü; "neden bu ihale?" gerekçe satırı (şablon + kod) |
| **Tahsis sicili** | Hangi arsa kimde, ne zamana kadar, ne bedelle (tabela adı) |
| **Ajan etiketi** | İlan "İhale Kurulu (yapay zekâ destekli)" ibaresi taşır; ajan/kural kaynağı görünür |
| **Haftalık Kamu Raporu** | İl Gazetesi ekonomi köşesi ([canlı dünya §4.6](canli-dunya-simulasyonu.md)): kasa girişi/çıkışı, oyuncuya akan pay |
| **Ad anma** | **Teklif vermek, kazanan adının yayımlanmasını kabul etmektir** (katılım koşulunda yazılı); kaybeden/teklif sahipleri anonim kalır. Bu KVKK açısından hukuki görüşe tabidir (K-8, K34; **doğrulanmadı**) |

### 2.6 Oyuncu tarafında ajan

Sahibin "bilgisayarda ya da oyuna sunacağımız API anahtarıyla" ifadesi **üç okumaya** açıktır; hangisinin kastedildiği **bilinmiyor** (Q8):

| Okuma | Tanım | Kaynak |
|---|---|---|
| **1. Sunucu tek anahtar** | Kamu tarafı ajanı sahibin hesabındaki sunucu anahtarıyla çalışır | [yapay-zeka §5.6 A](yapay-zeka-kamu-ajanlari.md) (seçili) |
| **2. Oyuncu anahtarı kendi istemcisinde** | Oyuncu kendi Anthropic anahtarını **kendi makinesinde** kullanır; danışman/teklif botu sunucu için sıradan komut göndericisidir | [yapay-zeka §5.6 C](yapay-zeka-kamu-ajanlari.md) |
| **3. Oyunun verdiği oyun API anahtarı (bu raporun okuması, "üçüncü okuma")** | Oyun, oyuncuya **kapsamlı bir oyun API anahtarı** verir; oyuncunun ajanı bu anahtarla oyuncunun **vekili** (`adina`, K-1) olarak komut gönderir. Oyuncunun Anthropic anahtarı konu dışıdır; oyun anahtarı yalnız oyun komutlarını yetkilendirir | yalnız bu rapor; yapay zekâ raporunun C modelinden **farklı** |

Üçüncü okuma için ilke: **aynı komut yüzeyi, aynı kotalar, ayrıcalık yok.**

- Ajan, oyuncunun **vekilidir** (`adina`, K-1): teklif komutu aynı şemada; "ajan marifetiyle" işareti taşır.
- Kapsamlı anahtar: `ihale_izle`, `ihale_teklif`, `hak_basvur` yetkisi; **para transferi ve hak devri yok**; anahtar başına harcama/teminat tavanı.
- **Hız avantajı yoktur:** teklifler kapalı ve pencere günlerce açıktır; ajan yalnız izleme ve hazırlık yükünü alır. Hesap başına açık teklif tavanı ve token-kova ([11 §10](../11-urun-donusu.md)) geçerlidir.
- Kümelenme ve kartel tespiti **hesap** düzeyindedir (§3.6).
- Alfa-1'de yok; **API anahtarı ve oyuncu ajanı v1.5** (tasarım [yapay-zeka-kamu-ajanlari.md](yapay-zeka-kamu-ajanlari.md)'ne aittir; oradaki C modeli ile bu üçüncü okuma birleştirilebilir ya da ayrı kalabilir, Q8).

---

## 3. Kamunun oyuncuya sunduğu fırsatlar

### 3.1 Katalog

| # | Fırsat | Kim açar | Kimin için | Ödeme | Kasa | Aşama |
|---|---|---|---|---|---|---|
| F1 | **Kamu siparişi** (mal): okul yemeği (gıda/tahıl), kış yakıtı (yakıt/kömür), yol malzemesi (çelik/parça) | İlçe Kasası | Üretici, tüccar | Teslimde | İlçe | **A0 (sabit fiyat) → A1 (ihale)** |
| F2 | **Yeni esnaf ihalesi:** ≤₺2.000, teminatsız, yalnız <30 gün hesap/sicil sıfır | İlçe | Yeni oyuncu | Teslimde | İlçe | A1 |
| F3 | **Hizmet alımı:** nakliye (Garaj), depo (Ambar), şenlik/fuar hizmeti | İlçe/İl | Garaj/Ambar sahibi | Teslimde/dönemlik | İlçe/İl | A1 sonu |
| F4 | **Yapım / altyapı (Proje Kartı):** yol, köprü, pazar çatısı, okul, liman genişletme | Mahalle/İlçe/İl | Müteahhit (v1.5) + imece katkıcıları | Kilometre taşı | Kasa + imece | A1 (imece) / v1.5 (müteahhit) |
| F5 | **Kullanım izni / kira** (tezgâh, hazine tarlası, kıyı iskelesi) | Kural motoru/ajan | Esnaf, yeni oyuncu | Bedel (kura/artırma) | Mahalle/İlçe | A1 |
| F6 | **Kamu üst hakkı / tahsis** | İlçe | Yatırımcı, oda/vakıf | Bedel/bedelsiz | İlçe | A1 sonu |
| F7 | **KÖİ** (hal, depo, rıhtım) | İl | Sermayeli oyuncu | Tarife gelirinden | İl | v1.5 |
| F8 | **Sanayi tahsisi** (OSB esinli) | İlçe (Kasaba+) | Sanayici | Tahsis + aidat | İlçe | v1.5 |
| F9 | **Teşvik:** bedelsiz/indirimli tahsis (istihdam/üretime geçme koşullu), yerli öncelik puanı | Meclis/kural | Yatırımcı | — | — | A1–v1.5 |
| F10 | **Kamu alım programı** (hasat dönemi tahıl alımı; TMO benzeri, **doğrulanmadı**): `NpcAlici{tur:"kamu"}` haftalık sabit havuz, kişi başı kota | Il/Ülke (kural) | Çiftçi | Teslimde | Havuz | v1.5 |

### 3.2 Tek ihale modeli: tek motor, üç profil

**Çelişkinin çözümü.** [Canlı dünya §4.5](canli-dunya-simulasyonu.md) "en düşük fiyat, 3–7 gün" ile [N4](imza-mekanikleri-ve-yonelimler.md) "kapalı teklif, puanlama" **aynı motorun iki ayarıdır**: fiyat ağırlığı %100 olursa puanlama "en düşük fiyat"a iner.

| Konu | §4.5 | N4 | **Tek model** |
|---|---|---|---|
| Kazanan | En düşük fiyat | Puan: fiyat %70 + süre %20 + portföy %10 | **Puan = Σ wᵢ·normᵢ**; ağırlık vektörü **profil verisidir** |
| Teklif görünürlüğü | Açık (varsayım) | Kapalı | **Kapalı, sunucu-mühürlü** |
| İlan süresi | 3–7 gün | (gerçek ≥40 gün) | **M: 3–7 gün; Y/T/K: 7–14 gün** |
| Teminat | Teslim etmemede kayıp | Geçici %3 / kesin %6 | **M: ≥₺2.000 ise %3 tek aşama; Y/T/K: geçici %3 + kesin %6** |
| Fiyat tavanı | ref +%15 | Yaklaşık maliyet; <%75 aşırı düşük | **Tavan = min(yaklaşık maliyet, ithalat paritesi ×1,10)**; <%75 → aşırı düşük sorgusu |
| Ödeme | Teslimde | Kilometre taşıyla | **M: teslimde; Y: kilometre taşıyla** |
| Ödenek | — | — | **İlan = ödenek rezervi (bloke)** |

| Profil | Kullanım | Yön | Ağırlıklar (öneri) | Aşama |
|---|---|---|---|---|
| **M** (mal alımı) | Kamu siparişi, kış yakıtı, okul yemeği | Eksiltme | fiyat 100 (+ asgari sicil eşiği) | **Alfa-1 başı** |
| **Y** (yapım / hizmet) | Yol, köprü, çatı, Proje Kartı | Eksiltme | fiyat 70 + süre 20 + sicil/portföy 10 | Alfa-1 sonu / v1.5 |
| **T** (tahsis / kira) | Hazine arsası, sanayi rezervi | **Artırma** | bedel 60 + yatırım taahhüdü 30 + sicil 10 | Alfa-1 sonu / v1.5 |
| **K** (KÖİ) | Hal, depo, rıhtım | Karma | kamuya ödenen pay 50 + tarife düşüklüğü 30 + süre 10 + sicil 10 | v1.5 |

**Puan formülü (örnek, profil Y).**
```
fiyatPuani  = 70 × (enDusukGecerliFiyat / teklifFiyati)
surePuani   = 20 × (enKisaGecerliSure   / teklifSuresi)
sicilPuani  = 10 × min(1, tamamlananKamuIsHacmi / ilanReferansHacmi)
puan        = fiyatPuani + surePuani + sicilPuani
asiriDusuk  = teklifFiyati < 0,75 × yaklasikMaliyet   →  ek teminat ×2 + "ifa edilemez riski" bayrağı
esitlik     = erken mühürlenen teklif kazanır (sunucu t)
```

**Yaşam döngüsü.**

| Aşama | Süre | Ne olur |
|---|---|---|
| Taslak | Anlık | Kural motoru/ajan önerir; doğrulayıcı kabul eder |
| **İlan** | M 3–7 gün; Y/T/K 7–14 gün | **Ödenek rezervi** bloke (4734 m.5: ödeneği olmayan işe ihale yapılamaz); yaklaşık maliyet ilan edilir |
| **Teklif penceresi** | İlan süresi | `ihale_teklif` (kapalı); hesap başına ihale başına 1 geçerli teklif; geçici teminat bloke |
| **Kapanış** | Anlık | Teklifler açılır (4734 m.36: zarflar hazır bulunanlar önünde açılır); aşırı düşük sorgusu; puanlama |
| **Karar ve itiraz** | 24 sa | Sonuç kartı; itiraz → deterministik yeniden hesap |
| **Sözleşme** | 24 sa | Kazanan kesin teminatı yatırır; imzalamazsa geçici teminat **gelir kaydedilir** ve **ikinci en iyi teklif sahibine** geçilir (4734 m.44 esinli) |
| **İfa** | M 3–10 gün; Y 7–28 gün | Teslim (kamu ambarına gerçek stok transferi) / kilometre taşları; gecikmede günlük ceza (öneri %1/gün, ≤%10), sonra fesih + kesin teminat müsaderesi + **ihale yasağı** (7/14/28 gün) |
| **Kabul ve ödeme** | Anlık | Ödeme kasa rezervinden; sicil güncellenir; kitabe/defter |

**Neden commit–reveal değil?** Sunucu tek otoritedir; teklifler günlüğe yazılır ama **kapanışa kadar istemciye hiç gönderilmez**. Commit–reveal yalnız oyuncunun sunucuya güvenmediği durumda anlamlıdır; burada gereksiz karmaşıklık ve komut hacmidir. Kapanış sonrası günlük açık sonuç kartı olarak yayımlanır.

### 3.3 Kamu siparişi ve yeni esnaf ihalesi

- **Mikro ölçek.** Alfa-0/1'de tipik sipariş **20–60 birim** (örn. gıda taban ₺70/birim → ₺1.400–4.200): bir günlük esnaf geliri mertebesi (Esnaf Defteri ödülü toplamı ≤₺8.000; [başlangıç §2.2](baslangic-ve-ustalik.md)). Bu **tahmindir**; kalibre edilmedi.
- **Bölünebilir miktar (çoklu kazanan).** Talep N partiye bölünür; en düşük tekliften başlayarak kapasite taahhütleri doldurulur; her kazanan **kendi teklifini** alır. Küçük oyuncunun tek başına karşılayamadığı ihaleyi parça olarak kazanması mümkün olur.
- **Yeni esnaf ihalesi.** İhale kontenjanının ≥%30'u (meclis kartıyla %20–40) yalnız yeni hesaplara (<30 gün) ayrılır, ≤₺2.000, **teminatsız**, vade 3 gün; ilk teslimde **sicil başlar** ([baslangic Y8 ve §5.5](baslangic-ve-ustalik.md)). Esnaf Defteri'nin "ilk siparişini al" kartı Alfa-0'da NPC panosu siparişidir; Alfa-1'de aynı kart Yeni esnaf ihalesine bağlanır.
- **Mallar.** Mevcut katalog: tahıl, gıda, çelik, parça, yakıt, kömür, elektrik. "Ekmek/un" gibi mallar [üretim katalogu](cesitlilik-uretim-katmanlari.md) gelince okul ekmeği siparişi olur (buğday → un → ekmek zincirinin kamu kanalı).

### 3.4 Hizmet alımı, altyapı projeleri ve imece: Proje Kartı

[İ-5 imece](imza-mekanikleri-ve-yonelimler.md) (ayni katkı, kitabe, kasa eşleştirmesi ≤%30, NPC pazarından alım = sink) ile ihale (nakdi, müteahhit) **aynı projeyi** farklı yönlerden besler. Tek **Proje Kartı**:

| Alan | Değer |
|---|---|
| Proje | Mahalle/ilçe/il ortak projesi (köprü, liman genişletme, baraj, pazar çatısı, okul: [11 §7.11](../11-urun-donusu.md)) |
| Malzeme listesi | İmece katkısına açık (ayni); eksik kalan malzeme kasadan **NPC pazarından** alınır (sink, ≤%30 eşleştirme) |
| İşçilik/kapasite | **Profil Y ihalesi** (v1.5 müteahhit); imece **aşama çıktısına** koşulludur |
| Finansman karışımı | `imece %X + kasa nakdi %Y`; kasa tarafında **oyuncuya akan** pay (müteahhit ödemesi) ≤ proje bütçesinin %50 |
| Kitabe | Müteahhit + imece katkıcıları (hesap başına tek satır; K-8 dolaylı kimlik) |
| Başarısızlık | 14–28 günde ilerleme yoksa katkı iadesi (imece kuralı) ve ihale teminatı |

Üç kullanıcı yolu: **sadece imece** (herkes katkı, kitabe), **sadece ihale** (kasa parası, Alfa-1 sonu), **karma** (anahtar teslim müteahhit imece malzemesini kullanır). Böylece "imece ile bağlantı" ayrı bir sistem değil, aynı projenin iki finansman ayağıdır.

### 3.5 Teşvik

| Teşvik | Mekanik | Koruma |
|---|---|---|
| Bedelsiz/indirimli **sanayi tahsisi** | İstihdam (≥10 işçi) ve ≤28 günde üretime geçme koşullu (4562 Ek m.3 esinli: yatırım koşulu yerine getirilmezse yargısız iptal; yapı ≥%50 tamam ise tazminat) | Yatırım taahhüdü ihlali = fesih; kamu zararı yok |
| **Hazine tarlası** (yeni oyuncu) | İlk 30 gün düşük kira, ilk ihale teminatsız | Hak ticareti yasak; 2 hak tavanı |
| **Yerli öncelik** | `yerli_oncelik` kartı | Bant ≤%10 puan |
| **Kıyı iskelesi** izni | Kısa kira, ihale | Yapı yok: geçici iskele |
| **Yeni esnaf ihalesi** | Yeni hesap kotası | Hesap yaşı + sicil |

### 3.6 Kısıtlar ve kötüye kullanım önlemleri

| Kötüye kullanım | Önlem | Gerçek esin |
|---|---|---|
| **Kayırmacılık** (makam sahibi kendi tesisinden alım, kendi ihalesine giriş) | Makam sahibi ve aynı **hesap kümesi** (aygıt/ağ sinyali **inceleme** için) ihaleye giremez; kasa harcaması açık eksiltme; çıkar çatışması bayrağı | 4734 m.11: ihale yetkilileri ve ilişkili kişiler katılamaz |
| **Çoklu teklif** (aynı kişi birden çok hesapla) | Hesap başına ihale başına 1 teklif; kümelenme tespiti → ihale yasağı | 4734 m.17(d): birden fazla teklif yasak fiildir |
| **Kartel / sıralı kazanma** | Aynı iki hesabın birbirine alternatif kazanma örüntüsü (HHI ve rotasyon puanı) → inceleme + teminat artışı | 4734 m.17(a–b) fesat ve rekabeti engelleyen davranış |
| **Aşırı düşük teklif + teslim etmeme** | Aşırı düşük sorgusu (ek teminat ×2); müsadere; **ihale yasağı 7/14/28 gün**; sicil düşer | 4734 m.38, m.58: yasaklama 6 ay–2 yıl |
| **İhale bölme** (eşiğin altına inmek için) | Aynı ilçe/mal için 14 gün içindeki ardışık ilanlar toplam sayılır | 4734 m.5: eşik değerlerin altında kalmak için bölünemez |
| **NPC–kamu arbitrajı** | Tavan = ithalat paritesi (§4.4) | — |
| **Kasa boşaltma / israf** | Açık defter; ihale payı ≤%50; tek ihale ≤ kasa bakiyesinin %40 | 4734 m.5: kaynakların verimli kullanılması |
| **Teklif sızıntısı** | Kapalı teklif istemciye gitmez | 4734 m.36 |
| **Kamu arsası biriktirme** | ≤2 aktif hak; tavana sayılır; devir yok; anti-flip 7 gün | 2886 m.66 |
| **Aklama** (kamu → hesap → alt hesap) | Ödeme **teslimden sonra**, yeni hesap transfer tavanı, hediye gecikmesi ([11 §10](../11-urun-donusu.md)) | — |
| **Ajan manipülasyonu** | Serbest metin girdi yok; kapalı dilekçe listesi; zarf doğrulayıcısı; kural motoru yedeği | — |
| **Sahte teslim** | Teslim = kamu ambarına **gerçek stok transferi**; sahte stok yok | — |
| **İhale spam** | İlçe başına ≤3 açık ilan; hesap başına ≤3 açık teklif | canlı dünya §4.5 |

---

## 4. Para korunumu ve kamu bütçesinin kaynağı

### 4.1 Kaynaklar

| Kaynak | Kasa | Para nereden | Not |
|---|---|---|---|
| **Arazi vergisi** (%1/hafta, alış değeri) | %20 mahalle / %40 ilçe / %15 il / **%25 yanar** | Oyuncu (mevcut lavabo) | İmza §2.0 dağılımı; tabana göre küçük (§4.3) |
| **İthalat makası ve işlem komisyonu payı** (**yeni, öneri**) | Oyuncunun NPC'den **ithalatta** ödediği makasın (ref ×1,10 − ref) **%20'si** ve ithalat işlem komisyonunun (`pazar.islemKomisyonuPpm`, %1) **%50'si → ilçe** (ayar: %10–40 / %25–100) | Oyuncu (ödediği para zaten **yanıyor**) | Yalnız yanan paranın bir kısmı kasaya yazılır. **İhracat tarafındaki makas ve komisyon kaynak olamaz:** NPC oyuncuya ×0,9 öder, aradaki %10 hiç basılmamış paradır; kasaya yazmak yeni para basmaktır |
| **Hak bedelleri** (kira, üst hakkı, tahsis ihale bedeli, aidat %0,2/hafta) | İlçe/İl | Oyuncu | Fırsat arsası geliri |
| **Hasılat payı** (KÖİ operatör tarife geliri %5) | İl | Oyuncu | 4706 Ek m.2 esinli |
| **Ceza, teminat müsaderesi, itiraz bedeli kaybı** | İlçe | Oyuncu | Disiplin geliri |
| **Tezgâh ücreti, fuar harcı, bağış** | Mahalle/İlçe | Oyuncu | İmza §2.0 |
| **Liman harcı, ihracat vergisi** (il hazinesi) | İl | Oyuncu/NPC alımı | [çeşitlilik İl8](cesitlilik-yonetim-askeri-teknoloji.md) |
| **NPC nüfus vergisi** | — | **Para musluğu** (nüfus tüketimi gelir üretmez, [08](../08-alti-katman.md)) | **Alfa-0'da kullanılmaz;** gerekirse `NpcKaynak{haftalikTavan}` ile ve K-5 panosunda ayrı kalem |

**Yeni musluk yok, ama dikkat:** kamu bütçesi yalnız **oyuncudan toplanan** paradır (vergi, hak bedeli, ceza) ve **zaten yanan** paranın (ithalat makası ve komisyonu) bir parçasıdır. Kasaya **ihracat makası ya da ihracat komisyonu yazılmaz** (NPC'nin 0,9 R'lik ödemesinin aradaki %10'u hiç basılmamıştır). Kasadan oyuncuya geri akış ≤%50 olduğu için bu para arzını artırmaz; yalnız **lavabonun bir kısmını geri verir** (§4.3 son satır). Esnaf Defteri'nin ilk kamu ilanı ödülü defter ödül tavanı (₺8.000) içindedir.

### 4.2 Harcama kuralları

| Kural | Değer | Neden |
|---|---|---|
| **Ödenek rezervi** | İlan anında bütçe bloke; ödeneği olmayan ilan açılmaz | 4734 m.5 |
| **Oyuncu payı tavanı** | Kasanın **oyuncuya akan** payı (ihale + sipariş + teşvik + tazminat) **≤%50** (28 gün kayan pencere); **NPC'ye akan ≥%50** | K-5 |
| Tek ihale tavanı | ≤ kasa bakiyesinin %40 | Konsantrasyon |
| NPC'ye akan | İthalat (×1,1, para yanar), imece eşleştirmesi (NPC pazarından alım), NPC hizmet/bakım gideri | Sink korunur |
| Kasa yetersiz | İlan açılmaz; arayüz "ilçenin ihale gücü: ₺…" gösterir | Şeffaflık |
| Yapı/hak tazminatı (D3) | Oyuncuya akan paya **sayılır**; ödenek rezervi | Para korunumu |

### 4.3 Ölçek tahmini (hesap; kalibre edilmedi)

Aktif 10 oyunculu bir Alfa-0 ilçesi; oyuncu başına 12 hücre × ₺2.500 = ₺30.000 arazi değeri; haftada NPC'den **ithalat** hacmi ₺4.000/oyuncu (referans fiyat değeri; girdi alımı; tahmin). Kod: ithalat makası ×1,10, komisyon %1 (`pazar.ithalatCarpaniPpm`, `islemKomisyonuPpm`; `pazar/fiyat.ts` `ithalatKirilimi`).

| Kalem | Hesap | ₺/hafta |
|---|---|---|
| Arazi vergisi | 10 × ₺30.000 × %1 | ≈3.000 |
| ↳ mahalle / ilçe / il / yanan | %20 / %40 / %15 / %25 | 600 / 1.200 / 450 / 750 |
| İthalat makası (yanan) | 10 × ₺4.000 × 0,10 = ₺4.000; **%20 pay** | ≈800 (ilçe) |
| İthalat komisyonu (yanan) | 10 × ₺4.400 × %1 ≈ ₺440; **%50 pay** | ≈220 (ilçe) |
| **İlçe kasası** | 1.200 + 800 + 220 | **≈2.200** |
| Oyuncuya akabilecek | ≤%50 | **≈1.100** (≈15 birim gıda) |
| Paylar iki katına çıkarsa (%40 / %100) | +₺1.020 | ≈3.240 |
| **Lavabo etkisi** | Kasaya yönlendirilen yanan para ≈₺1.020; geri akış ≤%50 → lavabo **≤₺510 azalır** (+ vergi payından ≤%37,5) | Hedef lavabo/(vergi+ihracat−ithalat) ≈ 0,35–0,50 ([canlı dünya §4.6](canli-dunya-simulasyonu.md)) bozulmamalı: öneri tavan, geri akışın lavabonun **≤%5'i** olması (B3 ölçümüyle doğrulanacak) |

**Bulgu.** Arazi vergisi tabanı küçüktür; ithalat makası ve komisyon payı vergi payı kadar bir kaynaktır, **ihracat tarafı kaynak olamaz**. **Sonuç:** kamu fırsatı Alfa-0'da **prestij ve renk** kaynağıdır (bir günlük esnaf geliri), geçim kaynağı değil. Büyüme için kaldıraç: (i) ithalat makası/komisyon pay oranı, (ii) il hazinesinin ilçe payı, (iii) ihale ölçeği ilçe seviyesiyle büyür (Köy → Şehir) ve ithalat hacmi büyüdükçe kasa büyür. Bu bir **ayar**, tasarım kusuru değildir; ölçüm S9 sonrası (§8).

### 4.4 İthalat paritesi: arbitraj açığı

NPC piyasa yapıcı ihracat ×0,9, **ithalat ×1,1** (K-5). [Canlı dünya §4.5](canli-dunya-simulasyonu.md) ihale tavanı **ref +%15**, [Capital Rift esnaf siparişi](capital-rift-mekanikleri.md) ödülü **piyasa +%5–15** öngörür. Oyuncu **NPC'den ×1,10'a alıp** kamuya **×1,15'e** teslim ederek, hiç üretmeden her teslimde ≈%4,5 risksiz kâr elde eder: bu, kamu bütçesinden çıkan **para musluğudur** (pay tavanı onu sınırlar ama kapatmaz).

**Doğrulama (kod):** `parametreler.json` → `pazar.ithalatCarpaniPpm = 1100000` (×1,10), `ihracatCarpaniPpm = 900000` (×0,90), `makasPpm = 200000`; anlaşmalı ticarette ithalat ×1,05, yaptırımda ×1,30. **Düzeltme:** kamu siparişi/ihale/esnaf siparişi **fiyat tavanı ≤ ithalat paritesi** (`pazar.ithalatCarpaniPpm`'ye bağlı, bugün ref ×1,10); böylece NPC'den alıp kamuya satmak **sıfır marj** verir, yalnız gerçek üretim kâr eder. "Ödül +%5–15" yerine **+%5–10** olmalıdır. Bu, üretimin değerini korur (üretici ihalede ithalatçıdan her zaman avantajlıdır).

### 4.5 Panolar

Para arzı panosuna ([K-5](imza-mekanikleri-ve-yonelimler.md), [canlı dünya §4.6](canli-dunya-simulasyonu.md)) şu kamu kalemleri eklenir: kasa girişleri (vergi, ithalat makası/komisyon payı, hak bedeli, ceza), **oyuncuya akan** / **NPC'ye akan** / **yanan**, ödenek rezervleri, kayan pencere oranı, ilçe bazlı "ihale gücü". Hedef lavabo/(vergi+ihracat−ithalat) ≈ 0,35–0,50 (B3) korunur.

---

## 5. "Sıkıcı bürokrasi değil": eğlence ve arayüz

### 5.1 Döngüye bağ

Sahibin ilkesi: üretim–lojistik–satışın birbirini döngü hâlinde beslemesi oyunu çeker. Kamu bu döngünün **kapanış yolu**dur:

```
üret (buğday, çelik…) → işle → kamu siparişi/ihale teslim → kazanç
        ↑                                                      ↓
 imece katkısı, kitabe  ←  kamu arsasında tezgâh/KÖİ/üst hakkı  ←  yeni kapasite
```

- **Tüketici kanalı:** buğday → un → ekmek → **okul yemeği siparişi**; maden → çelik → **yol malzemesi**; elektrik/yakıt → **kış hazırlığı** ihalesi.
- **Alt yapı kanalı:** teslim kazancı ile **kamu arsasında** üst hakkı yapı ya da KÖİ depo kurmak (kendi "pencere mağazan" için pazar yerinde tezgâh kurası).
- **İlçe gelişimi:** park, pazar çatısı, okul, sağlık ocağı gibi kamu yapıları ilçe hizmet katkısı olarak seviye atlamaya girer ([11 §7.4](../11-urun-donusu.md): nüfus + hizmet yapıları + sahip sayısı); herkes kazanır, böylece kamu ihalesi bir **ilçe büyütme aracıdır**.

### 5.2 Yarışma ve prestij (avantajsız)

| Mekanik | Etki | Not |
|---|---|---|
| **Zarf açılışı anı** | İhale kapanışında zarflar sırayla açılır (20–30 sn akış); "5 teklif, en düşük ₺…" | "Kazandın/Kaybettin" kartı: kaybedene **fark yüzdesi** ve ipucu (öğretici) |
| **"İlçenin Müteahhidi"** unvanı | Tamamlanan kamu iş hacmi sıralaması | Kozmetik; **avantaj yok** ([baslangic](baslangic-ve-ustalik.md) unvan ilkesi) |
| **Kitabe** | Kamu yapısında müteahhit + imece katkıcıları | K-8 dolaylı kimlik; anonim seçeneği |
| **Sicil** | Teslim edilen/geciken; teminat oranı ve açık sözleşme limiti ([baslangic §5.5](baslangic-ve-ustalik.md)) | Söz tutmanın ekonomik karşılığı |
| **Yeni esnaf ihalesi** | Yeni hesaplara ilk kamu işi | İlk sözleşme + sicil başlangıcı |
| **İhale günü ritmi** | "Bugün kapanıyor" Dikkat paneli maddesi | Günlük görev/seri yok (angarya yok) |
| **Mahalle çekişmesi** | Dilekçe puanı hangi mahallenin projesinin öne geçtiğini belirler | Sakinler arası sosyal sinyal |

### 5.3 Takvim

[Canlı dünya olayları](canli-dunya-simulasyonu.md) kamu ilanlarını tetikler: **okul açılışı** (kırtasiye/giyim siparişi), **kış hazırlığı** (yakıt ihalesi), **hasat dönemi** (kamu alım programı, v1.5), **gurbetçi yaz dönüşü** (pazar yeri düzeni/şenlik hizmeti ihalesi), **bayram öncesi** pazar yeri düzenlemesi (ritüel gösterilmez; ilan **bayram döneminde duraklar** ve hatırlatma takviminde görünür). Resmî tatilde ilan duraklaması canlı dünya §4.5 ile aynıdır.

### 5.4 Arayüz

**Kamu arsası haritası (katman).** Devlet katman rengi ([görsel kimlik](gorsel-kimlik-ve-arayuz.md): indigo ailesi) kamu katmanında kullanılır; hücre durumu: *kalıcı kamu* (meydan, pazar, park, kıyı: dolgun), *tahsise açık* (hazine rezervi: açık ton), *ihalede* (çizgili), *tahsisli* (hak sahibinin oyuncu rengiyle kenar çizgisi), *süresi dolmak üzere* (uyarı rozeti). Hücre kartı: tür, durum, kalan süre, **"İlana git"**, **Sözleşme Kartı**. L3'te mahalle çizgisi ve etiketi; L4'te meydan/pazar sahneleri.

**İhale panosu (Devlet ekranı + meydan panosu).** Sekmeler: *Açık ilanlar*, *Tekliflerim*, *Kapananlar*, *Sicilim*. İlan satırı: ne, ne kadar, ne zamana, **yaklaşık maliyet**, kalan süre, "ilçenin ihale gücü". **Üç adımlı teklif:** (1) seç, (2) fiyat/süre gir (maliyet kartı "gereken / var", aşırı düşük uyarısı), (3) **Sözleşme Kartı** ve onay. **Modal yok** (Y-İ3): tek aktif kart.

**Dikkat paneli.** "Kapanan ihale", "hakkın bitiyor (T−14)", "yenileme penceresi", "teslim vadesi yaklaşıyor", "itiraz süresi"; en çok 3 madde ([canlı dünya §6.3](canli-dunya-simulasyonu.md)).

**Mobil.** İhale panosu tek sütun; zarf açılışı kısa animasyon (kapatılabilir); "ilçenin ihale gücü" üst çubukta.

**Yürüyüş.** Meydanda ilan panosu, pazar yerinde tezgâh kurası listesi; her işin panelden karşılığı vardır, uğramazsan kaybetmezsin (zorunlu taşıma yok).

---

## 6. Mevzuat esini (tam metinden doğrulandı)

Aşağıdaki maddeler **mevzuat.gov.tr tam metin PDF**'lerinden okunarak doğrulandı. Satırdaki "oyun esini" kopya değildir.

| Kanun | Madde | Doğrulanan içerik | Oyun esini |
|---|---|---|---|
| **4706** (Hazine taşınmazları) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4706.pdf) | m.1 | Amaç: Hazine taşınmazlarının daha kısa sürede **ekonomiye kazandırılması** | Kamu arazisinin "atıl bırakılmaması"; oyunda **satış yok, tahsis var** |
| | m.2 | Tahsisin kaldırılması ve satış (Cumhurbaşkanı kararı) | Tahsis ≠ mülk (hak) |
| | Ek m.2 | Hazine taşınmazı üzerindeki irtifak hakkı/kullanma izni bedeline ek olarak **hasılatın %1'i** | KÖİ hasılat payı (oyunda %5 öneri) |
| **2886** (Devlet İhale K.) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2886.pdf) | m.35–36 | İhale usulleri; **kapalı teklif usulü esastır** | Kapalı teklif |
| | m.63 | Keşif artışı %30'a kadar yüklenici yükümlü | Proje değişiklik payı (öneri) |
| | **m.64** | **Kira süresi en çok 10 yıl** (turistik/enerji istisnası); **3 yılı aşan kirada üst izin**; **kira bedeli her yıl yeniden tespit** | Süreli hak; yenileme yok; bedel yeniden belirlenir |
| | m.66 | Sözleşme **idare izniyle** devredilir, devralandan **ilk ihale şartları aranır**; izinsiz devir sözleşmeyi bozar | Hak devri yasak; alıcıda ilk ihale şartı |
| **5393** (Belediye K.) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5393.pdf) | m.15(h) | Belediye taşınmaz kiralama, **tahsis**, sınırlı aynî hak tesisi yetkisi | Kamu varlığının hak verebilmesi |
| | m.18(e) | Meclis: **3 yılı aşan kiralama** ve **≤30 yıl sınırlı aynî hak** kararı | İlçe meclisi kartı (bant içi) |
| | m.75(d) | Taşınmaz **≤25 yıl tahsis**; **amaç dışı kullanımda tahsis iptal**; süre sonunda yeniden tahsis mümkün | Tahsis hak türü ve yenileme |
| **3996** (YİD) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3996.pdf) | m.1–2 | Kapsam: köprü, baraj, depo/silo, **toptancı halleri**, limanlar, otoyol… | KÖİ örnek listesi |
| | m.5 | Sözleşme **özel hukuka tabi** | Sözleşme dili |
| | **m.7** | Süre yatırım bedeli ve geri ödeme süresine göre belirlenir; **≤49 yıl** | KÖİ süresi ≥1,3× geri dönüş |
| | **m.9** | Süre sonunda yatırım **bedelsiz, borçsuz, bakımlı, çalışır** kamuya geçer | D2 bedelsiz devir |
| | m.10 | Kamulaştırma idareye ait | Oyunda kamulaştırma yok |
| **4734** (Kamu İhale K.) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4734.pdf) | **m.5** | **Temel ilkeler:** saydamlık, rekabet, eşit muamele, güvenirlik, gizlilik, kamuoyu denetimi, kaynakların verimli kullanılması; **ödeneği olmayan işe ihale yapılamaz**; eşik altı kalmak için bölünemez | İlan = ödenek rezervi; ihale bölme yasağı |
| | m.11 | İhale yetkilileri ve yakınları/şirketleri ihaleye katılamaz | Kendi ihalesine girememe |
| | **m.13** | Açık ihale ilanı ihaleden **≥40 gün** önce (eşik üstü) | Oyunda ≈3–14 gün (ölçeklenmiş) |
| | m.17 | **Yasak fiiller:** fesat, katılımı engelleme, **birden fazla teklif**, yasaklıyken katılma | Çoklu hesap/kartel önlemleri |
| | m.19 | Açık ihale: tüm isteklilerin teklif verebildiği usul | Varsayılan |
| | **m.33** | **Geçici teminat teklif bedelinin ≥%3'ü** | %3 |
| | m.36 | Teklif zarfları ihale saatinde açılır | Zarf açılışı anı |
| | **m.38** | **Aşırı düşük teklif:** yazılı açıklama istenir; yetersizse reddedilir | Aşırı düşük sorgusu |
| | **m.40** | **Ekonomik açıdan en avantajlı teklif** yalnız fiyat ya da fiyat + fiyat dışı unsurlar (ağırlıklar dokümanda) | Tek motor + ağırlık profilleri |
| | m.41, m.44 | Sonuç, teklif veren **tüm isteklilere gerekçeyle bildirilir** (m.41); imzalamazsa geçici teminat gelir, ikinci en avantajlı teklif sahibine geçilir (m.44) | Sonuç kartı gerekçesi; ikinci teklif sahibi |
| | **m.43** | **Kesin teminat %6** | %6 |
| | m.54 | Hak kaybı iddiası için **şikâyet ve itirazen şikâyet** | İtiraz mekaniği |
| | **m.58** | 17. maddeye aykırı fiilde **1–2 yıl**, sözleşme imzalamamada **6 ay–1 yıl** katılma yasağı | İhale yasağı 7/14/28 gün |
| | m.63 | Yerli istekli lehine **≤%15 fiyat avantajı** | `yerli_oncelik` kartı |
| **4562** (OSB) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4562.pdf) | **m.18** | Parsel tahsisi yönetim kurulunca **şeffaflık ilkesiyle**; tahsis amacı dışı kullanılamaz; **borç ödenmeden ve üretime geçmeden satılamaz**; ihlalde **tahsis bedeliyle geri alınır** | Sanayi tahsisi; kullanım şartı; hak devri yasağı |
| | **Ek m.3** | Bedelsiz tahsiste yatırım/süre koşulu uyulmazsa **yargı kararı aranmaksızın iptal**, yapı OSB'ye geçer; **≥%50 yatırımda** bedel yeni yatırımcıdan ödenir | Taahhüt feshi; D3 tazminat mantığı |
| **3194** (İmar K.) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194.pdf) | m.18 | Arazi/arsa düzenlemesinde **düzenleme ortaklık payı** ≤%45 (önceki sürüm %40; PDF'te güncel metin "kırk beş") | Gerçekte kamu alanı oranı **yüksektir** (%40+); oyunun %8–9'u hafif |
| **3621** (Kıyı K.) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3621.pdf) | m.5–6 | Kıyılar **herkesin eşit ve serbest yararlanmasına açık**; kıyıda yapı yapılamaz; sahil şeridinde yapı kıyı kenar çizgisine **≤50 m** yaklaşabilir | Kıyı şeridi (2 hücre) kamu |
| **4342** (Mera K.) [PDF](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4342.pdf) | m.5, m.14 | Mera köy/belediyeye **tahsis**; tahsis amacı değiştirilmedikçe başka kullanım yok | Mera Orman sınıfında kalır, kamu türü değil |

**Doğrulanmadı / dışarıda bırakıldı.** Hazine taşınmazlarının kiralanmasına ilişkin ayrıntılı yönetmelik; TMO benzeri alım programı mevzuatı; TMK 826 üst hakkı ve süresi ([arsa ve inşa](arsa-ve-insa-derinlestirme.md) özetleri **arama özeti**); kamu ihale eşik tutarlarının güncel TL değeri (m.8; 2025 tebliği var, tutar okunmadı); EKAP ile 28 güne inen süre ([canlı dünya kaynağı](https://dosyalar.kik.gov.tr/yardim/dokumanlar/2026_Ihale_Ilan_Sureleri_ve_Kurallari.pdf) **arama özeti**).

**Oyun ölçeği notu.** Gerçekte 10 yıl kira / 49 yıl YİD, oyunda 28–168 gündür. Oran korunmaz; **mantık** korunur: süre ≥ yatırım geri dönüşü, dönüş baştan yazılı, yenileme ayrı karar.

### 6.1 Oyun referansları

- **Eco:** kamu mülkü için hükûmet unvanı/bölge kısıtı; arsa kağıtları ve tapu (deed) yönetimi; hükûmetin mülkiyeti oyuncu mülkünden ayrı tutması ([Eco topluluğu, arama özeti](https://steamcommunity.com/app/382310/discussions/0/5015307809833432132/)) → `k:` ad alanı ve hak ≠ mülk ayrımı.
- **EVE Online:** halka açık sözleşmeler (artırma, ürün takası, kurye) ve teminat/ödül yapısı ([EVE Uni: Contracts](https://wiki.eveuniversity.org/Contracts)) → ihale/sözleşme panosu; ilan ve kapanış ritmi.
- **Albion Online:** NPC alıcı bir kaynakla finanse edilir ([canlı dünya §4.5](canli-dunya-simulasyonu.md)) → bütçe-finanse kamu alımı.
- **Anno:** hizmet binaları ve etki alanı ([imza N12](imza-mekanikleri-ve-yonelimler.md)) → kamu yapıları ilçe seviyesine katkı.

---

## 7. Uygulama: Alfa-0 hafif sürüm ve sonrası

### 7.1 Alfa-0 (NPC kural motorlu, hafif)

**Amaç.** Kamu **var, görünür, satılmaz** ve küçük bir sabit fiyatlı **kamu siparişi** panosuyla oynanır; hak, ihale ve ajan **yok**.

| # | İş | Tür | Maliyet | Not |
|---|---|---|---|---|
| A0-K1 | **Kamu arsası verisi:** Mahalle Paketi + %4 hazine rezervi + ilçe merkezi alanı + kıyı şeridi; `sinif:"kamu"`, `kamuTur`, `k:` sahibi; hazır arsa üreticisi paketleri ada bölmeden önce çıkarır; `parsel_al` kamuya ret | Veri hattı + çekirdek (`tipler.ts`, `mulk/`) | M | K-1, K-2, K-3; **F4 hazır arsa üretiminden önce.** **İlk gerçek satıştan önce kamu arsası istemci türetmesinden (`istemci/src/harita/arsa.ts`) veri hattına ve çekirdeğe taşınmalıdır**; o zamana kadar sunucu kamu hücresini tanımadığı için `parsel_al` ile satın alınabilir (açık risk). İstemcinin 48×48 yapay mahallesi ve %4 arsa oranı geçicidir (§0.2 T8) |
| A0-K2 | Görünüm: harita Kamu katmanı, hücre kartı ("Kamu arsası: satılmaz"), meydan/pazar yeri sahnesi (yürüyüşte) | İstemci | S | Kimlik cümlesiyle örtüşür |
| A0-K3 | **Kamu siparişi v0:** ilan **kasasına göre** çıkar: mahalle kasası → **Muhtar** (mahalle düzeyi), ilçe kasası → **İlçe Başkanlığı** (ilçe düzeyi), yöneticisiz hâl → **NPC Kaymakam** ([imza K-4](imza-mekanikleri-ve-yonelimler.md)) (mal, miktar, **sabit fiyat ≤ ref ×1,10**, vade 3 gün, ilk kabul eden alır); `siparis_al`, `siparis_teslim` ([başlangıç A6](baslangic-ve-ustalik.md)); `kaynak:"kamu"` etiketi | Çekirdek + istemci | M | İhale değil; aynı panel Alfa-1'de ihaleye döner |
| A0-K4 | **Kamu Kasası:** mahalle/ilçe/il sayaçları, açık defter (salt okunur), "ilçenin ihale gücü" | Çekirdek + sunucu + istemci | S–M | K-1; para arzı panosu kalemleri |
| A0-K5 | `NpcAlici{tur:"kamu", kaynak:kasa, haftalikButce}`; ödenek rezervi; oyuncu payı ≤%50 sayacı; fiyat tavanı doğrulayıcısı | Çekirdek | M | K-5; yeni musluk **yok** |
| A0-K6 | **Şema alanları ayrılır:** `HucreDurumu.hak?`, `sozlesmeSurumu`, günlükte `kaynak`; komut/olay adları rezerve; PRNG akışı `kamu` | Çekirdek | S | Alanlar boşken özet değişmez (K-9) |
| A0-K7 | Esnaf Defteri: "ilk kamu ilanı" kartı (ödül ≤₺8.000 tavanı içinde) | İstemci | S | Rehber görev bağı |

Alfa-0'da **yok:** kira/üst hakkı (Z8 ile uyumlu), ihale, ajan, meclis kartı, dilekçe, itiraz, KÖİ.

### 7.2 Alfa-1

| Sıra | İş | Maliyet |
|---|---|---|
| 1 | **Profil M ihale** (kapalı teklif, sunucu-mühürlü, geçici teminat, ikinci teklif sahibi); `ihale_*` komut/olay aileleri; ihale panosu; zarf açılışı | L→M (A0-K3 üzerine) |
| 2 | **Kısa kira + kura** (tezgâh, hazine tarlası); yeni esnaf ihalesi; sicil sayaçları | M |
| 3 | **Ajan** (öneri, zarf + doğrulayıcı) ve **A/B** (ajan vs kural motoru) | M |
| 4 | İlçe meclisi kartları (F6 sonrası), dilekçe, itiraz | M |
| 5 | **Proje Kartı** (imece + kasa) | M |
| 6 | Alfa-1 sonu: **kamu üst hakkı** (ÜHS ortak makine), tahsis (oda/vakıf), **Profil Y** | L |

### 7.3 v1.5 ve sonrası

KÖİ (hal, depo, rıhtım), sanayi tahsisi (OSB esinli), müteahhit rolü ([11 §7.6](../11-urun-donusu.md)), **oyuncu ajanı ve API anahtarı**, kamu alım programı, il/ülke düzeyi ihale, Balkan genişlemesinde kademe etiketleri (K-15). Sonra: kamu yatırım fonu, ortak proje ihale zincirleri.

**Etkilenen dosyalar (öneri, yazılmadı):** `packages/cekirdek/src/tipler.ts` (`sinif:"kamu"`, `hak?`), `mulk/` (kamu hücre kuralları, hak makinesi), `pazar/` (`NpcAlici` kamu), `serilestir.ts`/`prng.ts` (`kamu` akışı), `packages/veri/` ve veri hattı (kamu arsası üretimi), `packages/sunucu/` (ihale olayları, ajan çağrı kuyruğu, yetki tablosu `adina`), `istemci/` (kamu katmanı, ihale panosu, Sözleşme Kartı), `docs/` (11 §7.2 satın alınamaz hücre listesi, §7.6 Muhtarlık).

---

## 8. Ölçüm (öneri)

| # | Gösterge | Hedef (öneri) | Amaç |
|---|---|---|---|
| K-Ö1 | İhale başına teklif sayısı | ≥3 (ortalama) | Rekabet; tek teklifli ihale ≤%20 |
| K-Ö2 | Kazanan dağılımı (HHI), en büyük kazananın payı | HHI düşük; en büyük ≤%40 | Kartel/tekel göstergesi |
| K-Ö3 | Yeni hesap (<30 gün) kazanma payı | ≥%30 (yeni esnaf kontenjanı) | Y8 ile uyum |
| K-Ö4 | **Kamu→oyuncu akışı / kasa girişi** | ≤%50 (28 gün kayan) | K-5 ihlali yok |
| K-Ö5 | Teslim başarısı / temerrüt | ≥%90 / aşırı düşük sonrası temerrüt oranı izlenir | Sicil ve teminat ayarı |
| K-Ö6 | Kamu arsası doluluğu (tahsisli / tahsise açık) | %40–80 | Arz fazla/yetersiz |
| K-Ö7 | Hak süre sonu **uyuşmazlığı/destek** | ≈0; dönüş şikâyeti ≤%1 | "Zorla" algısı |
| K-Ö8 | İtiraz oranı ve haklı çıkma oranı | ≤%5 / izlenir | Kural kalitesi |
| K-Ö9 | Ajan vs kural motoru A/B: ilan başına teklif, çeşitlilik, oyuncu ilgisi | Ajan ≥ kural | Ajan katman değeri |
| K-Ö10 | Kamu fırsatını kullanan aktif oyuncu oranı (D7) | ≥%25 (Alfa-1) | Kamunun oyuncuya hitabı |
| K-Ö11 | Kasa bakiye yaşı ve ödenek rezervi | Bakiye atıl kalmaz | Lavabo/faucet |
| K-Ö12 | NPC–kamu arbitraj izi (NPC'den alıp kamuya teslim oranı) | ≈0 | §4.4 düzeltmesi çalışıyor |

H8 (spekülasyon) ve H-C2 (NPC talep payı) ile birlikte okunur.

---

## 9. Geri dönüşü zor kararlar

| # | Karar | Neden geri dönüşü zor | Seçenekler | Öneri | Ne zaman |
|---|---|---|---|---|---|
| **KK-1** | **Kamu arsası oranı ve ayrılma zamanı** (Mahalle Paketi + %4 hazine + kıyı şeridi; halka-dondurma) | Satılan arsa geri alınamaz; satılmış hücre kamu olamaz; oran sonradan artırılamaz | A) K-2 aynen %4 · B) iki parçalı (paket + %4 + kıyı) · C) yüzde yüksek (%12+) | **B**; halkada ilk satıştan önce dondur; hata yönü fazla ayırmak (Mahalle Paketi sabit) | **F4 hazır arsa üretiminden önce** |
| **KK-2** | **"Satılmaz" mutlak mı; hazine rezervi valfi** | Valf bir kez açılırsa "satılmaz" güveni zayıflar; kapalı tutulursa hata düzeltilemez | A) hiç satış · B) yalnız hazine rezervi, dönem sınırında, ihaleyle, sahip kararıyla | **A** varsayılan; **B** yalnız acil durumda, kamu çekirdeğine asla | Alfa-0 öncesi ilke |
| **KK-3** | **Kamu varlık kimliği granülaritesi ve gelir kasası eşlemesi** (`k:mahalle` / `k:ilce` / `k:il`; hangi tür hangi kasaya yazar) | Günlükteki kimlikler bir kez yazılır; gelir eşlemesi sonradan yeniden yazımı gerektirir | A) tek `k:kamu` · B) kademeli (öneri) | **B**; meydan/pazar/park → mahalle, hazine rezervi/kıyı/sanayi → ilçe | S3 başlamadan (K-1 ile) |
| **KK-4** | **Hak şeması:** hak ≠ mülk, tek `hak?` alanı (ÜHS + kamu), **sözleşme sürümü donar** | Sözleşme şartları sonradan değişirse mevcut hak sahipleri çelişir ("zorla" algısı) | A) ayrı iki şema · B) birleşik `hak?` · C) şartlar kural dönemine bağlı | **B** + grandfathering | Hak makinesi yazılmadan (A1 sonu) |
| **KK-5** | **Süre sonu dönüşü ve tazminat** (D1/D2/D3; "kamu ihtiyacı feshi yok") | Oyuncu güveni; dönüş kuralı sonradan sertleşirse tarihi sözleşmeler çelişir | A) hep bedelsiz · B) tür başına D1/D2/D3 (öneri) · C) kamu fesih hakkı | **B**; **C yok** | İlk ilan şablonu yayımlanmadan |
| **KK-6** | **Hareketsizlik etkileşimi:** hak+yapı açık artırması (yeni istisna yok) | Parsel istisnasının sınırı genişlerse "zorla" ilkesi aşınır | A) kamu hakkı muaf · B) hak+yapı açık artırma (öneri) · C) kamu feshi | **B** | Hareketsizlik merdiveni kodlanırken (F3-b) |
| **KK-7** | **İhale modeli:** tek motor + üç profil; sunucu-mühürlü; teklif/komut şeması; teminat; ödenek rezervi | Komut şeması ve profil veri yapısı sonradan değişirse günlük oynanamaz | A) iki ayrı model · B) tek motor (öneri) · C) commit–reveal | **B**; teklif komutuna `v` (K-9) | Profil M kodlanmadan (A1 başı) |
| **KK-8** | **Kamu bütçe kaynağı:** kapalı döngü, **yalnız yanan paradan** pay (ithalat makası/komisyon; ihracat tarafı hariç), **NPC nüfus vergisi yok**, ≥%50 NPC payı ve 28 gün kayan pencere | Para arzı bir kez şişerse geri sarılamaz | A) NPC nüfus vergisi · B) kapalı döngü + ithalat makası/komisyon payı (öneri) · C) Ülke havuzu (faucet) | **B**; C yalnız ölçümle, sabit tavanla | Her yeni NPC alıcıdan önce (K-5) |
| **KK-9** | **Fiyat tavanı = ithalat paritesi** (ref ×1,10) | Arbitraj bir kez sömürülürse para arzı geri alınamaz | A) ref +%15 · B) ithalat paritesi (öneri) | **B**; esnaf siparişi ödülü +%5–10 | Kamu siparişi v0'dan önce |
| **KK-10** | **Ajan yetki zarfı ve günlük şeması** (`kaynak`, kazananı yalnız kural motoru seçer) | Yetki genişlemesi kolay, daraltma zor; günlük şeması sonradan eklenemez | A) ajan serbest · B) zarf içinde öneri (öneri) · C) ajan yok | **B**; ajan kapatılabilir bayrak; A/B | Günlük şemasında Alfa-0 öncesi |
| **KK-11** | **Hak hücrelerinin ≤72/%25 tavanına sayılması** | Z8: tavan kuralı sonradan değişirse mevcut haklar çelişir | A) sayılmaz · B) sayılır (öneri) · C) kısmi | **B**; büyük projeler ortaklığa (`d:`) | Hak makinesinden önce |
| **KK-12** | **İhale sonuç görünürlüğü ve KVKK** (kazanan adı) | Günlük eklenen-yalnızdır; kişisel veriyi sonradan silmek yeniden yazım ister (K-8) | A) ad görünür · B) `gorunurKimlikRef` + katılımda rıza (öneri) · C) tamamen anonim | **B**; hukuki görüş (K34) | İlk ihale sonuç kartından önce |

**İlk üç acil karar:** KK-1 (F4 hazır arsa üretimiyle aynı anda), KK-3 (S3 ile), KK-10 günlük şeması (K-9 ile).

---

## 10. Açık sorular (lider / sahip için)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| Q1 | Mahalle Paketi 20 hücre ve %4 hazine rezervi kabul edilebilir mi (ilçe uygun hücreden %8–9 düşer)? | Evet; 6–10 aralığı ölçülür |
| Q2 | **Ajanın ihaledeki yetkisi: sahip sorusu** ([yapay-zeka §2.4, §10 Q1](yapay-zeka-kamu-ajanlari.md)). "İhaleyi ajanlar halledecek" nasıl okunmalı? **(b)** ajan yalnız arz (ilan, takvim) ve gerekçe, kazanan kural; **(b+)** ajan kör teknik puan verir (puanın ≤%10–20'si, ayrık kademe, gerekçe kodlu, itirazlı); **(a)** ajan kazananı seçer | Bu rapor **(b)** ile yazıldı (o raporun önerisi). (b+) ancak M1–M3 ölçümleri ≥30 gün temizse ve sahip onayıyla; (a) önerilmez. (b)→(b+) genişletme geri dönüşü zordur, karar sahibindedir |
| Q3 | Kamu kasasına **yanan paradan** pay (ithalat makasının %20'si, ithalat komisyonunun %50'si) kabul edilir mi? İhracat tarafı kaynak **olamaz** (basılmamış para) | Evet, bu oranlarla; lavabo etkisi ≤%5 tavanıyla ölçülür |
| Q4 | `ekYapilar.muhtarlik` (oyuncunun kendi arsasına, ₺8.000) ile meydandaki kamu Muhtarlığı çelişiyor: hangisi kalır? | Meydandaki kamu yapısı; ek yapı F6'da kalkar |
| Q5 | Kamu hakkı hücreleri ≤72/%25 tavanına sayılsın mı? | Sayılsın (Z8) |
| Q6 | Kıyı şeridi (2 hücre) kamu olsun mu (F4'ten önce karar)? | Evet; kıyı ilçelerinde yalnız |
| Q7 | İhale kazananının tabela adı yayımlanması KVKK açısından kabul mü (rıza + hukuki görüş)? | Evet; hukuki görüşe bağlı |
| Q8 | Sahibin "bilgisayarda ya da oyuna sunacağımız API anahtarıyla" ifadesi hangisi: (1) sunucu tek anahtar, (2) oyuncu kendi Anthropic anahtarını kendi istemcisinde kullanır (yapay-zeka C), (3) oyunun oyuncuya verdiği kapsamlı oyun API anahtarı ve `adina` vekilliği (bu rapor)? Oyuncu ajanı v1.5'e mi, Alfa-1'e mi? | **Sahip sorusu.** Varsayılan: (1) kamu tarafı Alfa-1, oyuncu ajanı v1.5 |

---

## 11. Kaynaklar

**Mevzuat (tam metin PDF, doğrudan okundu)**
- 4706: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4706.pdf> · 2886: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2886.pdf> · 5393: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5393.pdf>
- 3996: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3996.pdf> · 4734: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4734.pdf> · 4562: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4562.pdf>
- 3194: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194.pdf> · 3621: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3621.pdf> · 4342: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4342.pdf>

**Oyunlar**
- Eco, hükûmet mülkü ve tapu: <https://steamcommunity.com/app/382310/discussions/0/5015307809833432132/> (arama özeti)
- EVE Online sözleşmeleri: <https://wiki.eveuniversity.org/Contracts>

**Model fiyatları**
- <https://platform.claude.com/docs/en/about-claude/pricing> (ortak brif, 1 Ekim 2026: Opus 5.5 $4/$20; Sonnet 5.5 $2/$10; Haiku 4.5 $1/$5; Batch %50)

**İç belgeler ve kod (doğrudan okundu)**
- [12 — Yön taslağı](../12-yon-taslagi.md) (§7–§9) · [11 — Ürün dönüşü](../11-urun-donusu.md) (§7.2, §7.4, §7.6, §7.8, §7.11, §10, Ek kararlar) · [08 — Altı katman](../08-alti-katman.md) (nüfus tüketimi) · [imza mekanikleri](imza-mekanikleri-ve-yonelimler.md) (§0 T4, §2.0, İ-1, İ-2, İ-5, N4, K-1, K-2, K-5, K-8, K-9) · [canlı dünya](canli-dunya-simulasyonu.md) (§4.5, §4.6, §6.3–6.5) · [arsa ve inşa](arsa-ve-insa-derinlestirme.md) (§2.3–§2.8, Z7, Z8) · [çeşitlilik: yönetim](cesitlilik-yonetim-askeri-teknoloji.md) · [çeşitlilik: üretim §5.4](cesitlilik-uretim-katmanlari.md) · [başlangıç ve ustalık](baslangic-ve-ustalik.md) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · [karo ve ızgara denemesi](karo-ve-izgara-denemesi.md) · [görsel kimlik](gorsel-kimlik-ve-arayuz.md)
- Kod: `packages/veri/icerik/parametreler.json` (`mulk.araziVergisiHaftalikPpm`, `hucreFiyati`, `ekYapilar.muhtarlik`, `hareketsizlik`), `packages/cekirdek/src/mulk/vergi.ts`

**Erişilemeyen / arama özeti kaynaklar.** TMK 826 (üst hakkı) ve Hazine taşınmaz yönetmeliği doğrudan okunmadı; EKAP süreleri ve TMO benzeri alım programı **doğrulanmadı**. Eco topluluk sayfaları arama özetidir.
