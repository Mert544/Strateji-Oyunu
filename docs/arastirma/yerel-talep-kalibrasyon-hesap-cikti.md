# Yerel talep kalibrasyonu: hesap çıktısı (otomatik üretildi)

Girdi: `packages/veri/icerik/icerik.json` (ekmek taban fiyatı). Nüfus tablosu **yaklaşık ve doğrulanmadı** (hafızadan, TÜİK ADNKS 2023–2024; ±%15). Model: p4-p5-ekonomi-hesap.mjs §5 (fırın dükkânı, ekmek rafı, 1,05 R, çeşit 0,5, kasa 90 birim/sa).

## 1. Nüfus dağılımı (45 ilçe, yaklaşık)

| Nüfus bandı | İlçe sayısı | Toplam nüfus | Toplamın payı |
|---|---|---|---|
| < 10 bin | 3 | 15.000 | %0 |
| 10–30 bin | 7 | 136.000 | %2 |
| 30–60 bin | 10 | 471.000 | %8 |
| 60–100 bin | 6 | 495.000 | %8 |
| 100–200 bin | 12 | 1.655.000 | %27 |
| 200–400 bin | 3 | 970.000 | %16 |
| ≥ 400 bin | 4 | 2.480.000 | %40 |

Toplam 6.222.000; medyan ilçe 80.000; ortalama 138.267; en büyük/en küçük 890.000 / 4.000 (oran 223). Dağılım ağır kuyrukludur: ilk 6 ilçe toplamın %51'ini taşır.

## 2. Ölçülen hücre sınıfı: baskın sınıf kuralı üç ilçede de kırsal çıkıyor

Kural (A3 §6.5): ilçe sınıfı = uygun hücrelerin en çok olan sınıfı (istemci `arsaSinifi` geçici eşlemesi). Ölçülen:

| İlçe | Kırsal hücre | Kasaba hücre | Şehir hücre | Kırsal payı | Baskın sınıf | Yaklaşık nüfus | Sınıf eşdeğeri (10 / 40 / 120 bin) | Eşdeğer / gerçek |
|---|---|---|---|---|---|---|---|---|
| Gemlik | 465.007 | 4.347 | 9.292 | %97 | **kırsal** | 120.000 | 10.000 | 0,083 |
| Gebze | 451.912 | 20.366 | 13.578 | %93 | **kırsal** | 410.000 | 10.000 | 0,024 |
| Körfez | 328.183 | 8.064 | 15.136 | %93 | **kırsal** | 180.000 | 10.000 | 0,056 |

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
| A3 şartnamesi olduğu gibi: baskın hücre sınıfı = kırsal (10.000), yerelOlcek 50 | N | 1.350 | 9.758.437 | %8 | 15/45 | -60 | hiç |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçek nüfusa eşitlenir) | U | 18.666 | 148.170.708 | %57 | 45/45 | 610 | 15 |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçek nüfusa eşitlenir) | N | 18.666 | 101.697.962 | %48 | 44/45 | 727 | 12 |
| (b) ilçe başına gerçek nüfus, yerelOlcek 50 | U | 18.666 | 94.588.912 | %46 | 37/45 | 297 | 30 |
| (b) ilçe başına gerçek nüfus, yerelOlcek 50 | N | 18.666 | 145.728.524 | %56 | 42/45 | 512 | 17 |
| (c) karma: nüfus bandından sınıf (< 30 bin kırsal, < 150 bin kasaba, ≥ 150 bin şehir), sınıf eşdeğeri = bant geometrik ortalaması (12.000 / 74.000 / 317.000), yerelOlcek 50 | U | 16.149 | 91.826.784 | %45 | 35/45 | 265 | 34 |
| (c) karma: nüfus bandından sınıf (< 30 bin kırsal, < 150 bin kasaba, ≥ 150 bin şehir), sınıf eşdeğeri = bant geometrik ortalaması (12.000 / 74.000 / 317.000), yerelOlcek 50 | N | 16.149 | 113.747.677 | %50 | 45/45 | 397 | 23 |
| (c0) karma, sınıf eşdeğeri 10 / 40 / 120 bin (A3 sabitleri), yerelOlcek 50 | U | 7.140 | 56.677.320 | %34 | 35/45 | 83 | 108 |
| (c0) karma, sınıf eşdeğeri 10 / 40 / 120 bin (A3 sabitleri), yerelOlcek 50 | N | 7.140 | 54.645.054 | %33 | 43/45 | 154 | 58 |

Okuma: **A3'ün olduğu gibi** hâlinde her ilçe kırsal sayılır: talep nüfusa değil ilçe sayısına bağlanır, dükkân neti kırsal düzeyde (≈ 30 ₺/sa) kalır ve yerelNpc ihmal edilebilir; bu A2 §1.10'daki %45'lik ZP8 beklentisinin (ilçelerin %60'ı şehir varsayımıyla) çok altındadır. (a) toplamı gerçek nüfusa getirir ama her ilçeyi eşit yapar: küçük ilçe zengin, büyük ilçe fakir görünür. (b) gerçeğe en yakın, ama şemaya ilçe başına nüfus alanı ister. (c) karma, şemaya yalnız sınıf bilgisini taşır; hata bandı içinde kalır (aşağıda).

