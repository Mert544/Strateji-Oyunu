# Araştırma: Yeni Oyuncu Rehberliği ve Rehber Görev Zincirleri

> **Konu.** [baslangic-ve-ustalik.md](baslangic-ve-ustalik.md) rehberliğin **ilkelerini** verdi (Esnaf Defteri, ilk saat tablosu §2.2, Rehberlik sözleşmesi §5.4, ölçütler Y1–Y10). Bu rapor onları **tekrar etmez**; sahibin 1 Ekim yönergesini ("yeni oyuncuya rehberlik ve rehber görevler iyi olabilir"; "buğday → un → ekmek → kendi marketin", "cevher → demir/alüminyum → pencere → pencere mağazası") **somut görev zincirlerine, bir görev sistemi tasarımına ve veri şemasına** indirir. Oyun strateji tabanlıdır; görev **karakter ilerlemesi değildir** (seviye, XP, rütbe, görev puanı yok).

**Durum.** 1 Ekim 2026'da derlendi. Ar-Ge önerisidir; kod, parametre ve başka belge değiştirilmedi. Sayıların hepsi **öneridir, kalibre edilmemiştir.** **(doğrulanmadı)** birincil kaynakla teyit edilemeyen bilgiyi, **(arama özeti)** sayfa doğrudan okunamayıp yalnız arama özeti kullanılan bilgiyi gösterir. Çekirdek gerçekleri `packages/cekirdek/src/` ve `packages/veri/icerik/*.json` dosyalarından doğrudan okunmuştur (alan adları metinde). "Sezon" yerine "iklim takvimi / dönem" denir.

İlgili belgeler: [baslangic-ve-ustalik](baslangic-ve-ustalik.md) · [oyun-kimligi-harman](oyun-kimligi-harman.md) (ilk 60 sn, Akşam Defteri, Açılış Tezgâhı) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) (N14, N8, N4, Fırsat Kartı, K-5) · [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) (takvim paketi, olay kataloğu) · [cesitlilik-uretim-katmanlari](cesitlilik-uretim-katmanlari.md) (katalog, zincirler) · [sunucu-tasarimi](sunucu-tasarimi.md) (komut günlüğü) · [docs/12 §8](../12-yon-taslagi.md).

---

## Yönetici özeti (10 madde)

