# G9 oyuncu akışı: giriş ekranı ve dükkân paneli (A1)

> **Durum.** 1 Ekim 2026 gece, Ar-Ge A1. **Yalnız belge**: kod, parametre ve başka belge değiştirilmedi; hiçbir test koşulmadı, hiçbir sunucu başlatılmadı. T1 (metin, düzen, telefon) ve K1 (istemci mantığı, komut) için girdidir. Sayıların hepsi **öneri ya da başka belgenin taslağıdır**; **(doğrulanmadı)** etiketi koddan ya da kaynak belgeden teyit edilemeyen bilgiyi gösterir.
>
> **Bağımlılık işareti.** A3'ün şartnamesi (`docs/arastirma/p4-p5-sartname.md`, dal `takim/a3/p4-p5-sartname`, 0bbcdb4) §6–§10 hâlâ **taslaktır (Parça 2)**. Bu belgede o bölümlere dayanan her yer **"A3 Parça 2'ye göre güncellenecek"** diye işaretlidir (ilgili satırda `[A3-P2]`). G5 (e-posta girişi) K2 dalında uygulanmıştır (`takim/k2/g5-eposta-giris`, 23527a0, `docs/agent-results/G5-k2.md`) ve `entegrasyon`'a **henüz girmemiştir**; uç ve hata kodları o dalın sözleşmesindendir.

