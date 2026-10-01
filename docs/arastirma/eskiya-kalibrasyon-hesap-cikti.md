# Eşkıya kalibrasyonu: hesap çıktısı (otomatik üretildi)

Girdi: T3 ilçe nüfus tablosu (yalnız oyuncu dağıtımı; 200 oyuncu, 45 ilçe, nüfusla orantılı, en az 1; oyuncu/ilçe: medyan 3, ortalama 4,4, en çok 27). Sabitler: oyuncu günlük net 117.053 ₺ ve brüt 140.000 ₺ (yerel-talep-kalibrasyon §7, ekmek zinciri, yerelOlcek 40), başlangıç serveti 72.000 ₺, yeni oyuncu kalkanı 7 gün.

## 1. Savunma kazanma olasılığı (çözümde ±%10 bağımsız sapma)

| Gs / Gb | Kazanma olasılığı |
|---|---|
| 0,50 | %0 |
| 0,80 | %0 |
| 0,90 | %11 |
| 1,00 | %50 |
| 1,10 | %86 |
| 1,20 | %100 |
| 1,25 | %100 |
| 1,50 | %100 |
| 2,00 | %100 |

Gs = Gb iken kazanma ≈ %50 (eşitlik savunana, ama sapmalar bağımsız çekilir); Gs ≥ 1,22 Gb iken kesin (%100).

## 2. Baskın sıklığı: bir oyuncunun 7 günlük pencerede göreceği baskın sayısı (kalkan sonrası gün 7–41, 3 tohum)

| Parametre | r (yeniden yatırım) | 0 baskın | 1 baskın | 2 baskın | Ortalama | En çok (3 tohum) | Haftalık ilçe başı oran |
|---|---|---|---|---|---|---|---|
| öneri: p 1/3, bekleme 4 gün | 0,10 | %9 | %62 | %29 | 1,19 | 2 | 1,19 |
| öneri: p 1/3, bekleme 4 gün | 0,25 | %12 | %61 | %26 | 1,14 | 2 | 1,14 |
| p 1/4, bekleme 5 gün | 0,10 | %21 | %69 | %10 | 0,88 | 2 | 0,88 |
| p 1/4, bekleme 5 gün | 0,25 | %20 | %71 | %9 | 0,89 | 2 | 0,89 |
| p 1/5, bekleme 6 gün | 0,10 | %30 | %68 | %2 | 0,72 | 2 | 0,72 |
| p 1/5, bekleme 6 gün | 0,25 | %32 | %66 | %2 | 0,71 | 2 | 0,71 |

Pencere kayan (her başlangıç günü); oyuncu tek ilçededir. Bekleme ≥ 4 gün olduğundan bir ilçede 7 günde en çok 2 baskın olur; birden çok ilçede yapısı olan oyuncu için ilçe sayısıyla çarpılır (ilçe başına oyuncu tavanı 72 hücre).

## 3. Servet → boy: tipik ilçede boy hangi günde kaç (r = %25 ve %10)

Oyuncu serveti = başlangıç + r × günlük net × gün (yeniden yatırım yapıya gider, taban değeri 1:1); ilçe serveti = oyuncu sayısı × oyuncu serveti (kalkan bitince).

| servetAdimi (₺) | r | Oyuncu/ilçe | Gün 8 | Gün 14 | Gün 21 | Gün 30 | Boy tavana (8) varış günü |
|---|---|---|---|---|---|---|---|
| 250.000 | 0,25 | 1 | 1 | 1 | 2 | 3 | > 60 |
| 250.000 | 0,25 | 3 | 3 | 5 | 7 | 8 | 22 |
| 250.000 | 0,25 | 4.4 | 4 | 7 | 8 | 8 | 15 |
| 250.000 | 0,25 | 10 | 8 | 8 | 8 | 8 | 6 |
| 250.000 | 0,10 | 1 | 0 | 0 | 1 | 1 | > 60 |
| 250.000 | 0,10 | 3 | 1 | 2 | 3 | 4 | 52 |
| 250.000 | 0,10 | 4.4 | 2 | 3 | 5 | 7 | 34 |
| 250.000 | 0,10 | 10 | 6 | 8 | 8 | 8 | 12 |
| 350.000 | 0,25 | 1 | 0 | 1 | 1 | 2 | > 60 |
| 350.000 | 0,25 | 3 | 2 | 3 | 5 | 7 | 31 |
| 350.000 | 0,25 | 4.4 | 3 | 5 | 8 | 8 | 21 |
| 350.000 | 0,25 | 10 | 7 | 8 | 8 | 8 | 9 |
| 350.000 | 0,10 | 1 | 0 | 0 | 0 | 1 | > 60 |
| 350.000 | 0,10 | 3 | 1 | 1 | 2 | 3 | > 60 |
| 350.000 | 0,10 | 4.4 | 1 | 2 | 3 | 5 | 50 |
| 350.000 | 0,10 | 10 | 4 | 6 | 8 | 8 | 19 |
| 500.000 | 0,25 | 1 | 0 | 0 | 1 | 1 | > 60 |
| 500.000 | 0,25 | 3 | 1 | 2 | 3 | 5 | 45 |
| 500.000 | 0,25 | 4.4 | 2 | 3 | 5 | 8 | 30 |
| 500.000 | 0,25 | 10 | 5 | 8 | 8 | 8 | 13 |
| 500.000 | 0,10 | 1 | 0 | 0 | 0 | 0 | > 60 |
| 500.000 | 0,10 | 3 | 0 | 1 | 1 | 2 | > 60 |
| 500.000 | 0,10 | 4.4 | 1 | 1 | 2 | 3 | > 60 |
| 500.000 | 0,10 | 10 | 3 | 4 | 6 | 8 | 30 |

