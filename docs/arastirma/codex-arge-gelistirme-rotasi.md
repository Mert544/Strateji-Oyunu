# Oyun geliştirme Ar-Ge rotası — 2 Ekim 2026

**Öneri:** önce oyuncunun üretim ağını anlayıp karar verebildiği kısa geliştirmeleri
tamamla; ardından sabit fiyatlı, bütçeli kamu siparişlerini ilk yeni oyun döngüsü
olarak ekle. Yatırım seçenekleri ve fiyat rekabeti bu döngüyü derinleştirsin.

Bu çalışma mevcut kod, önceki araştırmalar ve ürün kararlarına dayanır. Yeni dış
pazar taraması, oyuncu görüşmesi, simülasyon veya test yapılmadı. Önerilerin
eğlence ve oyuncu tutma etkisi henüz doğrulanmış değildir. Bu tur ürün kodu
değiştirilmedi; önceki satış geliştirmesi mevcut çalışma ağacında korunuyor.

## Yedi ajanın iş bölümü

Ana koordinatör ve altı araştırmacı aynı anda çalıştı. Mevcut dört takım yapısı
korundu; bu dalgada araştırma sorumlulukları aşağıdaki gibi paylaştırıldı.

| Ajan | Araştırma alanı | Çıktı |
|---|---|---|
| Ana koordinatör | Ürün yönü, çelişkilerin çözümü ve geliştirme sırası | Bu sentez |
| A-L | İlk haftadan 30. güne ilerleme ve yatırım hedefleri | [İlerleme](codex-arge-ilerleme.md) |
| T-L | Arayüz, harita ve bilgi→eylem geçişi | [Arayüz](codex-arge-arayuz.md) |
| K-L | Üretim zincirleri ve teknik uygulanabilirlik | [Üretim](codex-arge-uretim.md) |
| O-L | Ekonomi, pazar ve anlamlı fiyat kararları | [Ekonomi](codex-arge-ekonomi.md) |
| K1 | İlk 5/15/60 dakika ve öğrenme | [İlk saat](codex-arge-ilk-saat.md) |
| O1 | Sosyal bağımlılık, kamu siparişleri ve ortak hedefler | [Sosyal oyun](codex-arge-sosyal.md) |

## Kodla karşılaştırınca değişen varsayımlar

- **Üretim ağı mevcut.** Değirmenin un/kepek çıktısı, bazı yan ürün yöntemleri,
  otomatik lojistik, tesis ölçekleri ve araştırma altyapısı zaten var. Bunları
  yeniden yazmak yerine erişilebilir kararlar hâline getirmek gerekiyor.
- **Bir ildeki emir yalnız o ilin stoğu değildir.** Mülk kipinde ihracat,
  oyuncunun bütün işletme ağından beslenir (`pazar/piyasa.ts`,
  `pazarEmirleriniGerceklestir`). Dükkân da ağdaki stok, üretim ve gelen akışı
  değerlendirir (`mulk/perakende.ts`, `malVarMi`). Ekranda emir verilen işletme,
  yerel stok ve ağ toplamı ayrı adlandırılmalı.
- **Önce giderilecek somut uyumsuzluk:** yeni `pazar-panel.ts` formu yerel
  `stokMili <= 0` koşulunda satış açmayı/göndermeyi engelleyebiliyor; çekirdek
  başka işletmede stok, üretim veya gelen akış varken ihracatı kabul edebiliyor.
  Ağ uygunluğu ile emir verilen konum ayrılmalı. Bu kaynak incelemesi bulgusudur;
  bu Ar-Ge turunda ayrıca çalıştırılmadı veya düzeltilmedi.
- **Üretim girdisinin önceliği zaten var.** “İhracat her zaman fabrikayı aç
  bırakıyor” gerekçesiyle ikinci bir öncelik sistemi eklemek doğru değil.
  Kullanıcı tanımlı garantili stok tamponu ise ayrı, yeni bir mekaniktir;
  eşik olayları ve birden çok emrin ortak stok kullanımı nedeniyle basit bir
  arayüz seçeneğinden daha büyük iştir.
- **Fiyatın talebe etkisi sıfır değil.** Mevcut yerel pazar fiyat ağırlığına
  sahip. Asıl soru, oyuncuya yeterli alternatif sunup sunmadığıdır. Eski Ar-Ge
  yüksek kademenin kimi koşullarda baskın olduğunu belirtiyor; tek parametre
  değişiminin bütün rekabet koşullarını çözdüğü kanıtlanmış değil.
