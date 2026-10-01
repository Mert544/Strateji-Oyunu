# Parsel dünyası ölçümü — v1-kalabalik

> **Bu, ilk parsel (mülk kipi) ölçümüdür** ve bir **kısa duman koşusudur**: mini-6 parsel fikstürü, az sayıda bot, kısa süre. Sayılar bölge kipi v0.3 temel çizgisiyle doğrudan karşılaştırılamaz (§7). Kalibre edilmemiş başlangıç eşikleriyle okunur; karar değil, yön gösterir.

| Alan | Değer |
|---|---|
| Sürüm/etiket | v1-kalabalik |
| Kip | parsel (mülk kipi; `parametreler.mulk` + mini-6 parsel fikstürü, yeni oyuncu paketi AÇIK) |
| Tohumlar | 1, 2, 3 |
| Süre | 24 sim günü (geç katılım 10. gün, ölçüm katılımdan 14 gün sonra) |
| Düzen | 20 ciftci, 10 sanayici, 10 tuccar, 6 pasif, 8 spekulator, 8 spekulatorYasli yerleşik + geç katılan: çiftçi, sanayici, pazar (tüccar) |
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
| **H6 (birincil: Y7 + açılış koşulu)** — hipotez kararı | BELİRSİZ · Y7 — oyuncu | Y7: oyuncuların < %50'si emsal medyanının ≥ %50'sinde ya da açılış koşulu tutmuyor | hibeden bağımsız üretim geliri (son 7 gün; emsal önce ilçe, yoksa il); karar servetten gelmez |
| H6 ikinci koşul: açılış koşulu (docs/12 §13) | BELİRSİZ · (i) taban hücre ayak izine yeter — (yurt dahil: —) · (ii, bilgi) 14 günde açılış yapısı — — insan testi gerekli | TÜM olgular (i)'yi sağlamalı; (ii) karara girmez | ayak izi = açılışın ilk yapısının hücre sayısı, yurt hariç (yurt ayrı ve ücretsizdir); yurt dahil sayım bilgidir; (ii) botlar katılım anında kurduğu için bot ölçeğinde bilgisizdir |
| H6 Y7 emsal düzeyi | il yedeğiyle ölçülen olgu — | (bilgi) | önce ilçe emsali; ilçede üreten yoksa aynı ildeki üreten yerleşikler |
| H6 ikincil: servet medyana ulaşma (bilgi) | KALDI · ulaşan — | (karara girmez; eski tanım: ulaşan < %50) | hibe + kit ham servetin ~—'i; hibe/kit arındırması ulaşma kararını değiştirmez |
| H6 eski tanım (ucuz hücre payı ≥ %20) | %1,9 (eski oyuncuya açık: %0) | (karara girmez; eski eşik: < %20) | yalnız bilgi; ayrılmış hücre uygun hücrelerin ~%19'u olduğundan eşik yapısal olarak tutmuyordu |
| **H8** (Gini · en büyük ilçe payı · yeniden satış) | BELİRSİZ · Gini %31,4 · ilçe payı %25 | Gini > %60 ya da pay > %25 ya da > 10 hf | yeniden satış yok: koşul 3 ölçülemez |

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

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + — yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %1,9 (11/583); bunun 11 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 11. **H6 kararı (Y7 + açılış koşulu): BELİRSİZ** · Y7 ölçülemez: uretim yapan (geliri > 0) ilce ya da il emsali yok · açılış koşulu ölçülemez: geç katılan olgusu yok. İkincil servet ulaşma: KALDI.

### Tohum 2

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + — yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %1,9 (11/583); bunun 11 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 11. **H6 kararı (Y7 + açılış koşulu): BELİRSİZ** · Y7 ölçülemez: uretim yapan (geliri > 0) ilce ya da il emsali yok · açılış koşulu ölçülemez: geç katılan olgusu yok. İkincil servet ulaşma: KALDI.

### Tohum 3

**Birincil — Y7 (hibeden bağımsız net üretim geliri, son 7 gün):**

| Geç katılan | İlçe | İl | İlçe emsali (üreten / toplam) | İl emsali (üreten / toplam) | Emsal düzeyi | Üretim geliri (7 gün) | Kullanılan emsal geliri medyan | Üreten emsal medyanının ≥ %50'si |
|---|---|---|---|---|---|---|---|---|

**Birincil — ikinci koşul: açılış koşulu (karar: (i) katılımda taban fiyatlı hücre ayak izine yeter; (ii) 14 günde açılış yapısı yalnız bilgi, İNSAN TESTİ GEREKLİ):**

