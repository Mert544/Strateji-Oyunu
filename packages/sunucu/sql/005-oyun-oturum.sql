-- Sema surumu 5: oyun baglantisi oturum olayi kaydi (insan testi I2; BOLGE_OTURUM_KAYDI=1 ile yazilir, varsayilan kapali). YALNIZ EKLEME, idempotent.
-- Bu, GIRIS (kimlik) oturumu (`oturum`, cerezle acilan hesap oturumu) DEGIL, oyuncunun ws baglantisi suresidir: adlar karismasin.
-- KVKK: yalniz zaman ve opak oyuncu kimligi (IP, cihaz, tarayici, e-posta YOK). `profil_capa`'ya yazilmaz. Ayrinti 90 gun, sonrasi yalniz gunluk toplu sayilar.
-- Dunya basinadir (`dunya` sutunu): test dunyasi silinince satirlari da gider.

CREATE TABLE IF NOT EXISTS oyun_oturum (
  dunya    text   NOT NULL,
  id       bigint GENERATED ALWAYS AS IDENTITY,
  oyuncu   text   NOT NULL,                 -- opak oyuncu kimligi (e-postadan turetilmez)
  acilis   bigint NOT NULL,                 -- duvar saati epoch ms
  kapanis  bigint,                          -- null = acik
  PRIMARY KEY (dunya, id)
);
CREATE INDEX IF NOT EXISTS oyun_oturum_oyuncu ON oyun_oturum (dunya, oyuncu, acilis);

CREATE TABLE IF NOT EXISTS oyun_oturum_gunluk (
  dunya   text   NOT NULL,
  gun     bigint NOT NULL,                  -- UTC gun baslangici (epoch ms)
  oturum  integer NOT NULL,
  oyuncu  integer NOT NULL,                 -- o gun oturumu olan farkli oyuncu sayisi
  sure_ms bigint NOT NULL,
  PRIMARY KEY (dunya, gun)
);
