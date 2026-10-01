# Ar-Ge Lideri Sentezi 1: Döngüsel Zincirler, Kamu, Yapay Zekâ Ajanları, Rehber Görevler

> **Durum.** 1 Ekim 2026. Ar-Ge dalgası 3'ün sentezidir: dört raporun eleştirel incelemesi, raporlar arası ve önceki raporlarla çelişkiler, birleşik "geri dönüşü zor kararlar" listesi, Alfa-0 önerisi ve sahip için açık sorular. **Öneridir; kararları baş lider ve sahip verir.** Kod, veri ve başka belge değiştirilmedi.
>
> **Raporlar** (hepsi ikinci inceleme turunda onaylandı):
> - [dikey-zincirler-ve-perakende.md](dikey-zincirler-ve-perakende.md): 6 düzeltme (kamu tavanı, ithal-perakende marjı, Alfa-0 pencere erişimi, rehberle fark, tekrar notu, büyük harf).
> - [kamu-ve-kamu-arazileri.md](kamu-ve-kamu-arazileri.md): 6 düzeltme (ihracat makası payının yeni para basması, istemcideki kamu arsası, ajan raporuyla bölüşüm, API anahtarı okuması, iki ad düzeltmesi).
> - [yapay-zeka-kamu-ajanlari.md](yapay-zeka-kamu-ajanlari.md): 7 düzeltme (sunucu kapalıyken yetişme, makam boşken karar, sahip yönergesiyle uyum, büyük harf, kamu arazisi notu, ihale kuralı, kanıtsız iddia).
> - [rehber-gorevler.md](rehber-gorevler.md): 6 düzeltme (%25 kuralı, tutar taşıyan ödül komutu, büyük harf, "sezon", ad çakışması, iki çelişki satırı).

---

## 0. En önemli on bulgu

1. **Kamu arsası bugün yalnız istemcide var; satılırsa geri alınamaz.** F4 çalışma ağacında %4 kamu arsası `packages/istemci/src/harita/arsa.ts` içinde geçici türetiliyor (48×48 hücrelik yapay mahalle, `?kamu=0` ile kapanıyor). Sunucu ve çekirdek bunu bilmiyor; `parsel_al` ile kamu hücresi satın alınabilir. Parsel zorla el değiştirmediği için **ilk gerçek arsa satışından önce** kural veri hattına ve çekirdeğe taşınmalı (kamu A0-K1, T8).
2. **K-2'nin "%4" kuralı yanlış birimde.** Meydan, pazar ve park mahalle başına sabit bir ihtiyaçtır; yoğun ilçede %4'ü 1,5–2,5 kat aşar. Öneri:
   - **Mahalle Paketi** (20 hücre),
   - **%4 hazine rezervi**,
   - **ilçe merkezi** (8–12 hücre),
   - **kıyı şeridi** (2 hücre).

   Bileşik oran yoğun kentte ≈%8–9 olur. Oran bir halkada ilk arsa satılmadan dondurulur (kamu §1.2, KK-1).
3. **NPC makası Alfa-0'da ara kademe uzmanlığını öldürür.** Gidiş-dönüş ≈%20 makas yüzünden değirmen uzmanı zarar eder, entegre zincir kâr eder. Bu bilinçli kabul edilmeli: **Alfa-0 = kapalı zincir + çıkış kanalı seçimi; Alfa-1 (P5 sözleşme) = kademe uzmanlığı** (dikey §6).
4. **"Kendi dükkânın" küçük ama kalıcı bir prim verir.** Prim pazar eşdeğerinin ≈%3–16'sıdır. Asıl değeri, pazar doyduğunda (fiyat ×0,25'e kadar iner) zincirin çıkış kanalı olmasıdır. Sahibin "ana kanal" vaadi tutar, ama **yüksek marj vaadi tutmaz** (dikey §5.6; sahip sorusu S4).
5. **Kamu ihalesi ve sipariş tavanı bir para musluğu açıyor.** Tavan ref +%15, NPC ithalatı ×1,10; yani NPC'den alıp kamuya satmak risksiz kâr. Düzeltme: **tavan = ithalat paritesi.** Bu, canli-dunya §4.5'i ve capital-rift esnaf siparişi ödülünü de düzeltir (kamu §4.4, KK-9).
6. **Kamu bütçesi yalnız yanan paradan beslenebilir.** İhracat makası hiç basılmamış paradır; ondan kasaya pay ayırmak yeni para basmak olur (ilk taslaktaki hata düzeltildi). Kaynaklar:
   - ithalat makasının ve ithalat komisyonunun bir payı,
   - arazi vergisi payı,
   - hak bedelleri.

   Dürüst ölçek: ilçe kasası haftada ≈₺2.200. **Kamu, Alfa-0'da gelir değil prestij ve renk kaynağıdır** (kamu §4).
7. **İhalede iki model tek motorda birleşiyor.** canli-dunya §4.5 "en düşük fiyat" = Profil M; imza N4 "%70/%20/%10" = Profil Y. Kapalı teklif sunucu-mühürlü olabilir; commit–reveal gerekmez (kamu §3.2).
8. **Yapay zekâ ajanı doğru yerde dar tutuldu.** İlkeler (yapay zekâ §1–2):
   - Ajan arzı tasarlar (ilan, şartname, arazi arzı), talibi seçmez.
   - Öneri doğrulayıcıdan geçer ve sunucu damgalı komut olur.
   - Yedek çekirdektedir; oyun ajansız da tam çalışır, sunucu kapalıyken ve yetişmede kural yedeği işler.
   - Haber LLM'siz kalır.
   - Ajan Alfa-0'ın kritik yolunda değildir; maliyet bağlayıcı değildir (10 bin oyuncuda ayda ≈$92–161).