- **Kamu siparişinin temeli var, oyun akışı yok.** Kamu kasası ve rezerv
  yardımcıları mevcut; sipariş oluşturma/teslim etme yaşam döngüsü eksik.
  `docs/12-yon-taslagi.md` §10, sabit fiyatlı v0'ı Defter sonrasında Alfa-0
  sırasına koyuyor. İhale, seçim ve imece aynı teslimin zorunlu parçaları değil.

## Önerilen geliştirme sırası

S/M/L göreli büyüklük tahminidir; gün veya teslim tarihi taahhüdü değildir.

| Sıra | Geliştirme | Oyuncunun kazanacağı karar | En küçük teslim | Büyüklük |
|---|---|---|---|---|
| 1 | **Defter ve doğrudan eylem** | “Şimdi hangi işi yapmak istiyorum?” | Mevcut bir hedefi sabitleme; gerçek engel; doğru raf, yapı veya satış ekranına bağlantı | S/M |
| 2 | **Üretim ağını anlama** | “Üretimi artırayım mı, satış oranını mı değiştireyim?” | Tek malda ağ stoğu, mevcut akış ve emir/gerçekleşen miktar; ilgili eylemler | S/M; eksik veri sözleşmesi varsa M |
| 3 | **Bütçeli kamu siparişi v0** | “Malı mevcut kanalda mı satayım, sipariş için mi üreteyim?” | Tek ilçede tek mal, sabit fiyat, ayrılmış kamu bütçesi, teslim ve kapanış | M/L |
| 4 | **İki yatırımı karşılaştırma** | “İthalatla devam mı, kendi değirmenimi kurmak mı?” | Bir zincir için maliyet, girdi ihtiyacı ve elde kalacak para karşılaştırması | M |
| 5 | **Fiyat rekabetini derinleştirme** | “Düşük marj–yüksek satış mı, yüksek marj–düşük satış mı?” | Önce fiyat/gerçek satış/kasa/talep ilişkisini göster; model ayarını ayrı dilimde ele al | Görünüm S/M, kural değişimi M |

**İlk uygulama paketi:** önce satış uygunluğunun ağ kuralıyla uyumu, ardından
1 ve 2'nin küçük parçaları. **İlk yeni mekanik:** 3.
Kamu siparişine başlamak için yatırım karşılaştırması veya geniş fiyat modeli
geliştirmesinin bitmesini beklemek gerekmiyor. Böylece arayüz iyileştirmeleri
sonsuz bir hazırlık evresine dönüşmüyor.

### 1–2: İlk saatten işletme kararına

Oyuncu çiftliğini kurduğunda Defter, dükkân/raf ve satışın mevcut durumuna göre
ilgili eylemi gösterebilir. Oyuncu öneriyi bırakıp başka bir işe geçebilir; yapı,
yöntem ve yön seçimine yeni kilit eklenmez. “Emir alındı”, “saat başı işlendi”
ve “gelir birikiyor” ayrı durumlar olmalı. Yeni para ödülü veya daha kısa inşa
süresi bu önerinin parçası değildir.

Bir dükkânın rafı boşsa Dikkat maddesi doğrudan o rafı açar. Bir tesisin verimi
düşükse kesin neden bilinmeden “girdi satın al” denmez. Tahıl ayrıntısında ağ
toplamı, emir verilen işletme ve mevcut satış birlikte okunur. Gerçek karşılanan
girdi veya lojistik açıklaması protokolde yoksa, yalnız nominal üretimden kesin
“fazla stok” ya da bitiş zamanı hesaplanmaz; gerekli alanlar ayrı küçük sözleşme
işi olarak eklenir.

**Oyuncu açısından tamamlanma:** doğru dükkânı yeniden aramadan açabilir,
satış emri ile gelir farkını anlayabilir ve hangi işletme için emir verdiğini
görebilir. Bu ilk dilim yeni depo rezervasyonu veya manuel taşıma eklemez.

### 3: İlk yeni oyun döngüsü — kamu siparişi

