# Parsel ölçümü — bakım ve aşınma özeti (bakim-c-ozet-r8)

`--bakim-olc` ile üretilmiş koşulardan ham tablolar. **Yorum yoktur**; kalibrasyon yorumu Ar-Ge'nindir (A2). Medyanlar ve yüzdelikler tohumlar ve oyuncular üzerinden havuzlanır; "med (p10–p90)" biçimindedir. Yöntem ve sınırlar [bakim-asinma-temel.md](bakim-asinma-temel.md) içindedir.

**Bulgular ve yorum (elle yazılmış):** [bakim-asinma-c.md](bakim-asinma-c.md)

## 1. Koşular

| Etiket | Dosya | Yönetim | Tohumlar | Süre (gün) | Geç katılım günü | Düzen (yerleşik · geç) |
|---|---|---|---|---|---|---|
| bakim-c-r8-temel | parsel-bakim-c-r8-temel.json | tarım kapalı · bakım kapalı | 1, 2, 3 | 74 | 60 | ciftci=3, sanayici=2, tuccar=2, pasif=1 · ciftci, sanayici, pazar |
| bakim-c-r8-onarim | parsel-bakim-c-r8-onarim.json | tarım kapalı · bakım yalnız onarım | 1, 2, 3 | 74 | 60 | ciftci=3, sanayici=2, tuccar=2, pasif=1 · ciftci, sanayici, pazar |
| bakim-c-r8-bakim | parsel-bakim-c-r8-bakim.json | tarım kapalı · bakım AÇIK | 1, 2, 3 | 74 | 60 | ciftci=3, sanayici=2, tuccar=2, pasif=1 · ciftci, sanayici, pazar |

## 2. Y7: gelir / emsal (geç katılanın son 7 gün net üretim geliri / üreten ilçe emsallerinin medyanı)

Oran = tohumlar üzerinden ortalama (Y7'nin ham oranı; parsel-rapor §5a ile aynı yöntem). Gelir ve emsal sütunları tohumlar üzerinden ortalamadır (ölçülebilen olgular).

| Koşu | Yönetim | Y7 oyuncu payı | Y7 kararı | Gelir/emsal ciftci | Gelir/emsal sanayici | Gelir/emsal pazar |
|---|---|---|---|---|---|---|
| bakim-c-r8-temel | tarım kapalı · bakım kapalı | %100 | GEÇTİ | %433,1 | %218,3 | %171,1 |
| bakim-c-r8-onarim | tarım kapalı · bakım yalnız onarım | %100 | GEÇTİ | %173,8 | %152,5 | %64 |
| bakim-c-r8-bakim | tarım kapalı · bakım AÇIK | %100 | GEÇTİ | %143,1 | %358,3 | %58,3 |

Geç katılanın geliri ve kullanılan emsal medyanı (7 gün, ₺; tohum ortalaması):

| Koşu | Geç açılış | Ölçülebilen olgu | Geç katılan geliri (ort.) | Emsal geliri medyanı (ort.) |
|---|---|---|---|---|
| bakim-c-r8-temel | ciftci | 3 | 362.173 ₺ | 85.529 ₺ |
| bakim-c-r8-temel | sanayici | 3 | 882.041 ₺ | 403.974 ₺ |
| bakim-c-r8-temel | pazar | 3 | 340.794 ₺ | 199.280 ₺ |
| bakim-c-r8-onarim | ciftci | 3 | 362.167 ₺ | 208.496 ₺ |
| bakim-c-r8-onarim | sanayici | 3 | 882.041 ₺ | 578.411 ₺ |
| bakim-c-r8-onarim | pazar | 3 | 340.797 ₺ | 532.578 ₺ |
| bakim-c-r8-bakim | ciftci | 3 | 337.611 ₺ | 230.168 ₺ |
| bakim-c-r8-bakim | sanayici | 3 | 957.293 ₺ | 267.176 ₺ |
| bakim-c-r8-bakim | pazar | 3 | 344.182 ₺ | 589.397 ₺ |

Yerleşik oyuncuların son 7 gün net üretim geliri (₺; yerleşik oyuncu başına, tohumlar üzerinden havuzlanmış medyan ve p10–p90):

| Koşu | Yönetim | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) | Havuzdaki oyuncu (çiftçi/sanayici/tüccar) |
|---|---|---|---|---|---|---|
| bakim-c-r8-temel | tarım kapalı · bakım kapalı | 206.544 ₺ (85.235 ₺–296.884 ₺) | 403.973 ₺ (403.973 ₺–403.974 ₺) | 129.349 ₺ (118.595 ₺–146.919 ₺) | 376.813 ₺ (244.883 ₺–882.042 ₺) | 9/6/6 |
| bakim-c-r8-onarim | tarım kapalı · bakım yalnız onarım | 545.134 ₺ (260.350 ₺–770.296 ₺) | 578.410 ₺ (578.406 ₺–578.416 ₺) | 350.173 ₺ (324.023 ₺–393.407 ₺) | 376.804 ₺ (244.866 ₺–882.041 ₺) | 9/6/6 |
| bakim-c-r8-bakim | tarım kapalı · bakım AÇIK | 601.601 ₺ (290.543 ₺–833.061 ₺) | 267.186 ₺ (267.171 ₺–284.836 ₺) | 395.129 ₺ (365.203 ₺–443.900 ₺) | 387.087 ₺ (199.870 ₺–957.293 ₺) | 9/6/6 |

## 3. Aşınma yörüngesi (tesis düzeyi, havuzlanmış)

Hücre: tesislerin aşınma yüzdesi, medyan (p10–p90). Kaynak: ölçüm anlarında tesis başına `asinmaPpm`. Geç katılan tesisleri katılımdan önce yoktur (— ya da az örnek). Satır başına "n" ilgili günde havuzlanan tesis sayısıdır.

