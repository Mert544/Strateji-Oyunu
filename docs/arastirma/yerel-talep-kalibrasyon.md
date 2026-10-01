# Yerel talep kalibrasyonu: gerçek ilçe nüfusu (A2, G7 şartname S-6)

> **Durum.** 1 Ekim 2026. Öneridir; karar baş liderindir. Nüfus: T3 kaynak taraması (`SP/t3/g7-kaynak-taramasi.md`, `SP/t3/ilce-nufus.tsv`): TÜİK ADNKS 2025 (31.12.2025; bülten 9.2.2026), ikincil derleme, **birincil teyit yok (doğrulanmadı)**; ilçe toplamları il toplamlarıyla birebir eşit (dolaylı kanıt). Bu belge sayıları kopyalamaz, betik dosyayı argüman olarak okur. Hesaplar `docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs` (çıktı: `yerel-talep-kalibrasyon-hesap-cikti.md`), model `p4-p5-ekonomi-hesap.mjs` §5 ile aynı (fırın dükkânı, ekmek rafı, 1,05 R, kasa 90 birim/sa). Çekirdek koşulmadı.

## 1. Özet (önce bu)

1. **Asıl bulgu, nüfus verisinden önce sınıf kuralı.** A3 §6.5 ilçe sınıfını "uygun hücrelerin baskın sınıfı" olarak tanımlıyor. Üç ızgaralı Alfa-0 ilçesinde (z20 manifesti, `arsaSinifi` geçici eşlemesi) kırsal hücre payı **%93–97**: Gemlik 97, Gebze 93, Körfez 93. Üçü de **kırsal** çıkar; sınıf eşdeğeri 10.000 iken ADNKS 2025 nüfusları Gemlik 124.400, Körfez 183.077, Gebze 414.960 (eşdeğer/gerçek 0,02–0,08). T3'ün nüfus bandı kuralı (20 bin / 69 bin) üçünü de şehir yapar. Bu kuralla dünya `yerelNpc` ≈ 10 M ₺/hafta (ZP8 %8–9) ve ilçelerin 0–13'ünde dükkân kârlı; A2 §1.10 beklentisi 92,9 M ₺ (%45) idi.
2. **Öneri (en küçük değişiklik): sınıf nüfus bandından türetilir; A3'ün sabitleri (10 / 40 / 120 bin) ve `yerelOlcek` 50 kalır.** Sınıf eşiği T3'ün geometrik eşiği: kırsal < 20.000, kasaba < 69.282, şehir üstü. İlçe başına isteğe bağlı `nufus` alanı saklanır (çekirdek şimdilik yalnız sınıfı türetir; (b) tam nüfus kullanımına geçiş yalnız bir parametre değişikliğidir, öneri `yerelOlcek` 35). Sonuç (c0, `yerelOlcek` 50): dünya `yerelNpc` 83–87 M ₺/hafta, ZP8 %43–44, dükkân geri ödeme medyanı 23–30 sa, kârlı ilçe 38–43/45; nüfus eşdeğeri hatası 1,6× (A3 olduğu gibi 8,1×). (a) tek başına yetmez (aşağıda).
3. **Geri dönüşü zor:** ilçe başına nüfus (ya da sınıf) alanının şemaya girmesi (fikstür/göç). İsteğe bağlı alan olarak girerse geriye uyumlu; sabitler, eşikler ve `yerelOlcek` kolay geri dönüşlüdür.

## 2. Nüfus dağılımı (45 ilçe, ADNKS 2025; Kocaeli 12, Sakarya 16, Bursa 17)

| Nüfus bandı | İlçe | Toplam nüfus | Pay |
|---|---|---|---|
| < 10 bin | 3 | 22.301 | %0 |
| 10–30 bin | 6 | 109.330 | %2 |
| 30–60 bin | 10 | 492.575 | %8 |
| 60–100 bin | 7 | 607.901 | %9 |
| 100–200 bin | 11 | 1.575.153 | %24 |
| 200–400 bin | 4 | 1.206.896 | %18 |
| ≥ 400 bin | 4 | 2.533.719 | %39 |

Toplam 6.547.875; medyan ilçe 86.543; en büyük/en küçük 886.111 (Osmangazi) / 6.089 (146×); ilk 6 ilçe toplamın %49'u. Sınıf sabitleri (10 / 40 / 120 bin) medyana yakındır ama kuyruğu (400–890 bin) ve alt ucu (6–10 bin) kapsamaz. T3 sınıf medyanları: kırsal 10.939, kasaba 49.606, şehir 151.134.

## 3. Dükkân neti nüfusa göre doğrusal değil

