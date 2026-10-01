# Araştırma — Arayüz ve UX: Parsel Dünyası için v1 Kavramı

> **Özet.** Mevcut küre arayüzü incelendi ve rakip oyunlardaki kademeli yakınlaşma, harita modu, bildirim, yerleştirme ve onboarding desenleri araştırıldı. **Öneri:** beş görünüm düzeyi kullanılsın: küre L0 → il L1 → ilçe L2 → arsa L3 → sokak L4. Her düzey yalnız kendi bilgisini göstersin. Sürekli akan çizgiler yerine tuşla açılan **8 mercek** (6 katman + Sahiplik + Fiyat) gelsin. Yapı başına **tek rozet** olsun (▲ eksik girdi, ◯ boşta, ✓ bitti). En çok 5 maddelik bir **Dikkat** paneli bulunsun. Yerleştirme hayaletle yapılsın; inşa 4 aşamalı olsun (Temel, İskele, Gövde, Tamam). Türkçe biçim kuralları tek bir biçimleyicide toplansın. Kararlar [11 §9](../11-urun-donusu.md#9-arayüz-v1) içindedir.

**Durum ve güvenilirlik.** 1 Ekim 2026'da derlendi. Kaynaklar satır içinde bağlıdır. Capital Rift bilgisi geliştiricinin TikTok açıklamasından gelir ve **doğrulanmamıştır**. Oyuncu şikâyetleri tek forum başlıklarına dayanır ve yön göstergesi sayılmalıdır. Bu rapor kod içermez.

İlgili belgeler: [11 — Ürün Dönüşü](../11-urun-donusu.md) · [Sokak seviyesi 3D](sokak-seviyesi-3d.md) · [Oyun tasarımı: parsel dünyası](oyun-tasarimi-parsel.md) · [3D teknoloji](3d-teknoloji.md)

---

## 0. Mevcut kürenin beş sorunu

Belgeler ve iki ekran görüntüsü incelendi:

| # | Sorun | Ayrıntı |
|---|---|---|
| 1 | **Ekranda aynı anda çok şey var** | Akış çizgileri, bölge başına farklı simgeler, üst üste binen bölge etiketleri ve 10'dan fazla mal çipi birlikte görünüyor |
| 2 | **Sekme çubuğu sıkışık** | "Hazine Darboğaz" birbirine yapışıyor |
| 3 | **Hız düğmeleri fazla öne çıkıyor** | 600×–86400× düğmeleri en değerli yerde, üst ortada |
| 4 | **Yasal metin kenar panelini kaplıyor** | Atıf metni sağ panelin altını dolduruyor |
| 5 | **İnşa bir form** | "Tesis kur" bir açılır liste ve onay kutusu; yerleştirme değil |

---

## 1. Kademeli yakınlaşma: bölge → il → ilçe → arsa → yapı

**Diğer oyunlardaki desenler**
- **Sabit yakınlık düzeylerinde çizim biçimini değiştir.** Victoria 3, çok uzaklaşınca 3D haritadan "kâğıt harita"ya geçer; önemli şeylerin öne çıkması için ayrıntı ile boyut arasında denge kurar ([Dev Diary #49](https://www.paradoxinteractive.com/games/victoria-3/news/dev-diary-49-graphic-overview)).
- **Arsaları yalnız yakınlaşınca göster.** Upland arsaları yaklaşana kadar gizler ([investfourmore](https://investfourmore.com/buy-virtual-real-estate-upland/)). Earth2 de aynısını yapar: "karoları görmek için belli bir düzeye yakınlaşın" ([Earth2 rehberi](https://medium.com/welcometoearth2/how-to-buy-land-on-earth-2-io-fa8c80499a3c)).
- **Google Earth yakınlaştıkça etiket ekler.** Ara yollar ve etiketler yalnız yaklaşınca görünür ([SERC](https://serc.carleton.edu/eyesinthesky2/week9/intro_google_earth.html)).

**Öneri: her biri yalnız kendi bilgisini gösteren beş görünüm düzeyi**

| Düzey | Çizici | Gösterilen | Tık |
|---|---|---|---|
| L0 Bölge (küre) | three.js | Bölge renkleri + bölge başına **tek** durum rozeti | Bölgeye uç |
| L1 İl | MapLibre | İl sınırları, il adı, tek toplu rozet | Görünümü ile oturt |
| L2 İlçe | MapLibre | İlçe sınırları, fiyat ısısı (isteğe bağlı mercek), mülklerin | Görünümü ilçeye oturt |
| L3 Arsa | MapLibre, hücre ızgarası katmanı | Izgara hücreleri, sahiplik renkleri, yapıların simge olarak | Hücre seç |
| L4 Sokak / yürüyüş | three.js sahnesi | 3D yapılar, karakterin | Yürü, gir, inşa et |

**Düzeyler arası geçiş**
- `fitBounds` + `maxZoom` sınırı kullanılır ([MapLibre FitBoundsOptions](https://maplibre.org/maplibre-gl-js/docs/API/type-aliases/FitBoundsOptions/)).
- Animasyon ~600–900 ms sürer. Azaltılmış hareket açıksa yeni görünüme doğrudan geçilir.
- Sol üste bir **kırıntı yolu** konur, örneğin `Türkiye › Kocaeli › Gebze › Parsel #A3F2`. Her parça tıklanabilir.
  - Telefonda `‹ Gebze` biçimine daralır.
- Kırıntı yolunun içine bir **arama kutusu** konur.
  - Aksan duyarsız eşleşir: "gebze", "gölcük" ve "golcuk" hepsi bulur.
  - Yerel ayara uygun katlama kullanılır. Düz `toUpperCase` Türkçede noktalı/noktasız i'yi bozar ([Türkçe i hatası](https://mattryall.net/blog/the-infamous-turkish-locale-bug)).
  - Sonuçlar il / ilçe / mülklerim diye gruplanır.

## 2. Sakin bilgi tasarımı (akış çizgilerinin yerine)

**Sürekli çizgiler yerine istenince açılan harita modları**
- Victoria 3'te her panelin bir harita modu vardır: paneli açınca modu da açılır. Sonradan modlar arasında ayarlanabilir bir solma eklendi ([wiki](https://vic3.paradoxwikis.com/Map_modes), [DD#74](https://forum.paradoxplaza.com/forum/developer-diary/victoria-3-dev-diary-74-ux-improvements.1567815/page-6)).
- HoI4 modlarını F1–F10 tuşlarına koyar ([DefKey](https://defkey.com/hearts-of-iron-4-shortcuts)).
- Cities: Skylines katmanlarını (elektrik, trafik, arazi değeri) bir bilgi görünümü panelinde toplar ([gamepressure](https://guides.gamepressure.com/citiesskylines/guide.asp?ID=30101)).

**Öneri**
- Varsayılan harita **hiç akış göstermez**: yalnız arazi, mülkün ve rozetler.
- **"Görünüm" mercek çubuğunda** altı katmana karşılık gelen altı mercek ile "Sahiplik" ve "Fiyat" bulunur. Aynı anda yalnız bir mercek açık olur; 1–8 tuşları.
- Lojistik rotaları **yalnız** seçili yapı için görünür: durağan, animasyonsuz noktalı çizgi. Bu, [sokak seviyesi 3D](sokak-seviyesi-3d.md) raporunun önerisiyle aynıdır.

**Yapı rozetleri ve yığılmanın önlenmesi**
- Factorio bunu ikiye böler. Yapının üstündeki simge yerel durumu gösterir (elektrik yok, mühimmat yok). Araç çubuğunun yanındaki uyarı listesi tür tür susturulabilir ([Factorio wiki](https://wiki.factorio.com/Alerts)).
- Cities: Skylines II'de yedi önem düzeyi vardır ve oyuncular simgelerin şehri görmeyi engellediğinden yakınır ([CS2 wiki](https://cs2.paradoxwikis.com/Notifications), [Steam](https://steamcommunity.com/app/949230/discussions/0/3937895474111100542/)).
- Bizde:
  - **Üç** rozet durumu: *eksik girdi*, *boşta*, *inşaat bitti*.
  - Yapı başına en çok bir rozet; en ağır olan kazanır.
  - L0–L2'de rozetler il ya da ilçe başına sayıya toplanır ("⚠ 3").
  - Rozetler canlanmaz. Varışta tek kısa nabız olabilir; azaltılmış harekette o da olmaz.

**Bildirimler**
- Victoria 3 bir uyarı örneğidir. İki tür açılır pencere, bir akış, bir "güncel durum" çubuğu ve olay listesi vardır. Oyuncular önemli maddelerin önemsizlerin arasında kaybolduğunu söyler ([Paradox forumu](https://forum.paradoxplaza.com/forum/threads/why-is-the-notification-system-such-a-step-back.1553132/)).
- Tek kural uygulanır:
  - **Anlık bildirim (toast)** yalnız oyuncunun az önce yaptığı şeyin sonucu içindir ("Parsel satın alındı").
  - Geri kalan her şey **gelen kutusuna** ("Bildirimler") gider; asla açılır pencere olmaz.
  - En çok beş eyleme dönük maddelik bir **"Dikkat" paneli** eklenir. Her maddede yapıya uçuran bir "Git" düğmesi bulunur.
  - Bu tek panel, bugünkü "Darboğaz" sekmesinin ve alt durum satırının yerini alır.

**Palet**
- Düşük doygunluklu, sakin arazi renkleri: gündüz sıcak kum ve zeytin, gece arduvaz ve koyu turkuaz.
- Doygun renk yalnız **senin mülkün** ve **rozetler** için ayrılır.
- Durumlar için Okabe-Ito renkleri kullanılır. Mavi `#0072B2` ile turuncu/kızıl `#E69F00` / `#D55E00` her tür renk körlüğüne dayanan çifttir ([SciFig](https://scifig.ai/blog/okabe-ito-color-palette-hex-codes)).
- Renk asla tek başına kullanılmaz ([Game Accessibility Guidelines](https://accessibilityguide.org/game-accessibility-guidelines/)). Her rozetin ayrı bir **şekli** vardır: ▲ eksik, ◯ boşta, ✓ bitti.

## 3. Yürüyüş modu

- **Karakter ve kamera**
  - Karakterin arkasında takip kamerası; kamera uzaklığı fare tekerleğiyle ayarlanır.
  - Oyuncu bir yapıya girince çatı kesilir ve katlar arasında gezilebilir; Capital Rift'teki gibi ([geliştiricinin özellik listesi](https://www.tiktok.com/@niksgames/video/7666487170605026591)). Capital Rift "tıkla-git" de kullanır.
- **Masaüstü kontrolleri**
  - Birincil kontrol tıkla-git, alternatif WASD.
  - Sağ sürükleme kamerayı döndürür.
- **Telefon kontrolleri**
  - Dokun-git ve **dinamik joystick**: başparmağın ilk dokunduğu yerde belirir, parmak kalkana kadar yerinde kalır. Hareketin ara sıra olduğu oyunlara uyar ([cursa](https://cursa.app/en/page/touch-controls-for-mobile-games-input-patterns-and-feedback)).
  - Bir çalışma, sabit ve yüzen joystick arasında kullanılabilirlik farkı bulmadı ([UPI](https://repository.upi.edu/101077)).
- **Etkileşim ipuçları**
  - Karakter kullanılabilir bir şeyin yanındayken tek bir yüzen HTML hapı görünür: masaüstünde `[E] Fabrikaya gir`, telefonda tek düğme.
- **Mini harita**
  - Sağ üstte, 120 px, kuzey yukarıda.
  - Yalnız parsellerini ve ilçe sınırını gösterir. Dokununca stratejik haritaya döner.
- **Harita ile yürüyüş arasında geçiş**
  - L3'te "Burada yürü" kamerayı ~1 sn'de karakterin üstüne indirir.
  - **M** tuşu ya da mini harita haritaya döndürür.
  - Kamera hedefi geçiş boyunca aynı kalır; oyuncu yerini kaybetmez.

## 4. Yerleştirme ve inşa

- **Hayalet önizleme**
  - İmleci izleyen bir hayalet, engelli yerde kırmızılaşır. Yerleştirme modu açık kalır, art arda konabilir ([Anno 117](https://gamerblurb.com/articles/anno-117-how-to-rotate-buildings)).
  - Döndürme: masaüstünde R / Shift-R (Anno `,` / `.` ve orta tık kullanır; [gamepressure](https://www.gamepressure.com/anno-1800/how-to-rotate-buildings/zbc215)); telefonda döndür düğmesi.
  - 2 m alt ızgaraya oturur. Cities: Skylines II oturtma seçeneklerini düğme olarak sunar ([CS2 wiki](https://cs2.paradoxwikis.com/Roads)); bize yalnız açık/kapalı yeter.
- **Geçerlilik renkleri**
  - Geçerli: mavi, düz çizgi. Geçersiz: turuncu taralı dolgu ve kısa neden ("Parsel dışında", "Eğim fazla").
- **Maliyet önizlemesi**
  - Hayaletin yanındaki kart her maliyeti *gereken / var* olarak listeler; eksik turuncu görünür.
  - İnşa süresini ve yapının ne üreteceğini de gösterir.
- **Taslak modu**
  - Anno'nun Blueprint modu parasız hayalet yapı yerleştirip sonra gerçeğe çevirmeye izin verir ([Anno wiki](https://anno1800.fandom.com/wiki/Blueprint_mode)).
  - Yeni oyuncu, parası yetmeden plan yapabilir.
- **İnşa aşamaları.** Workers & Resources inşaatı, şantiyeye malzeme taşınan evrelere böler ([W&R wiki](https://wiki.hoodedhorse.com/Workers_Resources_Soviet_Republic/Construction_office)). Dört aşama gösterilir:
  1. Temel
  2. İskele
  3. Gövde
  4. Tamam
  - Parçalı çubuk ve bitiş saati ("bitiş 14:20") olarak gösterilir; sunucu zamanından hesaplanır.
- **Kuyruk**
  - v1'de iki paralel inşa yuvası. Kuyruk bina panelinde görünür.
- **İptal**
  - Malzemenin %50'si iade edilir.
  - Supercell %50 iadeyi bilerek tutar: tam iade, oyuncuların kaynaklarını bitmemiş inşaatta saklamasına izin verir ([Supercell forumu](https://forum.supercell.com/showthread.php/1681335-Cancel-upgrade-100-refund-in-BH)). Paylaşılan ekonomide bu önemlidir.
- **Yükseltme**
  - İnşa ile aynı akış; önce → sonra karşılaştırmasıyla (S → M → L).
- **Telefonda yerleştirme**
  - Dokunuş hayaleti koyar, sürükleme taşır; yüzen ✓ / ↻ / ✕ çubuğu onaylar, döndürür ya da iptal eder.
  - Hayalet parmağın altında değil, üstünde durur.

## 5. Arsa satın alma

- **Seçim**
  - Tek hücreye dokun ya da tıkla. Shift-tık hücre ekler; Capital Rift'in modeli budur.
  - Telefonda "Çoklu seç" düğmesi hücreleri sürükleyerek boyamaya izin verir.
  - Seçilen hücreler birbirine yakın kalmalıdır; Earth2 bunu zorunlu tutar ([Earth2 rehberi](https://medium.com/welcometoearth2/how-to-buy-land-on-earth-2-io-fa8c80499a3c)).
- **Yapışkan satın alma alt çubuğu**
  - Hücre sayısı, hücre başına fiyat ve toplam; toplam `12.450 ₺` biçiminde.
  - "Satın al"; seçim sahip olduğun hücrelere değiyorsa "Birleştir".
- **Sahiplik renkleri**
  - Upland'in ayrımı izlenir: senin, başka oyuncunun, satılık ve hiç sahiplenilmemiş ([investfourmore](https://investfourmore.com/buy-virtual-real-estate-upland/)).
  - Senin: mavi dolgu. Başka oyuncu: nötr gri çizgi, üzerine gelince ad. Satılık: kesikli çizgi. Alınamaz: taralı.
- **Gösterilen bilgi**
  - Parsel kartı arazi kullanımını (tarla / sanayi / konut), eğimi, komşu sahipleri ve ilçe doluluğunu ("Gebze: %62 dolu") gösterir.

## 6. Onboarding

**Diğer oyunlar ne yapıyor**
- **OGame**'de kaynak ödüllü, herhangi bir sırayla yapılabilen 10 görev aşaması vardır ([OGame wiki](https://ogame.fandom.com/wiki/Tutorial_Help)).
- **Travian**'da kaynak ödüllü bir görev zinciri (Taskmaster) ve 3–14 günlük yeni oyuncu koruması vardır ([destek](https://support.travian.com/en/articles/142-first-steps-in-the-game), [fandom](https://travian.fandom.com/wiki/Beginner's_Guide)).
- **Albion**, oyuncuların "kum havuzuna salıverilince oyunu bıraktığını" gördü. Artık yeni oyunculara üç yoldan birini seçtiriyor, daha az metin kullanıyor ve bir "İlk Adımlar" günlüğü tutuyor ([Dev Talk](https://albiononline.com/news/dev-talk-new-player-experience)).

**Öneri**
- **İlk 10 dakika: modal öğretici değil, rehber hedef kartı.**
  1. İl ve ilçe seç. "Yerleş" ekranında 3 önerilen ilçe ve nedenleri gösterilir, örneğin "Verimli ova, liman yakın".
  2. İlk parselini al; başlangıç hibesi karşılar.
  3. Bir Tarla kur. Erken inşaat hızlandırılmıştır (belgelerde zaten planlanan ~24 dk).
  4. Yürüyerek yanına git.
  5. İlk hasat satışını izle.
- **İlk gün:**
  - Bir yol seç: Tarımcı, Sanayici ya da Tüccar. Bunlar mevcut bot türlerine karşılık gelir. Her yolda herhangi bir sırayla yapılabilen 5–7 hedef vardır.
  - "Önerilen adım" çipleri Dikkat panelinde görünür.
- **Proje kurallarına uyar:** günlük giriş ödülü yok (K13 ve §7). Koruma 7–14 gün sürer; geri sayımı üst çubukta görünür.

**Türkçe dil kuralları**
- Türkçe arayüz metinleri İngilizceden ~%25–30 uzundur; eklemeli etiketler çok daha uzun olabilir ([LocalizeDirect](https://www.localizedirect.com/posts/turkish-game-localization), [Gridly](https://www.gridly.com/blog/game-ui-design-localization-best-practices/)). Düğmeler içeriğe göre boyutlanır; sabit genişlikli sekme kullanılmaz.
- Yüzde işareti sayıdan önce ve boşluksuz yazılır: `%90` ([Wikipedia](https://en.wikipedia.org/wiki/Percent_sign)). Her sayı `Intl.NumberFormat('tr-TR')` ile biçimlenir: binlik `.`, ondalık `,`.
- Büyük harf `toLocaleUpperCase('tr')` ile yapılır; İ ve I doğru çıkar.

## 7. HUD yerleşimi, erişilebilirlik ve performans

**Masaüstü**
- Sol üst: kırıntı yolu ve arama.
- Üst orta: tarih, hasat ve nakit; tek kompakt hap.
- Sağ üst: Dikkat, gelen kutusu, ayarlar.
- Alt orta: mercek çubuğu; inşa modunda yapı çubuğu.
- Sağ: kapatılabilir, ~360 px genişliğinde bağlam paneli.
- Dünya hızı düğmeleri hata ayıklama menüsüne, atıf köşedeki katlanabilir "ⓘ"ye taşınır.

**Telefon, dikey**
- Üstte hap (nakit, tarih), üç yükseklikli alt sayfa (göz at, yarım, tam) ve alt sekme çubuğu:

  | Harita | İnşa | Dikkat | Pazar | Devlet |
  |---|---|---|---|---|

**Telefon, yatay**
- Alt sayfa yan sayfaya dönüşür.
- Joystick solda, eylemler sağda.

**Erişilebilirlik**
- Dokunma hedefleri en az 44 px.
- Gövde metni en az 14 px; %90–130 arayüz ölçeği ayarı.
- Azaltılmış hareket `prefers-reduced-motion`'ı izler ve oyun içinden de açılabilir. Uçuş animasyonlarını, nabızları ve kamera yumuşatmayı kapatır.
- Renk körü paleti ayarı.
- Açık ve koyu temada metin kontrastı en az WCAG AA 4,5:1.

**Performans**
- Paneller için HTML/DOM katmanı: ucuz, erişilebilir, yerelleştirmesi kolay.
- Yapı başına DOM etiketi **kullanılmaz**. CSS2DRenderer her öğeyi her karede günceller ve ~200 öğenin üstünde pahalılaşır ([IGC](https://www.intelligentgraphicandcode.com/development/threejs-interfaces/html-integration)).
- Rozetler örneklenmiş sprite atlası ya da MapLibre sembol katmanı olarak çizilir.
- Görünür etiketler önceliğe göre sınırlanır; en çok bir DOM etiketi olur (üzerine gelinen ya da seçili nesne).
- Ekranda değişiklik yoksa çizim durur; stratejik görünümler 0 fps'te bekleyebilir.

---

## Önerilen v1 kavramı

**Ekranlar**
1. **Giriş / Yerleş:** 3 öneriden il ve ilçe seç, sonra yol seç.
2. **Strateji haritası, L0–L3:** yakınlaştıkça ayrıntı kazanan tek harita; kırıntı yolu ve arama.
3. **Parsel modu:** ızgara, seçim, satın alma alt çubuğu ve parsel kartı.
4. **İnşa modu:** yapı paleti, hayalet, maliyet kartı, Taslak düğmesi, ✓↻✕ çubuğu.
5. **Yürüyüş:** karakter, mini harita, etkileşim hapı, çatı kesme.
6. **Bina paneli:** durum, tek rozetin nedeni, üretim, inşa aşamaları ve kuyruk, yükseltme, iptal.
7. **Dikkat + Bildirimler:** en çok beş eyleme dönük madde ve gelen kutusu.
8. **Katman ekranları:** Pazar, Teknoloji ve Devlet (yasa, bütçe, ordu) için tam ekran sayfalar; her biri kendi merceğiyle açılır.
9. **Ayarlar:** tema, arayüz ölçeği, azaltılmış hareket, renk körü paleti, atıf.

**Çekirdek bileşenler**
- Aramalı kırıntı yolu
- Mercek çubuğu (8 mercek)
- Rozet sistemi (3 şekil, yakınlık düzeyine göre toplanır)
- Dikkat listesi
- Bağlam paneli / alt sayfa
- Hayalet ve maliyet kartı
- Parçalı inşa çubuğu
- Satın alma alt çubuğu
- Etkileşim hapı
- Mini harita
- Tek bir `tr-TR` sayı ve zaman biçimleyicisi
