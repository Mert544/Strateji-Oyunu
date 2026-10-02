# Sosyal oyun: düşük nüfusta ortak amaç ve gönüllü bağımlılık

2 Ekim 2026. Bu rapor kod okumaya dayalı ürün önerisidir; oyuncu davranışı veya denge sonucu ölçülmedi. Bugünkü Alfa-0 odağı üç ilçede arsa/yurt → üretim → satış → dükkândır. Sosyal derinlik, bu döngüye katkı sunan isteğe bağlı kararlarla kurulmalıdır. Yalnız oynayan kişi üretimini sürdürebilmeli; aynı anda çevrimiçi olma, arkadaş daveti, günlük katılım, lonca üyeliği veya ücretli hızlandırma gerekmemelidir. NPC katkısı açıkça etiketlenmeli, insan katılımı gibi gösterilmemelidir.

[Ürün dönüşü](../11-urun-donusu.md) seçimleri sonraya bırakır; daha güncel [yön taslağı §10](../12-yon-taslagi.md) sabit fiyatlı kamu siparişi v0'ı Alfa-0 P0 sonunda tutar. Aşağıdaki sipariş önerisi bu sırayla uyumludur; canlı ajan veya ihale zorunluluğu eklemez. S: mevcut verilere dayalı küçük görünürlük dilimi; M: yeni komut/durum ve istemci bağlantısı; L: yeni işlem yaşam döngüsü ve kalıcılık. Bunlar göreli büyüklük tahminidir, takvim sözü değildir.

## 1. İlçe ihtiyaç panosu ve tamamlayıcı üretim — S, mevcut Alfa-0

**Mevcut / eksik:** [Yerel pazar](../../packages/cekirdek/src/perakende/yerelPazar.ts) mal bazında NPC hane talebini, dükkân çekimini ve satış paylaşımını hesaplıyor. Görünmez esnaf da talebi karşılıyor; oyuncu satışının düşük olması halkın aç kaldığı anlamına gelmez. İlçe genelinde “oyuncuların karşılayabildiği talep” görünürlüğü ve ortak hedef sunumu eksik.

**Karar ve bedel:** Oyuncu komşularının ağırlık verdiği ekmek yerine başka bir mevcut malı üretmeyi seçebilir; bunun bedeli arsa, yöntem değişimi, stok ve vazgeçtiği satış fırsatıdır. Komşular aynı NPC talep havuzunda hem rekabet eder hem çeşitliliği görünür kılar. Bu ilk adım dolaylı sosyal farkındalıktır; doğrudan oyuncular arası mal transferi değildir.

**Minimum teslim:** Tek ilçe kartında mal, oyuncu satış oranı ve NPC talebi; kalan fırsattan kendi üretim ekranına geçiş. Canlı üretim varlığını gerçekleşmiş satış diye saymamak gerekir. Geçmiş kayıt yoksa tarihsel katkı grafiği vaat edilmez.

**Risk / boş dünya:** Yeni para veya çarpan verilmediğinden göstermelik katkı çiftçiliği teşvik edilmez. Tek dükkân bile panoya anlam kazandırır; sıfır oyuncuda NPC tabanı görünür. Zengin işletmenin baskınlığı, yeni üreticinin giriş maliyetiyle birlikte gösterilir; zorunlu hedef tamamlama yoktur.

## 2. Bölünebilir sabit fiyatlı kamu siparişi — M, sonraki Alfa-0 dilimi

**Mevcut / eksik:** [Kamu kasası](../../packages/cekirdek/src/mulk/kasa.ts) ödenek rezervi, iptal, ödeme ve ithalat-paritesi fiyat tavanını içeriyor. `siparis_al` ve `siparis_teslim` komutları yok. [Dönüş özeti](../../packages/sunucu/src/donus/ozet.ts) `siparis_geldi` kartını tanıyor fakat kayıt üretimi yer tutucu.

**Karar ve bedel:** İki üretici aynı kamu ihtiyacını farklı zamanlarda kısmen tamamlar. Katılımcı malını dükkânda satmak yerine bu siparişe teslim eder; bedeli stok ve fırsat maliyetidir. Minimum kişi sayısı konmaz: tek üretici de işi tamamlayabilir.

**Minimum teslim:** Üretim liderinin ilk v0 önerisi bir mevcut mal, sabit ilan ve tek teslimdir; önce bu işlem tamamlanmalıdır. Kısmi teslim ve kalan miktar, çok üreticili sosyal genişlemedir. Ayrılmış ödenek korunur; mal düşümü ve ödeme birlikte uygulanır. Hedef dolunca kapanır; sosyal genişlemede ilanı sahiplenip diğerlerini engelleyen rezervasyon eklenmez.

