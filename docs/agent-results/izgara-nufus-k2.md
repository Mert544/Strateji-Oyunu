# izgara-nufus (K2): manifestteki ilçe nüfusunu çekirdek girdisine geçirme

Dal: `takim/k2/izgara-nufus`. Taban: `takim/k2/izgara-yukle` e162995 (entegrasyon 2819a43 üstünde) + K4'ün `ParselIzgaraIlce.nufus?` / `ILCE_NUFUS_ENCOK` commit'inin KOPYASI (e2868a2, G7-1a; G7-1a `entegrasyon`a girince yeniden tabanlamada kendiliğinden düşer). O3'ün manifest verisi (`takim/o3/izgara-nufus` 7f1ec91: Gemlik 124 400, Gebze 414 960, Körfez 183 077) bu dalda DEĞİL; gerçek-manifest testi nüfus varken de yokken de geçer (O3 değişikliği geçici uygulanıp doğrulandı).

## Ne yapıldı

- `IzgaraManifestIlcesi.nufus?` (manifest ilçesinde isteğe bağlı): biçim denetimi tamsayı 1..`ILCE_NUFUS_ENCOK` (20 000 000; `@bolge/veri`'den), aksi manifest aşamasında `IzgaraHatasi` ("nufus 1 ile 20000000 arasinda tamsayi olmali: <ilce>").
- `izgaraGirdisiKur`: manifestte VARSA `ParselIzgaraIlce.nufus`'a aynen geçirilir; yoksa alan YAZILMAZ (davranış bugünküyle aynı). Çekirdeğin `parselIzgaraHatalari` denetimi (V9b) açılışta zaten koşar.
- Çekirdekteki `ParselIlceTanimi.nufus` yüzü (fikstür yolu) K4/K3'ün G7-1a/1b işidir; bu dal yalnız manifest → `ParselIzgaraIlce.nufus` bağını kurar (izgara dünyasının ilçe tanımına çekirdek kendi derlemesinde taşır).

## Testler (hedefli, tek işçi)

`izgara-manifest.test.ts` (18): iki sentetik manifest testi: alan varken `ParselIzgaraIlce.nufus`'a geçer ve `parselIzgaraHatalari` boş; yokken alan YOK; geçersiz değerler (0, negatif, ondalık, metin, mantıksal, null, üst sınır aşımı, MAX_SAFE_INTEGER) reddedilir, sınır değerleri (1 ve 20 000 000) kabul. `izgara-dunya.test.ts`: JSON fikstürü ve manifest dünyası nüfus alanıyla da kurulur (fikstür `nufus`'u kabul eder; durumOzeti ve kare aynı). `izgara-gercek.test.ts`: gerçek manifestte nüfus varsa girdiye aynen geçer, yoksa alan yok. tsc (sunucu) ve eslint temiz.
