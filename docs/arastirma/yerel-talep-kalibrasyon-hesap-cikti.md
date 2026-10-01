# Yerel talep kalibrasyonu: hesap çıktısı (otomatik üretildi)

Girdi: `packages/veri/icerik/icerik.json` (ekmek taban fiyatı). Nüfus: T3 `ilce-nufus.tsv` (TÜİK ADNKS 2025, ikincil derleme; birincil teyit yok = doğrulanmadı). Model: p4-p5-ekonomi-hesap.mjs §5 (fırın dükkânı, ekmek rafı, 1,05 R, çeşit 0,5, kasa 90 birim/sa).

## 1. Nüfus dağılımı (45 ilçe, ADNKS 2025, ikincil derleme)

| Nüfus bandı | İlçe sayısı | Toplam nüfus | Toplamın payı |
|---|---|---|---|
| < 10 bin | 3 | 22.301 | %0 |
| 10–30 bin | 6 | 109.330 | %2 |
| 30–60 bin | 10 | 492.575 | %8 |
| 60–100 bin | 7 | 607.901 | %9 |
| 100–200 bin | 11 | 1.575.153 | %24 |
| 200–400 bin | 4 | 1.206.896 | %18 |
| ≥ 400 bin | 4 | 2.533.719 | %39 |

Toplam 6.547.875; medyan ilçe 86.543; ortalama 145.508; en büyük/en küçük 886.111 / 6.089 (oran 146). Dağılım ağır kuyrukludur: ilk 6 ilçe toplamın %49'ini taşır.

## 2. Ölçülen hücre sınıfı: baskın sınıf kuralı üç ilçede de kırsal çıkıyor

Kural (A3 §6.5): ilçe sınıfı = uygun hücrelerin en çok olan sınıfı (istemci `arsaSinifi` geçici eşlemesi). Ölçülen:

| İlçe | Kırsal hücre | Kasaba hücre | Şehir hücre | Kırsal payı | Baskın sınıf | Yaklaşık nüfus | Sınıf eşdeğeri (10 / 40 / 120 bin) | Eşdeğer / gerçek |
|---|---|---|---|---|---|---|---|---|
| Gemlik | 465.007 | 4.347 | 9.292 | %97 | **kırsal** | 124.400 | 10.000 | 0,080 |
| Gebze | 451.912 | 20.366 | 13.578 | %93 | **kırsal** | 414.960 | 10.000 | 0,024 |
| Körfez | 328.183 | 8.064 | 15.136 | %93 | **kırsal** | 183.077 | 10.000 | 0,055 |

Üç ilçede de kırsal hücre payı %93–97; gerçek nüfusları 120–410 bin. Sınıf eşdeğeri 10 bin demek talebi 12–41 kat eksik saymaktır. (Diğer 42 ilçe ölçülmedi: Osmangazi, Nilüfer gibi kent merkezlerinde pay değişebilir, ama arazi tabanlı hücre sınıfı yoğun kentte bile ilçe alanının büyük kısmı kırsal olduğundan baskın sınıf büyük olasılıkla kırsaldır (doğrulanmadı).)

## 3. Tek dükkânın net primi nüfusa göre (ilçede 1 fırın dükkânı, 1,05 R, yerelOlcek 50)

| Nüfus | Q ekmek birim/sa | Satış birim/sa | Kasa doluluğu | Net ₺/sa (prim − gider) | Geri ödeme sa (nakit 8.945 ₺) |
|---|---|---|---|---|---|
| 5.000 | 15,0 | 8,4 | %9 | -52 | hiç |
| 10.000 | 30,0 | 16,8 | %19 | 29 | 312 |
| 20.000 | 60,0 | 33,7 | %37 | 189 | 47 |
| 40.000 | 120,0 | 67,4 | %75 | 511 | 18 |
| 60.000 | 180,0 | 90,0 | %100 | 727 | 12 |
| 100.000 | 300,0 | 90,0 | %100 | 727 | 12 |
| 120.000 | 360,0 | 90,0 | %100 | 727 | 12 |
| 200.000 | 600,0 | 90,0 | %100 | 727 | 12 |
| 400.000 | 1200,0 | 90,0 | %100 | 727 | 12 |
| 890.000 | 2670,0 | 90,0 | %100 | 727 | 12 |

