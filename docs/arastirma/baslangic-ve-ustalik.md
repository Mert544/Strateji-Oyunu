# Araştırma: Başlangıç ve Stratejik Yönelim

> **Konu.** Oyuncu oyuna nasıl girer, hangi yöne gideceğine nasıl karar verir, uzmanlığı nerede görünür olur ve geç gelen ile ilerlemiş oyuncu arasındaki denge nasıl kurulur? Bu bir **strateji oyunudur**: karakter seviyesi, XP, ustalık kademesi ya da beceri ağacı yoktur. Karakterle yürüyüş yalnız oyuncuyu oyuna alıştırmak ve dünyayı hissettirmek içindir. İlerleme **varlık, ağ, itibar (sicil), makam ve pazar payı** ile ölçülür; uzmanlık karakterde değil **kurulan ekonomik yapıda** görünür.
>
> Dosya adı (`baslangic-ve-ustalik.md`) kararlaştırıldığı için korunmuştur; içerik "stratejik yönelim ve uzmanlaşma" olarak yazılmıştır (bkz. §0.1 düzeltme notu).

**Durum.** 1 Ekim 2026'da derlendi. Ar-Ge önerisidir; kod, parametre ve başka belge değiştirilmedi. Sayıların hepsi **öneridir, kalibre edilmemiştir** ve Alfa-0 ölçümüyle sınanır. **(doğrulanmadı)** etiketi birincil kaynakla teyit edilemeyen bilgiyi, **(arama özeti)** sayfa doğrudan okunamadığı, yalnız arama sonucundaki özetin kullanıldığı bilgiyi gösterir. Çekirdek gerçeklerinin hepsi `packages/cekirdek/src/` ve `packages/veri/icerik/parametreler.json` dosyalarından doğrudan okunmuştur (dosya ve satır adresleri metinde). Zaman dilimleri için "iklim takvimi" ve "dönem" denir.

İlgili belgeler: [11 — Ürün Dönüşü](../11-urun-donusu.md) (§7.9 yeni oyuncu, §7.6 roller, Ek kararlar) · [08 — Altı Katman](../08-alti-katman.md) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · [oyun tasarımı: parsel](oyun-tasarimi-parsel.md) · [arayüz ve UX](arayuz-ux.md) · [H1–H9 ölçüm tanımları](../olcum/h1-h9-parsel-tanimlari.md) · [çeşitlilik: üretim katmanları](cesitlilik-uretim-katmanlari.md) · [çeşitlilik: yönetim, askeri, teknoloji](cesitlilik-yonetim-askeri-teknoloji.md)

---

## Yönetici özeti (10 madde)

1. **İlerleme karakterde değil dünyada.** Seviye, XP, rütbe ve beceri ağacı yok. İlerleme beş eksendir: **varlık** (arsa, yapı, stok), **ağ** (sözleşme, tedarik, ticaret anlaşması), **sicil** (söz tutma kaydı; teminat ve sözleşme limitini etkiler), **makam** (muhtar, vali, komutan) ve **pazar payı**. Hepsi çekirdek durumundan türetilir; yeni sayaç ya da puan biriktirme mekaniği gerekmez (§0).
2. **İlk 60 saniyede karakter bir ilçe çarşısında durur, 10 dakikada ilk yapıyı kurar ve ilk satışı yapar.** Her adım tek bir kavram öğretir (yer, yapı ve maliyet, satış ve fiyat, zaman, sözleşme, darboğaz, iklim takvimi...). Zorunlu öğretici yoktur; sırası serbest, atlanabilir bir **Esnaf Defteri** görev zinciri vardır. Yürüyüş isteğe bağlıdır; her adımın haritadan/panelden karşılığı var (§2).
3. **Başlangıç ayarlarının kodla çelişen üç bulgusu var:** (a) çekirdek yalnız hibeyi ve başlangıç stokunu uyguluyor; **bedava yurt (6 hücre), ilk 5 yapıda %30 indirim ve %20 ayrılmış hücre parametrede tanımlı ama hiçbir yerde okunmuyor**; (b) kalkan kodda 7 gün, belgelerde 14 gün; (c) **ilk satış yolu `ticaret_emri` komutu, işletmenin devraldığı il merkezinde `liman` etiketi arıyor**; etiket yoksa ilk satış reddedilir (§2.4, §5.1).
4. **Üç açılış, sınıf değil.** Yerleş ekranı 3 ilçe önerir; her ilçe kartı bir **açılış önerisi** taşır: Tarım, Sanayi ya da Pazar ağırlıklı. Hiçbiri kilit değildir. **Devlet ve Askeri ilk gün seçilmez**; ilk haftanın sonunda "ikinci perde" olarak sunulur, çünkü ikisi de önce bir üretim tabanı ister ve Alfa-0'da seçim ve oyuncu savaşı yoktur (§3).
5. **Açılışlar eşit kolay değil.** Kendi kendine yeten tek zincir Tarım'dır. Sanayi açılışı elektrik (santral, 3 hücre) ve ham madde damarı ister; ilk 6 hücre yetmez (maden 2 + kömür 2 + santral 3 + çelikhane 3 = 10 hücre) ve Kocaeli'nin muhtemel merkez bölgesi (`izmit`) kayıtlarında yalnız tahıl ve silis rezervi var. Öneri: **eşit taban değerli üç başlangıç sepeti** (§3.2) ve açılış başına "geç katılan" bot varyantı (§8).
6. **Yön değiştirmek ekonomik maliyetle olur, kilitle değil.** Beş kademeli bir "yeniden yatırım" merdiveni: yöntem değiştirme (mevcut, ucuz) → yapıyı yıkma (%50 iade, ilk 14 günde %70) → hücre bırakma (%70) → başka ilçede yeni işletme → ilk 72 saatte tek seferlik **pişmanlık penceresi** (ilk 3 yapıda tam iade). Teknoloji dışlayan dalları (geri dönüşsüz) onboarding'in dışında tutulur (§3.3).
7. **Uzmanlaşma bir sayaç değil, bir portföydür.** Uzmanı ödüllendiren zaten var: NPC pazarındaki ~%20 makas (zincirini kuran makası cebinde tutar), kümelenme ve imza çıktısı (+%10, öneri), teknoloji dışlayan dalları, ilçe imar payı ve yasalar. Sınırlayıcılar da var: ≤72 hücre ve ≤%25 ilçe payı, 2 eş zamanlı inşaat, 2 araştırma yuvası, ortak işgücü ve elektrik, tek makam, arazi vergisi. **Tek oyuncu her şeyde en iyi olamaz**, ama bunun için yeni bir "ustalık" katmanı gerekmez (§4).
8. **Uzmanlık nerede görünür?** Tabela (ad + simge), yapı silueti, **Esnaf Kartı** (portföy, zincirler, ilçeler, sicil; **servet göstergesi yok**), ilçe panosunda **üretim payı** sıralaması ve türetilmiş profil etiketi (Çiftçi, Sanayici, Tüccar, Muhtar, Komutan). Karakterin kıyafeti ilerleme taşımaz (§4.5).
9. **Denge araçları var; ilerlemiş oyuncuyu işe almaya teşvik eden yapısal bir mekanizma da var.** ₺50.000 hibe, başlangıç kiti, ilk 24 saatte %10 inşa süresi (kodda var), kalkan, ayrılmış hücre ve sipariş kotası, ilk sözleşmede teminatsızlık. İlerlemiş oyuncu **kasaba eşiği** (ilçede ≥10 sahip) ve NPC talebi yüzünden yeni oyuncudan yapısal olarak kazanır; buna **Rehberlik sözleşmesi** (alt sözleşme + sonuca bağlı ödül + kozmetik "Rehber" etiketi) eklenir. FFXIV'in mentor boosting vakasından ders: ödül süreye değil sonuca bağlanır (§5).
10. **Alfa-0 için öncelik: P0 = 4 S + 3 M, P1 = 2 S + 5 M; sicil (M) ve Rehberlik (L) ile yürüyüş içeriği (L) Alfa-1'e.** İlk dilim (P0): kalkan birleştirme, bedava yurt ve ilk yapı indirimi uygulaması, ilk satış yolunun düzeltilmesi, Esnaf Defteri kartı, ilk 60 sn sahne akışı, günlükten çıkan huni ölçümü. Yeni ölçütler **Y1–Y8** (ilk saatte ilk satış oranı, D1/D7, açılış çeşitliliği, yön değiştirme maliyetsizliği kanıtı, hibeden bağımsız 14. gün üretim geliri...). H2 ve H6 rehberli görevlerden ve hibeden **şişebilir**; ayrı raporlanmalı (§6, §7).

---

## 0. Çerçeve

### 0.1 Düzeltme notu: bu bir strateji oyunu

Sahip düzeltmesi (1 Ekim): oyun MMORPG değildir. Önceki taslak hattında geçen "Çırak → Kalfa → Usta → Üstat" kademeleri, "yaparak öğrenme" puanları ve karakter kıyafet rozetleri **bu raporda yoktur ve önerilmez.** Eski kararlardan etkilenen yerler lider tarafından güncellenmelidir:

| Belge / yer | Bugünkü ifade | Önerilen düzeltme |
|---|---|---|
| [11 §7.6](../11-urun-donusu.md) "Uzmanlaşma (Eco esinli) ustalık yolu ×1,5" ve Ü8 | Ustalık yolu pahalanması | Ü8 kapalı kalsın ve **kaldırılsın**; yerine §4'teki portföy mekanizmaları (makas, kümelenme, dışlayan dal, ortak havuz sınırı) |
| [11 §7.9, §9.2 ekran 1](../11-urun-donusu.md) "Yol seçimi: Tarımcı, Sanayici ya da Tüccar" | Bir yol "seçilir" | "Açılış **önerisi**" olsun; seçim yok, kilit yok (§3) |
| [arayuz-ux §6](arayuz-ux.md) "Bir yol seç" | Aynı | Aynı |
| [11 Ek karar (karakter merkezli dünya)](../11-urun-donusu.md) "ustalık yaparak kazanılır" ve "yürüyüş dünyayla ana temas biçimi" | Karakter ilerlemesi ima ediyor | "Ustalık" ifadesi kalksın; yürüyüş **adaptasyon ve dünyayı hissettirme** aracıdır. Her işin uzaktan karşılığı korunur |
| [Capital Rift mekanikleri §4.2](capital-rift-mekanikleri.md) 14 yürüyüş cevabı | Yürüyüş ödülleri | Küçük, bilgi/kimlik ağırlıklı kalsın; **sıfır zorunluluk** (zaten İ1) |

### 0.2 İlerleme neyle ölçülür (seviye yok)

| Eksen | Nedir | Çekirdekte nereden okunur | Oyuncuya ne kazandırır (mekanik etki) |
|---|---|---|---|
| **Varlık** | Arsa + yapı + stok | `HucreDurumu.degerMili`, `tesisler`, `stoklar` | Üretim, satış; arazi vergisi ve bakım gideri de getirir |
| **Ağ** | Tedarik sözleşmesi, ticaret anlaşması, (v1.5) lonca | `anlasma_*` komutları, sözleşme kayıtları | Makas yarıya iner (08 P2), teknoloji yayılımı (TK3), güvenli alıcı |
| **Sicil** | Söz tutma kaydı: teslim edilen / geciken sözleşme, kaybedilen teminat | **Yeni** (sözleşme olaylarından türetilir; §5.5) | **Teminat oranı** ve **açık sözleşme limiti** (kredi notu gibi) |
| **Makam** | Muhtar, vali, komutan | Seçim sonuçları (Alfa-1) | Vergi bandı, imar payı, yasa, savaş ilanı |
| **Pazar payı** | İlçede / ilde bir malın arzındaki pay | `uretimToplam`, `uretimOrani` | Fiyat etkisi, imza ürün kimliği, ilçe panosunda görünürlük |

Hiçbiri "yapılan iş için puan" değildir; hepsi **ekonomik durumun** bir okumasıdır. Böylece Albion/RuneScape tipi "saat başına süre farkı" (aşağıdaki §1 kutusu) doğmaz.

### 0.3 Yürüyüşün rolü

| Ne | Ne değil |
|---|---|
| İlk dakikalarda dünyayı tanıtır: çarşı, muhtarlık, arsa, komşular | Zorunlu taşıma, restok ya da günlük uğrama |
| Dünyayı hissettirir (NPC müşteriler, seyrek avatarlar, çarşı canlılığı) | Strateji kararının yapıldığı yer (kararlar harita, parsel ve bina panelindedir) |
| Hayalet yerleştirme ve inşa aşamalarının "yerinde" görülmesi | Ödül kaynağı (yürüyüş bonusu en çok bilgi ve kimliktir; [Capital Rift İ1–İ3](capital-rift-mekanikleri.md)) |
| Her adımda **"Haritadan git"** kısayolu vardır | Telefonda ya da düşük cihazda tek yol |

