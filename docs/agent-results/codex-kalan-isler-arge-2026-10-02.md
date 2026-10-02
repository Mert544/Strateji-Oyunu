# Kalan işler — ortak Ar-Ge kararı, 2 Ekim 2026

Altı uzmanın mevcut kaynak bulguları birlikte değerlendirildi. Bu kayıt yeni
oynanış/denge ölçümü, test veya ekran kanıtı değildir; gerçek teslim ve kabul
sonucu [devam kaydındadır](codex-devam-durumu.md). Kullanıcının son yönü:
rutin ekran alma yok, mevcut ajanlarla somut oyuncu kararlarını geliştirmeye devam.

## Hazır temel ve ilk uygulama

| Hat | Gerçek hazır davranış | Korunan sınır |
|---|---|---|
| Üretim/teknoloji | Koyun→yün→tekstil, balıkçılık, rafineri; T1/U1 gerçek tesis yöntem seçicisi, T2 görülen bedel/yöntem koruması, S3 durdur/başlat. | Tek tesis tek yöntem; nominal tarife gerçek kâr değildir. Duran tesiste bakım sürer. |
| Lojistik/rezerv | Stok öncelikli sanayi yakıtı ve şebeke açığı, gerçek iç taşıma bedeli, own yol/kenar tahsisi ve R1 kayıtlı maden rezervi. | MCF süreyi seçer; ekonomik rota tercihi yok. Kendi yük/toplam kapasite global boş kapasite değildir; rezerv anlık/ortak jeoloji değildir. |
| Kamu/katılım | K1 bütçeli gıda siparişi ve gerçek stok→kasa ödemesi; K2a tek ilçe meclis kaydı ve başarılı işlemlerden 3/7 simgün ilerlemesi. | Teslim kaydı refah bonusu değildir; katılım oy/adaylık/makam yetkisi vermez. |
| Ordu | Ordugâh, gerçek stokla eğitim, hazır/eğitim/revir kapasitesi, fiziksel ikmal ve sunucu savunma dökümü. | Duruş ikmal talebini değiştirmez. PvE varsayılan kapalı; PvP mülk hedefleme hazır değil. |

**İlk uygulama N1 — tamamlandı.**
[Kesin kapsam](codex-n1-kaynakli-tedarik-sozlesmesi.md):
Üretim hedef yönteminin uygun depolanabilir girdisi→gerçek kendi il deposu;
K1 paket stoğu eksiği→eşleşen kendi teslim deposu; ordu eğitim malı eksiği→
aynı il deposu, teknoloji eksiği→doğru araştırma kartı. Mevcut paneller açılır;
ithalat, teslim, eğitim veya araştırma komutu otomatik gönderilmez. Güncel
kaynak yeniden denetlenir; görülen hedef canlı çizimde değişmez, mevcut
tedarik taslağı korunur; kaybolan depo için sessiz alternatif seçilmez.
Elektrik ve stokla ikame edilmeyen şebeke girdisi ithalata yönlendirilmez.
Üç uygulayıcının entegrasyonu incelendi. B6'nın iki hedefli N1 vakası, istemci
tip kontrolü ve derlemesi başarılı; kapsam ve sınırlar devam kaydında.

## M1–H1 uygulama güncellemesi

[N1 sonrası M1–H1](codex-m1-h1-bakim-harita-sozlesmesi.md) tamamlandı;
üç hedefli vaka, kök/istemci tip kontrolü ve derleme ilk koşuda geçti. Oyuncu genelinde bakım düzeyi gerçek özel durum ve
ayrı görülen-düzey onayıyla bağlandı. Haritada kendi tesisinin gerçek hücre
çerçevesine odak ve sunucudaki durdurulmuş üretim işareti eklendi. Bakımın
tüketim/işletme gideri ve aşınma kuralları aynı; genel onarım/sondaj bu
kontrolün parçası değildir. Kabul sonucu devam kaydında tutulur.

## O1 uygulama güncellemesi

[O1 genel onarım](codex-o1-genel-onarim-sozlesmesi.md) tamamlandı:
sunucuda tek saf teklif hesabı, gerçek hedef/bedel/duruş, görülen teklif
koruması ve ayrı onay. O1 sonrasında sondajın eksik kalıcı sonucu için
[Ar-Ge kaydı](codex-sondaj-sonuc-arge.md) hazırlandı; bu eksik aşağıdaki S1
dilimine aktarıldı. Rezerv değişiminden sonuç uydurulmaz.
O1 iki hedefli kontrol, kök/istemci tip kontrolü ve derleme ilk koşuda geçti.

## S1 uygulama güncellemesi

