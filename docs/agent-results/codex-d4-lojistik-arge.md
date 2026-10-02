# D4 A6/B2 — Yakıt zinciri ve lojistik kararları

2 Ekim 2026. A6 kaynak incelemesi; B2 ile doğrudan ortak karar alındı.
Amaç: fiyat/girdi/konum/stok tercihleriyle oyuncuyu içine çeken ekonomik detay.
Gerçek dünya işletmeciliği, her sevki elle yönetme veya yeni evrak yükü hedef değil.
Kanıt türü kod/belge okumasıdır; ağ/test/build çalıştırılmadı, davranış değiştirilmedi.

## Gerçekte çalışan ve taslak kalan

| Alan | Kod kanıtı ve oyuncuya etkisi |
|---|---|
| Petrol → yakıt | `icerik.json:81,111,244,264`: kuyu 150 petrol/sa; rafineri 150 petrol + 25 elektrik → 120 yakıt/sa, 1 parça/sa bakım. Tarif nominal S/tam verimdir; gerçekleşen miktar girdi/ölçek/verimle değişir. |
| Mülkte rafineri | **Kapalı:** `parametreler.json` yapiYuva/olcekHucre listelerinde rafineri yok. `derle.ts:162` yuva=0 kurar; `mulk/komut.ts:306` inşayı reddeder. Bu eski kural açıkça `docs/06:503`te yazılı; hata düzeltmesi değil yeni kapsam kararıdır. |
| Kuyu/rezerv | Kuyu mülk listesinde var; `gerekliRezerv=petrol`. Gerçek parsel konumu ve rezervi kurulurken denetlenir. Yeni petrol yatağı/il bonusu uydurulamaz; ham petrol ithalatı rafineriye alternatif giriş olur. |
| Sanayi yakıtı | Makineli tarım, maden, elektrik ark, parça, mühimmat, fırın/cam/balık ve yakıt jeneratörü tariflerinde yakıt var. Ancak mülk kipinde bu yöntem girdileri **stok değil otomatik şebeke** tüketir. |
| Şebeke kaynağı | `uretim.ts:385,608,759`: yakıt stok talebinden çıkarılır, gerçek yöntem tüketimi hesaplanır, stoktan düşülmez. Yerli/ithal yakıt stoğu bu sanayi giderini azaltmaz; sadece rafineri açmak sanayi zincirini tamamlamaz. |
| Şebeke ücreti | `derle.ts:225–236`: birim fiyat = taban × kamu ithalat alt sınırı × tavan oranı, tamsayı yuvarlanır. `cozum.ts:173–185` gerçek tüketim × bu fiyatı hazineden alır. Canlı piyasa yakıt fiyatı kullanılmaz; çıplak taban fiyat diye gösterilmez. |
| Askerî stok yakıtı | `icerik.json:366` zırhlı üretimine 20 yakıt; ikmaline 3 yakıt/sa nominal. `askeri/uretim.ts:125` mülk çarpanı 0,25 uygular: 0,75 yakıt/sa/birlik. Şebeke bunu karşılamaz; yakıt stoktan/ağdan/ithalattan gelir. Piyade ikmali gıda+mühimmat. |
| Diğer stok yakıtı | Yakıt depolanabilir; ithalat/ihracat ve dükkân hane satışına açık. Petrol ayrıca azotlu gübre girdisi. Bu tüketiciler ve şebekeli yöntemler aynı tüketim kaynağı sayılmaz. |
| Üretim gideri | `uretim.ts:379` bakım parçalarını, `cozum.ts:207–220` tesis işletme ve birlik maaşını uygular. Bunlar yakıtın bedelinden ayrı; üretilen girdiye ayrıca hayalî satın alma gideri eklenmez. |
| İç taşıma | `lojistik/akis.ts:4–16,428,559`: ortak kenar kapasitesi, askerî öncelik/sivil rezerv, süreye göre otomatik rota, gecikmeli oran_delta gerçekten var. Aynı oyuncunun mülk düğümleri merkezlere bağlanır; il içi havuz sıfır süre/yol. |
| Taşıma parası/yakıtı | **Yok:** MCF `maliyet=k.sureMs`, para değil. Akış yolundan ayrıca yakıt, taşıt/parça, nakliye ücreti veya şoför maaşı düşülmez. NPC ithalatı işletmeye pazar oranıyla gelir; ayrı NPC→işletme taşıma rotası yok. |
| Garaj | `parametreler.json:283` inşa maliyeti/yuva/tavanı var; taşıt kapasitesi, yakıt tüketimi veya rota etkisi kaydı yok. Garajı çalışan filo diye sunma. |
| Taslak genişlemeler | `cesitlilik-uretim-katmanlari` S-Z2 petrokimya/araç, tabloda yakıt→taşıma yönü; üretim ağı raporları gelecekte uzmanlaşma/sözleşme önerir. Benzin/motorin ayrı mallar ve oyuncu taşıyıcı/tedarikçi pazarı mevcut içerikte yok. |

