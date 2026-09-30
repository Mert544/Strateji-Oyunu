# 01 — Rakip ve Pazar Araştırması

> **Özet.** Bu belge Capital Rift'in (ilham aldığımız görünür üretim ağı hissinin kaynağı) profilini, o hissin neden tatmin ettiğini ve bizim 2D/devlet ölçekli sürümümüze nasıl uyarlanacağını, rakip oyunlardan çıkan dersleri ve yayımlanmış tutma verilerini toplar. **Kanıt kalitesi düşüktür:** Capital Rift hakkında bağımsız kaynak neredeyse yoktur ve tutma verisinde kalıcı tarayıcı strateji oyunlarına özgü yayımlanmış sayı bulunamamıştır. Doğrulanmamış her bilgi bu belgede açıkça işaretlenmiştir.

Bağlam için: [00 — Vizyon ve Kararlar](00-vizyon-ve-kararlar.md). Tasarım sonuçları: [02 — Tasarım Ar-Ge](02-tasarim-arge.md).

---

## 1. Kanıt kalitesi uyarısı

- Capital Rift hakkındaki bilgilerin çoğu **geliştiricinin kendi TikTok özellik videolarından** gelir; bağımsız (basın, inceleme, oyuncu topluluğu) kaynak neredeyse yoktur.
- Elimizdeki brief "2D" der; ancak kaynaklar OpenStreetMap tabanlı **paylaşımlı 3D dünyayı** anlatır. Bu tutarsızlık çözülmemiştir.
- `capitalrift.com` ve `play.capitalrift.com` araştırma sırasında okunabilir içerik döndürmemiştir.
- Para kazanma ayrıntısı bulunamadı; Steam yorumları, Reddit veya şikâyet kaydı bulunamadı.
- Bu belgedeki rakip çıkarımları **yön göstergesidir**; tek kaynaklı topluluk yorumları içerebilir.

## 2. Capital Rift profili

