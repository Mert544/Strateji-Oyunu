# 00 — Vizyon ve Kararlar

> **Özet.** "Bölge Stratejisi", gerçek Dünya haritasında gerçek zamanlı akan, oyuncunun bir bölge veya devlet yöneticisi olduğu bir strateji oyunudur; Capital Rift'in görünür üretim ağı hissini devlet ölçeğine taşır. Bu belge vizyonu, verilmiş kararları (ve her kararın kaynağını), zaman modelini, katman derinliklerini, prototip kapsamını ve hâlâ açık olan kararları toplar. Plan koda *kapılarla* geçer: önce arayüzsüz simülasyon, arayüz yalnızca hipotezler sınandıktan sonra.

**Kaynak kısaltmaları.** **[PDF]** = sahibin "Bölge Stratejisi — Prototip Planı v1" belgesi (30 Eylül 2026, @Mert); **[Oturum]** = takım liderinin bu çalışma oturumunda verdiği kararlar; **[Ar-Ge]** = bu repodaki araştırma/Ar-Ge dokümanlarından türeyen öneri (henüz karar değil).

İlgili belgeler: [01 — Rakip ve Pazar Araştırması](01-rakip-ve-pazar-arastirmasi.md) · [02 — Tasarım Ar-Ge](02-tasarim-arge.md) · [03 — Teknik Mimari](03-teknik-mimari.md) · [04 — Yol Haritası](04-yol-haritasi.md) · [06 — Simülasyon Spesifikasyonu](06-simulasyon-spesifikasyonu.md)

---

## 1. Vizyon

- Oyun, **gerçek Dünya haritasında** gerçek zamanlı akan bir stratejidir. Oyuncu bir bölgenin veya devletin doğrudan yöneticisidir.
- Capital Rift'te oyuncuyu tatmin eden şey, üretim ve taşıma ağının **görünür** olmasıdır (talep düğümde görünür, kapasite eklemek tek aksiyondur, etkisi akış çizgisinde okunur; bkz. [01](01-rakip-ve-pazar-arastirmasi.md)). Biz bu hissi **devlet ölçeğine** taşıyoruz: tek tek mülkler değil, bölgeler ve bölgeler arası taşıma ağı.
- Ana tasarım hedefi: **20–25. günde sistemlerin tekrarından doğan sıkılmayı tasarımla önlemek.** Bu, projenin en büyük riskidir ve şu anda yalnızca ekibin gözlemine dayanır (bağımsız tutma verisi yoktur; bkz. §9).
- Yöntem: kapılı geliştirme. Önce arayüzsüz, deterministik bir simülasyon yazılır; yedi hipotez (H1–H7) bot simülasyonuyla ve (H4 için) insan testiyle sınanır; arayüz bundan sonra gelir. Kapılar **kanıt sırasıdır, takvim taahhüdü değildir** ([04](04-yol-haritasi.md)).

## 2. Kararlar tablosu

| # | Konu | Karar | Kaynak |
|---|---|---|---|
| K1 | Oyuncu rolü | Doğrudan bölge/devlet yöneticisi | [PDF] |
| K2 | Harita | Gerçek Dünya; gerçek coğrafya ve ülkeler. Sınır ve isim politikası **açık karar** (§8) | [PDF] |
| K3 | Yapı | Beş ayrı katman: ekonomi, lojistik, araştırma-teknoloji, politika, askeri; ortak veriyle bağlı | [PDF] |
| K4 | Zaman | Tur yok; gerçek zaman 1x, günlük ritim; dünya hızı ayarlanabilir parametre | [PDF] |
| K5 | Çağ ve sezon | Kullanılmayacak | [PDF] |
| K6 | Görsel biçim | 2D harita; üretim ve taşıma akışı görünür | [PDF] |
| K7 | Ana hedef | 20–25. gün sıkılmasını tasarımla önlemek | [PDF] |
| K8 | Kapsam | Ar-Ge dokümanları + Aşama 2 kodu (arayüzsüz simülasyon) | [Oturum] |
| K9 | Teknoloji yığını | TypeScript, pnpm monorepo, Vitest | [Oturum] |
| K10 | Dünya modeli | **Kalıcı tek dünya** (sezon yok; K5 ile uyumlu). Geç katılım sorunu koruma süresi, puan bandı ve yetişme yardımıyla (H6) çözülür. Sezon seçeneği açık not olarak kalır (§8) | [Oturum] |
| K11 | Dil | Her şey Türkçe; kodda tanımlayıcılar ASCII Türkçe | [Oturum] |
| K12 | Ekip | Takım lideri (Claude) + Sonnet uygulayıcı ajanlar | [Oturum] |
| K13 | Gelir modeli ilkesi | Kritik kararlarda parayla güç yok. Gelir modeli prototip kapsamı dışında | [PDF] |
| K14 | İçerik üretimi | Şablonlu, veriyle tanımlanan içerik (içerik üretimi pahalı) | [PDF] |
| K15 | Test haritası | Sentetik (kıyı, dağ, ova, liman, dar geçit taşıyan kurgusal bölge grafiği); gerçek dilim seçilince aynı veri biçimine geçilir | [PDF] |
| K16 | Plan biçimi | Kapılar kanıt sırasıdır; geçilmeyen kapıda önceki aşama yinelenir | [PDF] |

