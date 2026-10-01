# Araştırma — Görsel Kimlik ve Arayüz: "Kâğıt ve Çini"

> **Özet.** Mevcut istemci işlevsel ama **sistemsiz**: sistem yazı tipi, emoji ve Unicode glif ikonlar, her yerde aynı doygun mavi, birbirinin aynı beş birincil düğme, haritada kara ile deniz arasında neredeyse görünmeyen fark (ΔE 2,5), arsa ızgarasının büyük bölümünü kaplayan tarama deseni ve 143 ayrı onaltılık renk. Bunlar "amatör" izlenimin asıl nedenidir; palet zevkinden çok **hiyerarşi ve tutarlılık** eksiğidir. **Öneri: "Kâğıt ve Çini"** yönü: sıcak kâğıt zemin, mürekkep metin, tek birincil renk (çini turkuazı), toprak tonlu veri katmanları ve kartografik disiplin (sakin zemin, yalnız varlıklar canlı). Renkler OKLCH tabanlı tek kaynaktan üretilir; **her metin çifti hem açık hem koyu temada WCAG 2.2 AA'yı (≥4,5:1) geçer**, 12 oyuncu rengi + "Sen" rengi normal görüşte ΔE_OK ≥ 11,7 ve üç renk körlüğü benzetiminde ≥ 6,5 ayrışır. Yazı tipi **Inter** (Türkçe ve ₺ doğrulandı, 25,4 KB woff2), ikonlar **Lucide** (ISC, 70 ikon ≈ 4,6 KB gzip). Uygulama beş aşamalıdır ve tek dosya HTML bütçesi (≤400 KB gzip) **bugün ≈381,5 KB'tadır**: yazı tipi tek dosyaya gömülemez, ayrı dosya olarak sunulur. Sonda geri dönüşü zor 9 karar vardır.

**Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi. Bu belge **kod ve ekran görüntüsü üretmez**; tüm renk sayıları betikle hesaplandı: OKLCH dönüşümleri `culori 4.0.2` ile, APCA `apca-w3 0.1.9` ile çapraz doğrulandı (birebir aynı), WCAG 2.x oranı formülle, renk körlüğü benzetimi Machado ve ark. (2009) matrisleriyle (şiddet 1,0, doğrusal RGB) hesaplandı. Betikler oturum geçici dizinindedir, repoda değildir; §7'deki test dosyası aynı hesabı kalıcı kılar. **Harita ve 3B sahne değerleri hesapla belirlenmiş başlangıç değerleridir, ekranda kalibre edilmedi**; ilk uygulama turunda gözle ayar gerekir. "ΔE_OK" (Oklab Öklid uzaklığı × 100) eşikleri standart değil, bu raporun mühendislik hedefidir (fark edilebilir en küçük fark ≈ 2). Oyun arayüzü gözlemleri geliştirici yazıları ve oyuncu forumlarına dayanır, nicel değildir; arama özetinden gelen ve sayfası okunmayan iddialar "(arama özeti)" ile işaretlidir. Kullanıcı testi yapılmadı.

