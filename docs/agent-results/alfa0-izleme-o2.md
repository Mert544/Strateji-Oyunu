# Alfa-0 ekonomi izleme (O2-1, O2-2, O2-3, günlük ekonomi örneği): O2 teslim raporu

- Dal: `takim/o2/alfa0-izleme` (taban: `takim/o2/g10-cikarma` 56ee4cb, yani üstüne yığılı; g10-cikarma girmeden girmez). Kod commit'i `7947134`, bu rapor ayrı commit.
- Kaynak: A2 `docs/arastirma/alfa0-ekonomi-izleme.md` (`takim/a2/alfa0-izleme` 7d698ec) §0, §1 [O], §8.2.

## Değişen dosyalar
- `packages/olcum/src/insan-ekonomi.ts` (yeni): `EkonomiToplayici` (saatlik gözlem + günlük örnek), `EKONOMI_ESIKLERI` (A2 ilk tahmin eşikleri, parametre tablosu), `dukkanKurulusuOku`.
- `packages/olcum/src/insan-cikarma.ts`: `ekonomi?: boolean` seçeneği, gün sınırı örneklemesi, çıktıda `ekonomi` bölümü; `SERMAYE_KOMUTLARI` dışa aktarıldı ve genişledi; `dukkan`/`dukkanKomutu`.
- `packages/olcum/src/insan-cikarma-cli.ts`: `--ekonomi`; `index.ts` dışa aktarımlar.
- `packages/olcum/test/insan-ekonomi.test.ts` (yeni, 9 test), `insan-cikarma.test.ts` (bayrak testi), `docs/olcum/insan-testi-cikarma.md` (ekonomi bölümü).
- Çekirdeğe dokunulmadı; yalnız okur.

## A2 istekleri
- O2-1: `tesis_olcek_yukselt` ve `kenar_gelistir` sermaye komutu (Y7 ve E2 yatırım tutarına girer; `genel_onarim` girmez).
- O2-2: `dukkan` = `DukkanDurumu.kurulus` (ek yapı üstünden gevşek okunur; alan çekirdekte yokken null). Yapı komutu zamanı ayrı `dukkanKomutu`. Alan adı A3 §12.4'ten ("DukkanDurumu.baslangic/kurulus", `EkYapiDurumu.dukkan` içinde); çekirdekte gelince adı doğrulanmalı.
- O2-3: bot ve insan ayrı: `insan` (eşleme dosyası) ve `diger` (dünyadaki ötekiler). Çıktıda oyuncu kimliği yok; oyuncu düzeyi ölçüler yalnız grup toplamı.
- Günlük ekonomi örneği: günde bir dünya düzeyi (para defteri sayaçları, kasa, fiyat sınırı, yöntem dağılımı) + E1, E2, E3, E4, E6, E7(b), E8, E9, E10; eşikler A2'nin ilk tahmini ve çıktıda yazılır; n < 5 oyuncu / n < 3 olay ⇒ "olculmedi".

## Ölçülemeyenler (nedenli, çıktıda not)
- E5 dükkân geri ödemesi: dükkân başına satış miktarı sayacı yok (A2 K2-8).
- E7(a) kamu kapasite karşılama: kamu sipariş hacmi dünya durumunda okunamaz.
- E10 reddedilen ödül sayacı: dünya durumunda yok (sunucu /metrik).
- `yerelNpc`, `lavabo.sebeke` kalemleri ve dükkân alanı P5 sonrası dolar (şimdi 0/null); E3 ve E4 o zamana kadar anlamlı değer vermez.

## Doğrulama
- `insan-ekonomi.test.ts` 9 ve `insan-cikarma.test.ts` 13 test geçti (kapı koşarken tek işçiyle). Beklenenler dünyadan bağımsız (fikstür koşarken ayrıca alınan sayaç/hazine/fiyat örnekleri): E1 R ve `Rkasa`, E2 r, E8 sınırdaki mallar, E10, günlük örnek zamanları (0..16 gün), determinizm, kimlik sızıntısı yok, kapalıyken ekonomi alanı yok ve diğer alanlar değişmez.
- tsc ve eslint: kapı kilidi boşalınca ayrıca koşulur (sonuç aşağıda ya da ek commit'te).

## Geri dönüşü zor kararlar
Yok (çıktı şeması `ekonomi` isteğe bağlı ve yalnız ekleme).

## Açık sorular
- E8 "48 sa kesintisiz" günlük örneklerle ×24 sa yaklaşıktır.
- E9 oyuncu yaşı gün 14 ve 45 grup medyanıdır; bakımlı/bakımsız ayrımı yok (mülk botlarında bakım varsayılan kapalı; A2 §6 uyarısı).
