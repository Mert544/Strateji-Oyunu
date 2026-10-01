# Veri Kaynakları (DATA_SOURCES)

Bu belge, gerçek dünya harita dilimini (`packages/veri/haritalar/gercek-karadeniz*.json`) üreten veri hattının
(`packages/veri-hatti`, `pnpm harita:gercek`) kaynaklarını, lisanslarını, dönüşüm kurallarını ve **sınır/isim
politikası kararlarını** toplar. Oyun içi "Hakkında / Atıflar" ekranı bu belgeden üretilmelidir.

Tek cümle özet: **bölge şekilleri, limanlar ve nüfus işaretleri Natural Earth'ten (kamu malı); cevher/bakır
doğrulaması USGS MRDS'ten (kamu malı); kömür, petrol, tahıl ve silis rezervleri elle, genel kamu bilgisiyle yazılmış
tasarım tablosudur.** OSM türevi, GADM, FAOSTAT, WorldClim ve UN Comtrade KULLANILMADI.

## 1. Kaynaklar

| Kaynak | Sürüm / tarih | Lisans | Hatta kullanımı | İndirme ve bütünlük |
|---|---|---|---|---|
| **Natural Earth 1:10m Admin 1 – States, Provinces** (`ne_10m_admin_1_states_provinces`) | v5.1.2 (git etiketi `v5.1.2`, 2022-05-13) | Kamu malı (public domain); izin ve atıf gerekmez | Bölge çokgenleri: yapılandırmadaki admin-1 listeleri `mapshaper` ile birleştirilir ve sadeleştirilir; komşuluk, ortak sınır uzunluğu, kıyı, merkez ve konum buradan çıkar | `nvkelso/natural-earth-vector` `v5.1.2/geojson/`; 40 726 851 bayt |
| **Natural Earth 1:10m Admin 0 – Countries** (`ne_10m_admin_0_countries`) | v5.1.2 | Kamu malı | YALNIZCA kara/deniz maskesi (0.02° ızgara) — deniz yolu mesafesi ve kıyı tespiti için. Ülke adı/atamaları kullanılmadı | 13 287 234 bayt |
| **Natural Earth 1:10m Ports** (`ne_10m_ports`) | v5.1.2 | Kamu malı | `liman` + `kiyi` etiketleri ve deniz kenarı uçları (NGA World Port Index 403 verdiği için kullanılamadı) | 279 075 bayt |
| **Natural Earth 1:10m Populated Places (simple)** (`ne_10m_populated_places_simple`) | v5.1.2 | Kamu malı | Bölge nüfusu (`pop_max` toplamı, bölüm 5) ve NE ports'ta olmayan 5 limanın konumu (bölüm 3) | 4 932 147 bayt |
| **USGS Mineral Resources Data System (MRDS)** (`mrds-csv.zip`, `mrds.csv`) | Dosya tarihi 2022-08-23 (`Last-Modified`); metaveri yayın yılı 2005, U.S. Geological Survey | Kamu malı: ABD federal hükümeti çalışması; metaverideki `Access_Constraints: none`, `Use_Constraints: none` | Rezerv tablosundaki cevher (`Iron`) ve bakır (`Copper`) iddialarının bölge çokgeni içindeki/yakınındaki kayıtlarla **doğrulanması** (bölüm 4) | `https://mrdata.usgs.gov/mrds/mrds-csv.zip`; 25 791 223 bayt |

sha256 özetleri (kilit dosyasıyla aynı):

```
ne_admin1  22d0e3ad85eb3e27f17cabf8ba2d50e554fbc27a87796ff891d958185da62fb5
ne_admin0  239eec57ac17f100a11e2536cffc56752c318b50ae765b0918ff7aab4ce8f255
ne_ports   c5a5028f5187a5e1b9fe7f0fab99804a8be7482099a2365d404fb7e9dd6b5457
ne_places  fd3fa867a320cbd5c5b6bb5bc550afeec2939fb2cef688e508007282a55ac42f
usgs_mrds  31be4baaa86b082787bc74989146183db21badf7157db39b3f0a6fe0b38a5477
```

Ham dosyalar repo dışında `packages/veri-hatti/.onbellek/` dizininde durur (`.gitignore`). Bütünlük özetleri
`packages/veri-hatti/yapilandirma/kaynak-ozetleri.json` içinde kilitlidir; indirilen/önbellekteki dosya kilitle
uyuşmazsa hat durur (`pnpm harita:gercek kilitle` bilerek yeniden kilitler). Natural Earth için `master` yerine
etiketli sürüm sabitlendi (master ile bayt bayt aynı doğrulandı; etiket değişmez).

### Atıf metinleri (harita dosyasındaki `atif` alanı ve oyun içi atıf ekranı)

