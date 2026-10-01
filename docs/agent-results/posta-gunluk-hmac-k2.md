# Posta olayi gunlugunde e-posta HMAC onegi (K2, KVKK) - takim/k2/posta-gunluk-hmac

Taban `df0a728`, tek commit. Karar (bas lider): gunluge e-posta adresi HICBIR bicimde yazilmaz, maskeli hali de (`p***@alan`: ilk harf + tam alan adi kismi kisisel veri). Iliskilendirme icin yalniz `eposta_hmac` = HMAC-SHA256(kanonik adres) ilk 8 hex.

## Degisiklik
- `src/giris/gunluk-kimlik.ts` (yeni): `GunlukKimligi(tuz)`; anahtar `amacAnahtari(tuz, "eposta-gunluk")` (jeton.ts'teki `bolge-kimlik/v1/<amac>` HMAC deseni; `Imzalayici` ayni fonksiyonu kullanir) = jeton/bilet imza anahtariyla AYNI DEGIL. `onek(kanonik)` ve `eposta(adres)` (once `epostaCoz().anahtar`: kucuk harf, +takma, Gmail noktalari atilir: ayni hesap ayni onek).
- `hizmet.ts`: `giris_posta_gonderildi` ve `giris_posta_hatasi` artik `{ eposta_hmac }` (hata: + `tur`); `kime`/maske YOK. `gunlukKimligi` secenegi verilmezse adresle ilgili hicbir alan yazilmaz.
- `posta.ts` `KonsolPostaGondericisi`: stdout satirinda `kime` yok; kimlik uretici verilirse `eposta_hmac`. (Dosya postacisi bir posta KUTUSUDUR, gunluk degil: icinde adres vardir, README zaten kisitlamayi soyler.)
- `eposta.ts`: `epostaMaskele` KALDIRILDI (index'ten de), yeniden kullanilmasin. Istemcideki maskeli gosterim (hesap ekrani) gunluk degildir, dokunulmadi.
- `kip.ts`/`cli.ts`: `BOLGE_GUNLUK_TUZU`. `eposta` kipinde URETIMDE ZORUNLU (yoksa acilis durur: "uretim kipi: BOLGE_GUNLUK_TUZU acikca verilmeli"), >= 32 karakter, `degistir...`/`gelistirme...` ornek degil, `BOLGE_BILET_SIRRI`/`_ESKI` ile AYNI olamaz. Gelistirmede yoksa UYARI olayi + ornek tuz (`VARSAYILAN_GUNLUK_TUZU`); verilirse >= 16 karakter.
- `deploy/docker-compose.yml` (`BOLGE_GUNLUK_TUZU: ${GUNLUK_TUZU:?...}`) ve `deploy/.env.ornek` (`GUNLUK_TUZU=degistir-...`): uretimde zorunlu oldugu icin compose da zorunlu kilar. `git merge-tree` ile `takim/o3/caddy-istemci` (deploy/.env.ornek, docker-compose.yml'e dokunan tek bekleyen dal) cakismasiz.
- Dokuman: `KIMLIK.md` §Gunluk, sunucu `README.md` (uretim zorunlulari, env tablosu, adim 15 beklentisi).

## O3'e not (README adim 15 / hesap-sil-kilavuz-o3.md)
O3 raporundaki "gunluk posta olayinda `kime":"p***@alan"`" bulgusu ARTIK GECERSIZ: olay `{"olay":"giris_posta_gonderildi","eposta_hmac":"<8 hex>"}`. Main README adim 15 beklentisi guncellendi (`grep -c 'ornek.org'` hala 0; ek satir `eposta_hmac` bekler). `hesap-sil-kilavuz-o3.md` O3'un dalindadir: o dosyadaki bulgu metnini O3 guncellemeli. Ayrica gercek ortamda `deploy/.env`'e `GUNLUK_TUZU` EKLENMELI (yoksa compose `GUNLUK_TUZU gerekli` hatasi verir).

## Dogrulama
- `tsc` (gecici tsconfig: sunucu src + giris* ve davet testleri) temiz.
- vitest tek dosya, tek isci: giris-birim 20/20 (GunlukKimligi: 8 hex, ayni adres ayni onek, kanonik denklik, farkli adres farkli onek, tuz degisince onek degisir, amaca ozel anahtar, regex: adres/alan/maske yok; kip: tuz zorunlu/ornek/bilet sirriyla ayni/gelistirme uyarisi; konsol satiri adres icermez), giris 36/36 (olay verisi `eposta_hmac`; gunluk+metrik+stdout'ta `gizlialan`/`***@` yok), giris-cli 5/5 (gercek surec: stdout'ta `ornek.org`/`***@` yok, `giris_posta_gonderildi` = beklenen HMAC oneki, gelistirme uyarisi, uretimde tuzsuz acilis durur), davet 11/11, metrik ve test-dunya'nin uretim kipi testleri (tuz eklendi).
