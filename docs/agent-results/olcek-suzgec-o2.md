# Ölçek inşaatı süzgeci: O2 teslim raporu

- Dal: `takim/o2/olcek-suzgec`; taban: `8064ded` (entegrasyon). Commit: `6bcbba9` (bu rapor ayrı commit).
- Hata: `packages/botlar/src/parsel.ts` iki satırda (`yapiSayilari`, `netCikti`) `InsaatDurumu.hedef`'i her inşaat türünde tür indeksi sanıyordu. `hedef` türe göre değişir (tesis: tür indeksi, kenar: kenar indeksi, olcek: tesis kimliği). Süren `olcek` inşaatında TypeError ya da yanlış tür adı verirdi. Bugün botlar yükseltme yapmadığı için tetiklenmiyordu.

## Değişen dosyalar
- `packages/botlar/src/parsel.ts`: iki satıra `i.tur === "tesis"` süzgeci.
- `packages/botlar/test/parsel-olcek-insaat.test.ts` (yeni): süren olcek inşaatıyla (hedef = tesis kimliği 22, tür sayısı 18) karar atmaz ve inşaat yokmuş gibi aynıdır.

## Doğrulama
- Süzgeçsiz test kırılır (`TypeError: Cannot read properties of undefined (reading 'id')`); yalnız ilk satır düzeltilince ikinci satır için de kırılır (iki satır ayrı kanıtlandı).
- `packages/botlar/test` 104 test yeşil; `packages/olcum/test/parsel-kosu.test.ts` 46 yeşil (2 `BOLGE_AGIR_TEST` atlaması mevcut kapı); `tsc` ve `eslint` temiz.
- Bayt bayt aynılık: v1 kisa-temel, kisa-tarim-bakim ve gec60-tarim-bakim md raporları yeniden üretilince aynı.

## Geri dönüşü zor kararlar / açık sorular
Yok.
