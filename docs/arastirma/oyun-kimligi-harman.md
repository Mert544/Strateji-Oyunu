# Araştırma: Oyun Kimliği ve Harman — Karşılaştırdığımız Oyunlardan Kopya Olmayan, Özgün Bir Tasarım

> **Konu.** Sahibin isteği: "Bu oyunların jeneriklerini ve oynanış yapısını harmanlayıp, bizim de buna yönelik bir kopya olmayan ama fikir alışverişi için bize iyi gelen bir çalışma." **Sahibin düzeltmesi (1 Ekim):** MMORPG aranmıyor; sınıf, seviye, karakter ilerlemesi yok; oyun strateji tabanlı, yürüyüş ve sunum yalnız adaptasyon için. Rapor buna göre kurulmuştur. Bu rapor (1) 22 oyunun türünü, açılış sunumunu, çekirdek döngüsünü, geri getiren şeyini, sosyal yapısını ve para kazanma biçimini karşılaştırır, (2) bunları bizim 30 saniye / 5 dakika / 1 saat / 1 gün / 1 hafta döngülerimize harmanlar, (3) strateji tabanlı özgün bir kimlik ve ayrı bir **adaptasyon katmanı** (yürüyüş, açılış sahnesi) önerir, (4) kopya riskini ve kaçınılacak tuzakları listeler.

**Durum.** 1 Ekim 2026'da derlendi. Bu bir **Ar-Ge önerisidir, karar değildir**; sayılar ve adlar başlangıç değeridir, kalibre edilmemiştir. Kod, başka belge ve commit yoktur. Önceki raporları ([Capital Rift mekanikleri](capital-rift-mekanikleri.md), [11 — Ürün Dönüşü](../11-urun-donusu.md), [08 — Altı Katman](../08-alti-katman.md), [01 — Rakip ve pazar](../01-rakip-ve-pazar-arastirmasi.md), [oyun tasarımı: parsel](oyun-tasarimi-parsel.md), [arayüz ve UX](arayuz-ux.md), [çeşitlilik: yönetim, askeri, teknoloji](cesitlilik-yonetim-askeri-teknoloji.md)) tekrar etmez; onlara bağlanır ve sentezler. Köşeli parantezli sayılar (**[12]**) §8'deki kaynak numaralarıdır. **(doğrulanmadı)** ve **(genel bilgi)** etiketleri, bu turda bağımsız bir kaynakla teyit edilemeyen ya da yalnız arama özetine dayanan bilgiyi gösterir. "Sezon" sözcüğü kullanılmaz (K21); zaman dilimleri için "iklim takvimi" ve "dönem" kullanılır.

**Kanıt sınırı.** Capital Rift ana sayfası (`capitalrift.com`) bu turda da düz metin vermedi (yalnız başlık döndü); Capital Rift bilgisi önceki raporun kaynaklarına ve geliştirici özet listesine dayanır. Reddit ve Steam yorumları gibi oyuncu şikâyeti kaynakları, oyunların çoğu için doğrudan okunamadı; "oyuncuyu geri getiren şey" sütunu **kısmen çıkarımdır** ve öyle işaretlidir. Bu rapor yön gösterir; ürün kararı Alfa-0 insan testiyle sınanmalıdır (00 R5).

---

## Yönetici özeti (10 madde)

1. **Bu bir strateji oyunudur, MMORPG değil.** Sahibin düzeltmesi bağlayıcıdır: **sınıf, seviye, XP, ekipman, beceri/ustalık ilerlemesi yoktur.** Çekirdek döngü stratejik kararlardır: yatırım, üretim zinciri, pazar, yönetişim, ittifak, askeri. Karakterle yürüyüş ve açılış sahnesi **adaptasyon katmanıdır**: oyuncuyu oyuna alıştırır, dünyayı hissettirir, stratejik güç vermez (§2, §5).
2. **Kimlik cümlemiz:** "Kendi mahallendeki bir tezgâhla başlayıp, yatırım, üretim, pazar, yönetim ve ittifak kararlarınla ilçeni, ilini ve pazarını komşularınla birlikte büyüttüğün; gerçek Türkiye haritasında, herkesle paylaşılan sakin bir strateji oyunu." Kısa söylem: **"Mahallenden başla."** Capital Rift "gerçek sokağında iş kur" der ve işi karakterle yaptırır; biz **kolektif, karar odaklı, mahalle-ilçe-il stratejisiyiz** (§4).
3. **22 oyundan çıkan ders:** İyi açılışlar **ilk dakikada küçük, görünür bir kazanım** verir (Stardew'un ilk tarlası, Capital Rift'in yemek arabası, RuneScape'in Öğretici Adası) ve ilk saatte yönü oyuncuya bırakır (Albion: "ana görev yok"). Kötü açılışlar ya hiç öğretmez (Minecraft) ya bunaltır (EVE, Anno'nun ani 14 zinciri). Biz arada kalırız: **rehber hedef kartı, kaçınılabilir, tavanlı** (§5, §7).
4. **RPG örneklerinden yalnız sosyal/topluluk ve sunum dersi alınır** (Knight Online, Metin2, RuneScape, Albion, EVE, Habbo, Club Penguin): aidiyet, ortak mekân, arkadaş grubu, öğretici sunumu, etkinlik takvimi. **İlerleme sistemleri (sınıf, seviye, ekipman, skill) alınmaz** (§2 tablosu). Türk oyuncuyu tutan şey sosyal masa ve ortak kimliktir: Knight Online ulus aidiyeti, internet kafe buluşmaları, 101 Okey Plus'ın günde 1 milyondan fazla oyuncusu **[21][22][23][25]**; mobil oyuncuların ~%52'si kart oyunu seviyor (arama özeti, tek kaynak) **[26]**.
5. **Harman tek bakışta (§3), her döngü bir karar:** 30 sn = *bak, tek karar ver* (Capital Rift canlı kâr/zarar + Anno ihtiyaç rozeti + Victoria 3 kelepçeli fiyat); 5 dk = *yatırım ve üretim zinciri* (Anno taslak modu + Stardew gün sonu özeti + Big Ambitions vitrin puanı); 1 saat = *pazar, sözleşme, imece, kooperatif, askeri hazırlık* (Albion yerel pazar + Eco ortak hedef + Anno kademeli seviye); 1 gün = *pazar günü, seçim gecesi, iklim olayı* (Stardew sabit takvim + GTA haftalık etkinlik, **kaçırma cezası yok**); 1 hafta = *ilçe seviyesi, savaş penceresi, fuar, bütçe* (EVE savunan penceresi + Travian harikası → imece).
6. **Beş imza mekanik (§4.2), hepsi stratejik karar taşır:** (1) **Mahalle ve muhtarlık** (gerçek idari birim, seçim gecesi), (2) **Pazar günü** (ilçeye özgü haftalık ritim), (3) **İmza ürün / coğrafi işaret** (il kimliği, fuar), (4) **Çay ocağı** (Dikkat panelinin sokaktaki sesi), (5) **İmece** (ortak yatırım + kitabe). Tek tek hiçbiri başka oyunda bu biçimde yoktur; ama **özgünlük atomda değil kombinasyondadır**, bu açıkça yazılır.
7. **Ton: sakin, düz renkli, okunur, sıcak.** Akış çizgisi ve parçacık yok (K29). 8 renkli "kâğıt, mürekkep, çini turkuazı" paleti, düz gölgelendirme, "kolay gelsin / hayırlı işler / bereket versin / geçmiş olsun" dört selamı, bir **Defter** arayüz metaforu (bakkal defteri) (§4.3–4.4).
8. **Adaptasyon katmanı: ilk 60 saniye (§5).** Küre → Türkiye → 3 önerilen ilçe → "hazır arsa"da tek tık → dolmuştan iniş → mahalle muhtarının iki cümlesi → **Açılış Tezgâhı** → ilk NPC müşteri → "+₺85, hayırlı olsun" ve ilk Defter satırı. **Önerilen eksik parça:** 11 §7.9'daki ilk inşaat ~24 dk iken "ilk 10 dakikada hasat satışı" vaadi uyuşmaz; anında kurulan, parasız Açılış Tezgâhı boşluğu kapatır.
9. **Kopya riski (§6) ve tuzaklar (§7):** doğrudan kopya sayılabilecekler: Capital Rift'in yemek arabası/7 mutfak/6 geliştirme hattı/dükkân stili/Player Pass/"Capital-Rift" adı, Stardew'un büyükbaba mektubu, Albion adları, GTA formülünün aynısı, Karus/El Morad, Habbo/Club Penguin görselleri. **Üç fark kuralı** (bağlam, bağ, ifade). Tuzaklar: angarya, zorunlu taşıma, ücretli avantaj, boş dünya, zor ilk saat; ayrıca 24/7 olay baskısı, serbest metin moderasyonu, hassas konular; her biri için önlem ve ölçülebilir (öneri) ölçüt.
10. **Karar bekleyen açık sorular (§8):** (Ç1) "Muhtar" gerçekte **mahalle** düzeyi, bizde ilçe başkanı adı; (Ç2) Açılış Tezgâhı onayı; (Ç3) dolmuş; (Ç4) kahvehane masa oyunu Sonra/hiç; (Ç5) ilk inşaat süresi çelişkisi; (**Ç9**) **11'in son Ek kararındaki "ustalık yaparak kazanılır / uzmanlaşma ×1,5" ifadeleri sahibin "karakter ilerlemesi yok" düzeltmesiyle çelişiyor; öneri: kaldır, yerine stratejik portföy ve yapı seviyeleri**.

---

## 1. Karşılaştırma matrisi

Her oyun için aynı beş boyut: **tür**, **açılış ve ilk 10 dakika**, **çekirdek döngü** (dakika / saat-gün / hafta ve ötesi), **oyuncuyu geri getiren**, **sosyal yapı**, **para kazanma**; sonra **al / uyarla / alma** kararı. Hücreler kısadır; kaynak numaraları §8'dedir. Etiketsiz bilgi, kaynak sütununda numarası olanlara dayanır; **(genel bilgi)** etiketlisi bu turda doğrulanmamıştır. **[RPG: ...]** etiketi, o oyundan yalnız belirtilen dersin alındığını, **sınıf/seviye/ekipman/beceri ilerlemesinin alınmadığını** gösterir (§2).

### 1.1 Tür, açılış ve ilk izlenim

