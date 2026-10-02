# Geliştirmeye devam kaydı

2 Ekim 2026. Depo `/workspace/Strateji-Oyunu`.

## Son tamamlanan iş

D4: 12 ayrı GPT-6.1 Sol alt ajan iki dalgayla görevlerini bitirdi; ortam sınırı
ana koordinatör dahil 7 eşzamanlı ajan. Ardından L1 gider dökümü başladı;
mevcut altı ajan yeniden görevlendirildi. Kullanıcının son düzeltmesiyle yeni
ajan açılmayacak, mevcut havuz kullanılacak.
[Görevler](codex-d4-gorevler.md), [teslim/kanıt](codex-d4-2026-10-02.md),
[lojistik Ar-Ge](codex-d4-lojistik-arge.md).

- D2: balıkçılık, teknoloji araştırması, doğru ilçe harita geri dönüşü,
  mülk ordusunun çekirdek uyumu.
- D3: koyun→yün→iplik→kumaş→hazır giyim, gerçek İlçe ve Ordu panelleri,
  Ordugâh ve üretim silüetleri. PvE açılmadı.
- D4: gerçek Üretim ağı ve Tedarik sekmeleri, il/mal ithalatı/güncelleme/iptal,
  gerçek emir kapasitesi ve son fiyatla net bedel tahmini; ordudan tedarike,
  ilçeden üretime geçiş. Gerçek ilçe dükkân satış katkısı ve ikmal stok kapsamı.
- Kilimli yerel TopoJSON sınır girişi ve izole veri-hattı üretim yolu ile
  salt okunur hazırlık CLI'si uygulandı. Gerçek arsa/karo üretimi yapılmadı.
- Kullanıcının son yönüyle petrol→yakıt görünümü, gerçek parametreye bağlı
  stok ile otomatik şebeke tüketimi açıklamaları da eklendi.

D4: 18 hedef test, kök/istemci tip kontrolü ve build geçti. Son kullanıcı
metin/görünüm değişikliklerinden sonra yalnız client tsc/build güncellendi;
18 test/kök kontrol gereksiz tekrar edilmedi. Son dunya gzip 379,9KB/400KB.
Tarayıcı/mobil, tam paket, lint ve Postgres bu dalgada çalıştırılmadı.

D1–D4 GitHub'a gönderildi: `codex/cok-katmanli-gelistirme` dalı,
`a6a3369` (`feat: üretim, tedarik, ilçe ve ordu katmanlarını geliştir`).
Claude ana dalına merge veya dağıtım yapılmadı. Sonraki geliştirmeler aynı
dalda devam eder; kullanıcı commit/push için yetki verdi.

## L1 gider dökümü tamamlandı

- Protokol: `l1_protokol`, özel karede gerçek şebeke gideri ve mevcut
  gerçekleşen ithalat oranının fiyat kırılımı; çekirdek davranışı değişmez.
- Köprü: `d4_b2_baglanti`, düğümde yuvarlanmış bedelleri toplar;
  eksik alan bilinmeyen, boş liste bilinen sıfırdır.
- Tedarik: `d4_a3_tedarik`, bölge/mal bazında gider görünümü.
- Hazine: `d4_b4_gorsel`, sunucu bedellerini gösterir; kök entegrasyonu yapar.
- Operasyon: `d4_b6_operasyon`, tek kısa hedefli doğrulama dalgası.
- Ar-Ge: `d4_a6_arge`, gerçek rota/akış/süre/kapasite görünürlüğünün sonraki
  dilimini B2 ve protokol sahibiyle hazırlar; tahmini teslimat icat edilmez.

Üç hedefli protokol vakası doğrulandı: gerçek para akışıyla eşleşme, iki
düğümde ayrı yuvarlama, sahibine özel veri/eski şema/bilinmeyen-sıfır ayrımı.
İlk koşuda ikinci işletmenin test kurulum malzemesi eksikti; yalnız o fikstür
düzeltilip başarısız vaka tekrarlandı. Kök ve istemci tip kontrolü, istemci
derlemesi geçti; dünya gzip 379,9KB/400KB, harita 486,1KB. Tam test paketi,
tarayıcı/mobil, lint ve Postgres çalıştırılmadı.

Sonraki L1.2: aynı ajanlarla iç sevk planı, kaynak/hedef, gerçek yol süresi
ve hedefte ulaşmış toplam gelen oran görünümü. ETA, sevkiyat ilerleme yüzdesi
ve rota başına yoldaki miktar mevcut veriden türetilmeyecek.

## Güncel ürün yönü ve sıradaki somut dilimler