| Nüfus | Satış birim/sa | Net ₺/sa | Geri ödeme (sa) |
|---|---|---|---|
| 5 bin | 8,4 | −52 | hiç |
| 10 bin | 16,8 | 29 | 312 |
| 20 bin | 33,7 | 189 | 47 |
| 40 bin | 67,4 | 511 | 18 |
| ≥ 60 bin | 90 (kasa dolu) | 727 | 12 |

Q nüfusa doğrusal; net 7–60 bin arasında artar, **60 binden sonra sabittir** (kasa 90/sa). Nüfus hatası yalnız küçük ve orta ilçelerde (< 60 bin; 45 ilçenin 19'u, nüfusun %10'u) dükkân ekonomisini değiştirir. Büyük ilçelerde (Gebze, Osmangazi) talep fazlası dükkân sayısını (k) artırır: rakip sayısı, fiyat ve çeşitlilik rekabeti.

## 4. Seçenekler (45 ilçe, 200 oyuncu, her biri 1 fırın dükkânı)

Yerleşim **U**: eşit (4–5/ilçe); **N**: nüfusla orantılı (en az 1). ZP8 = yerelNpc / (yerelNpc + ihracatNpc 112,3 M). Hedefler: ZP8 ≤ %50 (alarm), geri ödeme medyanı ≤ 48 sa (A0-12).

| Seçenek | yerelOlcek | yerelNpc M ₺/hafta (U / N) | ZP8 (U / N) | Kârlı ilçe (U / N) | Medyan net ₺/sa (U / N) | Medyan geri ödeme sa (U / N) |
|---|---|---|---|---|---|---|
| **A3 olduğu gibi** (baskın hücre sınıfı → kırsal 10 bin) | 50 | 10,7 / 9,9 | %9 / %8 | 0 / 13 | −78 / −60 | hiç / hiç |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçeğe eşit) | ≈ 700 (×14) | 155,9 / 105,9 | %58 / %49 | 45 / 44 | 649 / 727 | 14 / 12 |
| **(c0) sınıf nüfus bandından (20 bin / 69 bin), A3 sabitleri 10 / 40 / 120 bin (öneri)** | **50** | 87,4 / 83,4 | %44 / %43 | 38 / 43 | 383 / 297 | 23 / 30 |
| (b) ilçe başına gerçek nüfus | 50 | 99,4 / 153,7 | %47 / %58 | 38 / 43 | 332 / 530 | 27 / 17 |
| (b) | 40 | 86,5 / 123,0 | %44 / %52 | 36 / 42 | 240 / 398 | 37 / 22 |
| (b) | 35 | 79,3 / 107,6 | %41 / %49 | 35 / 41 | 193 / 332 | 46 / 27 |
| (c) karma: sınıf nüfus bandından (30 / 150 bin), eşdeğer 13 / 73 / 299 bin | 50 | 97,1 / 120,6 | %46 / %52 | 36 / 45 | 260 / 390 | 34 / 23 |

- **A3 olduğu gibi:** talep nüfusa değil ilçe sayısına bağlanır; Gebze ile Harmancık aynıdır. Dükkân hiçbir ilçede kârlı değildir (U); P7 dükkân akışı ve A0-12 ölçütü tutmaz.
- **(a):** toplam talebi gerçeğe eşitler ama ilçeleri eşitler (küçük ilçe zengin, büyük fakir). ZP8 sınırı aşılır (%58). Tek başına yeterli değil.
- **(c0), öneri:** A3'ün sabitleri ve `yerelOlcek` 50 aynen kalır; yalnız ilçe sınıfının kaynağı değişir (baskın hücre sınıfı → nüfus bandı). Her iki hedef (ZP8 ≤ %50, geri ödeme ≤ 48 sa) iki yerleşimde de tutar; hata 1,6×.
- **(b):** hata 1,0× (ortalama mutlak log hatası), tam nüfus kullanımı. `yerelOlcek` 50'de ZP8 N yerleşiminde %58'e çıkar; 35'te %41–49 ve geri ödeme 27–46 sa (hedefler tutar). Gerçeğe en yakın ama `yerelOlcek` değişir; (c0)'ın üstüne sonradan eklenebilir.
- **(c):** hata 1,5× (A3 olduğu gibi 8,1×); sabitleri 13 / 73 / 299 bine çeker. (c0)'a göre kazanç küçük, ama sabitler (A3 §6.5, T3 verisi) değişir; önerilmez.

## 5. Etkiler