- "Made with Natural Earth. Free vector and raster map data @ naturalearthdata.com." (kamu malı; atıf zorunlu değil, nezaket)
- "USGS Mineral Resources Data System (MRDS), U.S. Geological Survey (kamu malı)."
- "Bölge sınırları, adları ve devletler oyun tasarımıdır; hiçbir devletin resmî sınır veya egemenlik görüşünü yansıtmaz."

## 2. KULLANILMAYAN kaynaklar ve nedenleri

| Kaynak | Neden |
|---|---|
| OpenStreetMap ve türevleri (Geofabrik, Kontur nüfus vb.) | ODbL share-alike riski; bilerek kullanılmadı |
| GADM | Lisans ticari kullanıma kapalı |
| FAOSTAT, WorldClim | CC BY-NC-SA (ticari değil); ticari sürüm için uygun değil |
| UN Comtrade | Ticari olmayan ve yeniden dağıtımı yasaklayan şartlar |
| NGA World Port Index | Bu ortamdan erişilemedi (HTTP 403) → Natural Earth ports kullanıldı |
| IMF PortWatch, geoBoundaries | Bu hatta gerekmedi / kullanılmadı |
| Kömür ve petrol için herhangi bir veri dosyası | MRDS'te kömür ve petrol/gaz yoktur; bu iki mal için bir kaynak dosyası sorgulanmadı (bölüm 4'teki dürüstlük notu) |

## 3. Hat adımları (özet) ve dönüşüm kuralları

`pnpm harita:gercek` — deterministik (aynı girdi → bayt bayt aynı çıktı; testle doğrulanır).

1. **İndir**: önbellekli, sha256 kilitli.
2. **Birleştir ve sadeleştir**: `yapilandirma/karadeniz.json` bölge → admin-1 kimlik listesi (`mapshaper -dissolve2`, sonra Visvalingam sadeleştirme, tutulan köşe oranı 0.5, TopoJSON nicemleme 100 000). Çıktı: `gercek-karadeniz-sinirlar.topo.json`, nesne adı `bolgeler`, her geometride `properties.id`.
3. **Komşuluk → kara kenarları**: sadeleştirilmiş TopoJSON'da ortak yay paylaşan bölgeler; 8 km'den kısa ortak sınır (nokta teması) komşuluk sayılmaz.
   - **Arazi sınıfı**: bir uçta `dar_gecit` → geçit; bir uçta `dag` → dağ; aksi ova. Arazi etiketleri (`dag`, `ova`, `dar_gecit`) **elle** verilir (yükseklik modeli kullanılmadı); bir bölgede `dag` ve `ova` birlikte olmaz, tahıl rezervi yalnızca `ova` bölgelerinde.
   - **Süre** = merkezler arası kuş uçuşu × 1.25 (kıvrım) ÷ hız, yukarı yuvarlanır: ova 70 km/sa (1–10 saat), dağ 35 km/sa (5–10), geçit 50 km/sa (3–6).
   - **Kapasite** (mili-birim/saat): sınıf aralığı sentetik haritayla aynı (ova 520k–760k, dağ 140k–220k, geçit 280k–360k); ortak sınır uzunluğu 250 km'de üst değere ulaşır, doğrusal, 10 000'e yuvarlanır.
4. **Boğazlar ve geçitler**: İstanbul ve Çanakkale bölgeleri `dar_gecit` etiketlidir ve Avrupa–Asya kara bağlantısı yalnızca onlardan geçer (il geometrisi iki yakayı da içerir; İstanbul bölgesi tek parçadır). Ayrıca iki dağ geçidi: **Şipka Geçidi** (Gabrovo + Lovech; Balkan Dağları) ve **Kafkas Geçidi** (Racha, Imereti, Shida Kartli, Mtskheta-Mtianeti; Likhi/Surami ve Darial). Geçidi atlayan doğrudan kara kenarları *oyun kuralı olarak* kaldırılmıştır (`kaldirilanKaraKenarlari`, nedenleriyle): Balkan Dağları'nı Şipka dışında aşan 4 kenar ve batı–doğu Gürcistan arasındaki Likhi Dağları kenarı. Bu, gerçek yol ağının tam bir modeli değildir; darboğaz tasarım kararıdır.
5. **Limanlar ve deniz kenarları**:
   - Liman = NE ports noktası, kıyı bir bölgenin içinde (veya 6 km içinde) ve denize ≤ 80 km yakın. NE ports'ta bulunmayan 5 liman (Köstence, Zonguldak, Antalya, İzmit, Rize) yapılandırmada gerekçesiyle NE populated places yerleşim noktasından eklendi. Nehir limanı olan iç bölgeler liman sayılmadı (Galați: Siret Havzası kıyı değil).
   - Kıyı = bölge sınırı köşelerinden en az 5'i deniz hücresine komşu (0.02° ≈ 2.2 km ızgara, NE admin-0 = kara).
   - Deniz mesafesi: ızgarada Dijkstra (8 komşu + at hamleleri, köşe kesmek yok). İstanbul ve Çanakkale boğazları yapılandırmadaki çizgilerle ızgarada açılır.
   - Kenar seçimi: yalnızca ortak **havzadaki** (Karadeniz, Marmara, Ege, Akdeniz) ve kara komşusu olmayan limanlar arasında; her liman en yakın 2 komşusuna, sonra bağlılık en kısa kenarlarla tamamlanır. İstanbul (Karadeniz+Marmara) ve Çanakkale (Marmara+Ege) iki havzaya birden üyedir; Karadeniz ↔ Ege/Akdeniz deniz bağlantısı yalnızca bu iki bölgeden geçer.
   - **Süre** = deniz mesafesi ÷ 25 km/sa (yük gemisi ~13.5 knot), 3–72 saat. **Kapasite** 1 600 000–2 350 000, iki ucun en küçük nüfus ölçeğine göre.
   - 4 hava kenarı (devletlerin en büyük bölgeleri arasında, 3 saat+, düşük kapasite); aynı çifte başka kenar varsa konmaz.
