# H1–H9: parsel dünyası ölçüm tanımları (S9)

> **Durum:** Taslak tanım (Sprint 1, S9 / E12-G11). Metrik işlevleri yazıldı ve birim testli; koşucular çekirdek mülk modeli (S3) ve parsel botları (E20-G10) gelince bağlanır. **Güncelleme:** mülk kipi ve yeni oyuncu paketi çekirdekte; parsel botları (`packages/botlar/src/parsel.ts`) ve kısa ölçüm komutu (`pnpm olcum --kip parsel`) var, H6/H8/Y ölçütleri mini-6'da koşuldu: [parsel-v0.md](parsel-v0.md), bulgular [parsel-v0-bulgular.md](parsel-v0-bulgular.md) (§7). Eşikler [docs/11 §8.1](../11-urun-donusu.md#81-hipotezlerin-yeni-ifadeleri) başlangıç önerileridir. Her eşik değişikliği gerekçesiyle kayda geçer ve takım lideri onaylar.

| Alan | Değer |
|---|---|
| Kaynak | [docs/11](../11-urun-donusu.md) §7 (v1 tasarım), §8 (ölçüm) |
| Metrik kodu | `packages/olcum/src/parsel/` (saf işlevler; dışa `import { parsel } from "@bolge/olcum"`) |
| Fikstür sözleşmesi | `packages/veri/src/parsel.ts` (tip, Zod şeması, doğrulayıcı) |
| Fikstür üreticisi | `packages/veri/src/uretici/parsel-fikstur.ts` (`pnpm --filter @bolge/veri parsel:uret`) |
| Fikstürler | `packages/veri/haritalar/parsel/{mini-6,sentetik-50}.parsel.json` |
| Donmuş temel çizgi | [v0.3-gercek-t1-3.md](v0.3-gercek-t1-3.md) ([JSON](v0.3-gercek-t1-3.json)) |

---

## 1. Donmuş temel çizgi (bölge kipi, v0.3)

Bölge kipinin son ölçümü **v0.3**'tür: commit `1a7fe08` (Pazar v1), ayrı worktree, gerçek Karadeniz haritası (53 bölge), tohum 1–3, hızlı iklim. Bu sonuçlar **donmuştur**. Bölge kipi kodu değişse de yeniden koşulmaz ve üzerine yazılmaz. Parsel kipi sonuçları bu tabloyla **yan yana** raporlanır. İfade ve birim değiştiği için doğrudan sayı karşılaştırması yapılmaz; yalnız yön ve sınıf karşılaştırılır (ör. "H7 bölge kipinde çöküş tarafında kalıyordu; parsel kipinde nerede?").

| # | v0.3 ölçümü (bölge kipi) | v0.3 sonucu | Parsel kipiyle karşılaştırılabilirlik |
|---|---|---|---|
| H1 | En yaygın sabit önayarın anlamlı ilk-üç bölge oranı **0,729** (ihracatci) | **BELİRSİZ** (koşul %67) | Düşük: birim bölge → ilçe sınıfı, önayar → 6 yuvalık portföy |
| H2 | Tekrar endeksi (21–30. gün, tükenme hariç) **0,367** | **GEÇTİ** | Orta: aynı pencere; tek odak → oyuncu medyanı; yeni karar türü koşulu eklendi |
| H3 | En büyük göreli fiyat/kapsam değişimi **0,971** | **BELİRSİZ** (koşul %33) | Orta: müdahale "kapasitenin %20'si" → "ilin yuvalarının %20'si ordugâh"; kapsam → arz |
| H4 | Ölçülmedi (insan testi) | — | — |
| H5 | En büyük 24 sa kayan pencere stok kaybı **0,25** | **GEÇTİ** | Yüksek (depo koşulu aynı payda); parsel kaybı koşulu yeni |
| H6 | Geç katılanın yerel medyana ulaşma oranı **0,792** | **GEÇTİ** | Orta: 10./20. gün → 60. gün; devlet medyanı → ilçe medyanı; ucuz hücre koşulu yeni |
| H7 | 72. saatte kur-unut / aktif üretim oranı **0,357** | **KALDI** (çöküş) | Yüksek: aynı ifade, sahip düzeyinde |
| H8 | — (yeni) | — | Temel çizgi yok |
| H9 | — (yeni) | — | Temel çizgi yok |

---

## 2. Ortak kurallar