1. **Defter, görev listesi değil "sayfalı bir defter".** Bir **Esnaf Defteri** vardır; içinde açılış sayfaları (Tarım, Sanayi, Pazar), yön değiştirince açılan sayfalar (Fabrika, Ticaret, Belediye, Savunma, Laboratuvar), bir **Takvimden** sayfası ve (Alfa-1) **Rehberlik** sayfası bulunur. Sıra serbest, modal yok, zorunlu öğretici yok, kilit yok. Görev durumu **oyun durumundan türetilir** (Albion Journal'daki "oyunla zaten yaptıysan bir daha yapma" ilkesi, §1, §2.2).
2. **Görev = bir döngü adımı.** Her görev aynı yedi kavramdan birinin açılış bağlamındaki yüzüdür: **ilk üretim → ilk işleme → ilk satış → ilk kendi dükkânı → ilk sözleşme → ilk kamu ihalesi teklifi → komşu ilçe.** Ödül **kavrama** bağlıdır, sayfaya değil: aynı kavramdan ikinci kez ödül alınmaz. Bu, yön değiştirmeyi (yeni sayfa) para musluğuna çevirmez (§3.1).
3. **Üç zincir, sahibin iki örneğiyle hizalı.** Tarım: buğday → (un) → (ekmek) → kendi marketin; Sanayi: cevher → demir/çelik (alüminyum) → (pencere) → pencere mağazan; Pazar: önce sat, sonra üret, sonra dükkân. Parantezli adımlar **bugünkü 14 mallık içerikte yoktur** (un, ekmek, boksit, alüminyum, cam, pencere, perakende dükkânı); zincirler iki sürümlüdür: **Alfa-0 gerçeği** (tahıl → gıda; cevher → çelik → parça) ve **hedef sürüm**; görev tanımı katalog bağımsızdır ve eksik içerik varsa kart gizlenir (§3, §6.1).
4. **Ödül küçük, kavrama bağlı ve sınırlı: tasarlanan toplam ≈₺5.650, tavan ₺8.000** (taban değerle; hibe+kit ≈ ₺85.600'ün ≈%6,6'sı). Dört ödül türü: mal, para, kozmetik, bilgi. **Her ödül, adımın bedelinin (bedelsiz adımda adımın getirdiği brüt gelirin) ≤%25'i;** bedelsiz ve gelirsiz adımlar yalnız kozmetik/bilgi verir (avantaj yaratmaz). Para payı ≤%50. Olay görevlerinin ödülü **olayın kendisidir** (talep), ek para yok (§3.1, §2.7).
5. **Üç değişmez.** (a) **Hiçbir sistem görev durumunu koşul olarak okumaz** (Rehber ödülü, sicil, kilit, ihale, sipariş kotası hepsi aynı çekirdek durumuna bakar). (b) **Ödül yalnız çekirdek durumundan türetilebilen koşullara bağlanır;** gözlem görevleri ("meydanı gez") ödülsüzdür (çiftlik edilemez). (c) **Görev metni şablondur;** LLM ajan görev üretmez, doğrulamaz, ödül vermez (§2.1).
6. **"Kaldığın yer" tek öneri verir ve yargılamaz.** Dönüş süresine göre (6 sa / 2 gün / 14 gün uyku / 45 gün çürüme) farklı bir ilk kart; en çok 1 ana + 2 isteğe bağlı kart; öneri motoru kural sıralıdır ve çekirdek durumundan beslenir (§2.3–2.4).
7. **Yön değiştiren oyuncu yeni sayfa açar, kilit açmaz.** Sayfa, ilk yapısının katmanı değişince (ya da Fırsat Kartı kabulüyle) belirir; yalnız **yeni kavramlar** ödül verir (ilk santral ₺400, ilk araştırma ₺400, ilk ortak katkı ₺200) (§2.5).
8. **Olaylar görevdir, ama para değil.** Gurbetçi yaz dönüşü, Salı Pazarı, hasat penceresi, kış hazırlığı, Cumhuriyet Bayramı, dini bayramların **hatırlatma takvimi** "Takvimden" sayfasında ön duyuru + hazırlık görevi olarak görünür; ödül yok, çünkü olay zaten talep getirir ve K-5 "talep zamanlaması değişir, toplam değişmez" ilkesini korur. **Alfa-0 gerçeği:** ilk gurbetçi dönemi 15 Haziran 2027, ilk dini bayram 9 Mart 2027; ilk aylarda yalnız hasat, kış hazırlığı ve Cumhuriyet Bayramı vardır (§2.7).
9. **Ölçüt Gö1–Gö10** (Y1–Y10'a eklenir, onları tekrar etmez): ilk saatte ilk satış, **ilk kendi dükkânı ≤24 sa**, görev atlama oranı, geriye dönük tamamlanma oranı, "kaldığın yer" etkinliği, ödülün para arzına payı (≤%10 giriş paketi). **Bot eğlenceyi ölçmez**, ama **zincir erişilebilirlik testini** yapar (her zincir botla tamamlanabilir; ödül tavanı aşılamaz) (§5).
10. **Uygulama:** tanım = sürümlü veri paketi (`gorevler.json`); koşul = çekirdek durumunu okuyan **saf fonksiyon** (`durumOzeti`'ne girmez, determinizmi etkilemez; istemci de çağırır); görev durumu (tamamlanma anı, atla/kapat) = **sunucu profil tablosu**, hesaba bağlı; ödül = **tutar taşımayan** `sistem_odul {kavram}` komutu: tutarı, tavanı (₺8.000) ve "kavram başına bir kez" kuralını **çekirdek** sürümlü ödül tablosundan uygular, bunun için çekirdekte yalnız oyuncu başına `alinanOdul` kümesi tutulur (§6.2, GK-2). **Alfa-0:** 3 zincirin ilk gün bölümü + "kaldığın yer" + Defter arayüzü (P0: 2 S + 4 M); yön sayfaları, Takvimden, sözleşme/ihale/Rehberlik Alfa-1 (§6). **Geri dönüşü zor 8 karar §7'de** (ödül türü ve kanalı, durumun yeri, zorunluluk derecesi, kimlik sözlüğü...).

---

## 0. Çerçeve: neyi tekrar etmiyoruz, neyi ekliyoruz

### 0.1 Önceki raporun bıraktığı noktalar

| baslangic-ve-ustalik'te (tekrar edilmez) | Bu raporda ne olur |
|---|---|
| Esnaf Defteri: tek ana kart + ≤2 isteğe bağlı kart, modal yok, Atla/Kapat hesaba yazılır (Y-İ3); ödül toplamı ≤₺8.000 | Defterin **anatomisi** (sayfa/bölüm/görev), öneri motoru, ödül **defteri** (kavram bazlı), veri şeması |
| İlk saat tablosu §2.2 (0:00–60 dk) ve ilk gün/hafta tablosu §2.3 | Üç açılış için **7 günlük görev zinciri**: görev adı, tetik, tamamlanma alanı, ödül, atlanabilirlik, yürüyüş/panel |
| Açılış kartları §3 (Tarım/Sanayi/Pazar), yeniden yatırım merdiveni §3.3 | Yön değişince **yeni defter sayfası** (kilitsiz) |
| Rehberlik sözleşmesi §5.4, sicil §5.5 | Defterin Rehberlik (mentor) ile **bağı** ve bağımsızlık değişmezi |
| Ölçütler Y1–Y10 | **Gö1–Gö10** (görev sistemine özgü) + zincir erişilebilirlik testi |
| Uygulama A1–A17 | Görev sistemi parçaları (B1–B9), bu parçaların A7/A12/A16 ile bağı |

### 0.2 Okurken bulunan çelişkiler ve boşluklar (kararlaştırılması gerekenler)

| # | Bulgu | Kanıt | Sonuç / öneri |
|---|---|---|---|
| GB-1 | **baslangic §2.4 B-1…B-5 çekirdekte giderilmiş görünüyor** (bedava yurt, ilk-5 yapı indirimi, limansız ilde ilk satış). Dosya düzeyinde doğrulandı: `mulk/yurt.ts` (yurdun `oyuncu_katil`'da ücretsiz verilmesi), `ekonomi/komut.ts` (`yerelPazar` iken liman şartı aranmıyor), `MulkOyuncuDurumu.indirimliYapi` | `git log`: 71c8616 | İlk gün zincirleri **ücretsiz yurt + indirimli ilk yapı + yerel NPC satışı** varsayar. `%20 ayrılmış hücre` ve kalkan birleştirmesi (B-3, B-4) bu turda yeniden doğrulanmadı |
| GB-2 | **Katalog boşluğu.** `icerik.json`: 14 mal, 18 tesis; un, ekmek, boksit, alüminyum, cam, pencere, **perakende dükkânı yok.** Ek yapılar (`parametreler.json mulk.ekYapilar`): Ambar, Ticaret ofisi, Muhtarlık, Konut, Garaj, Atölye-Lab | `icerik.json`, `parametreler.json` | Görev tanımı **mal/yapı kimliğine sabit bağlanmaz**; `gerektirir` alanıyla katalog kapısı (§6.1). Zincirler "Alfa-0 gerçeği" ve "hedef" olarak iki sütunludur |
| GB-3 | **"Kendi marketin / pencere mağazan" için yapı ve iç sevk yok.** `ticaret_emri` yalnız NPC pazara **ihracat/ithalat** oran emridir; kendi dükkânına iç sevk (lojistik arka planda) ve perakende satış çözümü bugün yok. Ticaret ofisi yalnız komisyon/makas indirimi ve emir yuvası verir | `tipler.ts` `ticaret_emri`; `ekYapilar.ticaret_ofisi` | docs/12 §8 "kendi perakende dükkânı ana kanal olur" ⇒ perakende yapısı **başka Ar-Ge raporunun** konusu; bu rapor onu `ilk_dukkan` kavramına bağlar. Alfa-0 köprüsü: **Ticaret ofisi = "kendi tezgâhın"** (adı ve görev metni buna göre) |
| GB-4 | **Alfa-0 takvimi gurbetçiyi içermez.** N8 penceresi 15 Haziran–31 Ağustos ve aşaması A1; ilk dini bayram 9 Mart 2027 (canlı dünya §5.2) | imza §3.4 N8; canlı dünya §5.2 | İlk haftanın olay görevi **ilk 21 günde fiilen yaklaşan olay neyse odur** (§2.7): Ekim–Aralık 2026'da hasat, kış hazırlığı (E2, A0), Cumhuriyet Bayramı (E8 süs, A0) |
| GB-5 | **İki "defter" adı.** baslangic: "Esnaf Defteri" (görev); harman/imza: "Akşam Defteri" (sen yokken özeti) | harman §5.4, imza §2.2 | Tek **Defter** nesnesi, iki yüz: **Bugün** (Akşam Defteri) ve **Sayfalar** (Esnaf Defteri) (§2.2) |
| GB-6 | **İlk sözleşme için sistem yok.** NPC iş panosu (A6) ve tedarik sözleşmesi çekirdekte yok; `AnlasmaDurumu` oyuncular arası ticaret anlaşmasıdır | baslangic A6; `tipler.ts` | `ilk_sozlesme` ve `ilk_ihale_teklif` kavramları **A6/N14/N4 gelene kadar gizli**; Y3 (ilk sözleşme ≤24 sa) buna bağlı, Alfa-0 için P1 |
| GB-7 | **LLM ajan çelişkisi, görev tarafı.** Sahip kamu ihalesini ajanlara bırakıyor; canlı dünya §6.5 "haber LLM'siz, şablon + olgu defteri" demişti | docs/12 §8 | Görev sistemi **ajandan bağımsız** kalır: görev kartı yalnız çekirdekteki ilan/teklif durumuna bakar, metin şablondur (§2.1 Gİ-9) |
| GB-8 | **Hibe tek seferlik ve hesap başınadır;** yeniden başlayan (90 gün hareketsizlik sonrası açık artırma) oyuncuya yeni hibe/kit verilip verilmeyeceği tanımsız | baslangic §5.1 (`isletmeAl` kit yalnız ilk işletmeye) | "Yeniden başlangıç" sayfası için karar gerekir (§8, GS-4) |
| GB-9 | **Ad sözlüğü (üç "rehber" kavramı karışmasın).** Sahibin "**rehber görev**" sözü = bu raporun **Defter kartı** (öğretici adım). baslangic §5.4'teki "**Rehber**" = ilerlemiş oyuncunun **mentor etiketi** (oyuncu). "Rehberlik sayfası" = Defter'in Alfa-1'deki, mentor sözleşmesine ait sayfası. Usta/çırak/kalfa dili **yoktur** (imza N1 "Usta unvanı yoktur"; baslangic T7 tuzağı) | baslangic §5.4, T7; imza N1 | **Arayüzde ayrım:** Defter kartının etiketi **"Adım"** (defter simgesi, başlık: "Kolay gelsin, ilk tarlan"); "Rehber" sözcüğü **yalnız oyuncu etiketi**dir (tabela rozeti, ad yanında) ve Rehberlik sayfasında geçer. İç terim "rehber görev" belgelerde kalır, oyuncuya "adım" ya da "defter notu" denir |
| GB-10 | **Muhtar adı ↔ K-4.** T1/S1/T13 tetiklerinde "Muhtarın hibe kartı / NPC Muhtar" geçiyor; imza K-4'e göre **Muhtar mahalle düzeyinin adıdır, ilçe düzeyi İlçe Başkanı**; ek yapı `muhtarlik` ise `enFazlaIlBasina: 1` ile il/ilçe ölçeğinde tanımlı (`parametreler.json`) | imza K-4, §2.1; `parametreler.json` | **Öneri (çözmedim):** karşılama NPC'si **Mahalle Muhtarı** (arsa tabelasındaki; harman §5.3 ile aynı); ilçe düzeyi kartlar (ihale, ilçe projesi) "İlçe Başkanı" der. `muhtarlik` yapısının adı/ölçeği K-4 kararına göre netleşmeli; görev metni anahtarla (`npc.muhtar`) çözülür, ad değişirse kart değişmez |
| GB-11 | **Gİ-5 ↔ §2.3 çakışma önleme.** Gİ-5 "hiçbir sistem görev durumunu okumaz" der; §2.3'te Fırsat Kartı, ilk 7 gün Defter ana kartı varken **gösterilmez** | Gİ-5; §2.3 | **Öneri (çözmedim):** bu **yalnız sunum katmanı kuralıdır** (Dikkat panelinde en çok 2 madde, hangisinin görüneceği); **ekonomiyi, fırsatın kendisini ya da ödülü etkilemez** (Fırsat Kartı çekirdek durumundan türetilmeye devam eder, yalnız ekranda sıra bekler). Gİ-5'in kapsamı **ekonomi/ödül/kilit** olarak daraltılıp "sunum önceliği hariç" diye yazılmalı |

---

## 1. Kanıt ve karşılaştırma: görev sistemleri

| Oyun | Görev/rehber biçimi | Bizde **alınan** | Bizde **alınmayan** ve neden | Kaynak |
|---|---|---|---|---|
| **Stardew Valley** | Zorunlu öğretici yok. Görevler iki kanal: **Help Wanted** panosu (günlük rastgele, 2 gün süreli, para ve arkadaşlık ödülü) ve **hikâye görevleri** (mektupla; süresiz; altın/tarif/alan açar). "Görevi kabul edip yapmamanın cezası yok". **Topluluk Merkezi:** ilk bahardan itibaren bir sinematikle tanıtılan, "paket" (bundle) listeli uzun hedef; alternatifi JojaMart (5.000 altın) | **Cezasız, süresiz, isteğe bağlı** görev; **pano** (ilçe iş panosu) ile **uzun hedef** (ortak proje/kitabe) ayrımı; kilit koymadan "yönelim" (Joja ↔ Merkez = bizde bakkal ↔ zincir market) | Günlük rastgele pano görevinin **para ödülü** (para musluğu, K-5); "rastgele üretilmiş" içerik (determinizm ve sunucu maliyeti) | [Quests](https://stardewvalleywiki.com/Quests) · [Community Center](https://stardewvalleywiki.com/Community_Center) |
| **Albion Online: Albion Journal** (Destiny Board'un **yerine** bizim alacağımız yüz) | Kategorili görev günlüğü (PvE, Toplama, PvP, **Ekonomi**, Keşif); **sıra serbest;** oyunla zaten yapılmış hedef günlükte açılınca **tekrar yapılmaz** (geriye dönük tamamlanma); kategori yüzdesine bağlı kademeli ödül; ödüller silver, harita, tome **ve kozmetik** (giysi, binek görünümü); yeni oyuncular öğretici sonrası, hepsi için isteğe bağlı | **Sıra serbest + geriye dönük tamamlanma + kozmetik ağırlıklı ödül + kategori (sayfa) yapısı** | **Fame ve Tome of Insight** (karakter ilerlemesi, Destiny Board'a akar) ve per-karakter takip; "kategoriyi %100 bitirince elit ödül" (tamamlama baskısı: bizde kozmetik bile **yüzdeye bağlanmaz**, aksi halde Gö4 atlama oranı gizli bir ceza yaratır) | [MMORPG.com: Journal](https://www.mmorpg.com/news/albion-online-details-the-albion-journal-mission-and-reward-system-coming-in-paths-to-glory-2000132197) · [Albion Wiki](https://wiki.albiononline.com/wiki/Albion_Journal) (403; arama özeti) |
| **Albion: Destiny Board** | (baslangic §1 kutusu) fame ile düğüm mastery, saat farkı biriktirir | — | Karakter gücü; geç gelen **saat farkını** kapatamaz; "LP" ücretli hızlandırma (T4) | [Albion Codex](https://www.albioncodex.com/guides/albion-online-destiny-board-planning) |
| **Anno 1800** | Kampanya "hikâyeli öğretici": zorunlu, doğrusal hedef zinciri; oyuncuların ekonomiyi yeterince anlatılmadan iflas ettiği şikâyeti (baslangic §1, arama özeti) | **Üretim zinciri hedefleri** (tahıl → un → ekmek örneği Anno'da tüketim ihtiyacı olarak vardır, [Bread in Anno 1800](https://www.anno1800empirebuilder.com/bread-in-anno-1800/)): görev bir **talebi karşılamak** olarak çerçevelenir | Doğrusal ve zorunlu kampanya yapısı; "hikâye" (Alfa-0 kapsam dışı). Kampanya görev ayrıntıları bu turda doğrulanmadı (Wikipedia sayfası yalnız "hikâye kampanyası var" der) **(doğrulanmadı)** | [Wikipedia](https://en.wikipedia.org/wiki/Anno_1800) |
| **Capital Rift** | Üçüncü taraf ilk saat sırası: yemek arabası → ilk dükkân (≈8. dk) → arazi/çiftlik (≈17. dk) (video bölüm başlıkları, arama özeti). Geliştirici "ilk başta zor" ve "yeni öğretici sistemi" üzerinde çalıştığını söylüyor; görev içeriği **doğrulanamadı** | **Hedef zincirin biçimi:** ürün → dükkân → arazi/çiftlik (sahibin "döngü" keyfi) | Zorunlu işlem/restok **angaryası**; mini oyunlar (yemek pişirme). Rakibin kendi öğreticisinin görev yapısı bilinmediği için **kopyalanacak bir şey yok** (kopya riski düşük) | [TikTok: yeni öğretici](https://www.tiktok.com/@niksgames/video/7671413170463903007) · [YouTube sırası](https://www.youtube.com/watch?v=oNfawXo8q2A) (arama özeti) |
| **Mobil tycoon / idle (FTUE)** | Öğretici ≤5 dk, oyunu durdurmadan; **açık döngü:** hedef → ödül → daha uzun hedef; ilk zaferi erken ver | **Açık döngü** (her kavram bir sonrakini önerir); **durdurmayan** kartlar (modal yok) | Seri/günlük görev ve sayaçlı ödül (K13: günlük seri yok); zorunlu öğretici (Hay Day şikâyeti, baslangic T2) | [Udonis: FTUE](https://www.blog.udonis.co/mobile-marketing/mobile-games/first-time-user-experience) · [Game Developer: FTUE](https://www.gamedeveloper.com/design/best-practices-for-a-successful-ftue-first-time-user-experience-) (arama özeti) |
| **RuneScape / OSRS (MMO görevleri)** | **Tutorial Island zorunlu** ("Learning the Ropes" tamamlanmadan ana haritaya çıkılmaz); sonra quest'ler **doğrusal** (öncekini bitirme şartı), **beceri seviyesi şartlı** (örn. Magic 75), ödül **quest puanı + XP + alan açma**; 343 puanlık "quest cape" | Yalnız "görev bir **alan/yeni içerik tanıtımı**" fikri (bizde: kavram) | **Hepsi karakter ilerlemesine bağlı:** beceri seviyesi şartı, XP ödülü, quest puanı. Bizde seviye/XP yok (T7); "kilit" şartı kilitsiz yönelimle çelişir; zorunlu öğretici yasak | [OSRS: Quests](https://oldschool.runescape.wiki/w/Quests) · [Tutorial Island](https://oldschool.runescape.wiki/w/Tutorial_Island) |
| **EVE kariyer ajanları** | (baslangic §1) 5–10 ardışık görev, küçük ISK/gemi ödülü, kariyer kilidi yok | Zincir uzunluğu ve küçük ödül (zaten alındı) | — | [EVE Uni](https://wiki.eveuniversity.org/Career_Agents) |

**Çıkarılan sekiz ilke (Gİ ile §2.1'e girer):** (1) Stardew: cezasız, süresiz, opsiyonel. (2) Albion Journal: sıra serbest + **geriye dönük tamamlanma**. (3) Albion: kozmetik ağırlıklı ödül; **yüzde/tamamlama kademesi yok**. (4) Mobil FTUE: açık döngü, durdurmayan. (5) Capital Rift: ürün → dükkân → arazi döngüsü zevk veriyor; angarya vermiyor. (6) RuneScape'ten **ret**: seviye şartı, XP, doğrusal kilit, zorunlu öğretici. (7) Anno: "talebi karşıla" çerçevesi. (8) Stardew: pano (kısa) ve hedef (uzun) ayrı yüzler.

---

## 2. Görev sistemi tasarımı

### 2.1 İlkeler

| # | İlke | Dayanak |
|---|---|---|
| Gİ-1 | **Sıra serbest.** Görevler bağımlılık sıralıdır (ilk tarla olmadan ilk işleme olmaz) ama **kilitli değil:** önerilen sıra vardır, her açık kart herhangi bir sırayla yapılır | Albion Journal; Y-İ3 |
| Gİ-2 | **Modal yok, zorunlu öğretici yok.** Kart, sağ alt köşede/Dikkat panelinin altında; oyunu durdurmaz. Tek ana + ≤2 isteğe bağlı kart | baslangic Y-İ3; FTUE |
| Gİ-3 | **Tamamlanma oyun durumundan türetilir** (saf fonksiyon). Önceden yapılmış iş geriye dönük tamamlanır | Albion Journal |
| Gİ-4 | **Ödül kavrama bağlı, "ilk kez" ve tek seferlik;** ödül ≤ adımın bedelinin (bedelsizse getirdiği brüt gelirin) %25'i; bedelsiz ve gelirsiz adım (ilk üretim, dönüş, ihale teklifi, gözlem) yalnız kozmetik/bilgi; toplam ≤₺8.000; **gözlem görevleri ödülsüz** | K-5; çiftlik önleme |
| Gİ-5 | **Hiçbir ekonomi/ödül/kilit sistemi görev durumunu koşul olarak okumaz** (Rehber ödülü, sicil, ihale, kilit, kota; yalnız sunum önceliği hariç, bkz. GB-11). Rehber ödülü §5.4 koşullarını **doğrudan çekirdek durumundan** hesaplar | Kilitsizlik; GK-3 |
| Gİ-6 | **Kilitsiz yönelim:** yön sayfası açılmak için ön koşul istemez; yalnız yeni kavramlar ödül verir | docs/12 §3 |
| Gİ-7 | **Atlama bedelsizdir ve hesaba yazılır** (Atla/Kapat); atlanan kart "Kütüphane"de durur ve istenince açılır. Atlama, öneri motorunda kartı 48 sa gizler, tamamlanmayı etkilemez | Hay Day (T16); Stardew |
| Gİ-8 | **Tamamlama yüzdesi, rozet zinciri, günlük seri, kategori ödülü yok** | K13; Albion'dan ret |
| Gİ-9 | **Metin şablondur.** Görev adı/özet/ipucu çevrilebilir sabit metin anahtarlarıdır; LLM ajan görev yazmaz, tamamlamayı doğrulamaz, ödül vermez. (Kamu ihale **ilanı** ajan kaynaklı olabilir; görev kartı yalnız çekirdekteki ilan durumuna bakar) | canlı dünya §6.5; docs/12 §8 |
| Gİ-10 | **Ton sıcak ve yargılamaz:** "Kolay gelsin", "Hayırlı olsun", "Bereket", "Eline sağlık"; "başaramadın/geciktin/eksik" dili yok; kapalı görev "henüz değil" der | harman §5.3 ("Hayırlı olsun") |
| Gİ-11 | **Her görevin panel/harita karşılığı vardır; yürüyüş yalnız adaptasyondur** ve hiçbir koşulu **yürüyüş** belirlemez (gözlem görevleri hariç, o da ödülsüz) | A3 (harman), docs/11 ek karar |
| Gİ-12 | **Dikkat bütçesi:** ilk gün ≤30 dk, sonraki günler ≤10 dk emek öngörülür; tek günde en çok 3 yeni kart "önerilir" | 11 §7.1 |

### 2.2 Defterin anatomisi

```
Defter (tek nesne, hesaba bağlı)
├─ Bugün            ← Akşam Defteri: "sen yokken" özeti + "Kaldığın yer" kartı
└─ Sayfalar         ← Esnaf Defteri
   ├─ Açılış sayfası:  Tarım | Sanayi | Pazar        (kayıtta önerilen açık; diğerleri Kütüphane'de, kilitsiz)
   │    ├─ Bölüm "İlk gün"   (5–7 kart; baslangic §2.3 ile aynı)
   │    ├─ Bölüm "Hafta"     (gün 2–7 kartları; "önerilen gün" etiketi; kilit yok)
   │    └─ Bölüm "Ufuk"      (ihale, komşu ilçe, ikinci perde; Alfa-1 ağırlıklı)
   ├─ Yön sayfaları:   Fabrika | Ticaret | Belediye | Savunma | Laboratuvar   (ilk ilgili adımda ya da Fırsat Kartı kabulünde belirir)
   ├─ Takvimden:       yaklaşan olaylar (ön duyuru + hazırlık kartı)
   └─ Rehberlik (Alfa-1): Rehber ve yeni esnaf kartları
Kütüphane: atlanan, kapatılan ve tamamlanan kartlar; hesap düzeyinde "Kılavuzu kapat" anahtarı
```

| Kart durumu | Anlamı | Kim belirler |
|---|---|---|
| `gizli` | `gerektirir` karşılanmıyor (içerik yok) ya da sayfa kapalı | Katalog kapısı |
| `acik` | Görülebilir, yapılabilir | Durumdan |
| `onerilen` | Öneri motoru bu kartı öne çıkardı (en çok 1 ana + 2 isteğe bağlı) | Öneri motoru (§2.3) |
| `tamam` | Koşul sağlandı (anı kalıcı kaydedilir) | Durumdan, **sticky** (GK-5) |
| `atlandi` | Oyuncu "Atla" dedi (tamamlanabilir kalır) | Profil |
| `odulBekler` | Koşul sağlandı, ödül talep edilmedi | Profil |

**İlk gün bölümü** baslangic §2.3'teki "5–7 hedef"tir; **Hafta** ve **Ufuk** bu raporun ekidir. "Gün" numarası `OyuncuDurumu.katilmaZamani`'ndan sayılan **gerçek gündür ve yalnız öneri etiketidir;** oyuncu 3. gün gelirse "1. gün" kartları açıktır ve önerilir. 7. günden sonra Hafta bölümü kapanmaz, "önerilen gün" etiketi kalkar.

### 2.3 Öneri motoru ("sıradaki adım")

Tek kural listesi; ilk eşleşen **ana kart** olur, ardından en çok 2 isteğe bağlı kart gelir. Hepsi çekirdek durumundan türetilir (yeni sayaç yok).

| Sıra | Kural | Örnek ana kart |
|---|---|---|
| 1 | **Yaklaşan olay ≤3 gün** ve hazırlık koşulu sağlanmamış | "Kışa hazır ol: yakıt stokun düşük" |
| 2 | **Yarım iş:** inşaat bitti ama tesis pasif/yöntemsiz; stok depo kapasitesinde (israf); ▲ eksik girdi (Dikkat paneli maddesi) | "Gıda fabrikan elektrik bekliyor" |
| 3 | **Kritik yol:** ilk tamamlanmamış kavram (sıra: ilk_yapi → ilk_satis → ilk_isleme → zincir → ilk_dukkan → ilk_sozlesme) | "Bereket: ilk satışını yap" |
| 4 | **Açık yan görev** (komşu ilçe, takvimden, yön sayfası) | "Komşu ilçeye selam" |
| 5 | Hiçbiri | **Kart yok** ("Bugün yapacak bir şey yok" meşrudur; Fırsat Kartı kuralı) |

Atlanan kart 48 sa öneri dışı kalır. Aynı ana kart 3 kez art arda gösterilip etkileşim olmadıysa motor sonraki kuralı seçer (sürüklememe). Fırsat Kartı (imza §4.2) ile ilişkisi: Fırsat Kartı **pazar/yön fırsatını** gösterir (günde ≤1), Defter kartı **öğretici adımı**; ikisi aynı Dikkat panelinde en çok 2 madde tutar ve **birbirini bastırmaz:** Fırsat Kartı ilk 7 gün Defter ana kartı varken gösterilmez (çakışma önleme).

### 2.4 "Kaldığın yer": geri dönen oyuncu

Hedef: dönüşte **ilk 10 saniyede** tek net eylem; **geçmişi yargılamama.**

| Yokluk süresi | Bugün sayfasında | Ana kart | Not |
|---|---|---|---|
| <6 sa | Defter kapalı; yalnız Dikkat paneli | — | Sık girenin ekranı değişmez |
| 6–48 sa | Akşam Defteri: sen yokken üretim/satış/olay (A12) | Öneri motoru §2.3 | Çevrimdışı üretim tembel stokla zaten var |
| 2–14 gün | + "Bu arada: 1 kart açıldı, 1 olay yaklaşıyor" | Kural 1–2 (olay, yarım iş) | Eksik girdiyle durmuş zincir varsa **önce o** |
| **14–45 gün** (hareketsizlik **uykusu**; üretim durur, vergi donar; docs/11 §7.8) | "Yurdun seni bekliyordu" | **"Üretimi yeniden aç"** (koşul: pasif tesis sayısı = 0) | Ödül yok; yargı yok; kaybedilen üretim sayısı **gösterilmez** (WoW Rested çerçevesi: bonus gibi, ceza gibi değil) |
| **45–90 gün** (yapı çürümesi %2/gün) | + "Yapıların yıpranmış" | **"Onarım"** (`genel_onarim`; koşul: `asinmaPpm` eşiğin altında) | Gerçek komut var (B2) |
| **≥90 gün** (açık artırma) | "Parselin satışa çıktı/satıldı; alacağın var" | **"Yeniden başlangıç sayfası"** (GB-8: hibe kuralı sahip kararı) | GS-4 |

Dönüş sahnesi: yürüyüşte **son yapının önünde doğuş** (harman §5.6); Defter açılışta kendiliğinden açılmaz, kart küçük ve Atlanabilirdir. Geri dönen Rehber ya da ilerlemiş oyuncu için Bugün sayfası olay ve Rehberlik kartlarını öne alır (§2.6).

### 2.5 Yön değiştiren oyuncu: yeni defter sayfası (kilitsiz yönelim)

**Açılma tetikleri** (üçü de oyuncunun *yaptığı* ya da *kabul ettiği* şeydir, kilit değil): (a) ilgili katmanın **ilk yapısı** yerleştirildi (çekirdek: `tesis_insa_hucre`/`yapi_yerlestir` kabul); (b) **Fırsat Kartı kabulü** ("İlçende gıda fabrikası yok…", imza §4.2); (c) oyuncu Kütüphane'den sayfayı elle açtı. Sayfa belirince Dikkat panelinde tek satır: "Yeni sayfa: Fabrika". **Yalnız yeni kavramlar ödül verir;** daha önce alınmış kavram (ilk_isleme, ilk_satis…) ödülsüzdür ama geriye dönük tamamlanır.

| Yön sayfası | Tetik (kilitsiz) | Üç görev (ad · koşul alanı · ödül) | Alfa |
|---|---|---|---|
| **Fabrika** (Tarım/Pazar → Sanayi) | İlk madenci/santral/çelik yapısı; Fırsat Kartı | "Işık yansın: ilk santral" · `tesisler[tur=santral]` ∧ `elektrik.uretimMili>0` · **elektrik_kur ₺400 (mal)** — "Hammaddeni bul" · `kesifSayisi[mal]>0` (`arama_sondaji`) · ödülsüz — "İlk çelik" · `uretimToplam[celik]>0` · kavram zaten alındıysa ödülsüz | A0 |
| **Ticaret** (Tarım/Sanayi → Pazar) | İlk Ticaret ofisi; ithalat emri | "Fiyat farkını ölç" · her iki yönde emir (`ticaretEmirleri`) · ödülsüz (bilgi: makas) — "Kendi tezgâhın" (`ilk_dukkan`) — "Toptan söz" (`ilk_sozlesme`) | A0 (ilk iki), A1 |
| **Belediye** (→ Politika/Devlet) | Fırsat Kartı "mahallende aday yok"; Muhtarlık yapısı | "Muhtarlık panosuna bak" (gözlem, ödülsüz) — "İlk oyun" (ödülsüz) — "Ortak projeye ilk katkı" · ortak proje katkı kaydı · **ilk_ortak_katki ₺200 (mal)** | A1 |
| **Savunma** (→ Askeri) | İlk ordugâh/birlik; baskın ön duyurusu | "Ordugâh" · `tesisler[tur=ordugah]` · "İlk birlik" · `birlikler>0` · "Savunma duruşu" · `savunma.durus≠normal` — hepsi ödülsüz (askeri güç ekonomiden doğar; ödül avantaj sayılır) | Yapı kümesi gelince (baslangic B-8) *(güncellendi: askeri-katman-v1 §4.4, docs/12 §13 Y-35: Savunma sayfası Alfa-0'da açılır (bayraklı), 9 görev, hepsi ödülsüz ve sırasız)* |
| **Laboratuvar** (→ Bilim/Teknoloji) | İlk Atölye-Lab; yayılım fırsatı (imza §4.2 "bu düğümü 2 oyuncu açtı") | "İlk araştırma" · `OyuncuDurumu.teknolojiler.length>0` ∨ `arastirma≠null` · **ilk_arastirma ₺400 (para)** — "Bedeli oku" (dışlayan dal uyarısı, gözlem) — "Yayılım indirimi" (bilgi) | A0 (Atölye-Lab yer tutucu ise A1) |

**Dışlayan teknoloji dalları** (geri dönüşsüz, baslangic §3.3) bu sayfalarda **görev olarak sunulmaz;** yalnız "Bedeli oku" kartı vardır ve ödülsüzdür (görev, geri dönüşsüz seçime itme aracı olmaz).

### 2.6 Rehberlik ile bağlantı

| Boyut | Kural |
|---|---|
| **Yeni esnaf tarafı** | Defterde **"Bir rehber bul"** isteğe bağlı kartı (gün 3'ten sonra; koşul: `rehberlikSozlesmesi` aktif, A16, **Alfa-1**). Atlanır |
| **Rehber tarafı** | **Rehberlik sayfası:** "Bu hafta ilçende yeni 2 esnaf var" (ilçe panosu verisi), "Alt sözleşme devret" (A16), kendi defterinde yeni kavram yoksa **yön önerisi yok** |
| **Alt sözleşme = `ilk_sozlesme`** | Rehberin devrettiği alt sözleşmenin tesliminde yeni esnafın `ilk_sozlesme` kavramı **kaynaktan bağımsız** tamamlanır (NPC panosu da, Rehber de aynı yüklem) |
| **Rehber ödülünün bağımsızlığı (değişmez Gİ-5)** | baslangic §5.4: "7. günde ≥2 çalışan yapı + ≥1 teslim edilen sözleşme". Bu koşul **görev kavramı değil çekirdek yüklemidir** (`tesis_hazir ≥2` ∧ `sozlesme_teslim ≥1`); aynı yüklem kütüphanesi paylaşılır, ama Rehber ödülü *görev durumunu okumaz.* Yeni esnaf defteri kapalı olsa da koşul değerlendirilir; Defter'i "ödüller için doldurma" baskısı doğmaz |
| **Gizlilik** | Rehber, yeni esnafın **defterini** göremez (Atla/Kapat kişiseldir); yalnız ilçe panosunda herkese açık ekonomik göstergeleri görür. Yeni esnaf "Yardım iste" ile istediği kavram listesini (opt-in) paylaşabilir |
| **Çifte tahsil önleme** | Görev ödülü (hesap başına tek, ₺5.650'ye kadar; tavan ₺8.000) ile Rehber ödülü (₺4.000/yeni esnaf) **ayrı kanaldır**; ikisi de ayrı hesap + bağımsız karşı taraf koşulu ve "seçim haftasında dondurma" kurallarına tabidir. Çoklu hesap çiftliği için hibenin (₺50.000) kendisi asıl hedeftir; görev ödülü marjinaldir ama aynı tek-hesap/cihaz kontrolüne bağlanır (11 §10) |

### 2.7 Olayların görev olarak kullanılması: "Takvimden" sayfası

**Şablon.** Olay görevi: `tetik: takvim` (takvim paketinden gelen olay + ön duyuru süresi), kart ön duyuruyla belirir ("14 gün kaldı"), bir **hazırlık koşulu** (çekirdek durumundan) ve **ödül yok.** Neden ödülsüz: olayın kendisi talep getirir; ek para K-5 ilkesini (talep zamanlaması değişir, toplam değişmez) bozar.

| Olay (kaynak) | Ne zaman (2026–27 gerçek takvim) | Görev adı (sıcak) | Hazırlık koşulu (alan) | Ödül | Aşama |
|---|---|---|---|---|---|
| **Hasat dönemi** (iklim takvimi, ürün penceresi: Ekim'de zeytin, mısır hasadı, buğday ekimi) | Ekim–Kasım | "Hasat bereketli olsun" | `ekimPpm`'de ürün payı ∧ ürün stoğu artışı | Yok (hasatın kendisi) | A0 |
| **Kış hazırlığı** (E2) | Ekim–Kasım; 21 gün ön duyuru | "Kışa hazır ol" | `stoklar[yakit]` ≥ eşik ∨ yakıt ithalat emri | Yok | A0 |
| **Cumhuriyet Bayramı** (E8, yalnız süs; 2429 sayılı Kanun) | **28 Ekim 13:00 – 29 Ekim 2026** | "Meydan süslensin" | Meydan süsü kozmetik hakkı; koşul yok | **Kozmetik** (tebrik kartı) | A0 |
| **Okul açılışı dönemi** (E1) | Eylül (Eylül 2027'de tekrar) | "Okul yolu" | `stoklar[tekstil/kırtasiye]` (katalog gelince) | Yok | A0 (katalog) |
| **Salı Pazarı** (İ-2) | Haftalık, mahalle başına gün | "Pazar günü tezgâhın" | `pazar_kapanis`'ta satış >0 | Yok | A0-hafif/A1 |
| **Dini bayramlar** (hatırlatma takvimi) | **9–11 Mart 2027** (arife 8 Mart 13:00), **16–19 Mayıs 2027** | **Görev değil, hatırlatma kartı:** "Bayram alışverişi başlıyor: gıda talebin artıyor; stoğunu gözden geçir" | — | **Yok; kozmetik de yok** (yalnız talep + hatırlatma; "Kurban" sözcüğü yok; resmî ad) | A1 (sahip onayı) |
| **Gurbetçi Yaz Dönüşü** (N8) | **15 Haziran – 31 Ağustos 2027;** ön duyuru 14 gün | "Misafir geliyor: ilçeye hoş geldin" | `stoklar[imza ürün]` ≥ eşik ∧ (`tezgâh/dükkân` var); memleket beyanı varsa o ilçede **bilgi kartı** | Yok (haftalık sabit gurbetçi havuzu) | A1 |
| **Düğün dönemi** (E5) | Haziran–Eylül, hafta sonu tepe | "Düğün dönemi: tekstil ve gıda" | İlgili mal stoğu | Yok | A1 |
| **İl fuarı** (İ-3) | Ay bazlı | "Fuara hazırlık" | Kalite eşiği | Yok | A1 |

**İlk hafta için "Takvimden" yuvası.** İlk 7 günde, Takvimden sayfasında **ön duyurusu başlamış en yakın olay** isteğe bağlı kart olarak 2. günden itibaren gösterilir (yoksa kart yok). Böylece Ekim 2026'da katılan "Cumhuriyet Bayramı süsü" ve "kış hazırlığı"nı, Haziran 2027'de katılan **gurbetçi yaz dönüşünü** ilk haftada görür; dünya gerçek zamanlı olduğu için **ilk hafta içeriği katılış tarihine göre farklıdır** ve bu bir özelliktir ("dünya canlı"). Gurbetçi ayrıca "memleketini beyan et" (listeden, kanıtsız, 90 günde 1 kez; imza §1.2) isteğe bağlı kartı olarak yer alır.

**Hassasiyet.** Dini bayram görevi yoktur: yalnız **talep eğrisi + hatırlatma + nötr** kozmetik (meydan süsü); kutlama metni, dua, figür, "Kurban" sözcüğü yok; ad Diyanet resmî adıdır; **sahip onayı** (canlı dünya §5.7). Deprem olayı ve görevi yoktur.

---

## 3. Görev zincirleri: ilk yedi gün

### 3.1 Kavram sözlüğü ve ödül defteri

Her görev aşağıdaki **kavramlardan birinin** bir açılıştaki yüzüdür. Ödül, atlanabilirlik ve çekirdek alanı **kavrama** bağlıdır; zincir tabloları (§3.2–3.4) açılışa özgü adı, tetiği, yürüyüşü ve paneli verir.

**Ödül kuralı (tek cümle).** Ödül, adımın **bedelinin** (bedelsiz adımda adımın getirdiği **brüt gelirin**) en çok %25'idir; bedelsiz **ve** gelirsiz adımlar (ilk çıktı, dönüş, ihale teklifi, gözlem) yalnız kozmetik/bilgi verir. Tablodaki her satır bu kuralla hesaplanmıştır.

Ödül türü: **M** mal (bölge stoğuna), **P** para (hazine), **K** kozmetik, **B** bilgi (Ürün Atlası görünürlüğü; keşif görünürlüktür, üretim izni değil; çeşitlilik §3). Değerler **taban değerle** (çelik ₺120, parça ₺180, gıda ₺70).

| Kavram | Öğrettiği döngü adımı | Tamamlanma (çekirdek alanı) | Ödül | Taban değer | Adım bedeli / geliri (≤%25 kuralı) | Atlanabilir |
|---|---|---|---|---|---|---|
| `ilk_yapi` | **Üret:** ilk üretim yapısı | `HucreDurumu.tesis` tanımlı ∧ `insaat` yok ∧ `BolgeDurumu.tesisler[tur]` | 5 çelik **M** + tabela rengi **K** | ₺600 | yapı ≈ ₺4.200–8.400 → %7–14 | Evet |
| `ilk_uretim` | **Üret:** ilk çıktı stokta | `BolgeDurumu.uretimToplam[mal] > 0` (anlık = `uretimToplam` + `uretimOrani·(t−uretimT0)`) | **K** ("ilk hasat" damgası) + **B** (Atlas satırı) | ₺0 | — | Evet |
| `ilk_satis` | **Sat:** ilk gerçekleşen satış | `OyuncuDurumu.ticaretDefteri.toplam.brutIhracat > 0` (ya da `ticaretEmirleri[].gerceklesenSaat > 0`) | **P** | ₺500 | adım bedelsiz; getirdiği gelir ≈ ₺10.000+ → ≈%5 | Evet |
| `ilk_isleme` | **Dönüştür:** ham mal → işlenmiş mal | `tesisler[tur ∈ işleme]` ∧ `uretimToplam[işlenmiş mal] > 0` | 5 parça **M** | ₺900 | yapı ₺7.000–14.000 → %6–13 | Evet |
| `zincir_kapandi` | **Döngü:** kendi çıktını kendi girdin yapma | Portföy özeti `zincirTamligi ≥ 1` (A11): bir tesisin çıktısı aynı oyuncunun başka tesisinin girdisi | **P** | ₺700 | ikinci yapı ≈ ₺3.000–10.000 → %7–23 | Evet |
| `ilk_dukkan` | **Dağıt:** kendi satış noktan (Alfa-0: Ticaret ofisi; hedef: market/mağaza) | `tesisler[tur ∈ {ticaret_ofisi, market, bakkal, ...}]` | 10 çelik **M** | ₺1.200 | Ticaret ofisi ₺5.000 + 10 çelik + 5 parça (≈₺7.100) → ≈%17 | Evet |
| `ilk_sozlesme` | **Söz:** ilk teslim edilen sözleşme (NPC pano, zincir market, Rehber alt sözleşmesi) | `sozlesme_teslim ≥ 1` (A6/N14 kaydı; **henüz çekirdekte yok**) | **P** | ₺500 | teminatsız (Y9); sözleşme geliri ≤₺2.000 → %25 | Evet |
| `ilk_ihale_teklif` | **Kamu:** ilk ihale teklifi (kamu bir alıcıdır) | `ihale_teklif ≥ 1` (N4; **v1.5**) | **K** (kozmetik: defter damgası) | ₺0 | bedelsiz ve gelirsiz → yalnız kozmetik | Evet |
| `ikinci_ilce` | **Yayıl:** komşu ilçede ilk hücre/yapı | `MulkOyuncuDurumu.ilceHucre.length ≥ 2` | **P** | ₺250 | hücre ≈ ₺1.000–1.500 → %17–25 | Evet |
| `ilk_donus` | **Dünya sen yokken işler:** ≥6 sa sonra dönüş | Komut günlüğü: iki kabul edilen komut arası ≥6 sa (sunucu tarafı) | **K** (defter damgası) + **B** | ₺0 | bedelsiz ve gelirsiz → yalnız kozmetik/bilgi; D1 etkisi Y4 ile ölçülür | Evet |
| `elektrik_kur` (yön) | Fabrika: ilk elektrik | `BolgeElektrikDurumu.uretimMili > 0` | **M** | ₺400 | santral ₺20.000+ | Evet |
| `ilk_arastirma` (yön) | Laboratuvar: ilk teknoloji | `teknolojiler.length > 0` | **P** | ₺400 | Atölye-Lab ₺8.000 | Evet |
| `ilk_ortak_katki` (yön) | Belediye: ilk ortak proje katkısı | Ortak proje katkı kaydı (A1) | **M** (katkının %25'i eşleştirme, ≤₺200) | ₺200 | katkı ≥₺800 → %25 | Evet |
| **Toplam tasarlanan** | | | | **≈ ₺5.650** (açılış kavramları ₺4.650 + yön ₺1.000; tavan ₺8.000; ₺2.350 pay) | | |

**Ödül ekonomisi.** ₺5.650 / hibe+kit ≈ ₺85.600 = **%6,6**; para payı (ilk_satis 500 + zincir 700 + sözleşme 500 + ilçe 250 + araştırma 400 = ₺2.350) toplamın %42'si. Davetli 200 hesap için en çok ₺1,13 milyon ⇒ hibenin (₺10 milyon) %11,3'ü; para arzı panosunda **ayrı satır** ("görev ödülü") olur. **K-5 ile ilişki:** görev ödülü, hibe ve başlangıç kiti gibi **"yeni oyuncu paketi" kanalının parçasıdır** (hesap başına tek seferlik, tavanlı giriş; sürekli akış ya da yeni NPC alıcı değildir). **Kural:** ödül görevin bedelini karşılamaz; **kavram başına bir kez**; ikinci açılışın aynı kavramı ödülsüzdür.

### 3.2 Zincir tablolarının okunması

Sütunlar: **#** · **Ad (sıcak)** · **Hedef ve oyun içi tetik** · **Tamamlanma alanı (Alfa-0 / hedef)** · **Yürüyüş · Panel**. Ödül ve atlanabilirlik için §3.1'e bakılır (kavram sütunu parantezde). Her zincir "Gün" etiketi **öneridir.** Süreler hedeftir: erken oyun çarpanı ilk 24 saatte inşa süresini %10'a indirir (Çiftlik 2 sa → **12 dk**, Ahır 4 sa → 24 dk, Santral 10 sa → 60 dk; `parametreler.json` `yapiInsaSaati`, `erkenOyun`); 25.–168. saatte süre lineer normale döner (Çiftlik 2 sa, Ahır 4 sa).

**Sahibin zincirlerine hizalama (Alfa-0 gerçeği ↔ hedef):**

| Sahibin tarifi | Alfa-0 gerçeği (14 mal, 18 tesis) | Hedef sürüm (katalog genişleyince) | Eksik içerik (başka rapor/tur) |
|---|---|---|---|
| **Buğday → un → ekmek → kendi marketin** | Buğday (ekim ürünü `bugday`, çıktı `tahil`) → **Ahır besiciliği** (tahıl → gıda + gübre, **elektriksiz**) → **Ticaret ofisi** ("kendi tezgâhın") → NPC pazara/siparişe satış | Buğday → **Değirmen** (`un`) → **Fırın** (`ekmek`) → **lojistik (Garaj/arka plan)** → **Mahalle Bakkalı / kendi marketin** (N14) | `un`, `ekmek`, perakende dükkânı (GB-3); `un` çeşitlilik §7 Tier 1 #13 A0-ops |
| **Cevher → demir/alüminyum → pencere → pencere mağazası** | **Cevher madeni** (+ Santral) → **Çelikhane** (`celik`) → **Parça hattı** (`parca`) → Ticaret ofisi ("kendi tezgâhın") + Sanayi alıcısı sözleşmesi | Maden (boksit/demir cevheri) → **Demir ve Alüminyum** eritme → **Cam** (silis) + **doğrama** → **Pencere atölyesi** → **Pencere mağazası** | `boksit`, `aluminyum`, `cam`, `pencere`, perakende dükkânı |
| (Pazar) önce sat | Kit stoğunu sat → fiyat farkı → ilk üretim → ilk dükkân | Hal/komisyoncu (N3), zincir market tedariği (N14) | N3, N14 (A1) |

### 3.3 Tarım zinciri ("Ekeyim, biçeyim, satayım")

Ova ilçe; **Çiftlik sepeti** (çelik 120, parça 40, gıda 200). Toplam hedef emek: gün 0 ≈25 dk, sonraki günler ≤8 dk.

| # | Ad | Hedef · tetik | Tamamlanma (Alfa-0 / hedef) | Yürüyüş · Panel |
|---|---|---|---|---|
| T1 · Gün 0 | **Kolay gelsin, ilk tarlan** (`ilk_yapi`) | Çiftliği hayaletle yerleştir; maliyet kartı "gereken/var". Tetik: Muhtarın hibe kartı + yurda varış | `tesisler[ciftlik]` hazır (12 dk) / aynı | Yürüyüş: yurda yürü, tarla çiti büyür · Panel: yapı paleti, önerilen tek yapı öne çıkar |
| T2 · Gün 0 | **Bereket: kit gıdanı sat** (`ilk_satis`) | Ambardaki 200 gıdayı sat (UI "sat" tek seferlik miktarı oran emrine çevirir). Tetik: T1 inşa çubuğu başladığında | `brutIhracat > 0` / aynı | Yürüyüş: Açılış Tezgâhı ya da çarşı alıcısı, "+₺85 hayırlı olsun" (harman §5.3) · Panel: Pazar paneli, fiyat ve "piyasadan ~%10 düşük" notu |
| T3 · Gün 0 | **Hayırlı olsun, ilk ürün** (`ilk_uretim`) | İlk tahıl hasadı stokta. Tetik: T1 bitişi | `uretimToplam[tahil] > 0` / `ekimPpm` buğday | Yürüyüş: tarlada hasat nabzı · Panel: tesis kartı "+₺/saat" |
| T4 · Gün 1 | **Ocak tütsün: tahılı gıdaya çevir** (`ilk_isleme`) | Ahırı kur, tahıl girdisi bağla. Tetik: T3 sonrası "tahıl stokun birikiyor" Dikkat kartı | `tesisler[ahir]` ∧ `uretimToplam[gida]` (Ahır `ahir_besi`) / **Değirmen → Fırın:** `uretimToplam[un]`, `[ekmek]` | Yürüyüş: ahır yanında NPC çoban · Panel: yapı paleti (Ahır 24 dk) |
| T5 · Gün 1–2 | **Dünya sen yokken de işler** (`ilk_donus`) | Çık, ≥6 sa sonra dön; Akşam Defteri açılır. Tetik: oturum sonu "çıkabilirsin" notu | Komut günlüğünden ≥6 sa aralık | Yürüyüş: son yapının önünde doğuş · Panel: Bugün sayfası |
| T6 · Gün 2 | **Zincir kapansın** (`zincir_kapandi`) | Ahırın girdisini kendi tarlandan karşıla (tahıl ambarda alım yerine tarladan). Tetik: Dikkat "tahılı pazardan alıyorsun" | Portföy `zincirTamligi ≥ 1` / aynı | Yürüyüş: tarla → ahır kısa yol çizgisi (görsel) · Panel: zincir şeması |
| T7 · Gün 2–3 | **Kendi tezgâhın** (`ilk_dukkan`) | Ticaret ofisini kur; emir yuvası 4'ten fazla. **Hedef:** Mahalle Bakkalı/market. Tetik: T2 sonrası "satış kanalın NPC; kendi tezgâhın olsun" | `tesisler[ticaret_ofisi]` / `tesisler[market|bakkal]` | Yürüyüş: çarşıda dükkân tabelası (ad + simge) · Panel: yapı paleti |
| T8 · Gün 3 | **Toprağı dinlendir** (isteğe bağlı; ödülsüz, B) | Ekim planında baklagil/nadas payı; toprak yıpranması | `ekimPpm[baklagil] > 0` ∨ `[nadas] > 0` | Yürüyüş: tarla rengi · Panel: Tarım paneli ekim planı |
| T9 · Gün 3–4 | **Söz senet: ilk siparişin** (`ilk_sozlesme`) | Çarşı iş panosundan küçük, teminatsız sipariş al ve teslim et. **Tetik: A6/N14 gelene kadar gizli** | `sozlesme_teslim ≥ 1` (A6) | Yürüyüş: meydan ilan panosu · Panel: Sözleşmeler sekmesi |
| T10 · Gün 4–5 | **Komşuya selam: yan ilçe** (`ikinci_ilce`; önce gezme ödülsüz) | Dolmuşla/haritadan komşu ilçeyi gez (**gözlem, ödülsüz**), imzasını gör; isteğe bağlı oraya hücre al | `ilceHucre.length ≥ 2` | Yürüyüş: dolmuş + kaşif noktaları · Panel: harita, ilçe kartı |
| T11 · Gün 5–6 | **Takvimden bir sayfa** (§2.7) | En yakın olay (ör. kış hazırlığı) ön duyuru kartı | Olay hazırlık koşulu; ödülsüz | Yürüyüş: çay ocağı söylentisi · Panel: Takvimden |
| T12 · Gün 7 | **Ufukta ihale** (`ilk_ihale_teklif`) | **Alfa-0:** ihale/kamu alım panosunu **oku** (ilan; gözlem, ödülsüz). **Hedef:** ilk küçük işe teklif ver (kapalı teklif, teminatsız ilk iş, kendi ihalesine giremez) | Alfa-0: gözlem; hedef: `ihale_teklif ≥ 1` (N4, v1.5) | Yürüyüş: belediye ilan panosu · Panel: Kamu sekmesi |
| T13 · Gün 7 | **Haftanın hesabı** | Haftalık özet: portföy dağılımı, ilk kâr/zarar; **ikinci perde** kartı ("yönetmek mi, savunmak mı?": yön sayfaları) | Gözlem; ödülsüz | Yürüyüş: Muhtar ile iki cümle · Panel: Defter → Sayfalar |

### 3.4 Sanayi zinciri ("Zincir kurmak, ölçek büyütmek")

Kıyı/havza ilçe; **Atölye sepeti** (çelik 120, parça 40, cevher 150, kömür 100, yakıt 60). **Zor açılış:** Alfa-0'da Sanayi hem elektrik hem ham madde ister; 6 hücrelik yurt Santral 3 + Cevher madeni 2 = 5'i karşılar, Çelikhane (3 hücre) için **hücre genişletme** gerekir (baslangic §3.2, Ç2). Zincir bunu **bir öğretim** olarak taşır: T4'ün maliyet kartı "yer yok, 3 hücre al" der. Damar yoksa (il merkezi rezervi `gerekliRezerv`) yapı reddedilir; Yerleş skoru Sanayi önerisini yalnız damarı olan ilçede yapar.

| # | Ad | Hedef · tetik | Tamamlanma (Alfa-0 / hedef) | Yürüyüş · Panel |
|---|---|---|---|---|
| S1 · Gün 0 | **Kolay gelsin, önce ışık** (`ilk_yapi`) | Santrali kur (kitteki kömür 100 yakıt olur). Tetik: Muhtar kartı + "sanayi elektrik ister" Dikkat ipucu | `tesisler[santral]` hazır (60 dk) | Yürüyüş: baca dumanı yok (sakin görsel) · Panel: yapı paleti |
| S2 · Gün 0 | **Bereket: ilk satış** (`ilk_satis`) | Kit fazlası (yakıt/cevher) sat; "kitin bir kısmını satıp nakit yap" | `brutIhracat > 0` | Yürüyüş: çarşı alıcısı · Panel: Pazar paneli |
| S3 · Gün 0–1 | **Toprağın altı: ilk cevher** (`ilk_uretim`) | Cevher madeni kur (`gerekliRezerv`), elektrik bağla. **Hedef:** boksit/demir cevheri | `uretimToplam[cevher] > 0` (`yuzey_cevher`) | Yürüyüş: maden girişi · Panel: yapı paleti, rezerv göstergesi |
| S4 · Gün 1–2 | **Ocak tütsün: ilk çelik** (`ilk_isleme`) | Çelikhane (3 hücre; **hücre genişlet**) + kömür; `yuksek_firin`. **Hedef:** Demir ve Alüminyum eritme | `uretimToplam[celik] > 0` / `[demir]`, `[aluminyum]` | Yürüyüş: çelikhane silueti · Panel: yapı paleti + hücre maliyet kartı |
| S5 · Gün 2 | **Dünya sen yokken de işler** (`ilk_donus`) | Çık/dön; "sen yokken 60 çelik üretildi" | Komut günlüğü | Bugün sayfası |
| S6 · Gün 3–4 | **Kendi bakım parçan** (`zincir_kapandi`) | Parça hattı kur: çeliği parçaya çevir; **bakım girdisi parçayı** kendin üret (tüm tesisler parça ister). **Hedef:** cam + doğrama → pencere atölyesi | Portföy `zincirTamligi ≥ 1`; `uretimToplam[parca] > 0` / `[pencere]` | Yürüyüş: atölye içi · Panel: zincir şeması |
| S7 · Gün 4–5 | **Kendi tezgâhın** (`ilk_dukkan`) | Ticaret ofisi ("kendi tezgâhın"). **Hedef:** **pencere mağazan**. Tetik: S2 sonrası "kanalın NPC; kendi satış noktan olsun" | `tesisler[ticaret_ofisi]` / `tesisler[pencere_magazasi]` | Yürüyüş: çarşıda dükkân tabelası · Panel: yapı paleti |
| S8 · Gün 5–6 | **Söz senet: ilk sanayi siparişin** (`ilk_sozlesme`) | **Sanayi alıcısı** (NPC, çelik/parça, dar makas −%5, sözleşmeli; çeşitlilik §5 A0) siparişini teslim et. **A6/alıcı gelene kadar gizli** | `sozlesme_teslim ≥ 1` | Yürüyüş: OSB/Han panosu · Panel: Sözleşmeler |
| S9 · Gün 6 | **Komşuya selam: yan ilçe** (`ikinci_ilce`) | Komşu ilçeye hücre al; **ham madde için** (damar farkı) | `ilceHucre.length ≥ 2` | Dolmuş · harita |
| S10 · Gün 7 | **Ufukta ihale** (`ilk_ihale_teklif`) | Alfa-0: kamu alım ilanını (çelik/parça ihtiyacı) **oku**; hedef: ilk teklif (benzer iş puanı için portföy %10: parça hattın var) | Gözlem / `ihale_teklif ≥ 1` | Kamu sekmesi |
| S11 · Gün 7 | **Haftanın hesabı** | Haftalık özet + ikinci perde | Gözlem | Defter |

### 3.5 Pazar zinciri ("Al-sat, sözleşme, fiyat farkı")

Liman/çarşı/kavşak ilçe; **Çarşı sepeti** (çelik 120, parça 40, gıda 100, tahıl 100, yakıt 40). **Alfa-0 gerçeği:** tek küresel NPC pazar, makas ~%20 (ithalat ×1,1, ihracat ×0,9); arbitraj imkânı düşüktür; bu yüzden zincir **"fiyat farkını gör, sonra üret, sonra dağıt"** der ve oyuncuyu dürüstçe üretime yönlendirir (baslangic §3.1).

| # | Ad | Hedef · tetik | Tamamlanma (Alfa-0 / hedef) | Yürüyüş · Panel |
|---|---|---|---|---|
| P1 · Gün 0 | **Bereket: ilk satış** (`ilk_satis`; **sıra değişti: önce sat**) | Üç maldan birini sat (tahıl, gıda, yakıt). Tetik: Yerleş sonrası ilk kart | `brutIhracat > 0` | Çarşı alıcısı · Pazar paneli |
| P2 · Gün 0 | **Fiyat farkını ölç** (ödülsüz, bilgi) | Aynı malda alış ve satış emri ver; **makas** (~%20) kartı görür. Tetik: P1 sonrası | `ticaretEmirleri` her iki yönde ∧ `brutIthalat > 0` | Çarşıda iki alıcı tabelası (alış/satış) · Pazar paneli fiyat bandı |
| P3 · Gün 0–1 | **Kolay gelsin, kendi tezgâhın** (`ilk_dukkan`) | Ticaret ofisini kur (emir yuvası artar, komisyon/makas indirimi). **Pazar'da `ilk_dukkan` erken gelir** | `tesisler[ticaret_ofisi]` | Dükkân tabelası · yapı paleti |
| P4 · Gün 1 | **Hayırlı olsun, ilk ürün** (`ilk_yapi` + `ilk_uretim`) | "Makas ödemek yerine kendin üret": en yakın üretim (Çiftlik) kur | `uretimToplam[tahil] > 0` | Tarla çiti · yapı paleti |
| P5 · Gün 1–2 | **Dünya sen yokken de işler** (`ilk_donus`) | Çık/dön | Günlük | Bugün |
| P6 · Gün 2–3 | **Ocak tütsün: işle** (`ilk_isleme`) | Ahır/gıda fabrikası; **işlenmiş mal makası cebinde tut** | `uretimToplam[gida] > 0` | Yapı paleti |
| P7 · Gün 3–4 | **Söz senet: ilk siparişin** (`ilk_sozlesme`) | Pazar oyuncusunun güçlü yönü: **ayrılmış sipariş kotası** (Y8: NPC siparişlerinin ≥%30'u <30 günlük hesaplara). A6'ya bağlı, gizli olabilir | `sozlesme_teslim ≥ 1` | İlan panosu · Sözleşmeler |
| P8 · Gün 4–5 | **Salı Pazarı'na bak** (ödülsüz, gözlem) | Mahallenin pazar günü kartı (hafta günü, 07–17, hacim); A1'de tezgâh başvurusu | Gözlem (A0-hafif); A1: `pazar_kapanis` satışı | Pazar yeri · Pazar paneli |
| P9 · Gün 5–6 | **Komşuya selam: liman ilçesi** (`ikinci_ilce`) | Fiyat farkı/imza için yan ilçe | `ilceHucre.length ≥ 2` | Dolmuş · harita |
| P10 · Gün 7 | **Ufukta ihale** + **Haftanın hesabı** | İhale panosunu oku; haftalık özet; ikinci perde | Gözlem | Kamu sekmesi · Defter |

**Zincir erişilebilirlik özeti.**

| Zincir | Kavram sayısı | Ödüllü kavram | Ödül toplamı (açılışa özgü, yön sayfaları hariç) | Alfa-0'da çalışan kavram | Alfa-0'da gizli (içerik yok) |
|---|---|---|---|---|---|
| Tarım | 9 | ilk_yapi, ilk_satis, ilk_isleme, zincir, ilk_dukkan, ikinci_ilce, (sözleşme) | ₺4.650 (hepsi alınırsa) | 7 | ilk_sozlesme, ilk_ihale_teklif |
| Sanayi | 9 | aynı | ₺4.650 | 7 | aynı |
| Pazar | 8 | aynı (ilk_yapi P4'te alınır) | ₺4.650 | 6 | aynı |

(Hepsi aynı kavram sözlüğünden geldiği için bir oyuncunun **toplam tavanı** tek hesapta ≤₺5.650'dir (tavan ₺8.000): aynı kavram ikinci zincirde ödülsüzdür.)

---

## 4. Karşılaştırma tablosunun bizim için sonucu

| Soru | Cevap | Gerekçe |
|---|---|---|
| Görev sistemini **karakter ilerlemesi** gibi mi tasarlıyoruz? | **Hayır.** Kavram + durumdan türetme; yüzde/seviye/XP yok | RuneScape/Albion Destiny Board'dan ret (T7) |
| Rehber görev **zorunlu** mu? | **Hayır.** Tek zorunluluk "yok"; Atla/Kapat hesaba yazılır | Hay Day şikâyeti; Stardew cezasızlığı |
| Rastgele günlük görev panosu (Stardew Help Wanted) alınır mı? | **Hayır (Alfa-0).** İlçe iş panosu NPC sipariş/ihale olarak ekonomi mekaniğidir, "görev" değil | Para musluğu (K-5), determinizm |
| Albion Journal'ın "kategori tamamlama ödülü" alınır mı? | **Hayır** | Tamamlama baskısı; Gö4 atlama oranını gizli ceza yapar |
| "Hikâye" katmanı (Anno kampanya) var mı? | Alfa-0'da yok; metin şablon | Kapsam; LLM çelişkisi |
| Sosyal/ortak hedef (Stardew Topluluk Merkezi) var mı? | Evet, **ilçe ortak projesi/imece** ayrı sistem; Defter'de yalnız `ilk_ortak_katki` | İmece İ-5; A1 |

---

## 5. Ölçütler (Gö1–Gö10)

Hepsi komut günlüğünden ve sunucu profil tablosundan hesaplanır (ek kişisel veri yok; telemetri anahtarı ayrı, R-Ü16). Eşikler **hipotezdir.** Y1–Y10 (baslangic §8.2) tekrar edilmez; aşağıdakiler onları **görev kartı kırılımıyla** tamamlar.

| # | Ölçüt | Tanım | Hedef (hipotez) | Bot / insan | Not |
|---|---|---|---|---|---|
| **Gö1** | **İlk saatte ilk satış (kart kırılımı)** | `ilk_satis` ≤60 dk oranı; **kartı gören ↔ görmeyen** ve **açılış başına** kırılım | ≥%70 (Y2 ile aynı eşik; kırılım yeni) | İnsan | Y2'nin açılış ve kart kırılımı; Pazar'da ≥%85, Sanayi'de ≥%55 beklenir (S2 kit fazlası gerektirir) |
| **Gö2** | **İlk kendi dükkânı ≤24 sa** | `ilk_dukkan` ≤24 sa oranı (Alfa-0: Ticaret ofisi; hedef: market/mağaza) | ≥%40 (Pazar ≥%60, Tarım ≥%35, Sanayi ≥%30) | İnsan | Kaynak: Capital Rift ilk dükkânı ≈8 dk (video, arama özeti); strateji oyununda 24 sa gerçekçi. Hedef içerik gelince **yeniden ölç** (perakende yapısı farklı maliyet) |
| **Gö3** | **D1 / D7: defter etkileşimi kohortu** | Ana kartı **açan ve ≥1 kart tamamlayan** ↔ **Kapat diyen** ↔ **hiç etkileşmeyen**; D1/D7 | Etkileşen−kapatan D7 farkı bilgi amaçlı (**seçilim yanlılığı:** nedensel değil) | İnsan | Nedensellik için: davetli ≤200'de **%10 kontrol grubu (Defter gizli)** etik ve güç sorunludur (n≈20); alternatif: sürüm A/B (kart sırası). **Açık soru GS-2** |
| **Gö4** | **Görev atlama oranı** | Kart başına: `Atla` ∨ 48 sa görmezden gelme / gösterilen | Kart başına ≤%30 (Y8 ile uyumlu); >%50 ⇒ metin/sıra sorunu | İnsan | Atlama **kötü sayılmaz**, ama yüksekse kart gereksiz ya da yanlış yerde |
| **Gö5** | **Geriye dönük tamamlanma oranı** | Kart "açıldığında" zaten `tamam` olan kavram / toplam | Bilgi: yüksek (>%60) ⇒ oyun kartın önünde yürüyor (iyi); çok düşük ⇒ oyuncular kartı **yalnız** kart olduğu için yapıyor | İnsan | Albion Journal ilkesi; defterin "sürükleme" mi "eşlik" mi olduğunu gösterir |
| **Gö6** | **Zincir derinliği** | 7. günde tamamlanan kavram sayısı dağılımı; `ilk_isleme` ≤72 sa oranı | ≥%50 oyuncu 3. günde 2. kademe | Bot + insan | "Ocak tütsün" adımı oyuncuyu döngüye sokuyor mu (sahibin ana derdi) |
| **Gö7** | **Ödülün ekonomiye etkisi (para korunumu)** | Σ görev ödülü / Σ (hibe + kit + NPC girişi); ödül alanların 14. gün Y7'si ↔ almayanların | ≤%10 giriş paketi; Y7 farkı ≤%5 puan | Bot + log | Para arzı panosunda ayrı satır; "ödül avantaj yaratmıyor" kanıtı |
| **Gö8** | **Kaldığın yer etkinliği** | Dönüşte kartı açıp **ilk adımı 2 dk içinde** atan oran; yokluk süresine göre | ≥%50 (6–48 sa); uykuda ≥%35 | İnsan | 14 gün uyku sonrası "geri dönüş" için D7 yeniden etkin |
| **Gö9** | **Yön sayfası kullanımı** | Yeni sayfa açan oyuncunun 7 günde **yeni kavram** tamamlama oranı; D7 farkı | ≥%40; D7 farkı ≥−5 puan (Y6 ile aynı ruh) | İnsan | Kilitsiz yönelimin görev yüzü |
| **Gö10** | **Olay hazırlığı** | Olaydan önceki ≤7 günde hazırlık koşulunu sağlayan oyuncu oranı; olay talebinin karşılandığı oran | Bilgi; hedef yok (ödül yok) | Bot + log | "Takvimden" kartlarının gerçekten tutuldu mu |

**Bot ne ölçer?** Botlar eğlenceyi ölçmez (00 R5). Ama **zincir erişilebilirlik testi** (CI): her açılış zinciri için bir bot, kartları sırayla tamamlar; test (a) her kavramın koşulu planlanan sürede doğru olur, (b) Σ ödül ≤₺8.000 ve kavram başına bir kez (çekirdek ikinci talebi ve tavan aşımını reddeder), (c) ikinci açılış zincirinde tekrar ödül yok, (d) içerik eksikse kart `gizli` kalır ve zincir kırılmaz, (e) aynı komut günlüğünden yeniden oynatılan durumda aynı görev durumu çıkar (determinizm). Bu test içerik değişince **kendi kendini uyarır** (yeni mal eklenip zincir bozulursa kırılır).

---

## 6. Uygulama

**Maliyet etiketi:** S ≈ ≤3 iş günü, tek modül · M ≈ 1–2 hafta · L ≈ 3+ hafta ya da çekirdek+sunucu+istemci birlikte (tahmin).

### 6.1 Görev tanımı veri şeması

Veri paketi `packages/veri/icerik/gorevler.json` (sürümlü; `icerik.json` ile aynı hat; çekirdek içerik hash'ine **girmez**, ayrı `gorevSurumu` taşır). Koşul bir **kapalı yüklem kümesidir** (kod; veri yalnız parametre verir), böylece görev tanımı keyfi kod çalıştırmaz.

```jsonc
{
  "surum": 1,
  "kavramlar": {
    // Tutar yoktur: para/mal tutarları çekirdek verisindedir (aşağıdaki parametreler.json bloğu). Burada yalnız kozmetik/bilgi.
    "ilk_satis": { "dongu": "sat", "atlanabilir": true },
    "ilk_yapi":  { "dongu": "uret", "kozmetik": "tabela_renk", "atlanabilir": true },
    "ilk_uretim":{ "dongu": "uret", "bilgi": { "atlasAc": ["gida"] }, "kozmetik": "ilk_hasat_damgasi" }
  },
  "sayfalar": [
    { "id": "tarim", "ad": "Tarım", "tur": "acilis", "bolumler": ["ilk_gun", "hafta", "ufuk"] },
    { "id": "takvimden", "ad": "Takvimden", "tur": "takvim" },
    { "id": "fabrika", "ad": "Fabrika", "tur": "yon", "acilma": { "ilkYapiKatmani": "sanayi", "firsatKarti": true } }
  ],
  "gorevler": [
    {
      "id": "tarim.ilk_tarla",
      "sayfa": "tarim", "bolum": "ilk_gun", "kavram": "ilk_yapi",
      "metin": { "baslik": "gorev.tarim.ilk_tarla.baslik", "hedef": "gorev.tarim.ilk_tarla.hedef", "ipucu": "gorev.tarim.ilk_tarla.ipucu" },
      "oneriGun": 0, "sira": 10,
      "gerektirir": { "tesis": ["ciftlik"], "mal": [], "ozellik": [] },
      "tetik": { "tip": "mekan", "nokta": "muhtarlik" },
      "kosul": { "tip": "tesis_hazir", "tur": ["ciftlik"], "enAz": 1 },
      "yuruyus": { "nokta": "yurt_arsasi", "etiket": "Haritadan git" },
      "panel": { "ekran": "yapi_paleti", "vurgu": "ciftlik" }
    },
    {
      "id": "tarim.ilk_satis",
      "sayfa": "tarim", "bolum": "ilk_gun", "kavram": "ilk_satis",
      "oneriGun": 0, "sira": 20,
      "gerektirir": { "mal": ["gida"] },
      "tetik": { "tip": "durum", "sonra": ["tarim.ilk_tarla:baslandi"] },
      "kosul": { "tip": "ihracat_brut_gt", "esikMili": 0 },
      "yuruyus": { "nokta": "carsi_alici" }, "panel": { "ekran": "pazar" }
    },
    {
      "id": "takvimden.kis_hazirligi",
      "sayfa": "takvimden", "kavram": null,
      "tetik": { "tip": "takvim", "olay": "E2_kis_hazirligi", "onDuyuruGun": 21 },
      "kosul": { "tip": "stok_ge", "mal": "yakit", "miktarMili": 200000 },
      "odul": null, "oncelik": 1
    }
  ]
}
```

**Ödül tablosu çekirdek verisindedir** (para ve mal tutarları; tablo özeti günlük başlığına yazılır, K-9; değişimi kural sürümü olayıdır):

```jsonc
// parametreler.json → mulk.gorevOdulleri   (mili-₺ ve mili-birim)
"gorevOdulleri": {
  "tavanMili": 8000000,
  "kavramlar": {
    "ilk_yapi":   { "mal": { "celik": 5000 } },
    "ilk_satis":  { "hazineMili": 500000 },
    "ilk_isleme": { "mal": { "parca": 5000 } },
    "ilk_dukkan": { "mal": { "celik": 10000 } },
    "ilk_sozlesme": { "hazineMili": 500000 }
  }
}
// komut: { tur: "sistem_odul", oyuncu, kavram: "ilk_satis", anahtar: "gorev:<hesap>:ilk_satis" }  (tutar alanı yok)
```

**Koşul yüklemleri** (kapalı küme; hepsi **saf**, çekirdek durumunu okur, yazmaz):

| Yüklem | Okuduğu alan | Not |
|---|---|---|
| `tesis_hazir {tur[], enAz}` | `BolgeDurumu.tesisler[].tur`, `HucreDurumu.insaat` | İnşaat bitmiş mi |
| `uretim_toplam_gt {mal, esik}` | `BolgeDurumu.uretimToplam[mal] + uretimOrani·(t−uretimT0)` | Tembel stok anlık formülü (istemcide `stokAraDeger` gibi paylaşılır) |
| `ihracat_brut_gt` / `ithalat_brut_gt` | `OyuncuDurumu.ticaretDefteri.toplam.brutIhracat/Ithalat` | **Pazar v1 kapalıysa tanımsız** ⇒ yedek: `ticaretEmirleri[].gerceklesenSaat` (doğrulanacak) |
| `ilce_sayisi_ge {n}` | `MulkOyuncuDurumu.ilceHucre.length` | |
| `zincir_tamligi_ge {n}` | portföy özeti (A11) | Girdisini kendi tesisinden alan çift sayısı |
| `elektrik_uretim_gt` | `BolgeElektrikDurumu.uretimMili` | |
| `arastirma_acik {n}` | `OyuncuDurumu.teknolojiler`, `arastirma` | |
| `ekim_payi_gt {urun}` | `BolgeTarimDurumu.ekimPpm[ürün]` | |
| `stok_ge {mal, miktar}` | `BolgeDurumu.stoklar` | |
| `sozlesme_teslim_ge {n}` | sözleşme kaydı (A6/N14) | **Çekirdekte yok** ⇒ görev gizli |
| `ihale_teklif_ge {n}` | ihale kaydı (N4) | **v1.5** |
| `komut_aralik_ge {saat}` | komut günlüğü | Sunucu tarafı; yalnız `ilk_donus` |
| `takvim_olay_aktif {olay}` | takvim paketi | Yalnız tetik/görünürlük |
| `gozlem {olay}` | istemci olayı ("paneli açtı") | **Ödülsüz** görevler için; sunucu **ödül vermez** |

Her yüklem **tek yönlü sticky'dir:** koşul bir kez sağlanınca `tamamT` profil tablosuna yazılır; durum sonradan bozulsa (yapı yıkıldı) tamamlanma geri alınmaz (GK-5).

### 6.2 Nerede tutulur: çekirdek içi mi, dışı mı?

| Seçenek | Artı | Eksi | Karar |
|---|---|---|---|
| **A. Görev durumu çekirdekte** (`MulkOyuncuDurumu.gorev…`: tamamlanma, atla, kart durumu) | Tek doğruluk, snapshot ile gider | Görev **içerik/UI** verisi çekirdek **durum şemasına ve snapshot'a** girer; her görev değişikliği `sema` göçü; çekirdek tek-yazar kuralı (11 §5) ve determinizm yüzeyi büyür | **Hayır** |
| **B. Görev durumu çekirdek dışı (tanım + saf değerlendirici + sunucu profili); çekirdekte yalnız ödül kaydı** | Görev içeriği ve durumu çekirdek dışı; görev eklemek veri güncellemesi; değerlendirici `durumOzeti`'ne girmez; istemci de çağırır (`protokol/kare.ts` `stokAraDeger` örneği); hesaba bağlı. **Para kapısı çekirdekte kilitlenir:** tutar, tavan ve "kavram başına bir kez" çekirdektedir; sunucu hatası ya da sızan jeton sınırsız para basamaz | Çekirdek durumuna **tek küçük alan** girer: `MulkOyuncuDurumu.alinanOdul?: string[]` (sıralı kavram kimlikleri; boşsa yazılmaz, `indirimliYapi` kalıbı) + ödül tablosu çekirdek veri paketine girer (snapshot/hash, `sema` göçü); iki yerde durum (profil ↔ çekirdek) tutarlılık işi | **Evet (öneri)** |
| **B′. Her şey çekirdek dışı** (ödül yalnız profilde; komut tutar taşır) | Çekirdek şeması hiç değişmez | **Serbest tutarlı para kapısı:** sunucu hatası ya da sızan yönetici jetonu sınırsız para basar (K-5, geri sarılamaz); tavan ve tek-seferlik kuralı çekirdekte uygulanamaz; idempotans tablosu 20.000 girdide eskileri atar (sunucu-tasarimi §4), çift ödül riski kalır | **Hayır** |
| C. Yalnız istemci (`localStorage`) | Ucuz | Cihaz değişince kaybolur; ödül doğrulanamaz; Hay Day'in "öğretici yeniden" şikâyeti (T16) | **Hayır** (yalnız önbellek) |

**Parçalar.**

| Parça | Yer | Not |
|---|---|---|
| Tanımlar | `veri/icerik/gorevler.json` | Sürümlü; sunucu açılışta yükler; istemciye `hosgeldin` ile `gorevSurumu` gider |
| `gorevDurumu(dunya, oyuncu, tanimlar, profil) → KartDurumu[]` | **Çekirdek paketinde saf modül** `gorev/` (ya da `protokol` yanında) | Çekirdek durumunu **okur**, **yazmaz**; `durumOzeti`'ne girmez; derleme-zamanı test: aynı durum ⇒ aynı kartlar |
| Oyuncu görev durumu | **Sunucu profil tablosu** `gorev_ilerleme {hesap, gorevId, durum, tamamT, atlandiT}` + hesap düzeyinde `kilavuz_kapali` | Hesaba bağlı; ≤45 satır/hesap; komut günlüğünden **yeniden türetilebilir**. "Ödül alındı" bilgisi profilde **kopyalanmaz**, çekirdekteki `alinanOdul`'dan okunur |
| Ödül | **Çekirdek komutu `sistem_odul {oyuncu, kavram, anahtar}`** (**tutar alanı yok**; yalnız `sistem` damgası; sunucu damgalı; günlüğe girer; idempotans anahtarı `gorev:<hesap>:<kavram>`). Tutarı çekirdek **sürümlü ödül tablosundan** (`parametreler.json mulk.gorevOdulleri`, özeti günlük başlığında, K-9) okur; **tavanı** ve **"kavram başına bir kez"** kuralını çekirdek uygular (`alinanOdul` kümesi) | Çekirdek **görev kimliğini ve koşulunu bilmez**; yalnız kavram kimliği, tutar ve tavan bilir. Günlüğe girdiği için **yeniden oynatma** deterministik |
| İstemci → sunucu | `gorev_talep {gorevId}` mesajı: sunucu snapshot'tan koşulu yeniden değerlendirir, uygunsa `sistem_odul {kavram}` yazar | Hız sınırı 5 jeton/sn mevcut; istemci hesabına **güvenilmez** |
| Takvim tetiği | Takvim paketi (canlı dünya §5.2, `takvim_paketi_yukle`) | Görev "olay"ı kimliğiyle tanır, tarih bilmez |
| Metin | `i18n` anahtarları (Türkçe öncelikli); şablon | LLM yok (Gİ-9) |

**Çekirdek ödül güvenliği.** `sistem_odul` çekirdeğe **yeni bir para giriş kapısı** açar; bu yüzden **serbest tutar taşımaz** (aynı dalgadaki yapay zekâ raporunun "para alanı taşıyan sistem komutu yok" ilkesiyle tutarlıdır). Kurallar: (a) komut yalnız `kavram` + idempotans anahtarı taşır; (b) tutar çekirdekteki sürümlü ödül tablosundan gelir, tablonun özeti günlük başlığındadır (K-9); (c) **tavan (₺8.000) ve "kavram başına bir kez" çekirdekte uygulanır** (oyuncu başına `alinanOdul` kümesi; kümede olan kavram ya da tavanı aşan toplam reddedilir); (d) yalnız `sistem` damgası; (e) **K-5:** görev ödülü hibe ve başlangıç kiti gibi **"yeni oyuncu paketi" kanalının parçasıdır** (hesap başına tek seferlik, tavanlı giriş) ve para arzı panosunda ayrı satırdır; (f) **kalan risk:** *koşulu* çekirdek doğrulamaz (saf modül sunucudadır); sunucu hatası ya da sızan jeton yanlış kişiye ödül verebilir, ama **en çok hesap başına tavan kadar ve kavram başına bir kez**; sınırsız para basamaz.

### 6.3 Alfa-0 kapsamı

| # | Parça | Katman | Maliyet | Alfa | Öncelik | Bağımlılık |
|---|---|---|---|---|---|---|
| B1 | **Görev tanımı şeması + koşul yüklemleri + `gorevDurumu` saf modülü** (+ birim testler, determinizm testi) | Çekirdek/veri | **M** | 0 | **P0** | Yok (görev değerlendiricisi çekirdek durumunu yalnız okur) |
| B2 | **Sunucu profil tablosu** (`gorev_ilerleme`, `kilavuz_kapali`) + `gorev_talep` mesajı | Sunucu | **M** | 0 | **P0** | B1; `sunucu-tasarimi` protokol |
| B3 | **`sistem_odul {kavram}` komutu + ödül tablosu (`mulk.gorevOdulleri`) + `MulkOyuncuDurumu.alinanOdul` kaydı** (idempotent, çekirdekte tavanlı ve tek-seferlik, günlükte) | Çekirdek (tek yazar) | **M** | 0 | **P0** | Çekirdek sahibi (aynı anda tek yazar); K-9 (tablo özeti günlük başlığında) |
| B4 | **Defter arayüzü** (Bugün + Sayfalar + Kütüphane; tek ana + ≤2 kart; Atla/Kapat) = baslangic A7 | İstemci | **M** | 0 | **P0** | B1–B2; arayüz ve görsel kimlik |
| B5 | **3 zincirin "İlk gün" bölümü** (≈20 kart: T1–T4,T5,T6,T7; S1–S5,S6,S7; P1–P6) + **Hafta bölümünün içerik-bağımsız kartları** | Veri/metin | **S** | 0 | **P0** | B1; Ahır, Çiftlik, Çelikhane, Ticaret ofisi mevcut |
| B6 | **"Kaldığın yer" kartı** (dönüş özeti A12 ile) | İstemci+sunucu | **S** | 0 | **P0** | A12; B1 |
| B7 | **Takvimden sayfası** (E2 kış hazırlığı, E8 Cumhuriyet süsü, hasat penceresi) | Veri + istemci | **S** | 0 (kısmi) | P1 | Takvim paketi (canlı dünya §5.2) |
| B8 | **Yön sayfaları** (Fabrika, Ticaret; Laboratuvar Atölye-Lab yer tutucu ise A1) | Veri + istemci | **S** | 0–1 | P1 | B1, B4 |
| B9 | **Sözleşme/ihale/Rehberlik/gurbetçi/bayram hatırlatma görevleri** | Çekirdek + sunucu + istemci | **L** | 1 | P2 | A6, N14, N4, A16, N8, sahip onayı (bayram) |

**Özet.** P0 = **2 S + 4 M** (B1 M, B2 M, B3 M, B4 M, B5 S, B6 S); P1 = 2 S (B7, B8); P2/Alfa-1 = B9 (L). **Alfa-0 kapısına etkisi:** A0-6 uçtan uca akışı (giriş → Yerleş → hücre → Tarla → satış) zaten ilk 10 dakikadır; B4+B5, bu akışın **kart yüzü**dür (yeni mekanik değil). **Çekirdek durumuna yalnız `MulkOyuncuDurumu.alinanOdul` (boşsa yazılmaz) eklenir;** görev içeriği, görev durumu ve kart mantığı çekirdek dışıdır.

**İçerik üretimi.** ≈45 görev (3×≈13 açılış + 5×3 yön + ≈8 takvimden) × (başlık + hedef + ipucu) ≈135 kısa Türkçe metin; "Hayırlı olsun" tonu için **tek bir metin rehberi** (sıcak, yargısız, 2 cümle) yazılmalı; çeviri sonra.

---

## 7. Geri dönüşü zor kararlar (şimdi verilmesi gerekenler)

| # | Karar | Seçenekler | Neden geri dönüşü zor | Öneri | Aciliyet |
|---|---|---|---|---|---|
| **GK-1** | **Ödül türü ve kanalı** | (a) yalnız kozmetik+bilgi; (b) mal ağırlıklı küçük + para (öneri); (c) hibeye eklenmiş para; kanal: (k1) serbest tutarlı sistem komutu · (k2) **tutarsız, kavram kimlikli komut + çekirdek ödül tablosu (öneri)** | **Para bir kez girince geri sarılamaz** (K-5). İlk alfa kullanıcılarının beklentisi (seri, bonus) kalıcıdır; bir kez "bol ödül" dersek küçültmek "ceza" algılanır (WoW çerçeve dersi). Komut günlüğüne yazılan `sistem_odul` kayıtları sonsuza dek yeniden oynatılır; serbest tutarlı komut (k1) sızan jetonla sınırsız para basar | **(b) + (k2):** ≤₺8.000, kavram başına tek, mal ≥%50, her ödül adımın bedelinin (bedelsizse gelirinin) ≤%25'i (§3.1); tutar, tavan ve tek-seferlik **çekirdekte**; komut yalnız `kavram` taşır; ödül "yeni oyuncu paketi" kanalının parçasıdır (K-5) | **Alfa-0 öncesi** |
| **GK-2** | **Görev durumunun ve ödül kaydının yeri** | A tamamı çekirdekte · **B görev durumu profilde, ödül kaydı (`alinanOdul`) çekirdekte (öneri)** · B′ her şey profilde · C yalnız istemci | **A:** artı tek doğruluk; eksi görev içeriği/UI çekirdek şemasına ve snapshot'a girer, her görev değişikliği `sema` göçü. **B:** artı para kapısı çekirdekte kilitli (tavan, tek-seferlik, tablo), görev içeriği çekirdek dışı; eksi çekirdeğe **tek küçük alan** (`alinanOdul`) ve ödül tablosu girer, yani "çekirdek durumu değişmez" iddiası **geçersizdir**; alanı sonradan çıkarmak snapshot göçü ister. **B′:** artı çekirdek şeması dokunulmaz; eksi sunucu hatası/sızan jeton sınırsız para basar, tek-seferlik kuralı idempotans tablosuna (20.000 girdi, eskiyi atar) yaslanır. Profil tablosu hesaba bağlı olduğu için hesap modeli (Better Auth) ile birlikte kararlaştırılır | **B**; çekirdekte yalnız `alinanOdul`; görev durumu profilde ve komut günlüğünden **yeniden türetilebilir** olmalı | **Alfa-0 öncesi** |
| **GK-3** | **Zorunluluk derecesi** | Hiç zorunlu yok (öneri) · yumuşak kilit (ör. ilk 30 dk) · "ilk görevi bitir" | Bir sistem görev durumunu **koşul** yaparsa (Rehber ödülü, kilit, kota) sonradan kaldırmak oyuncu kayıplarına yol açar; "Defter'i doldur" baskısı kalıcı olur; kilitsiz yönelim ilkesi (docs/12 §3) çöker | **Hiçbir sistem görev durumunu okumaz** (Gİ-5); invariant olarak **testle** güvenceye alınır (görev durumunu okuyan kod yolu yok) | **Alfa-0 öncesi** |
| **GK-4** | **Görev/kavram kimlik sözlüğü** | Kararlı `kavramId` + `gorevId` + sürüm | Ödül idempotans anahtarı (`gorev:<hesap>:<kavram>`), çekirdekteki `alinanOdul` kümesi, ödül tablosu ve profil kayıtları bu kimliklere bağlıdır; ad değişimi çift ödül ya da kayıp ilerleme demektir | Kavram kimlikleri **donmuş sözlük** (§3.1); görev kimliği ad değil, anlamlı kısa kod; yeni kavram yalnız **ekleme** | Alfa-0 öncesi |
| **GK-5** | **Tamamlanma "sticky" mi, türetilmiş mi?** | Her açılışta yeniden hesapla · **ilk sağlandığı an kalıcı** (öneri) | Yeniden hesaplanırsa yıkım/satış tamamlanmayı geri alır, ödül tekrar verilebilir ya da kaybolur; kalıcı kayıt sonradan "geriye dönük düzeltme"yi zorlaştırır (hata sticky olur) | **Sticky + `tamamT`**; düzeltme için yönetici komutu | Alfa-0 öncesi |
| **GK-6** | **Koşul yüklemlerinin çekirdek alanlarına bağı** | Kapalı yüklem kümesi (öneri) · serbest ifade | Yüklem `ticaretDefteri.toplam.brutIhracat` gibi alana bağlanır; çekirdek alan adı/anlamı değişirse **geriye dönük tamamlanma** kırılır | Yüklem kütüphanesi **çekirdek testleriyle birlikte** sürümlenir; alan değişiminde yüklem adaptörü | Alfa-0 |
| **GK-7** | **Metin: şablon mu, LLM mi?** | Şablon (öneri) · LLM kişiselleştirmesi | LLM görev anlatımı bir kez "oyunun sesi" olursa geri dönüş maliyetlidir; tamamlama doğrulaması LLM'e kayarsa **determinizm** ve ödül güvenliği bozulur | **Şablon** (Gİ-9); ajan yalnız **kamu ilanı/ihale kararı önerir**, görev ajandan bağımsız | Alfa-0 |
| **GK-8** | **Hesap başına tek hibe/kit/ödül ve yeniden başlayan** | Tek (öneri) · yeniden | Hesap modeli ve çoklu hesap kuralı (11 §10) ile bağlı; sonradan "yeniden hibe" vermek enflasyon, vermemek 90 gün uyku sonrası dönenleri kaybeder | Tek; **yeniden başlangıç** için ayrı küçük paket sahip kararı (GS-4) | Alfa-1 öncesi |

**Kolay geri dönülür (kararlaştırılmasına gerek yok):** kart sırası, görev adları, tetik sıcaklığı, kozmetik içerik, "önerilen gün" etiketleri, öneri motoru kural sırası.

---

## 8. Açık sorular (sahip / lider için)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| GS-1 | "Kendi dükkânım" Alfa-0'da **Ticaret ofisi** adıyla yaşasın mı, yoksa perakende yapısı gelene kadar `ilk_dukkan` görevi gizli mi kalsın? | Ticaret ofisi köprüsü ("kendi tezgâhın"); perakende gelince aynı kavramın yeni koşulu eklenir (GK-4 ekleme) |
| GS-2 | Defter için **kontrol grubu** (gizli) etik mi? n≈20 güçsüz; yoksa yalnız kart sırası A/B mi? | Yalnız A/B (sıra/ metin), gizli kontrol yok |
| GS-3 | Dini bayram **hatırlatma** kartları Alfa-1'e kadar sahip onaylı mı? Kozmetik hiç mi yok? | Onaylı; kozmetik/ödül yok; "Bayram alışverişi" sözcüğü resmî ad |
| GS-4 | 90 gün sonra açık artırmayla parselini kaybeden oyuncuya **yeniden başlangıç** paketi var mı? | Küçük paket (hibe yok, ilk yurt var, defter yeniden açılır); sahip kararı |
| GS-5 | Gurbetçi dönemi için yeni oyuncuya **ayrılmış tezgâh/kota** (≥%20) verilsin mi (Y8 mantığı)? | Hayır (Alfa-1'de ölçülsün; havuz sabit olduğundan kota "pay kaydırma"dır) |
| GS-6 | "İlk kamu ihalesi teklifi" için **küçük işler** sınıfı (benzer iş şartı yok, geçici teminat yok, ilk işte) ihale tasarımına eklensin mi? | Evet (N4'ün parçası; 4734 sayılı Kanun'da geçici teminat ≥%3 (imza §3.4 N4 kartı); yeni esnaf için ilk işte kaldırılır); ihale araştırmacısıyla uyum |
| GS-7 | Rehber görev metninde **ajan karakteri** (kamu görevlisi, esnaf) sesi kullanılsın mı (NPC muhtar iki cümle)? | Evet, ama **sabit şablon**; LLM yok |

---

## 9. Kaynaklar

**Oyunlar (görev ve rehberlik)**
- Stardew Valley: [Quests](https://stardewvalleywiki.com/Quests) (Help Wanted panosu, hikâye görevleri, "kabul edip yapmamanın cezası yok") · [Community Center](https://stardewvalleywiki.com/Community_Center) (paket listesi, JojaMart alternatifi, 5.000 altın) · Special Orders panosu için [arama sonucu özeti](https://stardewvalleywiki.com/Quests) (arama özeti)
- Albion Online: [MMORPG.com — Albion Journal görev ve ödül sistemi](https://www.mmorpg.com/news/albion-online-details-the-albion-journal-mission-and-reward-system-coming-in-paths-to-glory-2000132197) (kategoriler, sıra serbest, geriye dönük tamamlanma, kozmetik ödül) · [Albion Wiki: Albion Journal](https://wiki.albiononline.com/wiki/Albion_Journal) (403; arama özeti) · Destiny Board için bkz. baslangic §10
- RuneScape: [OSRS: Quests](https://oldschool.runescape.wiki/w/Quests) (quest puanı, XP, beceri şartı, doğrusal kilit) · [Tutorial Island](https://oldschool.runescape.wiki/w/Tutorial_Island) (zorunlu "Learning the Ropes")
- Anno 1800: [Wikipedia](https://en.wikipedia.org/wiki/Anno_1800) (yalnız "hikâye kampanyası var"; görev ayrıntıları **doğrulanmadı**) · [Bread in Anno 1800](https://www.anno1800empirebuilder.com/bread-in-anno-1800/) (tahıl → un → ekmek zinciri, tüketim ihtiyacı olarak)
- Capital Rift: [TikTok: yeni öğretici sistemi](https://www.tiktok.com/@niksgames/video/7671413170463903007) · [YouTube ilk saat sırası](https://www.youtube.com/watch?v=oNfawXo8q2A) (arama özeti; görev içeriği **doğrulanamadı**)
- Mobil FTUE: [Udonis: FTUE](https://www.blog.udonis.co/mobile-marketing/mobile-games/first-time-user-experience) · [Game Developer: FTUE best practices](https://www.gamedeveloper.com/design/best-practices-for-a-successful-ftue-first-time-user-experience-) (arama özeti)
- EVE kariyer ajanları, Hay Day, Roblox, WoW Rested XP: bkz. [baslangic-ve-ustalik §10](baslangic-ve-ustalik.md)

**İç belgeler ve kod (doğrudan okundu)**
- [baslangic-ve-ustalik](baslangic-ve-ustalik.md) (§2.2–2.4, §3, §5.3–5.5, §7 A1–A17, §8) · [oyun-kimligi-harman](oyun-kimligi-harman.md) (§5.3–5.6) · [imza-mekanikleri-ve-yonelimler](imza-mekanikleri-ve-yonelimler.md) (§1.6, §2.2 İ-2, §3.4 N8, §3.6 N14, §4.2 Fırsat Kartı, K-5) · [canli-dunya-simulasyonu](canli-dunya-simulasyonu.md) (§5.2 takvim paketi, §5.3 olay kataloğu E1–E11) · [cesitlilik-uretim-katmanlari](cesitlilik-uretim-katmanlari.md) (§4.4 Z1–Z10, §5.2 S-Z1–S-Z8, §7 katalog) · [sunucu-tasarimi](sunucu-tasarimi.md) (komut yolu, idempotans, günlük) · [docs/12 §3, §7–8](../12-yon-taslagi.md) · [docs/11 §7.8–7.9, ek kararlar](../11-urun-donusu.md)
- Kod: `packages/cekirdek/src/tipler.ts` (`Komut`, `MulkKomutu`, `OyuncuDurumu`, `BolgeDurumu`, `TesisDurumu`, `TicaretDefteri`, `MulkOyuncuDurumu`, `HucreDurumu`, `BolgeTarimDurumu`) · `packages/cekirdek/src/ekonomi/komut.ts` (`ticaret_emri`, `yerelPazar`) · `packages/cekirdek/src/mulk/yurt.ts`, `mulk/komut.ts` · `packages/veri/icerik/icerik.json` (14 mal, 24 yöntem, 18 tesis, 3 ekim ürünü) · `packages/veri/icerik/parametreler.json` (`mulk.yeniOyuncu`, `ekYapilar`, `yapiInsaSaati`, `erkenOyun`, `pazar`) · `packages/sunucu/src/depo/*`, `packages/protokol/src/mesajlar.ts`

**Erişilemeyen / doğrulanamayan.** Albion Wiki sayfası 403 (arama özeti); Anno 1800 kampanya görev yapısı bu turda doğrulanamadı; Capital Rift'in kendi görev/öğretici içeriği bağımsız kaynakla doğrulanamadı; mobil FTUE kaynakları arama özetidir; 4734 sayılı Kanun ayrıntıları imza raporundan alınmıştır. Tüm eşikler, ödül tutarları ve süreler **öneridir** ve Alfa-0 insan testiyle kalibre edilmelidir.