6. **Nüfus** (bölüm 5): logaritmik ölçek, 50 000–800 000.
7. **Rezervler** (bölüm 4) ve **başlangıç tesisleri**: bölgenin en büyük iki rezervi için karşılık gelen ham çıkarım tesisi (tahıl → `ciftlik`, `ova` etiketi gerekir), ardından yapılandırmadaki sanayi tesisi; en çok 3. Tablo veri paketinin çapraz kontrolünden (etiket/rezerv uyumu) geçer.
8. **Konum ve x/y**: bölge merkezi = alan ağırlıklı ağırlık merkezi (çokgenin dışına düşerse — L biçimli bölge, adalar — en büyük çokgenin merkez enleminde en geniş iç aralığın ortası); `konum` mikro derece; `x/y` = merkezlerin eş dikdörtgensel izdüşümü, 0–1000 karesine tek ölçekle (40 birim kenar boşluğu) oturtulur, kuzey yukarıda.
9. **Çıktı ve doğrulama**: `gercek-karadeniz.json` (`sinirDosyasi`, `atif` dolu) `dogrulaVeriPaketi`'nden (varsayılan içerik ve parametrelerle) geçmeden yazılmaz. Raporlar: `packages/veri-hatti/rapor/hat-raporu.json`.

## 4. Rezervler: satır satır kaynak

Ölçek sentetik haritayla aynıdır (**bin birim**, `×1 000 000` ile mili-birim; 100–1100). Tablo **elle** yazılmıştır
ve **oyun tasarım dengesi** gözetir: bir ham mal bir bölgede gerçek jeolojiye uygun olsa bile oyunda bilerek
yer almayabilir (kaynak dengesizliği; her devletin zinciri tek başına eksiktir). MRDS'te kayıt olup tabloya
alınmayan adaylar `hat-raporu.json` → `mrdsAdaylari` içinde listelenir.

**Dürüstlük notu (kaynak düzeyi):**

- **Cevher (`Iron`) ve bakır (`Copper`)**: USGS MRDS doğrulama katmanıdır. Bir iddia, bölge çokgeni içinde (veya 35 km yakınında) en az bir MRDS kaydıyla desteklenmelidir; kayıt ağırlığı: Producer 3, Past Producer 2, Prospect/Occurrence/Unknown 1, Plant (işleme tesisi) 0. MRDS metaverisine göre konum doğruluğu "çok değişken" ve ABD dışı kapsam "eksik"tir; bu yüzden 35 km tolerans vardır. Destek yoksa iddia `mrdsMuaf` ile ve gerekçesiyle işaretlenmelidir (şu an yalnızca Sofya Havzası: Kremikovtsi MRDS'te yok; Elatsite MRDS'te var ama çokgenin dışında). MRDS miktar vermez; **miktarlar tasarım ölçeğidir**, MRDS'ten türetilmemiştir.
- **Silis**: MRDS'te `Silica` kaydı bölgede neredeyse yoktur; silis miktarları elle genel bilgidir (ticari kuvars kumu/cam sanayii bölgeleri).
- **Kömür, petrol, tahıl**: MRDS kapsamında **değildir**. Bu satırlar elle, kamuya açık genel bilgiyle (USGS Minerals Yearbook ülke bölümleri gibi kamu malı kaynakların genel içeriği; havza/saha adları) yazılmıştır. Bu çalışmada bir kaynak dosyası **sorgulanmadı**; sayılar ölçek ve sıralama için tasarım değerleridir ve gerçek rezerv ölçümü değildir. Yayın öncesinde bir jeoloji danışmanı veya USGS Minerals Yearbook ile gözden geçirilmesi önerilir.

