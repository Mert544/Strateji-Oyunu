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
| **H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı | KALDI · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20 | hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %100 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,4'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 ucuz hücre payı (≤ 2× taban) | %13,2 (eski oyuncuya açık: %3,1) | < %20 | ayrılmış hücreler yalnız yeni oyuncuya |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %47,7 · ilçe payı %25 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

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
| gec_ciftci | sn_m_ova_tasra | 2 / 5 | 1.284.070 ₺ | 451.376 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 3 | 1.124.666 ₺ | 820.398 ₺ | evet |
| gec_pazar | sn_m_ova_tasra | 2 / 5 | 943.290 ₺ | 451.376 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.011.973 ₺ | 83.457 ₺ | %2410,8 | — | %4,3 | evet |
| gec_sanayici | 1.660.887 ₺ | 83.341 ₺ | %1992,9 | — | %5,2 | evet |
| gec_pazar | 1.483.895 ₺ | 83.457 ₺ | %1778 | — | %5,8 | evet |

Ucuz hücre (katılım anında): %13,2 (77/583); bunun 59 hücresi ayrılmış (yalnız yeni oyuncu), 18 hücresi genel (%3,1). Satılmamış ayrılmış hücre: 59. **H6 kararı (Y7 + ucuz): KALDI** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 5 | 1.177.229 ₺ | 384.839 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 3 | 1.124.665 ₺ | 820.398 ₺ | evet |
| gec_pazar | sn_m_ova_tasra | 2 / 5 | 808.563 ₺ | 384.839 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.905.132 ₺ | 83.457 ₺ | %2282,8 | — | %4,5 | evet |
| gec_sanayici | 1.660.887 ₺ | 83.341 ₺ | %1992,9 | — | %5,2 | evet |
| gec_pazar | 1.349.168 ₺ | 83.457 ₺ | %1616,6 | — | %6,3 | evet |

Ucuz hücre (katılım anında): %13,2 (77/583); bunun 59 hücresi ayrılmış (yalnız yeni oyuncu), 18 hücresi genel (%3,1). Satılmamış ayrılmış hücre: 59. **H6 kararı (Y7 + ucuz): KALDI** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 5 | 972.450 ₺ | 315.853 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 3 | 1.124.666 ₺ | 820.398 ₺ | evet |
| gec_pazar | sn_m_ova_tasra | 2 / 5 | 610.771 ₺ | 315.853 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.700.354 ₺ | 83.457 ₺ | %2037,4 | — | %5 | evet |
| gec_sanayici | 1.660.887 ₺ | 83.341 ₺ | %1992,9 | — | %5,2 | evet |
| gec_pazar | 1.151.375 ₺ | 83.457 ₺ | %1379,6 | — | %7,4 | evet |

