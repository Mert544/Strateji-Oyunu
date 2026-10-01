# Parsel dünyası ölçümü — v1-gec60-tarim

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-gec60-tarim |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Süre | 74 sim günü (geç katılım 60. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | mini-6 |
| Tarım yönetimi | AÇIK (ekim planı + gübre dozu; pasif ve spekülatör hariç) |
| Bakım yönetimi | kapalı |
| Ağır koşu | EVET (H6 tanımındaki gerçek 60. gün katılımı) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20 | hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %0 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,1'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 ucuz hücre payı (≤ 2× taban) | %90,2 (eski oyuncuya açık: %73,2) | < %20 | ayrılmış hücreler yalnız yeni oyuncuya |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %16,4 · ilçe payı %24,1 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

## 2. H6 — geç katılan işe yarar

Paket çekirdeğin gerçek davranışına göre okunur (docs/06 §15.1; botlar `yapi_yerlestir` kullanır):

- **Hibe (₺50.000) ve başlangıç kiti** hazineye/stoğa anında girer → ham servete girer (hibe + kit = 85.600 ₺).
- **Yurt (6 hücre) değeri 0**: hücrenin `degerMili`'si 0, arazi bedeline girmez → ham servet yurdu SAYMAZ (yurt serveti olduğundan düşük gösterir; geç katılan ve yerleşik için aynı).
- **İndirimli yapı**: ilk 5 yapıda yapı değeri = ÖDENEN tutar (para + malzeme %70'i), tam bedel değil (koşucu, inşaatın `odenenPara`/`odenenMal` kaydından okur).
- **Ayrılmış hücre**: ilçenin %20'si yalnız katılımın ilk 14 gününde olan oyuncuya satılır. Geç katılan 14. günde ayrılmış hücrelere hâlâ erişir; yerleşikler gün 14'ten sonra erişemez.

**Karar kaynağı (lider kararı).** H6'nın BİRİNCİL ölçüsü hibeden bağımsız üretim gelirinin akışıdır (**Y7**: katılımdan 14 gün sonraki son 7 günün net üretim geliri = hazine akışı − sermaye harcaması; hibe/kit akışa girmediği için tanım gereği bağımsız). Hipotez kararı Y7 + ucuz hücre koşulundan gelir. **Servet** tabanlı ulaşma İKİNCİL olarak raporlanır: ham servet ile hibe/kit'ten arındırılmış servet AYNI kararı verir (ortak ofset altında `servet ≥ medyan` değişmez; yalnız servet/medyan oranı değişir).

### Tohum 1

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 382.901 ₺ | 56.421 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.032 ₺ | 403.972 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 591.552 ₺ | 269.785 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.280.982 ₺ | 3.106.222 ₺ | %41,2 | %39,6 | %6,7 | hayır |
| gec_sanayici | 1.884.543 ₺ | 6.797.421 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.368.763 ₺ | 5.060.840 ₺ | %27 | %25,8 | %6,3 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 464.395 ₺ | 102.856 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.032 ₺ | 403.972 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 616.483 ₺ | 299.335 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.229.475 ₺ | 3.075.491 ₺ | %40 | %38,3 | %7 | hayır |
| gec_sanayici | 1.884.543 ₺ | 6.797.420 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.392.600 ₺ | 5.128.175 ₺ | %27,2 | %25,9 | %6,1 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 663.455 ₺ | 162.058 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.031 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 642.455 ₺ | 322.740 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.308.899 ₺ | 3.090.768 ₺ | %42,3 | %40,7 | %6,5 | hayır |
| gec_sanayici | 1.884.543 ₺ | 6.797.420 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.443.254 ₺ | 5.174.869 ₺ | %27,9 | %26,7 | %5,9 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 4

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 786.952 ₺ | 262.162 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.026 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 655.348 ₺ | 367.107 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.657.225 ₺ | 3.217.683 ₺ | %51,5 | %50,2 | %5,2 | hayır |
| gec_sanayici | 1.884.545 ₺ | 6.797.415 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.543.956 ₺ | 5.207.517 ₺ | %29,6 | %28,5 | %5,5 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 5

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 900.056 ₺ | 363.944 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.031 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 655.661 ₺ | 411.249 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.940.823 ₺ | 3.394.940 ₺ | %57,2 | %56,1 | %4,4 | hayır |
| gec_sanayici | 1.884.543 ₺ | 6.797.422 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.645.897 ₺ | 5.245.180 ₺ | %31,4 | %30,2 | %5,2 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 6

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 921.190 ₺ | 398.458 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.043 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 655.662 ₺ | 378.098 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.122.818 ₺ | 3.533.865 ₺ | %60,1 | %59,1 | %4 | hayır |
| gec_sanayici | 1.884.563 ₺ | 6.797.412 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.675.018 ₺ | 5.253.306 ₺ | %31,9 | %30,8 | %5,1 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 7

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 921.192 ₺ | 366.465 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.031 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 655.661 ₺ | 318.161 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.204.343 ₺ | 3.629.473 ₺ | %60,7 | %59,8 | %3,9 | hayır |
| gec_sanayici | 1.884.543 ₺ | 6.797.421 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.648.169 ₺ | 5.230.105 ₺ | %31,5 | %30,4 | %5,2 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 8

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 921.192 ₺ | 299.457 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.031 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 655.661 ₺ | 257.422 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.102.293 ₺ | 3.586.064 ₺ | %58,6 | %57,6 | %4,1 | hayır |
| gec_sanayici | 1.884.542 ₺ | 6.797.419 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.570.207 ₺ | 5.147.353 ₺ | %30,5 | %29,3 | %5,5 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 9

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 921.030 ₺ | 210.171 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.031 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 655.661 ₺ | 247.070 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.057.596 ₺ | 3.556.832 ₺ | %57,8 | %56,8 | %4,2 | hayır |
| gec_sanayici | 1.884.543 ₺ | 6.797.420 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.470.848 ₺ | 5.119.647 ₺ | %28,7 | %27,5 | %5,8 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 10

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 834.690 ₺ | 202.064 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 882.031 ₺ | 403.971 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 607.355 ₺ | 256.337 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.953.970 ₺ | 3.469.610 ₺ | %56,3 | %55,2 | %4,4 | hayır |
| gec_sanayici | 1.884.541 ₺ | 6.797.421 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.411.565 ₺ | 5.045.702 ₺ | %28 | %26,7 | %6,1 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 4 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 5 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 6 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 7 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 8 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 9 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 10 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |

Not: botlar yalnızca yurt + birkaç hücre aldığından yoğunlaşma düşüktür; H8'in asıl sınavı spekülatör botuyla yapılır (`--bot ...,spekulator=N`).

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 1 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 2 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 3 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 4 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 4 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 5 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 5 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 6 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 6 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 7 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 7 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 8 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 8 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 9 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 9 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 10 | geç katılımdan hemen önce | 110 | 11 | 99 | %90 | 0 | tuttu |
| 10 | koşu sonu | 110 | 14 | 96 | %87,3 | 0 | tuttu |

Okuma: İHLAL = 0 ise çekirdek kuralı (eski oyuncuya satmama) tutuyor. Kalan pay düşükse ayrılmış hücreler **önceki yeni oyuncular** (ör. ilk 14 günde alım yapan spekülatörler) tarafından tüketilmiş demektir: kural eski oyuncudan korur, aynı dönemdeki yeni oyuncudan korumaz.

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
| Y7 | 14. gün net üretim geliri | oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde | bot + insan (karma) | GEÇTİ · %100 oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2) — H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı); emsal yalnız üreten (geliri > 0) yerleşikler. |
| Y8 | Defter etkileşimi | Atla ≤ %30 | **insan testi** | ölçülemez — OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi. |
| Y9 | Rehberlik (Alfa-1) | ≥ %20; Rehberli D7 ≥ +5 puan | **insan testi** | ölçülemez — OLÇÜLEMEZ: Rehberlik (A16) yok. |
| Y10 | Takılma | ≤ 1 / oyuncu | **insan testi** | ölçülemez — OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız. |