**Risk / boş dünya:** Kasa yoksa ilan açılmaz; hibe basılmaz. Toplam oyuncu ödemeleri için pencere girişinin %50 tavanı, tek alım ve haftalık bütçe korunur. Alt hesaplar yeni kişi-başına kotayı aşabilir; mevcut toplam kasa sınırı bundan etkilenmemelidir. İthal-kamu-perakende arbitrajı ekonomi incelemesine bağlıdır. İlanı kimse tamamlamazsa temel üretim durmaz, açık bütçe kapanışta serbest bırakılır.

## 3. Tek partilik komşu tedariki — L, Alfa-1 sonrası aday

**Mevcut / eksik:** Üretim yöntemleri uzmanlaşmayı, NPC pazarı boş dünyada ticareti destekliyor. [Politika anlaşmaları](../../packages/cekirdek/src/politika.ts) ticaret/ortak altyapı ilişkisini tutuyor; belirli oyuncuya mal teslimi, alıcı ödeme emaneti ve sipariş yaşam döngüsü sağlamıyor.

**Karar ve bedel:** Fırıncı un ister; değirmenci kendi zincirini büyütmek yerine komşunun tek partisini karşılamayı seçer. Alıcı parasını, satıcı mevcut stokunu işlemde bağlar. Devamlı borç veya çevrimdışı üretim sözü verilmez; NPC seçeneği açık kalır.

**Minimum teslim:** Yapılandırılmış mal/miktar/fiyat seçimi, alıcı ödemesinin bloke edilmesi, mevcut mal ile tek seferlik kabul, atomik değişim ve süre sonunda iade. Serbest metin, otomatik uzun sözleşme ve ihale yoktur.

**Risk / boş dünya:** Alt hesapla başlangıç hibesini aktarma, kendi kendine ticaretle sahte başarı üretme ve fiyat manipülasyonu ciddi risklerdir; tasarımı sadece NPC fiyat bandıyla güvenli saymak yanlış olur. Transfer kuralları çözülmeden uygulanmaz. Tedarikçi yoksa oyuncu NPC'den alır; ilan ve emanet süresiz kilitlenmez.

## 4. Kamu arsasında ortak eser — L, sonraki kapsam

**Mevcut / eksik:** [Kamu arsaları](../../packages/cekirdek/src/mulk/kamu.ts) satılamayan alanları tanımlıyor. [Kamu araştırması §3.4](kamu-ve-kamu-arazileri.md) proje kartı öneriyor; aşamalı eser, katkı defteri ve tamamlanma sonucu uygulanmış değil.

**Karar ve bedel:** Üreticiler park veya meydan düzenlemesi için farklı mevcut malları teslim eder. Bedel üretim kapasitesi ve stoktur; karşılığı bütçeli ödeme ve ilçede kalıcı, görünür bir sonuçtur. Aynı kişi aşamaları sırayla yapabilir.

**Minimum teslim:** Bir mevcut kamu bloğunda tek eser, açık gereksinimler, siparişten gelen doğrulanmış katkı ve tamamlanınca harita işareti. Yeni yapı/ölçek açılışını bu projeye bağlamamak gerekir; ilçe seviyesinin kilit olmadığı güncel karar korunur.

**Risk / boş dünya:** Varlıklı oyuncu tek başına bitirebilir; bu, küçük dünyayı kilitlemekten iyidir. İsim gösterimi gönüllü, ödül teslim edilen mala bağlı olur. NPC tamamlama ancak mevcut bütçeyle ve açık NPC kaydıyla mümkündür; hiç kaynak yoksa eser bekler, diğer oyuncular cezalandırılmaz.

## Ekip bağımlılıkları ve önerilen sıra

Ekonomi lideri bütçe, marj ve transfer istismarını; üretim lideri mevcut stok/teslim ayrımını ve sipariş komutlarını; ilerleme lideri gerçek olgudan dönüş önerisini değerlendirmelidir. Kritik bağımlılıklar üç liderle paylaşıldı. Önce ihtiyaç panosu, ardından bütçeli kamu siparişi öneriyorum. P2P tedarik ve ortak eserler bağımsız sonraki adaylardır. Başarı sorusu, oyuncunun başka bir üreticinin yaptığı işe bakarak kendi üretim kararını değiştirip değiştirmediğidir; katılımcı sayısı veya tıklama tek başına kanıt değildir.
