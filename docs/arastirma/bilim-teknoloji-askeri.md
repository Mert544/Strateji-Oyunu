# Araştırma — Bilim, Teknoloji, Askeri Bilimler ve Askeri Teknoloji (derinleştirme)

> **Özet.** Sahip, "askeri bilimleri, askeri teknolojiyi, bilim ve teknolojiyi arttırabiliriz" dedi ([12 §5](../12-yon-taslagi.md)). Bu rapor, mevcut 17 (08 §4) ve 26 (çeşitlilik raporu §6) düğümlük teknoloji tasarımını **tek bir bilim sistemi, 97 düğümlük bir ağ (61 sivil, 36 askeri) ve üç sahiplik katmanı** (oyuncu, ilçe, il) olarak derinleştirir. Araştırma, ayrı bir puan ekonomisiyle değil **para × kapasite × ilçenin bilim ortamı** ile üretilir. Askeri güç, sivil ağın üzerine kurulur: 24 askeri donanım düğümünün 22'sinde sivil ön koşul vardır; yüksek kademeli birlikler ancak **ilin savunma sanayii kümesi** (en az 3 bağımsız sahip) varsa üretilir. Teknoloji savaşta yüzde bonusla değil **birlik modeli (I–III)** ile girer ve iki taraf arasındaki teknoloji farkı **göreli olarak ×1,5 ile tavanlanır**; adalet sabitleri (yağma, kayıp, parsel) teknolojiden bağımsızdır.

| Alan | Değer |
|---|---|
| **Durum** | Ar-Ge önerisi; karar değildir (1 Ekim 2026). Sayılar **öneri**dir, kalibre edilmemiştir |
| **Ne için** | [12 §5](../12-yon-taslagi.md) "bilim, teknoloji, askeri bilimler ve askeri teknoloji genişletilir"; [11 Ek karar](../11-urun-donusu.md) (askeri güç beşinci ayak, parsel el değiştirmez, strateji çekirdeği) |
| **Dayanak belgeler** | [08 §4 Teknoloji](../08-alti-katman.md) (TK1–TK4, B6) · [çeşitlilik ve yönetim raporu](cesitlilik-yonetim-askeri-teknoloji.md) §5–§6 · [11 §7](../11-urun-donusu.md) · `packages/veri/icerik/icerik.json`, `packages/cekirdek/src/teknoloji.ts`, `askeri/` |
| **Tekrar etmeyenler** | 17 düğümün tam listesi ve bedelleri (08 §4.3), 3×3 taş-kâğıt-makas üçgeni ve il savaşı akışı (çeşitlilik §5.1, §5.4), adalet paketi (§5.7), patent fikri. Burada yalnız **genişletilir, birbirine bağlanır ve eksikleri kapatılır** |
| **Güvenilirlik** | Web kaynakları sonda URL ile listelidir. Bazı wiki sayfaları (Victoria 3, Stellaris, Foxhole fandom) doğrudan okunamadı; o satırlar **(arama özeti)** diye işaretlidir. Gerçek kurumlardaki oranlar (TÜBİTAK, KOSGEB) **(doğrulanmadı; güncel çağrı metnine bakılmalı)**. Düğüm süreleri için kâğıt üstü bir simülasyon yapıldı (§4.4); gerçek ölçüm yerine geçmez |
| **Maliyet etiketi** | **S** ≈ ≤3 iş günü, tek modül · **M** ≈ 1–2 hafta, çekirdek + içerik · **L** ≈ 3+ hafta ya da çekirdek + sunucu + istemci (hepsi tahmin) |
| **Kapsam dışı** | Kod, başka belge, commit. Oyunda gerçek silah sistemi markası, gerçek ülke ordusu adı ve güncel çatışma yoktur; birlik ve düğüm adları jeneriktir |

**Dil notu.** Zaman dilimleri için "iklim takvimi" ve "dönem" kullanılır. Teknolojide "çağ" yoktur; **kademe** vardır (§4.1).

---

## Yönetici özeti (10 madde)

