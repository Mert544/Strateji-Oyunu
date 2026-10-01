# Parsel dünyası ölçümü — v0

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v0 |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3 |
| Süre | 24 sim günü (geç katılım 10. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Ağır koşu | hayır (varsayılan; H6'nın 60. gün katılımı için `--agir`) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v0-bulgular.md](parsel-v0-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20 | hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %33,3 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%5,1'i; hibe/kit arındırması ulaşma kararını değiştirmez |
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
| gec_ciftci | sn_m_ova_tasra | 2 | 907.080 ₺ | 485.510 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.045 ₺ | 749.627 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 456.470 ₺ | 540.438 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.819.312 ₺ | 1.413.465 ₺ | %128,7 | %130,6 | %4,7 | evet |
| gec_sanayici | 1.884.580 ₺ | 3.043.898 ₺ | %61,9 | %60,8 | %4,5 | hayır |
| gec_pazar | 1.285.211 ₺ | 2.186.491 ₺ | %58,8 | %57,1 | %6,7 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 930.737 ₺ | 501.935 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.035 ₺ | 749.627 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 419.710 ₺ | 498.851 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.028.195 ₺ | 1.437.635 ₺ | %141,1 | %143,7 | %4,2 | evet |
| gec_sanayici | 1.884.550 ₺ | 3.043.902 ₺ | %61,9 | %60,8 | %4,5 | hayır |
| gec_pazar | 1.307.439 ₺ | 2.205.792 ₺ | %59,3 | %57,6 | %6,5 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal | Üretim geliri (7 gün) | Emsal geliri medyan | Emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 | 909.598 ₺ | 464.580 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 | 882.034 ₺ | 749.626 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 | 352.181 ₺ | 426.949 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.197.558 ₺ | 1.473.353 ₺ | %149,2 | %152,2 | %3,9 | evet |
| gec_sanayici | 1.884.548 ₺ | 3.043.900 ₺ | %61,9 | %60,8 | %4,5 | hayır |
| gec_pazar | 1.286.239 ₺ | 2.192.224 ₺ | %58,7 | %57 | %6,7 | hayır |

Ucuz hücre (katılım anında): %94,7 (961/1015); bunun 184 hücresi ayrılmış (yalnız yeni oyuncu), 777 hücresi genel (%76,6). Satılmamış ayrılmış hücre: 184. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %31 | %6,5 | %31 | %9,9 (sanayici_2, 8 hücre) | 0 | yok (ölçülemez) |

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
| ciftci_1 | 0 | sn_m_ova_merkez | 7 | 3 | 7 | 0 | 2.245.314 ₺ | 5.655 ₺ | 1.148 ₺ | 26.810 ₺ | 2.278.927 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 6 | 3 | 7 | 0 | 2.246.501 ₺ | 5.655 ₺ | 0 ₺ | 26.810 ₺ | 2.278.966 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 7 | 3 | 7 | 0 | 2.714.615 ₺ | 5.655 ₺ | 1.296 ₺ | 26.810 ₺ | 2.748.377 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 4 | 10 | 0 | 2.964.914 ₺ | 23.005 ₺ | 2.289 ₺ | 53.690 ₺ | 3.043.898 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 4 | 10 | 0 | 2.964.880 ₺ | 23.005 ₺ | 2.321 ₺ | 53.690 ₺ | 3.043.897 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 6 | 3 | 7 | 0 | 1.593.473 ₺ | 7.332 ₺ | 0 ₺ | 23.800 ₺ | 1.624.605 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 6 | 3 | 7 | 0 | 1.593.473 ₺ | 7.332 ₺ | 0 ₺ | 23.800 ₺ | 1.624.605 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 2 | 0 | 520.181 ₺ | 19.803 ₺ | 0 ₺ | 7.980 ₺ | 547.964 ₺ |
| gec_ciftci | 10 | sn_m_ova_tasra | 7 | 3 | 7 | 0 | 1.785.304 ₺ | 5.798 ₺ | 1.400 ₺ | 26.810 ₺ | 1.819.312 ₺ |
| gec_sanayici | 10 | sn_m_dag_merkez | 8 | 4 | 10 | 0 | 1.803.016 ₺ | 25.230 ₺ | 2.644 ₺ | 53.690 ₺ | 1.884.580 ₺ |
| gec_pazar | 10 | sn_m_sehir_merkez | 6 | 3 | 7 | 0 | 1.253.935 ₺ | 7.476 ₺ | 0 ₺ | 23.800 ₺ | 1.285.211 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `1052022bdcbe9258` |
| 2 | `5b659eb56c40f169` |
| 3 | `f6f4538e61e57b8c` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | GEÇTİ (birincil Y7 %100); ikincil servet KALDI (ulaşan %33,3) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %31 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

