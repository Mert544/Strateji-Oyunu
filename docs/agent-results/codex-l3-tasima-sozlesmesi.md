# L3 — İç taşıma hizmet bedeli

2 Ekim 2026. Kullanıcının yedi ajanla devam talimatı kapsamında mevcut altı
uzman ve ana koordinatör çalışır. Yeni ajan açılmaz. L2 rafineri/yakıt
teslimi `61a6634` üzerine uygulanır.

## Model ve sınırlar

Otomatik taşıyıcı hizmeti, yalnız aynı oyuncunun mülk işletmeleri arasındaki
gerçek iç sevke uygulanır. NPC ithalatının liman primi, sanayi şebekesi ve
tesis işletme gideri ayrı kalır. Depodan ayrıca taşıma yakıtı düşülmez.
Ücret, sevkin başladığı andan itibaren saatlik oranla birikir; varışta veya
her yeniden çözümde ikinci ücret alınmaz. Eski yoldaki teslim devam etse de
durdurulmuş yeni sevk için yeni hizmet gideri yoktur.

Sıfır sevk, sıfır yol süresi ve ücretsiz il içi havuz için bedel sıfırdır.
Rota seçimi mevcut süre hedefini korur; ekonomik/hızlı rota seçeneği eklenmez.
Fiyatın değişmesi gideri etkiler, bu dilimde rota optimizasyonu iddiası yoktur.

## Veri ve tam sayı hesabı

İsteğe bağlı `lojistik.tasima`:

```json
{
  "etkin": true,
  "isletmeBirimMili": 10,
  "yakitBirimPpm": 1000,
  "turCarpaniPpm": { "kara": 1000000, "deniz": 500000, "hava": 3000000 }
}
```

`isletmeBirimMili`, bir mal biriminin bir yol saatindeki yakıttan bağımsız
hizmet bedelidir (mili-₺). `yakitBirimPpm`, aynı iş için yakıt birimi/PPM
katsayısıdır. Yakıt fiyatı çözüm anındaki gerçek `d.pazar.fiyat[yakit]`
değeridir; stoktan satın alma emri veya ikinci yakıt tüketimi değildir.
Tür çarpanı iki bileşene de uygulanır. Oyuncu başına sabit abonelik yoktur.

Akış bedeli tek son aşağı yuvarlamayla hesaplanır:

```
floor(
  oranMiliSaat * Σ(kenar.sureMs * turCarpaniPpm)
  * (isletmeBirimMili * PPM + yakitFiyatiMili * yakitBirimPpm)
  / (MILI * SAAT * PPM * PPM)
)
```

Ara işlemler taşmasız yapılır. Örnek: 100 mal/saat, 8 saat kara yolu,
100 ₺ yakıt fiyatı → 88 ₺/saat; 200 ₺ yakıt fiyatı → 168 ₺/saat.
Bunlar başlangıç oyun ayarlarıdır; oynanış dengesi ölçülmüş sayılmaz.
Blok yoksa veya kapalıysa eski davranış korunur; bölge kipi etkilenmez.
Etkin kural bilinen, depolanabilir yakıt tanımı gerektirir.

## Nakit ve kalıcılık

Pozitif bakiye ücretli sevke izin verir. Bakiye sıfırken ücretli fiziksel
kenarlar akış çözücüsünün girişinde kapanır; ücretsiz kenarlar/il içi havuz
açık kalır. Böylece akış, stok, gecikme ve kapasite sonuçları aynı çözümden
gelir. Yeni bütçe paylaştırıcısı veya borçla taşıma hizmeti eklenmez.
Bakiye gelirle yeniden oluşunca sonraki çözüm ücretli sevki açabilir.

L3'e özel sürüm korumalı hazine eşiği, negatif net akış altında bakiyenin
sıfırlandığı anda yeniden çözer. Eski olay geçersizse etkisizdir; kapalı
kuralda yeni olay oluşmaz. Yoldaki mallar teslim edilmeye devam eder.

`Akis.tasimaBedeliMiliSaat?` çözümde dondurulur; kaynak düğümün aynı adlı
alanı çıkan akışların toplamıdır. Etkin kuralda sıfır bilinir, kapalı/eski
kuralda alan yoktur. Hazine giderine tam bir kez eklenir; ayrı isteğe bağlı
`ParaAkisi.tasima` ve tembel `lavabo.tasima` sayacıyla tutulur. Kamu kasa
payı yoktur. Diğer giderlere tekrar katılmaz.

Aynı kuralla yükleme olay kuyruğunu değiştirmez. İzinli kural geçişinde eski
oranlar kayıt anına kadar uzlaştırılır, yeni kural aynı anda çözülür;
kapatma eski ücret oranlarını temizler. Tarihsel sayaç korunur. Sıkı kayıt
doğrulaması, para korunumu ve parçalı zaman/replay eşdeğerliği gereklidir.

## Oyuncu görünümü ve görev sahipleri

- L1: tek çekirdek yazarı; akış, ödeme, eşik, kalıcılık.
- A6: veri tipleri/şema/doğrulama ve varsayılan parametreler.
- B2: protokol ve köprü; sahibine dondurulmuş akış/kaynak bedelleri.
- A3: Tedarik ve Hazine; mevcut net akıştan gideri ikinci kez düşmeden
  açıklama. `IsletmeDurumu.tasimaGideriMiliSaat?` yalnız tüm kendi düğümleri
  aynı çözümün eksiksiz verisini sağlıyorsa bilinir.
- B4: rota satırında kaynak işletmenin saatlik hizmet bedeli; kısa metin ve
  mevcut mobil yerleşim. İstemcide ücret hesabı veya hayalî varış süresi yok.
- B6: test dosyaları ve tek hedefli doğrulama turu.
- Ana koordinatör: sözleşme, entegrasyon, dokümantasyon ve commit/push.

Üç entegre senaryo; gerçek sevk/fiyat/yol/sıfır ve nakit tükenmesi,
parçalı zaman/kayıt/replay, eski kural/bölge/göç/özel veri sınırları.
Bir kök ve istemci tip kontrolü, bir derleme; yalnız başarısız kontrol
gerekli düzeltmeden sonra tekrarlanır. Geniş test matrisi açılmaz.