1. **Araştırma = para × kapasite × ortam; ayrı bilim puanı yok.** Her Atölye-Lab bir araştırma yuvasıdır (en çok 2). Hız, Ar-Ge bütçesi ve ilçenin **Bilim Kapasitesi**'ne (BK, 0–100: Lab, okul, üniversite, teknopark, eğitim yasası) bağlıdır. Lab'ın yöntemi kademeyi sınırlar: S ölçek K2'ye, M ölçek K3'e, L ölçek (Merkez+ ilçe, üniversite) K4'e kadar. **Öncü düğümler ilçe işidir** (§3.1).
2. **Bilgi dört kanaldan yayılır:** dünyadaki bilen payı (mevcut), **yakınlık ağırlığı** (aynı ilçe ×2,0, komşu ilçe ×1,5, aynı il ×1,25; yalnız *kullanılan* teknoloji yakın yayılır) ve **emilim kapasitesi** (kendi Ar-Ge'si ve BK'si olan başkasının bilgisini daha ucuza öğrenir; Cohen–Levinthal'in "Ar-Ge'nin ikinci yüzü"). Patent lisansa bağlıdır; ayrıca **açık yayın** seçeneği vardır (§3.2).
3. **Ortak araştırma üç kapsamdadır:** oyuncu (donanım ve sivil düğümler), ilçe (8 kalkınma programı, bağışla), il (12 doktrin düğümü, il Ar-Ge bütçesiyle). Sivil düğümlerde **konsorsiyum** (≤4 üye, K≤3), askeri donanımda yalnız **lisanslı üretim** (bir kademe geri) vardır (§3.3, §6.3).
4. **Keşif olayları yalnız fırsattır** ve tavanlıdır: **ilham** (düğüme özgü eylem eşiği; maliyet ve süre ×0,7; Civilization VI'nın eureka'sından esinli), savaşta karşılaşmaktan doğan **maruz kalma ilhamı** (yetişme), küme etkisi, yan ürün, teknoloji fuarı. Başarısız deney ve kötü olay **yoktur** (§3.4).
5. **Ağ, 97 düğüm, 4 kademe:** K1 Yerleşik, K2 Yaygın, K3 Gelişmiş, K4 Öncü. Dal içi derinlik ≤4; çapraz katman ön koşullarıyla zincir ≤6; düğüm başına ≤2 ön koşul. Çağ kapısı yoktur. Dört dışlayan çift **"tek aktif standart"** olarak bedelli değiştirilebilir (§4, §9).
6. **Süreye yayılım (kâğıt üstü):** geniş yoldaki bir oyuncu 30. günde 6–10, 90. günde 22–32, 180. günde 40–52 düğüm açar (oyuncu ve ilçe kapsamlı 85 düğümün ≈ yarısı); K4'e ancak odaklı yolla ve ≈75. günden sonra ulaşılır (§4.4).
7. **Askeri bilim üç katmandır:** **donanım** (8 dal, 24 düğüm, oyuncu: Piyade, Topçu, Zırhlı, Hava savunma, İnsansız, Elektronik harp, İstihkam, İkmal; birlikler Model I–III), **doktrin** (4 doktrin × 3 kademe = 12 düğüm, **il** sahipli, iki dışlayan eksen: Savunma Derinliği ⊕ Hareketli Harp, Lojistik ⊕ İstihbarat) ve **destek** (keşif, EH, ikmal, istihkam; doygun ve karşılıklı bastırılabilir) (§5).
8. **Askeri güç ekonomiden doğar:** 3 yeni mal (Özel Çelik, Sensör Modülü, Hassas Mühimmat), 4 katmanlı savunma sanayii zinciri ve **savunma sanayii kümesi şartı** (Model III ve doktrin III için ilde ≥3 bağımsız sahibin aktif zincir yöntemi). Teknoloji kaybolmaz; ama **üretim kapasitesi** kaybolabilir (§5.5).
9. **Denge:** teknoloji katsayısı `T = model × destek × doktrin` ve **göreli tavan T_A ≤ 1,5 × T_B**; model başına güç +%16/+%12, satın alma maliyeti ×1,3/×1,38 (azalan getiri); yetişme: yayılım, maruz kalma ilhamı, lisanslı üretim, yeni girişimci hibesi (TÜBİTAK'tan esinli). Yağma ≤%25, yapı ≤%10, parsel 0, ≥49 sa, 1:5, kalkan **hiçbir teknolojiyle değişmez** (§6).
10. **Geri dönüşü zor 10 karar ve öneriler (§9):** ağ (DAG) olsun · dışlama "tek aktif standart" olsun, kilit olmasın · **bilgi kaybolmasın**, üretim kaybolabilsin · askeri teknoloji **aynı motor, ayrı slot ve ekran**, tek yönlü sivil ön koşul · üç sahiplik kapsamı · savaşa **model + göreli tavan** ile girsin · **tek para birimi** (puan yok) · **id tabanlı serileştirme ve yalnız-ekle içerik** · çağ yok, 97 düğüm ve dönem başına +12 · öncü düğüm ilçe işi olsun.

---

## 1. Çerçeve: kilitli kararlar ve mevcut durum

### 1.1 Kilitli kararlar

| Kaynak | Kural | Bu rapordaki sonucu |
|---|---|---|
| [12 §2–3](../12-yon-taslagi.md) | Strateji tabanlı, **MMORPG değil**; yön değiştirme **kilitsiz**, yalnız ekonomik maliyetli | Karakter becerisi, XP, rütbe yok; teknoloji işletmeye/ilçeye/ile aittir; dışlama **bedelli değiştirilebilir** (§9 G2) |
| [08 TK1](../08-alti-katman.md) | Teknoloji yüzde vermez, **yöntem/karar/yapı açar**; her düğümün bedeli vardır | 97 düğümün hepsi bir yöntem, yapı, birlik modeli, emir kartı, karar veya panel açar. Savaşta yüzde yok: **birlik modeli** (§5.4) |
| [08 TK2, B6](../08-alti-katman.md) | Sürekli Ar-Ge bütçesi, 2 slot, hız tavanı, yayılım, dışlayan dal | Aynen temel alınır; slot = Atölye-Lab; BK, emilim, ilham, konsorsiyum eklenir |
| [11 Ek karar](../11-urun-donusu.md) | Askeri güç beşinci ayak; **parsel asla el değiştirmez**; savaş kontrolü kazandırır; Alfa-0'da NPC baskını, Alfa-1'de il savaşı | Teknoloji parseli etkilemez, ele geçirilemez, ganimet olarak alınamaz (§6.4) |
| [11 §7.7, çeşitlilik §5.7](cesitlilik-yonetim-askeri-teknoloji.md) | Yağma ≤%25, yapı ≤%10, ≥49 sa, kalkan 14 gün, servet 1:5, ittifak tavanları | Bu sabitler **teknolojiden bağımsız** bir invaryanttır (§6.4) |
| [10](../10-gorev-listesi.md) | Teknoloji v1 Alfa-1 sonrasına ertelendi; Alfa-0'da mevcut düğümler + Atölye-Lab | Dilimler §8.3'te; Alfa-0'da yalnız içerik (çekirdek değişmez) |
| Sahip (1 Ekim) | Askeri bilim ve teknoloji genişletilir; "çağ" değil gerçekçi kademe; Türkiye'den esin | §3.5, §4.1 |

### 1.2 Mevcut durum (kod ve veri)

| Öğe | Bugün | Kaynak |
|---|---|---|
| Teknolojiler | **7 düğüm** (`mekanize_tarim`, `sulama_sistemi`, `derin_madencilik`, `elektrik_ark_ocagi`, `otomasyon`, `konteyner_limani`, `mekanize_ordu`); 08 §4.2 "6 düğüm" diyordu, `sulama_sistemi` sonradan eklenmiş. Toplam maliyet 195 M (1 M = 1 milyon mili-para = 1 000 para) | `icerik.json` |
| Araştırma | Tek slot, maliyet **peşin**, yayılım `p = bilen / (oyuncu−1)`, indirim `p × 500 000 ppm` | `teknoloji.ts` |
| Birlikler | 2 tür (`piyade_tumeni` güç 100, `zirhli_tumen` güç 260); birlik açıklığı yalnız `gerekliTeknoloji` ile | `icerik.json`, `askeri/uretim.ts` |
| Savaş | `güç = Σ adet × guc`, × ikmal × arazi × duruş, ±%10 sapma; **teknoloji veya tür çarpanı yok** | `askeri/savas.ts` |
| Serileştirme | Açılmış teknolojiler ve aktif araştırma **indeksle** saklanır | `serilestir.ts` |
| Ölü uçlar | `konteyner_limani` yalnız bir karar açıyor; `mekanize_ordu` `acar: {}` (birlik tanımına bağlı) | [07 §1.2](../07-tasarim-onerileri.md) |

**Bu rapordan çıkan iki acil uyarı.** (1) Serileştirme indeksle çalıştığı için `icerik.json` içinde düğüm veya birlik **ortaya eklenirse eski anlık görüntüler bozulur**; yalnız-ekle kuralı ve id tabanlı serileştirme şarttır (§9 G8). (2) Birlik modelleri ayrı `BirlikTanimi` kayıtları olarak eklenirse çekirdekte **hiçbir değişiklik gerekmez** (tür ve model alanları yalnız yeni üçgen/tavan için okunur); bu, Alfa-0'da askeri tarafın içerikle genişleyebilmesini sağlar.

---

## 2. Referans sistemlerden dersler

| Sistem | Mekanik | Kaynak | Bizde |
|---|---|---|---|
| **Civilization VI** | Eureka/İlham: oyuncunun doğal eylemi tetikleyince düğüm maliyetinin %40'ı geri gelir; çoğu düğümde vardır | [Boost](https://civilization.fandom.com/wiki/Boost_(Civ6)), [Civilopedia](https://www.civilopedia.net/en-US/gathering-storm/concepts/science_3/) | **İlham** (§3.4): düğüme özgü eylem eşiği, ×0,7; yaparak öğrenme |
| **Hearts of Iron IV** | Araştırma yuvaları; **zamanından önce araştırma cezası** (yıl başına +%200 süre); doktrinler büyük ve dışlayıcıdır; yeni doktrinler artık subay XP'siyle açılır | [EIP rehberi](https://eip.gg/hoi4/guides/research/), [Land doctrine](https://hoi4.paradoxwikis.com/Land_doctrine) (arama özeti) | Yuva = Atölye-Lab. **Doktrinler il kimliğidir** ama XP ile değil il Ar-Ge bütçesiyle (karakter ilerlemesi yok). Zaman cezası yok; öncünün bedeli *takipçinin indirimidir* |
| **Victoria 3** | Yayılım haftalıktır; her ağaçta hâlihazırda başkalarında olan bir teknoloji size akar; hız **okuryazarlığa** (+ üniversite) bağlıdır; öncü teknoloji "kavram kanıtı" olur; zamanından önce cezası var (oran sürüme göre değişir, **doğrulanmadı**) | [Technology](https://vic3.paradoxwikis.com/Technology) (arama özeti), [Primer](https://steamcommunity.com/sharedfiles/filedetails/?id=2883839339) (arama özeti) | **Emilim kapasitesi** BK'ye bağlıdır (§3.2); öncü tam fiyat öder, takipçi indirimli |
| **Stellaris** | Teknoloji maliyeti imparatorluk büyüklüğüyle artar (büyüklük 100 üstü her puan için +%0,1); tekrarlanabilir teknolojiler geç oyun lavabosudur | [Technology](https://stellaris.fandom.com/wiki/Technology), [Defines](https://stellaris.paradoxwikis.com/Defines) (arama özeti) | **Büyüklük primi** yalnız kapalı bir ayar olarak tutulur (§6.1); tekrarlanabilir araştırma **reddedildi** (§9 G9) |
| **Foxhole** | Teknoloji **oyuncuların ortak katkısıyla** (prototip kitleri) ilerler; aynı seviyede rakip teknolojiler paralel ilerler, en çok ilerleyen açılır; araştırma **her savaşta sıfırlanır/rastgelelenir** (savaşlar 6–36 gün) | [Technology](https://foxhole.fandom.com/wiki/Technology) (arama özeti), [Technology Center](https://foxhole.wiki.gg/wiki/Technology_Center) (eski sistem, 0.26'da kaldırıldı), [World Conquest](https://foxhole.wiki.gg/wiki/World_Conquest) | İl doktrini ortak katkıyla ilerler ama **katkı oy/ağırlık vermez**; dünya sıfırlanmadığı için araştırma **kalıcıdır**, rastgele atama yoktur |
| **Factorio** | Fiziksel bilim paketleri laboratuvara taşınır; araştırma kuyruğu; sonsuz araştırma | [Research](https://wiki.factorio.com/Research) | Lab **fiziksel mal tüketir** (elektronik); kuyruk (≤3) v1.5; sonsuz araştırma yok |
| **Anno 1800** | Araştırma Enstitüsü: puan, **âlim nüfusuyla** sınırlı; mühendis iş gücü hızı belirler; izinler yeni konut ve araştırma açar | [Research Institute](https://anno1800.fandom.com/wiki/Research_Institute), [Anno Union devblog](https://www.anno-union.com/devblog-scholars-and-research/) | **Nitelikli işgücü** ve ilçe seviyesi Lab kademesini sınırlar (§3.1) |
| **EVE Online** | Tech II için *invention*: datacore ve decryptor tüketilir, başarı **olasılıklıdır**, deneme başarısız olsa bile girdiler gider; beceri **karakterdedir** | [EVE University](https://wiki.eveuniversity.org/Invention), [EVE Support](https://support.eveonline.com/hc/en-us/articles/203210642-Invention) | **Reddedildi:** olasılıklı araştırma başarısızlığı (adalet ve determinizm) ve karakter becerisi. Alınan ders: kopya/lisans mantığı (patent) |
| **Gerçek dünya (akademik)** | Emilim kapasitesi (Ar-Ge'nin iki yüzü); fikirler giderek pahalılaşır; askeri yeniliğin yayılımı **mali yoğunluğa ve örgütsel sermayeye** bağlıdır; Lanchester kare yasası yığılmayı ödüllendirir; bilgi büyük nüfusta korunur | [Cohen–Levinthal](https://en.wikipedia.org/wiki/Absorptive_capacity), [Bloom ve ark.](https://www.aeaweb.org/articles?id=10.1257%2Faer.20180338), [Horowitz](https://www.andrewerickson.com/2011/06/michael-c-horowitz-the-diffusion-of-military-power-causes-and-consequences-for-international-politics/), [Lanchester](https://en.wikipedia.org/wiki/Lanchester%27s_laws), [Henrich](https://www.researchgate.net/publication/200033047_Demography_and_Cultural_Evolution_How_Adaptive_Cultural_Processes_Can_Produce_Maladaptive_Losses-The_Tasmanian_Case) | Emilim (§3.2); kademe başına maliyet ×1,8–2 (§3.1); askeri model **mali yoğunluk** (satın alma ×1,3–1,85) ve **örgütsel sermaye** (kümesi, doktrin) ister (§5); bilgi kaybı **modellenmez** (§9 G3) |

**Çıkarılan sekiz ilke.**

1. **Yaparak öğren:** ilham, düğümü oyun içi eyleme bağlar; araştırma ekonomi-dışı bir menü olmaktan çıkar.
2. **Öncü tam fiyat öder, takipçi indirimli öğrenir** (Victoria 3); ama öncünün ödülü vardır: patent/açık yayın, "ilk keşfeden" vitrini, sahada üretim avantajı.
3. **Emilim, kendi Ar-Ge'ye bağlıdır:** ayarla-unut oyuncu yayılımdan tam yararlanamaz.
4. **Araştırma yeni oyuncuya açık kalmalı:** Foxhole'un sıfırlamasını alamayız (dünya sıfırlanmıyor); yerine yetişme araçları kurulur (§6.2).
5. **Zamanından önce cezası yok, kademe maliyeti var:** K4 maliyeti K1'in ≈5–6 katı, süresi ≈8 katıdır; sonuç farkı sabit kalır (Bloom: fikirler pahalılaşır).
6. **Kolektif katkı oy vermez:** Foxhole'un ortak araştırması iyi bir sosyal döngüdür, ama paralı katkıyla karar satın alınamaz (çeşitlilik §4.4 ilkesi).
7. **Rastgele başarısızlık yok:** EVE'nin invention kaybı oyuncuyu cezalandırır; bizde rastgelelik yalnız *fırsat olaylarında* ve sınırlıdır.
8. **Askeri yayılım maruz kalmayla başlar:** Horowitz'in "maruz kalma + kapasite" ayrımı, **maruz kalma ilhamı** (§3.4) ve **küme şartı** (§5.5) olarak uygulanır.

---

## 3. Bilim sistemi

**Tasarım cümlesi.** Araştırma bir *puan* değil, **bir işletme faaliyetidir:** para harcar, elektronik ve elektrik tüketir, nitelikli işçi ister, yuva kaplar. Hızını ve ulaşabileceği kademeyi **ilçenin bilim ortamı** belirler. Bilgi oyuncuya aittir; ortam ilçeye aittir; doktrin ile aittir.

### 3.1 Araştırma nasıl üretilir

```
 Ar-Ge bütçesi (gelir payı) ─┐
 Atölye-Lab yuvası (≤2) ─────┼─► ilerleme/saat = min(hızTavanı, bütçe / tamHızGideri)
 Lab yöntemi (S/M/L) ────────┘      │ kademe kapısı: S→K≤2, M→K≤3, L→K≤4
 ilçe Bilim Kapasitesi (BK) ──► emilim (yayılım), keşif olasılığı, hız tavanı (+0,1 üniversite)
 nitelikli işgücü ────────────► Lab ve ileri yöntemlerin işçi karşılanması
```

#### 3.1.1 Girdiler

| Girdi | Ne yapar | Nereden gelir | Not |
|---|---|---|---|
| **Ar-Ge harcaması** | Aktif araştırmaya saatlik para akar; araştırma gerçek zamanlı ilerler ve oyuncu çevrimdışıyken de sürer ([12 §7](../12-yon-taslagi.md) zaman kararı); yarım bütçe = iki kat süre, toplam maliyet aynı (08 TK2) | Oyuncunun gelir payı (`arastirma_payi`); il için il hazinesinin `arastirma` kolu (D5) | Fazla bütçe **birikir** ama en çok 7 günlük tamamlanmamış hız kadar (süresiz istif yok) |
| **Atölye-Lab** | Bir araştırma yuvası; fiziksel girdi tüketir | [11 §7.3](../11-urun-donusu.md): 1 yuva, 6 sa inşa | En çok **2 Lab**/oyuncu (ikincisi `ar_ge_yonetimi` ile). Biri sivil, biri savunma Lab'ı olabilir: **askeri yönelimin bedeli ikinci yuvadır** (kilit değil, fırsat maliyeti) |
| **Lab yöntemi** | Kademe kapısı ve gider profili | `YontemTanimi` (mevcut sistem; Lab'da yöntem değiştirmek diğer tesislerle aynı maliyetli) | Tablo §3.1.3 |
| **Bilim Kapasitesi (BK)** | İlçe göstergesi; emilimi, keşif olasılığını, hız tavanının üniversite payını belirler | Aşağıdaki tablo | Dikkat panelinde "İlçe Bilimi" kartı; oyuncu doğrudan ayarlamaz, **yatırımla** yükselir |
| **Nitelikli işgücü** | Lab ve `ileri_*` yöntemlerinin işçisinin bir kısmı nitelikli olmalı | Eğitim yasası, okul/meslek lisesi, üniversite, konut | Karşılanmazsa yöntem çıktısı kısılır (mevcut işgücü doygunluğu mekanizması; M) |

**BK bileşimi (öneri, 0–100):**

| Katkı | Puan | Koşul / not |
|---|---:|---|
| Aktif Atölye-Lab (ilçedeki, farklı sahiplerin) | +12 her biri, ≤3 sayılır | Aynı sahibin ikinci Lab'ı yarım sayılır (tek kişi ilçe bilimini şişiremez) |
| Okul / meslek lisesi (ortak proje) | +10 | [çeşitlilik §4.4](cesitlilik-yonetim-askeri-teknoloji.md) kataloğu |
| Eğitim yasası düzeyi | +5 × düzey (≤15) | İl yasası (`kamu_egitimi`) |
| **Üniversite** (ortak proje, Merkez+) | +20 | Ayrıca hız tavanına +0,1 (08 TK2'deki `1 + 0,1 × eğitim`'e ek) |
| **Teknopark** (ortak proje; üniversite şart) | +14 | Küme etkisi tavanını yükseltir (§3.4) |
| Ar-Ge etkinliği | +5 | İlçe oyuncularının son 28 gün Ar-Ge harcaması medyanı, hedef payın ≥%50'si |

#### 3.1.2 Hız formülü (08 TK2'nin genişletilmişi)

```
tamHizSaatlikPara = maliyet × yayilimCarpani × ilhamCarpani / (sureGun × 24)
hizTavani         = 1,0 + 0,1 × egitimDuzeyi + 0,1 × universiteVar            (≤ 1,4)
hizPpm            = min(hizTavani, butcePaySaat / tamHizSaatlikPara)
kumeCarpani       = 1 − min(kumeTavani, 0,03 × (komsuLabSayisi aynı dalda))   // §3.4
bitis             = kalan / (hizPpm / (sureGun × 24 × kumeCarpani))
```

`yayilimCarpani × ilhamCarpani ≥ 0,35` (taban; §3.2). Çarpanlar **yalnız bitiş olayının yeniden planlanmasını** tetikler (08 TK2'deki sürümlü olay).

#### 3.1.3 Lab yöntemleri ve kademe kapısı

| Yöntem | Ölçek | Kademe sınırı | Girdi (öneri, mili-birim/saat) | İşçi | Şart |
|---|---|---|---|---|---|
| `temel_lab` | S | K1–K2 | elektrik 6 000 | 2 000 | — (Köy'de de kurulabilir; Ö1) |
| `deney_lab` | M | K3 | elektrik 10 000, elektronik 1 500 | 3 000 (1 500 nitelikli) | teknoloji `deney_donanimi`; Kasaba+ |
| `ortak_lab` | L | K4 | elektrik 18 000, elektronik 3 000 | 5 000 (3 000 nitelikli) | `universite_isbirligi` + ilçede **Üniversite**; Merkez+ |
| `savunma_lab` | M (K3) / L (K4) | askeri donanım düğümleri | elektrik 10 000, elektronik 2 000, mühimmat 500 | 3 000 | aynı ilde sahibin **Ordugâh**'ı; K4 için ilde savunma kümesi (§5.5) |
| `teknopark_lab` | M/L | `deney_lab`/`ortak_lab` ile aynı | elektrik ve işçi gideri −%25 (vergi istisnası esini) | aynı | ilçede **Teknopark** |

**Kural:** Askeri donanım düğümleri yalnız `savunma_lab`'da, sivil düğümler yalnız sivil Lab'larda araştırılır (§5.1). **Kademe kapısı bir yöntem özelliğidir**, global bir "çağ kapısı" değildir; kapıyı açan, ilçenin gelişimidir (Anno modeli, [11 §7.4](../11-urun-donusu.md)).

#### 3.1.4 Azalan getiri (Bloom ve ark. esini)

- **Kademe başına maliyet** ≈ ×1,8–2: K1 14–25 M, K2 18–40 M, K3 36–62 M, K4 88–110 M; süre 2–3, 2–5, 8–12, 16–21 gün. Kazanılan yetenek farkı kademeden bağımsız yaklaşık sabittir ("fikirler pahalılaşır").
- **Hız tavanı ≤1,4:** bütçe dağıtmak hızı sonsuza çıkarmaz.
- **İkinci Lab azalan:** aynı sahibin ikinci Lab'ı BK'ye yarım sayılır ve bütçe iki yuva arasında bölünür (iki yuva, iki kat hız demek değildir).
- **Ağaç büyür, araştırma tekrarlanmaz:** karar tükenmesi için sonsuz araştırma yerine **dönem başına +12 düğüm** (§4.4, §9 G9).

### 3.2 Bilginin yayılması

**Dört kanal ve tek formül.** Mevcut yayılım (`teknolojiYayilimiPpm`) yalnız "bilen oyuncu payı"nı kullanır. Genişletme:

```
w_j     = yakinlik_j × anlasma_j            // yakinlik: aynı ilçe 2,0 · komşu ilçe 1,5 · aynı il 1,25 · diğer 1,0
                                            // anlasma: ticaret anlaşmalı partner 1,5 (08 TK3), değilse 1,0
bilir_j = 1  ise  j teknolojiyi bilir VE (yakınlık ≥ 1,25 ise) ilgili yöntemi/yapıyı ≥7 gündür kullanıyor
p       = Σ_j w_j × bilir_j / Σ_j w_j       (j ≠ oyuncu)
emilim  = 0,5 + 0,25 × BK/100 + 0,25 × arGeDuzeyi        // arGeDuzeyi: son 28 gün Ar-Ge harcaması / hedef pay, 0–1
indirim = min(0,60, 0,50 × p × emilim + lisansPayi)       // lisansPayi: lisanslıysa +0,10
yayilimCarpani = 1 − indirim
```

| Kanal | Nasıl çalışır | Kimi etkiler | Sınır |
|---|---|---|---|
| **1. Dünya yayılımı** | Mevcut: bilen oyuncu payı `p` (ağırlıklı) | Herkes | Taban çarpan 0,35 (ilhamla birlikte) |
| **2. Yakınlık** | Yakın yayılım yalnız **kullanılan** teknolojiden doğar (gözlem): bilgi sahibi ama kullanmayan, komşusuna yayılım sağlamaz. Teknoloji, sokakta **görünür** (§7), yayılım kanalıdır | Aynı ilçe/komşu/aynı il | Aktif kullanım sayacı (S–M) |
| **3. Emilim** | Kendi Ar-Ge'si ve ilçenin BK'si yüksek olan, aynı `p` ile daha çok indirim alır. Henrich'in "kalabalık bilgiyi korur" ve Cohen–Levinthal'in "Ar-Ge öğrenmeyi de üretir" gözlemleri | Araştıran, ayarla-unut oyuncuya karşı | emilim ∈ [0,5; 1,0] |
| **4. Lisans / patent / açık yayın** | Aşağıda | K3–K4 düğümün ilk keşfedeni | Süre 14–28 gün, lisans ≤%25 |

**Patent ya da açık yayın (öncünün seçimi).** `fikri_haklar` sahibi, **dünyada ilk** K3/K4 düğümü araştırdığında iki seçenekten birini seçer (öncünün ödülü; çeşitlilik §6.2'nin patent fikrinin derinleştirmesi):

| Seçenek | Etki | Bedeli |
|---|---|---|
| **Patent** (14–28 gün) | Başkaları düğümü **tam fiyatla** araştırabilir (kilit yok); lisans alan `lisansPayi` ile indirim alır, sahip lisans bedeli (≤düğüm maliyetinin %25) kazanır | Yayılım `p` bu sürede *bu düğüm için* yalnız lisanslılardan sayılır; yeni hesap ve kalkandakiler bedelsiz |
| **Açık yayın** | Lisans yok; komşu yayılım ağırlığı ×2 (14 gün); ilçe BK +1 (28 gün); "Açık Bilim" unvanı (kozmetik); plaket | Gelir yok |

İkisi de süre bitince **kamu malı** olur (mevcut yayılım). Bu seçim bir **sosyal karardır**: kısa vadeli gelir mi, ilçenin yükselişi mi.

### 3.3 Ortak araştırma

**Üç sahiplik kapsamı.**

| Kapsam | Sahibi | Kim araştırır | Para | Düğüm | Etki |
|---|---|---|---|---|---|
| **O: oyuncu** | Oyuncu/işletme | Oyuncunun Lab'ı | Kendi Ar-Ge bütçesi | 77 | Yöntem, yapı, birlik modeli, karar |
| **İ: ilçe programı** | İlçe | İlçenin **ortak slotu** (1; Üniversite +1) | **Bağış havuzu** (herkes, katkı oy vermez) | 8 (†) | İlçedeki herkese açar (şebeke, ortak soğuk depo, ilçe sulama ağı, atık, erken uyarı, imar, analitik, demiryolu) |
| **L: il doktrini** | İl komutanlığı | Vali + il meclisi (il Ar-Ge kolu) | İl hazinesi `arastirma` kolu + bağış | 12 | İldeki tüm birliklerin emir kartları ve çarpanları |

**İl bilgi tabanı.** Doktrin ve il yasalarının ön koşulları **kişisel değil ilin** ön koşuludur: *ildeki en az bir oyuncu o düğüme sahipse* karşılanır. Böylece askeri doktrin sivil/askeri donanımla beslenir, ama tek oyuncuya bağımlı olmaz (il, üyelerinin bilgi birleşimidir). Aynı küme yakın yayılımın temelidir.

**Konsorsiyum (sivil, K≤3; ≤4 üye).** `konsorsiyum_kur {teknoloji, uyeler}`; üyeler her biri **kendi Lab yuvasını** ve ön koşullarını getirir; bitişte hepsi aynı anda teknolojiyi açar.

```
toplamMaliyet = maliyet × (1 + 0,30 × (n − 1))     n=2: ×1,3 · n=3: ×1,6 · n=4: ×1,9   // üye başına 0,65 / 0,53 / 0,475 maliyet
sure          = sureGun × (1 − 0,05 × (n − 1))      // n=4: ×0,85
payAlt = 0,15 (her üyenin toplamdaki payı ≥ %15; bedavacı yok)
```

| Sınır | Değer | Neden |
|---|---|---|
| Üye | ≤4; ittifak üyelik tavanından (min(60, aktifin %15'i)) bağımsız | Konsorsiyum küçük ekip işidir |
| Kademe | K≤3 (K4 ortak lab'ın işi) | K4'ün ilçe işi olması ilkesi |
| **Askeri donanım** | **Konsorsiyum yok** (yalnız lisanslı üretim, §6.3) | Savunma sırrı; ittifak içi teknoloji topluluğu savaşta tavanı aşmasın |
| Hibe | Konsorsiyum üyesi hibe (aşağıda) alamaz | Hibe + ortak gider çifte indirim olmasın |

**İlçe programları** ([çeşitlilik §6.2](cesitlilik-yonetim-askeri-teknoloji.md) fikrinin sayısallaştırması): dört program (`ilce_sulama_agi`, `ortak_soguk_depo`, `atik_yonetimi`, `erken_uyari_agi`) K2, dört program (`akilli_sebeke`, `imar_planlama`, `kamu_analitigi`, `demiryolu_baglantisi`) K3 düğümdür; ilçe ortak slotunda **bağışla** ilerler; sonuç ilçedeki **herkese** açar. Bu, oyunun **imece** mekaniğinin bilim karşılığıdır. Katkı oy ağırlığı vermez; **kitabe** (plaket), "Katkı Defteri", ilçe kasası %50 eşleştirmesi (tavanlı). Bedavacılık, plaket ve eşleştirmeyle yumuşatılır.

**Üniversite ve teknopark (ilçe ortak projeleri, Merkez+).**

| Yapı | Gerekli | Verdiği |
|---|---|---|
| **Üniversite** | Merkez+ ilçe; 14 gün ortak proje (para + elektronik + çelik) | +20 BK; `ortak_lab` (K4); ilçeye +1 ortak slot; hız tavanı +0,1; nitelikli işgücü payı ↑ |
| **Teknopark** | Üniversite şart (4691 sayılı Kanun'daki üniversite–sanayi bağıyla uyumlu) | +14 BK; `teknopark_lab` (gider −%25); küme etkisi tavanı −%9 → −%15; **kuluçka** (aşağıda) |
| **Yeni girişimci hibesi** (il/ilçe kasası) | Teknopark ya da il kararı | Oyuncunun **ilk 5 araştırması %75**, 6.'dan sonrası **%60 destekli** (ilçe/il kasasının hibe bütçesinden; kasa boşsa hibe yok); **servet eşiği üstündeki oyuncu** (ilçe medyanının >3 katı) hibe alamaz; hesap başına yaşam boyu 12 hibeli araştırma |

Hibe, Türkiye'deki Ar-Ge destek programlarından esinlidir (§3.5); amaç, **geç katılan ve küçük oyuncunun K1–K2'de yetişmesi** ve büyüğün hibeyle şişmemesidir.

### 3.4 Bilimsel keşif olayları

**İlke.** Olaylar **yalnız fırsattır**, tavanlıdır, deterministik PRNG akışıyla (`bilim` akışı) çekilir; başarısız deney, "ölüm vadisi", kaybolan ilerleme **yoktur**. Oyuncu başına olumlu bilim olayı ayda ≤2 sayılır.

| # | Olay | Tetikleyici | Etki | Tavan / sıklık |
|---|---|---|---|---|
| E1 | **İlham** (yaparak öğrenme) | Düğüme özgü eylem eşiği (tablo aşağıda) | O düğümün maliyet ve süresi ×0,7 (tek sefer) | Aynı anda ≤2 aktif ilham; toplam çarpan tabanı 0,35 |
| E2 | **Maruz kalma ilhamı** (askeri; yetişme) | Savaş veya PvE baskınında **kendi sahip olmadığı** bir model/destek ile karşılaşmak | O modelin düğümü için ilham (E1) | Yalnız rakibin düğümü sizden **yüksekse**; model başına tek sefer. **Kazanan da alabilir** (gözlem), ama yalnız yüksek modeller için |
| E3 | **Küme etkisi** | Aynı dalda, aynı ilçede farklı sahiplerin Lab'ları | Her ek komşu Lab: araştırma süresi −%3 | ≤ −%9; Teknopark'la ≤ −%15 |
| E4 | **Yan ürün** | Araştırma bitişi, ilçe BK ≥ 40 | %10 olasılıkla, ön koşulu sağlanmış en ucuz düğümde **%25 ilerleme** | Oyuncu başına ayda ≤1 |
| E5 | **Saha keşfi** | İlçede ≥2 Lab ve damar etiketi | İlçedeki bir damarda rezerv işareti/keşif (tükenmeye karşı yeni damar; küçük) | İlçe başına 3 ayda ≤1 |
| E6 | **Teknoloji fuarı** (iklim takvimi; yılda 2 dönem, 3 gün) | İlçe fuar merkezi | Açık gösteri: komşu yayılım ağırlığı ×1,5 (3 gün); plaket | Fuar merkezi şart |
| E7 | **Akademik dönem** (takvim; mezuniyet dalgası) | Üniversiteli ilçe | Nitelikli işgücü payı +%5 (14 gün) | Yılda 1 |

**İlham tetikleyicileri (örnek; tüm K1–K3 düğümlere yazılacak).**

| Düğüm | Tetikleyici (oyuncunun doğal eylemi) |
|---|---|
| `mekanize_tarim` | 3 ayrı tarlada geleneksel yöntemle 7 gün hasat yapmak |
| `sulama_sistemi` | İlçede bir **kuraklık uyarısı** yaşamak (iklim olayı) |
| `derin_madencilik` | Yüzey ocağında rezerv oranı %30'un altına inmek |
| `elektrik_ark_ocagi` | Yüksek fırını kesintisiz 10 gün çalıştırmak |
| `otomasyon` | Parça hattında 14 günde ≥3 gün işgücü kıtlığı yaşamak |
| `soguk_zincir` | Ambarda 3 gün içinde stokun ≥%10'unu bozulmaya kaybetmek |
| `konteyner_limani` | Limandan 10 sevkiyat yapmak |
| `ozel_celik` | Ark ocağında 14 gün üst üste ≥%80 kullanımla çalışmak |
| `ileri_elektronik` | Elektronik hattının girdisini ardışık 7 gün karşılamak |
| `piyade_modernizasyonu` | Piyade ile bir savaşta/baskında savunmada kayıp vermek |
| `zirh_koruma`, `atis_kontrol`, `ileri_*` | **Maruz kalma (E2):** karşı tarafın o modelle karşılaşmak |
| `ikmal_konvoyu`, `sahra_revir` | İkmal karşılanması %50 altına düşen bir abluka veya baskından geçmek |
| `radar_agi` | PvE hava/keşif olayı yaşamak |

### 3.5 Gerçek Türkiye kurumlarından esinler (kopya değil)

Aşağıdaki kurumlar **mekanik esin** olarak alınır; oyunda adları, logoları ve gerçek program kodları kullanılmaz (jenerik: "Sanayi Ar-Ge Desteği", "Teknopark", "Girişimci Hibesi").

| Gerçek kurum / mekanizma | Gerçekte (kaynak) | Oyundaki esin | Neden kopya değil |
|---|---|---|---|
| **TÜBİTAK sanayi Ar-Ge desteği** (1501) | Hibe, geri ödemesiz; ilk 5 proje %75, sonrası %60 (üst limitli); **yalnız KOBİ**, büyük işletmeler yararlanamaz ([TÜBİTAK](https://tubitak.gov.tr/sites/default/files/1501.pdf); oranlar özet kaynaklardan: [NeoGrant](https://www.neogrant.com.tr/hizmetler/tubitak/tubitak-1501-sanayi-ar-ge-projeleri-destekleme-programi-basvuru-sartlari-destek-oranlari-ve-surec-rehberi/); **doğrulanmadı**) | **Yeni girişimci hibesi** (§3.3): ilk 5 araştırma %75, sonra %60, servet eşiği üstü yok | Oyun ekonomisi para birimli ve kasa sınırlı; oranlar kalibre edilecek |
| **Teknoparklar** (4691 sayılı Kanun) | Üniversite–sanayi işbirliği; 113 bölge (Eylül 2025); bölge içi Ar-Ge kazançlarına gelir/kurumlar vergisi istisnası, Ar-Ge personeli ücretinde gelir vergisi desteği ([Sanayi ve Teknoloji Bakanlığı](https://www.sanayi.gov.tr/assets/pdf/istatistik/TGBIstatistikiBilgiler2025.pdf), [kanun özeti](https://www.nigdeteknopark.com/4691-sayili-teknoloji-gelistirme-bolgeleri-kanunu/)) | **Teknopark** ilçe projesi: üniversite şartı, `teknopark_lab` gider −%25, küme etkisi | Vergi sistemi birebir değil; gider indirimi olarak soyutlanır |
| **Ar-Ge merkezi** (5746 sayılı Kanun) | Asgari tam zaman eşdeğer Ar-Ge personeli şartı (eşik zamanla değişmiş), merkez belgesi, Ar-Ge harcamasına teşvik ([Lexpera](https://www.lexpera.com.tr/mevzuat/kanunlar/arastirma-gelistirme-ve-tasarim-faaliyetlerinin-desteklenmesi-hakkinda-kanun-5746)) | Lab yöntemlerinin **işçi ve ölçek eşiği** (S/M/L, nitelikli işçi payı) | Belge/denetim yok; yalnız eşik fikri |
| **KOSGEB** (Ar-Ge, Ür-Ge ve İnovasyon Destek Programı) | KOBİ ve girişimcilere proje bazlı destek; sektör ve limit sınırları ([KOSGEB](https://webdosya.kosgeb.gov.tr/Content/Upload/Dosya/AR-GE%20UR-GE/2023/2023.08.15/Ar-Ge_%C3%9Cr-Ge_ve_%C4%B0novasyon_Destek_Program%C4%B1.pdf)) | Hibe bütçesinin **ilçe/il kasasından** ve tavanlı olması; küçük işletme önceliği | Kurum adı kullanılmaz |
| **Üniversite–sanayi işbirliği** | Teknoparkın kurucu fikri; ortak laboratuvar | `ortak_lab`, `universite_isbirligi`, K4 kapısı | — |
| **Savunma sanayii ekosistemi** | Ülkenin savunma sanayii otoritesi etrafında ana yüklenici ve **4 binden fazla firmalık alt yüklenici/KOBİ ağı**, yüzlerce proje, çok katmanlı tedarik ve yerlilik hedefi ([Yeni Asır, Eylül 2026](https://www.yeniasir.com.tr/ekonomi/2026/09/18/savunma-sanayii-baskani-gorgun-yerlilik-orani-yuzde-83-seviyesine-ulasti); [Sanayi ve Teknoloji Bakanlığı raporu](https://www.mevka.org.tr/upload/files/archived/savunma-sanayiinde-konya-ekosistemi-raporu.pdf)) | **Savunma sanayii kümesi şartı** (§5.5): ildeki ≥3 bağımsız sahibin zincir yöntemi; Ordugâh = ana yüklenici, çelikhane/elektronik/mühimmat sahipleri = alt yükleniciler | Oyunda ürün/platform adı yoktur; ekosistem yapısı alınır |
| **Teknoloji hazırlık seviyeleri (TRL)** | NASA'nın 1–9 olgunluk ölçeği ([NASA](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/technology-readiness-levels/), [tanımlar](https://esto.nasa.gov/files/trl_definitions.pdf)) | **Kademeler** olgunluğu anlatır (K1 sahada kanıtlı … K4 öncü prototip); "çağ" yerine | Dokuz seviye dörde sadeleşir |
| **Çift kullanımlı teknoloji** | Sivil ve askeri alanın ortak teknoloji tabanı ([Chatham House](https://www.chathamhouse.org/sites/default/files/2026-04/2026-04-28-how-surge-defence-dual-use-investment-could-reconfigure-global-AI-race-bego.pdf), [NAP](https://nap.nationalacademies.org/read/5902/chapter/16)) | `ciftKullanim` etiketi: Özel Çelik, Sensör Modülü, İleri Malzeme, Otomasyon sivil ve askeri zincirin ortak düğümleridir | — |

---

## 4. Sivil teknoloji ağı

### 4.1 Kademeler: çağ yerine olgunluk

Dönem/çağ kapısı yoktur; hiçbir düğüm "zamanı gelmedi" diye kapalı değildir. **Kademe, olgunluğu ve maliyet sınıfını** anlatır (TRL esinli, §3.5):

| Kademe | Ad | Olgunluk | Sivil maliyet (M) | Süre (gün) | Lab kapısı | Örnek |
|---|---|---|---|---|---|---|
| **K1** | Yerleşik | Sahada kanıtlı, temel makine | 14–25 | 2–3 | S (`temel_lab`) | `mekanize_tarim`, `tohum_islahi`, `agir_tasit` |
| **K2** | Yaygın | Sanayi standardı | 18–35 | 2–4 | S | `elektrik_ark_ocagi`, `e_ticaret`, `sera_tarimi` |
| **K3** | Gelişmiş | Pilot ölçek sanayi, dijital | 36–60 | 8–12 | M (`deney_lab`) | `ozel_celik`, `ileri_elektronik`, `akilli_sebeke` |
| **K4** | Öncü | Öncü prototip; ilk keşfeden patent/açık yayın | 90–100 (askeri 88–110) | 16–21 | L (`ortak_lab`, Merkez+, Üniversite) | `otonom_tarla`, `ileri_malzeme`, `liman_otomasyonu` |

### 4.2 Ağ kuralları

| Kural | Değer | Not |
|---|---|---|
| Yapı | **Yönlü, döngüsüz ağ (DAG)**; "ağaç gibi görünür" (katman sütunları, dal etiketleri) | §9 G1 |
| Ön koşul sayısı | ≤2 | Okunurluk |
| Dal içi derinlik | ≤4 (kademe sayısı) | 08'deki derinlik ≤4 kuralı dal içinde korunur |
| Toplam zincir derinliği | ≤6 (çapraz katman bağlarıyla; en uzun: `spektrum_hakimiyeti`) | Betikle doğrulandı (§4.4) |
| Çapraz katman bağı | 61 sivil düğümün 16'sında; askeri donanımın **22/24'ünde** (sivil → askeri) | "Ağ" hissi ve askeri gücün ekonomiden doğması |
| Yön | **Sivil → askeri** ön koşul; askeri → sivil yok (serpinti "sonra": askeri düğüm bitince bağlı sivil düğümün maliyeti ×0,8) | §5.1, §9 G4 |
| Her düğüm | Bir yöntem, yapı varyantı, birlik modeli, emir kartı, karar veya panel açar; **bedeli vardır** | 08 TK1 |
| Dışlayan çiftler | 4: `hassas_tarim` ⊕ `organik_rotasyon`; `temiz_enerji` ⊕ `termik_verim`; doktrin ekseni A (Savunma Derinliği ⊕ Hareketli Harp); eksen B (Lojistik ⊕ İstihbarat) | **"Tek aktif standart"** (§9 G2) |
| Kapsam | O: 77 · İ: 8 (†) · L: 12 | §3.3 |
| Çift kullanım | `otomasyon`, `ozel_celik`, `hassas_imalat` (parça kolu), `ileri_elektronik`, `ileri_malzeme`, `akilli_sebeke` | Sivil ve askeri zincirin ortak köprüleri |

**Dışlayan çiftin mekanizması.** İlk seçilen düğüm **aktif standart** olur. Karşı düğüm kapanmaz ama **çift fiyat** (×2 maliyet, ×1,5 süre) olur; ikincisi açılınca oyuncu aktif standardı değiştirebilir (14 gün geçiş: eski yöntem pasif, yeni yöntem henüz çalışmaz; 28 gün bekleme). Bilgi silinmez; `dal_degistir` (08 TK4'ün v1.5 adayı) bu rapor tarafından **ilk sürüme** çekilir. İl doktrinleri için kurallar §5.2'dedir.

### 4.3 Düğüm listesi

**Sütunlar:** K = kademe; Maliyet **M** = milyon mili-para (1 M = 1 000 para); Gün = tam hızda süre (§3.1); † = ilçe ortak slotunda bağışla araştırılan program (kapsam İ). Mevcut 7 düğümün maliyet ve süresi `icerik.json`'dan alınmıştır; yenilerin değerleri öneridir. Düğüm kimlikleri ASCII ve `icerik.json` kuralına uygundur. Dışlayan çiftler **kalın (⊕)** işaretlidir.

#### Tarım (11 düğüm)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `mekanize_tarim` | Mekanize Tarım | 1 | 15 | 2 | — | Yöntem `mekanize_tarim` (mevcut) | yakıt, parça, elektrik |
| `sulama_sistemi` | Sulama Sistemi | 1 | 20 | 2 | — | Tesis `sulama_kanali`; kuraklık şiddeti azalır (mevcut) | elektrik, işçi |
| `tohum_islahi` | Tohum Islahı | 1 | 14 | 2 | — | Ürün kartı: dayanıklı çeşit (olay duyarlılığı düşük, çıktı biraz düşük) | tohum gideri (hasat başına para) |
| `bitki_besleme` | Bitki Besleme | 2 | 22 | 3 | `tohum_islahi` | Gübre yöntemi `dengeli_gubre` (toprak yorgunluğu daha yavaş) | ek parça ve elektrik; gübre fabrikası şart |
| `zararli_yonetimi` | Zararlı Yönetimi | 2 | 20 | 3 | `tohum_islahi` | Karar `koruma_programi` (hastalık/zararlı olayında hasat kaybı yumuşar) | izleme gideri (hasat başına) |
| `sera_tarimi` | Sera Tarımı | 2 | 28 | 4 | `sulama_sistemi` | Tarla yöntemi `sera` (hasat eğrisi düzleşir, mevsim dışı ürün) | yüksek elektrik ve yakıt; çok işçi |
| `hassas_tarim` | Hassas Tarım | 2 | 28 | 4 | `mekanize_tarim` | Yöntem `hassas_tarim` | elektronik, yakıt; **⊕ `organik_rotasyon`** (karşıtı çift fiyat) |
| `organik_rotasyon` | Organik Rotasyon | 2 | 18 | 3 | — | Yöntem `organik_ciftlik` | düşük çıktı, çok işçi; **⊕ `hassas_tarim`** (karşıtı çift fiyat) |
| `ileri_gida_isleme` | İleri Gıda İşleme | 3 | 40 | 8 | `bitki_besleme`, `soguk_zincir` | Gıda fabrikası yöntemi `paketli_gida` (yüksek değer, uzun ömür) | elektronik ve elektrik; soğuk zincir şart |
| `otonom_tarla` | Otonom Tarla | 4 | 90 | 18 | `hassas_tarim`, `otomasyon` | Tarla yöntemi `otonom_tarim` (neredeyse işçisiz) | çok elektronik ve elektrik; sanayi zincirine bağımlı |
| `ilce_sulama_agi` † | İlçe Sulama Ağı | 2 | 26 | 4 | `sulama_sistemi` | İlçe programı: ortak kanal, ilçedeki tarlalara kuraklık koruması | bağış havuzu; ortak etki |

#### Sanayi (10 düğüm)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `derin_madencilik` | Derin Madencilik | 1 | 25 | 3 | — | Yöntemler `derin_cevher`, `derin_komur` (mevcut) | yakıt, elektrik; hızlı tükenme |
| `elektrik_ark_ocagi` | Elektrik Ark Ocağı | 2 | 30 | 3 | `derin_madencilik` | Yöntem `elektrik_ark` (mevcut) | yüksek elektrik ve yakıt |
| `otomasyon` | Otomasyon | 2 | 35 | 4 | `mekanize_tarim` | Yöntem `otomatik_hat`; ölçek L (mevcut) | elektronik, elektrik; L ölçekte brownout riski |
| `enerji_verimliligi` | Enerji Verimliliği | 2 | 26 | 4 | `otomasyon` | Çelikhane ve parça yöntemlerinin ısı geri kazanımlı varyantı (elektrik girdisi düşer) | ek parça bakımı, daha pahalı kurulum |
| `ozel_celik` | Özel Çelik | 3 | 48 | 9 | `elektrik_ark_ocagi` | Çelikhane yöntemi `alasimli_celik` → mal **Özel Çelik** (zırh çeliği; çift kullanım) | ark ocağı elektriği; bakır/alaşım girdisi |
| `hassas_imalat` | Hassas İmalat | 3 | 52 | 9 | `otomasyon` | Parça yöntemi `hassas_hat`; Mühimmat yöntemi `hassas_muhimmat` → mal **Hassas Mühimmat** (çift kullanım) | elektronik girdisi, nitelikli işçi |
| `ileri_elektronik` | İleri Elektronik | 3 | 55 | 9 | `otomasyon` | Elektronik yöntemi `ileri_hat` → mal **Sensör Modülü** (çift kullanım) | bakır+silis, yüksek elektrik, nitelikli işçi |
| `geri_donusum` | Geri Dönüşüm | 3 | 42 | 8 | `elektrik_ark_ocagi` | Çelikhane yöntemi `hurda_ark` (cevhersiz, düşük kirlilik) | hurda arzı ilçe nüfusuna bağlı |
| `petrokimya` | Petrokimya | 3 | 45 | 9 | `enerji_verimliligi` | Rafineri yöntemi `petrokimya` (çok ürünlü; kimya zinciri) | kirlilik yüksek |
| `ileri_malzeme` | İleri Malzeme | 4 | 100 | 19 | `ozel_celik`, `hassas_imalat` | Parça yöntemi `kompozit_hat` (hafif yapı malzemesi; çift kullanım) | özel çelik + elektronik; çok enerji |

#### Enerji (6 düğüm; Sanayi'nin alt dalı)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `temiz_enerji` | Temiz Enerji | 2 | 30 | 3 | `otomasyon` | Yöntem `ruzgar_gunes`; karar `emisyon_filtresi` | dalgalı elektrik; **⊕ `termik_verim`** (karşıtı çift fiyat) |
| `termik_verim` | Termik Verim | 2 | 25 | 3 | `derin_madencilik` | Yöntem `kombine_cevrim` | emisyon ×1,5; **⊕ `temiz_enerji`** (karşıtı çift fiyat) |
| `jeotermal` | Jeotermal | 2 | 32 | 4 | `derin_madencilik` | Santral yöntemi `jeotermal` (sabit, düşük emisyonlu elektrik) | yalnız `sicak_kaynak` etiketli ilçe; yüksek kurulum |
| `depolamali_hidro` | Depolamalı Hidro | 3 | 55 | 11 | `otomasyon` | Hidro santrali yöntemi `pompaj_depolamali` (elektrik dalgasını yumuşatır) | çelik, parça; `dag` etiketi |
| `batarya_depolama` | Batarya Depolama | 3 | 50 | 9 | `temiz_enerji` | Ambar yöntemi `batarya_ambari` (elektrik sınırlı depolanır) | elektronik, silis; küçük kapasite |
| `akilli_sebeke` † | Akıllı Şebeke | 3 | 58 | 11 | `ileri_elektronik`, `enerji_verimliligi` | İlçe programı: brownout eşiği yükselir, şebeke kaybı azalır | bağış havuzu; ortak etki |

#### Lojistik (9 düğüm)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `agir_tasit` | Ağır Taşıt | 1 | 16 | 2 | — | Garaj yöntemi `agir_tasit_filosu` (filo kapasitesi) | yakıt, bakım |
| `konteyner_limani` | Konteyner Limanı | 2 | 30 | 4 | `otomasyon` | Karar `deniz_kenar_gelistir` (mevcut) | çelik, parça, para |
| `buzkiran_filosu` | Buzkıran Filosu | 2 | 22 | 3 | `konteyner_limani` | Karar `buz_kirma` (buzlu profil tabanı yükselir) | yakıt gideri |
| `soguk_zincir` | Soğuk Zincir | 2 | 20 | 3 | `mekanize_tarim` | Ambar yöntemi `soguk_depo` (bozulma yarıya) | yüksek elektrik |
| `demiryolu_baglantisi` † | Demiryolu Bağlantısı | 3 | 60 | 12 | `agir_tasit`, `konteyner_limani` | İl projesi: raylı bağlantı (kalıcı kenar kapasitesi) | il hazinesi + bağış; uzun inşa |
| `depo_otomasyonu` | Depo Otomasyonu | 3 | 44 | 8 | `otomasyon` | Ambar yöntemi `otomatik_ambar` (depo tavanı, az işçi) | elektronik, elektrik |
| `elektrikli_filo` | Elektrikli Filo | 3 | 50 | 9 | `agir_tasit`, `batarya_depolama` | Garaj yöntemi `elektrikli_filo` (yakıt yerine elektrik) | elektrik talebi; batarya zinciri |
| `liman_otomasyonu` | Liman Otomasyonu | 4 | 95 | 18 | `konteyner_limani`, `depo_otomasyonu` | Liman kenarı: `liman_dolu` eşiği yükselir | çok elektronik; brownout riski |
| `ortak_soguk_depo` † | Ortak Soğuk Depo | 2 | 28 | 4 | `soguk_zincir` | İlçe programı: ilçe ambarlarına ortak soğuk hacim | bağış havuzu; ortak etki |

#### Pazar (9 düğüm)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `tedarik_sozlesmesi` | Tedarik Sözleşmesi | 1 | 18 | 2 | — | Karar `sozlesme_teklif` (sabit vadeli tedarik) | teminat %20 |
| `serbest_liman` | Serbest Liman | 2 | 26 | 3 | `konteyner_limani` | Karar `serbest_liman_ilan` (liman tarife ve ihracat vergisi 0) | tarife geliri kaybı; istikrar − |
| `e_ticaret` | E-Ticaret | 2 | 24 | 3 | `tedarik_sozlesmesi` | Ticaret ofisi yöntemi `cevrimici_satis` (uzak ilçe müşterilerine erişim) | komisyon + kargo gideri |
| `cografi_isaret` | Coğrafi İşaret | 2 | 20 | 3 | `tedarik_sozlesmesi` | Karar `isaret_basvurusu` (menşe etiketli il ürününde prim) | başvuru ücreti; üretim o ilde olmalı |
| `isletme_kredisi` | İşletme Kredisi | 2 | 22 | 3 | `tedarik_sozlesmesi` | Karar `kredi_hatti` (vadeli borç) | faiz; vadede ödenmezse bakım kısılır (iflas yok) |
| `lojistik_yazilimi` | Lojistik Yazılımı | 2 | 28 | 4 | `e_ticaret`, `agir_tasit` | Garaj yöntemi `filo_planlama` (boş dönüş azalır) | abonelik gideri |
| `vadeli_sozlesme` | Vadeli Sözleşme | 3 | 42 | 8 | `isletme_kredisi` | Karar `fiyat_sabitle` (spot dalgasına karşı) | prim; spot düşerse zarar |
| `pazar_analitigi` | Pazar Analitiği | 3 | 40 | 8 | `e_ticaret` | Dikkat paneli: fiyat ve talep tahmini kartı (bilgi açar) | abonelik gideri |
| `ihracat_destegi` | İhracat Desteği | 3 | 46 | 9 | `serbest_liman`, `e_ticaret` | İl kararı `ihracat_harc_iadesi` | il hazinesi gideri |

#### Devlet ve kültür (11 düğüm)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `kamu_egitimi` | Kamu Eğitimi | 1 | 20 | 3 | — | Yasa `egitim` 0–3 (mevcut tasarım) | hazine gideri (nüfusla orantılı) |
| `e_belediye` | E-Belediye | 2 | 18 | 2 | `kamu_egitimi` | Karar: açık defter özeti; il yasası beklemesi 72 → 60 sa | hazine gideri |
| `afet_yonetimi` | Afet Yönetimi | 2 | 22 | 3 | `kamu_egitimi` | Yapı: Afet/itfaiye merkezi; ön duyuru +6 sa | hazine gideri |
| `kamu_ihale_sistemi` | Kamu İhale Sistemi | 2 | 24 | 3 | `e_belediye` | Karar: açık eksiltme (yolsuzluk riski düşer) | kamu alımı yavaşlar |
| `is_guvencesi` | İş Güvencesi | 2 | 22 | 3 | `kamu_egitimi` | Yasa `calisma_duzeni` (istikrar +, işgücü grubu memnun) | işletme gideri artar |
| `turizm_tanitim` | Turizm Tanıtımı | 2 | 18 | 2 | `tedarik_sozlesmesi` | Karar: fuar/şenlik gelir yöntemi | ücret ve işçi gideri |
| `miras_koruma` | Miras Koruma | 2 | 20 | 3 | `kamu_egitimi` | Karar: sit alanı itibar yöntemi | Sanayi grubu memnuniyeti − |
| `imar_planlama` † | İmar Planlama | 3 | 44 | 8 | `e_belediye` | İlçe programı: hazır arsa adalarının yeniden bölünmesi; ortak proje hızı | bağış havuzu; ortak etki |
| `kamu_analitigi` † | Kamu Analitiği | 3 | 40 | 8 | `e_belediye` | İlçe programı: erken uyarı göstergeleri (istikrar eşiği, bütçe) | bağış havuzu; ortak etki |
| `atik_yonetimi` † | Atık Yönetimi | 2 | 24 | 4 | `kamu_egitimi` | İlçe programı: ilçe kirliliği düşer | bağış havuzu; ortak etki |
| `erken_uyari_agi` † | Erken Uyarı Ağı | 2 | 26 | 4 | `afet_yonetimi` | İlçe programı: iklim ve baskın uyarısı +12 sa | bağış havuzu; ortak etki |

#### Bilim (5 düğüm; **kapasite açar, hız vermez**)

| `id` | Ad | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---:|---:|---:|---|---|---|
| `deney_donanimi` | Deney Donanımı | 1 | 16 | 2 | — | Atölye-Lab yöntemi `deney_lab` (K3 düğümlere izin) | elektronik girdisi, elektrik |
| `ar_ge_yonetimi` | Ar-Ge Yönetimi | 2 | 24 | 3 | `deney_donanimi` | İkinci Atölye-Lab yuvası; `konsorsiyum_kur` komutu | yönetim gideri (haftalık) |
| `universite_isbirligi` | Üniversite İşbirliği | 2 | 26 | 4 | `kamu_egitimi`, `deney_donanimi` | Lab yöntemi `ortak_lab` (ilçede Üniversite şartı; K4 düğümlere izin) | ortak lab bakımı; Merkez+ ilçe |
| `fikri_haklar` | Fikri Haklar | 3 | 38 | 8 | `ar_ge_yonetimi` | Karar: `patent_basvurusu` ya da `acik_yayin` | başvuru ücreti; ifşa (yayılım başlar) |
| `teknoloji_transferi` | Teknoloji Transferi | 3 | 36 | 8 | `universite_isbirligi` | Karar: lisans alma/verme; Teknoloji Fuarı'nda gösteri | lisans bedeli ≤ %25 |

**Bilim dalı kuralı.** Bilim düğümleri araştırma *hızını* artırmaz (kendi kendini besleyen kartopu olmaz); yalnız **kapıları** (Lab yöntemi, ikinci yuva, konsorsiyum, patent/açık yayın, lisans) açar. Hız yalnız bütçeden, eğitimden, üniversiteden ve BK'den gelir (§3.1).

### 4.4 Sayılar ve oyun süresine yayılım

**Toplam.** 97 düğüm; toplam maliyet ≈ 4 600 M (4,6 milyon para); mevcut 7 düğüm 195 M'dir. Kademeye göre dağılım:

| Grup | K1 | K2 | K3 | K4 | Toplam | Maliyet (M) | Süre toplamı (gün) |
|---|---:|---:|---:|---:|---:|---:|---:|
| Sivil (7 dal) | 8 | 31 | 19 | 3 | 61 | 2 078 | 345 |
| Askeri donanım | — | 7 | 10 | 7 | 24 | 1 398 | 241 |
| Doktrin (il) | — | 4 | 4 | 4 | 12 | 1 120 | 124 |
| **Toplam** | **8** | **42** | **33** | **14** | **97** | **4 596** | **710** |

Dal başına: Tarım 11, Sanayi 10, Enerji 6, Lojistik 9, Pazar 9, Devlet+Kültür 11, Bilim 5, Askeri donanım 24 (8 dal), Doktrin 12.

**Kâğıt üstü simülasyon** (yöntem: iki yuva; ikinci yuva `ar_ge_yonetimi` sonrası; ön koşul ve dışlama denetimli; K3 için `deney_donanimi`, K4 için ≥45. gün şartı; bütçe karşılama oranı 0,35/0,40/0,45 [0–30/30–90/90+ gün; yarım bütçe = iki kat süre]; yayılım indirimi ort. %10/20/25; ilham ort. ×0,9; en ucuz düğümü seçen "geniş" yol). **Kalibre edilmemiştir;** amaç, tabloyu *dörde bölünmüş bir hedef bantla* sınamaktır.

| Gün | Geniş yol (sivil) | Geniş yol (askeri ağırlıklı) | Hedef bant (oyuncu ve ilçe kapsamlı) | Ağacın payı |
|---|---:|---:|---|---|
| **30** | 8 | 8 | **6–10** | ≈ %8–10 (yalnız K1 ve K2'nin başı) |
| **90** | 29 | 23 | **22–32** | ≈ %30; K2'nin çoğu, K3'ün başı |
| **180** | 47 | 50 | **40–52** | ≈ %50 (oyuncu ve ilçe kapsamlı 85 düğümün); K4 ≈ 0–3 |

**Odaklı yolun varış günleri** (yalnız ön koşul kapanışı araştırılırsa; 2 yuva; aynı varsayımlar):

| Hedef | Gün | Gereken düğüm |
|---|---:|---:|
| `ikmal_konvoyu` (İkmal Birliği) | 16 | 4 |
| `piyade_modernizasyonu` (**Piyade Model II**) | 19 | 4 |
| `topcu_birligi` (Topçu) | 19 | 4 |
| `mekanize_ordu` (Zırhlı Model I) | 30 | 5 |
| `derin_savunma` (doktrin I; ilin bilgi tabanı için; il araştırması +7 gün) | 35 + 7 | 5 |
| `hareket_harbi` (doktrin I) | 43 + 7 | 6 |
| `insansiz_kesif` | 63 | 6 |
| `ileri_piyade_donanimi` (**Piyade Model III**) | 70 | 8 |
| `zirh_koruma` (**Zırhlı Model II**) | 72 | 7 |
| `otonom_tarla` (K4 sivil) | 77 | 6 |
| `liman_otomasyonu` (K4) | 82 | 7 |
| `ileri_malzeme` (K4) | 88 | 9 |
| `silahli_insansiz` (K4) | 97 | 8 |
| `hassas_topcu` (**Topçu Model III**) | 105 | 10 |
| `spektrum_hakimiyeti` (K4) | 113 | 9 |
| `hareket_harbi_3` (doktrin III; il) | 115 + 14 | 12 |
| `ileri_zirhli_platform` (**Zırhlı Model III**) | 129 | 12 |
| `derin_savunma_3` (doktrin III; il) | 130 + 14 | 15 |

**Okuma.** Model II ≈ 2–3. ay, Model III ≈ 4–5. ay, doktrin III ≈ 5. ay sonu. Bir oyuncu **ağacın yarısından fazlasını** 180. günde açamaz; bu, **uzmanlaşmayı ve yayılımı** zorunlu kılar (kimse her şeyi bilmez; komşusundan öğrenir ve lisans alır). 90 günlük "dönem" döngüsünde K3 ve yeni düğümlerin ritmi aşağıdadır.

**Dilime göre içerik tepesi ve karar tükenmesi.**

| Dilim | Düğüm sayısı | Not |
|---|---:|---|
| **Alfa-0** (3 il, davetli) | **13** (mevcut 7 + 6) | `tohum_islahi`, `soguk_zincir`, `agir_tasit`, `deney_donanimi`, `enerji_verimliligi`, `piyade_modernizasyonu` (hepsi içerikle çalışır: Alfa-0'da il yönetişimi ve ticaret sözleşmesi olmadığından karar açan düğümler dışarıda); çekirdek değişmez (§8.3) |
| **Alfa-1** | **50 + 4 doktrin I** = 54 | K1+K2'nin tamamı (46) + köprü K3'ler (`ozel_celik`, `ileri_elektronik`, `zirh_koruma`, `atis_kontrol`) + il doktrinlerinin I. kademeleri |
| **Sonra** | **43** | K3'ün kalanı, K4'ler, doktrin II–III |
| **Dönem başına (≈90 gün)** | **+12** | Karar tükenmesi riski: geniş yol Alfa-1'in 50 düğümünü ≈ **160. günde** tüketir; K3 dilimi **ilk dönemin sonundan önce** hazır olmalı |

**Ölçüm bağı:** TB1, TB2, TB5 (§8.5).

---

## 5. Askeri bilimler ve askeri teknoloji

**İlke ([11 Ek karar](../11-urun-donusu.md)).** Askeri güç beşinci eğlence ayağıdır; ama **ekonomiden doğar**, parsel el değiştirmez, savaş kontrolü kazandırır. Askeri bilim bu yüzden iki şeyi yapar: (a) savaşta *seçim* üretir (doktrin, karışım, destek) ve (b) savaşı *üretim zincirine* bağlar (kim neyi üretebilir, ilde kimle).

### 5.1 Üç katman ve sivil ağa bağ

| Katman | Sahibi | Düğüm | Ne açar | Nasıl araştırılır | Savaşa girişi |
|---|---|---:|---|---|---|
| **Donanım** (8 dal) | Oyuncu (işletme) | 24 | Birlik **modelleri** (I–III), destek birlikleri, savunma yapısı varyantları | `savunma_lab` (aynı ilde Ordugâh şart); ikinci yuva fırsat maliyeti | Birim gücü (`guc` model başına) ve destek çarpanı |
| **Doktrin** (4 × 3) | **İl komutanlığı** (vali + meclis) | 12 | **Emir kartları** ve çarpan tavanları; iki dışlayan eksen | İl Ar-Ge kolu (il hazinesi) + bağış; il bilgi tabanı ön koşulu | Emir kartı seçenekleri, savunan/saldıran çarpanı (≤ +%15) |
| **Destek** (donanımın içinde) | Oyuncu | (24'ün 15'i) | İkmal, istihkam, keşif, EH, hava savunma | Donanımla aynı | Doygun destek çarpanı (≤ +%10), karşılıklı bastırma |

**Neden üç katman?** Donanım *kişisel yatırımdır* (kim kendi Ordugâh'ında ne üretir). Doktrin *kolektif kimliktir* (il nasıl savaşır); bu, "ittifak ve il savaşı" ayağını oyuncular arası koordinasyon problemi yapar ve ortak araştırmanın doğal bir askeri karşılığıdır. Destek, iki katmanın arasındaki **kompozisyon kararıdır**.

**Sivil ağa bağ (askeri gücün ekonomiden doğması).**

| Bağ | Mekanizma | Örnek |
|---|---|---|
| **Teknoloji** | 24 donanım düğümünün 22'sinde sivil ön koşul vardır | Zırhlı Model II ← `ozel_celik` (K3 Sanayi) ← `elektrik_ark_ocagi` |
| **Mal** | Model II/III birimleri Özel Çelik, Sensör Modülü, Hassas Mühimmat ister (§5.5) | Piyade Model III: özel çelik + sensör modülü |
| **Kapasite** | Model III ve doktrin III için **ilde savunma sanayii kümesi** (§5.5) | İlde en az 3 bağımsız sahip aktif zincir yöntemi çalıştırmalı |
| **Para** | Doktrin il hazinesinden finanse edilir; maaş ve ikmal sürekli gider | `birlikMaasiSaat`, ikmal tabloları |
| **İşgücü** | `seferberlik_hukuku`: işgücü −%8, istikrar −150 000 | Askeri güç, sivil üretimden pay alır |
| **Ters yön (serpinti, sonra)** | Askeri düğüm bitince bağlı sivil düğümün maliyeti ×0,8 | `insansiz_kesif` → `otonom_tarla` |

### 5.2 Doktrinler (il komutanlığı)

Doktrin, **yöntem açan bir düğümdür**: yüzde vermez, **emir kartı** açar ve sınırlı bir çarpan tavanı (toplam doktrin etkisi ≤ +%15) tanımlar. Dört doktrin iki eksende dışlayandır.

| Doktrin | Eksen | Yaklaşım | I. kademe | II. kademe | III. kademe | Bedeli | Doğal sahibi (coğrafya) |
|---|---|---|---|---|---|---|---|
| **Savunma Derinliği** | A | Elde tutma, kayıp azaltma | `Mevzi` emir kartı; Müstahkem mevki bonusu | Savunan kayıp oranı düşer (kayıp tavanını aşmadan); yerleşiklik çarpanı | Karşı taarruz kartı | Saldırı emirleri yavaşlar | Dağ, dar geçit, liman (arazi çarpanı yüksek iller) |
| **Hareketli Harp** | A | Hız, manevra, çevreleme | `Manevra` kartı (3. turda tavan ±%25 → ±%35) | Hazırlık süresi alt sınırı −4 sa | `Çevreleme` kartı | İkmal gideri ×1,3 | Ova, ulaşım ağı yoğun iller |
| **Lojistik Üstünlüğü** | B | Uzun savaşta dayanıklılık | İkmal karşılanma tabanı ↑; savaş yorgunluğu 7 → 5 gün | Abluka dayanıklılığı; revir geri dönüşü | Uzun savaş kartı (kayıp yenileme) | İl hazinesi gideri | Sanayi iller; Ordugâh ve ambar yoğun |
| **İstihbarat Üstünlüğü** | B | Bilgi, belirsizliği azaltma | Ön duyuru +6 sa; rakip karışımı görünür; sapma ±%10 → ±%7 | Karşı istihbarat; yanıltma kartı | Hedef önceliği kartı | İl hazinesi gideri | Teknopark/üniversiteli iller |

**Neden bu yapı iyi?** (1) Doktrin *kimliktir* ama **yüzde silah değildir:** istihbarat saldırganın ya da savunanın gücünü artırmaz, **belirsizliği** azaltır (±%10 sapma → ±%7). (2) Dışlayan eksenler 2×2 = **dört il kimliği** üretir (ör. dağlık bir il Savunma Derinliği + İstihbarat; sanayi ili Hareketli Harp + Lojistik). Her biri bir karşıdoktrine karşı güçlüdür, sınırlıdır ve karşı konabilir. (3) HoI4'te büyük doktrinler dışlayıcıdır ama XP'yle açılır; bizde **il Ar-Ge bütçesiyle** açılır, yani **karakter ilerlemesi değil bir yönetişim kararıdır** (seçimle gelen valiye bağlı; Alfa-0'da NPC vali, doktrin yoktur).

**İl doktrininin değiştirilmesi.** Maliyet ×1,5 (il hazinesi), 14 gün geçiş (bonus 0), istikrar −30 000, 28 gün bekleme; **aktif savaş hâlinde (ilan, hazırlık, çarpışma, soğuma) değiştirilemez**; ittifak savaşında doktrin **iline bağlıdır**, ittifak ortak doktrin sahibi olmaz. Bu, "her savaşa göre doktrin değiştirme"yi kapatır, ama il kimliğini ömür boyu kilitlemez (kilitsiz yön ilkesi).

| `id` | Ad | Eksen | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---|---:|---:|---:|---|---|---|
| `derin_savunma` | Savunma Derinliği I | A | 2 | 60 | 7 | `muhendis_birlikleri` | İl doktrini: `Mevzi` emir kartı; Müstahkem mevki bonusu | saldırı emirleri yavaşlar; **⊕ `hareket_harbi`** |
| `derin_savunma_2` | Savunma Derinliği II | A | 3 | 90 | 10 | `derin_savunma`, `tahkimat_muhendisligi` | Savunan kayıp oranı düşer (tavanı aşmadan); yerleşiklik çarpanı | il hazinesi gideri |
| `derin_savunma_3` | Savunma Derinliği III | A | 4 | 130 | 14 | `derin_savunma_2`, `atis_kontrol` | Karşı taarruz emir kartı | il hazinesi gideri; savunma sanayii kümesi şartı |
| `hareket_harbi` | Hareketli Harp I | A | 2 | 60 | 7 | `mekanize_ordu` | İl doktrini: `Manevra` emir kartı (3. turda çarpan tavanı ±%25 → ±%35) | ikmal gideri ×1,3; **⊕ `derin_savunma`** |
| `hareket_harbi_2` | Hareketli Harp II | A | 3 | 90 | 10 | `hareket_harbi`, `ikmal_konvoyu` | Zırhlı/topçu geçiş hızı: hazırlık süresi alt sınırı −4 sa | ikmal gideri |
| `hareket_harbi_3` | Hareketli Harp III | A | 4 | 130 | 14 | `hareket_harbi_2`, `zirh_koruma` | Çevreleme emir kartı | savunma sanayii kümesi şartı |
| `lojistik_ustunlugu` | Lojistik Üstünlüğü I | B | 2 | 60 | 7 | `ikmal_konvoyu` | İl doktrini: ikmal karşılanma tabanı ↑; savaş yorgunluğu kısalır | il hazinesi gideri; **⊕ `istihbarat_ustunlugu`** |
| `lojistik_ustunlugu_2` | Lojistik Üstünlüğü II | B | 3 | 90 | 10 | `lojistik_ustunlugu`, `sahra_revir` | Abluka dayanıklılığı; revir geri dönüşü | il hazinesi gideri |
| `lojistik_ustunlugu_3` | Lojistik Üstünlüğü III | B | 4 | 130 | 14 | `lojistik_ustunlugu_2`, `ileri_ikmal_ussu` | Uzun savaş emir kartı (kayıp yenileme hızı) | savunma sanayii kümesi şartı |
| `istihbarat_ustunlugu` | İstihbarat Üstünlüğü I | B | 2 | 60 | 7 | `e_belediye` | İl doktrini: ön duyuru +6 sa; rakip birlik karışımı görünür; sapma ±%10 → ±%7 | il hazinesi gideri; **⊕ `lojistik_ustunlugu`** |
| `istihbarat_ustunlugu_2` | İstihbarat Üstünlüğü II | B | 3 | 90 | 10 | `istihbarat_ustunlugu`, `sifreli_haberlesme` | Karşı istihbarat; yanıltma emir kartı | il hazinesi gideri |
| `istihbarat_ustunlugu_3` | İstihbarat Üstünlüğü III | B | 4 | 130 | 14 | `istihbarat_ustunlugu_2`, `insansiz_kesif` | Hedef önceliği emir kartı | savunma sanayii kümesi şartı |

### 5.3 Askeri teknoloji dalları (donanım)

Sekiz dal; her dal bir **rol**, bir **karşı** ve bir **sivil kök** taşır. Bu dalların çoğu savaşta *yeni üçgen köşesi* eklemez (üçgen üç türde kalır, çeşitlilik §5.1); destek rolünde çalışır.

| Dal | Rol | Düğümler (K) | Açtığı ana yetenek | Zayıflığı / karşısı | Sivil kök |
|---|---|---|---|---|---|
| **Piyade teçhizatı** | Ucuz omurga, elde tutma | `piyade_modernizasyonu` (K2), `ileri_piyade_donanimi` (K3) | Piyade Model II/III | Zırhlıya karşı zayıf (üçgen) | `derin_madencilik`, `ileri_elektronik` |
| **Topçu** | Menzil; zırhlıya karşı güçlü | `topcu_birligi` (K2), `atis_kontrol` (K3), `hassas_topcu` (K4) | Topçu Alayı Model I–III | Piyadeye karşı zayıf; ağır mühimmat yer | `derin_madencilik`, `ileri_elektronik`, `hassas_imalat` |
| **Zırhlı** | Hızlı, güçlü; yakıt yer | `mekanize_ordu` (K2), `zirh_koruma` (K3), `ileri_zirhli_platform` (K4) | Zırhlı Model I–III | Topçuya karşı zayıf; ikmal ağır | `elektrik_ark_ocagi`, `ozel_celik`, `ileri_malzeme` |
| **Hava savunma** | Hava/insansız tehdidine karşı, ön duyuru | `hava_savunma_mevzii` (K2), `radar_agi` (K3), `entegre_hava_savunma` (K4) | Yapı varyantları; insansız etkisini %50 bastırır | Sabittir (yapıdır); yalnız hava tehdidi olan ilçede anlamlı | `otomasyon`, `ileri_elektronik`, `hassas_imalat` |
| **İnsansız sistemler** | Keşif, ucuz destek, ikmal | `insansiz_kesif` (K3), `insansiz_ikmal` (K3), `silahli_insansiz` (K4) | Keşif Filosu (sapma ±%10 → ±%6), İnsansız Taşıma, İnsansız Destek | Hava savunma ve EH'ye karşı kırılgan; ucuz ama yıpranır | `otomasyon`, `ileri_elektronik`, `agir_tasit` |
| **Elektronik harp (EH)** | Rakibin insansız/radar/istihbarat etkisini bastırır | `sifreli_haberlesme` (K3), `elektronik_karsi_tedbir` (K3), `spektrum_hakimiyeti` (K4) | Karşı istihbarat; EH müfrezesi (bastırma %50 → %75) | Şifreli haberleşmeye karşı etkisi %50 azalır | `ileri_elektronik` |
| **İstihkam** | Tahkimat, onarım, abluka kırma | `muhendis_birlikleri` (K2), `tahkimat_muhendisligi` (K3), `agir_istihkam` (K4) | İstihkam Bölüğü, Müstahkem mevki, kenar kapasitesi onarımı | Saldırı gücü yoktur | `derin_madencilik`, `ozel_celik`, `agir_tasit` |
| **İkmal** | İkmal karşılanmasını korur, kayıp geri döner | `ikmal_konvoyu` (K2), `sahra_revir` (K3), `ileri_ikmal_ussu` (K4) | İkmal Birliği, Revir (%40 → %55), ikmal tabanı | Üçgende savunmasızdır; ilk hedef | `mekanize_tarim`, `afet_yonetimi`, `depo_otomasyonu` |

**Destek üçgeni (ikincil, sade).** İnsansız etkisi Hava Savunma ya da EH ile **%50'ye kadar** bastırılabilir; EH etkisi Şifreli Haberleşme ile **%50** azalır; toplam bastırma ≤%75. Böylece her yetenek bir karşıt aracı olan bir *kompozisyon kararıdır*, tek bir en iyi seçenek yoktur.

| `id` | Ad | Dal | K | Maliyet (M) | Gün | Ön koşul | Açtığı | Bedeli / not |
|---|---|---|---:|---:|---:|---|---|---|
| `seferberlik_hukuku` | Seferberlik Hukuku | Seferberlik | 2 | 24 | 3 | `kamu_egitimi` | İl yasası `seferberlik` (mevcut tasarım) | işgücü −%8, istikrar −150 000 |
| `piyade_modernizasyonu` | Piyade Modernizasyonu | Piyade | 2 | 30 | 3 | `derin_madencilik` | Birlik: **Piyade Model II** | elektronik girdisi; ikmal ×1,1 |
| `ileri_piyade_donanimi` | İleri Piyade Donanımı | Piyade | 3 | 55 | 9 | `piyade_modernizasyonu`, `ileri_elektronik` | Birlik: **Piyade Model III** | özel çelik + sensör modülü; ikmal ×1,25 |
| `topcu_birligi` | Topçu Birliği | Topçu | 2 | 28 | 3 | `derin_madencilik` | Birlik: **Topçu Alayı Model I** (üçgen köşesi) | ağır mühimmat ve parça talebi |
| `atis_kontrol` | Atış Kontrol | Topçu | 3 | 55 | 9 | `topcu_birligi`, `ileri_elektronik` | Birlik: **Topçu Model II** | elektronik, hassas parça |
| `hassas_topcu` | Hassas Topçu | Topçu | 4 | 100 | 19 | `atis_kontrol`, `hassas_imalat` | Birlik: **Topçu Model III** | hassas mühimmat + sensör modülü |
| `mekanize_ordu` | Mekanize Ordu | Zırhlı | 2 | 40 | 5 | `elektrik_ark_ocagi` | Birlik: **Zırhlı Tümen Model I** (mevcut) | yakıt + parça ikmali |
| `zirh_koruma` | Zırh Koruma | Zırhlı | 3 | 62 | 11 | `mekanize_ordu`, `ozel_celik` | Birlik: **Zırhlı Model II** | özel çelik; ikmal ×1,1 |
| `ileri_zirhli_platform` | İleri Zırhlı Platform | Zırhlı | 4 | 110 | 21 | `zirh_koruma`, `ileri_malzeme` | Birlik: **Zırhlı Model III** | özel çelik + kompozit + sensör modülü |
| `hava_savunma_mevzii` | Hava Savunma Mevzii | Hava savunma | 2 | 30 | 3 | `otomasyon` | Yapı: Hava savunma mevzii | elektrik, parça |
| `radar_agi` | Radar Ağı | Hava savunma | 3 | 52 | 9 | `hava_savunma_mevzii`, `ileri_elektronik` | Yapı varyantı: radarlı mevzi (hava tespiti, ön duyuru) | elektronik, elektrik |
| `entegre_hava_savunma` | Entegre Hava Savunma | Hava savunma | 4 | 95 | 18 | `radar_agi`, `hassas_imalat` | Yapı: bölgesel hava savunma ağı (insansız etkisini %50 bastırır) | çok elektronik; hassas parça |
| `insansiz_kesif` | İnsansız Keşif | İnsansız | 3 | 50 | 9 | `otomasyon`, `ileri_elektronik` | Destek birliği: **Keşif Filosu** (kendi sapma aralığı daralır) | elektronik, yakıt; Hava savunmaya karşı kırılgan |
| `insansiz_ikmal` | İnsansız İkmal | İnsansız | 3 | 46 | 9 | `insansiz_kesif`, `agir_tasit` | Destek birliği: **İnsansız Taşıma** (ikmal kaybı azalır) | elektronik, elektrik |
| `silahli_insansiz` | Silahlı İnsansız Sistemler | İnsansız | 4 | 100 | 19 | `insansiz_kesif`, `hassas_imalat` | Destek birliği: **İnsansız Destek** (ucuz, yıpranır) | elektronik; hava savunma/EH'ye karşı kırılgan |
| `sifreli_haberlesme` | Şifreli Haberleşme | Elektronik harp | 3 | 48 | 9 | `ileri_elektronik` | Destek: karşı istihbarat (düşman keşfi ve EH etkisi %50 azalır) | elektronik, elektrik |
| `elektronik_karsi_tedbir` | Elektronik Karşı Tedbir | Elektronik harp | 3 | 52 | 9 | `sifreli_haberlesme` | Destek birliği: **Elektronik Harp Müfrezesi** (düşman insansız/radar etkisini bastırır) | elektronik, elektrik |
| `spektrum_hakimiyeti` | Spektrum Hakimiyeti | Elektronik harp | 4 | 105 | 19 | `elektronik_karsi_tedbir`, `insansiz_kesif` | Destek: EH etkisi tavanı %50 → %75 | çok elektronik; bakım |
| `muhendis_birlikleri` | Mühendis Birlikleri | İstihkam | 2 | 26 | 3 | `derin_madencilik` | Destek birliği: **İstihkam Bölüğü** (mevzi inşa süresi, onarım) | çelik, parça |
| `tahkimat_muhendisligi` | Tahkimat Mühendisliği | İstihkam | 3 | 46 | 8 | `muhendis_birlikleri`, `ozel_celik` | Yapı: **Müstahkem mevki** (Sur 2. kademe); yol/kenar onarımı | özel çelik; haftalık bakım |
| `agir_istihkam` | Ağır İstihkam | İstihkam | 4 | 90 | 16 | `tahkimat_muhendisligi`, `agir_tasit` | Destek: köprü ve kenar kapasitesi onarımı (abluka kırma kolaylaşır) | çok çelik, yakıt |
| `ikmal_konvoyu` | İkmal Konvoyu | İkmal | 2 | 24 | 3 | `mekanize_tarim` | Destek birliği: **İkmal Birliği** (ikmal karşılanmasını korur) | yakıt ve gıda gideri |
| `sahra_revir` | Sahra Revir | İkmal | 3 | 42 | 8 | `ikmal_konvoyu`, `afet_yonetimi` | Kayıpların geri dönüş oranı yükselir (revir %40 → %55) | gıda, parça; afet bağı |
| `ileri_ikmal_ussu` | İleri İkmal Üssü | İkmal | 4 | 88 | 16 | `ikmal_konvoyu`, `depo_otomasyonu` | Destek: ikmal tabanı yükselir, ablukada yumuşar | depo otomasyonu şartı; bakım |

### 5.4 Birlik türlerinin teknolojiyle evrimi

**Mekanizma.** Her model ayrı bir `BirlikTanimi` kaydıdır (`tur`, `model`, `rol`, `yerineGecer`); eski model **silinmez**, ordugâhta kalır; üretim yalnız açılmış modeller için yapılır. **Modernizasyon** (`birlik_modernize`): eski modeli yenisine çevirir; maliyet = yeni modelin satın alma maliyetinin %50'si, parti süresi yarım; sahibinin ordugâhında ve Model II → III sınırında. Güç artışı **azalandır:** M-I → M-II **+%16**, M-II → M-III **+%12** (toplam +%30).

| Tür | Model | Ad (jenerik) | Teknoloji | Güç | Satın alma maliyeti (×) | İkmal (×) | Parti (sa) | Yeni girdi |
|---|---|---|---|---:|---:|---:|---:|---|
| **Piyade** | I | Piyade Tümeni (mevcut) | — | 100 | 1,00 | 1,00 | 12 | çelik, mühimmat, gıda |
| | II | Modern Piyade Tümeni | `piyade_modernizasyonu` | 116 | 1,30 | 1,10 | 14 | + elektronik |
| | III | Birleşik Silah Piyadesi | `ileri_piyade_donanimi` | 130 | 1,80 | 1,25 | 16 | + özel çelik, sensör modülü |
| **Topçu** | I | Topçu Alayı | `topcu_birligi` | 160 | 1,00 | 1,00 | 14 | çelik, mühimmat, parça |
| | II | Atış Kontrollü Topçu | `atis_kontrol` | 186 | 1,30 | 1,15 | 16 | + elektronik |
| | III | Hassas Topçu Alayı | `hassas_topcu` | 208 | 1,85 | 1,35 | 20 | + hassas mühimmat, sensör modülü |
| **Zırhlı** | I | Zırhlı Tümen (mevcut) | `mekanize_ordu` | 260 | 1,00 | 1,00 | 18 | çelik, parça, yakıt |
| | II | Korumalı Zırhlı Tümen | `zirh_koruma` | 302 | 1,30 | 1,10 | 20 | + özel çelik |
| | III | İleri Zırhlı Tümen | `ileri_zirhli_platform` | 338 | 1,80 | 1,25 | 24 | + özel çelik, kompozit, sensör modülü |

*Topçu gücü (160) ve tüm çarpanlar öneridir; HT3/TB4 ile kalibre edilecektir.* **Neden Model III çok daha pahalı?** Satın alma ×1,8 iken güç ×1,3'tür; güç başına maliyet yükselir. Teknoloji, **küçük, kaliteli ordu**yu mümkün kılar: birlik başına maaş ve ikmal *kafa başınadır* (model yalnız ×1,25), yani uzun vadeli sahip olma maliyeti kafaya bağlı olduğundan yüksek model "baş başına güç"ü artırır. Hiçbir model, eşit toplam maliyetle diğerini ezmemelidir (TB4: eşit 30 günlük sahip olma maliyetli ordular arasında kazanma oranı %45–60).

**Destek birlikleri** (güç yok veya çok küçük; etki **doygun**: `etki = tamEtki × min(1, destekGucu / çekirdekGuc / 0,15)`):

| Destek | Teknoloji | Etki (tavanlı) | Karşı | Zayıflığı |
|---|---|---|---|---|
| **İkmal Birliği** | `ikmal_konvoyu` | İkmal karşılanma tabanı +10 puan (ablukada); `sahra_revir` ile kayıp geri dönüşü | — | Üçgende ilk hedef |
| **İstihkam Bölüğü** | `muhendis_birlikleri` | Savunanın yapı bonusu; mevzi inşası | — | Saldırı gücü yok |
| **Keşif Filosu** | `insansiz_kesif` | Kendi güç sapması ±%10 → ±%6; rakibin karışımı görünür | Hava savunma, EH (−%50) | Kırılgan |
| **İnsansız Destek** | `silahli_insansiz` | Ucuz güç eklemesi; kayıp oranı ×2 (harcanabilir) | Hava savunma, EH | Hava savunması olan ilde etkisiz |
| **EH Müfrezesi** | `elektronik_karsi_tedbir` | Rakibin insansız/radar/istihbarat etkisini %50 (spektrum: %75) bastırır | Şifreli haberleşme | Yalnız bastırma |

**Toplam destek etkisi, çarpan olarak ≤ +%10** (§5.6). Böylece destek, *çekirdek kompozisyonu tamamlar, yerine geçmez.*

### 5.5 Savunma sanayii zinciri: askeri gücün ekonomiden doğması

**Dört katmanlı zincir** (gerçek ekosistemden esinli: ana yüklenici, alt yüklenici, KOBİ ağı; §3.5):

```
HAM            TEMEL            ARA ÜRÜN                  İLERİ ÜRÜN               SON ÜRÜN
cevher+kömür → çelik ──┬──► özel çelik (alasimli_celik) ──┬─► kompozit (kompozit_hat)
                       │                                  └─► zırhlı Model II–III
bakır+silis ─► elektronik ─► sensör modülü (ileri_hat) ──┬─► Model III (piyade, topçu, zırhlı)
                                                         └─► insansız, EH, radar
petrol ─► yakıt ──┬─► mühimmat ─► hassas mühimmat (hassas_muhimmat) ─► topçu Model III
çelik ────────────┘
                                                              ORDUGAH (ana yüklenici): birlik modeli
```

| Mal / ürün | Katman | Girdi (öneri, mili-birim) | Yapı ve yöntem | Teknoloji | Birlik kullanımı | Sivil kullanım (çift kullanım) |
|---|---|---|---|---|---|---|
| **Özel Çelik** (yeni mal) | Ara | çelik 40 000, elektrik 30 000, bakır 8 000 → 30 000 | Çelikhane, `alasimli_celik` | `ozel_celik` | Piyade III, Zırhlı II–III, istihkam | Makine bakımı (parça ihtiyacı azalır), İleri Malzeme |
| **Sensör Modülü** (yeni mal) | İleri | elektronik 20 000, silis 15 000, parça 5 000, elektrik 25 000 → 15 000 | Elektronik fabrikası, `ileri_hat` | `ileri_elektronik` | Tüm Model III, insansız, EH, radar | Otonom tarla, depo/liman otomasyonu, akıllı şebeke |
| **Hassas Mühimmat** (yeni mal) | İleri | mühimmat 20 000, elektronik 5 000, yakıt 5 000 → 18 000 | Mühimmat fabrikası, `hassas_muhimmat` | `hassas_imalat` | Topçu III, silahlı insansız | **Yok** (yalnız askeri) |
| **Kompozit** (yöntem ürünü) | İleri | özel çelik 10 000, petrol türevi 8 000, elektrik 20 000 | Parça fabrikası, `kompozit_hat` | `ileri_malzeme` | Zırhlı III | Hafif yapı malzemesi (sivil yapı/lojistik) |
| Mühimmat, çelik, elektronik, yakıt, parça | Temel | mevcut | Mevcut yapılar | mevcut | Tüm modeller | Tüm ekonomi |

**Savunma sanayii kümesi şartı (il).** *Model III üretimi* ve *doktrin III araştırması* için ilde, **en az 3 farklı ve bağımsız sahibin** (aynı ittifaktan en çok 2'si sayılır) aşağıdaki aktif yöntemlerinden **en az 2 farklı türü** son 14 günde çalışıyor olmalıdır: `alasimli_celik`, `ileri_hat`, `hassas_muhimmat`, `kompozit_hat`. Küme bozulursa **mevcut birlikler ve açılmış teknoloji kalır; yalnız yeni Model III üretimi ve doktrin III araştırması bekler.** Bu üç sonucu üretir: (1) **işbölümü:** tek oyuncu her halkayı kendi kuramaz; tedarik sözleşmesi ve lisans doğal ticaret üretir; (2) **ittifak ve il kimliği:** il, kendi savunma tabanını *büyütmeyi* ister (hibe, imar, yatırım); (3) **abluka ve yağma** (tavanlı) bir **hedef seçimi** haline gelir: kümede bir halkayı etkisiz kılmak (≤%10 yapı devre dışı, 24 sa) Model III üretimini geçici durdurur; ama teknolojiyi *silmez*.

**Askeri talep, ekonomiyi canlandırır** (H3): birlik üretimi mühimmat, çelik, özel çelik, elektronik, yakıt çeker; ikmal sürekli talep yaratır. Ters yön: istikrar eşiği %60 savaşın ekonomiyi çökertmesini önler (08 D2/D7).

**"Teknoloji kaybolmaz, üretim kaybolabilir."** Bilgi kalıcıdır (§9 G3). Üretim *kapasitesi*: küme şartı, Özel Çelik arzı, sensör modülü, yapı devre dışı; bunlar geçici ve **ekonomik** kayıplardır.

### 5.6 Savaş çözümüne giriş (çözüm formülünün genişletilmesi)

Çözümün üç yeni terimi: üçgen çarpanı `U` (çeşitlilik §5.1), destek `D`, doktrin `K` ve **göreli teknoloji tavanı**. Hepsi tamsayı ppm ile çalışır ve **tek noktada** (`teknolojiTavaniUygula`, `kayipTavaniUygula` ile aynı örnekte) uygulanır.

```
Gref   = Σ adet_i × guc(model I eşdeğeri_i)       // tüm birlikler Model I sayılsaydı
G      = Σ adet_i × guc_i                          // gerçek model gücü
tauM   = G / Gref                                  // model katsayısı (≥ 1, güç ağırlıklı: karma ordu ortalama alır)
D      = 1 + min(0,10, Σ destekEtkisi_k)           // her destek doygun; toplam ≤ +%10
K      = 1 + min(0,15, doktrinEtkisi)              // doktrin; yalnız tanımlı koşulda (ör. savunma)
T      = tauM × D × K                              // teknoloji toplam katsayısı
T'_A   = min(T_A, 1,5 × T_B)                       // GÖRELİ TAVAN (simetrik)
T'_B   = min(T_B, 1,5 × T_A)
etkinGuc_A = Gref_A × T'_A × U_A × ikmal × arazi × durus × sapma
```

| Terim | Aralık | Not |
|---|---|---|
| `tauM` | 1,00–1,30 | Model I–III güç artışı |
| `D` | 1,00–1,10 | Karşı bastırma (§5.3) uygulanır |
| `K` | 1,00–1,15 | İl doktrini |
| `T` | ≤ 1,30 × 1,10 × 1,15 = 1,64 | **Göreli tavan 1,5:** yalnız iki taraf arasındaki fark tavanlanır |
| `U` (üçgen) | 0,80–1,25 | Teknolojiden bağımsız (kompozisyon) |
| Toplam teorik üst sınır | ≈ ×2,3 | `1,5 × 1,56 (üçgen oranı)`; nadir, zıt kompozisyon + tam teknoloji farkı; nicelikle dengelenir |

**Karşıt kıyas.** Model III, Model I'e karşı en çok ×1,5 etkili olur; Model I ordusu **1,5 kat daha çok birlik** ile eşitler. Servet oranı 1:5 ve yağma/kayıp tavanları da sürdüğü için en kötü senaryoda bile yeni oyuncunun kaybı **tavanlıdır**, kontrol hakkı dışında geri dönülmez sonuç yoktur (§6).

---

## 6. Denge ve adalet

**Hedef.** Teknoloji *seçim ve uzmanlık* üretsin; **ezme** üretmesin. Üç kaldıraç: (1) savaşta **tavan**, (2) her yerde **azalan getiri**, (3) **yetişme** araçları. Dördüncü bir sabit: adalet paketi teknolojiden **bağımsızdır**.

### 6.1 Tavan ve azalan getiri

| # | Mekanizma | Değer | Neden |
|---|---|---|---|
| D1 | **Göreli teknoloji tavanı** | `T_A ≤ 1,5 × T_B` (tek noktada uygulanır) | Model III Model I'i ×1,5'ten fazla ezemez; 1,5 kat sayı eşitler |
| D2 | **Model güç artışı** | +%16, +%12 (toplam +%30) | Azalan getiri; Model II çoğu kazancı verir |
| D3 | **Model maliyet artışı** | Satın alma ×1,3 sonra ×1,8; güç başına maliyet yükselir | Kaliteyi isteyen öder; ezici bir ekonomi yine ezicidir ama sınırlıdır |
| D4 | **Destek tavanı** | Toplam ≤ +%10; doygun; karşılıklı bastırma ≤%75 | Destek tek başına çözüm olmaz |
| D5 | **Doktrin tavanı** | Toplam ≤ +%15; yüzde değil çoğunlukla **bilgi/seçenek** (sapma, ön duyuru, emir kartı) | Doktrin kimliktir, silah değil |
| D6 | **Kademe maliyeti** | K4 ≈ K1'in 5–6 katı, süresi ≈ 8 katı | Fikirler pahalılaşır; K4 ilçe işi |
| D7 | **Hız tavanı** | ≤1,4 | Bütçe hızı sonsuza çıkarmaz |
| D8 | **Emilim tabanı** | 0,5 | Ayarla-unut oyuncu yayılımdan yarım yararlanır |
| D9 | **Lisans** | ≤%25; süre 14–28 gün; kilit yok | Patent tekel olmaz |
| D10 | **Çarpan tabanı** | `yayilimCarpani × ilhamCarpani ≥ 0,35` | Çok indirimli araştırma bedavaya yaklaşmaz |
| D11 | **Büyüklük primi** (Stellaris esinli; **varsayılan kapalı**) | Tesis sayısı eşik üstü her %10 için araştırma maliyeti +%2, ≤+%25 | Kapalı tutulur; kartopu görülürse (TB2) açılır |
| D12 | **Hibe yalnız küçüğe** | Servet eşiğinin üstünde yok | Büyük işletme yalnız kendi parasıyla |

### 6.2 Yetişme (geç katılan ve geride kalan)

| Araç | Etki | Kime |
|---|---|---|
| **Yayılım** (§3.2) | Maliyet ve süre %50'ye kadar (emilimle) | Herkes; yakın komşusu bilenler daha çok |
| **Yeni girişimci hibesi** (§3.3) | İlk 5 araştırma %75, sonra %60 | Küçük ve yeni |
| **Maruz kalma ilhamı** (E2) | Rakibin yüksek modeliyle karşılaşmak o model için ilham | Geride kalan taraf |
| **Lisanslı üretim** (§6.3) | Aynı ittifakta/ilde Model III sahibinin lisansıyla Model II üretimi | Ortak çıkar |
| **Kalkan** (14 gün) + 15–28. gün yağma %50 (çeşitlilik §5.7) | Teknoloji farkı oluşmadan korunma | Yeni |
| **Doktrin I'in erişilebilirliği** | Doktrin I (K2) il için ≈ 42. gün; savaşın başında kimse doktrinsiz olmaz | Küçük iller |

**Yetişme hedefi (TB3):** geç katılan, yerleşik medyanın 30. gündeki düğüm sayısının ≥%60'ına 30 günde ulaşır (08 H6'nın ≥%50/14 gün hedefiyle uyumlu, onu geçmeyecek biçimde).

### 6.3 İttifak içi paylaşım sınırları

| Konu | İttifak içi kural | Sınır / neden |
|---|---|---|
| **Sivil konsorsiyum** | ≤4 üye, K≤3 (§3.3) | Küçük ekip işi; ittifak devleşmez |
| **Askeri donanım lisansı** | Model III sahibi, ittifak/il üyesine **Model II** üretim lisansı verebilir | **Bir kademe geri**; ≤4 lisans; lisans ≥14 gün gecikmeli; bedel ≤ model satın alma maliyetinin %15; süre 28 gün (yenilenebilir); kalkandaki üye bedelsiz |
| **Askeri konsorsiyum** | **Yok** | Savunma sırrı; ittifak teknoloji bloğu tavanı aşmasın |
| **Doktrin** | Paylaşılmaz; **il kimliğidir** | İttifak bir ortak doktrin sahibi olmaz |
| **İttifak savaşında teknoloji** | Karma ordu için `tauM` **güç ağırlıklı ortalama**; göreli tavan ittifak tarafı için toplam T üzerinden | Düşük model, yüksek modelin etkisini seyreltir; sahte "az sayıda Model III ile ortalama şişirme" olmaz |
| **Büyük ittifak tavanı** | Çeşitlilik §5.5: ilk 20 hesap tam, 21–40 ×0,7, 41+ ×0,4; katılım ≤40 | Teknoloji farkı + sayı farkı birleşip ezmesin |
| **Kalkanlı hesap** | Seferde birlik katkısı veremez | Mevcut kural |

### 6.4 Parsel el değiştirmez ilkesine uyum ve adalet sabitleri

**Teknoloji ve parsel.**

- Teknoloji **parsele bağlı değildir**; sahibin işletmesine/iline bağlıdır. Parsel savaşta ve yağmada **zorla** el değiştirmez ([12 §7](../12-yon-taslagi.md)); oyuncular arası **gönüllü** parsel alım satımı serbesttir ve teknolojiyi etkilemez (teknolojinin gönüllü karşılığı lisanstır). Hiçbir teknoloji "fethedilemez".
- **Ganimet teknolojisi yoktur:** yağma yalnız stoktur (≤%25); araştırma ilerlemesi, patent veya lisans ele geçirilemez. (Savaştan doğan öğrenme yalnız **maruz kalma ilhamıdır**, o da kişinin kendi araştırmasıdır.)
- **Kontrol hakkı** kazanan il, hedef ilçede 14 gün seçim/pay/geçiş hakkı alır; **teknoloji ve yöntem erişimi** değişmez.
- **Devre dışı yapı** (≤%10, 24 sa) teknolojiyi silmez; onarımla geri gelir. Radar, mevzi, Müstahkem mevki gibi askeri yapılar **parselde kalır**, yıkılmaz.
- Yapı varyantı sahibin teknolojisinden gelir; parselin el değiştirmemesi, varyantın kaybolmamasıdır.

**Teknolojiden bağımsız adalet sabitleri (invaryant).** Aşağıdakiler, hiçbir düğüm, model, doktrin, destek, olay, lisans veya konsorsiyum tarafından **değiştirilemez**. Çekirdek testi: özellik testinde rastgele teknoloji durumlarıyla savaş çözülür ve tüm değerler denetlenir.

| Sabit | Değer | Kaynak |
|---|---|---|
| Yağma tavanı | ≤%25 stok / pencere (Depo kasasıyla fiilen %15) | `kayipTavaniUygula` |
| Yapı devre dışı | ≤%10, 24 sa, yıkım yok | H5 |
| Parsel kaybı | 0 | Ek karar |
| Soğuma | Aynı ilçeye ≥49 sa; il başına ≤1 ilan/hafta | Mevcut |
| Servet oranı | ≤1:5 | OGame esinli kural |
| Yeni oyuncu kalkanı | 14 gün | [11 §7.7](../11-urun-donusu.md) |
| Hareketsiz hedef | Ödülsüz | [11 §7.8](../11-urun-donusu.md) |
| Savunanın yoğun saat bandı | 4 sa, 08:00–24:00, değişiklik 96 sa | EVE esinli |
| Birlik kayıp oranı | Kaybeden %30, kazanan %10 (tavan yuvarlama) | `savas.ts` |
| Büyük ittifak tavanları | §6.3 | Çeşitlilik §5.5 |

### 6.5 Kötüye kullanım ve önlemler

| Risk | Önlem |
|---|---|
| Tek ittifakın tüm teknolojiyi toplaması | Konsorsiyum ≤4 ve K≤3; askeri konsorsiyum yok; lisans bir kademe geri |
| Lisans/patent ile para aklama | Lisans ≤%25, günlük tavan; kendi hesabına lisans yasak (aynı IP/aygıt: R-Ü11); yeni hesap bedelsiz |
| Yeni hesapla hibe/ilham avcılığı | Kişi başına bir hesap; hibe hesap başına 12 araştırma, kasa tavanı; ilham düğüm başına tek sefer |
| Savaşla teknoloji çalma | Yok (ganimet yalnız stok) |
| Ayarla-unut + yayılım bedavacılığı | Emilim 0,5–1,0; kendi Ar-Ge yoksa yarım indirim |
| İlin doktrini her savaşta değiştirmesi | 28 gün bekleme, 14 gün geçiş, savaşta kilit, maliyet ×1,5 |
| Sahte sahiplerle savunma kümesi şartını sağlamak | ≥3 bağımsız sahip; aynı ittifaktan ≤2 sayılır; son 14 gün aktif; çoklu hesap tespiti |
| Keşif olayı avcılığı | Olumlu bilim olayı ayda ≤2/oyuncu; deterministik PRNG |
| K4'ü tek başına açma | `ortak_lab` Merkez+ ve Üniversite ister; ortak proje ilçe işi |
| Model III yığma ile kazanma | Göreli tavan ×1,5; satın alma ×1,8; maaş ve ikmal kafa başına; küme şartı |

---

## 7. Görünürlük ve kimlik

**İlke.** Teknoloji **dünyada görünür** olmalıdır: oyuncunun kararı ekranda bir rakam değil, ilçede bir yapıdır; bu aynı zamanda **yayılım kanalıdır** (§3.2). Kimlik ise **avantaj vermez**.

### 7.1 Yapı varyantları (sivil; kozmetik)

Varyant **işlevi değiştirmez** (işlev zaten yöntemde); sahibin açtığı düğümler kümesinden istemcide türetilir (sunucu maliyeti yok).

| Düğüm | Yapı | Görünüm (kademe ilerledikçe) | Öncelik |
|---|---|---|---|
| `mekanize_tarim` → `hassas_tarim`/`organik_rotasyon` → `otonom_tarla` | Tarla | Çit ve el emeği → traktör → düzenli şeritler + drone **/** karma sıra + arı kovanı → işçisiz otonom araç | A0 → A1 |
| `sulama_sistemi` → `sera_tarimi` | Tarla/Sulama | Kanal ve pivot kol → cam sera | A0 |
| `derin_madencilik` | Maden | Kule ve vinç | A0 |
| `elektrik_ark_ocagi` → `ozel_celik` | Çelikhane | Ark parıltısı → ikinci renkli sıcak hat | A0 |
| `otomasyon` → `hassas_imalat` → `ileri_elektronik` | Fabrikalar | Robot kol, daha az baca → temiz oda camı | A0 → A1 |
| `temiz_enerji` ⊕ `termik_verim`, `jeotermal` | Santral | Türbin/panel **/** yüksek baca; buhar bacası | A1 |
| `soguk_zincir`, `batarya_depolama`, `depo_otomasyonu` | Ambar | Mavi cephe; batarya konteynerleri; raylı otomatik raf | A0–A1 |
| `agir_tasit` → `elektrikli_filo` | Garaj | Kamyon filosu → şarj istasyonlu elektrikli araç | A1 |
| `konteyner_limani` → `liman_otomasyonu` | Liman | Vinç ve konteyner yığını → otomatik vinç | A1 |
| `deney_donanimi` → `universite_isbirligi` | Atölye-Lab | Tabela ve ışık: S (tek pencere), M (cam cephe), L (kampüs) | A0 |
| Üniversite, Teknopark | İlçe ortak yapı | Kampüs, ortak laboratuvar binası | S (sonra) |
| `turizm_tanitim`, `miras_koruma` | Fuar/Sit adası | Bayraklı fuar alanı; levha ve çit | S |

### 7.2 Araçlar ve sokakta değişen görüntü

- **Araç silueti** teknolojiyi anlatır: ağır taşıt (K1) → elektrikli filo (K3) → liman otomasyonunda otonom taşıyıcı (K4); yürüyüşte sokakta aynı varyant görülür (instancing; ek çizim çağrısı yok).
- **Ritim:** Teknoloji Fuarı günlerinde (E6) fuar merkezinde sergi alanı; yürüyüşte NPC'ler **teknolojiyi konuşur** ("Yeni ark ocağı, kömür gitti" gibi şablon bülten; canlı dünya §8.4 çeşitlilik raporu).
- **İlçe silueti:** İlçe kartında *"İlçe Bilimi"* göstergesi (BK 0–100) ve küçük bir "teknoloji silueti" (en çok açılan dalın rozeti).
- **Gök:** Keşif Filosu olan Ordugâh üzerinde kısa uçuşlar; yalnız kozmetik.

### 7.3 Askeri görünürlük (bilgi ve belirsizlik)

| Öğe | Görünürlük | Not |
|---|---|---|
| **Ordugâh silueti** | Yalnız **model kademesi** (I/II/III park görüntüsü) | Kompozisyon görünmez |
| **Birlik karışımı** | Yalnız **İstihbarat doktrini** (I) sahibine görünür | Bilgi avantajı doktrinin getirisi |
| **İl doktrin amblemi** | Karakol, Muhtarlık ve il tabelasında kozmetik amblem | Doktrin kimliği; avantaj yok |
| **Kontrol hakkı rozeti** | Kazanan ilin rozeti hedef ilçede 14 gün | Çeşitlilik §5.4 |
| **Radar/hava savunma yapısı** | Parselde görünür yapı | Hava tehdidi olan ilçede anlamlı |
| **Gizlilik** | Rakibin model *numarası* ve doktrini ancak savaşta/istihbaratla öğrenilir | "Sisli" ama adil: tavan zaten bellidir |

### 7.4 Ağaç ekranı

- **Tek ekran, katman sütunları** (Tarım, Sanayi, Enerji, Lojistik, Pazar, Devlet, Bilim, Askeri); **çapraz oklar yalnız seçili düğümde** çizilir (97 düğümde okunurluk).
- Düğüm kartı: **açtığı**, **bedeli**, maliyet/süre (yayılım ve ilhamla), ön koşullar, dışlayan, **ilham tetikleyicisi**, "komşunuzda var mı" göstergesi (yayılım ipucu).
- Askeri sekme ayrıdır; il doktrinleri ayrı bir "İl Komutanlığı" kartıdır (§5.2).

### 7.5 Unvan ve kimlik (avantaj vermeden)

Sahip: karakter ilerlemesi yoktur ([12 §2](../12-yon-taslagi.md)). Kimlik **stratejik başarıyı görünür** kılar; **hiçbir oyun avantajı** vermez, rütbe/XP yoktur.

| Kimlik | Nasıl kazanılır | Görünür yeri | Avantaj |
|---|---|---|---|
| **Teknoloji Künyesi** | Dal başına açılan düğüm halkaları (sivil açık; askeri yalnız **en yüksek model** görünür) | Profil, ilçe panosu | Yok |
| **İlk Keşfeden** | Dünyada bir K3/K4 düğümü ilk açan (tek seferlik) | Düğüm kartında ad, ilçede **kitabe** (plaket) | Yok (patent/açık yayın ayrı karar) |
| **Açık Bilim** | Açık yayın seçmek | Profil | Yok |
| **Konsorsiyum Ortağı** | Konsorsiyumu tamamlamak | Profil | Yok |
| **Hayırsever** | İlçe programı bağışı eşiği (programın %2'si) | Plaket | Yok |
| **İl Doktrin Okulu** | İl doktrinini III kademeye çıkarmak | İl tabelası | Yok |

### 7.6 Performans bütçesi

Varyant başına tek mesh + malzeme (stilize, düşük çokgen), **instancing**, ek çizim çağrısı yok; sunucuda yok (kümeden türetilir). Silüet düzeyinde (MapLibre) rozet atlası. Yürüyüş mesafesinde yalnız yakın yapılar tam mesh.

---

## 8. Uygulama

### 8.1 Çekirdek ve veri değişiklikleri

| Dosya | Değişiklik | Dilim | Maliyet |
|---|---|---|---|
| `packages/cekirdek/src/serilestir.ts` | Açılmış teknoloji ve aktif araştırma **id ile** saklanır; sürüm alanı; eski anlık görüntüden **geçiş** (indeks → id) | **Önce** (Alfa-0 içerik büyümeden) | M |
| `packages/veri/src/tipler.ts` | `TeknolojiTanimi`: `katman`, `dal`, `kademe`, `kapsam` (`oyuncu`/`ilce`/`il`), `labYontemi`, `dislayanlar`, `ciftKullanim`, `ilham`. `BirlikTanimi`: `tur`, `model`, `rol` (`cekirdek`/`destek`), `yerineGecer`, `kumeSarti`. `YontemTanimi`: `arastirma {kademeSiniri}`, `nitelikliIsci` | A0 (alan ekleme, S) / A1 | S |
| `packages/veri/icerik/icerik.json` | 97 düğüm; 3 yeni mal (`ozel_celik`, `sensor_modulu`, `hassas_muhimmat`); ≈16 yeni yöntem; **12 yeni birlik kaydı** (Piyade II–III, Topçu I–III, Zırhlı II–III, 5 destek). **Yalnız sona ekle** (indeks kararlılığı) | A0: 13 · A1: 54 · sonra: 43 | **L** (3 parça × M) |
| `packages/veri/icerik/parametreler.json` | `teknoloji.*` ve `askeri.*` yeni alanlar (§8.2) | A1 | S |
| `packages/cekirdek/src/tipler.ts` | `OyuncuDurumu.arastirmalar[]` (2 yuva), `aktifStandart`, `ilhamSayaclari`; `IlDurumu`: `doktrinler`, `arastirma`, `doktrinGecis`; ilçe `bk` (türetilmiş, durumda saklanmaz) | A1 | M |
| `packages/cekirdek/src/teknoloji.ts` | **Bütçe/slot** (08 B6); kademe kapısı (Lab yöntemi); `standart_sec` / `dal_degistir`; ağırlıklı **yakınlık yayılımı + emilim** (`teknolojiYayilimiPpm` genişler); **ilham motoru** (günlük kontrol, eylem sayaçları); keşif olayları (`bilim` PRNG akışı); `ilBilgisi(d, il)` | A1 | **L** |
| `packages/cekirdek/src/askeri/uretim.ts` | Model denetimi (açık model + `kumeSarti`); `birlik_modernize`; savunma kümesi sayımı | A1 | M |
| `packages/cekirdek/src/askeri/savas.ts` | `hamGuc` → `tarafGucu` (tür, model, destek); üçgen çarpan `U`; `D`, `K`; **`teknolojiTavaniUygula`** (tek nokta); emir kartları | A1 | M–L |
| `packages/cekirdek/src/ozet.ts` | `durumOzeti`'ne yeni alanlar (anlık görüntü eşitliği) | A1 | S |
| `packages/cekirdek/src/lojistik/` | İkmal tablosu zaten model başına (`birlikler`); yeni birlikler otomatik katılır | A1 | S |
| `packages/botlar`, `packages/olcum` | Önayarlar ve TB1–TB9 | A1 | M |
| `packages/istemci` | Ağaç ekranı, düğüm kartı, İlçe Bilimi kartı, varyantlar, Künye | A1 → sonra | M–L |

### 8.2 Şema örnekleri (içerik ve parametre)

```jsonc
// TeknolojiTanimi: mevcut alanlar DEĞİŞMEZ; yeni alanlar isteğe bağlıdır (varsayılanlar eski davranışı verir)
{
  "id": "zirh_koruma", "ad": "Zırh Koruma",
  "aciklama": "Korumalı Zırhlı Tümen (Model II) üretimini açar; özel çelik ister.",
  "maliyet": 62000000, "sureGun": 11, "onKosullar": ["mekanize_ordu", "ozel_celik"],
  "katman": "askeri", "dal": "zirhli", "kademe": 3, "kapsam": "oyuncu",
  "labYontemi": "savunma_lab", "dislayanlar": [], "ciftKullanim": false,
  "ilham": { "tur": "maruz_kalma", "birlik": "zirhli_tumen_m2", "esik": 1 },
  "acar": {}                                  // birlikler: birlik tanımındaki gerekliTeknoloji ile (çift yönlü doğrulanır)
}

// BirlikTanimi (yeni alanlar)
{
  "id": "zirhli_tumen_m2", "ad": "Korumalı Zırhlı Tümen",
  "tur": "zirhli", "model": 2, "rol": "cekirdek", "yerineGecer": "zirhli_tumen",
  "maliyet": { "celik": 80000, "parca": 30000, "yakit": 20000, "ozel_celik": 25000 },
  "partiSuresiSaat": 20, "guc": 302,
  "ikmal": { "yakit": 3000, "muhimmat": 1300, "parca": 550 },
  "gerekliTeknoloji": "zirh_koruma", "kumeSarti": false
}

// Doktrin düğümü (il kapsamlı)
{
  "id": "derin_savunma", "kapsam": "il", "katman": "doktrin", "dal": "savunma_derinligi", "kademe": 2,
  "maliyet": 60000000, "sureGun": 7, "onKosullar": ["muhendis_birlikleri"], "dislayanlar": ["hareket_harbi"],
  "acar": { "kararlar": ["emir_mevzi"] }
}
```

```jsonc
// parametreler.json (öneri; hepsi ppm)
"teknoloji": {
  "yayilimIndirimiPpm": 500000,
  "yakinlikAgirlikPpm": { "ayniIlce": 2000000, "komsuIlce": 1500000, "ayniIl": 1250000, "diger": 1000000 },
  "anlasmaAgirlikPpm": 1500000, "emilimTabaniPpm": 500000, "indirimTavaniPpm": 600000,
  "carpanTabaniPpm": 350000, "ilhamCarpaniPpm": 700000, "azamiAktifArastirma": 2,
  "konsorsiyum": { "azamiUye": 4, "ekMaliyetPpm": 300000, "sureIndirimiPpm": 50000, "enAzPayPpm": 150000 },
  "hibe": { "ilkBesPpm": 750000, "sonrasiPpm": 600000, "omurBoyuAdet": 12, "servetEsigiCarpani": 3 },
  "kumeEtkisi": { "komsuLabPpm": 30000, "tavanPpm": 90000, "teknoparkTavanPpm": 150000 }
},
"askeri": {
  "teknolojiOraniTavaniPpm": 1500000, "destekTavaniPpm": 100000, "doktrinTavaniPpm": 150000,
  "destekDoygunlukPpm": 150000, "bastirmaTavaniPpm": 750000,
  "kume": { "enAzSahip": 3, "ayniIttifaktanEn": 2, "enAzYontemTuru": 2, "pencereGun": 14 },
  "doktrinDegisim": { "maliyetCarpaniPpm": 1500000, "gecisGun": 14, "beklemeGun": 28, "istikrarPpm": -30000 }
}
```

### 8.3 Dilimler

| Dilim | İçerik | Çekirdek | Maliyet |
|---|---|---|---|
| **Önkoşul** (kod öncesi) | id tabanlı serileştirme ve geçiş testi; yalnız-ekle içerik kuralı; `TeknolojiTanimi`/`BirlikTanimi` alan eklemeleri | Serileştirici, tip | **M** |
| **Alfa-0** (3 il, davetli; NPC baskını) | **13 düğüm:** mevcut 7 + `tohum_islahi`, `soguk_zincir`, `agir_tasit`, `deney_donanimi`, `enerji_verimliligi`, `piyade_modernizasyonu`. Atölye-Lab ve `temel_lab`/`deney_lab` yöntemleri. **Piyade Model II** (`piyade_tumeni_m2`, ayrı birlik kaydı: **çekirdek değişmez**; savaşta `guc` farkı yeter). Mevcut tek yuva, peşin maliyet, mevcut yayılım. **Topçu ve Zırhlı II eklenmez** (üçgen yoksa ölü seçim olur) | Yok (isteğe bağlı kademe kapısı: S) | **S–M** (içerik) |
| **Alfa-1** (il kontrol savaşı, ittifak, ilçe/il yönetişimi) | **54 düğüm:** K1–K2'nin tamamı (46), köprü K3'ler (`ozel_celik`, `ileri_elektronik`, `zirh_koruma`, `atis_kontrol`), doktrin I (4). TK2 bütçe/slot, dışlayan/`standart_sec`, BK ve emilim, yakınlık yayılımı, ilham, E3–E5, hibe, birlik modelleri + üçgen + destek + göreli tavan, küme şartı, doktrin durumu | `teknoloji.ts`, `askeri/`, `tipler.ts` | **L** (4–6 hafta; 08 B6 dahil) |
| **Sonra** | K3'ün kalanı ve K4'ler (43), doktrin II–III; konsorsiyum, patent/lisans/açık yayın, Üniversite ve Teknopark ortak projeleri, lisanslı üretim, serpinti, büyüklük primi, ağaç ekranı cilası | Ortak proje, sunucu | **L** (3+ parça) |
| **Dönem başına** | +12 düğüm (yeni dal/çatışma/olay çıktısı) | İçerik | S–M |

**Bağımlılık sırası.** Serileştirme → şema alanları → Alfa-0 içeriği → (il yönetişimi ve il savaşı akışı gelince) Alfa-1 çekirdeği → doktrin → sonra. **Doktrin il yönetişimi olmadan yazılmaz** (vali ve il hazinesi gerekir).

### 8.4 Maliyet özeti

| Etiket | Adet | 8.1 tablosundaki satırlar |
|---|---:|---|
| **S** | 4 | Veri tipleri (alan ekleme), `parametreler.json`, `ozet.ts`, lojistik ikmal tablosu |
| **M** | 4 | Serileştirme geçişi, `tipler.ts`, `askeri/uretim.ts`, botlar ve ölçüm |
| **M–L** | 2 | `askeri/savas.ts`, istemci (ağaç ekranı, varyantlar, Künye) |
| **L** | 2 | `icerik.json` (97 düğüm, parça parça), `teknoloji.ts` yeniden yapılışı |

**Dilim toplamı:** Önkoşul **M** · Alfa-0 **S–M** (yalnız içerik) · Alfa-1 **L** (4–6 hafta; 08 B6 dahil) · Sonra **L** (3+ parça; konsorsiyum, patent, üniversite). Dönem başına içerik **S–M**.

### 8.5 Ölçüm hipotezleri

Yeni hipotezler **TB1–TB9** (08'in H1–H9'una ek; "Teknoloji-Bilim"). Her biri bot koşusuyla ölçülür (50 ve 1k bot; 180 gün).

| # | Hipotez | Gösterge | Eşik |
|---|---|---|---|
| **TB1** | **Çeşitlilik:** düğüm seçimi tek bir en iyi yola çökmez | 60. günde iki rastgele bot arasında düğüm kümesi Jaccard benzerliği; düğüm başına seçilme oranı | Jaccard ≤ 0,6; hiçbir düğüm >%85, ≤%5 olmasın (ölü uç yok); her dışlayan çiftte iki taraf da ≥%25 |
| **TB2** | **Kartopu yok:** öncü, yetişenden hızlı uzaklaşmaz | 90. gün lider/medyan düğüm oranı; büyüklük primi açılmadan | ≤ 1,6; aşılırsa D11 açılır |
| **TB3** | **Yetişme:** geç katılan yetişir | 30. gün yerleşik medyanın düğüm sayısına oranı | ≥ %60 (08 H6 ≥%50/14 gün ile birlikte) |
| **TB4** | **Model paritesi:** eşit toplam maliyette modeller birbirini ezmez | Eşit 30 günlük sahip olma maliyetli Model I ve III orduları arası kazanma oranı | %45–60 (aksi hâlde güç/maliyet ayarı) |
| **TB5** | **Karar tükenmesi yok:** 180. günde açılabilir ve değerli düğüm var | Aktif oyuncuda bekleyen düğüm sayısı; araştırma duraklaması oranı | ≥3 düğüm; duraklama ≤%15 (08 H7 ile) |
| **TB6** | **Ar-Ge yoğunluğu** sağlıklı | Ar-Ge harcaması / brüt gelir medyanı | %8–15; ayarla-unut oranı <%20 |
| **TB7** | **Dışlama anlamlı:** ne kilit ne anlamsız | Aktif standart değiştirme oranı (oyuncu başına, 180 gün) | %5–25 (0 = anlamsız kilit; >40 = anlamsız karar) |
| **TB8** | **Yayılım gecikmesi:** lider-takipçi aralığı makul | Düğüm başına ilk açan ile medyan açan arası gün | 10–25 gün |
| **TB9** | **Askeri-ekonomi bağı:** zincir ilde gerçekten çalışır | Model III üreten ilde ≥3 sahip; yuvaların %20'si ordugâha kayınca fiyat/arz değişimi (08 H3) | Küme ≥3 sahip; fiyat değişimi ≥%10 |

**Yeni bot önayarları:** `bilim_odakli` (yüksek bütçe payı), `askeri_yonelimli` (`savunma_lab`, Model III hedefi), `lisansci` (lisans alır, kendi araştırmaz), `acik_bilim` (açık yayın seçer), `arastirma_yok` (referans); mevcut `teknoloji_ikilisi` korunur.

### 8.6 Kabul ölçütleri

1. **Eşdeğerlik:** `arastirma_butcesi = sınırsız` ve tek slot, eski `arastir` sonuçlarıyla aynıdır (08 B6 regresyonu).
2. **Serileştirme:** 20 rastgele noktadan eski anlık görüntü yeni biçime yüklenir; `durumOzeti` eşit.
3. **Adalet invaryantı:** özellik testinde rastgele teknoloji, model, doktrin, destek durumlarıyla savaş çözülür; yağma ≤%25, yapı ≤%10, parsel 0, kayıp oranları sabit kalır (§6.4).
4. **Göreli tavan:** hiçbir durumda `T'_A / T'_B > 1,5`.
5. **Ölü düğüm yok:** her düğüm ≥1 bot önayarında seçilir (TB1).
6. **Determinizm:** ilham ve keşif olayları aynı tohumla aynı sonucu verir.
7. **Performans:** savaş çözümü ve araştırma tiki ×1,05'in altında (08 B6'nın ×1,1 sınırından sıkı).

---

## 9. Geri dönüşü zor kararlar

**Sıralama ölçütü.** Geri dönüş maliyeti: *Yüksek* = veri biçimi/oyuncu davranışı/kayıt değişir; *Orta* = içerik ve dengeyle düzeltilir; *Düşük* = parametre.

| # | Karar | Seçenekler | **Önerim** | Neden geri dönmesi zor | Maliyet |
|---|---|---|---|---|---|
| **G1** | **Ağaç mı ağ mı?** | (a) Sığ ağaç (dal içi, çapraz yok) · (b) **Yönlü ağ (DAG):** düğüm başına ≤2 ön koşul, çapraz katman bağları · (c) Çok ön koşullu serbest ağ | **(b) DAG, derinlik ≤4 dal içi / ≤6 toplam, okunurluk için katman sütunları** | Ağ, askeri gücün ekonomiden doğmasını (22/24 çapraz bağ) ve Capital Rift'teki ağ hissini sağlar. Sonradan "ağaca" dönmek çapraz bağları kırar ve oyuncu yollarını geçersiz kılar | Yüksek |
| **G2** | **Dışlayan dallar** | (a) Kalıcı kilit (08 v1) · (b) **Tek aktif standart:** karşıtı çift fiyat, 14 gün geçiş, 28 gün bekleme · (c) Dışlama yok | **(b)** Bilgi silinmez; il doktrininde ×1,5, savaşta kilit | [12 §3] kilitsiz yön ilkesiyle (a) çelişir; (c) kimliği yok eder. İlk sürümde kalıcı kilit sonradan açılırsa pişmanlık ve sıfırlama talebi doğurur | Yüksek |
| **G3** | **Teknoloji kaybı** | (a) Kayıp yok · (b) Kullanılmazsa unutulur · (c) Savaşta kayıp/çalma | **(a) Bilgi kaybolmaz.** Kaybolabilen: üretim kapasitesi (küme şartı, zincir), yapı (≤%10 devre dışı), birlik. (Henrich'in nüfus-bilgi etkisi modellenmez) | (b)/(c) hareketsiz oyuncuyu cezalandırır, savaşı teknoloji yıkımına çevirir, adalet paketiyle ve parsel ilkesiyle çelişir | Yüksek |
| **G4** | **Askeri teknoloji sivil ağaçtan ayrı mı?** | (a) Tamamen ayrı ağaç/motor · (b) Tek ağaç, ayrım yok · (c) **Aynı şema/motor/yayılım, ayrı slot ve ekran; tek yönlü sivil → askeri ön koşul** | **(c)** `savunma_lab` ayrı yuva (kilit değil fırsat maliyeti); askeri → sivil serpinti sonra | (a) ekonomiden doğan gücü keser, iki motor demektir; (b) askeri yönelimi görünmez yapar. Sonradan ayırmak/birleştirmek `TeknolojiTanimi` ve ekranı değiştirir | Orta–Yüksek |
| **G5** | **Sahiplik kapsamı** | (a) Her şey oyuncunun · (b) Her şey ilin · (c) **Üç kapsam:** oyuncu (donanım ve sivil), ilçe (program), il (doktrin) | **(c)** İl bilgi tabanı = üyelerin birleşimi | Kapsam, durum şemasına (IlDurumu, ilçe slotu) ve bağış mekaniğine yazılır; sonradan değişmesi anlık görüntü ve oyuncu beklentisi demek | Yüksek |
| **G6** | **Teknolojinin savaşa girişi** | (a) Oyuncuya yüzde çarpan · (b) **Birlik modeli + destek + doktrin, göreli ×1,5 tavan** · (c) Teknoloji savaşta etkisiz | **(b)** Çarpan içerik tanımında (birlik kaydı), tavan tek noktada | (a) içerik ve ölçeklemeyi bozar ve tavan koymayı zorlaştırır; modeli sonradan çarpana çevirmek kayıtlı birlik durumunu geçersiz kılar | Yüksek |
| **G7** | **Araştırma para birimi** | (a) **Yalnız para + zaman + yuva** · (b) Ayrı bilim puanı (BP) ekonomisi · (c) Karakter beceri puanı | **(a).** BK bir *gösterge*dir, harcanan para birimi değil | Puan ekonomisi (b) ikinci bir kıtlık ve "puan hissi" (karakter ilerlemesi hissi) getirir; sonradan eklemek tüm denge ve arayüzü değiştirir | Yüksek |
| **G8** | **Kimlik ve serileştirme** | (a) İndeks (bugün) · (b) **id ile saklama, yalnız-ekle içerik** | **(b) şimdi:** 97 düğüm, 12 birlik, eklemeler indeksleri kaydırır | 100+ düğümden sonra geçiş riski artar; yayında oyuncu verisi bozulur | **Çok yüksek (ertelenirse)** |
| **G9** | **Sonsuz araştırma ve kademe** | (a) Tekrarlanabilir araştırma · (b) **Dönem başına +12 düğüm, çağ yok, 4 kademe** | **(b)** Kademe olgunluktur, çağ kapısı yok | (a) kartopu ve "hedefsiz lavabo" olur (Stellaris dersi); çağ kapısı sonradan konursa mevcut yolları keser | Orta |
| **G10** | **Öncü düğüm ilçe işi mi?** | (a) K4 bireysel · (b) **K4 yalnız `ortak_lab` (Merkez+, Üniversite)** | **(b)** (açık nokta Ö2: Merkez eşiği) | Bireysel K4 sonradan ilçe işine çevrilirse oyuncuların yatırımı boşa gider; tersi (kapı açmak) kolaydır, bu yüzden **önce sıkı** başla | Orta–Yüksek |

**Karar sırası (kod öncesi):** G8 (serileştirme) → G5, G6, G7 (veri ve savaş şeması) → G1, G2, G4 (ağ yapısı) → G3, G9, G10 (içerik ve denge; ayarlanabilir). **Önerim: G8'i, ilk 13 düğümlük Alfa-0 içeriği yazılmadan önce kapatın.**

---

## 10. Lider/sahip kararı gereken açık noktalar

| # | Konu | Önerilen varsayılan | Karar |
|---|---|---|---|
| Ö1 | Atölye-Lab Köy'de de kurulabilsin mi? ([11 §7.4](../11-urun-donusu.md) Lab'ı Kasaba'da açıyor; [başlangıç belgesi](baslangic-ve-ustalik.md) "gün 5–7 ilk teknoloji" diyor) | Köy'de **S ölçek** (`temel_lab`, K≤2); Kasaba M, Merkez L | Lider |
| Ö2 | K4 için Merkez+ ilçe + Üniversite çok mu sert? (Merkez eşiği [11 Ü6](../11-urun-donusu.md) açık) | Sıkı başla (G10); ölçüme göre gevşet | Sahip/Lider |
| Ö3 | `topcu_doktrini` adı `topcu_birligi` olsun (doktrin artık il kapsamı demek) | Evet | Lider |
| Ö4 | Üç yeni mal (Özel Çelik, Sensör Modülü, Hassas Mühimmat): mal sayısı ve Alfa-0 35 mal sınırı ([çeşitlilik-üretim](cesitlilik-uretim-katmanlari.md)) | Alfa-1'de ekle; Alfa-0'a girmez | Lider |
| Ö5 | Alfa-0'da il yönetişimi yok (NPC vali): doktrin ve il araştırması Alfa-1 geçidine bağlı | Evet | Lider |
| Ö6 | `sicak_kaynak` etiketi (jeotermal) veri hattında üretilecek mi? | Alfa-1; veri ajanı değerlendirir | Veri |
| Ö7 | Hibe oranları (%75/%60) ve servet eşiği (ilçe medyanı ×3) | Öneri; TB3 ile kalibre | Ölçüm |
| Ö8 | `isletme_kredisi` ve `vadeli_sozlesme` ekonomi sistemleri gerektirir (borç, faiz) | "Sonra"; Pazar ekibiyle birlikte | Lider |
| Ö9 | Atölye-Lab yöntemleri 18 yapı kuralına dokunmaz (yöntem olarak) | Evet | Lider |
| Ö10 | Teknoloji Fuarı ve Akademik dönem takvim tarihleri (iklim takvimi/dönem) | Öneri: ilkbahar ve sonbahar fuarı; Haziran mezuniyeti | Lider |
| Ö11 | Model gücü ve maliyet çarpanları (116/130, ×1,3/×1,8) | Öneri; TB4 ile kalibre | Ölçüm |
| Ö12 | Gerçek kurum adları (TÜBİTAK, KOSGEB) oyunda anılsın mı? | **Hayır:** jenerik adlar; yalnız bu belgede esin kaynağı | Sahip |

---

## 11. Kaynaklar

Tümü 1 Ekim 2026'da erişildi. **(arama özeti)**: sayfa doğrudan okunamadı (403/402/429 veya yüklenemedi), bilgi arama sonucunun özetinden alındı. **(doğrulanmadı)**: oran/rakam güncel resmî metinle doğrulanmadı.

**Oyun sistemleri**
- Civilization VI: [Boost](https://civilization.fandom.com/wiki/Boost_(Civ6)) (eureka/ilham %40 maliyet; arama özeti), [Civilopedia: Eureka Moments](https://www.civilopedia.net/en-US/gathering-storm/concepts/science_3/).
- Hearts of Iron IV: [EIP Gaming: Research](https://eip.gg/hoi4/guides/research/) (yuvalar, zamanından önce cezası +%200/yıl, doktrinler artık XP ile), [Land doctrine](https://hoi4.paradoxwikis.com/Land_doctrine) (arama özeti).
- Victoria 3: [Technology](https://vic3.paradoxwikis.com/Technology) (yayılım okuryazarlığa bağlı, üniversite; arama özeti), [Innovation and Tech Penalties primer](https://steamcommunity.com/sharedfiles/filedetails/?id=2883839339) (zamanından önce cezası %; **doğrulanmadı**, arama özeti).
- Stellaris: [Technology](https://stellaris.fandom.com/wiki/Technology), [Defines](https://stellaris.paradoxwikis.com/Defines) (imparatorluk büyüklüğü başına +%0,1 teknoloji maliyeti; arama özeti).
- Foxhole: [Technology (fandom)](https://foxhole.fandom.com/wiki/Technology) (arama özeti; ortak katkı, rakip teknolojilerin paralel ilerlemesi), [Technology Center (eski sistem; 0.26'da kaldırıldı)](https://foxhole.wiki.gg/wiki/Technology_Center), [World Conquest](https://foxhole.wiki.gg/wiki/World_Conquest) ve [Steam tartışması](https://steamcommunity.com/app/505460/discussions/0/744883149453926179/) (savaş başına sıfırlama, savaş süreleri; arama özeti).
- Factorio: [Research](https://wiki.factorio.com/Research).
- Anno 1800: [Research Institute](https://anno1800.fandom.com/wiki/Research_Institute), [Anno Union devblog: Scholars and Research](https://www.anno-union.com/devblog-scholars-and-research/).
- EVE Online: [Invention (EVE University)](https://wiki.eveuniversity.org/Invention), [Invention (EVE Support)](https://support.eveonline.com/hc/en-us/articles/203210642-Invention).

**Gerçek kurumlar ve mevzuat (esin; kopya değil)**
- TÜBİTAK 1501: [Program metni](https://tubitak.gov.tr/sites/default/files/1501.pdf); oranlar için özet: [NeoGrant](https://www.neogrant.com.tr/hizmetler/tubitak/tubitak-1501-sanayi-ar-ge-projeleri-destekleme-programi-basvuru-sartlari-destek-oranlari-ve-surec-rehberi/) (ilk 5 proje %75, sonrası %60, yalnız KOBİ; **doğrulanmadı**).
- KOSGEB: [Ar-Ge, Ür-Ge ve İnovasyon Destek Programı](https://webdosya.kosgeb.gov.tr/Content/Upload/Dosya/AR-GE%20UR-GE/2023/2023.08.15/Ar-Ge_%C3%9Cr-Ge_ve_%C4%B0novasyon_Destek_Program%C4%B1.pdf).
- Teknoparklar: [Teknoloji Geliştirme Bölgeleri istatistikleri, Eylül 2025](https://www.sanayi.gov.tr/assets/pdf/istatistik/TGBIstatistikiBilgiler2025.pdf) (113 bölge; arama özeti), [4691 sayılı Kanun özeti](https://www.nigdeteknopark.com/4691-sayili-teknoloji-gelistirme-bolgeleri-kanunu/) (arama özeti), [Antalya OSB Teknopark: mevzuat ve destekler](https://www.antalyaosbteknopark.com/tr/olanaklar/mevzuat-tesvik-ve-destekler/23).
- Ar-Ge merkezleri: [5746 sayılı Kanun](https://www.lexpera.com.tr/mevzuat/kanunlar/arastirma-gelistirme-ve-tasarim-faaliyetlerinin-desteklenmesi-hakkinda-kanun-5746) ve [Ar-Ge/Tasarım merkezi kriterleri özeti](https://ofisus.com/destek-ve-tesvikler/ar-ge-tasarim-merkezi-nedir-avantajlari-ve-basvuru-sartlari-5746-sayili-kanun/) (asgari personel eşiği zamanla değişmiş; **doğrulanmadı**).
- Savunma sanayii ekosistemi: [Yeni Asır, 18 Eylül 2026](https://www.yeniasir.com.tr/ekonomi/2026/09/18/savunma-sanayii-baskani-gorgun-yerlilik-orani-yuzde-83-seviyesine-ulasti) (ekosistem: 4 binden fazla firma, ≈1 500 proje, 135 bin doğrudan istihdam; yalnız yapı bilgisi kullanıldı, ürün adları kullanılmadı), [Sanayi ve Teknoloji Bakanlığı: Savunma sanayiinde ekosistem raporu](https://www.mevka.org.tr/upload/files/archived/savunma-sanayiinde-konya-ekosistemi-raporu.pdf) (arama özeti).
- NASA TRL: [Technology Readiness Levels](https://www.nasa.gov/directorates/somd/space-communications-navigation-program/technology-readiness-levels/), [TRL tanımları](https://esto.nasa.gov/files/trl_definitions.pdf).

**Akademik ve kavramsal**
- Cohen ve Levinthal (1990), emilim kapasitesi: [Wikipedia özeti](https://en.wikipedia.org/wiki/Absorptive_capacity), [makale](https://josephmahoney.web.illinois.edu/BA545_Fall%202022/Cohen%20and%20Levinthal%20(1990).pdf).
- Bloom, Jones, Van Reenen, Webb (2020), [Are Ideas Getting Harder to Find?](https://www.aeaweb.org/articles?id=10.1257%2Faer.20180338), AER.
- Horowitz (2010), [The Diffusion of Military Power](https://www.andrewerickson.com/2011/06/michael-c-horowitz-the-diffusion-of-military-power-causes-and-consequences-for-international-politics/), [H-Diplo yuvarlak masa](https://issforum.org/roundtables/3-10-the-diffusion-of-military-power) (mali yoğunluk ve örgütsel sermaye).
- Lanchester yasaları: [Wikipedia](https://en.wikipedia.org/wiki/Lanchester%27s_laws) (doğrusal ve kare yasa).
- Henrich (2004), [Demography and Cultural Evolution](https://www.researchgate.net/publication/200033047_Demography_and_Cultural_Evolution_How_Adaptive_Cultural_Processes_Can_Produce_Maladaptive_Losses-The_Tasmanian_Case); eleştiri: [PNAS](https://www.pnas.org/doi/10.1073/pnas.1520288113).
- Çift kullanım: [Chatham House (Nisan 2026)](https://www.chathamhouse.org/sites/default/files/2026-04/2026-04-28-how-surge-defence-dual-use-investment-could-reconfigure-global-AI-race-bego.pdf), [National Academies: Dual-Use Technologies and National Security](https://nap.nationalacademies.org/read/5902/chapter/16).

**Proje içi:** [08 §4](../08-alti-katman.md) · [11 §7 ve Ek kararlar](../11-urun-donusu.md) · [12](../12-yon-taslagi.md) · [çeşitlilik ve yönetim](cesitlilik-yonetim-askeri-teknoloji.md) · [başlangıç ve ustalık](baslangic-ve-ustalik.md) · [üretim katmanları](cesitlilik-uretim-katmanlari.md) · `packages/veri/icerik/icerik.json` · `packages/cekirdek/src/teknoloji.ts` · `packages/cekirdek/src/askeri/`.
