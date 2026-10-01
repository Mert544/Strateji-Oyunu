# Araştırma — Arsa ve İnşa Sisteminin Derinleştirilmesi

> **Özet için §0'a bakın.** Bu rapor [11 §7.2–§7.3](../11-urun-donusu.md), [oyun tasarımı: parsel dünyası](oyun-tasarimi-parsel.md), [karo ve ızgara denemesi](karo-ve-izgara-denemesi.md), [çeşitlilik: üretim katmanları](cesitlilik-uretim-katmanlari.md) (§4.6, §5.4 OSB) ve [06 §15](../06-simulasyon-spesifikasyonu.md) üzerine kuruludur ve onları **tekrar etmez**; çekirdek yapıyı (arsa, yapı, inşa) detaylandırır. Sahip yönergesi (1 Ekim 2026): "Arsa ve inşa, yani çekirdek yapı detaylandırılabilir ama fikir güzel."

| Alan | Değer |
|---|---|
| **Durum** | Ar-Ge önerisi. Karar değildir; sayılar **başlangıç değeridir, kalibre edilmemiştir** (öneri / tahmin / doğrulanmadı etiketleri [11](../11-urun-donusu.md) ile aynı anlamdadır) |
| **Tarih** | 1 Ekim 2026 |
| **Kapsam** | Yalnız belge. Kod, veri ve commit yok |
| **Kural** | Strateji tabanlı, MMORPG değil. **Parsel zorla el değiştirmez.** "Sezon" yok: iklim takvimi / dönem |
| **Kod durumu notu** | Rapor yazılırken çalışma ağacında **işlenmemiş (uncommitted)** F3 değişiklikleri vardı: `mulk/yapi.ts` (ek yapılar: Ambar, Ticaret ofisi, Muhtarlık, Konut, Garaj, Atölye-Lab), `mulk/yurt.ts` (bedava yurt), ayrılmış hücreler, ilk-yapı indirimi. Rapor bunları **gördüğü hâliyle** esas alır; commit'ten sonra §1 bulguları yeniden doğrulanmalıdır |
| **Terim** | **Ölçek kademesi** = yapının S/M/L'si ([06 §12](../06-simulasyon-spesifikasyonu.md)). **İş büyüklüğü** = uygulama maliyeti, tablolarda **S/M/L** (küçük/orta/büyük). İki kavram karıştırılmamalı |

---

## 0. Özet (10 madde)

