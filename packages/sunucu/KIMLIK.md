# Gerçek kimlik doğrulama: tasarım notu (kod yok)

Durum: **öneri, sahip toplantısından sonra karara bağlanır.** Kapsam: e-posta sihirli bağlantı + Google girişi (docs/11 §10: Better Auth), oturum, ws el sıkışması, hesap koruma, KVKK. Dış servis kurulumu bu notta yoktur.

Bugün: `GelistirmeKimligi` (`gel1.<oyuncu>.<hmac>`), `KimlikDogrulayici.dogrula(token) -> {oyuncu, yonetici} | null` arayüzü (`src/kimlik.ts`) ve `merhaba.token` alanı (en çok 4096 karakter) hazırdır. Aşağıdaki her şey bu arayüze ve protokole **ekleme** olarak girer; `PROTOKOL_SURUMU` değişmez.

## 1. Giriş yöntemleri

| Seçenek | Artı | Eksi |
| --- | --- | --- |
| **E-posta sihirli bağlantı** (SES) | Parola yok, sızıntı yüzeyi yok; e-posta zaten doğrulanır | Teslim edilebilirlik (spam, gecikme), önizleme botları bağlantıyı tüketebilir |
| **Google (OIDC)** | Hızlı, güçlü hesap; `sub` kalıcı kimlik | Google'a bağımlılık, yurt dışı aktarım |
| Passkey | Parolasız, oltalamaya dayanıklı | Alfa için erken (docs/11: sonra) |

**Öneri:** ikisi birden (Better Auth, ayrı HTTP süreci, aynı Postgres'te `auth` şeması). Sihirli bağlantı: tek kullanımlık, 10 dakika, istenen tarayıcıya bağlı; bağlantı `GET` ile yalnız onay sayfasını açar, `POST` oturumu başlatır (önizleme botları tüketemez). İstek formunda Cloudflare Turnstile. Google'da kimliğin kendisi `sub`'dır (e-posta değişebilir); aynı **doğrulanmış** e-posta iki yöntemi tek hesapta birleştirir.

## 2. Oturum, süre, yenileme, iptal

- **Web oturumu:** `httpOnly; Secure; SameSite=Lax` çerez (Better Auth oturumu), 30 gün **kayan** süre (kullanımda günde en çok bir kez uzar), 90 gün mutlak üst sınır. Token `localStorage`'da tutulmaz (XSS'te çalınmasın).
- **ws için çerez mi, token mı?** Çerezle el sıkışma (Cookie başlığı) çapraz-site ws kaçırma (CSWSH) ve alan adı kısıtı getirir. **Öneri:** kısa ömürlü **ws bileti**: istemci HTTPS ucundan (çerezle yetkili) bilet alır; bilet 60 sn ömürlü, tek kullanımlık (`jti`), HMAC imzalı `{hesap, oyuncu, oturum, exp}`; `merhaba.token` olarak gider. Sunucu bilet için veritabanına gitmez (tek yazar sürecinin gecikmesi korunur); yalnız `jti` kısa süreli bellek kümesinde tutulur. Buna ek `Origin` izin listesi.
- **Yenileme:** açık ws bağlantısı bilet süresinden bağımsız sürer; istemci koparsa yeni bilet alır (çerez geçerliyse sessizce).
- **İptal:** (a) kullanıcı "tüm oturumları kapat" ya da tek oturumu siler, (b) e-posta/Google bağı değişince tüm oturumlar düşer, (c) yönetici askıya alır. Auth süreci sunucuya `oturumIptal(hesap)` iter (yazar sürecine küçük bir iç uç); sunucu o hesabın bağlantılarını kod 4401 ile kapatır. İtme kaçarsa üst sınır: bağlantı en geç 15 dakikada bir oturum geçerliliğini sorgular (kısa önbellek).
- Bağlantı sınırı: hesap başına en çok 5 eşzamanlı ws (çoklu sekme), aşan en eski bağlantıyı düşürür.

