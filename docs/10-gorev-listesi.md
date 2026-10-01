# 10 — Önceliklendirilmiş Görev Listesi (sabah sunumu)

> **Hazırlanma anı:** 30 Eylül 2026, ≈ 22:05 UTC. Durum sütunu o ana ait git geçmişinden, çalışma ağacından ve gece planından çıkarılmıştır. Gece hâlâ sürdüğü için **"Devam ediyor (gece)" = kesin bilinmiyor / yarım olabilir;** sabah takım lideri günceller. Bu belge kod içermez; sayılar, başka kaynak gösterilmedikçe docs/00–08 ve araştırma raporlarından alınmıştır. Kaynağı olmayan her sayı **(tahmin)** ya da **(hedef)** diye işaretlidir.

## 1. Özet

**Nerede duruyoruz.** Aşama 2 çekirdeği (deterministik simülasyon, ekonomi/lojistik/askeri/teknoloji/politika, bot ve ölçüm takımı, 2D izleyici) ve v0.2.1 veri dengesi commit'lidir (son commit `4de23af`). Kapı 2 **geçilmedi:** v0.1 ölçümünde H5 geçiyor, H2/H3/H6 belirsiz, H1 ve H7 kalıyor; H1 ölçüm düzeneği v0.2 tek tohumla %68,8 (eşik %70) verdi ve sağlam değil ([05](05-ilk-olcum-raporu.md)). Gece planının Faz A'sı yürüyor: altı katman spesifikasyonu (docs/08) ve araştırma raporları tamam; gerçek Karadeniz dilimi (53 bölge, 143 kenar, 4 kurgusal devlet) ile 3D küre istemcisinin ilk sürümü **çalışma ağacında, commit'siz**; Tarım (B1) çekirdek uygulaması başladı. Yani "3D küre + gerçek harita + 6 katman" için tasarım ve iskelet var, oynanabilir bütün henüz yok: komut arayüzü, yakın plan (Katman B), çok oyunculu sunucu ve ölçüm kapısı açık.

**Önümüzdeki 3 hedef.**
1. **Oynanabilir 3D küre (Katman A) + gerçek dilim:** gece işlerini sağlamlaştır, performans bütçesini ölç, komut ve "neresi açık ve neden" görünümünü ekle (E1, E3, E10, E14).
2. **Altı katmanın çekirdekte tamamlanması ve ölçülmesi:** Faz B (Tarım → Sanayi → Pazar → Devlet → Lojistik → Teknoloji), her adımda H1/H2/H7 regresyonu; en önemli gizli iş damar tükenmesi (E4–E9, E12).
3. **Karar kapılarını kapatmak:** sınır/isim politikası, ODbL (yakın plan verisi), teknoloji düğüm sayısı, çok oyunculu zamanlaması (bölüm 4); ardından H4 insan testi.

### 1.1 Sayımlar

| Epik | Görev | P0 | P1 | P2 | Tamamlandı | Devam (gece) | Yapılacak |
|---|---:|---:|---:|---:|---:|---:|---:|
| E1 3D Dünya (A) | 10 | 4 | 4 | 1 | 1 | 4 | 5 |
| E2 3D Yakın Plan (B) | 9 | 0 | 7 | 2 | 0 | 0 | 9 |
| E3 Veri hattı | 9 | 2 | 3 | 3 | 1 | 1 | 7 |
| E4 Tarım | 8 | 4 | 3 | 1 | 0 | 6 | 2 |
| E5 Sanayi | 8 | 4 | 3 | 1 | 0 | 0 | 8 |
| E6 Lojistik | 7 | 0 | 5 | 2 | 0 | 0 | 7 |
| E7 Teknoloji | 6 | 0 | 5 | 1 | 0 | 0 | 6 |
| E8 Pazar | 8 | 2 | 3 | 3 | 0 | 0 | 8 |
| E9 Devlet | 10 | 2 | 7 | 1 | 0 | 0 | 10 |
| E10 Komut arayüzü | 8 | 2 | 5 | 1 | 0 | 0 | 8 |
| E11 Çok oyunculu | 8 | 0 | 6 | 2 | 0 | 0 | 8 |
| E12 Denge ve ölçüm | 11 | 1 | 8 | 1 | 1 | 0 | 10 |
| E13 Gerçekçilik | 8 | 0 | 4 | 4 | 0 | 0 | 8 |
| E14 Performans | 8 | 2 | 5 | 1 | 0 | 1 | 7 |
| E15 Hukuk ve lisans | 7 | 1 | 6 | 0 | 0 | 1 | 6 |
| E16 Gelir ilkeleri | 3 | 0 | 0 | 3 | 0 | 0 | 3 |
| E17 Pürüzler | 8 | 1 | 5 | 1 | 1 | 1 | 6 |
| **Toplam (17 epik)** | **136** | **25** | **79** | **28** | **4** | **14** | **118** |

*Not: Tamamlandı satırlarının önceliği "—" yazılmıştır, P toplamlarına girmez.*

### 1.2 Okuma kılavuzu

