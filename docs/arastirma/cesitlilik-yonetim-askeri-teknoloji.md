# Araştırma — Çeşitlilik ve Detay: Devlet, Askeri, Teknoloji, Lojistik ve Canlı Dünya

> **Özet.** Bu rapor, paylaşılan parsel dünyasında dört katmanın (Devlet, Askeri, Teknoloji, Lojistik) ve dünyayı canlı gösteren sosyal yapının nasıl çeşitlenip derinleşebileceğini önerir. Dayanak: EVE, Albion, Eco, Foxhole, Victoria 3, Crusader Kings 3, Rust, Last Oasis, Travian, Rise of Kingdoms ve Capital Rift incelemesi ile Türkiye'nin gerçek idari yapısı. Her katman için 10–14 somut öğe sunulur (toplam 58). Her öğede oyuncuya etki, uygulama maliyeti, öncelik (Alfa-0 / Alfa-1 / sonra) ve kötüye kullanım önlemi vardır. Sonda "ilk 30 gün" oyuncu yolculuğu taslağı bulunur.

| Alan | Değer |
|---|---|
| **Durum** | Ar-Ge önerisi; karar değildir (1 Ekim 2026) |
| **Ne için** | [11 — Ürün Dönüşü](../11-urun-donusu.md) §7.6–7.7, §7.11 ve "Ek karar" bölümlerinin ayrıntılandırılması; H2 (tekrar) hipotezine hizmet |
| **Dayanak belgeler** | [08 — Altı Katman](../08-alti-katman.md) (§3 Lojistik, §4 Teknoloji, §6 Devlet) · [oyun tasarımı: parsel dünyası](oyun-tasarimi-parsel.md) · [paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md) |
| **Güvenilirlik** | Web kaynakları §14'te URL ile listelenmiştir. Doğrulanamayanlar ve tek kaynaklılar **(doğrulanmadı)** / **(tek kaynak)** diye işaretlidir. Sayılar **öneri**dir; kalibre edilmemiştir. Bazı wiki sayfaları (Eco, Albion wiki, Rival Regions) 403 verdi; o sayfalar için arama özetleri kullanıldı. |
| **Maliyet etiketi** | **S** ≈ ≤3 iş günü, tek modül · **M** ≈ 1–2 hafta, çekirdek + istemci · **L** ≈ 3+ hafta ya da çekirdek + sunucu + istemci birlikte (hepsi tahmin) |
| **Kapsam dışı** | Kod, başka belge, commit. Lojistik bilinçli olarak arka plandadır; yalnız oyuncunun hissettiği kısım ele alınmıştır |

**Dil notu.** Zaman dilimleri için "iklim takvimi" ve "dönem" kullanılır (K21).

---

## Yönetici özeti (10 madde)

1. **Üç makam, iki seçim, bir NPC denetçi.** İlçe başkanı (oyunda "Muhtar") ve vali seçilir. **NPC Kaymakam** atanmış devlet temsilcisidir; oylanmaz, denetler ve olay yönetir. Gerçek Türkiye'de vali ve kaymakam atanır, muhtar ve belediye başkanı seçilir (§3). Oyun bunu bilinçli sadeleştirir: sahibin "seçimli vali" kararı korunur, atanmışlık rolü NPC'ye verilir.
2. **Alfa-0'ın üç ili de büyükşehir.** Bursa, Kocaeli ve Sakarya'da 6360 sayılı Kanun'la il özel idaresi kaldırıldı. Oyundaki tek "il hazinesi" bu yüzden gerçeğe aykırı değildir (§3.3).
3. **Yönetişimin derinliği kartlardan gelir.** 8 ilçe kartı + 7 mevcut yasa + 5 yeni il kartı (§4.3). Her kartın bedeli vardır. Beş çıkar grubu (Çiftçi, Sanayi, Esnaf-Tüccar, İşgücü, Çevre-Miras) kartları destekler ya da engeller. Grup gücü, oyuncuların kendi yapılarından türer (Victoria 3 modeli).
4. **Seçim parayla satın alınamaz.** 7 günlük seçim haftası, 3 vaat kartı, görev sonunda otomatik "vaat karnesi", seçim haftasında transfer tavanı. Yolsuzluk için açık defter, çıkar çatışması bayrağı, kamu alımlarında açık eksiltme ve NPC Kaymakam teftişi (§4.6).
5. **Askeri: sade üçgen + iki destek.** Piyade → Topçu → Zırhlı → Piyade (±%25 tavanlı çarpan). İkmal Birliği ve Hava Savunma destek rolündedir. İl kontrol savaşı: ilan (il meclisi onaylı, hedef önceden bildirilir) → hazırlık → savunanın seçtiği 4 saatlik yoğun saat → 4 tur çarpışma → sonuç → ≥49 saat soğuma (§5.4).
6. **Adalet paketi bütündür.** 14 gün kalkan, 1:5 servet oranı, pencere başına yağma ≤%25, yapı ≤%10 devre dışı, parsel kaybı 0, hareketsize ödülsüz saldırı, büyük ittifak tavanı (üye tavanı + azalan katkı + katılım bekleme). Ekonomik savaş (abluka) birincil kaldıraç kalır (§5.7).
7. **PvE, askeri ayağı Alfa-0'da canlandırır.** NPC eşkıya baskınları ilçe servetine göre ölçeklenir (RimWorld'ün servet eğrisi dersi). Ön duyuru vardır ve H5 tavanına tabidir. Savunma yapıları, mühimmat ve birlik talebi yaratır (§5.3).
8. **Teknoloji ve Lojistik.** Teknoloji ağacı 17'den ~26 düğüme, 8 dala açılır: Savunma ve Harp (5 düğüm, bir dışlayan çift dahil), Kamu ve Afet (2), Kültür ve Turizm (2). Ortak araştırma, üniversite/teknopark ve patent/lisans "sonra" paketindedir; patent kilit açmaz, **yayılım indirimini satar**; görsel yapı varyantları ilk 6 düğümle Alfa-0'da başlar (§6). Lojistik arka planda kalır: oyuncu yalnız araç silueti, depo doluluk uyarısı, yol durumu, haftalık taşıma raporu ve nadir rota olayları hisseder; rota çizimi ve araç ataması yoktur (§7).
9. **Canlı dünya gerçek zamanlıdır ve oyuncu yokken de işler.** Gün-gece, hafta içi/sonu, ilçe **semt pazarı günü**, Türkiye resmî tatil ve bayramlarına bağlı talep dalgaları ve kozmetik anlar, 12 aylık iklim takvimi; dönüşte 60 saniyede okunan **"Sen yokken" kartı** ve gelen kutusu; toplu (agrega) NPC yaşamı; şablonla üretilen **İlçe Bülteni ve İl Gazetesi**; seçim gecesi, fuar, açık artırma gibi toplanma anları (§8). Her öğede sunucu (S0–S3) ve tarayıcı (B0–B3) maliyeti yazılıdır. **Deprem olayı Alfa-0 illerinde önerilmez** (1999 Marmara depremi). Başarım ve unvanlar **stratejik başarının görünür kimliğidir** ("İlçenin En Büyük İşvereni", "Üç Dönem Muhtar"); sınıf, seviye, XP **yoktur**, hiçbir oyun avantajı vermezler (§8.6).
10. **30 gün yolculuğu ve denge.** Yolculuk (§9) ilk 14 günde ≥2/hafta, sonra ≥1/hafta yeni **karar türü** açar (H2). Yeni ve ilerlemiş oyuncu dengesi (§10) hibe harcama kısıtı, kalkan yumuşatması, yetişme ve **azalan getiri** (arsa, bakım, ittifak, işgücü doygunluğu) ile kurulur; kıdem sermayedir, puan değil. Önerilen paket (§11, toplam 58 öğe): Alfa-0 için 6 S + 15 M + 1 L, Alfa-1 için 3 S + 18 M + 4 L, "sonra" için 8 M + 3 L. Lider/sahip kararı gereken 12 nokta §13'tedir.

---

## 1. Kilitli kararlar ve sınırlar (bu raporun çerçevesi)

| Kaynak | Kural | Bu rapordaki sonucu |
|---|---|---|
| [11 §7.6](../11-urun-donusu.md) | Roller seçilmez, yapıdan ve makamdan doğar. İlçe meclisi/Muhtar 14 günde, Vali 28 günde bir seçilir | Makam matrisi §4.1 |
| [11 Ek karar](../11-urun-donusu.md) | Askeri güç beşinci ayak; **parsel asla el değiştirmez**; savaş **kontrolü** kazandırır; Alfa-0'da Ordugâh + birlik + savunma + NPC eşkıya; Alfa-1'de oyuncular arası savaş ve ittifak | Savaşın ödülü "Kontrol Hakkı"dır (§5.4) |
| [11 §7.7](../11-urun-donusu.md) | Yağma ≤%25, yapı ≤%10 devre dışı, baskın aralığı ≥49 sa, kalkan 14 gün, servet oranı 1:5, 4 saatlik yoğun saat | Korumalar §5.7'de tek pakette |
| [11 §7.11](../11-urun-donusu.md), [oyun tasarımı §4](oyun-tasarimi-parsel.md) | Her hafta yeni tür karar; günlük giriş ödülü yok; başarımlar seri değil "ilk" | §8.6, §9 |
| [08 §6 D4–D7](../08-alti-katman.md) | 7 bedelli yasa, 72 sa bekleme, bütçe kolları, istikrar eşiği %60, koruma süresi | Yeni kartlar bu yapıyı genişletir, bozmaz |
| [08 §4 TK1–TK4](../08-alti-katman.md) | 17 düğüm, her düğüm yöntem/karar açar, bedeli vardır, derinlik ≤4, 2 slot | Yeni düğümler aynı kurala uyar (§6) |
| [00 K13, K21](../00-vizyon-ve-kararlar.md) | Kritik kararlarda parayla güç yok; dünya sıfırlanmaz, dönem kapanışı ve ödülü yok (K5, K21) | Paralı asker ve patent yalnız oyun içi parayla; tavanlı |
| Sahip (1 Ekim) | Strateji oyunu, MMORPG değil: **sınıf, seviye, XP, karakter ilerlemesi yok**. Başarım/unvan karakter gücü değil stratejik başarının görünür kimliğidir ve **oyun avantajı vermez** | §8.6, §9, §10 |
| Sahip (1 Ekim) | Ürün gerçek zamana dayanır; dünya oyuncu yokken de işler; canlılık öncelikli | §8 genişletildi |
| [11 Ek karar](../11-urun-donusu.md) (hücre) | Hücre seçimi oyuncuya gösterilmez; adalar ve hazır arsalar | Sit alanı, OSB ve savunma yapıları **ada** düzeyinde çalışır |

**Tutarsızlık bildirimi.** [11 §6](../11-urun-donusu.md) tablosu Ordugâh'ı Alfa-1'e koyuyor; sonraki "askeri güç" Ek kararı Ordugâh + PvE'yi Alfa-0'a çekti. Bu rapor Ek kararı esas alır (bkz. §13, madde 2).

---

## 2. Referans oyunlardan dersler

| Oyun | Ne öğreniyoruz | Bizdeki karşılığı | Kaynak |
|---|---|---|---|
| **Eco** | Anayasa ve seçim, hükümetin temel nesnesidir; seçim süreci başlı başına bir "sivil nesne"dir. Yasalar tetikleyici + koşul + eylem bölümlerinden kurulur; çoğu yasa "eylemi engelle" türündedir. Hazine dört vergi türünü ayarlar. Ortak hedef (göktaşı) oyuncuları ortak işe iter | Yasalar kartlardır, her kartın bedeli vardır (§4.3). Ortak proje, Eco'nun ortak hedef rolünü oynar (§4.4) | [1][2][3] |
| **EVE Online** | Egemenlikte savunan, 4 saatlik bir savunmasızlık penceresi seçer. Pencere değişikliği 96 sa sonra işler. Savunma çarpanı (ADM) aktif sistemleri güçlendirir. Savaş ilanı yalnız yapısı olan gruplara açıktır ve haftalık bedeli vardır. Karşılıklı savaş ücretsizdir. Paralı asker pazarı vardır; paralı, savaş bitene dek bağlıdır | Savunanın seçtiği 4 saat, yerleşiklik savunma çarpanı, ilan bedeli, "savaş hedefi", paralı sözleşmesi (§5) | [4][5][6][7] |
| **Albion Online** | Bölge savaşı herhangi bir an ilan edilir, savaş ilanından en az 20 saat sonraki yoğun saatin başında yapılır. Yoğun saat 1 saattir. Lonca ≤300 üye; ittifaka katılma için 7 gün, ayrılıp aynı ittifaka dönmek için 3 gün bekleme. İttifak boyutunu sınırlama denemesi yapıldı (300), sonra cezalara döndü | Hazırlık alt sınırı, katılım beklemeleri, büyük ittifak tavanı (§5.5) | [8][9][10] |
| **Foxhole** | Lojistik, savaşın omurgasıdır; ama ~1.800 lojistik oyuncusu angarya yüzünden 49 gün greve gitti ve talepleri kabul edildi | Lojistik oyuncuya angarya olmaz. Bu rapor yalnız "hissedilen" kısmı ele alır (§7) | [11][12] |
| **Victoria 3** | Çıkar grupları hükümette olup olmamaya göre güçlenir; meşruiyet eşikleri (<25 yasa çıkmaz, 90+ sadık artar). Yasa çıkarmak için hükümette bir grup ya da hareket desteklemelidir. Seçim 4 yılda bir, 6 ay kampanya | Beş çıkar grubu; kamu güveni eşikleri (§4.5) | [13] |
| **Crusader Kings 3** | Otorite düzeyi yükseldikçe vasal hoşnutsuzluğu artar; hoşnutsuzlar hizip kurar ve talep eder | "Geri çekme önergesi" (hafif hizip) (§4.5, D10) | [14] |
| **Tropico 6** | Seçim, hizip memnuniyeti ve fermanlar (edict) kısa vadeli artı/eksi sunar; seçimi görmezden gelmek onayı çökertir | İlçe kartları "ferman" ritmindedir; seçim atlanamaz | [15] |
| **Rust / Last Oasis** | Rust'ta bakım kademelidir; çevrimdışı baskın koruması ve "haftalık baskın saatleri" eklentileriyle uygulanır; takım biri çevrimiçiyse baskın mümkündür. Last Oasis'te çevrimdışı baskın yoktur; klanlar bölgeyi her 24 saatte yeniden almalıdır | Çevrimdışıyken kayıp ≤%25 (H5) ve hazır savunma emirleri; pencere kavramı (§5.7) | [16][17] |
| **Travian / Rise of Kingdoms** | Travian'da yeni oyuncu koruması (hıza göre 1–5 gün + uzatma) korunanın ne saldırmasına ne saldırılmasına izin verir; ittifak ≤60 üye; ittifak bonusları bağışla açılır. RoK'ta ittifak bayrak/teknoloji ile genişler; kalkan alınır. RoK'ta birlik üçgeni (piyade > süvari > okçu > piyade) | Kalkanlı hesap sefere katkı veremez. Birlik üçgeni (§5.1). İttifak bağış-bonusu "ortak araştırma"ya ilham (§6) | [18][19][20][21] |
| **Capital Rift** | Gerçek harita üzerinde oyuncu işletmeli ekonomi; sohbet, DM, arkadaş, profil, öneri panoları; "park et, ağa katılır" araç modeli. "Kimse odun satmıyorsa odun yoktur" | Sohbet ve forum (§8.6), araç modeli (§7). Savaş/yönetişim yönü **bulunamadı** | [22] **(tek kaynak, doğrulanmadı)** |
| **RimWorld / Anno** | Baskın boyutu koloni servetinden eğriyle hesaplanır; 14.000 altı 0, 1 milyon üstü tavan. Anno'da yangın, isyan, hastalık olayları çalışma koşullarına ve mutluluğa bağlıdır; mutluluk yüksekse festival olur | PvE baskın ölçeği ve olay tetikleyicileri (§5.3, §8.1) | [23][24] |

**Ortak çıkarım.** (1) Savaş penceresini savunan seçmeli. (2) İlan görünür, bedelli ve hedefi belli olmalı. (3) Çevrimdışı kayıp tavanı ve kalkan şart. (4) Büyük ittifak, tavan ve beklemeyle dizginlenmeli. (5) Yönetişim, oyuncunun kendi yapılarına dokunan kartlarla anlamlı olur. (6) Lojistik angaryaya dönmemeli.

---

## 3. Türkiye'nin gerçek idari yapısı ve oyunlaştırılması

### 3.1 Gerçek yapı (özet)

