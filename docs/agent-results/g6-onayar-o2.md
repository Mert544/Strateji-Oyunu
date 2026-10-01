# G6 bot önayarı (zincir): O2 teslim raporu, Parça 1

- Dal: `takim/o2/g6-onayar` (taban: P6a paket ucu 1983801; G6-1, G6-2a/2b ve G6-3 verisi içinde). Kod commit'i ve rapor ayrı commit; ilk sürüm acbbedb üstündeydi, yeniden tabanlandı.
- Kaynaklar: A2 bot kuralları `takim/a2/bot-kurallari` 71fd122 (`docs/arastirma/bot-kurallari-g6-g8.md` §2, §5), şartname §15.1 B-1/B-3, §13.

## Ne yapıldı (Parça 1: çatı, rehberli yol, seçici, `netCikti` düzeltmesi)
- `zincir` önayarı (`ParselOnayari`; `PARSEL_G6_ONAYARLARI`; varsayılan `PARSEL_ONAYARLARI` listesi DEĞİŞMEDİ, yuk testi ve bench aynı dağılımı görür): ova ilinde Çiftlik → gıda fabrikası × n_f → Ahır; bakım yönetimi vars. açık, malzeme açığı ithalatla kapanır, yakıt/elektrik için emir yok.
- Yöntem tesis TAMAMLANINCA `yontem_degistir` ile bir kez verilir (A2 §2; `yapi_yerlestir.yontem` alanına bağlı değildir).
  - Rehberli (vars.): n_f = 2, sırayla `degirmen`, `ekmek_firini`.
  - Seçici (`yontemSecici: true`): `parsel-yontem.ts` `fabrikaAta`: bloklar `[standart]` ve `[degirmen, ekmek_firini]`, k + 2j = n_f için TÜM kombinasyonlar; değer = marjinal net (portföy neti, oyuncu dilimi = NPC emilimi / oyuncu sayısı, ihracat/ithalat çarpanı, bakım parçası). Eşitlikte varsayılan yöntem. Sonuç testlerde: n_f = 1 standart, n_f = 2 değirmen + fırın, n_f = 3 standart + değirmen + fırın (A2 §5 tablosuyla aynı).
  - n_f: seçenek `gidaFabrikasi` ya da seçici botta tohum karması `tohumluFabrikaSayisi` (%25/%50/%25; ölçüm raporu n_f dağılımını bununla yazar).
- `netCikti` düzeltmesi (A2 B-3): planlanan/süren/yeni tamamlanmış tesis HEDEF yöntemin net çıktısıyla sayılır; ihracat emri yanlış yöntemin (standart gıda) çıktısına göre verilmez. Yalnız `zincir`; diğer önayarlar bayt bayt aynı (test).
- Ahır kapısı: ekmek tembel kümülatif üretimi 24 saatlik fırın çıktısına ulaşınca ahır kurulur ve `kepek_gubresi` yapılır (A2: "ilk ekmekten 24 sa sonra"; durumsuz bot için kümülatif üretim vekil ölçüdür, **doğrulanmadı**).
- `ParselKomutKaydi.yontem` (yalnız `yontem_degistir` kayıtlarında).
- G6 verisi (G6-3) içerikte yokken yöntem komutu verilmez; zincir bot "çiftlik + standart fabrika" gibi davranır (test).

## Doğrulama
- `botlar/test/parsel-g6.test.ts` 15 test geçti; `parsel.test.ts` ve `parsel-olcek-insaat.test.ts` 44 test geçti (kapı koşarken tek işçiyle).
- Testler A2 tariflerini test kopyasında içeriğe ekler (`g6-yardimci.ts`; gerçek içerik değişmez). `enerjisiz` seçeneği: şebeke enerjisi (G6-2b) çekirdekte olmadığından yeni tariflerin (ve standart yöntemin) elektrik/yakıt girdisi test kopyasında çıkarılır; uçtan uca zincir bu tarifle koşar: un, kepek, ekmek üretilir, ahır ~24 sa sonra kurulur, `kepek_gubresi` olur, `zincir_kapandi` ve `ilk_isleme` (dedektörün `kavramSaglandi` işlevi göreli yolla çağrılır) sağlanır.

