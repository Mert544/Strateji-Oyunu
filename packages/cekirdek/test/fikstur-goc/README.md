# fikstur-goc: dondurulmuş anlık görüntüler

Testlerdeki "eski görüntü" çoğu yerde o anki kodla üretilir ve eski kodu sınamaz. Bu klasördeki dosyalar ESKİ çekirdekle üretilip dondurulmuştur; yeniden üretim komutları ilgili üretici betiğin başlığındadır.

| Dosya | Zarf | Üretildiği commit | Üretici | İçerik |
|---|---|---|---|---|
| `bolge-v1.json`, `mulk-v1.json` (+ `.ust.json`) | sürüm 1 | 71c8616 | `uret-v1.ts` | bölge kipi 3 gün; mülk kipi ek yapılar |
| `mulk-v2-g6oncesi.json` (+ `.ust.json`) | sürüm 2 | 7553b55 (G6 öncesi `entegrasyon`) | `uret-mulk-v2.ts` | para defterli mülk dünyası: 3 oyuncu, 24 hücre, yapılar, ihracat satışı, parsel alım/bırakma, 7 kamu kasası, sistem ödülü; 75 KB |
| `icerik-kimlik-kilidi.json` | | | (bkz. `uret-v1.ts` başlığı) | içerik kimlik sırası kilidi |

Üretim (v2; çıktı bayt bayt aynı olmalı): `npx tsx packages/cekirdek/test/fikstur-goc/uret-mulk-v2.ts <cikti-dizini>/` (7553b55 ile aynı `packages/cekirdek/src` içeren bir ağaçta; adımlar betik başlığında). G6 sonrası kodla yeniden ÜRETİLMEZ.
