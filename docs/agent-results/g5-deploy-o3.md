# g5-deploy: Alfa-0 kurulumu (G5 girişi ve davet listesi) (O3)

Dal `takim/o3/g5-deploy`. Taban: P3 ucu `5413811` (`refs/kapi/p3`; G5, pg-saglamlik, i2-i3 ve davet bu uçta). P3 `entegrasyon`'a girince `git rebase --onto entegrasyon 5413811` ile yalnız bu dalın commit'i taşınır (dosyalar: `deploy/*`, sunucu README'si, bu rapor).

## Değişenler

- `deploy/docker-compose.yml`: `BOLGE_GELISTIRME_SIRRI` kalktı. Eklenenler: `BOLGE_KIMLIK=eposta`, `BOLGE_BILET_SIRRI` (zorunlu, `BILET_SIRRI`), `BOLGE_BILET_SIRRI_ESKI`, `BOLGE_IZINLI_KOKENLER` ve `BOLGE_GENEL_URL` (zorunlu), `BOLGE_GUVENILIR_PROXY`, `BOLGE_POSTA=dosya`, `BOLGE_POSTA_DIZIN=/veri/posta`, `BOLGE_DAVETLI_LISTE` (`DAVETLI_LISTE_DOSYA` doluysa `/davet/<dosya>`). Hacimler: adlandırılmış `veri:/veri` (posta dosyaları) ve `${DAVET_DIZIN:-./davet}:/davet:ro` (liste imaja girmez, salt okunur bağlama dizini).
- `deploy/.env.ornek`: `GELISTIRME_SIRRI` yerine `BILET_SIRRI` (>= 32, örnek değer), `BILET_SIRRI_ESKI`, `IZINLI_KOKENLER`, `GENEL_URL`, `DAVET_DIZIN`, `DAVETLI_LISTE_DOSYA`, `GUVENILIR_PROXY`; hepsi yorumlu. `deploy/.gitignore`: `davet/`.
- `packages/sunucu/README.md`: Kurulum (üretim zorunluları, posta ve davet maddesi), ortam tablosunda `BOLGE_URETIM` ve `BOLGE_GELISTIRME_SIRRI`, Compose değişkenleri, Postgres bullet'ı (`SQL_SEMA_SURUMU = 5`), kontrol listesi: ön koşul, adım 1 (`hazir` alanları), adım 4 (yeni ret iletileri), adım 7 (şema 1..5), yeni adım 11 (giriş ve kayıt kapısı) ve 12 (davet listesi yüklendi), sonuç ölçütü 1-12.

## Doğrulama (gerçek çıktılar; P3 ucu `5413811`, Docker daemon yok)

- `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.ornek config`: geçti; sırsız çağrı sırasıyla `PG_SIFRE gerekli` hatası verir.
- Adım 4, yerel eşdeğer (`BOLGE_URETIM=1 BOLGE_DEPO=bellek`), hepsi çıkış kodu 1: sırsız `BOLGE_BILET_SIRRI acikca verilmeli`; örnek sır `... varsayilan/ornek ('degistir...', 'gelistirme...') deger olmamali`; kısa sır `en az 32 karakter olmali`; `BOLGE_IZINLI_KOKENLER` yok `... verilmeli`; `BOLGE_GENEL_URL` yok `... verilmeli`; http `https olmali (Secure cerez)`; `BOLGE_KIMLIK=gelistirme` `gelistirme kimligi kapali`; `BOLGE_POSTA=konsol` `konsol postacisi kapali`; `BOLGE_ELLE_SAAT=1` `--elle-saat yasak`; örnek metrik token'ı reddedildi.
- Adım 11, gerçek süreç (üretim kipi, dosya postası, davet listesi `ali@ornek.org`): `hazir` `kimlik: eposta, davetli: 1`; davetli istek 202, davetsiz istek AYNI 202 ve posta dosyası yok (1 dosya); yanlış Origin 403; `POST /giris/onay` 200 (`yeniHesap: true`, `bolge_oturum` çerezi HttpOnly + Secure + SameSite=Lax); `/giris/bilet` 200; `/giris/ben` 200; çıkış SIGTERM kodu 0; stdout/stderr'de adres yok.
- Adım 12: liste dosyası yok `davetli listesi okunamadi (ENOENT)` ile ve bozuk satır `davetli listesi satir 2 gecerli bir e-posta adresi degil` ile açılışı durdurur. **BOŞ liste açılır** (`davetli: 0`): kimseye bağlantı gitmez; README buna göre yazıldı (ilk taslak "boş da açılmaz" diyordu, deneyle düzeltildi).
- Koşulamayan: `docker compose up`, bağlama dizini izinleri (`DAVET_DIZIN` salt okunur, dosya uid 1000'e okunabilir olmalı), `veri` hacminde `node` sahipliği (imajda `/veri` node'a ait olduğundan hacmin ilk doldurulmasıyla geçer; ilk gerçek makinede `docker compose exec sunucu ls -ld /veri/posta`).

## Açık

- Gerçek SMTP/SES bağdaştırıcısı yok: Alfa-0'da giriş bağlantıları `/veri/posta` dosyalarına düşer, davetliye operatör iletir. Bağdaştırıcı sahip kararıdır (K2/KIMLIK.md §7).
- `deploy/yedek.sh` `veri` hacmini (posta dosyaları) yedeklemez; posta kayıtları geçicidir.
