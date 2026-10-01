# Bakım ve aşınma temel ölçümü: O2 teslim raporu

- Dal: `takim/o2/olcum-temel`; taban: `d28447d` (entegrasyon o gün). Commit: `0ab6957` (bu rapor ayrı commit).
- Ana belge: [docs/olcum/bakim-asinma-temel.md](../olcum/bakim-asinma-temel.md) (yöntem, yeniden üretim komutları, tablolar, kod okuma yanıtları). Ham özet tablolar: [parsel-bakim-ozet-gec60.md](../olcum/parsel-bakim-ozet-gec60.md), [parsel-bakim-ozet-kisa.md](../olcum/parsel-bakim-ozet-kisa.md).

## Değişen dosyalar
- `packages/olcum/src/parsel-bakim.ts` (yeni): yalnız okuyan ölçüm izleyicisi.
- `packages/olcum/src/parsel-bakim-rapor.ts` (yeni): `--bakim-ozet` özet tabloları.
- `packages/olcum/src/parsel-kosu.ts`, `parsel-cli.ts`, `index.ts`: `--bakim-olc`, `--bakim-ozet` bayrakları ve bağlantı.
- `packages/botlar/src/parsel-kosucu.ts`: `komutIzle` okuma kancası (varsayılan kapalı).
- `packages/olcum/test/parsel-bakim.test.ts` (yeni).
- `docs/olcum/bakim-asinma-temel.md`, `parsel-bakim-ozet-{gec60,kisa}.md`, `parsel-bakim-{gec60,kisa}-*.md` (yeni). JSON'lar depoda yok (boyut); komutlarla üretilir.
- Çekirdeğe dokunulmadı.

## Doğrulama
- `tsc --noEmit -p tsconfig.json` ve `eslint` (değişen dosyalar): temiz.
- `packages/olcum/test` tamamı: 226 geçti, 2 atlama (mevcut `BOLGE_AGIR_TEST` kapısı; bu işle ilgisiz).
- Ölçüm açıkken koşu çıktısı ölçüm alanı hariç kapalıyla bayt bayt aynıdır (test). Karşılığı olan altı koşunun JSON'u mevcut `parsel-v1-*.json` ile ölçüm alanı, süre ve etiket dışında birebir aynıdır.
- Temiz ağaç: JSON dışı tüm çıktılar commit'te.

## Özet
Yönetim kapalı ve açık yedi koşu (gec60 x4 tohum 1–10, kisa x3 tohum 1–3) için Y7 gelir/emsal, aşınma yörüngesi ve eşik günleri, 7 günlük gelir kalemleri, bakım harcaması, parça piyasası ve parça stoğu ham tablo olarak çıkarıldı; yorum yok (A2'nin). Kod okuma: mülk kipi botları `bakim_duzeyi` vermez; kit parçası yapı inşaatında harcanır.

## Geri dönüşü zor kararlar
Yok.

## Açık sorular
- Genel onarım yolu bu koşularda hiç çalışmadığından onarım maliyet ölçümü doğrulanmadı. "Parça ithalatı kapalı + onarım açık" ayrı koşusu A2 ve Ar-Ge liderinin yanıtını bekliyor; yanıta kadar koşulmayacak.
