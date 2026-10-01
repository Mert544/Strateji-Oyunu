# Araştırma — Çeşitlilik ve Detay: Tarım, Sanayi ve Pazar Katmanları

> **Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi. Bu bir **Ar-Ge önerisidir; kod, veri ve başka belge değiştirilmedi.** Sayıların hepsi başlangıç değeridir, **kalibre edilmemiştir.** Web kaynakları `[K#]` ile bağlıdır (sonda numaralı liste). TÜİK veri portalının bültenleri doğrudan okunamadı (sayfa betikle yükleniyor); üretim rakamları TÜİK/Bakanlık verilerini aktaran haber ve rapor sayfalarından alındı ve **ikincil kaynaktır.** "(genel bilgi)" diye işaretli ifadeler bu turda kaynakla doğrulanmadı. `†` işareti, ilgili ürün/il eşleşmesinin bu turda en az bir kaynakla doğrulandığını gösterir. GADM, FAOSTAT, WorldClim ve UN Comtrade kullanılmadı ([00 K22](../00-vizyon-ve-kararlar.md)); gerçek emtia fiyatı oyuna bağlanmaz ([08 §5.9](../08-alti-katman.md)). Balkanlar bu turun kapsamı dışındadır (§9, Q6).

**Sahip yön notu (1 Ekim) ve bu revizyon.** (1) Sistem **Türkiye** üzerine oturtulur; oyun önce Türk oyunculara hitap eder, Türkiye'nin gerçek coğrafi ve ekonomik yapısı esastır. Ama tasarım Balkanlar, Karadeniz ve başka ülkelere genişleyebilmelidir: **ülkeden bağımsız ortak mal çekirdeği + bölgeye bağlı imza ürünler** (§7.6). (2) İlk sürümdeki "≈ 40 mal" tavanı **kaldırıldı**; karmaşa mal sayısını kısarak değil, **kademeli katalog ve keşifle açılış** ile önlenir (§3, §7). Katalog üç kademedir: **Tier 1 temel** (≈ 29), **Tier 2 bölgesel imza** (il başına 2–4; toplam 40–80, başlangıç 45), **Tier 3 lüks/zanaat ve coğrafi işaretli** (nadir, yüksek değer).

İlgili belgeler: [08 — Altı Katman](../08-alti-katman.md) · [11 — Ürün Dönüşü](../11-urun-donusu.md) · [06 — Simülasyon](../06-simulasyon-spesifikasyonu.md) · içerik: `packages/veri/icerik/icerik.json`, `parametreler.json`.

---

## 0. Yönetici özeti (10 madde)

1. **Boşluk.** Bugünkü içerik 14 mal, 24 yöntem, 18 tesis türü ve 3 ekim ürünüdür (buğday, baklagil, nadas). Tarım tek bir "tahıl → gıda" hattıdır; Kocaeli, Sakarya ve Bursa üretim açısından birbirinin kopyasıdır. Bu, H1'i (bölge farkı) ve oyuncunun yere bağlanmasını zayıflatır. Çözüm mal sayısını şişirmek değil, **gerçek coğrafyadan türeyen "il kimliği"** eklemektir.
2. **Üç kademeli katalog (sahip yön notuna göre).** **Tier 1 temel** ≈ 29 mal (ülkeden bağımsız çekirdek; ilçe gelişim seviyesiyle 12 → 22 → 29 açılır). **Tier 2 bölgesel imza** il başına 2–4, toplam 40–80 (başlangıç 45). **Tier 3** lüks/zanaat (8 ayrı mal) ve **coğrafi işaretli kimlik kayıtları** (veri; stok kalemi değil; yüzlerce). Toplam ≈ 82 mal kimliği; yapı sayısı 18 (en çok 19). Oyuncu başta yalnız Tier 1'in ilk 12 malını ve **kendi ilinin imzalarını** görür (≈ 16 mal); gerisi **keşfedildikçe** açılır (Ürün Atlası). Ülke genişlemesi için Tier 1 ülkeden bağımsızdır, Tier 2/3 `ulke` alanlı veri kaydıdır (§7.6).
3. **Her ilin 2–4 imza ürünü vardır.** 81 il tablosu (Tier 2 mal kimlikleri ve Tier 3 örnekleriyle) §4.3'te; Alfa-0 illeri ilçe düzeyinde §4.2'dedir. Kocaeli: petrokimya ve rafineri, otomotiv, kağıt-karton, Hereke halısı, Kandıra manda sütü. Sakarya: mısır, fındık, otomotiv ve raylı araç. Bursa: otomotiv, tekstil ve ipek, İnegöl mobilyası, Gemlik zeytini, şeftali ve kestane.
4. **Gerçek veri bazı klişeleri düzeltir.** Pamuk bugün Çukurova'da değil GAP'tadır: Şanlıurfa tek başına ≈ %41,7 [K16]. Malatya kuru kayısı ihracatının ≈ %85'ini karşılar [K18]. 2025'te don ve kuraklıkla fındık −%38,5, zeytin −%34,7, Antep fıstığı −%61,5 düştü [K7]: bu, oyundaki "bahar donu → rekolte çöküşü" olayının gerçek şablonudur.
5. **Zincirler 3–4 kademelidir** (§4.4, §5.2): fındık → iç/kavrulmuş → ezme; yaş çay → kuru çay; süt → peynir; zeytin → yağ; koza → ipek → halı; odun → kereste → mobilya; cevher/kömür → çelik → parça → **araç** (mevcut üç kademeye dördüncü eklenir).
6. **İklim takvimi ürün düzeyine iner.** Mevcut 6 iklim tipi eğrisine "ürün takvim penceresi" ve "yoğunluk" eklenir (§4.5). **Kritik bulgu:** Alfa-0 1 Ekim'de açılır; fındık, çay, kayısı ve şeftali hasat dönemi dışındadır. Zeytin, hamsi, kestane, mısır hasadı ve buğday ekimi etkindir. Çözüm: yumuşak pencere (yoğunluk 0,1–0,3) ve iklim takvimi hızı kararı (Q2).
7. **OSB gerçek bir mekanizmadır** (4562 sayılı Kanun: ortak altyapı, parsel tahsisi, tüzel kişilik) [K33]. Oyunda **"Sanayi Adası"** olur: hazır arsa adasına bağlı; elektrik kaybı ve kirlilik yayılımı düşer, bakım ucuzlar, ardışık zincir kademeleri kümelenme bonusu alır (§5.4).
8. **Pazar dört gerçek mekanizmadan beslenir:** taban fiyatlı devlet alımı (TMO tipi) [K34], ticaret borsası günlük fiyatı [K39], sözleşmeli tarım [K36] ve depo senedi (ELÜS) [K35]. Oyuna **yalnız teslimatlı ileri sözleşme** girer (sabit fiyat, sabit teslim, teminat); açığa satış, kaldıraç ve nakitle fark kapatma yoktur (08 §5.9 ile uyumlu).
9. **36 çeşitlilik öğesi** önerildi (Tarım 12, Sanayi 12, Pazar 12). Alfa-0 çekirdeği **14**, Alfa-0 isteğe bağlı **6**, Alfa-1 **14**, sonra **2**. Maliyet: **S 8, M 26, L 2** (§4.7, §5.5, §6.4). Alfa-0 mal çekirdeği: Tier 1 **20** (+9 isteğe bağlı) + Tier 2 **9** + Tier 3 zanaat **6** = **35** mal ve ≈ 52 coğrafi işaret kaydı (Bursa 29, Kocaeli 13, Sakarya 10).
10. **Riskler ve ilk adım.** (a) Mal kalabalığı: sayı tavanı yok, ama oyuncu başta ≈ 16, en fazla ≈ 28 mal görür; gerisi keşifle açılır. (b) İmza çıktı bonusu küçük tutulur (+%10) ki tek "en iyi imza" doğmasın. (c) Kalite kademesi ve keşif durumu çekirdek tipi değiştirir (L); lider onayı gerekir. (d) İlk iş: `il-imza.json` (ülke alanlı) küratörlü veri dosyası ve `urunPencerePpm` parametresi (ikisi S/M, Alfa-0 kapısına yetişir).

---

## 1. Kapsam ve yöntem

| Konu | Karar |
|---|---|
| Kapsam | Tarım, Sanayi ve Pazar katmanlarında çeşitlilik ve detay. Lojistik, Teknoloji ve Devlet yalnız bağ olarak anılır. |
| Coğrafya | Türkiye (81 il, tablo); Alfa-0 üç il ilçe düzeyinde. Balkanlar ve Karadeniz kıyıdaşları ayrı tur (Q6). |
| Kaynak tercihi | Bakanlık ve kurum sayfaları, TÜRKPATENT kayıt bilgileri, Vikipedi, kamuya açık haber aktarımları. Lisans kısıtlı kaynaklar kullanılmadı. |
| Gerçek veri ilkesi | Gerçek veriler **kimlik ve oran** için kullanılır (hangi ilin imzası ne). Oyun değerleri soyuttur; gerçek fiyat veya "ton" birebir taşınmaz ([08 §2.5](../08-alti-katman.md)). |
| Tarım takvimi | Hasat dönemleri aylık oranlara ve 6 iklim tipine bağlanır ([08 §1.3 T2](../08-alti-katman.md)). Dünya sıfırlamasını çağrıştıran sözcük kullanılmaz ([00 K21](../00-vizyon-ve-kararlar.md)); "iklim takvimi" ve "dönem" denir (kaynak URL adreslerindeki sözcükler dışında). |
| Lisans notu | TÜRKPATENT portalının toplu veri kullanım koşulu doğrulanmadı. Ürün adları gerçek dünya olgusudur ama liste derlemesi ayrı bir haktır: `il-imza.json` **elle küratörlü kısa liste** olmalı, toplu kazıma yapılmamalı. Açık alfadan önce hukuki görüşe eklenir ([00 K34](../00-vizyon-ve-kararlar.md)). |

## 2. Mevcut durum ve boşluk

| Katman | Bugün (`icerik.json`) | Boşluk |
|---|---|---|
| Tarım | `ciftlik`, `ahir`, `mera`, `sulama_kanali`, `gida_fabrikasi`; yöntemler `geleneksel_tarim`, `mekanize_tarim`, `ahir_besi`, `mera_hayvancilik`, `standart_gida_isleme`; ekim ürünü yalnız `bugday`, `baklagil`, `nadas`; mallar `tahil`, `gida`, `gubre` | Ürün kimliği yok; tek hasat eğrisi iklim tipine bağlı; meyve, bahçe, süt ürünü, balık, orman, arı yok |
| Sanayi | 12 maden ve işleme tesisi; zincir `cevher + komur → celik → parca → elektronik`, `petrol → yakit`; `muhimmat` | Hafif sanayi (tekstil, mobilya, kağıt), petrokimya, araç montajı, zanaat yok; OSB kavramı yok; il kimliği yok |
| Pazar | Tek NPC pazar, `emilimSaat/arzSaat`, makas ±%10, liman primi (08 P1), kıtlık cezası (P4), tedarik sözleşmesi taslağı (P5) | Hasat dönemi fiyat dalgası, yerel pazar günü, borsa, taban fiyat, fuar, marka/kalite, NPC tüccar tipleri yok |

Tasarım zemini: oyuncu bir ilçede arsa alarak başlar, 18 yapıdan birini kurar ve yöntem seçer ([11 §7.3](../11-urun-donusu.md)). İklim tipleri `akdeniz, karasal, karadeniz, balkan_kita, kurak, dag_yayla` ve hasat eğrileri yıllık ortalaması tam 1 000 000 ppm olacak biçimde kuruludur ([08 T2](../08-alti-katman.md)). Bu rapor bu zemini değiştirmez; üstüne **kimlik, pencere ve kademe** ekler.

---

## 3. Kademeli katalog ilkesi: temel → bölgesel imza → lüks ve coğrafi işaretli

**Sorun.** "Çok mal = karmaşa." Capital Rift 35'ten fazla mal sunar ama bu, çok oyunculu emir defteri içindir ([oyun tasarımı §1](oyun-tasarimi-parsel.md)). Bizde lojistik arka plandadır, oyuncunun işi okumak ve karar vermektir. Sahip kararıyla mal sayısı üstten sınırlanmaz; bunun yerine **kaç mal görüldüğü** sınırlanır. Katalog büyük olabilir, **ekran küçük kalır.**

**Üç kademe.**

