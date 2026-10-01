# Araştırma: Capital Rift'in Oyun ve Oyuncu Mekanikleri ve Bizim Sisteme Uyarlanması

> **Konu.** Sahip, Capital Rift'in oyun ve oyuncu mekaniklerini beğeniyor ve birebir örnek almak istiyor, ama bizim sistemimizle: gerçek OSM sokakları, il/ilçe, arsa, 6 katman + askeri güç, paylaşılan dünya, tarayıcıda hafif. Bu rapor (1) Capital Rift'in mekaniklerini bulunabilen en iyi kanıtla çıkarır, (2) başka oyunlardan "karakterle dolaşmayı neden eğlenceli yapar" derslerini toplar, (3) "neden sokakta yürüyeyim?" sorusuna 14 somut cevap ve bir "kopyalama" listesi önerir.

**Durum.** 1 Ekim 2026'da derlendi. Önceki raporları ([01](../01-rakip-ve-pazar-arastirmasi.md), [oyun tasarımı: parsel](oyun-tasarimi-parsel.md), [arayüz ve UX](arayuz-ux.md), [sokak seviyesi 3D](sokak-seviyesi-3d.md)) tekrar etmez; onların bilmediği şeyleri ekler. Sayılar **öneridir, kalibre edilmemiştir.** "(doğrulanmadı)" etiketi, bağımsız ya da birincil kaynakla teyit edilemeyen bilgiyi gösterir.

---

## Yönetici özeti (10 madde)

