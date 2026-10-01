-- Sema surumu 4: e-posta baglantisiyla giris (G5): hesap, hesap-oyuncu esleme, giris baglantisi ve oturum (KIMLIK.md).
-- YALNIZ EKLEME: mevcut tablolara ve verilere dokunmaz; her ifade IF NOT EXISTS ile idempotenttir (iki kez kosunca hata vermez).
-- Bu dosya `postgresSemasiKur` tarafindan bir kez, tek islemde ve `sunucu_sema` kaydiyla uygulanir (003 uygulanmis olmali).
-- Hesap tablolari DUNYADAN BAGIMSIZDIR (`dunya` sutunu yok): bir veritabanindaki butun dunyalar ayni hesaplari kullanir.
-- KVKK: kisisel veri yalniz e-postadir. IP, tarayici bilgisi ve ad tutulmaz. Acik belirtec tutulmaz, yalniz SHA-256 ozetleri.

CREATE TABLE IF NOT EXISTS hesap (
  id             text   PRIMARY KEY,           -- opak hesap kimligi
  eposta         text   NOT NULL,              -- posta adresi (kucuk harf)
  eposta_anahtar text   NOT NULL UNIQUE,       -- normallestirilmis anahtar (Gmail nokta ve +takma atilmis): bir adres, bir hesap
  olusturma      bigint NOT NULL               -- duvar saati epoch ms
);

-- Hesap basina bir oyuncu: hesap_id PK, oyuncu_id UNIQUE. Oyuncu kimligi sunucu uretimli ve opaktir (e-postadan turetilmez).
CREATE TABLE IF NOT EXISTS hesap_oyuncu (
  hesap_id  text NOT NULL PRIMARY KEY REFERENCES hesap (id) ON DELETE CASCADE,
  oyuncu_id text NOT NULL UNIQUE
);

-- Tek kullanimlik giris baglantisi: yalniz belirtecin SHA-256 ozeti; kullanilinca ya da sure dolunca silinir.
CREATE TABLE IF NOT EXISTS giris_baglanti (
  ozet            text   PRIMARY KEY,
  eposta          text   NOT NULL,
  eposta_anahtar  text   NOT NULL,
  bitis           bigint NOT NULL,
  tarayici_ozeti  text,                        -- istegi yapan tarayici cerezinin SHA-256 ozeti (yoksa null)
  olusturma       bigint NOT NULL
);
CREATE INDEX IF NOT EXISTS giris_baglanti_anahtar ON giris_baglanti (eposta_anahtar);
CREATE INDEX IF NOT EXISTS giris_baglanti_bitis ON giris_baglanti (bitis);

-- Oturum: cerezdeki belirtec `<id>.<gizli>`; yalniz gizlinin SHA-256 ozeti saklanir.
CREATE TABLE IF NOT EXISTS oturum (
  id            text   PRIMARY KEY,
  hesap_id      text   NOT NULL REFERENCES hesap (id) ON DELETE CASCADE,
  gizli_ozet    text   NOT NULL,
  olusturma     bigint NOT NULL,
  son_kullanim  bigint NOT NULL,
  bitis         bigint NOT NULL,               -- kayan bitis
  mutlak_bitis  bigint NOT NULL                -- mutlak ust sinir
);
CREATE INDEX IF NOT EXISTS oturum_hesap ON oturum (hesap_id);
CREATE INDEX IF NOT EXISTS oturum_bitis ON oturum (bitis, mutlak_bitis);