| Kademe | Ne | Sayı | Kimlik | Başta görünür mü? |
|---|---|---:|---|---|
| **Tier 1: Temel mal** | Her yerde üretilen, tüketilen ve zincire giren mallar (tahıl, gıda, süt, odun, çelik, parça, elektrik, araç...) | ≈ 29 | **Ülkeden bağımsız çekirdek**; her ülkede aynı `id` | İlk 12'si; ilçe seviyesiyle 22 ve 29'a çıkar |
| **Tier 2: Bölgesel imza** | Bir coğrafyanın kimliği: ürün (fındık, yaş çay, kayısı, pamuk, antep fıstığı), ara/son ürün (zeytinyağı, kuru çay) ve imza sanayi (yassı çelik, beyaz eşya) | il başına 2–4; toplam **40–80** (başlangıç 45) | Mal kataloğunda ortak; **hangi ilin imzası olduğu** `ulke + il` veri kaydıdır | **Yalnız kendi ilinin** 2–4 imzası |
| **Tier 3: Lüks, zanaat ve coğrafi işaretli** | (a) **Zanaat/lüks mal:** halı, çini, ipek kumaş... (8 ayrı mal; nadir, yüksek değer, sipariş-bazlı). (b) **Coğrafi işaretli kimlik kaydı:** Geyve ayvası, Gemlik zeytini, İzmit pişmaniyesi gibi, bir Tier 1/2 malın **etiketli, primli sürümü** | (a) 8; (b) yüzlerce (TÜRKPATENT'te 1.863 tescil [K5]; ilk dilimde 150–250 küratörlü) | `ulke + il + koruma sistemi` veri kaydı | Hayır; **keşfedilince** açılır |

**Keşfedildikçe açılış.** Katalog büyüklüğü, görünürlük kuralıyla oyuncudan saklanır (ayrıntı §7.5): Tier 1 ilçe gelişim seviyesine ([11 §7.4](../11-urun-donusu.md)) göre; Tier 2 kendi ilinde baştan, başka illerde pazar/fuar/sözleşme yoluyla; Tier 3 imza ilçede ilk üretim, ilk sipariş veya fuarla. **Keşif bir görünürlüktür, üretim izni değil:** imza mal yalnız imza ilde (uygunluk) üretilir; başka yerde pazardan alınır ve işlenir. "Ürün Atlası" ekranı keşfi başarım ve merak olarak kullanır (başarımlar "ilk" ilkesiyle, [11 §7.1](../11-urun-donusu.md)).

**Mal kapısı (hangi kademeye, hangi koşulla).**

| Kademe | Açılma koşulu |
|---|---|
| Tier 1 | Üç testten en az ikisi: (1) ayrı pazar fiyatı ve talebi, (2) ayrı bozulma ve takvim ritmi, (3) zincirde ayrı ara kademe |
| Tier 2 | (1) En az bir ilin kimliğini taşıyan, ayrı fiyatı olan ürün **ve** (2) bir kaynak kanıtı (coğrafi işaret, il sıralaması veya TÜİK/Bakanlık verisi) |
| Tier 3a | Nadir, düşük hacimli, yüksek değerli ve sipariş-bazlı satılan zanaat/lüks ürün |
| Tier 3b | Tescilli (menşe/mahreç/geleneksel) bir ürün; **yeni stok kalemi açmaz**, kalite etiketi olur |

**Sınırlar.**

| # | Kural | Gerekçe |
|---|---|---|
| S-1 | Mal sayısına **üst sınır yok**; Tier 1 ≈ 25–35, Tier 2 40–80, Tier 3a ≈ 8–20 | Sahip kararı; çeşitlilik gerçek coğrafyadan gelir |
| S-2 | Oyuncuya **görünen** mal başta ≈ 16 (Tier 1'den 12 + kendi ilinin 2–4 imzası), kalıcı üst sınır ≈ 28 (Tier 1 tamamı + imzalar); keşfedilenler "Ürün Atlası"nda durur, pazar ekranında yalnız **ilgili** olanlar | Okunurluk; 8 mercek ve 5 maddelik Dikkat paneli ([11 §9](../11-urun-donusu.md)) |
| S-3 | İl başına hedef 2–4 Tier 2 imza (sanayi ağırlıklı illerde 0–1); bir ilçede en çok 2 imza zinciri | Kimlik net, seçim sayısı sınırlı |
| S-4 | Yeni yapı yok (en çok 19); içerik **yöntem**, **etiket** ve **veri kaydı** olarak gelir | Kod yolu aynı kalır |
| S-5 | İmza çıktı bonusu küçük (+%10); fiyat primi kalite kademesinde (§6.2c) | "Tek en iyi imza" ve H1 tersine dönmesi riski |
| S-6 | Tier 1 `id`'leri ve zincirleri **ülkeye özgü olamaz** | Ülke genişlemesi (§7.6) |
| S-7 | Tier 3b kayıtları stok kalemi açmaz | Stok ve pazar tablosu şişmez |

---

## 4. Tarım

### 4.1 Gerçek bölgesel ürün kimliği

| Ürün | Kimlik bölgesi | Gerçek veri | Oyun karşılığı |
|---|---|---|---|
| **Fındık** † | Ordu, Samsun, Düzce, Giresun, Sakarya, Trabzon | 2024 üretim ≈ 717 bin ton; Ordu 202 bin, Samsun 114 bin, Düzce 95,5 bin, Giresun 94 bin [K6]. Sakarya ilçeleri: Karasu, Hendek, Kocaali, Akyazı, Kaynarca [K21]. Türkiye dünya fındığının yarısından fazlasını üretir [K9]. 2025 rekolte −%38,5 [K7] | `findik` imza malı; çok yıllık bahçe yöntemi; hasat penceresi Ağustos–Eylül; TMO alımı (§6) |
| **Çay** † | Rize (yaş çay üretiminin ≈ %67'si), Trabzon, Artvin, Giresun, Ordu | 1,25–1,3 milyon ton yaş çay; 787 bin dekar, ≈ 201 bin üretici; 207 fabrika (47 ÇAYKUR, 160 özel; 119'u Rize'de); Mayıs–Ekim arası 3 sürgün, bazı yıllar 4 [K8] | `yas_cay` imza malı; çok hızlı bozulur; aynı gün işleme |
| **Pamuk** † | Şanlıurfa %41,7, Diyarbakır %18,2, Aydın %11,6, Hatay %7,3, İzmir %6,7 [K16] | "Çukurova pamuğu" tarihî kimliktir; bugün ağırlık GAP'tadır | `pamuk` imza malı; kurak tip; sulama bağı |
| **Zeytin** † | Ege %53, Marmara %18, Akdeniz %23; Ege'de üretimin %55'i yağlık, Marmara'da %60'ı sofralık [K17]; Gemlik zeytini coğrafi işaretli [K1] | Hasat Ekim–Ocak (Ege); Gemlik sofralık Ekim–Kasım, yağlık Kasım–Ocak [K17]. 2025 −%34,7 [K7] | `zeytin` → `zeytinyagi` ya da sofralık (`gida` imzası) |
| **İncir** † | Aydın (menşe adı; AB tescilli) [K4] | Türkiye dünya incir üretiminde birinci, ≈ 356 bin ton [K9] | `kuru_meyve` imzası |
| **Kayısı** † | Malatya | Türkiye kuru kayısı ihracatının ≈ %85'i; hasat 15 Haziran–Temmuz sonu; ≈ 9 milyon ağaç [K18] | `taze` → `kuru_meyve` |
| **Buğday** † | Konya (üretimin ≈ %10'u; ekmeklik %11, makarnalık %25) [K19] | Konya Ovası hasadı 2,3 milyon ton mertebesinde [K19]; TMO hububat alımı Haziran'da açıklanır [K34] | `tahil` (mevcut); Konya `bugday` ekim payı bonusu |
| **Mısır** † | Sakarya (Marmara'nın önde gelen ili; Arifiye'de Mısır Araştırma Enstitüsü) | Vali açıklaması: 400 bin tonun üzerinde (2018) [K21] | `misir` yeni ekim ürünü ve yem |
| **Hamsi / su ürünleri** † | Karadeniz kıyı illeri | 2024 toplam su ürünü ≈ 933 bin ton; yetiştiricilik %61,8; hamsi 153 bin ton (en çok avlanan) [K10]; av dönemi 1 Eylül–15 Nisan, 15 Nisan–1 Eylül av yasağı [K11] | `balik`; av dönemi eğrisi |
| **Bal** † | Ordu (kovan başına verim), Muğla (çam balı), Ege %19 | 2024: ≈ 8,96 milyon koloni, ≈ 95,5 bin ton bal; Doğu Karadeniz 14 kg/koloni [K12] | Arılık yöntemi (tozlaşma bonusu) |
| **Hayvancılık** † | Doğu Anadolu, Karadeniz yaylaları, Marmara | 2025: büyükbaş 17,7 milyon (manda 164 bin), küçükbaş 57,9 milyon [K13] | `sut`, `yun`; ahır ve mera yöntemleri |
| **Sera** † | Antalya (317 bin dekar), Mersin (177 bin dekar) | Toplam ≈ 76 bin hektar; %90'ı Antalya, Mersin, Adana, Muğla, İzmir; jeotermal ısıtmalı ≈ 6,97 milyon m²; domates %45 [K14] | Sera yöntemi |
| **Orman** † | Karadeniz (%24,4) | Orman 22,9 milyon hektar (%29,2); endüstriyel odun 2022'de 25,5 milyon m³ [K15] | `odun`; yenilenebilir rezerv |
| **Kestane** † | Aydın üretim lideri; Bursa (İnegöl, Orhaneli çevresi) hasat Eylül ikinci hafta–Ekim [K20] | Bursa kestane şekeri AB tescilli [K1] | `kestane` (Tier 2); kestane şekeri Tier 3b kaydı (`gida` üzerinde) |

### 4.2 Alfa-0 illeri: ilçe düzeyinde imza

İklim tipi eşlemesi **geçicidir**: Marmara için ayrı tip yoktur (Q3).

| İl | İlçe / alan | İmza (gerçek kanıt) | Oyun karşılığı | Geçici iklim tipi |
|---|---|---|---|---|
| **Kocaeli** † | Kandıra | Manda yoğurdu, karpuz coğrafi işaretli; Kandıra bezi ve dartısı [K2]; ormanlık kıyı (genel bilgi) | `sut` → `sut_urunu` (manda; Tier 3b); `odun`; `dokuma_zanaat` (bez) | karadeniz |
| | Körfez (Tütünçiftlik) | Tüpraş İzmit Rafinerisi, yıllık ≈ 11,3 milyon ton, Avrupa'nın en büyük on rafinerisinden biri [K22] | `rafineri`; `petrokimya` | akdeniz |
| | Gebze, İzmit, Gölcük | Otomotiv (Ford Otosan, Hyundai, Honda, Isuzu yatırımı); Kartonsan (1967; kaplamalı karton) ve SEKA mirası [K22, K30]; Kocaeli konteynerde ≈ 2,5 milyon TEU [K37] | `arac`; `kagit`; liman | akdeniz |
| | Hereke | Hereke yün, yün-ipek ve ipek halısı coğrafi işaretli; Fabrika-i Hümayun 1843; çift düğüm [K28] | `hali` (Tier 3a) | akdeniz |
| | İzmit, Gebze, Karamürsel | İzmit pişmaniyesi, İzmit simidi, Gebze bayram çöreği, Karamürsel sepeti ve simit dolması [K2] | `gida` imzası (tatlı/hamur) | akdeniz |
| **Sakarya** † | Karasu, Hendek, Kocaali, Akyazı, Kaynarca | Fındık: Karasu 18,8 bin, Hendek 13,7 bin, Kocaali 12,6 bin, Akyazı 6,7 bin, Kaynarca 4,4 bin ton (tahmin) [K21] | `findik` → `findik_urunu` | karadeniz |
| | Ovalar (Adapazarı, Hendek) | Mısır, 400 bin ton üzeri; Mısır Araştırma Enstitüsü Arifiye [K21] | `misir` (ekim ürünü ve yem) | karadeniz |
| | Arifiye, Hendek | Toyota (Arifiye; 280 bin araç/yıl kapasite), Otokar, TürkTraktör; 2026'nın ilk 8 ayında 143 bin araç üretimi, 97 bin ihracat; otomotiv ihracatın %67,8'i [K25] | `arac` (otomobil, ticari, traktör, otobüs) | karadeniz |
| | Adapazarı | TÜVASAŞ (1951), raylı sistem aracı [K25] | `arac` raylı varyantı (kamu ihalesi) | karadeniz |
| | Geyve, Pamukova, Adapazarı, Taraklı | Geyve ayvası (2020 menşe adı) [K3]; Adapazarı beyaz kestane kabağı; Pamukova kavunu; Kocaali hurma kurusu; Abhaz peyniri [K3] | Tier 3b kayıtları (`taze`, `sut_urunu` üzerinde) | karadeniz |
| **Bursa** † | Merkez, Nilüfer, Osmangazi, Mudanya | Oyak Renault (390 bin araç/yıl kapasite, %80 ihracat), Tofaş, Karsan; Türkiye otomobilinin ≈ yarısı [K23]; BOSB'de yüzlerce yan sanayi [K24] | `arac`; `parca` (yan sanayi); OSB | akdeniz |
| | Gemlik | Gemlik zeytini (2005, AB tescilli); Gemport araç elleçlemesi 2024'te 167,6 bin adet [K1, K37] | `zeytin` → `zeytinyagi`/sofralık; RoRo liman | akdeniz |
| | İnegöl | Mobilya: ≈ 3 000 işyeri; mobilya ihracatında İstanbul'dan sonra 910 milyon dolar [K32]; İnegöl köftesi, çıbrıka, cerrah fasulyesi [K1] | `mobilya`; `kereste` | karasal |
| | Merkez, Koza Han | İpekböcekçiliği altın dönemi 16. yüzyıl; Koza Han 1491, koza ticareti [K29]; Bursa ipeği coğrafi işaretli [K1] | `koza` → `ipek` → `ipek_kumas` (Tier 3a) | akdeniz |
| | İznik | İznik çinisi (2009 menşe adı); İznik Müşküle üzümü [K1] | `cini` (Tier 3a) | akdeniz |
| | Karacabey, Mustafakemalpaşa, Orhaneli | Karacabey soğanı, Bursa şeftalisi (2019), Bursa siyah inciri (2018), Gürsu Deveci armudu, Hasanağa enginarı [K1]; kestane [K20] | `seftali`, `kestane`, `patates` (Tier 2); Tier 3b kayıtları | akdeniz |
| | Uludağ ve yamaçları | Dağ ve orman (genel bilgi) | `odun`; `mera` | dag_yayla |

Bursa'nın 29 coğrafi işareti Marmara'da birinci sıradadır [K1]; Kocaeli'nin 13, Sakarya'nın 10 civarında işareti vardır [K2, K3] (tescil/başvuru ayrımı kaynaklarda net değildir; sayı **yaklaşık**tır ve TÜRKPATENT kaydından doğrulanmalıdır).

### 4.3 81 il: imza ürün tablosu (ön öneri)

Tablo **üç kademeyi** birlikte gösterir: Tier 2 sütunu mal kataloğundaki kimlikleri (§7.3), Tier 3 sütunu zanaat malı (`kod` biçimli) veya coğrafi işaretli/geleneksel kimlik kaydı örneklerini (§7.4), Tier 1 sütunu ilin ağırlıklı temel/ham malını verir. İmza adedi hedef olarak **il başına 2–4**; sanayi ağırlıklı (Kırıkkale, Karabük, Zonguldak, Batman, Kütahya) ve tarımda tek ürüne dayanan veya henüz kaynakla doğrulanmamış illerde (Kırşehir, Yozgat, Düzce) 0–1 Tier 2 imzası vardır, Tier 1 öne çıkar; veri hattında tamamlanır. Tablodaki 81 ilde toplam 45 benzersiz Tier 2 malı kullanılır (`ipek`, `cay`, `findik_urunu` ara ürünlerdir; ham ürünün il satırından türer). Güvenilirlik: `†` doğrulandı; işaretsiz satırlar **genel bilgi/ön öneri** ve veri hattı öncesi doğrulanmalıdır; Tier 3 sütunundaki adlar bu turda TÜRKPATENT kaydından tek tek sınanmadı (Alfa-0 illeri [K1–K3] dışında). Genel sıralama ölçütü: kültür atlası listeleri [K40] ve coğrafi işaret sayıları (Gaziantep 109, Konya 92, Hatay 75, Erzurum 62, Diyarbakır 59; toplam 1.863 tescil) [K5]. Karadeniz Bölgesi 369 tescille başı çeker [K5]. İklim tipi sütunu **öneridir**; gerçek sınıflama CHELSA'dan türetilir ([08 §1.5](../08-alti-katman.md)).

| Plaka | İl | **Tier 2 imza** (mal `id`, 2–4) | **Tier 3** örnekleri (zanaat; coğrafi işaretli kayıt) | Tier 1 ağırlığı | İklim tipi |
|---:|---|---|---|---|---|
| 01 | Adana | `pamuk`, `narenciye`, `sera_sebze` | Adana kebabı (mahreç) | `misir` (2. ürün), `gida` | akdeniz |
| 02 | Adıyaman | `tutun`, `pamuk` | Adıyaman çiğ köftesi | `tahil` | kurak |
| 03 | Afyonkarahisar | `hashas`, `mermer`, `sarkuteri` | Afyon sucuğu, Afyon kaymağı | `sut_urunu` | karasal |
| 04 | Ağrı | `bal`, `yun` | Ağrı balı | `sut` | dag_yayla |
| 05 | Amasya | `elma`, `kiraz` | Amasya Misket elması | — | karasal |
| 06 | Ankara | `yun` (tiftik), `bakliyat` | Ankara tiftiği (Angora) | `tahil`, `elektronik`, `muhimmat` | karasal |
| 07 | Antalya † | `sera_sebze`, `narenciye`, `muz` | Finike portakalı | `taze` | akdeniz |
| 08 | Artvin | `bal`, `yas_cay`, `kestane` | Artvin Karakovan balı | `odun` | karadeniz |
| 09 | Aydın † | `incir`, `zeytin`, `kestane`, `pamuk` | Aydın inciri (menşe, AB tescilli) | — | akdeniz |
| 10 | Balıkesir | `zeytinyagi`, `bor`, `zeytin` | Edremit körfezi zeytinyağı | `sut` | akdeniz |
| 11 | Bilecik | `mermer`, `seramik` | Bilecik bej mermeri | — | karasal |
| 12 | Bingöl | `bal`, `yun` | Bingöl balı | `sut` | dag_yayla |
| 13 | Bitlis | `tutun`, `bal` | Ahlat taşı (`tas_isleme`) | `et` | dag_yayla |
| 14 | Bolu | `patates`, `bal` | — | `odun`, `kereste`, `et` (kümes) | karadeniz |
| 15 | Burdur | `ceviz`, `hashas` | Burdur ceviz ezmesi | `tahil` | karasal |
| 16 | **Bursa †** | `seftali`, `kestane`, `zeytin`, `koza` | `ipek_kumas`, `cini` (İznik), `bicak_demir` (Bursa bıçağı); Gemlik zeytini, Bursa şeftalisi, kestane şekeri (kayıtlar; toplam 29 [K1]) | `arac`, `tekstil`, `mobilya` (İnegöl), `parca` | akdeniz (+ dag_yayla) |
| 17 | Çanakkale | `zeytin`, `seramik` | Ezine peyniri | `sut_urunu` | akdeniz |
| 18 | Çankırı | `tuz`, `bakliyat` | Çankırı kaya tuzu | — | karasal |
| 19 | Çorum | `bakliyat`, `aycicegi` | Çorum leblebisi | `tahil` | karasal |
| 20 | Denizli † | `uzum`, `mermer` | Denizli havlusu (`tekstil` kalite kaydı) | `tekstil`, `iplik` | akdeniz |
| 21 | Diyarbakır | `pamuk`, `bakliyat` | Diyarbakır karpuzu | `taze` | kurak |
| 22 | Edirne | `aycicegi`, `pirinc` | Edirne badem ezmesi | `tahil` | balkan_kita |
| 23 | Elazığ | `uzum`, `yun` | Öküzgözü üzümü | `sut` | karasal |
| 24 | Erzincan | `bal`, `yun` | Erzincan tulum peyniri | `sut_urunu` | dag_yayla |
| 25 | Erzurum | `bal`, `yun` | Oltu taşı (`tas_isleme`) | `sut`, `et` | dag_yayla |
| 26 | Eskişehir † | `seker_pancari`, `beyaz_esya` | Lületaşı (`tas_isleme`) | `arac` (raylı) | karasal |
| 27 | Gaziantep † | `antep_fistigi`, `baharat` | Antep baklavası (kayıt; 109 işaretle ilk sırada [K5]) | `tekstil`, `un` | kurak |
| 28 | Giresun † | `findik`, `kiraz` | Giresun fındığı | `odun` | karadeniz |
| 29 | Gümüşhane | `kuru_meyve` (pestil, köme), `bal` | Gümüşhane pestili | `et` | dag_yayla |
| 30 | Hakkâri | `bal`, `yun` | Hakkâri balı | `sut` | dag_yayla |
| 31 | Hatay | `zeytinyagi`, `narenciye`, `pamuk` | Antakya künefesi | `celik` | akdeniz |
| 32 | Isparta | `gul`, `elma` | Isparta gül yağı | `tekstil` (halı geleneği, genel) | karasal |
| 33 | Mersin † | `narenciye`, `sera_sebze` | Anamur muzu | `taze` (liman) | akdeniz |
| 34 | İstanbul † | `gemi`, `balik` | Lokum (geleneksel ürün adı [K4]) | `tekstil`, `arac` (liman) | akdeniz (Marmara) |
| 35 | İzmir | `incir`, `uzum`, `zeytinyagi`, `pamuk` | İzmir boyozu | `petrokimya` (Aliağa) | akdeniz |
| 36 | Kars | `bal`, `yun` | Kars kaşarı | `sut_urunu` | dag_yayla |
| 37 | Kastamonu | `sarimsak`, `sarkuteri` | Taşköprü sarımsağı | `odun` | karadeniz |
| 38 | Kayseri † | `sarkuteri`, `patates` | Kayseri pastırması | `mobilya` | karasal |
| 39 | Kırklareli | `aycicegi`, `balik` | Kırklareli hardaliyesi | `tahil` | balkan_kita |
| 40 | Kırşehir | `bakliyat` | Kırşehir çullaması | `tahil` | karasal |
| 41 | **Kocaeli †** | `zeytin` (Karamürsel), `findik` (Değirmendere) | `hali` (Hereke), `sepet_hasir` (Karamürsel), `dokuma_zanaat` (Kandıra bezi); İzmit pişmaniyesi, Kandıra manda yoğurdu (kayıtlar; toplam 13 [K2]) | `petrokimya`, `arac`, `kagit`, `cimento`, `sut` (manda), `odun` | akdeniz (+ karadeniz) |
| 42 | Konya † | `seker_pancari`, `bakliyat` | Konya etli ekmeği | `tahil` (≈ %10), `un`, `sut` | karasal |
| 43 | Kütahya † | `seramik` | `cini` (Kütahya çinisi) | `komur` (linyit) | karasal |
| 44 | Malatya † | `kayisi`, `kuru_meyve` | Malatya kayısısı (menşe, AB tescilli) | `tekstil` | karasal |
| 45 | Manisa | `uzum`, `zeytin`, `beyaz_esya` | Manisa mesir macunu | `elektronik` | akdeniz |
| 46 | Kahramanmaraş | `baharat` (pul biber), `pamuk` | Maraş dondurması | `tekstil` | kurak |
| 47 | Mardin | `bakliyat`, `uzum` | `telkari` (Mardin telkârisi) | `tahil` | kurak |
| 48 | Muğla † | `bal` (çam), `zeytin`, `mermer` | Muğla çam balı | — | akdeniz |
| 49 | Muş | `bal`, `yun` | — | `sut`, `tahil` | dag_yayla |
| 50 | Nevşehir | `patates`, `uzum` | Nevşehir testi kebabı | — | karasal |
| 51 | Niğde | `elma`, `patates` | Niğde elması | — | karasal |
| 52 | Ordu † | `findik`, `bal` | Ordu fındığı | `odun` | karadeniz |
| 53 | Rize † | `yas_cay`, `kivi`, `bal` | Rize çayı (coğrafi işaret [K8]) | `odun` | karadeniz |
| 54 | **Sakarya †** | `findik`, `ceviz` | Geyve ayvası, Adapazarı beyaz kestane kabağı, Pamukova kavunu, Abhaz peyniri, Kocaali hurma kurusu (kayıtlar; toplam ≈ 10 [K3]) | `misir`, `arac`, `parca`, `sut` | karadeniz |
| 55 | Samsun † | `findik`, `tutun`, `aycicegi` | Bafra pidesi | `tahil` (liman) | karadeniz |
| 56 | Siirt | `antep_fistigi`, `bal` | `dokuma_zanaat` (Siirt battaniyesi) | `yun` | kurak |
| 57 | Sinop | `balik`, `findik` | Sinop nokulu | `odun` | karadeniz |
| 58 | Sivas | `yun`, `seker_pancari` | — | `cevher` (Divriği) | karasal |
| 59 | Tekirdağ | `aycicegi`, `uzum` | Tekirdağ köftesi | `tekstil`, `arac` (liman) | balkan_kita |
| 60 | Tokat | `seker_pancari`, `uzum`, `tutun` | Tokat yazması (`dokuma_zanaat`, genel) | `tahil` | karasal |
| 61 | Trabzon † | `yas_cay`, `findik`, `balik` | Vakfıkebir ekmeği | `odun` | karadeniz |
| 62 | Tunceli | `bal`, `yun` | Tunceli dutu | `sut` | dag_yayla |
| 63 | Şanlıurfa † | `pamuk`, `bakliyat`, `baharat` | Urfa isotu | `tahil` | kurak |
| 64 | Uşak | `seker_pancari`, `bakliyat` | Uşak tarhanası | `tekstil`, `un` | karasal |
| 65 | Van | `yun`, `balik` (inci kefali) | Van otlu peyniri | `sut_urunu` | dag_yayla |
| 66 | Yozgat | `bakliyat` | Yozgat testi kebabı | `tahil`, `sut` | karasal |
| 67 | Zonguldak † | `yassi_celik` (Ereğli, Erdemir ≈ 3,5 Mt/yıl), `balik` | — | `komur` (taşkömürü), `celik` | karadeniz |
| 68 | Aksaray | `patates`, `bakliyat` | — | `tahil` | karasal |
| 69 | Bayburt | `bal`, `yun` | `dokuma_zanaat` (Bayburt ehramı) | `sut` | dag_yayla |
| 70 | Karaman | `elma`, `bakliyat` | Karaman elması | `un` | karasal |
| 71 | Kırıkkale | — (Tier 1 ağırlıklı) | — | `yakit` (rafineri), `muhimmat`, `celik` | karasal |
| 72 | Batman | `pamuk` | — | `petrol` (damar), `yakit` | kurak |
| 73 | Şırnak | `bal`, `yun` | — | `komur` (asfaltit) | dag_yayla |
| 74 | Bartın | `balik`, `bal` | `sepet_hasir` (Bartın tel kırması) | `odun`, `komur` (Amasra) | karadeniz |
| 75 | Ardahan | `bal`, `yun` | Ardahan kaşarı | `sut`, `sut_urunu` | dag_yayla |
| 76 | Iğdır | `kayisi`, `pamuk` | Iğdır kayısısı | — | kurak |
| 77 | Yalova | `gemi`, `sera_sebze`, `kivi` | Yalova kivisi | — | akdeniz (Marmara) |
| 78 | Karabük † | `baharat` (Safranbolu safranı) | Safranbolu lokumu | `celik` (Kardemir ≈ 1 Mt/yıl; 1939), `komur` | karadeniz |
| 79 | Kilis | `zeytinyagi`, `zeytin` | Kilis zeytinyağı | — | kurak |
| 80 | Osmaniye | `yer_fistigi`, `narenciye`, `pamuk` | Osmaniye yer fıstığı | — | akdeniz |
| 81 | Düzce † | `findik` | — | `odun`, `kereste`, `mobilya` | karadeniz |

Çelik tesisleri için kaynaklar: Kardemir ilk entegre tesis, ilk yüksek fırın Eylül 1939, kapasite ≈ 1 milyon ton [K26]; Erdemir 1965'te üretime başladı, ≈ 3,5 milyon ton ham çelik, tek entegre yassı çelik üreticisi [K26].

**Veri modeli (öneri; ülke genişlemesine uygun).** `il-imza.json`: `{ ulke: "TR", il, iklimTipi, imza: [{ malId, kademe: 2|3, tur?: "mensei"|"mahrec"|"gelenek", koruma?: "TURKPATENT", ilce?, carpanPpm }] }`. `tur` değerleri coğrafi işaret türlerine karşılık gelir: **menşe adı** (tüm üretim aşamaları o alanda), **mahreç işareti** (ün ya da özellik bölgeyle ilişkili; aşamaların hepsi orada olmayabilir), **geleneksel ürün adı** (en az 30 yıllık) [K4]. Bu ayrım kalite kademesinin dayanağıdır (§6.2). Başka ülke eklemek kod değil **yeni veri dosyası** demektir (§7.6).

### 4.4 Ürün zincirleri (3–4 kademe)

| # | Zincir | Kademeler (mal → mal) | Yapı ve yöntem | Kimlik | Alfa |
|---|---|---|---|---|---|
| Z1 | **Fındık** | `findik` → `findik_urunu` (kırma, kavurma, iç) → `gida` (ezme, çikolata, baklava; "fındıklı" imza kalitesi) | Tarla (bahçe yöntemi) → Gıda fabrikası → Gıda fabrikası | Sakarya, Giresun, Ordu, Düzce | A0 |
| Z2 | **Çay** | `yas_cay` → `cay` (kuru; ≈ 4–5 kg yaş çaydan 1 kg) [K8*] → paketli marka (kalite K1/K2) | Tarla (çay yöntemi) → Gıda fabrikası (çay işleme) | Rize, Trabzon | A1 |
| Z3 | **Süt** | `sut` → `sut_urunu` (yoğurt, kaymak, peynir) → `gida` (tatlı, hamur işi) | Ahır/Mera → Gıda fabrikası (mandıra yöntemi) | Kandıra (manda), Kars (kaşar), Sakarya (Abhaz peyniri) | A0 (manda), A1 (peynir olgunlaştırma) |
| Z4 | **Zeytin** | `zeytin` → `zeytinyagi` (yağhane) ya da `gida` (sofralık, Gemlik); yan ürün pirina → `gubre` ya da düşük `yakit` | Tarla (bahçe) → Gıda fabrikası | Bursa (Gemlik), İzmir, Aydın, Balıkesir | A0 |
| Z5 | **Tahıl ve mısır** | `tahil` → `un` → `gida` (ekmek, makarna); `misir` → yem (ahır girdisi) ya da `gida` | Tarla → Gıda fabrikası; Ahır | Konya, Sakarya | A0 (mısır, ahır yemi), A0-ops (un) |
| Z6 | **İpek ve halı** | `koza` → `ipek` (iplik) → dokuma → `hali` / `ipek_kumas` (Tier 3a) | Tarla (koza) → atölye → atölye | Bursa, Kocaeli (Hereke) | A0-ops |
| Z7 | **Pamuk ve yün** | `pamuk`/`yun` → `iplik` → `tekstil` (kumaş, havlu, hazır giyim) | Tarla/Mera → atölye → atölye | Şanlıurfa, Aydın → Bursa, Denizli | A1 |
| Z8 | **Orman** | `odun` → `kereste` → `mobilya`; `odun` → `kagit` | Mera (orman yöntemi) → atölye | Kandıra, Düzce, Bolu → İnegöl | A0-ops |
| Z9 | **Meyve ve kuru meyve** | `taze` → `kuru_meyve` (kurutma) → ihracat; `taze` → `gida` (reçel, pekmez, kestane şekeri) | Tarla (bahçe) → Gıda fabrikası | Malatya, Aydın, Bursa | A1 |
| Z10 | **Su ürünleri** | `balik` → `gida` (tuzlama, konserve) → ihracat; yan ürün balık unu → yem | Tarla (su ürünleri yöntemi, kıyı) → Gıda fabrikası | Karadeniz kıyısı | A1 |

\*Kuru çay oranı için iki kaynak ≈ 4 ve ≈ 5 kg yaş çay verir; ÇAYKUR randıman beklentisi %20–22 civarındadır (arama özeti, birincil kaynak doğrulanmadı).

**Katma değer sınaması (her kademe için).** Kademe çıktısının değeri girdisinin değerinden **1,15–1,5 kat** fazla olmalı (mevcut: yüksek fırın ≈ 1,37; parça ≈ 1,22; elektronik ≈ 2,35; gıda işleme ≈ 1,8; hesap: Σ çıktı×taban fiyat / Σ girdi×taban fiyat). Zanaat/niş zincirlerde **2–4 kat**, ama hacim çok düşük. Örnek (fındık, göreli fiyat `findik` 85, `findik_urunu` 190, 100 birim kabuklu → ≈ 50 birim iç): 100×85 = 8 500 + elektrik 80 → 50×190 = 9 500; oran ≈ 1,10. Yan ürün (kabuk → biyokütle) ve ikinci kademe (ezme/çikolata) oranı 1,2'nin üzerine çıkarır. Bu sayılar **ilk tahmindir**, bot ölçümüyle ayarlanır.

### 4.5 İklim takvimi: ürün takvim profili

**Gerçek ritim (özet).** Hasat/ekim dönemleri:

| Ürün | Ekim/dikim | Hasat dönemi | Alfa-0 başlangıcında (Ekim–Kasım) |
|---|---|---|---|
| Buğday (kışlık) | Ekim–Kasım (genel bilgi) | Haziran–Temmuz; TMO alım fiyatı Haziran'da açıklanır [K34] | **Ekim zamanı** (etkin) |
| Mısır (tane) | Nisan–Mayıs (genel bilgi) | Eylül–Ekim (genel bilgi) | hasat bitiyor |
| Fındık | çok yıllık | Ağustos–Eylül; TMO alımı 24 Ağustos'tan [K34] | **dönem dışı**; stoktan işleme, borsa |
| Çay | çok yıllık | Mayıs–Ekim, 3 sürgün [K8] | bitiyor |
| Zeytin | çok yıllık | Ekim–Ocak (Ege); Gemlik sofralık Ekim–Kasım, yağlık Kasım–Ocak [K17] | **etkin** |
| Kestane | çok yıllık | Eylül ikinci hafta–Ekim [K20] | bitiyor |
| Hamsi | — | Eylül–Nisan av dönemi; Nisan–Eylül av yasağı [K11] | **etkin** |
| Kayısı | çok yıllık | Haziran–Temmuz [K18] | dönem dışı |
| Pamuk | Nisan–Mayıs (genel bilgi) | Eylül–Ekim (genel bilgi) | bitiyor |
| Şeftali / incir | çok yıllık | Haziran–Eylül / Ağustos–Eylül (genel bilgi) | dönem dışı |
| Süt, odun | — | yıl boyu (süt baharda tepe, genel bilgi) | etkin |
| Sera | — | yıl boyu | etkin |

**Öneri: `urunPencerePpm` ve `yogunlukPpm`.** Mevcut `hasatEgrisiPpm[iklimTipi][ay]` (yıllık ortalaması 1 000 000) iklim tipinin genel ritmini verir. Ürün düzeyi için her ürüne 12 aylık **pencere** (ortalaması 1 000 000) ve genel bir **yoğunluk** parametresi eklenir:

```
urunProfil[ay]  = (PPM − yogunlukPpm) + yogunlukPpm × urunPencerePpm[ay] / PPM            // yogunlukPpm: 0 = düz akış, PPM = gerçek tek dönem
hasatPpm        = egri(iklimTipi, takvimGunu) × urunProfil / PPM                           // 08 §0.2-a enterpolasyonu ürün profiline de uygulanır
```

Örnek pencere (×1 000 000; toplam 12): fındık {Ağu 7, Eyl 5, diğer 0}; zeytin {Eki 3, Kas 4, Ara 3, Oca 2, diğer 0}; çay {May–Eki eşit 2, diğer 0}; kayısı {Haz 6, Tem 6}. Yoğunluk Alfa-0'da **0,1–0,3** ile başlar: oyuncu yıl boyu akış görür ama hasat dönemi tepe yapar; Alfa-1'de yükseltilir. Yıllık toplam değişmez; yalnız zamanlama değişir (08 T2 ilkesi).

**Çok yıllık bahçe gerçekçiliği (A1).** Zeytin ve fındıkta bir yıl yüksek, bir yıl düşük rekolte (periyodisite) ve bahar donu duyarlılığı vardır. Öneri: `periyodisite` ±%15–25 iki yıllık dalga (deterministik, bölge tohumuyla); dikim sonrası ilk verime 3–5 oyun günü. 2025 örneği [K7] olay şablonudur (§4.7 T12).

**Önemli açık soru (Q2).** İklim takvimi 1x gerçek zamanda yıl = 365 gündür; 30 günlük oyuncu tek bir ayı görür ve hasat dönemi hiç yaşanmayabilir. Seçenekler: **(A)** 1x kalır, yoğunluk 0,1–0,3, her ilde en az bir yıl boyu etkin imza; **(B)** `iklim.gunCarpani` = 6 (1 oyun ayı ≈ 5 gerçek gün; 25. gün ≈ 5 ay), hasat dönemi oyuncunun ömründe görünür; ölçüm takımı zaten `gunCarpani = 12` ile çalışır ([08 §0.2](../08-alti-katman.md)). B'nin bedeli: iklim olayları daha sık, bozulma ve inşa süreleri saat bazlı kaldığından denge yeniden ayarlanır. Karar lider ve sahip.

### 4.6 Sera, su ürünleri, orman, arılık ve hayvancılık: yapılara nasıl oturur?

18 yapı sabit kalır; yeni içerik mevcut yapıların **yöntem aileleri** olur:

| Konu | Yapı | Yeni yöntem ailesi | Etiket/koşul | Not |
|---|---|---|---|---|
| Bahçe (fındık, zeytin, çay, meyve) | Tarla (`ciftlik`) | `bahce_findik`, `bahce_zeytin`, `bahce_cay`, `bahce_meyve` | hücre uygunluğu (GAEZ benzeri, ova ve yamaç) | `gerekliRezerv: tahil` kuralı ürün uygunluğuna genişler |
| Sera | Tarla | `sera` (yüksek verim, yakıt/elektrik, don ve kuraklık duyarsızlığı) | `kiyi`/`ova`; jeotermal bonusu (A1+) | Antalya, Mersin, Yalova |
| Su ürünleri | Tarla (kıyı hücresi) | `av_balikcilik` (av dönemi eğrisi), `yetistiricilik` (yem + elektrik; hastalık olayı) | `kiyi` etiketi | Levrek, çipura, alabalık: yetiştiricilik üretimin %61,8'i [K10] |
| Orman | Mera (`mera`, 3 yuva, dağ/yayla) | `orman_isletmesi`: `odun`; yenilenebilir rezerv (kesim > yenilenme ise orman azalır) | `orman` etiketi | Karadeniz'de orman bolluğu [K15]; sürdürülebilir kesim kararı |
| Arılık | Mera | `arilik`: `gida` (bal imzası: çam, kestane, çiçek) + komşu bahçelere **tozlaşma bonusu** (+%5–10, menzil 2 kenar) | `orman` veya `ova` | Muğla çam balı, Ordu, Artvin [K12] |
| Hayvancılık türleri | Ahır/Mera | `ahir_manda`, `ahir_sut`, `mera_koyun_yun`, `kumes` | türe göre | Büyükbaş 17,7 M, küçükbaş 57,9 M [K13]; Kandıra manda coğrafi işaretli [K2] |

### 4.7 Tarım çeşitlilik öğeleri (12)

Maliyet: **S** = yalnız JSON/parametre; **M** = yeni yöntem veya mekanik + test; **L** = çekirdek tip/sistem değişikliği. Öncelik: **A0** = Alfa-0 çekirdeği, **A0-ops** = Alfa-0 isteğe bağlı, **A1** = Alfa-1, **Sonra**.

| # | Öğe | Tür | Oyuncuya etkisi | Maliyet | `icerik.json` ilişkisi | Öncelik |
|---|---|---|---|---|---|---|
| T1 | **İl imzası** (2–4 imza; imza ürün çıktı +%10) | bölgesel bonus | İl kimliği kartı; "hangi ilde ne iyi" sorusu yanıt kazanır (H1) | S | `il-imza.json`; `BolgeTanimi.imza` | A0 |
| T2 | **Ürün takvim penceresi + yoğunluk** | mekanik (olay-benzeri) | Hasat dönemi tepesi, depo ve satış zamanlaması (H2) | M | `parametreler.iklim.urunPencerePpm` (yeni) | A0 (yoğunluk 0,1–0,3) |
| T3 | **Ekim planı genişlemesi:** `misir` (yüksek verim, toprağı tüketir, silaj/yem) ve bakliyat çeşitleri | mal/ekim ürünü | Mısır–yem–ahır bağı; toprak kararı zenginleşir | S | `tarimUrunleri` + `misir` malı | A0 |
| T4 | **Bahçe yöntemleri** (fındık, zeytin, meyve) | yapı varyantı (yöntem) | Zeytin ve fındık zinciri açılır; Sakarya ve Bursa kimliği | M | `ciftlik` yöntemleri; `findik`, `zeytin`, `taze` malları | A0 |
| T5 | **Çok yıllık bahçe gerçekçiliği** (dikim gecikmesi, periyodisite, don duyarlılığı) | mekanik | Yatırım kararı ve "iyi yıl / kötü yıl" riski | M | `olaylar.don` duyarlılığı ürün bazlı | A1 |
| T6 | **Hayvancılık türleri** (manda, süt sığırı, koyun-yün, kümes) | yapı varyantı | Kandıra manda sütü, yün; ahır tahıl/mısır yem rekabeti | M | `ahir_besi`, `mera_hayvancilik` ailesi; `sut`, `yun` | A0-ops (manda) / A1 |
| T7 | **Olgunlaştırma** (peynir, soğuk sıkım zeytinyağı: bekleme → kalite) | mekanik | "Bekle ve değer kat" kararı; ambar değeri | M | Gıda fabrikası yöntemi + kalite alanı (P9'a bağlı) | A1 |
| T8 | **Sera yöntemi** | yapı varyantı | Don/kuraklıktan bağımsız yüksek verim; enerji maliyeti | M | `ciftlik`; `sulama_kanali` bağı | A1 |
| T9 | **Su ürünleri** (av dönemi + yetiştiricilik) | yapı varyantı + olay | Av dönemi eğrisi, yem maliyeti, hastalık olayı | M | `ciftlik` yöntemleri, `balik` | A1 |
| T10 | **Orman işletmesi** (yenilenebilir rezerv) | yapı varyantı | `odun` ve `kereste` zinciri; kesim hızı kararı | M | `mera` yöntemi; rezerv modeli (08 S5 benzeri, yenilenir) | A0-ops |
| T11 | **Arılık ve tozlaşma bonusu** | yapı varyantı + bölgesel bonus | Bal niş malı; komşu bahçe verimi ↑ | M | `mera` yöntemi; `gida` bal imzası | A1 |
| T12 | **Tarım olay şablonları:** bahar donu (bahçeye), dolu, zararlı salgını, bolluk yılı | olay | Rekolte çöküşü/bolluğu → fiyat şoku; ambar ve ithalat kararı | S (don duyarlılığı) / M (dolu, salgın) | `parametreler.iklim.olaylar` yeni türler; 2025 örneği [K7] | A0 (don) |

---

## 5. Sanayi

### 5.1 Bölgesel sanayi kimliği

| İl | Kimlik | Gerçek kanıt | Oyun karşılığı | Alfa |
|---|---|---|---|---|
| **Kocaeli** † | Rafineri ve petrokimya, otomotiv, kağıt-karton, liman | Tüpraş İzmit ≈ 11,3 Mt/yıl [K22]; Kocaeli konteynerde ≈ 2,5 M TEU [K37]; Kartonsan, SEKA mirası [K30] | `rafineri` + `petrokimya`; `arac`; `kagit`; liman | A0 |
| **Bursa** † | Otomotiv (OEM + yan sanayi), tekstil ve ipek, mobilya (İnegöl) | Oyak Renault, Tofaş, Karsan; Türkiye otomobilinin ≈ yarısı Bursa'da [K23]; BOSB yan sanayi [K24]; İnegöl mobilya ihracatı 910 M$ [K32] | `arac`, `parca`, `tekstil`, `mobilya`; OSB | A0 |
| **Sakarya** † | Otomotiv (Toyota, Otokar, TürkTraktör) ve raylı araç (TÜVASAŞ) | 2026'nın ilk 8 ayında 143 bin araç, otomotiv ihracatın %67,8'i [K25] | `arac` (otomobil/ticari/traktör), raylı varyant | A0 |
| **Zonguldak** † | Taşkömürü ve Ereğli çeliği | Erdemir ≈ 3,5 Mt/yıl ham çelik [K26] | `derin_komur` bonusu; `celikhane` | A1 |
| **Karabük** † | Entegre demir-çelik | Kardemir ≈ 1 Mt/yıl; ilk yüksek fırın 1939 [K26] | `yuksek_firin` kimliği | A1 |
| **Denizli** † | Havlu ve ev tekstili | Havlu/chenille/peluş üreticileri, DOSB [K31] | `tekstil` (havlu) | A1 |
| **Kayseri** † | Mobilya | İstikbal 1957'de Kayseri'de bir marangoz atölyesinden doğdu [K31]; mobilya ihracatında 600 M$ [K32] | `mobilya` | A1 |
| **Eskişehir** † | Raylı sistem | TÜLOMSAŞ, TÜVASAŞ ulusal lokomotif ve tren seti üreticileri [K31] | `arac` raylı varyantı | A1 |
| **Gaziantep** † | Gıda (fıstık, baklava), tekstil ve halı | 109 coğrafi işaret [K5]; mobilya ihracatı 590 M$ [K32] | `gida` imzası; `tekstil` | A1 |
| **Kütahya** † | Çini, porselen | Çinicilik 14. yüzyıldan; ≈ 500 atölye [K27] | `cini` (Tier 3a) | A1 |
| **Kırıkkale** | Rafineri, mühimmat (genel bilgi) | — | `muhimmat` kimliği | Sonra |

### 5.2 Hammadde → ara mal → son ürün zincirleri (3–4 kademe)

| # | Zincir | Kademeler | Yapı ve yöntem | Yeni mal | Alfa |
|---|---|---|---|---|---|
| S-Z1 | **Metal → araç** | `cevher` + `komur` → `celik` → `parca` → **`arac`** | Maden ocağı → Çelikhane → Parça atölyesi → Parça atölyesi (araç montajı; ölçek M+) | `arac` | A0 |
| S-Z2 | **Petrol → petrokimya → araç/ambalaj** | `petrol` → `yakit` ve `petrokimya` → `arac` (plastik, kauçuk parça), `kagit` (ambalaj bonusu), `gubre` | Petrol kuyusu → Rafineri (petrokimya yöntemi) → ... | `petrokimya` | A0 |
| S-Z3 | **Elektronik** (mevcut) | `bakir` + `silis` → `elektronik` → `arac`, tüketim | Bakır madeni, Silis ocağı → Elektronik | — | M |
| S-Z4 | **Raylı sistem** | `celik` + `parca` + `elektronik` → `arac` (raylı varyant; kamu ihalesi) | Parça atölyesi (ağır montaj) | — | A1 |
| S-Z5 | **Kağıt-karton** | `odun` → (hamur) → `kagit` → ambalaj bonusu | Mera (orman) → hafif sanayi yöntemi | `kagit` | A0-ops |
| S-Z6 | **Mobilya** | `odun` → `kereste` → `mobilya` | Mera (orman) → hafif sanayi → hafif sanayi | `kereste`, `mobilya` | A0-ops |
| S-Z7 | **Tekstil** | `pamuk`/`yun` → `iplik` → `tekstil` | Tarla/Mera → hafif sanayi → hafif sanayi | `iplik`, `tekstil` | A1 |
| S-Z8 | **Ipek/halı/çini (niş)** | `koza` → `ipek` → `ipek_kumas`/`hali`; `silis` + elektrik + yakıt → `cini` | Usta atölyesi (§5.3) | `koza`, `ipek`, Tier 3a malları | A0-ops |

**Araç montajı varyantları (tek mal, yöntem farkı).** `arac_otomobil` (elektronik ve parça ağır; Bursa, Sakarya), `arac_ticari` (çelik ağır; Kocaeli), `arac_traktor_otobus` (parça ve çelik; Sakarya), `arac_rayli` (çelik, elektronik; kamu ihalesi). Böylece üç Alfa-0 ilinde otomotiv olsa da **ilin kimliği yöntem karışımıyla** ayrışır (H1).

**Hafif sanayi için yapı.** Bugünkü 18 yapıda mobilya, kağıt, iplik ve tekstil için uygun bir fabrika türü yoktur. İki seçenek: **(A)** `parca_fabrikasi` yapısına yöntem aileleri eklemek (en çok 19 yapı kuralına dokunmaz; ama "parça atölyesi" adı yanıltıcı olur), **(B)** [11 Ü5](../11-urun-donusu.md) kapsamındaki 19. yapı olarak **"Hafif sanayi tesisi"** eklemek (arayüz ve imar payı eşlemesi gerekir, L). Öneri: Alfa-0'da (A), Alfa-1'de ölçümle (B) (Q1).

### 5.3 Zanaat ve niş lüks mallar

| Zanaat | Kimlik | Gerçek kanıt | Oyun kuralı |
|---|---|---|---|
| **Hereke halısı** | Kocaeli (Hereke) | Hereke yün, yün-ipek, ipek halısı coğrafi işaretli; 1843; çift düğüm (Gördes düğümü); ipek halıda cm² başına 100 düğüm ortalaması, bir örnekte 1.024 [K28] | `zanaat` (halı); girdi `ipek` + `yun`; menşe şartı: Hereke hücreleri |
| **Bursa ipeği** | Bursa | İpek ve çini UNESCO Yaratıcı Şehirler Ağı kapsamında [K27]; Koza Han 1491 [K29]; Bursa ipeği coğrafi işaretli [K1] | `koza` → `ipek` → `zanaat` (kumaş) |
| **İznik çinisi** | Bursa (İznik) | 2009 menşe adı [K1]; 18. yüzyılda İznik'te sönmüş, Kütahya atölyeleri sürdürmüş [K27] | `zanaat` (çini); girdi `silis`, yakıt, elektrik |
| **Kütahya çinisi** | Kütahya | 14. yüzyıldan; ≈ 500 atölye; ihracat [K27] | `zanaat` (çini) |
| **Kandıra bezi, Karamürsel sepeti** | Kocaeli | Coğrafi işaretli [K2] | `zanaat` (düşük fiyat sınıfı) |

**Mekanik (öneri).** `zanaat` bir **ailedir** (Tier 3a: `hali`, `cini`, `ipek_kumas`, `dokuma_zanaat`, `telkari`, `tas_isleme`, `bicak_demir`, `sepet_hasir`; §7.4), **F4–F5** fiyat sınıfı (≈ 300–900 para/birim), çok düşük hacim:

- Yapı: `parca_fabrikasi`/hafif sanayi içinde **"usta atölyesi"** yöntem ailesi; **ölçek tavanı S/M** (otomasyon çıktı çarpmaz); işçi yoğun, ama işçi başına katma değer yüksek.
- **Menşe şartı:** zanaat K2 (menşe) kalitesini yalnız imza ilçede ve girdi zinciri aynı ilçede ise alır; aksi hâlde K0.
- **Talep:** yalnızca NPC "Lüks koleksiyoncu / otel-müze" alıcısı ve fuar dönemi; haftalık 1–3 sipariş (hacim sınırlı), bu yüzden "fazla üret, sat" döngüsü yoktur: **sipariş-bazlıdır.**
- Ödül: 20–25. gün tazeliği; "ilk Hereke halısı ihracatı" başarımı ([11 §7.1](../11-urun-donusu.md) başarımlar "ilk" ilkesi).

### 5.4 OSB (Organize Sanayi Bölgesi) mekaniği

**Gerçek.** 4562 sayılı Organize Sanayi Bölgeleri Kanunu; OSB tüzel kişiliğiyle **altyapı ve ortak hizmet tesislerini** (elektrik, su, kanalizasyon, doğal gaz, arıtma, yol) kurma ve işletme yetkisini taşır; parselleri yönetim kurulu belirlediği ilkelerle **tahsis eder**; imar planı OSB tarafından hazırlanır, Bakanlık onaylar [K33]. Bursa'da BOSB çevresinde yüzlerce yan sanayi tedarikçisi çalışır [K24]; Denizli OSB firma listeleri yayımlar [K31].

**Oyun karşılığı: "Sanayi Adası".** Hazır arsa adaları (4–12 hücre; [11 ek karar](../11-urun-donusu.md)) arasında ilçe meclisinin **sanayi imar payından** ayırdığı adalardan biri OSB bayrağı alır:

| Etki | Başlangıç değeri (öneri; kalibre edilmedi) | Karşı bedel |
|---|---|---|
| Elektrik iletim kaybı | `iletimKaybiPpm` 50 000 → adada **0** (ortak şebeke) | Giriş: hücre fiyatı **×1,5** (katılım payı) |
| Kirlilik komşu yayılımı | adadan çıkan yayılım **×0,5** (ortak arıtma) | Yalnız sanayi yapıları; tarım ve konut yok |
| Bakım girdisi | **−%10** (ortak servis) | Haftalık aidat: arazi değerinin %0,2'si |
| İnşa süresi | **×0,9** (hazır altyapı) | İlçede en çok **1 OSB** (A0) |
| **Kümelenme** (aynı adada ardışık zincir kademeleri, ör. çelik → parça → araç) | her kademe çifti için çıktı **+%5**, en çok **+%15** | Kademeler arası taşıma otomatiktir, ek kural yok |

Yönetim: OSB kararları (aidat, katılım) ilçe meclisine bağlı alt yetkidir (Alfa-0'da NPC varsayılanı; [11 §7.6](../11-urun-donusu.md)). **Tarıma dayalı sanayi** için OSB benzeri ada, gıda ve tarım işleme yapıları için ayrı bayrak olarak düşünülebilir (genel bilgi: Türkiye'de tarıma dayalı ihtisas OSB türü vardır, doğrulanmadı) (A1).

### 5.5 Sanayi çeşitlilik öğeleri (12)

| # | Öğe | Tür | Oyuncuya etkisi | Maliyet | `icerik.json` ilişkisi | Öncelik |
|---|---|---|---|---|---|---|
| S1 | **Petrokimya dalı** | yapı varyantı (yöntem) | Rafineri sonrası ikinci kademe; Kocaeli kimliği | M | `rafineri` tesisine `petrokimya_hatti`; `petrokimya` malı | A0 |
| S2 | **Araç montajı** (otomobil, ticari, traktör-otobüs) | yapı varyantı | Zincirin dördüncü kademesi; ölçek M+ gerekir | M | `parca_fabrikasi` yöntemleri; `arac` malı | A0 |
| S3 | **Raylı araç varyantı** (kamu ihalesi) | yapı varyantı + sözleşme | Sakarya/Eskişehir kimliği; ihale teslimi | M | `arac_rayli`; P-sözleşme (§6) | A1 |
| S4 | **Sanayi Adası / OSB** | bölgesel bonus + yapı bayrağı | Kümelenme, elektrik ve kirlilik avantajı; giriş bedeli | M | `iletimKaybiPpm`, `kirlilik.komsuYayilimPpmGun`, `mulk.yapiInsaSaati` | A0 |
| S5 | **Zincir kümelenmesi** (ilçeler arası) | bölgesel bonus | Aynı ilde ardışık kademeye +%; il kimliği güçlenir | M | Sanayi `olcekKademeleri` benzeri çarpan | A1 |
| S6 | **Hafif sanayi aileleri** (mobilya, kağıt, iplik, tekstil) | yapı varyantı (veya 19. yapı) | Orman/tarım hammaddesinden tüketim mallarına geçiş | M (A) / L (B) | `parca_fabrikasi` yöntemleri ya da yeni tesis türü | A0 |
| S7 | **Tekstil ve ipek zinciri** | mal zinciri | Bursa, Denizli kimliği; `pamuk`, `yun`, `koza` girdisi | M | `iplik`, `tekstil`, `ipek` | A0-ops |
| S8 | **Mobilya ve kağıt zinciri** | mal zinciri | İnegöl, Kocaeli kimliği; `odun` talebi | M | `kereste`, `mobilya`, `kagit` | A0-ops |
| S9 | **Zanaat atölyesi** (usta işi; niş lüks) | yapı varyantı + kalite | Düşük hacim, yüksek değer; sipariş-bazlı; menşe şartı | M | Tier 3a zanaat malları; menşe etiketi | A0 |
| S10 | **Ağır sanayi kimlikleri** (Zonguldak kömür, Karabük–Ereğli çelik) | bölgesel bonus | Damar zenginliği + tarihî tesis bonusu | S | `damar` ve `rezerv` verisi | A1 |
| S11 | **Savunma-sanayi kimliği** (mühimmat; Kırıkkale, Ankara) | bölgesel bonus + sözleşme | Ordugâh ve kamu siparişi besleme | M | `muhimmat_fabrikasi` yöntemi | A1 |
| S12 | **Yenilenebilir enerji** (rüzgâr, güneş, jeotermal) | yapı varyantı | Ege/Marmara'da elektrik çeşitliliği | M | `santral` yöntemleri; `hidro.akarsuEgrisiPpm` benzeri eğri | Sonra |

---

## 6. Pazar

### 6.1 Gerçek mekanizmalar

| Mekanizma | Gerçek | Kaynak |
|---|---|---|
| **Taban fiyatlı devlet alımı** | TMO kabuklu fındık alımı 24 Ağustos'tan başlar; Giresun ve Levant kalitesi ayrı fiyatlanır; randıman primi; 16 noktada başlar, 61'e çıkabilir; randevu sistemi; ödeme 21. günde. Hububat alım ve satış fiyatları Haziran'da açıklanır; ödeme 45 gün içinde | [K34] |
| **Ticaret borsası** | İl borsaları günlük fiyat yazar (ör. Giresun Ticaret Borsası fındık fiyatı; randıman 50 bazlı) | [K39] |
| **Depo senedi (ELÜS) ve ürün borsası** | TÜRİB (2018): lisanslı depodaki mal elektronik ürün senedine dönüşür ve işlem görür; hububat, baklagil, fındık, zeytin, kuru kayısı, pamuk gibi ürünler; 257 lisanslı depo işletmesi; illerdeki ticaret borsaları acente | [K35] |
| **Sözleşmeli tarım** | Üretici ile alıcı (firma) arasında ekimde belirlenen koşullarla garantili alım; Bakanlık tip sözleşme ve yönetmelik; sözleşme 15 gün içinde il/ilçe müdürlüğüne teslim; alıcı teknik destek maliyetini üreticiye yansıtamaz | [K36] |
| **Yerel pazar (semt pazarı) ve hal** | Belediye düzenlemesiyle haftalık pazar günleri (genel bilgi); sebze-meyve ticareti hal yasasıyla düzenlenir (genel bilgi, doğrulanmadı) | — |
| **Fuarlar** | İzmir Enternasyonal Fuarı (Türkiye'nin ilk uluslararası fuarı, Eylül'de, Kültürpark); Growtech Antalya (dünyanın en büyük örtüaltı tarım fuarı; 2025'te 36 ülkeden 725 katılımcı) | [K38] |
| **İhracat limanları** | 2025'te Ambarlı ≈ 3,43 M TEU (%24,5), Kocaeli ≈ 2,5 M, Tekirdağ ≈ 2,1 M, Mersin ≈ 1,9 M TEU; Gemlik araç ihracatında bölgenin kapısı | [K37] |

### 6.2 Oyunda nasıl görünür?

**(a) Yerel pazar günü.** Her ilçenin haftada 1–2 pazar günü vardır (ilçeler arası dönüşümlü). O gün ilçe içinde `taze`, `gida`, `sut_urunu`, `balik`, `bal` ve `dokuma_zanaat`/`sepet_hasir` için NPC makası yerine **yerel makas** (daha dar: −%3) geçerlidir, ama **hacim tavanı** (ilçe nüfusuna bağlı) vardır; talep +%15. Oyuncuya haftalık ritim verir ("Salı Karacabey pazarı"), [11 §7.1](../11-urun-donusu.md) haftalık halka ile uyumludur.

**(b) İklim takvimli fiyat dalgası.** Mevcut fiyat formülü ([08 §5.2](../08-alti-katman.md)): `fiyat = taban × (1 + e × clamp((T−A)/min(T,A), −1, +1))`, `e = 0,75`. Hasat dönemi arzı artırır:

```
arzEfektif[mal] = arzSaat[mal] × urunProfil[mal][ay] / PPM          // §4.5; ürün profilinde yoğunluk 0,1–0,3
```

Örnek (fındık, yoğunluk 0,10; talep T = 1): Ağustos profili 1,6 → (1−1,6)/1 = −0,6 → fiyat ×0,55; Eylül 1,4 → ×0,70; dönem dışı 0,9 → ×1,08. Yıllık dalga ≈ 1,4–2×; **ambar** (08 L4) ile "hasat fazlasını sonraya taşı" kararı doğar. **Talep takvimi** da eklenir: kış yakacağı (Kasım–Şubat: `odun`, `komur`, `yakit`), kış hazırlığı (Eylül–Ekim: bulgur, salça, turşu; `gida`), bayramlar ve Ramazan (tatlı, `sut_urunu`, hurma/`kuru_meyve`) için deterministik takvim tablosu (genel bilgi).

**(c) Marka ve kalite kademeleri.**

| Kademe | Koşul | Fiyat primi (öneri) | Gerçek dayanak |
|---|---|---:|---|
| **K0 Standart** | Her yerde | ×1,00 | — |
| **K1 Mahreç** | İmza ilçede **bir** zincir aşaması (üretim ya da işleme) | ×1,12 | Mahreç işareti: ün/özellik bölgeyle ilişkili [K4] |
| **K2 Menşe** | İmza ilçede **tüm** aşamalar (kapalı zincir) | ×1,25 | Menşe adı: tüm üretim aşamaları aynı alanda [K4] |

Kalite yalnız **imza mallara** uygulanır (Gemlik zeytinyağı, Hereke halısı, Giresun fındığı...). Stok tarafında kalite **mal başına ağırlıklı ortalama** (tek `kalitePpm`) olarak tutulur; ayrı stok kalemi açılmaz (mal sayısı şişmez). Bu, `tipler.ts` ve stok muhasebesine alan ekler (L; lider onayı).

**(d) Fuarlar.** Takvimli olay: İzmir Fuarı (Eylül), tarım/sera fuarı (Kasım), sanayi fuarı. Fuar dönemi: marka ve niş mallar için yeni NPC "ihracatçı heyeti" alıcısı, talep +%20, **Teknoloji yayılımı** bonusu (08 TK3). Alfa-0 açılışı 1 Ekim'e denk gelir: ilk 30 günde 1 fuar olayı.

**(e) Ticaret borsası ve taban fiyat alımı.** İl borsası (Ticaret ofisi yöntemi): günlük il fiyat bandı (NPC emilim/arzdan) ve oyuncunun satış "kaydı". Devlet alım kurumu (TMO tipi) NPC'si: `tahil` (Haziran) ve `findik` (Ağustos) için **dönemsel taban fiyat** ve oyuncu başına kota; hazine maliyeti vardır ([08 D5 bütçe kolu](../08-alti-katman.md)). Gerçek TMO fiyatları oyuna bağlanmaz (K22).

**(f) Sözleşmeli tarım (ön alım) ve depo senedi.**

| Tür | Kural (öneri) | Teslim | Teminat/ceza | Kapsam |
|---|---|---|---|---|
| **Ön alım** (sözleşmeli tarım) | Ekim öncesi NPC firma sabit fiyatla alım taahhüdü; avans %20 | Hasat dönemi penceresi | Teslim edilemeyen kısım için fiyat farkı ve teminat kaybı | A0-ops (NPC alıcı) |
| **Tedarik sözleşmesi** | Mevcut 08 P5: ≤ 14 gün, ≤ 3 açık sözleşme, teminat %20 | Lojistikle | Teminat karşı tarafa | A1 (oyuncular arası) |
| **Depo senedi** | Ambara konan mal "senet" olur; mal taşınmadan satılır; kısmi avans | Ambar çıkışı | Bozulma ambar kuralına tabi | A1 |
| **Kamu ihalesi** | Raylı araç, kağıt, mühimmat: çoklu teslim, kalite şartı | Parti parti | Gecikme cezası | A1 |

**Kapsam sınırı.** Bu mekanizma "vadeli işlemlerin basit hâlidir": **teslimatlı ileri sözleşme.** Açığa satış, opsiyon, kaldıraç, nakitle fark kapatma ve emir defteri **yoktur** ([08 §5.9](../08-alti-katman.md)). TÜRİB'in vadeli sözleşmeleri gerçekte vardır [K35]; oyunda yalnız teslimata dayalı hâli alınır.

**(g) NPC tüccar tipleri.**

| # | Tip | Ne alır | Fiyat davranışı | Dönem/koşul | Alfa |
|---|---|---|---|---|---|
| 1 | **Hal komisyoncusu** (toptancı) | `taze`, `sut_urunu`, `balik` | Geniş makas (−%12); hızlı bozulan mallar için günlük | Sabah talebi; ilçe/il içi | A0 |
| 2 | **Sanayi alıcısı** (fabrika tedarikçisi) | `celik`, `parca`, `petrokimya`, `iplik`, `kereste` | Dar makas (−%5); sözleşmeli | Teslim penceresi | A0 |
| 3 | **İhracatçı heyeti** (liman) | `findik_urunu`, `kuru_meyve`, `zeytinyagi`, `mobilya`, `arac` | Liman primi etkili; fuar dönemi talep ↑ | Yalnız limanlı il | A0 |
| 4 | **Devlet alım kurumu** (TMO tipi) | `tahil`, `findik` | Taban fiyat; oyuncu başı kota | Hasat sonrası dönem | A0-ops |
| 5 | **Lüks koleksiyoncu / otel-müze** | Tier 3a mallar (`hali`, `cini`, `ipek_kumas`), `ipek` | Yüksek fiyat, düşük hacim; sipariş-bazlı | Haftalık 1–3 sipariş | A0-ops |
| 6 | **Gezgin pazarcı** (köy pazarı) | `gida` (bal, peynir), `taze` | Küçük hacim, fiyat primi (+) | Pazar günü | A1 |

NPC'ler **deterministiktir**; kâr peşinde hareket etmez ([08 §5.9](../08-alti-katman.md)).

**(h) Kıtlık ve bolluk olayları.** Bolluk: rekolte iyi → fiyat çöker, bozulma baskısı, ihracat fırsatı. Kıtlık: kuraklık/don → fiyat sıçrar, ithalat/tarife kararı, kıtlık cezası (08 P4). Her ikisi **24 saat önceden "Rekolte haberi"** olarak yayımlanır (bülten: TÜİK/TMO rekolte tahmini benzeri). Şablon: 2025'te fındık −%38,5, zeytin −%34,7, ceviz −%38,2, Antep fıstığı −%61,5, meyve-baharat grubu −%30,9 [K7].

### 6.3 İhracat kapıları

`BolgeTanimi.liman` ([08 §5.5](../08-alti-katman.md)) alanına **uzmanlık** eklenir: `konteyner` (Ambarlı, Kocaeli, Mersin), `roro_arac` (Gemlik, Derince/Kocaeli), `dokme` (Karadeniz kömür-çelik limanları), `tarim_ihracat` (Mersin, İzmir) [K37]. Uzmanlık eşleşen mala liman primini düşürür (ör. araç ihracatı Gemlik'te prim ×0,5); eşleşmeyen malda prim aynıdır. Gemport 2024'te 167,6 bin araç elleçledi [K37]: Bursa otomotivinin gerçek çıkışı.

### 6.4 Pazar çeşitlilik öğeleri (12)

| # | Öğe | Tür | Oyuncuya etkisi | Maliyet | `icerik.json`/08 ilişkisi | Öncelik |
|---|---|---|---|---|---|---|
| P1 | **Yerel pazar günü** | olay + bölgesel bonus | Haftalık ritim; ilçe içi doğrudan satış, dar makas, hacim tavanı | M | `pazar.makasPpm` yerel varyant | A0 |
| P2 | **İklim takvimli fiyat dalgası + talep takvimi** | mekanik | Hasat tepesi fiyat düşüşü; kış yakacağı ve bayram talebi; depo kararı | S | `arzSaat × urunProfil`; formül mevcut | A0 |
| P3 | **İl ticaret borsası** | yapı varyantı (Ticaret ofisi) | Günlük il fiyatı; kayıtlı satış | M | `ticaret_emri`; Ticaret ofisi | A1 |
| P4 | **Taban fiyat alımı** (TMO tipi) | sözleşme + devlet kolu | Hasat sonrası taban; hazine maliyeti | M | 08 D5 bütçe kolu | A1 |
| P5 | **Ön alım / sözleşmeli tarım** | sözleşme türü | Ekim öncesi sabit fiyat; teslim riski | M | 08 P5 genişler | A0-ops |
| P6 | **Depo senedi** | sözleşme türü | Mal taşımadan satış; kısmi avans | M | Ambar (08 L4) | A1 |
| P7 | **Fuarlar** | olay | Marka/niş talep, yeni NPC alıcı, teknoloji yayılımı | S | Takvim olayı | A1 |
| P8 | **NPC tüccar tipleri (6)** | NPC | Fiyat, hacim, koşul çeşitliliği | M | 08 P2 NPC piyasa yapıcı | A0 (4 tip) |
| P9 | **Marka/kalite kademeleri** (K0–K2) | kalite kademesi | Menşe/mahreç primi; kapalı zincir ödülü | L | Stok `kalitePpm`; `tipler.ts` | A1 |
| P10 | **Bolluk/kıtlık olayı + rekolte haberi** | olay | 24 saat uyarı; ambar, ithalat, tarife kararı | S | 08 T3, P4; olay şablonları | A0 |
| P11 | **Liman uzmanlığı** (konteyner, RoRo, dökme, tarım) | bölgesel bonus | Doğru limana doğru mal; Gemlik/Derince kimliği | S | `BolgeTanimi.liman.uzmanlik` | A0-ops |
| P12 | **Oyuncu–oyuncu ileri teslim ve emir defteri** | sözleşme | Gerçek fiyat keşfi | L | 08 §5.4 v1.5 kapısı | Sonra |

---

## 7. Kademeli mal kataloğu

**Kısaltmalar.** Bozulma: **Y** yavaş (≤ 3 000 ppm/gün), **Or** orta (8 000–25 000), **H** hızlı (40 000–80 000), **A** anlık (≥ 150 000; aynı gün işleme). Fiyat sınıfı (göreli taban fiyat, para/birim; mevcut: `tahil` 30, `gida` 70, `celik` 120, `parca` 180, `elektronik` 400): F1 < 40, F2 40–100, F3 100–250, F4 250–800, F5 > 800. Öncelik: M = mevcut; A0 = Alfa-0 çekirdeği; A0-ops = Alfa-0 isteğe bağlı; A1; Sonra. Fiyatlar ve bozulma değerleri **ilk tahmindir**, kalibre edilmedi.

### 7.1 Özet

| Kademe | Mal sayısı | Mevcut | Yeni | Alfa-0 çekirdeği | Alfa-0 isteğe bağlı | Alfa-1 | Sonra |
|---|---:|---:|---:|---:|---:|---:|---:|
| Tier 1 temel | 29 | 14 | 15 | 20 | 9 | 0 | 0 |
| Tier 2 bölgesel imza | 45 | 0 | 45 | 9 | 0 | 19 | 17 |
| Tier 3a zanaat/lüks | 8 | 0 | 8 | 6 | 0 | 2 | 0 |
| **Toplam mal** | **82** | 14 | 68 | **35** | **9** | **21** | **17** |
| Tier 3b coğrafi işaret kaydı | veri (stok kalemi değil) | | ≈ 150–250 ilk dilim | ≈ 52 (Bursa 29, Kocaeli 13, Sakarya 10) | | kalan iller | |

Tier 2 için 45 başlangıç değeridir; Türkiye'de ilçe imzaları derinleştikçe **80'e** kadar genişleyebilir (ör. Akdeniz sebze-meyve çeşitleri, bölgesel tahıllar). Katalog büyüse de oyuncunun ekranı §7.5'teki görünürlük kuralıyla küçük kalır.

### 7.2 Tier 1: temel mallar (29; ülkeden bağımsız çekirdek)

| # | `id` | Ad | Kategori | Zincirdeki yeri | Boz. | Fiyat | Açıldığı ilçe seviyesi | Öncelik |
|---:|---|---|---|---|---|---|---|---|
| 1 | `tahil` | Tahıl | ham | → `un`, ahır | Or | F1 (30) | Köy | M |
| 2 | `gida` | Gıda | tüketim | zincirlerin son halkası | Or | F2 (70) | Köy | M |
| 3 | `elektrik` | Elektrik | enerji | tüm tesisler | — | F1 (10) | Köy | M |
| 4 | `gubre` | Gübre | ara | → tarım | Y | F3 (140) | Köy | M |
| 5 | `yakit` | Yakıt | ara | taşıma, enerji | Y | F3 (100) | Köy | M |
| 6 | `parca` | Makine Parçası | ara | → `arac`, bakım | Y | F3 (180) | Köy | M |
| 7 | `celik` | Çelik | ara | → `parca`, `arac`, `cimento` | Y | F3 (120) | Köy | M |
| 8 | `misir` | Mısır | ham | → `gida`, ahır yemi | Or | F1 (28) | Köy | A0 |
| 9 | `sut` | Süt | ham | → `sut_urunu` | H | F2 (40) | Köy | A0 |
| 10 | `odun` | Odun (tomruk) | ham | → `kereste`, `kagit`, yakacak | Y | F1 (22) | Köy | A0 |
| 11 | `taze` | Taze Meyve-Sebze | ham | → `gida`, `kuru_meyve` | H | F2 (55) | Köy | A0-ops |
| 12 | `et` | Et ve Kümes | ham | → `gida`, hal | H | F3 (110) | Köy | A0-ops |
| 13 | `un` | Un ve Makarna | ara | → `gida` | Or | F2 (50) | Kasaba | A0-ops |
| 14 | `sut_urunu` | Süt Ürünleri | ara/tüketim | → `gida`, hal | Or | F3 (120) | Kasaba | A0 |
| 15 | `kereste` | Kereste ve Levha | ara | → `mobilya` | Y | F2 (70) | Kasaba | A0-ops |
| 16 | `iplik` | İplik | ara | → `tekstil` | Y | F3 (130) | Kasaba | A0-ops |
| 17 | `kagit` | Kağıt ve Karton | ara | ambalaj bonusu | Y | F2 (90) | Kasaba | A0-ops |
| 18 | `cevher` | Demir Cevheri | ham | → `celik` | Y | F1 (35) | Kasaba | M |
| 19 | `komur` | Kömür | ham | → `celik`, enerji | Y | F1 (30) | Kasaba | M |
| 20 | `bakir` | Bakır | ham | → `elektronik` | Y | F2 (50) | Kasaba | M |
| 21 | `silis` | Silis | ham | → `elektronik`, `cini` | Y | F1 (25) | Kasaba | M |
| 22 | `petrol` | Ham Petrol | ham | → `yakit`, `petrokimya` | Y | F2 (60) | Kasaba | M |
| 23 | `elektronik` | Elektronik | tüketim | → `arac` | Y | F4 (400) | Merkez | M |
| 24 | `muhimmat` | Mühimmat | askeri | → birlik | Y | F3 (150) | Merkez | M |
| 25 | `petrokimya` | Petrokimya | ara | → `arac`, ambalaj, `gubre` | Y | F3 (140) | Merkez | A0 |
| 26 | `tekstil` | Tekstil (kumaş, havlu, giyim) | tüketim | ihracat | Y | F4 (250) | Merkez | A0-ops |
| 27 | `mobilya` | Mobilya | tüketim | ihracat | Y | F3 (230) | Merkez | A0-ops |
| 28 | `cimento` | Çimento | ara | ortak projeler (köprü, liman, baraj; [11 §7.11](../11-urun-donusu.md)) | Y | F2 (45) | Merkez | A0-ops |
| 29 | `arac` | Araç | tüketim | ihracat | Y | F4 (700) | Merkez | A0 |

Tier 1 ilçe seviyesi açılışı: **Köy 12** (`tahil`, `gida`, `elektrik`, `gubre`, `yakit`, `parca`, `celik`, `misir`, `sut`, `odun`, `taze`, `et`), **Kasaba +10 = 22**, **Merkez/Şehir +7 = 29** ([11 §7.4](../11-urun-donusu.md): Köy → Kasaba → Merkez → Şehir). Mevcut `baslangic.stok` listesindeki mallar stokta durur; yalnızca **pazar ve ekran listesinde** seviyeye göre görünür.

### 7.3 Tier 2: bölgesel imza malları (45 başlangıç; il başına 2–4)

Tür: **H** hammadde/tarım, **A** ara/işlenmiş, **S** sanayi. Ana iller sütunu §4.3 tablosuyla uyumludur.

| # | `id` | Ad | Tür | Ana iller | Zincir | Boz. | Fiyat | Öncelik |
|---:|---|---|---|---|---|---|---|---|
| 1 | `findik` | Fındık (kabuklu) | H | Ordu, Giresun, Samsun, Düzce, Sakarya, Trabzon | → `findik_urunu` | Y | F2 (85) | A0 |
| 2 | `zeytin` | Zeytin | H | Bursa (Gemlik), Aydın, İzmir, Balıkesir, Hatay | → `zeytinyagi`, sofralık `gida` | Or | F2 (45) | A0 |
| 3 | `ceviz` | Ceviz | H | Sakarya (Sapanca), Burdur | → `gida` (ezme) | Y | F2 (95) | A0 |
| 4 | `seftali` | Şeftali | H | Bursa | → `gida`, `kuru_meyve` | H | F2 (55) | A0 |
| 5 | `kestane` | Kestane | H | Aydın, Bursa, Artvin | → `gida` (şeker) | Or | F2 (75) | A0 |
| 6 | `koza` | İpek Kozası | H | Bursa | → `ipek` | H | F3 (110) | A0 |
| 7 | `zeytinyagi` | Zeytinyağı | A | Bursa, İzmir, Balıkesir, Hatay, Kilis | ihracat, `gida` | Y | F3 (170) | A0 |
| 8 | `findik_urunu` | İşlenmiş Fındık | A | Sakarya, Giresun, Ordu | → `gida`, ihracat | Y | F3 (190) | A0 |
| 9 | `ipek` | İpek İpliği | A | Bursa | → `ipek_kumas`, `hali` | Y | F4 (300) | A0 |
| 10 | `yas_cay` | Yaş Çay | H | Rize, Trabzon, Artvin | → `cay` | A | F1 (30) | A1 |
| 11 | `cay` | Kuru Çay | A | Rize, Trabzon | iç pazar, ihracat | Y | F3 (150) | A1 |
| 12 | `pamuk` | Pamuk | H | Şanlıurfa, Aydın, Diyarbakır, Hatay | → `iplik` | Y | F2 (70) | A1 |
| 13 | `yun` | Yün, Kıl ve Tiftik | H | Doğu Anadolu, Ankara | → `iplik`, `hali` | Y | F2 (60) | A1 |
| 14 | `balik` | Balık | H | Karadeniz kıyıları, İstanbul, Van | → `gida` | H | F2 (65) | A1 |
| 15 | `kayisi` | Kayısı | H | Malatya, Iğdır | → `kuru_meyve` | H | F2 (80) | A1 |
| 16 | `incir` | İncir | H | Aydın, İzmir | → `kuru_meyve` | Or | F2 (90) | A1 |
| 17 | `kuru_meyve` | Kuru Meyve | A | Malatya, Aydın, Gümüşhane | ihracat | Y | F3 (120) | A1 |
| 18 | `uzum` | Üzüm | H | Manisa, İzmir, Denizli, Elazığ | → `kuru_meyve`, `gida` | Or | F2 (50) | A1 |
| 19 | `narenciye` | Narenciye | H | Antalya, Mersin, Adana, Hatay | → `gida` | Or | F2 (45) | A1 |
| 20 | `sera_sebze` | Sera Sebzesi | H | Antalya, Mersin, Yalova | → `gida`, hal | H | F2 (60) | A1 |
| 21 | `antep_fistigi` | Antep Fıstığı | H | Gaziantep, Siirt | → `gida` | Y | F3 (200) | A1 |
| 22 | `bal` | Bal | H | Muğla, Ordu, Artvin, Doğu Anadolu | ihracat; tozlaşma bonusu | Y | F3 (140) | A1 |
| 23 | `elma` | Elma | H | Amasya, Niğde, Karaman, Isparta | → `gida` | Or | F2 (40) | A1 |
| 24 | `kiraz` | Kiraz | H | Giresun, Amasya | ihracat, `gida` | H | F2 (90) | A1 |
| 25 | `seker_pancari` | Şeker Pancarı | H | Konya, Eskişehir, Tokat, Muş | → `gida` | Or | F1 (25) | A1 |
| 26 | `patates` | Patates ve Soğan | H | Niğde, Nevşehir, Aksaray, Bolu, Kayseri | → `gida` | Or | F1 (28) | A1 |
| 27 | `aycicegi` | Ayçiçeği | H | Edirne, Tekirdağ, Kırklareli, Samsun | → `gida` (yağ) | Y | F1 (35) | A1 |
| 28 | `bakliyat` | Bakliyat (nohut, mercimek) | H | İç ve Güneydoğu Anadolu | → `gida` | Y | F2 (45) | A1 |
| 29 | `tutun` | Tütün | H | Adıyaman, Bitlis, Samsun, Tokat | ihracat | Y | F3 (100) | Sonra |
| 30 | `hashas` | Haşhaş | H | Afyonkarahisar, Burdur | ilaç/gıda | Y | F2 (90) | Sonra |
| 31 | `pirinc` | Pirinç | H | Edirne (Meriç) | → `gida` | Y | F2 (45) | Sonra |
| 32 | `gul` | Gül | H | Isparta | → yağ (lüks) | A | F3 (110) | Sonra |
| 33 | `muz` | Muz | H | Antalya (Alanya), Mersin (Anamur) | → `gida` | H | F2 (50) | Sonra |
| 34 | `kivi` | Kivi | H | Rize, Yalova | → `gida` | Or | F2 (60) | Sonra |
| 35 | `sarimsak` | Sarımsak | H | Kastamonu | → `gida` | Y | F2 (60) | Sonra |
| 36 | `yer_fistigi` | Yer Fıstığı | H | Osmaniye, Adana | → `gida` | Y | F2 (55) | Sonra |
| 37 | `baharat` | Baharat (pul biber, isot, safran) | A | Kahramanmaraş, Şanlıurfa, Karabük | ihracat, `gida` | Y | F3 (130) | Sonra |
| 38 | `sarkuteri` | Pastırma ve Sucuk | A | Kayseri, Kastamonu, Afyonkarahisar | `gida` | Or | F3 (180) | Sonra |
| 39 | `tuz` | Kaya Tuzu | S | Çankırı | `gida`, sanayi | Y | F1 (20) | Sonra |
| 40 | `bor` | Bor | S | Balıkesir (Bigadiç) | sanayi, `seramik` | Y | F2 (80) | Sonra |
| 41 | `mermer` | Mermer ve Doğal Taş | S | Afyonkarahisar, Bilecik, Muğla, Denizli | inşaat, `tas_isleme` | Y | F2 (60) | Sonra |
| 42 | `seramik` | Seramik ve Porselen | S | Kütahya, Bilecik, Çanakkale | → `cini`, tüketim | Y | F3 (140) | Sonra |
| 43 | `yassi_celik` | Yassı Çelik | S | Zonguldak (Ereğli) | → `arac`, `beyaz_esya` | Y | F3 (150) | Sonra |
| 44 | `beyaz_esya` | Beyaz Eşya | S | Manisa, Eskişehir | ihracat | Y | F4 (420) | Sonra |
| 45 | `gemi` | Gemi ve Tekne | S | İstanbul, Yalova | ihracat, ortak proje | Y | F4 (600) | Sonra |

Sayım: A0 **9**, A1 **19** (satır 10–28), Sonra **17** (satır 29–45). Tier 2 mal kapısı §3'tedir; kaynak kanıtı: §4.1 (ürün sıralamaları), §4.2, §5.1 ve coğrafi işaret sayıları [K1–K5]; işaretsiz satırlar genel bilgi olarak doğrulanmalıdır.

### 7.4 Tier 3: lüks/zanaat ve coğrafi işaretli ürünler

**(a) Zanaat ve lüks mallar (8 ayrı mal; nadir, sipariş-bazlı).**

| # | `id` | Ad | Kimlik (il/ilçe) | Girdi | Fiyat | Öncelik |
|---:|---|---|---|---|---|---|
| 1 | `hali` | El Halısı (Hereke tipi) | Kocaeli (Hereke) | `ipek`, `yun`, elektrik | F5 (900) | A0 |
| 2 | `cini` | Çini | Bursa (İznik), Kütahya | `silis`, `yakit`, elektrik | F4 (700) | A0 |
| 3 | `ipek_kumas` | İpek Kumaş | Bursa | `ipek` | F4 (650) | A0 |
| 4 | `dokuma_zanaat` | El Dokuması (bez, battaniye, ehram, kilim) | Kocaeli (Kandıra), Siirt, Bayburt | `yun`, `pamuk`, `iplik` | F4 (400) | A0 |
| 5 | `sepet_hasir` | Sepet ve Tel Kırma | Kocaeli (Karamürsel), Bartın | `odun` | F3 (300) | A0 |
| 6 | `bicak_demir` | Bıçak ve Demircilik | Bursa | `celik` | F4 (450) | A0 |
| 7 | `telkari` | Telkâri | Mardin | `bakir` (soyut) | F5 (800) | A1 |
| 8 | `tas_isleme` | Taş İşleme (lületaşı, Oltu, Ahlat) | Eskişehir, Erzurum, Bitlis | `mermer` | F4 (500) | A1 |

Kural: ölçek tavanı S/M, otomasyon çıktı çarpmaz, menşe şartı (§5.3); alıcılar NPC "Lüks koleksiyoncu" ve fuar (§6.2g).

**(b) Coğrafi işaretli kimlik kayıtları (veri; stok kalemi değil).** Bir Tier 1/2 malın etiketli sürümüdür: fiyat primi K1 ×1,12 (mahreç) ve K2 ×1,25 (menşe) [§6.2c]. Kayıt: `{ id: "ci_...", malId, ulke, il, ilce?, tur, koruma, ad }`.

| Kayıt (örnek) | Bağlı mal | Yer | Tür | Kaynak |
|---|---|---|---|---|
| Geyve ayvası | `taze` | Sakarya (Geyve) | menşe adı (2020) | [K3] |
| Adapazarı beyaz kestane kabağı | `taze` | Sakarya | menşe adı | [K3] |
| Gemlik zeytini | `zeytin` | Bursa (Gemlik) | menşe adı (2005; AB tescilli) | [K1] |
| Bursa şeftalisi | `seftali` | Bursa | menşe adı (2019) | [K1] |
| Bursa kestane şekeri | `gida` | Bursa | mahreç işareti (2021; AB tescilli) | [K1] |
| Kandıra manda yoğurdu | `sut_urunu` | Kocaeli (Kandıra) | coğrafi işaret | [K2] |
| Kandıra karpuzu | `taze` | Kocaeli (Kandıra) | coğrafi işaret | [K2] |
| İzmit pişmaniyesi | `gida` | Kocaeli (İzmit) | coğrafi işaret | [K2] |
| Pamukova ceviz ezmesi | `ceviz` / `gida` | Sakarya (Pamukova) | coğrafi işaret | [K3] |
| Aydın inciri, Malatya kayısısı | `incir`, `kayisi` | Aydın, Malatya | menşe adı | [K4] |

İlk dilimde Bursa 29, Kocaeli 13, Sakarya ≈ 10 kayıt (≈ 52) Alfa-0'a girer; kalan iller Alfa-1'de ve il il doğrulanarak eklenir. Toplu TÜRKPATENT kazıması yapılmaz; liste elle küratörlüdür (§1 lisans notu).

### 7.5 Görünürlük ve keşif

| Kademe | Başta görünür | Nasıl açılır |
|---|---|---|
| **Tier 1** | Köy: 12 mal | İlçe gelişim seviyesi Kasaba (+10) ve Merkez (+7) olunca; ayrıca ilk zincir kurulduğunda ilgili ara mal *(güncellendi: docs/12 §13, tasarım belgesi Y-33: ilçe seviyesi bireysel kilit değildir; görünürlük keşfe bağlanır)* |
| **Tier 2** | **Kendi ilinin** 2–4 imzası | Komşu il imzası: pazarda ilk alım/satım veya NPC ihracatçı talebi; uzak il imzası: **fuar vitrini**, ticaret anlaşması, ihale/sözleşme teklifi, ithal ürün; il turu (Alfa-1 yürüyüş); Atlas'ta "ipucu" kartı |
| **Tier 3a** | Hayır | İmza ilçede ilgili Tier 2 girdisi ilk kez işlenince; NPC "Lüks koleksiyoncu" ilk siparişi; fuar |
| **Tier 3b** | Kendi ilindeki kayıtlar Atlas'ta **silüet** | İlk üretim veya ilk satış ("ilk Geyve ayvası") ile adı ve primi açılır |

**Ürün Atlası (arayüz önerisi).** Tek ekran: 81 il haritası, il kartında Tier 2/3 silüetleri; keşfedilen renklenir; "il tamamlama %" ve başarımlar ("ilk" ilkesi, seri yok). Pazar ekranı yalnız **ilgili** malı gösterir (stokta olan, zincirde olan, açılmış ve fiyat farkı olan); "Tüm mallar" altında kalanı. Hedef: ilk günde ekranda ≈ 16 mal, bir ayda ≈ 22–28, uzun vadede keşif listesi yüzlerce olsa da **etkin ekran** ≈ 28'i geçmez. Keşif sayısı H2'ye (tazelik) bir kaldıraçtır: 20–25. günde yeni "ilk" hedefleri.

### 7.6 Ülke genişlemesi: ülkeden bağımsız çekirdek + bölgeye bağlı imza

| İlke | Uygulama |
|---|---|
| **Çekirdek ülkeden bağımsız** | Tier 1 `id`'leri, zincirleri, bozulma ve fiyat sınıfları her ülkede aynıdır; yeni ülke Tier 1'i değiştirmez |
| **Mal kataloğu ortak** | Tier 2 malı ülkeler arası paylaşılır (`zeytin`, `aycicegi`, `gul`, `balik`...); aynı mal TR, GR, BG'de farklı illerin imzası olabilir. Yeni ülkeye özgü ürün yalnız mal kapısını (§3) geçerse katalog +1 olur |
| **İmza veri kaydıdır** | `il-imza.json` ve Tier 3b kayıtlarında `ulke` ve `koruma` (ör. `TURKPATENT`, AB koruma sistemi) alanı vardır; yeni ülke = yeni veri dosyası, kod değişmez |
| **Ülke profili** | İklim tipi eşlemesi, NPC tüccar seti, talep takvimi (Türkiye: Ramazan, Kurban, kış hazırlığı; başka ülke: kendi dini/kültürel takvimi), tarife çerçevesi ([11 K33](../11-urun-donusu.md) NPC ülke çerçevesi) ülke verisidir |
| **Dil** | `id`'ler ASCII Türkçe (K11) sabit kalır; görünen ad çok dilli alan olur (Alfa-1 öncesi karar) |
| **Türkiye öncelikli** | Alfa-0 ve Alfa-1'in ilk dilimi yalnız TR kayıtlarıyla çıkar; ikinci ülke eklemeden önce **birim test:** TR verisini silip örnek bir ülkeyle çalıştır |

**Balkan ve Karadeniz için yön işaretleri (genel bilgi; bu turda araştırılmadı, Q6).** Bulgaristan: gül (`gul`), ayçiçeği (`aycicegi`), Tuna ovası tahılı; Romanya: `tahil`, `aycicegi`, `petrol`; Yunanistan: `zeytinyagi`, `pamuk`, `narenciye`; Sırbistan: `bakir` (damar), olası yeni mal ahududu; Gürcistan ve Karadeniz kıyıdaşları: `findik`, `yas_cay`. Çoğu **mevcut Tier 2 `id`'sine** oturur; yeni mal sayısı küçük kalır.

### 7.7 Bozulma ve lojistik notu

Hızlı bozulan mallar (`taze`, `sut`, `et`, `balik`, `yas_cay`, `sera_sebze`) `gida` ile aynı lojistik önceliğini (1) alır; `yas_cay` için **aynı ilçe/komşu ilçe** kuralı (aynı gün işleme) önerilir. Bozulma başlangıcı (ppm/gün, kalibre edilmedi): `taze` 40 000, `sut` 80 000, `balik` 60 000, `yas_cay` 200 000, `zeytin` 25 000, `koza` 50 000, `findik` 3 000, `cay` 2 000, `zeytinyagi` 2 000.

---

## 8. Öncelik özeti, ölçüm ve yol haritası

| Katman | Öğe | A0 | A0-ops | A1 | Sonra | S | M | L |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| Tarım | 12 | 5 | 2 | 5 | 0 | 3 | 9 | 0 |
| Sanayi | 12 | 5 | 2 | 4 | 1 | 1 | 11 | 0 |
| Pazar | 12 | 4 | 2 | 5 | 1 | 4 | 6 | 2 |
| **Toplam** | **36** | **14** | **6** | **14** | **2** | **8** | **26** | **2** |

**Alfa-0 çekirdeği (14 öğe):** T1 il imzası, T2 ürün penceresi (yumuşak), T3 mısır ve ekim planı, T4 bahçe yöntemleri (zeytin, fındık), T12 don şablonu; S1 petrokimya, S2 araç montajı, S4 Sanayi Adası, S6 hafif sanayi (Parça atölyesi yöntem ailesi), S9 zanaat (Hereke, İznik, Bursa ipeği); P1 yerel pazar günü, P2 takvimli fiyat dalgası, P8 NPC tüccar (4 tip), P10 bolluk/kıtlık olayı. Bu paket **35 mal** (Tier 1: 20, Tier 2: 9, Tier 3a: 6) ve ≈ 52 coğrafi işaret kaydı gerektirir (§7.1); oyuncu başta ≈ 16 mal görür (§7.5). Alfa-0'da **kapasite sıkışırsa** önce A0-ops öğelerinden P5, S7/S8 ve mobilya-kağıt zinciri ertelenir; kimlik minimumu T1, S2, S9, P1'dir.

**Ölçüm hipotezleri ([05](../05-ilk-olcum-raporu.md), [11 §8](../11-urun-donusu.md)).**

| Hipotez | Çeşitlilik etkisi | Ölçüm önerisi |
|---|---|---|
| **H1** (bölge farkı) | İl imzası ve yöntem karışımı farklı il = farklı en iyi strateji | Alfa-0 üç ilde en iyi önayarın il başına ayrışması; "aynı en iyi strateji" oranı ≤ %60 |
| **H2** (20–25. gün tekrarı) | Pencere, sözleşme, kalite, olay, fuar | Karar türü çeşitliliği; aynı düzenlemenin 10 günlük tekrarı (mevcut %90 → ≤ %60) |
| **Okunurluk (yeni)** | Mal kalabalığı, keşif | Ekranda etkin mal ≤ 28; ilk gün ≈ 16; Dikkat paneli ≤ 5 madde; keşfedilen imza sayısı ve 20–25. gün yeni keşif oranı |
| **Denge** | İmza bonusu (+%10) | En kârlı imzanın payı; "tek imza" baskınlığı > %50 ise bonus düşürülür |

**Yeni bot önayarları (öneri).** `findikci` (Sakarya: fındık → iç → ezme), `otomotivci` (çelik → parça → araç), `zanaatci` (Hereke/İznik; sipariş-bazlı), `zeytinci` (Gemlik).

**Sıra önerisi (bağımlılığa göre).** (1) `il-imza.json` ve `urunPencerePpm` (S; hiçbir çekirdek değişimi gerektirmez). (2) Yeni mallar ve yöntem aileleri: Tier 1 `misir`, `sut`, `odun`, `petrokimya`, `arac`; Tier 2 `findik`, `zeytin`, `zeytinyagi`, `findik_urunu`, `ceviz`, `seftali`, `kestane`, `koza`, `ipek`; Tier 3a zanaat malları (M; `icerik.json` genişlemesi ve doğrulayıcı güncellemesi). (3) Sanayi Adası ve yerel pazar günü. (4) NPC tüccar tipleri ve olay şablonları. (5) Keşif durumu ve Ürün Atlası (oyuncu başına açılmış mal kümesi; L, çekirdek tipi), kalite kademesi (L; `tipler.ts`; lider onayı) A1'de.

## 9. Riskler ve açık sorular

| # | Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|---|
| R1 | **Mal kalabalığı** (katalog ≈ 82 mal) pazar ekranını okunmaz yapar | Orta | Yüksek | Kademeli katalog, ilçe seviyesine ve keşfe bağlı görünürlük, etkin ekran ≤ ≈ 28 (§3, §7.5) |
| R2 | **Alfa-0 başlangıcı Ekim:** fındık, çay, kayısı hasat dönemi dışında | Yüksek | Orta | Yumuşak pencere; Q2 kararı; her ilde yıl boyu etkin imza (süt, odun, mısır, zeytin) |
| R1b | **Keşif sistemi** ek durum ve arayüz yükü getirir; üretim kilidi gibi hissedilebilir | Orta | Orta | Keşif yalnız görünürlük (üretim izni coğrafyadan gelir); Atlas tek ekran; Alfa-0'da yalnız kendi il + fuar yolu |
| R3 | **Kimlik atamaları hatalı** (ör. "Çukurova pamuğu" eskimiş) | Orta | Orta | `†` doğrulama; veri hattı öncesi kaynak kontrolü; kaynak sütunu |
| R4 | **Lisans:** TÜRKPATENT derlemesi, Vikipedi atfı | Orta | Orta | Elle küratörlü kısa liste; atıf; hukuki görüş (K34) |
| R5 | **"Tek en iyi imza"** H1'i tersine çevirir | Orta | Orta | İmza bonusu +%10; taşıma ve hammadde bedeli; ölçüm (§8) |
| R6 | **Çekirdek değişimi** (kalite ortalaması) kural dönemi ve yeniden oynatmayı etkiler (R-Ü4) | Orta | Yüksek | A1'e ertele; parametre/komut sürümleme; lider onayı |
| R7 | **Mikro yönetim:** bahçe, sera, balık, orman, arı yöntemleri çoğalır | Orta | Orta | Yöntemler mevcut yapıların içinde; yeni komut yok; varsayılan şablon |
| R8 | **Ad ve sınır hassasiyeti** (Balkan dilimi) | Orta | Orta | Yazılı dışlama listesi ([11 Ü13](../11-urun-donusu.md)); bu tur Türkiye ile sınırlı |

**Açık sorular.**

| # | Soru | Öneri | Karar |
|---|---|---|---|
| Q1 | Hafif sanayi: Parça atölyesine yöntem ailesi mi, 19. yapı mı? | Alfa-0'da yöntem ailesi (A); Alfa-1'de ölçümle 19. yapı (B) | Lider ([11 Ü5](../11-urun-donusu.md)) |
| Q2 | İklim takvimi hızı: 1x mi, `gunCarpani = 6` mı? | Alfa-0 ölçümünde ikisini de koştur; 1x'te yoğunluk 0,1–0,3 | Lider + sahip |
| Q3 | Marmara için `marmara` iklim tipi (karadeniz ve akdeniz eğrilerinin ortalaması) eklensin mi? | Evet; 12 sayı, S | Lider |
| Q4 | İmza çıktı bonusu (+%10) ve kalite primleri (×1,12 / ×1,25) | Başlangıç değeri; Alfa-0 ölçümüyle | Ölçüm |
| Q5 | Kalite kademesi stoğu: tek `kalitePpm` mi, ayrı stok kalemi mi? | Tek ortalama (mal sayısı şişmez) | Çekirdek ajanı önerir, lider onaylar |
| Q6 | Balkan ve Karadeniz kıyıdaş ülkeler için imza listesi | Ayrı Ar-Ge turu (Bulgaristan, Romanya, Yunanistan, Sırbistan, Gürcistan); bu rapor yalnız Türkiye; ülke alanlı veri modeli §7.6'da hazır | Lider |
| Q7 | Keşif: oyuncu başına mı, il/lonca başına mı açılır? Atlas durumu çekirdek tipinde mi, istemci/sunucu profilinde mi? | Oyuncu başına; sunucu profilinde (çekirdek simülasyonu etkilemez); yalnız görünürlük | Lider + sunucu ajanı |
| Q8 | Tier 2'nin 80'e genişleme sırası | Alfa-0 ölçümüyle; önce Karadeniz ve Ege bahçe ürünleri | Ölçüm |

---

## Kaynaklar

Hepsi bu turda sorgulandı veya okundu; bir sayfa yalnız arama özetinde göründüyse bu **(arama özeti)** ile belirtilir. Yerel belgeler: [08](../08-alti-katman.md), [11](../11-urun-donusu.md), [00](../00-vizyon-ve-kararlar.md), [05](../05-ilk-olcum-raporu.md), `packages/veri/icerik/icerik.json`, `parametreler.json`.

**Coğrafi işaret ve il kimliği**
- [K1] Bursa coğrafi işaretli ürünler (29): T.C. Tarım ve Orman Bakanlığı Bursa İl Müdürlüğü — https://bursa.tarimorman.gov.tr/Sayfalar/GormeEngellilerDetay.aspx?OgeId=1632&Liste=Haber
- [K2] Kocaeli coğrafi işaretleri — https://www.41havadis.com/haber/kocaelinin-cografi-isaretli-lezzetleri-ve-el-sanatlari-h49614.html
- [K3] Sakarya coğrafi işaretleri — https://www.sapanca.info/sakaryanin-cografi-isaretli-gastronomi-urunleri/ ; Geyve Ayvası kaydı (arama özeti): https://ci.turkpatent.gov.tr/cografi-isaretler/detay/38301
- [K4] Coğrafi işaret (Türkiye): türler ve 6769 sayılı Kanun — https://tr.wikipedia.org/wiki/Co%C4%9Frafi_i%C5%9Faret_(T%C3%BCrkiye)
- [K5] Coğrafi işaretli ürün sayısı en fazla iller (1.863 tescil) — https://onedio.com/haber/turkiye-nin-cografi-isaret-haritasi-cikarildi-hangi-il-zirvede-1384636 ; bölge dağılımı (Karadeniz 369) — https://www.haber61.net/trabzon/trabzon-fanilasi-tescillendi-karadeniz-369-urunle-zirvede/640212

**Tarım**
- [K6] Fındık 2024 üretimi (il dağılımı) — https://www.yenigiresun.net/haber/24463127/findik-uretiminde-2024-bilancosu-giresun-kacinci-sirada ; https://www.tarimdunyasi.net/2025/01/02/tarimda-2024un-bilancosu-ve-2025-beklentileri/ (arama özeti)
- [K7] TÜİK 2025 bitkisel üretim aktarımları (fındık −%38,5, zeytin −%34,7) — https://www.paraanaliz.com/2025/ekonomi/tuik-acikladi-2025te-bitkisel-uretimde-sert-dusus-var-g-130463/ ; https://www.gunebakis.com.tr/tuik-verilerine-gore-findik-uretimi-2025te-yuzde-385-azaldi-artvin-giresun-ordu-rize-ve-trabzon/27128384 (arama özeti)
- [K8] Rize çayı (Rize Ticaret ve Sanayi Odası): sürgünler, fabrika ve üretici sayıları — https://www.rtb.org.tr/en/rize-cayi
- [K9] Türkiye'nin dünya lideri olduğu ürünler (AA) — https://www.aa.com.tr/tr/ekonomi/turkiye-tarimda-7-urunde-dunya-lideri-oldu-22-urunde-ilk-ucte-yer-aldi/3749891
- [K10] Su ürünleri 2024 (AA) — https://www.aa.com.tr/tr/ekonomi/turkiyenin-su-urunleri-uretimi-2024te-yuzde-7-6-azaldi/3588419
- [K11] Karadeniz hamsi av dönemi ve av yasağı — https://www.ekoturk.com/haberler/balikcilar-1-eylulu-bekliyor-yeni-av-sezonu-basliyor/ ; https://yenisebinkarahisar.net/haber/28612628/karadenizde-av-sezonu-1-eylulde-basliyor-balikcilara-kritik-uyarilar (arama özeti)
- [K12] Arıcılık: Bakanlık istatistikleri ve TEPGE ürün raporu — https://arastirma.tarimorman.gov.tr/aricilik/Link/2/Aricilik-Istatistikleri ; https://arastirma.tarimorman.gov.tr/tepge/Belgeler/PDF%20%C3%9Cr%C3%BCn%20Raporlar%C4%B1/2024%20%C3%9Cr%C3%BCn%20Raporlar%C4%B1/Ar%C4%B1c%C4%B1l%C4%B1k%20%C3%9Cr%C3%BCn%20Raporu%202024-393%20TEPGE.pdf (arama özeti)
- [K13] Hayvan varlığı 2025 (AA) — https://www.aa.com.tr/tr/ekonomi/buyukbas-hayvan-sayisi-2025te-17-7-milyon-kucukbas-sayisi-yaklasik-57-9-milyon-oldu/3825424
- [K14] Örtüaltı yetiştiricilik — https://www.tarimorman.gov.tr/Konular/Bitkisel-Uretim/Tarla-Ve-Bahce-Bitkileri/Ortu-Alti-Yetistiricilik ; https://www.tarimdunyasi.net/2025/03/06/devlet-destekli-seracilik-buyuyor/ ; ZMO örtüaltı raporu: https://api2.zmo.org.tr/uploads/portal/resimler/ekler/0192e936ba11d0a_ek.pdf (arama özeti)
- [K15] Orman ürünleri (Strateji ve Bütçe Başkanlığı, özel ihtisas komisyonu raporu) — https://www.sbb.gov.tr/wp-content/uploads/2025/08/Orman-Urunleri-OIK-Raporu_01082025.pdf (arama özeti)
- [K16] Pamuk üretim payları (Şanlıurfa %41,7) — https://www.urfapusula.com/haber/28515989/turkiyenin-pamuk-baskenti-sanliurfa-yuzde-417sini-karsiliyor (arama özeti); Türkiye'de yetiştirilen tarım ürünleri — https://tr.wikipedia.org/wiki/T%C3%BCrkiye'de_yeti%C5%9Ftirilen_tar%C4%B1m_%C3%BCr%C3%BCnleri
- [K17] Zeytin hasat dönemleri ve bölge payları — https://yagtakip.com/blog/zeytin-hasadi-ne-zaman-baslar ; https://tr.wikipedia.org/wiki/T%C3%BCrkiye'de_zeytin_%C3%BCretimi ; Gemlik Ticaret Borsası sofralık zeytin raporu: https://www.gemliktb.org.tr/wp-content/uploads/2021/09/SOFRALIK-ZEYTIN-ARASTIRMA-RAPORU-YENI.pdf (arama özeti)
- [K18] Malatya kayısı hasadı ve kuru kayısı ihracat payı (TRT Haber) — https://www.trthaber.com/haber/turkiye/malatyada-kayisi-hasadi-zamani-596108.html (arama özeti)
- [K19] Konya buğday — https://www.konyadayatirim.gov.tr/sektorler/tarim-ve-hayvancilik ; https://itb.org.tr/makale/13-bugday-sektor (arama özeti)
- [K20] Bursa kestane hasadı ve Aydın payı — https://www.bursahakimiyet.com.tr/bursa/bursa-da-kestane-hasadi-basladi-2026-yili-kestane-ne-zaman-toplanir-hangi-ilcelerde-yetisiyor-1718843 ; https://api.zmo.org.tr/uploads/portal/resimler/ekler/4ea55645a14c719_ek.pdf (arama özeti)
- [K21] Sakarya mısır (Valilik; üretim sayısı yılı 2018 haberidir) — https://www.sakarya.gov.tr/vali-balkanlioglu-misir-uretimi-konusunda-sakarya-cok-onemli-bir-konumda ; Sakarya fındık ilçe sıralaması — https://www.kaynarcahaber.com/haber/findikta-sakarya-siralamasi-karasu-1inci-kaynarca-5inci-12450.html (arama özeti)

**Sanayi ve zanaat**
- [K22] Tüpraş İzmit Rafinerisi — https://en.wikipedia.org/wiki/T%C3%BCpra%C5%9F_%C4%B0zmit_Oil_Refinery ; Kocaeli otomotiv yatırımları (Ford, Hyundai, Honda, Isuzu) — http://www.cometoturkey.com/kocaeli-izmit.html (arama özeti, turizm sitesi; düşük güvenilirlik)
- [K23] Bursa otomotiv: Oyak Renault — https://www.oyak-renault.com/ ; Bursa otomotiv ihracatı — https://www.sozcu.com.tr/amp/bursa-otomotiv-ihracatinda-kocaeli-nin-ardindan-ikinci-sirada-p307333 ; https://www.trthaber.com/haber/ekonomi/bursada-uretilen-her-iki-otomobilden-biri-ihrac-edildi-941633.html (arama özeti)
- [K24] Bursa Organize Sanayi Bölgesi (BOSB) — https://www.bosb.org.tr/bosb-haber-74-turkiye_otomotiv_bulusmalari_bursa_osbnin_ev_sahipliginde_duzenlenmektedir.html
- [K25] Sakarya otomotiv — https://www.adapostasi.com/haber/28791728/sakaryada-otomotivde-buyuk-ihracat-atagi ; https://www.aa.com.tr/tr/ekonomi/sakaryada-uretilen-otomobiller-dunya-yollarinda/1745358 ; TÜVASAŞ — https://en.wikipedia.org/wiki/T%C3%9CVASA%C5%9E (arama özeti)
- [K26] Demir-çelik: Kardemir — https://en.wikipedia.org/wiki/Kardemir ; Erdemir tarihçe — https://www.erdemir.com.tr/kurumsal/tarihce ; Zonguldak Valiliği — http://www.zonguldak.gov.tr/demir-celik-sanayi (arama özeti)
- [K27] Kütahya ve Bursa çinisi — https://www.kulturportali.gov.tr/turkiye/kutahya/nealinir/cn ; https://dumlupinargazetesi.com/kutahya-cinisinde-yeni-donem-uretimden-ihracata-yol-haritasi-hazirlaniyor (arama özeti)
- [K28] Hereke halısı — https://www.kocaeli.gov.tr/hereke ; https://www.korfez.gov.tr/hereke-halisi (arama özeti)
- [K29] Koza Han ve Bursa ipeği (AA) — https://www.aa.com.tr/tr/yasam/ipek-yolunun-son-duragi-bursanin-incisi-kozahan/1652607 (arama özeti)
- [K30] SEKA ve Kartonsan — https://en.wikipedia.org/wiki/SEKA_Paper_Museum ; https://www.paper-world.com/en/company/kartonsan-karton-sanayi-ve-ticaret-as-izmit-mill-izmit-kocaeli-1442163 (arama özeti)
- [K31] Denizli, Kayseri (İstikbal), TÜLOMSAŞ/TÜVASAŞ — https://en.wikipedia.org/wiki/Denizli ; https://en.wikipedia.org/wiki/%C4%B0stikbal ; https://www.dosb.org.tr/firmalar-124 (arama özeti)
- [K32] İnegöl mobilyası ve mobilya ihracatı — https://tr.wikipedia.org/wiki/%C4%B0neg%C3%B6l_mobilyas%C4%B1 ; https://www.gencgazete.net/mobilya-ihracatinda-176-milyar-dolarlik-basari-inegolun-payi-artiyor (arama özeti)
- [K33] OSB: 4562 sayılı Organize Sanayi Bölgeleri Kanunu — https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4562.pdf ; uygulama yönetmeliği — https://www.yatirimadestek.gov.tr/pdf/assets/upload/dosyalar/osb_yonetmeligi_ve_ekleri.pdf ; Vikipedi — https://tr.wikipedia.org/wiki/Organize_sanayi_b%C3%B6lgesi (arama özeti)

**Pazar**
- [K34] TMO kabuklu fındık alım koşulları (2026/27 dönemi, AA) — https://www.aa.com.tr/tr/ekonomi/tmo-2026-2027-sezonu-kabuklu-findik-alim-fiyatlarini-belirledi/4020256 ; TMO hububat alım ve satış fiyatları (Bloomberg HT) — https://www.bloomberght.com/tmo-2026-yili-hububat-alim-ve-satis-fiyatlarini-acikladi-3778801 (arama özeti)
- [K35] TÜRİB, ELÜS ve lisanslı depoculuk — https://www.tobb.org.tr/Sayfalar/Detay.php?rid=12503&lst=Haberler ; https://sepam.org.tr/turkiye-urun-ihtisas-borsasi-ve-lisansli-depoculuk-sistemi/ (arama özeti)
- [K36] Sözleşmeli tarım: Bakanlık yönetmeliği ve model — https://www.aa.com.tr/tr/ekonomi/tarimsal-uretimde-sozlesmeli-uretim-yonetim-sistemi-kurulacak/2992565 ; https://www.sondakika.com/guncel/haber-tarimda-sozlesmeli-uretimin-usul-ve-esaslarini-bel-16333751/ (arama özeti)
- [K37] Limanlar: konteyner hacimleri — https://www.kapsulhaberajansi.com/lojistik/turkiye-nin-en-buyuk-limanlari-2026-konteyner-ve-yuk-hacmine-gore-ilk-10-liman-34874 ; Gemport — https://www.gemport.com.tr/hakkimizda (arama özeti)
- [K38] Fuarlar — https://www.growtechevents.com/global/tr/ ; https://www.fuarizmir.com.tr/ (arama özeti)
- [K39] İl ticaret borsası günlük fındık fiyatı örneği (Giresun) — https://www.aa.com.tr/tr/ekonomi/giresunda-findik-fiyati-123-ile-125-lira-arasinda-islem-gordu/3331421 (arama özeti)
- [K40] Kültür atlası, 81 ilin öne çıkan ürünleri — https://www.muglagazetesi.com.tr/mugla-haberleri/turkiyenin-81-ilinin-en-meshur-urunleri-belli-oldu-muglanin-en-meshur-219587h ; https://www.yenisafak.com/foto-galeri/hayat/memleketinizin-neyi-meshur-dunya-81-ilimizi-iste-bunlarla-taniyor-iste-2025-turkiye-kultur-atlasi-4667192 (arama özeti)

**Not.** Rapordaki bütün sayılar, aksi belirtilmedikçe, haber ve rapor aktarımlarından alınmıştır; veri hattı kurulurken birincil kaynağa (TÜİK, Bakanlık, TÜRKPATENT) dönülmelidir.