İlgili belgeler: [12 — Yön taslağı](../12-yon-taslagi.md) · [Arayüz ve UX](arayuz-ux.md) · [Oyun kimliği §4.3–4.4](oyun-kimligi-harman.md#43-ton-ve-görsel-kimlik) · [Harita istemcisi](harita-istemci.md) · [Yürüyüş istemcisi](yuru-istemci.md) · [Arsa ve inşa §4.7](arsa-ve-insa-derinlestirme.md)

**Bu rapor neyi tekrar etmez.** Beş görünüm düzeyi, mercek mantığı, rozet sayısı, bildirim kuralı, HUD yerleşimi ve onboarding içeriği [arayuz-ux](arayuz-ux.md) ve [oyun-kimligi §5](oyun-kimligi-harman.md) içindedir. Burada yalnız bunların **görsel dili** (renk, tipografi, kartografi, bileşen, hareket) ve uygulanma biçimi vardır.

---

## 0. Yönetici özeti (10 madde)

1. **Teşhis.** "Amatör" görünümün sekiz kök nedeni var (§1): platforma göre değişen sistem yazı tipi ve emoji/Unicode ikonlar; tek doygun mavi ve özdeş birincil düğmeler; haritada su, orman, yol ve hiyerarşi yok; arsa ızgarasında taramalı gürültü; küre "Genel" merceğinde düz doygun dolgu; gri-mavi tek tonlu 3B sahne; 10–12,5 px'lik yoğun panel (CSS'teki 91 yazı boyutu bildiriminin 57'si ≤12,5 px); sistemsizlik (143 hex, 16 yarıçap bildirimi, 14 yazı boyutu).
2. **Yön: "Kâğıt ve Çini"** (§2). Sıcak kâğıt zemin + mürekkep metin + **tek** birincil renk (çini turkuazı `#007783`) + kiremit ikincil (kutlama, Pazar) + toprak tonlu altı katman rengi. Zemin kromatik olarak sessizdir (C ≤ 0,055); canlı renk yalnız **sen**, **rozetler** ve **seçili** nesne içindir. Koyu tema "Arduvaz" eş değer birinci sınıf temadır.
3. **Renk sistemi** (§3). OKLCH kaynaklı, 11 kademeli nötr ölçek, 6 durum ailesi, 7 katman rengi (+5 kademeli rampa), 12 oyuncu rengi + "Sen". **Ölçülen:** tüm metin çiftleri açık/koyu ≥4,5:1 (en düşük: uyarı ink'i gömük zeminde 6,4); oyuncu seti normal ΔE_OK 11,7, renk körlüğünde ≥6,5 (karşılaştırma: Okabe-Ito 7 renk → 7,6; Tol muted 9 renk → 5,2). [Oyun kimliği §4.3](oyun-kimligi-harman.md) paleti denetlendi: çini kâğıt üstünde 3,62:1, buğday 1,79:1, çayır 2,90:1 (metin/grafik için yetersiz) ve çini–çelik deuteranopide ΔE 1,5; düzeltildi.
4. **Harita** (§4). Kara `#F3EFE5`, su `#B9D7E3` (ΔE 10,3; bugün 2,5), kıyı bandı, kabartma, orman/tarım/yerleşim sınıfları, 5 kademeli yol hiyerarşisi (Protomaps'in üstel-1,6 genişlik eğrisi), sınır hiyerarşisi desenle (düz / kesik / noktalı), sentence-case etiketler. **Doğrulanmış tuzak:** MapLibre 5.24 `text-transform: uppercase` komutunu yerel dil bağımsız `toLocaleUpperCase()` ile çalıştırır; tarayıcı dili Türkçe değilse "Bilecik" → "BILECIK" olur. Haritada büyük harf kullanılmaz.
5. **Tipografi** (§5.1). Inter (OFL), Latin-1 + Türkçe + ₺ alt kümesi, 400–700 değişken: **25,4 KB woff2**. 10 aday ölçüldü: Atkinson Hyperlegible Next ve Figtree **₺ içermiyor**; DM Sans'ta tabular rakam yok. Ölçek 12–40 px, gövde 14 px; en küçük metin 12 px.
6. **Bileşen dili** (§5.2–5.5). 4 px ızgara, 3 yarıçap (6/10/14), 3 gölge seviyesi (sıcak tonlu), "kenarlık **veya** gölge" kuralı, **görünümde tek birincil düğme**, durum rozetleri yalnız ink-on-tint, bulanıklık (backdrop-filter) kaldırılır.
7. **Hareket** (§5.6). Dört süre (120/200/320/700 ms), üç eğri; geri bildirim animasyonu (tek seferlik ≤700 ms) var, süs animasyonu (sürekli) yok; spinner yerine adımlı ilerleme; `prefers-reduced-motion` hepsini 0'a çeker.
8. **Akış** (§6). Büyük geçişlerde 240+240 ms "kâğıt örtü"; üç görünümün zemini **aynı token'dan** gelir (küre uzayı, harita karası, sokak zemini) böylece kesme görünmez; boş durumlar tek cümle + tek eylem; ilk 60 saniyenin görsel/hareket tablosu.
9. **Uygulama** (§7). `src/tasarim/` altında TS kaynak (OKLCH) → üretilen hex CSS; kontrast ve renk körlüğü **test olarak** korunur. Beş aşama (A0–A4). **Bütçe:** tek dosya HTML şimdi ≈381,5 KB (boşluk ≈18,5 KB; paralel işler boşluğu tüketiyor: 373,8 → 381,5); ikon (+4,6) ve CSS (+≈5) ile ≈391 KB; yazı tipi tek dosyaya gömülürse (+19,6) ≈411 KB olur, bütçe aşılır. Öneri: yazı tipi ayrı dosya, tek dosya kipinde sistem yığını.
10. **Geri dönüşü zor** (§8, 9 karar): ana yazı tipi, oyuncu renk sözleşmesi (indeks, hex değil), açık/koyu iki birinci sınıf tema, harita etiket yolu (DOM / glyph), görsel üslup sınırı (düz gölgeli + prosedürel cephe), ikon seti, token kaynağı (TS → hex), harita altlık şeması, "Sen" rengi.

---

## 1. Mevcut durumun eleştirel analizi

Kaynak: `sakin-*.png` (küre/panel, açık-koyu, masaüstü-mobil), `harita/*.png` (L0–L3, altlık), `yuru/*.png` (L4) ve kod (`arayuz/stil.css`, `harita/harita.css`, `yuru/yuru.css`, `kure/tema.ts`, `veri/renkler.ts`, `harita/gorunum.ts`, `yuru/palet.ts`).

### 1.1 Neyi amatör gösteriyor? (etki sırasıyla)

| # | Gözlem | Neden amatör gösterir | Kanıt | Kök neden |
|---|---|---|---|---|
| 1 | **Yazı tipi ve ikonlar platformdan geliyor.** Ekran görüntülerinin tamamı geniş bir sistem yazı tipiyle (Linux yedeği) çizilmiş; `font: 14px/1.45 system-ui, …` (`stil.css:228`, `yuru.css:22,67`, `mini-harita.ts:94`). Üst çubukta renkli zil ve dünya emojileri, ayrıca ◐ ⚙ ⓘ ⏸ ▾ ✓ ▲ ◯ ⚔ gibi Unicode glifler | Windows'ta Segoe UI, macOS'ta SF, Android'de Roboto görünür: **kimlik yok**; her glif farklı yedek yazı tipinden gelir, ağırlık ve boyut tutarsız olur; renkli emoji sakin paletin içinde yabancı durur | Denenen 10 tam yazı tipinin **hiçbirinde** ⚔ ⏸ ◐ ⓘ ⚙ yok, ▾ yalnız Source Sans 3'te, ✓ yalnız Inter, Source Sans 3 ve IBM Plex'te var (fontTools, tam `cmap`); bu glifler kodda 212 satırda geçiyor (yorumlar dahil) | Yazı tipi ve ikon seti kararı verilmemiş |
| 2 | **Tek doygun mavi ve özdeş birincil düğmeler.** Vurgu `#1f5fbf` (OKLCH 0,50 0,164 259): sekme çizgisi, segment seçimi, "Devlet seç" ve Dikkat panelindeki **beş** "Tek tıkla uygula" düğmesi aynı dolgun mavi | Hiyerarşi yok: göz hiçbir yere odaklanamaz. "Varsayılan şablon mavisi" hissi. Koyu temada aynı beş düğme pastel mavi blok olur | `sakin-masaustu-acik-genel.png`, `…-koyu-genel.png` | Birincil/ikincil eylem kuralı yok |
| 3 | **L1/L2 harita "boş kâğıt".** Kara `#f1efe8` ile zemin (deniz) `#e6e8ea` arasında ΔE_OK **2,5**; su, orman, tarım, yol yok (altlık yalnız `?altlik=` ile) | Kıyı çizgisi bile belirsiz; harita bitmemiş görünür. Seçili ilçe mavi-gri dolgu + 2,2 px koyu kenarla "kesilmiş şablon" gibi durur | `harita-masaustu-1-il.png`, `…-2-ilce.png`; `--harita-zemin`, `--harita-kara` | Kartografik katman kararı yok |
| 4 | **Küre "Genel" merceği.** Devlet dolgusu düz doygun `#0072b2` (C 0,131), çevre bej/gri-mavi (C 0,015–0,023): kroma farkı ≈ 6–9 kat; çizgiler siyaha yakın; koyu temada kıyıda siyah gölge parçaları; liman/olay rozetleri "sarı halka + beyaz nokta" ve siyah-beyaz çapa; etiketler beyaz + ağır siyah halo | "Boyanmış kâğıt" ve varsayılan yer işareti hissi; sakin ilkeyle çelişir | `sakin-masaustu-*-genel.png`, `-mercek.png` | Okabe-Ito doygunluğu zemine uyarlanmadan kullanılmış |
| 5 | **L3 ızgara gürültüsü.** Alınamaz hücreler `tarali` desenle çizilir (`serit-engel`); ızgaranın büyük kısmı çizgili görünür. Seçili hücre `#e69f00` turuncu, sahip hücre mavi %45. Altta uzun yönerge metni | Oyunun asıl varlığı (arsa) ekranın en gürültülü yüzeyi olur; desen anlam taşımayan yerde kullanılmış | `harita-masaustu-3-secim.png`, `-4-sahiplik.png`, `harita-mobil-3-secim.png` | Desen yalnız gerçek ayrım için ayrılmamış |
| 6 | **Altlık ve L4 gri-mavi tek ton.** Altlıkta tüm yollar aynı kalınlık ve renkte, binalar kahverengi dikdörtgen; L4'te zemin, yol ve parsel gri-mavi, kamerada bina yok, karakter ≈30 px; iki satırlık kontrol metni kutusu; koyu temada neredeyse siyah blok | Hiyerarşi ve derinlik yok; sahibin notu ("bina modellemeleri daha detaylı", "karakter küçük") bunu doğruluyor | `harita-masaustu-altlik-koyu.png`, `yuru-masaustu-3-yuru.png`, `…-7-koyu.png` | 22 sınıflı palet var ama sınıflar arası hiyerarşi (yol genişliği/koyuluğu, bina cephe çeşitliliği) ve kontrast kuralı yok |
| 7 | **Panel yoğunluğu.** Yedi sekme 11,5 px'te ikonsuz; satırlar 12,5 px + kesikli ayraç; mal tablosunda 13 doygun renk | Okunurluğu düşürür; [arayuz-ux §7](arayuz-ux.md) "gövde ≥14 px" ilkesine aykırı | CSS'te 91 `font-size` bildiriminin **57'si ≤12,5 px**; 14 farklı boyut | Tipografi ölçeği yok |
| 8 | **Sistemsizlik.** 143 benzersiz onaltılık renk, 16 farklı yarıçap bildirimi (2–22 px, %50), 21 `box-shadow` (20'si aynı `--golge`), 5 `backdrop-filter`; her kutuda kenarlık + gölge + bulanıklık üçlüsü; üç tema bloğu iki dosyada elle kopyalanmış | İnce tutarsızlıklar toplanınca "ürün" yerine "prototip" hissi verir; bulanıklık hareketli WebGL tuvali üstünde her karede yeniden hesaplanır | `stil.css`, `harita.css` (`:root`, `@media dark`, `[data-theme=dark]` her birinde) | Token yok |

Ek, daha küçük bulgular: (a) kontrast: `--rozet-bosta #e69f00` beyazda **2,25:1**, `--k-kismi #e8a317` **2,17:1**, `--rozet-bitti #009e73` beyazda 3,42:1 ama harita karasında (`#f1efe8`) **2,97:1** (şekil taşısa da grafik nesne 3:1 gerektirir); `--uyari #a86a00` gömük zeminde `#eef1f5` üstünde **3,92:1** (metin için AA altı). (b) Yürüyüşte toast (`Parsel satın alındı`) `[E]` hapının hemen üstüne 1 px boşlukla biniyor. (c) Para biçimi ekranda `1.000 ₺`, [oyun-kimliği §4.4](oyun-kimligi-harman.md) ve `Intl tr-TR` ise `₺1.000`. (d) Yükleme göstergesi sonsuz dönen çember (`animation: don 0.9s linear infinite`): "sürekli animasyon yok" ilkesinin tek ihlali.

### 1.2 Korunacaklar

Şekil + renk rozetleri (▲ ◯ ✓ ⚔; renk tek başına anlam taşımıyor), tek `tr-TR` biçimleyici (`bicim.ts`), aksan duyarsız arama, tek mercek, akış çizgisi yokluğu, hareket azaltma desteği, ODbL atıfları ve CSS → sahne köprüsü (`kure/tema.ts: paletiOku()`, `yuru/palet.ts: paletOku()`). Bu köprü bu raporun token yaklaşımına zaten uyar; yalnız **okunan değerlerin hex olması** gerekir (§3.1).


---

## 2. Görsel kimlik önerisi

### 2.1 Ruh hali

**Sabahın erken saatinde semt pazarı:** açık, düzenli, sıcak, gürültüsüz. Ekran bir **defter sayfası** gibi sakin durur (kâğıt zemin, mürekkep metin, ince çizgi); canlılık yalnız **kendi mülkünde**, **yeni bir olayda** ve **seçtiğin şeyde** vardır. Koyu tema aynı sahnenin akşamıdır ("akşam defteri": arduvaz zemin, soluk ışık), ayrı bir kimlik değil. "Profesyonel" ölçüsü şudur: hiçbir renk, çizgi ya da kutu **gerekçesiz** olmamalı; her biri bir bilgiyi ya da bir hiyerarşi basamağını taşımalıdır.

### 2.2 Referans panosu (sözlü)

| Referans | Gözlem (kaynak) | Alınan ders | Alınmayan |
|---|---|---|---|
| **Mini Motorways / Mini Metro** | Yumuşak pastel palet, az öğe, her kentin kendi paleti; **özgün, renk körü ve koyu mod** ayrı paletlerdir ([Wikipedia](https://en.wikipedia.org/wiki/Mini_Motorways), [Minimal Game](https://abgames.io/mini-motorways); arama özeti, sayfa okunmadı) | Renk körü modunu ayrı, birinci sınıf palet yap; zemin sessiz, oyun nesnesi canlı | Tek renkli soyut dünya: bizde gerçek coğrafya var |
| **Townscaper** | Kısıtlı palet (yumuşak pastel, derin mavi, sıcak kırmızı, soluk yeşil); renk oyuncunun anlatım aracı ([townscaper.org](https://townscaper.org/), [Wikipedia](https://en.wikipedia.org/wiki/Townscaper); arama özeti) | Oyuncu rengi **kişiliktir**: az ve zarif seçenek | Rastgele pastel: renk körlüğü ayrımı yok |
| **Anno 117** | "Zarafet" sütunu; koyu mavi zemin, **Tyrian moru yalnız düğme seçiminde** (nadirlik = değer); kumaş ve mermer dokusu; kontrast, yazı ve ikon boyutu stil rehberine gömülü; üç renk körlüğü modu ([Anno Union](https://www.anno-union.com/devblog-the-user-interface-team-and-a-deeper-dive-into-the-visuals/), [Ubisoft](https://news.ubisoft.com/en-us/article/2FfSSEUp1jtg9isC9NxowP/anno-117-pax-romana-accessibility-spotlight)) | **Vurgu rengi nadir ve anlamlı olmalı**; erişilebilirlik stil rehberinde baştan | Doku katmanları (bellek ve çizim maliyeti; sakin ilkeye ağır) |
| **Victoria 3** | Harita "ilginç ama arayüzle karmaşıklıkta yarışmayacak kadar **yatıştırıcı**"; uzaktan "kâğıt harita"; sütunlar zarafet ve umut ([Dev Diary #49](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-49-graphic-overview)) | Harita zemini arayüzle yarışmaz; uzak düzey (L0/L1) bir **kâğıt harita** gibi okunur | Masa üstü nesneleri ve illüstrasyon yoğunluğu |
| **Against the Storm** | Eski arayüz "güzel ama bazı yerlerde okunaksız"; yeniden tasarımda **süs azaltıldı, paneller koyulaştı, yazı ve ikon büyütüldü** ([Eremite](https://eremitegames.com/interface-update/)) | Süsten önce okunurluk; ikonlar büyük ve ayrışık | Karanlık fantazi estetiği |
| **Cities: Skylines II** | Oyuncu şikâyeti: soluk ve bej; imar türleri havadan zor ayırt ediliyor ([Steam tartışması](https://steamcommunity.com/app/949230/discussions/0/5824898961051871666/); arama özeti); sonraki güncellemede "daha yuvarlak" menüler ([AllKeyShop](https://www.allkeyshop.com/blog/en-us/cities-skylines-2-february-update-recolor-tool-news-r/); arama özeti) | **Sakin ≠ monoton:** arazi sınıfları ayrışmalı; tek canlı vurgu gerekli | – |
| **Frostpunk 2 / Civilization VII** | Frostpunk 2'de beta geri bildirimi arayüz yenilemesi için çıkışı erteletti; Civ VII'de Firaxis "önceliğimiz arayüz" dedi, harita okunurluğu söz verilen iyileştirmeler arasında; oyuncular "bilgi bulunamıyor, bildirimler kayboluyor" diyor ([PCGamesN](https://www.pcgamesn.com/frostpunk-2/ui-improvements), [PCGamesN](https://www.pcgamesn.com/civilization-vii/ui-fixes)) | Bilgi hiyerarşisi görsel kimlikten önce gelir | – |
| **Manor Lords** | Parşömen üslubu oyuncularca "bilgi yoğun ve okunur" bulunur; yapı menüsü görselleri işlevi tek bakışta anlatır ([Steam yorumu](https://steamcommunity.com/app/1363080/discussions/0/598539452432936012/); arama özeti) | Tema (kâğıt) dekor değil, **bilgiyi taşıyan** katman olmalı | Dekoratif çerçeve ve manuskript illüstrasyonu |
| **CARTO Positron / Voyager** | Taban harita **veri katmanının altında** durur: sıkıştırılmış açıklık aralığı, desatüre palet ([CARTO](https://carto.com/blog/new-voyager-basemap/), [Positron yenileme](https://carto.com/blog/positron-dark-matter-new-look/)). **Ölçüldü:** Voyager zemin `#fbf8f3`, su `#b0d0d6`, bina `#e4dcd0`; Positron zemin `#fafaf8`, su `#d4dadc` ([Voyager stil JSON](https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json), [Positron](https://basemaps.cartocdn.com/gl/positron-gl-style/style.json)) | **Figür-zemin:** harita sakin, oyun nesnesi öne çıkar; sıcak kâğıt zemin Voyager ile aynı yöndedir | Sokak adı yoğunluğu (oyun değil gezinme haritası) |
| **Protomaps flavors** | Açık flavor: zemin `#cccccc`, su `#80deea` (parlak camgöbeği), yollar beyaz; yol genişlikleri **üstel 1,6** eğriyle ([flavors.ts](https://raw.githubusercontent.com/protomaps/basemaps/main/styles/src/flavors.ts), [base_layers.ts](https://raw.githubusercontent.com/protomaps/basemaps/main/styles/src/base_layers.ts)) | Genişlik eğrisini alırız; **rengi almayız** (su çok doygun, zemin gri) | Varsayılan flavor |
| **Felt** | Az sayıda renk, her biri anlamlı; ön plan–orta plan–zemin; halo rengi zemine göre ayarlanır ([Felt](https://felt.com/blog/how-to-design-a-beautiful-map), [Felt](https://www.felt.com/blog/cartography-tips-for-designing-web-maps)) | Renk bütçesi (§2.4) ve halo kuralı | – |
| **Stamen Terrain / Watercolor** | Terrain: kabartma gölgesi + doğal bitki renkleri; Watercolor: organik kenar, kâğıt dokusu ([Stamen](https://maps.stamen.com/); arama özeti) | **Kabartma (hillshade)** haritayı tek hamlede "kartografik" yapar | Suluboya dokusu (ağır) |
| **Mapbox Standard** | Işık önayarları (şafak/gün/alacakaranlık/gece) ve 3B bina ([Mapbox](https://docs.mapbox.com/map-styles/standard/guides/)) | Gece teması "ışık önayarı" gibi düşünülür (aynı veri, farklı ışık) | Dinamik gün döngüsü (sürekli değişim) |

### 2.3 Üç alternatif yön

| | **A — Anadolu toprak tonları** | **B — Modern kartografik** | **C — Sıcak minimal** (öneri temeli) |
|---|---|---|---|
| Ruh | Kil, kiremit, zeytin; el yapımı, sıcak | Serin gri-mavi, veri odaklı pano | Kâğıt, mürekkep, tek canlı renk |
| Zemin / metin / birincil | `#F5E8D4` / `#342117` / kiremit `#9C4621` | `#F3F5F8` / `#182230` / mavi `#2460B7` | `#F5F2EC` / `#1A2731` / çini `#007783` |
| Kara ↔ su (ΔE_OK) | 12,3 | **6,7** (zayıf) | 10,3 |
| Kara ↔ orman (ΔE_OK) | 12,6 | **4,0** (zayıf) | 9,3 |
| Birincil ↔ ikincil (en kötü renk körlüğü ΔE) | **2,5** (kiremit–zeytin, deuteranopi) | 11,3 | 14,6 |
| Güçlü | Özgün, "Türkiye'ye ait" hissi; harita sıcak | Okunur, nötr, tanıdık "profesyonel pano" | Sakin, evrensel; özgünlük renk dağılımından ve ayrıntılardan gelir |
| Zayıf | Zemin kroması yüksek (C 0,03): uzun oturumda yorucu; kahverengi tonlar "çamur" olabilir; veri renkleriyle (tarım, devlet) çakışır; klişeye kayma riski | "Her yerdeki SaaS panosu": kimlik yok; mavi vurgu bugünkü sorunu sürdürür | Tek vurgu rengi çini oyunun başka bir rengini "sahiplenir" (bu yüzden oyuncu paleti çini tonlarından kaçınır, §3.5) |
| Erişilebilirlik | Birincil/ikincil renk körlüğünde ayrışmıyor | İyi | İyi (ölçüldü) |

Değerlendirme (Ar-Ge yargısı, 1–5; kullanıcı testi yok):

| Ölçüt | A | B | C |
|---|:-:|:-:|:-:|
| Sakinlik | 3 | 4 | **5** |
| Profesyonel görünüm | 3 | **5** | 4 |
| Özgünlük / kimlik | **5** | 2 | 4 |
| Harita okunurluğu | 4 | 3 | **5** |
| Erişilebilirlik (ölçülmüş) | 2 | 4 | **5** |
| Uygulama maliyeti (düşük maliyet = yüksek puan) | 3 | **5** | 4 |

### 2.4 Önerilen yön: **"Kâğıt ve Çini"**

**C'nin sakin iskeleti + B'nin kartografik disiplini + A'dan yalnız veri katmanı tonları.** Zemin ve kroma C gibi sessiz; ölçüler (kroma bütçesi, kontrast, hiyerarşi) B gibi sıkı; Tarım, Pazar, Askeri ve Lojistik katman renkleri A'nın toprak ailesinden (buğday, kiremit, zeytin, deniz) gelir. Ad: **çini** İznik çinisinin turkuazından, **kâğıt** defter ve kitabe geleneğinden; ikisi de **desen değil ton** olarak kullanılır. Bayrak/Atatürk görseli, ay-yıldız ve dinî motif [oyun-kimliği §4.4](oyun-kimligi-harman.md) gereği kullanılmaz; hata rengi bayrak kırmızısı değil, soluk kiremit-kırmızıdır.

**Sekiz ilke**

1. **Zemin sessiz, varlık canlı.** Kroma bütçesi (OKLCH C): nötr yüzey ≤ 0,026; harita arazisi ≤ 0,065; durum, katman ve oyuncu renkleri 0,054–0,166. Bugün devlet dolgusunun kroması harita karasının 6–9 katıdır; hedef: oyuncu rengi / arazi ≤ 2,5 kat.
2. **Tek birincil eylem.** Bir görünümde en çok bir dolgun birincil düğme; tekrar eden satır eylemleri ikincil/ton düğmedir.
3. **Renk + şekil + konum.** Hiçbir anlam yalnız renkle verilmez (WCAG 1.4.1; [arayuz-ux §2](arayuz-ux.md)).
4. **Kâğıt metaforu yük taşır:** yüzeyler sıcak nötr, çizgiler ince, gölge "kâğıdın gölgesi" (sıcak tonlu, düşük alfa); dekor yok.
5. **Her token'ın tek kaynağı vardır** (§7): elle iki yerde aynı renk yazılmaz.
6. **Kenarlık veya gölge, ikisi birden değil.** Bulanıklık yok.
7. **Süs animasyonu yok, geri bildirim animasyonu var** (§5.6).
8. **Koyu tema = aynı kimlik, farklı ışık.** Kroma biraz düşer, açıklık ölçeği ters kurulur; iki tema da test edilir.


---

## 3. Renk sistemi

### 3.1 Yöntem ve eşikler

**Neden OKLCH.** Oklab/OKLCH algısal olarak düzgündür: aynı L (açıklık) iki renkte benzer parlaklık verir, böylece kontrast, kademeli rampa ve açık/koyu eşlemesi hesapla kurulabilir ([Ottosson](https://bottosson.github.io/posts/oklab/)). Sınırı: çok doygun renklerde ve mavi bölgede tam düzgün değildir (yazar da belirtir); bu yüzden her değer ayrıca WCAG ve benzetimle **ölçüldü**. sRGB dışına taşan renkler sabit L ve H'de kroma düşürülerek (ikili arama) gamuta alındı. CSS'te `oklch()` 2023'ten beri her tarayıcıda çalışır ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch)).

**Kaynak OKLCH, çıktı onaltılık.** Bu belgedeki tüm renkler TS kaynağında OKLCH üçlüsüdür; üretilen CSS **`#rrggbb`** yazar. Nedeni kodda doğrulandı: (1) MapLibre 5.24 paketinde `oklch` ifadesi **hiç geçmiyor** (yalnız `lab`/`hcl` ara değerleme uzayları), yani stil JSON'una `oklch(...)` verilemez; (2) `veri/renkler.ts: hexRgb()` yalnız `#rgb`, `#rrggbb` ve `rgb()` biçimini tanır ve tanımadığı değerde **sessizce gri** `[0.5, 0.5, 0.5]` döndürür; `getComputedStyle` ise özel özelliği yazıldığı gibi (`oklch(...)`) verir. CSS'e `oklch()` yazmak, küre ve sahne renklerini hata vermeden griye boyar. Test bunu da korur (§7.5). `light-dark()` 2024'ten beri "yeni kullanılabilir" ([MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark)); kod üretildiği için eski üçlü biçim (`:root`, `@media dark`, `[data-theme=dark]`) elle bakım gerektirmez ve kalır.

**Eşikler**

| Ölçüt | Hedef | Dayanak |
|---|---|---|
| Normal metin | ≥ 4,5:1 | WCAG 2.2 SC 1.4.3 (AA) |
| Büyük metin (≥18 px kalın / ≥24 px) | ≥ 3:1 | aynı |
| UI bileşeni, ikon ve anlam taşıyan grafik | ≥ 3:1 (2,999 geçmez) | SC 1.4.11 ([W3C](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)) |
| Gövde metni (APCA) | Lc ≥ 75 (14–16 px); yardımcı ≥ 60; yer tutucu/etiket ≥ 45 | APCA, WCAG 3 taslağı, **normatif değil**, gösterge ([APCA](https://git.apcacontrast.com/documentation/APCAeasyIntro.html)) |
| Oyuncu/katman ayrımı, normal görüş | ΔE_OK ≥ 10 | mühendislik hedefi |
| Aynı, renk körlüğü (protan/deutan/tritan) | ≥ 6 (büyük alan), simge için ek şekil | mühendislik hedefi; benzetim: [Machado 2009](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) |

Renk körlüğü için kategorik palet sınırı: Okabe-Ito 8 (siyah dahil), Tol muted 9; daha fazlası için "banded" ya da ek kanal gerekir ([Tol](https://sronpersonalpages.nl/~pault/)). 12+ renk bu yüzden **renk + emblem** çiftidir (§3.5).

### 3.2 Nötr ölçek ("kâğıt" ve "arduvaz")

Açık temada yüzeyler sıcak (H 85), metin ve çizgiler serin (H 245): "sıcak kâğıt, soğuk mürekkep". Koyu temada tersi: zemin serin arduvaz, metin sıcak kırık beyaz. Adlar [Radix 12 kademe](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) mantığına paraleldir (zemin, bileşen, kenar, metin) ama Türkçe ve 11 kademelidir.

| Token | Açık hex | Açık OKLCH (L C H) | Açık / yüzey | Koyu hex | Koyu OKLCH | Koyu / yüzey | Kullanım |
|---|---|---|---|---|---|---|---|
| `zemin` | #F5F2EC | 0.96 0.009 85 | 1.07 | #0F151A | 0.19 0.014 244 | 1.08 | Uygulama zemini, harita çevresi |
| `yuzey` | #FCFAF6 | 0.99 0.006 85 | 1.00 | #161D22 | 0.23 0.014 239 | 1.00 | Panel, kart, açılır kutu |
| `yuzey-2` | #EEEBE3 | 0.94 0.011 90 | 1.14 | #1F262D | 0.26 0.017 248 | 1.11 | Gömük alan, girdi dolgusu, tablo şeridi |
| `yuzey-3` | #E7E2DA | 0.91 0.012 80 | 1.24 | #272F36 | 0.30 0.017 245 | 1.25 | Hover, seçili satır |
| `cizgi-ince` | #E0DCD4 | 0.90 0.012 85 | 1.31 | #2C343B | 0.32 0.017 245 | 1.35 | Ayraç, panel içi çizgi |
| `cizgi` | #CDC8BF | 0.83 0.014 82 | 1.60 | #3B444C | 0.38 0.018 245 | 1.72 | Kart ve panel kenarlığı |
| `cizgi-guclu` | #7D8891 | 0.62 0.019 243 | 3.47 | #6B7680 | 0.56 0.020 246 | 3.67 | Girdi ve düğme kenarı, ikon (≥3:1) |
| `murekkep-4` | #9EA6AD | 0.72 0.014 244 | 2.37 | #565F66 | 0.48 0.016 241 | 2.62 | Devre dışı metin ve ikon (WCAG muaf) |
| `murekkep-3` | #5F6B75 | 0.52 0.022 243 | 5.24 | #838E97 | 0.64 0.019 243 | 5.09 | Yer tutucu, zaman damgası (≥4,5:1, 14 px gövde değil) |
| `murekkep-2` | #4B5864 | 0.45 0.026 246 | 7.00 | #ACB6BE | 0.77 0.016 242 | 8.26 | İkincil metin |
| `murekkep` | #1A2731 | 0.27 0.026 242 | 14.61 | #EFECE8 | 0.94 0.006 75 | 14.46 | Birincil metin, başlık |

### 3.3 Birincil, ikincil ve durum aileleri

Her aile dört değer taşır: **`solid`** (dolgu, ikon, çizgi; üstüne metin gelirse açıkta beyaz, koyuda zemin rengi), **`ink`** (metin; `solid`den koyu/açık), **`tint`** (arka plan), **`line`** (kenar). Kural: **metin rengi daima `ink`'tir**, `solid` metinde kullanılmaz.

Kullanım: **Birincil (çini)** = eylem, bağlantı, odak halkası, "Sen". **İkincil (kiremit)** = kutlama (Hayırlı olsun, kitabe), Pazar katmanı; hata ya da uyarı için kullanılmaz. **Başarı** = tamamlandı, olumlu fark. **Uyarı** = dikkat gereken (eksik girdi). **Hata** = engel, reddedildi, savaş. **Bilgi** = nötr bilgilendirme.

**Açık tema**

| Aile | `solid` (OKLCH) | solid üstü metin | solid / yüzey | `ink` metin / yüzey-2 | `tint` (zemin) | ink / tint | `line` |
|---|---|---|---|---|---|---|---|
| Birincil (çini) | #007783 · 0.52 0.089 207 | 5,3 | 5,1 | #005B64 · 6,6 | #D8F3F6 | 6,7 | #90C9D1 |
| İkincil (kiremit) | #A14E1C · 0.52 0.126 48 | 5,8 | 5,6 | #803703 · 7,1 | #FFE7DC | 7,2 | #E7B094 |
| Başarı | #257B51 · 0.52 0.105 158 | 5,2 | 5,0 | #0A5F3B · 6,5 | #DDF3E5 | 6,6 | #9CCBAE |
| Uyarı | #996A06 · 0.56 0.115 78 | 4,8 | 4,6 | #714D00 · 6,4 | #F9EBD5 | 6,5 | #D7B98C |
| Hata | #B53434 · 0.52 0.166 25 | 6,0 | 5,7 | #911C20 · 7,4 | #FFE6E4 | 7,4 | #F7A59E |
| Bilgi | #2D6CA8 · 0.52 0.115 250 | 5,5 | 5,3 | #175287 · 6,8 | #E0EFFF | 6,9 | #9CC2E9 |

**Koyu tema**

| Aile | `solid` (OKLCH) | solid üstü metin | solid / yüzey | `ink` metin / yüzey-2 | `tint` (zemin) | ink / tint | `line` |
|---|---|---|---|---|---|---|---|
| Birincil (çini) | #49B6C4 · 0.72 0.100 207 | 7,7 | 7,1 | #6FCFDC · 8,5 | #192E31 | 7,9 | #265F66 |
| İkincil (kiremit) | #E48B5C · 0.72 0.125 48 | 7,1 | 6,6 | #FAA77B · 7,9 | #39251B | 7,5 | #77482F |
| Başarı | #67B98B · 0.72 0.106 158 | 7,8 | 7,2 | #87D1A6 · 8,5 | #1D2F25 | 7,9 | #356048 |
| Uyarı | #E0AE5D · 0.78 0.115 78 | 9,1 | 8,4 | #EABC72 · 8,7 | #332817 | 8,2 | #6A5025 |
| Hata | #FB756E · 0.72 0.165 25 | 6,9 | 6,4 | #FFA098 · 7,8 | #3E211E | 7,4 | #843C38 |
| Bilgi | #6AAAEA · 0.72 0.115 250 | 7,5 | 6,9 | #89C3FF · 8,2 | #1E2B3A | 7,7 | #36587A |

### 3.4 Metin çiftleri (ölçülen kontrast)

| Çift | Token | Açık WCAG | Açık APCA Lc | Koyu WCAG | Koyu APCA Lc |
|---|---|---|---|---|---|
| Birincil metin / yüzey | `murekkep` / `yuzey` | 14,6 | 99 | 14,5 | 94 |
| Birincil metin / zemin | `murekkep` / `zemin` | 13,6 | 95 | 15,6 | 95 |
| Birincil metin / gömük | `murekkep` / `yuzey-2` | 12,8 | 90 | 13,0 | 93 |
| İkincil metin / yüzey | `murekkep-2` / `yuzey` | 7,0 | 82 | 8,3 | 60 |
| İkincil metin / gömük | `murekkep-2` / `yuzey-2` | 6,1 | 74 | 7,4 | 59 |
| Yer tutucu / gömük | `murekkep-3` / `yuzey-2` | 4,6 | 65 | 4,6 | 38 |
| Girdi kenarı / yüzey (≥3:1) | `cizgi-guclu` / `yuzey` | 3,5 | 61 | 3,7 | 28 |
| Girdi kenarı / gömük (≥3:1) | `cizgi-guclu` / `yuzey-2` | 3,0 | 52 | 3,3 | 26 |
| Düğme metni / birincil solid | – | 5,3 | 81 | 7,7 | 56 |
| Bağlantı (birincil ink) / gömük | – | 6,6 | 75 | 8,5 | 66 |
| Hata ink / gömük | – | 7,4 | 77 | 7,8 | 62 |
| Uyarı ink / gömük | – | 6,4 | 74 | 8,7 | 68 |
| Başarı ink / gömük | – | 6,5 | 75 | 8,5 | 67 |

En düşük normal-metin oranı 4,6:1 (yer tutucu, gömük zeminde, iki temada da); hiçbir metin çifti AA'nın altına düşmez. `murekkep-3` yalnız yer tutucu, zaman damgası ve ipucu içindir; 14 px gövde metni için kullanılmaz (APCA Lc 38–65).

### 3.5 Oyuncu renkleri: 12 renk + "Sen"

**Yöntem.** İki tur. (1) Açık tema için 6 ton bandında (kırmızı/gül, turuncu/kahve, sarı/zeytin, yeşil, mavi, mor) ikişer renk olacak biçimde, açıklık (L 0,44–0,70) ve kroma (C 0,06–0,13) serbest bırakılarak **tavlama benzetimiyle** çift bazında "en kötü durum" ayrımı (normal görüş ve üç renk körlüğü benzetimi) en büyütüldü; "Sen" rengi sabit nokta olarak dahil edildi. (2) İkinci turda 12 rengin açık sürümü, aynı ton ve krominin açıklığı +0,17 kaydırılmış koyu sürümü ve "Sen" rengi **birlikte** ince ayarlandı (6.000 yineleme; amaç iki temada da aynı anda en kötü çifti büyütmek). Sonuç elle düzeltilmedi; yalnız adlandırıldı.

| # | Ad | Açık dolgu | OKLCH | Açık kenar (kara üstü WCAG) | Koyu dolgu | OKLCH | Koyu kenar (kara üstü WCAG) |
|---|---|---|---|---|---|---|---|
| 1 | Gül kurusu | #9E5560 | 0.54 0.097 11 | #924A55 (5,5) | #D68792 | 0.71 0.098 11 | #DA8B96 (6,1) |
| 2 | Kestane | #872F02 | 0.43 0.130 41 | #872F02 (7,5) | #BF623E | 0.60 0.130 41 | #E88762 (6,0) |
| 3 | Hardal | #B27614 | 0.61 0.126 72 | #885700 (5,4) | #EAAB56 | 0.78 0.126 72 | #EAAB56 (7,8) |
| 4 | Fıstık | #A3AD43 | 0.72 0.130 114 | #636A00 (5,1) | #CFDB72 | 0.86 0.130 115 | #CFDB72 (10,5) |
| 5 | Zeytin | #706700 | 0.51 0.107 104 | #6E6500 (5,2) | #A59A2D | 0.68 0.126 103 | #B3A83E (6,4) |
| 6 | Çam | #38553C | 0.42 0.054 148 | #38553C (7,2) | #67876B | 0.59 0.056 148 | #8DAF91 (6,5) |
| 7 | Zümrüt | #2B9F6A | 0.63 0.130 159 | #00764A (5,0) | #69D69D | 0.80 0.131 159 | #69D69D (8,7) |
| 8 | Kobalt | #24569F | 0.46 0.130 258 | #24569F (6,3) | #558AD7 | 0.63 0.130 258 | #6FA6F5 (6,3) |
| 9 | Gök | #6DABE1 | 0.72 0.102 246 | #29689A (5,2) | #AAD7FF | 0.86 0.073 246 | #AAD7FF (10,4) |
| 10 | Eflatun | #9171C3 | 0.61 0.125 301 | #70509E (5,5) | #C6A6FC | 0.78 0.124 301 | #C6A6FC (7,7) |
| 11 | Patlıcan | #5F3F67 | 0.42 0.076 319 | #5F3F67 (7,6) | #916F9A | 0.59 0.075 319 | #B996C3 (6,1) |
| 12 | Nar çiçeği | #E5809E | 0.72 0.128 2 | #9B3E5E (5,6) | #FFBBCD | 0.86 0.081 1 | #FFBBCD (9,9) |

*Kenar* sütunu, dolgunun açık/koyu zeminde ≥3:1 kalması için açıklığı sınırlanmış sürümüdür (açık temada L ≤ 0,50, koyuda L ≥ 0,72); dolgu yarı saydam çizildiği için **ayrım kenar çizgisiyle** garanti edilir. "Kara" = `harita-kara`.

**Renk körlüğü karşılaştırması** (çift bazında en küçük ΔE_OK × 100; yüksek iyi)

| Set | Renk | Normal | Protan | Deutan | Tritan |
|---|:-:|:-:|:-:|:-:|:-:|
| Okabe-Ito (siyahsız) | 7 | 15,6 | 9,6 | 7,6 | 8,5 |
| Tol muted | 9 | 12,9 | 9,5 | **5,2** | 9,3 |
| Mevcut devlet renkleri `--d0..d3` | 4 | 18,7 | 9,6 | 7,6 | 8,5 |
| [Oyun kimliği §4.3](oyun-kimligi-harman.md) paleti (6 kromatik) | 6 | 7,5 | 4,1 | **1,5** | **1,8** |
| **Kâğıt ve Çini: 12 oyuncu + Sen (açık)** | 13 | **11,7** | **6,5** | **7,0** | **6,7** |
| **Kâğıt ve Çini: 12 oyuncu + Sen (koyu)** | 13 | 11,7 | 7,1 | 7,0 | 7,2 |

En yakın çiftler (açık tema): Gül kurusu ↔ Sen 6,5 (protan), Kobalt ↔ Sen 6,7 (tritan), Kestane ↔ Çam 7,0 (deutan). Dürüst yorum: 13 rengin tamamı **tek başına** renk körlüğünde garanti ayrışmaz (6,5–7 değeri, komşu büyük alanları ayırır, küçük simgeleri yetersiz bırakır). Bu yüzden her oyuncu renginin sabit bir **emblemi** vardır: ilk altı renk için dolu şekiller (daire, kare, üçgen, eşkenar dörtgen, beşgen, altıgen), sonraki altısı için aynı şeklin **çerçeveli/halka** hâli. Sırayla: Gül kurusu ● · Kestane ■ · Hardal ▲ · Fıstık ◆ · Zeytin ⬟ · Çam ⬢ · Zümrüt ◯ · Kobalt ▢ · Gök △ · Eflatun ◇ · Patlıcan ⬠ · Nar çiçeği ⬡. Haç, ay ve yıldız şekli bilerek kullanılmadı.

**Atama ve kullanım kuralları**
- Sunucu oyuncuya **renk indeksi** (0–11) verir; hex asla saklanmaz (§8, karar 2). Atama: aynı ilçe ve komşu ilçelerde kullanılmayan en küçük indeks; oyuncu 3 öneriden seçer, haftada bir değiştirebilir.
- 12'den fazla komşu oyuncu için 13–24. kimlikler aynı renk + **kesikli kenar** kullanır (renk körü modunda emblem zaten ayırır).
- **"Sen"** her zaman `sen` (= birincil çini) çizilir; başkaları oyuncu renginin **soluk** tonunda, Sahiplik merceği açıkken tam renkte çizilir. "Başkaları seni X rengi/emblemiyle görür" bilgisi profilde yazılır (açık soru, §8 karar 9).
- **Soluk ton** (varsayılan görünüm): kroma × 0,45, açıklık kara'ya %30 yaklaştırılır. Açık tema soluk set: `#AB888C #9A7061 #B99D7C #B8BE93 #908D6C #707E71 #86B198 #6C83A5 #A3BDD6 #A89BC1 #837387 #DAABB6` (kara'ya en az ΔE 17,3; kendi aralarında ≥5,9). Böylece sakin ilke korunur: yalnız "Sen" ve seçili nesne canlıdır.
- **Renk körü modu** (ayar): kenar 2 px'e çıkar, emblem tüm yakınlaştırmalarda gösterilir, fazla kullanılan renkler 8'lik Okabe-Ito alt kümesine eşlenir ve her oyuncu ek **diyagonal tarama açısı** alır (0°, 45°, 90°, 135°). Mini Motorways'in ayrı palet kararı ile aynı yönde ([arama özeti](https://en.wikipedia.org/wiki/Mini_Motorways)).

### 3.6 Katman renkleri (6 katman + Askeri)

Her katman `solid`, `ink` ve `tint` taşır, ayrıca **5 kademeli sıralı rampa** ve ikon (Lucide). Katman renkleri **oyuncu renklerinden bağımsızdır** ve aynı anda tek mercek açık olduğu için haritada çakışmazlar. Çift bazında en kötü ayrım (Sen rengi dahil, 8 renk): açık 10,6 / 6,1 / 7,9 / 7,2 (normal / protan / deutan / tritan; en yakın çift Sanayi ↔ Sen, protan), koyu 10,4 / 7,2 / 5,8 / 6,7 (Sanayi ↔ Sen, deutan).

| Katman (ikon) | Açık `solid` · OKLCH · /yüzey | Açık `ink` · /tint | Açık `tint` | Koyu `solid` · OKLCH · /yüzey | Koyu `ink` · /tint | Koyu `tint` |
|---|---|---|---|---|---|---|
| Tarım (`wheat`) | #B3A74C · 0.72 0.113 102 · 2,4 | #5A5100 · 6,9 | #F1EED7 | #DDC96E · 0.83 0.114 97 · 10,3 | #CFBE72 · 7,7 | #2E2A18 |
| Sanayi (`factory`) | #6E829E · 0.60 0.049 257 · 3,8 | #405168 · 6,9 | #E7EDF6 | #8392B2 · 0.66 0.051 265 · 5,4 | #B0BEDC · 7,7 | #272A31 |
| Lojistik (`truck`) | #5FABC5 · 0.70 0.084 222 · 2,5 | #0B596E · 6,8 | #DDF1F8 | #81D2F0 · 0.82 0.090 224 · 10,1 | #82CAE4 · 7,8 | #1C2D33 |
| Teknoloji (`flask-conical`) | #8B5AB8 · 0.56 0.147 306 · 4,7 | #5E407A · 7,1 | #F2E8FE | #C494F2 · 0.75 0.140 307 · 7,2 | #CEADF0 · 7,5 | #2E2636 |
| Pazar (`store`) | #AF6936 · 0.59 0.111 55 · 4,1 | #783E0E · 7,1 | #FEE8DA | #DE8E67 · 0.72 0.111 46 · 6,6 | #F3AA87 · 7,6 | #37251D |
| Devlet (`landmark`) | #414084 · 0.41 0.111 281 · 8,8 | #414084 · 7,8 | #E9EBFF | #6C74C8 · 0.59 0.128 278 · 4,0 | #AEB8FD · 7,6 | #262939 |
| Askeri (`shield`) | #4B6121 · 0.46 0.094 126 · 6,6 | #445820 · 6,7 | #E8F0DE | #79884A · 0.60 0.088 120 · 4,4 | #B7C68C · 7,8 | #282C1E |

`solid` yalnız dolgu, rampa ve çizgi içindir; açık temada Tarım ve Lojistik `solid` değerleri yüzeyde 3:1'in altında kaldığı için **ikon/metin için `ink` kullanılır**. Devlet açık temada `solid` zaten yeterince koyu olduğundan `ink = solid`.

**Sıralı rampalar** (mercek dolguları; açıklık açıkta 0,94 → 0,46, koyuda 0,30 → 0,82; ardışık kademe ΔE_OK ≥ 9,3 normal, ≥ 8,2 renk körlüğünde)

| Katman | Açık 5 kademe (açıktan koyuya) | Koyu 5 kademe (koyudan açığa) |
|---|---|---|
| Tarım | #EFECD7 #D7D09A #B9AD55 #938500 #635900 | #322E1D #534812 #7E6B00 #AC951B #DAC463 |
| Sanayi | #E6ECF4 #C1CFE2 #98ACC9 #6E85A5 #455975 | #2B2E34 #3F4859 #5E6C89 #8495BA #B3C4E8 |
| Lojistik | #DDEFF6 #A8D6E7 #6DB7D0 #3090AD #00627A | #213036 #204E5E #227691 #3FA3C4 #7BD2F2 |
| Teknoloji | #F0E6FC #DAC1F6 #BE97E6 #996AC5 #6A4190 | #322A3A #523C68 #7E57A1 #AC7CD8 #D7B0FF |
| Pazar | #FBE7DA #F3C2A2 #E09866 #BD6B2D #874300 | #3A2A22 #673B25 #9E5530 #D47A4D #FFAE87 |
| Devlet | #E7E9FE #C5C9FC #9FA3EE #7678CD #4E4D97 | #2A2C3D #3E4371 #5C63AF #818BEA #B5BFFF |
| Askeri | #E7EEDD #C4D5AC #9CB675 #738F43 #4A611C | #2C3023 #444C29 #657337 #8D9F55 #BCCE89 |

Bugünkü Sanayi (mor-gri) ve Pazar (hardal) rampaları bu yeni rampalarla, Tarım toprak rampası (`--t0..t4`) yeşil-sarı Tarım rampasıyla değişir.

**Yapı → katman rengi** (18 yapı + 2, [arsa-ve-insa §3.2](arsa-ve-insa-derinlestirme.md)): haritada yapı simgesinin dolgusu, 3B'de tente/çatı kenarı bu renkle çizilir; böylece oyuncu rengi (sahip) ve katman rengi (iş) ayrı kanallardır.

| Katman | Yapılar |
|---|---|
| Tarım | Tarla, Ahır, Mera, Sulama, Gıda fabrikası, Gübre fabrikası |
| Sanayi | Maden ocağı, Petrol kuyusu, Çelikhane, Parça atölyesi, Elektronik, Santral |
| Lojistik | Ambar, Garaj |
| Teknoloji | Atölye-Lab |
| Pazar | Ticaret ofisi |
| Askeri | Mühimmat fabrikası, Ordugâh |
| Devlet | Muhtarlık |
| (katman dışı: nötr ink) | Konut |

**Mal renkleri sadeleşir.** Bugün 13 mal için 13 doygun renk var (`veri/renkler.ts: MAL_RENK_HEX`, `#e0b000` … `#c2388f`). Öneri: **mal = ikon + üreten katmanın rengi** (tahıl, gıda, gübre → Tarım; cevher, kömür, çelik, bakır, silis, parça, elektronik, petrol, yakıt → Sanayi; mühimmat → Askeri). Ayırt etme işini renk değil ikon yapar (Lucide: `wheat`, `utensils`, `sprout`, `pickaxe`, `flame`, `anvil`, `cog`, `cpu`, `droplets`, `fuel`, `zap`, `crosshair` doğrulandı; bakır ve silis için özel ikon çizilir). Bilinmeyen mal kimliği için türetilen HSL yedeği (`hslHex`) kaldırılır; yedek nötr ink'tir.

### 3.7 Rozet ve sahiplik durumları

**Rozet** (tek rozet kuralı: [arayuz-ux §2](arayuz-ux.md)). Öncelik: savaş > eksik girdi > boşta > bitti. Eski Okabe-Ito rozetleri (turuncu `#e69f00`, bluish green, pembe) iyi renk körlüğü ayrımı veriyordu (15,6 / 9,6 / 7,6 / 8,5) ama bölge dolgusuna uyarlanmadan doygun kalmış ve eski harita karası `#f1efe8` üstünde üçü 3:1'in altındaydı (turuncu 1,96:1, bluish green 2,97:1, pembe 2,66:1). Yeni eşleme durum ailelerinden gelir; **boşta nötr gridir** (sorun değil, fırsat) ve **eksik girdi** rozeti `uyari.solid`den biraz açık bir amber kullanır (L 0,60; hata ile deuteranopide ayrışsın diye). En kötü ayrım açık 10,6 / 7,0 / 5,2 / 6,9, koyu 13,3 / 6,0 / 5,1 / 11,0; şekil zaten zorunludur.

| Rozet | Şekil | Açık dolgu | Kara üstünde WCAG | Koyu dolgu | Kara üstünde WCAG | Aile |
|---|:-:|---|:-:|---|:-:|---|
| savaş | ⚔ | #B53434 | 5,2 | #FB756E | 5,9 | hata |
| eksik girdi | ▲ | #A77600 | 3,5 | #E0AE5D | 7,8 | uyarı (biraz açık amber) |
| boşta | ◯ | #5F6B75 | 4,8 | #838E97 | 4,7 | nötr (`murekkep-3`) |
| bitti | ✓ | #257B51 | 4,5 | #67B98B | 6,6 | başarı |

**Sahiplik durumları** (L2–L3 haritası)

| Durum | Dolgu | Kenar | Ek işaret |
|---|---|---|---|
| **Sen** | `sen` α 0,42 | 2 px `sen` + 1 px kâğıt iç çizgi | hücre kümesi köşesinde küçük flama; yürüyüşte direkli bayrak |
| Başkası (varsayılan) | oyuncu **soluk** tonu α 0,55 | 1 px aynı ton (α 0,8) | hover'da ad + emblem |
| Başkası (Sahiplik merceği) | oyuncu tam rengi α 0,50 | 1,4 px `kenar` | z ≥ 16'da kümenin ağırlık merkezinde emblem |
| Satılık / boş | arsa türü rengi (§4.3) | yok | hover: mürekkep α 0,08 |
| Alınamaz (su, yol, askerî, engel) | `arsa-engel` (kara + %10 mürekkep) | yok | imleç `not-allowed` + ipucunda neden; **tarama yalnız** yüksek kontrast modunda ve göstergede |
| Hover | mürekkep α 0,08 | 1,5 px mürekkep α 0,6 | – |
| Seçili | mürekkep α 0,10 | 2 px `murekkep` + 1 px kâğıt iç çizgi | alt çubukta sayı |

Seçim rengi bilinçli olarak **nötr mürekkeptir**: bugünkü turuncu `#e69f00` (`--harita-secim`) Hardal oyuncu rengiyle ve eski turuncu tonlarla karışırdı.

### 3.8 [Oyun kimliği §4.3](oyun-kimligi-harman.md) paletinin denetimi

Bu paletin altında "kontrast ölçülmedi" notu vardı. Ölçüm:

| Öneri | Hex (OKLCH) | Ölçüm | Karar |
|---|---|---|---|
| Kâğıt | `#F4EFE6` (0,95 0,013 82) | zemin olarak uygun | `zemin #F5F2EC` (kroma 0,009: biraz daha nötr; yüzey `#FCFAF6`) |
| Mürekkep | `#23303A` (0,30 0,025 242) | kâğıtta 11,8:1 | Korunur, biraz koyulaştı: `#1A2731` (13,6:1) |
| Çini turkuazı | `#1F8A8A` (0,58 0,091 195) | kâğıtta **3,62:1**, beyaz metinle **4,15:1** | Metin/düğme için yetersiz → `#007783` (beyaz üstü 5,3:1; yüzeyde 5,1:1). Çini ↔ çelik **deuteranopide ΔE 1,5**, çini ↔ Marmara tritanopide 1,8 |
| Kiremit | `#C2603A` | kâğıtta 3,65:1; beyaz 4,18:1 | `#A14E1C` (beyaz üstü 5,8:1) |
| Buğday | `#D8B04A` | kâğıtta **1,79:1** | Dolgu ve rampa için kalır; metin/ikon için Tarım `ink #5A5100` (6,9:1) |
| Çayır | `#5E9B5A` | kâğıtta **2,90:1** (3:1 altı) | Başarı `solid #257B51` (5,0:1) |
| Marmara mavisi | `#4A7FB0` | kâğıtta 3,70:1 | Bilgi `solid #2D6CA8` (5,3:1); Lojistik `solid #5FABC5` + `ink #0B596E` |
| Çelik | `#6B7782` | 4,00:1 | Sanayi `solid #6E829E` + `ink #405168` |

### 3.9 Erişilebilirlik modları

`prefers-color-scheme` ve elle tema (otomatik / açık / koyu); `prefers-contrast: more` → çizgi ve metin bir kademe güçlenir (`cizgi` → `cizgi-guclu`, `murekkep-2` → `murekkep`), alınamaz hücrede tarama açılır; `forced-colors: active` → sistem renkleri, haritada kenarlar korunur; "Renk körü modu" ayarı (§3.5); arayüz ölçeği %90–130 ([arayuz-ux §7](arayuz-ux.md)); Anno 117 aynı üç renk körlüğü modunu sunar ([Ubisoft](https://news.ubisoft.com/en-us/article/2FfSSEUp1jtg9isC9NxowP/anno-117-pax-romana-accessibility-spotlight)).


---

## 4. Harita kartografisi

Bu bölüm [arayuz-ux §1](arayuz-ux.md) düzeylerini ve [harita-istemci](harita-istemci.md) / [yuru-istemci](yuru-istemci.md) mimarisini olduğu gibi alır; yalnız **ne çizileceğini ve nasıl görüneceğini** belirler. Renk değerleri OKLCH'den üretilmiş hex'tir (§3.1), **ekranda kalibre edilmemiş başlangıç değerleridir**.

### 4.1 Kartografik ilkeler

1. **Figür–zemin.** Harita zemini ([CARTO](https://carto.com/blog/new-voyager-basemap/) gibi) sakin ve sıkıştırılmış açıklık aralığındadır; oyunun asıl nesneleri (arsa sahipliği, yapı, rozet) bu zeminin **üstünde** canlıdır.
2. **Üç kademeli hiyerarşi.** Ön plan: Sen, seçili, rozet. Orta plan: başkalarının mülkü, yapılar, etiketler. Arka plan: arazi, su, yol, sınır.
3. **Sınır hiyerarşisi desenle kurulur** (düz → kesik → noktalı), yalnız renk/kalınlıkla değil; gri tonlamada ve renk körlüğünde de okunur.
4. **Yoğunluk yakınlaşmaya bağlıdır** ([arayuz-ux §1](arayuz-ux.md) "her düzey yalnız kendi bilgisini gösterir"): etiket ve ayrıntı sayısı zoom ile artar, sabit üst sınırlarla sınırlanır (§4.5).
5. **Arsa türü bilgidir, dekor değil.** L3'te arsa türü renkleri ayrı bir "arsa" paletidir (L2'nin bağlam renklerinden bir kademe daha ayrışık).
6. **Gölge/kabartma ve su kıyısı tek hamlede derinlik verir**; doku, desen ve parıltı yoktur.

### 4.2 Düzeylere göre özet

Zoom aralıkları koda göre: `fitBounds` il için `maxZoom 11`, ilçe için `14.2`; `L3_ZOOM = 15`; ızgara çizgisi `z ≥ 16`; harita `maxZoom 19.5`.

| Düzey | Çizici | Yakınlaşma | Zemin ve arazi | Yapılar ve yollar | Sınırlar | Etiket üst sınırı | Sahiplik ve rozet |
|---|---|---|---|---|---|---|---|
| **L0 Küre** | three.js | kamera uzaklığı > 0,9 | okyanus + kara düz renk, kıyı çizgisi, kutup; ince atmosfer halkası | – | bölge çizgisi (kâğıt rengi) | 4–14 (mevcut `etiketSayisi`) | devlet/oyuncu rengi; bölge başına tek rozet |
| **L1 İl** | MapLibre | z ≈ 5 – 9,5 | su (arka plan), dış kara, kara, **kıyı bandı**, kabartma | otoyol + ana yol (z ≥ 7) | ülke (düz), il (düz) | 18 il adı | il başına tek toplu rozet |
| **L2 İlçe** | MapLibre | z ≈ 9,5 – 14,9 | + orman, tarım, park, yerleşim, sanayi, akarsu | + ara yol, demiryolu, bina (z ≥ 14,5) | il (düz), ilçe (kesik) | 24 ilçe adı | ilçe başına sayı rozeti; fiyat ısısı merceği |
| **L3 Arsa** | MapLibre | z ≥ 15 | arsa mozaiği (şerit hücreleri, §4.3) | + sokak, patika, bina kenarı (z ≥ 16) | + mahalle (noktalı) | 20 mahalle/sokak adı | Sen / başkası dolgu + kenar, yapı simgesi + tek rozet |
| **L4 Sokak** | three.js | "Sokakta yürü" | düz zemin (aynı `harita-kara`) | 3B bina, yol, kaldırım | arsa kenarı, bayrak | tek DOM etiketi | halka, bayrak, `[E]` hap |

### 4.3 Renk token'ları (harita)

Token adları `--harita-*` ön ekli CSS değişkenleridir; "Ölçüt" sütunu kara'ya renk farkını (ΔE_OK), sınırlar için kara üstünde WCAG oranını, etiketler için kara üstünde WCAG oranını verir.

| Token (`harita-…`) | Açık hex | Açık OKLCH | Koyu hex | Koyu OKLCH | Ölçüt (açık / koyu) |
|---|---|---|---|---|---|
| **Zemin ve su** | | | | | |
| `kara` | #F3EFE5 | 0.95 0.014 89 | #1E2428 | 0.26 0.012 237 | ΔE 0,0 / 0,0 (kara'ya) |
| `dis-kara` | #E5E3DC | 0.92 0.010 94 | #161A1D | 0.21 0.008 240 | ΔE 3,7 / 4,1 (kara'ya) |
| `su` | #B9D7E3 | 0.86 0.036 224 | #051823 | 0.20 0.034 236 | ΔE 10,3 / 6,1 (kara'ya) |
| `su-derin` | #ACCBDA | 0.82 0.039 229 | #02121D | 0.17 0.033 238 | ΔE 13,8 / 8,5 (kara'ya) |
| `sig-su-kiyi` | #C8E1EB | 0.89 0.030 224 | #071E29 | 0.22 0.036 232 | ΔE 7,1 / 4,1 (kara'ya) |
| `kiyi-cizgisi` | #94B0BC | 0.74 0.035 226 | #374B55 | 0.40 0.030 230 | ΔE 21,7 / 14,5 (kara'ya) |
| **Arazi örtüsü** | | | | | |
| `orman` | #C1DEC0 | 0.87 0.051 144 | #1A3020 | 0.29 0.041 152 | ΔE 9,3 / 5,1 (kara'ya) |
| `park-yesil` | #CFE8CA | 0.90 0.048 140 | #203322 | 0.30 0.039 147 | ΔE 6,3 / 5,9 (kara'ya) |
| `tarim` | #EAE6C0 | 0.92 0.050 102 | #2E2C18 | 0.29 0.033 103 | ΔE 5,0 / 5,4 (kara'ya) |
| `yerlesim` | #EDE6DD | 0.93 0.014 74 | #24282C | 0.27 0.009 248 | ΔE 2,5 / 1,9 (kara'ya) |
| `sanayi-alan` | #D9DEE6 | 0.90 0.012 260 | #23252C | 0.27 0.013 273 | ΔE 5,9 / 1,2 (kara'ya) |
| `kum-plaj` | #F0E6C9 | 0.93 0.040 91 | #332D1F | 0.30 0.025 87 | ΔE 3,7 / 5,6 (kara'ya) |
| `kayalik-dag` | #E4DFD7 | 0.91 0.012 80 | #272B2E | 0.29 0.008 240 | ΔE 4,7 / 3,0 (kara'ya) |
| **Yapılar** | | | | | |
| `bina` | #E2D5CA | 0.88 0.021 63 | #2D3237 | 0.31 0.011 248 | ΔE 7,3 / 5,8 (kara'ya) |
| `bina-kenar` | #C7B7AB | 0.79 0.025 59 | #3E454B | 0.39 0.014 244 | ΔE 16,4 / 13,0 (kara'ya) |
| **Yollar** | | | | | |
| `yol-otoyol-dolgu` | #FDFCF9 | 0.99 0.004 91 | #615A4E | 0.47 0.021 81 | ΔE 4,0 / 21,7 (kara'ya) |
| `yol-otoyol-kasa` | #BFA892 | 0.75 0.041 66 | #151A1F | 0.21 0.012 248 | ΔE 20,9 / 4,1 (kara'ya) |
| `yol-ana-dolgu` | #FEFDFB | 0.99 0.003 – | #484E53 | 0.42 0.011 243 | ΔE 4,3 / 16,4 (kara'ya) |
| `yol-ana-kasa` | #CBBFB0 | 0.81 0.025 74 | #151A1F | 0.21 0.012 248 | ΔE 14,3 / 4,1 (kara'ya) |
| `yol-ara-dolgu` | #FFFFFF | 1.00 0.000 – | #3E4347 | 0.38 0.010 242 | ΔE 5,0 / 12,4 (kara'ya) |
| `yol-ara-kasa` | #D8D2C7 | 0.87 0.016 83 | #171C21 | 0.22 0.012 248 | ΔE 8,7 / 3,3 (kara'ya) |
| `yol-sokak-kasa` | #DFDAD2 | 0.89 0.012 80 | #191F23 | 0.23 0.012 237 | ΔE 6,2 / 2,1 (kara'ya) |
| `patika` | #BEAE9D | 0.76 0.030 69 | #555C61 | 0.47 0.012 239 | ΔE 19,4 / 21,4 (kara'ya) |
| `demiryolu` | #959CA2 | 0.69 0.012 244 | #595E63 | 0.48 0.010 248 | ΔE 26,5 / 22,3 (kara'ya) |
| **Sınırlar** | | | | | |
| `sinir-ulke` | #856E6D | 0.56 0.029 21 | #B08F8C | 0.68 0.040 24 | WCAG 4,1 / 5,3 |
| `sinir-il` | #9B8780 | 0.64 0.027 40 | #8B7971 | 0.59 0.025 45 | WCAG 3,0 / 3,8 |
| `sinir-ilce` | #B0AAA0 | 0.74 0.016 81 | #565F66 | 0.48 0.016 241 | WCAG 2,0 / 2,4 |
| `sinir-mahalle` | #C2BDB5 | 0.80 0.012 80 | #42484E | 0.40 0.013 248 | WCAG 1,6 / 1,7 |
| **Etiketler** | | | | | |
| `etiket-il` | #2F3C47 | 0.35 0.026 244 | #E2DED5 | 0.90 0.013 87 | WCAG 9,8 / 11,7 (kara üstünde) |
| `etiket-ilce` | #45515C | 0.43 0.024 246 | #C2BDB4 | 0.80 0.014 82 | WCAG 7,1 / 8,4 (kara üstünde) |
| `etiket-mahalle` | #5A656E | 0.50 0.020 243 | #97A0A7 | 0.70 0.015 241 | WCAG 5,2 / 5,9 (kara üstünde) |
| `etiket-su` | #2F647E | 0.48 0.070 232 | #78A6BE | 0.70 0.061 231 | WCAG 5,6 / 6,0 (kara üstünde) |
| `etiket-yol` | #62594F | 0.47 0.020 70 | #8B939A | 0.66 0.014 244 | WCAG 6,0 / 5,0 (kara üstünde) |
| `halo` | #FCFAF6 | 0.99 0.006 85 | #12171B | 0.20 0.011 242 | ΔE 3,4 / 5,5 (kara'ya) |

**Kıyı bandı, kabartma ve diğer ince ayarlar:** kabartma gölgesi açık `#8E7D6A` / vurgu `#FEFDFA` / yüzey `#B6ACA1` (yoğunluk 0,35), koyu `#01060C` / `#434F57` / `#000205` (0,50). Izgara çizgisi: açık `rgba(104, 115, 125, 0.16)`, koyu `rgba(209, 205, 199, 0.12)`.

**L3 arsa türü mozaiği.** Mevcut `seritRengi()` altı sınıfı (tarla, sanayi, konut, orman, yapılı, diğer) ve su bitini ayrı renkle boyar. Arsa türü oyun bilgisi olduğu için bu renkler L2 bağlam renklerinden **bir kademe daha ayrışıktır** (açık: kara'dan ΔE_OK ≥ 6,7, aralarında ≥ 5,3, renk körlüğünde ≥ 3,3; koyu: kara'dan ≥ 6,7, aralarında ≥ 6,1, renk körlüğünde ≥ 4,5) ve ayrışmayı bilgi kanalları (ipucu, kart, sınıf adı) tamamlar:

| Token (`arsa-…`) | Açık hex | Açık OKLCH | Koyu hex | Koyu OKLCH | Kara'ya ΔE (açık / koyu) |
|---|---|---|---|---|---|
| diğer (boş kara) = `harita-kara` | #F3EFE5 | 0.95 0.014 89 | #1E2428 | 0.26 0.012 237 | 0,0 / 0,0 |
| su = `harita-su` | #B9D7E3 | 0.86 0.036 224 | #051823 | 0.20 0.034 236 | 10,3 / 6,1 |
| tarla | #E1E2B7 | 0.90 0.057 109 | #393B13 | 0.34 0.059 112 | 6,7 / 10,8 |
| sanayi | #D8DCF9 | 0.90 0.040 279 | #313F52 | 0.36 0.038 256 | 7,5 / 11,1 |
| konut | #ECD2C7 | 0.88 0.033 44 | #543F32 | 0.39 0.036 53 | 7,4 / 13,9 |
| orman | #ACCDB3 | 0.82 0.051 151 | #14331B | 0.29 0.057 149 | 14,3 / 6,7 |
| yapılı | #C0AF9A | 0.76 0.035 73 | #615245 | 0.45 0.029 63 | 19,1 / 19,8 |
| engel (alınamaz) | #E8E4DB | 0.92 0.013 87 | #151A1F | 0.21 0.012 248 | kara + %10 mürekkep (ΔE 3,3 / 4,1) |

### 4.4 Katman katman stil

Sıra aşağıdan yukarıya. Genişlik değerleri piksel; "üstel 1,6" [Protomaps](https://raw.githubusercontent.com/protomaps/basemaps/main/styles/src/base_layers.ts) yol genişlik eğrisinin tabanıdır.

| # | Katman | Kaynak ve filtre | Boya | Zoom davranışı |
|---|---|---|---|---|
| 1 | `zemin` (deniz) | arka plan | `harita-su` | – |
| 2 | `kiyi-bandi` (sığ su) | `dunya` kıyı çizgisi, **kara dolgularının altında** (suya düşen yarısı görünür) | `harita-sig-su-kiyi`; `line-width` z4: 4, z8: 12, z12: 22; `line-blur` z4: 3, z12: 10 | z ≥ 4 |
| 3 | `dis-kara` | `dunya` (komşu ülkeler) | `harita-dis-kara` | z ≤ 9 tam, z 9–11 α 1→0,6 |
| 4 | `kara` | `iller` | `harita-kara` | – |
| 5 | `kabartma` | `dem` (raster-dem) | `hillshade-method: "basic"`, `hillshade-illumination-direction: 315`, gölge/vurgu/yüzey renkleri §4.3, yoğunluk 0,35 | z 5 → 14; **A4 aşaması**, DEM kaynağı ayrı karar |
| 6 | `orman`, `park-yesil`, `tarim`, `kum-plaj`, `yerlesim`, `sanayi-alan` | altlık `landcover` (`forest`, `farmland`, `urban_area`…) ve `landuse` (`park`, `industrial`, `beach`…) | token renkleri, `fill-opacity` z6: 0 → z9: 1 | z ≥ 6 |
| 7 | `su` ve `akarsu` | altlık `water`; akarsu çizgisi `kind: river` | `harita-su`; akarsu `harita-su-derin`, genişlik z9: 0,6 → z14: 2,2 | göl/akarsu z ≥ 9 |
| 8 | `bina` | altlık `buildings` | dolgu `harita-bina`, kenar `harita-bina-kenar` 0,5 px | dolgu z 14,5 → 15,5 α 0 → 1; kenar z ≥ 16 |
| 9 | `yol-*-kasa`, `yol-*-dolgu` | altlık `roads`, `kind`: `highway`, `major_road`, `medium_road`, `minor_road`, `path` | §4.4.1 | z ≥ 7 (otoyol) … z ≥ 13 (sokak) |
| 10 | `demiryolu` | `kind: rail` | `harita-demiryolu`, `line-dasharray [3, 3]`, α 0,6 | genişlik z8: 0,4 → z16: 1,8 |
| 11 | `sinir-*` | §4.4.2 | – | – |
| 12 | `izgara`, `sahiplik`, `secim`, `yapi-*` | mevcut kaynaklar (`seritler`, `arsalar`, `yapilar`, `sahiplik`) | §3.7, §4.4.3 | z ≥ 15–16 |
| 13 | etiketler | §4.5 | – | – |

Protomaps şemasının `kind` değerleri `base_layers.ts` filtrelerinden alındı (ör. `landuse`: `park`, `industrial`, `beach`, `forest`, `wood`, `scrub`; `landcover`: `grassland`, `barren`, `urban_area`, `farmland`, `forest`); şema sürümüne bağımlıdır (§8, karar 8). Altlık L1–L2 için Türkiye'yi z0–z12'de kapsayan bir PMTiles çıkarımı gerektirir; mevcut dosya yalnız Gebze z15'tir (boyutu **ölçülmedi**).

#### 4.4.1 Yol hiyerarşisi (başlangıç değerleri)

Genişlik `interpolate`, taban 1,6; kasa (kenar) genişliği dolgudan z ≥ 13'te toplam +1,2 px fazladır (z ≤ 12'de eşit). Genişlik ifadesinde `zoom` yalnız en üstte olabildiğinden kasa genişlikleri ayrı dizi olarak üretilir (yardımcı `yolGenisligi(kademeler, ek)`).

| Sınıf (Protomaps `kind`) | z7 | z10 | z12 | z14 | z16 | z18 | Dolgu | Kasa |
|---|:-:|:-:|:-:|:-:|:-:|:-:|---|---|
| Otoyol (`highway`) | 0,8 | 1,6 | 2,6 | 5 | 10 | 20 | `yol-otoyol-dolgu` | `yol-otoyol-kasa` |
| Ana yol (`major_road`) | – | 0,5 | 1,2 | 3 | 7 | 15 | `yol-ana-dolgu` | `yol-ana-kasa` |
| Ara yol (`medium_road`) | – | – | 0,5 | 1,6 | 4,5 | 11 | `yol-ara-dolgu` | `yol-ara-kasa` |
| Sokak (`minor_road`) | – | – | – | 0,8 | 3 | 8 | `yol-ara-dolgu` | `yol-sokak-kasa` |
| Patika (`path`) | – | – | – | – | 0,8 | 1,6 | `patika`, `line-dasharray [2, 2]` | yok |
| Demiryolu (`rail`) | z8: 0,4 | – | – | – | 1,8 | – | `demiryolu` kesikli | yok |

Hiyerarşi **üç kanalla** kurulur: genişlik, kasa koyuluğu ve beyazlık (otoyol en koyu kasa, sokak en açık). Koyu temada ters: yol dolgusu zeminden açık, kasa zeminden koyu (sıra: otoyol `#615A4E`, ana `#484E53`, ara/sokak `#3E4347`).

#### 4.4.2 Sınırlar

| Sınır | Çizgi | Genişlik | Renk | Görünürlük |
|---|---|---|---|---|
| Ülke | düz | z5: 0,9 → z12: 1,4 | `sinir-ulke` | tüm z |
| İl | düz | z5: 0,8 → z9: 1,2 → z12: 1,6 | `sinir-il` | z ≥ 5; z ≥ 14'te α 0,5 |
| İlçe | **kesik** `[4, 2]` | z8: 0,5 → z12: 1,0 → z15: 1,4 | `sinir-ilce` | z ≥ 8 |
| Mahalle | **noktalı** `[1, 2.5]`, yuvarlak uç | z12: 0,5 → z16: 1,0 | `sinir-mahalle` | z ≥ 12 |
| Seçili il/ilçe | düz | 2 | `murekkep` | + seçili olmayanların üstüne **kâğıt örtü** (`harita-kara` α 0,45), odak etkisi |

Seçili ilçe dolgusu bugünkü mavi `rgba(31, 95, 191, 0.08)` yerine yok; vurgu kenar + diğerlerinin soluklaşmasıdır.

**Bilinçli istisna:** ilçe (2,0:1) ve mahalle (1,6:1) sınırları kara üstünde 3:1'in altındadır (§4.3). Bunlar ikincil bağlam çizgileridir; aynı bilgi ilçe/mahalle etiketi, kırıntı yolu ve hover ipucuyla da verilir (WCAG 1.4.11'in "anlamak için gerekli grafik" tanımının dışında tutuldu); `prefers-contrast: more` kipinde bu iki çizgi `cizgi-guclu`ya çıkar.

#### 4.4.3 Izgara, sahiplik ve yapı

- `izgara-cizgi`: z ≥ 16, 0,6 px, `harita-izgara`.
- `serit-dolgu`: arsa türü renkleri (§4.3); `serit-engel`: **tarama kaldırılır**, yerine düz `arsa-engel`; `fill-pattern: "tarali"` yalnız `prefers-contrast: more` ve gösterge kutusunda.
- `sahiplik-dolgu` / `sahiplik-cizgi`: §3.7 tablosu; `fill-layer-opacity` kullanılır (MapLibre 5.24 stil spesifikasyonunda var; üst üste binen dolgularda alfa birikmesini önler).
- `yapi-dolgu`: yapının **katman rengi**; aşama 0–3 için `fill-opacity` 0,25 / 0,45 / 0,65 / 1; kenar kesikliden düze ([arsa-ve-insa §4.7](arsa-ve-insa-derinlestirme.md) dört dilim halka simgesi ile birlikte). Tamamlanmış yapıda tek nabız (mevcut).
- `secim-*`: mürekkep (§3.7); bugünkü turuncu kalkar.

### 4.5 Etiketler: hiyerarşi, yoğunluk, Türkçe

| Sınıf | Düzey | Boyut | Ağırlık | Renk | İz aralığı | Üst sınır / kural |
|---|---|---|---|---|---|---|
| Komşu ülke | L0–L1 | 11 → 13 | 500 | `etiket-mahalle` | +0,06 em | ≤ 3 |
| **İl adı** | L1 (z 5–9,5) | 12 → 15 | 600 | `etiket-il` | +0,01 em | ≤ 18, nüfusa göre öncelik; z 9,5–10,5 arasında α 1 → 0 (yerine kırıntı yolu) |
| **İlçe adı** | L2 | 12 → 14 | 500 (seçili 600) | `etiket-ilce` | 0 | ≤ 24, çarpışmada seçili > Sen mülkü olan > nüfus |
| Mahalle | L3 | 11 → 13 | 500 | `etiket-mahalle` | +0,02 em | ≤ 20 |
| Sokak adı | L3, z ≥ 16,5 | 11 | 400 | `etiket-yol` | +0,02 em | ≤ 12, çizgi boyunca |
| Su adı | L1–L3 | 12 → 13 | 500 | `etiket-su` | +0,08 em | ≤ 4 (italik yok: tek yazı tipi dosyası) |
| Yapı / arsa etiketi | L3 hover, seçili | 12 | 600 | `murekkep` | 0 | tek etiket |

- **Yazı biçimi:** "Kelime başı büyük", **tümü büyük harf yok.** Halo: koyu/açık temada `harita-halo` 1,5 px, α 0,9 (Felt'in "zemine göre halo" kuralı). Çok satırlı etiketlerde `text-max-width` 7–10 em.
- **Türkçe büyük harf tuzağı (doğrulandı).** MapLibre 5.24 paketinde `text-transform` `toLocaleUpperCase()` ile çalışır, **yerel dil argümanı olmadan**: yani tarayıcının varsayılan dili kullanılır, sayfanın `lang="tr"` değeri değil. Tarayıcı dili Türkçe olmayan oyuncuda "Bilecik" → "BILECIK" çıkar (doğrusu "BİLECİK"). `["upcase"]` ifadesi `toUpperCase()` kullandığı için aynı hatayı verir. Protomaps'in `places_subplace` ve `places_region` katmanları `uppercase` kullanır: **doğrudan kopyalanmamalı.** Çözüm: büyük harf yok; gerekirse veri hattında `toLocaleUpperCase('tr')` ile önceden üretilmiş `ad_buyuk` alanı.
- **DOM etiketi mi, MapLibre `symbol` katmanı mı?** Bugün etiketler DOM işaretçisidir (`ilce-etiket`). Artı: aynı web yazı tipi, CSS ile tam kontrol, glyph dosyası yok. Eksi: çarpışma denetimi elle, yüzlerce etiketten sonra pahalı. `symbol` katmanı çarpışmayı ve çizgi boyunca yerleşimi ücretsiz verir ama **glyph PBF** ister. Ölçüm (Protomaps barındırması, Noto Sans Regular): `0-255` = 74 KB (45 KB gzip), `256-511` = 125 KB (61 KB gzip); Türkçe için gerekli iki aralık ≈ **106 KB gzip** (₺ yalnız `8192-8447` aralığında, 42 KB gzip; haritada ₺ etiketi gerekmez). Kendi Inter alt kümemizden üretilecek glyph dosyası bunun çok altında olur (≈100 glif; **üretilmedi, ölçülmedi**). Öneri: **L1–L3'te DOM etiketleri sürer** (sayı ≤ 24), `symbol` katmanına geçiş A4'te sokak adları gerekirse yapılır (§8, karar 4).

### 4.6 Stil JSON'u (açık tema, kırpılmış)

Aşağıdaki iskelet `haritaStili(tema)` işlevinin ürettiği JSON'un ilk katmanlarıdır; renkler token'lardan gelir, koyu tema yalnız farklı token seti verir. Mevcut `stil()` bu yapıya genişler.

```jsonc
{
  "version": 8,
  "sources": {
    "dunya":   { "type": "geojson", "data": "<dunya-ulkeler>" },
    "iller":   { "type": "geojson", "data": "<iller>", "promoteId": "kimlik" },
    "ilceler": { "type": "geojson", "data": "<bos>",  "promoteId": "kimlik" },
    "altlik":  { "type": "vector",  "url": "pmtiles://<turkiye-z0-15>" },
    "dem":     { "type": "raster-dem", "url": "pmtiles://<dem>", "tileSize": 512 }   // A4; kodlama kaynağa göre
  },
  "layers": [
    { "id": "zemin", "type": "background", "paint": { "background-color": "#B9D7E3" } },
    { "id": "kiyi-bandi", "type": "line", "source": "dunya",
      "paint": { "line-color": "#C8E1EB",
                 "line-width": ["interpolate", ["linear"], ["zoom"], 4, 4, 8, 12, 12, 22],
                 "line-blur":  ["interpolate", ["linear"], ["zoom"], 4, 3, 12, 10] } },
    { "id": "dis-kara", "type": "fill", "source": "dunya", "paint": { "fill-color": "#E5E3DC" } },
    { "id": "kara", "type": "fill", "source": "iller", "paint": { "fill-color": "#F3EFE5" } },
    { "id": "kabartma", "type": "hillshade", "source": "dem", "minzoom": 5, "maxzoom": 14,
      "paint": { "hillshade-method": "basic", "hillshade-illumination-direction": 315,
                 "hillshade-exaggeration": 0.35, "hillshade-shadow-color": "#8E7D6A",
                 "hillshade-highlight-color": "#FEFDFA", "hillshade-accent-color": "#B6ACA1" } },
    { "id": "orman", "type": "fill", "source": "altlik", "source-layer": "landcover",
      "filter": ["==", ["get", "kind"], "forest"],
      "paint": { "fill-color": "#C1DEC0", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 9, 1] } },
    { "id": "tarim", "type": "fill", "source": "altlik", "source-layer": "landcover",
      "filter": ["==", ["get", "kind"], "farmland"],
      "paint": { "fill-color": "#EAE6C0", "fill-opacity": ["interpolate", ["linear"], ["zoom"], 6, 0, 9, 1] } },
    { "id": "su", "type": "fill", "source": "altlik", "source-layer": "water", "paint": { "fill-color": "#B9D7E3" } },
    { "id": "yol-ana-kasa", "type": "line", "source": "altlik", "source-layer": "roads",
      "filter": ["==", ["get", "kind"], "major_road"], "layout": { "line-cap": "round", "line-join": "round" },
      "paint": { "line-color": "#CBBFB0",
                 "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 0.5, 12, 1.2, 14, 4.2, 16, 8.2, 18, 16.2] } },
    { "id": "yol-ana-dolgu", "type": "line", "source": "altlik", "source-layer": "roads",
      "filter": ["==", ["get", "kind"], "major_road"], "layout": { "line-cap": "round", "line-join": "round" },
      "paint": { "line-color": "#FEFDFB",
                 "line-width": ["interpolate", ["exponential", 1.6], ["zoom"], 10, 0.5, 12, 1.2, 14, 3, 16, 7, 18, 15] } },
    { "id": "sinir-il", "type": "line", "source": "iller",
      "paint": { "line-color": "#9B8780", "line-width": ["interpolate", ["linear"], ["zoom"], 5, 0.8, 9, 1.2, 12, 1.6] } },
    { "id": "sinir-ilce", "type": "line", "source": "ilceler", "minzoom": 8,
      "paint": { "line-color": "#B0AAA0", "line-dasharray": [4, 2],
                 "line-width": ["interpolate", ["linear"], ["zoom"], 8, 0.5, 12, 1.0, 15, 1.4] } },
    { "id": "sahiplik-sen-dolgu", "type": "fill", "source": "sahiplik", "minzoom": 13,
      "filter": ["==", ["get", "ben"], 1],
      "paint": { "fill-color": "#007783", "fill-layer-opacity": 0.42 } },
    { "id": "sahiplik-sen-cizgi", "type": "line", "source": "sahiplik", "minzoom": 13,
      "filter": ["==", ["get", "ben"], 1], "paint": { "line-color": "#007783", "line-width": 2 } }
  ]
}
```

Kasa dizisi, dolgu dizisine z ≥ 13'te +1,2 px ekleyerek **kod tarafında** üretilir (ana yol z14: 3 + 1,2 = 4,2; z12'de kasa dolguya eşittir, yani görünmez).

### 4.7 L0 küre

Bugünkü `--sahne-*` değişkenleri aynı adlarla kalır, değerleri değişir (tablo aşağıda). Kurallar: (1) **uzay zemini kâğıt rengidir** (`sahne-uzay`), siyah uzay yok; kara ve okyanus **haritayla aynı değerlerdir** (`sahne-kara` = `harita-kara`, `sahne-okyanus` = `harita-su`), böylece küre → harita geçişinde renk sıçraması olmaz; ilk izlenim "kâğıt üzerinde bir dünya"dır; (2) kıyı çizgisi `harita-kiyi-cizgisi` (açık α 0,9), il/bölge sınırı `sinir-il` α 0,55, bölgeler arası çizgi `yuzey` α 0,9; bugünkü koyu kıyı "gölge" bandı ve kenar ışığı kaldırılır (kenar ışığı yalnız atmosfer halkasıdır, güç 0,25); (3) yıldız yok (açık tema zaten 0; koyuda da 0 → "sakin"); (4) devlet/oyuncu dolgusu §3.5'teki soluk/tam kuralını izler: **Sen = çini, başkaları soluk, izleme kipinde** (kimse "Sen" değilken) dört devlet tam renkte: Kobalt, Hardal, Zümrüt, Nar çiçeği (oyuncu indeksleri 7, 2, 6, 11); (5) etiket: sentence-case, `etiket-il`, 12–13 px, halo 1,5 px (bugünkü ağır `text-shadow` yerine); (6) liman ve olay glifleri aynı SDF hattında kalır, renkleri `ink` (nötr) ve rozet token'larıdır; çapa için Lucide `ship` çizgi stili referans alınarak yeniden çizilir.

| Token (`sahne-…`) | Açık hex | Açık OKLCH | Koyu hex | Koyu OKLCH |
|---|---|---|---|---|
| uzay (küre zemini) | #F5F2EC | 0.96 0.009 85 | #0F151A | 0.19 0.014 244 |
| okyanus | #B9D7E3 | 0.86 0.036 224 | #051823 | 0.20 0.034 236 |
| okyanus-derin | #ACCBDA | 0.82 0.039 229 | #02121D | 0.17 0.033 238 |
| kara | #F3EFE5 | 0.95 0.014 89 | #1E2428 | 0.26 0.012 237 |
| kara-2 (yükselti) | #EEE9DC | 0.93 0.018 89 | #252C32 | 0.29 0.015 244 |
| kutup | #F3F8FA | 0.98 0.006 223 | #BEC5C9 | 0.82 0.010 232 |
| atmosfer halkası | #9CC5D6 | 0.80 0.050 225 | #2C657D | 0.48 0.071 229 |

### 4.8 L4 sokak sahnesi: palet ve bina detayı

Sahibin 1 Ekim notu: bina modellemeleri daha detaylı, karakter bir tık büyük ([12 §7](../12-yon-taslagi.md)). Tek çizim bütçesi (≤ 60 çizim çağrısı) ve "düz renk, kenar çizgili siluet" üslubu korunur; detay **geometriden değil gölgelendiriciden** gelir.

**Palet.** Zemin `harita-kara` ile **aynı** değerdir (L3 → L4 geçişinde renk sıçraması olmaz). Cepheler altı sıcak ton arasından bina kimliğinin karmasıyla (deterministik) seçilir; çatılar bina sınıfına göre.

| Token (`yuru-…`) | Açık hex | Açık OKLCH | Koyu hex | Koyu OKLCH |
|---|---|---|---|---|
| zemin-kara | #F2EEE4 | 0.95 0.014 89 | #1E2428 | 0.26 0.012 237 |
| asfalt | #BABEC2 | 0.80 0.007 248 | #323639 | 0.33 0.008 240 |
| kaldirim | #ECE9E2 | 0.93 0.010 87 | #3F3D37 | 0.36 0.010 92 |
| kerb-cizgi | #938B82 | 0.64 0.016 71 | #575F65 | 0.48 0.014 240 |
| yaya-yolu | #EBE2D3 | 0.92 0.022 81 | #3B382F | 0.34 0.016 92 |
| fasad-krem | #ECE2CD | 0.92 0.030 86 | #7D7361 | 0.56 0.030 82 |
| fasad-badana | #EADAAE | 0.89 0.060 90 | #7B6E49 | 0.54 0.055 91 |
| fasad-pembe | #EBCDBD | 0.87 0.040 50 | #7F6557 | 0.53 0.040 50 |
| fasad-gri | #DBD7D0 | 0.88 0.010 82 | #6C6863 | 0.52 0.009 74 |
| fasad-seftali | #EFCFB5 | 0.87 0.050 61 | #7F6651 | 0.53 0.045 62 |
| fasad-ten | #E9DCCD | 0.90 0.025 71 | #786C5F | 0.54 0.025 69 |
| cati-kiremit | #C17755 | 0.64 0.105 45 | #84492D | 0.47 0.090 45 |
| cati-koyu-kiremit | #A36048 | 0.56 0.095 40 | #6E3A27 | 0.41 0.079 41 |
| cati-duz-beton | #BEBAB3 | 0.79 0.011 82 | #51565B | 0.45 0.010 248 |
| cati-arduvaz | #78818B | 0.60 0.019 251 | #4B535C | 0.44 0.018 251 |
| sanayi-govde | #CBD2D9 | 0.86 0.012 248 | #646A70 | 0.52 0.012 248 |
| sanayi-cati | #8F9AA4 | 0.68 0.019 246 | #404952 | 0.40 0.019 248 |
| agac-tepe | #82AB7D | 0.70 0.080 142 | #2F5838 | 0.42 0.071 150 |
| cim | #BBDDB0 | 0.86 0.071 138 | #243C25 | 0.33 0.050 145 |

Cephe tonları birbirine yakındır (en küçük ΔE_OK 1,4; çeşitlilik "mahalle dokusu", ayrım bilgisi değil) ve zemine ΔE_OK 3,8–8,6 uzaktadır; ayrım **kenar çizgisi + yüz gölgesiyle** yapılır. Kiremit çatı zemine 32,3 uzaktadır: sokak sahnesinin tek sıcak canlı yüzeyi çatılardır.

**Bina detay kademeleri (öneri)**

| Kademe | İçerik | Maliyet | Aşama |
|---|---|---|---|
| T0 (bugün) | Ekstrüzyon + duvar yönüne göre pişirilmiş gölge + çatı çevre kenarı | – | var |
| **T1** | **Kat çizgileri** (her kat yüksekliğinde dar koyu bant, ×0,94) ve **pencere ritmi** (parça gölgelendiricisinde kat ve duvar UV'sinden `step()` ile üretilen dikdörtgenler, cephe ×0,78); **saçak** (çatı kenarı 0,3 m dışarı); **taban koyulaşması** (ilk 3 m'de vertex rengi ×0,92 → 1: bina "oturur"); çatı sınıfı (kiremit kırma / düz beton / arduvaz) | Ek çizim çağrısı yok; köşe başına 1 özellik (`aKat`) + gölgelendirici birkaç komut | A3 |
| **T2** | 18 yapının **imza silüeti** ([arsa-ve-insa §3.2](arsa-ve-insa-derinlestirme.md)): baca (Çelikhane), sera (Tarla modülü), silo, kule; her biri 1 kit + parametrik ekstrüzyon ([§4.7](arsa-ve-insa-derinlestirme.md)); tente/çatı kenarı **katman rengi**, sahibin yapısında ayrıca `sen` şeridi | Yapı başına bitmiş model (tasarım ajanı işi) | A4 / sonra |

**Karakter ölçeği.** "Bir tık büyük": +%25 ölçek önerilir (kamera uzaklığı ve bina yüksekliği değişmeden); bu bir tahmindir, kesin değer **gözle ayarlanır** (karakter boyu ile kapı/pencere oranı birlikte bakılır). Karakterin altındaki halka `sen`; gövde rengi `yuru-govde`, oyuncu rengi yalnız yelek/şapka eklemi için (`aRenk` zaten var).

### 4.9 "Profesyonel" ölçütleri (kabul listesi)

1. Açık temada kara ↔ su ΔE_OK ≥ 10, koyuda ≥ 6.
2. Tüm etiketler kara üstünde ≥ 4,5:1 (halo hariç).
3. L2'de en az 4 yol sınıfı gözle ayırt edilir (gri tonlamada da).
4. L3'te **tarama deseni yok** (yüksek kontrast modu hariç); Sen mülkü ilk bakışta bulunur ("kısık göz" testi: ekran bulanıklaştırılınca Sen hâlâ en canlı yüzey).
5. Gri tonlama ve üç renk körlüğü benzetiminde sahiplik ayrımı emblemle okunur.
6. L1 → L4 geçişinde zemin renginde sıçrama yok (aynı token).
7. Tek ekranda en çok 3 "canlı" renk (Sen + seçili + rozet).


---

## 5. Arayüz bileşen dili

### 5.1 Tipografi

**Yazı tipi adayları** (hepsi `google/fonts` deposunun `ofl/` dizininden indirilip **aynı yöntemle** alt kümeye indirildi: Latin-1 + Ğ ğ İ ı Ş ş + ₺ + tipografik tırnak ve çizgiler; `wght` 400–700 değişken, `opsz`/`wdth` sabit; özellikler `kern, ccmp, locl, tnum, pnum, case, zero, calt, liga`; çıktı woff2; boyutlar KB = 1024 bayt, projedeki `derle.ts` ile aynı). Türkçe: Ğ ğ İ ı Ş ş Ç ç Ö ö Ü ü Â â Î î Û û tüm adaylarda var. "Eş x-yüksekliği genişlik" aynı x-yüksekliğine ölçeklenmiş örnek Türkçe cümlenin genişliğidir (Inter = 100; düşük = daha dar).

| Yazı tipi | Lisans | ₺ | Rakam | x-yüksekliği | Eş-x genişlik | woff2 (400–700) | Not |
|---|---|:-:|---|:-:|:-:|:-:|---|
| **Inter** | OFL | ✓ | orantılı; `tnum` var | 0,546 | 100 | **25,4 KB** | En büyük x-yüksekliği: 14 px'te en okunur; `case`, `zero`; `opsz` 14'e sabitlendi |
| Source Sans 3 | OFL | ✓ | **varsayılan tabular** (`tnum` yok) | 0,478 | 95,4 | 23,3 KB | Hümanist, sıcak, dar; x-yüksekliği küçük (15 px gerekir) |
| Noto Sans | OFL | ✓ | varsayılan tabular + `tnum` | 0,536 | 101,6 | 17,7 KB | Nötr, en küçük dosya; kimliksiz |
| IBM Plex Sans | OFL | ✓ | varsayılan tabular | 0,516 | 100,5 | 22,4 KB | Karakterli, "mühendislik"; `tnum` özelliği yok |
| Public Sans | OFL | ✓ | `tnum` | 0,517 | 100,0 | 20,4 KB | Resmî/devlet hissi |
| DM Sans | OFL | ✓ | **orantılı, `tnum` yok** | 0,526 | 100,3 | 20,7 KB | Tablo ağırlıklı arayüz için uygunsuz |
| Plus Jakarta Sans | OFL | ✓ | `tnum` | 0,536 | 98,0 | 16,6 KB | Geometrik, "start-up" |
| Manrope | OFL | ✓ | `tnum` | 0,540 | 92,5 | 21,0 KB | Dar geometrik |
| Atkinson Hyperlegible Next | OFL | **yok** (µ da yok) | `tnum` | 0,496 | 102,7 | 17,9 KB | Erişilebilirlik için tasarlı ama **₺ yok** |
| Figtree | OFL | **yok** | `tnum` | 0,500 | 99,2 | 15,6 KB | **₺ yok** |

**Öneri: Inter.** Gerekçe: (1) ₺ ve Türkçe harflerin tamamı var; (2) küçük puntoda (12–14 px) en yüksek x-yüksekliği ve ekran odaklı tasarım; (3) sayı ağırlıklı arayüz için `tnum` (tabular), `case` (büyük harfle uyumlu işaretler), `zero`; (4) bakımlı ve geniş kullanımda (`fontsource`, `google/fonts`). Zayıflık: çok yaygın, kimliği yazı tipi değil renk ve ayrıntılar taşır. Alternatif: Source Sans 3 (daha sıcak, daha dar; rakamlar varsayılan tabular) ama 15 px taban gerekir. Atkinson ve Figtree ₺ olmadığı için elendi. Yazı tipi dosyaları OFL'dir; alt küme çıkarmak ve web'e gömmek serbesttir (yazı tipi satılamaz; alt kümenin "Reserved Font Name" beyanı varsa yeniden adlandırılması gerekebilir: `OFL.txt` okunmalı, **doğrulanmadı**).

**Ek serif (isteğe bağlı, A4+).** Kitabe, "Akşam Defteri" ve il adı gibi törensel metin için Source Serif 4 (33,2 KB) veya Fraunces (30,6 KB) eklenebilir; temel arayüz yazı tipini değiştirmeye göre **geri dönüşü kolaydır** (ekleme), bu yüzden şimdi karar gerekmez.

```css
@font-face {
  font-family: "Inter";
  src: url("/yazi/inter-tr.woff2") format("woff2");
  font-weight: 400 700; font-style: normal; font-display: swap;
}
:root { --yazi: "Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
```

Dosya ayrı sunulur ve `<link rel="preload" as="font" crossorigin>` ile önyüklenir; yedek yazı tipi için `size-adjust`/`ascent-override` ile ölçü uyumu kurulur (değerler **ölçülmedi**, A0'da Inter ile yedek yığın karşılaştırılarak çıkarılır). Çok nadir Latin karakterler (é, ø, ñ) sistem yazı tipine düşer; oyuncu adlarında bu kabul edilir.

**Ölçek** (taban 14 px; satır yüksekliği 4 px ızgarasına oturur):

| Token | px / satır | Ağırlık | İz | Kullanım |
|---|---|:-:|:-:|---|
| `yazi-xs` | 12 / 16 | 500 | +0,01 em | Rozet, harita mahalle etiketi, tablo üst bilgisi, zaman damgası. **En küçük metin** |
| `yazi-sm` | 13 / 20 | 400–500 | 0 | Tablo hücresi, ikincil satır, küçük düğme |
| `yazi-md` | 14 / 20 | 400–600 | 0 | **Gövde**, düğme, panel satırı |
| `yazi-lg` | 16 / 24 | 400, 600 | −0,005 em | Okuma metni, girdi alanı (iOS'ta ≥16 px yakınlaştırmayı önler), kart başlığı |
| `yazi-xl` | 18 / 26 | 600 | −0,01 em | Panel başlığı |
| `yazi-2xl` | 22 / 28 | 600 | −0,015 em | Ekran başlığı, ilçe adı |
| `yazi-3xl` | 28 / 34 | 600 | −0,02 em | Sayı vurgusu (nakit), Yerleş kartı |
| `yazi-4xl` | 40 / 44 | 600 | −0,025 em | Karşılama: "Mahallenden başla." |

Kurallar: (1) bugünkü 10–11,5 px metinler 12 px'e çıkar; 12 px yalnız etiket/rozet, gövde 14 px; (2) tüm sayılar `font-variant-numeric: tabular-nums` (tablo ve HUD) ve tek `tr-TR` biçimleyici; (3) **para `₺1.234`** (öne; `Intl` tr-TR ve [oyun-kimliği §4.4](oyun-kimligi-harman.md) ile aynı; ekrandaki `1.000 ₺` düzeltilir; tek `para()` işlevi); (4) büyük harf **CSS'te `text-transform: uppercase` + `lang="tr"`** ile çalışır (İ/ı doğru), yalnız ≤2 sözcüklü üst başlıklarda kullanılır; **harita etiketlerinde asla** (§4.5); (5) satır yüksekliği Türkçe aksanlar (İ, Ğ, Â, Ö, Ü üstte; Ş, Ç altta) için ≥1,4; (6) etiketler içeriğe göre genişler (Türkçe ≈%25–30 uzun, [arayuz-ux §6](arayuz-ux.md)), sabit genişlikli sekme yok.

### 5.2 Ölçekler: boşluk, yarıçap, gölge, katman

**Boşluk (4 px ızgara):** `s-0` 0 · `s-1` 4 · `s-2` 8 · `s-3` 12 · `s-4` 16 · `s-5` 20 · `s-6` 24 · `s-8` 32 · `s-10` 40 · `s-12` 48 · `s-16` 64. Panel iç boşluğu 16, kart 16, HUD hap yatay 12, satır dikeyi 8–12, bölüm arası 24.

**Yarıçap (3 + hap):** `r-sm` 6 (girdi, küçük düğme, etiket) · `r-md` 10 (düğme, kart içi öğe) · `r-lg` 14 (panel, kart, popover, modal) · `r-hap` 999 (hap, rozet, sayaç) · daire %50. Bugünkü 16 yarıçap bildirimi (2–22 px, %50) bu dördüne iner.

**Gölge** (sıcak tonlu: açık temada `rgba(41, 31, 24, α)`, koyu temada `rgba(0, 0, 1, α)`):

| Token | Açık | Koyu | Kullanım |
|---|---|---|---|
| `golge-1` | `0 1px 2px rgba(41,31,24,.08), 0 1px 1px rgba(41,31,24,.04)` | `0 1px 2px rgba(0,0,1,.45)` | Kart, seçili segment |
| `golge-2` | `0 2px 4px rgba(41,31,24,.06), 0 8px 24px rgba(41,31,24,.10)` | `0 2px 4px rgba(0,0,1,.35), 0 8px 24px rgba(0,0,1,.45)` | Yüzen HUD (hap, mercek çubuğu), popover, toast |
| `golge-3` | `0 4px 8px rgba(41,31,24,.08), 0 24px 56px rgba(41,31,24,.16)` | `0 4px 8px rgba(0,0,1,.40), 0 24px 56px rgba(0,0,1,.55)` | Modal, Yerleş ekranı |

**Yüzey katmanları ve kural:** zemin (0) → yüzey: panel/kart (1) → yüzen HUD (2) → modal (3). **Kenarlık veya gölge, ikisi birden değil:** kart ve panel = `cizgi-ince` 1 px kenarlık, gölge yok; yüzen öğe = `golge-2`, kenarlık yok; modal = `golge-3` + `perde`. Koyu temada yükseklik **yüzey açıklığıyla** da gösterilir (yuzey → yuzey-2 → yuzey-3). **Bulanıklık (`backdrop-filter`) kaldırılır:** hareketli WebGL tuvalinin üstünde her karede yeniden hesaplanır; yerine `yuzey` %94 opaklık (`prefers-reduced-transparency` uyumlu). Perde: açık `rgba(19, 28, 35, 0.42)`, koyu `rgba(0, 0, 1, 0.62)`.

**Z katmanı token'ları:** harita 0 · HUD 10 · panel 20 · popover 30 · modal 40 · toast 50 (bugünkü dağınık `z-index: 3…12` değerlerinin yerine).

### 5.3 Bileşenler

| Bileşen | Özellik |
|---|---|
| **Düğme — birincil** | Dolgu `birincil.solid`, metin beyaz (koyuda zemin rengi), `yazi-md` 600, yükseklik 36 (dokunmatikte 44), `r-md`, yatay 16; hover `birincil.hover` (L −0,05); basma `scale(.98)`; devre dışı: `murekkep-4` metin + `yuzey-2` zemin. **Görünümde en çok bir tane** |
| **Düğme — ikincil** | Saydam zemin, `cizgi` kenarlık, `murekkep` metin; hover `yuzey-3` |
| **Düğme — ton** | `birincil.tint` zemin + `birincil.ink` metin: **satır eylemleri** için (Dikkat panelindeki beş "Tek tıkla uygula" bu olur); gürültüyü kırar |
| **Düğme — hayalet / tehlike** | Hayalet: zemin yok, hover `yuzey-3`. Tehlike: `hata.solid` dolgu, yalnız geri alınamaz işlem onayında |
| **İkon düğmesi** | 36 × 36 (dokunmatik 44), ikon 20 px, `r-md`; üst çubuktaki beş düğmenin (zil ve dünya emojileri, N, ◐, ⚙) yerine Lucide `bell`, `globe`, `compass`, `sun-moon`, `settings` |
| **Odak halkası** | 2 px, `odak` (= `birincil.ink`; koyuda `birincil.ink` açığı), `outline-offset` 2, her etkileşimli öğede; odak görünürlüğü için ≥3:1 (SC 1.4.11) |
| **Sekme (panel)** | İkon 16 + etiket `yazi-sm` 500; seçili: `murekkep` + 2 px `birincil` alt çizgi (200 ms kayan gösterge); sayaç = hap (aşağıda). **En çok 4 görünür sekme** + "Daha" menüsü (bugün 7 sekme 11,5 px'te); yatay kaydırma yok. Telefonda alt çubuk 5 sekme ([arayuz-ux §7](arayuz-ux.md)) |
| **Segment** | `yuzey-2` yol, seçili parça `yuzey` + `golge-1` + `murekkep` (bugünkü parlak mavi blok yerine); yükseklik 32 |
| **Rozet (durum)** | Hap, 20 px yükseklik, `yazi-xs` 500, **`tint` zemin + `ink` metin** + 12 px ikon; sayaç: `murekkep` zemin, `yuzey` metin, en az 16 px |
| **Rozet (harita)** | SDF glif, 20 px halka, `yuzey` diskinde `solid` şekil, 1 px halo; şekil: ▲ eksik · ◯ boşta · ✓ bitti · ⚔ savaş (Lucide çizgi stiliyle yeniden çizilir) |
| **Hap (HUD)** | 36 yükseklik, `r-hap`, `yuzey` + `golge-2`, simge 16 + etiket + değer (`tabular-nums`); nakit, tarih, hasat ayrı hap; "duraklatıldı" = `uyari.tint` hap + `pause` ikonu (sabit) |
| **Kart** | `yuzey`, `cizgi-ince` kenarlık, `r-lg`, iç boşluk 16; başlık `yazi-lg` 600, gövde `yazi-md`, eylem satırı altta sağda |
| **Panel** | Genişlik 360 (≤ 400); başlık `yazi-xl`; bölüm başlığı `yazi-xs` 600 `murekkep-2` (üst başlık: ≤2 sözcük büyük harf, +0,04 em); satır: etiket `murekkep-2` / değer `murekkep`, yükseklik 36, **düz** `cizgi-ince` ayraç (bugünkü kesikli yerine); tablo: üst bilgi `yazi-xs` 600, hücre `yazi-sm`, sayı sağa yaslı `tnum`, zebra yok, hover `yuzey-3` |
| **Girdi** | Yükseklik 36, `yuzey-2` dolgu, **`cizgi-guclu` kenarlık (≥3:1)**, `r-sm`; odakta halka; hata: `hata.solid` kenarlık + ikon + metin; select aynı; range `accent-color: birincil` |
| **Bildirim (toast)** | `yuzey`, `golge-2`, `r-md`, sol 3 px durum şeridi + 20 px ikon + başlık `yazi-md` 600 + gövde `yazi-sm` + isteğe bağlı ghost eylem; 4 sn (eylemli 8 sn, hata kapatılana kadar); en çok 2 üst üste; konum: alt-orta, alt çubuğun/`[E]` hapının **12 px üstü** (çakışma yok); "Hayırlı olsun" gibi kutlamalar `ikincil` şeritli ([oyun-kimliği §4.3](oyun-kimligi-harman.md) metinleriyle) |
| **İpucu (tooltip)** | `murekkep` zemin, `yuzey` metin, `yazi-xs`, `r-sm`, 400 ms gecikme; dokunmatikte uzun basma |
| **Parçalı ilerleme** (inşa) | 4 segment, 4 px yükseklik, `r-hap`; dolu = `katman.solid`, boş = `yuzey-3`; bitiş saati yanında `yazi-xs` |
| **Gösterge (lejant)** | `yazi-xs`, 12 px örnek kutusu; desen örnekleri yalnız burada (§4.4.3) |

### 5.4 İkon seti

| Kütüphane | Sürüm | Lisans (paketten doğrulandı) | İkon | Çizgi | Gereken ikonlar |
|---|---|---|---|---|---|
| **Lucide** (`lucide-static`) | 1.49.0 | **ISC**; Feather'dan türeyen ikonlar için ayrıca MIT (Cole Bemis) bildirimi | ≈2.100 | tek çizgi, 24 px, 2 px (1,75 öneririz) | Denenen 71 adın **70'i var** (yalnız `building-2` yok, `building` var) |
| Phosphor (`@phosphor-icons/core`) | 2.1.1 | MIT | 1.512 × 6 ağırlık | 6 ağırlık | `swords`, `ship`, `pickaxe` **yok** |
| Tabler (`@tabler/icons`) | 3.48.0 | MIT | 5.166 çizgi + 1.054 dolu | 2 px | `sprout`, `pickaxe` **yok** |

**Öneri: Lucide.** Tek çizgi diline sahip, `wheat`, `factory`, `landmark`, `store`, `tractor`, `ship`, `swords`, `milk`, `trees`, `cooking-pot`, `tent`, `anvil`, `cpu`… hepsi var; ISC/MIT lisansı gömmeyi ve alt küme çıkarmayı serbest bırakır (bildirim dosyası gerekir). **Ölçüm:** seçilen 70 ikon `<symbol>` sprite olarak **16,3 KB ham / 4,6 KB gzip** (≈67 B/ikon); ilk sürümde kullanılan ≈40 ikonla ≈2,7 KB (tahmin). Çizgi kalınlığı 16–20 px'te **1,75**, 24 px'te 2; `stroke-linecap/linejoin: round`. Emojiler ve Unicode glifler (◐ ⚙ ⓘ ⏸ ▾ ✓ ▲ …) tamamen kaldırılır. Oyuna özgü ikonlar (çay bardağı, dolmuş, kitabe, flama, 20 yapı silüeti) aynı 24 px ızgarada, aynı çizgi kalınlığıyla çizilir (tasarım ajanı işi, §7.6).

### 5.5 HUD'ın görsel kuralları

[arayuz-ux §7](arayuz-ux.md) yerleşimini korur; yalnız görünüm: HUD öğeleri **tek yükseklik (36) ve tek aralık (8)** ile hizalanır (bugünkü farklı yüksekliklerde kartlar); sol üst kırıntı + arama, üst orta hap, sağ üst ikon düğmeleri; mercek çubuğu alt-ortada **ikon + etiket** (1–8 tuş rozeti `yazi-xs`); hız düğmeleri hata ayıklama menüsünde; atıf köşede "ⓘ" yerine Lucide `info`. Telefonda hap tek satıra (nakit · tarih) iner, dokunma hedefi 44.

### 5.6 Mikro etkileşimler (sakin ama canlı)

**Ayrım:** *geri bildirim animasyonu* (bir eylemin ya da olayın **sonucu**, tek seferlik, ≤ 700 ms) vardır; *süs animasyonu* (sürekli, dikkat çeken) **yoktur**. Yalnız `transform` ve `opacity` canlandırılır.

| # | Etkileşim | Davranış | Süre / eğri |
|---|---|---|---|
| 1 | Hover (düğme, satır, kart) | Zemin tonu değişir; yüzen öğede `golge-1` → `golge-2` + 1 px yukarı | 120 ms, `ease-standart` |
| 2 | Basma | `scale(.98)` | 80 ms |
| 3 | Odak | Halka anında belirir | 0 ms |
| 4 | Sekme göstergesi | Alt çizgi yeni sekmeye kayar | 200 ms, `ease-cikis` |
| 5 | Panel aç/kapa | 16 px kayma + opaklık; içerik ilk yüklemede 120 ms solma | 320 ms, `ease-cikis` |
| 6 | Toast | 8 px yukarıdan gelir + solar; çıkışta 160 ms | 200 ms, `ease-cikis` / `ease-giris` |
| 7 | Sayı değişimi (nakit, stok) | **Sayaç animasyonu yok**; değer anında değişir, zemin 600 ms `tint` rengine boyanıp söner (artış = başarı, düşüş = hata tint) | 600 ms, tek seferlik |
| 8 | Satın alma / inşaat tamam | Hücre dolgusu α 0 → 0,42; kenar belirir; **tek nabız halka** (ölçek 1 → 1,6, α 0,5 → 0) + "Hayırlı olsun!" toast | 220 ms + 600 ms |
| 9 | Rozet geliş | Tek nabız (mevcut) | 600 ms |
| 10 | Mercek değişimi | Dolgu renkleri çapraz solar (`fill-color-transition`) | 320 ms |
| 11 | Hücre hover / seçim | Hover anında, seçim 120 ms | 0 / 120 ms |
| 12 | Kamera uçuşu | `fitBounds`/`easeTo`, ease-in-out | 700 ms (L0 → L1: 1000 ms) |
| 13 | Yükleme | 400 ms'den kısa işlerde gösterge yok; sonrası adımlı ince ilerleme çubuğu (§6.2) | – |

**Hareket token'ları:** `sure-anlik` 80 · `sure-hizli` 120 · `sure-orta` 200 · `sure-yavas` 320 · `sure-sahne` 700 · `sure-sahne-uzun` 1000 ms. Eğriler: `ease-cikis` `cubic-bezier(0.16, 1, 0.3, 1)` (giren öğe), `ease-giris` `cubic-bezier(0.7, 0, 0.84, 0)` (çıkan öğe), `ease-standart` `cubic-bezier(0.4, 0, 0.2, 1)`.

**Azaltılmış hareket** (`prefers-reduced-motion: reduce` ve oyun içi ayar): tüm süreler 0 (kamera uçuşu, nabız ve kayma dahil), yalnız 80 ms opaklık geçişi kalır; toast ve panel anında açılır. Mevcut davranış (`hareketAzMi()`) korunur ve token'a bağlanır.


---

## 6. Akış

### 6.1 Ekranlar arası geçişler

**İlke: kesme yok, süreklilik var.** Üç görünümün zemini aynı token'dan gelir (küre uzayı = kâğıt `#F5F2EC`; harita karası `#F3EFE5`; sokak zemini `#F2EEE4` ≈ aynı) ve her geçişte kamera hedefi korunur ([arayuz-ux §3](arayuz-ux.md)). Tuval değişiminin görünür olduğu iki yerde kısa bir **kâğıt örtü** (zemin rengi, α 0 → 0,85 → 0) kullanılır: siyah/beyaz flaş olmaz.

| Geçiş | Ne olur | Süre | Teknik not | Azaltılmış hareket |
|---|---|---|---|---|
| Açılış → küre | Küre 400 ms solarak gelir; Alfa-0 illeri tam renk, diğerleri soluk | 400 ms | ilk karede `#yukleme` biter | anında |
| Küre (L0) → İl (L1) | Kamera bölgeye iner; MapLibre arkada `opacity 0` olarak yüklenir ve **hazır olunca** 240 ms çapraz solar; kırıntı yolu yeni parçayı kaydırarak ekler | 1000 ms + 240 ms | mevcut ~1,8 sn yüklemede küre ekranda kalır (boş ekran yok) | anında kesme |
| İl → İlçe (L1 → L2) | `fitBounds` (mevcut 800 ms); seçili olmayan il/ilçeler kâğıt örtüyle soluklaşır (odak) | 700–800 ms | `ilce-secili` + örtü katmanı | anında |
| İlçe → Arsa (L2 → L3) | `easeTo` z16,6 (mevcut 500–700 ms); arsa mozaiği 300 ms solar, ızgara çizgisi 150 ms | 700 ms | BHI yüklenirken L2 görünür, mozaik gelince solar | anında |
| Arsa → Sokak (L3 → L4) | (1) kamera parsel merkezine iner (700 ms); (2) kâğıt örtü 240 ms; (3) 3B sahne açılır, örtü 240 ms çekilir; (4) HUD sadeleşir: `‹ Haritaya dön` + mini harita 200 ms kayarak gelir, mercek çubuğu ve kırıntı gizlenir | ≈ 1,4 sn | `yuru.js` (şimdi ≈101 KB gzip) tembel yüklenir; örtü, sahne **hazır olana** kadar bekletilir | tek örtü, 0 ms |
| Sokak → Harita | Tersi; `M`, `Esc` ve mini harita aynı yolu çalıştırır | ≈ 1 sn | kamera hedefi aynı | anında |

L3 → L4'te MapLibre `maxPitch: 0` olduğundan gerçek eğim animasyonu yoktur; sürekliliği **aynı zemin rengi + aynı merkez + örtü** sağlar. Eğimli üç boyutlu geçiş (MapLibre pitch) ancak bu kısıt kalkarsa değerlendirilir (açık soru).

### 6.2 Yükleme durumları

**Kural:** 400 ms'den kısa işlerde gösterge yok; sonra **adımlı ilerleme** (gerçek aşamalar) gösterilir; sürekli dönen spinner kullanılmaz (bugünkü `animation: don 0.9s linear infinite` kalkar). Beklenen sürenin bilinmediği tek yerde 2 px'lik ince çizgi yavaşça (≥1,6 sn döngü) ilerler ve iş bitince durur; azaltılmış harekette statik "…" metni. Bu, "sürekli animasyon yok" ilkesinin bilinçli ve tek istisnasıdır: süresi sınırlı, işlevsel bir durum göstergesidir, süs değildir.

| Durum | Gösterim |
|---|---|
| Uygulama ilk açılışı (bugün ≈ 2,9 sn, SwiftShader ölçümü) | Tam ekran `zemin` + Inter 600 24 px "Bölge Stratejisi" + 120 × 2 px adımlı çubuk (Veri · Küre · Kurallar · Hazır); ≤300 ms sürerse hiç gösterilmez |
| Harita (L1+) yükleniyor (`harita.js` ≈ 293 KB gzip, hiyerarşi 131 KB, iller 149 KB) | Küre ekranda kalır; üst kenarda 2 px ilerleme çizgisi; hazır olunca çapraz solma |
| Panel içeriği | Statik iskelet blokları (`yuzey-2`, 12 px, `r-sm`), **parıltı (shimmer) yok**; veri gelince 120 ms solma |
| Arsa ızgarası (BHI ≈ 93 KB gzip) | L2 görünür kalır; mozaik gelince 300 ms solar |
| Yürüyüş (`yuru.js` ≈101 KB + 9 karo ≈225 KB, ≈0,7 sn) | Durum kartı: adımlar Sahne · Karolar · Karakter; karakter yüklenemezse üstten görünüm yedeği ([oyun-kimliği §5.6](oyun-kimligi-harman.md)) |
| Sunucu bağlantısı koptu | Üstte ince `uyari.tint` şerit: "Bağlantı koptu, yeniden deneniyor." + "Şimdi dene"; harita salt okunur; geri gelince tek "Yeniden bağlandı" toast |

### 6.3 Boş ve hata durumları

Biçim: **ikon (32 px, `murekkep-4`) + tek cümle + en çok bir eylem**. Ton: "sen" kipi; resmî ekranlarda (seçim, savaş ilanı) "siz" ([oyun-kimliği §4.4](oyun-kimligi-harman.md)).

| Yer | Metin | Eylem |
|---|---|---|
| Dikkat (liste boş) | "Şu an ilgilenmen gereken bir şey yok. Bereket versin." | – |
| Bildirimler | "Henüz bildirimin yok. Bir şey olunca burada görürsün." | – |
| Mülklerim (ilk gün) | "Henüz arsan yok. Haritada boş bir arsa seç." | **Yerleş** (birincil) |
| Arama sonuçsuz | "'…' için sonuç yok. Yazımı kontrol et ya da il adıyla dene." | – |
| Alınamaz hücre (ipucu) | Neden: "Su alanı", "Yol", "Askerî alan" | – |
| Harita/veri yüklenemedi | "Harita yüklenemedi. Bağlantını kontrol et." | **Yeniden dene** |
| Beklenmeyen hata | "Bir şeyler ters gitti. Tekrar dene." (+ katlanır teknik ayrıntı) | **Yeniden dene** |
| `file://` ile açıldı | "Harita için bu sayfayı bir sunucu üzerinden aç." | – |

### 6.4 İlk 60 saniyenin görsel akışı

[oyun-kimliği §5.3](oyun-kimligi-harman.md) senaryosunun **görsel ve hareket karşılığı** (metin ve içerik orada):

| Süre | Ekran ve görsel durum | Hareket | Ölçüt |
|---|---|---|---|
| **0:00–0:08** | Kâğıt zeminde küre (`sahne-uzay` `#F5F2EC`); "Mahallenden başla." `yazi-4xl`; "Başla" birincil, 44 px; başka hiçbir renkli öğe yok | Küre 400 ms solar, **8 sn boyunca yavaş döner ve durur** (tek sınırlı hareket) | Ekranda en çok 1 canlı renk (çini düğme) |
| **0:08–0:18** | Türkiye'ye iniş; Alfa-0 illeri tam renk, diğerleri `soluk` + "yakında"; 3 öneri kartı (`yuzey`, `r-lg`, `golge-2`; ilçe adı `yazi-xl`, neden `yazi-sm` `murekkep-2`) | İniş 900–1000 ms; kartlar 8 px yukarıdan solar, 60 ms arayla (toplam 200 + 120 ms) | Kartlar iniş **bitince** gelir |
| **0:18–0:28** | L2: seçilen ilçe odakta, diğerleri örtüyle soluk; hazır arsa adaları `arsa-*` renkleriyle; "Önerilen" = `ikincil.tint` rozet; "Burada başla" birincil | Odak örtüsü 200 ms | Tek birincil düğme |
| **0:28–0:40** | L2 → L4 iniş (§6.1); HUD sadeleşir (`‹ Haritaya dön`, mini harita, `[E]` hap); karakter kontrolü başlar | 700 ms + 2 × 240 ms örtü | İlk girdiye tepki **anında** (0 ms yumuşatma yok) |
| **0:40–0:50** | Muhtar kartı: `yuzey`, sol 3 px `ikincil` şerit, ≤2 cümle; Defter satırı "+₺50.000" `basari.ink` | Kart 200 ms; değer 600 ms başarı tint'i | Atlanabilir; kart bir tıkla kapanır |
| **0:50–1:00** | Açılış Tezgâhı hayaleti: **geçerli** = birincil düz kenar, **geçersiz** = `hata.tint` + tarama + kısa neden (tarama anlamlı olan tek yer); onayda kenar "mühürlenir" | Mühür 220 ms; tek nabız halka 600 ms; "+₺85 · Hayırlı olsun!" kutlama toast'ı (`ikincil` şerit) | Hata **yalnız** engelli yerde görünür |


---

## 7. Uygulama planı

### 7.1 Token dosya yapısı (`packages/istemci`)

Tek kaynak **TS**'tir; CSS ve (gerekirse) başka biçimler ondan **üretilir**. [DTCG biçimi](https://www.designtokens.org/tr/drafts/format/) hâlâ taslak (2025.10 "preview draft", belge kendisi "uygulama yapma" diyor); bu yüzden JSON token dosyası kaynak yapılmaz, ileride bir dışa aktarım olarak eklenebilir.

```
packages/istemci/
  src/tasarim/
    belirtec.ts        KAYNAK (elle düzenlenen tek yer): OKLCH üçlüleri
                       NOTR, AILE (birincil…bilgi), KATMAN, OYUNCU (12; sıra = sunucu renkIndeksi), HARITA, SAHNE, UC_BOYUT,
                       OLCEK (bosluk, yaricap, golge, sure, ease, z)
    renk.ts            oklch→sRGB (gamut eşlemeli), hex/rgba, WCAG, APCA, CVD benzetimi (~1,5 KB; çalışma zamanında yalnız hex→rgb)
    uret-css.ts        belirtec.ts → CSS metni (YALNIZ hex/rgba, asla oklch())
    tema.css           ÜRETİLİR, git'e girer: :root, @media (prefers-color-scheme: dark), [data-theme=dark|light]
    yazi.css           @font-face + yazı ölçeği + tabular kuralları
    bilesen.css        düğme, sekme, segment, rozet, hap, kart, girdi, toast, panel (stil.css'ten bölünür)
    harita-stili.ts    haritaStili(tema) → StyleSpecification (§4.6); yolGenisligi(), kasa dizisi
    sahne-paleti.ts    kure/tema.ts ile yuru/palet.ts'nin ortak köprüsü: CSS değişkeninden HEX okur (kontrol: /^#[0-9a-f]{6}$/)
    ikon.ts            Lucide sprite (<symbol>), ikon("wheat", 20) → SVG dizgisi
  public/yazi/inter-tr.woff2 (25,4 KB) + OFL.txt          ayrı dosya
  scripts/belirtec-uret.ts       belirtec.ts → src/tasarim/tema.css  (pnpm tasarim)
  test/tasarim-kontrast.test.ts  §7.5
```

Üretilen CSS'in biçimi (kısaltılmış; **tüm değerler hex**):

```css
/* ÜRETİLDİ: scripts/belirtec-uret.ts — elle düzenleme */
:root {
  color-scheme: light;
  --zemin: #F5F2EC;  --yuzey: #FCFAF6;  --yuzey-2: #EEEBE3;  --yuzey-3: #E7E2DA;
  --cizgi-ince: #E0DCD4;  --cizgi: #CDC8BF;  --cizgi-guclu: #7D8891;
  --murekkep: #1A2731;  --murekkep-2: #4B5864;  --murekkep-3: #5F6B75;  --murekkep-4: #9EA6AD;
  --birincil: #007783;  --birincil-ink: #005B64;  --birincil-tint: #D8F3F6;  --sen: #007783;
  --oyuncu-0: #9E5560;  /* … --oyuncu-11 */
  --harita-kara: #F3EFE5;  --harita-su: #B9D7E3;  /* … */
  --r-sm: 6px;  --r-md: 10px;  --r-lg: 14px;
  --sure-hizli: 120ms;  --ease-cikis: cubic-bezier(0.16, 1, 0.3, 1);
}
@media (prefers-color-scheme: dark) { :root:not([data-theme="light"]) { color-scheme: dark; --zemin: #0F151A; /* … */ } }
:root[data-theme="dark"] { color-scheme: dark; --zemin: #0F151A; /* … */ }
```

Üç blokun elle çoğaltılması (bugün `stil.css` ve `harita.css`'te) ortadan kalkar. `light-dark()` ileride (Baseline 2024) üretici çıktısı olarak eklenebilir.

### 7.2 Mevcut → yeni belirteç eşlemesi (geçiş süresince eski adlar takma ad olarak kalır)

| Mevcut | Yeni | Not |
|---|---|---|
| `--bg`, `--panel`, `--panel2` | `--zemin`, `--yuzey`, `--yuzey-2` | |
| `--ink`, `--ink2`, `--line` | `--murekkep`, `--murekkep-2`, `--cizgi` | |
| `--vurgu`, `--vurgu-ink` | `--birincil`, `--birincil-ustu` | `#1f5fbf` → `#007783` |
| `--golge`, `--yari-panel` | `--golge-2`, `--yuzey` (opak %94) | bulanıklık kalkar |
| `--iyi`, `--kotu`, `--uyari` | `--basari-ink`, `--hata-ink`, `--uyari-ink` | metin rengi = `ink` |
| `--d0..--d3` (devlet) | `--oyuncu-7`, `-2`, `-6`, `-11` | izleme kipi tam renk |
| `--rozet-eksik/bosta/bitti/savas` | `--rozet-*` (§3.7) | boşta = nötr gri |
| `--k-karsilanan/kismi/acik/engelli` | bilgi / uyarı / hata `solid` + teknoloji `ink` | desenler (nokta/çizgi/çapraz) aynen kalır |
| `--s0..s4`, `--p0..p4`, `--t0..t4` | `--rampa-sanayi-*`, `--rampa-pazar-*`, `--rampa-tarim-*` | §3.6 |
| `--olay-*` | kuraklık → ikincil, don → lojistik, sel → bilgi, kış fırtınası → teknoloji `solid` | ikonlarla |
| `--harita-ben`, `--harita-baskasi`, `--harita-secim` | `--sen`, `--sahip-soluk-*`, `--secim` | seçim = mürekkep |
| `--harita-zemin/kara/su/orman/tarla/sanayi/konut/yapili/diger/engel` | `--harita-su/kara/…`, `--arsa-*` (§4.3) | `zemin` anlamı değişir (= deniz) |
| `--sahne-*` | aynı adlar, yeni değerler | `kure/tema.ts` anahtarları değişmez |
| `MAL_RENK_HEX` (`veri/renkler.ts`) | mal → ikon + katman rengi | `hslHex` yedeği kalkar |

### 7.3 Aşamalar (süreler **tahmindir**, ölçülmedi)

| Aşama | İçerik | Değişen dosyalar | Süre | Görünür sonuç |
|---|---|---|---|---|
| **A0 Temel** | Yazı tipi + token üretimi + takma adlar; emoji/Unicode glifler → Lucide sprite; para biçimi `₺`; spinner → adımlı ilerleme | `index.html`, `arayuz/stil.css` (`:root` blokları silinir, içe aktarılır), `harita/harita.css`, `yuru/yuru.css`, `kure/tema.ts` (anahtarlar aynı), `yuru/palet.ts` (tema tabloları token'dan), `veri/renkler.ts`, `arayuz/bicim.ts` (`para`), `mini-harita.ts` (yazı tipi), yeni `src/tasarim/*`, `test/tasarim-kontrast.test.ts` | 1 gün | Yazı tipi ve renkler birden değişir; düzen aynı |
| **A1 Bileşenler** | Düğme/sekme/hap/toast/kart/girdi/panel CSS; "tek birincil" kuralı (Dikkat satırları ton düğme); 4 görünür sekme + Daha; boyut ölçeği (12–14 px); kenarlık-veya-gölge; bulanıklık kalkar | `stil.css` → `bilesen.css` bölünür (618 satır), `arayuz/dikkat.ts`, `devlet-sec.ts`, `komut-govde.ts`, `panel.ts`, `govde.ts`, `bildirim.ts`, `gelen-kutusu.ts` | 1,5 gün | Profesyonel panel; hiyerarşi |
| **A2 Harita** | `harita-stili.ts`: su/kara/kıyı bandı/sınır hiyerarşisi (altlıksız), arsa mozaiği renkleri, tarama kaldırma, sahiplik görünümü, etiket stili (DOM, sentence-case), seçim ve odak örtüsü. **2b:** Protomaps altlığı (orman, tarım, yol hiyerarşisi) — veri/barındırma kararı gerekir | `harita/gorunum.ts` (`stil()`, `seritRengi()`), `harita.css`, `harita/denetci.ts`, `veri-hatti` (altlık çıkarımı) | 2 gün (2b: +2 gün + veri) | Harita "bitmiş" görünür |
| **A3 Küre ve sokak** | Küre paleti, devlet dolgusu soluk/tam kuralı, SDF rozet şekilleri yeniden çizimi; L4 palet, T1 bina detayı (kat çizgisi, pencere ritmi, saçak, taban koyulaşması, çatı sınıfları), karakter +%25 | `kure/tema.ts`, `kure/simgeler.ts`, `kure/shaderlar.ts`, `yuru/karo-geometri.ts` (`aKat`), `yuru/malzeme.ts`, `yuru/palet.ts`, `yuru/karakter.ts` | 2 gün | Küre ve sokak aynı kimlikte |
| **A4 Akış ve cila** | Kâğıt örtü geçişleri, yükleme/boş/hata durumları, ilk 60 sn; kabartma (DEM); glyph etiketleri (gerekirse); yüksek kontrast + renk körü modu + ayarlar; T2 yapı silüetleri | `harita/denetci.ts`, `yuru/giris.ts`, `arayuz/*`, ayarlar paneli | 2–3 gün | Akış cilası |

### 7.4 Tek dosya HTML ve boyut bütçesi

Ölçüm: `dist-tek/index.html` **1 Ekim 09:34 derlemesi** 390.661 bayt gzip (= 381,5 KB; bütçe 400 KB = 409.600 bayt). `derle.ts` `kb()` = bayt / 1024. [Harita-istemci](harita-istemci.md) raporundaki 373,8 KB'tan bu yana paralel işler +7,7 KB ekledi: boşluk **≈18,5 KB**.

| Kalem | Tek dosya HTML (gzip) | Ayrı dosya |
|---|---|---|
| Mevcut (09:34) | 381,5 KB (boşluk 18,5) | `harita.js` ≈293 KB; `yuru.js` ≈101 KB |
| Inter, Latin-1 + TR (25,4 KB woff2) | **gömülmez** | +25,4 KB `.woff2` (ilk açılışta, önbellekli) |
| Gömme seçeneği: dar alt küme (19,4 KB woff2; base64 + gzip +%1 = 19,6 KB, **ölçüldü**) | +19,6 KB → **aşar** (≈411) | – |
| İkon sprite, 70 sembol | +4,6 KB (≈40 ikonla ≈2,7) | – |
| Üretilen token CSS + bileşen CSS (CSS bugün 8,2 KB gzip) | +4–6 KB (tahmin: 143 benzersiz renk yerine ölçek; yeni bileşen kuralları ekler) | – |
| `harita-stili.ts` (genişleyen katman listesi, helper'lar) | – | `harita.js` +2–3 KB (tahmin) |
| `renk.ts` | 0 (yalnız üretim betiğinde) | – |
| **Sonuç** | **≈391 KB** (yazı tipi ayrı) | |

**Öneri:** (a) yazı tipini ayrı dosya yap, tek dosya kipinde sistem yığını + `size-adjust` yedeği kullan (tek dosya zaten harita ve verisini taşımıyor, "önizleme/çevrimdışı küre" kipi); ya da (b) bütçeyi 420 KB'a çıkar (sahip kararı) ve dar alt kümeyi göm. (a) önerilir. Her iki durumda A0–A1 ≈391 KB'a yaklaşır; paralel işlerin eklediği boyutla birlikte bütçe sınırda kalır, bu yüzden CSS ve ikon alt kümeleri **kullanılanlarla** sınırlanmalıdır (kullanılmayan ikon üretici tarafından atılır).

### 7.5 Testler (kalıcı koruma)

`test/tasarim-kontrast.test.ts` (vitest; `renk.ts` kullanır):

1. **Kontrast:** §3.4 tablosundaki tüm çiftler iki temada ≥ 4,5:1 (metin) ve `cizgi-guclu` ≥ 3:1; harita etiketleri kara üstünde ≥ 4,5:1; rozet ve Sen kenarı kara üstünde ≥ 3:1.
2. **Renk körlüğü:** 12 oyuncu + Sen çift bazında en kötü ΔE_OK × 100 ≥ 6 (protan/deutan/tritan) ve ≥ 10 (normal); katman setleri ≥ 5,5.
3. **Güncellik:** `tema.css` = `belirtec.ts`'in çıktısı (eski üretilmiş dosya CI'da kırılır).
4. **Hex-only:** JS'in okuduğu her `--sahne-*`, `--harita-*`, `--oyuncu-*`, `--rozet-*`, `--sen` değeri `/^#[0-9a-f]{6}$/i` (sessiz gri hatasını önler).
5. **Mal ikonları:** 13+ malın her biri bir ikona eşlenmiş; bilinmeyen mal için nötr yedek.

### 7.6 Tasarım ajanına devredilecekler

Sahip ([12 §7](../12-yon-taslagi.md)) tasarım işinin daha güçlü modelli ayrı bir ajana verileceğini belirtti. Bu belge o ajanın **şartnamesidir**; devredilecek ve kabul ölçütü olanlar:

| İş | Kabul ölçütü |
|---|---|
| 20 yapı ikonu/silüeti (18 yapı + Ordugâh + Muhtarlık) | 24 px ızgara, 1,75 çizgi, katman rengiyle ayrışır, 16 px'te okunur |
| T1/T2 bina modelleri ve cephe/çatı çeşitliliği | ≤ 60 çizim çağrısı, ek texture yok, 4 aşama için 1 kit + ekstrüzyon |
| Giriş / Yerleş ekranı taslağı | §6.4 tablosuna uyar, ekranda en çok 3 canlı renk |
| Harita altlığı kalibrasyonu (§4 değerleri) | §4.9 kabul listesi |
| Oyuna özgü ikonlar (çay bardağı, dolmuş, kitabe, flama) | aynı çizgi dili |
| Renk körü modu ve yüksek kontrast stilleri | §3.9 |


---

## 8. Geri dönüşü zor kararlar ve öneriler

"Zor" = değiştirmenin maliyeti, kararın üstüne kurulan iş miktarıyla büyür.

| # | Karar | Neden geri dönüşü zor | Öneri | Dönüş maliyeti (öneriyle) |
|---|---|---|---|---|
| 1 | **Ana arayüz yazı tipi** | Satır sonları, panel genişlikleri, tablo sütunları, harita etiket çarpışma sayıları ve Türkçe uzunluk payı yazı tipinin genişliğine göre ayarlanır; değiştirmek tüm ekran görüntüsü ve yerleşim testlerini bozar | **Inter** (25,4 KB, ₺ + Türkçe doğrulandı). Serif eklemek sonradan kolaydır; ana yazı tipini değiştirmek kolay değildir | Orta (tüm ölçüler yeniden bakılır) |
| 2 | **Oyuncu renk sayısı ve sözleşmesi** | Sunucu her oyuncunun rengini saklar; oyuncular rengiyle ve emblemiyle tanınır, ittifak ve savaş yazışmaları renk adlarıyla yapılır; palet değişirse kimlikler kayar | **12 renk + 12 emblem; sunucuda hex değil `renkIndeksi` (0–11) + `paletSurumu`**; palet **yalnız sona eklenir**, sıra değişmez; 13–24 kesikli kenar | Düşük (indeks sözleşmesi ile), aksi hâlde Yüksek |
| 3 | **Açık "Kâğıt" + koyu "Arduvaz" iki birinci sınıf tema** | Marka, mağaza görselleri, ekran görüntüleri, kartografik değerler iki tema için ayrı kalibre edilir; birini sonradan eklemek iki kat iş | İkisi de başından, **varsayılan "otomatik"** (sistem tercihi); üretici + test iki temayı birlikte korur | Düşük (üretilen CSS) |
| 4 | **Harita etiket yolu: DOM mu, MapLibre glyph mi** | Glyph yolu ayrı yazı tipi dosyaları (PBF), Türkçe aralıkları ve `symbol` katmanları ister; DOM yolu çarpışmayı elle çözer. Seçim, altlık ve sokak adı kararlarını etkiler | **A2–A3'te DOM** (≤24 etiket); sokak adı gerekince A4'te Inter'den üretilmiş PBF. **Hemen: büyük harf yasağı** (MapLibre `toLocaleUpperCase()` yerel dil bağımsız) | Orta |
| 5 | **Görsel üslup sınırı** | 18 yapı × 4 aşama için asset üretim hattını belirler: fotogerçekçi doku mu, düz renk mi | **"İllüstratif düz gölgeli + prosedürel cephe/çatı"**: texture yok, kenar çizgili siluet, detay gölgelendiriciden (T1) ve yapıya özgü silüetten (T2). Sahibin "bina modellemeleri daha detaylı" isteği bu çerçevede karşılanır; fotogerçekçi doku **önerilmez** (≤60 çizim çağrısı ve bütçe) | Yüksek (hat kurulduktan sonra) |
| 6 | **İkon seti** | Mal, yapı, mercek, rozet ikonlarının hepsi bu çizgi diline göre çizilir | **Lucide** (ISC/MIT), 1,75 çizgi; oyuna özgü ikonlar aynı ızgarada | Orta (70+ ikon) |
| 7 | **Token kaynağı: TS (OKLCH) → üretilen hex CSS** | CSS'e `oklch()` yazmak MapLibre ve `hexRgb()` ile sessiz hata verir; JSON (DTCG) taslak | TS kaynak, hex çıktı, DTCG yalnız ileride dışa aktarım | Düşük |
| 8 | **Harita altlık şeması ve verisi** | Stil katman adları ve `kind` değerleri Protomaps v4 şemasına bağlıdır; Türkiye z0–z12 çıkarımı barındırma ister (boyut **ölçülmedi**); şema sürümü değişirse stil kırılır | **Altlığı sürümle sabitle** (PMTiles + şema sürümü), stil `kind` eşlemesini tek tabloda tut; L1–L2 için altlıksız (A2a) sürüm de yeterince bitmiş görünür | Orta |
| 9 | **"Sen" rengi sabit çini** | Oyuncu kendini hep çini, başkalarını soluk görür; ittifak konuşmalarında "yeşil oyuncu" ile kendi rengi arasında karışıklık olabilir; kişiselleştirme beklentisi doğar | **Sabit "Sen"** + profilde "başkaları seni X rengi/emblemiyle görür"; kendi rengiyle çizme seçeneği ayarlarda sonraya | Düşük–orta |

### 8.1 Açık sorular (sahip / lider)

1. **Varsayılan tema:** "otomatik" mi (öneri), yoksa ilk açılışta her zaman açık "Kâğıt" mı? İlk izlenim (küre kâğıt zeminde) açık temaya dayanır.
2. **Tek dosya bütçesi:** ayrı yazı tipi dosyası (öneri) mi, bütçeyi 420 KB'a çıkarmak mı?
3. **Altlık verisi:** Türkiye z0–z12 PMTiles çıkarımı ve DEM (Mapterhorn) barındırması yapılacak mı, yoksa A2a (altlıksız) ile mi başlanır?
4. **Oyuncu rengi seçimi:** oyuncu 12 renkten kendi seçsin mi (öneri: 3 öneriden seçer) yoksa sunucu mu atar?
5. **MapLibre eğim (pitch):** L3 → L4 geçişinde gerçek eğimli kamera istenir mi (şimdi `maxPitch: 0`)?
6. **Ek serif:** kitabe ve Akşam Defteri için törensel serif ister misiniz (+ ≈31–33 KB, ayrı dosya)?

### 8.2 Doğrulanmayanlar ve sınırlar

- Harita ve 3B sahne renkleri/genişlikleri **hesapla belirlenmiş başlangıç değerleridir**, ekranda kalibre edilmedi; bu belge görsel üretmedi. §4.9 kabul listesi, ilk uygulama turunda gözle ayarın ölçütüdür.
- APCA, WCAG 3 taslağıdır ve normatif değildir; uyumluluk ölçütü WCAG 2.2'dir. Machado benzetimi bir yaklaşımdır; gerçek renk körü kullanıcı testi yapılmadı.
- Oyun arayüzü gözlemleri geliştirici yazıları ve oyuncu yorumlarıdır; "(arama özeti)" ile işaretlenen kaynakların sayfaları doğrudan okunmadı.
- Protomaps `kind` değerleri `base_layers.ts` filtrelerinden alındı; Gebze dışında ve altlık dosyasıyla uçtan uca denenmedi. Mapterhorn karo biçimi (terrarium/mapbox) doğrulanmadı.
- `size-adjust`/`ascent-override` değerleri, `symbol` katmanı için Inter'den üretilecek glyph PBF boyutu, Türkiye PMTiles boyutu **ölçülmedi**.
- OFL `Reserved Font Name` beyanı alt küme dağıtımı için okunmadı (`OFL.txt` A0'da kontrol edilmeli).
- Süre tahminleri (§7.3) ve ΔE_OK eşikleri mühendislik yargısıdır.

---

## Kaynaklar

**Oyun arayüzü ve sanat yönü:** [Anno 117 — arayüz ekibi](https://www.anno-union.com/devblog-the-user-interface-team-and-a-deeper-dive-into-the-visuals/) · [Anno 117 erişilebilirlik](https://news.ubisoft.com/en-us/article/2FfSSEUp1jtg9isC9NxowP/anno-117-pax-romana-accessibility-spotlight) · [Victoria 3 Dev Diary #49](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-49-graphic-overview) · [Against the Storm arayüz güncellemesi](https://eremitegames.com/interface-update/) · [Frostpunk 2 arayüz iyileştirmeleri](https://www.pcgamesn.com/frostpunk-2/ui-improvements) · [Civilization VII arayüz düzeltmeleri](https://www.pcgamesn.com/civilization-vii/ui-fixes) · [CS2 renk doygunluğu tartışması](https://steamcommunity.com/app/949230/discussions/0/5824898961051871666/) · [Mini Motorways](https://en.wikipedia.org/wiki/Mini_Motorways) · [Townscaper](https://townscaper.org/) · [Manor Lords arayüz yorumları](https://steamcommunity.com/app/1363080/discussions/0/598539452432936012/)

**Web kartografisi:** [CARTO Voyager](https://carto.com/blog/new-voyager-basemap/) · [CARTO Positron/Dark Matter](https://carto.com/blog/positron-dark-matter-new-look/) · [Voyager stil JSON](https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json) · [Positron stil JSON](https://basemaps.cartocdn.com/gl/positron-gl-style/style.json) · [Protomaps flavors.ts](https://raw.githubusercontent.com/protomaps/basemaps/main/styles/src/flavors.ts) · [Protomaps base_layers.ts](https://raw.githubusercontent.com/protomaps/basemaps/main/styles/src/base_layers.ts) · [Protomaps flavors belgesi](https://docs.protomaps.com/basemaps/flavors) · [Protomaps glyph varlıkları](https://protomaps.github.io/basemaps-assets/fonts.json) · [Felt: güzel harita](https://felt.com/blog/how-to-design-a-beautiful-map) · [Felt: web harita ipuçları](https://www.felt.com/blog/cartography-tips-for-designing-web-maps) · [Stamen Maps](https://maps.stamen.com/) · [Mapbox Standard](https://docs.mapbox.com/map-styles/standard/guides/) · [MapLibre stil spesifikasyonu](https://maplibre.org/maplibre-style-spec/layers/) (yerelde `@maplibre/maplibre-gl-style-spec 24.10.0`; `maplibre-gl 5.24.0` paketi incelendi) · [Mapterhorn](https://mapterhorn.com/)

**Renk bilimi ve erişilebilirlik:** [Ottosson — Oklab](https://bottosson.github.io/posts/oklab/) · [MDN oklch()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/oklch) · [MDN light-dark()](https://developer.mozilla.org/en-US/docs/Web/CSS/color_value/light-dark) · [WCAG 2.2 SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) · [APCA giriş](https://git.apcacontrast.com/documentation/APCAeasyIntro.html) (hesap `apca-w3 0.1.9` ile doğrulandı) · [Machado, Oliveira, Fernandes 2009](https://www.inf.ufrgs.br/~oliveira/pubs_files/CVD_Simulation/CVD_Simulation.html) · [Paul Tol renk şemaları](https://sronpersonalpages.nl/~pault/) · [Okabe-Ito](https://scifig.ai/blog/okabe-ito-color-palette-hex-codes) · [Radix Colors ölçeği](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale) · `culori 4.0.2` (dönüşüm çapraz doğrulaması)

**Tipografi ve ikon:** [Inter](https://github.com/google/fonts/tree/main/ofl/inter), [Source Sans 3](https://github.com/google/fonts/tree/main/ofl/sourcesans3), [Noto Sans](https://github.com/google/fonts/tree/main/ofl/notosans), [IBM Plex Sans](https://github.com/google/fonts/tree/main/ofl/ibmplexsans) ve diğer adaylar (`google/fonts` `ofl/`); alt küme ölçümü `fontTools` ile · [Fontsource](https://fontsource.org/) · [Lucide](https://lucide.dev/) (`lucide-static 1.49.0`, ISC) · [Phosphor](https://phosphoricons.com/) (`@phosphor-icons/core 2.1.1`, MIT) · [Tabler Icons](https://tabler.io/icons) (`@tabler/icons 3.48.0`, MIT) · [Design Tokens Format Module](https://www.designtokens.org/tr/drafts/format/)

**Proje içi:** [12 — Yön taslağı](../12-yon-taslagi.md) · [arayuz-ux](arayuz-ux.md) · [oyun-kimligi-harman §4.3–4.4](oyun-kimligi-harman.md) · [harita-istemci](harita-istemci.md) · [yuru-istemci](yuru-istemci.md) · [arsa-ve-insa-derinlestirme](arsa-ve-insa-derinlestirme.md) · kod: `packages/istemci/src/arayuz/stil.css`, `harita/harita.css`, `harita/gorunum.ts`, `kure/tema.ts`, `veri/renkler.ts`, `yuru/palet.ts`, `yuru/malzeme.ts`
