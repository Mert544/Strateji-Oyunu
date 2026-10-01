# G3 teslim raporu: Alfa-0 ilçelerinde arsa ızgarası (O3)

Dal `takim/o3/g3-izgara`, taban `entegrasyon` (d28447d). 1 Ekim 2026.

## Yapılan

- Gemlik (`tr_16_gemlik`) ve Körfez (`tr_41_korfez`) için z20 ızgarası üretildi; Gebze aynı hatta yeniden üretildi (BHI1 Sprint 1 örneğiyle bayt bayt aynı).
- Hat ilçe parametresiyle genellendi (`izgara-ilce.ts`, `izgara-ilce-cli.ts`); Gebze'ye özel kod kalmadı. Sınır artık kilitli ülke indirmesinden gelir (sha256 uyuşmazsa hat durur), canlı Overpass gerekmez. Karo: Protomaps `20260930` yapısından `pmtiles extract`.
- Üretilmiş manifest: `packages/veri/haritalar/odbl/izgara/manifest.json` (ilçe, yol, bayt, sha256, hücre sayıları, kural, kaynak sürümleri). Okuma/doğrulama: `izgara-manifest.ts` (`manifestOku`, `manifestiDogrula`, `ilceIzgarasiOku`).
- Boyut raporu: `docs/olcum/izgara-boyut-g3.md`. DATA_SOURCES.md §9 eklendi.
- Determinizm: ilçe başına iki üretim bayt bayt aynı (BHI1, şerit PMTiles); karo özütü yeniden alındığında da aynı sha256. tippecanoe çıktısı yerden bağımsız yapıldı (üst veride mutlak yol vardı).

| ilçe | hücre | kara | uygun | BHI1 gzip | şerit |
|---|---|---|---|---|---|
| Gemlik | 493.375 | 493.007 | 478.646 | 36,2 KB | 222,8 KB |
| Körfez | 366.367 | 365.638 | 351.383 | 46,8 KB | 243,3 KB |
| Gebze | 508.634 | 507.045 | 485.856 | 83,2 KB | 406,7 KB |

## Doğrulama

- `vitest run packages/veri-hatti`: 9 dosya geçti (2 dosya atlandı), 93 test geçti, 3 atlandı (karo özütü ve indirmeler olmayan ortamda gerçek veri testleri atlanır). Yeni: `test/izgara-manifest.test.ts` (10 test: manifest, sha256, BHI1 sayımları, istemci `bhiCoz` ile sunucu tarafı `ilceIzgarasiOku` aynı baytlardan aynı hücreler, gerçek veri iki üretim).
- `tsc --noEmit` (kök) ve `eslint packages/veri-hatti`: temiz.
- Gebze şerit PMTiles yeniden yazıldı (416.494 → 416.436 bayt); 609 karonun hiçbirinin içeriği değişmedi (karo karo karşılaştırıldı), yalnız üst veri.

## İstemci ve sunucu okuma yolu (K1/K2 için öneri; ben dokunmadım)

İstemci `IZGARALI_ILCELER` tablosu elle yazılı ve yalnız Gebze'yi biliyor. Yerleş ekranı Gemlik/Körfez için "yakında" demeye devam eder. En küçük değişiklik `SP/takim/o3-g3-istemci-yama.diff` (K1 dosyaları `packages/istemci/src/harita/veri.ts` ve `scripts/derle.ts`):

- `veri.ts`: `IZGARALI_ILCELER` manifestten türetilir (`import ... manifest.json`, kaynak `odbl/izgara/manifest.json`).
- `derle.ts`: harita-verisi kopya listesi manifestten kurulur.
- Yama kendi ağacımda denendi (istemci `tsc` temiz, `harita-hucre` ve `harita-f4-yerles` testleri geçti), sonra geri alındı.
- Tam 45 ilçelik manifest ~45 KB ham (~8-10 KB gzip) JS'ye girer; dunya.html bütçesi etkilenecekse alternatif: manifesti çalışma anında `fetch` etmek (o zaman `izgaraVarMi` eşzamansız olur).
- Yerleş ekranında "Hazır arsalar var" görünmesi için ilçenin sunucuda da olması gerekir (`sunucuda` bayrağı).

Sunucu tarafı: sunucu ızgarayı doğrudan okumuyor; ilçeyi `--parsel-dosya` parsel fikstürüyle alıyor. Fikstür Gebze için yalnız istemci betiğiyle (`scripts/f4-sunucu.ts`) üretiliyor. Ölçüm (taslak betik, commit'lenmedi): Gebze + Körfez + Gemlik tek fikstür:

- JSON 69,9 MB (gzip 3,6 MB), hücre başına ~50 bayt.
- `--parsel-dosya` ile sunucu açılışı 21 sn (makine yüklüyken, yük ortalaması 16; kurtarma kısmı 6,5 sn), süreç belleği 1,15 GB.
- Ölçekleme: 3 ilin ~48 ilçesi ≈ 21 milyon hücre ≈ 1 GB JSON; JSON dizgesi V8 sınırını (~512 MB) aşar, bellek ~18 GB. **Parsel fikstürü JSON yolu Alfa-0'ın 3 iline ölçeklenmez.** Alfa-0 aday listesindeki 6 ilçe için bile ~140 MB JSON ve ~2,3 GB bellek.
- Öneri (K2/K3 kararı): sunucu ilçeleri manifestten BHI1 olarak okusun (ilçe başına 37-85 KB gzip, toplam ~166 KB), parsel tanımlarını bellekte kursun. Sınıf eşlemesi (`arsaSinifi`) şimdi istemcide ve "geçici"; çekirdek tarafına taşınması gerekir. Il → bölge eşlemesi de açık (f4-sunucu mini-6'nın `m_ova` bölgesini ödünç alıyor).

## Geri dönüşü zor kararlar

- Manifest yolları `odbl/` köküne göredir; Gebze dosyaları `ornek/` altında kaldı (istemci derlemesi onlara bağlı), yenileri `izgara/` altında. İstemci geçişinden sonra Gebze `izgara/` altına taşınabilir.
- Karo yapısı `20260930`'a sabitlendi; yeni yapı bilinçli güncellemedir (`KARO_YAPISI`) ve tüm ilçeler yeniden üretilir.

## Açık sorular

1. İstemci yamasını K1 uygulayacak mı, hangi sprintte?
2. Sunucunun ızgarayı manifestten okuması (yukarıdaki ölçek bulgusu) K2/K3 için sprint işi mi?
3. İkinci dalga (Kocaeli 10, Sakarya 16, Bursa 16 ilçe): tahmini 1,6-3,5 MB BHI1 gzip ve 9,8-17,4 MB şerit; ilçe başına ~10 sn. Başlatayım mı?
4. Başka işletim sisteminde (Windows) hücre geometrisi `Math.log/tan/atan` yüzünden bayt eşitliği doğrulanmadı.
