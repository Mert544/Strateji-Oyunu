# Bakım ve aşınma temel ölçümü (1 Ekim 2026)

> **Elle yazılmıştır**; rapor üretiminde ezilmez. Kalibrasyon yorumu Ar-Ge'nindir (A2): bu belge **ham sayı** verir, karar önermez.
> Yazan: Operasyon O2. Kod tabanı: `entegrasyon` d28447d + bu daldaki ölçüm alanı (`takim/o2/olcum-temel`).
> Kaynak: [parsel-v1-bulgular.md](parsel-v1-bulgular.md) §3a'nın güncel çekirdekle tekrarı + yeni ölçüm alanı. Yön gösterir: mini-6, 11 bot, basit botlar, kalibre edilmemiş.

## 1. Ne yapıldı

Parsel kısa ölçümü (mini-6, iklim "hizli") yedi koşu, **yönetim kapalı ve açık** ayrı ayrı; hepsi yeni `--bakim-olc` ölçüm alanıyla:

| Koşu | Senaryo | Tohum | Yönetim | Rapor |
|---|---|---|---|---|
| bakim-gec60-temel | gec60 (60. gün katılım, 74 gün, `--agir`) | 1–10 | tarım kapalı, bakım kapalı | [md](parsel-bakim-gec60-temel.md) |
| bakim-gec60-tarim | gec60 | 1–10 | tarım AÇIK, bakım kapalı | [md](parsel-bakim-gec60-tarim.md) |
| bakim-gec60-bakim | gec60 | 1–10 | tarım kapalı, bakım AÇIK | [md](parsel-bakim-gec60-bakim.md) |
| bakim-gec60-tarim-bakim | gec60 | 1–10 | ikisi AÇIK | [md](parsel-bakim-gec60-tarim-bakim.md) |
| bakim-kisa-temel | kisa (10. gün katılım, 24 gün) | 1–3 | kapalı | [md](parsel-bakim-kisa-temel.md) |
| bakim-kisa-bakim | kisa | 1–3 | bakım AÇIK | [md](parsel-bakim-kisa-bakim.md) |
| bakim-kisa-tarim-bakim | kisa | 1–3 | ikisi AÇIK | [md](parsel-bakim-kisa-tarim-bakim.md) |

Ham tablolar (yorumsuz; bu belgedeki tabloların kaynağı): **[parsel-bakim-ozet-gec60.md](parsel-bakim-ozet-gec60.md)** (4 koşu) ve **[parsel-bakim-ozet-kisa.md](parsel-bakim-ozet-kisa.md)** (3 koşu). Her biri şunları içerir: §2 Y7 gelir/emsal, §3 aşınma yörüngesi ve eşik günleri, §4 gelir kalemleri ve bakım harcaması, §5 parça piyasası, §6 parça stoğu.

**Doğrulama:** ölçüm yalnız okur. Karşılığı olan altı koşunun JSON'u (ölçüm alanı, süre ve etiket dışında) mevcut `parsel-v1-*.json` dosyalarıyla **birebir aynıdır** (gec60 ×4, kisa temel ve kisa tarım+bakım; kisa-bakim'in v1 karşılığı yok); yani v1 sonuçları güncel çekirdekle aynen yeniden üretildi ve ölçüm alanı koşuyu etkilemiyor. Test: `packages/olcum/test/parsel-bakim.test.ts` (ölçüm açıkken sonuç kapalıyla aynı; deterministik).

## 2. Yeniden üretim

