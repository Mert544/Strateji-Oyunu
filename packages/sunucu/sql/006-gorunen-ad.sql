-- Sema surumu 6: oyuncu gorunen adi (insan testi I-1; KIMLIK.md). YALNIZ EKLEME, idempotent (iki kez kosunca hata vermez).
-- Hesap tablosuna sutun eklenir; mevcut satirlar korunur (ad NULL: eski hesaplarin adi sunucu acilisinda otomatik doldurulur).
-- KVKK: ad sunucunun urettigi opak ad ya da oyuncunun sectigi kisa, kisitli karakterli ad (2-24); e-postadan ya da oyuncu kimliginden TURETILMEZ.
-- Ad benzersiz DEGILDIR (yalniz otomatik uretimde cakisma yeniden denenir); bu yuzden UNIQUE degil, yalniz arama dizini vardir.
-- Hesap silinince ad de gider (ayni satir). Ad cekirdek durumuna ve gunluge girmez.

ALTER TABLE hesap ADD COLUMN IF NOT EXISTS ad text;
ALTER TABLE hesap ADD COLUMN IF NOT EXISTS ad_secildi boolean NOT NULL DEFAULT false;
ALTER TABLE hesap ADD COLUMN IF NOT EXISTS ad_degisim_t bigint;
CREATE INDEX IF NOT EXISTS hesap_ad ON hesap (ad);