1. **Arsa üç eksenlidir; bugün biri eksik.** (a) *Yerleşim sınıfı* (kırsal/kasaba/şehir: fiyat; çekirdekte `ArsaSinifi` olarak **var**), (b) *kullanım türü* (tarla, bahçe, sanayi, ticari, konut, kıyı, orman: hangi yapının izinli olduğu; veri hattında var, çekirdekte **yok**), (c) *nitelik bayrakları* (kıyı, cadde cephesi, eğim, tarım koruma). [11 §7.2](../11-urun-donusu.md) "arazi sınıfı = tarla/sanayi/konut" der ama çekirdekteki `sinif` yalnız fiyatı belirler: bu iki kavram ayrılmadan imar yazılamaz (§1 B1, §2.1).
2. **Hazır arsa = yollarla çevrili ada → dengeli bölme → 4–12 hücre.** Hücre çekirdekte kalır; arsa **çekirdek dışı bir görünümdür** (kimlik, kitabe, "tek tık"). Böylece arsa tablosu sonradan yeniden üretilebilir, mülkiyet bozulmaz. Üretim, ilçe merkezinden dışa doğru **halkalar** hâlinde açılır; Alfa-0'ın ~20–25 M hücresinin %1'inden azı satışa çıkar (§2.3).
3. **Bugünkü fiyat çarpanı ve ayrılmış hücre kuralı hazır arsayla çakışıyor.** `1 + 2·(satılmış/uygun)` paydası tüm ilçenin uygun hücresidir (Gebze: 485.856); 40 sahip gelse bile çarpan ≈1,01 kalır ve kıtlık fiyatı **işlemez**. `ayrilmis` hücreler ilçeye **karma ile saçılmış** hücrelerdir; her arsanın %20'sini kıdemli oyuncuya kapatır. İkisi de **açık halka havuzu** ve **arsa düzeyinde** ayırma ile düzeltilmeli (§1 B2–B3).
4. **İmar üç anahtardır ve "rıza ilkesi" ile çalışır:** veri imarı (OSM'den türeyen kullanım türü), kural dönemi (izin matrisi, kotalar) ve karar (imar değişikliği başvurusu, OSB/sit/koruma ilanı). **Hiçbir karar, sahibi başvurmadan arsasının türünü ya da yapısını değiştirmez**; ilçe meclisi yalnız *yeni* başvurulara kota, bedel ve itiraz kuralı koyar. Gerçek karşılığı: 3194 imar planı/ruhsat düzeni, 5403 mutlak tarım arazisi koruması (§2.4).
5. **Değer = statik konum değeri (KD) + dinamik komşuluk.** KD (yol cephesi, merkeze mesafe, kıyı, eğim) hazine satış fiyatına girer. Komşuluk etkisi yalnız **verim, piyasa/kira bandı ve rozet** üzerinde etkilidir; **arazi vergisi tabanı ve hazine satış fiyatı komşunun eylemiyle oynamaz** (komşu zehirleme ve haksız vergi yok) (§2.5).
6. **Kira: Alfa-0'da yok; Alfa-1'de yalnız "üst hakkı" (kiracı kendi yapısını kurar).** Gerçekteki karşılığı TMK 826 üst hakkıdır: arsa mülkiyeti sahipte kalır, yapı kiracıya ait olur. Kiracı hücreleri **sahiplik tavanına (≤72, ≤%25) sayılır**; böylece kira tavan delme aracı olmaz. Şema kolay geri dönülebilir (isteğe bağlı alanlar), kural zor (§2.6).
7. **Yapı = yöntem × ölçek × modül.** Yöntem "ne üretir", ölçek "ne kadar", **modül "nasıl"**: hücre kaplamaz, ölçek başına 1/2/3 yuva ister (sera, silo, soğuk hava, güneş paneli, atık arıtma, ...). 35 modül tanımlandı, Alfa-0'a 5–6'sı yeter. Komşuluk **ada düzeyinde** (bileşim vektörü) hesaplanır: dört etki türü, ada / bitişik ada menzili, tavanlı. Hücre-hücre Anno dizilimi bulmacası **seçilmedi**: ada 4–12 hücre, bulmaca çıkmaz (§3).
8. **İnşa dört farklı talebi olan dört aşamadır:** Temel (para ve yapı malzemesi), İskele (yapı malzemesi), Gövde (yapı + donanım), Tamam (donanım ve işçilik). Alfa-0'da malzeme peşin rezerv edilir; Alfa-1'de **aşamalı çekim** (erken başla, eksikse bekle) gelir. Hızlandırma **para ile değil**: vardiya (üretim işçisinden çeker), hızlandırma malzemesi, imece. Gecikme **deterministik hava** (iklim takvimi × aşama) ve kendi kıtlığındır; rastgele "kötü şans" yoktur (§4).
9. **Müteahhit "kapasite kiralama"dır:** ekip (şantiye) kapasitesi satılır; yapı baştan işi verenindir. Ödeme para ya da tedarik sözleşmesi ("arsa payı karşılığı inşaat"ın oyunlaştırması). v1.5; Sözleşme panosu (P5) bağımlılığı var. Mahalle: ada karakteri, **ilçe gelişim puanı** (kişi başı katkı tavanı %15, seviye düşmez), **ada altyapısı** (açık üyelik + katılım payı) ve **imece** (ekip ödünç verme) (§5).
10. **Yapı önce yerleşim akışı için çekirdekte tek bir atomik komut gerekir** (`yapi_yerlestir`: arsa + yapı, hepsi ya da hiçbiri). [11 ek karar](../11-urun-donusu.md) "çekirdek değişmez, komut zinciri" der; iki ayrı komutta ilki başarılı, ikincisi başarısızsa oyuncu istemeden arsa sahibi kalır. Ayrıca **geri alma penceresi** ve **arsa iade (`parsel_birak`)** gerekir (§6, §7). En zor geri dönülen kararlar: kullanım türü ekseninin şemaya girişi, arsa donma kuralı, komşuluğun ada düzeyinde olması, vergi tabanının komşudan bağımsızlığı, imar yetkisinin kimde olduğu (§8).

---

## 1. Koddan ve belgelerden çıkan bulgular (yeni)

Aşağıdakiler önceki raporlarda yoktur; önerilerin çoğu bunlardan türer.

| # | Bulgu | Kanıt | Sonuç |
|---|---|---|---|
| **B1** | `ArsaSinifi` yalnız **fiyat sınıfıdır** (`kirsal/kasaba/sehir`); "hangi yapı izinli" bilgisi çekirdekte yok. Veri hattı ise altı **kullanım sınıfı** üretiyor (tarla, sanayi, konut, orman, yapılı, diğer; BHI1 bit 5–7) | `tipler.ts` (`ArsaSinifi`), [karo §3.1](karo-ve-izgara-denemesi.md); `parsel_al {sinif}` yalnız fiyat taban tablosuna bakıyor | İmar için ikinci eksen şart: `kullanim` (§2.1). Hücre sınıfını komutta istemek de gereksiz: sunucu zaten biliyor |
| **B2** | Fiyat çarpanı `1 + 2·satılmış/uygun`; `uygun` = ilçenin **tüm** satın alınabilir hücresi (Gebze 485.856). 30 sahip × 40 hücre = 1.200 hücre → pay %0,25 → çarpan **1,005** | `mulk/komut.ts` `parselFiyati`, `IlceDurumu.uygunHucre`; [karo §3.2](karo-ve-izgara-denemesi.md) | Kıtlık fiyatı ve "ilçenin ≤%25'i" kuralı pratikte işlemez. Payda **açık halka havuzu** olmalı (§2.3). Aynı havuzla 3.600 hücre → pay %33 → çarpan 1,67 |
| **B3** | `ayrilmis` (yeni oyuncuya ayrılan %20) = ilçenin uygun hücrelerinden **karma sırasıyla** seçilmiş saçılı hücreler | `derle.ts` `ayrilmisHucreler` | Hazır arsada her arsanın ~%20'si kıdemliye kapalı olur; "tek tıkla arsa al" kırılır. Ayırma **arsa düzeyinde** olmalı (§2.3) |
| **B4** | Bedava yurt, ilçenin **tüm** uygun hücrelerinin ağırlık merkezine en yakın bitişik 6 hücredir | `mulk/yurt.ts` | Gebze'de kara hücrelerinin %54'ü orman, %33'ü "diğer": merkez ormana düşebilir. Yurt **halka 0'daki bir hazır arsa** olmalı |
| **B5** | `tesis_insa_hucre` hücre listesinin **yalnız sayısını** denetliyor; bitişiklik ve biçim yok (bitişikliği "sunucu coğrafi doğrulaması" varsayıyor) | `mulk/komut.ts` | 2–3 hücreli yapının biçimi komşuluk ve çizim için tanımlı olmalı. Hücre kimliği `x:y` ayrıştırılabilir: denetim çekirdekte ucuz (§3.4) |
| **B6** | Çekirdek ekonomisi mekânsal değil: işletme düğümü (oyuncu, il) nüfus 0, işgücü ≈ tam istihdam; kirlilik il düzeyinde (`kirlilikPpm`); aşınma ve bakım düzeyleri var | [06 §15](../06-simulasyon-spesifikasyonu.md), `icerik.json`, `parametreler.json` (`sanayi.kirlilik`, `olcekKademeleri`, `bakim`) | Komşuluk, çözüme **önceden hesaplanmış çarpan** olarak girmeli (olay tetikli); tik başına mekânsal hesap yok |
| **B7** | "Yapı önce yerleşim" iki komut ister (`parsel_al` + `tesis_insa_hucre`); ikincisi başarısız olursa hücreler sahipte kalır. `insaat_iptal` yalnız inşaatı geri alır, **arsayı iade eden komut yok** | [11 ek karar](../11-urun-donusu.md) "çekirdek ve sunucu değişmez", `mulk/komut.ts` | Atomik `yapi_yerlestir` ve `parsel_birak` gerekir (§6.4) |
| **B8** | Çekirdekte S/M/L (çıktı ×1 / 2,2 / 3,6; işçi ×1 / 1,8 / 2,6; bakım ×1 / 2 / 3,2; inşa ×1 / 2,5 / 4,5), bakım düzeyi (asgari/normal/yüksek), genel onarım ve **kirlilik komşu yayılımı** zaten var; çıktı-girdi çarpanları veri güdümlü | `parametreler.json` `sanayi.*` | Modüller bu kolların **yatay kardeşidir**: yeni sistem değil, yeni veri + küçük çekirdek eki (§3.1) |
| **B9** | Ölçek eğrisi hücre başına çıktıyı artırır: 2 S Tarla (4 hücre) çıktı 2,0; 1 M Tarla (2 hücre) 2,2 | B8 sayılarından | "Yeni yapı" yerine "yükseltme" hep kazanır; yeni yapı yalnız **çeşit** ve **komşuluk** için anlamlı kalır. Dengeleme gerekir (§3.1) |

---

## 2. Arsa

### 2.1 Üç eksen

| Eksen | Değerler | Kim belirler | Neyi etkiler | Çekirdekte |
|---|---|---|---|---|
| **Yerleşim sınıfı** | kırsal / kasaba / şehir | Veri (nüfus, bina yoğunluğu, `place`) | **Taban fiyat** (1.000 / 2.500 / 6.500 ₺) | Var (`ArsaSinifi`) |
| **Kullanım türü** (imar durumu) | tarla, bahçe, sanayi, ticari, konut, kıyı, orman | Veri; sonra sahip başvurusu + ilçe kuralı | **İzinli yapı ve yöntem aileleri**, KD | **Yok** (öneri: `HucreTanimi.kullanim`) |
| **Nitelik bayrakları** | kıyı, cadde cephesi, ana yol, merkez mesafesi kovası, eğim kovası, ova/yayla, tarım koruma | Veri | KD (fiyat), komşuluk, imar değişikliği engeli | Yok (arsa tablosunda; çekirdek yalnız `koruma` bitini bilir) |

Gerçek karşılığı: Türkiye'de taşınmazın **tarla mı arsa mı** olduğunu belirleyen ölçüt imar planıdır; imar planı dışında kalan tarla yapılaşma hakkı taşımaz, planlı arsada yapı yapılabilir ([Pramo](https://pramo.com.tr/tarla-ve-arsa-farki-nedir-tapu-ve-imar-durumu-2025/); arama özeti). 3194 planları nazım ve uygulama imar planı olarak ayırır; yapılar için ruhsat zorunludur (md. 21) ([mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194-20120516.pdf)). Oyunda bu, **kullanım türü + izin matrisi + yerleştirme onayı (ruhsat)** üçlüsüne sade biçimde karşılık gelir; ayrı bir "ruhsat adımı" **yoktur**: hayaletin geçerli olması ruhsattır.

### 2.2 Arsa türleri ve izin matrisi

Kaynak: OSM `landuse` değerleri ([OSM wiki](https://wiki.openstreetmap.org/wiki/Key:landuse)): `farmland`, `orchard`, `vineyard`, `meadow`, `industrial`, `quarry`, `commercial`, `retail`, `residential`, `forest`, `greenhouse_horticulture`. Gebze'de ölçülen ham dağılım ([karo §3.2](karo-ve-izgara-denemesi.md)): kara hücrelerinin **%54,3 orman, %32,7 diğer, %5,9 tarla, %3,8 sanayi, %1,7 yapılı, %1,5 konut**. Yani OSM etiketi tek başına yetmez; tür atama hattı gerekir (§2.3 A4).

| Tür | OSM kaynağı / kural | Oyundaki rolü | Tipik yapılar | Not |
|---|---|---|---|---|
| **Tarla** | `farmland`, `meadow`, ova + düz eğim | Tahıl, sebze, hayvancılık | Tarla, Ahır, Sulama; (Mera) | **Tarım koruma** bayrağı alabilir (§2.4) |
| **Bahçe** | `orchard`, `vineyard`, `greenhouse_horticulture`, çay/fındık için il imza ürünü ([çeşitlilik §4](cesitlilik-uretim-katmanlari.md)) | Çok yıllık ürün, imza ürün | Tarla (bahçe yöntemleri), Sulama, arılık modülü | Don duyarlı (T5) |
| **Sanayi** | `industrial`, `quarry`, demiryolu sahası | Fabrikalar, maden, santral | Sanayi 8 yapı, Ambar, Garaj | **Sanayi Adası / OSB** bayrağı ([çeşitlilik §5.4](cesitlilik-uretim-katmanlari.md)) |
| **Ticari** | `commercial`, `retail` + POI yoğunluğu (`shop`, `amenity`, `office` ≥3 / 100 m) | Pazar, hizmet, atölye | Ticaret ofisi, Atölye-Lab, Ambar, Garaj, küçük atölye | Cadde cephesi primi |
| **Konut** | `residential`; "yapılı" ve bina ≥%10 hücreler (POI az) | İşgücü ve nüfus tavanı | Konut; küçük Ticaret ofisi | **Hassas** (kirlilik) |
| **Kıyı** | Kıyı şeridi (≤3 hücre ≈ 87 m) ve sanayi/orman olmayan | Liman erişimi, su ürünleri, manzara | Ambar (liman), Ticaret ofisi, Konut, yetiştiricilik yöntemi | Sanayi hücresi kıyıdaysa tür Sanayi kalır, **kıyı bayrağı** alır |
| **Orman** | `forest`, `wood`, ağaç örtüsü ≥%50 (WorldCover) | Odun, arılık, maden girişi | Mera (orman işletmesi / arılık yöntemi), Maden, Santral (hidro) | Alfa-0'da çoğu hücre burada; **satışa halka dışında açılmaz** |

**İzin matrisi (öneri).** ✓ serbest · ○ şartlı (yalnız belirtilen yöntem/ölçek, arsa başına 1 adet, ya da imar değişikliği) · ✗ yasak. Kural dönemi parametresidir (`mulk.imar.izin[kullanim][yapi]`).

| Yapı | Tarla | Bahçe | Sanayi | Ticari | Konut | Kıyı | Orman |
|---|:--:|:--:|:--:|:--:|:--:|:--:|:--:|
| Tarla | ✓ | ✓ (bahçe yöntemi) | ✗ | ✗ | ✗ | ○ (yetiştiricilik) | ✗ |
| Ahır | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |
| Mera | ○ (`meadow`) | ○ (arılık) | ✗ | ✗ | ✗ | ✗ | ✓ |
| Sulama | ✓ | ✓ | ✗ | ✗ | ✗ | ○ | ✗ |
| Gıda fabrikası | ○ (S, ada başı 1) | ○ (S, ada başı 1) | ✓ | ✗ | ✗ | ○ | ✗ |
| Maden ocağı / Petrol kuyusu | ○ | ✗ | ✓ | ✗ | ✗ | ✗ | ✓ / ○ |
| Çelikhane, Elektronik, Gübre, Mühimmat | ✗ | ✗ | ✓ | ✗ | ✗ | ✗ | ○ (yalnız Mühimmat) |
| Parça atölyesi | ✗ | ✗ | ✓ | ○ (S, "zanaat atölyesi") | ✗ | ✗ | ✗ |
| Santral | ○ (yalnız güneş modülü) | ✗ | ✓ | ✗ | ✗ | ○ | ○ (hidro) |
| Ambar, Garaj | ○ (çiftlik ambarı) | ✗ | ✓ | ✓ | ✗ | ✓ (Ambar) | ✗ |
| Atölye-Lab | ✗ | ✗ | ✓ | ✓ | ○ | ✗ | ✗ |
| Ticaret ofisi | ✗ | ✗ | ○ | ✓ | ○ | ○ (liman ofisi) | ✗ |
| Konut | ○ (çiftlik evi, arsa başı 1) | ○ (arsa başı 1) | ✗ | ○ (üst kat) | ✓ | ✓ | ✗ |
| Ordugâh (Alfa-1) | ○ | ✗ | ○ | ✗ | ✗ | ✗ | ○ |
| Muhtarlık (kamu) | ✗ | ✗ | ✗ | ✓ | ✓ | ✗ | ✗ |

Gerekçe: Türkiye'de tarım arazisinin amaç dışı kullanımı sıkı denetimlidir; **mutlak tarım, özel ürün, dikili ve sulu tarım arazileri tarım dışı kullanılamaz**, diğer tarım arazileri koruma projelerine uyulması kaydıyla valilikçe tahsis edilebilir (5403) ([mevzuat.gov.tr](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5403.pdf), [özet](https://gayrimenkulmevzuati.com/toprak-koruma-ve-arazi-kullanimi-kanunu/)). Matrisin Tarla/Bahçe sütunundaki ✗'ler bu esinle, Tarım katmanının çekirdeğini fabrikalaşmadan korur.

### 2.3 Hazır arsa üretim kuralları

**Terimler.** **Ada** = yollarla ve engellerle çevrili kapalı alan (blok). **Arsa** = adanın 4–12 hücrelik satış parçası. **Halka** = ilçe merkezinden uzaklığa göre açılış katmanı. Çekirdek yalnız **hücreyi** bilir; arsa, ada ve halka **veri/sunucu katmanında** yaşar.

**Üretim hattı** (`packages/veri-hatti/src/osm/`; BHI1 ve z15 karolarının devamı):

| Adım | Kural | Determinizm / not |
|---|---|---|
| **A1 Alan** | Satın alınabilir hücreler ([karo §3.1](karo-ve-izgara-denemesi.md): yol/su ≥%50 ve askeri hariç) ∧ halka uygunluğu | Mevcut BHI1 |
| **A2 Ada çokgenleri** | Sürülebilir yollar (`motorway…residential`, `unclassified`; `service` yalnız mahalle yolu düzeyindeyse), demiryolu, `river`/`canal`, kıyı çizgisi, ilçe sınırı **düzlemsel çizgi ağı** olarak çokgenlenir (polygonize). `footway/path/track` ada sınırı değil. Hücre, merkezinin düştüğü çokgenin (adanın) hücresidir | Blok → lot bölme, prosedürel şehir üretiminde bilinen yaklaşımdır ([Parish ve Müller 2001](https://dl.acm.org/doi/pdf/10.1145/1185657.1185716); makale tam okunmadı) |
| **A3 Bölme** | Adadaki hücre sayısı `n`: `n ≤ 12` → tek arsa. `n > 12` → **dengeli ikili bölme** (kd-ağacı): hücre merkezlerinin yayılımı en büyük eksene dik kes, `k = round(n/8)` parçaya kadar tekrarla; hedef boyut 8, aralık 4–12. Eşitlik bozma: quadkey sırası. `n < 4` parçalar komşu arsaya katılır; komşu yoksa "ham parça" (satışa çıkmaz) | Tam tamsayı işlemleri; iki koşu bayt bayt aynı |
| **A4 Tür atama** | (1) BHI sınıf histogramı: baskın ≥%50 → o tür. (2) "diğer"/"yapılı" hücreler: bina ≥%10 → konut ya da POI ≥3/100 m ise ticari. (3) Eksik OSM etiketi: **WorldCover** (10 m, CC BY 4.0) ağaç örtüsü ≥%50 → orman; ekili alan ≥%50 → tarla ([ESA WorldCover](https://docs.terrabyte.lrz.de/datasets/esaworldcover/)). (4) Hâlâ belirsiz: komşu arsa çoğunluğu. (5) Kıyı: kıyı şeridi hücreleri ≥%50 ∧ tür ∈ {konut, ticari, diğer} → Kıyı | Gebze'de OSM etiketi eksik ([karo §6](karo-ve-izgara-denemesi.md)); WorldCover genel doğruluğu ~%75 (arama özeti), oyun için yeter; ODbL ile uyumu hukuki görüşe dahil (R-Ü5) |
| **A5 Bayraklar** | Cadde cephesi (yol kapsaması %1–49: [karo §4.3](karo-ve-izgara-denemesi.md) "ek fikir"), ana yol cephesi, merkeze mesafe kovası (≤300 m, ≤1,5 km, ≤5 km, >5 km), kıyı, eğim (DEM: >%15), ova/yayla, **tarım koruma** | Mapterhorn DEM zaten planda |
| **A6 Statik KD** | §2.5 formülü | Tamsayı ppm |
| **A7 Halka** | Halka 0 = ilçe merkezi ≤1 km (≈3,1 km² ≈ 3.700 hücre), halka 1 ≤2,5 km, halka 2 ≤5 km, halka 3 kalan. Açılış: halka doluluğu ≥%70 olunca sonraki halka (kademeli ilçe açılışının hücre içi karşılığı) | Merkez: OSM `place` düğümü; yoksa bina ağırlık merkezi |
| **A8 Çıktı** | İlçe başına `arsa.json.gz`: `{id, hucreler (şerit kodlu), tur, bayraklar, kdPpm, komsuAda[], halka}`. `arsaId = "a" + base36(en küçük quadkey)` | Türev veritabanı: ODbL dosyası ([karo §6](karo-ve-izgara-denemesi.md) ile aynı kural) |

**Hazır arsa havuzunun boyutu (neden halka).**

| Büyüklük | Değer | Kaynak |
|---|---|---|
| Kocaeli kara hücresi | 4,08 M ([karo §3.2](karo-ve-izgara-denemesi.md)) | Ölçüldü |
| Alfa-0 toplamı (Kocaeli + Sakarya + Bursa) | ≈ **20–25 M** hücre | Tahmin (alan oranı: Sakarya ≈4.900, Bursa ≈10.800 km²; doğrulanmadı) |
| Alfa-0 oyuncu | ≤200; oyuncu başına gerçekçi hücre 20–60 | [11 §6](../11-urun-donusu.md) + öneri |
| Gerçek talep | ~200 × 40 ≈ **8.000 hücre** ≈ dünyanın **%0,04'ü** | Hesap |
| Önerilen açık havuz | ilçe başına `hedef sahip × arsa/sahip × 3` = 25 × 6 × 3 = **450 arsa ≈ 3.600 hücre** | Öneri |

Bu hesabın üç sonucu: (i) dünya, halka olmadan **%99,9 boş** görünür ve "boş dünya" riski (R-Ü6) büyür; (ii) fiyat çarpanı paydası açık havuz olmalıdır (B2); (iii) bedava yurt ve ayrılmış hücre **halka 0 arsalarından** seçilmelidir (B3, B4).

**Ayrılmış arsa (yeni oyuncu).** Hücre değil **arsa** karması: ilçenin açık arsalarından `karma(arsaId)` sıralı ilk %20'si "ayrılmış" olur (14 gün). **Ayrılmış arsa fiyatı ≤2 × taban** (H6) açıkça kelepçelenir: `min(fiyat, 2 × taban × hücre)`; KD primi ayrılmış arsada uygulanmaz.

**Donma kuralı (geri dönüşü zor).** Arsa tablosu **sürümlüdür** (`arsaSurumu`). Satılan arsa ve içindeki hücreler ilk satıştan itibaren **donar**: sonraki OSM güncellemeleri yalnız **satılmamış** hücrelerin arsa gruplarını değiştirir ve yalnız **dönem sınırında** (kural dönemi sınırıyla aynı kural; [11 §10](../11-urun-donusu.md)). Mülkiyet hücre düzeyinde olduğu için arsa yeniden gruplansa da kimsenin hücresi değişmez; ama **arsa kimliği** ("Parsel #A3F2", kitabe, bildirim geçmişi) satılmış arsalarda **kalıcı** olmalıdır.

### 2.4 İmar durumu ve yetkisi

**Üç anahtar.**

| Anahtar | İçerik | Kim | Alfa-0 | Alfa-1 |
|---|---|---|---|---|
| **1. Veri imarı** | Arsanın kullanım türü (§2.2), bayraklar | Sistem (OSM + kurallar) | Sabit | Yalnız başvuruyla değişir |
| **2. Kural dönemi** | İzin matrisi, kotalar, bedel yüzdeleri, koruma payı | Takım (parametre komutu, dönem sınırında) | Sabit | Sabit; valinin `tarim_koruma` gibi yasaları **yalnız oranı** oynatır |
| **3. Karar** | İmar değişikliği başvurusu, OSB / sit alanı / teşvik ilanı, itiraz | NPC kural motoru → **ilçe meclisi** | NPC yazılı ölçüt | Meclis oyu (aktif sahipler), muhtar yalnız gündem |

**Rıza ilkesi (öneri; "parsel asla zorla el değiştirmez"in doğal uzantısı).** *Bir arsanın kullanım türü ve üzerindeki yapı, sahibinin başvurusu olmadan değişmez.* İlçe kararları yalnız **yeni** başvurular için kota, bedel ve itiraz koşulu koyar; mevcut yapıya dokunmaz ([çeşitlilik: yönetim §3.4](cesitlilik-yonetim-askeri-teknoloji.md) madde 3 ile uyumlu). Bu, "muhtar rakibin yanındaki arsayı sanayi ilan etsin" saldırısını baştan keser.

**İmar değişikliği başvurusu** (`imar_basvur {arsa, hedefTur}`; Alfa-0'da NPC kural motoru, Alfa-1'de meclis):

| Kural | Değer (öneri) |
|---|---|
| Koşul: boş arsa ya da yapısız hücreler | Yapılı arsada önce yıkım (§3.6) |
| Koşul: uyum | Hedef tür, aynı ya da bitişik adada en az bir **aynı türden** arsayla temas eder **ya da** ana yol cephesi vardır (plan bütünlüğü) |
| Koşul: korumalı değil | **Tarım koruma** bayraklı Tarla/Bahçe arsalarının dönüşümü yasak (5403 esinli); koruma payı il düzeyinde ilk %60 (valinin `tarim_koruma` yasası ±%20 oynatır) |
| Koşul: hassas komşu | Hedef tür **kirli** ise (sanayi) bitişik adalarda hassas yapının **kirlilik bütçesi** dolmamalı (§3.4) |
| Bedel: **imar katkı payı** | `(hedef tür değeri − mevcut değer) × %50` ilçe kasasına; değer farkı yoksa sabit ₺ (taban × 0,25 × hücre) |
| Kota | İlçede haftada en çok açık hücrenin %1'i dönüşebilir (aşırı spekülasyon freni) |
| Süre ve **askı** | 24 sa askı; bitişik adaların sahipleri **itiraz** edebilir; hassas komşuların ≥%50'si itiraz ederse ret. (Gerçekte planlar askıya çıkar ve itiraz hakkı vardır; süre ve ayrıntı doğrulanmadı) |
| İade | Ret hâlinde bedelin %80'i iade |

Gerçek karşılığı: arsa düzenlemesinde yol, park gibi umumi hizmet alanları için **düzenleme ortaklık payı** alınır ve oran **%45'i geçemez** (md. 8 ve 18) ([özet](https://gayrimenkulmevzuati.com/imar-kanunu/), [metin](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194-20120516.pdf)); oyundaki imar katkı payı bu **değer yakalama** mantığının sade hâlidir (tek yönlü artış payı, ilçe kasasına).

**Yetki dağılımı özeti (öneri).**

| Karar | Alfa-0 | Alfa-1 | Neden |
|---|---|---|---|
| Kullanım türü ilk ataması | Veri hattı | Veri hattı | Oynanış dışı adalet; OSM'den türer |
| Başvuru onayı | NPC ölçütleri | Meclis (aktif sahipler) | Yürütme yasamayı toplamasın |
| Kota ve bedel oranı | Sabit | Meclis ±%50 bandında | Kontrollü yetki |
| OSB / sit / teşvik ilanı | Yok (OSB: veri bayrağı) | İlçe kartları ([çeşitlilik D3](cesitlilik-yonetim-askeri-teknoloji.md)) | Zaten planlı |
| İzin matrisi | Takım | Takım | Denge parametresi; oyuncu oyuna vurmasın |
| Mevcut yapıyı değiştirme | **Hiç kimse** | **Hiç kimse** | Rıza ilkesi |

### 2.5 Arsa değeri dinamikleri

**Fiyat (hazine satışı, hücre başına):**

```
fiyat(hücre) = taban[yerleşim sınıfı] × (1 + 2 × açıkHavuzdaSatılmışPay) × KD_statik
KD_statik   = clamp(1 + Σ terimler, 0,70, 1,60)
```

| KD terimi | Değer (öneri) | Not |
|---|---|---|
| Cadde cephesi (yol kapsaması %1–49) | +%8 | "Cadde cephesi" önerisi [karo §4.3](karo-ve-izgara-denemesi.md) |
| Ana yol cephesi (`trunk/primary/secondary`) | +%12 | Cadde cephesiyle toplanmaz (büyüğü) |
| Yola ≥4 hücre (~120 m) uzak, kırsal | −%10 | Arka arsa |
| Merkeze mesafe | ≤300 m: +%20 · ≤1,5 km: +%10 · ≤5 km: 0 · >5 km: −%10 | Halka ile ilişkili |
| Kıyı (Konut/Ticari/Kıyı türü) | +%15 | Sanayi kıyısı (liman): +%10 |
| Liman / OSB girişine ≤600 m (Sanayi, Ambar) | +%10 | |
| Eğim >%15 (Tarla/Konut) | −%10 | Mapterhorn DEM |
| Örnek | Şehir sınıfı, Konut, merkeze 250 m, cadde cephesi: 6.500 × 1,2 (satış payı %10) × 1,28 ≈ **9.980 ₺/hücre** | |

KD **statiktir** ve arsa tablosuna yazılıdır; çekirdek, parametre olarak `kdPpm` alır (sunucu komuta yazar; `parsel_al` fikstür ile aynı yolu izler).

**Dinamik değer (komşuluk).** Kaynaklar §3.4'te (E1–E4). Dinamik değer endeksi `DD = KD_statik + komşuluk(−%25…+%40)`. **Nerelerde kullanılır:**

| Kullanım | DD etkisi | Gerekçe |
|---|---|---|
| Yapı **verimi** | Evet (çarpan, §3.4) | Oynanışın asıl bağı |
| **Piyasa / kira bandı** (oyuncular arası satış önerisi, üst hakkı kirası) | Evet | Pazar gerçeği |
| Arsa kartı rozeti ("değer ↑ %6") | Evet | Okunurluk |
| **Hazine satış fiyatı** | **Hayır** (yalnız KD_statik) | Komşu zehirleyip ucuza almayı engeller |
| **Arazi vergisi tabanı** | **Hayır** (alış bedeli; Alfa-1: ilçe emsal endeksi ile yeniden değerleme, **komşu-özel değil**) | Sahip, komşusunun eylemiyle vergi artışına uğramaz; vergi, spekülasyon freni olarak sahibin kendi kararına bağlı kalır |

**Neden.** Naavik'in tavsiyesi arazi *konum rantını* vergilemektir ([Naavik](https://naavik.co/deep-dives/digital-land-tax/)); ama oyunda rantı **başkası** da yaratabilir (komşu fabrika). Bu yüzden vergi bedelle (alış), verim ve piyasa değeri ise komşulukla oynar. Böylece vergi hâlâ "tutma maliyeti"dir, komşuluk "yer seçme kararıdır".

**Dışsallıklar için benzer oyunlardan dersler.**

| Oyun | Ne yapıyor | Bize ne |
|---|---|---|
| Cities: Skylines | Toprak/su kirliliği ve gürültü konut ve ticaret arsa değerini düşürür; **sanayi bina seviyesini etkilemez**; parklar, hizmet erişimi ve kıyı değeri artırır ([wiki](https://skylines.paradoxwikis.com/Land_value), [özet](https://www.keengamer.com/articles/guides/8-ways-to-increase-land-value-in-cities-skylines/)) | **Hassas / kirli ayrımı**: kirlilik hassas yapıya vurur, kaynağa vurmaz |
| Cities: Skylines Industries | Uzmanlaşmış alan (industry area): ana yapı + üretici/işleyici/depo; zincir aynı alan içinde; depo ve bazı özel yapılar alan dışında olabilir ([wiki](https://skylines.paradoxwikis.com/Industry_areas), [özet](https://skylines.paradoxwikis.com/Industries_DLC_Tutorial)) | **Sanayi Adası / OSB**: zincirli bonus alan içinde |
| Earth2 | Arazi satılırken üzerindeki yapı, kaynak ve konum fiyatı etkiler; tile tier'ları fiyatı ayırır ([E2 University](https://e2.university/guides/earth2-tile-tier-explained/)) | Fiyat = konum + üstündeki yapı; ama oyun oynanışsız spekülasyona kaymasın (R-Ü7) |
| Upland | Oyuncu yapı için "Spark" (işgücü saati) bağlar; bu saat başkalarına **kiralanabilir** ([udonis](https://www.blog.udonis.co/blockchain/upland), [nonfungible](https://nonfungible.com/news/game/new-way-to-build-with-upland)) | Ekip ödünç verme / müteahhit (§4.6, §5.4) |

### 2.6 Kira ve kiralama

**Yaklaşım.** Strateji oyununda arsa kirası **sermayesi olmayana** (yeni oyuncu) imkân, **kullanmayana** (hareketsiz) gelir sağlar; ama iki büyük risk taşır: **tavan delme** (alt hesaptan kiralama ile 72 hücre/%25 aşımı) ve **aklama** (kira bir transfer kanalıdır). Gerçek hukuk bize iki ayrı araç öğretir: **kira** (kullanım) ve **üst hakkı** (başkasının arsasında yapı kurma ve yapının sahibi olma; TMK md. 826, yapı mülkiyeti md. 726; sürekli üst hakkı ≥30 yıl) ([özet](https://gayrimenkulmevzuati.com/ust-hakki/), [özet 2](https://barandogan.av.tr/blog/gayrimenkul-hukuku/ust-hakki-irtifaki-davasi)).

| Seçenek | Açıklama | Artı | Eksi | Karar |
|---|---|---|---|---|
| (a) Kira yok | Yalnız satın alma | En basit; tavan ve aklama yok | Sermayesizler yalnız hibe/yurtla kalır; hareketsiz arsa "ölü" | **Alfa-0** |
| (b) İşletme kirası | Kiracı sahibin yapısını işletir | Gerçek | Stok iki sahip arasında bölünür; çekirdekte işletme düğümü sahip bazlı: **büyük değişiklik** | Elendi |
| **(c) Üst hakkı** | Arsa sahipte; kiracı **kendi yapısını kendi işletme düğümünde** kurar; süre sonunda yapı arsa sahibine kalır ya da söküm | Çekirdek modeline uyar (yapı kurucunun düğümünde); tek araç | Kural karmaşası (tavan, vergi, bitiş) | **Alfa-1 sonu / v1.5** |
| (d) Kat karşılığı (yapı payı) | Müteahhit yapıyı kurar, çıktının payını alır | Gerçek yapı | Ortak üretim hattı; çekirdekte yok | Elendi; yerine tedarik sözleşmesi (§4.6) |

**Üst hakkı sözleşmesi (ÜHS) kuralları (öneri).**

| Konu | Kural |
|---|---|
| Taraflar | Arsa sahibi (ilan eder) ve kiracı (kabul eder). Sahip **hücreyi elinden çıkarmaz** |
| Süre | 14 / 28 / 56 gün; **otomatik yenileme yok** (iki taraf onayı) |
| Kira | Günlük; **bant**: `[1×, 4×]` günlük arazi vergisi (sahip zarara girmez, spekülatif kira yok); tembel akış (hazineden hazineye saatlik oran) |
| Yapı izni | İmar matrisine uyan yapılar; sahip ilanda **tür listesi** sınırlar |
| Tavan | Kiracı için de sahip için de sayılır: **`sahip + kiracı` hücreleri ≤72 ve ≤%25**. Kiralamak tavan hakkı kazandırmaz |
| Vergi | **Sahip** öder (kira bandı bunu karşılar); kiracı yapı bakımını öder |
| Erken fesih | Kiracı terk edebilir (yapı sahibe kalır, iade yok). **Sahip dönem içinde çıkaramaz** (rıza ilkesi). Temerrüt: hazine 0'da 7 gün kira ödenmezse sözleşme biter, yapı sahibe %40 bedelle devredilir |
| Dönem sonu | (a) Sahip yapıyı `rayiç × %60` ile devralır (kiracının hakkı), (b) kiracı yenileme teklif eder, (c) söküm: kiracı malzeme geri kazanımını alır (§3.6) |
| Kötüye kullanım | Aynı IP/aygıt ve yeni hesap transfer tavanı ([11 §10](../11-urun-donusu.md), R-Ü11); kira bandı aklamayı sınırlar |
| Çekirdek şeması | `HucreDurumu.kiraci?`, `kiraBitis?` isteğe bağlı alanlar; `tesis_insa_hucre` hücre sahibi yerine "sahip ya da etkin kiracı" denetler. Alanlar boşsa özet değişmez: **şema geri dönülebilir**; **kurallar** (tavan, vergi kimde, dönem sonu) zordur |

### 2.7 Birleştirme, bölme ve devir

Çekirdekte **tek sahiplik birimi hücredir**; bu nedenle "birleştirme" ve "bölme" komut değil, **türetilmiş görünümdür**.

| İşlem | Karşılığı | Kural |
|---|---|---|
| **Birleştirme (tevhid)** | Aynı sahibin bitişik hücreleri otomatik tek "parsel" olarak gösterilir; "Genişlet" = komşu boş hücre/arsa alma | Çekirdek komutu yok. UI "Genişlet": önce ada içi kalan boş hücreler, sonra bitişik boş arsa |
| **Bölme (ifraz)** | Oyuncular arası **kısmi satış / devir**: sahip, hücre kümesini ayırıp satar | **Yapı bütünlüğü:** bir yapının hücreleri bölünemez; ayrılan her parça **bitişik** ve ≥2 hücre (ya da bir yapının tüm ayak izi) olmalı. Küçük tek hücre artıkları pazarı kirletmesin |
| **Devir** | Oyuncudan oyuncuya satış (`parsel_sat`, Alfa-1) | Sabit fiyatlı ilan; fiyat bandı `[0,5×, 2×] DD`; alıcı tavanı ve yeni hesap transfer tavanı; satış sonrası **7 gün** alıcı yeniden satamaz (anti-flip) |
| **Açıklama** | Gerçek karşılıkları: tevhid (birleştirme), ifraz (bölme), kat irtifakı ve kat mülkiyeti ([ifraz/tevhid](https://investtime.com.tr/blog/ifraz-ve-tevhid-nedir/), [kat irtifakı](https://www.akbank.com/blog/kat-irtifaki-nedir-kat-mulkiyeti-ile-arasindaki-farklar)) | Kat mülkiyeti oyunda **yok**: bir hücrede bir yapı; konut "ek kat" modülü ile kapasite alır (§3.3) |

### 2.8 Hareketsiz arsa ve açık artırma

[11 §7.8](../11-urun-donusu.md): 14 gün uyku → 45 gün çürüme (%2/gün) → 90 gün Hollanda usulü açık artırma. Çekirdek şimdilik yalnız `sonEtkinlik` verisini tutuyor. Bu, "parsel asla zorla el değiştirmez" kuralının **tek istisnasıdır**; bu yüzden yumuşatılır:

| Kural | Değer (öneri) |
|---|---|
| Uyarı | 60. günde dönüş mektubu (e-posta + oyun içi), 80. günde son uyarı |
| **Geri alma hakkı** | Açık artırma ilan edildikten sonra sahip **herhangi bir anda** giriş yapıp tahakkuk eden vergiyi ödeyerek açık artırmayı iptal eder (ilk teklif gelene kadar); teklif geldiyse satış sürer, sahip **alacaklı** olur |
| Başlangıç fiyatı | `1,2 × arsa değeri` + yapı değeri (aşınma düşülmüş) |
| Düşüş | Günde %5, taban `0,5 × arsa değeri`; teklif gelince biter |
| Katılabilen | Aktif oyuncu; tavan altında; hesap yaşı ≥14 gün (kara para freni) |
| Gelir | Önce borç (vergi) düşülür; kalan, eski sahibe **alacak** olarak yazılır (dönüşte teslim) |
| Yapı | Yapı arsa ile satılır; "harabe" (çürüme >%40) ise söküm değeriyle |
| Tatil modu | Yılda ≤30 gün; ilanı durdurur |
| Çıkar grubu | NPC kaymakam yalnız duyuru yapar; **parsel kararı yoktur** |

Ölçüm: açık artırmaya çıkan arsaların oranı ve geri alma oranı (H11, §7.4).

---

## 3. Yapılar

### 3.1 Üç eksen: yöntem × ölçek × modül

| Eksen | Soru | Çekirdekte | Değişim maliyeti | Örnek |
|---|---|---|---|---|
| **Yöntem (varyant ailesi)** | Ne üretir / hangi tarifle? | Var (`yontemler`, `yontem_degistir`; teknoloji kilitli) | Düşük | Çiftlik: geleneksel ↔ mekanize; Çelikhane yöntemleri |
| **Ölçek kademesi (S/M/L)** | Ne kadar? | Var (`olcekKademeleri`; ilçe seviyesi + `otomasyon` kilidi) | Orta (aynı hücrelerde yükseltme, süre ×0,5) | Çıktı ×2,2; işçi ×1,8; bakım ×2 |
| **Modül (ek)** | Nasıl? Hangi riski/bedeli yönetir? | **Yok** | Düşük–orta (kısa inşa, ayak izi yok) | Sera, silo, soğuk hava, güneş paneli, atık arıtma |

**Karar kuralı** (hangisi yöntem, hangisi modül): çıktı/girdi **kümesi** değişiyorsa yöntem; var olan kümeyi çarpan, koruma ya da bakım ile değiştiriyorsa **modül**. Bu kural [çeşitlilik T8](cesitlilik-uretim-katmanlari.md) "Sera yöntemi" ve T11 "Arılık" için **yeniden sınıflandırma** önerir: sera, aynı ürünü farklı eğri ve korumayla verdiği için **modüldür**; mekanizasyon zaten yöntemdir (`mekanize_tarim`); hayvancılık türleri (manda, süt, koyun) yöntemdir.

**Modül mimarisi (öneri).**

| Konu | Kural |
|---|---|
| Ayak izi | **Hücre kaplamaz.** Ana yapının hücresine takılır; "1 hücre = 1 yapı yuvası" korunur |
| Yuva | Ölçek kademesine bağlı: **S: 1, M: 2, L: 3** modül yuvası. Aynı modül yapı başına en çok 1 |
| İnşa | Kısa mini inşaat (ana inşaatın %15–30'u), **1 ekip**; yapı çalışırken sürer (üretim durmaz) |
| Etki biçimi | Mevcut kollar: `ciktiPpm`, `isciPpm`, `bakimPpm`, `kirlilikPpm`, `asinmaPpmGun`, `bozulmaPpm`, `olayKorumaPpm` (don/kuraklık/dolu), `depoEkiPpm`, `iletimKaybiPpm`, `rezervVerimPpm` ([06 §12](../06-simulasyon-spesifikasyonu.md) ölçek kademeleri ile aynı tür) |
| Kilitler | Teknoloji, ölçek ya da ilçe seviyesi; **modülün kendi bakımı** vardır (ayarla-unut'u bozmaz: bakım stoğu bitince modül verimi yalnız kendini kaybeder) |
| Değiştirilebilirlik | Modül **söküle** bilir (kısa söküm, %30 geri kazanım); yuva yeniden kullanılır. **Köklü yenilemede** (§3.5) bedava yeniden donatım |

**Neden hücre-hücre dizilim (Anno) seçilmedi.** Anno 1800'de silo gibi modüller çiftlik ana yapısına **bitişik** olmalı ve yol bağlantısı ister; çiftlik başına 5 siloya kadar destek verir ([silo](https://anno1800.fandom.com/wiki/Silo), [üretim yapıları](https://anno1800.fandom.com/wiki/Production_buildings); arama özeti). Bizde ada 4–12 hücre ve oyuncu zaten hücre seçmekten sıkıldı ([11 ek karar](../11-urun-donusu.md)); dizilim bulmacası yerine **yuva sayısı** ve **ada bileşimi** kullanılır. Manor Lords'un "arsa başına 1 arka bahçe eki" kuralı da bu yönü destekler: ek yapı arsaya bağlıdır, serbest planlanmaz ([wiki](https://wiki.hoodedhorse.com/Manor_Lords/Burgage_plot); arama özeti).

**Yükseltme mi yeni yapı mı** ([B9](#1-koddan-ve-belgelerden-çıkan-bulgular-yeni)). Ölçek yükseltmesi hücre başına çıktıyı artırdığı için "yeni yapı" ona karşı yalnız **çeşit** ve **komşuluk** ile rekabet eder. Dengeleme:

| Mekanizma | Etki |
|---|---|
| Yükseltme **aynı ayak izinde** | Hücre ve vergi artmaz; yükselme maliyeti ölçek çarpanı ×2,5 / ×4,5 (inşa) |
| Kaynak puanı ölçekle büyür | E1 kirlilik puanı × ölçek (1 / 1,6 / 2,4): L daha çok komşuyu rahatsız eder (§3.4) |
| Kırılganlık | L: tek nokta arıza (aşınma, brownout, baskın); işçi ×2,6 |
| Kilit | M: ilçe Kasaba; L: ilçe Merkez + `otomasyon` |
| Yeni yapı değeri | Zincir kademesi bonusu (E2), modül çeşitliliği, ek ürün; **ada başına** yapı sayısı arttıkça yakınlık verimi (E4) |

### 3.2 18 yapı: varyant, modül, komşuluk rolü, ömür

Rol: **K** kirli kaynak · **H** hassas · **D** destek (altyapı/hizmet) · **Z** zincir ara halkası. Ömür: tam verimli kullanım süresi (gün; §3.5). Yapı yuvaları [11 §7.3](../11-urun-donusu.md) ile aynıdır.

| # | Yapı | Rol | Yöntem/varyant aileleri (mevcut → önerilen) | Modül adayları | Ömür | Yıkım / yeniden kullanım |
|---|---|:--:|---|---|:--:|---|
| 1 | **Tarla** | H, Z | tahıl, mekanize → bahçe (fındık, zeytin, çay, meyve), sebze | **Sera**, silo, damla sulama, arılık | 60 | Temel hazır (Tarla ↔ Ahır: yuva aynı) |
| 2 | **Ahır** | K (koku, hafif), Z | `ahir_besi` → süt, manda, kümes | Süt soğutma, **gübre toplama** (komşu tarlaya +1 organik doz), yem silosu | 60 | Ahır → Tarla dönüşümü (aynı yuva) |
| 3 | **Mera** | H | `mera_hayvancilik` → koyun-yün, **orman işletmesi** (odun), arılık | Ağıl/su kuyusu, arılık | 90 | Hafif (kalıcı yapı az) |
| 4 | **Sulama** | D | kanal → damla/yağmurlama | Pompa istasyonu, gölet | 90 | Ada altyapısına katkı sayılır |
| 5 | **Gıda fabrikası** | K (koku, hafif), Z | standart → konserve, süt işleme, **olgunlaştırma** (T7) | Soğuk hat, paketleme, olgunlaştırma odası | 90 | Gübre fab. ↔ Gıda fab. dönüşümü (aynı yuva) |
| 6 | **Maden ocağı** | K, Z | cevher/kömür/bakır/silis (yöntem) | Havalandırma, kırıcı-eleme, sondaj kulesi | 120 | Rezerv kalıcı; yıkım rezervi geri getirmez |
| 7 | **Petrol kuyusu** | K | ham petrol (+ rafineri yöntemi, Ü5) | Pompa jakı, depolama tankı | 120 | |
| 8 | **Çelikhane** | K (yüksek) | standart → elektrik ark fırını | **Atık arıtma**, ısı geri kazanım | 120 | 3 hücre: Santral ile dönüşebilir |
| 9 | **Parça atölyesi** | K (hafif), Z | `parca_fabrikasi` → CNC, zanaat atölyesi (S9) | CNC hattı, bakım atölyesi | 90 | Elektronik ↔ Parça dönüşümü |
| 10 | **Elektronik** | H (titreşim/toz), Z | standart → yarı iletken (sonra) | Temiz oda, bakım atölyesi | 90 | |
| 11 | **Santral** | K (termik), D | kömür/gaz → hidro, **güneş eki** | Atık arıtma, batarya bankası, **güneş paneli** | 120 | 3 hücre |
| 12 | **Gübre fabrikası** | K, Z | standart | Granül hattı, atık arıtma | 90 | |
| 13 | **Mühimmat fabrikası** | K (patlama riski), Z | standart | **Güvenli depo** (olay kaybı −%70) | 120 | **Hassas komşu aranmaz: ada izolasyonu** |
| 14 | **Ambar** | D | depo (`ambar`, mevcut) | **Soğuk hava odası**, yangın sistemi, raf eki | 150 | Ek yapı; yıkımda stok kapasitesi düşer (boşaltma uyarısı) |
| 15 | **Garaj** | D | filo kapasitesi (mevcut) | Yakıt istasyonu, **şantiye ekipmanı (+1 ekip)** | 120 | |
| 16 | **Atölye-Lab** | H, D | araştırma yuvası | Test tezgâhı | 120 | |
| 17 | **Ticaret ofisi** | H, D | emir yuvası, sözleşme | Vitrin, ek emir masası | 150 | |
| 18 | **Konut** | **H (en hassas)**, D | işgücü/nüfus tavanı | **Ek kat** (+%50 kapasite), bahçe/avlu (+KD) | 150 | Konut ↔ Ticaret üst kat |
| ✚ | Ordugâh (A1) | K (hafif) | birlik üretimi | Talim sahası, revir | 150 | |
| ✚ | Muhtarlık | D (kamu) | meclis, ortak proje | Kitabe levhası | — | Yıkılamaz |

### 3.3 Modül kataloğu

Faz: **A0** = Alfa-0 çekirdeği · **A1** = Alfa-1 · **S** = sonra. İş: S/M/L (küçük/orta/büyük; veri + çekirdek eki). Sayılar başlangıç önerisidir.

| Modül | Takıldığı yapılar | Etki (öneri) | Bedel / bakım | Dokunduğu kol | Faz | İş |
|---|---|---|---|---|:--:|:--:|
| **Atık arıtma** | Çelikhane, Santral, Gübre, Petrol, Mühimmat, Maden, Gıda | Kirlilik kaynağı **−%50**; komşuluk E1 puanı −%50 | Bakım +%10; çıktı −%2 | `kirlilikPpm`, `bakimPpm` | **A0** | S |
| **Bakım atölyesi** | Tüm sanayi, Garaj | Aşınma hızı −%30; genel onarım süresi −%50 | Bakım +%5 (parça) | `asinmaPpmGun` | **A0** | S |
| **Silo / depo eki** | Tarla, Ahır, Gıda fab. | Yerel stok kapasitesi +%50; hasat israfı azalır | Bakım küçük | `depoEkiPpm`, `bozulmaPpm` | **A0** | S |
| **Sera** | Tarla | Don/kuraklık/dolu hasarı **−%80**, çıktı +%25, hasat penceresi bir dönem genişler | Elektrik/yakıt girdisi ekler; bakım +%20 | `olayKorumaPpm`, `ciktiPpm`, iklim penceresi | **A0** | M |
| **Soğuk hava odası** | Ambar, Gıda fab. | Bozulma ×0,5 daha (Ambar'ın ×0,5'ine ek ×0,6), elektrik ister | Elektrik girdisi | `bozulmaPpm`, girdi | **A0** | S |
| **Güneş paneli** | Elektrik girdili her yapı, Santral | Elektrik talebi **−%25 (yaz) / −%8 (kış)**; 12 aylık güneş eğrisi ([hidro eğrisi](../06-simulasyon-spesifikasyonu.md) gibi, iklim takvimi) | İnşa para ağırlıklı; bakım +%5 | yeni `gunesEgrisiPpm`, elektrik girdisi | A1 | M |
| Damla sulama | Tarla, Bahçe | Su stresi kaybı −%50 (Sulama yapısı yokken); Sulama ile çakışmaz (büyüğü) | Parça | `olayKorumaPpm` | A0 (isteğe bağlı) | S |
| Arılık | Tarla, Bahçe, Mera | Aynı adadaki bahçe/tarla verimi **+%5–10** (tozlaşma, ada içi); bal niş malı | Küçük | komşuluk, mal | A1 | M |
| Gübre toplama | Ahır | Aynı adadaki Tarla'ya **1 organik gübre dozu** ücretsiz | Bakım | `gubre_dozu` bağı | A1 | M |
| Süt soğutma | Ahır | Süt bozulma ×0,5 | Elektrik | `bozulmaPpm` | A1 | S |
| Ağıl / su kuyusu | Mera | Mera verimi +%10; kuraklık kaybı −%30 | Küçük | `ciktiPpm`, `olayKorumaPpm` | A1 | S |
| Pompa istasyonu | Sulama | Sulama kapasitesi +%50 (ada + bitişik ada Tarla/Bahçe) | Elektrik girdisi | E3 menzili | A1 | M |
| Gölet | Sulama | Kuraklık olayında 1 dönem tam koruma | Bakım | `olayKorumaPpm` | S | M |
| Soğuk hat / paketleme | Gıda fab. | Çıktı bozulma ×0,5 / değer +%5 (ihracat primi) | Elektrik | mal değeri | A1 | M |
| Olgunlaştırma odası | Gıda fab. | Bekleme → kalite (T7) | Zaman, depo | kalite alanı (P9) | S | L |
| Havalandırma | Maden | Verim +%10; kaza olayı −%50 | Elektrik | `ciktiPpm` | A1 | S |
| Kırıcı-eleme | Maden | Çıktı +%15; elektrik girdisi | Bakım +%10 | `ciktiPpm`, girdi | A1 | S |
| Sondaj kulesi | Maden, Petrol | Keşif başarısı +%10, keşif süresi −%25 | Parça | `damar.kesif*` | A1 | S |
| Pompa jakı | Petrol | Çıktı +%10; rezerv tükenişi +%5 hızlı | Elektrik | `ciktiPpm`, rezerv | A1 | S |
| Isı geri kazanım | Çelikhane | Yakıt girdisi −%10 | Bakım | girdi | A1 | S |
| CNC hattı | Parça atölyesi | Çıktı +%12; elektrik +%10; teknoloji kilidi | Bakım +%15 | `ciktiPpm` | A1 | S |
| Temiz oda | Elektronik | Aşınma verim kaybı tavanı −%50; kalite | Bakım +%20 | `asinmaVerimKaybiTavani` | S | M |
| Batarya bankası | Santral | Brownout kesinti süresi −%40 | Para | elektrik | A1 | M |
| Yedek jeneratör | Elektrik girdili yapılar | Brownout'ta %50 kesintisiz çalışma | Yakıt | elektrik | A1 | M |
| Güvenli depo | Mühimmat | Patlama/yangın olayı kaybı −%70; E1 güvenlik puanı −%50 | Bakım | olay | A1 | S |
| Yangın sistemi | Ambar | Afet kaybı −%50 | Bakım | olay | A1 | S |
| Raf eki | Ambar | Depo +%30 | Küçük | `depoEkiPpm` | A1 | S |
| **Şantiye ekipmanı** | Garaj | **+1 inşa ekibi** (en çok 2 modül; toplam ekip ≤4) | Bakım | ekip sayısı | A1 | M |
| Yakıt istasyonu | Garaj | Otomatik filo yakıt tüketimi −%10 | Küçük | lojistik | S | S |
| Vitrin / ek emir masası | Ticaret ofisi | Emir yuvası +2; NPC talebi ×1,03 | Küçük | `emirYuvasi` | A1 | S |
| **Ek kat** | Konut | Konut kapasitesi +%50; bakım +%25 | İnşa | nüfus tavanı | A1 | S |
| Bahçe/avlu | Konut | Çevre KD +%5 (aynı ada Konut) | Küçük | KD | S | S |
| **İşçi yurdu** | Sanayi, Maden | İşçi ihtiyacı −%10 (işgücü sıkışıklığında öncelik) | Bakım | `isciPpm` | A1 | M |
| Talim sahası / revir | Ordugâh | Birlik üretim süresi −%10 / yaralı dönüşü | | askeri | A1 | S |
| Güvenlik çiti | Tüm yapılar (Alfa-1) | Baskında devre dışı oranı −%50 | Küçük | askeri | A1 | S |

Alfa-0 için **5 modül** (+ isteğe bağlı 6.: Damla sulama): Atık arıtma, Bakım atölyesi, Silo/depo eki, Sera, Soğuk hava odası. Her biri **farklı çekirdek kolunu** sınar (kirlilik, aşınma, depo, olay koruması, bozulma); modül altyapısı ve `modul_ekle` komutu bunlarla kanıtlanır.

### 3.4 Komşuluk ve etki alanları (Anno / Cities tarzı, ada düzeyinde)

**İlkeler.**

1. **Ada düzeyi.** Komşuluk hücre aralığıyla değil, **ada bileşim vektörüyle** hesaplanır: her adada yapı türü ve ölçek sayıları. Menzil üç kademedir: **aynı ada ×1,0 · bitişik ada ×0,5 · (isteğe bağlı) mahalle ×0,2** (bitişik adanın bitişikleri). Hücre aralığı kullanılsaydı sınır belirsizliği ve "iki hücre öteye koy" mikro-yönetimi çıkardı.
2. **Olay tetikli.** Yapı tamamlandığında/yıkıldığında/modül eklendiğinde, **etkilenen adaların** yapılarının `komsulukPpm` çarpanı yeniden hesaplanır (yaklaşık ≤40 yapı). Tik başına mekânsal hesap **yok**; çözüm yalnız önceden hesaplanmış çarpanı kullanır (B6).
3. **Tavan.** Toplam komşuluk çarpanı yapı başına `[0,80; 1,30]`; etki türü başına tavan aşağıda.
4. **Açık.** Hayalet yerleşirken **etki halkaları** ve net sonuç görünür ("+%7 verim; 2 komşuya −%3").
5. **Önceden bilgi, sonradan zarar yok:** *etki bütçesi* (aşağıda).

**Dört etki türü.**

| Kod | Etki | Kaynaklar | Alıcılar | Değer (öneri) | Tavan |
|---|---|---|---|---|---|
| **E1** | **Kirlilik / gürültü / koku** (olumsuz) | Çelikhane 3 · Santral (termik) 3 · Petrol 2 · Maden 2 · Gübre 2 · Mühimmat 2 (+ patlama) · Parça atölyesi 1 · Gıda fab. 1 · Ahır 1 · Elektronik 0,5; **× ölçek (1 / 1,6 / 2,4)**; arıtma modülü ×0,5 | **Hassas:** Konut (ağırlık 3), Tarla/Bahçe (2), Gıda fab. (1), Ticaret ofisi (1), Atölye-Lab (1), Elektronik (1) | Hassas yapının verim kaybı `Σ puan × menzil × %2`; piyasa değeri kaybı bunun ×1,5'i | −%20 (verim), −%25 (değer) |
| **E2** | **Zincir kümelenmesi** (olumlu) | Aynı adada ardışık kademeler (örn. Maden → Çelikhane → Parça; Tarla → Gıda fab.) | Zincirdeki yapılar | Her kademe çifti **+%5 çıktı**, bitişik adada ×0,5 ([çeşitlilik S4/S5](cesitlilik-uretim-katmanlari.md) ile aynı) | +%15 |
| **E3** | **Altyapı paylaşımı** (olumlu) | Santral → ada içi iletim kaybı 0; Sulama (+ pompa) → Tarla/Bahçe kuraklık koruması; Ada altyapısı (§5.3) | Aynı adadaki elektrik/su girdili yapılar | İletim kaybı %5 → 0 (aynı ada); kuraklık kaybı −%50 | — |
| **E4** | **İşgücü ve hizmet yakınlığı** (olumlu) | Konut → Sanayi/Ticari; Ticaret ofisi → Konut; Ambar/Garaj → bozulma | Sanayi/Ticari yapılar (işgücü), Konut (hizmet) | Aynı adada her Konut için işçi ihtiyacı −%2 (≤−%10); bitişik ada ×0,5; Ticaret ofisi → Konut KD +%5 | −%10 işçi |

Konut'un çekirdekteki işlevi bugün yer tutucu ([yapi.ts](../../packages/cekirdek/src/mulk/yapi.ts)); E4 ona ilk gerçek etkiyi verir (işgücü yakınlığı) ve "iş-konut dengesi"ni **işe gidiş simülasyonu olmadan** kurar ([oyun tasarımı §1](oyun-tasarimi-parsel.md): W&R dersi).

**Etki bütçesi ve kıdem koruması (komşu zehirleme önlemi).**

| Kural | İşleyiş |
|---|---|
| **Aynı ada yasağı** | Hassas yapı bulunan adaya, **imar türü Sanayi değilse**, yeni kirli yapı yerleşemez (izin matrisi zaten sağlar) |
| **Kirlilik bütçesi** | Her hassas yapının E1'den uğrayabileceği toplam kayıp **kıdemli olarak ≤%10**. Yeni kirli yapı yerleşimi, bu bütçeyi aşacaksa **geçersizdir** ("Komşu Konut'un kirlilik bütçesi dolu: arıtma modülü ekleyin ya da başka ada seçin") |
| **Sonradan gelen hassas** | Hassas yapı **sonradan** kirli komşunun yanına kurulursa bütçe yok sayılır (gönüllü risk); hayaletteki uyarı: "Çelikhane 60 m: −%14" |
| **Arıtma çözümü** | Kirli kaynak arıtma modülüyle E1'i yarıya indirir; bütçe daha çok yer açar |
| **Kasıtlı yerleşim** | Kirli yapıyı ucuz arsa için hassas komşu **yanına** kurma yolu yoktur (satın alma fiyatı KD_statik; dinamik değer yok) |

**Kirli yapıların mekânsal yeri.** İl düzeyi kirlilik (`kirlilikPpm`, komşu bölgeye yayılım) **korunur**; E1 yalnız **ada ve bitişik ada** için ek bir mekânsal katman ekler. İkisi çakışırsa tek tavan (−%20) geçerlidir.

### 3.5 Bakım, yaşlanma ve yenileme

Bugün: aşınma (`asinmaPpm`), bakım düzeyi (asgari/normal/yüksek), genel onarım (6 sa durma, maliyet %20), verim kaybı tavanı %40. Eksik: uzun vadeli **yenilenme** kararı ve yaşın içerik açması.

| Kavram | Kural (öneri) |
|---|---|
| **Yaş** | Tamamlanma anından **türetilir** (durum yazılmaz): `yaş = (şimdi − tamam) / ömür(tür)` (§3.2 ömür sütunu: 60–150 gün) |
| **Kademe** | Yeni (<%50) · Olgun (%50–100) · **Eskimiş** (≥%100) |
| **Eskimiş etkisi** | Genel onarım aşınmayı tam sıfırlamaz (taban +%10); bakım girdisi +%25; toplam kayıp **≤%15** (ayarla-unut'u cezalandırmaz) |
| **Köklü yenileme** | Mini inşaat (süre %40, maliyet %35, **Temel aşaması yok**), **1 ekip**; yaş sıfırlanır; **yöntem ve modül setini bedava yeniden seçersin** (yeniden donatım) |
| **Neden** | 20–25. gün tazeliği ([11 §7.11](../11-urun-donusu.md)) için sistemsel yeni karar; para lavabosu; yönelim değiştirme maliyetini ([başlangıç §3.3](baslangic-ve-ustalik.md)) yapıya yayar; **zorunlu angarya değil** |
| Zorunlu değil | Eskimiş yapı çalışır; yenileme **fırsattır**, ceza değil |
| Hareketsizlik | 45 gün sonra %2/gün çürüme ([11 §7.8](../11-urun-donusu.md)) yaş kademesinden **bağımsız**; çürüme yenileme ile geri dönmez, yalnız onarım/aktif oyunla durur |

### 3.6 Yıkım ve yeniden kullanım

Çekirdekte yıkım komutu **yok** (yalnız `insaat_iptal`). Öneri: `yikim {tesis}`.

| Konu | Kural |
|---|---|
| Kim | **Yalnız sahibi** (savaşta bile yapı yıkılmaz; [11 §7.7](../11-urun-donusu.md)) |
| Süre | Söküm **kısa inşaat gibi**: yapı süresinin %20'si, **1 ekip**; "Söküm" aşaması görünür |
| Geri kazanım | İnşa malzemesinin **%35'i** (çelik/parça); para yok. Ağır sanayi %40, tarım %25 (öneri) |
| Hücre durumu | Söküm bitene kadar hücre "enkaz" (inşaata kapalı); sonra boş |
| **Temel yeniden kullanımı** | Yıkımdan sonra **14 gün** içinde aynı hücre kümesinde (ya da alt kümesinde) yeni yapı: **Temel aşaması atlanır** (süre −%20), yapı malzemesi −%10 |
| **Dönüştürme** | Aynı yuva sayısı ve izinli tür: örneğin Parça atölyesi ↔ Elektronik, Gıda fab. ↔ Gübre fab., Tarla ↔ Ahır: söküm yarısı + inşa %60, **Temel hazır** |
| Modüller | Yıkımda modüller %30 geri kazanılır |
| Kamu / ortak | Muhtarlık ve ortak proje yapıları yıkılamaz |
| İptalden farkı | **İptal** (inşaat sürerken): %50 iade; **Yıkım** (tamamlanmış yapı): %35 geri kazanım. Böylece "kaynak saklama" için tam yıkım tüm bedeli geri vermez |

---

## 4. İnşa süreci

### 4.1 Dört aşamanın oyunsal anlamı

Bugün: aşama sürenin üç eşit diliminden ve bitişten **türetilir**; her aşama aynı malzeme talebini taşır (hepsi başlangıçta ödenir). Öneri: dört aşamanın **farklı talebi, farklı gecikme duyarlılığı ve farklı görseli** olsun.

| Aşama | Süre payı | Oyuncu için anlamı | Malzeme/para talebi (toplamın %'si) | Gecikmeye duyarlılığı | Haritada (L3) | Sokakta (L4) | İptal iadesi |
|---|:--:|---|---|---|---|---|:--:|
| **Temel** | %20 | "Karar verdim": arsa mühürlenir, **taşınmaz (iade edilemez) bölümü** biter | Para **%35**; yapı malzemesi %30 (çimento/çelik); donanım 0 | **Hava** (don/yağış: ×1,10–1,20) | Kahverengi tarama, kesikli kontur, 1/4 halka | Kazı çukuru, temel dökümü, vinç | %50 |
| **İskele** | %25 | İskelet: ada **bileşimi** artık görülür (komşuluk önizlemesi kesinleşir) | Para %20; yapı malzemesi %40 | Rüzgâr/kar (×1,05–1,10) | Çizgili iskelet, 2/4 halka | İskele boruları, çelik/ahşap çatı | %50 |
| **Gövde** | %35 | Asıl kalem: **donanım ve yapı malzemesi** çekilir; en çok **malzeme kıtlığı** burada olur | Para %25; yapı %30; **donanım %30** | **Malzeme (aşamalı çekimde)** + hava (döküm) | %60 dolgu, 3/4 halka | Duvarlar, pencere boşlukları | %50 |
| **Tamam** | %20 | Kabul: **modüller bağlanır**, yöntem seçilir, ilk üretim | Para %20; **donanım %70** | İşgücü/ekip | Tam renk, tek kısa nabız, ✓ rozet | Tabela, ışık, yer kaplama | — |

Süre payları, çekirdekteki `insaatAsamasi` işlevi ağırlıklı kesişimlere geçirilerek uygulanır; aşama yine **saklanmaz**. Toplam para ve malzeme değişmez, yalnız **zamana dağılımı** değişir.

Malzeme sınıfları mevcut içeriğe şöyle eşlenir: **yapı malzemesi** = çelik (ve ileride çimento/kereste, [çeşitlilik #28](cesitlilik-uretim-katmanlari.md)); **donanım** = parça (ve elektronik: Atölye-Lab, Elektronik). Mevcut `insaMaliyeti: {celik, parca}` iki kalemiyle yapılabilir.

**Benzer oyunlardan.** Banished'ta işçiler önce malzemeyi şantiyeye taşır, ekip ancak tüm malzeme gelince inşa eder ([wiki](https://banished-wiki.com/wiki/Builder)); Foundation'da temel, toplam malzemenin bir bölümü sahada olmadan başlamaz ve evler kendiliğinden seviye atlar ([wiki](https://foundation-game.fandom.com/wiki/Buildings), [inceleme](https://bitsnpixels.org/p/foundation-medieval-city-builder-review); arama özeti); Manor Lords'ta malzeme depoda hazır olmadan yapı yerleştirilemez, öküzler ve halk taşır ([wiki](https://wiki.hoodedhorse.com/Manor_Lords/Burgage_plot)). Bizim lojistik **otomatik** olduğu için taşıma görünmez; "malzeme gelişi" yalnız **bekleme rozetinde** görünür.

### 4.2 Malzeme çekimi: peşin ve aşamalı

| Mod | Davranış | Artı | Eksi | Faz |
|---|---|---|---|---|
| **Peşin (rezerv)** | Başlangıçta tüm para + malzeme düşülür (**bugünkü davranış**); bekleme yok | Basit, ayarla-unut dostu | Nakit ve malzeme baştan bağlanır | **A0** |
| **Aşamalı** | Başlangıçta **Temel** payı (%35 para + %30 malzeme); sonraki aşama **başlarken** kendi payı çekilir; eksikse **bekleme** (zaman donar, ceza yok); eksik gelince kaldığı yerden sürer | Erken başlama; malzeme üretilirken şantiye açılır; zincirli oyunda **tedarik zamanlaması kararı** | Çekirdek: aşama sınırı olayı + `bitis` yeniden planlama | A1 |

**Çekirdek notu.** Aşamalı çekim, aşama sınırlarında `insaat_asama` olayı ve beklemede `bitis` kaydırması ister. Mevcut `insaat_iptal` kalıbı (bayat `insaat_bitti` olayının inşaat bulunamayınca etkisiz kalması) burada `ins.bitis !== olay.t` karşılaştırmasına genişler. **Ayarla-unut koruması:** bekleyen aşama için eksik malzeme, **gelince otomatik** çekilir (oyuncu çevrimdışıyken inşaat kaldığı yerden sürer).

### 4.3 Ekip ve inşaat kuyruğu

| Kavram | Kural (öneri) |
|---|---|
| **Ekip** | Şantiye kapasitesi birimi. Başlangıç **2** (bugünkü `esZamanliInsaat`); **S ve M** yapı ve yükseltme **1 ekip**, **L** yapı ve yükseltme **2 ekip**, söküm 1, köklü yenileme 1, modül 1 |
| **Ek ekip kaynağı** | Garaj **şantiye ekipmanı** modülü (+1, en çok 2 modül) ve `prefabrik` teknolojisi (+1); toplam ≤4. **Para ile ekip yok** |
| **Plan listesi** | Aktif şantiyelerin yanında **6 sıraya alınmış** inşaat (taslak değil: arsa ve malzeme **ayrılmış** değildir). Ekip boşalınca **sırayla başlar**, yalnız malzeme **yeterliyse**; yetersizse sıra atlanır ve rozet "▲ Malzeme" gösterir |
| **Taslak (hayalet)** | Parasız, sınırsız, **hiçbir şey ayırmaz** (Anno Blueprint). Başkası arsayı alırsa taslak "geçersiz" olur |
| **Yer tutma** | Maliyet kartı açıkken sunucu **120 sn yumuşak rezerv** tutar (kalıcı değil, çekirdek dışı); onaylamadan çıkarsa düşer. Çakışmada "Arsa az önce satıldı; en yakın 3 alternatif" |
| **Aynı ilçe sırası** | İlçe başına **ortak inşaat kuyruğu yok** (oyunculara yığılma ve kuyruk acısı yaratır); ilçe düzeyi sınır yalnız **seviye kilidi** |

### 4.4 Hızlandırma: para değil, işgücü ve malzeme

**İlke.** Hızlandırma ekonomik bir **takas**tır; para ile "anında bitir" yoktur ([K13](../00-vizyon-ve-kararlar.md) ruhuna uygun). Üç kaynak, toplam hız tavanı **−%40 süre**:

| Araç | Ne verir | Bedeli | Sınır |
|---|---|---|---|
| **Vardiya** | Aşama süresi **−%15** (o aşama için) | Üretim işçisinden çeker: işgücü karşılanması aşama boyunca düşer; il işgücü havuzunda **görünür takas** (Alfa-1'de; Alfa-0'da işgücü yaklaşık tam istihdam olduğundan **yok**) | Aşama başına 1 |
| **Hızlandırma malzemesi** (prefabrik kalıp / hazır döküm) | Aşama süresi **−%20** | Aşama yapı malzemesine **+%40** ek ve 1 parça | Aşama başına 1; toplam −%20 |
| **İmece** (komşu ekip ödünç verir) | Aşama süresi **−%5 / yardımcı**, ≤−%15 | Yardımcının 1 ekibi o aşama boyunca meşgul; **para yok**, kitabe + karşılıklı imece defteri | Alfa-1; yalnız aynı/bitişik ada ve aktif sahipler |

Her −%10 süre yaklaşık **+%12 maliyet** ve/veya **üretimden çekilen işçi** demektir: zaman ucuz değildir ama "anında" değildir. **Onboarding:** ilk inşaat zaten kısaltılmış (~24 dk, [11 §7.3](../11-urun-donusu.md)); bu hız çarpanı ile **çarpışmaz** (en küçük süre 10 dk tabanı).

### 4.5 Gecikme: deterministik hava ve kendi kıtlığı

**İlke.** Gecikme **rastgele kötü şans** değildir; ya (a) herkesin yaşadığı **iklim takvimi** ya da (b) oyuncunun **kendi kararının** sonucudur. İkisi de nedeni ile birlikte gösterilir ([H4](../11-urun-donusu.md): "inşaatım neden uzadı?").

| Gecikme | Kaynak | Etki | Deterministik? | Faz |
|---|---|---|---|---|
| **Hava (aşama × ay × iklim profili)** | İklim takvimi: kış don (Temel, Gövde dökümü), yağışlı dönem (İskele, Temel), kar (L yapı) | Aşama süresi çarpanı: don **×1,20**, yağış **×1,10–1,15**, kar ×1,25; toplam tipik **+%5…+%15**, tavan **+%25** | **Evet** (çarpan tablosu `insaatHava[profil][ay][aşama]`, inşaat başlarken **toplam süreye işlenir**, yeniden planlama gerekmez) | **A0** |
| **İklim olayı** (sel, dolu, şiddetli don; [T12](cesitlilik-uretim-katmanlari.md)) | Olay çekimi (PRNG) | Etkilenen ilçedeki **tüm** şantiyeler 24 sa ×1,25 | Evet (olay akışı herkese aynı) | A1 (yeniden planlama) |
| **Malzeme kıtlığı** | Aşamalı çekimde malzemen yetmedi | Bekleme (zaman donar) | Oyuncunun kararı | A1 |
| **İşgücü sıkışıklığı** | İl işgücü karşılanması <%90 (D1) | Ekip verimi ×karşılanma | Evet (durum işlevi) | A1 |
| **Yasa** | `sanayi_tesviki` inşa ×0,75 ([11 §7.6](../11-urun-donusu.md)) | Süre −%25 | Evet | Mevcut |
| **Ruhsat / denetim** | — | **Modellenmez** (3194 ruhsat süreci sade tutulur: yerleştirme = ruhsat) | — | Yok |

**Neden ruhsat gecikmesi yok.** Gerçek hayatta ruhsat ve denetim süreçleri vardır (3194 md. 21 ruhsat, md. 30 denetim; [özet](https://gayrimenkulmevzuati.com/imar-kanunu/)) ama oyun için **bürokratik angarya** olurdu ([başlangıç §6](baslangic-ve-ustalik.md) tuzakları). İmar etkisi **önce** (izin matrisi), gecikme **sonra** (hava) çalışır.

### 4.6 Müteahhit sözleşmesi (v1.5)

**Neden "kapasite kiralama".** Skill/seviye yoktur; müteahhidin değeri **ekip saati**dir. Upland'in Spark modeli buna benzer: yapı kurmak için işgücü saati bağlanır ve başkasına kiralanabilir ([udonis](https://www.blog.udonis.co/blockchain/upland)). Ekip sayısı sınırlı olduğundan (§4.3) müteahhit, **kullanılmayan ekip kapasitesini** satar.

**Gerçekteki karşılık.** Kat karşılığı (arsa payı karşılığı) inşaat sözleşmesi, eser sözleşmesi (TBK md. 470) ile taşınmaz satışının unsurlarını taşır: müteahhit inşa eder, karşılığında arsa payı alır ([özet](https://www.tahanci.av.tr/arsa-payi-karsiligi-insaat-sozlesmesi/)). Oyunda arsa payı **devredilmez** (parsel zorla el değiştirmez); karşılık **para ya da tedarik sözleşmesidir**.

| Konu | Kural (öneri) |
|---|---|
| Roller | **İşveren** (arsa ve yapı sahibi; yapı **baştan onundur**) · **Yüklenici** (ekip sağlar) |
| Araç | Sözleşme panosunda **ihale ilanı**: `{ghost (yapı, ölçek, modüller, arsa), azami bedel, teslim süresi, malzeme kimde}`; yükleniciler **teklif** verir; işveren seçer |
| Teminat | Yüklenici teminat yatırır (%15); işveren bedeli **emanete** koyar |
| Malzeme | Varsayılan işveren sağlar (kendi stoğundan); "anahtar teslim" seçeneği: yüklenici sağlar, bedel ↑ |
| Bedel bandı | `[0,6×, 1,6×]` NPC referans maliyeti (malzeme + ekip saati); aşırı bedel **aklama** kanalıdır |
| Karşılık biçimi | (a) para (Tamam'da emanetten); (b) **tedarik sözleşmesi** ("5 gün boyunca saatte X birim"), [P5 sözleşmeleri](cesitlilik-uretim-katmanlari.md); **yapı hissesi yok** |
| Teslim | Süre aşımı: işveren günlük **%2** (≤%20) ceza hakkı; ≥+50% gecikmede işveren sözleşmeyi bitirir, teminat işverene geçer, **ilerleme korunur**, işveren kendi ekibiyle sürer |
| Erişim | Yüklenici işverenin arsasına, stokuna ya da başka yapısına **hiçbir erişim almaz**; yalnız şantiye ilerler |
| Sicil | Zamanında teslim yüzdesi ve tamamlanan iş sayısı **sicil**e yazılır ([başlangıç §5.5](baslangic-ve-ustalik.md)); unvan avantaj vermez |
| Kötüye kullanım | Aynı IP/aygıt eşleşmesi ihale dışı ([R-Ü11](../11-urun-donusu.md)); yeni hesap ihale tavanı; işveren=yüklenici yasak |
| Bağımlılık | Sözleşme panosu (P5), emanet, ekip modeli (§4.3). **Alfa-0'da yok** |

### 4.7 Görsel aşamalar

**Haritada (L2–L3).** Yapı simgesinde **dört pençeli halka** (1/4–4/4 dolu); kontur kesikliden düze geçer; "bekleme" nedeniyle ▲ rozeti (tek rozet kuralı, [11 §9.3](../11-urun-donusu.md)); bitişte tek kısa nabız, azaltılmış harekette yok. Renk tek başına anlam taşımaz (şekil: halka dilimi sayısı).

**Sokakta (L4, yürüyüş; Alfa-1).** Tek bir **şantiye kiti** ve 18 yapının **bitmiş modeli**:

| Aşama | Görsel | Maliyet |
|---|---|---|
| Temel | Kazılı zemin, çevre çiti, vinç ve sabit malzeme yığını | Ortak kit (tek mesh), ayak izine ölçeklenir |
| İskele | Bitmiş modelin **yükseklik ×0,5 ekstrüzyonu** + iskele dokusu | Aynı mesh, vertex kayması |
| Gövde | Yükseklik ×0,85, kapı/pencere boşlukları açık | Aynı mesh |
| Tamam | Bitmiş model; tabela; üretimde ise baca/ışık | Zaten var |

Bu yaklaşım **yapı başına 4 ayrı model** yerine **1 kit + parametrik ekstrüzyon** ile çizim çağrısı bütçesini (≤60) korur; yalnız bitmiş model yapıya özgüdür. NPC işçi animasyonu **sunucuda durum tutmaz**, istemcide örneklenmiş sprite'tır ([capital-rift §4.1 İ8](capital-rift-mekanikleri.md)).

---

## 5. Mahalle dokusu

### 5.1 Ada karakteri

Oyuncu yapıları birleşince **ada** bir kimlik kazanır (otomatik, yazı ile, kozmetik ve bilgi):

| Karakter | Koşul (öneri) | Etkisi |
|---|---|---|
| **Çiftlik Adası** | Yuvaların ≥%60'ı Tarım katmanı, ≥2 yapı | E2 zincir bonusu görünür; ilçe kartında "Tarım Adası" |
| **Sanayi Adası** | ≥%60 Sanayi, ≥3 yapı; **OSB bayrağı** ilçe meclisince (Alfa-1) ya da veri bayrağıyla (Alfa-0) | [OSB ödülleri](cesitlilik-uretim-katmanlari.md): iletim kaybı 0, kirlilik yayılımı ×0,5, bakım −%10, kümelenme ≤+%15, giriş ×1,5, aidat %0,2/hafta |
| **Çarşı Adası** | ≥2 Ticaret ofisi + ≥1 Konut | Ticaret ofisi → Konut KD +%5; ilçe pazarı için aday |
| **Konut Mahallesi** | ≥%60 Konut | E4 konut→iş; E1'e **en hassas** |
| **Karma** | Hiçbiri | Etki yalnız E1–E4 |

Ada adı oyuncular arasında **ortak** verilebilir (aday: ada sahipleri oy; Alfa-1); plaket/kitabe kozmetiktir. **Karakter ek bonus vermez**; yalnız mevcut etkileri görünür kılar (bonus dolanması ve hesap sayısı manipülasyonu önlenir).

### 5.2 İlçe gelişim puanı (GP)

[11 §7.4](../11-urun-donusu.md) ilçe seviyesini "nüfus 5.000 ve ≥10 sahip" ile tanımlar; ama işletme düğümlerinde nüfus 0'dır. Öneri: **gelişim puanı** (nüfus NPC tabanı + oyuncu yapıları):

| Kaynak | Ağırlık (öneri) |
|---|---|
| Konut (tamam) | 2 / adet (+ek kat 1) |
| Ticaret ofisi | 2 |
| Atölye-Lab | 3 |
| Fabrikalar (Sanayi) | 1,5 |
| Tarım yapıları, Ambar, Garaj | 1 |
| Modül | 0,5 |
| Ortak proje (tamam) | 5 |

| Kural | Değer |
|---|---|
| **Kişi başı katkı tavanı** | Bir oyuncu ilçe GP'sinin **≤%15**'ini yapabilir (tekel yok) |
| **Çeşitlilik çarpanı** | `1 + 0,1 × (katman sayısı − 1)` (≤1,5) |
| **Seviye geçişi** | Köy→Kasaba: GP ≥ 60, ≥10 sahip, ≥3 katman. Kasaba→Merkez: GP ≥ 180, ≥20 sahip, ≥4 katman, 1 ortak proje. Merkez→Şehir: GP ≥ 540, ≥40 sahip (Ü6 "×3 ve ×2" ile uyumlu) |
| **Seviye düşmez** | Kalıcı: yıkarak seviye düşürme (grief) yok; sahipler **birikimden** pay alır |
| **Etki** | Seviyeler S/M/L ve yeni yapı türlerini **herkes için** açar ([11 §7.4](../11-urun-donusu.md)) |

Gerçek ilişki: ilçe/belediye gelişimi nüfus ve hizmet çeşitliliğiyle okunur; oyunda "puan + çeşitlilik + sahip sayısı" üçlüsü basitleştirmedir.

### 5.3 Ortak altyapı: ada projesi ve imece

[11 §7.5](../11-urun-donusu.md) il düzeyi ortak alanları (şebeke, işgücü) **il düzeyinde yaklaşık** bırakıyor; [çeşitlilik: yönetim §4.4](cesitlilik-yonetim-askeri-teknoloji.md) ortak projeleri **ilçe/il** ölçeğinde tanımlıyor. Eksik katman: **ada altyapısı**, küçük ölçekte ve 2–5 sahipli.

| Kademe | İçerik | Etki | Bedel (öneri) |
|---|---|---|---|
| **A0 Ham** | Yol cephesi var | — | — |
| **A1 Hat** | Elektrik hattı + toprak yol kaplaması | Ada içi iletim kaybı **0**; inşa süresi −%10; KD +%5 | Ada hücre sayısı × taban × **%15** |
| **A2 Tam** | Su, kanal, arıtma | E1 ada içi yayılım ×0,7; KD +%8 (Konut +%12) | Ada hücre sayısı × taban × **%25** |
| **A3 OSB** | Sanayi Adası (hazır) | OSB ödülleri (§5.1) | Veri bayrağı + giriş ×1,5 |

**Finansman: açık üyelik + katılım payı.** Altyapıyı **ilk açan** (öncü) sahipler maliyeti hücre oranında karşılar ve projeyi başlatır (3–7 gün; ortak şantiye). **Sonradan gelen** sahip, yararlanmak için **katılım payı** öder (aynı formül, +%10); bu pay **öncülere hücre oranında iade** edilir (toplam iade ≤%100). Böylece (i) bedavacılık yok, (ii) öncü cezalandırılmaz, (iii) oy yok, kural var; reddetme hakkı "komşu" için yoktur ama katılmayan da zarar görmez (yalnız ayrıcalıkları alamaz). Gerçek esin: belediyelerde yol, su ve kanalizasyon için **altyapı katılım payı** vardır (doğrulanmadı).

**İmece.** İki biçim: (a) **şantiye imecesi** (§4.4): komşu ekip ödünç verir, para yok, kitabe + imece defteri; (b) **ada projesi bağışı**: işgücü günü ya da malzeme; ilk 10 ad plakette. **Hiçbirinde oy ağırlığı ya da gelir payı yoktur** ([çeşitlilik: yönetim §4.4](cesitlilik-yonetim-askeri-teknoloji.md) kuralıyla aynı).

**Ortak alan hiyerarşisi (özet).**

| Düzey | Altyapı | Karar | Faz |
|---|---|---|---|
| Ada (2–5 sahip) | Hat, kanal, OSB | Açık üyelik + katılım payı | A1 |
| İlçe (≈10–40 sahip) | Köprü, okul, fuar, itfaiye (ortak proje) | İlçe meclisi önceliği + eşleştirme | A1 |
| İl (tüm ilçeler) | Şebeke, liman, baraj | Vali (bütçe) | A1+ |

---

## 6. Arayüz akışı: yapı önce yerleşim

### 6.1 Giriş noktaları

İki giriş, tek maliyet kartı:

| Giriş | Ne zaman | Akış |
|---|---|---|
| **Yapı önce** (ana) | Oyuncu ne kuracağını biliyor | Palet → hayalet → karta |
| **Arsa önce** | Oyuncu "nerede?" arıyor | L3 harita: arsa çokgenleri tür renginde, fiyat etiketi → arsa kartı ("izinli yapılar", komşuluk özeti) → "Bu arsaya kur…" → paletten yapı → karta |

Hücre ızgarası yalnız **ileri düzey** (Shift/gizli, [11 ek karar](../11-urun-donusu.md)).

### 6.2 Adım adım (masaüstü ve telefon)

| # | Adım | Masaüstü | Telefon | Sistem / doğrulama |
|---|---|---|---|---|
| 0 | **Giriş** | Alt orta yapı çubuğu ("İnşa" modu) | Alt sekme "İnşa" | İnşa modunda mercek çubuğu yapı çubuğuna dönüşür |
| 1 | **Yapı seç** | Sol palet: katman gruplarında; gri = "kilitli: ilçe Kasaba olunca" | Yatay çipler (katman filtresi), uzun bas → bilgi | Palet **izin matrisine ve ilçe seviyesine** göre süzülür; üstte arama |
| 2 | **Yer öner** | Fare ile hayalet; sağ kenarda **"En uygun 3 arsa"** (fiyat, komşuluk, mesafe) | Ekranın ortasında **sabit nişangâh**; harita kaydırılır, hayalet nişangâhta; parmak hayaleti örtmez | Öneri: o yapıya **izinli** arsalar, ayak izine **sığan en iyi yerleşim** (boş hücre artığı ≤1) |
| 3 | **Döndür / biçim** | `R` döndür, `T` L/I biçim | "↻" ve "▭/L" düğmeleri | 3 hücreli yapı için I ve L; en az fazla hücre alan biçim varsayılan |
| 4 | **Geçerlilik** | Mavi düz = geçerli; turuncu taralı = geçersiz + **tek neden** | Aynı; neden nişangâh altında | Neden önceliği: imar › sınır › komşuluk bütçesi › tavan › malzeme › ekip (aşağıda) |
| 5 | **Etki halkaları** | Hayaletin çevresinde ada/bitişik ada gölgesi; ± okları | Aynı, sade | E1–E4 net sonucu: "+%7 verim · 2 komşuya −%3" |
| 6 | **Maliyet kartı** | Sağ panel (360 px) | Alt sayfa **yarım yükseklik** | Aşağıdaki kart alanları |
| 7 | **Seçenekler** | Ölçek (S varsayılan), modül çipleri, (A1) Peşin/Aşamalı | Aynı (kaydırmalı) | Varsayılan seçenekler **en ucuz geçerli** |
| 8 | **Onay** | **"Kur" düğmesi** (`Enter`) | Alt sayfada **yapışkan düğme ≥44 px**, uzun bas yok | Sunucu **120 sn rezerv**; atomik `yapi_yerlestir` |
| 9 | **Geri al penceresi** | Toast'ta **"Geri al"** (5 dk) | Alt çubukta "Geri al" | Aşama başlamadan ve **5 dk içinde** tam iade (yapı + arsa); sonra §4.1 iadesi |
| 10 | **Takip** | Sağ üst İnşa paneli: 4 parçalı çubuk + bitiş saati | "İnşa" sekmesi | Dikkat paneline yalnız **bekleme (▲)** ve **bitti (✓)** düşer; toast yalnız kendi eylemin için |
| 11 | **Hızlandır** | Çubuğa tıkla → menü (vardiya, malzeme paketi, imece) | Çubuğa dokun → alt sayfa | Her biri **bedelini gösterir** (§4.4) |

**Maliyet kartı alanları.**

| Alan | İçerik |
|---|---|
| **Arsa** | "N hücre × fiyat" ve KD satırları ("+%12 cadde cephesi; +%20 merkeze 250 m"); **zaten sahip olunan hücreler** ücretsiz görünür |
| **Yapı** | Para ve malzeme **gereken / var** (eksik turuncu); ilk-yapı indirimi satırı (%30) |
| **Süre** | Bitiş saati ve hava notu ("Kış: +%10"), ekip durumu (1/2) |
| **Haftalık yük** | Arazi vergisi + bakım |
| **Komşuluk** | Net etki ve ilgili komşular (tek tıkla detay) |
| **Toplam** | Tek rakam (`12.450 ₺` biçimi) ve **"Hazine sonrası: 37.550 ₺"** |
| **Seçenekler** | Ölçek, modül, Peşin/Aşamalı (A1) |

**Geçersizlik nedenleri (Türkçe; tek, öncelik sıralı).**

| Kod | Metin |
|---|---|
| imar | "Bu arsa **Tarla** imarlı: Çelikhane yapılamaz. Sanayi arsalarını göster." |
| koruma | "Tarım koruma alanı: tür değişmez." |
| sinir | "İlçede en çok 72 hücre (mevcut 70)." / "İlçenin %25'ini aşar." |
| komsuluk | "Komşu Konut'un kirlilik bütçesi dolu. Atık arıtma modülü ekleyin ya da başka ada seçin." |
| yer | "Bu yapı 3 hücre ister; arsada 2 boş hücre var. Komşu arsayı genişlet?" |
| engel | "Yol / su / askeri alan." |
| malzeme | "Çelik 40/120 eksik." (kuruluma izin verir: Aşamalı modda) |
| ekip | "Ekip dolu (2/2): sıraya alınır." (**engel değil**; plan listesine) |
| rezerv | "Arsa az önce satıldı; en yakın 3 alternatif." |
| hibe | "Bu hücre yeni oyuncular için ayrılmış (bitiş 3 gün)." |

**Telefon notları.** Üç yükseklikli alt sayfa ([11 §9.3](../11-urun-donusu.md)); **nişangâh** modeli parmak örtmesini ve hassas sürüklemeyi çözer; geri al ve "Taslak" tek dokunuşta; dinamik yazı ölçeği %90–130; yatayda yan sayfa. Masaüstünde fare tekerleği ile yaklaş, hayalet **sürekli** ve parasızdır; yalnız onayda ödeme olur.

### 6.3 Başarısızlık ve çakışma durumları

| Durum | Davranış |
|---|---|
| İki oyuncu aynı arsayı onaylar | Sunucu sırası kazanır; kaybeden "Arsa az önce satıldı" + **alternatifler**; para düşülmemiştir (atomik komut) |
| Onaydan sonra malzeme düşer | Atomik komut **tümüyle reddedilir**; arsa alınmaz (B7) |
| Bağlantı kesilirse | İdempotans anahtarı: yeniden gönderme güvenli; yarım durum yok |
| Yapı yerleştirmeden vazgeç | Hayalet iptal; hiçbir şey ayrılmaz; 120 sn rezerv düşer |
| Arsa alındı ama yapı istemiyorum | `parsel_birak` (aşağıda) |

### 6.4 Çekirdekteki zorunlu iki komut

| Komut | İçerik | Gerekçe |
|---|---|---|
| **`yapi_yerlestir {ilce, tesisTuru, yapiHucreleri, satinAlHucreleri[], ölçek?, modül?}`** | `parsel_al` (yalnız boş hücreler) + `tesis_insa_hucre` **tek komut**, hepsi ya da hiçbiri, tek fiyat hesabı | [11 ek karar](../11-urun-donusu.md) "komut zinciri" der; iki komutta ilki başarılı ikincisi başarısızsa kullanıcı istemeden arsa sahibi olur (B7) |
| **`parsel_birak {hucreler}`** | Hazineye iade: **ilk 5 dk %100**, sonra **%70** (spekülatif döngüyü engeller); yapı/inşaat yoksa; ilçe `satilmisHucre` düşer; 7 gün aynı hücreyi geri alırken artan fiyat (`+%10`) | Yanlış tıklama güvenliği; "arsa önce al-sonra vazgeç" kaçışı |

---

## 7. Uygulama

### 7.1 Çekirdek (mulk/ ve tipler)

Mevcut desen korunur: yeni alan **isteğe bağlı**, mülk kipi açık değilse yazılmaz, bölge kipi özeti **birebir aynı**; her değişiklik `parametreler.mulk` bayrağı arkasında.

| Değişiklik | Dosya | Ayrıntı | Faz | İş |
|---|---|---|:--:|:--:|
| **Kullanım türü** | `tipler.ts` (`ParselHucreTanimi.kullanim`), veri `parsel.ts`, `sema.ts`, `derle.ts` | `kullanim` 7 değer; fikstür şeması sürümü; `sinif` fiyat için kalır | A0 | M |
| **İmar izin matrisi** | `parametreler.json` (`mulk.imar.izin`), `komut.ts` | `tesis_insa_hucre` / `yapi_yerlestir` imar denetimi | A0 | S |
| **Açık havuz** | `IlceDurumu.acikHucre`, `komut.ts` `parselFiyati` | Fiyat paydası ve %25 tavanı açık havuza göre | A0 | M (**fiyat altını değiştirir**) |
| **Arsa düzeyi ayırma** | `derle.ts` `ayrilmisHucreler` → arsa karması | Fikstürde `arsa` kimliği ya da hücre→arsa tablosu | A0 | M |
| **Bedava yurt = halka 0 arsası** | `yurt.ts` | Ağırlık merkezi yerine seçilmiş hazır arsa | A0 | S |
| **Yapı biçimi** | `komut.ts` | 2–3 hücre bitişiklik ve I/L biçimi doğrulaması | A0 | S |
| **`yapi_yerlestir`, `parsel_birak`** | `komut.ts`, `protokol/komut-sema.ts` | Atomik; iade kuralları | A0 | M |
| **Yıkım ve söküm** | `komut.ts`, `insaat.ts` | `yikim`, "Söküm" aşaması, geri kazanım, Temel yeniden kullanımı | A0 (yıkım) / A1 (temel yeniden kullanımı, dönüştürme) | M |
| **Ağırlıklı 4 aşama + hava çarpanı** | `insaat.ts` (`insaatAsamasi`), `parametreler.json` (`insaatHava`) | Toplam süre başlarken hesaplanır | A0 | S |
| **Modül altyapısı** | `tipler.ts` (`TesisDurumu.moduller`), yeni `mulk/modul.ts`, `icerik.json` (`moduller`) | `modul_ekle`, `modul_sok`, etkilerin çözüme girişi, 5–6 A0 modülü | A0 | L |
| **Komşuluk motoru** | yeni `mulk/komsuluk.ts`, `TesisDurumu.komsulukPpm` | E1, E2 (A0); E3, E4 + etki bütçesi (A1); ada grafı fikstürden | A0 (E1–E2) / A1 | L |
| **Ekip modeli** | `komut.ts` (`esZamanliInsaat` → ekip) | S/M 1, L 2 ekip | A0 | S |
| **Plan listesi** | durum + komut | 6 sıra | A1 | M |
| **Aşamalı çekim** | `insaat.ts`, olay `insaat_asama` | Bekleme, `bitis` kaydırma | A1 | M |
| **Hızlandırma** | komut `insaat_hizlandir` | Vardiya, malzeme paketi, imece | A1 | M |
| **Yaş ve yenileme** | `komut.ts` (`yenile`) | Köklü yenileme, eskimiş çarpanı | A1 | M |
| **İmar başvurusu** | `imar_basvur` komutu | NPC ölçütleri → meclis | A1 | L |
| **Gelişim puanı** | `IlceDurumu.gp` | Seviye geçişi | A1 | M |
| **Ada altyapısı** | durum + komut | 3 kademe, katılım payı | A1 | L |
| **Üst hakkı / devir / açık artırma** | `HucreDurumu.kiraci?`, `parsel_sat`, `acik_artirma` | Kurallar §2.6–§2.8 | A1 sonu / sonra | L |
| **Müteahhit** | sözleşme çekirdeği (P5) | İhale, emanet | v1.5 | L |

**Bölge kipi regresyon kalkanı.** Tüm alanlar isteğe bağlı; fikstür verilmedikçe hiçbiri yazılmaz. Yeni testler: izin matrisi, fiyat/açık havuz, atomik komutun yan etkisizliği, komşuluk çarpanının **olay sırasından bağımsızlığı** (aynı sonuç farklı yerleşim sıralarında), modül serileştirme ve yeniden oynatma, hava çarpanının serileştirme kararlılığı, ayrılmış arsa dağılımı (kıdemli oyuncunun arsayı alabilmesi).

**Bellek notu.** Çekirdekte `DerlenmisMulk.hucreler: Map<HucreId, …>` tüm hücreleri tutar; Alfa-0'ın 20–25 M hücresinde bu **bellek sorunu** olur. Arsa/halka modeli doğal çözüm sunar: fikstüre yalnız **açık arsaların** hücrelerini al; dünya hücre durumu (`d.mulk.hucreler`) zaten yalnız satılanları tutar. Bu, [11 §3.1](../11-urun-donusu.md)'in "seyrek sahiplik" ilkesini fikstür tarafına da taşır.

### 7.2 Veri hattı

| İş | Çıktı | Faz | İş |
|---|---|---|:--:|
| Ada çokgenleme + bölme (A2–A3) | Ada ve arsa tablosu | A0 | L |
| Tür atama + WorldCover (A4) | `kullanim`, bayraklar | A0 | L |
| Statik KD ve halka (A5–A7) | `kdPpm`, `halka` | A0 | M |
| BHI2 (arsa kimliği, tür 7 değer, kıyı/cephe bitleri) | `BHI2.gz` | A0 | M |
| Korunan tarım bayrağı | `koruma` | A1 | M |
| Damar noktaları ada düzeyinde ("keşif izi") | damar | S | M |
| ODbL: arsa tablosu ayrı klasör, dış hukuki görüş | — | A1 kapısı (A1-6) | — |

### 7.3 Sunucu ve istemci

| İş | Katman | Faz | İş |
|---|---|---|:--:|
| Arsa tablosu servisi (ilçe başına `arsa.json.gz`), 120 sn rezerv, `yapi_yerlestir` yönlendirme | Sunucu | A0 | M |
| Yapı paleti, hayalet, etki halkaları, maliyet kartı, nişangâh akışı (telefon) | İstemci (F4) | A0 | L |
| Arsa çokgenleri L3 katmanı (tür rengi, fiyat etiketi) | İstemci | A0 | M |
| İnşa paneli: 4 parçalı çubuk, bekleme nedeni, ekip, plan listesi | İstemci | A0 / A1 | M |
| Şantiye kiti 3D (L4) | İstemci (F5) | A1 | M |
| İmar başvurusu, ada altyapısı, imece, ihale ekranları | İstemci | A1 / v1.5 | L |

### 7.4 Ölçüm (yeni hipotezler; kapı değil)

| # | Hipotez (öneri) | Ölçüm |
|---|---|---|
| **H10** | Yapı önce yerleşim: yeni oyuncu ilk yapıyı **≤90 sn** içinde ve **hatasız** kurar (insan testi 5 kişi, ≥4) | Sahada ve botta tıklama sayısı |
| **H11** | Komşuluk anlaşılır: 5 kişiden ≥4'ü "bu yapı neden −%8?" sorusuna 30 sn'de doğru yanıt verir; açık artırma ve geri alma oranları tanı için raporlanır | İnsan testi, `parsel_birak` ve geri alma sayısı |
| **H12** | Açık havuzda her türden ≥%8 arsa; Sanayi arsaları halka 0–1'de mevcut; 25 sahip/ilçe için ≥1 boş Tarla/Sanayi/Konut arsası her zaman var | Arsa tablosu istatistiği |
| **H13** | Komşuluk **çözümü domine etmez**: aynı portföy farklı adalarda verim farkı ≤%25 ("her yerde herkes kazanır"); hiçbir kirli/hassas çift tek başına ilçe verimini ≥%10 oynatmaz | Eşli koşu |
| **H14** | Modül çeşitliliği: Alfa-0'daki modüllerin her biri en az bir stratejide ilk 3'te; "her yapıda aynı modül" yok | Bot portföy karşılaştırması |

**Yeni botlar.** *Komşu zehirleyici* (hassas yapının yanına kirli yapı kurmaya çalışır; etki bütçesi bunu **geçersiz** kılmalı), *Arsa istifçisi* (arsa alıp bırakır: `parsel_birak` iadesi arbitraj vermemeli), *Yerleşim acemi* (ilk yapı için en çok tıklama).

### 7.5 Alfa-0 / Alfa-1 / sonra özeti

| | **Alfa-0** | **Alfa-1** | **Sonra** |
|---|---|---|---|
| Arsa | 7 tür + izin matrisi; hazır arsa + halka 0–1; KD statik; açık havuz; arsa düzeyi ayırma; `parsel_birak` | Halka 2–3; imar başvurusu (meclis); koruma; devir (`parsel_sat`); açık artırma yumuşatması | Üst hakkı; arsa pazarı |
| Yapı | Modül altyapısı + 5–6 modül; yıkım; komşuluk E1–E2 | ~29 modül; E3–E4 + etki bütçesi; yaş ve yenileme; dönüştürme | Olgunlaştırma, temiz oda |
| İnşa | Ağırlıklı 4 aşama; deterministik hava; 2 ekip; Peşin | Aşamalı çekim; vardiya / malzeme paketi / imece; plan listesi; şantiye ekipmanı | Müteahhit (v1.5); ihale |
| Mahalle | Ada karakteri (salt okunur) | GP, ada altyapısı, OSB ilanı | Mahalle delegesi |
| Arayüz | Yapı önce akışı (masaüstü + telefon); arsa-önce giriş; geri al | Etki halkaları gelişmiş; ihale ekranı | |

---

## 8. Geri dönüşü zor kararlar ve öneriler

Zorluk: **Z** = geri dönüşü zor (şema, kimlik, kural ilkesi); **O** = orta; **K** = kolay (parametre/veri).

| # | Karar | Seçenekler | **Öneri** | Zorluk | Neden zor / ne zamana kadar |
|---|---|---|---|:--:|---|
| **Z1** | **Hücre boyutu** (z20 ≈ 28,9 m, ~835 m²) | z19 (~58 m), z20, z21 (~14 m) | **z20'yi koru.** 4–12 hücrelik arsa ≈ 3.300–10.000 m² ≈ gerçek şehir adasındaki parsel kümesi; z19'da 12 hücre ≈ 8 ha (ada çok büyür); z21'de 4× hücre (Kocaeli 23 M) bellek ve harita yükü | **Z** | Quadkey kimlikleri, fikstür, ODbL dosyası, istemci karoları z20'ye bağlı. Alfa-0 öncesi |
| **Z2** | **Arsa = çekirdek dışı görünüm** (çekirdek hücrede kalır) | Çekirdekte `arsa` nesnesi / hücre | **Hücre çekirdekte, arsa sunucu/veri katmanında.** Arsa tablosu sürümlü, **satılan arsa donar** | **Z** (kimlik kalıcılığı), mülkiyet kolay | Kitabe, bildirim ve "Parsel #A3F2" kimlikleri kullanıcıya görünür; ilk satıştan sonra değişirse kırılır |
| **Z3** | **Kullanım türü ekseni** (`kullanim`) ayrı | Fiyat sınıfına gömmek / ayrı | **Ayrı eksen; fikstür şemasına girer** | **Z** | Fikstür, BHI, golden hash, istemci süzgeçleri. İmar yazılmadan önce (A0) |
| **Z4** | **Yapı çok hücreli mi** | 1 hücre / 1–3 hücre / serbest | **1–3 hücre, biçim kümesi {1, domino, I3, L3}; modül hücre kaplamaz; ölçek yükseltme aynı ayak izinde** | **Z** | Komşuluk, çizim, `tesis.hucreler` verisi ve oyuncu portföyü. Daha sonra "L = 4 hücre" gibi büyütme **kırıcıdır**. Alfa-0 öncesi |
| **Z5** | **Komşuluk: ada düzeyi mi hücre aralığı mı** | Hücre yarıçapı (Anno) / ada bileşimi | **Ada düzeyi** (+ bitişik ada ×0,5) | **Z** | Dengeler ve öğretim ada kavramına bağlanır; hücre aralığına geçiş tüm dengeyi yeniler. Ada grafı çıktısı veri hattında olmalı |
| **Z6** | **Arazi vergisi tabanı komşudan bağımsız** | Dinamik değere vergi / alış bedeli | **Alış bedeli (Alfa-1: ilçe emsal endeksi); dinamik değer yalnız verim ve piyasa bandı** | **Z** (oyuncu güveni) | Vergi dinamik olursa komşu eylemiyle vergi artar: "zarar verme" kanalı ve gayri-adil yük. Bir kez dinamikleşirse geri çekmek güven kaybı |
| **Z7** | **İmar yetkisi kimde** | Muhtar / meclis / NPC / sistem | **Üç anahtar + rıza ilkesi**: tür sistemin, matris takımın, karar başvuruya göre NPC→meclistir; **sahibin başvurusu olmadan değişiklik yok** | **Z** (ilke) | İlke bozulursa "parsel zorla değişmez" ilkesi aşınır; sonradan "rıza" eklemek mevcut kararları geçersiz kılar. Alfa-1 meclis öncesi |
| **Z8** | **Arsa kiralama var mı** | Yok / işletme kirası / üst hakkı / hepsi | **Alfa-0'da yok; Alfa-1 sonunda yalnız üst hakkı**; kiracı hücreleri **tavana sayılır** | **O** (şema kolay, kural zor) | Tavan ve vergi kuralları sonradan değişirse mevcut sözleşmeler çelişir; **tavana sayma** ilkesi baştan yazılı olmalı |
| **Z9** | **Yapı sahibi ≠ arsa sahibi**'ne yer bırakmak | Hücre sahibi = yapı sahibi sabit / ayrı | **İsteğe bağlı `kiraci?` alanı ve `tesis_insa_hucre` denetiminde "sahip ya da etkin kiracı"** | **K** (alanlar isteğe bağlı) | Alan eklemek kolay; **kuralları** önceden yazmak gerek (Z8) |
| **Z10** | **Peşin mi aşamalı mı** malzeme çekimi | Yalnız peşin / yalnız aşamalı / ikisi | **Alfa-0 peşin; Alfa-1'de aşamalı ve seçmeli** | **O** | Olay yapısı (`insaat_asama`, `bitis` kaydırma) ve serileştirme şeması; peşin başlayan iyi, ama durum biçimi baştan **aşama dostu** (her aşamanın ödenen payı ayrı) olmalı |
| **Z11** | **Hızlandırma para ile mi** | Para / malzeme+işgücü | **Para yok**; vardiya, malzeme paketi, imece | **Z** (ekonomik ruh) | Para ile hızlandırma bir kez eklenirse gerçek-para satışına açılan kapı; sahibin yönergesi zaten bunu ister |
| **Z12** | **Ekip birimi** (yapı adedi yerine ekip) | Eşzamanlı yapı sayısı / ekip | **Ekip** (S/M 1, L 2) | **O** | Müteahhit, modül, yıkım, yenileme hepsi "ekip" kullanır; sonra değişirse hepsi etkilenir |
| **Z13** | **Atomik `yapi_yerlestir`** | İki komut / tek komut | **Tek atomik komut** + `parsel_birak` | **O** | Günlük (log) komut şemasıdır; sonradan komut eklemek kolay, **yanlış zincir** günlüğe girip yeniden oynatıldığında tutarsızlık yaratır. F4'ten önce |
| **Z14** | **Fiyat paydası** = açık halka havuzu | Tüm uygun hücre / açık havuz | **Açık havuz**; ayrılmış arsa da arsa düzeyinde | **O** | `parselFiyati` golden özetini değiştirir; yayınlanmış fiyat sözü ("%25 satılırsa ×1,5") kalıcıdır. Alfa-0 öncesi |

**Kolay geri dönülebilirler (kilitlemeyin):** izin matrisi hücreleri, KD terim değerleri, halka yarıçapları, modül etki yüzdeleri, ömür günleri, hava çarpanı tablosu, GP ağırlıkları, kira bandı, geri alma süresi. Hepsi `parametreler.json` / kural dönemi parametresidir.

---

## 9. Riskler ve açık sorular

| # | Risk / soru | Azaltma / varsayılan |
|---|---|---|
| R1 | **Komşuluk karmaşıklığı** H4'ü (60 sn okunurluk) bozar | Dört etki türü, tek rozet nedeni, etki halkaları; H11 testi; E3–E4 Alfa-1 |
| R2 | **WorldCover + OSM karışımı** sınıf hataları (%75 doğruluk) ve ODbL türev kapsamı | Hatayı tür atama kurallarında görünür kıl; "diğer" hücreler halka dışında bırakılabilir; hukuki görüş (R-Ü5) |
| R3 | **Halka açılışı** oyunculara "neden sınırlı?" dedirtir | Harita üzerinde "sonraki halka %70 dolunca açılır" ilerleme çubuğu |
| R4 | **Modül çeşitliliği** `icerik.json`'u şişirir ve dengeyi kırar | Alfa-0'da 5–6 modül; her biri farklı kol; H14 ölçümü |
| R5 | **Üst hakkı** aklama ve tavan delmeyi doğurur | Z8 kuralları; Alfa-1 sonu; kira bandı; kiracı tavana sayılır |
| R6 | **Aşamalı çekim** çevrimdışı oyuncuyu bekletir | Eksik malzeme gelince otomatik çekim; ceza yok |
| R7 | **Hava çarpanı** kış oyuncularını geç bırakır (adalet) | Herkes aynı iklim profiline tabi; tavan %25; haritada gösterilir |
| R8 | **Çalışma ağacındaki F3 değişiklikleri** raporun bulgularını eskitebilir | Commit sonrası B1–B9 yeniden doğrula |
| Ü1 | Hazır arsa hedef boyutu 8 hücre mi, değişken mi? | 4–12; ölçüm: yapı boyutlarına sığma oranı |
| Ü2 | Kıyı ayrı tür mü, bayrak mı? | Tür (arsa seçiminde ilk sınıf) + sanayide bayrak |
| Ü3 | Yaşlanma kullanıcıya "angarya" gibi gelir mi? | Zorunlu değil, ≤%15 kayıp; H2 ölçümü |
| Ü4 | Arsa tablosu hangi sıklıkla yeniden üretilir? | Yalnız dönem sınırında, satılmamış alan |

---

## Kaynaklar

**Depo içi.** [11 — Ürün dönüşü](../11-urun-donusu.md) · [12 — Yön taslağı](../12-yon-taslagi.md) · [06 §15 Mülk kipi](../06-simulasyon-spesifikasyonu.md) · [oyun tasarımı: parsel](oyun-tasarimi-parsel.md) · [karo ve ızgara](karo-ve-izgara-denemesi.md) · [başlangıç ve ustalık](baslangic-ve-ustalik.md) · [çeşitlilik: üretim katmanları](cesitlilik-uretim-katmanlari.md) · [çeşitlilik: yönetim, askeri, teknoloji](cesitlilik-yonetim-askeri-teknoloji.md) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · `packages/cekirdek/src/mulk/{komut,durum,insaat,vergi,isletme,yapi,yurt}.ts`, `packages/cekirdek/src/{tipler,derle}.ts`, `packages/veri/icerik/{icerik,parametreler}.json`, `packages/veri/src/parsel.ts`.

**Oyunlar (arama özetinden okundu; çoğunda doğrudan sayfa getirilemedi: 402/403).**
- Anno 1800 silo ve modüller: <https://anno1800.fandom.com/wiki/Silo>, <https://anno1800.fandom.com/wiki/Production_buildings>
- Manor Lords arsa ve arka bahçe: <https://wiki.hoodedhorse.com/Manor_Lords/Burgage_plot>, <https://game8.co/games/Manor-Lords/archives/451369>
- Cities: Skylines arsa değeri ve endüstri alanları: <https://skylines.paradoxwikis.com/Land_value>, <https://www.keengamer.com/articles/guides/8-ways-to-increase-land-value-in-cities-skylines/>, <https://skylines.paradoxwikis.com/Industry_areas>, <https://skylines.paradoxwikis.com/Industries_DLC_Tutorial>
- Banished inşa işçileri: <https://banished-wiki.com/wiki/Builder>
- Foundation: <https://foundation-game.fandom.com/wiki/Buildings>, <https://bitsnpixels.org/p/foundation-medieval-city-builder-review>
- Upland (Spark, kiralama, Fair Start): <https://www.blog.udonis.co/blockchain/upland>, <https://nonfungible.com/news/game/new-way-to-build-with-upland>
- Eco (tapu/izin): <https://wiki.play.eco/en/Deed>
- Earth2 (tier ve değer): <https://e2.university/guides/earth2-tile-tier-explained/>
- Naavik arazi vergisi: <https://naavik.co/deep-dives/digital-land-tax/>

**Veri ve yöntem.**
- OSM `landuse`: <https://wiki.openstreetmap.org/wiki/Key:landuse> (doğrudan okundu)
- ESA WorldCover (CC BY 4.0, 10 m, 11 sınıf): <https://docs.terrabyte.lrz.de/datasets/esaworldcover/>
- Parish ve Müller, "Procedural Modeling of Cities" (SIGGRAPH 2001): <https://dl.acm.org/doi/pdf/10.1145/1185657.1185716>

**Türkiye mevzuatı (hukuki tavsiye değildir; yalnız sade esin; özetler araç çıktısından, tam metinle doğrulanmadı).**
- 3194 sayılı İmar Kanunu: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.3194-20120516.pdf>, <https://gayrimenkulmevzuati.com/imar-kanunu/> (md. 8 ve 18 düzenleme ortaklık payı ≤%45; md. 21 ruhsat; md. 22 ruhsat süresi; md. 30 denetim)
- 5403 sayılı Toprak Koruma ve Arazi Kullanımı Kanunu: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.5403.pdf>, <https://gayrimenkulmevzuati.com/toprak-koruma-ve-arazi-kullanimi-kanunu/>
- Tarla ve arsa (imar planı ölçütü): <https://pramo.com.tr/tarla-ve-arsa-farki-nedir-tapu-ve-imar-durumu-2025/>
- Üst hakkı (TMK 826, 726): <https://gayrimenkulmevzuati.com/ust-hakki/>, <https://barandogan.av.tr/blog/gayrimenkul-hukuku/ust-hakki-irtifaki-davasi>
- Kat karşılığı (arsa payı karşılığı) inşaat sözleşmesi: <https://www.tahanci.av.tr/arsa-payi-karsiligi-insaat-sozlesmesi/>
- İfraz ve tevhid: <https://investtime.com.tr/blog/ifraz-ve-tevhid-nedir/>
- Kat irtifakı ve kat mülkiyeti: <https://www.akbank.com/blog/kat-irtifaki-nedir-kat-mulkiyeti-ile-arasindaki-farklar>