```
pnpm olcum --kip parsel --agir --bakim-olc --ad bakim-gec60-temel --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --agir --bakim-olc --tarim-yonetimi --karsilastir docs/olcum/parsel-bakim-gec60-temel.json --ad bakim-gec60-tarim --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --agir --bakim-olc --bakim-yonetimi --karsilastir docs/olcum/parsel-bakim-gec60-temel.json --ad bakim-gec60-bakim --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --agir --bakim-olc --tarim-yonetimi --bakim-yonetimi --karsilastir docs/olcum/parsel-bakim-gec60-temel.json --ad bakim-gec60-tarim-bakim --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --bakim-olc --ad bakim-kisa-temel --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --bakim-olc --bakim-yonetimi --karsilastir docs/olcum/parsel-bakim-kisa-temel.json --ad bakim-kisa-bakim --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --bakim-olc --tarim-yonetimi --bakim-yonetimi --karsilastir docs/olcum/parsel-bakim-kisa-temel.json --ad bakim-kisa-tarim-bakim --bulgular bakim-asinma-temel.md --cikti docs/olcum
# özet tabloları (koşu yapmaz; JSON'lardan):
pnpm olcum --kip parsel --bakim-ozet docs/olcum/parsel-bakim-gec60-temel.json,docs/olcum/parsel-bakim-gec60-tarim.json,docs/olcum/parsel-bakim-gec60-bakim.json,docs/olcum/parsel-bakim-gec60-tarim-bakim.json --ad bakim-ozet-gec60 --bulgular bakim-asinma-temel.md --cikti docs/olcum
pnpm olcum --kip parsel --bakim-ozet docs/olcum/parsel-bakim-kisa-temel.json,docs/olcum/parsel-bakim-kisa-bakim.json,docs/olcum/parsel-bakim-kisa-tarim-bakim.json --ad bakim-ozet-kisa --bulgular bakim-asinma-temel.md --cikti docs/olcum
```

- Süre: gec60 koşuları 10–21 sn, kisa koşuları 4–7 sn (yük ortalaması 7–13 iken). Sonuçlar deterministiktir; süre değişir.
- **JSON dosyaları depoya girmez** (gec60 ≈ 0,9 MB × 4, kisa ≈ 0,25 MB × 3; ölçüm alanı hacmi). Yukarıdaki ilk yedi komut JSON'ları üretir; özet komutları onlardan okur. `--bakim-ozet` ve `--bakim-olc` bayrakları `pnpm olcum --kip parsel --yardim` çıktısında.
- Ölçüm kodu: `packages/olcum/src/parsel-bakim.ts` (izleyici), `parsel-bakim-rapor.ts` (özet), `packages/botlar/src/parsel-kosucu.ts` (yalnız okuma kancası `komutIzle`). Çekirdeğe dokunulmadı.

## 3. Y7: gelir / emsal ve yerleşik gelirler

Gelir/emsal = geç katılanın son 7 gün net üretim geliri / ilçenin üreten yerleşiklerinin gelir medyanı (tohum ortalaması; eşik %50). Y7 oyuncu payı tüm koşularda %100, karar GEÇTİ.

**gec60 (74 gün, tohum 1–10):**

| Yönetim | Y7 payı | Geç çiftçi | Geç sanayici | Geç pazar |
|---|---|---|---|---|
| temel (kapalı) | %100 | %384,7 | %218,3 | %171 |
| tarım AÇIK | %100 | %372,8 | %218,3 | %209,9 |
| bakım AÇIK | %100 | %163,3 | %358,4 | %60,2 |
| tarım + bakım AÇIK | %100 | %173,6 | %358,3 | %79,6 |

**kisa (24 gün, tohum 1–3):**

| Yönetim | Y7 payı | Geç çiftçi | Geç sanayici | Geç pazar |
|---|---|---|---|---|
| temel (kapalı) | %100 | %189,4 | %117,7 | %83,7 |
| bakım AÇIK | %100 | %158,2 | %108,1 | %66,4 |
| tarım + bakım AÇIK | %100 | %159,2 | %108,1 | %80,9 |

Yerleşik oyuncunun son 7 gün net üretim geliri, gec60 (₺; yerleşik oyuncu başına medyan, p10–p90; 30 çiftçi, 20 sanayici, 20 tüccar oyuncu-tohum):

| Yönetim | yerleşik çiftçi | yerleşik sanayici | yerleşik tüccar |
|---|---|---|---|
| temel | 296.727 (120.251–456.682) | 403.974 (403.973–403.974) | 129.359 (115.023–169.716) |
| tarım AÇIK | 386.041 (176.467–612.938) | 403.974 (403.973–403.974) | 212.630 (146.190–277.867) |
| bakım AÇIK | 829.041 (387.720–994.417) | 267.344 (267.169–284.836) | 395.139 (355.305–507.210) |
| tarım + bakım AÇIK | 907.997 (518.003–958.810) | 267.461 (267.170–284.836) | 697.466 (697.466–697.476) |

