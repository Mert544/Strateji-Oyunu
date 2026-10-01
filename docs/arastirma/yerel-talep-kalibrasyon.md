# Yerel talep kalibrasyonu: gerçek ilçe nüfusu (A2, G7 şartname S-6)

> **Durum.** 1 Ekim 2026. Öneridir; karar baş liderindir. Nüfus değerleri **yaklaşık ve doğrulanmadı** (hafızadan, ±%15); sonuçlar nüfus bantlarına duyarlıdır, tek tek ilçe değerine değil. Hesaplar `docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs` (çıktı: `yerel-talep-kalibrasyon-hesap-cikti.md`), model `p4-p5-ekonomi-hesap.mjs` §5 ile aynı (fırın dükkânı, ekmek rafı, 1,05 R, kasa 90 birim/sa). Çekirdek koşulmadı.

## 1. Özet (önce bu)

1. **Asıl bulgu, nüfus verisinden önce sınıf kuralı.** A3 §6.5 ilçe sınıfını "uygun hücrelerin baskın sınıfı" olarak tanımlıyor. Üç ızgaralı Alfa-0 ilçesinde (z20 manifesti, `arsaSinifi` geçici eşlemesi) kırsal hücre payı **%93–97**: Gemlik 97, Gebze 93, Körfez 93. Üçü de **kırsal** çıkar; sınıf eşdeğeri 10.000 iken gerçek nüfusları 120–410 bin (eşdeğer/gerçek 0,02–0,08). Bu kuralla dünya `yerelNpc` ≈ 10 M ₺/hafta (ZP8 %8–9) ve ilçelerin 0–15'inde dükkân kârlı; A2 §1.10 beklentisi 92,9 M ₺ (%45) idi.
2. **Öneri: (b) ilçe başına isteğe bağlı `nufus` alanı, `yerelOlcek` 40, alan yoksa sınıf sabiti (c0) yedek.** Sınıf, baskın hücre sınıfından değil nüfustan türetilir. (a) tek başına çözmez (aşağıda).
3. **Geri dönüşü zor:** nüfus alanının şemaya girmesi (fikstür/göç). İsteğe bağlı alan olarak girerse geriye uyumlu; parametre değerleri kolay geri dönüşlüdür.

## 2. Nüfus dağılımı (45 ilçe, yaklaşık; Kocaeli 12, Sakarya 16, Bursa 17)

| Nüfus bandı | İlçe | Toplam nüfus | Pay |
|---|---|---|---|
| < 10 bin | 3 | 15.000 | %0 |
| 10–30 bin | 7 | 136.000 | %2 |
| 30–60 bin | 10 | 471.000 | %8 |
| 60–100 bin | 6 | 495.000 | %8 |
| 100–200 bin | 12 | 1.655.000 | %27 |
| 200–400 bin | 3 | 970.000 | %16 |
| ≥ 400 bin | 4 | 2.480.000 | %40 |

Toplam ≈ 6,2 milyon; medyan ilçe ≈ 80 bin; en büyük/en küçük ≈ 223×; ilk 6 ilçe toplamın %51'i. Sınıf sabitleri (10 / 40 / 120 bin) medyana yakındır ama kuyruğu (400–890 bin) ve alt ucu (4–10 bin) kapsamaz.

## 3. Dükkân neti nüfusa göre doğrusal değil

| Nüfus | Satış birim/sa | Net ₺/sa | Geri ödeme (sa) |
|---|---|---|---|
| 5 bin | 8,4 | −52 | hiç |
| 10 bin | 16,8 | 29 | 312 |
| 20 bin | 33,7 | 189 | 47 |
| 40 bin | 67,4 | 511 | 18 |
| ≥ 60 bin | 90 (kasa dolu) | 727 | 12 |

Q nüfusa doğrusal; net 7–60 bin arasında artar, **60 binden sonra sabittir** (kasa 90/sa). Nüfus hatası yalnız küçük ve orta ilçelerde (< 60 bin; 45 ilçenin 20'si, nüfusun %10'u) dükkân ekonomisini değiştirir. Büyük ilçelerde (Gebze, Osmangazi) talep fazlası dükkân sayısını (k) artırır: rakip sayısı, fiyat ve çeşitlilik rekabeti.