## 3. Zaman modeli

**Dünya saati 1x; ritim günlük; tur yok.** Simülasyon sürekli zamanlıdır: olaylar arasında tüm oranlar sabittir, üretim "zaman damgası × oran" ile hesaplanır (her tıklamada değil). Teknik karşılığı [03](03-teknik-mimari.md) ve [06 §2–3](06-simulasyon-spesifikasyonu.md) içindedir.

### 3.1 Dört zaman kuralı [PDF]

1. **İlk geri bildirim saatler içinde;** hiçbir karar 72 saatten uzun sessiz kalmaz.
2. **Erken oyun hızlı, sonra yavaşlar:** ilk oturumda dakikalar, bölge büyüdükçe saat/gün.
3. **Çevrimdışı kayıp sınırı:** tek savaş penceresinde kaybedilebilecek stok oranı üst sınıra bağlıdır; önceden verilen savunma emirleri geçerlidir.
4. **Dünya hızı parametredir:** 1x, 6x, 24x denenir. Uzun vadeli ölçümler yüksek hızlı simülasyonla, insan testi 1x'te yapılır.

### 3.2 Olay süreleri [PDF]

| Olay | Süre |
|---|---|
| Üretim | Sürekli (çevrimdışıyken birikir) |
| Emir değiştirme | Anında |
| Tesis inşası | 2–12 saat |
| Bölge içi taşıma | 1–8 saat |
| Askeri üretim partisi | 6–24 saat |
| Teknoloji araştırması | 1–5 gün |
| Uzak deniz taşımacılığı | 1–3 gün |
| Savaş ilanı + hazırlık | 12–24 saat |
| Çatışma penceresi | 24 saat |
| Yeni oyuncu koruması | 7–14 gün |

Bu aralıklar PDF'deki tasarım hedefleridir. Kodda kesin değerler `packages/veri/icerik/parametreler.json` içinde tutulur ve kalibrasyonla değişebilir (savaş hazırlığı için [06 §6](06-simulasyon-spesifikasyonu.md) `ilanHazirlikSaatMin/Max` ve `pencereSaat` parametrelerini kullanır).

## 4. Katman derinlikleri

Beş katmanın hepsi **sığ ama bağlıdır; derinlik lojistiktedir.**

| Katman | Derinlik | Kural (v0) [PDF] | Spesifikasyon |
|---|---|---|---|
| Ekonomi | Orta | 4–5 üretim zinciri (cevher, çelik, makine parçası, elektronik zinciri); nüfus istihdamı sürekli üretir; bölgeler arası ticaret sınırlı derinlikli dünya pazarıyla tamamlanır | [06 §4](06-simulasyon-spesifikasyonu.md) |
| Lojistik | **Derin (ana yenilik)** | Kara/deniz/hava kapasitesi ağda paylaşılır; sivil ve askeri mal aynı ağdan geçer; "neresi açık" kapsam görünümü | [06 §5](06-simulasyon-spesifikasyonu.md) |
| Askeri | Sığ | Birlikler ekonomi zincirinden üretilir, ikmal ağından beslenir; çatışma önceden ilan edilir, 24 saatlik pencerede otomatik çözülür; kayıp üst sınırı vardır | [06 §6](06-simulasyon-spesifikasyonu.md) |
| Teknoloji | Sığ | 5–8 düğüm; her düğüm yeni yöntem/karar açar, yalnızca yüzde artışı vermez | [06 §7](06-simulasyon-spesifikasyonu.md) |
| Politika | Sığ | Anlaşma ve yaptırım pazar erişimini değiştirir; vergi ve ortak altyapı kararları açık yetki sınırları içinde | [06 §8](06-simulasyon-spesifikasyonu.md) |

