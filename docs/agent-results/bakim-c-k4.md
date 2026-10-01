# bakim-c (K4): mülk bakımı C (`param.mulk.bakim`)

Dal: `takim/k4/bakim-c`. Taban: `takim/k4/g6-3-icerik` 2eb4289 (G6-2b 709aede üstü). Kaynak: A3 şartnamesi §5.10 (dc6185f; hidro parça çarpanı 200 000). `parametreler.json` DEĞİŞMEZ (değerler G7-4'te T3 commit'inde).

## Yapılanlar
- **Veri (`packages/veri/src`):** `MulkBakimParametreleri` (tipler), zod `.strict()` (`asinmaHizCarpaniPpm` (0, 2 000 000], `asinmaVerimKaybiTavaniPpm` [0, 1 000 000], `yontemParcaPpm` kimlik -> (0, 2 000 000]), V18 (aralıklar + türev aşınma sınırı: çarpılmış düzey ve kıtlık aşınması [-1 000 000, 1 000 000] içinde), V19 (`perakende-dogrula.ts`: yöntem kimliği içerikte, `bakim` girdisi boş değil, her miktar çarpandan sonra >= 1; sanayi yoksa aşınma ayarları için uyarı).
- **Çekirdek:**
  - `tipler.ts`: `DerlenmisMulkBakim` ve `DerlenmisMulk.bakim?` (yalnız eklenen alan).
  - `derle.ts mulkDerle`: tablo YALNIZ etkin satırlardan (çarpan !== PPM; tavan sanayi değerinden farklı; parça çarpanı !== PPM); hiç etkin satır yoksa alan OLUŞMAZ; `Error`'lar: bilinmeyen yöntem, aralık, boş bakım girdisi, miktar 0'a iner.
  - `sanayi/carpan.ts`: `mulkBakim(ic, b)` (yalnız `b.merkez` olan mülk düğümünde), `cezaCarpani`'ya 4. isteğe bağlı `tavanPpm`, `bakimGirdiMiktari` (parça çarpanı sonra ölçek x düzey; çözümün VE yardımcının tek kaynağı), `bakimGirdileriSaat(d, ic, b, ts)` ve `bakimParcaSaat(d, ic, b, ts)` (parça/sa, mili-birim; sunucu ve istemci göstergesi için; `sanayi/index.ts` dışa aktarır).
  - `ekonomi/uretim.ts`: C2 (`ciktiCarpaniHesapla` tavan), C3 (santral elektrik kapasitesi tavanı), C4 (`bolgeHesapla` bakım talebi artık `bakimGirdiMiktari` ile); `sanayi/gunluk.ts`: C5 (düzey ve kıtlık aşınması). Dokunulmayanlar şartnamedeki gibi (`cozum.ts`, `komut.ts`, `tablo.ts:81`...).
- **Testler:** `veri/test/dogrulama.test.ts` (`mulk.bakim` describe: V18, V19, her ret için geçerli karşıt değer), `cekirdek/test/mulk-bakim.test.ts` (10 test): (a) derleme (yalnız etkin satırlar; çarpan 600 000 negatif kontrolü; hata durumları), (b) ANA KANIT: mülk kipinde `mulk.bakim { 500 000, 250 000 }` = O2 `<C>` global `sanayi.bakim` ayarı, 25 gün 12 noktada tam `durumOzeti` aynı (aşınma birikir; tam hızda ~500 000, yarım hızla ~250 000); negatifler: blok yok ve tavan 400 000 özetten farklı, `kuralSurumu` blokla değişir/blok yokken aynı, (c) parça birimi: `yuzey_cevher` düzey normal S 200, asgari 100, M 400; `hidro_santrali` 400; `derin_cevher` 1 500; `bakimParcaSaat` çözümün tüketimiyle (`bolgeHesapla.bakim`) BİREBİR; negatifler: blok yok 1 000 ve hidro 2 000, bölge kipi (blok veride olsa da) 1 000, (d) kıtlık: bloklu 200 mili/sa ile stok yeter (karşılanma PPM, aşınma 0), blok yokta karşılanma eşiğin altı ve aşınma > 0, (e) blok yok = `{}` = kimlik değerleri: 12 noktada aynı `durumOzeti`, K-6: bölge kipi veri kopyasına tam blok => aynı özet; aynı değerler global `sanayi.bakim`'e yazılınca FARKLI.

## Doğrulama (hedefli, tek işçi)
`mulk-bakim` 10/10, `dogrulama` 40/40; sanayi-*, esik-budama-kanit (bot kalkanları dahil), mulk-*, pazar-regresyon (çekirdek ve botlar), para-guvenligi, sebeke-*, yontem-*, botlar sanayi: 29 dosya, 356 test yeşil. eslint temiz; tsc (çekirdek ve veri src kapsamı) temiz. Bölge kipi altınları BİREBİR (blok bölge kipinde okunmaz). `pnpm install` yapılmadı.

## Geri dönüşü zor karar
Yok (blok yokken davranış bit bit aynı; `kuralSurumu` yalnız blok verisi eklenince, G7-4'te değişir).

## Açık sorular
1. `bakimParcaSaat` imzası `(d, ic, b, ts)`: sunucu/istemci `d` (sahibin bakım düzeyi için) ve `b` (işletme düğümü) vermeli; istersen tesis -> bölge eşlemesiyle tek argümana indirilir.
2. C6 (`botlar/src/parsel.ts` parça açığı hesabı) O2 işi; `bakimGirdileriSaat`/`bakimParcaSaat` bot tarafından da kullanılabilir.
