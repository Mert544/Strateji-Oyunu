# İlk saat: oyuncunun kararını sonucuna bağlamak

**2 Ekim 2026 · Codex araştırma dalgası.** Bu çalışma güncel kaynak kodunu ve mevcut oyuncu yolculuğu belgelerini okur; yeni oyuncu gözlemi, test veya ekonomi ölçümü yapılmadı. Önceki satış teslimindeki gerçek WS kanıtı ayrıca belirtilir. Aşağıdaki dakikalar oyuncu deneyiminin inceleme pencereleridir; giriş süresi, oyuncunun karar hızı ve sunucu saat hızı nedeniyle tamamlanma taahhüdü değildir. S/M/L göreli uygulama büyüklüğüdür: S mevcut veri/metinle dar istemci işi; M birkaç yüzeyde durum ve amaç bağlantısı; L yeni muhasebe veya protokol gerektiren iş.

## Mevcut durum ve öğrenme fırsatı

Yeni oyuncuda 50.000 ₺ hibe, altı hücre ücretsiz yurt ve ilk beş yapı indirimi bulunuyor. Varsayılan ilk çiftlik süresi 12 **sim dakika**; sunucu saatinin varsayılan hızı 1. Yeni Mal paneli mal ve il bilgisiyle “Pazar'da sat” açıyor, üretim hızından miktar öneriyor, emri onaylıyor ve iptali görünür kılıyor. Stok yokken neden veriyor. Buna karşılık verilen miktarın neden önerildiği veya miktarı değiştirmekle oyuncunun hangi ekonomik tercihi yaptığı açıklanmıyor.

Defter kazanımları ve ödülleri gösteriyor; üst kartın ilk etkin adımı seçmesi bir rehberlik sırası, ekonomik zorunluluk değil. “Atla” üst kartı gizliyor, kazanım hakkını kaldırmıyor. Dükkân önerisi ilk üretim yapısının inşası başladıktan sonra çıkabildiği için oyuncu satış sonucunu beklemeden dükkânını kurabilir. Bu serbestlik korunmalı. Tarihsel ilk-saat belgesi dükkânın işleme önüne alınmasını kararlaştırılmış gösteriyor; güncel `DEFTER_ODUL_SIRASI` hâlâ işleme, ekmek ve zinciri dükkândan önce listeliyor. Araştırma tek doğrusal sıra varsayımına dayanmıyor.

| Pencere | Oyuncunun amacı ve seçimi | Mevcut geri bildirim | Öğrenme ve bekleme ihtiyacı |
|---|---|---|---|
| İlk 5 dakika | Bir yerde başlayıp ilk yatırımın anlamını kavramak; ilçe, yurt veya ek arsa seçmek. | İlçe önerisi, yurt kartı, sermaye ve yapı maliyeti. | Ücretsiz yurdun ilk yapıya yettiğini; ilçenin yön önerdiğini fakat sınıf kilidi koymadığını anlamak. Giriş uzarsa bu pencere yalnız yerleşmeye ayrılabilir. |
| İlk 15 dakika | Yapının ne üreteceğini görmek; kurmak, geri almak veya başka işi değerlendirmek. | İnşa aşaması/kalan süre, yöntem girdileri ve çıktıları, Defter ve erken dükkân önerisi. | “Kuruldu” ile “üretim başladı” ayrımı; beklerken haritada gezinmek, sermayeyi korumak veya dükkânı incelemek arasında gerçek seçim. Her oyuncuda üretim bu dakikada başlamış olmayabilir. |
| İlk 60 dakika | İlk maldan satış kararı almak; miktarı değiştirmek, emri sürdürmek/iptal etmek veya raf hazırlamak. | İstenen emir oranı, gerçekleşen Satış/sa, hazine net akışı ve Defter kayıtları. | Emir kabulü, saat çözümünde gerçekleşen oran ve zamanla biriken geliri ayırmak. Dükkân/raf kararı mümkünken Defter güncellemesini beklemek zorunlu sanılmamalı. |

Önceki gerçek WS satış teslimi ilk saat çözümünün gerçekleşen oranı başlattığını, gelirin sonraki aralıkta biriktiğini gösterdi. İptal sonrası normal stok gideri de sürdü. Bu nedenle düşen stok tek başına satışın, artmayan net hazine de başarısızlığın kanıtı değildir. `ilk_satis` dedektörü kabul edilmiş emri değil birikmiş brüt ihracatı okur. İlk 60 dakikada ödül gelmesini garanti etmek yanlış öğrenme yaratır.

## Dört ürün önerisi