> Not: 06 spesifikasyonu 12 mal ve altı zincir tanımlar (gıda, çelik, makine, elektronik, yakıt birer sivil zincir; mühimmat askeri zincir) ile altı teknoloji düğümü içerir. Teknoloji düğüm sayısı PDF'in 5–8 aralığındadır; zincir sayısı, askeri zincir sayılmazsa PDF'in 4–5 aralığının üst sınırındadır. Çelişki halinde 06 uygulama kaynağıdır.

## 5. Prototip kapsamı

**Kapsam içi [PDF]:**

- Gerçek Dünya'nın **tek coğrafya dilimi (~30–60 bölge)**; beş katmanın hepsi sığ ama bağlı, derinlik lojistikte.
- Dilim seçiminde aranan: kaynak çeşitliliği, birden çok liman, en az iki dar geçit, 3–4 devlet veya blok.
- Gerçek dilim seçilene kadar **sentetik test haritası** (`packages/veri/haritalar/sentetik-50.json`, küçük doğrulama haritası `mini-6.json`).
- Arayüzsüz çekirdek simülasyon ve ölçüm koşum takımı (Aşama 2).

**Kapsam dışı [PDF]:** hesap/giriş, ödeme, çok oyunculu eşzamanlı sunucu (ilk aşamada), mobil uygulama, 3D, gerçek harita karoları ve lisans işleri.

## 6. Hipotezler (özet)

Tam ölçüm tanımları [02 §8](02-tasarim-arge.md) içindedir. **Eşikler başlangıç önerisidir; ilk simülasyondan sonra kalibre edilir** [PDF].

| # | Hipotez | Vazgeçme ölçütü |
|---|---|---|
| H1 | Bölgeler gerçekten farklı | Aynı politika bölgelerin %70'inden fazlasında ilk üçte |
| H2 | Tekrar düşük kalır | 30. günde tekrar endeksi %60 üzeri |
| H3 | Askeri üretim ekonomiyi değiştirir | Kapasitenin %20'si askeriyeye kayınca hiçbir mal fiyatı veya kapsam %10 değişmiyorsa |
| H4 | Lojistik okunur | 5 kişilik testte en az 4 kişi "neresi açık ve neden" sorusunu 60 saniyede yanıtlayamıyorsa |
| H5 | Çevrimdışı kayıp sınırlı | 48 saat çevrimdışı oyuncunun tek pencerede stok kaybı %25 üst sınırını aşarsa |
| H6 | Geç katılan işe yarar | Yeni oyuncu 14 günde yerel ekonominin ilk yarısına ulaşma oranı %50'den azsa |
| H7 | Ayarla ve unut ne çöker ne eşitlenir | Yalnızca akış kuran oyuncunun 24/48/72. saatte üretimi, aktif oyuncuya göre %50–85 aralığı dışındaysa |

## 7. Rakip derslerinden türeyen ilkeler

Ayrıntı ve kaynaklar [01 §4](01-rakip-ve-pazar-arastirmasi.md) içindedir. Prototip kuralları [PDF]:

- Kritik kararlarda ücretli avantaj yok; günlük giriş ödülü yok (angarya algısı).
- Her bölgede farklı en iyi strateji; tekrar endeksi ölçülür (H1, H2).
- Politika düzeyinde emir; kendiliğinden çalışan lojistik ağı (mikro yönetim yok).
- Hazır savunma emirleri ve kayıp üst sınırı (çevrimdışı vurulma yok).
- Koruma süresi, puan bandı, geri dönüş/yetişme yardımı (kartopu ve eski oyuncu avantajına karşı).
- Sınırlı derinlikli, açıkça işaretli dünya pazarı (düşük nüfusta pazar çökmesine karşı).
- Sınır ve isim politikası önceden yazılı.

## 8. Açık kararlar ve öneriler

