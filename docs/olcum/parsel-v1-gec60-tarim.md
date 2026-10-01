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
| **H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor | hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez |
| H6 ikinci koşul: açılış koşulu (docs/12 §13) | GEÇTİ · (i) taban hücre ayak izine yeter %100 (yurt dahil: %100) · (ii, bilgi) 14 günde açılış yapısı %100 — insan testi gerekli | TÜM olgular (i)'yi sağlamalı; (ii) karara girmez | ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir |
| H6 Y7 emsal düzeyi | il yedeğiyle ölçülen olgu %0 | (bilgi) | önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %0 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,1'i; hibe/kit arındırması ulaşma kararını değiştirmez |
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
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 382.901 ₺ | 56.423 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.042 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 591.569 ₺ | 269.780 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.280.982 ₺ | 3.106.244 ₺ | %41,2 | %39,6 | %6,7 | hayır |
| gec_sanayici | 1.884.562 ₺ | 6.797.447 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.368.798 ₺ | 5.060.788 ₺ | %27 | %25,8 | %6,3 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 464.395 ₺ | 102.858 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.042 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 616.501 ₺ | 299.331 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.229.475 ₺ | 3.075.513 ₺ | %40 | %38,3 | %7 | hayır |
| gec_sanayici | 1.884.562 ₺ | 6.797.446 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.392.635 ₺ | 5.128.123 ₺ | %27,2 | %25,9 | %6,1 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 663.455 ₺ | 162.060 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.041 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 642.473 ₺ | 322.735 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.308.899 ₺ | 3.090.790 ₺ | %42,3 | %40,7 | %6,5 | hayır |
| gec_sanayici | 1.884.562 ₺ | 6.797.447 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.443.288 ₺ | 5.174.817 ₺ | %27,9 | %26,7 | %5,9 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 4

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 786.952 ₺ | 262.164 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.036 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 655.365 ₺ | 367.102 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.657.225 ₺ | 3.217.705 ₺ | %51,5 | %50,2 | %5,2 | hayır |
| gec_sanayici | 1.884.564 ₺ | 6.797.442 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.543.991 ₺ | 5.207.465 ₺ | %29,6 | %28,5 | %5,5 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 5

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 900.056 ₺ | 363.946 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.042 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 655.679 ₺ | 411.244 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.940.823 ₺ | 3.394.962 ₺ | %57,2 | %56,1 | %4,4 | hayır |
| gec_sanayici | 1.884.563 ₺ | 6.797.448 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.645.932 ₺ | 5.245.127 ₺ | %31,4 | %30,2 | %5,2 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 6

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 921.190 ₺ | 398.460 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.053 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 655.680 ₺ | 378.093 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.122.818 ₺ | 3.533.888 ₺ | %60,1 | %59,1 | %4 | hayır |
| gec_sanayici | 1.884.582 ₺ | 6.797.439 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.675.053 ₺ | 5.253.254 ₺ | %31,9 | %30,8 | %5,1 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 7

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 921.192 ₺ | 366.467 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.041 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 655.679 ₺ | 318.156 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.204.343 ₺ | 3.629.495 ₺ | %60,7 | %59,8 | %3,9 | hayır |
| gec_sanayici | 1.884.562 ₺ | 6.797.448 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.648.204 ₺ | 5.230.053 ₺ | %31,5 | %30,4 | %5,2 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 8

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 921.192 ₺ | 299.459 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.041 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 655.679 ₺ | 257.417 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.102.293 ₺ | 3.586.086 ₺ | %58,6 | %57,6 | %4,1 | hayır |
| gec_sanayici | 1.884.562 ₺ | 6.797.445 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.570.242 ₺ | 5.147.301 ₺ | %30,5 | %29,3 | %5,5 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 9

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 921.030 ₺ | 210.173 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.042 ₺ | 403.974 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 655.679 ₺ | 247.065 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.057.596 ₺ | 3.556.854 ₺ | %57,8 | %56,8 | %4,2 | hayır |
| gec_sanayici | 1.884.563 ₺ | 6.797.446 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.470.883 ₺ | 5.119.594 ₺ | %28,7 | %27,5 | %5,8 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 104 hücresi ayrılmış (yalnız yeni oyuncu), 422 hücresi genel (%72,4). Satılmamış ayrılmış hücre: 104. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 10

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 834.690 ₺ | 202.066 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 882.041 ₺ | 403.973 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 607.373 ₺ | 256.332 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.953.970 ₺ | 3.469.632 ₺ | %56,3 | %55,2 | %4,4 | hayır |
| gec_sanayici | 1.884.560 ₺ | 6.797.448 ₺ | %27,7 | %26,8 | %4,5 | hayır |
| gec_pazar | 1.411.600 ₺ | 5.045.650 ₺ | %28 | %26,7 | %6,1 | hayır |

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
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 2 | 3 | 35 | 0 | 5.091.132 ₺ | 34.023 ₺ | 2.000 ₺ | 26.810 ₺ | 5.153.965 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 1 | 3 | 35 | 0 | 5.092.239 ₺ | 34.023 ₺ | 1.000 ₺ | 26.810 ₺ | 5.154.071 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 7 | 0 | 3 | 34 | 0 | 5.870.715 ₺ | 55.303 ₺ | 1.500 ₺ | 26.810 ₺ | 5.954.328 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 1 | 4 | 10 | 0 | 6.725.508 ₺ | 16.038 ₺ | 2.211 ₺ | 53.690 ₺ | 6.797.447 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 1 | 4 | 10 | 0 | 6.725.465 ₺ | 16.038 ₺ | 2.250 ₺ | 53.690 ₺ | 6.797.444 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 6 | 0 | 3 | 30 | 0 | 4.116.483 ₺ | 27.069 ₺ | 0 ₺ | 23.800 ₺ | 4.167.352 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 1 | 3 | 30 | 0 | 4.115.378 ₺ | 27.069 ₺ | 1.000 ₺ | 23.800 ₺ | 4.167.248 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 0 | 1 | 2 | 0 | 1.037.601 ₺ | 12.836 ₺ | 0 ₺ | 7.980 ₺ | 1.058.417 ₺ |
| gec_ciftci | 60 | sn_m_ova_tasra | 6 | 0 | 3 | 13 | 0 | 1.202.505 ₺ | 51.667 ₺ | 0 ₺ | 26.810 ₺ | 1.280.982 ₺ |
| gec_sanayici | 60 | sn_m_dag_merkez | 8 | 2 | 4 | 10 | 0 | 1.803.643 ₺ | 25.230 ₺ | 2.000 ₺ | 53.690 ₺ | 1.884.562 ₺ |
| gec_pazar | 60 | sn_m_sehir_merkez | 6 | 3 | 3 | 9 | 0 | 1.283.350 ₺ | 61.649 ₺ | 0 ₺ | 23.800 ₺ | 1.368.798 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-gec60-temel)

Karşılaştırılan koşu: `parsel-v1-gec60-temel.json` (10 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %384,7 | %372,8 | %56,4 | %52,6 |
| pazar | %171 | %209,9 | %29,8 | %29,4 |
| sanayici | %218,3 | %218,3 | %27,7 | %27,7 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| H6 açılış koşulu (ayak izine yeter ve 14 günde yapı) | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %0 | %0 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `2350641fbaccef60` |
| 2 | `d8fa3f31651c894f` |
| 3 | `b44dd85fbb245267` |
| 4 | `c507471995fd7bc3` |
| 5 | `ce1292e5921d8483` |
| 6 | `222a7114879b70af` |
| 7 | `d4ae67a22a2f1871` |
| 8 | `14f9182020365552` |
| 9 | `4a6a9936baca784b` |
| 10 | `13a888c3e7d77aef` |

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

