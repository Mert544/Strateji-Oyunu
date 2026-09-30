# Araştırma — Altı Katman için Rakip ve Gerçekçilik Araştırması

> **Özet.** Altı katmanın (Tarım, Sanayi, Lojistik, Teknoloji, Pazar, Devlet; [00 K19](../00-vizyon-ve-kararlar.md)) her biri için rakip oyunların mekanikleri incelendi ve her katmana **3–5 v1 önerisi** çıkarıldı. Bu öneriler [08 — Altı Katman](../08-alti-katman.md) belgesinde sayılara, parametrelere ve uygulama sırasına dönüştürülmüştür; bu belge **kaynak ve gerekçe** dosyasıdır. Önemli bağlam: [06](../06-simulasyon-spesifikasyonu.md)'daki pazar fiyat formülü Victoria 3'ün formülüyle aynıdır (`taban × (1 + 0,75 × clamp((T−A)/min(T,A)))`); bozulma, depo tavanı ve "tahıl → gıda" zinciri zaten vardır.

**Kaynak güvenilirliği.** Capital Rift bilgisi **tek kaynaktan**, geliştiricinin TikTok özet listesinden gelir. Ostriv, Banished ve Frostpunk için yalnızca **topluluk tartışmaları** bulunabildi. Workers & Resources (W&R) bakım ve kış mekanikleri **doğrulanamadı.** Anno 117, Ostriv ve W&R iklim/bakım ayrıntıları yüzeysel kaldı; Victoria 3 yayılım formülünün tam sayıları doğrulanmadı. Bu nedenle bu belgedeki rakip bilgileri **yön göstergesidir;** sayılar için kalibrasyon koşusu gerekir ([00 R6](../00-vizyon-ve-kararlar.md)). Aynı Capital Rift TikTok videosu diğer araştırma raporunda farklı bir hesap adıyla geçer ([3D teknoloji §4](3d-teknoloji.md)); hesap adı doğrulanmadı.

**İsimlendirme notu.** "Sezon" sözcüğü bu projede **kullanılmaz** ([00 K21](../00-vizyon-ve-kararlar.md)): dünya hiçbir zaman sıfırlanmaz. Oyun içi hava ve tarım döngüsü **"iklim takvimi"** olarak adlandırılır (K20) ve dünya sıfırlaması değildir. Bu belgede rakip oyunlardaki mevsim/sezon mekanikleri, yalnızca o oyunları anlatırken anılır.

İlgili belgeler: [00 — Vizyon ve Kararlar](../00-vizyon-ve-kararlar.md) · [02 — Tasarım Ar-Ge](../02-tasarim-arge.md) · [06 — Simülasyon Spesifikasyonu](../06-simulasyon-spesifikasyonu.md) · [07 — Tasarım Önerileri](../07-tasarim-onerileri.md) · [08 — Altı Katman](../08-alti-katman.md) · [Açık kaynak ve veri](acik-kaynak-ve-veri.md)

---

## 1. Tarım

