# Ar-Ge Lideri Sentezi 2: Üretim Ağı, Perakende Kademeleri, Dönüş Deneyimi, Askeri Katman ve Oyun Tasarım Belgesi

> **Durum.** 1 Ekim 2026, Ar-Ge dalgası 4. Bu belge beş raporun eleştirel incelemesinin sentezidir: raporlar arası ve önceki kararlarla çelişkiler, dalga içinde verilen baş lider kararları, birleşik "geri dönüşü zor kararlar" listesi, Alfa-0 önerisi ve sahip için açık sorular. **Öneridir;** "karar" diye işaretlenen satırlar baş liderin ya da sahibin bu dalgada verdiği kararlardır. Kod, veri ve başka belge değiştirilmedi.
>
> **Raporlar ve inceleme turları.**
>
> | Rapor | Tur | İstenen düzeltmeler |
> |---|---|---|
> | [uretim-agi-genisletme.md](uretim-agi-genisletme.md) | 2 | ayak izi, komut adları, Senaryo 1 bilançosu, büyük harf, sözcük |
> | [perakende-kademeleri.md](perakende-kademeleri.md) | 3 | bayram, ayak izi, Alfa-0 dilimi, ince dünyada pay tavanı, senaryolar, mal × kanal matrisi, sahip kararı P-7 |
> | [donus-deneyimi.md](donus-deneyimi.md) | 2 | yetişme, rehber B6 ile birleşme, odak, örnek tutarlılığı, kamu hakkı, senaryolar |
> | [askeri-katman-v1.md](askeri-katman-v1.md) | 2 | eğlence döngüsü (§4A), sayı tutarlılığı, Alfa-0 karar kutusu |
> | [oyun-tasarim-belgesi-v1.md](oyun-tasarim-belgesi-v1.md) | 3 | dalga 4 kesin hâlleri, büyük harf, docs/12 §12–13 eşlemesi, askeri hizalama, son baş lider kararları (Y-37, Y-38) |
>
> **Bu dalganın çıtası** (sahip ve baş lider): odak kaymasın; "bu bir oyun, tam gerçekçi olamaz"; üretim, perakende ve dönüş "çok iyi" olsun. Buna göre şunlar kabul edilmedi:
> - eksik zincir ya da çıkmaz mal,
> - belirsiz sayı,
> - oyuncu gözünden adım adım senaryosu olmayan rapor.
>
> Beş raporun hepsinde sayılı senaryolar vardır.

---

## 0. En önemli on bulgu

1. **"Seviye ya da kilit yok, seçim var" artık bütün sistemlerin ilkesi** (sahip kararı docs/12 §12; baş lider kararları §13). Kademeler ve ölçekler iş modelidir:
   - bakkal, market, süpermarket;
   - atölye, imalathane, fabrika;
   - askeri M0–M4.

   Kalan kısıtlar yalnız şunlardır: sermaye, arsa ve ayak izi, girdi, işletme gideri, adalet ve tekelleşme korumaları. Taramada **13 sıra ya da seviye kilidi** bulundu (oyun tasarım belgesi §5.3); ikisi bu dalgada kaldırıldı:
   - mülk kipinde L ölçeğin `otomasyon` kilidi,
   - docs/11 §7.4'teki ilçe seviyesi kilidi.
2. **Ayak izi ölçekle büyür (karar).** Kural `olcekHucre[tür] = [yuva, yuva+1, yuva+2]`; yapı biçimi en çok 5 hücre, bağlı ve kenar-bitişik bir kümedir. Bu karar arsa-ve-insa Z4'ün yerine geçer.
   - Doğrudan büyük kurulumda ayak izi baştan alınır.
   - Yerinde yükseltme, ek bitişik hücre oyuncunun kendi boş hücresiyse ya da aynı atomik işlemde satın alınabiliyorsa yapılır. Bu bir fiziksel koşuldur, kilit değildir.
3. **Üretim ağı 17 zincir hattına çıkar ve hiçbir mal çıkmaz değildir.**
   - 24 yeni tarifli mal, 32 yeni yöntem.
   - Her mal en az iki tüketici türüne bağlı; betikle denetlendi.
   - Hayvancılık şöyle ilerler: yem → süt/et/yumurta → deri → ayakkabı.
   - Canlı hayvan mal değildir; tek istisna `kasaplik`.
   - Birleşik mallar (et, süt, iplik) bölünmez.
   - Alfa-0'a tek dokunuş `kepek`: değirmenden ahıra, ahırdan gübre olarak tarlaya dönen ilk kapalı döngü.
4. **Kısa yol / uzun yol ilkesi karmaşıklığın asıl freni.** Alfa-0'da zincirlerin birleşik kademeli kısa biçimi oynanır; Alfa-1'de ayrık kademeler, yan ürünler ve +%10–25 katma değer eklenir.
   - Kısa yol hiç kaldırılmaz.
   - Görünen mal sayısı sınırlıdır: ekranda ≤9 çip, başta ≤16, ilk ay ≤24, Alfa-1 sonunda ≤36.
   - Karmaşıklık puanı sayısaldır.
5. **Perakende bir merdiven değil, iş modelleri kataloğudur.**
   - Kademe = ölçek + tür. Yakınlık Havuzu bakkal kademesine bağlıdır; bakkal zinciri bu nişi kaybetmez.
   - Pay tavanı kademelidir: ilçede tek oyuncu varsa yok, iki oyuncuda %70, üç ve üstünde %50. Alfa-0'da kapalıdır.
   - Oyuncu markası ve Zincir Kartı birinci sınıftır.
   - Süpermarket doğrudan açılabilir.
   - Bu rapordan Alfa-0'a **0 yeni kural** girer: yalnız S ölçek dükkân türleri.