- **Saf işlev.** `packages/olcum/src/parsel/` çekirdeğe (`Simulasyon`) bağlanmaz. Düz kayıt dizileri alır, girdiyi değiştirmez. Koşucu (S3 sonrası) simülasyondan bu kayıtları üretir (§5).
- **Tamsayı.** Girdiler tamsayıdır (mili-₺, hücre, yuva, ms, gün). Oranlar **ppm** (1.000.000 = %100) olarak aşağı yuvarlanır. Ara çarpımlar `BigInt` ile taşmasız yapılır. Kayan nokta yalnız H1'in bilgi amaçlı entropisinde kullanılır; o değer karara girmez.
- **Karar sözlüğü.** `gecti`: vazgeçme ölçütü tetiklenmedi. `kaldi`: tetiklendi. `belirsiz`: ölçülemedi ya da önkoşul tutmadı. Çok koşullu hipotezlerde (`kosullardanVerdict`) bir koşul `false` ise sonuç kaldı, biri ölçülemediyse belirsiz, hepsi tutuyorsa geçti.
- **Koşul (tohum).** Bölge kipindeki gibi tohumlar bağımsız örnek değil, birer koşuldur. Hipotez sonucu tohumlar üzerinden `genelVerdict` ile birleşir; koşul başarı oranı ayrıca yazılır.
- **Ölçek ve düzen** ([docs/11 §8.3](../11-urun-donusu.md#83-fikstürler-ve-düzen)): 1k ve 10k nüfus, 24× hız, 90 gün, 10 tohum, 12 başlangıç ayı. Ölçüm her zaman sabit commit'ten açılan ayrı bir git worktree'de koşar. Birim testleri ve fikstür doğrulaması ana çalışma ağacında kalır.
- **Gün numarası.** 1 tabanlıdır: 1. gün = [0, 24 sa).

---

## 3. Parsel fikstürü

### 3.1 Sözleşme (`packages/veri/src/parsel.ts`)

```
ParselFiksturu { surum: 1, ad, harita, tohum, zoom: 20, iller[], ilceler[] }
  il    { id, ad, bolge }
  ilce  { id, ad, il, bolge, sinif, seviye, hucreSayisi, uygunHucre, hucreler[] }
  hucre { id: "x:y", sinif: "kirsal"|"kasaba"|"sehir", uygun: boolean, engel?: "su"|"yol"|"askeri"|"koruma" }
```

- `HucreId` = `"x:y"`, Web Mercator z20 karo koordinatı. Çekirdek taslağıyla (`cekirdek/src/tipler.ts` "Mülk sözleşmesi TASLAĞI (S1)") aynıdır. `ArsaSinifi` ve `IlceSeviyesi` (0 Köy, 1 Kasaba, 2 Merkez, 3 Şehir) birlikleri de aynıdır.
- `ilce.uygunHucre`, çekirdekteki `IlceDurumu.uygunHucre`'nin başlangıç değeridir. `ilce.bolge`, `IsletmeDugumu.merkezBolge`'dir.
- **Kimlikler, OSM hattıyla hizalı** (`veri-hatti/src/osm/hiyerarsi.ts`): il `<ulke>_<kod>` (OSM: `tr_41`, sentetik: `sn_<bolge>`); ilçe `<il>_<ascii ad>` (OSM: `tr_41_gebze`, sentetik: `sn_<bolge>_merkez`). OSM `hiyerarsi.json` alan eşlemesi: `kimlik` → `id`, ilçenin `ebeveyn`'i → `il`, ilin `ebeveyn`'i → `bolge`.
- **Engel türleri**, veri hattının hücre uygunluk bitleriyle hizalıdır (`izgara-uygunluk.ts`: YOL, SU, ASKERI). `koruma` (korunan alan) docs/11 §7.2'den eklendi.

**Doğrulayıcı** `dogrulaParselFiksturu(ham, { harita?, tumBolgelerKapsanmali? })` hata fırlatmaz; `{ gecerli, hatalar }` döndürür. Denetimleri:

- Şema: strict nesneler, tamsayı alanlar, kimlik ve `"x:y"` biçimi.
- Benzersizlik: il, ilçe ve hücre kimlikleri benzersizdir. Bir hücre yalnız **bir** ilçede bulunur; iki ilçede görünen hücre hatada adıyla geçer.
- Koordinat: hücre z20 aralığındadır.
- Eşleme: ilçe → il vardır ve ilçenin bölgesi ilin bölgesiyle aynıdır. Her ilin en az bir ilçesi vardır.
- Harita: il → bölge haritada vardır ve haritanın her bölgesine en az bir il düşer (seçenekle kapatılabilir).
- Sayımlar: `hucreSayisi` ve `uygunHucre` hücre listesiyle tutarlıdır. `uygun: false` ise `engel` vardır, `uygun: true` ise yoktur.
- Sınıf: ilçe sınıfı, ilçedeki en yüksek hücre sınıfıdır.

`parselFiksturuYukle(ad)` (Node) fikstürü kaynak haritasıyla birlikte doğrulayıp yükler.

### 3.2 Sentetik üretim kuralları

- **Yapı.** Her bölge 1 il, her il 2 ilçe (`_merkez`, `_tasra`) ve her ilçe 10×10 hücredir. İl bloğu 20×10 hücredir. Sol üst köşesi bölgenin soyut konumundan türetilir: `(600000 + 24·x, 380000 + 12·y)`. Konumu farklı iki bölgenin bloğu çakışmaz.
- **Sınıf.** Merkez ilçe nüfusa göre belirlenir: ≥200 bin şehir, ≥100 bin kasaba, altı kırsal. Taşra ≥400 bin ise kasaba, değilse kırsaldır. Hücre sınıfı ilçe merkezinden halkalarla düşer (şehir → kasaba → kırsal). Çekirdek dışı hücrelerin ~1/8'i tohumla bir sınıf aşağı iner.
- **Başlangıç seviyesi** en yüksek hücre sınıfından gelir: kırsal 0, kasaba 1, şehir 3. §7.4'e göre şehir sınıfı hücreler Şehir seviyesinde açılır. Bu bir başlangıç değeridir, kalibre edilmedi.
- **Uygunsuz hücreler:**
  - İki ilçeyi kesen yatay yol vardır. Şehir ve kasaba merkezlerinde ayrıca dikey yol bulunur.
  - Kıyı bölgelerinde taşranın dış sütunu denizdir; girintili bir ikinci sütun eklenebilir.
  - Dağ bölgelerinde taşrada bir dere vardır.
  - Diğer bölgelerde yarı olasılıkla 2×2 gölet konur.
- **Determinizm.** Tamsayı mulberry32 kullanılır. İl tohumu = tohum XOR fnv1a32(bölge kimliği), bu yüzden bölge eklemek diğer illeri değiştirmez. `Math.random` ve kayan nokta kullanılmaz. Diskteki dosya, üreticinin çıktısıyla bayt bayt aynıdır; bunu bir test denetler.

| Fikstür | İl | İlçe (kırsal / kasaba / şehir) | Hücre | Uygun | Hücre sınıfı (kırsal / kasaba / şehir) | Engel (su / yol) | H1 ilçe sınıfı | Boyut |
|---|---:|---|---:|---:|---|---|---:|---:|
| mini-6 | 6 | 12 (9 / 2 / 1) | 1.200 | 1.015 | 1.115 / 72 / 13 | 38 / 147 | 7 | 80 KB |
| sentetik-50 | 50 | 100 (73 / 14 / 13) | 10.000 | 8.424 | 9.044 / 766 / 190 | 369 / 1.207 | 11 | 669 KB |

---

## 4. Hipotezler

Her bölümdeki **İşlevler** satırı `packages/olcum/src/parsel/hN.ts` dosyasındaki adlardır.

### H1 — İlçeler gerçekten farklı

| | |
|---|---|
| Parsel ifadesi | Hiçbir 6 yuvalık yapı portföyü, ilçe sınıflarının %70'inden fazlasında ilk 3'te değildir. |
| İlçe sınıfı | `<arsa sınıfı>_<arazi>`. Arazi, bölge etiketinden dag > kiyi > ova > diger önceliğiyle seçilir (`ilceSinifAnahtari`, `ilceSiniflari`). sentetik-50'de 11 sınıf vardır. |
| Portföy | Toplam **6 yuva** dolduran yapı çoklu kümesidir (§7.3 yuva sayılarıyla). Anahtar sıralı tür listesidir (`portfoyAnahtari`). |
| Skor | Eklenen değer = portföy koşusunun net değer akışı − pasif referans (aynı ilçe, aynı tohum, ortak rastgele sayılar). Sınıf skoru, sınıftaki örnek ilçelerin medyanıdır. Değerler tamsayı mili-₺'dir. |
| Sıra | Yarışma sıralaması: sıra(p) = 1 + #{q : skor(q) > skor(p) + `esikFark`}. Eşitler sırayı paylaşır. `esikFark`, bölge kipi θ'sının karşılığıdır (öneri: max(10 bin ₺, %3·\|pasif\|)). |
| Metrik | Her portföy için oran = ilk-3 sınıf sayısı / sınıf sayısı. **Karar:** en yüksek oran. |
| Eşik | En yüksek oran **> %70** ise KALDI. Sınıf sayısı 2'den azsa BELİRSİZ. |
| Bilgi | En iyi portföy dağılımının normalize entropisi; tüm sınıflarda ölçülen tek sabit portföyün en düşük ortalama pişmanlığı. |
| Bot | **Çiftçi**, **sanayici**. Portföyü kuran odak oyuncudur; arka planı dört arketip doldurur. |
| İşlevler | `portfoyCesitliligi`, `portfoyAnahtari`, `ilceSiniflari` |
| v0.3 | 0,729 BELİRSİZ |

### H2 — Tekrar düşük, yenilik sürüyor

| | |
|---|---|
| Parsel ifadesi | 30. günde oyuncu başına karar tekrarı ≤ %60 **ve** 45. güne kadar her hafta en az 1 yeni karar türü. |
| Karar türü | Komut türü + ayırt edici nesne (`tesis_insa_hucre:tarla`, `yontem:celikhane:ark_firini`, `emir:sat:celik`, `parsel_al:kasaba`). Miktar ve hedef hücre türe girmez. |
| Metrik 1 | Oyuncu başına: 21–30. günlerde ardışık (g−1, g) gün çiftlerinde **baskın** karar türünün (en sık; eşitlikte anahtar sırası) aynı olma oranı. Kararsız gün içeren çiftler paydadan çıkar ve ayrıca sayılır (bölge kipindeki "tükenme" karşılığı). **Karar:** oyuncu oranlarının medyanı. |
| Metrik 2 | Oyuncu başına haftalık (1–7, …, 43–45) ilk kez görülen tür sayısı. **Karar:** her hafta ≥1 olan oyuncu payı. |
| Eşik | Medyan **> %60** ise KALDI. Her hafta yeni tür kullanan oyuncu payı **< %50** ise KALDI. %50 öneridir ve lider onayı bekler. |
| Bot | **Hepsi** (8 arketip). |
| İşlevler | `kararCesitliligi`, `kararTekrari`, `haftalikYeniTurler`, `gunlukBaskinTur` |
| v0.3 | 0,367 GEÇTİ (tek odak oyuncu, aday ölçümüyle "en iyi karar"; parselde gerçekleşen karar günlüğü) |

### H3 — Askeri kayma ekonomiyi değiştirir

| | |
|---|---|
| Parsel ifadesi | Bir ilin yuvalarının %20'si **ordugâha** kayınca o ilde ve komşularında fiyat ya da arz ≥ %10 değişir (eşli koşu). |
| Önkoşul | Müdahale koşusunda ordugâh yuvası / ildeki yapıların toplam yuvası **≥ %20** (`ordugahPayi`). Tutmazsa BELİRSİZ. |
| Metrik | Aynı tohumla TEMEL ve MÜDAHALE. Gösterge anahtarları `fiyat:<il>:<mal>` ve `arz:<il>:<mal>`, il ve komşu iller için tanımlanır. Göreli değişim \|m − t\| / \|t\| ppm'dir; temel 0 ise tanımsızdır (`esliDegisim`). Değerler 14. gün ve 7–14. gün ortalaması olarak bölge kipindeki gibi raporlanır. |
| Eşik | En büyük değişim **≥ %10** ise GEÇTİ, değilse KALDI. |
| Bot | **Komutan / akıncı**: ordugâh kurar. Komşu illerde arka plan arketipleri çalışır. |
| İşlevler | `h3ParselDegerlendir`, `ordugahPayi`, `esliDegisim` |
| v0.3 | 0,971 BELİRSİZ (koşul %33) |

### H4 — Okunabilirlik (insan testi)

5 kişiden **≥ 4**'ü 60 sn içinde "fabrikam neden yavaş?" ve "hangi yasa beni etkiliyor?" sorularını yanıtlamalıdır. Bot ölçümü yoktur, kod metriği yazılmadı. Kapı: A1-5.

### H5 — Çevrimdışı kayıp sınırlı

| | |
|---|---|
| Parsel ifadesi | 48 sa çevrimdışı: pencere başına kayıp ≤ %25 **ve 0 parsel kaybı**. |
| Metrik 1 | Parsel kaybı = pencere başında çevrimdışı oyuncuya ait olup sonunda ona ait olmayan hücre sayısı. Sahiplik anlık görüntüleri karşılaştırılır (`parselKaybi`). |
| Metrik 2 | Depo kaybı oranı = baskın penceresindeki yağma kaybı / pencere içi en yüksek depo stoku (taban fiyat değeri; bölge kipi H5 paydası). **Karar:** pencereler içinde en büyüğü (`depoKaybiOrani`). |
| Eşik | Parsel kaybı **> 0** ise KALDI. Depo oranı **> %25** ise KALDI. Hiç yağma yoksa depo koşulu BELİRSİZ. |
| Bot | **Akıncı** (saldıran), **pasif / kur-unut** (çevrimdışı hedef). Alfa-1 kuralları geçerlidir: yalnız vali ilan eder, aynı ilçeye ≥49 sa aralık, 14 gün yeni oyuncu kalkanı. |
| İşlevler | `h5ParselDegerlendir`, `parselKaybi`, `depoKaybiOrani` |
| v0.3 | 0,25 GEÇTİ |

### H6 — Geç katılan işe yarar

| | |
|---|---|
| Parsel ifadesi | 60. günde katılan oyuncunun, katılımdan 14 gün sonraki **hibeden bağımsız üretim geliri** (Y7) ilçe emsallerine göre yeterlidir; hücrelerin ≥ %20'si ≤ 2× taban fiyatla alınabilir. |
| **Karar metriği (BİRİNCİL)** | **Y7:** her geç katılan için katılımdan 14 gün sonraki **son 7 günün net üretim geliri** (= hazine akışı − sermaye harcaması: satış − girdi/ithalat − bakım − işçilik − arazi vergisi; arsa ve yapı parası hariç) ilçe emsallerinin (geç katılandan önce katılmış, ilçede hücresi olan ve ÜRETEN diğer sahipler) gelir medyanının **≥ %50'sinde** mi? Karar: bu olguların oranı (`y7UretimGeliri`). Hibe ve başlangıç kiti sermaye/stok olduğundan akışa girmez: tanım gereği hibeden bağımsızdır (T12 hibe şişkinliğinden korunur). |
| Metrik 2 (aynen) | Katılım anında satılmamış ve ilçe fiyat çarpanı (1 + 2·satılmış/uygun) ≤ 2 olan hücreler / tüm uygun hücreler (`ucuzHucrePayi`, `hucreFiyatCarpaniPpm`). Ayrıntı: ayrılmış ve genel ucuz hücre ayrı sayılır (`ucuzHucreAyrintisi`). |
| Emsal kuralı | **Emsal yalnız ÜRETİM YAPAN (7 günlük net üretim geliri > 0) yerleşik oyunculardır; geliri 0 ya da negatif olanlar (pasif, spekülatör, zarar eden) emsal medyanına girmez; üreten emsal yoksa Y7 ölçülemez ve karar BELİRSİZ olur** (baş lider kararı; sınır testli: gelir 0 dışarıda, 1 içeride). |
| Eşik | Y7: ölçülebilir geç katılanların **< %50**'si emsal medyanının ≥ %50'sine ulaşıyorsa KALDI. Ucuz hücre payı **< %20** ise KALDI. Biri ölçülemezse (üreten emsal yok, uygun hücre yok) BELİRSİZ; KALDI baskındır. |
| **İkincil (bilgi, karara girmez)** | **Servet tabanlı ulaşma:** katılımdan 14 gün sonra servet ≥ ilçedeki diğer sahiplerin servet medyanı (2·servet ≥ 2·medyan; `gecKatilanBasarisi`, `medyanaUlastiMi`). Servet = hazine + depo (taban fiyat) + arazi taban değeri (`degerMili`) + yapı. Çekirdeğin gerçek davranışı: hibe ve kit servete anında girer; **yurt hücresinin `degerMili`'si 0'dır, servete girmez**; ilk 5 yapıda yapı değeri = **ÖDENEN** indirimli tutar; ayrılmış hücre (ilçenin %20'si, ilk 14 gün) yalnız yeni oyuncuya satılır, geç katılan 14. günde erişir ama önceki yeni oyuncular tüketmiş olabilir. |
| İki biçim (servet) | **Ham** servet ve **arındırılmış** servet (− hibe − kit değeri). Ortak ofset altında `servet ≥ medyan` karşılaştırması DEĞİŞMEZ ⇒ iki biçim aynı kararı verir; yalnız servet/medyan oranı ve hibe+kit payı farklıdır (`servetOrani`). Hibeden bağımsız okuma Y7'dedir. |
| Neden Y7 birincil | Servet geçmiş birikimi taşır: 60. günde katılan, 74 günlük birikimi 14 günde yakalayamaz (yapısal KALDI); aynı pencerenin akışı (Y7) yeni oyuncunun "işe yarayıp yaramadığını" daha doğru ölçer. Ayrıntı: [parsel-v0-bulgular.md](parsel-v0-bulgular.md). |
| Bot | **Geç katılan** (3 açılış: `gec_ciftci`, `gec_sanayici`, `gec_pazar`): yerleşiklerin bulunduğu ilçeye katılır ve yeni oyuncu paketini kullanır (₺50.000 hibe, 6 bedava hücre, ilk 5 yapıda %30 indirim, 14 gün kalkan, `yapi_yerlestir`). |
| İşlevler | Birincil: `h6ParselIkiBicim` (karar = `birincil`: Y7 + ucuz hücre; `ikincil`: servet), `y7UretimGeliri`, `ucuzHucrePayi`, `ucuzHucreAyrintisi`. İkincil servet: `servetToplami`, `hibeArindir`, `servetOrani`, `gecKatilanIkiBicim`, `h6ParselDegerlendir`, `gecKatilanBasarisi`, `medyanaUlastiMi`. |
| v0.3 | 0,792 GEÇTİ (10./20. gün katılım, devlet içi bölge başına aynı pencerede üretim artışı medyanı; en yakın parsel karşılığı Y7) |

### H7 — Ayarla-unut ne çöker ne eşitlenir

| | |
|---|---|
| Parsel ifadesi | Bölge kipiyle aynıdır; 24/48/72. saat oranları **sahip** düzeyindedir. |
| Metrik | Aynı tohumla iki koşu yapılır. Odak sahibin tüm işletme düğümlerinin son 24 saatlik brüt üretim değeri (sabit taban fiyat) alınır; oran = kur-unut / aktif (`ayarlaUnutOrani`). |
| Eşik | Üç noktanın hepsi **[%50, %85]** içindeyse GEÇTİ. Dışındaysa yönü yazılır: > %85 eşitlenme, < %50 çöküş. |
| Bot | **Kur-unut** (pasif). Aktif karşılık **çiftçi**dir. |
| İşlevler | `ayarlaUnutOrani` |
| v0.3 | 0,357 KALDI (çöküş tarafı) |

### H8 — Arazi yoğunlaşması sınırlı (yeni)

| | |
|---|---|
| Parsel ifadesi | Arazi Gini ≤ 0,6; tek oyuncu ilçenin ≤ %25'i; yeniden satış fiyatı ≤ 10 haftalık arazi geliri. |
| Metrik 1 | Gini = (2·Σ i·x₍ᵢ₎ − (n+1)·Σx) / (n·Σx), x artan sıralıdır (`giniPpm`, BigInt). x = oyuncunun Σ hücre × sınıf taban fiyatı (1.000 / 2.500 / 6.500 ₺). Fiyat çarpanı ağırlığa girmez. Nüfus = ölçülen **tüm** oyunculardır; hücresi olmayanlar 0 olarak dahildir. İkincil: hücre sayısı Gini'si ve yalnız sahipler (`araziGini`). |
| Metrik 2 | Her (ilçe, oyuncu) için sahip olunan hücre / ilçenin uygun hücresi. **Karar:** en büyüğü. 72 hücre tavanını aşan çiftler ayrıca sayılır (`ilceYogunlasmasi`). |
| Metrik 3 | Her yeniden satışta fiyat / arsanın haftalık arazi geliri, mili-hafta cinsinden. Gelir = son 7 günün net üretim geliri (satış − girdi − bakım − arazi vergisi); gelir ≤ 0 ise oran sonsuz sayılır. **Karar:** medyan (`yenidenSatisOrani`). |
| Eşik | Gini **> 0,6**, en büyük ilçe payı **> %25** ya da medyan **> 10 hafta** ise KALDI. Hiç yeniden satış yoksa koşul 3 BELİRSİZ. |
| Bot | **Spekülatör**: hücre toplar, üretmez, yeniden satar. Diğer arketipler nüfusu oluşturur. |
| İşlevler | `h8Degerlendir`, `araziGini`, `giniPpm`, `ilceYogunlasmasi`, `yenidenSatisOrani` |
| v0.3 | — |

### H9 — Oyuncu piyasası ve yönetişim canlı (yeni)

| | |
|---|---|
| Parsel ifadesi | 1k oyuncuda NPC derinliği çekilirken emirlerin ≥ %80'i 1 saatte dolar; oy katılımı ≥ %30. |
| Ölçüm penceresi | Yalnız NPC derinliğinin (max(0, hedef − kayan oyuncu hacmi)) hedefin altına indiği dönem sayılır. Koşucu bu dönemi derinlik serisinden seçer ve raporlar. |
| Metrik 1 | 1 saat içinde **tamamen** dolan emirler / payda (`emirDolumOrani`). Paydaya girmeyenler: süre dolmadan oyuncunun iptal ettiği emirler ve 1 saatlik penceresi gözlem sonunu aşan dolmamış emirler. Her iki grup ayrıca sayılır. |
| Metrik 2 | Σ oy / Σ uygun seçmen; bilgi olarak en düşük seçim katılımı da yazılır (`oyKatilimi`). Uygun seçmen = parsel sahibi ve son 7 günün en az 3'ünde aktif (`uygunSecmenMi`). |
| Eşik | Dolum **< %80** ise KALDI. Katılım **< %30** ise KALDI. Alfa-0'da seçim yoktur (NPC vali), bu yüzden oy koşulu BELİRSİZ kalır. |
| Bot | **Tüccar** (emir), **yönetici** (aday olur ve oy toplar). Diğer arketiplerin oy verme davranışı katılımı belirler. |
| İşlevler | `h9Degerlendir`, `emirDolumOrani`, `oyKatilimi`, `uygunSecmenMi` |
| v0.3 | — |

### Özet

| # | Karar metriği | Eşik (vazgeçme) | Bot | Faz |
|---|---|---|---|---|
| H1 | En yaygın portföyün ilk-3 sınıf oranı | > %70 | çiftçi, sanayici | Alfa-1 tam rapor |
| H2 | Medyan tekrar · her hafta yeni tür payı | > %60 · < %50 | hepsi | Alfa-1 |
| H3 | Ordugâh ≥ %20 iken en büyük fiyat/arz değişimi | < %10 | komutan/akıncı | Alfa-1 (ordugâh) |
| H4 | 60 sn'de doğru yanıt | < 4/5 | insan | A1-5 |
| H5 | Parsel kaybı · en büyük depo kaybı | > 0 · > %25 | akıncı, pasif | A0-8, Alfa-1 |
| H6 | Y7 (hibeden bağımsız 14. gün geliri; oyuncu payı) · ucuz hücre payı | < %50 · < %20 | geç katılan | A0-8 |
| H7 | 24/48/72 sa kur-unut/aktif | [%50, %85] dışı | kur-unut | A0-8 |
| H8 | Gini · ilçe payı · yeniden satış | > 0,6 · > %25 · > 10 hafta | spekülatör | A0-8 |
| H9 | 1 sa dolum · oy katılımı | < %80 · < %30 | tüccar, yönetici | dolum A0, oy A1-3 |

---

## 5. Çekirdek mülk modeli (S3) gelince bağlama

S3, `parametreler.mulk` bayrağı arkasında hücre, işletme düğümü ve `parsel_al` / `tesis_insa_hucre` komutlarını getirir. Bağlama sırası:

1. **Kurulum.** Parsel kipi koşucusu fikstürü `parselFiksturuYukle(ad)` ile okur. Her il için merkez bölge `il.bolge`'dür. Her ilçe için `IlceDurumu { id, il, seviye, uygunHucre, satilmisHucre: 0 }` oluşturur. Hücre geçerliliği (ilçede mi, `uygun` mu) fikstürün hücre dizininden (`parselHucreDizini`) sorulur. Bu, sunucunun coğrafi doğrulamasının test karşılığıdır.
2. **Kayıt üretimi.** Metrikler simülasyonu okumaz; koşucu her örnekleme anında düz kayıt çıkarır:
   - `HucreDurumu[]` → `SahipliHucre { id, ilce, sinif, sahip }` (H5, H8)
   - `IlceDurumu` → `IlceDolulugu { uygunHucre, satilmisHucre }` (H6)
   - `IsletmeDugumu`'nun `bolgeIndeksi`'nden hazine, depo ve tesisler okunur → servet ve üretim (H6, H7); sahip düzeyi = oyuncunun tüm düğümlerinin toplamı
   - tesislerin `hucreler.length` değeri → `YapiKaydi.yuva` (H1 portföy, H3 ordugâh payı)
   - kabul edilen komut günlüğü → `KararKaydi { gun, tur }` (H2)
   - pazar emir defteri ve dolum olayları → `EmirKaydi` (H9)
   - yağma olayları ve depo serisi → `DepoPenceresi` (H5)
3. **Koşucular.** Yeni `parsel/hNKos` dosyaları eklenir. Mevcut `h1..h7.ts` dosyaları bölge kipi olarak **değişmeden** kalır. CLI'ye `--kip parsel|bolge` gelir (varsayılan: bolge). **Uygulama notu (baş lider kararı):** `--kip bolge` VARSAYILAN KALIR (mevcut H1–H7 koşucuları ve testleri değişmesin); `--kip parsel` şimdilik yalnız kısa koşuyu (H6, H8, Y) çalıştırır; parsel H1/H2/H3/H5/H7/H9 koşucuları sonraki iş. `--kip bolge` yalnız regresyon içindir ve v0.3 temel çizgisini yeniden üretmeye çalışmaz; o temel çizgi `1a7fe08`'de donmuştur.
4. **Botlar** (E20-G10, Sprint 2): §8.2'deki 8 arketip parsel komutlarıyla yazılır. H1'in pasif referansı ve H7'nin kur-unut eşi, bölge kipindeki ortak rastgele sayı düzeniyle kurulur.
5. **Ölçek.** Önce mini-6 ile duman testi yapılır (1.200 hücre). Sonra sentetik-50 (10.000 hücre, 1k bot) gelir; 10k bot için hücre sayısı yetmeyebilir (açık soru 3).

---

## 6. Açık sorular

1. **H2 oyuncu payı eşiği.** "Her hafta yeni tür" koşulu oyuncu başına ifade edildi. Birleştirme için %50 öneriliyor; lider onayı gerekiyor.
2. **H8 Gini nüfusu.** Hücresi olmayan oyuncular dahil edildi; bu daha sıkı bir seçimdir. Yalnız sahipler ikincil olarak raporlanır. Hangisinin bağlayıcı olacağına lider karar verecek.
3. **10k bot ölçeği.** sentetik-50'de 8.424 uygun hücre var. ≤72 hücre ve ≤%25 sınırlarıyla 10k oyuncu ancak oyuncu başına ~0,8 hücre alabilir. 10k koşusu ya ilçe başına 20×20 (40.000 hücre) ister ya da gerçek OSM ızgarasını. Üreticinin `ILCE_KENAR` değeri parametreleştirilebilir.
4. **Başlangıç ilçe seviyesi.** Şehir sınıfı hücreli ilçe 3 (Şehir) olarak başlatıldı. Ü6 (Merkez ve Şehir eşikleri) kararı bunu değiştirebilir.
5. **H1 sınıf skoru.** Sınıftaki ilçelerin medyanı mı, toplamı mı kullanılacak? Medyan öneriliyor. sentetik-50'de bazı sınıflar tek ilçelidir (`sehir_diger`, `kasaba_dag`); bu sınıflar gürültülüdür ve en az 2 ilçe şartı düşünülebilir.
6. **H9 "1k oyuncuda"** koşulu: sentetik-50 bölge pazarında NPC derinlik hedefi parametresi henüz yok (S3 / Pazar v1.5).

## 7. Yeni oyuncu ölçütleri (Y1–Y10), parsel botları ve kısa koşu

Kaynak: [baslangic-ve-ustalik.md](../arastirma/baslangic-ve-ustalik.md) §8. Saf işlevler `packages/olcum/src/parsel/yeni-oyuncu.ts` (`parsel.*`); tamsayı, ppm, BigInt; her eşik için sınır değer testi (`yeni-oyuncu.test.ts`). **Botlar eğlenceyi ölçmez**: Y1–Y4, Y6, Y8–Y10 **insan testi** olarak işaretlidir (`Y_OLCUTLERI`); bot sayıları yalnız gözlemdir.

| # | İşlev | Çekirdek durumundan türetilebilir mi | Not |
|---|---|---|---|
| Y1 | `y1IlkYapi` (`ilkOlayOrani`) | evet (komut günlüğü) | ≤ 10 dk, hedef ≥ %75; bot katılımda anında kurar: anlamsız (insan) |
| Y2 | `y2IlkSatis` | evet (emir gerçekleşmesi, ızgara + 10/60 dk ek gözlem) | ≤ 60 dk ≥ %70, ≤ 10 dk ≥ %50 (insan) |
| Y3 | `y3IlkSozlesme(null)` | **hayır: ölçülemez** | çekirdekte sözleşme/sipariş komutu yok (A6) |
| Y4 | — | **hayır: ölçülemez** | oturum telemetrisi (D1/D7) |
| Y5 | `y5AcilisCesitliligi`, `yapiKatmani` | evet | ilk 24 sa'te 2. yapının katmanı ≤ %60, hibrit oranı; bot + insan |
| Y6 | `y6YonDegistirme` | kısmen (oran; D7 farkı ölçülemez) | `parsel_birak`/`insaat_iptal` ilk 7 gün ≥ %10 (insan) |
| Y7 | `y7UretimGeliri` | evet | hibeden bağımsız net üretim geliri; bot + insan |
| Y8, Y9, Y10 | — | **hayır: ölçülemez** | Defter telemetrisi / Rehberlik yok / bekleme anları |

**Parsel botları** (`packages/botlar/src/parsel.ts`, `parsel-kosucu.ts`): `ciftci`, `sanayici`, `tuccar`, `gec_katilan` (`acilis`: ciftci | sanayici | pazar), `pasif` (kur-unut), `ciftci_tarim` (çiftçi + tarım yönetimi), `spekulator`. Komutlar: `oyuncu_katil {ilce}` + `yapi_yerlestir` + `ticaret_emri`; yönetim seçenekleriyle `ekim_plani`, `gubre_dozu`, `genel_onarim`; spekülatör `parsel_al`. Deterministik (rastgelelik yok), durumsuz, salt okunur karar; kamu arsasını (`kamuHucreMi`) almaz. `parselKos` koşucusu komut günlüğü, sermaye harcaması (arsa + yapı, ödenen indirimli tutarla) ve katılım kaydı tutar; `katilimRedDevam` ile kalabalık dünyada koşu sürer.
- **Tarım yönetimi** (`tarimYonetimi`): toprağa göre ekim planı (buğday/baklagil/nadas; histerezisli nöbet), gübre ihraç edilmez, stoğa göre `gubre_dozu` (24 sa histerezis).
- **Bakım yönetimi** (`bakimYonetimi`): bakım parçasını ithal eder (stok < 24 sa ise 72 saate tamamlar), aşınma ≥ %40 ise `genel_onarim`.
- **Spekülatör**: arsa biriktirir, üretmez; kit stoğunu satıp nakde çevirir; en ucuz sınıf ve en boş ilçelerden ilçe tavanına (72 / uygun hücrelerin %25'i) dayanır; yeni oyuncuyken ayrılmış hücreleri önce tüketir; `spekulatorYasli` (15. günde başlar) ayrılmış hücre hakkı bitmiş eski oyuncuyu temsil eder.

**İlçe seçimi** (`ilceSec(sim, acilis, secenek)`, `packages/botlar/src/parsel.ts`): saf, deterministik, çekirdeği yalnız okur. Sırasıyla (a) **yurt verebilen** ilçeler — çekirdeğin herkese açık `yurtPlanla(dunya, ic, ilce)` yardımcısıyla (kamu dışı, uygun, sahipsiz, kenar-bitişik yeterli hücre, %25 ilçe payı, ayrılmış hücre kuralından muaf; kendi kopyamız yok, çekirdekle birebir aynı kural); (b) **açılışa uygun** ilçeler — VERİ tablosu `ACILIS_ESLEMESI` (çiftçi: ciftlik|mera, il tercihi ova; sanayici: hidro_santrali, dağ; pazar: ciftlik|mera + ek yapı ticaret_ofisi, kıyı+ova); (c) il tercihi, (geç katılanda) en çok yerleşik sahibi olan ("emsal"; Y7 ölçülebilsin), en düşük doluluk, kimlik; (d) a ∩ b boşsa **"uygun ilçe yok"** kararı ve nedeni. Koşucu geç katılanı bu seçimle `oyuncu_katil {ilce}` ile katar; "uygun ilçe yok" ise oyuncuyu KATMAZ (çekirdeğin yedek ilçesine bırakmaz; yedek, yurdu açılışa uygun olmayan ilde verip oyuncuyu yapısız bırakabiliyordu) ve ayrı sayaçta tutar (rapor: "Uygun ilçe yok: n"; JSON `uygunIlceYok`). Yerleşik botlar eski davranışı korur; `--ilce-sec` / `yerlesikIlceSec` ile yerleşikler de `ilceSec` kullanır.

**Ayrılmış hücre garantisi** (`ayrilmisGarantisi`, `parsel/ayrilmis.ts`): iki yönlü. **İhlal** = ayrılmış hücre sahibinin katılımından ≥ 14 gün sonra alınmış (0 olmalı; sınır testli: tam 14. gün ihlaldir). **Koruma** = satılmamış / toplam ayrılmış hücre (geç gelen yeni oyuncu için ne kadar kaldı). Rapor §3a geç katılımdan hemen önce ve koşu sonunda verir.

**H8 koşul 3 (yeniden satış) BELİRSİZ kalır:** çekirdekte oyuncular arası arsa devri yoktur; `parsel_birak` devlete %70 iadeyle bırakır, fiyat oluşmaz. Rapor nedeni açıkça yazar.

**Kısa koşu:** `pnpm olcum --kip parsel [--tohum 1-3] [--gec-gun 10] [--olcum-gunu 14] [--bot ciftci=3,sanayici=2,tuccar=2,pasif=1,spekulator=0,spekulatorYasli=0] [--gec ciftci,sanayici,pazar] [--iklim hizli|gercek] [--harita mini-6|sentetik-50] [--tarim-yonetimi] [--bakim-yonetimi] [--ilce-sec] [--spekulator-gun 15] [--kalabalik] [--karsilastir onceki.json] [--cikti dizin] [--ad etiket] [--bulgular dosya.md] [--agir]` (varsayılan: mini-6 parsel fikstürü, 8 yerleşik + 3 geç katılan, 24 sim günü, tohum 1–3; ~1 sn/tohum). `--agir`: H6 tanımındaki 60. gün katılımı (74 gün), tohum 1–10. `--kalabalik`: mini-6'da 62 yerleşik bot (spekülatörler dahil; ~5× yoğun), `--harita sentetik-50` ile 310 bot (uzun sürer: ~40 sn / 9 gün; ağır test `BOLGE_AGIR_TEST=1`); ilçelerde yurt kalmayınca çekirdek yurtsuz katılım verir, rapor "yurtsuz oyuncu" sayısını yazar. `--karsilastir`: önceki koşunun JSON'u; rapora geç katılan açılışı başına gelir/emsal ve servet/emsal oranları ve Y7 payı yan yana eklenir. Çıktı: `parsel-<ad>.json` ve `.md` (md duvar saati içermez: aynı girdiyle bayt bayt aynı üretilir; elle yazılmış `parsel-<ad>-bulgular.md` ezilmez, rapor yalnız bağlantı verir). `--kip` verilmezse bölge kipi koşucuları aynen çalışır (v0.3 temel çizgisi donmuştur).

## Takım lideri kararları (1 Ekim, 06:55)
1. **H2 yeni karar türü eşiği:** oyuncuların ≥%50'si; önerildiği gibi kabul.
2. **H8 bağlayıcı Gini:** katılmış tüm etkin oyuncular (hücresi olmayanlar dahil). Yalnız sahiplere göre Gini ikincil olarak raporlanır.
3. **10k bot ölçeği:** sentetik-50 büyütülmez; ölçek testleri gerçek OSM ızgarasıyla (S6 hattı) yapılır.
4. **Şehir hücreli ilçe seviyesi:** Ü6 kararına kadar seviye 3 kalır.
5. **H1 sınıf skoru:** medyan. Tek ilçeli sınıflar raporda "gürültülü" diye işaretlenir.
6. **H9 NPC derinliği:** parametre S3/Pazar v1.5 ile gelir; o zamana kadar H9 yalnız oy katılımı ve emir dolum oranıyla ölçülür.