### bakim-c-r8-temel (tarım kapalı · bakım kapalı)

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %10 (%10–%10) n=27 | %20 (%20–%20) n=27 | %40 (%40–%40) n=27 | %60 (%60–%60) n=27 | %100 (%100–%100) n=27 | %100 (%100–%100) n=27 |
| yerleşik sanayici | %9,7 (%9,7–%9,7) n=18 | %19,7 (%19,7–%19,7) n=18 | %39,7 (%39,7–%39,7) n=18 | %59,7 (%59,7–%59,7) n=18 | %99,7 (%99,7–%99,7) n=18 | %100 (%100–%100) n=18 |
| yerleşik tüccar | %9,5 (%9,5–%9,5) n=12 | %19,5 (%19,5–%19,5) n=12 | %39,5 (%39,5–%39,5) n=12 | %59,5 (%59,5–%59,5) n=12 | %99,5 (%99,5–%99,5) n=12 | %100 (%100–%100) n=12 |
| geç katılan (üçü) | — | — | — | — | — | %27,7 (%27,5–%28) n=24 |

Bakım parçası karşılanma (`bakimKarsilanmaPpm`), düğüm düzeyi, medyan (p10–p90):

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| yerleşik sanayici | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| yerleşik tüccar | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| geç katılan (üçü) | — | — | — | — | — | %0 (%0–%0) |

Aşınmanın %50 ve %100'e vardığı gün (tesisin ilk görüldüğü andan itibaren geçen gün; medyan (p10–p90)) ve ölçüm anına kadar varan tesis payı:

| Grup | Tesis (n) | %50'ye varan | %50 gün (kurulumdan) | %50 gün (mutlak sim günü) | %100'e varan | %100 gün (kurulumdan) | %100 gün (mutlak) |
|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 27 | %100 | 26,0 (25,7–26,0) | 26,0 (26,0–26,0) | %100 | 51,0 (50,7–51,0) | 51,0 (51,0–51,0) |
| yerleşik sanayici | 18 | %100 | 26,0 (25,5–26,0) | 26,0 (26,0–26,0) | %100 | 51,0 (50,5–51,0) | 51,0 (51,0–51,0) |
| yerleşik tüccar | 12 | %100 | 25,7 (25,7–26,0) | 26,0 (26,0–26,0) | %100 | 50,7 (50,7–51,0) | 51,0 (51,0–51,0) |
| geç katılan (üçü) | 24 | %0 | — | — | %0 | — | — |

Yerleşik tesis türüne göre 74. günde (ölçüm anı) aşınma ve verim (`verimPpm`: son çözümdeki girdi yeterliliği), medyan (p10–p90):

| Grup | Tesis türü | n | Aşınma | Verim | İşçi |
|---|---|---|---|---|---|
| yerleşik çiftçi | ciftlik | 18 | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik çiftçi | ahir | 9 | %100 (%100–%100) | %58,1 (%31,6–%81,4) | %100 (%100–%100) |
| yerleşik sanayici | cevher_madeni | 12 | %100 (%100–%100) | %67,4 (%67,4–%67,4) | %100 (%100–%100) |
| yerleşik sanayici | hidro_santrali | 6 | %100 (%100–%100) | %2,7 (%1,8–%5,5) | %100 (%100–%100) |
| yerleşik tüccar | ciftlik | 6 | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik tüccar | ahir | 6 | %100 (%100–%100) | %33,3 (%29,1–%37,7) | %100 (%100–%100) |

### bakim-c-r8-onarim (tarım kapalı · bakım yalnız onarım)

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %10 (%10–%10) n=27 | %20 (%20–%20) n=27 | %40 (%40–%40) n=27 | %17,8 (%17,8–%17,8) n=27 | %15,8 (%15,8–%15,8) n=27 | %20 (%20–%20) n=27 |
| yerleşik sanayici | %9,7 (%9,7–%9,7) n=18 | %19,7 (%19,7–%19,7) n=18 | %39,7 (%39,7–%39,7) n=18 | %17,9 (%17,9–%17,9) n=18 | %15,9 (%15,9–%15,9) n=18 | %21,9 (%21,9–%21,9) n=18 |
| yerleşik tüccar | %9,5 (%9,5–%9,5) n=12 | %19,5 (%19,5–%19,5) n=12 | %39,5 (%39,5–%39,5) n=12 | %17,6 (%17,6–%17,6) n=12 | %15,6 (%15,6–%15,6) n=12 | %21,6 (%21,6–%21,7) n=12 |
| geç katılan (üçü) | — | — | — | — | — | %27,7 (%27,5–%28) n=24 |

Bakım parçası karşılanma (`bakimKarsilanmaPpm`), düğüm düzeyi, medyan (p10–p90):

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| yerleşik sanayici | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| yerleşik tüccar | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| geç katılan (üçü) | — | — | — | — | — | %0 (%0–%0) |

Aşınmanın %50 ve %100'e vardığı gün (tesisin ilk görüldüğü andan itibaren geçen gün; medyan (p10–p90)) ve ölçüm anına kadar varan tesis payı:

| Grup | Tesis (n) | %50'ye varan | %50 gün (kurulumdan) | %50 gün (mutlak sim günü) | %100'e varan | %100 gün (kurulumdan) | %100 gün (mutlak) |
|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 27 | %0 | — | — | %0 | — | — |
| yerleşik sanayici | 18 | %0 | — | — | %0 | — | — |
| yerleşik tüccar | 12 | %0 | — | — | %0 | — | — |
| geç katılan (üçü) | 24 | %0 | — | — | %0 | — | — |

Yerleşik tesis türüne göre 74. günde (ölçüm anı) aşınma ve verim (`verimPpm`: son çözümdeki girdi yeterliliği), medyan (p10–p90):

| Grup | Tesis türü | n | Aşınma | Verim | İşçi |
|---|---|---|---|---|---|
| yerleşik çiftçi | ciftlik | 18 | %20 (%20–%20) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik çiftçi | ahir | 9 | %20 (%20–%20) | %89 (%48,5–%100) | %100 (%100–%100) |
| yerleşik sanayici | cevher_madeni | 12 | %21,9 (%21,9–%21,9) | %59,6 (%59,6–%59,6) | %100 (%100–%100) |
| yerleşik sanayici | hidro_santrali | 6 | %21,9 (%21,9–%21,9) | %1,6 (%1–%3,2) | %100 (%100–%100) |
| yerleşik tüccar | ciftlik | 6 | %21,6 (%21,6–%21,7) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik tüccar | ahir | 6 | %21,6 (%21,6–%21,7) | %50,6 (%44,3–%57,4) | %100 (%100–%100) |

