# Kararsız testler belgesi: O2 teslim raporu

- Dal: `takim/o2/kararsiz-testler` (taban 7553b55; yalnız belge, kod yok). Belge: [docs/olcum/kararsiz-testler.md](../olcum/kararsiz-testler.md); bu rapor ayrı commit.
- Yöntem: yeni tekrar turu koşulmadı (sahip kararı); yalnız kapı sonuçları (`takim/kapi-sonuclari`, 18:28–20:52 UTC), PG doğrulayıcı çıktıları ve Operasyon liderinin pg notu (`fl-1..6.log`).

## Sonuç
- pg.test.ts çıkış kodu 1 (tüm testler geçiyor, 57P01 yakalanmamış hata): 8064ded 1/1, d13ba4a 3/3 kapı PG adımı, tek başına 4/6; K2 düzeltmesi (18e36b0) PG GEÇTİ. Öneri: bağlantılarda `error` dinleyicisi, `DROP DATABASE` öncesi `end()`.
- pg hesap deposu sözleşmesi (5413811) 2/2 kırık: rastgele değil, havuz kilitlenmesi; 2819a43 ile düzeldi.
- playwright yuru-etkilesim: ardışık 4 kapı koşusunda kırık, üç imza (kamera 0,68 rad, TimeoutError, Shift depar 7,0/7,0); biri taban dalında (kod değişikliğinden bağımsız). Öneri: koşula bağlı bekleme, eşik değişmeden.
- playwright f4-uctan-uca: 2 kırık (K1 yığını; "Ahır kur" düğmesi disabled, 90 sn zaman aşımı), sonra geçti; P5'te ayrı deterministik kırık (komut yolu beklentisi). "+5 dk aşama İskele" etiket sırası koşudan koşuya değişiyor (sıra bağımsız karşılaştırma önerisi).
- vitest: 6 kapı koşusunda (1800 → 2427 test) kırık yok.
- `yayin-parca`, `metrik`, `lojistik performans`: kapıda görülmedi; liste dışı.

## Geri dönüşü zor kararlar / açık sorular
Yok / kök nedenler tahmindir (belgede "doğrulanmadı" işaretli); betik kodu (f4, yuru) satır satır okunmadı.