## 5. Oyuncu özeti (tohum 1)

| Oyuncu | Katılım (gün) | İlçe | Hücre | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 3 | 35 | 0 | 5.090.534 ₺ | 34.023 ₺ | 2.542 ₺ | 26.810 ₺ | 5.153.909 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 3 | 35 | 0 | 5.091.773 ₺ | 34.023 ₺ | 1.421 ₺ | 26.810 ₺ | 5.154.027 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 6 | 3 | 34 | 0 | 5.872.373 ₺ | 55.303 ₺ | 0 ₺ | 26.810 ₺ | 5.954.485 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 4 | 10 | 0 | 6.725.236 ₺ | 16.038 ₺ | 2.456 ₺ | 53.690 ₺ | 6.797.421 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 4 | 10 | 0 | 6.725.142 ₺ | 16.038 ₺ | 2.542 ₺ | 53.690 ₺ | 6.797.412 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 7 | 3 | 30 | 0 | 4.114.920 ₺ | 27.069 ₺ | 1.414 ₺ | 23.800 ₺ | 4.167.203 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 3 | 30 | 0 | 4.114.825 ₺ | 27.069 ₺ | 1.500 ₺ | 23.800 ₺ | 4.167.195 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 2 | 0 | 1.037.601 ₺ | 12.836 ₺ | 0 ₺ | 7.980 ₺ | 1.058.417 ₺ |
| gec_ciftci | 60 | sn_m_ova_tasra | 6 | 3 | 13 | 0 | 1.202.505 ₺ | 51.667 ₺ | 0 ₺ | 26.810 ₺ | 1.280.982 ₺ |
| gec_sanayici | 60 | sn_m_dag_merkez | 8 | 4 | 10 | 0 | 1.802.606 ₺ | 25.230 ₺ | 3.018 ₺ | 53.690 ₺ | 1.884.543 ₺ |
| gec_pazar | 60 | sn_m_sehir_merkez | 7 | 3 | 9 | 0 | 1.281.523 ₺ | 61.649 ₺ | 1.792 ₺ | 23.800 ₺ | 1.368.763 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-gec60-temel)

Karşılaştırılan koşu: `parsel-v1-gec60-temel.json` (10 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %384,7 | %372,9 | %56,4 | %52,6 |
| pazar | %171 | %209,9 | %29,8 | %29,4 |
| sanayici | %218,3 | %218,3 | %27,7 | %27,7 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %0 | %0 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `2cc4e082858592ea` |
| 2 | `535a19aab6eba1a5` |
| 3 | `27f24185b7c41b4f` |
| 4 | `3e557f816631ec1f` |
| 5 | `2a197f46d5591843` |
| 6 | `1468cc52f84b1cbb` |
| 7 | `7d6e2592c622e537` |
| 8 | `9c93aead48ac178f` |
| 9 | `abc34c1294190b68` |
| 10 | `0525cecbf5cf6185` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | GEÇTİ (birincil Y7 %100); ikincil servet KALDI (ulaşan %0) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %16,4 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