Emsal geliri (Y7 paydası, 7 gün, ₺, tohum ortalaması), gec60: geç çiftçi emsali temel 191.425 → bakım 417.352; geç sanayici emsali 403.974 → 267.104; geç pazar emsali 213.491 → 612.369. Kisa için [parsel-bakim-ozet-kisa.md](parsel-bakim-ozet-kisa.md) §2.

Not: yerleşik botların tüm tohumlardaki davranışı (bot tohumu verilmediği için) neredeyse aynıdır; p10–p90 aralığı çoğunlukla ya tohum ya iklim başlangıç ayı farkındandır. Oyuncu başına değişim yalnız iklim ayı ve ilçe yerleşimiyle gelir.

## 4. (a) Aşınma yörüngesi (yönetimsiz temel, gec60)

Tesis düzeyi aşınma %, medyan (p10–p90); kaynak: ölçüm anlarında tesis başına `asinmaPpm` (çiftçi n=90 tesis, sanayici n=60, tüccar n=40; her gün için havuz):

| Grup | 5. gün | 10. gün | 20. gün | 30. gün | 50. gün | 74. gün |
|---|---|---|---|---|---|---|
| yerleşik çiftçi | %10 (%10–%10) | %20 (%20–%20) | %40 (%40–%40) | %60 (%60–%60) | %100 (%100–%100) | %100 (%100–%100) |
| yerleşik sanayici | %9,7 (%9,7–%9,7) | %19,7 | %39,7 | %59,7 | %99,7 | %100 |
| yerleşik tüccar | %9,5 (%9,5–%9,5) | %19,5 | %39,5 | %59,5 | %99,5 | %100 |
| geç katılan (katılım 60. gün) | — | — | — | — | — | %27,7 (%27,5–%28) |

- Bakım parçası karşılanma (`bakimKarsilanmaPpm`), düğüm düzeyi medyan: **%0** (p10–p90 de %0) her ölçüm gününde, üç yerleşik arketipte ve geç katılanda (74. gün).
- Aşınmanın **%50'ye vardığı gün** (tesisin ilk görüldüğü andan itibaren): çiftçi 26,0 (25,7–26,0), sanayici 26,0 (25,5–26,0), tüccar 25,7 (25,7–26,0) gün; mutlak sim günü 26,0. **%100'e vardığı gün**: çiftçi 51,0 (50,7–51,0), sanayici 51,0 (50,5–51,0), tüccar 50,7 (50,7–51,0); mutlak 51,0. Tesislerin %100'ü her iki eşiğe de ölçüm anına kadar vardı. Geç katılanın hiçbir tesisi %50'ye varmadı (14 gün).
- Tesis türüne göre aşınma farkı yoktur (aynı oyuncunun tüm tesisleri aynı değeri taşır); 74. günde tür bazlı aşınma/verim/işçi tablosu özetin §3 sonundadır.
- Yönetimli koşularda (bakım AÇIK) aşınma tüm gün ve arketiplerde **%0**, bakım karşılanma %100.

## 5. (b) Son 7 günlük gelir kalemleri (yerleşik medyanı, gec60; temel ve bakım yan yana)

₺, son 7 günlük pencere (67.–74. günler), oyuncu başına medyan; sütunlar birbirinin toplamı olmak zorunda değildir (medyan sütun sütun alınır). Kalemler çekirdeğin para defterindeki saatlik akışlardır (`paraAkisi`), saatlik örneklemeyle toplandı.