### bakim-c-r8-bakim (tarım kapalı · bakım AÇIK)

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %0 (%0–%0) n=27 | %0 (%0–%0) n=27 | %0 (%0–%0) n=27 | %0 (%0–%0) n=27 | %0 (%0–%0) n=27 | %0 (%0–%0) n=27 |
| yerleşik sanayici | %0 (%0–%0) n=18 | %0 (%0–%0) n=18 | %0 (%0–%0) n=18 | %0 (%0–%0) n=18 | %0 (%0–%0) n=18 | %0 (%0–%0) n=18 |
| yerleşik tüccar | %0 (%0–%0) n=12 | %0 (%0–%0) n=12 | %0 (%0–%0) n=12 | %0 (%0–%0) n=12 | %0 (%0–%0) n=12 | %0 (%0–%0) n=12 |
| geç katılan (üçü) | — | — | — | — | — | %0 (%0–%0) n=24 |

Bakım parçası karşılanma (`bakimKarsilanmaPpm`), düğüm düzeyi, medyan (p10–p90):

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik sanayici | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik tüccar | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) |
| geç katılan (üçü) | — | — | — | — | — | %100 (%100–%100) |

Aşınmanın %50 ve %100'e vardığı gün (tesisin ilk görüldüğü andan itibaren geçen gün; medyan (p10–p90)) ve ölçüm anına kadar varan tesis payı:

| Grup | Tesis (n) | %50'ye varan | %50 gün (kurulumdan) | %50 gün (mutlak sim günü) | %100'e varan | %100 gün (kurulumdan) | %100 gün (mutlak) |
|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 27 | %0 | — | — | %0 | — | — |
| yerleşik sanayici | 18 | %0 | — | — | %0 | — | — |
| yerleşik tüccar | 12 | %0 | — | — | %0 | — | — |
| geç katılan (üçü) | 24 | %0 | — | — | %0 | — | — |

Yerleşik tesis türüne göre 74. günde (ölçüm anı) aşınma ve verim (`verimPpm`: son çözümdeki girdi yeterliliği), medyan (p10–p90):

| Grup | Tesis türü | n | Aşınma | Verim | İşçi |
|---|---|---|---|---|---|
| yerleşik çiftçi | ciftlik | 18 | %0 (%0–%0) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik çiftçi | ahir | 9 | %0 (%0–%0) | %96,7 (%52,7–%100) | %100 (%100–%100) |
| yerleşik sanayici | cevher_madeni | 12 | %0 (%0–%0) | %55,8 (%55,8–%55,8) | %100 (%100–%100) |
| yerleşik sanayici | hidro_santrali | 6 | %0 (%0–%0) | %1,3 (%0,9–%2,7) | %100 (%100–%100) |
| yerleşik tüccar | ciftlik | 6 | %0 (%0–%0) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik tüccar | ahir | 6 | %0 (%0–%0) | %55,4 (%48,5–%62,8) | %100 (%100–%100) |

## 4. Son 7 günlük gelir kalemleri, aşınma kaybı ve bakım harcaması (yerleşik ve geç oyuncu başına, havuzlanmış medyan)

Kalemler çekirdeğin para defterindeki saatlik akışların (`paraAkisi`) saatlik örneklemeyle toplamıdır (mili-₺ → ₺). **Net üretim geliri** koşucunun Y7 ölçüsüdür (hazine farkı + sermaye harcaması). **Hesaplanan net** = ihracat + nüfus − ithalat − işletme − vergi − genel onarım parası; **uzlaşma farkı** = net üretim geliri − hesaplanan net (örnekleme, komutla alınan ek giderler, hazine kelepçesi). **Aşınma kaybı TAHMİNDİR** (yöntem notuna bakın). Genel onarım malzemesi hazineden değil düğüm stoğundan çıkar (taban fiyatla değer, ayrı sütun; net gelire girmez). Medyanlar sütun sütun alınır: sütunlar birbirinin toplamı olmak zorunda değildir.

### bakim-c-r8-temel (tarım kapalı · bakım kapalı)

| Kalem (7 gün) | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) |
|---|---|---|---|---|
| Net üretim geliri (Y7) | 206.544 ₺ (85.235 ₺–296.884 ₺) | 403.973 ₺ (403.973 ₺–403.974 ₺) | 129.349 ₺ (118.595 ₺–146.919 ₺) | 376.813 ₺ (244.883 ₺–882.042 ₺) |
| Brüt çıktı değeri (ihracat + nüfus) | 238.674 ₺ (115.613 ₺–327.807 ₺) | 424.063 ₺ (424.063 ₺–424.063 ₺) | 149.765 ₺ (138.874 ₺–167.419 ₺) | 397.467 ₺ (275.115 ₺–901.625 ₺) |
| Aşınma kaybı (TAHMİN) | 159.116 ₺ (77.075 ₺–218.538 ₺) | 282.709 ₺ (282.709 ₺–282.709 ₺) | 99.843 ₺ (92.582 ₺–111.613 ₺) | 34.370 ₺ (24.057 ₺–77.279 ₺) |
| İşletme gideri | 30.240 ₺ (30.240 ₺–30.240 ₺) | 20.160 ₺ (20.160 ₺–20.160 ₺) | 20.160 ₺ (20.160 ₺–20.160 ₺) | 20.160 ₺ (20.160 ₺–30.240 ₺) |
| İthalat (tüm mal) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| · bunun bakım parçası payı | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: para | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: malzeme (stok değeri) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: sayı (7 gün) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Genel onarım duruşu (tesis-saat payı) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| Arazi vergisi | 15 ₺ (10 ₺–20 ₺) | 22 ₺ (22 ₺–22 ₺) | 0 ₺ (0 ₺–10 ₺) | 0 ₺ (0 ₺–20 ₺) |
| Hesaplanan net | 208.414 ₺ (85.353 ₺–297.552 ₺) | 403.881 ₺ (403.881 ₺–403.881 ₺) | 129.595 ₺ (118.704 ₺–147.259 ₺) | 377.307 ₺ (244.875 ₺–881.445 ₺) |
| Uzlaşma farkı | -667 ₺ (-1.870 ₺–-118 ₺) | 92 ₺ (92 ₺–93 ₺) | -245 ₺ (-341 ₺–-109 ₺) | 7 ₺ (-3.295 ₺–597 ₺) |
| Ortalama aşınma (pencere) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %19,8 (%19,6–%20,1) |
| Aşınmanın verim cezası (pencere) | %40 (%40–%40) | %40 (%40–%40) | %40 (%40–%40) | %7,9 (%7,8–%8) |
| Bakım karşılanma (pencere) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |

