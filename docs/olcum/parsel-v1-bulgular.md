# Parsel ölçümü v1 — bulgular ve yorum (elle yazılmış)

> Bu dosya **elle yazılmıştır** ve rapor üretiminde ezilmez; `parsel-v1-*.md` raporları yalnız buraya bağlantı verir. Raporlar duvar saati içermez ve aynı girdiyle bayt bayt aynı üretilir (süreler aşağıda, konsol/JSON'dan).
> Önceki ölçüm: [parsel-v0-bulgular.md](parsel-v0-bulgular.md). **v0 dosyaları donmuştur ve çekirdeğin kamu arsası eklemesinden ÖNCE koşulmuştur** (satılabilir uygun hücre 1.015); v1 koşuları güncel çekirdekle (kamu arsası düşülmüş: mini-6'da 583 satılabilir hücre; **P1 sonrası kamu geometrisiyle yeniden üretildi**: sayılar önceki sürüme göre az değişti, bulguların özü aynı) koşuldu. İkisi birebir karşılaştırılmaz; her v1 grubu kendi `temel` koşusuyla karşılaştırılır.
> Yön gösterir, karar değildir: mini-6, küçük örnek, kalibre edilmemiş eşikler, basit botlar. Hepsi iklim "hizli" (gunCarpani 12), tohum başına başlangıç ayı döner.

## Rapor dizini (hangi rapor hangi soruya yanıt verir)

| Soru | Rapor(lar) | Not |
|---|---|---|
| Y7 yerleşik botların bakım/tarım yönetimi yapmamasından ne kadar şişiyor? (60. gün katılımı, tohum 1–10) | [gec60-temel](parsel-v1-gec60-temel.md) (yönetimsiz) · [gec60-tarim](parsel-v1-gec60-tarim.md) · [gec60-bakim](parsel-v1-gec60-bakim.md) · [gec60-tarim-bakim](parsel-v1-gec60-tarim-bakim.md) | Her biri `temel`e bağlı (§5a karşılaştırma); §3a |
| Aynı soru kısa vadede (10. gün katılımı, 24 gün, tohum 1–3) | [kisa-temel](parsel-v1-kisa-temel.md) · [kisa-tarim-bakim](parsel-v1-kisa-tarim-bakim.md) | §3a; ayrıca v0'ın güncel çekirdekle yeniden ölçümü |
| Spekülatör ayrılmış hücreyi tüketir mi, ayrılmış hücre eski oyuncuya karşı tutuyor mu? Spekülatör H8'i zorlar mı? | [spekulator-temel](parsel-v1-spekulator-temel.md) (spekülatörsüz) · [spekulator](parsel-v1-spekulator.md) (3 genç + 3 yaşlı) · [spekulator-yasli](parsel-v1-spekulator-yasli.md) (yalnız 6 yaşlı) | §3b (P2 sonrası: tavan + taban fiyat); ayrılmış garanti §3a (rapor içi) |
| Yüksek doluluk geç katılanı bitirir mi? (mini-6, 65 bot) | [kalabalik](parsel-v1-kalabalik.md) | §3c |
| Aynısı sentetik-50 ölçeğinde (313 bot, 100 ilçe) ve süre | [kalabalik-s50](parsel-v1-kalabalik-s50.md) | §3c, §3d; süre 75–260 sn (JSON; yüke bağlı) |
| Sentetik-50 kalabalıkta H6'nın GEÇTİ'ye dönüşü hangi etkenden? (5 ayar × 3 bot tohumu) | [ayrıştırma](parsel-v1-ayristirma.md) · koşular [a](parsel-v1-ayristirma-a.md) [b](parsel-v1-ayristirma-b.md) [c](parsel-v1-ayristirma-c.md) [d](parsel-v1-ayristirma-d.md) [e](parsel-v1-ayristirma-e.md) | §3f |
| Önceki (kamu arsası öncesi) ilk ölçüm | [parsel-v0](parsel-v0.md) · [parsel-v0-gec60](parsel-v0-gec60.md) · [bulgular](parsel-v0-bulgular.md) | Donuk; v1 ile birebir karşılaştırılmaz |

**Emsal kuralı (baş lider kararı):** Y7'de ilçe emsali **yalnız üretim yapan** yerleşiklerdir (7 günlük net üretim geliri > 0); gelir 0 ya da negatif olanlar (pasif, spekülatör, zarar eden) emsal medyanına girmez; üreten emsal yoksa Y7 ölçülemez ve H6 BELİRSİZ olur. Bu kural koşulduktan sonra tüm v1 raporları yeniden üretildi; aşağıdaki oranlar bu kuralla hesaplanmıştır (v0 dosyaları eski kuralla, ham emsalle kalmıştır).

## 3a. Tarım yönetimi (ve bakım) — Y7'nin iyimserliği ölçüldü

**Koşular** (60. gün katılımı, 74 gün, tohum 1–10; `--agir`): [temel](parsel-v1-gec60-temel.md), [tarım](parsel-v1-gec60-tarim.md), [bakım](parsel-v1-gec60-bakim.md), [tarım + bakım](parsel-v1-gec60-tarim-bakim.md). Kısa (24 gün, tohum 1–3): [temel](parsel-v1-kisa-temel.md), [tarım + bakım](parsel-v1-kisa-tarim-bakim.md). Her biri `--karsilastir` ile temel koşuya bağlıdır (rapor §5a).

Tarım yönetimi: `ekim_plani` (toprağa göre buğday/baklagil/nadas, histerezisli nöbet) + `gubre_dozu` (gübre ihraç edilmez, stoğa göre doz). Bakım yönetimi (ek): bakım parçası ithalatı + aşınma eşiğinde `genel_onarim`. Ölçü: **gelir/emsal** = geç katılanın son 7 gün net üretim geliri / ilçe emsallerinin (yerleşik) gelir medyanı (10 tohum ortalaması). 100% = emsalle eşit; Y7 eşiği %50.

| 60. gün katılımı | geç çiftçi | geç sanayici | geç pazar | Y7 oyuncu payı | Y7 kararı |
|---|---|---|---|---|---|
| temel (yönetimsiz) | %385 | %218 | %171 | %100 | GEÇTİ |
| + tarım yönetimi | %373 | %218 | %210 | %100 | GEÇTİ |
| + bakım yönetimi | %163 | %358 | %60 | %100 | GEÇTİ |
| + tarım + bakım | %174 | %358 | %80 | %100 | GEÇTİ |
| (24 gün) temel | %189 | %118 | %84 | %100 | GEÇTİ |
| (24 gün) tarım + bakım | %159 | %108 | %81 | %100 | GEÇTİ |

Bulgular:
1. **v0'daki "taze toprak" açıklaması yanlıştı (düzeltme).** v0 bulgusu 4, yerleşik gelir düşüşünü toprak yorgunluğuna bağlıyordu. Tarım yönetimi tek başına gelir/emsal oranını ÇİFTÇİDE neredeyse hiç değiştirmedi (%385 → %373); nöbet planı çıktıyı ~%61'e düşürdüğü için kısa vadede kazanç da sağlamadı. Toprak, yerleşik gelir düşüşünün esas nedeni değil.
2. **Asıl neden aşınma/bakım.** Yerleşik tesisler ilk ~50 sim gününde aşınma %100'e gelir (bakım parçası stokta yok, bakım karşılanma 0); aşınma verimi düşürür. Bakım yönetimi yerleşik çiftçi gelir medyanını 191 bin ₺ → 417 bin ₺ (7 gün, ×2,2) ve yerleşik pazar (tüccar) medyanını 213 bin → 612 bin ₺ çıkardı; geç katılanın geliri değişmedi. Böylece geç çiftçi/emsal %385 → %163, geç pazar/emsal %171 → %60. Yani Y7'nin "geç katılan emsalini geçer" sonucunun büyük kısmı **yerleşik botların bakım yapmamasından** gelir.
3. **Yerleşik sanayicide ters yön:** bakım yönetimi yerleşik sanayicinin NET geliri düşürdü (emsal medyanı 404 bin → 267 bin ₺; geç sanayici/emsal %218 → %358): bakım parçası ithalatı (parça pahalı: 180 ₺/birim) 7 günlük net gelirden düşülür; aşınma kazancı bu pencerede ithalat bedelini karşılamıyor. Bakım yönetiminin getirisi tesise göre değişir.
4. **Y7 kararı sağlam:** hiçbir yönetim kombinasyonunda Y7 oyuncu payı %100'ün altına düşmedi (en dar marj: geç pazar %60, eşik %50). Ancak marj yönetimle daralıyor: yönetimli yerleşiklerle H6 "geç katılan işe yarar" için tampon yaklaşık 1,2×'e iniyor. Dengeli (yönetim yapan) bir oyuncu tabanında Y7 üst sınır değil, sınırda bir ölçüt gibi okunmalıdır.
5. **Bot sınırı:** yönetim komutları botlarda hâlâ basit (sabit eşikler; ölçek yükseltme, ithalat fiyat duyarlılığı yok). `--tarim-yonetimi` yan etkisi: gübre ihraç edilmediği için gübre geliri yok; `gubre_dozu` salınımı histerezisle sınırlandı.

## 3b. Spekülatör — ayrılmış hücre garantisi ve H8 (P2 + P3b sonrası)

**Bu bölüm P2 (çekirdek: ayrılmış hücre hesap tavanı + taban fiyat) ile yeniden üretildi.** P2 öncesi sürümün sonuçları aşağıda "önceki" olarak anılır. Çekirdek kuralı: ayrılmış hücre her zaman sınıf tabanından satılır ve kıtlık eğrisine girmez (eğri `satilmisHucre − ayrilmisSatilmis` ile çalışır); hesap başına en çok `ayrilmisHucreHesapTavani` (12, yurt dahil) ayrılmış hücre. Botlar (spekülatör dahil) kotaya kadar ayrılmışı taban fiyattan alır, kota dolunca normal hücrelere geçer; reddedilen komut yok.

**P3b (çok hesap kuralları):** ayrılmış hücre YALNIZ hesabın katılım ilçesinde (`katilimIlcesi`: yurt ilçesi; yurtsuzda `oyuncu_katil.ilce`; ikisi de yoksa ayrılmış alınamaz), ilk 14 günde, hesap başına 12 hücre, ve ilçe başına GÜNLÜK ayrılmış satış tavanıyla (max(6, %10 × ilçenin ayrılmış stoku)) satılır. Botlar ayrılmışı bu kuralların içinde alır, kalanını normal hücreden; koşucu `oyuncu_katil`'e katılım ilçesini her zaman verir.

**P3d (yurt kuralı, bu sürüm):** `yurtAyrilmisSonra`: yurt önce ayrılmış OLMAYAN hücrelerden kurulur (ayrılmış havuz geç gelenler içindir; bağlı küme kurulamıyorsa ayrılmış yedek olarak girer). Aşağıdaki sayılar P2 + P3b + P3d'li çekirdekle (3ad8168 tabanı); "P3b sonrası" etiketli değerler bir önceki (3e4c94d) sürümdür. Üç etkenin ayrı katkısı §3f'te.

Koşular (geç katılım 20. gün, ölçüm +10 gün = 30 gün, tohum 1–3, yerleşik: 3 çiftçi, 2 sanayici, 2 tüccar, 1 pasif): [temel (spekülatörsüz)](parsel-v1-spekulator-temel.md); [3 genç + 3 yaşlı spekülatör](parsel-v1-spekulator.md); [yalnız 6 yaşlı spekülatör](parsel-v1-spekulator-yasli.md). Genç spekülatör katılımda alıma başlar (ayrılmış hücre hakkı var, kotaya kadar onları tüketir); yaşlı spekülatör 15. günde başlar (hak bitti).

| | temel | genç + yaşlı | yalnız yaşlı |
|---|---|---|---|
| ayrılmış hücre kalan (geç katılımdan önce, boş / 110) | 104 (%94,5) (P3b sonrası: 96) | **89 (%80,9)** (P3b sonrası: 83; P2: 59; P2 öncesi: 1) | 104 (%94,5) (P3b sonrası: 94) |
| ayrılmış hücre İHLAL | 0 | 0 | 0 |
| ucuz hücre payı (≤ 2×) — ESKİ TANIM, bilgi | %90,2 | **%15,3** (P3b sonrası: %14,2; P2 öncesi: %4,1) | **%19,4** (P3b sonrası: %16,1; P2 öncesi: %0) |
| · bunun ayrılmış (taban fiyatlı) kısmı | %17,8 (104 hücre) | %15,3 (89 hücre; genel ucuz 0) | %17,8 (104 hücre; genel ucuz 9) |
| H8 Gini (değer) | %16,1 (P3b sonrası: %16,4) | %46,0 (P3b sonrası: %47,1) | %44,2 (P3b sonrası: %45,0) |
| H8 en büyük ilçe payı | %20,7 | %25,0 | %25,0 |
| Y7 oyuncu payı | %100 | %100 | %100 |
| H6 kararı (eski: Y7 + ucuz hücre ≥ %20) | GEÇTİ | **KALDI** (%15,3) | **KALDI** (%19,4: eşiğin hemen altında) |
| H6 kararı (YENİ: Y7 + açılış koşulu, §3e) | GEÇTİ | **GEÇTİ** | **GEÇTİ** |

Ayrılmış hücreleri kim aldı (tohum 1, koşu sonu, `ParselOyuncuOzeti.ayrilmisHucre`; yurt dahil): genç + yaşlı koşusunda toplam 32 (P3b sonrası: 37; P2: 57): 3 genç spekülatör 15 (P3b sonrası: 11; P2: 36), 3 yaşlı spekülatör 0 (P3b sonrası: 2: yurt kuralı yaşlıların yurdunu ayrılmışın dışına çıkardı), 3 geç katılan 11, yerleşik çiftçi/sanayici/tüccar/pasif 6 (P3b sonrası: 14: yurtları artık ayrılmış almıyor). Yalnız yaşlı koşusunda toplam 17 (yaşlılar 0, geç katılan 11, yerleşikler 6); temelde 11 (yerleşik 6, geç 5).

Bulgular:
1. **"Ayrılmış hücre fiyatı korumuyor" bulgusu KAPANDI (fiyat tarafı), kullanılabilirlik tarafı KISMEN.** Önceki sürümde ayrılmış hücre ilçe çarpanıyla satılıyordu; yalnız yaşlı koşusunda ayrılmışın %88'i boş olduğu hâlde ucuz hücre payı %0'dı. P2 ile ayrılmış hücre taban fiyatlıdır ve doluluk eğrisine girmez: aynı koşuda ucuz payı %0 → %16,1 ve bu pay tamamen boş ayrılmış hücrelerden gelir (94 hücre, hepsi ≤ 2× taban). Ayrılmış hücrenin kullanılabilirliği de düzeldi: genç spekülatörler artık tek hesapla ayrılmışı bitirmiyor (tavan 12/hesap; 3 genç spekülatör 36 aldı), kalan %0,9 → %53,6, 109 → 51 satılan. **Ama tavan hesap başınadır:** çok hesaplı alıcıya karşı koruma yok. Kalabalık koşuda (16 spekülatör, 8'i genç; 65 oyuncu) ayrılmış hücre yine tükendi (mini-6: 110/110, kalan %0; sentetik-50: 808/897, kalan %9,9). Yani P2, tek hesabın tüketmesini engeller; kalabalık dünyada tüketimi engellemez. **P3b ile tek-hesap koruması güçlendi ama çok-hesap açığı tam kapanmadı:** genç spekülatörlerin aldığı ayrılmış 36 → 11, genç+yaşlı koşusunda kalan %53,6 → %75,5 (83/110). Kalabalık koşuda (16 spekülatör, 65 oyuncu) mini-6'da ayrılmışın yine neredeyse tamamı gitti: 103/110 satıldı, kalan 7 (%6,4; P2: 0, P2 öncesi: 0): alıcılar yerleşikler 66 (yurt hücreleri dahil), genç spekülatör 29, yaşlı 8; yani P3b'de ayrılmışın büyük kısmı artık spekülatörden değil, yurtlarla yerleşiklere gidiyor (yurt ayrılmış hücreleri kapsıyor). Sentetik-50'de (313 bot, 4.728 hücre) ayrılmış kalan %36,6 (328/897; P2: %9,9; P2 öncesi: %6,6): genç spekülatörler 163 (P2: 451), yerleşikler 363, geç katılanlar 3. **P3d ile yurt kaynaklı tüketim de bitti:** yerleşiklerin ve yaşlıların yurt hücrelerinden ayrılmışa giden pay kalktı; genç+yaşlı koşusunda kalan %75,5 → %80,9 (89/110), temelde %87,3 → %94,5. Kalabalıkta ayrılmış tüketimi §3c/§3f'te.
2. **H6 kararı (ESKİ tanımla) spekülatör koşularında KALDI; bu tanım §3e'de değiştirildi (yeni tanımla GEÇTİ).** Y7 her iki koşuda %100 (geçer). Ucuz hücre payı %15,3 ve %19,4, eşik %20'nin altında. Yapısal not: ayrılmış hücre ilçenin uygun hücrelerinin %20'sidir (mini-6'da 110/583 = %18,9; sentetik-50'de 897/4.728 = %19,0) ve tek ucuz kaynağı odur; **ayrılmışın tek hücresi bile tüketildiğinde, genel ucuz hücre de yoksa, ucuz payı %20 eşiğinin altına düşer.** Eşiği geçen tek durum, dünyanın seyrek olduğu (genel ucuz hücre çok) temel koşudur (%90,2). Bu öneri baş lider tarafından kabul edildi (docs/12 §13): ucuz hücre eşiği kalktı, yerine açılış koşulu geldi (§3e).
3. **H8:** spekülatörler Gini'yi %16,1 → %46,0'a çıkardı (eşik %60'ın altında; P3b sonrası: %47,1; P2: %47,7; P2 öncesi: %46,0) ve en büyük ilçe payı ilçe tavanına (%25) tam dayandı; aşamaz, eşik "> %25" olduğundan geçer. Koşul 3 (yeniden satış) **BELİRSİZ**: çekirdekte oyuncular arası arsa devri yok; `parsel_birak` devlete %70 iadeyle bırakır, fiyat oluşmaz. H8 kararı bu yüzden tüm koşularda BELİRSİZ.
4. Spekülatörler hazine ve kit satışıyla sınırlı kaldı: tavana (12 ayrılmış + normal hücreler, ilçe %25) yalnız bazı ilçelerde dayanabildiler. Daha agresif bir spekülatör için nakit kaynağı (kredi, üretim geliri) gerekir; üretmeme kuralı gereği eklenmedi.

## 3c. Kalabalık koşu

`--kalabalik`: mini-6'da 62 yerleşik bot (20 çiftçi, 10 sanayici, 10 tüccar, 6 pasif, 8 genç + 8 yaşlı spekülatör) + 3 geç katılan; `--harita sentetik-50` ile 310 + 3.
- [mini-6 kalabalık](parsel-v1-kalabalik.md) (tohum 1–3, 24 gün): 62 yerleşik + 3 geç katılan, tohum başına ≈ 13 sn. Geç katılımdan önce doluluk %100: **hiçbir ilçe yurt veremiyor**. İlçe seçimi (`ilceSec`) üç geç katılan için de **"uygun ilçe yok"** kararı verdi; oyuncular katılmadı ve ayrı sayaçta tutuldu: "Uygun ilçe yok: 3". Y7 ve açılış koşulu ölçülemez (olgu yok), H6 BELİRSİZ (eski tanım: ucuz hücre %1,9). **Ayrılmış kalan 11/110 = %10,0** (P3b sonrası: 7; P2: 0): 99 satıldı, alıcılar yerleşik 44 (P3b sonrası: 66), genç spekülatör 38 (29), yaşlı 17 (8). Yani çok hesap kuralları ve yurt kuralı birlikte bile ayrılmışın tükenmesini kalabalık mini-6'da önlemedi; dağılım yurt hücrelerinden spekülatörlere kaydı. Gini %31,4, en büyük ilçe payı %25.
- [sentetik-50 kalabalık](parsel-v1-kalabalik-s50.md) (tohum 1, 24 gün, 313 bot, 100 ilçe, 4.728 satılabilir hücre): süre 75–260 sn (JSON; yüke bağlı; bu koşuda ≈ 185 sn, ağır vitest ve ayrıştırma koşularıyla eşzamanlı). **Ayrılmış hücre kalan 512/897 (%57,1)** (P3b sonrası: 328 = %36,6; P2: 89 = %9,9; P2 öncesi %6,6); ihlal 0; eski tanım ucuz hücre %10,8 (512 hücre, hepsi ayrılmış, taban fiyatlı). Ayrılmışı alanlar: 40 genç spekülatör 151 (P3b sonrası: 163; P2: 451), 40 yaşlı 0 (P3b sonrası: 43), yerleşik çiftçi/sanayici/tüccar/pasif 234 (P3b sonrası: 363), geç katılanlar 13. Gini %43,8 (P3b sonrası: %44,3), en büyük ilçe payı %25. **Geç katılanlar `ilceSec` ile yurt verebilen + açılışa uygun ve ayrılmış boşu ayak izine yeten ilçelere katıldı.** **Y7 ölçülebilen olgu 2/3**: geç sanayici ve pazarın ilçelerinde 3/9 ve 3/7 üreten emsal var (ikisi de geçti); geç çiftçinin ilçesinde 0/9, ilinde 0/15 üreten emsal (ölçülemez; il yedeği ölçemiyor, bölge yedeği yok). Y7 oyuncu payı %100 (2/2). **Açılış koşulu (i) 3/3 tutuyor** (katılım anı ayrılmış boş 11/5/5, ayak izi 2/3/2) → **H6 GEÇTİ** (P2'de KALDI). Bu sonucun hangi etkenden geldiği §3f'te ayrıştırıldı.
- Çıkarım: yüksek doluluk (≥ %77) geç katılanın ucuz hücre ve ayrılmış hücre koşullarını bitiriyor; mini-6'da %100 doluluk "uygun ilçe yok" getiriyor (H6 "geç katılan işe yarar" doygun dünyada (mini-6) ölçülemiyor). Gerçek ölçekte (OSM ızgarası) doluluk tavanı ve geç gelen için yurt rezervi tasarım sorusu olarak kalıyor.
- Ağır test: `BOLGE_AGIR_TEST=1 pnpm vitest run packages/olcum/test/parsel-kosu.test.ts` sentetik-50'de 313 bot, 10 gün (≈ 40 sn) ve süreyi konsola yazar.

## 3d. İlçe seçimi (`ilceSec`) — bulgu 4'ün kapatılması

Koşucu artık geç katılanın ilçesini kendisi seçiyor: yurt verebilen (çekirdeğin `yurtPlanla` yardımcısıyla, kendi kopyamız yok) + açılışa uygun (veri tablosu `ACILIS_ESLEMESI`) ilçeler; il tercihi, üreten emsal, doluluk, kimlik sırasıyla; hiçbiri uygun değilse **katılmaz** ve "uygun ilçe yok: n" olarak sayılır (çekirdeğin yedeği yok). Yerleşik botlar eski davranışı korur (`--ilce-sec` ile yerleşikler de kullanır). Etkilenen raporlar: kalabalık (mini-6 ve sentetik-50: yukarıda) ve spekülatör (geç pazar farklı ilçe seçti: gelir/emsal %120 → %204; Y7 %100 ve H6 KALDI aynı). (İlçe seçimi anındaki durum; P2 sonrası tüm raporlar yeniden üretildi.) Diğer 7 rapor (gec60 ×4, kisa ×2, spekülatör-temel) o zaman bayt bayt aynıydı: seyrek dünyada eski ve yeni seçim aynı ilçeyi veriyor. Bulguların özü değişmedi; yeni: doygun dünyada Y7 emsali yapısal olarak bulunamıyor.

## 3e. H6 ikinci koşul (açılış koşulu) ve Y7 emsalinde il yedeği

**Kararlar (baş lider, 1 Ekim; docs/12 §13):** (1) H6'nın "uygun hücrelerin %20'si ucuz" eşiği kalktı; yerine (i) katılım anında katılınan ilçede taban fiyatlı (ayrılmış, satılmamış) hücre sayısı açılışın **ayak izine** yeter ve (ii) katılımdan sonra 14 günde en az bir açılış yapısı kuruldu; **karara yalnız (i) girer, (ii) bot ölçeğinde bilgisiz olduğundan bilgi olarak hesaplanır ve "insan testi gerekli" diye işaretlidir** (baş lider). Eski ölçüt raporda "eski tanım (ucuz hücre payı ≥ %20)" satırında bilgi olarak kalır. (2) Y7'de emsal önce ilçenin üreten yerleşikleri; ilçede üreten yoksa aynı ilin üreten yerleşikleri; **bölge düzeyinde yedek YOK** (ikisinde de yoksa Y7 "ölçülemez" kalır: dürüst sonuç); rapor emsal düzeyini (ilçe/il) ayrı sütunda gösterir. (3) `ilceSec` sıralamasında ayrılmış boş hücresi açılış ayak izine yeten ilçeler ÖNCE gelir (gerçek oyuncunun Yerleş ekranı da aynı ölçütle öneri verecek); hiçbiri yetmiyorsa eski sıra sürer.

**Ayak izi kuralı (G4 önerisi, lider onayladı):** ayak izi = açılışın ilk yapı türlerinin en küçük hücre sayısı (tür yuvası; çiftçi/pazar: çiftlik|mera, sanayici: hidro santrali; verideki `yuva`, mini-6'da 2/3/2), **yurt hücreleri hariç**: yurt ayrı ve ücretsiz verilir. Bilgi sütununda yurt DAHİL sayım (ayrılmış boş + 6 yurt) de gösterilir. Koşul sayı denetimidir; kenar-bitişiklik ölçülmez.

| Koşu | Y7 | Açılış (i) taban hücre ayak izine yeter (KARAR) | (i) yurt dahil (bilgi) | (ii) 14 günde yapı (bilgi; insan testi gerekli) | H6 (yeni) | H6 eski tanım (ucuz ≥ %20) |
|---|---|---|---|---|---|---|
| gec60 ×4, kisa ×2, spekülatör-temel (seyrek dünya) | GEÇTİ %100 | %100 | %100 | %100 | **GEÇTİ** | GEÇTİ (spekülatör-temel %90,2) |
| spekülatör (3 genç + 3 yaşlı) | GEÇTİ %100 | %100 (katılım anı ayrılmış boş 8–10, ayak izi 2–3) | %100 | %100 | **GEÇTİ** | KALDI (%15,3) |
| yalnız yaşlı spekülatör | GEÇTİ %100 | %100 | %100 | %100 | **GEÇTİ** | KALDI (%19,4) |
| mini-6 kalabalık | ölçülemez | ölçülemez ("uygun ilçe yok": olgu yok) | — | — | **BELİRSİZ** | KALDI (%1,9) |
| sentetik-50 kalabalık | %100 (2/2 ölçülebilir; 1 ölçülemez) | **%100** (katılım anı ayrılmış boş 11/5/5; P2 koşusunda %0'dı) | %100 | %100 | **GEÇTİ** (P2'de KALDI) | KALDI (%10,8) |

Bulgular:
1. **Yeni ölçüt eski eşiğin yapısal çelişkisini giderdi:** spekülatör koşuları artık GEÇTİ (ayrılmışın yarısı ya da çoğu duruyor ve geç katılan açılışını kurabiliyor); eski %20 eşiği ayrılmış payı (~%19) yüzünden ayrılmışın tek hücresi tüketilince bile tutmuyordu. Ölçüt artık gerçek soruyu soruyor: geç gelen kendi ilçesinde taban fiyatla ayak izi kadar hücre bulabiliyor mu ve kurabiliyor mu.
2. **Yeni ölçütün ayırt ettiği durum: sentetik-50 kalabalık (P2 koşusunda KALDI; P3b, P3d ile GEÇTİ).** P2 koşusunda dünyada 89 boş ayrılmış hücre vardı ama geç katılanların açılışa uygun ilçelerinin hiçbirinde ayak izine yetecek kadar yoktu (yurt dahil sayım geçirirdi). Sonraki sürümlerde ayrılmış kalan 328 (P3b), 512 (P3b + P3d) oldu ve 3/3 olguda (i) tutuyor. Hangi etkenin ne kadar katkı yaptığı §3f'te ayrıştırıldı: **ilceSec önceliği hiçbir etki yapmıyor; P3b ve P3d yurt kuralının HER BİRİ tek başına (i)'yi geri getirmeye yetiyor.** Kalabalık mini-6'da ayrılmış hâlâ tükeniyor (kalan %10,0) ve geç katılanlar zaten katılamıyor ("uygun ilçe yok"), (i) ölçülemiyor, H6 BELİRSİZ.
3. **(ii) bot ölçeğinde bilgisizdir ve karara girmez:** botlar katılım anında kurar (ilk yapı 0,00 gün; tüm koşularda %100); yalnız "kurulamıyor" durumunu yakalardı. Hesaplanır, raporda ve tanım dosyasında "insan testi gerekli" diye işaretlidir.
4. **Y7 il yedeği hiçbir olguyu değiştirmedi:** tüm koşularda il yedeğiyle ölçülen olgu yok. Seyrek dünyada ilçede üreten emsal zaten var (ilçe düzeyi); sentetik-50'de geç çiftçinin ilçesinde 0/9, ilinde 0/15 üreten emsal var, yedek de ölçemiyor (Y7 2/3 ölçülebilir). Yedek kod ve testli (ilçe→il sırası, sınırlar), ama bu dünyalarda tetiklenmiyor; bölge düzeyinde yedek YOKTUR (baş lider kararı): ikisinde de emsal yoksa Y7 "ölçülemez" kalır, bu dürüst bir sonuçtur.

## 3f. Ayrıştırma: sentetik-50 kalabalıkta H6 neden GEÇTİ'ye döndü?

**Soru (baş lider):** sentetik-50 kalabalık koşuda H6 (i) neden tutmaya başladı: P3b çok hesap kuralları mı, `ilceSec`'in ayrılmış önceliği mi (P3d yurt kuralı sonradan geldi, o da eklendi)? **Yöntem:** aynı bot dağılımıyla (313 bot) beş ayar, her biri 3 koşu tohumu; tablo ve ham veri [parsel-v1-ayristirma.md](parsel-v1-ayristirma.md) (+ koşu başına `parsel-v1-ayristirma-{a..e}.md/.json`). Ayarlar koşucu seçeneğiyle kapatılır (`--p3b-kapali`, `--oncelik-kapali`, `--yurt-kurali-kapali`; veri kopyası, parametreler.json değişmez). Taban 3ad8168.

**Tohum varyansı (düzeltme):** ilk ara koşuda (bot tohumu yok) üç koşu tohumu BİREBİR aynı sonuç verdi: koşu tohumu yalnız iklim başlangıç ayını döndürür; bot karar ve katılım sırası sabitti, yani "3 tohum" bir tekrar değildi. Bu yüzden `--bot-tohum` eklendi (deterministik; botlar ve ölçüm içinde): her koşu tohumu için etkin bot tohumu = karma(7, koşu tohumu); bot katılım/karar sırası karışır, tam eşit seçimler (ilçe eşitlikleri, ilk yapı hücresi grubu, spekülatör ilçe sırası) tohumlu bozulur. Varsayılan (bot tohumu yok) değişmez: diğer tüm raporlar aynı yöntemle. Aşağıdaki tablo bu 3 gerçek tekrar üzerinden ortalama (en düşük–en yüksek).

| Koşu | Ayarlar (P3b · ilceSec önceliği · yurt kuralı) | Ayrılmış kalan (/897) | Açılış (i) olgu | Y7 ölçülebilen olgu | H6 yeni (tohum başına) | H6 eski tanım | Genç spekülatör | Yerleşik + yurt | Yaşlı | Geç |
|---|---|---|---|---|---|---|---|---|---|---|
| e | KAPALI · KAPALI · KAPALI (P2 durumu) | 92 (86–102) | **0 / 9** | 5 / 9 | KALDI ×3 | KALDI ×3 | 461 | 302 (295–311) | 42 | 0 |
| b | KAPALI · AÇIK · AÇIK | 242 (230–255) | 9 / 9 | 1 / 9 (0–1) | BELİRSİZ · BELİRSİZ · GEÇTİ | KALDI ×3 | 467 (462–471) | 188 (180–196) | 0 | 9 (6–15) |
| d | AÇIK · AÇIK · KAPALI | 342 (326–358) | 9 / 9 | 1 / 9 (0–1) | BELİRSİZ · GEÇTİ · BELİRSİZ | KALDI ×3 | 171 (158–190) | 342 (334–350) | 42 (39–47) | 5 (4–8) |
| a | AÇIK · KAPALI · AÇIK | 537 (534–541) | 9 / 9 | 4 / 9 (1–2) | GEÇTİ ×3 | KALDI ×3 | 139 (134–144) | 222 (218–229) | 0 | 12 (11–15) |
| c | AÇIK · AÇIK · AÇIK (bugünkü) | 537 (534–541) | 9 / 9 | 4 / 9 (1–2) | GEÇTİ ×3 | KALDI ×3 | 139 (134–144) | 222 (218–229) | 0 | 12 (11–15) |

**Katkılar (ayrılmış kalan, 897 üzerinden; ortalama):**
- **`ilceSec` ayrılmış önceliği: 0.** a ile c birebir aynı (tüm sayılar ve seçilen ilçeler). Yeni ölçütün tek geri dönüş nedeni bu değil, hiç neden değil.
- **P3b çok hesap kuralları: +250** (yurt kuralı kapalıyken e → d: 92 → 342) ve **+295** (yurt kuralı açıkken b → c: 242 → 537). Mekanizma: genç spekülatörlerin ayrılmış tüketimi 461 → 171 (d) / 467 → 139 (c). Spekülatörün tükettiğini kesen asıl kural budur; yurt kuralı onu etkilemiyor (b'de 467).
- **P3d yurt kuralı: +150** (P3b kapalıyken e → b) ve **+195** (P3b açıkken d → c). Mekanizma: yerleşik + yurt tüketimi 302 → 188 (b) / 342 → 222 (c) ve yaşlı spekülatörlerin yurtla aldığı ayrılmış 42 → 0: yurtlar artık ayrılmış havuzdan kalkıyor; spekülatörü etkilemiyor.
- İkisi birlikte e → c: +445 (toplamsal tahmin 400; +45 etkileşim: P3b, spekülatörün yurt kuralından boşalan havuzu yemesini de engelliyor).
- **H6 açılış koşulu (i): her etken tek başına yeter.** (i) yalnız ikisi birden KAPALIYKEN (e) tutmuyor (0/9); P3b tek başına (d), yurt kuralı tek başına (b) ya da ikisi (a, c) açıkken 9/9. Yani H6'nın KALDI'dan GEÇTİ'ye dönüşü iki etkenden HERHANGİ BİRİNE bağlı, ilceSec'e bağlı değil.

**H6 kararının okunuşu:** KALDI yalnız (i) tutmadığında (e); b ve d'deki BELİRSİZ, (i)'nin değil Y7'nin ölçülememesinin sonucu (üreten emsali olmayan ilçelere düşen geç katılanlar). Y7 ölçülebilirliği etkenlerle monoton değil (e 5/9, c 4/9, b ve d 1/9): geç katılanın hangi ilçeye düştüğüne ve o ilçede üreten emsal olup olmadığına bağlı, dolaylı bir etki; bu ayrıştırmanın birincil çıktısı değil. Eski tanım (ucuz ≥ %20) her ayarda KALDI: ayrılmışın hiçbir ayarda eşiği geçecek kadar ucuz pay vermemesi yapısal.

**Tohumlar arası yayılım:** küçük ve karara dokunmuyor. Ayrılmış kalan aralığı en çok 32 hücre (d: 326–358; yaklaşık %3,6), c/a'da 7 hücre; (i) 3/3 hiçbir tohumda değişmedi; genç spekülatör sayısı ±~16. H6 kararı yalnız b ve d'de tohumlar arasında BELİRSİZ ↔ GEÇTİ oynuyor (Y7 ölçülebilirliği 0–1/3); a, c ve e'de her üç tohumda aynı (GEÇTİ, GEÇTİ, KALDI). Sınırlar: tek fikstür (sentetik-50), n = 3 bot tohumu (sürpriz aralık yok demek değil), toplamsal ayrıştırma varsayımı (etkileşim +45), (ii) bot ölçeğinde bilgisiz ve karara girmiyor.

## Yeniden üretim

```
pnpm olcum --kip parsel --agir --ad v1-gec60-temel --bulgular parsel-v1-bulgular.md --cikti docs/olcum
pnpm olcum --kip parsel --agir [--tarim-yonetimi] [--bakim-yonetimi] --karsilastir docs/olcum/parsel-v1-gec60-temel.json --ad v1-gec60-<...> --bulgular parsel-v1-bulgular.md --cikti docs/olcum
pnpm olcum --kip parsel --gec-gun 20 --olcum-gunu 10 --spekulator-gun 15 --bot ciftci=3,sanayici=2,tuccar=2,pasif=1,spekulator=3,spekulatorYasli=3 --karsilastir docs/olcum/parsel-v1-spekulator-temel.json --ad v1-spekulator ...
pnpm olcum --kip parsel --gec-gun 20 --olcum-gunu 10 --spekulator-gun 15 --bot ciftci=3,sanayici=2,tuccar=2,pasif=1,spekulatorYasli=6 --karsilastir docs/olcum/parsel-v1-spekulator-temel.json --ad v1-spekulator-yasli ...
pnpm olcum --kip parsel --kalabalik --karsilastir docs/olcum/parsel-v1-kisa-temel.json --ad v1-kalabalik ...
pnpm olcum --kip parsel --kalabalik --harita sentetik-50 --tohum 1 --ad v1-kalabalik-s50 ...
# §3f ayrıştırma JSON'ları (parsel-v1-ayristirma-a..e.json, ~2,8 MB) boyut nedeniyle depoya girmez; aşağıdaki ilk komutla deterministik yeniden üretilir, md'ler ve özet tablo depodadır.
# §3f ayrıştırma (bot tohumu 7; sentetik-50 kalabalık; e: --oncelik-kapali --p3b-kapali --yurt-kurali-kapali; b: --p3b-kapali; a: --oncelik-kapali; d: --yurt-kurali-kapali; c: hiçbiri):
pnpm olcum --kip parsel --kalabalik --harita sentetik-50 --tohum 1-3 --bot-tohum 7 [bayraklar] --ad v1-ayristirma-<a..e> --bulgular parsel-v1-bulgular.md --cikti docs/olcum
pnpm olcum --kip parsel --ayristirma docs/olcum/parsel-v1-ayristirma-a.json,...-b.json,...-c.json,...-d.json,...-e.json --ad v1-ayristirma --bulgular parsel-v1-bulgular.md --cikti docs/olcum
```
