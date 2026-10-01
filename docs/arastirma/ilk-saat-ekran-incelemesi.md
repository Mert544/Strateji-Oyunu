# İlk saat ekran incelemesi: G1 önce/sonra, oyuncu gözüyle (A1)

> **Durum.** 1 Ekim 2026 akşam, Ar-Ge A1. **Yalnız görüntü ve belge** üzerinden yapıldı: hiçbir uygulama açılmadı, hiçbir sunucu başlatılmadı, hiçbir test koşulmadı. Ciddiyet ve profil (K1–K5) **öngörüdür**; durağan görüntü süre, davranış ve geçişleri göstermez. Her madde [insan testi kılavuzu](insan-testi-kilavuzu.md) pilotunda doğrulanır. Görüntüden çıkarılıp doğrulanamayanlar **(doğrulanmadı)** diye işaretlidir.
>
> **Adlar.** Adımlar (S1.1–S1.9, S2.x), BK-1…BK-10, Ö1, ölçüt kodları ve ciddiyet ölçeği (S0–S3) kılavuzla aynıdır ([§3.2](insan-testi-kilavuzu.md), [§2.5](insan-testi-kilavuzu.md), [§2.1](insan-testi-kilavuzu.md), [§6.2](insan-testi-kilavuzu.md), [§5.4](insan-testi-kilavuzu.md)).

## Girdi ve kapsam

| Küme | Yol | Ne |
|---|---|---|
| Önce (depoda) | `docs/toplanti/2/` | Toplantı notu 1 seti, G1 öncesi (8 görüntü) |
| K1 önce/sonra | `SP/takim/ekran/k1/{once,sonra}/` | İl düzeyi etiket ve geri al şeridi (masaüstü ve mobil, 6 adım) |
| T1 önce/sonra | `SP/takim/tasarim/ekran/t1/{once,sonra}/` | Metin, biçim, telefon (açık/koyu, masaüstü/telefon, 38 çift) |

`SP` = oturumun geçici çalışma dizini (`/tmp/claude-0/.../scratchpad`); **depoda değildir**. **Önemli sınır:** K1 ve T1 setleri **ayrı dallardan** alınmıştır; hiçbir görüntü seti K1 + T1 + T2 birleşik durumu göstermez **(doğrulanmadı)**. T2 (küre, yakın plan) görüntüleri girdi listesinde yoktur; `09a-sokak-yakin-acik-masaustu.png` önce ve sonra **bayt bayt aynıdır** (`cmp`), yani T2 etkisi bu setlerde görünmez.

---

## 1. G1 önce/sonra: hangi BK kapandı

