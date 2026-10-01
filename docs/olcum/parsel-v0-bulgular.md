# Parsel ölçümü v0 — bulgular ve yorum (elle yazılmış)

> Bu dosya **elle yazılmıştır** ve rapor üretiminde ezilmez. Üretilen raporlar yalnız buraya bağlantı verir:
> [parsel-v0.md](parsel-v0.md) (kısa koşu: mini-6, 8 yerleşik + 3 geç katılan bot, 24 sim günü, tohum 1–3) ve
> [parsel-v0-gec60.md](parsel-v0-gec60.md) (H6 tanımındaki gerçek 60. gün katılımı: 74 gün, tohum 1–10).
> Yeniden üretim: `pnpm olcum --kip parsel --ad v0 --cikti docs/olcum` ve `pnpm olcum --kip parsel --agir --ad v0-gec60 --bulgular parsel-v0-bulgular.md --cikti docs/olcum`.
> Bulgular yön gösterir; karar değildir (kısa koşu, küçük örnek, kalibre edilmemiş eşikler).

## Karar kaynağı (baş lider kararı, 1 Ekim)

H6'nın **birincil ölçüsü** hibeden bağımsız üretim gelirinin akışıdır (**Y7**) ve ucuz hücre koşuluyla birlikte hipotez kararını verir. **Servet** tabanlı ulaşma **ikincil** olarak raporlanır, karara girmez. Tanım: [h1-h9-parsel-tanimlari.md](h1-h9-parsel-tanimlari.md) §4 H6.

## Bulgular

1. **H6 (Y7 + ucuz hücre) iki koşuda da GEÇTİ.** Y7 her iki koşuda %100: geç katılanların hepsi, aynı 7 günlük pencerede emsal gelir medyanının ≥ %50'sinde (çoğu emsalin üstünde). İkincil servet ulaşması: 24 günlük koşuda ulaşan %33,3 (yalnız geç çiftçi emsal medyanını geçti; geç sanayici ve geç pazar medyanın ~%59–62'sinde kaldı); gerçek 60. gün katılımında **%0** (10/10 tohum; geç oyuncular emsal servet medyanının %28–67'sinde).
2. **Servet birikir, gelir akar (karar buna göre birincil Y7 seçildi).** 60. günde katılan, 74 gün biriktirmiş yerleşiğin servet medyanına 14 günde ulaşamaz; aynı pencerede geliri emsalin 1,7–4,6 katıdır. Servet tanımı geç katılan için yapısal olarak KALDI üretir; v0.3'teki "aynı pencerede üretim artışı" ifadesi bu ayrımı yapmıyordu. Y7 bu yüzden H6'nın doğru birincil ölçüsüdür.
3. **Hibe+kit arındırması medyana ulaşma kararını değiştirmez** (kanıt testi: `h6-iki-bicim.test`): ortak (hibe + kit) ofseti hem geç katılandan hem emsal medyanından çıkarılınca `servet ≥ medyan` aynı kalır; yalnız oran değişir (paket ham servetin ~%5–6'sı). T12 "hibe şişkinliği" servet-ulaşma ölçütünde bu yüzden görünmez; hibeden bağımsız okuma Y7'dedir.
4. **(DÜZELTME: v1 §3a — asıl neden toprak değil aşınma/bakım; bkz. [parsel-v1-bulgular.md](parsel-v1-bulgular.md).)** **Y7 bu botlarla iyimserdir (karıştırıcı faktör).** Yerleşik çiftçilerin toprağı (`tarim.toprakPpm`) ilk ~6 sim gününde 1,0'dan 0,3 tabana düşer; botlar ekim planı/gübre yönetmez; yerleşik gelirleri zamanla düşer, taze topraklı geç katılan emsalini geçer (60. günde geç çiftçi / emsal gelir medyanı ~3–4,6×). Y7'nin "geç katılan işe yarar" sonucu kısmen "taze toprak" etkisidir; tarım yönetimli çiftçi önayarı gelene kadar Y7 üst sınır gibi okunmalıdır. (`--iklim gercek` yan koşusunda aynı örüntü: 24 günde servet ulaşma %22,2, Y7 %100; dosya yazılmadı.)
5. **Ucuz hücre payı bu ölçekte anlamsızca yüksek:** katılım anında uygun hücrelerin %94,7'si ≤ 2× fiyatla (8 yerleşik × ~6–8 hücre / 1.015); eski oyuncuya açık (ayrılmış hariç) pay %76,6. Toplam 201 ayrılmış hücrenin 184'ü katılım anında hâlâ satılmamıştı (17'si yerleşiklerin yurdu/alımıyla gitti); ayrılmış hücre garantisi bu botlarla gerçekten sınanamadı. Kalabalık koşu ve hücre toplayan bot (spekülatör) gerekir.
6. **H8 BELİRSİZ:** Gini %31, en büyük ilçe payı %9,9 (eşik altı); oyuncular arası yeniden satış çekirdekte yok → koşul 3 ölçülemez. Botlar yoğunlaşma yaratmaz; H8'in asıl sınavı spekülatör botudur.
7. **Y ölçütleri:** Y3, Y4, Y8, Y9, Y10 çekirdek durumundan türetilemez (ölçülemez işaretli). Y1, Y2, Y6 türetilir ama botlarda anlamsızdır (Y1: anında kurulum %100; Y2: ≤ 60 dk %72,7 / ≤ 10 dk %0 çünkü ilk Tarla 12 dk sürer; Y6: bot yön değiştirmez); hepsi **insan testi** olarak işaretlidir. Y5 (açılış çeşitliliği): en büyük katman %40 (tarım), hibrit portföy %60 → hedef (≤ %60) tutar.

## v0.3 ile karşılaştırma

Yalnız yön ve sınıf. v0.3'ün H6'sı (0,792 GEÇTİ) aynı pencerede üretim artışı medyanıydı; parsel H6'nın birincil ölçüsü Y7 de aynı pencerenin akışıdır ve GEÇTİ. Servet tabanlı ikincil okuma KALDI; bu fark kip değişiminin değil ölçünün (servet ↔ akış) sonucudur.

## Çekirdekten gözlenen davranışlar (G2'ye bilgi)

`yapi_yerlestir` yurt hücrelerinde arsa almadan çalışır (sermaye = yalnız yapı parası); ilk 5 yapının indirimli ödenen tutarı `InsaatDurumu.odenenPara/odenenMal`'dan okundu; tüm bot komutları ilk denemede kabul edildi (0 red).
