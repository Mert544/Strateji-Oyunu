-- Sema surumu 3: Esnaf Defteri damgalari (profil; cekirdek disi). Olgu: kavram, sim zamani, kaynak (metin yok; KVKK).
-- Bu dosya `postgresSemasiKur` tarafindan bir kez, tek islemde ve `sunucu_sema` kaydiyla uygulanir (002 uygulanmis olmali).
CREATE TABLE IF NOT EXISTS profil_damga (
  dunya    text        NOT NULL,
  oyuncu   text        NOT NULL,
  kavram   text        NOT NULL,
  t        bigint      NOT NULL,           -- kazanildigi SIM zamani (ilk yazim kazanir)
  kaynak   text        NOT NULL,           -- odul | damga
  yazildi  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dunya, oyuncu, kavram)      -- idempotans anahtari
);