Örnek: ilçenin panosunda mevcut oyun mallarından birine ihtiyaç görünür.
Oyuncu üretim kapasitesi, eldeki stok ve diğer satış kanallarıyla karşılaştırır;
katılmayı veya mevcut işini sürdürmeyi seçer. Bedel kamu kasasında ayrılmıştır;
teslim edilebilir miktar, fiyat ve kalan miktar açıktır. Tamamlanma veya süre
sonunda sipariş kapanır, kullanılmayan rezerv serbest kalır.

İlk uygulama **sabit fiyat + tek mal + tek ilçe** ile sınırlanmalı. Serbest
teklif, kooperatif tüzel kişiliği, seçim ve özel NPC yapay zekâsı gerekmez.
Birden fazla üreticinin kısmi katkı yaptığı ortak sipariş görünümü sonraki
kademede genişletilebilir. Az oyunculu ilçede tek kişinin de ilerletebileceği
ölçek hedeflenir; görev her oyuncuya zorunlu değildir.

Mevcut kamu bütçesi ve fiyat tavanı kuralları korunur. Ücret yalnız kabul edilen
teslim kadar ödenir; aynı mal hem rafta satılmış hem siparişe teslim edilmiş
sayılamaz. Bu para/stok değişimi için dar bir doğrulama gerekir; başka alanların
testlerini sürekli tekrarlamak gerekmez. NPC bütçesini dışarıdan para yaratarak
doldurmak kapsam dışıdır.

**Oyuncu açısından tamamlanma:** ilanı okuyabilir, elindeki mala göre karar
verebilir, teslimin mal/para karşılığını ve siparişin kalanını görebilir.

### 4–5: Kararı derinleştirme

İlk yatırım karşılaştırması yalnız bir zinciri ele alır. Peşin maliyet ve
girdi ihtiyacı olgudur; gelecekteki kâr talebe, lojistiğe ve diğer oyunculara
bağlıdır. Kesin geri ödeme vaadi verilmez. Oyuncu parasını korumayı da seçebilir.

Fiyat görünümünde “daha pahalı = daha iyi” öğretilmez. Gerçekleşen satış,
talep/kasa sınırı ve kanalın maliyeti birlikte okunur. Kural ayarı, önceki
`alfa1-talep-esnekligi.md` sınırlarıyla ayrı ele alınır; bu araştırma herhangi
bir yeni katsayıyı doğrulanmış denge değeri olarak seçmedi.

## Sonraki ufuk

- **İmece ve kalıcı ortak eserler:** bütçeli sipariş yaşam döngüsü oturduktan
  sonra, düşük nüfusta da ilerleyen ortak amaçlar.
- **Garantili üretim tamponu:** oyuncunun seçtiği stok hedefini ağ genelinde
  koruma; tembel akış eşikleri, çoklu emir ve yoldaki mal ayrımı tasarlanmalı.
- **Askeri ikmal, PvE ve il rekabeti:** mevcut ürün kararlarında önemli eğlence
  ayağı olarak korunur. Parsel sahipliği savaşla değişmez; üretim ve ikmal
  kararına bağlanan ayrı dilim hazırlanır. Bu tur savaş sistemi uygulanmadı.

## Lider toplantısının sonuçları ve uygulama sahipliği

T-L'nin stok kapsamı sorusu K-L'nin çekirdek incelemesiyle düzeltildi; O-L
ekonomi önerisini bu ağ modeline göre daralttı. A-L ayrı proje sistemi yerine
mevcut Defter'de tek seçili hedefi kabul etti. O1, kamu siparişinin eski kararlarda
Alfa-0 sırasındaki yerini teyit etti; K-L önerisini buna göre güncelledi.

Uygulamada ilk paket K1 + T1/T2; ağ açıklamaları için K2/K3'ün küçük veri
sözleşmesi desteği kullanılır. Sipariş v0, K3 tek çekirdek yazarı ve K2 sunucu
sahibiyle ayrı paket olur; A2 bütçe/fiyat tanımını, T2 pano akışını netleştirir.
Bu roller aynı anda sınırsız ajan açıldığı anlamına gelmez: ana koordinatör
dahil en çok 7 aktif ajan, dosya başına tek yazıcı ve iş dalgaları devam eder.

Kullanıcının gelişim önceliği geçerlidir: bu Ar-Ge turunda test/derleme yok.
Uygulama sırasında yalnız değişen davranış için gerekli kısa kontrol yapılır;
aynı kontrol ajan, lider ve koordinatör tarafından tekrarlanmaz.
