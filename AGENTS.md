# Takım çalışma düzeni

Bu depo dört takımla geliştirilir. Ana koordinatör kullanıcıyla konuşur, ürün
önceliklerini belirler, lider raporlarını inceler, görev trafiğini ve entegrasyonu
yönetir. Kullanıcının güncel talimatı önce gelir.

## Kadro ve uzmanlıklar

Ana koordinatör mevcut ana ajan; kullanıcının istediği profil GPT-6 Astra yüksek.
Alt ajanlar GPT-6.1 Sol kullanır. Liderlerde ve karmaşık uygulama/incelemede yüksek
muhakeme tercih edilir. Ana ajanın modeli araçla değiştirilemez; ayarlanmış gibi
raporlanmaz.

| Takım | Lider | Üç uzman rolü |
|---|---|---|
| Operasyon | O-L: kalite, teslimat ve çalışma ortamı | O1: test/regresyon/entegrasyon; O2: performans/yük/gözlemlenebilirlik; O3: dağıtım/Postgres/yedek ve geri yükleme |
| Ar-Ge | A-L: ürün hipotezleri ve kanıt değerlendirme | A1: oyuncu araştırması/ilk saat/dönüş; A2: ekonomi/denge/ölçüm tanımları; A3: kabul ölçütleri/şartnameler/kanıt raporu |
| Oyun içi tasarım ve arayüz | T-L: tutarlı oyuncu deneyimi | T1: görsel sistem/erişilebilirlik; T2: akışlar/metinler/Defter; T3: harita/3D/mobil etkileşim |
| Kodlama | K-L: mimari, sözleşmeler ve kod incelemesi | K1: frontend/istemci entegrasyonu; K2: backend/protokol/kalıcılık; K3: deterministik çekirdek/veri sözleşmeleri |

Bu tablo görev rolleridir; bütün rollerin aynı anda çalışan ajanlar olduğunu
göstermez. Oturumun gerçek eşzamanlı ajan sınırına uyulur. İlk Codex oturumunda
sınır ana ajan dahil 7'dir: ana ajan + 4 lider + en çok 2 uzman. Uzmanlar iş
dalgalarıyla çalıştırılır. Yeni ajan açılışını koordinatör planlar; liderler
ayrılan kontenjanı aşmaz. Boşta kalan uzman, liderine durum bildirir; kendiliğinden
kapsam genişletmez. Geçmiş raporlardaki K4 gibi kimlikler tarihsel kalır, yeni
kadronun parçası sayılmaz.

## İletişim ve lider toplantıları

- İş başlangıcında liderler mevcut kodu, son devir raporunu ve ilgili kanıtı okur.
  Birbirlerine bağımlılıklarını doğrudan iletir; koordinatör tek teslim hedefini
  ve kapsamını kesinleştirir.
- Her işte kimlik, sahip, yazılabilecek dosya alanı, bağımlılıklar, kabul ölçütü
  ve doğrulama yöntemi belirlenir. Aynı dosyanın eşzamanlı iki yazarı olmaz.
- Sözleşme veya kabul ölçütü değişirse ilgili liderlerle kısa karar toplantısı
  yapılır: öneri, karşı görüş, karar, uygulayıcı, doğrulayıcı ve kalan engel
  kaydedilir. Yalnız rapor göndermek ortak karar alınmış sayılmaz.
- Uzman; bulgusunu, değiştirdiği dosyaları, çalıştırdığı kontrolleri ve
  sınırlamalarını kendi liderine raporlar. Lider değişikliği inceler ve diğer
  takıma devredilecek çıktıyı açıklar. Kullanıcıya birleşik raporu koordinatör verir.
- Kapanışta liderler kabul kanıtını karşılaştırır. Tamamlanan, doğrulanamayan ve
  sıradaki işler birbirinden ayrılır. Kalıcı kararlar ve görev durumu
  `docs/agent-results/` altında saklanır; özel sohbet geçmişi zorunlu girdi olmaz.

## Depo ve ürün kuralları

- Simülasyon kurallarında `docs/06-simulasyon-spesifikasyonu.md`, ürün yönünde
  `docs/11-urun-donusu.md` ve kullanıcının sonraki kararları esas alınır.
  Eski görev tablolarının tamamlandı/bekliyor sütunları kodla doğrulanır.