| # | Açık karar | Durum / öneri | Kaynak |
|---|---|---|---|
| A1 | **Coğrafya dilimi** | Açık; sentetik haritayla ilerlenir. Seçim ölçütleri §5'te. Gerçek dilimde admin-1 poligonları sadeleştirilip 30–60 bölgeye birleştirmek önerilir ([03 §7](03-teknik-mimari.md)) | [PDF], [Ar-Ge] |
| A2 | **Sınır ve isim politikası** | Açık. **Öneri:** oyuncu *gerçek bir ülkeyi değil*, gerçek coğrafyadaki bir *bölgeyi* yönetir; ittifaklar oyun içi bloklardır; güncel gerçek çatışmalar senaryo yapılmaz. Gerekçe: eRepublik'te Tayvan'ın 2010'da eklenmesi sınır hassasiyeti örneği olarak anılır (topluluk yorumu, tek kaynak) | [PDF] |
| A3 | **Sezon seçeneği** | Kalıcı dünya seçildi (K10). Geç katılım çözümü (koruma, puan bandı, yetişme) H6'da başarısız olursa sezonlu/raundlu model yeniden masaya gelir. Açık not olarak kalır | [Oturum] |
| A4 | **Gelir modeli** | Prototip kapsamı dışında. İlke: kritik kararlarda parayla güç yok; kolaylık ve kozmetik satılabilir, zaman atlama ve kapasite satılmaz ([01](01-rakip-ve-pazar-arastirmasi.md)) | [PDF], [Ar-Ge] |
| A5 | **H4 vazgeçme ölçütü sıkılığı** | PDF'teki ölçüt (5 kişiden ≥4'ü yanıtlayamazsa vazgeç) gevşektir: 5 kişiden 2'si yanıtlasa bile geçilir. Daha sıkı bir geçme eşiği (ör. ≥4/5 yanıtlar) önerilir; karar takım liderine aittir ([04 §5](04-yol-haritasi.md)) | [Ar-Ge] |
| A6 | **H6 işletimsel tanımı** | "Yerel ekonominin ilk yarısı" ifadesinin ölçüm tanımı netleştirilmelidir ([02 §8](02-tasarim-arge.md)'de taslak) | [Ar-Ge] |
| A7 | **Yetişme mekanizmalarının kapsamı** | 06 v0'da yalnızca yeni oyuncu koruması vardır; inşa maliyeti indirimi, teknoloji yayılımı ve puan bandı henüz spesifikasyonda yok ([02 §7](02-tasarim-arge.md)) | [Ar-Ge] |
| A8 | **Çok oyunculu sunucu** | Ön aşamada kapsam dışı; mimari buna hazır tutulur ([03 §8](03-teknik-mimari.md)) | [PDF] |

## 9. Riskler

| Risk | Açıklama | Azaltma |
|---|---|---|
| **R1: 20–25. gün sorunu yalnızca gözlem** | Bağımsız tutma verisi yoktur; sorun şu an yalnızca ekibin gözlemidir. Yayımlanmış bir kaynak da bulunamadı ([01 §5](01-rakip-ve-pazar-arastirmasi.md)) | Hipotez olarak ele alınır (H2); tekrar endeksi ve karar tükenmesi ölçülür |
| R2: Önceki prototip dersi | Gate 0 prototipinde bot taraması kararların ~10–15. turda tükendiğini gösterdi (tüm yatırımlar bitti, stok birikti) | Kapasiteye bağlı yinelenen lavabolar, bozulma, depo tavanı ([02 §2–3](02-tasarim-arge.md)); "karar tükenmesi" metriği |
| R3: Akış modelinin riski | Ayarla-unut eğilimi (H7) ile sürekli çevrimiçi oyuncunun avantajı | Kuyruk derinliği ve kalibrasyon; H7 eşiği |
| R4: Ekip kapasitesi | İçerik üretimi pahalı (bir Game Developer kuramına göre içerik saati başına ~8 geliştirme saati; **tahmin**) | Şablonlu, veriyle tanımlanan içerik |
| R5: Kanıt sınırı | İnsan tutma verisi ancak oynanabilir prototipte ölçülür. **Simülasyon dengeyi ölçer, eğlenceyi kanıtlamaz** | Aşama 3 insan testleri ([04](04-yol-haritasi.md)) |
| R6: Kaynak kalitesi | Rakip araştırmasının bir kısmı tek kaynaklı topluluk yorumlarına dayanır; Capital Rift bilgisi büyük ölçüde geliştirici videolarından gelir | Kaynaklar "yön göstergesi" sayılır; doğrulanmamış bilgi açıkça işaretlenir |
