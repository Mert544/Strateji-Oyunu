# izgara-nufus: manifeste ilçe nüfusu (G7, O3)

Dal `takim/o3/izgara-nufus`, taban `13a67e8` (K4 G7-1a: `ParselIzgaraIlce.nufus?`) + `nufus-fikstur` (`bd31b40`, burada `b556d04`). K2'nin `takim/k2/izgara-nufus` dalı manifestteki alanı `ParselIzgaraIlce.nufus`'a geçirir.

## Yapılan

- `izgara/manifest.json`: Gemlik (124.400), Gebze (414.960), Körfez (183.077) ilçelerine `nufus` (kaynak `yapilandirma/ilce-nufus.json`, TÜİK ADNKS 2025). Üçü de veride var (Gemlik Bursa'da: 124.400; 45/45 eşleşme `ilce-nufus.test.ts`'te).
- `izgara-manifest.ts`: `nufus` isteğe bağlı alan, zod sınırı K4'ün `ILCE_NUFUS_ENCOK`'u (1..20.000.000).
- `izgara-ilce-cli.ts`: yeniden üretimde `ilceKaydi` `nufus` yazar; yeni `--nufus` modu mevcut manifestteki ilçelere veriden nufus yazar (ağ, karo ve BHI1/şerit yeniden üretimi gerekmez), idempotent (iki koşu aynı bayt), `nufus` anahtarı `osmIliski`'den sonra.
- `izgara-manifest.test.ts`: yeni test, her ilçenin `nufus` değeri yapılandırmayla aynı ve üç değer sabit.

## Doğrulama

- `vitest run packages/veri-hatti/test/izgara-manifest.test.ts packages/veri-hatti/test/ilce-nufus.test.ts`: 22 testten 19 geçti, 3 atlandı (önbelleksiz); tsc ve eslint temiz.
- 3 "gerçek veri (önbellek varsa)" testi ÖNBELLEKLE ayrıca koşuldu (kural: manifest değişince önbellekle koşulur). Önbellek: Protomaps `20260930` özütleri (`karolar/gebze-z15`, `tr_16_gemlik-z15`, `tr_41_korfez-z15`), kilitli `osm/idari-tr.json` (OSM 2026-10-01T06:29:34Z), tippecanoe v2.82.0. Sonuç (tek işçi, kapı koşarken): `tr_16_gemlik gercek veri` geçti (16,5 sn), `tr_41_korfez gercek veri` geçti (18,5 sn), `tr_41_gebze gercek veri` geçti (19,6 sn); BHI1 ve şerit sha256'ları repodaki dosyalarla aynı (veri değişmedi, yalnız manifest alanı eklendi).

## Not

`ParselIzgaraIlce.nufus` okuma yolu K2'nin `takim/k2/izgara-nufus` dalındadır; manifest alanı isteğe bağlıdır (nüfusu veride olmayan ilçede hiç yazılmaz). Manifest `.strict()` zod şeması yalnız `veri-hatti` içindedir ve bu dalda `nufus`'u tanır.
