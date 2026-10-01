# Askeri 0a şartnamesi (A3): teslim raporu, Parça 1

**Durum: PARÇA 1 teslim edildi** (kimlik, şema, düğüm düzeltmesi). Parça 2 (yağma defteri, kanıt ve negatif kontroller, testler, bot/ölçüm, sıra, rollere istek, GZ, açık sorular) aynı dosyada §9–§16'da eklenir.

- **Dal:** `takim/a3/askeri-0a`; **taban:** `7553b55` (`entegrasyon`). Push yok. **Dosyalar:** `docs/arastirma/askeri-0a-sartname.md`, `docs/agent-results/askeri-0a-a3.md`.
- **Girdiler:** `askeri-katman-v1.md` (onaylı), docs/12 §13 (Y-35, Y-36), AÖ-19, sentez-2 D4-5/D4-6, kimlik-listesi-v1 §2.3, çekirdek `askeri/`, `mulk/`, `dugum.ts`, `veri/src`.

## Parça 1 kapsamı

Kapsam ve 0a/0b kalem eşlemesi (0), kilitli kararlar ve AK'den 4 bilinçli sapma (1), mevcut kod bulguları B1–B16 (2), kimlikler ve ad kilidi (3), `askeri.eskiya` şeması ve VA1–VA11 doğrulayıcı, üç ek yapı kaydı ve VE1–VE4 (4), düğüm düzeltmesi ve mülk kipi kapısı (`askeri kapali`; 5), Ordugâh şartı ve kapasitesi (6), ikmal çarpanı ve Karakol ikmali (7), Nöbet Evi konumu ve olay adları (8), Ek A (dosya:satır).

## Öne çıkan bulgular

- Ek yapı kimlikleri (`ordugah`, `karakol`, `gozetleme_kulesi`) `kimlik-listesi.json`'da **zaten kilitli** (`A0-ops`); yeni kimlik gerekmez, yalnız `nobet_evi` aşaması `ileride` → `A0-ops`.
- Mülk kipinde `birlik_uret`/`savunma_emri` bugün hiçbir zaman başarılı olamaz (`ic.bolgeIndeks` düğüm kimliğini bilmez) ve mülk dünyasında başlangıç birliği yoktur: ikmal ×0,25 verisi 0a'da yazılsa bile mülk altınlarını etkilemez.
- AK §2.2'nin arsa türü/komşuluk matrisi parsel fikstüründe karşılığı olmadığı için uygulanamaz (kullanım türü yok).
- AK Ek C ile iki fark: ek yapıdaki `nobetciGucu`/`duyuruEkiSaat` kaldırıldı (tek kaynak `eskiya.*`), `ganimet` mal-kimlikli `Record`.

## Doğrulama

Kod okuma (dosya:satır tabanı `7553b55`); çekirdek koduna dokunulmadı, test koşulmadı (belge işi). Doğrulanmayanlar belgede `(doğrulanmadı)` işaretli.

## Açık sorular (Parça 1; ayrıntı §16 Parça 2'de)

S-1 ikmal ×0,25 verisinin 0a'da yazılması; S-2 `nobet_evi` aşama güncellemesi; S-3 `savas_ilan` kapısı; S-4 arsa matrisinin uygulanamazlığı; S-5 bayrak açılış tohumu (0b); AK sapmalarının onayı.
