# G9 oyuncu akışı: giriş ekranı ve dükkân paneli (A1)

> **Durum.** 1 Ekim 2026 gece, Ar-Ge A1. **Yalnız belge**: kod, parametre ve başka belge değiştirilmedi; hiçbir test koşulmadı, hiçbir sunucu başlatılmadı. T1 (metin, düzen, telefon) ve K1 (istemci mantığı, komut) için girdidir. Sayılar **öneri ya da başka belgenin onaylı sürümündendir** (A3 8b10e60); **(doğrulanmadı)** etiketi koddan ya da kaynak belgeden teyit edilemeyen bilgiyi gösterir.
>
> **Bağımlılık işareti.** A3'ün şartnamesi (`docs/arastirma/p4-p5-sartname.md`, dal `takim/a3/p4-p5-sartname`, **8b10e60, baş lider onaylı**) §6–§10 **kesindir**; bu belgedeki dükkân sayıları, komutlar, kare alanları, DUK/MRK kodları ve metinleri o sürüme göre yazılmıştır (önceki `[A3-P2]` işaretleri kalktı; baş lider S-12 ve S-18 kararları 8b10e60 ile işlendi). 8b10e60'in `entegrasyon`'a girip girmediği ve kodun (G7: K3/K2) henüz yazılıp yazılmadığı **(doğrulanmadı)**: kare alanları, `dukkan_yik` ve ad ucu kod gelene dek **sözleşmedir, çalışan davranış değildir**. G5 (e-posta girişi) K2 dalında uygulanmıştır (`takim/k2/g5-eposta-giris`, 23527a0, `docs/agent-results/G5-k2.md`) ve `entegrasyon`'a **henüz girmemiştir**; uç ve hata kodları o dalın sözleşmesindendir.