| Kalem (7 gün) | çiftçi temel | çiftçi bakım | sanayici temel | sanayici bakım | tüccar temel | tüccar bakım |
|---|---|---|---|---|---|---|
| Net üretim geliri (Y7 ölçüsü) | 296.727 | 829.041 | 403.974 | 267.344 | 129.359 | 395.139 |
| Brüt çıktı değeri (ihracat + nüfus) | 325.833 | 857.561 | 424.063 | 596.600 | 149.765 | 415.980 |
| Aşınma kaybı (TAHMİN, aşağıya bakın) | 217.222 | 0 | 282.709 | 0 | 99.843 | 0 |
| İşletme gideri | 30.240 | 30.240 | 20.160 | 20.160 | 20.160 | 20.160 |
| İthalat (tüm mal) | 0 | 0 | 0 | 291.839 | 0 | 0 |
| · bakım parçası ithalatı | 0 | 0 | 0 | 291.839 | 0 | 0 |
| Genel onarım: para | 0 | 0 | 0 | 0 | 0 | 0 |
| Genel onarım: malzeme (stok değeri) | 0 | 0 | 0 | 0 | 0 | 0 |
| Genel onarım sayısı | 0 | 0 | 0 | 0 | 0 | 0 |
| Genel onarım duruşu (tesis-saat payı) | %0 | %0 | %0 | %0 | %0 | %0 |
| Arazi vergisi | 15 | 15 | 22 | 22 | 0 | 0 |
| Ortalama aşınma / verim cezası | %100 / %40 | %0 / %0 | %100 / %40 | %0 / %0 | %100 / %40 | %0 / %0 |
| Uzlaşma farkı (Y7 − hesaplanan net) | −118 | −328 | 92 | 257 | −74 | −204 |

Tüm 7 günlük kalemler tarım+bakım ve tarım koşuları için özet §4'tedir. Gözlemler (ham):

- **Genel onarım hiç çalışmadı** (bakım AÇIK koşularda aşınma sıfır kaldığı için; yönetimsiz koşularda komut hiç verilmedi): onarım parası, malzemesi, duruşu ve sayısı her yerde 0.
- Bakım AÇIK koşularda parça ithalatı **katılımdan 74. güne toplam** (oyuncu başına medyan): çiftçi 918.473 ₺, sanayici 2.633.903 ₺, tüccar 515.545 ₺; geç katılan (14 gün) 180.591 ₺. Yönetimsiz sanayici yalnız yapı malzemesi için 15.194 ₺ parça ithal etti.
- Bakım AÇIK çiftçide net üretim geliri/yönetimsiz oranı = 829.041 / 296.727 = ×2,79 (brüt çıktı değeri 857.561 / 325.833 = ×2,63); emsal medyanı (geç çiftçi emsali) 417.352 / 191.425 = ×2,18 (A2'nin ×2,2'si). Aşınma cezası çarpanı 1 / (1 − 0,40) = ×1,67.
- **A2'nin sorusu için ham veri (hesap, yorum değil):** çiftçinin tesisleri çiftlik ×2 + ahır ×1'dir. 74. günde çiftlik `verimPpm` yönetimsiz %100, bakımlı %100; ahır `verimPpm` yönetimsiz **%59,5** (p10–p90 %31,8–%100), bakımlı **%99,2** (%52,9–%100). Oran 59,5 / 99,2 = 0,60 = aşınma çıktı çarpanı (0,60). Ahırın girdisi tahıldır (çiftlik çıktısı). Kisa ve gec60'ta ahır ve çiftlik çıktı çarpanları ayrı satırdır: tür bazlı tablo [parsel-bakim-ozet-gec60.md](parsel-bakim-ozet-gec60.md) §3 sonu ("Yerleşik tesis türüne göre 74. günde"). Tüccar için aynı sayı: ahır verimi yönetimsiz %27,9, bakımlı %46,6.
- Sanayicide bakım AÇIK koşuda net gelir yönetimsizden düşük (267.344 < 403.974): brüt çıktı 424.063 → 596.600 artarken parça ithalatı 291.839 eklenir. Madende `verimPpm` %67,4 (yönetimsiz) → %55,8 (bakımlı); hidro santral %4,9 → %2,5 (medyan; ayrıntı özet §3).