Servet eşiği 250.000 ₺: tek yeni oyuncu ilçesi (servet ≈ 72 bin) baskın görmez; 3–4 oyuncu eşiği kalkan sonunda geçer. Gün 8'de tipik ilçe (3–4 oyuncu, r = %25) boy 3–4'tedir.

## 4. Savunmasız kayıp: günlük netin kaçta kaçı

Kayıp modeli (savunma yetmeyince, oyuncu başına): stok yağması = yağma oranı × ilçe payı (1/n) × stok + devre dışı yapı = oran × günlük net × 1 gün. Stok = 1 günlük brüt çıktı (140.000 ₺; 3 günlük stok sütunu da verilir). Birlik kaybı (%15) ordusuz oyuncuda 0'dır.

| Set | n = 1 | n = 4 | n = 10 | n = 4, stok 3 gün | n = 4: günlük netin payı | n = 4: gün 8 hazinesinin payı |
|---|---|---|---|---|---|---|
| 0a önerisi (yağma %10, devre dışı %10) | 25.705 ₺ | 15.205 ₺ | 13.105 ₺ | 22.205 ₺ | %13 | %1,6 |
| A2 önerisi (yağma %25, devre dışı %25) | 64.263 ₺ | 38.013 ₺ | 32.763 ₺ | 55.513 ₺ | %32 | %4,0 |

## 5. Boy başına savunma ve bedelin geri dönüşü (ilçe n = 4; ilçe başına haftalık baskın λ simülasyondan)