## 4. Seçenekler (45 ilçe, 200 oyuncu, her biri 1 fırın dükkânı)

Yerleşim **U**: eşit (4–5/ilçe); **N**: nüfusla orantılı (en az 1). ZP8 = yerelNpc / (yerelNpc + ihracatNpc 112,3 M). Hedefler: ZP8 ≤ %50 (alarm), geri ödeme medyanı ≤ 48 sa (A0-12).

| Seçenek | yerelOlcek | yerelNpc M ₺/hafta (U / N) | ZP8 (U / N) | Kârlı ilçe (U / N) | Medyan net ₺/sa (U / N) | Medyan geri ödeme sa (U / N) |
|---|---|---|---|---|---|---|
| **A3 olduğu gibi** (baskın hücre sınıfı → kırsal 10 bin) | 50 | 10,7 / 9,8 | %9 / %8 | 0 / 15 | −78 / −60 | hiç / hiç |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçeğe eşit) | 691 (≈ ×14) | 148,2 / 101,7 | %57 / %48 | 45 / 44 | 610 / 727 | 15 / 12 |
| **(b) ilçe başına gerçek nüfus** | 50 | 94,6 / 145,7 | %46 / %56 | 37 / 42 | 297 / 512 | 30 / 17 |
| (b) | **40 (öneri)** | 81,4 / 116,6 | %42 / %51 | 35 / 41 | 211 / 383 | 42 / 23 |
| (b) | 35 | 74,8 / 102,0 | %40 / %48 | 33 / 40 | 169 / 319 | 53 / 28 |
| (c) karma: nüfus bandından sınıf, eşdeğer 12 / 74 / 317 bin | 50 | 91,8 / 113,7 | %45 / %50 | 35 / 45 | 265 / 397 | 34 / 23 |
| (c) | 40 | 82,8 / 96,1 | %42 / %46 | 35 / 45 | 186 / 292 | 48 / 31 |
| (c0) karma, A3 sabitleri 10 / 40 / 120 bin | 50 | 56,7 / 54,6 | %34 / %33 | 35 / 43 | 83 / 154 | 108 / 58 |

- **A3 olduğu gibi:** talep nüfusa değil ilçe sayısına bağlanır; Gebze ile Harmancık aynıdır. Dükkân hiçbir ilçede kârlı değildir (U); P7 dükkân akışı ve A0-12 ölçütü tutmaz.
- **(a):** toplam talebi gerçeğe eşitler ama ilçeleri eşitler (küçük ilçe zengin, büyük fakir). ZP8 sınırı aşılır (%57). Tek başına yeterli değil.
- **(b):** hata 1,0× (ortalama mutlak log hatası), şemaya isteğe bağlı `nufus` ister. `yerelOlcek` 40'ta ZP8 %42–51 ve geri ödeme medyanı 23–42 sa: iki hedef birlikte tutar; 50'de ZP8 %56'ya çıkar (N yerleşimi).
- **(c):** hata 1,6× (A3 sabitleriyle 2,1×, A3 olduğu gibi 7,8×). Şemaya yine bir ilçe başına alan (sınıf) ister; (b)'nin ek maliyeti yok denecek kadar azken (c) bilgiyi kaybeder. Alan eklenmeyecekse (c) için `ilceSinifiNufus` 12 / 74 / 317 bin ve sınıf eşiği 30 / 150 bin.

## 5. Etkiler

