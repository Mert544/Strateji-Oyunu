# Harita istemcisi (S8): MapLibre ile L1–L3, hücre seçimi, satın alma

> **Özet.** Küreden (L0) ile çift tık ya da bölge çipiyle MapLibre haritasına geçiliyor: L1 il, L2 ilçe, L3 arsa ızgarası. Gebze örneğinde ızgara `gebze-seritler.pmtiles` dosyasından çiziliyor. Hücre seçimi, satın alma alt çubuğu, parsel kartı ve sahiplik merceği sahte bağdaştırıcıyla uçtan uca çalışıyor. Playwright betiği masaüstü ve mobilde yazılım GL (SwiftShader) üzerinde baştan sona geçiyor. **Bütçe kararı (1 Ekim): seçenek A.** Tek dosya HTML yalnız kabuk ve küreyi taşıyor: **371,8 KB gzip** (≤400 KB). MapLibre yığını HTML'in yanında ayrı bir `harita.js` dosyası: **293,1 KB gzip**. Bu yığın yalnız harita açılınca yükleniyor.

Ölçüm tarihi 2026-10-01. Kod `packages/istemci/src/harita/`, testler `test/harita-*.test.ts`, betik `scripts/harita-etkilesim.ts` içinde.

## 1. Ne yapıldı

| Parça | Dosya | Not |
|---|---|---|
| Denetçi (ilk yükte gelir) | `harita/denetci.ts`, `harita.css` | Kırıntı yolu (Dünya › Bölge › İl › İlçe › Arsa). Aksan duyarsız arama: il / ilçe / Mülklerim. Esc ve Backspace bir üst düzeye çıkar, tarayıcının geri tuşu da. Telefonda kırıntı `‹ Gebze` biçimine kısalır |
| Görünüm (tembel) | `harita/gorunum.ts` | `import()` ile maplibre-gl 5.24 ve pmtiles 4.5'i yükler. Temel harita yok: zemin düz, sınırlar sakin. `?altlik=<pmtiles>` ile Protomaps altlığı isteğe bağlı açılır. L3, ızgarası olan ilçede z ≥ 15'te başlar |
| Hücre matematiği | `harita/hucre.ts` | z20 ↔ boylam/enlem dönüşümü, `"x:y"` ↔ 40 bit quadkey, BHI1 çözücü. Veri hattıyla birebir eşitliği testlerle doğrulandı |
| Fiyat ve sınırlar | `harita/fiyat.ts` | Fiyat: taban × (1 + 2·pay). Sınır: ≤72 hücre ve ≤%25. Seçim bitişik olmalı; sahip olunan hücreye değen seçim "Birleştir" olur |
| Seçim | `harita/secim.ts` | Tıklama tek hücre seçer. Shift+tık ve Shift+sürükle çoklu seçer; telefonda bunun yerine "Çoklu seç" düğmesi var. Uygunsuz hücrelerin nedeni ipucunda görünür |
| Bağdaştırıcı | `harita/baglanti.ts` | Arayüz `MulkBaglantisi`: `parselAl(MulkKomutu)` ve `sahiplikAl(ilce)`. `SahteBaglanti` sahipliği bellekte tutar. Uygunluk, çakışma, sınıf, bitişiklik ve sınırları doğrular. Gerçekçilik için 3 komşu parsel serper |
| Veri | `harita/veri.ts` | `harita-verisi/` adresinden fetch edilir. Geliştirme sunucusu bu yolu vite ara katmanıyla sunar. Derleme sırasında `derle.ts` dosyaları kopyalar |

ODbL atfı ("© OpenStreetMap katkıcıları") iki yerde durur: haritanın sol alt köşesinde ve ⓘ kutusunda.

## 2. Ölçümler

| | Önce | Sonra | Fark |
|---|---|---|---|
| Tek dosya `istemci/dunya.html` gzip (seçenek A öncesi, MapLibre gömülü) | 365,3 KB | 663,4 KB | +298 KB |
| **Tek dosya `istemci/dunya.html` gzip (seçenek A)** | 365,3 KB | **371,8 KB** | +6,5 KB |
| **Ayrı `istemci/harita.js`** (MapLibre + pmtiles + görünüm; tek ES modülü) | — | **293,1 KB** gzip / 1,13 MB ham | yalnız harita açılınca |
| Çok dosyalı ilk JS (`index-*.js`) gzip | 356,5 KB | 363,2 KB | **+6,7 KB** |
| Çok dosyalı CSS gzip | 6,6 KB | 8,0 KB | +1,4 KB |
| Tembel harita yığını (`gorunum-*.js`: maplibre + pmtiles + görünüm) | — | 290,5 KB gzip / 1,12 MB ham | yalnız harita açılınca |
| Küre çizim çağrısı (`sakin-ekran.ts`) | 9 | 9 | 0 |
| Küreden ile geçiş, MapLibre yükleme dahil (SwiftShader) | — | ~1,8 sn | |
| Tek dosya açılışı, `hazir`a kadar (SwiftShader, 4 koşu medyanı) | ~2,1 sn | ~2,9 sn | gürültülü; JS süresi ~1,7 → ~2,2 sn |