| BK | Kusur | Sonuç | Kanıt |
|---|---|---|---|
| BK-1 | İl düzeyinde yapı etiketi ilçe adına biniyor | **K1 setinde kapandı; birleşik durumda doğrulanmadı** | Önce `SP/takim/ekran/k1/once/mobil-2-il-duzeyi.png` ("Çiftlik · Temel" etiketi Gebze'nin üstünde), sonra `.../sonra/mobil-2-il-duzeyi.png` (etiket yok). **Ama** T1 sonra seti `SP/takim/tasarim/ekran/t1/sonra/02-il-kocaeli-acik-telefon.png` etiketin **hâlâ** "Gebze" üstüne bindiğini gösteriyor: T1 görüntüsü K1 değişikliği olmadan alınmış |
| BK-2 | Mülk kipinde küre hâlâ bölge renkleri | **Kaldı** | `SP/takim/ekran/k1/sonra/masaustu-4-kure.png` ve `.../t1/sonra/01-kure-genel-acik-telefon.png`: bölge renkleri, ▲ ve ✓ rozetleri; telefonda üst üste binmiş rozet yığını. T2 işi bu setlerde yok |
| BK-3 | Defter bildirimi maliyet kartını örtüyor | **Kapandı, yeni sorun doğdu** | Önce `docs/toplanti/2/05b-maliyet-karti-acik-masaustu.png` (toast kartın "Sermaye" satırında); sonra `.../t1/sonra/05b-maliyet-karti-acik-telefon.png` (toast kartın **üstünde**). Yeni sorun: bkz. madde 4 |
| BK-4 | Telefonda hazine iki yerde | **Kapandı (T1 setinde)** | `.../t1/sonra/05b-maliyet-karti-acik-telefon.png`: hazine yalnız üst çipte. K1 setinde hâlâ iki yerde (`k1/sonra/mobil-6-ilceye-donus-L3.png`). Yeni tutarsızlık: bkz. madde 3 |
| BK-5 | Uzun ödül tutarı satır kırıyor | **Kapandı** | `.../t1/sonra/07b-defter-acik-telefon.png`: "5 makine parçası / ≈ 900 ₺ değerinde" iki satır ama tutar bölünmüyor |
| BK-6 | Geri al şeridi küre düzeyinde de kalıyor | **Kapandı (K1 setinde)** | `k1/once/mobil-2-il-duzeyi.png` (şerit var) → `k1/sonra/mobil-2-il-duzeyi.png` (yok). İlçeye dönünce şerit geri geliyor (`k1/sonra/mobil-6-ilceye-donus-L3.png`: "4:43 içinde geri alabilirsin") |
| BK-7 | Yakın planda arsa dolgusu baskın | **Kaldı (görüntü yok)** | `09a-sokak-yakin-acik-masaustu.png` önce = sonra (aynı bayt). T2 işi |
| BK-8 | "Gün N" ifadesi fazlalık | **Kapandı (T1 setinde)** | `.../t1/sonra/05b-maliyet-karti-acik-masaustu.png`: "1 Ekim / Perşembe · 00:00". K1 setinde hâlâ "Gün 1 · 00:30" |
| BK-9 | Yükseltme ek hücre göndermiyor (G2) | **Değerlendirilemez** | Yükseltme ekranı hiçbir sette yok |
| BK-10 | Defter'de Atla ya da Kapat yok | **Kaldı** | `.../t1/sonra/07b-defter-acik-masaustu.png`, `.../07b-defter-acik-telefon.png`: yalnız liste ve çubuk |

**Para biçimi (G1'in ikinci kalemi): T1 setinde kapandı.** "6.000 ₺", "0 ₺ / 8.000 ₺", "500 ₺", "≈ 600 ₺ değerinde", "+1.960 ₺". K1 setinde eski biçim sürüyor ("₺500", "₺600") çünkü K1 dalı T1'den önce.

### Ö1 kapı maddesi ([kılavuz §2.1](insan-testi-kilavuzu.md))

**Ö1: kısmen karşılandı; test sürümü için henüz değil.** 8 kusurdan (BK-1…BK-8) 6'sı (BK-1, 3, 4, 5, 6, 8) iki ayrı dalda kapandı; **BK-2 ve BK-7 (T2)** kaldı; BK-9 ayrı iş (G2). Kapı koşulu "8 kusur kapalı, tek para biçimi" ve **birleşik** görüntü gerektirir; bugün birleşik görüntü yok. **Önerilen kapanış kanıtı:** K1 + T1 + T2 birleşiminden, aynı senaryoyla, masaüstü ve telefon, açık tema, taze hesap (hazine 50.000 ₺'den başlayarak) yeniden çekim.

---

## 2. Öncelikli 10 bulgu (sonraki sprint)

Sıra: önce test akışını engelleyenler, sonra Y1, Y2 ve Y10'u bozanlar. "Profil", kılavuzdaki [§1.1](insan-testi-kilavuzu.md) K1–K5'tir. `t1/sonra` = `SP/takim/tasarim/ekran/t1/sonra`.

### B1. Yerleş'te 3 ilçeden 2'si oynanamıyor
- **Adım:** S1.2
- **Görüntü:** `docs/toplanti/2/04-yerles-acik-masaustu.png`; `t1/sonra/04-yerles-acik-telefon.png`
- **Sorun:** Gemlik ve Körfez "Arsa ızgarası yakında: yalnız gezebilirsin" der, birincil düğme "İlçeyi gez"e döner (`packages/istemci/src/arayuz/yerles-ekrani.ts:89,119`). Gemlik'e "Açılış önerisi: Pazar" yazılıyor ama başlanamıyor. Telefonda üçüncü kart yarım kesik ve düğmeler kaydırma ister. **K4 ya da K5 Gemlik/Körfez'de yaşıyorsa** "mahallende başla" vaadi kırılır.
- **Ciddiyet:** **S3** (o ilçeyi seçen için engelleyici)
- **Etkilediği ölçüt:** Y1, H6 (i), YA1; "mahallende başla" iddiası
- **Düzeltme:** G3 bitene kadar iki kartı **gizle** ya da "yakında" etiketli ve seçilemez göster; "Doluluk bilinmiyor" yerine veri gelene kadar satırı kaldır. **Sahip:** O3 (veri), T1 (kart durumu)
- **Geri dönüş:** kolay (gizleme); vaadin kırılması ZK-3

### B2. "Hazır arsa" için ayrı "Satın al" adımı ve iki "Yapı kur"
- **Adım:** S1.3 → S1.4
- **Görüntü:** `t1/sonra/05a-arsa-secimi-acik-telefon.png`
- **Sorun:** Taze hesapta hazine 50.000 ₺; alt kartta "Hazır arsa · 10 hücre · Kırsal · Fiyat **10.001 ₺** · Gebze payın 16 / 72" ve **birincil** düğme "Satın al"; ikincil "Yapı kur". Üstte ayrıca büyük bir "Yapı kur" düğmesi var. Oyuncu, arsayı almadan yapı kurup kuramayacağını, 10.001 ₺'nin neye gittiğini ve yurdun (6 hücre, ücretsiz) hangisi olduğunu bilemez. [GDD §2.3](oyun-tasarim-belgesi-v1.md) "arsa + yapı tek kart" der; yapı komutu zaten atomik. Hangi yolun zorunlu olduğu **(doğrulanmadı)**.
- **Profil:** K2, K3 (telefon), K5 ("paramın ne olduğu")
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** Y1, YA2, YA3
- **Düzeltme:** tek akış: yapıyı yerleştirince arsa ve yapı **tek maliyet kartında** ("Arsa 10.001 ₺ + yapı 6.000 ₺"); "Satın al" ve ikinci "Yapı kur" kalksın. **Sahip:** K1 (akış), T1 (kart)
- **Geri dönüş:** kolay (arayüz; komut zaten atomik)

### B3. Hazine ve fiyat tutarsız: 39.999 ₺ ↔ 40.000 ₺, 10.001 ₺
- **Adım:** S1.3 → S1.4
- **Görüntü:** `t1/sonra/05b-maliyet-karti-acik-masaustu.png` (çip "39.999 ₺", kart "Hazine 40.000 ₺"); `t1/sonra/05a-arsa-secimi-acik-telefon.png` (50.000 − 10.001)
- **Sorun:** Aynı ekranda iki farklı hazine. "10.001 ₺" yuvarlak değil ve neden olduğu açıklanmıyor. Tasarım liderinin notlarında bu tutarsızlık için T1'den "aşağı yuvarla" düzeltmesi istenmiş (`SP/takim/tasarim-lider-notlar.md` §7J); **sonra görüntüsünde hâlâ var** (kart yukarı, çip aşağı). Görüntü düzeltmeden önce alınmış olabilir **(doğrulanmadı)**.
- **Profil:** K5 (ticaret geçmişi: kuruş kayması güveni bozar), K1
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** YA2, güven; S1.6 sonrası bakiye denetimi
- **Düzeltme:** tek yuvarlama kuralı hem çipte hem kartta; fiyat 10.001 ₺ neden bu değerde, kıtlık eğrisi mi, ayrılmış hücre bedeli mi, kartta bir satırla söylensin. **Sahip:** T1 (biçim), K3 (fiyat kaynağı: **(doğrulanmadı)**)
- **Geri dönüş:** kolay (biçim); fiyat formülü zor (bkz. ZK-2)

### B4. Telefonda ilk yapı anında 4–5 katman üst üste
- **Adım:** S1.4 → S1.5
- **Görüntü:** `SP/takim/ekran/k1/sonra/mobil-6-ilceye-donus-L3.png`; `t1/sonra/05b-maliyet-karti-acik-telefon.png`
- **Sorun:** Geri al şeridi, "Çiftlik kuruluyor: yapı 6.000 ₺" bildirimi, "Defterine 2 yeni satır işlendi" bildirimi, seçim kartı ve ortada duran "İşletmem" düğmesi aynı 390 × 844 ekranda. T1 maliyet kartı örtmesini kapattı ama bildirim **kuyruğu** yok; kritik karar anında Defter bildirimi dikkat çalar (**K2** için "ilk makine 30 sn" beklentisi; **K3** için okuma yükü). T1 sonrası görüntüde yalnız tek toast var, **K1 ve T1 birleşince ne olur doğrulanmadı**.
- **Profil:** K2, K3
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** Y1, Y10 (boşta), T7
- **Düzeltme:** aynı anda **en çok 1 bildirim**; Defter bildirimi, açık bir maliyet kartı ya da geri al şeridi varken **sırada bekler**; bildirim kendi kendine ≤4 sn'de söner. **Sahip:** T1 (kuyruk), K1 (geri al)
- **Geri dönüş:** kolay

### B5. İnşa süresi haritada görünmüyor
- **Adım:** S1.5
- **Görüntü:** `t1/sonra/06-insaat-asamasi-acik-telefon.png`; masaüstü `docs/toplanti/2/03-ilce-gebze-kamu-acik-masaustu.png` (panelde "İskele · 7 dk kaldı")
- **Sorun:** Haritada yapı etiketi "Çiftlik · İskele"dir; **kalan süre yok**. Telefonda ekrandaki tek sayaç, **geri al penceresinin** "4:51"idir; inşa süresi (12 dk) yalnız maliyet kartında ve masaüstü panelinde. 12 dakika boyunca "ne bitecek, ne zaman" belirsizdir; oyuncu geri al sayacını inşa sayacı sanabilir.
- **Profil:** K2, K3
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** **Y10**, YA4, S1.5 duygu
- **Düzeltme:** harita etiketi "Çiftlik · İskele · 7 dk" (telefonda da); geri al sayacı ayrı etiketle ("geri alma: 4:51"). **Sahip:** K1 (etiket), T1 (metin)
- **Geri dönüş:** kolay

### B6. Defter telefonda görünmüyor, Atla/Kapat yok
- **Adım:** S1.7
- **Görüntü:** `t1/sonra/07a-isletmem-acik-telefon.png`; `t1/sonra/07b-defter-acik-telefon.png`
- **Sorun:** İşletmem panelinde Defter, kalkan kutusu, Arsalarım ve Yapılar'ın **altındadır**; açılışta ilk ekranda yok. `07b`'de "Defter" başlığı sekme çubuğunun altında yarı kesik. **K2/K3 Defter'i hiç görmeyebilir**; "İlk satışını yap" kartı Y2'nin tek yönlendiricisi. Atla/Kapat yok (BK-10), [rehber Gİ-7](rehber-gorevler.md) ile çelişir.
- **Profil:** K2, K3 (keşif), K1 (zorunlu sanma)
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** **Y2**, **A0-14** (ilk satış ≥4/5), Y8, YA6
- **Düzeltme:** Defter'in en üstteki **tek** kartı ("İlk satışını yap") panelin başında; Defter ayrı sekme ya da ilk kart sabit; Atla/Kapat hesaba yazılan düğme. **Sahip:** T1, K1 (kalıcılık: sunucu **(doğrulanmadı)**)
- **Geri dönüş:** kolay

### B7. Defter ödül çubuğu "600 ₺ / 8.000 ₺" (yüzde ve sayı kuralı)
- **Adım:** S1.7
- **Görüntü:** `t1/sonra/07b-defter-acik-telefon.png`; `docs/toplanti/2/07b-defter-acik-masaustu.png`
- **Sorun:** İlerleme çubuğu ve "600 ₺ / 8.000 ₺" Defter'i bir **hedef sayacına** çeviriyor. [donus DK-5](donus-deneyimi.md) "damga, yüzdesiz, sayısız, boş yuvasız" der ve [rehber Gİ-8](rehber-gorevler.md) "tamamlama yüzdesi yok" der. Sağ sütundaki "500 ₺", "700 ₺", "250 ₺" bedel mi ödül mü belirsiz (YA6); "çelik ≈ 600 ₺" ödülün **mal** olduğu söylenmiyor. K5 gerçek para sanabilir, K1 "kasmak" ister.
- **Profil:** K1, K5, K3
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** Y8, YA2, YA6, A0-14
- **Düzeltme:** çubuk ve tavan gösterimi kalksın; kartta "ödül: 5 çelik" gibi **ne** verildiği yazılsın; kazanılanlar damga satırı olarak kalsın. **Sahip:** T1 + Ar-Ge (kural), K1
- **Geri dönüş:** **zor** (bir kez "x / 8.000" gösterilirse koleksiyon ve karşılaştırma beklentisi kalıcı olur; DK-5)

### B8. "Sen yokken": ilk satır belirsiz ve fixture izi
- **Adım:** S2.2
- **Görüntü:** `t1/sonra/08-sen-yokken-acik-masaustu.png`; `t1/sonra/08-sen-yokken-acik-telefon.png`
- **Sorun:** "**+1.960 ₺ satış** +2.140 ₺, giderler −180 ₺": ilk sayı net, ama "satış" sözcüğü onun yanında ve sonraki "satış +2.140 ₺" ile çakışıyor; K3 ve K5 "satışım 1.960 mı, 2.140 mı" diye okur (YA8). Satır "Ahır tamamlandı" der, oysa S1'de yalnız Çiftlik kurulur: görüntü bir **hazırlanmış örnek** olabilir **(doğrulanmadı)**. Öneri satırı yok (Ö7). Telefonda arkadaki küre, rozet yığınıyla ekranın yarısını işgal eder.
- **Profil:** K3, K5
- **Ciddiyet:** **S2**
- **Etkilediği ölçüt:** A0-13 (Dö2 ≈12 sn, Dö3), YA8
- **Düzeltme:** "Net +1.960 ₺ (satış 2.140 ₺, gider 180 ₺)"; arka küre dönüş ekranında sönük/sakin. **Sahip:** T1 (şablon), T2 (arka plan)
- **Geri dönüş:** kolay (şablon metni; [donus §8](donus-deneyimi.md) "kolay geri dönülür")

### B9. Açılış önerisi ile ilk yapı çelişiyor
- **Adım:** S1.2 → S1.4
- **Görüntü:** `docs/toplanti/2/04-yerles-acik-masaustu.png` ("Açılış önerisi: **Sanayi**; ilk Parça Fabrikası için yeter") ↔ `docs/toplanti/2/05b-maliyet-karti-acik-masaustu.png` ("**Çiftlik**, Tarım")
- **Sorun:** Gebze kartı Sanayi önerir ve "Parça Fabrikası" der, ama yakalanan akış Çiftlik kurar; bot ölçümünde sanayici açılışı `hidro_santrali`dir (`packages/botlar/src/parsel.ts:737–741`). Oyuncu "Sanayi seçtim ama Çiftlik mi veriyor?" (YA1) diyebilir. Yakalanan oturumun bilinçli seçim olup olmadığı **(doğrulanmadı)**.
- **Profil:** K1, K5
- **Ciddiyet:** **S1**
- **Etkilediği ölçüt:** Y5, H6 (ii) resmî (açılış türü); (ii) geniş etkilenmez
- **Düzeltme:** paletteki ön seçili yapı, kartın açılış önerisiyle aynı olsun; öneri metni ile bot eşlemesi (`ACILIS_ESLEMESI`) hizalansın. **Sahip:** T1 (palet), K1 / K3 (eşleme)
- **Geri dönüş:** kolay

### B10. Küre ve il düzeyi: "Sen" yok, rozet yığını
- **Adım:** S1.3 (yönelim), S1.5 (bekleme)
- **Görüntü:** `t1/sonra/01-kure-genel-acik-telefon.png`; `SP/takim/ekran/k1/sonra/masaustu-4-kure.png`
- **Sorun:** Mülk kipi oyuncusu kürede bölge renkleri ve rozet yığını görüyor (BK-2); **kendi yeri** ayırt edilmiyor (K1 görsel denetimi de L1'de "Sen"in görünmediğini not etmişti). K4 "mahallem nerede?" diye arar; bekleme sırasında (S1.5) kürenin kendisi dikkati çekmeye çalışır. İl düzeyinde etiket çakışması T1 setinde sürüyor (BK-1, madde yukarıda).
- **Profil:** K4, K3
- **Ciddiyet:** **S1**
- **Etkilediği ölçüt:** Y10 (boşta), YA7, "mahallende başla" duygusu
- **Düzeltme:** T2'nin mülk kipi küresi (bölge renkleri yok, yalnız "Sen" işareti) + L1'de sakin "Sen" işareti. **Sahip:** T2
- **Geri dönüş:** kolay

---

## 3. Bulguların kılavuz tuzaklarıyla ilişkisi

| Kılavuz tuzağı | Görüntülerde |
|---|---|
| 12 dk inşa bekleme ve Y10 ([§6.3](insan-testi-kilavuzu.md)) | B5: bekleme sırasında tek sayaç geri al sayacı; boşta kalma riski artar |
| Randevulu D1 ([§6.4](insan-testi-kilavuzu.md)) | Görüntülerde etki yok |
| Gözlemli oturumda H6 (ii) iyimser ([§7.5](insan-testi-kilavuzu.md)) | B2 ve B9: ilk yapıya giden yolda iki ayrı karışıklık; gözlemsiz oyuncuda (ii) bunlardan düşebilir |

**Olumlu bulgular** (korunmalı): "Yeni oyuncu kalkanı · 14 gün kaldı" ve "Ayrılmış hücre hakkı" kutuları açık ve sade (`t1/sonra/07a-isletmem-acik-telefon.png`); maliyet kartında "2 sa (yeni oyuncuya ilk gün ≈ 12 dk)" süreyi dürüstçe söylüyor; kamu arsası "satışa kapalı" nedeniyle açıklanıyor (`t1/sonra/03-ilce-gebze-kamu-acik-telefon.png`); "Gün N" kalktı.

---

## 4. Geri dönüşü zor kararlar

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| **ZK-1** | Defter'de **ödül ilerleme çubuğu ve toplam tavan gösterimi** (B7) | İlk gösterimde oluşan koleksiyon ve "kasma" beklentisi kalıcıdır ([donus DK-5](donus-deneyimi.md)) | Alfa-0'dan **önce** kaldır; damga listesine geç |
| **ZK-2** | **Hazır arsa fiyatının ve ayrılmış hücre bedelinin** oyuncuya gösterilme biçimi (B2, B3) | Yayımlanmış fiyat sözü kalıcıdır ([GDD AÖ-2](oyun-tasarim-belgesi-v1.md)); "ilk görüntüde 50.000 ₺, hemen 10.001 ₺ düştü" beklentisi sonradan değişmez | Tek kartta "arsa + yapı" göster; fiyatın nedenini yaz; rakamı sahibi (K3, A2) netleştirsin |
| **ZK-3** | **Yerleş'te oynanamayan ilçeyi göstermek** (B1) | İlçe kartı vaadi ("mahallende başla") bir kez kırılırsa ilk izlenim kalıcıdır | G3 bitene kadar gizle; ilk gerçek davetli gelmeden kapat |

Bulguların geri kalanı (B2'nin akışı, B3'ün biçimi, B4, B5, B6, B8, B9, B10) **kolay geri dönülür** (arayüz ve metin).

## 5. Açık sorular

| # | Soru | Önerilen varsayılan |
|---|---|---|
| A1 | Birleşik (K1 + T1 + T2) görüntü seti ne zaman? Ö1 kapanışı buna bağlı | Üç dal kapıdan geçince, aynı senaryo, taze hesap, açık tema |
| A2 | "Satın al" hazır arsa için **zorunlu mu** (yurtla yapı kurulabilir mi)? | Zorunlu değil olmalı; K3 / K1'e sorulur **(doğrulanmadı)** |
| A3 | "10.001 ₺" kıtlık eğrisinden mi, ayrılmış hücre bedelinden mi? | K3 / A2 yanıtlar |
| A4 | "Sen yokken" görüntüsü hazırlanmış örnek mi, gerçek durum mu? | Pilotta gerçek 20–30 saatlik dönüşle yeniden çekilir |
| A5 | Atla/Kapat G9 kapsamında mı? | G9'a eklenmesi önerilir (B6); sahibi lider kararı |
| A6 | Telefonda İşletmem paneli açılışta kaydırılmış mı (07b/01 görüntülerinde "Defter" başlığı kesik)? | Çekim artefaktı olabilir **(doğrulanmadı)**; birleşik çekimde kontrol |

## 6. Doğrulanmayanlar ve sınırlar

Hepsi durağan görüntüden çıkarılmıştır. Süre, geçiş ve gerçek akış görülmedi. Ciddiyet ve profil atamaları **öngörüdür**. K1 ve T1 dalları ayrı olduğundan "kapandı" ifadesi **o setin** kapsamındadır; birleşik durum için A1 sorusuna bakın. Kod referansları (`yerles-ekrani.ts:89,119`, `parsel.ts:737–741`) önceki turda doğrudan okundu.
