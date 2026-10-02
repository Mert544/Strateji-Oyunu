# K1 — İlçe kamu gıda siparişi

2 Ekim 2026. L3 `8af179c` üzerine mevcut altı uzman ve koordinatörün
geliştirme dilimi. Sistem bütçeli gıda siparişi açar; oyuncu tedarikçi olarak
stoğunu teslim eder. Belediye/makam yetkisi, seçim veya oyuncunun kamu
bütçesini dilediği gibi harcaması bu dilimde yoktur.

## Açılış ve fiyat

İsteğe bağlı `mulk.kamuSiparis` varsayılanı:

```json
{
  "etkin": true,
  "paketMili": 1000,
  "azamiPaket": 3,
  "sureSaat": 24,
  "fiyatPpm": 900000,
  "tekrarSaat": 24,
  "denemeSaat": 6
}
```

Bilinen depolanabilir `gida` ve mevcut kasa sistemi gerekir. Mevcut kasa
tek alım, haftalık bütçe ve oyuncu payı sınırları korunur. Yeni hibe veya
kasa geliri yoktur. Sistem mevcut saatlik olayda vadesi dolanı kapatır;
altıya bölünen oyun saatlerinde uygun ilçeler için açılış dener. Hiçbir
pakete bütçe yetmiyorsa ilan açılmaz. Kapanıştan sonra 24 saat beklenir.
En fazla üç paket, paket başına bir birim; bütçe daha azına yetebilir.

İlanın üst birim fiyatı, açılıştaki referans gıda fiyatının %90'ı ile
mevcut kamu fiyat tavanının küçüğüdür. Birim fiyat ve paket bedelleri
tamsayı aşağı yuvarlanır. İlan koşulları açılışta dondurulur.

Teslimde güncel birim fiyat; ilan üst fiyatı, güncel referans fiyatın
dondurulmuş fiyat katsayılı değeri ve güncel kamu fiyat tavanının
en küçüğüdür. Güncel paket bedeli çekirdekten gelir. İstemci fiyat motoru
kurmaz; kamuya ithal-al/sat marjı açmak için tavan aşılmaz.

## Ödenek ve atomik teslim

İlan açılırken bütün paketlerin üst bedeli bloke edilir. Her paketin
kabulünde gerçek bedel kasadan oyuncuya aktarılır, üst bedelle aradaki
fark serbest bırakılır. Siparişe ait kalan rezerv ayrı izlenir; başka
siparişin veya ödenek türünün rezervi harcanmaz.

```
kamu_teslim { siparis, bolge, bedelMili, teslimSirasi }
```

Oyuncunun kimliği mevcut doğrulanmış komut yolundan gelir. `bedelMili`
ödenecek tutarı belirlemez; görülen güncel paket bedeliyle eşleşme
korumasıdır. `teslimSirasi` mevcut teslim edilmiş paket sayısıyla eşleşir.
Eski fiyat/sıra, tekrarlı teslim, kapalı/vadesi dolmuş sipariş reddedilir.
Sunucunun mevcut komut anahtarı tekilleştirmesi ayrıca korunur.

Oyuncu sipariş ilçesinde en az bir arsaya sahip olmalı ve aynı ilin kendi
işletme düğümünden teslim etmelidir. Stok il ortak deposudur; ilçe başına
ayrı depo varmış gibi gösterilmez. Kendi stokunda tam paket bulunmalı ve
hazine kapasitesi ödemenin tamamını alabilmelidir. Kısmi paket veya
kapasitede kırpılmış ödeme yoktur.

Bütün ret kontrolleri yazmadan yapılır. Muhasebeyi uzlaştıran yardımcılar
salt okunur görünümde veya ret öncesi kontrolde kullanılmaz. Kabul
aşamasında stok paketi düşer, kasa çıkışı oyuncunun artışına eşittir,
rezerv ve sipariş miktarları birlikte güncellenir. Gıda kamu dağıtımına
teslim edilmiş sayılır; mutluluk/nüfus/refah bonusu üretilmez.

## Durum ve kalıcılık

İlçe başına tek güncel/son sipariş ve sınırlı kümülatif teslim/ödeme kaydı
tutulur; sınırsız sipariş geçmişi eklenmez. Vade `zaman >= bitis` anında
teslimi kapatır; saatlik olay kalan rezervi serbest bırakır. İzinli kural
kapatma göçü de açık rezervi bırakıp siparişi kapatır, geçmiş teslim/ödeme
kaydını korur. Aynı kural yüklemesi kuyruk veya hesap eklemez.

## Görünüm ve sahiplik

Genel ilçe görünümü siparişin hedef/kalan/teslim miktarını, vadesini,
güncel bedelini ve kamu bütçesini gösterir. Yalnız oyuncunun kendi stok ve
teslim uygunluğu özel görünümde bulunur. Bilinmeyen veri teslim yetkisi
sayılmaz. Bekleyen işlemde tekrar tıklama kapanır; fiyat veya sıra
değişirse güncel teklif ve anlaşılır ret açıklaması gösterilir.

- L1: tek çekirdek kaynak yazarı; durum, olay, komut, muhasebe, kalıcılık.
- A6: veri tipi, şema, doğrulama ve parametreler.
- B2: protokol/komut şeması, köprü, Türkçe komut özeti; özel stok sınırı.
- A3: mevcut İlçe paneli ve ana panel etkileşimi.
- B4: yeni saf kamu siparişi kartı ve stilleri.
- B6: üç hedefli entegre vaka ve tek tip/derleme turu.
- Koordinatör: karar, entegrasyon, belgeler ve GitHub teslimi.

Kabul: gerçek gelirle bütçeli açılış ve tam teslim/para korunumu; ret
matrisinde dünya değişmezliği; kayıt/yükleme/replay ve kapatmada rezerv
iadesi. Yeni hataya bağlı ilgili tekrar dışında geniş test turu yoktur.