| Başlık | Bilgi | Güvenilirlik |
|---|---|---|
| Tür | Ücretsiz tarayıcı "ekonomi MMO"su, indirme yok | Geliştirici anlatımı |
| Geliştirici | Görünüşe göre tek kişi, "Nik" (TikTok @niksgames) | Doğrulanmadı |
| Durum | 2026 ortası beta ([TikTok](https://www.tiktok.com/@nikkeuser/video/7663562981308910879)) | Tek kaynak |
| Dünya | Herkes OpenStreetMap'ten kurulmuş **tek kalıcı 3D dünyayı** paylaşır ([TikTok](https://www.tiktok.com/@niksgames/video/7666487170605026591)) | Tek kaynak |
| Oyuncu sayısı | ~12–15 bin | **Doğrulanmadı** |
| Steam demo, 7 Ağustos 2026 çıkış | İddia | **Doğrulanmadı** |
| Başlangıç | Bir yemek arabasıyla başlanır; arsa alınır, dükkân/çiftlik/ahır/maden/fabrika açılır, işçi alınır | Geliştirici anlatımı |
| Pazar | 35+ mallı tek küresel borsa, oyuncularla gerçek emir defteri; neredeyse hiçbir şey NPC fiyatlı değil ("kimse odun satmıyorsa odun yok") | Geliştirici anlatımı |
| Zincirler | Kütük→kalas, cevher→külçe; sonra çivi, tel, çelik sac, makine parçası; tezgâhlar çoğu nesneyi üretir | Geliştirici anlatımı |
| Geri bildirim | İşletme başına canlı kâr/zarar; servete değil **aktiviteye** bağlı sadakat puanı | Geliştirici anlatımı |
| Lojistik | Depo düğümleri eşya ister/sağlar, depo işçileri taşır; mülkler "teslimat alanları"nda ne istediğini/ne gönderdiğini gösterir; şoförlü kamyon park edince ağa katılır (rota kurma yok); konsol kapsamı, neyin aç kaldığını ve dünyada akış çizgilerini gösterir | Geliştirici anlatımı |
| Zaman | İşçiler yalnızca üretirken ücret alır; çevrimdışıyken her şey çalışmaya devam eder | Geliştirici anlatımı |
| Para kazanma | Bulunamadı | Bilinmiyor |

## 3. Görünür ağ neden tatmin eder ve bizim sürüme uyarlama

### 3.1 Neden tatmin edici (çıkarım)

Aşağıdakiler araştırmanın **çıkarımıdır**, kanıtlanmış oyuncu verisi değildir:

1. **Talep düğümde görünür** → eksikliğin bir yeri vardır; oyuncu "neden üretmiyor?" sorusunu haritada yanıtlar.
2. **Kapasite eklemek tek aksiyondur**, etkisi akış çizgisinde ve kapsam konsolunda görünür → eylem ile sonuç arasındaki bağ kısadır.
3. **Otomasyon işçi başına artımlıdır** → "angarya çıkmazı" yoktur (her şeyi elle taşımak ile tam otomasyon arasında uçurum yok).
4. **Fiyatlar gerçek kıtlıktan doğar** → ağın şekli önemlidir.

### 3.2 Bizim sürüme uyarlama

| Capital Rift öğesi | Bizdeki karşılığı | Fark ve gerekçe |
|---|---|---|
| Paylaşımlı 3D OSM dünyası | **2D** harita, 30–60 bölgelik gerçek coğrafya dilimi (önce sentetik) | 3D ve gerçek harita karoları kapsam dışı ([00 §5](00-vizyon-ve-kararlar.md)) |
| Mülk/arsa ölçeği | **Bölge/devlet ölçeği**; düğüm = bölge, kenar = kara/deniz/hava bağlantısı | Oyuncu yönetici; işletme değil bölge yönetilir |
| Depo işçileri ve şoförlü kamyonlar | Politika düzeyinde emir; **kendiliğinden çalışan lojistik ağı** (mikro yönetim yok) | Victoria 3 / HoI4 mikro yönetim şikâyetlerinden ders |
| Tam oyuncu pazarı (gerçek emir defteri) | **Sınırlı derinlikli, açıkça işaretli dünya pazarı** (yalnızca limanlardan erişilir; Victoria 3 tarzı kelepçeli fiyat) | Düşük nüfusta pazar çökmesi riski: "kimse odun satmıyorsa odun yok" modeli az oyuncuda kırılgandır. Bu, geliştirici tanıtımına dayanan bir çıkarımdır |
| Konsol kapsamı / akış çizgileri | **"Neresi açık ve neden" kapsam görünümü** ([02 §6](02-tasarim-arge.md)) | H4 ile sınanır |
| Sürekli üretim, çevrimdışı çalışma | Sürekli zamanlı, tembel birikimli simülasyon; çevrimdışı birikir, kayıp tavanlı | [03](03-teknik-mimari.md) |
| Aktiviteye bağlı sadakat puanı | Henüz tasarım kararı yok; ilham notu | — |

## 4. Rakip dersleri

**Not:** §4.1 sahibin planındaki (PDF) dersleri, §4.2 bu araştırmanın eklediklerini içerir. Topluluk yorumları tek kaynaklı olabilir; yön göstergesi olarak okunmalıdır.

### 4.1 PDF'teki dersler

| Sorun | Görüldüğü yer | Prototip kuralı |
|---|---|---|
| Parayla güç satın alma | Bytro oyunları, Conflict of Nations, Politics & War, Rival Regions, eRepublik, Travian | Kritik kararlarda ücretli avantaj yok |
| Uzun oyunda tekrar ve yorgunluk | Call of War büyük haritaları, Victoria 3 ("her ülkede aynı strateji") | Her bölgede farklı en iyi strateji; tekrar endeksi ölçümü (H1, H2) |
| Mikro yönetim | Victoria 3 bina ayarı, HoI4 birlik kontrolü | Politika düzeyinde emir; kendiliğinden çalışan lojistik ağı |
| Çevrimdışı vurulma | OGame filo kurtarma zorunluluğu | Hazır savunma emirleri ve kayıp üst sınırı (H5) |
| Kartopu ve eski oyuncu avantajı | Politics & War, eRepublik | Koruma süresi, puan bandı, geri dönüş yardımı (H6) |
| Düşük nüfusta pazar çökmesi | Tam oyuncu pazarı modeli (Capital Rift, geliştirici tanıtımına göre) | Sınırlı derinlikli, açıkça işaretli dünya pazarı |
| Günlük görev angarya | Akademik ankette "angarya" algısı | Günlük giriş ödülü yok |
| Sınır hassasiyeti | eRepublik (Tayvan 2010'da eklendi) | Sınır ve isim politikası önceden yazılı ([00 §8](00-vizyon-ve-kararlar.md)) |

### 4.2 Araştırmanın eklediği dersler

#### Parayla güç (pay-to-win)

| Oyun | Bulgu | Kaynak |
|---|---|---|
| Bytro (Conflict of Nations) | Gold ile anında bitirme ve moral; yaygın olarak pay-to-win sayılır | [Pocket Tactics](https://www.pockettactics.com/conflict-of-nations-world-war-3/review) |
| Rival Regions | Premium "neredeyse zorunlu": enerji 200→300, otomatik çalışma | [Rival Regions Wiki](https://wiki.rivalregions.com/Gold_and_Premium) |
| Politics & War | Harcamayı ulus başına 20 kredi ile sınırlar ama yine eleştirilir | [Google Play sayfası](https://play.google.com/store/apps/details?id=com.game.politicsandwar&hl=en_US) |
| Travian | Gold grind'ı kısaltır | [Gameforge](https://gameforge.com/en-GB/games/ogame-vs-travian.html) |

**Ders:** kolaylık ve kozmetik satılabilir; **zaman atlama veya kapasite asla.** (Gelir modeli prototip kapsamı dışıdır; bu yalnızca ilkedir.)

#### Çevrimdışı ceza ve koruma

| Oyun | Bulgu | Kaynak |
|---|---|---|
| OGame | Resmi koruma yok; topluluk "fleet saving" geliştirdi; oyuncular alarm kurup düzensiz uyuduğunu anlatıyor | [OGame Wiki: Save](https://ogame.fandom.com/wiki/Save), [GameFAQs incelemesi](https://gamefaqs.gamespot.com/webonly/929195-ogame/reviews/92221) |
| Travian | Tatil modu 1–15 gün, ön koşullu; başlangıç koruması 3–14 gün; birlik dışardayken tatile girilemez | [Travian destek](https://support.travian.com/en/articles/61-vacation-mode) |
| Politics & War | "Beige" (kayıptan sonra savaş bağışıklığı, yeni uluslar için 14 güne kadar) + tatil modu; pasifler silinir/tatile alınır. Bir yorumcu, bir günü kaçırınca saldıran ittifaklardan şikâyetçi (tek kaynak) | [Kurallar](https://politicsandwar.com/rules/) |
| Bytro | Pasif oyuncuları yapay zekâya devreder | [Call of War Wiki: AI](https://call-of-war-by-bytro.fandom.com/wiki/AI) |

**Ders:** *önceden ilanlı 24 saatlik pencere + kayıp tavanı* bunların hepsinden yapısal olarak daha iyidir. Bu tavan dışında çevrimdışıyken hiçbir şeyin kaybedilemeyeceği oyuncuya **açıkça söylenmelidir.**

#### Kartopu ve yeni oyuncu

| Oyun | Bulgu | Kaynak |
|---|---|---|
| Travian | Birkaç yüz hesap sunucuyu domine edebilir; sabit raundlar çekişmeli oyun sonu verir | Arama özeti (birincil kaynak doğrulanmadı) |
| Rival Regions | Yeni oyuncular "sayıca, beceride geride" | [Steam tartışması](https://steamcommunity.com/app/905370/discussions/0/1742266800330244632) |
| Bytro | Raundlar 5–10 hafta; 22 oyuncunun çoğu çabuk bırakır | [Call of War Wiki: Maps](https://call-of-war-by-bytro.fandom.com/wiki/Maps) |

**Ders:** kayıp tavanı ve yetişme mekanikleri. Raunt/sezon kalıcı dünya kararıyla ([00 K10](00-vizyon-ve-kararlar.md)) dışlandığı için geç katılım koruma, puan bandı ve yetişme yardımıyla çözülür (H6).

#### Angarya ve çürüme

| Kaynak | Bulgu |
|---|---|
| [eRepublik](https://www.erepublik.com/en/article/2728498) | 2020'de aktif oyuncuların **~%8,7'sini** kaybettiği bildirilir (46.000 → 41.778). **Dikkat:** verilen sayılar kendi içinde tam uyuşmuyor (4.222 / 46.000 ≈ %9,2); 46.000 yuvarlanmış olabilir. Doğrulanmadı. Yorumcular tekrarlayan farm, az gelişme ve eski ekonomiyi bozan revizyonları anıyor |
| [GameAnalytics](https://www.gameanalytics.com/blog/ten-reasons-why-players-quit) | Bırakma nedenleri: tekrarlayan görev tükenmişliği, tüm içeriğin tüketilmesi, fazla karmaşıklık |
| — | **20–25. gün tekrarına dair yayımlanmış bir kaynak bulunamadı** → hipotez olarak ele alınır (H2) |

#### Lojistik okunurluğu

| Oyun | Bulgu | Kaynak |
|---|---|---|
| Victoria 3 | İkmalin yeterince etkili olmadığı ve HoI4'teki gibi bir mercek bulunmadığı şikâyetleri; kendi ticaret revizyon günlüğü önceki ticareti "güvenilmez, fazla uğraştırıcı" diye tanımlar | [Steam tartışması](https://steamcommunity.com/app/529340/discussions/0/3600093929973637846/?ctp=2), [Dev Diary 143](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-143-trade-rework-the-world-market.1733205/) |
| HoI4 | İkmal ray→merkez→tümen; en zayıf ray bağlantısıyla sınırlı; merkezdeki açık tümenlere eşit paylaştırılır | [PCGamesN](https://www.pcgamesn.com/hearts-of-iron-iv/supply-trains) |
| OpenTTD | Bağlantı grafı katmanı çizgileri yük/kapasiteye göre renklendirir, ipucunda kullanım gösterir | [PR #9760](https://github.com/OpenTTD/OpenTTD/pull/9760) |
| Factorio | Lojistik arayüzünü dağınıklığı azaltmak için defalarca yeniledi | [FFF-405](https://factorio.com/blog/post/fff-405) |

**Ders:** lojistik derin olacaksa **okunur olmak zorundadır** (H4); UX önerileri [02 §6](02-tasarim-arge.md) içindedir.

## 5. Tutma (retention) verisi ve çıkarımlar

**Kalıcı tarayıcı strateji oyunlarına özgü yayımlanmış D1/D7/D30 verisi bulunamamıştır.** Aşağıdakiler komşu türlerden ve genel kıyaslardan alınmıştır; doğrudan hedef olarak kullanılmamalıdır.

| Kaynak | Kapsam | D1 | D7 | D30 | Not |
|---|---|---|---|---|---|
| [GameAnalytics 2026 kıyasları](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks) | Mobil, medyan | ~%22 | ~%4 | ~%0,7–0,8 | Medyan |
| aynı | PC, medyan | ~%7 | ~%1,1–1,3 | ~%0,2–0,25 | Medyan |
| [Playio blog](https://blog.playio.co/retention-by-game-genre) | Strateji/mid-core | %35–50 | %20–35 | %10–20 | İkincil kaynak; **medyan değil, üst dilim hedefi** olarak okunmalı |
| [SuperData 2015 (A List Daily)](https://www.alistdaily.com/strategy/understanding-free-to-play-mmo-retention/) | F2P MMO, çıkış ayı kohortu | %83 | — | %20 | 2015 verisi, eski |
| aynı | F2P MMO, çıkıştan 12 ay sonra katılanlar | %35 | — | %3 | Olgun dünyada geç katılan çok daha sert kaybedilir |

### Çıkarımlar

1. **Geç katılanlar için plan şarttır.** SuperData verisi, olgun bir dünyada sonradan gelenlerin D1 ve D30'unun belirgin düştüğünü gösterir (tek kaynak, 2015). Koruma süresi, veteranların domine etmediği başlangıç bölgeleri ve yetişme yardımı (H6) bu nedenle tasarımın parçasıdır.
2. **D7 ve D30, katılım tarihine göre (kohort) izlenmelidir;** dünya yaşlandıkça yeni kohortların davranışı değişir.
3. **Yüksek D1 + düşük D7**, eksik orta oyun derinliğine işaret eder ([Melior Games](https://meliorgames.com/best-practices/what-d1-d7-and-d30-really-tell-you-about-your-game/)). Bu, 20–25. gün tekrar hipotezimizle aynı yönü gösterir ama onu **kanıtlamaz**.
4. **Kanıt sınırı:** insan tutma verisi ancak oynanabilir prototipte (Aşama 3 sonrası) ölçülebilir; simülasyon (Aşama 2) dengeyi ölçer, eğlenceyi kanıtlamaz ([00 R5](00-vizyon-ve-kararlar.md)).

## 6. Kaynakça

**Capital Rift**
- [TikTok — beta duyurusu (@nikkeuser)](https://www.tiktok.com/@nikkeuser/video/7663562981308910879)
- [TikTok — OSM tabanlı tek dünya (@niksgames)](https://www.tiktok.com/@niksgames/video/7666487170605026591)

**Parayla güç**
- [Pocket Tactics — Conflict of Nations incelemesi](https://www.pockettactics.com/conflict-of-nations-world-war-3/review)
- [Rival Regions Wiki — Gold and Premium](https://wiki.rivalregions.com/Gold_and_Premium)
- [Politics & War — Google Play](https://play.google.com/store/apps/details?id=com.game.politicsandwar&hl=en_US)
- [Gameforge — OGame vs Travian](https://gameforge.com/en-GB/games/ogame-vs-travian.html)

**Çevrimdışı koruma ve kartopu**
- [OGame Wiki — Save](https://ogame.fandom.com/wiki/Save)
- [GameFAQs — OGame incelemesi](https://gamefaqs.gamespot.com/webonly/929195-ogame/reviews/92221)
- [Travian — Vacation mode](https://support.travian.com/en/articles/61-vacation-mode)
- [Politics & War — Rules](https://politicsandwar.com/rules/)
- [Call of War Wiki — AI](https://call-of-war-by-bytro.fandom.com/wiki/AI)
- [Call of War Wiki — Maps](https://call-of-war-by-bytro.fandom.com/wiki/Maps)
- [Steam — Rival Regions tartışması](https://steamcommunity.com/app/905370/discussions/0/1742266800330244632)

**Angarya ve çürüme**
- [eRepublik makalesi](https://www.erepublik.com/en/article/2728498)
- [GameAnalytics — Ten reasons why players quit](https://www.gameanalytics.com/blog/ten-reasons-why-players-quit)

**Lojistik okunurluğu**
- [Steam — Victoria 3 tartışması](https://steamcommunity.com/app/529340/discussions/0/3600093929973637846/?ctp=2)
- [Victoria 3 Dev Diary 143 — Trade Rework](https://forum.paradoxplaza.com/forum/threads/victoria-3-dev-diary-143-trade-rework-the-world-market.1733205/)
- [PCGamesN — HoI4 supply trains](https://www.pcgamesn.com/hearts-of-iron-iv/supply-trains)
- [OpenTTD PR #9760](https://github.com/OpenTTD/OpenTTD/pull/9760)
- [Factorio FFF-405](https://factorio.com/blog/post/fff-405)

**Tutma verisi**
- [GameAnalytics 2026 Mobile/PC benchmarks](https://www.gameanalytics.com/reports/2026-mobile-pc-gaming-benchmarks)
- [Playio — Retention by game genre](https://blog.playio.co/retention-by-game-genre)
- [A List Daily — F2P MMO retention](https://www.alistdaily.com/strategy/understanding-free-to-play-mmo-retention/)
- [Melior Games — D1/D7/D30](https://meliorgames.com/best-practices/what-d1-d7-and-d30-really-tell-you-about-your-game/)