Ucuz hücre (katılım anında): %13,2 (77/583); bunun 59 hücresi ayrılmış (yalnız yeni oyuncu), 18 hücresi genel (%3,1). Satılmamış ayrılmış hücre: 59. **H6 kararı (Y7 + ucuz): KALDI** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %47,7 | %49,2 | %47,7 | %25 (spekulator_3, 12 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %47,7 | %49,2 | %47,7 | %25 (spekulator_3, 12 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %47,7 | %49,2 | %47,7 | %25 (spekulator_3, 12 hücre) | 0 | yok (ölçülemez) |

Not: spekülatör botları (arsa biriktirir, üretmez) koşuda; Gini ve ilçe payı onların tavanlara (72 hücre / ilçenin %25'i) dayanmasıyla ölçülür. En büyük ilçe payı %25'e tam dayanabilir ama aşamaz (tavan çekirdekte); eşik "> %25" olduğundan tam %25 geçer.

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 110 | 51 | 59 | %53,6 | 0 | tuttu |
| 1 | koşu sonu | 110 | 57 | 53 | %48,2 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 110 | 51 | 59 | %53,6 | 0 | tuttu |
| 2 | koşu sonu | 110 | 57 | 53 | %48,2 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 110 | 51 | 59 | %53,6 | 0 | tuttu |
| 3 | koşu sonu | 110 | 57 | 53 | %48,2 | 0 | tuttu |

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
| ciftci | 3 | 7 | 8 | 3.395.391 ₺ | 7 | 0 |
| sanayici | 2 | 8 | 8 | 4.522.579 ₺ | 10 | 0 |
| tuccar | 2 | 7 | 7 | 2.129.409 ₺ | 7 | 0 |
| pasif | 1 | 6 | 6 | 700.064 ₺ | 2 | 0 |
| spekulator | 3 | 65 | 67 | 83.437 ₺ | 13 | 0 |
| spekulator_yasli | 3 | 47 | 48 | 82.819 ₺ | 7 | 0 |
| gec_ciftci | 1 | 7 | 7 | 2.011.973 ₺ | 7 | 0 |
| gec_sanayici | 1 | 8 | 8 | 1.660.887 ₺ | 10 | 0 |
| gec_pazar | 1 | 6 | 6 | 1.483.895 ₺ | 7 | 0 |

| Oyuncu | Katılım (gün) | İlçe | Hücre | Ayrılmış | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 2 | 3 | 7 | 0 | 3.234.912 ₺ | 5.569 ₺ | 2.000 ₺ | 26.810 ₺ | 3.269.290 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 3 | 3 | 7 | 0 | 3.235.516 ₺ | 5.569 ₺ | 1.421 ₺ | 26.810 ₺ | 3.269.315 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 6 | 3 | 3 | 7 | 0 | 3.615.189 ₺ | 5.568 ₺ | 0 ₺ | 26.810 ₺ | 3.647.567 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 1 | 4 | 10 | 0 | 4.444.286 ₺ | 21.844 ₺ | 2.772 ₺ | 53.690 ₺ | 4.522.592 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 0 | 4 | 10 | 0 | 4.443.657 ₺ | 21.844 ₺ | 3.375 ₺ | 53.690 ₺ | 4.522.567 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 7 | 1 | 3 | 7 | 0 | 2.096.952 ₺ | 7.245 ₺ | 1.414 ₺ | 23.800 ₺ | 2.129.411 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 2 | 3 | 7 | 0 | 2.096.862 ₺ | 7.245 ₺ | 1.500 ₺ | 23.800 ₺ | 2.129.407 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 1 | 2 | 0 | 673.442 ₺ | 18.642 ₺ | 0 ₺ | 7.980 ₺ | 700.064 ₺ |
| spekulator_1 | 0 | sn_m_col_merkez | 67 | 12 | 0 | 15 | 0 | 0 ₺ | 1 ₺ | 83.456 ₺ | 0 ₺ | 83.457 ₺ |
| spekulator_2 | 0 | sn_m_col_tasra | 66 | 12 | 0 | 14 | 0 | 0 ₺ | 1 ₺ | 83.512 ₺ | 0 ₺ | 83.514 ₺ |
| spekulator_3 | 0 | sn_m_dag_tasra | 64 | 12 | 0 | 12 | 0 | 0 ₺ | 1 ₺ | 83.340 ₺ | 0 ₺ | 83.341 ₺ |
| spekulator_yasli_1 | 0 | sn_m_col_merkez | 48 | 0 | 0 | 7 | 0 | 0 ₺ | 1 ₺ | 83.225 ₺ | 0 ₺ | 83.226 ₺ |
| spekulator_yasli_2 | 0 | sn_m_dag_tasra | 47 | 1 | 0 | 7 | 0 | 0 ₺ | 1 ₺ | 82.708 ₺ | 0 ₺ | 82.710 ₺ |
| spekulator_yasli_3 | 0 | sn_m_dag_merkez | 47 | 1 | 0 | 8 | 0 | 0 ₺ | 1 ₺ | 82.520 ₺ | 0 ₺ | 82.521 ₺ |
| gec_ciftci | 20 | sn_m_ova_tasra | 7 | 2 | 3 | 7 | 0 | 1.976.658 ₺ | 5.856 ₺ | 2.649 ₺ | 26.810 ₺ | 2.011.973 ₺ |
| gec_sanayici | 20 | sn_m_dag_merkez | 8 | 2 | 4 | 10 | 0 | 1.578.963 ₺ | 26.234 ₺ | 2.000 ₺ | 53.690 ₺ | 1.660.887 ₺ |

(Yalnız ilk 16 oyuncu gösterilir; toplam 17.)
Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 10 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-spekulator-temel)

Karşılaştırılan koşu: `parsel-v1-spekulator-temel.json` (3 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %305,3 | %299,4 | %93,7 | %2243,6 |
| pazar | %147,7 | %204,2 | %38,3 | %1591,4 |
| sanayici | %137,3 | %137,1 | %38 | %1992,9 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %0 | %100 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `f0f816cdc65c8c26` |
| 2 | `fdadb9a82ef2d062` |
| 3 | `28009417e442a5a6` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | KALDI (birincil Y7 %100); ikincil servet KALDI (ulaşan %100) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %47,7 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

