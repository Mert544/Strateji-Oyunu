# Parsel dünyası ölçümü — v0-gec60

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v0-gec60 |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Süre | 74 sim günü (geç katılım 60. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Ağır koşu | EVET (H6 tanımındaki gerçek 60. gün katılımı) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v0-bulgular.md](parsel-v0-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20 | hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %0 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,7'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 ucuz hücre payı (≤ 2× taban) | %94,7 (eski oyuncuya açık: %76,6) | < %20 | ayrılmış hücreler yalnız yeni oyuncuya |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %31 · ilçe payı %9,9 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

## 2. H6 — geç katılan işe yarar

Paket çekirdeğin gerçek davranışına göre okunur (docs/06 §15.1; botlar `yapi_yerlestir` kullanır):

- **Hibe (₺50.000) ve başlangıç kiti** hazineye/stoğa anında girer → ham servete girer (hibe + kit = 85.600 ₺).
- **Yurt (6 hücre) değeri 0**: hücrenin `degerMili`'si 0, arazi bedeline girmez → ham servet yurdu SAYMAZ (yurt serveti olduğundan düşük gösterir; geç katılan ve yerleşik için aynı).
- **İndirimli yapı**: ilk 5 yapıda yapı değeri = ÖDENEN tutar (para + malzeme %70'i), tam bedel değil (koşucu, inşaatın `odenenPara`/`odenenMal` kaydından okur).
- **Ayrılmış hücre**: ilçenin %20'si yalnız katılımın ilk 14 gününde olan oyuncuya satılır. Geç katılan 14. günde ayrılmış hücrelere hâlâ erişir; yerleşikler gün 14'ten sonra erişemez.

**Karar kaynağı (lider kararı).** H6'nın BİRİNCİL ölçüsü hibeden bağımsız üretim gelirinin akışıdır (**Y7**: katılımdan 14 gün sonraki son 7 günün net üretim geliri = hazine akışı − sermaye harcaması; hibe/kit akışa girmediği için tanım gereği bağımsız). Hipotez kararı Y7 + ucuz hücre koşulundan gelir. **Servet** tabanlı ulaşma İKİNCİL olarak raporlanır: ham servet ile hibe/kit'ten arındırılmış servet AYNI kararı verir (ortak ofset altında `servet ≥ medyan` değişmez; yalnız servet/medyan oranı değişir).

### Tohum 1

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 244.869 ₺ | 52.676 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.034 ₺ | 403.972 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 310.214 ₺ | 180.018 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.285.554 ₺ | 2.779.441 ₺ | %46,3 | %44,5 | %6,7 | hayır |
| gec_sanayici | 1.884.547 ₺ | 6.797.436 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.087.491 ₺ | 3.938.660 ₺ | %27,6 | %26 | %7,9 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 324.170 ₺ | 74.755 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.036 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 335.356 ₺ | 195.939 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.188.636 ₺ | 2.730.020 ₺ | %43,5 | %41,7 | %7,2 | hayır |
| gec_sanayici | 1.884.549 ₺ | 6.797.440 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.102.276 ₺ | 3.960.257 ₺ | %27,8 | %26,2 | %7,8 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 517.439 ₺ | 129.172 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.035 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 376.813 ₺ | 221.902 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.222.915 ₺ | 2.741.828 ₺ | %44,6 | %42,8 | %7 | hayır |
| gec_sanayici | 1.884.548 ₺ | 6.797.438 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.132.215 ₺ | 3.989.376 ₺ | %28,4 | %26,8 | %7,6 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 4

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 738.911 ₺ | 209.727 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.036 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 427.092 ₺ | 253.105 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.404.041 ₺ | 2.824.024 ₺ | %49,7 | %48,1 | %6,1 | hayır |
| gec_sanayici | 1.884.549 ₺ | 6.797.436 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.197.656 ₺ | 4.031.941 ₺ | %29,7 | %28,2 | %7,1 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 5

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 890.072 ₺ | 281.143 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.035 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 456.979 ₺ | 270.955 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.758.085 ₺ | 3.051.998 ₺ | %57,6 | %56,4 | %4,9 | hayır |
| gec_sanayici | 1.884.548 ₺ | 6.797.439 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.272.917 ₺ | 4.070.603 ₺ | %31,3 | %29,8 | %6,7 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 6

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 932.099 ₺ | 310.943 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.046 ₺ | 403.972 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 434.225 ₺ | 255.619 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.956.285 ₺ | 3.163.660 ₺ | %61,8 | %60,8 | %4,4 | hayır |
| gec_sanayici | 1.884.569 ₺ | 6.797.431 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.303.274 ₺ | 4.094.576 ₺ | %31,8 | %30,4 | %6,6 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 7

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 902.683 ₺ | 288.344 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.035 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 373.411 ₺ | 217.540 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.155.340 ₺ | 3.302.702 ₺ | %65,3 | %64,3 | %4 | hayır |
| gec_sanayici | 1.884.549 ₺ | 6.797.435 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.294.120 ₺ | 4.095.487 ₺ | %31,6 | %30,1 | %6,6 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 8

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 915.504 ₺ | 235.228 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.035 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 315.680 ₺ | 182.490 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.203.464 ₺ | 3.276.659 ₺ | %67,2 | %66,4 | %3,9 | hayır |
| gec_sanayici | 1.884.549 ₺ | 6.797.435 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.268.105 ₺ | 4.085.543 ₺ | %31 | %29,6 | %6,8 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 9

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 804.132 ₺ | 186.053 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.034 ₺ | 403.972 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 301.741 ₺ | 174.726 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.092.093 ₺ | 3.195.776 ₺ | %65,5 | %64,5 | %4,1 | hayır |
| gec_sanayici | 1.884.548 ₺ | 6.797.438 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.223.283 ₺ | 4.033.214 ₺ | %30,3 | %28,8 | %7 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 10

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 649.920 ₺ | 146.260 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.035 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 314.489 ₺ | 182.679 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.937.881 ₺ | 3.089.994 ₺ | %62,7 | %61,7 | %4,4 | hayır |
| gec_sanayici | 1.884.548 ₺ | 6.797.440 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.136.235 ₺ | 3.946.763 ₺ | %28,8 | %27,2 | %7,5 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 4 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 5 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 6 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 7 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 8 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 9 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 10 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |

Not: botlar yalnızca yurt + birkaç hücre aldığından yoğunlaşma düşüktür; H8'in asıl sınavı spekülatör botuyla (henüz yok) yapılır. Yeniden satış mekanizması çekirdekte yok (`parsel_birak` devlete %70 iade); koşul 3 bu yüzden BELİRSİZ kalır.

## 4. Y ölçütleri (Y1–Y10)

**Botlar eğlenceyi ölçmez** (docs/00 R5): *insan testi* işaretli ölçütlerde aşağıdaki bot sayıları yalnız **gözlemdir**, hedef denetimi sayılmaz. Çekirdek durumundan türetilemeyenler **ölçülemez** işaretiyle gösterilir.

| # | Ölçüt | Hedef | Kaynak | Bu koşuda |
|---|---|---|---|---|
| Y1 | İlk yapı ≤ 10 dk | ≥ %75 | **insan testi** | bot gözlemi: ≤ 10 dk %100 (botlar katılımda anında kurar) — Komut günlüğünden (katılım → ilk kabul edilen yapı komutu). Bot katılımda anında kurar: anlamlı değil, insan testi şart. |
| Y2 | İlk saatte ilk satış | ≥ %70 (60 dk), ≥ %50 (10 dk) | **insan testi** | bot gözlemi: ≤ 60 dk %72,7, ≤ 10 dk %0 — Emir gerçekleşmesinden (gözlem ızgarası çözünürlüğüyle; +10 dk ve +60 dk ek gözlemleriyle eşikler tam). |
| Y3 | İlk sözleşme ≤ 24 sa | ≥ %50 | **insan testi** | ölçülemez (sözleşme komutu yok) — OLÇÜLEMEZ: çekirdekte sözleşme/sipariş komutu (siparis_teslim; A6) yok. |
| Y4 | D1 / D7 geri dönüş | D1 ≥ %35; D7 ≥ %15 (gözlem) | **insan testi** | ölçülemez — OLÇÜLEMEZ: oturum telemetrisi gerekir (sunucu; R-Ü16); çekirdek durumunda yok. |
| Y5 | Açılış çeşitliliği | hiçbir katman > %60 | bot + insan (karma) | en büyük katman %40; hibrit portföy %60 — İlk 24 saatte ikinci yapının katmanı; hibrit portföy oranı. |
| Y6 | Yön değiştirme maliyetsizliği | ≥ %10 yön değiştirir; D7 farkı ≥ −5 puan | **insan testi** | bot gözlemi: yön değiştiren %0 (botlar bırakmaz/iptal etmez); D7 farkı ölçülemez — Yalnız oran (parsel_birak / insaat_iptal, ilk 7 gün) türetilir; D7 farkı oturum verisi ister (ölçülemez). |
| Y7 | 14. gün net üretim geliri | oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde | bot + insan (karma) | GEÇTİ · %100 oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2) — H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı). |
| Y8 | Defter etkileşimi | Atla ≤ %30 | **insan testi** | ölçülemez — OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi. |
| Y9 | Rehberlik (Alfa-1) | ≥ %20; Rehberli D7 ≥ +5 puan | **insan testi** | ölçülemez — OLÇÜLEMEZ: Rehberlik (A16) yok. |
| Y10 | Takılma | ≤ 1 / oyuncu | **insan testi** | ölçülemez — OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız. |

