# 11 — Ürün Dönüşü: Paylaşılan Parsel Dünyası (ADR-001)

> **Özet.** Bu belge bir **Mimari Karar Kaydı**dır (ADR). 1 Ekim 2026'da sahip, oyunun yönünü değiştirdi. Oyuncu artık bir bölgenin ya da devletin yöneticisi olarak başlamıyor. **Baştan paylaşılan, kalıcı ve hesaplı bir gerçek dünyada** bir ilçeden **arsa** alarak başlıyor. Bu arsaya yapı **inşa ediyor**, üretip satıyor ve isterse 3D karakterle gerçek sokaklarda **yürüyor**. Kürede sürekli akan çizgi ağı kalkıyor. Lojistik otomatik çalışıyor ve arka planda kalıyor. Altı katman sürüyor. Mevcut deterministik çekirdek atılmıyor: 53 bölge, lojistik ve pazar için **merkez düğüm** oluyor. Her oyuncunun bir ildeki varlığı bir **işletme düğümü** olarak çekirdeğe ekleniyor. İlk hedef **Alfa-0**: Kocaeli, Sakarya ve Bursa'da, en çok 200 davetliyle çevrimiçi kapalı alfa. Döngüsü şu: arsa al → inşa et → üret → sat. Yürüyüş, seçimli yönetişim ve hafif askeri katman **Alfa-1**'de geliyor.

| Alan | Değer |
|---|---|
| **Durum** | Kabul edildi (1 Ekim 2026) |
| **Karar verenler** | Sahip (Mert): yön kararları · Takım lideri: uygulama kararları (değiştirilebilir) |
| **Yerine geçtiği** | [00](00-vizyon-ve-kararlar.md) K1, K6, K10, K12, K17, K18 ve K19'un ilgili kısımları (yeni kararlar K23–K35) · [04](04-yol-haritasi.md) §8 sıralaması · [10](10-gorev-listesi.md) E2 ve E11 |
| **Bozmadığı** | Determinizm ilkesi, altı katman (K19), iklim takvimi (K20), "sezon yok" (K5, K21), pay-to-win yok (K13), lisans ilkesi (K22; OSM kısmı K24 ile genişler), [06](06-simulasyon-spesifikasyonu.md) kuralları (bölge kipi) |

**Kaynak kısaltmaları.** **[Sahip]** = sahibin 1 Ekim yön kararları (bağlayıcı). **[Lider]** = takım liderinin onaylı plandaki kararları (değiştirilebilir). **[Ar-Ge]** = araştırma raporlarından gelen öneri. Henüz karar değildir; sayılar başlangıç değeridir, kalibre edilmemiştir. **(tahmin)**, **(hedef)** ve **(doğrulanmadı)** etiketleri ölçülmemiş bilgiyi gösterir.

**Dayanak araştırmalar:** [arayüz ve UX](arastirma/arayuz-ux.md) · [oyun tasarımı: parsel dünyası](arastirma/oyun-tasarimi-parsel.md) · [sokak seviyesi 3D](arastirma/sokak-seviyesi-3d.md) · [paylaşılan dünya mimarisi](arastirma/paylasilan-dunya-mimarisi.md). Kod geçiş keşfi ve yol haritası planı bu belgeye işlenmiştir (§4.3, §5).

---

## 1. Bağlam

### 1.1 Sahibin istekleri (1 Ekim) [Sahip]

| # | İstek | Bu belgedeki karşılığı |
|---|---|---|
| 1 | **Görsel:** kürede sürekli akan çizgi ve parçacık ağı kalksın; göz yoruyor | F0 sakin görsel (§5), mercek ve rozet sistemi (§9) |
| 2 | **Harita derinliği:** bölge → il → ilçe (→ arsa) | L0–L4 görünüm düzeyleri (§9.1), OSM hiyerarşisi (F2) |
| 3 | **İnşa:** oyuncu araziye bina, tesis, ordugâh gibi yapılar kursun; inşanın bir süreci olsun | 18 yapı, 4 aşamalı inşa (§7.3) |
| 4 | **Dolaşma:** Capital Rift'teki gibi basit bir 3D karakterle gerçek sokakta ve arazide gezilebilsin (az ayrıntı yeterli) | Yürüyüş modu (F5, §9) |
| 5 | **Başlangıç:** devlet seçimi olmasın; oyuncu bir ilçede arsa alarak başlasın | Giriş / Yerleş ekranı, yeni oyuncu paketi (§7.9) |
| 6 | **Veri:** OpenStreetMap (ODbL) kabul | OSM il/ilçe ve karolar (F2), ODbL uyumu (§11) |
| 7 | **Dünya:** baştan paylaşılan dünya (sunucu, hesap) | F1 sunucu temeli, F7 alfa (§5) |
| 8 | **Lojistik:** "Lojistiği ön planda tutmaya gerek yok"; otomatik ve arka planda | Merkez MCF, il içi havuz, görünmeyen lojistik (§4.3) |
| 9 | **Katmanlar:** 6 katman sürsün: Tarım, Sanayi, Lojistik (arka plan), Teknoloji, Pazar, Devlet (yönetici) | §4, §7 |
| 10 | **Planlama** takım liderine bırakıldı; uygulayıcı ajanlar | §5, §13; [10](10-gorev-listesi.md) |

### 1.2 Mevcut temel (`claude/brave-hawking-flv1y0`, ~940 test yeşil)

- Deterministik tamsayı çekirdek: olay kuyruğu, tembel stok, sfc32 PRNG, `durumOzeti`.
- Tarım v1, Sanayi v1 ve Pazar v1, hepsi **bölge düzeyinde**.
- 53 gerçek bölgeli Karadeniz verisi (Natural Earth admin-1 birleşimleri, 143 kenar).
- three.js küre istemcisi: worker komut protokolü, 20 komut formu, ölçüm takımı (H1–H7).

### 1.3 Sorun

Bugünkü model oyuncuya bir veya birkaç **bölgenin tamamını** verir. Sahibin istediği oyunun atomu ise **bir ilçedeki arsa** ve **o arsadaki yapı**. Dünya da baştan **çok oyunculu** olacak. Çekirdekte sunucu için gereken iki parça eksik: serileştirici ve anlık görüntüden devam. Sahiplik de bölgeye bağlı (`BolgeDurumu.sahip`). Akış görselleri ise sahibin "göz yoruyor" dediği şey.

---

## 2. Karar

| # | Karar | Kaynak | Kayıt |
|---|---|---|---|
| 1 | **Paylaşılan kalıcı dünya baştan.** Tek yazar Node + `ws` sunucusu, Postgres komut günlüğü ve anlık görüntü. Zaman damgasını sunucu basar; hesaplar Better Auth ile | [Sahip] + [Lider] | K23 |
| 2 | **OpenStreetMap (ODbL)** kullanılır: il/ilçe sınırları, karolar, hücre uygunluğu. OSM türevi veri ayrı klasörde tutulur | [Sahip] | K24 |
| 3 | **Başlangıç:** devlet seçimi yok; oyuncu bir ilçede **arsa** alarak başlar. Roller seçilmez; inşa edilen yapılardan ve tutulan makamdan doğar | [Sahip] | K25 |
| 4 | **Harita derinliği:** bölge → il → ilçe → arsa (→ sokak). Küre L0 kalır, L1–L3 MapLibre, L4 ayrı three.js yürüyüş sahnesi | [Sahip] + [Ar-Ge] | K26 |
| 5 | **İnşa:** yapılar hücrelere yerleştirilir; 4 aşamalı inşa süreci (Temel, İskele, Gövde, Tamam), 2–12 saat | [Sahip] | K27 |
| 6 | **Yürüyüş:** 3D karakterle gerçek sokakta ve arazide gezinme, az ayrıntılı; Alfa-1'de açılır, paralel geliştirilir | [Sahip] + [Lider] | K28 |
| 7 | **Sakin görsel ve arka plan lojistik:** sürekli akan çizgi ve parçacık ağı kalkar. Lojistik otomatiktir ve görünmez; rota yalnız seçili yapı için durağan noktalı çizgi olarak görünür. 6 katman sürer | [Sahip] | K29 |
| 8 | **Arsa atomu:** z20 kare hücre (~30 m). 1 hücre = 1 yapı yuvası; yapılar 1–3 hücre kaplar | [Lider] | K30 |
| 9 | **Coğrafya:** 53 bölge lojistik ve pazar **merkez düğümü** olarak kalır; her il tam olarak bir bölgeye eşlenir | [Lider] | K31 |
| 10 | **Alfa-0 kapsamı:** Kocaeli + Sakarya + Bursa (~40 ilçe, ≤200 davetli). Askeri, seçimler ve yürüyüş Alfa-1'e kalır (Alfa-0'da NPC vali varsayılan yasalarla). Balkanlar Alfa-1'de | [Lider] | K32 |
| 11 | **Adlar:** gerçek il ve ilçe adları kullanılır; ülke düzeyi NPC çerçevedir; ihtilaflı alanlar dilim dışında kalır | [Lider] | K33 |
| 12 | **Altyapı:** Hetzner + Postgres + Cloudflare (proxy, Turnstile, R2). Açık alfadan önce ODbL için dış hukuki görüş alınır | [Lider] | K34 |
| 13 | **Ekip:** takım lideri + uygulayıcı ajanlar; çekirdekte aynı anda tek yazar, `tipler.ts` sözleşmesi takım liderinde | [Sahip] + [Lider] | K35 |