9. **"Para alanı taşıyan sistem ya da ajan komutu yok" ilkesi iki raporda bağımsız olarak çıktı.**
   - Ajanın `kamu_karar` komutunda para alanı yok.
   - Görev ödülü `sistem_odul {kavram}` tutarı çekirdekteki sürümlü tablodan okur.

   Bu ortak ilke olarak kilitlenmeli (G4).
10. **Mal kimlikleri doğmadan düzeltilmeli.** `tekstil` → `kumas` + `hazir_giyim`; `ekmek` ve `sekerleme` ayrı mal; `findik_urunu` fiyatı 240. Commit edilmemiş `packages/veri/icerik/il-imza.json` `ileride` listesi **`tekstil`** taşıyor ve `sarkuteri`'yi mal kimliği olarak kullanıyor (dikey raporda şarküteri bir dükkân türü). Bu dosya commit edilmeden ve ilk `icerik.json` sürümünden önce kimlik listesi kilitlenmeli (dikey §9.2, §9.4).

---

## 1. Dört raporun özeti (10'ar madde)

### 1.1 Dikey zincirler ve perakende ([rapor](dikey-zincirler-ve-perakende.md))

1. Sahibin iki örneğindeki mallar katalogda yok (ekmek, boksit, alümina, alüminyum, cam, pencere, hazır giyim, şekerleme); "kendi dükkânım" için yapı, raf, fiyat ve konum tanımı da yok.
2. **7 zincir + pencere kavşağı:** ekmek, alüminyum→doğrama, cam, çelik→doğrama, süt→şarküteri, pamuk→giyim, fındık→şekerleme. Katma değer her kademede 1,23–1,48; oranlar betikle üretildi.
3. **Yeni üretim yapısı yok.** 19 yeni yöntem mevcut yapılara eklenir (Gıda fabrikası, Çelikhane, Parça fabrikası, maden, Tarla, Ahır); tek yeni yapı **Dükkân**.
4. **Kanal ekonomisi** (R = referans fiyat):

   | Kanal | Net fiyat |
   |---|---|
   | NPC pazar | 0,891 R |
   | Hal | ≈0,94 R |
   | Zincir market toptan | 0,92 R |
   | Kendi dükkân | 1,00–1,12 R |
   | Sözleşme | 0,95–1,05 R |
   | Kamu ihalesi | tavan 1,10 R (ithalat paritesi) |

5. **Perakende modeli:** tek `dukkan` ek yapısı; altı tür (fırın, bakkal, şarküteri, şekerci, yapı market, giyim) veridir. Raf = çeşit yuvası (S4/M6/L8); kasa kapasitesi S90/M198/L324; fiyatı oyuncu belirler ([0,7; 1,4] R, otomatik önayar). canli-dunya §4.1 çekim formülü aynen kullanılır; tür uyumu, konum ve kasa eklenir.
6. **Stok il düğümündedir;** il içi taşıma bedavadır, dükkân yalnız talep konumudur. İller arası lojistik gerçek bir karardır (örnek: boksit için 20 konvoy ≈ ₺12.400).
7. Makas Alfa-0'da ara kademe uzmanlığını öldürür; sözleşme fiyatı R'de dengelenince entegre zincirle uzmanların toplamı eşitlenir. Fark fiyat dışı kuvvetlerden gelir: kümelenme, hasat dalgası, risk, dikkat, sermaye.
8. **Topoloji ilkesi:**
   - çizgi zincir (ekmek, süt, fındık, pamuk) entegrasyona,
   - ağ zinciri (pencere; 3 il, 15–16 hücre) uzmanlaşma ve ticarete,
   - çeşit dükkânı (bakkal, yapı market) çok tedarikçiye

   iter.
9. **Döngü:** üç döngü (gıda, inşaat, enerji) ve 6 Fırsat Kartı tetiği. Dükkânın kendi inşaatı 4 pencere ister; pencere ilk günden NPC'den ithal alınabilir (≈₺1.600).
10. **Alfa-0:** 4 zincir (ekmek, cam→pencere, süt→şarküteri, fındık→şekerci), mevcut 14 mala 9 yeni mal (toplam 23); alüminyum isteğe bağlı (ithal boksit), pamuk Alfa-1. Üretim yapmayan dükkânın ithal mal alıp perakende satması **meşru ticaret oyunu** sayıldı; marj hane bütçesiyle sınırlı, ZP11 ölçütüyle izlenir. Geri dönüşü zor 13 karar.

### 1.2 Kamu ve kamu arazileri ([rapor](kamu-ve-kamu-arazileri.md))

1. **Kamu bir NPC firma değildir; kurallar ve kasalar ağıdır.** Kamu arsası satılmaz, yalnız süreli hak verilir; hakkın bitişi "zorla el değiştirme" sayılmaz.
2. K-2'nin "%4"ü yanlış birimdedir. Önerilen parçalar: Mahalle Paketi 20 hücre, %4 hazine rezervi, ilçe merkezi 8–12 hücre, kıyı şeridi 2 hücre. Yoğun kentte toplam ≈%8–9.
3. **Ayrılma zamanı halka açılışıdır:** oran, halkanın ilk arsası satılmadan dondurulur. Bugünkü istemci türetmesi bu kurala ve K-3'e uymuyor, taşınmalıdır (T8).
4. **Beş hak türü, tek makine:** kira, kamu üst hakkı, tahsis, KÖİ (yap-işlet-devret esinli), sanayi tahsisi. Tek `hak?` alanı var; sözleşme sürümü imzayla donar.
5. **Süre sonu dönüşü 7 kuralla baştan kabul edilir:**
   - Sözleşme Kartı,
   - teklif = rıza komutu,
   - şartlar donar,
   - kapalı fesih listesi,
   - kamu ihtiyacı feshi yok,
   - T−14 / T−7 / T+3 takvimi,
   - ilanda tek dönüş türü: söküm (D1), bedelsiz devir (D2) ya da tazminatlı devir (D3).
