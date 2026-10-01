# Araştırma — Sokak Seviyesi 3D: Gerçek OSM Dünyasında Yürünebilir İstemci

> **Özet.** Türkiye + Balkanlar + Karadeniz diliminde, gerçek OpenStreetMap verisi üzerinde basit bir 3D karakterle yürünebilen bir web istemcisi araştırıldı. **Öneri:** üç görünüm düzeyi kurulsun. Mevcut three.js küre kalsın. İl → ilçe → parsel için tembel yüklenen bir **MapLibre GL** parçası eklensin. Yürüyüş için **ayrı bir three.js sahnesi** kullanılsın. Karolar **Protomaps PMTiles özütü** olsun: tek statik dosya, karo sunucusu yok. Arazi için Mapterhorn DEM kullanılsın. Karakter kontrolcüsü **kendimizin** olsun; Rapier/ecctrl kullanılmasın. Karakter Quaternius CC0 olsun. Parsel atomu, OSM ile kırpılan deterministik bir **z20 kare hücre ızgarası** (~30 m) olsun. İl ve ilçe OSM `admin_level` 4/6'dan alınsın.

**Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi. Kaynaklar satır içinde bağlıdır. **(tahmin)** işaretli sayılar ölçülmemiştir. Repo bağlamı yalnız kısaca okundu. **Hiçbir yığın için mobil fps verisi bulunamadı.** Capital Rift'in çizim yığını **doğrulanmadı**.

İlgili belgeler: [11 — Ürün Dönüşü](../11-urun-donusu.md) (F2, F5) · [3D teknoloji](3d-teknoloji.md) · [Açık kaynak ve veri](acik-kaynak-ve-veri.md) · [Arayüz ve UX](arayuz-ux.md)

---

## 1. Capital Rift ve benzer projeler yürünebilir OSM dünyasını nasıl çiziyor