## Bu parçada YOK (sonraki parçalar)
1. Gerçek tarifli ve şebekeli sınama: G6-2b ve G6-3 (T3 verisi) girince; kabul ölçütleri (3 tohum: un/kepek/ekmek > 0, ekmek ihracatı ve `musluk.ihracatNpc` artışı, kepek satışı ya da israf < %15, `zincir_kapandi` ≤ 3 sim günü; %15 ve 3 gün PARAMETRE) ve M ölçümü (3 tohum × 7 gün, yalnız seçici botlar, n_f dağılımı raporlu; karma M yalnız bilgi).
2. G7 dükkân önayarı (`dukkanTuru`, `dukkan_raf`, `dukkan_fiyat`, `yerelPazarGorunumu`): K3 G7-2/G7-3 sonrası.
3. Büyük ilçede (> 50 bin hücre) `HucreDiziniBuyukHatasi`: `botlar/src/parsel.ts` ilçe `hucreler` okumaları `ilceHucreleri` üretecine geçmeli (gerçek haritada bot koşusu öncesi).
4. Karar aralığı ve A2'nin bot başına dağılımları (gecikmeler, %35/%25/%40 karma) ölçüm nüfusu tarafındadır (olcum), bot sınıfında değil.

## Geri dönüşü zor kararlar
Yok (önayar adı `zincir` A2 önerisidir; plan sırası A2 B-1 uyarınca kilitlenmelidir).

## Açık sorular
- Seçici değerde TABAN fiyat kullanıldı (A2 `d.pazar.fiyat` der): karar zaman içinde oynamasın ve "bir kez" durumsuz kalsın diye; canlı fiyat ekmek doyumunda (arz/emilim 2,26) seçimi sürekli kaydırırdı.
- `yontemAcikMi` çekirdek dışa aktarımında yok; bot teknoloji şartlı yöntemleri (`gerekliTeknoloji`) hiç seçmez.

## Güncelleme: yeniden tabanlama (1983801) ve gerçek G6 verisi
- Çakışma yalnız `parsel.ts` Bot alanları ve kurucusunda (bakim-c `bakimIthalati`/`onarimYonetimi` ile): ikisi birleştirildi; `zincir` bakım yönetimini vars. açık alır (`bakimAcik`), ithalatla birlikte.
- Test verisi artık GERÇEK G6 içeriği ve şebekeyi kullanır (`g6-yardimci`: gerçekte varsa A2 tarifleri eklenmez; `g6: false` G6 öncesi dünyayı kurar; `sebekesiz`, `enerjisiz` seçenekleri karşıt kanıt içindir). Uçtan uca zincir (un, kepek, ekmek, ahır `kepek_gubresi`, `zincir_kapandi`, `ilk_isleme`) gerçek tarifle koşuyor.
- Kapsam: `packages/botlar/test` tamamı 119 test, tek işçiyle geçti (botlar regresyon altınları dahil).
- Küçük dünya notu: seçici oyuncu dilimini `NPC emilimi / oyuncu sayısı` ile hesaplar (A2: N ≥ 4); tek oyuncuda dilim 4 kat büyük olduğundan ikinci standart tesis de satılır ve seçici standartta kalır. Seçici testinde dünya N = 4 yapıldı; K-1 (100 bot) bu durumdan etkilenmez.
- Hâlâ yok: kabul koşusu (3 tohum, ekmek ihracatı, `musluk.ihracatNpc`, kepek israfı < %15, zincir ≤ 3 gün) ve M ölçümü ayrı parça; G7 dükkân önayarı G7-3 sonrası.