<!-- REZERV-TABLOSU-BASLA -->
| Bölge | Rezervler (bin birim) | MRDS doğrulaması (cevher/bakır) | Gerekçe ve kaynak |
|---|---|---|---|
| `budjak` | tahil 1000 | — | Güney Ukrayna bozkırı: tahıl ve ayçiçeği kuşağı (genel bilgi; MRDS'te metal kaydı yok) |
| `tuna_deltasi` | tahil 300 | — | Delta çevresi tarım (genel bilgi) |
| `dobruca` | tahil 800, petrol 180 | — | Dobruca tahıl ovası; Romanya Karadeniz şelfi petrol/gaz ve Năvodari rafinerisi (genel bilgi) |
| `siret` | tahil 900, petrol 100 | — | Moldova ovası tahılı; Bacău/Vrancea petrol sahaları; Galați çelik tesisi (genel bilgi) |
| `prahova` | tahil 400, petrol 280, silis 120 | — | Prahova vadisi petrolü (Ploiești, dünyanın ilk rafinerilerinden); Buzău kuvars kumu (genel bilgi) |
| `eflak` | tahil 1100 | — | Güney Romanya ovası (Bărăgan) tahılı (genel bilgi) |
| `guney_karpatlar` | komur 360 | — | Gorj linyiti ve Jiu Vadisi taşkömürü (genel bilgi; MRDS'te Hunedoara yalnız çelik tesisi kaydı var, cevher iddiası alınmadı) |
| `tuna_ovasi` | tahil 900, komur 80 | — | Kuzey Bulgaristan Tuna ovası tahılı; Batı Tuna linyit (genel bilgi) |
| `tuna_platosu` | tahil 800, silis 140 | — | Ludogorie tahılı; Senovo-Vetovo kuvars-kaolin kumları (genel bilgi) |
| `varna` | tahil 900, petrol 50 | — | Dobruca tahılı; Tülenovo kıyı petrolü (genel bilgi) |
| `sipka` | yok | — | Balkan Dağları orta geçitleri (Şipka, Troyan); Gabrovo makine sanayii (genel bilgi) |
| `pannon` | tahil 1100, petrol 80 | — | Voyvodina ve Banat tahıl ovası; Banat petrol sahaları (genel bilgi) |
| `morava` | komur 320, bakir 260 | bakir: içeride 14, yakın 9 (Besna Kobila Mtn. Deposits; Kisnica Mine; Majdanpek) | Kolubara ve Kostolac linyiti; Bor-Majdanpek bakır kuşağı (genel bilgi + MRDS bakır kayıtları) |
| `adriyatik` | petrol 180, bakir 100, cevher 80 | cevher: içeride 23, yakın 0 (Bushtrica Mine; Guri Kuq Including: See Alt Names; Guri Kuq Mine)<br>bakir: içeride 17, yakın 3 (Fushe-Arrez; Golaj; Kurbnesh-Perlat) | Patos-Marinza petrolü; Kukës/Rubik bakırı; Pogradec nikelli demir cevheri (genel bilgi + MRDS) |
| `vardar` | tahil 350, komur 160, bakir 120 | bakir: içeride 3, yakın 0 (Bucim) | Bučim/Radoviš bakırı; Bitola-Oslomej linyiti; Pelagonya ovası (genel bilgi + MRDS) |
| `sofya` | cevher 160, bakir 140, komur 120 | cevher: MUAF (MRDS'te kayıt yok/kaba konumlu; gerekçe sağda)<br>bakir: MUAF (MRDS'te kayıt yok/kaba konumlu; gerekçe sağda) | Kremikovtsi demir cevheri ve çelik kombinası; Elatsite-Chelopech bakırı; Pernik/Bobov Dol linyiti (genel bilgi; Elatsite MRDS'te var ama konumu kaba, çokgenin 35 km dışında; Kremikovtsi MRDS'te yok -> mrdsMuaf) |
| `meric` | tahil 700, komur 400, bakir 120 | bakir: içeride 33, yakın 0 (Assarel; Chelopech; Elatzite) | Maritsa-Iztok linyit havzası (Güneydoğu Avrupa'nın en büyüğü); Trakya ovası; Panagyurishte bakırı (genel bilgi + MRDS) |
| `burgaz` | tahil 400 | — | Burgaz-Yambol ovası tahılı; Neftochim Burgas rafinerisi (genel bilgi; MRDS'te bölgede bakır/demir yatak kaydı yok, iddia alınmadı) |
| `pindus` | tahil 800, komur 340 | — | Ptolemaida-Amyntaio linyiti; Teselya tahıl ovası (genel bilgi) |
| `selanik` | tahil 500, bakir 100 | bakir: içeride 1, yakın 0 (Trilofon) | Kasandra/Skouries bakır-altın; Aksios-Serres ovası; Selanik rafinerisi (genel bilgi + MRDS) |
| `rodop_kiyisi` | tahil 500, petrol 80 | — | Prinos (Taşos) kıyı petrolü; Trakya ovası (genel bilgi) |
| `attika` | cevher 100 | cevher: içeride 9, yakın 0 (Euboia; Hagios Ioannis Larymna; Larymna Mine and Euboea Island Deposit) | Larymna nikelli demir cevheri; Eleusis/Aspropyrgos rafineri kuşağı (genel bilgi + MRDS) |
| `mora` | komur 200 | — | Megalopoli linyiti (genel bilgi) |
| `girit` | tahil 250 | — | Mesara ovası ve zeytin/sebze tarımı (genel bilgi) |
| `ege_adalari` | yok | — | Adalar: turizm/tarım ekonomisi; belirgin ham rezerv tablosuna alınmadı (genel bilgi) |
| `trakya` | tahil 1000, silis 140, petrol 50 | — | Trakya buğday/ayçiçeği; Kırklareli kuvars kumu; Trakya gaz/petrol sahaları (genel bilgi) |
| `istanbul` | silis 120 | — | Şile kuvars kumu (genel bilgi) |
| `canakkale` | komur 120 | — | Çan linyiti (genel bilgi) |
| `izmit` | tahil 400, silis 80 | — | Sakarya kuvars kumu; Adapazarı ovası; İzmit rafinerisi (genel bilgi) |
| `guney_marmara` | tahil 600, komur 80 | — | Bursa/Susurluk ovaları; Keles/Dursunbey linyiti; Bursa otomotiv sanayii (genel bilgi) |
| `ege` | tahil 500, komur 280 | — | Soma linyiti; Gediz ovası (genel bilgi) |
| `menderes` | tahil 400, komur 180 | — | Yatağan/Milas linyiti; Büyük Menderes ovası (genel bilgi) |
| `frigya` | tahil 500, komur 280, silis 160 | — | Tunçbilek/Seyitömer linyiti; Eskişehir-Kütahya kuvars ve feldispat; plato tahılı (genel bilgi) |
| `antalya` | tahil 250 | — | Antalya ovası ve seralar (genel bilgi) |
| `cukurova` | tahil 1000, cevher 100 | cevher: içeride 2, yakın 0 (Icel, Adana, and Kahramanmaras; Karatas) | Çukurova tahıl ovası; Hatay demir cevheri (genel bilgi + MRDS) |
| `konya` | tahil 1200 | — | Türkiye'nin en büyük tahıl ovası (genel bilgi) |
| `ankara` | tahil 600, komur 80 | — | İç Anadolu tahılı; Beypazarı/Çayırhan linyiti; Kırıkkale savunma sanayii (genel bilgi) |
| `bati_karadeniz` | komur 360 | — | Zonguldak taşkömürü havzası (Türkiye'nin tek taşkömürü); Ereğli/Karabük çelik (genel bilgi) |
| `kastamonu` | bakir 140 | bakir: içeride 6, yakın 0 (Asikoy Mine; Bakibaba Mine) | Küre bakır-piriti (genel bilgi + MRDS bakır) |
| `kapadokya` | tahil 700 | — | Aksaray-Niğde ovası tahılı; Kayseri sanayii (genel bilgi; MRDS'te bölgede demir yatak kaydı yok, iddia alınmadı) |
| `sivas` | cevher 360, komur 100 | cevher: içeride 14, yakın 0 (Cetinkaya Mine; Divrigi; Divrigi Iron Ore Deposit) | Divriği demir cevheri; Kangal linyiti (genel bilgi + MRDS) |
| `orta_karadeniz` | tahil 1000 | — | Bafra/Çarşamba ovaları ve Çorum-Amasya tahılı (genel bilgi) |
| `firat` | tahil 1100, komur 260, petrol 200 | — | Harran ovası; Adıyaman petrol sahaları; Afşin-Elbistan linyiti (genel bilgi) |
| `dicle` | tahil 400, petrol 360, bakir 100 | bakir: içeride 3, yakın 0 (Cambasi; Ergani Bakir Isletmesi; Siirt) | Batman-Raman ve Şırnak petrolü (ülke üretiminin çoğu); Ergani bakırı; Batman rafinerisi (genel bilgi + MRDS) |
| `yukari_firat` | cevher 280, bakir 140 | cevher: içeride 25, yakın 0 (Attepe Mine; Deveci Mine; Ergani)<br>bakir: içeride 7, yakın 0 (Ergani; Ergani - Maden; Karabork) | Hekimhan demir cevheri; Maden/Ergani bakır kuşağı (genel bilgi + MRDS) |
| `erzurum` | komur 50 | — | Aşkale linyiti (küçük); hayvancılık yaylası (genel bilgi) |
| `van` | yok | — | Belirgin ham rezerv yok (genel bilgi) |
| `kars` | yok | — | Belirgin ham rezerv yok; hayvancılık platosu (genel bilgi) |
| `dogu_karadeniz` | bakir 140 | bakir: içeride 15, yakın 3 (Guzelyayla; Kankoy Yomra; Kutlular Surmene) | Giresun/Gümüşhane/Trabzon bakır-çinko kuşağı (genel bilgi + MRDS) |
| `coruh` | bakir 200 | bakir: içeride 15, yakın 0 (Cakmakkaya Mine; Damar Mine; Murgul) | Murgul ve Çayeli bakır madenleri (genel bilgi + MRDS) |
| `kolhis` | tahil 300, komur 80 | — | Kolheti ovası; Tkvarçeli taşkömürü (genel bilgi) |
| `kafkas_gecidi` | komur 120 | — | Tkibuli-Şaori taşkömürü; Likhi/Surami ve Darial geçitleri (genel bilgi) |
| `kur_vadisi` | tahil 600, bakir 100, petrol 50 | bakir: içeride 3, yakın 3 (Alaverdi; Madneuli Mine) | Kakheti/Kartli ovaları; Bolnisi bakır-altın; Samgori petrolü (genel bilgi + MRDS) |
<!-- REZERV-TABLOSU-BITIS -->

## 5. Nüfus: ölçekleme kuralı

Bölge nüfusu = Natural Earth populated places noktalarının (`pop_max`) bölge çokgeni içindeki toplamı `P`.
Çokgenin hemen dışında (≤ 10 km, kıyı genelleştirmesi) kalan yerleşim en yakın bölgeye atanır. Oyun nüfusu **logaritmik
(geometrik) ölçekle** 50 000–800 000 aralığına taşınır:

```
t = (ln P − ln Pmin) / (ln Pmax − ln Pmin)        Pmin, Pmax: tüm bölgelerdeki en küçük/en büyük P
nüfus = 50 000 × (800 000 / 50 000) ^ t           1000'e yuvarlanır
```

En küçük `P` bölge 50 000, en büyük `P` bölge 800 000 olur; aradakiler oran olarak korunur. Hiç yerleşim noktası
düşmeyen bölge `Pmin / 2` sayılır. NE yerleşim listesi seçicidir (bölge başına birkaç–onlarca şehir), bu yüzden `P`
gerçek nüfus değil **kentsel ağırlık göstergesidir**; oyun nüfusu sentetik harita aralığıyla uyumlu olsun diye ölçeklenir.

<!-- NUFUS-TABLOSU-BASLA -->
| Bölge | NE yerleşim pop_max toplamı | Yerleşim sayısı | En büyük yerleşimler (pop_max) | Oyun nüfusu |
|---|---:|---:|---|---:|
| `budjak` | 1128296 | 3 | Odessa 991000, Izmayil 83194, Illichivsk 54102 | 264000 |
| `tuna_deltasi` | 92475 | 1 | Tulcea 92475 | 74000 |
| `dobruca` | 303399 | 1 | Constanta 303399 | 136000 |
| `siret` | 1224644 | 6 | Iasi 325914, Galati 311156, Braila 213569 | 275000 |
| `prahova` | 622952 | 4 | Ploiesti 232542, Pitesti 171021, Buzau 130954 | 195000 |
| `eflak` | 2265318 | 6 | Bucharest 1942000, Slatina 78988, Calarasi 73224 | 376000 |
| `guney_karpatlar` | 683259 | 5 | Craiova 304142, Rimnicu Vilcea 107558, Drobeta-Turnu Severin 106578 | 205000 |
| `tuna_ovasi` | 290868 | 4 | Pleven 118675, Vratsa 71633, Turnovo 53115 | 133000 |
| `tuna_platosu` | 309838 | 3 | Ruse 184270, Shumen 87283, Razgrad 38285 | 137000 |
| `varna` | 407601 | 2 | Varna 312770, Dobrich 94831 | 158000 |
| `sipka` | 42211 | 1 | Lovec 42211 | 50000 |
| `pannon` | 956952 | 6 | Timisoara 315053, Novi Sad 225457, Arad 169065 | 243000 |
| `morava` | 1690197 | 4 | Belgrade 1099000, Nis 250000, Kragujevac 171197 | 324000 |
| `adriyatik` | 1936996 | 26 | Tirana 895350, Elbasan 165010, Shkoder 155767 | 347000 |
| `vardar` | 699747 | 3 | Skopje 494087, Tetovo 119132, Bitola 86528 | 207000 |
| `sofya` | 1318534 | 3 | Sofia 1185000, Pernik 82467, Kyustendil 51067 | 286000 |
| `meric` | 563624 | 3 | Plovdiv 340494, Stara Zagora 143431, Khaskovo 79699 | 186000 |
| `burgaz` | 292334 | 2 | Burgas 195966, Sliven 96368 | 133000 |
| `pindus` | 325694 | 3 | Larissa 128758, Volos 110632, Ioanina 86304 | 141000 |
| `selanik` | 942437 | 4 | Thessaloniki 828000, Seres 55886, Katerini 53293 | 241000 |
| `rodop_kiyisi` | 208420 | 4 | Kavala 59240, Alexandroupoli 52979, Xanthi 50570 | 112000 |
| `attika` | 3827153 | 4 | Athens 3242000, Piraievs 466065, Chalkida 71842 | 490000 |
| `mora` | 416489 | 7 | Patra 163360, Agrinio 75233, Kalamata 71823 | 159000 |
| `girit` | 224715 | 3 | Iraklio 137154, Hania 78728, Sitia 8833 | 117000 |
| `ege_adalari` | 144692 | 5 | Rodos 56969, Mitilini 29328, Hios 26891 | 93000 |
| `trakya` | 397879 | 4 | Edirne 126470, Tekirdag 122287, Luleburgaz 90899 | 156000 |
| `istanbul` | 10061000 | 1 | Istanbul 10061000 | 800000 |
| `canakkale` | 87791 | 1 | Canakkale 87791 | 72000 |
| `izmit` | 1013400 | 3 | Izmit 466504, Sakarya 286787, Adapazari 260109 | 250000 |
| `guney_marmara` | 1793801 | 3 | Bursa 1492000, Balikesir 261516, Bilecik 40285 | 334000 |
| `ege` | 2830971 | 2 | Izmir 2587000, Manisa 243971 | 421000 |
| `menderes` | 696725 | 4 | Denizli 372344, Aydin 198857, Soke 77341 | 207000 |
| `frigya` | 1009731 | 4 | Eskisehir 514869, Kutahya 185008, Afyon 156992 | 250000 |
| `antalya` | 1021492 | 3 | Antalya 783000, Isparta 172334, Burdur 66158 | 251000 |
| `cukurova` | 3350692 | 6 | Adana 1293000, Tarsus 894318, Icel 616990 | 458000 |
| `konya` | 1131516 | 3 | Konya 919000, Karaman 120399, Eregli 92117 | 264000 |
| `ankara` | 4186115 | 5 | Ankara 3716000, Kirikkale 211138, Kirsehir 94336 | 513000 |
| `bati_karadeniz` | 382111 | 3 | Zonguldak 156918, Karabuk 128564, Bolu 96629 | 153000 |
| `kastamonu` | 105236 | 2 | Kastamonu 70402, Sinop 34834 | 79000 |
| `kapadokya` | 759406 | 3 | Kayseri 592840, Nigde 91039, Nevsehir 75527 | 216000 |
| `sivas` | 481605 | 3 | Sivas 264022, Tokat 129702, Yozgat 87881 | 172000 |
| `orta_karadeniz` | 973105 | 4 | Samsun 609339, Corum 183418, Bafra 97452 | 245000 |
| `firat` | 2175639 | 5 | Gaziantep 1044000, Sanliurfa 449549, Kahramanmaras 376045 | 368000 |
| `dicle` | 1284912 | 5 | Diyarbakir 644763, Batman 302074, Nusaybin 152668 | 282000 |
| `yukari_firat` | 842696 | 4 | Malatya 461574, Elazig 271492, Bingol 80568 | 228000 |
| `erzurum` | 720488 | 4 | Erzurum 420691, Erzincan 129407, Agri 87854 | 210000 |
| `van` | 585445 | 4 | Van 371713, Hakkari 77699, Tatvan 73222 | 189000 |
| `kars` | 77486 | 1 | Kars 77486 | 68000 |
| `dogu_karadeniz` | 1050945 | 4 | Trabzon 764714, Ordu 155117, Giresun 98864 | 255000 |
| `coruh` | 311722 | 2 | Rize 279450, Artvin 32272 | 138000 |
| `kolhis` | 284237 | 3 | Batumi 155542, Sukhumi 81546, Poti 47149 | 131000 |
| `kafkas_gecidi` | 222447 | 2 | Kutaisi 183945, Tskhinvali 38502 | 116000 |
| `kur_vadisi` | 1257063 | 2 | Tbilisi 1100000, Rustavi 157063 | 279000 |
<!-- NUFUS-TABLOSU-BITIS -->

## 6. Sınır ve isim politikası kararları

Bu kararlar `docs/00-vizyon-ve-kararlar.md` ilkelerine dayanır: **oyuncu gerçek bir ülkeyi değil, gerçek coğrafyadaki
bir BÖLGEYİ yönetir; ittifaklar oyun içi bloklardır; güncel gerçek çatışmalar senaryo yapılmaz.**

1. **Devletler kurgusaldır.** Korvan Cumhuriyeti, İsvend Federasyonu, Talmera Birliği, Zephra Konfederasyonu (coğrafi/tarihsel çağrışımsız uydurma adlar; kimlikleri `korvan`, `isvend`, `talmera`, `zephra`). İki oyun bloğu: **Zümrüt** (Korvan + İsvend) ve **Yakut** (Talmera + Zephra). Bloklar gerçek ittifakların yansıması değildir; devletler ülke sınırlarını aşar, karma kurulmuştur. Hiçbir devlet/blok/bölge adında ülke veya ittifak adı yoktur (testle denetlenir).
2. **Bölge adları nötr coğrafi adlardır** (örn. Marmara benzeri "Güney Marmara", "Trakya", "Tuna Deltası", "Kapadokya", "Şipka Geçidi", "Kolhis Ovası"); kimlikler küçük harf ASCII. Görünen adlar yalnızca oyun içindir ve resmî bir toponim görüşü taşımaz.
3. **Natural Earth sınırları, yalnızca geometri olarak** kullanıldı (admin-1 çokgenleri). Natural Earth'ün ülke (admin-0) atamaları, `name_*` ve `sov_*` alanları hiçbir yerde kullanılmadı; admin-0 yalnızca kara/deniz maskesi içindir. Bölgeler birden çok admin-1 biriminden oluşur ve bir ülkeye atfedilmez. Sınır çizgileri Natural Earth'ün "fiili" çizgileridir; oyun içi kararlar ve görünen adlar bu çizgilerin bir egemenlik görüşü olduğu anlamına gelmez.
4. **Kırım (ve Sivastopol) dilim dışında bırakıldı.** Natural Earth v5.1.2 bunu Rusya'nın admin-1 birimleri olarak listeler; oyunda ne bir devlete atanır ne de nötr ada olarak modellenir (veri sözleşmesi her bölgenin bir devleti olmasını ve 3–4 devleti şart koşar). Aynı gerekçeyle **Herson ve Mykolayiv** de dışarıda; Ukrayna'dan yalnızca **Odesa oblastı** ("Bucak Bozkırı") dilimdedir ve Karadeniz'in kuzey kıyısındaki tek liman bölgesidir.
5. **Abhazya ve Güney Osetya'yı içeren birimler** (NE'de `Abkhazia` admin-1'i ve `Shida Kartli`) adla anılmaz: sırasıyla "Kolhis Ovası" ve "Kafkas Geçidi" bölgelerine coğrafi olarak komşu birimlerle birleştirilmiştir. Bu bir egemenlik görüşü değil, kıyı ovası/dağ geçidi coğrafyasının modellenmesidir.
6. **Dilim dışı bırakılanlar** (veri sözleşmesi 3–4 devleti ve 30–60 bölgeyi ister; ve tartışmalı/uyuşmazlıklı alanlardan kaçınılır): Kıbrıs, Kosova, Karadağ, Bosna-Hersek, Hırvatistan, Moldova (Transdinyester dahil), Azerbaycan, Ermenistan, Suriye, Irak, İran, Rusya kıyıları ve Azak Denizi. Dilimin kenarı bu yüzden "kesik" görünür.
7. **Boğaz bölgeleri il bütünlüğünde.** "İstanbul Boğazı" İstanbul ilinin tamamını, "Çanakkale Boğazı" Çanakkale ilinin tamamını içerir (iller iki yakayı kapsar); iki bölge Avrupa–Asya kara bağlantısını ve Karadeniz–Ege deniz bağlantısını taşıyan oyun darboğazlarıdır.
8. **Güncel çatışma senaryosu yok.** Haritada hiçbir savaş durumu, cephe veya gerçek bir kriz başlangıç durumu modellenmez; ilk diplomasi ve askeri durum sentetik haritayla aynı kurallardan gelir.
9. **Bölge etiketleri elle** (`dag`/`ova`/`dar_gecit`) ve `kita` (avrupa/asya/geçit) yapılandırmadadır; kıta bilgisi yalnızca Avrupa–Asya kara kısıtının testinde kullanılır, çıktı dosyasına yazılmaz.

## 7. Yeniden üretme

```
pnpm harita:gercek            # indir (önbellekli) → üret → yaz
pnpm harita:gercek kaynakca   # bu belgedeki üretilen tabloları (bölüm 4 ve 5) rapordan yeniden yazar
pnpm harita:gercek kilitle    # kaynak özetlerini yeniden kilitler (yalnızca kaynak bilerek güncellendiyse)
pnpm test                     # hat deterministik mi, çıktı/bu belge güncel mi
```

Yapılandırmayı (`packages/veri-hatti/yapilandirma/karadeniz.json`) veya kuralları (`kurallar.ts`) değiştirdikten sonra
`pnpm harita:gercek` çalıştırılıp çıktılar commit edilmelidir; aksi halde `deterministik.test.ts` başarısız olur.