1. **Capital Rift, "bir yönetici paneli" değil, "karakterle yürünen bir iş dünyası"dır.** Her iş karakterle fiziksel yapılır: yemek arabasını kendin pişirirsin, işçiyi sürükleyip işyerine bırakırsın, kendi dükkânına yürürsün, kamyonu istersen kendin sürersin. Bizim "yönetici + ara sıra yürüyüş" kararımız (K28) bu yüzden Capital Rift'ten **bilinçli biçimde farklıdır**; o farkı korumak ve yürüyüşe "tat" katmak gerekir, "angarya" değil.
2. **Önceki raporlardaki bir varsayım düzeldi: Capital Rift'te talep tarafı NPC'dir.** Arz oyuncudan gelir (35+ mallı tek küresel borsa), ama dükkânlara **NPC müşteriler girip raflardan alır**, odaları **NPC'ler ve oyuncular kiralar**. "Kimse odun satmıyorsa odun yoktur" yalnız arz içindir. Boş dünya riskine (R-Ü6) karşı bizim için ders: **arzı oyuncuya, talebin bir tabanını NPC'ye ver.**
3. **Para kazanma bulundu** (önceki raporlarda "bulunamadı" idi): kapalı beta **ücretli tek seferlik "Player Pass"** (istemci kodunda varsayılan 500 sent = 5 ABD doları; güncel fiyat doğrulanmadı), lansmanda **ücretsiz oynanış + beta alıcılarına kalıcı VIP**, aylık davet yarışı ve alınıp satılabilen kupalar. Kupaların "sadakat kazancını artırması" bizim K13 (pay-to-win yok) ilkemizle çelişir; **kopyalanmayacak.**
4. **Capital Rift'in dolaşma ödülü "yerinde yapılan iştir":** pişirme mini oyunu, yeri seçip konumlandırma (aynı mutfaktan yakın araba rekabet sayılır), kendi dükkânına girme. Bizim sistemde yerinde iş **kısa, bilgi/kimlik ağırlıklı ve her zaman uzaktan bir karşılığı olan** işler olmalı: tesis denetimi, tezgâh, iş panosu, kitabe, keşif.
5. **Dolaşmayı eğlenceli yapan 6 kalıp tekrar ediyor:** (a) varlığını yitirmemek için uğrama (GTA Online gece kulübü popülerliği günde %5 düşer), (b) yalnız yerinde yapılabilen işlem (Albion şehir pazarları, Rust Outpost), (c) keşif ödülü (Minecraft haritacı, Pokémon GO), (d) ticaret meydanı (RuneScape Grand Exchange, Ultima Online oyuncu satıcıları), (e) vitrin/kimlik (Capital Rift "dükkân stili", Big Ambitions iç mekân puanı), (f) hızlı seyahat dengesi (Big Ambitions taksi/metro, Albion ada). Kaçınılacak kalıp: **"sür-park et-tekrarla"** (Big Ambitions şikâyeti) ve zorunlu sell/restok görevleri (GTA Online).
6. **14 somut "neden yürüyeyim" cevabı önerildi** (§3.2): tesis denetimi, mahsul gözlemi, ilçe pazarı tezgâhı, NPC iş panosu, muhtarlık meydanı, ortak proje şantiyesi ve kitabe, hammadde izi, tabela ve vitrin, vitrin turu ve fiyat keşfi, kaşif noktaları, nöbet/mevzi, iklim olayı yardım noktası, canlı şehir, esnaf çarşısı. En ucuz ve en değerli ilk dilim: **tesis denetimi (S), NPC iş panosu (M), tabela/vitrin (S–M), kaşif noktaları (S–M).**
7. **Alfa-0 yürüyüşsüzdür (K28/F5 Alfa-1'dedir); bu yüzden 14 maddenin 7'sinin (4, 6, 7, 8, 10, 11, 12) Alfa-0'da "haritada/panelde karşılığı" vardır** (iş panosu listesi, tabela adı, sondaj komutu, bağış paneli, atlas listesi, savunma paneli). Böylece Alfa-1'de yürüyüş açıldığında içerik sıfırdan değil, **zaten kurulu sistemlerin 3D yüzü** olarak gelir.
8. **Sekiz dolaşma ilkesi** (§3.1): zorunlu değil; küçük ve tavanlı ödül (yapı başına günde 1, seri yok, K13); bilgi > kimlik > küçük verim sırası; sunucu yakınlık doğrulaması; tur ≤3 dk; çevrimdışı üretim bozulmaz; tarayıcı bütçesi (≤2×2 km sahne, ≤60 çizim çağrısı); oyuncu görünürlüğü ve gizlilik (yapı içinde yayınlanmaz).
9. **Kopyalamamamız gereken 12 Capital Rift riski/hatası** (§4): tam oyuncu pazarı, ücretli beta duvarı + ilerleme silme (wipe), servete bağlı gösterge, takas edilebilir kupa, sınırsız hesap ve para gönderme, serbest dünya düzenleme, akış çizgileri, zor ilk saat, hukuk metninde sonradan düzeltilen yanlış, aşırı iddialı pazarlama, kapsam şişmesi, tek kaynaklı sayılara güvenme.
10. **Kanıt sınırı hâlâ önemli:** Capital Rift hakkında bağımsız inceleme, Reddit/Discord özeti, Steam sayfası bulunamadı (Reddit erişimi ağ politikasıyla engelli; Steam'de oyun yok). Bilgi geliştirici videoları, oyunun kendi sitesi, kullanım koşulları ve gizlilik metninden gelir. "Oyuncuların en çok övdüğü/şikâyet ettiği şey" için **kanıt yok**; yalnız geliştiricinin kendi kabulleri (öğrenmesi zor, wipe olabilir) var. Ürün kararı bu rapora bağlanmamalı; **Alfa-0 insan testiyle sınanmalı.**

---

## 1. Capital Rift: kanıt durumu ve düzeltmeler

### 1.1 Bu turda ulaşılan kaynaklar

| Kaynak | Ne verdi | Güvenilirlik |
|---|---|---|
| [capitalrift.com](https://capitalrift.com/) (istemci betiği düz metin okunabildi) | Para kazanma (Player Pass, VIP, kupa), SSS, aylık davet yarışı, hesap ve profil ayarları, "sadakat" ve "net değer halkası" | Birincil (oyunun kendisi) |
| [Kullanım koşulları](https://capitalrift.com/terms/) (25 Ağustos 2026) | Beta gerçeği (wipe, kırılma), davranış kuralları, bağlantı yasağı, "dışarıdan hizmet" yasağı, hesap kuralları | Birincil |
| [Gizlilik politikası](https://capitalrift.com/privacy/) (23 Eylül 2026) | Oyuncu konumu/görünürlük (dışarıda görünür, binada yayınlanmaz), dünya düzenleme kaydı, kayıt verisi, AI ile sohbet özetleme | Birincil |
| Geliştirici TikTok özellik listesi ([video](https://www.tiktok.com/@nikkeuser/video/7666487170605026591)) | En ayrıntılı mekanik listesi (aşağıda tablolarda) | Geliştirici anlatımı (tek kaynak, bağımsız teyit yok) |
| Geliştirici güncelleme videoları: [Lojistik güncellemesi](https://www.tiktok.com/@niksgames/video/7666166983896943903), [Nakliye güncellemesi ve yeni öğretici sistemi](https://www.tiktok.com/@niksgames/video/7671413170463903007), "Dükkân güncellemesi" ve "Bilgisayar üretimi güncellemesi" (başlıklar arama özetinden) | Güncel iyileştirme yönü | Başlıklar TikTok oEmbed ile doğrulandı; içerik doğrulanmadı |
| [YouTube: "Capital Rift Tutorial" (Paddy Plays)](https://www.youtube.com/watch?v=oNfawXo8q2A) | Üçüncü taraf ilk saat sırası: araba (00:00–00:49) → ilk dükkân (00:49–08:24) → arazi, çiftlik, hayvancılık (08:24–17:14) | Bölüm başlıkları arama özetinden; video izlenmedi |

**Doğrulanamayanlar.** Reddit, Discord özeti ve Steam sayfası bulunamadı (reddit.com ağ politikasıyla engelli; "Capital Rift" Steam'de listelenmiyor; 01'deki "7 Ağustos Steam demosu" iddiası bu turda da teyit edilemedi). Oyun içi Wiki'ye (orta tık) erişilemedi. **Oyuncuların övdüğü/şikâyet ettiği şey için bağımsız kanıt yoktur.**

### 1.2 Önceki raporlara düzeltme ve eklemeler

| Konu | Önceki bilgi | Bu turda |
|---|---|---|
| Hesap adı | "@niksgames / @nikkeuser tutarsız, doğrulanmadı" | TikTok oEmbed hepsini yazar "NIK", `author_unique_id: nikkeuser` olarak döndürüyor; iki ad aynı videolara işaret ediyor (hesap yeniden adlandırılmış olabilir; doğrulanmadı) |
| Para kazanma | "Bulunamadı" | **Bulundu:** ücretli kapalı beta "Player Pass" (tek seferlik), lansmanda ücretsiz, VIP ve rozet kalıcı |
| Oyuncu sayısı | "12–15 bin, doğrulanmadı" | Arama özetleri farklı tarihlerde 4.000 → 8.000 → "15.353 beta oyuncusu, 24 saatte dünya GSYH'si 13,5 milyar $" gösteriyor (canlı ana sayfa istatistiği; bu turda doğrudan doğrulanmadı). Ücretli beta ve "sunucu kapasitede" iletisi tavan olduğunu gösterir |
| 2D mi 3D mü | "Çözülmemiş tutarsızlık" | Çözüldü: **paylaşılan 3D dünya**, karakter gerçekten dolaşıyor |
| Ekonomi | "Neredeyse hiçbir şey NPC fiyatlı değil" | Doğru, ama **NPC müşteri ve NPC kiracı** talebi var (dükkân raflarından satın alırlar; odalar NPC'lere kiralanır) |
| Tek kişi | "Görünüşe göre tek kişi" | Koşullar "çok küçük bir takım" diyor; yasal kuruluş NIKS GAMES LLC (Nebraska) |

---

## 2. Capital Rift mekanik haritası

### 2.1 Dünyada dolaşma

| Konu | Bilinen | Kaynak / güvenilirlik |
|---|---|---|
| Hareket | "Her yere yürü, tıkla-git (click to path), merdivenle çık, binalara gir, kendi dükkânına gir" | Geliştirici listesi |
| Kamera | Bina içinde çatı kesilir, katlar arası gezilir. Kamera hızı/sınırları **doğrulanmadı** | Geliştirici listesi |
| Yürüme hızı | **Doğrulanmadı** | — |
| Araçlar | Şoförlü kamyon park edince ağa katılır (rota yok); **istersen binip kendin sürersin** | Geliştirici listesi |
| Hızlı seyahat | "Sahip olduğun yataklar arası" ve "doğrudan herhangi bir arabana atla" | Geliştirici listesi |
| Diğer oyuncular | İsim etiketli yürüyen karakterler ve arabaları görünür | Geliştirici listesi |
| Görünürlük kuralı | Dışarıdayken yakındaki oyuncular karakterini, adını ve hareketini görür; **binada yayınlanmaz**; arkadaşlar hangi şehirde olduğunu ve son görülmeyi görür | [Gizlilik §4](https://capitalrift.com/privacy/) |
| Konum | Gerçek konum asla istenmez; tarayıcı konum API'si bloklanır (konum = simülasyon konumu) | Gizlilik §4 |
| Dünyayı düzenleme | "Binaları yerleştir ve sil" (dünya düzenlemeleri oyuncu kimliğiyle kaydedilir ve herkese görünür, OSM düzenleme geçmişi gibi) | Geliştirici listesi + Gizlilik §4 |
| Dünya bilgisi | Orta tıkla "neredeyse her şeyin wiki sayfası" açılır | Geliştirici listesi |

### 2.2 Arazi, bina edinme ve inşa akışı

| Konu | Bilinen | Not |
|---|---|---|
| Başlangıç | Tek yemek arabasıyla başlanır (7 mutfak: sosisli, burger, suşi, krep, fish & chips, pizza, burrito) | Site açıklaması / video listesi |
| Kira ve satın alma | Oda kirala, tüm binayı satın al ya da malzemeden **sıfırdan inşa et** | Geliştirici listesi |
| Oda düzenleyici | Mobilya, pencere, kapı ekle/sil, odaları birleştir; odayı NPC'lere ve oyunculara kiraya ver | Geliştirici listesi |
| Dükkân | Odayı dükkâna çevir, raf ve kasa koy, ne satacağını ve fiyatı belirle; **NPC müşteriler içeri girip raflardan alır**; kasiyer tut | Geliştirici listesi |
| Dükkân stili | "Dükkân stil notu, harika görünen dükkân ~2 kat hızlı satar", ısı haritası, 20+ yeni üretilebilir eşya, giyilebilir kıyafetler | **Doğrulanmadı** (güncelleme videosu arama özeti) |
| Arazi | Haritanın her yerinde parsel al, Shift-tık ile toplu seç, birleştir. Fiyat/boyut bilgisi **doğrulanmadı** | Geliştirici listesi |
| Çiftlik | Tarla çiz, ızgaraya ek, hasat et, yeniden ek | Geliştirici listesi |
| Hayvancılık | Çit çek, inek/domuz/koyun/tavuk al, yemliği mısırla doldur, ürerler, koyun yün verir | Geliştirici listesi |
| Maden | Ocak çiz: araziye **gerçek bir çukur kazar** | Geliştirici listesi |

### 2.3 Üretim ve ekonomi döngüleri

| Konu | Bilinen |
|---|---|
| Zincir | Kütük → kalas (hızar), cevher → külçe (ocak), agrega → cam; külçeden çivi, tel, çelik sac, makine parçası; marangoz/metal/elektronik tezgâhları "oyundaki hemen her nesneyi" üretir; kasap istasyonu, dokuma tezgâhı; her şey **geri dönüştürülüp malzemeye** dönebilir |
| İşçi | Sokaktan işçi işe alınır, **gerçek 3B karakter olarak görünür ve sürükleyip işyerine bırakılır**; rastgele yıldız notu, çalıştıkça seviye atlar; **yalnız üretirken ücret alır**; otomasyon artımlı: pişir → malzemeyi otomatik al → fiyatı otomatik ayarla → otomatik temizle → daha hızlı |
| Çevrimdışı | "Hepsi sen çevrimdışıyken de çalışır" |
| Geri bildirim | İşletme başına **canlı kâr/zarar (dakika başına)** |
| Araba | 6 geliştirme hattı, 10. seviyeye kadar; fiyat ve "çekicilik" izlenir; **aynı mutfaktan yakın araba rekabet** sayılır, yer seçimi önemlidir |
| Bilgisayar üretimi, nakliye (güncellemeler) | Başlıklar var; içerik doğrulanmadı |

### 2.4 Ticaret ve pazar

| Konu | Bilinen |
|---|---|
| Borsa | Tek küresel oyuncu borsası, 35+ mal, gerçek emir defteri; anında al ya da limit emri bırak |
| NPC fiyatı | "Neredeyse hiçbir şey NPC fiyatlı değil; kimse odun satmıyorsa odun yok" |
| Fiyat çapası | Ana sayfa kod yorumuna göre ana sayfadaki "En çok hareket eden" listesi **hacme göre** sıralanıyor çünkü "Market.v3 her fiyatı taban değere sabitliyor, `market_prices` çalışma zamanında hiç yazılmıyor" (yani yüzde değişim sütunu hep 0 olurdu). Bu, bir **taban fiyat çapasının** bulunabileceğine dair zayıf bir işaret; doğrulanmadı |
| Banka | Sınırsız hesap, faiz getiren tasarruf, oyunculara para gönderme |
| Lojistik | Depo (isteyen/sağlayan düğüm), depo işçileri taşır; teslimat alanları ne istediğini/ne gönderdiğini gösterir; kapsam konsolu "neyin aç kaldığını" ve dünyada **akış çizgilerini** gösterir |

### 2.5 Sosyal yapı, PvP, ilerleme, ritim

| Konu | Bilinen | Kanıt durumu |
|---|---|---|
| Sosyal | Dahili sohbet, DM, arkadaşlar, profiller; hata/öneri panoları (oylama, ekran görüntüsü otomatik); Topluluk penceresinde **Discord sunucu rehberi** | Geliştirici listesi + [Koşullar §6](https://capitalrift.com/terms/) |
| Lonca/şirket/ittifak | **Bulunamadı** (var olduğu doğrulanmadı) | Kanıt yok |
| PvP / savaş | **Bulunamadı.** Rekabet = yer seçimi (yakın araba) ve fiyat. Çalma/saldırı/korunma mekaniği kanıtlanmadı | Kanıt yok |
| Davranış kuralları | Bağlantı (link) **her yerde yasak** (sohbet, DM, ad alanları dahil); "oyun parası mevduat toplayan dış hizmetler" yasak; otomasyon ve hata istismarı yasak; yalnız küfür filtresi (hakaret filtreli) | [Koşullar §6](https://capitalrift.com/terms/) |
| İlerleme / meslek | Seçilen sınıf yok; işçi rolleri (araba, kasiyer, depo, çiftçi, çiftlik eli, madenci, inşaatçı, şoför); araba geliştirme hatları; profil halkası **net değere göre renk** değiştirir; "sadakat puanı" **zenginliğe değil yapılan işe** göre | Geliştirici listesi + site |
| Oturum ritmi | Günlük görev/ödül **bulunamadı.** Çıkarım: aktif kısım = araba pişirme, yer seçimi, fiyat/limit emri, yeni kurulum; pasif kısım = işçiler ve depolar (çevrimdışı çalışır) | (çıkarım) |
| Yeni oyuncu | Tek araba → ilk dükkân → arazi/çiftlik (17 dakikalık üçüncü taraf videonun sırası); geliştirici "ilk başta zor olabilir" diyerek **yeni öğretici sistemi** geliştirdiğini söylüyor | YouTube başlıkları + [TikTok](https://www.tiktok.com/@niksgames/video/7671413170463903007) |
| Beta gerçeği | Kırılır, ilerleme silinebilir (wipe), özellikler değişir, lansman tarihi garanti değil; Pass, oyuncu numarası ve rozet wipe'tan kurtulur; oyun parası ve binalar kurtulmayabilir | [Koşullar §5](https://capitalrift.com/terms/) |
| Sunucu kapasitesi | "Sunucular dolu, sonra tekrar dene" iletisi | Site metni |

### 2.5.1 Para kazanma modeli (yeni bulgu)

| Öğe | İçerik |
|---|---|
| Şimdiki durum | **Ücretli kapalı beta.** "Player Pass": tek seferlik ödeme, abonelik yok; Stripe; anında beta erişimi, lansmanda VIP, kalıcı oyuncu rozeti, kilitli oyuncu numarası |
| Fiyat | Kodda varsayılan 500 sent; "fiyat oyun büyüdükçe artar, bugün en düşük olduğu gün" yazıyor (güncel fiyat doğrulanmadı) |
| Lansman | "Lansmanda ücretsiz oynanır; beta oyuncuları VIP'i sonsuza dek korur" |
| VIP | "Taç Altın" oyuncu görünümü (cosmetic skin), VIP rütbesi |
| Büyüme araçları | Davet bağlantısı; **aylık davet yarışı** (yalnız beta satın alan davet sayılır); ay sonu sıralamasına göre Elmas (ilk 10), Altın (%1), Gümüş (%10), Bronz (%50) kupa; kupa **alınıp satılabilir koleksiyon** ve elde tutuldukça **sadakat kazancını %1–5 artırır** |
| Hukuk | AB/AEA/BK'de 14 gün cayma; koşullar, önceki ödeme sayfasında "iade edilemez" dendiğinin **yanlış olduğunu, düzeltildiğini** açıkça yazıyor |
| Veri | Sunucudan "reklam dönüşümü" için hashlenmiş e-posta TikTok ve Reddit'e AB dışında bildirilir; sohbetleri özetleyen AI (yazar kodlu) "oyuncular neyi seviyor, neyden şikâyetçi" analizi yapar |

### 2.6 Övgü ve şikâyet: ne bilinebilir

| Başlık | Durum |
|---|---|
| Bağımsız övgü | **Bulunamadı.** TikTok yorum ve Discord erişilemedi |
| Bağımsız şikâyet | **Bulunamadı** |
| Geliştiricinin kendi kabulü | (1) İlk başta zor; öğretici sistemi geliştiriliyor. (2) wipe olabilir. (3) Bağlantı/dışarıdan hizmet suistimali için sert kural (muhtemelen yaşanmış ya da öngörülmüş; doğrulanmadı). (4) Giriş yalnız Google ("güvenlik kararı"). (5) Sunucu kapasitesi sınırı |
| Çıkarım (kanıt değil) | Çekici olan: **fiziksel yapılan iş** (pişir, sürükle, yürü), **geri bildirimin hızı** (dakika başına kâr), **yerel kimlik** ("kendi sokağında oyna"). Riskli olan: öğrenme eğrisi, tam oyuncu pazarının boş zamanları, kapsam genişliği (tek küçük takım) |

---

## 3. Karakterle dolaşmayı eğlenceli yapan mekanikler

### 3.1 Karşılaştırma: dolaşmanın amacı

| Oyun | "Neden yürürsün?" | Mekanik | Bizim için ders | Kaynak |
|---|---|---|---|---|
| **Capital Rift** | İş yerinde yapılır: pişir, işçi yerleştir, dükkâna gir | Karakter ve iş iç içe; hızlı seyahat yatak/arabaya | Dolaşma işin kendisi; bizde iş **kısa ve opsiyonel** olmalı | §2 |
| **GTA Online (gece kulübü)** | Varlığın değeri **zamanla düşer**; kulüpte dans, tanıtım görevi, DJ ile geri dolar | Popülerlik günde %5 (48 dk gerçek zaman) düşer; popülerliğe göre günlük gelir 1.500–50.000 $ | **Bakım ziyareti** modeli: uğramak değeri korur, ama pasif alternatif (DJ, personel) vardır | [GTA Boom](https://www.gtaboom.com/gta-online-nightclub-guide-after-hours-ac95), [Gameranx](https://gameranx.com/features/id/560048/article/gta-online-how-to-make-passive-income-using-the-nightclub/) |
| **GTA Online (bunker/MC satış)** | Satış görevleri zorunlu taşıma | Sell mission'lar tekrarlı, en nefret edilen araçlar var | **Kaçın:** zorunlu taşıma angaryası | [GameFAQs](https://gamefaqs.gamespot.com/boards/805602-grand-theft-auto-online/78334032), [Steam](https://steamcommunity.com/app/271590/discussions/0/4407417073565895623/) |
| **Albion Online** | Her kraliyet şehrinin pazarı **ayrı**; yalnız oradaki oyuncu alır. Caerleon tüm yollara bağlı; Black Market oradadır. Ada, hızlı seyahat hedefi | Yerel pazar, risk altında taşıma, 22 saatlik ada ürün döngüsü, günde 45–60 dk rutin | Yerel pazar **fiyat farkı + insan trafiği** yaratır; bizde bölgesel defter (08 §5.4 madde 3) bu mantıkla uyumlu. Ada rutini "sakin ama angarya olabilir" | [Albion forum](https://forum.albiononline.com/index.php/Thread/113289-The-Truths-Behind-The-Caerleon-Marketplace-Speculations/), [Albion Forge](https://albionforge.net/guides/albion-cities), [Albion Codex](https://www.albioncodex.com/guides/albion-online-island-guide) |
| **Rust (Outpost, Bandit Camp)** | PvP'siz güvenli merkez: satıcı, geri dönüşüm, tezgâh, vekil; yeni doğduktan sonra ilk gidilen yer | Güvenli bölge (silah çekeni taret vurur), kumar tekerleği, araç dükkânı | **Güvenli ticaret meydanı** kalabalık yaratır. Bizde "ilçe meydanı" = PvP'siz alan | [Rust Help](https://rusthelp.com/monument/bandit-camp), [Frozen Rust](https://frozen-rust.com/rust-outpost.html) |
| **Ultima Online** | Oyuncu satıcıları yerleşime bağlı, sen çevrimdışıyken de satar; evler kasabalarda toplanır | Satıcı NPC'si (ücretle), ev kilidi, özel ev | **Oyuncu tezgâhı ama çevrimdışı çalışır** (Capital Rift kasiyer modeli ile aynı fikir) | [UO Wiki](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/npcs-player-owned/), [mobiledevmemo](https://mobiledevmemo.com/ultima-online-nfts-and-player-run-economies/) |
| **RuneScape** | Grand Exchange öncesi Varrock/Falador'da yürüyüp teklif aranırdı; GE sonrası bu pazarlar öldü, ama GE kendisi "kamusal meydan" oldu | Uzaktan pazar yürüyüşü öldürür, **bir meydan** onu geri getirebilir | Uzaktan işlem **yürüyüşü öldürür**; yürüyüş için **uzaktan yapılamayan bir şey** (bilgi, kimlik, sosyal) gerekir | [OSRS Wiki GE](https://oldschool.runescape.wiki/w/Grand_Exchange), [RuneScape Wiki GE](https://runescape.wiki/w/Grand_Exchange) |
| **Minecraft** | Haritacı köylü, belirli yapıya giden harita satar; gezgin tüccar | Keşif haritası (14 zümrüt + pusula civarı), köy ticareti | **Keşif ödülü = hedef ve bilgi** (harita, ipucu), sürpriz değil | [Minecraft Wiki](https://minecraft.fandom.com/wiki/Explorer_Map) |
| **Pokémon GO / Ingress** | PokéStop ve spor salonları gerçek yerlere bağlı; ziyaret = eşya | Landmark noktaları, yol ilerlemesi, yumurta kırma mesafesi | **Coğrafi önyargı:** noktalar kentte çok, kırsalda az ([CHI'17](https://jacob.thebault-spieker.com/papers/CHI17_PokemonGo.pdf), içerik bu turda doğrulanmadı). Türkiye kırsalında OSM nokta yoğunluğu da düşük olabilir; **prosedürel yedek nokta** şart | [T&F coğrafi analiz](https://www.tandfonline.com/doi/pdf/10.1080/10095020.2017.1368200) |
| **Big Ambitions** | Manhattan'da yürü/sür, mağazaya gir, dükkân kur, restok yap | Taksi (geçen taksiyi çağır), metro (3 $), şoför; iç mekân puanı müşteri memnuniyetini etkiler | **"Sür-park-tekrarla"** şikâyeti; hızlı seyahat ve şoför bu yüzden eklendi. İç mekân puanı = **vitrin kimliği ve ekonomik etki** | [GameSkinny](https://www.gameskinny.com/culture/big-ambitions-early-access-review-big-city-dreams/), [Big Ambitions Wiki](https://big-ambitions.fandom.com/wiki/Transportation), [iç mekân](https://bigambitionsgames.wiki/interior-rating/) |
| **Eco** | Taşıma sınırlı ağırlıkla; yollar ve araçlar ekonomiyi ve kirliliği belirler; kasaba merkezi kuralı | Kasaba için ≥3 vatandaş + belediye binası; merkezde sınırlı talep | **Konum ve yol kararı** önemli kılınır; bizde lojistik görünmez olduğundan bu bizde geçerli değil. Ama **kasaba meydanı** fikri geçerli | [Eco Wiki](https://wiki.play.eco/en/Settlements), [Kickstarter güncelleme](https://www.kickstarter.com/projects/1037798999/eco-global-survival-game/posts/1625328) |
| **Foxhole** | Lojistik oyuncu işi; sahile/depoya taşıma, ileri üs | Kamyon, gemi, ileri üs; lojistikçiler **49 gün grev** yaptı | **Zorunlu taşıma = grev.** Lojistik bizde arka planda kalmalı (zaten karar) | [Foxhole Wiki](https://foxhole.fandom.com/wiki/Community_Guides/Logistics), [NME](https://www.nme.com/news/foxhole-logistics-union-ends-49-day-strike-after-demands-met-3173270) |
| **Life is Feudal** | Toprak sahiplenme anıt/karakol kurarak; keşif, kaynak aramak | Fief (~4.900 karo), kral monumenti | **Sahiplik görünür bir yapıyla** tutulur; bizim "muhtarlık/ortak yapı" ile aynı fikir | [LiF Wiki](https://lifeisfeudal.fandom.com/wiki/Claim) |
| **Roblox Bloxburg** | İş, ev, mahalle; 10+ meslek, teslimat işi | Seviyeli meslek ücreti; teslimatta mopedle NPC müşteriye | Küçük, **tekrarlanabilir ama tavanlı** işler; oyuncu kendi seçer | [Bloxburg Wiki](https://welcome-to-bloxburg.fandom.com/wiki/Delivery_Person) |
| **Capitalism Lab** | Avatar yok; yalnız panel | Derin tedarik zinciri, "asla sıkılmaz" yorumları | Derinlik **dolaşmadan** da tutabilir; yürüyüşün katma değeri **hissi**, derinliği değildir | [Capitalism Lab](https://www.capitalismlab.com/), [topbizgames](https://topbizgames.com/reviews/pc-game/capitalism-lab) |
| **Upland** | Gerçek haritada mülk gezme; "Block Explorer" avatarı sen yönlendirmeden gezer | Ziyaret ücreti ve "send" sınırı, koleksiyon | **Yürüyüşsüz keşif** (otomatik) zayıf kalır; yönlendirme verilmeli | [Naavik](https://naavik.co/deep-dives/upland-property-tycoon/) |

### 3.2 Sentez: yürümeyi anlamlı kılan 6 kalıp ve 4 tuzak

| # | Kalıp | Neden işe yarar | Kaynak oyun |
|---|---|---|---|
| K1 | **Bakım ziyareti** (değer düşer, uğrayınca geri gelir; pasif alternatif var) | Gündelik bir amaç verir ama zorunlu değildir | GTA gece kulübü |
| K2 | **Yalnız yerinde yapılan işlem** (yerel pazar, yerel pano) | Uzaktan işlemin yürüyüşü öldürmesini önler | Albion, Rust Outpost |
| K3 | **Keşif ödülü = bilgi/hedef** | Yürüyüşe bir sebep ve bir hikâye verir | Minecraft haritacı, Pokémon GO |
| K4 | **Meydan** (güvenli, kalabalık, ticaret + sosyal) | Karşılaşma ve canlılık | Rust Outpost, RS GE, UO |
| K5 | **Vitrin ve kimlik** (tabela, iç mekân puanı, mekân stili) | Başkasının dünyasını gezmek ve kendininkini göstermek | Capital Rift stil notu, Big Ambitions |
| K6 | **Hızlı seyahat dengesi** (kendi yapılarına ışınlan, dışarıda yürü) | Uzun yürüyüşü kısaltır, kısa olanı bırakır | Capital Rift, Albion ada, Big Ambitions metro |

| Tuzak | Örnek | Bizde önlem |
|---|---|---|
| T1 Zorunlu taşıma/restok angaryası | Big Ambitions "sür-park-tekrarla", GTA sell missions, Foxhole grevi | Lojistik arka plan; yürüyüş bonusu hiçbir üretimi şart koşmaz |
| T2 Uzaktan işlem meydanı öldürür | RuneScape GE sonrası pazar meydanları | İlçe tezgâhı yalnız yerinde; uzaktan yalnız toplu NPC pazarı |
| T3 Nokta yoğunluğu eşitsizliği | Pokémon GO kırsal-kent farkı | Prosedürel yedek noktalar; kırsala ek "doğa" noktaları |
| T4 Günlük seri / kayıp korkusu | GTA popülerlik, Albion ada ödülleri 7 günde kaybolur | Seri yok (K13); ödül yapı başına günde 1 ve tavanlı |

---

## 4. Uyarlama önerisi

### 4.1 Dolaşma ilkeleri (8 kural)

| # | İlke | Gerekçe ve bağ |
|---|---|---|
| İ1 | **Zorunlu değil.** Her yürüyüş ödülünün uzaktan bir karşılığı vardır (daha pahalı, bilgisiz ya da bonus yok) | Foxhole grevi; sahip "lojistiğin ön planda olmasına gerek yok" dedi; Alfa-0 yürüyüşsüz |
| İ2 | **Ödül küçük ve tavanlı:** yapı başına 24 saatte en çok 1; kalıcı seri yok; bir günde en çok 6 ödüllü ziyaret | K13: günlük giriş ödülü yok. "Angarya algısı" |
| İ3 | **Ödül sırası:** bilgi > kimlik/kozmetik > küçük verim (≤%5) | Pay-to-win yok; hesaplanabilir denge |
| İ4 | **Sunucu yakınlık doğrular** (yapıya ≤15 m, hız sınırı, ışınlanma yalnız kendi yapılarına) | Bot ve hile; çekirdek determinizmi (komut günlüğünde `ziyaret` komutu) |
| İ5 | **Tur ≤3 dk.** Sahne ~2×2 km; yapılar arası tipik 100–400 m; koşu hızı ~6 m/s (öneri) | "Sür-park-tekrarla" şikâyeti; günde 1–2 kısa ziyaret (§7.1) |
| İ6 | **Çevrimdışı üretim ve vergi akışı ziyarete bağlı değildir** | Üretim hep ilkesel; ziyaret yalnız küçük bir artı |
| İ7 | **Oyuncu görünürlüğü:** dışarıda seyrek avatar (≤15 / ilgi alanı), yapı içindeyken yayınlanmaz, ad etiketi, çevre sohbeti | Capital Rift gizlilik modeli; Ü14 kararı; ağ ve çizim bütçesi |
| İ8 | **Tarayıcı bütçesi:** ≤60 çizim çağrısı; NPC'ler örneklenmiş sprite, **sunucuda NPC durumu tutulmaz** (görsel; satış tembel formülle) | F5 kabulü; determinizm |

### 4.2 "Neden sokakta yürüyeyim?": 14 cevap

Maliyet: **S** = tek ajan, küçük (bir sprint içinde yarım), **M** = bir sprint, **L** = birden fazla sprint ya da çekirdek+sunucu+istemci birlikte (öneri). Öncelik, **yürüyüşlü** sürümün zamanıdır. **Alfa-0\*** = Alfa-0'da yalnız haritada/panelde yürüyüşsüz karşılığı vardır (yürüyüş Alfa-1: K28/F5).

| # | Cevap (ne yaparsın) | Katman | Maliyet | Öncelik | Alfa-0 karşılığı / uzaktan yol |
|---|---|---|---|---|---|
| 1 | **Tesis denetimi:** kendi tesisine git, `[E] Denetle`: aşınmayı biraz geri al, rozetin nedenini yerinde gör | Sanayi (S3), Tarım | S | **Alfa-1 (ilk dilim)** | Bakım düzeyi (S3) ve `genel_onarim` zaten uzaktan var |
| 2 | **Mahsul gözlemi:** tarlada toprak/nem/don işaretini incele, ekim karışımı ipucu al | Tarım (T1, T3) | S | Alfa-1 | Parsel kartında aynı bilgi (bonus yok) |
| 3 | **İlçe pazarı tezgâhı:** ilçe meydanında tezgâh kur, ürün sergile, yerel NPC talebine ve oyunculara sat | Pazar | M–L | Alfa-1 (tezgâh), emir defteri ile **sonra** (v1.5) | Ticaret ofisi emirleri (Alfa-0) |
| 4 | **NPC iş panosu:** meydandaki panodan esnaf siparişi (teminatlı, ≤3 açık) al, teslim et | Pazar (P5), Lojistik arka plan | M | **Alfa-0\*** (liste), Alfa-1 (pano) | Ticaret ofisi panelinde sözleşme listesi |
| 5 | **Muhtarlık meydanı:** ilan panosu (kararlar, aday programı), sandık, ilçe tabelası (nüfus, seviye, vergi) | Devlet | M | Alfa-1 (F6'ya bağlı) | Devlet ekranı (oy ve ilan listesi) |
| 6 | **Ortak proje şantiyesi:** malzeme bırak, aşamaları izle, **kitabede adın** yazılsın | Devlet, Lojistik | M | Alfa-1 | Bağış paneli (kitabe satırı yok) |
| 7 | **Hammadde izi:** araziye serpilmiş "cevher izi/numune" işaretlerini bul; sondaj başarı olasılığı biraz artar | Sanayi (S5) | M | Alfa-1 | `arama_sondaji` komutu (%40 taban) Alfa-0'da var |
| 8 | **Tabela ve vitrin:** tesisine ad ve simge koy, ≤3 ürün sergile; ziyaretçi görür, NPC talep çarpanı küçük artar | Pazar (kimlik) | S–M | **Alfa-0\*** (ad), Alfa-1 (3B) | Yapı adı ve vitrin listesi (ilçe sayfasında) |
| 9 | **Vitrin turu ve fiyat keşfi:** çarşıda dolaş, rakip fiyatlarını yalnız yakında gör, "gözde" için günde 3 beğeni ver | Pazar | S–M | Alfa-1 / **sonra** | Pazar ekranı yalnız toplu ortalama gösterir |
| 10 | **Kaşif noktaları:** ilçedeki 5–12 yeri (tarihî yapı, seyir tepesi, çeşme, köprü, mera) ziyaret et; atlas ilerlemesi, başlık | Tüm katmanlar (kozmetik) | S–M | Alfa-1 | Atlas listesi (haritada işaret) |
| 11 | **Nöbet ve mevzi:** karakol/barikat ziyaret, 24 saatlik küçük savunma hazırlığı; baskın sonrası hasar tespiti | Askeri | M | Alfa-1 | Savunma yapısı panelinde "hazırla" |
| 12 | **İklim olayı yardım noktası:** kuraklık/sel/don olduğunda meydanda yardım noktası açılır; malzeme bırak, ilçe hasarı azalır | Tarım (T3), Devlet | M | Alfa-1 | İlçe bağış paneli |
| 13 | **Canlı şehir:** NPC müşteriler, seyrek oyuncu avatarları, 4 selam hareketi, ilçe sohbeti | Pazar, sosyal | S (görsel) + M (sunucu presence) | Alfa-1 | İlçe sohbeti (sunucu) |
| 14 | **Esnaf çarşısı:** müteahhit/usta tezgâhı, inşa kapasitesi sat, sabit fiyatlı sözleşme | Devlet, Pazar (müteahhit rolü) | L | **Sonra** (v1.5) | Ticaret ofisi sözleşmesi |

**Öncelik özeti.** Alfa-1 ilk dilim: **1, 4, 8, 10, 13** (en ucuz, en çok "his", en az bağımlılık). Alfa-1 ikinci dilim: 2, 3, 5, 6, 7, 11, 12 (F6 ve ortak proje bağımlı olanlar sonraya). Sonra: 9 (oy alışverişi ve moderasyon riski), 14 (v1.5 müteahhit).

### 4.3 Madde ayrıntıları ve korumalar (öneri; kalibre edilmedi)

| # | Kural / parametre | Koruma ve risk |
|---|---|---|
| 1 | Yapının ≤15 m'sinde `[E] Denetle`. Yapı başına 24 saatte 1 kez. Etkisi: aşınma −%5 puan (−50 000 ppm; asgari bakımda ~2,5 günlük birikim) ve rozet nedeni 3B'de gösterilir. Günde en çok 6 ödüllü denetim | Uzaktan `genel_onarim` ve yüksek bakım düzeyi sürer. Bonus bakım düzeyi çarpanından bağımsız toplam −%40 aşınma sınırını aşmaz (08 S3). **GTA gece kulübü kalıbı (K1)**, ama seri yok |
| 2 | Tarlada `[E] İncele`: T1 toprak verimliliği ve T3 uyarısı kartı; bonus yok | Salt bilgi (İ3). Parsel kartında aynı veri uzaktan görünür; yürüyüş yalnız "yerinde görmek" hissidir |
| 3 | İlçe pazarı: OSM `amenity=marketplace` varsa orada, yoksa ilçe merkezi meydanı. Tezgâh yuvası ilçe gelişim seviyesine göre 4 / 8 / 16 (öneri). Haftalık yuva kirası (küçük ₺). ≤5 mal sergilenir. NPC müşteri talebi: nüfus × saat × vitrin puanı, tembel hesap; çevrimdışı satar (UO satıcısı). Fiyat, NPC makası bandıyla sınırlı (08 P2) | **Az oyuncuda arz yok riski (R-Ü6)**: talebin tabanı NPC. Uzaktan işlem tezgâh satışı yerine geçmez (T2). Emir defteri v1.5 kapısı korunur |
| 4 | Meydandaki panoda ≤3 açık NPC esnaf siparişi: mal, miktar, vade ≤7 gün, teminat, ödül piyasanın %5–15 üstü (kıtlık sinyaline bağlı, P4). **Karşı taraf NPC olduğundan çok oyunculu ve v1.5 kapısı gerekmez** (08 P5'in engeli kalkar) | Sözleşme spam'i (≤3 açık). Alfa-0'da Ticaret ofisi panelinde liste; Alfa-1'de aynı veri panoda |
| 5 | Pano: muhtar duyuruları, yasa/vergi/imar kararlarının sonucu, aday programı (≤140 karakter). Oy ekrandan da verilebilir (mobil). Yürüyüş = atmosfer ve **bilgi** | Katılım ölçülür (H9). Adayların metinleri filtrelenir (Capital Rift bağlantı yasağı dersi) |
| 6 | Ortak proje (3–14 gün) şantiyesine malzeme bırak; aşamalar görünür; katkıya göre ilk 10 ad **kitabede** kalıcı yazılır | Kitabe = prestij, güç değil. Yürüyüşsüz bağış aynı projeyi ilerletir, yalnız kitabe satırı yoktur (İ1'i zorlar; sınır: bağışta "ilk 10" kriteri **yalnız katkı miktarı**, ziyaret değil, böylece yürüyüş bonusuz kalır) |
| 7 | Sunucu tohumundan türetilmiş sabit "iz" noktaları (cevher/komur/su belirtisi). Yaklaşınca numune: `arama_sondaji` başarı %40 → %50 ve maliyet −%20; ilk bulan "keşfeden" olarak levhaya yazılır (kozmetik) | Determinizm korunur (noktalar tohumdan). Damar ortaktır (S5), keşfedene özel hak yok. Yürüyüşsüz yol %40 aynen |
| 8 | Tabela adı 2–24 karakter, 12 renk × 8 simge şablonu; vitrin ≤3 ürün. **Vitrin puanı (0–100)** = ad dolu + ürün çeşitliliği + bakım düzeyi + temizlik. NPC talep çarpanı en çok +%10 | Serbest görsel yükleme yok. **Bağlantı ve hakaret filtresi** (Capital Rift kuralı). Ad ve sınır politikası K33. Kozmetik satışa dönüşürse ayrıca K13 incelemesi |
| 9 | Tezgâh fiyatları yalnız 40 m çevresinde görünür (bilgi ödülü). Günde 3 beğeni; kendi yapına değil; hesap 14 günden gençse 1. Haftalık "çarşının gözdesi" kozmetik levha | Oy alışverişi ve çoklu hesap riski; yeni hesap tavanı. Önce 3 ve 8 ile sonrası |
| 10 | İlçe başına 5–12 nokta: OSM `historic`, `tourism=viewpoint`, `amenity=fountain`, `natural=peak`, `man_made=bridge` vb. Nokta azsa **prosedürel yedek** (meralar, dereler, tepeler). Ziyaret = atlas ilerlemesi; "ilk" başarımı, seri yok | Pokémon GO kırsal önyargısı (T3). **Dinî yapıları toplanabilir nokta yapma** (hassasiyet; doğrulanmadı). Konum hep oyun içidir (KVKK) |
| 11 | Karakol/barikat yakınında `[E] Mevzi hazırla`: 24 saat savunma +%3 (H5 sınırları içinde); baskın sonrası hasar tespiti, onarım hızlanır | Askeri Alfa-1; Alfa-0'da yalnız NPC eşkıya baskını (PvE) ve panel. H5 korumaları (4 saatlik yoğun saat, ≥49 saat ara) aynen |
| 12 | İklim olayında (T3) ilçe meydanında yardım noktası; su/yem/çuval bırak; ilçe hasar azaltma ortak ölçeği (en çok −%20); katkı rozeti | Ortak mal ve bedavacı riski (Eco dersi): rozet + kitabe, bedavacıya ceza yok. İklim takvimiyle uyumlu |
| 13 | NPC'ler: ilçe nüfusu × saat ile sayısı değişen görsel örnekler; sunucuda durum yok. Oyuncular: ≤15 avatar/ilgi alanı, ad etiketi, 4 selam hareketi. Yapı içinde yayınlanmaz | Capital Rift gizlilik modeli. Çizim bütçesi: NPC'ler instanced; ≤60 çizim çağrısı (F5) |
| 14 | Müteahhit "inşa kapasitesi" satar (11 §7.6, v1.5): çarşıda tezgâh, sabit fiyat, teminat | Aklama ve çoklu hesap kuralları (11 §10) bu özellik açılmadan önce şart |

### 4.4 6 katman + askeri eşleme

| Katman | Dolaşma cevapları |
|---|---|
| Tarım | 1, 2, 12 |
| Sanayi | 1, 7 |
| Lojistik (arka plan) | 4, 6 (yalnız teslim noktası olarak; rota yok) |
| Teknoloji | **Dolaşma cevabı yok.** Atölye-Lab'ın "yöntem açma" işi panel işidir; yapay yürüyüş cevabı eklemek angaryadır. İleride "gösteri günü" (TK3 yayılım) düşünülebilir, ama önerilmedi |
| Pazar | 3, 4, 8, 9, 13, 14 |
| Devlet | 5, 6, 12, 14 |
| Askeri | 11 (+ NPC eşkıya baskınları) |

### 4.5 Alfa dilimleri (F5/F6 bağımlılığı)

| Dilim | İçerik | Bağımlılık |
|---|---|---|
| **Alfa-0** (yürüyüşsüz) | Ticaret ofisi sözleşme listesi (4), tabela adı + vitrin listesi (8), `arama_sondaji` (7 uzaktan), bağış paneli (6, 12), atlas listesi (10), savunma paneli (11). **Hiç yeni çekirdek mekaniği yok;** mevcut P5/S3/S5/T3 komutları üstüne UI | F3, F4 |
| **Alfa-1 ilk dilim** | 1, 4 (pano), 8 (3B), 10, 13 | F5 (yürüyüş), seyrek presence, Ü14 kararı |
| **Alfa-1 ikinci dilim** | 2, 3, 5, 6, 7, 11, 12 | F6 (yönetişim, askeri), ortak proje kataloğu (Ü7) |
| **Sonra (v1.5)** | 9, 14, tezgâhın emir defteriyle birleşmesi | 08 §5.4 kapısı, aklama kuralları |

### 4.6 Ölçüm ve doğrulama

- **Botlar eğlenceyi ölçmez** (00 R5, 01 §5). Yürüyüş cevapları için **insan testi** şart: Alfa-1'de 8–10 kişilik, 20 dakikalık oturum; soru: "Bu ziyaret bir angarya mıydı, yoksa merak mı?"
- **Ölçülebilir hipotezler (öneri, H10–H12):** (H10) yürüyüşlü ödül alanlar, almayanlara göre yalnız ≤%3 daha verimli olsun (denge: yürüyüş bonusu zorunlu çıkmasın). (H11) ziyaret sayısı oyuncu başına günde ≤6 ve oturumların ≥%60'ında ≤1 ziyaretle bitsin (angarya göstergesi). (H12) vitrin puanı yüksek tezgâhların satışı ≤%10 fazla olsun.
- **Telemetri:** Capital Rift "oyuncuların takıldığı anları" günlük sayaçlarla tutuyor ve sohbeti AI ile özetliyor; bizim için asgari veri ilkesi (R-Ü16) gereği bunlar **açık rıza ve ayrı anahtar** ile olmalı; aksi hâlde yalnız toplu sayaç.

---

## 5. Kopyalamamamız gereken Capital Rift riskleri/hataları

| # | Capital Rift'te | Neden kopyalamıyoruz | Bizim kararımız |
|---|---|---|---|
| H1 | **Tam oyuncu pazarı** ("kimse odun satmıyorsa odun yok") | Düşük nüfusta çöker (≤200 davetli); Capital Rift'te bile NPC talep var | Açıkça işaretli NPC piyasa yapıcı + bölgesel defter (v1.5, ≥8 eşzamanlı oyuncu) ve **NPC talep tabanı** (madde 3, 4, 8) |
| H2 | **Ücretli kapalı beta + ilerleme silme (wipe) olabilir** | Erişim duvarı, davet büyümesini ve örnek çeşitliliğini daraltır; wipe'lı ücretli test güven kaybettirir | Alfa-0 davetli ve ücretsiz; wipe politikası önceden yazılı; yedek/geri yükleme tatbikatı (A0-3) |
| H3 | **Takas edilebilir kupa, sadakat kazancını %1–5 artırıyor** + aylık davet yarışı | K13 çelişkisi; davet yarışı çoklu hesap ve spam üretir; "gerçek değer" algısı | Sahip kararı gelir modeli (Ü12) bekler; **oyun gücü satılmaz/takas edilmez**; davet yarışı yok |
| H4 | **Profil halkası net değere göre renk değiştirir** | Servet göstergesi hedef tahtası olur; H5 ve kartopu | Görünür servet göstergesi yok; yalnız "ilk" başarımları ve kitabe |
| H5 | **Sınırsız banka hesabı + oyunculara para gönderme + "dışarıdan mevduat" yasağı** | Aklama ve dolandırıcılık vektörü (koşullar bunu açıkça yasaklıyor, yani sorun var ya da öngörülmüş) | Yeni hesap transfer tavanları (11 §10), tek hesap tek e-posta, giriş yöntemleri sınırlı |
| H6 | **Dünyayı serbestçe düzenle** (bina yerleştir/sil) | Kötüye kullanım (grief), moderasyon yükü, OSM verisi lisansı | Yalnız **kendi arsanda** yapı; dünya düzenleme yok; ODbL ayrımı (K24) |
| H7 | **Akış çizgileri ve kapsam konsolu** | Sahibin reddettiği görsel (K29) | Sakin simgeler, durağan noktalı çizgi, Dikkat paneli |
| H8 | **İlk saat zor** (geliştirici kabulü; yeni öğretici yapılıyor) | Alfa-0 kapısına zarar (A0-6) | İlk 10 dakika planlı (11 §7.9); yeni oyuncu hibesi ve %30 indirim; Giriş ekranında 3 ilçe önerisi |
| H9 | **Hukuk metninde sonradan düzeltilen hata** (önce "iade edilemez" dendi; AB'de 14 gün cayma var) | Gelir modeli gelince tekrarlanabilir | K34 dış hukuki görüş; ücretli bir şey eklenmeden önce hukuki gözden geçirme |
| H10 | **Aşırı iddialı pazarlama** ("dünyanın en büyük ekonomi simülatörü", farklı tarihlerde 4.000 → 15.353 oyuncu) | Doğrulanamayan sayılar güveni zedeler; bizim R-Ü15 ile uyumlu değil | Yalnız ölçülmüş sayı kullan |
| H11 | **Kapsam şişmesi** (3B iç mekân editörü, giyilebilir kıyafet, bilgisayar üretimi, hayvan çiftliği, banka, sürülebilir araç, dükkân stili, mobilya...) tek küçük takımda | R-Ü14 (kapsam kayması); biz çok katmanlı strateji kuruyoruz | Dolaşma cevapları yalnız **mevcut katmanların yüzü**; yeni mini oyun yok |
| H12 | **Tek kaynaklı bilgiye ürün kararı bağlama** | Capital Rift verisi geliştirici anlatımıdır; bağımsız teyit yok | Bu rapor yön göstergesidir; Alfa-0 insan testi |

**Kopyaladığımız (iyi) olanlar.**

| Capital Rift'ten | Bizdeki yeri |
|---|---|
| "Yalnız üretirken ücret" ve çevrimdışı çalışma | Hasat ve üretim tembel birikimi (zaten karar) |
| Canlı kâr/zarar geri bildirimi | Bina paneli: dakika başına/gün başına kâr ve "rozetin nedeni" |
| Bina içinde yayınlamama, konum API'sini bloklama | Presence gizlilik modeli (Ü14, İ7); KVKK ile uyumlu |
| Hızlı seyahat yalnız kendi yapılarına | İ4: ışınlanma yalnız kendi yapılarına |
| Orta tıkla wiki | "Bu nedir?" bağlam sayfası, Dikkat paneli bağlantıları |
| Bağlantı yasağı + isim filtresi | Tabela, aday programı, sohbet; sıfırıncı günden |
| Öneri/hata panosu + ekran görüntüsü otomatik | Alfa-0 geri bildirim kanalı |
| Dükkân stili puanı (ekonomik etki) | Madde 8 (daha küçük çarpan, +%10) |

---

## 6. Açık sorular (sahip/lider için)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| Ç1 | Yürüyüş bonusları ne kadar küçük kalmalı? (aşınma −%5 puan, sondaj +%10 puan) | Yukarıdaki değerler; H10 ölçümü sonrası kalibre |
| Ç2 | Tabela/vitrin kozmetik hakları ileride ücretli olabilir mi? | Gelir modeli kararına kadar tümü ücretsiz (Ü12) |
| Ç3 | NPC müşterinin görsel sayısı ve ilçe başına tavanı | ≤30 instanced sprite; ölçüm F5 sonrası |
| Ç4 | Kaşif noktalarında dinî yapılar ve hassas alanlar | Toplanabilir nokta yapma (öneri); K33 ad politikası |
| Ç5 | Diğer oyuncuların avatarları (Ü14) | Alfa-1'de seyrek, yapı içi gizli (İ7) |
| Ç6 | İlçe tezgâhı için OSM `marketplace` yoksa varsayılan meydan | İlçe merkezine en yakın OSM `place` noktası; yoksa idari merkez |

---

## 7. Kaynaklar

**Capital Rift (birincil ve geliştirici)**
- [capitalrift.com ana sayfa ve istemci](https://capitalrift.com/) (Player Pass, VIP, kupa, davet yarışı; istemci betiği doğrudan okundu)
- [Kullanım koşulları (25 Ağustos 2026)](https://capitalrift.com/terms/)
- [Gizlilik politikası (23 Eylül 2026)](https://capitalrift.com/privacy/)
- [TikTok: tam özellik listesi](https://www.tiktok.com/@nikkeuser/video/7666487170605026591) (aynı video `@niksgames` yoluyla da listeleniyor)
- [TikTok: beta duyurusu](https://www.tiktok.com/@nikkeuser/video/7663562981308910879)
- [TikTok: "Fully Player Market"](https://www.tiktok.com/@niksgames/video/7665744359005932831)
- [TikTok: "Economy MMO, tarayıcıdan oyna"](https://www.tiktok.com/@nikkeuser/video/7669063429176429855)
- [TikTok: Lojistik güncellemesi](https://www.tiktok.com/@niksgames/video/7666166983896943903)
- [TikTok: Nakliye güncellemesi ve yeni öğretici](https://www.tiktok.com/@niksgames/video/7671413170463903007)
- [YouTube: Capital Rift Tutorial (Paddy Plays)](https://www.youtube.com/watch?v=oNfawXo8q2A) (bölüm başlıkları arama özetinden)

**Karakterle dolaşma ve karşılaştırma**
- [GTA Online gece kulübü rehberi (GTA Boom)](https://www.gtaboom.com/gta-online-nightclub-guide-after-hours-ac95) · [Gameranx pasif gelir](https://gameranx.com/features/id/560048/article/gta-online-how-to-make-passive-income-using-the-nightclub/) · [GameFAQs sell mission](https://gamefaqs.gamespot.com/boards/805602-grand-theft-auto-online/78334032) · [Steam: sell mission zamanlayıcı](https://steamcommunity.com/app/271590/discussions/0/4407417073565895623/)
- [Albion forum: Caerleon pazarı](https://forum.albiononline.com/index.php/Thread/113289-The-Truths-Behind-The-Caerleon-Marketplace-Speculations/) · [Albion Forge: şehirler](https://albionforge.net/guides/albion-cities) · [Albion Codex: ada rehberi](https://www.albioncodex.com/guides/albion-online-island-guide)
- [Rust Help: Bandit Camp](https://rusthelp.com/monument/bandit-camp) · [Frozen Rust: Outpost](https://frozen-rust.com/rust-outpost.html)
- [Ultima Online Wiki: oyuncu satıcıları](https://uo.com/wiki/ultima-online-wiki/gameplay/npc-commercial-transactions/npcs-player-owned/) · [mobiledevmemo](https://mobiledevmemo.com/ultima-online-nfts-and-player-run-economies/)
- [OSRS Wiki: Grand Exchange](https://oldschool.runescape.wiki/w/Grand_Exchange) · [RuneScape Wiki: Grand Exchange](https://runescape.wiki/w/Grand_Exchange)
- [Minecraft Wiki: Explorer Map](https://minecraft.fandom.com/wiki/Explorer_Map)
- [Pokémon GO coğrafi analiz (T&F)](https://www.tandfonline.com/doi/pdf/10.1080/10095020.2017.1368200) · [CHI'17: Geography of Pokémon GO](https://jacob.thebault-spieker.com/papers/CHI17_PokemonGo.pdf) (içerik bu turda okunamadı; yalnız başlık/özet)
- [GameSkinny: Big Ambitions](https://www.gameskinny.com/culture/big-ambitions-early-access-review-big-city-dreams/) (doğrudan okunamadı; arama özeti) · [Big Ambitions Wiki: ulaşım](https://big-ambitions.fandom.com/wiki/Transportation) · [Big Ambitions: iç mekân puanı](https://bigambitionsgames.wiki/interior-rating/) · [Steam: Big Ambitions tartışma](https://steamcommunity.com/app/1331550/discussions/0/600767415367837401/)
- [Eco Wiki: Settlements](https://wiki.play.eco/en/Settlements) · [Eco Kickstarter: araçlar ve taşıma](https://www.kickstarter.com/projects/1037798999/eco-global-survival-game/posts/1625328) (doğrudan okunamadı; arama özeti)
- [Foxhole Wiki: lojistik](https://foxhole.fandom.com/wiki/Community_Guides/Logistics) · [NME: lojistik grevi](https://www.nme.com/news/foxhole-logistics-union-ends-49-day-strike-after-demands-met-3173270)
- [Life is Feudal Wiki: Claim](https://lifeisfeudal.fandom.com/wiki/Claim)
- [Bloxburg Wiki: Delivery Person](https://welcome-to-bloxburg.fandom.com/wiki/Delivery_Person)
- [Capitalism Lab](https://www.capitalismlab.com/) · [topbizgames: Capitalism Lab](https://topbizgames.com/reviews/pc-game/capitalism-lab)
- [Naavik: Upland](https://naavik.co/deep-dives/upland-property-tycoon/)

**İç belgeler**
- [11 — Ürün Dönüşü](../11-urun-donusu.md) (K13, K28, K29, §7, §9, Ek kararlar) · [08 — Altı Katman](../08-alti-katman.md) (S3, S5, T3, P2, P5, §5.4) · [01 — Rakip ve pazar](../01-rakip-ve-pazar-arastirmasi.md) · [oyun tasarımı: parsel](oyun-tasarimi-parsel.md) · [arayüz ve UX](arayuz-ux.md) · [sokak seviyesi 3D](sokak-seviyesi-3d.md)

**Erişilemeyen kaynaklar (bu turda).** Reddit (ağ politikası engeli), Steam'de Capital Rift sayfası (yok), Discord, TikTok yorumları, oyun içi wiki, oyuncu şikâyetleri. Bunlar için bağımsız kanıt **yok**; Alfa-0 insan testi ve gerekirse ilgili topluluklara doğrudan başvuru önerilir.