| Kademe | Kim | Nasıl belirlenir | Başlıca iş | Kaynak |
|---|---|---|---|---|
| Mahalle | **Muhtar** + ihtiyar heyeti | Seçimle; yerel seçimler 5 yılda bir (31 Mart 2024'te ~50.370 muhtar belirlendi) | Mahalle sakinlerinin ortak ihtiyaçlarını belirlemek, belediye ve kamu kurumlarıyla ilişkiyi yürütmek, mevzuatın verdiği belge ve bildirim işleri | [25][26] |
| İlçe / belde | **Belediye başkanı** + belediye meclisi + encümen | Başkan çoğunluk sistemiyle, meclis %10 barajlı nispi temsille seçilir | Stratejik plan, yatırım ve çalışma programı, bütçe ve kesin hesap; encümen (il ve 100.000+ nüfuslu belediyelerde 7, diğerlerinde 5 kişi) bütçeyi inceler | [27] |
| İlçe | **Kaymakam** | **Atanır** (Cumhurbaşkanı kararıyla) | İlçede Hükümetin temsilcisi; kanun, tüzük, yönetmelik ve Hükümet kararlarının uygulanması; ilçe idare kurulu başkanı; valinin talimatlarını yürütür | [28][29] |
| İl | **Vali** | **Atanır**; ilde Cumhurbaşkanının temsilcisi | Merkezi idarenin taşra teşkilatını yönetir; il özel idaresinin başıdır | [28][30] |
| İl | **İl özel idaresi**: il genel meclisi + il encümeni + vali | İl genel meclisi seçimle; her ilçe bir seçim çevresidir ve ilçe nüfusuna göre üye çıkarır (alt bantlar: 25 bine kadar 2, 50 bine kadar 3, 75 bine kadar 4, 100 bine kadar 5; üst bantlar kaynakta görülmedi) | Belediye sınırları dışında yol, su, atık, çevre, sosyal hizmet, sanayi desteği, eğitim tesisleri; bütçeyi meclis kabul eder | [30][31] |
| Büyükşehir | **Büyükşehir belediyesi** | Seçimle | 6360 sayılı Kanun'la **30 ilde il özel idaresi kaldırıldı**; yerine Yatırım İzleme ve Koordinasyon Başkanlığı kuruldu; köyler mahalleye dönüştü; ilçe belediye başkanlarıyla ilçe meclis üyelerinin beşte biri büyükşehir meclisine girer | [32][31] |
| Yan örgütler | Ziraat Odası, Ticaret/Sanayi Odası, Esnaf ve Sanatkârlar Odası | Üyelerce seçilen organlar | Meslek grubunun temsili; il koordinasyon kurulları (ziraat: 80 adet); esnaf odası için ≥500 kişi isteği ve Bakanlık izni | [33][34] |
| Alanlar | **OSB**, **sit alanı**, **kardeş şehir** | OSB: Bakanlık onayıyla yer seçimi + vali imzalı kuruluş protokolü. Sit: koruma kurulu kararı. Kardeş şehir: belediye meclis kararı + bakanlık onayı + "denklik" | OSB'ye ilçe/büyükşehir belediyesi ve oda katılır. Sit ilanı imar uygulamasını durdurur, kesin inşaat yasağı getirebilir. Türkiye'de 715 kardeş şehir ilişkisi var | [35][36][37] |

Genel sayılar: 81 il, 973 ilçe, 32.254 mahalle, 18.183 köy (doğruluğu yaklaşık; kaynak haber sitesidir) [38].

### 3.2 Gerçek → oyun eşlemesi

| Gerçek | Oyundaki karşılığı | Neden böyle |
|---|---|---|
| Mahalle muhtarı | Şimdilik **yok**. İlçe başkanı "Muhtar" unvanını taşır. Büyük ilçelerde (Şehir seviyesi) ileride "mahalle delegesi" katmanı eklenebilir (**sonra**) | 11 §7.6 kararı: ilçe meclisi/Muhtar. Alfa'da ilçe başına 20–50 sahip düz oylamaya yeter |
| Belediye başkanı + meclis + encümen | **İlçe Başkanı (Muhtar)** + **ilçe meclisi** (aktif sahiplerin tümü) + ilçe kasası | Yürütme ile yasama tek oyuncuda toplanmasın diye kartların bir kısmı meclis oylamasına bağlanır (§4.3) |
| Kaymakam (atanmış) | **NPC Kaymakam**: teftiş, kayyum, afet koordinasyonu, OSB yer seçimi gecikmesi | Atanmış güç oylanmaz; denetim işini oyuncudan alır, "oyuncu polisliği"ni önler |
| Vali (atanmış) | **Vali** (seçilmiş; sahip kararı). Gerçek valinin devlet temsilciliği yönü yoktur; il özel idaresi başkanlığına (bütçe, yol, okul, sanayi desteği) benzer | Sahibin 1 Ekim kararı. UI'da "Vali" adı korunur; gerçekle farkı Yardım ekranında açıklanır |
| İl genel meclisi (ilçe başına 2–5 üye) | **İl meclisi**: her ilçeden 2–5 koltuk (ilçe gelişim seviyesine göre: Köy 2, Kasaba 3, Merkez 4, Şehir 5; gerçekteki alt bantlardan esinli). Koltukları ilçe seçimlerinde en çok oy alan adaylar kazanır | Küçük ilçelerin ezilmemesi; vali seçimi ve savaş onayı bu meclistedir. Gerçekte de ilçe seçim çevresidir ve nüfus bandına göre üye çıkarır [31] |
| İl özel idaresi (yol, su, okul, sanayi desteği) | **İl hazinesi** ve **ortak proje kataloğu** | Alfa-0 illeri büyükşehirdir; il özel idaresi zaten kaldırılmıştır [32]. Oyunun tek il hazinesi bu yüzden sorun değil |
| Odalar (Ziraat, Sanayi/Ticaret, Esnaf) | **Çıkar grupları** (§4.5) | Sivil güç merkezleri gerçekte de vardır |
| OSB | İlçe kartı "OSB ilanı"; vali onayı + NPC Kaymakam yer seçimi gecikmesi (72 sa) | Gerçek süreçteki "bakanlık yer seçimi komisyonu"nun oyunlaştırması |
| Sit alanı | İlçe kartı "Sit alanı ilanı": boş adada yeni inşa yasağı; mevcut yapıya dokunmaz | Gerçekte koruma kurulu kararı imar uygulamasını durdurur [36] |
| Kardeş şehir | **Kardeş il** (§4.7): denklik ilkesi, meclis onayı | Gerçek süreç meclis kararı + bakanlık onayı + denklik [37] |
| Kamulaştırma | **Yok** | Parsel el değiştirmez (11 Ek karar) |

### 3.3 Alfa-0 illeri: üçü de büyükşehir

Bursa, Kocaeli ve Sakarya, 6360 kapsamındaki 30 büyükşehir arasındadır [32][39]. Gerçekte bu illerde il özel idaresi yoktur; hizmetleri büyükşehir belediyesi ve valilik/YİKB yürütür. Oyunda tek bir **il hazinesi** ve tek bir **vali** olması bu yüzden "eksik yapı" değildir. İleri bir aşamada büyükşehir olmayan illere (il özel idaresi bulunan 51 il [30]) genişlenirse "il hazinesi" iki kaleme bölünebilir; bugün gerekli değil.

### 3.4 Oyunlaştırma ilkeleri

1. **Gerçek siyaset modellenmez.** Parti, güncel seçim sonucu, gerçek siyasetçi ve güncel çatışma verisi yok ([08 §6.8](../08-alti-katman.md) ve §6.5 ile uyumlu). Adaylar "bağımsız" ya da kendi kurduğu "liste adı" ile girer. NPC adları kurmacadır.
2. **Gerçek yer adları** kullanılır (K33) ama makam sahipleri oyunculardır.
3. **Hiçbir kart parseli devretmez.** Sit alanı, OSB ve imar kararları yalnız **yeni inşa** hakkını ve vergi/teşvik akışını değiştirir.
4. **Yasa = kart.** Her kart: etki, bedel, bekleme, çıkar grubu tepkisi, "kimi nasıl etkiler" cümlesi (H4 sorusu).

---

## 4. Devlet / yönetişim

### 4.1 Makam ve yetki matrisi

| Makam | Kim | Nasıl gelir | Süre | Neye yetkili | Neye yetkisiz |
|---|---|---|---|---|---|
| **İlçe meclisi** | O ilçedeki aktif sahipler (son 7 günün ≥3'ünde aktif) | Kendiliğinden; hesap başına 1 oy | — | Arazi vergisi bandı, imar payları, ilçe kartlarının oylanması, projeyi önceliklendirme, muhtar seçimi | Parsel devri, doğrudan para transferi |
| **İlçe Başkanı (Muhtar)** | Oyuncu | İlçe meclisi seçimi (§4.2) | 14 gün | İlçe kasasını yönetir; ilçe kartlarını önerir ve (meclis oyu gerektirmeyenleri) uygular; ortak proje başlatır; Muhtarlık yapısında oturur | İl yasaları, savaş, kasayı kişisel hesaba aktarma |
| **İl meclisi** | Her ilçeden 2–5 koltuk (ilçe seviyesine göre) | İlçe seçimlerinin sonucundan | 14 gün | Vali seçimi; savaş ilanı onayı; il bütçesi onayı | Tek tek ilçe kasalarına müdahale |
| **Vali** | İlçe başkanları arasından (aday), il meclisi seçer | 28 günde bir | 28 gün | 7 mevcut yasa + yeni il kartları, 3 bütçe kolu, savaş ilanı ve ablukayı önermek, kardeş il ve anlaşmalar, il yoğun saat bandı | Parsel el koyma; ilçe vergisini tek başına değiştirme |
| **NPC Kaymakam** | NPC (atanmış) | Atanır, oylanmaz | Sürekli | Teftiş, kayyum (makam sahibi 7 gün pasifse), afet koordinasyonu, OSB yer seçimi gecikmesi (72 sa), sit alanı için "koruma kurulu" kontrolü | Karar vermek, ekonomik kart çıkarmak |

**Vali seçmen tabanı açık sorusu (Ü-yeni-1).** [11 §7.6](../11-urun-donusu.md) valiyi "muhtarlar arasından" der ama seçmeni belirtmez. Öneri: aday, görevdeki ilçe başkanlarıdır; seçmen **il meclisidir** (ilçe koltuklu). Böylece büyük ilçe, küçük ilçeleri ezmez ve vali adaylığı il çapındaki koalisyon işi olur. Alternatif (il genelinde eşit oy) ilçe sayısı çok olan ilde küçük ilçelerin sesini kısar.

**Alfa-0.** Seçim yoktur: NPC vali + NPC muhtar + NPC Kaymakam varsayılan değerlerle çalışır. Oyuncu ise kartları **salt okunur** görür ve her kartın "seni nasıl etkiler" cümlesini okur (H4). İlçe tabelası (§8.5) yetkilileri gösterir.

### 4.2 Seçim kampanyası mekaniği

| Aşama | Zaman | Ne olur | Kural (öneri) |
|---|---|---|---|
| **Aday ilanı** | T−5 gün | Adaylık penceresi açılır | Koşul: ilçede ≥3 hücre, ≥14 günlük hesap, son 7 günün ≥3'ünde aktiflik; ≥3 farklı sahipten **destek imzası** (spam adaylığı engeller). Aday "bağımsız" ya da kendi kurduğu **liste adıyla** girer (gerçek parti adı yok) |
| **Vaat kartları** | T−4 → T−1 | Aday 3 vaat seçer: kataloğu §4.3 (ör. "arazi vergisi ≤%1,5", "OSB ilan et", "köprü projesi başlat", "karakol yaptır", "sit alanı ilan etme") | Vaatler ilçe meydanı panosunda ve forumda ilan edilir; tutulup tutulmadığı **otomatik ölçülür** |
| **Meydan** | T−4 → T0 | İlçe meydanında "seçim haftası" görseli: pano, aday sunum kartları, NPC'ler "mahalle ziyareti"nde (canlılık, §8.1) | Kampanya **parayla yürümez**: bağış, oy satın alma, aday–seçmen transferi yok |
| **Transfer dondurma** | T−2 gün → T+1 | Aday ile ilçedeki hesaplar arası doğrudan transferler durur | Oy satın almayı ve aklamayı keser |
| **Oy** | T0, 24 sa | Hesap başına 1 oy, oy gizli, oylar kapanışta açılır | Eşit ağırlık. Oy hakkı = meclis üyeliği koşulu (aktif sahip) |
| **Devir teslim** | T+0 → T+12 sa | Yeni muhtar kasa defterini görür; eskisinin son 3 işlemi "devir notu" olarak yazılır | Eski muhtar "Eski Muhtar" unvanı kazanır |
| **Vaat karnesi** | Görev sonu | Her vaat için tutuldu/kısmen/tutulmadı hesaplanır; **Kamu güveni** ve unvanlara yansır | "Hizmet Muhtarı" unvanı: vaatlerin ≥%80'i tutuldu. Tutulmayan vaat için ceza yok; yalnız karne ve güven |
| **Pasiflik** | Görevde | Makam sahibi 7 gün giriş yapmazsa NPC Kaymakam **kayyum** olarak devralır, erken seçim açılır | H7 ve hareketsizlik kuralıyla uyumlu; CoN'un "hareketsiz ülke yeniden atanır" dersi [43] |

Hedef: oy katılımı ≥%30 (H9). Katılım ödülü yoktur (günlük giriş ödülü yasağı); yalnız "Seçmen" rozeti ve forumda sonuçlar.

**Seçim haftasında oyuncuya yeni karar:** aday olmak mı, destek imzası mı, hangi vaat, kimi seçmek, vaadi sonradan nasıl tutmak.

### 4.3 Yasa ve politika kartları kataloğu

Her kart: etki + **bedel** + bekleme (mevcut 72 sa kuralı il yasalarında sürer; ilçe kartları için 24 sa) + çıkar grubu tepkisi. Etki sayıları başlangıç önerisidir.

**İlçe kartları (8; Muhtar önerir; ✔ işaretliler ilçe meclisi oyu ister)**

| # | Kart | Etki | Bedel | Kısıt / koruma | Alfa |
|---|---|---|---|---|---|
| İ1 | **Arazi vergisi bandı** ✔ | %0,5–3/hafta (mevcut, [11 §7.2](../11-urun-donusu.md)) | Düşük: kasa ince. Yüksek: sahip kaçışı (H8) | Alfa-0'da sabit %1 | Alfa-0 sabit; Alfa-1 oylanır |
| İ2 | **İmar payları** ✔ | Tarım / sanayi / konut yuvası oranları (mevcut) | Bir payı artırmak diğerini kısar | Değişiklik 14 günde bir | Alfa-1 |
| İ3 | **Tarım teşvik bölgesi** ✔ | İlçedeki Tarım yapılarının haftalık arazi vergisi %50 iade | İade ilçe kasasından ödenir | Kasa 0 ise iade orantılı kısılır | Alfa-1 |
| İ4 | **OSB ilanı** ✔ + vali onayı | 1 bitişik adada (4–12 hücre) Sanayi yapıları ortak elektrik/su hattından yararlanır: inşa süresi ×0,85, brownout'ta sanayi önceliği ilçe içinde | Kirlilik OSB adasında yoğunlaşır; komşu adalarda istikrar −; kuruluş gideri kasadan | İlçede en çok 1 OSB. İlan: meclis → vali onayı → NPC Kaymakam yer seçimi gecikmesi (72 sa). Mevcut yapı sahiplerine zorlama yok | Alfa-1 |
| İ5 | **Sit alanı ilanı** ✔ | Boş adada yeni inşa yasağı; mevcut yapılara dokunulmaz; kültür/itibar artışı, Kültür-Turizm teknolojileriyle turizm geliri | Yeni yapı yuvası kaybı; Sanayi ve İşgücü grupları karşı çıkar | Yalnız **boş** ve **OSM'de korunan/tarihi etiketli** adalarda; ilçenin ≤%10'u; sahibi olan hücrede sahibin onayı; kaldırma ≥28 gün sonra | Alfa-1 |
| İ6 | **Fuar / şenlik düzenle** | 3 gün: Ticaret ofisi satışları +%10, memnuniyet +; olay takvimine eklenir | Kasadan düzenleme gideri; ayda ≤1 | NPC Kaymakam onayı gerekmez | Alfa-1 |
| İ7 | **Hizmet önceliği** | Okul / sağlık / güvenlik (K3) harcamasının ilçeye yönlendirilmesi; ortak proje önceliği | Başka ilçe payı azalır | İl bütçesi tavanı içinde | Alfa-1 |
| İ8 | **Pazar günü** ✔ | İlçenin haftalık semt pazarı günü (perakende satış ×1,25, 07:00–17:00; bkz. §8.1.2) | O güne alışkın esnafın planı bozulur | 28 günde bir değişir | Alfa-0 tohumlu sabit; Alfa-1 oylanır |

**İl kartları (Vali; il meclisi bütçe/savaş kartlarında onaylar)**

| # | Kart | Etki | Bedel | Kısıt / koruma | Alfa |
|---|---|---|---|---|---|
| İl1–7 | **7 mevcut yasa**: `vergi_rejimi`, `tarim_koruma`, `sanayi_tesviki`, `ticaret_rejimi`, `seferberlik`, `egitim`, `enerji_onceligi` | [08 D4](../08-alti-katman.md) | Mevcut bedeller | 72 sa bekleme | Alfa-1 (Alfa-0: varsayılan) |
| İl8 | **Liman harcı** | İl limanından çıkan ihracata %0–5 harç (il hazinesine) | Yüksek harç: ihracat komşu ilin limanına kayar, kıtlık/fiyat | P3 ihracat vergisi ile toplam tavan %10 | Alfa-1 |
| İl9 | **Afet hazırlık fonu** | İl hazinesinden ayrılan pay: afet ve olay etkisi −%X, afet merkezi projesini besler | Para lavabosu (boşta durur) | Gelirin ≤%10'u | Alfa-1 |
| İl10 | **Yol bakım programı** | Kenar aşınma/iklim kaybı −%X (L3 profillerinin "kapalı" eşiğini yumuşatır) | Bakım gideri | Hazine 0 ise kısılır | sonra |
| İl11 | **Savaş ilanı** ✔ (il meclisi) | §5.4 | İlan bedeli (il hazinesi) | Bkz. §5 | Alfa-1 |
| İl12 | **Kardeş il anlaşması** ✔ | §4.7 | Karşılıklılık, fesih beklemesi | Denklik ilkesi | sonra |

**Kartların oyuncuya dokunuşu (H4).** Her kart ekranında şu satır zorunlu: "Bu kart **senin** şu yapılarını etkiler: …; üretimin ↑/↓ …". Yasa etkisini oyuncuya tek cümleyle göstermeyen kart yayına girmez.

### 4.4 İlçe/il bütçesi ve ortak projeler

**Para akışı.**

| Kasa | Gelir | Gider | Not |
|---|---|---|---|
| **İlçe kasası** | Arazi vergisi tahsilatı (%0,5–3/hafta), fuar/şenlik geliri, ortak proje katkı eşleştirmesine ayrılan pay | İlçe kartlarının bedelleri, ortak proje eşleştirmesi, NPC jandarma/karakol bakımı | Açık defter (§4.6) |
| **İl hazinesi** | İl nüfus vergisi ([11 §7.6](../11-urun-donusu.md)), liman harcı, ilçelerden **il payı** (öneri: ilçe vergi gelirinin %20'si; gerçekte de merkezi/il payları vardır) | İl yasalarının bedelleri, 3 bütçe kolu, savaş ve abluka ilan bedeli, afet fonu | Hazine 0 iken kollar orantılı kısılır ([08 D5](../08-alti-katman.md)) |

**Ortak proje kataloğu (Ü7: Alfa-1'de il başına 1 proje)**

| Proje | Düzey | Süre | Katkı | Kalıcı etki | Gerçekteki karşılığı |
|---|---|---|---|---|---|
| **Köprü / yol bağlantısı** | İl | 7–14 gün | Çelik + parça + para | Yeni kalıcı lojistik kenarı ya da kapasite | İl özel idaresi: ilçeler arası yol [30] |
| **Baraj / gölet** | İl | 10–14 gün | Çelik + para + işçi günü | Sulama kapasitesi, kuraklık koruması, hidro elektrik yöntemi | Su işleri |
| **Hastane / sağlık merkezi** | İlçe (Merkez+) | 7–10 gün | Para + parça + işçi günü | K3 karşılanma +, salgın etkisi −, revir (§5.6) | Kamu hizmeti |
| **Okul / meslek lisesi** | İlçe | 5–7 gün | Para + çelik | `egitim` yasası etkisi +, yeni oyuncu eğitim ipuçları | İl özel idaresi: eğitim tesisleri [30] |
| **Afet / itfaiye merkezi** | İlçe | 5–7 gün | Para + parça | Afet ve yangın etkisi −%X, Gözetleme Kulesi bağı | Kaymakamlık/AFAD koordinasyonu |
| **Fuar merkezi** | İlçe | 5–7 gün | Para + çelik | Fuar ve şenlik süresi +1 gün, ücretsiz ilk kutlama | Belediye |
| **Liman genişletme** | İl (Şehir) | 10–14 gün | Çelik + para | `liman_dolu` eşiği ↑ ([08 §3](../08-alti-katman.md), v1.5) | Liman idaresi |
| **Üniversite / teknopark** | İlçe (Merkez+) | 14 gün | Para + elektronik + çelik | §6 (ortak araştırma, patent) | — |

**Toplu katkı mekaniği.**

| Konu | Kural (öneri) |
|---|---|
| Katkı | Para ve malzeme; herkes istediği kadar. **Katkı oy ağırlığı vermez** (plütokrasiyi önler) |
| Eşleştirme | İlçe kasası katkının %50'sini ekler (tavanlı); il projelerinde il hazinesi |
| Karşılık | Kalıcı **plaket** (adın projede görünür), "Hayırsever" unvanı (eşik: projenin %2'si), kozmetik. Gelir payı yoktur: kamu yapısından kişisel kâr elde edilmez |
| Bedavacı sorunu | Etkiden herkes yararlanır. Azaltma: plaket ve unvan, ilçe forumunda "Katkı Defteri", eşleştirme (katkının değeri artar) |
| Başarısızlık | 14 günde ilerleme yoksa katkıların %80'i iade edilir (inşa iptali %50 iade kuralı ([11 §7.3](../11-urun-donusu.md)) "stok saklama"yı önlemek içindi; burada kamu hedefi için daha yüksek iade) |
| Ölçek | Alfa-0'da yalnız **Muhtarlık** yer tutucu. Alfa-1'de il başına 1 proje, sonra katalog |

### 4.5 Çıkar grupları ve kamuoyu

[Victoria 3](https://vic3.paradoxwikis.com/Government) modelinde grup gücü, grubun taşıyıcısı nüfusun payından gelir; yasa çıkarmak için hükümette bir grubun desteği gerekir [13]. Bizde **güç, oyuncuların yapılarından türer**: oyuncu bir grubu "seçmez", yaptığı yapılar onu o gruba sayar.

| Grup | Gerçekteki karşılığı | Gücünü nereden alır | Sever | Sevmez |
|---|---|---|---|---|
| **Çiftçiler** | Ziraat odası | Tarım yapıları (Tarla, Ahır, Mera, Sulama) payı | `tarim_koruma`, İ3 tarım teşviği, baraj | `sanayi_tesviki`, OSB, yüksek ihracat vergisi |
| **Sanayiciler** | Sanayi/Ticaret odası, OSB yönetimi | Sanayi yapıları payı | `sanayi_tesviki`, OSB, `enerji_onceligi` (sanayi önce) | Sit alanı, sıkı emisyon |
| **Esnaf-Tüccarlar** | Esnaf ve ticaret odaları | Ticaret ofisi + Ambar payı | Fuar, düşük tarife, ticaret rejimi 0 | Yüksek liman harcı, abluka |
| **İşgücü** | İşçi/sendika örgütleri | Konut + işgücü doluluğu | Kamu hizmeti, eğitim, hastane | `seferberlik`, düşük bakım |
| **Çevre ve Miras** | Koruma dernekleri | Boş/sit adası payı + kirlilik duyarlılığı | Sit alanı, emisyon filtresi (`temiz_enerji`) | OSB, termik |

| Gösterge | Ne | Etkisi (öneri) |
|---|---|---|
| **Grup memnuniyeti** (0–100, ilçe başına) | Son kartların gruba etkisi, zamanla ortalamaya döner (istikrar gibi yavaş) | Düşükse kısa süreli **eylem olayı** (§8.1: grev, protesto) |
| **Kamu güveni** (0–100, makam sahibi) | Vaat karnesi + grup memnuniyetinin ağırlıklı ortalaması | <30: ilçe meclisinin %20'sinin imzasıyla **erken seçim** açılabilir. ≥70: yasa bekleme ×0,75 |
| **Yasa direnci** | Bir il yasası çıktığında hasım grupların memnuniyet kaybı | Hasım grupların toplam gücü >%50 ise il meclisinde **geri çekme önergesi** oylaması zorlanır (CK3 hizbi hafif sürümü [14]) |

**Mikro yönetim yok:** oyuncu grup memnuniyetini düğmeyle ayarlamaz; yalnız kartları ve projeleri seçer. **İstikrarla ilişki:** [08 D2](../08-alti-katman.md) bölge istikrarı (üretim çarpanı) aynen kalır; grup memnuniyeti ve kamu güveni **siyasi** göstergedir, üretimi doğrudan kısmaz (üretim cezası eşiği %60 korunur, H5/H7 güvencesi).

### 4.6 Yolsuzluk ve denetim

Tasarım gereği "kasayı kişisel hesaba aktarma" **imkânsızdır**: kasa yalnız kart bedeli, proje ve hizmet için harcanır. Geriye kalan sapma türleri:

| Sapma | Nasıl olur | Önlem |
|---|---|---|
| **Vaat ihlali** | Seçilince vaadi tutmamak | Otomatik vaat karnesi; güven ve unvan kaybı (§4.2) |
| **Kayırmacı ihale** | Muhtar ortak proje malzemesini kendi tesisinden pahalıya almak | Kamu alımları **açık eksiltme** (en düşük teklif) ve NPC referans fiyat tavanıyla; muhtarın kendi tesisinden alım yasak |
| **Çıkar çatışması** | Kartın etkisinin ≥%30'u muhtarın kendi yapılarına gidiyor (ör. kendi komşu adasına OSB) | **Çıkar çatışması bayrağı** (kart ekranında ve forumda görünür); bayraklı kart için il meclisi 24 sa itiraz hakkı |
| **Kasa israfı** | Anlamsız fuar/şenlik harcaması | **Açık defter**: her ilçe kasası işlemi herkese açık; ilçe forumunda otomatik başlık |
| **Pasiflik** | Makamı boş bırakmak | 7 gün sonra NPC Kaymakam kayyum (§4.2) |
| **Seçim satın alma** | Aday–seçmen transferi | Seçim haftasında transfer dondurma; yeni hesap transfer tavanları ([paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md)) |

**NPC Kaymakam teftişi.** 28 günde bir, ilçelerin rastgele %25'ine uygulanır; sonuç "teftiş raporu" olarak herkese açık. Ciddi bulgu (örn. bayraklı kartlara itiraz yok + kasa israfı) halinde makam sahibi 7 gün **kasa harcama sınırına** alınır ve "Teftişli" etiketi alır. **Makamdan alma yoktur:** oyuncunun emeği ceza ile silinmez; sorun seçimle çözülür.

### 4.7 İl kardeşliği ve diplomasi

Gerçekte kardeş şehir ilişkisi belediye meclis kararı ve bakanlık onayıyla kurulur; en önemli ölçüt şehirler arasındaki **denkliktir** (önem, nüfus, ekonomi, kültür, coğrafya) [37].

| Konu | Kural (öneri) |
|---|---|
| Kurulum | Vali teklif eder; karşı ilin il meclisi onaylar |
| **Denklik** | Nüfus ve ilçe sayısı ±%50 içinde olmalı (büyük ilin küçük ili "hamisi" yapmasını önler) |
| Fayda | (1) Teknoloji yayılımında ağırlık (TK3: ticaret anlaşmalı 1,5 → kardeş il 1,75), (2) ortak festival olayı (iki ilde birden fuar etkisi), (3) kenar bakım gideri −%10, (4) **sınırlı** ortak savunma çağrısı (aynı savaşta en çok 1 kardeşten destek) |
| Bedel | Kardeş ile savaş ilan edilemez; fesih bekleme 14 gün ve güven kaybı |
| Sınır | İl başına ≤2 kardeş |
| Diplomasi | Ticaret anlaşması, yaptırım, ambargo mevcut D6 araçlarıyla; ayrıntılı diplomasi ağacı **yok** ([08 §6.8](../08-alti-katman.md)) |

### 4.8 Devlet öğeleri: öneri tablosu

Öncelik: **A0** = Alfa-0, **A1** = Alfa-1, **S** (sonra). Maliyet: S/M/L (üstte tanımlı).

| # | Öğe | Oyuncuya etkisi | Maliyet | Öncelik | Kötüye kullanım riski → önlem |
|---|---|---|---|---|---|
| D1 | **Makam ve yetki matrisi** (NPC Kaymakam, NPC muhtar, salt okunur kartlar) | "Yasa beni nasıl etkiler?" sorusuna tek bakışta cevap (H4); Alfa-1'de seçilmiş makamlara geçiş | M | **A0** (salt okunur) → A1 | Kafa karışıklığı (Kaymakam atanmış, Vali seçilmiş) → Yardım ekranı, UI'da NPC rozeti |
| D2 | **Seçim haftası ve vaat kartları** | Seçim haftası, aday olma/oy verme/vaat kararı; Hizmet Muhtarı unvanı | M | A1 | Çoklu hesapla oy → aktiflik koşulu, hesap yaşı, transfer dondurma; oy satın alma → transfer tavanı |
| D3 | **İlçe kartları (8)** | Arazi vergisi, imar, teşvik, OSB, sit alanı, fuar, hizmet önceliği, pazar günü; ilçe kimliği oluşur | M | A1 (A0'da 2 kart sabit) | Sit alanıyla rakip dondurma → yalnız boş + OSM korunan ada, ilçenin ≤%10'u, sahip onayı; OSB'yle kayırma → çıkar çatışması bayrağı |
| D4 | **İl kartları (+Liman harcı, Afet fonu; Yol programı sonra)** | Vali olmanın bedelli kararları; ihracat yolu seçimi | M | A1 | Liman harcıyla rakibi boğma → tavan (toplam %10), 72 sa bekleme, grup tepkisi |
| D5 | **İlçe kasası + il hazinesi + il payı** | Verginin nereye gittiğini görme; kasayla proje finansmanı | M | A1 (A0'da gösterge) | Kasa kaçırma → imkânsız (kasa → yalnız kart/proje); israf → açık defter |
| D6 | **Ortak projeler ve toplu katkı** | Köprü, baraj, hastane vb. için ortak çaba; plaket ve unvan | L | A1 (il başına 1) → S | Bedavacılık → plaket, eşleştirme; katkıyla oy → oy ağırlığı yok; aklama → günlük katkı tavanı, yeni hesap tavanı |
| D7 | **Çıkar grupları ve kamu güveni** | 5 grubun tepkisi; kamuoyu hissi; erken seçim hakkı | L | A1 (yalnız gösterge) → S (eylem olayları) | Gösterge oyunlaması (kasıtlı düşürme) → memnuniyet ortalamaya döner, eylem olayı çevrimdışı kaybı vurmaz |
| D8 | **Açık defter, çıkar çatışması bayrağı, açık eksiltme** | Şeffaflık; "kim neye harcadı" okunur | S–M | A1 | Veri kirliliği → defter otomatik; kişisel veri → yalnız oyun içi ad |
| D9 | **NPC Kaymakam teftişi ve kayyum** | Denetim hissi; pasif makam sorunu çözülür | M | A1 | Teftiş sürprizinin haksız hissi → kural açık, rapor kamuya açık, makamdan alma yok |
| D10 | **Geri çekme önergesi + güven oylaması** | Azınlık sesi; CK3 hizbi hafif | M | S | Önergeyle felç → il başına 14 günde ≤1, eşik %50 hasım güç |
| D11 | **Kardeş il** | İller arası ortaklık; teknoloji yayılım bonusu | M | S | "Hami il" → denklik ±%50, destek çağrısı sınırı, savaş yasağı yalnız ikili |

---

## 5. Askeri

**İlke ([11 Ek karar](../11-urun-donusu.md)).** Savaş toprağı değil **kontrolü** kazandırır; parsel asla el değiştirmez. Birincil kaldıraç ekonomik savaştır (abluka, tarife). Askeri güç, üretim, ticaret ve yönetişimle birlikte beşinci eğlence ayağıdır; ama adil olmalı: çevrimdışı kayıp tavanı ve kalkanlar korunur (H5).

### 5.1 Birlik türleri: sade taş-kâğıt-makas

Bugün çekirdekte iki birlik vardır: Piyade Tümeni (güç 100) ve Zırhlı Tümen (güç 260; `mekanize_ordu` teknolojisi ister). Öneri: üç çekirdek tür + iki destek türü.

| Birlik | Rol | Yener (×1,25) | Yenilir (×0,80) | Girdi (mevcut / öneri) | Teknoloji | Parti |
|---|---|---|---|---|---|---|
| **Piyade Tümeni** | Ucuz omurga; elde tutma | **Topçu** | Zırhlı | çelik 30k, mühimmat 20k, gıda 30k (mevcut) | — | 12 sa |
| **Zırhlı Tümen** | Hızlı, güçlü; yakıt yer | **Piyade** | Topçu | çelik 80k, parça 30k, yakıt 20k (mevcut) | `mekanize_ordu` | 18 sa |
| **Topçu Alayı** (yeni) | Menzil; ağır mühimmat yer | **Zırhlı** | Piyade | çelik 50k, mühimmat 40k, parça 10k (öneri) | `topcu_doktrini` | 14 sa |
| **İkmal Birliği** (yeni, destek) | Ordunun ikmal karşılanmasını korur; kendi saldırı gücü yok | — (üçgen dışı) | Üçgendeki herkese karşı savunmasız; ilk hedef | çelik 20k, yakıt 15k, gıda 15k (öneri) | `ikmal_konvoyu` | 10 sa |
| **Hava Savunma** (destek) | Yalnız hava tehdidi olaylarına karşı (§5.3 PvE "hava keşfi/akın") | — | — | Alfa-1'de **yapı** olarak (§5.2); birlik ancak "hava destek" eklenirse | `hava_savunma_mevzii` | — |

**Neden sade.** Üç tür ve ±%25 tavan, ilk bakışta okunur (RoK'un piyade > süvari > okçu üçgeni de aynı mantık [21]; HoI4'te de piyade/zırhlı/topçu ayrımı vardır [41]). Hard-counter yok: karışım karar verir, tek tür yığmak yenilmez değildir.

**Çözüm formülü taslağı** (mevcut otomatik çözüm: `güç = Σ(adet × güç) × ikmalKarşılanma × arazi/duruş çarpanları`, ±%10 sapma [06 §6](../06-simulasyon-spesifikasyonu.md)):

```
pay_X(t)  = X tarafında t türünün güç payı            (toplamı 1)
yener(t)  = t'nin yendiği tür  (Piyade→Topçu, Topçu→Zırhlı, Zırhlı→Piyade)
ustun(A,B) = Σ_t pay_A(t) × pay_B(yener(t))           // A'nın B'ye karşı avantaj payı
carpanA   = clamp( 1 + 0,25 × ustun(A,B) − 0,20 × ustun(B,A),  0,75 , 1,25 )   // tamsayı PPM ile
etkinGucA = Σ(adet × güç) × ikmalKarsilanma × arazi/duruş × carpanA × yerleşiklikSavunma(yalnız savunan)
```

Örnek: A yalnız Zırhlı, B yalnız Piyade: `ustun(A,B)=1`, `ustun(B,A)=0` → A ×1,25, B ×0,80 (oran 1,56). Karma ordularda çarpan 1'e yaklaşır. Tavan ±%25 (alt %0,75) çok uçlu sonuç çıkmasını önler. İkmal Birliği, `ikmalKarsilanma`'nın abluka/yol aksaması sırasında düşmesini en çok %X yumuşatır.

### 5.2 Savunma yapıları

[11 §7.3](../11-urun-donusu.md) 18 yapı arasında yalnız Ordugâh'ı sayar. [Ek karar](../11-urun-donusu.md) savunma yapılarını (karakol, sur/barikat) ekler. Öneri (yapı sayısı değişir, bkz. §13):

| Yapı | Yuva / inşa | Etki | Bedel / sınır |
|---|---|---|---|
| **Karakol** | 1 / 4 sa | O ada için NPC jandarma: PvE baskınında hasar −%15, ön duyuru +2 sa | Haftalık bakım (para); ilçe kasasından ya da sahibin kendi parasından |
| **Sur / Barikat** | 1–2 / 6 sa | Savunan çarpanı +%10 (piyade/topçu sayısına bağlı), baskında yapı devre dışı olasılığı ↓ | Sahibin ≤2 savunma yapısı; toplam savunma bonusu tavanı +%35 (azalan getiri) |
| **Gözetleme kulesi** | 1 / 3 sa | Ön duyuru 6 → 12 sa; Dikkat panelinde "yaklaşan baskın" kartı | Çevrimdışı oyuncuya da çalışır (H5/H7 için iyi) |
| **Hava savunma mevzii** | 1 / 6 sa | Hava keşfi/akın olaylarının hasarı −%50 | Hava tehdidi olmayan ilçede ölü yapı riski; yalnız PvE "hava" olayı olan ilçelerde açılır |
| **Depo kasası** (Ambar yükseltmesi) | — / 4 sa | Yağma payı gerçekte %25 değil **%15** | Bakım gideri; H5 tavanını düşürmez, yalnız gerçek kaybı azaltır |

**Yerleşiklik savunma çarpanı** (EVE ADM'den esinli [4]): ilçedeki aktif yapı ve aktif sahip yoğunluğu savunan çarpanını ×1,00–1,30 arasında artırır. Ölçüt: son 7 günde üretim yapan yapı payı. Böylece "yaşayan ilçe zor ele geçer" ve kur-unut ilçe daha kırılgan kalır; ama çevrimdışı yağma tavanı (%25) geçerli kaldığından ceza ağır değildir.

### 5.3 NPC eşkıya, korsan ve kaçakçı baskınları (PvE)

PvE, askeri ayağı Alfa-0'da canlandırır ve ordugâh için **gerçek talep** yaratır.

| NPC tehdit | Nerede | Etki | Karşı hamle | Öncelik |
|---|---|---|---|---|
| **Eşkıya baskını** | Kara (ilçe) | Ambar stokundan yağma (PvE payı ≤%10); yol üstü konvoy gecikmesi (kayıp yok) | Karakol, Gözetleme Kulesi, birlik (İl komutanlığı havuzundan otomatik savunma), Depo kasası | **A0** |
| **Korsan** | Deniz kenarı / liman | 24 sa liman kenarı kapasitesi −%30; yük sigortası gideri | Liman karakolu, İkmal Birliği ile korumalı konvoy | A1 |
| **Kaçakçı** | Pazar / tarife | İl hazinesine akan ihracat vergisi ve liman harcı gelirinin ≤%5'i kaçar | Denetim (NPC Kaymakam teftişi), karakol | A1 |
| **Hava keşfi / akın** (nadir) | Hava savunma mevzii olan ilçeler | Kısa süreli üretim kesintisi | Hava savunma mevzii | S |

**Ölçekleme (RimWorld esinli [23]).** Baskın büyüklüğü, tek oyuncunun değil **ilçenin servetinin** eğrisiyle hesaplanır: bir eşiğin altında 0, üstünde artan, üstte tavan. RimWorld'de 14.000 altı 0, 1 milyon üstü tavan değerdir ve binalar servete yarım sayılır; yeni oyuncuyu yalnız bırakmamak için aynı fikir bizde ilçe medyan servetine bağlanır.

| Kural | Değer (öneri) |
|---|---|
| Sıklık | İlçe başına ortalama 5–9 günde bir (PRNG olay akışı, deterministik) |
| Ön duyuru | ≥6 sa (Gözetleme Kulesi ile 12 sa); Dikkat panelinde "yaklaşan baskın" *(güncellendi: askeri-katman-v1 K11, tasarım belgesi T-50: ön duyuru 24 sa, Gözetleme Kulesi ile 36 sa)* |
| Zaman | İlçe yoğun saat bandı içinde; il seçer (§5.4) |
| Kayıp tavanı | PvE + PvP yağması **ortak** kayan pencere tavanı: pencere başına stokun ≤%25'i |
| Kalkan | Yeni oyuncu kalkanı süresince o oyuncunun yapıları hedef alınmaz (14 gün) |
| Ödül | Eşkıya ganimeti (mühimmat, yakıt, para), "Eşkıya Avcısı" ilk başarımı, panoda ödül ilanı (§8.3) |
| Askeri talep | Savunma birlikleri mühimmat, çelik, gıda ister; kayıp birlik yeniden üretilir → H3 (%20 yuva ordugâha kayınca fiyat/arz ≥%10) ölçülür |

### 5.4 İl kontrol savaşı akışı

Mevcut: ilan → hazırlık (U(min, max)) → pencere → otomatik çözüm; kayıp tavanı ve ≥49 sa ara ([06 §6](../06-simulasyon-spesifikasyonu.md), [11 §7.7](../11-urun-donusu.md)). Aşağıdaki akış bunu genişletir.

| # | Faz | Süre | Ne olur | Oyuncu kararı | Koruma |
|---|---|---|---|---|---|
| 0 | **Uygunluk** | — | Saldıran il komşu olmalı; hedef kalkanda/uykuda olmamalı; servet oranı ≤1:5; il başına ≤1 ilan/hafta | — | Kalkan, 1:5, hareketsiz hedef ödülsüz |
| 1 | **İlan** | Anında | Vali ilan eder; il meclisi **6 sa** içinde onaylar (aksi hâlde düşer). Savaş **hedefi** önceden bildirilir: {ilçe kontrol hakkı, liman geçiş payı, damar kullanım payı, abluka kırma} | İlan bedeli il hazinesinden; ittifak çağrısı | İlan duyurusu herkese görünür (tabela, pano, Dikkat paneli). Hedef ilan sonrası değişmez |
| 2 | **Hazırlık** | 12–24 sa (öneri: **alt sınır 20 sa**, Albion'un 20 sa kuralı [8]) | Savunan **4 saatlik yoğun saat bandı** seçer; birlik toplanır; ortak sefer ve paralı sözleşmeleri kapanış (T−4 sa) | Savunan: bandı seç, savunma emri; saldıran: karışım, ikmal | Band yalnız **08:00–24:00** arasından (uyku saati gizlenmesini önler). Band değişikliği **96 sa** sonra işler (EVE [4]) |
| 3 | **Çarpışma** | Seçilen 4 saat, 4 tur × 1 sa | Her tur otomatik çözülür: `etkinGuç` karşılaştırılır; tur kazananı 1 puan alar. Tur öncesi **emir kartı**: Taarruz / Savunma / Geri çekil / İkmal öncelik. Çevrimdışı oyuncuda **hazır savunma emri** geçerlidir (mevcut) | Emir kartı (saatlik), birlik ekleme (havuzdan) | Band dışında saldırı hasarı sayılmaz |
| 4 | **Sonuç** | Anında | ≥3 tur kazanan galip. **Kontrol hakkı** (§aşağı), yağma ≤%25, yapı ≤%10 **devre dışı** 24 sa (yıkılmaz), birlik kaybı (%30 / %10, yukarı yuvarlama, mevcut) | — | Parsel **0** kayıp |
| 5 | **Soğuma** | ≥49 sa (aynı ilçe); 7 gün (savaş yorgunluğu) | Aynı ilçeye baskın yok; istikrar etkisi: ilan −30k, kayıp −100k (7 gün, [08 D2](../08-alti-katman.md)); hasar onarımı | Onarım ve yeniden üretim | İstikrar eşiği %60 tek savaşta aşılamaz (D7) |

**Kontrol hakkı (öneri).** Kazanan il, hedef ilçede **14 gün** boyunca: (a) muhtar seçiminde **1 aday kontenjanı** (halk yine oy verir), (b) ilçe kasasından **≤%15 pay** (haraç değil "kontrol payı", açık defterde görünür), (c) liman/geçit **geçiş ücreti payı** hakkına sahiptir. Savunan il yeniden meydan okuyabilir. Parsel, yapı, üretim ve oy hakkı kimseye geçmez. Süre sonunda hak otomatik düşer; yeni ilan gerekir.

**Neden bu akış?** EVE'de savunan pencere seçer ve değişiklik gecikir [4][5]; Albion'da savaş ilandan ≥20 sa sonra yoğun saatte yapılır [8]; Rival Regions'ta savaşa meclis karar verir [42]. Biz üçünü birleştiriyoruz: meclis onayı + savunanın bandı + tur tabanlı çözüm. Türkiye ve Balkanlar neredeyse tek saat diliminde (UTC+2/+3) olduğundan EVE'nin "saat dilimi savaşı" bizde küçüktür; pencere zamanı sosyal buluşma olayı olur.

### 5.5 Abluka, paralı asker ve ittifak

**Abluka (ekonomik savaş, birincil kaldıraç).**

| Konu | Kural (öneri) |
|---|---|
| Hedef | Liman veya geçit **kenarı** |
| Etki | Kenar kapasitesi en çok **−%50** (hiçbir zaman sıfır) ve **gıda/elektrik "insani koridor"**: temel mal akışı bu kesintiden muaf |
| Süre | ≤72 sa; aynı kenarda 7 gün ara |
| Bedel | Ablukacı birlik bakımı ve ikmal (sürekli gider) |
| İlan | Vali; 12 sa önceden duyuru; il meclisi onayı gerekmez |
| Karşı | **Ablukayı kırma** seferi: savunan birlik gönderir, kapasite kaybının yarısı hemen geri gelir |
| Amaç | Rakibin pazara erişimini **geciktirmek**; ezmek değil |

**Paralı asker sözleşmeleri.** EVE'de paralı pazarı vardır ve paralı, savaş bitene dek bağlıdır [6]. Biz:

| Konu | Kural (öneri) |
|---|---|
| Sözleşme | Vali/oyuncu, Sözleşme Panosu'na "kiralık birlik" ilanı verir (para + teminat) |
| Teminat | Para **emanete** alınır; savaş sonunda ödenir |
| Bağlılık | Paralı, savaş bitene dek aynı tarafta **bağlıdır** (çifte ajanlık yok) |
| Tür | Başka oyuncunun ordugâhından kiralık birlik (oyuncu gelirine dönüşür) ya da pahalı NPC bölüğü |
| **Tavan** | Bir tarafta paralı gücü, toplam gücün ≤%30'u. K13: yalnız oyun içi para |
| Kötüye kullanım | Kendi hesabına kiralama (sahte sözleşme) → sözleşme tavanı, aynı IP/aygıt tespiti (R-Ü11), kiracı/kiralayan arasında transfer tavanı |

**İttifak ve ortak sefer.**

| Konu | Kural (öneri) |
|---|---|
| Ne | Oyuncu ittifakı (lonca): ortak sefere birlik katkısı; **savaşı yine yalnız vali ilan eder** |
| Üye tavanı | min(60 hesap, aktif oyuncuların %15'i). Travian Legends ittifakı ≤60 [20]; Albion lonca ≤300 [9] |
| Katılım | Katılmak için 7 gün, ayrılıp aynı ittifaka dönmek için 3 gün bekleme (Albion kuralları [9]); yeni hesap ittifak transferi tavanı |
| **Büyük ittifak tavanı** | Savaşta bir tarafın katkısı **azalan getirilidir**: ilk 20 hesap tam, 21–40 hesap ×0,7, 41+ ×0,4. Savaş başına katılım ≤40 hesap. Albion'un alliance büyüklüğünü sınırlama denemesi (300) ve sonra cezalara dönmesi bu tartışmanın zorluğunu gösterir [10] |
| Kalkan | Kalkanlı hesap seferde birlik **katkısı veremez** (Travian: korunan ne saldırır ne saldırılır [18]) |
| Ortak sefer | İttifak üyeleri aynı hedefe birlik "havuzlar"; il komutanlığı havuzuna benzer, ama süreli |

### 5.6 Kayıpların ekonomiye etkisi

| Kanal | Etki |
|---|---|
| Üretim talebi | Birlik üretimi mühimmat, çelik, parça, yakıt, gıda çeker; fiyat şoku (H3: yuvaların %20'si ordugâha kayınca ≥%10 değişim) |
| Maaş ve ikmal | Birlik başına saatlik maaş (mevcut 8.000 mili-para) ve ikmal malı; ikmalsiz ordu güçsüz |
| Kayıp | Kaybeden %30, kazanan %10 birlik kaybı (mevcut). **Revir:** kayıpların %40'ı 24 sa içinde geri döner (öneri); hastane projesi oranı artırır |
| Yapı | Devre dışı yapılar (≤%10) parça + işçi ile onarılır; yıkılmaz |
| İstikrar | Savaş ilanı −30k, kayıp −100k (7 gün); %60 eşiği üretimi korur |
| Pazar | İlçe talebi ve ablukaya bağlı fiyat primi; "savaş ekonomisi" bot önayarı |
| Kayıp tavanı | Yağma ≤%25/pencere; PvE + PvP ortak |

### 5.7 Adalet korumaları (tek paket)

| Koruma | Değer | Kaynak / not |
|---|---|---|
| Yeni oyuncu kalkanı | **14 gün**; kalkanlı hesap hedeflenemez ve seferde katkı veremez | [11 §7.7](../11-urun-donusu.md); Travian [18] |
| Kalkan sonrası yumuşatma | 15–28. gün yağma %50 (öneri) | Uçurum etkisini önler |
| Hareketsiz oyuncu | Uyku hesabı hedef olabilir ama **ödülsüz** (yağma 0, kontrol hakkı hesaplanmaz) | [11 §7.8](../11-urun-donusu.md) |
| Güç farkı | Servet oranı **1:5** | OGame (11 §7.7; [Gameforge kuralları](https://gameforge.com/en-GB/games/ogame-rules.html)) |
| Yağma tavanı | Pencere başına stokun **≤%25**'i; Depo kasasıyla fiilen %15 | H5 |
| Yapılar | ≤%10 devre dışı, 24 sa; yıkılmaz | H5 |
| Parsel | **0** kayıp | Ek karar |
| Soğuma | Aynı ilçeye ≥49 sa; il başına ≤1 ilan/hafta | Mevcut |
| Yoğun saat bandı | Savunan seçer, 08:00–24:00; değişiklik 96 sa | EVE [4] |
| Büyük ittifak tavanı | Üye ≤60 / aktifin %15'i; azalan katkı; katılım ≤40 hesap; 7/3 gün bekleme | §5.5 |
| Çevrimdışı | Hazır savunma emri; NPC jandarma; Gözetleme Kulesi uyarıları | Mevcut + yeni |
| Savaş hedefi | İlanda sabit, görünür | EVE ve Victoria 3 esinli "talep önceden bildirilir" |
| Rust esinli kademeli bakım | Elde tutulan büyüklüğe göre artar | [oyun tasarımı §1](oyun-tasarimi-parsel.md) |

Rust ekosisteminde de çevrimdışı koruma eklentileriyle uygulanır; takımdan biri çevrimiçiyse baskın serbesttir [16]. Last Oasis ise çevrimdışı baskını tamamen kaldırır ve klanların bölgeyi 24 saatte bir yeniden almasını ister [17]. Bizde çevrimiçi/çevrimdışı ayrımı yoktur; sabit tavan (%25, %10) ve bandlı pencere vardır. Sebep: hesaplı kalıcı dünyada "çevrimdışı" ile "kayıp" ayrışmalı, ama savaş da anlamlı kalmalı.

### 5.8 Askeri öğeler: öneri tablosu

| # | Öğe | Oyuncuya etkisi | Maliyet | Öncelik | Kötüye kullanım riski → önlem |
|---|---|---|---|---|---|
| A1 | **Birlik türleri** (Piyade, Zırhlı mevcut; +Topçu, +İkmal; Hava Savunma yapı olarak) | Ordu karışımı kararı; ilk bakışta okunan üçgen | M | **A0** (Topçu eklenirse; yoksa A1) | Tek tür yığma → ±%25 tavan, karma ordular avantajlı; ölü uç (Hava Savunma) → yapı olarak, yalnız hava olayı olan ilçede |
| A2 | **Savunma yapıları** (Karakol, Sur, Gözetleme, Hava savunma, Depo kasası) | Savunma kararı; çevrimdışı güven | M | **A0** (Karakol + Gözetleme) → A1 | Aşırı yığma → ≤2 yapı/sahip, toplam bonus tavanı +%35 |
| A3 | **NPC eşkıya baskını (PvE)** | Ön duyuru → savunma kararı; ordugâh için talep | M | **A0** | Gizli kayıp → ön duyuru, ≤%10 PvE yağması, ortak ≤%25 tavan; yeni oyuncuya baskın yok (kalkan) |
| A4 | **NPC korsan ve kaçakçı** | Liman/pazar kararlarına yeni tehdit | M | A1 | Hazine kaçağı hissi → açık defter, ≤%5 kayıp |
| A5 | **İl kontrol savaşı akışı** (ilan → hazırlık → bant → 4 tur → sonuç → soğuma) | Beşinci eğlence ayağı; koordinasyon | L | A1 | Zorbalık → §5.7 paketi; ilan spam → il başına ≤1/hafta |
| A6 | **Savaş hedefi, il meclisi onayı, ilan bedeli** | Savaşa siyasi ağırlık (Rival Regions meclis modeli); yönetişimle bağ | M | A1 | Vali dikta → meclis onayı; onay oylarını satın alma → transfer dondurma |
| A7 | **Emir kartları ve tur tabanlı çarpışma** | Dakika-saat ritminde taktik; çevrimdışı hazır emir | M | A1 | Mikro yönetim → 4 emir, 4 tur, hazır emir varsayılan |
| A8 | **Abluka** | Birincil ekonomik savaş aracı; geciktirme | M | A1 | Sivil ezilme → kapasite ≥%50 kalır, gıda/elektrik koridoru, 7 gün ara |
| A9 | **Paralı asker sözleşmeleri** | Birlik kiralayan ve kiralanan roller; gelir | M | S | Para = güç hissi → ≤%30 tavan, bağlılık, emanet |
| A10 | **İttifak ve ortak sefer** | Sosyal bağ, ortak hedef | L | A1 (temel) → S | Dev ittifak → üye tavanı, azalan katkı, 7/3 gün bekleme, katılım ≤40 |
| A11 | **Kayıp-ekonomi bağı** (revir, onarım, savaş yorgunluğu) | Savaşın piyasaya yansıması; H3 | M | A1 | Savaşın ekonomiyi çökertmesi → istikrar eşiği %60, sabit tavanlar |
| A12 | **Adalet korumaları paketi** (kalkan, 1:5, hareketsiz, bant, soğuma) | Güven; yeni oyuncu korunur | M | **A0** (kalkan, hareketsiz, PvE tavanı) → A1 | Kalkan sömürüsü (yeni hesapla seferi destek) → kalkanlı seferde katkı veremez; çoklu hesap → R-Ü11 |

---

## 6. Teknoloji

**İlke ([08 TK1](../08-alti-katman.md)).** Teknoloji yüzde vermez, **yöntem açar**; her düğümün bedeli vardır; derinlik ≤4; en çok 2 aktif araştırma. Bu rapor kurala uyar: yeni düğümler de yöntem/karar/yapı açar. (Victoria 3 de teknolojiyi yöntem açıcı olarak kullanır.)

### 6.1 Dallar: 17 düğümü etiketlemek ve genişletmek

Bugünkü 17 düğüm katmana göre dağılıyor. Öneri: ağaç ekranını **8 dala** ayır; mevcut 17 düğümü bu dallara yerleştir; 9 yeni düğümle üç dal ekle.

| Dal | Mevcut düğümler | Yeni düğümler (öneri) |
|---|---|---|
| **Toprak ve Hayvan** | `mekanize_tarim`, `sulama_sistemi`, `hassas_tarim` ⊕ `organik_rotasyon` | — |
| **Enerji ve Madde** | `derin_madencilik`, `elektrik_ark_ocagi`, `otomasyon`, `temiz_enerji` ⊕ `termik_verim` | — |
| **Yol ve Liman** | `konteyner_limani`, `buzkiran_filosu`, `soguk_zincir` | — |
| **Ticaret** | `tedarik_sozlesmesi`, `serbest_liman` | — |
| **Kamu ve Afet** | `kamu_egitimi` | `e_belediye`, `afet_yonetimi` |
| **Savunma ve Harp** | `seferberlik_hukuku`, `mekanize_ordu` | `topcu_doktrini`, `ikmal_konvoyu`, `hava_savunma_mevzii`, `derin_savunma` ⊕ `hareket_harbi` |
| **Kültür ve Turizm** | — | `turizm_tanitim`, `miras_koruma` |
| **Bilim** (ortak) | — | Ortak araştırma, üniversite/teknopark, patent (§6.2; **sonra**) |

**Yeni düğümler** (maliyet ve süre öneridir; mili-para ve gün; kalibre edilmedi):

| Düğüm | Dal | Açtığı yöntem / karar / yapı | Bedeli | Ön koşul | Maliyet | Süre |
|---|---|---|---|---|---|---|
| `topcu_doktrini` | Savunma | Birlik: **Topçu Alayı** | Mühimmat ve parça talebi; ikmal ağırlığı | `derin_madencilik` | 28 000 000 | 3 |
| `ikmal_konvoyu` | Savunma | Birlik: **İkmal Birliği**; ikmal karşılanmasını yumuşatma yöntemi | Yakıt ve gıda gideri | `mekanize_tarim` | 22 000 000 | 3 |
| `hava_savunma_mevzii` | Savunma | Yapı: **Hava savunma mevzii** | Elektrik ve parça | `otomasyon` | 30 000 000 | 3 |
| `derin_savunma` | Savunma (dal A) | Yapı: **Müstahkem mevki** (Sur 2. kademe); hazır savunma emri "Mevzi" | Saldırı emirleri yavaşlar; ⊕ `hareket_harbi` | `topcu_doktrini` | 26 000 000 | 3 |
| `hareket_harbi` | Savunma (dal B) | Çarpışma emri: **Manevra** (tur 3'te çarpan tavanı ±%25 → ±%35, iki yönde) | İkmal gideri ×1,3; ⊕ `derin_savunma` | `mekanize_ordu` | 30 000 000 | 4 |
| `e_belediye` | Kamu | Karar: açık defterin otomatik özeti; il yasası bekleme 72 → 60 sa | Hazine gideri (nüfusla orantılı) | `kamu_egitimi` | 18 000 000 | 2 |
| `afet_yonetimi` | Kamu | Yapı: **Afet/itfaiye merkezi**; Gözetleme Kulesi ön duyurusu +6 sa | Hazine gideri | `kamu_egitimi` | 22 000 000 | 3 |
| `turizm_tanitim` | Kültür | Karar: fuar/şenlik gelir yöntemi; sit alanı turizm geliri | Ücret ve işçi gideri | `soguk_zincir` ya da `tedarik_sozlesmesi` | 18 000 000 | 2 |
| `miras_koruma` | Kültür | Karar: sit alanı itibar yöntemi; Çevre grubu memnuniyeti + | Sanayi grubu memnuniyeti − | `kamu_egitimi` | 20 000 000 | 3 |

Toplam: 17 → **26 düğüm**, dışlayan çift 2 → 3. Derinlik ≤4 korunur. Tek oyuncunun açabileceği düğüm sayısı artar (30. günde ağacın ≈%60'ı hedefi bozulur): yeni 9 düğümün toplam maliyeti ≈ 214 milyon mili-para ve ~26 gün ek süre (tek slot). **Çözüm:** dal başına "uzmanlık yolu": oyuncudan tüm ağacı açması beklenmez; 30. gün hedefi "hiçbir oyuncunun >%60'ı açmaması + her dalın en az bir oyuncuda en iyi seçim olması" (H1 ruhu) olarak yeniden okunur. Ölü uç riski: her düğümün ≥1 botta seçilmesi kabul ölçütü ([08 §4.7](../08-alti-katman.md)).

### 6.2 Ortak araştırma, üniversite/teknopark, patent/lisans (sonra)

| Öğe | Nasıl çalışır | Gerçek/oyun referansı |
|---|---|---|
| **Ortak araştırma (ilçe/il)** | Sahipler Atölye-Lab'dan "araştırma bağışı" yapar; **ilçe kalkınma programları** (kamu düğümleri: akıllı şebeke, ilçe sulama ağı, atık yönetimi, ortak soğuk depo, erken uyarı) bağışla açılır. Sonuç ilçedeki **herkesi** etkiler. İlçenin 1 ortak slotu vardır (kişisel 2 slota ek) | Travian'da ittifak bonusları bağışla açılır ve herkese uygulanır [19]; Eco'da ortak hedef işbirliği doğurur [3] |
| **Üniversite / teknopark** | Ortak proje yapıları (§4.4); ilçe **Merkez** seviyesinden sonra. Üniversite: ilçe ortak slotu +1; Teknopark: lisans komisyonu −%50 ve "ilk keşfeden" vitrini | Gerçekte de OSB/üniversite/teknopark il kalkınmasında birlikte anılır (**doğrulanmadı**) |
| **Patent / lisans** | İlde bir düğümü **ilk** araştıran hesap, 14–28 gün **patent** sahibi olur. Patent **erişimi kapatmaz**: başkaları düğümü tam fiyatla araştırabilir. Patent, yayılım indirimini (TK3) **lisansa bağlar**: lisans alan, patent süresince indirimli/hızlı açar; sahip lisans bedeli alır | Gerçek patent modeli; Victoria 3 yayılım mantığı [13] |
| Lisans bedeli | ≤ düğüm maliyetinin %25'i (öneri); korumadaki ve 14 günden genç hesaplara **bedelsiz** | H6 |
| Süre bitince | Patent kamuya açılır (mevcut yayılım) | — |

### 6.3 Teknoloji ile açılan görsel yapı varyantları

Varyantlar **kozmetiktir**; işlevi değiştirmez (yöntem etkisi zaten düğümde). Amaç: oyuncu kararlarının dünyada görünmesi, komşu ilçelerin farklı dallar seçtiğini sokakta görmek. Yürüyüşte (Alfa-1) ve L3 MapLibre silüetinde görünür.

| Düğüm | Yapı | Görsel varyant | Öncelik |
|---|---|---|---|
| `mekanize_tarim` | Tarla | Traktör ve çit | **A0** |
| `sulama_sistemi` | Sulama | Kanal ve pivot kol | A0 |
| `hassas_tarim` ⊕ `organik_rotasyon` | Tarla | Düzenli şeritler + drone **/** karma bitki sırası + arı kovanı | A1 |
| `derin_madencilik` | Maden ocağı | Kule ve vinç | A0 |
| `elektrik_ark_ocagi` | Çelikhane | Ark parıltısı | A0 |
| `otomasyon` | Fabrikalar | Robot kol, L ölçek bacası | A0 |
| `temiz_enerji` ⊕ `termik_verim` | Santral | Rüzgâr türbini/güneş paneli **/** yüksek baca | A1 |
| `konteyner_limani`, `buzkiran_filosu` | Liman | Vinç ve konteyner yığını; buzkıran gemi | A1 |
| `soguk_zincir` | Ambar | Mavi cepheli soğuk depo | A0 |
| `mekanize_ordu`, `topcu_doktrini` | Ordugâh | Zırhlı park, top mevzii | A1 |
| `derin_savunma` ⊕ `hareket_harbi` | Savunma yapısı | Müstahkem duvar **/** hareketli araç hangarı | S |
| `turizm_tanitim`, `miras_koruma` | Fuar/Sit adası | Bayraklı fuar alanı, levha ve çit | S |

Maliyet: yapı başına tek mesh + malzeme varyantı (stilize, düşük çokgen); S–M (varlık işi). Tarayıcı yükü: aynı mesh örneklenir (instancing), ek çizim çağrısı yok. Sunucu: yok (varyant, bilinen düğüm kümesinden istemcide türetilir).

### 6.4 Teknoloji öğeleri: öneri tablosu

| # | Öğe | Oyuncuya etkisi | Maliyet | Öncelik | Kötüye kullanım riski → önlem |
|---|---|---|---|---|---|
| T1 | **Dal etiketleri ve ağaç ekranı** (8 dal) | Ağaç okunur; dal tamamlama başarımı | S | **A0** | Yok |
| T2 | **Görsel varyantlar (ilk 6 düğüm)** | Kararın dünyada görünmesi | S–M | **A0** → A1 | Yok (kozmetik) |
| T3 | **Savunma ve Harp dalı** (5 düğüm, bir dışlayan çift) | Doktrin seçimi (savunma ⊕ hareket); yeni birlikler | M | A1 | Ölü uç → bot ölçümü; dışlayan geri dönüşsüz → açık bedel yazısı |
| T4 | **Kamu ve Afet dalı** (`e_belediye`, `afet_yonetimi`) | Yönetişim ve afetle bağ | M | S | Zayıf çekim → afet/seçim olaylarıyla bağla |
| T5 | **Kültür ve Turizm dalı** | Sit alanı ve fuarın değeri; çevre/miras yolu | S–M | S | Sit alanı ile tur geliri farm → ilçe ≤%10 sit payı |
| T6 | **Yayılım bağları** (ticaret anlaşması + kardeş il) | Diplomasi ↔ teknoloji | S | A1 | Sahte kardeşlik → denklik, ≤2 kardeş |
| T7 | **Teknoloji vitrini ve "ilk keşfeden" başarımı** | Ağaç ilerlemesi sosyal görünür | S | A1 | Başarım avcılığı → "ilk" tek seferlik |
| T8 | **Ortak araştırma** (ilçe slotu, bağış) | İlçe işbirliği; ortak slot | L | S | Bedavacı → bağış defteri, plaket; aklama → günlük bağış tavanı |
| T9 | **Üniversite ve teknopark** (ortak proje) | Uzun vadeli hedef; ilçe seviyesi anlamı | L | S | Merkez seviyeli ilçe kilidi; oligopol → eşik açık |
| T10 | **Patent ve lisans** | Öncü olmanın somut ödülü; lisans gelir | L | S | Tekel → patent erişimi kapatmaz, lisans ≤%25, yeni hesap bedelsiz, süre 14–28 gün; sahte lisans → çoklu hesap tespiti, günlük tavan |
| T11 | **`dal_degistir` ve ikinci kademe** | Karar tükenmesini çözer ([08 TK1](../08-alti-katman.md)) | M | S | Pişmanlık sıfırlama → maliyet ×2 |

---

## 7. Lojistik: yalnız oyuncunun hissettiği kısım

**Sınır ([11 §1.1](../11-urun-donusu.md), K29).** Lojistik **otomatik ve arka plandadır**. Haritada akan çizgi yok; rota çizimi, araç ataması yok. Foxhole dersi: lojistik angarya olursa oyuncular greve gider [11]. Capital Rift'in "park et, ağa katılır" modeli bizde garaj + filo havuzudur [22]. Burada yalnız **hissedilen** parçalar: araç siluetleri, depo uyarıları, yol durumu, haftalık özet ve nadir rota olayları.

| # | Öğe | Oyuncunun gördüğü | Sunucu / tarayıcı | Maliyet | Öncelik | Kötüye kullanım riski → önlem |
|---|---|---|---|---|---|---|
| L1 | **Garaj ve araç silueti** | Garaj yapısında filo büyüklüğüne göre 1–6 araç; yürüyüşte yol üzerinde birkaç araç | S0 / B1 (instancing, tohumlu) | S | **A0** | Yok |
| L2 | **Filo kademeleri** (kamyon → tır → konvoy görseli) | Filo büyüyünce görsel ve kapasite hissi | S0 / B1 | S–M | **A0** → A1 | Yok |
| L3 | **Ambar doluluk ve kışa hazırlık uyarısı** | Dikkat panelinde "Ambar %90 dolu", "Kış yaklaşıyor: depo doldur" | S1 (eşik olayı mevcut) / B0 | S | **A0** | İstifçilik → bozulma ve depo tavanı |
| L4 | **Yol durumu levhası** (açık/kapalı/yavaş) | İlçe tabelasında kış kapanan geçit, sel yolu simgeleri ([08 L3/L5](../08-alti-katman.md) `iklim_kapali`) | S0 (iklim profilinden türer) / B0 | S | **A0** | Yok |
| L5 | **Haftalık taşıma raporu** | "Bu hafta 340 sefer, %12 gecikme, sebep: kış kapanması" | S1 (haftalık toplu iş) / B0 | S | **A0** | Yok |
| L6 | **Rota olayları** (sel, kaza, geçit kapanması) | Ön duyurulu kısa gecikme; ilçe panosunda bildirim | S1 (olay akışı) / B0 | M | **A0** (2 olay) → A1 | Gecikme kayıp sayılmaz (mal korunur) → H5 uyumu |
| L7 | **Yol üstü baskın etkisi** | Eşkıya baskınında konvoy gecikmesi, **mal kaybı yok** | S1 / B0 | M | A1 | Gizli kayıp hissi → panoda açık neden |
| L8 | **Nakliye sözleşmeleri** (oyuncu nakliyeci rolü) | Müteahhit/nakliyeci olmak; sözleşme panosunda "sevkiyat" | S2 (sözleşme eşleştirme) / B1 | M | S | Aklama → sözleşme tavanı |
| L9 | **Liman yoğunluğu ve karantina** | Liman kuyruğu görseli (`liman_dolu`, v1.5); salgında geçici yavaşlama | S1 / B1 | M | S | Yok |
| L10 | **Yürüyüşte yük hissi** | Hasat zamanı çiftlikten ambara giden araçlar | S0 / B1 | S | A1 (yürüyüşle) | Yok |

**Yapılmayacaklar.** Rota çizimi, araç ataması, sefer yönetimi, akan çizgi ve parçacık ağı. Lojistik oyuncuya yalnız panel ve ikon olarak görünür.

---

## 8. Canlı dünya: gerçek zamanlı, çevrimdışıyken de işleyen bir dünya

**Sahip yönü (1 Ekim).** Ürün gerçek zamana dayanır: dünya oyuncu yokken de işler. Bu bölüm bunu dört şeye çevirir: (1) gerçek saat ve takvimle eşleşen ritimler, (2) oyuncu yokken ne olduğu ve dönünce ne gördüğü, (3) NPC yaşamı ve dünyanın kendi ürettiği haberler, (4) oyuncuları aynı yere ve zamana toplayan anlar. Her öğede **sunucu maliyeti** ve **tarayıcı yükü** not edilir.

### 8.0 Maliyet etiketleri ve mimariye oturma

Mimari ([paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md)): dünya başına **tek yazar** Node süreci; stoklar tembel (olaylar yalnız oran değişiminde, eşiklerde, inşa bitiminde ve saatlik tikte oluşur); saatlik tik O(varlık); asıl yük lojistik çözücüsüdür. Zaman damgasını sunucu basar. Dolayısıyla **çevrimdışıyken işleyen dünya bedavadır** (tembel formül); ek maliyet, yalnız yeni olaylar, yayınlar ve özet kayıtlarıdır.

| Etiket | Sunucu maliyeti | Etiket | Tarayıcı yükü |
|---|---|---|---|
| **S0** | Ek iş yok: istemci formülden/takvimden türetir ya da mevcut saatlik tik/olaya biner | **B0** | Metin, ikon, pano (<~20 KB, çizim çağrısı yok) |
| **S1** | Düşük: zamanlanmış olay ya da toplu iş; olay başına O(1)–O(ilçe); günde ≤~10⁴ olay (tahmin) | **B1** | Hafif panel, sprite ya da instanced siluet (≤+3 çizim çağrısı) |
| **S2** | Orta: periyodik yayın/tarama (ör. dakikalık canlı sayım, sohbet yayını); abone sayısıyla büyür | **B2** | Animasyonlu sahne ya da kalabalık; [A1-2](../11-urun-donusu.md) ≤60 çizim çağrısı bütçesinden pay ister |
| **S3** | Yüksek: lojistik çözücüyü ya da küresel durumu etkiler; birey düzeyinde NPC simülasyonu. **Kaçınılır** | **B3** | Ağır 3D/gerçek zamanlı fizik. **Kaçınılır** |

Sayılar tahmindir; ölçülmemiştir. Her S2/B2 öğe için 100 bot ve gerçek cihaz testi şarttır (A0-4, A1-2).

**Tasarım kuralları (hepsi için).**

1. **Deterministik.** Takvim tabanlı etki, sürümlü bir *takvim paketi* dosyasından gelir; pakete ait değişiklik **günlüğe yazılan komuttur** (R-Ü4). PRNG olay akışları ayrıdır.
2. **Ön duyuru.** Her olay ≥24 sa önceden duyurulur (iklim olayı standardı, [08 T3](../08-alti-katman.md)); takvim olayları haftalar önce.
3. **Çevrimdışı güvenli.** Olaylar **gelir** ya da **zamanlama** değiştirebilir; **stok yağması** ve parsel kaybı yapamaz (H5). Takvim kaynaklı talep oynaması ±%15 ile sınırlıdır.
4. **Opsiyonel katılım.** Toplanma anlarına katılmak zorunlu değildir; yalnız kozmetik ve küçük zamanlama avantajı sunar (K13: günlük giriş ödülü yok, parayla güç yok).
5. **Hesaplı kimlik.** Gazete ve vitrin oyuncu adını yalnız oyuncu izin verirse anar (KVKK, R-Ü16).

### 8.1 Gerçek saat ve takvimle eşleşen ritimler

Dünya saati = gerçek saat (Europe/Istanbul; Türkiye kalıcı UTC+3 kullanır, Balkan ülkeleri UTC+2/+3 arasında; bu yüzden pencereler tek saat diliminde toplanır).

#### 8.1.1 Gün–gece ve günlük ritim

| Ritim | Mekanik (öneri) | Sunucu / Tarayıcı |
|---|---|---|
| **Gün–gece görseli** | İstemci güneş konumunu gerçek saat ve ilçe koordinatından hesaplar; pencereler akşam yanar, sokak lambaları | S0 / B1 |
| **NPC müşteri akışı eğrisi** | Perakende talebi gün içinde 08–20 arası yüksek, geceleyin düşük; eğri **günlük toplamı değiştirmez** (normalize) | S0 (formül) / B0 |
| **Gece vardiyası** | Üretim **etkilenmez** (çevrimdışı güvenliği); yalnız görsel (gece lamba) | S0 / B1 |

**Günlük ritim çizelgesi (öneri).**

| Saat | Olay |
|---|---|
| 06:00 | İlçe Bülteni yayımlanır (§8.4) |
| 07:00–17:00 | Semt pazarı günü ise tezgâhlar kurulu (§8.1.2) |
| 08:00–24:00 | Savaş yoğun saat bandı bu aralıktan seçilir (§5.4) |
| 18:00 | Fuar kapanış / son satış saati (fuar günlerinde) |
| 20:00–22:00 | **Akşam toplanma penceresi**: seçim gecesi, açık artırma, il savunma çağrısı (§8.5) |
| 00:00 | Gün sınırı: günlük tik (istikrar, göç), günlük özet |
| Pzt 00:00 | Haftalık: arazi vergisi tahakkuku, taşıma raporu |
| Paz 09:00 | İl Gazetesi |

#### 8.1.2 Hafta içi / hafta sonu ve semt pazarı günü

Türkiye'de semt pazarı bir **haftalık ritimdir**: belediyeler pazar yerlerini kurar ve kuruluş günü, diğer pazar yerlerinin günleri gözetilerek **belediye encümenince** belirlenir; birçok ilçede haftanın her günü farklı bir mahallede pazar kurulur [44]. Oyunda bu bir ilçe kartıdır.

| Konu | Kural (öneri) |
|---|---|
| **Pazar günü** | Her ilçenin haftada bir **pazar günü** vardır (kuruluşta tohumlu atanır). İlçe meclisi bu günü değiştirebilir (28 günde bir; **İ8 Pazar günü kartı**). Gerçekteki karşılığı: belediye encümeni |
| Etki | O gün 07:00–17:00 Ticaret ofisi perakende satışı ×1,25 (NPC müşteri akışı) ve ilçe meydanında tezgâh görseli |
| Hafta sonu | Tüketici talebi +%10, B2B (fabrika girdi) talebi −%10; **üretim etkilenmez** |
| Rekabet | Aynı ilçede aynı mal satan Ticaret ofisleri müşteriyi paylaşır; ucuz fiyat, ürün çeşitliliği ve fuar standı katılımı olan ofis daha çok müşteri çeker; **tabela, unvan ve başarım müşteri çekimini etkilemez** (Capital Rift'te de aynı tür yakın konum rekabeti vardır [22]) |
| Sunucu / tarayıcı | S0 (formül; sunucuda tik yok) / B1 (tezgâh instancing) |
| Risk → önlem | Pazar günü saatine kilitlenme (angarya) → oyuncunun orada olması gerekmez; satış otomatik. Gün seçimi manipülasyonu (sürekli değiştirme) → 28 gün kilidi |

#### 8.1.3 Türkiye resmî tatilleri ve bayramları

[2429 sayılı Kanun](https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2429.pdf) şu günleri tatil sayar: 1 Ocak, 23 Nisan, 1 Mayıs, 19 Mayıs, 15 Temmuz, 30 Ağustos; 29 Ekim ulusal bayramı 28 Ekim saat 13.00'ten itibaren başlar; Ramazan Bayramı arefe 13.00'ten itibaren 3,5 gün, Kurban Bayramı 4,5 gündür [45]. Dini bayram tarihleri her yıl değişir; örnek (Diyanet takvimine göre): 2027'de Ramazan Bayramı 9–11 Mart, Kurban Bayramı 16–19 Mayıs (arefe 15 Mayıs) [46].

**Takvim paketi** (`takvim-tr-YYYY.json`): resmî tatiller + dini bayramlar + yerel ayarlar. Sürümlüdür; yılda bir yüklenir; her yükleme günlüğe komut olarak yazılır. Dini bayram tarihleri Diyanet takvimi yayımlandığında sabitlenir (yıllar öncesinden yayımlanır).

| Gün / dönem | Oyun etkisi (öneri) | Hassasiyet | Sunucu / Tarayıcı |
|---|---|---|---|
| **Bayram alışverişi** (arefeden önceki 7 gün) | Gıda ve elektronik perakende talebi +%10–15; Ahır/Mera ürünlerinde (Kurban öncesi) yalnız **piyasa** talep tepesi +%20; stok hazırlığı kararı. 14 gün önceden ilan | Orta: **ritüel gösterilmez**; yalnız talep eğrisi modellenir. Dini içerik incelemesi gerekir | S1 (parametre) / B0 |
| **Bayram tatili** (3,5 / 4,5 gün) | NPC müşteri ve işgücü trafiği −%15 (üretim **değil** talep); Ofis satışı düşer, **kayıp yok**; **Bayramlaşma**: ilçe meydanında "Bayramlaşma" kozmetik/sosyal olayı, oyuncular birbirine tebrik kartı gönderir (ücretsiz, günde 5 kart) | Orta | S1 / B1 |
| **23 Nisan, 19 Mayıs, 29 Ekim, 30 Ağustos** | Meydan süslemesi (kozmetik), "Çocuk/Spor/Cumhuriyet şenliği" kısa ilçe etkinliği (İ6 fuar/şenlik kartı yarı maliyetli); **siyasi/tarihî içerik yok** | Düşük–orta | S1 / B1 |
| **1 Mayıs** | İşgücü grubu için "Emek ve Dayanışma" kutlaması; İşgücü memnuniyeti +; **siyasi mesaj yok** | Orta | S1 / B0 |
| **15 Temmuz** | Yalnız tatil ritmi (pazar yavaşlığı); içerik yok. **Sahibin kararı** (siyasi hassasiyet) | Yüksek | S0 / B0 |
| **1 Ocak** | Yılbaşı özeti: "Yılın Gazetesi" (yılın en iyileri, ilk'ler) | Düşük | S1 / B0 |
| **Arife yarım gün** | Pazar günü öğleden sonra kapanır (görsel) | Düşük | S0 / B0 |

**Balkan ülkeleri (Alfa-1 sonrası).** Her ülke için ayrı **takvim paketi**; ulusal gün içerikleri tarafsızlık ve ihtilaf politikası (K33) incelemesinden geçmeden eklenmez. İlk sürüm yalnız Türkiye paketidir.

**Neden bu kadar dikkat?** Bayramlar toplumsal ve dini hassasiyet taşır; gerçek takvim eşlemesi canlılık verir ama yanlış tonda bir bayram mekaniği marka riskidir. Öneri: **ekonomik ritim + sosyal kozmetik**, içerik yok; hassas günlerde sahip onayı.

#### 8.1.4 İklim takvimi ve olay kataloğu

İklim takvimi ([08 T2/T3](../08-alti-katman.md)) gerçek ay ve güne bağlıdır: 6 iklim tipi için 12 aylık hasat eğrisi; dört yayılan olay (kuraklık, don, sel, kış fırtınası) 24 saat önceden duyurulur. Öneri: aynı çerçeveyi diğer olaylara genişlet.

| Olay | Tür | Kapsam | Süre | Ön duyuru | Etki | Çevrimdışı koruması | Öncelik |
|---|---|---|---|---|---|---|---|
| Kuraklık, don, sel, kış fırtınası | İklim (mevcut) | Bölge + 2 kenar yayılım | 3–20 gün | 24 sa | Çıktı / kenar kapasitesi | Stok kaybı yok | **A0** |
| **Heyelan / yol kapanması** | İklim | İlçe, dağ geçidi kenarı | 2–5 gün | 24 sa | Kenar kapasitesi −%X | Gecikme, kayıp yok | A1 |
| **Orman yangını** | İklim | Mera/orman ilçesi | 2–4 gün | 12–24 sa | Mera çıktısı −%X; afet merkezi etkiyi azaltır | Üretim kaybı, stok yağması yok | A1 |
| **Hayvan hastalığı / bitki zararlısı** | Salgın | Ahır/Mera, il yayılımı | 7–14 gün | 24–48 sa | Ahır çıktısı −%X; il aşı kararı; hastane/sağlık merkezi etkiyi kısar | Çıktı etkisi, stok kaybı yok | A1 |
| **Grip dalgası** | Salgın | İlçe işgücü | 5–10 gün | 24 sa | İşgücü −%5; K3 hizmet açığı varsa artar | İstikrar ≥%60 iken üretim cezası uygulanmaz (**%60 eşiği korunur**) | S |
| **Grev** | Sosyal | Sanayi ilçesi | 1–2 gün | 24 sa | Sanayi çıktısı −%30; İşgücü memnuniyeti <25 ve istikrar <%60 iken olası (Anno'da da çalışma koşulları grev nedenidir [24]) | İstikrar ≥%60 ise grev **olmaz** | A1 |
| **Yeni damar keşfi** | Dünya | Başka ilçe | ~30 günde 1 | Haberci NPC söylentisi | Taşınma/yatırım kararı ([11 §7.11](../11-urun-donusu.md)) | Yok | A1 |
| **Fuar / şenlik** | Sosyal | İlçe | 2–3 gün | 72 sa | Satış +%10, memnuniyet + | Yok | A1 (A0'da 1 tür) |
| **Eşkıya baskını** | PvE | İlçe | 4 sa band | 6–12 sa | §5.3 | Ortak yağma tavanı ≤%25 | **A0** |
| **Seçim haftası** | Yönetişim | İlçe / il | 7 gün | 5 gün | §4.2 | Yok | A1 |
| **Açılış töreni** | Sosyal | İlçe | 1 gün | 24 sa | İlçe seviye atlama / proje bitişi kutlaması | Yok | A1 |
| **Deprem** | — | — | — | — | **Önerilmez** | — | — |

**Deprem olayı neden önerilmiyor?** Alfa-0'ın iki ili (Kocaeli ve Sakarya) 17 Ağustos 1999 Marmara depreminin en çok etkilenen illeri arasındadır (merkez üssü Kocaeli'nin Gölcük ilçesi; resmî can kaybı 17.480, yaklaşık 77 bin bina yıkıldı) [40]. Rastgele deprem olayı bu illerde oyuncuların gerçek hafızasına çarpar. Öneri: deprem **rastgele olay olarak yapılmaz**; ileride "afet hazırlığı" (tatbikat, yapı güvenliği bilgisi) olarak ele alınırsa lider ve sahip onayı gerekir.

**Örnek 12 aylık iklim takvimi (öneri, kalibre edilmedi).** Mevcut T3 olasılık eğrilerinden ve Türkiye takviminden derlenmiştir.

| Ay | İklim eğilimi (T2/T3) | Sosyal / piyasa takvimi | Yönetişim ritmi |
|---|---|---|---|
| Ocak | Kış fırtınası, buzlu liman, kapanan geçit | Yılbaşı özeti; kış hazırlığı sonrası depo tüketimi | Haftalık vergi, ilçe seçimi |
| Şubat | Kış fırtınası, sel | Karasal bölgelerde ekim planı | Vali seçimi (28 gün döngüsü) |
| Mart | Don, sel | Ramazan Bayramı (örn. 2027: 9–11 Mart) etkisi: alışveriş + tatil | İl bütçesi gözden geçirme |
| Nisan | Don, ekim; hasat eğrisi yükselişi | 23 Nisan şenliği; bahar fuarı | İlçe seçimi |
| Mayıs | Hasat eğrisi yükselişi | 1 Mayıs, 19 Mayıs; Kurban Bayramı (örn. 2027: 16–19 Mayıs) | Seçim haftası bir ilçede |
| Haziran | Kuraklık riski başlar | Hasat başlangıcı | — |
| Temmuz | Kuraklık tepe | 15 Temmuz (yalnız tatil ritmi) | İl yasalarında savaş/seferberlik değerlendirme |
| Ağustos | Kuraklık, orman yangını | 30 Ağustos kutlaması | — |
| Eylül | Sel riski başlar; hasat devri | Hasat şenliği | Seçim haftası |
| Ekim | Sel | 29 Ekim (28 Ekim 13.00'ten) | Vali seçimi |
| Kasım | Sel, kış fırtınası başlar | Kış hazırlığı fuarı | — |
| Aralık | Kış fırtınası, buzlu liman | Yılın özeti | İlçe/il bütçe kapanışı |

### 8.2 Oyuncu yokken ne olur, dönünce ne görür

Çevrimdışıyken dünya şunları **kendiliğinden** yapar: stoklar tembel formülle akar; inşaat biter; araştırma ilerler; satışlar NPC talebiyle gerçekleşir; olaylar çalışır; hazır savunma emirleri uygulanır; seçimler kapanır. Dönüşte oyuncunun **bir bakışta** anlaması gerekir.

**"Sen yokken" kartı** (girişte, ≤60 sn okunur):

| Bölüm | İçerik | Sınır |
|---|---|---|
| **Hemen karar isteyenler** | Kapanmak üzere oy, yaklaşan baskın, kayyum uyarısı, süresi dolan inşaat sıra boşluğu, açık artırma uyarısı | ≤3 madde (aciliyet sırasıyla) |
| **Sonuçlar** | Üretim ve satış toplamı, yağma/onarım (varsa), proje ilerlemesi, seçim sonucu, savaş sonucu | Toplam + 3 en büyük değişim |
| **Haberler** | İlçe Bülteni'nden 3 başlık | Metin |

**Gelen kutusu.** Kategoriler: Acil (savaş, baskın, kayyum), Ekonomi, Yönetişim (oylar, yasalar), Sosyal (tebrik, forum). 30 gün saklanır. Okundu işareti. Oyuncu kategori başına bildirim açıp kapatır.

**Kurallar.** (1) **Dönüş ödülü yoktur** (günlük giriş ödülü yasağı, K13); "hoş geldin"in içeriği bilgidir. (2) 14 gün sonra uyku moduna geçen hesap uyandığında "uyku sonrası" ekranı **dünyayı yeniden öğretir** (3 kart: ne değişti, neleri kaçırdın, ilk 3 öneri). (3) 45+ gün çürüme ve 90 günde açık artırma uyarıları oyuncuya **önceden** yazılır (hareketsizlik merdiveni, [11 §7.8](../11-urun-donusu.md)). (4) Push ve e-posta bildirimi **sonra**; yalnız açık izinle (KVKK).

**Maliyet.**

| Öğe | Nasıl | Sunucu | Tarayıcı |
|---|---|---|---|
| Özet kaydı | Bir olay sahibi etkilediğinde sahibe halka tamponunda (≤200 kayıt) bir **özet kaydı** eklenir. Kayıt ≈ 100 B; 1k oyuncu için günde ≈ 20–60 kayıt/oyuncu → ≈ 6 MB/gün (tahmin, ölçülmedi) | S1 | — |
| Giriş özeti | Girişte oyuncunun kayıtlarından toplanır (tembel) | S1 (oyuncu başına O(kayıt)) | B0 |
| Gelen kutusu | Kategorili liste | S0 | B0 |

### 8.3 NPC yaşamı

Hedef: dünya "dolu" görünsün, ama **birey düzeyinde simülasyon yok** (S3 kaçınılır). NPC'ler **toplu** (agrega) ve görselde prosedürel; aynı saatte aynı kişiler çıkar (tohum).

| Öğe | Mekanik (öneri) | Sunucu | Tarayıcı |
|---|---|---|---|
| **Nüfus** | Başlangıç nüfusu WorldPop/GHS-POP'tan ([08 §6.5](../08-alti-katman.md)); büyüme ve göç D1–D3 | S0 (mevcut) | B0 (tabela sayacı) |
| **Göç** | İlçe tabelasında "bu hafta +120 / −40"; yürüyüşte yeni konutlara yerleşen siluet | S0 (D3 günlük tik) | B1 |
| **Esnaf NPC** | İlçe seviyesine göre NPC dükkânları (Köy 2, Kasaba 5, Merkez 10, Şehir 20; tahmin): oyuncu ürünü satın alır/satar mı? **Hayır**: görsel ve talep çıpası; işlemler "yerel talep" olarak toplu | S0 | B1 |
| **NPC müşteri** | Ticaret ofisine saat ve güne göre müşteri akışı (§8.1); fiyat, ürün çeşitliliği, fuar standı katılımı ve ilçedeki rekabet etkiler (unvan/tabela etkilemez). Kısa işlem tembel biçimde saatlik toplu işlenir | S1 (saatlik toplu) | B1 (siluet), B2 (fuar günü kalabalık) |
| **Gezgin tüccar** | Haftada bir (ilçeye göre tohumlu gün) meydana gelir; takas teklifi (nadir mal, ipucu); NPC rozeti; fiyatı piyasa referanslı | S1 | B1 |
| **NPC Muhtar** | Alfa-0 ilçe başkanıdır; ihtiyaç ilanı verir; Alfa-1'de makam boşsa kayyum NPC Kaymakam | S1 | B1 |
| **NPC Kaymakam** | Teftiş, afet koordinasyonu, kayyum | S1 | B1 |
| **Eşkıya Başı** | PvE baskınında çıkar; panoda ödül ilanı | S1 | B1 |
| **Haberci / gezgin** | Yeni damar ve fuar söylentileri; ipucu sistemi | S1 | B0 |
| **Rehber** (ilçe esnafı) | Yeni oyuncuya ilk 14 günde ipucu ve hedef gösterir (sınıf ya da seviye değildir; yalnız yönlendirme) | S0 | B1 |

**Kural:** NPC'ler her yerde **NPC rozetiyle** işaretlenir (Dünya Piyasa Yapıcısı ilkesi, [11 §7.10](../11-urun-donusu.md)). NPC piyasa derinliği, oyuncular likidite sağladıkça çekilir; NPC müşteri talebi ise nüfus tüketimidir ve çekilmez.

### 8.4 Dünyanın kendi ürettiği haberler (gazete)

| Yayın | Zaman | İçerik | Üretim |
|---|---|---|---|
| **İlçe Bülteni** | Her gün 06:00 | Dün: en yüksek satış, yeni yapılar, ilçede fiyat rekoru, tamamlanan inşaat, seçim/oy sonucu, fuar, baskın, hava ve yol durumu | Şablon + varyant seçimi, olay günlüğünden |
| **İl Gazetesi** | Pazar 09:00 | Haftanın manşeti: il yasaları, ortak proje ilerlemesi, savaş durumu, ilçeler arası karşılaştırma | Şablon |
| **Dünya Manşeti** | Giriş ekranı | Günün tek öne çıkan haberi | Seçim algoritması |
| **Yılın Gazetesi** | 1 Ocak | Yılın en iyileri, "ilk"ler | Şablon |
| **Arşiv** | — | Geçmiş sayılar 30 gün | Depolama |

Haberler **LLM ile üretilmez** (maliyet, determinizm, uydurma riski): ~8 şablon × ~6 varyant/tür; tohumla deterministik seçim. Kimin adı anılacağı oyuncu izniyle (varsayılan: kapalı; yalnız "bir Ticaret ofisi sahibi"). **Sunucu:** S1 (günlük toplu iş, bir okuma geçişi). **Tarayıcı:** B0 (metin; <10 KB). Gazete, "sen yokken" kartının kaynağıdır (aynı özet kayıtları).

### 8.5 Oyuncuları aynı yere ve zamana toplayan anlar

Alfa-0'da 200 oyuncu, ~40 ilçeye dağılır (ilçe başına ≈5): toplanma anları bu yüzden **ilçe değil il düzeyinde** (3 il) ya da **dünya takvimi** (herkes aynı saat) kurulmalıdır. Hepsi opsiyoneldir.

| An | Zaman | Mekanik (öneri) | Kötüye kullanım → önlem | Sunucu / Tarayıcı |
|---|---|---|---|---|
| **Seçim gecesi** | Oy kapanış günü 20:00–22:00 | Oylar kapanışta açılır; sonuç **sandık sandık** sunulur (10 paket, 10 dk arayla). Sonuç sunucuda belli, paketler zamanlı yayımlanır (**spoiler güvenli**). Meydanda aday sunum kartları, sohbet açık | Sonuç sızdırma → paketler sunucuda mühürlü; oy satın alma → transfer dondurma | S1–S2 (10 yayın) / B1 (çubuk grafik) |
| **Fuar / şenlik** | 2–3 gün; açılış 11:00, kapanış 18:00 | Fuar standı (hesap başına 1): vitrin ürünü seç; NPC müşteri akışı ×; "Fuarın En İyisi" oylaması (kozmetik ödül). Açılış töreni (muhtar konuşma kartı) | Çoklu stand → 1/hesap; oy havuzu → oy aktif hesaplara | S1 / B2 (fuar meydanı) |
| **Açık artırma akşamı** | Her gün 20:00, 3 saat | **90 gün uyku arsası** Hollanda usulüyle (11 §7.8): fiyat zamanın fonksiyonudur; "ilk tıklayan alır". İlk 10 dk yalnız yeni oyunculara (ayrılmış %20) | Bot/hız avcılığı → sunucu zaman damgası, hesap başına 1 alım/gece, hız sınırı; hileli eski sahip → alacak borç sonrası öder | S1 (durumsuz f(t) + tek işlem) / B0 (geri sayım) |
| **Savaş yoğun saati** | Savunanın seçtiği 4 saat | §5.4: izleyici bölgesi, tur sonuçları canlı, sohbet | İzleyici spam → sohbet hız sınırı | S2 (tur başı yayın) / B1 |
| **Proje / seviye açılışı** | Tamamlanma günü 18:00 | Plaket açılışı, ilçe seviye kutlaması, katkı defteri okunur | Yok | S1 / B1 |
| **Bayramlaşma** | Bayram günleri (§8.1.3) | Meydanda kozmetik tebrik, günde 5 kart | Spam → kart tavanı | S1 / B1 |
| **Haftalık Dünya Akşamı** (isteğe bağlı) | Cumartesi 20:00 | Haftanın gazetesi, açık artırma, seçim ve savaş özetleri | **Zorunlu değil**; yalnız kozmetik "tanıklık" ödülü | S1 / B0 |

### 8.6 Panolar, başarımlar, vitrin, sohbet, forum

| Öğe | Mekanik (öneri) |
|---|---|
| **İlçe Meydanı panosu** | Dört tür: (1) **Kamu ilanı** (NPC Muhtar: "ambara 100 buğday"), (2) **Sözleşme** (oyuncular arası sabit vadeli tedarik, P5), (3) **Ödül ilanı** (eşkıya), (4) **Ortak proje çağrısı**. İlan 3–7 gün; kaçırılan görev cezası yok; seri yok; günlük görev yok |
| **Başarım ve unvanlar** | Bunlar **karakter gücü değil, stratejik başarının görünür kimliğidir**; sınıf, seviye, XP ve karakter ilerlemesi **yoktur**; unvanlar **hiçbir oyun avantajı vermez** (vergi, oy ağırlığı, inşa süresi, müşteri çekimi, savaş gücü: hiçbiri). İki tür: (1) **"İlk" başarımlar**, tek seferlik (Karadeniz'i aşan ilk ihracat, ilk köprü katkısı, ilk eşkıya savuşturma); (2) **Durum unvanları**, dünyanın o anki hâlini yansıtır ve el değiştirir (**"İlçenin En Büyük İşvereni"**, **"Üç Dönem Muhtar"**, "Baraj Projesinin En Büyük Katkıcısı", "Kışı Kıtlıksız Atlatan İlçe", "Ablukayı Kıran Vali", "Hizmet Muhtarı" (vaatlerin ≥%80'i tutuldu), "Hayırsever"). Durum unvanı, koşul bozulunca geçer; tarihçe profilde kalır. Vitrinde 3 tane seçilir |
| **Vitrin ve tabela** | **Yapı tabelası** (24 ikon + 24 karakter, filtreli); **ilçe tabelası** (ilçe adı, gelişim seviyesi, muhtar, nüfus, açık projeler, hava/yol durumu); **profil vitrini** (3 unvan, favori ürün, ilçe, makam geçmişi). Tamamen kozmetik ve bilgilendirici: ekonomik etkisi yoktur |
| **Sohbet** | Kanallar: ilçe, il, ittifak, özel; hız sınırı; yeni hesap kısıtı; yardım komutu. Capital Rift de yerleşik sohbet, DM, arkadaş ve profil sunar [22] |
| **İlçe forumu** | Duyuru (muhtar), öneri/oylama, seçim, **meclis tutanağı** (oylamalar otomatik başlık), Katkı Defteri, açık defter özeti; moderasyon: bildir, gizle, hız sınırı |
| **Moderasyon ve KVKK** | Yalnız oyun içi ad; serbest metin filtresi; rapor kuyruğu; veri saklama kuralları açık alfa öncesi hukuki görüşe (K34) |

### 8.7 Canlı dünya öğeleri: öneri tablosu

| # | Öğe | Oyuncuya etkisi | Maliyet | Sunucu / Tarayıcı | Öncelik | Kötüye kullanım riski → önlem |
|---|---|---|---|---|---|---|
| C1 | **Gerçek saat ve takvim motoru** (gün-gece, hafta ritmi, pazar günü, takvim paketi) | Dünya "şimdi"yi hisseder; haftalık ritim | M | S0–S1 / B1 | **A0** | Takvim kayması → sürümlü paket + günlük komutu; angarya hissi → otomatik satış |
| C2 | **Türkiye bayram ve tatil paketi** (alışveriş, tatil, bayramlaşma, milli gün süsü) | Gerçek takvimle eşleşen talep dalgaları ve sosyal anlar | S–M | S1 / B0–B1 | A1 (A0'da yalnız görsel süs) | Dini/siyasi hassasiyet → ritim + kozmetik, içerik yok; sahip onayı (15 Temmuz); talep oynaması ±%15 |
| C3 | **İklim takvimi ve olay katmanı** (mevcut 4 + heyelan, yangın, hayvan hastalığı) | Aylık ritim; hazırlık kararı; ortak tehdit | M | S1 / B0–B1 | **A0** (mevcut 4) → A1 | Çevrimdışı kayıp → stok yağması yok, 24 sa ön duyuru |
| C4 | **"Sen yokken" kartı ve gelen kutusu** | Dönünce ne olduğunu 60 sn'de anlar; hemen karar isteyenler | M | S1 / B0 | **A0** | Dönüş ödülü beklentisi → yok; bildirim spam → kategori tercih |
| C5 | **NPC yaşamı** (esnaf, müşteri, göç, nüfus görseli) | Dünya dolu görünür; fiyat/vitrin rekabeti | M–L | S0–S1 / B1–B2 | **A0** (veri, panel) → A1 (siluet) | Birey simülasyonu → yok (agrega); müşteri talebi manipülasyonu → fiyat esnekliği tavanı |
| C6 | **NPC kadrosu** (gezgin tüccar, muhtar, kaymakam, eşkıya başı, haberci, rehber) | Meydanda karşılaşma; ipucu ve takas | M | S1 / B1 | **A0** (tüccar, muhtar, rehber) → A1 | Piyasayı bozma → NPC rozeti, fiyat piyasa referanslı, haftalık tek |
| C7 | **Dünya gazetesi** (İlçe Bülteni, İl Gazetesi, manşet) | Dünyanın kendi hikâyesi; oyuncu adı geçmesi (izinle) | M | S1 / B0 | **A0** (İlçe Bülteni) → A1 | Mahremiyet → ad anma izni kapalı varsayılan; tekrar → şablon×varyant |
| C8 | **Seçim gecesi** (sandık sandık sayım) | Aynı anda toplanma; heyecan | M | S1–S2 / B1 | A1 | Sızdırma → mühürlü paketler; oy satın alma → transfer dondurma |
| C9 | **Fuar ve şenlik** (stand, açılış, En İyisi) | Ortak etkinlik; satış fırsatı | M | S1 / B2 | A1 (A0'da bir fuar) | Stand çoğaltma → 1/hesap; kalabalık yükü → B2 bütçesi, ≤40 siluet |
| C10 | **Açık artırma akşamı** (Hollanda usulü uyku arsası) | Arsa fırsatı; yeni oyuncu penceresi | M | S1 / B0 | A1 | Bot avcılığı → sunucu zaman damgası, 1 alım/gece, yeni oyuncu 10 dk önceliği |
| C11 | **Salgın, grev ve toplumsal olaylar** | Hazırlık ve müdahale kararı; çıkar grubu tepkisi | M | S1 / B0 | A1 | Çevrimdışı ceza → istikrar ≥%60 ise grev yok; kayıp stok yok |
| C12 | **İlçe Meydanı panosu** (kamu ilanı, sözleşme, ödül, proje çağrısı) | Yeni görev türleri; ortak iş | M | S1–S2 / B0–B1 | **A0** (kamu ilanı + rehber hedefi) → A1 | Aklama (sahte sözleşme) → sözleşme tavanı; angarya → günlük görev yok |
| C13 | **Başarım ve unvanlar (stratejik kimlik), vitrin ve tabela** | Stratejik başarı görünür olur; avantaj yok | S | S0–S1 / B0–B1 | **A0** | Avantaj sızması (unvana bağlı bonus) → tasarımda yasak; unvan avcılığı → durum unvanı el değiştirir, "ilk" tek seferlik; saldırgan tabela → filtre ve bildir |
| C14 | **Sohbet ve ilçe forumu** (+ meclis tutanağı) | Sosyal bağ, seçim kampanyası alanı | M | S2 / B0–B1 | **A0** (sohbet) → A1 (forum) | Spam/taciz → hız sınırı, yeni hesap kısıtı, moderasyon; mahremiyet → KVKK |

---

## 9. İlk 30 gün oyuncu yolculuğu (H2 tekrar hipotezine hizmet)

**Hedef ([11 §8.1](../11-urun-donusu.md) H2).** 30. günde oyuncu başına karar tekrarı ≤%60 **ve** 45. güne kadar her hafta en az 1 **yeni karar türü**. Önerilen yolculuk, ilk 14 günde ≥2/hafta ve sonrasında ≥1/hafta yeni tür açar. **Seviye, XP, sınıf ya da karakter ilerlemesi yoktur**: ilerleme, sahip olunan yapı, ilçe gelişim seviyesi, makam ve ağdaki konumdur (strateji oyunu, MMORPG değil).

Dünya gerçek zamanlıdır: inşaat 2–12 saat sürer; günde bir-iki kısa ziyaret yeter (11 §7.1). "Sabah" = Bülten, "akşam" = toplanma penceresi (§8.1.1).

**Karar türü kataloğu (yolculukta açılanlar).** K1 yapı yerleştirme · K2 satış fiyatı/emir · K3 ekim planı · K4 gübre dozu · K5 depo/ambar kararı · K6 meydan panosu/sözleşme · K7 ilk araştırma + yol seçimi · K8 ölçek yükseltme · K9 ilçe oyu · K10 savunma yapısı (PvE) · K11 olay hazırlığı (ön duyuruya göre stok) · K12 dışlayan dal seçimi · K13 ihracat ve liman kararı · K14 ortak proje katkısı · K15 aday olma/vaat · K16 Ordugâh ve birlik karışımı · K17 fuar standı · K18 ittifak katılımı · K19 damar sondajı/ikinci ilçeye yatırım · K20 savaş emri/abluka kırma desteği · K21 açık artırmada arsa · K22 vali seçimi oyu/il kartı yorumu.

| Gün | Yeni karar türü | Katman | Ne açılır ya da tetiklenir | Alfa-0'da karşılığı |
|---|---|---|---|---|
| **0 (ilk 10 dk)** | K1 | Tarım | İlçe seç (3 öneri) → hücre/ada al (hibe karşılar) → Tarla kur (hızlandırılmış ~24 dk) | Aynı |
| **1** | K2 | Pazar | İlk hasat satışı; fiyat/emir kararı; ilk **Sen yokken** kartı; **Rehber** hedefi | Aynı |
| **2** | K3 | Tarım | Ekim karışımı (buğday/baklagil/nadas); iklim eğrisi okuma | Aynı |
| **3** | K4, K5 | Tarım, Lojistik | Gübre dozu; ilk **Ambar** ve depo doluluk uyarısı (Lojistik görünür kısmı) | Aynı |
| **4** | K6 | Canlı dünya | **İlçe Meydanı panosu**: ilk kamu ilanı (NPC Muhtar: "100 buğday ambara") ve ilk sözleşme | Aynı (kamu ilanı) |
| **5** | K7 | Teknoloji | Atölye-Lab kur; ilk düğüm (`mekanize_tarim`); **yol seçimi**: Tarımcı / Sanayici / Tüccar (5–7 hedef) | Aynı |
| **6–7** | K8, K9 | Sanayi, Devlet | Ölçek yükseltme (S→M kilitliyse ilçe seviyesi göster); **ilk ilçe oyu** (arazi vergisi bandı ya da imar payı); haftanın İlçe Bülteni | Oy yok: kartları salt okunur oku, "seni nasıl etkiler?" cümlesi |
| **8** | K11 | Canlı dünya | İlk **iklim ön duyurusu** (24 sa): stok hazırlığı kararı | Aynı |
| **9–10** | K10 | Askeri | İlçe için **eşkıya baskını** ön duyurusu: Karakol/Gözetleme Kulesi kararı; ilk ilçe seviye atlaması (Köy→Kasaba) olası (10–20. gün) | Aynı (PvE Alfa-0) |
| **11** | K17 | Canlı dünya | İlçede **fuar**: stand açma kararı | A0'da 1 fuar türü |
| **12** | K12, K13 | Teknoloji, Pazar | **Dışlayan dal seçimi** (hassas ⊕ organik ya da temiz ⊕ termik); ilk ihracat ve liman primi/harcı | Teknoloji 6 düğüm; dışlayan çift yok → K12 Alfa-1'e |
| **14** | K15 | Devlet | Yeni oyuncu kalkanı biter (yumuşatma 15–28); ilk **seçim haftası**: aday olma/vaat kartı ya da oy | NPC seçim; "ilçe ortak hedefi" (NPC) |
| **15–16** | K16 | Askeri | **Ordugâh** kur; ilk birlik partisi (mühimmat + gıda); karışım kararı | Aynı (Ek karar) |
| **17** | K14 | Devlet | **Ortak proje**: ilk katkı (köprü/baraj/hastane); plaket | A0'da yalnız Muhtarlık yer tutucu |
| **18** | K21 | Pazar | **Açık artırma akşamı** (uyku arsası): izleme, belki alım | Yok (Alfa-1) |
| **20** | K11 | İklim | Ay değişimi: yeni hasat eğrisi ve olay olasılıkları; kış/yaz hazırlığı | Aynı |
| **21** | K18 | Askeri | **İttifaka katıl** (7 gün bekleme); ilk ortak sefer çağrısı gözlemi | Yok (Alfa-1) |
| **22–24** | K20 | Askeri | İl savaşı **yoğun saati** izleme/katılma; abluka kırma desteği; hazır savunma emri | Yok (Alfa-1) |
| **25** | K19 | Sanayi | Damar **tükenme** eşiği; sondaj ya da **ikinci ilçeye yatırım** (yeni damar söylentisi, Haberci NPC) — 20–25. gün sorunu kaldıracı | Aynı |
| **28** | K22 | Devlet | **Vali seçimi**: il meclisi ilçe koltukları; il yasaları ve liman harcının sonuçlarını izleme | NPC vali; yasalar varsayılan |
| **30** | — | — | Değerlendirme: ağaçta ~%40–60; ilçe seviyesi; ilk "durum unvanı"; 30. gün **tekrar endeksi** ölçümü | Aynı |

**Haftalık yeni karar türü sayımı (öneri).** Hafta 1: K2–K9 (≈8) · Hafta 2: K10–K13, K15 (≈4–5) · Hafta 3: K14, K16, K18, K21 (≈4) · Hafta 4: K19, K20, K22 (≈3). Her hafta ≥1 hedefi geçilir; **tehlike**: Hafta 1'de 8 yeni tür bilişsel yük olabilir; Alfa-0 gözlemiyle sıklık seyreltilir (H4 insan testi). **Kritik bağımlılık:** K9/K15/K22/K18/K20/K21 Alfa-1'e bağlı; Alfa-0'da bunların yerine NPC karşılıkları ve PvE konur, yoksa hafta 3–4'te yeni tür sayısı 1–2'ye düşer.

**Ölçüm.** Her komut `karar_turu` etiketiyle günlüğe yazılır (K1…K22). Bot arketipleri: çiftçi, sanayici, tüccar, yönetici, akıncı, kur-unut, geç katılan ([11 §8.2](../11-urun-donusu.md)); "yeni tür/hafta" ve "tekrar endeksi" bot raporuna eklenir.

---

## 10. Yeni oyuncu ile ilerlemiş oyuncu dengesi

Kalıcı, gerçek zamanlı dünyada en büyük risk **kıdem uçurumu**dur: eRepublik'te güç farkı yeni gelenlere oyunu kapattı [47]; Upland'de köşe tutma ve istifçilik oyunu kuruttu (11 R-Ü7). Denge dört kolla kurulur: (1) başlangıç desteği, (2) koruma, (3) yetişme, (4) ilerlemişe **azalan getiri**. Bu oyunda seviye ya da XP yoktur; kıdem **sermayedir** (arsa, yapı, makam). Dolayısıyla denge sermayenin ekonomik tavanlarıyla kurulur.

| Kol | Mekanizma | Değer | Kaynak | Not / öneri |
|---|---|---|---|---|
| **Destek** | Başlangıç hibesi | ₺50.000 | [11 §7.9](../11-urun-donusu.md) | **Öneri:** hibenin %60'ı "başlangıç kredisi" (yalnız arsa/inşa/araştırmada harcanır), %40 serbest. Gerekçe: hibeyi alt hesaplardan ana hesaba taşımayı engellemek (R-Ü11). **Açık soru, lider kararı (§13)** |
| | Bedava yurt | Doluluğu düşük ilçede 6 hücre | 11 §7.9 | — |
| | İnşa indirimi | İlk 5 yapıda %30 | 11 §7.9 | — |
| | Ayrılmış hücre | Her ilçede %20 (14 günden genç / medyan servetin ¼'ünden az) | 11 §7.9 | Açık artırmada yeni oyunculara ilk 10 dk (§8.5) |
| | **Rehber NPC** | İlk 14 gün ipucu ve hedefler | Bu rapor | Seviye değil; yalnız yönlendirme |
| **Koruma** | Kalkan | 14 gün; kalkanlı hesap hedeflenemez ve seferde katkı veremez | 11 §7.7; Travian [18] | **Yumuşatma** 15–28. gün yağma %50 (öneri) |
| | Güç farkı | Servet oranı 1:5 | 11 §7.7 | — |
| | Hareketsiz hedef | Ödülsüz | 11 §7.8 | — |
| **Yetişme** | Teknoloji yayılımı | Geç gelen, bilinen düğümleri `(1 − p × 500 000 / PPM)` ile ucuz araştırır | [08 TK3](../08-alti-katman.md) | **Lisans bedelsiz** (§6.2) |
| | İlçe gelişim seviyesi | İlçedeki **herkes** için M/L ölçek ve yeni yapı türlerini açar | 11 §7.4 | Yeni gelen, ilçenin önceki emeğinden yararlanır |
| | Yeni ilçe açılışı | %70 doluluk eşiğinden sonra kademeli ilçe açılışı | 11 §6 | Yeni ilçe, herkes için sıfırdan başlama alanıdır |
| | Oy hakkı | Aktif sahip = 1 oy (ilk arsadan itibaren) | 11 §7.6 | Aday olma: ≥14 gün + 3 hücre (§4.2) |
| **Azalan getiri (ilerlemişe)** | Arsa fiyat çarpanı | × (1 + 2 · satılmış pay) | 11 §7.2 | İlçe doldukça pahalı |
| | Elde tutma sınırı | ≤72 hücre ve ilçenin ≤%25'i | 11 §7.2 | H8 |
| | Arazi vergisi | Haftalık %1 (%0,5–3 meclis); artan bakım (Rust tipi) | 11 §7.2 | Yeniden satış ≤10 haftalık arazi geliri |
| | Uzmanlaşma | Bir katmanın ustalık yolu, diğer yollar için ×1,5 pahalı | 11 §7.6 (Eco) | Alfa-0'da kapalı (Ü8) |
| | İşgücü doygunluğu | İlçedeki işgücü havuzu tükendikçe ücret ve işçi gideri artar | 11 §7.9 / oyun tasarımı §5 | Doğal azalan getiri |
| | Büyük ittifak tavanı | Azalan katkı: ilk 20 hesap tam, 21–40 ×0,7, 41+ ×0,4 | §5.5 | Kalabalık güç sürekli artmaz |
| | Ölçek L brownout riski | L ölçek elektrik ister | 08 S2 | — |
| | Patent | Erişimi kapatmaz, lisans ≤%25, süre 14–28 gün | §6.2 | Tekeli önler |
| **Sosyal denge** | Durum unvanı | "Yeni gelenleri ağırlayan ilçe" gibi **ilçe düzeyli** unvan (avantajsız) | §8.6 | İyi ev sahipliğini görünür kılar |

**Neden ek "seviye" yok?** Sahip direktifi: strateji oyunu, MMORPG değil. Kıdemin avantajı sermaye ve konumdan gelir; kıdem puanı eklemek yeni gelene çıtayı yükseltir.

**Ölçüm.** H6 (60. günde katılan, 14 günde ilçe medyan servetine koşuların ≥%50'sinde ulaşır; hücrelerin ≥%20'si ≤2× taban fiyatla alınabilir) ve H8 (Gini ≤0,6; yeniden satış ≤10 hafta) mevcut. **Öneri ek metrikler:** (a) "kıdem eğrisi": oyuncu başına günlük net gelirin oynama gününe göre eğrisi; hedef: en iyi %10'un geliri, 30. gün medyanının ≤6×'ı (tahmin, ölçümle belirlenir); (b) "yeni oyuncu tutunma": 14 gün sonra hâlâ aktif olanların oranı (Alfa-0 kohortu, hipotez olarak sunulur, A1-7); (c) "hibe sızıntısı": yeni hesaptan eski hesaba transfer sayısı.

---

## 11. Öncelik paketleri ve toplam maliyet

Sayımlar, tablolardaki **ilk** faz ve üst maliyet sınırına göre otomatik çıkarılmıştır (S–M → M, M–L → L; "A0 → A1" gibi çok fazlı öğeler ilk faza yazılır).

| Katman | Öğe sayısı | Alfa-0 | Alfa-1 | Sonra |
|---|---:|---:|---:|---:|
| Devlet | 11 | 1 | 8 | 2 |
| Askeri | 12 | 4 | 7 | 1 |
| Teknoloji | 11 | 2 | 3 | 6 |
| Lojistik | 10 | 6 | 2 | 2 |
| Canlı dünya | 14 | 9 | 5 | 0 |
| **Toplam** | **58** | **22** | **25** | **11** |

| Maliyet | Alfa-0 | Alfa-1 | Sonra |
|---|---:|---:|---:|
| S | 6 | 3 | 0 |
| M | 15 | 18 | 8 |
| L | 1 | 4 | 3 |

**Alfa-0 paketi (öneri).** Mevcut parçaları görünür kılan ve canlandıran, çekirdeği az değiştiren öğeler: D1 (salt okunur makamlar), A1/A2/A3/A12 (Topçu, Karakol + Gözetleme, eşkıya baskını, kalkan), T1/T2 (dal etiketi, ilk görseller), L1–L6 (garaj, yol durumu, rapor, 2 olay), C1, C3 (mevcut 4 olay), C4, C5, C6, C7, C12, C13, C14 (sohbet). **Alfa-1 paketi:** seçimler (D2–D9), il kontrol savaşı (A5–A8, A10–A11), ortak projeler (D6), fuar/seçim gecesi/açık artırma (C8–C10), bayram paketi (C2). **Sonra:** çıkar grubu eylemleri, paralı asker, patent/lisans, ortak araştırma, kardeş il, nakliye sözleşmeleri.

---

## 12. Çapraz kötüye kullanım ve ölçüm bağları

| Tehdit | Etkilediği katman | Önlem (özet) |
|---|---|---|
| **Çoklu hesap / bot** (R-Ü11) | Seçim, hibe, kalkan, ittifak | Aktiflik koşulu, hesap yaşı, hibe harcama kısıtı, transfer tavanları, kalkanlı hesap seferde katkı veremez, aygıt/IP politikası; "teknik çözümü yoktur" (R-Ü11) |
| **Aklama / sahte işlem** | Ortak proje, sözleşme, lisans, paralı | Günlük tavanlar, emanet, yeni hesap tavanı |
| **Plütokrasi** | Ortak proje, seçim | Katkı oy ağırlığı vermez; kampanya parayla yürümez |
| **Büyük ittifak / zorbalık** | Askeri | §5.7 paketi |
| **Çevrimdışı mağduriyet** | Askeri, olaylar | Ortak ≤%25 yağma tavanı, ön duyuru, hazır emir, grev yok (%60 eşiği) |
| **Angarya** | Canlı dünya, Lojistik | Günlük görev yok, toplanma opsiyonel, lojistik otomatik |
| **Hassasiyet** | Bayram, deprem, siyasi günler | Ritim + kozmetik, içerik yok; deprem rastgele olay olmaz; sahip onayı |
| **Avantaj sızması** | Unvan, vitrin | Tasarımda yasak: unvan hiçbir oyun avantajı vermez |

**Hipotez bağları.**

| Hipotez | Bu rapordan ilgili öğeler | Ölçüm |
|---|---|---|
| **H1** | Dışlayan dallar (3 çift), ilçe kartları | Dal ve kart kazanma dağılımı ≤%70 |
| **H2** | Yolculuk (§9), her hafta yeni tür, dallar, olaylar | Tekrar endeksi ≤%60; yeni tür/hafta ≥1 |
| **H3** | Topçu/İkmal, eşkıya talebi | Yuvaların %20'si ordugâha kayınca fiyat/arz ≥%10 |
| **H4** | Kart "seni nasıl etkiler" cümlesi, Dikkat paneli, "Sen yokken" | 5 kişiden ≥4'ü 60 sn'de cevaplar |
| **H5** | Abluka/yağma tavanları, PvE, olay koruması | Pencere başına ≤%25, parsel 0, `degerKaybi24s` ≤%30 |
| **H6** | Hibe, kalkan, yetişme, lisans bedelsiz | Geç katılan 14 günde medyan servete ≥%50 |
| **H7** | Çevrimdışı güvenlik, gelen kutusu | 24/48/72 sa üretim oranı [%50,%85] |
| **H8** | Sit alanı sınırı, vergiler | Arazi Gini ≤0,6 |
| **H9** | Seçim gecesi, açık artırma, panolar | Oy katılımı ≥%30; emirlerin ≥%80'i 1 saatte dolar |

**Yeni bot arketipleri (öneri).** `muhtar_adayi` (vaat kartı seçer ve karnesi tutar), `savunmaci` (Karakol + Sur kurar), `komutan_ittifak` (ortak sefer), `fuarci` (stand açar), `lisansci` (T10 geldiğinde). Mevcut: çiftçi, sanayici, tüccar, spekülatör, yönetici, akıncı, pasif, geç katılan.

---

## 13. Lider/sahip kararı gereken açık noktalar

| # | Konu | Önerilen varsayılan | Karar |
|---|---|---|---|
| Ü-yeni-1 | **Vali seçmen tabanı** ([11 §7.6](../11-urun-donusu.md) belirtmiyor) | İl meclisi (ilçe koltuklu, 2–5); aday: görevdeki ilçe başkanları | Lider |
| Ü-yeni-2 | **11 §6 tablosu ile Ek karar çelişkisi**: Ordugâh Alfa-1'de mi Alfa-0'da mı? | Ek karar geçerli: Ordugâh + PvE Alfa-0; 11 §6/§7.3 güncellensin | Lider |
| Ü-yeni-3 | **Yapı sayısı:** Karakol, Sur/Barikat, Gözetleme Kulesi, Hava savunma mevzii, Afet merkezi, Fuar alanı yeni yapı türü mü, "yapı seçeneği" mi? | Savunma yapıları 19–22. türler; ya da Ordugâh'ın alt yapıları | Lider |
| Ü-yeni-4 | **Vali ve Kaymakam adlandırması**: gerçekte atanmış; oyunda Vali seçilir, Kaymakam NPC | UI'da "Vali" ve "NPC Kaymakam" rozeti; Yardım ekranı | Sahip |
| Ü-yeni-5 | **Hibe harcama kısıtı** (%60 kredi / %40 serbest) | Öneri | Lider |
| Ü-yeni-6 | **Hava savunma ölü uç riski**: hava birliği yok | Yapı olarak; hava birliği "sonra" | Lider |
| Ü-yeni-7 | **Dini bayram ve milli gün içeriği** (hassasiyet, 15 Temmuz) | Ritim + kozmetik; içerik yok; 15 Temmuz yalnız tatil | Sahip |
| Ü-yeni-8 | **Rastgele deprem olayı** | Önerilmez; afet hazırlığı olarak ele alınabilir | Sahip |
| Ü-yeni-9 | **Savaş hazırlık alt sınırı** (11: 12–24 sa; öneri ≥20 sa) | ≥20 sa | Lider + ölçüm |
| Ü-yeni-10 | **Gazetede oyuncu adı** (KVKK) | Varsayılan kapalı, izinle | Sahip + hukuki görüş (K34) |
| Ü-yeni-11 | **Teknoloji ağacı 17 → 26 düğüm** ve "30. günde %60 açık" hedefi | Dal başına uzmanlık; hedef yeniden tanımlanır | Lider |
| Ü-yeni-12 | **Balkan takvim paketleri ve ulusal gün içeriği** | Türkiye paketi ilk; Balkanlar incelemeden sonra | Lider (K33) |

---

## 14. Kaynaklar

Erişim tarihi: 1 Ekim 2026. **(403)** = sayfa doğrudan okunamadı, bilgi arama özetinden alındı. **(tek kaynak)** = başka doğrulama bulunamadı.

**Oyunlar**

1. Eco, Government (wiki): <https://wiki.play.eco/en/Government> **(403)**; ayrıca <https://supercraft.host/wiki/eco/government_guide/> ve Steam, "Developer Blog: Elections and Elected Titles in Update 9.0": <https://eco-servers.org/blog/56/developer-blog-elections-and-elected-titles-in-update-90/>
2. Eco, Laws (wiki): <https://wiki.play.eco/en/Laws>
3. Eco, Meteor (wiki): <https://wiki.play.eco/en/Meteor> ve Eco 5.5 güncellemesi (hazine vergileri): <https://www.kickstarter.com/projects/1037798999/eco-global-survival-game/posts/1840130>
4. EVE University, Sovereignty: <https://wiki.eveuniversity.org/Sovereignty>
5. EVE University, Vulnerability: <https://wiki.eveuniversity.org/Vulnerability>
6. EVE Online, "Changes to War Mechanics": <https://www.eveonline.com/news/view/changes-to-war-mechanics>
7. EVE Support, "Mutual War": <https://support.eveonline.com/hc/en-us/articles/360005659379-Mutual-War>; Brave Collective, War Declarations: <https://wiki.bravecollective.com/public/dojo/wardec>
8. Albion Online Wiki, Open-World Territory Battles: <https://wiki.albiononline.com/wiki/Open-World_Territory_Battles> **(403)**; ayrıca <https://wiki.albiononline.com/wiki/Territory> ve Albion forumu, "Open-World Territory Battles": <https://forum.albiononline.com/index.php/Thread/122485-Open-World-Territory-Battles/> **(403)**
9. Albion Online Wiki, Guild: <https://wiki.albiononline.com/wiki/Guild> (lonca ≤300 üye; 7/3 gün bekleme; arama özeti)
10. Albion Online, ittifak boyutu sınırlama denemesi: <https://www.mmorpg.com/news/albion-online-announces-test-to-limit-alliance-size-2000102929> ve <https://massivelyop.com/2020/02/18/albion-online-has-already-nixed-plan-to-cap-alliances-hopes-to-balance-with-penalties-instead/>
11. NME, "'Foxhole' logistics union ends 49-day strike after demands met": <https://www.nme.com/news/gaming-news/foxhole-logistics-union-ends-49-day-strike-after-demands-met-3173270>
12. Game Doggy, "Foxhole: How to Organize Your Regiment's Logistics": <https://www.gamedoggy.com/game-guides/foxhole/foxhole-how-to-organize-your-regiments-logistics>; savaş uzunluğu: <https://foxhole.fandom.com/wiki/War_83>
13. Victoria 3 Wiki, Government: <https://vic3.paradoxwikis.com/Government>; ayrıca Dev Diary #80: <https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-80-law-enactment-and-revolution-clock-in-13>
14. Crusader Kings 3 Wiki, Authority laws: <https://ck3.paradoxwikis.com/Authority_laws>
15. Tropico 6, Politics and constitution: <https://www.gamepressure.com/tropico-6/politics-and-constitution/z8c0a4>
16. Rust, çevrimdışı baskın koruması ve baskın saatleri: <https://guildorder.com/games/rust/guides/base-defense-and-offline-raid>, <https://www.heliosrce.com/rust-console-offline-raid-protection-bot/>, <https://codefling.com/plugins/raid-protection>; bakım kademeleri: <https://www.corrosionhour.com/rust-upkeep-building-guide/>
17. Last Oasis, çevrimdışı baskın ve 24 saat yeniden alma: <https://steamcommunity.com/app/903950/discussions/0/2143091644395628681/> (topluluk tartışması) ve <https://massivelyop.com/2020/03/23/the-survivalist-last-oasis-virtual-dev-tour-highlights-nomadic-life-and-offline-safety/>
18. Travian, yeni oyuncu koruması: <https://unofficialtravian.com/2025/10/beginners-protection/> ve <https://support.travian.com/en/support/solutions/articles/7000060689-beginner-s-protection> (404; arama özeti)
19. Travian, Alliance Bonuses: <https://support.travian.com/en/articles/88-alliance-bonuses>
20. Travian, ittifak: <https://support.travian.com/en/support/solutions/articles/7000060571-alliance-confed-nap>; Kingdoms: <https://support.kingdoms.com/en/articles/29-kingdom> (üye tavanları arama özetinden)
21. Rise of Kingdoms, birlik üçgeni: <https://riseofkingdoms.fandom.com/wiki/Troop_Counters>; barış kalkanı ve ittifak: <https://www.bluestacks.com/blog/game-guides/rise-of-kingdoms/rok-ultimate-alliance-guide-en.html>
22. Capital Rift (geliştirici açıklaması): <https://www.tiktok.com/@niksgames/video/7666487170605026591> **(tek kaynak; doğrulanmadı)**; yönetişim/savaş yönü bulunamadı
23. RimWorld Wiki, Raid points: <https://rimworldwiki.com/wiki/Raid_points>
24. Anno 1800, City incidents: <https://anno1800.fandom.com/wiki/City_incidents>; Anno Union: <https://www.anno-union.com/beware-incidents-are-coming/>
41. Hearts of Iron 4 Wiki, Unit: <https://hoi4.paradoxwikis.com/Unit>
42. Rival Regions, Wars: <https://wiki.rivalregions.com/Wars> **(403; [11 §7.7](../11-urun-donusu.md)'den alıntı)**
43. Conflict Nations, Beginner Intro: <https://wiki.conflictnations.com/Beginner_Intro> ([oyun tasarımı §1](oyun-tasarimi-parsel.md)'den)
47. eRepublik özeti: <https://grokipedia.com/page/ERepublik> ([oyun tasarımı §1](oyun-tasarimi-parsel.md)'den)

**Türkiye idari yapısı ve takvim**

25. 5393 sayılı Belediye Kanunu: <https://www.mevzuat.gov.tr/mevzuatmetin/1.5.5393.pdf>
26. 31 Mart 2024 Mahalli İdareler Seçimleri (YSK): <https://www.ysk.gov.tr/doc/dosyalar/docs/31%20MART%202024%20MAHALL%C4%B0%20%C4%B0DARELER%20B%C3%9CLTEN%C4%B0.pdf>; muhtar sayısı: <https://www.cnnturk.com/turkiye/muhtarlik-secim-sonuclari-nereden-nasil-ogrenilir-muhtarlik-secim-sonuclari-2024-ysk-2102418>
27. 5393 (belediye başkanı, meclis, encümen): <https://www.lexpera.com.tr/mevzuat/kanunlar/belediye-kanunu-5393>
28. 5442 sayılı İl İdaresi Kanunu: <https://www.mevzuat.gov.tr/mevzuatmetin/1.3.5442.pdf>
29. Kaymakamın görevleri: <https://www.bozdogan.gov.tr/kaymakamin-gorev-ve-yetkileri>; atama: <https://www.aa.com.tr/tr/gundem/mulki-idare-amirleri-atama-kararnamesi-resmi-gazetede/3263418>
30. İl özel idaresi (5302): <https://tr.wikipedia.org/wiki/%C4%B0l_%C3%B6zel_idaresi>; <https://www.icisleri.gov.tr/illeridaresi/ozel-idare1>
31. 2972 sayılı Kanun (seçim sistemi, il genel meclisi üye sayıları): <https://www.icisleri.gov.tr/kurumlar/icisleri.gov.tr/IcSite/illeridaresi/Secim_Mevzuati/43-2972-Sayili-Mahalli-Idareler-Ile-Mahalle-Muhtarliklari-ve-Ihtiyar-Heyetleri-Secimi-Hakkinda-Kanun.pdf>; belediye meclisi rehberi: <https://webdosya.csb.gov.tr/db/yerelyonetimler/dokumanlar/belediye-meclisi--8230-86591-20240403140015.pdf>
32. 6360 sayılı Kanun: <https://www.resmigazete.gov.tr/eskiler/2012/12/20121206-1.htm>; değerlendirme: <https://dergipark.org.tr/en/download/article-file/297175>
33. 6964 sayılı Ziraat Odaları Kanunu: <https://www.mevzuat.gov.tr/MevzuatMetin/1.3.6964.pdf>; il koordinasyon kurulları: <https://www.tarimkutuphanesi.com/turkiye_ziraat_odalari_birligi_(tzob)_ve_ziraat_odalari_00283.html>
34. TOBB: <https://www.tobb.org.tr/Sayfalar/AmaciveYapisi.php>; esnaf odası kuruluşu: <https://www.tesk.org.tr/resimler/odasozlesme.pdf>
35. 4562 sayılı OSB Kanunu: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.4562.pdf>
36. 2863 sayılı Kültür ve Tabiat Varlıklarını Koruma Kanunu: <https://www.mevzuat.gov.tr/mevzuatmetin/1.5.2863.pdf>
37. Kardeş şehir: <https://www.mahalliidarelerdernegi.org.tr/post/belediyelerce-yabanc%C4%B1-%C3%BClke-yerel-y%C3%B6netimler-i-le-karde%C5%9F-%C5%9Fehir-i-li%C5%9Fkisi-kurulmas%C4%B1>; 715 ilişki: <https://on5yirmi5.com/dogal-yasam/belediyelerin-715-kardes-sehri-var/>
38. İl/ilçe/mahalle/köy sayıları (haber/derleme siteleri; yaklaşık): <https://www.hurriyet.com.tr/egitim/turkiyede-kac-ilce-var-turkiyedeki-ilcelerin-sayisi-41872074>, <https://www.nufusune.com/ilceler>
39. 30 büyükşehir listesi: <https://www.haberturk.com/turkiye-de-hangi-iller-buyuksehir-turkiye-deki-30-buyuksehir-listesi-turkiye-nin-buyuksehir-belediyeleri-2635167>
40. 17 Ağustos 1999 depremi: <https://www.aa.com.tr/tr/gundem/17-agustos-marmara-depreminin-uzerinden-26-yil-gecti/3661126>; <https://www.britannica.com/event/Izmit-earthquake-of-1999>
44. Semt pazarı (kuruluş günü belediye encümenince belirlenir; mahalle başına farklı gün): <https://www.hal.gov.tr/Sayfalar/Pazar-Yerleri.aspx?sid=6>, <https://www.posta.com.tr/yazarlar/tamer-heper/semt-pazari-yonetmeligi-3044331>, <https://www.bursadabugun.com/haber/bugun-bursa-da-hangi-pazarlar-kuruluyor-iste-semt-semt-pazar-gunleri-ve-yerleri-1947984.html>
45. 2429 sayılı Ulusal Bayram ve Genel Tatiller Hakkında Kanun: <https://www.mevzuat.gov.tr/MevzuatMetin/1.5.2429.pdf>; <https://vakithesaplama.diyanet.gov.tr/2429_kanun.php>
46. 2027 dini günler (Diyanet takvimine dayalı): <https://www.bereket.com.tr/blog/kurban-bayrami-2027-ne-zaman-ve-tatil-suresi>, <https://www.timeturk.com/ramazan-bayrami-2027-ne-zaman-iste-dini-gunler-ve-bayramlar>

**Güvenilirlik özeti.** Mevzuat bağlantıları birincil kaynaktır. Oyun bilgilerinin çoğu resmî wiki/duyurudur; Last Oasis (topluluk tartışması), Capital Rift (tek kaynak, TikTok) ve Travian ittifak sınırı (arama özeti) zayıf kaynaktır. İl/ilçe/mahalle sayıları haber/derleme sitelerindendir. Sayısal oyun parametreleri **öneridir**; ölçülmemiştir.

*İlgili belgeler: [11 — Ürün Dönüşü](../11-urun-donusu.md) · [08 — Altı Katman](../08-alti-katman.md) · [oyun tasarımı: parsel dünyası](oyun-tasarimi-parsel.md) · [paylaşılan dünya mimarisi](paylasilan-dunya-mimarisi.md)*
