# Alfa-0 işletim kılavuzu (operatör, tek sayfa)

Tek makinede (sunucu + Postgres 16, Docker Compose) açık alfayı işleten kişi için sıralı rehber. Komutları buraya KOPYALAMADIK: her madde, komutların ve beklenen çıktıların bulunduğu yere bağlanır ([sunucu README](../packages/sunucu/README.md) kısaca README, [KIMLIK.md](../packages/sunucu/KIMLIK.md)). Kısaltma: `$D` = `docker compose -f deploy/docker-compose.yml --env-file deploy/.env`. Sırlar ve davet listesi depoda yoktur; `.env` ve liste ayrıca saklanır.

## 1. Kurulum

1. `deploy/.env.ornek` → `deploy/.env`; zorunlu değerler: `PG_SIFRE`, `METRIK_TOKEN`, `BILET_SIRRI` (en az 32 karakter), `IZINLI_KOKENLER`, `GENEL_URL` (https). Örnek değerlerle sunucu açılmaz. Ayrıntı: [Kurulum](../packages/sunucu/README.md#kurulum-docker-compose), [Ortam değişkenleri](../packages/sunucu/README.md#ortam-değişkenleri).
2. `$D up -d --build`, ardından [açılış kontrol listesi](../packages/sunucu/README.md#alfa-0-açılış-kontrol-listesi) sırayla: 1-8 ve 10 sunucu, 11 giriş, 12 davet listesi, 14 yedek; 9 (yük) ve 13 (test dünyası) isteğe bağlıdır. Bir adım geçmezse durun.
3. Ters vekil (TLS) sunucunun önünde olmalı: portlar yalnız 127.0.0.1'e yayınlanır, çerezler `Secure`'dır. Gerçek e-posta göndericisi henüz yoktur: giriş bağlantıları `/veri/posta` dosyalarına düşer ve davetliye elle iletilir ([Giriş](../packages/sunucu/README.md#giriş-e-posta-bağlantısı-g5), kontrol listesi adım 11).

## 2. Davetli ekleme

1. `deploy/davet/` (ya da `DAVET_DIZIN`) altındaki liste dosyasına satır başına bir e-posta ekleyin (`#` açıklama). Dosya `chmod 644` olmalı, kişisel veridir, depoya girmez.
2. `$D restart sunucu`: liste çalışırken yeniden yüklenmez. Liste bozuk, yok ya da boşsa sunucu açılmaz.
3. Denetim: kontrol listesi adım 12 (`hazir` olayındaki `davetli` adedi). Davetsiz adrese aynı yanıt verilir ama posta gitmez: [KIMLIK.md, kayıt kapısı](../packages/sunucu/KIMLIK.md). Listeden çıkarmak açık oturumu kapatmaz.
4. Alfa-0 bitince listeyi silin (KVKK).

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

## Hızlı başvuru

| Durum | Bakılacak yer |
|---|---|
| Sunucu açılmıyor | `$D logs sunucu`; kontrol listesi adım 4 (ret iletileri) |
| Sağlık ve metrik | [Sağlık ve metrik](../packages/sunucu/README.md#sağlık-ve-metrik), adım 2-3 |
| Kimse giriş yapamıyor | adım 11-12 (posta dizini, davet listesi, `GENEL_URL`/Origin) |
| Yedek çalışmıyor | `$D ps yedek`, adım 14 |
