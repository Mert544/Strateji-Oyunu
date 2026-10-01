# Askeri 0a şartnamesi (A3): teslim raporu

**Durum: PARÇA 1 ve PARÇA 2 teslim edildi.** Şartname bütündür (`docs/arastirma/askeri-0a-sartname.md`, §0-§16 + Ek A); K3 P4/P5 kapısı yeşil olunca 0a-1'den başlar.

- **Dal:** `takim/a3/askeri-0a`; **taban:** `7553b55` (`entegrasyon`). Push yok. **Dosyalar:** `docs/arastirma/askeri-0a-sartname.md`, `docs/agent-results/askeri-0a-a3.md`.
- **Girdiler:** `askeri-katman-v1.md` (onaylı), docs/12 §13 (Y-35, Y-36), AÖ-19, sentez-2 D4-5/D4-6, kimlik-listesi-v1 §2.3, çekirdek `askeri/`, `mulk/`, `dugum.ts`, `veri/src`.

## Bölümler

- **Parça 1:** kapsam ve 0a/0b kalem eşlemesi (0), kilitler ve AK'den sapmalar (1), kod bulguları B1–B16 (2), kimlikler ve ad kilidi (3), `askeri.eskiya` şeması VA1–VA11 ve ek yapı kayıtları VE1–VE4 (4), düğüm düzeltmesi ve mülk kapısı (5), Ordugâh şartı (6), ikmal (7), Nöbet Evi ve olay adları (8).
- **Parça 2:** yağma defteri `yagmaPenceresi` ve `yagmaTavaniUygula` (9), serileştirme ve göç (10), değişmez tablosu (11), kısa kanıt planı K-A1..K-A3 (12), test listesi (13), sıra ve roller (14), geri dönüşü zor kararlar GZ-A1..GZ-A9 (15), açık sorular (16).

## Öne çıkan bulgular

- Ek yapı kimlikleri `kimlik-listesi.json`'da zaten kilitli (`A0-ops`): yeni kimlik yok; yalnız `nobet_evi` aşaması `A0-ops`.
- Mülk kipinde `birlik_uret`/`savunma_emri` bugün hiç başarılı olamaz ve mülkte başlangıç birliği yoktur: kapı ve Ordugâh şartı mevcut davranışı bozmaz; ikmal ×0,25 verisi 0b'de (S-1).
- Arsa türü/komşuluk matrisi parsel fikstüründe karşılıksız: uygulanmaz.
- AK Ek C ile iki fark: ek yapıda `nobetciGucu`/`duyuruEkiSaat` kaldırıldı, `ganimet` mal-kimlikli `Record`.
- Yağma defteri sabit pencere (ilk yağmada açılır), `Σ oran ≤ tavan` ile H5 payda tanımına uyar; çağıran 0b'dedir.

## Geri dönüşü zor kararlar ve açık sorular

GZ-A1..GZ-A9 §15'te. Açık (§16): S-4 arsa matrisi, S-6 `Dunya.baskinlar` 0b, S-7 sabit pencere, S-8 `yagmaIletimPpm` rezervi, S-9 AK sapmalarının onayı. Kapanan: S-1, S-2, S-3, S-5.

## Doğrulama

Kod okuma (dosya:satır tabanı `7553b55`); çekirdek koduna dokunulmadı, test koşulmadı (belge işi). Doğrulanmayanlar belgede `(doğrulanmadı)` işaretli.

## Güncelleme (G6/G7 sonrası)

Şartname `takim/kod/p6-tam` bc6087c çekirdeğine göre tazelendi (taban 7553b55 yerine bc6087c; `dosya:satır` göndermeleri yeni satırlarla). Eklenenler: §2b (eski/yeni satır eşlemesi; BolgeDurumu/DukkanDurumu tipleri; para defteri musluk/lavabo ve `kasa.giris.sebeke`; şebeke etkileşimi; komutSemasi ve para güvenliği; H5/eşkıya/yağma %60-%40/ikmal ×0,25 0b veri özeti), §9.4 (dükkân raf stoğu ve kasa: yağmaya kapalı, servet = yapı + hücre; D1-D7), GZ-A10, 0b-4/0b-5. Askeri kaynak dosyaları (`askeri/`, `dugum.ts`, `mulk/isletme.ts`) 7553b55'ten beri değişmedi (doğrulandı: git diff). Kod yok, test koşulmadı.