## Üç ayrı gider; çift ücret olmadan

1. **NPC mal alış bedeli:** `pazar/fiyat.ts:109` referans → makas → liman primi
   → tarife → komisyon. Tarife aynı hazineye geri yazıldığından net nakit etkisi 0;
   komisyon kalkan/Ticaret ofisiyle değişebilir. D4 `ithNetPpm` gerçek net çarpandır.
2. **Liman primi:** `pazar/tablo.ts:64` dünya kapısına deniz saati × oran, tavanlı.
   Mevcut dış ticaret taşıma bedeli soyutlamasıdır; iç ağdaki sevkin yakıt tüketimi
   veya bütün mallara uygulanan genel yol gideri değildir.
3. **Otomatik şebeke bedeli:** derlenmiş sabit fiyatla tüketim anında tahsil edilir.
   Yakıt stok ithalatı onun yerine geçmez. Aynı yakıt girdisi hem stok hem şebeke
   diye iki kez harcanmamalı. Yeni transit gideri bu üç kaleme gizlice eklenemez.

**Fiyat şoku bugün neyi değiştirir?** Canlı yakıt fiyatı stok ithalatını, ticaretini
ve ordunun ikmal maliyetini değiştirir; yerli stok sahibinin fırsat maliyeti değişir.
Sanayi şebekesinin sabit birim fiyatı ve MCF'nin süre hedefi değişmez.
Dolayısıyla bugün “yakıt pahalı, ucuz rotaya geç” seçeneği çalışan mekanik değildir.

## UI'da var ve eksik

- Üretim ağında **Enerji: petrol→yakıt** kısayolu eklendi; rafinerinin mülkte
  kurulamaması doğru gösterilir. Nominal girdide şebeke kapsamı gerçek parametre
  kesişiminden açıklanır; elektrik kendi üretiminden sonra kalan açık olarak ayrılır.
- Tedarik paneli gerçek ithalat emri/net fiyat ve stok yakıtının otomatik tesis
  giderini ikame etmediği koşullu uyarıyı gösterir. Ayrı liman primi/makas/komisyon
  kırılımı yok. Ordu stok kapsamı yakıtın doğru tüketicisidir.
- `ozel.sebeke` gerçek miktarı taşır; gerçek derlenmiş birim fiyat telde yok.
  İstemci kopya fiyat motoru yerine doğrulanmış fiyat/bedel alanı kullanmalıdır.
- Sahibin akış yolu/süresi/kapasite darboğazı mevcut özel karede yok; net stok
  oranından rota veya teslim süresi çıkarılamaz. “Yolda” ve “stokta” ayrı kanıttır.

## Ortak karar: sonraki üç somut dilim

**L1 — Mevcut ekonomik kararın görünürlüğü (önce).**
Üretim ağına petrol→yakıt zincir kısayolu; tüketiciye göre “otomatik tesis yakıtı”
ve “depo/ordu/ticaret yakıtı” ayrımı. Seçili işletmede gerçek şebeke gideri ve
stok ithalat bedeli farklı satırlar. Yalnız detay açılınca kalem kırılımı göster.
Özel kareye gerçek derlenmiş şebeke fiyatı/bedeli; ayrı teknik alt-adımda sahibin
akış yolu+süre+kapasite kısıtı. K3 tek çekirdek yazarı → protokol → istemci.
Kabul: stok yakıtı 0 iken çalışan şebekeli tesisin gideri doğru açıklanır;
aynı durumda zırhlı ikmal eksiği görünür; nakit toplamı gerçek core'a eşittir;
uzak sevk ulaşmadan stok sayılmaz; yabancı stok/rota açılmaz.

