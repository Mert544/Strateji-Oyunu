# Araştırma — Oyun Tasarımı: Paylaşılan Parsel Dünyası (v1 önerisi)

> **Özet.** Arazi **spekülasyon aracı değil, üretim aracı** olmalı. Upland ve Earth2 oynanışsız arazi spekülasyonunda tökezledi; Eco ve Albion'da ise arazi günlük üretim döngüsünü besliyor. **Yönetişim, parsel ile il arasındaki köprüdür:** mevcut bölge düzeyindeki simülasyon ([06](../06-simulasyon-spesifikasyonu.md), [08](../08-alti-katman.md)) büyük ölçüde korunur. Bir il, oyuncuların sahip olduğu yapıların toplamı olur. D4'ün 7 yasası oyuncudan seçilmiş **vali**ye geçer. **Yoğunluk, harita büyüklüğünden önemlidir.** Türkiye'de ~970 ilçe var; 10k oyuncu bütün dilime dağılırsa ilçe başına 10'dan az oyuncu düşer ve dünya boş kalır. Bu yüzden ilçeler dilim dilim açılmalı.

**Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi. Dayanak: docs 00, 07, 08 (§0–2 ve §6 Devlet), 05 bulguları ve [paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md). Web kaynakları satır içinde bağlıdır. "Öneri" diye işaretli sayılar başlangıç değeridir, **kalibre edilmemiştir**. Repoda değişiklik yapılmadı.

**Bu rapordan sonra verilen kararlar.** Rapor arsa atomu olarak H3 res 10 altıgeni (6 yuva) ve ilçe başına 12 parsel tavanını önerdi. Takım lideri bunun yerine **z20 kare hücreyi** seçti: 1 hücre = 1 yuva, ilçede ≤72 hücre, hücre başı fiyat 1.000 / 2.500 / 6.500 ₺ ([11 §3.1, §7.2](../11-urun-donusu.md)). Rapor "v1 ~40 il, ~200 ilçe" önerdi; Alfa-0 kapsamı **Kocaeli + Sakarya + Bursa** oldu. Aşağıda raporun özgün önerileri korunmuştur; geçerli değerler [11](../11-urun-donusu.md) içindedir.

İlgili belgeler: [11 — Ürün Dönüşü](../11-urun-donusu.md) · [08 — Altı Katman](../08-alti-katman.md) · [Paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md) · [Arayüz ve UX](arayuz-ux.md)

---

## 1. Benzer oyunlardan dersler