**Rakipler.**
- **Workers & Resources (W&R):** mevsim açıksa ekim yalnızca 22 Şubat–22 Mayıs arası, olgunlaşma 132 gün, yılda tek hasat. Hasat kışa kadar depoya alınmazsa çürür. Verim = hektar başına 62 ton × tarla verimliliği; gübre verimi yükseltir, nadas verimliliği geri kazandırır ([W&R Steam](https://steamcommunity.com/app/784150/discussions/0/2567564692467935310/), [W&R Steam 2](https://steamcommunity.com/app/784150/discussions/0/3104637814587054452/)). Oyuncu şikâyeti: büyük tarlalar hasat penceresini kaçırıyor, takvim angarya hissi veriyor.
- **Victoria 3:**
  - Yöntem kademeleri: basit, toprağı zenginleştiren, gübreli, kimyasal gübreli; teknolojiyle açılır.
  - Hasat koşulları (kuraklık, sel, çekirge) eyalet merkezli yayılır. Yaklaşık aylık, bölgelerin üçte biri kontrol edilir ([Vic3 wiki](https://vic3.paradoxwikis.com/List_of_production_methods), [Vic3 günlüğü #131](https://admin-forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-131-famines-starvation-harvest-conditions.1708680/)).
  - Çiftlikler ekilebilir arazi tavanına bağlı, gübre hayvancılıktan gelir.
- **Anno:** "verimlilik" (fertility) adalar/bölgeler için sabit etikettir; yanlış yerde çiftlik kurulamaz. Gübre silosu bağlı çiftlik verimini +%100 yapar ([Anno wiki](https://anno1800.fandom.com/wiki/Fertilities_and_resources)). Anno 117'de sulama verimi artırır (yüzeysel doğrulama).
- **Farming Simulator:** ekim nöbeti ile %120'ye varan verim; tohum ve gübre fiyatlarında mevsimsel oynama ([gamepressure](https://www.gamepressure.com/farming-simulator-19/crop-rotation/z5c75f)).
- **Banished/Ostriv:** Banished'de bozulma yok (performans gerekçesiyle). Ostriv'de bozulma var; patates orta, karabuğday hiç bozulmuyor ([Ostriv](https://steamcommunity.com/app/773790/discussions/0/3825286438456196248/); yalnızca topluluk tartışması).

**v1 önerileri.**
1. **Bölge başına tarım verimi + hasat oranı.** Mikro yönetim için alan çizimi yok; tek "ekim planı" politikası var. Sürekli akışla uyumlu olması için iklim takvimini hasat *oranı* çarpanı olarak modelle, tarla takvimi olarak değil.
2. **Toprak verimliliği (0–1 durum).**
   - Monokültür düşürür; ekim nöbeti (2–3 ürün arasında dönüş) ve nadas geri getirir; gübre (sanayi çıktısı) hızlandırır.
   - Yinelenen karar: "bu bölgede hangi ürün karışımı?" Verim düştükçe aynı düzen sürdürülemez. Bu, H2'deki %90 tekrarı doğrudan kırar ([05](../05-ilk-olcum-raporu.md)).
3. **İklim olayı** (kuraklık/don), komşu bölgelere azalan şiddetle yayılır (Vic3 modeli). Olay deterministik akışla çekilir. Sulama ve depo tamponu ona karşı sigortadır.
4. **Mal bazlı bozulma farkı + hayvancılık kolu:** tahıl (yıllık depolanır, %1/gün) ile gıda (%2/gün) zaten ayrı. Hayvancılık, gübre ve "et/süt" üretimiyle yem tahılını rekabete sokar.

**Veri/parametre:** `verimlilik0`, `verimlilikDegisim` (ürün başına), `iklimOlasilik`, `yayilimMenzil`, `sulamaCarpan`, ürün başına 12 dilimli hasat eğrisi.

**Bağlantı:** gübre (sanayi) → tarım; tarım çıktısı → gıda zinciri → nüfus; yem tahılı ↔ hayvancılık.

**Kaçın:** tarla/parsel çizimi, ekim–hasat tarih penceresi (W&R şikâyeti), makine filosu, ürün başına ayrı bozulma takibi (Banished performans dersi).

→ Sayılara dönüşümü: [08 §1](../08-alti-katman.md#1-tarım).

## 2. Sanayi

**Rakipler.**
- **Victoria 3:**
  - Temel yöntem (girdi/çıktı + işçi seti), ikincil yöntem (yan ürün) ve otomasyon yöntemi ayrımı. Otomasyon vasıfsız işçiyi azaltır, girdiyi artırır ve vasıflı işçi talebi doğurur ([Dev Diary #5](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-5-production-methods.1480760/), [Vic3 wiki](https://vic3.paradoxwikis.com/Production_method)).
  - Aynı eyalette çoklu bina throughput bonusu verir.
- **W&R:** elektrik, büyük ölçüde talebe göre üretim yapan santrallerle ve trafo hiyerarşisiyle kurulur ([W&R elektrik](https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Electricity)); bakım için ayrı istasyon gerekir (bakım ayrıntısı doğrulanamadı).
- **Factorio:** şebeke tüketicilere orantılı paylaşılır; yetersizlik "brownout" yani genel yavaşlamadır ([Factorio forum](https://forums.factorio.com/95112)). Kirlilik, güçlü saldırı tepkisi doğurur.

**v1 önerileri.**
1. **Enerji ortak girdi.** Bölge başına "elektrik" bir mal olsun. Yetersizse tüm tesisler orantılı yavaşlasın (brownout). Yakıt/kömür → elektrik → tesis: tek ek zincir.
2. **Tesis ölçeği kademesi (S/M/L).** Büyük = daha yüksek işçi başına KD + sabit gider. Bu, [07](../07-tasarim-onerileri.md)'deki "işçi başına KD" sorununu yapısal çözer.
3. **Bakım = parça tüketimi (zaten var), ihmalde verim yüzdesi düşer.** Yinelenen karar: bakım bütçesi.
4. **İşgücü iki kademe:** vasıfsız/vasıflı (eğitim Devlet katmanından gelir); otomasyon yöntemi vasıflıya kaydırır. *(08'de v1.5 adayı olarak ertelendi.)*
5. Kirlilik → bölge skaler değeri; Devlet'te mutluluğu düşürür; tarımda iklim olaylarını şiddetlendirir (Vic3'te kirlilik kuraklık/sel etkisini artırır).

**Parametre:** `enerjiTuketimi`, `olcekKademe`, `kirlilikPpm`, `vasifliIsciOrani`, `bakimKotasi`.

**Kaçın:** tesis içi bant/yerleşim (Factorio), tek tek trafo/kablo (W&R), ayrı iş gücü vardiyası yönetimi.

→ Sayılara dönüşümü: [08 §2](../08-alti-katman.md#2-sanayi).

## 3. Lojistik

**Rakipler.**
- **Victoria 3:** pazar erişimi = altyapı / altyapı kullanımı (0–%100); denizaşırı bölgeler liman ve konvoy ister ([Vic3 Market](https://vic3.paradoxwikis.com/Market), [games.gg](https://games.gg/victoria-3/guides/victoria-3-market-system-guide/)).
- **HoI4:** ikmal başkentten demiryolu ile dağıtım merkezlerine gider; zincirdeki en zayıf ray seviyesi darboğazdır ([PCGamesN](https://www.pcgamesn.com/hearts-of-iron-iv/supply-tips-guide)).
- **Transport Fever 2:** hat kapasitesi sinyal sıklığına bağlı; fazla araç tıkanıklık yapar ([Steam rehber](https://steamcommunity.com/sharedfiles/filedetails/?id=2810866275)).
- **Capital Rift:** "şoförlü kamyon park et, ağa katılır, rota çizimi yok"; depo talep/sağlama yapar; kapsam konsolu ve akış çizgileri (tek kaynak: geliştirici TikTok özeti).
- **W&R:** yakıt tüketimi motor gücüne bağlı, araç aşınması trafiği yavaşlatır (ayrıntılar doğrulanamadı).

**v1 önerileri.** Kenar kapasitesi ve darboğaz zaten var ([06 §5](../06-simulasyon-spesifikasyonu.md)); eklenecekler:
1. **Araç filosu kapasitesi ≠ kenar kapasitesi:** etkin akış = min(filo kapasitesi, altyapı kapasitesi). İki ayrı yatırım hattı, iki ayrı darboğaz.
2. **Taşıma yakıt tüketir** (mesafe × yük). Yakıt "yatırımın" sürekli maliyeti olur.
3. **İklim takvimine bağlı kenar** (buzlu liman, muson benzeri): kenar kapasite çarpanı takvime bağlı.
4. **Depo/ara istasyon** (HoI4 merkezi): tampon stok bölge içi dalgalanmayı emer; tavan = mevcut depo kapasitesi.
5. Kapsam görünümü (zaten var) "neden açık değil" nedenleri listesine `filo_yetersiz` ve `yakit_yok` eklensin.

**Parametre:** kenar başına `filoKapasitesi`, `yakitKatsayisi`, 12 aylık kenar çarpanı, depo `tamponSaat`. *(08'de filo kenar başına değil oyuncu/kenar türü başına havuz olarak tasarlandı: mikro yönetim riski.)*

**Kaçın:** araç rotası/hat çizimi, sinyal/çarpışma, tek araç yönetimi.

→ Sayılara dönüşümü: [08 §3](../08-alti-katman.md#3-lojistik).

## 4. Teknoloji

**Rakipler.** Victoria 3'te üretim teknolojileri somut icatlardır; bina, mal ve yöntem açar. Yayılım, okuryazarlığa bağlı "fazla yenilik" oranıyla olur ve yalnızca diğer ülkelerin bildiği teknolojiler yayılır ([Vic3 Production tech](https://vic3.paradoxwikis.com/Production_technology), [NamuWiki](https://en.namu.wiki/w/Victoria%203/%EA%B8%B0%EC%88%A0)).

**v1 önerileri.**
1. **Yöntem açan düğümler** (zaten karar); her katmana 2–3 düğüm (toplam ~12–18). Yüzde artışı yok.
2. **Yayılım (zaten [06 §10.3](../06-simulasyon-spesifikasyonu.md)):** casusluk/ticaret yoluyla ek indirim; ticaret anlaşması olan partnerden daha hızlı.
3. **Araştırma yatırımı: tek kuyruk ve tek seferlik maliyet yerine "sürekli araştırma bütçesi":** yinelenen karar = bütçe tahsisi, hangi dala.
4. **Alternatif dallar (A veya B):** W&R/Frostpunk'taki gibi karşılıklı dışlayıcı iki yol (ör. yüksek fırın yerine elektrik ark). Bölgeye göre farklı en iyi strateji (H1).

**İsimlendirme uyarısı.** "Sezon" = dünya sıfırlama **yasak** (K5/K10/K21). Oyun içi hava ve tarım döngüsü bunun dışındadır, **ama** karışmasın diye yalnızca **"iklim takvimi"** denir; K5 metni bu ayrımı bir cümleyle açıklar ([00 K21](../00-vizyon-ve-kararlar.md)). Çağ (era) eşikleri yine kullanılmaz.

**Kaçın:** küresel yüzde bonuslar, çağ kapıları, ağacın tamamını gösteren 100+ düğüm.

→ Sayılara dönüşümü ve 17 düğümlük liste: [08 §4](../08-alti-katman.md#4-teknoloji).

## 5. Pazar

**Rakipler.**
- **Capital Rift:** tek küresel oyuncu borsası, 35+ mal, limit emir defteri; "kimse satmıyorsa o mal yoktur" (tek kaynak: geliştirici TikTok özeti).
- **EVE:** bölgesel defterler; emir açma için komisyon (%3 başlangıç, beceriyle düşer) ve satış vergisi (%7,5 baz) alınır; karşı emri almak komisyonsuzdur ([EVE Support](https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax)). Fiyat farkı taşıma maliyeti ve riskinden doğar. Taşıma sözleşmeleri teminatla çalışır.
- **Albion:** her şehrin izole pazarı, %8 satış vergisi, riskli rotada 3–5× prim ([AlbionMarket](https://albionmarket.gg/guides/black-market-flipping)).
- **Victoria 3:** yukarıdaki formül; kıtlık (2:1 alım/satım) geçici throughput cezası (−%5'ten −%75'e) doğurur.

**v1 önerileri.**
1. **Bölgesel emir defteri** (bölge/liman düğümünde) + fiyat farkı = taşıma maliyeti. Global tek defter yok; bu lojistiği değerli yapar. *(08'de emir defteri v1.5 kapısına ertelendi; v1'de liman primi var.)*
2. **NPC piyasa yapıcı:** düşük nüfusta tek taraflı derinlik. Mevcut "dünya pazarı" (emilim/arz) aslında bu rol; açıkça işaretlenmeli ve makas (alış/satış farkı) genişletilmeli ki oyuncu emri her zaman NPC'den iyi olsun.
3. **Komisyon + satış vergisi + tarife** (politika ile): spam emirleri ve sürekli çevirmeyi frenler.
4. **Kıtlık cezası:** Vic3'teki gibi kademeli throughput kaybı; ithalat bağımlılığını gerçek risk yapar.
5. **Sözleşme (teminatlı teslimat)** v1.5 adayı; v1'de yalnızca sabit vadeli "tedarik sözleşmesi".

**Parametre:** `komisyonPpm`, `satisVergisiPpm`, `tarifePpm`, `spreadPpm` (08'de `makasPpm`), `defterDerinligi`, `npcLikidite`.

**Kaçın:** gerçek vadeli işlem/opsiyon, marjin/açığa satış, global defter, emir başına mikro yönetim.

→ Sayılara dönüşümü: [08 §5](../08-alti-katman.md#5-pazar).

## 6. Devlet

**Rakipler.**
- **Victoria 3:** nüfus refah düzeyi ihtiyaç sepetini belirler; yaşam standardı yüksekse sadakat, düşükse radikalleşme artar. İşsiz nüfus iş ve arazi olan eyalete göç eder ([Pops](https://vic3.paradoxwikis.com/Pops)).
- **Anno:** her kademenin temel ve lüks ihtiyacı var; temel ihtiyaç nüfusu yükseltir, lüks mutluluğu artırır, zorunlu değildir ([Anno wiki](https://anno1800.fandom.com/wiki/Needs)).
- **Frostpunk:** yasalar umut/memnuniyetsizliği iter, bedelsiz yasa yoktur ([Frostpunk wiki](https://frostpunk.fandom.com/wiki/Book_of_Laws)).
- **HoI4:** ordu ikmali aynı ağdan geçer.

**v1 önerileri.**
1. **3 ihtiyaç kademesi** (temel: gıda/yakıt; konfor: elektronik; lüks: ek mallar). Kademe karşılanması → vergi ve istikrar. *(08'de "lüks" yerine bütçeyle karşılanan "hizmet" kademesi kullanıldı: yeni mal gerekmez.)*
2. **İstikrar (0–1):** karşılanmayan ihtiyaç ve yüksek vergi düşürür; düşük istikrar üretimi kısar ve göçü tetikler.
3. **Göç:** iş ve yaşam standardı yüksek bölgeye akar → bölgeler arası rekabet.
4. **Politika seti (5–7 yasa, bedelli):** vergi, seferberlik, sanayi sübvansiyonu, tarife, eğitim. Yinelenen karar: istikrar ↔ üretim takası.
5. **Askeri ikmal ve savaş** mevcut kurallarla sürer; diplomasi = anlaşma/yaptırım (mevcut).

**Parametre:** ihtiyaç sepetleri, `istikrarEsikleri`, `gocKatsayisi`, yasa etkileri.

**Kaçın:** birey bazlı nüfus, kültür/din/etnisite ayrımı, parti/seçim sistemi, ayrıntılı diplomasi ağacı.

→ Sayılara dönüşümü: [08 §6](../08-alti-katman.md#6-devlet).

## 7. Ortak mal akışı ve ölçüm

| Kaynak | Hedef | Akışın karşılığı |
|---|---|---|
| Sanayi (gübre) | Tarım | verim, verimlilik geri kazanımı |
| Tarım (gıda) | Devlet | temel ihtiyaç, istikrar |
| Sanayi (yakıt/elektrik) | Lojistik, Sanayi | taşıma maliyeti, brownout |
| Lojistik (kapsam) | Pazar | bölgesel fiyat farkı |
| Devlet (vergi, tarife) | Pazar | makas |
| Teknoloji | Hepsi | yöntem açma |

Tam akış diyagramı: [08 §0](../08-alti-katman.md#0-katmanlar-arası-mal-akışı).

**Bot ölçümü.** H2 için ekim karışımı ve bakım bütçesi tekrarı; H1 için bölge türüne göre verim/iklim profili; H7 için filo/emir güncellemesi yapmayan oyuncunun geriye düşüşü.

## 8. Doğrulama durumu

| İddia | Durum |
|---|---|
| Capital Rift mekanikleri (filo, depo, borsa, 35+ mal) | **Tek kaynak** (geliştirici TikTok özeti); yön göstergesi |
| Ostriv, Banished, Frostpunk ayrıntıları | Yalnızca topluluk tartışmaları |
| W&R bakım ve kış mekanikleri | **Doğrulanamadı** |
| Anno 117 sulama | Yüzeysel |
| Victoria 3 yayılım formülünün tam sayıları | **Doğrulanmadı** |
| Tüm sayısal öneriler (verimlilik değişimi, komisyon, yakıt vb.) | Başlangıç varsayımı; kalibrasyon koşusu gerekir |

## Kaynaklar

- [Vic3 Market](https://vic3.paradoxwikis.com/Market)
- [games.gg](https://games.gg/victoria-3/guides/victoria-3-market-system-guide/)
- [Vic3 Dev Diary #5](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-5-production-methods.1480760/)
- [Vic3 Dev Diary #131](https://admin-forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-131-famines-starvation-harvest-conditions.1708680/)
- [W&R Steam](https://steamcommunity.com/app/784150/discussions/0/2567564692467935310/)
- [W&R elektrik](https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Electricity)
- [Anno fertility](https://anno1800.fandom.com/wiki/Fertilities_and_resources)
- [Anno needs](https://anno1800.fandom.com/wiki/Needs)
- [PCGamesN HoI4](https://www.pcgamesn.com/hearts-of-iron-iv/supply-tips-guide)
- [EVE fees](https://support.eveonline.com/hc/en-us/articles/203218962-Broker-Fee-and-Sales-Tax)
- [AlbionMarket](https://albionmarket.gg/guides/black-market-flipping)
- [Frostpunk laws](https://frostpunk.fandom.com/wiki/Book_of_Laws)
- [Factorio forum](https://forums.factorio.com/95112)
- [Ostriv](https://steamcommunity.com/app/773790/discussions/0/3825286438456196248/)
- [Capital Rift TikTok](https://www.tiktok.com/@niksgames/video/7666487170605026591) (hesap adı diğer raporda `@nikkeuser` olarak geçer; doğrulanmadı)