6. **Hareketsizlik:** yeni istisna açılmaz; 90. günde **hak + yapı** açık artırmaya çıkar. Kamu arsasının kendisi asla açık artırılmaz.
7. **Tek ihale motoru, dört profil:** M (yalnız fiyat), Y (%70 fiyat / %20 süre / %10 sicil), T (artırma), K (KÖİ). Teklif sunucu-mühürlüdür; ilan ödenek rezervi ister.
8. **Bütçe kapalı döngüdür:**
   - kaynaklar yalnız yanan para (ithalat makasının %20'si, ithalat komisyonunun %50'si), arazi vergisi payı ve hak bedelleri;
   - oyuncuya akan ≤%50;
   - NPC nüfus vergisi Alfa-0'da yok;
   - kamu tavanı = ithalat paritesi.
9. **"Sıkıcı bürokrasi değil":** zarf açılışı anı, avantajsız unvan ve kitabe, yeni esnaf ihalesi (kontenjanın ≥%30'u yeni hesaplara), okul yemeği siparişiyle zincirin kapanması, imece ile ihalenin tek Proje Kartı'nda birleşmesi, haritada Kamu katmanı.
10. **Alfa-0 hafif sürüm:** kamu arsası verisi, sabit fiyatlı kamu siparişi, Kamu Kasası açık defteri, `NpcAlici{tur:"kamu"}`. Hak, ihale ve ajan yok; yalnız şema alanları ayrılır. Mevzuat 9 kanunun tam metninden doğrulandı. Geri dönüşü zor 12 karar (KK-1…KK-12).

### 1.3 Yapay zekâ ajanlı kamu ([rapor](yapay-zeka-kamu-ajanlari.md))

1. **Karar Köprüsü:** ajan çekirdek dışında ayrı bir süreçtir. Önerisi doğrulayıcıdan geçer (şema, yetki, bütçe, bant, ritim, rekabet, adalet, tekrar) ve sunucu damgalı `kamu_karar` komutu olur. Yeniden oynatma LLM çağırmaz.
2. **Yedek çekirdektedir:** çekirdek gündemi açar ve zaman aşımı olayını planlar; ajan gelmez ya da reddedilirse kural yedeği uygulanır. Sunucu kapalıyken ve yetişme sırasında ajan çağrılmaz.
3. **"Ajan arz tasarlar, talip seçmez."** Ajan şartnameyi, arazi arzını, makam boşken NPC kaymakam/vali politikasını ve olay seçimini önerir. Kazananı, kiracıyı, ödemeyi, cezayı ve parseli kural belirler. Ajana hiç verilmeyenler: para basma, parsel, oyuncuya özel avantaj, kalıcı ceza, makam, savaş.
4. **Haber çelişkisinin çözümü:** haber şablon + olgu defteri olarak kalır. Ajanın kısa, kimliksiz gerekçe notu haber değil "kamu belgesi"dir.
5. **Güvenlik:**
   - oyuncu serbest metni ajana hiç girmez;
   - asıl koruma yetki sınırıdır;
   - kör değerlendirme ve permütasyon uygulanır;
   - not süzgeci ve kırmızı takım var;
   - tarafsızlık ölçütleri M1–M6;
   - itiraz 4 kademelidir;
   - ajana kişisel veri gitmez (KVKK).
6. **Maliyet** (tam yığın, aylık): 200 oyuncu $9–28, 1.000 oyuncu $33–102, 10 bin oyuncu $131–400. Bülten yoksa %30 daha az; Alfa-0 gölge modu $1–4. Maliyet bağlayıcı değildir.
7. **Anahtar modeli:**
   - A: sunucuda tek anahtar (ayrı Workspace, harcama tavanı, devre kesici) **seçili**;
   - B: oyuncunun anahtarı sunucuda **reddedildi**;
   - C: oyuncunun anahtarı yalnız kendi istemcisinde, Alfa-1+ **izinli**;
   - D: "bilgisayardaki" ajan, yönetici oturumu, Alfa-0 geliştirme yolu.
8. **Teknik:** strict JSON şema, ayrık enum, tek atış, araç yok, zorlanmış `tool_choice` yok, sabit effort, max_tokens aşılırsa yedek, Batch penceresi 180 dk.
9. **Alfa-0'da yapılacak:** altyapı (gündem, yedek, `kamu_karar`, kamu defteri, `kamu-ajani` rolü) ve botlu dünyada gölge mod. İlk canlı görev yalnız ihale gerekçesidir. Kazanan kuralı Alfa-0'da en düşük fiyat, Alfa-1'de N4.
10. **Sahip yönergesiyle uyum** seçenek olarak sunuldu:
    - (b) kazanan %100 kural (önerilen),
    - (b+) ajan kör bir teknik puan verir (≤%10–20),
    - (a) ajan kazananı seçer (önerilmez).

    Geri dönüşü zor 12 karar.

### 1.4 Rehber görevler ([rapor](rehber-gorevler.md))

1. **Defter tek nesnedir:**
   - "Bugün" sayfası: Akşam Defteri ve "kaldığın yer";
   - "Sayfalar": açılış, yön, Takvimden ve Rehberlik (Alfa-1).

   Sıra serbest, modal yok, kilit yok; durum oyundan türetilir ve geriye dönük tamamlanır.
2. **Görev = 7 döngü kavramından biri:** ilk üretim, işleme, satış, kendi dükkân, sözleşme, ihale teklifi, komşu ilçe. Ödül kavrama bağlıdır ve bir kez verilir.
3. **Üç zincir** (Tarım T1–T13, Sanayi S1–S11, Pazar P1–P10), iki sürümlüdür: Alfa-0 gerçeği ve sahibin hedef zincirleri. İçerik eksikse kart gizlenir.
4. **Ödül:** toplam ≈₺5.650, tavan ₺8.000 (hibe ve kitin %6,6'sı). Her ödül adım bedelinin ≤%25'i; para payı %42; gözlem ve olay görevleri ödülsüz.
5. **Değişmezler:**
   - ekonomi, ödül ve kilit sistemleri görev durumunu okumaz;
   - ödül yalnız çekirdekten türetilebilen koşula bağlanır;
   - metin şablondur, LLM görev yazmaz.
6. **"Kaldığın yer":** yokluk süresine göre tek öneri verir, yargılamaz (6 sa / 2 gün / 14 gün uyku / 45 gün çürüme / 90 gün açık artırma).
7. **Yön değiştiren oyuncu yeni sayfa açar;** yalnız yeni kavramlar ödüllüdür. Dışlayan teknoloji dalı görev olarak sunulmaz.
8. **Olaylar "Takvimden" sayfasındadır, ödülsüzdür.** Alfa-0 takvimi: hasat, kış hazırlığı, Cumhuriyet Bayramı süsü. Gurbetçi dönemi 15 Haziran 2027'de başlar; dini bayram yalnız hatırlatmadır.
9. **Ölçütler Gö1–Gö10** ve botla zincir erişilebilirlik testi.
10. **Uygulama:**
    - `gorevler.json` + saf değerlendirici + sunucu profil tablosu;
    - ödül `sistem_odul {kavram}`, tutarı çekirdek tablosundan;
    - çekirdekte yalnız `alinanOdul` kümesi;
    - Alfa-0 P0 = 2 S + 4 M.

    Geri dönüşü zor 8 karar (GK-1…GK-8). Ad sözlüğü: rehber görev = Defter kartı, Rehber = mentor etiketi; usta/çırak dili yok.

---

## 2. Çelişkiler ve çözüm önerileri

### 2.1 Bu dalganın raporları arasında

| # | Çelişki | Taraflar | Öneri |
|---|---|---|---|
| Ç1 | **Ajanın metin üretip üretmeyeceği:** yapay zekâ raporunda ≤280 karakterlik kimliksiz gerekçe notu ("kamu belgesi"), kamu raporunda yalnız gerekçe kodu | yapay zekâ §2.5 ↔ kamu §2.2 | **Kod zorunlu, not isteğe bağlı ve bayrakla kapalı başlar.** Alfa-1'de tutanak gerekçe kodlarından şablonla üretilir. Ajan notu, gölge ölçümünde not süzgeci reddi <%5 ise ayrı bayrakla açılır. Not günlüğe girmez, yan tabloda kimliksiz saklanır. İki raporun güvenlik koşulları birlikte sağlanır |
| Ç2 | **Komut biçimi:** `kamu_karar` + gündem + zaman aşımı yedeği ↔ `ihale_ilan` + `kaynak` | yapay zekâ §1.3 ↔ kamu §1.7 | **Tek sistem komutu `kamu_karar` (v1)**; `tur` alanı ihale ilanını, hak ilanını ve politika kademesini ayırır. Oyuncu komutları (`ihale_teklif`, `hak_basvur`, `hak_birak`, `dilekce_ver`, `ihale_itiraz`) kamu raporundaki adlarla ayrı kalır. Ajan mimarisinde yapay zekâ raporu, kamu kurallarında kamu raporu esastır (iki rapor da bunu yazdı) |
| Ç3 | **Hareketsiz oyuncunun kamu hakkı:** "hak düşer, kamuya döner, artırma yok" ↔ "90. günde hak + yapı açık artırmaya çıkar" | yapay zekâ §3 ↔ kamu §1.6 / KK-6 | **Kamu raporu (hak + yapı açık artırma).** Hak sahibinin yapı yatırımı alacak olarak korunur ve docs/11 §7.8 ile aynı merdiven kullanılır. "Hak düşer" yatırımı sıfırlar, "zorla" algısını büyütür. Yapay zekâ raporu §3'ü zaten kamu raporuna bağladı |
| Ç4 | **İhale kazananının adı:** tutanak kimliksiz ("Teklif A/B/C") ↔ sonuç kartında kazananın tabela adı (katılımda rızayla) | yapay zekâ §4.3 ↔ kamu §2.5 / KK-12 | **İkisi birleşir:** saklanan metin hep kimliksizdir. Sonuç kartında ad, render anında `gorunurKimlikRef` (K-8) ve ad anma rızasıyla çözülür. Hukuki görüş (KVKK) her iki raporda da açık |
| Ç5 | **İlk dükkân:** Alfa-0'da Ticaret ofisi köprüsü ↔ Alfa-0'da `dukkan` ek yapısı | rehber GS-1 ↔ dikey §12 R11 | `ilk_dukkan` koşulu `tesisler[tur ∈ {dukkan, ticaret_ofisi}]`. Dükkân Alfa-0'a girerse rehber kartının hedefi dükkândır, Ticaret ofisi yedek yoldur |
| Ç6 | **"API anahtarı" okuması:** (1) sunucu kamu ajanı, (2) oyuncunun Anthropic anahtarı kendi istemcisinde, (3) oyunun oyuncuya verdiği kapsamlı oyun API anahtarı ve `adina` vekilliği | yapay zekâ §5.6 ↔ kamu §2.6 | Sahip sorusu (S2). Üç okuma birbirini dışlamaz; öneri: (1) Alfa-1, (3) v1.5 (aynı kotalar, ayrıcalık yok), (2) ise yalnız (3) varsa anlamlı olur |
| Ç7 | **Ajan maliyet tahminleri farklı** | yapay zekâ §5 ↔ kamu (eski tablo) | Kamu raporu kendi tablosunu kaldırdı; **yapay zekâ raporu §5 esas** |

### 2.2 Önceki raporlarla ve kodla

| # | Çelişki | Kaynak | Öneri |
|---|---|---|---|
| Ö1 | **İhale kazanan kuralı:** "en düşük fiyat, eşitlikte ilk teklif" ↔ "fiyat %70 + süre %20 + portföy %10" | canli-dunya §4.5 ↔ imza N4 | Tek motor, profiller (kamu §3.2). Alfa-0'da ihale yoksa kamu siparişi sabit fiyatlı; Alfa-1 başında Profil M; Profil Y Alfa-1 sonunda ya da v1.5'te. İlgili ağırlıklar veri paketinde (`kamu.ihale.puanlama`) |
| Ö2 | **Commit–reveal** (N4) ↔ sunucu-mühürlü kapalı teklif | imza N4 ↔ kamu T6 | **Sunucu-mühürlü.** Şart: teklifler kapanışa kadar istemciye ve dış günlük görünümüne gitmez. Ayrı bir kriptografik adım gerekmez. Teklif komutunda `v` alanı (K-9) |
| Ö3 | **Kamu ve sipariş fiyat tavanı ref +%15 / +%5–15** ↔ NPC ithalatı ×1,10 (arbitraj) | canli-dunya §4.5, capital-rift esnaf siparişi | **Tavan = ithalat paritesi** (`pazar.ithalatCarpaniPpm`'e bağlı); esnaf siparişi ödülü ≤+%10. İki önceki belge bu yönde düzeltilmeli |
| Ö4 | **Haber LLM'siz** ↔ sahibin çalışma zamanı ajanı | canli-dunya §6.5, §10 karar 4; cesitlilik-yonetim §8.4 ↔ docs/12 §8 | **Çözüldü:** karar kanalı ajan, anlatım kanalı şablon. Haberdeki "LLM yok" kararı korunur; ajan çıktısı doğrulanmış komuttur. Önceki karar yeniden açılmaz |
| Ö5 | **K-2 "%4 + meydan"** yetersiz | imza K-2 ↔ kamu §1.2 | Kamu raporundaki dört parçalı kural; K-2'nin "fazla ayırma yönünde hata" asimetrisi korunur |
| Ö6 | **Kamu arsası yalnız istemcide** (oran %4, 48×48 yapay mahalle, `?kamu=0`) | F4 çalışma ağacı `istemci/src/harita/arsa.ts` ↔ K-2, K-3 | İlk gerçek satıştan önce veri hattı ve çekirdek; `parsel_al` kamu hücresini reddeder. **Geliştirme liderine acil not** (§6) |
| Ö7 | **"NPC Muhtar" ilçe düzeyinde** | canli-dunya §4.5, baslangic §2.2 ↔ imza K-4 | K-4 adları: Muhtar = mahalle, İlçe Başkanı = ilçe, yöneticisiz hâl NPC kaymakam (vali için NPC vali). Bu dalganın üç raporu buna uyarlandı; canli-dunya ve baslangic metinleri sonraki belge güncellemesinde düzeltilmeli |
| Ö8 | **Muhtarlık oyuncuya ait ek yapı** (ilde ≤1, oyuncu arsasında) ↔ meydandaki kamu yapısı | docs/06 §15.3, `parametreler.json` `mulk.ekYapilar.muhtarlik` ↔ imza İ-1, kamu T5 | Muhtarlık meydandaki kamu yapısıdır; bugünkü ek yapı yer tutucudur ve F6'da kamu yapısına dönüşür. Alfa-0'da oyuncunun Muhtarlık kurması kapatılmalı ya da "yer tutucu" etiketiyle sınırlı kalmalı (sahip ve baş lider kararı; S9) |
| Ö9 | **Rehberlik ödülü sistemce basılıyor** (₺4.000 / yeni esnaf) | baslangic §5.4 ↔ K-5 | Görev ödülüyle aynı mekanizma: tutar taşımayan sistem komutu, çekirdekte sürümlü ödül tablosu, tavan ve para arzı panosunda ayrı satır. Para alanı taşıyan komut yok (G4) |
| Ö10 | **"NPC firma" ön alımı** | cesitlilik §6.2(f) ↔ NPC rakip firma yok | Ad `NpcAlici` kaydıdır (bütçeli alıcı, mülk sahibi değil). Belge düzeltmesi |
| Ö11 | **Usta / çırak / kalfa dili** | imza N1 ("Usta Defteri", "Çırak" etiketi) ↔ baslangic T7 | Bu dalga kaçındı (rehber GB-9: Rehberlik sayfası; kamu: "yeni esnaf ihalesi"). İmza N1 de "Rehber / yeni esnaf" diline çekilmeli |
| Ö12 | **Mal kimlikleri:** `tekstil` tek mal, `findik_urunu` ₺190, `sarkuteri` mal kimliği | cesitlilik §4.4 ve §7, `il-imza.json` (commit edilmemiş) ↔ dikey §9.2 | `kumas` + `hazir_giyim`; `findik_urunu` 240; `sarkuteri` ya mal kimliği ya dükkân türü kimliği olmalı (öneri: dükkân türü `sarkuteri`, mal kimliği ileride `sarkuteri_urunu` ya da `et`). İlk `icerik.json` sürümünden ve `il-imza.json` commit'inden önce |
| Ö13 | **Ambar "bozulma ×0,5"** belgede var, kodda yok | docs/11 ↔ docs/06 §15.3 | Hal (N3), soğuk dolap ve ekmek bozulması buna dayanıyor; bozulan mallar (ekmek ve süt ürünleri; dikey) katalogla birlikte ambar bozulma kuralı da çekirdeğe girmeli |
| Ö14 | **Sanayi açılışı 6 hücrelik yurtla çalışmıyor** (Çelikhane için hücre genişletme gerekir) | baslangic Ç2 ↔ rehber §3.4 | Rehber zinciri bunu öğretim olarak kullanıyor ("yer yok, 3 hücre al"). Açık kalabilir; başlangıç sepeti eşitliği ölçümüne bağlı |

---

## 3. Birleşik geri dönüşü zor kararlar (öncelik sırasıyla)

Kaynak kodları: **D** = dikey, **K** = kamu (KK), **Y** = yapay zekâ, **R** = rehber (GK).

### 3.1 Şimdi (F4 hazır arsa satışı, S3 ve serileştirici işleri sürerken)

| # | Karar | Kaynak | Öneri | Neden şimdi |
|---|---|---|---|---|
| **G1** | **Kamu arsası kuralı, yeri ve dondurma zamanı** | K KK-1, Ö5, Ö6 | Mahalle Paketi 20 hücre + %4 hazine rezervi + ilçe merkezi 8–12 hücre + kıyı 2 hücre. Hazır arsa üreticisi paketi ada bölmeden önce çıkarır; oran halkanın ilk satışından önce donar. Kural istemciden veri hattına ve çekirdeğe taşınır (`sinif:"kamu"`, `kamuTur`, `parsel_al` reddi) | Satılan hücre kamu olamaz (tek yönlü kapı); istemci türetmesi sunucuda korunmuyor |
| **G2** | **Kamu varlık kimliği granülaritesi ve kasa eşlemesi** (`k:mahalle`, `k:ilce`, `k:il`) | K KK-3, imza K-1 | Kademeli: meydan, pazar ve park mahalleye; hazine rezervi, kıyı, sanayi rezervi ve ilçe merkezi ilçeye | Günlükteki kimlikler bir kez yazılır |
| **G3** | **Kamu karar günlük şeması** | Y karar 2–3, K KK-10, Ç2 | Tek `kamu_karar` v1: `kaynak` (ajan, kural ya da yönetici), `model`, `istemSurumu`, `semaSurumu`, `girdiOzeti`, `gerekceRef`; metin günlükte yok. Çekirdekte gündem + `kamu_gundem_zaman_asimi` yedeği; PRNG akışı `kamu_*` | Sonradan eklemek eski günlüğün yeniden oynatılmasını bozar (K-9) |
| **G4** | **Para alanı taşıyan sistem ya da ajan komutu yok** (ortak ilke) | R GK-1, Y "asla" listesi, Ö9 | `sistem_odul {kavram}`; tutar, tavan ve "bir kez" kuralı çekirdekteki sürümlü tablodan; çekirdekte `alinanOdul`. Rehberlik ödülü aynı yoldan. Ajan bütçe seçmez | Para arzı bir kez şişerse geri sarılamaz; yönetici jetonu sızsa bile para basılamaz |
| **G5** | **Mal ve yöntem kimlikleri, katalog düzeltmeleri, dizilere yalnız sona ekleme** | D karar 4–5, Ö12 | 9 yeni mal (+4 isteğe bağlı, +4 Alfa-1); `kumas` + `hazir_giyim`; `ekmek` ve `sekerleme` ayrı mal; `alumina` ayrı mal; `findik_urunu` 240; `sarkuteri` çakışması çözülür | Kimlik yayımlanınca kalıcıdır; `il-imza.json` commit edilmek üzere |
| **G6** | **Oyuncu serbest metni ajana girmez; kör değerlendirme** | Y karar 6–7, imza K-13 | Ajan girdisi yalnız tamsayı olgu ve kimliksiz etiket; dilekçe kapalı tür listesi | Enjeksiyon yüzeyi bir kez açılırsa kalıcıdır |
| **G7** | **Kamu kaynaklı her karar için kural yedeği her zaman açık; tek sağlayıcıya bağımlılık yok** | Y karar 12, K "ajan kapatılabilir" bayrağı | Ajan isteğe bağlı bir katmandır; `kamu_ajan_kapali` bayrağı | Ajan zorunlu olursa sağlayıcı kesintisi oyunu kırar; "kapalıyken akar" ilkesi |

### 3.2 Alfa-0 öncesi

| # | Karar | Kaynak | Öneri |
|---|---|---|---|
| **G8** | **Kamu bütçe kaynağı** | K KK-8 | Kapalı döngü: yalnız yanan para (ithalat makası payı %20, ithalat komisyonu payı %50), arazi vergisi payı ve hak bedelleri. NPC nüfus vergisi yok. Oyuncuya akan ≤%50 (28 günlük kayan pencere); ödenek rezervi; geri akış lavabonun ≤%5'i |
| **G9** | **Fiyat tavanı = ithalat paritesi** | K KK-9, Ö3 | Kamu siparişi, ihale ve esnaf siparişi için; parametreye bağlı |
| **G10** | **Görev durumu ve ödül kaydının yeri** | R GK-2…GK-5 | Görev durumu sunucu profilinde, ödül kaydı (`alinanOdul`) çekirdekte. Hiçbir ekonomi sistemi görev durumunu okumaz (testle). Kavram sözlüğü donar; tamamlanma bir kez sağlanınca kalıcıdır (sticky) |
| **G11** | **Perakende dükkânı: tek `dukkan` ek yapısı + tür = veri** | D karar 1, 2, 9 | Raf yuvası `malId` ile; stok il düğümünde; yapı sayısı (Dükkân 19. yapı, hafif sanayi 20.) cesitlilik Q1 ile birlikte |
| **G12** | **Perakende fiyatı oyuncu belirler; para musluğu hane bütçesiyle sınırlı** | D karar 3, 10 | [0,7; 1,4] R bandı + otomatik önayar. Hane bütçesi B + η; ithal mal alıp perakende satmak meşru, ZP11 ile izlenir |
| **G13** | **Alfa-0'da ara kademe uzmanlığı yok (bilinçli)** | D karar 11 | Alfa-1'de P5 sözleşmesiyle açılır; Alfa-0 kimliği: kapalı zincir + kanal seçimi (S5) |
| **G14** | **Ajan anahtar modeli ve bütçe tavanı** | Y karar 4–5 | Sunucuda tek anahtar (ayrı Workspace, harcama tavanı, devre kesici); oyuncu anahtarı sunucuda hiç kullanılmaz. Okuma sahibe sorulur (S2) |
| **G15** | **Tek ihale motoru, profiller, sunucu-mühürlü teklif** | K KK-7, Ö1, Ö2 | Komut şeması `v` alanlı; profil ağırlıkları veri |

### 3.3 Alfa-1 öncesi (hak, ihale ve arsa satışı açılmadan)

| # | Karar | Kaynak | Öneri |
|---|---|---|---|
| **G16** | **Ajanın ihaledeki yetkisi** | Y karar 1, K Q2 | (b) ile başlanır; (b+), M1–M3 ölçümleri 30 gün temiz kalırsa ve sahip onaylarsa açılır; (a) yok (S1) |
| **G17** | **Hak şeması ve sözleşme dondurma** | K KK-4, KK-5, KK-11; arsa Z8 | Tek `hak?` alanı (üst hakkı ve kamu hakkı birleşik). D1/D2/D3 dönüş türleri; kamu ihtiyacı feshi yok; hak hücreleri ≤72 / %25 tavanına sayılır |
| **G18** | **Hareketsiz kamu hakkı** | K KK-6, Ç3 | Hak + yapı açık artırma; kamu arsası asla açık artırılmaz |
| **G19** | **Görünür kimlik ve KVKK** (ihale sonucu, kitabe) | K KK-12, Y karar 8, imza K-8 | Saklanan metin kimliksiz; ad render anında rızayla; hukuki görüş |
| **G20** | **Çekim uzayı** | D karar 7, canli-dunya karar 10 | Alfa-0'da ilçe havuzu + konum çarpanı; Alfa-1'de halka havuzu. Arsa satışından önce kilitlenir |
| **G21** | **İmza kalitesi ilçe tabanlı** | D karar 12, imza K-7 | Kalite tesiste ya da kanalda taşınır, stokta değil |
| **G22** | **Model ve istem sürüm yönetişimi; kurallar yayımlı** | Y karar 9, 11 | Yönetici komutu, ≥14 gün gölge çalıştırma, altın küme; "Kamu El Kitabı" yayımlanır, gizli kural yok |
| **G23** | **Yapı malzemesi talebi yalnız yeni yapıların maliyetine** | D karar 8 | Mevcut 18 yapı değişmez (bölge kipi altınları) |

---

## 4. Alfa-0'a girmesi önerilenler

**Öncelik P0 (Alfa-0 kapısı için gerekli ya da geri dönüşü zor):**

1. **Kamu arsası verisi ve çekirdek kuralı** (G1, G2): veri hattında Mahalle Paketi, rezerv, ilçe merkezi ve kıyı; çekirdekte `sinif:"kamu"`, `k:` sahibi, `parsel_al` reddi; haritada Kamu katmanı. **F4 ilk gerçek satıştan önce.**
2. **Günlük ve şema rezervleri** (G3): `kamu_karar` v1, `kaynak` alanı, `hak?` alanı (boş), PRNG akışı `kamu_*`, gündem ve zaman aşımı yedeği iskeleti. Ajan canlı değil; isteğe bağlı botlu gölge mod (ayda ≈$1–4).
3. **Para güvenliği** (G4, G8, G9): tutar taşımayan `sistem_odul {kavram}` + çekirdek ödül tablosu + `alinanOdul`; Kamu Kasası açık defteri; `NpcAlici{tur:"kamu"}`; fiyat tavanı = ithalat paritesi; para arzı panosunda görev ödülü ve kamu kalemleri.
4. **Kimlik listesi kilidi** (G5): ilk `icerik.json` sürümünden ve `il-imza.json` commit'inden önce.
5. **Ekmek zinciri + Dükkân:** `un`, `ekmek`; `degirmen`, `ekmek_firini` yöntemleri; `dukkan` ek yapısı (fırın ve bakkal türleri, raf yuvası, kasa, fiyat önayarı). **Bağımlılık:** canli-dunya A0-2 yerel pazar kanalı; o yoksa dükkân yalnız NPC pazarına satan bir arayüzden ibarettir (dikey R5).
6. **Cam → pencere (çelik doğrama):** `cam`, `pencere`; `cam_firini`, `celik_dograma`; yapı market türü. Sahibin ikinci örneğinin Alfa-0'da kurulabilen biçimi. Pencere ilk günden NPC ithalatıyla da alınabilir.
7. **Defter (rehber P0):** `gorevler.json`, saf değerlendirici, profil tablosu, Defter arayüzü, 3 zincirin ilk gün bölümü, "kaldığın yer". `ilk_dukkan` koşulu {dukkan, ticaret_ofisi} (Ç5).
8. **Kamu siparişi v0:** sabit fiyatlı, ilk kabul eden alır; mahalle kasası ilanı Muhtar'dan, ilçe kasası ilanı İlçe Başkanlığı'ndan. Okul yemeği, kış yakıtı ve yol malzemesi zinciri kapatır.

**P1 (Alfa-0 içinde, P0'dan sonra):**
- süt → şarküteri ve fındık → şekerci zincirleri (ilgili ilin imzası; fındık Alfa-0 açılışında hasat dönemi dışında);
- Takvimden sayfası ve yön sayfaları (rehber B7, B8);
- Fırsat Kartı zincir tetikleri (dikey §7.2).

**İsteğe bağlı (A0-ops):** alüminyum (ithal boksit, `elektroliz` teknolojisi), çimento.

**Alfa-0'da olmayacaklar:**
- ihale (kamu siparişi sabit fiyatlıdır);
- kamu hakkı, kira ve üst hakkı;
- canlı ajan kararı;
- meclis kartları, dilekçe, itiraz;
- ara kademe uzmanlığı (P5);
- pamuk → giyim;
- Rehberlik sayfası;
- sözleşme ve ihale görevleri (gizli);
- oyuncu ajanı / API anahtarı;
- KÖİ ve sanayi tahsisi.

---

## 5. Sahip için açık sorular

| # | Soru | Önerilen varsayılan |
|---|---|---|
| **S1** | "Kamu ihalesini ajanlar halledecek": ajan yalnız ilan, şartname ve gerekçeyi mi yürütsün (kazanan kural, **b**), kör bir teknik puan da mı versin (**b+**, puanın ≤%10–20'si), yoksa kazananı mı seçsin (**a**)? | (b) ile başla; (b+) ölçümle ve onayla; (a) hayır |
| **S2** | "Bilgisayarda ya da oyuna sunacağımız API anahtarıyla": (1) bizim sunucumuzdaki kamu ajanı mı, (2) oyuncunun kendi yapay zekâ anahtarıyla kendi makinesindeki danışman mı, (3) oyunun oyuncuya verdiği ve oyuncu ajanının vekil olarak teklif verdiği oyun API anahtarı mı? | (1) Alfa-1; (3) v1.5, aynı kotalar ve ayrıcalık yok; geliştirme döneminde "bilgisayardaki" yönetici ajanı |
| **S3** | Yoğun ilçelerde uygun hücrelerin ≈%8–9'u kamu (Mahalle Paketi + rezerv + kıyı) olsun mu? Kıyı şeridi satılmasın mı? | Evet; hata yönü fazla ayırmak |
| **S4** | "Kendi dükkânın ana kanal": perakende primi küçük (pazara göre ≈%3–16), asıl değeri pazar doyunca zinciri kurtarması. Bu denge kabul mü, yoksa daha yüksek bir perakende marjı mı istenir? | Kabul; ZP3 (1,05–1,20) ile ölç |
| **S5** | Alfa-0'da "biri un üretsin, öbürü ekmek" uzmanlaşması kâr etmez (makas yüzünden); Alfa-0 tek oyuncunun kapalı zinciridir, uzmanlaşma Alfa-1'de sözleşmeyle gelir. Kabul mü? | Kabul (alternatif: NPC sanayi alıcısına un ve cam eklemek) |
| **S6** | Üretim yapmayan dükkânın NPC'den ithal alıp perakende satması (marj %8–26) meşru ticaret mi? | Evet; Ticaret yönünün oyunu, ZP11 ile izlenir |
| **S7** | Kamu ihalesini kazananın tabela adı sonuç kartında görünsün mü (teklifte rıza; KVKK hukuki görüşü)? | Evet, render anında rızayla |
| **S8** | 90 gün hareketsiz oyuncunun kamu hakkı ve üzerindeki yapısı açık artırmaya çıksın mı (kamu arsası asla)? | Evet |
| **S9** | Oyuncunun kendi arsasına kurduğu Muhtarlık ek yapısı kaldırılıp Muhtarlık meydandaki kamu yapısı mı olsun? | Evet; F6'da dönüşür |
| **S10** | 90 gün sonra parselini kaybedip dönen oyuncuya "yeniden başlangıç" paketi verilsin mi (hibe yok, yurt var)? | Küçük paket |
| **S11** | Dükkân 19. yapı sayılsın mı ("hafif sanayi tesisi" kararıyla birlikte)? | Evet; hafif sanayi ölçümle |

---

## 6. Baş lidere ve geliştirme liderine notlar

1. **Acil (kod):** `packages/istemci/src/harita/arsa.ts` kamu arsası türetmesi geçicidir ve sunucuda korunmaz. F4 sunucu bağlantısı ve gerçek satış açılmadan önce:
   - çekirdekte `parsel_al` kamu hücresini reddetmeli;
   - kural veri hattına taşınmalı (G1);
   - en azından bu yapılana kadar gerçek satış açılmamalı.
2. **Acil (veri):** commit edilmemiş `packages/veri/icerik/il-imza.json` `ileride` listesinde `tekstil` ve `sarkuteri` mal kimlikleri var. Commit öncesi G5 kararına göre düzenlenmeli ya da "kilitlenmedi" diye işaretlenmeli.
3. **Belge güncellemesi** (karar sonrası):
   - canli-dunya §4.5 tavanı ve ihale kuralı (Ö1, Ö3);
   - "NPC Muhtar" adları (Ö7);
   - cesitlilik §6.2(f) "NPC firma" (Ö10);
   - imza N1 usta/çırak dili (Ö11);
   - baslangic §5.4 rehberlik ödülü kanalı (Ö9);
   - docs/06 §15.3 Muhtarlık ek yapısı (Ö8).
4. Bu dalganın raporları birbirine "esas" bağlantılarıyla yazıldı:
   - kamu kuralları için kamu raporu,
   - ajan mimarisi ve maliyet için yapay zekâ raporu,
   - görev sistemi ve ödül için rehber raporu,
   - zincir, mal ve perakende için dikey rapor.

   Uygulama işleri bu ayrımla dağıtılabilir.

---

## 7. İnceleme yöntemi ve sınırlar

- Her rapor tekrar, çelişki, kanıtsız iddia, mevcut kararlarla çatışma (docs/12 §7–9, docs/11 ek kararlar), sahip ilkeleri ve "geri dönüşü zor kararlar" bölümünün kalitesi açısından okundu. Kod ve parametreler (`parametreler.json` pazar çarpanları, `arsa.ts`, `il-imza.json`) yerinde doğrulandı.
- Tüm sayılar raporlardaki gibi **kalibre edilmemiştir.** Mutlak ₺/sa değerleri mevcut içerik ölçeğine bağlıdır (dikey R1); karar için göreli marjlar esastır.
- Hukuki konular (KVKK md. 9 ve md. 11/1(g), 4734, TMK 826) hukuki görüş gerektirir. Model sağlayıcısı koşulları ve Sonnet 5.5 düşünme ayarı doğrulanmadı (yapay zekâ §10).
