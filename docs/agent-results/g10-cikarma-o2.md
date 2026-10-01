# G10 çıkarma betiği (İ1 + İ4): O2 teslim raporu

- Dal: `takim/o2/g10-cikarma`; taban: `de9959c` (entegrasyon). Belge: [docs/olcum/insan-testi-cikarma.md](../olcum/insan-testi-cikarma.md) (komut, çıktı alanları, sınırlar).

## Değişen dosyalar
- `packages/olcum/src/insan-cikarma.ts` (yeni): günlüğü çevrimdışı oynatma ve olgu çıkarma.
- `packages/olcum/src/insan-cikarma-depo.ts` (yeni): dosya deposu salt okuma (kilit yok, yarım satır kesilmez).
- `packages/olcum/src/insan-cikarma-cli.ts` (yeni), `cli.ts` (`--kip cikarma`), `index.ts`: komut ve dışa aktarma.
- `packages/olcum/test/insan-cikarma.test.ts` (yeni, 13 test).
- `docs/olcum/insan-testi-cikarma.md` (yeni).
- Paket bağımlılığı eklenmedi, kilit dosyası değişmedi: sunucu koduna yalnız göreli yolla bağlanıldı (`parsel-dosya.ts` CLI'de; testte `depo/dosya.ts`).

## Doğrulama
- `tsc --noEmit -p tsconfig.json` ve `eslint` (yeni dosyalar) temiz; `packages/olcum/test/insan-cikarma.test.ts` 13/13 geçti (hedefli, tek dosya).
- Aynı günlük iki kez oynatılınca bayt bayt aynı çıktı; çıktıda oyuncu kimliği ya da ad yok; commit ve kural sürümü çıktıda.
- Başarısız komutlu sentetik günlükte (reddedilen ilk yapı, kabul edilen ikincisi) ilk KABUL edilen yapı, inşaat bitişi, TRT, Y7 (emsal dahil), (ii) geniş/resmî bağımsız beklentiyle eşleşir; sunucunun gerçek `DosyaGunlukDeposu`/`DosyaGoruntuDeposu` çıktısı okunur; anlık görüntü durum özeti oynatmayla eşleşir.

## Özet
Dosya deposunu çevrimdışı yeniden oynatan ve test oyuncusu başına katılım, ilk kabul edilen yapı (tür, ilçe), inşa tamamlanma, ilk gerçekleşen satış (ilk 3 saat dakikalık), ikinci yapı ve katmanı, yön komutları, dükkân, 7 günlük net üretim geliri (Y7) ve H6 (i)/(ii) (geniş bağlayıcı, resmî ikincil) çıkaran komut. Her zaman değerinin yanında TRT (+03:00) ISO.

## Geri dönüşü zor kararlar
Yok. Tasarım notları: (1) `test.olusturma` alanı yazılmaz (determinizm); (2) gözlem bitişi sakin dünyada `--bitis-t/--bitis-trt` ile verilmelidir; (3) eşlemede olmayan oyuncular çıktıya girmez.

## Açık sorular
- Pilot oturumda "gözlemcinin elle yazdığı zamanla ≤ 10 sn" kabulü doğrulanacak (yazılım dışı).
- pg yolu: K2'nin depoyu dosya biçimine döken aracı (`--dok`) bekleniyor; bu okuyucu yalnız dosya biçimini okur.
- `dukkan` çekirdekte yer tutucu (A0-11): tür adı `dukkan` varsayıldı (`DUKKAN_TURLERI`); P4'te farklı olursa tek sabit değişir.
