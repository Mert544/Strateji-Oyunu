# Parsel dünyası ölçümü — v1-kisa-tarim-bakim

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-kisa-tarim-bakim |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3 |
| Süre | 24 sim günü (geç katılım 10. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 3 ciftci, 2 sanayici, 2 tuccar, 1 pasif yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | mini-6 |
| Tarım yönetimi | AÇIK (ekim planı + gübre dozu; pasif ve spekülatör hariç) |
| Bakım yönetimi | AÇIK (parça ithalatı + aşınma eşiğinde genel onarım; pasif ve spekülatör hariç) |
| Ağır koşu | hayır (varsayılan; H6'nın 60. gün katılımı için `--agir`) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı | GEÇTİ · Y7 %100 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20 | hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %33,3 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%4,9'i; hibe/kit arındırması ulaşma kararını değiştirmez |
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
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 964.961 ₺ | 568.521 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 957.282 ₺ | 885.706 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 641.690 ₺ | 796.985 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.902.937 ₺ | 1.619.828 ₺ | %117,5 | %118,5 | %4,5 | evet |
| gec_sanayici | 1.524.205 ₺ | 2.494.888 ₺ | %61,1 | %59,7 | %5,6 | hayır |
| gec_pazar | 1.759.389 ₺ | 2.895.667 ₺ | %60,8 | %59,6 | %4,9 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 875.664 ₺ | 573.996 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 957.281 ₺ | 885.705 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 641.690 ₺ | 796.986 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.131.526 ₺ | 1.616.762 ₺ | %131,8 | %133,6 | %4 | evet |
| gec_sanayici | 1.550.270 ₺ | 2.494.886 ₺ | %62,1 | %60,8 | %5,5 | hayır |
| gec_pazar | 1.746.900 ₺ | 2.854.307 ₺ | %61,2 | %60 | %4,9 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | Emsal (üreten / toplam) | Üretim geliri (7 gün) | Üreten emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|
| gec_ciftci | sn_m_ova_tasra | 2 / 2 | 873.788 ₺ | 562.582 ₺ | evet |
| gec_sanayici | sn_m_dag_merkez | 1 / 1 | 957.283 ₺ | 885.706 ₺ | evet |
| gec_pazar | sn_m_sehir_merkez | 2 / 2 | 641.690 ₺ | 785.846 ₺ | evet |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 2.131.837 ₺ | 1.654.433 ₺ | %128,9 | %130,4 | %4 | evet |
| gec_sanayici | 1.550.130 ₺ | 2.494.889 ₺ | %62,1 | %60,8 | %5,5 | hayır |
| gec_pazar | 1.695.267 ₺ | 2.792.102 ₺ | %60,7 | %59,5 | %5 | hayır |

Ucuz hücre (katılım anında): %90,2 (526/583); bunun 99 hücresi ayrılmış (yalnız yeni oyuncu), 427 hücresi genel (%73,2). Satılmamış ayrılmış hücre: 99. **H6 kararı (Y7 + ucuz): GEÇTİ** · Y7 %100 (3/3). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %16,4 | %6,1 | %16,4 | %24,1 (tuccar_1, 7 hücre) | 0 | yok (ölçülemez) |

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
| ciftci_1 | 0 | sn_m_ova_merkez | 8 | 3 | 25 | 0 | 2.241.174 ₺ | 421.129 ₺ | 2.542 ₺ | 26.810 ₺ | 2.691.655 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 3 | 25 | 0 | 2.242.333 ₺ | 421.129 ₺ | 1.421 ₺ | 26.810 ₺ | 2.691.693 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 6 | 3 | 26 | 0 | 2.798.251 ₺ | 329.600 ₺ | 0 ₺ | 26.810 ₺ | 3.154.661 ₺ |
| sanayici_1 | 0 | sn_m_dag_merkez | 8 | 4 | 16 | 0 | 2.386.890 ₺ | 51.852 ₺ | 2.456 ₺ | 53.690 ₺ | 2.494.888 ₺ |
| sanayici_2 | 0 | sn_m_dag_tasra | 8 | 4 | 16 | 0 | 2.387.844 ₺ | 51.326 ₺ | 2.542 ₺ | 53.690 ₺ | 2.495.402 ₺ |
| tuccar_1 | 0 | sn_m_sehir_tasra | 7 | 3 | 15 | 0 | 2.167.081 ₺ | 444.382 ₺ | 1.414 ₺ | 23.800 ₺ | 2.636.676 ₺ |
| tuccar_2 | 0 | sn_m_sehir_merkez | 7 | 3 | 15 | 0 | 2.166.992 ₺ | 444.382 ₺ | 1.500 ₺ | 23.800 ₺ | 2.636.673 ₺ |
| pasif_1 | 0 | sn_m_ova_tasra | 6 | 1 | 2 | 0 | 520.181 ₺ | 19.803 ₺ | 0 ₺ | 7.980 ₺ | 547.963 ₺ |
| gec_ciftci | 10 | sn_m_ova_tasra | 6 | 3 | 18 | 0 | 1.438.224 ₺ | 437.903 ₺ | 0 ₺ | 26.810 ₺ | 1.902.937 ₺ |
| gec_sanayici | 10 | sn_m_dag_merkez | 8 | 4 | 16 | 0 | 1.384.041 ₺ | 83.456 ₺ | 3.018 ₺ | 53.690 ₺ | 1.524.205 ₺ |
| gec_pazar | 10 | sn_m_sehir_merkez | 7 | 3 | 13 | 0 | 1.286.554 ₺ | 447.243 ₺ | 1.792 ₺ | 23.800 ₺ | 1.759.389 ₺ |

Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-kisa-temel)

Karşılaştırılan koşu: `parsel-v1-kisa-temel.json` (3 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %189,4 | %159,2 | %139,7 | %126,1 |
| pazar | %83,7 | %80,9 | %58,9 | %60,9 |
| sanayici | %117,7 | %108,1 | %61,9 | %61,8 |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | %100 |
| Y7 kararı | GEÇTİ | GEÇTİ |
| İkincil servet ulaşma | %33,3 | %33,3 |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `6417fc7917f84a6d` |
| 2 | `ed8655007378dcea` |
| 3 | `4021876910e4273d` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | GEÇTİ (birincil Y7 %100); ikincil servet KALDI (ulaşan %33,3) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %16,4 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