Katılımdan ölçüm anına TOPLAM bakım harcaması (oyuncu başına medyan):

| Kalem (toplam) | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) |
|---|---|---|---|---|
| Bakım parçası ithalatı (nakit) | 0 ₺ (0 ₺–0 ₺) | 15.194 ₺ (15.194 ₺–15.194 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–14.731 ₺) |
| Genel onarım: para | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: malzeme (stok değeri) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım sayısı | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Genel onarım reddi (yetersiz kaynak vb.) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Onarım duruşu (tesis-saat) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Brüt çıktı değeri (ihracat + nüfus) | 4.752.981 ₺ (4.693.793 ₺–5.407.318 ₺) | 6.959.702 ₺ (6.959.701 ₺–6.959.703 ₺) | 2.947.167 ₺ (2.936.851 ₺–2.972.750 ₺) | 1.218.853 ₺ (1.061.497 ₺–1.865.315 ₺) |
| Aşınma kaybı (TAHMİN) | 1.467.300 ₺ (1.455.206 ₺–1.591.034 ₺) | 2.270.128 ₺ (2.270.128 ₺–2.270.128 ₺) | 807.524 ₺ (806.381 ₺–814.631 ₺) | 48.336 ₺ (42.254 ₺–100.906 ₺) |
| Ortalama aşınma | %65,6 (%65,6–%65,6) | %65,5 (%65,5–%65,5) | %65,4 (%65,4–%65,4) | %13 (%12,7–%13,1) |
| Aşınmanın verim cezası | %26,3 (%26,3–%26,3) | %26,2 (%26,2–%26,2) | %26,1 (%26,1–%26,1) | %5,2 (%5,1–%5,3) |

### bakim-c-r8-onarim (tarım kapalı · bakım yalnız onarım)

| Kalem (7 gün) | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) |
|---|---|---|---|---|
| Net üretim geliri (Y7) | 545.134 ₺ (260.350 ₺–770.296 ₺) | 578.410 ₺ (578.406 ₺–578.416 ₺) | 350.173 ₺ (324.023 ₺–393.407 ₺) | 376.804 ₺ (244.866 ₺–882.041 ₺) |
| Brüt çıktı değeri (ihracat + nüfus) | 578.830 ₺ (290.635 ₺–801.157 ₺) | 598.154 ₺ (598.150 ₺–598.160 ₺) | 370.677 ₺ (344.209 ₺–414.111 ₺) | 397.458 ₺ (275.097 ₺–901.625 ₺) |
| Aşınma kaybı (TAHMİN) | 32.903 ₺ (14.824 ₺–41.451 ₺) | 35.337 ₺ (35.330 ₺–35.341 ₺) | 21.969 ₺ (20.107 ₺–24.678 ₺) | 34.369 ₺ (24.055 ₺–77.279 ₺) |
| İşletme gideri | 30.240 ₺ (30.240 ₺–30.240 ₺) | 20.160 ₺ (20.160 ₺–20.160 ₺) | 20.160 ₺ (20.160 ₺–20.160 ₺) | 20.160 ₺ (20.160 ₺–30.240 ₺) |
| İthalat (tüm mal) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| · bunun bakım parçası payı | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: para | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: malzeme (stok değeri) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: sayı (7 gün) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Genel onarım duruşu (tesis-saat payı) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| Arazi vergisi | 15 ₺ (10 ₺–20 ₺) | 22 ₺ (22 ₺–22 ₺) | 0 ₺ (0 ₺–10 ₺) | 0 ₺ (0 ₺–20 ₺) |
| Hesaplanan net | 548.570 ₺ (260.375 ₺–770.902 ₺) | 577.971 ₺ (577.967 ₺–577.978 ₺) | 350.508 ₺ (324.039 ₺–393.951 ₺) | 377.298 ₺ (244.857 ₺–881.445 ₺) |
| Uzlaşma farkı | -614 ₺ (-3.436 ₺–-25 ₺) | 439 ₺ (438 ₺–439 ₺) | -335 ₺ (-544 ₺–-16 ₺) | 6 ₺ (-3.295 ₺–596 ₺) |
| Ortalama aşınma (pencere) | %12,1 (%12,1–%12,1) | %14 (%14–%14) | %13,7 (%13,7–%13,7) | %19,8 (%19,6–%20,1) |
| Aşınmanın verim cezası (pencere) | %4,8 (%4,8–%4,8) | %5,6 (%5,6–%5,6) | %5,5 (%5,5–%5,5) | %7,9 (%7,8–%8) |
| Bakım karşılanma (pencere) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |

Katılımdan ölçüm anına TOPLAM bakım harcaması (oyuncu başına medyan):