| Konu | A3 olduğu gibi | (b) önerisi |
|---|---|---|
| Dükkân geri ödemesi (medyan) | hiç (net < 0) | 23–42 sa (A0-12 ≤ 48 sa tutar) |
| `yerelNpc` musluğu | ≈ 10 M ₺/hafta | 81–117 M ₺/hafta |
| ZP8 | %8–9 | %42–51 (izlenir; N yerleşimi sınırda) |
| Arsa fiyat beklentisi | Hücre fiyatı sınıf tabanından gelir (1.000 / 2.500 / 6.500 ₺), talepten bağımsız. Dolaylı: doyma neti 727 ₺/sa ile şehir hücresi ≈ 9 sa, ticari hücre (×1,45) ≈ 13 sa'te çıkar; nüfus ≥ 30 bin ilçelerde arsa fiyatı dükkân kararını bağlamaz. A3 olduğu gibi: hiçbir ilçede dükkân kârlı değil, ticari hücre talebi doğmaz | Nüfusu ≥ 30 bin olan 35 ilçede dükkân kurulur; nüfusu < 10 bin olan 3 ilçede kurulmaz (net ≈ 0) |

## 6. Kaynak (doğrulanmadı)

- **TÜİK ADNKS** ilçe nüfusu (Adrese Dayalı Nüfus Kayıt Sistemi; yıllık, sonuçlar şubat ayında açıklanır; ADNKS 2024 sonuçları 2025 şubatında; tarih ve rakamlar hafızadan, **doğrulanmadı**). **Lisans:** TÜİK verisi "kaynak gösterilerek kullanılabilir" biçimindedir; Creative Commons gibi açık lisans değildir (TÜİK telif ve kullanım koşulları; hukuki görüş gerekir, doğrulanmadı). Proje veri ilkesi (acik-kaynak-ve-veri.md) açık lisans ister.
- **Alternatif:** WorldPop veya GHS-POP (CC BY 4.0, docs/08 §6.5) ilçe sınırında zonal toplam; ADNKS ile çapraz kontrol edilir. İlçe sınırı kilitli ülke indirmesinden geliyor (O3 hattı).
- T3'ün kaynak taraması bu dalda henüz yok; T3'ün bulduğu kaynak ve lisans değerlendirmesi geldiğinde o kullanılır, bu belge kopyalamaz. Bu belgedeki 45 değer kaynak yerine geçmez.

## 7. Geri dönüşü zor kararlar ve açık sorular

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| Z-1 | İlçe başına `nufus` alanının fikstür şemasına girmesi | Fikstür/göç, çekirdek derleme ve canlı durum (seviye, esnaf yoğunluğu) ona bağlanır | İsteğe bağlı alan (yoksa sınıf sabiti yedek); geriye uyum testi |
| Z-2 | Talep sınıfı kuralı (baskın hücre sınıfı ↔ nüfus) | `ilceSinifi` derlemede bir kez hesaplanır; Q kimliği (GZ-4) ona dayanır | Baskın hücre sınıfı talep için kullanılmaz (üç ölçülü ilçede de kırsal) |

1. **(Baş lider)** (b) isteğe bağlı `nufus` alanı ve `yerelOlcek` 40 kabul mü? Alan eklenmeyecekse (c) mi, A3'ün sabitleri mi?
2. **(O3/K3)** Kalan 42 ilçenin hücre sınıf dağılımı ölçülsün (üç ilçede 3/3 kırsal; kent merkezleri doğrulanmadı).
3. **(T3/O3)** Kaynak ve lisans kararı: ADNKS (lisans doğrulanmadı) mı, WorldPop/GHS-POP zonal toplam mı? Nüfus tablosu kaynaktan üretilmeli.
4. **(A3)** Şartname §6.5'te "nüfus verisi yok" ve "sınıf baskın hücre sınıfı" satırları, karar sonrası güncellenmeli; `yerelOlcek` 50 yerine 40.

## Ek A. Betik

`node docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs > docs/arastirma/yerel-talep-kalibrasyon-hesap-cikti.md` (Node 22, bağımlılık yok; yalnız `icerik.json` okur; iki koşu `cmp` ile aynı; `eslint` temiz). Hücre sınıf sayımları (Gemlik, Gebze, Körfez) betikte sabittir; üretimi: manifest (`izgara/manifest.json`) ilçe başına `ilceIzgarasiOku`, içerideki ve su/askeri/yol olmayan hücrelerde istemci `arsaSinifi(durum)` sayımı (entegrasyon 7553b55).
