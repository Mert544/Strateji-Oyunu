# Oyun Tasarım Belgesi v1 (GDD v1): Odak Denetimi ve Tek Doğruluk Kaynağı

> **Durum.** 1 Ekim 2026, Ar-Ge dalgası 4. Bu belge **karar vermez; kararları toplar, çelişkileri işaretler.** Yeni öneri yalnız §5.2 (odak) ve §6.4 (Alfa-0 öncesi şartlar) içinde ve kısadır. Kod, veri ve başka belge değiştirilmedi; yalnız bu dosya yazıldı.
>
> **Okunan kaynaklar.** docs/00–12 (karar ve çelişki içeren bölümler tam; docs/06, 08, 10 bölüm bölüm), docs/arastirma/ altındaki 26 dosya (25 rapor + argelider-sentez-1): özet, karar, Alfa-0 ve açık soru bölümleri tam; teknik raporlar (3d-teknoloji, açık kaynak ve veri, altı katman rakipleri, karo ve ızgara denemesi, sokak seviyesi 3B, paylaşılan dünya mimarisi) özet ve başlık düzeyinde; ortak brif ve sahip sözleri; `packages/cekirdek/src/{mulk,ekonomi,pazar,motor,tipler}`, `packages/sunucu`, `packages/protokol`, `packages/istemci/src/{harita,yuru,arayuz}`, `packages/veri/icerik/*.json` (commit edilmemiş "çalışma ağacı" dosyaları dahil; ayrıca anılır). Raporlardaki sayıların hiçbiri bu belgede yeniden doğrulanmadı.
>
> **Dalga 4.** Üç rapor **onaylandı** ve kesin hâlleriyle işlendi: **donus-deneyimi.md (2. tur, onaylı)**, **uretim-agi-genisletme.md (2. tur, onaylı)**, **perakende-kademeleri.md (3. tur, onaylı)** (§3A, §3B, §3C; çelişkileri §5.1 T-36…T-54). **`askeri-katman-v1.md` (2. tur, onaylı) sonradan geldi ve v1.1 olarak işlendi:** §3D rapora göre yeniden yazıldı; baş lider kararları **Y-35** (Alfa-0 askeri kapsamı: bayraklı eşkıya PvE dilimi) ve **Y-36** (para korunumu: PvP yağma %60 iletim, ikmal ×0,25) karar defterine girdi; T-09 çözüldü, T-50…T-53 eklendi. Sonraki baş lider kararları da işlendi: **Y-37** (`kepek` 24. mal kabul; yerel pazar kanalı ve "sen yokken" dilimi Alfa-0 P0'da; çekim uzayı, fiyat paydası, ayrılmış hücre ve talep modeli Alfa-0 öncesine çekildi) ve **Y-38** (kamu arsası dikdörtgen ada ölçeği, docs/12 §13); kamu arsası çekirdek işinin durumu (incelemede, commit bekliyor) §0 bulgu 5, AÖ-1 ve §8'de; T-54 eklendi ve docs/12 §13 ile kapandı. **Sahip kararı docs/12 §12** ve **baş lider kararları docs/12 §13** (Y-32, Y-33, Y-34) ("kademeler seçimdir, ilerleme merdiveni değil; kilit yok, seçim var") belgenin tamamına uygulandı (§1, §3B, §5.3).
>
> **Okuma (öncelik) kuralı.** Çelişki çıkarsa şu sıra geçerlidir; bu bir **okuma kuralıdır, yeni karar değildir**: (1) sahibin sözleri ve yönergeleri (brif, docs/12 §2–§9, §11 ve **§12 sahip kararı**, docs/11 "Ek karar" bölümleri); (2) baş lider kararları (docs/12 §10 ve **§13**); (3) docs/00 K-kararları ve docs/11 ADR; (4) uygulama kuralları için docs/06 ve çalışan kod; (5) araştırma raporları (hepsi **öneridir**, baş lider onayı yoksa karar sayılmaz). Aynı düzeyde yeni tarih eskiyi geçer. README bugün yalnız "06 ve 11 önceliklidir" der; bu belge yayımlanınca README'ye işaret eklenmelidir (§5.1, T-24).

---

## 0. Bir sayfalık özet

**Kimlik (tek cümle).** *Mahallende ya da seçtiğin yerde bir arsayla başla; gerçek Türkiye haritasında, sen yokken de akan paylaşılan bir dünyada üret, işle, sat, genişle ve komşularınla yarışarak yönet; yürüyüş yalnız seni oyuna alıştıran bir katmandır ve oyun gerçekçilikten önce oynanabilir olmalıdır.* (Kısa söylem: "Mahallende ya da seçtiğin yerde başla", docs/12 §2.)

**Sekiz tasarım sütunu** (ayrıntı §1): (1) strateji tabanlı, MMORPG değil; (2) mahallende başla, yön ve ölçek kilitsiz (**seviye ya da kilit yok, seçim var**); (3) üret → işle → sat → genişle → yönet/rekabet döngüsü oyunun kalbi; (4) Türkiye öncelikli; (5) canlı, gerçek zamanlı dünya (kapalıyken de akar); (6) profesyonel, sakin görsel (büyük harf yok); (7) yürüyüş adaptasyon katmanı; (8) oyun > gerçekçilik.

**Bugün ne çalışıyor (kod).** Deterministik çekirdek; paylaşılan dünya sunucusu (mutlak duvar saati, kapalıyken yetişme, günlük + anlık görüntü, iki istemci uçtan uca); harita L0–L3 (küre, il, ilçe, arsa), Yerleş ekranı, hazır arsa, yapı önce yerleşim, atomik `yapi_yerlestir`, `parsel_birak`, 4 aşamalı inşa, yeni oyuncu paketi, limansız ilde ilk satış, Ambar ve Ticaret ofisi; yürüyüş istemcisinin ilk dilimi. **Çalışmayan:** dalga 3 ve dalga 4 kararlarının tamamı (kamu arsası, ödül tablosu, dükkân ve yeni 9 mal, Esnaf Defteri, "sen yokken", yerel talep, ihale, kamu ajanı) henüz kodda yoktur (§8).

**Odak denetiminin 14 bulgusu.**
1. **Karar dağınıklığı.** Kararlar altı yerde (docs/00 K1–K35; docs/11 §2 ve 3 "Ek karar"; docs/12 §7–§13; sentez G1–G23 ve S1–S11; 15'ten fazla raporun yaklaşık 100 "geri dönüşü zor karar" önerisi). Tek tablo §4'tedir; hangisi **kilitli**, hangisi yalnız **öneri** açıkça ayrıldı.
2. **Kapsam şişmesi.** Her rapor "Alfa-0'a şu da girsin" diyor; kritik yol hâlâ sunucu → mülk → harita → Alfa-0 ve çekirdekte tek yazar. Alfa-0 listesi §6'da kilitlendi; kalanı için "sonra" ya da "hiç" önerisi §5.2'dedir.
3. **P0 sırasında boşluk: kapandı (baş lider, Y-37).** docs/12 §10 P0 sırası "dükkân"ı içerir ama dükkânın bağımlılığı olan **yerel pazar kanalı** (canlı dünya A0-2: ilçe nüfusu ve talep) P0'da yoktu; bu olmadan dükkân yalnız NPC pazarına satan bir arayüzdür (dikey §12 R5). **Karar:** yerel pazar kanalı ve "sen yokken" en küçük dilimi (D1–D3, D4a, D5; ≈3 M + 1 S) **Alfa-0 P0'a girdi** (Y-37). Kalan iş: docs/12 §10 P0 sırası metninin güncellenmesi ve uygulama.
4. **Etiket hatası: düzeltildi (baş lider, Y-37).** Arsa satışı **Alfa-0'da** başlıyor (F4: Yerleş, hazır arsa); oysa çekim uzayı (G20), fiyat paydası (arsa Z14), ayrılmış hücre kuralı ve talep modelinin kimliği "Alfa-1 öncesi" etiketliydi. **Karar:** dördü de **Alfa-0 öncesine çekildi** (Y-37); kural ayrıntısı ve sayılar hâlâ karar/uygulama bekler (§6.4 AÖ-2).
5. **Kamu arsası: çekirdek işi incelemede, commit bekliyor.** Önceki durum: kamu arsası yalnız istemcide (`istemci/src/harita/arsa.ts`), çekirdek `parsel_al` kamu hücresini satabiliyordu. Bugün: G2 P1 bitti (dikdörtgen ada saklaması, hücre listesi değil; baş lider kararı docs/12 §13 4. madde, c2221dc), G1 kamu yayını hazır; çekirdek değişiklikleri çalışma ağacında incelemede, depoya commit edilmedi. Kilitli karar (G1) commit edilip `parsel_al` ve `yapi_yerlestir` reddi testle doğrulanmadan gerçek satış açılmamalı (AÖ-1, A0-9).
6. **Askeri Alfa-0 çelişkisi: çözüldü (baş lider, Y-35).** Sahibin ek kararı (Ordugâh + PvE eşkıya Alfa-0'da) ↔ K32, docs/04 §9.2, docs/11 §6 ve yapay zekâ §8 ("Alfa-0'da askeri yok") çelişkisi, askeri-katman-v1.md'nin 3.0 karar kutusuyla **seçenek (i)** ile kapandı: eşkıya PvE dilimi `askeri.eskiya.etkin` bayrağıyla, iki aşamalı (0a çekirdek ve şema hazırlığı hemen, paralel; 0b oynanış para güvenliği ve Esnaf Defteri P0'dan sonra); bayrak Alfa-0 kapısından 3 hafta önce AH1, AH2, AH4 ve parsel H5 geçerse açılır, geçmezse yalnız şemaya (ii) iner. Kalan işler: docs/00 K32, docs/04 §9.2, docs/11 §6 ve yapay zekâ §8 metinlerinin bu karara göre düzeltilmesi (T-09, T-50…T-53); çeşitlilik §5.3'teki 6 saatlik duyuru 24 saate düzeltilmeli.
7. **Yürüyüş çelişkisi.** K28 "Alfa-1" ↔ ek karar "temeli Alfa-0'da"; kodda F5 ilk dilim zaten var. Önerilen okuma: Alfa-0'da isteğe bağlı, kabul kapısı değil.
8. **Oyuncu ajanı ve oyun API'si** sahip tarafından kapatıldı (docs/12 §10) ama dört raporda (kamu §2.6 ve §7.3, yapay zekâ §5.6 C, §8, §9 k4, sentez S2) hâlâ "izinli / v1.5" yazıyor.
9. **Mal kimlik kilidi genişliyor.** G5 kilidi 23 mal üzerine kuruldu; **`kepek` 24. mal olarak kabul edildi (Y-37)**; sahibin yeni yönergeleri (et, deri, süpermarket, fabrikalar) için üretim raporunun 21 yeni kimliği ve `il-imza.json` (9f79e18'de commit'lendi; `ileride` listesi 75 kimlik, kilit kararlarıyla uyumlu) birleşik listeye bağlanmadan `icerik.json`'a girmemeli (AÖ-3).
10. **Sayı tutarsızlıkları.** Yapı sayısı (18/19/20; tabloda 20 satır; kodda 17 tesis + 6 ek kimlik), mal sayısı (23/35/82), teknoloji düğümü (6/7/13/17/26/97), ilk inşa süresi (24 dk ↔ kod 12 dk). Tek değere indirgendi (§6).
11. **Eskimiş ifadeler.** "yol seçimi", "uzmanlaşma ×1,5", "NPC Muhtar ilçede", eski ihale modeli, "Muhtarlık oyuncu yapısı", docs/11 §9.4'teki büyük harf kuralı; liste ve düzeltilecek bölümler §5.1'dedir (54 madde).
12. **Bakım borcu.** README, docs/04 §9, docs/10 ve docs/11 §6 yeni P0 işlerini ve dalga 3 kararlarını yansıtmıyor; bu belge yayımlanınca "tek doğruluk kaynağı" olabilmesi için dört belgenin güncellenmesi gerekir.
13. **"Seviye ya da kilit yok, seçim var" (docs/12 §12) taraması.** Perakende, fabrika ölçeği ve yöntem, yapı türü, teknoloji ölçeği, askeri teknoloji, vali adaylığı ve arsa sınıfı açısından **13 sıra/seviye/teknoloji/başkasına bağlı kilit** bulundu (8'i kaldırılmalı ya da kalktı, 5'i karar gerektirir; §5.3); en önemlileri: "süpermarket yalnız M'den yükseltmeyle ve yalnız Merkez ilçede", "S/M/L ve yöntem ilçe gelişim seviyesine bağlı", "yeni yapı türleri ilçe seviyesiyle açılır", "vali yalnız muhtarlar arasından". Kodda bugün **ilçe seviyesi kilidi yoktur** (yalnız bir alan); ama **L ölçek teknoloji kilidi vardır** (`sanayi.olcekKademeleri[2].gerekliTeknoloji = otomasyon`, `sanayi/komut.ts`). **Baş lider kararları (Y-32, Y-33; docs/12 §13):** bu L ölçek kilidi mülk kipinde kalkar (teknoloji kilit değil, verim/maliyet avantajı; bölge kipi altınları değişmez); docs/11 §7.4'ün "ilçe seviyesi ölçek ve yapı açar" tanımı geçersizdir, ilçe seviyesi **yalnız kolektif dünya durumudur**.
14. **Dalga 4 çelişkileri.** `kepek` 24. mal **kabul edildi (baş lider, Y-37)** ve G5'in 23 mal kilidi 24'e genişledi; dükkân tür kataloğu üç raporda üç farklı sayıda (5 / 8 / 13); market ve süpermarketin Alfa-0'da seçilebilir olması korumalarının (kademeli pay tavanı, ruhsat, kota) Alfa-0'a çekilmesini ister (perakende raporu, 3. tur onaylı, Alfa-0'da yalnız S dükkân der ve bu rapordan Alfa-0'a 0 yeni kural ekler); ayak izi çelişkisi **kapandı:** perakende kesin hâli `olcekHucre = [1, 2, 3]` (bakkal 1, market 2, süpermarket 3; süpermarket için `[1, 2, 2]` tür verisinde gerekçeli istisna alternatifi), Y-34 ve docs/12 §13 (öneri S 1 / M 2 / L 3) ile uyumlu; `hafif_sanayi` 20. yapı kararı ilk veri sürümünden önce gerekir (T-36…T-54).

**Alfa-0 kilidi (özet; ayrıntı §6).** Kocaeli + Sakarya + Bursa, ≤200 davetli. Döngü: Yerleş → arsa/yapı → üret → işle → sat → (dükkân) → genişle. **24 mal (14 mevcut + 9 yeni + `kepek`; Y-37), 4 zincir (ekmek; cam → pencere; süt → şarküteri; fındık → şekerleme), tek yeni yapı `dukkan` (kademeleri seçilebilir iş modeli; bayrak açıksa ek olarak askeri ek yapılar Ordugâh, Karakol, Gözetleme Kulesi), kamu = görünür ama satılmaz (arsa, kasa, sabit fiyatlı sipariş), bayraklı NPC eşkıya PvE dilimi (Y-35).** Girmeyenler: ihale, kira ve haklar, canlı ajan, seçim/yasa, ara kademe uzmanlığı, pamuk → giyim, Rehberlik, oyuncu ajanı / API, KÖİ, askeri PvP (il kontrol savaşı, koruma sözleşmesi).

**Baş lidere acil (ayrıntı §6.4 ve §9).** (a) Kamu arsası çekirdek işinin incelenip commit edilmesi; (b) çekim uzayı + fiyat paydası + ayrılmış hücre kuralı + talep modeli: Alfa-0 öncesine çekildi (Y-37), kural ayrıntısı ve uygulama; (c) yürüyüşün Alfa-0 durumu (askeri çözüldü: Y-35); (d) yerel pazar kanalı ve "sen yokken" dilimi P0'a girdi (Y-37): uygulama sırası ve olgu defteri; (e) birleşik mal (24 + 21 yeni kimlik) ve yapı kimlik listesi (AÖ-3, AÖ-4); (f) K-4 adlandırma (Muhtar = mahalle, İlçe Başkanı = ilçe) yazılı karar; (g) oyuncu ajanı / API'nin dört rapordan silinmesi.

---

## 1. Kimlik ve tasarım sütunları

### 1.1 Kimlik cümlesi ve söylem

| Katman | Metin | Kaynak | Durum |
|---|---|---|---|
| Kısa söylem | "Mahallende ya da seçtiğin yerde başla." | docs/12 §2 (sahip) | kilitli |
| Uzun cümle | Yukarıdaki §0 cümlesi (bu belgenin sentezi); harman raporunun cümlesi ("Kendi mahallendeki bir tezgâhla başlayıp ... komşularınla birlikte büyüttüğün sakin bir strateji oyunu") bunun öncülüdür | oyun-kimligi-harman §0 madde 2 | öneri (Ç6: slogan ve ad marka taraması sonrası açık) |
| Ürün adı | Özgün kimlik; Capital Rift'ten yalnız "görünür üretim ağı hissi" ilhamı; "Capital-Rift" adı, yemek arabası, Player Pass vb. kopyalanmaz | docs/10 §4 madde 14; harman §6 | kilitli (ilke); ad açık |

### 1.2 Sekiz sütun

Her sütun için "kırmızı çizgi": hangi öneri bu sütunu bozar. Yeni bir fikri değerlendirirken önce bu tabloya bakılır.

| # | Sütun | Ne demek | Kaynak | Kırmızı çizgi (bunu getiren öneri geri çevrilir) |
|---|---|---|---|---|
| S1 | **Strateji tabanlı, MMORPG değil** | Sınıf, seviye, XP, beceri ağacı, ustalık kademesi, ekipman **yok**; ilerleme varlıkta görünür: yapı, zincir, ilçe, sözleşme, makam, pazar payı, sicil | docs/11 ek karar (strateji çekirdeği); baslangic §0.2 | karakter ilerlemesi, "usta/çırak/kalfa" kademeleri, uzmanlaşma çarpanı, ödül için "grind" |
| S2 | **Mahallende başla; yön ve ölçek kilitsiz (seviye ya da kilit yok, seçim var)** | Devlet seçimi yok; ilçede arsa ile başla; Tarım/Sanayi/Pazar yalnız **açılış önerisi**; sonra fabrika, ticaret, politika, askeri yöne dönmek serbest. **Kademeler (bakkal, market, süpermarket; atölye, imalathane, fabrika; birlik ve savunma yapıları) iş modelidir, ilerleme merdiveni değil:** kısıtlar yalnız sermaye, uygun arsa/ayak izi, girdi, işletme gideri ve adalet/tekelleşme korumalarıdır; yükseltme bir seçenektir | docs/12 §2–§3 ve **§12**; K25 | sınıf seçimi, geri dönüşsüz kilit (dışlayan teknoloji dalı da kalıcı kilit olamaz: bilim G2), "önce küçüğünü kur" sırası, ilçe seviyesine bağlı bireysel yapı/ölçek/yöntem kilidi |
| S3 | **Üret → işle → sat → genişle → yönet/rekabet** | Döngülü zincirler oyunun kalbi; kendi perakende dükkânı ana kanal; askeri güç beşinci ayak; rekabet parsel almadan, **kontrol** üzerinden | docs/12 §8; docs/11 §7.1 ve ek karar (askeri) | döngüye hizmet etmeyen sistem (ör. mini oyun, kumar, süs mekaniği) |
| S4 | **Türkiye öncelikli** | Gerçek il/ilçe, il imza ürünleri, coğrafi işaret, OSB, borsa, pazar günü; mal sayısı sınırlı değil ama **kademeli** (temel + il imzası + nadir); genişlemeye açık veri modeli | docs/11 ek karar; K33 | ülke-bağımlı sabit kodlama; ihtilaflı alan |
| S5 | **Canlı, gerçek zamanlı dünya** | Tek takvim, 1:1 zaman, mutlak duvar saati; sunucu kapalıyken de akar, açılışta yetişir; NPC esnaf ve müşteri; dönüşte özet | docs/12 §7; docs/11 ek karar | dünya hızlandırma, sıfırlama, "sezon", çevrimdışını cezalandıran olay |
| S6 | **Profesyonel, sakin görsel** | Sakin ama amatör görünmez; tutarlı tasarım dili; akan çizgi ve parçacık yok; haritada ve arayüzde **büyük harf kullanılmaz** | docs/12 §4, §9; K29 | akış görselleri, doygun/gürültülü palet, büyük harfli etiket |
| S7 | **Yürüyüş adaptasyon katmanı** | Oyuncuyu alıştırır, dünyayı hissettirir, stratejinin yerini almaz; her işin **harita/panel karşılığı** vardır; zorunlu taşıma, restok, "uğramazsan kaybedersin" yok | docs/11 ek karar; harman §5; capital-rift §3 | yürüyüşe bağlı strateji gücü, zorunlu uğrama, yalnız yürüyüşle yapılan iş |
| S8 | **Oyun > gerçekçilik** | Her şey birebir gerçekçi olamaz; oynanabilirlik önce gelir; gerçek oran yalnız yön ve sıralamayı belirler, oyun sayıları katma değer ve denge hedefine göre ayarlanır | docs/12 §11; brif | gerçekçilik gerekçesiyle karmaşıklık, bekleme veya angarya |

### 1.3 Kırmızı çizgiler (sütun değil, değişmez ilke)

| İlke | Kaynak | Not |
|---|---|---|
| Parsel **asla zorla** el değiştirmez (savaş ve yağma arsa almaz); oyuncular arası **gönüllü** alım-satım ve pazarlık serbest | docs/12 §7; docs/11 §7.7 | gönüllü arsa pazarlığı için mekanizma henüz yok (§3.1) |
| NPC arsa sahibi yok; NPC rakip firma yok; boş arsa boş kalabilir | docs/12 §7; canli k2 | `NpcAlici` bir **alıcı kaydıdır**, mülk sahibi değil |
| Para korunumu: **para alanı taşıyan sistem ya da ajan komutu yok** (ödüller çekirdekteki sürümlü tablodan) | docs/12 §10 (G4) | kamu bütçesi yalnız zaten yanan paradan |
| Pay-to-win yok; günlük giriş ödülü yok; kozmetik avantajsız | K13; docs/11 §7.1 | gelir modeli prototip dışı |
| Determinizm: aynı tohum + aynı günlük = aynı dünya; sunum katmanı kapatılınca `durumOzeti` aynı | docs/06 §1; canli §1.4 | LLM çıktısı çekirdeğe girmez (§7) |
| Deprem olayı yok; dini bayram yalnız talep eğrisi + **hatırlatma takvimi**; ritüel yok | docs/12 §7; canli §5.7 | hassas içerik varsayılan hariç |
| "Sezon" sözcüğü kullanılmaz; "iklim takvimi / dönem" | K21; brif | oyun içi "düğün sezonu" gibi adlar da "dönem"e çevrilmeli (T-34) |
| Yapay zekâ yalnız **sunucu kamu ajanı** ve **kamusal alan NPC'leri**, maliyet tavanlı; oyuncu ajanı ve oyun API'si **yok**; ihalede kazananı kural seçer (b) | docs/12 §10 | §7 |
| **Seviye ya da kilit yok, seçim var:** kademeler (perakende, fabrika ölçeği, askeri yapı, teknoloji ölçeği, arsa) açılışı kilitleyen sıra ya da seviye taşımaz; kısıt yalnız sermaye, arsa/ayak izi, girdi, gider, adalet ve tekelleşme koruması | docs/12 §12 | tarama §5.3; ilçe gelişim seviyesi **kolektif dünya durumu** olabilir, bireysel kilit olamaz |
| Her yeni fikir ana döngüye hizmet etmeli | brif; docs/12 §11 | **odak sınaması** aşağıda |

### 1.4 Odak sınaması (her yeni fikir için, yanıtlar "evet" olmadıkça Alfa-0'a girmez)

1. Ana döngünün (üret, işle, sat, genişle, yönet/rekabet) hangi adımına doğrudan hizmet ediyor?
2. 30 saniyelik bir **kararı** var mı ve panel/haritadan verilebiliyor mu (yürüyüş şart değil)?
3. Kritik yolu (sunucu → mülk → harita → Alfa-0) uzatmıyor ya da çekirdekte tek yazarı bekletmiyor mu?
4. Geri dönüşü zor bir şemaya, kimliğe, günlüğe ya da oyuncu beklentisine yazılıyorsa o karar **önce** §4'e girdi mi?
5. Karakter ilerlemesi, angarya, parayla güç, yeni para musluğu ya da yeni hassas içerik getiriyor mu? (Getiriyorsa reddedilir.)
6. Bir **sıra, seviye ya da "önce küçüğünü kur" kilidi** getiriyor mu? (Kısıt yalnız sermaye, arsa/ayak izi, girdi, gider ve adalet/tekelleşme korumasından gelebilir; başka kilit varsa reddedilir ya da §5.3'e yazılır.)

---

## 2. Çekirdek döngüler

Her döngü **oyuncunun verdiği kararı** adlandırır. İlke: her karar panelden ya da haritadan verilebilir; zorunlu uğrama, günlük giriş ödülü ve kaçırma cezası yoktur; günde bir-iki kısa ziyaret yeterlidir (docs/11 §7.1, K13). Aşağıdaki "Alfa-0" sütunu: **kod** = bugün çalışıyor, **P0/P1** = Alfa-0 için yapılacak (§6), **A1** = Alfa-1 ya da sonrası.

### 2.1 Ana döngü zinciri (üret → işle → sat → genişle → yönet/rekabet)

| Adım | Oyuncunun yaptığı | Alfa-0 | Not |
|---|---|---|---|
| **Üret** | Tarla, Ahır, Mera, Maden, Petrol, Santral kur; yöntem, ekim karışımı, gübre dozu, ölçek seç | **kod** (mülk kipinde işletme düğümü üzerinden) | 3 ekim ürünü (buğday, baklagil, nadas); 14 mal; iklim takvimi ve damar tükenmesi çalışıyor |
| **İşle** | Gıda fabrikası, Çelikhane, Parça atölyesi, Elektronik, Gübre; yeni: değirmen, fırın, cam fırını, doğrama | **kod** (mevcut zincirler) + **P0** (ekmek, cam → pencere) + **P1** (süt, fındık) | buğday → un → ekmek ve cam → pencere sahibin iki örneği |
| **Sat** | NPC pazarına ihracat emri; **kendi dükkânın**; kamu siparişi; (A1) sözleşme, ihale, emir defteri | **kod** (NPC pazar, Ticaret ofisi) + **P0** (dükkân, kamu siparişi v0) | dükkân "ana kanal" ama prim küçük (≈%3–16); asıl değeri pazar doyunca zinciri kurtarması (G11, S4) |
| **Genişle** | Komşu hazır arsayı "Genişlet"; ölçek yükselt; ikinci ilçe/il; yeni zincire geçiş | **kod** (`parsel_al`, `yapi_yerlestir`, ölçek) | ilçe gelişim seviyesi **kodda yalnız bir alan** (kilit yok; docs/12 §12 gereği bireysel kilit olmamalı, §5.3); Fırsat Kartı A1 |
| **Yönet / rekabet** | Alfa-0: kamu görünür (meydan, pazar yeri, Kamu Kasası, sipariş panosu), NPC vali varsayılan yasalarla; rekabet = pazar payı, fiyat, kıt arsa, il imza kimliği. Alfa-1: muhtar ve vali seçimi, yasa, ihale, imece, askeri | **P0** (kamu) / **A1** (seçim, ihale, askeri) | "Parsel asla el değiştirmez": rekabet **kontrol ve ticaret** üzerindendir |

### 2.2 Zaman ölçekleri ve her döngünün kararı

| Döngü | Tek karar | Araç / ekran | Alfa-0 | Dayanak |
|---|---|---|---|---|
| **30 saniye** | "Bak, **tek karar** ver": fiyatı %5 oynat, siparişi kabul et, bir rozetin nedenini oku, çık. Bütçe ≤3 tıklama; karar yoksa oyun "bugün yapacak şey yok" der | Dikkat paneli (≤5 madde, "Git" düğmesi), yapı başına tek rozet (▲ ◯ ✓), bildirim kuralı (toast yalnız kendi eylem), Defter satırı | Dikkat ve rozet **kod**; Defter satırı **P0** | harman §3.1; docs/11 §9.3 |
| **5 dakika** | **Yatırım ve zincir:** yapıyı nereye, hangi yöntem ve ölçekle; zincirin hangi halkasını kur; yerel mi toplu mu sat | Hayalet yerleşim + maliyet kartı ("arsa + yapı"), Taslak modu, ekim planı, dükkân fiyat önayarı | hayalet, maliyet kartı, ekim, gübre **kod**; dükkân **P0** | harman §3.2; docs/11 ek karar |
| **1 saat** | **Genişleme ve kanal:** komşu arsa, hangi kanala sat (kendi dükkân / NPC pazarı / kamu siparişi), ikinci zincir; (A1) sözleşme, imece, kooperatif, ordugâh | "Genişlet", Ticaret ofisi emir yuvaları, dükkân paneli, kamu sipariş panosu | Genişlet, emir yuvası **kod**; dükkân, kamu siparişi **P0**; sözleşme, imece **A1** | harman §3.3; dikey §4 |
| **1 gün** | **Takvime göre planla:** ekim karışımı ve stok hasat eğrisine, olay uyarısına (24 sa önceden), bayram hatırlatmasına göre; Akşam Defteri'ni oku | İklim takvimi, Takvimden sayfası, Akşam Defteri / "sen yokken" kartı | iklim takvimi **kod**; Takvimden **P1**; Akşam Defteri **P0** (olgu defteri bağımlı) | harman §3.4; canli §5, §6; rehber §2.7 |
| **1 hafta** | **Büyüme ve yönetişim:** ilçe seviyesi, arazi vergisi, bülten; (A1) oy, yasa, savaş penceresi, fuar, bütçe | İlçe bülteni (şablon), Kamu Kasası defteri, (A1) seçim ekranı | arazi vergisi tahakkuku **kod**; bülten ve kasa **P0/P1**; oy, savaş **A1** | harman §3.5; docs/11 §7.6 |
| **1 ay** | İklim takvimi değişir; damar tükenmesi (15–25. gün), ilk ilçe seviye atlaması (10–20. gün, tahmin), ortak proje | Atlas, harita mercekleri | iklim ve damar **kod**; seviye atlaması **kodda yok**; ortak proje **A1** | docs/11 §7.11 |

### 2.3 Giriş döngüleri (ilk 10 dakika, ilk gün, dönüş)

| An | Oyuncunun kararı | Mekanizma | Alfa-0 | Kaynak / not |
|---|---|---|---|---|
| **İlk 60 saniye** | 3 önerilen ilçeden birini seç; "hazır arsa"ya tek tık | Yerleş ekranı (doluluk, imza ürün uyumu, ayrılmış hücre) | **kod** | harman §5; baslangic §2 |
| **İlk 10 dakika** | İlk yapıyı yerleştir (arsa + yapı tek kart), ilk satışı izle | ₺50.000 hibe, bedava yurt (6 hücre), ilk 5 yapıda %30 indirim, ilk 24 saat %10 inşa süresi (ilk Tarla **12 dk**, docs/11'deki "24 dk" eskidir), başlangıç kiti (gıda stoğu ilk dakikada satılabilir) | **kod** | 06 §15.1, §15.5; "Açılış Tezgâhı" önerisi (harman Ç2) **açık** ve gerekmeyebilir (§5.2) |
| **İlk gün** | Açılış önerisini izle (Tarım, Sanayi ya da Pazar) ya da değiştir; 5–7 hedef, sırası serbest | Esnaf Defteri: 3 açılış zinciri (T1–T13, S1–S11, P1–P10) | **P0** (2 S + 4 M) | rehber §3, §6.3 |
| **Dönüş** | "Sen yokken ne oldu" kartından **ilk adımı** seç; yargı yok, ödül yok | Kaldığın yer (6 sa / 2 gün / 14 gün uyku / 45 gün çürüme / 90 gün açık artırma), olgu defterinden net etki | **P0** (kaldığın yer) / olgu defteri **açık** (§6.4) | rehber §2.4; canli §6.3; sahip yönergesi (docs/12 §11) |
| **Yön değişimi** | Fabrika, ticaret, laboratuvar, politika, askeri yöne dön; kilit yok, yalnız yeniden yatırım maliyeti | "Yön sayfası" (Defter), Fırsat Kartı (günde ≤1) | sayfa **P1**, Fırsat Kartı **A1** | imza §4; rehber §2.5 |

### 2.4 20–25. gün tazelik kaldıraçları (projenin ana hedefi, K7)

Kanıt sınırı: bu bir **hipotezdir**; simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz (docs/00 R5). Kaldıraç bugün kodda varsa "kod" yazıldı.

| Kaldıraç | Ne zaman | Alfa-0 |
|---|---|---|
| Damar tükenmesi ve sondaj | 15–25. gün | **kod** (bölge kipi sanayi; mülk kipinde damar merkezden kopyalanır) |
| İlçe gelişim seviyesi (Köy → Kasaba → Merkez → Şehir) | 10–20. gün | **kodda yalnız alan**; docs/11 §7.4 bunu S/M/L ve yeni yapıları "herkese açan" kapı sayar: docs/12 §12 ile çelişir, **kolektif dünya durumu** (talep, nüfus, hizmet, ortak proje) olarak kalabilir, bireysel kilit olamaz (§5.3 KL-07); eşikler açık (Ü6) |
| İklim takvimi, hasat eğrisi, olaylar | aylık | **kod** |
| Zincirler arası geçiş (ekmek → cam → süt → fındık; Fırsat Kartı) | 3–14. gün | **P0/P1**; Fırsat Kartı **A1** |
| Perakende (kendi dükkân, çeşit, konum) | 1–7. gün | **P0** |
| Teknoloji (yöntem açar, dışlayan dal) | 1–5 gün | 7 düğüm **kod**; genişleme **A1+** |
| Ortak projeler, seçim, yasa | 14–28 gün | **A1** |
| Rehber görev zinciri ve olay kartları | ilk hafta | **P0/P1** |

---

## 3. Sistemler

Her sistem aynı kalıpla yazıldı: **Amaç** · **Alfa-0'da var** (kod = bugün çalışıyor; P0/P1 = yapılacak, §6) · **Alfa-0'da yok** · **Kilitli kararlar** (hangi belgede; ayrıntı §4) · **Açık sorular**. "Kilitli" yalnız sahip ya da baş lider kararı olan maddeler içindir; rapor önerileri "öneri" diye anılır.

### 3.1 Arsa ve inşa

**Amaç.** Arazi spekülasyon aracı değil **üretim aracıdır**; arsa edinimi oyunun ilk dakikaları ve ara sıra genişleme, döngünün ağırlığı üretim, ticaret, yönetişim ve rekabettedir (docs/11 §7, ek karar "hücre seçimi").

**Alfa-0'da var (kod):**
- z20 kare hücre (~28,9 m) atomu; sahiplik hücre kimliğiyle; hazır arsa (OSM adalarından 4–12 hücre; Gebze'de 55.100 hazır arsa), yapı önce yerleşim (hayalet, döndürme, maliyet kartı), atomik `yapi_yerlestir`, `parsel_al`, `parsel_birak` (%70 iade), `insaat_iptal` (%50 iade), istemcide "geri al".
- Fiyat: hücre başına 1.000 / 2.500 / 6.500 ₺ (kırsal / kasaba / şehir) × (1 + 2 × ilçede satılmış pay); oyuncu başına ilçede ≤72 hücre ve ilçenin ≤%25'i; haftalık %1 tembel arazi vergisi (yalnız arazi alış değeri).
- 4 aşamalı inşa (Temel, İskele, Gövde, Tamam; aşama sunucu zamanından **türetilir**), aynı anda 2 inşaat, kenar-bitişik 1–3 hücreli yapılar.
- Yeni oyuncu paketi: ₺50.000 hibe, bedava yurt 6 hücre (değeri 0), ilk 5 yapıda %30 indirim, ilçe hücrelerinin %20'si ilk 14 günde yeni oyunculara ayrılmış, 14 gün kalkan.

**Alfa-0'da var (P0):** **kamu arsası** (Mahalle Paketi 20 hücre + %4 hazine rezervi + ilçe merkezi 8–12 hücre + kıyı şeridi 2 hücre; satılmaz, `parsel_al` ve `yapi_yerlestir` reddeder; yurt atlar; yoğun ilçede toplam ≈%8–9).

**Alfa-0'da yok:** kullanım ekseni (tarla/sanayi/konut) ve imar; çekirdekteki `sinif` yalnız fiyatı belirler; komşuluk ve modül sistemi (35 modül önerildi; Alfa-0'a en çok 5–6); aşamalı malzeme çekimi (Alfa-1); kira ve üst hakkı (Alfa-1 sonu); müteahhit (v1.5); hareketsizlik merdiveni (yalnız `sonEtkinlik` verisi ve parametreler var: 14 gün uyku, 45 gün çürüme %2/gün, 90 gün Hollanda usulü açık artırma kuralı yok); ilçe seviyesinin yükselmesi (alan sabit; **bireysel kilit olarak kodlanmamalı**, §5.3); oyuncular arası gönüllü arsa pazarlığı için komut yok.

**Kilitli:** **docs/12 §12 (kilit yok, seçim var: arsa sınıfı ve ayak izi doğal kısıttır, bireysel seviye kilidi değil)**; K27, K30 (z20), K25; ek karar "hücre seçimi oyuncuya gösterilmez"; docs/12 §7 (NPC arsa sahibi yok; gönüllü arsa pazarlığı serbest, zorla el değiştirme yok); G1, G2 (kamu arsası ve kimliği); S3 (kabul). Sayısal değerler (fiyat, ≤72/%25, %1, %20, 14 gün) **başlangıç değeri**dir, kalibre edilecek (docs/11 §7 başlığı).

**Açık:** arsa Z14 **fiyat paydası** (kodda tüm uygun hücre: 40 sahip gelse ilçede çarpan ≈1,01 kalır, kıtlık fiyatı işlemez) ve ayrılmış hücrelerin karma ile **saçılması** (arsa B2–B3), halka açılışı (%70 doluluk kuralı); Z3 kullanım ekseninin fikstür şemasına girişi; ~~Z4 yapı biçim kümesi ({1, domino, I3, L3}; ölçek büyürken aynı ayak izi)~~ **Y-34 ile yerine geçildi:** `olcekHucre[tür] = [yuva, yuva+1, yuva+2]`, en çok 5 hücre, bağlı kenar-bitişik küme; Z6 vergi tabanı komşudan bağımsız; Z7 imar yetkisi ve rıza ilkesi; Ü2 Mercator alan farkı (~%28); Ü4 mevcut bina taban alanlı hücreler; S10 90 gün sonra parselini kaybedenin yeniden başlangıç paketi; S8 hareketsiz hak ve yapının açık artırması; oyuncular arası arsa pazarlığının mekanizması (hangi komut, hangi koruma).

### 3.2 Üretim ağı (mal, zincir, yapı)

**Ayrıntı: §3A.** **Amaç.** "Döngüsel zincirler oyunun kalbi": buğday → un → ekmek → kendi marketin; maden → cevher → demir, alüminyum → pencere → kendi pencere mağazan (docs/12 §8). Üretim, işleme ve satışın birbirini beslemesi.

**Alfa-0'da var (kod):** 14 mal (`tahil, gida, cevher, komur, celik, bakir, silis, parca, elektronik, petrol, yakit, muhimmat, gubre, elektrik`), 24 yöntem, 18 tesis türü kimliği, 3 ekim ürünü, 7 teknoloji; tarım (iklim takvimi, toprak, gübre, hayvancılık, sulama) ve sanayi (elektrik ve brownout, ölçek S/M/L, bakım, kirlilik, damar tükenmesi ve sondaj) çekirdeği.

**Alfa-0'da var (P0/P1):** **9 yeni mal** (`un, ekmek, cam, pencere, sut, sut_urunu, findik, findik_urunu, sekerleme`; toplam **23**); **4 zincir**: ekmek ve cam → pencere (P0), süt → şarküteri ve fındık → şekerleme (P1); yeni yöntemler mevcut yapılara eklenir (değirmen, ekmek fırını, cam fırını, çelik doğrama, mandıra, kavurma, ezme; yapı değil yöntem); isteğe bağlı A0-ops: çimento ve alüminyum zinciri (ithal boksit, `elektroliz` teknolojisi). Tek yeni yapı `dukkan` (§3.3).

**Alfa-0'da yok:** ara kademe **uzmanlığı** (NPC makası ≈%20 gidiş-dönüş yüzünden değirmen uzmanı zarar eder; Alfa-0 = kapalı zincir ve çıkış kanalı seçimi, Alfa-1 = sözleşmeyle kademe uzmanlığı); pamuk → giyim (Alfa-1); kalite kademesi (A1); il imza **çıktı bonusu** (+%10; `il-imza.json` çalışma ağacında yazıldı, çekirdek okumuyor, yalnız Yerleş önerisi kullanıyor); keşif Atlası; hayvancılık zinciri (süt dışında et, deri, deri ürünleri: Alfa-1) ve madencilik/fabrika genişlemesi (Alfa-1 dilimleri; ayrıntı §3A).

**Kilitli:** **docs/12 §12 (fabrika ve üretimhane ölçekleri seçimdir; ilçe seviyesine bağlı ölçek/yöntem kilidi yok)**; docs/12 §8 ve §11 (zincirler oyunun kalbi; üretim döngüsü genişler); G5 (mal kimlikleri ilk `icerik.json` sürümünden önce kilitli: `tekstil` → `kumas` + `hazir_giyim`, `ekmek` ve `sekerleme` ayrı mal, `findik_urunu` taban 240; dizilere yalnız sona ekleme); G11 (tek yeni yapı `dukkan`, tür = veri); G13 (Alfa-0'da ara kademe uzmanlığı yok); docs/12 §10 ("Alfa-0 için 4 zincir ve 23 mal"; Y-37 ile 24'e genişledi).

**Açık:** mal sayısı 23 (G5) → **24 (`kepek` kabul edildi: Y-37)** ↔ 35 (cesitlilik-uretim §0 madde 9) ↔ ≈82 toplam katalog; 24 tarifli malın (21 yeni kimlik) birleşik kimlik kilidi (`et`, `deri`, `islenmis_deri`, `kasaplik`, `yem`...: ilk `icerik.json` ve `il-imza.json` commit'inden önce); hafif sanayi 20. yapı mı yöntem ailesi mi (Q1; üretim K-6: ilk veri sürümünde `hafif_sanayi`); `alumina` ayrı mal (öneri); fındık ve çay hasadı Ekim'de dışarıda (yumuşak pencere, Q2); G23 yapı malzemesi talebi yalnız yeni yapılara; üretimhane → fabrika = S/M/L yerinde ölçek, ilçe seviyesine **bağlanmaz** (§3A.3); `il-imza.json` (9f79e18'de commit'lendi; `ileride` 75 kimlik; `tekstil` → `kumas` + `hazir_giyim`, `sarkuteri` mal kimliği yasak).

### 3.3 Perakende (kendi dükkânın)

**Ayrıntı: §3B.** **Amaç.** Kendi perakende dükkânı **ana kanal** olur (docs/12 §8); asıl değer pazar doyduğunda (fiyat ×0,25'e kadar iner) zinciri kurtaran çıkış kanalı olmasıdır, **yüksek marj vaadi tutmaz** (S4 kabul).

**Alfa-0'da var (P0; kodda yok):** tek `dukkan` ek yapısı; tür = veri, **S ölçek: bakkal, fırın, şarküteri, şekerci, yapı market** (giyim A1) + Açılış Tezgâhı (K0; karar bekler); raf = çeşit yuvası (S 4; M 6 / L 8 Alfa-1), bir yuva bir mal; kasa kapasitesi (S 90 birim/sa; M 198 / L 324 Alfa-1); marka adı ve tabela (kozmetik); fiyatı oyuncu belirler ([0,7; 1,4] × referans, otomatik önayar); NPC müşteri çekimi canlı dünya §4.1 formülüyle (tür uyumu, konum, kasa eklenir); stok il düğümünde (il içi taşıma bedava). Kanal fiyatları (R = referans): NPC pazar 0,891 R, kendi dükkân 1,00–1,12 R, kamu tavanı 1,10 R. **Kodda bugün:** Ticaret ofisi var (komisyon %25 ve makas %15 indirimi, +4 emir yuvası).

**Kademeler (bakkal, market, süpermarket):** sahip kararı docs/12 §12 gereği **seçilebilir iş modelleridir**, ilerleme basamağı değil; ilçe seviyesi şartı yok (Y-33); ayrıntı §3B. **Alfa-0'da yok (perakende, 3. tur onaylı):** market (M) ve süpermarket (L) (Alfa-1 A1/A2; seçim ilkesinin Alfa-0'da görünürlüğü karar bekler), kademe çarpanı, Yakınlık Havuzu, pay tavanı, Zincir Kartı; zincir market (N14, gıda, NPC; Alfa-1); hal ve komisyoncu (N3, Alfa-1); vitrin 3B ve vitrin puanı (A1); oyuncular arası tedarik sözleşmesi (P5, Alfa-1); raf fiyat tavanı (gerekirse ZP11 alarmında açılır).

**Kilitli:** **docs/12 §12 (bakkal, market, süpermarket seçilebilir iş modelleridir; açılış kilidi yok; kısıt sermaye, arsa/ayak izi, gider, tekelleşme koruması; yükseltme seçenek; oyuncuya özgü marka ve tabela)**; G11 (tek `dukkan`); G12 (fiyatı oyuncu belirler; ithal alıp perakende satmak meşru ticaret, ZP11 ile izlenir, hane bütçesi tavanı); S4 ve S6 (kabul); docs/12 §10 "tek yeni yapı dukkan (tür verisiyle)".

**Açık:** S11 Dükkân 19. yapı sayılsın mı ("hafif sanayi" ile birlikte); kademe = ölçek + tür birlikte (perakende k1); market ve süpermarketin Alfa-0'da seçilebilir olması için gereken korumaların (kademeli pay tavanı, ruhsat, kota) Alfa-0'a çekilmesi (§3B.6, T-43); market hücre sayısı (1 mi 2 mi: T-49); `ilk_dukkan` rehber koşulu {dukkan, ticaret_ofisi} (Ç5; çözüm önerildi); G20 çekim uzayı (ilçe havuzu + konum çarpanı; halka havuzu Alfa-1); K-7/G21 kalite ilçe tabanlı; **bağımlılık:** yerel pazar kanalı (canlı dünya A0-2) **P0'a girdi (Y-37)**; uygulama sırası bekler (§6.4 AÖ-10).

### 3.4 Pazar

**Amaç.** Üretimin çıkışı: açıkça işaretli NPC piyasa yapıcı ("Dünya Piyasa Yapıcısı") taban likiditeyi verir; oyuncular arası ticaret zamanla gelir; "kimse odun satmıyorsa odun yoktur" dersi için az oyuncuda tamamen oyuncu fiyatlaması riskli.

**Alfa-0'da var (kod):** küresel NPC pazarı (makas ±%10, komisyon, liman primi yalnız limanlı merkezlerde), limansız ilde yerel NPC pazarına ilk satış, emir yuvaları (4 temel + ofis başına 4), Ticaret ofisi, ithalat/ihracat, ticaret defteri (brüt/net).

**Alfa-0'da var (P0):** sabit fiyatlı kamu siparişi v0 (≤ ref × 1,10, vade 3 gün, ilk kabul eden alır; mahalle kasası ilanı Muhtar'dan, ilçe kasası ilanı İlçe Başkanlığı'ndan); `NpcAlici{tur:"kamu"}`; para arzı panosu kalemleri.

**Alfa-0'da yok:** **yerel nüfus talebi** ve esnaf payı (kodda NPC talebi dünya düzeyinde sabit emilim/arz tablosu; NPC likiditesi oyuncu sayısıyla büyür, bu docs/11 §7.10'daki "oyuncular likidite sağladıkça NPC çekilir" ile ters yönlüdür: canlı dünya B5); oyuncular arası emir defteri (v1.5); sözleşme P5 (Alfa-1); hal; ihale (Alfa-1); pazar günü (Alfa-1); gurbetçi dönemi.

**Kilitli:** K13; docs/11 §7.10 (işaretli piyasa yapıcı); G9 (kamu, sipariş ve ihale tavanı = ithalat paritesi, 1,10 R); G4 ve G8 (para korunumu, kamu bütçesi yalnız yanan paradan).

**Açık:** canlı dünya karar 10 **talep modelinin kimliği** (yerel nüfus kanalı ↔ yalnız dünya pazarı; "arsa fiyat beklentileri buna dayanır"), K-6 fiyat uzayı granülaritesi (küresel + liman primi; il kapanış fiyatı yalnız bozulan ve imza mallar); B5 çift sayım düzeltmesi; NPC likidite ölçeğinin yönü; ZP11 ithalat arbitrajı eşikleri.

### 3.5 Lojistik (arka plan)

**Amaç.** Otomatik ve görünmez; oyuncu rota kurmaz. Karar "nereye kurmak"tır (stok il düğümünde; iller arası taşıma gerçek bir maliyet: örnek 20 konvoy ≈ ₺12.400), "hangi rota" değil.

**Alfa-0'da var (kod):** merkez MCF (yalnız 53 merkez arası), il içi havuz (yolsuz, süresiz), her kenar kamu, işletme düğümü merkeze sıfır süreli örtük kenarla bağlı, ihracat emri oyuncunun tüm işletmelerinden çeker.

**Alfa-0'da yok:** filo, yakıt, iklim kenarları, Garaj etkisi (Garaj etkisiz yer tutucu); seçili yapı için durağan noktalı rota çizgisi (istemci karşılığı bu turda doğrulanmadı); Lojistik v1 ertelendi.

**Kilitli:** K29, K31; docs/11 §3.5 seçenek (b).

**Açık / risk:** **performans hedefi karşılanmadı**: 1.000 oyuncu × 30 gün 150 sn (hedef ≤ bugünkü 21–22 sn); artımlı çözüm ayrı karar ve kanıt adımıdır (06 §15 performans notu). Alfa-0 kapısı A0-4 (100 bot yük testi) bunu raporlayacak.

### 3.6 Teknoloji (ve bilim)

**Amaç.** Teknoloji yüzde artış vermez; yöntem, tesis türü, birlik ya da karar **açar** (docs/02, 06 §7).

**Alfa-0'da var (kod):** 7 düğüm (`mekanize_tarim, sulama_sistemi, derin_madencilik, elektrik_ark_ocagi, otomasyon, konteyner_limani, mekanize_ordu`); `arastir` komutu oyuncu düzeyinde, aynı anda tek araştırma; Atölye-Lab **etkisiz yer tutucu**.

**Alfa-0'da yok:** bilim kapasitesi (BK), bilgi yayılımı kanalları, ortak araştırma (oyuncu, ilçe, il kapsamları), 97 düğümlü ağ (61 sivil, 36 askeri), keşif olayları, patent, askeri teknoloji. Hepsi Alfa-1 sonrası.

**Kilitli:** docs/12 §12 (ölçek/seviye kilidi yok: Lab ölçeğinin K-kademesini sınırlaması ve K4'ün yalnız Merkez+ ilçeye bağlanması bu açıdan **çelişir**, §5.3 KL-09); K19 (altı katman; teknoloji ayrı katman), docs/04 §9.4 A11 (düğüm sayısı Alfa-1 sonrasına ertelendi), docs/10 §4 madde 3. Bilim raporunun 10 kararı **öneridir**.

**Açık:** düğüm sayısı altı farklı değer (6 / 7 / 13 / 17 / 26 / 97; §5.1 T-13); bilim G8 "id tabanlı serileştirme, yalnız-ekle içerik" **ilk Alfa-0 teknoloji içeriği yazılmadan önce**; Ö1 Atölye-Lab Köy'de de kurulsun mu; Lab'ın Alfa-0'da etkisiz kalması (profesyonel ürün ilkesi: etkisiz yapı oyuncuya gösterilmemeli, §5.2).

### 3.7 Devlet, yönetişim ve kamu

**Amaç.** Yöneticilik başlangıç rolü değil **seçilen makamdır** (muhtar, vali); kamu bir NPC firma değil **kurallar ve kasalar ağıdır**; kamu oyuncuya hitap eden bir fırsat ve rekabet aracıdır (docs/12 §8) ama Alfa-0'da gelir değil **prestij ve renk** kaynağıdır (ilçe kasası haftada ≈₺2.200).

**Alfa-0'da var (kod):** NPC vali varsayılan yasalarla = pratikte sabit parametreler (arazi vergisi %1); `politika.ts` yalnız ikili diplomasi (bölge kipi); il hükümeti, seçim ve yasa kodda yok.

**Alfa-0'da var (P0, hafif kamu):** kamu arsası verisi ve görünümü (harita Kamu katmanı, hücre kartı "Kamu arsası: satılmaz"); Kamu Kasası açık defter (mahalle / ilçe / il); `NpcAlici{tur:"kamu"}`; sabit fiyatlı kamu siparişi v0; şema alanları ayrılır (`hak?`, `sozlesmeSurumu`, günlükte `kaynak`, PRNG akışı `kamu`); `kamu_karar` v1 günlük şeması, gündem ve zaman aşımı kural yedeği iskeleti; **Muhtarlık meydandaki kamu yapısıdır** (oyuncuya kapalı).

**Alfa-0'da yok:** seçim ve yasalar (F6, Alfa-1); bütçe kolları; ihale (Alfa-1: Profil M); kira, üst hakkı, tahsis, KÖİ, sanayi tahsisi; ilçe meclisi kartları, dilekçe, itiraz; Proje Kartı (imece + kasa); NPC kaymakam/vali ajan kararları.

**Kilitli:** (docs/12 §12 gereği "vali yalnız muhtarlar arasından" gibi kariyer basamakları da kilit sayılır: §5.3 KL-13); G1–G4, G7–G9, G15 (tek ihale motoru, profil M önce, sunucu-mühürlü teklif), G16 (ihalede kazananı kural seçer, (b)), S3, S9 (Muhtarlık kamu yapısı), K25 (yasa ve bütçe seçilmiş il hükümetinin); K-5 ilkeleri G4/G8/G9 içinde. **Yazılı karar yok (yalnız sentez önerisi):** K-4 adlandırma (Muhtar = mahalle, İlçe Başkanı = ilçe, yöneticisiz hâl NPC kaymakam/vali) ve K-1'in genel hâli (ad alanlı `VarlikId`: `o:`, `k:`, `d:`, `v:`, `n:` + komutta `adina`); yalnız kamu kimliği `k:mahalle / k:ilce / k:il` (G2) kilitlidir.

**Açık:** S7 ihale sonuç kartında kazananın adı (KVKK, rıza); S8 90 gün hareketsiz hak ve yapı açık artırması; G17 hak şeması ve sözleşme dondurma; G18; G19 görünür kimlik ve KVKK; K-10 oy ve temsil tüzüğü; K-16 seçim yalnız hesap güvence düzeyi 2'de; vali seçmen tabanı (cesitlilik-yonetim Ü-yeni-1); yasa sayısı (7 yasa, 3 bütçe kolu: docs/10 §4 madde 4 önerisi); NPC kaymakam iki farklı tanım (T-27).

### 3.8 Askeri

**Ayrıntı: §3D.** **Amaç.** Askeri güç döngünün beşinci ayağıdır; **parsel asla el değiştirmez, savaş toprağı değil kontrolü kazandırır**; birincil kaldıraç ekonomik savaştır (ambargo, tarife, abluka); askeri güç ekonomiden doğar (docs/11 §7.7 ve ek karar). Dört iş modeli (M0 yapmayan, M1 kendini savunan, M2 koruma hizmeti, M3 savunma tedarikçisi, M4 il kontrolüne talip) bir merdiven değil seçimdir.

**Alfa-0'da var (kod):** yalnız **bölge kipi** askeri modülü (`cekirdek/src/askeri/`: birlik üretimi, savaş, savunma emri, H5 korumaları); mülk kipinde **yok** (`birlik_uret` ve `savunma_emri` işletme düğümünü reddeder: `bolgeIndeksiBul` ile iki satırlık düzeltme); `Ordugâh` yapısı tanımlı değil; Mühimmat fabrikası mülk kipinde kurulabilir (talebi yalnız NPC pazarı).

**Alfa-0'da var (baş lider kararı Y-35, bayraklı):** Ordugâh (3 yuva, ₺35.000, ilde ≤2), Karakol, Gözetleme Kulesi (`mulk.ekYapilar`), Nöbet Evi (ilçe merkezi kamu hizmet hücresi); Piyade birliği, duruş ve il nöbeti; NPC eşkıya PvE baskını (hedef ilçe, ön duyuru 24 sa, 19–23 arası bir saatlik dilim); düğüm başına kayan 24 saatlik yağma defteri; ganimet (mal, ilçe haftalık tavan ₺6.500); Savunma sayfası (7 görev). Bayrak kapalıysa yalnız şema ve 3 ek yapı kaydı (ii).

**Alfa-0'da yok:** oyuncular arası il kontrol savaşları, koruma sözleşmesi ve ittifaklar (Alfa-1); askeri teknoloji (36 düğüm), doktrin, destek (Alfa-1 sonrası); E1–E3 eğlence artıları (Alfa-0 sonrası değerlendirme).

**Kilitli:** docs/12 §12 (askeri yapı ve birliklerde de "kilit yok, seçim var": §3D.0); "parsel asla el değiştirmez"; H5 korumaları (başlangıç değeri: yağma ≤%25, yapı ≤%10 devre dışı, ≥49 saat ara, 14 gün kalkan, güç farkı 1:5, parsel kaybı 0; hareketsiz oyuncuya saldırı ödülsüz); savaşı yalnız vali ilan eder; **Y-35** (Alfa-0 kapsamı) ve **Y-36** (PvP yağma %60 iletim, mülk kipinde ikmal ×0,25; kalibrasyon testleriyle).

**Açık:** savaş hazırlık alt sınırı 12–24 sa ↔ ≥20 sa (Ü-yeni-9); Karakol, Sur/Barikat, Gözetleme Kulesi yapı sayısı (Ü-yeni-3); görünen birlik adı (Tümen ↔ Müfreze); askeri teknolojide göreli ×1,5 tavan (T_A ≤ 1,5 T_B) önerisi bilim G6.

### 3.9 Canlı dünya

**Amaç.** Dünya oyuncu yokken de işler; gerçek takvim ve saatle eşleşen ritimler; NPC esnaf ve müşteri; dönüşte özet. Üç katman ilkesi: parayı, stoku ya da kararı etkileyen her şey **çekirdekte**; haber ve özet metni **sunum katmanında**; kalabalık, ışık, ses **istemcide**. Sınama: sunum katmanı kapatılınca `durumOzeti` aynı kalmalı (`sunum-kapali` testi).

**Alfa-0'da var (kod):** mutlak duvar saati (`t = duvar − dünya epoch'u`; varsayılan epoch 1 Ekim 2026 00:00 TRT; geri gitmez), kapalıyken geçen sürenin açılışta 1 sim-saatlik adımlarla yetiştirilmesi, yetişirken komutların `yetisiyor` koduyla reddi; iklim takvimi (12 aylık hasat eğrileri, olaylar); zaman yayını.

**Alfa-0'da yok (belge var, kod yok):** `IlceDurumu` nüfus, ihtiyaç kademeleri, göç; yerel NPC talebi; esnaf; olay anlatıcısı; takvim paketi (bayram hatırlatması, pazar günü, gurbetçi dönemi 15 Haziran 2027); olgu defteri ve şablon haber (İlçe Bülteni); "sen yokken" net etki; 4 yeni PRNG akışı (`dunya, sosyal, esnaf, anlatici`); kesinti adaleti (uzun kesintide olumsuz olay ön duyurusu ötelenir); kural dönemi komutu (`kural_surumu_gec`).

**Kilitli:** docs/12 §7 (mutlak zaman, 1:1, kapalıyken yetişme); K20, K21; NPC arsa sahibi / rakip firma yok; deprem yok, bayram yalnız hatırlatma; "haber LLM'siz" (şablon + olgu defteri; Ö4 çözümü).

**Açık:** canlı dünya §10'daki **10 karar öneridir** (zaman oranı ve mutlak saat hariç, sahip onaylı): olay sözleşmesi (opt-in karar fırsatı, ceza yok, ön duyuru ≥24 sa; karar 8); PRNG akış listesi (Alfa-0 kilidinden önce), zaman ızgarası (günlük kuantum + 08/12/17/20 pencereleri), olgu şeması (ilk yayından önce), para döngüsü (açık kese + MER sayacı), nüfus birimi (ilçe tek kohort), talep modeli kimliği; hassas içerik politikası (Ramazan, Kurban terminolojisi, sessiz günler: sahip onayı); ad anma rızası; iklim takvimi hızı (cesitlilik-uretim Q2 "gunCarpani = 6" ↔ 1:1; T-01).

### 3.10 Rehberlik ve dönüş

**Ayrıntı: §3C.** **Amaç.** Zorunlu öğretici yok; **Esnaf Defteri** tek nesnedir: "Bugün" (Akşam Defteri, kaldığın yer) ve "Sayfalar" (açılış, yön, Takvimden, Rehberlik A1); sıra serbest, modal ve kilit yok; durum oyundan türetilir, geriye dönük tamamlanır. Sahibin yönergesi: oyun açıldığında **"sen yokken neler oldu"** ekranı; Esnaf Defteri, ödüller ve kaldığın yer kartı geliştirilir; takvim beğenildi (docs/12 §11).

**Alfa-0'da var (kod):** Yerleş ekranı (3 ilçe önerisi, açılış önerisi), hoş geldin mesajı alanları, Dikkat paneli ve gelen kutusu.

**Alfa-0'da var (P0):** `gorevler.json` + saf değerlendirici + sunucu profil tablosu; Defter arayüzü; 3 açılış zincirinin ilk gün bölümü (≈20 kart); `sistem_odul {kavram}` + çekirdek ödül tablosu + `alinanOdul` (toplam ≈₺5.650, tavan ₺8.000, kavram başına bir kez); "kaldığın yer" kartı. P1: Takvimden sayfası (hasat, kış hazırlığı, Cumhuriyet Bayramı süsü) ve yön sayfaları.

**Alfa-0'da yok:** Rehberlik sayfası ve ödülü (A1), sözleşme/ihale/gurbetçi/bayram hatırlatma görevleri (A1+), "sen yokken" olgu tabanlı net etki (bağımlılık açık).

**Kilitli:** docs/12 §8 (rehber görevler) ve §11 (dönüş ekranı); G4 (ödül para alanı taşımaz); rehber değişmezleri (hiçbir sistem görev durumunu okumaz, metin şablondur) **öneri** düzeyindedir (G10).

**Açık:** G10 görev durumu profilde, ödül kaydı çekirdekte; GK-3 zorunluluk derecesi; GK-5 tamamlanma "sticky"; GS-4 yeniden başlangıç paketi (= S10); GS-1 `ilk_dukkan`; Açılış Tezgâhı (Ç2); dönüş ekranı içeriği ve DK-1…DK-9 kararları §3C'de.

### 3.11 Yapay zekâ sınırları

Ayrıntı §7'dedir. Özet: **var** = sunucudaki kamu ajanı (ajan arz tasarlar, kazananı kural seçer) ve kamusal alan NPC'leri (şablon öncelikli, seyrek ve tavanlı LLM); **yok** = oyuncunun kendi ajanı, oyun API'si, para basan komut, haberde ve görevde LLM, serbest metin sohbet. Alfa-0'da canlı ajan **yok** (altyapı + gölge mod).

### 3.12 Destek sistemleri: sunucu, hesap, harita, görsel

**Alfa-0'da var (kod):** tek yazar Node + `ws`, komut günlüğü ve anlık görüntü (bellek, dosya, Postgres bağdaştırıcıları), sunucu `t` damgası, idempotans, hız sınırı, iki istemci uçtan uca, kill -9 ve yeniden oynatma testleri; MapLibre L1–L3, kırıntı yolu, aksan duyarsız arama, hazır arsa, Yerleş; yürüyüş istemcisi ilk dilimi (Gebze; tıkla-git, WASD, çarpışma, mini harita, tek çizimde karakterler); OSM atıf ekranı; tasarım token'ları (`istemci/src/tasarim`, çalışma ağacı).

**Alfa-0'da yok / yapılacak:** Better Auth (magic link + Google; bugün geliştirme token'ı), Cloudflare (proxy, Turnstile, R2) ve Hetzner dağıtımı (docs/10 E24; bu turda doğrulanmadı), yönetici paneli, kural dönemi komutu ve dağıtım provası, geri yükleme tatbikatı, hukuki metinler; sunucu botlarının mülk kipini oynaması (E20-G10; çalışma ağacında `botlar/src/parsel.ts` yazılıyor).

**Kilitli:** K23, K24, K26, K29, K34; docs/12 §4 ve §9 (profesyonel görsel, tasarım ajanı); sunucuda "anonim hesap ekonomik hesap olamaz" (docs/11 §10; baslangic Ç5 "önce oyna" ile çelişir, açık).

**Açık:** görsel kimlik raporunun 9 kararı (Inter, 12 renk + `renkIndeksi`, iki birinci sınıf tema, harita etiket yolu, "illüstratif düz gölgeli + prosedürel cephe", Lucide, token kaynağı, altlık şeması, "Sen" rengi) **öneridir**; oyuncu renk sözleşmesi oyuncu rengi saklanmadan önce kilitlenmeli.


---

## 3A. Üretim ağı (sahip önceliği 1): ayrıntı

> **Kaynak.** uretim-agi-genisletme.md (dalga 4, **2. tur, onaylı**; içerik hâlâ öneri; baş lider kararı Y-34 ve docs/12 §12–§13 işlendi), dikey-zincirler-ve-perakende.md, cesitlilik-uretim-katmanlari.md, sentez G5/G13, docs/12 §8 ve §11. Aşağıdakiler **öneridir**, "kilitli" yazılanlar hariç.

**Sahibin yönergesi (docs/12 §11).** Üretim döngüsü genişler: buğday → un → ekmek; hayvancılık (inek → süt, et, deri → deri ürünleri); madencilik ve fabrikalar; üretimhaneler ve fabrikalar. Mevcut mal üretimi, 9 yeni mal ve kaynaklar artırılır; döngü geliştirilir.

### 3A.1 Ağın şekli ve dilimleri

Üç ağ, tek ilke: **bir oyuncunun çıktısı ötekinin girdisidir.** Dikeyin 7 zincirine **10 yeni zincir hattı** eklenir (toplam 17). Ağa **24 yeni tarifli mal** girer (21 yeni kimlik + planlı `misir`, `et`, `yun`; Alfa-0 +1 `kepek`, Alfa-1 +15, sonra +8) ve **32 yeni yöntem** (+2 mevcut tarife yan ürün satırı); yeni yapı türü yok (tek istisna önceden öngörülen `hafif_sanayi`, §3A.7). Rapor 14 geri dönüşü zor karar (K-1…K-14) ve üç oyuncu senaryosu (küçük atölyede kalan, ortaklıkla büyüyen, doğrudan L kuran) verir.

| Zincir | Hat | Alfa | Kısa yol (Alfa-0 biçimi) → uzun yol (Alfa-1) | Kaynak |
|---|---|---|---|---|
| **Ekmek:** buğday → un → ekmek → kendi fırının / marketin | tahıl | **A0 (P0)** | tahıl → un → ekmek; yan ürün `kepek` (öneri) → ahır → `gubre` → Tarla (ilk kapalı döngü) | dikey §3.1; üretim §5.3 |
| **Cam → pencere** (çelik doğrama) | sanayi | **A0 (P0)** | silis + elektrik → cam; cam + çelik → pencere (NPC'den ithal pencere ilk günden mümkün) | dikey §3.3–3.5 |
| **Süt → şarküteri** | hayvancılık | A0 (P1) | kısa: `sut_sigirciligi` (tahıl → süt); uzun (A1): yem → `ahir_sut_yemli` | dikey §3.6; üretim H1 |
| **Fındık → şekerleme** | tahıl/bahçe | A0 (P1) | fındık hasat dönemi dışında açılır (yumuşak pencere) | dikey §3.8 |
| **Alüminyum → doğrama** | sanayi | A0-ops | ithal boksit, `elektroliz` teknolojisi | dikey §3.2 |
| **Et ve deri:** yem → besi (`kasaplik`) → mezbaha (et + deri + gübre) → tabakhane → ayakkabı / çanta / mont | hayvancılık | A1 | tahıl → besi → doğrudan `et` (kısa) ↔ ayrık kademeler (uzun, +%10–25 katma değer; 4 kademe sınırı) | üretim §4.1 |
| **Kümes** (yumurta, piliç) | hayvancılık | A1 | `kumes_yumurta`, `kumes_pilic` | üretim H3 |
| **Yün ve halı** | tekstil | A1 / sonra | `mera_koyun_yun`, `yun_egirme` | üretim H4 |
| **Pamuk → giyim** | tekstil | A1 | dikey §3.7 | dikey |
| **Mısır, arpa, makarna, nişasta, malt, içecek** | tahıl | A1 / sonra | makarna ve hamur işi A1; bisküvi, nişasta, malt, içecek sonra | üretim T1–T3 |
| **Çimento, kablo, inşaat demiri, profil** | sanayi | A1 | `cimento_kalker`, `kablo_*`, `insaat_demiri`, `profil_haddeleme` | üretim M1–M3 |

### 3A.2 Sadeleştirme ilkeleri ("bu bir oyun", S8 sütunu)

1. **Canlı hayvan mal değildir; sürü tesisin ölçeğidir.** İnek, koyun, tavuk sayısı tutulmaz; hayvan satın alma, doğum, yaş, kesim kuyruğu yok. Tek istisna `kasaplik` (kasaplık hayvan partisi): besi ile mezbahayı ayırır ve `deri`yi doğurur.
2. **Oranlar yuvarlanır, kütle korunmaz;** cins birleştirilir (inek, manda, koyun, keçi sütü = `sut`; kırmızı ve beyaz et = `et`; yün, kıl, tiftik = `yun`; pamuk, yün, sentetik iplik = `iplik`). Cins farkı yöntem ve il imzasında yaşar; birleşik mallar **bölünmez** (üretim K-2).
3. **Kısa yol / uzun yol.** Her zincirin Alfa-0 biçimi kısa yoldur (ara kademeler birleşik, yan ürün yok ya da tek); Alfa-1 uzun yolu ekler (ayrık kademeler, +%10–25 katma değer, yan ürünler, oyuncular arası uzmanlaşma). **Kısa yol hiçbir zaman silinmez;** oyuncu karmaşıklığa kendisi girer.
4. **Çıkmaz mal yok.** Her mal en az **iki farklı tüketici türüne** sahiptir (üretim yöntemi, hane talebi, kamu siparişi, yapı maliyeti, ordu ikmali, `NpcAlici`); derleme doğrulayıcısına yetim ve çıkmaz mal testi önerilir.
5. **Zincir ≤4 işleme kademesi; yöntem başına ≤3 girdi ve ≤3 çıktı satırı; soyut hammadde** (soda, kil, boya, ilaç, tuz ayrı mal olmaz); her zincir NPC ithalatıyla ortadan başlatılabilir (zorunlu entegrasyon yok); kalite stok kalemi açmaz.
6. **Kapsam dışı:** alkollü içecek ve tütün (sahip sorusu SS-1); kurbanlık / kesim görseli ve "kurban" sözcüğü yok (canlı §5.7), et talebi bayram öncesi **talep zamanlaması** olarak görünür.

### 3A.3 Üretimhane → fabrika: yerinde ölçek

Yeni yapı değil, mevcut `tesis_olcek_yukselt` (S/M/L): çıktı ×1 / 2,2 / 3,6; işçi ×1 / 1,8 / 2,6 (işçi başına verim ×1,00 / 1,22 / 1,38); bakım ×1 / 2 / 3,2; inşa ×1 / 2,5 / 4,5; kirlilik ölçekle doğrusal (06 §12). **Ad ölçekten ve yöntemden gelir:** S atölye, M imalathane, L fabrika: "Köy Değirmeni" → "Un İmalathanesi" → "Un Fabrikası". **Ölçek bir seçimdir, ilerleme basamağı değil** (docs/12 §12–§13, Y-33): üretim raporu S/M/L'yi ve yöntem listesini ilçe gelişim seviyesine (Köy/Kasaba/Merkez) bağlıyordu; bu bağ **kalktı**; L ölçeğin `otomasyon` teknoloji kilidi de **mülk kipinde kalktı** (Y-32: teknoloji verim/maliyet avantajıdır, bölge kipi altınları değişmez); kısıtlar yalnız sermaye (inşa bedeli), ayak izi (**ölçekle büyür, Y-34 = üretim K-14:** `olcekHucre[tür] = [yuva, yuva+1, yuva+2]`, en çok 5 hücre, bağlı kenar-bitişik küme; örnek Çelikhane 3 / 4 / 5, Tarla 2 / 3 / 4; doğrudan kurulumda baştan alınır; yerinde yükseltmede ek bitişik hücreler kendi boş hücren olmalı ya da aynı atomik işlemde satın alınabilmeli, yoksa yükseltme yapılamaz ve başka yerde doğrudan büyük kurulur; fiziksel koşul, kilit değil; ≤72 hücre ve ≤%25 geçerli), girdi, işgücü, elektrik ve işletme gideri (bakım ×1/2/3,2) olur (§5.3 KL-05, KL-06). Mandıra, mezbaha, tabakhane, yem fabrikası **bina adı yöntemden gelir** (tek `gida_fabrikasi` / `hafif_sanayi`, `yontem_degistir`). **Doğrudan büyük kurulum** (üretim K-9, K-13; öneri): sermayesi olan atölyeden geçmeden M ya da L kurar; mülk kipinde `tesis_insa_hucre` ve `yapi_yerlestir` komutlarına 0/1/2 değerli `olcek` alanı eklenir (bölge kipinde `tesis_insa`); maliyet = tür inşa maliyeti × ölçek çarpanı, ayak izi o ölçeğin hücre sayısıdır. Bu komut şeması değişikliği Alfa-0 öncesi karardır (§6.4 AÖ, §8.1). Yeniden donatım Alfa-0'da ücretsizdir; Alfa-1'de bedelli (inşa maliyetinin %20'si, 6 sa duruş) önerilir. Üretim raporunun "M → L için +1 hücre, varsayılan 0" (`olcekEkHucre`) önerisi Y-34 ile **ölçek başına ayak izi** kuralına dönüştü.

### 3A.4 Karmaşıklık bütçesi

Mal sayısı üstten sınırlı değildir, **görünen mal sınırlıdır** (üretim §8):

| Sınır | Değer | Not |
|---|---:|---|
| Tek ekranda mal çipi | ≤ 9 | aile sekmesi (5 aile: Tarım ve Gıda, Hayvancılık, Tekstil ve Deri, Yapı ve Maden, Enerji ve Teknoloji) |
| Açık mal: başta / ilk ay / Alfa-1 sonu etkin | ≤ 16 / ≤ 24 / ≤ 36 | cesitlilik S-2'nin 28 tavanı 36'ya revize önerisi (T-41) |
| Zincir kartı | ≤ 4 kademe, ≤ 6 mal | tek bakış |
| Tesis türü başına yöntem | ≤ 10 | `gida_fabrikasi` 18 yönteme çıkıyor: Alfa-0'da tek yapı ve seçici 3 aileli; ölçümde (UA2) >10 kalırsa ayrı tür (üretim K-7); `celikhane` 10 yöntem (K-8) |
| Oyuncu başına haftada yeni mal | ≤ 3 (yeni zincir ≤ 1) | Defter "yeni sayfa" ritmi |

**Görünürlük:** ara mal sessizliğidir; zincir ara malı (`yem`, `kasaplik`, `kepek`, `islenmis_deri`...) yalnız o zinciri işleten ya da stoğunda tutan oyuncuya pazar ekranında görünür. Katalog (kümülatif, üretim §8.1): Alfa-0 **23** (kilitli; `kepek` ile 24), A0-ops 28, Alfa-1 47, sonra 55 mal (bu raporun Tier 1 ağı; il imza malları ayrıdır).

### 3A.5 Hayvan refahı (oyunsu, sade)

Yeni mekanik değil, mevcut `bakim_duzeyi`nin hayvan tesislerindeki yüzü: **Sürü Sağlığı** göstergesi çıktıyı ×0,80–1,08 oynatır; ilçe olayı `sure_hastaligi` (şap, kuş gribi; Alfa-1+) yalnız düşük sağlığı vurur; hayvan ölümü gösterilmez, "üretim aksıyor" denir (sahip sorusu SS-4).

### 3A.6 Alfa-0 dokunuşu

Kilitli: **24 mal** (23 + `kepek`: baş lider, Y-37), 4 zincir, tek yeni yapı `dukkan`. Kabul edilen en küçük ek (üretim §9.1): **24. mal `kepek`** (değirmen çıktısına yan ürün) ve `sut_kepekli` yöntemi (ilk kapalı döngü: Tarla → değirmen → kepek → ahır → gübre → Tarla); çıkmaz-mal doğrulayıcısı uyarı olarak; kepek/gübre için küçük bütçeli `NpcAlici` güvence kaydı; basit bağlama duyarlı mal listesi. **SS-2 karara bağlandı (Y-37):** 23 → 24, G5 kilidi genişledi; üretim K-4 gereği tarif satırı yöntemin kendisine, Alfa-0 verisi yazılmadan önce işlenir. **Alfa-0'a girmeyenler:** yem fabrikası, mezbaha, deri, makarna, bisküvi, nişasta, malt, kablo, inşaat demiri, profil, kireçtaşı, hayvan sağlığı göstergesi.

### 3A.7 Durum özeti

| Konu | Durum |
|---|---|
| 24 mal (23 + `kepek`), 4 zincir, `dukkan` | **kilitli** (G5, G11; docs/12 §10; `kepek`: Y-37) |
| Hayvancılık, madencilik, fabrika yönü ve "üretimhane → fabrika" | **kilitli yön** (Y-26); ayrıntı **öneri** (uretim K-1…K-14) |
| `kepek` 24. mal (**kabul edildi: Y-37**; üretim K-4, K-5: tarif satırı **yöntemin kendisine**, Alfa-0 verisi yazılmadan önce) ve kimlik ekinin tamamı (**24 tarifli mal = 21 yeni kimlik + planlı `misir`, `et`, `yun`**; üretim K-1) | **Alfa-0 öncesi** (kimlik kilidi, ilk `icerik.json` ve `il-imza.json` commit'inden önce) |
| `hafif_sanayi` 20. yapı ve deri/tekstil yöntemlerinin hangi tesiste doğduğu (üretim K-6; `gida_fabrikasi` 18 yöntem K-7, `celikhane` 10 yöntem K-8) | **Alfa-0 öncesi** (ilk veri sürümünde; sonradan taşımak canlı tesisleri bozar) |
| `kasaplik` mal olması; `et`, `sut`, `yun`, `iplik` birleşik kalması | öneri; Alfa-0 öncesi kilit |
| Senaryo 1 bilançosu (üretim §4.4: Alfa-0, 24 mal, Hendek): hibe ₺50.000 hepsine yetmez, nakit toplamı ≈₺52.300, ≈₺2.300 açık fırın gelirinden kapanır; 11 hücre (6 bedava yurt + 5 satın alınan), 6 yapı, zincir katma değeri ≈₺6.200/sa | **öneri** (kalibre edilmedi; yeni oyuncu paketi ₺50.000 / yurt 6 hücre ile tutarlı, V-tablosundaki başlangıç değerlerine bağlı) |
| Ölçek ve yöntemin ilçe seviyesine bağlanması (üretim §7.2, §7.4) | **docs/12 §12 ile çelişir:** kaldırılır, kısıt sermaye, ayak izi, girdi, işgücü, elektrik, gider (§5.3) |
| Kodda | bu raporun hiçbir parçası yok: 14 mal, 24 yöntem, 18 tesis türü; `tesis_olcek_yukselt` bölge kipinde çalışıyor, **mülk kipinde doğrulanmadı**; `olcekHucre = [yuva, yuva+1, yuva+2]` (Y-34) kodda yok, `mulk.yapiYuva[tür]` tek sabit |

---

## 3B. Perakende kademeleri (sahip önceliği 2): ayrıntı

> **Kaynak.** perakende-kademeleri.md (dalga 4, **3. tur, onaylı:** Ar-Ge lideri incelemesi, sahip yönergesi ve baş lider kararları işlendi; öneri; sayılar el hesabı betiğinden, kalibre edilmedi), dikey-zincirler-ve-perakende.md §5, imza N14, G11/G12; **sahip kararı docs/12 §12 (Y-31)**, baş lider kararları docs/12 §13: Y-33 (ilçe seviyesi) ve Y-34 (ayak izi). **Kesin hâl (onaylı):** `olcekHucre = [1, 2, 3]`; süpermarket doğrudan inşa edilebilir; Yakınlık Havuzu kademeye bağlı ("şube ≤5" kalktı); pay tavanı kademeli (n=1 yok, n=2 %70, n≥3 %50; Alfa-0'da kapalı); esnaf kampanya eşiği %75 önerisi; tür verisinde ilçe seviyesi alanı yok; mal × kanal bulgusu: `elektronik` ve `gubre` perakende çıkışsız; Alfa-0 dilimi bakkal, fırın, şarküteri, şekerci, yapı market (bu rapordan Alfa-0'a 0 yeni kural). Sahibin yönergesi (docs/12 §11): perakende kademeleri bakkal, market, süpermarket; üretimhaneler ve fabrikalar.

### 3B.0 İlke: kademeler iş modelidir, ilerleme merdiveni değil (kilitli)

Bakkal, market ve süpermarket oyuncunun **seçtiği iş modelleridir.** **Açılışı ne ilçe seviyesi (Köy/Kasaba/Merkez) ne "önce bakkal" sırası ne de başka bir ön koşul kısıtlar;** tür verisinde ilçe seviyesi alanı yoktur. Kısıtlar yalnız **ekonomik** (sermaye, işletme gideri, talep) ve **koruma** kuralıdır (arsa niteliği ve ayak izi, pay tavanı, ilçe başına sayı, ruhsat kotası). İlçe gelişim seviyesi dükkân açılışını değil yalnız **açık ihtiyaç kademelerini** (talep) belirler (Y-33): giyim ya da yapı market erken ilçede açılabilir, talep açık değilse satışı küçüktür ve Dikkat paneli bunu yazar (**kilit değil sonuç**). Küçük ilçede süpermarketin zayıf kalması da ekonomik sonuçtur (5 bin nüfuslu ilçede L net −₺36/sa, S +₺102/sa). Dükkân türünün mal listesi ilçe seviyesine göre kısıtlanmaz.

| Seçtiğin iş modeli | Yol | Kısıt / risk |
|---|---|---|
| **Bakkalda kal** | S dükkân; Yakınlık Havuzu; ucuz, hızlı geri ödeme (≈16–23 sa) | dar çeşit (4–6 raf), düşük tavan |
| **Aynı yerde büyü** | `dukkan_yukselt` ile S → M → L (seçenek) | sermaye farkı; ek hücre (Y-34) |
| **Kendi markanla bakkal zinciri** | aynı marka altında çok sayıda S dükkân | Z1 + marka rafı ve ortak pay tavanı; şubeyi markete çevirirsen Yakınlık Havuzu'nu kaybedersin |
| **Sermayeyle doğrudan süpermarket** | L'yi doğrudan inşa (madencilik, askeri/koruma işi ya da kaynak satışı geliriyle) | sermaye (≈₺51.480), ayak izi, işletme gideri, ruhsat kotası, ilçede ≤1 süpermarket |
| Karışık | marka altında S, M, L bir arada | ilçede ≤2 dükkân, ilde ≤6 |

### 3B.1 Kademe tablosu (G11 korunur: tek `dukkan`, kademe = ölçek + tür, veri)

| Alan | K0 Açılış Tezgâhı | K1 Bakkal (S) | K2 Market (M) | K3 Süpermarket (L) |
|---|---|---|---|---|
| Tür kimliği | `tezgah` | `bakkal` | `market` | `supermarket` |
| Arsa / ayak izi (**`olcekHucre[tür] = [yuva, yuva+1, yuva+2]`, en çok 5 hücre**, Y-34; dükkân için `yuva` 1 olduğundan **1 / 2 / 3**: T-49) | kamu pazar yeri yuvası, hücre yok | 1 hücre | 2 hücre | **3 hücre** (tür verisinde gerekçeli istisna alternatifi `[1, 2, 2]`: süpermarket 2 hücre, M→L hücresiz) |
| Arsa niteliği | kamu pazar yeri | Konut ○ / Ticari ✓ | Ticari ✓, Konut ✗ | Ticari ✓ + cadde/ana yol cephesi, Konut ✗ |
| Açılış | yeni oyuncu, ilk 14 gün | **sermaye + arsa + limitler** | aynı | aynı + **N14 ruhsat kartı ve kotası** |
| Raf / çeşit yuvası | 2 | 4 (en çok 6) | 6 (en çok 10) | 8 (en çok 14) |
| Kasa (birim/sa) | 20 | 90 | 198 | 324 (+%25 ikinci kasa modülü) |
| Çekim çarpanı (yeni) | 0,6 | 1,0 | 1,6 | 2,4 |
| İşletme gideri (≈₺/sa) | ≈0 | 132 | 204 | ≈330 (≈420'ye çıkabilir) |
| İnşa (≈₺ eşdeğeri) / süre | parasız, anında | ≈11.440 / 4 sa | ≈28.600 / 6 sa | ≈51.480 / 8 sa |
| Yükseltme (**seçenek**) | → K1 | → K2: fark ≈17.160 | → K3: fark ≈22.880 | — |
| Mal listesi | 2 mal (kendi seçimi) | `gida, ekmek, un, sut, sut_urunu, sekerleme, findik_urunu, yakit` | bakkal ⊂ + `zeytinyagi, kuru_meyve, bal, cay` | market ⊂ + `kagit, bakliyat, hazir_giyim, elektronik` (küçük raf) |

**Doğrudan inşa ↔ yükseltme (karar 13).** Toplam para eşittir (11.440 + 17.160 + 22.880 = 51.480 = doğrudan L); yükseltme +3 sa sürer, her aşamada eski kademe çalışır (satış kesilmez); yükseltme **ucuz kestirme de ceza da değildir ve hiçbir kademe için zorunlu yol değildir.** `dukkan_yukselt` **yeni bir komuttur** (çekirdekte `tesis_olcek_yukselt` yalnız sanayi tesislerindedir; ek yapılara uygulanmaz). Yatırım Tahmini kartı kademe seçerken tahmini satış, kasa doluluğu, net ₺/sa ve geri ödeme gösterir: **kilit yerine bilgi.** Alfa-0'da yalnız 7 mal rafa uygundur; market ve süpermarket çeşit çarpanını tam alamaz: üst kademelerin değeri **içerik büyüdükçe** artar.

**Ayak izi (Y-34).** Doğrudan kurulumda o ölçeğin ayak izi baştan alınır; yerinde yükseltmede ek bitişik hücreler oyuncunun kendi boş hücreleri olmalı ya da aynı **atomik** işlemde satın alınabilmeli (kamu arsası alınamaz, ≤72 hücre ve ≤%25 geçerli); olmazsa yükseltme yapılamaz, oyuncu başka yerde doğrudan büyük kurar (fiziksel koşul, kilit değil). Perakende raporu (3. tur, onaylı) bu kurala göre güncellenmiştir: `olcekHucre = [1, 2, 3]`; süpermarketi 2 hücrede tutmak isteyen `[1, 2, 2]` istisnasını tür verisinde gerekçeyle yazar; parametre yeni kurulumlarda değişebilir, mevcut yapıların hücre sayısı değişmez (perakende §14 karar 3; T-49). Süpermarket doğrudan inşa edilebilir; yerinde yükseltme yalnız seçenektir.

### 3B.2 Marka ve zincir (oyuncunun kendi kimliği, birinci sınıf)

- **Marka kaydı:** ad (2–24 karakter), simge, renk; hesap başına ≤3 marka; her dükkân bir markaya bağlı; **gerçek marka/zincir adları yasak listesi** (K34; BİM, A101, ŞOK, Migros ve türevleri); karışık kademe serbest; marka tabela, vitrin ve panelde görünür, **çekimi etkilemez**. Marka ve tabela Alfa-0'dan kozmetik olarak desteklenir (Y-31).
- **Zincir Kartı** (türetilmiş kart, yapı değil; **marka başına ve kademe karışımından bağımsız**): Z1 ≥3 dükkân (gider −%3, ortak şablon), Z2 ≥6 (−%6, merkezi tedarik paneli, yeni şube inşa −%10), Z3 ≥10 (−%10, tanınırlık rozeti). Bunlar **avantaj eşikleridir**, zincir kurmanın önkoşulu değil. Bedel: **marka rafı** (her şubenin yuvalarının %50'si ortak kataloğa kilitli, ±%5 fiyat bandı), ortak pay tavanı ve ortak sicil. İndirimler bilerek küçüktür (S'te −%3 ≈ ₺4/sa/şube): asıl kazanç çoklu ilçe ölçeğidir. **Tedarikçi fiyatı sıkıştırılamaz** (sözleşme bandı [0,95; 1,05] R).
- **Yakınlık Havuzu** (oyuncu havuzunun %15'i) **bakkal kademesine bağlıdır, şube sayısına değil** (eski "şube ≤5" önerisi kaldırıldı): bakkal zinciri bu nişi şube sayısıyla kaybetmez, yalnız şubeyi markete/süpermarkete çevirince kaybeder; bakkal başına ≈ +%7 satış; N14 İM14.1 için mekanik taban.

### 3B.3 Tekelleşme korumaları (kalan kısıtlar)

| Mekanizma | Değer (öneri) |
|---|---|
| **Oyuncu pay tavanı** | **kademeli:** ilçedeki perakendeci oyuncu sayısı n için n=1 tavan yok, n=2 %70, n≥3 %50 (mal ailesi başına, hesap bazlı); **Alfa-0'da yok** (kasa kapasitesi zaten bağlayıcı: esnaf hacmin %73–91'ini tutar); Alfa-1'de n≥2 olunca açılır. Sabit %50, ince dünyada tek oyuncunun neti %61 düşürürdü |
| **Sayı sınırları** | ilçede ≤2 dükkân ve ≤1 süpermarket; ilde ≤6 dükkân ve ≤2 süpermarket |
| **Ruhsat (yalnız süpermarket)** | N14 kartı (Serbest / Kota / Kapalı); kota NPC zincir ile **ortak**; bakkal ve market muaf; "Kapalı" ilçede mevcut hak kalır |
| **Fiyat rekabeti** | band [0,7; 1,4] R korunur (G12); 0,85 R altı "kampanya": günde ≤6 sa, haftada ≤2 gün; esnaf tabanı %25. Betik: pay tavanındaki zincir fiyatı 0,97 → 0,80 R çekerse satışı değişmez, net ≈₺3.100/sa kötüleşir: **fiyat savaşı kendini cezalandırır** |
| **Dini bayram** | dükkân açık/kapalı kuralı doğurmaz; yalnız talep zamanlaması ve hatırlatma (docs/12 §7) |

### 3B.4 Tür kataloğu, kanal matrisi, üretici ve tedarik

Altı dikey tür (fırın, bakkal, şarküteri, şekerci, yapı market, giyim) üzerine: `market`, `supermarket`, `kasap`, `manav`, `mobilyaci` (mal bağımlı; A1+), `toptan` (B2B, NPC müşteri çekmez, Alfa-1 son), `tezgah` (13 kayıt; üretim raporu ayrıca "ayakkabı ve deri" türü önerir: T-37). Türlerin eski "açıldığı ilçe seviyesi" sütunu kalktı (Y-33). **Mal × satış kanalı matrisi** (çıkmaz mal denetimi): `elektronik` ve `gubre` rafsız bulundu; `cam`, `un`, `sut`, `findik_urunu` dikey listelerine eklendi; 11 mal "yalnız ithal" işaretli (raf yuvası payı ≤%15 hedef). **Üretici satış noktası** yapı değil **modüldür** ("Yerinde Satış": çiftlik tezgâhı, fabrika satış mağazası): tesisin kendi çıktısından 2 yuva, kasa ≤40 birim/sa, doğrudan satış havuzu (oyuncu havuzunun %10'u), komisyonsuz, ek hücre yok. Alfa-1 B: raf tedarik sözleşmesi (P5 bağımlı; teminat = 1 günlük teslim değerinin %20'si), **marka etiketi** (çekimi **etkilemez**), satış bilgisi (tedarikçiye), toptan deposu (NPC talebi yaratmaz); konsinye, veresiye, franchise sonra.

### 3B.5 Yeni oyuncunun ilk dükkânı

Saat 0: Açılış Tezgâhı (kit stoğundan 200 birim `gida`); ilk 24–36 saat: **bakkal** ≈₺10–12 bin (hibenin ≈%20–24'ü; ilk 5 yapıda %30 indirimle daha az), geri ödeme ≈22 saat (N14 en kötü durumda ≈32 saat); yeni bakkalın payı Yakınlık Havuzu sayesinde sıfıra düşmez. Yeni oyuncu tarım yönünde önce çiftlik tezgâhı modülüne de gidebilir. Dükkân ilçe gelişim puanına katkı verir (kolektif etki).

### 3B.6 Alfa dilimleri ve durum

| Dilim | İçerik (perakende §12.3) |
|---|---|
| **Alfa-0 (en küçük dilim)** | `dukkan` **S**: bakkal, fırın, şarküteri, şekerci, yapı market + Açılış Tezgâhı; fiyat önayarı; **marka adı ve tabela** (kozmetik); bu rapordan Alfa-0'a **yeni kural, komut ve kavram eklenmez**. **Bağımlılık:** yerel pazar kanalı (canlı dünya A0-2; P0'a girdi: Y-37) |
| **Alfa-1 A1 (kademe)** | market (M), kademe çarpanı, Yakınlık Havuzu, kampanya sınırı, **doğrudan M/L inşa**, `dukkan_yukselt` |
| **Alfa-1 A2 (büyük mağaza ve ölçek)** | süpermarket (L), ruhsat + kota, kademeli pay tavanı, marka, Zincir Kartı |
| **Alfa-1 A3 / B** | üretici modülü; raf tedarik sözleşmesi, marka etiketi, satış bilgisi, toptan deposu, kasap/manav |
| **Sonra** | konsinye, veresiye, mobilyacı, franchise, kooperatif bakkalı |

Alfa-0'da market/Yakınlık/tavanın olmamasının sayısal gerekçesi: N14 yok (z=0), bakkal kasa-sınırlıdır (90 birim/sa), Yakınlık %15 ve pay tavanı fark yaratmaz; M yükseltmesi yatay büyümeyle (ikinci S) aynı verimdedir. **Gözlem kapısı:** S dükkânların ≥%50'si 7 gün kasa doluluğu ≥%90 ve ikinci dükkân limitine dayanmışsa **M erken açılır.** Bu, bir oyuncuya konmuş bir kilit değil, **özelliğin dünyaya açılış zamanlamasıdır;** ancak sahibin "sermayesi olan doğrudan süpermarket açar" ilkesinin Alfa-0'da görünür olması isteniyorsa market ve süpermarketin (korumalarıyla) Alfa-0'a çekilmesi **karar gerektirir** (T-43).

| Konu | Durum |
|---|---|
| Kademeler seçimdir; kilit ve sıra yok; kısıt sermaye, arsa/ayak izi, gider, tekelleşme koruması; yükseltme seçenek; marka ve tabela kimliği; ilçe seviyesi şartı yok | **kilitli** (docs/12 §12; Y-31, Y-33) |
| Ayak izi ölçekle büyür (`olcekHucre = [1, 2, 3]` tür verisinde; süpermarket 3 hücre, `[1, 2, 2]` gerekçeli istisna alternatifi; yükseltmede ek hücre kendi boş hücren ya da atomik satın alma) | **kilitli** (Y-34, docs/12 §13); dükkân değerleri perakende kesin hâlinde `[1, 2, 3]` |
| Tek `dukkan` yapısı, tür = veri; fiyatı oyuncu belirler; ithal alıp satmak meşru | **kilitli** (G11, G12; S4, S6) |
| Kademe sayıları, Yakınlık Havuzu (kademeye bağlı), kademeli pay tavanı, marka/zincir kartı, kampanya sınırı, doğrudan = yükseltme maliyeti | **öneri** (perakende §14, 3. tur onaylı: 13 geri dönüşü zor karar; ilk `icerik.json`'dan önce: k1, k4, k12) |
| Alfa-0 payı (yalnız S ↔ seçim ilkesinin görünürlüğü), kampanya penceresi, zincir eşikleri ≥3/6/10, esnaf kampanyası eşiği %60 → %75, M erken açılış kapısı | **açık** (perakende §15 sorular) |
| Kodda | `dukkan`, raf, kasa, çekim çarpanı, marka, ruhsat, zincir, `dukkan_yukselt` yok; yalnız Ticaret ofisi var |

---

## 3C. Dönüş deneyimi (sahip önceliği 3): ayrıntı

> **Kaynak.** donus-deneyimi.md (dalga 4, **2. tur, onaylı**; içerik hâlâ öneri), rehber-gorevler.md §2, canlı dünya §6, harman §3.2. Sahibin yönergesi (docs/12 §11): oyun açıldığında "ne oldu, sen yokken neler oldu" açılış ekranı; Esnaf Defteri, ödüller, kaldığın yer kartı geliştirilir; takvim beğenildi.

### 3C.1 İlke

Açılış ekranı **yeni bir sistem değil**, mevcut parçaların (net sonuç, biten işler, gelenler, bülten, takvim, komşular, tek öneri) tek sakin yüzde buluşmasıdır; Defter'in **"Bugün"** sayfasının ilk görünümüdür. Hepsi çekirdek durumundan ve olgudan **şablonla** üretilir (LLM yok). Hedef: ilk görünümde ≤8 satır, ≤90 kelime, ortanca ≈12 sn okuma, `Devam` ilk milisaniyeden etkin. **Engelleyici değildir** (modal yok); **"uğramazsan kaybedersin" baskısı yoktur** (bildirimde suçluluk dili, seri, "seni özledik" yok). Oyuncuya görünen adlar: sekme **"Bugün"**, ekran başlığı **"Sen yokken"**; "Akşam Defteri" iç terim (gün kapanışı satırı).

### 3C.1a Yokluk bantları

| Bant | Yokluk | Yüz |
|---|---|---|
| K0 | < 1 sa | yok; yalnız Dikkat paneli |
| K1 | 1–6 sa | tek satırlık şerit |
| K2 | 6–48 sa | **Gün Sayfası** (ana ekran; açık defter: sol "Defterin", sağ "Bülten") |
| K3 | 2–7 gün | Hafta Sayfası (gazete düzeni, Pazar Gazetesi manşeti) |
| K4 | 7–14 gün | Hafta Sayfası, sıkıştırılmış |
| K5 | 14–45 gün (uyku) | "Yurdun seni bekliyordu": ana kart "Üretimi yeniden aç" |
| K6 | 45–90 gün (çürüme) | + "Yapıların yıpranmış": ana kart "Onarım" |
| K7 | ≥ 90 gün | "Alacağını gör", ardından "Yeniden başlangıç" (S10 açık) |

Her bantta ana kart **bir** tanedir; sık giren oyuncuya ekran tekrarlanmaz; "Girmek yeter" cümlesi uyku bantlarında yazılıdır. Bakım kesintisi özette gösterilmez (dünya akmıştır; yokluk süresi onu kapsar).

### 3C.2 Bloklar ve Alfa durumu

| Blok | İçerik | Alfa |
|---|---|---|
| B0 başlık | selam, tarih, yokluk, iklim bir satır | A0 |
| B1 net sonuç | hazine farkı (satış / gider / diğer), en çok 3 mal üretim, stok uyarısı | A0 (neden etiketi: yalnız piyasa ve senin kararın) |
| B2 biten işler | inşaat, araştırma, hasat, teslim | A0 |
| B3 gelenler | kamu siparişi (A0); ihale, sözleşme, anlaşma (A1) | A0 / A1 |
| B4 bülten | ilçe bülteni (A0-3), il gazetesi ve haftalık rapor (A1-2); "çay ocağından" yalnız doğrulanmış yaklaşan olay ipucu | A0-3 / A1 |
| B5 takvimden | ≤2 madde: hasat, kış hazırlığı, Cumhuriyet Bayramı süsü, bayram hatırlatması | A0 (kısmi) |
| B6 komşular | katman 3 adsız pazar (A0); katman 2 rızalı, katman 1 adlı (A1) | A0 / A1 |
| B7 öneri | tek öneri + "çünkü" + `Git` (öneri motoru, yapılabilirlik filtreli) | A0 |

**"Komşular" gözetim aracı değildir:** (1) sana doğrudan yönelen eylemler (adlı), (2) kamusal olgular (yalnız ad anma rızasıyla adlı), (3) toplu adsız pazar hareketleri. **Yasak liste:** başkasının çevrimiçi durumu, son görülme, stoğu, parası, konumu, tek kişiye bağlanabilen ayrıntı; test: B6 yalnız `kamusal` alanlara erişir.

### 3C.3 Kaldığın yer, damga, ödül, takvim

- **Kaldığın yer kartı** ekran kapandıktan sonra Dikkat panelinde bir **çip** olarak yaşar: bağlam, ≤3 yarım iş (pasif tesis, bekleyen inşaat, dolu depo, yarım **taslak** yerleşim: sunucu profilinde 7 gün; çekirdek dışı), tek öneri. Çip yalnız yarım iş varsa görünür; "bugün yapacak bir şey yok" meşrudur.
- **Defter ilerlemesi damgadır:** kavram tamamlanınca sayfaya damga vurulur; **yüzde, sayı ve boş yuva yok**; sıralama ve kıyas yok; Esnaf Kartı vitrini opt-in (≤3 damga). Defter yaşlanır: gün 1–7 öğretici, 7–30 "Ufuk", sonra **Hatıralar** (aylık kişisel günce, olgudan şablonla; A1).
- **Ödül v2:** para ve mal taşıyan kavramlar çekirdek `alinanOdul` kapısında (G4; tavan ₺8.000, kavram başına bir kez); **yalnız kozmetik/bilgi** taşıyan ≈16 yeni kavram (tezgâh örtüsü, tabela çerçevesi, damga, kitabe satırı, türetilmiş unvan etiketi, Atlas satırı) **profil tablosunda**, çekirdeğe dokunmaz. Değişmezler: **zaman sınırlı kozmetik yok**, etkinlik kozmetiği giriş şartı aramaz, **ikinci "dönüş ödülü" yok** (yalnız `ilk_donus`).
- **Takvim:** üç görünüm (ajanda, ay, yıl şeridi = iklim takvimi); yedi olay türü (pazar günü, iklim/hasat, resmî gün ve bayram **hatırlatması**, seçim, ihale ve hak, dünya olayı ön duyurusu, kişisel); anma günlerinde (17 Ağustos, 6 Şubat, 10 Kasım) madde gösterilmez, yalnız şenlik/süs kapanır (sahip onayı bekler). **Bildirim varsayılan kapalı**, yalnız niyet anında izin; günde ≤2; sessiz saat 22:00–08:00 TRT; Web Push ve e-posta Alfa-1+; Alfa-0'da yalnız oyun içi hatırlatma. Üst çubuk takvimi gerçek tarihe (Europe/Istanbul) geçmeli (istemci bugün sim-saatine bağlı; T-42).

### 3C.4 Veri ve maliyet

Özet **sunum katmanıdır** (çekirdeği okur, yazmaz, `durumOzeti`'ne girmez). **İki çapa** profil tablosunda: `sonGorulen` (çıkış anı anlık görüntüsü) ve `ozetOkunduT`; oyuncu başına ≤200 özet kaydı (≤30 gün TTL, ≈20 KB); kayıt zamanı olayın sim zamanıdır, yazım idempotenttir ve **kapalıyken yetişme sırasında da** çalışır; saklanan olgudur, metin render anında (KVKK, ad anma rızası). **Çalışma zamanı LLM önerilmez** (gecikme 1–3 sn, determinizm, KVKK, enjeksiyon; tahmini ≈$270–$2.300/ay).

### 3C.5 Alfa dilimleri ve durum

| Dilim | İçerik |
|---|---|
| **A0 en küçük dilim (öneri)** | D1 `donusOzeti` saf modülü, D2 iki çapa, D3 özet kayıtları (yetişmede de çalışan kancalar), D4a Gün Sayfası (B1, B2, B3, B7; Defter "Bugün" içinde), D5 şablon deposu (≈12 aile × ≈4 varyant); kaldığın yer kartı rehber B6 ile ortak iştir; ek iş ≈3 M + 1 S |
| **A0 P1** | K1 şerit, B0, B5 ≤2, B6 katman 3, telefon 3 sayfa, taslak, takvim ajanda/ay ve oyun içi hatırlatma, 3–5 yeni damga |
| **A0-3 / A1** | bülten, Pazar Gazetesi, Komşular katman 1–2, Hatıralar, adlı özetler, hak/ihale takvimi |
| **A1+** | Web Push, e-posta digest, `.ics`, arşiv hakkı |

| Konu | Durum |
|---|---|
| Yön: "sen yokken" ekranı, Esnaf Defteri, ödüller, kaldığın yer, takvim | **kilitli yön** (Y-27) |
| Ekran adı, bantlar, bloklar, damga, "Komşular" katmanları, bildirim ilkeleri | **öneri**; 9 geri dönüşü zor karar (DK-1…DK-9): iki çapa, kamusal veri sınırı, olgu referansı saklama, kozmetik kapısı (profil), damga gösterimi, zaman sınırlı kozmetik yok, ikinci dönüş ödülü yok; **DK-1/2/3/4/6 Alfa-0 öncesi**, DK-8/9 Alfa-1 öncesi |
| Alfa-0 P0 listesine dahil mi (D1–D3, D4a, D5) | **açık** (docs/12 §10 P0 sırasında yok; donus §7 "Esnaf Defteri P0'ın hemen arkasına" önerir) |
| Açık sorular DS-1…DS-10 (ekran adı, selam şeridi, hesap koruma e-postası, damga vitrini, Web Push zamanı, A/B) | **açık** |
| Kodda | iki kare farkından gelen kutusu (`gelen-kutusu.ts`, en çok 40 olay), Dikkat paneli, `hosgeldin`; özet kayıtları, çapalar, takvim sayfası yok |

---

## 3D. Askeri katman (sahip isteği): rutin, arsa dünyasına oturtma, Alfa-0 PvE dilimi, Alfa-1 il kontrol savaşı, adalet

> **Kaynak.** askeri-katman-v1.md (dalga 4, **2. tur, onaylı**; içerik öneri, kalibre edilmedi; Ar-Ge lideri ve baş lider kararları işlendi), docs/11 §7.7 ve ek karar 2; cesitlilik-yonetim-askeri-teknoloji.md §5; bilim-teknoloji-askeri.md §5–§6; docs/12 §12–§13; **baş lider kararı Y-35 (Alfa-0 askeri kapsamı) ve Y-36 (para korunumu)**. Bu bölüm v1.1'dir: önceki sürümde rapor yoktu, şimdi onunla hizalandı. "Kilitli" yazılanlar hariç her ayrıntı **öneridir**.

### 3D.0 Seçim ilkesi (docs/12 §12) ve dört iş modeli

"Kilit yok, seçim var" askeri yapı ve birliklere de uygulanır (rapor K1): Ordugâh, Karakol, Gözetleme Kulesi ve birlik türleri **ilçe seviyesi, rütbe, "önce şu görev" gibi sıra ya da seviye şartıyla değil**, yalnız **sermaye, uygun arsa, girdi** (mühimmat, gıda, çelik, yakıt), **işletme gideri (ikmal ve maaş)** ve **H5 adalet korumalarıyla** sınırlanır. Teknoloji **birlik türü açar**, ilerleme fazı olarak sunulmaz (ağaç ekranında "yeni seçenek"). Dört iş modeli ve referans (M0):

| # | İş modeli (seçim) | Ne yapar | Asgari yatırım (taban fiyat) | Alfa |
|---|---|---|---|---|
| M0 | Askeri yapmayan | Nöbet Evi'ne ve komşularına güvenir; isterse Karakol alır | 0 ya da ₺7.840 | A0 (eşit derecede meşru; askeri ayak isteğe bağlı) |
| **M1** | Kendini savunan | Kendi tesislerini ve ambarını korur: Karakol ± Ordugâh + birkaç tümen | Karakol ₺7.840; Ordugâh ₺35.000 + 2 tümen ₺17.400 | A0 |
| **M2** | Koruma hizmeti | Ordusunu başkalarının yapılarını koruyacak biçimde taahhüt eder; alıcı onaylı, tavanlı haftalık ücret | Ordugâh + ≥4 tümen ≈ ₺69.800 | A1 |
| **M3** | Savunma tedarikçisi | Ordu kurmadan mühimmat, çelik, gıda, yakıt tedarik eder (sözleşme makası ≈%14) | Mühimmat hattı ≈₺30.000 + zincir girdileri | A0 / A1 |
| **M4** | İl kontrolüne talip | İttifak ve sefer katkısıyla il kontrol savaşına katılır; vali ya da komutan olabilir | Ordugâh + ordu (≤24 birim/işletme) | A1 |

Hepsi aynı anda ve herhangi bir sırayla başlanabilir; yön değiştirmenin tek bedeli ekonomiktir. Docs/12 §12 taramasında askeri alanda kilit sayılan üç öneri sürer (§5.3): KL-10 (sivil düğümün askeri düğüm için tek yönlü ön koşulu), KL-11 (Model III ve doktrin III için ilde ≥3 bağımsız sahibin savunma sanayii zinciri), KL-12 (Hava savunma yalnız hava tehdidi olan ilçede); öneri: kapı değil **maliyet ve verim çarpanı** yap (ayrı karar). Askeri raporun kendi kuralları bu üçünü içermez.

### 3D.1 Kilitli çerçeve

| İlke | Kaynak |
|---|---|
| Askeri güç döngünün **beşinci ayağıdır**; savaş toprağı değil **kontrolü** kazandırır; **parsel asla el değiştirmez**; birincil kaldıraç ekonomik savaştır (ambargo, tarife, abluka) | docs/11 ek karar 2 (Y-08); §7.7 |
| H5 korumaları (başlangıç değeri): yağma ≤%25, yapı ≤%10 devre dışı (yıkılmaz), parsel kaybı 0, ≥49 sa aynı ilçeye ara, 14 gün kalkan, güç farkı 1:5, hareketsiz hedefe ödülsüz | docs/11 §7.7 |
| Savaşı **yalnız vali** ilan eder (Alfa-1); 12–24 sa hazırlık (rapor: ≥20 sa) | docs/11 §7.6–§7.8 |
| Askeri güç **ekonomiden doğar** (mühimmat + gıda + çelik, parça, yakıt → birlik); talep üretim zincirine döner (H3) | docs/11 §7.7; bilim §5 |
| **Alfa-0: bayraklı Ordugâh + birlik + savunma + NPC eşkıya (PvE) dilimi** (seçenek (i), `askeri.eskiya.etkin`; 0a hemen, 0b para güvenliği ve Esnaf Defteri P0'dan sonra); Alfa-1: oyuncular arası il kontrol savaşı ve ittifak | **Y-35** (baş lider; sahip ek kararı Y-08 ile K32'yi daraltır); T-09 çözüldü |
| PvP yağmanın %60'ı saldırana geçer, %40'ı yok olur; mülk kipinde birlik ikmali ×0,25 (kalibrasyon testleriyle) | **Y-36** (baş lider) |
| Çekirdek LLM ya da kamu ajanı çağırmaz; eşkıya PRNG + servet eğrisidir | §7; rapor kapsam dışı |

### 3D.2 Askeri rutin (oyuncu gözünden; zorunlu karar 0)

İlkeler: sıkıcı bakım yok; **"uğramazsan kaybedersin" yok**; her ihtiyaç üretim zincirinde bir mal ya da yapıdır; her adımın bir ekran düğmesi vardır (yürümek zorunlu değil); atlanan adımın en kötü sonucu **fırsattır**, kayıp değildir.

| Ritim | Oyuncunun (M1 / M4) isteğe bağlı askeri kararı | Atlanırsa |
|---|---|---|
| **5 dk** (açılış) | "Sen yokken" ≤8 satırda askeri maddeler; Dikkat paneli (yaklaşan baskın, ikmal yetersiz, kapasite dolu, parti bitti); baskın kartında tahmini boyu savunma durumuyla karşılaştır; duruşu seç (**Kendi yapılarım / İl nöbeti / Dışarıda**, tek tık) | hazır duruş geçerlidir |
| **1 sa** | parti ver (Piyade: çelik 30 + mühimmat 20 + gıda 30, 12 sa); ikmal kaynağı (kendi üretimim / sözleşme / pazar); Genel Talimat (≤5 kural); Karakol ya da Kule yerleştir | ordu büyümez, hiçbir şey eksilmez |
| **1 gün** | 19:00–23:00 baskın bandında bir saatlik dilim; sabah "Sen yokken" (sonuç, revir, onarım); isteğe bağlı (Alfa-1, yürüyüş) nöbet turu "Mevzi hazırla" (+%3, ≤%5) | yok |
| **1 hafta** | il savunma defteri; ordu büyüklüğü / maliyet gözden geçirme; tedarik sözleşmesi; teknoloji (Piyade II, `mekanize_ordu`); Alfa-1: savaş ilanı, sefer kapanışı, ittifak | ordu aynı kalır |

**Angarya testi (rapor §1.8):** günlük giriş, seri ya da kırmızı geri sayım yok; ikmal bitince birlik **gitmez**, güç orantılı düşer; çevrimdışı hazır duruş geçerli; aynı ilçeye bekleme 4 gün; 14+ gün yokluk = **uyku** (ikmal ve maaş donar, katılım yok, hedef değil, yağma ödülsüz); intikam penceresi ve "saldırıya uğradın" bildirimi yok. Haftalık isteğe bağlı karar: M1 6–10, M2 9–14, M3 5–8, M4 sakin 4–6 / savaş haftası 8–14, M0 1–2; zorunlu 0 (ölçüt AH11: tür ≥3, tek türün payı ≤%40).

### 3D.3 Arsa dünyasına oturtma

| Konu | Kural (öneri; Y-35 ile Alfa-0'a bayraklı girer) |
|---|---|
| **Ordugâh** | `mulk.ekYapilar`; **3 yuva**, 12 sa, **₺35.000** (₺20.000 + çelik 80 + parça 30), ilde ≤2; birlik kapasitesi 12/yapı; mülk kipinde `birlik_uret` ≥1 biten Ordugâh ister; işletme tavanı 24 birim |
| **Karakol** | ek yapı, 1 yuva, 4 sa, ₺7.840, ilde ≤2; ilçede 1. Karakol +100, 2. +50 savunma gücü (ilçede ≤2 etkili); sahibine ganimet payı; ikmal ≈₺168/gün |
| **Gözetleme Kulesi** | ek yapı, 1 yuva, 3 sa, ₺4.100, ilde 1; ön duyuru +12 sa (24 → 36) ve tahmin ±%25 → ±%10 |
| **Nöbet Evi** | **kamu hizmet hücresi** (ilçe merkezi, `k:ilce:<id>`), her ilçede vardır, oyuncuya kapalı, maliyeti 0; ilçeye 100 güç; duyuru panosu; yeni kamu bileşeni gerekmez |
| **İl komutanlığı** | **yapı değil, kural ve görünüm;** arayüz adı **"İl savunma düzeni"** (gerçek kurum adlarıyla karışmasın); Alfa-1'de il merkezi hizmet hücresinde "Savunma Kurulu" ikonu |
| **Birlikler** | envanter **oyuncunun (oyuncu, il) işletme düğümünde**; komuta ilde **"il nöbeti"** duruşuyla (konumlu birlik ve il havuzu elendi; rapor K2); docs/11 §7.7 "il komutanlığında havuzlanır" ifadesi bu karara göre düzeltilir (T-51) |
| **Kimlikler** | `ordugah`, `karakol`, `gozetleme_kulesi` ek yapı kimlikleri, `eskiya_*` olay türleri ve `askeri.eskiya.*` parametre adları **ilk içerik sürümünden önce kilitlenir** (G8; ek yapıların kimlik tablosuna dahil olup olmadığı doğrulanmadı) |
| **Satın alınamaz hücre** | `landuse=military`, yol, su, korunan alan: haritada yalnız gri "engel" (ad, tür, kurum yazılmaz) |
| **H5 uygulaması** | yağma ≤%25: düğüm başına **kayan 24 sa yağma defteri** (PvE ve PvP ortak, `kayipTavaniUygula` tek nokta korunur; mal başına oran = `min(olay oranı × ilçe payı, kalan)`); yapı ≤%10: `⌊%10 × düğümün biten tesis yuvası⌋` bütçesi, `onarimBitis = t + 24 sa` (ek yapılar devre dışı kalmaz; ≈10 yuvaya kadar küçük işletme etkilenmez); ilçe bekleme 4 gün (≥96 sa); kalkanlı ve uykudaki hedef dışı ve servete sayılmaz; **parsel el değiştirmez** (hiçbir `askeri/*` kodu `HucreDurumu.sahip`'e yazmaz; 90 gün rastgele tohum özellik testi); PvP'de savunanın seçtiği 4 saatlik bant (08:00–24:00), değişiklik 96 sa sonra işler |
| **Savaşın etkisi (A1)** | kontrol hakkı (`ilceKontrol`, 14 gün; aday kontenjanı, kasa payı ≤%15, ihale yerellik önceliği, liman geçiş payı ≤%15: hepsi kamu → il hazinesi aktarımı, para yaratmaz); abluka; sınırlı yağma (%60 iletim); yapı ≤%10 24 sa |
| **Kodda** | `askeri/*` yalnız bölge kipi; `birlik_uret` ve `savunma_emri` işletme düğümünü `ic.bolgeIndeks[...]` yüzünden reddeder (`bolgeIndeksiBul` ile **iki satırlık düzeltme**); `isletmeAl` düğüme `birlikler`, `savunma`, `ikmalKarsilanmaPpm` zaten verir; Ordugâh `tesisTurleri`, `mulk.yapiYuva`, `mulk.ekYapilar` içinde yok |

### 3D.4 Alfa-0 PvE eşkıya dilimi (baş lider kararı Y-35: seçenek (i), bayraklı, iki aşamalı)

**Karar (kilitli, baş lider).** Alfa-0'da eşkıya PvE dilimi `askeri.eskiya.etkin` bayrağıyla girer. **0a (çekirdek ve şema hazırlığı, ≈S–M):** diğer P0 işleriyle paralel, hemen başlar. **0b (oynanış, ≈M):** para güvenliği (ödül tablosu; ganimet ona dayanır) ve Esnaf Defteri P0'dan **sonra** gelir; ekmek, cam, pencere zincirleri ve dükkânla bağımsız ve paralel. Bayrak, **Alfa-0 kapısından 3 hafta önce** AH1, AH2, AH4 ve parsel H5 (PvE + defter) geçerse açılır; geçmezse **kapalı yayınlanır ve (ii)'ye iner** (yalnız 2 satırlık düğüm düzeltmesi, `yagmaPenceresi` şeması, 3 ek yapı kaydı ve kimlik kilidi; bayrak kapalıyken mülk kipinde askeri komutlar "askeri kapali" ile reddedilir). Toplam ≈M–L (1,5–2 hafta, tek geliştirici + istemci). Kritik yolu uzatmaz; sıra şartı: mal kimlik kilidi ek yapı kimliklerinden önce kapanmalı. **E1–E3 eğlence artıları Alfa-0 sonrasında değerlendirilir** (rapor önerisi E2'nin 0b ile gelmesiydi; karar bunu erteledi).

| Öğe | Kural (rapor §3.2–§3.4; kalibre edilmedi) |
|---|---|
| **Hedef ve boy** | hedef **ilçe**; `S` = ilçedeki kalkansız ve uykuda olmayan oyuncuların hücre değeri + yapı bedeli (stok hariç); eşik ₺250.000; `boy = min(8, ⌊S ÷ 250.000⌋)`, baskın gücü `Gb = 100 × boy`; yeni oyuncu ilçesi baskın görmez |
| **Planlama** | günlük tik (TRT 00:00), olasılık 1/3 (ortalama aralık ≈7 gün; 4 gün bekleme sonrası); il başına günde 4 dilim (19:00–22:00, 1 sa), planlamadan 2 gün sonrası, ilde aynı anda ≤1 baskın; PRNG `savas` akışı (yeni akış yok) |
| **Duyuru** | **T−24 sa** (Kule ile T−36); tahmin aralığı ±%25 (Kule ±%10); anma günlerinde (17 Ağustos, 6 Şubat, 10 Kasım) baskın penceresi yok (sahip onayı bekler) |
| **Çözüm** | pencere açılışında katılımcı ve güçler kilitlenir; `Gs = arazi × [Nöbet Evi 100 + Karakol + Σ birlik × güç × ikmal × duruş çarpanı]`, ±%10 sapma, eşitlikte savunan kazanır; NPC'de üçgen çarpanı yok |
| **Yenilgi** | birlik kaybı %15 (aşağı yuvarlama), kaybın %40'ı 24 sa içinde revirden döner (kayıp %60 kalıcı / %40 revir); yağma `min(%10 × ilçe payı, defter kalanı)` (mal **yok olur**); yapı ≤%10 yuva 24 sa |
| **Zafer** | birlik kaybı 0; **ganimet mal**, çekirdek tablosundan: mühimmat `3k` + yakıt `2k` birim (boy 4 ≈ ₺2.600, boy 8 ≈ ₺5.200), katkı gücü oranında bölünür (katkı <%10 pay almaz; Nöbet Evi payı yanar); **ilçe başına haftalık tavan ₺6.500**; para alanı yok |
| **Ölçek (örnek)** | boy 1 ≈ Nöbet Evi tek başına tutar; boy 2–3 Nöbet Evi + Karakol + 1 tümen; boy 4–6 birkaç oyuncunun ortak savunması; savunma ikmali %100, duruş "İl nöbeti" ×1,3 |
| **Duruşlar** | `normal` "Kendi yapılarım", `savunma` "İl nöbeti" (×1,3, ildeki tüm baskınlar), `geri_cekil` "Dışarıda" (katılmaz, birlik kaybı 0, defter tavanı geçerli); çevrimdışı geçerli |

**En küçük çekirdek değişiklik listesi (13 kalem):** (1) `bolgeIndeksiBul` düzeltmesi (S); (2) Ordugâh şartı ve kapasitesi (S–M); (3) mülk kipinde `askeri.ikmalCarpaniPpm` ≈ ×0,25 (S); (4) uyku: ikmal, maaş, katılım 0 (S); (5) yağma defteri `BolgeDurumu.yagmaPenceresi` (S–M); (6) `Dunya.baskinlar` ve 3 olay türü (`eskiya_gunluk`, `eskiya_pencere_ac`, `eskiya_pencere_kapa`) (M); (7) `askeri/eskiya.ts` (≈250 satır) (M); (8) `parametreler.json` `askeri.eskiya` bloğu (≈32 skaler) (S); (9) `askeri_rezerv` mülk kipinde istemci formu yok (S); (10) protokol `kare.baskinlar` ve olgu satırı `eskiya_sonuc` (M); (11) 6 özellik testi (parsel el değiştirmez, defter iki ardışık baskın ≤%25, yapı ≤%10, determinizm, bölge altınları aynı, kalkanlı ve uykulu hedef dışı) (M); (12) ölçüm botları `komutan`, `tedarikci`, `askeri_yok` ve H3/H5 güncellemesi (M); (13) istemci: yerleşim, İkmal Kartı, baskın kartı ve harita katmanı, Savunma sayfası (M). **Yeni komut yok** (mevcut `birlik_uret`, `savunma_emri`, `tesis_insa_hucre`); yeni durum alanı 2 (`yagmaPenceresi`, `Dunya.baskinlar`) + 3 derlenmiş alan; oyuncunun öğreneceği kavram 9 (Ordugâh, Karakol, Kule, Nöbet Evi, baskın ve boy, duruş, İkmal Kartı, ganimet, revir).

**Para korunumu (Y-36).** Askeri sektör **net bir para lavabosudur:** maaş (₺8/sa/birlik), ikmal ve inşa para ya da mal yakar; PvE yenilgi yağması mal lavabosudur; tek musluk küçük ve tavanlı mal ganimetidir (ilçe haftalık net üretiminin ≈%0,15–0,3'ü; ölçüt AH4 ≤%1). **PvP yağma negatif toplamlıdır:** alınanın %60'ı saldırana geçer, %40'ı yok olur (`yagmaIletimPpm` 600.000; **kod bugün %100 aktarıyor**, T-52); koruma ücreti alıcı onaylı, tavanlı (`₺1.000 × boy`/hafta), 72 sa iptal edilebilir oyuncu-oyuncu aktarımıdır, haraç yapısı ve serbest metin yoktur. **Birlik ikmali ×0,25** mülk kipinde kalibre edilir (bugünkü tablo bölge kipi için yazıldı: bir Piyade Tümeni günde ≈₺6.432, ×0,25 ile ≈₺1.752; oyuncu geliri parsel ölçümünde günde ≈₺50–130 bin; kalibrasyon ölçümle gözden geçirilir; T-53). Askeri gelir (ganimet, koruma ücreti, tedarik marjı ≈%14, kontrol payı) **meşru ama ikincil** sermayedir: M1 ≈ başabaş ("sigorta paritesi"), M2 boy 4'te zararlı, boy 8'de başabaş; süpermarkete doğrudan askeri gelirle değil tedarikçi (M3) ya da hibrit marjla varılır.

### 3D.5 Alfa-1 il kontrol savaşı akışı (öneri; PvE hesap defteri ve savunma toplamı üzerine)

| # | Faz | Süre | Ne olur | Koruma |
|---|---|---|---|---|
| 0 | Uygunluk | | komşu il (merkez kenarları); hedef kalkanda/uykuda değil; servet oranı ∈ [0,2 ; 5]; il başına ≤1 ilan/hafta | kalkan, 1:5, hareketsiz ödülsüz |
| 1 | İlan | anında | vali `kontrol_savasi_ilan {hedefIlce}`; il meclisi 6 sa içinde onaylar; savaş hedefi önceden bildirilir ve değişmez (kontrol hakkı, liman geçiş payı, abluka kırma); ilan bedeli (öneri ₺5.000, yanar) | duyuru herkese görünür |
| 2 | Hazırlık | **≥20 sa** | savunan 4 saatlik bandı seçer; birlik toplanır; sefer katılımı | uyku saati gizlenemez |
| 3 | Kapanış | **T−4 sa** | `sefer_katil {savas, oranPpm}`; katılan birlik pencere + 1 sa kilitlenir; kalkanlı katkı veremez | geri dönüş yok |
| 4 | Çarpışma | **4 saat, 4 tur × 1 sa** | tur başına otomatik çözüm (üçgen: Piyade > Topçu > Zırhlı > Piyade, çarpan tavanlı); emir kartı (Taarruz / Savunma / Geri çek / İkmal öncelik); çevrimdışı hazır emir | band dışı hasar sayılmaz |
| 5 | Sonuç | anında | ≥3 tur kazanan galip; **kontrol hakkı 14 gün**; yağma ≤%25 × ilçe payı, **%60 iletim**; kayıp kazanan %10, kaybeden %30, revir %40; yapı ≤%10 24 sa | **parsel 0** |
| 6 | Soğuma | **≥49 sa** (aynı ilçe), 7 gün yorgunluk | aynı ilçeye baskın yok | istikrar eşiği tek savaşta aşılamaz |

Alfa-1 komutları: `kontrol_savasi_ilan`, `sefer_katil`, `bant_sec`, `koruma_sozlesmesi`, `sozlesme_iptal` (bölge kipi `savas_ilan` altın özetler için aynen kalır). **Ekonomik savaş** (abluka: kapasite ≥%50, gıda ve elektrik koridoru muaf, ≤72 sa, 7 gün ara, 12 sa önceden duyuru), paralı asker (≤%30), ittifak (üye ≤min(60, aktifin %15); katılım ≤40 hesap; 21–40 ×0,7, 41+ ×0,4): Alfa-1 ve sonrası. Dönüş ekranında yalnız tek özet satırı: intikam penceresi yok.

### 3D.6 Adalet korumaları (tek paket)

Yeni oyuncu kalkanı 14 gün (hedeflenemez, servete sayılmaz, katkı veremez; 15–28. gün PvE yağma oranı yumuşatması öneri); hareketsiz oyuncu ödülsüz; servet oranı 1:5 (PvP); yağma ≤%25 defter; yapı ≤%10 ve yıkılmaz; parsel 0; ≥49 sa soğuma ve il başına ≤1 ilan/hafta; savunanın bandı; ittifak tavanı; çevrimdışı koruma. Kötüye kullanım önlemleri (rapor §5.2): ganimet çiftliği (yalnız kalkansız ve uykusuz oyuncu servete girer, ilçe haftalık tavan), yağma çiftliği (%40 sürtünme), kalkan sömürüsü, koruma haracı (tetiklenemez, alıcı kabulü), bedavacı, küçük işletmeyi ezme (yapı ≤%10 yuva). **Hiçbir teknoloji bu korumaları değiştirmez** (bilim §6). Bilinen sınırlama: servetini ilçelere yayan oyuncu baskın eşiğinin altında kalabilir (risk dağıtımı; AH1 izler).

### 3D.7 Görünürlük, Savunma sayfası ve eğlence

Harita: zeytin yeşili `shield` katmanı, kehribar kesikli "baskın bandı" halkası; sokak: çit, ışıklı kulübe, silahsız nöbetçi; baskın sırasında **çatışma görseli yoktur**; "Sen yokken": nötr şablon ("ambarından %7 eksildi, 1 yapı 14:20'ye kadar bakımda"). **Savunma** sayfası (Esnaf Defteri): 9 görev, 7'si Alfa-0 (S1–S6, S9), sıra serbest, kilitsiz, **ödülsüz** (damga). Takvimde baskın penceresi isteğe bağlı kişisel işaret. **Eğlence (rapor §4A):** iki gerilim eğrisi (PvE 5 evre, PvP 6 evre), soyut yaklaşma çizgisi ve tur kartları, **zarf açılışı** sonuç anı, avantajsız güvenlik şeridi, kitabe ve unvan; sakin ≠ sönük. E1 hazır emir (Normal / Mevzi / Yedek), E2 tur dökümü, E3 şerit/kitabe/unvan: **Alfa-0 sonrası** (Y-35); sunum öğeleri E2'ye bağlıdır, dilimin kendisi onlarsız çalışır.

### 3D.8 Hassasiyet (rapor §6)

Gerçek ordu, kurum, jandarma/polis/istihbarat adı ya da kısaltması **yok** ("İl savunma düzeni", Nöbet Evi, Karakol, Ordugâh, Gözetleme Kulesi jenerik); gerçek birim numarası, rütbe, silah ve araç markası, firma adı yok; ölü, yaralı, şehit, gazi, aile sözleri **hiç kullanılmaz** ("azaldı", "geri döndü", "bakımda"); bayrak, ay-yıldız, millî marş, dinî motif yok; "Eşkıya" jenerik, adlı kişi, bölge, etnik ya da mezhep ima, "terör" yok; anma günlerinde baskın penceresi yok; askeri mizah yok; K34 hukuki görüş listesine "askeri tema" eklenmeli. Ses politikası (Ö10): varsayılan kapalı, her sese görsel eşdeğer.

### 3D.9 Askeri teknoloji (ayrıntı sonra)

Üç katman: **donanım** (8 dal, 24 düğüm), **doktrin** (4 × 3 = 12 düğüm, il sahipli; iki dışlayan eksen), **destek** (keşif, EH, ikmal, istihkam). `T = model × destek × doktrin`; göreli tavan `T_A ≤ 1,5 × T_B`; destek ≤+%10, doktrin ≤+%15. Alfa-1 sonrası; Alfa-0'da yalnız Piyade Model II ve `mekanize_ordu` (kodda var). PvE'de teknoloji yalnız birim gücüdür (NPC'nin ikinci tarafı olmadığından tavan yok).

### 3D.10 Durum özeti

| Konu | Durum |
|---|---|
| Beşinci ayak; parsel el değiştirmez; kontrol; H5 korumaları; seviye/kilit yok (M0–M4) | **kilitli** (Y-08, Y-31; rapor K1) |
| **Alfa-0'da bayraklı eşkıya PvE dilimi** (seçenek (i); 0a hemen, 0b P0 sonrası; bayrak kapıdan 3 hafta önce AH1, AH2, AH4, H5 ile açılır, aksi hâlde (ii)) | **kilitli (baş lider, Y-35)**; T-09 **çözüldü** |
| PvP yağma %60 iletim, mülk kipinde ikmal ×0,25 | **kilitli (baş lider, Y-36)**; kalibrasyon testleriyle |
| E1–E3 eğlence artıları | Alfa-0 sonrası değerlendirme (Y-35) |
| Birlik envanteri düğümde + il nöbeti; yapılar (Ordugâh, Karakol, Kule oyuncu ek yapısı; Nöbet Evi kamu; komutanlık yapı değil); baskın hedefi ilçe; defter şekli; kayıp %60/%40; ganimet mal; ön duyuru 24 sa; koruma ücreti kuralları | **öneri** (rapor K2–K12; geri dönüşü zor; ilk içerik sürümünden önce kimlik ve şema kararı: AÖ-19) |
| Alfa-1 il kontrol savaşı akışı, abluka, ittifak, paralı, askeri teknoloji ağı | **öneri** (cesitlilik-yonetim §5, bilim §5; Alfa-1 / sonra) |
| Savaş hazırlığı alt sınırı (12–24 ↔ ≥20 sa), Karakol/Sur/Kule yapı sayısı, Hava savunma ölü uç riski, görünen birlik adı (Tümen ↔ Müfreze), baskın bandı sabit ↔ vali seçimi, koruma hizmeti A1 | **açık** (Ü-yeni-3, -6, -9; rapor Ö1–Ö11) |
| Kodda | bölge kipinde var; mülk kipinde yok (`birlik_uret`/`savunma_emri` düğümü reddeder; Ordugâh yok; PvP yağma %100 aktarım; ikmal tablosu ×1) |

---

## 4. Karar defteri

**Nasıl okunur.** Her satır bir karardır. **Durum** değerleri: **kilitli** (sahip ya da baş lider kararı, yazılı); **Alfa-0 öncesi** (Alfa-0'a davetli alınmadan karara bağlanmalı; geri dönüşü zor); **Alfa-1 öncesi**; **açık** (karar yok ya da kaynaklar çelişiyor); **yerine geçildi** (eski karar, yeni karar tarafından geçersiz kılındı). "Kilitli (lider)" = baş lider düzeyi, sahip itiraz ederse değişir (docs/00 [Lider 1 Ekim]; docs/12 §10 "Sahip itiraz ederse değişir"). Tarihler 2026; saat yalnız commit'ten bilinen yerde yazıldı. Rapor önerileri (§4.5) **karar sayılmaz**.

### 4.1 Sahip yönergeleri ve docs/12 (Y)

| ID | Karar | Tarih | Kaynak | Durum |
|---|---|---|---|---|
| Y-01 | Ar-Ge kodlamadan önce gelir; raporlar öncekini tekrar etmez, derinleştirir ve "geri dönüşü zor kararlar" ile biter; işler bitince genel resim ve uçtan uca hata ayıklama | 1 Ekim 08:59 | docs/12 §1 | kilitli |
| Y-02 | Kimlik: "mahallende ya da seçtiğin yerde başla"; strateji tabanlı, MMORPG değil | 1 Ekim 08:59 | docs/12 §2 | kilitli |
| Y-03 | İmza mekanikler (mahalle ve muhtarlık, pazar günü, il imza ürünü, çay ocağı, imece ve kitabe) korunur; yenileri araştırılır | 1 Ekim 08:59 | docs/12 §2 | kilitli (Alfa-0'a girecek olanlar: açık) |
| Y-04 | Tarım, Sanayi, Pazar yalnız açılış önerisi; fabrika, ticaret, politika, askeri yöne dönüş kilitsiz, yalnız ekonomik maliyet | 1 Ekim 08:59 | docs/12 §3; docs/11 ek karar 3 | kilitli |
| Y-05 | Harita güzelleşir; renk ve ton profesyonel (sakin ama amatör değil); arayüz ve akış profesyonel | 1 Ekim 08:59 | docs/12 §4 | kilitli |
| Y-06 | Çok oyunculu tek dünya, gerçek zaman; arsa ve inşa fikri doğru; bilim, teknoloji, askeri bilimler ve askeri teknoloji genişler; canlı dünya detaylanır; yürüyüş hataları düzeltilir | 1 Ekim 08:59 | docs/12 §5 | kilitli (genişleme kapsamı Alfa-0 için açık) |
| Y-07 | Hücre seçimi oyuncuya gösterilmez; yapı önce yerleşim, altındaki boş hücreler aynı işlemde alınır; OSM adalarından hazır arsa (4–12 hücre); "Genişlet" tek tık | 1 Ekim 07:45 | docs/11 ek karar 1 | kilitli (uygulandı: F4) |
| Y-08 | Askeri güç beşinci ayak; savaş toprağı değil **kontrolü** kazandırır; Alfa-0'da Ordugâh + birlik üretimi + savunma + NPC eşkıya baskınları (PvE), Alfa-1'de oyuncular arası il kontrol savaşları | 1 Ekim 07:47 | docs/11 ek karar 2 | kilitli (ilke); **Alfa-0 kapsamı Y-35 ile kapandı** (bayraklı PvE dilimi; T-09 çözüldü) |
| Y-09 | Strateji çekirdeği (sınıf, seviye, XP, ustalık yok); yürüyüş adaptasyon katmanı ("temeli Alfa-0'da", oyunsu hareket); Türkiye öncelikli içerik (mal sayısı 40 ile sınırlı değil, kademeli); canlı gerçek zamanlı dünya; tür harmanı (kopya yok) | 1 Ekim 08:38–08:43 | docs/11 ek karar 3 | kilitli; "ustalık yaparak kazanılır" ifadesi geçersiz (harman Ç9) |
| Y-10 | **Zaman:** dünya kapalıyken de akar; mutlak duvar saati, 1:1 tek takvim; açılışta kaçan süre işlenerek yetişilir ("kapalıyken durur" kararının yerine geçer) | 1 Ekim 09:24 | docs/12 §7; sunucu-tasarimi §9.2 | kilitli (uygulandı: `sunucu/src/saat.ts`); kesinti adaleti açık |
| Y-11 | NPC arsa sahibi yok; boş arsa boş kalabilir; NPC rakip firma yok | 1 Ekim 09:24 | docs/12 §7; canli §4.4 | kilitli |
| Y-12 | Oyuncular arsaları kendi aralarında gönüllü alıp satabilir, pazarlık yapabilir; parsel zorla el değiştirmez (savaş ve yağma arsa almaz) | 1 Ekim 09:24 | docs/12 §7 | kilitli (ilke); mekanizma yok: Alfa-1 öncesi |
| Y-13 | Hassas içerik: deprem olayı yok; dini bayramlar talep eğrisinde görünür ve oyun içi hatırlatma takvimi | 1 Ekim 09:24 | docs/12 §7 | kilitli (bayram kapsamı ve sessiz günler: sahip onayı, Alfa-1 öncesi) |
| Y-14 | Bina modellemeleri daha detaylı; renk ve paneller daha güzel; tasarım işi daha güçlü modelli ayrı tasarım ajanında; karakter bir tık büyük | 1 Ekim 09:24 | docs/12 §7 | kilitli (karakter ölçeği uygulandı, 8197861) |
| Y-15 | Prototipten sonra sürekli güncelleme ve yatırım; tasarım genişletilebilir kurulur | 1 Ekim 09:24 | docs/12 §7 | kilitli |
| Y-16 | Döngüsel zincirler oyunun kalbi; kendi perakende dükkânı ana kanal | 1 Ekim 09:44 | docs/12 §8 | kilitli |
| Y-17 | Rehber görevler ve rehber görev zincirleri | 1 Ekim 09:44 | docs/12 §8 | kilitli |
| Y-18 | Beğenilenler: gurbetçi yaz dönüşü, olaylar, **zorluk katmanı**, kamu ihalesi | 1 Ekim 09:44 | docs/12 §8 | kilitli; "zorluk katmanı" hiçbir raporda tanımlı değil: **açık** (sahibe sorulmalı) |
| Y-19 | Kamu ihalesi ve kamu kararlarını "API anahtarıyla" yapay zekâ ajanları yürütür | 1 Ekim 09:44 | docs/12 §8 | **yerine geçildi** (Y-29, Y-30) |
| Y-20 | Kamu arazileri ve politikaları, oyuncuya hitap eden fırsat ve rekabet aracı olarak araştırılacak | 1 Ekim 09:44 | docs/12 §8 | kilitli (G1 vd. ile somutlandı) |
| Y-21 | Takım: baş lider genel denetçi ve karar verici; Ar-Ge lideri + 4 araştırmacı; geliştirme lideri + 4 geliştirici; çekirdekte aynı anda tek yazar; commit ve push baş liderde | 1 Ekim 09:58 | docs/12 §9; K35 | kilitli |
| Y-22 | Profesyonel ürün: renkler, bina yapıları, 3B görselleme amatör görünmez; haritada ve arayüzde büyük harf kullanılmaz | 1 Ekim 09:58 | docs/12 §9 | kilitli |
| Y-23 | Takım yapısı korunur (liderlerin hata yakalaması değer gösterdi) | 1 Ekim 10:21 | docs/12 §11 | kilitli |
| Y-24 | Odak: Ar-Ge sürer ama çalışma yönü kaymaz; **tüm kararlar tek bir oyun tasarım belgesinde toplanır** | 1 Ekim 10:21 | docs/12 §11 | kilitli (bu belge) |
| Y-25 | Gerçekçilik sınırı: bu bir oyun, her şey birebir gerçekçi olamaz, oynanabilirlik önce gelir | 1 Ekim 10:21 | docs/12 §11 | kilitli |
| Y-26 | Üretim döngüsü genişler: mal, kaynak, zincir artırılır (buğday → un → ekmek; hayvancılık: inek → süt, et, deri → deri ürünleri; madencilik ve fabrikalar); perakende kademeleri: bakkal, market, süpermarket; üretimhaneler ve fabrikalar | 1 Ekim 10:21 | docs/12 §11 | kilitli (yön); **mal kimlikleri ve Alfa-0 payı açık** (§3A); perakende kademeleri Y-31 ile **iş modeli** olarak yeniden çerçevelendi (§3B) |
| Y-27 | Dönüş deneyimi: oyun açıldığında "sen yokken neler oldu" ekranı; Esnaf Defteri, ödüller, kaldığın yer kartı geliştirilir; takvim beğenildi | 1 Ekim 10:21 | docs/12 §11 | kilitli (yön); içerik, olgu şeması ve P0 payı açık (§3C) |
| Y-28 | Tüm işler bitince sahip ile baş lider toplantı yapar | 1 Ekim 10:21 | docs/12 §11 | kilitli (süreç) |
| Y-29 | Yapay zekâ: tüm işler yapay zekâya verilmez (maliyet); yalnız sunucudaki kamu ajanı ve kamusal alan NPC'leri, sınırlı ve tavanlı; **oyuncunun kendi ajanı ya da oyun API'si yok**; tam otokontrol istenmiyor | 1 Ekim 10:21 | brif (sahip sözleri); docs/12 §10 "S1, S2" | kilitli |
| Y-30 | İhale yetkisi (b): ajan ihaleyi tasarlar ve gerekçeyi yazar, **kazananı kural seçer** (kör teknik puan yok); API anahtarı yalnız sunucuda | 1 Ekim 10:21 | docs/12 §10 | kilitli (sahip) |
| **Y-31** | **Kademeler seçimdir, ilerleme merdiveni değil:** bakkal, market, süpermarket oyuncunun seçtiği iş modelleridir (isteyen bakkalda kalır, isteyen büyür, isteyen kendi markasıyla bakkal zinciri kurar, sermayesi olan doğrudan süpermarket açar); açılışı kilitleyen sıra, seviye ya da "önce küçüğü" şartı yok; kısıt yalnız **sermaye, uygun arsa/ayak izi, işletme gideri, tekelleşme korumaları**; yükseltme seçenek; oyuncuya özgü marka ve tabela kimliği; **aynı ilke fabrika ölçekleri, askeri yapılar ve diğer sistemler için de geçerli** | 1 Ekim | docs/12 §12 | kilitli (sahip); tarama §5.3 |
| **Y-32** | **L ölçek teknoloji kilidi mülk kipinde kalkar:** `parametreler.json` `sanayi.olcekKademeleri[2].gerekliTeknoloji = "otomasyon"` mülk kipinde uygulanmaz; **teknoloji kilit değil, verim ya da maliyet avantajıdır**; bölge kipinin altın testleri için o kipte değişmez | 1 Ekim (öğleden sonra) | baş lider kararı: **docs/12 §13** (1. madde "Teknoloji kilidi yok") | kilitli (baş lider); kapsamı (yalnız L ölçek mi, tüm `gerekliTeknoloji` kapıları mı) **açık** (§5.3 KL-21) |
| **Y-33** | **docs/11 §7.4 "ilçe seviyesi S/M/L ölçeği ve yapı türlerini açar" tanımı geçersiz:** ilçe gelişim seviyesi **yalnız kolektif dünya durumudur** (NPC talebi, kamu altyapısı, ruhsat kotası gibi toplu etkiler); bireysel açılış kilidi değildir; perakende kademelerindeki ilçe seviyesi şartları (bakkal Köy, market Kasaba, süpermarket Merkez) kalkar; cesitlilik-uretim §7.5 "Tier 1 ilçe seviyesine göre görünür" kuralı gözden geçirilecek | 1 Ekim (öğleden sonra) | baş lider kararı: **docs/12 §13** (2. madde "İlçe seviyesi kilit değildir"); Y-31 (docs/12 §12) ile uyumlu | kilitli (baş lider); belge düzeltmeleri §5.1 T-46…T-48 |
| **Y-34** | **Ayak izi ölçekle büyür (baş lider kararı U-1 + genelleme onayı):** arsa-ve-insa Z4'teki "1–3 hücre biçim kümesi, ölçek büyürken aynı ayak izi" kuralının **yerine geçer.** **Veri:** `olcekHucre[tür] = [yuva, yuva+1, yuva+2]` (S, M, L; `yuva` bugünkü `yapiYuva` değeri); **yapı biçimi en çok 5 hücre; bağlı, kenar-bitişik küme** olmalı; ölçek başına hücre sayısı tür verisinde bir parametredir (dükkân için `yuva` 1: bakkal 1, market 2, süpermarket 3; süpermarket için `[1, 2, 2]` tür verisinde gerekçeli istisna alternatifi). **Doğrudan kurulum:** o ölçeğin ayak izi baştan alınır. **Yerinde yükseltme:** ek bitişik hücreler oyuncunun kendi boş hücreleri olmalı ya da aynı atomik işlemde satın alınabilmeli; değilse yükseltme yapılamaz, oyuncu başka yerde doğrudan büyük kurar (**kilit değil, fiziksel koşul**). ≤72 hücre ve ≤%25 tavanları geçerlidir | 1 Ekim (öğleden sonra) | baş lider kararı: **docs/12 §13** (3. madde "Ayak izi ölçekle büyür": ölçek başına hücre tür verisinde parametre, öneri S 1 / M 2 / L 3); `[yuva, yuva+1, yuva+2]` genellemesi ve ≤5 hücre sınırı Ar-Ge lideri aracılığıyla onaylandı | kilitli (baş lider); dükkân ayak izi **kesin: `[1, 2, 3]`** (perakende raporu); süpermarket `[1, 2, 2]` tür verisinde gerekçeli istisna alternatifidir (T-49) |
| **Y-35** | **Alfa-0 askeri kapsamı: seçenek (i), bayraklı ve iki aşamalı eşkıya PvE dilimi.** `askeri.eskiya.etkin` bayrağı; **0a** çekirdek ve şema hazırlığı (diğer P0'larla paralel, hemen); **0b** oynanış (para güvenliği ve Esnaf Defteri P0'dan sonra). Bayrak, Alfa-0 kapısından 3 hafta önce AH1, AH2, AH4 ve parsel H5 (PvE + defter) testleri geçerse açılır; geçmezse kapalı yayınlanır ve (ii)'ye (yalnız şema) iner. E1–E3 eğlence artıları Alfa-0 sonrasında değerlendirilir. Sahibin ek kararını (Y-08) uygular, K32'yi "askeri Alfa-1" yönünde daraltır | 1 Ekim (öğleden sonra) | baş lider kararı (askeri-katman-v1 §3.0 karar kutusu, A-3), Ar-Ge lideri aracılığıyla (docs/12 §13'e işlendi) | kilitli (baş lider); T-09 çözüldü; kimlik ve şema kararı AÖ-19 |
| **Y-36** | **Askeri para korunumu kalibrasyonları kabul edildi:** PvP yağmanın **%60'ı saldırana geçer, %40'ı yok olur** (`yagmaIletimPpm` 600.000; kod bugün %100 aktarıyor); mülk kipinde **birlik ikmali ×0,25** (`askeri.ikmalCarpaniPpm`; bölge kipi çarpanı 1); ikisi de kalibrasyon testleriyle (ölçüm botları ×1 ve ×0,25 iki koşu; AH3, AH4, AH9). Askeri sektör net para lavabosudur; PvE ganimeti mal ve tavanlıdır | 1 Ekim (öğleden sonra) | baş lider kararı (askeri-katman-v1 §3.6, Ö1, Ö7), Ar-Ge lideri aracılığıyla | kilitli (baş lider); sayılar kalibre edilecek |
| **Y-37** | **Alfa-0 P0 ve kimlik kararları:** (1) **`kepek` 24. mal olarak kabul edildi** (SS-2; G5 kilidi 23 → 24; tarif satırı yöntemin kendisine, Alfa-0 verisinden önce); (2) **yerel pazar kanalı** (canlı A0-2) ve **"sen yokken" en küçük dilimi** (D1–D3, D4a, D5) **Alfa-0 P0'a girdi**; (3) **çekim uzayı (G20), arsa fiyat paydası (Z14), ayrılmış hücre kuralı ve talep modeli Alfa-0 öncesine çekildi** | 1 Ekim (öğleden sonra) | baş lider kararı, Ar-Ge lideri aracılığıyla (docs/12 §13'e işlendi) | kilitli (baş lider); uygulama ve kural ayrıntısı bekler (AÖ-2, AÖ-10) |
| **Y-38** | **Kamu arsası ölçeği:** kamu blokları dikdörtgen adalar olarak yerleştirilir ve saklanır (hücre listesi değil); mahalle paketi ~7.000 uygun hücre başına bir; %4 hazine rezervi birkaç büyük ada; hesap ve denetim blok sayısıyla ölçeklenir (Gebze'de kurulum ≤1 sn/ilçe, kamu durumu ≤100 KB); halka halka açılış Alfa-1 | 1 Ekim | **docs/12 §13** (4. madde; c2221dc) | kilitli (baş lider); çekirdek uygulaması incelemede (T-54) |
| **Y-39** | **Yönetişim adları (K-4):** Muhtar = mahalle, İlçe Başkanı = ilçe, Vali = il; makam boşken "NPC Kaymakam" (ilde "NPC Vali") yalnız **yöneticisiz hâl** anlamına gelir. Kalıcı denetçi rolü ve 7 gün pasif sonrası devralma "kayyum" adını taşır; kademe adları ülke paketinde veridir (K-15). Alfa-0'da mahalle pasif (NPC) | 1 Ekim | **docs/12 §13** | kilitli (baş lider); sahip toplantısında teyit |

### 4.2 docs/00 kararları K1–K35

| ID | Karar | Tarih | Kaynak | Durum |
|---|---|---|---|---|
| K1 | Oyuncu rolü: doğrudan bölge/devlet yöneticisi | 30 Eylül | docs/00 §2 [PDF] | yerine geçildi (K25) |
| K2 | Harita: gerçek Dünya, gerçek coğrafya | 30 Eylül | docs/00 §2 | yerine geçildi kısmen (K26, K33) |
| K3 | Beş ayrı katman | 30 Eylül | docs/00 §2 | yerine geçildi (K19) |
| K4 | Zaman: tur yok, gerçek zaman 1x, günlük ritim; dünya hızı ayarlanabilir parametre | 30 Eylül | docs/00 §2–§3 | kilitli (1:1: Y-10); "hız parametresi" yalnız ölçümde |
| K5 | Çağ ve sezon kullanılmayacak | 30 Eylül | docs/00 §2 | kilitli |
| K6 | 2D harita, akış görünür | 30 Eylül | docs/00 §2 | yerine geçildi (K17 → K29) |
| K7 | Ana hedef: 20–25. gün sıkılmasını tasarımla önlemek | 30 Eylül | docs/00 §2 | kilitli (hipotez; kanıtlanmış sayılmaz) |
| K8 | Kapsam: Ar-Ge + Aşama 2 kodu | 30 Eylül | docs/00 §2 | yerine geçildi (docs/11 F0–F7) |
| K9 | TypeScript, pnpm monorepo, Vitest | 30 Eylül | docs/00 §2 [Oturum] | kilitli |
| K10 | Kalıcı tek dünya | 30 Eylül | docs/00 §2 | kilitli (K23 ile baştan çok oyunculu) |
| K11 | Her şey Türkçe; kodda ASCII Türkçe tanımlayıcı | 30 Eylül | docs/00 §2 | kilitli |
| K12 | Ekip | 30 Eylül | docs/00 §2 | yerine geçildi (K35) |
| K13 | Kritik kararlarda parayla güç yok; gelir modeli prototip dışı | 30 Eylül | docs/00 §2 | kilitli |
| K14 | Şablonlu, veriyle tanımlanan içerik | 30 Eylül | docs/00 §2 | kilitli |
| K15 | Sentetik test haritası (regresyon fikstürü olarak kalır) | 30 Eylül | docs/00 §2; docs/11 §8.3 | kilitli |
| K16 | Kapılar kanıt sırasıdır, takvim taahhüdü değil | 30 Eylül | docs/00 §2 | kilitli |
| K17 | 3D gerçek Dünya (stilize küre + yakın plan) | 30 Eylül gece | docs/00 §2 | yerine geçildi kısmen (küre L0; yakın plan MapLibre; akış kalktı) |
| K18 | İlk gerçek dilim: Türkiye + Balkanlar + Karadeniz | 30 Eylül gece | docs/00 §2 | yerine geçildi kısmen (K32; dilim kalır) |
| K19 | Altı katman: Tarım, Sanayi, Lojistik, Teknoloji, Pazar, Devlet | 30 Eylül gece | docs/00 §2; docs/08 | kilitli (lojistik arka plan; Devlet yasası il hükümetinde) |
| K20 | İklim takvimi (gerçek takvim ayları; hasat, buzlu liman, geçit) | 30 Eylül gece | docs/00 §2 | kilitli |
| K21 | "Sezon yok" = dünya sıfırlanmaz; "sezon" sözcüğü kullanılmaz | 30 Eylül gece | docs/00 §2 | kilitli |
| K22 | GPL/AGPL kod kopyalanmaz; NC veri kullanılmaz; OSM türevi ayrı ODbL dosyası | 30 Eylül gece | docs/00 §2 | kilitli |
| K23 | Baştan paylaşılan, kalıcı, hesaplı tek dünya; tek yazar Node + `ws`; Postgres günlük + anlık görüntü; zaman damgasını sunucu basar; Better Auth | 1 Ekim 06:32 | docs/00 §2; docs/11 §2, §10 | kilitli |
| K24 | OpenStreetMap (ODbL) kabul; OSM türevi ayrı klasörde | 1 Ekim 06:32 | docs/00 §2 | kilitli; dış hukuki görüş **Alfa-1 öncesi** (Ü1) |
| K25 | Devlet seçimi yok; ilçede arsa ile başla; roller seçilmez, yapıdan ve makamdan doğar; yasa ve bütçe seçilmiş il hükümetinin | 1 Ekim 06:32 | docs/00 §2; docs/11 §2 | kilitli |
| K26 | Harita derinliği: bölge → il → ilçe → arsa (→ sokak) | 1 Ekim 06:32 | docs/00 §2; docs/11 §9.1 | kilitli |
| K27 | Yapı hücrelere yerleşir; 4 aşamalı inşa (Temel, İskele, Gövde, Tamam), 2–12 sa, 2 kuyruk, iptal %50 iade | 1 Ekim 06:32 | docs/00 §2; docs/11 §7.3 | kilitli (süreler başlangıç değeri) |
| K28 | Yürüyüş: 3D karakterle sokakta gezinme; ayrı three.js sahnesi; Alfa-1'de açılır, paralel geliştirilir | 1 Ekim 06:32 | docs/00 §2 | kilitli; Alfa-0 durumu **açık** (ek karar "temeli Alfa-0'da", T-08) |
| K29 | Sakin görsel; akan çizgi ve parçacık yok; rozet + mercek + Dikkat paneli; lojistik otomatik ve arka planda | 1 Ekim 06:32 | docs/00 §2 | kilitli |
| K30 | Arsa atomu z20 kare hücre (~30 m); 1 hücre = 1 yapı yuvası; yapılar 1–3 hücre | 1 Ekim 06:32 | docs/00 §2 | kilitli (lider) |
| K31 | 53 bölge lojistik ve pazar merkez düğümü; il → bölge eşlemesi | 1 Ekim 06:32 | docs/00 §2 | kilitli (lider) |
| K32 | Alfa-0: Kocaeli + Sakarya + Bursa (~40 ilçe, ≤200 davetli); askeri, seçim ve yürüyüş Alfa-1'de; Balkanlar Alfa-1 | 1 Ekim 06:32 | docs/00 §2; docs/11 §6 | kilitli (lider); **askeri Y-35 ile daraltıldı** (bayraklı PvE dilimi Alfa-0'da; T-09 çözüldü); **yürüyüş ek kararla çelişir** (T-08) |
| K33 | Gerçek il ve ilçe adları; ülke düzeyi NPC çerçeve; ihtilaflı alanlar dilim dışı | 1 Ekim 06:32 | docs/00 §2 | kilitli (lider); yazılı dışlama listesi **Balkan açılışından önce** |
| K34 | Hetzner CX33 + Postgres + Cloudflare; açık alfadan önce ODbL ve kişisel veri için dış hukuki görüş | 1 Ekim 06:32 | docs/00 §2 | kilitli (lider); hukuki görüş **Alfa-1 öncesi** |
| K35 | Ekip: lider + uygulayıcı ajanlar; çekirdekte tek yazar; `tipler.ts` sözleşmesi liderde; ölçümler ayrı worktree'de | 1 Ekim 06:32 | docs/00 §2 | kilitli |

### 4.3 Baş lider kararları (docs/12 §10) ve sentez G1–G23, S1–S11

Sentez (argelider-sentez-1) **öneridir**; docs/12 §10 "sentezin önerileri üzerine" verilen kararları listeler. Aşağıda **Durum**, docs/12 §10'da açıkça yazılıp yazılmadığına göre verildi; docs/12 §10'da adı geçmeyen maddeler sentezin sınıflamasını (Alfa-0 öncesi / Alfa-1 öncesi) taşır ve **baş lider onayı bekler**.

| ID | Karar | Tarih | Kaynak | Durum |
|---|---|---|---|---|
| G1 | Kamu arsası çekirdekte zorunlu (satılmaz; `parsel_al` ve `yapi_yerlestir` reddeder; yurt atlar); **Mahalle Paketi 20 hücre** (meydan + pazar yeri + park) + **%4 hazine rezervi** + ilçe merkezi 8–12 hücre + kıyı şeridi 2 hücre; yoğun ilçede toplam ≈%8–9; oranlar parametre; rezerv halkanın ilk arsası satılmadan donar | 1 Ekim 10:17 | docs/12 §10 (G1–G7, S3); sentez §3.1 | kilitli; **uygulama incelemede, commit bekliyor** (G2 P1 bitti, dikdörtgen ada saklaması; G1 kamu yayını hazır; Y-38) → Alfa-0 öncesi iş |
| G2 | Kamu kimliği `k:mahalle` / `k:ilce` / `k:il`; meydan, pazar, park mahalleye; hazine rezervi, kıyı, sanayi rezervi, ilçe merkezi ilçeye | 1 Ekim 10:17 | docs/12 §10; sentez §3.1 | kilitli |
| G3 | `kamu_karar` v1 günlük şeması (`kaynak`, `model`, `istemSurumu`, `semaSurumu`, `girdiOzeti`, `gerekceRef`; metin günlükte yok) + gündem ve zaman aşımı kural yedeği; PRNG akışı `kamu_*` | 1 Ekim 10:17 | docs/12 §10; sentez §3.1 | kilitli; uygulama Alfa-0 öncesi |
| G4 | **Para alanı taşıyan sistem ya da ajan komutu yok**; ödüller çekirdekteki sürümlü tablodan (`sistem_odul {kavram}`, tavan, bir kez, `alinanOdul`) | 1 Ekim 10:17 | docs/12 §10; sentez §3.1 | kilitli; uygulama Alfa-0 öncesi |
| G5 | Mal ve yöntem kimlikleri ilk içerik sürümünden önce kilitli: `tekstil` → `kumas` + `hazir_giyim`; `ekmek` ve `sekerleme` ayrı mal; `findik_urunu` taban 240; dizilere yalnız sona ekleme; Alfa-0: 4 zincir ve 23 mal; tek yeni yapı `dukkan` | 1 Ekim 10:17 | docs/12 §10; sentez §3.1 | kilitli; **`kepek` ile 24'e genişledi (Y-37)**; kalan liste genişlemesi (Y-26) Alfa-0 öncesi |
| G6 | Oyuncu serbest metni ajana girmez; değerlendirme kör | 1 Ekim 10:17 | docs/12 §10; sentez §3.1 | kilitli |
| G7 | Kamu kaynaklı her karar için kural yedeği her zaman açık; tek sağlayıcıya bağımlılık yok; `kamu_ajan_kapali` bayrağı | 1 Ekim 10:17 | docs/12 §10; sentez §3.1 | kilitli |
| G8 | Kamu bütçesi kapalı döngü: yalnız yanan para (ithalat makası payı %20, ithalat komisyonu payı %50), arazi vergisi payı, hak bedelleri; NPC nüfus vergisi Alfa-0'da yok; oyuncuya akan ≤%50 | 1 Ekim 10:17 | docs/12 §10 ("yalnız zaten yanan paradan"); sentez §3.2 | kilitli (ilke); oranlar öneri |
| G9 | Tüm kamu, sipariş ve ihale fiyat tavanları = ithalat paritesi (≤ ×1,10 R) | 1 Ekim 10:17 | docs/12 §10; sentez §3.2 | kilitli |
| G10 | Görev durumu sunucu profilinde, ödül kaydı (`alinanOdul`) çekirdekte; hiçbir ekonomi sistemi görev durumunu okumaz; kavram sözlüğü donar; tamamlanma sticky | 1 Ekim 10:16 | sentez §3.2; docs/12 §10 yalnız "ödüller çekirdek tablosundan" ve "Esnaf Defteri P0" | **Alfa-0 öncesi** (kısmen kilitli: ödül tablosu; görev durumunun yeri onay bekler) |
| G11 | Perakende: tek `dukkan` ek yapısı, tür = veri; raf yuvası `malId` ile; stok il düğümünde | 1 Ekim 10:17 | docs/12 §10 ("tek yeni yapı dukkan, tür verisiyle"); sentez §3.2 | kilitli; yapı sayısı (19.) açık (S11); kademeler Y-31 ile seçilebilir iş modeli |
| G12 | Perakende fiyatını oyuncu belirler ([0,7; 1,4] R + önayar); hane bütçesi tavanı; üretmeyen dükkânın ithal alıp satması meşru ticaret, ZP11 ile izlenir, gerekirse raf fiyat tavanı | 1 Ekim 10:17 | docs/12 §10; sentez §3.2 | kilitli (bant öneri) |
| G13 | Alfa-0'da ara kademe uzmanlığı yok (bilinçli); Alfa-0 = kapalı zincir + çıkış kanalı seçimi; Alfa-1'de P5 sözleşmesiyle | 1 Ekim 10:17 | docs/12 §10 (S5); sentez §3.2 | kilitli |
| G14 | Ajan anahtar modeli: sunucuda tek anahtar (ayrı Workspace, harcama tavanı, devre kesici); oyuncu anahtarı sunucuda kullanılmaz | 1 Ekim 10:21 | docs/12 §10; sentez §3.2 | kilitli; yapay zekâ raporundaki "C modeli izinli" **geçersiz** (T-06) |
| G15 | Tek ihale motoru; profil M (yalnız fiyat) önce, Y (%70 fiyat / %20 süre / %10 sicil) sonra; sunucu-mühürlü kapalı teklif; teklif komutunda `v` alanı | 1 Ekim 10:17 | docs/12 §10; sentez §3.2 | kilitli (ihale Alfa-0'da yok) |
| G16 | İhalede ajan arz tasarlar ve gerekçeyi yazar, kazananı kural seçer (b); (b+) yalnız M1–M3 ölçümleri 30 gün temiz ve sahip onayıyla; (a) yok | 1 Ekim 10:21 | docs/12 §10 (sahip); sentez §3.3 | kilitli (b); (b+) açık |
| G17 | Hak şeması: tek `hak?` alanı; D1/D2/D3 dönüş türleri; kamu ihtiyacı feshi yok; hak hücreleri ≤72 / %25 tavanına sayılır | 1 Ekim 10:16 | sentez §3.3 | **Alfa-1 öncesi** (şema alanı Alfa-0 P0'da ayrılır) |
| G18 | Hareketsiz kamu hakkı: 90. günde hak + yapı açık artırma; kamu arsası asla açık artırılmaz | 1 Ekim 10:16 | sentez §3.3 | Alfa-1 öncesi (S8 açık) |
| G19 | Görünür kimlik ve KVKK: saklanan metin kimliksiz; ad render anında rızayla; hukuki görüş | 1 Ekim 10:16 | sentez §3.3 | Alfa-1 öncesi |
| G20 | Çekim uzayı: Alfa-0'da ilçe havuzu + konum çarpanı; Alfa-1'de halka havuzu | 1 Ekim 10:16 | sentez §3.3 | **etiket hatası: arsa satışı Alfa-0'da başlıyor → Alfa-0 öncesi** (§6.4) |
| G21 | İmza kalitesi ilçe tabanlı (tesiste ya da kanalda taşınır, stokta değil) | 1 Ekim 10:16 | sentez §3.3 | Alfa-1 öncesi |
| G22 | Model ve istem sürüm yönetişimi (yönetici komutu, ≥14 gün gölge, altın küme); "Kamu El Kitabı" yayımlanır, gizli kural yok | 1 Ekim 10:16 | sentez §3.3 | Alfa-1 öncesi |
| G23 | Yapı malzemesi talebi yalnız yeni yapıların maliyetine; mevcut yapılar değişmez | 1 Ekim 10:16 | sentez §3.3 | Alfa-1 öncesi (Alfa-0'da `dukkan` için gerekir: Alfa-0 öncesi) |
| S1 | İhale yetkisi (b) | 1 Ekim 10:21 | docs/12 §10 | kilitli (G16) |
| S2 | Oyuncu ajanı / oyun API'si | 1 Ekim 10:21 | docs/12 §10; brif | **kapandı: yok** (sentez önerisi "(3) v1.5" geçersiz) |
| S3 | Kamu arsası %8–9 ve kıyı şeridi satılmaz | 1 Ekim 10:17 | docs/12 §10 | kilitli |
| S4 | Kendi dükkânın küçük primi (≈%3–16) kabul | 1 Ekim 10:17 | docs/12 §10 | kilitli |
| S5 | Alfa-0'da kapalı zincir; uzmanlık Alfa-1 sözleşmesiyle | 1 Ekim 10:17 | docs/12 §10 | kilitli |
| S6 | Üretmeyen dükkânın ithal alıp satması meşru | 1 Ekim 10:17 | docs/12 §10 | kilitli |
| S7 | İhale sonuç kartında kazananın tabela adı (rıza, KVKK) | 1 Ekim 10:16 | sentez §5 | açık (Alfa-1 öncesi) |
| S8 | 90 gün hareketsiz oyuncunun kamu hakkı ve yapısı açık artırmaya çıksın mı | 1 Ekim 10:16 | sentez §5 | açık |
| S9 | Muhtarlık oyuncu ek yapısı olmaktan çıkar, kamu yapısı olur (mülk kipinde oyuncuya kapalı) | 1 Ekim 10:17 | docs/12 §10 | kilitli; **kodda hâlâ oyuncuya açık** (06 §15.3) |
| S10 | 90 gün sonra parselini kaybedenin "yeniden başlangıç" paketi | 1 Ekim 10:16 | sentez §5 | açık |
| S11 | `dukkan` 19. yapı sayılsın mı ("hafif sanayi" ile birlikte) | 1 Ekim 10:16 | sentez §5 | açık |
| P0 | **Alfa-0 P0 sırası:** kamu arsası verisi ve çekirdek reddi → para güvenliği (ödül tablosu, kamu kasası, kamu NPC alıcısı) → mal kimlik kilidi ve 9 yeni mal → ekmek zinciri + dükkân → cam → pencere zinciri → Esnaf Defteri P0 → sabit fiyatlı kamu siparişi v0. Alfa-0'a girmeyenler: ihale, kira ve haklar, canlı ajan | 1 Ekim 10:17 | docs/12 §10 | kilitli; **Y-37 ile genişledi:** yerel pazar kanalı ve "sen yokken" dilimi P0'a girdi (sıra metni docs/12 §10'da güncellenmeli); olgu defteri hâlâ açık (§6.4) |

### 4.4 docs/11 v1 tasarım değerleri ve açık konular Ü1–Ü14

Mekanizma kilitli; **sayılar başlangıç değeridir ve ölçümle kalibre edilir** (docs/11 §7 başlığı). Kodda doğrulananlar "kod" işaretlidir.

| ID | Değer / karar | Kaynak | Durum |
|---|---|---|---|
| V-01 | Hücre taban fiyatı 1.000 / 2.500 / 6.500 ₺ (kırsal/kasaba/şehir); fiyat çarpanı × (1 + 2 × satılmış pay) (**kod**) | docs/11 §7.2 | kilitli (mekanizma); **paydası açık** (arsa Z14) |
| V-02 | Oyuncu başına ilçede ≤72 hücre ve ≤%25 (**kod**); bitişik seçim; satın alınamaz: yol tamponu, su, askeri alan, korunan alan | docs/11 §7.2 | kilitli |
| V-03 | Arazi vergisi yalnız arazi değerine, haftalık %1, tembel (**kod**); ilçe meclisi %0,5–3 (Alfa-1) | docs/11 §7.2 | kilitli (Alfa-0 sabit %1) |
| V-04 | 18 yapı tablosu, yuva ve inşa süreleri (17 kimlik **kod**; tabloda 20 satır, T-10) | docs/11 §7.3 | kilitli (süreler plan) |
| V-05 | Yeni oyuncu: ₺50.000, bedava yurt 6 hücre, ilk 5 yapıda %30, %20 ayrılmış hücre, 14 gün kalkan (**kod**) | docs/11 §7.9; 06 §15.1 | kilitli; yurt 8 hücre mi (baslangic Ç2) açık |
| V-06 | Hareketsizlik: 14 gün uyku, 45 gün %2/gün çürüme, 90 gün Hollanda usulü açık artırma; tatil yılda ≤30 gün | docs/11 §7.8 | kilitli (kodda yalnız veri) |
| V-07 | H5 korumaları: yağma ≤%25, yapı ≤%10 devre dışı ve yıkılmaz, ≥49 sa ara, 14 gün kalkan, güç farkı 1:5, parsel kaybı 0 | docs/11 §7.7 | kilitli (Alfa-1) |
| V-08 | Yönetişim: muhtar 14 gün, vali 28 gün seçim; 7 yasa, 3 bütçe kolu; savaşı yalnız vali ilan eder | docs/11 §7.6 | kilitli (Alfa-1); Muhtar adı mahalle düzeyine alınacak (T-04) |
| V-09 | İlçe gelişim seviyesi Köy → Kasaba (5.000 nüfus ve ≥10 sahip) → Merkez → Şehir; S/M/L ölçeği ve yeni yapı türlerini "herkese açar" | docs/11 §7.4 | "açar" tanımı **geçersiz** (Y-33); seviye yalnız **kolektif dünya durumu** (NPC talebi, kamu altyapısı, ruhsat kotası); eşikler açık (Ü6); **kodda seviye kilidi yok** (§5.3 KL-07) |
| V-10 | Pazar: işaretli NPC piyasa yapıcı; NPC derinliği = max(0, hedef − kayan oyuncu hacmi); oyuncu emir defteri v1.5 | docs/11 §7.10 | kilitli (ilke); kod ters yönlü ölçekliyor (3.4) |
| Ü1 | ODbL türetilmiş uygunluk verisi yayımı | docs/11 §12 | Alfa-1 öncesi (dış hukuki görüş) |
| Ü2 | Mercator alan farkı (~%28) düzeltmesi | docs/11 §12 | açık (Alfa-0: düzeltme yok) |
| Ü3 | Alt ızgara (2 m) ve eğim denetimi | docs/11 §12 | açık (Alfa-0: yalnız hücre düzeyi) |
| Ü4 | Mevcut bina taban alanlı hücreler: engelli mi, satılık mı | docs/11 §12 | açık |
| Ü5 | `rafineri`, `hidro_santrali` ayrı tür mü; 19. yapı | docs/11 §12 | açık (kodda mülk yapısı değil: `rafineri` yok) |
| Ü6 | Merkez ve Şehir gelişim eşikleri | docs/11 §12 | açık (ölçüm) |
| Ü7 | Ortak proje kataloğu | docs/11 §12 | Alfa-1 |
| Ü8 | Uzmanlaşma çarpanı ×1,5 | docs/11 §12 | **kaldırıldı** (karakter ilerlemesi yok) |
| Ü9 | Alfa-1 eşzamanlı oyuncu hedefi | docs/11 §12 | açık (sahip) |
| Ü10 | Kişisel veri, gizlilik, kullanım koşulları | docs/11 §12 | Alfa-0: davetli koşulları; Alfa-1 öncesi hukuki görüş |
| Ü11 | Apple ile giriş | docs/11 §12 | Alfa-1 sonrası |
| Ü12 | Gelir modeli | docs/11 §12 | ilke kilitli; model alfa sonrası |
| Ü13 | Ad ve sınır politikası v2 (dışlama listesi) | docs/11 §12 | Balkan açılışından önce |
| Ü14 | Diğer oyuncuların avatarları yürüyüşte | docs/11 §12 | Alfa-1 |

### 4.5 Rapor önerileri: karar bekleyen kümeler

Aşağıdakiler **baş lider onayı yazılı olmayan** önerilerdir; docs/12 §10 / sentez G ile karşılanan maddeler "→ G#" ile işaretlendi. Hepsi kalibre edilmemiş sayılar içerir.

| Rapor | Öneri sayısı | Karşılananlar | Karar bekleyen en önemli maddeler | Durum |
|---|---|---|---|---|
| canli-dunya §10 | 10 | k1 zaman (Y-10), k2 NPC rakip firma yok (Y-11), k9 kısmen (deprem yok) | k6 4 yeni PRNG akışı; k7 günlük kuantum + 08/12/17/20 pencereleri; k3 ilçe tek kohort; k4 olgu şeması; k5 açık kese + MER sayacı; k8 opt-in olay sözleşmesi; **k10 talep modeli kimliği** | Alfa-0 öncesi (k6, k7, k10), olgu şeması ilk yayından önce |
| dikey §11 | 13 | k1, k2 → G11; k3 → G12; k4 → G5; k11 → G13; k10 → G12; k8 → G23 | k5 `alumina` ayrı mal; k6 yöntem eşleme; k7 çekim uzayı → G20; k9 stok il düğümünde; k12 → G21; k13 zincir market genelleme (sonra) | Alfa-0 öncesi (k5, k6, k9) |
| kamu §9 | 12 (KK-1…12) | KK-1 → G1; KK-3 → G2; KK-7 → G15; KK-8 → G8; KK-9 → G9; KK-10 → G3 | KK-4, KK-5, KK-11 → G17; KK-6 → G18; KK-12 → G19; KK-2 (ad alanı) | Alfa-1 öncesi |
| yapay-zeka §9 | 12 | k1 → G16; k2, k3 → G3; k5 → G14; k6, k7 → G6; k10 haber çelişkisi (Ö4); k12 → G7 | k4 anahtar modeli **A + C** (C geçersiz, T-06); k8 gerekçe saklama; k9, k11 → G22 | Alfa-1 öncesi |
| rehber §7 | 8 (GK-1…8) | GK-1 → G4 | GK-2 → G10; GK-3 zorunluluk derecesi (hiçbir sistem görev durumunu okumaz, test); GK-4 kavram sözlüğü; GK-5 sticky; GK-6 yüklem kütüphanesi; GK-7 şablon; GK-8 tek hibe | Alfa-0 öncesi (GK-3, GK-4, GK-5) |
| imza §5 | 16 (K-1…K-16) | K-2 → G1; K-5 kısmen → G4, G8, G9 | K-1 `VarlikId` + `adina`; K-3 kalıcı iç kimlik ve harita sürümü; K-4 Muhtar/İlçe Başkanı adları; K-6; K-7 → G21; K-8 → G19; K-9 PRNG ve veri paketi sürümü; K-10; K-14 yön değiştirme iade paketi; K-16 | K-1, K-3, K-4, K-9, K-14 Alfa-0 öncesi |
| arsa-ve-insa §8 | 14 (Z1…Z14) | Z13 atomik komut (uygulandı, 06 §15.4) | Z1 z20 koru (= K30); Z2 arsa çekirdek dışı görünüm, ilk satıştan sonra kimlik donar; Z3 kullanım ekseni; Z4 yapı biçimi (**Y-34 ile yerine geçildi**: ölçekle büyüyen ayak izi, ≤5 hücre); Z5 komşuluk ada düzeyi; Z6 vergi tabanı; Z7 imar rızası; Z11 hızlandırma para ile değil; **Z14 fiyat paydası** | Z2, Z3, Z4, Z14 Alfa-0 öncesi |
| bilim-teknoloji-askeri §9 | 10 (G1…G10) | yok | G8 id tabanlı serileştirme (ilk Alfa-0 teknoloji içeriğinden önce); G1 DAG; G2 tek aktif standart; G3 bilgi kaybolmaz; G7 tek para birimi | G8 Alfa-0 öncesi; geri kalanı Alfa-1 sonrası |
| gorsel-kimlik §8 | 9 | Y-05, Y-14, Y-22 çerçevesi | Inter; `renkIndeksi` + `paletSurumu`; iki tema; DOM etiket; düz gölgeli + prosedürel cephe; Lucide; TS → hex; altlık şeması; "Sen" rengi | oyuncu rengi sözleşmesi Alfa-0 öncesi |
| baslangic-ve-ustalik | Ç1–Ç10, A-önerileri | Ç3 kalkan 14 (06 §15.5); Ç4 ilk satışta liman şartı kalktı (kod); Ç8 Ü8 kaldırıldı (docs/11); Ç7 → G4 | Ç2 yurt 8 hücre; Ç5 giriş ("önce oyna"); Ç6 başlangıç sepeti; Ç9 ikinci perde 7. günde; K-14 yön iade paketi | Alfa-0 öncesi (Ç2, Ç5, Ç6) |
| oyun-kimligi-harman | Ç1–Ç9 | Ç9 ustalık kaldırıldı (Y-09) | Ç1 Muhtar adı (K-4); Ç2 Açılış Tezgâhı; Ç3 dolmuş; Ç4 tavla/okey; Ç6 slogan; Ç7 kozmetik gelir | Ç2, Ç6 açık; Ç3 sonra; Ç4 hiç (öneri) |
| cesitlilik-uretim §9 | Q1–Q8 | Q1 → G11/S11 | Q2 iklim takvimi hızı (1:1: Y-10 ile kapanır); Q3 `marmara` iklim tipi; Q5 kalite stoğu; Q7 keşif | Q2 kapatılmalı |
| cesitlilik-yonetim §13 | Ü-yeni-1…12 | Ü-yeni-8 deprem yok (Y-13) | Ü-yeni-1 vali seçmeni; -2 Ordugâh Alfa-0 (T-09); -3 yapı sayısı; -4 Vali/Kaymakam adı; -10 gazetede ad; -11 teknoloji 17 → 26 | açık |
| uretim-agi-genisletme §10 (dalga 4, **2. tur, onaylı**) | 14 (K-1…K-14) | K-1 kimlik kilidi (G5'in genişlemesi) | K-1 24 mal (21 yeni kimlik); K-2 birleşik mallar bölünmez; K-3 `kasaplik` mal; K-4/K-5 `kepek` ve tarif satırı (Alfa-0 verisinden önce); K-6 `hafif_sanayi` 20. yapı; K-7 `gida_fabrikasi` 18 yöntem; K-8 `celikhane` 10 yöntem; K-9 ölçek adı + doğrudan kurulum; K-13 seviye/kilit yok (L `otomasyon` kilidi mülk kipinde kalkar, ilçe seviyesi kilidi geçersiz: Y-32, Y-33); K-14 ayak izi ölçekle büyür (Y-34); K-10 çıkmaz-mal doğrulayıcısı; K-11 hayvan sağlığı `asinmaPpm`/`bakim_duzeyi` paylaşımı; K-12 katalog sayımı; SS-1…SS-6 sahip soruları (SS-6 karar verildi) | Alfa-0 öncesi (K-1, K-4, K-5, K-6, K-9, K-14) |
| perakende-kademeleri §14 (dalga 4, **3. tur, onaylı**) | 13 | Y-31, Y-33 ile "seviye/kilit yok" çerçevesi **işlendi** (karar 2); G11, G12 | 1 kademe = ölçek + tür; 2 seviye/kilit yok; 3 ayak izi `olcekHucre = [1, 2, 3]` (Y-34 ile uyumlu; süpermarket `[1, 2, 2]` gerekçeli istisna alternatifi); 4 Yakınlık Havuzu bakkal kademesine bağlı (şube şartı yok); 5 kademeli pay tavanı (n=1 yok, n=2 %70, n≥3 %50; Alfa-0 yok); 6 marka birinci sınıf, Zincir Kartı kademe-bağımsız; 7 ölçek indirimi yalnız gider; 8 ruhsat kotası NPC ile ortak; 9 marka çekimi etkilemez; 10 üretici satış noktası = modül; 11 toptan NPC talebi yaratmaz; 12 iç içe mal listesi; 13 yükseltme = doğrudan maliyet (para eşit, +3 sa) | ilk `icerik.json`'dan önce (1, 4, 12) |
| donus-deneyimi §8 (dalga 4, **2. tur, onaylı**) | 9 (DK-1…DK-9) | Y-27 yönü | DK-1 iki çapa; DK-2 kamusal veri sınırı; DK-3 olgu referansı saklama; DK-4 kozmetik kapısı profilde; DK-5 damga gösterimi; DK-6 zaman sınırlı kozmetik yok; DK-7 ikinci dönüş ödülü yok; DK-8 bildirim varsayılan kapalı; DK-9 hesap koruma sınıfı | DK-1/2/3/4/6 Alfa-0 öncesi; DK-8/9 Alfa-1 öncesi |
| askeri-katman-v1 (dalga 4, **2. tur, onaylı**) | 12 (K1…K12) + Ö1…Ö11 | docs/11 §7.7 ve ek karar 2; **K4 (PvE önce) ve §3.0 Alfa-0 karar kutusu → Y-35**; Ö1 ikmal ×0,25 ve Ö7 yağma %60 → Y-36 | K1 seviye/kilit yok (M0–M4) (Y-31 ile uyumlu); K2 birlik envanteri düğümde + il nöbeti; K3 savaşın ödülü kontrol hakkı, yağma yan etki; K5 yapılar: Ordugâh/Karakol/Kule oyuncu, Nöbet Evi kamu, komutanlık yapı değil; K6 kayıp %60 kalıcı / %40 revir; K7 ganimet mal; K8 düğüm başına yağma defteri; K9 baskın hedefi ilçe; K10 Ordugâh `mulk.ekYapilar` (kimlik kilidi); K11 ön duyuru 24 sa (Kule 36); K12 koruma ücreti alıcı onaylı, tavanlı; ölçütler AH1–AH11 | Alfa-0 öncesi (K10, K9, K8, K2, K6, K7); K1 ilke olarak şimdi kilitli |

---

## 5. Çelişki ve odak kayması taraması

### 5.1 Çelişen ve eskimiş ifadeler

"Güncel doğru" sütunu **mevcut karar kaynaklarına** göre yazıldı (okuma kuralı, başlık notu); yeni karar değildir. Karar kaynağı yoksa "karar gerekli" denir. Bu tablo belgeleri **düzeltmez**; düzeltme baş lider onayıyla ilgili belge sahibi tarafından yapılır.

| # | Eskimiş / çelişen ifade ve yeri | Güncel doğru (kaynak) | Düzeltilecek belge ve bölüm |
|---|---|---|---|
| T-01 | **"Sunucu kapalıyken dünya durur"** (sunucu-tasarimi §9.2 eski; canlı dünya §1.1, B11 "kesintide sim zamanı geriden kalır"); iklim takvimi hızı `gunCarpani = 6` önerisi (cesitlilik-uretim Q2; docs/00 §3.1 kural 4 "1x, 6x, 24x") | Dünya kapalıyken de akar; mutlak duvar saati; **1:1 tek takvim**; hız yalnız ölçümde; hızlı dünya ayrı örnek (docs/12 §7; kod `sunucu/src/saat.ts`) | sunucu-tasarimi §9.2 (üstü çizili, tamam); canli-dunya §1.1–§1.2 (tarihsel notla işaretle); docs/11 §10 "Süreç" satırı (mutlak saat, yetişme, `yetisiyor`); cesitlilik-uretim Q2 (kapat); docs/00 §3.1 kural 4 ("oyunda hız yok") |
| T-02 | **"Yol seçimi: Tarımcı / Sanayici / Tüccar"** (docs/10 E21-G6; cesitlilik-yonetim §9 K7, 5. gün; arayuz-ux "Bir yol seç") | Açılış **önerisi** (sınıf değil, kilit yok); ilk haftanın sonunda "ikinci perde" yön sayfaları (Fabrika, Ticaret, Laboratuvar, Politika, Askeri) (docs/12 §3; imza D11; baslangic §3) | docs/10 E21-G6; cesitlilik-yonetim §9 tablo K7; arayuz-ux §6 ve "Giriş / Yerleş" |
| T-03 | **"Uzmanlaşma ×1,5 / ustalık yolu"** (oyun-tasarimi-parsel §roller; docs/11 §7.6 kalıntı satırları); **usta, çırak, kalfa** dili (imza N1 "Usta Defteri", cesitlilik "usta atölyesi"; capital-rift "usta tezgâhı") | Karakter düzeyinde ustalık ve çarpan **yok**; uzmanlık portföydür; dil: Esnaf Defteri, Rehber, "yeni esnaf" (docs/11 ek karar 3, Ü8 kaldırıldı; sentez Ö11). **Karıştırma:** askeri teknolojideki göreli ×1,5 tavan ve il doktrini ×1,5 (bilim G6) ayrı kavramlardır | oyun-tasarimi-parsel §roller; imza N1 adı ve "Çırak" etiketi; cesitlilik-uretim S-Z8/S9 "usta atölyesi" → "zanaat atölyesi"; capital-rift madde 14 dili |
| T-04 | **"NPC Muhtar" ilçe düzeyinde / Muhtar = seçilmiş ilçe başkanı** (canlı dünya §4.5; baslangic §2.2; cesitlilik-yonetim §4 ve §8; docs/11 §7.3 ve §7.6 tablosu; docs/00 K25; oyun-tasarimi-parsel; rehber T1, S1, T13 tetikleri) | Muhtar = **mahalle**; ilçe = **İlçe Başkanı**; yöneticisiz hâl NPC kaymakam (ilçe) / NPC vali (il); Alfa-0'da mahalle pasif (NPC muhtar, tabela) (imza K-4; sentez Ö7). **Baş lider yazılı karar yok** (karar gerekli) | docs/11 §7.3 (Muhtarlık), §7.6; docs/00 K25; canli §4.5; baslangic §2.2; cesitlilik-yonetim §4, §8; oyun-tasarimi-parsel; rehber (GB-10) |
| T-05 | **Eski ihale modeli:** "belediye (NPC Muhtar), en düşük fiyat, tavan referans +%15" (canlı dünya §4.5); commit–reveal (imza N4); esnaf siparişi ödülü +%5–15 (capital-rift, harman); yapay zekâ §8 A0-c "ihale Alfa-0'a alınırsa"; rehber `ilk_ihale_teklif` v1.5; **docs/12 §10 "Alfa-0 öncesi profil M"** ↔ "Alfa-0'a girmeyenler: ihale" | **Tek ihale motoru**; profil M (yalnız fiyat) Alfa-1 başı, Y (%70/%20/%10) Alfa-1 sonu ya da v1.5; teklif **sunucu-mühürlü** (commit–reveal gerekmez); tavan **ithalat paritesi (≤1,10 R)**, esnaf siparişi ödülü ≤+%10; **Alfa-0'da ihale yok**, sabit fiyatlı kamu siparişi v0; kazananı kural seçer (b) (G9, G15, G16; kamu §3.2) | canli-dunya §4.5; imza N4 ve Ö2; capital-rift esnaf siparişi; yapay-zeka §8; rehber §3 ve §6.1 (ihale v1.5 ↔ Alfa-1); docs/12 §10 cümlesi netleştirilmeli |
| T-06 | **Oyuncu ajanı / BYOK / oyun API'si "izinli, v1.5"** (kamu §2.6, §7.3, Q8; yapay-zeka §0 Ç-9, §5.6 model C, §8 v1.5 satırı, §9 k4 "A + C"; sentez S2/Ç6 "(3) v1.5"; docs/12 §8 ilk cümle) | **Yok.** Oyuncunun kendi ajanı ve oyun API'si yok; API anahtarı yalnız sunucudaki kamu ajanında; geliştirici/yönetici yerel ajanı (D) bir oyuncu özelliği değil geliştirme yoludur (docs/12 §10; brif) | kamu §2.6, §7.3, Q8; yapay-zeka §0 Ç-9, §5.6, §8, §9 k4; sentez Ç6, S2; docs/12 §8 "API anahtarıyla" cümlesine §10 notu |
| T-07 | **Canlı ajan Alfa-0'da**: yapay zekâ §8 "A0-b gölge: 100 botlu yük testi" ve "A0-c ilk canlı görev"; botların mülk kipini oynadığı varsayımı | **Alfa-0'da canlı ajan yok** (yalnız altyapı + gölge mod) (docs/12 §10). Gölge mod, sunucu botlarının mülk kipine taşınmasına (E20-G10) bağlıdır; bugün botlar bölge kipindedir (sunucu-tasarimi §9.4) | yapay-zeka §8; sunucu-tasarimi §9.4 |
| T-08 | **Yürüyüş Alfa-1** (K28; docs/04 §9; docs/11 §2, §6; capital-rift madde 7 "Alfa-0 yürüyüşsüzdür") ↔ **"temeli Alfa-0'da"** (docs/11 ek karar 3); kodda F5 ilk dilim çalışıyor | Sahibin ek kararı sonraki tarihlidir: yürüyüşün **temeli Alfa-0'dadır**, rolü adaptasyon; kabul kapısı değildir; her işin harita/panel karşılığı vardır. Önerilen okuma: Alfa-0'da isteğe bağlı (Y tuşu / parsel kartı), kapı ölçütlerinde yok. **Karar gerekli** | docs/00 K28 ve K32; docs/04 §9.2; docs/11 §6 tablosu (Görünüm satırı); capital-rift §0 madde 7 |
| T-09 | **Askeri Alfa-0'da yok** (K32; docs/04 §9.2; docs/11 §6 "Ordugâh dışındaki 17"; yapay zekâ §8) ↔ **"Alfa-0'da Ordugâh + birlik üretimi + savunma + NPC eşkıya (PvE)"** (docs/11 ek karar 2; harman §3.3; cesitlilik-yonetim Ü-yeni-2) | **Çözüldü (baş lider, Y-35):** seçenek (i) bayraklı, iki aşamalı eşkıya PvE dilimi (`askeri.eskiya.etkin`; 0a hemen, 0b para güvenliği ve Esnaf Defteri P0'dan sonra); bayrak kapıdan 3 hafta önce AH1, AH2, AH4, H5 ile açılır, aksi hâlde (ii) yalnız şema. Sahibin ek kararı baskın çıktı; K32 "askeri Alfa-1" kısmı daraltıldı. **Kalan düzeltmeler:** docs/00 K32, docs/04 §9.2, docs/11 §6 ("17 yapı, Ordugâh dışında"; Ordugâh, Karakol, Kule bayraklı Alfa-0 ek yapısı) ve yapay zekâ §8 metinleri; Mühimmat fabrikası artık gerçek ordu talebi alır | docs/00 K32; docs/04 §9.2; docs/11 §6 ve §7.3; cesitlilik-yonetim Ü-yeni-2; yapay-zeka §8; askeri-katman-v1 §3.0 |
| T-10 | **Yapı sayısı:** docs/11 başlığı "18 tür", tabloda **20 satır** (Ordugâh ve Muhtarlık dahil); §6 "17 yapı (Ordugâh dışında)"; kodda 17 tesis kimliği + 6 ek yapı = 23 kimlik (`rafineri` mülkte yok, `hidro_santrali` ayrı kimlik); sentez "Dükkân 19., hafif sanayi 20."; üretim raporu: Alfa-0 19 (`dukkan` ek yapı), Alfa-1 20 (`hafif_sanayi`) | Tek sayı yok: **karar gerekli**. Oyuncuya görünen "yapı" listesi tanımlanmalı (maden ocağı 4 kimlik = 1 yapı; Santral 2 kimlik = 1 yapı) ve Dükkân + Muhtarlık durumuna göre toplam yazılmalı. **Y-35 notu:** Ordugâh, Karakol ve Gözetleme Kulesi bayraklı Alfa-0 ek yapılarıdır (`mulk.ekYapilar`; "Ordugâh Alfa-1" ifadesi geçersiz); Nöbet Evi kamu hizmet hücresidir, yapı sayısına girmez | docs/11 §7.3 başlığı ve §6; docs/06 §15.3; sentez S11; cesitlilik-uretim Q1 |
| T-11 | **Muhtarlık oyuncuya ait ek yapı** (06 §15.3; `parametreler.json` `ekYapilar.muhtarlik`: ilde ≤1, oyuncu arsasında) | **Meydandaki kamu yapısı**; mülk kipinde oyuncuya kapalı (S9, docs/12 §10) | docs/06 §15.3; `parametreler.json`; docs/11 §7.3, §7.6 |
| T-12 | **Mal sayısı:** 23 (G5) ↔ Alfa-0 "35 mal" (cesitlilik-uretim §0 madde 9; bilim Ö4 "35 mal sınırı") ↔ ≈82 toplam katalog ↔ `il-imza.json` 75 `ileride` kimliği (il-imza.json, 9f79e18) | **Alfa-0: 24 mal** (14 + 9 + `kepek`; docs/12 §10'daki 23 + Y-37; T-36 çözüldü); A0-ops +4, Alfa-1 +4 (dikey) ve üretim raporuna göre kümülatif 28 / 47 / 55; 35 ve 82 uzun vadeli katalogdur. Sahibin yeni yönergeleri (et, deri) için kimlik listesi **birleşik** kilitlenmeli (24 mal, 21 yeni kimlik; üretim K-1) | cesitlilik-uretim §0 ve §7; bilim Ö4; il-imza.json (commit öncesi); sentez G5 |
| T-13 | **Teknoloji düğüm sayısı:** docs/04 §9.4 "Alfa-0 mevcut 6"; kod **7**; docs/08 ve docs/00 A11 "≈17"; cesitlilik-yonetim "17 → ~26"; bilim "97 düğüm, Alfa-0 ilk 13" | Alfa-0'da **koddaki 7 düğüm**; genişleme Alfa-1 sonrası (docs/04 §9.4). Üç genişleme önerisi birbiriyle çelişir: **karar gerekli** (hangisi esas) | docs/04 §9.4; docs/10 §4 madde 3; cesitlilik-yonetim §6, Ü-yeni-11; bilim §4 ve G9 |
| T-14 | **İlk inşa süresi** "~24 dk" ve "ilk 10 dk'da hasat" (docs/11 §7.3, §7.9; harman Ç5) | Kodda ilk Tarla 2 sa × erken oyun çarpanı %10 = **12 dk** (06 §15.5); ilk 24 saat sabit %10, 168. saatte %100. Hasat 12. dakikadan sonra; ilk satış başlangıç kitindeki stoktan | docs/11 §7.3 ("Onboarding hızlandırması"), §7.9 "İlk 10 dakika"; harman §5 |
| T-15 | **Yeni oyuncu paketi çelişkileri:** yurt 6 ↔ 8 hücre (baslangic Ç2); "ilk 5 dk tam iade" ve "7 gün geri alım +%10" (arsa-ve-insa) ↔ kodda yalnız %70 `parsel_birak`, %50 `insaat_iptal`; "ilk 72 saat pişmanlık penceresi" (baslangic §3.3); kalkan 7 ↔ 14 | **Kod:** yurt 6, iade %70/%50, kalkan 14 (mülk kipi) / 7 (bölge kipi) (06 §15.1, §15.4–15.5). Yurt 8 ve pişmanlık penceresi **öneridir**, karar yok | baslangic §3.2–§3.3; arsa-ve-insa §6; docs/11 §7.9 (kalkan notu) |
| T-16 | **"Çekirdek ve sunucu değişmez (yalnız komut zinciri)"** (docs/11 ek karar 1 "Uygulama") | Atomik `yapi_yerlestir` ve `parsel_birak` çekirdeğe **eklendi**; zincir iki komutta oyuncuyu istemeden arsa sahibi bırakırdı (06 §15.4; arsa Z13) | docs/11 ek karar 1 son maddesi |
| T-17 | **K-2 "%4 kamu arsası + mahalle başına meydan"** (imza K-2; docs/11 §7.2'de kamu arsası satırı yok) | **Mahalle Paketi 20 hücre + %4 hazine rezervi + ilçe merkezi 8–12 + kıyı 2** (G1, S3); kamu arsası ≤72/%25 tavanına sayılmaz | imza K-2 ve §5.2; docs/11 §7.2 (kamu arsası satırı ekle); istemci `arsa.ts` geçici türetme |
| T-18 | **Fiyat paydası ve ayrılmış hücre:** docs/11 §7.2 formülü, kodda payda = ilçenin **tüm** uygun hücresi; ayrılmış hücre karma ile ilçeye saçılmış (arsa B2–B3) | Kıtlık fiyatı işlemez; kural açık havuz ve arsa düzeyi olmalı (arsa Z14, **öneri**). **Alfa-0 öncesine çekildi (baş lider, Y-37);** kural ayrıntısı karar bekler ve yayımlanmış fiyat sözü ("%25 satılırsa ×1,5") kalıcıdır | docs/11 §7.2; 06 §15; arsa-ve-insa §1 B2–B3, Z14 |
| T-19 | **Ambar "bozulma ×0,5" ve depo tavanı** (docs/11 §7.3) | Kodda yalnız kapasite eki (+5.000 birim); bozulma yok; soğuk dolap modülü ve ekmek/süt bozulması buna dayanır (sentez Ö13) | docs/11 §7.3 Ambar notu; 06 §15.3 (zaten "bu işte yoktur" yazıyor) |
| T-20 | **"Derinlik lojistiktedir"** (docs/00 §4 tarihsel; docs/08 §3 lojistik v1: filo, yakıt; docs/10 E6) | Lojistik **arka planda ve otomatik**; karar "nereye kurmak"; filo/yakıt ertelendi (K29; docs/11 §4.1). Dikey §1 "iller arası lojistik gerçek bir karar" bununla uyumlu (maliyet, rota değil) | docs/08 §3 başına 1 Ekim notu; docs/10 E6 durumu |
| T-21 | **"Haber LLM'siz"** (canlı dünya §6.5, §10 k4; cesitlilik-yonetim §8.4; rehber GS-7, GK-7) ↔ sahibin çalışma zamanı yapay zekâsı | **Çözüldü (sentez Ö4):** karar kanalı ajan, anlatım kanalı şablon; haber ve görev metninde LLM yok. **Kamusal alan NPC'leri** için seyrek ve tavanlı LLM (sahip) **ayrı bir katmandır**: sunum, çekirdeğe girmez (§7) | canli-dunya §6.5 başına "kamusal NPC istisnası" notu; rehber GS-7 |
| T-22 | **Talep modeli:** docs/11 §7.10 "NPC derinliği = max(0, hedef − kayan oyuncu hacmi)" ↔ kod: `npcLikiditeOlcekPpm` oyuncu sayısıyla **büyür** (canlı dünya B5) | **Alfa-0 öncesine çekildi (baş lider, Y-37);** kural ayrıntısı karar bekler (canlı dünya k10: yerel nüfus kanalı; B5 çift sayım düzeltmesi aynı sürümde) | docs/11 §7.10; canli-dunya §1.2 B5, §10 k10 |
| T-23 | **`ilk_dukkan` = Ticaret ofisi köprüsü** (rehber GS-1) ↔ Alfa-0'da `dukkan` (dikey R11) | Koşul `tesisler[tur ∈ {dukkan, ticaret_ofisi}]`; dükkân gelince hedef dükkândır (sentez Ç5) | rehber §3.1, GS-1 |
| T-24 | **README, docs/04 §9, docs/10, docs/11 §6 eskimiş:** README doküman dizininde docs/12 ve 15'ten fazla rapor yok, "Sunucu ... Sprint 1'de yazılıyor", "çelişkide 06 ve 11 önceliklidir"; docs/10 sayımları ("207 görev, 11 devam") ve E-listesinde dalga 3 işleri yok; docs/04 §9.2 ve docs/11 §6.1 Alfa-0 kapıları yeni P0'ları yansıtmıyor | Bu belge tek doğruluk kaynağıdır; dört belgeye işaret ve güncelleme gerekir | README (dizin ve öncelik cümlesi); docs/10 (yeni epik: kamu, perakende, rehber, ödül); docs/04 §9; docs/11 §6 |
| T-25 | **"Devlet seç" ekranı** hâlâ istemcide (`arayuz/devlet-sec.ts`, bölge kipi); docs/11 F0/K25 "kalkar" | Mülk kipinde gizli; bölge kipi hata ayıklama olarak kalır. Ürün tanımı: devlet seçimi yok (K25) | istemci kod notu; docs/10 E1-G10 kapanışı |
| T-26 | **Etkisiz yer tutucu yapılar** oyuncuya açık: Konut, Garaj, Atölye-Lab (06 §15.3) | "Profesyonel ürün" ilkesi (Y-22) ile bağdaşmaz; Alfa-0'da **gizlenmeli ya da etki verilmeli** (karar gerekli, §5.2) | 06 §15.3; docs/11 §6 yapı sütunu |
| T-27 | **"NPC Kaymakam" üç anlamda:** kalıcı denetçi, oylanmayan atanmış temsilci (cesitlilik-yonetim §0 madde 1); makamın **yöneticisiz hâli** (yapay-zeka §2.2a; sentez Ö7); 7 gün pasif sonrası **kayyum** (imza İ-1) | **kapandı (Y-39):** "NPC Kaymakam" = yöneticisiz hâl; denetçi/devralma = "kayyum" | cesitlilik-yonetim §3–§4; yapay-zeka §2.2a; imza §2.1 |
| T-28 | **Savaş ilanı:** yalnız vali (docs/11 §7.7) ↔ "il meclisi onaylı, hedef önceden bildirilir" (cesitlilik-yonetim §5.4); hazırlık 12–24 sa ↔ ≥20 sa (Ü-yeni-9) | Alfa-1 kararı; Alfa-0'ı etkilemez | docs/11 §7.7; cesitlilik-yonetim §5.4 |
| T-29 | **Rehberlik ödülü** "₺4.000 / yeni esnaf, sistemce basılır" (baslangic §5.4) | Tutar taşımayan `sistem_odul {kavram}` + çekirdek tablosu; tavan ve para arzı panosunda ayrı satır (G4; sentez Ö9) | baslangic §5.4 |
| T-30 | **İki "yerel pazar":** docs/11 §7.10'daki küresel NPC pazarı ↔ canlı dünya §4.1 "yerel pazar kanalı" ↔ dikey R5 bağımlılığı | Kodda **yalnız küresel NPC pazarı** ("yerel" = limansız ilde aynı pazara erişim, 06 §15.2); canlı dünya A0-2 yerel kanalı kodda **yok**; **P0'a alındı (baş lider, Y-37)**, uygulama bekler | docs/12 §10 P0 sırası; canli §11 A0-2; dikey R5 |
| T-31 | **`il-imza.json`** (çalışma ağacı, commit öncesi) planlı 73 mal kimliği ve imza çarpanı; çekirdek okumuyor (yalnız Yerleş önerisi) | İlk `icerik.json` sürümünden önce kimlik kilidi; +%10 imza çıktı bonusu henüz uygulanmıyor | sentez §6 madde 2; cesitlilik-uretim §3, §4.3 |
| T-32 | **Hibe harcama kısıtı** (%60 kredi / %40 serbest; cesitlilik-yonetim Ü-yeni-5) ↔ kodda hibe serbest, baslangic hibeyi serbest bırakır | Kodda serbest; kısıt **öneri** ve karmaşıklık ekler (§5.2) | cesitlilik-yonetim §10, Ü-yeni-5 |
| T-33 | **Büyük harf:** docs/11 §9.4 "büyük harf `toLocaleUpperCase('tr')` ile: İSTANBUL" | **Haritada ve arayüzde büyük harf kullanılmaz** (docs/12 §9; gorsel-kimlik karar 4) | docs/11 §9.4 satırı |
| T-34 | **"Sezon" sözcüğü** oyun içi olay adında: "Düğün sezonu" (canlı dünya §5.2 ve olay E5); docs/10 E4-G1 bir anıştırma | K21: oyunda ve belgelerde "sezon" kullanılmaz → "düğün dönemi" | canli-dunya §5.2–§5.3 |
| T-35 | **docs/12 §6 "Sıradaki iş" tablosu** (1 Ekim 09:10; durumlar "Çalışıyor / Başlıyor") | Tarihsel kayıt; güncel sıra §10 P0 ve bu belge §6 | docs/12 §6 (başına "tarihsel" notu) |
| T-36 | **`kepek` 24. mal** (üretim K-1, K-5, SS-2) ↔ "Alfa-0 için 23 mal" (G5; docs/12 §10) | **Çözüldü (baş lider, Y-37):** `kepek` kabul edildi; G5 kilidi 24'e genişledi (ilk `icerik.json` öncesi). Kalan: docs/12 §10 "23 mal" ifadesi ve Alfa-0 sayıları 24 olarak düzeltilmeli | uretim-agi §3.2, §9.1; sentez G5; docs/12 §10 |
| T-37 | **Dükkân tür kataloğu üç raporda üç farklı:** dikey 6 tür; üretim §5.4: Alfa-0 5 / Alfa-1 8 tür (+ kasap, + "ayakkabı ve deri"; "bakkal → market → süpermarket" Alfa-1); perakende §5.1: 13 kayıt (bakkal, market, supermarket, firin, sarkuteri, sekerci, yapi_market, giyim, kasap, manav, mobilyaci, toptan, tezgah); bakkal raf listeleri de farklı (perakende 3. tur: `gida, ekmek, un, sut, sut_urunu, sekerleme, findik_urunu, yakit`) | Kademe ve tür kataloğu için **perakende raporu esas** (Y-31: kademeler iş modeli); "ayakkabı ve deri" türü yalnız üretim raporunda (karar gerekli); bakkal raf listesi tek yere yazılmalı | dikey §5.3; uretim-agi §5.4; perakende §3.2, §5 |
| T-38 | **"L yalnız M'den yükseltmeyle", "süpermarket yalnız Merkez ilçede", "market yalnız Kasaba'da", türlerin "açıldığı ilçe seviyesi"** (perakende **1. tur** metni: §3.2, §3.5, §5, §13 k3) | **Geçersiz ve perakende raporunun son turunda (3. tur, onaylı) düzeltildi** (docs/12 §12, Y-31, Y-33): açılış kilidi yok; kısıt sermaye, arsa/ayak izi, gider, tekelleşme koruması; yükseltme seçenek. Başka belgelerde (docs/11 §7.4 perakende satırları; dikey §5.3 tür tablosu ilçe sütunu) aynı ifade kalmış olabilir | docs/11 §7.4; dikey-zincirler §5.3, §5.2; cesitlilik-uretim §7.5 |
| T-39 | **Açılış Tezgâhı** (harman Ç2 önerisi; perakende K0 olarak tablolaştırdı: ilk 14 gün, kamu pazar yeri yuvası, hücre yok, 2 raf, kasa 20) ↔ başlangıç kitindeki gıda zaten satılabilir (06 §15.2) | **Karar gerekli:** yeni tür + kamu pazar yeri yuvası + yeni oyuncuya özel kural ekler; Y2 ölçümü yoksa Alfa-0 P1 ya da Alfa-1 | harman Ç2; perakende §3.2, §9.3 |
| T-40 | **Ad karışıklığı "Akşam Defteri" / "Bugün" / "Sen yokken"** ve "<6 sa Defter kapalı" (rehber §2.4) ↔ "her girişte Akşam Defteri 30 sn" (harman §3.6) | Öneri: sekme **"Bugün"**, ekran **"Sen yokken"**, "Akşam Defteri" iç terim (gün kapanışı satırı); yedi yokluk bandı (donus DB-1, DB-2) | harman §3.2, §3.6; rehber §2.4; canli §6.3 |
| T-41 | **Görünen mal sınırı** ≤28 etkin liste (cesitlilik-uretim §7.1, §7.5, S-2) ↔ ≤36 + aile sekmesi + ara mal sessizliği (üretim §8.2–8.3) | **Karar gerekli** (öneri 36); Tier 1 ve zincir ara malı ayrı sayılmalı | cesitlilik-uretim §7; uretim-agi §8 |
| T-42 | **İstemci takvimi sim-saatine bağlı** (`takvimDurumu(simSaat, {baslangicGunu, gunCarpani, ayGunleri})`, "N. yıl") ↔ gerçek takvim, 1:1 mutlak saat (Y-10) | Üst çubuk takvimi gerçek tarihe (Europe/Istanbul) geçer, "N. yıl" etiketi kalkar | donus DB-10; `istemci/src/veri/tarim.ts`, `arayuz/panel.ts` |
| T-43 | **Perakende Alfa-0 payı:** perakende 3. tur, onaylı (Alfa-0 = yalnız **S dükkân** 5 tür + Açılış Tezgâhı; market, kademe çarpanı, Yakınlık, süpermarket, zincir, pay tavanı Alfa-1; "M erken açılış" gözlem kapısı) ↔ sahip yönergesi "sermayesi olan doğrudan süpermarket açar" (Y-31) ↔ üretim §5.4 (market ve süpermarket Alfa-1; **perakende 3. tur ile uyumlu**) ↔ P0 "ekmek zinciri + dükkân" | Zamanlama çelişmez (üretim ve perakende uyumlu); ama seçim ilkesi Alfa-0'da yalnız bakkal / marka / tabela düzeyinde görünür. **Karar gerekli:** market ve süpermarketi (korumalarıyla: kademeli pay tavanı, ruhsat, kota) Alfa-0'a çekmek mi, Alfa-1 A1/A2'de mi açmak (§3B.6) | perakende §12.3, §15; uretim-agi §5.4; docs/12 §10, §12 |
| T-44 | **`hafif_sanayi` 20. yapı** (üretim K-6: ilk veri sürümünde) ↔ cesitlilik Q1 "Alfa-0'da yöntem ailesi, Alfa-1'de ölçümle 19./20. yapı" ↔ sentez S11 | **Karar gerekli, ilk veri sürümünden önce** (deri ve tekstil yöntemleri hangi tesiste doğar; sonradan taşımak canlı tesisleri bozar); T-10 ile birlikte | uretim-agi §7.4, K-6; cesitlilik-uretim Q1; sentez S11 |
| T-45 | **Komşular bloğu ve kamusal veri sınırı** (donus §2.4) ↔ "gazetede / ihale kartında oyuncu adı" (canlı §6.4, imza K-8, Ü-yeni-10, S7) | Donus kuralı daha sıkıdır (yasak liste; adlı yalnız etkileşimin tarafı ya da rıza); G19 ve S7 ile **birlikte** karara bağlanmalı; ad anma rızası varsayılan kapalı | donus §2.4; canli §6.4; imza K-8 |
| T-46 | **docs/11 §7.4 "İlçe gelişim seviyesi ... ilçedeki herkes için S/M/L ölçeğin ve yeni yapı türlerinin kilidini açar"** (Köy: S ölçek, Tarım/Maden/Ambar/Konut/Ticaret ofisi; Kasaba: M, fabrikalar, Santral, Garaj, Atölye-Lab; Merkez: L, ortak projeler); docs/11 §7.3 "Ölçek kilidi ilçe gelişim seviyesine bağlı"; uretim §7.1–§7.4; perakende §3.2, §5; bilim G10, Ö1 | **Geçersiz (baş lider kararı Y-33; docs/12 §13):** ilçe seviyesi **yalnız kolektif dünya durumu** (NPC talebi, kamu altyapısı, ruhsat kotası vb. toplu etkiler); bireysel açılış kilidi değildir. Seviye eşikleri (Ü6) yalnız bu toplu etkiler için kalibre edilir | docs/11 §7.3 (Yükseltme satırı), **§7.4 tümü**, §6 yapı sütunu; uretim-agi §7.1–§7.4; perakende-kademeleri §3.2, §5; bilim §3.1 ve Ö1; cesitlilik-uretim §7.5 |
| T-47 | **L ölçek teknoloji kilidi:** `parametreler.json` `sanayi.olcekKademeleri[2].gerekliTeknoloji = "otomasyon"` (`sanayi/komut.ts` satır 69 denetler; docs/11 §7.4 Merkez satırı "L ölçek (+`otomasyon` teknolojisi)"; 06 §12; uretim §7.2 "L için `otomasyon`") | **Mülk kipinde kalkar (baş lider kararı Y-32; docs/12 §13):** teknoloji kilit değil, verim ya da maliyet avantajıdır; **bölge kipinin altın testleri için o kipte değişmez.** Uygulama: mülk kipinde L ölçek denetimini atla (kod değişikliği, §8.1 madde 20); `otomasyon` teknolojisinin tanımı (maliyet/verim etkisi) yeniden yazılmalı | `packages/veri/icerik/parametreler.json`; `cekirdek/src/sanayi/komut.ts`, `sanayi/tablo.ts`; docs/06 §12; docs/11 §7.4; uretim-agi §7.2 |
| T-48 | **"Tier 1 ilçe gelişim seviyesine göre görünür" (Köy 12 → Kasaba 22 → Merkez/Şehir 29)** (cesitlilik-uretim §0 madde 2, §3, §7.1, §7.5) | Y-33 gereği seviye bir **görünürlük kilidi** de olamaz; görünürlük bağlama duyarlı olmalı (stoktaki ∪ işletilen yöntemlerin girdi/çıktısı ∪ raf ∪ Fırsat Kartı; ara mal sessizliği; Ürün Atlası keşfi: üretim §8.3). Bu kural **gözden geçirilmeli** | cesitlilik-uretim §0, §3, §7.1, §7.5 (satır 536 civarı); uretim-agi §8.3 |
| T-49 | **"Ölçek yükseltme aynı ayak izinde"** (arsa-ve-insa Z4: "L = 4 hücre gibi büyütme kırıcıdır"; docs/11 §7.3 "Yükseltme: aynı akış"; uretim §7.1–§7.2 eski taslak "arsa 2–3 hücre, aynı (öneri: L +1)"; perakende **1.–2. tur** §3.6 "varsayılan 1 hücre (Z4 uyumu), süpermarket 2 hücre istisna"; `mulk.yapiYuva[tür]` türe göre **tek sabit**: Tarla 2, Çelikhane 3, Santral 3...) | **Güncel doğru (baş lider kararı Y-34, docs/12 §13; genelleme onaylı):** ayak izi ölçekle büyür; `olcekHucre[tür] = [yuva, yuva+1, yuva+2]` (S, M, L; `yuva` = bugünkü `yapiYuva`: Tarla 2/3/4, Çelikhane 3/4/5, Santral 3/4/5); **yapı biçimi en çok 5 hücre, bağlı kenar-bitişik küme** (Z4'ün 1–3 hücre biçim kümesinin yerine geçer); doğrudan kurulum baştan; yerinde yükseltmede ek bitişik hücreler kendi boş hücren ya da aynı atomik işlemde satın alınabilir, değilse yükseltme yapılamaz (fiziksel koşul); ≤72 / %25 geçerli. **Dükkân kesin hâli (perakende raporu 3. tur, onaylı; ara durum kapandı):** `yuva` 1 olduğundan `olcekHucre = [1, 2, 3]` (bakkal 1, market 2, süpermarket 3); süpermarketi 2 hücrede tutmak isteyen `[1, 2, 2]` istisnasını tür verisinde gerekçeyle yazar (alternatif; karar verilmedi); parametre yeni kurulumlarda değişir, mevcut yapılar değişmez; süpermarket doğrudan inşa edilebilir. Üretim raporu da aynı genel kuralı kullanır (K-14). **Kalan tek not:** Ordugâh gibi 3 hücreli yapıların L'si 5 olur (üst sınır); mülk kipinde `tesis_olcek_yukselt` davranışı doğrulanmadı | arsa-ve-insa Z4, §3.1; docs/11 §7.3 (yuva sütunu, Yükseltme satırı); docs/12 §13; uretim-agi §7.1, §10 K-14; perakende §3.2, §3.6, §14 k3; `parametreler.json` `mulk.yapiYuva`; `cekirdek/src/mulk/yapi.ts` |
| T-50 | **Eşkıya ön duyurusu:** cesitlilik-yonetim §5.3 "≥6 sa (Kule ile 12 sa)" ↔ canlı dünya F1 "olay ön duyurusu ≥24 sa" ↔ imza K1 "erken haber +6 sa" | **24 sa** (Kule +12 sa = 36 sa; askeri rapor K11): baskın yağma yaptığı için; çevrimdışı oyuncuya gece yarısı baskın kapanır. cesitlilik-yonetim §5.3'teki 6 saatlik ifade düzeltilmeli | cesitlilik-yonetim §5.3; canli F1; imza K1; askeri-katman-v1 §0.4 T1 |
| T-51 | **"Birlikler il komutanlığında havuzlanır"** (docs/11 §7.7) ↔ birlik envanteri oyuncunun işletme düğümünde | **Envanter oyuncuda, komuta ilde** ("il nöbeti" duruşu; askeri rapor K2): ikmal, maaş, kayıp ve ganimet sahibine ait; arayüzde "komutanlık" yerine **"İl savunma düzeni"** (gerçek kurum adlarıyla karışmasın, §3D.8); docs/11 §7.7 metni düzeltilmeli | docs/11 §7.7; askeri-katman-v1 §2.3, §6 |
| T-52 | **PvP yağma tam aktarım** (kodda `kayipTavaniUygula`: alınanın %100'ü saldırana; yalnız depo taşması israf) ↔ Y-36 "%60 saldırana, %40 yok olur" | **Y-36 esas** (aklama ve yağma çiftliğini kârsız kılar); kod `yagmaIletimPpm` 600.000 ile değişmeli (Alfa-1 PvP; bölge kipi altınları korunacak); PvE yağması oyuncudan NPC'ye mal lavabosudur | `cekirdek/src/askeri/savas.ts`; askeri-katman-v1 §3.6, §3.9 |
| T-53 | **Birlik ikmal tablosu bölge kipi için yazıldı** (Piyade Tümeni ≈₺6.432/gün; mülk kipinde oyuncu geliri ≈₺50–130 bin/gün: 4 tümen günlük gelirin %20–50'sini yer) ↔ Y-36 "mülk kipinde ×0,25" (≈₺1.752/gün) | **Y-36 esas:** `askeri.ikmalCarpaniPpm` yalnız mülk kipinde 250.000, bölge kipinde 1.000.000; kalibrasyon ölçümle gözden geçirilir; docs/11 §7.7 ve cesitlilik-yonetim ikmal tablolarına "mülk kipi çarpanı" notu | `askeri/uretim.ts`; parsel-v0-bulgular bulgu 4; askeri-katman-v1 §0.3 |
| T-54 | **Kamu arsası ölçeği:** G1 "Mahalle Paketi 20 hücre + %4 hazine rezervi + ilçe merkezi 8–12 + kıyı 2; yoğun ilçede ≈%8–9" ↔ docs/12 §13 (4. madde): kamu blokları **dikdörtgen ada** olarak saklanır, "mahalle paketi ~7.000 uygun hücre başına bir", rezerv birkaç büyük ada, halka halka açılış Alfa-1 | İkisi birlikte okunur (Y-38 G1'in saklama biçimini ve yoğunluğunu değiştirir); **kapandı (docs/12 §13: paket içeriği ~20 hücre ile sıklığı ~7.000 uygun hücre başına bir ayrı parametrelerdir; çelişki yok)**; çekirdek uygulaması çalışma ağacında incelemede, depoda yok | docs/12 §10 G1–G7, §13; sentez §3.1; c2221dc |

### 5.2 Odak kayması ve kapsam şişmesi: ana döngüye hizmet etmeyen ya da kapsamı şişiren fikirler

Ölçüt: §1.4 odak sınaması. "Öneri" sütunu **kısa bir odak önerisidir**, karar değildir. **hiç** = ürün kapsamından çıkar; **sonra** = Alfa-1 sonrası ya da v1.5+. (Etiketler küçük harfle yazılır: büyük harf yok ilkesi.)

| Fikir | Kaynak | Ana döngüye hizmeti | Öneri |
|---|---|---|---|
| **Açılış Tezgâhı** (anında, parasız ilk satış sahnesi; perakende K0) | harman Ç2; perakende §3.2 | ilk satış ≤60 sn için; ama başlangıç kitinde gıda stoğu var, ilk satış zaten mümkün; yeni tür, kamu pazar yeri yuvası ve yeni oyuncu kuralı gerektirir | **Alfa-0 P1 ya da Alfa-1**; Y2 ölçümü kötüyse öne al (T-39) |
| **Perakende kademelerini ilerleme basamağı yapmak** ("önce bakkal, sonra market, sonra süpermarket"; ilçe seviyesi şartı) | perakende §3.2, §13 k3 | seçimi daraltır, sermayeli oyuncuyu bekletir | **hiç** (docs/12 §12): kademeler iş modelidir |
| Zincir Kartı eşiklerini (≥3/6/10) kurma **önkoşulu** yapmak | perakende §4.1 | yok | eşikler yalnız **avantaj eşiği**; zincir kurmak ve marka kimliği serbest |
| Hatıralar, Web Push, e-posta digest, `.ics`, selam şeridi, Komşular katman 1 | donus §3.3, §4.6, §2.10 | dönüş deneyimi | **Alfa-1+**; Alfa-0'da yalnız Gün Sayfası çekirdeği ve oyun içi hatırlatma |
| Çalışma zamanı LLM ile "kişisel özet cümlesi" | donus §5.5 | yok | **hiç** (gecikme, determinizm, KVKK, enjeksiyon) |
| Kasap, manav, mobilyacı, toptan deposu, konsinye, veresiye, franchise | perakende §5, §6–7 | mal bağımlı ya da ileri ticaret | kasap ve manav mallar geldikçe **Alfa-1**; toptan **Alfa-1 son**; konsinye, veresiye, franchise **sonra** |
| Hayvan sağlığı hastalık olayı (`sure_hastaligi`), tabakhane OSB şartı, mezbaha, deri ve ayakkabı hattı | uretim-agi §4.1, §6 | üretim ağı | **Alfa-1+** (dilim A1-a/b); Alfa-0 yalnız kısa yol |
| Paralı asker, ittifak ortak seferi, korsan, kaçakçı, askeri teknoloji ağı | cesitlilik-yonetim §5; bilim §5 | askeri | **Alfa-1 sonrası** (savaş akışı Alfa-1; geri kalanı sonra) |
| Askeri eğlence artıları E1–E3 (hazır emir, tur dökümü, güvenlik şeridi, kitabe ve unvan), ses | askeri-katman-v1 §4A.6, Ö10 | rekabet (karar çeşitliliği) | **sonra** (Alfa-0 sonrası değerlendirme; Y-35); dilim onlarsız çalışır; ses varsayılan kapalı |
| Koruma hizmeti (M2), yürüyüşte "Mevzi hazırla" nöbet turu, Sur/Barikat, Güvenli depo | askeri-katman-v1 §1.5, §2.2, §3.6 | askeri | **Alfa-1 / sonra**; Alfa-0'da yok |
| Mini oyun (pişirme vb.), kahvehane tavla/okey | capital-rift; harman Ç4 | yok (beceri, kumar çağrışımı) | **hiç** |
| Dolmuş hızlı seyahat | harman Ç3 | yürüyüş adaptasyonu | **sonra** (yürüyüşle birlikte) |
| 17 imza adayı + 5 imza aynı anda | imza §3, R-İ6 | karışık | Alfa-0'da yalnız **İ-2 "gün görünümü"** ve **çay ocağı = Dikkat/Takvimden satırı** (şablon); N14, N3, N8 Alfa-1; N4 ihale Alfa-1 / v1.5; kalan **sonra**; N13 memleket/hemşehri **hiç** (hassasiyet). "Aynı anda en çok bir imza" |
| Teknoloji 97 düğüm + 36 askeri düğüm, keşif olayları, konsorsiyum, patent, lisanslı üretim | bilim | genişle / rekabet | Alfa-0'da **mevcut 7 düğüm**; ağın tamamı **sonra**; patent ve konsorsiyum **sonra** |
| Yönetişim: 8 ilçe kartı, 5 çıkar grubu, seçim haftası, vaat karnesi, 7 yasa + 5 il kartı | cesitlilik-yonetim §4 | yönet | **Alfa-1 (F6)**; Alfa-0'da "salt okunur kart" bile eklenmez (NPC vali sabit) |
| Kamu: KÖİ, sanayi tahsisi, Profil T (artırma), 5 hak türü | kamu §1.3–1.4, §3.2 | yönet / sat | tek hak makinesi Alfa-1 sonu; **KÖİ ve sanayi tahsisi sonra** |
| Komşuluk: 35 modül, ada altyapısı, imece | arsa §3, §5 | genişle | Alfa-0'da **0–6 modül**; geri kalanı **sonra**; H11/H14 ölçümü şart |
| Müteahhit, aşamalı çekim, vardiya hızlandırma | arsa §4 | inşa | aşamalı çekim **Alfa-1**; müteahhit **v1.5** |
| 82 mallık katalog, Ürün Atlası (keşif), kalite kademesi | cesitlilik-uretim | üret / işle | Alfa-0'da **24 mal**; Atlas ve kalite **Alfa-1+** |
| Kooperatif, esnaf odası, lonca, şirket; oyuncu emir defteri; zincir market (gıda dışı) | imza N1, N2; docs/11 §4.1; dikey k13 | sat / rekabet | **v1.5 / sonra** |
| Serbest metin sosyal yüzey, kamusal NPC ile serbest sohbet | imza K-13; sahip fikri | yok | **hiç**; Alfa-1'de kalıp mesaj + yapılandırılmış ilan; karantina deseni **sonra** |
| Kozmetik gelir (tabela, dolmuş) | harman Ç7; baslangic Ç10 | yok | **hiç** (gelir modeli Ü12'ye kadar tümü ücretsiz) |
| Haftalık Dünya Raporu oyuncuya; Portföy Ligi (YG1–YG7) oyun özelliği olarak | canli §4.6; imza §4.6 | ölçüm aracı | **yönetici panosu**; oyuncuya **hiç** |
| Oyuncu ajanı, BYOK, oyun API'si | kamu §2.6; yapay-zeka §5.6 | tam otokontrol istenmiyor | **hiç** (Y-29) |
| Hibe harcama kısıtı (%60 kredi / %40 serbest) | cesitlilik-yonetim Ü-yeni-5 | yeni oyuncuya sürtünme | **hiç (Alfa-0)** |
| Etkisiz yer tutucu yapılar (Konut, Garaj, Atölye-Lab) oyuncuya açık | 06 §15.3 | yok | Alfa-0'da **gizle** ya da etki ver |
| Sokakta NPC kalabalığı ve trafik silueti | canli §7 | canlılık | **Alfa-1**; Alfa-0'da harita rozeti yeter |
| Gurbetçi dönemi, bayram paketi, "Esnaf Haftası" adı | imza N8, Q5–Q6 | canlı dünya | gurbetçi 15 Haziran 2027'de başlar (zaten uzak); Alfa-0'da yalnız **bayram hatırlatması**; ad ve içerik sahip onayı |
| Rehber içeriği ≈45 görev / ≈135 metin | rehber §6.3 | rehber | Alfa-0'da ilk gün ≈20 kart (P0); kalanı P1 / Alfa-1 |

### 5.3 "Seviye ya da kilit yok, seçim var" taraması (docs/12 §12 sahip kararı; §13 baş lider kararları)

Ölçüt: açılışı **sıra, seviye ya da başkasının eylemine bağlı** bir kapı kilitliyorsa çelişkidir. **Kalabilecek kısıtlar** yalnız: sermaye, uygun arsa ve ayak izi, girdi, işletme gideri, adalet ve tekelleşme korumaları. **İlçe gelişim seviyesi gibi toplu kapılar için ayrım:** *kolektif dünya durumu* (ilçenin nüfusu, talebi, hizmet kapasitesi, ortak proje kataloğu; herkesin paylaştığı gerçek) **kalabilir**; *bireysel kilit* (senin ölçeğini, yöntemini ya da yapını açan ya da kapatan kapı) **kalkmalıdır.** Kodda bugün **ilçe seviyesi kilidi yoktur** (ilçe seviyesi yalnız bir alan); tek bireysel kapı **L ölçek teknoloji kilididir** (`otomasyon`; Y-32 ile mülk kipinde kalkar). Yani ilçe seviyesi kararı kodlanmadan yazılabilir.

| # | Kilit | Yer | Tür | Öneri |
|---|---|---|---|---|
| KL-01 | Süpermarket yalnız M'den yükseltmeyle, ≥14 gün işletme sicili | perakende §3.2, §13 k3 | bireysel sıra kilidi | **Kaldır** (Y-31); doğrudan inşa mümkün, yükseltme seçenek |
| KL-02 | Süpermarket yalnız Merkez ilçede (gelişim puanı ≥180, ≥20 sahip) | perakende §3.2, §5 | ilçe seviyesine bağlı bireysel kilit | **Kaldırıldı (Y-31, Y-33);** küçük ilçede kasa dolmaz ve gider bindirir: seçimin ekonomik riski, kilit değil |
| KL-03 | Market yalnız Kasaba'da; dükkân türlerinin "açıldığı ilçe seviyesi" (şarküteri, kasap Kasaba; mobilyacı Merkez) | perakende §3.2, §5 | aynı | **Kaldırıldı (Y-31, Y-33);** arsa izin matrisi (ticari/konut hücre) ve talep kalır |
| KL-04 | Zincir Kartı eşikleri ≥3 / ≥6 / ≥10 (Z3: ≥2 il, ≥1 süpermarket) | perakende §4.1 | avantaj eşiği (ödül) | **Kalsın ama önkoşul değil avantaj eşiği** diye yazılsın; zincir ve marka kimliği serbest |
| KL-05 | Fabrika ve üretimhane ölçeği S/M/L ilçe seviyesine bağlı (Köy/Kasaba/Merkez) | docs/11 §7.3–§7.4 ("ölçek kilidi ilçe gelişim seviyesine bağlı"); uretim-agi §7.1–§7.2 | ilçe seviyesine bağlı bireysel kilit | **Kaldırıldı (Y-33).** Kısıt sermaye (inşa ×1/2,5/4,5), ayak izi, işgücü, elektrik, girdi, bakım ×1/2/3,2 |
| KL-06 | Yöntem listesinin ilçe seviyesine göre açılması (Köy temel, Kasaba orta, Merkez ileri) | uretim-agi §7.4 (son paragraf) | aynı | **Kaldır**; yöntem kısıtı teknoloji (sermaye + zaman) ve girdi |
| KL-07 | Yeni yapı türlerinin ilçe seviyesiyle açılması (Köy: Tarım, Maden, Ambar, Konut, Ticaret ofisi; Kasaba: fabrikalar, Santral, Garaj, Atölye-Lab; Merkez: L ölçek, ortak projeler) | docs/11 §7.4 | kolektif durum üzerinden bireysel kilit | **Kaldırıldı (Y-33): bireysel kilit değil; ilçe seviyesi yalnız kolektif dünya durumu.** Etkisi: nüfus ve ihtiyaç kademeleri (K1–K4 talebi), hizmet kapasitesi, pazar yeri tezgâh yuvası (4/8/16), ortak proje kataloğu, imar payı, "Köy/Kasaba" etiketi. Alfa-0'da zaten kodlanmadı: **kodlanmasın** |
| KL-08 | "Şehir sınıfı hücreler Şehir seviyesinde açılır" | docs/11 §7.4 | arsa niteliği ile seviye karışmış | Şehir sınıfı hücre **OSM'den gelen arsa niteliğidir** (fiyat 6.500 ₺); seviyeye bağlanmaz. Liman genişletme gibi ortak projeler kolektif seçenek olarak kalır |
| KL-09 | Lab ölçeği teknoloji kademesini sınırlar (S → K2, M → K3, L → K4); K4 yalnız `ortak_lab` (Merkez+ ilçe, Üniversite); Atölye-Lab Kasaba'da | bilim §3.1, G10; docs/11 §7.4 | ölçek + ilçe seviyesi kilidi | **İlçe şartı kalktı (Y-33).** Kalan karar: Lab ölçeği kademe sınırı; öneri para × kapasite × süre (daha pahalı ve yavaş), kapı değil; K4 için kolektif ortak lab seçeneği ve pahalı bireysel yol birlikte açık |
| KL-10 | Askeri teknoloji için tek yönlü sivil ön koşul | bilim G4 | sıra kilidi (girdi bağımlılığı olarak savunulabilir) | **Karar gerekli.** Öneri: ön koşulu girdi/maliyet çarpanına çevir ("askeri güç ekonomiden doğar" korunur) |
| KL-11 | Savunma sanayii kümesi şartı: Model III ve doktrin III için ilde ≥3 bağımsız sahibin aktif zincir yöntemi | bilim §5.5 | başkalarının eylemine bağlı kilit | **Karar gerekli.** Öneri: kilit yerine küme verim/maliyet etkisi; ya da kamu/NPC yedek tedarik |
| KL-12 | Hava savunma mevzii yalnız hava tehdidi olan ilçede açılır | cesitlilik-yonetim §5.2 | dünya durumuna bağlı kilit | **Önerilmez:** serbest bırak ya da yapıyı Alfa-1 sonrasına ertele |
| KL-13 | Vali adayları yalnız muhtarlar / görevdeki ilçe başkanları arasından | docs/11 §7.6; cesitlilik-yonetim Ü-yeni-1 | kariyer basamağı | **Karar gerekli.** Öneri: aday olmak serbest; şart yalnız adalet (hesap yaşı, aktif sahiplik, oy güvencesi K-16) |
| KL-14 | Oy hakkı: son 7 günün ≥3'ünde aktif parsel sahibi; mahalle muhtarı için ≥3 sakin ve ≥14 gün hesap | docs/11 §7.6; imza §2.1 | katılım/adalet (Sybil) | Kalsın (adalet koruması) |
| KL-15 | Süpermarket ruhsat + kota, ilçede ≤2 dükkân ve ≤1 süpermarket, ilde ≤6 / ≤2, kademeli pay tavanı (n=1 yok, n=2 %70, n≥3 %50; Alfa-1), Yakınlık Havuzu bakkal kademesine bağlı | perakende §3.6, §4.3, §9.3 | tekelleşme koruması | Kalsın (Y-31 açıkça izinli); süpermarket bu korumalarla **birlikte** gelir |
| KL-16 | ≤72 hücre ve %25; ≤2 eşzamanlı inşaat; %20 ayrılmış hücre (14 gün); 14 gün kalkan; 1:5 güç oranı; ilk 5 yapıda %30 indirim | docs/11 §7 | adalet / doğal kısıt | Kalsın |
| KL-17 | Açılış Tezgâhı yalnız yeni oyuncuya ilk 14 gün | perakende §3.2 | onboarding | Kalsın (kilit değil, isteğe bağlı başlangıç) |
| KL-18 | Kademeli ilçe açılışı (%70 doluluk) | docs/11 §6, K32 | kolektif dünya durumu (boş dünya riski) | Kalsın: kolektif; bireysel yapı seçimini kilitlemez |
| KL-19 | Ara kademe uzmanlığı Alfa-0'da yok (G13) | docs/12 §10 | Alfa kapsamı (içerik zamanlaması) | Kalsın: seviye kilidi değil, P5 sözleşme yokluğu |
| KL-20 | Dışlayan teknoloji çiftleri "tek aktif standart", bedelli değiştirilebilir; Esnaf Defteri sırası serbest | bilim G2; rehber | seçim | **Uyumlu** |
| KL-21 | **`gerekliTeknoloji` kapıları:** L ölçek için `otomasyon` (`parametreler.json`, kodda var; **mülk kipinde kalktı: Y-32**); yöntem, tesis türü ve birlik açıklığı da `gerekliTeknoloji` ile denetlenir (`mekanize_tarim`, `derin_madencilik`, `elektrik_ark_ocagi`, `konteyner_limani`, `mekanize_ordu`) | `parametreler.json`; `cekirdek/src/teknoloji.ts`, `sanayi/komut.ts`; docs/02, 06 §7, 08 §4 ("teknoloji yöntem açar") | teknoloji kapısı (sermaye + zaman) | **Y-32 yalnız L ölçeği kapsıyor; kapsamı belirsiz.** Teknolojinin tüm tasarımı "yüzde değil **yöntem açar**"dır (K19 çizgisi): "teknoloji kilit değil, verim ya da maliyet avantajı" ilkesi tüm kapılara genişlerse teknoloji sistemi yeniden tanımlanır. **Karar gerekli (baş lider):** yalnız L ölçek mi, tüm `gerekliTeknoloji` kapıları mı |
| KL-22 | **Yerinde yükseltmede ek hücre şartı** (ölçek büyürken ayak izi artar: `olcekHucre`, en çok 5 hücre) | baş lider kararı U-1 ve genelleme (Y-34; docs/12 §13) | fiziksel koşul (arsa/ayak izi) | **Kalır, kilit değil:** ek hücreler kendi boş hücren ya da aynı atomik işlemde satın alınabilir; olmazsa başka yerde doğrudan büyük kurulur; ≤72 / %25 geçerli |

**Özet:** 13 satır docs/12 §12–§13 ile çelişir ya da karar ister: KL-01, 02, 03, 05, 07 **kalktı** (Y-31, Y-33) ve KL-06, 08 aynı kararla kaldırılmalı (7 satır); KL-09, 10, 11, 13, 21 karar gerekli (5 satır); KL-12 önerilmez; KL-04 yazım düzeltmesi; KL-14…KL-20 korunur ya da uyumlu. **Yinelenen kök neden:** ilçe gelişim seviyesi (docs/11 §7.4) "herkese açılan kapı" olarak tasarlandı; sahip kararıyla seviye **bireysel kilit olamaz**. En ucuz düzeltme: docs/11 §7.4 ve §7.3'ün "ölçek kilidi" cümlesini, uretim-agi §7.2/§7.4'ü ve perakende §3.2/§5'i bu karara göre değiştirmek (veri/kod henüz yok).

### 5.4 Park kuralı (öneri)

**Park kuralı (öneri).** Bu belgedeki Alfa-0 listesine (§6) ve karar defterine (§4) girmeyen her rapor önerisi **park listesindedir**: kod yazılmaz, yalnız ilgili Alfa-1 / v1.5 planında "aday" olarak durur. Parktan çıkış için odak sınaması (§1.4) ve baş lider onayı gerekir. Bu, "kararların dağınık olması" sorununun asıl panzehiridir: bugün yaklaşık 100 rapor önerisi karar bekliyor, oysa Alfa-0 için yalnız §6.4'teki karar kümesi gerekli.

---

## 6. Alfa-0 kapsam kilidi

**Tanım (kilitli).** Çevrimiçi, hesaplı **kapalı alfa**: **Kocaeli + Sakarya + Bursa (~40 ilçe), ≤200 davetli**, tek Hetzner CX33 + Postgres + Cloudflare (K32, K34). Döngü: **Yerleş → arsa / yapı → üret → işle → sat → (kendi dükkân) → genişle**; kamu görünür ama satılmaz; dünya kapalıyken de akar. Ana tasarım hedefi 20–25. gün sıkılmasını önlemektir (hipotez); Alfa-0 bunu **davetli kohortla gözlemler** (D1/D7, eşik yok).

Aşağıdaki durum sütunlarında **kod** = bugün çalışıyor; **P0 / P1** = Alfa-0 için yapılacak (P0 kapıyı bekletir, P1 Alfa-0 içinde P0'dan sonra); **karar** = girip girmeyeceği henüz karara bağlanmadı (§6.4).

### 6.1 Girenler: özellik listesi

| Alan | Özellik | Durum | Kaynak |
|---|---|---|---|
| **Dünya ve platform** | Hesap ve giriş (magic link + Google; anonim hesap ekonomik hesap olamaz) | **P0** (kodda geliştirme token'ı) | K23; docs/11 §10 |
| | Tek yazar sunucu, günlük + anlık görüntü, sunucu `t`, idempotans, hız sınırı, **mutlak duvar saati ve kapalıyken yetişme** | **kod** | docs/12 §7; sunucu-tasarimi |
| | Kural dönemi provası, geri yükleme tatbikatı, yönetici paneli, atıf ekranı, metrikler | **P0** (E24) | docs/11 §6.1 |
| | Harita L0 küre, L1 il, L2 ilçe, L3 arsa; kırıntı yolu; aksan duyarsız arama; ODbL atfı | **kod** | K26; harita-istemci |
| | Yürüyüş (L4) ilk dilimi | **kod**; Alfa-0'da isteğe bağlı, kapı ölçütü değil (**karar**, T-08) | docs/11 ek karar 3 |
| **Arsa ve inşa** | Yerleş ekranı (3 ilçe önerisi, açılış önerisi), hazır arsa, yapı önce yerleşim, atomik `yapi_yerlestir`, `parsel_birak`, `insaat_iptal`, 4 aşamalı inşa, 2 kuyruk | **kod** | K27; 06 §15 |
| | Yeni oyuncu paketi (₺50.000, bedava yurt 6 hücre, ilk 5 yapıda %30, %20 ayrılmış hücre, 14 gün kalkan), tembel arazi vergisi %1, ≤72 hücre / %25 | **kod** | docs/11 §7.2, §7.9 |
| | **Kamu arsası** (Mahalle Paketi + %4 rezerv + ilçe merkezi + kıyı; dikdörtgen ada saklaması), `parsel_al` reddi, Kamu katmanı | **P0** (çekirdek işi incelemede, commit bekliyor) | G1, G2; Y-38 |
| | **Çekim uzayı (G20), arsa fiyat paydası (Z14), ayrılmış hücre kuralı, talep modeli kimliği** | **P0 (Alfa-0 öncesine çekildi: Y-37)**; kural ayrıntısı karar bekler | G20; arsa Z14; canlı k10; Y-37 |
| **Üretim ağı** | 14 mal + **9 yeni mal = 23**; yeni yöntemler (değirmen, ekmek fırını, cam fırını, çelik doğrama; P1: mandıra, kavurma, ezme) | **P0 / P1** | G5; dikey §9 |
| | 4 zincir: ekmek ve cam → pencere (P0); süt → şarküteri ve fındık → şekerleme (P1); A0-ops: alüminyum, çimento | **P0 / P1** | docs/12 §10 |
| | `kepek` 24. mal ve `sut_kepekli` (ilk kapalı döngü) | **P0 (kilitli: Y-37)** | uretim-agi §9.1; Y-37 |
| | Fabrika ve üretimhane **S/M/L = seçim** (yerinde ölçek yükseltme; kısıt sermaye, ayak izi, işgücü, elektrik, girdi, gider) | **kod** (ölçek komutu; mülk kipinde doğrulanmadı) | docs/12 §12 |
| **Perakende** | `dukkan` (tür = veri), **S ölçek: bakkal, fırın, şarküteri, şekerci, yapı market**; raf, kasa, fiyat önayarı; **marka adı ve tabela** (kozmetik); kademeler seçimdir, ilçe seviyesi şartı yok | **P0** | G11, G12; Y-31, Y-33; perakende §12.3 |
| | Market (M), süpermarket (L), kademe çarpanı, Yakınlık Havuzu, kademeli pay tavanı, ruhsat/kota, Zincir Kartı | **karar** (perakende: Alfa-1 A1/A2; seçim ilkesinin Alfa-0 görünürlüğü, §3B.6) | Y-31; T-43 |
| | Açılış Tezgâhı | **karar** (P1 ya da Alfa-1) | T-39 |
| **Pazar** | NPC piyasa yapıcı, makas, liman primi, limansız ilde yerel NPC pazarı, emir yuvaları, Ticaret ofisi, Ambar | **kod** | 06 §15 |
| | **Yerel pazar kanalı** (ilçe talebi, esnaf payı; dükkânın bağımlılığı) | **P0 (kilitli: Y-37)** | canlı A0-2; dikey R5; Y-37 |
| | Sabit fiyatlı **kamu siparişi v0** (≤ ref × 1,10; ilk kabul eden alır); `NpcAlici{kamu}` | **P0** | G9; kamu §7.1 |
| **Kamu** | Kamu Kasası açık defter, kamu NPC alıcısı, `kamu_karar` v1 şeması ve kural yedeği iskeleti, `hak?` ve `kaynak` alanları, **Muhtarlık = kamu yapısı** | **P0** | G1–G4; S9 |
| **Para güvenliği** | `sistem_odul {kavram}` + çekirdek ödül tablosu + `alinanOdul`; para arzı panosu; kamu tavanı = ithalat paritesi | **P0** | G4, G8, G9 |
| **Rehber ve dönüş** | **Esnaf Defteri P0** (görev şeması, 3 açılış zincirinin ilk gün bölümü ≈20 kart, Defter arayüzü, kaldığın yer kartı), Takvimden ve yön sayfaları | **P0 / P1** | rehber §6.3 |
| | **"Sen yokken" Gün Sayfası** (D1 `donusOzeti`, D2 iki çapa, D3 özet kayıtları, D4a, D5 şablon deposu) | **P0 (kilitli: Y-37)** (≈3 M + 1 S) | Y-27; donus §7; Y-37 |
| **Canlı dünya** | İklim takvimi, hasat eğrileri, olaylar; takvim paketi (hasat, kış hazırlığı, Cumhuriyet Bayramı süsü, bayram **hatırlatması**); iklim takvimi 1:1 | **kod / P1** | K20; canli §5.2 |
| | `ilce_gunluk`, 4 yeni PRNG akışı, `IlceDurumu` nüfus alanları, olgu yan kanalı | **P0 (yerel pazar kanalının altyapısı; Y-37)**; ayrıntı karar bekler (canlı A0-1) | canli §11; Y-37 |
| **Teknoloji** | Mevcut 7 düğüm, `arastir` komutu | **kod** | docs/04 §9.4 |
| **Askeri** | **Bayraklı NPC eşkıya PvE dilimi:** Ordugâh, Karakol, Gözetleme Kulesi (ek yapı), Nöbet Evi (kamu), Piyade birliği, duruş ve il nöbeti, eşkıya baskını (ilçe hedefli, ön duyuru 24 sa), yağma defteri, ganimet (mal, tavanlı), Savunma sayfası; 0a hemen, 0b para güvenliği ve Esnaf Defteri P0'dan sonra; bayrak `askeri.eskiya.etkin` kapıdan 3 hafta önce AH1, AH2, AH4, H5 ile açılır, aksi hâlde yalnız şema | **P0 / P1 (bayraklı; kilitli: Y-35)** | Y-08; Y-35; Y-36; T-09 (çözüldü) |
| **Yapay zekâ** | Karar altyapısı (gündem, yedek, `kamu_karar`, `kamu-ajani` rolü) ve **botlu dünyada gölge mod** (≈$1–4/ay); kamusal NPC'ler **şablonla** | **P0 (altyapı)**; canlı ajan **yok** | docs/12 §10; yapay-zeka §8 |

### 6.2 Mal, yapı ve ekran listesi (kesin)

**Mal (24).** Mevcut 14: `tahil, gida, cevher, komur, celik, bakir, silis, parca, elektronik, petrol, yakit, muhimmat, gubre, elektrik`. Yeni 9: `un, ekmek, cam, pencere, sut, sut_urunu, findik, findik_urunu, sekerleme`. **Kabul edildi (Y-37): `kepek`** (24. mal). A0-ops: `cimento, boksit, alumina, aluminyum`. Alfa-1'e: `pamuk, iplik, kumas, hazir_giyim` ve üretim raporunun diğer malları.

**Yapı (oyuncuya görünen).**

| Grup | Yapılar | Not |
|---|---|---|
| Tarım | Tarla, Ahır, Mera, Sulama, Gıda fabrikası (yöntemler: değirmen, ekmek fırını; P1: mandıra, kavurma, ezme) | |
| Sanayi | Maden ocağı (4 kimlik = 1 yapı), Petrol kuyusu, Çelikhane (+ cam fırını; A0-ops: çimento, alümina, ergitme), Parça atölyesi (+ çelik doğrama), Elektronik, Santral, Gübre fabrikası | S/M/L seçimdir |
| Lojistik / Pazar | Ambar, Ticaret ofisi | |
| Perakende | **Dükkân** (`dukkan`): S ölçek bakkal, fırın, şarküteri, şekerci, yapı market (+ Açılış Tezgâhı: karar) | tek yeni yapı; market ve süpermarket karar (Alfa-1 A1/A2) |
| Devlet | Muhtarlık (**kamu yapısı**, oyuncuya kapalı) | S9 |
| Gizle ya da etki ver | Konut, Garaj, Atölye-Lab (bugün etkisiz yer tutucu) | T-26 |
| Askeri (bayraklı, Y-35) | **Ordugâh** (3 yuva, ₺35.000, ilde ≤2), **Karakol** (1 yuva, ₺7.840, ilde ≤2), **Gözetleme Kulesi** (1 yuva, ₺4.100, ilde 1): `mulk.ekYapilar`; **Nöbet Evi** (ilçe merkezi kamu hizmet hücresi, oyuncuya kapalı); Mühimmat fabrikası (kodda var; gerçek ordu talebi alır) | T-09 (çözüldü); kimlik kilidi AÖ-19 |

**Ekran.** Mevcut: Yerleş, strateji haritası L0–L3, parsel modu, inşa modu, bina paneli, Dikkat + gelen kutusu, Pazar ve Teknoloji sayfaları, Ayarlar. Yeni (P0/P1): **Esnaf Defteri (Bugün + Sayfalar)**, **"Sen yokken" Gün Sayfası** (karar), **Dükkân paneli** (raf, fiyat önayarı, kademe, marka ve tabela), **Kamu** (harita katmanı, hücre kartı, Kamu Kasası defteri, sipariş panosu), **Takvimden** (P1), Devlet sayfası (salt okunur: kamu, vergi). Yürüyüş (L4) isteğe bağlı.

### 6.3 Girmeyenler (Alfa-0'da yok)

| Özellik | Ne zaman | Kaynak |
|---|---|---|
| İhale (Profil M), kira / üst hakkı / tahsis / KÖİ / sanayi tahsisi, Proje Kartı | Alfa-1 (KÖİ ve sanayi tahsisi sonra) | docs/12 §10; kamu §7 |
| **Canlı yapay zekâ ajanı** (şartname, arazi arzı, NPC kaymakam/vali, olay planı) | Alfa-1 (gölge ≥14 gün sonra) | yapay-zeka §8 |
| Seçimler (muhtar, vali), yasalar, bütçe kolları, meclis, dilekçe, itiraz | Alfa-1 (F6) | K32 |
| Ara kademe **uzmanlığı** (oyuncular arası sözleşme P5), emir defteri, şirket ve lonca | Alfa-1 / v1.5 | G13 |
| Pamuk → giyim, uzun yol zincirleri (yem, mezbaha, tabakhane), hayvan sağlığı, `hafif_sanayi` | Alfa-1 dilimleri | uretim-agi §9.2 |
| Market (M) ve süpermarket (L), kademe çarpanı, Yakınlık Havuzu, kademeli pay tavanı, ruhsat/kota, kampanya sınırı, Zincir Kartı, `dukkan_yukselt`, raf tedarik sözleşmesi, toptan deposu | Alfa-1 (A1/A2/B; karar bekler) | perakende §12.3 |
| Rehberlik sayfası ve ödülü; sözleşme, ihale, gurbetçi görevleri; Hatıralar; Web Push, e-posta, `.ics` | Alfa-1 (+) | rehber; donus |
| Pazar günü tezgâh kurası, imece ve kitabe, esnaf odası, hal, gurbetçi yaz dönüşü | Alfa-1 | imza §6.3 |
| Oyuncular arası il kontrol savaşı, koruma sözleşmesi (M2), abluka, ittifak, paralı asker, Sur/Barikat, Güvenli depo, askeri teknoloji ağı (36 düğüm), doktrin | Alfa-1 / sonra | §3D.5, §3D.9 |
| Askeri eğlence artıları E1 (hazır emir), E2 (tur dökümü), E3 (güvenlik şeridi, kitabe, unvan) | Alfa-0 sonrası değerlendirme (Y-35) | askeri-katman-v1 §4A.6 |
| Askeri bayrak kapalıyken: eşkıya oynanışı (0b); yalnız şema ve 3 ek yapı kaydı (ii) | bayrak ölçütlerine bağlı | Y-35 |
| 97 düğümlü teknoloji ağı, bilim kapasitesi, ortak araştırma | Alfa-1 sonrası | bilim |
| Komşuluk modülleri (35), aşamalı malzeme çekimi, kira, müteahhit | Alfa-1 / v1.5 | arsa |
| **Oyuncu ajanı, BYOK, oyun API'si; para alanı taşıyan komut; serbest metin sohbeti** | **hiç** | Y-29; G4 |
| Balkanlar, kademeli ilçe açılışı (%70) | Alfa-1 | K32 |
| Gelir modeli ve kozmetik satışı | alfa sonrası | Ü12 |

### 6.4 Alfa-0 öncesi şart olan geri dönüşü zor kararlar

Her biri: **neden geri dönüşü zor**, **kimde**, **durum**. Sıra, davetli alınmadan önce karara bağlanması gerekenlerin aciliyetini yansıtır (kodlama sırası değil).

| # | Karar | Neden zor | Durum / sahibi |
|---|---|---|---|
| AÖ-1 | **Kamu arsasının çekirdeğe taşınması** ve oran/halka dondurma kaydı (G1, G2) | satılan arsa geri alınamaz; depoda `parsel_al` kamu hücresini hâlâ satar (düzeltme çalışma ağacında, commit edilmedi); ada şekli ve hücre listesi saklama biçimi kimlik/şema bağıdır | **kilitli**; uygulama **incelemede, commit bekliyor** (G2 P1 bitti, dikdörtgen ada saklaması; G1 kamu yayını hazır; Y-38, T-54); ilk gerçek satıştan önce commit ve A0-9 testi (geliştirme lideri) |
| AÖ-2 | **Çekim uzayı (G20), fiyat paydası ve ayrılmış hücre kuralı (arsa Z14), talep modelinin kimliği (canlı k10)** | arsa satışı Alfa-0'da başlıyor; yayımlanmış fiyat sözü ve konum beklentisi kalıcıdır | **kilitli yön: Alfa-0 öncesine çekildi (baş lider, Y-37)**; kural ayrıntısı ve sayılar **açık** |
| AÖ-3 | **Birleşik mal kimlik kilidi:** 23 mal + **`kepek` (kabul edildi: Y-37) = 24** + üretim raporunun 21 yeni kimliği (24 tarifli mal) + `il-imza.json` (9f79e18'de commit'lendi; `ileride` 75 kimlik; `tekstil` → `kumas` + `hazir_giyim`, `sarkuteri` mal kimliği yasak, 17 ileride kimliği dikeyle birebir); `sarkuteri` → `et_urunu`; birleşik mallar bölünmez | kimlik yayımlanınca kalıcı (G8) | **kilitli (24)**; **`kepek` ve üretimin 21 yeni kimliği birleşik listeye eklenmeden `icerik.json`'a girmesin** (Alfa-0 öncesi koşul) |
| AÖ-4 | **Yapı kimlikleri ve sayısı:** `dukkan` (19.), `hafif_sanayi` (20.; deri/tekstil yöntemleri hangi tesiste doğar), `gida_fabrikasi` yöntem listesi; Konut/Garaj/Lab gizleme; Muhtarlık kamu yapısı; Ordugâh, Karakol, Gözetleme Kulesi ek yapı kimlikleri (AÖ-19) | tesis türünün `yontemler[]` listesi canlı tesislerle bağlı; taşımak göç ister | **açık** (T-10, T-44; S11, Q1) |
| AÖ-5 | **Kademe modeli verisi** (kademe = ölçek + tür, iç içe mal listesi, `olcekAraligi`, ölçek başına ayak izi (Y-34), yükseltme alanları; **tür verisinde ilçe seviyesi alanı yok, kilitsiz, seçim**) | ilk `icerik.json`; sonradan ayrı yapıya bölmek yıkım | öneri; **Y-31 ile kilitsiz** çerçeveyle onay bekler (perakende k1, k12) |
| AÖ-6 | **Günlük ve şema rezervleri:** `kamu_karar` v1, `kaynak`, `hak?`, ad alanlı `VarlikId` (`k:`; genel K-1) + `adina`, PRNG akışları (mekanik başına; canlı 4 akış), komutta `v`, veri paketi özeti günlük başlığında | günlük eklenen-yalnız; sonradan alan eklemek eski günlüğü bozar | G3 **kilitli**; K-1, K-9, canlı k6 **açık** |
| AÖ-7 | **Para güvenliği:** `sistem_odul` + ödül tablosu + `alinanOdul` + kamu kasası + `NpcAlici` + para arzı panosu | para arzı bir kez şişerse geri sarılamaz | G4, G8, G9 **kilitli**; uygulama P0 |
| AÖ-8 | **Görev durumunun yeri (G10), kavram sözlüğü (GK-4), sticky (GK-5), "hiçbir sistem görev durumunu okumaz" testi (GK-3)** | ödül idempotans anahtarı, snapshot | **açık** (G10 kısmen) |
| AÖ-9 | **Dönüş deneyimi kararları:** iki çapa (DK-1), kamusal veri sınırı (DK-2), olgu referansı saklama (DK-3), kozmetik kapısı profilde (DK-4), zaman sınırlı kozmetik yok (DK-6) | çapa şeması günlükle ve ölçümle bağlı; olgu şeması en geç değişen şey | **açık**; olgu şeması "ilk bülten/ekran yayınından önce" |
| AÖ-10 | **P0 listesine yerel pazar kanalı (canlı A0-2) ve "Sen yokken" çekirdeği** | dükkân ve dönüş ekranı bunlarsız anlamsız ya da yarım | **kilitli: P0'a girdi (baş lider, Y-37)**; uygulama sırası ve olgu defteri **açık** |
| AÖ-11 | **Kapsam çelişkileri:** ~~askeri Alfa-0 (T-09)~~ **kapandı (Y-35)**; yürüyüş Alfa-0 (T-08), süpermarket + korumalar (§3B.5), Açılış Tezgâhı (T-39), ~~`kepek`~~ **kapandı (Y-37)** | kapı ölçütleri ve kodlama sırası buna bağlı | **açık** (yürüyüş, süpermarket, tezgâh: baş lider; sahip itirazı); askeri kısmı **kilitli** (Y-35) |
| AÖ-12 | **Seviye/kilit kararı (docs/12 §12) kodlanmadan önce yazılı hâle gelmeli:** ilçe seviyesi kolektif durum, bireysel kilit yok | veri ve komut şemasına kilit alanı girerse sonradan sökmek göç ister | **kilitli ilke**; docs/11 §7.3–§7.4 ve ilgili raporların düzeltilmesi gerekir (§5.3) |
| AÖ-13 | **Hesap modeli:** anonim hesap ekonomik hesap olamaz ↔ "önce oyna" (baslangic Ç5); tek hibe/hesap (GK-8); çoklu hesap politikası | hesap/KVKK/transfer tavanları sonradan değişmez | **açık** (sahip: Ü10) |
| AÖ-14 | **Muhtar/İlçe Başkanı adlandırması (K-4)** ve NPC kaymakam anlamı (T-27) | UI metni, yetki matrisi, test paketi | **kapandı (Y-39, docs/12 §13)** |
| AÖ-15 | **Oyuncu renk sözleşmesi** (`renkIndeksi` + `paletSurumu`, yalnız sona ekleme) ve ana yazı tipi | sunucu rengi saklar; ekran görüntüleri | görsel kimlik önerisi; oyuncu rengi saklanmadan önce |
| AÖ-16 | **Kural dönemi komutu (`kural_surumu_gec`) ve kesinti adaleti** | dağıtım provası (A0-5) ve uzun kesintide olumsuz olay ön duyurusu | sunucu-tasarimi §9; **yapılacak** |
| AÖ-17 | **Teknoloji id tabanlı serileştirme** (bilim G8) ve Alfa-0 düğüm sayısı (7) | 100+ düğümden sonra geçiş riski | **açık**; ilk teknoloji içeriğinden önce |
| AÖ-18 | **Yön değiştirme iade paketi (K-14)** ve S10 yeniden başlangıç | iade cömertse istismar, cimriyse kilit | **açık** |
| AÖ-19 | **Askeri şema ve kimlik kilidi (Y-35 gereği 0a):** `ordugah`, `karakol`, `gozetleme_kulesi` ek yapı kimlikleri (G8), `eskiya_*` olay türleri, `askeri.eskiya.*` parametre adları; birlik envanterinin yeri (düğüm + il nöbeti), baskın hedef birimi (ilçe), düğüm başına yağma defteri şekli (`yagmaPenceresi`), kayıp kalıcılığı (%60 / %40), ganimet mal, yağma iletimi %60 (Y-36) | kayıt şekli `BolgeDurumu`/`Dunya`'ya yazılır; sonradan eklemek serileştirme göçü, birlik envanterini taşımak durum şemasını bozar; ek yapı kimliği yayımlanınca kalıcı | **kilitli yön** (Y-35, Y-36); şema ayrıntısı **öneri** (askeri rapor K2, K6–K10, K12); ilk içerik sürümünden önce |

### 6.5 Kabul ölçütleri

**Yürürlükteki kapı (docs/11 §6.1, kilitli):** A0-1 F0, F1, F2 (Alfa illeri), F3, F4 kabul ölçütleri geçti · A0-2 regresyon kalkanı (bölge kipinde `durumOzeti` birebir; `pnpm kontrol` yeşil) · A0-3 geri yükleme tatbikatı (yedekten geri yükle → kuyruğu oynat → özet eşit) · A0-4 100 bot ile yük testi (tik gecikmesi ve çözüm süresi raporlu) · A0-5 kural dönemi dağıtım provası · A0-6 uçtan uca Playwright (giriş → Yerleş → hücre al → Tarla kur → tamamlanır → satış görünür; masaüstü ve mobil) · A0-7 atıf ekranı ve ODbL ayrı klasör · A0-8 bot ölçümü (parsel kipi): H5, H6, H7, H8 raporu.

**Önerilen eklemeler (dalga 3 ve 4; baş lider onayı ister):**

| # | Ölçüt | Hedef / yöntem | Kaynak |
|---|---|---|---|
| A0-9 | **Kamu arsası:** `parsel_al` ve `yapi_yerlestir` kamu hücresini reddeder; kamu hücreleri ≤72/%25 tavanına sayılmaz; oran halka açılışında donmuş | özellik testi; yeniden oynatma | G1 |
| A0-10 | **Para güvenliği:** görev ödülü toplamı ≤₺8.000 ve kavram başına bir kez; ödül tutarı komutta yok; kamu/sipariş tavanı ≤ ×1,10; ekonomi hiçbir yerde görev durumunu okumaz (test); para arzı panosunda ayrı satırlar | test + pano | G4, G9; rehber Gİ-5 |
| A0-11 | **Zincirler:** her Alfa-0 zinciri bot tarafından uçtan uca tamamlanabilir (ekmek, cam → pencere, süt, fındık); çıkmaz mal 0 (derleme uyarısı); ilk dükkân medyan ≤36 saat, geri ödeme medyanı ≤48 saat | bot + insan | ZP1, PK1; uretim UA1/UA8 |
| A0-12 | **Perakende dengesi:** perakende primi 1,05–1,20 (>1,30 alarm); ilk dükkân medyan ≤36 saat; fiyat savaşı <0,85 R süre ≤%5; (Alfa-1: bakkal sayısı 60. günde başlangıcın ≥%40'ı, iş modeli çeşitliliği: hiçbir model >%60) | defter | ZP1, ZP3, PK1, PK5, PK7 |
| A0-13 | **Dönüş:** özet 12 sn ortanca okuma, atlama ≤%50, öneri tıklama ≥%30, yapılamaz öneri ≤%2; çapa yeniden türetme ≤%1; kamusal veri sınırı testi geçti | insan + bot | Dö2–Dö5, Dö9; donus §5.6 |
| A0-14 | **Defter:** ilk saatte ilk satış ≥%70; kart atlama ≤%30 | insan | Gö1, Gö4 |
| A0-15 | **Zaman:** sunucu kapalı kalıp açılınca yetişme sonrası özet eşit; `yetisiyor` kodu; Türkiye gece yarısı hizası | test | docs/12 §7 |
| A0-16 | **Yapay zekâ:** ajan kapalıyken (`kamu_ajan_kapali`) oyun tam çalışır; kamusal NPC metni şablon %100 ya da süzgeç reddi <%5; gölge mod geçerlilik ≥%98 | test + gölge rapor | G7; §7 |
| A0-17 | **Kilitsizlik:** hiçbir yapı, ölçek, yöntem ya da dükkân kademesi sıra/seviye şartı taşımaz (veri doğrulayıcı testi); yalnız sermaye, arsa, girdi, gider ve koruma kısıtları | derleme testi | docs/12 §12 |
| A0-18 | **Askeri bayrak kapısı (Y-35):** `askeri.eskiya.etkin` yalnız AH1 (baskın alan ilçe oranı, haftalık baskın 0,8–1,4), AH2 (M0 çevrimdışı 7 günlük kayıp ≤%8), AH4 (ganimet ≤%1 ilçe haftalık üretimi) ve parsel H5 (PvE + defter: 48 sa çevrimdışı parsel kaybı 0, depo kaybı ≤%25, yapı ≤%10 yuva) geçerse açılır; geçmezse kapalı yayınlanır ve yalnız şema (ii) kalır; 6 askeri özellik testi (parsel el değiştirmez 90 gün, defter ardışık baskın ≤%25, yapı ≤%10, determinizm, bölge kipi altınları aynı, kalkanlı/uykulu hedef dışı); karar kapıdan **3 hafta önce** | bot + ölçüm + test | Y-35; askeri-katman-v1 §3.0, §5.4 |

**Kabul edilmeyen (kapı ölçütü olmayan):** eğlence kanıtı ve D1/D7 eşikleri (gözlem; "simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz"); yürüyüş fps hedefleri (Alfa-1 kapısı A1-2).

---

## 7. Yapay zekâ kullanım sınırları

> **Kaynak.** docs/12 §8 ve §10 (sahip), brif (sahip sözleri), yapay-zeka-kamu-ajanlari.md (mimari ve maliyet), canlı dünya §6, donus-deneyimi §5.5, rehber GK-7. Model fiyatları ve kimlikleri yapay zekâ raporunun brif tablosundan alınmıştır (Opus 5.5 $4/$20, Sonnet 5.5 $2/$10, Haiku 4.5 $1/$5 milyon belirteç başına; önbellek okuma, Batch %50 indirim); bu belgede yeniden doğrulanmadı. Tüm maliyetler **tahmindir** (±%50).

### 7.1 İlkeler (sahibin sözleri)

1. **Tüm işler yapay zekâya verilmez** (maliyet): önce **kural**, sonra **şablon + olgu defteri**, sonra **önceden üretilmiş havuz**, en sonda **seyrek ve tavanlı** çalışma zamanı LLM.
2. Yapay zekâ **yalnız iki yerdedir:** (a) **sunucudaki kamu ajanı**, (b) **kamusal alan NPC'leri**. Başka hiçbir sistemde (ekonomi, fiyat, görev, haber, dönüş özeti, denge) yoktur.
3. **Oyuncunun kendi ajanı ve oyun API'si yoktur;** tam otokontrol bir oyun istenmiyor (Y-29). Geliştirici/yönetici yerel ajanı (`kaynak:"yonetici"`) bir oyuncu özelliği değil geliştirme yoludur.
4. **Çekirdek LLM çağırmaz;** çıktı doğrulanmış komut ya da sunum satırı olur; yeniden oynatma LLM'siz aynı dünyayı üretir; sağlayıcı kapalıyken oyun akar (G7).
5. **Para alanı taşıyan sistem ya da ajan komutu yok** (G4); ajan bütçe seçmez, para basmaz, parsel el değiştirmez.
6. **Oyuncu serbest metni hiçbir yapay zekâ girdisine girmez** (enjeksiyon yüzeyi baştan kapalı; asıl koruma yetki sınırıdır).

### 7.2 Sunucu kamu ajanı

| Konu | Sınır |
|---|---|
| **Mimari** | Karar Köprüsü: ajan çekirdek dışı ayrı işçi süreçtir; önerisi doğrulayıcıdan (şema, yetki, bütçe, bant, ritim, rekabet, adalet, tekrar) geçerse sunucu damgalı `kamu_karar` komutu olur; reddedilir ya da süre dolarsa çekirdekteki **zaman aşımı olayı kural yedeğini** uygular; sunucu kapalıyken ve yetişmede ajan çağrılmaz |
| **İhale yetkisi** | **(b):** ajan şartname/ilan/arazi arzını tasarlar ve gerekçe notunu yazar; **kazananı, kiracıyı, ödemeyi, cezayı ve parseli kural seçer** ("ajan arz tasarlar, talip seçmez"); (b+) kör teknik puan ancak M1–M3 30 gün temiz ve sahip onayıyla; (a) yok |
| **Ajana verilmeyenler (D listesi)** | para basma / kasa artırma / bütçe seçme; parsel el değiştirme; oyuncuya özel avantaj ya da dezavantaj; kalıcı ceza (sicil, ihale yasağı, hesap kısıtı); makam, seçim, oy sonucu, vali atama; savaş ilanı, savunma duruşu, askeri komut; gerçek para, mağaza fiyatı, hesap ve KVKK işlemleri; günlük, kural ya da veri paketi değiştirme |
| **Girdi** | yalnız tamsayı olgu ve kimliksiz etiket (Teklif A/B/C, permütasyonlu, **kör değerlendirme**); kişisel veri ve oyuncu metni gitmez |
| **Çıktı** | strict JSON şema, ayrık enum (kademe seçer, serbest sayı yok), tek atış, araç yok; gerekçe = yapılandırılmış kod + ≤280 karakter kimliksiz not (bayrakla kapalı başlar; not süzgeci reddi <%5 ise açılır); "kamu belgesi" sayılır, haber değildir |
| **Faz** | Alfa-0: altyapı + botlu dünyada **gölge mod** (≈$1–4/ay), **canlı ajan yok**. Alfa-1: gölge ≥14 gün → ihale gerekçe notu (Haiku 4.5, gece Batch), şartname, NPC kaymakam/vali (yalnız **makam boşken**), arazi arzı, olay planı. v1.5: tam ihale, itiraz ikinci görüşü |
| **Anahtar** | sunucuda tek anahtar, ayrı Workspace, aylık harcama tavanı (tahminin ×3'ü), günlük çağrı tavanı (×2), devre kesici (ardışık 5 hata → 15 dk; `enforced_spend_limit_reached` → kalan ay yedekte); oyuncu anahtarı sunucuda hiç kullanılmaz |
| **Güvence** | tarafsızlık ölçütleri M1–M6, kırmızı takım, 4 kademeli itiraz, model/istem sürüm yönetişimi (≥14 gün gölge, altın küme), "Kamu El Kitabı" yayımlı (gizli kural yok) |

**Maliyet (yapay zekâ raporu §5.2; tahmin).** Aylık, 200 / 1.000 / 10.000 oyuncu: S0 Alfa-0 önerisi (yalnız gerekçe notu, Haiku, Batch) **$1,0 / $3,5 / $13,9**; S3 (şartname + arazi + NPC kaymakam/vali + olay planı + itiraz, **bülten yok**; geçerli senaryo) Batch/anlık **$6,3–11,1 / $23,6–41,5 / $91,8–161,4**; S4 tam yığın (bülten dahil) **$9,2–15,6 / $33,3–56,6 / $130,7–221,8**; seyrek anlık önbelleksiz kötü durum S5 $28 / $102 / $400. Yeniden deneme için +%10–15. Maliyet **bağlayıcı değildir** (bağlayıcı olan tarafsızlık, enjeksiyon, açıklanabilirlik, günlük biçimi, model kayması).

### 7.3 Kamusal alan NPC'leri

**Tanım.** Kamusal alanlarda (pazar yeri, muhtarlık meydanı, çay ocağı, ilçe meydanı) görünen, sabit kişilikli NPC'ler; mekanik bir rolleri vardır ve sesleri vardır. **Mekanik karar kuralda kalır; yapay zekâ yalnız sesi/çeşitlemeyi besler.** Bu bir sunum katmanıdır: çekirdek durumu yazmaz, `durumOzeti`'ne girmez, ayrı yan tabloda kimliksiz saklanır (sunum-kapalı testi geçer).

| NPC | Mekanik rol (kuralda) | Metin kaynağı | Çalışma zamanı LLM payı | Alfa |
|---|---|---|---|---|
| **Pazar yeri esnafı** (bakkal, kahvehane, berber; canlı §4.2) | talep çıpası, esnaf payı, tezgâh | şablon + olgu (fiyat, talep, tezgâh sayısı) | **yok** (günün sözü şablon havuzundan) | A0 (şablon) |
| **Muhtar** (mahalle; Alfa-0'da pasif NPC) | kamu siparişi/ilan sahibi, hoş geldin hibesi kartı | sabit şablon (iki cümle) | **yok** (A0); Alfa-1: haftalık duyuruya ses katmanı (seyrek) | A0 (şablon) |
| **Çay ocağı** (söylenti panosu; imza İ-4) | Dikkat panelinin sokaktaki sesi: yalnız **doğrulanmış ve yaklaşan** olay ipucu (+6 sa erken); **yanlış söylenti üretmek imkânsız** | olgu defteri → şablon | **isteğe bağlı çeşitleme:** ilçe başına günde ≤1 toplu çağrı, **Haiku 4.5, Batch**, olgu slotlarına yeniden ifade | A1 (A0'da yalnız Dikkat/Takvimden satırı) |
| **NPC kaymakam / vali** (yöneticisiz hâl) | ajan kararının "kamu belgesi" sesi | ajan gerekçe kodu + not | §7.2 (ajan) | A1 |
| **İlçe bülteni, il gazetesi, "sen yokken"** | olgu defteri → özet | **şablon + olgu; LLM yok** | **yok** (haber ve dönüş özeti LLM'siz, kararlı) | A0-3 / A1 |

**Çalışma tarzı (öneri).** (1) NPC'nin **kimliği** (ad, meslek, ton) ve etkileşimi **kalıp seçenekli**dir: oyuncu 3–5 hazır seçenekten ("Bu hafta pazar nasıl?", "Mahallede yeni ne var?") seçer; NPC yanıtı olgu slotlu şablondur. (2) **Canlı (oyuncu etkileşimi anında) LLM çağrısı yoktur;** LLM çeşitlemesi **önceden toplu (Batch) üretilir** ve havuzdan seçilir (gecikme sıfır, maliyet tavanlı, moderasyon öncesi). (3) Çıktı **doğrulayıcıdan** geçer: sayılar ve varlıklar olgu listesiyle eşleşmeli, ≤280 karakter, yasak içerik süzgeci (deprem, dini ritüel, siyasi parti, gerçek kişi ve marka adı, oyuncu adı, küfür), kimliksiz; eşleşmezse **şablona düşer**. (4) **Sunum yalan söylemez:** NPC yeni bir *bilgi* üretemez; oyunu etkileyen her ipucu çekirdek olayından gelir. (5) Ajan kapalıyken ya da tavan aşılınca NPC şablonla konuşur; oyun etkilenmez.

**Maliyet tahmini** (yapay zekâ raporu §5.1 K7 satırı: Haiku 4.5, 4.200 önbellekli ön ek + 700 girdi + 350 çıktı ≈ **$0,0034 anlık / $0,0022 Batch** çağrı başına; ilçe sayısı: 200 oyuncu ≈45, 1.000 ≈150, 10.000 ≈600 aktif ilçe):

| Senaryo | Çağrı / ay | 200 oyuncu | 1.000 oyuncu | 10.000 oyuncu |
|---|---|---|---|---|
| **N1 çay ocağı çeşitlemesi** (ilçe başına günde 1 toplu çağrı) | 1.350 / 4.500 / 18.000 | $3–5 | $10–15 | $40–61 |
| **N2 muhtar haftalık duyuru** (ilçe başına haftada 1, Alfa-1) | 194 / 645 / 2.580 | $0,4–0,7 | $1,4–2,2 | $5,7–8,8 |
| **Toplam N1 + N2** (Batch ↔ anlık, +%15 yeniden deneme) | 1.544 / 5.145 / 20.580 | **≈$3–6** | **≈$11–20** | **≈$45–81** |
| Kamu ajanı S3 ile birlikte | | ≈$9–17 | ≈$35–62 | ≈$137–242 |
| *Karşılaştırma: yapay zekâ raporunun tam yığını S4 (bülten dahil)* | | $9–16 | $33–57 | $131–222 |

Okuma: kamusal NPC çeşitlemesi, yapay zekâ raporunun **K7 (bülten) kalemiyle aynı büyüklük sınıfındadır**; bülten LLM'siz kaldığından o kalem boşalır, yani toplam maliyet S4 zarfının içinde kalır. Tavan: ayrı Workspace ya da ayrı anahtar, aylık tavan tahminin ×3'ü, günlük çağrı tavanı ×2, devre kesici; aşılırsa şablon.

**Serbest sohbet (oyuncu yazar, NPC canlı yanıtlar) önerilmez.** Varsayım: oyuncuların %50'si günde 20 tur, tur başına ≈$0,0015–0,0033 (Haiku 4.5): **≈$90–200 / $450–990 / $4.500–9.900 aylık** (200 / 1.000 / 10.000 oyuncu), yani yapay zekâ raporunun tam yığınının (S4) kabaca 6–75 katı; üstüne enjeksiyon, moderasyon, KVKK, gecikme ve K-13 ("sosyal yüzeyde serbest metin yok, kalıp mesaj"; imza Q11) engelleri. **Hayır** (Alfa-1'de kalıp mesaj; karantina deseni sonra, sahip onayıyla).

### 7.4 Olmayanlar (kapalı)

| Olmayan | Neden |
|---|---|
| **Oyuncunun kendi ajanı, BYOK, oyun API'si / `adina` vekilliği ile ajan** | sahip kararı: tam otokontrol istenmiyor; tarafsızlık, hız avantajı, çoklu hesap |
| **Para basan / para alanı taşıyan komut** (ajan ya da sistem) | para korunumu (G4); ödüller çekirdek tablosundan |
| Ajanın kazananı seçmesi (a) ve kör teknik puan (b+, onaysız) | kayırmacılık denetlenemez; yetki genişletme daralmadan pahalı |
| Haberde, bültende, "sen yokken" özetinde, görev metninde ve görev tamamlamasında LLM | determinizm, KVKK, enjeksiyon, uydurma; şablon + olgu defteri |
| Ekonomi, fiyat, denge ya da NPC esnaf fiyatlamasında LLM | çekirdek deterministik kalır |
| Askeri katmanda ve **NPC eşkıya** baskınında LLM ya da kamu ajanı | eşkıya PRNG (`savas` akışı) + servet eğrisidir; kamu ajanı Alfa-0 askeri kritik yolunda değil (askeri-katman-v1 kapsam dışı); sonuç metni şablondur |
| Oyuncu serbest metninin (tabela adı dahil) istemde kullanılması | dolaylı enjeksiyon yüzeyi; tabela adı değer olarak şablona girer |
| Çalışma zamanı "kişisel özet cümlesi" | gecikme 1–3 sn, determinizm, KVKK; ≈$270–$2.300/ay |
| Tek sağlayıcıya zorunlu bağımlılık | kural yedeği her zaman açık; `kamu_ajan_kapali` bayrağı |

**Açık (yapay zekâ).** S7 ihale sonuç kartında kazananın adı (KVKK); G22 model/istem sürüm yönetişimi; ajan notunun açılma eşiği; kamusal NPC LLM çeşitlemesinin **Alfa-1'de** mi başlayacağı (öneri: evet; Alfa-0 şablon); Sonnet 5.5 düşünme ayarı ve fiyatların güncelliği doğrulanmadı (yapay zekâ §10).

---

## 8. Belge ↔ kod farkları

Kod, 1 Ekim 2026 çalışma ağacından okundu (commit'siz dosyalar dahil). "Belge" = karar defterindeki kilitli ya da öneri düzeyi.

### 8.1 Belgede var, kodda yok

| # | Belgede | Kodda | Önem |
|---|---|---|---|
| 1 | **Kamu arsası** (G1, G2): `sinif:"kamu"`, `k:` sahibi, `parsel_al` reddi, Mahalle Paketi | depoda yalnız `istemci/src/harita/arsa.ts` geçici türetmesi (48×48 yapay mahalle, `?kamu=0`) ve `parsel_al` kamu hücresini satar; **çekirdek işi (dikdörtgen ada saklaması, G1 kamu yayını) çalışma ağacında incelemede, commit bekliyor** | **yüksek** (Alfa-0 öncesi) |
| 2 | Para güvenliği: `sistem_odul`, `alinanOdul`, `NpcAlici`, Kamu Kasası, para arzı panosu | hiçbiri yok | yüksek |
| 3 | 9 yeni mal, yeni yöntemler, `dukkan`, raf, kasa, Yakınlık Havuzu, perakende çözümleyici | `icerik.json`: 14 mal, 24 yöntem, 18 tesis türü, 7 teknoloji, 3 ekim ürünü; yalnız Ticaret ofisi | yüksek |
| 4 | Esnaf Defteri, görev şeması, "kaldığın yer", "sen yokken" (özet kayıtları, çapalar), Takvimden | yok; istemcide iki kare farkından gelen kutusu ve Dikkat paneli | yüksek |
| 5 | **Yerel nüfus talebi** (`IlceDurumu` nüfus, ihtiyaç kademeleri, göç, esnaf), olgu defteri, haber/İlçe Bülteni, olay anlatıcısı, takvim paketi (bayram, pazar günü), 4 yeni PRNG akışı | `IlceDurumu` yalnız `seviye`, `uygunHucre`, `satilmisHucre`; NPC talebi dünya düzeyinde sabit emilim/arz tablosu (oyuncu sayısıyla ölçeklenir) | yüksek |
| 6 | **İlçe gelişim seviyesi** yükselmesi ve kilitleri (docs/11 §7.4) | yalnız `seviye` alanı; hiçbir kilit uygulanmıyor (bu, docs/12 §12 ile **uyumludur**) | bilgi |
| 7 | Hareketsizlik merdiveni (uyku, çürüme %2/gün, 90 gün açık artırma) | `sonEtkinlik` verisi ve `mulk.hareketsizlik` parametreleri var, kural yok; boş hazinede vergi tahsil edilmez ("borç modeli sonraki iş") | orta |
| 8 | Ambar "bozulma ×0,5" (docs/11 §7.3) | yalnız kapasite eki (+5.000 birim); bozulma yok | orta |
| 9 | Yönetişim: NPC vali varsayılan yasalar, il hükümeti, seçim, yasa, bütçe | `politika.ts` yalnız ikili diplomasi (bölge kipi); arazi vergisi sabit parametre | Alfa-1 |
| 10 | Askeri (Ordugâh, birlik, savunma yapıları, NPC eşkıya, savaş) mülk kipinde | `cekirdek/src/askeri/*` yalnız bölge kipi, harita bölgelerini tanır; `birlik_uret` ve `savunma_emri` `ic.bolgeIndeks[...]` aradığı için `<il>#<oyuncu>` düğümünü reddeder (`bolgeIndeksiBul` ile 2 satır); `Ordugâh` mülk yapısı yok | **Alfa-0 bayraklı (Y-35):** 13 kalemlik çekirdek listesi (§3D.4); ≈M–L |
| 11 | Teknoloji: Atölye-Lab araştırma yuvası, bilim kapasitesi | Atölye-Lab etkisiz yer tutucu; `arastir` oyuncu düzeyinde | Alfa-1 |
| 12 | Kural dönemi komutu (`kural_surumu_gec`), kesinti adaleti, yönetici paneli | yok (sunucu-tasarimi §9) | orta (A0-5) |
| 13 | Better Auth (magic link + Google), Cloudflare/Hetzner dağıtımı, hukuki metinler | geliştirme token'ı (`gel1.<oyuncu>.<HMAC>`); dağıtım bu turda doğrulanmadı (E24) | yüksek (Alfa-0 kapısı) |
| 14 | İl imza **çıktı bonusu** (+%10) ve imza ürün mantığı | `il-imza.json` (çalışma ağacı) yazıldı; çekirdek okumuyor; yalnız Yerleş önerisi kullanıyor | orta |
| 15 | Kamu ajanı altyapısı (`kamu_karar`, gündem, zaman aşımı yedeği, `kamu-ajani` rolü) | yok | Alfa-0 P0 (altyapı) |
| 16 | Kademeli ilçe açılışı (%70), Balkanlar | yok | Alfa-1 |
| 17 | Sunucu botlarının mülk kipini oynaması (gölge mod, 100 bot yük testi) | botlar bölge kipinde; `botlar/src/parsel.ts` çalışma ağacında yazılıyor (E20-G10) | yüksek (A0-4, A0-8) |
| 18 | Mühimmat fabrikasının askeri talebi | Mühimmat fabrikası kurulabilir; talep yalnız NPC pazarı | Y-35 ile gerçek ordu talebi (ikmal zincirine döner; 1 hat ≈ ilin ordusu); düğüm ikmali çalışır, Ordugâh ve eşkıya yok |
| 19 | Performans hedefi: 1k bot 30 gün ≤ bugünkü 21–22 sn | 1.000 oyuncu × 30 gün 150 sn; artımlı çözüm ayrı karar | yüksek (A0-4) |
| 20 | **L ölçek teknoloji kilidinin mülk kipinde kalkması** (Y-32) | `sanayi.olcekKademeleri[2].gerekliTeknoloji = otomasyon`; `sanayi/komut.ts` satır 69 denetler; mülk kipi için bypass yok; bölge kipi altınları korunmalı | orta (kod değişikliği) |
| 21 | **Ölçek başına ayak izi** (Y-34): `olcekHucre[tür] = [yuva, yuva+1, yuva+2]`, en çok 5 hücre, bağlı kenar-bitişik küme; yükseltmede ek bitişik hücre + atomik satın alma | `mulk.yapiYuva[tür]` türe göre tek sabit; `tesis_insa_hucre` hücre sayısını `yapiYuva`'ya eşit ister; yerinde yükseltmede hücre ekleme yok (mülk kipinde `tesis_olcek_yukselt` davranışı doğrulanmadı) | orta (çekirdek + veri; tek yazar sırası) |
| 22 | **PvP yağma iletimi:** `kayipTavaniUygula` alınanın %100'ünü saldırana aktarır (Y-36: %60) | `yagmaIletimPpm` parametresi yok; çok kaynaklı (PvE + PvP) tavan için düğüm başına defter yok | orta (Alfa-1 PvP; PvE yağması NPC'ye mal lavabosu) |
| 23 | **Mülk kipi birlik ikmali çarpanı** (Y-36: ×0,25) | `ikmalTalebi` çarpansız; bölge kipi altınları korunmalı | düşük (parametre `askeri.ikmalCarpaniPpm`; mülk kipinde 250.000) |

### 8.2 Kodda var, belgede yok ya da eskimiş

| # | Kodda | Belgede |
|---|---|---|
| 1 | Atomik `yapi_yerlestir`, `parsel_birak` (%70 iade), kenar-bitişik yapı hücreleri | docs/11 ek karar 1 "çekirdek ve sunucu değişmez" der (T-16); 06 §15.4 doğru |
| 2 | Erken oyun çarpanı: ilk 24 saat inşa süresi %10, 168. saatte %100 (ilk Tarla **12 dk**) | docs/11 §7.3, §7.9 "~24 dk" (T-14); 06 §15.5 doğru |
| 3 | Emir yuvası: 4 temel + Ticaret ofisi başına 4; Ticaret ofisi komisyon %25, makas %15 indirimi | docs/11 yalnız "emir yuvaları, sözleşmeler" |
| 4 | Limansız ilde ilk satış (yerel NPC pazarı; liman şartı yok) | docs/11'de yok; 06 §15.2 |
| 5 | Mutlak duvar saati, yetişme, `yetisiyor` hata kodu, `hosgeldin` alanları | docs/12 §7 ve sunucu-tasarimi; docs/11 §10 "Süreç" satırında yok (T-01) |
| 6 | Yürüyüş istemcisi ilk dilimi (`istemci/src/yuru/`): tıkla-git, çarpışma, mini harita, çizim çağrısı 14–19 | docs/11 F5 "Alfa-1, paralel"; ek karar "temeli Alfa-0'da" (T-08) |
| 7 | Hazır arsa üretimi (halka, adalar; `veri-hatti/src/osm/halka.ts`, `izgara-*`), Gebze'de 55.100 hazır arsa | arsa-ve-insa §2.3 öneri; docs/11 ek karar 1 |
| 8 | Yerleş ekranı üç aday ilçe, doluluk ve imza ürün uyumu | docs/11 §7.9, rehber; `devlet-sec.ts` bölge kipinde hâlâ duruyor (T-25) |
| 9 | Teknoloji: 7 düğüm (`mekanize_ordu` dahil) | docs/04 §9.4 "6 düğüm" (T-13) |
| 10 | Ayrılmış hücre karma ile ilçeye saçılmış; fiyat paydası tüm uygun hücre | arsa-ve-insa B2–B3 (Z14) öneri; docs/11 §7.2 formülü paydayı belirtmiyor (T-18) |
| 11 | `istemci/src/tasarim/` (OKLCH token üreticisi) çalışma ağacında | gorsel-kimlik önerisi; docs'ta uygulama notu yok |
| 12 | Kare başına `kapsam: "parsel"` komut kaydı, 5 dk geri al (`insaat_iptal` + `parsel_birak`) | docs/11 F4; "geri al" tam iade değil (%50 / %70) |
| 13 | İstemci takvimi sim-saatine bağlı (`takvimDurumu(simSaat, ...)`, "N. yıl") | gerçek takvim kararı (Y-10) ile uyuşmaz (T-42) |

---

## 9. Açık sorular, sahip/baş lider kararları ve bakım kuralı

### 9.1 Karar bekleyenler (özet; ayrıntı ilgili bölümde)

| # | Soru | Önerilen varsayılan | Karar kimde | Nerede |
|---|---|---|---|---|
| 1 | ~~Askeri Alfa-0'da mı?~~ **Kapandı (Y-35):** bayraklı eşkıya PvE dilimi; kalan: ön duyuru 24 sa için çeşitlilik §5.3 düzeltmesi, docs/00 K32, docs/04 §9.2, docs/11 §6 ve yapay zekâ §8 metinleri; E1–E3 Alfa-0 sonrası | karar verildi | baş lider | Y-35; T-09, T-50…T-53 |
| 2 | **Yürüyüş Alfa-0'da** isteğe bağlı mı, kapıda mı? | isteğe bağlı, kapı değil | baş lider | T-08 |
| 3 | ~~P0'a eklensin mi: yerel pazar kanalı ve "sen yokken" çekirdeği?~~ **Kapandı (Y-37):** P0'a girdi; kalan: uygulama sırası, olgu defteri, docs/12 §10 P0 metni | karar verildi | baş lider | Y-37; §6.4 AÖ-10 |
| 4 | **Süpermarket Alfa-0'da seçilebilir mi** (korumalar Alfa-0'a çekilirse) ve Açılış Tezgâhı | korumalarla birlikte; tezgâh P1 | baş lider | §3B.5, T-39 |
| 5 | ~~`kepek` 24. mal~~ **Kapandı (Y-37):** kabul edildi; kalan: birleşik kimlik listesi (AÖ-3) | karar verildi | baş lider | T-36 |
| 6 | ~~Çekim uzayı, fiyat paydası, ayrılmış hücre kararı Alfa-0 öncesi~~ **Alfa-0 öncesine çekildi (Y-37);** kalan: kural ayrıntısı ve sayılar (talep modeli kimliği dahil) | karar verildi (zamanlama); ayrıntı **açık** | baş lider | AÖ-2 |
| 7 | **Seviye/kilit kararı** docs/11 §7.3–§7.4 ve ilgili raporlara işlensin; KL-09, 10, 11, 13 | ölçek/yöntem ilçe kapısı yok; vali adaylığı serbest | baş lider | §5.3 |
| 8 | Yapı kimlikleri: `hafif_sanayi` 20. yapı, `dukkan` 19., Konut/Garaj/Lab gizleme | ilk veri sürümünde `hafif_sanayi`; yer tutucular gizle | baş lider | T-10, T-44 |
| 9 | K-4 adları (Muhtar = mahalle, İlçe Başkanı = ilçe) ve NPC kaymakam anlamı | evet; tek anlam | baş lider | T-04, T-27 |
| 10 | "Zorluk katmanı" nedir? | tanımsız; sahibe sor | sahip | Y-18 |
| 11 | Anonim hesap / "önce oyna", tek hibe, çoklu hesap politikası | giriş önce, tek dokunuş | sahip | AÖ-13 |
| 12 | Bayram kapsamı, sessiz günler, "Esnaf Haftası", ad anma rızası, KVKK hukuki görüş zamanlaması | önerilen varsayılanlar canlı §11, imza Q5–Q6 | sahip | Y-13 |

### 9.2 Bu belgenin bakımı

1. **Tek doğruluk kaynağı** olması için her yeni karar önce **§4**'e (karar defteri) satır olarak girer; ilgili sistem bölümü (§3, §3A–§3D) aynı gün güncellenir. Rapor önerisi karar sayılmaz.
2. **v1.1 işleri:** askeri hizalama yapıldı (§3D, Y-35, Y-36, T-09, T-50…T-53); kalan: sahip/baş lider yanıtları (§9.1) işlenir; README, docs/04 §9, docs/10 ve docs/11 §6–§7'ye bu belgeye işaret ve §5.1 düzeltmeleri uygulanır.
3. Çelişki çıkarsa okuma kuralı (başlık notu) uygulanır; yeni çelişki §5.1'e eklenir.
4. Sayılar kalibre edilmemiştir; kalibrasyon sonucu değişen değer ilgili sistem bölümünde ve kod/veri paketinde güncellenir, §4'e kalibrasyon satırı yazılır.

---

## Ek A. Kaynak dizini

| Kısaltma | Belge |
|---|---|
| docs/00, 11, 12 | Vizyon ve kararlar (K1–K35); Ürün dönüşü (ADR) ve ek kararlar; Yön taslağı (§7–§13: §12 sahip kararı, §13 baş lider kararları) |
| 06 | Simülasyon spesifikasyonu (uygulama kuralları; §15 mülk kipi) |
| sentez | arastirma/argelider-sentez-1.md (G1–G23, S1–S11) |
| canlı, dikey, kamu, yapay-zeka, rehber | canli-dunya-simulasyonu, dikey-zincirler-ve-perakende, kamu-ve-kamu-arazileri, yapay-zeka-kamu-ajanlari, rehber-gorevler |
| imza, arsa, bilim, gorsel, baslangic, harman | imza-mekanikleri-ve-yonelimler, arsa-ve-insa-derinlestirme, bilim-teknoloji-askeri, gorsel-kimlik-ve-arayuz, baslangic-ve-ustalik, oyun-kimligi-harman |
| cesitlilik-uretim, cesitlilik-yonetim | cesitlilik-uretim-katmanlari, cesitlilik-yonetim-askeri-teknoloji |
| uretim-agi, perakende, donus (dalga 4) | uretim-agi-genisletme, perakende-kademeleri, donus-deneyimi |
| askeri-katman-v1 (dalga 4, 2. tur, onaylı) | askeri-katman-v1 (§3D bu rapora göre yeniden yazıldı) |
| sunucu-tasarimi, paylasilan-dunya, harita-istemci, yuru-istemci, karo-ve-izgara, sokak-seviyesi-3d, 3d-teknoloji, acik-kaynak-ve-veri, alti-katman-rakipler, arayuz-ux, capital-rift-mekanikleri, oyun-tasarimi-parsel | teknik ve ön araştırmalar (özet düzeyinde tarandı) |