| Kalem (toplam) | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) |
|---|---|---|---|---|
| Bakım parçası ithalatı (nakit) | 25.835 ₺ (25.835 ₺–25.835 ₺) | 67.245 ₺ (67.245 ₺–67.245 ₺) | 18.290 ₺ (18.287 ₺–18.290 ₺) | 0 ₺ (0 ₺–14.731 ₺) |
| Genel onarım: para | 12.000 ₺ (12.000 ₺–12.000 ₺) | 19.200 ₺ (19.200 ₺–19.200 ₺) | 8.400 ₺ (8.400 ₺–8.400 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: malzeme (stok değeri) | 10.980 ₺ (10.980 ₺–10.980 ₺) | 23.400 ₺ (23.400 ₺–23.400 ₺) | 7.740 ₺ (7.740 ₺–7.740 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım sayısı | 3 (3–3) | 3 (3–3) | 3 (3–3) | 0 (0–0) |
| Genel onarım reddi (yetersiz kaynak vb.) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Onarım duruşu (tesis-saat) | 54 (54–54) | 54 (54–54) | 36 (36–36) | 0 (0–0) |
| Brüt çıktı değeri (ihracat + nüfus) | 6.692.240 ₺ (6.628.901 ₺–7.828.657 ₺) | 8.212.354 ₺ (8.212.343 ₺–8.212.359 ₺) | 4.243.030 ₺ (4.238.973 ₺–4.283.326 ₺) | 1.218.853 ₺ (1.065.460 ₺–1.882.687 ₺) |
| Aşınma kaybı (TAHMİN) | 532.038 ₺ (517.227 ₺–610.556 ₺) | 672.190 ₺ (672.178 ₺–672.192 ₺) | 314.640 ₺ (309.588 ₺–317.165 ₺) | 48.340 ₺ (42.344 ₺–101.312 ₺) |
| Ortalama aşınma | %18,8 (%18,8–%18,8) | %18,9 (%18,9–%18,9) | %18,6 (%18,6–%18,6) | %13 (%12,7–%13,1) |
| Aşınmanın verim cezası | %7,5 (%7,5–%7,5) | %7,5 (%7,5–%7,5) | %7,4 (%7,4–%7,4) | %5,2 (%5,1–%5,3) |

### bakim-c-r8-bakim (tarım kapalı · bakım AÇIK)

| Kalem (7 gün) | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) |
|---|---|---|---|---|
| Net üretim geliri (Y7) | 601.601 ₺ (290.543 ₺–833.061 ₺) | 267.186 ₺ (267.171 ₺–284.836 ₺) | 395.129 ₺ (365.203 ₺–443.900 ₺) | 387.087 ₺ (199.870 ₺–957.293 ₺) |
| Brüt çıktı değeri (ihracat + nüfus) | 635.797 ₺ (321.131 ₺–864.276 ₺) | 596.600 ₺ (596.600 ₺–596.600 ₺) | 415.980 ₺ (385.675 ₺–465.008 ₺) | 469.368 ₺ (325.433 ₺–977.156 ₺) |
| Aşınma kaybı (TAHMİN) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| İşletme gideri | 30.240 ₺ (30.240 ₺–30.240 ₺) | 20.160 ₺ (20.160 ₺–20.160 ₺) | 20.160 ₺ (20.160 ₺–20.160 ₺) | 20.160 ₺ (20.160 ₺–30.240 ₺) |
| İthalat (tüm mal) | 0 ₺ (0 ₺–0 ₺) | 291.839 ₺ (291.839 ₺–309.503 ₺) | 0 ₺ (0 ₺–0 ₺) | 61.192 ₺ (0 ₺–95.021 ₺) |
| · bunun bakım parçası payı | 0 ₺ (0 ₺–0 ₺) | 291.839 ₺ (291.839 ₺–309.503 ₺) | 0 ₺ (0 ₺–0 ₺) | 61.192 ₺ (0 ₺–95.021 ₺) |
| Genel onarım: para | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: malzeme (stok değeri) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: sayı (7 gün) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Genel onarım duruşu (tesis-saat payı) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| Arazi vergisi | 15 ₺ (10 ₺–20 ₺) | 22 ₺ (22 ₺–22 ₺) | 0 ₺ (0 ₺–10 ₺) | 0 ₺ (0 ₺–20 ₺) |
| Hesaplanan net | 605.537 ₺ (290.871 ₺–834.021 ₺) | 266.929 ₺ (266.915 ₺–284.578 ₺) | 395.810 ₺ (365.505 ₺–444.848 ₺) | 388.017 ₺ (200.172 ₺–956.976 ₺) |
| Uzlaşma farkı | -961 ₺ (-3.937 ₺–-328 ₺) | 257 ₺ (257 ₺–257 ₺) | -681 ₺ (-947 ₺–-302 ₺) | -303 ₺ (-3.919 ₺–317 ₺) |
| Ortalama aşınma (pencere) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| Aşınmanın verim cezası (pencere) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| Bakım karşılanma (pencere) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) | %100 (%100–%100) |

Katılımdan ölçüm anına TOPLAM bakım harcaması (oyuncu başına medyan):

| Kalem (toplam) | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar | geç katılan (üçü) |
|---|---|---|---|---|
| Bakım parçası ithalatı (nakit) | 918.473 ₺ (918.473 ₺–918.473 ₺) | 2.633.200 ₺ (2.633.186 ₺–2.639.971 ₺) | 515.545 ₺ (515.545 ₺–515.546 ₺) | 180.591 ₺ (135.403 ₺–503.069 ₺) |
| Genel onarım: para | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım: malzeme (stok değeri) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Genel onarım sayısı | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Genel onarım reddi (yetersiz kaynak vb.) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Onarım duruşu (tesis-saat) | 0 (0–0) | 0 (0–0) | 0 (0–0) | 0 (0–0) |
| Brüt çıktı değeri (ihracat + nüfus) | 7.675.385 ₺ (7.594.911 ₺–9.019.308 ₺) | 8.766.495 ₺ (8.766.493 ₺–8.766.498 ₺) | 4.954.289 ₺ (4.940.489 ₺–4.997.940 ₺) | 1.333.270 ₺ (1.146.080 ₺–1.947.810 ₺) |
| Aşınma kaybı (TAHMİN) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) |
| Ortalama aşınma | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |
| Aşınmanın verim cezası | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) |

## 5. Bakım parçası piyasası (1–30. gün; günün saatlik ortalamaları, tohumlar üzerinden medyan)

İstenen: botların parça ithalat emri toplamı (parça/saat). Gerçekleşen: pazarın emirlere verdiği. NPC arzı: pazarın bu saatteki parça arz limiti (oyuncu sayısına göre ölçeklenmiş). Oyuncu talebi: pazarın kaydettiği saatlik talep. Fiyat/taban: parça referans fiyatının taban fiyata oranı.

### bakim-c-r8-temel (tarım kapalı · bakım kapalı)

Bu koşuda 5–30. günlerde hiçbir bot parça ithalat emri vermedi; günlük satırlar yazılmadı.