**Capital Rift**
- Çizim yığını kamuya açık belgelenmemiştir. capitalrift.com'da teknik sayfa yok; "three.js" iddiası **doğrulanmadı**.
- Geliştiricinin özellik listesi ([TikTok](https://www.tiktok.com/@niksgames/video/7666487170605026591)) şunları söylüyor:
  - Dünya OpenStreetMap'ten çekiliyor; paylaşılan ve kalıcı; 4.000'den fazla oyuncu.
  - Oyuncular her yerde arsa alıyor, shift-tıkla birden çok seçiyor ve birleştiriyor.
  - Madenler "araziye gerçek bir çukur kazıyor".
  - Oyuncular yapılara giriyor ve çatı kesiliyor.
  - "Akış çizgileri" ve bir kapsam konsolu da var. Bu, sahibin reddettiği görsel tarzdır.
- Çıkarım: arsalar sabit parsel değil serbest seçimdir ve arazi biçimlendirilebilir. Akış çizgilerinin yerine sakin, durağan simgeler gelmelidir.

**Aday projeler**

| Proje | Olgular | Değerlendirme |
|---|---|---|
| [Streets GL](https://github.com/StrandedKitty/streets-gl) | 1,1k yıldız, MIT, WebGL2. Kendi planetiler vektör karolarını kullanır. Arazi Esri 3D'den | Karo ve geometri hattı için en iyi referans. Çizicisi (SSAO, TAA, PBR) "modern ayrık GPU" ister; çalışma zamanında kullanılmasın |
| [OSM2World](https://github.com/tordanik/OSM2World) | 784 yıldız, MIT, Java; glTF ve 3D Tiles dışa aktarır | Yalnız öne çıkan alanların çevrimdışı pişirilmesine yarar |
| [OSMBuildings](https://github.com/kekscom/osmbuildings) | 514 yıldız, BSD-2. Leaflet ve OpenLayers için klasik 2,5D | Uygun değil |
| [ViziCities](https://github.com/ViziCities/ViziCities) | 2,7k yıldız, BSD-3. Eski three.js | Güncel etkinlik doğrulanamadı. Atla |
| [three-geo](https://github.com/w3reality/three-geo) | 1,4k yıldız, MIT | Mapbox jetonu ister ve yalnız arazi yapar. Atla |
| three-js-osm, 3D GeoTile ([forum](https://discourse.threejs.org/t/3d-geotile-dynamic-tile-based-rendering-engine-with-three-js-openstreetmap/79325)) | Overpass'ı canlı çağıran oyuncak ya da kapalı kaynak demolar | Overpass bir oyun için uygun değil |

- **Overture binaları** ODbL'dir; birincil kaynak OSM, artı ML ayak izleri ([belgeler](https://docs.overturemaps.org/guides/buildings/)). İsteğe bağlı boşluk doldurucu. Türkiye kapsamı **doğrulanmadı**.
- **Yapılabilirlik.** Vektör karolardan stilize ekstrüzyon + şerit yollar yaygın bir desendir. Geometri karo başına birleştirilirse orta sınıf dizüstünde rahat olduğu değerlendirilir. Mobil için olağan rehber ~50–100 çizim çağrısıdır ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). Telefonlar yalnız §7'deki bütçelerle makul görünüyor.

## 2. Önerilen mimari

**Üç görünüm düzeyi**
1. **Küre ve bölge:** mevcut three.js stilize küre (three 0.186, tam paket ~185 KB gzip).
2. **Kademeli harita (il → ilçe → parsel):** tembel yüklenen **MapLibre GL** parçası.
   - MapLibre BSD-3, ~285 KB gzip, küre projeksiyonunu destekliyor ([v5.0.0](https://github.com/maplibre/maplibre-gl-js/releases/tag/v5.0.0)).
   - Vektör karolarda parsel seçimi ve feature-state vurgusu kolaydır.
3. **Yürüyüş modu:** MapLibre özel katmanı değil, **ayrı bir three.js sahnesi**.
   - [Özel katman yolu](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-to-globe-using-threejs/) projeksiyon başına matris hesabı ve paylaşılan GL bağlamı ister.
   - Yürüyüş, kayan orijinli yerel metre çerçevesi kullanır. Yaklaşık 3×3 z15 karo, kabaca 2×2 km kaplar (40°K'de bir z15 karo ~0,9 km).

**Karo kaynağı karşılaştırması**

| Seçenek | Artı | Eksi |
|---|---|---|
| **Protomaps PMTiles özütü** (önerilen) | HTTP aralık istekli tek statik dosya, karo sunucusu yok. `pmtiles extract --bbox/--region --maxzoom` uzaktaki gezegen derlemesine karşı çalışır ([CLI](https://docs.protomaps.com/pmtiles/cli)). PMTiles 3,1k yıldız, BSD-3, spesifikasyon CC0 ([repo](https://github.com/protomaps/PMTiles)) | Şema OpenMapTiles değil Protomaps v4. Binalarda `height`/`min_height` var. z0–14'te binalar birleştirilmiş; yalnız z15'te (azami) tekil binalar var ([katmanlar](https://docs.protomaps.com/basemaps/layers)). Çıktı ODbL, atıf zorunlu ([indirmeler](https://docs.protomaps.com/basemaps/downloads)) |
| **Kendi planetiler derlemesi** | [planetiler](https://github.com/onthegomap/planetiler) Apache-2.0, 2,2k yıldız, Java 21+, PBF'nin en az 0,5 katı boş RAM ister. Özel profil yalnız bina, yol, arazi kullanımı ve suyu tutabilir; parsel uygunluk niteliklerini ekleyip PMTiles yazabilir. Streets GL böyle yapıyor | Bir Java derleme hattı işletirsin |
| **tippecanoe** | [felt/tippecanoe](https://github.com/felt/tippecanoe) BSD-2, 1,6k yıldız, PMTiles yazar | PBF okumaz. Yalnız kendi türetilmiş katmanlarımız için (idari sınırlar, parseller, sahiplik katmanları) |

- **Boyut (tahmin).**
  - Geofabrik PBF'leri: Türkiye 618 MB, Romanya ~320 MB, Yunanistan 325 MB, Bulgaristan 175 MB ([Türkiye](https://download.geofabrik.de/europe/turkey.html), [Bulgaristan](https://download.geofabrik.de/europe/bulgaria.html), [Romanya](https://download.geofabrik.de/europe/romania.html), [Yunanistan](https://download.geofabrik.de/europe/greece.html)).
  - Tüm dilim yaklaşık 2–2,5 GB PBF.
  - Protomaps gezegeni z0–15 için ~120 GB; bu yüzden dilim için **2–4 GB** bekleniyor (tahmin, **ölçülmedi**).
- **Kendi barındırma.** Tek dosya nesne depolama + CDN'e konur. Protomaps derlemelerine doğrudan bağlantı verilmez; belgeleri karo setlerini kendi deponuza kopyalamanızı istiyor.
- **Protomaps özütüyle başla.** Özel planetiler profiline yalnız Protomaps karoları ağır gelirse ya da nitelik eksikse geç.
- **Worker'da çözme.** `pmtiles` (~7,7 KB gzip), `@mapbox/vector-tile` (~2 KB) ve `pbf` (~2,6 KB) ile zaten bağımlılık olan `earcut` kullanılır. Worker birleştirilmiş tipli dizi geometrisi kurar ve aktarılabilir olarak döndürür.
- **Arazi.** [Mapterhorn](https://github.com/mapterhorn/mapterhorn) kullanılır: BSD-3 kod, Terrarium kodlu WebP, 512 px karo ([veri erişimi](https://mapterhorn.com/data-access)).
  - Atıf kataloğunda Türkiye ya da Balkanlar için ulusal yüksek çözünürlüklü DEM yok; yalnız 30 m'lik Copernicus GLO-30 var ([attribution.json](https://download.mapterhorn.com/attribution.json)).
  - Yaklaşık z12 kalitesinde arazi beklenir; stilize görünüm için yeterli.
  - Bölgenin PMTiles özütü kendi sunucumuzda barındırılır. Yedek seçenek AWS Terrarium.
  - Zorunlu atıf gösterilir.
- **Lisans.** Atıf "© OpenStreetMap katkıcıları" olmalı. ODbL'de çizilmiş sahne bir Üretilmiş Eser'dir (Produced Work). Ama §4.6 yine de alttaki veritabanının erişilebilir olmasını ister ([OSMF rehberi](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline)). **Hukuki inceleme gerekir.**

## 3. Üçüncü şahıs karakter kontrolcüsü

- **Rapier ve ecctrl kullanılmasın.**
  - Rapier wasm'ı ham 3,08 MB; uyumluluk derlemesi 1,6 MB gzip ([npm](https://www.npmjs.com/package/@dimforge/rapier3d)).
  - Eski rapier.js reposu 12 Temmuz 2026'da arşivlendi ve dimforge/rapier'e katıldı ([repo](https://github.com/dimforge/rapier.js)).
  - [ecctrl](https://github.com/pmndrs/ecctrl) MIT, 802 yıldız; ama React Three Fiber ve Rapier ister.
- **Kendi kinematik kontrolcümüz.**
  - Zemin, DEM yükseklik alanı çift doğrusal örneklenerek izlenir. Yollar ve binalar aynı örneklerle zemine oturtulur.
  - Çarpışma 2B'dir: daire ile bina ayak izi kenarları, uzamsal karma ile.
  - Hareket tıkla-git ile düz çizgide; duvar boyunca kayarak.
  - İsteğe bağlı: ileride yol bulma istenirse [three-mesh-bvh](https://github.com/gkjohnson/three-mesh-bvh) (MIT, ~29 KB gzip) ya da `recast-navigation` (MIT).
- **Kamera.** Yumuşatmalı küresel ofsetli takip kamerası. Karakteri örten binalar soldurulur ya da kesilir; Capital Rift çatılarda bunu yapıyor.
- **Varlıklar.**
  - [Quaternius Universal Base Characters](https://quaternius.com/packs/universalbasecharacters.html) (CC0, glTF ve FBX, insansı iskelet) + Universal Animation Library (120'den fazla animasyon, CC0). **Önerilen çift budur.**
  - [Kenney](https://kenney.nl/assets/category:3D) CC0'dır; aksesuarlar için City ve Factory kitleri var. Karakter yelpazesi zayıf.
  - [Mixamo](https://helpx.adobe.com/creative-cloud/faq/mixamo-faq.html) oyunlarda telifsiz, ama ham dosyalar yeniden dağıtılamaz. CC0 daha temiz seçim.

## 4. Arazi parselleri

- **Kadastro seçenek dışı.** TKGM Parsel Sorgu görüntülemek için ücretsiz; ama ticari kullanım yasak ve web servisleri TKGM izni gerektiriyor ([TKGM](https://parselsorgu.tkgm.gov.tr/); arama özetinden, doğrudan okunmadı). OSM'de kadastro yok. Bu yüzden oyun parselleri kurgusaldır.
- **Öneri: deterministik kare ızgara.**
  - Atom: Web Mercator z20 quadkey hücresi. 40°K'de ~29 m. 36–48°K arasında z19 karo başına kabaca 50–60 m.
  - Oyuncular tek hücre, çok hücre (shift-tık) ya da birleşik hücre alır; Capital Rift'e uyar.
  - Sahiplik hücre kimliğiyle seyrek tutulur.
  - Mercator alanı 36°'den 48°K'ye ~%28 değişir. Denge önemliyse oyun matematiği UTM metre çerçevesinde yapılır.
- **Uygunluk.** Her hücre OSM verisiyle kırpılır. Yol tamponları, su, `landuse=military` ve korunan alanlar alınamaz. Bina ayak izleri ya engellenir ya hücreyle birlikte satılır. Arazi kullanım etiketleri (farmland, industrial) hangi yapıya izin verildiğini belirler.
- **İkincil katman olarak H3.** [H3 res 10](https://h3geo.org/docs/core-library/restable/) kenarı 76 m, alanı ~15.000 m². Res 9 ve 8 sahiplik ısı haritası gibi toplu katmanlara uyar. H3 altıgenleri ızgaraya oturan inşa için garip olduğundan parsel atomu yapılmaz. h3-js ~65 KB gzip.
- **Hukuki uyarı.** OSM'den kırpılan uygunluk bir türetilmiş veritabanı sayılabilir. Türetilmiş uygunluk verisi ODbL ile yayımlanmalı; sahiplik verisi hücre kimliğiyle ayrı tutulmalı.

## 5. İdari sınırlar

- **OSM ilişkileri tercih edilir**, çünkü ODbL onaylandı. Türkiye'de admin_level 4 il, 6 ilçe, 8 mahalledir. Bir [topluluk veri setine](https://github.com/osadikoglu/turkey-admin-units-osm) göre: ODbL, 81 il, 973 ilçe, 13.793 mahalle (anlık görüntü 2026-09). Bu yalnız Türkiye için doğrulandı. Bulgaristan, Romanya, Yunanistan, Sırbistan, Gürcistan ve Ukrayna [OSM wiki](https://wiki.openstreetmap.org/wiki/Tag:boundary=administrative)'den tek tek kontrol edilmeli; ülke tablosu çıkarılamadı.
- **geoBoundaries** ([site](https://www.geoboundaries.org/), ülke başına API). Lisanslar ülkeye ve düzeye göre değişir:
  - Türkiye: ADM1 CC BY-SA 2.0 (81 birim), ADM2 ODbL (999 birim, 2021). 999 sayısı OSM'deki 973 ilçeyle çelişir; temizlik gerekir.
  - Bulgaristan: kamu malı (28 oblast, 265 belediye).
  - Romanya: CC BY 4.0 (42 județ, 3.235 komün).
  - Yunanistan: CC BY 4.0, ama ADM2'de yalnız 14 birim var; belediyeler için işe yaramaz.
  - Sırbistan: ODbL.
  - Gürcistan: ADM1 CC BY 3.0, ADM2 kamu malı.
  - Ukrayna: ADM1 ODbL, ADM2 kamu malı (2006 tarihli).
  - Arnavutluk, Hırvatistan, Kosova ve Moldova'da CC BY-SA, CC BY 2.5 ve CC BY 3.0 IGO karışık.
  - Karadağ ve Moldova ADM2 hata döndürdü. geoBoundaries yalnız yedek sayılsın.
- **Hiyerarşi.**
  - Bölgeler bizim tanımımızdır; küre Natural Earth admin-1 kullanır (kamu malı, repoda zaten var).
  - İl ve ilçe OSM'den gelir: osmium ile çıkarılır, mapshaper ile sadeleştirilir.
  - İl sınırları tek küçük dosyada gönderilir (birkaç yüz KB, tahmin). İlçeler il başına tembel yüklenir (her biri 20–60 KB, tahmin). Bu boyutlar **ölçülmedi**.
  - Ağacın kurulması için her birime bir `parent` kimliği eklenir.

## 6. Yapı yerleştirme ve inşa

- **Yerleştirme.** Parsel içinde 2 m alt ızgaraya oturur. Her hücre, dolu alt hücrelerin bit maskesidir. Doğrulama iki testten oluşur: ayak izi sahip olunan hücrelere sığıyor mu, eğim DEM'e göre uygun mu.
- **İnşa aşamaları.** Temel çıkartması (ayak izi içinde arazi düzleştirilir) → iskele (örneklenmiş ince kutular) → gövde (ağ, kırpma düzlemiyle Y'de büyür) → bitmiş (son ağa geçilir).
- **Aşamayı sunucu zamanı belirler.** Aşama `(şimdi − başlangıç) / süre` fonksiyonudur; sunucu tik atmaz.
- **Örnekleme.** Yaklaşık 20 yapı türü; parça başına tür başına bir `InstancedMesh`, her birinde en çok ~1.000 örnek.
- **Sakin görsel.** Akış çizgilerinin yerine yapılarda simge rozetleri ve yalnız seçili öğe için durağan noktalı rota.

## 7. Hedefli aşamalı plan (hepsi hedef, ölçüm değil)

| Aşama | Kapsam | Hedefler |
|---|---|---|
| **P0** | Karo ve araziyi kanıtla. Bir ilçenin z15 Protomaps özütü. Worker 2×2 km için zemin, yol şeritleri ve ekstrüde binaları kurar | Karo başına aktarım ≤150 KB. ≤60 çizim çağrısı. Entegre GPU'lu dizüstünde 60 fps |
| **P1** | Yürüyüş modu. Kinematik kontrolcü, Quaternius karakter, takip kamerası, bina çarpışması | Karakter GLB ≤1,5 MB (meshopt ya da Draco). İlk JS bugünkü kabuk boyutunda; MapLibre ve yürüyüş parçaları tembel. Orta telefonda 30+ fps |
| **P2** | MapLibre'de kademeli harita (bölge → il → ilçe → parsel). OSM idari çıkarımı. Izgara uygunluk kırpması. Parsel satın alma akışı | İl sınırları tembel yüklenir. Seçim anlık hissettirir |
| **P3** | İnşa, paylaşılan kalıcılık, diğer oyuncular ve NPC'ler | Sunucu sahipliği ve aşamayı hücre kimliğiyle tutar. Örneklenmiş yapılar çizim çağrısı bütçesinde kalır |

Bu aşamalar [11 §5](../11-urun-donusu.md#5-fazlar-f0f7)'te F2 (veri), F4 (harita) ve F5 (yürüyüş) olarak yeniden sıralanmıştır.

## Ana riskler

- **Capital Rift'in yığını doğrulanmadı.** Motoru hakkındaki hiçbir iddiaya güvenme.
- **ODbL kapsamı.** Türetilmiş parsel uygunluk verisinin yayımlanması gerekebilir; Üretilmiş Eser kuralı hukuki inceleme ister.
- **Karo boyutu.** Dilim için 2–4 GB tahmini doğrulanmadı. P0'da gerçek bir özütle ölçülmeli.
- **Arazi çözünürlüğü.** Türkiye ve Balkanlarda ~30 m arazi yürüyüş için kabadır. Yolların zemine oturtulması düzeltme isteyebilir.
- **Mobil performans.** Bu yaklaşım için mobil fps verisi yok; P0 ve P1'de erken ölçülmeli.
- **Hiyerarşi boşlukları.** Ülke başına admin_level eşlemeleri ve sınır kalitesi (Yunanistan, Gürcistan, Ukrayna) doğrulanmadı.
