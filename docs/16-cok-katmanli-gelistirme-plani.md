# Çok katmanlı geliştirme planı — 2 Ekim 2026

> **Güncel ortak sıra:** [Kalan işler — 2 Ekim](agent-results/codex-kalan-isler-arge-2026-10-02.md)
> ve [devam kaydı](agent-results/codex-devam-durumu.md) son uygulama/engel
> durumunu tutar. Aşağıdaki “uygulama öncesi”, “mevcut/eksik” ve dalga tabloları
> ilk planın tarihsel durumudur; bugün tamamlanma kanıtı olarak okunmaz.

> **Uygulama güncellemesi:** D2-0 birleştirme, D2-1 harita kaynak bağlantıları,
> D2-2 teknoloji erişimi, D2-3 balıkçılık ve D2-4 askerî backend temeli
> uygulandı. Gerçek sokak karosu yokluğu ve askerî ekranın henüz kapalı olması
> dahil teslim sınırları [D2 raporunda](agent-results/codex-d2-2026-10-02.md).
> Aşağıdaki başlangıç incelemesi planın yazıldığı anı kaydeder.

Durum: uygulama öncesi plan. Kullanıcının güncel yönlendirmesi: Claude'un son
push'u ve mevcut Ar-Ge üzerine ilerle; üretim, coğrafya, görsel tasarım,
teknoloji, halk, politika ve askerî sistemleri birlikte geliştir. Sürekli
test/rapor döngüsü yerine somut ürün teslimleri; tarayıcı/mobil kabulü dalga
sonunda. Bu plan yeni bir oyun tasarım belgesi değildir; mevcut
[GDD](arastirma/oyun-tasarim-belgesi-v1.md) ve sahip kararlarının uygulama sırasıdır.

## 1. Doğrulanan başlangıç ve önce birleştirilecek işler

