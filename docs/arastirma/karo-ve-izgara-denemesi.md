# Deneme — Karo (PMTiles) ve z20 Arsa Izgarası (Sprint 1 / S6)

> **Özet.** Kocaeli/Gebze için Protomaps PMTiles özütü alındı ve ölçüldü. Ardından ilçe sınırı içindeki tüm z20 hücreleri üretildi ve aynı karolardan uygunluk ile arazi sınıfı hesaplandı. **Karo bütçesi rahat tutuyor:** Gebze'de z15 karosu ortalama 2,4 KB, en büyüğü 31 KB. Kocaeli'nin tamamında hiçbir z12–z15 karosu 94 KB'ı geçmiyor (hedef ≤150 KB). **Türkiye + Balkan dilimi z0–15 için 4,6 GB** çıkıyor. Bu değer tahmin değil; planet dizininden `--dry-run` ile hesaplandı. **Gebze 508.634 hücre** ve hücre kenarı 28,9 m. Spesifikasyondaki "kesişen hücre satın alınamaz" kuralıyla 436.599 hücre (%85,8) satın alınabilir. Ancak bu kural kentsel dokunun yarısından fazlasını kapatıyor; §4.3'te kapsama eşiği öneriliyor. **Önerilen hat:** taban harita için Protomaps özütü kullanılır. Kendi planetiler profilimize şimdilik gerek yok. Izgara aynı z15 karolarından Node'da üretilir. Sunucu ilçe başına ~90 KB'lık `BHI1` ikili dosyasını okur. İstemci şerit katmanını (PMTiles, ~0,8 KB/karo) ya da doğrudan `BHI1`'i kullanır.

**Kaynak ve tarih.** Ölçümler 2026-10-01'de yapıldı. Kaynak Protomaps `20260930.pmtiles` yapısı: şema v4.15.2, OSM 2026-09-30T04:00Z, planetiler 0.10.2, planet boyutu 138,48 GB. Sınırlar Overpass'tan alındı: Gebze r1211496 (admin_level 6), Kocaeli r223473 (admin_level 4). Tüm sayılar `packages/veri/haritalar/odbl/ornek/{gebze,kocaeli}-olcum.json` dosyalarından gelir.

İlgili belgeler: plan F2 / karar 1 (z20 parsel atomu) · [sokak-seviyesi-3d](sokak-seviyesi-3d.md) §2, §4, §7 · [açık kaynak ve veri](acik-kaynak-ve-veri.md)

---

## 1. Kaynak ve araçlar

