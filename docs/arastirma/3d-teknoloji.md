# Araştırma — Hafif 3D Gerçek Dünya için Teknoloji

> **Özet.** "Bölge Stratejisi"nin 3D gerçek Dünya yönü ([00 K17](../00-vizyon-ve-kararlar.md)) için hafif bir web istemci yığını araştırıldı. **Öneri:** iki katmanlı mimari: **Katman A** (stratejik küre) yalnızca **three.js** ile stilize, düşük çokgenli bir küre; bölge çokgenleri birkaç birleştirilmiş ağa pişirilir, akışlar shader ile kayan büyük daire yayları olarak çizilir (≈ 10–30 çizim çağrısı, karo sunucusu gerekmez). **Katman B** (bölge yakın planı) yakınlaştırınca devreye giren **MapLibre (küre projeksiyonu) + PMTiles + three.js özel katmanı**. Cesium, Babylon.js ve Google Photorealistic 3D Tiles elenir. Bölge verisi için Natural Earth admin-1 (kamu malı) veya geoBoundaries ADM1 (CC BY 4.0) kullanılır. Bu rapor yalnızca web araştırmasıdır; repoda kod yazılmadı.

**Durum ve güvenilirlik.** Rapor 30 Eylül 2026'da derlendi; paket boyutları bundlephobia API'sinden (tam paket, ağaç sallama öncesi), tarayıcı desteği caniuse'tan alındı. **Hiçbir yığın için yayımlanmış mobil fps ölçümü bulunamadı.** "Tahmin" ve "(doğrulanmadı)" etiketli sayılar ölçülmemiştir. **Capital Rift'in render yığını kamuya açık belgelenmemiştir** (§4); "Capital Rift three.js kullanıyor" iddiası **doğrulanmadı.**

İlgili belgeler: [00 — Vizyon ve Kararlar](../00-vizyon-ve-kararlar.md) (K17, K18, K22) · [08 — Altı Katman](../08-alti-katman.md) · [Açık kaynak ve veri](acik-kaynak-ve-veri.md) · [04 — Yol Haritası](../04-yol-haritasi.md)

---

## 1. Render yığınları

Boyutlar bundlephobia API'sinden (2026-09-30), **tam paket** değerleridir; ağaç sallama bunları azaltır.