Doyma ≈ 100 bin nüfusta (kasa 90 birim/sa dolar); başabaş ≈ 7 bin. Yani Q nüfusa doğrusal, dükkân neti ise 7–100 bin arasında değişir ve 100 binden sonra sabittir: nüfus doğruluğu en çok küçük ve orta ilçelerde önemlidir.

## 4. Seçenekler: dünya yerelNpc musluğu, ZP8 ve dükkân kârlı ilçe payı

Oyuncu yerleşimi iki senaryo: **U** her ilçede eşit (200 oyuncu / 45 ≈ 4,4; ilçe başına dükkân = 4 ya da 5 dağıtılarak), **N** oyuncu nüfusla orantılı (en az 1). Her oyuncu 1 fırın dükkânı. ZP8 payı = yerelNpc / (yerelNpc + ihracatNpc 112,3 M ₺/hafta).

| Seçenek | Yerleşim | Dünya talep Q ekmek birim/sa | yerelNpc ₺/hafta | ZP8 payı | Kârlı ilçe (net > 0) | Medyan dükkân neti ₺/sa | Medyan geri ödeme sa |
|---|---|---|---|---|---|---|---|
| A3 şartnamesi olduğu gibi: baskın hücre sınıfı = kırsal (10.000), yerelOlcek 50 | U | 1.350 | 10.716.300 | %9 | 0/45 | -78 | hiç |
| A3 şartnamesi olduğu gibi: baskın hücre sınıfı = kırsal (10.000), yerelOlcek 50 | N | 1.350 | 9.859.007 | %8 | 13/45 | -60 | hiç |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçek nüfusa eşitlenir) | U | 19.644 | 155.930.050 | %58 | 45/45 | 649 | 14 |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçek nüfusa eşitlenir) | N | 19.644 | 105.926.948 | %49 | 44/45 | 727 | 12 |
| (b) ilçe başına gerçek nüfus, yerelOlcek 50 | U | 19.644 | 99.430.838 | %47 | 38/45 | 332 | 27 |
| (b) ilçe başına gerçek nüfus, yerelOlcek 50 | N | 19.644 | 153.704.531 | %58 | 43/45 | 530 | 17 |
| (c) karma: nüfus bandından sınıf (< 30 bin kırsal, < 150 bin kasaba, ≥ 150 bin şehir), sınıf eşdeğeri = bant geometrik ortalaması (13.000 / 73.000 / 299.000), yerelOlcek 50 | U | 17.049 | 97.065.292 | %46 | 36/45 | 260 | 34 |
| (c) karma: nüfus bandından sınıf (< 30 bin kırsal, < 150 bin kasaba, ≥ 150 bin şehir), sınıf eşdeğeri = bant geometrik ortalaması (13.000 / 73.000 / 299.000), yerelOlcek 50 | N | 17.049 | 120.582.073 | %52 | 45/45 | 390 | 23 |
| (c0) karma, nüfus bandından sınıf (< 20 bin / < 69 bin / üstü), sınıf eşdeğeri 10 / 40 / 120 bin (A3 sabitleri), yerelOlcek 50 | U | 11.010 | 87.397.380 | %44 | 38/45 | 383 | 23 |
| (c0) karma, nüfus bandından sınıf (< 20 bin / < 69 bin / üstü), sınıf eşdeğeri 10 / 40 / 120 bin (A3 sabitleri), yerelOlcek 50 | N | 11.010 | 83.400.311 | %43 | 43/45 | 297 | 30 |

Okuma: **A3'ün olduğu gibi** hâlinde her ilçe kırsal sayılır: talep nüfusa değil ilçe sayısına bağlanır, dükkân neti kırsal düzeyde (≈ 30 ₺/sa) kalır ve yerelNpc ihmal edilebilir; bu A2 §1.10'daki %45'lik ZP8 beklentisinin (ilçelerin %60'ı şehir varsayımıyla) çok altındadır. (a) toplamı gerçek nüfusa getirir ama her ilçeyi eşit yapar: küçük ilçe zengin, büyük ilçe fakir görünür. (b) gerçeğe en yakın, ama şemaya ilçe başına nüfus alanı ister. (c) karma, şemaya yalnız sınıf bilgisini taşır; hata bandı içinde kalır (aşağıda).

### 4b. yerelOlcek taraması (ZP8 sınırı %50 ve dükkân kârlılığı birlikte)