| Alan | Değer |
|---|---|
| Görev | G9 "giriş ekranı ve dükkân paneli" ([10 §5A](../10-gorev-listesi.md)); bağımlılık G2, G5, G7 |
| Dayanaklar | A3 `p4-p5-sartname.md` (8b10e60) §7 (dukkan S), §9 (komutlar, ret iletileri), §10 (protokol), §6.8 (okuma API'si) · K2 `G5-k2.md` ve `KIMLIK.md` (K2 dalı sürümü) · A2 `p4-p5-ekonomi.md` §1.9 (dükkân ekonomisi; dal `takim/a2/p4-p5-ekonomi`) · [insan testi kılavuzu](insan-testi-kilavuzu.md) §3.2, §6.2 · ilk saat ekran incelemesi (dal `takim/a1/ilk-saat-inceleme`; B2, B4, B7, B8) · [rehber-gorevler](rehber-gorevler.md) §3.1 · [donus-deneyimi](donus-deneyimi.md) §2.9, §3C · [P4/P5 içerik taslağı](p4-p5-icerik-taslagi.md) §dükkân türleri |
| Sahipler | **T1** (metin, düzen, telefon, erişilebilirlik) · **K1** (akış mantığı, komut gönderimi, durum) · K2 (sunucu uçları ve kare alanları; istek) |
| Tekrar yok | Giriş sunucu tasarımı `KIMLIK.md`'de, dükkân kuralları A3 ve A2'de; burada yalnız **oyuncunun gördüğü ekran, kararı ve metni** vardır |

---

## Yönetici özeti (10 madde)

1. **Giriş 8 ekran, dükkân 9 ekran.** Giriş: e-posta → "postanı kontrol et" → bağlantı onayı → (ilk girişte) görünen ad → Yerleş ya da dönüş; yan akışlar: hata ve ret, oturum süresi, çıkış. Dükkân: giriş noktaları → tür ve yer → maliyet kartı → inşa → raf → fiyat ve kampanya → marka → satış görünümü ve Dikkat → ret tablosu.
2. **Her ekranın tek kararı var** ve 30 saniyede verilir ([GDD §2.2](oyun-tasarim-belgesi-v1.md)); ekran kartlarında "oyuncu kararı" satırı bunu söyler.
3. **Tek yuvarlama kuralı** (ilk saat incelemesi B4): hazine ve gelir **aşağı**, maliyet **yukarı**, "en yakın" yok; para biçimi `1.234 ₺` (bölünmez boşluk). Maliyet kartı, çip ve sonuç satırı aynı işlevi kullanır.
4. **Önleme, ret iletisinden önce gelir.** Hız sınırı (6 saat), ilçe ve il sınırı, geçersiz marka karakteri gibi durumlar, komut gönderilmeden **devre dışı kontrol ve açıklayıcı satır** olarak gösterilir; ret iletisi (A3 §9.3 DUK/MRK kodları) yalnız yarış durumunda ve sunucu süzgecinde (MRK-12) görünür.
5. **Giriş sızdırmaz.** Hesabın var olup olmadığı, e-posta başına sınır ve posta sonucu yanıtı değiştirmez (K2); bu yüzden "bağlantı gönderdik" cümlesi **koşulsuzdur** ve "gelmediyse" yardımı ekranın parçasıdır.
6. **Telefon önceliklidir.** Bağlantı çoğu kez posta uygulamasının **uygulama içi tarayıcısında** açılır; tarayıcıya bağlama varsayılan kapalıdır (K2), ama oturum o tarayıcıda açılır: "oyuna dön" yolu G-3'ün parçasıdır **(doğrulanmadı: tarayıcı davranışı pilotta)**.
7. **"Kilit yok, seçim var."** Dükkân M/L "henüz açılmadı" (DUK-04) dünyanın açılış zamanlamasıdır, oyuncu kilidi değildir; metin bunu **seviye ya da teknoloji** diliyle söylemez (§D-9).
8. **Dükkân kaldırma (karar verildi, baş lider):** inşa sürerken iptal **%50 iadeli**; tamamlanmış dükkân **kaldırılabilir, iade yok**; arsa oyuncuda kalır, raftaki mallar depoya döner. "Dükkânı kaldır" akışı ve **iadesiz** onay metni D-8.1'dedir; komut `dukkan_yik` (A3 §7.9); inşadaki dükkân için mevcut `insaat_iptal`; yarışta DUK-23 iptale yönlendirir.
9. **Veri isteği (K2):** A3 §10.2 yuva başına `mevcut`, kasa doluluğu, kampanya hakları ve karşılanma oranını kareye koyar (İ-2, İ-4 **kapandı**); görünen ad alanı **karar verildi** (K2 uygular; İ-1); raf `fiyatT` K2 kararıyla kabul edildi (İ-6 **kapandı**). Açık kalan tek istek: ilçe talebi (`IlceKaresi.talep?`, İ-3). Ayrıntı §C.
10. **Ölçütler:** giriş [kılavuz S1.1](insan-testi-kilavuzu.md) (≤3 dk) ve A0-6 e2e; dükkân **A0-11** (ilk dükkân ≤36 sa, geri ödeme ≤48 sa), **A0-12** (perakende primi, ilk dükkân, fiyat savaşı), **A0-14** (ilk satış, kart atlama).

---

## 0. Ortak kurallar (her ekran kartı bunlara dayanır)

### 0.1 Ekran kartı şablonu

Her ekran aynı sekiz satırla anlatılır: **Amaç · Oyuncu kararı (30 sn) · Gösterilen sayılar ve yuvarlama · Metin · Telefon ve masaüstü · Ölçüt · Sahip · Ret ve bağımlılık.**

### 0.2 Metin ilkeleri

| Kural | Ayrıntı |
|---|---|
| Büyük harf | Arayüz metninde **tamamı büyük sözcük ve başlık-düzeni (Her Sözcük Büyük) yok**; cümle düzeni ("Nerede başlamak istersin?"). Marka adı oyuncunun yazdığıdır, istisnadır |
| Ton | Sıcak, kısa, yargısız; "sen" kipi; en çok 2 cümle ([donus §2.9](donus-deneyimi.md), [rehber Gİ-10](rehber-gorevler.md)). Suçlayan, acele ettiren söz yok: "kaçırdın, geç kaldın, hemen" |
| Para | `1.234 ₺` (sayı, bölünmez boşluk U+00A0, ₺; sembol sonda); negatif `−1.234 ₺` (U+2212), artı `+1.234 ₺`, sıfır `0 ₺` |
| Ret metni | Önce **ne oldu**, sonra **ne yapabilirsin**; çekirdek iletisi ASCII-Türkçedir (`mulk/komut.ts` geleneği), çeviri `harita/hata-mulk.ts` düzenli ifade tablosunda yapılır; tanınmayan ileti ham hâliyle gösterilir (hiçbir ret yutulmaz) |
| Zaman | "3 saat 20 dk" biçimi; geri sayım ekranda canlı, ret iletisindeki "n saat" **yukarı yuvarlı** olduğundan ("en erken 4 saat sonra") kontrol, kalan süreyi **dakika çözünürlüğüyle** kendisi hesaplar |

### 0.3 Sayı ve yuvarlama kuralı (ilk saat incelemesi B4; baş lider)

| Büyüklük | Yön | Nerede |
|---|---|---|
| **Hazine, gelir, satış tutarı, net** | **aşağı** | üst çip, İşletmem, "sen yokken", dükkân geliri |
| **Maliyet, bedel, malzeme, gider** | **yukarı** | maliyet kartı, "gereken", işletme gideri |
| **Net** (gelir − gider) | gelir aşağı, gider yukarı alınır, fark hesaplanır | dükkân satış görünümü |
| En yakın | **hiçbir yerde** | |

Tek işlev: `paraMili(mili, "asagi" \| "yukari")` (T1'in tek biçimleyicisi). **Şablonlarda para yer tutucusu `₺` ve işaret taşımaz** (`{n}`, `{tutar}`): ikisini biçimleyici ekler; işaretli akışlar (gelir, satış farkı, net) `paraIsaretli()` ("+1.234 ₺"), işaretsiz tutarlar (maliyet, hazine, birim fiyat, gider) `para()`. **Aynı ekranda aynı büyüklük iki farklı yuvarlamayla yazılmaz** (ilk saat incelemesi B4: 10.001 ₺, 39.999 ₺ ve 40.000 ₺ üçlüsü).

### 0.4 Telefon ve masaüstü ortak ilkeler

Dokunma hedefi ≥44 px; aynı anda **en çok 1 bildirim** ve açık maliyet kartı ya da geri al şeridi varken bildirim **sırada bekler** (ilk saat incelemesi B5); alt panel ekranın en çok %60'ını kaplar; klavye açılırken form alanı görünür kalır; masaüstünde sağ panel sabittir.

---

# A. Giriş akışı

K2'nin uçları (`POST /giris/istek`, `GET` ve `POST /giris/onay`, `POST /giris/bilet`, `GET /giris/ben`, `POST /giris/cikis`, `POST /giris/cikis-tumu`) ve hata kodları (`G5-k2.md` "HTTP uçları") ekranların kaynağıdır. **Akış:**

```
e-posta (G-1) -> postanı kontrol et (G-2) -> [posta uygulaması] -> bağlantı onayı (G-3)
   -> yeni hesap?  evet: görünen ad (G-4) -> Yerleş (mevcut)
                   hayır: harita ya da "sen yokken" (mevcut, K bandı)
yan akışlar: hata ve ret (G-6) · oturum süresi (G-7) · çıkış (G-8)
```

Kılavuzla bağ: [S1.1 giriş](insan-testi-kilavuzu.md) hedef ≤3 dk, kabul 6 dk; e-posta gecikmesi (spam kutusu) ayrıca kaydedilir.

## G-1. E-posta ekranı

| | |
|---|---|
| **Amaç** | Oyuna girmek için tek adım: e-posta adresini vermek. Parola ve kayıt formu yok ([12 §14 A-1](../12-yon-taslagi.md)) |
| **Oyuncu kararı** | "Adresimi yazıp bağlantı isterim." Tek alan, tek düğme |
| **Gösterilen sayılar** | Yok. Geçerlilik süresi G-2'de (`gecerlilikSn` = 600 sn → "10 dakika") |
| **Metin** | Başlık: **Bölge Stratejisi'ne gir** · Alt: **E-posta adresini yaz; sana bir giriş bağlantısı gönderelim. Parola gerekmez.** · Alan etiketi: **e-posta adresin** · Düğme: **bağlantı gönder** · Küçük yazı: **Adresin yalnız giriş için kullanılır. Başkalarına görünmez. Bölge Stratejisi şu an davetle açıktır.** (+ aydınlatma metnine bağlantı: **veri kullanımı**) |
| **Telefon / masaüstü** | Telefon: alan `type="email"`, `autocomplete="email"`, tam genişlik düğme; otomatik büyük harf kapalı (`autocapitalize="off"`). Masaüstü: ortalanmış kart 360–420 px; Enter gönderir. Küre arka planda sönük |
| **Ölçüt** | Kılavuz S1.1; Y10 (giriş sırasında boşta kalma) |
| **Sahip** | T1 (metin, düzen), K1 (`fetch POST /giris/istek`, `credentials: "include"`, `Origin` aynı site) |
| **Ret ve bağımlılık** | G5 (K2 dalı entegrasyona girmeli); hata durumları G-6 |

**Gönderme sonrası** istemci, yanıtı beklemeden **G-2**'ye geçer (yanıt 202 ise); hata kodları G-6'dadır. Düğme gönderirken kapanır ("gönderiliyor…") ve çift tıklamayı önler.

## G-2. "Postanı kontrol et"

| | |
|---|---|
| **Amaç** | Oyuncunun bağlantıyı bulabilmesi; bağlantı gelmezse ne yapacağını bilmesi |
| **Oyuncu kararı** | "Postamı açarım" ya da "adresi değiştirir / yeniden isterim" |
| **Gösterilen sayılar** | Geçerlilik: **10 dakika** (`gecerlilikSn`). Yeniden gönder: bekleme geri sayımı |
| **Metin** | Başlık: **Postanı kontrol et** · Gövde: **{adres} adresine bir giriş bağlantısı gönderdik. Bağlantı 10 dakika geçerli ve yalnız bir kez kullanılır.** · Yardım (daraltılabilir): **Gelmediyse gereksiz ya da spam klasörüne bak. Adresi yanlış yazdıysan değiştir. Davet edildiğin adresi kullandığından emin ol.** · Düğmeler: **adresi değiştir**, **yeniden gönder** (bekleme sırasında: **yeniden gönder (60 sn)**) |
| **Telefon / masaüstü** | Telefon: büyük "posta uygulamasını aç" kısayolu **konmaz** (uygulama seçimi cihaza bağlı, **doğrulanmadı**); iki düğme alt alta. Masaüstü: aynı kart |
| **Ölçüt** | S1.1 süre; **posta gecikmesi** (T4 takılma: "bağlantı gelmedi") kılavuz örnek satırı |
| **Sahip** | T1, K1 |
| **Ret ve bağımlılık** | **Posta hatası kullanıcıya görünmez** (K2 kararı: yalnız sayaç); bu yüzden "gelmedi" yolu burada çözülür. **Davetli listesi (baş lider kararı):** listede olmayan adres de **aynı ekranı** görür, yanıt aynıdır ama posta gönderilmez (sızdırmama); bu yüzden metin **"davetli misin" demez**, yalnız genel bir yardım satırı taşır ("davet edildiğin adresi kullandığından emin ol"); davetsiz kişi ek bilgi alamaz Yeniden gönder `POST /giris/istek` (e-posta başına 3/saat, K2): e-posta başına sınır aşılırsa sunucu yanıtı **değiştirmez** ve posta **gitmez** (sızdırmama), yani ekran sınırı bilemez: **istemci kendisi yavaşlatır** (oturumda 3 gönderimden sonra "biraz bekle" satırı) ve "gelmedi" yardımı bir destek yolu gösterir (sahip metni, §S6); `hiz_siniri` yalnız IP/genel sınırdır (G-6). Yeniden gönder bekleme süresi **60 sn** (baş lider kararı); aynı adreste **3. denemeden sonra** "birkaç kez gönderdin" ve **destek e-postası** (`{destek_eposta}`, sahip metni, kod dışında tek yer) birlikte görünür |

**Yeni bağlantı eskileri düşürür** (K2): yeniden gönderince eski e-postadaki bağlantı çalışmaz; ekran bunu söyler: **Yeni bağlantı gönderince eskisi geçersiz olur.**

## G-3. Bağlantı onay sayfası

| | |
|---|---|
| **Amaç** | Postadaki bağlantıyla geleni **bir dokunuşla** oturuma çevirmek. Bağlantı `GET` ile yalnız bu sayfayı açar; oturum `POST` ile açılır (önizleme botları bağlantıyı tüketemez; `KIMLIK.md` §3) |
| **Oyuncu kararı** | "Giriş yap" düğmesine basmak |
| **Gösterilen sayılar** | Yok |
| **Metin** | Başlık: **Giriş yapıyorsun** · Gövde: **Bu bağlantıyla Bölge Stratejisi'ne gireceksin.** · Düğme: **giriş yap** · Başarı sonrası (aynı tarayıcı): doğrudan G-4 ya da oyun; başka sayfaya yönlendirme `--giris-sonrasi` ile (K2) |
| **Telefon / masaüstü** | **Telefon (kritik):** bağlantı posta uygulamasının **uygulama içi tarayıcısında** açılabilir; oturum çerezi o tarayıcıdadır. Başarı ekranı **o tarayıcıda oyuna devam ettirir** ("oyuna dön" yönlendirmesi, ek tıklama yok) ve küçük yazıyla **"Başka bir tarayıcıdan oynamak istersen orada yeniden bağlantı iste."** der **(doğrulanmadı: uygulama içi tarayıcı çerezi ve oyun için uygunluğu; pilotta Android/iOS ayrı denenir)**. Masaüstü: sekme açılır, giriş yapınca oyun aynı sekmede yüklenir |
| **Ölçüt** | S1.1; A0-6 e2e (giriş → Yerleş) |
| **Sahip** | **K2** (varsayılan sayfa `--giris-baglanti` verilmezse sunucu HTML'i; metin T1'den) · T1 (metin) · K1 (istemci kendi sayfasına yönlendirilirse `POST /giris/onay {j}`) |
| **Ret ve bağımlılık** | Bağlantı kullanılmış, süresi dolmuş, bozuk ya da yeni bağlantıyla düşmüş: `baglanti_gecersiz` (G-6). `tarayici_uyumsuz` yalnız tarayıcı bağı açıksa (varsayılan **kapalı**; K2) |

## G-4. İlk giriş: görünen ad

| | |
|---|---|
| **Amaç** | Yeni hesabın (`yeniHesap: true`) dünyada **görünecek takma adını** belirlemek |
| **Oyuncu kararı** | Sunucunun önerdiği adı kabul etmek ya da kendi adını yazmak ("tamam" en hızlı yol) |
| **Gösterilen sayılar** | Uzunluk sayacı (**2–24** karakter; kural **marka adıyla aynıdır**, A3 §7.7: bkz. D-7). Değiştirme hakkı: **günde 1**; gün **00:00 TRT**'de değişir; sunucunun verdiği otomatik addan **ilk seçime** geçiş günlük sınıra **sayılmaz** (K2 kararı) |
| **Metin** | Başlık: **Sana ne diyelim?** · Gövde: **Bu ad dünyadaki herkese görünür. Gerçek adını yazman gerekmez. Adını günde bir kez değiştirebilirsin.** · Alan: **görünen adın** (hazır öneri **küçük harfli**, sunucu üretir, ör. "esnaf-4k7") · Açıklama: **Büyük harf yazabilirsin; adın küçük harfle kaydedilir.** · Önizleme satırı (canlı): **Dünyada böyle görünürsün: {küçük hâli}** (S-12 varsayılanı, sahip teyidi bekler: S11) · Düğme: **tamam** · Hatalar: **Bu ad kullanılamaz; başka bir ad dene.** (yasak liste: neden söylenmez) · uzunluk/karakter hataları D-9 MRK-04…08 metinlerinin "ad" uyarlaması · Günlük sınır: **Adını günde yalnız bir kez değiştirebilirsin.** (öneri; ileti K2/T1) |
| **Telefon / masaüstü** | Önerilen ad alanda **hazır** gelir; klavye açılmadan "tamam" ile geçilebilir (K3/K4 için sürtünme yok) |
| **Ölçüt** | S1.1 (giriş → ilk karar); KVKK |
| **Sahip** | T1 (metin), **K2 (profil alanı ve uç: karar verildi, uygulama K2)**, K1 |
| **Ret ve bağımlılık** | **Karar verildi (baş lider; A3 §7.7):** oyuncu adı **seçer**; sunucu **küçük harfli** bir ad **üretir** (öneri); kural marka adıyla **aynı** tek doğrulayıcıdır (`adSozdizimiHatasi`; 2–24; izinli küme `A-Z a-z Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü 0-9`, boşluk, `.` `'` `-` `&`; baş/son ve ardışık boşluk yok; en az bir harf); **kanonik küçük harf** (`adKanonik`, A3 §7.7: girişte büyük harf **izinli**, kayıtta ve ekranda **küçük hâli** görünür; sabit Türkçe tablo `İ→i`, `I→ı`, `toLowerCase` kullanılmaz; istemci önizlemesi aynı işlevi çağırır; sunucu istemciye güvenmez ve yeniden çevirir; **S-12 baş lider varsayılanı, sahip teyidi bekler: S11**); **yasaklı liste yalnız sunucuda** (`ad-suzgec.ts`, `yasakli-adlar.json`; katlama büyük/küçük harf, aksan ve ayırıcıya duyarsız, bot/ajan yoluna uygulanmaz); **günde 1 değişiklik** (gün 00:00 TRT; otomatik addan ilk seçim sayılmaz); **hesap kimliği sabit, ekranda hep güncel ad görünür** (eski ad kimlik değildir). Ad **profilde** saklanır; çekirdek günlüğüne ve dünya durumuna girmez; sıfırlama sunucu yönetici yoludur (KVKK). **E-posta öneki ad olarak kullanılmaz.** Profil alanı ve ucu **G5'te yoktur** (`KIMLIK.md` §6 "henüz yok"): ucun adı ve ret iletisi K2 işidir **(doğrulanmadı)**: **İ-1** (gün sınırı ve ilk seçim kuralı K2 tarafından karara bağlandı). Ekran görüntülerindeki "ali", "cem" geliştirme kimliğidir |

## G-5. Giriş sonrası yönlendirme

| | |
|---|---|
| **Amaç** | Oyuncuyu doğru yere koymak: yeni oyuncu → Yerleş; dönen oyuncu → kaldığı yer |
| **Oyuncu kararı** | Yok (otomatik); ilk ekran zaten bir karar sunar |
| **Gösterilen sayılar** | Yok |
| **Metin** | Yok. Dönen oyuncuda mevcut "sen yokken" ekranı ([donus §3C.1a](donus-deneyimi.md) bantları: K0 hiçbir şey, K1 kısa kart, K2+ Gün Sayfası) |
| **Telefon / masaüstü** | Fark yok; kısa kart K1 bandı için (tasarım belgesi bağlayıcı: tek satırlık şerit; baş lider kararı S8) |
| **Ölçüt** | A0-6; kılavuz S1.2 (Yerleş ≤3 dk); S2.1 dönüş girişi |
| **Sahip** | K1 |
| **Ret ve bağımlılık** | Sıra: `GET /giris/ben` (oturum var mı) → `POST /giris/bilet` → ws `merhaba {token: bilet}` → `hosgeldin`; oyuncu mülkte yoksa `katil` mesajı (Yerleş onayı) ([sunucu README, "Mülk kipi"](../../packages/sunucu/README.md)). Bölge kipi dünyalarında `katil` yoktur: e-posta kimliğiyle yalnız mülk kipi oynanır (K2 açık soru 6) |

## G-6. Hata ve ret durumları (giriş)

Hata gövdesi `{ tamam: false, kod, mesaj, beklemeSn? }` (K2). Ekran, sunucunun `mesaj`ını **göstermez**; kod → metin tablosu istemcidedir (sızdırma ve dil tutarlılığı için).

| Kod (HTTP) | Ne zaman | Ekran | Metin | Eylem |
|---|---|---|---|---|
| `gecersiz_eposta` (422) | Adres biçimi bozuk | G-1, alan altı | **Bu adres geçerli görünmüyor. Kontrol edip yeniden dene.** | alanda kal |
| `gecici_eposta` (422) | Tek kullanımlık/geçici alan (alana bağlı; 148 alanlık başlangıç listesi) | G-1, alan altı | **Geçici e-posta adresleri kabul edilmiyor. Kalıcı bir adres kullan.** | alanda kal |
| `hiz_siniri` (429) | **IP** başına 20/saat ya da genel sınır (onay denemesi ve bilet de 429 verebilir). **E-posta başına 3/saat aşımı bu hatayı vermez:** yanıt aynıdır, posta gitmez (`KIMLIK.md`) | G-1, G-2, G-3 | **Çok sık denendi. {n} dakika sonra yeniden dene.** (`beklemeSn` → yukarı yuvarlı dakika) | düğme kapalı + geri sayım |
| `origin` (403) | Yabancı ya da eksik köken | G-1 | **Giriş şu an yapılamıyor. Sayfayı yenileyip yeniden dene.** | yenile |
| `gecersiz_istek` (400) | Gövde bozuk | G-1 | aynı genel metin | yenile |
| ağ hatası / zaman aşımı | Bağlantı yok | G-1, G-2 | **Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.** | yeniden dene |
| `baglanti_gecersiz` (400) | Bağlantı kullanılmış, süresi dolmuş, bozuk ya da yeni bağlantıyla düşmüş | G-3 | **Bu bağlantı artık geçerli değil (kullanılmış ya da süresi dolmuş olabilir). Yeni bir bağlantı iste.** | **yeni bağlantı iste** (G-1'e) |
| `tarayici_uyumsuz` (403) | Yalnız tarayıcı bağı **açıksa** (varsayılan kapalı) | G-3 | **Bu bağlantıyı isteği yaptığın tarayıcıda aç.** | G-1 |
| `oturum_yok` (401) | Çerez yok/süresi dolmuş | G-7 | G-7 metni | giriş |
| posta gelmedi | Hiçbir kod yok (posta hatası görünmez) | G-2 | G-2 yardımı | yeniden gönder |

**İlkeler:** (1) Hesabın var olup olmadığı, e-posta başına sınır ve posta sonucu **hiçbir metinde** ima edilmez. (2) `gecici_eposta` alana bağlıdır; mevcut hesabın sahibi liste güncellenince giriş yapamayabilir (K2 açık soru 4): destek metni sahip işi (§S6). (3) Süresi dolmuş bağlantı için **suçlayıcı dil yok** ("geç kaldın" değil).

## G-7. Oturum süresi ve sessiz yenileme

| | |
|---|---|
| **Amaç** | Oyuncunun oturumu fark etmeden sürmesi; bittiğinde ne olduğunu bilmesi |
| **Oyuncu kararı** | Yalnız oturum bittiğinde: "yeniden giriş" |
| **Gösterilen sayılar** | Yok (30 gün kayan, 90 gün mutlak: oyuncuya gösterilmez; Ayarlar'da "oturum bitişi" bilgi satırı olabilir: `GET /giris/ben` `oturumBitis`) |
| **Metin** | **Oturumun doldu. Devam etmek için yeniden giriş yap.** · Alt: **İlerlemen korunuyor; hesabın aynı kalır.** |
| **Telefon / masaüstü** | Aynı |
| **Ölçüt** | Dönen oyuncunun D1/D7'si (Y4): oturum kesintisi dönüşü yormamalı |
| **Sahip** | K1 |
| **Ret ve bağımlılık** | **Sessiz yenileme:** ws kopunca ya da bilet (60 sn) bitince istemci `POST /giris/bilet` ile **sessizce** yeni bilet alır (çerez geçerliyse); yalnız `oturum_yok` (401) olunca G-1'e döner. ws kapanış 4003 (`KAPANIS.kimlik`) aynı yolu izler: önce bir kez sessiz yeniden bağlanma, olmazsa G-1. Yarım taslak yerleşim sunucu profilinde 7 gün korunur ([GDD §3C.3](oyun-tasarim-belgesi-v1.md)); giriş sonrası geri gelir |

## G-8. Çıkış ve "tüm cihazlardan çık"

| | |
|---|---|
| **Amaç** | Oyuncunun kontrolü: bu cihazdan ya da hepsinden çıkmak |
| **Oyuncu kararı** | "Çık" ya da "tüm cihazlardan çık" |
| **Gösterilen sayılar** | Yok |
| **Metin** | Ayarlar → hesap: **çıkış yap** · **tüm cihazlardan çık** (onay: **Hesabının bütün oturumları kapanır. Devam edilsin mi?**) · Sonuç: **Çıkış yaptın. Yeniden girmek için bağlantı iste.** |
| **Telefon / masaüstü** | Aynı; onay iletişim kutusu telefonda alt sayfa |
| **Ölçüt** | KVKK ve güvenlik (oturum yönetimi oyuncuda) |
| **Sahip** | T1 (metin), K1 |
| **Ret ve bağımlılık** | `POST /giris/cikis` ve `POST /giris/cikis-tumu`; açık ws bağlantıları 4003 ile kapanır (K2). **Hesap silme HTTP ucu yoktur** (`KIMLIK.md` §9): Ayarlar'da "hesabımı sil" **konmaz**; KVKK talebi yönetici yoluyla (§S6). Ayarlar'da e-posta görünür (`GET /giris/ben`) ve **maskeli** (a***@alan) gösterilir |

---

# B. Dükkân akışı

Kaynaklar: A3 §7 (dükkân), §9.3 (kod ve iletiler), §10.2 (kare alanları), §15.3 (ölçüm); A2 §1.9 (sayılar). **A3 sayıları 8b10e60 (onaylı) sürümündendir; A2'nin sayıları `afdf29f` sürümündendir** (A3 şartnamesi A2'ye `eab8fcc` ile bağlıdır; iki sürüm arasında sayı farkı olup olmadığı **(doğrulanmadı)**). Dükkân S sabitleri (A3 §7.2–§7.6): raf **4 yuva**, kasa **90 birim/sa**, işletme gideri **132 ₺/sa**, bedel **6.000 ₺ + 20 çelik + 8 makine parçası + 4 pencere** (P-İthal: baş lider kuralı, G7'den itibaren; A3 §7.4), inşa **4 sa (ilk 24 saatte ≈24 dk)**, ilçede ≤2 dükkân, ilde ≤6, ayak izi S = **1 hücre**.

```
D-1 giriş noktaları -> D-2 tür ve yer -> D-3 maliyet kartı -> D-4 inşa ve ilk açılış
   -> D-5 raf atama -> D-6 fiyat ve kampanya -> D-7 marka -> D-8 satış görünümü ve Dikkat
   (D-9 ret tablosu hepsine bağlı)
```

**Ürün ilkesi:** dükkân **kendi kendine satar** (NPC hane talebi; çevrimdışı da) ama **rafa mal koymazsan satış olmaz**. Bu yüzden ilk dükkân deneyiminin kritik anı **"inşa bitti → rafı doldur"** geçişidir (D-4).

## D-1. Giriş noktaları ve keşif

| | |
|---|---|
| **Amaç** | Oyuncu dükkânı **kendi kendine bulabilsin** (yönlendirmesiz ölçüt: A0-11, kılavuz G2–G14) |
| **Oyuncu kararı** | "Dükkân kurmak istiyorum" (hangi yoldan olursa olsun) |
| **Gösterilen sayılar** | Kartta: bedel (D-3 ile aynı), tahmini kendini ödeme (D-3) |
| **Metin** | Yapı paletinde kart: **Dükkân** · alt: **Ürettiğini ilçenin hane halkına sat. Raf, fiyat ve marka sende.** · Defter kartı: **Kendi tezgâhın: bir dükkân kur ve ilk satışını yap.** (ödül: ayrı satır, **ödül: 10 çelik**; çubuk ve tavan yok: ilk saat incelemesi B8) · İşletmem'de "Dükkânlarım" bölümü (boşken **Henüz dükkânın yok. Yapı kur → Dükkân**) |
| **Telefon / masaüstü** | Telefon: Defter kartı panelin **üstünde** (ilk saat incelemesi B7), palet kartı tam genişlik. Masaüstü: sağ panelde aynı sıra |
| **Ölçüt** | **A0-11** (ilk dükkân ≤36 sa: bu kart **tek** keşif yolu), **A0-14** (kart atlama ≤1/5), Gö2 |
| **Sahip** | T1 (kart, metin), K1 (`ilk_dukkan` `etkin` bayrağı: `harita/baglanti.ts:376` listesi) |
| **Ret ve bağımlılık** | **G7+G9.** `ilk_dukkan` bugün yer tutucudur ve `etkin: false` gelir (`odul/dedektor.ts`); A3 §7.8 tetiği **ilk satış** yapar (yapı bitti değil: ödül bedelden ucuza alınamasın). Tür **beş S** (bakkal, fırın, şarküteri, şekerci, yapı market): yapı market G8'e bağlıdır |

**Yönlendirme yolları (3):** (a) Yapı kur paleti; (b) Defter "kendi tezgâhın" kartı (yapı kurma akışına götürür); (c) **Dikkat/öneri**: "ekmek stoğun birikiyor; dükkânda sat" (öneri motoru kural 2, yarım iş: **zincir kurulu ama satış kanalı yok**). (c) B7 öneri motoru gelince etkin olur.

## D-2. Tür ve yer seçimi

| | |
|---|---|
| **Amaç** | Hangi dükkân, nerede |
| **Oyuncu kararı** | Bir **tür** ve bir **hücre** seç |
| **Gösterilen sayılar** | Tür kartında: raf **4 yuva**, rafa girebilen mal sayısı ve adları; "bu ilçede dükkânın: 1 / 2" |
| **Metin** | Başlık: **Hangi dükkânı kuruyorsun?** · Kartlar: **bakkal** (gündelik mallar), **fırın** (ekmek ve gıda), **şarküteri** (süt ürünleri), **şekerci** (tatlı), **yapı market** (cam, pencere, çelik) · Yer ipucu: **Dükkân 1 hücre kaplar. Sahip olduğun boş bir hücreyi seç.** |
| **Telefon / masaüstü** | Telefon: 5 kart dikey liste, seçilince alt panel (D-3). Masaüstü: palet grid |
| **Ölçüt** | A0-11 (seçim süresi), Y1 benzeri; yanlış anlama **YA1 benzeri** ("tür kilit mi") |
| **Sahip** | T1 (kartlar), K1 (`yapi_yerlestir` / `tesis_insa_hucre` + `dukkanTuru`) |
| **Ret ve bağımlılık** | Komut (A3 §9.1–9.2): `tesisTuru: "dukkan"` + **`dukkanTuru`** zorunlu (DUK-01/02/03). **İlk saat incelemesi B2:** yer olarak **ücretsiz yurt hücresi** önerilir ("arsa 0 ₺"); ek arsa almak zorunlu değildir (`yapi_yerlestir` kendi hücreni kabul eder). İlçe sınırı DUK-06, il sınırı DUK-07: **önleme:** sınır dolmuşsa tür kartı soluk ve **neden satırı** ("Bu ilçede en çok 2 dükkânın olabilir") |

**Mal listeleri (T3 verisi, A3 §7.3; liste veri dosyasındadır, ekran onu **okur**, belge kopyası bağlayıcı değildir):** bakkal 8 mal (gıda, ekmek, un, süt, süt ürünü, şekerleme, fındık ürünü, yakıt); fırın (ekmek, gıda); şarküteri (süt, süt ürünü, gıda); şekerci (şekerleme, fındık ürünü); yapı market (cam, pencere, çelik, parça). **Çeşit sayısı** (`tamCesit`: bakkal 6, fırın 2, şarküteri 3, şekerci 2, yapı market 4) çekimi etkiler; **boş yuva çeşit paydasında sayılmaz** (A3 §7.5). Raf 4 yuvadır ve **bir mal tek yuvada olabilir**: malı 4'ten az olan türlerde (fırın, şekerci) **yuvalar kalıcı olarak boş kalır**; bu bir eksik değildir (D-5, D-8). Oyuncu hangi malları koyacağını **seçer** ([içerik taslağı](p4-p5-icerik-taslagi.md)).

## D-3. Maliyet kartı ve yatırım tahmini

| | |
|---|---|
| **Amaç** | Karar anında **gereken ve var olan**ı göstermek; paranın nereye gittiğini açıklamak |
| **Oyuncu kararı** | "Kur" ya da "vazgeç" |
| **Gösterilen sayılar** | Satırlar: **Arsa** (kendi arsan: 0 ₺) · **Dükkân** 6.000 ₺ (ilk 5 yapıda %30 indirimli: örnek 4.200 ₺) · **Çelik** 20 (indirimli 14) · **Makine parçası** 8 (indirimli **6**: gerçek düşüm 5,6, **maliyet yukarı**) · **Pencere** 4 (indirimli **3**: gerçek düşüm 2,8, yukarı) · **Süre** 4 sa (yeni oyuncuya ilk gün ≈ 24 dk) · **Toplam** ve **Hazine** (aşağı). **Yatırım tahmini** (isteğe bağlı ikinci blok, aşağıda) |
| **Metin** | Başlık: **Bakkal · 1 hücre** · Satırlar yukarıdaki gibi · Düğme: **dükkânı kur** · İkincil: **vazgeç** · Uyarı (D-9'dan önleme): **Hazinen bu bedeli karşılamıyor (gereken 4.200 ₺, hazine 3.900 ₺).** · Pencere yoksa: **Pencere 4: stokta 0. Pazar'dan alabilirsin (yaklaşık 2.400 ₺).** (düğme: **Pazar'dan al**) |
| **Telefon / masaüstü** | Telefon: alt kart, ödül/Defter bildirimi **kartı örtmez** (B5/BK-3 çözümü) ve açıkken sırada bekler. Masaüstü: harita üstü kart (mevcut `Çiftlik` maliyet kartı düzeni) |
| **Ölçüt** | A0-11 (kurma kararı ≤3 dk), A0-12 (perakende primi: bedel/geri ödeme anlaşılırlığı) |
| **Sahip** | T1 (düzen, metin), K1 (planlayıcıdan sayılar; **kart ile çip aynı yuvarlama**) |
| **Ret ve bağımlılık** | **Pencere kuralı (A3 §7.4; baş lider kararı, verildi):** dükkân bedeli **G7'den itibaren ithal pencerelidir (P-İthal)**: **6.000 ₺ + 20 çelik + 8 makine parçası + 4 pencere**. NPC pencere arzı doğrulandı (60/sa, A3 B3). Pencere stoğu yoksa kart **eksik satırı** (**Pencere 4: stokta 0**) ve **Pazar'dan al** kısayolunu verir; çekirdek iletisi `yetersiz stok: <düğüm> (mal indeksi <n>)` mal **adını** söylemelidir (A3 §9.3 K1 notu: bugün "çelik ya da makine parçası" der). **Gerçek maliyet ≈ 2.400 ₺** (4 × 540 × 1,111; A3 kırılganlık notu), A2'nin 1.600 ₺'sinden fazladır: kart rakamı **yaklaşık** der ve yukarı yuvarlar. **Kırılganlık (A3 B3):** ithalat emri kalıcı orandır, gerçekleşme **bir sonraki tam saat tıkında** başlar ve bitince **elle iptal** gerekir; bu yüzden kısayol (a) emri 4 pencere için hazır doldurur, (b) süreyi görünür kılar ("en geç 1 saat içinde gelir"), (c) pencere geldikten sonra **iptal hatırlatması** (Dikkat) bırakır. İlk dükkân zamanı (A0-11) bu bekleme ve unutulan iptale duyarlıdır. Kart rakamları **veri paketinden** (`ekYapilar.dukkan`) okunur, koda gömülmez: A3 §7.4'e göre P-Yok'a dönüş (kural dönemi, yalnız veri) bedeli 7.440 ₺ yapar ve pencere satırını kaldırır; kırık satır göstermemek için kart satırları veriden üretilir |

**Yatırım tahmini bloğu (öneri; A2 §1.9 "Yatırım Tahmini kartı").** İlçe sınıfına göre dürüst bir beklenti: **şehir** ≈ 727 ₺/sa net, geri ödeme ≈ 12 sa; **kasaba** ≈ 524 ₺/sa, ≈ 17 sa; **kırsal** ≈ 32 ₺/sa, ≈ 281 sa (A2, tek dükkân, normal fiyat, nakit yatırım, indirimli; A2 pencereyi ≈1.600 ₺ sayar, gerçek ithalat ≈2.400 ₺: geri ödeme **birkaç saat uzar**, kart bunu "yaklaşık" ile söyler). Kırsal ilçede metin: **Bu ilçede küçük bir pazar var; dükkân kendini yaklaşık 12 günde öder.** Sonuç, "kilit değil, sonuç"tur ([12 §12](../12-yon-taslagi.md)): kart engellemez, **bilgi verir**. **Veri isteği İ-3:** ilçe talebi bugün kare alanında yok (`IlceKaresi.talep?` A3 §10.2: "G9'da istenirse K2 sonra ekler"); olmadan blok **gizlenir**, sayı uydurulmaz.

## D-4. İnşa ve ilk açılış

| | |
|---|---|
| **Amaç** | İnşa süresince oyuncuyu **boşta bırakmamak**; bitince doğrudan rafa yönlendirmek |
| **Oyuncu kararı** | İnşa bitince: "rafı doldururum" (tek öneri) |
| **Gösterilen sayılar** | Haritada etiket: **Dükkân · iskele · 17 dk** (kalan süre; ilk saat incelemesi B6). Geri alma sayacı ayrı ve açık etiketli: **geri alma: 4:51** |
| **Metin** | Bildirim (bitişte): **Dükkânın hazır; hayırlı olsun.** · Öneri: **Rafına mal koy. Çünkü rafın boşken satış yapılmaz.** (düğme: **rafa git**) · "Sen yokken" bitiş satırı: mevcut `donus.bitti.insaat` şablonu (`{yapi} bitti; hayırlı olsun`; yeni şablon gerekmez, A3 §10.3) |
| **Telefon / masaüstü** | Telefon: bildirim kuyruğu 1; öneri çipi Dikkat'te kalıcı (24 saat). Masaüstü: bina panelinde **rafa git** |
| **Ölçüt** | **A0-11 (ilk satış zamanı)**, Y10 (bekleme), A0-12 (ilk dükkân medyan ≤36 sa) |
| **Sahip** | K1 (etiket, öneri), T1 (metin), K2 (`insaat_bitti` kaydı hazır: `donus/izleyici.ts:83`) |
| **Ret ve bağımlılık** | **Boşluk:** inşa bitince yeni dükkânın rafı **boştur** (`dukkanVarsayilani`: yuvalar boş, kademe varsayılan; A3 §7.2); hiçbir şey satılmaz. Bu yüzden öneri **zorunlu bir parçadır**, süs değil. İlk dükkân ölçütü (A0-11) **üç zaman** ister (A3 §15.3): **yapı komutu** (`DukkanDurumu.baslangic`), **kurulma** (`kurulus`, inşaat bitişi) ve **ilk satış** (`MulkOyuncuDurumu.ilkSatisT`); üçü de durumdan okunur. İnşa iptali (D-8.1) ilk 24 saatte dakikalarla ölçülür (inşa ≈24 dk) |

## D-5. Raf atama

| | |
|---|---|
| **Amaç** | Hangi malın satılacağını seçmek (4 yuva) |
| **Oyuncu kararı** | Her yuva için **bir mal** (ya da boş) |
| **Gösterilen sayılar** | Her malda: **stok** (düğüm toplamı), **üretim hızı** (birim/sa), **dünya fiyatı R** (`IlgiKaresi.fiyat`) ve kademe fiyatı (aşağı yuvarlı); yuva başına kareden: **`mevcut`** (stok var mı), **tahmini satış** (`istekMiliSaat`; "≈ 28 birim/sa", kasa kırpmalı), dükkân başına **kasa doluluğu** (`kasaPpm`: 90 birim/sa kasaya oran) ve **karşılanma** (`karsilanmaPpm`, bölge düzeyi) |
| **Metin** | Başlık: **Raf** · Boş yuva: **boş: mal ekle** · Yuva seçici başlığı: **Bu yuvaya hangi malı koyalım?** · Mal satırı: **ekmek · stokta 320 · 63 ₺** · Seçicide koyulabilecek mal kalmadıysa: **Bu dükkânda koyabileceğin başka mal kalmadı.** · Bilgi: **Bir mal tek rafta olabilir. Kasa saatte en çok 90 birim satar. Mal koyunca fiyat normale döner.** · "Neden satmıyor" satırları aşağıdaki tabloda |
| **Telefon / masaüstü** | Telefon: 2×2 yuva ızgarası, her biri ≥44 px; mal seçici alt sayfa. Masaüstü: bina panelinde 4 satır |
| **Ölçüt** | **A0-11 / A0-12** (ilk satış, çeşit), YA5 (satış anlayışı), A0-14 |
| **Sahip** | K1 (`dukkan_raf`), T1 (seçici, metin) |
| **Ret ve bağımlılık** | Komut (A3 §9.1): `dukkan_raf {dukkan, yuva, mal \| null}` (`null` = yuvayı boşalt); tutar alanı yok. **Önleme > ret:** (1) tür dışı mal seçicide **hiç gösterilmez** (DUK-13); (2) başka yuvada olan mal **soluk** ve "zaten rafta" (DUK-14); (3) dolu yuvada mal **değişimi** hız sınırına tabidir (DUK-18; D-6), ilk doldurma ve boşaltma **muaf**; (4) aynı mal aynı yuvaya (DUK-19b) ve boş yuvayı boşaltma (DUK-19a) kontrolde yapılamaz; (5) mal koymak yuvanın kademesini **normal**'e çeker (`varsayilanFiyatKademesi`): seçici bunu söyler. **"Neden satmıyor" artık veriden gelir (A3 §10.2; İ-2 kapandı):** istemci düğüm stoğundan **tahmin yürütmez**, kare alanlarını okur |

**Not (zorunlu seçim yok):** Rafa mal koymak **bedelsizdir** (tutar yok) ve geri alınabilir; **dolu yuvada mal değişimi** hız sınırına tabidir (ilk doldurma ve boşaltma muaf).

**"Neden satmıyor" eşlemesi (kare alanı → ekran satırı; K1 türetir, T1 metni yazar):**

| Kare verisi (`OzelBolgeKaresi.dukkanlar`) | Yuvanın durumu | Ekran satırı |
|---|---|---|
| `mal = ""` | Yuva boş (satış yok; çeşit payında sayılmaz) | **boş: mal ekle** (tür malı yuvadan azsa: bu yuva boş kalabilir, uyarı yok) |
| `mevcut = 0` | **Stoksuz yuva çekime girmez** (A3 §6.4 adım 1) | **{mal}: stoğun yok; üretim kurunca satış başlar** (soluk) |
| `mevcut = 1` ve `karsilanmaPpm < PPM` | Stok var ama isteği karşılamıyor (bölge düzeyi) | **Stoğun talebi karşılamıyor; satış düşüyor.** |
| `kasaPpm` ≈ PPM (eşik öneri: ≥ %95) | Kasa dolu: istek kırpılıyor | **Kasa dolu: satış kasa sınırında.** |
| `etkin ≠ fiyat` | Kampanya bitti, yuva otomatik normale döndü (saklanan kademe kampanyada kalır) | **Kampanya bitti; fiyat normale döndü.** |

Gösterilen **birim fiyat `etkin` kademeden** hesaplanır, saklanan `fiyat`'tan değil (A3 §7.5b `etkinKademe`).

## D-6. Fiyat kademesi ve kampanya penceresi

| | |
|---|---|
| **Amaç** | Her yuvanın **fiyat kademesi**ni seçmek; kampanyayı yalnız pencere içinde kullanmak |
| **Oyuncu kararı** | Her yuva için **bir kademe** (varsayılan **normal**) |
| **Gösterilen sayılar** | **4 kademe** (baş lider onaylı): **kampanya 0,85 R**, **uygun 0,95 R**, **normal 1,05 R (varsayılan)**, **yüksek 1,15 R**. Seçili kademenin **birim fiyatı** (R × çarpan, **aşağı yuvarlı tam ₺**; örnek ekmek R=60 ₺: 51 / 57 / 63 / 69) ve yuva başı **tahmini satış ve net**. Hız sınırı: **kalan süre** (6 saat; dakika çözünürlüğü; raf demetindeki **`fiyatT`**'den hesaplanır; `0` ise sınır yok: İ-6 kapandı). Kampanya hakkı (kareden `kampanya: [bitis, kalanSaat, kalanGun]`): **bugün kalan saat** (en çok 6), **bu hafta kalan gün** (en çok 2) |
| **Metin** | Segment: **kampanya · uygun · normal · yüksek** · Altı: **Normal fiyat, çoğu zaman en iyi dengedir.** (**yüksek** seçilince: **Fiyat yükselince satış payın düşebilir; kasa doluysa gelir artar.**) · Hız sınırı: **Fiyatı en erken 3 saat 20 dk sonra değiştirebilirsin.** · Kampanya düğmesi: **kampanya başlat** (altında: **Bugün en çok {n} saat; en geç gün sonunda biter. Bu hafta {m} gün hakkın var.**) · Kampanya açıkken: **Kampanya sürüyor: 4 saat 10 dk kaldı** · Kampanya uyarısı: **Kampanya fiyatı dünya pazarında satmaktan düşüktür; satış artmayabilir.** |
| **Telefon / masaüstü** | Telefon: 4 kademe **segment kontrol** (her biri ≥44 px, yan yana sığmazsa 2×2); hız sınırında kontrol soluk ve süre satırı. Masaüstü: yuva satırında 4 düğme |
| **Ölçüt** | **A0-12:** perakende primi **1,05–1,20** (alarm **>1,30**), fiyat savaşı (**<0,85 R**) süresi **≤%5**; kademe dağılımı insan testinde gözlenir. A2: rasyonel oyuncu **üst kademeye yığılır** (1,15 R → prim 1,291): arayüz **yüksek**'i öne **çıkarmaz** |
| **Sahip** | T1 (kontrol, metin, adlar), K1 (`dukkan_fiyat`, geri sayım) |
| **Ret ve bağımlılık** | **Karar verildi (baş lider; A3 §7.5 ve §7.5b):** veride **hep 4 kademe** (0,85 / 0,95 / 1,05 / 1,15; sayı ve sıra kalıcı, GZ-3); **kademe adları T1 işidir, çekirdek yalnız indeks bilir**. **Kampanya kapalı** (varsayılan: `kampanyaKademesi` ve iki sınırın üçü tanımlı ve > 0 değilse): segment **gizlenir**, ekranda **3 seçenek**; kademe 0 yine de gönderilirse DUK-20. **Açık/kapalı bilgisi veri paketinden okunur** (`param.mulk.perakende`): kareden okunamaz, çünkü `kampanya = [0, 0, 0]` hem "kapalı" hem "bugünkü saat ve haftalık gün hakkı bitti" olabilir. **Kampanya açıkken:** (1) **ayrı komut yoktur**: kampanya `dukkan_fiyat {fiyat: kampanyaKademesi (0)}` ile başlar (ilk seçim pencereyi açar; "kampanya başlat" düğmesi bu komutu gönderir); (2) sınırlar **günde ≤ 6 saat, haftada ≤ 2 gün**; pencere **tam saat sınırlarında** işler: başladığın saat tam sayılır (10:20'de başlayan 16:00'da biter) ve pencere **gün sonunu geçmez** (21:00'de başlayan 24:00'te biter, kalan saat ertesi güne taşınmaz); (3) pencere **paylaşılır**: kampanya sürerken başka yuvaya kampanya vermek **ücretsizdir** ve sayacı artırmaz; (4) bitince yuva **otomatik normale döner** (`varsayilanFiyatKademesi`); saklanan kademe kampanyada kalır, ekran **"kampanya bitti; fiyat normale döndü"** der; (5) **erken bitirme:** kampanya yuvasına başka kademe verilirse hemen normale döner, **tüketilmiş saat iade edilmez**; (6) kampanya seçmek de fiyat değişimidir: **6 saatlik hız sınırı geçerlidir** (DUK-18). **Hafta = sim haftası** (`floor(gün/7)`, takvim haftası değil; gün sınırı 00:00 TRT; **S-18 kapandı**, baş lider): ekran yalnız **"bu hafta kalan gün"** der (`kalanGun`); hafta numarası, hafta başlangıcı ve hafta günü adı **gösterilmez** (A3 §7.5b). Öneri: "hakların {n} gün sonra yenilenir" satırı (sim saatinden istemci hesaplar; hafta başlangıcını dolaylı verdiği için T1 kararıdır). **Hak kontrolü (K1; kare alanlarından):** pencere zaten etkinse (`bitis` > şimdi) düğme gerekmez; değilse hak var ⇔ `kalanSaat > 0` ve (`kalanSaat` < günlük sınır **ya da** `kalanGun > 0`) (bugün başlamışsa kalan saat yeter, yeni günse gün hakkı gerekir). Hız sınırı komut öncesi **önlenir** (DUK-18): kontrol soluk, süre `fiyatT + fiyatDegisimEnAzSaat` farkından geri sayılır ("{n} saat sonra değiştirebilirsin"); ret yalnız yarışta görünür; boş yuvaya fiyat verilemez (DUK-17: önce mal); aynı kademe (DUK-19c). Ret kodları DUK-20/21/22: D-9 |

**Dürüstlük kuralı (A2 §1.9):** kampanya kademesi bütün senaryolarda **net eksidir** (örn. −353 ₺/sa şehir, tek dükkân); arayüz kampanyayı **"kâr"** diye pazarlamaz.

## D-7. Marka adı

| | |
|---|---|
| **Amaç** | Dükkâna **tabela** vermek (kimlik; ekonomiyi etkilemez) |
| **Oyuncu kararı** | Ad, simge ve renk seç; ya da markasız bırak |
| **Gösterilen sayılar** | Uzunluk sayacı **2–24**; hesap başına **en çok 3 marka**; simge ve renk sayısı (palet T1/T2 işi, AÖ-15) |
| **Metin** | Başlık: **Marka** · Alan: **marka adı** · Önizleme (canlı): **Tabelada böyle görünür: {küçük hâli}** · Açıklama 2: **Büyük harf yazabilirsin; ad küçük harfle kaydedilir.** · Açıklama: **Marka yalnızca tabeladır; satışı ya da fiyatı etkilemez.** · **Uyarı (KVKK, A3 §7.7):** **Marka adın dünyadaki herkese görünür ve kalıcıdır. Kişisel bilgi yazma.** · Düğme: **kaydet** · Markasız: **şimdilik markasız** |
| **Telefon / masaüstü** | Telefon: **tam ekran form** (klavye açılırken alan görünür kalır); **akıllı tırnak** iOS/Android'de otomatik gelir: istemci **kaydetmeden önce** `’` (U+2019) ve `‘` (U+2018) işaretlerini `'` (U+0027) ile değiştirir (A3 §7.7 istemci notu, baş lider kararı; K1/T1). **Çift akıllı tırnak (`“ ”`) çevrilmez** ve izinli küme dışıdır: canlı denetim MRK-05 metnini gösterir. Uzun tire (`–`, `—`) ve `´` için A3'te çeviri **yoktur**: istemci bunları sessizce çevirmez; canlı denetim uyarır (öneri; T1/K1 kararı). **Çekirdek ve sunucu yalnız izinli karakteri kabul eder** (normalleştirme çekirdekte yok; günlükteki metin = durumdaki metin). Masaüstü: bina panelinde satır içi form |
| **Ölçüt** | Y8 benzeri (marka adımı atlanabilir mi), KVKK; satış ölçütlerine **etkisi yok** (A3: marka çekimi/fiyatı etkilemez) |
| **Sahip** | T1 (metin, uyarı), K1 (`marka_tanimla`, `dukkan_marka`, istemci doğrulaması) |
| **Ret ve bağımlılık** | Kurallar (A3 §7.7; tek doğrulayıcı `adSozdizimiHatasi`, `AD_KURALI = {min: 2, max: 24, izinli: /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$/}`; **marka adı ve oyuncunun görünen adı AYNI kuralı kullanır**): **2–24** karakter (UTF-16 kod birimi; izinli kümede bir karakter = bir kod birimi); izinli küme `A-Z a-z Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü 0-9`, boşluk, `.` `'` `-` `&`; **reddedilir, düzeltilmez:** baş/son boşluk (yalnız U+0020), ardışık boşluk, en az bir harf yok. İstemci göndermeden önce **kırpar** (K1) ve canlı denetim yapar (aynı düzenli ifade); ardışık boşluğu **uyarır** (çekirdek düzeltmez). **Yasaklı liste yalnız sunucuda** (`ad-suzgec.ts`, `yasakli-adlar.json`; MRK-12): ret **yalnız gönderince** görünür, **neden söylenmez**; katlama büyük/küçük harf, aksan ve ayırıcıya duyarsızdır ("Bim", "b.i.m" aynı sayılır); bot ve ajan yoluna uygulanmaz; liste kapsamı bu belgede **(doğrulanmadı)**. **Büyük harf (S-12; baş lider varsayılanı, sahip teyidi bekler):** girişte büyük harf **izinlidir** ve ret nedeni değildir; marka adı ve görünen ad **küçük harfe çevrilerek saklanır** (`adKanonik`, A3 §7.7: sabit Türkçe tablo `İ→i`, `I→ı`; uzunluk korunur; çeviri idempotenttir; `AD_KURALI.kucukHarf: true`). Oyuncu "İSTANBUL Fırını" yazabilir; kayıtta ve tabelada **"istanbul fırını"** görünür. **Önizleme küçük hâli gösterir** ve istemci çeviriyi **aynı işlevle** yapar (çekirdekten dışa açılan `adKanonik`); `toLowerCase` **kullanılmaz** ("IŞIK" → "ışık", "ISIK" → "ısık" olmalı); sunucu ve çekirdek istemciye güvenmez, yeniden çevirir. Günlükte girilen metin açık kalır, durumda küçük hâli (KVKK notu); yasaklı liste süzgeci **kanonik ad** üzerinde koşar; MRK-11 karşılaştırması da kanonik adla yapılır ("Kebap" yazıp "kebap" markasını yeniden kaydeden MRK-11 alabilir). Sahip "serbest" derse tek satır değişir (`kucukHarf = false`): önizleme satırı kalkar. S11. **Moderasyon:** yönetici `marka_sifirla` ile adı **"adsiz marka"** yer tutucusuna çevirebilir: tabela bu adı olduğu gibi göstermelidir. Ret kodları MRK-01…14: D-9 |

## D-8. Satış görünümü, Dikkat ve "sen yokken"

| | |
|---|---|
| **Amaç** | Dükkânın **ne kazandığını** ve **neye ihtiyaç duyduğunu** tek bakışta göstermek |
| **Oyuncu kararı** | Tek bir düzeltme: "rafı doldur / fiyatı değiştir / bekle" (30 sn kuralı) |
| **Gösterilen sayılar** | Dükkân kartında: **tahmini gelir** (aşağı), **gider 132 ₺/sa** (yukarı), **tahmini net** (gelir aşağı − gider yukarı), **kasa doluluğu** (%), yuva başına tahmini satış. Kümülatif **dükkân geliri** (aşağı). "Sen yokken": net sonuç = **hazine farkı birebir**; satış kalemi **ihracat + dükkân geliri farkı** (A3 §10.3) |
| **Metin** | Kart: **Tahmini satış ≈ 640 ₺/sa · gider 132 ₺/sa · net ≈ 508 ₺/sa** · Kasa: **kasa %94 dolu: satış kasa sınırında** · **Dikkat maddeleri (≤5; öneri):** **Rafına koyabileceğin başka mal var** (yalnız türün malı yuvadan fazlaysa; fırın ve şekerci 2 mal ile tamamdır) · **{mal} stoğun bitti; rafta satılmıyor** · **Kasa dolu: fiyatı yükseltmeyi düşünebilirsin** · **Kampanya bitti** · Sen yokken satırı: **{n} birim satıldı: +1.234 ₺** (mevcut `donus.net` ailesi; yeni aile gerekmez) |
| **Telefon / masaüstü** | Telefon: kart İşletmem'in "Dükkânlarım" bölümünde ilk ekranda **özet satırı** (net), ayrıntı açılır; Dikkat rozeti. Masaüstü: bina paneli ve Dikkat |
| **Ölçüt** | **A0-12** (prim, ilk dükkân medyan ≤36 sa, geri ödeme ≤48 sa), **A0-14** (ilk satışın görünürlüğü), A0-13 (özet ≈12 sn) |
| **Sahip** | K1 (türetme, Dikkat), T1 (metin, düzen) |
| **Ret ve bağımlılık** | Gösterge verisi (A3 §10.2): `OzelBolgeKaresi.dukkanlar` (raf: mal, kademe, `etkin`, `mevcut`, `istekMiliSaat`; `kasaPpm`; kampanya hakları; `karsilanmaPpm`) yalnız sahibine, `GenelBolgeKaresi.dukkanlar` (tabela: tür, ölçek, marka adı, simge, renk) herkese. **Dükkân başına gerçekleşen satış durumda tutulmaz:** kesin değer yalnız sahibin **toplam** yerel satış oranıdır (`ParaAkisi.yerel`, saatlik); dükkân bazlı gelir ve net **tahmindir** (`gercek` satış stoğa bağlıdır ve gösterilmez; A3 §6.8): ekran "≈" ve "tahmini" der, kesinlik iddia etmez; toplam satır **kesin** olarak ayrı gösterilebilir. "Neden satmıyor" satırları D-5 tablosundadır. **Net sonuç birebirliği** testle korunur (`satis + gider + diger = hazineFarki`; A3 §10.3). **İlk satış anı:** Defter damgası "ilk dükkân" (`ilk_dukkan`) **ilk satışla** gelir (yapı bitişiyle değil); ödül **10 çelik** ([rehber §3.1](rehber-gorevler.md)) **bir kez** verilir: dükkân kaldırılıp yeniden kurulursa tekrar verilmez (D-8.1) |

### D-8.1 İnşa iptali ve "dükkânı kaldır" (baş lider kararı)

| | |
|---|---|
| **Amaç** | Yanlış tür ya da yer seçen oyuncuyu **kilitlememek** ("kilit yok, seçim var") ve bunu **dürüst bir bedelle** yapmak |
| **Oyuncu kararı** | İnşa sürerken: "iptal et". Tamamlanınca: "dükkânı kaldır" |
| **Gösterilen sayılar** | **İnşa sürerken iptal (`insaat_iptal`, mevcut komut) %50 iadeli:** ödenen paranın **ve malzemenin (pencere dahil)** yarısı (para **aşağı** yuvarlı; örnek ödenen 4.200 ₺ → iade 2.100 ₺; malzeme düğüm stoğuna döner). **İlk 5 yapı indirimi hakkı geri verilir** (iptalde). **Tamamlanmış dükkân (`dukkan_yik`): iade yok**, yıkımda para hareketi **0**. **Arsa oyuncuda kalır** (sonradan `parsel_birak %70` ile bırakılabilir). **Raftaki mallar zaten depodadır:** ayrı raf stoğu yoktur, satış il düğümü stoğundan çekilir; onay kartında mal listesi **gerekmez**. **İlk 5 yapı indirimi hakkı kaldırmada geri verilmez** ve **ilk dükkân ödülü yeniden kurulumda tekrar verilmez** (kur-yık döngüsüyle kullanılamasın diye) |
| **Metin** | İnşa sırasında (mevcut geri al şeridiyle **aynı yol**, ayrı etiketle): **iptal et (iade %50)** · onay: **İnşaatı iptal edersen ödediğin paranın ve malzemenin yarısı geri gelir. İptal edilsin mi?** · Tamamlanmış: **dükkânı kaldır** · Onay (iadesiz olduğu **açıkça** söylenir): **Dükkânı kaldırırsan harcadığın para ve malzeme geri gelmez. Arsan, depondaki mallar ve markan sende kalır. Yeniden kurarsan bedeli yeniden ödersin. Kaldırılsın mı?** · Düğmeler: **dükkânı kaldır**, **vazgeç** · Sonuç: **Dükkân kaldırıldı. Arsan ve malların sende.** |
| **Telefon / masaüstü** | Telefon: "dükkânı kaldır" dükkân kartının **ikincil** menüsünde (yanlış dokunma riski; ≥44 px, birincil düğmelerden uzak), onay **alt sayfa**. Masaüstü: bina panelinde menü |
| **Ölçüt** | YA (kilit sanma), A0-14 (kart atlama), A0-11 (yanlış kuran oyuncunun yeniden kurma süresi) |
| **Sahip** | T1 (onay metni, yerleşim), K1 (komut, durum) |
| **Ret ve bağımlılık** | Komut: `dukkan_yik {dukkan}` (A3 §7.9 ve §9.1; oyuncu yolu; **tutar, oran, adet alanı yok**; yalnız `dukkan` ek yapısı için, diğer yapılara genellenmez). İnşadaki dükkân için **yeni komut yok:** mevcut `insaat_iptal` dükkân inşaatını kapsar (`mulk/komut.ts:607-632`; A3 koddan doğruladı). **Ret:** DUK-00; **DUK-10** (dükkân yok ya da başkasının: aynı ileti, bilgi sızdırmaz); **DUK-23** (kimlik oyuncunun **süren inşaatına** ait: "dükkân henüz bitmedi; inşaatı iptal edebilirsin"). **Önleme:** "kaldır" yalnız tamamlanmış dükkânda, "iptal et" yalnız inşada gösterilir; DUK-23 yalnız yarışta (inşa kaldır komutuyla çakışırsa) gelir ve ekran **iptal yolunu öne alır**. Kaldırma sonrası ilçe ve il dükkân sayaçları **hemen düşer** (türetilmiş sayaç); dükkân kareden ve hücrenin `tur` alanından kalkar; **marka oyuncuda kalır**, yalnız dükkân bağı düşer; `MulkOyuncuDurumu.ilkSatisT` ve kümülatif dükkân geliri kalır. İlk 24 saatte inşa süresi ≈24 dk: **iptal penceresi dakikalarla ölçülür**; "yanlış yer" fark edilince kaldırma yolu (iadesiz) bu yüzden önemlidir |

## D-9. Ret durumları (A3 §9.3 kesin kodları)

**Kural:** komut gönderilmeden önce önlenebilen her durum **kontrolde** çözülür (soluk düğme + neden satırı). Aşağıdaki ret iletileri yalnız **yarış** (başka sekme, eski durum) ve **sunucu süzgeci** için görünür. Çekirdek iletisi **küçük harfli ASCII-Türkçe düz dizgidir** ve hata kodu alanı yoktur (`KomutSonucu = {tamam: false, hata}`); **kod** sütunu belge, test ve K1 çeviri tablosu içindir. Görünen metin K1/T1'in `hata-mulk.ts` düzenli ifade tablosundadır; aşağıdaki metinler **A3 §9.3 önerisidir** (K1/T1 son kararı verir).

| Kod | Çekirdek iletisi (A3 §9.3, kesin) | Önleme (ekranda) | Gösterilen metin |
|---|---|---|---|
| DUK-00 | `perakende kapali` | Dükkân kartı **hiç gösterilmez** | **Bu dünyada dükkân henüz açık değil.** |
| DUK-01 | `dukkan turu gerekli (dukkanTuru)` | Tür seçmeden "kur" kapalı | **Dükkân türünü seçmelisin.** |
| DUK-02 | `dukkanTuru yalniz dukkan yapisinda verilebilir: <tesisTuru>` | Tür seçici yalnız dükkân akışında | **Dükkân türü yalnız dükkân kurarken seçilir.** |
| DUK-03 | `bilinmeyen dukkan turu: <id>` | Seçici yalnız geçerli türleri gösterir | **Bu dükkân türü yok.** |
| DUK-04 | `dukkan olcegi henuz acik degil: <s\|m\|l>` | M ve L **hiç sunulmaz** | **Bu dükkân boyu henüz açılmadı.** (seviye, teknoloji, sıra **söylenmez**; oyuncu kilidi değildir) |
| DUK-05 | `<tur> dukkani <s\|m\|l> olceginde kurulamaz` | Tür × boy uyumsuzluğu seçilemez | **Bu dükkân türü bu boyda kurulamaz.** |
| DUK-06 | `ilcede en cok <n> dukkan (biten + suren)` | Kart soluk + "bu ilçede dükkânın: 2 / 2" (biten + süren sayılır) | **Bu ilçede en çok {n} dükkânın olabilir.** |
| DUK-07 | `ilde en cok <n> <ad> (biten + suren)` (mevcut) | Kart soluk + "bu ilde 6 / 6" | **Bu ilde en çok {n} dükkânın olabilir.** |
| DUK-08 | `dukkan <S\|M\|L> olceginde <n> hucre kaplar (verilen <k>)` (mevcut) | Seçim ayak izine sabitlenir (S: 1 hücre) | **Dükkân {n} hücre kaplar.** |
| DUK-10 | `dukkan bulunamadi: <id>` (yok ya da oyuncunun değil) | (yarış) | **Bu dükkân yok.** |
| DUK-12 | `gecersiz yuva: <n> (0..<son>)` | Yuva 4 ile sınırlı | **Geçersiz raf yuvası.** |
| DUK-13 | `bu mal bu dukkan turunde satilamaz: <mal>` | Seçici tür dışı malı **göstermez** | **Bu dükkânda bu mal satılamaz.** |
| DUK-14 | `bu mal baska yuvada: <mal>` | Soluk + "zaten rafta" | **Bu mal zaten başka rafta.** |
| DUK-15 | `bilinmeyen mal: <mal>` (mevcut) | (yarış) | **Bilinmeyen mal.** |
| DUK-16 | `gecersiz fiyat kademesi: <n> (0..<son>)` | 4 kademe sabit | **Geçersiz fiyat.** |
| DUK-17 | `bos yuvaya fiyat verilemez` | Boş yuvada kademe kontrolü **kapalı** | **Önce rafa mal koy.** |
| DUK-18 | `fiyat degisimi icin <n> saat beklenmeli` (`n` kalan saat, **yukarı yuvarlı**) | Kontrol soluk + canlı geri sayım (dakika çözünürlüğü; raf demetindeki `fiyatT`'den: İ-6) | **Fiyatı en erken {n} saat sonra değiştirebilirsin.** (ret tam saat der; ekran dakikayı kendi hesabından verir) |
| DUK-19a | `yuva zaten bos` | Boş yuvada "boşalt" kapalı | **Raf zaten boş.** |
| DUK-19b | `yuva zaten bu malla dolu: <mal>` | Aynı seçim yapılamaz | **Bu raf zaten bu malla dolu.** |
| DUK-19c | `fiyat zaten bu kademede` | Aynı kademe seçilemez | **Fiyat zaten bu seviyede.** |
| DUK-20 | `kampanya kademesi acik degil` | Kampanya kapalıyken segment **gizlenir** (D-6) | **Kampanya fiyatı şu an kullanılamıyor.** |
| DUK-21 | `kampanya haftalik gun siniri (en cok <n> gun)` | Gün hakkı bitince "kampanya başlat" soluk + "bu hafta {n} gün hakkın vardı" | **Bu hafta en çok {n} gün kampanya yapabilirsin.** |
| DUK-22 | `kampanya gunluk saat siniri (en cok <n> saat)` | Saat hakkı bitince "kampanya başlat" soluk | **Bugün en çok {n} saat kampanya yapabilirsin.** |
| DUK-23 | `dukkan henuz tamamlanmadi: insaat_iptal kullanin (<id>)` (`dukkan_yik` inşadaki kimlikle) | "Kaldır" yalnız tamamlanmışta; inşada "iptal et" | **Dükkân henüz bitmedi; inşaatı iptal edebilirsin.** (ekran "iptal et" yolunu öne alır; D-8.1) |
| MRK-01 | `gecersiz marka sirasi: <n>` | (yarış) | **Geçersiz marka.** |
| MRK-02 | `hesap basina en cok <n> marka` | 3. markadan sonra "yeni marka" kapalı | **En çok {n} marka tanımlayabilirsin.** |
| MRK-03 | `marka adi metin olmali` | Alan zorunlu | **Marka adı yazılmalı.** |
| MRK-04 | `marka adi <min> ile <max> karakter arasinda olmali` | Canlı sayaç (2–24) | **Marka adı {min} ile {max} karakter olmalı.** |
| MRK-05 | `marka adinda gecersiz karakter` | Canlı denetim (aynı düzenli ifade) | **Marka adında yalnız harf, rakam, boşluk, nokta, kesme işareti, tire ve & kullanılabilir.** |
| MRK-06 | `marka adi bastan ya da sondan bosluk icermemeli` | İstemci göndermeden önce **kırpar** | **Marka adı boşlukla başlayıp bitemez.** (yalnız yarışta) |
| MRK-07 | `marka adinda art arda bosluk olamaz` | Canlı denetim uyarır | **Art arda boşluk olamaz.** |
| MRK-08 | `marka adi en az bir harf icermeli` | Canlı denetim | **Marka adında en az bir harf olmalı.** |
| MRK-09 / 10 | `gecersiz marka simgesi: <n> (0..<son>)` / `gecersiz marka rengi: <n> (0..<son>)` | Palet yalnız geçerli seçenekleri sunar | **Geçersiz simge.** · **Geçersiz renk.** |
| MRK-11 | `marka zaten bu degerlerde` | Değişmeyen markada "kaydet" kapalı (karşılaştırma küçük hâliyle) | **Marka zaten böyle.** |
| MRK-12 | `marka adi kullanilamaz` (**sunucu** süzgeci; çekirdek üretmez) | Yok: yalnız gönderince görünür, neden söylenmez | **Bu ad kullanılamaz; başka bir ad dene.** (görünen ad ucu için de aynı metin) |
| MRK-13 | `bilinmeyen marka: <n>` | Marka yoksa "dükkâna ata" kapalı | **Önce marka tanımlamalısın.** |
| MRK-14 | `dukkan zaten bu markada` | Aynı marka seçilemez | **Dükkân zaten bu markada.** |
| SIS-01 | `marka_sifirla yalnizca 'sistem' ile verilebilir` | (oyuncu yolunda yok) | **İstemciye gösterilmez.** |
| YON-01 | `yontem yalniz tesis turunde verilebilir: <tesisTuru>` | (G6 tesis akışı; dükkân paneli dışı) | **Yöntem yalnız tesis kurarken seçilir.** |
| mevcut | `yetersiz hazine (gereken <n>)` | Maliyet kartında kırmızı satır | **Hazinede yeterli para yok (gereken {n}, yukarı yuvarlı).** |
| mevcut | `yetersiz stok: <düğüm> (mal indeksi <n>)` | Eksik malı kartta **ad ve adetle** göster (A3 §9.3 K1 notu: bugünkü çeviri "çelik ya da makine parçası" der; **pencere** de eksik olabilir) | **{mal} yetmiyor: {var} / {gereken}. Pazar'dan alabilir ya da üretebilirsin.** |
| mevcut | `ayni anda en cok <n> insaat` | Kur düğmesi soluk + "bir inşaat bitsin" | **Aynı anda en çok {n} inşaat sürebilir; birinin bitmesini bekle.** |
| mevcut | `hucre zaten sahipli` / `hucre bos degil` / `ilde isletme yok: <il>` | (yarış) | mevcut `hata-mulk.ts` metinleri |

---

# C. Veri ve komut istekleri (K2'ye; Ar-Ge lideri iletir)

| # | İstek | Neden | Kabul |
|---|---|---|---|
| **İ-1** | **Görünen ad** profil alanı ve ucu (G5'te yok; `KIMLIK.md` §6 "henüz yok"). **Karar verildi** (A3 §7.7, baş lider): oyuncu seçer, sunucu küçük harfli ad üretir, **günde 1 değişiklik** (00:00 TRT), hesap kimliği sabit ve ekranda güncel ad, **kayıtta küçük harf** (`adKanonik`) | G-4 ekranı; herkese görünür ad; e-posta önekinin sızmaması | **K2 uygular:** uç adı ve ret iletisi (gün sınırı **00:00 TRT**, otomatik addan ilk seçim sayılmaz: karar verildi); aynı `adSozdizimiHatasi` ve `ad-suzgec.ts` (marka ile ortak); KVKK silme ve yönetici sıfırlama yolu |
| **İ-2** | ~~Yuva başına `mevcut` bayrağı ve kasa doluluğu~~ | D-5 ve D-8 | **Kapandı:** A3 §10.2 `OzelBolgeKaresi.dukkanlar` raf tuple'ında `mevcut` (0/1), `istekMiliSaat`, ayrıca `kasaPpm` ve `karsilanmaPpm` tanımlıdır; K2 uygular |
| **İ-3** | `IlceKaresi.talep?` (ilçe talebi Q) ya da hazır "yatırım tahmini" alanı | D-3 yatırım tahmini bloğu (A3 §10.2: "G9'da istenirse K2 sonra ekler"; G7 kabulünü bağlamaz) | **Açık.** Q ve esnaf payı; yoksa blok gizli |
| **İ-4** | ~~Kampanya komutu ve kalan hak alanları~~ | D-6 | **Kapandı:** **ayrı komut yok** (`dukkan_fiyat` kademe 0); hak sayaçları kare'de `kampanya: [bitis, kalanSaat, kalanGun]`; tutar alanı yok. Açık/kapalı bilgisi veri paketindedir (D-6) |
| **İ-5** | ~~Dükkân kaldırma komutu ve ret kodları~~ | D-8.1 | **Kapandı:** `dukkan_yik {dukkan}` (A3 §7.9), ret DUK-10 ve DUK-23; inşada mevcut `insaat_iptal` |
| **İ-6** | ~~Raf yuvası başına fiyat değişim zamanı (`fiyatT`)~~ | D-6: 6 saatlik hız sınırının geri sayımı ve komut öncesi önleme | **Kapandı:** A3 8b10e60 §10.2 raf demetinin son öğesi `fiyatT: Ms` (yuvanın son fiyat/mal değişim zamanı; hiç değişmemişse `0` gelir: hız sınırı yok). Ekran "{n} saat sonra değiştirebilirsin" gösterir, DUK-18 önlenir |

---

# D. Ölçütlerle eşleme

| Ölçüt | Ekran | Ölçüm |
|---|---|---|
| **Kılavuz S1.1** giriş ≤3 dk, kabul 6 dk | G-1…G-3 | Gözlem + günlük (`giris_onaylandi`) |
| **A0-6** (giriş → Yerleş → …) | G-1…G-5 | e2e (masaüstü ve telefon) |
| **A0-11** ilk dükkân medyan ≤36 sa; geri ödeme ≤48 sa | D-1…D-5, D-8 | Durum alanları: `baslangic`, `kurulus`, `ilkSatisT` (A3 §15.3) + insan testi ([kılavuz §6.2](insan-testi-kilavuzu.md)); **üç ayrı zaman** (ara kırılım: yapı → kurulma → ilk satış) |
| **A0-12** perakende primi 1,05–1,20 (>1,30 alarm), ilk dükkân medyan ≤36 sa, fiyat savaşı <0,85 R süre ≤%5 | D-3, D-6, D-8 | Defter ve bot; kademe dağılımı |
| **A0-14** ilk saatte ilk satış ≥%70; kart atlama ≤%30 | D-1 (Defter kartı), D-4, D-8 | İnsan testi |
| **Y10** | G-2, D-4 | Gözlem (`BE-B`) |

**İnsan testi bağı.** Kılavuz S1'in "dükkânsız" sürümü yeterlidir; dükkân akışı **G2–G14** döneminde **yönlendirmesiz** (yalnız D-1 kartı) ölçülür. Test sürümü **G7 + G9 sonrası** donar (kılavuz Ö5).

---

# E. Geri dönüşü zor kararlar

| # | Karar | Seçenekler | Neden zor | Öneri |
|---|---|---|---|---|
| **ZG-1** | **Görünen ad** kuralı ve kaynağı (G-4) | **Karar verildi (baş lider; A3 §7.7):** oyuncu seçer, kural **marka adıyla ortak**, sunucu **küçük harfli** ad üretir, kayıt **küçük harf** (`adKanonik`; S-12 varsayılanı), **günde 1 değişiklik**, hesap kimliği sabit; (c) e-posta öneki **asla** | Ad **herkese görünür**, kişisel veri olabilir ve günlükte kalır; e-posta önekinin bir kez yayımlanması geri alınamaz | Karar kapandı; K2 uygular (İ-1). **Açık kalan:** S-12 sahip teyidi (S11: varsayılan küçük harf) |
| **ZG-2** | **Alfa-0 kayıt kapısı** | **Karar verildi (baş lider): davetli listesi.** `--davetli-liste <dosya>` ile açılır; adresler G5'in **normalleştirilmiş e-posta anahtarı** biçiminde; listede olmayan adres de **aynı yanıtı** alır ama **posta gönderilmez** (sızdırmama); varsayılan **kapalı**, test dünyasında ve Alfa-0'da **açık**; liste dosyası **depoya girmez**; sahibi K2, **listeye kimin gireceği sahip kararı** | Hesap = oyuncu bire bir; davetli sayısı ilçe doluluğunu ve ayrılmış hücre hesabını belirler; liste sızarsa kimlik avı riski | Karar kapandı; G-2 metni davetsizi ele vermez; K2 uygular |
| **ZG-3** | **Marka adı** serbest metin ve uyarı metni (D-7) | A3 GZ-8 kararı: serbest ama kısıtlı; uyarı metni T1 | Komut günlüğü ekleme-yalnızdır, **silme zordur**; uyarı olmadan kişisel veri yazılabilir | Uyarı **zorunlu** ve ilk marka girişinde görünür; `marka_sifirla` (sistem yolu) hazır |
| **ZG-4** | **Fiyat kademelerinin sayısı ve sırası** (4, indeks 0 = kampanya) | **Karar verildi:** veride hep 4 kademe (A3 GZ-3); kampanya kapalıyken ekranda 3 seçenek (segment gizli) | Fiyatlar **indeksle** saklanır; araya kademe eklemek anlamı kaydırır. Adlar (kampanya, uygun, normal, yüksek) **kolay** değişir | 4 kademe sabit; adlar T1'in |
| **ZG-5** | **Dükkân kaldırma** | **Karar verildi (baş lider):** inşa sürerken iptal **%50 iadeli**; tamamlanmış dükkân **kaldırılabilir, iade yok**; arsa oyuncuda kalır, raftaki mallar depoya döner | İadesiz onay metni açık olmalı; şemaya yeni komut girer (`dukkan_yik`, A3 §7.9) | Karar kapandı; metin D-8.1'de |
| **ZG-6** | **Yuvarlama kuralı** (aşağı/yukarı) tek işlevde mi | Tek `paraMili` işlevi · yerel yardımcılar | Ekran görüntüleri ve oyuncu güveni; kod değişimi **kolay**, kuraldan sapma **güveni** zedeler | Tek işlev (ilk saat incelemesi B4); lint ile yerel biçimleyici yasak |
| **ZG-7** | **Kampanya penceresi** komutu ve durumu | **Karar verildi:** kampanya onaylı (günde ≤6 sa, haftada ≤2 gün); parametreler G7 şemasında, **varsayılan kapalı, açılabilir**; komut biçimi: **ayrı komut yok**, `dukkan_fiyat` kademe 0 (A3 §7.5b); hafta = sim haftası (S-18 kapandı) | Durum alanı ve komut şemaya girer; sonradan çıkarmak göç ister; A2: kampanya **hep net eksi** (arayüz kâr diye sunmaz) | Karar kapandı; kampanya kapalıyken arayüz segmenti gizler; S-18 kapandı |

# F. Açık sorular

| # | Soru | Önerilen varsayılan |
|---|---|---|
| **S1** | ~~Dükkân yanlış türde/yerde kurulduysa geri dönüş?~~ | **Kapandı (baş lider):** D-8.1 (inşada %50 iade; tamamlanmışta iadesiz kaldırma) |
| **S2** | **Görünen ad ucu** (İ-1) hangi sprintte? G9'un önkoşulu; karar verildi, gün ve ilk seçim kuralı da K2 tarafından belirlendi; ama uç G5'te yok | G-4'ü ertele; uç gelene dek sunucunun ürettiği küçük harfli ad kullanılır, ad değiştirme sonra |
| **S3** | ~~Kampanya Alfa-0'da var mı?~~ | **Kapandı (baş lider):** onaylı, parametreyle açılır/kapanır; kapalıyken segment gizli (D-6 a), açıkken başlat ve hak sayaçları (D-6 b) |
| **S4** | Birim fiyat gösterimi: tam ₺ (aşağı) mı, 1 ondalık mı? Ör. R=70 ₺ × 0,95 = 66,5 ₺ | Tam ₺ aşağı (66 ₺); T1 karar verir |
| **S5** | Tarayıcıya bağlı bağlantı **varsayılan kapalı**; uygulama içi tarayıcı oyuna uygun mu? | Pilot (Android ve iOS) ile doğrulanır |
| **S6** | KVKK silme talebi (`hesapSil` ucu yok): Ayarlar'da "hesabımı sil" olmadan nasıl yürür? | Yönetici yolu; destek metni sahip işi |
| **S7** | ~~Davet/izin listesi~~ | **Kapandı (baş lider):** `--davetli-liste` (ZG-2) |
| **S8** | Yatırım tahmini bloğu için `IlceKaresi.talep?` (İ-3): G9'a mı, sonraya mı? | Sonra; blok gizli kalır, sayı uydurulmaz |
| **S9** | ~~A3 Parça 2 sonrası D-9 güncellemesi~~ | **Kapandı:** D-9 A3 8b10e60 §9.3 kesin kodlarıyla yeniden yazıldı; A3 yeniden değişirse A1 günceller |
| **S10** | ~~`ilk_dukkan` tetiği ile A0-11 zamanı~~ | **Kapandı (A3 §15.3, GZ-14):** tetik **ilk satış**; ölçüm **üç zaman** ayrı satırda (yapı komutu, kurulma, ilk satış) |
| **S11** | **Büyük harf** (S-12): marka ve görünen ad **küçük harfe çevrilerek saklanır** (baş lider varsayılanı; `adKanonik`, A3 8b10e60 §7.7). Oyuncu büyük harf yazabilir, kayıtta ve ekranda küçük hâli görünür | **Varsayılan küçük harf; sahip ve KVKK teyidi bekler.** Sahip "serbest" derse tek satır değişir (`AD_KURALI.kucukHarf = false`); G-4/D-7 önizleme satırı kalkar |
| **S12** | ~~Kampanya haftası (S-18)~~ | **Kapandı (baş lider):** sim haftası (`floor(gün/7)`), gün sınırı 00:00 TRT; ekran yalnız "bu hafta kalan gün" der; "hakların {n} gün sonra yenilenir" satırı öneri olarak kalır (T1 kararı) |

# G. Doğrulanmayanlar ve sınırlar

| Konu | Durum |
|---|---|
| A3 §6–§10 sayıları, DUK/MRK kodları, kampanya ve kaldırma kuralları | **Kesin** (A3 8b10e60, baş lider onaylı); ama **kod henüz yok** olabilir (G7: K3/K2) ve 8b10e60'in `entegrasyon`'a girişi **(doğrulanmadı)** |
| Dükkân bedeli ve inşa süresi (6.000 ₺, 4 sa, 20 çelik, 8 parça, **4 pencere**) | A3 §7.2 ve §7.4: **P-İthal baş lider kararı (verildi)**. Gerçek pencere maliyeti ≈2.400 ₺ (A3 B3); A2 1.600 ₺ sayar |
| G5 uçları | K2 dalı (`takim/k2/g5-eposta-giris`); `entegrasyon`'a girmemiş olabilir |
| Uygulama içi tarayıcı çerezi, posta uygulaması, yeniden gönder bekleme süresi (60 sn: karar verildi, uygulanması K1/K2) | **Doğrulanmadı;** pilot (yalnız çerez ve posta uygulaması) |
| Görünen ad ucu (İ-1), ilçe talebi alanı (İ-3) | **Kareda ve G5'te yok**; raf `mevcut`, `fiyatT`, kasa ve kampanya hakları A3 8b10e60 §10.2'de **tanımlıdır** ama uygulaması (K2) bekliyor |
| Dükkân panelinin ekran düzeni (Dükkânlarım bölümü, bina paneli) | Mevcut İşletmem ve bina paneli düzenine göre **öneri**; görsel tasarım T1'de |
| Hiçbir test koşulmadı; hiçbir sunucu başlatılmadı | Yalnız belge |