**Aşınma kaybı (TAHMİN) nasıl hesaplandı:** her saat `ihracat geliri × (1 / ortalama ceza çarpanı − 1)`; ortalama ceza çarpanı oyuncunun tesislerinin `cezaCarpani` ortalamasıdır (çekirdeğin kendi işlevi: 1 − aşınma × 0,40, üretim tabanı dahil, kıtlık çarpanı hariç). Çıktı ağırlığı yoktur, zincir (ahır girdisi) etkileri yoktur: **alt sınır niteliğinde kaba bir tahmindir**. Tabloda tahmin edilen kayıp + gözlenen brüt çıktı (çiftçi temel 325.833 + 217.222 = 543.055), bakım AÇIK gözlenen brüt çıktının (857.561) altındadır; aradaki fark zincir etkisi olabilir ama bu ölçümle doğrulanmadı.

## 6. (c) Bakım parçası piyasası (5.–30. günler)

Botların toplam parça ithalat emri / NPC arzı ve parça fiyatının tabana oranı. Günün saatlik ortalamaları; tohum × gün havuzu (260 gün-örneği); botlar tohumdan bağımsız olduğundan p10–p90 yalnız gün farkıdır. NPC arzı: 8 oyuncuyla 340 parça/saat; oyuncu sayısı artınca ölçeklenir (kisa koşusunda geç katılımdan sonra 345–467).

| Koşu | Emir olan gün payı | İstenen (parça/sa, ortalama) | Gerçekleşen (ort.) | En yüksek günlük istenen | İstenen / NPC arzı (medyan; p90) | Fiyat / taban (medyan; p90) |
|---|---|---|---|---|---|---|
| temel (kapalı) | %0 | 0,00 | 0,00 | 0,00 | %0 (%0) | %113,2 (%113,2) |
| tarım AÇIK | %0 | 0,00 | 0,00 | 0,00 | %0 (%0) | %113,2 (%113,2) |
| bakım AÇIK | %30,8 | 19,93 | 15,23 | 126,98 | %0 (%25,1) | %113,2 (%128,7) |
| tarım + bakım AÇIK | %30,8 | 19,93 | 15,23 | 126,98 | %0 (%25,1) | %113,2 (%128,7) |

- Talep olan günlerde istenen/NPC arzı en çok %37,3 (24. gün, 126,98 / 340 parça/sa); fiyat/taban en çok %134,1. Talepsiz günlerde fiyat/taban %113,2'dedir (nedeni bu ölçümle incelenmedi).
- İstenen ile gerçekleşen arasındaki fark (ör. 24. gün 126,98 → 91,29): pazar/hazine sığdırma kuralı sonucudur (ölçüm yalnız gözler).
- Günlük ayrıntı tablosu: [parsel-bakim-ozet-gec60.md](parsel-bakim-ozet-gec60.md) §5.

## 7. (d) Kod okuma soruları

1. **Mülk kipindeki botlar `bakim_duzeyi` komutu veriyor mu?** Hayır. `packages/botlar/src/parsel.ts`'te `bakim_duzeyi` geçmez; komut yalnız bölge kipi botlarında üretilir (`arketipler.ts:241`, `planlayici.ts:1273`). Mülk kipinde oyuncu `oyuncu_katil`'de `bakimDuzeyi = 1` (normal) ile açılır (`cekirdek/src/motor.ts:324`, sanayi açık olduğu için) ve bot onu değiştirmez. Normal düzey: bakım girdisi çarpanı 1,0 ve düzey kaynaklı günlük aşınma 0 (`parametreler.json` `sanayi.bakim.duzeyler[1]`); aşınmayı tek başına parça kıtlığı yürütür (`sanayi/gunluk.ts`: bakım karşılanma < %95 ise günlük aşınma en az `kitlikAsinmaPpmGun` × (1 − karşılanma) = 20.000 ppm × (1 − karşılanma)). Tam kıtlıkta +%2/gün ölçümde görüldü (%50 → 26. gün, %100 → 51. gün).
2. **Başlangıç kitindeki 40 parça tarla bakımına kaç gün yetiyor?** Kit `baslangicStok.parca = 40.000` mili = 40 parça (`parametreler.json mulk.yeniOyuncu`). Bakım tüketimi tesis başına: `geleneksel_tarim` 0,5, `ahir_besi` 0,5, `yuzey_cevher` 1,0, `hidro_santrali` 2,0 parça/saat. Aynı parça yapı inşaatında da harcanır (çiftlik 10, ahır 15, mera 5, hidro santral 30 parça; ilk 5 yapıda indirim var). Ölçüm (oyuncu başına medyan düğüm parça stoğu): 1. gün sonu çiftçi **0,08**, sanayici **1,80**, tüccar **0,78** parça; 2. gün sonu hepsi 0. Yönetimsiz oyuncuların tümünde stok 1 parçanın altına en geç 2. gün indi (çiftçi ve tüccar medyanı 1. gün, sanayici 2. gün). Yapıya hiç harcanmasa bile: çiftçi (2 çiftlik + 1 ahır = 1,5 parça/sa) 40 / 1,5 = 26,7 saat ≈ 1,1 gün; tüccar (1 çiftlik + 1 ahır = 1,0 parça/sa) 40 saat ≈ 1,7 gün; sanayici (2 maden + 1 santral = 4,0 parça/sa) 10 saat. Tek bir tarlanın (0,5 parça/sa) bakımı için 80 saat ≈ 3,3 gün. Pratikte kitin büyük kısmı yapılara gider. Seri: özet §6.

