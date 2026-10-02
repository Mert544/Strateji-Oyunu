# Kamu tedarikinden ilçe katılımına

**Güncel sınır.** İlk kamu tedarik dilimi K1'de uygulandı; [kesin sözleşme](codex-k1-kamu-sozlesmesi.md) fiyat/rezerv/teslim davranışını belirler. K2a'nın [meclis katılım sözleşmesi](codex-k2a-meclis-sozlesmesi.md) kesinleşti. Uygulama ve kabul kanıtı [devam kaydındadır](codex-devam-durumu.md); bu not bağımsız test veya seçimlerin hazır olduğu iddiası değildir.

**K1'de gerçek oyuncu kararı.** Sistem ilçe kasasından bütçeli gıda talebi açar. Oyuncu “stoğumu kamuya mı, üretim/ticarete mi ayırayım?” seçimini yapar; ilçede gerçek arsası varsa aynı ildeki kendi işletme deposundan paket teslim eder. Gerçek gıda eksilir ve kasadan oyuncuya para aktarılır; yeni para basılmaz. Siparişe ait rezerv ve teslim sırası korunur, ilan üstünü aşmayan canlı teklif bedeli komutla eşleşir; kullanılmayan ödenek çözülür. Halk etkisinin kaydı **kamu dağıtımına teslim edilen gıdadır**; mutluluk/nüfus/verim/açlık bonusu değildir.

**Korunan ekonomi.** `mulk/kasa.ts` rezerv/iptal/ödeme/fiyat tavanı sağlar: tek alım kullanılabilir bakiyenin %40'ını, haftalık kullanım 28 günlük girişin %25'ini, oyuncu ödemesi/rezervi aynı girişin %50'sini aşamaz. K1/K2a sınırları veya kasa kaynaklarını değiştirmez. Kasa ID'si makam yetkisi değildir. Perakende yalnız hane talebi ve kayıtlı dükkân satış payını ölçer; teslimi toplam ihtiyaç karşılama oranına dönüştürmek desteklenmez.

**K2a'nın somut dilimi.**

- `meclis_katil {ilce, oncekiIlce}`: bilinen ilçede gerçek kendi parseli gerekir. Tek siyasi kayıt: optional `meclis: {ilce, kayitZamani, etkinGunler}`. Koşullu yeni-oyuncu `katilimIlcesi`, işletme düğümü veya hücre sayısı özeti siyasi aidiyet değildir.
- İlk kayıtta `oncekiIlce:null`; taşımada mevcut ilçe tam eşleşir. Aynı ilçeye tekrar/eski bilgi reddedilir. **Seçimsiz dönemde taşıma serbest; günler sıfırlanır ve yeni ilçede o gün kaydedilir.** UI sıfırlamayı önceden gösterir; ileride seçmen dondurma ayrı sözleşmedir.
- İlk kayıt ve sonraki başarılı sistem dışı komutlar, kayıtlı ilçede gerçek parsel varken sim gününü bir kez yazar. Son 7 gün `bugun-6..bugun`, en çok 7 artan eşsiz gün. `sonEtkinlik` tek zaman damgasıdır, geçmiş üç gün üretmez. Otomatik satış/saatlik olay/sistem/ret gün kazandırmaz; günlük yoklama/ödül yoktur.
- Son parsel bırakılırsa geçmiş korunur, koşul düşer ve yeni gün kazanılmaz. Yeniden arsa edinildiğinde pencereye giren gerçek geçmiş sayılır. Saf görünüm eski günleri filtreler; okuma/yükleme dünya veya kuyruğu değiştirmez.
- Yalnız kendi oyuncu karesinde ilçe, arsa şartı ve 3/7 ilerlemesi görünür. **3 gün + mevcut arsa yalnız katılım koşuludur; oy/adaylık uygunluğu değildir.** Farklı ilçenin geçmişi yerel ilerleme sayılmaz; UI “Seçimler henüz açık değil” der.

**Sonraki yönetim dilimi.** Ürün §7.6 aktif parsel sahibi, hesap başına bir oy ve 14 günlük ilçe dönemi önerir. Hesap güvence düzeyi 2 kodda yoktur; e-posta oturumu bu düzey sayılamaz. Önce güvenilir hesap güvencesi, seçmen dondurma, adaylık, gizli oy, dönem/beraberlik/oy yokluğu ve çekirdek makam yetkisi kapatılır. Sonra İlçe Başkanı “gıda tedariki / bütçeyi koru” kararını yalnız yeni K1 ilanına uygulayabilir; mevcut sözleşme ve kasa sınırları korunur. İlk gelen başkan veya keyfî ödeme yoktur. Y39: Muhtar mahalle, İlçe Başkanı ilçe, Vali il.

**Kapsam dışında.** Kamu arsası hakkı/ihale, AI kamu karar ajanı ve savunma bonusu. Mevcut kenar geliştirmesi kapasiteyi artırır fakat oyuncu uç sahipliği kamu merkezinde belediye yetkisi sağlamaz; 400 çelik + 100 parça + 20 bin TL, taban fiyatla yaklaşık 86 bin TL'dir. İlk projeye uydurmak için maliyet sessizce düşürülmez.

**K2b karar boşluğu — güvence2.** `imza-mekanikleri-ve-yonelimler.md §5.1`
K-16 ve §5.2, seçimleri güvence düzeyi 2'ye bağlar; düzeyin edinim
prosedürünü tanımlamaz. E-posta, telefon/ödeme veya yüksek güvence alternatifleri
tek başına telefon/kimlik/ödeme zorunluluğu koymaz. Gerçek
`sunucu/src/depo/tipler.ts` `HesapKaydi`, hesap/e-posta/tek oyuncu bağını;
`giris/auth-kimligi.ts` ise imzalı bilet ve oturumu doğrular, düzey2 kanıtı
taşımaz. Hangi kanıtın güvenilir sunucu onay/iptal kaydı üreteceği, ardından
bu kaydın seçim uygunluğuna deterministik taşınması ayrı root kararıdır.
Kayıt veya edinim yöntemi icat edilmez; e-posta girişi güvence2 sayılmaz.
