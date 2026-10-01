# Parsel dünyası ölçümü — v1-ayristirma-b

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-ayristirma-b |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3 |
| Süre | 24 sim günü (geç katılım 10. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 100 ciftci, 50 sanayici, 50 tuccar, 30 pasif, 40 spekulator, 40 spekulatorYasli yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | sentetik-50 |
| Tarım yönetimi | kapalı |
| Bakım yönetimi | kapalı |
| BOT TOHUMU (varyans) | 7 (bot katılım/karar sırası karışık, tam eşit seçimler tohumlu; koşu tohumuyla birleşir) |
| AYRIŞTIRMA: P3b çok hesap kuralları | **KAPALI** (koşucu seçeneği: ayrılmış hücre her ilçede satılır, günlük ilçe tavanı yok; hesap başına 12 ve ilk 14 gün kuralı sürer; parametreler.json değişmedi) |
| Yaşlı spekülatör | 15. günden itibaren arsa alır (ayrılmış hücre süresi sonrası) |
| Ağır koşu | hayır (varsayılan; H6'nın 60. gün katılımı için `--agir`) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı | BELİRSİZ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor | hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez |
| H6 ikinci koşul: açılış koşulu (docs/12 §13) | GEÇTİ · (i) taban hücre ayak izine yeter %100 (yurt dahil: %100) · (ii, bilgi) 14 günde açılış yapısı %100 — insan testi gerekli | TÜM olgular (i)'yi sağlamalı; (ii) karara girmez | ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir |
| H6 Y7 emsal düzeyi | il yedeğiyle ölçülen olgu %0 | (bilgi) | önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %77,8 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%27,9'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 eski tanım (ucuz hücre payı ≥ %20) | %5,1 (eski oyuncuya açık: %0) | (karara girmez; eski eşik: < %20) | yalnız bilgi; ayrılmış hücre uygun hücrelerin ~%19'u olduğundan eşik yapısal olarak tutmuyordu |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %46 · ilçe payı %25 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

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
| gec_ciftci | sn_kuru_tepe_merkez | sn_kuru_tepe | 0 / 7 | 0 / 15 | — | 866.138 ₺ | — | ölçülemez |
| gec_sanayici | sn_gri_tepe_tasra | sn_gri_tepe | 0 / 9 | 0 / 17 | — | 0 ₺ | — | ölçülemez |
| gec_pazar | sn_golge_tepe_merkez | sn_golge_tepe | 0 / 6 | 0 / 14 | — | 534.635 ₺ | — | ölçülemez |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_kuru_tepe_merkez | 8 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 18, acilisa uygun 4, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_gri_tepe_tasra | 6 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 19, acilisa uygun 5, taban hucre ayak izine yeten 3; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_golge_tepe_merkez | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 17, acilisa uygun 3, taban hucre ayak izine yeten 1; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.129.957 ₺ | 82.840 ₺ | %1364 | — | %7,6 | evet |
| gec_sanayici | 79.239 ₺ | 82.711 ₺ | %95,8 | — | %100 | hayır |
| gec_pazar | 729.433 ₺ | 82.770 ₺ | %881,3 | — | %11,7 | evet |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %5,4 (255/4728); bunun 255 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 255. **H6 kararı (Y7 + açılış koşulu): BELİRSİZ** · Y7 ölçülemez: uretim yapan (geliri > 0) ilce ya da il emsali yok · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_golge_tepe_tasra | sn_golge_tepe | 0 / 7 | 0 / 17 | — | 1.271.649 ₺ | — | ölçülemez |
| gec_sanayici | sn_kizil_kaya_merkez | sn_kizil_kaya | 0 / 12 | 0 / 19 | — | 0 ₺ | — | ölçülemez |
| gec_pazar | sn_gri_tepe_merkez | sn_gri_tepe | 0 / 7 | 0 / 14 | — | 726.723 ₺ | — | ölçülemez |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_golge_tepe_tasra | 6 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 19, acilisa uygun 5, taban hucre ayak izine yeten 4; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_kizil_kaya_merkez | 3 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 20, acilisa uygun 6, taban hucre ayak izine yeten 5; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_gri_tepe_merkez | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 18, acilisa uygun 4, taban hucre ayak izine yeten 3; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.833.355 ₺ | 81.519 ₺ | %2249 | — | %4,7 | evet |
| gec_sanayici | 79.239 ₺ | 82.757 ₺ | %95,7 | — | %100 | hayır |
| gec_pazar | 1.086.959 ₺ | 81.670 ₺ | %1330,9 | — | %7,9 | evet |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %5,1 (241/4728); bunun 241 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 241. **H6 kararı (Y7 + açılış koşulu): BELİRSİZ** · Y7 ölçülemez: uretim yapan (geliri > 0) ilce ya da il emsali yok · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_kizil_kaya_merkez | sn_kizil_kaya | 0 / 8 | 0 / 14 | — | 1.030.582 ₺ | — | ölçülemez |
| gec_sanayici | sn_yalin_zirve_merkez | sn_yalin_zirve | 3 / 8 | 6 / 15 | ilçe | 549.982 ₺ | 809.668 ₺ | evet |
| gec_pazar | sn_golge_tepe_merkez | sn_golge_tepe | 0 / 7 | 0 / 14 | — | 640.564 ₺ | — | ölçülemez |

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + 6 yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|
| gec_ciftci | sn_kizil_kaya_merkez | 3 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 21, acilisa uygun 5, taban hucre ayak izine yeten 3; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_sanayici | sn_yalin_zirve_merkez | 3 | 3 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 22, acilisa uygun 6, taban hucre ayak izine yeten 4; once taban hucre, il tercihi, emsal, doluluk sirasiyla |
| gec_pazar | sn_golge_tepe_merkez | 10 | 2 | evet | evet | 0.00 gün | evet | geçti | yurt verebilen 20, acilisa uygun 4, taban hucre ayak izine yeten 2; once taban hucre, il tercihi, emsal, doluluk sirasiyla |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.809.551 ₺ | 82.565 ₺ | %2191,7 | — | %4,7 | evet |
| gec_sanayici | 1.229.391 ₺ | 83.623 ₺ | %1470,2 | — | %7 | evet |
| gec_pazar | 1.151.879 ₺ | 82.561 ₺ | %1395,2 | — | %7,4 | evet |

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %4,9 (230/4728); bunun 230 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 230. **H6 kararı (Y7 + açılış koşulu): GEÇTİ** · Y7 %100 (1/1; emsal düzeyi: 1 ilçe, 0 il yedeği) · açılış koşulu 3/3 olgu (i)'yi sağladı; (ii) bilgi: 3/3 olguda 14 günde açılış yapısı (insan testi gerekli). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %46,2 | %45,9 | %46,2 | %25 (tuccar_12, 7 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %46,2 | %46 | %46,2 | %25 (ciftci_73, 7 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %45,7 | %46 | %45,7 | %25 (tuccar_41, 7 hücre) | 0 | yok (ölçülemez) |

Not: spekülatör botları (arsa biriktirir, üretmez) koşuda; Gini ve ilçe payı onların tavanlara (72 hücre / ilçenin %25'i) dayanmasıyla ölçülür. En büyük ilçe payı %25'e tam dayanabilir ama aşamaz (tavan çekirdekte); eşik "> %25" olduğundan tam %25 geçer.

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 897 | 642 | 255 | %28,4 | 0 | tuttu |
| 1 | koşu sonu | 897 | 657 | 240 | %26,8 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 897 | 656 | 241 | %26,9 | 0 | tuttu |
| 2 | koşu sonu | 897 | 662 | 235 | %26,2 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 897 | 667 | 230 | %25,6 | 0 | tuttu |
| 3 | koşu sonu | 897 | 673 | 224 | %25 | 0 | tuttu |

Okuma: İHLAL = 0 ise çekirdek kuralı (eski oyuncuya satmama) tutuyor. Kalan pay düşükse ayrılmış hücreler **önceki yeni oyuncular** (ör. ilk 14 günde alım yapan spekülatörler) tarafından tüketilmiş demektir: kural eski oyuncudan korur, aynı dönemdeki yeni oyuncudan korumaz.

## 4. Y ölçütleri (Y1–Y10)

**Botlar eğlenceyi ölçmez** (docs/00 R5): *insan testi* işaretli ölçütlerde aşağıdaki bot sayıları yalnız **gözlemdir**, hedef denetimi sayılmaz. Çekirdek durumundan türetilemeyenler **ölçülemez** işaretiyle gösterilir.

| # | Ölçüt | Hedef | Kaynak | Bu koşuda |
|---|---|---|---|---|
| Y1 | İlk yapı ≤ 10 dk | ≥ %75 | **insan testi** | bot gözlemi: ≤ 10 dk %62,6 (botlar katılımda anında kurar) — Komut günlüğünden (katılım → ilk kabul edilen yapı komutu). Bot katılımda anında kurar: anlamlı değil, insan testi şart. |
| Y2 | İlk saatte ilk satış | ≥ %70 (60 dk), ≥ %50 (10 dk) | **insan testi** | bot gözlemi: ≤ 60 dk %68,8, ≤ 10 dk %0 — Emir gerçekleşmesinden (gözlem ızgarası çözünürlüğüyle; +10 dk ve +60 dk ek gözlemleriyle eşikler tam). |
| Y3 | İlk sözleşme ≤ 24 sa | ≥ %50 | **insan testi** | ölçülemez (sözleşme komutu yok) — OLÇÜLEMEZ: çekirdekte sözleşme/sipariş komutu (siparis_teslim; A6) yok. |
| Y4 | D1 / D7 geri dönüş | D1 ≥ %35; D7 ≥ %15 (gözlem) | **insan testi** | ölçülemez — OLÇÜLEMEZ: oturum telemetrisi gerekir (sunucu; R-Ü16); çekirdek durumunda yok. |
| Y5 | Açılış çeşitliliği | hiçbir katman > %60 | bot + insan (karma) | en büyük katman %46,6; hibrit portföy %57,3 — İlk 24 saatte ikinci yapının katmanı; hibrit portföy oranı. |
| Y6 | Yön değiştirme maliyetsizliği | ≥ %10 yön değiştirir; D7 farkı ≥ −5 puan | **insan testi** | bot gözlemi: yön değiştiren %0 (botlar bırakmaz/iptal etmez); D7 farkı ölçülemez — Yalnız oran (parsel_birak / insaat_iptal, ilk 7 gün) türetilir; D7 farkı oturum verisi ister (ölçülemez). |
| Y7 | 14. gün net üretim geliri | oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde | bot + insan (karma) | BELİRSİZ · %100 oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2) — H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı); emsal yalnız üreten (geliri > 0) yerleşikler. |
| Y8 | Defter etkileşimi | Atla ≤ %30 | **insan testi** | ölçülemez — OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi. |
| Y9 | Rehberlik (Alfa-1) | ≥ %20; Rehberli D7 ≥ +5 puan | **insan testi** | ölçülemez — OLÇÜLEMEZ: Rehberlik (A16) yok. |
| Y10 | Takılma | ≤ 1 / oyuncu | **insan testi** | ölçülemez — OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız. |

## 5. Oyuncu özeti (tohum 1)

| Grup | Oyuncu | Ort. hücre | En çok hücre | Ort. ham servet | Ort. komut | Reddedilen |
|---|---|---|---|---|---|---|
| ciftci | 100 | 6 | 8 | 1.929.447 ₺ | 4 | 0 |
| sanayici | 50 | 7 | 9 | 2.346.034 ₺ | 7 | 0 |
| tuccar | 50 | 6 | 8 | 1.175.965 ₺ | 5 | 0 |
| pasif | 30 | 6 | 6 | 483.246 ₺ | 1 | 0 |
| spekulator | 40 | 53 | 56 | 82.552 ₺ | 11 | 0 |
| spekulator_yasli | 40 | 19 | 26 | 83.341 ₺ | 5 | 0 |
| gec_ciftci | 1 | 9 | 9 | 1.129.957 ₺ | 4 | 0 |
| gec_sanayici | 1 | 6 | 6 | 79.239 ₺ | 2 | 0 |
| gec_pazar | 1 | 6 | 6 | 729.433 ₺ | 4 | 0 |

| Oyuncu | Katılım (gün) | İlçe | Hücre | Ayrılmış | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_vaha_kenti_tasra | 8 | 2 | 3 | 7 | 0 | 2.303.164 ₺ | 5.655 ₺ | 2.000 ₺ | 26.810 ₺ | 2.337.628 ₺ |
| ciftci_2 | 0 | sn_celik_limani_merkez | 6 | 0 | 0 | 0 | 0 | 50.000 ₺ | 29.523 ₺ | 0 ₺ | 0 ₺ | 79.523 ₺ |
| ciftci_3 | 0 | sn_kopuk_limani_merkez | 6 | 0 | 0 | 0 | 0 | 50.000 ₺ | 29.523 ₺ | 0 ₺ | 0 ₺ | 79.523 ₺ |
| ciftci_4 | 0 | sn_orta_col_tasra | 6 | 0 | 0 | 0 | 0 | 50.000 ₺ | 29.523 ₺ | 0 ₺ | 0 ₺ | 79.523 ₺ |
| ciftci_5 | 0 | sn_tas_ova_tasra | 8 | 0 | 3 | 7 | 0 | 2.665.658 ₺ | 5.655 ₺ | 5.053 ₺ | 26.810 ₺ | 2.703.176 ₺ |
| ciftci_6 | 0 | sn_vaha_kenti_merkez | 6 | 0 | 3 | 7 | 0 | 2.305.232 ₺ | 5.655 ₺ | 0 ₺ | 26.810 ₺ | 2.337.696 ₺ |
| ciftci_7 | 0 | sn_bereket_dizi_merkez | 6 | 2 | 3 | 7 | 0 | 3.003.640 ₺ | 5.656 ₺ | 0 ₺ | 26.810 ₺ | 3.036.105 ₺ |
| ciftci_8 | 0 | sn_yesil_vadi_merkez | 7 | 4 | 3 | 7 | 0 | 2.669.848 ₺ | 5.655 ₺ | 1.000 ₺ | 26.810 ₺ | 2.703.313 ₺ |
| ciftci_9 | 0 | sn_orta_ova_tasra | 8 | 2 | 3 | 7 | 0 | 2.998.224 ₺ | 5.656 ₺ | 2.000 ₺ | 26.810 ₺ | 3.032.690 ₺ |
| ciftci_10 | 0 | sn_gun_batimi_tasra | 6 | 0 | 2 | 5 | 0 | 1.737.953 ₺ | 8.175 ₺ | 0 ₺ | 18.830 ₺ | 1.764.959 ₺ |
| ciftci_11 | 0 | sn_orta_ova_merkez | 7 | 1 | 3 | 7 | 0 | 2.999.258 ₺ | 5.656 ₺ | 1.000 ₺ | 26.810 ₺ | 3.032.724 ₺ |
| ciftci_12 | 0 | sn_vaha_kenti_tasra | 7 | 1 | 3 | 7 | 0 | 2.304.198 ₺ | 5.655 ₺ | 1.000 ₺ | 26.810 ₺ | 2.337.663 ₺ |
| ciftci_13 | 0 | sn_ak_ova_merkez | 7 | 2 | 3 | 7 | 0 | 3.001.087 ₺ | 5.656 ₺ | 1.000 ₺ | 26.810 ₺ | 3.034.553 ₺ |
| ciftci_14 | 0 | sn_hilal_adasi_tasra | 6 | 0 | 0 | 0 | 0 | 50.000 ₺ | 29.523 ₺ | 0 ₺ | 0 ₺ | 79.523 ₺ |
| ciftci_15 | 0 | sn_carvan_kenti_tasra | 8 | 2 | 3 | 7 | 0 | 2.988.236 ₺ | 5.655 ₺ | 2.000 ₺ | 26.810 ₺ | 3.022.701 ₺ |
| ciftci_16 | 0 | sn_dogu_limani_tasra | 6 | 0 | 0 | 0 | 0 | 50.000 ₺ | 29.523 ₺ | 0 ₺ | 0 ₺ | 79.523 ₺ |

(Yalnız ilk 16 oyuncu gösterilir; toplam 313.)
Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `c6026edc4f59bbb9` |
| 2 | `da65e88188915bf7` |
| 3 | `1b79aa758fa8734f` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | BELİRSİZ (birincil Y7 %100); ikincil servet KALDI (ulaşan %77,8) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %46 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

