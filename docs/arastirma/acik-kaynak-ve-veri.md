# Araştırma — Açık Kaynak Referanslar, Açık Veri, Veri Hattı ve Hukuki Notlar

> **Özet.** Bu rapor üç soruyu yanıtlar: (1) benzer açık kaynak projelerden ne öğrenilir ve hangisinin **koduna dokunulmaz**; (2) gerçek dünya bölge verisi (toprak, iklim, maden, sanayi, liman, nüfus, ticaret) hangi **açık kaynaklardan ve lisansla** alınır; (3) bu veriler çevrimdışı bir Node/TypeScript hattıyla nasıl bölge başına küçük bir JSON'a indirgenir. **Temel ilke ([00 K22](../00-vizyon-ve-kararlar.md)):** GPL/AGPL kod kopyalanmaz (yalnızca tasarım referansı), ticari olmayan (NC) veri kaynakları kullanılmaz, OSM türevi veri ayrı ODbL dosyasında tutulur. Bölge verilerinin altı katmana eşlemesi [08](../08-alti-katman.md) içindedir; ilk dilim Türkiye + Balkanlar + Karadeniz'dir (K18).

**Güvenilirlik.** Yıldız sayıları ve son gönderim tarihleri GitHub API'sinden **2026-09-30** itibarıyladır. **"(doğrulanmadı)"** işaretli lisanslar bellekten alınmıştır, getirilen bir kaynaktan değil. Bu rapor hukuki tavsiye değildir; yayın öncesi hukuki inceleme önerilir (§4).

İlgili belgeler: [00 — Vizyon ve Kararlar](../00-vizyon-ve-kararlar.md) (K18, K22) · [08 — Altı Katman](../08-alti-katman.md) · [3D teknoloji](3d-teknoloji.md) · [03 — Teknik Mimari](../03-teknik-mimari.md)

---

## 1. İncelenecek açık kaynak projeler