[S1 sondaj](codex-s1-sondaj-sozlesmesi.md) gerçek teklif, ayrı onay ve
kalıcı iş/sonuç kaydını birleştirir. İki deneme kararlı kimlikle ayrılır;
başarısızlık, sıfır ek rezerv ve eski bilinmeyen geçmiş ayrı korunur.
Görülen maliyet/hak/koşullar sunucuda tekrar doğrulanır. Süre tahmini
erken oyun rampası nedeniyle değişebilir; kesin bitiş kabul edilen iştedir.
Eski iki RNG çekimi ve mevcut rezerv hesabı aynıdır. İçerik göçü ve kayıt
uyumu bu dilimdedir. İki hedefli vaka, kök/istemci tip kontrolü ve derleme
ilk koşuda geçti; ayrıntılı doğrulama sonucu devam kaydındadır.

## Uygulama sırası ve kalan kapsam

1. **Oyuncu genelinde bakım düzeyi — M1 uygulandı.** Hazır `bakim_duzeyi` komutunu gerçek
   mevcut düzey ve bütün kendi işletmelerine etkisiyle aç. Bakım girdisi/
   işletme gideri–günlük aşınma tercihidir; kıtlık yüksek bakımın iyileşmesini
   engelleyebilir. Önce private mevcut düzey ve görülen düzey koruması.
2. **Gerçek tesise harita odağı ve durma işareti — H1 uygulandı.** Mevcut tesis kimliği/
   hücrelerinden kesin hedefle; yalnız ilçeye uçuş tesis odağı değildir.
   Paused işareti aktif bilgisinden gelir, girdi/verim düşüklüğüyle karışmaz.
3. **Genel onarım ve sondaj, ayrı teklifler — O1/S1.** `genel_onarim` aşınmış tesislerin
   ölçekli inşa bedeli/malı ve duruşunu; `arama_sondaji` bedel/süre/hak ve
   belirsiz sonucu zaten hesaplar. Gerçek hedef ve görülen teklif koruması
   olmadan tek “onar” düğmesine indirgeme; yeni denge veya garanti yok.

Küçük paralel seçenekler: yalnız alınmış kendi ilçe karelerinden açık kamu
siparişine geçiş; seçilen eğitim adedinin **nominal ek ikmalini** gösterme.
Eksik kare “sipariş yok”, nominal ikmal “gerçek gelecek tüketim” sayılmaz.

## Gerçek engeller ve ayrı teknik borç

- **K2b:** K-16 güvence2 edinimini tanımlamaz; `HesapKaydi`/`AuthKimligi`
  hesap ve e-posta oturumunu doğrular, düzey2 kanıtı taşımaz. Güvenilir onay/
  iptal kaydı ve seçim dönem/oy/makam sözleşmesi gerekir; kimlik şartı uydurulmaz.
- **PvP:** `askeri/savas.ts:savasIlan` statik merkez hedefi/komşuluğu kullanır;
  mülk düğümü hedefleme ve savaşın duyuru/sonuç protokolü ayrı iştir.
- **Sokak/Kilimli:** ham z15 sokak/bina PMTiles yok, kayıtlı kaynak bu ortamda
  erişilemiyor; gerçek ilçe sınırı oynanabilir karo/ızgara değildir.
- **Hazine:** B6'nın statik şüphesi L1'in tek çalışan helper sınır kanıtıyla
  doğrulandı: güvenli tamsayı kredi kapasitede 1 mili kırpılırken defter tam
  krediyi yazdı. Normal ödül yolunda oyuncu açığı kanıtlanmadı; K1 tam ödeme
  önkontrolü korunuyor. Tam sığmayan kredi için mutasyon öncesi ret ayrı iştir;
  saatlik üst kelepçe bütünüyle incelenmiş veya sorun çözülmüş değildir.
- **Sunucu kurtarma:** genel restart kapsamı var; K1/K2a/S3/taşıma eşiğinin
  gerçek depo yeniden başlatma kapsamı eksik. Kalıcılık bozuk denmiyor.
- **Boyut bütçesi:** `istemci/scripts/derle.ts` aşımda yalnız yazı üretir,
  başarısız çıkış vermez. S1 sonrası dünya 395,8KB/400KB; bütçe kapısı ayrı borçtur.

Kaynaklar: `icerik.json`, `sanayi/{komut,carpan,gunluk}.ts`, `mulk/{kamuSiparis,
meclis,isletme}.ts`, `askeri/{uretim,savas}.ts`, `protokol/src/kare.ts`,
istemci `harita/{uretim-agi-panel,ordu-panel,ilce-yasam-panel,baglanti-ws}.ts`;
[üretim notu](codex-teknoloji-uygulama-arge.md), [kamu notu](codex-kamu-proje-arge.md),
[tesis kontrolü](codex-tesis-kontrol-arge.md), [L4 sözleşmesi](codex-l4-yol-sozlesmesi.md).