## 3. `GELISTIRME_SIRRI`'nın üretimde kapatılması

Bugün `--uretim` yalnız sırrın açıkça ve ≥16 karakter verilmesini ister. Gerçek kimlikle:
1. Yeni `BOLGE_KIMLIK=gelistirme|auth`. `--uretim` ile `gelistirme` **reddedilir**; `GelistirmeKimligi` hiç kurulmaz, `--token` komutu da üretimde kapalıdır. Sızmış sır üretimde etkisiz kalır (kod yolu yok).
2. `sistem` (yönetici) kimliği oyuncu bileti olarak **üretilemez**. Yönetici işleri (`oyuncu_katil`, `zamanIlerlet`, ödül) ayrı yönetim kanalından gelir: yönetim portu yalnız localhost/VPN, ayrı sır (`BOLGE_YONETICI_SIRRI`), denetim günlüğü. Bu, yönetici paneli işiyle birlikte tasarlanır.
3. Bilet imza sırrı (`BOLGE_BILET_SIRRI`) auth ile sunucu arasında paylaşılır; dönüşümlü iki sır (eski/yeni) kabul edilir, rotasyon kesintisizdir.

## 4. Hesap koruma

- **Hız sınırı (auth ucu):** sihirli bağlantı isteği e-posta başına 3/saat, IP başına 20/saat, genel kuyruk tavanı; başarısız doğrulamada artan bekleme. Ws tarafında mevcut komut hız sınırı (hesap başına) sürer.
- **Şüpheli giriş:** yeni cihaz/ülke girişinde e-posta bildirimi ("bu sen miydin?", tek tıkla tüm oturumları kapat); engelleme yok, yalnız bildirim (yanlış pozitif oyuncuyu kilitlemesin).
- **Oturum listesi:** hesap ekranında cihaz (kısaltılmış User-Agent), son kullanım, ülke düzeyinde konum; tek tek ya da toplu kapatma.

## 5. Hesap doğrulaması ve çok hesap