| Geç katılan | İlçe | Ayrılmış boş (katılım anı) | Ayak izi (yurt hariç) | (i) boş ≥ ayak izi | Bilgi: yurt dahil (boş + — yurt) | İlk açılış yapısı (katılımdan sonra) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | Olgu (= (i)) | İlçe seçimi (ilceSec) |
|---|---|---|---|---|---|---|---|---|---|

**İkincil — servet (bilgi; karara girmez):**

| Geç katılan | Servet (ham) | Emsal medyan (ham) | Servet/medyan (ham) | Servet/medyan (arınd.) | Hibe+kit payı | Medyana ulaştı |
|---|---|---|---|---|---|---|

**Eski tanım (ucuz hücre payı ≥ %20; bilgi, karara girmez):** %1,9 (11/583); bunun 11 hücresi ayrılmış (yalnız yeni oyuncu), 0 hücresi genel (%0). Satılmamış ayrılmış hücre: 11. **H6 kararı (Y7 + açılış koşulu): BELİRSİZ** · Y7 ölçülemez: uretim yapan (geliri > 0) ilce ya da il emsali yok · açılış koşulu ölçülemez: geç katılan olgusu yok. İkincil servet ulaşma: KALDI.

## 3. H8 — arazi yoğunlaşması

| Tohum | Karar | Gini (değer) | Gini (hücre) | Gini (yalnız sahipler) | En büyük ilçe payı | Pay > %25 çift | Yeniden satış |
|---|---|---|---|---|---|---|---|
| 1 | BELİRSİZ | %31,4 | %30 | %31,4 | %25 (spekulator_8, 12 hücre) | 0 | yok (ölçülemez) |
| 2 | BELİRSİZ | %31,4 | %30 | %31,4 | %25 (spekulator_8, 12 hücre) | 0 | yok (ölçülemez) |
| 3 | BELİRSİZ | %31,4 | %30 | %31,4 | %25 (spekulator_8, 12 hücre) | 0 | yok (ölçülemez) |