6. **Çekirdek kodda iki somut sorun bulundu:**
   - Askeri komutlar (`birlik_uret`, `savunma_emri`) mülk kipindeki işletme düğümünü reddediyor (`uretim.ts`, `savas.ts`'de `ic.bolgeIndeks`); 2 satırlık düzeltme gerekiyor.
   - İstemci takvimi simülasyon saatine bağlı ve "N. yıl" gösteriyor; oysa 1:1 gerçek tarih kararlaştırılmıştı (dönüş DB-10).

   Sentez-1'den beri açık olan kamu arsası sorunu kapanıyor: çekirdek işi incelemede ve commit bekliyor (G2 P1 bitti, Gebze ölçeği için dikdörtgen ada saklamasına geçiliyor; G1 kamu yayını hazır; docs/12 c2221dc).
7. **"Sen yokken" ekranı yeni bir sistem değil, mevcut parçaların tek bir sakin yüzü.**
   - Şablon + olgu defteri; LLM yok.
   - Yedi yokluk bandı; ilk bakışta ≤8 satır ve ≤90 kelime.
   - Yetişme sırasında da deterministik özet kaydı üretilir.
   - Kamusal veri sınırı üç katmanlıdır.
   - İlerleme yüzde ya da boş yuva olmadan damgayla gösterilir.
   - Zaman sınırlı kozmetik yok, ikinci dönüş ödülü yok.
8. **Askeri katman sağlam ve dürüst, ayrıca eğlenceli hâle getirildi.**
   - H5 kuralları işletme düğümlerine iner.
   - Askeri sektör net para lavabosudur; PvP yağmada alınanın %60'ı saldırana geçer, %40'ı yok olur.
   - Askeri gelir meşru ama ikincil bir sermayedir.
   - Gerilim eğrisi şiddetsiz ama dramatik; zaferin karşılığı görünür ama avantajsız.

   Alfa-0 için baş lider kararı: bayraklı eşkıya PvE dilimi.
9. **Alfa-0 P0 listesinde iki boşluk var.**
   - **Yerel pazar kanalı:** dükkân buna bağlı; bu olmadan dükkân yalnız NPC pazarına satan bir arayüz olur.
   - **"Sen yokken" en küçük dilimi:** sahibin isteğidir, ≈3 M + 1 S.

   Ayrıca çekim uzayı, arsa fiyat paydası ve ayrılmış hücre kuralı "Alfa-1 öncesi" etiketliydi; arsa satışı Alfa-0'da başladığı için **Alfa-0 öncesine çekildi** (baş lider kararı D4-7). Yerel pazar kanalı ve "Sen yokken" en küçük dilimi de **P0'a girdi** (D4-7).
10. **Tek doğruluk kaynağı hazır.**
    - Oyun tasarım belgesi v1 kararları altı dağınık kaynaktan topladı; Y-01…Y-34 ve diğer karar kümeleri tek defterde.
    - 49 çelişki satırı ve bir odak tablosu var.
    - Alfa-0 kapsamı kilitlendi.
    - Yapay zekâ sınırları tek yerde: yalnız sunucu kamu ajanı ve kamusal NPC'ler, şablon öncelikli, maliyet tavanlı.

    Belgeye bakım kuralı konmalı; aksi hâlde kararlar yeniden dağılır.

---

## 1. Beş raporun özeti (10'ar madde)

### 1.1 Üretim ağının genişletilmesi ([rapor](uretim-agi-genisletme.md))

1. **İlke "bir oyuncunun çıktısı ötekinin girdisi".** 10 yeni zincir hattı eklenir:
   - hayvancılık: H1 süt-yem, H2 et-deri, H3 kümes, H4 yün-halı;
   - tahıl: T1 un ürünleri, T2 mısır-nişasta, T3 arpa-malt;
   - madencilik ve sanayi: M1 çimento, M2 kablo, M3 inşaat demiri, profil ve doğrama.

   Toplam 17 hat; 24 tarifli mal (21 yeni kimlik + planlı `misir`, `et`, `yun`) ve 32 yöntem.
2. **Tüm tarifler betikle sınandı:** katma değer oranı 1,16–1,48; işçi başına katma değer hedef bantta.
3. **Alfa-0 dokunuşu yalnız `kepek`:** ilk kapalı döngü Tarla → değirmen → kepek → ahır → gübre → Tarla. Kabul edilmezse Alfa-1'e kayar.
4. **Çıkmaz mal yok:** her mal en az iki tüketici türüne bağlı (üretim, hane, kamu, yapı, ordu, bütçeli NPC alıcısı). Dikey raporun tek tüketicili mallarına ikinci tüketici eklendi. Kural derlemede doğrulayıcı hatası olmalı.
5. **Kısa yol / uzun yol:** Alfa-0 birleşik kademe, Alfa-1 ayrık kademe; bu bir yayın aşamasıdır, oyuncu basamağı değildir.
6. **Sadeleştirme:**
   - canlı hayvan mal değildir;
   - birleşik mallar bölünmez;
   - hayvan refahı mevcut bakım ve aşınma alanlarının "Sürü Sağlığı" yüzüdür: çıktı ×0,80–1,08, hastalık olayı var ama ölüm gösterilmez.
7. **Karmaşıklık bütçesi sayısaldır:**
   - mal sayısı 24 → 28 → 47 → 55;
   - yöntem sayısı 34 → 39 → 66 → 75;
   - görünen mal ≤16 / ≤24 / ≤36;
   - zincir ≤4 kademe;
   - karmaşıklık puanı her dilimde ≤16.
8. **Atölye, imalathane ve fabrika üç iş modelidir; iki yol vardır:**
   - yerinde büyüme (`tesis_olcek_yukselt`; mülk kipinde doğrulanmadı),
   - doğrudan büyük kurulum (`yapi_yerlestir` ve `tesis_insa_hucre` komutlarına `olcek` alanı).

   Küçük ilçede büyük fabrika kurmak kilit değil; bedeli ekonomik olarak ödenir.
9. **Üç senaryo:**
   - Hendek'te kapalı döngü: bilanço ≈₺52.300; ≈₺2.300'lük açık fırın gelirinden kapanır.
   - Dört esnafın deri zinciri: Alfa-1, sözleşmeyle, toplam yatırım ₺112.000.
   - Sermayeyle doğrudan L haddehane: kendi çeliğiyle KD ₺9.630, ithal çelikle ₺5.310.
10. **Geri dönüşü zor 14 karar:**
    - mal kimlik kilidi (sarkuteri → `et_urunu`);
    - birleşik malların bölünmemesi;
    - `kasaplik` malı;
    - yöntemlerin hangi tesiste doğduğu (`hafif_sanayi` 20. yapı; `gida_fabrikasi` 18 yöntem);
    - ayak izi kararı (K-14);
    - kilitsizlik ilkesi (K-13).

### 1.2 Perakende kademeleri ([rapor](perakende-kademeleri.md))

1. **Kademe = ölçek + tür, ve bir iş modelidir.** Bakkal (S), market (M), süpermarket (L). Mal listeleri iç içedir. Yükseltme (`dukkan_yukselt`, yeni komut) yalnız bir seçenektir.
2. **Kademe tablosu:**

   | | Bakkal | Market | Süpermarket |
   |---|---|---|---|
   | Hücre | 1 | 2 | 3 (alternatif 2: `[1,2,2]`) |
   | Raf yuvası | 4 | 6 | 8 |
   | Tam çeşit | 6 | 9 | 12 |
   | Kasa (birim/sa) | 90 | 198 | 324 |
   | Çekim çarpanı | 1,0 | 1,6 | 2,4 |
   | Gider (₺/sa) | 132 | 204 | ≈330 |

   İnşa ≈₺11,4k / 28,6k / 51,5k. Yükseltme maliyeti doğrudan inşayla tutarlıdır.
3. **Bakkalın nişi:** Yakınlık Havuzu, oyuncu havuzunun %15'i; bakkal kademesine bağlıdır, şube sayısına değil.
4. **Tekelleşme korumaları:**
   - pay tavanı kademeli (n=1 yok, n=2 %70, n≥3 %50; Alfa-0'da kapalı);
   - ilçede ≤2 dükkân, ≤1 süpermarket;
   - ruhsat kotası NPC zincir marketle ortak;
   - kampanya sınırı (<0,85 R için günde ≤6 saat);
   - esnaf kampanya eşiğini %75'e çıkarma önerisi.
5. **Zincir Kartı türetilmiştir, ayrı bir yapı değildir.** Marka başına ≥3 / ≥6 / ≥10 şubede açılır, kademe karışımından bağımsızdır. Gider indirimi −%3 / −%6 / −%10 (sembolik); bedeli rafın %50'sinin merkez kataloğuna kilitlenmesidir. Tedarikçi fiyatı sıkıştırılamaz.
6. **Tür kataloğu 13 tür / modüldür.** Tür kimlikleri mal kimlikleriyle kesişmez. Üretici satış noktası ayrı yapı değil, "Yerinde Satış" modülüdür. Toptan deposu NPC talebi yaratmaz.
7. **Oyuncular arası tedarik Alfa-1'de:** raf tedarik sözleşmesi, marka etiketi (çekimi etkilemez), satış bilgisi, konsinye.
8. **Mal × satış kanalı matrisi (23 mal):**
   - `elektronik` ve `gubre` perakende çıkışsız.
   - `cam`, `un`, `sut` ve `findik_urunu` rafa eklendi.
   - "Yalnız ithal" listesi çıkarıldı.
   - Yeni doğrulayıcı kuralı: raftaki her malın NPC pazar kaydı olmalı.
9. **Beş senaryo:**
   - (a1) bakkal zinciri, gün 0–30;
   - (a2) madencilik sermayesiyle doğrudan süpermarket;
   - (b1) küçük ilçede fiyat kırma;
   - (b2) zincir ile bakkal;
   - (c) raf tedarik sözleşmesi, para akışıyla.
10. **Alfa-0 dilimi:** bakkal, fırın, şarküteri, şekerci, yapı market + Açılış Tezgâhı. Bu rapordan **0 yeni kural, komut ya da kavram** girer. Market, süpermarket, kademe çarpanı, Yakınlık Havuzu ve pay tavanı Alfa-1'de. Geri dönüşü zor 13 karar; dini bayram yalnız talep zamanlamasıdır.

### 1.3 Dönüş deneyimi ([rapor](donus-deneyimi.md))

1. **"Sen yokken" mevcut parçaların tek bir sakin yüzüdür:** net sonuç, biten işler, gelenler, bülten, takvimden, komşular, tek öneri. Sekme adı "Bugün". İlk bakış ≤8 satır, ≤90 kelime, ≈12 saniye; `Devam` ilk andan etkin.
2. **Yedi yokluk bandı:** <1 sa ekran yok; 1–6 sa şerit; 6–48 sa Gün Sayfası; 2–7 gün Hafta Sayfası; 7–14 gün sıkıştırılmış; 14/45/90 gün uyku, çürüme ya da açık artırma kartı. 90 gün bandına kamu hakkı ve yapının açık artırması da eklendi.
3. **Masaüstünde açık defter + gazete; telefonda üç yatay sayfa.** Ekran harita yüklenirken okunur, yani yükleme süresini örter.
4. **Komşular üç katmanlıdır:** sana yönelen eylemler adlı; kamusal olgular yalnız ad anma rızasıyla adlı; pazar hareketleri toplu ve adsız. Çevrimiçi durum, stok ve nakit asla gösterilmez; bu sınır testle korunur.
5. **Tek öneri:** rehber öneri motoru + dönüş kuralları; her önerinin bir "çünkü" cümlesi var ve yapılamayacak eylem önerilmez.
6. **Kaldığın yer:** Dikkat panelinde çip olarak kalır; en çok 3 yarım iş. Taslak yerleşim profilde 7 gün saklanır.
7. **Defter:** ilerleme damgayla gösterilir (sayı, yüzde, boş yuva yok). Defter yaşlanır: gün 1–7 öğretici, 7–30 "Ufuk", sonra Hatıralar.
8. **Ödüller v2:** ≈16 yeni kavram, yalnız kozmetik ya da bilgi verir ve profilde tutulur. Para ya da mal ödülü çekirdekteki `alinanOdul` ile korunur. Zaman sınırlı kozmetik yok; ikinci dönüş ödülü yok.
9. **Takvim ve bildirimler:** takvim gerçek tarihli ajanda, ay ve yıl şeridi. Bildirim varsayılan kapalı, günde ≤2, 22–08 arası sessiz; Web Push, e-posta ve `.ics` Alfa-1+.
10. **Teknik çerçeve:**
    - LLM yok (kişisel özet cümlesi ayda ≈$270–2.300 tutardı);
    - iki çapa: son görülme ve özetin okunduğu an;
    - yetişme sırasında da çalışan özet kayıtları (Test 8);
    - olgu saklanır, metin saklanmaz;
    - en küçük Alfa-0 dilimi D1 + D2 + D3 + D4a + D5 (rehber B4/B6 ile birleşince ≈3 M + 1 S);
    - üç somut senaryo; geri dönüşü zor 9 karar.

### 1.4 Askeri katman v1 ([rapor](askeri-katman-v1.md))

1. **Çekirdek modül işletme düğümüne neredeyse hazır.** Birlik üretme ve savunma emri komutları için 2 satırlık düzeltme yeter. Asıl iş Ordugâh, eşkıya baskını ve ortak yağma defteri (13 kalem, ≈M–L).
2. **Kilitsiz iş modelleri:**
   - M0 askeri yapmayan;
   - M1 kendini savunan;
   - M2 koruma hizmeti veren;
   - M3 savunma tedarikçisi;
   - M4 il kontrolüne talip.

   İlçe seviyesi kilidi yok.
3. **Birlikler:** envanter oyuncunun işletme düğümünde; komuta il düzeyinde "il nöbeti" duruşuyla.
4. **Yapılar:**
   - Ordugâh (₺35.000, ilde ≤2), Karakol ve Gözetleme Kulesi oyuncunun ek yapılarıdır;
   - Nöbet Evi kamu hizmet hücresidir;
   - il komutanlığı bir yapı değil kuraldır; arayüz adı "İl savunma düzeni".
5. **H5 kuralları düğümlere iner:**
   - düğüm başına kayan 24 saatlik yağma defteri;
   - yapı devre dışı en çok ⌊%10 × yuva⌋;
   - ilçe bekleme 4 gün;
   - parsel el değiştirmez (özellik testi);
   - PvP'de savunanın seçtiği 4 saatlik bant.
6. **Alfa-0 PvE eşkıya baskını:**
   - boy = min(8, ⌊kalkansız aktif servet / ₺250.000⌋);
   - 19–23 arası bir saatlik dilim, 24 saat ön duyuru;
   - yenilgide yağma ≤%10 × ilçe payı;
   - zaferde ganimet mal olarak verilir; ilçe başına haftalık tavan ₺6.500.
7. **Para korunumu:** askeri sektör net lavabo; NPC ganimeti küçük bir mal musluğu; PvP yağmada %60 saldırana geçer, %40 yok olur; koruma ücreti alıcı onaylı ve tavanlı.
8. **Askeri gelir meşru ama ikincil sermayedir.** Mülk kipinde birlik ikmali ×0,25'e indirilir: tümen başına günde ₺6.432 → ₺1.752. Bu, sigorta paritesi sağlar.
9. **Eğlence (§4A):**
   - iki gerilim eğrisi (PvE 5 evre, PvP 6 evre);
   - soyut yaklaşma çizgisi, tur kartları ve zarf açılışı;
   - avantajsız şerit, kitabe ve unvan;
   - haftalık isteğe bağlı karar sayısı M1 için 6–10, M2 için 9–14; zorunlu karar 0;
   - ekranlarla anlatılmış senaryo.
10. **Hassasiyet:** gerçek kurum, birlik, marka ya da bayrak yok; insan zararı dili yok; "eşkıya" jenerik bir figür; anma günlerinde baskın penceresi açılmaz. Geri dönüşü zor 12 karar (K1–K12), ölçütler AH1–AH11.

### 1.5 Oyun tasarım belgesi v1 ([belge](oyun-tasarim-belgesi-v1.md))

1. **Karar vermez; toplar ve çelişkileri işaretler.** Bir okuma önceliği kuralı vardır: sahip → baş lider → docs/00 ve docs/11 → docs/06 ve kod → raporlar.
2. **Sekiz tasarım sütunu, kırmızı çizgiler ve odak sınaması.** Bir fikir sınamada "evet" almadıkça Alfa-0'a girmez.
3. **Karar defteri:**
   - Y-01…Y-34 (sahip yönergeleri ve docs/12; Y-31 = §12, Y-32…34 = §13);
   - K1–K35 (docs/00);
   - G1–G23 ve S1–S11 (sentez-1);
   - Ü1–Ü14 (docs/11).
4. **Çelişki taraması:** T-01…T-49 çelişki satırı, odak ve kapsam tablosu ("sonra" ya da "hiç" önerileriyle), 13 kilitlik "seviye yok" taraması.
5. **Alfa-0 kilidi:**
   - Kocaeli + Sakarya + Bursa, ≤200 davetli;
   - 23 mal (+ `kepek` kararı);
   - 4 zincir;
   - tek yeni yapı `dukkan` (S dükkânlar);
   - kamu görünür ama satılmaz;
   - girmeyenlerin listesi.
6. **"Alfa-0 öncesi şart" 18 karar (AÖ-1…AÖ-18)** ve kabul ölçütü önerileri (A0-9…A0-17).
7. **Yapay zekâ sınırları:**
   - yalnız sunucu kamu ajanı (ihale (b); Alfa-0'da gölge mod) ve kamusal NPC'ler;
   - NPC'ler kalıp seçenekli konuşur; çeşitleme önceden toplu üretilir;
   - kamusal NPC çeşitlemesinin maliyeti ayda ≈$3–6 / $11–20 / $45–81 (200 / 1.000 / 10.000 oyuncu);
   - serbest sohbet önerilmez (ayda $90–9.900 ve enjeksiyon riski);
   - oyuncu ajanı ya da oyun API'si yok.
8. **Belge ↔ kod farkları:**
   - kamu arsası yalnız istemcide (belge yazılırken; çekirdek işi şimdi incelemede);
   - `otomasyon` kilidi kodda;
   - Y-32 ve Y-34 kodda yok;
   - çekirdekte bugün 14 mal, 24 yöntem, 18 tesis türü.
9. **Acil maddeler (a)–(g):**
   - kamu arsasını çekirdeğe taşımak;
   - çekim uzayı, arsa fiyat paydası ve ayrılmış hücre kararlarını Alfa-0 öncesine çekmek;
   - askeri ve yürüyüşün Alfa-0'daki yeri;
   - yerel pazar kanalı ve "Sen yokken" çekirdeğini P0'a almak;
   - birleşik mal ve yapı kimlik listesi;
   - K-4 adlandırması (Muhtar mahallede, İlçe Başkanı ilçede);
   - oyuncu ajanı ifadelerini raporlardan temizlemek.
10. **Dalga 4 kararlarıyla hizalandı (v1.1, onaylı):**
    - askeri bölüm askeri rapora göre yeniden yazıldı: Y-35 (seçenek (i), bayraklı PvE), Y-36 (yağma %60 / %40, ikmal ×0,25);
    - Y-37: `kepek`, P0 eklemeleri, Alfa-0 öncesine çekilen arsa kararları;
    - Y-38: kamu blokları dikdörtgen adalar olarak saklanır (docs/12 §13);
    - toplam 54 çelişki satırı; T-54 açık: mahalle paketinin 20 hücresiyle "~7.000 uygun hücre başına bir paket" uyumu doğrulanmadı;
    - `il-imza.json` `ileride` listesi 75 kimlik (eski "73" düzeltildi);
    - kabul ölçütüne A0-18 (askeri bayrak kapısı), şart kararlarına AÖ-19 (askeri şema ve kimlik kilidi) eklendi.

    Bakım kuralı: rapor değişirse ilgili satırlar güncellenir.

---

## 2. Bu dalgada verilen kararlar (baş lider ve sahip)

| # | Karar | Kaynak | Etkilediği |
|---|---|---|---|
| D4-1 | **Kademeler seçimdir, ilerleme merdiveni değil; kilit yok, seçim var.** Süpermarket doğrudan açılabilir; yükseltme yalnız seçenek; oyuncuya özgü marka desteklenir; aynı ilke fabrika ölçeklerinde ve askeride de geçerli | Sahip, docs/12 §12 | perakende P-7, üretim K-13, askeri K1, oyun tasarım belgesi Y-31 |
| D4-2 | **Teknoloji kilidi yok:** mülk kipinde `olcekKademeleri[2].gerekliTeknoloji = otomasyon` kalkar; teknoloji verim ya da maliyet avantajıdır. Bölge kipi değişmez | Baş lider, docs/12 §13 | `parametreler.json`, Y-32 |
| D4-3 | **İlçe seviyesi kilit değildir;** yalnız kolektif dünya durumudur (NPC talebi, kamu altyapısı, ruhsat kotası). docs/11 §7.4'teki kilit tanımı geçersiz | Baş lider, docs/12 §13 | docs/11 §7.4; cesitlilik §7.5 (Tier 1 görünürlüğü keşfe bağlanmalı); Y-33 |
| D4-4 | **Ayak izi ölçekle büyür:** `olcekHucre[tür] = [yuva, yuva+1, yuva+2]`, biçim en çok 5 hücre (bağlı, kenar-bitişik). Doğrudan kurulumda baştan alınır; yerinde yükseltmede ek bitişik hücre kendi boş hücren ya da atomik satın alma olmalı; ≤72 / %25 tavanı geçerli | Baş lider, docs/12 §13 + genelleme onayı | Z4 yerine geçer; perakende `[1,2,3]` (süpermarket `[1,2,2]` istisnası alternatif); üretim K-14; Y-34 |
| D4-5 | **Askeri Alfa-0 = seçenek (i):** `askeri.eskiya.etkin` bayrağıyla, iki aşamalı:<br>• 0a (çekirdek ve şema) diğer P0'larla paralel, hemen başlar;<br>• 0b (oynanış) para güvenliği ve Esnaf Defteri P0'dan sonra gelir.<br>Bayrak kapıdan 3 hafta önce AH1, AH2, AH4 ve parsel H5 testleri geçerse açılır; geçmezse yalnız şema kalır | Baş lider | askeri §3.0; K32 ve docs/11 §6 ile çelişki (T-09) çözüldü |
| D4-6 | **PvP yağmada %60 aktarım / %40 yok olma** ve **mülk kipinde birlik ikmali ×0,25** kabul edildi (kalibrasyon testleriyle). E1–E3 eğlence artıları Alfa-0 sonrasında değerlendirilecek | Baş lider | askeri K3; çekirdek `kayipTavaniUygula` (bugün %100 aktarım) |
| D4-7 | **`kepek` 24. mal;** yerel pazar kanalı (canlı A0-2) ve "Sen yokken" en küçük dilimi **Alfa-0 P0'a girer;** çekim uzayı, arsa fiyat paydası ve ayrılmış hücre kuralı **Alfa-0 öncesine çekilir** | Baş lider | G-K1, G-K6; §5 |

---

## 3. Çelişkiler ve çözüm önerileri

### 3.1 Bu dalganın raporları arasında

| # | Çelişki | Taraflar | Öneri / durum |
|---|---|---|---|
| Ç4-1 | **Ayak izi:** raporlar farklı ayak izi kuralları öneriyordu:<br>• dikey §5.2: S/M/L aynı ayak izi<br>• Z4: aynı ayak izi<br>• üretim: [0,1,2] ek hücre<br>• perakende: önce 1, sonra 2–3 hücre | üretim ↔ perakende ↔ arsa ↔ dikey | **Çözüldü** (D4-4). Arsa-ve-insa Z4 ve dikey §5.2 metinleri sonraki belge güncellemesinde düzeltilmeli |
| Ç4-2 | **Dükkân tür sayısı** raporlara göre 5 / 6 / 8 / 13 | dikey §5.3 ↔ perakende §5 ↔ oyun tasarım belgesi | **Perakende raporu esas** (13 tür ya da modül). Alfa-0'da 5 tür + Açılış Tezgâhı |
| Ç4-3 | **Raf listeleri:** dikey §5.3'te `cam`, `un`, `sut` ve `findik_urunu` rafsız | dikey ↔ perakende §5.2 | **Perakende matrisi esas;** dikey §5.3 düzeltilmeli |
| Ç4-4 | **`ilk_dukkan` koşulu:** rehberde Ticaret ofisi köprüsü, dikey ve perakendede `dukkan` | rehber ↔ dikey ↔ perakende | Koşul `{dukkan, ticaret_ofisi}` (sentez-1 Ç5) korunur |
| Ç4-5 | **Savunma sayfası:** rehber "yapı kümesi gelince" diyor, askeri "Alfa-0'da açılır" | rehber §2.5 ↔ askeri T4 | D4-5 ile **askeri esas:** sayfa Alfa-0'da açılır ama bayrağa bağlıdır; 9 görev, hepsi ödülsüz |
| Ç4-6 | **Askeri yapı kimlikleri:** Ordugâh, Karakol ve Kule ek yapı; G8 kimlik kilidi tablosunda mı? | askeri ↔ G5 | **Birleşik kimlik listesine** (G-K1, §4) mal ve yapı kimlikleri birlikte girmeli |
| Ç4-7 | **Dönüş özetinde askeri satırlar** (askerinin 9 şablonu) ile dönüş raporunun şablon aileleri | askeri §4.3 ↔ dönüş §2.9 | Askeri şablonlar dönüş şablon deposuna aile olarak eklenir; aynı yasaklı kalıp denetimi uygulanır |

### 3.2 Önceki kararlar, raporlar ve kodla

| # | Çelişki | Kaynak | Öneri |
|---|---|---|---|
| Ö4-1 | **G5 "23 mal" kilidi ↔ `kepek` (24.) ve üretimin 21 yeni kimliği.** `il-imza.json` kilit kararlarıyla uyumlu hâliyle commit'lendi (9f79e18): `tekstil` → `kumas` + `hazir_giyim`, `sarkuteri` mal kimliği yasak, 17 ileride kimliği dikeyle birebir | docs/12 §10, üretim K-1, K-5 | **Karar (D4-7): `kepek` 24. mal.** Tek kavram ("yan ürün") ekler, ilk kapalı döngüyü kurar, yeni yapı ya da komut gerektirmez. **`kepek` ve üretimin 21 yeni kimliği (`et_urunu` dahil) birleşik listeye eklenmeden içerik dizisine (`icerik.json`) girmemeli** |
| Ö4-2 | **Alfa-0 P0'da yerel pazar kanalı yok** (canli-dunya A0-2), ama dükkân buna bağlı | dikey R5, perakende §12.3, oyun tasarım belgesi bulgu 3 | **Karar (D4-7): P0'a girdi** (ekmek + dükkân adımından önce ya da birlikte) |
| Ö4-3 | **"Sen yokken" P0'da yok** (sahibin isteği) | dönüş §7, oyun tasarım belgesi AÖ-10 | **Karar (D4-7): P0'a girdi:** Esnaf Defteri P0'ın hemen arkasında, en küçük dilim ≈3 M + 1 S |
| Ö4-4 | **Çekim uzayı (G20), arsa fiyat paydası (arsa Z14), ayrılmış hücre kuralı ve talep modeli "Alfa-1 öncesi" etiketli; oysa arsa satışı Alfa-0'da başlıyor** | sentez-1 §3.3, oyun tasarım belgesi AÖ-2 | **Karar (D4-7): Alfa-0 öncesine çekildi** (fiyat sözü ve konum beklentisi kalıcı) |
| Ö4-5 | **İstemci takvimi simülasyon saatine bağlı** ("N. yıl"); 1:1 gerçek tarih kararıyla uyuşmuyor | dönüş DB-10; `istemci/src/veri/tarim.ts`, `arayuz/panel.ts` | Kod düzeltmesi: üst çubukta gerçek tarih (Europe/Istanbul) |
| Ö4-6 | **Askeri komutlar işletme düğümünü reddediyor** | askeri §0; `cekirdek/src/askeri/uretim.ts`, `savas.ts` | 0a kapsamında `bolgeIndeksiBul` ile 2 satırlık düzeltme |
| Ö4-7 | **PvP yağma kodda %100 aktarım** | askeri K3 | D4-6: %60 aktarım / %40 yok olma; kalibrasyon testi |
| Ö4-8 | **Eşkıya ön duyurusu:** çeşitlilik §5.3 6 saat, askeri 24 saat | askeri K11 | **24 saat** (Kule ile 36); çeşitlilik §5.3 düzeltilmeli |
| Ö4-9 | **Esnaf indirim kampanyası %60 eşiği ↔ kademeli pay tavanı** | canli-dunya §4.2 ↔ perakende §9.3 | n≥3'te tavan kampanyayı gereksiz kılar; n≤2'de kampanya kalır. **Eşik %75'e çıkarılsın** |
| Ö4-10 | **cesitlilik §7.2 ve §7.5'te Tier 1 malların ilçe seviyesine göre görünmesi** ↔ D4-3 | cesitlilik ↔ D4-3 | Ürün Atlası görünürlüğü **keşfe** bağlanmalı, ilçe seviyesine değil |
| Ö4-11 | **`tesis_olcek_yukselt` mülk kipinde test edilmemiş; dükkânlar ek yapı olduğundan kapsamaz** | üretim U-2, perakende R9 | Mülk kipi testi + `ekHucreler` alanı; dükkânlar için yeni `dukkan_yukselt` |
| Ö4-12 | **Oyuncu ajanı / oyun API'si ifadeleri** dört eski raporda "izinli / v1.5" diye duruyor | docs/12 §10 ↔ kamu §2.6 ve §7.3, yapay zekâ §5.6 C, §8, §9, sentez-1 S2 | Belge güncellemesi: "kapalı (sahip kararı)" |
| Ö4-13 | **K-4 adlandırması** (Muhtar = mahalle, İlçe Başkanı = ilçe, NPC kaymakam = yöneticisiz hâl) için yazılı karar yok | oyun tasarım belgesi AÖ-14 | Baş lider yazılı karar olarak docs/12'ye eklesin |
| Ö4-14 | **Yürüyüş Alfa-0'da mı?** K28 "Alfa-1" diyor, ek karar "temeli Alfa-0'da"; kodda ilk dilim var | oyun tasarım belgesi T-08 | Alfa-0'da isteğe bağlı, kabul kapısı değil (oyun tasarım belgesi önerisi) |
| Ö4-15 | **`elektronik` ve `gubre` perakende çıkışsız** | perakende §5.2 | Gübre yalnız B2B ve NPC pazara (çıkmaz değil, iki tüketicisi var). Elektronik Alfa-1'de bir dükkân türüne (örn. "elektronik ve beyaz eşya") bağlansın; o zamana dek ihracat |

---

## 4. Birleşik geri dönüşü zor kararlar (öncelik sırasıyla)

Kaynak kodları: **Ü** üretim (K-), **P** perakende, **D** dönüş (DK-), **A** askeri (K), **O** oyun tasarım belgesi (AÖ-).

### 4.1 Şimdi (yeni kimlikler içerik dizisine girmeden ve F4'te ilk gerçek satıştan önce)

| # | Karar | Kaynak | Öneri |
|---|---|---|---|
| **G-K1** | **Birleşik mal ve yapı kimlik listesi** | Ü K-1, K-2, K-3, K-5; P 1 ve 12; A K10; O AÖ-3 ve AÖ-4 | Tek liste, yalnız sona ekleme. İçerik: 23 mal + `kepek`, üretimin 21 yeni kimliği (`et_urunu` dahil), birleşik mallar (`et`, `sut`, `iplik`, `yun`), `kasaplik`; yapılar `dukkan` (19.), `hafif_sanayi` (20.), `ordugah`, `karakol`, `gozetleme_kulesi`; dükkân tür kimlikleri. Tür ve mal kimlikleri kesişmez |
| **G-K2** | **Yöntemlerin hangi tesiste doğduğu** | Ü K-6, K-7, K-8 | Deri ve tekstil `hafif_sanayi`'de. `gida_fabrikasi` tek yapı + yöntemden gelen bina adı (≤10 yöntem kuralı Alfa-1 ölçümüne). `celikhane` ayrımı (fırın / haddehane) ölçümden sonra |
| **G-K3** | **Ayak izi verisi ve komutlarda `olcek` alanı** | D4-4; Ü K-14; P 3 | `mulk.olcekHucre`; `yapi_yerlestir` ve `tesis_insa_hucre`'ye `olcek`; yükseltmede `ekHucreler` |
| **G-K4** | **Kilitsizlik testi** | D4-1; Ü K-13; A K1; O A0-17 | Hiçbir yapı, ölçek, yöntem, dükkân kademesi ya da askeri yapı sıra veya seviye şartı taşımaz; veri doğrulayıcı testi |
| **G-K5** | **Kamu arsasının çekirdeğe taşınması** (sentez-1 G1) | O AÖ-1 | **Durum:** çekirdek işi incelemede, commit bekliyor (G2 P1 bitti; dikdörtgen ada saklaması; G1 kamu yayını hazır). İlk gerçek satıştan önce birleşmeli |
| **G-K6** | **Çekim uzayı, arsa fiyat paydası, ayrılmış hücre kuralı ve talep modeli** | O AÖ-2; Ö4-4 | **Karar (D4-7): Alfa-0 öncesine çekildi;** içerik kararları (öneriler: çekim uzayı A0 ilçe havuzu + konum, fiyat paydası açık halka havuzu, ayrılmış hücre arsa düzeyinde) baş liderde |
| **G-K7** | **Askeri çekirdek şeması (0a)** | A K2, K6, K8, K9; D4-5 | Birlik envanteri düğümde + il nöbeti; düğüm başına yağma defteri; kayıp %60 kalıcı / %40 revir; baskın hedefi ilçe; ganimet mal (para alanı yok) |

### 4.2 Alfa-0 öncesi

| # | Karar | Kaynak | Öneri |
|---|---|---|---|
| **G-K8** | **Dönüş çapaları ve saklama** | D DK-1, DK-3 | İki çapa profilde; olgu referansı saklanır, metin saklanmaz; özet kayıtları yetişmede de üretilir |
| **G-K9** | **Kamusal veri sınırı** | D DK-2 | Üç katman + yasak liste + test (çevrimiçi durum, stok ve nakit asla görünmez) |
| **G-K10** | **Ödül kapıları** | D DK-4, DK-6, DK-7; sentez-1 G4 | Kozmetik ve bilgi ödülleri profilde; para ve mal ödülleri çekirdekte `alinanOdul`; zaman sınırlı kozmetik yok; ikinci dönüş ödülü yok |
| **G-K11** | **Defter ilerlemesi damgadır** | D DK-5 | Sayı, yüzde ya da boş yuva yok |
| **G-K12** | **Çıkmaz mal kuralı derlemede hata** | Ü K-10; P PK11 | "En az iki tüketici" ve "raftaki her malın NPC pazar kaydı var" kuralları doğrulayıcıda |
| **G-K13** | **Birleşik malların bölünmemesi ve `kasaplik`** | Ü K-2, K-3 | Kabul |
| **G-K14** | **Askeri para korunumu** | A K3, K7, K12; D4-6 | Ganimet mal; PvP yağmada %60 / %40; koruma ücreti alıcı onaylı ve tavanlı; ikmal ×0,25 |

### 4.3 Alfa-1 öncesi

| # | Karar | Kaynak | Öneri |
|---|---|---|---|
| **G-K15** | **Perakende tekelleşme korumaları** | P 4, 5, 7, 8 | Kademeli pay tavanı; Yakınlık Havuzu sabit havuz; ölçek indirimi yalnız işletme giderinde; ruhsat kotası NPC ile ortak; esnaf kampanya eşiği %75 |
| **G-K16** | **Zincir Kartı türetilmiş; marka çekimi etkilemez** | P 6, 9 | Kabul |
| **G-K17** | **Kısa yol / uzun yol** (kısa yol hiç kaldırılmaz) | Ü §2.2 | Kabul |
| **G-K18** | **İl kontrol savaşı** | A K3, K4, K11 | Kontrol hakkı ağırlıklı, yağma yan etki; önce PvE, sonra PvP; savaş ilanında ön duyuru ≥20 saat |
| **G-K19** | **Bildirim varsayılanı ve hesap koruma sınıfı** | D DK-8, DK-9 | Varsayılan kapalı; günde ≤2; sessiz saat. Hareketsizlik uyarısı açık ve kapatılabilir; hukuki görüş gerekli |
| **G-K20** | **Hayvan sağlığı mevcut alanları paylaşır; Tier 1 sayımı revize edilir** | Ü K-11, K-12 | Etkin liste ≤36 |

---

## 5. Alfa-0'a girmesi önerilenler

**docs/12 §10'daki P0 sırası korunur;** bu dalganın eklemeleri aşağıda **koyu** yazılmıştır.

1. Kamu arsası verisi ve çekirdek reddi (G-K5; çekirdek işi incelemede).
2. Para güvenliği: ödül tablosu, kamu kasası, kamu NPC alıcısı.
3. **Birleşik mal ve yapı kimlik kilidi** (G-K1): 23 mal + `kepek`; ilk yapı kimlikleri; `olcekHucre` veri imzası.
4. **Yerel pazar kanalı** (canlı A0-2) **+** ekmek zinciri + dükkân. Dükkânlar S ölçek: bakkal, fırın, şarküteri, şekerci, yapı market. Kepek → ahır → gübre döngüsü bu adımla gelir.
5. Cam → pencere zinciri.
6. Esnaf Defteri P0 **+ "Sen yokken" en küçük dilimi** (D1–D3, D4a, D5; rehber B4/B6 ile birleşik).
7. Sabit fiyatlı kamu siparişi v0.
8. **Askeri 0a** (diğer P0'larla paralel, hemen):
   - düğüm düzeltmesi (2 satır);
   - yağma defteri şeması;
   - Ordugâh, Karakol ve Kule kimlikleri;
   - Nöbet Evi kamu hücresi;
   - `askeri.eskiya.etkin = false`.
9. **Askeri 0b** (para güvenliği ve Esnaf Defteri P0'dan sonra): eşkıya PvE baskını, Savunma sayfası (7 Alfa-0 görevi), askeri dönüş şablonları. Bayrak, kapıdan 3 hafta önce AH1, AH2, AH4 ve H5 testleri geçerse açılır.

**P1 (Alfa-0 içinde, P0'dan sonra):**
- süt → şarküteri ve fındık → şekerleme zincirleri;
- Takvimden sayfası ve yön sayfaları;
- dönüş ekranının telefon sayfaları, şerit ve Dikkat çipi (D4b);
- taslak yerleşim;
- takvim ekranı (gerçek tarih);
- oyun içi hatırlatma.

**Alfa-0'a girmeyenler** (oyun tasarım belgesi §6.3 listesine ek):
- market (M), süpermarket (L), kademe çarpanı, Yakınlık Havuzu, pay tavanı, Zincir Kartı, `dukkan_yukselt`;
- uzun yol zincirleri (yem, mezbaha, tabakhane, haddehane, kablo, çimento kalker) ve `hafif_sanayi`;
- PvP il kontrolü, ittifak, koruma hizmeti sözleşmesi, eğlence artıları E1–E3;
- Hatıralar, Web Push, e-posta, `.ics`;
- kamusal NPC'lerin LLM çeşitlemesi (Alfa-0'da yalnız şablon).

**Kabul kapısına önerilen eklemeler** (oyun tasarım belgesi §6.5):
- A0-9…A0-17 (kamu arsası, para güvenliği, zincirlerin botla tamamlanması, perakende dengesi, dönüş, Defter, zaman, yapay zekâ, kilitsizlik);
- **askeri bayrak kapısı** (AH1, AH2, AH4, H5).

---

## 6. Sahip için açık sorular

| # | Soru | Önerilen varsayılan |
|---|---|---|
| **S4-1** | ~~`kepek` 24. mal mı?~~ **Baş lider kararıyla kabul edildi (D4-7);** sahip itiraz ederse geri alınır | — |
| **S4-2** | Askeri birim adı: "tümen / alay" mı, daha küçük ölçekli "müfreze / bölük" mü? (yalnız görünen ad) | "Müfreze / bölük" (mahalle ölçeğine uygun) |
| **S4-3** | Askeri sonuç anında **ses** olsun mu (üç imza ses, varsayılan kapalı)? | Evet, varsayılan kapalı |
| **S4-4** | Süpermarket 3 hücre mi, 2 hücre mi? | 3 (genel kural); 2 yalnız ölçüm sonrası istisna |
| **S4-5** | Hareketsizlik uyarısı ("hesap koruma") e-postası varsayılan açık mı? (hukuki görüş gerekli) | Açık, kapatılabilir |
| **S4-6** | Dönüş ekranında günlük selam şeridi Alfa-0'da mı, Alfa-1'de mi? | Alfa-1 |
| **S4-7** | Kaçırılan etkinlik kozmetiği için yılda bir "arşiv hakkı" olsun mu? | Evet |
| **S4-8** | Bayram haftasında et ve şekerleme talebi dalgası (toplam sabit, yalnız zamanlama) kabul mü? | Evet; dini içerik yok, yalnız talep ve hatırlatma |
| **S4-9** | Yürüyüş Alfa-0'da isteğe bağlı, kabul kapısı dışında kalsın mı? | Evet |
| **S4-10** | Toplantı gündemi: oyun tasarım belgesi v1 "tek doğruluk kaynağı" olarak kabul edilsin mi; bakım kuralı (her karar sonrası güncelleme) baş liderde mi? | Evet; baş liderde |

---

## 7. Baş lider ve geliştirme lideri için notlar

1. **Kod (acil):**
   - kamu arsası çekirdek işinin incelenip commit edilmesi (G-K5; ilk gerçek satıştan önce);
   - askeri düğüm düzeltmesi (0a);
   - istemci takvimini gerçek tarihe geçirmek;
   - `olcekKademeleri[2].gerekliTeknoloji` kilidini mülk kipinde kaldırmak (D4-2);
   - `tesis_olcek_yukselt` için mülk kipi testi.
2. **Veri (acil):** `il-imza.json` kilit kararlarıyla uyumlu commit'lendi (9f79e18). **`kepek` ve üretim ağının 21 yeni kimliği birleşik listeye eklenmeden içerik dizisine (`icerik.json`) girmemeli** (G-K1). Birleşik liste: [kimlik-listesi-v1.md](kimlik-listesi-v1.md).
3. **Belge güncellemeleri** (karar sonrası):
   - docs/11 §7.3–7.4 (ilçe seviyesi, aynı akış);
   - arsa-ve-insa Z4;
   - dikey §5.2 ve §5.3;
   - cesitlilik §5.3 (6 saat → 24 saat) ve §7.2/§7.5;
   - canli-dunya §4.2 (%75);
   - rehber §2.5 (Savunma sayfası);
   - dört rapordaki oyuncu ajanı ifadeleri;
   - K-4 yazılı kararı;
   - README, docs/04, docs/10 ve docs/11 §6'nın oyun tasarım belgesiyle hizalanması.
4. **İş dağılımında "esas" rapor:**

   | Konu | Esas rapor |
   |---|---|
   | Mal, zincir, ölçek | uretim-agi-genisletme |
   | Dükkân, kademe, marka | perakende-kademeleri |
   | Dönüş, damga, takvim, bildirim | donus-deneyimi |
   | Askeri | askeri-katman-v1 |
   | Kapsam ve karar listesi | oyun-tasarim-belgesi-v1 |
   | Görev ve ödül | rehber-gorevler |
   | Kamu | kamu-ve-kamu-arazileri |
   | Yapay zekâ ajanı | yapay-zeka-kamu-ajanlari |

---

## 8. İnceleme yöntemi ve sınırlar

- **Kontrol edilenler:** her rapor tekrar, çelişki, kanıtsız iddia, docs/12 §7–13 kararlarıyla çatışma, sahip ilkeleri, dalga 4 çıtası ve "geri dönüşü zor kararlar" bölümünün kalitesi açısından okundu. Sahip ilkeleri: odak, oyun > gerçekçilik, kilitsizlik, parselin zorla el değiştirmemesi, NPC arsa sahibi olmaması, kapalıyken akış, büyük harf yok, "sezon" yok. Dalga 4 çıtası: senaryo, çıkmaz mal, sayı.
- **Kod ve parametrede yerinde doğrulananlar:**
  - `parametreler.json` `sanayi.olcekKademeleri` (`otomasyon` kilidi),
  - `cekirdek/src/sanayi/komut.ts` (`tesis_olcek_yukselt`),
  - `cekirdek/src/askeri/uretim.ts` ve `savas.ts` (`ic.bolgeIndeks` reddi),
  - `istemci/src/harita/arsa.ts`,
  - `veri/icerik/il-imza.json`.
- **Sınırlar:** sayılar kalibre edilmemiştir; ₺/sa değerleri mevcut içerik ölçeğine bağlıdır, karar için göreli marjlar esastır. Hukuki konular (KVKK, İYS, anma günleri, askeri tema) hukuki görüş gerektirir. Bazı oyun kaynakları (CoC, RoK, HoI4) erişilemedi ve "(arama özeti)" olarak işaretlidir.