**1. Defter adımına bir neden ve bir gözlenebilir sonuç ekle — S.** İlk yapı için “Çiftlik tahıl üretir; üretim başladıktan sonra Mal'da üretim oranını ve stoğunu izleyebilirsin”; satış için “Saatlik miktar sürekli emirdir; gerçekleşen oranı Mal'da izlersin”; dükkân için “Malı rafa koymak satışa hazırlar; rafın devamı stok ve üretime bağlıdır.” Açıklamalar kısa ve isteğe bağlı açılır. Ödül yan bilgi olarak kalır. Oyuncu Defter'i takip etmeden de aynı bilgiye ilgili yüzeyden ulaşır; yeni tamamlanma şartı eklenmez.

**2. Satış kararını küçük bir sonuç özetiyle tamamla — S/M.** “Öneri mevcut üretim hızından geldi; ihtiyacına göre azaltabilirsin” açıklaması, istenen ve gerçekleşen oranı ayrı adlandırma, kabul sonrasında doğru izleme yüzeyine yönlendirme. İlk dilim gelir garantisi veya net kâr hesabı üretmez. Emir belirli il düğümüne aittir fakat ihracat işletme ağındaki mallarla karşılanabilir; “yalnız bu ilçenin deposu satılır” denmez. Gebze/Körfez aynı il havuzunu paylaşır. Rafın ağ stokunu kullanması da bu açıklamayla uyumlu olmalı.

**3. Beklemeyi boşluk yerine serbest planlama anı yap — S.** İnşa sırasında “Sen yokken de inşa sürer” bilgisi ve en fazla iki bağlama uygun seçenek: sermayeyi/üretimi incele veya mevcut dükkân hazırlığını gözden geçir. Seçenekler süreyi hızlandırmaz, ücretsiz kaynak vermez ve günlük görev oluşturmaz. Stok/uygunluk yoksa açıklama gösterilir; düşük verimden belirli bir eksik mal teşhisi üretilmez. Amaç oyuncuyu zorla meşgul etmek değil, bekleme nedenini ve çıkma özgürlüğünü anlaşılır kılmaktır.

**4. İlk saati oyuncunun ertesi güne taşıdığı amaçla bitir — M.** “Sonraki gelişinde neyi değiştirmek istersin?” sorusunda mevcut duruma göre “rafı sürdürülebilir kıl”, “tahılı işle” veya “ikinci yatırım için sermayeyi koru” seçenekleri önerilir. Atla ve değiştir serbesttir. Amaç; ilgili işletme/ilçe, son görülen üretim/satış durumu ve sim zamanıyla ilişkilendirilir. Bu bir ödül veya otomatik emir değildir; dönüşte oyuncuya kendi kararını hatırlatır.

## En küçük teslim dilimi ve bağımlılıklar

Önce ilk yapı ve tahıl satışına iki kısa neden-sonuç açıklaması, Pazar miktar önerisinin gerekçesi ve mevcut gerçekleşen satış alanına yönlendirme teslim edilir: **S**. Başarı göstergesi daha çok görevin tamamlanması değil, oyuncunun sürekli emri ve gerçekleşme gecikmesini açıklayabilmesidir. Daha sonra fırsat çıktığında kısa oyuncu görüşmesinde bu ayrım sorulabilir; bu araştırmada yeni test çalıştırılmadı.

T-L ile anlaşma: bu not bilgi gereksinimini tanımlar; Dikkat navigasyonu, stok bağlamı ve ekran yerleşimi tasarım araştırmasında kalır. A-L ile devir: ertesi gün amacı ilk haftanın yatırım tercihlerine bağlanır. O-L ile ekonomi sınırı: mevcut hibe/indirim yeterlilik araştırmasının girdisidir; yeni hibe, garantili marj veya tahıldan bütün ihtiyaçları karşılayan gelir vaadi önerilmez. Hesaplanmış kâr göstergesi güvenilir fiyat/komisyon/akış ayrıştırması gerektirirse **L** olarak sonraya bırakılır.

**Kaynaklar:** [oyuncu yolculuğu](alfa0-oyuncu-yolculugu.md), [ilk saat belgesi](alfa0-ilk-saat-akisi.md), [rehber hedefleri](rehber-gorevler.md), [Defter sunumu](../../packages/istemci/src/harita/defter.ts), [ödül sırası](../../packages/protokol/src/defter.ts), [Pazar formu](../../packages/istemci/src/harita/pazar-panel.ts), [kazanım koşulları](../../packages/sunucu/src/odul/dedektor.ts), [ihracat ağ kaynağı](../../packages/cekirdek/src/pazar/piyasa.ts), [mevcut parametreler](../../packages/veri/icerik/parametreler.json).
