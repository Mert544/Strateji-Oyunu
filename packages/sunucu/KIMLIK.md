# Kimlik doğrulama: e-posta bağlantısıyla giriş

Durum: **uygulandı** (Sprint A0-02, görev G5). Sahip kararı A-1 (docs/12 §14): Alfa-0'da **yalnız e-posta sihirli bağlantısı**; Google girişi yoktur. Bu not tasarımı ve uygulanan kararları anlatır; operasyon adımları README'dedir.

Kod: `src/giris/**` (hizmet, HTTP uçları, belirteçler, ws bileti, posta, kip denetimi), `src/depo/{bellek,dosya,hesap-postgres}.ts` (hesap deposu), `sql/004-hesap.sql`, `veri/gecici-eposta-alanlari.json`. Sözleşme: `@bolge/protokol` `src/giris.ts`. ws protokolü değişmedi (`PROTOKOL_SURUMU` aynı): ws tarafında yalnız `merhaba.token` alanı bir ws bileti taşır.

## 1. Kararlar (öneriden farklar)

| Konu | Karar |
| --- | --- |
| Giriş yöntemi | Yalnız e-posta bağlantısı. Google (OIDC) ve passkey yok. |
| Altyapı | **Better Auth ve üçüncü taraf bağımlılık yok.** Tek yöntem kaldığı için gerekçesiz bağımlılık reddedildi; her şey `node:crypto` ile sunucu paketinin içindedir, ayrı HTTP süreci yoktur, yazar döngüsünü bloklamaz (posta ve bağlantı işi yanıttan sonra arka planda). |
| İstek koruması | Turnstile (Cloudflare) yok; hız sınırı + geçici alan engeli yeterli sayıldı (Alfa-0). Sahibin kararına açık. |
| Bağlantı | Tek kullanımlık, 10 dk, HMAC imzalı, depoda yalnız SHA-256 özeti. `GET` yan etkisiz, `POST` oturum açar. Tarayıcıya bağlama (isteği yapan tarayıcıda açılma şartı) VARSAYILAN KAPALIDIR: oyuncu postayı telefonda başka bir tarayıcıda (uygulama içi tarayıcı) açınca kilitlenmesin; koruma tek kullanım, 10 dk süre ve hız sınırından gelir. `--tarayici-bagli 1` açar (bağlantı başka tarayıcıda `tarayici_uyumsuz` 403 verir ve tüketilmez). |
| Oturum | Çerez (`httpOnly`, `SameSite=Lax`, üretimde `Secure`). 30 gün kayan (günde en çok bir uzama), 90 gün mutlak. Token `localStorage`'a konmaz. |
| ws | Çerez ws'ye gitmez: çerezle yetkili `POST /giris/bilet` 60 sn ömürlü, tek kullanımlık, OTURUMA bağlı bilet verir; bilet `merhaba.token` olarak gider. |
| Kimlik kipi | `BOLGE_KIMLIK=gelistirme\|eposta`. Geliştirmede varsayılan `gelistirme` (bugünkü davranış). `--uretim`'de varsayılan `eposta`; `gelistirme` reddedilir. |
| Kapanış kodu | `KAPANIS.kimlik` = 4003 (önceki notta yazan 4401 yanlıştı; protokolde 4003'tür). |

## 2. HTTP uçları (`/giris/`, sunucunun mevcut HTTP portunda)

Tüm yanıtlar `cache-control: no-store`. Hata gövdesi: `{ tamam: false, kod, mesaj, beklemeSn? }` (`GirisHatasiSemasi`). **Durum değiştiren her POST `Origin` başlığı ister ve izin listesinde olmalıdır (CSRF); Origin'siz ya da yabancı kökenli istek 403 `origin`.** JSON uçları `Content-Type: application/json` ister. İstemci `fetch(..., { credentials: "include" })` kullanır ve sunucuyla aynı sitede (SameSite=Lax) olmalıdır.

| Uç | İstek | Yanıt | Hata kodları (HTTP) |
| --- | --- | --- | --- |
| `POST /giris/istek` | `{ eposta }` | **202** `{ tamam: true, gecerlilikSn }`; `Set-Cookie: bolge_giris` (yalnız tarayıcı bağı açıksa). Hesabın varlığı, e-posta başına sınır ve posta sonucu yanıtı DEĞİŞTİRMEZ; posta yanıttan sonra gider. | `gecersiz_istek` (400), `gecersiz_eposta` (422), `gecici_eposta` (422), `hiz_siniri` (429, IP ya da genel; `Retry-After`), `origin` (403) |
| `GET /giris/onay?j=<jeton>` | — | Onay sayfası (HTML, `no-referrer`, CSP; giriş ekranıyla aynı görünümde satır içi `<style>`, `style-src` yalnız onun SHA-256 özetine izin verir, betik yok). YAN ETKİSİZ: jeton tüketilmez, çerez verilmez; önizleme botları bağlantıyı tüketemez. Jeton biçimce geçersizse 400 sayfa. | — |
| `POST /giris/onay` | `{ j }` (JSON) ya da `j=...` (onay sayfasının formu, form-urlencoded) | **200** `{ tamam: true, yeniHesap, oyuncu, ad?, adSecildi? }` + `Set-Cookie: bolge_oturum`. Form gönderiminde HTML sayfa ya da `--giris-sonrasi` adresine 303. | `baglanti_gecersiz` (400: kullanılmış, süresi dolmuş, bozuk, yeni bağlantıyla düşmüş), `tarayici_uyumsuz` (403; yalnız tarayıcı bağı açıksa; bağlantı tüketilmez), `gecici_eposta` (422), `hiz_siniri` (429), `origin` (403) |
| `POST /giris/bilet` | (gövdesiz; çerez) | **200** `{ tamam: true, bilet, bitis, oyuncu }` (`bitis` epoch ms) | `oturum_yok` (401), `hiz_siniri` (429), `origin` (403) |
| `GET /giris/ben` | (çerez) | **200** `{ tamam: true, eposta, oyuncu, oturumBitis, oturumMutlakBitis, ad?, adSecildi? }` | `oturum_yok` (401) |
| `POST /giris/ad` | `{ ad }` (JSON; çerez + izinli Origin) | **200** `{ tamam: true, ad, adSecildi: true }` (`ad` KANONİK, küçük harfli). Özellik kapalıysa (adKurali yok) uç 404'tür. | `ad_gecersiz` (422; `mesaj` nedeni söyler: "ad ..."), `ad_yasakli` (422; genel ileti), `ad_sinir` (429; günde en çok bir değişiklik, `beklemeSn` gece yarısına kalan süre), `hiz_siniri` (429), `oturum_yok` (401), `origin` (403), `gecersiz_istek` (400) |
| `GET /giris/ad-oner` | (çerez) | **200** `{ tamam: true, ad }`: o an üretilmiş YENİ opak öneri (küçük harfli "sıfat isim rakam"; kuraldan ve süzgeçten geçmiş, başka hesapta olmayan). KAYDETMEZ; oyuncu beğenirse `POST /giris/ad` ile seçer. Oturum başına dakikada 10. | `oturum_yok` (401), `hiz_siniri` (429; `beklemeSn`), `bulunamadi` (404: özellik kapalı), `yontem` (405) |
| `POST /giris/hesap-sil` | (gövdesiz; çerez + izinli Origin) | **202** `{ tamam: true, gecerlilikSn }`: hesabın e-postasına bir ONAY bağlantısı gider; **hiçbir şey silinmez**. Hesap başına saatte 3 istek. | `oturum_yok` (401), `hiz_siniri` (429), `origin` (403) |
| `GET /giris/hesap-sil-onay?j=` | — | Onay sayfası (HTML; kalıcılık uyarısı + düğme). YAN ETKİSİZ (önizleme botu silemez). Geçersiz/süresi dolmuş jeton: 400 sayfa. | — |
| `POST /giris/hesap-sil-onay` | `{ j }` (JSON) ya da sayfanın formu | **200** `{ tamam: true }` (form: sayfa); hesap SİLİNİR, çerez temizlenir. | `baglanti_gecersiz` (400), `hiz_siniri` (429; IP başına), `origin` (403) |
| `POST /giris/cikis` | (çerez) | **200** `{ tamam: true }`, çerez silinir; oturum ve açık ws bağlantıları kapanır; idempotent | `origin` (403) |
| `POST /giris/cikis-tumu` | (çerez) | **200** `{ tamam: true }`; hesabın bütün oturumları ve ws bağlantıları kapanır | `oturum_yok` (401), `origin` (403) |

Çerezler: `bolge_giris` (isteği yapan tarayıcı, ömrü bağlantı ömrü) ve `bolge_oturum` (kayan süre); ikisi de `Path=/giris; HttpOnly; SameSite=Lax` (+ üretimde `Secure`). Kayan süre uzayınca `bolge_oturum` yeni ömürle yeniden verilir. Hesap silme HTTP ucu YOKTUR (§9).

## 3. Akış

1. `POST /giris/istek`: biçim, geçici alan (alana bağlı), IP ve genel sınır eşzamanlı denetlenir; yanıt 202 döner. Arka planda (adres başına sıralı): bağlantı üretilir, özeti kaydedilir (aynı adresin eski bağlantıları düşer), posta gönderilir (zaman aşımı 15 sn; hata yutulur, yalnız sayaç ve maskelenmiş günlük).
2. Postadaki bağlantı `<baglanti-tabani>?j=<jeton>`: varsayılan taban sunucunun `/giris/onay` sayfası; istemci kendi sayfasına çevirebilir (`--giris-baglanti`), o sayfa `POST /giris/onay {j}` yapar.
3. `POST /giris/onay`: jeton imza/süre ile (veritabanına gitmeden) elenir, depoda TEK İŞLEMDE tüketilir, hesap bulunur ya da açılır (hesap + oyuncu eşlemesi), oturum açılır.
4. `POST /giris/bilet` → ws `merhaba {token: bilet}` → `AuthKimligi.dogrula` → `hosgeldin`. Ardından `katil` (mülk kipi) ve komutlar; oyuncu kimliği her zaman bilet içeriğinden gelir.

## 4. Belirteçler ve gizlilik

- Bağlantı jetonu `bag1.<32 bayt rastgele>.<bitis>.<imza>`, oturum `ot1.<12 bayt kimlik>.<32 bayt gizli>`, bilet `bil1.<yük>.<imza>`. Rastgelelik `randomBytes`; imza HMAC-SHA256, sırdan amaç başına alt anahtar (bağlantı imzası biletle geçmez).
- Depoda yalnız SHA-256 özetleri (bağlantı özeti, oturum gizlisinin özeti, tarayıcı çerezinin özeti); açık belirteç hiçbir depoda ve günlükte yoktur. Karşılaştırmalar `timingSafeEqual`.
- Sırlar: `BOLGE_BILET_SIRRI` (yeni) ve rotasyonda `BOLGE_BILET_SIRRI_ESKI` (yalnız doğrular). Üretimde ≥ 32 karakter, örnek/varsayılan değil.
- Günlük ve metrik: yalnız olay adı, sayaçlar ve maskelenmiş adres (`a***@alan`); belirteç, tam adres, IP yazılmaz (testle gösterilir). IP yalnız bellekteki hız sınırı kovalarındadır, depoya yazılmaz.

## 5. Oturum, bilet, iptal

- Oturum: açılışta `bitis = şimdi + 30 gün`, `mutlakBitis = şimdi + 90 gün`; son uzamadan ≥ 1 gün sonra bir kullanımda `bitis = min(şimdi + 30 gün, mutlakBitis)`. Süresi geçen oturum kullanımda silinir; bakım saatte bir toplu siler.
- Bilet: 60 sn, `jti` tek kullanım (bellek kümesi), oturum kimliğini taşır. Çıkış, tümünü kapat ya da hesap silme oturumları bellek içi iptal kümesine yazar; `dogrula` bu kümeye bakar (çıkıştan önce alınmış bilet çıkıştan sonra reddedilir) ve o oturumun açık ws bağlantıları `KAPANIS.kimlik` ile kapatılır. Bilet için veritabanına gidilmez.
- `sistem`/yönetici kimliği bilet olarak ÜRETİLEMEZ ve imzalı olsa bile reddedilir; `AuthKimligi` yalnız `yonetici: false` döndürür.
- `Origin` izin listesi hem `/giris/` POST uçlarında hem ws el sıkışmasında: tarayıcıdan gelen yabancı köken reddedilir (ws'de Origin'siz tarayıcı dışı istemci geçer; oturum zaten Origin'li POST ile alınan tek kullanımlık biletle açılır).

## 6. Hesap ve oyuncu

- **Hesap** = e-posta + oturumlar; **oyuncu** = çekirdekteki `OyuncuId`. Eşleme `hesap_oyuncu(hesap_id PK, oyuncu_id UNIQUE)`: hesap başına bir oyuncu, oyuncu başına bir hesap (veritabanı kısıtı).
- `oyuncuId` sunucu üretimli ve opak (`o_` + 8 karakter, 40 bit rastgelelik); e-postadan ya da hesap kimliğinden türetilmez. Görünen ad hesapla birlikte saklanır (§6a); çekirdek durumuna ve günlüğe GİRMEZ.
- Adres normalleştirme: küçük harf, `+takma` her alanda atılır, Gmail/Googlemail'de noktalar da atılır ve alan `gmail.com` olur. Benzersizlik bu anahtarladır; posta, kullanıcının yazdığı (küçük harfli) adrese gider. Gmail dışında nokta anlamlıdır.
- Geçici alan engeli: liste VERİ dosyasıdır (`veri/gecici-eposta-alanlari.json`, `--gecici-alanlar` ile değiştirilir); alt alanlar kapsanır. Engel alana bağlıdır ve hesabın varlığından bağımsızdır (sızdırmaz); hesap açılırken de yeniden denetlenir. Liste elle derlenmiş KISA bir başlangıç listesidir, üçüncü taraf listeden kopya değildir; kapsamlı ve güncel liste için kaynak ve lisans seçimi sahibe aittir.
- Her hesap e-postayı doğrulayarak açıldığı için "doğrulanmamış hesap" durumu yoktur.
- **Hesap silme (KVKK), e-posta onayıyla:** oturum açıkken `POST /giris/hesap-sil` → hesabın e-postasına onay bağlantısı (G5 bağlantı altyapısı: imzalı, süreli (30 dk), `Secure` sayfa; AMAÇ `hesap-sil` alt anahtarıyla imzalıdır: giriş bağlantısı silme ucunda, silme bağlantısı giriş ucunda geçmez) → bağlantıyı açmak YAN ETKİSİZ sayfayı gösterir → sayfadaki düğme `POST /giris/hesap-sil-onay {j}` ile `GirisHizmeti.hesapSil`'i çağırır. Onaysız istek hiçbir şeyi silmez. Silme: hesap, e-posta bağı, bekleyen bağlantılar, BÜTÜN oturumlar ve biletler (ve açık ws bağlantıları, kapanış kodu 4003) ve görünen ad silinir; **oyuncu günlükte ANONİM kalır** (opak `oyuncuId` geri çözülemez), **mülk devredilmez**, dünya durumu ve `durumOzeti` değişmez, silme günlüğe komut yazmaz. Bağlantı durumsuzdur: yeni bir silme isteği öncekini DÜŞÜRMEZ (30 dk içinde gönderilen bütün bağlantılar geçerlidir; hangisi önce onaylanırsa siler) ve tek kullanımlıktır çünkü hesap kimliğine bağlıdır: kullanılınca (ya da aynı adresle yeniden kayıttan sonra) hesap bulunmaz ve eski jeton başkasını silemez. Aynı adresle yeniden kayıt serbesttir ve YENİ hesap + YENİ opak oyuncu kimliği + yeni otomatik ad verir; eski oyuncu ve eski mülk dünyada eskisinin kalır (§9). Silinen hesabın adı sunucu önbelleğinden düşer; birikimli kare nedeniyle diğer istemcilerin ad önbelleğinde YALNIZ AÇIK OTURUMLARIN belleğinde, yeniden bağlanınca gider. (Oyun bağlantısı oturum kaydı, `oyun_oturum`, opak oyuncu kimliğiyle kalır: kişiye geri bağlanamaz.)

### 5a. Alfa-0 önerisi: onay ekranı istemci sayfasında (G-3)

Postadaki bağlantı varsayılan olarak sunucunun `GET /giris/onay` sayfasına gider (yan etkisiz, yedek olarak KALIR). Alfa-0'da onay ekranının istemcide olması isteniyorsa: `BOLGE_GIRIS_BAGLANTISI=<istemci sayfası>` (örn. `https://oyun.ornek.org/`); postadaki bağlantı `<istemci sayfası>?j=<jeton>` olur, istemci sayfası `j` parametresini okur ve `POST /giris/onay {j}` çağırır (bu uç zaten vardır; Origin izin listesinde istemci kökeni bulunmalıdır). Varsayılan bağlantı tabanı DEĞİŞMEDİ. (Kod lideri notu "`/?giris=<jeton>`": parametre adı bugün `j`dir; `giris` adı istenirse bağlantı parametre adı için bir seçenek eklenir.)

### 6a. Görünen ad (İ-1)

- **Hesap başına bir ad.** Hesap açılırken sunucu OPAK, küçük harfli bir ad üretir: sıfat + isim + 3 basamaklı rakam (örn. "çalışkan değirmenci 427"; kelimeler `veri/gorunen-ad-kelimeleri.json`, elle seçilmiş, 26 sıfat x 24 isim x 900 rakam ≈ 560 bin birleşim). Ad e-postadan ya da oyuncu kimliğinden TÜRETİLMEZ (kişisel veri sızmaz). Otomatik üretimde aynı ad başka hesapta varsa yeniden denenir; oyuncunun SEÇTİĞİ adlarda çakışma serbesttir (ad bir kimlik değildir; yalnız arama dizini vardır, UNIQUE yok). Eski (adsız) hesaplara açılışta (`adlariYukle`) ve girişte otomatik ad yazılır.
- **Seçme/değiştirme:** `POST /giris/ad {ad}` (çerez + Origin/CSRF, G5'teki gibi). Kural çekirdek `adKanonik`'ten (marka adıyla AYNI; sabit Türkçe tablo; sunucuda ayrı tablo yok): 2-24 karakter, `^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$`, baş/son/art arda boşluk reddedilir, en az bir harf, DÜZELTME YAPILMAZ; sonra yasaklı ad süzgeci (`ad-suzgec.ts`, §7.7 4a katlama; kelime eşitliği ve alt dizgi). Önce doğrulanır, SONRA küçük harfe çevrilir (kanonik ad saklanır ve süzgeç kanonik ad üzerinde koşar); ret iletileri çekirdekten "ad ..." diliyle döner. Akıllı tırnak (’) çevirisi istemcidedir; sunucu yalnız izinli karakteri kabul eder.
- **Değişiklik sınırı:** günde (00:00 TRT, `turkiyeGeceYarisi`; kampanya ve S-18 ile aynı gün sınırı) en çok BİR değişiklik. Otomatik addan oyuncunun İLK seçtiği ada geçiş sayılmaz (ilk seçimden sonra aynı gün bir değişiklik serbesttir, ikincisi 429 `ad_sinir`); aynı adı yeniden seçmek değişiklik sayılmaz. Olay kayıtlarında oyuncu kimliği sabittir; ekranda o anki ad görünür. Hesap başına ad denemesi ayrıca hız sınırlıdır (10 ani, dakikada 1).
- **Yasaklı ad listesi:** `packages/veri/icerik/yasakli-adlar.json` (T3; yol `--yasakli-adlar`/`BOLGE_YASAKLI_ADLAR`). Yalnız sunucuda okunur (istemci/çekirdek/protokol kaynağında geçmez, testle). Dosya yok/bozuksa `--uretim`'de açılış DURUR; geliştirmede uyarı verilir ve boş listeyle devam edilir.
- **Öneri:** `GET /giris/ad-oner` (oturumlu, oturum başına dakikada 10) yeni bir opak ad döner ve KAYDETMEZ (G-6).
- **Başkalarına gösterim:** kare üzerinden: `IlgiKaresi.adlar?: Record<oyuncuId, ad>` (isteğe bağlı nesne alanı; demete öğe eklenmez): karede görünen sahiplerin (bölge sahibi, ilgi alanındaki ilçelerin hücre sahipleri, isteyenin kendisi) adları; adı olmayanın girdisi yoktur; `KareDeltasi.adlar?` yalnız yeni/değişen girdileri taşır (istemci birikimli önbellek tutar). Adlar çekirdek durumuna girmez; sunucuda hesap önbelleğinden (`GirisHizmeti.adCoz` → `sunucuBaslat({ adCozucu })`) eklenir, `durumOzeti` değişmez.

## 7. Hesap koruma ve kötüye kullanım

Uygulananlar:
- **İstek hız sınırı** (token kovası, parametre): e-posta başına 3/saat (aşımda yanıt AYNI, posta gitmez), IP başına 20/saat (aşımda 429), genel 1000/saat (429); onay denemesi IP başına 20 deneme, saatte 60 dolar (kaba kuvvet; aşımda 429); bilet oturum başına 30 ani + 0,5/sn.
- **Kullanıcı sızdırmama:** `POST /giris/istek` her geçerli adres için aynı durum, gövde ve başlık adlarını döndürür; hesap araması ve posta yanıttan sonra yapılır (asılı kalan posta bile yanıtı geciktirmez).
- Geçici alan engeli, tarayıcı bağı, tek kullanımlık ve süreli bağlantı, CSRF (Origin), iptal.

Ödül ve kalkan kötüye kullanımı (çekirdek ve yönetim işi; G5'te uygulanmadı, ilkeler değişmedi):
- Asıl savunma hesap düzeyindedir: bir adres = bir hesap = bir oyuncu, geçici alan engeli. Ayrılmış hücre yalnız katılımın ilk 14 gününde ve yurt ilçesinde satılır, ilçe başına günlük satış tavanı vardır (çekirdek). Kalkan çekirdektedir (ilk günlerde tavanlı ticaret/transfer); hibe tek sefer, yalnız doğrulanmış (bağlantıyla giriş yapmış) hesaba verilir.
- Yaptırım ölçeği: (1) sistem ödüllerinin dondurulması, (2) yeni hesap açılışının sınırlanması, (3) hesabın askıya alınması (girişi kapatır). **Hiçbir zaman parsel el koyma ya da mülk silme yoktur:** parsel zorla el değiştirmez; mevcut mülk sahibinde kalır. Her yaptırım insan incelemesine ve itiraz yoluna bağlıdır (örn. 14 gün).
- Cihaz/IP kümeleme sinyalleri (aynı ağdan çok hesap) KVKK ölçülülüğü gereği şimdilik YOKTUR (IP tutulmaz); gerekirse ayrı karar.

### Kayıt kapısı: davetli listesi (Alfa-0)

`--davetli-liste <dosya>` (`BOLGE_DAVETLI_LISTE`; varsayılan KAPALI; yalnız `--kimlik eposta`): satır başına bir adres (`#` açıklama), G5 normalleştirmesiyle (`+takma`, Gmail noktaları, büyük/küçük harf) aynı anahtara eşlenir. Listede olmayan adrese `POST /giris/istek` yanıtı davetliyle BİREBİR aynıdır (202, aynı gövde ve çerezler); yalnız bağlantı kaydı ve posta oluşmaz ve adres başına sınır kovası açılmaz: kimin davetli olduğu dışarıdan anlaşılmaz. Bağlantı verildikten sonra listeden çıkarılan adresin onayı `baglanti_gecersiz` döner (bağlantı tüketilir, hesap açılmaz). Zaten açık oturum ve ws bağlantıları listeden çıkarmayla kapanmaz (kapı yalnız YENİ girişi sınırlar; hesap kapatma ayrı iştir). Dosya yok ya da bozuksa açılış durur (kapı sessizce açık kalmaz); liste çalışırken YENİDEN YÜKLENMEZ (baş lider kararı): değiştirmek için sunucuyu yeniden başlatmak yeter. Sayaçlar: `bolge_giris_olay_toplam{olay="istek.davet_disi"|"onay.davet_disi"}`. Metrikte ve günlükte davetsiz adres yoktur. Kapı varsayılan kapalı olduğundan ve gelistirme kimliğinde bulunmadığından mevcut akışlar değişmez.

## 8. KVKK: hangi veri, ne kadar süre

| Veri | Amaç | Süre |
| --- | --- | --- |
| E-posta (hesap kaydı) | Hesap ve giriş | Hesap açıkken; hesap silme (e-posta onayı, §6) onaylanınca HEMEN silinir (`hesapSil`) |
| Giriş bağlantısı kaydı (özet + e-posta + bitiş) | Tek seferlik giriş | En çok 10 dk; kullanılınca, yeni bağlantı gelince ya da süre dolunca silinir |
| Oturum kaydı (kimlik, gizli özeti, açılış/son kullanım/bitiş zamanı) | Giriş oturumu | Kayan 30 gün, mutlak 90 gün; çıkışta silinir; bakım süresi geçenleri saatte bir siler |
| Oyun bağlantısı oturum kaydı (`BOLGE_OTURUM_KAYDI=1`; varsayılan KAPALI; opak oyuncu kimliği, açılış ve kapanış zamanı) | İnsan testi ölçümü: oturum sayısı ve süresi | Ayrıntı 90 gün; sonrası yalnız günlük toplu sayı (oturum, farklı oyuncu, toplam süre; kişi başına iz yok). IP, cihaz, tarayıcı, e-posta YOK; `profil_capa`'ya yazılmaz; test dünyası silinince gider (`--test-dunya-sil`) |
| Davetli listesi (`--davetli-liste`; Alfa-0 kayıt kapısı; yalnız e-posta adresleri) | Davetsizin girişini engellemek (en çok 200 davetli) | Sunucuda dosya olarak tutulur, DEPOYA, günlüğe, metriğe girmez; Alfa-0 bitince dosya silinir |
| Görünen ad (hesapla birlikte; otomatik opak ad ya da oyuncunun seçtiği 2-24 karakterlik kısıtlı ad) | Oyuncuların birbirini ekranda tanıması | Hesap açıkken; hesap silinince gider (aynı satır). Başkalarına KARE üzerinden gösterilir; çekirdek durumuna/günlüğe girmez. Arayüz uyarısı: "adın oyundaki herkese görünür" (T1) |
| Hız sınırı kovaları | Kötüye kullanım | Yalnız bellek (IP burada), yeniden başlatmada ve boşalınca düşer; depoya yazılmaz |
| Günlük ve metrik | İşletim | Yalnız olay adı, sayaç, maskelenmiş adres; belirteç ve IP yok |
| Oyun verisi (`oyuncuId`, komut günlüğü, dünya) | Sözleşmenin ifası | Dünya boyunca; `oyuncuId` opaktır |

Oyun oturum kaydı giriş (kimlik) oturumu değildir: o çerezle açılan hesap oturumudur (`oturum` tablosu), bu oyuncunun ws bağlantısı süresidir (`oyun_oturum`). Test dünyası silme (`--test-dunya-sil <ad>`) dünyanın günlüğünü, görüntülerini ve yedeklerini, profil/oturum kayıtlarını ve YALNIZ o dünyanın oyuncularının hesap, oturum ve bağlantı satırlarını tek işlemde siler; başka dünyada da kullanılan hesaba dokunmaz.

E-posta ve oyuncunun görünen adı dışında kişisel veri tutulmaz: IP, cihaz/tarayıcı bilgisi, konum yoktur; görünen ad kısa ve kısıtlı karakterlidir, oyuncu kendi seçer ve gösterim öncesi arayüzde uyarılır. Aydınlatma metni, açık rıza gerektirmeyen işleme ve yurt dışına aktarım (posta sağlayıcısı bölgesi, AB önerilir) hukuk metinleri sahip işidir. Hesap silinince e-posta bağı gider, oyuncu anonim kalır (komut günlüğü dünya durumunun parçasıdır; `oyuncuId` geri çözülemez).

## 9. Uygulanmayanlar ve açık sorular (sahip/baş lider)

1. **Tarayıcıya bağlı bağlantı (karar verildi: varsayılan kapalı).** Açıkken postayı telefonda başka bir tarayıcıda açan kullanıcı `tarayici_uyumsuz` alırdı; bu yüzden kapalıdır. Kalan riskler (bağlantıyı postadan çalan biri) tek kullanım, 10 dk ve hız sınırıyla sınırlıdır. İstenirse `--tarayici-bagli 1`.
2. **Silinen hesabın yeniden kaydı (karar verildi: serbest).** Silinen hesabın e-postası aynı adresle yeniden kayıt olabilir; sonuç YENİ hesap ve YENİ, farklı opak oyuncu kimliğidir. Eski oyuncu kimliği dünyada (günlükte) kalır ve eski mülk eski kimliğin kalır; yeni oyuncu eski mülke sahip değildir (testle gösterilir). Silme yine yalnız yönetim işidir (HTTP ucu yok).
3. **Posta sağlayıcısı.** SMTP/SES bağdaştırıcısı (hesap, alan doğrulaması, SES bölgesi) sahip işidir; `PostaGonderici` arayüzü hazırdır. Üretimde `dosya` kabul, `konsol` reddedilir; gerçek gönderimi o bağdaştırıcı yapana kadar üretim girişi çalışmaz.
4. **Geçici alan listesi kaynağı/lisansı** ve güncelleme sıklığı. Alan listede olan bir adresle girmiş hesap bir sonraki girişte 422 alır (liste güncellemesi hesap kilitleyebilir).
5. Yapılmayanlar (KIMLIK önerisinde vardı): şüpheli giriş bildirimi e-postası, oturum listesi ekranı (cihaz/ülke; veri tutulmadığı için), hesap başına 5 eşzamanlı ws sınırı, açık ws'nin 15 dk'da bir oturum yeniden doğrulaması (iptal yalnız bellek içi kümeden ve çıkış/silme olaylarından yürür), yönetici kanalı (`BOLGE_YONETICI_SIRRI`), Turnstile.
6. Bölge kipi dünyalarında `katil` mesajı yoktur; e-posta kimliğiyle yalnız mülk kipi oynanır (yönetici yolu e-posta kipinde yoktur).

## 10. Testlerle oyun-dışı işler için bırakılan paylar

- **Test hesabı silme (İ3):** hesap tabloları (`hesap`, `hesap_oyuncu`, `oturum`, `giris_baglanti`) dünyadan bağımsızdır; `hesap.id` serbest metindir ve `hesap_oyuncu`/`oturum` `ON DELETE CASCADE` ile `hesap`'a bağlıdır. Test hesapları bir id önekiyle açılırsa `DELETE FROM hesap WHERE id LIKE '<onek>%'` + `DELETE FROM giris_baglanti WHERE eposta_anahtar LIKE '<onek>%'` tek işlemde, artık bırakmadan siler (pg testi bunu gösterir). Dosya deposunda aynı iş `hesapSil` döngüsüdür.
- **Oyun bağlantısı oturum olayı kaydı (İ2):** giriş (kimlik) oturumundan AYRI bir kavramdır (biri çerezle açılan hesap oturumu, öteki ws bağlantısı oturumu); adları karışmasın. `sql/005`'e yer bırakıldı (numara ayrıldı, dosya yok); G5 bu kayda yazmaz ve `profil_capa`'ya dokunmaz.