Güç: Nöbet Evi 100 (bedava), 1. Karakol 100, 2. Karakol 50, tümen 100 (Piyade). "Gerekli Gs" = kazanma ≥ %90 için en küçük güç (5'in katı). Ordugâh yalnız tümen gerektiğinde alınır. Karakol ilçedeki tüm oyuncuları korur (kamu malı).

| Boy | Gb | Gerekli Gs | Yalnız Nöbet Evi: P | + 2 Karakol (250): P | Eksik tümen | Tek seferlik ₺ | Haftalık işletme ₺ (ilçe) | Haftalık ₺ / oyuncu (n = 4) | Haftalık net gelirin payı |
|---|---|---|---|---|---|---|---|---|---|
| 1 | 100 | 115 | %50 | %100 | 0 | 7.840 | 1.176 | 294 | %0,0 |
| 2 | 200 | 225 | %0 | %100 | 0 | 15.680 | 2.352 | 588 | %0,1 |
| 3 | 300 | 340 | %0 | %0 | 1 | 59.380 | 14.616 | 3.654 | %0,4 |
| 4 | 400 | 450 | %0 | %0 | 2 | 68.080 | 26.880 | 6.720 | %0,8 |
| 5 | 500 | 560 | %0 | %0 | 4 | 85.480 | 51.408 | 12.852 | %1,6 |
| 6 | 600 | 675 | %0 | %0 | 5 | 94.180 | 63.672 | 15.918 | %1,9 |
| 7 | 700 | 785 | %0 | %0 | 6 | 102.880 | 75.936 | 18.984 | %2,3 |
| 8 | 800 | 895 | %0 | %0 | 7 | 111.580 | 88.200 | 22.050 | %2,7 |

Geri ödeme = tek seferlik bedel / (haftalık önlenen kayıp − haftalık işletme). Önlenen kayıp = λ × (P(savunma) − P(yalnız Nöbet Evi)) × ilçe kaybı (n × oyuncu kaybı).

**0a önerisi (yağma %10, devre dışı %10); λ = 1,14 baskın/hafta/ilçe.**

| Boy | İlçe haftalık beklenen kayıp (savunmasız) ₺ | 2 Karakol: önlenen ₺/hafta | 2 Karakol: tek seferlik + haftalık ₺ | Geri ödeme (hafta) | Tam savunma: önlenen ₺/hafta | Tam savunma: tek seferlik + haftalık ₺ | Geri ödeme (hafta) | Tam savunma kârlı mı |
|---|---|---|---|---|---|---|---|---|
| 1 | 34.581 | 34.581 | 15.680 + 2.352 | 0,5 | 27.648 | 15.680 + 2.352 | 0,6 | evet |
| 2 | 69.336 | 69.336 | 15.680 + 2.352 | 0,2 | 62.403 | 15.680 + 2.352 | 0,3 | evet |
| 3 | 69.336 | 289 | 15.680 + 2.352 | yok | 62.403 | 59.380 + 14.616 | 1,2 | evet |
| 4 | 69.336 | 0 | 15.680 + 2.352 | yok | 62.403 | 68.080 + 26.880 | 1,9 | evet |
| 5 | 69.336 | 0 | 15.680 + 2.352 | yok | 62.403 | 85.480 + 51.408 | 7,8 | evet |
| 6 | 69.336 | 0 | 15.680 + 2.352 | yok | 62.403 | 94.180 + 63.672 | yok | **hayır (sigorta pahalı)** |
| 7 | 69.336 | 0 | 15.680 + 2.352 | yok | 62.403 | 102.880 + 75.936 | yok | **hayır (sigorta pahalı)** |
| 8 | 69.336 | 0 | 15.680 + 2.352 | yok | 62.403 | 111.580 + 88.200 | yok | **hayır (sigorta pahalı)** |

**A2 önerisi (yağma %25, devre dışı %25); λ = 0,88 baskın/hafta/ilçe.**

| Boy | İlçe haftalık beklenen kayıp (savunmasız) ₺ | 2 Karakol: önlenen ₺/hafta | 2 Karakol: tek seferlik + haftalık ₺ | Geri ödeme (hafta) | Tam savunma: önlenen ₺/hafta | Tam savunma: tek seferlik + haftalık ₺ | Geri ödeme (hafta) | Tam savunma kârlı mı |
|---|---|---|---|---|---|---|---|---|
| 1 | 66.736 | 66.736 | 15.680 + 2.352 | 0,2 | 53.355 | 15.680 + 2.352 | 0,3 | evet |
| 2 | 133.807 | 133.807 | 15.680 + 2.352 | 0,1 | 120.426 | 15.680 + 2.352 | 0,1 | evet |
| 3 | 133.807 | 557 | 15.680 + 2.352 | yok | 120.426 | 59.380 + 14.616 | 0,6 | evet |
| 4 | 133.807 | 0 | 15.680 + 2.352 | yok | 120.426 | 68.080 + 26.880 | 0,7 | evet |
| 5 | 133.807 | 0 | 15.680 + 2.352 | yok | 120.426 | 85.480 + 51.408 | 1,2 | evet |
| 6 | 133.807 | 0 | 15.680 + 2.352 | yok | 120.426 | 94.180 + 63.672 | 1,7 | evet |
| 7 | 133.807 | 0 | 15.680 + 2.352 | yok | 120.426 | 102.880 + 75.936 | 2,3 | evet |
| 8 | 133.807 | 0 | 15.680 + 2.352 | yok | 120.426 | 111.580 + 88.200 | 3,5 | evet |

Nöbet Evi kamu yapısıdır (maliyeti 0; ilçe merkezinde, 100 güç her ilçeye bedava): geri dönüş sorusu yoktur, ilk baskının %50'sini kendisi tutar (boy 1).

## 6. Ganimet ve yağma kaybı oyuncu hazinesinin yüzde kaçı

| Gün | Hazine (üst sınır) ₺ | Kayıp 0a (n = 4) / hazine | Kayıp A2 (n = 4) / hazine | Ganimet boy 4 (2.600 ₺ ÷ 4 oyuncu) / hazine | Ganimet / günlük net |
|---|---|---|---|---|---|
| 8 | 960.000 | %1,6 | %4,0 | %0,07 | %0,56 |
| 14 | 1.780.000 | %0,9 | %2,1 | %0,04 | %0,56 |
| 30 | 3.536.000 | %0,4 | %1,1 | %0,02 | %0,56 |

Hazine para olarak yağmalanmaz (yağma yalnız stok ve yapı devre dışı); karşılaştırma için verilmiştir. Ganimet mal olarak küçüktür (kayıp / ganimet ≈ 25–60×).