| Proje | Yıldız / son gönderim / lisans | Öğrenilecek | Lisans notu |
|---|---|---|---|
| [OpenFrontIO](https://github.com/openfrontio/OpenFrontIO) | 2,7 bin / 2026-09-30 / **AGPL-3.0** (varlıklar CC BY-SA 4.0) | TypeScript. İstemci ve sunucudan ayrı, deterministik `/src/core` simülasyonu. Gerçek coğrafyadan harita üreten `/map-generator`. Kompakt ikili ağ biçimi `/zbin`. | AGPL + zorunlu "Based on OpenFront" atfı. **İncele, kod veya varlık kopyalama.** WarFront.io'dan türemiş ([README](https://github.com/openfrontio/OpenFrontIO)). |
| [Symphony of Empires](https://github.com/symphony-of-empires/symphony-of-empires) | 154 / 2023-04-29 (**bakımsız**) / **GPL-3.0** | Tasarımımıza en yakını: fabrikaların "sipariş", üreticilerin "teslim" bileti bıraktığı Victoria benzeri nüfus/sanayi ekonomisi; taşıma şirketleri eşleştirir. Günde 48 tik ([genel bakış](https://symphony-of-empires.github.io/)). | Yalnızca fikir için oku. GPL-3 bulaşıcıdır. |
| [OpenTTD](https://github.com/OpenTTD/OpenTTD) | 8,3 bin / 2026-09-30 / **GPL-2.0** | Cargodist: mal başına `LinkGraph`; iş parçacığında çok-mal akışı (MCF) çalıştırılıp kenarlara yazılır ([belge](https://docs.openttd.org/source/dd/d29/classLinkGraph), [deepwiki](https://deepwiki.com/OpenTTD/OpenTTD/5.7-link-graph-and-cargo-distribution)). Lojistik ağımız için en iyi model. | Algoritmayı yayımlanmış açıklamadan (kapasite, talep, mesafe üzerinde MCF) **yeniden yaz;** kod kopyalama. |
| [Unciv](https://github.com/yairm210/Unciv) | 11,4 bin / 2026-09-30 / **MPL-2.0** | Veri güdümlü JSON kuralları/modları ve kural setinin motordan temiz ayrımı. | MPL-2.0 dosya düzeyinde copyleft; grubun en az riskli olanı. Kopyalanan dosyalar MPL kalır. |
| [Freeciv-web](https://github.com/freeciv/freeciv-web) | 2,2 bin / 2026-03-27 / **AGPL-3.0** | HTML5/WebGL istemci, sunucu yetkili model. Yedek harita fikirleri. | AGPL. Yalnızca fikir. |
| [Mindustry](https://github.com/Anuken/Mindustry) | 29,2 bin / 2026-09-30 / **GPL-3.0** | Verim ve tampon akış lojistiği, eşya hızı dengeleme. | GPL. Yalnızca fikir. |
| [Widelands](https://github.com/widelands/widelands) | 3,1 bin / 2026-09-28 / **GPL-2.0** (karışık CC varlıklar) | Settlers tarzı ekonomi: Lua ve JSON ile tanımlı üretim yerleri, ekonomi hedefleri, rota istekleri. | GPL. Yalnızca fikir. |
| [Simutrans](https://github.com/simutrans/simutrans) | 101 (yeni ayna) / 2026-09-30 / **Artistic License 1.0** | Yolcu/posta/mal talebiyle fabrika zincirleri, sanayi tedarik zincirleri. | Artistic lisansı daha serbest ama değiştirilmiş sürümlerin adlandırma koşulları var. Yeniden kullanmadan önce oku. |

Freeciv-web lisansı [Wikipedia](https://en.wikipedia.org/wiki/Freeciv) ve [GitHub](https://github.com/freeciv/freeciv-web)'dan; Simutrans lisansı [license.txt](https://github.com/aburch/simutrans/blob/master/simutrans/license.txt) ve [Wikipedia](https://en.wikipedia.org/wiki/Simutrans)'dan alındı.

Bakımı süren, listelemeye değer bir tarayıcı tabanlı Victoria veya Factorio benzeri klon **bulunamadı.** "Open Victoria" doğrulanamadı; tahmin yürütmek yerine listeden çıkarıldı.

> **Kural ([00 K22](../00-vizyon-ve-kararlar.md)).** Her GPL veya AGPL projeyi **yalnızca tasarım referansı** say. Algoritma açıklamalarından yeniden yaz; kendi kodumuzu onlarla ilişkisiz tut. Yalnızca MPL-2.0 (Unciv) sınırlı yükümlülükle dosya düzeyinde yeniden kullanıma izin verir. AGPL kodunu barındırılan bir tarayıcı oyununda yayınlamak, kaynağı kullanıcılara açmayı zorunlu kılar. Mevcut `lojistik/mcf.ts` zaten yayımlanmış açıklamadan yazılmıştır.

## 2. Açık veri

| Alan | Kaynak | Lisans | Biçim | Notlar |
|---|---|---|---|---|
| Ürün uygunluğu | [FAO GAEZ v5](https://data.apps.fao.org/catalog/iso/66bfe451-c6da-4edd-940e-cb4b0b83725a) | CC BY 4.0 | GeoTIFF, ~1 km, 70+ ürün, Google Cloud Storage | Bölge başına zonal ortalama. En iyi tek tarım arazisi sinyali. |
| Verim ve üretim | FAOSTAT | [CC BY-NC-SA 3.0 IGO](https://creativecommons.org/licenses/by-nc-sa/3.0/igo/deed.en) | CSV | **Ticari olmayan.** Ticari kullanım için FAO [lisans talebi](https://www.fao.org/contact-us/licence-request) gerekir. **Kullanılmaz;** en fazla çevrimdışı kalibrasyon referansı, ya da World Bank/BACI/GAEZ rakamlarıyla değiştirilir. |
| Ürün takvimleri | [MIRCA-OS](https://www.nature.com/articles/s41597-024-04313-w) (HydroShare) | Kayıtta kontrol et (olasılıkla CC BY; **doğrulanmadı**) | 5 yay dakikası GeoTIFF/NetCDF + takvim CSV | 23 ürün için ekim ve hasat ayları. Bölge başına zonal istatistik. |
| İklim | [CHELSA v2.1](https://www.chelsa-climate.org/datasets/chelsa_climatologies) | **CC0** | GeoTIFF, 30 yay saniyesi | **Bunu kullan.** [WorldClim 2.1](https://worldclim.org/about.html) CC BY-NC-SA 4.0'dır, ticari olarak kaçınılmalı. |
| Toprak | [SoilGrids](https://isric.org//explore/soilgrids) | CC BY 4.0 | 250 m COG | Küresel veri büyük. 1000 m toplamlarını kullan veya bulut-optimize GeoTIFF'leri akıt. |
| Madenler | [USGS MRDS / MRData](https://mrdata.usgs.gov/catalog/cite-view.php?cite=23) | Kamu malı | DBF, shapefile, KML | Emtia ve rezerv bilgili yataklar. Veri eskidir; USGS Mineral Commodity Summaries ile birleştir. |
| Çelik ve kömür | [GEM](https://globalenergymonitor.org/creative-commons-public-license/) Iron and Steel, Coal Mine ve Coal Plant izleyicileri | CC BY 4.0 | XLSX/CSV, her biri ≈ 1–7 bin satır | Bölge başına kapasite toplamına uygun. Atıf indirme dosyalarına gömülü. |
| Enerji | [WRI GPPD](https://github.com/wri/global-power-plant-database) | CC BY 4.0 | CSV, ≈ 35 bin santral | v1.3.0'dan beri **bakımsız.** GEM izleyicileriyle birleştir. |
| Limanlar | [NGA World Port Index](https://data.humdata.org/dataset/world-port-index) | Kamu malı | Shapefile / Access | ≈ 3,8 bin liman; liman büyüklüğü ve derinliği. |
| Havalimanları | [OurAirports](https://ourairports.com/data/) | Kamu malı | CSV | İsteğe bağlı, hava kargo katmanı için. |
| Dar boğaz ve liman trafiği | [IMF PortWatch](https://portwatch.imf.org/pages/data-and-methodology) | IMF koşulları; ticari olmayan/araştırma için ücretsiz | API, CSV | 28 dar boğaz ve 2 065 liman. **Ticari koşullar belirsiz;** IMF'ye sor. Alternatif: ≈ 10 dar boğazı kamuya açık bilgiden elle gir. |
| Karayolu ve demiryolu | OSM, Geofabrik | [ODbL](https://opendatacommons.org/licenses/odbl/1-0/) | .osm.pbf, gezegen ≈ 70 GB | Yalnızca bölge merkezleri arası ana rota ve demiryolu mesafelerini çıkar. Ham çıkarımları yayınlama. **Tercih:** Natural Earth yol/demiryolu (kamu malı). |
| Nüfus | [WorldPop](https://www.worldpop.org/faq/) | CC BY 4.0 | GeoTIFF | Düz CC BY. |
| Nüfus | [GHS-POP](https://data.jrc.ec.europa.eu/dataset/2ff68a52-5b5b-4a22-8f40-c41da8332cfe) | CC BY 4.0 | GeoTIFF | Düz CC BY. |
| Nüfus | [Kontur](https://data.humdata.org/dataset/kontur-population-dataset) | CC BY, **ama** OSM verisi karıştırır | GeoPackage, H3 r8, ≈ 400 m altıgen | OSM bileşeni ODbL'yi tetikleyebilir. **WorldPop veya GHSL tercih et.** |
| Ticaret | [CEPII BACI](https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html) | Etalab 2.0 (yalnızca atıf) | CSV, HS6 | Ticaret akışları için bunu kullan. [UN Comtrade](https://www.comtrade.com/terms-of-use/) ticari değildir ve yeniden dağıtımı yasaklar. |
| GSYH | World Bank WDI | CC BY 4.0 (**doğrulanmadı**) | CSV/API | Ülke başına GSYH ve sektör payları. |
| Bölgeler | [Natural Earth](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/) admin-1 | Kamu malı | Shapefile/GeoJSON | Fiilî sınırları gösterir. 30–60 bölge için uygun. |
| Bölgeler | [geoBoundaries](https://github.com/wmgeolab/geoBoundaries) | CC BY 4.0 | GeoJSON | CGAZ varyantı ABD Dışişleri tanımlarını izler. Standart set her ulusu kendi kendini temsil ettiği gibi gösterir. |

**Bunların hepsi çevrimdışı olarak bölge başına küçük JSON'a toplanabilir.** Rasterlar zonal istatistiğe, nokta veri kümeleri sayı ve toplamlara dönüşür. Çıktı 60 bölge için birkaç yüz KB, tüm dünya için birkaç MB'dır.

### 2.1 Kullanım sınıflaması (proje kararı, K22)

| Sınıf | Kaynaklar |
|---|---|
| **Kullanılır (atıfla)** | GAEZ, CHELSA (CC0), SoilGrids, MIRCA-OS (lisans kontrolüyle), GEM, WRI GPPD, WorldPop / GHS-POP, CEPII BACI, geoBoundaries, World Bank WDI (doğrulanınca), Natural Earth, NGA WPI, USGS MRDS, OurAirports |
| **Kullanılır (özel koşulla)** | OSM türevi (ayrı **ODbL** dosyası + atıf; tercihen Natural Earth yolları) |
| **Kullanılmaz** | FAOSTAT (NC), WorldClim (NC), GADM (akademik/NC), UN Comtrade (NC, yeniden dağıtım yasak), Kontur (OSM karışımı), IMF PortWatch (izin alınmadıkça) |

### 2.2 Katmanlara eşleme

| Katman | Veri | Kaynak |
|---|---|---|
| Tarım | toprak tabanı, tesis tavanı, iklim tipi, hasat eğrisi | GAEZ, SoilGrids, CHELSA, MIRCA-OS |
| Sanayi | damar ölçeği, çelik/kömür/santral kapasitesi | USGS MRDS, GEM, WRI GPPD |
| Lojistik | liman sınıfı, mesafe/süre, kenar iklim profili | NGA WPI, Natural Earth (yol/demiryolu), DEM, CHELSA |
| Pazar | mal bazlı ticaret ağırlıkları | BACI, NGA WPI |
| Devlet | bölge nüfusu, sektörel yapı | WorldPop / GHS-POP, WDI |
| Teknoloji | — (tasarım verisi) | — |

Ayrıntılı dönüşüm kuralları [08](../08-alti-katman.md) içinde her katmanın "Gerçek veri kaynağı" bölümündedir.

## 3. Önerilen çevrimdışı hat (Node/TypeScript)

1. **İndir** (`scripts/data/fetch.ts`): `undici` ile indir, sağlama toplamı manifesti doğrula, `data-raw/` altında önbellekle (gitignore) ve her kaynağın lisans ve sürümünü `DATA_SOURCES.md`'ye yaz.
2. **Bölgeler:** Natural Earth admin-1, ardından admin-1 kimliklerini oyun bölgelerine eşleyen elle yazılmış `regions.config.json`. `mapshaper` (Node CLI) ile birleştir ve sadeleştir. Oyun çokgenlerini GeoJSON veya TopoJSON yaz.
3. **Komşuluk:** paylaşılan sınırları bulmak ve merkez mesafelerini hesaplamak için `@turf/*` + `flatbush`. Kenarları kara, deniz veya boğaz olarak sınıfla. Arazi cezaları ortalama DEM eğiminden gelir. DEM, Copernicus GLO-90 veya SRTM (lisansı doğrula; ETOPO kamu malıdır).
4. **Raster zonal istatistik:** GeoTIFF'leri `geotiff` (geotiff.js) ile oku ve bölgelere topla. Altıgen gruplama için `h3-js`.
   - Kaynaklar: GAEZ uygunluğu, CHELSA, SoilGrids, MIRCA-OS, WorldPop veya GHSL.
   - Ağır alternatif: GDAL `gdal_translate` ve `gdal_rasterize`, veya Python `rasterstats`. Yalnızca Node okuyucusu 1 km küresel rasterlarda çok yavaşsa kullan. Önce sınırlayıcı kutulara kırp.
5. **Nokta veri:** GEM, WRI, USGS MRDS, NGA WPI ve OurAirports'u `point-in-polygon` ile bölgelere bağla, `duckdb` (`@duckdb/node-api`) ile topla. DuckDB CSV, Parquet ve GeoJSON da okur.
6. **Lojistik:** Geofabrik `.pbf`'den `osmium-tool` ile yalnızca ana yol ve demiryolu ağını çıkar. Bir yönlendirme kütüphanesiyle bölge merkezleri arası yol ve demiryolu mesafelerini hesapla. Sonucu kenar listesine göm. (Hukuki not için §4; tercihen Natural Earth yolları.)
7. **Çıktı:** `regions.json` (kimlik, çokgen referansı, nüfus, ürün uygunluğu ve verim bazlı ekili alan, rezervler, limanlar, km ve arazi ile demiryolu/karayolu kenarları) ve yalnızca harita için isteğe bağlı `tippecanoe` ile PMTiles. `zod` ile doğrula ve CI'da anlık görüntü testi yap.

**Ağır bağımlılıklar:** GDAL (isteğe bağlı), `osmium-tool` ve `tippecanoe` (yerel ikili dosyalar), SoilGrids ve gezegen dosyası çekilirse ≈ 100 GB disk. İlk 30–60 bölge için yalnızca Node yolu (`geotiff`, `mapshaper`, `turf`, `h3-js`, `duckdb`) yeterlidir.

**Proje bağlantısı.** Hattın çıktısı, veri paketindeki gerçek harita sözleşmesine (`konum`, `sinirDosyasi`, `atif`; [veri/tipler.ts](../../packages/veri/src/tipler.ts)) ve altı katmanın bölge alanlarına ([08](../08-alti-katman.md): `tarim`, `liman`, `iklimProfili`, `rezervler`) bağlanır. Dilimin bölge listesi (A1) ve sınır/isim politikası (A2) hat çalışmadan önce yazılı olmalıdır.

## 4. Hukuki ve etik notlar

- **ODbL ve share-alike.** Türev bir veri tabanı ODbL ile sunulmalıdır. "Üretilmiş Eser" (örneğin çizilmiş bir harita) share-alike'a bağlı değildir ama sağlayıcı veriyi veya yeniden üretme araçlarını sunmalıdır. OSMF kuralı: "Yayımlanan sonuç özgün verinin çıkarılması için tasarlandıysa, Üretilmiş Eser değil veri tabanıdır" ([kılavuz](https://osmfoundation.org/wiki/Licence/Community_Guidelines/Produced_Work_-_Guideline), [SSS](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ)). OSM türevi yol veya demiryolu mesafeleri içeren bölge başına JSON'u yayınlarsak bu JSON büyük olasılıkla Türev Veri Tabanıdır ve ODbL olmalıdır. [Toplu Veri Tabanı Kılavuzu](https://wiki.openstreetmap.org/wiki/Collective_Database_Guideline), OSM'den türeyen kısmın ayrı tutulup geri kalanın share-alike'tan **serbest** kalmasını sağlar. **Azaltma:** OSM türevi tabloları ayrı dosyada tut, o dosyayı ODbL ile yayınla ve "© OpenStreetMap contributors" göster. Alternatif olarak OSM türevi sayılardan kaçınmak için Natural Earth yolları ve demiryolunu (kamu malı) kullan veya bir OSMF avukatına danış. **Yayından önce hukuki inceleme yaptır.**
- **Ticari yayında kaçınılacaklar:** FAOSTAT (CC BY-NC-SA), WorldClim (CC BY-NC-SA), UN Comtrade ve açık izin olmadan PortWatch.
- **Atıf.** GAEZ, SoilGrids, GEM, GHSL, WorldPop, WRI, BACI ve geoBoundaries'in hepsi atıf ister. `DATA_SOURCES.md`'den üretilen bir `CREDITS` sayfası ve oyun içi Hakkında ekranı tut.
- **Sınırlar ve isimler.** Tek bir belgelenmiş politika seç: Natural Earth fiilî çizgileri veya geoBoundaries CGAZ seti (ABD Dışişleri tanımları). İhtilaflı bölgeleri tarafsız adlarla göster ("Kırım" / "Kırım Özerk Cumhuriyeti", "Tayvan", "Keşmir") ve tavır almak yerine üzerine gelince açıklama notu koy. Hedef pazarlardaki yerel hukuku kontrol et (örn. Hindistan ve Çin harita kuralları). Kanonik anahtar olarak görünen adlar değil **bölge kimlikleri** kullan. *Proje bağlantısı:* Türkiye + Balkanlar + Karadeniz diliminde ihtilaflı bölgeler ve güncel çatışma alanları vardır; bu yüzden [00 A2](../00-vizyon-ve-kararlar.md) dilim verisinden **önce** yazılmalıdır.
- **Kod.** GPL veya AGPL kodu, yayınlamadan özel veya ticari bir ürüne kopyalayamayız. OpenFront ayrıca türevlerde görünür atıf ister ([00 K22](../00-vizyon-ve-kararlar.md)).

## 5. Doğrulama durumu

| İddia | Durum |
|---|---|
| Yıldız sayıları ve son gönderim tarihleri | GitHub API, 2026-09-30 |
| Kaynak lisansları (FAOSTAT, WorldClim, CHELSA, GEM vb.) | Bağlantılı sayfalardan alındı |
| MIRCA-OS lisansı | **Doğrulanmadı** (olasılıkla CC BY) |
| World Bank WDI lisansı (CC BY 4.0) | **Doğrulanmadı** (bellekten) |
| Kayıtlarda "(doğrulanmadı)" işaretli diğer lisanslar | Bellekten; kullanmadan önce kaynak sayfadan doğrula |
| IMF PortWatch'ın ticari kullanımı | **Belirsiz;** IMF'ye sorulmalı |
| Copernicus GLO-90 / SRTM lisansı | **Doğrulanacak** (ETOPO kamu malı) |
| Çıktı boyutu tahmini (60 bölge için birkaç yüz KB, dünya için birkaç MB) | **Tahmin** |
| "Open Victoria" projesi | Doğrulanamadı; listeden çıkarıldı |

## Kaynaklar

[OpenFrontIO](https://github.com/openfrontio/OpenFrontIO), [Symphony of Empires](https://symphony-of-empires.github.io/), [OpenTTD LinkGraph](https://docs.openttd.org/source/dd/d29/classLinkGraph), [GEM lisansı](https://globalenergymonitor.org/creative-commons-public-license/), [geoBoundaries](https://github.com/wmgeolab/geoBoundaries), [GAEZ v5](https://data.apps.fao.org/catalog/iso/66bfe451-c6da-4edd-940e-cb4b0b83725a), [SoilGrids](https://isric.org//explore/soilgrids), [CHELSA](https://www.chelsa-climate.org/datasets/chelsa_climatologies), [WorldClim](https://worldclim.org/about.html), [NGA World Port Index](https://data.humdata.org/dataset/world-port-index), [OurAirports](https://ourairports.com/data/), [USGS MRDS](https://mrdata.usgs.gov/catalog/cite-view.php?cite=23), [BACI](https://www.cepii.fr/DATA_DOWNLOAD/baci/doc/baci_webpage.html), [Comtrade koşulları](https://www.comtrade.com/terms-of-use/), [PortWatch](https://portwatch.imf.org/pages/data-and-methodology), [OSM lisans SSS](https://osmfoundation.org/wiki/Licence/Licence_and_Legal_FAQ).
