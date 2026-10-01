-- Bölge Stratejisi sunucusu: komut günlüğü + anlık görüntü şeması (docs/11 §10, docs/arastirma/sunucu-tasarimi.md).
-- Dünya başına TEK YAZAR süreç vardır; yazar, dünya kimliği üzerinde pg_try_advisory_lock tutar.
-- `seq` sunucu tarafından atanır (boşluksuz); birincil anahtar ikinci bir yazarın aynı seq'i yazmasını da engeller.

CREATE TABLE IF NOT EXISTS log (
  dunya      text        NOT NULL,             -- dünya kimliği (bir veritabanında birden çok dünya olabilir)
  seq        bigint      NOT NULL,             -- 1'den başlayan uygulama sırası
  t          bigint      NOT NULL,             -- sunucunun bastığı sim zamanı (ms)
  hesap      text        NOT NULL,             -- token'dan çözülen oyuncu ("sistem" = yönetici)
  istemci    text        NOT NULL,             -- idempotans kapsamı: istemci kimliği
  anahtar    text        NOT NULL,             -- idempotans anahtarı
  komut      jsonb       NOT NULL,             -- çekirdek Komut (niyet)
  kural_sur  text        NOT NULL,             -- kuralSurumuHesapla(veri)
  sema_sur   integer     NOT NULL,             -- günlük kaydı biçim sürümü
  yazildi    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dunya, seq)
);

-- Denetim izi araması için (benzersiz DEĞİL: idempotans penceresi sınırlıdır, çok eski bir anahtar yeniden gelebilir).
CREATE INDEX IF NOT EXISTS log_hesap ON log (dunya, hesap, seq);

CREATE TABLE IF NOT EXISTS snapshots (
  dunya        text        NOT NULL,
  seq          bigint      NOT NULL,           -- görüntüye dahil son günlük seq'i
  sim_t        bigint      NOT NULL,           -- dunya.zaman
  kural_sur    text        NOT NULL,
  sema_sur     integer     NOT NULL,
  durum_ozeti  text        NOT NULL,           -- FNV-1a 64 (onaltılık)
  ek           jsonb       NOT NULL,           -- sunucu üst verisi (tohum, idempotans tablosu)
  sikistirma   text        NOT NULL,           -- 'gzip' (zstd Node'da kararlı olunca)
  blob         bytea       NOT NULL,           -- anlikGoruntuOlustur çıktısı (sıkıştırılmış)
  olusturma    timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (dunya, seq, sim_t)
);