### 4b. yerelOlcek taraması (ZP8 sınırı %50 ve dükkân kârlılığı birlikte)

| Seçenek | yerelOlcek | Yerleşim | yerelNpc ₺/hafta | ZP8 payı | Kârlı ilçe | Medyan dükkân neti ₺/sa | Medyan geri ödeme sa |
|---|---|---|---|---|---|---|---|
| (b) ilçe başına gerçek nüfus | 20 | U | 50.981.011 | %31 | 25/45 | 40 | 225 |
| (b) ilçe başına gerçek nüfus | 20 | N | 58.291.115 | %34 | 38/45 | 126 | 71 |
| (b) ilçe başına gerçek nüfus | 30 | U | 68.183.948 | %38 | 33/45 | 126 | 71 |
| (b) ilçe başına gerçek nüfus | 30 | N | 87.436.964 | %44 | 40/45 | 254 | 35 |
| (b) ilçe başına gerçek nüfus | 35 | U | 74.784.935 | %40 | 33/45 | 169 | 53 |
| (b) ilçe başına gerçek nüfus | 35 | N | 102.010.095 | %48 | 40/45 | 319 | 28 |
| (b) ilçe başına gerçek nüfus | 40 | U | 81.386.726 | %42 | 35/45 | 211 | 42 |
| (b) ilçe başına gerçek nüfus | 40 | N | 116.583.003 | %51 | 41/45 | 383 | 23 |
| (b) ilçe başına gerçek nüfus | 50 | U | 94.588.912 | %46 | 37/45 | 297 | 30 |
| (b) ilçe başına gerçek nüfus | 50 | N | 145.728.524 | %56 | 42/45 | 512 | 17 |
| (c) karma, bant geometrik ortalaması | 20 | U | 51.276.305 | %31 | 30/45 | 27 | 333 |
| (c) karma, bant geometrik ortalaması | 20 | N | 49.927.734 | %31 | 32/45 | 80 | 112 |
| (c) karma, bant geometrik ortalaması | 30 | U | 72.599.360 | %39 | 35/45 | 106 | 84 |
| (c) karma, bant geometrik ortalaması | 30 | N | 74.891.865 | %40 | 35/45 | 186 | 48 |
| (c) karma, bant geometrik ortalaması | 35 | U | 78.280.979 | %41 | 35/45 | 146 | 61 |
| (c) karma, bant geometrik ortalaması | 35 | N | 86.330.926 | %43 | 45/45 | 239 | 37 |
| (c) karma, bant geometrik ortalaması | 40 | U | 82.796.515 | %42 | 35/45 | 186 | 48 |
| (c) karma, bant geometrik ortalaması | 40 | N | 96.141.860 | %46 | 45/45 | 292 | 31 |
| (c) karma, bant geometrik ortalaması | 50 | U | 91.826.784 | %45 | 35/45 | 265 | 34 |
| (c) karma, bant geometrik ortalaması | 50 | N | 113.747.677 | %50 | 45/45 | 397 | 23 |

## 5. Karma seçenekte (c) sınıf sabitinin hatası

| Sınıf (nüfus bandı) | İlçe sayısı | Bant | Geometrik ortalama (önerilen eşdeğer) | Eşdeğer / gerçek: en düşük | en yüksek | Ortalama mutlak log hatası |
|---|---|---|---|---|---|---|
| kirsal | 10 | < 30 bin | 12.000 | 0,43 | 3,00 | 1,84× |
| kasaba | 24 | 30–150 bin | 74.000 | 0,53 | 2,24 | 1,48× |
| sehir | 11 | ≥ 150 bin | 317.000 | 0,36 | 2,11 | 1,64× |

Ortalama mutlak log hatası (nüfus eşdeğeri ↔ gerçek): A3 olduğu gibi 7,8×, (c0) 2,1×, (c) 1,6×, (b) 1,0×.

## 6. Arsa fiyat beklentisine etki

Hücre fiyatı sınıf tabanından gelir (kırsal 1.000, kasaba 2.500, şehir 6.500 ₺; `fiyat.ts`) ve talep modelinden bağımsızdır. Dolaylı etki: dükkân neti arsa alımının geri ödemesini belirler. Doyma neti ≈ 727 ₺/sa (kasa dolu) ile bir şehir hücresi (6.500 ₺) ≈ 9 saatte çıkar; ticari hücre ×1,45 (9.425 ₺) ≈ 13 saat. Dolayısıyla nüfus ≥ ~30 bin olan ilçelerde arsa fiyatı dükkân kararını bağlamaz; < 10 bin nüfuslu ilçelerde net ≈ 0 olduğundan dükkân hiç kurulmaz ve ticari hücre talebi doğmaz. A3'ün olduğu gibi hâlinde bütün ilçeler bu ikinci gruba düşer.

