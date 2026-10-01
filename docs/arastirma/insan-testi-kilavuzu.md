# İnsan testi kılavuzu: ilk saat, "sen yokken" dönüşü ve 14 günlük takip (G10, Ar-Ge kısmı)

> **Durum.** 1 Ekim 2026, Ar-Ge A1. Öneridir; kod, parametre ve başka belge değiştirilmedi. Sayıların hepsi **kalibre edilmemiş önerilerdir**. **(doğrulanmadı)** etiketi, birincil kaynakla ya da bu turda koddan teyit edilemeyen bilgiyi gösterir. Kod gerçekleri `dosya:satır` ile verilmiştir; sunucu, ölçüm ve istemci dosyaları bu turda doğrudan okundu, hiçbir test koşulmadı ve hiçbir sunucu başlatılmadı.
>
> **Kimin için.** Oturumları yönetecek **insan** (sahip ya da onun görevlendirdiği kişi) için yazıldı. Ajanlar katılımcıyla konuşmaz; ajanların işi bu kılavuzu, formları ve veri çıkarma isteklerini hazırlamak, sonra anonim sonuçları çözümlemektir.

| Alan | Değer |
|---|---|
| Görev | [G10](../10-gorev-listesi.md) "uçtan uca test (A0-6), dogfood, insan testi kılavuzu" (docs/10 §5A); bu dosya Ar-Ge kısmıdır. O1 ve O2 e2e ile dogfood'u yürütür |
| Çıktı yeri | Sonuç raporu ve anonim ölçüt tablosu `docs/toplanti/3/` altına girer (§9); ham kayıt ve form **depoya girmez** (§8.5) |
| Dayandığı belgeler | [baslangic-ve-ustalik](baslangic-ve-ustalik.md) §2 ve §8 (yolculuk, Y1–Y10) · [rehber-gorevler](rehber-gorevler.md) §3 ve §5 (Defter, Gö1–Gö10) · [donus-deneyimi](donus-deneyimi.md) §2.7, §2.11 ve §6 (dönüş ekranı, Dö1–Dö10) · [H1–H9 tanımları](../olcum/h1-h9-parsel-tanimlari.md) §H4, §H6, §7 · [GDD v1](oyun-tasarim-belgesi-v1.md) §6.5 (A0-11, A0-13, A0-14) · [toplantı notu 1](../13-toplanti-notu-1.md) §2 ve §6 · [KIMLIK.md](../../packages/sunucu/KIMLIK.md) §6 |
| Ekran görüntüleri | [docs/toplanti/2/](../toplanti/2/) (Yerleş, maliyet kartı, Defter, "sen yokken", telefon İşletmem); bu kılavuzdaki ekran tanımları o görüntülerden ve `packages/istemci/src` dosyalarından alındı |

---

## Yönetici özeti (10 madde)

1. **Bu test bir problem bulucudur, kanıt değildir.** 5 kişi, takılma noktalarını, yanlış anlamaları ve duygusal tonu gösterir; yüzdeleri tahmin edemez. Her yüzde eşiği §6'da **kişi sayısına** çevrildi (ör. Y1 ≥%75 = 5 kişiden ≥4). Bir kişi eksikse sonuç "belirsiz" (ikinci tur), iki ya da daha çok kişi eksikse "kaldı" (§0.2). Eşik kaçarsa ne yapılacağı §6.5'te.
2. **Beş profil:** iki strateji oyuncusu (biri Windows masaüstü, biri Android telefon), üç strateji oynamayan (hiç oyun oynamayan iPhone kullanıcısı, strateji dışı oyuncu Windows dizüstü, esnaf ya da çiftçi geçmişli karma cihaz). En az ikisi Alfa-0 illerinde (Kocaeli, Sakarya, Bursa) yaşar: "mahallende başla" iddiası yalnız onlarda sınanır (§1).
3. **Düzen:** gün 0'da 75 dakikalık oturum (10 dk hazırlık + **60 dk oyun** + 5 dk soru), isteğe bağlı 10 dakikalık K1 dönüşü, yaklaşık 24 saat sonra 25 dakikalık K2 dönüşü ("sen yokken"), sonra **12 gün hiç temas yok**, 14. günün sonunda (katılım + 336 saat) pencere kapanır, ertesi gün 20 dakikalık görüşme (§3).
4. **Üç tuzak ve çözümü.** (a) İlk Çiftlik 12 dk'da biter; bu bekleme Y10 ölçütünü (≥5 dk komutsuz) yapısal olarak tetikler: yalnız "boşta ve ne yapacağını bilmeyen" aralıklar sayılır (§6.3). (b) Ertesi gün randevusu D1 ölçütünü (Y4) bozar: D1 "randevusuz" ayrı raporlanır (§6.4). (c) Gözlemli ilk oturum H6 (ii)'yi şişirir: katılımcıların hepsi gözlemde yapı kurar; (ii) "üst sınır" okunur ve gözlemsiz kol Alfa-0 kohortuna bırakılır (§7.5).
5. **Yönetici sesli düşünmeyi ister, hiçbir ekran ögesini adlandırmaz.** Altı basamaklı ipucu merdiveni (L0 sessizlik … L5 kurtarma) ve adım başına zaman sınırı vardır; her ipucu forma yazılır (§4).
6. **Gözlem formu** zaman damgalı satırlardan oluşur: olay kodu, takılma sınıfı (T1–T7), yanlış anlama sınıfı (YA1–YA9), duygu kodu, ipucu düzeyi; doldurulmuş örnek ve oturum sonu anketi dahil (§5).
7. **Sunucu verisi denetlendi.** Katılım zamanı ve ilk yapı komutunun **zamanı** günlükte var; ama günlük satırı **kabul edildi mi** bilgisini taşımaz (başarısız komutlar da günlüğe girer, `packages/sunucu/test/basarisiz-gunluk.test.ts:1`). Bu yüzden H6 (ii) için günlüğü baştan oynatıp sonuç kaydeden bir çevrimdışı betik gerekir (İ1); oturum geçmişi hiç tutulmadığı için D1/D7 için de bir istek var (İ2). İstekler K2 ve O2'ye iletilmek üzere §7.2'de (lider iletir).
8. **Başarı ölçütleri GDD §6.5 ile eşlendi:** A0-14 (ilk satış, kart atlama), A0-13 (özet 12 sn, atlama, öneri tıklama), A0-11 (ilk dükkân ≤36 sa), H4 ön denemesi (≥4/5 doğru ve ≤60 sn). Y3 ve Y9 bu sürümde ölçülemez; Y8'in "Atla" tanımı için bugünkü Defter ekranında **Atla düğmesi yok** (`packages/istemci/src/harita/defter.ts`).
9. **KVKK:** takma kod (K1…K5), en az veri, ses ve ekran kaydı için ayrı açık rıza, kayıtlar ≤30 günde silinir, eşleme tablosu ayrı ve şifreli, **depoya kişisel veri girmez**; rıza metni taslağı §8.6'da. Hukuki görüş alınmadı (K34, A1-6): ilgili yerler **(doğrulanmadı)**.
10. **Katılımcı havuzu tek kullanımlıktır.** İlk saati görmüş biri bir daha "yeni oyuncu" olamaz. Bu yüzden test tarihi G1, G3, G5, G9 ve pilot oturumdan **sonra** seçilir; yarım sürümle 5 kişi harcanmaz (§2.1, §10).

---

## 0. Çerçeve

### 0.1 Bu test neye cevap verir, neye vermez