| Oyun | Tür | Açılış ve ilk 10 dakika | İlk izlenim, tanıtım dili ve kimlik |
|---|---|---|---|
| **Capital Rift** **[1][2]** | Tarayıcıda paylaşılan 3D ekonomi MMO | Tek yemek arabasıyla başlanır (7 mutfaktan biri); 17 dakikalık üçüncü taraf videoda sıra: araba → ilk dükkân (~8. dk) → arazi/çiftlik. Geliştirici "ilk başta zor" diyor, yeni öğretici yapılıyor | "Gerçek sokağını bul ve orada oyna; herkes aynı kalıcı dünyada." Geliştirici TikTok'u madde listesidir (tek kaynak); kimlik **"gerçek dünya + iş"** |
| **Minecraft** **[3]** | Sandbox hayatta kalma/yapı | Hiç öğretici yok; tarif için dış kaynak gerekir; 20 dakikalık gün-gece döngüsü, **"ilk gece"** barınak telaşı | Kimlik **özgürlük ve merak**; hedef yok. İlk dakikalar anında tepkili hareket ve blok kırmaktır |
| **Albion Online** **[4][5][6]** | Sınıfsız ortaçağ MMORPG, oyuncu ekonomisi **[RPG: yalnız ekonomi/yönetişim ve sunum dersi]** | Küçük öğretici ada: topla, işle, üret, birkaç düşman; sonra **5 başlangıç kasabasından birini seç**; birkaç görev, sonra "ana görev yok". Yeni oyuncu için 3 gün ücretsiz Premium | "Eşya oyuncu yapımı, her şey risk altında." Albion, "kum havuzuna salınca bırakma"yı fark edip üç yol seçimi ve "İlk Adımlar" günlüğü ekledi **[6]** |
| **EVE Online** **[7][8]** | Tek sunuculu uzay MMO **[RPG öğeli: yalnız ekonomi/yönetişim ve sunum dersi]** | Patlamış istasyondan çıkan kapsül sahnesi (güçlü ilk izlenim); ama öğretici "en kötü reklam" diye eleştirilir; karmaşıklık, FOMO'lu mağaza reklamları | "Tek evren, oyuncu yapımı ekonomi ve savaş." İlk izlenim sinematik, ilk saat bunaltıcı |
| **Eco** **[9][10]** | Hayatta kalma + yönetişim simülasyonu | Ev ve besin; 30 gün sonra gelecek **göktaşı** ortak hedef; yasalar sunucuyla bağlayıcı | "Gezegeni kurtar, ama onu yok etmeden." Savaş/ölüm yok; kimlik **toplumsal sözleşme** |
| **Victoria 3** **[11]** | Büyük strateji (ekonomi + siyaset) | Öğretici övülür ama erken oyun yavaş; inşaat sırası ve bina sekmesi sıkıcı bulunur | "Tarihsel materyalizm simülatörü" (tasarımcı). Kimlik **nüfus ve piyasa** |
| **Anno 1800** **[12]** | Şehir kurma + üretim zinciri | Sakin liman ve birkaç yerleşimci; sonra bir anda ~14 üretim zinciri ve işgücü sorunu; öğretici az anlatır | "Sanayi Devrimi'nde ihtiyaç tırmanışı." **Taslak (blueprint) modu**, şehir güzelliği; kimlik **estetik + verimlilik** |
| **Big Ambitions** **[13]** | Tek kişilik 3D iş RPG'si (Manhattan) | Daire, temel ihtiyaç, çok az para; öğretici kademeli açar; erken saatler yürüyüş ve iç mekân tasarımı yanlış tıklamalarıyla geçer | "Hiçbir şeyi yok, New York'ta bir imparatorluk kur." Basit grafik, **bağımlılık yapan döngü** (inceleme) |
| **GTA Online işletmeleri** **[14]** | Açık dünya suç/iş sandbox | CEO ofisi → bunker → motorcu kulübü → gece kulübü; pahalı satın alım, sonra pasif gelir | "Los Santos'ta patron ol." İlk izlenim **bol ve parlak**; ilk saat para biriktirme |
| **Foxhole** **[15]** | Toplu savaş + lojistik MMO (yukarıdan görünüm) | Hemen savaşa atlanır; oyunun tümünü ilk oturumda öğrenemezsin, birçok oturum gerekir | "Savaşı oyuncular taşır." Haftalar süren harp, sonra yenisi; lojistik grevi (49 gün) |
| **Travian** **[16]** | Tarayıcı strateji, dönemli sunucu | Tek köy, 22 bina yuvası; görev zinciri ve yeni oyuncu koruması | "Dünya Harikası'nı yap, dönemi kazan." Eski okul tarayıcı kimliği |
| **Rise of Kingdoms** **[17]** | Mobil strateji (Lilith) | Rehberli şehir kurma, komutan toplama; çok bildirim | "Medeniyetini seç, krallığını yarıştır." Parlak, sıkışık arayüz |
| **Stardew Valley** **[18]** | Çiftlik yaşam simülasyonu | Büyükbabanın mektubu, kentten kaçış hikâyesi; ilk gün: tohum, su, ilk hasat; ilk 10 dakikada sıcak ve rahat bir döngü | "Rahat tempo, gerçek bağlar." Tek kişilik geliştirici; **Topluluk Merkezi** ve köylüler |
| **RuneScape / OSRS** **[19]** | Tarayıcı kökenli MMORPG **[RPG: yalnız sosyal ve sunum dersi]** | **Öğretici Ada**: altı bina, her biri bir beceri (ekmek, madencilik, savaş, banka, dua, büyü); sonra Lumbridge'e ışınlanma | "Beceri ilerlemesi + oyuncu ticareti." Büyük Borsa (GE) sosyal meydan oldu |
| **Habbo** **[20]** | Sosyal sanal dünya (otel, izometrik) | Avatar yap, odalara gir, sohbet et, kendi odanı döşe | Kimlik **oda ve kıyafet**; 300 milyondan fazla kayıtlı hesap, yüz binlerce aylık aktif |
| **Club Penguin** **[20]** | Çocuklar için güvenli sosyal dünya | Penguen yap, mini oyunla jeton kazan, igloo döşe; güvenli sohbet menüsü | "Gerçekten güvenli" söylemi (6–14 yaş); aylık partiler |
| **Knight Online** **[21]** | Kore yapımı fantezi MMORPG **[RPG: yalnız sosyal dersi]** | Ulus seçimi (Karus / El Morad), sonra seviye ve grup görevi | Türkiye'de 2004'ten beri en çok oynananlardan; **nostalji ve özel sunucu kültürü** (arama özeti) |
| **Metin2** **[22]** | Hack-and-slash MMORPG (Gameforge) **[RPG: yalnız sosyal dersi]** | Sınıf (4) ve krallık seçimi; açık dünya PvP | Türkiye'de 2006–07'den itibaren **internet kafelerin** oyunu |
| **Okey / 101 Okey Plus** **[23]** | Sosyal masa oyunu (mobil) | Misafir olarak girip masaya otur; arkadaş masası | "En kalabalık Okey"; günlük **1 milyondan fazla oyuncu** (mağaza metni) |
| **Tavla (Plus, Go vb.)** **[24]** | Sosyal masa oyunu (mobil) | Anında eşleşme veya arkadaşla masa | "Adil zar" sertifikası; turnuvalar |
| **Türk yapımı mobil/FPS örnekleri** **[25][29]** | Royal Match (eşleştirme), Toon Blast; Zula, Wolfteam (FPS) | Royal Match: çok kısa, anında ödüllü seviyeler; Zula ve Wolfteam: internet kafede takım buluşması | Royal Match 2023'te dünyanın en çok kazanan mobil oyunu oldu; Dream Games ~200 çalışan **[29]**; Zula Türk yerel kültürü içerir |

### 1.2 Çekirdek döngü ve geri getiren şey

Geri getiren sütunu **çıkarımdır**, oyuncu verisi değildir; kaynakta yazılan yerlerde numara vardır.

| Oyun | Dakika | Saat / gün | Hafta ve ötesi | Oyuncuyu geri getiren |
|---|---|---|---|---|
| **Capital Rift** | Pişir, işçi yerleştir, fiyat/limit emri, dükkâna yürü | Dükkân ve çiftlik kur; işçiler çevrimdışı çalışır | Yeni zincir (kereste, cevher, bilgisayar); bağımsız veri yok | Yaptığın işin **dakika başına kâr/zarar** olarak görünmesi, kendi sokağın (çıkarım) |
| **Minecraft** | Topla, yerleştir, savun | Gün-gece döngüsü; yapı projesi | Sunucu ve mod topluluğu | Özgür hedef + sosyal sunucular **[3]** |
| **Albion** | Topla, üret, savaş | Ada ürün döngüsü (~22 sa, günde 15 dk), pazar farkı | Bölge, lonca savaşı, kale | Risk/ödül ve yerel pazar; Albion adası "angaryaya dönebilir" **[bkz. 04 oyun tasarımı]** |
| **EVE** | Madencilik, kaçırma, savaş | Üretim ve ticaret, kurumsal operasyon | Egemenlik savaşları, büyük çarpışmalar **[7]** | Oyuncu hikâyeleri (B-R5RB, 21 saatlik savaş) ve kurumsal bağ |
| **Eco** | Topla, üret, beslen | Ortak proje, yasa teklifi | 30 günlük meteor hedefi **[9]** | Ortak hedef + ekolojik sonuçların **görünür** olması |
| **Victoria 3** | İnşaat sırası, bina ayarı | Yasa, çıkar grupları | Sanayileşme eğrisi | Ekonominin büyümesini izlemek (bazıları için çok tatmin edici) **[11]** |
| **Anno 1800** | Yerleştir, bağla | İhtiyaç → zincir → seviye atla | Yeni bölge/dünya | "Hipnotik" büyüme döngüsü; yeni nüfus seviyesi **[12]** |
| **Big Ambitions** | Yürü, mağaza kur, restok | Personel, kredi | Zincir büyütme | Döngünün kendisi; ama "sür-park-tekrarla" şikâyeti **[13]** |
| **GTA Online işletmeleri** | Tedarik/satış görevi | Gece kulübü 48 dk'da (bir oyun günü) kasasına gelir yazar: popülerlik %95–100'de GTA$50.000'e kadar **[14]** | Haftalık etkinlikler ve indirimler | Pasif gelir + haftalık etkinlik; eleştiri: **grind** |
| **Foxhole** | Taşı, inşa et, savaş | Regiment operasyonu | Haftalar süren harp, sonra yeni harp | Sosyal sorumluluk ve bütün cephenin "senin taşıdığına" bağımlı olması |
| **Travian** | Bina yükselt, birlik gönder | Yağma, ittifak | ~200. günde Harika; dönem biter | Ortak kazanma hedefi + rekabet; **ücretli avantaj** eleştirisi |
| **Rise of Kingdoms** | Kaynak topla, bina yükselt | Etkinlik takvimi 24/7 | Krallık savaşı | Bildirim baskısı ve ittifak; oyuncular geceleri uyanıyor **[17]** |
| **Stardew** | Sula, topla, konuş | Gün sonu özeti; her mevsimin görevleri | 28 günlük mevsimler, yıl hedefleri | **Sürekli küçük ödül + öngörülebilir takvim**, köylülerle bağ **[18]** |
| **RuneScape** | Tek-tık beceri eylemi | Beceri seviyesi, görev | Büyük hedefler, GE | İlerleme sayıları + arkadaş toplulukları |
| **Habbo** | Oda sohbeti, döşeme | Etkinlik, nadir eşya takası | Rol oyunu toplulukları | Sosyal kimlik; moderasyon skandalları sonrası düşüş **[20]** |
| **Club Penguin** | Mini oyun, sohbet | Dekorasyon, puffle bakımı | Aylık partiler | Güvenli sosyal alan + etkinlik takvimi |
| **Knight Online** | Öldür, seviye, grup | PvP bölgeleri | Ulus savaşı | Ulus aidiyeti ve arkadaşlar; nostalji |
| **Metin2** | Metin taşı ve düşman kes | Ekipman, PvP | Sunucu etkinlikleri | İnternet kafe topluluğu ve klan |
| **Okey / Tavla** | 5–20 dk'lık el | Arkadaş masası | Turnuva, hediye | Tanıdık oyun + **tanıdık insanlarla masa**; günlük alışkanlık |
| **Royal Match** | 1–3 dk'lık seviye | Günlük görev, kulüp | Takım ve etkinlik | Anında ödül; geniş kitle |

### 1.3 Sosyal yapı ve para kazanma