5–30. günler, tohum × gün havuzu (78 gün-örneği): parça ithalat emri olan gün payı %0; ortalamalar (parça/saat): istenen 0,00, gerçekleşen 0,00, oyuncu talebi 0,00, NPC arzı 340,00; en yüksek günlük istenen 0,00, en yüksek günlük gerçekleşen 0,00.

| Gün | İstenen (parça/sa) | Gerçekleşen (parça/sa) | Oyuncu talebi (parça/sa) | NPC arzı (parça/sa) | İstenen / NPC arzı | Fiyat / taban |
|---|---|---|---|---|---|---|
| 5–30 tümü (medyan) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |

### bakim-c-r8-onarim (tarım kapalı · bakım yalnız onarım)

5–30. günler, tohum × gün havuzu (78 gün-örneği): parça ithalat emri olan gün payı %7,7; ortalamalar (parça/saat): istenen 0,57, gerçekleşen 0,47, oyuncu talebi 0,57, NPC arzı 340,00; en yüksek günlük istenen 12,29, en yüksek günlük gerçekleşen 12,29.

| Gün | İstenen (parça/sa) | Gerçekleşen (parça/sa) | Oyuncu talebi (parça/sa) | NPC arzı (parça/sa) | İstenen / NPC arzı | Fiyat / taban |
|---|---|---|---|---|---|---|
| 5 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 6 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 7 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 8 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 9 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 10 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 11 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 12 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 13 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 14 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 15 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 16 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 17 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 18 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 19 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 20 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 21 | 2,46 (2,46–2,46) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0,7 (%0,7–%0,7) | %113,2 (%113,2–%113,2) |
| 22 | 12,29 (12,29–12,29) | 12,29 (12,29–12,29) | 14,75 (14,75–14,75) | 340,00 (340,00–340,00) | %3,6 (%3,6–%3,6) | %116,5 (%116,5–%116,5) |
| 23 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 24 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 25 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 26 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 27 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 28 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 29 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 30 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 5–30 tümü (medyan) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |

### bakim-c-r8-bakim (tarım kapalı · bakım AÇIK)

5–30. günler, tohum × gün havuzu (78 gün-örneği): parça ithalat emri olan gün payı %30,8; ortalamalar (parça/saat): istenen 19,93, gerçekleşen 15,23, oyuncu talebi 18,27, NPC arzı 340,00; en yüksek günlük istenen 126,98, en yüksek günlük gerçekleşen 91,29.

| Gün | İstenen (parça/sa) | Gerçekleşen (parça/sa) | Oyuncu talebi (parça/sa) | NPC arzı (parça/sa) | İstenen / NPC arzı | Fiyat / taban |
|---|---|---|---|---|---|---|
| 5 | 47,70 (47,70–47,70) | 47,70 (47,70–47,70) | 57,24 (57,24–57,24) | 340,00 (340,00–340,00) | %14 (%14–%14) | %125,9 (%125,9–%125,9) |
| 6 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 7 | 102,59 (102,59–102,59) | 70,83 (70,83–70,83) | 85,00 (85,00–85,00) | 340,00 (340,00–340,00) | %30,2 (%30,2–%30,2) | %128,7 (%128,7–%128,7) |
| 8 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 9 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 10 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 11 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 12 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 13 | 25,79 (25,79–25,79) | 21,49 (21,49–21,49) | 25,79 (25,79–25,79) | 340,00 (340,00–340,00) | %7,6 (%7,6–%7,6) | %118,9 (%118,9–%118,9) |
| 14 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 15 | 75,32 (75,32–75,32) | 48,53 (48,53–48,53) | 58,23 (58,23–58,23) | 340,00 (340,00–340,00) | %22,2 (%22,2–%22,2) | %126,1 (%126,1–%126,1) |
| 16 | 85,43 (85,43–85,43) | 70,83 (70,83–70,83) | 85,00 (85,00–85,00) | 340,00 (340,00–340,00) | %25,1 (%25,1–%25,1) | %128,7 (%128,7–%128,7) |
| 17 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 18 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 19 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 20 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 21 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 22 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 23 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 24 | 126,98 (126,98–126,98) | 91,29 (91,29–91,29) | 109,55 (109,55–109,55) | 340,00 (340,00–340,00) | %37,3 (%37,3–%37,3) | %134,1 (%134,1–%134,1) |
| 25 | 9,06 (9,06–9,06) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %2,7 (%2,7–%2,7) | %113,2 (%113,2–%113,2) |
| 26 | 45,30 (45,30–45,30) | 45,30 (45,30–45,30) | 54,36 (54,36–54,36) | 340,00 (340,00–340,00) | %13,3 (%13,3–%13,3) | %125,2 (%125,2–%125,2) |
| 27 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 28 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 29 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 30 | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 340,00 (340,00–340,00) | %0 (%0–%0) | %113,2 (%113,2–%113,2) |
| 5–30 tümü (medyan) | 0,00 (0,00–85,43) | 0,00 (0,00–70,83) | 0,00 (0,00–85,00) | 340,00 (340,00–340,00) | %0 (%0–%25,1) | %113,2 (%113,2–%128,7) |

## 6. Parça stoğu (başlangıç kiti ve ilk 15 gün; düğümlerdeki toplam, oyuncu başına medyan)

### bakim-c-r8-temel (tarım kapalı · bakım kapalı) — başlangıç kitindeki parça: 40,00

| Grup | 1. gün sonu | 2. gün sonu | 3. gün sonu | 4. gün sonu | 5. gün sonu | 7. gün sonu | 10. gün sonu | 15. gün sonu | Stoğu 1 parçanın altına inen oyuncu (gün medyanı) |
|---|---|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 0,08 (0,08–0,08) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 9/9 (1,0) |
| yerleşik sanayici | 1,80 (1,80–1,80) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 6/6 (2,0) |
| yerleşik tüccar | 0,78 (0,78–0,78) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 6/6 (1,0) |
| geç katılan (üçü) | — | — | — | — | — | — | — | — | — |

### bakim-c-r8-onarim (tarım kapalı · bakım yalnız onarım) — başlangıç kitindeki parça: 40,00

