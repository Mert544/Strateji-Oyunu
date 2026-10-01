-- Sema surumu 2: icerik gocu (snapshots anahtarina kural surumu, goc yedek tablosu) ve oyuncu profili (capalar, ozet kayitlari).
-- Bu dosya `postgresSemasiKur` tarafindan bir kez, tek islemde ve `sunucu_sema` kaydiyla uygulanir (001 uygulanmis olmali).

-- 1. snapshots birincil anahtarina kural_sur: icerik gocu goruntusu eskisiyle AYNI (seq, sim_t)'de yazilir ve eski kural surumlu
--    kayit KORUNUR (kendiliginden yedek). En son goruntu secimi: seq, sim_t, olusturma, kural_sur sirasiyla (deterministik).
ALTER TABLE snapshots DROP CONSTRAINT IF EXISTS snapshots_pkey;
ALTER TABLE snapshots ADD PRIMARY KEY (dunya, seq, sim_t, kural_sur);

-- 2. Goc oncesi goruntunun ayri, degismez yedegi (etiket: `goc-<eskiKural>`); geri donus bu yedekten yapilir.
CREATE TABLE IF NOT EXISTS snapshot_yedek (
  dunya        text        NOT NULL,
  etiket       text        NOT NULL,
  seq          bigint      NOT NULL,
  sim_t        bigint      NOT NULL,
  kural_sur    text        NOT NULL,
  sema_sur     integer     NOT NULL,
  durum_ozeti  text        NOT NULL,
  ek           jsonb       NOT NULL,
  sikistirma   text        NOT NULL,
  blob         bytea       NOT NULL,
  olusturma    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dunya, etiket)
);

-- 3. Oyuncu profili: cekirdek disi. Capalar (sonGorulen, ozetOkunduT) ve ozet kayitlari (olgu; ad/metin yok).
CREATE TABLE IF NOT EXISTS profil_capa (
  dunya      text        NOT NULL,
  oyuncu     text        NOT NULL,
  capa       jsonb       NOT NULL,           -- { sonGorulen?, ozetOkunduT? }; kismi yazim ust duzey anahtar birlestirir
  guncelleme timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dunya, oyuncu)
);

CREATE TABLE IF NOT EXISTS profil_kayit (
  dunya      text        NOT NULL,
  oyuncu     text        NOT NULL,
  tur        text        NOT NULL,           -- insaat_bitti | satis_toplami | siparis_geldi
  t          bigint      NOT NULL,           -- olayin SIM zamani (yazilma zamani degil)
  sira       bigint      NOT NULL,           -- varlik sirasi (insaat kimligi vb.); anahtar tanecikten bagimsiz
  ilce       text        NOT NULL,
  degerler   jsonb       NOT NULL,
  aktor_ref  text,
  yazildi    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dunya, oyuncu, tur, t, sira)  -- idempotans anahtari
);
CREATE INDEX IF NOT EXISTS profil_kayit_oyuncu_t ON profil_kayit (dunya, oyuncu, t);
