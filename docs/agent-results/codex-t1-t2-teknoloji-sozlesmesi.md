# T1–T2 — Araştırmadan kendi tesisinde yöntem kararına

2 Ekim root kararı. A6/B2/L1 mevcut veri ve ücretsiz yöntem geçişini;
A3/B4 aynı yöntem seçicisinin yeniden kullanımını teyit etti.
İki bağlı teslim tek doğrulama dalgasında tamamlanır.

## T1: araştırmanın kendi tesislerine etkisi

Teknoloji kartında **Benim tesislerimde** ayrıntısı. Eşleme yalnız
`tur.yontemler` içindeki `gerekliTeknoloji` ve kendi gerçek
`IsletmeDurumu.yapilar` üzerinden yapılır. İsimden/ilçeden tesis uydurulmaz.
İşletme null ise bilgi alınmadı, [] ise uygun tesis yoktur. İnşaat,
bilinmeyen yöntem ve hedef yöntem zaten kullanılıyor durumları ayrılır.

Tamamlanmış tesisin mevcut yöntemi ile araştırmanın açacağı yöntemin
nominal saatlik girdi/çıktı ve bakım tarifeleri yan yana gösterilir.
S ölçeği/tam kapasite temelidir; gerçek üretim, kâr, maaş tasarrufu veya
şebeke gideri hesaplanmış gibi sunulmaz. İşçi nominal farkı bu dilimde
gösterilmez. Stok eksikliği yöntem değiştirme yetkisini engellemez.
Bakım satırı ham içeriğin **Temel bakım tarifi** olarak etiketlenir;
ölçek ve bakım ayarları gerçek tüketimi değiştirir. B2, istemci içerik
tablosuna optional `bakim?:MalMiktar` eşlemesini ekler; eski tabloda yokluk
bilinmiyor kalır. Bu satır mevcut mülk bakım gideri değildir.

**Tesiste yöntemleri gör** gerçek tesis anahtarı ile İşletmem/Yapılar'daki
mevcut seçiciyi idempotent açar ve odaklar; yöntem seçmez, komut göndermez.
Araştırma açık değilken de kilitli seçeneği incelemek mümkündür.
Tesis/bolge/tur/yöntem güncel veriden tekrar doğrulanır. Araştırma bitince
tesis otomatik dönüşmez; mevcut seçim/onay/gerçek komut yanıtı kullanılır.
Üretim→Teknoloji geçişindeki mevcut teknoloji ID'si korunur ve ilgili kart
odaklanır. Açılır detay/odak, canlı güncelleme ve bekleyen işlem korunur.
Sulama yeni yapı, mekanize ordu birlik açar; yöntem gibi gösterilmez.

## T2: görülen bedel ve yöntem koruması

- `arastir` komutuna optional `maliyetMili?:number` (güvenli tamsayı >=0)
  eklenir. Mevcut yayılım verisiyle UI'da hesaplanan görülen bedel düğmeden
  alınır. Çekirdek kendi güncel maliyetini hesaplar; alan verilmişse tam
  eşleşmeden hazineden para düşmez. Eski çağrı alanı içermiyorsa mevcut
  davranış sürer. İstemci fiyatı ödeme tutarı olarak kullanılmaz.
- Süre değişebilir; süre alanı guard yapılmaz. Mevcut UI süre tahmini
  araştırmanın başladığı andaki yayılım/erken oyun hızına tabidir.
  Yeni teklif dizisi veya her karede değişen süre verisi gönderilmez.
- `yontem_degistir` komutuna optional `oncekiYontem?:string` eklenir.
  Verilmişse mevcut gerçek yöntemin içerik kimliğiyle eşleşir; uyuşmazsa
  tesis değişmez. Eski alanı taşımayan çağrılar mevcut davranıştadır.
- Yeni istemci araştırma için görülen maliyeti; yöntem onayı için seçici
  açılışında görülen yöntemi gönderir. Canlı güncelleme bunları sessizce
  yeni değerle değiştirmez. Fiyat/yöntem eskiyse anlaşılır ret ve yeniden
  inceleme gerekir; otomatik tekrar yoktur. Pointer/klavye başlangıcındaki
  seçim ile click arasında ekran değişmesi de korunur.
- Her iki ret çekirdekte mutasyon öncesidir. Yeni kalıcı durum, gelir,
  tarifeler, araştırma slotu veya ekonomik kural eklenmez.

## Sahiplik / doğrulama

- L1 tek core yazarı: tip/komut şeması + iki saf guard.
- B2: protokol komut şeması, baglanti.ts/ws tip/istek/ret aktarımı.
- A3: teknoloji-panel.ts, mulk-panel.ts, yontem-panel.ts controller/odak/guard.
- B4: yeni teknoloji-etki-gorunum.ts/.css pure karşılaştırma; gerekirse
  teknoloji-panel.css. Aynı gerçek ekran senaryosunda araştırma ve yöntem.
- A6: şartname/T1 araştırma notu; K2b güvence araştırması kısa sonraki karar
  notuna kaydedilir, e-posta girişine güvence2 verilmez.
- B6: bir gerçek araştırma→bitiş→yöntem entegre senaryosu; stale bedel ve
  yöntem retleri/legacy çağrısı/safret aynı küçük dosyada ikinci vaka olabilir.
  Tüm READY sonrası tek kök/istemci tip ve final build, tam suite yok.
- Root: sözleşme, entegrasyon, devam kaydı ve GitHub teslimi.

K2b sonraki karar: K-16 edinim prosedürünü tanımlamaz; telefon/kimlik/ödeme
zorunluluğu çıkarılmaz. İleri seçim dilimi için güvenilir sunucu onay/iptal
kaydının hangi kanıtla üretileceği açıkça kararlaştırılmalıdır.