- Türkçe arayüz ve belgeler, ASCII Türkçe kod tanımlayıcıları korunur.
- `packages/cekirdek` için aynı anda tek uygulayıcı olur. Sözleşme değişiklikleri
  K-L tarafından istemci, sunucu ve veri sahipleriyle koordine edilir.
- Aynı tohum ve komut günlüğü aynı dünya özetini üretmelidir. Çekirdeğe gerçek
  saat/rastgelelik eklenmez; mevcut determinizm ve donmuş altın kuralları korunur.
- Başkasının değişikliği silinmez; paylaşılan çalışma ağacında `git stash`,
  toplu geri alma veya otomatik temizleme kullanılmaz. Git commit/push, yayın ve
  dış iletişim yapılmış gibi gösterilmez; yalnız gerçekten yapılan işlem raporlanır.
- Yeni mekanik veya ekonomi ayarı, hata düzeltmesine sessizce eklenmez.
  Alfa-0 temeli üç ilçede arsa/yurt → üretim → satış → dükkân akışıdır.
  Kullanıcının 2 Ekim sonraki yönlendirmesi geliştirme odağını harita/grafik,
  üretim çeşitliliği, teknoloji, halk/politika ve askerî katmanlara genişletir.
  Önce son GitHub/Claude ilerlemesiyle plan çıkarılır; uygulama sırası
  `docs/16-cok-katmanli-gelistirme-plani.md` içindedir. Tarayıcı/mobil kontrolü
  birleşik geliştirme dalgasının sonuna bırakılır.

## Doğrulama ve kanıt

- **Kullanıcının 2 Ekim yönlendirmesi: gelişim öncelikli çalış.** Tekrarlanan test,
  ajan incelemesi ve raporlamanın zaman/token maliyetini azalt. Her küçük değişim
  için tam test paketi ya da geniş tarayıcı matrisi çalıştırma. Değişen davranışın
  riskine uygun tek kısa, hedefli kontrol yeterlidir; aynı kontrolü uzman, lider
  ve koordinatör ayrı ayrı tekrarlamaz. Yeni hata/değişiklik tekrar gerektiriyorsa
  yalnız ilgili kontrol yenilenir.
- Standart geniş kontrol `pnpm kontrol`; önemli teslim/entegrasyon noktalarında,
  çekirdek/kalıcılık değişiminde ya da somut regresyon şüphesinde kullanılır.
  Düşük etkili değişiklikler için yeni test yazılmaz. Gerektiğinde hedefli test,
  tip/derleme veya kısa gerçek kullanım kontrolünden uygun olan seçilir.
  Ortam nedeniyle kullanılan eşdeğer komutlar ve sınanmayan alanlar raporlanır.
- Ürün testinde yönerge metninin görünmesi eylemin başarı kanıtı değildir.
  Satış gibi davranışlarda gerçek komut, kabul/ret ve ekonomik sonuç doğrulanır.
- Tarihsel rapor, kâğıt hesap, bot ölçümü, tarayıcı testi ve insan testi ayrı
  kanıt türleridir. Çalıştırılmamış, atlanmış veya eksik altyapıyla sınanamamış
  testlere geçti denmez.
- Ağır yük koşuları tek sahipte sırayla çalışır. Postgres ve üretim provası için
  ortam hazırlığı doğrulanır; yerel bellek testi kalıcılık kanıtı sayılmaz.
- Atıf gerçek araç/sağlayıcıyı göstermelidir; eski Claude oturum kimliği yeni
  Codex çalışmasına kopyalanmaz. Entegrasyon betiğinin gerektirdiği dal/worktree
  ve oturum yapılandırması mevcut değilse tam kapı çalıştı denmez.

## Kullanıcıdan yeni “devam” beklemeden ilerleme

- Kullanıcının 2 Ekim son yönlendirmesi: onaylanmış çok katmanlı plan içindeki
  sıradaki somut işi ana koordinatör seçer, ajanları denetler ve bitirenlere
  bağımlılığı çözülmüş yeni görev verir. Her küçük teslimde izin istenmez.