## 5. Oyuncu özeti (tohum 1)

| Oyuncu | Katılım (gün) | İlçe | Hücre | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_m_ova_merkez | 7 | 3 | 7 | 0 | 4.467.452 ₺ | 4.935 ₺ | 1.148 ₺ | 26.810 ₺ | 4.500.345 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 6 | 3 | 7 | 0 | 4.468.720 ₺ | 4.935 ₺ | 0 ₺ | 26.810 ₺ | 4.500.465 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 7 | 3 | 7 | 0 | 5.054.616 ₺ | 4.935 ₺ | 1.296 ₺ | 26.810 ₺ | 5.087.657 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 4 | 10 | 0 | 6.725.419 ₺ | 16.038 ₺ | 2.289 ₺ | 53.690 ₺ | 6.797.436 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 4 | 10 | 0 | 6.725.383 ₺ | 16.038 ₺ | 2.321 ₺ | 53.690 ₺ | 6.797.433 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 6 | 3 | 7 | 0 | 2.759.252 ₺ | 6.612 ₺ | 0 ₺ | 23.800 ₺ | 2.789.664 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 6 | 3 | 7 | 0 | 2.759.252 ₺ | 6.612 ₺ | 0 ₺ | 23.800 ₺ | 2.789.664 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 2 | 0 | 1.037.601 ₺ | 12.836 ₺ | 0 ₺ | 7.980 ₺ | 1.058.417 ₺ |
| gec_ciftci | 60 | sn_m_ova_tasra | 7 | 3 | 7 | 0 | 1.251.545 ₺ | 5.800 ₺ | 1.400 ₺ | 26.810 ₺ | 1.285.554 ₺ |
| gec_sanayici | 60 | sn_m_dag_merkez | 8 | 4 | 10 | 0 | 1.802.983 ₺ | 25.230 ₺ | 2.644 ₺ | 53.690 ₺ | 1.884.547 ₺ |
| gec_pazar | 60 | sn_m_sehir_merkez | 6 | 3 | 7 | 0 | 1.056.216 ₺ | 7.475 ₺ | 0 ₺ | 23.800 ₺ | 1.087.491 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `ad5630aa984e3c78` |
| 2 | `3000aae8c9703fb5` |
| 3 | `10193606adae72e2` |
| 4 | `b94158e0098557b9` |
| 5 | `00cf6452330d23a7` |
| 6 | `3e680c046ed1b370` |
| 7 | `300aaeec548acff7` |
| 8 | `e1a9998551132b76` |
| 9 | `52f1026fe41ce03e` |
| 10 | `5f8aa908db46779d` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | GEÇTİ (birincil Y7 %100); ikincil servet KALDI (ulaşan %0) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %31 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