Not: spekülatör botları (arsa biriktirir, üretmez) koşuda; Gini ve ilçe payı onların tavanlara (72 hücre / ilçenin %25'i) dayanmasıyla ölçülür. En büyük ilçe payı %25'e tam dayanabilir ama aşamaz (tavan çekirdekte); eşik "> %25" olduğundan tam %25 geçer.

**Koşul 3 (yeniden satış) BELİRSİZ kalır — neden:** çekirdekte oyuncular arası arsa devri/satışı yoktur; `parsel_birak` hücreyi devlete %70 iadeyle bırakır (hücre sahipsiz olur, fiyat oluşmaz). Yeniden satış fiyatı hiç oluşmadığından "fiyat / haftalık arazi geliri" oranı ölçülemez; H8 kararı diğer iki koşul tutsa bile BELİRSİZdir.

## 3a. Ayrılmış hücre garantisi

Ayrılmış hücreler (ilçenin uygun hücrelerinin %20'si) yalnız katılımın ilk 14 gününde olan oyuncuya satılır. İki yönlü ölçülür: **ihlal** (ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış mı; 0 olmalı) ve **koruma** (geç gelen yeni oyuncu için ayrılmış hücre kalıyor mu: satılmamış / toplam).

| Tohum | An | Ayrılmış toplam | Satılan | Boş | Kalan pay | İhlal | Güvence |
|---|---|---|---|---|---|---|---|
| 1 | geç katılımdan hemen önce | 110 | 99 | 11 | %10 | 0 | tuttu |
| 1 | koşu sonu | 110 | 99 | 11 | %10 | 0 | tuttu |
| 2 | geç katılımdan hemen önce | 110 | 99 | 11 | %10 | 0 | tuttu |
| 2 | koşu sonu | 110 | 99 | 11 | %10 | 0 | tuttu |
| 3 | geç katılımdan hemen önce | 110 | 99 | 11 | %10 | 0 | tuttu |
| 3 | koşu sonu | 110 | 99 | 11 | %10 | 0 | tuttu |

Okuma: İHLAL = 0 ise çekirdek kuralı (eski oyuncuya satmama) tutuyor. Kalan pay düşükse ayrılmış hücreler **önceki yeni oyuncular** (ör. ilk 14 günde alım yapan spekülatörler) tarafından tüketilmiş demektir: kural eski oyuncudan korur, aynı dönemdeki yeni oyuncudan korumaz.

## 4. Y ölçütleri (Y1–Y10)

**Botlar eğlenceyi ölçmez** (docs/00 R5): *insan testi* işaretli ölçütlerde aşağıdaki bot sayıları yalnız **gözlemdir**, hedef denetimi sayılmaz. Çekirdek durumundan türetilemeyenler **ölçülemez** işaretiyle gösterilir.

| # | Ölçüt | Hedef | Kaynak | Bu koşuda |
|---|---|---|---|---|
| Y1 | İlk yapı ≤ 10 dk | ≥ %75 | **insan testi** | bot gözlemi: ≤ 10 dk %64,5 (botlar katılımda anında kurar) — Komut günlüğünden (katılım → ilk kabul edilen yapı komutu). Bot katılımda anında kurar: anlamlı değil, insan testi şart. |
| Y2 | İlk saatte ilk satış | ≥ %70 (60 dk), ≥ %50 (10 dk) | **insan testi** | bot gözlemi: ≤ 60 dk %58,1, ≤ 10 dk %0 — Emir gerçekleşmesinden (gözlem ızgarası çözünürlüğüyle; +10 dk ve +60 dk ek gözlemleriyle eşikler tam). |
| Y3 | İlk sözleşme ≤ 24 sa | ≥ %50 | **insan testi** | ölçülemez (sözleşme komutu yok) — OLÇÜLEMEZ: çekirdekte sözleşme/sipariş komutu (siparis_teslim; A6) yok. |
| Y4 | D1 / D7 geri dönüş | D1 ≥ %35; D7 ≥ %15 (gözlem) | **insan testi** | ölçülemez — OLÇÜLEMEZ: oturum telemetrisi gerekir (sunucu; R-Ü16); çekirdek durumunda yok. |
| Y5 | Açılış çeşitliliği | hiçbir katman > %60 | bot + insan (karma) | en büyük katman %66,7; hibrit portföy %33,3 — İlk 24 saatte ikinci yapının katmanı; hibrit portföy oranı. |
| Y6 | Yön değiştirme maliyetsizliği | ≥ %10 yön değiştirir; D7 farkı ≥ −5 puan | **insan testi** | bot gözlemi: yön değiştiren %0 (botlar bırakmaz/iptal etmez); D7 farkı ölçülemez — Yalnız oran (parsel_birak / insaat_iptal, ilk 7 gün) türetilir; D7 farkı oturum verisi ister (ölçülemez). |
| Y7 | 14. gün net üretim geliri | oyuncuların ≥ %50'si ilçe medyanının ≥ %50'sinde | bot + insan (karma) | BELİRSİZ · — oyuncu (H6 birincil ölçüsü; geç katılan botlar; §2) — H6'nın BİRİNCİL ölçüsü (hibeden bağımsız): son 7 günün net üretim geliri (sermaye harcaması hariç hazine akışı); emsal yalnız üreten (geliri > 0) yerleşikler. |
| Y8 | Defter etkileşimi | Atla ≤ %30 | **insan testi** | ölçülemez — OLÇÜLEMEZ: Esnaf Defteri istemci telemetrisi. |
| Y9 | Rehberlik (Alfa-1) | ≥ %20; Rehberli D7 ≥ +5 puan | **insan testi** | ölçülemez — OLÇÜLEMEZ: Rehberlik (A16) yok. |
| Y10 | Takılma | ≤ 1 / oyuncu | **insan testi** | ölçülemez — OLÇÜLEMEZ: gerçek oyuncunun komutsuz bekleme anları; bot karar aralığı sabit olduğundan anlamsız. |

## 5. Oyuncu özeti (tohum 1)

**Uygun ilçe yok: 3** (ilçe seçimi hiçbir ilçeyi "yurt verebilen + açılışa uygun" bulmadı; oyuncu katılmadı, ölçüm dışı): gec_ciftci (yurt verebilen ilce yok (ilceler dolu / bitisik bos alan yok)); gec_sanayici (yurt verebilen ilce yok (ilceler dolu / bitisik bos alan yok)); gec_pazar (yurt verebilen ilce yok (ilceler dolu / bitisik bos alan yok)). Tüm tohumlarda toplam: 9.

| Grup | Oyuncu | Ort. hücre | En çok hücre | Ort. ham servet | Ort. komut | Reddedilen |
|---|---|---|---|---|---|---|
| ciftci | 20 | 6 | 8 | 2.636.935 ₺ | 6 | 0 |
| sanayici | 10 | 7 | 8 | 3.249.738 ₺ | 9 | 0 |
| tuccar | 10 | 6 | 6 | 79.523 ₺ | 1 | 0 |
| pasif | 6 | 6 | 6 | 79.523 ₺ | 0 | 0 |
| spekulator | 8 | 28 | 35 | 82.525 ₺ | 7 | 0 |
| spekulator_yasli | 8 | 6 | 6 | 84.213 ₺ | 3 | 0 |

| Oyuncu | Katılım (gün) | İlçe | Hücre | Ayrılmış | Yapı | Komut | Reddedilen | Hazine | Stok | Arazi | Yapı bedeli | Ham servet |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| ciftci_1 | 0 | sn_m_ova_merkez | 6 | 0 | 2 | 5 | 0 | 1.671.791 ₺ | 8.175 ₺ | 0 ₺ | 18.830 ₺ | 1.698.795 ₺ |
| ciftci_2 | 0 | sn_m_ova_tasra | 7 | 1 | 3 | 7 | 0 | 2.748.581 ₺ | 5.655 ₺ | 1.000 ₺ | 26.810 ₺ | 2.782.046 ₺ |
| ciftci_3 | 0 | sn_m_sehir_merkez | 7 | 1 | 3 | 7 | 0 | 3.304.471 ₺ | 5.654 ₺ | 2.500 ₺ | 26.810 ₺ | 3.339.435 ₺ |
| ciftci_4 | 0 | sn_m_sehir_tasra | 6 | 0 | 3 | 7 | 0 | 3.307.055 ₺ | 5.654 ₺ | 0 ₺ | 26.810 ₺ | 3.339.520 ₺ |
| ciftci_5 | 0 | sn_m_ova_tasra | 6 | 0 | 3 | 7 | 0 | 2.749.615 ₺ | 5.655 ₺ | 0 ₺ | 26.810 ₺ | 2.782.080 ₺ |
| ciftci_6 | 0 | sn_m_ova_merkez | 8 | 2 | 3 | 7 | 0 | 2.747.547 ₺ | 5.655 ₺ | 2.000 ₺ | 26.810 ₺ | 2.782.012 ₺ |
| ciftci_7 | 0 | sn_m_sehir_merkez | 7 | 1 | 3 | 7 | 0 | 3.306.022 ₺ | 5.654 ₺ | 1.000 ₺ | 26.810 ₺ | 3.339.486 ₺ |
| ciftci_8 | 0 | sn_m_sehir_tasra | 6 | 2 | 3 | 7 | 0 | 3.307.055 ₺ | 5.654 ₺ | 0 ₺ | 26.810 ₺ | 3.339.520 ₺ |
| ciftci_9 | 0 | sn_m_ova_tasra | 6 | 0 | 3 | 7 | 0 | 2.749.615 ₺ | 5.655 ₺ | 0 ₺ | 26.810 ₺ | 2.782.080 ₺ |
| ciftci_10 | 0 | sn_m_ova_merkez | 6 | 0 | 2 | 5 | 0 | 1.671.791 ₺ | 8.175 ₺ | 0 ₺ | 18.830 ₺ | 1.698.795 ₺ |
| ciftci_11 | 0 | sn_m_sehir_merkez | 6 | 3 | 3 | 7 | 0 | 3.307.055 ₺ | 5.654 ₺ | 0 ₺ | 26.810 ₺ | 3.339.520 ₺ |
| ciftci_12 | 0 | sn_m_ova_tasra | 6 | 0 | 2 | 5 | 0 | 1.671.791 ₺ | 8.175 ₺ | 0 ₺ | 18.830 ₺ | 1.698.795 ₺ |
| ciftci_13 | 0 | sn_m_ova_merkez | 6 | 0 | 2 | 5 | 0 | 1.671.791 ₺ | 8.175 ₺ | 0 ₺ | 18.830 ₺ | 1.698.795 ₺ |
| ciftci_14 | 0 | sn_m_sehir_merkez | 6 | 1 | 3 | 7 | 0 | 3.307.055 ₺ | 5.654 ₺ | 0 ₺ | 26.810 ₺ | 3.339.520 ₺ |
| ciftci_15 | 0 | sn_m_sehir_tasra | 6 | 2 | 2 | 5 | 0 | 1.924.247 ₺ | 8.175 ₺ | 0 ₺ | 18.830 ₺ | 1.951.252 ₺ |
| ciftci_16 | 0 | sn_m_ova_tasra | 7 | 1 | 3 | 7 | 0 | 2.748.581 ₺ | 5.655 ₺ | 1.000 ₺ | 26.810 ₺ | 2.782.046 ₺ |

(Yalnız ilk 16 oyuncu gösterilir; toplam 62.)
Not: tablodaki servet KOŞU SONUDUR (geç katılanlar için ölçüm anı katılım + 14 gündür; koşu bitişiyle aynı).

## 5a. Önceki koşuyla karşılaştırma (v1-kisa-temel)

Karşılaştırılan koşu: `parsel-v1-kisa-temel.json` (3 tohum). Aynı geç katılan açılışları; değerler tohumlar üzerinden ortalamadır. **Gelir/emsal** = geç katılanın son 7 günlük üretim geliri / üreten (geliri > 0) ilçe emsallerinin medyanı (Y7'nin ham oranı); **servet/emsal** = ikincil servet oranı.

| Geç katılan açılışı | Gelir/emsal (önceki) | Gelir/emsal (bu koşu) | Servet/emsal (önceki) | Servet/emsal (bu koşu) |
|---|---|---|---|---|
| ciftci | %189,4 | — | %139,7 | — |
| pazar | %83,7 | — | %58,9 | — |
| sanayici | %117,7 | — | %61,9 | — |

| Ölçüt | Önceki | Bu koşu |
|---|---|---|
| Y7 oyuncu payı (≥ %50 emsal medyanı) | %100 | — |
| Y7 kararı | GEÇTİ | BELİRSİZ |
| H6 açılış koşulu (ayak izine yeter ve 14 günde yapı) | GEÇTİ | BELİRSİZ |
| İkincil servet ulaşma | %33,3 | — |

## 6. Determinizm izi

| Tohum | durumOzeti |
|---|---|
| 1 | `c24d9da79fac1209` |
| 2 | `5869a335d72bf39a` |
| 3 | `1a8287543468cb87` |

## 7. Bölge kipi v0.3 temel çizgisiyle karşılaştırma notu

Donmuş temel çizgi: [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) (commit `1a7fe08`, gerçek Karadeniz haritası, 53 bölge). Birim ve ifade değiştiği için **sayı karşılaştırılmaz, yalnız yön ve sınıf**.

| Hipotez | v0.3 (bölge kipi) | Parsel v0 (bu koşu) | Karşılaştırılabilirlik / uyarı |
|---|---|---|---|
| H6 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına üretim artışı medyanı) | BELİRSİZ (birincil Y7 —); ikincil servet KALDI (ulaşan —) | Orta: v0.3 aynı pencerede ÜRETİM ARTIŞINI ölçüyordu; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır. İkincil servet birikimi yerleşiğin baş avantajını taşır. |
| H8 | — (yeni, temel çizgi yok) | BELİRSİZ · Gini %31,4 | Temel çizgi yok. |

**Okuma.** v0.3'te geç katılanın medyana ulaşması bölge başına *üretim artışıyla* (aynı pencerede) ölçülüyordu. Parsel kipinde H6'nın birincil ölçüsü aynı pencerenin hibeden bağımsız gelirini (Y7) karşılaştırır; servet tabanlı ulaşma ikincildir (servet geçmiş birikimi de içerir, yerleşiğin baş avantajını taşır). Geç katılımın H6 tanımındaki gerçek günü (60.) için `--agir` koşusuna bakın.

## 8. Sınırlar ve uyarılar

- **Kısa koşu, küçük örnek:** yerleşik 8 bot, geç katılan 3; her olgu ilçe emsalleriyle (1–2 bot) karşılaştırılır. Emsal sayısı azdır; tek bir emsal medyanı belirler. İstatistiksel güç yoktur.
- **Geç katılım günü yapay:** varsayılan 10. gün (H6 tanımı 60.). 60. gün için `--agir` kullanılır; varsayılanda çalıştırılmaz.
- **Botlar basittir:** önayarlar sabit planlı (çiftçi/sanayici/tüccar/pasif); pazar tepkisi, saldırı, yeniden satış, yön değiştirme yoktur. Y ölçütlerinin çoğu insan testi ister.
- **Yapı değeri** ödenen tutardır (indirimli ilk 5); yurt değeri 0; stok taban fiyatla; arazi taban değer = ödenen bedel.
- **Y7 geliri** = hazine akışı − sermaye harcaması (arsa + yapı parası); hibe/kit sermaye ve stok olduğundan gelire girmez.