| Araç | Sürüm / kaynak | Not |
|---|---|---|
| `pmtiles` (go-pmtiles) | v1.31.2, `go install github.com/protomaps/go-pmtiles@v1.31.2` | Bu ortamda GitHub release ikilileri (api.github.com / github.com releases) **403** veriyor. Bu yüzden Go modül vekilinden derlendi (Go 1.24.7). İkili `packages/veri-hatti/.onbellek/araclar/pmtiles` konumunda (gitignore'lu). |
| tippecanoe | v2.82.0 (felt/tippecanoe `4f26211`), kaynaktan `make` | Kaynaktan derleme ~1 dk sürdü; sqlite3/zlib başlıkları sistemde var. Konum `.onbellek/araclar/tippecanoe`. |
| Node paketleri | `pmtiles` 4.5.0 (başlık), `@mapbox/vector-tile` 3.0.0, `pbf` 5.1.2; test için `vt-pbf` 3.1.3 (dev) | PMTiles dizin gezinmesi kendi kodumuzda (`izgara-pmtiles.ts`), çünkü JS paketi karo başına sıkıştırılmış boyutu dışa açmıyor. |
| Karo kaynağı | `https://build.protomaps.com/YYYYMMDD.pmtiles` (liste: `https://build-metadata.protomaps.dev/builds.json`, md5 + b3sum içerir) | Günlük yapılar var. Protomaps belgeleri doğrudan bağlantı (hotlink) yerine kopyalayıp kendi depolamamızda barındırmamızı istiyor. |
| Sınır | Overpass `rel(<id>);out geom;` (User-Agent zorunlu; olmadan **406**) | Önbellek: `.onbellek/osm/iliski-<id>.json`. Diğer ajanın `src/osm/` hiyerarşisinden bağımsız. |

Özüt komutları ve süreleri:

```
pmtiles extract https://build.protomaps.com/20260930.pmtiles gebze-z15.pmtiles \
    --bbox=29.3391181,40.7649281,29.7531295,41.0440465 --maxzoom=15     # 9,4 MB, 64 istek, 8,6 sn
pmtiles extract ... kocaeli-z15.pmtiles --bbox=29.3157266,40.52354,30.5117269,41.417 --maxzoom=15  # 32,7 MB, 13 sn
pmtiles extract ... /dev/null --region=<ülke poligonları>.geojson --maxzoom=15 --dry-run   # boyut, indirmeden
```

## 2. Karo ölçümü

Karo boyutları gzip'li aktarım boyutudur ve PMTiles dizin girdilerinden okunur.

### 2.1 Gebze (ilçe bbox'ı, z0–15: 1.832 karo, 9.424.408 B)

| z | Karo | Ort. | Medyan | p95 | En büyük | >150 KB |
|---|---|---|---|---|---|---|
| 12 | 30 | 26,7 KB | 19,9 KB | 82,8 KB | **93,8 KB** (12/2382/1538) | 0 |
| 13 | 99 | 12,0 KB | 6,6 KB | 42,1 KB | 54,2 KB | 0 |
| 14 | 340 | 5,3 KB | 2,6 KB | 21,4 KB | 41,2 KB | 0 |
| 15 | 1.326 | 2,4 KB | 1,0 KB | 9,8 KB | 31,1 KB (15/19062/12308) | 0 |

İlçe poligonuna değen z15 karoları 601 tane: ortalama 2,2 KB, en büyük 31,1 KB. Bu 601 karonun toplamı ~1,3 MB eder; ilçenin tüm sokak verisi bu kadar.

Bu 601 z15 karodaki katman başına özellik sayıları (toplam / karo başına ortalama / karo başına en çok):

| buildings | roads | landuse | water | pois | earth | boundaries | places |
|---|---|---|---|---|---|---|---|
| 19.030 / 31,7 / 1.229 | 4.255 / 7,1 / 132 | 5.005 / 8,3 / 121 | 366 / 0,6 / 7 | 3.114 / 5,2 / 255 | 693 / 1,2 / 13 | 466 / 0,8 / 3 | 71 / 0,1 / 2 |

### 2.2 Kocaeli ili (bbox, z0–15: 16.002 karo, 32.681.049 B)

| z | Karo | Ort. | p95 | En büyük | >150 KB |
|---|---|---|---|---|---|
| 12 | 210 | 13,7 KB | 44,0 KB | 93,8 KB | 0 |
| 13 | 784 | 5,7 KB | 22,3 KB | 75,2 KB | 0 |
| 14 | 3.025 | 2,6 KB | 10,8 KB | 61,3 KB | 0 |
| 15 | 11.880 | 1,2 KB | 4,6 KB | **70,6 KB** (15/19108/12313, İzmit) | 0 |

İl içindeki z15 karolarında 123.429 bina var; tek karoda en çok 2.373 bina. Ayrıca 25.582 yol ve 33.579 arazi poligonu var.

**Bütçe kıyası.** Karo başına ≤150 KB hedefi (P0) Kocaeli'nin tamamında **karşılanıyor**: en kötü karo z12'de 94 KB, z15'te 71 KB. Yürüme kipindeki 3×3 z15 penceresi en kötü durumda ~0,3–0,6 MB, tipik durumda <50 KB indirir.

### 2.3 Türkiye + Balkan dilimi

Boyutlar planet dizininden kesin olarak hesaplandı (`--dry-run`). Bölge poligonu Natural Earth 10m ülke sınırlarıdır.

| Bölge (z0–15) | Karo | Arşiv boyutu |
|---|---|---|
| Türkiye | 1.052.597 | **1,3 GB** |
| Türkiye, yalnız z0–14 | 287.732 | 679 MB |
| Balkan (GRC, BGR, ROU, SRB, MKD, ALB, MNE, BIH, HRV, KOS, MDA, CYP, SVN) | 1.385.520 | 3,4 GB |
| **Türkiye + Balkan** | 2.437.029 | **4,6 GB** |

**Ölçülen yoğunluktan kaba tahmin.** Kocaeli bbox'ı ~9.970 km² ve 32,7 MB tutuyor; bu ~3,3 KB/km² eder. Tüm Türkiye bu yoğunlukta olsaydı ~2,6 GB çıkardı. Gerçek değer 1,3 GB, çünkü Kocaeli Türkiye ortalamasının ~2 katı yoğun. Balkan dilimi daha ağır: Romanya ve Yunanistan'da OSM bina kapsaması çok daha yüksek. Araştırmadaki 2–4 GB tahmini Türkiye için fazla, dilim için az çıktı.

## 3. z20 hücre ızgarası ve uygunluk

### 3.1 Kurallar (kod: `packages/veri-hatti/src/osm/izgara*.ts`)

- **Hücre.** Web Mercator z20 karosu. Gebze'de kenar 28,89 m, hücre ~835 m².
- **Hücre kimliği.** 40 bitlik quadkey tamsayısı (Z-sırası). Kimliği 1024'e bölüp aşağı yuvarlamak z15 ebeveyn karoyu verir. Aynı z15 karodaki 1.024 hücre ardışık bir aralıkta durur; bu, parçalama (sharding) ve aralık sorgusu için uygundur. Görüntüleme ve hata ayıklama için 20 haneli quadkey dizgesi kullanılır.
- **İlçe üyeliği.** Hücre merkezi sınır poligonunun içindeyse hücre ilçeye aittir (çift-tek kuralı). Böylece her hücre tam bir ilçeye düşer.
- **Uygunluk.** Uygunluk z15 karosundan hesaplanır. Her hücre 8×8 alt örneğe bölünür; alt örnek aralığı ~3,6 m. Sayaç, katmanı kapsayan alt örnek sayısıdır (0–64).
  - **Yol:** merkez hattan tampon uygulanır. Ana yollar 12 m: `highway`, `major_road` (trunk/primary/secondary/tertiary + bağlantılar) ve `aeroway`. Diğer yollar 6 m: `minor_road`, `other` ve `rail`. Tüneller sayılmaz. `path` (yaya, patika, tarla yolu `track`) ve `ferry` engel değildir.
  - **Su:** `water` poligonları dahil; `swimming_pool` ve `fountain` hariç. Ayrıca `river` ve `canal` çizgileri 6 m tamponla dahil.
  - **Askeri:** `landuse` katmanında `military` / `naval_base`.
  - **Engel kuralı:** spesifikasyondaki "kesişim" uygulandı, yani sayaç ≥ 1.
  - **Bina:** ayak izi kesişimi bilgi olarak yazılır (bit + yüzde). Hücreyi engellemez.
- **Arazi sınıfı.** En baskın sınıf, kapsama ≥ %30 ise hücreye atanır:
  - tarla: farmland, orchard, vineyard, meadow…
  - sanayi: industrial, railway, quarry…
  - konut: residential
  - orman: forest, wood
  - Hiçbiri yoksa ve bina kapsaması ≥ %10 ise sınıf **yapılı** olur, aksi halde **diğer**.

### 3.2 Gebze sonuçları (508.634 hücre ≈ 424,6 km²; resmî alan ~419 km²)

| | Toplam | Satın alınabilir |
|---|---|---|
| Hücre | **508.634** | **436.599 (%85,8)** |
| Engel: yol / su / askeri | 68.337 / 4.002 / 33 | — |
| Bina kesişen | 20.447 | 9.401 |
| orman | 275.441 | 269.205 |
| diğer | 167.465 | 123.008 |
| tarla | 30.093 | 26.535 |
| sanayi | 19.329 | 11.893 |
| yapılı | 8.468 | 3.708 |
| konut | 7.838 | 2.250 |

Hücreler 601 z15 karodan üretildi; eksik karo yok. Süre 1,5 sn (tek çekirdek). Önizleme: `ornek/gebze-onizleme.png` (1 piksel = 1 hücre).

**Kocaeli ili:**

- 5.734.749 hücre. OSM il sınırı **karasularını da içeriyor**; bunların 1.668.672'si su.
- Satın alınabilir 3.543.326 hücre. Izgara süresi 16 sn.
- Sınıf dağılımı: orman 1,73 M, tarla 309 bin, konut 252 bin, sanayi 82 bin, diğer 3,34 M (deniz dahil).

### 3.3 Eşik duyarlılığı

**Kentsel hücre** tanımı: bina kapsaması ≥ %10, ya da sınıfı konut/yapılı olan hücre.

| Engel kuralı (yol/su/askeri) | Gebze uygun | Gebze kentsel uygun (21.813 hücre) | Kocaeli kentsel uygun (305.553) |
|---|---|---|---|
| Kesişim (≥1 alt örnek) — **şu anki** | 436.599 (%85,8) | 9.748 (**%44,7**) | %39,2 |
| Kapsama ≥ %25 | 457.686 (%90,0) | 13.611 (%62,4) | %55,7 |
| Kapsama ≥ %50 | 485.877 (%95,5) | 18.892 (%86,6) | %80,5 |

## 4. Çıktı biçimleri

### 4.1 Sunucu / çekirdek: `BHI1` (ilçe başına tek dosya)

Dosya bir başlık ve onu izleyen iki düzlemden oluşur. Arama O(1) maliyetlidir: `i = (y − y0)·genişlik + (x − x0)`.

- **Başlık:** 24 bayt, küçük-sonlu. Alanlar: `"BHI1"`, z, sürüm, düzlem sayısı, x0, y0, genişlik, yükseklik.
- **Durum düzlemi:** genişlik × yükseklik bayt, ilçe çerçevesinde yoğun.
- **Bina yüzdesi düzlemi:** isteğe bağlı, aynı boyutta.

Durum baytının bitleri:
- bit0: içeride
- bit1: yol
- bit2: su
- bit3: askeri
- bit4: bina
- bit5–7: sınıf (0 diğer, 1 tarla, 2 sanayi, 3 konut, 4 orman, 5 yapılı)

**Satın alınabilir** = içeride ∧ ¬(yol ∨ su ∨ askeri).

| | Ham | gzip -9 | brotli 11 | Yalnız durum, gzip |
|---|---|---|---|---|
| Gebze (1207×1077) | 2,60 MB | **92,8 KB** | 73,5 KB | 64,5 KB |
| Kocaeli ili (3484×3448) | 24,0 MB | 632 KB | 498 KB | 450 KB |

Ölçek kestirimi: Türkiye ~0,9 milyar hücre ve ~0,18 B/hücre (gzip) → tüm Türkiye ~160 MB; ilçe başına tipik 50–200 KB. Sahiplik bu dosyaya yazılmaz; ayrı tutulur ve hücre kimliğiyle anahtarlanır (ODbL türev veritabanı ile oyun verisi ayrımı).

### 4.2 İstemci: tippecanoe PMTiles katmanı

Her iki katman z15 tek düzeyde üretildi; MapLibre z22'ye kadar büyütür.

| Katman | Özellik | GeoJSONSeq girdisi | PMTiles | Karo ort. / en büyük |
|---|---|---|---|---|
| `hucreler`: hücre başına kare, `id` = hücre kimliği, `s`/`u`/`e`/`b` | Gebze 508.634 | 123,6 MB | 2,90 MB | 4,8 KB / 7,4 KB |
| `seritler`: aynı durumlu ardışık hücreler tek dikdörtgen, `s`/`u`/`e` | Gebze 63.456 | 13,9 MB | **459 KB** | **0,77 KB / 2,6 KB** |
| `hucreler` | Kocaeli 5,73 M | 1,39 GB | 31,5 MB | 5,3 KB / 7,8 KB |
| `seritler` | Kocaeli 454.469 | 99,5 MB | 3,44 MB | 0,63 KB / 3,1 KB |

**Öneri.** Hücre başına poligon ölçeklenmez; Kocaeli'de 1,4 GB ara GeoJSON ve 5 dakikalık tippecanoe süresi gerekiyor. İstemci bu yüzden **şerit katmanını** kullanır. Tıklanan noktanın hücresi `noktadanHucre(boylam, enlem)` ile istemcide hesaplanır. Seçim vurgusu ve sahiplik katmanı, görünümdeki hücreler için istemcide üretilen küçük bir GeoJSON kaynağıdır.

Bir alternatif daha var: ilçe seçilince `BHI1` (~90 KB) indirilip uygunluk doğrudan buradan okunur, böylece vektör katman gerekmez. Bu yol S8 (MapLibre) ajanı için en basitidir.

### 4.3 Kural önerisi (karar gerekli)

Spesifikasyondaki "yol tamponuyla kesişen hücre satın alınamaz" kuralı kırsalda iyi çalışıyor. Kentte ise sokak aralığı (50–80 m) hücre boyutuna (29 m) yakın olduğundan sokağa cephesi olan hemen her hücre kapanıyor: Gebze kentsel hücrelerinin yalnız %45'i alınabiliyor. Önizlemede şehir merkezi neredeyse tamamen siyah.

**Önerilen kural:**
- yol ≥ %50 kapsama
- su ≥ %50 kapsama (kıyı hücresi alınabilsin)
- askeri: herhangi kesişim (güvenlik)

Bu kuralla Gebze kentsel uygunluğu %87'ye çıkar. Ham sayaçlar korunduğu için eşik değişikliği yalnız `VARSAYILAN_SECENEKLER` güncellemesi ve yeniden üretimdir. Ek fikir: yol kapsaması %1–49 olan hücreye oyun içinde "cadde cephesi" niteliği verilebilir (fiyat/talep çarpanı).

## 5. Önerilen üretim hattı

1. **Taban harita (MapLibre L3 + yürüme kipi): Protomaps özütü.**
   - Bir yapı tarihi seçilir (ör. `20260930`) ve b3sum'u `builds.json`'dan kilitlenir.
   - `pmtiles extract --region=<dilim>.geojson --maxzoom=15` çalıştırılır. Sonuç tek dosya, ~4,6 GB; nesne deposu + CDN'e konur.
   - Karolar küçük, şema gerekli katmanları içeriyor: z15'te tekil binalar ve `height`, yol sınıfları, landuse, su.
   - **Kendi planetiler profilimize şimdilik gerek yok.** Şu durumlarda gerekir:
     - Bina kat sayısı (`building:levels`) ya da çatı biçimi gibi şemada olmayan öznitelikler istenirse.
     - POI ve etiketler atılıp dilim ~%20–30 küçültülmek istenirse (ölçülmedi).
     - Protomaps şema sürümünden bağımsız olmak istenirse.
2. **Hücre ızgarası: aynı özütün z15 karolarından, Node'da.**
   - Böylece oyuncunun gördüğü harita ile uygunluk aynı veriden gelir.
   - Hesap deterministik; iki koşu ve tippecanoe çıktıları bayt bayt aynı (aynı makinede doğrulandı).
   - Süre ilçe başına ~1,5 sn ve il başına ~16 sn; 973 ilçe tek çekirdekte ~30 dk sürer.
   - İl/ilçe sınırları diğer ajanın `src/osm/` hiyerarşisinden alınmalı. Bu deneme bilerek Overpass'tan tek ilişki çekti.
3. **Çıktılar:**
   - Sunucu için ilçe başına `BHI1.gz` (repo dışında; CDN/nesne deposu).
   - İstemci için il başına `seritler.pmtiles`, Kocaeli'de ~3,4 MB.
   - Her iki çıktı da ODbL ve ayrı klasörde tutulur.
   - Örnek: `packages/veri/haritalar/odbl/ornek/`.

## 6. Riskler ve bilinen sorunlar

- **OSM arazi etiketi eksik.**
  - Gebze hücrelerinin %33'ü "diğer" sınıfında; Kocaeli'de deniz hariç ~%41.
  - Türk kentlerinde `landuse=residential` seyrek. Gebze'de konut sınıfı yalnız 7.838 hücre; "yapılı" sezgiseli 8.468 hücre ekliyor.
  - Sınıf dağılımı oyun dengesi için düzeltme isteyebilir. Seçenekler: nüfus/yerleşim noktasından türetme ya da elle bölge düzeltmesi.
- **İl sınırı karasularını içeriyor.** Kocaeli'deki hücrelerin %29'u deniz. İl/ilçe hücre kotaları (ör. "ilçenin ≤%25'i") deniz hariç sayılmalı. Gebze ilçe sınırı kara ile sınırlı.
- **Kesişim kuralı ve örnekleme.** "Kesişim" 3,6 m alt örnek çözünürlüğünde yaklaşık hesaplanıyor; ince şeritler kaçabilir. Yol tamponu gerçek yol genişliğini değil sabit değerleri kullanıyor. Köprüler engel sayılıyor, tüneller sayılmıyor.
- **Protomaps şema sürüklenmesi.** `kind` eşlemesi v4.15.2'ye göre yazıldı (`izgara-uygunluk.ts`). Yapı tarihi ve şema sürümü sabitlenmeli. Ayrıca z15'te Protomaps'in küçük poligonları atıp atmadığı doğrulanmadı.
- **Mercator alan farkı.** Hücre kenarı 36°K'de ~30,9 m, 42°K'de ~28,4 m; alan farkı ~%18. Fiyat ve verim m² üzerinden hesaplanmalı.
- **Sınır değişimi.** OSM sınır düzenlemesi hücrenin ilçesini değiştirebilir; kimlik ise sabit kalır. Sezon başına sınır anlık görüntüsü dondurulmalı.
- **Araç tedariki.**
  - Bu ortamda GitHub release indirmesi kapalı. go-pmtiles Go modül vekilinden, tippecanoe kaynaktan derlendi.
  - CI için sürümü sabit bir Docker imajı önerilir.
  - tippecanoe çıktısının platformlar ve sürümler arasında bayt eşitliği doğrulanmadı.
- **ODbL.** Uygunluk verisi OSM'den türetilmiş bir veritabanı olduğundan yayımlanmalı (`odbl/` klasörü). Sahiplik verisi ayrı tutulmalı. "Produced Work" kapsamı için hukuki inceleme gerekiyor.
- **Hotlink yasağı.** Protomaps yapıları doğrudan kullanılmamalı; özüt kendi depomuzda barındırılmalı.

## 7. Yeniden üretim

```
# Araçlar (.onbellek/araclar, gitignore'lu)
GOBIN=$PWD/packages/veri-hatti/.onbellek/araclar go install github.com/protomaps/go-pmtiles@v1.31.2
git clone --depth 1 https://github.com/felt/tippecanoe packages/veri-hatti/.onbellek/araclar/tippecanoe-src
make -C packages/veri-hatti/.onbellek/araclar/tippecanoe-src tippecanoe  # + araclar/tippecanoe bağlantısı

# Özüt (§1) -> packages/veri-hatti/.onbellek/karolar/gebze-z15.pmtiles
# Izgara + ölçüm + örnekler (sınır Overpass'tan önbelleğe iner)
tsx packages/veri-hatti/src/osm/izgara-cli.ts --ad gebze --iliski 1211496 --ornek
tsx packages/veri-hatti/src/osm/izgara-cli.ts --ad kocaeli --iliski 223473
```

Testler `packages/veri-hatti/test/izgara-{geometri,uygunluk,determinizm}.test.ts` dosyalarında, toplam 24 test. Gerçek veri testi önbellek yoksa atlanır; varsa iki koşunun ve repodaki `gebze-hucreler.bhi.gz` örneğinin bayt bayt aynı olduğunu doğrular.