| Alan | Değer |
|---|---|
| Görev | G9 "giriş ekranı ve dükkân paneli" ([10 §5A](../10-gorev-listesi.md)); bağımlılık G2, G5, G7 |
| Dayanaklar | A3 `p4-p5-sartname.md` §7 (dukkan S), §9 (komutlar, ret iletileri), §10 (protokol), §6.8 (okuma API'si) · K2 `G5-k2.md` ve `KIMLIK.md` (K2 dalı sürümü) · A2 `p4-p5-ekonomi.md` §1.9 (dükkân ekonomisi; dal `takim/a2/p4-p5-ekonomi`) · [insan testi kılavuzu](insan-testi-kilavuzu.md) §3.2, §6.2 · ilk saat ekran incelemesi (dal `takim/a1/ilk-saat-inceleme`; B2, B4, B7, B8) · [rehber-gorevler](rehber-gorevler.md) §3.1 · [donus-deneyimi](donus-deneyimi.md) §2.9, §3C · [P4/P5 içerik taslağı](p4-p5-icerik-taslagi.md) §dükkân türleri |
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
8. **Bulunan boşluk (zor):** dükkân **bırakılamaz ve yıkılamaz** (A3 §7.9); oyuncu yanlış türü ya da yeri seçerse 24 dakikalık inşa ve bedel geri alınmaz. Bu, "yanlış seçim kilitlemez" ilkesiyle ([baslangic Y-İ5](baslangic-ve-ustalik.md)) çelişir; açık sorular §S1'de.
9. **Veri isteği (K2):** dükkân panelinin üç göstergesi bugün şartnamede yok: yuva başına "mevcut" (stoksuz yuva çekime girmez), ilçe talebi (`IlceKaresi.talep?`) ve görünen ad alanı (§C: İ-1…İ-5).
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

Tek işlev: `paraMili(mili, "asagi" \| "yukari")` (T1'in tek biçimleyicisi). **Aynı ekranda aynı büyüklük iki farklı yuvarlamayla yazılmaz** (ilk saat incelemesi B4: 10.001 ₺, 39.999 ₺ ve 40.000 ₺ üçlüsü).

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
| **Metin** | Başlık: **Bölge Stratejisi'ne gir** · Alt: **E-posta adresini yaz; sana bir giriş bağlantısı gönderelim. Parola gerekmez.** · Alan etiketi: **e-posta adresin** · Düğme: **bağlantı gönder** · Küçük yazı: **Adresin yalnız giriş için kullanılır. Başkalarına görünmez.** (+ aydınlatma metnine bağlantı: **veri kullanımı**) |
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
| **Metin** | Başlık: **Postanı kontrol et** · Gövde: **{adres} adresine bir giriş bağlantısı gönderdik. Bağlantı 10 dakika geçerli ve yalnız bir kez kullanılır.** · Yardım (daraltılabilir): **Gelmediyse gereksiz ya da spam klasörüne bak. Adresi yanlış yazdıysan değiştir.** · Düğmeler: **adresi değiştir**, **yeniden gönder** (bekleme sırasında: **yeniden gönder (45 sn)**) |
| **Telefon / masaüstü** | Telefon: büyük "posta uygulamasını aç" kısayolu **konmaz** (uygulama seçimi cihaza bağlı, **doğrulanmadı**); iki düğme alt alta. Masaüstü: aynı kart |
| **Ölçüt** | S1.1 süre; **posta gecikmesi** (T4 takılma: "bağlantı gelmedi") kılavuz örnek satırı |
| **Sahip** | T1, K1 |
| **Ret ve bağımlılık** | **Posta hatası kullanıcıya görünmez** (K2 kararı: yalnız sayaç); bu yüzden "gelmedi" yolu burada çözülür. Yeniden gönder `POST /giris/istek` (e-posta başına 3/saat, K2): sınır aşılırsa `hiz_siniri` (G-6). Yeniden gönder bekleme süresi (45 sn) **öneridir**, K2'de parametre değildir **(doğrulanmadı)** |

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
| **Oyuncu kararı** | Önerilen adı kabul etmek ya da değiştirmek ("tamam" en hızlı yol) |
| **Gösterilen sayılar** | Uzunluk sayacı (en çok 24 karakter; kural §D-7'deki marka kuralıyla **aynı izinli küme** önerilir, K2 kararı bekler) |
| **Metin** | Başlık: **Sana ne diyelim?** · Gövde: **Bu ad dünyadaki herkese görünür. Gerçek adını yazman gerekmez.** · Alan: **görünen adın** (hazır öneri, ör. "esnaf-4k7") · Düğme: **tamam** · Hata: **Bu ad kullanılamaz; başka bir ad dene.** |
| **Telefon / masaüstü** | Önerilen ad alanda **hazır** gelir; klavye açılmadan "tamam" ile geçilebilir (K3/K4 için sürtünme yok) |
| **Ölçüt** | S1.1 (giriş → ilk karar); KVKK |
| **Sahip** | T1 (metin), **K2 (alan ve uç yok)**, K1 |
| **Ret ve bağımlılık** | **Görünen ad alanı bugün YOK:** `KIMLIK.md` §6 "ayrı bir profil alanı olacaktır (çekirdeğe girmez; henüz yok)"; ekran görüntülerindeki "ali", "cem" geliştirme kimliğidir. **E-posta öneki ad olarak kullanılmaz** (kişisel veri sızar). Bu ekran K2 işi bitmeden yapılamaz: **İ-1**. Geçici çözüm: sunucu üretimli opak ad (`o_xxxxxxxx`) ya da istemci önerisi, ad değiştirme sonra |

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
| `hiz_siniri` (429) | E-posta başına 3/saat, IP başına 20/saat, genel sınır | G-1 ve G-2 | **Çok sık denendi. {n} dakika sonra yeniden dene.** (`beklemeSn` → yukarı yuvarlı dakika) | düğme kapalı + geri sayım |
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

Kaynaklar: A3 §7 (dükkân), §9.3 (kod ve iletiler), §10.2 (kare alanları); A2 §1.9 (sayılar). **Tüm A3 sayıları taslaktır `[A3-P2]`; A2'nin sayıları `afdf29f` sürümündendir.** Dükkân S sabitleri (taslak): raf **4 yuva**, kasa **90 birim/sa**, işletme gideri **132 ₺/sa**, bedel **6.000 ₺ + 20 çelik + 8 makine parçası**, inşa **4 sa (ilk 24 saatte ≈24 dk)**, ilçede ≤2 dükkân, ilde ≤6, ayak izi S = **1 hücre**.

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
| **Ret ve bağımlılık** | **G7+G9.** `ilk_dukkan` bugün yer tutucudur ve `etkin: false` gelir (`odul/dedektor.ts`); A3 §7.8 tetiği **ilk satış** yapar (yapı bitti değil: ödül bedelden ucuza alınamasın) `[A3-P2]`. Tür **beş S** (bakkal, fırın, şarküteri, şekerci, yapı market): yapı market G8'e bağlıdır |

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
| **Ret ve bağımlılık** | `[A3-P2]` Komut: `tesisTuru: "dukkan"` + **`dukkanTuru`** zorunlu (DUK-01/02/03). **İlk saat incelemesi B2:** yer olarak **ücretsiz yurt hücresi** önerilir ("arsa 0 ₺"); ek arsa almak zorunlu değildir (`yapi_yerlestir` kendi hücreni kabul eder). İlçe sınırı DUK-06, il sınırı DUK-07: **önleme:** sınır dolmuşsa tür kartı soluk ve **neden satırı** ("Bu ilçede en çok 2 dükkânın olabilir") |

**Mal listeleri (taslak `[A3-P2]`; T3 verisi):** bakkal 8 mal (gıda, ekmek, un, süt, süt ürünü, şekerleme, fındık ürünü, yakıt); fırın (ekmek, gıda); şarküteri (süt, süt ürünü, gıda); şekerci (şekerleme, fındık ürünü); yapı market (cam, pencere, çelik, parça). Raf 4 yuvadır: oyuncu hangi 4 malı koyacağını **seçer** ([içerik taslağı](p4-p5-icerik-taslagi.md)).

## D-3. Maliyet kartı ve yatırım tahmini

| | |
|---|---|
| **Amaç** | Karar anında **gereken ve var olan**ı göstermek; paranın nereye gittiğini açıklamak |
| **Oyuncu kararı** | "Kur" ya da "vazgeç" |
| **Gösterilen sayılar** | Satırlar: **Arsa** (kendi arsan: 0 ₺) · **Dükkân** 6.000 ₺ (ilk 5 yapıda %30 indirimli: örnek 4.200 ₺) · **Çelik** 20 (indirimli 14) · **Makine parçası** 8 (indirimli **6**: gerçek düşüm 5,6, **maliyet yukarı**) · **Süre** 4 sa (yeni oyuncuya ilk gün ≈ 24 dk) · **Toplam** ve **Hazine** (aşağı). **Yatırım tahmini** (isteğe bağlı ikinci blok, aşağıda) |
| **Metin** | Başlık: **Bakkal · 1 hücre** · Satırlar yukarıdaki gibi · Düğme: **dükkânı kur** · İkincil: **vazgeç** · Uyarı (D-9'dan önleme): **Hazinen bu bedeli karşılamıyor (gereken 4.200 ₺, hazine 3.900 ₺).** |
| **Telefon / masaüstü** | Telefon: alt kart, ödül/Defter bildirimi **kartı örtmez** (B5/BK-3 çözümü) ve açıkken sırada bekler. Masaüstü: harita üstü kart (mevcut `Çiftlik` maliyet kartı düzeni) |
| **Ölçüt** | A0-11 (kurma kararı ≤3 dk), A0-12 (perakende primi: bedel/geri ödeme anlaşılırlığı) |
| **Sahip** | T1 (düzen, metin), K1 (planlayıcıdan sayılar; **kart ile çip aynı yuvarlama**) |
| **Ret ve bağımlılık** | **Pencere kuralı (A3 §7.4, baş lider onayı GZ-15 bekler) `[A3-P2]`:** **G8'den önce** dükkân bedelinde **pencere yoktur** (seçenek B: yalnız çelik ve parça); G8 gelince bedele **4 pencere** eklenir (yeni kurulumlar). Kart bu durumda **ek bir satır** gösterir (**Pencere 4: stokta 0**) ve eksikse **Pazar'dan al** kısayolu verir; çekirdek iletisi `yetersiz stok: <düğüm> (mal indeksi <n>)` mal **adını** söylemelidir (A3 §9.3 K1 notu: bugün "çelik ya da makine parçası" der). **İthal yolu:** pencere stoğu yoksa oyuncu NPC'den ithal eder (ticaret emri: oran emri; yeni oyuncu kalkanında komisyon ve tarife yok), A2'nin hesabıyla ≈1.600 ₺ ek nakit |

**Yatırım tahmini bloğu (öneri; A2 §1.9 "Yatırım Tahmini kartı").** İlçe sınıfına göre dürüst bir beklenti: **şehir** ≈ 727 ₺/sa net, geri ödeme ≈ 12 sa; **kasaba** ≈ 524 ₺/sa, ≈ 17 sa; **kırsal** ≈ 32 ₺/sa, ≈ 281 sa (A2, tek dükkân, normal fiyat, nakit yatırım, indirimli). Kırsal ilçede metin: **Bu ilçede küçük bir pazar var; dükkân kendini yaklaşık 12 günde öder.** Sonuç, "kilit değil, sonuç"tur ([12 §12](../12-yon-taslagi.md)): kart engellemez, **bilgi verir**. **Veri isteği İ-3:** ilçe talebi bugün kare alanında yok (`IlceKaresi.talep?` A3 §10.2: "G9'da istenirse K2 sonra ekler") `[A3-P2]`; olmadan blok **gizlenir**, sayı uydurulmaz.

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
| **Ret ve bağımlılık** | **Boşluk:** inşa bitince yeni dükkânın rafı **boştur** (`dukkanVarsayilani`: yuvalar boş, kademe varsayılan; A3 §7.2) `[A3-P2]`; hiçbir şey satılmaz. Bu yüzden öneri **zorunlu bir parçadır**, süs değil. İlk dükkân ölçütü (A0-11) **iki ayrı zaman** ister: **yapı komutu** ve **ilk satış** (`dukkanGeliri > 0`, Defter `ilk_dukkan` tetiği) |

## D-5. Raf atama

| | |
|---|---|
| **Amaç** | Hangi malın satılacağını seçmek (4 yuva) |
| **Oyuncu kararı** | Her yuva için **bir mal** (ya da boş) |
| **Gösterilen sayılar** | Her malda: **stok** (düğüm toplamı), **üretim hızı** (birim/sa), **dünya fiyatı R** ve kademe fiyatı (aşağı yuvarlı); yuva başı **tahmini satış** ("≈ 28 birim/sa"; `istek`, kasa kırpmalı); dükkân başı **kasa doluluğu** (90 birim/sa'e oran) |
| **Metin** | Başlık: **Raf** · Boş yuva: **boş: mal ekle** · Yuva seçici başlığı: **Bu yuvaya hangi malı koyalım?** · Mal satırı: **ekmek · stokta 320 · 63 ₺** · Mal yok (stoksuz): **stoğun yok; üretim kurunca satış başlar** (soluk) · Bilgi: **Bir mal tek rafta olabilir. Kasa saatte en çok 90 birim satar.** |
| **Telefon / masaüstü** | Telefon: 2×2 yuva ızgarası, her biri ≥44 px; mal seçici alt sayfa. Masaüstü: bina panelinde 4 satır |
| **Ölçüt** | **A0-11 / A0-12** (ilk satış, çeşit), YA5 (satış anlayışı), A0-14 |
| **Sahip** | K1 (`dukkan_raf`), T1 (seçici, metin) |
| **Ret ve bağımlılık** | `[A3-P2]` `dukkan_raf {dukkan, yuva, mal \| null}`; tutar alanı yok. **Önleme > ret:** (1) tür dışı mal seçicide **hiç gösterilmez** (DUK-13), (2) başka yuvada olan mal **soluk** ve "zaten rafta" (DUK-14), (3) dolu yuvada mal değişimi **hız sınırı** sayacıyla (DUK-18; D-6). **Stoksuz yuva çekime girmez** (A3 §6.4 adım 1): istemci bunu **görünür** yapmalı (yuva soluk, "stoğun yok"); **veri isteği İ-2:** yuva başına `mevcut` bayrağı (`dukkanlar` özel kare alanında yok); yoksa istemci düğüm stoğundan **yaklaşık** türetir (mevcut koşul: `anlikMiktar > 0 ∥ uretimOrani > 0 ∥ gelenOran > 0`) **(doğrulanmadı: kare alanı erişimi)** |

**Not (zorunlu seçim yok):** Rafa mal koymak **bedelsizdir** (tutar yok) ve geri alınabilir; mal değişimi 6 saatlik hız sınırına tabidir (ilk doldurma ve boşaltma muaf).

## D-6. Fiyat kademesi ve kampanya penceresi

| | |
|---|---|
| **Amaç** | Her yuvanın **fiyat kademesi**ni seçmek; kampanyayı yalnız pencere içinde kullanmak |
| **Oyuncu kararı** | Her yuva için **bir kademe** (varsayılan **normal**) |
| **Gösterilen sayılar** | **4 kademe** (baş lider onaylı): **kampanya 0,85 R**, **uygun 0,95 R**, **normal 1,05 R (varsayılan)**, **yüksek 1,15 R**. Seçili kademenin **birim fiyatı** (R × çarpan, **aşağı yuvarlı tam ₺**; örnek ekmek R=60 ₺: 51 / 57 / 63 / 69) ve yuva başı **tahmini satış ve net**. Hız sınırı: **kalan süre** (6 saat; dakika çözünürlüğü). Kampanya hakkı: **bugün kalan 6 saat**, **bu hafta kalan gün (en çok 2)** |
| **Metin** | Segment: **kampanya · uygun · normal · yüksek** · Altı: **Normal fiyat, çoğu zaman en iyi dengedir.** (**yüksek** seçilince: **Fiyat yükselince satış payın düşebilir; kasa doluysa gelir artar.**) · Hız sınırı: **Fiyatı en erken 3 saat 20 dk sonra değiştirebilirsin.** · Kampanya düğmesi: **kampanya başlat (6 saat)** · Kampanya açıkken: **Kampanya sürüyor: 4 saat 10 dk kaldı** · Kampanya uyarısı: **Kampanya fiyatı dünya pazarında satmaktan düşüktür; satış artmayabilir.** |
| **Telefon / masaüstü** | Telefon: 4 kademe **segment kontrol** (her biri ≥44 px, yan yana sığmazsa 2×2); hız sınırında kontrol soluk ve süre satırı. Masaüstü: yuva satırında 4 düğme |
| **Ölçüt** | **A0-12:** perakende primi **1,05–1,20** (alarm **>1,30**), fiyat savaşı (**<0,85 R**) süresi **≤%5**; kademe dağılımı insan testinde gözlenir. A2: rasyonel oyuncu **üst kademeye yığılır** (1,15 R → prim 1,291): arayüz **yüksek**'i öne **çıkarmaz** |
| **Sahip** | T1 (kontrol, metin, adlar), K1 (`dukkan_fiyat`, geri sayım) |
| **Ret ve bağımlılık** | `[A3-P2]` **Kademe adları T1 işidir; çekirdek yalnız indeks bilir** (A3 §7.5); **sayı ve sıra kalıcıdır** (GZ-3). Hız sınırı komut öncesi **önlenir** (DUK-18); boş yuvaya fiyat verilemez (DUK-17: önce mal); aynı kademe (DUK-19c). **Kampanya penceresi:** A3 Parça 1 **mekanizmayı içermez** (kampanya kademesi `dukkan_fiyat` ile seçilemez, DUK-20; `kampanyaKademesi` yalnız yer tutar) ve baş lider kararı **pencere kuralını** verir (**günde ≤6 saat, haftada ≤2 gün**): komut ve durum biçimi A3 Parça 2'de belirlenir **(doğrulanmadı)**. Arayüz bu yüzden iki durumu ayırır: (a) pencere mekaniği **yoksa** kampanya segmenti **hiç gösterilmez** (3 kademe); (b) **varsa** "başlat" düğmesi ve hak sayaçları (§S3) |

**Dürüstlük kuralı (A2 §1.9):** kampanya kademesi bütün senaryolarda **net eksidir** (örn. −353 ₺/sa şehir, tek dükkân); arayüz kampanyayı **"kâr"** diye pazarlamaz.

## D-7. Marka adı

| | |
|---|---|
| **Amaç** | Dükkâna **tabela** vermek (kimlik; ekonomiyi etkilemez) |
| **Oyuncu kararı** | Ad, simge ve renk seç; ya da markasız bırak |
| **Gösterilen sayılar** | Uzunluk sayacı **2–24**; hesap başına **en çok 3 marka**; simge ve renk sayısı (palet T1/T2 işi, AÖ-15) |
| **Metin** | Başlık: **Marka** · Alan: **marka adı** · Açıklama: **Marka yalnızca tabeladır; satışı ya da fiyatı etkilemez.** · **Uyarı (KVKK, A3 §7.7):** **Marka adın dünyadaki herkese görünür ve kalıcıdır. Kişisel bilgi yazma.** · Düğme: **kaydet** · Markasız: **şimdilik markasız** |
| **Telefon / masaüstü** | Telefon: **tam ekran form** (klavye açılırken alan görünür kalır); **akıllı tırnak** ve uzun tire iOS/Android'de otomatik gelir: istemci **kaydetmeden önce** `’ ‘ ´` → `'` ve `–` `—` → `-` çevirir (A3 §7.7 madde 2: Unicode kesme işaretleri **reddedilir**, normalleştirme çekirdekte yok; çevirme bu yüzden istemci işidir). Masaüstü: bina panelinde satır içi form |
| **Ölçüt** | Y8 benzeri (marka adımı atlanabilir mi), KVKK; satış ölçütlerine **etkisi yok** (A3: marka çekimi/fiyatı etkilemez) |
| **Sahip** | T1 (metin, uyarı), K1 (`marka_tanimla`, `dukkan_marka`, istemci doğrulaması) |
| **Ret ve bağımlılık** | `[A3-P2]` Kurallar (çekirdek, MRK-03…MRK-08): **2–24** karakter; izinli küme **A–Z a–z Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü 0–9, boşluk, `.` `'` `-` `&`**; baş/son boşluk yok; ardışık boşluk yok; en az bir harf. Yasak liste **sunucuda** (MRK-12 `marka adi kullanilamaz`): ret **yalnız gönderince** görünür ve neden söylenmez ("Bu ad kullanılamaz; başka bir ad dene."). İstemci **canlı denetim** yapar (aynı düzenli ifade, `^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$`) ve kırpar |

**Ret metinleri (canlı ve gönderim):**

| Kod | Metin |
|---|---|
| MRK-04 | **Marka adı 2 ile 24 karakter arasında olmalı.** |
| MRK-05 | **Marka adında yalnız harf, rakam, boşluk, nokta, kesme işareti, tire ve & kullanılabilir.** |
| MRK-06 / 07 | **Marka adı boşlukla başlayıp bitemez ve art arda boşluk içeremez.** (istemci sessizce düzeltir; ret yalnız yarışta) |
| MRK-08 | **Marka adında en az bir harf olmalı.** |
| MRK-12 | **Bu ad kullanılamaz; başka bir ad dene.** |
| MRK-02 | **En çok 3 marka tanımlayabilirsin.** |

## D-8. Satış görünümü, Dikkat ve "sen yokken"

| | |
|---|---|
| **Amaç** | Dükkânın **ne kazandığını** ve **neye ihtiyaç duyduğunu** tek bakışta göstermek |
| **Oyuncu kararı** | Tek bir düzeltme: "rafı doldur / fiyatı değiştir / bekle" (30 sn kuralı) |
| **Gösterilen sayılar** | Dükkân kartında: **tahmini gelir** (aşağı), **gider 132 ₺/sa** (yukarı), **tahmini net** (gelir aşağı − gider yukarı), **kasa doluluğu** (%), yuva başına tahmini satış. Kümülatif **dükkân geliri** (aşağı). "Sen yokken": net sonuç = **hazine farkı birebir**; satış kalemi **ihracat + dükkân geliri farkı** (A3 §10.3) |
| **Metin** | Kart: **Tahmini satış ≈ 640 ₺/sa · gider 132 ₺/sa · net ≈ 508 ₺/sa** · Kasa: **kasa %94 dolu: satış kasa sınırında** · **Dikkat maddeleri (≤5; öneri):** **Rafında boş yuva var** · **{mal} stoğun bitti; rafta satılmıyor** · **Kasa dolu: fiyatı yükseltmeyi düşünebilirsin** · **Kampanya bitti** · Sen yokken satırı: **{n} birim satıldı: +1.234 ₺** (mevcut `donus.net` ailesi; yeni aile gerekmez) |
| **Telefon / masaüstü** | Telefon: kart İşletmem'in "Dükkânlarım" bölümünde ilk ekranda **özet satırı** (net), ayrıntı açılır; Dikkat rozeti. Masaüstü: bina paneli ve Dikkat |
| **Ölçüt** | **A0-12** (prim, ilk dükkân medyan ≤36 sa, geri ödeme ≤48 sa), **A0-14** (ilk satışın görünürlüğü), A0-13 (özet ≈12 sn) |
| **Sahip** | K1 (türetme, Dikkat), T1 (metin, düzen) |
| **Ret ve bağımlılık** | Gösterge verisi: `OzelBolgeKaresi.dukkanlar` (raf, `istekMiliSaat`) ve `GenelBolgeKaresi.dukkanlar` (tabela) `[A3-P2]`. **`gercek` satış stoğa bağlıdır ve gösterilmez** (A3 §6.8): ekran **tahmin** der ("≈", "tahmini"), kesinlik iddia etmez. Stoksuz yuva (İ-2) görünmezse "satış durdu" nedeni anlatılamaz. **Net sonuç birebirliği** testle korunur (`satis + gider + diger = hazineFarki`; A3 §10.3). **İlk satış anı:** Defter damgası "ilk dükkân" (`ilk_dukkan`) **ilk satışla** gelir; ödül **10 çelik** ([rehber §3.1](rehber-gorevler.md)) |

## D-9. Ret durumları (A3 §9.3 kodlarıyla)

**Kural:** komut gönderilmeden önce önlenebilen her durum **kontrolde** çözülür (soluk düğme + neden satırı). Aşağıdaki ret iletileri yalnız **yarış** (başka sekme, eski durum) ve **sunucu süzgeci** için görünür. Görünen metin K1/T1'in `hata-mulk.ts` tablosundadır; **çekirdek iletisi** kod sütunundaki biçimdedir `[A3-P2]`.

| Kod | Çekirdek iletisi (kısaltılmış) | Önleme (ekranda) | Gösterilen metin |
|---|---|---|---|
| DUK-00 | `perakende kapali` | Dükkân kartı **hiç gösterilmez** | **Bu dünyada dükkân henüz açık değil.** |
| DUK-01 / 02 | `dukkan turu gerekli` / `yalniz dukkan yapisinda` | Tür seçmeden "kur" kapalı | **Dükkân türünü seçmelisin.** |
| DUK-03 | `bilinmeyen dukkan turu` | Seçici yalnız geçerli türleri gösterir | **Bu dükkân türü yok.** |
| DUK-04 | `dukkan olcegi henuz acik degil` | M ve L **hiç sunulmaz** | **Bu dükkân boyu henüz dünyada açılmadı.** (seviye, teknoloji, sıra **söylenmez**) |
| DUK-05 | `<tur> dukkani <ölçek> olceginde kurulamaz` | Tür × boy uyumsuzluğu seçilemez | **Bu dükkân türü bu boyda kurulamaz.** |
| DUK-06 | `ilcede en cok <n> dukkan` | Kart soluk + "bu ilçede dükkânın: 2 / 2" | **Bu ilçede en çok {n} dükkânın olabilir.** |
| DUK-07 | `ilde en cok <n> <ad>` | Kart soluk + "bu ilde 6 / 6" | **Bu ilde en çok {n} dükkânın olabilir.** |
| DUK-08 | `dukkan <S\|M\|L> olceginde <n> hucre kaplar` | Seçim ayak izine sabitlenir (S: 1 hücre) | **Dükkân {n} hücre kaplar.** |
| DUK-10 | `dukkan bulunamadi` | (yarış) | **Bu dükkân artık yok.** |
| DUK-12 | `gecersiz yuva` | Yuva 4 ile sınırlı | **Geçersiz raf yuvası.** |
| DUK-13 | `bu mal bu dukkan turunde satilamaz` | Seçici tür dışı malı **göstermez** | **Bu dükkânda bu mal satılamaz.** |
| DUK-14 | `bu mal baska yuvada` | Soluk + "zaten rafta" | **Bu mal zaten başka rafta.** |
| DUK-15 | `bilinmeyen mal` | (yarış) | **Bilinmeyen mal.** |
| DUK-16 | `gecersiz fiyat kademesi` | 4 kademe sabit | **Geçersiz fiyat.** |
| DUK-17 | `bos yuvaya fiyat verilemez` | Boş yuvada kademe kontrolü **kapalı** | **Önce rafa mal koy.** |
| DUK-18 | `fiyat degisimi icin <n> saat beklenmeli` | Kontrol soluk + canlı süre (dakika çözünürlüğü) | **Fiyatı en erken {n} saat sonra değiştirebilirsin.** |
| DUK-19a / b / c | `yuva zaten bos` / `zaten bu malla dolu` / `zaten bu kademede` | Aynı seçim yapılamaz | **Raf zaten boş.** · **Bu raf zaten bu malla dolu.** · **Fiyat zaten bu seviyede.** |
| DUK-20 | (kampanya kademesi pencere dışı) `[A3-P2]` | Kampanya segmenti pencere dışında **gösterilmez** | **Kampanya yalnız kampanya penceresinde seçilebilir.** |
| MRK-01…MRK-14 | bkz. D-7 tablosu | Canlı denetim | bkz. D-7 |
| MRK-13 / 14 | `bilinmeyen marka` / `zaten bu markada` | Marka yoksa "dükkâna ata" kapalı | **Önce marka tanımlamalısın.** · **Dükkân zaten bu markada.** |
| mevcut | `yetersiz hazine (gereken <n>)` | Maliyet kartında kırmızı satır | **Hazinede yeterli para yok (gereken {n} ₺, yukarı yuvarlı).** |
| mevcut | `yetersiz stok: <düğüm> (mal indeksi <n>)` | Eksik malı kartta **ad ve adetle** göster | **{mal} yetmiyor: {var} / {gereken}. Pazar'dan alabilir ya da üretebilirsin.** |
| mevcut | `ayni anda en cok <n> insaat` | Kur düğmesi soluk + "bir inşaat bitsin" | **Aynı anda en çok {n} inşaat sürebilir; birinin bitmesini bekle.** |
| mevcut | `hucre zaten sahipli` / `hucre bos degil` | (yarış) | mevcut `hata-mulk.ts` metinleri |

---

# C. Veri ve komut istekleri (K2'ye; Ar-Ge lideri iletir)

| # | İstek | Neden | Kabul |
|---|---|---|---|
| **İ-1** | **Görünen ad** profil alanı ve ucu (G5'te yok; `KIMLIK.md` §6 "henüz yok") | G-4 ekranı; herkese görünür ad; e-posta önekinin sızmaması | Ad kural ve yasak listesi, değiştirme sınırı, KVKK silme ile uyumlu |
| **İ-2** | `OzelBolgeKaresi.dukkanlar` yuva başına **`mevcut`** bayrağı ve **kasa doluluğu** | D-5 ve D-8: stoksuz yuva çekime girmez; "satış durdu" nedeni anlatılamaz (`gercek` gösterilmez) | Bayrak, `yerelPazarHesapla` adım 1 ile aynı koşul |
| **İ-3** | `IlceKaresi.talep?` (ilçe talebi Q) ya da hazır "yatırım tahmini" alanı | D-3 yatırım tahmini bloğu (A3 §10.2: "G9'da istenirse K2 sonra ekler") | Q ve esnaf payı; yoksa blok gizli |
| **İ-4** | Kampanya penceresi komutu ve durumu (günde ≤6 sa, haftada ≤2 gün) | D-6; A3 Parça 1'de mekanizma yok (DUK-20) | `[A3-P2]`: komut adı, kalan hak alanı, `secim` türü, tutar yok |
| **İ-5** | `parsel_birak`/yıkım için dükkân politikası (A3 §7.9: bırakılamaz) | Bkz. §S1 | Baş lider kararı sonrası |

---

# D. Ölçütlerle eşleme

| Ölçüt | Ekran | Ölçüm |
|---|---|---|
| **Kılavuz S1.1** giriş ≤3 dk, kabul 6 dk | G-1…G-3 | Gözlem + günlük (`giris_onaylandi`) |
| **A0-6** (giriş → Yerleş → …) | G-1…G-5 | e2e (masaüstü ve telefon) |
| **A0-11** ilk dükkân medyan ≤36 sa; geri ödeme ≤48 sa | D-1…D-5, D-8 | Günlük (dükkân kurulum `t`, ilk gelir `t`) + insan testi ([kılavuz §6.2](insan-testi-kilavuzu.md)); **iki ayrı zaman** |
| **A0-12** perakende primi 1,05–1,20 (>1,30 alarm), ilk dükkân medyan ≤36 sa, fiyat savaşı <0,85 R süre ≤%5 | D-3, D-6, D-8 | Defter ve bot; kademe dağılımı |
| **A0-14** ilk saatte ilk satış ≥%70; kart atlama ≤%30 | D-1 (Defter kartı), D-4, D-8 | İnsan testi |
| **Y10** | G-2, D-4 | Gözlem (`BE-B`) |

**İnsan testi bağı.** Kılavuz S1'in "dükkânsız" sürümü yeterlidir; dükkân akışı **G2–G14** döneminde **yönlendirmesiz** (yalnız D-1 kartı) ölçülür. Test sürümü **G7 + G9 sonrası** donar (kılavuz Ö5).

---

# E. Geri dönüşü zor kararlar

| # | Karar | Seçenekler | Neden zor | Öneri |
|---|---|---|---|---|
| **ZG-1** | **Görünen ad** kuralı ve kaynağı (G-4) | (a) oyuncu seçer, kural §D-7 gibi; (b) sunucu üretimli opak ad; (c) e-posta öneki | Ad **herkese görünür**, kişisel veri olabilir ve günlükte kalır; e-posta önekinin bir kez yayımlanması geri alınamaz | **(a) ya da (b)**, **(c) asla**; yasak liste ve silme yolu K2'de |
| **ZG-2** | **Alfa-0 kayıt kapısı:** herkes e-postayla hesap açar mı, davet listesi mi? | Serbest · davet kodu · izin listesi | Hesap = oyuncu bire bir; oyuncu kimliği kalıcıdır; ≤200 davetli hedefi **ilçe doluluğu ve ayrılmış hücre** hesabını bozar. G5'te kayıt kapısı **yoktur** | **(doğrulanmadı)** karar baş lider ve sahip; G5 kapıdan geçmeden **davetsiz açılmaz** |
| **ZG-3** | **Marka adı** serbest metin ve uyarı metni (D-7) | A3 GZ-8 kararı: serbest ama kısıtlı; uyarı metni T1 | Komut günlüğü ekleme-yalnızdır, **silme zordur**; uyarı olmadan kişisel veri yazılabilir | Uyarı **zorunlu** ve ilk marka girişinde görünür; `marka_sifirla` (sistem yolu) hazır |
| **ZG-4** | **Fiyat kademelerinin sayısı ve sırası** (4, indeks 0 = kampanya) | A3 GZ-3: 4 kademe; ya da 3 kademe (kampanyasız) | Fiyatlar **indeksle** saklanır; araya kademe eklemek anlamı kaydırır. Adlar (kampanya, uygun, normal, yüksek) **kolay** değişir | 4 kademe sabit; adlar T1'in |
| **ZG-5** | **Dükkân bırakılamaz ve yıkılamaz** (A3 §7.9) | (a) bu hâliyle; (b) `insaat_iptal` benzeri **kısa pişmanlık penceresi** (ör. ilk 72 saat) ; (c) yıkım + iade | "Yanlış seçim kilitlemez" ve [yeniden yatırım merdiveni](baslangic-ve-ustalik.md) §3.3 ile çelişir; şemaya girerse sonradan eklemek **göç** ister | **(b)** en az: ilk saat ve inşa süresince geri al; karar baş lider |
| **ZG-6** | **Yuvarlama kuralı** (aşağı/yukarı) tek işlevde mi | Tek `paraMili` işlevi · yerel yardımcılar | Ekran görüntüleri ve oyuncu güveni; kod değişimi **kolay**, kuraldan sapma **güveni** zedeler | Tek işlev (ilk saat incelemesi B4); lint ile yerel biçimleyici yasak |
| **ZG-7** | **Kampanya penceresi** mekaniği | (a) Alfa-0'da yok (3 kademe); (b) pencere (günde ≤6 sa, haftada ≤2 gün) | Durum alanı ve komut şemaya girer; sonradan çıkarmak göç ister; A2: kampanya **hep net eksi** | **(a)** Alfa-0; (b) ancak A3 Parça 2 tasarımı ve baş lider onayı |

# F. Açık sorular

| # | Soru | Önerilen varsayılan |
|---|---|---|
| **S1** | Dükkân yanlış türde/yerde kurulduysa **geri dönüş** (ZG-5)? | İlk 72 saat tam iadeli geri al; aksi hâlde "kilit yok" ilkesi bozulur |
| **S2** | **Görünen ad** (İ-1) hangi sprintte? G9'un önkoşulu | G-4'ü ertele; geçici opak ad |
| **S3** | **Kampanya** kontrolü Alfa-0'da var mı? Hak sayaçları ekranda nasıl? | Alfa-0'da **yok** (3 kademe); A3 Parça 2 gelince eklenir |
| **S4** | Birim fiyat gösterimi: tam ₺ (aşağı) mı, 1 ondalık mı? Ör. R=70 ₺ × 0,95 = 66,5 ₺ | Tam ₺ aşağı (66 ₺); T1 karar verir |
| **S5** | Tarayıcıya bağlı bağlantı **varsayılan kapalı**; uygulama içi tarayıcı oyuna uygun mu? | Pilot (Android ve iOS) ile doğrulanır |
| **S6** | KVKK silme talebi (`hesapSil` ucu yok): Ayarlar'da "hesabımı sil" olmadan nasıl yürür? | Yönetici yolu; destek metni sahip işi |
| **S7** | **Davet/izin listesi** (ZG-2) | G5 kapıdan geçmeden davetsiz açılmaz |
| **S8** | Yatırım tahmini bloğu için `IlceKaresi.talep?` (İ-3): G9'a mı, sonraya mı? | Sonra; blok gizli kalır, sayı uydurulmaz |
| **S9** | A3 Parça 2: DUK/MRK kodları ve metinler **değişirse** bu belgedeki §D-9 tablosu nasıl güncellenir? | A3 teslim notuyla birlikte A1 tabloyu yeniler |
| **S10** | Defter `ilk_dukkan` tetiği **ilk satış** (A3 §7.8) ama A0-11 "ilk dükkân" **yapı** zamanını ister: hangisi bağlayıcı? | İkisi ayrı ölçülür; rapor ikisini ayrı satırda verir |

# G. Doğrulanmayanlar ve sınırlar

| Konu | Durum |
|---|---|
| A3 §6–§10 sayıları, DUK/MRK kodları, kampanya penceresi | **Taslak (Parça 2)**; `[A3-P2]` işaretli yerler değişebilir |
| Dükkân bedeli ve inşa süresi (6.000 ₺, 4 sa, 20/8) ve pencere kuralı | A3 §7.2 ve §7.4 taslağı, A2 ZA-9; baş lider onayı (GZ-15) bekler |
| G5 uçları | K2 dalı (`takim/k2/g5-eposta-giris`); `entegrasyon`'a girmemiş olabilir |
| Uygulama içi tarayıcı çerezi, posta uygulaması, yeniden gönder bekleme süresi (45 sn) | **Doğrulanmadı;** pilot |
| Görünen ad alanı, stok bayrağı (`mevcut`), ilçe talebi alanı | **Yok;** İ-1, İ-2, İ-3 |
| Dükkân panelinin ekran düzeni (Dükkânlarım bölümü, bina paneli) | Mevcut İşletmem ve bina paneli düzenine göre **öneri**; görsel tasarım T1'de |
| Hiçbir test koşulmadı; hiçbir sunucu başlatılmadı | Yalnız belge |