| Grup | 1. gün sonu | 2. gün sonu | 3. gün sonu | 4. gün sonu | 5. gün sonu | 7. gün sonu | 10. gün sonu | 15. gün sonu | Stoğu 1 parçanın altına inen oyuncu (gün medyanı) |
|---|---|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 0,08 (0,08–0,08) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 9/9 (1,0) |
| yerleşik sanayici | 1,80 (1,80–1,80) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 6/6 (2,0) |
| yerleşik tüccar | 0,78 (0,78–0,78) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 0,00 (0,00–0,00) | 6/6 (1,0) |
| geç katılan (üçü) | — | — | — | — | — | — | — | — | — |

### bakim-c-r8-bakim (tarım kapalı · bakım AÇIK) — başlangıç kitindeki parça: 40,00

| Grup | 1. gün sonu | 2. gün sonu | 3. gün sonu | 4. gün sonu | 5. gün sonu | 7. gün sonu | 10. gün sonu | 15. gün sonu | Stoğu 1 parçanın altına inen oyuncu (gün medyanı) |
|---|---|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 140,36 (140,36–140,36) | 104,05 (104,05–104,05) | 67,84 (67,84–67,84) | 31,67 (31,67–31,67) | 376,69 (376,69–376,69) | 303,24 (303,24–303,24) | 193,57 (193,57–193,57) | 400,36 (400,36–400,36) | 0/9 (—) |
| yerleşik sanayici | 120,68 (120,68–120,68) | 493,91 (493,91–494,02) | 396,88 (396,88–396,99) | 299,97 (299,97–300,09) | 203,33 (203,33–203,44) | 859,69 (859,69–860,05) | 566,89 (566,89–567,24) | 82,80 (82,80–83,15) | 0/6 (—) |
| yerleşik tüccar | 306,71 (306,71–306,71) | 282,09 (282,09–282,09) | 257,50 (257,50–257,50) | 232,99 (232,99–232,99) | 208,49 (208,49–208,49) | 159,70 (159,70–159,70) | 86,82 (86,82–86,82) | 223,23 (223,23–223,23) | 0/6 (—) |
| geç katılan (üçü) | — | — | — | — | — | — | — | — | — |

Notlar: saat başına bir örnek; "gün N sonu" = N × 24. saat. "Stoğu 1 parçanın altına inen": serideki ilk gün sonu ölçümünde parça stoğu 1 parçadan az olan oyuncu sayısı / yalnız gün 0'da katılanlar.
## 7. Bakım parçası ithalatının zamanlaması (gün düzeyi; yalnız gün 0'da katılan yerleşik oyuncular)

İthalat günü = o gün saatlik örneklerde parça ithalatı nakit bedeli > 0 olan gün. Dönem payları toplam ithalatın gün 1–30, 31–60 ve 61–son gün paylarıdır. "Haftalık ort. / Y7 net" = (toplam parça ithalatı / (gün sayısı / 7)) ÷ son 7 günlük net üretim geliri (Y7 ölçüsü parça giderini görmeyen pencerede ne kadar sapma olduğunu verir: son 7 günlük gerçek ithalat ayrı satırdadır).

### bakim-c-r8-temel (tarım kapalı · bakım kapalı)