| Cevap verir | Cevap vermez |
|---|---|
| İlk saatte nerede, neden takılındığı ve ne yanlış anlaşıldığı (kalitatif, yüksek verim) | **Eğlence ve tutundurma**: simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz ([00 R5](../00-vizyon-ve-kararlar.md)); D1/D7 yalnız gözlemdir |
| Yerleş, maliyet kartı, Esnaf Defteri ve "sen yokken" ekranının anlaşılırlığı | Denge (A2'nin bot ölçümü), yük (O2), çok oyunculu dinamik (5 kişi aynı ilçede seyrek) |
| Süreler: adım başına, bekleme anları, ekranda okuma | Erişilebilirlik temsili: 5 kişi renk körlüğü, ekran okuyucu gibi ihtiyaçları kapsamaz; **ayrı tur** gerekir |
| Duygusal ton: "hayırlı olsun" metinleri sıcak mı, baskıcı mı; "sen yokken" suçluluk yaratıyor mu | Yürüyüş (L4): isteğe bağlıdır ([12 §14](../12-yon-taslagi.md) S4-9), kapsam dışıdır; bulursa keşif olarak not edilir |

**Yönetilen oturum iyimserdir.** Gözlem altındaki oyuncu daha dikkatlidir ve "iyi oyuncu" olmak ister (Hawthorne etkisi). Bu yüzden: gözlemli testte **geçen** bir ölçüt gözlemsiz geçeceği anlamına gelmez (üst sınır tahmini); gözlemli testte **kalan** bir ölçüt kesin bir sorundur. Raporda her ölçüt bu yönde okunur.

**5 kullanıcı kuralı.** "5 kişi sorunların büyük kısmını bulur" sezgisi yaygındır (Nielsen ve Landauer; sayı tahmini ≈%85) **(doğrulanmadı: bu turda kaynak okunmadı)**; yalnız aynı sorunun herkeste aynı olasılıkla çıktığını varsayar. Burada profiller kasıtlı karışık olduğundan sorunlar profile göre değişir; bu yüzden rapor sorunu **kaç kişide ve hangi profillerde** çıktığıyla yazar (§9).

### 0.2 n=5 okuma kuralı

Her "≥%X" eşiği için en az gereken kişi sayısı `k = yukarı yuvarla(X × 5)`:

| Sonuç | Kural |
|---|---|
| **Geçti** | ölçülebilen kişi sayısı ≥ k |
| **Belirsiz** | k'den **bir** kişi eksik: sonuç tek kişiye bağlı; düzeltmeden sonra ikinci tur (3 yeni kişi) |
| **Kaldı** | k'den **iki ya da daha çok** kişi eksik |
| **Ölçülmedi** | veri yok ya da <4 kişi ölçülebildi (ölçüt başına belirtilir); neden açık yazılır |

"≤%X" eşiklerinde `k_maks = aşağı yuvarla(X × 5)`. Hiçbir ölçüt Alfa-0 kapısı değildir: Y1–Y10 "kapı değil, hipotez" ([baslangic §8.2](baslangic-ve-ustalik.md)); A0-13 ve A0-14 "önerilen eklemelerdir, baş lider onayı ister" ([GDD §6.5](oyun-tasarim-belgesi-v1.md)); H6 (ii) bot ölçümünde karara girmez ([H1–H9 §H6](../olcum/h1-h9-parsel-tanimlari.md)).

### 0.3 Mevcut belgelere ne ekliyoruz (tekrar yok)

| Belge | Orada olan | Bu kılavuzun eklediği |
|---|---|---|
| [baslangic §2.2–§2.3](baslangic-ve-ustalik.md) | Hedef süreli yolculuk tablosu | Gerçek zamanlı çizelge, 12 dk inşa beklemesi için protokol, gözlem noktaları, bağımlılık sütunu (§3) |
| [baslangic §8.2](baslangic-ve-ustalik.md) | Y1–Y10 tanımı ve yüzde hedefi | Kişi karşılığı, **işlemselleştirme** (Y10, Y4, Y8), sunucu veri kaynağı (§6) |
| [rehber-gorevler §5](rehber-gorevler.md) | Gö1–Gö10 | A0-14'e eşleme; Gö8 için ölçüm yöntemi |
| [donus-deneyimi §2.11, §6](donus-deneyimi.md) | 3 dönüş senaryosu, Dö1–Dö10 | Gerçek yokluk bandı (K1/K2) ile oturum tasarımı; ekran kaydından okuma süresi ölçümü |
| [H1–H9 §H6, §7](../olcum/h1-h9-parsel-tanimlari.md) | (ii) "insan testi gerekli" | (ii) için insan tanımı, veri çıkarma, (i) ile birlikte rapor (§7) |
| [toplantı notu 1 §2](../13-toplanti-notu-1.md) | "14 günde ilk yapı koşulu bot ölçeğinde bilgisiz; insan testi gerekli" | Düzen, sınırlar ve gözlemsiz kolun neden gerektiği |

---

## 1. Katılımcılar: hedef profiller ve işe alım

### 1.1 Hedef profil matrisi

| Kod | Profil | Cihaz ve işletim sistemi | İkamet | Hangi riski sınar |
|---|---|---|---|---|
| **K1** | **Deneyimli strateji oyuncusu**: son 12 ayda Civilization, Anno, Factorio, Cities Skylines, Football Manager ya da benzeri ≥50 saat | Masaüstü, **Windows** (Chrome ya da Edge) | Fark etmez | "Çok basit ya da fazla yönlendirici" tepkisi; ayrılmış hücre ve ayak izi kurallarını anlama; sakin görselin derinlik beklentisiyle çatışması |
| **K2** | **Mobil strateji ya da tycoon oyuncusu**: Clash of Clans, Hay Day, Township, idle tycoon türü; ana oyun cihazı telefon | **Android telefon** (Chrome) | Fark etmez | Telefon düzeni (alt panel, maliyet kartı); "ilk makine 30 sn" beklentisi ([baslangic §1](baslangic-ve-ustalik.md) mobil tycoon satırı) ile 12 dk inşa beklemesi |
| **K3** | **Hiç oyun oynamayan ya da yılda birkaç kez oynayan**, 45 yaş üstü, telefon kullanıcısı | **iPhone** (Safari) | Fark etmez | Kavram sözlüğü (hücre, hibe, ayrılmış hücre, hazine); "oyun mu, uygulama mı" kafa karışıklığı; harita ve küre jestleri; 3B küre ve Safari uyumu |
| **K4** | **Strateji dışı oyuncu** (FPS, MOBA, spor ya da kart oyunları), 18–29 yaş | **Windows dizüstü** (dokunmatik yüzey) | **Alfa-0 ilinde** | "Mahallende başla": kendi ilçesini bulma ve duygusal tepki; dokunmatik yüzey ve fare olmadan harita yönelimi |
| **K5** | **Strateji oynamayan, gerçek hayatta esnaf, çiftçi ya da küçük işletme sahibi** ya da muhasebe ve ticaret geçmişli | **Karma** (telefon ve masaüstü; oturumu kendi seçtiği cihazda yapar) | **Alfa-0 ilinde** | "Oyun > gerçekçilik" ([GDD S8](oyun-tasarim-belgesi-v1.md)): fiyat, maliyet ve ticaret mantığını gerçek hayatla kıyaslama; ilk satışın anlamlı bulunması |

Dağılım: strateji oynayan 2 (K1, K2), oynamayan 3 (K3, K4, K5); telefon ana cihaz 2 (K2, K3), masaüstü ya da dizüstü 2 (K1, K4), karma 1 (K5); **Windows en az 2** (K1, K4; K5 de Windows seçerse 3); iOS 1 (K3); Alfa-0 ilinde yaşayan 2 (K4, K5). Yaş bandı hedefi: 18–29, 30–44, 45+ bantlarının her birinde en az 1 kişi. Cinsiyet ve kesin yaş **sorulmaz** (§8.2); işe alım dengesi gözle gözetilir, kayda geçmez.

### 1.2 Dahil ve hariç ölçütleri

| Dahil | Hariç |
|---|---|
| 18 yaşını doldurmuş, Türkçeyi akıcı okur | Geliştirme ekibi, Ar-Ge ajanları ile çalışan insanlar, ve **yakın akrabaları ve arkadaşları** (yakın bağ yargısız geri bildirimi bozar) |
| Oturum başına kesintisiz 75 dakikayı, 25 dakikayı ve 20 dakikayı ayırabilir | Oyunu daha önce görmüş, tasarım belgelerini okumuş ya da önceki bir testte yer almış |
| Kendi cihazını kullanabilir ya da test cihazını rahatça kullanır | Oyun sektörü çalışanı, UX araştırmacısı, oyun gazetecisi (uzman önyargısı) |
| Ses ve ekran kaydına açık rıza verebilir (§8.3); **vermezse** katılmaz, notla devam edilmez | Capital Rift'i ≥10 saat oynamış kişi: karşılaştırma önyargısı; en çok bir kişi ve ayrı turda, ayrı raporlanır |

### 1.3 Tarama anketi (7 soru; yalnız bunlar toplanır)

1. Yaş bandı: 18–29, 30–44, 45 ve üstü.
2. Telefonunuz: Android, iPhone, ikisi de değil. Bilgisayarınız: Windows, macOS, yok.
3. Son 12 ayda hangi oyun türlerini oynadınız? (çoklu; strateji, iş simülasyonu, kart, spor, atıcı, bulmaca, mobil idle, hiçbiri)
4. Strateji, yönetim ya da iş simülasyonu oyunlarına haftada kaç saat ayırırsınız? (hiç, 1'den az, 1–5, 5'ten çok)
5. Yaşadığınız il: Kocaeli, Sakarya, Bursa, başka.
6. Mesleğiniz ya da geçmişiniz esnaflık, çiftçilik, küçük işletme ya da muhasebe ile ilgili mi? (evet, hayır)
7. Önerilen üç oturumun saatleri uygun mu? (evet, hayır; uygunsa iletişim yolu)

**Sağlık, engel, renk körlüğü, gelir, cinsiyet sorulmaz.** Sağlık verisi "özel nitelikli kişisel veri" sayılabilir **(doğrulanmadı: hukuki görüş yok)**; en az veri ilkesi gereği 5 kişilik testte hiç toplanmaz. Erişilebilirlik için ayrı, rızayla yürütülen bir tur planlanır (§11 S9).

### 1.4 Yedek, tek kullanım ve değiştirme

| Kural | Gerekçe |
|---|---|
| **7 kişi çağrılır, ilk 5 uygun olan alınır**; yedek ikisi aynı profil hücresinden seçilir (ör. ikinci Android kullanıcısı) | Gelmeme ve vazgeçme payı; profil dengesi bozulmaz |
| **Katılımcı tek kullanımlıktır** | İlk saati görmüş kişi bir daha yeni oyuncu olamaz; ikinci tur için **yeni 3 kişi** çağrılır |
| Sonuç görüldükten sonra profil dengesi için **kişi eklenmez ya da çıkarılmaz** | Seçim yanlılığı (sonucu beğenmeyince yeni kişi çağırma) |
| Oturum 1'den sonra çekilen kişi sayılır (veri rıza geri alınırsa silinir) ve yedekle **yerine** konmaz; "n=4" yazılır | Ölçüt kuralları §0.2 yeniden hesaplanır |
| **Pilot oturum** (K0): ekipten biri (oyunu bilen) protokolü deneme amaçlı koşar; sayıya girmez | Form, kayıt, zaman sınırı, ipucu merdiveni ve veri çıkarma betiği burada kırılır, katılımcıda değil |

### 1.5 Teşekkür ve zaman bütçesi

Teşekkür **sabittir** ve sonuca ya da tamamlanan göreve bağlı değildir (aksi hâlde "ödülü kazanmak için" yapılan davranış ölçüme girer). Tutar ve biçim sahip kararıdır (§11 S5). Katılımcıya toplam zaman bütçesi baştan söylenir: ≈75 dk + 25 dk + 20 dk + (isteğe bağlı 10 dk).

---

## 2. Test sürümü ve ortam

### 2.1 Test tarihi için ön koşullar (kapı listesi)

Test sürümü, bu listede **zorunlu** işaretli maddeler kapanmadan başlamaz: katılımcı havuzu tek kullanımlıktır (§1.4). Sahip sütunu [14 §Sprint A0-02](../14-takim-modeli.md) görev dağılımına göredir.

| # | Koşul | Zorunlu mu | Sahip | Kanıt ve bugünkü durum |
|---|---|---|---|---|
| Ö1 | **G1 istemci kusur turu** bitti: 8 kusur kapalı, tek para biçimi `1.234 ₺` | Evet | T1, T2, K1 | Ekran görüntülerinde Defter ödülleri hâlâ `₺500` ve `₺8.000` (`packages/istemci/src/harita/defter.ts:77`), üst çubukta `35.749 ₺`: iki biçim karışık. Maliyet kartını Defter bildirimi örtüyor ([05b](../toplanti/2/05b-maliyet-karti-acik-masaustu.png)) |
| Ö2 | **G3 arsa ızgarası:** Yerleş'teki 3 ilçenin üçü de oynanabilir | Evet | O3 | Bugün Gemlik ve Körfez "Arsa ızgarası yakında: yalnız gezebilirsin" der ve düğme "İlçeyi gez"e döner (`packages/istemci/src/arayuz/yerles-ekrani.ts:89,119`; [04](../toplanti/2/04-yerles-acik-masaustu.png)). Katılımcı 3 karttan 2'sinde başlayamıyorsa "3 ilçe seç" deneyi anlamsızdır |
| Ö3 | **G5 e-posta bağlantısıyla giriş** ve **G9 giriş ekranı** | Evet (geçici olarak test kimliği kabul edilir, bkz. §2.3) | K2, K1, T1 | G5 yapılacak ([10 §5A](../10-gorev-listesi.md)); `--uretim` altında geliştirme kimliği kapalıdır ([KIMLIK.md §3](../../packages/sunucu/KIMLIK.md); sahip kararı [12 §14 A-1](../12-yon-taslagi.md)) |
| Ö4 | **G2 yükseltme formu** `ekHucreler` gönderir | Hayır; yoksa BK-9 olarak işaretlenir | K1 | S → M yükseltmesi ek hücre isteyen yapıda reddedilir ([13 §5](../13-toplanti-notu-1.md)) |
| Ö5 | **G6, G7, G9** (ekmek zinciri, yerel pazar kanalı ve dükkân S, dükkân paneli) | **A0-11 için evet**; diğer ölçütler için hayır | K3, T3, K1 | Bugün Defter'de `ilk_dukkan` yer tutucudur ve `etkin: false` gelir (`packages/sunucu/src/odul/dedektor.ts`, README "Esnaf Defteri"). G7+G9 yoksa A0-11 "ölçülmedi" |
| Ö6 | **G8** (cam → pencere, yapı market) | Hayır | K3 | Yalnız "yapı market" türü ister; A0-11'i bloke etmez (bakkal ve fırın yeter) |
| Ö7 | **Öneri motoru (B7)** "sen yokken" ekranında | A0-13 öneri ölçütleri için evet | K1, K3 | Bugün `oneri: null` ([`packages/istemci/src/harita/donus-ekrani.ts:171`](../../packages/istemci/src/harita/donus-ekrani.ts); sunucu README D1). Olmadan Dö4 ve Gö8 ölçülmez; yalnız "Git" bağlantısı gözlenir |
| Ö8 | **Dikkat paneli, rozetler ve bina paneli** (E1-G10 / S7, E21-G8) | H4 ön denemesi için evet | K1, T1 | S7 "Devam ediyor" ([10](../10-gorev-listesi.md)); E21-G8 "Yapılacak" |
| Ö9 | **Kapı yeşil:** `pnpm kontrol` temiz kopyada; masaüstü ve telefon e2e yeşil | Evet | O1, O2 | G10'un e2e kısmı |
| Ö10 | **Pilot oturum** (K0) bitti; form, kayıt, merdiven ve veri çıkarma betiği denendi | Evet | A1 (kılavuz), yönetici | §1.4 |
| Ö11 | **Test sürümü dondu:** tek commit, tek dünya tohumu, oturumlar boyunca değişmez | Evet | O1 | Sürüm değişirse önceki oturumlar karşılaştırılamaz; kritik düzeltme olursa ikinci tur sayılır (§10 GZ-1) |
| Ö12 | **Sunucu veri çıkarma** (İ1 çevrimdışı oynatma betiği, İ2 oturum olayı) hazır ve pilotta denendi | H6 (ii) ve Y4 için evet | K2, O2 | §7.2; bugün yok |
| Ö13 | **Hukuki görüş** alındı ya da sahip, riski bilerek, rıza metnini onayladı | Evet | Sahip | K34, A1-6; **(doğrulanmadı)** |

### 2.2 Adım ve bağımlılık matrisi

Her oturum adımının hangi bitmemiş işe bağlı olduğu ve hangi ölçüte beslediği. Adımların tanımı §3'tedir.

| Adım | Ad | Bitmemiş bağımlılık | Besleyen ölçüt |
|---|---|---|---|
| S1.1 | Giriş | **G5**, **G9** (giriş ekranı); geçici: test kimliği (§2.3) | Y10 (bekleme), süre |
| S1.2 | Yerleş ve "Burada başla" | **G3**, G1 | H6 (i), YA1 |
| S1.3 | Arsa: yurt ve ayrılmış hücre | G1 (kamu arsası ve biçim) | H6 (i), YA3 |
| S1.4 | İlk yapı | G1 (para biçimi, bildirim örtmesi) | **Y1**, H6 (ii), YA2 |
| S1.5 | İnşa bekleme (12 dk) | yok (kodda) | **Y10**, duygu |
| S1.6 | İlk satış | yok (yerel NPC satışı kodda); B-6 oran emri sunumu | **Y2**, A0-14 |
| S1.7 | Esnaf Defteri | yok (kodda); `ilk_dukkan` için **G7+G9** | Y8, A0-14, YA6 |
| S1.8 | Serbest keşif ve ikinci karar | G2 (yükseltme), G6/G7/G8 (yeni zincir ve dükkân) | Y5, Y6, A0-11 |
| S1.9 | Çıkış | yok | Y4 (G1 kaydı) |
| S1b | K1 dönüşü (1–6 sa) | D1–D3 (kodda) | Dö1 (kırılım), duygu |
| S2.2 | "Sen yokken" ekranı | D1–D3 (kodda); **B7 öneri yok** | Dö2, Dö3, **A0-13** |
| S2.3 | İlk 60 sn | Ö7 (öneri) | Dö4, Gö8 |
| S2.4 | Okuma görevleri | **E1-G10 (S7)**, **E21-G8** | **H4 ön** |
| S2.5 | Yön değiştirme sorusu | `parsel_birak`, `insaat_iptal` arayüzü | Y6 |
| G2–G14 | Sessiz dönem | İ1, İ2 (veri) | H6 (ii), Y4 D7, A0-11 |

### 2.3 Test dünyası

| Konu | Öneri | Gerekçe |
|---|---|---|
| **Dünya** | Üretim dünyasından **ayrı, atılabilir** bir dünya (staging); test bitince dünya ve test hesapları silinir | Üretimde yeni kimlik yoktur ve test dünyası Alfa-0 ekonomisini kirletmemeli; silme KVKK'yı basitleştirir (§8) |
| **Saat** | **1:1 gerçek zaman**; hızlandırma yok | İnşa bekleme, K2 bandı ve 14 gün gerçek akmalı; bekleme deneyimi test konusudur ([00 §3.1](../00-vizyon-ve-kararlar.md): insan testi 1x'te yapılır) |
| **Harita** | Alfa-0 ilçeleri; Gebze'nin (bugünkü tek hazır ilçe) yanında Gemlik ve Körfez G3 sonrası | Ö2 |
| **Emsal** | Katılımcıların ilçelerinde **üreten bot sahipler** bulunur (en az 5, ilçe başına) | H6'nın Y7 koşulu "ilçe emsal medyanı" ister; üreten emsal yoksa Y7 **ölçülemez** olur ([H1–H9 §H6](../olcum/h1-h9-parsel-tanimlari.md) emsal kuralı) |
| **Yaş** | Seçenek A: **taze dünya** (gün 1); seçenek B: **60 günlük bot dünyası** (anlık görüntüden). K4 ve K5 (kendi ilçesini seçenler) için B önerilir | H6 "geç katılan"ı test eder; B için anlık görüntü ve dünya yaşlandırma aracı gerekir **(doğrulanmadı: araç var mı bilinmiyor; §11 S3)** |
| **E-posta ve bildirim** | Oyundan çıkan **hiçbir** e-posta ya da bildirim açık olmaz (yalnız giriş bağlantısı) | Hareketsizlik uyarısı varsayılan açıktır ([12 §14 S4-5](../12-yon-taslagi.md)); açık kalırsa G7 ve G14 dönüşü "hatırlatılmış" olur ve D7 ölçütü bozulur |
| **Eşkıya ve askeri** | Bayrak kapalı (`askeri.eskiya.etkin`) | Test kapsamı dışı; baskın katılımcının dönüş özetini kirletir |
| **Giriş** | Ö3 yoksa: **kişiye özel geliştirme belirteci** ile test kimliği; `--uretim` dışında açılır | `BOLGE_KIMLIK=gelistirme` ([KIMLIK.md §3](../../packages/sunucu/KIMLIK.md)); belirtecin istemciye bağlantıyla verilip verilemeyeceği **(doğrulanmadı)**, K1'e sorulur |

### 2.4 Cihaz ve kayıt

| Konu | Kural |
|---|---|
| Windows | En az iki oturum Windows'ta (K1 masaüstü, K4 dizüstü); Chrome ve Edge dağıtılır. Yol ayırıcı, saat dilimi ya da yazı tipi kaynaklı farklar bulunursa BK değil **platform bulgusu** olarak işaretlenir (depo sahibi Windows'ta da çalışır, [ortak brif](../14-takim-modeli.md)) |
| Telefon | Katılımcının **kendi telefonu**; yerleşik ekran kaydı kullanılır (Android ve iOS'ta sistem özelliği **(doğrulanmadı: sürüme göre değişir)**); yüz ve el kaydedilmez |
| Masaüstü | Ekran ve ses kaydı yerel; OBS Studio gibi yerel kaydedici **(öneri; bu turda denenmedi)**; web kamerası **kapalı** |
| Saat eşleme | Kayıt başında yönetici sunucu saatini (dünya epoch'u + `t`) ve duvar saatini forma yazar: forma "ss:dd:ss" göreli zaman, günlükle birleştirme için tek bir sabit ofset kullanılır |
| İnternet | Katılımcı kendi ağında; yavaş bağlantı ve kopma `TE` olarak kodlanır, katılımcıya yüklenmez |

### 2.5 Bilinen kusurlar (BK) listesi

Testten önce kapatılması beklenir (Ö1). Kapanmayanlar gözlem sırasında **BK etiketiyle** kodlanır ve yeni bulgu sayılmaz; böylece aynı kusur "yeni bulgu" gibi şişirilmez.

| BK | Kusur | Kaynak |
|---|---|---|
| BK-1 | İl düzeyinde yapı etiketi ilçe adına biniyor | [13 §5](../13-toplanti-notu-1.md) |
| BK-2 | Mülk kipinde küre hâlâ bölge renkleri | 13 §5 |
| BK-3 | Defter bildirimi maliyet kartını örtüyor (telefonda; masaüstü görüntüsünde de görülüyor) | 13 §5; [05b](../toplanti/2/05b-maliyet-karti-acik-masaustu.png) |
| BK-4 | Telefonda hazine iki yerde (üst çubuk ve "Hazine" çipi) | 13 §5; [07a](../toplanti/2/07a-isletmem-acik-telefon.png) |
| BK-5 | Uzun ödül tutarı satır kırıyor | 13 §5 |
| BK-6 | Geri al şeridi küre düzeyinde de kalıyor | 13 §5 |
| BK-7 | Yakın planda arsa dolgusu baskın | 13 §5 |
| BK-8 | "Gün N" ifadesi tarihin yanında fazlalık | 13 §5; [01](../toplanti/2/01-kure-genel-acik-masaustu.png) |
| BK-9 | Yükseltme ek hücre göndermiyor (G2) | 13 §5 |
| BK-10 | Defter'de Atla ya da Kapat düğmesi yok; Defter tek yönlü | `packages/istemci/src/harita/defter.ts` (aranıp bulunmadı), [rehber Gİ-7](rehber-gorevler.md) ile çelişir |

---

## 3. Oturum senaryosu

### 3.1 Akış ve zaman çizelgesi

```
G0   S0 hazırlık (10 dk, oyun saati yok) -> S1 ilk saat (60 dk oyun) -> S1 görüşmesi (5 dk)
G0+  S1b isteğe bağlı K1 dönüşü: 1-6 sa sonra, 10 dk
G1   S2 K2 dönüşü: S1 bitişinden 20-30 sa sonra, 25 dk
G2..G13   sessiz dönem: hiçbir temas, hatırlatma ya da bildirim yok
G14  pencere kapanır: katılım anı + 336 saat (14. günün sonu dahil)
G15  son görüşme (20 dk) + günlükten veri çıkarma
```

Gün tanımı: **G0 = oyuncu_katil'in yazıldığı takvim günü** (TRT). Y4 "2. ve 8. takvim günü" = **G1 ve G7**. H6 (ii) penceresi, takvim gününe değil, tam **336 saate** bakar ([H1–H9 §H6](../olcum/h1-h9-parsel-tanimlari.md), `packages/olcum/src/parsel/h6-acilis.ts:62`: `t ≤ katılma + 14 gün` dahil).

### 3.2 S1: ilk saat (60 dakikalık oyun)

Saat **T0 = oyun adresinin açıldığı an** (ilk ekran). Yönetici kronometreyi başlatır; sunucu zamanı forma yazılır (§2.4). "Hedef", [baslangic §2.2](baslangic-ve-ustalik.md) tablosundaki mutlu yol süresidir; "kabul" sütunu zaman sınırıdır: aşılırsa §4.6 merdiveni işler.

| Adım | Ad | Beklenen yol (mutlu yol) | Hedef | Kabul (sınır) | Gözlem odağı | Ölçüt |
|---|---|---|---|---|---|---|
| **S1.1** | Giriş | Bağlantıyı aç, e-postadaki bağlantıya dokun ya da test kimliği ile gir; takma ad | ≤3 dk | 6 dk | E-posta gecikmesi, spam kutusu, "kod mu istiyor" şaşkınlığı; oturumun açık kalması | süre |
| **S1.2** | Yerleş | "Nerede başlamak istersin?" ekranı: üç ilçe kartı; açılış önerisi (Tarım, Sanayi, Pazar); "Burada başla" | ≤3 dk | 6 dk | **YA1:** açılış önerisini sınıf ya da kilit sandı mı ("bu bir sınıf değil" cümlesini okudu mu)? "Başka ilçe öner" ve "Şimdilik atla" kullanımı; **kendi ilçesini** bulma çabası | H6 (i) |
| **S1.3** | Arsa | İlçe haritası, "Arsalarım" (yurt ve ayrılmış hücreler), "Yeni oyuncu kalkanı" ve "Ayrılmış hücre hakkı" kutuları, kamu arsası (satılamaz) | ≤2 dk | 5 dk | **YA2/YA3:** "paramın 10.000 ₺'si nereye gitti" sorusu (hibe 50.000 ₺ iken hazine ilk görüntüde 40.000 ₺: ayrılmış hücre bedeli gibi görünüyor, **doğrulanmadı**); kamu arsasının nedeni; hücre sahipliği | YA3, H6 (i) |
| **S1.4** | İlk yapı | "Yapı kur" → yapı paleti → hayalet yerleştirme → maliyet kartı ("gereken/var", `6.000 ₺`) → "Çiftlik kur" | ≤4 dk | 15 dk | Palette önerilen yapıyı fark etme; "Dönder" kullanımı; maliyet kartı okunuyor mu; yapı türü seçimi **(Gebze'de "Sanayi" önerisine karşın Çiftlik mi?)** | **Y1**, H6 (ii) |
| **S1.5** | İnşa bekleme | İskele → ... → tamamlanır; Çiftlik **12 dk** (2 sa × %10, ilk 24 saat çarpanı) | 12 dk (sabit) | 12 dk | **Ne yapar?** Ekranı izler mi, başka sekmeye mi geçer, haritayı mı gezer, çıkar mı; sıkılma anı; "kapatsam biter mi" sorusu; bu sırada ilk satışa yönelir mi | **Y10**, YA4, duygu |
| **S1.6** | İlk satış | Pazar ya da mal paneli → başlangıç gıda stoku (200) → satış emri → nakitin artması | ≤5 dk (yapı onayından) | 25 dk | **YA5:** satışı "tek seferlik" mi sandı, oran emri mi (B-6)? Ödeme gerçekleşme gecikmesi; fiyat makası notu; satışı **yardımsız bulma** | **Y2**, A0-14 |
| **S1.7** | Esnaf Defteri | İşletmem panelinde "Sıradaki adımlar" ve "Defterine işlenenler"; damga; "Defter ödülleri `600 ₺ / 8.000 ₺`" çubuğu | süre yok | — | **YA6:** zorunlu mu sandı? Ödülü gerçek para ya da bedel mi sandı? "Hayırlı olsun" tonu sıcak mı, çocuksu mu, baskıcı mı? Kartların sırasını izledi mi, görmezden mi geldi? | Y8, A0-14 |
| **S1.8** | Serbest keşif ve ikinci karar | Dikkat paneli, ikinci yapı (Ahır, işleme), komşu ilçe, harita katmanları, yükseltme | 35 dk'ya kadar | — | Neye yöneldi: ikinci yapı, haritada gezinme, Defter kartı? **Y5:** ikinci yapının katmanı ve **neden o**; Defter mi yönlendirdi? Yükseltmeyi denerse BK-9 | Y5, Y6, A0-11 |
| **S1.9** | Çıkış | "Çıkabilirsin, dönünce özet gösteririz" notu; katılımcı sekmeyi kapatır ya da çıkar | — | 60. dk | Çıkış öncesi ruh hâli; "yarın açar mıydın" anket sorusu (§5.5) | Y4 (G1) |

**Zaman payı.** S1.1–S1.4 mutlu yolda ≈12 dk sürer; S1.5 bekleme 12 dk'dır ve S1.6 satış ile **üst üste binebilir** ([rehber T2](rehber-gorevler.md): "Tetik: T1 inşa çubuğu başladığında"). Geri kalan ≈35 dk S1.8'e kalır. Katılımcı yavaşsa S1.8 kısalır; 60. dakikada oturum, adımın ortasında olsa da kapanır (Y2 ve Y10 60 dakikada ölçülür).

### 3.3 İnşa bekleme protokolü (S1.5)

12 dakika katılımcıya **dokunulmadan** izlenir; bu bekleme ürünün bir parçasıdır ve hızlandırılmaz.

| Durum | Yönetici |
|---|---|
| Katılımcı bir şey yapıyor (gezinme, okuma, satış, Defter) | Hiçbir şey söylemez; `BE` kodu **etkin** |
| 3 dakikadır hiçbir şey yapmıyor ama sesli düşünüyor ("ne yapacağım şimdi?") | L0; söylediğini `AL` ile **birebir** yazar |
| 3 dakikadır sessiz ve hareketsiz | L1 (§4.6): "Aklınızdan geçenleri söylemeyi sürdürür müsünüz?" |
| Sekmeyi kapatır ya da telefonu kilitler | **Engellemez.** `CK` kodu; 15 dakikaya kadar bekler; dönerse devam. Dönmezse ya da <1 saat içinde döndüğünde **K0'da hiçbir ekran görünmemesi** beklenir; görünüyorsa not edilir ([donus-deneyimi §3C.1a](donus-deneyimi.md): K0 "yok") |
| "Bitti mi?" diye sorar | "Ne görüyorsunuz?" (yansıtma); cevabı verilmez |

### 3.4 S1b: K1 dönüşü (isteğe bağlı, 1–6 sa sonra)

Gerçek **K1 bandı** (1–6 saat; [donus-deneyimi §3C.1a](donus-deneyimi.md)) yalnız böyle denenir. Katılımcı S1'in bitişinden **≥60 dakika ve ≤6 saat sonra**, yönetici ile, oyunu yeniden açar. Gözlem: açılış kartı **kısa** geliyor mu (kodda "K1 kısa kart": `packages/istemci/src/harita/donus-ekrani.ts:10,126`; tasarım "tek satırlık şerit" der, **ikisi farklı**, hangisinin doğru olduğu A1'in önerisiyle lidere sorulur); okuma süresi; `Devam` mı, `Git` mi. Süre ≤10 dk. Uygulanamazsa (katılımcı uzakta) K1 "ölçülmedi" yazılır; K2 yine yapılır.

### 3.5 S2: K2 dönüşü ("sen yokken"; S1'den 20–30 sa sonra)

Gerçek **K2 bandı** (6–48 sa; Gün Sayfası). 20–30 saat seçilmesinin nedeni: ekran görüntüsündeki "14 sa aradan sonra" ([08](../toplanti/2/08-sen-yokken-acik-masaustu.png)) gibi, içinde **bir gece** ve birden çok sim-saati olan dönüş. Katılımcının oturumu açık kalıyorsa (30 gün kayan oturum, [12 §14 A-1](../12-yon-taslagi.md)) yeniden giriş gerekmez; gerekirse S1.1'in bağlantı sürtünmesi ayrıca kaydedilir.

| Adım | Ad | Yapılacak | Ölçüt |
|---|---|---|---|
| **S2.1** | Dönüş girişi | Katılımcı oyunu **yönlendirmesiz** açar | süre, oturum |
| **S2.2** | "Sen yokken" ekranı | Ekran açılır; **ekran kaydı** ile ekranın göründüğü kareden `Devam` ya da `Git` kapanışına süre ölçülür; sonra yönetici "az önce ekranda ne yazıyordu, kendi cümlelerinizle anlatır mısınız?" (**geri anlatım**, kısa) | **Dö2** (ortanca ≈12 sn), **Dö3** (atlama), YA8, duygu |
| **S2.3** | İlk 60 saniye | Ekran kapandıktan sonra ilk 60 sn'de ne yapar; ekran bir öneri/`Git` bağlantısı veriyorsa tıklandı mı, 2 dk içinde hedef eylem tamamlandı mı | **Dö4**, **Gö8** (öneri yoksa ölçülmez) |
| **S2.4** | Okuma görevleri (H4 ön) | §3.6 | **H4 ön** |
| **S2.5** | Yön değiştirme sorusu | §3.7 | Y6 |
| **S2.6** | Görüşme | §4.8 S2 soruları, §5.5 anketi | duygu, "baskı" |

**Baskı denetimi (Dö8 ruhu).** Katılımcıya **"yokluğunuzda bir şey kaybettiğinizi hissettiniz mi?"** sorulur ve cevap yazılır; "kaçırdın, kaybettin, geç kaldın" dilinin hiçbir ekranda yer almadığı gözlenir ([donus-deneyimi §2.9](donus-deneyimi.md) yasaklı kalıp sözlüğü). Bir kişi bile kayıp ya da suçluluk hissettiğini söylerse YA8 ve **S2 düzeyinde** bulgudur.

### 3.6 H4 ön denemesi (S2.4)

H4 ([H1–H9 §H4](../olcum/h1-h9-parsel-tanimlari.md), A1-5: 5 kişiden ≥4'ü 60 sn içinde yanıtlar) **Alfa-1 kapısıdır** ve "yasa" soruları Alfa-0'da yoktur (NPC vali). Bu yüzden **ön deneme** yapılır ve sonuç yalnız bilgidir. Üç soru, her biri **60 sn** ile sınırlı, **yönlendirmesiz**:

| Soru | Sorulacak cümle | Doğru cevap | Bağımlılık |
|---|---|---|---|
| **H4-1** | "Bu yapı (hazırlanmış ya da kendi yapısı) neden şu an üretmiyor ya da yavaş?" | Kaynak: Dikkat panelinde ya da bina panelinde yazan neden (ör. girdi bekliyor, inşa sürüyor, bakım) | Ö8, E21-G8; durum hazırlığı O2'den (§3.6.1) |
| **H4-2** | "Haritada şu alanı satın alabilir misiniz? Hangilerini alabilirsiniz, hangilerini alamazsınız, neden?" | Kamu arsası satılamaz ve nedeni; sahipsiz ayrılmış hücreler | G1 (kamu arsası) |
| **H4-3** | "Şu an sizi koruyan ya da size avantaj sağlayan bir kural ya da hak var mı? Varsa ne?" | Yeni oyuncu kalkanı (ticarette komisyon, tarife, ihracat vergisi yok), ayrılmış hücre hakkı (14 gün), ilk yapı indirimi (kalan sayı) | İşletmem paneli (kodda) |

H4 ön ölçüt: her soru için **≥4/5 doğru ve ≤60 sn** (§6.2). H4-3, H4'ün "hangi yasa beni etkiliyor?" sorusunun Alfa-0 karşılığıdır (öneri; lider onayı).

**3.6.1 Hazırlanmış işletme.** H4-1'in sınanabilmesi için bir yapının "eksik girdi" gibi görünür bir nedeni olmalıdır. Katılımcının kendi işletmesinde yoksa, test dünyasında önceden hazırlanmış bir **örnek işletme** hesabına (3 yapı; biri girdi bekliyor) salt okunur geçiş gerekir **(doğrulanmadı: bu mekanizma yok; O2 ya da K2 ile konuşulur, §11 S7)**.

### 3.7 Yön değiştirme sorusu (S2.5, Y6)

Y6 ([baslangic §8.2](baslangic-ve-ustalik.md)) "kilit olmadığının kanıtı"dır. Katılımcıyı yön değiştirmeye **zorlamayız**; iki ayrı sayı tutulur:

| Sayı | Nasıl |
|---|---|
| **Kendiliğinden** (Y6 ölçütü) | G0–G14 günlüğünde kabul edilen `parsel_birak`, `insaat_iptal`, yapı yıkma ya da başka ilçeye yeni yapı ([yeni-oyuncu.ts `YonKaydi`](../../packages/olcum/src/parsel/yeni-oyuncu.ts)) |
| **Yönlendirilmiş** (yalnız bilgi) | S2.5'te: "Diyelim ki buranın yerine başka bir şey kurmak istediniz. Ne yapardınız?" Doğru yolu **söylemeden** bulabildi mi; ceza ya da kilit bekledi mi |

### 3.8 G2–G14: sessiz dönem ve G15 görüşmesi

| Kural | Ayrıntı |
|---|---|
| **Hiçbir temas** | S2'den G15'e kadar katılımcıya mesaj, hatırlatma, "nasıl gidiyor" yok. Temas D7 ve H6 (ii) ölçümünü hatırlatma hâline getirir. Katılımcı kendisi yazarsa kısa yanıt verilir, oyuna dönmesi istenmez ve olay kaydedilir |
| **Katılımcıya söylenen** | "Oyun açık kalacak. İstediğiniz zaman girebilirsiniz; girmek ya da girmemek sizin tercihinizdir. Girmezseniz de bu bizim için değerli bilgidir." |
| **Veri** | Yalnız sunucu günlüğü (§7): girişler, komutlar, yapılar. Ek istemci telemetrisi yoktur ([baslangic A15](baslangic-ve-ustalik.md): komut günlüğünden huni; ek kişisel veri yok) |
| **G15 görüşmesi (20 dk)** | Önce **kendi anlatımı** ("14 günde kaç kez, ne zaman girdiniz, ne yaptınız?"), **ancak sonra** günlükle karşılaştırılır (hatırlama hatası da bir bulgudur). Girmeyenlere neden sorulur; yargı yok. §4.8 G15 soruları |
| **Bulgu** | Katılımcı G1'den sonra hiç girmediyse bu "sessiz çıkış"tır ve **en değerli** veridir: neden ve hangi anda terk ettiği sorulur |

### 3.9 Telefon ve masaüstü farkları

| Konu | Telefon | Masaüstü |
|---|---|---|
| Panel | Alt panel (sürüklenir); BK-3 maliyet kartı örtmesi, BK-4 çift hazine | Sağ panel sabit |
| Girdi | Dokunma; küre ve harita jestleri (kıstırma, iki parmak) | Fare ya da dokunmatik yüzey; tekerlek |
| Kayıt | Yerleşik ekran kaydı; ses telefonun mikrofonundan | Yerel kaydedici |
| Yönetici konumu | Aynı odada (yan yana) ya da paylaşılan ekranla; **katılımcının eline müdahale etmez** | Aynı |
| Özel gözlem | Yanlış dokunma (T7), yazı boyutu, "Yapı kur" düğmesinin yeri, alt panelin kapanması | Tıklama hedefi boyutu, kısayol keşfi (R: döndür) |

---

## 4. Yöneticinin metni

### 4.1 Roller

| Rol | Görev |
|---|---|
| **Yönetici** | Konuşur; metni okur; ipucu merdivenine karar verir; hiçbir ekran ögesini adlandırmaz |
| **Gözlemci** (sessiz) | Forma yazar (§5); kronometre; katılımcıyla göz teması kurmaz, konuşmaz |
| **Tek kişi varsa** | Yönetici gözlemci olur: kayıt zorunludur ve form kayıttan **sonra** tamamlanır; kayıt kapalıysa tek kişilik oturum yapılmaz |

### 4.2 Karşılama ve çerçeve (okunur; bire bir)

> "Merhaba, hoş geldiniz. Ben (ad). Bugün sizinle bir oyunu birlikte deneyeceğiz. Bu oyun henüz bitmedi ve **biz sizi değil, oyunu sınıyoruz.** Yanlış yapabileceğiniz bir şey yok; takıldığınız ya da anlamadığınız her an bizim için çok değerli, çünkü bu oyunu düzelteceğimiz yeri gösteriyor.
>
> Size bir şey öğretmeyeceğim ve oyun hakkında sorulara büyük ölçüde cevap vermeyeceğim; bunun nedeni gizlemek değil, **sizi tek başınıza oynarken görmek.** Merak ettiğiniz bir şey olursa yine de sorun; yazarım, çünkü sorduğunuz şey de bilgidir.
>
> İstediğiniz an durabilir, ara verebilir ya da çıkabilirsiniz; nedenini söylemek zorunda değilsiniz. Yarın ya da sonraki günlerde de oyuna girmek ya da girmemek tamamen sizin tercihiniz.
>
> Şimdi onay formuna bakalım."

(Onay formu §8.6'dır ve **ayrı ayrı** işaretlenir; tek bir "evet" yetmez.)

### 4.3 Sesli düşünme alıştırması (oyun dışı; okunur)

> "Bu oturumda sizden **aklınızdan geçeni sesli söylemenizi** isteyeceğim: ne gördüğünüzü, ne yapmaya çalıştığınızı, neyi beklediğinizi, neyi anlamadığınızı. Düzgün cümle olması gerekmiyor; 'hmm, bu ne acaba' bile yeterli. Susarsanız size arada hatırlatacağım.
>
> Önce bir deneyelim. Telefonunuzun ayarlar uygulamasını açıp **ekran parlaklığını nasıl azaltacağınızı** bulun ve ne yaptığınızı sesli anlatın."

Alıştırma 1–2 dakikadır; oyun içeriğiyle ilgisi yoktur. Katılımcı sessiz kalırsa yönetici yalnızca "Ne düşünüyorsunuz?" der. Alıştırma, katılımcının **sessiz** mi **konuşkan** mı olduğunu ve L1 sıklığını tahmin ettirir.

### 4.4 Görev cümleleri (yönlendirmesiz)

Oyunun hiçbir düğme adı, kavramı ve ekran ögesi cümlede **geçmez**. Görevler "ne yapacağını" değil, "neyi başarmak istediğini" söyler ve çoğu zaman **hiç görev verilmez**; gözlem serbesttir.

| An | Cümle (okunur) | Not |
|---|---|---|
| S1 başı | "Bir arkadaşınız size bu oyunu anlattı ve bakmak istediniz. Normalde nasıl yapıyorsanız öyle başlayın; ne yaptığınızı ve ne düşündüğünüzü söyleyin. Ben burada olacağım ama yardımcı olmayacağım." | Tek görev cümlesi. Bundan sonra **S1.6 satış için ve S1.7 Defter için ek cümle yoktur** |
| Katılımdan 10. dk geçti, yapı yok | Yeni cümle yok; ipucu merdiveni normal işler (§4.6) | Y1 "kaldı" kaydedilir (süre sayılır); adım sınırı olan 15. dk'da L5 |
| 55. dk | "Çıkmadan önce, oyunun size şu an ne yapmanızı önerdiğini düşünüyorsunuz? Ekranda bir yerde yazıyor mu?" | **Yalnızca** S1.7'de Defter hiç açılmadıysa; Defter'in **keşfedilmediği** bulgusu olarak kodlanır |
| S2 başı | "Dün bu oyuna başlamıştınız. Şimdi yeniden açın ve nasıl yapıyorsanız öyle devam edin." | S2.2 ekranı beklemeden çıkar |
| S2.4 | §3.6'daki üç soru | Zaman sınırı 60 sn; saat başlar "tamam, bu soruyu başlıyorum" denir |

### 4.5 İzin verilen ve yasak söyleyişler

| İzin verilir | Yasak |
|---|---|
| "Ne düşünüyorsunuz?" · "Biraz daha anlatır mısınız?" · "Devam edin, sizi dinliyorum." · "Şu an ne yapmaya çalışıyorsunuz?" · "O konuya sonda döneceğiz." · "Bilmiyorum; sizce ne olmalı?" | "Defter'e bakın" · "Yapı kur'a tıklayın" · "Sağdaki panelde..." (ögeyi adlandırma) · "Doğru, böyle" · "Yanlış" · "Aslında oyun şöyle çalışır" · "Bunu düzelteceğiz" · "Kusura bakmayın, bu hata" (BK dışında) · "Şunu da deneyin" |
| Katılımcı bir şey sorarsa: soruyu **birebir** forma yazar (`SO`), "Şimdi cevap veremem; oyunda bulabilir misiniz diye bakın, sonunda konuşuruz" der | Cevabı verip öğretmek; ipucunu "soru cevabı" kılığında vermek |
| Duygusal destek: "Sorun değil, bu tam bizim görmek istediğimiz şey." | Övgü ("harikasınız") ve yargı ("zor değil ki") |

### 4.6 İpucu merdiveni ve zaman sınırları

Her ipucu forma **düzeyiyle ve zamanıyla** yazılır (`IP-L#`). Merdiven **yalnız yukarı** çıkar; düzey 3 ve üstü adımı "ipuçlu" yapar, 5 "kurtarılmış".

| Düzey | Ad | Ne zaman | Söylenen (örnek) |
|---|---|---|---|
| **L0** | Sessizlik | Katılımcı denemelerle ilerliyor ya da sesli düşünüyor; takılma <45 sn | — |
| **L1** | Düşünce hatırlatma | 45 sn işlem yok ve sessiz | "Aklınızdan geçenleri söylemeyi sürdürür müsünüz?" |
| **L2** | Yansıtma | 90 sn işlem yok | "Şu an ne yapmaya çalışıyorsunuz?" ya da "Burada ne bekliyordunuz?" (amaç sorulur; ekran ögesi söylenmez) |
| **L3** | Genel yön | 2,5 dk işlem yok **ya da katılımcı yardım ister** | "Ekranın başka yerlerine de bakmak ister misiniz?" (bölge söylenmez) |
| **L4** | Bölge işareti | 4 dk işlem yok | "Sağ taraftaki panele (telefonda alttaki panele) bakın." (öğe adı ve eylem söylenmez) |
| **L5** | **Kurtarma** | Adım sınırı (§3.2 "kabul") aşıldı ya da katılımcı vazgeçmek istiyor | Eylemi söyler ya da gösterir; **adım "kurtarılmış"** kodlanır ve oturum sürer |

Kurtarma sonrası aynı kavram yeniden sorulmaz. **Y1 ve Y2 için** ipucu düzeyi ne olursa olsun süre kaydedilir ve ölçütte süre sayılır; ayrıca **bağımsız** (ipucu ≤L2) olanlar ayrı işaretlenir (H6 (ii) bağımsız, §7.4).

**Katılımcı vazgeçmek isterse:** L3 hemen verilir; yine isterse oturum kapanır; veri rıza ölçüsünde saklanır (§8.3).

### 4.7 Müdahale kuralları

| Durum | Yapılacak |
|---|---|
| **Teknik arıza** (hata iletisi, takılma, kopma, sunucu) | `TE` kodu ve zaman; katılımcıya "bu oyunun hatası, sizin değil" denir; yeniden yükleme/yeniden bağlanma **yardımı verilir** (arıza yönetimi ipucu sayılmaz); saat bu süre için **durdurulmaz** ama arıza süresi forma yazılır ve ölçütten düşülür |
| **Duygusal sıkıntı** (kızgınlık, utanç, gözlerin dolması) | Oturum durdurulur; "Ara verelim mi? Bu oyunun sorunu, sizin değil." Devam isteği katılımcıdan gelir |
| **Aşırı konuşkanlık** (oyunu yönetmeye çalışır, tasarım önerir) | Önerisi forma yazılır; "Çok değerli, not aldım; şimdi yine oynarken ne düşündüğünüzü söyler misiniz?" |
| **Sessizlik** | L1 merdiveni; sessiz katılımcıyı konuşturmak için S1.2'de bir kez "ne görüyorsunuz?" yeterlidir |
| **Başka biri odaya girer / telefon çalar** | Zaman çizelgesinden çıkarılır ve not edilir |
| **Katılımcı bir ögeyi "bozuk" sanıyor ama BK** | "Not aldım" der; `BK` ile kodlanır |

### 4.8 Görüşme soruları

**S1 görüşmesi (5 dk; yönlendirmesiz, bu sırayla):**
1. "Bu oyunun ne olduğunu bir arkadaşınıza iki cümleyle nasıl anlatırdınız?" (anlama; "strateji", "oyun mu uygulama mı" cevabı not edilir)
2. "En çok zorlandığınız ya da şaşırdığınız an hangisiydi?"
3. "Oyunun size bir sonraki adımı gösterdiğini hissettiniz mi? Nerede?"
4. "Oyundaki 'hayırlı olsun', 'kolay gelsin' gibi metinler size nasıl geldi? (sıcak, gereksiz, baskıcı, fark etmedim)"
5. "Gerçek paranın ya da gerçek ödemenin söz konusu olduğunu düşündünüz mü?" (K13: ücretli hızlandırma yok; YA2 kontrolü)

Anket §5.5.

**S2 görüşmesi:** "Ekranda ne yazıyordu?" (geri anlatım); "Yokluğunuzda bir şey kaybettiğinizi hissettiniz mi?"; "Ekranda eksik ya da fazla olan var mıydı?"; "Dün ile bugün arasında oyun sizi nasıl bir yerde karşıladı?"

**G15 görüşmesi:** "Bu 14 günde kaç kez, ne zaman girdiniz? Ne yaptınız?" (önce kendi cevabı, sonra günlük); "Girmediyseniz ne engelledi ya da ne gerek görmediniz?"; "İlk yapınızı ne zaman kurduğunuzu hatırlıyor musunuz?"; "Aklınıza gelen ama bulamadığınız bir şey oldu mu?"; "Bir arkadaşınıza önerir miydiniz? (0–10)".

---

## 5. Gözlem formu

Form kağıt ya da tablo olabilir; **ad yazılmaz, yalnız kod** (§8.2). Her satır bir olaydır; zaman damgası `ss:dd:ss` biçiminde T0'dan göreli yazılır ve kayıtla eşleştirme için bir sabit duvar saati ofseti form başında bulunur.

### 5.1 Form başlığı

| Alan | Değer |
|---|---|
| Katılımcı kodu / grup | K#, profil adı (§1.1) |
| Oturum | S1 / S1b / S2 / G15; tarih; **sürüm commit'i**; dünya (taze / yaşlı) |
| Cihaz ve işletim sistemi | (ör. Windows 11 / Chrome; Android / Chrome; iOS / Safari) |
| T0 duvar saati ve sunucu `t` | ofset (§2.4) |
| Yönetici / gözlemci | kod |
| Kayıt | ekran ve ses: açık / kapalı (rıza kapsamına uygun) |

### 5.2 Olay satırı

| Sütun | İçerik |
|---|---|
| **Zaman** | `ss:dd:ss`, T0'dan |
| **Adım** | S1.1 … S2.6 |
| **Olay kodu** | §5.3 |
| **Ayrıntı** | Ne gördü, ne yaptı, ne dedi (alıntı `"..."` ile) |
| **Sınıf** | T1–T7 (takılma), YA1–YA9 (yanlış anlama) |
| **Duygu** | DU kodu ve yoğunluk 1–3 |
| **İpucu** | IP-L0…L5 |
| **Ciddiyet** | S0–S3 (§5.4) |
| **BK** | evet ise BK numarası |

### 5.3 Olay kodları

| Kod | Anlam |
|---|---|
| `AD` | Adım başladı ya da bitti (S1.# açılış/kapanış) |
| `KM` | Katılımcının **görünür eylemi**: `KM-KATIL` ("Burada başla"), `KM-YAPI` (yapı onayı), `KM-SAT` (satış emri), `KM-IPTAL` (iptal/bırak), `KM-DEFTER` (Defter açıldı) |
| `OK` | Okuma: kart, metin, panel; süre yazılır |
| `TK` | **Takılma** (sınıfı T1–T7) |
| `YA` | **Yanlış anlama** (sınıfı YA1–YA9; "ne sandı / gerçek ne" iki sütun) |
| `DU` | Duygusal tepki (DU+, DU0, DU?, DU!, DU-, DUx) |
| `IP` | Yönetici ipucu verdi (L1–L5) |
| `SO` | Katılımcının sorusu (birebir) |
| `AL` | Sesli düşünmeden **birebir alıntı** |
| `BE` | Bekleme: `BE-E` etkin (inceliyor), `BE-B` **boşta** (ne yapacağını bilmiyor) |
| `BK` | Bilinen kusurla karşılaşma (§2.5) |
| `TE` | Teknik arıza (oyun, sunucu, ağ) |
| `CK` | Çıkış / sekme kapandı / geri döndü |

**Takılma sınıfları.**

| Kod | Sınıf | Tanım |
|---|---|---|
| T1 | Bulamama | Öğe ekranda var, bulamadı |
| T2 | Anlamama | Metin, kavram ya da sayı anlaşılmadı |
| T3 | Karar verememe | Seçenek çok ya da bilgi yetersiz |
| T4 | Geri bildirim eksik | Eylem yaptı, sonucu görmedi ya da anlamadı |
| T5 | Beklenti uyuşmazlığı | Başka bir sonuç bekliyordu |
| T6 | Boşta kalma | Ne yapacağını bilmiyor ya da sıkıldı |
| T7 | Etkileşim | Hedef küçük, jest, performans, yanlış dokunma |

**Yanlış anlama sınıfları.**

| Kod | Konu | Örnek (ne sandı) |
|---|---|---|
| YA1 | Sınıf ya da kilit | Açılış önerisini sınıf seçimi, geri dönülmez seçim sandı |
| YA2 | Para | Hibe, hazine, maliyet toplamı; "10.000 ₺ nereye gitti"; gerçek para sandı |
| YA3 | Sahiplik ve arsa | Hücre, yurt, ayrılmış hücre, kamu arsası, ilçe |
| YA4 | Zaman | Gerçek zaman, inşa süresi, "kapatsam biter mi", bekleme |
| YA5 | Satış ve fiyat | Oran emri ↔ tek seferlik satış; makas; fiyatın anlamı |
| YA6 | Defter | Defteri zorunlu sandı; ödülü bedel ya da gerçek para sandı; damgayı puan sandı |
| YA7 | Harita ve kamera | Küre ↔ ilçe ↔ arsa; katman; konum |
| YA8 | "Sen yokken" | Özet sayıları, "kayıp" ya da "ceza" sandı |
| YA9 | Diğer | Serbest yazı |

**Duygu kodları.** `DU+` keyif ya da merak (gülümseme, "vay", "ilginç"); `DU0` nötr; `DU?` kafa karışıklığı; `DU!` şaşkınlık (olumlu `DU!+` ya da olumsuz `DU!-` yazılır); `DU-` can sıkıntısı ya da sabırsızlık; `DUx` hayal kırıklığı, öfke ya da **vazgeçme isteği**. Yoğunluk 1–3. Sözlü olmayan işaretler (iç çekme, ekrandan uzaklaşma) ve sözlü olanlar ayrı yazılır.

### 5.4 Ciddiyet ölçeği

| Düzey | Tanım |
|---|---|
| **S3** | Engelleyici: kurtarma (L5) gerekti, vazgeçme isteği, hata/veri kaybı hissi |
| **S2** | Ciddi: ipucu L3–L4 gerekti ya da adım hedef sürenin ≥2 katı sürdü; yanlış anlama sonucu yanlış eylem |
| **S1** | Küçük: gecikme, homurdanma, kısa tereddüt; kendi çözdü |
| **S0** | Kozmetik: tercih, öneri, algı |

### 5.5 Doldurulmuş örnek (uydurma; yalnız biçimi göstermek için)

K2 (Android, mobil strateji oyuncusu), S1, Gebze, taze dünya. Süreler T0'dan göreli.

| Zaman | Adım | Kod | Ayrıntı | Sınıf | Duygu | İpucu | Ciddiyet | BK |
|---|---|---|---|---|---|---|---|---|
| 00:00:00 | S1.1 | `AD` | Açıldı; giriş ekranı | | DU0 | | | |
| 00:02:41 | S1.1 | `TK` | E-posta bağlantısı gelmedi, spam kutusuna baktı | T4 | DU- 1 | L0 | S1 | |
| 00:05:10 | S1.2 | `AD` | Yerleş ekranı göründü | | DU+ 1 | | | |
| 00:05:55 | S1.2 | `YA` | Açılış önerisine bakıp "yani sanayi mi olacağım, sonra değiştiremem mi?" | **YA1** | DU? 2 | L0 | S2 | |
| 00:06:30 | S1.2 | `AL` | "Altta yazıyor ha, kilit yokmuş, tamam" | | DU+ 1 | L0 | | |
| 00:07:20 | S1.2 | `KM-KATIL` | "Burada başla" (Gebze); `oyuncu_katil` | | | | | |
| 00:08:05 | S1.3 | `YA` | "40.000 ₺ mı? 50 verdiler, 10'u nerede?" | **YA2** | DU? 1 | L2 | S1 | |
| 00:09:40 | S1.4 | `TK` | "Yapı kur" düğmesini 40 sn aradı (alt panel açıktı) | T1 | DU- 1 | L1 | S1 | |
| 00:10:15 | S1.4 | `BK` | Defter bildirimi maliyet kartını örttü | T7 | DU- 2 | L0 | S1 | **BK-3** |
| 00:12:30 | S1.4 | `KM-YAPI` | "Çiftlik kur" onaylandı; Gebze önerisi Sanayi'ydi | | DU+ 1 | | | |
| 00:12:35 | S1.5 | `BE-B` | 4 dk ekrana baktı, hiçbir şey yapmadı; "bitiyor galiba" | T6 | DU- 2 | L1 | S2 | |
| 00:19:20 | S1.6 | `YA` | "Sat" dediğinde saatlik oran girmesi gerektiğini bilmiyordu; "oran ne demek?" | **YA5** | DU? 2 | L3 | S2 | |
| 00:21:05 | S1.6 | `KM-SAT` | Satış emri kabul; nakit +1.960 ₺ görüldü | | DU+ 2 | | | |
| 00:24:40 | S1.7 | `YA` | Defter ödülünü "500 ₺ kazandım" sandı; "gerçek mi?" | **YA6/YA2** | DU!+ 2 | L0 | S2 | |

**Adım özeti (örnek).**

| Adım | Başlangıç | Bitiş | Süre | En yüksek ipucu | Takılma (sınıf) | Yanlış anlama | Duygu (en baskın) | Kurtarıldı mı |
|---|---|---|---|---|---|---|---|---|
| S1.2 | 00:05:10 | 00:07:20 | 2 dk 10 sn | L0 | — | YA1 | DU+ | Hayır |
| S1.4 | 00:09:40 | 00:12:30 | 2 dk 50 sn | L1 | T1, T7 | — | DU- | Hayır |
| S1.5 | 00:12:35 | 00:24:35 | 12 dk | L1 | T6 (BE-B 1 kez, ≥5 dk) | — | DU- | Hayır |

### 5.6 Oturum sonu anketi

**Her ana adımdan hemen sonra** (S1.2, S1.4, S1.6, S1.7; sesli, ≤10 sn): tek soru kolaylık ölçeği (SEQ): "Bu adım ne kadar kolaydı? 1 çok zor … 7 çok kolay." (SEQ'in 7 puanlı olduğu bilgisi **doğrulanmadı: bu turda kaynak okunmadı**).

**S1 sonunda (yazılı ya da sözlü, 6 madde):**

| # | Madde | Ölçek |
|---|---|---|
| 1 | Oyunun ne olduğunu iki cümleyle anlatın | açık uçlu |
| 2 | Yarın bu oyunu yeniden açar mıydınız? | 1 kesinlikle hayır … 5 kesinlikle evet; neden? (**beyan edilen niyet davranış değildir**; yalnız bağlam) |
| 3 | Oyun, bir sonraki adımı size gösterdi mi? | 1 hiç … 5 tamamen; nerede? |
| 4 | "Hayırlı olsun" ve benzeri metinler | sıcak / gereksiz / baskıcı / fark etmedim |
| 5 | Gerçek para ya da ödemenin söz konusu olduğunu düşündünüz mü? | evet / hayır; neden? |
| 6 | Bir arkadaşınıza önerir miydiniz? | 0–10; neden? |

**S2 sonunda (3 madde):** (1) ekranda ne yazıyordu (geri anlatım); (2) ekran sizi nasıl hissettirdi: baskı / merak / rahatlama / ilgisiz; (3) yokluğunuzda bir şey kaybettiğinizi hissettiniz mi (evet / hayır; ne?).

### 5.7 Sunucu günlüğünden tamamlanan alanlar

Gözlemci bunları **elle yazmaz**; O2'nin çıkardığı tablodan (§7.3) forma eklenir ve elle yazılanlarla karşılaştırılır (ör. gözlemcinin "yapıyı 12:30'da onayladı" notu ile günlükteki `yapi_yerlestir` `t`'si arasındaki fark, ofset hatasının kontrolüdür): katılım `t`, ilk yapı komutu `t` ve kabul, inşa tamamlanma `t`, ilk satış emri `t` ve gerçekleşme, girişler.

---

## 6. Başarı ölçütleri

### 6.1 Okuma kuralları

- **Eşik → kişi sayısı:** §0.2. Her satırda "n=5 karşılığı" açık yazılır.
- **Veri kaynağı:** "Günlük" = sunucu komut günlüğü ve profil kayıtları (§7); "Gözlem" = §5 formu ve ekran kaydı.
- **Gözlemli oturum üst sınırdır:** §0.1.
- **Sınıf:** hepsi **hipotezdir**, kapı değildir; çıktı `Geçti / Belirsiz / Kaldı / Ölçülmedi` olarak raporlanır.

### 6.2 Ölçüt tablosu

| Ölçüt | Kaynak tanım | Eşik (yüzde) | **n=5 karşılığı** | Veri | Durum (bu sürümde) |
|---|---|---|---|---|---|
| **Y1** İlk yapı ≤10 dk | [baslangic §8.2](baslangic-ve-ustalik.md) Y1; `oyuncu_katil` ile ilk **kabul edilen** yapı komutu arası | ≥%75 | **≥4/5** geçti, 3/5 belirsiz, ≤2/5 kaldı | Günlük + oynatma (İ1); gözlem uçtan uca süre ayrıca | Ölçülür |
| **Y2** İlk satış ≤60 dk | Y2; ilk gerçekleşen ihracat | ≥%70 | **≥4/5**; 3/5 belirsiz | Günlük (dakikalık örnekleme, İ1); gözlem | Ölçülür |
| **Y2** İlk satış ≤10 dk | Y2 | ≥%50 | **≥3/5**; 2/5 belirsiz | aynı | Ölçülür |
| **Y3** İlk sözleşme ≤24 sa | Y3 | ≥%50 | — | — | **Ölçülmez**: çekirdekte sözleşme/sipariş komutu yok (A6; [yeni-oyuncu.ts `Y_OLCUTLERI`](../../packages/olcum/src/parsel/yeni-oyuncu.ts)); kamu siparişi v0 gelirse bilgi |
| **Y4** D1 | Y4; katılımın 2. takvim günü ≥1 oturum | ≥%35 (gözlem) | ≥2/5 | **Randevusuz D1** (aşağıda §6.4) | Kısmen; oturum geçmişi yok (İ2) |
| **Y4** D7 | Y4; 8. takvim günü | ≥%15 (gözlem) | ≥1/5 | Günlük/oturum olayı (İ2) | Kısmen |
| **Y5** Açılış çeşitliliği | Y5; 24 saatte 2. yapının katmanı | maks katman ≤%60 | **ölçülebilen ≥4 kişi** ve hiçbir katman >2/4 ya da >3/5 | Günlük (yapı komutları); ikinci yapıyı **neden** seçtiği gözlem | Ölçülür; Defter yönlendirmesi ayrı yazılır ([baslangic §8.1](baslangic-ve-ustalik.md) H2 uyarısı) |
| **Y6** Yön değiştirme | Y6; ilk 7 günde ≥1 yön değiştirme | ≥%10 | ≥1/5 (**kendiliğinden**); yönlendirilmiş yol bulma ≥3/5 (öneri) | Günlük; S2.5 | Kendiliğinden oran bilgi; "D7 farkı ≥−5 puan" n=5'te **ölçülemez** |
| **Y7** 14. gün net üretim geliri | Y7; ilçe emsal medyanının ≥%50'si | oyuncuların ≥%50'si | **≥3/5** | Günlük (son 7 gün net üretim geliri, hibeden bağımsız) + **emsal** (§2.3) | Emsal yoksa **ölçülmez**; pasif oyuncu için H7'ye bak (§6.5) |
| **Y8** Defter etkileşimi | Y8; Atla ≤%30 | ≤%30 | **≤1/5 atlar** | Gözlem (Atla düğmesi yok, BK-10) | **Atla ölçülmez**; yerine: "Defter'i hiç açmayan ≤1/5" ve "zorunlu sandı (YA6) ≤1/5" (**öneri**) |
| **Y9** Rehberlik | Y9 | — | — | — | **Ölçülmez** (Alfa-1) |
| **Y10** Takılma | Y10; ilk saatte ≥5 dk komutsuz bekleme sayısı | ≤1 / oyuncu | **≥4/5 oyuncu ≤1** | Gözlem `BE-B` (§6.3); ham: günlük | Tanım işlemselleştirildi (§6.3) |
| **H6 (i)** Katılımda taban fiyatlı hücre | [H1–H9 §H6](../olcum/h1-h9-parsel-tanimlari.md) | tüm olgular | **5/5** | Katılım anı durumu (ayrılmış boş ≥ ayak izi; yurt hariç ve dahil) | Ölçülür |
| **H6 (ii)** 14 günde ilk açılış yapısı | H6 (ii) | (öneri) | **≥4/5** geçti, 3/5 belirsiz, ≤2/5 kaldı | Günlük + oynatma (İ1) | Ölçülür; **iyimser** (§7.5) |
| **H6 (ii) bağımsız** | (öneri) | (öneri) | **≥3/5** (ipucu ≤L2 ile) | Günlük + gözlem (ipucu) | Ölçülür |
| **A0-14** İlk saatte ilk satış | [GDD §6.5](oyun-tasarim-belgesi-v1.md) A0-14; Gö1 | ≥%70 | **≥4/5** (= Y2 60 dk) | aynı | Ölçülür |
| **A0-14** Kart atlama | A0-14; Gö4 | ≤%30 | **≤1/5** | Gözlem ("görmezden gelme" ve açık reddetme) | Atla yok (BK-10); yalnız görmezden gelme (48 sa) |
| **A0-13** Özet ortanca okuma | GDD A0-13; Dö2 | ortanca ≈12 sn; p90 ≤30 sn | 5 değerin **3.'sü ≤12 sn**; en büyük ≤30 sn | **Ekran kaydı** (kare kare) | Ölçülür |
| **A0-13** Özet atlama | A0-13; Dö3 | ≤%50 | **≤2/5** (Devam ≤3 sn ya da okunmadan kapanan) | Ekran kaydı | Ölçülür |
| **A0-13** Öneri tıklama | A0-13; Dö4 | ≥%30 | **≥2/5** | Gözlem + günlük | **Ölçülmez** B7 olmadan (Ö7) |
| **A0-13** Yapılamaz öneri | A0-13; Dö5 | ≤%2 | **0** tıklanan öneri reddedilemez | Günlük | Ölçülmez (B7) |
| **A0-11** İlk dükkân ≤36 sa | GDD A0-11 | medyan ≤36 sa | **ilk dükkânı kuranların medyanı ≤36 sa** ve **≥3 kişi kurmuş** | Günlük (`dukkan` yapısı) | **G7+G9 olmadan ölçülmez** (Ö5); <3 kişi kurduysa "ölçülmedi"; A0-11'in "geri ödeme medyanı ≤48 sa" kısmı n=5'te **ölçülmez** |
| **Gö8** Kaldığın yer etkinliği | [rehber §5](rehber-gorevler.md) Gö8 | ≥%50 | **≥3/5** (ilk adımı 2 dk içinde) | Gözlem + günlük | Ölçülmez B7 olmadan |
| **H4 ön** (3 soru) | [H1–H9 §H4](../olcum/h1-h9-parsel-tanimlari.md) A1-5 | ≥4/5 doğru, ≤60 sn | **≥4/5** her soru için | Gözlem (kronometre) | Ö8 yoksa Dikkat paneliyle sınırlı; bilgi |

### 6.3 Y10'un işlemselleştirilmesi (öneri)

[baslangic §8.2](baslangic-ve-ustalik.md) Y10 "ilk saatte ≥5 dk komutsuz bekleme anlarının oyuncu başına sayısı ≤1" der ve ayrı telemetri anahtarı ister. İki sorun var:

| Sorun | Çözüm |
|---|---|
| İlk Çiftlik **12 dk'da** biter (S1.5). Katılımcı bekleyerek o aralığı geçirirse tek başına **bir** "komutsuz ≥5 dk" aralığı doğar; haritada gezen ya da panel okuyan oyuncu da komut vermiyor (yalnız görüyor) | Test **iki sayı** tutar: **ham** (günlükte komutsuz ≥5 dk aralık sayısı; yalnız bilgi) ve **işlemsel** (gözlemde `BE-B`: katılımcı **boşta** ve ne yapacağını bilmiyor ya da sıkılıyor, ≥5 dk). Y10 kararı **işlemsel** sayıya göre verilir |
| `BE-B`'nin sınırı öznel | Ölçüt: katılımcı o aralıkta (a) hiçbir panel/harita eylemi yapmıyor ve (b) sesli düşünmesinde ya da yüzünde ne yapacağını bilmediğini ya da sıkıldığını gösteriyor. İki gözlemci varsa uyuşma denetlenir; tek kişiyle kayıttan ikinci kez izlenir |

Bu değişiklik Y10 tanımının **okunuşudur**; tanım lidere onaylatılır (§11 S4).

### 6.4 Y4 (D1/D7) ve randevu çakışması

S2 (G1) **randevulu** olduğundan D1'i trivial yapar: katılımcı randevu için zaten girer. Bu yüzden:

| Sayı | Tanım |
|---|---|
| **D1 (randevulu)** | S2'de girdi: %100, **bilgi değil**; Y4 D1 olarak **raporlanmaz** |
| **D1 (randevusuz sinyal)** | S2 randevu saatinden **önce** G1'de kendiliğinden giriş var mı (günlük/oturum olayı, İ2) |
| **D7 (G7)** | G2–G14 sessiz dönemde 8. takvim gününde (G7) giriş var mı; **temas yok**, hatırlatma yok |
| **Sınır** | n=5'te Y4 yalnız betimsel; "D1 ≥%35" için ≥2 kişi, "D7 ≥%15" için ≥1 kişi eşiği bilgi olarak yazılır; karar ölçütü değildir ([baslangic Y4](baslangic-ve-ustalik.md): "gözlem, eşik yok") |

### 6.5 Eşik kaçarsa ne yapılır

| Sonuç | Eylem |
|---|---|
| **Belirsiz** (bir kişi eksik) | Bulgu kök neden açısından incelenir; düzeltme **kolay geri dönülür** bir değişikse (§10 kolay liste) uygulanır; **ikinci tur** için 3 yeni kişi çağrılır ve yalnız o ölçüt yeniden bakılır |
| **Kaldı** (≥2 kişi eksik) | Aynı kök neden analizi + düzeltme; ölçüt **Alfa-0 kabulünün koşulu olmadığı** için baş lider kararı gerekmez, ama bulgu A0-13/A0-14 gibi önerilen eklemeler için baş lidere **bilgi** olarak gider. Ölçüt Alfa-0 kapısında olsaydı kapı açılmazdı |
| **Ölçülmedi** | Neden yazılır (bağımlılık yoksa Ö# numarası); ölçüm Alfa-0 kohortuna ([A1-7](../11-urun-donusu.md) D1/D7 gözlemi, A15 huni ölçümü) devredilir |
| **S3 tek kişide bile** | Düzeltilir; sıklığa bakılmaz (engelleyici) |
| **Duygusal baskı bulgusu** (Dö8, YA8) | Bir kişi bile "kayıp hissettim" derse metin ya da bant düzeltilir; **bu kolay geri dönülür** (şablon metni) |
| **Geri dönüşü zor karar gerektiren bulgu** | **n=5 verisiyle zor karar alınmaz.** Bulgu "güçlü sinyal" olarak ikinci tura ve Alfa-0 kohortuna taşınır; karar baş lidere ve sahibe gider (§10) |
| **Pasif oyuncu Y7'si düşük** | Önce S2'den sonraki **giriş sayısına** bakılır: az girenin üretim geliri düşükse bu H7'nin bulgusudur (ayarla-unut: v0.3'te 0,357 "kaldı", [H1–H9 §H7](../olcum/h1-h9-parsel-tanimlari.md)); oyuncu ile ilgili değildir |

---

## 7. H6 (ii): sunucu verisi, denetim ve istekler

H6 (ii) = "katılımdan sonraki 14 günde en az bir açılış yapısı kuruldu" ([H1–H9 §H6](../olcum/h1-h9-parsel-tanimlari.md): "kabul edilen yapı komutu; 14. günün sonu dahil, 15. gün değil"). [Toplantı notu 1 §2](../13-toplanti-notu-1.md): "bot ölçeğinde bilgisiz; insan testi gerekli" (botlar katılımda hemen kurar: ilk yapı 0 gün).

### 7.1 Denetim: gereken alan kodda var mı

| Gereken alan | Var mı | Nerede (dosya:satır) | Not |
|---|---|---|---|
| **Katılım zamanı** `oyuncu_katil` | **Evet** | Günlük satırı: `t` (sim ms), `komut.oyuncu` = katılımcı, `hesap` = `sistem` (`packages/sunucu/src/sunucu.ts:454–458` `katilAl`; tablo `packages/sunucu/sql/001-baslangic.sql:5–16`). Durumda `OyuncuDurumu.katilmaZamani` (`packages/cekirdek/src/motor.ts:318`, `tipler.ts:377`, `serilestir.ts:358`); katılım ilçesi `katilimIlcesi` (`motor.ts:341`) | Gerçek tarih = `dunyaEpochMs + t` ([README, "Mutlak saat"](../../packages/sunucu/README.md)); pg'de `log.yazildi` duvar saati de var |
| **İlk `yapi_yerlestir` zamanı** | **Evet (denendi, kabul bilgisi yok)** | Aynı `log`: `komut.tur = 'yapi_yerlestir'` (`packages/cekirdek/src/tipler.ts:973`), `hesap` = katılımcı, `t` | Ayrıca `tesis_insa_hucre` aynı sınıftır (`packages/olcum/src/parsel-kosu.ts:213` `YAPI_KOMUTLARI`) |
| **Komutun kabul edilip edilmediği** | **Hayır** | `GunlukKaydi` sonuç alanı taşımaz (`packages/sunucu/src/depo/tipler.ts:13–26`); `kaydiUygula` sonucu üretir ama kaydetmez (`packages/sunucu/src/yazar.ts:1089–1099`); **başarısız komutlar da günlüğe girer** (`packages/sunucu/test/basarisiz-gunluk.test.ts:1`); sayaçlar toplamdır (`yazar.ts:1096–1097` `komutTamam`/`komutBasarisiz`; `metrik.ts:182–183` `bolge_komut_toplam{sonuc=...}`; oyuncu başına değil) | H6 (ii) "kabul edilen" der; bot ölçümü `ParselKomutKaydi.tamam` ile bilir (`packages/botlar/src/parsel-kosucu.ts:45–54`); insan günlüğünde **yeniden oynatma** şarttır |
| **İnşa tamamlanma zamanı** | **Evet** | `profil_kayit` `tur='insaat_bitti'`, `t` = inşaatın bitiş sim zamanı (`packages/sunucu/src/donus/izleyici.ts:83`; `depo/tipler.ts:123–132`; `sql/002-goc-profil.sql`; dosya deposunda `profil.jsonl`); Esnaf Defteri `ilk_yapi` damgası (`profil_damga`, `sql/003-defter.sql`) | `ilk_yapi` damgasının `t`'si **sim-saat ızgarasına** oturur (en çok 1 saat geç): kesin zaman için `insaat_bitti` kullanılır (`packages/sunucu/src/odul/dedektor.ts:8`) |
| **İnşa başlangıcı** (kabul anının yedek kaynağı) | Kısmen | Süren inşaatta `baslangic` alanı (`packages/cekirdek/src/tipler.ts:495`) kare ile gelir; tamamlanınca silinir | Yeniden oynatma yerine **durum örneklemesiyle** de kabul `t`'si bulunabilir (İ1 alternatifi) |
| **İlk satış (gerçekleşme)** | **Kısmen** | `ticaret_emri` günlükte (`t`); gerçekleşme **durumda** (`ticaretEmirleri[].gerceklesenSaat`, bot ölçümü `packages/olcum/src/parsel-kosu.ts:433–435`); özet kaydı `satis_toplami` yalnız **gün sınırında** | Kesin zaman için dakikalık durum örneklemesi gerekir (İ1); `ilk_satis` damgası saat ızgarasına oturur |
| **Girişler (oturum geçmişi)** | **Hayır** | Yalnız **son** çıkış çapası `sonGorulen` (`packages/sunucu/src/depo/tipler.ts:99–116`; `yazar.ts:1011`) ve `ozetOkunduT`; her çıkışta **üzerine yazılır**; bağlantı sayısı **toplam** gauge (`bolge_baglanti`, `bolge_bagli_oyuncu`: `metrik.ts:179–180`); Y4 "OLÇULEMEZ: oturum telemetrisi gerekir" (`yeni-oyuncu.ts` `Y_OLCUTLERI`); planlı oturum kaydı [KIMLIK.md §6](../../packages/sunucu/KIMLIK.md) G5 ile gelir | D1, D7 ve "G1–G14'te kaç kez girdi" için istek (İ2) |
| **Özet ekranı süresi** | **Hayır** | `ozetOkundu` yalnız son durumu işler (`donus-ekrani.ts:111,199`, `baglanti-ws.ts:335`); Dö2'ye süre istemcide **ölçülmez** | Test için **ekran kaydı** yeter (§6.2); ürün telemetrisi istenmez |
| **Defter Atla/Kapat** | **Hayır** | Defter ekranında düğme yok (`packages/istemci/src/harita/defter.ts`: `Atla`/`Kapat` aranıp bulunmadı); sunucuda `kilavuz_kapali` tablosu yok (`packages/sunucu/sql` içinde aranıp bulunmadı) | Y8 yalnız gözlemle |

Metrik ucu (`bolge_*`, `packages/sunucu/src/metrik.ts:179–237`) yalnız **toplam sayaç ve gauge** verir; oyuncu başına zaman damgası içermez. H6 (ii) için kullanılamaz.

### 7.2 İstekler (K2 ve O2'ye; lider iletir)

| # | İstek | Neden | Kabul ölçütü | Kime |
|---|---|---|---|---|
| **İ1** | **Çevrimdışı günlük oynatma ve çıkarma betiği** (yeni sunucu kodu gerekmez; `packages/olcum` altında): depodan (`gunluk.jsonl` ya da pg `log`) anlık görüntü + günlüğü okur, her satırı `Simulasyon.uygula` ile **oynatıp sonucu** (`tamam`, hata) kaydeder; her test oyuncusu için `katilmaMs`, **ilk kabul edilen yapı komutu** `t` (tür, ilçe), ilk **inşa tamamlanma** `t`, **ilk gerçekleşen satış** `t` (≤1 dk çözünürlük: ilk 3 saat dakikalık, sonra saatlik örnekleme), ikinci yapı ve katmanı (Y5), yön komutları (Y6), `dukkan` kurulum `t`'si (A0-11) ve 7 günlük net üretim geliri (Y7) çıkarır; çıktı §7.3 JSON'u | Günlükte başarısız komutlar da var (§7.1); botlar bu bilgiyi `ParselKomutKaydi.tamam` ile alır, insan günlüğü için eşdeğeri yok | (a) Aynı günlüğü iki kez oynatınca aynı çıktı (determinizm); (b) pilot oturumda gözlemcinin elle yazdığı yapı onay zamanıyla ≤10 sn fark; (c) çıktı ad ve e-posta içermez | O2 (`packages/olcum`), K2 (depo okuma yardımcıları) |
| **İ2** | **Oturum olayı kaydı:** her bağlantı açılışı ve kapanışı için `{oyuncu, t, olay}` (**yalnız zaman ve opak oyuncu kimliği; IP, UA ya da cihaz bilgisi yok**); ≤30 gün saklanır; test dünyasında açılır (`BOLGE_OTURUM_KAYDI=1` gibi bayrak); üretimde varsayılan kapalı kalır, açılması ayrı karar | D1, D7 ve "G1–G14 giriş sayısı" bugün **hiç** hesaplanamaz | (a) Bağlantı kopup yeniden bağlanması tek oturum sayılır (ör. 5 dk boşluk kuralı, parametre); (b) `profil_capa` ile çelişmez; (c) KVKK: ek kişisel veri yok ([KIMLIK.md §6](../../packages/sunucu/KIMLIK.md) ile uyumlu) | K2 |
| **İ3** | **Test hesabı silme komutu:** test dünyasındaki oyuncuları ve (G5 sonrası) bağlı e-posta/hesap satırlarını **tek komutla** siler; silme sonucunu raporlar | KVKK silme taahhüdü (§8.5); elle silme hata yapar | Komut sonrası günlük, profil, damga ve auth tablolarında test kodlarına ait satır **0** | K2, O3 |
| **İ4** | **Gerçek saat dönüşümü** çıktıda: her `t` yanında `dunyaEpochMs + t` TRT biçimi | Gözlem formunun duvar saati ofsetiyle karşılaştırılır | Çıktıda hem sim ms hem TRT ISO | O2 |
| **İ5** | **Örnek işletme hesabı** (salt okunur "devral"): 3 yapı, biri girdi bekliyor (H4-1) | S2.4 | Katılımcı hesabı değişmeden okunabilir | O2 / K2 (**doğrulanmadı: mekanizma yok**) |

### 7.3 Çıkarma biçimi (öneri)

`docs/toplanti/3/insan-testi-olcutler.json` (kişisel veri yok; `kod` yalnız K1…K5):

```json
{
  "surum": 1,
  "test": { "commit": "<sha>", "dunya": "<ad>", "olusturma": "2026-10-xx" },
  "katilimcilar": [
    {
      "kod": "K1",
      "profil": "strateji-masaustu-windows",
      "katilma": { "tMs": 0, "trt": "2026-10-08T14:07:20+03:00", "ilce": "tr_41_gebze" },
      "ilkYapi": { "tMs": 0, "trt": "...", "kabul": true, "tur": "ciftlik", "gecikmeMs": 0, "acilisTuru": true },
      "insaTamam": { "tMs": 0, "trt": "..." },
      "ilkSatis": { "emirTMs": 0, "gerceklesenTMs": 0, "cozunurlukMs": 60000 },
      "ikinciYapi": { "tMs": 0, "tur": "ahir", "katman": "tarim" },
      "yonKomutlari": [],
      "dukkan": null,
      "oturumlar": { "g1": true, "g7": false, "sayi14": 3 },
      "y7": { "net7gunMili": 0, "emsalMedyanMili": 0, "emsalDuzeyi": "ilce" },
      "h6": { "tabanYeter": true, "tabanYeterYurtDahil": true, "ii": true, "iiGenis": true, "iiBagimsiz": true }
    }
  ]
}
```

**Çıkarma sorgusu (taslak; pg `log` şemasına göre; denenmedi, doğrulanmadı):**

```sql
SELECT seq, t, hesap, komut->>'tur' AS tur, komut->>'oyuncu' AS katilan,
       komut->>'tesisTuru' AS tesis, komut->>'ilce' AS ilce, yazildi
FROM log
WHERE dunya = $1
  AND ( komut->>'tur' = 'oyuncu_katil'
        OR ( hesap = ANY($2) AND komut->>'tur' IN ('yapi_yerlestir','tesis_insa_hucre','ticaret_emri',
                                                    'parsel_birak','insaat_iptal') ) )
ORDER BY seq;
```

Bu satırlar yalnız **niyeti** verir; **kabul bilgisi** İ1'in oynatmasından gelir (§7.1).

### 7.4 H6 (i) ve (ii) birlikte nasıl raporlanır

Katılımcı başına tek satır; kod kolonuyla (kişisel veri yok):

| Kod | (i) taban hücre ≥ ayak izi (ayrılmış boş, yurt hariç) | (i) yurt dahil (bilgi) | Katılım ilçesi | İlk yapı komutu (kabul) | Gecikme | (ii) resmî: açılış türü ile | (ii) geniş: herhangi üretim yapısı | (ii) bağımsız (ipucu ≤L2) | İnşa tamam |
|---|---|---|---|---|---|---|---|---|---|
| K# | evet/hayır | evet/hayır | Gebze | 14 Eki 14:12 | 0,00 gün (5 dk) | evet/hayır | evet | evet | +12 dk |

**Tanımlar (insan testi için):**

| Ad | Tanım | Kaynak |
|---|---|---|
| **(ii) geniş** | Katılımdan sonraki 336 saat içinde **kabul edilen herhangi bir üretim yapısı komutu** (`yapi_yerlestir`, `tesis_insa_hucre`; ek yapı Ambar ve Ticaret ofisi sayılmaz: Esnaf Defteri `ilk_yapi` tanımıyla aynı, `packages/sunucu/src/odul/dedektor.ts:8`) | Kilitsiz yön: oyuncu önerilen açılış dışında bir yapı seçebilir |
| **(ii) resmî** | Aynı pencerede, yapı türü ilçenin **önerilen açılışının** ilk yapı türlerinden biri (`ACILIS_ESLEMESI`, `packages/botlar/src/parsel.ts:737–741`) | Botla birebir aynı ölçü; bot ve insan sonuçları yan yana okunur |
| **(ii) bağımsız** | (ii) geniş tutan ve ilk yapı komutu **ipucu ≤L2** ile verilen | §4.6; yönetici etkisini ayırır |

(ii) ve (ii) geniş arasındaki fark **bulgudur**: kişi önerilen açılışın dışına çıktı; bu kötü değil, "kilit yok, seçim var" ilkesinin bir sonucudur. Hangisinin **bağlayıcı** olacağı lider kararıdır (§11 S6); bu belge ikisini de raporlar.

**Karar önerisi (insan testi).** (i): 5/5 (H6 (i) "tüm olgular" der). (ii) geniş ve resmî: **≥4/5 geçti**, 3/5 belirsiz, ≤2/5 kaldı. (ii) bağımsız: **≥3/5**. Hiçbiri Alfa-0 kapısı değildir.

### 7.5 H6 (ii) için sınırlar

| Sınır | Etki | Ne yapılır |
|---|---|---|
| **Gözlemli ilk oturum:** katılımcı bir yönetici varken yapı kurar | (ii) neredeyse kesin **geçer**; "geç gelen kendi başına terk eder mi" sorusuna cevap vermez | (ii) "üst sınır" okunur. **Gözlemsiz kol**: Alfa-0 kohortunda, davetli oyuncunun yönetici olmadan yaptığı ilk oturum için aynı tablo A15 huni ölçümünden alınır ([baslangic A15](baslangic-ve-ustalik.md)); ek gözlemsiz 2 kişi bu testin **dışında** önerilir (§11 S2) |
| **n=5** | Bir kişi %20 ağırlıktadır | §0.2 |
| **Yedek hesap yok** | Gerçek geç katılan başka oyuncuların kapmadığı hücrelerle karşılaşır | Test dünyası "yaşlı" (§2.3 B) ve emsal botlu ise yaklaşık |
| **Düzenleme etkisi** | Telefon yerine masaüstünde ilk kurulum daha hızlıdır | Cihaza göre **kırılım** raporlanır |

---

## 8. Etik ve KVKK

> **Bu bölüm hukuki tavsiye değildir.** KVKK yorumları **(doğrulanmadı)**; açık alfa öncesi dış hukuki görüş planlıdır (K34, A1-6) ve bu test o görüşten önce yapılırsa **sahip riski bilerek** üstlenir (Ö13). Bu bölüm, [KIMLIK.md §6](../../packages/sunucu/KIMLIK.md) ve [donus-deneyimi §5.7](donus-deneyimi.md) ile aynı çizgidedir: en az veri, olgu saklama, silme.

### 8.1 İlkeler

1. **Gönüllülük ve çekilme:** katılım serbest, çekilme her an ve gerekçesiz; çekilme teşekküre dokunmaz.
2. **Yargısızlık:** "sizi değil oyunu sınıyoruz" (§4.2); düşük başarı katılımcıya yüklenmez.
3. **En az veri:** yalnız gerekli olan toplanır; "olursa iyi olur" veri toplanmaz.
4. **Takma ad:** kod (K1…K5); gerçek ad yalnız ayrı eşleme tablosunda.
5. **Aldatma yok:** katılımcıya 14 günlük günlük izlemesi, kayıt ve silme takvimi **baştan** söylenir; "oyunu test ediyoruz" dışında gizlenen hiçbir amaç yoktur.
6. **Zarar yok:** ücretli satın alma, gerçek para ve gerçek kişi bilgisi oyunda yoktur (K13); gerçek marka ve kişi adı gösterilmez ([harman R20, R22](oyun-kimligi-harman.md)).

### 8.2 Veri envanteri

| Veri | Amaç | Nerede | Süre | Kim erişir |
|---|---|---|---|---|
| Tarama anketi (§1.3) | Profil dengesi | Yönetici dosyası (depo dışı, şifreli) | Seçimden sonra **7 gün**; katılmayanlarınki hemen | Yönetici |
| İletişim (e-posta ya da telefon) | Randevu, G15 | Eşleme tablosu (depo dışı, şifreli) | **G15 + 7 gün** | Yönetici |
| Eşleme (kod ↔ kişi) | Silme ve geri çekme talebi | Aynı dosya | **G15 + 30 gün** (silme talebi süresi; [KIMLIK.md §6](../../packages/sunucu/KIMLIK.md): hesap silmede 30 gün) | Yönetici |
| Ses ve ekran kaydı | Gözlem yedeği, Dö2 ölçümü | Yönetici yerel diski (şifreli); bulut yok | **Analiz bitince; en geç G15 + 30 gün** (öneri) | Yönetici, analizi yapan |
| Gözlem formu | Bulgu | Depo dışı; yalnız kod | Rapor teslimi + 90 gün (**öneri**; anonim) | Yönetici, analiz |
| Oyun günlüğü (komutlar, girişler) | H6, Y1, Y2, Y4 | Test dünyası veritabanı | **Dünya ve hesaplar G15 + 30 gün içinde silinir** | O2, K2 |
| E-posta (giriş) | Magic link girişi | Auth tablosu (G5) | Test hesabıyla birlikte silinir | Sunucu |
| Anonim sonuç tablosu | Rapor | `docs/toplanti/3/` (depo) | Kalıcı; kişisel veri içermez | Herkes |

**Toplanmaz:** ad-soyad (eşleme dışında), kesin yaş, cinsiyet, sağlık, ev adresi, konum, yüz görüntüsü, cihaz kimliği, IP (günlükte tutulmaz; İ2'de yok), parmak izi. İlçe seçimi **il/ilçe düzeyidir**; katılımcı kendi sokağını seçerse ekran kaydında görünür; kayıt bu yüzden silinir ve alıntıda adres yazılmaz.

### 8.3 Onay (açık rıza; ayrı ayrı işaretlenir)

Rıza **yazılı ya da elektronik** alınır ve katılımcıya bir kopya verilir. Her madde **ayrı** işaretlenir (paket rıza değildir):

| # | Rıza konusu | Reddederse |
|---|---|---|
| R1 | Katılım ve gözlem notu | Katılamaz |
| R2 | **Ses** kaydı | **Katılamaz** (kaydı olmayan tek kişilik oturum yapılmaz, §4.1) |
| R3 | **Ekran** kaydı | **Katılamaz** (Dö2 ölçümü ve BK/YA doğrulaması buna bağlı) |
| R4 | 14 gün boyunca **oyun içi davranış kaydı** (sunucu günlüğü) | Katılamaz (H6 (ii) bunu ister) |
| R5 | G15 görüşmesi ve iletişim | S1 ve S2 yine yapılabilir; G15 yapılmaz |
| R6 | **Anonim alıntı** raporda | Alıntı yazılmaz |
| R7 | Test sonrası **Alfa-0 daveti** (ayrı iletişim) | Davet gönderilmez; ayrı rıza |

### 8.4 Kayıt kuralları

- Web kamerası **kapalı**; yüz ve el kaydedilmez.
- Ses ve ekran yerel kaydedilir; **bulut transkripsiyon ve yapay zekâ hizmetlerine ham kayıt yüklenmez** (yurt dışı aktarım olabilir, **doğrulanmadı**). Transkript gerekirse yerelde çıkarılır; ad, mahalle, iş yeri ve telefon silinir ya da `[...]` ile değiştirilir; **ancak ondan sonra** analiz araçlarına verilebilir.
- Kayıt başlamadan önce katılımcıya "kayıt şimdi başlıyor" denir; kapatma isteği her an kabul edilir (R2/R3 geri alınırsa oturum biter).
- Başkasına gösterilen her kayıt parçası (rapor ekranı, alıntı) kodludur.

### 8.5 Kişisel verinin saklanmaması

| Kural | Ayrıntı |
|---|---|
| **Depo yok** | Ses, ekran, ham form, eşleme ve tarama anketi **git deposuna girmez** (ne `docs/` ne `SP`); yalnız §9 şablonuyla yazılmış anonim sonuç ve `insan-testi-olcutler.json` girer |
| **Kod sözlüğü** | K1…K5 ile ad eşlemesi yalnız yönetici dosyasında; rapor ve günlük çıktısı yalnız kodu içerir |
| **Alıntı temizliği** | Alıntıdan ad, mahalle, sokak, iş yeri, işveren, akraba adı çıkarılır; gerektiğinde `[mahalle]` yazılır; kimlik ipucu veren kombinasyonlar ("Gebze'de fırın işleten") de genelleştirilir |
| **Silme takvimi** | G15 + 7: tarama ve iletişim; G15 + 30: eşleme, ses, ekran, test dünyası ve test hesapları (İ3); +90 gün: anonim form |
| **Silme talebi** | Katılımcı istediği an silme talep eder; **30 gün** içinde yerine getirilir ([KIMLIK.md §6](../../packages/sunucu/KIMLIK.md) ile aynı); anonim sonuç tablosundan kişi çıkarılamayacağı için ilgili satır **kodsuz** bırakılır |
| **Silme kanıtı** | İ3'ün çıktısı (0 satır) ve yöneticinin silme tarihi forma yazılır |
| **Üretim kimliği ile ayrım** | Test hesabı üretim dünyasına taşınmaz; Alfa-0'a davet ayrı rıza ve ayrı hesaptır (R7) |

### 8.6 Rıza metni taslağı (okunur ve verilir; hukuki görüşe tabidir **(doğrulanmadı)**)

> **Bölge Stratejisi oyun testi: bilgilendirme ve açık rıza**
>
> **Veri sorumlusu:** (sahibin adı ve iletişim bilgisi). **Amaç:** bu oyunun ilk saatinde, bir gün sonra ve iki hafta içinde nerede zorlandığınızı, neyi anlamadığınızı ve neyi sevdiğinizi anlamak; oyunu düzeltmek.
>
> **Neler toplanacak:** yaş aralığınız ve oyun alışkanlığınızla ilgili birkaç yanıt; oturum sırasında **sesiniz ve ekranınız**; oyunda yaptığınız eylemlerin ve oyuna ne zaman girdiğinizin kaydı (kullandığınız takma kodla); görüşme yanıtlarınız. **Toplanmayacak:** yüzünüz, adresiniz, sağlık bilginiz, cihaz kimliğiniz, IP adresiniz.
>
> **Nasıl saklanacak:** kayıtlar yalnız araştırmacının şifreli bilgisayarında, **bulut hizmetlerine yüklenmeden** tutulur; yalnız araştırmacı erişir. Adınız ve iletişim bilginiz, size verilen koddan ayrı bir dosyadadır. Raporda adınız hiç geçmez; alıntılardan sizi tanıtabilecek bilgiler çıkarılır.
>
> **Ne kadar saklanacak:** iletişim bilginiz son görüşmeden 7 gün sonra, ses ve ekran kaydınız ile oyun hesabınız son görüşmeden en geç 30 gün sonra silinir. Rapordaki anonim bulgular kalır; sizi tanıtmaz.
>
> **Haklarınız:** verinize erişmek, düzeltmek, silinmesini istemek ve rızanızı **istediğiniz an, gerekçe göstermeden** geri çekmek sizin hakkınızdır; geri çektiğinizde katılmayı bıraktığınız için hiçbir olumsuz sonuçla karşılaşmazsınız. Silme talebiniz 30 gün içinde yerine getirilir. Bu hakları kullanmak için: (iletişim).
>
> **Aktarım:** oyun test sunucusu (barındırıcı ve ülke bilgisi: **sahip doldurur**) üzerinde çalışır; ses ve ekran kaydınız hiçbir yere aktarılmaz.
>
> Aşağıdaki maddeleri **ayrı ayrı** işaretleyebilirsiniz:
> ☐ R1 Katılımımın ve gözlem notlarının tutulmasını kabul ediyorum.
> ☐ R2 Sesimin kaydedilmesini kabul ediyorum.
> ☐ R3 Ekranımın kaydedilmesini kabul ediyorum.
> ☐ R4 14 gün boyunca oyundaki eylemlerimin ve giriş zamanlarımın (kodumla) kaydedilmesini kabul ediyorum.
> ☐ R5 Son görüşme için benimle iletişime geçilmesini kabul ediyorum.
> ☐ R6 Sözlerimin anonim biçimde rapora alıntı olarak girmesini kabul ediyorum.
> ☐ R7 Test sonrasında Bölge Stratejisi alfa davetini ayrıca almayı kabul ediyorum.
>
> Tarih: ___ İmza ya da elektronik onay: ___

### 8.7 Hukuki görüş gerektirenler (hepsi **doğrulanmadı**)

| Konu | Soru | Neden önemli |
|---|---|---|
| Ses ve ekran kaydının kişisel veri sınıfı, açık rıza biçimi | R2/R3'ün ayrı onayı yeterli mi; ek aydınlatma metni gerekli mi | KVKK aydınlatma ve açık rıza yükümlülüğü |
| **Yurt dışı aktarım** | Test sunucusu AB'de (Hetzner, K34) ise e-posta ve oyuncu kimliğinin aktarımı | Ses ve ekran kaydı yerelde kaldığı için yalnız e-posta/oyuncu id etkilenir; sunucu Türkiye'de ya da sahibin makinesinde tutulursa sorun kalkar |
| Takma kodun kişisel veri oluşu | K1…K5 + eşleme: yeniden kimliklendirme riski | Takma ad anonimleştirme **değildir** ([canlı dünya §6.4](canli-dunya-simulasyonu.md): "takma adlaştırma anonimleştirme değildir") |
| Saklama süreleri (7 / 30 / 90 gün) | Amaç sınırlaması ve ölçülülük | Öneridir; hukuki görüşle netleşir |
| Teşekkür bedeli | Vergi ve belge yükümlülüğü | Sahip işi |
| 18 yaş altı | Hariçtir; yaş beyanı yeterli mi | Çocuk verisi |
| Katılımcının e-postasını test hesabı olarak kullanması (G5) | Test için gerçek e-posta mı, **takma e-posta** mı | §8.5 |

### 8.8 Şikâyet ve olay

Katılımcı oturum sırasında ya da sonrasında rahatsızlık, veri ihlâli şüphesi ya da silme talebi bildirirse: yönetici **aynı gün** kayda geçirir, ilgili kayıtlar **derhal** askıya alınır (analiz dışı), talep 30 gün içinde yerine getirilir; ihlâl şüphesinde sahip bilgilendirilir. Yönetici, katılımcıya sahibe doğrudan başvurabileceği bir yol verir.

---

## 9. Sonuç raporu şablonu

Dosya: `docs/toplanti/3/insan-testi-sonuc.md` (ve `insan-testi-olcutler.json`, §7.3). **Ad yoktur, yalnız kod.** Aşağıdaki başlıklar sırayla doldurulur.

```markdown
# İnsan testi sonucu (G10)

## 0. Künye
| Alan | Değer |
|---|---|
| Test sürümü (commit) | <sha>, <tarih> |
| Dünya | taze / yaşlı (60. gün); tohum; emsal bot sayısı |
| Oturum tarihleri | S1: <tarih aralığı>; S2: <>; G15: <> |
| Yönetici / gözlemci | kod |
| Kapı listesi (Ö1–Ö13) | her madde: tamam / eksik; eksikler dipnotta |
| Gerçekleşen n | 5 / <n> (çekilen, değiştirilen) |

## 1. Özet (en çok 8 satır)
- Ana bulgu 1…
- Ölçüt sonucu: <geçti> / <belirsiz> / <kaldı> / <ölçülmedi> sayısı
- Gözlemli oturum üst sınırdır: <hangi sonuç hassas>
- En önemli üç düzeltme: …

## 2. Katılımcılar
| Kod | Profil | Cihaz / OS | İkamet (il) | Grup | Oturumlar | Çekildi mi |

## 3. Ölçüt tablosu
| Ölçüt | Eşik | n=5 karşılığı | Sonuç (k/5) | Karar | Not |
(Y1, Y2 60/10, Y4 (D1 randevusuz, D7), Y5, Y6, Y7, Y8, Y10, H6 (i), H6 (ii) resmî/geniş/bağımsız, A0-14, A0-13, A0-11, Gö8, H4 ön)

## 4. Süre tablosu (adım × katılımcı)
| Adım | K1 | K2 | K3 | K4 | K5 | Ortanca | En az | En çok |
(S1.1…S1.9, S2.2; süreler dk:sn)

## 5. Takılma haritası (adım × sınıf × katılımcı)
| Adım | T1 | T2 | T3 | T4 | T5 | T6 | T7 |

## 6. Yanlış anlama listesi
| Kod | Ne sanıldı | Gerçek | Kaç kişi | Kimler | Alıntı kodu |

## 7. Duygu eğrisi (adım × katılımcı)
| Adım | K1 | K2 | K3 | K4 | K5 |  (DU kodları; yoğunluk)

## 8. Bulgular
| ID | Başlık | Adım | Ciddiyet (S0–S3) | Sıklık (k/5) | Profil | Kanıt (kod/alıntı) | Neden | Öneri | **Geri dönüş sınıfı** (kolay / zor) | Sahip (rol) | Bilinen kusur mu (BK#) |

## 9. Bilinen kusurlar
| BK | Gözlendi mi (k/5) | Etki | Kapandı mı |

## 10. 14 günlük takip
| Kod | G1 randevusuz giriş | G7 giriş | 14 gün giriş sayısı | (i) | (ii) resmî | (ii) geniş | (ii) bağımsız | İlk yapı gecikmesi | Sessiz çıkış nedeni |

## 11. Sınırlar
- n=5; gözlemli oturum; test dünyasındaki emsal; platform dağılımı; …

## 12. Eşik kaçtıysa (§6.5)
| Ölçüt | Sonuç | Eylem | İkinci tur gerekli mi |

## 13. Karar önerileri
- **Kolay geri dönülür (doğrudan uygulanır):** …
- **Geri dönüşü zor (baş lider / sahip kararı; n=5 ile alınmaz):** …

## 14. KVKK uyum kontrolü
| Madde | Durum |
| Rıza R1–R7 (kaç kişide hangileri) | |
| Silme takvimi uygulandı mı (tarihler) | |
| Ham kayıt depoda yok | |
| İ3 silme çıktısı | |
```

**Bulgu sıralaması.** Bulgular önce ciddiyete (S3→S0), sonra sıklığa göre sıralanır; **geri dönüş sınıfı** sütunu §10'daki kolay/zor listesinden doldurulur. Rapor bulgunun yanına çözümü **yazmaz zorunda değildir** ("öneri" sütunu serbesttir); karar sahibi lider ve sahiptir.

---

## 10. Geri dönüşü zor kararlar

Test düzeninin ve kullanılacak sonuçların geri alınması zor olanları. Hepsi **test başlamadan** kapanmalıdır.

| # | Karar | Seçenekler | Neden geri dönüşü zor | Öneri | Aciliyet |
|---|---|---|---|---|---|
| **GZ-1** | **Test sürümünün dondurulması** (commit, dünya tohumu, parametreler) | (a) tek dondurma; (b) oturumlar arasında düzeltme serbest | Oturum 1'den sonra değişiklik, karşılaştırılabilirliği bozar; kritik kusurda ikinci tur gerekir ve katılımcı **tek kullanımlıktır** | **(a)**; kritik hata varsa test durur ve **tamamı yenilenir** (yeni 5 kişi) | Test öncesi |
| **GZ-2** | **Rıza metni ve saklama süreleri** | (a) §8.6 taslağı; (b) hukuki görüşten sonra | İmzalanan metin geri alınamaz; süre uzatmak **yeniden rıza** ister; kayıt alındıktan sonra "toplamamış olmak" mümkün değildir | **(b) tercih**; olmazsa (a) ve sahibin yazılı riski | Test öncesi (ilk aday teması **öncesinde**) |
| **GZ-3** | **Ses ve ekran kaydı** (alma kararı) | (a) kayıt var; (b) yalnız not | Alınmış kayıt silinse bile "izlendim" hissi kalır; kayıt yoksa Dö2 ve BK/YA doğrulaması **ölçülemez** | **(a)** + R2/R3 ayrı onay + 30 gün silme | Test öncesi |
| **GZ-4** | **Eşiklerin ve karar kurallarının önceden yazılması** (§0.2, §6) | (a) bu dosya, commit'lenmiş; (b) sonuçtan sonra | Sonucu görüp eşik oynamak yanlılıktır; geri dönüşü, rapora duyulan güveni bozar | **(a)**: bu dosyanın commit'i **test başından önceki** damga sayılır | Test öncesi |
| **GZ-5** | **İpucu merdiveni ve gözlem kodları** | (a) §4.6, §5; (b) oturum sırasında uyarlama | Birinci oturumdan sonra değişen kural, önceki oturumları karşılaştırılamaz kılar | **(a)**; pilot oturumda (K0) denenir | Test öncesi |
| **GZ-6** | **Katılımcı seçimi** (profil matrisi, 5 kişi) | (a) §1.1; (b) kolay ulaşılanlar | Oturum alındıktan sonra o kişi bir daha yeni oyuncu olamaz; dengesiz çıkarsa yeniden **yeni kişi** gerekir | **(a)**; ikinci tur için ayrı havuz | Aday teması öncesi |
| **GZ-7** | **Gözlemli ve gözlemsiz kol** (H6 (ii)) | (a) yalnız gözlemli (bu test); (b) +2 gözlemsiz; (c) gözlemsizi Alfa-0 kohortuna bırak | Gözlemli veriyle "H6 (ii) geçti" diyip kalmak, **iyimser** bir kanıtı kalıcı karara çevirebilir | **(a)+(c)**: (ii) "üst sınır" yazılır, gözlemsiz ölçüm Alfa-0 A15'e | Rapor öncesi |
| **GZ-8** | **Test sunucusunun yeri** (staging; AB / TR / yerel) ve veri akışı | (a) sahibin makinesi; (b) Hetzner AB; (c) Türkiye barındırma | E-posta ve oyuncu kimliği aktarımı sonradan geri alınamaz; hukuki sınıfı değişir **(doğrulanmadı)** | **(a)** ya da (c); (b) hukuki görüşten sonra | Test öncesi |
| **GZ-9** | **Gerçek e-posta ile giriş** (G5) ve test hesabı silme | (a) katılımcının kendi e-postası; (b) takma e-posta yönlendirmesi | Gerçek e-posta auth tablosuna girer; silme (İ3) hata yaparsa kalır | **(b)** mümkünse; yoksa (a) + İ3 | G5 kapanınca |
| **GZ-10** | **n=5 verisiyle "geri dönüşü zor" karar almama kuralı** | (a) kural; (b) esnek | Sonuçla zor kararı (kimlik, şema, ödül tablosu, yurt boyutu, ayak izi) vermek, **kalıcı** ödül ve beklenti sorunu yaratır (bkz. [donus DK-5/6/7](donus-deneyimi.md), [rehber GK-1](rehber-gorevler.md)) | **(a)**: zor karar ikinci tur + Alfa-0 kohortu | Rapor |
| **GZ-11** | **Teşekkür bedeli ve biçimi** | (a) sabit, sonuca bağlı değil; (b) tamamlamaya bağlı | Tamamlamaya bağlı ödül davranışı bozar ve tekrarlı testte beklenti yaratır | **(a)** | Aday teması öncesi |

**Bulgu türleri ve geri dönüş sınıfı** (rapor tablosunda "geri dönüş sınıfı" sütunu için):

| Kolay geri dönülür (doğrudan uygulanabilir) | Zor (n=5 ile karar verilmez; baş lider ve sahip) |
|---|---|
| Metin ve ton, ekran adı, bant eşikleri, madde bütçeleri, şablon metinleri ([donus §8](donus-deneyimi.md) "kolay geri dönülür"); kart sırası, görev adları, tetik sıcaklığı ([rehber §7](rehber-gorevler.md)); düğme yeri, panel düzeni, renk, boyut, BK'ler | Başlangıç paketi tutarları (hibe, yurt hücre sayısı, ilk yapı indirimi), ayrılmış hücre kuralı, kalkan süresi; kavram sözlüğü ve ödül tablosu ([rehber GK-1, GK-4](rehber-gorevler.md)); olgu şeması ve çapalar ([donus DK-1, DK-3](donus-deneyimi.md)); mal ve yapı kimlikleri ([GDD AÖ-3, AÖ-4](oyun-tasarim-belgesi-v1.md)); Defter'e zorunluluk ya da kilit getirmek ([rehber GK-3](rehber-gorevler.md)) |

---

## 11. Açık sorular (sahip, baş lider, lider için)

| # | Soru | Önerilen varsayılan |
|---|---|---|
| **S1** | **Oturumları kim yönetecek?** Bu kılavuz bir insana yazıldı; ajanlar katılımcıyla görüşemez | Sahip ya da görevlendirdiği kişi; pilotta A1 canlı kılavuz dinler |
| **S2** | H6 (ii) için **gözlemsiz kol:** ek 2 kişi gerekli mi, yoksa Alfa-0 kohortu mu? | (c): Alfa-0 kohortu, A15 huni ölçümü; bu testte "üst sınır" |
| **S3** | **Yaşlı dünya (60. gün)** hazırlanabilir mi (anlık görüntüden bot dünyası)? Araç var mı? | Bilinmiyor **(doğrulanmadı)**; O2'ye sorulur; yoksa taze dünya + emsal bot |
| **S4** | **Y10 işlemselleştirmesi** (§6.3) ve **Y4 randevulu D1** (§6.4) lider onayı | Öneri: işlemsel Y10, randevusuz D1 |
| **S5** | **Teşekkür** tutarı ve biçimi; bütçe sahibi kim? | Sahip kararı; sabit |
| **S6** | H6 (ii)'de **hangisi bağlayıcı:** resmî (önerilen açılış türü) mü, geniş (herhangi üretim yapısı) mı? | Geniş (kilitsiz yön); ikisi raporlanır |
| **S7** | **Örnek işletme hesabı** (H4-1) için mekanizma var mı (İ5)? | Yok; O2 ya da K2 ile konuşulur; olmazsa H4-1 katılımcının kendi yapısıyla sınırlı |
| **S8** | K1 bandı: kodda "kısa kart", tasarımda "tek satırlık şerit": hangisi doğru? | Tasarım belgesi bağlayıcı sayılırsa kod değişir; A1 testte ikisini de ölçer |
| **S9** | **Erişilebilirlik turu** (renk körlüğü, büyük yazı) kim ve ne zaman? | Alfa-0 öncesi ayrı, rızayla; bu testte yok |
| **S10** | **İ1–İ5** istekleri hangi sprintte (G10, K2, O2)? Test tarihini belirleyen kritik yol budur | İ1 ve İ3 zorunlu, İ2 H6 (ii) ve Y4 için zorunlu |
| **S11** | Test sunucusu nerede barınacak (GZ-8)? | Sahibin makinesi ya da Türkiye barındırma; hukuki görüşe kadar AB değil |
| **S12** | Test **tarihi:** Ö1–Ö13 sağlandıktan sonra bir hafta ek pilot ve rapor için | Öneri: G9 + 3 gün |

---

## 12. Doğrulanmayanlar ve sınırlar

| Konu | Durum |
|---|---|
| Tüm süre, eşik ve oran sayıları (≤10 dk, ≥%70, 12 sn, 336 saat, saklama süreleri) | **Öneri;** kalibre edilmedi |
| "5 kullanıcı ≈%85 sorunu bulur" | **Doğrulanmadı** (kaynak okunmadı) |
| SEQ ölçeği 7 puan | **Doğrulanmadı** (kaynak okunmadı) |
| KVKK yorumları (ses ve ekran kaydı, takma ad, yurt dışı aktarım, saklama süresi, sağlık verisi) | **Doğrulanmadı;** hukuki görüş yok (K34, A1-6) |
| "Hibe 50.000 ₺; ilk görüntüde 40.000 ₺: 10 ayrılmış hücre bedeli" | **Doğrulanmadı;** ekran görüntüsünden çıkarım; yurt 6 hücre ve hesap başına ayrılmış 12 hücre tavanı parametrede (`packages/veri/icerik/parametreler.json`, `mulk.yeniOyuncu`: `yurtHucre: 6`, `ayrilmisHucreHesapTavani: 12`); ekranda "16 hücre" görünüyor |
| Yerleşik ekran kaydının tüm Android ve iOS sürümlerinde çalışması; OBS'nin Windows'ta denenmemesi | **Doğrulanmadı** |
| `BOLGE_KIMLIK=gelistirme` belirtecinin istemciye bağlantıyla verilebilmesi | **Doğrulanmadı;** K1'e sorulur |
| Test dünyasının "60. gün" yaşlandırılması için araç | **Doğrulanmadı** |
| §7.3 SQL sorgusu | **Denenmedi**; şema `001-baslangic.sql`'den okundu |
| Yerleş ve Defter ekran tanımı | Ekran görüntülerinden ve `packages/istemci/src` dosyalarından; sürüm değiştikçe eskir |
| Hiçbir test koşulmadı; hiçbir sunucu başlatılmadı | Bu turda yalnız belge yazıldı |

---

## Kaynaklar (iç)

[baslangic-ve-ustalik](baslangic-ve-ustalik.md) (§1, §2.2–§2.4, §7 A15, §8) · [rehber-gorevler](rehber-gorevler.md) (§3, §5, §7) · [donus-deneyimi](donus-deneyimi.md) (§2.7, §2.9, §2.11, §5.7, §6, §8) · [GDD v1](oyun-tasarim-belgesi-v1.md) (§6.4, §6.5) · [H1–H9 tanımları](../olcum/h1-h9-parsel-tanimlari.md) · [docs/10 §5A](../10-gorev-listesi.md) · [docs/11 §6.1–§6.2](../11-urun-donusu.md) (A0-6, A1-5, A1-7) · [docs/12 §13–§14](../12-yon-taslagi.md) · [docs/13](../13-toplanti-notu-1.md) · [docs/14](../14-takim-modeli.md) · [KIMLIK.md](../../packages/sunucu/KIMLIK.md) · [sunucu README](../../packages/sunucu/README.md) · [docs/toplanti/2/](../toplanti/2/) · [canlı dünya §6.4](canli-dunya-simulasyonu.md) · [harman R20, R22](oyun-kimligi-harman.md) · [00 R5](../00-vizyon-ve-kararlar.md).