| Konu | A3 olduğu gibi | (c0) önerisi (50) |
|---|---|---|
| Dükkân geri ödemesi (medyan) | hiç (net < 0) | 23–30 sa (A0-12 ≤ 48 sa tutar) |
| `yerelNpc` musluğu | ≈ 10 M ₺/hafta | 83–87 M ₺/hafta |
| ZP8 | %8–9 | %43–44 (izlenir) |
| Arsa fiyat beklentisi | Hücre fiyatı sınıf tabanından gelir (1.000 / 2.500 / 6.500 ₺), talepten bağımsız. Dolaylı: doyma neti 727 ₺/sa ile şehir hücresi ≈ 9 sa, ticari hücre (×1,45) ≈ 13 sa'te çıkar; nüfus ≥ 30 bin ilçelerde arsa fiyatı dükkân kararını bağlamaz. A3 olduğu gibi: hiçbir ilçede dükkân kârlı değil, ticari hücre talebi doğmaz | Nüfusu ≥ 30 bin olan 36 ilçede dükkân kurulur; nüfusu < 10 bin olan 3 ilçede kurulmaz (net ≈ 0) |

## 6. Kaynak (T3 taraması; doğrulanmadı)

- **TÜİK ADNKS 2025** (referans 31.12.2025; bülten 9.2.2026), 45 ilçe, `hiyerarsi.json` kimlikleriyle 45/45 eşleşir. İlçe sayıları **ikincil derlemeden** (nufusune.com, nufusu.com); TÜİK portalı okunamadı, birincil teyit yok. Dolaylı kanıt: ilçe toplamları il toplamlarıyla birebir eşit (Kocaeli 2.161.171, Sakarya 1.123.693, Bursa 3.263.011).
- **Lisans:** TÜİK Yasal Uyarı: kaynak gösterilerek izin gerekmeksizin yeniden kullanım; ticari yasak yok; hukuk teyidi yapılmadı. Önerilen atıf: "TÜİK, ADNKS Sonuçları, 2025 (9 Şubat 2026)". İlçe toplamları mikro veri değildir.
- Alternatif (WorldPop/GHS-POP, CC BY 4.0) gerekmedi; çapraz kontrol için kalır. Birincil tabloyu portal indirmesiyle bir kez teyit etmek T3/O3 işidir.
- Bu belge ve betik sayıları kopyalamaz: `SP/t3/ilce-nufus.tsv` yolu betiğe argümandır. Veri yazımı T3'te, karardan sonra.

## 7. Geri dönüşü zor kararlar ve açık sorular

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| Z-1 | İlçe başına `nufus` (ya da talep sınıfı) alanının fikstür şemasına girmesi | Fikstür/göç, çekirdek derleme ve canlı durum (seviye, esnaf yoğunluğu) ona bağlanır | İsteğe bağlı alan (yoksa sınıf sabiti yedek); geriye uyum testi |
| Z-2 | Talep sınıfı kuralı (baskın hücre sınıfı ↔ nüfus) | `ilceSinifi` derlemede bir kez hesaplanır; Q kimliği (GZ-4) ona dayanır | Baskın hücre sınıfı talep için kullanılmaz (üç ölçülü ilçede de kırsal) |

1. **(Baş lider)** (c0): sınıf nüfus bandından (20 bin / 69.282), A3 sabitleri ve `yerelOlcek` 50 kalır, ilçe başına isteğe bağlı `nufus` alanı eklenir. Kabul mü? Sonradan (b) için `yerelOlcek` 35.
2. **(O3/K3)** Kalan 42 ilçenin hücre sınıf dağılımı ölçülsün (üç ilçede 3/3 kırsal; kent merkezleri doğrulanmadı).
3. **(T3/O3)** Birincil TÜİK tablosuyla bir kez teyit; lisans için hukuk teyidi.
4. **(A3)** Şartname §6.5 ve S-6'daki "nüfus verisi yok" ve "sınıf baskın hücre sınıfı" satırları karar sonrası güncellenmeli (`yerelOlcek` 50 kalır).

## Ek A. Betik

`node docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs <ilce-nufus.tsv> > docs/arastirma/yerel-talep-kalibrasyon-hesap-cikti.md` (Node 22, bağımlılık yok; `icerik.json` ve T3'ün TSV dosyasını okur; iki koşu `cmp` ile aynı; `eslint` temiz). Hücre sınıf sayımları (Gemlik, Gebze, Körfez) betikte sabittir; üretimi: manifest (`izgara/manifest.json`) ilçe başına `ilceIzgarasiOku`, içerideki ve su/askeri/yol olmayan hücrelerde istemci `arsaSinifi(durum)` sayımı (entegrasyon 7553b55).
