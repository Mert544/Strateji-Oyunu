# Parsel dünyası ölçümü — v1-kalabalik-s50

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-kalabalik-s50 |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1 |
| Süre | 24 sim günü (geç katılım 10. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 100 ciftci, 50 sanayici, 50 tuccar, 30 pasif, 40 spekulator, 40 spekulatorYasli yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
| İklim | hizli (başlangıç ayı tohumla döner) |
| Harita | sentetik-50 |
| Tarım yönetimi | kapalı |
| Bakım yönetimi | kapalı |
| Yaşlı spekülatör | 15. günden itibaren arsa alır (ayrılmış hücre süresi sonrası) |
| Ağır koşu | hayır (varsayılan; H6'nın 60. gün katılımı için `--agir`) |

**Bulgular ve yorum (elle yazılmış, yeniden üretimde korunur):** [parsel-v1-bulgular.md](parsel-v1-bulgular.md)

## 1. Özet

| Ölçüt | Sonuç | Eşik (vazgeçme) | Not |
|---|---|---|---|
| **H6 (birincil: Y7 + ucuz hücre)** — hipotez kararı | KALDI · Y7 %50 oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da ucuz hücre < %20 | hibeden bağımsız üretim geliri (son 7 gün); karar servetten gelmez |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan %100 | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~%7,2'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 ucuz hücre payı (≤ 2× taban) | %1,9 (eski oyuncuya açık: %0) | < %20 | ayrılmış hücreler yalnız yeni oyuncuya |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %45,8 · ilçe payı %25 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

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
| gec_ciftci | sn_gri_tepe_merkez | 0 / 10 | 1.103.408 ₺ | — | ölçülemez |
| gec_sanayici | sn_kor_ocak_merkez | 3 / 9 | 1.267.683 ₺ | 1.069.347 ₺ | evet |
| gec_pazar | sn_demir_dagi_merkez | 3 / 8 | 506.638 ₺ | 1.050.887 ₺ | hayır |

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|
| gec_ciftci | 1.421.651 ₺ | 81.422 ₺ | %1746 | — | %6 | evet |
| gec_sanayici | 2.684.714 ₺ | 82.018 ₺ | %3273,3 | — | %3,2 | evet |
| gec_pazar | 693.623 ₺ | 82.673 ₺ | %839 | — | %12,3 | evet |

Ucuz hücre (katılım anında): %1,9 (89/4728); bunun 89 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 89. **H6 kararı (Y7 + ucuz): KALDI** · Y7 %50 (1/2). İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %45,8 | %45,9 | %45,8 | %25 (spekulator_9, 12 hücre) | 0 | yok (ölçülemez) |

Not: spekülatör botları (arsa biriktirir, üretmez) koşuda; Gini ve ilçe payı onların tavanlara (72 hücre / ilçenin %25'i) dayanmasıyla ölçülür. En büyük ilçe payı %25'e tam dayanabilir ama aşamaz (tavan çekirdekte); eşik "> %25" olduğundan tam %25 geçer.

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 897 | 808 | 89 | %9,9 | 0 | tuttu |
| 1 | koşu sonu | 897 | 808 | 89 | %9,9 | 0 | tuttu |

Okuma: İHLAL = 0 ise çekirdek kuralı (eski oyuncuya satmama) tutuyor. Kalan pay düşükse ayrılmış hücreler **önceki yeni oyuncular** (ör. ilk 14 günde alım yapan spekülatörler) tarafından tüketilmiş demektir: kural eski oyuncudan korur, aynı dönemdeki yeni oyuncudan korumaz.

## 4. Y ölçütleri (Y1–Y10)

**Botlar eğlenceyi ölçmez** (docs/00 R5): *insan testi* işaretli ölçütlerde aşağıdaki bot sayıları yalnız **gözlemdir**, hedef denetimi sayılmaz. Çekirdek durumundan türetilemeyenler **ölçülemez** işaretiyle gösterilir.

| # | Ölçüt | Hedef | Kaynak | Bu koşuda |
|---|---|---|---|---|
| Y1 | İlk yapı ≤ 10 dk | ≥ %75 | **insan testi** | bot gözlemi: ≤ 10 dk %64,9 (botlar katılımda anında kurar) — Komut günlüğünden (katılım → ilk kabul edilen yapı komutu). Bot katılımda anında kurar: anlamlı değil, insan testi şart. |
| Y2 | İlk saatte ilk satış | ≥ %70 (60 dk), ≥ %50 (10 dk) | **insan testi** | bot gözlemi: ≤ 60 dk %70,6, ≤ 10 dk %0 — Emir gerçekleşmesinden (gözlem ızgarası çözünürlüğüyle; +10 dk ve +60 dk ek gözlemleriyle eşikler tam). |
| Y3 | İlk sözleşme ≤ 24 sa | ≥ %50 | **insan testi** | ölçülemez (sözleşme komutu yok) — OLÇÜLEMEZ: çekirdekte sözleşme/sipariş komutu (siparis_teslim; A6) yok. |
| Y4 | D1 / D7 geri dönüş | D1 ≥ %35; D7 ≥ %15 (gözlem) | **insan testi** | ölçülemez — OLÇÜLEMEZ: oturum telemetrisi gerekir (sunucu; R-Ü16); çekirdek durumunda yok. |
| Y5 | Açılış çeşitliliği | hiçbir katman > %60 | bot + insan (karma) | en büyük katman %57,8; hibrit portföy %47,4 — İlk 24 saatte ikinci yapının katmanı; hibrit portföy oranı. |
| Y6 | Yön değiştirme maliyetsizliği | ≥ %10 yön değiştirir; D7 farkı ≥ −5 puan | **insan testi** | bot gözlemi: yön değiştiren %0 (botlar bırakmaz/iptal etmez); D7 farkı ölçülemez — Yalnız oran (parsel_birak / insaat_iptal, ilk 7 gün) türetilir; D7 farkı oturum verisi ister (ölçülemez). |
| Y7 | 14. gün net üretim geliri | oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde | bot + insan (karma) | GEÇTİ · %50 oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2) — H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı); emsal yalnız üreten (geliri > 0) yerleşikler. |
| Y8 | Defter etkileşimi | Atla ≤ %30 | **insan testi** | ölçülemez — OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi. |
| Y9 | Rehberlik (Alfa-1) | ≥ %20; Rehberli D7 ≥ +5 puan | **insan testi** | ölçülemez — OLÇÜLEMEZ: Rehberlik (A16) yok. |
| Y10 | Takılma | ≤ 1 / oyuncu | **insan testi** | ölçülemez — OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız. |

## 5. Oyuncu özeti (tohum 1)

| Grup | Oyuncu | Ort. hücre | En çok hücre | Ort. ham servet | Ort. komut | Reddedilen |
|---|---|---|---|---|---|---|
| ciftci | 100 | 6 | 8 | 2.654.660 ₺ | 6 | 0 |
| sanayici | 50 | 7 | 8 | 2.304.568 ₺ | 6 | 0 |
| tuccar | 50 | 6 | 8 | 922.587 ₺ | 4 | 0 |
| pasif | 30 | 6 | 6 | 79.523 ₺ | 0 | 0 |
| spekulator | 40 | 52 | 58 | 81.653 ₺ | 12 | 0 |
| spekulator_yasli | 40 | 23 | 36 | 82.126 ₺ | 5 | 0 |
| gec_ciftci | 1 | 8 | 8 | 1.421.651 ₺ | 4 | 0 |
| gec_sanayici | 1 | 8 | 8 | 2.684.714 ₺ | 10 | 0 |
| gec_pazar | 1 | 6 | 6 | 693.623 ₺ | 4 | 0 |

| Oyuncu | Katılım (gün) | İlçe | Hücre | Ayrılmış | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_ak_ova_merkez | 8 | 1 | 3 | 7 | 0 | 2.842.365 ₺ | 5.655 ₺ | 3.542 ₺ | 26.810 ₺ | 2.878.372 ₺ |
| ciftci_2 | 0 | sn_ak_ova_tasra | 6 | 2 | 3 | 7 | 0 | 2.846.026 ₺ | 5.655 ₺ | 0 ₺ | 26.810 ₺ | 2.878.491 ₺ |
| ciftci_3 | 0 | sn_askan_kenti_merkez | 8 | 3 | 3 | 7 | 0 | 2.833.533 ₺ | 5.655 ₺ | 5.542 ₺ | 26.810 ₺ | 2.871.539 ₺ |
| ciftci_4 | 0 | sn_askan_kenti_tasra | 7 | 3 | 3 | 7 | 0 | 2.836.824 ₺ | 5.655 ₺ | 2.358 ₺ | 26.810 ₺ | 2.871.647 ₺ |
| ciftci_5 | 0 | sn_bereket_dizi_merkez | 7 | 0 | 3 | 7 | 0 | 2.845.151 ₺ | 5.655 ₺ | 2.250 ₺ | 26.810 ₺ | 2.879.866 ₺ |
| ciftci_6 | 0 | sn_bereket_dizi_tasra | 8 | 4 | 3 | 7 | 0 | 2.845.409 ₺ | 5.655 ₺ | 2.000 ₺ | 26.810 ₺ | 2.879.874 ₺ |
| ciftci_7 | 0 | sn_carvan_kenti_merkez | 8 | 2 | 3 | 7 | 0 | 2.840.631 ₺ | 5.654 ₺ | 2.000 ₺ | 26.810 ₺ | 2.875.096 ₺ |
| ciftci_8 | 0 | sn_carvan_kenti_tasra | 7 | 3 | 3 | 7 | 0 | 2.839.924 ₺ | 5.654 ₺ | 2.684 ₺ | 26.810 ₺ | 2.875.073 ₺ |
| ciftci_9 | 0 | sn_dorsa_kenti_merkez | 6 | 0 | 3 | 7 | 0 | 2.529.233 ₺ | 5.654 ₺ | 0 ₺ | 26.810 ₺ | 2.561.698 ₺ |
| ciftci_10 | 0 | sn_dorsa_kenti_tasra | 7 | 2 | 3 | 7 | 0 | 2.526.676 ₺ | 5.654 ₺ | 2.474 ₺ | 26.810 ₺ | 2.561.614 ₺ |
| ciftci_11 | 0 | sn_gun_batimi_merkez | 8 | 2 | 3 | 7 | 0 | 2.841.589 ₺ | 5.654 ₺ | 3.250 ₺ | 26.810 ₺ | 2.877.303 ₺ |
| ciftci_12 | 0 | sn_gun_batimi_tasra | 7 | 2 | 3 | 7 | 0 | 2.843.915 ₺ | 5.654 ₺ | 1.000 ₺ | 26.810 ₺ | 2.877.379 ₺ |
| ciftci_13 | 0 | sn_orta_ova_merkez | 8 | 5 | 3 | 7 | 0 | 2.842.271 ₺ | 5.655 ₺ | 2.000 ₺ | 26.810 ₺ | 2.876.736 ₺ |
| ciftci_14 | 0 | sn_orta_ova_tasra | 7 | 0 | 3 | 7 | 0 | 2.841.564 ₺ | 5.655 ₺ | 2.684 ₺ | 26.810 ₺ | 2.876.714 ₺ |
| ciftci_15 | 0 | sn_sanayi_ovasi_merkez | 8 | 4 | 3 | 7 | 0 | 2.525.615 ₺ | 5.654 ₺ | 3.500 ₺ | 26.810 ₺ | 2.561.579 ₺ |
| ciftci_16 | 0 | sn_sanayi_ovasi_tasra | 8 | 3 | 3 | 7 | 0 | 2.525.762 ₺ | 5.654 ₺ | 3.358 ₺ | 26.810 ₺ | 2.561.584 ₺ |

(Yalnız ilk 16 oyuncu gösterilir; toplam 313.)
Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `449ccedf8af73a27` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | KALDI (birincil Y7 %50); ikincil servet KALDI (ulaşan %100) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %45,8 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

