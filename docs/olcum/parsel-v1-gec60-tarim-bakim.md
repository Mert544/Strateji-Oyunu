# Parsel dünyası ölçümü — v1-gec60-tarim-bakim

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-gec60-tarim-bakim |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Süre | 74 sim günü (geç katılım 60. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | mini-6 |
| Tarım yönetimi | AÇIK (ekim planı + gübre dozu; pasif ve spekülatör hariç) |
| Bakım yönetimi | AÇIK (parça ithalatı + aşınma eşiğinde genel onarım; pasif ve spekülatör hariç) |
| Ağır koşu | EVET (H6 tanımındaki gerçek 60. gün katılımı) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor | hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez |
| H6 ikinci koşul: açılış koşulu (docs/12 §13) | GEÇTİ · (i) taban hücre ayak izine yeter %100 (yurt dahil: %100) · (ii, bilgi) 14 günde açılış yapısı %100 — insan testi gerekli | TÜM olgular (i)'yi sağlamalı; (ii) karara girmez | ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir |
| H6 Y7 emsal düzeyi | il yedeğiyle ölçülen olgu %0 | (bilgi) | önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %0 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,4'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 eski tanım (ucuz hücre payı ≥ %20) | %90,2 (eski oyuncuya açık: %72,4) | (karara girmez; eski eşik: < %20) | yalnız bilgi; ayrılmış hücre uygun hücrelerin ~%19'u olduğundan eşik yapısal olarak tutmuyordu |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %16,1 · ilçe payı %20,7 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

## 2. H6 — geç katılan işe yarar

Paket çekirdeğin gerçek davranışına göre okunur (docs/06 §15.1; botlar `yapi_yerlestir` kullanır):

- **Hibe (₺50.000) ve başlangıç kiti** hazineye/stoğa anında girer → ham servete girer (hibe + kit = 85.600 ₺).
- **Yurt (6 hücre) değeri 0**: hücrenin `degerMili`'si 0, arazi bedeline girmez → ham servet yurdu SAYMAZ (yurt serveti olduğundan düşük gösterir; geç katılan ve yerleşik için aynı).
- **İndirimli yapı**: ilk 5 yapıda yapı değeri = ÖDENEN tutar (para + malzeme %70'i), tam bedel değil (koşucu, inşaatın `odenenPara`/`odenenMal` kaydından okur).
- **Ayrılmış hücre**: ilçenin %20'si yalnız katılımın ilk 14 gününde olan oyuncuya satılır. Geç katılan 14. günde ayrılmış hücrelere hâlâ erişir; yerleşikler gün 14'ten sonra erişemez.

**Karar kaynağı (lider kararı).** H6'nın BİRİNCİL ölçüsü hibeden bağımsız üretim gelirinin akışıdır (**Y7**: katılımdan 14 gün sonraki son 7 günün net üretim geliri = hazine akışı − sermaye harcaması; hibe/kit akışa girmediği için tanım gereği bağımsız; emsal önce ilçenin üreten yerleşikleri, ilçede üreten yoksa aynı ilin üreten yerleşikleridir). Hipotez kararı Y7 + açılış koşulundan gelir (açılış koşulu: katılımda katılınan ilçede taban fiyatlı hücre açılışın ayak izine yeter; KARARA YALNIZ (i) girer; (ii) katılımdan sonra 14 günde açılış yapısı kuruldu bilgidir ve insan testi gerektirir; ayak izi yurt hariçtir, çünkü yurt ayrı ve ücretsizdir; eski ucuz hücre payı ölçütü bilgi olarak ayrı satırdadır). **Servet** tabanlı ulaşma İKİNCİL olarak raporlanır: ham servet ile hibe/kit'ten arındırılmış servet AYNI kararı verir (ortak ofset altında `servet ≥ medyan` değişmez; yalnız servet/medyan oranı değişir).

### Tohum 1

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 380.346 ₺ | 202.638 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.172 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 605.684 ₺ | 759.351 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.266.494 ₺ | 4.103.302 ₺ | %30,9 | %29,4 | %6,8 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.740 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.404.623 ₺ | 7.885.835 ₺ | %17,8 | %16,9 | %6,1 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 464.882 ₺ | 273.625 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.172 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 623.435 ₺ | 756.926 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.193.432 ₺ | 4.095.798 ₺ | %29,1 | %27,6 | %7,2 | hayır |
| gec_sanayici | 1.552.828 ₺ | 6.137.739 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.441.742 ₺ | 7.922.749 ₺ | %18,2 | %17,3 | %5,9 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 641.330 ₺ | 379.312 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.172 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 637.586 ₺ | 776.375 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.375.873 ₺ | 4.178.754 ₺ | %32,9 | %31,5 | %6,2 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.740 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.513.696 ₺ | 8.000.997 ₺ | %18,9 | %18 | %5,7 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 4

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 857.997 ₺ | 489.363 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.292 ₺ | 267.171 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 641.708 ₺ | 811.722 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.585.800 ₺ | 4.307.704 ₺ | %36,8 | %35,5 | %5,4 | hayır |
| gec_sanayici | 1.529.244 ₺ | 6.137.737 ₺ | %24,9 | %23,9 | %5,6 | hayır |
| gec_pazar | 1.633.841 ₺ | 8.150.793 ₺ | %20 | %19,2 | %5,2 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 5

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 956.090 ₺ | 537.868 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.292 ₺ | 267.170 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 641.708 ₺ | 828.134 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.860.411 ₺ | 4.542.972 ₺ | %41 | %39,8 | %4,6 | hayır |
| gec_sanayici | 1.527.049 ₺ | 6.137.738 ₺ | %24,9 | %23,8 | %5,6 | hayır |
| gec_pazar | 1.747.239 ₺ | 8.180.342 ₺ | %21,4 | %20,5 | %4,9 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 6

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 968.808 ₺ | 544.326 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.291 ₺ | 267.026 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 641.708 ₺ | 828.134 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.037.179 ₺ | 4.623.364 ₺ | %44,1 | %43 | %4,2 | hayır |
| gec_sanayici | 1.529.631 ₺ | 6.137.681 ₺ | %24,9 | %23,9 | %5,6 | hayır |
| gec_pazar | 1.749.077 ₺ | 8.167.125 ₺ | %21,4 | %20,6 | %4,9 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 7

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 873.788 ₺ | 539.398 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.292 ₺ | 267.174 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 641.708 ₺ | 828.134 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.169.926 ₺ | 4.741.046 ₺ | %45,8 | %44,8 | %3,9 | hayır |
| gec_sanayici | 1.552.828 ₺ | 6.137.741 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.712.261 ₺ | 8.107.378 ₺ | %21,1 | %20,3 | %5 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 8

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 873.788 ₺ | 527.431 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.461 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 641.708 ₺ | 815.276 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.068.603 ₺ | 4.761.269 ₺ | %43,4 | %42,4 | %4,1 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.857 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.651.209 ₺ | 8.034.569 ₺ | %20,6 | %19,7 | %5,2 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 9

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 873.788 ₺ | 511.260 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.172 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 641.708 ₺ | 802.732 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.035.653 ₺ | 4.587.103 ₺ | %44,4 | %43,3 | %4,2 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.741 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.547.795 ₺ | 8.000.543 ₺ | %19,3 | %18,5 | %5,5 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 10

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 857.908 ₺ | 476.188 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.172 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 629.566 ₺ | 768.513 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.938.909 ₺ | 4.531.611 ₺ | %42,8 | %41,7 | %4,4 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.739 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.447.282 ₺ | 7.948.052 ₺ | %18,2 | %17,3 | %5,9 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 4 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 5 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 6 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 7 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 8 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 9 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |
| 10 | BELİRSİZ | %16,1 | %6,6 | %16,1 | %20,7 (tuccar_1, 6 hücre) | 0 | yok (ölçülemez) |

Not: botlar yalnızca yurt + birkaç hücre aldığından yoğunlaşma düşüktür; H8'in asıl sınavı spekülatör botuyla yapılır (`--bot ...,spekulator=N`).

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 1 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 2 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 3 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 4 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 4 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 5 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 5 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 6 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 6 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 7 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 7 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 8 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 8 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 9 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 9 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |
| 10 | geç katılımdan hemen önce | 110 | 6 | 104 | %94,5 | 0 | tuttu |
| 10 | koşu sonu | 110 | 11 | 99 | %90 | 0 | tuttu |

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

| Oyuncu | Katılım (gün) | İlçe | Hücre | Ayrılmış | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 2 | 3 | 59 | 0 | 7.023.111 ₺ | 96.160 ₺ | 2.000 ₺ | 26.810 ₺ | 7.148.081 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 1 | 3 | 59 | 0 | 7.024.217 ₺ | 96.160 ₺ | 1.000 ₺ | 26.810 ₺ | 7.148.187 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 7 | 0 | 3 | 67 | 0 | 8.530.569 ₺ | 173.413 ₺ | 1.500 ₺ | 26.810 ₺ | 8.732.292 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 1 | 4 | 28 | 0 | 5.932.338 ₺ | 149.501 ₺ | 2.211 ₺ | 53.690 ₺ | 6.137.740 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 1 | 4 | 28 | 0 | 5.925.524 ₺ | 151.245 ₺ | 2.250 ₺ | 53.690 ₺ | 6.132.709 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 6 | 0 | 3 | 23 | 0 | 6.847.362 ₺ | 168.320 ₺ | 0 ₺ | 23.800 ₺ | 7.039.482 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 1 | 3 | 23 | 0 | 6.846.257 ₺ | 168.320 ₺ | 1.000 ₺ | 23.800 ₺ | 7.039.377 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 0 | 1 | 2 | 0 | 1.037.601 ₺ | 12.836 ₺ | 0 ₺ | 7.980 ₺ | 1.058.417 ₺ |
| gec_ciftci | 60 | sn_m_ova_tasra | 6 | 0 | 3 | 17 | 0 | 1.132.077 ₺ | 107.607 ₺ | 0 ₺ | 26.810 ₺ | 1.266.494 ₺ |
| gec_sanayici | 60 | sn_m_dag_merkez | 8 | 2 | 4 | 16 | 0 | 1.416.004 ₺ | 81.135 ₺ | 2.000 ₺ | 53.690 ₺ | 1.552.829 ₺ |
| gec_pazar | 60 | sn_m_sehir_merkez | 6 | 3 | 3 | 13 | 0 | 1.233.578 ₺ | 147.245 ₺ | 0 ₺ | 23.800 ₺ | 1.404.623 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-gec60-temel)

Karşılaştırılan koşu: `parsel-v1-gec60-temel.json` (10 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %384,7 | %173,6 | %56,4 | %39,1 |
| pazar | %171 | %79,6 | %29,8 | %19,7 |
| sanayici | %218,3 | %358,3 | %27,7 | %25,2 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| H6 açılış koşulu (ayak izine yeter ve 14 günde yapı) | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %0 | %0 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `d288fb42535a44c2` |
| 2 | `06f3cd9958364a4b` |
| 3 | `0dec85d9375b048c` |
| 4 | `be83ab52059da07d` |
| 5 | `94af33cf3c36d86b` |
| 6 | `89a5cd71f23efa3d` |
| 7 | `613b722769b9bb6c` |
| 8 | `752d11daef271dca` |
| 9 | `d8a5a4e6733522ea` |
| 10 | `a143e8819b0a8439` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | GEÇTİ (birincil Y7 %100); ikincil servet KALDI (ulaşan %0) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %16,1 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

