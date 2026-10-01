# ad-kurali (K3): `cekirdek/src/ad.ts`

Dal: `takim/k3/ad-kurali` (taban de9959c = entegrasyon). Kaynak: `docs/arastirma/p4-p5-sartname.md` §7.7 (4d054e4), S-12 varsayılanı.

## Yapılan
- `packages/cekirdek/src/ad.ts` (saf, yeni; `@bolge/cekirdek` `index.ts`'ten dışa açık): `AD_KURALI {min: 2, max: 24, izinli, kucukHarf: true}`, `adSozdizimiHatasi(ad: unknown): string | null`, `adKanonik(ad: unknown): {tamam: true; ad} | {tamam: false; hata}`.
- Sözdizimi sırası ve ileti metinleri şartnamedeki MRK-03...MRK-08: tür, uzunluk (2-24), izinli küme, baş/son boşluk, art arda boşluk, en az bir harf. Düzeltme (kırpma) yok; büyük harf ret nedeni değil.
- Kanonik biçim: sabit Türkçe tablo (`I -> ı`, `İ -> i`, `Ç Ğ Ö Ş Ü` -> küçükleri, A-Z), uzunluk korunur, idempotent. Yerel ayara bağlı küçük harf işlevi çağrılmaz ve dosyada adı geçmez (kaynak taraması testi).
- `adSozdizimiHatasi` imzası şartnamedeki gibidir (`ad`; Kod liderinin mesajındaki `(ad, p)` parametresi gerekmedi: sabitler `AD_KURALI`'nda). `ad: unknown` alır (MRK-03 dize olmayan girdiyi karşılar).
- Ret iletileri "marka adi ..." biçimindedir (şartname §9.3 MRK tablosu); görünen ad ucu (K2) kendi iletisini bu sonuçtan eşler ya da aynen kullanır.
- Test `cekirdek/test/ad-kurali.test.ts` (15 test): MRK-03...08 tek tek, kontrol sırası, "İSTANBUL Fırını" -> "istanbul fırını", "IŞIK" -> "ışık", "ISIK" -> "ısık", A-Z tablosu, uzunluk korunumu, idempotans, 4000 deterministik sahte ad (çıktı kuralı sağlar, büyük harf yok), kaynak taraması, sabit kural.

## Doğrulama
tsc (tüm depo) ve eslint temiz; `ad-kurali` 15, `mal-kimlik-kilidi-paket` 6 test geçti. Mevcut hiçbir davranış, altın ya da durum özeti değişmedi (yeni saf modül; çekirdekte henüz çağıran yok).

## Sonraki
- G6/G7 `mulk/marka.ts` bu işlevi çağırır; `mulkDogrula` kanonik denetimi (`adKanonik(ad).ad === ad`) G7'de.
- K2: sunucu görünen ad ucu `adKanonik`'i `@bolge/cekirdek`'ten içe aktarır.
- Protokol `min/max` = `AD_KURALI.min/max` testi `marka_tanimla` şeması geldiğinde (G7) eklenir (şu an şemada marka komutu yok).
- İstemci paketine etkisi: kullanılmadıkça ağaç sallamayla düşer (dunya ölçümü marka komutuyla birlikte G7'de).