Ağdan gelen harita verisi gzip boyutlarıyla şöyle:

| Dosya | Boyut (gzip) | Ne zaman |
|---|---|---|
| `hiyerarsi.json` | 131 KB | İlk arama ya da bölge seçimi |
| `iller.topo.json` | 149 KB | Harita ilk açıldığında |
| `ilceler/tr_41.topo.json` | 8,5 KB | İl açıldığında |
| `gebze-hucreler.bhi.gz` | 93 KB | İlçe açıldığında |
| `gebze-seritler.pmtiles` | ~0,8 KB/karo | Aralık istekleriyle |

Tek dosya derlemesinde rolldown, harita modülünü tembel *çalıştırır*: modül, sarmalayıcı işlev içinde durur. Ama kod HTML'in içinde olduğu için her açılışta *indirilir* ve *ayrıştırılır*.

## 3. Bütçe kararı: seçenek A (1 Ekim)

Haritanın verisi zaten fetch ile geliyor. `file://` altında tarayıcı buna izin vermiyor, yani harita HTTP sunucusu olmadan çalışmıyor. Bu yüzden MapLibre'yi tek dosyaya gömmek bir şey kazandırmıyordu.

Uygulama:

- `denetci.ts/gorunumModulu()` tek dosya kipinde (`import.meta.env.MODE === "tek"`) yığını `import(new URL("./harita.js", location.href))` ile yükler.
  - Sabit koşul derlemede katlanır; böylece tek dosyaya MapLibre girmez.
- Çok dosyalı derleme ve geliştirme sunucusu vite'ın tembel parçasını kullanmaya devam eder.
- `scripts/derle.ts` üçüncü bir derleme yapar: girişi `src/harita/gorunum.ts` olan tek bir ES modülü.
  - Çıktı `istemci/harita.js` olarak yazılır.
  - Tek dosyanın bütçe durumu (400 KB) ve harita yığınının boyutu ayrı satırlarda yazdırılır. Harita yığını için bütçe testi yok.
- Dağıtım düzeni: `dunya.html`, `harita.js` ve `harita-verisi/` aynı klasörde durur ve HTTP üzerinden sunulur. `file://` ile açıldığında küre çalışır; harita ise açık bir hata mesajı gösterir.
- Paylaşılan küçük modüller (`bicim`, `bildirim`, `veri`, `hucre`, topojson-client) `harita.js` içinde de bir kopya olarak bulunur. Toplamı birkaç KB.

## 4. Kararlar ve sonraki işler (1 Ekim)

1. **Arsa sınıfı eşlemesi:** Geçici eşleme kabul edildi (`fiyat.ts/arsaSinifi`): konut ve yapılı → şehir; sanayi ya da bina kesişen → kasaba; geri kalanı → kırsal.
   - Karışık sınıflı seçim yine reddediliyor.
   - Farklı sınıftan bir hücre Shift+tık ile eklenmek istenirse eklenmez ve ipucunda nedeni yazılır: "Seçim tek sınıftan olmalı (seçim: Kırsal, bu hücre: Şehir)".
   - Shift+sürükle farklı sınıftaki hücreleri atlar ve kaç hücre atlandığını söyler.
2. **Paydalar:** Fiyat payı ve %25 sınırı aynı paydayı kullanır: ilçenin uygun (satın alınabilir, su olmayan) hücre sayısı. Bu, çekirdekteki `IlceDurumu.uygunHucre` ile aynı anlamdadır. Kod: `IlceSayilari.uygun`.
3. **Bitişiklik:** Şimdilik yalnız istemcide ve sahte bağdaştırıcıda var: kenar komşuluğu gerekli, sahip olunan hücre köprü sayılıyor. **Çekirdeğe taşınacak:** çekirdek `parsel_al` bugün bitişikliği zorlamıyor.
4. **Izgara manifesti (sonraki iş):** İl başına `seritler.pmtiles` ve ilçe başına BHI1 şimdilik yalnız Gebze'de var ve `veri.ts/IZGARALI_ILCELER` içinde sabit yazılı. Veri hattı bir manifest dosyası üretince bu tablo kalkacak.
5. **`file://`:** Harita verisi ve `harita.js` yüklenmez. Bölge seçiminde hata gösterilmez; harita ya da arama denendiğinde kırıntının altına açık bir mesaj yazılır.
