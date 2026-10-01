# Parsel dünyası ölçümü — v1-spekulator

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-spekulator |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3 |
| Süre | 30 sim günü (geç katılım 20. gün, ölçüm katılımdan 10 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif, 3 spekulator, 3 spekulatorYasli yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | mini-6 |
| Tarım yönetimi | kapalı |
| Bakım yönetimi | kapalı |
| Yaşlı spekülatör | 15. günden itibaren arsa alır (ayrılmış hücre süresi sonrası) |
| Ağır koşu | hayır (varsayılan; H6'nın 60. gün katılımı için `--agir`) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor | hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez |
| H6 ikinci koşul: açılış koşulu (docs/12 §13) | GEÇTİ · (i) taban hücre ayak izine yeter %100 (yurt dahil: %100) · (ii, bilgi) 14 günde açılış yapısı %100 — insan testi gerekli | TÜM olgular (i)'yi sağlamalı; (ii) karara girmez | ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir |
| H6 Y7 emsal düzeyi | il yedeğiyle ölçülen olgu %0 | (bilgi) | önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %100 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,3'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 eski tanım (ucuz hücre payı ≥ %20) | %14,2 (eski oyuncuya açık: %0) | (karara girmez; eski eşik: < %20) | yalnız bilgi; ayrılmış hücre uygun hücrelerin ~%19'u olduğundan eşik yapısal olarak tutmuyordu |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %47,1 · ilçe payı %25 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

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
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 5 | 3 / 8 | ilçe | 1.309.649 ₺ | 464.073 ₺ | evet |
| gec_sanayici | sn_m_dag_tasra | sn_m_dag | 1 / 5 | 2 / 7 | ilçe | 1.124.664 ₺ | 820.399 ₺ | evet |
| gec_pazar | sn_m_ova_tasra | sn_m_ova | 2 / 5 | 3 / 8 | ilçe | 992.392 ₺ | 464.073 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 9, acilisa uygun 4, taban hucre ayak izine yeten 4; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_tasra | 8 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 9, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 8, acilisa uygun 3, taban hucre ayak izine yeten 3; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.034.322 ₺ | 83.953 ₺ | %2423,2 | — | %4,2 | evet |
| gec_sanayici | 1.660.886 ₺ | 83.944 ₺ | %1978,6 | — | %5,2 | evet |
| gec_pazar | 1.539.966 ₺ | 83.953 ₺ | %1834,3 | — | %5,6 | evet |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %14,2 (83/583); bunun 83 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 83. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 5 | 3 / 8 | ilçe | 1.208.515 ₺ | 396.423 ₺ | evet |
| gec_sanayici | sn_m_dag_tasra | sn_m_dag | 1 / 5 | 2 / 7 | ilçe | 1.124.666 ₺ | 820.400 ₺ | evet |
| gec_pazar | sn_m_ova_tasra | sn_m_ova | 2 / 5 | 3 / 8 | ilçe | 853.636 ₺ | 396.423 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 9, acilisa uygun 4, taban hucre ayak izine yeten 4; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_tasra | 8 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 9, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 8, acilisa uygun 3, taban hucre ayak izine yeten 3; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.933.189 ₺ | 83.952 ₺ | %2302,7 | — | %4,4 | evet |
| gec_sanayici | 1.660.731 ₺ | 83.943 ₺ | %1978,4 | — | %5,2 | evet |
| gec_pazar | 1.401.209 ₺ | 83.952 ₺ | %1669,1 | — | %6,1 | evet |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %14,2 (83/583); bunun 83 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 83. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | sn_m_ova | 2 / 5 | 3 / 8 | ilçe | 1.018.635 ₺ | 325.659 ₺ | evet |
| gec_sanayici | sn_m_dag_tasra | sn_m_dag | 1 / 5 | 2 / 7 | ilçe | 1.124.665 ₺ | 820.400 ₺ | evet |
| gec_pazar | sn_m_ova_tasra | sn_m_ova | 2 / 5 | 3 / 8 | ilçe | 642.104 ₺ | 325.659 ₺ | evet |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 9, acilisa uygun 4, taban hucre ayak izine yeten 4; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_m_dag_tasra | 8 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 9, acilisa uygun 2, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_m_ova_tasra | 7 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 8, acilisa uygun 3, taban hucre ayak izine yeten 3; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.743.308 ₺ | 83.953 ₺ | %2076,5 | — | %4,9 | evet |
| gec_sanayici | 1.660.887 ₺ | 83.944 ₺ | %1978,6 | — | %5,2 | evet |
| gec_pazar | 1.189.676 ₺ | 83.953 ₺ | %1417,1 | — | %7,2 | evet |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %14,2 (83/583); bunun 83 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 83. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (3/3; emsal düzeyi: 3 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %47,1 | %48,6 | %47,1 | %25 (spekulator_yasli_2, 12 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %47,1 | %48,6 | %47,1 | %25 (spekulator_yasli_2, 12 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %47,1 | %48,6 | %47,1 | %25 (spekulator_yasli_2, 12 hücre) | 0 | yok (ölçülemez) |

Not: spekülatör botları (arsa biriktirir, üretmez) koşuda; Gini ve ilçe payı onların tavanlara (72 hücre / ilçenin %25'i) dayanmasıyla ölçülür. En büyük ilçe payı %25'e tam dayanabilir ama aşamaz (tavan çekirdekte); eşik "> %25" olduğundan tam %25 geçer.

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 110 | 27 | 83 | %75,5 | 0 | tuttu |
| 1 | koşu sonu | 110 | 37 | 73 | %66,4 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 110 | 27 | 83 | %75,5 | 0 | tuttu |
| 2 | koşu sonu | 110 | 37 | 73 | %66,4 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 110 | 27 | 83 | %75,5 | 0 | tuttu |
| 3 | koşu sonu | 110 | 37 | 73 | %66,4 | 0 | tuttu |

Okuma: İHLAL = 0 ise çekirdek kuralı (eski oyuncuya satmama) tutuyor. Kalan pay düşükse ayrılmış hücreler **önceki yeni oyuncular** (ör. ilk 14 günde alım yapan spekülatörler) tarafından tüketilmiş demektir: kural eski oyuncudan korur, aynı dönemdeki yeni oyuncudan korumaz.

## 4. Y ölçütleri (Y1–Y10)

**Botlar eğlenceyi ölçmez** (docs/00 R5): *insan testi* işaretli ölçütlerde aşağıdaki bot sayıları yalnız **gözlemdir**, hedef denetimi sayılmaz. Çekirdek durumundan türetilemeyenler **ölçülemez** işaretiyle gösterilir.

| # | Ölçüt | Hedef | Kaynak | Bu koşuda |
|---|---|---|---|---|
| Y1 | İlk yapı ≤ 10 dk | ≥ %75 | **insan testi** | bot gözlemi: ≤ 10 dk %64,7 (botlar katılımda anında kurar) — Komut günlüğünden (katılım → ilk kabul edilen yapı komutu). Bot katılımda anında kurar: anlamlı değil, insan testi şart. |
| Y2 | İlk saatte ilk satış | ≥ %70 (60 dk), ≥ %50 (10 dk) | **insan testi** | bot gözlemi: ≤ 60 dk %82,4, ≤ 10 dk %0 — Emir gerçekleşmesinden (gözlem ızgarası çözünürlüğüyle; +10 dk ve +60 dk ek gözlemleriyle eşikler tam). |
| Y3 | İlk sözleşme ≤ 24 sa | ≥ %50 | **insan testi** | ölçülemez (sözleşme komutu yok) — OLÇÜLEMEZ: çekirdekte sözleşme/sipariş komutu (siparis_teslim; A6) yok. |
| Y4 | D1 / D7 geri dönüş | D1 ≥ %35; D7 ≥ %15 (gözlem) | **insan testi** | ölçülemez — OLÇÜLEMEZ: oturum telemetrisi gerekir (sunucu; R-Ü16); çekirdek durumunda yok. |
| Y5 | Açılış çeşitliliği | hiçbir katman > %60 | bot + insan (karma) | en büyük katman %40; hibrit portföy %60 — İlk 24 saatte ikinci yapının katmanı; hibrit portföy oranı. |
| Y6 | Yön değiştirme maliyetsizliği | ≥ %10 yön değiştirir; D7 farkı ≥ −5 puan | **insan testi** | bot gözlemi: yön değiştiren %0 (botlar bırakmaz/iptal etmez); D7 farkı ölçülemez — Yalnız oran (parsel_birak / insaat_iptal, ilk 7 gün) türetilir; D7 farkı oturum verisi ister (ölçülemez). |
| Y7 | 14. gün net üretim geliri | oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde | bot + insan (karma) | GEÇTİ · %100 oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2) — H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı); emsal yalnız üreten (geliri > 0) yerleşikler. |
| Y8 | Defter etkileşimi | Atla ≤ %30 | **insan testi** | ölçülemez — OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi. |
| Y9 | Rehberlik (Alfa-1) | ≥ %20; Rehberli D7 ≥ +5 puan | **insan testi** | ölçülemez — OLÇÜLEMEZ: Rehberlik (A16) yok. |
| Y10 | Takılma | ≤ 1 / oyuncu | **insan testi** | ölçülemez — OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız. |

## 5. Oyuncu özeti (tohum 1)

| Grup | Oyuncu | Ort. hücre | En çok hücre | Ort. ham servet | Ort. komut | Reddedilen |
|---|---|---|---|---|---|---|
| ciftci | 3 | 7 | 8 | 3.502.449 ₺ | 7 | 0 |
| sanayici | 2 | 8 | 8 | 4.522.593 ₺ | 10 | 0 |
| tuccar | 2 | 6 | 7 | 1.457.811 ₺ | 5 | 0 |
| pasif | 1 | 6 | 6 | 672.790 ₺ | 2 | 0 |
| spekulator | 3 | 62 | 64 | 83.492 ₺ | 12 | 0 |
| spekulator_yasli | 3 | 46 | 47 | 82.828 ₺ | 7 | 0 |
| gec_ciftci | 1 | 7 | 7 | 2.034.322 ₺ | 7 | 0 |
| gec_sanayici | 1 | 8 | 8 | 1.660.886 ₺ | 10 | 0 |
| gec_pazar | 1 | 6 | 6 | 1.539.966 ₺ | 7 | 0 |

| Oyuncu | Katılım (gün) | İlçe | Hücre | Ayrılmış | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 2 | 3 | 7 | 0 | 3.335.126 ₺ | 5.568 ₺ | 2.000 ₺ | 26.810 ₺ | 3.369.504 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 3 | 3 | 7 | 0 | 3.335.730 ₺ | 5.568 ₺ | 1.421 ₺ | 26.810 ₺ | 3.369.529 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 6 | 3 | 3 | 7 | 0 | 3.735.936 ₺ | 5.568 ₺ | 0 ₺ | 26.810 ₺ | 3.768.314 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 1 | 4 | 10 | 0 | 4.444.354 ₺ | 21.844 ₺ | 2.702 ₺ | 53.690 ₺ | 4.522.590 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 1 | 4 | 10 | 0 | 4.444.520 ₺ | 21.844 ₺ | 2.542 ₺ | 53.690 ₺ | 4.522.596 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 6 | 1 | 2 | 3 | 0 | 672.811 ₺ | 17.802 ₺ | 0 ₺ | 12.950 ₺ | 703.563 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 2 | 3 | 7 | 0 | 2.179.514 ₺ | 7.245 ₺ | 1.500 ₺ | 23.800 ₺ | 2.212.059 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 1 | 2 | 0 | 646.167 ₺ | 18.642 ₺ | 0 ₺ | 7.980 ₺ | 672.790 ₺ |
| spekulator_1 | 0 | sn_m_gecit_merkez | 64 | 1 | 0 | 14 | 0 | 0 ₺ | 1 ₺ | 83.952 ₺ | 0 ₺ | 83.953 ₺ |
| spekulator_2 | 0 | sn_m_gecit_merkez | 63 | 7 | 0 | 12 | 0 | 0 ₺ | 1 ₺ | 82.578 ₺ | 0 ₺ | 82.579 ₺ |
| spekulator_3 | 0 | sn_m_ova_merkez | 59 | 3 | 0 | 12 | 0 | 0 ₺ | 1 ₺ | 83.943 ₺ | 0 ₺ | 83.944 ₺ |
| spekulator_yasli_1 | 0 | sn_m_col_tasra | 47 | 0 | 0 | 7 | 0 | 312 ₺ | 1 ₺ | 82.255 ₺ | 0 ₺ | 82.568 ₺ |
| spekulator_yasli_2 | 0 | sn_m_col_merkez | 47 | 1 | 0 | 7 | 0 | 0 ₺ | 1 ₺ | 82.812 ₺ | 0 ₺ | 82.813 ₺ |
| spekulator_yasli_3 | 0 | sn_m_dag_merkez | 46 | 1 | 0 | 8 | 0 | 0 ₺ | 1 ₺ | 83.103 ₺ | 0 ₺ | 83.104 ₺ |
| gec_ciftci | 20 | sn_m_ova_tasra | 7 | 3 | 3 | 7 | 0 | 2.000.656 ₺ | 5.856 ₺ | 1.000 ₺ | 26.810 ₺ | 2.034.322 ₺ |
| gec_sanayici | 20 | sn_m_dag_tasra | 8 | 6 | 4 | 10 | 0 | 1.578.962 ₺ | 26.234 ₺ | 2.000 ₺ | 53.690 ₺ | 1.660.886 ₺ |

(Yalnız ilk 16 oyuncu gösterilir; toplam 17.)
Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 10 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-spekulator-temel)

Karşılaştırılan koşu: `parsel-v1-spekulator-temel.json` (3 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %305,3 | %300 | %93,7 | %2267,5 |
| pazar | %147,7 | %208,8 | %38,3 | %1640,2 |
| sanayici | %137,3 | %137,1 | %38 | %1978,5 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| H6 açılış koşulu (ayak izine yeter ve 14 günde yapı) | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %0 | %100 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `e21f224c9bbae2fb` |
| 2 | `ebc1decb87ca199e` |
| 3 | `c939e663aeb85dbc` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | GEÇTİ (birincil Y7 %100); ikincil servet KALDI (ulaşan %100) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %47,1 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