- Güncel devam kaydı `docs/agent-results/codex-devam-durumu.md` içindedir.
  Kaydı ve çalışan ajanları kontrol etmeden aynı işe ikinci yazar atanmaz.
- Alt ajan modelini açılışta açıkça `gpt-6.1-sol` seç. Ana ajan dahil en fazla
  yedi eşzamanlı ajan vardır; boş kontenjanı doldurmak için rapor işi üretme.
- Oturum içi özerklik, oturum dışında çalışan bir zamanlayıcı olduğu anlamına
  gelmez. Doğrulanmış geliştirme ortamı olmayan hatırlatma aracıyla sürekli
  kod yazılacağını vaat etme. Arka plan görevi gerçekten kurulmadıysa kurulmuş
  gibi raporlama; devam kaydı kaldığı yerden çalışmayı mümkün kılar.

## 2 Ekim — 12 ajanlık görev havuzu

Kullanıcının son isteği 12 alt ajana iş dağıtılmasıdır. Bu sayı görev havuzudur;
ortam sınırı halen ana koordinatör dahil 7 eşzamanlı ajandır. D4'te 12 ayrı
GPT-6.1 Sol alt ajan iki dalga halinde çalışır (aynı anda en fazla altısı).
Dalga ve dosya sahipliği `docs/agent-results/codex-d4-gorevler.md` içindedir.
Önceki 4 lider + 2 uzman düzeni bu genişletilmiş havuz için zorunlu aktif
kadro sayısı değildir; görev ve iletişim kuralları geçerliliğini korur.

## Mevcut ajanları yeniden kullanma — son kullanıcı düzeltmesi

Kullanıcı mevcut ajan sayısının yeterli olduğunu, sürekli yeni ajan açılmamasını
ve aynı anda yedi ajanın çalışmasını istedi. Yeni ajan oluşturma; mevcut
ajanlara bağımlılığı çözülmüş uygulama, Ar-Ge ve entegrasyon görevleri ver.
Ortam sınırı ana koordinatör dahil yedidir: altı alt ajan + koordinatör.
Dosya sahipliği ve anlamlı görev ilkesi sürer; yalnız doluluk için yinelenen
test veya rapor üretme. Bitiren ajan uygun sonraki görevde yeniden kullanılır.

## Lojistik ve anlamlı ayrıntı — kullanıcının son yönü

- Üretim/tedarik genişletmelerinde petrol→yakıt, taşıma kapasitesi/süresi,
  yakıt/işletme/depolama giderleri gözden kaçırılmaz. Önce mevcut kod ve Ar-Ge
  birlikte incelenir; tarifede bulunmak çalışan uçtan uca zincir demek değildir.
- Hedef birebir gerçek dünya değildir. Ayrıntı; oyuncunun üretim konumu,
  tedarik, rota ve stok tercihine etkisiyle öncelik kazanır. Detaylar ihtiyaç
  oldukça açılır; oyuncuya yalnız idari iş yükü eklemek hedef değildir.
- NPC ithalat bedeli, tesisin otomatik şebeke tüketimi ve fiziksel taşıma
  gideri farklı kaynaklardır. Birini diğerinin yerine gösterme, aynı tüketimi
  iki kez ücretlendirme. Kodda hesaplanmayan nakliye/yakıt maliyeti uydurulmaz.
- D4 kod bulgusu: rafineri içeriği var ama mülk kurulumu yok; şebeke kapsamı
  sanayi yakıtı stoktan ikame edilmez; NPC ithalatına ayrı fiziksel rota yok.
  Yeni uygulamada bu tarihsel bulguları yeniden kodla karşılaştır.
  Sonraki sıra `docs/agent-results/codex-d4-lojistik-arge.md` içindedir.

## Son kullanıcı yönü — rutin ekran görüntüsü yok

Her teslimde ekran görüntüsü veya tarayıcı senaryosu çalıştırma. Kullanıcı
2 Ekim'de sürekli ekran alınmasını istemediğini belirtti. Geliştirmeyi
sürdür; davranış riskine uygun hedefli kontrol ve gerekli derleme yeterlidir.
Yeni ekran ancak kullanıcı isterse veya somut görsel sorunu çözmek için
gerçekten gerekiyorsa alınır. Tamamlanma ölçütü ekran galerisi değildir.