## 8. Yöntem ve sınırlar

- **Saatlik örnekleme.** Gözlem her tam saat; para akışları son çözümdeki saatlik orandır (`paraAkisi`), 1 saatle çarpılıp toplanır. Saat içinde komutla değişen oranlar bir saat gecikmeli görünür. Uzlaşma farkının (Y7 geliri − akıştan hesaplanan net) medyanı −328 ile +257 ₺ arasındadır (7 günlük gelirin %0,3'ünün altında); kaynağı bu ölçümde ayrıştırılmadı.
- **Parça ithalatının nakit payı:** oyuncunun ithalat kaleminin (`paraAkisi.ithalat`), gerçekleşen parça ithalatının toplam ithalattaki hacim × referans fiyat payı kadarıdır (aynı çarpanlar). Sanayicinin yapı malzemesi için ithal ettiği parça ayrılmaz (yönetimsiz sanayicideki 15.194 ₺).
- **Genel onarım** komutunun parası komut öncesi/sonrası hazine farkıdır; malzemesi düğüm stoğunun taban fiyatla değer farkıdır. Bu koşularda hiç onarım olmadığından yöntem **test fikstüründe doğrulanmadı**; onarım yolunu zorlayan ayrı bir koşu (ör. bakım parçası ithalatı kapalı, onarım açık) istenirse eklenir.
- **Üretim kaybı** = aşınmanın verim cezası (1 − `cezaCarpani`) ve onarım duruşu; gerçek parasal kayıp koşular arası gelir farkından okunur (§5). Aşınma kaybı satırı TAHMİNDİR.
- **Havuzlama:** medyanlar ve yüzdelikler tohum × oyuncu (ya da tesis) üzerinden en yakın sıra yöntemiyle; botlar `--bot-tohum` verilmediği için tohumlar arasında neredeyse aynıdır (p10–p90 dar). Tohum varyansı için `--bot-tohum 7` (v1 §3f) kullanılabilir; yapılmadı.
- **Tek harita ve düzen:** mini-6, 8 yerleşik + 3 geç katılan. Kalabalık ve sentetik-50 için ayrıca koşulmadı.
- **Duyarlılık taraması (e)** (kitlik / ceza tavanı grid'i) bu ölçümün parçası değildir; sıra liderde.

## 9. Dosyalar

| Dosya | İçerik |
|---|---|
| `docs/olcum/bakim-asinma-temel.md` | bu belge (elle) |
| `docs/olcum/parsel-bakim-ozet-gec60.md`, `parsel-bakim-ozet-kisa.md` | ham özet tablolar (üretilmiş) |
| `docs/olcum/parsel-bakim-{gec60,kisa}-*.md` | koşu başına standart parsel raporu (H6, H8, §5a karşılaştırma) |
| `packages/olcum/src/parsel-bakim.ts`, `parsel-bakim-rapor.ts`, `parsel-kosu.ts`, `parsel-cli.ts` | ölçüm alanı, özet, CLI |
| `packages/botlar/src/parsel-kosucu.ts` | `komutIzle` okuma kancası |
| `packages/olcum/test/parsel-bakim.test.ts` | testler |