| Grup | Oyuncu | İthalat günü sayısı | İlk ithalat günü | Son ithalat günü | Pay gün 1–30 | Pay gün 31–60 | Pay gün 61–son | İthalat günleri arası (gün) | Toplam ithalat | Son 7 gün ithalatı | Haftalık ortalama ithalat | Haftalık ort. / Y7 net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 9 | 0 (0–0) | 0 (0–0) | 0 (0–0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | — | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | %0 (%0–%0) |
| yerleşik sanayici | 6 | 1 (1–1) | 1 (1–1) | 1 (1–1) | %100 (%100–%100) | %0 (%0–%0) | %0 (%0–%0) | — | 15.194 ₺ (15.194 ₺–15.194 ₺) | 0 ₺ (0 ₺–0 ₺) | 1.437 ₺ (1.437 ₺–1.437 ₺) | %0,4 (%0,4–%0,4) |
| yerleşik tüccar | 6 | 0 (0–0) | 0 (0–0) | 0 (0–0) | %0 (%0–%0) | %0 (%0–%0) | %0 (%0–%0) | — | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | 0 ₺ (0 ₺–0 ₺) | %0 (%0–%0) |

- **yerleşik çiftçi (örnek oyuncu, ilk tohum)** — 0 ithalat günü: yok.
- **yerleşik sanayici (örnek oyuncu, ilk tohum)** — 1 ithalat günü: g1: 15.194 ₺.
- **yerleşik tüccar (örnek oyuncu, ilk tohum)** — 0 ithalat günü: yok.

### bakim-c-r8-onarim (tarım kapalı · bakım yalnız onarım)

| Grup | Oyuncu | İthalat günü sayısı | İlk ithalat günü | Son ithalat günü | Pay gün 1–30 | Pay gün 31–60 | Pay gün 61–son | İthalat günleri arası (gün) | Toplam ithalat | Son 7 gün ithalatı | Haftalık ortalama ithalat | Haftalık ort. / Y7 net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 9 | 3 (3–3) | 22 (22–22) | 64 (64–64) | %34,2 (%34,2–%34,2) | %34,2 (%34,2–%34,2) | %31,6 (%31,6–%31,6) | 21 (21–21) | 25.835 ₺ (25.835 ₺–25.835 ₺) | 0 ₺ (0 ₺–0 ₺) | 2.444 ₺ (2.444 ₺–2.444 ₺) | %0,4 (%0,3–%0,9) |
| yerleşik sanayici | 6 | 4 (4–4) | 1 (1–1) | 64 (64–64) | %48,9 (%48,9–%48,9) | %26,3 (%26,3–%26,3) | %24,8 (%24,8–%24,8) | 21 (21–21) | 67.245 ₺ (67.245 ₺–67.245 ₺) | 0 ₺ (0 ₺–0 ₺) | 6.361 ₺ (6.361 ₺–6.361 ₺) | %1,1 (%1,1–%1,1) |
| yerleşik tüccar | 6 | 3 (3–3) | 22 (22–22) | 64 (64–64) | %33,9 (%33,9–%33,9) | %34 (%34–%34) | %32,1 (%32,1–%32,1) | 21 (21–21) | 18.290 ₺ (18.287 ₺–18.290 ₺) | 0 ₺ (0 ₺–0 ₺) | 1.730 ₺ (1.730 ₺–1.730 ₺) | %0,5 (%0,4–%0,5) |

- **yerleşik çiftçi (örnek oyuncu, ilk tohum)** — 3 ithalat günü: g22: 8.837 ₺; g43: 8.837 ₺; g64: 8.161 ₺.
- **yerleşik sanayici (örnek oyuncu, ilk tohum)** — 4 ithalat günü: g1: 15.194 ₺; g22: 17.673 ₺; g43: 17.673 ₺; g64: 16.705 ₺.
- **yerleşik tüccar (örnek oyuncu, ilk tohum)** — 3 ithalat günü: g22: 6.209 ₺; g43: 6.210 ₺; g64: 5.870 ₺.

### bakim-c-r8-bakim (tarım kapalı · bakım AÇIK)

| Grup | Oyuncu | İthalat günü sayısı | İlk ithalat günü | Son ithalat günü | Pay gün 1–30 | Pay gün 31–60 | Pay gün 61–son | İthalat günleri arası (gün) | Toplam ithalat | Son 7 gün ithalatı | Haftalık ortalama ithalat | Haftalık ort. / Y7 net |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| yerleşik çiftçi | 9 | 8 (8–8) | 1 (1–1) | 66 (66–66) | %46,1 (%46,1–%46,1) | %39,5 (%39,5–%39,5) | %14,4 (%14,4–%14,4) | 10 (4–11) | 918.473 ₺ (918.473 ₺–918.473 ₺) | 0 ₺ (0 ₺–0 ₺) | 86.883 ₺ (86.883 ₺–86.883 ₺) | %14,4 (%10,4–%29,9) |
| yerleşik sanayici | 6 | 10 (10–10) | 1 (1–1) | 71 (71–72) | %42,4 (%42,4–%42,5) | %34,1 (%34,1–%35,6) | %22 (%22–%23,4) | 9 (1–11) | 2.633.200 ₺ (2.633.186 ₺–2.639.971 ₺) | 291.839 ₺ (291.839 ₺–309.503 ₺) | 249.086 ₺ (249.085 ₺–249.727 ₺) | %87,7 (%87,7–%93,2) |
| yerleşik tüccar | 6 | 7 (7–7) | 1 (1–1) | 66 (66–66) | %42,3 (%42,3–%42,3) | %40,8 (%40,8–%40,8) | %16,8 (%16,8–%16,8) | 11 (10–12) | 515.545 ₺ (515.545 ₺–515.546 ₺) | 0 ₺ (0 ₺–0 ₺) | 48.768 ₺ (48.768 ₺–48.768 ₺) | %12,3 (%11–%13,4) |

- **yerleşik çiftçi (örnek oyuncu, ilk tohum)** — 8 ithalat günü: g1: 54.615 ₺; g5: 123.730 ₺; g15: 127.805 ₺; g26: 116.824 ₺; g36: 121.489 ₺; g46: 122.189 ₺; g56: 119.448 ₺; g66: 132.373 ₺.
- **yerleşik sanayici (örnek oyuncu, ilk tohum)** — 10 ithalat günü: g1: 67.199 ₺; g2: 162.810 ₺; g7: 294.444 ₺; g16: 297.729 ₺; g24: 296.655 ₺; g33: 299.993 ₺; g42: 289.647 ₺; g50: 308.728 ₺; g61: 306.492 ₺; g71: 309.503 ₺.
- **yerleşik tüccar (örnek oyuncu, ilk tohum)** — 7 ithalat günü: g1: 84.654 ₺; g13: 68.483 ₺; g24: 65.163 ₺; g34: 70.893 ₺; g45: 67.140 ₺; g55: 72.465 ₺; g66: 86.747 ₺.

## 8. Tesis türü başına bakım başabaşı (içerik tablosundan; tam verim ve tam kadro, taban fiyat)

Eşik: T = aşınmanın verim kaybı tavanı = %40; (1 − T) / T = 1,500, 1 / T = 2,500. **R** = katma değer (çıktı − girdi değeri) / bakım parçası maliyeti (parça/sa × parça taban fiyatı 180 ₺); "R ≥ (1−T)/T": bakımsız çıktı baz alındığında bakım kazandırır (A2 tanımı); "R ≥ 1/T": bakımlı çıktı baz alındığında. Değerler ₺/saat ve taban fiyatlıdır (pazar fiyatı ve ithalat çarpanı hariç); girdisi ya da çıktısı pazarda taban fiyatı olmayan mal 0 sayılır. Doğrudan değerdir: santralin elektriği tesislerin girdisidir, dolaylı değeri (zincir) burada yoktur.

| Tesis türü | İlk yöntem | Bakım parçası (parça/sa) | Parça maliyeti (₺/sa) | Çıktı değeri (₺/sa) | Girdi değeri (₺/sa) | Katma değer (₺/sa) | R | R ≥ (1−T)/T | R ≥ 1/T |
|---|---|---|---|---|---|---|---|---|---|
| ahir | ahir_besi | 0,50 | 90 ₺ | 6.580 ₺ | 3.600 ₺ | 2.980 ₺ | 33,11 | evet | evet |
| cevher_madeni | yuzey_cevher | 1,00 | 180 ₺ | 3.500 ₺ | 50 ₺ | 3.450 ₺ | 19,17 | evet | evet |
| ciftlik | geleneksel_tarim | 0,50 | 90 ₺ | 6.000 ₺ | 0 ₺ | 6.000 ₺ | 66,67 | evet | evet |
| hidro_santrali | hidro_santrali | 2,00 | 360 ₺ | 3.000 ₺ | 0 ₺ | 3.000 ₺ | 8,33 | evet | evet |

Yönetimsiz koşuda (bakim-c-r8-temel) 74. günde ölçülen verim (`verimPpm`, yerleşik oyuncular, medyan (p10–p90)):

| Tesis türü | n | Verim |
|---|---|---|
| ahir | 15 | %37,7 (%29,1–%81,4) |
| cevher_madeni | 12 | %67,4 (%67,4–%67,4) |
| ciftlik | 24 | %100 (%100–%100) |
| hidro_santrali | 6 | %2,7 (%1,8–%5,5) |

