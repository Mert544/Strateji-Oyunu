# Dükkânlı lojistik çözüm p95 ölçümü (Alfa-0 §6.9 komut-maliyeti şartı): O2 teslim raporu

- Dal: `takim/o2/dukkan-yuk` (taban: `takim/k3/g7-2-yerel-pazar` b4a8ac3; P7 belge/araç adayı). Kod commit'leri `af61690` (betik, yardımcılar, 4 test) ve `7be4b52` (dükkân sayısı oyuncu başına); bu rapor ayrı commit.
- Araç: `packages/olcum/bench/dukkan-cozum-p95.ts` (vitest'e girmez), yardımcılar `packages/olcum/src/dukkan-yuk.ts`, test `packages/olcum/test/dukkan-yuk.test.ts`. Komut: `npx tsx packages/olcum/bench/dukkan-cozum-p95.ts` (BOT=100 TUR=44 TOHUM=7).

## Düzen
K3'ün `komut-maliyeti.ts` düzeni (sentetik-50, 100 parsel botu, kademeli katılım, tur = 6 sim-saat) AYNI süreçte art arda: BAZ (dükkânsız) ve DUKKAN (`mulk.perakende` bloğu bellekte, raf 4 yuva: gıda, ekmek, un, süt; düğümde bol stok = en kötü durum). Dükkân durumu doğrudan dünyaya yazılır (kurma komutu G7-3'te). Ölçüt: her lojistik çözümün iş parçacığı CPU süresi; tüm koşu ve kararlı hal (tüm botlar katıldıktan sonra) için p50/p95/p99/maks.

## Sonuç (tek koşu, 22:57 UTC, kapı kilidi yok, yük ~6)
`pgrep` kaydı: yalnız başka bir ajanın tek işçili vitest'i (`olcum-h2-h3`); kapı koşmuyordu.

| Kol | oyuncu | dükkân | çözüm (n) | kararlı hal p50 | p95 | p99 | maks |
|---|---|---|---|---|---|---|---|
| BAZ (dükkânsız) | 99 | 0 | 1354 | 4,0 ms | 8,0 ms | 10,6 ms | 11,6 ms |
| DUKKAN | 87 | 524 | 1667 | 17,0 ms | **22,4 ms** | 27,6 ms | 30,3 ms |

Tüm koşu p95: BAZ 7,8 ms, DUKKAN 19,0 ms. Oran dukkan/baz (kararlı hal): p50 4,23; p95 2,80; p99 2,60; ort 3,27. **Hedef p95 ≤ 300 ms: TUTTU** (13 kat pay).

## NOT: dükkân/oyuncu = 6,0 (hedef 1,5)
Bu koşuda (`af61690`) dükkân oyuncu başına değil işletme DÜĞÜMÜ başına eklendi: 524 dükkân / 87 oyuncu = **6,0 dükkân/oyuncu** (istenen 1-2, ortalama 1,5). Yani gerçekçi paydan yaklaşık 4 kat yoğun, muhafazakâr üst sınır. Hata `7be4b52` ile düzeltildi (dükkân oyuncunun ilk düğümüne, oyuncu başına). Düzeltilmiş koşu 22:59'da kapı kilidi yazıldığı için durdu ve atıldı; şart tuttuğu için tekrar koşu yapılmadı (Operasyon kararı: bir karar, bir ölçüm). Ek: dükkânlı kolda dünya farklı seyretti (87 oyuncu, BAZ 99; OZET farklı), çözüm sayısı 1667 vs 1354.

Ham çıktı: kullanım dışı kapsam; yukarıdaki tablo koşu çıktısının tamamıdır (SP/o2-cikti/dukkan-p95-kosu1-isletme-basina.txt, depoda yok).

## Doğrulama
`dukkan-yuk.test.ts` 4 test geçti; tsc (bench dahil) ve eslint temiz (kapı kilidi boşken).

## Geri dönüşü zor kararlar / açık sorular
Yok. Dükkân durumu doğrudan yazıldığından G7-3 komut yolunun maliyeti bu ölçüme girmez (komut maliyeti ayrı: K3 `komut-maliyeti.ts`).
