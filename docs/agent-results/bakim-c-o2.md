# Bakım ikinci tur ölçümü: O2 teslim raporu

- Dal: `takim/o2/bakim-c` (taban: `takim/o2/olcum-temel`, yani üstüne yığılı; olcum-temel girmeden girmez). Ölçüm commit'i ayrı, bu rapor ayrı commit.
- Ana belge: [docs/olcum/bakim-asinma-c.md](../olcum/bakim-asinma-c.md); ham tablolar `docs/olcum/parsel-bakim-c-{ozet-gec60,ozet-r34,ozet-r8,izgara-r6}.md`.

## Değişen dosyalar
- `packages/olcum/src/parsel-kosu.ts`, `parsel-cli.ts`, `parsel-rapor.ts`, `parsel-bakim.ts`, `parsel-bakim-rapor.ts`: `--param-ayar`, `--onarim-yonetimi`, `--bakim-izgara`, günlük ithalat/stok örneği, R9 başabaş tablosu.
- `packages/botlar/src/parsel.ts`: `onarimYonetimi` ve `bakimIthalati` bot seçenekleri (varsayılan kapalı).
- `packages/olcum/test/parsel-bakim.test.ts`: paramAyar, onarimYonetimi, ızgara testleri.
- Çekirdeğe dokunulmadı; varsayılan çıktılar bayt bayt aynı.

## Doğrulama
- `parsel-bakim.test.ts`: 9 geçti (kapı koşarken tek işçiyle).
- Koşular: R3/R4 (10 tohum), R9/R10 yeniden (10 tohum), R8 (3 tohum, 3 yönetim), R6 (32 koşu, 3 tohum). Her koşu saniyeler sürdü.

## Geri dönüşü zor kararlar
Yok.

## Açık sorular / not
- R6 bloğu kapı kilidi canlıyken başlatıldı (denetimim komuta bağlı değildi); koşular kısaydı, kapı çıktılarına dokunmadı. Bundan sonra her ağır komut kilit denetimine bağlı.
