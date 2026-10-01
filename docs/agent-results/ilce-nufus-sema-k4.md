# ilce-nufus-sema (K4)

Dal: `takim/k4/ilce-nufus-sema`. Taban: `entegrasyon` 7553b55. Tek commit.

## Değişen dosyalar
- `packages/veri/src/parsel.ts`: `ParselIlceTanimi.nufus?: number` (tip), zod `ilceSema`'ya `nufus` (tamsayı, 1..`ILCE_NUFUS_ENCOK` = 20 000 000, isteğe bağlı), `export const ILCE_NUFUS_ENCOK`.
- `packages/veri/test/parsel-nufus.test.ts` (yeni, 3 test): alansız kabul (mini-6 ve sentetik-50'de hiçbir ilçede alan yok), alanlı kabul (1, 150 000, 20 000 000; ayrıştırma alanı korur), 0, -1, 1,5, 20 000 001 ve metin ret.
- `docs/agent-results/ilce-nufus-sema-k4.md`.

## Doğrulama
vitest (tek işçi, hedefli) `parsel-nufus` 3 + `parsel` 14 geçti; eslint 0 hata; `tsc` (yalnız `packages/veri` kapsamı) 0 hata. Hiçbir JSON değişmedi; alan yokken fikstürler ve doğrulama bit bit aynı. Kullanım (yerel talep) çekirdekte G7-1b/G7-2'de (A3 §6.5: `ilceNufusEsdegeri = nufus ?? ilceSinifiNufus[sinif]`).

## Not
`takim/k4/g7-1a-veri-sema` dalında aynı parsel.ts değişikliği (aynı metin) ve ek olarak ızgara girdisi `ParselIzgaraIlce.nufus?` vardır; birleştirmede parsel.ts hunk'ları özdeş olduğundan çakışmaz.

## Geri dönüşü zor karar / açık soru
Yok.