**L2 — Rafineriyi gerçek sanayi tedarik seçeneği yap.**
Rafinerinin mülk ayak izi/inşa tablosunu mevcut tesis kimliğiyle aç; petrolü
stoktan alan yöntem korunur, rezervli kuyu veya gerçek ham petrol ithalatı besler.
Root davranış tercihi: sanayi yakıtında **yerli/ithal stok öncelikli, kalan açık
otomatik şebeke** önerisi; mevcut şebeke güvenliği bir anda kaldırılmasın.
Stok talebi/gerçekleşen tüketim/şebeke açığı aynı çözücüde hesaplanır;
ordu önceliği korunur, sanayi ikmali için kullanılmış yakıt ikinci kez düşmez.
Bu yeni kaynak ikamesidir: veri kural dönemi, serileştirme/replay ve para
korunumu birlikte ele alınır. Mevcut piyasa fiyatı ile üretim girdileri/bakım/
elektrik/işletme gideri karşılaştırması, “ithal et mi rafine et mi?” kararını açar.
Kabul: 10 yakıt talebinde stoktan 4, şebekeden 6 karşılanırsa toplam 10;
stok=0/bol stok/ordu ile ortak kıtlık/kapanmış tesis örnekleri; ithalatı durdurma
ve üretim açma gerçek stok/şebeke bedelini beklenen yönde değiştirir.

**L3 — Yakıt fiyatını iç taşıma/konum tercihine bağla.**
Önce root tek taşıma modelini seçer: **otomatik taşıyıcı hizmet bedeli**
(yakıt fiyatına bağlı, fiziksel depo yakıtı ayrıca düşmez) veya **sahibin stok
yakıtını tüketen taşıma** (aynı yakıt için ayrıca hizmet yakıt parası alınmaz).
İlkini daha dar teslim olarak öneriyoruz; fiziksel yakıt rezervi ikinci seçenekte
yakıtın kendisini taşıma/geri besleme döngüsünü de çözmeyi gerektirir.
Mevcut kara/deniz/hava kenarları için açıklanan tüketim/gider katsayısı, gerçek
akış miktarı ve yol süresi kullanılır; oranlar bu raporda icat/kalibre edilmez.
Otomatik rotada “hızlı/ekonomik” tercih ancak iki gerçek sonucu hesaplayınca açılır.
NPC dış ticaret liman primi tekrar ücretlendirilmez; kapsam yalnız iç kenarlardır.
Yeni gider para akışında açık kalem ve tek lavabo/transfer kaynağı olmalıdır;
yeniden çözüm ücreti değil simülasyon süresince gerçekleşen akış ücretidir.
Kabul: sıfır akış=0 gider; kısa/uzun ve kara/deniz yol farkı; yakıt fiyatı
değişince öngörülen maliyet/rota tercihi değişir; kapasite/gecikme korunur;
aynı sim süreyi parçalara bölmek/reload toplam gideri değiştirmez.

## Root'a sunulan uygulama sırası

L1 başlayabilir; protokolde olmayan verinin görünürlüğü ilgili sahibine atanır.
L2 için rafineri ayak izi + stok/şebeke ikamesi, L3 için tek ücret/tüketim modeli
root sözleşmesinde kapanır. Kullanıcıdan her dilimde tekrar izin istenmez.
Gerçek tedarikçi piyasası gelene kadar seçenek “NPC ithalatı/kendi üretimin/
şebeke”dir; henüz olmayan firma seçimi ve transit maliyeti varmış gösterilmez.
B2 ortak karar: önce mevcut kaynak/gider ayrımı, sonra yakıt kaynağı ikamesi,
sonra transit kuralı; protokol kanıtı olmadan teslim süresi veya fiziksel ücret yok.

## D4 kapanış durumu

Root üç dilim sırasını onayladı; L1'in dar metin/zincir kısmı uygulandı:
A3 tedarikte stok yakıtı–otomatik şebeke ayrımını, B4 petrol→yakıt yolunu ve
nominal yöntemin şebeke kapsamını tamamladı; bu Ar-Ge görevinde test çalıştırılmadı.
Gerçek rota/süre/kapasite alanları ve şebeke fiyat/bedel aktarımı sonraki L1 işidir.
L2 rafineri/stok ikamesi ile L3 transit gideri bu tur kodlanmaz; kaynak ve bütçe/
denge briefi kapanmadan yeni tüketim/ücret açılmaz.
