# Bakım ve aşınma ölçümü, ikinci tur (A2 istekleri R3, R4, R6, R8, R9, R10)

Bu belge [bakim-asinma-temel.md](bakim-asinma-temel.md) ölçümünün devamıdır. Yalnız ölçülen olgular ve ham tablolar vardır; kalibrasyon önerisi yoktur (Ar-Ge'nin işi). Çekirdek değişmedi. Eklenen yalnız ölçüm düzeneğidir: `--param-ayar yol=int[,..]` (koşu başına param kopyasında tam sayı üzerine yazma; varsayılan çıktı baytı baytına aynıdır), `--onarim-yonetimi` (yalnız genel onarım kararı), `--bakim-izgara` (R6 tablosu) ve günlük ithalat/stok örneği (R9/R10).

Ortak düzen (tüm koşular): parsel kipi, sentetik-50 ayarı, 74 gün, geç katılım günü 60, yerleşik düzen çiftçi=3, sanayici=2, tüccar=2, pasif=1; geç katılanlar çiftçi, sanayici, pazar. Tohum 1–10 (R3/R4 ve R9/R10), 1–3 (R8, R6). Hepsi `--agir`.

## 1. Koşu listesi ve komutlar

Kök: `SP/o2-bakim-c.sh <blok>` (kalıcı olmayan betik; aşağıdaki komutlar aynıdır). `<C>` = ayar dizgesi:
`sanayi.bakim.kitlikAsinmaPpmGun=10000,sanayi.bakim.duzeyler.0.asinmaPpmGun=10000,sanayi.bakim.duzeyler.2.asinmaPpmGun=-7500,sanayi.bakim.asinmaVerimKaybiTavaniPpm=250000`

| Blok | Etiket | Komut (ortak önek: `pnpm -s olcum --kip parsel --bakim-olc --bulgular bakim-asinma-c.md --cikti <klasör> --agir`) | Özet |
|---|---|---|---|
| R9, R10 yeniden ölçüm | bakim-c-gec60-temel / -bakim / -tarim-bakim | `--ad <etiket>` (bakım için `--bakim-yonetimi`; üçüncüsü için `--tarim-yonetimi --bakim-yonetimi`) | [parsel-bakim-c-ozet-gec60.md](parsel-bakim-c-ozet-gec60.md) |
| R3 + R4 | bakim-c-r34-kapali / -bakim | `--param-ayar "<C>"` (bakım için ek `--bakim-yonetimi`) | [parsel-bakim-c-ozet-r34.md](parsel-bakim-c-ozet-r34.md) |
| R8 | bakim-c-r8-temel / -onarim / -bakim | `--tohum 1-3`; `--onarim-yonetimi` ya da `--bakim-yonetimi` | [parsel-bakim-c-ozet-r8.md](parsel-bakim-c-ozet-r8.md) |
| R6 ızgara | bakim-c-r6-k{8000,10000,15000,20000}-t{200000,250000,300000,400000}-{kapali,bakim} (32 koşu) | `--tohum 1-3 --param-ayar "sanayi.bakim.kitlikAsinmaPpmGun=<k>,sanayi.bakim.asinmaVerimKaybiTavaniPpm=<t>"` (bakım için ek `--bakim-yonetimi`) | [parsel-bakim-c-izgara-r6.md](parsel-bakim-c-izgara-r6.md) |

R6 tablosu: `pnpm -s olcum --kip parsel --bakim-izgara --ad bakim-c-izgara-r6 --bulgular bakim-asinma-c.md` (ilgili JSON'lardan; koşu yok). Ham JSON'lar belge dizinine konmadı (boyut); komutlar yeniden üretir. Her koşu saniyeler sürdü.

## 2. R3 + R4: bakım yok koşusunda ahır ve hidro, geç çiftçi/emsal, istenen ayar

Ayar: kıtlık aşınması 10000 ppm/gün (içerik varsayılanı 20000), düzey 0 aşınması 10000 ppm/gün, düzey 2 aşınması -7500 ppm/gün, ceza tavanı 250000 ppm (varsayılan 400000). 10 tohum. "A2 beklentisi" sütunu A2'nin isteğindeki yaklaşık sayıdır; fark yorumsuz verilmiştir.

| Ölçü (bakımsız koşu, 74. gün) | A2 beklentisi | Ölçülen |
|---|---|---|
| Yerleşik ahır verimi (çiftçi) | yaklaşık %68 | %80,9 (p10–p90: %43,1–%100) |
| Yerleşik ahır verimi (tüccar) | — | %38 (%29,3–%51,2) |
| Yerleşik çiftlik verimi | %100 | %100 |
| Cevher madeni verimi (sanayici) | — | %59,8 |
| Hidro santrali verimi (sanayici) | — | %3,2 (%1,2–%4,5) |
| Yerleşik tesis aşınması | — | %73,7–%74 (tüm gruplar) |
| Geç katılan tesis aşınması | — | %13,9 (%13,7–%14) |
| Emsal geliri medyanı, geç çiftçi (7 gün) | yaklaşık 362 bin ₺ | 331.302 ₺ |
| Geç çiftçi / emsal | yaklaşık %240 | %235,9 |
| Geç sanayici / emsal | — | %185,5 |
| Geç pazar / emsal | yaklaşık %107 | %96,9 |
| Y7 kararı | — | %100 oyuncu payı, GEÇTİ |

A2 beklentisi sütunundaki değerler A2'nin tahminleridir (yaklaşık); ölçülen sütun koşunun çıktısıdır.

Bakım açık koşuda (aynı ayar): geç çiftçi / emsal %157,1; geç sanayici / emsal %358,4; geç pazar / emsal %60,2. Yerleşik aşınma %0, bakım karşılanma %100, ahır verimi çiftçide %99,2 (%52,9–%100), tüccarda %46,6; hidro %2,5; cevher %55,8.

Yerleşik oyuncu son 7 gün net üretim geliri (₺, medyan ve p10–p90):

| Grup | Bakımsız | Bakımlı |
|---|---|---|
| çiftçi | 580.642 (253.063–766.771) | 829.041 (387.720–994.417) |
| sanayici | 502.984 | 267.186 |
| tüccar | 262.701 (235.699–339.844) | 395.139 (355.305–507.210) |

## 3. R9 ve R10 (yeniden ölçüm, varsayılan param)

- R9 (tesis türü başına bakım başabaşı): [parsel-bakim-c-ozet-gec60.md §8](parsel-bakim-c-ozet-gec60.md). Eşik T = %40; (1 − T) / T = 1,5; 1 / T = 2,5. R değerleri: ahır 33,11; cevher 19,17; çiftlik 66,67; hidro 8,33. Dördü de iki eşiğin üstünde (taban fiyatla). Yönetimsiz koşuda 74. gün verimleri: ahır %43, cevher %67,4, çiftlik %100, hidro %4,9.
- R10 (parça ithalatı zamanlaması): [parsel-bakim-c-ozet-gec60.md §7](parsel-bakim-c-ozet-gec60.md). Bakım koşusunda gün 0'da katılan yerleşik oyuncular: çiftçi 8 ithalat günü (ilk gün 1, son gün 66; dönemlere pay %46,1 / %39,5 / %14,4; günler arası medyan 10 gün; toplam 918.473 ₺), sanayici 10 gün (ilk 1, son 71; %42,4 / %34,1 / %22; günler arası 9; toplam 2.633.903 ₺; son 7 günde 291.839 ₺), tüccar 7 gün (ilk 1, son 66; toplam 515.545 ₺). Haftalık ortalama ithalatın Y7 netine oranı: çiftçi %10,5, sanayici %87,7, tüccar %11,2. Yönetimsiz koşuda yalnız sanayici gün 1'de 15.194 ₺ ithal eder (başlangıç kiti).

## 4. R8: yalnız onarım ile bakım kıyası (tohum 1–3)

Üç yönetim: hiçbiri (temel), yalnız genel onarım (`--onarim-yonetimi`), tam bakım (`--bakim-yonetimi`). Genel onarım = 20% kurulum bedeli + 6 saat duruş (çekirdek kuralı).

Geç katılan Y7 gelir/emsal: temel çiftçi %433,1, sanayici %218,3, pazar %171,1; yalnız onarım %173,8 / %152,5 / %64; bakım %143,1 / %358,3 / %58,3. Y7 kararı her üçünde %100 GEÇTİ.

Yerleşik oyuncu, katılımdan 74. güne TOPLAM (₺, medyan):

| Kalem | Yönetim | çiftçi | sanayici | tüccar |
|---|---|---|---|---|
| Parça ithalatı (nakit) | temel | 0 | 15.194 | 0 |
| | yalnız onarım | 25.835 | 67.245 | 18.290 |
| | bakım | 918.473 | 2.633.200 | 515.545 |
| Genel onarım parası | yalnız onarım | 12.000 | 19.200 | 8.400 |
| Genel onarım malzemesi (stok değeri) | yalnız onarım | 10.980 | 23.400 | 7.740 |
| Genel onarım sayısı | yalnız onarım | 3 | 3 | 3 |
| Onarım duruşu (tesis-saat) | yalnız onarım | 54 | 54 | 36 |
| Brüt çıktı değeri (ihracat + nüfus) | temel | 4.752.981 | 6.959.702 | 2.947.167 |
| | yalnız onarım | 6.692.240 | 8.212.354 | 4.243.030 |
| | bakım | 7.675.385 | 8.766.495 | 4.954.289 |
| Aşınma kaybı (TAHMİN) | temel | 1.467.300 | 2.270.128 | 807.524 |
| | yalnız onarım | 532.038 | 672.190 | 314.640 |
| | bakım | 0 | 0 | 0 |
| Ortalama aşınma | temel | %65,6 | %65,5 | %65,4 |
| | yalnız onarım | %18,8 | %18,9 | %18,6 |

Son 7 gün net üretim geliri, yerleşik medyan (₺): çiftçi temel 206.544, yalnız onarım 545.134, bakım 601.601; sanayici 403.973, 578.410, 267.186; tüccar 129.349, 350.173, 395.129. Ayrıntı ve uzlaşma tabloları [parsel-bakim-c-ozet-r8.md §4](parsel-bakim-c-ozet-r8.md) içindedir.

## 5. R6: kıtlık aşınması × ceza tavanı ızgarası

Tam tablo: [parsel-bakim-c-izgara-r6.md](parsel-bakim-c-izgara-r6.md). 4 kıtlık değeri (8000, 10000, 15000, 20000 ppm/gün) × 4 tavan (200000, 250000, 300000, 400000 ppm); her hücre bakımsız / bakımlı / bakımlı÷bakımsız (yerleşik gelir 7 gün). Bakımlı koşuda aşınma 0 olduğu için bakımlı gelirler ayardan bağımsızdır (çiftçi 601.601 ₺, sanayici 267.2xx ₺, tüccar 395.129 ₺); değişen yalnız bakımsız koşudur. Geç katılan gelir/emsal ve Y7 payı ikinci tablodadır (Y7 payı 32 koşunun hepsinde %100).

Kıtlık 20000 ppm/gün ve tavan 400000 ppm (içerik varsayılanı) için: yerleşik çiftçi 206.544 ₺ / 601.601 ₺ / %291,3; sanayici 403.973 ₺ / 267.186 ₺ / %66,1; tüccar 129.349 ₺ / 395.129 ₺ / %305,5; geç çiftçi/emsal %433,1 / %143,1.

## 6. Notlar ve sınırlar

- Aşınma kaybı satırları tahmindir (yöntem: [bakim-asinma-temel.md](bakim-asinma-temel.md)).
- R3/R4 ve R9/R10 10 tohum, R8 ve R6 3 tohum olduğundan R8 ile gec60 arasındaki aynı koşulun (bakım) küçük sapmaları örnek farkıdır.
- Çekirdek kodu ve varsayılan çıktılar değişmemiştir; `--param-ayar` yalnız koşu başına param kopyasında çalışır, yanlış yolda hata atar.
- Uyarı: R6 bloğu başlatılırken kapı kilidi denetimi KAPI-KOSUYOR yazdırmıştı ve komut bu denetime bağlı değildi; blok yine de çalıştı (koşular saniyeler sürdü). Operasyon lideri bilgilendirildi.