| Oyun | Oyuncuyu ne bağladı | Ne başarısız oldu | Çıkarım |
|---|---|---|---|
| Capital Rift ([geliştirici açıklaması](https://www.tiktok.com/@niksgames/video/7666487170605026591)) | OSM haritasında her yerde arsa. İşçiler çevrimdışıyken de çalışır. "Rota kurmayan" kamyonlar ve akış çizgili kapsam konsolu. 35'ten fazla malla tek küresel oyuncu emir defteri | "Kimse odun satmıyorsa odun yoktur": düşük nüfusta tamamen oyuncu fiyatlaması riskli | Otomatik lojistiği kopyala. Erken dönemde NPC likiditesi tut |
| Upland ([Naavik](https://naavik.co/deep-dives/upland-property-tycoon/)) | Sabit yıllık %14,7 getiri, koleksiyonlar, yeni gelenlere mülk ayıran "Fair Start Act" | İşlemlerin %98'i yalnız mülk; kullanıcı başına süre çok düşük; ilk gelenlerin köşe tutması ve istifçilik; gelir zirvenin %15'ine, DAU 60k'dan 5–15k'ya düştü ([Medium](https://medium.com/@captainincognito67/the-decline-of-upland-a-cycle-of-unfulfilled-promises-and-shifting-priorities-1c82f9ba00d9)) | Üretimsiz arazi oyun değildir. Yeni gelenlere arazi ayır |
| Earth2 | — | Önceden satılmış arazi, çok ince oynanış, para çekme şikâyetleri ([Trustpilot](https://www.trustpilot.com/review/earth2.io)) | Araziyi asla önceden satma, değer artışı vaat etme ([Naavik LVT](https://naavik.co/deep-dives/digital-land-tax/)) |
| Eco | Seçilmiş hükümetler ve simülasyonu bağlayan yasalar. Uzmanlaşma: her beceri diğerlerini üstel olarak pahalılaştırır ([Steam rehberi](https://steamcommunity.com/sharedfiles/filedetails/?id=2066189684)). Ortak 30 günlük göktaşı hedefi. Kasaba için ≥3 vatandaş ve anayasa gerekir; nüfusa göre hak belgesi üretilir ([wiki](https://wiki.play.eco/en/Settlements)) | Sunucular biter; ortak mal trajedisi odağı çatışma doğurur | Uzmanlaşma + ortak alanlarla (toprak, damar, kirlilik, şebeke) işbirliğini zorla |
| Albion adaları ([rehber](https://www.albioncodex.com/guides/albion-online-island-guide)) | 6 kademe (1→16 arsa, toplam ~6,5M gümüş), 22 saatlik ürün döngüsü, günde ~15 dk | Rutin angaryaya döner. Ödüller 7 gün sonra kaybolur | Günde bir uğramak iyidir. Zorunlu tutma |
| EVE Upwell ([EVE Uni](https://wiki.eveuniversity.org/Vulnerability)) | 22–50 saatlik takviye zamanlayıcıları. Saat dilimini savunan seçer. Yakıtsız yapılar zayıflar | — | Savunanın seçtiği pencereler; bakım = savunmanın bedeli |
| Foxhole | Lojistik toplumsal omurga | 1.800 lojistik oyuncusu sıkıcılık yüzünden 49 gün greve gitti ([NME](https://www.nme.com/news/foxhole-logistics-union-ends-49-day-strike-after-demands-met-3173270)) | Lojistik otomatik olmalı; sahip de böyle karar verdi |
| Rust | Bakım kademeli: üs büyüdükçe günlük inşa maliyetinin %10/15/20/33'ü ([Corrosion Hour](https://www.corrosionhour.com/rust-upkeep-building-guide/)) | — | Yayılmayı durdurmak için bakımı elde tutulan büyüklüğe göre artır |
| OGame / Travian / CoN | OGame: 1:5 puan oranı koruması, 24 saatte en çok 6 saldırı ([Gameforge](https://gameforge.com/en-GB/games/ogame-rules.html)). Travian: ittifakın 100. seviyeye kadar Dünya Harikası ([destek](https://support.travian.com/en/articles/103-world-wonder)). CoN: hareketsiz ülkeler yeniden atanır ([wiki](https://wiki.conflictnations.com/Beginner_Intro)) | Travian dünyayı sıfırlar; biz istemiyoruz. CoN'da çok yapay zekâ ülkesi kalır | Oran koruması kullan. Harikalar kazanma koşulu değil, kalıcı altyapı olsun |
| Rival Regions / eRepublik | RR: savaşa meclis karar verir, savaş penceresi 24 saat, fabrika çıktı vergileri yasayla belirlenir ([RR wiki](https://wiki.rivalregions.com/Wars)) | eRepublik: tekrarlayan "çiftçilik ve antrenman savaşları"; güç farkı oyunu yeni gelenlere kapattı; çoklu hesap ([özet](https://grokipedia.com/page/ERepublik)) | Savaş kişisel mülk için değil makam ve vergi için olsun. Kıdemli avantajını sınırla |
| Anno / W&R | Anno yapıları nüfus kademesi eşikleriyle açar ([wiki](https://anno1800.fandom.com/wiki/Population)) | W&R'nin işe gidiş mikro yönetimi yüzlerce otobüs ister ([wiki](https://workers-resources.fandom.com/wiki/Citizens)) | İlçe gelişim seviyeleri içerik açsın. İşe gidiş simülasyonu yok |

**Arazi vergisi.** [Naavik](https://naavik.co/deep-dives/digital-land-tax/), iyileştirmelerin değil arazi gelirinin %85–100'ünü vergilendirmeyi önerir. Teşhisi şudur: "Arazinin hâlâ yüksek bir satış fiyatı varsa arazi vergin düşüktür." Harberger öz-beyanının yeni oyuncuları şaşırttığı uyarısını da yapar. UO ve FFXIV'deki konut krizleri böyle bir verginin yokluğundan doğdu.

## 2. Roller ve yönetişim (v1, 1k–10k oyuncu için)

**Roller seçilen bir sınıftan değil, ne inşa ettiğinden ve hangi makamda olduğundan doğar.**
- Çiftçi
- Sanayici
- Tüccar: ambar + pazar sözleşmeleri
- Müteahhit: inşa kapasitesi satar
- Muhtar / Kaymakam: seçilmiş ilçe başkanı
- Vali: seçilmiş il yöneticisi
- Komutan: bir ordugâhın sahibi

**Eco tipi uzmanlaşma (öneri).** Bir katmanın ustalık yolu, ilerletilmiş diğer her yol için ×1,5 pahalanır.

**Yönetişim yapısı (öneri):**
- **İlçe meclisi.** Son 7 günün en az 3'ünde aktif olan parsel sahipleri oy verir; hesap başına bir oy, 14 günde bir. Meclis şunları belirler:
  - haftalık %0,5–3 bandında arazi vergisi;
  - imar payları (tarım / sanayi / konut yuvaları);
  - ortak proje önceliği.
- **Vali.** 28 günde bir ilçe başkanları arasından seçilir. D4'ün 7 yasasını (72 saat bekleme korunur), D5 bütçe kollarını, savaş ilanını ve anlaşmaları yönetir.
- **Ülke düzeyi.** Yalnız NPC çerçeve (sabit taban tarifeler). Bu, doc 00 A2'deki sınır hassasiyetinden kaçınır. Oyuncu il federasyonları v1.5'te.
- **Şirketler / loncalar.** Ortak hazine, ortak yapılar, iç transferler. Aklamaya karşı kurallar: paylaşılan dünya raporundaki gibi yeni hesap transfer tavanları.
- **Devlet yasaları parsellere nasıl ulaşır.** `tarim_koruma` ildeki tüm çiftliklerin çıktısını ölçekler. `sanayi_tesviki` herkesin inşa süresini ×0,75'e indirir ve kirliliği artırır. İlçe şebekesindeki `enerji_onceligi` kimin fabrikasının kesintiye gireceğini belirler. Yasalar sahiplere doğrudan dokunur; seçimlerin önemi buradan gelir.

## 3. Hafif askeri

- **Ordugâh** (3 yuva, 12 sa inşa) mühimmat ve gıdayı 6–24 saatlik partilerle birliğe çevirir. Birlikler il komutanlığı altında havuzlanır.
- **Savaş kuralları:**
  - Savaşı yalnız vali ilan edebilir; ardından 12–24 saat hazırlık.
  - 24 saatlik pencere, Rival Regions tipi bir hasar yarışı olarak otomatik çözülür.
  - Savunan taraf EVE tipi 4 saatlik bir "yoğun saat" bandı seçer.
- **Kazanılan şey.** İlçenin kontrolü: vergi hakları, makam koltukları, liman veya geçit kenarı. **Parseller asla el koyulmaz.**
- **Çevrimdışı koruma (H5):**
  - Yağma, pencere başına depo stokunun en çok %25'i.
  - Yapılar devre dışı kalır, asla yıkılmaz; en çok %10'u.
  - Aynı ilçeye iki baskın arasında en az 49 saat.
  - 14 günlük yeni oyuncu kalkanı ve 1:5 net servet oranı kuralı.
- **Ekonomik savaş** (ambargo, tarife, boğaz ya da geçit ablukası) mevcut D6 ve L katmanı araçlarını kullanır. **Birincil kaldıraç bu olmalı.**

## 4. Uzun vadeli tazelik (20–25. gün sorunu)

Her hafta angaryalardan değil sistemlerden gelen yeni tür bir karar getirmeli.

| Kaldıraç | Ne zaman etkili | Mekanik |
|---|---|---|
| Damar tükenmesi | 15–25. gün | S5 √ tükenme, %25 taban; keşif sondajı. Yaklaşık 30 günde bir **başka ilçelerde yeni damarlar çıkar** (deterministik olay akışı); en iyi stratejiler yer değiştirir |
| İlçe gelişim seviyesi (Köy→Kasaba→Merkez→Şehir) | İlk atlama ~10–20. gün | Ortak nüfus + hizmet ister (D1 K1–K3). İlçedeki *herkes* için M/L yapı kademelerini ve yeni türleri açar (Anno modeli) |
| Ortak projeler | 3–14 günlük inşa | Köprü, liman genişletme, baraj, demiryolu bağlantısı. Oyuncular malzeme katar. Kalıcı lojistik kenarı ya da kapasite ekler. İl başına Travian tipi harika, ama sıfırlama yok |
| İklim takvimi | Aylık | Doc 08 T2/T3 hasat eğrileri ve yayılan olaylar. Eco'daki göktaşının rolünü oynayan ortak tehditler |
| Teknoloji | 1–5 gün | Yüzde değil yöntem (TK1). Birbirini dışlayan dallar. Yayılım geç gelenler için ucuzlatır |
| Seçimler ve yasalar | 14 / 28 gün | Değişen yasalar en iyi portföyü karıştırır |

**Ritim:**
- Günde bir ya da iki uğrama; inşaat 2–12 saatte biter.
- Günlük giriş ödülü yok.
- Başarımlar seri değil "ilk"tir (ilk L ölçekli tesis, Karadeniz'i aşan ilk ihracat).

## 5. Parsel ekonomisi (raporun özgün önerisi)

- **Parsel.** H3 çözünürlük 10 (≈1,5 ha), 6 yapı yuvası. *(Karar: z20 kare hücre; [11 §3.1](../11-urun-donusu.md#31-arsa-atomu).)*
- **Fiyat (öneri):**
  - Taban ₺5k kırsal / ₺15k kasaba / ₺40k şehir.
  - × (1 + 2·satılmış pay).
  - İlçe başına oyuncu tavanı: 12 parsel.
  - Elde tutulan büyüklüğe göre artan bakım: Rust benzeri adımlar.
  - *(Karar: hücre başı 1.000 / 2.500 / 6.500 ₺, ilçede ≤72 hücre ve ≤%25; [11 §7.2](../11-urun-donusu.md#72-arsa).)*
- **Arazi vergisi.** Yapılara değil yalnız arazi değerine uygulanır. Değerleme v1'de Harberger değil ilçe emsalleriyle yapılır. Hedef: arazinin konum rantının en az %50'sini vergilemek; böylece parselin yeniden satış fiyatı yaklaşık 10 haftalık arazi gelirinde ya da altında kalır (Naavik teşhisi).
- **İşgücü:**
  - Her ilçenin bir NPC nüfusu (WorldPop) ve %50'lik işgücü havuzu vardır.
  - Yapılar havuzdan işçi alır ve ücret öder; bu bir lavabodur.
  - Oyuncunun kurduğu konut nüfus tavanını artırır.
  - D3 göçü insanları istikrarlı, konforlu ve iş olan ilçelere taşır.
- **Lavabolar.** Ücretler, bakım parçaları (S3), arazi vergisi, inşa malzemesi, taşıma yakıtı. Hedef: doc 08'deki gibi gelirin 0,30–0,63'ü.
- **Hareketsizlik:**
  - 14 gün hareketsiz: uyku. Üretim durur, vergi donar, parsel korunur.
  - 45 gün: yapılar günde %2 çürür.
  - 90 gün: azalan fiyatlı açık artırma; gelir, borç düşüldükten sonra sahibine gider.
  - Yılda en çok 30 gün tatil modu.
- **Yetişme (H6):**
  - Her ilçedeki parsellerin %20'si 14 günden genç ya da medyan net servetin ¼'ünden az hesaplara ayrılır (Upland FSA benzeri).
  - ₺50k başlangıç hibesi + doluluğu düşük bir ilçede bir bedava yurt.
  - İlk 5 yapıda %30 inşa indirimi.
  - Teknoloji yayılımı geç gelenlerin araştırmasını ucuzlatır.
- **Pazar.** İl merkezli emir defteri + açıkça etiketli NPC piyasa yapıcı (P2 makası ±%10). NPC derinliği = max(0, hedef − kayan oyuncu hacmi); oyuncular likidite sağladıkça çekilir. Liman primleri taşıma maliyetine eşittir (P1).

## 6. v1 oyun tasarımı önerisi

**Çekirdek döngü:**
- **Dakika:** yürü, yapı yerleştir ya da yükselt, yöntemini seç, limit emir ver.
- **Saat:** bir inşaat biter; otomatik kamyonlar stoku yeniden dengeler.
- **Gün:** hasat eğrisini ve kapsam konsolunu oku; ekim karışımını, gübre dozunu ve sözleşmeleri ayarla.
- **Hafta:** oy ver, yasa değişikliklerini izle, projelere katkı ver, sondaj yap.
- **Ay:** iklim değişir.

**Yapılar (öneri):**

| Katman | Yapı (yuva, inşa süresi) |
|---|---|
| Tarım | Tarla (2, 2 sa) · Ahır (2, 4 sa) · Mera (3, 2 sa, yalnız dağ) · Sulama (1, 6 sa) · Gıda fabrikası (2, 6 sa) |
| Sanayi | Maden ocağı (2, 6 sa, damar gerekir) · Petrol kuyusu (1, 6 sa) · Çelikhane (3, 10 sa) · Parça atölyesi (2, 8 sa) · Elektronik (2, 10 sa) · Santral (3, 8–12 sa) · Gübre fab. (2, 8 sa) · Mühimmat fab. (2, 8 sa) |
| Lojistik | Ambar (1, 3 sa; bozulma ×0,5) · Garaj (1, 3 sa; otomatik filo kapasitesi ekler) |
| Teknoloji | Atölye-Lab (1, 6 sa) |
| Pazar | Ticaret ofisi (1, 2 sa; emir yuvaları, sözleşmeler) |
| Devlet | Konut (1, 2 sa; +nüfus) · Ordugâh (3, 12 sa) · Muhtarlık (kamu, ortak) |

S/M/L ölçek kademeleri (doc 08 S2) ilçenin gelişim seviyesine bağlanır.

**Dilim yoğunluğu.** v1 yaklaşık 40 il ve 200 ilçe açar; 5k oyuncuda açık ilçe başına 20–50 sahip hedeflenir. Açık ilçeler %70 doluluğu geçince yeni ilçeler eklenir. *(Karar: Alfa-0 = Kocaeli + Sakarya + Bursa, ~40 ilçe; [11 §6](../11-urun-donusu.md#6-alfa-0-ve-alfa-1-kapsamı).)*

**Mevcut simülasyon parsellere nasıl eşlenir:**
- `tesis` bir `sahip` alanı ve parsel kimliği kazanır. `bolgeHesapla` her bölgede tüm sahiplerin yapıları üzerinde değişmeden çalışır; sahip başına defter tutulur.
- Simülasyondaki `bolge`, lojistik grafı ve pazar için **il düzeyinde düğüm** olarak kalır (~60 düğüm). Lojistik çözümü iller arasında koşar; il içinde dağıtım otomatiktir.
- Şunlar **ilçe/il düzeyinde ortak alan** olarak kalır:
  - iklim ve hasat eğrisi (T2/T3);
  - kirlilik (S4);
  - kesintili elektrik şebekesi (S1);
  - işgücü havuzu ve istikrar (D1–D3);
  - damarlar (S5).
- Şunlar **parsel başınadır:** toprak ve ekim planı (T1), gübre dozu (T4), bakım ve aşınma (S3), ölçek (S2).
- `vergi_ayarla` ve D4 yasaları oyuncudan il hükümetine geçer.

## 7. Hipotezlerin yeni ifadeleri ve botların ölçmesi gerekenler

| # | Parsel dünyası biçimi | Bot metriği |
|---|---|---|
| H1 | Hiçbir 6 yuvalık yapı portföyü ilçe türlerinin %70'inden fazlasında ilk 3'te değil | İlçe sınıfı başına pişmanlık ve entropi |
| H2 | 30. gün oyuncu başına karar tekrarı ≤%60 ve 45. güne kadar her hafta en az 1 yeni karar *türü* | Tekrar endeksi ve karar tükenmesi |
| H3 | Bir ilin yuvalarının %20'si ordugâha kayınca o ilde ve komşularında fiyat ya da kapsam ≥%10 değişir | Eşli koşular |
| H4 | 60 sn içinde test katılımcısı "fabrikam neden yavaş?" ve "hangi yasa beni etkiliyor?" sorularını yanıtlar | 5 kişilik test, katı eşik ≥4/5 |
| H5 | 48 sa çevrimdışı oyuncu pencere başına stokunun ≤%25'ini kaybeder; sıfır parsel kaybı | Akıncı ve çevrimdışı ajanlar |
| H6 | 60. günde katılan, 14 gün içinde ilçe medyan net servetine koşuların ≥%50'sinde ulaşır; parsellerin ≥%20'si ≤2× taban fiyatla alınabilir | Geç katılan kohort |
| H7 | Ayarla-unut sahip, aktif sahibin çıktısının %50–85'ini üretir | 24/48/72 sa oranları |
| H8 (yeni) | Arazi Gini ≤0,6; hiçbir oyuncu ilçenin %25'inden fazlasını tutmaz; yeniden satış fiyatı ≤10 haftalık arazi geliri | Spekülatör / istifçi ajanlar |
| H9 (yeni) | NPC derinliği çekilirken 1k oyuncuda emirlerin ≥%80'i 1 saatte dolar; oy katılımı ≥%30 | Tüccar ve vali ajanları |

**Bot simülasyonu düzeni:**
- **Arketipler:** çiftçi, sanayici, tüccar, spekülatör, vali (yönetici), akıncı, boşta/çevrimdışı, geç katılan.
- **Ölçek:** 1k ve 10k nüfus, 24× hız, 90 gün, 10 tohum, 12 başlangıç ayı.
