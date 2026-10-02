# Alfa-0 işletim kılavuzu (operatör, tek sayfa)

Tek makinede (sunucu + Postgres 16, Docker Compose) açık alfayı işleten kişi için sıralı rehber. Komutları buraya KOPYALAMADIK: her madde, komutların ve beklenen çıktıların bulunduğu yere bağlanır ([sunucu README](../packages/sunucu/README.md) kısaca README, [KIMLIK.md](../packages/sunucu/KIMLIK.md)). Kısaltma: `$D` = `docker compose -f deploy/docker-compose.yml --env-file deploy/.env`. Sırlar ve davet listesi depoda yoktur; `.env` ve liste ayrıca saklanır.

## 1. Kurulum

1. `deploy/.env.ornek` → `deploy/.env`; zorunlu değerler: `PG_SIFRE`, `METRIK_TOKEN`, `BILET_SIRRI` (en az 32 karakter), `GUNLUK_TUZU` (en az 32 karakter, `BILET_SIRRI`'ndan farklı; yoksa compose ve sunucu açılmaz), `IZINLI_KOKENLER`, `GENEL_URL` (https), `SITE_ADRESI` (yalnız ana makine adı; yoksa compose açılmaz). Örnek değerlerle sunucu açılmaz. Ayrıntı: [Kurulum](../packages/sunucu/README.md#kurulum-docker-compose), [Ortam değişkenleri](../packages/sunucu/README.md#ortam-değişkenleri).
2. `$D up -d --build`, ardından [açılış kontrol listesi](../packages/sunucu/README.md#alfa-0-açılış-kontrol-listesi) sırayla: 1-8 ve 10 sunucu, 1b arsa ızgarası (açılışta `izgara` olayı `ilce` 3; görünmezse DURUN), 11 giriş, 12 davet listesi, 14 yedek, 16 istemci sunumu; 9 (yük), 13 (test dünyası) ve 15 (hesap silme) isteğe bağlıdır. Bir adım geçmezse durun.
3. Ters vekil ve istemci sunumu compose'taki `caddy` servisidir (`deploy/Caddyfile`; TLS, `ISTEMCI_DIZIN` dizinini bütün olarak sunar, ws ve `/giris/*` sunucuya gider, `/metrik` dışarı açılmaz). Alfa-0 varsayılanı gerçek harita + arsa ızgarasıdır (`.env.ornek`: `BOLGE_HARITA=gercek`, `IZGARA_MANIFEST`; `BOLGE_PARSEL=0` ve `BOLGE_BOTLAR` boş kalmalı; mevcut `.env`'sinde `BOLGE_HARITA=sentetik` olan `gercek` yapmalı, yoksa açılış durur). `.env`'de `SITE_ADRESI` (yalnız ana makine adı, `GENEL_URL` ile aynı) ZORUNLUDUR: mevcut `.env`'si olan operatör `SITE_ADRESI`'ni eklemeli, yoksa compose açılmaz. `GUNLUK_TUZU` da ZORUNLUDUR (en az 32 karakter, `BILET_SIRRI`'ndan farklı): mevcut `.env`'ye eklenmezse compose ve sunucu açılmaz. `ISTEMCI_DIZIN` (`pnpm dunya` çıktısı) verilir. `GUVENILIR_PROXY=1` yalnız compose ve `.env.ornek` varsayılanıdır (Caddy için); sunucu kodunun varsayılanı 0'dır, compose dışında çalıştıranlar için varsayılan 0 (ters vekil arkasındaysa kendiniz 1 verin). Sunucu portu yalnız Caddy'ye ve localhost'a açık kalmalı, yoksa `X-Forwarded-For` sahtelenir. Doğrulama: kontrol listesi adım 16 (**henüz denenmedi: daemon'lu makinede operatör provası**). Sunucu portları yalnız 127.0.0.1'e yayınlanır, çerezler `Secure`'dır. Gerçek e-posta göndericisi henüz yoktur: giriş bağlantıları `/veri/posta` dosyalarına düşer ve davetliye elle iletilir ([Giriş](../packages/sunucu/README.md#giriş-e-posta-bağlantısı-g5), kontrol listesi adım 11).

## 2. Davetli ekleme

1. `deploy/davet/` (ya da `DAVET_DIZIN`) altındaki liste dosyasına satır başına bir e-posta ekleyin (`#` açıklama). Dosya `chmod 644` olmalı, kişisel veridir, depoya girmez.
2. `$D restart sunucu`: liste çalışırken yeniden yüklenmez. Liste bozuk, yok ya da boşsa sunucu açılmaz.
3. Denetim: kontrol listesi adım 12 (`hazir` olayındaki `davetli` adedi). Davetsiz adrese aynı yanıt verilir ama posta gitmez: [KIMLIK.md, kayıt kapısı](../packages/sunucu/KIMLIK.md). Listeden çıkarmak açık oturumu kapatmaz.
4. Alfa-0 bitince listeyi silin (KVKK).
5. Hesap silme talebi: oyuncu oyun içinden ister, e-postasına gelen bağlantıyla onaylar; sunucu hesabı, oturumlarını ve adını siler. Mülk devredilmez, oyuncu günlükte anonim kalır (e-posta ve ad günlükte hiç yoktur). Sizin işiniz: silinen kişinin adresini davet listesinden çıkarmak (yukarıdaki madde 1-2). Adım adım denetim: kontrol listesi adım 15 ve [KIMLIK.md](../packages/sunucu/KIMLIK.md) §6. Kendiniz hesap ya da oyuncu satırı silmeyin. Ekrandan çalışması için ters vekil `/giris/*` yolunu sunucuya iletmeli ve `IZINLI_KOKENLER` istemcinin sunulduğu kökeni içermeli (aksi hâlde 403).

## 3. Test dünyası silme

İnsan testi ayrı dünyada (`BOLGE_DUNYA=test_<ad>`, `ana` değil) yapılır; bitince tek komutla silinir, başka dünya ve başka dünyada da oynayan hesap korunur. Adım adım komutlar, ret durumları ve kabul ölçütleri: kontrol listesi adım 13 ve [Test dünyası ve döküm araçları](../packages/sunucu/README.md#test-dünyası-ve-döküm-araçları-insan-testi). Silmeden önce `ana`'nın son görüntü özetini kaydedin, sonra aynı olduğunu doğrulayın.

## 4. Yedek ve geri dönüş

- Yedek günde bir kez kendiliğinden alınır (compose `yedek` servisi; 7 yedek kalır, başarısızlıkta eskiler silinmez). Denetim: kontrol listesi adım 14, [Yedek ve geri yükleme](../packages/sunucu/README.md#yedek-ve-geri-yükleme-pg). Yedek yalnız pg'yi kapsar: `.env` ve davet listesini ayrıca, yedek dizinini başka diske ya da makineye kopyalayın.
- Geri yükleme her zaman YENİ bir veritabanına yapılır (`deploy/geri-yukle.sh --olustur`); açılan sunucunun `durumOzeti`'si canlıyla aynı olmalıdır. Tatbikat: kontrol listesi adım 5. Canlı veritabanının üzerine yazmayın; geri yüklenen veritabanından açılan sunucuyla doğrulayın. Canlıyı o veritabanına çevirmek (`BOLGE_PG_URL`) ayrı bir karardır: geliştiriciyle birlikte verin.
- Kapalı kalma serbesttir: dünya kapalıyken de akar, sunucu açılınca yetişir (kontrol listesi adım 8).

## 5. Ölümcül durumda ne yapılır

Belirti: `/saglik` 503 (`durum: "olumcul"`) ya da süreç çıkış kodu 1 ile durur, günlükte `{"olay":"olumcul","hata":...}`. Sunucu bilerek durur (veri bozulmasın); `restart: unless-stopped` onu yeniden başlatır ve kurtarma temizdir.

1. `$D logs sunucu | tail` ile son `olumcul` iletisine bakın. Sık nedenler: pg bağlantısı koptu ("depo baglantisi koptu"), kalıcı katmanın bir yazması reddedildi (ör. disk dolu), sır ya da kimlik ayarı reddi (açılışta, `uretim kipi: ...`).
2. `$D ps`: `pg` healthy mi? Değilse önce pg (`$D logs pg`), disk (`df -h`), sonra `$D restart sunucu`.
3. Açılışta `hazir.kurtarma` (`kalanKayit`, `kalanBasarisiz`, `uyarilar`) beklenen gibi mi: [kontrol listesi adım 10](../packages/sunucu/README.md#alfa-0-açılış-kontrol-listesi) (kill -9 sonrası seq geri gitmemeli, `kalanBasarisiz` 0).
4. Sunucu açıldıktan sonra tekrar tekrar ölüyorsa ya da veri şüpheliyse: son yedekten YENİ veritabanına geri yükleyip `durumOzeti`'ni doğrulayın (bölüm 4); sorunu ve günlük çıktısını kaydedip geliştiriciye iletin. Kendiniz veri satırı silmeyin.
5. `/saglik` 200 `yetisiyor` ölümcül değildir (kapalı süreyi yetişiyor); `/hazir` 200 olana dek bekleyin.

## 6. Kural dönemi göçü

Oyun içeriği ya da parametresi değiştiğinde yalnız dönem sınırında, sunucu kapalı ve komut kuyruğu boşken yapılır; içerik yalnız SONA eklenebilir. Sıra: SIGTERM ile kapatın → yedek (bölüm 4) → yeni imajla `BOLGE_GOC=1` → `hazir.kurtarma.goc`'u beklenenle karşılaştırın → `BOLGE_GOC=0` ile yeniden başlatın. Geri dönüş (`--yedekten-don`) yalnız yeni kuralla hiç komut kabul edilmediyse mümkündür. Önce üretime değil yedeğin kopyasına deneyin: [Kural dönemi provası](../packages/sunucu/README.md#kural-dönemi-provası-içerik-göçü), kontrol listesi adım 6, README'deki "İçerik göçü" bölümü.

## 7. Ekonomi izleme

Açık alfa sürerken oyun ekonomisinin sağlığı, A2'nin [Alfa-0 canlı ekonomi izleme listesi](arastirma/alfa0-ekonomi-izleme.md) ile izlenir; değerleri buraya KOPYALAMADIK. Liste 10 metriği (E1-E10: para dengesi R ve r, ZP8, ilk dükkân ve geri ödeme, zincir M, kamu kasaları, fiyat sınırı, bakım, ödül ve kit) her biri için okuma yolu, yeşil/sarı/kırmızı eşik ve **"kırmızıda ilk ayar"** ile verir: [özet tablo](arastirma/alfa0-ekonomi-izleme.md#0-özet-on-metrik-okuma-yolu-eşikler); izleme çizelgesi aynı belgenin 9. bölümündedir. Bir metrik kırmızıysa parametreye kendiniz dokunmayın: tablodaki ilk ayarı ve yönü geliştiriciye iletin (parametre değişimi kural dönemi göçüdür, bölüm 6). Bugün `/metrik` ekonomi değerlerinin çoğunu vermez; bunlar günlük oynatmasından okunur ya da [K2 işi](arastirma/alfa0-ekonomi-izleme.md#82-uçta-olmayan-metrikler-k2-işi-listesi) olarak bekler. Eşikler ilk tahmindir ve ilk canlı haftadan sonra kalibre edilir; 5'ten az oyuncuda renk verilmez, "ölçülmedi" yazılır.

## Hızlı başvuru

| Durum | Bakılacak yer |
|---|---|
| Sunucu açılmıyor | `$D logs sunucu`; kontrol listesi adım 4 (ret iletileri) |
| Sağlık ve metrik | [Sağlık ve metrik](../packages/sunucu/README.md#sağlık-ve-metrik), adım 2-3 |
| Kimse giriş yapamıyor | adım 11-12 (posta dizini, davet listesi, `GENEL_URL`/Origin) |
| Hesap silme talebi | bölüm 2 madde 5; adım 15 |
| Yedek çalışmıyor | `$D ps yedek`, adım 14 |
| Ekonomi sağlığı, kırmızıda ilk ayar | [Ekonomi izleme](#7-ekonomi-izleme), [A2 listesi](arastirma/alfa0-ekonomi-izleme.md) |