| Oyun | Sosyal yapı | Para kazanma |
|---|---|---|
| **Capital Rift** | Sohbet, DM, arkadaş, profil; lonca/ittifak **bulunamadı**; Discord rehberi | Ücretli kapalı beta "Player Pass" (tek seferlik, varsayılan 500 sent), lansmanda ücretsiz + VIP; **takas edilebilir kupa** sadakat kazancını artırıyor (bkz. [Capital Rift raporu §2.5.1](capital-rift-mekanikleri.md)) |
| **Minecraft** | Sunucular (Hypixel 14 milyondan fazla oyuncu), Realms (3.000 davetli) | Tek seferlik satın alma, 400 milyondan fazla kopya; Pazaryeri 2022'ye dek 500 milyon doların üstünde **[3]** |
| **Albion** | Lonca (en çok 300), bölge/kale savaşı | Başlangıç paketleriyle çıktı, Nisan 2019'dan ücretsiz; üyelik (Premium), altınla da alınabilir **[4]** |
| **EVE** | Kurum ve ittifaklar, egemenlik | Ücretsiz Alpha, ücretli Omega; PLEX ile oyunla kazanılan parayla abonelik **[7]** |
| **Eco** | Seçilmiş hükümet, kasaba, yasalar | Fiyat bu turda bulunamadı **(doğrulanmadı)** |
| **Victoria 3** | Tek oyunculu/çok oyunculu | Satın alma + sekiz büyük DLC (2026'ya dek) **[11]** |
| **Anno 1800** | Çok oyunculu mod | Satın alma + dört dalga ücretli DLC ve kozmetik görünümler **[12]** |
| **Big Ambitions** | Tek kişilik | Tek seferlik 25,99 $ (Steam); erken erişim Mart 2023, 1.0 Ağustos 2026 (arama özeti) **[13]** |
| **GTA Online** | Ekip, CEO organizasyonu | Köpekbalığı Kartları (gerçek para) en büyük dijital gelir kalemi; haftalık güncelleme **[14]** |
| **Foxhole** | Regiment (yarı-lonca), sesli iletişim | 29,99 $ (Steam), mikroişlem yok (geliştirici ideali) **[15]** |
| **Travian** | İttifak (en çok 60), ortaklaşa harika | Altın (kaynak/inşa hızlandırma) ; çok eleştirilen ücretli avantaj **[16]** |
| **Rise of Kingdoms** | İttifak, krallık | VIP ve paket; 3,5 milyar $'ı aşan gelir; ücretli avantaj eleştirisi **[17]** |
| **Stardew** | Köylüler, çok oyunculu çiftlik (2018) | Tek seferlik; 50 milyondan fazla satış (Şubat 2026) **[18]** |
| **RuneScape** | Arkadaş, minigame, GE meydanı | Ücretsiz + üyelik **[19]** |
| **Habbo** | Odalar, rol oyunu toplulukları | Kredi (gerçek para), Duckets (başarım), Elmas; Habbo Club **[20]** |
| **Club Penguin** | Arkadaş, igloo ziyareti | Üyelik (aylık 5,95 $); kullanıcıların %90'ı ücretsiz; Disney 350,93 milyon $'a aldı (2007), 2017'de kapandı **[20]** |
| **Knight Online** | Ulus, parti, klan | "Ücretsiz" ama yoğun saatte çoğu sunucu için premium üyelik gerekiyor **[21]** |
| **Metin2** | Klan, krallık | Ücretsiz + eşya mağazası (rahatlık ve kozmetik) **[22]** |
| **Okey Plus** | Arkadaş masası, özel masa, sesli sohbet | Ücretsiz + oyun içi satın alma (Zynga) **[23]** |
| **Tavla** | Turnuva, arkadaş | Ücretsiz + oyun içi satın alma **[24]** |
| **Royal Match / Zula** | Takım/kulüp; klan ve turnuva | Uygulama içi satın alma **[29]**; Zula/Wolfteam ücretsiz FPS + eşya (arama özeti) **[25]** |

### 1.4 Karar tablosu: al, uyarla, alma

| Oyun | **Al** (doğrudan işe yarayan fikir) | **Uyarla** (bizim sisteme çevir) | **Alma** |
|---|---|---|---|
| **Capital Rift** | Karakterle yürüme ve içeri girme, canlı kâr/zarar, çevrimdışı çalışma, bina içinde yayın yok, bağlantı yasağı, orta tıkla bilgi | Yemek arabası → **Açılış Tezgâhı**; işçiyi sürükleme → görsel NPC çalışanlar (durumu sunucuda yok); tek borsa → NPC talep tabanı + bölgesel defter (v1.5) | Mutfak mini oyunu, 6 geliştirme hattı, dükkân stili 2× satış, Player Pass/VIP/kupa, servet halkası, akış çizgileri, "dünyayı düzenle" |
| **Minecraft** | Anında tepkili hareket, **ilk gece** gibi bir "ilk gün" merakı, haritacı tüccar (keşif = bilgi) | Gün-gece → gerçek saat; "hedef yok" → rehberli ama kaçınılabilir görev | Blok estetiği, tarif-wiki bağımlılığı, serbest dünya düzenleme |
| **Albion** | Yerel pazar (yerinde işlem), başlangıç kasabası seçimi, "ana görev yok" özgürlüğü | 5 kasaba → **3 önerilen ilçe**; ada → arsa; lonca → kooperatif/esnaf odası | Tam yağma, Royal City adları, Black Market |
| **EVE** | Savunanın seçtiği saldırı penceresi, tek dünya, ekonomiyi oyuncunun taşıması | "Sovereignty" → **il/ilçe kontrolü**; PLEX → alma | Karmaşık ilk saat, FOMO'lu mağaza reklamları, "her şey risk" |
| **Eco** | Ortak hedef, yasaların sonuca etkisi | Meteor → **imece (ortak proje)**; ekoloji → iklim ve kirlilik (S4) | 30 günde biten hedef (dünya sıfırlamayız), kasaba için ≥3 vatandaş eşiği |
| **Victoria 3** | Nüfus ve piyasanın canlı hissi | Çıkar grupları → 5 grup (Çiftçi, Sanayi, Esnaf-Tüccar, İşgücü, Çevre-Miras) | Bina ayarı mikro yönetimi, "her ülkede aynı strateji" |
| **Anno 1800** | Taslak modu, kademeli ihtiyaç/seviye, güzel şehir | Nüfus seviyeleri → **ilçe gelişim seviyesi** (Köy → Kasaba → Merkez → Şehir) | Ani 14 zincir yığılması |
| **Big Ambitions** | İç mekân puanı, öğretici adım adım açar | İç mekân puanı → vitrin puanı (≤+%10); taksi/metro → **dolmuş** | "Sür-park-tekrarla", yanlış tıklama maliyeti |
| **GTA Online** | Bakım ziyareti (uğrayınca değer geri gelir), pasif seçenek | Popülerlik formülü → **tabela/vitrin bakımı** (aşınma −%5, günde ≤6) | Zorunlu satış görevi, Köpekbalığı Kartı, tek yıkım |
| **Foxhole** | Haftalar süren harp ritmi, ortak sorumluluk | Regiment → kooperatif; lojistik **arka plan** | Zorunlu taşıma (grev dersi) |
| **Travian** | Yeni oyuncu koruması, görev zinciri, ortak büyük hedef | Dünya Harikası → **il imecesi (kalıcı altyapı)**; dünya sıfırlanmaz | Altınla hız, dönem sonu sıfırlama |
| **Rise of Kingdoms** | Rehberli ilk görevler | Etkinlik → **tek akşam penceresi, kaçırma cezası yok** | 24/7 etkinlik baskısı, VIP, "ham güç" PvP |
| **Stardew** | Sürekli küçük ödül, gün sonu özeti, takvim günleri, topluluk paketi (bundle) hedefi | Gün sonu → **Defter**; Topluluk Merkezi → **imece/kooperatif hedefi**; mevsim → iklim takvimi | Büyükbaba mektubu açılışı, evlilik/hediye sistemi (kapsam) |
| **RuneScape** | Tek-tık etkileşim, Öğretici Ada'nın "her durakta bir fikir" sunumu, GE'nin sosyal meydan olması | Öğretici Ada → **ilk 10 dk mahalle turu** (tezgâh, pano, çay ocağı, keşif noktası); GE → **ilçe pazarı meydanı (yalnız yerinde)** | Uzaktan emir defterinin yürüyüşü öldürmesi (T2) |
| **Habbo** | Oda ve vitrin kimliği, rol oyunu esnekliği | Oda → **tabela ve vitrin** (≤3 ürün); sohbet balonları | Para ile nadir eşya, izometrik otel görseli, serbest metin zayıf moderasyonu |
| **Club Penguin** | Güvenli sohbet menüsü, aylık parti/etkinlik, igloo ziyareti | Hazır cümle menüsü → **4 selam**; parti → bayram/fuar günü | Üyelik duvarı ve "kast sistemi" **[20]**, penguen/igloo ifadesi |
| **Knight Online** | **Ulus savaşı kimliği**, arkadaş grubu, nostalji | Karus/El Morad → **il vs il kontrol savaşı (gerçek ilçe adları)** | Zorunlu premium; ulus adları ve kahramanlar |
| **Metin2** | Klan buluşması hissi | Klan → **kooperatif/esnaf odası** | Hack-and-slash PvP merkezli yapı |
| **Okey / Tavla** | Tanıdık masa oyunu, arkadaş masasına tek tıkla oturma, **misafir girişi** | **Mahalle kahvesi**nde masa (yalnız sosyal, bahis yok) → "sonra" | Bahis/jeton para değeri, Zynga arayüzü ve varlıkları |
| **Royal Match / Zula** | Anında kısa ödül hissi (ilk 60 sn tezgâh satışı), yerel kültürel doku | Zula'nın yerel mekânlar fikri → gerçek mahalle | Eşleştirme mini oyunu, FPS merkezi |

### 1.5 Türk oyuncu için çıkarımlar (matrisin süzülmüş hâli)

| # | Gözlem (kaynak) | Çıkarım (bizim için) | Güven |
|---|---|---|---|
| T1 | Okey Plus günde >1 milyon oyuncu, misafir girişi, arkadaş masasına tek tıkla katılım, özel masada sesli sohbet **[23]** | **Sürtünmesiz giriş** (misafir) ve **tanıdıkla ortak mekân**; sohbet yerine masa/etkileşim | Orta (mağaza metni) |
| T2 | Knight Online: ulus seçimi, Türkiye'de başından beri en çok oynanan; oyuncu nüfusunun ~%75'i Türk (2005, tek kaynak) **[21]** | **Aidiyet** (ulus → il/ilçe) güçlü bir bağlayıcıdır; kendi ilini savunmak anlamlıdır | Düşük–orta |
| T3 | Metin2, Wolfteam, Zula: internet kafe buluşması, klan kültürü **[22][25]** | Arkadaşla birlikte girişi **tek bağlantıyla** kolaylaştır (davet bağlantısı, oyun içinde bağlantı yasağıyla çelişmez: yalnız oyun içi sohbette yasak) | Orta |
| T4 | Türkiye'de oyuncu sayısı 50 milyonu aşıyor; mobil oyuncuların %54'ü bulmaca/kelime, %52'si kart oyunu tercih ediyor; 25–34 yaş grubu %40 (arama özeti) **[26]** | Kitle **mobil ağırlıklı**; strateji türü ana akım değil: **kısa oturum, mobil dikey düzen, kart/masa dili** (Defter, tezgâh) | Düşük (tek derleme) |
| T5 | Royal Match 2023'te dünya zirvesi, Türk ekibi (~200 kişi) **[29]** | Türk takımları **hafif, cilalı, hızlı geri bildirimli** ürün üretebilir; "ilk 60 saniye" cilasına yatırım yapmak mantıklı | Orta |
| T6 | Semt pazarları haftanın belirli günlerinde kurulur; esnaf-müşteri pazarlığı ve çay ocakları atmosferin parçası; Kadıköy Salı Pazarı salı günü 1.900 tezgâh (arama özeti) **[28]** | **Pazar günü** hem gerçek hem tanıdık bir ritim; ilçeye özgü gün | Orta |
| T7 | Türkiye'de 32.238 mahalle + 18.278 köy = 50.516 muhtar; seçim 5 yılda bir (31 Mart 2024) **[27]** | **Muhtar mahalle düzeyindedir**; bu, oyunda ilçeden daha küçük ve çok sayıda "makam" demektir | Yüksek |

---

## 2. Neyi harmanlıyoruz: ilkeler ve RPG örneklerinden ne alınır

**Sahibin düzeltmesi (1 Ekim).** Aradığımız bir MMORPG değildir: **sınıf seçme, seviye atlama, karakter ilerlemesi, ekipman, beceri/ustalık puanı yoktur.** Oyun **strateji tabanlıdır**; çekirdek döngü stratejik kararlardır (yatırım, üretim zinciri, pazar, yönetişim, ittifak, askeri). Karakterle yürüyüş ve oyun içi sunum/jenerik **yalnız oyuncuyu oyuna adapte etmek ve dünyayı hissettirmek** içindir; bu rapor onu çekirdekten ayrı bir **adaptasyon katmanı** olarak ele alır (§5). Karakter bir kamera ve temas aracıdır; kozmetik dışında ilerlemesi yoktur.

| # | İlke | Dayandığı oyunlar | Bizdeki hâli |
|---|---|---|---|
| H0 | **Strateji merkezde, adaptasyon çevrede** | Anno, Victoria 3, Eco, Foxhole (strateji çekirdeği); Capital Rift (yürüyüş sunumu) | Her döngü bir **karar** üretir (§3); yürüyüş aynı kararın **ikinci yüzüdür**, güç kazandırmaz |
| H1 | **İlk dakikada somut kazanım, ilk saatte karar özgürlüğü** | Stardew, Albion (sunum), Anno | 60 sn'de ilk satış; 10 dk'da rehberli hedef kartı; sonra serbest |
| H2 | **Ortak mekân, ortak hedef, kişisel kazanç** | Eco, Travian, Foxhole, Okey masası | Pazar yeri, imece ve kooperatif; kazanç kişiseldir, kimlik kolektiftir |
| H3 | **Gerçek zamanlı takvim, ama kaçırma cezası yok** | Stardew (sabit günler), GTA (haftalık etkinlik), RoK (karşı örnek) | Pazar günü, seçim gecesi, bayram, fuar; çevrimdışıyken tembel birikir |

**RPG ve MMORPG örneklerinden yalnız ne alınır.**

| Oyun | **Alınır** (sosyal/topluluk ve sunum) | **Alınmaz** (ilerleme sistemi) |
|---|---|---|
| **Knight Online** | Ulus aidiyeti hissi, arkadaş grubu, nostalji kültürü → il/ilçe kimliği | Sınıf, seviye, ekipman, öldür-kazan |
| **Metin2** | İnternet kafe/klan buluşma hissi → kooperatif/esnaf odası topluluğu | Sınıf, metin taşı farm'ı, PvP ekipman yarışı |
| **RuneScape** | Öğretici Ada'nın "her durakta bir fikir" sunumu, GE meydanının sosyal ortak alan oluşu | Beceri seviyeleri, XP, görev ilerlemesi |
| **Albion** | Başlangıç seçimi sunumu ("3 önerilen ilçe"), yerel pazar ve bölge kontrolü (ekonomi/yönetişim dersi) | Sınıfsız ekipman sistemi, Destiny Board, fame/seviye |
| **EVE** | Tek evren, oyuncu ekonomisi, savunan penceresi (strateji dersi), ilk izlenim sahnesi | Beceri eğitimi (skill queue), gemi/ekipman ilerlemesi |
| **Habbo / Club Penguin** | Sosyal alan, güvenli ifade menüsü, etkinlik takvimi | Kıyafet/rozet ekonomisi, üyelik kast sistemi |

Bu tablodaki "alınmaz" sütunu bir tasarım yasağıdır: karakter kimliğinde seviye ya da XP göstergesi, sınıf seçimi ve ekipman yoktur (bkz. Ç9).

---

## 3. Harman: bizim çekirdek döngülerimiz (stratejik kararlar)

Her döngü **oyuncunun verdiği kararı** adlandırır. Yürüyüş ve sahne sunumu bu tablolarda **yoktur**; aynı kararların adaptasyon katmanındaki yüzü §5.5'te toplanmıştır. Aşama etiketleri öneridir: **A0** = Alfa-0 (en çok 200 davetli), **A1** = Alfa-1, **Sonra** = v1.5 ve ötesi. Her karar panelden/haritadan verilebilir; zorunlu uğrama yoktur.

### 3.1 30 saniye: bak, tek karar ver

**Sahne.** Oyuncu girer; Dikkat panelinde en çok 5 madde: "Tarla: don uyarısı (24 sa)", "Gıda fabrikası: girdi eksik ▲", "Esnaf siparişi: 3 kasa, ₺2.100, 4 gün". Fiyatı %5 oynatır, siparişi kabul eder ya da bir oyu verir; çıkar.

| Alınan fikir (kaynak) | Stratejik karar | Bizde özgünleşmesi | Aşama |
|---|---|---|---|
| **Canlı kâr/zarar** (Capital Rift) | Fiyatı, üretimi, ölçeği değiştir/değiştirme | **Defter** satırı olarak sunulur: bakkal defteri metaforu; dakika ve gün başına kâr + "rozetin nedeni" | A0 |
| **İhtiyaç göstergesi** (Anno) | Eksik girdiyi nasıl kapatırım: üret mi, ithal mi, bekle mi | Yapı başına **tek rozet** (▲ eksik girdi, ◯ boşta, ✓ bitti); akış çizgisi yok (K29) | A0 |
| **Kapsam konsolu, sakin hâli** (Capital Rift "aç kalan") | Hangi yatırım önce | **Dikkat paneli ≤5 madde** + tuşla açılan 8 mercek (arayüz-ux) | A0 |
| **Kelepçeli piyasa fiyatı** (Victoria 3, 08 P2) | Fiyat bandı içinde ne zaman sat | Tek kaydırıcı; NPC makası ve kıtlık sinyali görünür | A0 |
| **Yasa/seçim oyu** (Eco, Victoria 3) | Oy kimin lehine | Tek dokunuşluk oy; vaat kartı özeti | A1 |

**30 sn bütçesi (öneri):** ≤3 tıklama; hiçbir karar 30 saniyeden uzun sürmez; karar çok değilse oyun bunu "bugün yapacak şey yok" diye açıkça söyler.

### 3.2 5 dakika: yatırım ve üretim zinciri kararı

**Sahne.** Oyuncu ilk yapısını hayaletle yerleştirir (maliyet kartı: arsa + yapı), yöntemi seçer, ekim karışımını ayarlar; üretimin hangi gıda fabrikasına gideceğini ve yerel mi toplu pazara mı satacağını belirler. İnşaat çubuğu (Temel, İskele, Gövde, Tamam) ilerlerken kâr tahminini okur.

| Alınan fikir (kaynak) | Stratejik karar | Bizde özgünleşmesi | Aşama |
|---|---|---|---|
| **Taslak (hayalet) modu** (Anno blueprint) | Nereye, hangi yapı, hangi ölçek (S/M/L) | 11 §7.3 ile aynı; ek: yerleşimde **arsa + yapı tek kart**, parasız önizleme | A0 |
| **Üretim zinciri** (Anno, Capital Rift, Eco) | Girdi → işleme → satış dengesi; hangi katman | 6 katman; **lojistik arka planda**; zincir ihtiyacı rozetle | A0 |
| **Hasat karışımı ve gübre** (08 T1, T4; Farming Simulator ekim nöbeti) | Monokültür mü, nöbet mi; gübre dozu | İklim takvimine göre hasat eğrisi (08 T2); karışım yinelenen karardır | A0 |
| **Bakım düzeyi** (GTA bakım ziyareti fikri, 08 S3) | Bakım harcaması mı, aşınma riski mi | Seri yok; uzaktan `genel_onarim` | A0 |
| **Pasif alternatif** (GTA teknisyeni, Capital Rift kasiyeri) | Kasiyer/kalfa NPC işe al mı | Sen yokken tezgâh %70 verimle satar (tembel formül); zorunlu değil | A1 |
| **İç mekân puanı** (Big Ambitions) | Vitrin yatırımı (≤+%10 talep) | **Vitrin puanı** 0–100: ad + çeşitlilik + bakım + temizlik | A0 (ad), A1 (3B) |
| **Gün sonu özeti** (Stardew) | Yarın neyi değiştireyim | **Akşam Defteri**: "sen yokken" özeti, bir satır bir olay | A0 |

**Mini oyun yok kuralı.** Capital Rift'in pişirme mini oyunu gibi yeni mini oyun eklemiyoruz (kapsam şişmesi, H11 dersi); beceri değil karar ölçülür.

### 3.3 1 saat: genişleme, sözleşme, yönetişim, ittifak, askeri

**Sahne.** Oyuncu ilçe meydanı panosundan teminatlı bir esnaf siparişi alır, ilçe pazarında tezgâh yuvasına mı yoksa toplu NPC pazarına mı satacağını seçer, imece projesine ne kadar malzeme katacağına karar verir. Hazır komşu arsayı "Genişlet" ile alır. Ordugâh kurarsa mühimmat ve gıda talebi doğar; kooperatif varsa ortak bir sipariş yazar.

| Alınan fikir (kaynak) | Stratejik karar | Bizde özgünleşmesi | Aşama |
|---|---|---|---|
| **Yerel pazar** (Albion şehir pazarları) | Nerede sat: ilçe tezgâhı mı, toplu NPC pazarı mı | **İlçe pazarı**: tezgâh yuvası ilçe seviyesine bağlı (4/8/16); NPC talebi taban | A1 |
| **Sözleşme/iş panosu** ([Capital Rift raporu §4.2, madde 4](capital-rift-mekanikleri.md), 08 P5) | Teminat riski, vade, ödül | **Esnaf siparişi**: kurgusal esnaf; ≤3 açık; ödül piyasanın %5–15 üstü | A0 (liste) |
| **Kademeli seviye** (Anno nüfus seviyeleri) | Hangi ortak yatırım ilçeyi seviyeye taşır | **İlçe gelişim seviyesi** Köy → Kasaba → Merkez → Şehir; herkese aynı anda açılır | A0 |
| **Ortak hedef** (Eco meteor, Stardew Topluluk Merkezi paketi) | Katkı miktarı ve proje önceliği | **İmece**: köprü, çeşme, pazar çatısı, baraj; kitabe yalnız katkı miktarına göre | A1 |
| **Yönetişim** (Eco yasa, Victoria 3 çıkar grupları) | Vergi bandı, imar payı, 7 yasa | Muhtar/meclis/vali; 5 çıkar grubu; kart bedelleri ([çeşitlilik raporu §4](cesitlilik-yonetim-askeri-teknoloji.md)) | A1 (F6) |
| **Ortak örgüt** (Foxhole regiment, EVE kurum, Knight Online/Metin2 klan: yalnız topluluk dersi) | Kiminle ortak hazine, ortak yapı | **Kooperatif / Esnaf Odası**; gerçek kuruluş adları taklit edilmez | Sonra (v1.5) |
| **Askeri üretim zinciri** (11 Ek karar; Foxhole'dan yalnız ritim) | Ordugâh, mühimmat+gıda, savunma yapısı | NPC eşkıya baskınları (PvE); H5 korumaları | A0 (PvE), A1 (PvP) |
| **Teknoloji** (08 TK) | Hangi yöntemi aç, hangi dalı dışla | Yüzde değil **yöntem açar**; yayılım indirimi | A0 |
| **Hazır arsa** (11 Ek karar; Upland "Fair Start") | Nereye genişle | Adalar, tek tık "Genişlet"; ≤72 hücre, ≤%25 | A0 |

### 3.4 1 gün: pazar günü, seçim, olay

**Sahne.** Cumartesi ilçenin **Pazar Günü**: NPC talebi iki katına çıkar. Oyuncu stoğu ve fiyatı buna göre planlar. Pazar sabahı muhtarlık **seçim gecesi**: oy verir veya aday olur, vaat kartı seçer. Salı günü iklim takvimi **don uyarısı** verir (24 saat önceden): depo, ithalat ya da sigorta olarak tampon kararı. Hiçbirini kaçırsa **Akşam Defteri**'nde özet vardır; hiçbir şey kaybolmaz.

| Alınan fikir (kaynak) | Stratejik karar | Bizde özgünleşmesi | Aşama |
|---|---|---|---|
| **Sabit takvim günleri** (Stardew festivalleri) | Stok ve fiyatı pazar gününe göre planla | **Pazar günü**: ilçe başına sabit hafta günü; talep ×2 **birikir**; kaçıran kasiyerle %70 satar | A1 |
| **Haftalık etkinlik ritmi** (GTA) | Etkinlik haftasına üretim/stok kaydır | **Gerçek takvim**: bayram (bakım/vergi tahakkuku donar), fuar; **günlük giriş ödülü yok** (K13) | A1 |
| **Seçim ve çıkar grupları** (Victoria 3, Eco) | Aday mı, seçmen mi; hangi vaat | **Muhtarlık seçim gecesi**; 3 vaat kartı; vaat karnesi; seçim haftasında transfer tavanı | A1 (F6) |
| **24 saat uyarı** (08 T3, Victoria 3 hasat) | Depo, ithalat, sulama, tarife | İklim olayı + eşkıya baskını duyurusu; **tek akşam penceresi**, kaçırmanın cezası yok (RoK karşıtı) | A0 |
| **Bakım ziyareti** (GTA gece kulübü) | Bakım düzeyi, tabela/vitrin bakımı | Uzaktan `genel_onarim`; seri yok | A0 |

### 3.5 1 hafta: gelişim seviyesi, savaş penceresi, fuar

**Sahne.** Pazartesi ilçe Kasaba'ya yükselir: yeni yapı türleri herkese açılır, **İlçe Bülteni** yayımlanır (vergi tahakkuku, seçim sonucu, imece ilerlemesi). Perşembe ilçe **fuarı**: imza ürün kalitesi ölçülür, NPC alıcı heyeti toplu sipariş verir. Hafta sonu komşu ilin valisi savaş ilan eder; savunan 4 saatlik yoğun saatini seçmiştir, kooperatifler ablukaya mı yoksa savunmaya mı katkı vereceğine karar verir.

| Alınan fikir (kaynak) | Stratejik karar | Bizde özgünleşmesi | Aşama |
|---|---|---|---|
| **Ortak büyük hedef** (Travian Dünya Harikası, Eco) | Büyük imecenin payı | İl başına büyük imece (baraj, köprü, liman); kalıcı altyapı; dünya sıfırlanmaz | A1 |
| **Savunanın seçtiği pencere** (EVE vulnerability) | Savaş ilanı, ittifak seferi, savunma hazırlığı, abluka | 11 §7.7: 12–24 sa hazırlık, 24 sa pencere, 4 sa yoğun saat; **parsel asla el değiştirmez**; Knight Online'dan yalnız **aidiyet anlatısı** (il kimliği) | A1 |
| **Haftalar süren harp ritmi** (Foxhole) | Ekonomik savaş (ambargo, tarife) mı, sefer mi | Harp **olaydır**, sürekli değil: ≥49 saat ara; ekonomik savaş birincil kaldıraç | A1 |
| **Fuar** (yeni; Türkiye tarım/sanayi fuarları) | Hangi ürüne kalite yatırımı | **İl/ilçe fuarı**: imza ürün **kalite eşiği** (oyla değil, ölçümle) NPC alıcı heyetinden toplu sipariş | A1 / Sonra |
| **Bütçe ve vergi** (08 D5) | Bütçe kolları, arazi vergisi bandı | İlçe/il bülteni, yalnız toplu sayılar | A0 |
| **İklim takvimi** (08 T2) | Aylık ürün/ihracat planı | Zaten karar (K20); bayram ritmi eklenir | A0 |

### 3.6 Tek ekranda: örnek bir oturum

| Süre | Oyuncu ne karar verir | Hangi döngü |
|---|---|---|
| 0–1 dk | Akşam Defteri: "sen yokken 4 satış, 1 uyarı"; don uyarısını okur | 30 sn |
| 1–4 dk | Domates fiyatını %5 artırır, esnaf siparişini kabul eder, bir ambar yükseltmesini taslağa alır | 5 dk |
| 4–8 dk | İmece projesine malzeme ayırır, pazar gününe stok planlar | 1 saat / 1 gün |
| 8–10 dk | Vali ilanını okur, kooperatif sohbetinde savunma payına söz verir; çıkar | 1 hafta |

Toplam 10 dakika. Günde 1–2 böyle ziyaret yeterlidir (11 §7.1), günlük giriş ödülü yoktur.

---

## 4. Özgün kimlik

### 4.1 Tek cümle ve konumlandırma

> **"Kendi mahallendeki bir tezgâhla başlayıp, yatırım, üretim, pazar, yönetim ve ittifak kararlarınla ilçeni, ilini ve pazarını komşularınla birlikte büyüttüğün; gerçek Türkiye haritasında, herkesle paylaşılan sakin bir strateji oyunu."**

Kısa söylem (öneri): **"Mahallenden başla."** Alternatifler: "Tezgâhtan ile." · "Birlikte kurduğumuz Türkiye." Çalışma adı: mevcut **Bölge Stratejisi** korunur; ticari ad ve marka taraması yapılmadı. (Ad fikirleri: *Mahalle*, *Pazar Yeri*, *İmece*; üçü de yaygın kelime olduğu için **marka taraması gerekir**, K34.)

**Strateji çerçevesi (kimliğin omurgası).**

| Boyut | İçerik |
|---|---|
| **Neyin stratejisi?** | Üretim zinciri ve yatırım (Tarım, Sanayi, Lojistik arka planda, Teknoloji), pazar ve sözleşme (Pazar), yönetişim (Devlet: muhtar, meclis, vali, yasa, bütçe), ittifak (kooperatif), **askeri güç** (ordugâh, savunma, il kontrol savaşı, ekonomik savaş) |
| **Oyuncu ne yapar?** | Karar verir: nereye yatırım, hangi yöntem, ne fiyata nerede sat, hangi yasaya oy, kime destek, ne zaman savun. Kararlar dakika, saat, gün, hafta ritmindedir (§3) |
| **Ne değildir?** | MMORPG değil: **sınıf, seviye, XP, ekipman, beceri/ustalık ilerlemesi yok.** Karakter kozmetiktir ve adaptasyon aracıdır (§5). "İlerleme" **yapılarda, ilçede, ilde ve ortak projelerde** görünür, kişide değil |
| **Kazanma biçimi** | Dönem sonu/sıralama yok; dünya sıfırlanmaz (K21). Kalıcı prestij: kitabe, ilçe seviyesi, "ilk" başarımları |

**En yakın üç oyun ve farkımız.**

| En yakın oyun | Neden yakın | Bizim farkımız |
|---|---|---|
| **Capital Rift** | Gerçek OSM dünyası, karakterle yürüyüş, iş kurma | Capital Rift işi **karakterle yaptırır** (pişir, sürükle, sür); biz **karar** veririz, yürüyüş adaptasyondur. Tek kişilik iş imparatorluğu yerine **kolektif mahalle-ilçe-il yapısı**; yönetişim ve askeri ayak; Türkiye'ye özgü imza mekanikler; tam oyuncu pazarı yerine NPC tabanlı talep |
| **Eco** | Yasalar, ortak hedef | Hayatta kalma değil **ekonomi/üretim**; gerçek coğrafya; sakin görsel; çevrimdışı çalışma |
| **Anno 1800 / Victoria 3** | Üretim zinciri, kademe; nüfus ve piyasa | Paylaşılan kalıcı dünya; gerçek zamanlı canlı olaylar; kolektif ilerleme (ilçe seviyesi herkes için); Victoria 3'ün mikro yönetim yükü ve "herkes aynı strateji" sorunu yok (08) |

### 4.2 Beş imza mekanik

**Dürüstlük notu.** Her imza mekanik bir **stratejik karar** taşır (İ-1 oy ve makam, İ-2 stok/fiyat planı, İ-3 üretim ve kalite yatırımı, İ-4 bilgiye göre savunma/tampon kararı, İ-5 ortak yatırım payı). Her imza mekanik, parçaları başka oyunlarda bulunan fikirlerin **Türkiye'ye özgü bağlamda birleşimidir**: seçim (Eco/Victoria 3), ortak hedef (Eco/Travian), haftalık pazar (GTA etkinlik, Stardew takvimi). Biz **bağlamı ve birleşimi** özgün sayıyoruz, atomları değil. Aşağıdaki "başka oyunda var mı?" sütunu bu turdaki arama ve bilgimizle yazıldı; kapsamlı bir pazar taraması değildir.

| # | İmza | Ne olur | Başka oyunda var mı? | Neden bizde özgün | Maliyet / aşama (öneri) | Risk ve korunma |
|---|---|---|---|---|---|---|
| **İ-1** | **Mahalle ve muhtarlık** | Dünya il → ilçe → **mahalle**; muhtar mahalle/ilçe adına seçilir (**seçim gecesi**, sandık, duyuru panosu); **muhtar mührü** ortak proje onayında kullanılır; gerçek Türkiye'de 50.516 muhtar vardır **[27]** | Seçimli yönetişim Eco, Victoria 3'te var; **mahalle düzeyi ve muhtar rolü** başka bir oyunda bulunmadı | Gerçek idari birimle, gerçek mahalle adıyla (OSM) bağ; küçük makamların çokluğu (her oyuncu "bir şeyin başı" olabilir) | M; A1 (F6) | Gerçek muhtar adları ve kişiler **kullanılmaz** (NPC); seçimi parayla alma yasağı ([çeşitlilik raporu §4.6](cesitlilik-yonetim-askeri-teknoloji.md)). Açık soru Ç1 (ilçe vs mahalle) |
| **İ-2** | **Pazar günü** | Her ilçenin sabit bir **semt pazarı günü**; o gün NPC talebi artar, tezgâh yuvaları açılır, çay ocağı kalabalıklaşır; kaçıran **kayıp yaşamaz** (birikir/kasiyer satar) | Haftalık etkinlik var (GTA); **gerçek semt pazarı takvimine** bağlı ritim yok | Türk gündelik hayatının tanıdık ritmi; "bu hafta ilçemde pazar salı" deneyimi **[28]** | S–M; A1 | Kaçırma baskısı yapmayacak şekilde tasarlanır (RoK karşıtı); gerçek pazar günlerinin verisi yoksa tohumdan |
| **İ-3** | **İmza ürün / coğrafi işaret** | Her ilin 1–3 **imza ürünü** (kalite ve nadir malzeme gerektirir); fuar bu ürünleri sergiler | Albion bölgesel bonusları var; **gerçek coğrafi işaretli ürünlerle** bağlı bir sistem bulunmadı | İl kimliği: "Bursa kestane şekeri / İnegöl köftesi, Kocaeli Hereke halısı" gibi örnekler (**doğrulanmadı**; Sakarya için ve tüm iller için Türk Patent ve Marka Kurumu coğrafi işaret sicili ile doğrulanmalı) | M; A1 | Gerçek marka adı kullanma (örn. üretici markası); yalnız coğrafi işaretli genel ad; kültürel hassasiyet kontrolü (11 K33) |
| **İ-4** | **Çay ocağı / mahalle kahvesi** | Mahalledeki sosyal alan: **söylenti panosu** (iklim uyarısı, fiyat yönü, imece ilerlemesi) ve oturma/sohbet noktası; **bahis yok** | Habbo odaları ve RuneScape GE meydanı sosyal alanlardır; **diegetik Dikkat paneli olarak** kullanılan bir çay ocağı yok (bilinen) | Dikkat panelini sokağa taşır (bilgi > güç); yürüyüşe **uzaktan yapılamayan** bir sebep verir (T2 tuzağına çare) | S (söylenti), M (oturma); A1 | Tavla/okey mini oyunu **Sonra veya hiç**: kapsam şişmesi, kumar algısı, Zynga ile karışma. Açık soru Ç4 |
| **İ-5** | **İmece** | Ortak proje (köprü, çeşme, pazar çatısı, baraj): ortak malzeme, görünür aşamalar, **kitabe** (ilk 10 katkı adı); il başına "büyük imece" | Ortak proje var (Eco meteor, Travian harikası, Stardew paketi) | Türk kültüründeki **imece** kavramı ve **kitabe** (çeşme/köprü yazıtı geleneği) ile **kalıcı, güç vermeyen prestij** | M; A1 | Bedavacı riski (Eco dersi): ceza yok, rozet ve kitabe; kitabe yalnız katkı miktarı (yürüyüş bonusuz) |

**Yardımcı dokular (imza değil, kimlik tuzu).**

| Doku | İçerik |
|---|---|
| **Defter** | Arayüz metaforu: bakkal/veresiye defteri; kâr/zarar satırları, Akşam Defteri, İlçe Bülteni |
| **Dolmuş** | Hızlı seyahat metaforu: yalnız **kendi yapılarına ve komşu ilçelere**, küçük ücret, tek dokunuş; Big Ambitions metro/taksi ile aynı işlev, Türkçe kimlik |
| **Dört selam** | Kolay gelsin · Hayırlı işler · Bereket versin · Geçmiş olsun |
| **Veresiye** (sonra) | Esnaf itibarı: NPC müşteriye veresiye satış, tahsilat gecikmesi; itibar kâğıt üzerinde güç vermez |
| **Bayram ve fuar takvimi** | Takvim bağlamı; bayramda bakım/vergi tahakkuku donar |

### 4.3 Ton ve görsel kimlik

| Boyut | Karar önerisi | Gerekçe |
|---|---|---|
| **Duygu** | Sakin, sıcak, hafif mizahlı; tehditkâr değil | Sahibin "göz yoruyor" geri bildirimi (K29); Stardew'un rahat temposu |
| **Görsel stil** | **Düz renkli** (flat shading), düşük çokgen, kenar çizgisiz; gölge yumuşak, parçacık ve akış çizgisi yok | Tarayıcıda hafif (≤60 çizim çağrısı, İ8); okunurluk |
| **Palet (8 renk, öneri; kontrast ölçülmedi)** | Kâğıt `#F4EFE6` (zemin) · Mürekkep `#23303A` (metin) · Çini turkuazı `#1F8A8A` (birincil) · Kiremit `#C2603A` (Pazar) · Buğday `#D8B04A` (Tarım) · Çayır `#5E9B5A` (olumlu) · Marmara mavisi `#4A7FB0` (su/Lojistik) · Çelik `#6B7782` (Sanayi) | Katmanlar renk + **şekil** ile ayrışır (renk körlüğü); Devlet lacivert, Teknoloji mor, Askeri zeytin ek tonlar |
| **Tipografi** | İ/ı, ğ, ş destekli, yüksek okunurluklu; Türkçe metin %25–30 daha uzun (arayüz-ux) | `toLocaleUpperCase('tr')`, `Intl.NumberFormat('tr-TR')` |
| **Hareket** | Kamera sakin; geçişler 300–600 ms; "hareketi azalt" ayarı | Erişilebilirlik |
| **Ses** | Sokak dokusu, tezgâh sesleri, kısık müzik; kısa jingle yok | Uzun oturumda yorucu değil |
| **Ses tonu (metin)** | "Sen" kipi; sistem sakin, NPC'ler "abla/abi/hanım/beyefendi" gibi sıcak hitap; bölgesel ağız karikatürü **yok** | Ulaşılabilirlik, klişeden kaçınma |
| **Kültürel doku** | El yazısı tabelalar, apartman balkonları ve çamaşır ipleri, çınar altı, sebze kasaları, simitçi arabası; **çay bardağı** simgesi çay ocağı için | Tanıdıklık; stereotipten uzak |

**Mikro metin örnekleri.**

| Durum | Metin |
|---|---|
| İlk yapı tamam | "Hayırlı olsun!" |
| Satış | "+₺85 · Bereket versin" |
| Afet/olay | "Geçmiş olsun. İlçede yardım noktası açıldı." |
| Başka oyuncuyla karşılaşma | "Kolay gelsin" (kısayol) |
| Dönüş özeti | "Sen yokken: 4 satış, 1 uyarı, 0 kayıp." (yalnız doğruysa) |

### 4.4 Türkçe dil ve kültürel doku: dikkat listesi

| Konu | Öneri | Doğrulama |
|---|---|---|
| Para ve sayı | `₺1.234,56`, `%90`, 24 saat, gün adları Pazartesi başlangıçlı | arayüz-ux §6 |
| Resmî semboller | Bayrak ve Atatürk görselleri **kullanılmaz** (yasal ve algı hassasiyeti) | **(doğrulanmadı)**, K34 hukuki görüş |
| Dinî yapılar | Toplanabilir nokta yapma (Capital Rift raporu Ç4); silüet dekor olabilir | iç belge |
| Kumar | Tavla/okey ve **bahis yok**; jeton para değeri yok | **(doğrulanmadı)** hukuki görüş |
| Deprem ve afet | Alfa-0 illerinde (Marmara 1999) **deprem olayı yok** | [çeşitlilik raporu §8.1](cesitlilik-yonetim-askeri-teknoloji.md) |
| Gerçek kişi/işletme | Muhtar, esnaf, işletme adları **kurgusal**; OSM'deki marka POI'leri oyuncu işletmesi gibi sunulmaz | KVKK; ticari marka |
| Hitap | "Sen" kipi; resmî ekranlarda (seçim, savaş ilanı) "siz" | Ton tutarlılığı |

---

## 5. Adaptasyon katmanı: yürüyüş, açılış ve ilk izlenim

### 5.1 Katmanın görevi ve kuralları

Bu bölüm **strateji çekirdeğinin dışındaki** katmanı anlatır: karakterle yürüyüş, açılış sahnesi, jenerik ve sunum. Görevi üçtür: **oyuncuyu oyuna adapte etmek** (ilk dakikada ne olduğunu anlatmak), **dünyayı hissettirmek** (canlı, gerçek, paylaşılan) ve **bağ kurdurmak** (kendi mahallem, komşularım). Stratejik karar buradan çıkmaz; buradan **görünür ve tanıdık olur**.

| # | Kural | Gerekçe |
|---|---|---|
| A1 | **Karakterin ilerlemesi yok**: seviye, XP, sınıf, ekipman, beceri göstergesi yok; avatar yalnız kozmetik (ad, birkaç görünüm) | Sahibin düzeltmesi; strateji oyunu, MMORPG değil |
| A2 | **Yürüyüşten stratejik güç gelmez**; yalnız bilgi, kimlik/kozmetik ve çok küçük, tavanlı kolaylık (≤%5, yapı başına günde 1, seri yok) | K13; [Capital Rift raporu İ1–İ3](capital-rift-mekanikleri.md) |
| A3 | **Her karar panelden/haritadan verilebilir**; yürüyüş aynı kararın ikinci yüzüdür | Zorunlu taşıma/angarya yasağı (T1, T2) |
| A4 | **Adaptasyon bütçesi:** açılış ≤75 sn, ilk 10 dk'da modal öğretici yok, tur ≤3 dk, sahne ≤2×2 km, ≤60 çizim çağrısı | Tarayıcıda hafif; [sokak seviyesi 3D](sokak-seviyesi-3d.md) |
| A5 | **Yeni mini oyun yok**; yürüyüş içeriği yalnız mevcut katmanların yüzüdür | Kapsam şişmesi (H11) |
| A6 | **Sakin sunum:** düz renk, akış çizgisi/parçacık yok | K29 |

### 5.2 Açılışın hedefi

**Hedef.** Oyuncu 60 saniyede (1) bunun **Türkiye'de, gerçek bir yerde** geçtiğini anlar, (2) **karakterini** yönetir, (3) **ilk satışını** yapar ve (4) neyi **birlikte** kuracağını sezer. 5 saniye testi (hipotez): "Bu oyun ne hakkında?" sorusuna cevap "Türkiye'de mahallemde iş kurmak" olmalı.

### 5.3 İlk 60 saniye: sahne senaryosu (zaman damgalı)

| Süre | Ekranda | Ses / metin | Oyuncunun yaptığı | Teknik not (öneri) |
|---|---|---|---|---|
| **0:00–0:08** | Sakin, düz renkli küre; yavaş dönüş; üstte tek cümle: "**Mahallenden başla.**" ; tek düğme **"Başla"** (hesap yok, "misafir olarak oyna") | Uzaktan sokak sesi, kısık | "Başla"ya basar | Küre = mevcut three.js L0; **akış çizgisi/parçacık yok** (K29). Giriş duvarı yok (Okey Plus'ın misafir girişi dersi **[23]**) |
| **0:08–0:18** | Kamera yumuşakça **Türkiye'ye iner**; 81 il hafif sınır; Alfa-0 illeri (Kocaeli, Sakarya, Bursa) **parlak**, diğerleri soluk "yakında" (dürüst kapsam) | — | 3 **önerilen ilçe kartı**: "Gebze · Sanayi ve liman yakın · 14 kişi yeni yerleşti" (yalnız **ölçülmüş** sayı, R-Ü15) | L0 → L1 geçişi çapraz solma; MapLibre ilk karoyu önden yükler. Ayrıntı: 11 §7.9 "Giriş ekranında 3 ilçe önerisi" |
| **0:18–0:28** | İlçe haritası (L2): sınır, mahalleler, **hazır arsa** adaları parlar; "Önerilen" işaretli | "Burada başla" kartı | Bir hazır arsaya **tek tıkla** "Burada başla" | 11 Ek karar: hücre seçimi gizli, "yapı önce yerleşim"; ayrılmış %20 hücre yeni oyuncuya |
| **0:28–0:40** | Kamera ilçe ölçeğinden **sokak sahnesine kesintisiz iner** (L2 → L4); bir **dolmuş** arsanın önüne yanaşır, karakter iner | Kapı sesi, "Kolay gelsin" | Karakter kontrolü başlar (WASD / joystick); ilk adımda hareket **anında** | L4 yürüyüş sahnesi lazy-load; yüklenemezse üstten görünüm yedeği (§5.6) |
| **0:40–0:50** | Arsa tabelasında **Mahalle Muhtarı** (NPC, kurgusal ad): "Hoş geldin, bu arsa senin. ₺50.000 hibe yazıldı." | İki cümle, **atlanabilir**; selam düğmesi "Hayırlı işler" | 20 m yürür, tabelaya yaklaşır; Defter'e ilk satır "Hibe +₺50.000" | Hibe 11 §7.9 ile aynı; metin ≤2 cümle |
| **0:50–1:00** | **Açılış Tezgâhı** hayaleti arsada; tek tıkla kurulur (**anında, parasız**, başlangıç stoğu hazır: örn. 12 kasa mevsim ürünü) ; ilk **NPC müşteri** yürüyüp alır | "+₺85 · Hayırlı olsun!" ; para sesi tek kez | Tezgâhı yerleştirir; ilk satışı izler | **Öneri:** Açılış Tezgâhı 11'in yapı listesinde yok; "Ticaret ofisi" (2 sa) yerine anında kurulan, ilk-oturum-özel yapı. NPC durumu sunucuda tutulmaz, satış tembel formül |

### 5.4 İlk 10 dakika: 60 saniyeden sonrası

| Dakika | Hedef kartı (rehber, modal değil) | Amaç | Not |
|---|---|---|---|
| 1–3 | "İlk gerçek yapın: **Tarla** (veya seçtiğin yol)" ; hayaleti yerleştir, hızlandırılmış inşa başlar | İnşaatın nasıl işlediğini göster | 11 §7.9: ilk inşaat ~24 dk; **bekleyiş boşluğu** aşağıda |
| 3–6 | "Meydana yürü": **esnaf panosu** (ilk sipariş), **çay ocağı** (don/fiyat söylentisi), **kaşif noktası** | Bekleme sırasında yapacak şey ver (Öğretici Ada'nın "her durakta bir fikir" sunumu) | Üç durak ≤250 m; zorunlu değil |
| 6–9 | "Komşunu selamla" (4 selam), imece şantiyesini gör | Sosyal ve ortak hedef sinyali | Başka oyuncu yoksa NPC komşu |
| 9–10 | Akşam Defteri açılır: "İlk günün özeti" ; "İlk yatırımını nereye yapmak istersin? Tarım, Sanayi, Ticaret" | Sınıf, seviye, XP **yok**; yalnız ilk yatırım yönü önerisi (hedef zinciri) | Yön değiştirmek ücretsiz; çünkü yön bir **portföy**, kimlik değil |

**Çelişki bildirimi.** 11 §7.9, "ilk inşaat ~24 dk" der ve ilk 10 dakikada "ilk hasat satışını izle" der. Hasat 10 dakikada gelemez. İki çözüm: (a) ilk yapı için **≤3 dakikalık** hızlı kurulum, (b) ilk 10 dakikayı **Açılış Tezgâhı** satışlarıyla doldurup hasadı 24. dakikaya bırakmak (önerilen). Capital Rift'te ilk dükkân ~8. dakikada (üçüncü taraf video) **[1]**; ilk saat hedefimiz buna eşit veya daha kısa olmalıdır. Lider kararı gerekir.

### 5.5 Yürüyüşün yüzleri: stratejik kararlar sokakta nasıl görünür

Aşağıdaki öğeler §3'teki kararların **sahnedeki yüzüdür**; hepsinin panel karşılığı vardır ve hiçbiri strateji gücü vermez. Ayrıntılı 14 maddelik liste için bkz. [Capital Rift raporu §4.2](capital-rift-mekanikleri.md).

| Strateji kararı (§3) | Sokaktaki yüzü | Alınan fikir | Güç verir mi? |
|---|---|---|---|
| Fiyat, stok, kâr (30 sn, 5 dk) | **Tezgâh ve vitrin**; üstünde Defter satırı | Capital Rift dükkân, Big Ambitions iç mekân | Hayır (vitrin puanı ≤+%10 talep, panelden de ayarlanır) |
| Esnaf siparişi, sözleşme (1 sa) | **Meydandaki ilan panosu** | Capital Rift iş panosu fikri (rapordaki #4) | Hayır |
| İlçe seviyesi, imece (1 sa, hafta) | **Şantiye ve kitabe**; seviye atlayınca tabela | Eco ortak hedef, Anno | Hayır (kitabe prestij) |
| İklim ve fiyat uyarısı (30 sn, 1 gün) | **Çay ocağı söylentisi** | Minecraft haritacı (bilgi) | Hayır (yalnız bilgi) |
| Seçim, yasa (1 gün) | **Sandık, duyuru panosu, ilçe tabelası** | Eco/Victoria 3 yönetişimi | Hayır |
| Askeri hazırlık (1 sa, hafta) | **Karakol, barikat, hasar tespiti** | Foxhole'dan yalnız görsel ritim | Hayır |
| Hızlı seyahat | **Dolmuş** (kendi yapılarına, komşu ilçelere) | Big Ambitions metro/taksi | Hayır |
| Selamlaşma | **Dört selam**, komşu atlası | Club Penguin güvenli ifade menüsü | Hayır |
| İlçe tanıma | **Kaşif noktaları** (5–12 yer) | Pokémon GO/Ingress noktaları | Hayır (atlas, kozmetik) |

### 5.6 Yedekler ve erişilebilirlik

| Durum | Davranış |
|---|---|
| Yavaş bağlantı / zayıf cihaz | Küre atlanır, Türkiye siluetinde il seçimi; L4 yerine üstten görünüm; "Hafif mod" |
| Mobil dikey | Tek eliyle: sanal joystick sol, [E] sağ; hazır arsa tek dokunuş; yazı ≥14 px, dokunma hedefi ≥44 px (arayüz-ux) |
| Geri dönen oyuncu | 60 sn akışı yerine **Akşam Defteri** ve en son yapının önünde doğuş |
| Hareketi azalt | Geçişler çapraz solmaya, kamera iniş sahnesi kesmeye döner |
| Hesap | İlk oturum misafir; 10. dakikada "ilerlemeni kaydet" (Google/e-posta); hesapsız ilerleme 24 saat tutulur (öneri) |
| Dil | Türkçe öncelikli; metinler İngilizceden %25–30 uzun |

### 5.7 Başarı ölçütleri (öneri, insan testi)

| # | Ölçüt | Hedef |
|---|---|---|
| Y1 | 60 sn içinde ilk satışı gören oyuncu oranı | ≥%80 |
| Y2 | 5 sn testinde "Türkiye'de mahallemde iş" cevabı | ≥%70 (n=10) |
| Y3 | İlk 10 dk'da hedef kartından çıkıp meydana yürüyen oyuncu | ≥%60 |
| Y4 | İlk oturum sonu "ne yapacağımı biliyorum" | ≥%80 |
| Y5 | Giriş sayfasından ilk satışa geçen süre ortancası | ≤75 sn |

Botlar eğlenceyi ölçmez (00 R5); Y1–Y5 için Alfa-0'da 8–10 kişilik, 20 dakikalık oturum önerilir.

---

## 6. Kopya riski listesi

**Çerçeve.** Aşağıdaki değerlendirme **hukuki görüş değildir** (K34 dış görüş ister). Genel yaklaşım **(genel bilgi, doğrulanmadı)**: oyun mekaniği ve fikir genelde telif korumasının dışında sayılır; **ifade** (görsel, ses, metin, kod, ad, birebir arayüz, ayırt edici kombinasyonun tamamı) korunur. "Fikir alışverişi" yaparken **ifadeye** ve **ayırt edici bütünlüğe** dokunmayız.

**Üç fark kuralı (öneri).** Bir fikir başka bir oyundan alınıyorsa bizde **üç eksende** farklılaşır: (1) **bağlam** (Türkiye, gerçek mahalle), (2) **bağ** (6 katman, ortak ilçe, askeri güç), (3) **ifade** (ad, görsel, metin, parametre). Alınan her fikir §1.4 ve §3'te **kaynağıyla yazılıdır**; bu belge bir **esin günlüğü** işlevi görür.

| # | Risk | Kaynak oyun | Düzey | Neden | Nasıl kaçınırız |
|---|---|---|---|---|---|
| R1 | **Yemek arabasıyla başlama** ve 7 mutfak (sosisli, burger, suşi…) | Capital Rift | **Yüksek** | Ayırt edici açılış; birebir ifade | **Açılış Tezgâhı** (mevsim ürünü); mutfak/araba yok; hayal gücü yerel: simit, sebze, çay |
| R2 | **6 geliştirme hattı, 10. seviye araba, çekicilik** | Capital Rift | Yüksek | Birebir sistem | Kullanma; yapı yükseltme farklı (S/M/L, ilçe seviyesine bağlı), karakter/araç seviyesi yok |
| R3 | **Pişirme mini oyunu, "dükkân stili 2× hız"** | Capital Rift | Orta–Yüksek | Ayırt edici özellik | Mini oyun yok; vitrin puanı ≤+%10 |
| R4 | **Player Pass, VIP, takas edilebilir kupa, davet yarışı, sadakat** | Capital Rift | Yüksek | Gelir modeli ifadesi | Kullanma; gelir modeli ayrıdır (K13, Ü12) |
| R5 | **Ad benzerliği** ("Capital", "Rift") | Capital Rift | Yüksek | Marka karışıklığı | Ad taraması; Mahalle/Pazar/İmece gibi **Türkçe** ad |
| R6 | **OSM + isim etiketli yürüyen karakter + orta tık wiki** (genel kalıp) | Capital Rift | Düşük–Orta | Kavram yaygın; **ekran düzeni** benzemesin | Kendi arayüz (Defter, Dikkat paneli); orta tık yerine "Bu nedir?" kartı |
| R7 | **Büyükbaba mektubu açılışı** | Stardew | Orta | Tanınmış ifade | Mahalle muhtarının karşılaması; farklı sahne ve metin |
| R8 | **Topluluk Merkezi paketleri** | Stardew | Düşük–Orta | Ayırt edici hedef yapısı | İmece/kitabe farklı yapı; ortak proje aşamalı |
| R9 | **5 başlangıç kasabası + Royal City adları + Destiny Board + Black Market** | Albion | Orta | Ad ve yapı | 3 önerilen ilçe (gerçek adlar); farklı adlandırma |
| R10 | **Popülerlik %5/gün düşer, 48 dk gün** (formül) | GTA Online | Orta | Birebir parametre | Bakım = tabela/vitrin, aşınma −%5, günde ≤6, seri yok |
| R11 | **Köpekbalığı Kartı tipi para birimi** | GTA Online | Yüksek (ahlaki) | Ücretli avantaj | Ücretli güç yok (K13) |
| R12 | **Penguen/igloo, güvenli menü görseli** | Club Penguin | Orta | Görsel ifade | Penguen yok; menü 4 selam, Türkçe ifade |
| R13 | **Izometrik otel, kredi/elmas** | Habbo | Orta | Görsel + ekonomi | 3D düz renk; tek para birimi (₺) |
| R14 | **Karus/El Morad**, kahraman adları | Knight Online | Yüksek | Ulus adları ve görseller | Gerçek il/ilçe adları; il kimliği |
| R15 | **Dünya Harikası düzeni, "Gold"** | Travian | Orta | Ayırt edici mekanik | İmece kalıcı altyapı, dünya sıfırlanmaz; altın yok |
| R16 | **Meteor hedefi, 30 gün** | Eco | Orta | Ayırt edici hedef | Meteor yok; iklim ve imece |
| R17 | **Zynga Okey/Tavla arayüzü ve varlıkları** | Okey Plus | Orta | Ticari varlıklar | Masa oyunu (genel) serbest; **görseller ve UI kendi** |
| R18 | **Egemenlik/Upwell adları** | EVE | Düşük–Orta | Ad | "Kontrol" ve "yoğun saat" kendi adlarımız |
| R19 | **Blok estetiği, creeper vb.** | Minecraft | Yüksek | Marka | Düz renk düşük çokgen; blok yok |
| R20 | **Gerçek marka POI'leri ve logolar** (OSM) | — | Orta | Ticari marka, KVKK | Marka logosu gösterme; işletme adları kurgusal; oyuncu işletmesi gerçek dükkân sanılmaz |
| R21 | **Resmî semboller** (bayrak, Atatürk) | — | Orta | Yasal/algı | Kullanma; K34 görüşü |
| R22 | **Gerçek kişi adları** (muhtar, esnaf) | — | Orta | KVKK, kişilik hakları | NPC kurgusal; OSM'den kişi adı çekme |

**Kopya saymadığımız (güvenle alınan) şeyler.** Tek tuşla etkileşim, kademeli seviye, ortak hedef, taslak modu, bakım ziyareti, yerel pazar, savunan penceresi, canlı kâr/zarar, çevrimdışı çalışma, hızlı seyahat dengesi: bunlar **tür geleneğidir**; parametre ve adlarımız farklıdır.

---

## 7. Kaçınılacak tuzaklar ve önlemler

| # | Tuzak | Örnek / belirti | Önlemimiz | Ölçüt (öneri) |
|---|---|---|---|---|
| **T1** | **Angarya** | GTA satış görevi, Albion ada rutini, Big Ambitions "sür-park-tekrarla" **[13][14]** ([Capital Rift raporu §3.2](capital-rift-mekanikleri.md)) | Yürüyüş ödülü küçük ve tavanlı (yapı başına günde 1, ≤6/gün, seri yok); her işin uzaktan karşılığı; oturum 8–12 dk yeter | Oturumların ≥%60'ı ≤1 ziyaretle biter (H11); "angarya mıydı, merak mı?" sorusu |
| **T2** | **Zorunlu taşıma** | Foxhole lojistik grevi (49 gün, ~1.800 kişi) **[15]** | Lojistik **arka planda**; rota/araç atama yok; teslim noktası yalnız seçenek | Oyuncu şikâyet etiketi "taşıma" ≤%5 |
| **T3** | **Ücretli avantaj** | Travian altın, RoK VIP, Capital Rift kupa-sadakat **[16][17]** | K13: güç satılmaz; kozmetik gelir bile Ç2/Ü12 kararına kadar yok; takas edilebilir değer yok | Gelir modeli incelemesi (K13/K34) |
| **T4** | **Boş dünya** | Tam oyuncu pazarı, az oyuncuda arz yok (R-Ü6); Albion/Capital Rift derslerinden | **NPC talep tabanı**, NPC esnaf siparişi, NPC müşteri, sosyal görsel NPC'ler; ≤200 davetlide ilçe yoğunluğu (Alfa-0 3 il) | Sokakta ortalama görünen avatar+NPC sayısı ≥8 (öneri) |
| **T5** | **Zor ilk saat** | EVE NPE, Anno ani 14 zincir, Capital Rift "ilk başta zor", Foxhole "tek oturumda öğrenilmez" **[7][8][12][15]** | 60 sn açılışı, hedef kartı, **yeni yapı türleri kademeli** (Köy: 5 tür; Kasaba: ek, 11 §7.4); 3 önerilen ilçe; ilk 5 yapıda %30 indirim | Y1–Y5; ilk saat sonunda D1 tutma ölçümü |
| **T6** | **24/7 olay baskısı** | Rise of Kingdoms: oyuncular geceleri kalkıp etkinliğe giriyor **[17]** | Tek akşam penceresi (3 saat), kaçırmanın cezası yok; "çevrimdışı = kayıpsız" ilkesi | Olay katılımı ≤%50, ama kayıp oyuncu şikâyeti ≈ 0 |
| **T7** | **Tek en iyi strateji** | Victoria 3: "her ülkede aynı" **[11]** | İlçe/il imza ürünü, iklim tipi, 5 çıkar grubu; yönetişim kartları | Strateji çeşitliliği (H1) |
| **T8** | **Mini oyun ve kapsam şişmesi** | Capital Rift: bina editörü, kıyafet, hayvan, banka, sürüş (H11) | **Yeni mini oyun yok**; yürüyüş içeriği yalnız mevcut katmanların yüzü; kahvehane masa oyunu Sonra/hiç | Her yeni özellik "hangi katmanın yüzü?" sorusu |
| **T9** | **Serbest metin ve moderasyon** | Habbo 2012 Channel 4 soruşturması, yatırımcı çekilmesi **[20]**; Club Penguin güvenli sohbet **[20]** | Bağlantı ve hakaret filtresi, tabela/aday programı filtre; ilk 14 gün hazır cümle seçeneği; raporla düğmesi | Moderasyon kuyruğu ≤24 sa |
| **T10** | **Hassas konular** | Kumar, din, bayrak, deprem, ihtilaflı sınır (K33) | §4.4 listesi; hukuki görüş (K34); Alfa-0 illerinde deprem yok | Yazılı dışlama listesi |
| **T11** | **Giriş duvarı ve ağır ilk yükleme** | Capital Rift yalnız Google girişi; EVE FOMO reklamı | Misafir giriş, hafif mod, ilk karo önden yüklenir | Y5 |
| **T12** | **Wipe ve güven kaybı** | Capital Rift beta koşulları (ilerleme silinebilir) | Wipe politikası önceden yazılı; yedek/geri yükleme (A0-3); dünya sıfırlanmaz (K21) | — |
| **T13** | **Kimlik karışması** | Çok farklı oyundan alınan çok fikir; "ne oyunu bu?" | 5 imza mekanik dışında özellik eklemeyi **kimlik testiyle** (5 sn) denetle | Y2 |

---

## 8. Açık sorular (sahip / lider için) ve kaynaklar

### 8.1 Açık sorular

| # | Soru | Önerilen varsayılan |
|---|---|---|
| Ç1 | **"Muhtar" gerçekte mahalle/köy muhtarıdır** (50.516 muhtar) **[27]**; 11 §7.6'da "Muhtar" ilçe başkanı olarak geçiyor. İlçe başkanına "Belediye başkanı" demek ya da ilçeyi mahallelere bölüp mahalle muhtarlığı + ilçe meclisi mi kuralım? | Mahalle muhtarlığı (düşük giriş eşiği, çok makam); ilçe meclisi mahalle muhtarlarından oluşur; Alfa-0'da yalnız ad ve NPC |
| Ç2 | **Açılış Tezgâhı** (anında, parasız, ilk-oturum-özel) kabul edilir mi? | Evet (60 sn ilk satış için) |
| Ç3 | **Dolmuş** hızlı seyahat metaforu: kendi yapıları + komşu ilçeler, küçük ücret | Evet |
| Ç4 | Mahalle kahvesinde **tavla/okey** masası | Sonra veya hiç: kapsam şişmesi, kumar, Zynga |
| Ç5 | İlk yapının **~24 dk** inşaatı ile "ilk 10 dk'da hasat" vaadinin çelişkisi | Açılış Tezgâhı ile doldur; hasat 24. dakika |
| Ç6 | **Kimlik sloganı** ve çalışma adı | "Mahallenden başla."; marka taraması sonrası |
| Ç7 | **Kozmetik gelir** (tabela renkleri, dolmuş) ileride ücretli olabilir mi? | Gelir modeli kararına (Ü12) kadar hepsi ücretsiz |
| Ç8 | **Gerçek takvim ritimleri** (bayram, pazar günü) için hangi saat dilimi/dil | Türkiye saati; çok ülkeli yapıda yerel takvim |
| Ç9 | **Sahibin "karakter ilerlemesi yok" düzeltmesi** ile 11'deki iki ifade çelişiyor: §7.6 "Uzmanlaşma: ustalık yolu ×1,5 pahalanır" ve son Ek karardaki "ustalık yaparak kazanılır, yön değiştirmek ucuzdur". Ne yapalım? | Karakter düzeyinde ustalık/uzmanlaşmayı **kaldır**; yerine **stratejik portföy** (yapı seviyeleri, ilçe seviyesi, teknoloji yöntemleri) ve "ilk yatırım yönü" önerisi; uzmanlaşma cezası gerekirse **yapı/katman düzeyinde** (ör. dışlayan teknoloji dalları, 08 TK4) kalsın |

### 8.2 Kaynaklar

Numaralar yukarıdaki köşeli parantezlere karşılık gelir. "(arama özeti)" bu turda sayfa doğrudan okunmadan arama sonucu özetine dayanan bilgidir.

**[1]** Capital Rift geliştirici özellik listesi (TikTok): https://www.tiktok.com/@niksgames/video/7666487170605026591 · Paddy Plays "Capital Rift Tutorial" bölüm başlıkları: https://www.youtube.com/watch?v=oNfawXo8q2A (ikincisi önceki rapordan, doğrudan izlenmedi)
**[2]** Capital Rift ana sayfa ve koşullar (önceki raporun bulguları; bu turda `capitalrift.com` düz metin döndürmedi): https://capitalrift.com/ · https://capitalrift.com/terms/ · https://capitalrift.com/privacy/ · iç belge [Capital Rift mekanikleri](capital-rift-mekanikleri.md)
**[3]** Minecraft (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Minecraft
**[4]** Albion Online (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Albion_Online
**[5]** Albion başlangıç rehberi (KeenGamer, doğrudan okundu): https://www.keengamer.com/articles/guides/albion-online-everything-you-need-to-know/section/1-how-to-start-and-choose-your-starter-town-in-albion-online/
**[6]** Albion "New Player Experience" geliştirici notu (önceki rapordan, bu turda yeniden okunmadı): https://albiononline.com/news/dev-talk-new-player-experience
**[7]** EVE Online (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Eve_Online
**[8]** EVE yeni oyuncu deneyimi (arama özeti): https://forums.eveonline.com/t/new-player-experience/452755 · https://kotaku.com/eve-online-evolved-graphics-tutorial-new-players-update-1849169566
**[9]** Eco (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Eco_(2018_video_game)
**[10]** Eco yasalar ve meteor (arama özeti): https://www.indiedb.com/games/eco-global-survival-game/news/how-player-created-laws-work-in-eco · https://venturebeat.com/pc-gaming/eco-we-destroyed-the-meteor-heres-what-i-learned/
**[11]** Victoria 3 (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Victoria_3 · oyuncu tartışmaları (arama özeti): https://steamcommunity.com/app/529340/discussions/0/4693406471885508562
**[12]** Anno 1800 (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Anno_1800 · ilk saat ve zincirler (arama özeti): https://haveyouplayed.net/anno-1800-review/ · https://waywardstrategy.com/2020/01/16/anno-1800-review/
**[13]** Big Ambitions (arama özeti; Vikipedi sayfası bulunamadı): https://store.steampowered.com/app/1331550/Big_Ambitions/ · https://primagames.com/reviews/big-ambitions-review · https://www.gameskinny.com/culture/big-ambitions-early-access-review-big-city-dreams/
**[14]** GTA Online (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Grand_Theft_Auto_Online · gece kulübü gelir değerleri (arama özeti): https://store.epicgames.com/news/gta-online-guide-best-ways-make-money?lang=en-US · https://www.gtaboom.com/gta-online-nightclub-guide-after-hours-ac95
**[15]** Foxhole (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Foxhole_(video_game) · fiyat (arama özeti): https://steamdb.info/app/505460/ · https://store.steampowered.com/app/505460/Foxhole/ · lojistik grevi: https://www.nme.com/news/foxhole-logistics-union-ends-49-day-strike-after-demands-met-3173270
**[16]** Travian (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Travian · inceleme (arama özeti): https://mmos.com/review/travian-kingdoms
**[17]** Rise of Kingdoms (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Rise_of_Kingdoms · ücretli avantaj ve etkinlik baskısı (arama özeti): https://riseofkingdomsguides.com/is-rise-of-kingdoms-pay-to-win-game-pay-to-win-vs-free-to-play/
**[18]** Stardew Valley (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Stardew_Valley · açılış tasarımı (arama özeti): https://deeprootdepths.substack.com/p/examining-the-design-principles-of
**[19]** RuneScape (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/RuneScape · Öğretici Ada (doğrudan okundu): https://oldschool.runescape.wiki/w/Tutorial_Island · Büyük Borsa (arama özeti): https://oldschool.runescape.wiki/w/Grand_Exchange
**[20]** Habbo (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Habbo · Club Penguin (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Club_Penguin · güvenlik ve üyelik (arama özeti): https://www.dfcint.com/dossier/club-penguin-explained/
**[21]** Knight Online (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Knight_Online · Türkiye'deki popülerlik, nostalji ve nüfus oranı (arama özeti, tek kaynak): https://etail.com.tr/blog/knight-online-nedir · https://www.gamesfrm.com/konu/en-populer-knight-online-server-siralamasi-2025.16448/
**[22]** Metin2 (Vikipedi, doğrudan okundu): https://en.wikipedia.org/wiki/Metin2 · Türkiye'ye geliş ve internet kafe kültürü (arama özeti): https://www.tefoniq.com/metin2-nin-turkiye-ye-gelisi-ve-etkileri-2006-dan-gunumuze-dijital-oyun-tarihi
**[23]** 101 YüzBir Okey Plus (mağaza sayfası, arama özeti): https://apps.apple.com/tr/app/101-y%C3%BCzbir-okey-plus/id649260774?l=tr · https://www.zynga.com/games/okey-plus/
**[24]** Tavla Plus / Backgammon Plus (mağaza sayfası, arama özeti): https://apps.apple.com/tr/app/tavla-plus-backgammon-plus/id1619948547?l=tr
**[25]** Zula ve Wolfteam (arama özeti): https://tr.wikipedia.org/wiki/Zula_(video_oyunu) · https://www.bilgiustam.com/wolfteam-turkiyenin-efsane-fpssinin-dusus-hikayesi/ · https://www.webtekno.com/internet-kafelerde-oynadigimiz-oyunlar-h222862.html
**[26]** Türkiye oyuncu profili (arama özeti, tek derleme; sayfa doğrudan okunmadı): https://www.donanimhaber.com/iste-turkiye-de-en-cok-oynanan-oyunlar-ve-dahasi--162824 · https://mobidictum.com/tr/turkiyedeki-mobil-oyuncular-kimler-ve-zamanlarini-nasil-geciriyorlar/ · https://gamizm.com/turk-mobil-oyuncu-aliskanliklari-ne-durumda/
**[27]** Muhtar sayısı (arama özeti): https://www.gazetevatan.com/gundem/turkiyede-kac-muhtar-var-iste-turkiye-genelinde-muhtar-sayisi-2065836 · YSK 31 Mart 2024 bülteni: https://www.ysk.gov.tr/doc/dosyalar/docs/31%20MART%202024%20MAHALL%C4%B0%20%C4%B0DARELER%20B%C3%9CLTEN%C4%B0.pdf
**[28]** Semt pazarı kültürü (arama özeti): https://turkiyemerkezi.com/turkiyede-yerel-pazar-kulturu/ · https://www.etstur.com/letsgo/turkiyenin-en-meshur-semt-pazarlari/ · https://www.researchgate.net/publication/339201711_The_Periodic_Markets_in_Turkey_and_Sustainability
**[29]** Royal Match, Dream Games, Peak Games (AA ve diğer, kısmen doğrudan okundu): https://www.aa.com.tr/tr/bilim-teknoloji/ilk-turcornlardan-dream-gamesin-oyunu-royal-match-dunyada-en-yuksek-geliri-elde-etti/3091747 · https://www.trtworld.com/article/16428637 · https://btm.istanbul/blog/turkiyenin-ilk-unicornu-peak-gamesin-tecrubelerle-bezenmis-basari-hikayesi/

**İç belgeler.** [11 — Ürün Dönüşü](../11-urun-donusu.md) (K13, K20, K21, K28, K29, K33, K34, §7.1, §7.3, §7.7, §7.9, Ek kararlar) · [08 — Altı Katman](../08-alti-katman.md) (T3, S3, P5) · [01 — Rakip ve pazar](../01-rakip-ve-pazar-arastirmasi.md) · [Capital Rift mekanikleri](capital-rift-mekanikleri.md) · [oyun tasarımı: parsel](oyun-tasarimi-parsel.md) · [arayüz ve UX](arayuz-ux.md) · [sokak seviyesi 3D](sokak-seviyesi-3d.md) · [çeşitlilik: yönetim, askeri, teknoloji](cesitlilik-yonetim-askeri-teknoloji.md).

**Erişilemeyen veya doğrulanamayanlar (bu turda).** `capitalrift.com` ana sayfası (düz metin yok), Reddit ve Steam yorumları (doğrudan), Eco fiyatı, Knight Online/Metin2 resmî oyuncu sayıları, Türkiye oyuncu profili için birincil rapor, coğrafi işaretli ürün listesi (TPMK sicili), oyun mekaniklerinin hukuki durumu. Bunlar için Alfa-0 insan testi, TPMK sicil taraması ve K34 hukuki görüşü önerilir.