Kullanıcı lojistik, petrol/yakıt ve tedarik aşamalarının atlanmamasını istiyor.
Birebir gerçek dünya beklemiyor; konum, rota, tedarik ve stok kararlarını
anlamlı kılan detay, ihtiyaç oldukça açılan sunum ve genel Ar-Ge önemli.
Dükkâna tek başına dönmek yok; harita, üretim, askerî ve kamu hatları korunur.

1. **L1 kalan:** gider dökümleri tamamlandı. Sahibin gerçek iç sevk planı,
   kaynak/hedef, yol süresi ve ulaşmış toplam gelen oranını özel kareye taşı.
   Kenar kapasitesi ayrı sonraki dilim; net stok formülünden akış çıkarılmaz.
2. **L2:** rafineriyi mülk ayak izi/inşa tablosuyla aç; sanayi yakıtında
   stok öncelikli, kalan açık otomatik şebeke yaklaşımını tek çözücüde uygula.
   Ordu önceliği, mal/para korunumu ve kural dönemi/replay birlikte tasarlansın.
   Rafineri tek başına açılırsa bugünkü şebeke sanayi stokunu kullanmaz.
3. **L3:** iç taşıma gideri için önce tek model seç. İlk aday yakıt fiyatına
   bağlı otomatik taşıyıcı hizmet bedeli; aynı yakıt ayrıca stoktan düşülmez.
   MCF'deki maliyet şu an süre olduğu için parasal gider gibi gösterilmez.
   Mevcut dış ticaret liman primi ikinci kez nakliye diye alınmaz.
4. Harita hattı: gerçek Kilimli karo/araç girdilerini sağlayıp izole üretimi
   tamamla, canonical manifesti doğrulanmış veri olmadan genişletme.
5. Askerî hat: [PvE kararı](codex-d4-pve-karari.md) kalan sayısal sözleşmesini
   kapat; sonra bayraklı ön duyuru/sonuç/serileştirme/özel-genel UI tek dilimi.
   D3 birlik/duruş açık kalır; PvE bayrağı yalnız baskını yönetir.
6. Kamu hat: mevcut kasa yardımcıları oyuncuya makam/proje harcama yetkisi
   vermiyor. İlk proje kataloğu+yetki+ödenek bağlantısı ayrı uygulanacak.
7. Tarayıcı/mobil kabulü birleşik geliştirme sonunda; her adımda yeniden koşma.

## Gerçek sınırlar ve yeniden başlama

- Claude temeli HEAD `0e00abcf6ef7f06b818da27dcd6c4849c5292b9f`. D1–D4
  katkıları `a6a3369` ile GitHub geliştirme dalında; L1 aynı dalda ilerliyor.
  Dağıtım yapılmadı.
  Stash/reset/temizleme yok; ilk birleşim yedeği `/tmp/strateji-d2-integration`.
- İdari veri 81 il/973 ilçe; oynanabilir arsa manifesti hâlâ 3 ilçe. Sokak/bina
  PMTiles dosyaları yok, arsa görünümüne geri dönüş sürüyor.
- Kilimli (`tr_67_kilimli`, OSM r3680552) gerçek sınırı
  `packages/veri/haritalar/odbl/ilceler/tr_67.topo.json` içinde; nüfus kaydı yok.
  B5 hazırlık kabulü gerçek Polygon/hash/bbox doğruladı, canonical 165 dosya
  değişmedi. Eksikler z15 karo, pmtiles, tippecanoe. CLI explicit yerel sınır
  + ayrı hedef/manifest ister; hazırlık dosya yaratmaz/ağa çıkmaz.
- `isletmeAl` başlangıç rezervini her oyuncu/il düğümüne kopyalar. Batı
  Karadeniz kömürü 360.000 oyun birimi/oyuncudur; ortak jeolojik damar değildir.
  Ortak ilçe rezervine geçiş ayrı davranış/göç işidir.
- NPC ithalatında ayrı fiziksel rota/yakıt bedeli yok. İç ağda kapasite/süre var,
  akış başına nakit/yakıt tüketimi yok. Yakıt şebeke fiyatı canlı pazar değil
  derlenmiş sabit formüldür. Ayrıntılar lojistik Ar-Ge raporunda kodla kanıtlı.
- Oturum dışı kod geliştirme otomasyonu kurulmadı. Kullanıcı aktif oturumda
  her küçük iş için yeniden “devam” demek istemiyor; mevcut yetki içinde sırayı
  ilerlet. Önce gerçek dosya/ajan durumunu oku, aynı dosyaya iki yazar atama.
