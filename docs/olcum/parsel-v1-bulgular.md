# Parsel ölçümü v1 — bulgular ve yorum (elle yazılmış)

> Bu dosya **elle yazılmıştır** ve rapor üretiminde ezilmez; `parsel-v1-*.md` raporları yalnız buraya bağlantı verir. Raporlar duvar saati içermez ve aynı girdiyle bayt bayt aynı üretilir (süreler aşağıda, konsol/JSON'dan).
> Önceki ölçüm: [parsel-v0-bulgular.md](parsel-v0-bulgular.md). **v0 dosyaları donmuştur ve çekirdeğin kamu arsası eklemesinden ÖNCE koşulmuştur** (satılabilir uygun hücre 1.015); v1 koşuları güncel çekirdekle (kamu arsası düşülmüş: mini-6'da 583 satılabilir hücre; **P1 sonrası kamu geometrisiyle yeniden üretildi**: sayılar önceki sürüme göre az değişti, bulguların özü aynı) koşuldu. İkisi birebir karşılaştırılmaz; her v1 grubu kendi `temel` koşusuyla karşılaştırılır.
> Yön gösterir, karar değildir: mini-6, küçük örnek, kalibre edilmemiş eşikler, basit botlar. Hepsi iklim "hizli" (gunCarpani 12), tohum başına başlangıç ayı döner.

## Rapor dizini (hangi rapor hangi soruya yanıt verir)

| Soru | Rapor(lar) | Not |
|---|---|---|
| Y7 yerleşik botların bakım/tarım yönetimi yapmamasından ne kadar şişiyor? (60. gün katılımı, tohum 1–10) | [gec60-temel](parsel-v1-gec60-temel.md) (yönetimsiz) · [gec60-tarim](parsel-v1-gec60-tarim.md) · [gec60-bakim](parsel-v1-gec60-bakim.md) · [gec60-tarim-bakim](parsel-v1-gec60-tarim-bakim.md) | Her biri `temel`e bağlı (§5a karşılaştırma); §3a |
| Aynı soru kısa vadede (10. gün katılımı, 24 gün, tohum 1–3) | [kisa-temel](parsel-v1-kisa-temel.md) · [kisa-tarim-bakim](parsel-v1-kisa-tarim-bakim.md) | §3a; ayrıca v0'ın güncel çekirdekle yeniden ölçümü |
| Spekülatör ayrılmış hücreyi tüketir mi, ayrılmış hücre eski oyuncuya karşı tutuyor mu? Spekülatör H8'i zorlar mı? | [spekulator-temel](parsel-v1-spekulator-temel.md) (spekülatörsüz) · [spekulator](parsel-v1-spekulator.md) (3 genç + 3 yaşlı) · [spekulator-yasli](parsel-v1-spekulator-yasli.md) (yalnız 6 yaşlı) | §3b; ayrılmış garanti §3a (rapor içi) |
| Yüksek doluluk geç katılanı bitirir mi? (mini-6, 65 bot) | [kalabalik](parsel-v1-kalabalik.md) | §3c |
| Aynısı sentetik-50 ölçeğinde (313 bot, 100 ilçe) ve süre | [kalabalik-s50](parsel-v1-kalabalik-s50.md) | §3c, §3d; süre ≈ 84 sn (JSON) |
| Önceki (kamu arsası öncesi) ilk ölçüm | [parsel-v0](parsel-v0.md) · [parsel-v0-gec60](parsel-v0-gec60.md) · [bulgular](parsel-v0-bulgular.md) | Donuk; v1 ile birebir karşılaştırılmaz |

**Emsal kuralı (baş lider kararı):** Y7'de ilçe emsali **yalnız üretim yapan** yerleşiklerdir (7 günlük net üretim geliri > 0); gelir 0 ya da negatif olanlar (pasif, spekülatör, zarar eden) emsal medyanına girmez; üreten emsal yoksa Y7 ölçülemez ve H6 BELİRSİZ olur. Bu kural koşulduktan sonra tüm v1 raporları yeniden üretildi; aşağıdaki oranlar bu kuralla hesaplanmıştır (v0 dosyaları eski kuralla, ham emsalle kalmıştır).

## 3a. Tarım yönetimi (ve bakım) — Y7'nin iyimserliği ölçüldü

**Koşular** (60. gün katılımı, 74 gün, tohum 1–10; `--agir`): [temel](parsel-v1-gec60-temel.md), [tarım](parsel-v1-gec60-tarim.md), [bakım](parsel-v1-gec60-bakim.md), [tarım + bakım](parsel-v1-gec60-tarim-bakim.md). Kısa (24 gün, tohum 1–3): [temel](parsel-v1-kisa-temel.md), [tarım + bakım](parsel-v1-kisa-tarim-bakim.md). Her biri `--karsilastir` ile temel koşuya bağlıdır (rapor §5a).

Tarım yönetimi: `ekim_plani` (toprağa göre buğday/baklagil/nadas, histerezisli nöbet) + `gubre_dozu` (gübre ihraç edilmez, stoğa göre doz). Bakım yönetimi (ek): bakım parçası ithalatı + aşınma eşiğinde `genel_onarim`. Ölçü: **gelir/emsal** = geç katılanın son 7 gün net üretim geliri / ilçe emsallerinin (yerleşik) gelir medyanı (10 tohum ortalaması). 100% = emsalle eşit; Y7 eşiği %50.

| 60. gün katılımı | geç çiftçi | geç sanayici | geç pazar | Y7 oyuncu payı | Y7 kararı |
|---|---|---|---|---|---|
| temel (yönetimsiz) | %385 | %218 | %171 | %100 | GEÇTİ |
| + tarım yönetimi | %373 | %218 | %210 | %100 | GEÇTİ |
| + bakım yönetimi | %163 | %399 | %60 | %100 | GEÇTİ |
| + tarım + bakım | %174 | %399 | %80 | %100 | GEÇTİ |
| (24 gün) temel | %189 | %118 | %84 | %100 | GEÇTİ |
| (24 gün) tarım + bakım | %159 | %108 | %81 | %100 | GEÇTİ |

Bulgular:
1. **v0'daki "taze toprak" açıklaması yanlıştı (düzeltme).** v0 bulgusu 4, yerleşik gelir düşüşünü toprak yorgunluğuna bağlıyordu. Tarım yönetimi tek başına gelir/emsal oranını ÇİFTÇİDE neredeyse hiç değiştirmedi (%385 → %373); nöbet planı çıktıyı ~%61'e düşürdüğü için kısa vadede kazanç da sağlamadı. Toprak, yerleşik gelir düşüşünün esas nedeni değil.
2. **Asıl neden aşınma/bakım.** Yerleşik tesisler ilk ~50 sim gününde aşınma %100'e gelir (bakım parçası stokta yok, bakım karşılanma 0); aşınma verimi düşürür. Bakım yönetimi yerleşik çiftçi gelir medyanını 191 bin ₺ → 417 bin ₺ (7 gün, ×2,2) ve yerleşik pazar (tüccar) medyanını 213 bin → 612 bin ₺ çıkardı; geç katılanın geliri değişmedi. Böylece geç çiftçi/emsal %385 → %163, geç pazar/emsal %171 → %60. Yani Y7'nin "geç katılan emsalini geçer" sonucunun büyük kısmı **yerleşik botların bakım yapmamasından** gelir.
3. **Yerleşik sanayicide ters yön:** bakım yönetimi yerleşik sanayicinin NET geliri düşürdü (emsal medyanı 404 bin → 240 bin ₺; geç sanayici/emsal %218 → %399): bakım parçası ithalatı (parça pahalı: 180 ₺/birim) 7 günlük net gelirden düşülür; aşınma kazancı bu pencerede ithalat bedelini karşılamıyor. Bakım yönetiminin getirisi tesise göre değişir.
4. **Y7 kararı sağlam:** hiçbir yönetim kombinasyonunda Y7 oyuncu payı %100'ün altına düşmedi (en dar marj: geç pazar %60, eşik %50). Ancak marj yönetimle daralıyor: yönetimli yerleşiklerle H6 "geç katılan işe yarar" için tampon yaklaşık 1,2×'e iniyor. Dengeli (yönetim yapan) bir oyuncu tabanında Y7 üst sınır değil, sınırda bir ölçüt gibi okunmalıdır.
5. **Bot sınırı:** yönetim komutları botlarda hâlâ basit (sabit eşikler; ölçek yükseltme, ithalat fiyat duyarlılığı yok). `--tarim-yonetimi` yan etkisi: gübre ihraç edilmediği için gübre geliri yok; `gubre_dozu` salınımı histerezisle sınırlandı.

## 3b. Spekülatör — ayrılmış hücre garantisi ve H8

Koşular (geç katılım 20. gün, ölçüm +10 gün = 30 gün, tohum 1–3, yerleşik: 3 çiftçi, 2 sanayici, 2 tüccar, 1 pasif): [temel (spekülatörsüz)](parsel-v1-spekulator-temel.md); [3 genç + 3 yaşlı spekülatör](parsel-v1-spekulator.md); [yalnız 6 yaşlı spekülatör](parsel-v1-spekulator-yasli.md). Genç spekülatör katılımda alıma başlar (ayrılmış hücre hakkı var, önce onları tüketir); yaşlı spekülatör 15. günde başlar (hak bitti).

| | temel | genç + yaşlı | yalnız yaşlı |
|---|---|---|---|
| doluluk (geç katılımdan önce) | %9,8 | %64,2 | %64,0 |
| ayrılmış hücre kalan (boş / 110) | 99 (%90,0) | **1 (%0,9)** | **97 (%88,2)** |
| ayrılmış hücre İHLAL | 0 | 0 | 0 |
| ucuz hücre payı (≤ 2×) | %90,2 | **%4,1** | **%0** |
| H8 Gini (değer) | %16,4 | %46,0 | %44,5 |
| H8 en büyük ilçe payı | %24,1 | %25,0 | %25,0 |
| Y7 oyuncu payı | %100 | %100 | %100 |
| H6 kararı (Y7 + ucuz) | GEÇTİ | **KALDI** | **KALDI** |

Bulgular:
1. **Ayrılmış hücre kuralı eski oyuncuya karşı tutuyor (ihlal 0), ama aynı dönemdeki yeni oyuncuya karşı korumuyor.** Yaşlı spekülatörler ayrılmış hücrelere dokunamadı (97/110 boş; temel koşuda 99); genç spekülatörler katılım gününde yeni oyuncu olarak ayrılmış hücrelerin 109'unu aldı (1/110 kaldı). "Yeni oyuncu" tanımı spekülatör için de geçerli: ilk 14 günde tek hesapla ayrılmış hücreleri toplamak mümkün. Öneri: ayrılmış hücre alımını hesap başına sayıyla (ör. ayrılmışın ≤ %X'i, ya da yalnız yurt komşusu) sınırlamak ya da ayrılmışı "oyun içi yaş + kullanım" şartına bağlamak (lider/G2 kararı).
2. **Ayrılmış hücre var olsa da ucuz hücre garantisi tutmuyor.** Yalnız yaşlı spekülatör koşusunda ayrılmış hücrelerin %88'i boş kalıyor ama "≤ 2× taban fiyat" ölçüsüne göre ucuz hücre payı %0: spekülatör alımları ilçe doluluğunu %50'nin üstüne çıkardığından fiyat çarpanı (1 + 2·satılmış/uygun) her ilçede > 2. Ayrılmış hücre yalnız KULLANILABİLİRLİĞİ korur, FİYATI korumaz (ayrılmış hücre ilçe çarpanıyla satılır). H6'nın ikinci koşulu bu yüzden her iki spekülatör koşusunda KALDI. Öneri: ayrılmış hücreyi sabit/indirimli fiyata bağlamak.
3. **H8:** spekülatörler Gini'yi %16,4 → %46,0'a çıkardı (eşik %60'ın altında) ve en büyük ilçe payı ilçe tavanına (%25) tam dayandı; aşamaz (çekirdek tavanı), eşik "> %25" olduğundan geçer. 72 hücre tavanı bu haritada bağlayıcı değil (ilçe başına uygun ~48 hücre → %25 = 12). Koşul 3 (yeniden satış) **BELİRSİZ**: çekirdekte oyuncular arası arsa devri yok; `parsel_birak` devlete %70 iadeyle bırakır, fiyat oluşmaz. H8 kararı bu yüzden tüm koşularda BELİRSİZ.
4. Spekülatörler hazine ve kit satışıyla sınırlı kaldı (spekülatör başına 45–63 hücre; hibe + kit nakdi ~₺85 bin): tavana yalnız bazı ilçelerde dayanabildiler. Daha agresif bir spekülatör için nakit kaynağı (kredi, üretim geliri) gerekir; üretmeme kuralı gereği eklenmedi.

## 3c. Kalabalık koşu

`--kalabalik`: mini-6'da 62 yerleşik bot (20 çiftçi, 10 sanayici, 10 tüccar, 6 pasif, 8 genç + 8 yaşlı spekülatör) + 3 geç katılan; `--harita sentetik-50` ile 310 + 3.
- [mini-6 kalabalık](parsel-v1-kalabalik.md) (tohum 1–3, 24 gün): 62 yerleşik + 3 geç katılan, tohum başına ≈ 5 sn. Geç katılımdan önce doluluk %100: **hiçbir ilçe yurt veremiyor**. İlçe seçimi (`ilceSec`) üç geç katılan için de **"uygun ilçe yok"** kararı verdi; oyuncular katılmadı (önceki sürümde çekirdeğin yedeğiyle yurtsuz katılıyorlardı) ve ayrı sayaçta tutuldu: "Uygun ilçe yok: 3". Y7 ölçülemez (olgu yok), H6 KALDI (ucuz hücre %0, ayrılmış kalan %0). Gini %35,6, en büyük ilçe payı %25.
- [sentetik-50 kalabalık](parsel-v1-kalabalik-s50.md) (tohum 1, 24 gün, 313 bot, 100 ilçe, 4.728 satılabilir hücre): ≈ 84 sn (JSON; temiz ağaç, yük altında 75–105 sn). Doluluk %77,6; ayrılmış hücre kalan %6,6; ihlal 0; ucuz hücre %0. **Geç çiftçi artık yapı kuruyor:** üç geç katılanın üçü de `ilceSec` ile yurt verebilen + açılışa uygun bir ilçeye katıldı ve 2'şer yapı kurdu (geç çiftçi 1,10 milyon ₺, geç pazar 0,42 milyon ₺ 7 günlük gelir; geç sanayici 0 ₺: 7 günlük pencerede net geliri yok). Ama **Y7 ölçülebilen olgu sayısı 0/3**: seçilen ilçelerde 8–9 emsal var, hiçbiri üretmiyor (yapılı hücresi olan sahip bile yok). Önceki sürümde 1/3 idi (tesadüfen emsalli bir ilçeye düşen geç sanayici). Neden yapısal: üreten emsallerin bulunduğu ilçeler dolu, yurt verebilen ilçelerde emsal yok; "emsal" sıralaması üreten sahibi tercih etse de aday kümesinde üreten emsal yok. H6 KALDI (ucuz hücre %0). Öneri (Y7 tanımı, lider kararı): doygun dünyada emsali ilçe yerine İL düzeyinde (aynı ildeki üreten sahipler) tanımlamak.
- Çıkarım: yüksek doluluk (≥ %77) geç katılanın ucuz hücre ve ayrılmış hücre koşullarını bitiriyor; mini-6'da %100 doluluk "uygun ilçe yok" getiriyor (H6 "geç katılan işe yarar" doygun dünyada yapısal olarak KALDI). Gerçek ölçekte (OSM ızgarası) doluluk tavanı ve geç gelen için yurt rezervi tasarım sorusu olarak kalıyor.
- Ağır test: `BOLGE_AGIR_TEST=1 pnpm vitest run packages/olcum/test/parsel-kosu.test.ts` sentetik-50'de 313 bot, 10 gün (≈ 40 sn) ve süreyi konsola yazar.

## 3d. İlçe seçimi (`ilceSec`) — bulgu 4'ün kapatılması

Koşucu artık geç katılanın ilçesini kendisi seçiyor: yurt verebilen (çekirdeğin `yurtPlanla` yardımcısıyla, kendi kopyamız yok) + açılışa uygun (veri tablosu `ACILIS_ESLEMESI`) ilçeler; il tercihi, üreten emsal, doluluk, kimlik sırasıyla; hiçbiri uygun değilse **katılmaz** ve "uygun ilçe yok: n" olarak sayılır (çekirdeğin yedeği yok). Yerleşik botlar eski davranışı korur (`--ilce-sec` ile yerleşikler de kullanır). Etkilenen raporlar: kalabalık (mini-6 ve sentetik-50: yukarıda) ve spekülatör (geç pazar farklı ilçe seçti: gelir/emsal %120 → %204; Y7 %100 ve H6 KALDI aynı). Diğer 7 rapor (gec60 ×4, kisa ×2, spekülatör-temel) bayt bayt aynı: seyrek dünyada eski ve yeni seçim aynı ilçeyi veriyor. Bulguların özü değişmedi; yeni: doygun dünyada Y7 emsali yapısal olarak bulunamıyor.

## Yeniden üretim

```
pnpm olcum --kip parsel --agir --ad v1-gec60-temel --bulgular parsel-v1-bulgular.md --cikti docs/olcum
pnpm olcum --kip parsel --agir [--tarim-yonetimi] [--bakim-yonetimi] --karsilastir docs/olcum/parsel-v1-gec60-temel.json --ad v1-gec60-<...> --bulgular parsel-v1-bulgular.md --cikti docs/olcum
pnpm olcum --kip parsel --gec-gun 20 --olcum-gunu 10 --spekulator-gun 15 --bot ciftci=3,sanayici=2,tuccar=2,pasif=1,spekulator=3,spekulatorYasli=3 --karsilastir docs/olcum/parsel-v1-spekulator-temel.json --ad v1-spekulator ...
pnpm olcum --kip parsel --kalabalik [--harita sentetik-50 --tohum 1] --karsilastir docs/olcum/parsel-v1-kisa-temel.json --ad v1-kalabalik ...
```