| Yığın | Min / gzip | Lisans | Notlar |
|---|---|---|---|
| **three.js 0.186** | 736 KB / **185 KB** | MIT | `InstancedMesh` ve özel shader ile tam denetim. Mobil için topluluk önerisi kare başına ≈ 50–100 çizim çağrısı. Bir ölçüme göre 100 bin örnek tek çizim çağrısında ≈ 6,8 ms ([utsubo](https://www.utsubo.com/blog/threejs-best-practices-100-tips)). |
| **three-globe 2.45** | 479 KB / 156 KB (kendi kodu dahil) | MIT | Yaylar, yollar, altıgen çokgenler, parçacıklar ve halkalar var ([repo](https://github.com/vasturiano/three-globe)). Veri başına nesne modeli binlerce animasyonlu akış için tasarlanmamış; özel shader gerekir. globe.gl daha büyük: 559 KB gzip. |
| **MapLibre GL JS (6.x)** | 1,07 MB / **285 KB** | BSD-3 | Küre projeksiyonu v5.0'dan beri var (Ocak 2025), küre üzerinde arazi dahil ([v5.0.0](https://github.com/maplibre/maplibre-gl-js/releases/tag/v5.0.0)). Token gerekmez. Küre için three.js özel katman örneği var ([örnek](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-to-globe-using-threejs/)); yalnızca Mercator için yazılmış sürüm küre üzerinde çalışmaz. |
| **deck.gl 9.4** | çekirdek 218 KB gzip + geo-layers 234 KB | MIT | `GlobeView` hâlâ **deneysel** ([belge](https://deck.gl/docs/api-reference/core/globe-view)). MapLibre yer paylaşımı küreyi iç içe modda destekler, ama z=0'daki deck verisi araziyi yok sayar ([belge](https://deck.gl/docs/api-reference/mapbox/overview)). Trips ve Arc katmanları akış için iyi. |
| **CesiumJS 1.145** | 4,9 MB / **1,34 MB** | Apache-2.0 | Ağaç sallanmış sürümlerin ≈ 1,1 MB gzip olduğu bildiriliyor ([örnek PR](https://github.com/musharna/wildeye/pull/16)). Ayrıca statik Workers/Assets dosyaları ister. ion token'ı olmadan çalışır ([repo](https://github.com/CesiumGS/cesium)) ama düşük donanımlı mobil için ağır. |
| **Babylon.js 9** | 8,0 MB / **1,78 MB** (modüler) | Apache-2.0 | Olgun motor; bu kullanım için gereğinden büyük. |
| **PlayCanvas 2.22** | 2,4 MB / 615 KB | MIT | WebGL2 ve WebGPU. Coğrafi katman yığını yok. |
| **iTowns** | ölçülmedi | CeCILL-B + MIT | three.js tabanlı, 3D Tiles ve MVT destekler ([repo](https://github.com/iTowns/itowns)). Niş; küre kodu CBS odaklı. |
| **Google Photorealistic 3D Tiles** | — | Ticari | Google Maps Platform anahtarı ister, Enterprise SKU ile faturalanır. Politikası çevrimdışı kullanımı ve veri çıkarmayı yasaklar, kök karo sorgusunu günde 10 000 ile sınırlar ([politikalar](https://developers.google.com/maps/documentation/tile/policies), [faturalama](https://developers.google.com/maps/documentation/tile/usage-and-billing)). Kendi veri katmanlarını gerektiren bir oyun için **uygun değil.** |

**Çevrimdışı ve kendi sunucusundan yayın.**
- **Vektör karolar:** Protomaps **PMTiles** + MapLibre herhangi bir statik sunucudan çalışır (tek dosya, HTTP range istekleri). `pmtiles extract --bbox/--region --maxzoom` bölgesel dilim çıkarır ([CLI belgesi](https://docs.protomaps.com/pmtiles/cli)). pmtiles istemcisi yalnızca 7,7 KB gzip. Tam gezegen altlığı yaklaşık **120 GB** (z0–15, ODbL) ([indirmeler](https://docs.protomaps.com/basemaps/downloads)); yalnızca gerekeni çıkarın.
- **Arazi:** Mapterhorn, AWS karolarının yerine ücretsiz WebP arazi karoları sağlar ([repo](https://github.com/mapterhorn/mapterhorn)).

## 2. Mimari

Simülasyon anlık görüntülerini (`packages/cekirdek`) tipli dizilere çeviren, **çizici bağımsız** ortak bir katman üzerinde **iki katmanlı** tasarım önerilir.

- **Katman A: stratejik küre (yalnızca three.js).** Stilize, düşük çokgenli bir küre; bölge çokgenleri birkaç birleştirilmiş ağa pişirilir ve sahibe göre renklenir. Akışlar, kesik çizgi desenini kaydıran shader ile **büyük daire yayları** olarak çizilir (malzeme başına 1 çizim çağrısı). Birimler ve kamyonlar `InstancedMesh`. Maliyet ≈ 10–30 çizim çağrısı, karo sunucusu gerekmez.
- **Katman B: bölge yakın planı (MapLibre küre + three.js özel katmanı).** Bölgeye yakınlaştırınca girilir. PMTiles yollar, su ve `fill-extrusion` binaları verir; three.js katmanı örneklenmiş kamyonları ve akış şeritlerini çizer; `projectionTransition` iki projeksiyonu yönetir.
- **Bütçeler.** Mobilde kare başına < 100 çizim çağrısı. Yakınlığa göre ayrıntı düzeyi (LOD), kare başına örnek sayısı tavanı ve görüş alanı kırpması. Karo çekme ve çözme MapLibre işçilerinde kalır; kare başına sim enterpolasyonu bir işçide yapılıp paylaşılan `Float32Array`'e yazılır.
- **WebGL2 / WebGPU.** caniuse: WebGL2 **%96,4**, WebGPU **%87,4** (Firefox masaüstü varsayılan kapalı; Safari 26+) ([WebGL2](https://caniuse.com/webgl2), [WebGPU](https://caniuse.com/webgpu)). Taban WebGL2; parçacıklar için WebGPU compute **isteğe bağlı sonraki yol.**

## 3. Gerçek dünya bölge verisi

| Kaynak | Lisans | Boyut ve notlar |
|---|---|---|
| **Natural Earth admin-1** ([sayfa](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)) | **Kamu malı** | 10m GeoJSON **40,7 MB**, 251 ülkede 4 596 nesne (doğrudan sayıldı). 50m yalnızca 2,3 MB ama **9 ülke** (294 nesne) kapsıyor; dünya dilimi için yetersiz. |
| **geoBoundaries** ([site](https://www.geoboundaries.org/)) | Genel olarak **CC BY 4.0** (atıf şart); `gbOpen` API ayrıca ülke başına kaynak lisansı bildirir (Almanya: dl-de/by-2.0; Afganistan: kamu malı) | Ülke başına ADM1 dosyaları, sadeleştirilmiş sürümler, REST API. Her ülkenin `boundaryLicense` alanı kontrol edilmeli. |
| **GADM** ([lisans](https://gadm.org/license.html)) | **Yalnızca akademik ve ticari olmayan;** izinsiz yeniden dağıtım yok | **Kullanılmaz.** |
| **OSM sınırları** | ODbL | Gezegen çıkarımı ve dikkatli işlem gerekir. |

- **Boru hattı:** `mapshaper -simplify visvalingam keep-shapes`, ardından TopoJSON ([mapshaper](https://github.com/mbloch/mapshaper)).
- **Boyut hedefleri (tahmin; ölçülmedi):** 30–60 bölgelik dilim ≈ 100–300 KB gzip. Küre için sadeleştirilmiş tüm dünya ADM1 seti (≈ 4,6 bin bölge) ≈ 1,5–4 MB gzip. Dünya seti ilk JS'ye değil **tembel** yüklenmeli.
- **Yükseklik:** AWS/Mapzen Terrarium karoları ücretsiz, hesapsız, kaynak başına atıf ister ([kayıt](https://registry.opendata.aws/terrain-tiles/), [atıf](https://github.com/tilezen/joerd/blob/master/docs/attribution.md)). Mapterhorn yeni seçenek.
- **H3** (h3-js, Apache-2.0, 65 KB gzip), siyasi sınır yerine eşit alanlı altıgen hücre isteniyorsa uygundur ([repo](https://github.com/uber/h3-js)). İkisi birleştirilebilir: simülasyon ızgarası için H3, sahiplik ve gösterim için admin-1 çokgenleri.

**Proje bağlantısı.** İlk dilim (Türkiye + Balkanlar + Karadeniz; [00 K18](../00-vizyon-ve-kararlar.md)) 30–60 bölgedir; admin-1 birleştirmesiyle Katman A için yaklaşık yüzlerce KB'lık bir dosya yeterli olur (tahmin). Veri sözleşmesi hazırdır: `BolgeTanimi.konum` (mikro derece), `HaritaDosyasi.sinirDosyasi` (TopoJSON, nesne adı `bolgeler`) ve `atif` ([veri/tipler.ts](../../packages/veri/src/tipler.ts)). **Dilimde ihtilaflı bölgeler vardır;** sınır ve isim politikası (A2) veri üretilmeden önce yazılı olmalıdır.

## 4. Capital Rift ve OSM-3D fizibilitesi

- **Capital Rift.** Geliştirici NIK'S GAMES LLC; oyun beta aşamasında. Herkese açık istemci sayfası React (UMD) yükler, harita verisini Cloudflare önbelleğe alır ([gizlilik sayfası](https://capitalrift.com/privacy/)). Geliştiricinin TikTok özet listesi 3D karakterler, arazi çukurları ve akış çizgilerinden söz eder ([TikTok](https://www.tiktok.com/@nikkeuser/video/7666487170605026591)). **3D motorunu veya OSM boru hattını adıyla söylemez;** three.js kullandığı **doğrulanamadı** (sitede "three" eşleşmesi düz metindi). *Not: aynı TikTok videosu başka araştırma raporunda farklı hesap adıyla (`@niksgames`) geçer; hesap adı doğrulanmadı ([altı katman rakipleri](alti-katman-rakipler.md)).*
- **İlgisiz.** Poglavar/station3d, three.js ve OSM motoru (işçiler, Draco); ama depo Capital Rift'ten hiç söz etmiyor ([repo](https://github.com/Poglavar/station3d)). Mimari referans olarak yararlı, Capital Rift hakkında kanıt **değil.**
- **Tarayıcıda yapılabilir olan.** Vektör karolardan MapLibre `fill-extrusion` ucuz yoldur. Overture Buildings ODbL lisanslıdır ve yükseklik özniteliği vardır ([belge](https://docs.overturemaps.org/guides/buildings/)). OSM2World glTF dışa aktarır ama Java ve sunucu tarafıdır; ayrıntıları doğrulanamadı. Sokak ölçeğinde şehir geneli 3D ağırdır. Strateji oyununun ihtiyacı olan **bölge ölçeğinde, çıkıntılı bina taban alanları** ile kalınmalıdır.

## 5. Öneri ve aşamalı plan

**Yığın:** Katman A için three.js; sonra Katman B için MapLibre (küre, PMTiles, arazi) + three.js özel katmanı. Cesium, Babylon ve Google 3D Tiles atlanır. Bölgeler için geoBoundaries ADM1 veya Natural Earth 10m (sadeleştirilmiş). Arayüzde OSM, Natural Earth ve geoBoundaries atfı verilir.

| # | Aşama | Süre (tahmin) | İçerik | Hedefler (ölçülmedi) |
|---|---|---|---|---|
| 1 | **MVP küre** | 2–3 hafta | three.js düşük çokgenli küre; mevcut sim anlık görüntülerinden renklenen bölge çokgenleri; yay akışlar; tıkla-seç. 30–60 bölgelik dilim ve `cekirdek` anlık görüntülerinden tamponlara küçük bir bağdaştırıcı | ilk JS < 400 KB gzip; masaüstü 60 fps, orta mobil 30 fps; < 40 çizim çağrısı |
| 2 | **Gezen kamera** | 2 hafta | yörünge ve uçuş kontrolleri, LOD, bölge akışı; dünya topolojisi tembel yüklenir, kalan gezegen için H3 veya NE verisi | < 100 çizim çağrısı |
| 3 | **Bölge yakın planı** | 3–4 hafta | kendi sunucusundan PMTiles çıkarımları (z0–12 + binalar), arazi karoları, özel katmanda örneklenmiş kamyonlar ve akış şeritleri | ilk JS < 2 MB gzip (MapLibre 285 KB + three 185 KB + uygulama kodu); karolar tembel |
| 4 | İsteğe bağlı | — | parçacıklar için WebGPU compute yolu (özellik algılamayla) | — |

Süreler araştırma raporundaki **tahminlerdir;** proje takvim taahhüdü değildir ([00 K16](../00-vizyon-ve-kararlar.md)). 3D istemci, arayüzsüz simülasyon kapısından sonra uygulanır ([04 güncellemesi](../04-yol-haritasi.md)).

**Ana riskler.** Küre modunda özel katmanlar daha yeni ve daha az belgelenmiş; MapLibre paket boyutu büyümeye devam ediyor ([issue #7255](https://github.com/maplibre/maplibre-gl-js/issues/7255)); geoBoundaries'te ülkeye göre lisans farkı.

## 6. Doğrulama durumu

| İddia | Durum |
|---|---|
| Paket boyutları | bundlephobia API, 2026-09-30; tam paket; ağaç sallama sonrası küçülür |
| Tarayıcı desteği (WebGL2 %96,4; WebGPU %87,4) | caniuse, 2026-09-30 |
| Mobil fps değerleri | **Bulunamadı;** hedefler yalnızca tasarım hedefidir |
| Boyut hedefleri (100–300 KB, 1,5–4 MB) ve süreler | **Tahmin;** ölçülmedi |
| Capital Rift'in 3D yığını | **Doğrulanmadı** (belgelenmemiş) |
| OSM2World ayrıntıları | **Doğrulanmadı** |
| NE 10m = 40,7 MB, 4 596 nesne, 251 ülke; 50m = 2,3 MB, 9 ülke | Doğrudan sayıldı |

## Kaynaklar

- [MapLibre v5.0.0](https://github.com/maplibre/maplibre-gl-js/releases/tag/v5.0.0)
- [MapLibre küre + three.js örneği](https://maplibre.org/maplibre-gl-js/docs/examples/add-a-3d-model-to-globe-using-threejs/)
- [deck.gl GlobeView](https://deck.gl/docs/api-reference/core/globe-view)
- [deck.gl Mapbox yer paylaşımı](https://deck.gl/docs/api-reference/mapbox/overview)
- [three-globe](https://github.com/vasturiano/three-globe)
- [CesiumJS](https://github.com/CesiumGS/cesium)
- [Google 3D Tiles politikaları](https://developers.google.com/maps/documentation/tile/policies)
- [Google 3D Tiles faturalama](https://developers.google.com/maps/documentation/tile/usage-and-billing)
- [Protomaps indirmeler](https://docs.protomaps.com/basemaps/downloads)
- [pmtiles CLI](https://docs.protomaps.com/pmtiles/cli)
- [Mapterhorn](https://github.com/mapterhorn/mapterhorn)
- [AWS arazi karoları](https://registry.opendata.aws/terrain-tiles/)
- [Natural Earth admin-1](https://www.naturalearthdata.com/downloads/10m-cultural-vectors/10m-admin-1-states-provinces/)
- [geoBoundaries](https://www.geoboundaries.org/)
- [GADM lisansı](https://gadm.org/license.html)
- [mapshaper](https://github.com/mbloch/mapshaper)
- [h3-js](https://github.com/uber/h3-js)
- [caniuse WebGL2](https://caniuse.com/webgl2)
- [caniuse WebGPU](https://caniuse.com/webgpu)
- [Capital Rift gizlilik sayfası](https://capitalrift.com/privacy/)
- [Capital Rift TikTok özet listesi](https://www.tiktok.com/@nikkeuser/video/7666487170605026591)
- [station3d](https://github.com/Poglavar/station3d)
- [Overture Buildings](https://docs.overturemaps.org/guides/buildings/)
- [iTowns](https://github.com/iTowns/itowns)
- [three.js performans ipuçları](https://www.utsubo.com/blog/threejs-best-practices-100-tips)