| Alan | Değerler |
|---|---|
| **Öncelik** | **P0:** sıradaki işi bloke eden ya da kapı/karar kritiği, ilk sprint adayı. **P1:** prototip v1 için gerekli. **P2:** sonraya bırakılabilir ya da koşullu. |
| **Boyut (tahmin)** | **S** ≤ 2 gün · **M** 3–5 gün · **L** 1–2 hafta · **XL** > 2 hafta (ajan takımı çalışma günü; ölçülmedi, tahmindir). |
| **Durum** | **Tamamlandı** (commit'li ya da doğrulanmış) · **Devam ediyor (gece)** (yarım ya da bilinmiyor) · **Yapılacak**. |
| **Faz B eşlemesi** | E4 = B1 Tarım · E5 = B2 Sanayi · E8 = B3 Pazar · E9 = B4 Devlet · E6 = B5 Lojistik · E7 = B6 Teknoloji ([08 §7](08-alti-katman.md#7-faz-b-uygulama-sırası)). Uygulama sırası B1→B6'dır; epik numaraları bu sırayı izlemez. |
| **Çekirdek kuralı** | `packages/cekirdek` aynı anda tek uygulayıcı ajanda; sözleşme (tipler.ts) değişiklikleri takım liderinde (gece planı). |

### 1.3 Altı katman tek bakışta: oyuncuya gelen yinelenen kararlar

Amaç, 20–25. gündeki tekrar sıkıntısını (H2) her katmanda ayrı bir yinelenen kararla kırmaktır. Ayrıntı ve sayılar [08](08-alti-katman.md) içindedir; sayıların hepsi başlangıç varsayımıdır, kalibre edilmemiştir.

| Katman | Epik | Bugün (kod) | v1'de eklenen yinelenen kararlar | Bağlandığı katmanlar |
|---|---|---|---|---|
| Tarım | E4 | `ciftlik` + `gida_fabrikasi`, 3 yöntem | toprak yorgunluğu ve ekim karışımı, iklim takvimi (12 ay hasat eğrisi), yayılan iklim olayları, gübre dozu, hayvancılık, sulama | Sanayi (gübre, kirlilik), Lojistik (gıda), Devlet (sübvansiyon), iklim |
| Sanayi | E5 | 17 yöntem, 12 tesis türü, tükenmeyen damarlar | elektrik ve brownout, ölçek S/M/L, bakım ve aşınma, kirlilik, damar tükenmesi ve keşif sondajı | Tarım (gübre), Lojistik (yakıt), Devlet (teşvik, kirlilik) |
| Lojistik | E6 | min-maliyet akış, tek `kapasiteSaat` | filo kapasitesi ≠ yol kapasitesi, taşıma yakıtı, mevsimsel kenar (buz, kapanan geçit), depo | iklim, Sanayi, Pazar, Devlet (seferberlik) |
| Teknoloji | E7 | 6 düğüm, tek kuyruk | ≈ 17 düğüm, sürekli araştırma bütçesi (2 slot), karşılıklı dışlayan dallar, anlaşmalı yayılım | hepsine "yöntem açar" (yüzde vermez) |
| Pazar | E8 | tek küresel NPC pazar, 1,1× / 0,9× çarpan | liman primi (= taşıma maliyeti farkı), açıkça işaretli NPC piyasa yapıcı ve makas, komisyon/tarife, kıtlık cezası | Lojistik (kapsam), Devlet (tarife, vergi) |
| **Devlet** (karma, yönetici) | E9 | nüfus büyümesi, `vergi_ayarla`, anlaşma/yaptırım, savaş | 3 ihtiyaç kademesi, istikrar, göç, 7 bedelli yasa, 3 bütçe kolu, askeri ve diplomasi bağları | **tüm katmanları** yasa ve bütçe kollarıyla yönetir: tarım sübvansiyonu, sanayi teşviki, tarife, araştırma bütçesi, seferberlik, enerji önceliği |

---

## 2. Epik listesi

| Epik | Başlık | Hedef çıktı | Öncelik ağırlığı |
|---|---|---|---|
| **E1** | 3D Dünya: Katman A (stilize küre, three.js) | Dolaşılabilir küre, bölge/akış/kapsam görünümü | P0 |
| **E2** | 3D Yakın Plan: Katman B (MapLibre, PMTiles, binalar, kamyonlar) | Bölgeye yaklaşınca yollar, tesisler, konvoylar | P1 |
| **E3** | Gerçek Dünya Veri Hattı ve tüm dünyaya genişleme | Doğrulanmış gerçek dilim, kaynaklı veri, dünya görsel katmanı | P0 |
| **E4** | Tarım (B1) | İklim takvimi, toprak, olaylar, gübre | P0 |
| **E5** | Sanayi (B2) | Elektrik, aşınma, kirlilik, damar tükenmesi | P0 |
| **E6** | Lojistik (B5) | Filo, yakıt, iklim kenarı, depo | P1 |
| **E7** | Teknoloji (B6) | ≈ 17 düğüm, bütçe, dışlayan dallar | P1 |
| **E8** | Pazar (B3) | Liman primi, NPC makası, tarife, kıtlık | P0–P1 |
| **E9** | Devlet (B4) | İhtiyaç, istikrar, göç, yasa, bütçe | P0–P1 |
| **E10** | Oyuncu Etkileşimi ve Komut Arayüzü | 3D istemcide oynanabilirlik, onboarding | P0 |
| **E11** | Çok Oyunculu Sunucu | Olay kaynaklı yetkili sunucu, WebSocket, Postgres | P1 |
| **E12** | Denge ve Ölçüm | H1–H7, H4 insan testi, 10 tohum, duyarlılık | P0–P1 |
| **E13** | Gerçekçilik İçerikleri | İklim olayları, damarlar, limanlar, tesisler (açık veri) | P1 |
| **E14** | Performans ve Mobil | Bütçe, cihaz testi, kalite kademeleri | P0–P1 |
| **E15** | Hukuk, Lisans ve Sınır Politikası | Onaylı politika, atıf, ODbL kararı | P0–P1 |
| **E16** | Gelir Modeli İlkeleri (prototip dışı) | İlke belgesi, pay-to-win testi | P2 |
| **E17** | Pürüzler, Teknik Borç ve Belge Bakımı | Commit/CI, bilinen sınırlar, belge tutarlılığı | P0–P1 |

---

## 3. Görevler

### E1 — 3D Dünya: Katman A (stilize küre)

**Yığın:** yalnız three.js (185 KB gzip tam paket, MIT); düşük çokgenli küre, birleştirilmiş bölge ağları, shader ile kayan büyük daire yayları, `InstancedMesh`; **hedef** < 40 çizim çağrısı ([arastirma/3d-teknoloji](arastirma/3d-teknoloji.md) §2). Simülasyon tarayıcıda Web Worker'da koşar. **Gece durumu:** `packages/istemci` mevcut (küre, bölge katmanı, şeritler, kamera, panel, worker); commit'siz. Tek dosya derlemesi 1,05 MB (ham; gzip ölçülmedi).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E1-G0 | 2D inceleme sayfası | `pnpm izle` tek dosyalık 2D görünüm, hata ayıklama aracı olarak kalır. | `izleyici.html` üretilir | — | M | — | Tamamlandı |
| E1-G1 | Küre MVP | Stilize küre, sahip renkli bölge çokgenleri, shader akış yayları, tıkla-seç paneli, zaman kontrolleri; sim Web Worker'da, botlar oynar. | `pnpm dunya` tek HTML üretir; 53 bölge renklenir; bot koşusunda akış yayları görünür; masaüstü ve mobil ekran görüntüsü alınır | E3-G1 | L | P0 | Devam ediyor (gece) |
| E1-G2 | Gerçek dilimin istemciye bağlanması | Geçici Natural Earth çokgenleri yerine `gercek-karadeniz-sinirlar.topo.json` (nesne `bolgeler`) ve bölge adları; atıf alanı görünür. | Haritadaki 53 bölgenin hepsi kimliğiyle eşleşir; sentetik harita da yüklenir | E3-G1, E1-G1 | S | P0 | Devam ediyor (gece) |
| E1-G3 | Gezen kamera | Yörünge + serbest uçuş, bölgeye uçuş, dokunmatik; oyuncunun "içinde dolaşması". | Masaüstü ve dokunmatikte iki mod çalışır; bölgeye uçuş sırasında çizim çağrısı bütçe içinde (E14-G2) | E1-G1 | M | P0 | Devam ediyor (gece) |
| E1-G4 | Kapsam görünümü ("neresi açık ve neden") | 3 boyutta U1–U7: 3–4 durum, kenar genişliği = kapasite, renk = kullanım, neden glifi, tıkla → tek satır neden, darboğaz tırmanışı. | Çekirdeğin neden sınıflarının (`kapasite`, `girdi_eksik`, `mesafe`, `erisim_yok`; B5 sonrası +3) hepsi görünür; renk körü ikinci kanal var; H4 protokolüne hazır 3 senaryo | E1-G1, E12-G6 | L | P0 | Yapılacak |
| E1-G5 | Görsel dil ve ışık | Gün/gece terminatörü, atmosfer, koyu/açık tema, LOD'lu etiketler, liman ve bölge simgeleri. | Açık ve koyu temada ekran görüntüleri; etiketler yakınlığa göre açılıp kapanır | E1-G1 | M | P1 | Devam ediyor (gece) |
| E1-G6 | İklim takvimi ve olayların görünümü | Aylık kar/buz örtüsü, kuraklık/don/sel uyarı halkası, uyarı süresi sayacı. | Ay değişince örtü değişir; bir olayın uyarı → etki → bitiş evreleri küre üzerinde izlenir | E4-G1, E4-G3 | M | P1 | Yapılacak |
| E1-G7 | Devlet ve savaş göstergeleri | Göç okları, savaş penceresinde sınır nabzı, anlaşma bağları, ışık yoğunluğu = nüfus ([08 §6.1](08-alti-katman.md)). | Üç gösterge sim olaylarından beslenir; kapalıyken çizim çağrısı artmaz | E9-G3, E9-G6 | M | P2 | Yapılacak |
| E1-G8 | Erişilebilirlik ve metin | Renk körü paleti, klavye kontrolü, panel metinleri ekran okuyucuya uygun, tüm metin Türkçe. | Renk körü simülasyonunda durumlar ayırt edilir; tüm panel klavyeyle gezilebilir | E1-G1 | M | P1 | Yapılacak |
| E1-G9 | Yayın ve sürümleme | Tek HTML / artifact yayını, sürüm etiketi ve atıf ekranına bağlantı. | Her yayın sürüm etiketli ve atıf ekranı bağlı | E15-G2 | S | P1 | Yapılacak |

### E2 — 3D Yakın Plan: Katman B (MapLibre, PMTiles, binalar, kamyonlar)

**Yığın önerisi:** MapLibre GL v5+ küre projeksiyonu (285 KB gzip, BSD-3, token yok) + Protomaps PMTiles (pmtiles istemcisi 7,7 KB gzip) + three.js özel katmanı; Cesium, Babylon ve Google 3D Tiles elendi. **Uyarı:** küre modunda özel katmanlar yeni ve az belgelenmiş; Capital Rift'in 3D yığını belgelenmemiş. **Ön koşul:** E15-G3 (ODbL kararı).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E2-G1 | Teknik doğrulama (spike) | MapLibre küre + three.js özel katman + PMTiles tek bölgede; paket boyutu, fps, bellek ölçümü. | Tek bölgede yakınlaşma çalışır; ilk JS ≤ 2 MB gzip (hedef); ölçüm raporu `docs/olcum/` altında | E1-G1, E15-G3, E14-G1 | M | P1 | Yapılacak |
| E2-G2 | PMTiles çıkarım hattı | Bölge başına `pmtiles extract` (z0–12 + bina), statik sunum, karo boyutu bütçesi. | Bir bölgenin karo boyutu ölçülür ve bütçe belgelenir; tembel yükleme | E2-G1 | L | P1 | Yapılacak |
| E2-G3 | Bina taban alanları | `fill-extrusion` ile bölge ölçeğinde çıkıntılı binalar (sokak ölçeği değil). | Bir kent bölgesinde bina katmanı 30 fps'in (hedef) altına düşmeden açılır | E2-G2, E15-G3 | L | P2 | Yapılacak |
| E2-G4 | Tesis model seti | 12 tesis türü için düşük çokgenli özgün model seti (çiftlik, ahır, fabrika, santral, liman...) ve kirlilik/duman göstergesi. | Her tesis türü bir model ve bir durum göstergesi (çalışıyor/duruyor/brownout) ile görünür; varlıklar özgün ya da CC0 | E2-G1, E5-G1 | L | P1 | Yapılacak |
| E2-G5 | Kamyon ve konvoy akışı | Sim kenar akışından örneklenmiş `InstancedMesh` kamyon/gemi; kare başına örnek tavanı. | Konvoy sayısı kenarın kullanım değeriyle tutarlı; örnek tavanı aşılınca örnekleme azalır | E2-G1, E6-G1 | L | P1 | Yapılacak |
| E2-G6 | Küre ↔ yakın plan geçişi | `projectionTransition`, yakınlaştırma eşikleri, bellek temizliği, geri dönüş. | 10 ardışık geçişte bellek sızıntısı yok (Playwright ölçümü) | E2-G1 | M | P1 | Yapılacak |
| E2-G7 | Yakın planda dolaşma | Yer seviyesine yakın serbest kamera, LOD, görüş alanı kırpması, dokunmatik. | Kamera modu yakın planda çalışır; çizim çağrısı < 100 (hedef) | E2-G6, E1-G3 | M | P1 | Yapılacak |
| E2-G8 | Arazi ve yükseklik | Terrarium / Mapterhorn karoları, atıf. | Dağ ve geçit bölgelerinde yükseklik görünür; atıf ekranda | E2-G2 | M | P2 | Yapılacak |
| E2-G9 | Karo ve enterpolasyon işçileri | Karo çözme ve sim enterpolasyonu işçide, paylaşılan `Float32Array`. | Ana iş parçacığı kare süresi yakın planda bütçe içinde (E14-G2) | E2-G1 | M | P1 | Yapılacak |

### E3 — Gerçek Dünya Veri Hattı ve tüm dünyaya genişleme

**Gece durumu:** `packages/veri-hatti` ve `gercek-karadeniz*.json` üretildi, commit'siz. Çıktı: 53 bölge, 143 kenar (101 kara, 38 deniz, 4 hava), 4 kurgusal devlet (2 blok), 27 liman etiketli bölge; İstanbul ve Çanakkale dar geçit; Şipka ve Kafkas dağ geçitleri; `DATA_SOURCES.md`. Kaynaklar: Natural Earth v5.1.2 (kamu malı), USGS MRDS (kamu malı). **Dürüstlük notu:** kömür/petrol/tahıl/silis rezervleri elle, genel bilgiyle yazılmış tasarım değeridir; bölgeler arası denge bilerek tasarlanmıştır.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E3-G0 | Gerçek harita veri sözleşmesi | `BolgeTanimi.konum`, `sinirDosyasi`, `atif` alanları. | Şemadan geçer (commit `f018575`) | — | S | — | Tamamlandı |
| E3-G1 | Karadeniz dilimi hattı | Natural Earth admin-1 → 53 oyun bölgesi; komşuluk, deniz kenarları, limanlar, rezerv ve nüfus; deterministik ve sha256 kilitli. | `dogrulaVeriPaketi` geçer; ≥ 2 dar geçit; aynı girdi → bayt bayt aynı çıktı (test); `DATA_SOURCES.md` güncel | E15-G1 | L | P0 | Devam ediyor (gece) |
| E3-G2 | Gerçek haritada sim ve ölçüm sağlığı | Gerçek haritada sim + botlar çalışsın; sentetik haritayla yan yana karşılaştırma. | `pnpm olcum --hip H1,H2,H7 --tohum 1 --hizli` gerçek haritada çalışır; bölgesel sapmalar (ör. çözüm süresi, israf) raporlanır | E3-G1 | M | P0 | Yapılacak |
| E3-G3 | Tarım alan verisi | `toprakTabanPpm`, `iklimTipi`, `sulanabilirPpm`, `tarimTesisTavani`: GAEZ (CC BY) + CHELSA (CC0) + SoilGrids (CC BY) zonal istatistik. | 53 bölgenin hepsinde alanlar dolu; kaynak ve dönüşüm kuralı DATA_SOURCES'te | E4-G1, E3-G1 | L | P1 | Yapılacak |
| E3-G4 | Liman verisi | `LimanTanimi` (dünya kapısı, dünya mesafesi saat, kapasite sınıfı). NGA WPI bu ortamda HTTP 403 verdi; Natural Earth ports + elle eklenen 5 liman kullanıldı. | 2–4 dünya kapısı; her liman bölgesinde `dunyaMesafeSaat` hesaplı; WPI erişimi çözülürse karşılaştırma | E8-G1 | M | P1 | Yapılacak |
| E3-G5 | Nüfus verisi | Natural Earth `pop_max` ölçekli göstergesi yerine WorldPop veya GHSL (CC BY) zonal toplamı. | Bölge nüfusu raster toplamından gelir; ölçek kuralı belgelenir | E3-G1 | M | P2 | Yapılacak |
| E3-G6 | Kenar iklim profilleri | Dağ geçitleri ve Karadeniz/Marmara için 12 aylık kenar çarpanı (CHELSA + yükseklik). | Profilli kenarlar yalnız kış aylarında kapanma eğilimi gösterir | E6-G3, E3-G1 | M | P2 | Yapılacak |
| E3-G7 | Tüm dünya görsel katmanı | NE admin-1 (4 596 nesne) sadeleştirilip tembel yüklenir; oyun dışı bölgeler soluk; oyun bölgesi ≠ görsel bölge. | Dünya topolojisi ilk JS'ye girmez; yükleme sonrası gzip boyutu ölçülür (hedef 1,5–4 MB, tahmin) | E1-G1 | L | P1 | Yapılacak |
| E3-G8 | İkinci ve sonraki oyun dilimleri | Dilim seçimi (sahip kararı), hat yapılandırması, 3–4 devlet, ≥ 2 dar geçit; çok dilimli dünyada sim ölçeği testi. | Yeni dilim aynı biçimle yüklenir; 100+ bölgede 30 günlük koşu süresi ölçülür (E14-G4) | Karar §4-2, E14-G4 | XL | P2 | Yapılacak |

### E4 — Tarım (Faz B1)

**Spesifikasyon:** [08 §1, B1](08-alti-katman.md#1-tarım) (tamamlandı; kalibre edilmemiş). **Gece durumu:** B1 çekirdek uygulaması 21:57'de başladı (tek yazar); hangi alt adımların bittiği bilinmiyor, bu yüzden G1–G6 "Devam ediyor (gece)".

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E4-G1 | İklim takvimi ve olay akışı | `takvimGunu`, 12 ay doğrusal enterpolasyon, `iklim_gunluk` olayı, `gunCarpani`, `olay` PRNG akışı. Takvim sezon değil sürekli zaman eğrisidir (K21). | Her eğrinin 365 gün ortalaması PPM ± 1 000; aynı tohum → aynı özet (30 ve 400 gün); uyuyan bölge iklim/toprak tikinde donar | — | M | P0 | Devam ediyor (gece) |
| E4-G2 | Toprak verimliliği ve ekim planı | `ekim_plani` (buğday, baklagil, nadas), günlük toprak değişimi. | 30 günlük 4 botlu koşuda toprak ∈ [300 000, 1 000 000] ppm; regresyon kalkanı (`ekimPpm=[PPM,0,0]` → v0.2 birebir) | E4-G1 | M | P0 | Devam ediyor (gece) |
| E4-G3 | Yayılan iklim olayları | Kuraklık, don, sel, kış fırtınası; uyarı süresi; komşu bölgeye deterministik yayılma. | İki koşu birebir aynı olay listesi; olay olasılığı 0 iken v0.2 birebir | E4-G1 | M | P0 | Devam ediyor (gece) |
| E4-G4 | Gübre dozu | `gubre` malı, `gubre_dozu` komutu, toprak ve çıktıya etkisi; fabrika B2'de gelir. | Doz 0..azami aralığında; gübre stoku tüketilir; doz = 0 iken v0.2 birebir | E4-G2, E5-G6 | M | P1 | Devam ediyor (gece) |
| E4-G5 | Hayvancılık | Ahır ve mera tesisleri; gıda ve yem bağı. | Ahır ve mera tesis tavanı (`tarimTesisTavani`) içinde; gıda zinciri testi | E4-G2 | M | P1 | Devam ediyor (gece) |
| E4-G6 | Sulama | `sulama_kanali` tesisi ve `sulama_sistemi` teknolojisi; kuraklık koruması (yakıtla, B2'de elektriğe). | Sulama açıkken kuraklık kaybı azalır (birim test); teknoloji ağına girer | E4-G3, E7-G1 | M | P1 | Devam ediyor (gece) |
| E4-G7 | Tarım ölçümü ve kalibrasyon | 12 ay için `gunCarpani = 12` ve 12 başlangıç ayı koşuları; H2, H1, lavabo/gelir, H5 kontrolü. | H2 tekrar ≤ %60 ve kalıcı sıfır karar günü yok; H1 ilk üç ≤ %70; lavabo/gelir 0,30–0,63; H5 ≤ %25; 30 günlük koşu ≤ v0.2 × 1,15 | E4-G1…G6, E12-G1 | M | P0 | Yapılacak |
| E4-G8 | Tahıl bozulması ve kış depolaması | Tahıl %1/gün bozulur; ambarla kışa kadar depolama mümkün mü? ([08 §8-1](08-alti-katman.md#8-açık-sorular-ve-riskler)). | Ölçüm raporu; gerekirse `bozulmaMallari` çarpanı (v0.1 kalibrasyonunu bozma riski not edilir) | E4-G7 | S | P2 | Yapılacak |

### E5 — Sanayi (Faz B2)

**Spesifikasyon:** [08 §2, B2](08-alti-katman.md#2-sanayi). Çekirdeğe giren yeni komutlar: `tesis_olcek_yukselt`, `genel_onarim`, `bakim_duzeyi`, `arama_sondaji`. **Bağımlılık:** B1.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E5-G1 | Elektrik malı ve brownout | `enerji` kategorisi, santral, iki geçişli hesap, enerji önceliği; elektrik stoklanmaz, taşınmaz, bölge içidir. | Brownout günü ≤ %5 (bot koşusu); "elektrik stoklanmaz/taşınmaz" invariantı; kapalıyken v0.2 birebir | E4-G1 | L | P0 | Yapılacak |
| E5-G2 | Çarpan zinciri, bakım ve aşınma | `uretimTabani` (%40) ile birleşik ceza tabanı; bakım düzeyi (asgari/normal/yüksek), genel onarım. | Aşınma sınırları test; 30. günde toplam ceza tabanının altına inmez | E5-G1 | M | P0 | Yapılacak |
| E5-G3 | Tesis ölçek kademesi | S/M/L: çıktı, işçi, bakım ve inşa oranları, `gerekliTeknoloji` (L için `otomasyon`). | Maliyet/işçi/çıktı orantı testi; L ölçekte brownout riski gözlenir | E5-G1 | M | P1 | Yapılacak |
| E5-G4 | Kirlilik | Emisyon → bölge kirliliği → tarım çıktısı ve istikrar; komşu yayılım. | Kirlilik dengesi testi; Tarım çarpan zincirine girer | E5-G1, E4-G2 | M | P1 | Yapılacak |
| E5-G5 | Damar ölçeği, tükenme ve keşif | Damar ölçeği (sentetik `rezervler × 0,4`), görünür tükenme, `arama_sondaji` (07 Ö7). 20–25. gün tekrarını kırması beklenen ana mekanizma. | Tek tesiste 25. günde %25–45 tükenme (hedef); H2 ≤ %60; H7 168. saat ≥ %50; keşif determinizm testi | E5-G2 | L | P0 | Yapılacak |
| E5-G6 | Gübre fabrikası ve sulama elektriği | `gubre_fabrikasi` ve `santral` içerikleri; Tarım'daki sulama yakıttan elektriğe geçer. | Tarım–Sanayi gübre zinciri 30 günlük koşuda çalışır | E5-G1, E4-G4 | S | P1 | Yapılacak |
| E5-G7 | Sanayi ölçümü ve kalibrasyon | H1/H2/H7 yeniden koşusu, `elektrik_ark` ölü uç kontrolü. | H2 ≤ %60, karar tükenmesi > 0; H1 tür başına en iyi önayar ≥ 4; ark ocağı ≥ 2 bölgede seçilir; H7 [%50, %85]; lavabo/gelir 0,30–0,63 | E5-G1…G5, E12-G1 | M | P0 | Yapılacak |
| E5-G8 | Bölge verim çarpanları (Ö4, koşullu) | Ova ×1,25 tarım, dağ ×1,25 çıkarım, kent ×1,30 işleme; yalnızca H1 hâlâ > %70 ise. | Koşul gerçekleşirse: tür başına en iyi önayar ≥ 4; çarpan ≤ +%30 | E12-G1 | M | P2 | Yapılacak |

### E6 — Lojistik (Faz B5)

**Spesifikasyon:** [08 §3, B5](08-alti-katman.md#3-lojistik). Derinlik bu katmanda kalır (ana yenilik). Regresyon kalkanı: filo = ∞, iklim çarpanı PPM, yakıt 0 → v0.2 çözümüyle birebir.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E6-G1 | Filo kapasitesi ≠ yol kapasitesi | Oyuncu filo havuzu (kara/deniz/hava konvoy), augment sınırlayıcı, `filo_al`. | Konvoy tavan hesabı ve augment sınırlayıcı testleri; filo = ∞ iken v0.2 birebir; çözüm süresi < v0.2 × 1,2 | E5-G1, E9-G6 | L | P1 | Yapılacak |
| E6-G2 | Taşıma yakıtı | `yakitKarsilanmaPpm`; yakıt yoksa akış kısılır. | Yakıt kıtlığında akış kısılır (test); kapsam nedeni `yakit_yok` | E6-G1, E5-G1 | M | P1 | Yapılacak |
| E6-G3 | İklim takvimine bağlı kenar çarpanı | Buzlu liman ve kapanan geçit (`iklim_kapali`), kenar profilleri. | `iklim_kapali` yalnız profilli kenarlarda ve kış aylarında görünür | E4-G1, E3-G6 | M | P1 | Yapılacak |
| E6-G4 | Depo ve ara istasyon | Depo yöntemleri: kapasite, tampon, bozulma çarpanı. | Depo etkisi `stok.ts` kapasite/bozulmasına bağlı; test | E6-G1 | M | P2 | Yapılacak |
| E6-G5 | Kapsam neden sınıfları genişlemesi | `filo_yetersiz`, `yakit_yok`, `iklim_kapali` (v1.5: `liman_dolu`) ve arayüz eşlemesi. | Neden sınıfı bot koşusunda tutarlı; E1-G4'te glif var | E6-G1…G3, E1-G4 | S | P1 | Yapılacak |
| E6-G6 | Liman elleçleme kapasitesi (Ö5) | Liman başına hacim tavanı; değer yoğunluğu sırası (v0.3 adayı). | Liman bölgelerinde ihracatçı tema baskınlığı düşer (H1 ölçümü) | E8-G1 | M | P2 | Yapılacak |
| E6-G7 | Lojistik ölçümü | Eşdeğerlik testi ve H3/H7 kontrolü. | Eşdeğerlik geçer; H3 ≥ %10; H7 bandı bozulmaz; lavabo/gelir 0,30–0,63 | E6-G1…G5 | M | P1 | Yapılacak |

### E7 — Teknoloji (Faz B6)

**Spesifikasyon:** [08 §4, B6](08-alti-katman.md#4-teknoloji). Bugün 6 düğüm; **öneri ≈ 17** (PDF 5–8; karar bekliyor, bölüm 4-3). İki dışlayan çift: `hassas_tarim` ↔ `organik_rotasyon`, `temiz_enerji` ↔ `termik_verim`.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E7-G1 | Düğüm içeriği (11 yeni düğüm) | Her katmana 2–4 düğüm, derinlik ≤ 4, her düğüm yöntem/tesis/karar açar ve bedeli vardır. | Ölü düğüm yok (her düğümün açtığı yöntem bot koşusunda en az bir kez kullanılır); karar §4-3 onaylı | Karar §4-3, E4–E6 | L | P1 | Yapılacak |
| E7-G2 | Sürekli araştırma bütçesi | 2 slot, `arastirma_payi`, sürümlü bitiş olayı; bütçe `arastirma` kolundan. | Eski `arastir` sonuçlarıyla eşdeğerlik (bütçe sınırsız); toplam ödenen = maliyet × yayılım çarpanı | E9-G5 | L | P1 | Yapılacak |
| E7-G3 | Karşılıklı dışlayan dallar | İki çift, geri dönüşsüz; "pişmanlık" riski arayüzde etiketli; v1.5 `dal_degistir`. | Dışlayan denetimi testi; aynı oyuncu iki dalı da açamaz | E7-G1 | M | P1 | Yapılacak |
| E7-G4 | Ağırlıklı yayılım | Ticaret anlaşmalı oyunculardan teknoloji yayılımı (Victoria 3 esinli). | Yayılım indirimi anlaşma ağırlığıyla orantılı; H6 ≥ %50 korunur | E7-G2, E9-G6 | M | P2 | Yapılacak |
| E7-G5 | Teknoloji ağacı ekranı | Tek ekran ağaç, dal, bedel, bütçe kaydırıcısı (3D istemci). | Tüm düğümler ve bedelleri tek ekranda; bütçe payı komut olarak gönderilir | E7-G2, E10-G1 | M | P1 | Yapılacak |
| E7-G6 | Teknoloji ölçümü | Eşdeğerlik, karar çeşitliliği, ölü düğüm kontrolü. | H2 karar çeşitliliği; H6 ≥ %50 (mevcut %66,7'nin altına düşmez); çalışma süresi ≤ × 1,1 | E7-G1…G3, E12-G1 | M | P1 | Yapılacak |

### E8 — Pazar (Faz B3)

**Spesifikasyon:** [08 §5, B3](08-alti-katman.md#5-pazar). Pazar **açıkça işaretli NPC piyasa yapıcıdır** ("Dünya Piyasa Yapıcısı"); oyuncular arası emir defteri v1.5 kapısına bırakıldı (Capital Rift'in tam oyuncu pazarı modeli az oyuncuda kırılgandır; geliştirici tanıtımına dayanan çıkarım). **Bağımlılık:** B1, B2.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E8-G1 | Liman primi ve dünya kapısı | Fiyat farkı = taşıma maliyeti; 2–4 dünya kapısı; bölgesel fiyat. | Arbitraj yok (özellik testi, 40 tohum); prim = 0 iken v0.2 birebir | E3-G4, E5-G1 | L | P0 | Yapılacak |
| E8-G2 | NPC piyasa yapıcı ve makas | Açık makas (varsayılan 200 000 ppm = eski 1,1×/0,9×), anlaşma/yaptırım makası. | Makas 200 000, prim/komisyon/tarife 0 → v0.2 birebir; arayüz etiketi "Dünya Piyasa Yapıcısı" | E8-G1 | M | P0 | Yapılacak |
| E8-G3 | Komisyon, tarife ve ihracat vergisi | `TicaretRejimi`; komisyon hazineye yazılır; komut Devlet'te. | Hazine muhasebesi testi; tarife/vergi hazine gelirine düşer | E8-G2, E9-G4 | M | P1 | Yapılacak |
| E8-G4 | Kıtlık cezası | 3 kademe eşik/ceza, toparlanma süresi; cezanın tabanı vardır. | Kademe ve toparlanma testi; kıtlık + istikrar çift sayımı kalibrasyonda ayrı ölçülür | E8-G2, E9-G2 | M | P1 | Yapılacak |
| E8-G5 | Tedarik sözleşmesi (B3.5, isteğe bağlı) | Sabit vadeli tedarik, teminat %20; çok oyunculu ister. | Sözleşme teklif/kabul/fesih komutları; teminat muhasebesi | E11-G2, E7-G1 | L | P2 | Yapılacak |
| E8-G6 | Oyuncular arası emir defteri kararı (v1.5 kapısı) | Kapı koşullarının ([08 §5.4](08-alti-katman.md#54-oyuncular-arası-emir-defteri-ne-zaman-v15-kapısı)) değerlendirilmesi; ek olarak NPC makasının kalıcılığı. | Karar notu: hangi oyuncu sayısında ve hangi hile önlemleriyle açılır | E11-G7 | M | P2 | Yapılacak |
| E8-G7 | Yerel iç pazar geliri (Ö6) | Nüfus tüketimi hazineye gelir yazar; H7 eşitlenme riski var. | Limansız bölgede nakit akışı pozitif; H7 bandı bozulmaz | E8-G2 | M | P2 | Yapılacak |
| E8-G8 | Pazar ölçümü | Eşdeğerlik, H1 (`ihracatci`), H3, H6, H5. | `ihracatci` ilk üç ≤ %60 (mevcut %68,8); H3'te en az bir gösterge ≥ %10; H6 ≥ %50; H5 ≤ %25; lavabo/gelir 0,30–0,63 | E8-G1…G4, E12-G1 | M | P1 | Yapılacak |

### E9 — Devlet (Faz B4): diğerlerini yöneten karma katman

**Spesifikasyon:** [08 §6, B4](08-alti-katman.md#6-devlet). Devlet = nüfus/toplum ihtiyaçları + politika/yasa/bütçe + askeri/diplomasi. Yasa ve bütçe kolları diğer beş katmanı yönlendirir. **Bağımlılık:** B2, B3. **Tutarsızlık:** gece planı "5 yasa" der, docs/08 **7 yasa** tanımlar (`vergi_rejimi`, `tarim_koruma`, `sanayi_tesviki`, `ticaret_rejimi`, `seferberlik`, `egitim`, `enerji_onceligi`); karar bölüm 4-4.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E9-G1 | İhtiyaç kademeleri | K1 temel (gıda), K2 konfor, K3 hizmet; nüfus modelinin Devlet modülüne taşınması. | Toplam nüfus korunumu testi; kademe karşılanma değerleri bot koşusunda çıkar | E5-G1, E8-G2 | L | P0 | Yapılacak |
| E9-G2 | İstikrar (0–1) | Kademe, vergi, savaş ve kirlilik etkisi; çarpan tabanı; koruma zemini. | `minimum_devlet` botu 30. günde istikrar ≥ %50; tek savaş üretim çarpanını etkilemez (özellik testi, 40 tohum) | E9-G1 | M | P0 | Yapılacak |
| E9-G3 | Göç | Bölgeler arası nüfus akışı (istikrar, konfor, iş ağırlıklı). | Toplam nüfus sabit; günlük tavan uygulanır | E9-G2 | M | P1 | Yapılacak |
| E9-G4 | Yasalar (bedelli) | 7 yasa, `yasa_cikar`, 72 saat bekleme (korumada yok); her yasanın bedeli vardır. | Her yasa için etki + bedel testi; bekleme ve koruma istisnası testi | E9-G2, E8-G3, Karar §4-4 | L | P1 | Yapılacak |
| E9-G5 | Bütçe kolları | Araştırma, kamu hizmeti, bakım (`butce_ayarla`); hazine 0 iken kısılma. | Bütçe toplamı tavanı aşmaz; hazine 0 testi; `bakim_duzeyi` komutu takma ad olur | E5-G2 | M | P1 | Yapılacak |
| E9-G6 | Askeri ve diplomasi bağları | İstikrar ve yasa kancaları; seferberlik → filo/ikmal; anlaşma → makas ve yayılım. | Askeri modül değişmeden yalnız kancalar; H5 yapısal testi genişletilir (stok tavanı + koruma) | E9-G4 | M | P1 | Yapılacak |
| E9-G7 | Yeni oyuncu koruması ve kayıp tavanı (D7) | Korumanın istikrarla ilişkisi; H5 %25 tavanı yapısal kalır. | H5 ≤ %25 ve `degerKaybi24s` ≤ %30 | E9-G2 | S | P1 | Yapılacak |
| E9-G8 | Yetişme mekanizmaları (C6–C9) | İnşa maliyeti indirimi, eşikte erken biten koruma, puan bandı; yalnız H6 düşerse (A7). | H6 ≥ %50 korunur ya da iyileşir | E12-G7 | M | P2 | Yapılacak |
| E9-G9 | Devlet kolları etki matrisi | Her yasa/bütçe kolunun hedef katmandaki etkisinin ayrı raporu (tarım sübvansiyonu, sanayi teşviki, tarife, araştırma, seferberlik, enerji). | Her kol için raporda ayrı satır: hedef katman göstergesi açık/kapalı farkı | E9-G4, E9-G5 | M | P1 | Yapılacak |
| E9-G10 | Devlet ölçümü | `minimum_devlet` botu ve H2/H6/H7 yeniden koşusu. | H2 ≤ %60; H6 ≥ %50; H7 bandı; çalışma süresi ≤ × 1,1 | E9-G1…G6, E12-G1 | M | P1 | Yapılacak |

### E10 — Oyuncu Etkileşimi ve Komut Arayüzü

3D istemci bugün botların oynadığı dünyayı **izler**; temel komutlar "ikinci adım" (gece planı). Hedef: çekirdeğin komut kümesinin tamamı arayüzden gönderilebilir; arayüz yalnız anlık görüntü çizer ve komut yollar (determinizm korunur; [03 §7](03-teknik-mimari.md)).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E10-G1 | Komut çubuğu ve bölge paneli (inşa) | Tesis kur/yükselt, kenar geliştir, politika düzeyinde emir, birlik üretimi; Türkçe ret mesajları. | Mevcut çekirdek komut kümesinin tamamı arayüzden gönderilir (komut-arayüz eşleme tablosu); oyuncu botsuz bir bölgeyi yönetir | E1-G1 | L | P0 | Yapılacak |
| E10-G2 | Ticaret arayüzü | İthalat/ihracat emirleri, fiyat/taban, depo doluluğu uyarısı, "Dünya Piyasa Yapıcısı" etiketi. | Emir verilir, fiyat ve makas görünür; depo %70 uyarısı | E10-G1, E8-G2 | M | P1 | Yapılacak |
| E10-G3 | Devlet arayüzü | Yasa kartları (bedelleri açık), bütçe kaydırıcıları, vergi ve tarife, istikrar ve göstergeler. | 7 yasa kartı, bedel ve bekleme süresi görünür; bütçe toplamı aşılamaz | E9-G4, E9-G5 | L | P1 | Yapılacak |
| E10-G4 | Savaş ve diplomasi komutları | Savaş ilanı (hazırlık sayacı, 24 saat pencere, %25 kayıp tavanı gösterimi), savunma duruşu, anlaşma/yaptırım. | İlan → hazırlık → pencere → çözüm akışı arayüzden izlenir | E10-G1 | L | P1 | Yapılacak |
| E10-G5 | Onboarding: ilk 10 dakika | Öğretici akış, ilk saatlerde geri bildirim (zaman kuralı 1), koruma ve "çevrimdışıyken en fazla neyi kaybedersiniz" açıklaması. | Yeni bir oyuncu ilk 10 dakikada ilk tesisini kurar ve akışı görür (5 kişilik gözlem, hedef); çevrimdışı söz metni görünür | E10-G1 | L | P0 | Yapılacak |
| E10-G6 | "Sen yokken ne oldu" özeti ve bildirimler | Olay günlüğü: iklim olayı, savaş ilanı, brownout, kıtlık, tamamlanan inşa/araştırma. | Dönüşte son 48 saatin olayları kronolojik listelenir | E10-G1, E4-G3 | M | P1 | Yapılacak |
| E10-G7 | "Ya olursa" önizleme (U7) | Planlanan kenar geliştirmesinin kapsam farkını çekirdeğin klonuyla ön hesapla. | Önizleme gerçek sonuçla aynı kapsam değerlerini verir (test) | E1-G4 | M | P2 | Yapılacak |
| E10-G8 | Şablonlar ve varsayılanlar | Mikro yönetimi azaltan şablon/varsayılanlar; yeni komutların ([08 §8-10](08-alti-katman.md#8-açık-sorular-ve-riskler)) yükünü H7 ile ölçme. | Şablonlarla ayarla-unut oranı H7 bandında | E12-G8 | M | P1 | Yapılacak |

### E11 — Çok Oyunculu Sunucu

**Model ([03 §8](03-teknik-mimari.md)):** olay kaynaklı yetkili sunucu, durum = tohum + komut günlüğü; PostgreSQL olay deposu; düz WebSocket + JSON/msgpack + Fastify/ws (Colyseus önerilmiyor); komut gelince `runUntil(now)`. Hesap/giriş ve ödeme ilk aşamada kapsam dışı. **Zamanlama kararı bekliyor (bölüm 4-8).**

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E11-G1 | Mimari karar kaydı | ADR: yetkili sunucu, taşıma, depo, ölçek sınırları, çok oyunculuda duraklatma yokluğu. | Yazılı ADR; sahip onayı | Karar §4-8 | S | P1 | Yapılacak |
| E11-G2 | Yetkili sunucu çekirdeği | Komut günlüğü `(simZamaniMs, oyuncuId, komut)`, doğrulama, `runUntil(now)`. | Günlükten yeniden oynatma → aynı `durumOzeti` (test); girdi doğrulama (ret nedenleri) | E11-G1 | XL | P1 | Yapılacak |
| E11-G3 | PostgreSQL olay deposu | Yalnızca-ekleme tablosu, sıralama kısıtı, periyodik anlık görüntü. | Yeniden başlatmada durum anlık görüntü + günlükten kurulur; özet eşit | E11-G2 | L | P1 | Yapılacak |
| E11-G4 | WebSocket protokolü ve senkron | Abonelik, anlık görüntü/delta, yeniden bağlanma. | İki istemci aynı dünyayı görür; kopma sonrası toparlanır | E11-G2, E1-G1 | XL | P1 | Yapılacak |
| E11-G5 | Katılım, bölge atama ve geç katılım | Minimum oturum kimliği, sahipsiz bölge atama, H6 mekanizmaları; bot yönetimli/uykudaki bölge politikası. | Geç katılan sahipsiz bölgeye başlar; H6 ölçümü sunucu koşusunda tekrarlanır | E11-G2, E9-G7 | L | P1 | Yapılacak |
| E11-G6 | Çevrimdışı koruma (sunucu tarafı) | Hazır emirler, kayıp tavanı, bildirim. | H5 %25 tavanı sunucuda özellik testi | E11-G2 | M | P1 | Yapılacak |
| E11-G7 | Ölçek ve yük testi | Tek kalıcı dünya, tek yazar süreç; eşzamanlı oyuncu hedefi sahiple belirlenir (bilinmiyor). | Yük test raporu: komut/sn ve gecikme | E11-G4 | L | P2 | Yapılacak |
| E11-G8 | Kötüye kullanım ve geçiş | Komut hız sınırı, çoklu hesap, bot tespiti; tek oyunculu → çok oyunculu geçiş planı. | Hız sınırı ve tavan testleri; geçiş planı yazılı | E11-G2 | M | P2 | Yapılacak |

### E12 — Denge ve Ölçüm

**Durum ([05](05-ilk-olcum-raporu.md)):** v0.1'de H5 geçti; H2 (%56,7), H3 (%46,9 ama gürültü tabanı %40–64), H6 (%66,7) belirsiz; H1 (%75) ve H7 (sınırda) kaldı. H1 düzeneği v0.2 tek tohumla %68,8 (geçti, sınırda; pencereye duyarlılık %62,5–75). Eşikler başlangıç önerisidir; **simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz.**

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E12-G0 | Ölçüm takımı ve ilk raporlar | Bot arketipleri, H1–H3/H5–H7 koşucuları, CLI; v0, v0.1 ve v0.2-düzenek raporları. | `pnpm olcum --hip H1,H2,H3,H5,H6,H7 --tohum 1-3` rapor üretir | — | XL | — | Tamamlandı |
| E12-G1 | v0.2 veri sonrası yeniden ölçüm | Ö2+Ö3 sonrası tam H paketi; yeni temel satır (gerçek harita ve B1 sonrası tekrar). | `docs/olcum/v0.3-*` (md+json); `--karsilastir v0.1` özeti; H1 düzeneği ≥ 3 tohumla | E4-G7, E3-G2 | M | P0 | Yapılacak |
| E12-G2 | H1 düzeneği sağlamlaştırma | Pencere duyarlılığı, depo tavanı 3. günde doluyor, 14–21 günlük alt ölçüm (≥ 4 bölge × 4 tohum). | 4–7. gün ve 7 günlük toplam aynı yönde; 14–21 gün ölçümü raporda | E5-G5 | M | P1 | Yapılacak |
| E12-G3 | Faz B sonu kapı raporu | `--tohum 1-10` tam paket + `gunCarpani = 12` ek koşusu ([08 §7](08-alti-katman.md#faz-b-sonunda-tam-kapı-değerlendirmesi)). | Kapı 2: H1 ≤ %70, H2 ≤ %60, H3 ≥ %10, H5 ≤ %25, H6 ≥ %50, H7 [%50, %85] | E4…E9 | L | P1 | Yapılacak |
| E12-G4 | Duyarlılık taraması ve güven aralığı | Tek-tek ya da Sobol; ardından ≥ 200 tohumlu koşular. | Sabit başına duyarlılık tablosu; ≥ 200 tohumda güven aralığı | E12-G3 | XL | P1 | Yapılacak |
| E12-G5 | H3 istatistik gücü | ≥ 10 koşul ve eşli gürültü tabanı; altı katmanla yeniden tanım. | Etki gürültü tabanından ayrışır (göreli fark) | E12-G1 | M | P1 | Yapılacak |
| E12-G6 | H4 insan testi protokolü | 5 kişi, sabit tohumdan 3 önceden bilinen cevaplı durum, 60 sn; 3D istemcide. Karar kuralı: PDF ≥ 4/5 yanıtlayamazsa vazgeç; öneri ≥ 4/5 doğru ve ≤ 60 sn (A5). | Protokol yazılı; ≥ 2 katılımcı strateji oyunu oynamaz; sonuç raporu | E1-G4, Karar §4-9 | L | P1 | Yapılacak |
| E12-G7 | H6 işletimsel tanımı ve yetişme senaryoları | A6: "yerel ekonominin ilk yarısı" = bölge başına üretim ≥ yerleşik oyuncunun medyanı; onay ve yeni katmanlarla ölçüm. | Tanım docs/02 §8.4'te sabit; H6 ≥ %50 | Karar §4-10 | S | P1 | Yapılacak |
| E12-G8 | H7: ayarla-unut "çökmesin" | 7. günde %24–115, 14. günde %29–45; temel gider muafiyeti ya da hazır ticaret emri otomasyonu kararı. | 24/48/72. saat [%50, %85]; 168. saat ≥ %50 | E5-G5, E10-G8 | M | P1 | Yapılacak |
| E12-G9 | İnsan tutma gözlemi (20–25. gün) | İlk oynanabilir sürümle küçük kohort: D1/D7/D30 ve "tekrar" gözlemi; bağımsız tutma verisi henüz yok. | Gözlem planı + ilk veri; sonuç hipotez olarak sunulur | E10-G1, E10-G5 | L | P1 | Yapılacak |
| E12-G10 | Altı katman için yeni hipotezler | Kirlilik/brownout, iklim olayı, yasa ve bütçe kararlarının tekrar kırması için ölçülebilir hipotez ve eşikler (eşikler tahmin). | H8+ tanımları 02 §8.4'e eklenir ve sahibe onaya sunulur | E12-G3 | M | P2 | Yapılacak |

### E13 — Gerçekçilik İçerikleri (açık veri lisanslarıyla)

İlke (K22): CC BY/CC0/kamu malı kaynaklar atıfla; FAOSTAT, WorldClim, GADM, UN Comtrade ve izinsiz PortWatch kullanılmaz; OSM türevi ayrı ODbL dosyasında.

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E13-G1 | İklim olayı kataloğu | Bölge iklim tipine göre olay olasılıkları (`tipOlasilikCarpaniPpm`), CHELSA (CC0) ile kalibrasyon, Türkçe olay metinleri. | Her iklim tipi × olay türü çifti kaynağıyla yazılı; olay metinleri Türkçe | E4-G3, E3-G3 | M | P1 | Yapılacak |
| E13-G2 | Gerçek damar ve saha doğrulaması | Kömür/petrol/tahıl rezervlerine kaynak: GAEZ, GEM, USGS Commodity Summaries; USGS MRDS doğrulaması genişler; miktarlar tasarım ölçeği olarak kalır. | "Genel bilgi" satırlarının kaynaklı olanı/tasarım değeri etiketi tabloda ayrılır | E3-G1 | L | P1 | Yapılacak |
| E13-G3 | Gerçek limanlar ve boğazlar | Liman adı, sınıf, derinlik (WPI ya da Natural Earth); İstanbul ve Çanakkale boğazları için kamuya açık kapasite bilgisi. | Her liman bölgesinde kaynaklı sınıf; boğaz kenarı belgeli | E3-G4 | M | P1 | Yapılacak |
| E13-G4 | Gerçek üretim tesisleri | GEM demir-çelik, kömür madeni ve santral izleyicileri (CC BY), WRI GPPD (CC BY): bölge başına kapasite, başlangıç tesisleri. | Bölge başına kapasite toplamı; atıf DATA_SOURCES ve oyun içinde | E3-G1, E5-G6 | L | P1 | Yapılacak |
| E13-G5 | Ürün takvimi ve hayvancılık çeşitliliği | MIRCA-OS ekim/hasat ayları (lisans doğrulanmadı); ürün çeşitliliği. | Lisans doğrulanır; yoksa CHELSA/GAEZ türevi | E4-G2, E15-G5 | M | P2 | Yapılacak |
| E13-G6 | Hidro, rüzgâr ve güneş profilleri | 12 aylık akarsu eğrisi, dalgalı elektrik profilleri. | Profiller `hidro.akarsuEgrisiPpm` ve `ruzgar_gunes` yönteminde kullanılır | E5-G1 | M | P2 | Yapılacak |
| E13-G7 | Ticaret ve sektör ağırlıkları | BACI (Etalab, atıf) mal bazlı ticaret ağırlığı; WDI (lisans doğrulanınca) sektör payı. | Pazar taban/ağırlıkları kaynaklı; lisans doğrulanmış | E8-G2 | M | P2 | Yapılacak |
| E13-G8 | İçerik şablon sistemi | K14: yeni olay/tesis/yasa yalnız veriyle eklenir; zod doğrulayıcısı. | Yeni bir olay türü yalnız JSON ile eklenir (test) | E4-G3, E9-G4 | M | P2 | Yapılacak |

### E14 — Performans ve Mobil

**Bütçeler ([3d-teknoloji](arastirma/3d-teknoloji.md) §5, hepsi hedef; hiçbir yığın için yayımlanmış mobil fps ölçümü bulunamadı):** Katman A ilk JS < 400 KB gzip, masaüstü 60 fps, orta mobil 30 fps, < 40 çizim çağrısı; gezen kamera < 100; Katman B ilk JS < 2 MB gzip. Sim hedefi: 30 günlük koşu < 1 sn ([03](03-teknik-mimari.md), ölçülmedi).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E14-G1 | Performans ölçüm donanımı | Playwright: fps, çizim çağrısı, üçgen, CPU ms; masaüstü 1440×900 ve mobil 390×844, açık/koyu ekran görüntüsü. | Ölçüm betiği tek komutla rapor üretir; raporlar `docs/olcum/` altında | E1-G1 | S | P0 | Devam ediyor (gece) |
| E14-G2 | Bütçelerin sabitlenmesi | Hedef tablo + gerçek ilk JS gzip ölçümü (şu an yalnız 1,05 MB ham tek HTML). | Ölçülmüş gzip boyutu ve bütçe tablosu; aşım durumunda epik önceliği güncellenir | E14-G1 | S | P0 | Yapılacak |
| E14-G3 | Gerçek cihaz testi | Düşük/orta Android, iOS Safari: fps, ısınma, pil, bellek. | ≥ 3 cihaz sınıfında ölçülmüş fps tablosu | E14-G1 | M | P1 | Yapılacak |
| E14-G4 | Simülasyon ölçek testi | 53 → 150–300 bölgede çözüm süresi, bellek; worker içi. | 30 günlük koşu süresi ve çözüm süresi raporlanır; hedef < 1 sn aşılırsa önlem listesi | E3-G8 | M | P1 | Yapılacak |
| E14-G5 | Kalite kademeleri | Piksel oranı, atmosfer/gölge kapatma, örnek tavanı, `prefers-reduced-motion`; otomatik düşürme. | Düşük kademede ölçülen fps artar; kullanıcı kademeyi elle seçebilir | E14-G3 | M | P1 | Yapılacak |
| E14-G6 | Bellek ve pil | GPU bellek bütçesi, karo önbellek tavanı, arka plan sekmesinde duraklatma. | Arka plan sekmesinde CPU ≈ 0; 30 dakikalık koşuda bellek büyümesi sınırlı | E14-G1 | M | P1 | Yapılacak |
| E14-G7 | Mobil arayüz | Dokunmatik kamera, alt panel düzeni, küçük ekranda okunurluk. | 390×844'te tüm komutlar erişilebilir; yatay kaydırma yok | E10-G1 | M | P1 | Yapılacak |
| E14-G8 | Tembel yükleme ve WebGPU (isteğe bağlı) | Kod bölme, dünya seti ve karo önbelleği; özellik algılamalı WebGPU parçacıkları. | İlk JS bütçesi korunur; WebGPU yoksa WebGL2 yoluna düşer | E3-G7 | M | P2 | Yapılacak |

### E15 — Hukuk, Lisans ve Sınır Politikası

Not: aşağıdakiler hukuki tavsiye değildir; yayın öncesi avukat incelemesi önerilir ([araştırma §4](arastirma/acik-kaynak-ve-veri.md)).

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E15-G1 | Sınır ve isim politikasının onayı (A2) | Taslak DATA_SOURCES §6: kurgusal 4 devlet/2 blok, nötr bölge adları, Kırım-Herson-Mykolayiv-Kıbrıs-Kosova vb. dışarıda, güncel çatışma senaryosu yok; yeni dilimler için kontrol listesi. | Sahip onayı docs/00'a işlenir; hiçbir devlet/blok/bölge adında ülke ya da ittifak adı yok (test) | — | S | P0 | Devam ediyor (gece) |
| E15-G2 | Atıf envanteri ve "Hakkında" ekranı | DATA_SOURCES'ten `CREDITS`/oyun içi atıf ekranı; Natural Earth, USGS, GAEZ, CHELSA, GEM, WorldPop vb. | Her kullanılan veri kaynağının lisansı ve atıf metni ekranda | E3-G1 | M | P1 | Yapılacak |
| E15-G3 | ODbL kararı (Katman B verisi) | OSM/Overture/Protomaps altlığı (ODbL, Toplu Veri Tabanı Kılavuzu ile ayrı dosya) mı, Natural Earth + prosedürel bina mı? Gece planı "v1'de OSM türevi yok" dedi. | Yazılı karar notu; E2 kapsamı buna göre netleşir | Karar §4-6 | S | P1 | Yapılacak |
| E15-G4 | Hukuki inceleme (A13) | ODbL, atıf sayfası, hedef pazarlarda harita kuralları, GPL/AGPL temiz oda, isim/marka. | Dış incelemeden yazılı görüş; yayın öncesi kapı | E15-G2, E15-G3 | M | P1 | Yapılacak |
| E15-G5 | Bağımlılık ve veri lisans taraması | CI'da paket lisans listesi; "doğrulanmadı" maddeleri (MIRCA-OS, WDI, GLO-90/SRTM, PortWatch izni). | Lisans raporu CI'da; doğrulanmamış kaynak kullanılmaz | E17-G6 | S | P1 | Yapılacak |
| E15-G6 | GPL/AGPL temiz oda kuralı | OpenFrontIO, OpenTTD, Symphony of Empires, Mindustry vb. yalnız tasarım referansı; algoritma yayımlanmış tarifeden yazılır. | Katkı kuralı CONTRIBUTING benzeri belgede; kod incelemesi maddesi | — | S | P1 | Yapılacak |
| E15-G7 | Ürün adı ve Capital Rift ilişkisi | "Capital Rift'in kendi versiyonu" başlangıç fikri; ad, görsel dil ve varlıkların özgün olduğunun teyidi. | Ürün adı/marka kontrolü yapılmış; özgün varlık listesi | Karar §4-14 | S | P1 | Yapılacak |

### E16 — Gelir Modeli İlkeleri (prototip dışı)

İlke (K13, README): kritik kararlarda parayla güç yok; günlük giriş ödülü yok; kolaylık ve kozmetik satılabilir, zaman atlama ve kapasite satılmaz. Capital Rift'in para kazanma yöntemi bulunamadı. **Bu epik prototip kapsamına girmez.**

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E16-G1 | İlke belgesi | Satılabilir/satılamaz listesi, angarya ödülü yasağı, çevrimdışı söz. | Sahip onaylı tek sayfa | Karar §4-7 | S | P2 | Yapılacak |
| E16-G2 | Seçenek analizi | Kozmetik, bölge teması, destekçi paketi, tek seferlik satın alma; hesap/ödeme önkoşulları. | Seçenekler, riskler ve ödeme/hesap önkoşul listesi (tahmin maliyetlerle) | E16-G1 | M | P2 | Yapılacak |
| E16-G3 | Pay-to-win testi | Her ücretli öğe için bot ölçümü: ücretli/ücretsiz skor farkı. | Ücretli öğenin üretim/skor farkı anlamlı eşiğin altında | E12-G4, E16-G2 | S | P2 | Yapılacak |

### E17 — Pürüzler, Teknik Borç ve Belge Bakımı

| ID | Başlık | Açıklama | Kabul ölçütü | Bağ. | Boyut | Ö. | Durum |
|---|---|---|---|---|---|---|---|
| E17-G0 | Pürüzler v0.2.1 (A1) | Mühimmat pazarı, fiyata/depoya duyarlı bot ticareti, reddedilmeyen savaş ilanları, güncel ölçüm tanımları. | Mühimmat fiyatı 0,55× → ≈ 1,0×; yakıt israfı 65–84 bin → 0; ret edilen ilan 11–18 → 0 (commit `cdbd0f0`) | — | M | — | Tamamlandı |
| E17-G1 | Gece işlerinin commit'i ve `pnpm kontrol` | Commit'siz: `packages/veri-hatti`, `packages/istemci`, `gercek-karadeniz*.json`, `DATA_SOURCES.md`, `docs/09`, `docs/10`, `package.json`/lock değişiklikleri. | `pnpm kontrol` yeşil; commit'ler konu başına ayrık | E1-G1, E3-G1, E4-G1 | S | P0 | Devam ediyor (gece) |
| E17-G2 | Belge tutarlılığı | docs/06 başlığı "(v0.1)" güncel değil; docs/00 §4 tablosu 6 düğümlü, docs/08 17 düğümlü; 5 yasa / 7 yasa; README paket tablosu yeni paketleri içermiyor. | Çelişkiler tek kaynağa bağlanmış; README paket tablosu güncel | Karar §4-3, §4-4 | S | P1 | Yapılacak |
| E17-G3 | Elektronik israfı (bilinen sınır) | Limansız üretici bölgede kenar kapasitesi bağlayıcı, ihracat emri yalnız limanda; elektronik emilimi (120) dar ([06 §10.6](06-simulasyon-spesifikasyonu.md)). | Elektronik israfı 42/20/27 bin (tohum 1–3) düşer; aday çözümlerden biri ölçülmüş | E8-G1 | M | P1 | Yapılacak |
| E17-G4 | Depo tavanı ve H1 penceresi | Depo tavanı 3. günde doluyor; 4–7. gün penceresi ihracat yeteneğini ödüllendiriyor; militarist 7 günden önce savaş açmıyor. | Depo/ölçek ayarı kararı; H1 ölçümünde savaş etkisi raporda ayrı | E12-G2 | S | P1 | Yapılacak |
| E17-G5 | Faz B onaylı kuralların 06'ya taşınması | docs/08 "tasarım önerisi"dir; onaylanan kurallar 06'ya taşınır (çelişkide 06 kazanır). | Her B adımı sonrası 06 güncellenir | E4-G7 | M | P1 | Yapılacak |
| E17-G6 | CI ve determinizm | GitHub Actions'ta `pnpm kontrol`; 400 günlük determinizm; Node sürüm matrisi (öneri, [03 §9](03-teknik-mimari.md)). | CI yeşil; farklı Node sürümlerinde aynı `durumOzeti` | — | M | P1 | Yapılacak |
| E17-G7 | Yerleşik test sayısının izlenmesi | Gece planı 378 test yeşil diyor; tarayıcı ve veri hattı testleri dahil güncel sayım. | Sayı raporda güncel | E17-G1 | S | P2 | Yapılacak |

---

## 4. Sahibin kararını bekleyen konular

| # | Konu | Seçenekler | Önerim (gerekçe) | Etkilenen | Kaynak |
|---|---|---|---|---|---|
| 1 | **Sınır ve isim politikası (A2)** | (a) Taslağı onayla: kurgusal devletler, nötr bölge adları, ihtilaflı alanlar dilim dışı; (b) gerçek ülke adları | **(a).** Balkan/Karadeniz diliminde ihtilaflı bölgeler var; kurgusal devlet + bölge yönetimi hem hassasiyeti hem hukuki riski azaltır. Sahibin "gerçek dünya" beklentisi **coğrafya** ile karşılanır, **siyaset** kurgusaldır | E3, E15 | [00 A2](00-vizyon-ve-kararlar.md), DATA_SOURCES §6 |
| 2 | **Gerçek dilimin genişletilmesi (A1)** | (a) Önce Karadeniz diliminde H4 + ilk insan testi, sonra ikinci dilim; (b) hemen çok dilim/dünya | **(a).** Sim ölçeği ve H1/H2 yeniden ölçümü tek dilimde bile açık; dünya görseli (E3-G7) ise oyun bölgesinden bağımsız hemen yapılabilir. İkinci dilim adayını siz seçin | E3-G8, E14-G4 | [00 A1](00-vizyon-ve-kararlar.md) |
| 3 | **Teknoloji düğüm sayısı (A11)** | PDF 5–8 · öneri ≈ 17 (2–4/katman, derinlik ≤ 4, iki dışlayan çift) | **≈ 17.** Katman başına yinelenen karar için gerekli; ağaç tek ekranda sığ kalır. Ara yol: önce ≈ 11, B6'da 17 | E7, E17-G2 | [00 §4](00-vizyon-ve-kararlar.md), [08 §4](08-alti-katman.md#4-teknoloji) |
| 4 | **6. katmanın (Devlet) kapsamı ve yasa sayısı** | 5 yasa (gece planı) · 7 yasa (docs/08); 3 bütçe kolu; yasa oyuncu düzeyinde | **7 yasa, 3 kol.** "Diğerlerini yöneten" beklentiniz için her katmana en az bir kol gerekir (tarım sübvansiyonu, sanayi teşviki, tarife, araştırma bütçesi, seferberlik, enerji). Sayıyı 5'e düşürmek enerji ve eğitimi dışarıda bırakır | E9, E10-G3 | [08 §6](08-alti-katman.md#6-devlet) |
| 5 | **"Dolaşma" = kamera mı, avatar mı?** | (a) serbest uçuş kamerası; (b) 3D avatar (Capital Rift'te 3D karakterler geçer; tek kaynak) | **(a) önce.** K1 gereği oyuncu yöneticidir; avatar ek içerik/ağ yükü getirir. Avatarı kapı 3 sonrası yeniden tartışın | E1-G3, E2-G7, E14 | [arastirma/3d-teknoloji §4](arastirma/3d-teknoloji.md) |
| 6 | **Yakın plan veri lisansı (ODbL)** | (a) OSM/Overture/Protomaps altlığı + ayrı ODbL dosyası; (b) yalnız Natural Earth + prosedürel bina | **(b) ile başlayıp (a) için hukuki görüş alın.** Gece planı v1'de OSM türevi istemedi; Capital Rift benzeri bina/sokak hissi ise (a) ister | E2, E15-G3 | [araştırma §4](arastirma/acik-kaynak-ve-veri.md) |
| 7 | **Gelir modeli (A4)** | İlkeyi kilitle, modeli sonraya bırak · şimdi seç | **İlke kilitli (pay-to-win yok), model Kapı 3 sonrasına.** Capital Rift'in gelir yöntemi bilinmiyor; prototipte ödeme yok | E16 | [00 A4](00-vizyon-ve-kararlar.md) |
| 8 | **Çok oyunculu sunucu zamanlaması (A8)** | (a) Kapı 2 sonrası paralel başla; (b) H4 insan testinden sonra | **(a) sınırlı:** ADR ve yetkili sunucu çekirdeği (E11-G1/G2) sprint 2–3'te; istemci senkronu (E11-G4) H4'ten sonra. Determinizm zaten hazır, risk düşük; ama tek yazar çekirdek darboğazı var | E11 | [00 A8](00-vizyon-ve-kararlar.md), [03 §8](03-teknik-mimari.md) |
| 9 | **H4 eşiği (A5)** | PDF: ≥ 4/5 yanıtlayamazsa vazgeç · öneri: ≥ 4/5 doğru ve ≤ 60 sn | **Öneri.** PDF ölçütü 5 kişiden 2'si yanıtlasa da geçer; n = 5 kanıt değil, problem bulucudur | E12-G6 | [04 §5](04-yol-haritasi.md) |
| 10 | **H6 tanımı ve yetişme (A6, A7)** | Tanımı onayla; C6–C9'u yalnız H6 düşerse ekle | **Onayla, koşullu tut.** H6 şu an %66,7 (v0.1) | E12-G7, E9-G8 | [00 A6–A7](00-vizyon-ve-kararlar.md) |
| 11 | **Eşik disiplini** | Eşik değişikliği gerekçeli ve sahip/lider onaylı · serbest | **Gerekçeli + lider onaylı** (hedef kaydırmayı önler) | E12 | [04 §3](04-yol-haritasi.md) |
| 12 | **Sahipsiz/boş bölgeler** | Uykuda (üretmez) · bot yönetimli canlı dünya | **Uykuda kalsın (v0.1 kararı, geç katılanı korur);** "canlı dünya" hissi için sonra bot yönetimi değerlendirilsin | E11-G5, E9 | [05 §2](05-ilk-olcum-raporu.md) |
| 13 | **Hukuki inceleme (A13)** | Yayından önce dış görüş · iç değerlendirme | **Dış görüş**, ODbL ve harita kuralları için; bütçe ve zaman sahibe ait | E15-G4 | [00/04 A13](04-yol-haritasi.md) |
| 14 | **Ürün adı ve Capital Rift ilişkisi** | Özgün ürün kimliği · "Capital Rift'in versiyonu" çağrışımı | **Özgün kimlik;** ilham alınan tek şey görünür ağ hissi | E15-G7 | [01](01-rakip-ve-pazar-arastirmasi.md) |
| 15 | **Platform önceliği ve dil** | Masaüstü öncelikli + orta mobil hedefi · mobil birincil; yalnız Türkçe · İngilizce de | **Masaüstü öncelikli, mobil 30 fps hedefi; Türkçe başlangıç, metinler i18n'e hazır** (K11 Türkçe der) | E14, E1-G8 | [00 K11](00-vizyon-ve-kararlar.md) |

Kapanmış kararlar (bilgi): kalıcı dünya ve "sezon" sözcüğünün yasağı (K10, K21); 3D = stilize küre + yakın plan (K17); ilk dilim Türkiye + Balkanlar + Karadeniz (K18); altı katman ve iklim takvimi (K19, K20); GPL/AGPL kod kopyalanmaz (K22).

---

## 5. Önerilen ilk sprint (1–2 hafta)

**Mantık:** önce gece işini sağlam zemine oturt ve veriyi bloke eden kararı kapat; sonra 3D küreyi oynanabilir ve ölçülebilir yap; paralelde çekirdek tek yazarla Faz B'ye devam et. Çekirdek tek yazar olduğundan B1→B2 sıralı, geri kalan işler paralel 3–4 ajanla gider (gece planı).

| # | Görev(ler) | Gerekçe | Boyut |
|---|---|---|---|
| 1 | **E17-G1** gece işlerinin commit'i + `pnpm kontrol` | Tüm sonraki iş commit'siz yarım işe dayanıyor; kayıp riski | S |
| 2 | **E15-G1** sınır/isim politikası onayı, **E15-G3** ODbL kararı | Veri yayınını ve Katman B kapsamını bloke eden iki karar; ikisi de S | S |
| 3 | **E3-G1** bitiş + **E3-G2** gerçek haritada sim/ölçüm | "Gerçek harita simülasyonda çalışıyor mu" riskini erken kapatır; 3D ve ölçümün ortak zemini | M |
| 4 | **E14-G1 + E14-G2** ölçüm donanımı ve gzip bütçesi | Bugünkü 1,05 MB ham tek HTML'in gzip/fps değerleri bilinmiyor; 3D kararlarının kanıtı | S |
| 5 | **E1-G1, G2, G3** küre MVP, gerçek dilim, gezen kamera (bitir ve yayınla) | Sahibin ana beklentisi: dolaşılabilir 3D; gece işinin kapatılması | M–L |
| 6 | **E4-G1…G3 + E4-G7** B1 Tarım'ı bitir ve ölç | Sonraki tüm katmanlar iklim altyapısına bağlı; H2 ve regresyon kalkanı | M–L |
| 7 | **E12-G1** v0.2 veri + gerçek harita sonrası yeniden ölçüm (≥ 3 tohum) | H1 sonucu şu an tek tohum ve "sağlam değil"; yeni temel satır gerekli | M |
| 8 | **E1-G4** 3D kapsam görünümü | H4 (Kapı 3) insan testinin önkoşulu; lojistik derinliğin görünür kanıtı | L |
| 9 | **E10-G1** komut çubuğu (inşa, ticaret) | Oyun "izleme"den "oynama"ya ancak bununla geçer | L |
| 10 | **E5-G1 + E5-G5** B2 başlangıcı: elektrik/brownout ve damar tükenmesi | Damar tükenmesi 20–25. gün tekrarını kırması beklenen ana mekanizma ([07 Ö7](07-tasarim-onerileri.md)); B1 bitince başlar | L |
| 11 | **E2-G1** Katman B teknik doğrulama (spike) | Yalnız E15-G3 kararı çıkarsa; Capital Rift benzeri yakın plan riskini (MapLibre küre özel katman) erkenden sınar | M |

**Sprint sonu beklenen çıktı:** yayınlanmış, gerçek haritalı, dolaşılabilir 3D küre; ölçülmüş performans bütçesi; B1 tamam ve ölçülmüş; yeni H temel satırı; iki kapanmış karar. **Sprint 2 adayları:** E8-G1/G2 (Pazar), E9-G1/G2 (Devlet), E10-G5 (onboarding), E11-G1 (ADR).

---

## 6. Riskler

Olasılık/etki değerlendirmeleri takım değerlendirmesidir (**tahmin**); ölçülmüş değil.

| # | Risk | Olasılık | Etki | Önlem |
|---|---|---|---|---|
| R1 | **20–25. gün sıkılması yalnız gözlem;** bağımsız tutma verisi yok, altı katmanın çare olduğu hipotezdir | Orta | Yüksek | H2 ölçümü + damar tükenmesi (E5-G5); ilk insan gözlemi (E12-G9); "kanıtlandı" denmez |
| R2 | **Sınır/isim hassasiyeti** (ihtilaflı alanlar, gerçek haritada) | Orta | Yüksek | E15-G1 onayı; kurgusal devletler; yeni dilimde kontrol listesi |
| R3 | **ODbL/OSM lisans bulaşması** (Katman B, bina ve PMTiles) | Orta | Yüksek | E15-G3 kararı; ayrı ODbL dosyası; dış hukuki görüş (E15-G4) |
| R4 | **Mobil performans kanıtsız;** yayımlanmış mobil fps yok, küre modunda özel katmanlar yeni | Yüksek | Orta–Yüksek | E14-G1…G3 erken ölçüm; kalite kademeleri; Katman B isteğe bağlı kalır |
| R5 | **Kapı 2 geçilmedi;** H1 sınırda, H2/H3/H6 belirsiz, H7 sınırda; üstüne altı katman eklemek ölçümü bulandırır | Yüksek | Yüksek | Her B adımında regresyon kalkanı (kapalıyken v0.2 birebir); E12-G1/G3; tek değişken eşli ölçüm |
| R6 | **Çekirdek tek yazar darboğazı;** Faz B sıralı, sözleşme değişiklikleri tek kişide | Yüksek | Orta | UI/veri/3D işleri paralel; sözleşme bloklarının önceden hazır olması (08 §7) |
| R7 | **Kapsam kayması:** 3D + altı katman + gerçek veri + çok oyunculu aynı anda | Yüksek | Yüksek | Kapı sırası kanıt sırasıdır; WIP limiti; bu liste P0/P1/P2; çok oyunculu zamanlaması kararı |
| R8 | **Sayılar kalibre değil;** toplam ceza tabanı, kıtlık + istikrar çift sayımı, mikro yönetim birikimi (11 yeni komut) | Yüksek | Orta | Her adımda bot ölçümü; şablon ve varsayılanlar (E10-G8); H7 ölçümü |
| R9 | **Gerçek veri kalitesi:** rezervler elle/genel bilgi, MRDS eski ve kaba konumlu, NGA WPI erişimi 403, bazı lisanslar "doğrulanmadı" | Orta | Orta | Kaynak etiketleme (E13-G2); "tasarım dengesi" notu açık; E15-G5 lisans taraması |
| R10 | **Rakip bilgisi tek kaynaklı** (Capital Rift: geliştirici TikTok özeti; hesap adı tutarsız; 3D yığını belgesiz) | Yüksek | Düşük–Orta | Çıkarımlar "yön göstergesi" sayılır; ürün kararı rakip iddiasına bağlanmaz |
| R11 | **Çok oyunculuda düşük nüfus:** pazar çökmesi, geç katılan, boş dünya hissi | Orta | Yüksek | NPC piyasa yapıcı (E8-G2); H6 ve yetişme (E9-G8); bot yönetimli bölge kararı (bölüm 4-12) |
| R12 | **Determinizm kaybı** (tarayıcı/Node farkı, yasak API sızması) | Düşük | Yüksek | ESLint yasakları; "aynı tohum → aynı özet" CI; Node matrisi (E17-G6) |
| R13 | **GPL/AGPL bulaşması** (OpenFrontIO, OpenTTD vb.) | Düşük | Yüksek | K22; E15-G6 temiz oda kuralı |
| R14 | **Marka/özgünlük** ("Capital Rift'in kendi versiyonu" çağrışımı) | Düşük–Orta | Orta | E15-G7; özgün ad ve varlıklar |
| R15 | **Gelir modeli yok;** prototip sonrası sürdürülebilirlik belirsiz | Orta | Orta (uzun vade) | İlke kilitli; E16 prototip dışı; Kapı 3 sonrası seçenek analizi |

---

*Bu liste gece boyunca değişir; sabah takım lideri "Devam ediyor (gece)" satırlarını commit geçmişine göre günceller. Kaynaklar: [README](../README.md), docs/00–08, [araştırma raporları](arastirma/), [ölçüm raporları](olcum/), DATA_SOURCES.md, gece planı.*