Çekirdek iki kural ekleyecek (ayrılmış hücre yalnız katılımın ilk 14 gününde ve yurt ilçesinde satılır; ilçe başına günlük satış tavanı). Asıl savunma hesap düzeyindedir:
- **E-posta ya da Google hesabı başına bir oyuncu.** Kural veritabanında: `hesap_oyuncu(hesap_id PK, oyuncu_id UNIQUE)`. Gmail adresleri normalleştirilir (nokta ve `+takma` atılır), Google girişinde `sub` esastır.
- **Tek kullanımlık/geçici e-posta alanları:** bilinen geçici alan listesini (açık kaynak, haftalık güncellenir) kayıtta reddet; Google girişi serbest (Google hesabı maliyetlidir). Teslim edilemeyen adres (SES bounce) hesabı doğrulanmamış bırakır; doğrulanmamış hesap `katil` komutu veremez.
- **Cihaz/IP sinyalleri (KVKK'ya uygun, sınırlı):** tarayıcı parmak izi **yok** (ölçülülük). Yalnız risk puanı için: aynı /24 (IPv6: /48) ağdan 24 saatte açılan hesap sayısı ve aynı `istemciKimligi`'nden (`merhaba`'da zaten var) girilen hesap sayısı. Ham IP en çok 30 gün, sonra kısaltılıp özetlenir; aydınlatma metninde belirtilir. Sinyal yalnız **karar desteğidir**, otomatik kalıcı ceza vermez.
- **Yeni hesap kalkanı ve hibe kötüye kullanımı:** kalkan çekirdekte (ilk günlerde tavanlı ticaret/transfer). Hesap düzeyinde: hibe yalnız doğrulanmış hesaba, tek sefer; yeni hesap kümeleri (aynı ağ + aynı zaman penceresi) incelemeye düşer.
- **Yaptırım ölçeği:** (1) ödüllerin (hibe sonrası sistem ödülleri) dondurulması, (2) yeni hesap açılışının sınırlanması, (3) hesabın askıya alınması (girişi kapatır). **Hiçbir zaman parsel el koyma ya da mülk silme:** parsel zorla el değiştirmez; mevcut mülk sahibinde kalır. Her yaptırım insan incelemesine ve itiraz yoluna bağlıdır (örn. 14 gün).

## 6. KVKK: hangi veri, ne kadar süre

| Veri | Amaç | Süre |
| --- | --- | --- |
| E-posta, Google `sub` | Hesap ve giriş | Hesap açıkken; silme talebinde 30 gün içinde silinir |
| Oturum kaydı (IP, kısaltılmış UA, zaman) | Oturum listesi, güvenlik | IP ham 30 gün, oturum kaydı oturum süresi + 30 gün |
| Sihirli bağlantı jetonu | Tek seferlik giriş | Karma olarak 10 dk (kullanılınca ya da süre dolunca silinir) |
| Güvenlik olay günlüğü (şüpheli giriş, yaptırım) | Kötüye kullanımla mücadele | 12 ay |
| Oyun verisi (`oyuncuId`, komut günlüğü, dünya) | Sözleşmenin ifası | Dünya boyunca; `oyuncuId` opaktır, kişisel veri değildir |

Aydınlatma metni, açık rıza gerektirmeyen işleme (sözleşme, meşru menfaat) ve yurt dışına aktarım (Google, SES bölgesi) için hukuk metinleri sahip işidir; SES için AB bölgesi önerilir. Hesap silinince e-posta/Google bağı silinir, oyuncu anonimleşir (komut günlüğü dünya durumunun parçası olduğundan `oyuncuId` kalır, kimliği geri çözülemez).

## 7. Oyuncu kimliği ile hesap ayrımı

- **Hesap** = Better Auth `user.id` (e-posta, Google bağı, oturumlar); **oyuncu** = çekirdekteki `OyuncuId` (`^[a-z0-9_-]{1,32}$`; komut günlüğünde, anlık görüntüde, herkese görünen kare ve özetlerde).
- **Öneri:** `oyuncuId` sunucu üretimli ve opak (ör. `o_k3f9x2qa`); e-posta/hesap kimliğinden türetilmez, sızdırmaz. Görünen ad ayrı profil alanıdır (değiştirilebilir, filtreli), çekirdeğe girmez.
- Eşleme `hesap_oyuncu` tablosunda (`sunucu_sema` 003); `katil` komutu hesabı doğrulanmış oturumdan alır. `Kimlik` arayüzüne geriye uyumlu iki ek alan: `hesap`, `oturum` (yaptırım ve iptal için).

## 8. ws el sıkışmasına giriş

`merhaba.token` = bilet → `AuthKimligi.dogrula` (imza, `exp`, `jti` tek kullanım, `Origin` izni) → `{oyuncu, yonetici: false, hesap, oturum}` → `hosgeldin`. Hata: `hata{kod:"kimlik"}` + kapanış 4401 (`KAPANIS.kimlik`). Uç ve protokol alanları mevcut; yalnız yeni bir `KimlikDogrulayici` uygulaması gerekir.

## 9. Sahip kararları (toplantı)

1. Hesap başına bir oyuncu (öneri: evet) ve hesap silme/anonimleşme kuralı.
2. Geçici e-posta alanı engeli (öneri: evet) ve Google dışı sosyal giriş (öneri: Alfa'da yok).
3. Oturum süreleri (30 gün kayan / 90 gün mutlak) ve ws bileti (60 sn).
4. SES bölgesi ve yurt dışı aktarım metni; Turnstile ile Cloudflare kapsamı.
5. Yaptırım ölçeği ve itiraz süresi (özellikle "mülk asla el konmaz" ilkesinin metne yazılması).

Uygulama sırası (karardan sonra): auth servisi + bilet ucu, `AuthKimligi` ve `--uretim` kapatma, `hesap_oyuncu` + katılım akışı, risk sinyalleri ve yaptırım araçları, KVKK metinleri.