Gerekçe: Factorio ve Albion verileri, ilk dakikalarda **eylem** ve **az metin** istiyor (§1). Karakter yürüyüşü bu eylemi ve "yerlilik" hissini ucuza verir; ama strateji oyuncusu için derinlik panelde ve haritadadır.

---

## 1. Kanıt: iyi başlangıçlar ve ustalık sistemlerinden dersler

| Oyun | Ne yapıyor | Bizim için ders | Kaynak |
|---|---|---|---|
| **Factorio** | Eski öğretici 30–45 dakikada otomasyona varıyordu, oyuncular "öğreticiyi çözmeyi" öğreniyordu; yeniden tasarımda **mesaj kutusu yok**, ilk bölümde asıl kavramlar (montaj makinesi, elektrik) en az karmaşıklıkla, her tarif teknolojiyle açılıyor ve "kendi keşfi" zorlamadan iyi sayılıyor | Oyunun **asıl kavramına** ilk dakikada ulaş; kutu yerine çevre ve hedef; ödül = bir sonraki şeyin açılması | [Friday Facts 241](https://factorio.com/blog/post/fff-241) |
| **Albion Online** | Geliştiriciler "oyuncuların kum havuzuna bırakılınca bunalıp ayrıldığını" veriyle gördü; tutorial'da daha az toplama/üretim ve **daha az metin**; öğreticiden sonra **üç yol** (PvE, PvP, toplama) sunan "İlk Adımlar" günlüğü; vitrin adası | Yön seçimi **zorunlu sınıf değil, genişletilmiş öğretici**: "seçenek sun, temelleri öğret". Bizim Esnaf Defteri ve 3 açılış bu kalıpla örtüşür | [MMORPG.com](https://www.mmorpg.com/news/albion-online-devs-detail-abyssal-depths-new-player-experience-and-quality-of-life-improvements-2000135277) · [Dev Talk](https://albiononline.com/news/dev-talk-new-player-experience) (sayfa 403; arama özeti) · [Albion Journal](https://wiki.albiononline.com/wiki/Albion_Journal) |
| **EVE Online** | 5 kariyer ajanı (Kaşif, Zorba, Şans Askeri, 2 Sanayici), her biri **5–10 ardışık görev**; toplam yalnız 5–6 milyon ISK ve gemi/modül ödülü; wiki: "kariyer yoktur, kilit yoktur", birden çok zincir yapılabilir | **Yönlendirilmiş görev zinciri + kilitsizlik** + küçük ödül. Bizim "açılış kartı" bunun karşılığı | [EVE Uni: Career Agents](https://wiki.eveuniversity.org/Career_Agents) |
| **Stardew Valley** | Zorlayıcı öğretici yok; enerji çubuğu her zaman görünür; Topluluk Merkezi'ni tamamlama ya da JojaMart'a geçme **büyük ama geri dönüşsüz** bir yön kararı (5.000 altın); beceri mesleklerini 10.000 altına sıfırlama heykeli | **Yön değiştirmek bir bedelle mümkün** (ücret düşük, ama sıfır değil); kritik geri dönüşsüz karar ilk saatte değil sonra | [JojaMart](https://stardewvalleywiki.com/JojaMart) · [Statue of Uncertainty](https://www.thegamer.com/stardew-valley-how-find-statue-uncertainty-change-profession/) (arama özeti) |
| **Anno 1800** | Kampanya "hikâyeli öğretici"; oyuncular ekonomiyi ve ilerleme yollarını yeterince anlatılmadığı için **iflas** ediyor; yüksek zorlukta yapay zekâ adaları oyuncu hazır olmadan kapıyor | İlk satışa ve ilk **geliri** görmeye kadar zarar edilemeyecek bir başlangıç (hibe + kit); **kalkan ve ayrılmış hücre**, "ilk ada kapıldı" sorununun ilacı | [Steam: Beginner Questions](https://steamcommunity.com/app/916440/discussions/0/3824159062923148426/) (arama özeti) |
| **Big Ambitions** | Başlangıç: daire kirala, buzdolabı al, **kasiyerlik işi** (saatlik gelir) → İK kursu → ilk işletme; "ilk dükkân birkaç gün hayatta kalmadan personel ve merkez ofis sistemi ekleme" | **Güvenli bir ilk gelir kaynağı**, sonra işletme. Bizde ilk gelir "gıda stokunu sat + ilk tarla" | [Big Ambitions rehber](https://bigambitionswiki.pro/guide/) · [Steam rehberi](https://steamcommunity.com/sharedfiles/filedetails/?id=2944061973) (arama özeti) |
| **Capital Rift** | Tek yemek arabası → ilk dükkân (≈8 dk) → arazi ve çiftlik (≈17 dk) (üçüncü taraf video bölümleri); geliştirici "ilk başta zor" diyor, yeni öğretici sistemi hazırlıyor | Rakibin kabul ettiği zayıflık: **ilk saat zor**. Bizde ilk saatin planlı olması bir fark yaratır | [Capital Rift Tutorial](https://www.youtube.com/watch?v=oNfawXo8q2A) (bölüm başlıkları, arama özeti) · [güncelleme videosu](https://www.tiktok.com/@niksgames/video/7671413170463903007) · iç belge: [Capital Rift §2.5](capital-rift-mekanikleri.md) |
| **Mobil tycoon / idle** | İlk 5 dakika kararı belirler; "tycoon'da ilk makine 30 saniyede yerleşmeli"; oyun dışı her saniye kohortun ≈%2–3'ünü kaybettirir; tycoon D1 ≈%30 (iyi) – %45; D7 ≈%15 – %25; "Gün-3 duvarı"nı 2–3. saatte yeni içerikle kır; gelirin >%80'i ilk haftayı atlatanlardan | **İlk satış ve ilk üretim ilk 10 dakikada**; D1/D7 gözlemi (§8) | [rolearn](https://rolearn.dev/guidance/first-week-retention-optimization/) · [Segwise](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies) (strateji D1 %25,4 / D7 %8,1; simülasyon D1 %30,1 / D7 %8,7) |
| **Roblox (yaratıcı rehberi)** | Navigasyon ve çekirdek döngüyü **adım adım**, net hedeflerle (kısa/orta/uzun) öğret; ilk seviyeler hızlı; huniyi ölç | Hedef zinciri + ölçüm; ilk ödül hızlı olmalı | [Roblox: Onboarding](https://create.roblox.com/docs/production/game-design/onboarding) |
| **Hay Day** | Atlanamayan kısa öğretici; oyuncular yeni cihazda yeniden yapmak zorunda kalmaktan şikâyetçi | **Atla/kapat** her zaman olmalı; hesaba kayıtlı tutulmalı | [Supercell forumu](https://forum.supercell.com/showthread.php/297738-Guide-for-new-Hay-Day-players) (arama özeti) |
| **Travian** | Yeni oyuncu koruması: 3 günden 2 haftaya, oyunun yaşına göre; **nüfus 200'e ya da ikinci köye ulaşınca otomatik biter**, bir kez uzatılabilir, yeniden alınamaz | Kalkan **savunma içindir**, saldırı/büyüme başlayınca biter: §5.3 | [Travian destek](https://support.travian.com/en/support/solutions/articles/7000060689-beginner-s-protection) · [fandom](https://travian.fandom.com/wiki/Newbie_protection) (arama özeti) |
| **EVE kurumları** | Yeni oyunculara başlangıç paketi (birkaç düzine gemi) ve kayıpta bedava yenileme veren kurumlar var | Veteranlar yeni oyuncuyu **işe alır**, çünkü kalabalık güçtür (§5.4) | [Steam: EVE recruitment](https://steamcommunity.com/app/8500/discussions/1/1727575977569297763/) (arama özeti) |
| **FFXIV Mentor** | Mentor + yeni/geri dönen oyuncu birlikte oynayınca **iki taraf da +%50 XP**; Mentor unvanı ve kozmetik ödüller; ama "mentor boosting" hizmetleri satılıyor | **İki yönlü fayda**, ödül kozmetik; **ödül sonuca bağlı olmalı** (FFXIV'de sürekli oyun süresine bağlı olduğu için ticari boost'a açık). §5.4 | [FFXIV EXP Bonus](https://ffxiv.consolegameswiki.com/wiki/EXP_Bonus) · [Kotaku](https://kotaku.com/final-fantasy-xiv-battle-mentor-roulette-1851478857) · [boost hizmeti örneği](https://skycoach.gg/final-fantasy-xiv-boost/products/battle-mentor-7651) (arama özeti, doğrudan okunmadı) |
| **Guild Wars 2 Mentor** | Mentor rozeti, sohbet unvanı ve parti için şehirde %5 hız; **güç ya da altın kazandırmaz**, ücretsiz | Rehber etiketi **yalnız kimlik**: §5.4 | [GW2 Wiki: Pact Mentor](https://wiki.guildwars2.com/wiki/Pact_Mentor) |
| **WoW Rested XP** | Önce "uzun süre oynayana ceza"; sonra **aynı matematik, bonus olarak sunuldu** ("her şey 2 kat XP istesin, dinlenmeye 2 kat verelim"); oyuncular cezayı nefretle, bonusu sevgiyle karşıladı | Yetişme mekaniklerinde **çerçeve**: ceza değil bonus ("ilk gün daha hızlı", "dönüşte özet"). Mekanik XP'ye değil **çevrimdışı birikime** uygulanır | [Psychology of Games](https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/) |
| **Türkiye oyuncusu** | Mobil oyuncuların %78'i; tür tercihinde strateji %33; %57'si oyunda para harcamaz, %75'i **ödüllü reklam** izlemeyi ödemeye tercih eder; yaş dağılımı 30–49 grubunu da kapsar | Ücretli hızlandırma Türkiye'de zaten düşük dönüşüm + yüksek güven kaybı riski (§5, tuzak T4) | [Mobidictum](https://mobidictum.com/tr/turkiyedeki-mobil-oyuncular-kimler-ve-zamanlarini-nasil-geciriyorlar/) · [CHIP Online](https://www.chip.com.tr/guncel/turkiye-oyun-sektoru-2025-raporu-yayinlandi-dijital-stratejiler-one-cikiyor_178396.html) (arama özeti) |

**Kutu: bilinçli reddedilen karakter ustalık sistemleri.** Aşağıdakiler incelendi ve **alınmadı**; neden alınmadığı tabloda:

| Sistem | Ne yapıyor | Neden bizde yok |
|---|---|---|
| **Albion Destiny Board** | Her eylem ilgili düğüme "fame" akıtır; mastery 20/100/120; düğüm başına ayrı uzmanlık; yüzlerce saat; "bir ya da iki eşyaya odaklan" ([Albion Codex](https://www.albioncodex.com/guides/albion-online-destiny-board-planning)). Learning Points ile atlama **Premium** (ücretli) ([Albion Guidebook](http://albionguidebook.blogspot.com/2016/10/destiny-board-learning-points.html)) | Karakter gücü zamanla birikir, geç gelen **saat farkını** kapatamaz; "LP" ücretli hızlandırmadır (T4) |
| **RuneScape beceri ustalığı** | 99. seviye = ustalık (13.034.431 XP), "trimmed" pelerin, sanal seviyeler 120/150 | Saf zaman biriktirme ve görsel statü; bizim "ilk" başarımlarımız ve itibar eksenimizle çakışır ([RS Wiki](https://runescape.wiki/w/Skill_mastery), [sanal seviye](https://runescape.wiki/w/Virtual_levelling)) |
| **Ultima Online beceri tavanı** | 700 toplam puan, beceri başına 100; tavanda kullanılmayan beceri **çürür** | Doğal sınır fikri güzel ama **çürüme = angarya**; bizde sınır sermaye ve dikkat ([UO King](https://www.uoking.com/guides/skill-system)) |
| **Eco uzmanlık maliyeti** | Her yeni uzmanlık bir öncekinden üstel pahalı: 0, 0, 5, 15, 50, 100, 300, 500 puan | Mekanik güzel (işbirliğine zorlar); ama bu **beceri puanı** sistemidir. Aynı etki bizde ortak havuz + makas + dışlayan dallarla ([Eco Wiki](https://wiki.play.eco/en/Specialties), arama özeti) |

Ortak ders: **her oyun "doğal sınırı" ve "yetişme yolunu" ayrı ayrı çözmek zorunda kalmış.** Strateji oyununda doğal sınır sermaye, dikkat ve ortak kaynaklardır; yetişme yolu ekonomik araçlardır (§4, §5).

**Kutu: oyuncu motivasyonu çerçevesi.** Öz-belirleme kuramı video oyununun çekiciliğini üç ihtiyaca bağlar: **özerklik, yeterlilik, ilişki** ([Przybylski, Rigby, Ryan 2010](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf)). Burada karşılığı: özerklik = kilitsiz açılış ve geri dönüşlü seçim (§3); yeterlilik = ilk satış, ilk sözleşme ve net geri bildirim (§2); ilişki = ilçe, sicil ve Rehberlik (§5).

---

## 2. İlk 60 saniye / 10 dakika / saat / gün / hafta yolculuğu

### 2.1 İlkeler

| # | İlke | Dayanak |
|---|---|---|
| Y-İ1 | **İlk eylem ≤ 30 sn.** Karakter ilk 25–45. saniyede çarşıda hareket eder | rolearn: tycoon ilk 30 sn; Roblox |
| Y-İ2 | **Her adım tek kavram öğretir.** Aynı anda iki yeni kavram yok | Albion "az metin"; Roblox |
| Y-İ3 | **Rehberli ama zorunlu değil:** Esnaf Defteri tek aktif ana kart + en çok 2 isteğe bağlı kart; **modal pencere yok**; Atla/Kapat kalıcı (hesaba yazılır) | Factorio "mesaj kutusu yok"; Hay Day şikâyeti |
| Y-İ4 | **Her adımın haritadan karşılığı var** ("Haritadan git"); yürüyüş yalnız adaptasyon | §0.3 |
| Y-İ5 | **Hiçbir yanlış seçim kilitlemez.** İlk 72 saatte pişmanlık penceresi | §3.3, Stardew |
| Y-İ6 | **İlk gelir ilk 10 dakikada.** Hasadı beklemeden satılabilir bir şey olsun (başlangıç gıda stoku) | Big Ambitions ilk iş; rolearn |
| Y-İ7 | **Ödül küçük ve bilgi/malzeme ağırlıklı;** günlük seri yok (K13) | 11 §7.1 |
| Y-İ8 | **Gün-3 duvarı:** ikinci–üçüncü saatte yeni bir karar türü açılır | rolearn |

### 2.2 Yolculuk tablosu

Süreler hedeftir; yürüyüş hızı ≈6 m/s (öneri, [Capital Rift İ5](capital-rift-mekanikleri.md)). "Kod" sütunu, adımın bugünkü çekirdek karşılığını gösterir.

| Zaman | Sahne ve mekân | Oyuncu ne yapar | Öğretilen **tek** kavram | Esnaf Defteri kartı | Başarı sinyali | Kod karşılığı |
|---|---|---|---|---|---|---|
| **0:00–0:10** | Giriş (tek dokunuş: Google ya da e-posta bağlantısı) | Takma ad (öneri hazır gelir, değiştirilebilir). Kayıt formu yok | — | — | Küre → il → ilçe uçuşu başlar | Better Auth (F1); `oyuncu_katil` |
| **0:10–0:25** | **Yerleş ekranı** | 3 ilçe kartından birini seçer: ad, imza ürün, "neden" cümlesi, doluluk (%), önerilen açılış (§3) | **Yer:** her ilçe farklıdır | — | Tek dokunuşla seçim; geri alınabilir ("başka ilçe öner") | Yerleş ekranı (F4); ilçe doluluğu `IlceDurumu` |
| **0:25–0:45** | **İlçe çarşısı** (OSM meydan ya da ilçe merkezi); yanında **Muhtarlık** tabelası; NPC Muhtar | Kamera yere iner, karakter hareket eder. Muhtar NPC "Hoş geldin hibesi" belgesini verir; nakit hapında **₺50.000** | **Yer** pekişir: "buradasın, bu senin ilçen" | **Kart 1:** "Yurduna git" (yeşil yol çizgisi; "Haritadan git" düğmesi) | Nakit hapı belirir; çizgi görünür | `oyuncu_katil`: hibe `mulk.yeniOyuncu.hibe` = 50.000.000 mili (✓ uygulanıyor) |
| **0:45–1:00** | Çarşıdan **≤200 m** yurda yürüyüş | Yurt arsasının sınırına varır; hücreler "senin" mavisine döner | **Arsa:** sahiplik sınırı | Kart 1 biter, Kart 2 açılır | Mavi sınır; kısa nabız | **Bedava yurt (6 hücre) çekirdekte yok** (§5.1); bugün `parsel_al` ücretli |
| **1:00–3:00** | Yurt arsası; **yapı paleti** (önerilen tek yapı öne çıkar) | Tarla (ova ilçe) ya da ilçeye uygun yapıyı seçer; **hayaleti** yerleştirir; maliyet kartı "gereken / var" gösterir; onaylar | **Yapı ve maliyet** (kaynak "gereken/var") | **Kart 2:** "İlk yapını kur" | İnşa çubuğu 4 aşama + bitiş saati | `tesis_insa_hucre` (✓); 2 hücre, ₺6.000 + 30 çelik + 10 parça |
| **3:00–5:00** | Çarşıya dönüş (ya da Pazar paneli) | Başlangıç gıda stokunu (200 birim) satar: **ilk satış**; fiyatı ve "piyasadan ~%10 düşük sattın" notunu görür | **Satış ve fiyat** (makas) | **Kart 3:** "İlk satışını yap" | Nakit +₺ görünür; "ilk" başarımı | `ticaret_emri` (oran/saat); **`liman` etiketi şartı** (§2.4) |
| **5:00–10:00** | Çarşıda serbest dolaşma (isteğe bağlı): iş panosu, Muhtarlık, komşu arsa sahipleri | İnşa çubuğu bitmeye yaklaşır; oyuncu ister bekler ister ikinci yapıya bakar | **Zaman:** inşa süresi, "kapatsan da biter" | Kart 3'ün yan notu: "Çıkabilirsin, dönünce özet gösteririz" | İlk yapı ≈%80 | Erken oyun çarpanı %10 (✓): Tarla 2 sa × %10 = **12 dk** |
| **10:00–15:00** | Yurt | **İlk yapı biter** (✓ rozeti); üretim sayacı "+₺/saat" | **Üretim akışı:** yapı kendi başına çalışır | Kart 4: "Üretimin akıyor" | ✓ rozet + kısa nabız | `insaat_bitti` (✓); `insaatAsamasi` (✓) |
| **15:00–60:00** | Çarşıdaki **iş panosu** | İlk **sözleşme:** NPC esnaf siparişi (küçük, **teminatsız**, vade 3 gün) al; teslim et | **Sözleşme:** söz ver, zamanında teslim et (sicil başlar) | **Kart 5:** "İlk siparişini al" | Sipariş ödemesi; "Sicil: 1 teslim" | NPC iş panosu **çekirdekte yok** (§7, A6) |
| **İlk saat sonu** | Yurt + Dikkat paneli | İkinci yapı eşiği: 3 öneri kartı ("zinciri uzat", "ham madde ekle", "sat") | **Darboğaz** (▲ eksik girdi) | Kart 6: "Zincirini uzat" | İlk "Dikkat" maddesi | Dikkat paneli (F0) |

**Düğüm sayısı.** İlk saatte 5 yeni kavram (yer, arsa, yapı ve maliyet, satış ve fiyat, zaman) + 1 (sözleşme). Hepsi tek tek ve eylemle öğretilir.

### 2.3 İlk gün, ilk hafta

| Zaman | Ne olur | Öğretilen **tek** kavram | Not |
|---|---|---|---|
| **İlk gün (1–24 sa)** | Oyuncu çıkar ve **döner** → **dönüş özeti** ("sen yokken: +X üretim, +Y satış, 1 iklim olayı") | **Dünya sen yokken de işler** | Çevrimdışı üretim tembel stokla zaten var; özet ekranı yeni |
| İlk gün | 2–3 yapı daha (erken oyun çarpanı %10 ile 24 saat boyunca çok ucuz süre: Çelikhane 10 sa → **60 dk**) | **Zincir:** tahıl → gıda | Sınır para ve hücre; süre değil |
| İlk gün | Dikkat paneli ilk **▲ eksik girdi** | **Darboğaz okuma** | H4 (okunabilirlik) ile uyum |
| İlk gün | İklim takvimi bilgi kartı (örn. 1 Ekim: buğday ekimi, zeytin ve kestane hasadı etkin; fındık hasat dönemi dışında) | **İklim takvimi** | [Çeşitlilik §4.5](cesitlilik-uretim-katmanlari.md) "yumuşak pencere" önerisi |
| İlk gün | **Esnaf Defteri 5–7 hedef** (herhangi sırada): ilk yapı, ilk satış, ilk sözleşme, ikinci yapı, ilk zincir, komşu ilçeyi gör, ilk dönüş | Karma | Toplam defter ödülü ≤ **₺8.000** değerinde (hibenin ≈%16'sı), çoğu malzeme |
| **Gün 2–3** | **Komşu ilçe çarşısını gez** (hızlı seyahat yalnız kendi yapılarına; ilçeler arası yürüyüş ya da harita) | **İlçeler farklıdır** (imza ürün, coğrafya) | Capital Rift "başka yerlere gitti" adımının bizdeki karşılığı |
| **Gün 3–4** | NPC talep ritmi (pazar günü gibi gerçek takvim ritimleri; [11 ek karar](../11-urun-donusu.md)) | **Talep ritmi** | NPC müşteri talebi canlı dünya kararından |
| **Gün 4–5** | Ortak proje panosunda (Muhtarlık) **katkı** | **Ortak mal** | Alfa-0'da proje kataloğu sınırlı (Ü7) |
| **Gün 5–7** | İlk **teknoloji** düğümü (Atölye-Lab), bedeli açık yazılı | **Dallanma ve bedel** | Dışlayan dallar **onboarding'de sunulmaz** (TK4 geri dönüşsüz) |
| **Gün 7** | **İkinci perde kartı:** "Yönetmek ister misin? Savunmak ister misin?" (Devlet ve Askeri'ye hafif giriş: ilçe panosu, NPC baskınına karşı savunma) | **Yönetişim ve güvenlik** | Alfa-0'da NPC vali; oy yok. Tam yol Alfa-1 |
| **Gün 7** | Haftalık özet: portföy dağılımı, ilk "kâr/zarar", **kalkan geri sayımı** | **Portföy** | Yargılamayan özet; "yön önerisi" yok |
| **Gün 14** | Kalkan biter | — | Saldırı yapan (birlik üreten) oyuncunun kalkanı daha erken biter (§5.3) |

### 2.4 Bu akışın bugünkü kodla uyuşmayan yerleri

| # | Bulgu | Kanıt (dosya) | Etki | Öneri |
|---|---|---|---|---|
| B-1 | **Bedava yurt (6 hücre) çekirdekte yok.** `parsel_al` her zaman hazineden öder | `mulk/komut.ts` (`parselFiyati`, `hazineEkle(-fiyat)`); `yurtHucre` yalnız `veri/src/sema.ts:379` ve `tipler.ts:563`'te | İlk adım akışı ücretli arsa alımı olur; hibe 6.000 ₺ erir | `yurt_al` komutu ya da `parsel_al {yurt:true}` (§7 A2) |
| B-2 | **İlk 5 yapıda %30 indirim yok** | `ilkYapiIndirimPpm`, `indirimliYapiSayisi` yalnız şemada; `mulk/komut.ts` `maliyetiDus` indirimsiz | İlk yapılar %43 daha pahalı | `tesis_insa_hucre` içinde sayaçlı indirim (A3) |
| B-3 | **%20 ayrılmış hücre yok** | `ayrilmisHucrePpm` yalnız şemada | Geç gelenin "ucuz hücre" garantisi (H6 metrik 2) çekirdekte uygulanmıyor | Deterministik hücre-karma ile ayır (A4) |
| B-4 | **Kalkan 7 gün (kodda), 14 gün (belgede)** | `motor.ts:281` `ic.param.askeri.yeniOyuncuKorumasiGun` (= 7, `parametreler.json:77`); `mulk.yeniOyuncu.kalkanGun` (= 14) okunmuyor | H5 testleri iki farklı süreyi yansıtır | Tek kaynağa bağla (A1) |
| B-5 | **İlk satış `liman` etiketi arıyor** | `ekonomi/komut.ts:98–101`: `if (!b.etiketler.includes("liman")) return hata(...)`; işletme etiketlerini il merkezinden devralır (`mulk/isletme.ts`) | İl merkezi limansızsa **ilk satış reddedilir** (İzmit, Güney Marmara, Batı Karadeniz bölgelerinde `liman` var; il→bölge eşlemesi **doğrulanacak**) | Mülk kipinde yerel NPC alıma izin ver (A5) |
| B-6 | `ticaret_emri` **saatlik oran emridir** (`oranSaat`), tek seferlik "sat" değil | `tipler.ts:573` | "İlk satış" kullanıcı arayüzünde "X birim sat" olarak sunulur; arka planda oran emri | UI "sat" eylemi tek seferlik miktarı oran+süreye çevirir |
| B-7 | **İlk yapı süresi:** belgede ≈24 dk, kodda **12 dk** (Tarla `yapiInsaSaati`=2 sa, çarpan %10) | `parametreler.json:189–193`; `erkenOyun.ts` | 10 dakikalık hedef Tarla ile ≈12 dk'ya düşer | Hedef: "ilk yapı ≈12 dk, ilk satış ≤5 dk" |
| B-8 | **Tüccar yapıları yok:** Ambar, Garaj, Ticaret ofisi, Konut, Atölye-Lab, Muhtarlık, Ordugâh `yapiYuva` listesinde değil (17 tesis var) | `parametreler.json:183–188` | Tüccar açılışı yapısız kalır | Alfa-0'da Tüccar = ilk üretim + NPC pano + ticaret emri; tam yapı kümesi sonra |
| B-9 | **İklim takvimi başlangıcı:** `baslangicGunu`=273 (1 Ekim) | `parametreler.json:86` | Alfa-0 fındık, çay, kayısı hasat dönemlerinin dışında açılır | Yerleş kartında "bu dönemde etkin ürün" etiketi (§3.4) |

---

## 3. Yönelim: sınıf seçtirmeden yön sunmak

### 3.1 Açılış kartları (3 + 1 sonraki)

"Açılış" satrançtaki gibi bir **başlangıç önerisidir**: ilk 3 yapı ve ilk 3 hedef. Seçim yoktur: oyuncu bir ilçe seçer; ilçenin coğrafyası ve imzası hangi açılışın önerildiğini belirler; oyuncu dilediğini yapar. Kilit, rol seçimi ve kaybedilen seçenek yoktur.

| Açılış | Kime uygun | İlk 3 yapı (öneri) | İlk hedefler | Kendi kendine yeter mi? | Risk |
|---|---|---|---|---|---|
| **Tarım** (ova, vadi, yayla) | "Ekeyim, biçeyim, satayım"; en sakin | Tarla ×2 → Ahır ya da Mera → Gıda fabrikası | İlk hasat, tahılı sat, ahırla gıda + gübre | **Evet:** `geleneksel_tarim` girdisiz (yalnız bakım parçası); `ahir_besi` tahıldan gıda ve gübre | İklim olayı; ilçede çok Tarla → fiyat düşer |
| **Sanayi** (kıyı, havza, sanayi ilçesi) | "Zincir kurmak, ölçek büyütmek" | Santral → Maden ya da Silis ocağı → Çelikhane | İlk elektrik, ilk ham mal, ilk çelik | **Hayır:** `yuzey_cevher`, `yuksek_firin`, `standart_parca` elektrik ister; çelik cevher + kömür ister; damar yoksa ithalat | Soğuk başlangıç; il merkezinde damar yoksa yapı reddedilir (`gerekliRezerv`) |
| **Pazar** (liman, çarşı, kavşak ilçesi) | "Al-sat, sözleşme, fiyat farkı" | İlk üretim (en yakın) + ticaret emirleri + NPC pano siparişleri | İlk satış, ilk sözleşme, fiyat farkı keşfi | **Kısmen:** üretim yapılarına ihtiyaç var; Ambar/Ticaret ofisi yok (B-8) | Alfa-0'da arbitraj imkânı düşük (tek küresel NPC pazar, makas ~%20) |
| **Kamu: Devlet ve Askeri** (sonraki) | "Yönetmek, savunmak" | Muhtarlık panosuna katkı; savunma yapısı; NPC baskınına hazırlık | İlk ortak proje, ilk savunma | **Hayır:** ancak üretim tabanından sonra | Alfa-0'da NPC vali, seçim yok; ilk gün **sunulmaz**, 7. günde ikinci perde |

**Neden "Kamu" ilk gün yok?** (1) Alfa-0 kapsamı al → kur → üret → sat; seçim ve oyuncu savaşı Alfa-1 ([11 §6](../11-urun-donusu.md)). (2) Muhtar adaylığı için ilçede yapı sahibi olmak gerekir ([11 §7.6](../11-urun-donusu.md)); Ordugâh mühimmat + gıda ister. (3) Strateji oyunlarında yönetim, ancak yönetilecek bir şey (varlık) varken anlam kazanır.

### 3.2 Başlangıç sepeti: açılışlar arası eşitlik

Bugünkü kit (**çelik 120, parça 40, gıda 200**; `parametreler.json:197`) taban fiyatla ≈ **₺35.600** (gıda 200×₺70 = 14.000; çelik 120×₺120 = 14.400; parça 40×₺180 = 7.200). Kit tek bir sepet olduğu için Tarım açılışına kayıtlı: **Tarla** (30 çelik + 10 parça) kitle 4 kez kurulur (ya da 2 Tarla + 1 Ahır: 40/15 ile toplam 100 çelik / 35 parça); **Sanayi** açılışında kit tek bir büyük yapıyı karşılar (Çelikhane 100/40 parçayı bitirir; Elektronik 100/50 **hiç karşılanmaz**) ve işlemek için ham mal yoktur.

| Sepet (öneri) | İçerik (aynı taban değer ≈ ₺35.600) | Hangi açılışa | Not |
|---|---|---|---|
| **Çiftlik sepeti** (mevcut) | çelik 120, parça 40, **gıda 200** | Tarım | Gıda hemen satılır → ilk satış 3–5. dakikada |
| **Atölye sepeti** | çelik 120, parça 40, **cevher 150 + kömür 100 + yakıt 60** (≈ ₺14.250 = 150×35 + 100×30 + 60×100) | Sanayi | İlk çelik için ham mal kitten gelir; santral elektriği yine ister |
| **Çarşı sepeti** | çelik 120, parça 40, **gıda 100 + tahıl 100 + yakıt 40** (≈ ₺14.000) | Pazar | Üç ayrı mal → fiyat farkını görmek için |

Oyuncu sepeti **kimliğin değil, ilk hamlenin** parçası olarak seçer; ilk 72 saatte pişmanlık penceresi kapsamındadır. Sepet seçimi yoksa varsayılan, ilçe önerisinin açılışıdır. **Kalibrasyon sorusu:** Sanayi açılışı 6 hücreyle (santral 3 + maden 2 + çelikhane 3 = 8; kömür ocağı dahil 10) çalışmaz; ya yurt 8 hücre olsun ya da Sanayi açılışı iki aşamalı olsun (önce Santral + Silis ocağı, çelik zinciri ilk gün sonunda).

### 3.3 Yön değiştirmenin maliyeti: yeniden yatırım merdiveni

| Kademe | Eylem | Maliyet (öneri) | Mevcut / yeni | Alfa |
|---|---|---|---|---|
| 1 | **Yöntem değiştir** (aynı yapı, farklı yöntem: geleneksel → mekanize, vb.) | Küçük/yok; kısa durma | `yontem_degistir` ✓ | Alfa-0 |
| 2 | **Yapıyı yık / dönüştür** | Para ve malzemenin **%50** iadesi (ilk 14 günde **%70**); iadeden **aşınma** düşülür (S3) | Yeni `tesis_yik` (bugün yalnız `insaat_iptal` %50, yalnız süren inşaat) | Alfa-0 (M) |
| 3 | **Hücre bırak** | Taban değerin **%70**'i iade; hücre yeniden satılığa çıkar, `satilmisHucre` düşer | Yeni `parsel_birak` | Alfa-0 (M) |
| 4 | **Başka ilçede yeni işletme** | Hücre fiyatı; **yeni işletme başlangıç kiti almaz** (`isletmeAl` yalnız ilk işletmeye kit verir ✓); eski varlıklar korunur | `parsel_al` + `isletmeAl` ✓ | Alfa-0 |
| 5 | **Pişmanlık penceresi** | İlk **72 saatte** ilk 3 yapının yıkımı **%100 iade**, bir kez, en çok ₺20.000 | Yeni parametre | Alfa-0 (S) |
| — | **Teknoloji dışlayan dal** (hassas ⊕ organik, temiz ⊕ termik) | Geri dönüşsüz (TK4); v1.5 `dal_degistir` ×2 | 08 §4 | **Onboarding'e girmez**, gün 5'ten sonra, bedelli açık metinle |

İlke: **yön değiştirme maliyeti "yatırımın %30–50'sini kaybetmek" olmalı, "oyundan atılmak" olmamalı** (Stardew'de profesyon sıfırlama 10.000 altın, [kaynak](https://www.thegamer.com/stardew-valley-how-find-statue-uncertainty-change-profession/)). Arazi vergisi (%1/hafta) ve boş arsa zaten kullanılmayan arsayı yük yaptığı için "bırak" kapısı spekülasyon değil çıkış kapısıdır.

### 3.4 İlçenin imzası ve coğrafyası yönelimi nasıl etkiler

**Bugün çekirdekte (kanıt):** yapı izni **il merkezi bölgesinin etiketine ve rezervine** bağlı (`ova`, `dag`, `liman`, `kiyi`; `gerekliRezerv`); işletme bunları devralır (`mulk/isletme.ts`). Örnek: `izmit` = kıyı, liman, ova; rezerv tahıl ve silis (cevher, kömür, petrol yok); `guney_marmara` = kıyı, liman, ova; tahıl ve kömür; `bati_karadeniz` = kıyı, liman, dağ; kömür 360 (`packages/veri/haritalar/gercek-karadeniz.json`). **İl→bölge eşlemesi (Kocaeli, Sakarya, Bursa) bu turda doğrulanmadı.** Arazi sınıfı (kırsal/kasaba/şehir) yalnız fiyatı değiştirir. **İlçe imzası çekirdekte yok.**

**Öneri (veri tarafında):** her ilçeye `etiketler` (ova, kıyı, dağ, liman) ve `imza[]` eklenir ([çeşitlilik raporu §4](cesitlilik-uretim-katmanlari.md): `il-imza.json`, elle küratörlü kısa liste); yapı izni ilçe etiketine, imza çıktısı +%10'a bağlanır. Yerleş ekranı bu verilerle açılış önerir:

| İlçe örneği (Alfa-0 illeri) | İmza (çeşitlilik raporundan; ikincil kaynak) | Önerilen açılış | Bu dönemde (1 Ekim) etkin mi? |
|---|---|---|---|
| Kocaeli: Kandıra | Manda yoğurdu, karpuz; ormanlık kıyı | Tarım (Ahır) + odun | Süt ürünleri evet |
| Kocaeli: Körfez, Gebze | Rafineri, otomotiv, karton | Sanayi (zincir sonra) | Evet (sanayi dönemden bağımsız); Alfa-0'da rafineri/otomotiv zinciri 18 yapıda yok (Ü5) |
| Sakarya: Karasu, Hendek | Fındık | Tarım (bahçe) | **Hasat dönemi dışı (Ağustos–Eylül)**; kartta "ekim/bakım dönemi" etiketi |
| Sakarya: Adapazarı, Hendek ovaları | Mısır | Tarım | Evet (hasat Eylül sonu–Ekim) (tahmin) |
| Bursa: Gemlik | Gemlik zeytini (AB tescilli), liman | Tarım + Pazar | **Evet** (sofralık Ekim–Kasım, yağlık Kasım–Ocak) |
| Bursa: İnegöl | Mobilya, kereste | Sanayi (hafif) | Evet |
| Bursa: Karacabey, M.Kemalpaşa | Şeftali, soğan, siyah incir | Tarım | Dönem kısmen dışında |

**Yerleş skoru (öneri):** `skor = 0,35·düşük doluluk + 0,25·imza-açılış uyumu + 0,20·bu dönemde etkin ürün + 0,10·kalan ayrılmış hücre + 0,10·çarşıya yakınlık`. 3 ilçeden en az biri "yoğun", en az biri "sakin" olsun; **tek ilçeye yığılmayı** önler (R-Ü6 "boş dünya": davetli ≤200 kişi, ~40 ilçe; ilçe başına ≈5 kişi).

---

## 4. Stratejik uzmanlaşma (ustalık kademesi yerine)

### 4.1 Uzmanlık nerede görünür

| Gösterge | Veri (çekirdekten saf türetim) | Nerede görünür | Servet sızdırır mı? |
|---|---|---|---|
| **Katman yuva payı** | Σ yuva (katman) / Σ yuva | Esnaf Kartı halka dilimi | Hayır (yuva, değer değil) |
| **Zincir tamlığı** | Kendi çıktısını kendi yapısında girdi olarak tüketen yapı çiftleri | Esnaf Kartı "zincir" satırı | Hayır |
| **İlçe/il yayılımı** | Yapı sahibi olunan ilçe sayısı | Esnaf Kartı | Hayır |
| **Pazar payı** | Bir malın ilçe/il toplam üretiminde pay | İlçe panosu "üretim payı" sıralaması | Hayır (hacim, değer değil) |
| **Sicil** | Teslim edilen/geciken sözleşme sayısı (§5.5) | Esnaf Kartı "Sicil: 12 teslim, 0 gecikme" | Hayır |
| **Makam** | Muhtar/vali/komutan | Tabela + ilçe levhası | Hayır |
| **Profil etiketi (türetilmiş)** | Çiftçi/Sanayici/Tüccar/Muhtar/Komutan ([11 §7.6](../11-urun-donusu.md)); örn. Çiftçi: Tarım yuva payı ≥ %60; Karma: hiçbiri ≥%60 ve ≥2 katman ≥%25 | Ad etiketi | Hayır |

**Tüm göstergeler saf fonksiyonla durumdan hesaplanır** (`durumOzeti`'ne girmez, determinizmi etkilemez). Servet halkası, "en zengin" sıralaması, net değer renkleri **yoktur** (Capital Rift riski H4: servet göstergesi hedef tahtası olur; [§5](capital-rift-mekanikleri.md)).

### 4.2 Uzmanlaşmayı ödüllendiren mekanizmalar ve doğal sınırlar

| Mekanizma | Uzmanı ödüllendirir | Çeşitlendireni ödüllendirir | Durum |
|---|---|---|---|
| **NPC pazar makası** (ithalat ×1,1, ihracat ×0,9; makas %20 [`parametreler.json` pazar]) | Zincirini kendi içinde kapatan her adımda ≈%20 kazanır | Çeşitlendiren, her ara malı pazardan alırsa makası öder | ✓ çekirdekte |
| **Kümelenme / OSB "Sanayi Adası"** (ardışık kademeler bonus) | Aynı adada ardışık zincir | — | Öneri ([çeşitlilik §5.4](cesitlilik-uretim-katmanlari.md)) |
| **İmza çıktı bonusu** (+%10, öneri) | İlçenin imzasını üreten | — | Öneri |
| **Teknoloji dışlayan dallar** (hassas ⊕ organik, temiz ⊕ termik) | Dalın bölgesel kazananı | Dallardan yalnız birine kilitli | 08 TK4 |
| **İlçe imar payı + yasalar** (tarım/sanayi/konut yuvaları; `tarim_koruma`, `sanayi_tesviki`) | Yasanın desteklediği portföy | Yasa değişince risk dağılır | 11 §7.6, Alfa-1 |
| **Risk çeşitlendirme** (iklim olayı, fiyat dalgası, damar tükenmesi) | — | **Çeşitlendiren** iklim şoku ve tükenmeye karşı korunur | ✓ (iklim, S5) |
| **İtibar/sicil** (teminat) | Aynı mal çevresinde tekrarlı sözleşme sicili | — | Öneri (§5.5) |

**Doğal sınırlar (tek oyuncu her şeyde en iyi olamaz):**

| Sınır | Değer | Kaynak |
|---|---|---|
| İlçede hücre | ≤ 72 ve ilçenin ≤ %25'i | `mulk.ilceHucreTavani`, `ilcePayTavaniPpm` ✓ |
| Eş zamanlı inşaat | 2 | `esZamanliInsaat` ✓ |
| Eş zamanlı araştırma | 2 yuva; bütçe ≤ %50 | 08 TK2, D5 |
| Arazi vergisi | %1/hafta (arazi değeri) | `araziVergisiHaftalikPpm` ✓ |
| Bakım ve aşınma | Her yapıda sürekli gider (S3) | 08 §2 |
| Ortak havuz | İşgücü, elektrik şebekesi, kirlilik, damar (il/ilçe) | 11 §7.5 |
| Dikkat | Dikkat paneli ≤ 5 madde; günde 1–2 kısa ziyaret yeter | 11 §7.1 |
| Makam | İlçe başına 1 muhtar | 11 §7.6 |
| Hesap | Kişi başına tek hesap | 11 §10 |

Bir ilçede 72 hücre ≈ 36 Tarla ya da 24 Çelikhane tavanıdır. **Bir oyuncunun çok katmanlı olması engellenmez** (hibrit meşrudur); engelleyen şey, her katmanda **aynı anda yeterli sermayeye, dikkate ve ortak havuza** sahip olmanın imkânsızlığıdır.

### 4.3 Hibrit oyuncu

| Boyut | Uzman portföy | Hibrit portföy |
|---|---|---|
| Makas | Zinciri kapatır, makasları cebinde tutar | Makası öder (alt zincirleri satın alır) |
| İmza/kümelenme | Bonus alır | Almaz ya da kısmen |
| Risk | İklim, fiyat ve damar şokuna **açık** | Şok **dağılır** |
| Teknoloji | Dalda derinleşir | Dışlayan dalda tek yön seçmek zorunda; çok katmanda yöntem açma ağır |
| Dikkat | Az katman, az karar | Çok katman, çok Dikkat maddesi |
| Makam | Bir katmanın çıkar grubunun adayı | Kimseye bağlı olmayan aday |

Beklenen sonuç (hipotez Y5, §8): **hiçbir portföy tipi tüm ilçe sınıflarında baskın değil**; bu zaten H1'in portföy ifadesidir ve bot ölçümü hibrit arketipi (üretim + zincir + pazar) içermelidir.

### 4.4 Askeri ve Devlet'te uzmanlaşma

| Alan | Uzmanlık nerede görünür | Alfa |
|---|---|---|
| **Askeri** | Ordugâh (3 yuva), mühimmat zinciri, il komutanlığındaki birlik havuzu, savunma yapıları | Alfa-0: ordugâh + NPC eşkıya (PvE); Alfa-1: oyuncu savaşı |
| **Devlet** | Muhtarlık/valilik, ilçe panosu kararları, yasa seçimi | Alfa-1 (Alfa-0 NPC vali) |
| **Ortak** | İlçe seviyesi katkısı, ortak proje kitabesi | Alfa-1 |

Bu iki alanda da "rütbe" yoktur: **Komutan** = ordugâh sahibi; **Muhtar/Vali** = seçilmiş.

### 4.5 Görünür kimlik

| Öğe | Açıklama | Maliyet |
|---|---|---|
| **Tabela** | 2–24 karakter ad, 12 renk × 8 simge, ad ve bağlantı/hakaret filtresi ([Capital Rift madde 8](capital-rift-mekanikleri.md)) | S–M |
| **Yapı silueti** | Katmana göre bina dış görünümü (tarla çiti/ahır/baca); yürüyüşte ve L3'te ayırt edilir | M (F5 + F4) |
| **Esnaf Kartı** | Profil sayfası: katman halkası, zincirler, ilçeler, sicil, makam. **Servet yok** | S |
| **İlçe levhası** | "İlçenin en büyük üreticileri" (üretim payı); haftalık güncel | S |
| **Karakter görünümü** | Yalnız kozmetik seçim; **ilerleme taşımaz** (rütbe giysisi yok) | — |

Karakterin ustalık giysisi, rozet ya da unvan zinciri **yoktur**. Kimlik, kurduğun şeydir.

### 4.6 Ü8 (uzmanlaşma çarpanı) için öneri

[11 Ü8](../11-urun-donusu.md): "Uzmanlaşma çarpanı (×1,5) Alfa-0'da açık mı?" Öneri: **Hayır ve kaldır.** Çarpan bir beceri puanı sistemidir (Eco); bizde aynı işi ortak havuz, makas ve dışlayan dallar yapar. Açık kalırsa "yeni yapı pahalanır" olarak okunur ve **yeni oyuncunun ikinci katmana girmesini** (ki yön değiştirmeyi kolaylaştırmaya çalışıyoruz) cezalandırır.

---

## 5. Yeni oyuncu / ilerlemiş oyuncu dengesi

### 5.1 Paket: belgede, parametrede, kodda

| Öğe | Değer (belge) | `parametreler.json` | Çekirdek uygular mı | Not |
|---|---|---|---|---|
| Hibe | ₺50.000 | `mulk.yeniOyuncu.hibe` = 50.000.000 | **Evet** (`motor.ts:265–268`) | |
| Başlangıç stoku | çelik 120, parça 40, gıda 200 | `baslangicStok` | **Evet**, yalnız oyuncunun **ilk** işletmesine (`mulk/isletme.ts`) | Başka ilçeye gidince kit yok |
| Bedava yurt | 6 hücre | `yurtHucre` = 6 | **Hayır** | B-1 |
| İlk yapı indirimi | ilk 5 yapıda %30 | `ilkYapiIndirimPpm`, `indirimliYapiSayisi` | **Hayır** | B-2 |
| Ayrılmış hücre | %20 | `ayrilmisHucrePpm` | **Hayır** | B-3 |
| Kalkan | 14 gün | `kalkanGun` = 14; ama `askeri.yeniOyuncuKorumasiGun` = 7 | **Kısmen** (yalnız 7) | B-4 |
| Erken oyun inşa hızı | — | `erkenOyun`: ilk 24 sa süre %10; 168. saatte %100 | **Evet** (`erkenOyun.ts`) | Geç katılan **kendi katılımından** sayar ✓ |
| Teknoloji yayılımı | Geç gelenin araştırması ucuz | `teknoloji.yayilimIndirimiPpm` | **Evet** (TK3; 08) | |

Bot ölçümü (A0-8 H6) "geç katılan" arketipini **tam paketle** koşacağını varsayıyor ([H6](../olcum/h1-h9-parsel-tanimlari.md)): çekirdek 4 öğeyi uygulamadan H6 sonucu paketin **yalnız yarısını** ölçer. Önce uygula, sonra ölç.

### 5.2 ₺50.000 hibe ne alır?

Taban değerler (çelik ₺120, parça ₺180, gıda ₺70/birim; `icerik.json`).

| Kalem | Tutar | Not |
|---|---|---|
| Hibe | ₺50.000 | |
| Başlangıç kiti | ≈ ₺35.600 | gıda 14.000 + çelik 14.400 + parça 7.200 (taban değer) |
| **Toplam başlangıç değeri** | **≈ ₺85.600** | |
| Kırsal hücre | ₺1.000 (kasaba 2.500; şehir 6.500) × (1 + 2·satılmış/uygun) | ilçe %25 doluysa ₺1.500 |
| Tarla (2 hücre) | ₺6.000 + 30 çelik + 10 parça; ilk 5 yapıda %30 → ₺4.200 | 12 dk |
| Ahır | ₺8.000 + 40/15 | 4 sa × %10 = 24 dk |
| Gıda fabrikası | ₺10.000 + 60/20 | elektrik ister (`standart_gida_isleme`) |
| Çelikhane | ₺20.000 + 100/40 | 10 sa × %10 = 60 dk |
| Elektronik | ₺20.000 + 100/**50** | **Kit yetmez (parça 40)**; ilk saatte kilitli kalır |

**Örnek harcama (Tarım açılışı, ova ilçe, 6 yurt hücre bedava, ilk 5 yapıda %30):** 2 Tarla (₺8.400) + 1 Ahır (₺5.600) = **₺14.000**; kit kalanı 20 çelik + 5 parça + 200 gıda; **nakit ≈ ₺36.000** kalır. Bu para ilk haftanın tamamını yürütmeye ve 2–3 yapı eklemeye yeter, ama **israf yoluna da açıktır** (örn. 3 Çelikhane): Esnaf Defteri bunu önermez, engellemez.

Dengeye iki bakış:
- **Yeterli mi?** 4 Tarla + 1 Ahır + 1 Gıda fabrikası + ham mal alımı kalem kalem hibe içinde. Hibenin tek başına bir fabrika zincirini (Sanayi) kurmaya yetmemesi, Sanayi'nin zor açılış olduğunun göstergesi (§3.2).
- **Çok mu?** 72 hücre ve %25 ilçe payı sınırı olmasa 50 hücre alınabilir (artımlı fiyat + vergi bunu zaten engeller). Hibe **spekülasyon aracı olmamalı**: 14 gün içinde hücre sayısı ilk yapıların hücrelerinden fazla ise uyarı (hesap kuralı değil, Esnaf Defteri notu).

### 5.3 Yetişme mekanikleri (strateji oyununa uygun olanlar)

| # | Mekanik | Neye yarar | Durum | Benzer örnek |
|---|---|---|---|---|
| Y1 | **İlk 24 saatte inşa süresi %10** (168. saatte %100); geç katılan kendi katılımından sayar | Hızlı kurulum; ilk saat "boş" kalmaz | ✓ çekirdekte | WoW rested **çerçevesi** (bonus gibi sun) |
| Y2 | **Hibe + başlangıç kiti** | Zarar etmeden ilk gelir | ✓ (kit yalnız ilk işletmeye) | Anno iflas şikâyeti |
| Y3 | **Bedava yurt + hazır arsa adaları** | Arsa seçme yükü yok; çarşıya ≤200–400 m | Parametre var, uygulanmıyor | Upland "Fair Start" |
| Y4 | **İlk 5 yapıda %30 indirim** | İlk yapıları ucuzlatır | Parametre var | Albion Journal ödülleri |
| Y5 | **%20 ayrılmış hücre** (hesap <14 gün ya da servet < medyanın ¼'ü) | "İlçeler kapıldı" korkusuna panzehir | Parametre var | Upland, Anno |
| Y6 | **Kalkan 14 gün; saldırı yapınca biter** (birlik üretimi/ordugâh kurma/savaş ilanına katılma) | Savunma, büyümeyi cezalandırmaz | Kısmen | Travian (nüfus 200 ya da ikinci köyde biter) |
| Y7 | **1:5 servet oranı** (saldırıya uygun hedef) | Güç farkı kalkanı | 11 §7.7 | OGame |
| Y8 | **Ayrılmış sipariş kotası:** NPC pano siparişlerinin ≥%30'u hesap <30 gün için | İlk sözleşmeler ilk haftada bulunur | Öneri | Ayrılmış hücre ile aynı mantık |
| Y9 | **İlk sözleşmede teminat yok** (≤₺2.000, vade 3 gün) | İlk söz kolay | Öneri | EVE kariyer ajanı |
| Y10 | **Teknoloji yayılımı** (olgun dünyada çoğu teknolojiyi bilenlerin yarı fiyatı) | Yöntem yetişmesi | ✓ (TK3) | Victoria 3 |
| Y11 | **Dönüşte özet + çevrimdışı birikim 48–72 sa tavanlı** | Sık giremeyen oyuncu geride kalmaz | Çevrimdışı üretim ✓; özet yeni | WoW rested (**bonus çerçevesi**) |
| Y12 | **Azalan getiri / artan bakım**: 72 hücre, %25, artan arazi bakımı | Yayılan veteran büyüdükçe pahalıya ödeme | ✓ kısmen | Rust bakım kademeleri |
| Y13 | **Ücretli hızlandırma yok** (K13) | Güven | Karar | Albion LP **Premium** (kaçınılacak) |

**Çerçeve dersi (WoW).** Aynı matematik, "ceza" ya da "bonus" diye sunulunca farklı karşılanır. İlk 24 saat hızlı inşa bir **bonus** gibi ("hoş geldin hızı"), 25.–168. saatte lineer olarak normale dönüş **ceza gibi hissettirilmemeli**: arayüzde "süre çarpanı" yerine "ilk gün: bu yapı 12 dk" gibi somut metin.

### 5.4 İlerlemiş oyuncunun yeni oyuncuyu ezmek yerine işe alması

**Alfa-0'daki ezme vektörleri** (hangi tehditler gerçek?):

| Vektör | Alfa-0'da var mı | Koruma |
|---|---|---|
| Hücre istifi | Evet | ≤72, ≤%25, %1 vergi, artan bakım, %20 ayrılmış |
| Fiyat kırma (tek NPC pazar: oyuncular arası fiyat savaşı **yok**) | **Hayır**: pazar NPC emilim/arz fiyatlı; veteran yalnız arzı artırır, herkesin fiyatı düşer | Oyuncular arası defter v1.5'te; o zaman fiyat bandı |
| Ortak havuz (işgücü, elektrik) | Evet | İl düzeyi yaklaşık; ağır istismar yok |
| Savaş | Hayır (Alfa-1) | 14 gün kalkan, ≥49 saat ara, parsel asla el değiştirmez |
| Muhtar vergisi | Hayır (Alfa-0 sabit %1) | Alfa-1: kalkan boyunca vergi bandının üstü uygulanmaz |

Yani Alfa-0'da asıl risk **kızdırmak değil kaçırmak**: yeni oyuncunun ilk saatte "bir şey yok" diye çıkması.

**İlerlemiş oyuncunun yeni oyuncudan kazandığı (yapısal, ücretsiz):**

| Kazanç | Mekanik | Kaynak |
|---|---|---|
| **İlçe gelişim seviyesi:** Kasaba eşiği nüfus 5.000 **ve ≥ 10 sahip** | Yeni sahipler ilçeyi M ölçeğe taşır; herkes kazanır | 11 §7.4 |
| **NPC talebi ve işgücü havuzu** nüfusla büyür | Veteranın satışı ve işgücü arzı artar | 11 §7.5, 08 D1 |
| **Girdi tedariği:** yeni oyuncunun çıktısı (tahıl, silis) veteranın girdisi | Tedarik sözleşmesi, makas yerine sözleşmeli fiyat | 08 P5 |
| **Ortak proje hızı:** daha çok katılımcı | Köprü, baraj daha çabuk | 11 §7.11 |

**Rehberlik sözleşmesi (Alfa-1; Alfa-0'da yalnız Rehber etiketi ve NPC pano alt sözleşmesi öncüsü):**

| Öğe | Kural (öneri) |
|---|---|
| **Rehber** (türetilmiş etiket, seviye değil) | Hesap ≥30 gün, ≥5 yapı, ≥10 sözleşmede teslim oranı ≥%90, yaptırım yok |
| **Yeni esnaf** | Hesap <14 gün ya da servet < ilçe medyanının ¼'ü |
| Ücretsiz, çift taraflı sözleşme | 14 gün, her iki taraf istediği an bitirebilir; Rehber ≤3 eşzamanlı; **kilit yok** |
| **Alt sözleşme** | Rehber, NPC panosundan aldığı büyük siparişin bir kısmını yeni esnafa devredebilir; yeni esnaf sabit fiyat ≥ piyasa %95 alır; Rehber komisyon %5–10 |
| **Himaye teminat fonu** | Yeni esnafın ilk 3 alt sözleşmesinde teminatı sistem karşılar (kayıp yeni esnaftan **kesilmez**) |
| **Sonuca bağlı ödül** (Rehber'e) | Yeni esnaf 7. günde ≥2 çalışan yapıya sahip ve ≥1 sözleşme teslim etti: **₺2.000**; 14. günde hâlâ aktif: **₺2.000**; ilçe katkı kitabesi satırı |
| **Kozmetik** | "Rehber" tabela etiketi (GW2 Mentor rozeti gibi: güç yok) |
| Tavan | Rehber başına ≤3 yeni esnaf/ay; ≤₺6.000/ay; ödül yalnız **ayrı hesaplardan gelen, ayrı karşı taraflara** ekonomik faaliyete bağlı |
| **Kötüye kullanım önlemleri** | Tek hesap/tek e-posta/cihaz kontrolü; yıkama (wash) tespiti: Rehber ile yeni esnaf arası döngüsel işlem sayılmaz; **seçim haftasında Rehber ödülleri dondurulur** (seçim satın alınamaz kuralı); FFXIV'de mentor unvanları satılan boost hizmetleriyle ticarileşti, bu yüzden ödül süreye değil sonuca bağlı |

Alternatif: **yeni esnafı işçi olarak al** (Capital Rift modeli, görünür 3B işçi). Alfa-1+ L maliyetli ve oyuncu kimliğini "işçi"ye indirir; önerilmez. Bunun yerine alt sözleşme kullanıcıyı "ortak" yapar.

**Sistem maliyeti.** Ödüller (₺4.000/yeni esnaf, aylık ≤₺6.000/Rehber) sistem tarafından basılır (para yaratımı). Kıyas: hibe ₺50.000 ve kit ≈₺35.600 zaten sistemden. Enflasyon etkisi Alfa-0'da tek-NPC pazarda **arazi vergisi, bakım ve inşa malzemesi** lavabolarıyla dengelenir (11 §7.2, 08 §0.2); ekonomi ajanı Alfa-1 öncesi bu dengeyi bot ile ölçmelidir.

### 5.5 Sicil: söz tutmanın ekonomik karşılığı

| Öğe | Kural (öneri) |
|---|---|
| Kayıt | `SicilDurumu` oyuncu başına: `teslim`, `gecikme`, `teminatKaybi` sayaçları (sözleşme olaylarından) |
| Teminat oranı | `teminat = taban %20`; her 10 zamanında teslimde %1 puan düşer, en az **%5**; gecikme/kayıpla artar, en çok %25 |
| Açık sözleşme limiti | Başlangıç 3 → sicile göre en çok 8 |
| Görünürlük | Esnaf Kartı: "12 teslim, 0 gecikme" (seviye yok, sıfırlanabilir değil) |
| Neden "seviye" değil? | Bir **kredi notu** gibi işler: ekonomik şartları değiştirir, rütbe vermez |

---

## 6. Kaçınılacak tuzaklar

| # | Tuzak | Belirti | Önlem | Kaynak / dayanak |
|---|---|---|---|---|
| T1 | **Bilgi bombardımanı** | İlk ekranda 8 mercek, 7 katman, yasa listesi | İlk 10 dakikada **tek kavram/adım**; mercek çubuğu ilk saatte gizli (Dikkat + hedef kartı) | Albion "daha az metin"; Roblox |
| T2 | **Zorunlu uzun öğretici** | Modal pencereler, atlanamayan kutu | Esnaf Defteri **atlanabilir**, sıra serbest; **modal yok** | Factorio FFF-241; Hay Day şikâyeti |
| T3 | **Yanlış seçimle kilitlenme** | İlk yapı/ilçe/açılışa mahkûmiyet | Merdiven (§3.3), pişmanlık penceresi (ilk 72 sa), teknoloji dalı ertelemesi | Stardew (Joja); Albion "üç yol" |
| T4 | **Ücretli hızlandırma** | "Elmasla bitir", premium puan, kolay yol | **Yok (K13).** Albion LP Premium örneği reddedilir; Türkiye'de %57 hiç harcamaz, %75 ödüllü reklamı tercih eder | [Albion Guidebook](http://albionguidebook.blogspot.com/2016/10/destiny-board-learning-points.html), [Mobidictum](https://mobidictum.com/tr/turkiyedeki-mobil-oyuncular-kimler-ve-zamanlarini-nasil-geciriyorlar/) |
| T5 | **İlk saatte boş dünya** | Çarşıda kimse yok; ilçe boş | NPC müşteriler/esnaf, iş panosu, kademeli ilçe açılışı (%70), davetli yoğunluğu hedefi, Yerleş skoru ("sakin"+"yoğun") | R-Ü6; MMO "ghost town" ([MassivelyOP](https://massivelyop.com/2026/02/18/perfect-ten-10-deserted-mmos-that-feel-like-the-liminal-space-backrooms/), arama özeti) |
| T6 | **Angarya** | Zorunlu restok, "uğra yoksa kaybedersin" | Her işin uzaktan karşılığı, günlük seri yok, ödül tavanlı, yürüyüş opsiyonel | Foxhole grevi; [Capital Rift §3.2](capital-rift-mekanikleri.md) |
| T7 | **Karakter ilerlemesi (XP/seviye/ustalık)** | "Çırak, Kalfa, Usta", XP çubuğu, rütbe kıyafeti | **Yok.** İlerleme = varlık, ağ, sicil, makam, pazar payı | Sahip düzeltmesi; §1 kutu |
| T8 | **Servet sıralaması / halka** | Net değere göre renk, "en zengin" | Yalnız üretim payı; servet yok | Capital Rift H4 riski |
| T9 | **Sıfır gelirli ilk saat** | "Neden hâlâ para kazanmıyorum?" | Başlangıç gıda stoğu 5. dakikada satılır; ilk yapı ≈12 dk; ilk sözleşme ≤1 saatte | Big Ambitions ilk işi |
| T10 | **Ödeme gücünü aşan ilk karar** | Hibeyi tek büyük yapıya yatırmak | Maliyet kartı "gereken/var"; Defter küçük yapıyı önerir; pişmanlık penceresi | Anno iflas şikâyeti |
| T11 | **Açılış asimetrisi** (Sanayi soğuk, Tarım kolay) | Sanayi açılışının D1 geri dönüşü düşük | Sepet seçimi (§3.2), açılış başına geç katılan botu (§8) | §3.2 |
| T12 | **Hibe şişkinliği** (H6 hibeyle geçer) | 14. gün "medyan servete ulaştı" ama üretim geliri düşük | Y7: **hibeden bağımsız** net üretim geliri | §8 |
| T13 | **Rehber ödülünü istismar** (alt hesap, yıkama) | Aynı çiftler arasında döngü | Sonuca bağlı ödül, tavan, cihaz/e-posta kontrolü, seçim haftasında dondurma | FFXIV boosting |
| T14 | **Çok açılış kartı** (karar felci) | Yerleş ekranında >3 seçenek | **3 ilçe**, kart başına 1 açılış önerisi | Y-İ2 |
| T15 | **Dönem uyumsuzluğu** (fındık Ekim'de) | "Ürünüm neden verimsiz?" | Kartta "bu dönemde etkin ürün" etiketi; yumuşak pencere | [çeşitlilik §4.5](cesitlilik-uretim-katmanlari.md) |
| T16 | **Atlanamayan tekrar** (yeni cihazda öğretici) | Aynı öğretici yeniden | "Kılavuz kapalı" **hesaba** yazılır | Hay Day |
| T17 | **Sosyal baskı** (Rehber zorunlu hissi) | "Rehberin sana ödeme yapacak" baskısı | Rehberlik isteğe bağlı, kilitsiz, her iki taraf istediği an çıkar | §5.4 |
| T18 | **Kalkanın kötüye kullanımı** | Kalkan altında saldırı | Saldırı yapınca (birlik üretimi, ordugâh) biter | Travian (büyüyünce biter) |

---

## 7. Uygulama önerisi

**Maliyet etiketi:** S ≈ ≤3 iş günü, tek modül · M ≈ 1–2 hafta, çekirdek + istemci · L ≈ 3+ hafta ya da çekirdek + sunucu + istemci birlikte (tahmin). **Sahip**, [11 §5 dosya sahipliğine](../11-urun-donusu.md) göre.

| # | Parça | Katman | Maliyet | Alfa | Öncelik | Sahip | Bağımlılık / not |
|---|---|---|---|---|---|---|---|
| A1 | **Kalkan tek kaynağa bağla** (`kalkanGun` 14; `askeri.yeniOyuncuKorumasiGun` kaldır ya da eşitle) | Çekirdek | S | 0 | P0 | Çekirdek | `motor.ts:281`; H5 testleri yeniden |
| A2 | **Bedava yurt** (`yurtHucre`=6) + hazır arsa adası seçimi | Çekirdek + veri | M | 0 | P0 | Çekirdek (komut), Veri (adalar) | `yurt_al` ya da `parsel_al {yurt:true}`; ilçe merkezine ≤400 m ada; F2 hücre uygunluğu |
| A3 | **İlk 5 yapıda %30 indirim** | Çekirdek | S | 0 | P0 | Çekirdek | `tesis_insa_hucre` içinde `MulkOyuncuDurumu.indirimliYapi` sayacı |
| A4 | **%20 ayrılmış hücre** (deterministik: hücre kimliği karması < `ayrilmisHucrePpm`; hesap <14 gün ya da servet < medyan/4 olanlara) | Çekirdek | M | 0 | P1 | Çekirdek | `parsel_al` reddi + istemci "ayrılmış" çizgisi; H6 metrik 2 |
| A5 | **İlk satış yolu düzeltmesi:** mülk kipinde `ticaret_emri` `liman` şartından muaf (yerel NPC alım) ya da il merkezi "liman" sayılsın | Çekirdek | S | 0 | **P0** | Çekirdek | `ekonomi/komut.ts:101`; Pazar parametreleri bozulmamalı |
| A6 | **NPC iş panosu (siparişler):** ilçe başına ≤3 açık, vade ≤7 gün, ilk sipariş teminatsız, deterministik PRNG ile üretim | Çekirdek + istemci | M | 0\* (liste) | P1 | Çekirdek, İstemci | [Capital Rift §4.2 #4](capital-rift-mekanikleri.md); `siparis_al`, `siparis_teslim`; Alfa-0'da panel listesi, Alfa-1'de 3B pano |
| A7 | **Esnaf Defteri:** hedef kartı, durumdan türetilmiş ilerleme (komut günlüğünden: ilk yapı var mı, ilk satış oldu mu...), Atla/Kapat (hesaba yazılır) | İstemci + sunucu profil | M | 0 | **P0** | İstemci (F4), Sunucu | Çekirdek değişikliği yok |
| A8 | **İlk 60 sn sahnesi:** Yerleş ekranı → çarşıya iniş → yurda yönlendirme çizgisi; "Haritadan git" kısayolu | İstemci (F4 + F5) | M | 0 | **P0** | İstemci | F5 yürüyüş temeli Alfa-0'a çekildiyse; yoksa harita üzerinde aynı akış |
| A9 | **Başlangıç sepeti seçimi** (3 sepet, eşit taban değer) | Çekirdek + parametre | S | 0 | P1 | Çekirdek | `mulk.yeniOyuncu.baslangicKitleri`; `isletmeAl` kitten okur |
| A10 | **Yeniden yatırım:** `tesis_yik` (%50/%70), `parsel_birak` (%70), pişmanlık penceresi (72 sa, tam iade) | Çekirdek | M | 0 | P1 | Çekirdek | Başarısız komut sözleşmesi; `satilmisHucre` güncellemesi; iade aşınmadan düşülür |
| A11 | **Portföy özeti** (`portfoyOzeti(d, oyuncu)`: katman yuva payı, zincir tamlığı, ilçe sayısı, profil etiketi) + Esnaf Kartı | Çekirdek (saf) + istemci | S | 0 | P1 | Çekirdek, İstemci | `durumOzeti`'ne **girmez** |
| A12 | **Dönüş özeti** (sen yokken: üretim, satış, olay) | Sunucu + istemci | M | 0 | P1 | Sunucu, İstemci | Komut günlüğü ve olay günlüğünden türetim |
| A13 | **İlçe imzası ve etiketleri** (`ilce.etiketler`, `imza[]`) + Yerleş skoru | Veri + çekirdek | M | 0 (kısmi) | P1 | Veri, Çekirdek | `il-imza.json`; il→bölge eşlemesi doğrulama; yapı izni ilçe etiketine |
| A14 | **Sicil** (`SicilDurumu`, teminat çarpanı) | Çekirdek | M | 0\* | P2 | Çekirdek | A6 sözleşmeleri gerekir; sayaç Alfa-0, teminat etkisi Alfa-1 |
| A15 | **Huni ölçümü** (komut günlüğünden Y1–Y4 hesabı; sunucu tarafı sayaç) | Ölçüm | S | 0 | **P0** | Ölçüm | `packages/olcum`; ek kişisel veri yok (R-Ü16) |
| A16 | **Rehberlik sözleşmesi** (alt sözleşme + sonuca bağlı ödül + Rehber etiketi) | Çekirdek + sunucu + istemci | **L** | 1 | P2 | Çekirdek, Sunucu | P5 sözleşmeleri, sicil, çoklu hesap kuralları (11 §10) |
| A17 | **Yürüyüş içeriği:** çarşı canlılığı, tabela 3B, kaşif noktaları | İstemci (F5) | L | 1 | P2 | Yürüyüş | [Capital Rift §4.2](capital-rift-mekanikleri.md) öncelikleri |

**Özet.** Alfa-0 kapısı için P0: **A1, A2 (M), A3, A5, A7 (M), A8 (M), A15** = 4 S + 3 M. P1: A4, A6, A9, A10, A11, A12, A13 = 2 S + 5 M. P2/Alfa-1: A14, A16 (L), A17 (L).

**Parametre taslağı** (`mulk` bloğuna ek; lider onayı ve `veri/src/sema.ts` + `tipler.ts` genişlemesi gerekir; değerler kalibre değildir):

```jsonc
"mulk": {
  "yeniOyuncu": {
    // mevcut: hibe, baslangicStok, yurtHucre, ilkYapiIndirimPpm, indirimliYapiSayisi, ayrilmisHucrePpm, kalkanGun
    "baslangicKitleri": {
      "cift":   { "celik": 120000, "parca": 40000, "gida": 200000 },
      "atolye": { "celik": 120000, "parca": 40000, "cevher": 150000, "komur": 100000, "yakit": 60000 },
      "carsi":  { "celik": 120000, "parca": 40000, "gida": 100000, "tahil": 100000, "yakit": 40000 }
    },
    "pismanlikPenceresiSaat": 72,
    "pismanlikIadePpm": 1000000,
    "pismanlikTavanMili": 20000000,
    "yeniOyuncuYikimIadePpm": 700000,
    "ayrilmisSiparisPpm": 300000,
    "ilkSiparisTeminatsiz": true,
    "kalkanBitirenEylemler": ["birlik_uret", "savas_ilan"]
  },
  "yikimIadePpm": 500000,
  "hucreBirakIadePpm": 700000,
  "rehber": { "defterOdulTavaniMili": 8000000, "hedefSayisi": 7 },
  "sicil": { "teminatTabanPpm": 200000, "teminatAltPpm": 50000, "teminatUstPpm": 250000, "acikSozlesmeBaslangic": 3, "acikSozlesmeUst": 8 }
}
```

**Alfa-0 kapısına etkisi.** [A0-6](../11-urun-donusu.md) uçtan uca akışı (giriş → Yerleş → hücre al → Tarla kur → tamamlanır → satış görünür) bu rapordaki **ilk 10 dakika** ile aynıdır; A2, A3, A5, A7, A8 bu akışın parçası. [A0-8](../11-urun-donusu.md) (H5, H6, H7, H8 raporu) A1–A4 uygulandıktan sonra anlamlıdır.

---

## 8. Ölçüm

### 8.1 Mevcut hipotezlerle ilişki

| Mevcut | İlişki | Uyarı |
|---|---|---|
| **H2** (30. gün tekrar ≤%60; 45. güne kadar her hafta ≥1 yeni karar türü) | Esnaf Defteri ilk haftada yapay olarak yeni karar türü üretir (`parsel_al`, `tesis_insa_hucre:tarla`, `ticaret_emri`, sözleşme...) | H2'yi **3. haftadan** hesapla ya da "defterli/defter-siz" iki kohorta ayır; aksi hâlde ilk iki hafta şişer |
| **H6** (60. günde katılan, 14. gün ilçe medyan servetine ≥%50 koşuda ulaşır; hücrelerin ≥%20'si ≤2× fiyatla alınabilir) | Servet = hazine + depo + arazi + yapı: **hibe ve kit servete anında girer**; medyan düşük ilçede kolayca geçilir | **Y7** (hibeden bağımsız net üretim geliri) ile birlikte raporla; paket yarım uygulanırsa (B-1..B-3) H6 yarı paketi ölçer |
| **H5** (kalkan) | Kalkan 7 vs 14 çelişkisi (B-4) | A1 sonrası yeniden koş |
| **H1** (portföy çeşitliliği) | Açılış asimetrisi (Tarım kolay, Sanayi zor) H1'i doğrudan etkiler | "Geç katılan" botunu **açılış başına** çalıştır |
| **H4** (okunabilirlik) | Esnaf Kartı ve Dikkat paneli bu testin konusu | İnsan testine "ilk 60 sn" görevi eklenebilir |

### 8.2 Yeni ölçütler (öneri; kapı değil, hipotez)

Hepsi **komut günlüğünden** ve sunucu zamanından hesaplanır (ek kişisel veri yok); eşikler başlangıç değeridir, kalibre edilmemiştir.

| # | Ölçüt | Tanım | Hedef (hipotez) | Bot / insan | Not |
|---|---|---|---|---|---|
| **Y1** | **İlk yapı ≤10 dk** | `oyuncu_katil` ile ilk kabul edilen `tesis_insa_hucre` arası süre ≤ 10 dk olan oyuncu oranı | ≥ %75 | İnsan (alfa) | Bot bu süreyi anlamlı ölçmez |
| **Y2** | **İlk saatte ilk satış oranı** | İlk `ticaret_emri` gerçekleşmesi / ilk gelir ≤ 60 dk; ayrıca ≤10 dk oranı | ≥ %70 (≤60 dk); ≥ %50 (≤10 dk) | İnsan | Mobil tycoon hedefleri [rolearn] ile uyumlu; B-5 düzeltilmeden anlamsız |
| **Y3** | **İlk sözleşme ≤24 sa** | İlk `siparis_teslim` ≤ 24 sa oranı | ≥ %50 | İnsan | A6 gerekir |
| **Y4** | **D1 / D7 geri dönüş** | Katılımın 2. ve 8. takvim gününde en az 1 oturum | D1 ≥ %35; D7 ≥ %15 (davetli kohort, **gözlem**) | İnsan | Kıyas: tycoon iyi D1 %30, D7 %15; strateji ortalaması D1 %25, D7 %8 [Segwise]. [A1-7](../11-urun-donusu.md) "eşik yok, hipotez" |
| **Y5** | **Açılış çeşitliliği** | 24. saatte 2. yapının katmanı; hiçbir katman >%60; hibrit portföy oranı | Maks katman ≤ %60 | Bot + insan | H1 ile uyumlu |
| **Y6** | **Yön değiştirme maliyetsizliği** | İlk 7 günde ≥1 yön değiştiren (yıkım, bırakma, ilçe değiştirme) oranı ve bunların D7 farkı | Oran ≥ %10; D7 farkı ≥ **−5 puan** | İnsan | Kilit olmadığının kanıtı; negatifse ceza algısı |
| **Y7** | **14. gün net üretim geliri** | Katılımdan 14 gün sonraki son 7 günlük net üretim geliri / ilçe medyanı (hibeden bağımsız) | ≥ %50 oyuncuda medyanın ≥ %50'si | Geç katılan botu (3 açılış) | H6'nın hibe-bağımsız karşılığı |
| **Y8** | **Defter etkileşimi** | Defter görev tamamlama oranı; "Atla/Kapat" oranı; kartın açıkken oyuncu yapı kurma oranı | Atla ≤ %30 (yüksekse metin/sıra sorunu) | İnsan | Atla dışında **zorlayıcılık** ölçülmez |
| **Y9** | **Rehberlik (Alfa-1)** | ≥1 yeni esnafa alt sözleşme vermiş ilerlemiş oyuncu oranı; yeni esnaf D7'si (Rehberli/Rehbersiz) | ≥ %20; Rehberli D7 ≥ +5 puan | İnsan | A16 gerekir |
| **Y10** | **Takılma** | İlk saatte ≥5 dk komutsuz bekleme anlarının oyuncu başına sayısı | ≤1 | İnsan | Telemetri ayrı anahtar (R-Ü16) |

**Botlar eğlenceyi ölçmez** ([00 R5](../00-vizyon-ve-kararlar.md)): Y1–Y4, Y6, Y8–Y10 için **insan testi** şarttır; Alfa-0 (≤200 davetli) bu veriyi verir. Y5 ve Y7 bot + insan karma.

**Ölçüm kümesi (bot).** `geç katılan` arketipi üçe bölünür: `gec_ciftci`, `gec_sanayici`, `gec_pazar` (aynı paket, farklı açılış); metrik: 14. gün Y7 ve ilk satış zamanı (simüle süre).

---

## 9. Açık sorular (sahip / lider için)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| Ç1 | Yürüyüşün ilk 60 saniyedeki rolü: sahip 1 Ekim düzeltmesiyle "yalnız adaptasyon" dedi; [11 ek karar](../11-urun-donusu.md) "ana temas biçimi" diyor. Hangisi bağlayıcı? | Düzeltme bağlayıcı; 11 ek karar güncellensin (§0.1) |
| Ç2 | Bedava yurt 6 hücre Sanayi açılışını karşılamıyor (§3.2). 8 hücre mi, iki aşamalı mı? | 8 hücre; kalibrasyon ölçümüyle |
| Ç3 | Kalkan 7 mi 14 mü? | 14 (belge); saldırı yapınca biter |
| Ç4 | İlk satış için `liman` şartı mülk kipinde kalkar mı? | Kalksın (yerel NPC alım) |
| Ç5 | Giriş: "önce oyna, sonra kaydol" mümkün mü? [11 §10](../11-urun-donusu.md) anonim hesabı ekonomik hesap saymıyor | Giriş önce, tek dokunuş; 0:10 sn bütçesi |
| Ç6 | Başlangıç sepeti seçimi mi, tek kit mi? | 3 sepet; varsayılan ilçe önerisi |
| Ç7 | Rehber ödülü (para yaratımı) kabul mü? | Evet, sonuca bağlı ve tavanlı; ekonomi ajanı ölçsün |
| Ç8 | Ü8 (×1,5 uzmanlaşma çarpanı) kaldırılsın mı? | Kaldır (§4.6) |
| Ç9 | İlk gün "ikinci perde" (Devlet/Askeri) 7. günde mi sunulur, daha mı erken? | 7. gün; Alfa-0'da yalnız panelden hafif giriş |
| Ç10 | Tabela/Esnaf Kartı kozmetikleri gelir modelinde ücretli olabilir mi? | Gelir modeli kararına (Ü12) kadar tümü ücretsiz |

---

## 10. Kaynaklar

**Oyunlar (onboarding ve yönelim)**
- Factorio: [Friday Facts #241 — New player experience](https://factorio.com/blog/post/fff-241)
- Albion Online: [MMORPG.com: Abyssal Depths yeni oyuncu deneyimi](https://www.mmorpg.com/news/albion-online-devs-detail-abyssal-depths-new-player-experience-and-quality-of-life-improvements-2000135277) · [Dev Talk: New Player Experience](https://albiononline.com/news/dev-talk-new-player-experience) (403; arama özeti) · [Albion Journal](https://wiki.albiononline.com/wiki/Albion_Journal) · [MassivelyOP](https://massivelyop.com/2025/02/27/albion-online-looks-ahead-to-its-next-updates-including-a-better-new-player-experience/)
- EVE Online: [EVE Uni: Career Agents](https://wiki.eveuniversity.org/Career_Agents) · [MMORPG.com: Career Program](https://www.mmorpg.com/news/eve-onlines-new-player-experience-gets-career-program-updated-career-agent-dungeons-2000125400) · [Steam: EVE recruitment](https://steamcommunity.com/app/8500/discussions/1/1727575977569297763/)
- Stardew Valley: [JojaMart](https://stardewvalleywiki.com/JojaMart) · [Statue of Uncertainty](https://www.thegamer.com/stardew-valley-how-find-statue-uncertainty-change-profession/) · [Steam: öğretici yok tartışması](https://steamcommunity.com/app/413150/discussions/0/1642041106362357027)
- Anno 1800: [Steam: Beginner Questions](https://steamcommunity.com/app/916440/discussions/0/3824159062923148426/)
- Big Ambitions: [bigambitionswiki.pro rehberi](https://bigambitionswiki.pro/guide/) · [Steam rehberi](https://steamcommunity.com/sharedfiles/filedetails/?id=2944061973)
- Capital Rift: [YouTube: Capital Rift Tutorial](https://www.youtube.com/watch?v=oNfawXo8q2A) · [TikTok: yeni öğretici](https://www.tiktok.com/@niksgames/video/7671413170463903007) · [capitalrift.com](https://capitalrift.com/) (ana sayfa onboarding anlatmıyor)
- Hay Day: [Supercell forumu](https://forum.supercell.com/showthread.php/297738-Guide-for-new-Hay-Day-players)
- Roblox: [Onboarding](https://create.roblox.com/docs/production/game-design/onboarding)
- Travian: [Beginner's protection](https://support.travian.com/en/support/solutions/articles/7000060689-beginner-s-protection) · [Newbie protection](https://travian.fandom.com/wiki/Newbie_protection)

**Ustalık ve uzmanlaşma (karşılaştırma; bu oyunda alınmadı)**
- Albion: [Destiny Board](https://wiki.albiononline.com/wiki/Destiny_Board) · [Albion Codex: planlama](https://www.albioncodex.com/guides/albion-online-destiny-board-planning) · [Learning Points](http://albionguidebook.blogspot.com/2016/10/destiny-board-learning-points.html)
- RuneScape: [Skill mastery](https://runescape.wiki/w/Skill_mastery) · [Virtual levelling](https://runescape.wiki/w/Virtual_levelling) · [Capes of Accomplishment](https://runescape.wiki/w/Capes_of_Accomplishment)
- Ultima Online: [UO King: skill system](https://www.uoking.com/guides/skill-system) · [UO Forum: skill cap](https://www.uoforum.com/threads/skill-cap-skill-drop.97859/)
- Eco: [Specialties](https://wiki.play.eco/en/Specialties) · [Professions](https://wiki.play.eco/en/Professions) · [Skills](https://wiki.play.eco/en/Skills) (arama özeti; wiki 403)
- OSRS Tutorial Island: [OSRS Wiki](https://oldschool.runescape.wiki/w/Tutorial_Island)

**Yetişme ve mentor**
- WoW Rested XP: [Psychology of Games](https://www.psychologyofgames.com/2010/03/framing-and-world-of-warcrafts-rest-system/) · [Wowpedia: Rest](https://wowpedia.fandom.com/wiki/Rest)
- FFXIV: [EXP Bonus](https://ffxiv.consolegameswiki.com/wiki/EXP_Bonus) · [Kotaku: Battle Mentor](https://kotaku.com/final-fantasy-xiv-battle-mentor-roulette-1851478857) · [boost hizmeti örneği (satış sayfası; yalnız mentor unvanlarının ticarileştiğini göstermek için, doğrudan okunmadı)](https://skycoach.gg/final-fantasy-xiv-boost/products/battle-mentor-7651)
- Guild Wars 2: [Pact Mentor](https://wiki.guildwars2.com/wiki/Pact_Mentor) · [Mentoring Badge](https://wiki.guildwars2.com/wiki/Mentoring_Badge)

**Mobil ve ölçüm**
- [rolearn: First Week Retention](https://rolearn.dev/guidance/first-week-retention-optimization/) · [Segwise: Mobile retention benchmarks 2026](https://segwise.ai/blog/mobile-gaming-app-user-retention-strategies) · [maf.ad: retention benchmarks](https://maf.ad/en/blog/mobile-game-retention-benchmarks/)

**Motivasyon kuramı**
- [Przybylski, Rigby, Ryan (2010): A Motivational Model of Video Game Engagement](https://selfdeterminationtheory.org/SDT/documents/2010_PrzybylskiRigbyRyan_ROGP.pdf)

**Türkiye bağlamı**
- [Mobidictum: Türkiye'deki mobil oyuncular](https://mobidictum.com/tr/turkiyedeki-mobil-oyuncular-kimler-ve-zamanlarini-nasil-geciriyorlar/) · [CHIP Online: Türkiye Oyun Sektörü 2025](https://www.chip.com.tr/guncel/turkiye-oyun-sektoru-2025-raporu-yayinlandi-dijital-stratejiler-one-cikiyor_178396.html) (arama özeti) · Ahilik'te çıraklık sözleşme ve ustanın sorumluluğuydu: [Karaman Esnaf Odası: Ahilikte şed kuşatma](https://www.karamanesnaf.org.tr/haber/AHiLiKTE-sED-KUsATMA), [Kahta MESEM: Ahilik](https://kahtamesem.meb.k12.tr/icerikler/ahilik_14632423.html) (arama özeti; bu raporda yalnız "sözleşme olarak modelleme" fikrine esin)

**İç belgeler ve kod (doğrudan okundu)**
- [11 — Ürün Dönüşü](../11-urun-donusu.md) (§7.2, §7.4, §7.6, §7.9, §8, §9, Ek kararlar) · [08 — Altı Katman](../08-alti-katman.md) (§0.2, §4 TK1–TK4, §6 D1–D7) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · [oyun tasarımı: parsel](oyun-tasarimi-parsel.md) · [arayüz ve UX §6](arayuz-ux.md) · [H1–H9](../olcum/h1-h9-parsel-tanimlari.md) · [çeşitlilik: üretim](cesitlilik-uretim-katmanlari.md) · [çeşitlilik: yönetim](cesitlilik-yonetim-askeri-teknoloji.md)
- Kod: `packages/cekirdek/src/mulk/{komut,isletme,durum,insaat,vergi}.ts` · `packages/cekirdek/src/motor.ts` (`oyuncuKatil`, satır 237–295) · `packages/cekirdek/src/erkenOyun.ts` · `packages/cekirdek/src/ekonomi/komut.ts` (`ticaret_emri`, satır 98–121) · `packages/veri/icerik/parametreler.json` (`mulk` blok 175–205; `erkenOyun`; `pazar`) · `packages/veri/icerik/icerik.json` (tesis maliyetleri) · `packages/veri/src/{sema,tipler}.ts` (`yeniOyuncu` alanları) · `packages/veri/haritalar/gercek-karadeniz.json`

**Erişilemeyen kaynaklar (bu turda).** Albion wiki ve Dev Talk sayfası, Eco wiki, Reddit, oyun içi wiki'ler 403/ağ politikası nedeniyle doğrudan okunamadı; ilgili satırlarda "arama özeti" etiketi var. Capital Rift için bağımsız oyuncu deneyimi kaynağı **yok**; ilk saat sırası üçüncü taraf video bölüm başlıklarından alındı. Hiçbir ürün kararı tek kaynağa bağlanmamalı; bu rapor **Alfa-0 insan testiyle** doğrulanmalıdır.
