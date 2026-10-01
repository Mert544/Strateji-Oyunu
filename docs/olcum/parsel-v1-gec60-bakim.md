# Parsel dünyası ölçümü — v1-gec60-bakim

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-gec60-bakim |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3, 4, 5, 6, 7, 8, 9, 10 |
| Süre | 74 sim günü (geç katılım 60. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | mini-6 |
| Tarım yönetimi | kapalı |
| Bakım yönetimi | AÇIK (parça ithalatı + aşınma eşiğinde genel onarım; pasif ve spekülatör hariç) |
| Ağır koşu | EVET (H6 tanımındaki gerçek 60. gün katılımı) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor | hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez |
| H6 ikinci koşul: açılış koşulu (docs/12 §13) | GEÇTİ · (i) taban hücre ayak izine yeter %100 (yurt dahil: %100) · (ii, bilgi) 14 günde açılış yapısı %100 — insan testi gerekli | TÜM olgular (i)'yi sağlamalı; (ii) karara girmez | ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir |
| H6 Y7 emsal düzeyi | il yedeğiyle ölçülen olgu %0 | (bilgi) | önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %0 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%6'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 eski tanım (ucuz hücre payı ≥ %20) | %90,2 (eski oyuncuya açık: %73,8) | (karara girmez; eski eşik: < %20) | yalnız bilgi; ayrılmış hücre uygun hücrelerin ~%19'u olduğundan eşik yapısal olarak tutmuyordu |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %16,4 · ilçe payı %24,1 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

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
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 199.870 ₺ | 155.323 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.172 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 307.607 ₺ | 544.681 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.214.511 ₺ | 3.778.446 ₺ | %32,1 | %30,6 | %7 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.739 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.080.666 ₺ | 6.033.358 ₺ | %17,9 | %16,7 | %7,9 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 298.357 ₺ | 208.481 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.186 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 337.816 ₺ | 585.045 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.131.740 ₺ | 3.730.722 ₺ | %30,3 | %28,7 | %7,6 | hayır |
| gec_sanayici | 1.552.833 ₺ | 6.137.748 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.099.389 ₺ | 6.062.820 ₺ | %18,1 | %17 | %7,8 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 514.605 ₺ | 326.694 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.292 ₺ | 267.171 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 387.069 ₺ | 638.481 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.185.991 ₺ | 3.765.338 ₺ | %31,5 | %29,9 | %7,2 | hayır |
| gec_sanayici | 1.552.827 ₺ | 6.137.739 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.137.640 ₺ | 6.106.505 ₺ | %18,6 | %17,5 | %7,5 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 4

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 748.159 ₺ | 459.037 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 266.304 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 446.141 ₺ | 692.235 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.383.496 ₺ | 3.862.177 ₺ | %35,8 | %34,4 | %6,2 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.380 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.213.196 ₺ | 6.161.783 ₺ | %19,7 | %18,6 | %7,1 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 5

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 900.866 ₺ | 550.569 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.291 ₺ | 267.169 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 480.031 ₺ | 719.288 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.746.679 ₺ | 4.108.186 ₺ | %42,5 | %41,3 | %4,9 | hayır |
| gec_sanayici | 1.552.825 ₺ | 6.137.732 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.294.160 ₺ | 6.218.789 ₺ | %20,8 | %19,7 | %6,6 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 6

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 944.398 ₺ | 578.509 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.291 ₺ | 267.344 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 450.948 ₺ | 692.280 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.944.936 ₺ | 4.232.058 ₺ | %46 | %44,8 | %4,4 | hayır |
| gec_sanayici | 1.552.827 ₺ | 6.137.804 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.319.086 ₺ | 6.228.351 ₺ | %21,2 | %20,1 | %6,5 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 7

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 911.236 ₺ | 557.204 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.171 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 378.773 ₺ | 620.833 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.145.473 ₺ | 4.387.756 ₺ | %48,9 | %47,9 | %4 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.740 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.298.848 ₺ | 6.238.418 ₺ | %20,8 | %19,7 | %6,6 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 8

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 937.840 ₺ | 504.905 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.292 ₺ | 267.177 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 312.556 ₺ | 548.731 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.191.457 ₺ | 4.375.569 ₺ | %50,1 | %49,1 | %3,9 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.743 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.265.690 ₺ | 6.209.908 ₺ | %20,4 | %19,3 | %6,8 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 9

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 843.209 ₺ | 452.203 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.171 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 297.634 ₺ | 530.047 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.084.322 ₺ | 4.308.947 ₺ | %48,4 | %47,3 | %4,1 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.740 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.217.811 ₺ | 6.156.144 ₺ | %19,8 | %18,7 | %7 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 10

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 2 | 3 / 3 | ilçe | 677.279 ₺ | 380.575 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | sn_m_dag | 1 / 1 | 2 / 2 | ilçe | 957.293 ₺ | 267.171 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | sn_m_sehir | 2 / 2 | 3 / 3 | ilçe | 312.716 ₺ | 552.116 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_merkez | 10 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_sehir_merkez | 4 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 12, acilisa uygun 6, taban hucre ayak izine yeten 6; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.918.347 ₺ | 4.192.523 ₺ | %45,8 | %44,6 | %4,5 | hayır |
| gec_sanayici | 1.552.829 ₺ | 6.137.740 ₺ | %25,3 | %24,2 | %5,5 | hayır |
| gec_pazar | 1.129.157 ₺ | 6.068.983 ₺ | %18,6 | %17,4 | %7,6 | hayır |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %90,2 (526/583); bunun 96 hücresi ayrılmış (yalnız yeni oyuncu), 430 hücresi genel (%73,8). Satılmamış ayrılmış hücre: 96. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

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
| 1 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 1 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 2 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 3 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 4 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 4 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 5 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 5 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 6 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 6 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 7 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 7 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 8 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 8 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 9 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 9 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |
| 10 | geç katılımdan hemen önce | 110 | 14 | 96 | %87,3 | 0 | tuttu |
| 10 | koşu sonu | 110 | 19 | 91 | %82,7 | 0 | tuttu |

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
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 2 | 3 | 23 | 0 | 6.442.795 ₺ | 26.808 ₺ | 2.000 ₺ | 26.810 ₺ | 6.498.414 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 3 | 3 | 23 | 0 | 6.443.436 ₺ | 26.808 ₺ | 1.421 ₺ | 26.810 ₺ | 6.498.476 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 6 | 3 | 3 | 23 | 0 | 7.722.605 ₺ | 26.809 ₺ | 0 ₺ | 26.810 ₺ | 7.776.223 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 1 | 4 | 28 | 0 | 5.932.338 ₺ | 149.501 ₺ | 2.211 ₺ | 53.690 ₺ | 6.137.739 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 1 | 4 | 28 | 0 | 5.925.524 ₺ | 151.245 ₺ | 2.250 ₺ | 53.690 ₺ | 6.132.709 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 7 | 1 | 3 | 21 | 0 | 4.244.131 ₺ | 21.157 ₺ | 1.414 ₺ | 23.800 ₺ | 4.290.502 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 2 | 3 | 21 | 0 | 4.244.035 ₺ | 21.157 ₺ | 1.500 ₺ | 23.800 ₺ | 4.290.493 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 1 | 2 | 0 | 1.037.601 ₺ | 12.836 ₺ | 0 ₺ | 7.980 ₺ | 1.058.417 ₺ |
| gec_ciftci | 60 | sn_m_ova_tasra | 6 | 0 | 3 | 11 | 0 | 1.151.864 ₺ | 35.837 ₺ | 0 ₺ | 26.810 ₺ | 1.214.511 ₺ |
| gec_sanayici | 60 | sn_m_dag_merkez | 8 | 3 | 4 | 16 | 0 | 1.416.004 ₺ | 81.135 ₺ | 2.000 ₺ | 53.690 ₺ | 1.552.829 ₺ |
| gec_pazar | 60 | sn_m_sehir_merkez | 7 | 2 | 3 | 11 | 0 | 1.003.004 ₺ | 52.071 ₺ | 1.792 ₺ | 23.800 ₺ | 1.080.666 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-gec60-temel)

Karşılaştırılan koşu: `parsel-v1-gec60-temel.json` (10 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %384,7 | %163,3 | %56,4 | %41,1 |
| pazar | %171 | %60,2 | %29,8 | %19,6 |
| sanayici | %218,3 | %358,4 | %27,7 | %25,3 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| H6 açılış koşulu (ayak izine yeter ve 14 günde yapı) | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %0 | %0 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `698c8a56d237830e` |
| 2 | `7a99434873837e5c` |
| 3 | `e809a59005dfbdd7` |
| 4 | `fd25a9171ac7bfc3` |
| 5 | `347c037368ad2dfe` |
| 6 | `36339aea003c2a5e` |
| 7 | `be1c6f81d93b06fb` |
| 8 | `be7223c5e6bf23d6` |
| 9 | `0754db6dec6fe787` |
| 10 | `8fff83a8c02310a2` |

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

