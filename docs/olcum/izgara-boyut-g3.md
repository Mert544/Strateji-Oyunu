# Arsa ızgarası boyut raporu (G3, Sprint A0-02)

Üretim: 1 Ekim 2026, `packages/veri-hatti/src/osm/izgara-ilce-cli.ts`. Tablo `--rapor` çıktısıdır; sayılar `packages/veri/haritalar/odbl/izgara/manifest.json` dosyasından gelir. Ölçüm değil, kayıt: aynı komut aynı baytları verir.

## Sonuç

Gemlik (Bursa) ve Körfez (Kocaeli) için z20 ızgarası üretildi, Gebze ile aynı manifestte. Kural Gebze'dekiyle aynı: yol ve su hücrenin en az %50'sini kaplıyorsa engel, askeri alan her kesişimde engel, su hücreleri kota dışı. Kamu kuralı çekirdekte; bu hat yalnız uygunluk üretir.

| ilçe | hücre (içerde) | kara (kota) | uygun | uygun % | BHI1 ham KB | BHI1 gzip KB | şerit PMTiles KB | karo özütü KB |
|---|---|---|---|---|---|---|---|---|
| Gemlik (`tr_16_gemlik`) | 493.375 | 493.007 | 478.646 | 97,1 | 2.392,7 | 36,2 | 222,8 | 3.801,6 |
| Gebze (`tr_41_gebze`) | 508.634 | 507.045 | 485.856 | 95,8 | 2.539,0 | 83,2 | 406,7 | 9.203,5 |
| Körfez (`tr_41_korfez`) | 366.367 | 365.638 | 351.383 | 96,1 | 1.650,1 | 46,8 | 243,3 | 4.558,3 |
| toplam | 1.368.376 | 1.365.690 | 1.315.885 | 96,4 | 6.581,7 | 166,2 | 872,8 | 17.563,4 |

- BHI1 gzip: sunucu ve istemci bunu okur. Şerit PMTiles: istemci vektör katmanı. Karo özütü: Protomaps z15 bbox özütü; repoya girmez (`.onbellek`), yalnız sha256'sı manifestte.
- Engel sayıları (hücre): Gemlik yol 11.178, askeri 3.279 (Gemlik'in askeri alanı); Körfez yol 14.160, askeri 109; Gebze yol 21.159, askeri 33.
- Gebze'nin BHI1'i Sprint 1 örneğiyle bayt bayt aynı çıktı (yeni hat eski hattı yeniden üretti: sınır girdisi artık kilitli ülke indirmesinden gelir). Gebze şerit PMTiles'ı yeniden yazıldı: eski dosya tippecanoe üst verisinde makineye özgü mutlak yol taşıyordu (416.494 → 416.436 bayt, karo içeriği aynı). Yeni hatta üst veri yerden bağımsız.

## Kaynak ve kilitler

- Karo: Protomaps Basemap, `20260930` yapısı, şema 4.15.2, OSM 2026-09-30T04:00Z. `pmtiles extract --bbox=<ilçe sınırı> --maxzoom=15`; Körfez özütü yeniden alındı, sha256 aynı çıktı.
- Sınır: `hiyerarsi.json`'daki OSM ilişkileri, kilitli `idari-tr.json` (sha256 `osm-kaynak-ozetleri.json` ile doğrulanır, uyuşmazsa hat durur; canlı Overpass'a düşülmez). Bu oturumda Overpass bağlantıyı sıfırladı; kilitli indirme sayesinde gerekmedi.
- Lisans: ODbL 1.0; dosyalar `odbl/` altında, `izgara/LISANS.txt` ve manifest `lisans`/`atif` alanları.

## Determinizm

- İlçe başına iki üretim ayrı dizinlere yazıldı: BHI1 gzip ve şerit PMTiles sha256'ları aynı (`--dogrula`). `test/izgara-manifest.test.ts` aynı karşılaştırmayı Gemlik, Körfez ve Gebze için yapar ve repodaki dosyalara bağlar (karo özütü önbellekte yoksa atlanır; manifest, sha256 ve istemci/sunucu okuma testleri her zaman koşar).
- Aynı makinede ve aynı Node sürümünde doğrulandı. Hücre geometrisi `Math.log/tan/atan` kullanır; başka işletim sistemi ya da libm için bayt eşitliği doğrulanmadı (Windows'ta hat çalıştırılırsa ilk iş `--dogrula`).
- tippecanoe çıktısı, aracın PATH'ten adıyla ve çıktı dizininde göreli adlarla çağrılmasıyla yerden bağımsızdır.

## Üretim süresi

İlçe başına 5-11 sn (makine boştayken Gebze 5 sn; makine yüklüyken 25 sn'ye kadar): karo özütü ağdan 7-13 sn, ızgara ~3 sn, tippecanoe ~2 sn.

## Üç ilin kalanı (tahmin)

Ölçülen üç ilçenin alana oranından (gzip KB/km²: 0,09-0,20; şerit KB/km²: 0,55-0,98). İl alanları `hiyerarsi.json`'dan: Kocaeli 3.427, Sakarya 4.798, Bursa 10.749 km²; üçü 18.974 km², üretilen üçü 1.145 km², kalan ~17.800 km² (Kocaeli 10, Sakarya 16, Bursa 16 ilçe).

| | düşük | yüksek |
|---|---|---|
| BHI1 gzip, kalan ilçeler | ~1,6 MB | ~3,5 MB |
| şerit PMTiles, kalan ilçeler | ~9,8 MB | ~17,4 MB |
| hücre (içerde) | ~21 milyon | ~21 milyon (alan/835 m²; kıyı ve dağlık ilçelerde Mercator ölçeğiyle ±%10) |

Bursa dağlıktır (orman ve boş "diğer" sınıfı sıkıştırmayı artırır, gzip tarafı düşük uca yakın beklenir). Ölçüm yerine tahmindir; ikinci dalga bitince bu tablo gerçek değerle değiştirilir.

## Yeniden üretim

```
tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --ilce tr_16_gemlik --ilce tr_41_korfez [--dogrula]   # ağ: pmtiles extract
tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --rapor      # bu tablo
tsx packages/veri-hatti/src/osm/izgara-ilce-cli.ts --kontrol    # manifest + dosya sha256
```
Araçlar `.onbellek/araclar` altındadır (go-pmtiles v1.31.2, tippecanoe v2.82.0; kurulum `docs/arastirma/karo-ve-izgara-denemesi.md` §7). Yeni ilçe: `--ilce <kimlik>`; manifest ve `odbl/izgara/` otomatik güncellenir. Yeni karo yapısı bilinçli güncellemedir (`KARO_YAPISI`).