| Seçenek | yerelOlcek | Yerleşim | yerelNpc ₺/hafta | ZP8 payı | Kârlı ilçe | Medyan dükkân neti ₺/sa | Medyan geri ödeme sa |
|---|---|---|---|---|---|---|---|
| (b) ilçe başına gerçek nüfus | 20 | U | 53.619.803 | %32 | 26/45 | 54 | 166 |
| (b) ilçe başına gerçek nüfus | 20 | N | 61.481.228 | %35 | 38/45 | 133 | 67 |
| (b) ilçe başına gerçek nüfus | 30 | U | 72.054.284 | %39 | 34/45 | 147 | 61 |
| (b) ilçe başına gerçek nüfus | 30 | N | 92.222.128 | %45 | 41/45 | 265 | 34 |
| (b) ilçe başına gerçek nüfus | 35 | U | 79.300.620 | %41 | 35/45 | 193 | 46 |
| (b) ilçe başına gerçek nüfus | 35 | N | 107.592.562 | %49 | 41/45 | 332 | 27 |
| (b) ilçe başına gerçek nüfus | 40 | U | 86.546.818 | %44 | 36/45 | 240 | 37 |
| (b) ilçe başına gerçek nüfus | 40 | N | 122.963.494 | %52 | 42/45 | 398 | 22 |
| (b) ilçe başına gerçek nüfus | 50 | U | 99.430.838 | %47 | 38/45 | 332 | 27 |
| (b) ilçe başına gerçek nüfus | 50 | N | 153.704.531 | %58 | 43/45 | 530 | 17 |
| (c) karma, bant geometrik ortalaması | 20 | U | 54.133.985 | %33 | 31/45 | 25 | 362 |
| (c) karma, bant geometrik ortalaması | 20 | N | 52.924.625 | %32 | 33/45 | 77 | 116 |
| (c) karma, bant geometrik ortalaması | 30 | U | 77.504.473 | %41 | 36/45 | 103 | 87 |
| (c) karma, bant geometrik ortalaması | 30 | N | 79.387.176 | %41 | 36/45 | 181 | 49 |
| (c) karma, bant geometrik ortalaması | 35 | U | 84.234.023 | %43 | 36/45 | 142 | 63 |
| (c) karma, bant geometrik ortalaması | 35 | N | 91.953.919 | %45 | 45/45 | 234 | 38 |
| (c) karma, bant geometrik ortalaması | 40 | U | 88.511.875 | %44 | 36/45 | 181 | 49 |
| (c) karma, bant geometrik ortalaması | 40 | N | 102.695.589 | %48 | 45/45 | 286 | 31 |
| (c) karma, bant geometrik ortalaması | 50 | U | 97.065.292 | %46 | 36/45 | 260 | 34 |
| (c) karma, bant geometrik ortalaması | 50 | N | 120.582.073 | %52 | 45/45 | 390 | 23 |

## 5. Karma seçenekte (c) sınıf sabitinin hatası

| Sınıf (nüfus bandı) | İlçe sayısı | Bant | Geometrik ortalama (önerilen eşdeğer) | Eşdeğer / gerçek: en düşük | en yüksek | Ortalama mutlak log hatası |
|---|---|---|---|---|---|---|
| kirsal | 9 | < 30 bin | 13.000 | 0,51 | 2,13 | 1,53× |
| kasaba | 23 | 30–150 bin | 73.000 | 0,49 | 2,31 | 1,43× |
| sehir | 13 | ≥ 150 bin | 299.000 | 0,34 | 1,94 | 1,62× |

Ortalama mutlak log hatası (nüfus eşdeğeri ↔ gerçek): A3 olduğu gibi 8,1×, (c0) 1,6×, (c) 1,5×, (b) 1,0×.

## 6. Arsa fiyat beklentisine etki

Hücre fiyatı sınıf tabanından gelir (kırsal 1.000, kasaba 2.500, şehir 6.500 ₺; `fiyat.ts`) ve talep modelinden bağımsızdır. Dolaylı etki: dükkân neti arsa alımının geri ödemesini belirler. Doyma neti ≈ 727 ₺/sa (kasa dolu) ile bir şehir hücresi (6.500 ₺) ≈ 9 saatte çıkar; ticari hücre ×1,45 (9.425 ₺) ≈ 13 saat. Dolayısıyla nüfus ≥ ~30 bin olan ilçelerde arsa fiyatı dükkân kararını bağlamaz; < 10 bin nüfuslu ilçelerde net ≈ 0 olduğundan dükkân hiç kurulmaz ve ticari hücre talebi doğmaz. A3'ün olduğu gibi hâlinde bütün ilçeler bu ikinci gruba düşer.