Kararların tam metni [00 §2](00-vizyon-ve-kararlar.md#2-kararlar-tablosu) içindedir (K23–K35).

---

## 3. Değerlendirilen seçenekler ve neden seçilmedikleri

### 3.1 Arsa atomu

| Seçenek | Artı | Eksi | Sonuç |
|---|---|---|---|
| **z20 kare hücre (~30 m, quadkey)** | İnşa yerleşimine uygun (ızgaraya oturma, döndürme); deterministik; sahiplik hücre kimliğiyle seyrek tutulur; Capital Rift'in çoklu seçme ve birleştirme modeline uyar | Mercator alan farkı 36°–48°K arasında ~%28; denge için oyun matematiği UTM metre çerçevesinde yapılabilir | **Seçildi (K30)** |
| H3 res 10 altıgen (~15.000 m², 6 yuva) | Toplama ve ısı haritası katmanları için iyi; h3-js ~65 KB gzip | Altıgen, ızgaraya oturan inşaya uymaz; yapı yerleşimi garip olur | Elendi; res 8–9 yalnız **toplama mercekleri** için ikincil katman olabilir |
| TKGM kadastro parselleri | Gerçek parseller | Ticari kullanım yasak, web servisleri izne bağlı ([TKGM](https://parselsorgu.tkgm.gov.tr/); arama özetinden, doğrudan okunmadı) | Elendi |
| Serbest çizim çokgen | Esnek | Doğrulama, çakışma ve adalet sorunları; determinizm zor | Elendi |

### 3.2 Sunucu ve eşzamanlama

| Seçenek | Lisans / durum | Neden seçilmedi / seçildi |
|---|---|---|
| **Düz Node + `ws` (gerekirse ağ geçidi [uWebSockets.js](https://github.com/uNetworking/uWebSockets.js))** | MIT / Apache-2 | **Seçildi.** Çekirdeği olduğu gibi kullanır. Tek yazar dünya, MCF'nin küresel çözümüyle uyumlu |
| [Colyseus](https://github.com/colyseus/colyseus) | MIT | Oda ve şema eşzamanlama modeli maç odaklı; kendi durum eşzamanlamamızı çoğaltır. Çok süreç için Redis gerekir ([belge](https://docs.colyseus.io/scalability)) |
| [Nakama](https://github.com/heroiclabs/nakama) | Apache-2 | TS çalışma zamanı ES5/goja: async/await yok, V8'den ~20× yavaş ([özet](https://www.blog.brightcoding.dev/2025/09/21/goja-a-pure-go-implementation-of-ecmascript-5-1/)); sim'i barındıramaz |
| [SpacetimeDB](https://github.com/clockworklabs/SpacetimeDB/blob/master/LICENSE.txt) | BSL 1.1 (2031'de AGPLv3) | Sim'i reducer'larla yeniden yazmak ve kilitlenme demek |
| [Hathora](https://gameye.com/gameye-vs-hathora/) | Kapandı (5 Mayıs 2026) | Satıcıya özgü oyun arka uçlarından kaçınma kanıtı |
| Cloudflare Durable Objects | Ücretli kullanım | İzolat başına 128 MB bellek tavanı, tek iş parçacığı, satır yazma faturası ([fiyat](https://developers.cloudflare.com/durable-objects/platform/pricing/), [sınırlar](https://developers.cloudflare.com/workers/platform/limits/)). İleride ilçe başına ağ geçidi ve dağıtım nesnesi olarak düşünülebilir |
| İlçeye göre parçalama | — | Lojistik ağı ilçeleri aşar; parçalama çözümü bozar. İleride yalnız ülke veya deniz havzası düzeyinde parçalanır |

### 3.3 Kalıcılık ve barındırma

| Seçenek | Neden seçilmedi / seçildi |
|---|---|
| **Postgres (aynı VPS'te) + R2 yedek** | **Seçildi.** Tek dünya için en basit ve ucuz yol; WAL ve gece `pg_dump` |
| SQLite parça başına (DO SQLite, LiteFS, Turso) | Yalnız Cloudflare seçeneğinde anlamlı; LiteFS Cloud kullanımdan kalktı ([inceleme](https://makerstack.co/reviews/litefs-review/)) |
| Yönetilen Postgres (Neon) | Sürekli açık 1 CU ≈ $77/ay ([kaynak](https://selfhost.dev/blog/neon-pricing-cost-of-serverless-postgres/)); kendi VPS'imizde daha ucuz |
| **Hetzner + Cloudflare ücretsiz ön yüz** | **Seçildi (K34).** Alfa ~€15–20/ay (tahmin); öngörülebilir maliyet, kolay yük testi |
| Cloudflare merkezli (DO + Workers + R2) | Alfa ≈ $5–10 ama 10k eşzamanlıda ≈ $100–450 (tahmin); 128 MB tavanı erken parçalamaya zorlayabilir |

### 3.4 Çekirdekte mülk modeli

| Seçenek | Artı | Eksi | Sonuç |
|---|---|---|---|
| **İşletme düğümü:** (oyuncu, il) başına bir `BolgeDurumu`, kendi stok defteriyle; il merkezine sıfır süreli kenar | En az değişiklik; mevcut ekonomi, pazar ve inşaat kodu çalışır; bölge kipi regresyon kalkanı korunur | Düğüm sayısı artar; il içi ortak işgücü ve elektrik şebekesi ilk sürümde sığ kalır | **Seçildi (F3)** |
| Derin `Bolge`/`Hesap` ayrımı (coğrafya ayrı, sahip ayrı) | "Bir ilde çok sahip" için daha temiz; ortak şebeke ve kirlilik doğal | Her alt sistemi ve özet karmasını etkiler | **F6 sonrasına ertelendi** |

### 3.5 Lojistik

| Seçenek | Sonuç |
|---|---|
| (a) `lojistikCoz` aynen kalır, yalnız arayüzden gizlenir | Düğüm sayısı artınca çözüm maliyeti büyür; tek başına yetmez |
| **(b) İşletmeler il içinde havuzlanır; MCF yalnız 53 merkez arasında çözülür** | **Seçildi.** Çözüm maliyeti düğüm patlamasından önce düşer; mevcut kenarlar, limanlar ve iklim aynen kalır |
| (c) MCF yerine düz mesafe gecikmeli "ulusal havuz" | `akis.ts`/`mcf.ts`, kapsam nedenleri ve H3'ün kapsam metriği gider; derinlik kaybı fazla |

### 3.6 İstemci, karo ve yürüyüş

| Konu | Seçilen | Elenen ve nedeni |
|---|---|---|
| L1–L3 harita | **MapLibre GL** (BSD-3, ~285 KB gzip, tembel yüklenir) | Küre üzerinde three.js ile ilçe ve hücre: seçim ve vurgulama zahmetli |
| Yürüyüş sahnesi | **Ayrı three.js sahnesi**, yerel metre çerçevesi, kayan orijin | MapLibre özel katmanı: projeksiyon başına matris hesabı, paylaşılan GL bağlamı ([örnek](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-to-globe-using-threejs/)) |
| Karo kaynağı | **Protomaps PMTiles özütü** (tek statik dosya, sunucusuz) | Kendi planetiler derlemesi: Java hattı gerekir, ihtiyaç olursa sonra. Canlı Overpass: oyun için uygun değil |
| Karakter kontrolcüsü | **Kendi kinematik kontrolcümüz** (DEM örnekleme + 2B çarpışma) | Rapier: wasm 3,08 MB ham; ecctrl: React Three Fiber + Rapier ister |
| Hazır OSM 3D motorları | — | Streets GL güçlü GPU ister (yalnız referans); OSM2World yalnız çevrimdışı pişirme; ViziCities eski; three-geo Mapbox jetonu ister |
| İdari sınırlar | **OSM admin_level 4 (il) / 6 (ilçe)** | geoBoundaries yalnız yedek (lisanslar ülkeye göre karışık; TR ADM2 999 birim, OSM'de 973); GADM ticari olmayan lisans, K22 gereği kullanılmaz |

### 3.7 Başlangıç ve kapsam

| Seçenek | Sonuç |
|---|---|
| Devlet ya da bölge seçerek başlama (mevcut istemci, `devlet-sec.ts`) | **Kaldırıldı (K25)**: sahip kararı |
| Tüm dilimi (Türkiye + Balkanlar, ~970 ilçe) birden açmak | Elendi: 10k oyuncu bütün dilime dağılırsa ilçe başına 10'dan az oyuncu düşer, dünya boş kalır ([oyun tasarımı §0](arastirma/oyun-tasarimi-parsel.md)). **Kademeli ilçe açılışı** |
| Alfa-0'da yönetişim, askeri ve yürüyüşü de açmak | Elendi: kritik yolu uzatır. Alfa-0 döngüsü yalnız al → kur → üret → sat |

---

## 4. Sonuçlar: neler kalıyor, neler değişiyor

### 4.1 Özet tablo

| Kalıyor | Değişiyor | Kalkıyor | Erteleniyor |
|---|---|---|---|
| Deterministik tamsayı çekirdek, olay motoru, PRNG, `durumOzeti` | Oyuncu rolü: bölge yöneticisi → arsa sahibi, yapı sahibi, makam sahibi | Kürede akış şeritleri ve parçacıklar (`KenarSeritleri`, `AkisParcaciklari`) | Lojistik v1: filo, yakıt, iklim kenarları (yalnız arka planda) |
| 53 bölge, 143 kenar, limanlar, iklim (merkez düğüm olarak) | Sahiplik: `BolgeDurumu.sahip` → işletme düğümü (oyuncu, il) | `Kare.akislar`, `Kare.kenarlar` | Teknoloji v1 (17 düğüm): Alfa-1 sonrası |
| Tarım, Sanayi, Pazar v1 kuralları ([06](06-simulasyon-spesifikasyonu.md) §10–12) | Devlet D1–D7: oyuncu düzeyinden **il hükümetine** (seçilmiş vali; Alfa-0'da NPC vali) | `kenar_gelistir` ve `askeri_rezerv` formları ve komutları (parsel kipinde) | Derin `Bolge`/`Hesap` ayrımı (il içi ortak şebeke, kirlilik): F6 sonrası |
| Küresel NPC pazar (açıkça işaretli piyasa yapıcı) | MCF: tüm düğümler yerine **53 merkez arası**; il içi havuz | Devlet seçimi ekranı (`arayuz/devlet-sec.ts`) | Oyuncular arası emir defteri, şirketler ve loncalar: v1.5 |
| Komut kaydı (`komut/kayit.ts`), Türkçe hata metinleri, arayüz gövdeleri | Worker protokolü → WebSocket protokolü (`packages/protokol`) | Hız düğmelerinin üst ortadaki yeri (hata ayıklama menüsüne taşınır) | Ülke düzeyi oyuncu federasyonları: v1.5 |
| Ölçüm takımı, sentetik-50 ve mini-6 (regresyon fikstürü) | H1–H9 parsel dünyasına göre yeniden ifade edilir (§8) | Darboğaz sekmesi (yerine Dikkat paneli) | |
| Bölge kipi (`--kip bolge`) ve v0.3 sonuçları: **donmuş temel çizgi** | Görsel: rozet + mercek + Dikkat paneli; sakin palet | | |

### 4.2 Etkilenen eski kararlar

| Eski karar | Yeni durum |
|---|---|
| K1 "doğrudan bölge/devlet yöneticisi" | K25: arsa sahibi olarak başlar; yöneticilik **seçilen makamdır** (muhtar, vali) |
| K6 / K17 "akış görünür" | K29: akış görünmez; okunurluk rozet, mercek ve Dikkat paneliyle sağlanır |
| K10 kalıcı tek dünya | K23: aynı ilke, artık **baştan çok oyunculu** ve hesaplı |
| K18 ilk gerçek dilim | K32: Alfa-0 Kocaeli + Sakarya + Bursa; dilim Türkiye + Balkanlar + Karadeniz olarak kalır |
| K19 "derinlik lojistikte" | K29: lojistik arka planda; derinlik üretim zincirleri, arazi, yönetişim ve iklimde |
| K22 "OSM türevi ayrı ODbL dosyasında" | K24: OSM kabul; ayrı klasör kuralı sürer |
| A2 sınır ve isim politikası | K33 ile kısmen kapandı: gerçek il/ilçe adları, NPC ülke çerçevesi |
| A8 çok oyunculu sunucu zamanlaması | K23 ile kapandı: baştan |
| [10 §4](10-gorev-listesi.md) madde 5 ("dolaşma" = kamera mı, avatar mı) | K28: avatar (yürüyüş), Alfa-1 |
| [10 §4](10-gorev-listesi.md) madde 6 (ODbL) | K24: OSM kabul |

### 4.3 Koddaki etkisi (kod geçiş keşfinden)

**Bölgenin atom olduğu yerler.** `BolgeDurumu` (`cekirdek/src/tipler.ts`) bölge başına tek bir havuz tutar: sahip, stoklar, tesisler, ticaret emirleri, birlikler ve tarım/elektrik/kirlilik alanları. Bölge indeksleri derlemede sabitlenir (`derle.ts` → `ic.bolgeIndeks`, `komsuKenarlar`). MCF önbelleği `ic` anahtarlıdır (`lojistik/akis.ts`). Sahiplik denetimleri alt sistemlere dağılmıştır: `ekonomi/komut.ts`, `sanayi/komut.ts`, `tarim/komut.ts`, `askeri/uretim.ts`, `askeri/savas.ts`. Savaş `sahip`'i hiç değiştirmez; "parsel asla el değiştirmez" ilkesi buna zaten uygundur.

**En az değişiklikli yol (seçilen).**
1. `bolgeIndeks` ve `komsuKenarlar` `Dunya`'ya taşınır (büyüyebilen düğüm kümesi). MCF önbelleği `ic`'den bağımsız olur.
2. **İşletme** = (oyuncu, il) başına bir `BolgeDurumu`. Bölge merkezine sıfır süreli kenarla bağlanır. Merkezler `politika.kenarKullanilabilirMi` içinde "kamu" sayılır; bugün sahipsiz uç kenarı kapatıyor.
3. Yeni `cekirdek/src/mulk/`:
   - `parsel_al {ilce, hucreler[], sinif}`. Coğrafi nitelikleri sunucu çözer ve komuta yazar; çekirdek oyun kurallarını doğrular.
   - `tesis_insa {hucreler}`, `insaat_iptal` (%50 iade).
   - `TesisDurumu.hucreler`.
4. İnşaat aşaması `(şimdi − başlangıç) / süre` ile **türetilir**; ek olay gerekmez.
5. Tembel arazi vergisi ve hareketsizlik merdiveni.
6. Liman erişimi il düzeyine taşınır; il nüfus vergisi il hazinesine gider.

**`sahip` okuyucuları** (hepsi işletme düğümüne uyarlanacak): çekirdekte lojistik (`cozum.ts`, `akis.ts`, `kapsamHesap.ts`), pazar (`piyasa.ts`, `kitlik.ts`), sanayi, tarım, askeri, `politika.ts`, `motor.ts`. Dışarıda `botlar/planlayici.ts`, `botlar/askeri.ts`, `olcum/metrik.ts`, `olcum/h5.ts`, `istemci/isci/kare.ts`, `komut/kayit.ts`, `izleyici`.

**Sunucuya hazırlık.**
- Özel bir serileştirici **yok**; ilk iş budur (F1).
- `Dunya` düz tamsayı veridir. `ozet.ts` `kanonikSerilestir` + FNV-1a 64 `durumOzeti` anlık görüntü bütünlüğü için hazırdır.
- `Simulasyon.yukle(veri, dunya, gunluk)` fabrikası eklenecek.
- Başarısız komutlar zamanı ilerletir ama günlüğe yazılmaz. "Başarısızlar atılıp yeniden oynatılınca özet eşit" testi CI'a girer.

**İstemcide yeniden kullanılanlar.** Saf parçalar: `komut/kayit.ts` (yeni `kapsam: "parsel"`), `komut/{tipler,hata,tablo,oneri*}.ts`, `veri/{kapsam,renkler,tarim,kare-tipleri}.ts`, `arayuz/{govde,komut-govde,tarim-govde,bicim,bildirim}.ts`. Küreye bağlı kalanlar: `kure/*`, `kamera/*`, `akis/*`. Bunlar yalnız L0'da kullanılır. `isci/protokol.ts` WebSocket'e taşınır. `komut→komutSonuc` korunur; `baslat`, `hiz` ve `duraklat` düşer; `hazir` el sıkışma olur.

**Performans riski.** Gerçek haritada 4 botlu 30 günlük koşu bugün 21–22 sn sürüyor (~7,5k çözüm, ~2,9 ms/çözüm). Yükün çoğu olay hacminden geliyor ([06](06-simulasyon-spesifikasyonu.md)). İşletme düğümleri bunu kötüleştirir; merkez MCF'si bu yüzden F3'ün parçasıdır.

---

## 5. Fazlar F0–F7

**Kritik yol:** F1 serileştirici → F3 mülk modeli → F4 istemci entegrasyonu → F7a Alfa-0. Diğer işler bu yolun yanında paralel yürür. **Fazlar kanıt sırasıdır, takvim taahhüdü değildir.**

| Faz | İçerik | Kabul | Kritik yol |
|---|---|---|---|
| **F0 Sakin görsel** | `kure/sahne.ts` akış şeritlerini ve parçacıkları kurmaz. `Kare.akislar`/`kenarlar` ile `kenar_gelistir`/`askeri_rezerv` formları kalkar. Hız düğmeleri hata ayıklama menüsüne, atıf "ⓘ"ye taşınır. Rozetler (▲ ◯ ✓), Darboğaz sekmesinin yerine Dikkat paneli, tek bir `tr-TR` sayı biçimleyici | `pnpm kontrol` yeşil; açık ve koyu temada ekran görüntüsü; çizim çağrısı artmıyor | Hayır |
| **F1 Sunucu temeli** | `cekirdek/src/serilestir.ts` (kanonik JSON, PRNG ve kuyruk dahil) + `Simulasyon.yukle` · `packages/protokol` · `packages/sunucu`: Node + `ws`, sunucu `t`, idempotans, token-kova hız sınırı, Postgres `log`/`snapshots`, 50–100 ms grup commit · `kareAl` ilgi alanı süzgeci, stoklar `(miktar, oran, t0)` · Better Auth (magic link + Google) | Rastgele noktalarda serileştir/yükle → özet eşit · başarısızlar atılıp yeniden oynatılınca özet eşit · kill -9 → anlık görüntü + kuyruk → aynı özet · iki istemci aynı dünyayı görür | **Evet** |
| **F2 Veri** | `veri-hatti/src/osm/`: Geofabrik PBF → osmium ile il/ilçe (TR, BG, RO, GR); ebeveyn kimlikli ağaç; il başına tembel ilçe TopoJSON · z20 hücre ızgarası + uygunluk (yol tamponu, su ve askeri alan hariç; arazi sınıfı) → tippecanoe PMTiles · Alfa illeri için Protomaps özütü · ODbL verisi ayrı klasörde | 81 il, ~973 ilçe · il→bölge eşleme testi · bayt bayt determinizm · ilçe başına karo ≤150 KB (hedef, ölçülecek) | Kısmen (F4'e girdi) |
| **F3 Çekirdek mülk modeli** | Büyüyebilen düğüm, işletme, `parsel_al`, `tesis_insa {hucreler}`, `insaat_iptal`, tembel arazi vergisi, hareketsizlik merdiveni; MCF yalnız 53 merkez arası, il içi havuz (§4.3) | Bölge kipinde tüm eski testler yeşil (regresyon kalkanı) · mini-6 parsel fikstüründe özellik testleri · 1k botla 30 günlük koşu, bugünkü 21–22 sn'den yavaş değil (hedef) | **Evet** |
| **F4 İstemci** | `istemci/src/harita/`: tembel MapLibre L1–L3, `fitBounds` geçişleri, kırıntı yolu, aksan duyarsız arama · hücre seçimi (shift), satın alma alt çubuğu, parsel kartı · inşa modu: hayalet (mavi geçerli / turuncu taralı geçersiz), R ile döndürme, maliyet kartı, 4 aşama çubuğu, 2 inşaat kuyruğu · worker yerine socket bağdaştırıcısı; `kayit.ts`'e `kapsam: "parsel"` · Giriş / Yerleş ekranı · telefonda alt sayfa | Playwright: giriş → Yerleş → hücre al → Tarla kur → tamamlanır → satış görünür · mobil düzen | **Evet** |
| **F5 Yürüyüş** (paralel) | `istemci/src/yuru/`: ~2×2 km three.js sahnesi, kayan orijin · worker'da PMTiles → yer, yol şeridi, bina ekstrüzyonu; Mapterhorn DEM · kinematik kontrolcü (tıkla-git, WASD, 2B çarpışma) · Quaternius karakter, takip kamerası, `[E]` etkileşim hapı, mini harita, çatı kesme · örneklenmiş inşa aşamaları | ≤60 çizim çağrısı · dizüstünde 60 fps, orta telefonda 30+ fps (hedef; gerçek cihazda doğrulanacak) | Hayır (Alfa-1) |
| **F6 Yönetişim + Devlet v1** | [08](08-alti-katman.md) D1–D7 il hükümetine taşınır: ihtiyaç kademeleri, istikrar, göç, 7 yasa, bütçe · muhtar (14 gün) ve vali (28 gün) seçimleri; NPC vali varsayılanı · hafif askeri (§7.7) · H5 korumaları | H5 ve H9 testleri · yasa etki testleri | Hayır (Alfa-1) |
| **F7a Alfa-0** | Hetzner + Postgres + Cloudflare (proxy, Turnstile, R2) · WAL + gece yedeği + geri yükleme tatbikatı · metrikler · kural dönemi provası · yönetici paneli · atıf ekranı | Geri yükle → kuyruk → özet eşit · 100 botla yük testi · §6.1 kapı ölçütleri | **Evet** |
| **F7b Alfa-1** | Yürüyüş + yönetişim + askeri · %70 doluluğa göre kademeli ilçe açılışı · Balkanlar | Ölçüm raporu (§8) · §6.2 kapı ölçütleri | — |

**Çekirdek yazar sırası (aynı anda tek ajan):** F1-a serileştirici → F3-a büyüyebilen düğüm ve işletme → F3-b parsel, yapı, vergi, hareketsizlik → F3-c lojistiğin gizlenmesi → F6 Devlet v1 ve seçim.

**Paralel dosya sahipliği (çakışmasız):**

| Ajan | Sahip olduğu yer |
|---|---|
| Takım lideri | `packages/cekirdek/src/tipler.ts` sözleşmesi, `docs/**` (docs/06 hariç) |
| Çekirdek | `packages/cekirdek/**`, docs/06 |
| Sunucu | `packages/sunucu/**`, `packages/protokol/**` (yeni) |
| Veri | `packages/veri-hatti/src/osm/**` (yeni), `packages/veri/haritalar/odbl/**` |
| İstemci-görsel (F0) | `istemci/src/{kure,akis,arayuz}/**` |
| İstemci-harita (F4) | `istemci/src/harita/**` (yeni) |
| Yürüyüş (F5) | `istemci/src/yuru/**` (yeni) |
| Ölçüm | `packages/{botlar,olcum}/**`, `packages/veri/src/uretici/**` |

`komut/kayit.ts` aynı anda tek ajanda olur: önce F0, sonra F4. Ölçümler her zaman sabit bir commit'ten açılan **ayrı bir git worktree**'de koşar; eşzamanlı ajanlar sonucu bozamaz.

---

## 6. Alfa-0 ve Alfa-1 kapsamı

| | **Alfa-0 (kapalı)** | **Alfa-1** |
|---|---|---|
| Coğrafya | Kocaeli + Sakarya + Bursa (~40 ilçe) | + kademeli ilçe açılışı (%70 doluluk eşiği) + Balkanlar (BG, RO, GR; doğrulandıkça) |
| Oyuncu | ≤200 davetli | Açık alfa; hedef eşzamanlı sayı sahiple belirlenir (bilinmiyor) |
| Döngü | Yerleş → arsa al → yapı kur → üret → sat | + yürü, oy ver, aday ol, ortak proje, ordugâh |
| Katmanlar | Tarım, Sanayi, Pazar tam; Lojistik görünmez arka plan; Teknoloji mevcut 6 düğüm; Devlet = NPC vali, varsayılan yasalar | + Devlet v1 (seçilmiş muhtar ve vali, 7 yasa, bütçe), hafif askeri; Teknoloji v1 sonrası |
| Yapılar | 18 yapının **Ordugâh dışındaki 17'si** (Muhtarlık kamu yapısı olarak yer tutucu) | 18 yapının tamamı; gelişim seviyesi kilitleri |
| Görünüm | L0 küre, L1–L3 MapLibre, inşa modu | + L4 yürüyüş |
| Altyapı | Tek Hetzner CX33 + Postgres + Cloudflare | Gerekirse CX43 + ayrı veritabanı (tahmin €30–45/ay) |
| Hukuk | ODbL atıf ekranı; davetli koşulları | **Dış hukuki görüş** (ODbL, harita kuralları, kişisel veri) açık alfadan önce |

### 6.1 Alfa-0 kapısı (davetlilere açmadan önce)

| # | Ölçüt | Kaynak |
|---|---|---|
| A0-1 | F0, F1, F2 (Alfa illeri), F3 ve F4 kabul ölçütlerinin hepsi geçti | Plan |
| A0-2 | Regresyon kalkanı: bölge kipinde `durumOzeti` birebir aynı, `pnpm kontrol` yeşil | Plan |
| A0-3 | Geri yükleme tatbikatı: yedekten geri yükle → kuyruğu oynat → özet eşit | Plan |
| A0-4 | 100 bot ile yük testi: tik gecikmesi ve çözüm süresi raporlandı | Plan |
| A0-5 | Kural dönemi dağıtım provası yapıldı | Plan |
| A0-6 | Uçtan uca Playwright akışı (giriş → Yerleş → hücre al → Tarla kur → tamamlanır → satış görünür), masaüstü ve mobil | Plan |
| A0-7 | **Kullanılan kaynakların atfı** görünür: bugün OSM/ODbL (© OpenStreetMap katkıcıları), Protomaps, TÜİK (ilçe nüfusu), Natural Earth, USGS; üçüncü taraf lisans dosyası (LICENSES) dağıtılır ve ⓘ kutusundan bağlantılıdır; DEM bağlanınca Mapterhorn/Copernicus atfı Mapterhorn `attribution.json`'dan gelir. OSM türevi veri ayrı klasörde | Plan, K24; baş lider kararı (2 Ekim: ölçüt "kullanılan kaynaklar") |
| A0-8 | Bot ölçümü (worktree, parsel kipi): H5, H6, H7 ve H8 raporu üretildi | Plan |

### 6.2 Alfa-1 kapısı (açık alfaya geçmeden önce)

| # | Ölçüt | Kaynak |
|---|---|---|
| A1-1 | Alfa-0'da veri kaybı yok; en az bir gerçek geri yükleme ya da yeniden başlatma özet eşitliğiyle geçti | Öneri [Lider] |
| A1-2 | F5 kabulü: ≤60 çizim çağrısı; dizüstü 60 fps; orta telefonda 30+ fps **gerçek cihazda** ölçüldü | Plan |
| A1-3 | F6 kabulü: H5 korumaları özellik testleri, yasa etki testleri, H9 oy katılımı ölçümü | Plan |
| A1-4 | Tam ölçüm raporu: H1–H9, 1k ve 10k bot, 90 gün, 10 tohum (worktree) | Plan |
| A1-5 | H4 insan testi: 5 kişiden ≥4'ü 60 sn içinde "fabrikam neden yavaş?" ve "hangi yasa beni etkiliyor?" sorularını yanıtlar | Plan |
| A1-6 | ODbL ve kişisel veri için dış hukuki görüş alındı | K34 |
| A1-7 | Alfa-0 kohortundan D1/D7 gözlemi raporlandı (eşik yok; hipotez olarak sunulur) | Öneri [Lider] |

---

## 7. v1 oyun tasarımı (başlangıç değerleri; ölçümle kalibre edilecek)

**Temel ilke:** arazi spekülasyon aracı değil, **üretim aracıdır**. Upland ve Earth2 oynanışsız arazi spekülasyonunda tökezledi; Eco ve Albion'da ise arazi günlük üretim döngüsünü besler ([oyun tasarımı §1](arastirma/oyun-tasarimi-parsel.md)).

### 7.1 Çekirdek döngü

| Ritim | Oyuncunun yaptığı |
|---|---|
| **Dakika** | Yürü; yapı yerleştir ya da yükselt; yöntem seç; emir ver |
| **Saat** | Bir inşaat biter; otomatik taşıma stoku dengeler (görünmez) |
| **Gün** | Hasat eğrisine ve Dikkat paneline bak; ekim karışımını, gübre dozunu ve satışları ayarla |
| **Hafta** | Oy ver; yasa değişikliklerini izle; ortak projeye katkı ver; sondaj yap |
| **Ay** | İklim takvimi değişir |

Günde bir-iki kısa ziyaret yeterlidir. Günlük giriş ödülü yoktur (K13). Başarımlar seri değil "ilk"tir: ilk L ölçekli tesis, Karadeniz'i aşan ilk ihracat gibi.

### 7.2 Arsa

| Konu | Değer |
|---|---|
| Atom | z20 hücre (~30×30 m). **1 hücre = 1 yapı yuvası**; yapılar 1–3 hücre kaplar (K30) |
| Hücre başına taban fiyat | Kırsal **1.000 ₺** · Kasaba **2.500 ₺** · Şehir **6.500 ₺** |
| Fiyat çarpanı | × (1 + 2 · ilçede satılmış pay). Örnek: ilçenin %25'i satılmışsa kırsal hücre 1.000 × 1,5 = **1.500 ₺** |
| Sahip olma sınırı | Oyuncu başına ilçede **≤72 hücre** ve ilçenin **≤%25**'i |
| Seçim kuralı | Seçilen hücreler bitişik olmalı (Earth2 kuralı); sahip olunan hücreye değen seçim "Birleştir" olur |
| Satın alınamaz hücre | Yol tamponu, su, `landuse=military`, korunan alan. Bina taban alanı ya engellenir ya hücreyle birlikte satılır (açık konu Ü4) |
| Arazi sınıfı | OSM `landuse` etiketinden: tarla, sanayi, konut. Hangi yapının izinli olduğunu belirler |
| Arazi vergisi | Yalnız **arazi değerine**, yapılara değil: haftalık **%1**. İlçe meclisi %0,5–3 bandında ayarlar (Alfa-0'da sabit %1). Tembel tahakkuk |
| Değerleme | v1'de ilçe emsalleri; Harberger öz-beyanı yeni oyuncuyu şaşırtır ([Naavik](https://naavik.co/deep-dives/digital-land-tax/)) |
| Bakım | Elde tutulan büyüklüğe göre kademeli artar (Rust tipi kademe; [Corrosion Hour](https://www.corrosionhour.com/rust-upkeep-building-guide/)) |
| Teşhis hedefi | Arsanın yeniden satış fiyatı ≤ 10 haftalık arazi geliri; yüksekse vergi düşük demektir (H8) |

### 7.3 Yapılar (18 tür)

"Yuva" = kapladığı hücre sayısı. İnşa süreleri plan değerleridir. Mevcut [06](06-simulasyon-spesifikasyonu.md) içerik süreleri farklıdır; parsel kipi kendi parametreleriyle çalışır (öneri). "Mevcut içerik" sütunu, yapının `icerik.json` içindeki hangi tesis türlerini ve yöntemlerini devraldığını gösterir.

| Katman | Yapı | Yuva | İnşa | Not | Mevcut içerik |
|---|---|---:|---:|---|---|
| Tarım | **Tarla** | 2 | 2 sa | Ekim planı, gübre dozu, hasat eğrisi | `ciftlik` |
| Tarım | **Ahır** | 2 | 4 sa | Hayvancılık; gıda ve yem bağı | `ahir` |
| Tarım | **Mera** | 3 | 2 sa | Yalnız dağ ve yayla hücreleri | `mera` |
| Tarım | **Sulama** | 1 | 6 sa | Kuraklık koruması; elektrik ister | `sulama_kanali` |
| Tarım | **Gıda fabrikası** | 2 | 6 sa | İşleme | `gida_fabrikasi` |
| Sanayi | **Maden ocağı** | 2 | 6 sa | Damar gerektirir; tükenme ve sondaj | `cevher_madeni`, `komur_ocagi`, `bakir_madeni`, `silis_ocagi` (yöntem olarak) |
| Sanayi | **Petrol kuyusu** | 1 | 6 sa | Damar gerektirir | `petrol_kuyusu` (`rafineri` açık konu Ü5) |
| Sanayi | **Çelikhane** | 3 | 10 sa | Kirlilik yüksek | `celikhane` |
| Sanayi | **Parça atölyesi** | 2 | 8 sa | | `parca_fabrikasi` |
| Sanayi | **Elektronik** | 2 | 10 sa | | `elektronik_fabrikasi` |
| Sanayi | **Santral** | 3 | 10 sa (8–12) | İl şebekesine elektrik verir; brownout | `santral`, `hidro_santrali` (yöntem olarak) |
| Sanayi | **Gübre fabrikası** | 2 | 8 sa | Tarım zinciri | `gubre_fabrikasi` |
| Sanayi | **Mühimmat fabrikası** | 2 | 8 sa | Ordugâhı besler | `muhimmat_fabrikasi` |
| Lojistik (arka plan) | **Ambar** | 1 | 3 sa | Bozulma ×0,5; depo tavanı | Yeni ([08](08-alti-katman.md) L4) |
| Lojistik (arka plan) | **Garaj** | 1 | 3 sa | Otomatik filo kapasitesi ekler; rota kurulmaz | Yeni ([08](08-alti-katman.md) L1'in otomatik hâli) |
| Teknoloji | **Atölye-Lab** | 1 | 6 sa | Araştırma yuvası | Yeni |
| Pazar | **Ticaret ofisi** | 1 | 2 sa | Emir yuvaları, sözleşmeler | Yeni |
| Devlet | **Konut** | 1 | 2 sa | +nüfus tavanı (işgücü) | Yeni |
| Devlet | **Ordugâh** | 3 | 12 sa | Mühimmat + gıda → birlik (6–24 sa partiler); **Alfa-1** | Mevcut `birlikler` |
| Devlet | **Muhtarlık** | — | ortak proje | Kamu yapısı; ilçe meclisinin yeri; katkıyla yapılır | Yeni |

**İnşa süreci.**

| Konu | Kural |
|---|---|
| Aşamalar | **Temel** → **İskele** → **Gövde** → **Tamam**: 4 parçalı çubuk ve bitiş saati ("bitiş 14:20") |
| Aşama hesabı | Sunucu zamanından türetilir: `(şimdi − başlangıç) / süre`. Sunucu ayrıca tik atmaz |
| Kuyruk | Aynı anda **2** inşaat |
| İptal | Malzemenin **%50**'si iade edilir. Tam iade, kaynakların bitmemiş inşaatta saklanmasına yol açar ([Supercell forumu](https://forum.supercell.com/showthread.php/1681335-Cancel-upgrade-100-refund-in-BH)) |
| Yükseltme | Aynı akış; S → M → L öncesi/sonrası karşılaştırması. Ölçek kilidi ilçe gelişim seviyesine bağlı (§7.4) *(güncellendi: docs/12 §12–§13, tasarım belgesi Y-31, Y-33, Y-34: ölçek seçimdir, ilçe seviyesi kilidi yoktur; ayak izi ölçekle büyür, yerinde yükseltme ek bitişik hücre ister; doğrudan büyük kurulum serbest)* |
| Taslak modu | Parasız hayalet yerleştirme; sonra gerçeğe çevrilir (Anno Blueprint) |
| Onboarding hızlandırması | İlk inşaat kısaltılmış süreyle (~24 dk) |
| Maliyet | Malzemeler işletmenin stoğundan düşer; maliyet kartı "gereken / var" gösterir |

### 7.4 İlçe gelişim seviyesi

> **Güncellendi (docs/12 §13; tasarım belgesi Y-32, Y-33):** ilçe gelişim seviyesi **yalnız kolektif dünya durumudur** (NPC talebi, kamu altyapısı, ruhsat kotası). Aşağıdaki "Açtıkları" sütunundaki S/M/L ölçek, yapı türü ve `otomasyon` kilitleri **geçersizdir**; tablo tarihsel bağlam için korunur.

**Köy → Kasaba → Merkez → Şehir.** Seviye; ilçe nüfusu, hizmet yapıları ve sahip sayısıyla yükselir. Seviyeler ilçedeki **herkes için** S/M/L ölçeğin ve yeni yapı türlerinin kilidini açar (Anno modeli; [wiki](https://anno1800.fandom.com/wiki/Population)).

| Seviye | Eşik | Açtıkları (öneri) |
|---|---|---|
| Köy | Başlangıç | S ölçek; Tarım, Maden, Ambar, Konut, Ticaret ofisi |
| Kasaba | Nüfus **5.000** ve en az **10 sahip** (plan) | M ölçek; Fabrikalar, Santral, Garaj, Atölye-Lab |
| Merkez | Açık (Ü6) | L ölçek (+`otomasyon` teknolojisi); ortak projeler |
| Şehir | Açık (Ü6) | Şehir sınıfı hücreler, liman genişletme projesi |

İlk seviye atlaması 10–20. günde beklenir (tahmin). Bu, 20–25. gün sıkılmasına karşı kaldıraçlardan biridir (§7.11).

### 7.5 Ortak alanlar ve hücre düzeyi

| İl veya ilçe düzeyinde **ortak** | Hücre veya yapı düzeyinde **kişisel** |
|---|---|
| İklim ve hasat eğrisi (T2/T3), iklim olayları | Toprak verimliliği ve ekim planı (T1) |
| Kirlilik (S4) | Gübre dozu (T4) |
| Elektrik şebekesi ve brownout (S1) | Bakım ve aşınma (S3) |
| İşgücü havuzu ve istikrar (D1–D3) | Ölçek S/M/L (S2) |
| Damarlar (S5) | Yöntem seçimi |

İlk sürümde (işletme düğümü modelinde) ortak şebeke ve işgücü **il düzeyinde yaklaşık** uygulanır. Tam ortaklık derin `Bolge`/`Hesap` ayrımıyla F6 sonrasında gelir.

### 7.6 Roller ve yönetişim

**Roller seçilmez.** Ne inşa ettiğinden ve hangi makamda olduğundan doğar.

| Rol | Nereden doğar |
|---|---|
| Çiftçi | Tarım yapıları |
| Sanayici | Sanayi yapıları |
| Tüccar | Ambar + Ticaret ofisi, pazar sözleşmeleri |
| Müteahhit | İnşa kapasitesi satar (v1.5) |
| Muhtar | Seçilmiş ilçe başkanı *(güncellendi: docs/12 §13, tasarım belgesi Y-39: Muhtar mahalle düzeyi, ilçe düzeyi İlçe Başkanı)* |
| Vali | Seçilmiş il yöneticisi |
| Komutan | Ordugâh sahibi |

**Uzmanlaşma (kaldırıldı, 1 Ekim sahip düzeltmesi).** Karakter düzeyinde ustalık ve uzmanlaşma çarpanı yoktur; uzmanlık oyuncunun stratejik portföyünde (yapılar, ilçe seviyesi, teknoloji yöntemleri, sözleşmeler) görünür. Bkz. sondaki "strateji çekirdeği" ek kararı.

| Düzey | Kim | Seçim | Yetki |
|---|---|---|---|
| **İlçe meclisi / Muhtar** | Son 7 günün en az 3'ünde aktif parsel sahipleri; hesap başına 1 oy | 14 günde bir | Arazi vergisi (%0,5–3/hafta), imar payları (tarım / sanayi / konut yuvaları), ortak proje önceliği |
| **Vali** | Muhtarlar arasından | 28 günde bir | 7 yasa ([08 D4](08-alti-katman.md); 72 saat bekleme), 3 bütçe kolu (D5), savaş ilanı, anlaşmalar. İl nüfus vergisi il hazinesine gider |
| **Ülke** | NPC çerçeve | — | Sabit taban tarifeler (K33). Oyuncu federasyonları v1.5 |
| **Alfa-0** | NPC vali | — | Yasalar varsayılan değerde; seçim yok |

**Yasalar parsellere nasıl ulaşır?** `tarim_koruma` ildeki tüm çiftliklerin çıktısını ölçekler. `sanayi_tesviki` herkesin inşa süresini ×0,75'e indirir ve kirliliği artırır. İl şebekesindeki `enerji_onceligi` kimin fabrikasının kesintiye gireceğini belirler. Yasalar sahiplere doğrudan dokunur; seçimlerin önemi buradan gelir.

**Şirketler ve loncalar (v1.5):** ortak hazine, ortak yapı, iç transferler. Aklamaya karşı yeni hesap transfer tavanları konur (§10).

### 7.7 Hafif askeri ve H5 korumaları (Alfa-1)

| Konu | Kural |
|---|---|
| Ordugâh | 3 yuva, 12 sa inşa. Mühimmat + gıda → birlik (6–24 sa partiler). Birlikler il komutanlığında havuzlanır |
| İlan | Savaşı **yalnız vali** ilan eder. 12–24 sa hazırlık, 24 sa pencere; otomatik çözülen hasar yarışı (Rival Regions tipi; [wiki](https://wiki.rivalregions.com/Wars)) |
| Yoğun saat | Savunan taraf 4 saatlik "yoğun saat" bandını seçer (EVE tipi; [EVE Uni](https://wiki.eveuniversity.org/Vulnerability)) |
| Kazanılan | İlçenin kontrolü: vergi hakkı, makam koltukları, liman veya geçit kenarı |
| **Parsel** | **Asla el değiştirmez** |
| Ekonomik savaş | Ambargo, tarife, boğaz ve geçit ablukası (mevcut D6 ve L araçları). **Birincil kaldıraç budur** |

| H5 koruması | Değer |
|---|---|
| Yağma | Pencere başına depo stokunun **≤%25**'i |
| Yapılar | En çok **%10**'u devre dışı kalır; **yıkılmaz** |
| Baskın aralığı | Aynı ilçeye iki baskın arasında **≥49 saat** |
| Yeni oyuncu | **14 günlük** kalkan |
| Güç farkı | Servet oranı kuralı **1:5** (OGame tipi; [kurallar](https://gameforge.com/en-GB/games/ogame-rules.html)) |
| Parsel kaybı | **0** |

### 7.8 Hareketsizlik

| Süre | Etki |
|---|---|
| 14 gün | **Uyku:** üretim durur, vergi donar, parsel korunur |
| 45 gün | Yapılar günde **%2** çürür |
| 90 gün | **Azalan fiyatlı açık artırma** (Hollanda usulü). Gelir, borç düşüldükten sonra eski sahibe alacak olarak gider |
| Tatil modu | Yılda en çok **30 gün** |

### 7.9 Yeni oyuncu (H6)

| Mekanizma | Değer |
|---|---|
| Başlangıç hibesi | **₺50.000** |
| Bedava yurt | Doluluğu düşük bir ilçede **6 hücre** |
| İnşa indirimi | İlk **5** yapıda **%30** |
| Ayrılmış hücre | Her ilçede hücrelerin **%20**'si yeni oyunculara: 14 günden genç hesaplar ya da medyan servetin ¼'ünden az olanlar (Upland "Fair Start" benzeri) |
| Kalkan | **14 gün** |
| Teknoloji yayılımı | Geç gelenlerin araştırması ucuzlar (Teknoloji v1 ile) |
| Yönlendirme | Yerleş ekranı 3 ilçe önerir ve nedenini yazar ("Verimli ova, liman yakın"); doluluğu düşük ilçeler öne çıkar |
| İlk 10 dakika | İlçe seç → ilk hücreyi al (hibe karşılar) → Tarla kur (hızlandırılmış) → (Alfa-1: yürüyerek git) → ilk hasat satışını izle |
| İlk gün | Açılış önerisi (sınıf değil): Tarım, Sanayi ya da Pazar. Her açılışta herhangi bir sırayla yapılabilen 5–7 hedef |

### 7.10 Pazar

- Mevcut küresel NPC pazarı, **açıkça işaretli** piyasa yapıcıyla sürer ("Dünya Piyasa Yapıcısı"; P2 makası).
- **NPC derinliği = max(0, hedef − kayan oyuncu hacmi).** Oyuncular likidite sağladıkça NPC çekilir.
- Liman primleri taşıma maliyetine eşittir (P1). Liman erişimi il düzeyine taşınır.
- İl merkezli oyuncu emir defteri v1.5 kapısına bağlıdır ([08 §5.4](08-alti-katman.md#54-oyuncular-arası-emir-defteri-ne-zaman-v15-kapısı)). Capital Rift'teki dersi akılda tut: "Kimse odun satmıyorsa odun yoktur." Az oyuncuda tamamen oyuncu fiyatlaması risklidir.

### 7.11 Uzun vadeli tazelik (20–25. gün sorunu)

| Kaldıraç | Ne zaman etkili | Mekanik |
|---|---|---|
| Damar tükenmesi | 15–25. gün | S5 √ tükenme, %25 taban; sondaj. Yaklaşık 30 günde bir **başka ilçelerde yeni damarlar** çıkar (deterministik olay akışı) |
| İlçe gelişim seviyesi | İlk atlama ~10–20. gün (tahmin) | Ortak nüfus ve hizmetle M/L ölçeği ve yeni türleri herkese açar |
| Ortak projeler | 3–14 günlük inşa | Köprü, liman genişletme, baraj, demiryolu. Oyuncular malzeme katar; kalıcı kenar ya da kapasite ekler. İl başına Travian tipi "harika" vardır ama dünya sıfırlanmaz |
| İklim takvimi | Aylık | T2/T3 hasat eğrileri ve yayılan olaylar; ortak tehdit |
| Teknoloji | 1–5 gün | Yüzde değil yöntem açar; dışlayan dallar |
| Seçimler ve yasalar | 14 / 28 gün | Yasa değişiklikleri en iyi portföyü karıştırır |

---

## 8. Ölçüm

### 8.1 Hipotezlerin yeni ifadeleri

| # | Eski (bölge kipi, [00 §6](00-vizyon-ve-kararlar.md#6-hipotezler-özet)) | Yeni ifade (parsel dünyası) | Gereken bot |
|---|---|---|---|
| H1 | Aynı politika bölgelerin ≤%70'inde ilk üçte | Hiçbir 6 yuvalık yapı portföyü, **ilçe sınıflarının** %70'inden fazlasında ilk 3'te değil (sınıf başına pişmanlık ve entropi) | çiftçi, sanayici |
| H2 | 30. gün tekrar ≤%60 | 30. günde oyuncu başına karar tekrarı ≤%60 **ve** 45. güne kadar her hafta en az 1 **yeni karar türü** | hepsi |
| H3 | Kapasitenin %20'si askeriyeye kayınca bir fiyat ya da kapsam ≥%10 değişir | Bir ilin yuvalarının %20'si **ordugâha** kayınca o ilde ve komşularında fiyat ya da arz ≥%10 değişir (eşli koşu) | komutan |
| H4 | 5 kişiden ≥4'ü "neresi açık ve neden"i 60 sn'de yanıtlar | 5 kişiden **≥4**'ü 60 sn içinde "fabrikam neden yavaş?" ve "hangi yasa beni etkiliyor?" sorularını yanıtlar | insan testi |
| H5 | 48 sa çevrimdışı tek pencerede kayıp ≤%25 | 48 sa çevrimdışı: pencere başına kayıp ≤%25 **ve 0 parsel kaybı** | akıncı, pasif |
| H6 | Yeni oyuncuların ≥%50'si 14 günde yerel ekonominin ilk yarısında | 60. günde katılan, 14 gün içinde ilçe medyan servetine koşuların ≥%50'sinde ulaşır; hücrelerin ≥%20'si ≤2× taban fiyatla alınabilir | geç katılan |
| H7 | Ayarla-unut üretimi aktifin %50–85'i | Aynı; 24/48/72. saat oranları, **sahip** düzeyinde | kur-unut |
| **H8** (yeni) | — | Arazi Gini ≤0,6; tek oyuncu ilçenin ≤%25'i; yeniden satış fiyatı ≤10 haftalık arazi geliri | spekülatör |
| **H9** (yeni) | — | 1k oyuncuda NPC derinliği çekilirken emirlerin ≥%80'i 1 saatte dolar; oy katılımı ≥%30 | tüccar, yönetici |

Eşikler başlangıç önerisidir. Her eşik değişikliği gerekçesiyle kayda geçirilir ve takım lideri onaylar ([04 §3](04-yol-haritasi.md)). **Simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz** ([00 R5](00-vizyon-ve-kararlar.md)).

### 8.2 Bot arketipleri

| Arketip | Davranış | Ölçtüğü |
|---|---|---|
| Çiftçi | Tarla, Ahır, Sulama; ekim karışımı ve gübre | H1, H2, H7 |
| Sanayici | Maden, Çelikhane, fabrikalar; ölçek yükseltme | H1, H2 |
| Tüccar | Ambar + Ticaret ofisi; fiyata ve depoya duyarlı satış | H9 |
| Spekülatör | Hücre toplar, üretmez, yeniden satar | H8 |
| Yönetici | Aday olur, yasa ve bütçe seçer | H9 (oy), yasa etkisi |
| Akıncı | Ordugâh kurar, baskın ister | H3, H5 |
| Pasif / kur-unut | Kurar ve bırakır, çevrimdışı kalır | H5, H7 |
| Geç katılan | 60. günde katılır; yeni oyuncu paketini kullanır | H6 |

### 8.3 Fikstürler ve düzen

- **Parsel fikstürü:** sentetik-50 ve mini-6 regresyon fikstürü olarak kalır. Her bölge 1 il ve 2 ilçeye dönüşür; ilçe başına 10×10 hücre (`veri/src/uretici/parsel-fikstur.ts`).
- **Bölge kipi:** v0.3 sonuçları (`--kip bolge`) **donmuş temel çizgi** olarak `docs/olcum/` altında arşivlenir. Bu ölçüm sabit commit `1a7fe08` worktree'sinde koşuyor.
- **Ölçek:** 1k ve 10k nüfus, 24× hız, 90 gün, 10 tohum, 12 başlangıç ayı.
- **Kural:** ölçümler her zaman sabit commit'ten açılan ayrı bir git worktree'de koşar.

---

## 9. Arayüz v1

### 9.1 Görünüm düzeyleri

| Düzey | Çizici | Gösterilen | Tık |
|---|---|---|---|
| **L0 Bölge (küre)** | three.js | Bölge renkleri + bölge başına **tek** durum rozeti | Bölgeye uç |
| **L1 İl** | MapLibre | İl sınırları, il adı, tek toplu rozet | Görünümü ile oturt |
| **L2 İlçe** | MapLibre | İlçe sınırları, isteğe bağlı fiyat merceği, mülklerin | Görünümü ilçeye oturt |
| **L3 Arsa** | MapLibre, hücre katmanı | Hücreler, sahiplik renkleri, yapı simgeleri | Hücre seç |
| **L4 Sokak / yürüyüş** | three.js sahnesi | 3D yapılar, karakter | Yürü, gir, inşa et |

Geçişler `fitBounds` + `maxZoom` ile ve 600–900 ms sürer ([MapLibre](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/FitBoundsOptions/)). Azaltılmış harekette geçiş anında olur.

### 9.2 Dokuz ekran

| # | Ekran | İçerik |
|---|---|---|
| 1 | **Giriş / Yerleş** | Oturum açma; 3 önerilen ilçe ve nedenleri; açılış önerisi (Tarım, Sanayi, Pazar; sınıf değil, değiştirilebilir) |
| 2 | **Strateji haritası L0–L3** | Yakınlaştıkça ayrıntı kazanan tek harita; kırıntı yolu ve arama |
| 3 | **Parsel modu** | Hücre ızgarası, seçim, satın alma alt çubuğu, parsel kartı |
| 4 | **İnşa modu** | Yapı paleti, hayalet, maliyet kartı, Taslak düğmesi, ✓ ↻ ✕ çubuğu |
| 5 | **Yürüyüş** | Karakter, mini harita, etkileşim hapı, çatı kesme (Alfa-1) |
| 6 | **Bina paneli** | Durum, tek rozetin nedeni, üretim, inşa aşamaları ve kuyruk, yükseltme, iptal |
| 7 | **Dikkat + Bildirimler** | En çok 5 eyleme dönük madde ("Git" düğmesiyle) ve gelen kutusu |
| 8 | **Katman ekranları** | Pazar, Teknoloji, Devlet (yasa, bütçe, seçim, ordu): her biri kendi merceğiyle açılan tam ekran sayfa |
| 9 | **Ayarlar** | Tema, arayüz ölçeği (%90–130), azaltılmış hareket, renk körü paleti, atıf |

### 9.3 Bileşenler

| Bileşen | Kural |
|---|---|
| Kırıntı yolu + arama | `Türkiye › Kocaeli › Gebze › Parsel #A3F2`; her parça tıklanır; telefonda `‹ Gebze`. Arama aksan duyarsızdır ("golcuk" → Gölcük) ve sonuçları il / ilçe / mülklerim diye gruplar |
| Mercek çubuğu (8) | 6 katman + Sahiplik + Fiyat; 1–8 tuşları; **aynı anda tek mercek**. Lojistik rotası yalnız seçili yapıda, durağan noktalı çizgi |
| Rozetler (3 biçim) | ▲ eksik girdi · ◯ boşta · ✓ inşaat bitti. Yapı başına **en çok bir** rozet (en ağır olan). L0–L2'de il/ilçe başına sayıya toplanır ("⚠ 3"). Rozet canlanmaz; varışta tek kısa nabız olur, azaltılmış harekette hiç olmaz |
| Dikkat paneli | En çok 5 madde; Darboğaz sekmesinin ve alt durum satırının yerini alır |
| Bildirim kuralı | **Anlık bildirim (toast) yalnız oyuncunun kendi eyleminin sonucu içindir** ("Parsel satın alındı"). Geri kalan her şey gelen kutusuna gider, açılır pencere olmaz |
| Bağlam paneli | Masaüstünde ~360 px, kapatılabilir. Telefonda 3 yükseklikli alt sayfa (göz at / yarım / tam) |
| Hayalet + maliyet kartı | Geçerli: mavi, düz çizgi. Geçersiz: turuncu taralı + kısa neden ("Parsel dışında", "Eğim fazla"). 2 m alt ızgaraya oturur. Kart "gereken / var" gösterir, eksik turuncudur |
| Satın alma alt çubuğu | Hücre sayısı, hücre fiyatı, toplam (`12.450 ₺`), "Satın al", "Birleştir" |
| Sahiplik renkleri | Senin: mavi dolgu · başkası: nötr gri çizgi, üzerine gelince ad · satılık: kesikli çizgi · alınamaz: taralı |
| İnşa çubuğu | 4 parçalı (Temel, İskele, Gövde, Tamam) + bitiş saati |
| Etkileşim hapı | Masaüstünde `[E] Fabrikaya gir`, telefonda tek düğme |
| Mini harita | Sağ üst, 120 px, kuzey yukarıda; yalnız parsellerin ve ilçe sınırı. Dokununca stratejik haritaya döner |
| HUD (masaüstü) | Sol üst kırıntı ve arama · üst orta tarih, hasat ve nakit hapı · sağ üst Dikkat, gelen kutusu, ayarlar · alt orta mercek çubuğu (inşa modunda yapı çubuğu). Hız düğmeleri hata ayıklama menüsünde, atıf "ⓘ"de |
| Telefon | Alt sekmeler: Harita · İnşa · Dikkat · Pazar · Devlet. Dinamik joystick, dokunma hedefi ≥44 px. Yatayda yan sayfa, joystick solda |

### 9.4 Türkçe kuralları

| Kural | Örnek |
|---|---|
| Yüzde işareti başta ve boşluksuz | `%90` |
| Sayılar tek `Intl.NumberFormat('tr-TR')` biçimleyicisinden | `12.450 ₺`, `1,5` |
| Büyük harf `toLocaleUpperCase('tr')` ile | `istanbul` → `İSTANBUL` ([Türkçe i hatası](https://mattryall.net/blog/the-infamous-turkish-locale-bug)) |
| Arama aksan duyarsız ve yerel ayara uygun katlanır | "gebze", "gölcük", "golcuk" eşleşir |
| Düğmeler içeriğe göre boyutlanır; sabit genişlikli sekme yok | Türkçe metin İngilizceden ~%25–30 uzun ([LocalizeDirect](https://www.localizedirect.com/posts/turkish-game-localization)) |
| Renk tek başına kullanılmaz | Okabe-Ito renkleri + ikinci şekil kanalı (▲ ◯ ✓) ([SciFig](https://scifig.ai/blog/okabe-ito-color-palette-hex-codes)) |
| Hareket | `prefers-reduced-motion` ve oyun içi düğme: uçuş, nabız ve kamera yumuşatma kapanır |
| Kontrast | Açık ve koyu temada WCAG AA 4,5:1; gövde metni ≥14 px |

### 9.5 Performans ilkeleri

- Paneller HTML/DOM katmanında olur; ucuz, erişilebilir, yerelleştirmesi kolay.
- **Yapı başına DOM etiketi olmaz.** CSS2DRenderer ~200 öğenin üstünde pahalılaşır ([IGC](https://www.intelligentgraphicandcode.com/development/threejs-interfaces/html-integration)). Rozetler örneklenmiş sprite atlası ya da MapLibre sembol katmanıyla çizilir.
- Ekranda değişiklik yoksa çizim durur; stratejik görünümler 0 fps'te bekleyebilir.
- MapLibre ve yürüyüş parçaları tembel yüklenir; ilk JS bugünkü kabuk boyutunda kalır.

---

## 10. Teknik mimari özeti

Ayrıntı: [paylaşılan dünya mimarisi](arastirma/paylasilan-dunya-mimarisi.md), [sokak seviyesi 3D](arastirma/sokak-seviyesi-3d.md).

| Konu | Karar |
|---|---|
| Süreç | Dünya başına **tek yazar** Node süreci. Komut gelince `uygula({t: şimdi, ...})`. Zamanlayıcıyla `calistirKadar(şimdi)`; ardından yayın |
| Komut yolu | İstemci niyet + idempotans anahtarı gönderir → **sunucu `t` basar** (istemci asla `t` göndermez) → `uygula` → 50–100 ms grup commit → onay ve yayın **commit'ten sonra**. Çökmede en çok onaylanmamış kuyruk kaybolur |
| Kalıcılık | `log(seq, t, hesap, komut, kural_sur, sema_sur)` + `snapshots(seq, sim_t, kural_sur, sema_sur, durum_ozeti, blob zstd)`. Anlık görüntü 1–6 sa ya da N komutta bir, kapanışta ve dağıtımdan önce |
| İlgi alanı | Abone olunan iller (mülk) + görüş alanı. Özel veri (stok, hazine) yalnız sahibe; genel veri (sahiplik, yapı silueti) izleyicilere. Stok `(miktar, oran, t0)` olarak gider, istemci ara değer üretir. Revizyonlu varlık deltaları 1–2 sn'de bir; yeniden bağlanmada anlık görüntü + `seq`. İstemci tahmini gerekmez |
| Kural dönemleri | Parametre değişiklikleri günlüğe yazılan sistem komutudur (`kural_surumu_gec` + `parametreler.json` özeti). Kod değişikliği yalnız dönem sınırında yapılır: dur → anlık görüntü → dağıt → göç → başlat. Yalnız son anlık görüntüden yeniden oynatma garanti edilir. Her dağıtımdan önce son 24 sa gölge yeniden oynatılır ([kaynak](https://oneuptime.com/blog/post/2026-01-30-event-driven-versioning-strategies/view)) |
| Determinizm | Node sürümü pinli. Gecelik kanarya: farklı Node yamasında anlık görüntü k→k+1 özeti eşit |
| Kimlik | [Better Auth](https://github.com/better-auth/better-auth) (MIT): magic link + Google; passkey ([SimpleWebAuthn](https://github.com/MasterKale/SimpleWebAuthn)) sonra. E-posta için SES (~$0,10/1.000). Anonim hesap ekonomik hesap olamaz |
| Kötüye kullanım | Hesap başına token-kova, tik başına küresel komut tavanı, yük boyutu tavanı. Yeni hesap ticaret ve transfer tavanı, hediye gecikmesi, fiyat bandı denetimi. Turnstile yalnız hız tümseğidir (çözücü çiftlikleri ~$0,60/1.000; [kaynak](https://prosopo.io/tools/cloudflare-turnstile-pricing/)). Bağlantı sinyalleri otomatik yasak için değil inceleme için. Haksız kazanç telafi komutlarıyla geri alınır. "Kişi başına bir hesap" kuralı ([Torn](https://www.torn.com/rules.php), [Politics & War](https://politicsandwar.com/rules/)) |
| Karolar | Protomaps PMTiles özütü + kendi tippecanoe katmanlarımız (il/ilçe, hücre uygunluğu, sahiplik); R2 + CDN; Protomaps derlemelerine doğrudan bağlantı verilmez |
| Arazi | [Mapterhorn](https://github.com/mapterhorn/mapterhorn) Terrarium. TR ve Balkanlar için yalnız Copernicus GLO-30 (~30 m; [atıf](https://download.mapterhorn.com/attribution.json)). Kaba ama stilize görünüme yeter |
| Maliyet (tahmin) | Alfa (100 eşzamanlı) ≈ €15–20/ay · Beta (1k) ≈ €30–45 · 10k ≈ €100–160. Hetzner fiyatları Haziran 2026 sonrası ([Northflank](https://northflank.com/blog/hetzner-cloud-server-price-increases)) |
| Ölçek yolu | Önce tek süreç. Sonra ağ geçidini uWS'ye taşı. En son ülke veya deniz havzasına göre parçala (sınır ötesi sevkiyat eşzamansız mesaj) |

---

## 11. Riskler

| # | Risk | Olasılık | Etki | Azaltma |
|---|---|---|---|---|
| R-Ü1 | **Serileştirici ve anlık görüntüden yeniden oynatma yok;** kritik yolun ilk adımı | Kesin (iş) | Yüksek | F1-a ilk iş; 20 rastgele nokta testi; başarısızları atan yeniden oynatma testi |
| R-Ü2 | **Düğüm patlaması:** işletme düğümleri MCF ve olay hacmini büyütür (bugün 21–22 sn/30 gün) | Yüksek | Yüksek | Merkez MCF + il içi havuz; 1k bot ölçütü; derin ayrım ertelendi |
| R-Ü3 | **Node ve sürümler arası determinizm** | Orta | Yüksek | Pinli Node, gecelik kanarya, dönem sınırları, anlık görüntüden kurtarma |
| R-Ü4 | **Kurallar sıcak değiştirilirse yeniden oynatma bozulur** | Orta | Yüksek | Parametre değişikliği = günlüğe yazılan komut; kod değişikliği yalnız dönemde |
| R-Ü5 | **ODbL kapsamı:** türetilmiş uygunluk verisi yayımlanmalı olabilir; Üretilmiş Eser kuralı (§4.6) ([OSMF](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline)) | Orta | Yüksek | Ayrı klasör, uygunluk verisini ODbL ile yayımla, sahipliği ayrı tut; açık alfadan önce dış hukuki görüş (K34) |
| R-Ü6 | **Boş dünya:** düşük yoğunlukta pazar ve sosyal döngü çöker | Orta | Yüksek | Kademeli ilçe açılışı (%70), Alfa-0'da 3 il, NPC piyasa yapıcı, H9 |
| R-Ü7 | **Spekülasyon ve istifçilik** (Upland dersi: işlemlerin %98'i yalnız mülk, DAU 60k → 5–15k; [Naavik](https://naavik.co/deep-dives/upland-property-tycoon/)) | Orta | Yüksek | Arazi vergisi, ≤72 hücre / ≤%25, artan bakım, %20 ayrılmış hücre, H8 |
| R-Ü8 | **Mobil performans ölçülmedi;** 2–4 GB dilim tahmini ve ≤150 KB karo doğrulanmadı | Yüksek | Orta | F2/F5 erken ölçüm (Gebze denemesi S6); gerçek cihaz testi |
| R-Ü9 | **Tek yazar = tek hata noktası** | Orta | Orta | Anlık görüntü + kuyrukla hızlı yeniden başlatma; günlüğü oynatan sıcak yedek; alfa için kabul |
| R-Ü10 | **Yedekler sınanmazsa işe yaramaz** | Orta | Yüksek | Aylık geri yükleme tatbikatı; kabul ölçütü özet eşitliği |
| R-Ü11 | **Çoklu hesap ve botlar** | Yüksek | Orta | Sürtünme + tespit + politika; yeni hesap tavanları; teknik çözümü yoktur |
| R-Ü12 | **Balkan admin_level eşlemesi ve sınır kalitesi doğrulanmadı** (GR, GE, UA) | Orta | Orta | Balkanlar Alfa-1'de; ülke ülke doğrulama; geoBoundaries yedek |
| R-Ü13 | **Arazi çözünürlüğü kaba** (~30 m DEM); yollar havada kalabilir | Orta | Düşük | Stilize görünüm; yol örtme düzeltmeleri |
| R-Ü14 | **Kapsam kayması:** sunucu + veri + istemci + yürüyüş + yönetişim aynı anda | Yüksek | Yüksek | Kritik yol tek sıra; Alfa-0'dan askeri, seçim ve yürüyüş çıkarıldı; en çok 4–5 eşzamanlı ajan |
| R-Ü15 | **Capital Rift bilgisi tek kaynaklı** (geliştirici TikTok açıklaması; yığın ve 15k oyuncu iddiası doğrulanmadı) | Yüksek | Düşük | Ürün kararı rakip iddiasına bağlanmaz |
| R-Ü16 | **Kişisel veri yükümlülükleri** (hesap ve e-posta; Türkiye'de KVKK; doğrulanmadı) | Orta | Orta | Asgari veri; hukuki görüşe dahil (K34) |

Eski riskler ([00 §9](00-vizyon-ve-kararlar.md#9-riskler), [10 §6](10-gorev-listesi.md#6-riskler)) geçerlidir. R2 (sınır hassasiyeti) K33 ile azaldı. R3 (ODbL) bu belgede R-Ü5 olarak sürer.

---

## 12. Açık konular

| # | Konu | Önerilen varsayılan | Karar |
|---|---|---|---|
| Ü1 | ODbL: türetilmiş uygunluk verisinin yayımlanma biçimi ve Üretilmiş Eser kapsamı | Ayrı ODbL dosyası olarak yayımla; sahiplik verisi ayrı | Dış hukuki görüş (açık alfadan önce) |
| Ü2 | Mercator alan farkı (~%28): fiyat ve verim hücre alanına göre düzeltilsin mi? | Alfa-0 tek enlem bandında (~40°K), düzeltme yok; Balkanlarda UTM alanıyla yeniden bak | Lider |
| Ü3 | Hücre başına alt ızgara (2 m) ve eğim denetimi Alfa-0'da gerekli mi? | Alfa-0'da yalnız hücre düzeyi yerleşim; 2 m alt ızgara ve eğim F5 ile | Lider |
| Ü4 | Mevcut bina taban alanlı hücreler: engelli mi, satılık mı? | Kırsal ve kasabada satılık; şehir merkezinde engelli | Lider + ölçüm |
| Ü5 | `rafineri` ve `hidro_santrali` 18 yapıda ayrı tür değil | Yöntem olarak Petrol kuyusu ve Santral'e bağlanır; gerekirse 19. yapı | Çekirdek ajanı önerir, lider onaylar |
| Ü6 | Merkez ve Şehir gelişim eşikleri | Kasaba ×3 nüfus ve ×2 sahip (öneri, kalibre edilmedi) | Ölçüm (S9 sonrası) |
| Ü7 | Ortak proje kataloğu ve süreleri (köprü, liman, baraj, demiryolu) | Alfa-1'de il başına 1 proje | Lider |
| Ü8 | Uzmanlaşma çarpanı (×1,5) | **Kaldırıldı** (karakter ilerlemesi yok; sahip, 1 Ekim) | Sahip |
| Ü9 | Alfa-1 eşzamanlı oyuncu hedefi ve altyapı ölçeği | Sahip belirler | Sahip |
| Ü10 | Kişisel veri, gizlilik metni ve kullanım koşulları | Alfa-0'da davetli koşulları; açık alfadan önce hukuki görüş | Sahip |
| Ü11 | Apple ile giriş (ücretli Apple geliştirici hesabı; fiyat doğrulanmadı) | Alfa-1 sonrası | Sahip |
| Ü12 | Gelir modeli (A4) | İlke kilitli (pay-to-win yok); model alfa sonrası | Sahip |
| Ü13 | Ad ve sınır politikası v2'nin yazılı hâli ([DATA_SOURCES](../DATA_SOURCES.md) §6 güncellemesi) | K33; ihtilaflı alan dışlama listesi Balkan açılışından önce | Lider (E19-G8) |
| Ü14 | Diğer oyuncuların avatarları yürüyüşte görünsün mü? | Alfa-1'de görünmez ya da seyrek; sonra ilgi alanıyla | Lider |

---

## 13. Sprint 1 (ilk sprint)

Görev kimlikleri ve durumları [10 §5](10-gorev-listesi.md#5-sprint-1-ürün-dönüşü-1-ekim) içindedir. Çekirdekte aynı anda tek yazar çalışır. En çok 4–5 ajan aynı anda çalışır. Sıra: S1, S2, S5, S6 ve S7 paralel → S3, S4, S8, S9.

| # | Görev | Sahip | Bağımlılık | Kabul | Görev kimliği |
|---|---|---|---|---|---|
| S1 | Bu ADR, docs/00 K23+, araştırmaların Türkçe belgeleri, mülk sözleşmesi taslağı (`tipler.ts`) | Takım lideri | — | Tipler derleniyor | E20-G1 |
| S2 | Serileştirici + `Simulasyon.yukle` + yeniden oynatma testleri | Çekirdek ajanı | — | 20 rastgele noktada özet eşit; tüm testler yeşil | E18-G1 |
| S3 | Büyüyebilen düğüm + işletme + `parsel_al`/`tesis_insa{hucreler}` (bayrak arkasında) | Çekirdek ajanı (S2'den sonra) | S1, S2 | Bölge kipi birebir; parsel özellik testleri | E20-G2 |
| S4 | `packages/protokol` + `packages/sunucu` | Sunucu ajanı | S2 (önce taslakla başlar) | kill/restore testi; iki istemci uçtan uca | E18-G2, E18-G3 |
| S5 | OSM il/ilçe hiyerarşisi + il→bölge eşlemesi | Veri ajanı | — | 81 il / ~973 ilçe; determinizm | E19-G1 |
| S6 | Gebze için PMTiles + z20 hücre uygunluk denemesi; boyut raporu | Veri-2 ajanı | — | Karo boyutu ölçüldü | E19-G2 |
| S7 | F0 sakin görsel + Dikkat paneli + rozetler | İstemci ajanı | — | Akış yok; ekran görüntüleri | E1-G10 |
| S8 | MapLibre kademeli yakınlaşma, hücre seçimi, satın alma alt çubuğu (sahte bağdaştırıcıyla) | Harita ajanı | S5/S6 fikstürleri | Playwright: il → ilçe → hücre seçimi | E21-G1 |
| S9 | H1–H9 yeni tanımları + sentetik parsel fikstürü üreticisi | Ölçüm ajanı | S1 | Fikstür doğrulanıyor | E12-G11 |

S3 iki sprinte taşabilir. Botların parsel kipine taşınması (E20-G10) Sprint 2'nin ilk işidir.

---

*Kaynaklar: onaylı geçiş planı (1 Ekim 2026), [arastirma/arayuz-ux](arastirma/arayuz-ux.md), [arastirma/oyun-tasarimi-parsel](arastirma/oyun-tasarimi-parsel.md), [arastirma/sokak-seviyesi-3d](arastirma/sokak-seviyesi-3d.md), [arastirma/paylasilan-dunya-mimarisi](arastirma/paylasilan-dunya-mimarisi.md), kod geçiş keşfi ve yol haritası planı raporları (bu belgeye işlendi), [00](00-vizyon-ve-kararlar.md), [04](04-yol-haritasi.md), [06](06-simulasyon-spesifikasyonu.md), [08](08-alti-katman.md), [10](10-gorev-listesi.md).*

## Ek karar (1 Ekim, sahibin geri bildirimi): hücre seçimi oyuncuya gösterilmez
Sahip, hücre hücre arsa seçmenin zamanla sıkıcı olacağını belirtti. Karar:
- **Arka plan atomu değişmez:** z20 hücre (sahiplik, sınırlar, adalet, sunucu doğrulaması); `parsel_al {ilce, hucreler, sinif}` aynen kalır.
- **Yapı önce yerleşim:** oyuncu yapı türünü seçip hayaleti yerleştirir; altındaki boş hücreler aynı işlemde otomatik satın alınır (maliyet kartında arsa + yapı bedeli). Ayrı "arsa al" adımı ana akıştan çıkar.
- **Hazır arsalar (adalar):** ilçe, OSM yollarıyla çevrili adalara göre önceden 4–12 hücrelik arsalara bölünür; boş arsa tek tıkla alınır. Komşu boş araziye "Genişlet" tek tık.
- **Hücre ızgarası:** yalnız ileri düzey araç (Shift) ya da gizli.
- **Tasarım ilkesi:** arsa edinimi oyunun ilk dakikaları ve ara sıra genişleme; döngünün ağırlığı üretim, ticaret, yönetişim ve rekabette. ≤72 hücre / ≤%25 sınırı ve boş arsa vergisi biriktirmeyi kârsız tutar.
- **Uygulama:** F4 istemci entegrasyonunda; çekirdek ve sunucu değişmez (yalnız yerleşim + satın alma tek komut zinciri olarak gönderilir).

## Ek karar (1 Ekim, sahip): askeri güç ana eğlence ayaklarından biri
Döngünün dört ayağına (üretim, ticaret, ilçe/il yönetimi, rekabet) **askeri güç** beşinci ayak olarak eklendi. İlke: **parsel asla el değiştirmez**; savaş toprağı değil, **kontrolü** kazandırır.
- **Ne için savaşılır:** il/ilçe kontrolü (valilik ve muhtarlık seçimine aday gösterme hakkı, il vergi bandı, liman/ticaret yolu geçiş ücreti), ortak kaynakların (maden damarı, su, enerji hattı) kullanım payı, abluka ile rakibin pazara erişimini geciktirme, sınırlı yağma (depo stoğunun ≤%25'i).
- **Araçlar:** Ordugâh (birlik üretimi: mühimmat + gıda), il komutanlığında havuzlanan birlikler, savunma yapıları (karakol, sur/barikat), ittifaklar (lonca) ve ortak sefer.
- **Adalet (H5 korumaları):** savunanın seçtiği 4 saatlik yoğun saat bandı, ≥49 saat ara, binaların ≤%10'u geçici devre dışı, yeni oyuncuya 14 gün kalkan, hareketsiz oyuncuya saldırı ödülsüz.
- **Takvim:** Alfa-0'da Ordugâh + birlik üretimi + savunma ve **NPC eşkıya baskınları** (PvE; ekonomiye askeri talep yaratır). Alfa-1'de oyuncular arası il kontrol savaşları ve ittifaklar. Mevcut bölge kipi askeri modülü (`cekirdek/src/askeri/`) işletme düğümlerine taşınarak yeniden kullanılır.

## Ek karar (1 Ekim, sahip): strateji çekirdeği, yürüyüş adaptasyon katmanı, Türkiye öncelikli içerik
- **Tür:** oyun **strateji tabanlıdır, MMORPG değildir.** Sınıf seçimi, seviye, XP, beceri ağacı, ustalık kademesi gibi karakter ilerlemesi **yoktur.** İlerleme stratejik varlıklarda görünür: yapılar, üretim zincirleri, ilçeler, sözleşmeler, ittifaklar, makamlar, pazar payı, itibar.
- **Yürüyüş ve sunum (adaptasyon katmanı):** Capital Rift tarzı karakterle dolaşma (dükkâna/mağazaya girme, arsada yürüme, başka ilçelere gitme) ve oyun içi açılış sunumu, oyuncuyu oyuna alıştırmak ve dünyayı hissettirmek içindir; stratejinin yerine geçmez. Her işin harita/panelden karşılığı vardır; zorunlu taşıma, restok ve "uğramazsan kaybedersin" angaryası yoktur (docs/arastirma/capital-rift-mekanikleri.md §3.2). Yürüyüşün temeli Alfa-0'da bulunur; hareket hissi oyunsu (anında tepki, koşma, serbest kamera), sinematik değil.
- **Başlangıç ve yönelim:** sınıf yok; ilçenin coğrafyası ve imza ürünü yön önerir, rehberli ilk hedefler (ilk üretim, ilk satış, ilk sözleşme) stratejiyi öğretir; strateji değiştirmek yalnız ekonomik maliyetle (yeniden yatırım) olur, kilit yok (docs/arastirma/baslangic-ve-ustalik.md).
- **Yeni ve ilerlemiş oyuncu dengesi:** ₺50.000 hibe korunur; kalkan, ayrılmış hücreler, azalan getiri; ilerlemiş oyuncu yeni oyuncuyu ezmek yerine işe almaya/sözleşmeye teşvik edilir. Unvan ve başarımlar oyun avantajı vermez.
- **İçerik Türkiye üzerine kurulur:** gerçek coğrafi ve ekonomik yapı (il imza ürünleri, coğrafi işaretler, OSB, ticaret borsası, pazar günü). Mal sayısı 40 ile sınırlı değildir; kademeli yapı (ortak temel mallar + il imza ürünleri + nadir zanaat/coğrafi işaretli ürünler) karmaşayı önler. Tasarım Balkanlar ve diğer ülkelere genişlemeye açık kalır.
- **Canlı, gerçek zamanlı dünya:** dünya oyuncu yokken de işler; gerçek takvim ve saatle eşleşen ritimler (pazar günleri, bayramlar, seçim gecesi, fuarlar), NPC esnaf ve müşteriler, dönüşte özet.
- **Tür harmanı:** karşılaştırılan oyunların sunumu ve oynanış yapısı harmanlanır, kopyalanmaz; RPG örneklerinden yalnız sosyal ve sunum dersleri alınır (docs/arastirma/oyun-kimligi-harman.md).