- Depo: [Mert544/Strateji-Oyunu](https://github.com/Mert544/Strateji-Oyunu).
- Yerel çalışma dalının tabanı: `1bc1aacbd30bde7b9ae259775847813506ae7b3a`.
- GitHub HEAD fetch ile alındı:
  [`0e00abcf6ef7f06b818da27dcd6c4849c5292b9f`](https://github.com/Mert544/Strateji-Oyunu/commit/0e00abcf6ef7f06b818da27dcd6c4849c5292b9f).
  Commit zamanı **2 Ekim 2026 05:46:46 UTC / 08:46:46 Türkiye**.
  Bu, push zamanı değildir; Git geçmişi push'un kesin saatini vermiyor.
- Son uç yerel tabanın devamı: **29 commit, 72 dosya** farkı. P13 satış ve odak,
  gerçek ihracat net çarpanı, Defter sırası, doğru inşa süresi, tamamlanma
  bildirimi, raf rakamları ve üretim yapılandırması senaryoları içeriyor.
- GDD'nin bu uçtaki son commit'i `efcbfc7`, 1 Ekim 2026 23:38:23 UTC.
  Çekirdek, içerik, harita verileri, GDD ve mevcut Ar-Ge bu 29 commit'te
  değişmemiş. Sabah raporundaki “P13 henüz GitHub'da değil” satırı artık
  güncel değil; commit ve kod esas alınır.
- Buradaki Codex satış/D1 katkıları çalışma ağacında, henüz commit edilmemiş.
  Bu plan turunda **fetch ve karşılaştırma yapıldı; birleştirme yapılmadı**.

**D2-0 — tek geliştirme temeli (önce):** son Claude ucunu temel al; Codex D1'in
ağ stoğu, doğru raf bağlantısı, iki öneri ve doğrudan eylem katkılarını bunun
üzerine taşı. Claude'un `pazar-sat.ts` ve `bekleyen-odak.ts` yollarıyla yerel
`pazar-panel.ts` aynı işi iki kez yürütmemeli. Tek satış denetleyicisi/komut
yolu ve tek odak sahibi seçilecek; Claude'un net çarpan, süre ve bildirim
geliştirmeleri korunacak. Defter'in yeni ortak gösterim sırası ile D1'in
sunum tercihi aynı sözleşmede uzlaştırılacak. Önce değişikliklerin geri
alınabilir kopyası, sonra dosya bazlı birleştirme; toplu geri alma/stash yok.
Sahip: ana koordinatör + K-L. Bu entegrasyon yeni özellik diye sayılmaz.

## 2. Kodda olan ile planda olan

“Mevcut” bu tur kaynak incelemesiyle doğrulanan kodu belirtir; bütün akışların
bu tur yeniden çalıştırıldığı anlamına gelmez.

| Katman | Mevcut temel | Eksik olan / sıradaki iş |
|---|---|---|
| Harita, şehir, ilçe | OSM idari hiyerarşisi 81 il / 973 ilçe; gerçek oynanabilir arsa manifesti Gebze, Gemlik, Körfez. Küre→il→ilçe→arsa ve 3D yürüyüş altyapısı var. | Bütün Türkiye oynanabilir değil. Yürüyüş karo seçimi/kopyalaması Gebze varsayımlı; üç ilçenin veri kaynakları ve bölgesel kimliği bağlanmalı. |
| Grafik ve yapı görünümü | Gerçek sokak geometrisi, çatı/cephe, yönteme özel siluetler, oyuncu yapıları ve aşınma var. | Mevcut çizim sistemini genişlet: kırsal/konut/sanayi ayrımı, zincire özel yapı siluetleri, doğru ilçe çevresi. |
| Üretim | Tahıl→un (+kepek)→ekmek; silis→cam→pencere; cevher+kömür→çelik→parça mevcut. Son hat uygun kaynak veya dış tedarik ister. | Balık, yün, iplik, kumaş, hazır giyim araştırmalarda var; üretilebilir içerik zinciri henüz yok. |
| Kaynak ve lojistik | Bölge rezervleri, il işletmeleri, ortak taşıma kapasitesi/süresi, kara/deniz/hava ağı ve NPC ticareti var. | Rezervler oyun verisi; gerçek ilçe jeolojisi değil. Her işletme merkez rezervini kopyalıyor. Zonguldak pilotu için kaynak kapsamı ve gerçek arsa verisi gerekiyor. |
| Teknoloji | 7 teknoloji, ön koşullar, tek aktif araştırma, yayılım ve bitiş olayı var. Oyuncunun teknoloji/araştırma verisi protokolde. | Mülk arayüzünde araştırma erişimi eksik. 17/26 düğüm ve iki slot araştırma taslağı; uygulanmış sayılmaz. |
| Halk ve canlı dünya | Nüfus, temel tüketim/talep, gıda/vergi etkileri ve gerçek zaman altyapısı var. | Mülk işletmesi nüfusu 0; işgücü pratikte sınırsız. Eğitim, memnuniyet, insan göçü ve ilçe işgücü piyasası tamamlanmış sistemler değil. |
| Politika | Kamu arsası/kasası/vergi temeli ve eski bölge kipinde antlaşma/yaptırım var. | Oyuncu seçimleri, makam, meclis, yasa/bütçe motoru yok. Eski diplomasi formunu açmak il yönetimi sağlamaz. |
| Askerî | Eski bölge kipinde birlik üretimi, duruş, ikmal ve savaş kodu var. | Mülk düğümü uyumu, Ordugâh, eşkıya PvE ve il kontrol savaşı tamamlanmış değil. |

Başlıca kod kaynakları: `packages/veri/icerik/icerik.json`,
`packages/veri/haritalar/odbl/{hiyerarsi.json,izgara/manifest.json}`,
`packages/veri-hatti/src/rezerv.ts`,
`packages/cekirdek/src/{mulk/isletme.ts,teknoloji.ts,politika.ts,askeri/}`,
`packages/protokol/src/kare.ts`,
`packages/istemci/src/{harita,yuru,arayuz/yerles-ekrani.ts}`.

Mevcut araştırma temelleri: [üretim ağı](arastirma/uretim-agi-genisletme.md),
[çok katmanlı dünya](arastirma/cesitlilik-yonetim-askeri-teknoloji.md),
[askerî katman](arastirma/askeri-katman-v1.md),
[askerî ilk dilim](arastirma/askeri-0a-sartname.md),
[canlı dünya](arastirma/canli-dunya-simulasyonu.md),
[bilim ve teknoloji](arastirma/bilim-teknoloji-askeri.md).
Bu araştırmalar baştan yazılmayacak; yalnız kodlama için açık kalan kararlar çözülecek.

## 3. Geliştirme dalgaları

S/M/L göreli iş büyüklüğüdür, gün taahhüdü değildir. Bir dalga birden fazla
küçük teslim içerebilir; tek dev paket hâlinde birleştirilmez.

### Dalga 1 — mevcut dünyayı aç, ilk yeni mesleği ekle

| İş | Somut teslim | Sahip / bağımlılık | Boyut |
|---|---|---|---|
| D2-1 Harita ve bölgesel kimlik | Üç ilçenin doğru 2D/yürüyüş veri eşlemesi; bulunmayan karo için açık geri dönüş. Yerleş kartında gerçek nüfus, kurulabilir üretim ve kaynak/liman bilgisi. Coğrafi ün, oyun bonusu gibi sunulmaz. | T-L + O-L; D2-0, veri dosyalarının varlığı/lisansı | M |
| D2-2 Teknolojiye erişim | Mevcut teknoloji ve açtığı seçenekler, gerçek aktif araştırma süresi. Sonraki küçük parçada araştırmayı başlat; ön koşul/tek slot/ret davranışı mevcut motorla aynı. Kesin fiyat/süre için gereken yayılım verisi sunucudan gelir. | K-L/K1 + A-L; D2-0 | S→M |
| D2-3 Balıkçılık | Uygun kıyıda kurulabilir üretim, balık malı, girdi/gider, gerçek satış/talep çıkışı ve haritada ayırt edilen yapı. Sadece isim veya ikon eklenmesi teslim sayılmaz. | A-L içerik kararı, K-L altında tek çekirdek yazarı, T-L siluet; D2-0 | M |
| D2-4 Askerî temel uyumu | Birlik üretimi, parti bitişi, duruş ve ikmalin oyuncunun mülk düğümünde aynı kimlikle işlemesi için ilk backend dilimi. Ordugâhın arsa/gider sözleşmesi netleşir; çalışmayan saldırı düğmesi açılmaz. | K-L; mevcut askerî şartname, D2-3 ile çekirdek yazımı sırayla | M/L |

Harita/teknoloji geliştirmeleri çekirdek işi sürerken ilerler. Askerî çalışma
dükkân veya kamu siparişinin bitmesine bağlı değildir; yalnız ortak dosya
sahipliği nedeniyle çekirdek düzenlemeleri sıralanır.

### Dalga 2 — uzmanlaşma, halk ve savunmayı birbirine bağla

| İş | Somut teslim | Ön koşul |
|---|---|---|
| D3-1 Koyun ve tekstil | Koyun yetiştiriciliği→yün→iplik→kumaş→hazır giyim; mevcut Ar-Ge kimlikleri ve yöntem yaklaşımı kullanılır. Her aşamada üretip satma seçeneği; bütün zinciri aynı oyuncunun kurması zorunlu değil. | İçerik kimlik/göç disiplini, mera uygunluğu, her çıktının alıcısı/talebi; ileri oyuncular arası tedarik sözleşmesi ayrı parça |
| D3-2 Yaşayan ilçe ve kamu | Gerçek nüfus, tüketim ihtiyacı ve vergi/kasa hareketini ilçe panelinde göster. Ardından sınırlı ihtiyaç karşılanma göstergesi ekle; eğitim/göç/işgücü modeli ayrı değişiklikler olur. | Hangi veri ilçe, merkez veya oyuncuya ait açık olmalı; eksik bilgi varsayımla doldurulmaz |
| D3-3 Ordugâh ve PvE | Ekonomiden beslenen kuvvet, ikmal maliyeti, savunma tercihi; ardından önceden duyurulan, kaybı sınırlı eşkıya olayı ve sonuç kaydı. | D2-4, Ordugâh kurulumu, kayıp/ödül ve ikmal kuralları |
| D3-4 Görsel dünya | Balıkçılık, koyun yetiştiriciliği ve tekstil tesisleri ayrı okunur; kırsal doku, sanayi ve yerleşim siluetleri mevcut geometri sistemiyle çeşitlenir. | İlgili üretim kimlikleriyle aynı teslim; tek çizim sistemi |

### Dalga 3 — bölgesel ticaret, yönetim ve kontrol savaşı

1. **Zonguldak kaynak ilçesi pilotu:** tek uygun ilçe seç; arsa ızgarası,
   manifest, harita/karo ve oyun rezervi tanımıyla aç. Kömürün başka şehirdeki
   çeliğe, parçaya ve üretime girmesini mevcut ağla bağla. Cevher yerelde yoksa
   ithalat gerçek bir karar olsun. Bu pilotun bitişi “81 il açıldı” değildir.
2. **Seçim ve yönetim v0:** mahalle/ilçe/il kimliği, seçmen/temsil, makam süresi
   ve yetki sözleşmesinden başlayıp bir yerel karar döngüsünü çalıştır. Muhtar,
   İlçe Başkanı ve Vali ayrımı güncel kararla korunur. İlk oyuncu kararı sınırlı
   bir kamu bütçesi/projesi olur; tüm yasalar aynı anda eklenmez.
3. **Oyuncular arası bölge kontrolü:** mülk ordusu ve ikmalden sonra ilan,
   hazırlık, savunma penceresi, sonuç ve kontrol hakkı. Parsel zorla el
   değiştirmez. Savaş ilanı/makam yetkisi ve yeni oyuncu korumaları bu döngünün
   parçasıdır; eski fetih kodu doğrudan mülk oyununa açılmaz.

Kamu siparişleri kaybolmadı: kamu harcaması ve üretici talebini bağlayan bir
alt iş olarak D3-2/yönetim hattında kalır. Diğer katmanların önüne zorunlu
bekleme koşulu koymaz.

## 4. Kritik tasarım kararları

- **Coğrafya:** sahil/mera/kaynak uygunluğu sunucuda doğrulanır. Gerçek yer
  adları kullanılabilir; elle dengelenmiş rezerv, gerçek jeoloji diye anlatılmaz.
  Ortak ilçe rezervine geçmek mevcut oyuncu rezervlerini etkiler; Zonguldak
  genişlemesinden önce bunun veri göçü ve tüketim sahipliği kararı yazılır.
- **Yeni mal:** kimlik, reçete, yapı/yöntem, tüketici veya satış kanalı ve görsel
  kimlik birlikte tanımlanır. Kaydedilmiş dünya ve eski mal indeksleri korunur.
- **Teknoloji:** yeni iş koluna yapay seviye/meslek kilidi eklenmez. Mevcut
  yöntem avantajları ile mülk kipinin “sermaye/arsa/girdiyle seçim” ilkesi
  uzlaştırılır; eski teknoloji ağacı sırf var diye bütün işletmelere kilit olmaz.
- **Halk:** NPC nüfus gerçek veriyle başlar; işletme stoğu ve ilçe nüfusu aynı
  nesneye dönüştürülmez. Göç/eğitim/işgücü için ayrı davranış tanımı gerekir.
- **Askerî:** parsel kaybı sıfır, kalkan ve baskın aralığı kuralları korunur.
  Belgelerdeki Y-36 yağma aktarımı/ikmal katsayısı mevcut kodla aynı değil;
  fark açık bir uygulama ve göç işi olarak ele alınır.
- **Grafik:** yeni katmanın oyunda görünür sonucu aynı teslimde gelir.
  Eksik varlık için çalışan seçenek gösterilmez; yeni motor veya tam görsel
  yeniden yazım gerektirmeyen mevcut altyapı geliştirilir.

## 5. Yedi ajanla çalışma düzeni ve doğrulama

Ana koordinatör entegrasyon ve önceliği yönetir. Dört lider ve iki uzman
eşzamanlı üst sınırdır; uzman kontenjanı iş gerektirdikçe alan değiştirir.

| Rol | Bu plandaki sorumluluk |
|---|---|
| Ana koordinatör | Güncel GitHub/Codex temelini birleştirmek, işler arası bağımlılığı ve kapsamı yönetmek |
| Ar-Ge lideri | Mevcut araştırmadan reçete, coğrafya, halk/yönetim ve savaş kararlarını kısa uygulama tanımına çevirmek |
| Tasarım lideri | Harita/şehir okunurluğu, bina siluetleri, teknoloji ve ilçe ekranlarının ürün akışı |
| Kodlama lideri | Sunucu/çekirdek/protokol uyumu; çekirdekte tek yazar ve sözleşme sahipliği |
| Operasyon lideri | Veri/karo paketleme, kayıt uyumu, tek gerekli doğrulama ve teslim |
| Uzman 1 | İlk dalgada istemci/teknoloji/harita entegrasyonu |
| Uzman 2 | İlk dalgada içerik/üretim; sonra askerî backend, dosya sahipliği devriyle |

Lider toplantısı yalnız bağımlılık/karar değişiminde kısa yapılır. Her küçük
iş için altı ayrı rapor ve aynı kontrolün lider/uzman/koordinatörde tekrarı yok.
Teslim raporu tek: ne oyuncuya açıldı, ne kaldı, hangi kontrol yapıldı.

Bu plan turunda test, derleme veya tarayıcı çalıştırılmadı. Geliştirmede:

- Basit metin/görsel işlerde yeni test yazmak varsayılan değildir.
- Arayüz dilimi birleştirilince tek uygun tip/derleme kontrolü yeterli olabilir.
- Para/mal korunumu, yeni komut, kayıt göçü veya savaş kaybı değişirse yalnız
  ilgili küçük senaryo doğrulanır; bütün paket her adımda tekrarlanmaz.
- Tarayıcı ve mobil kabul, birleşik geliştirme dalgasının sonunda yapılır.
  Tarihsel testler güncel görsel doğrulama diye sunulmaz.

## 6. Plan toplantısının sonucu

K-L ve A-L teknoloji motorunu tekrar yazmadan oyuncuya açma konusunda uzlaştı.
T-L ve O-L üç ilçenin doğru veri/karo eşlemesini bölgesel kimliğin ön koşulu
olarak belirledi. Üretim incelemesi balık/yün adlarının araştırmada bulunmasının
çalışan reçete olmadığını doğruladı. Askerî entegrasyon yalnız bir arayüz
sekmesiyle çözülemeyeceği için ayrı backend teslimine ayrıldı.

İlk uygulama sırası: **D2-0 temel birleştirme → paralel harita, teknoloji ve
balıkçılık; ardından çekirdek yazarı askerî uyuma geçer.** Sonraki dalgada
tekstil, yaşayan ilçe ve PvE birlikte ilerler. Yeni dış araştırma veya bütün
sistemleri baştan tasarlama bu başlangıcın ön koşulu değildir.

## 7. D3 uygulama güncellemesi — 2 Ekim

D2 teslimi `agent-results/codex-d2-2026-10-02.md` içinde kayıtlıdır.
D3'te tekstil zinciri, ilgili görseller, salt okunur yaşayan ilçe ve gerçek
birlik yönetimi uygulanmıştır. D3-3 içindeki PvE hâlâ sonraki iştir; birlik
üretimi ve savunma duruşu hazır olması savaşın hazır olduğu anlamına gelmez.
Güncel görev kuyruğu `agent-results/codex-devam-durumu.md` içindedir.
Üstteki mevcut/eksik tablosu plan çıkarıldığı andaki temel incelemesidir;
sonraki teslimlerin tamamlanma kanıtı dalga raporlarından okunur.

## 8. D4 ve L1 uygulama güncellemesi — 2 Ekim

D4 üretim ağı, tedarik emirleri, ilçe satış katkısı ve ikmal stok görünümüyle
tamamlandı. D1–D4 `a6a3369` ile `codex/cok-katmanli-gelistirme` dalına
pushlandı. L1 gider dökümü `189722c` ile aynı dala gönderildi: Hazine gerçek
şebeke bedellerini, Tedarik gerçekleşen ithalat hızının fiyat kırılımını gösterir.

L1.2 aynı ekiple uygulandı: kendi iç sevk planı, kaynak/hedef, yol süresi
ve hedefte gerçekten ulaşmış ağ akışı. Kenar kapasitesi, fiziksel taşıma
gideri ve sanayi yakıtının stoktan ikamesi ayrı dilimlerdir. Sonraki adımların
kod dayanağı `agent-results/codex-d4-lojistik-arge.md` ve
`agent-results/codex-l1-rota-arge.md` içindedir.

Kullanıcının son kadro talimatı yeni ajan açmadan mevcut ajanları kullanmaktır.
Ortam sınırı koordinatör dahil yedidir; altı uzman aynı anda bağımsız dosya
alanlarında ilerler, tamamlanan ajan sıradaki uygun görevde yeniden kullanılır.
Üstteki tarihsel rol tablosu zorunlu aktif kadro değildir.

## 9. S1 — Ordu savunma gücü görünümü

Mevcut ekip, Ordu ekranına hazır kuvvet → ikmal/bölgesel savunma/duruş
etkileri → mevcut savunma gücü kartını ekledi. Çekirdekte aynı salt okuma
yardımcısı savaş hesabında da kullanılır; tamsayı yuvarlaması ve rastgele
sapma çekim sırası korunur. Kart yalnız sahibinin işletmesinde görünür;
eski sunucuda bilinmeyen güç sıfır gibi gösterilmez.

Üretim alanına yazarken savunma verisi ve duruş düğmeleri yerinde yenilenir.
Bölgesel etki bağlı oyun bölgesinin etiketleridir, parsel ölçümü değildir.
PvE baskını açılmadı; bu teslim mevcut ordu kararlarını görünür kılar.
Doğrulama ve teslim sonucu `agent-results/codex-devam-durumu.md` kaydındadır.
