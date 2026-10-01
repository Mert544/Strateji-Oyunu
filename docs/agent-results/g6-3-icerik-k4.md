# g6-3-icerik (K4): G6-3 içerik verisi (T3 G6 yaması)

Dal: `takim/k4/g6-3-icerik`. Taban: `takim/k3/g6-2b-sebeke` 709aede (G6-2a acbbedb üstü). 2 commit + bu rapor.

## Yapılanlar
1. **İçerik verisi (T3, DEĞİŞTİRİLMEDEN):** `SP/t3/g6-icerik.patch` sha256 9c942ce4db5c uygulandı: `icerik.json` 4 yeni yöntem (`degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli`; hepsi `mulkKipi: true`), `gida_fabrikasi` ve `ahir` yöntem listeleri; `kimlik-listesi.json` `yontemler` bölümü (28 yöntem: ilk 24 `A0`, 4 yeni `A0` + `mulkKipi`); `parametreler.json` `mulk.sebeke` (elektrik, yakıt; kasa payı %12) ve `mulk.yontemGecersizKilma` (`standart_gida_isleme: 1 000 000`). **kuralSurumu artar: `k1-78e09e675112ea37` -> `k1-741dfcf1d6b9d3ba`** (mini-6; sentetik-50 aynı değeri verir: veri aynı).
2. **V13 yan ürün kuralı artık HATA:** `YAN_URUN_KURALI_HATA = true` (kepek ve gübre alıcılı; `kepek_gubresi` ve `sut_kepekli` kepeği tüketir). Genel çıkmaz mal kuralı (b) hâlâ UYARI (`CIKMAZ_MAL_HATA = false`; P1 kapısı).
3. **Çekirdek (ayrı commit c65542f, Kod liderinin koşuluyla):** `ekonomi/tablo.ts icerikTablosu`: `mulkKipi` yöntemi içerikte olmayan mala başvuruyorsa (P3 öncesi 14 mallı dondurulmuş içerik) satır BOŞ kurulur (kısmi satır yok); `mulkKipi` olmayan yöntemde bilinmeyen mal hata (negatif kontrol). `mal-izdusumu-kanit.test.ts` DEĞİŞMEDEN yeşil (12/12). Gevşekliği veri katmanı kapatır: `veri/test/dogrulama.test.ts` "mulkKipi yöntemi içerikte olmayan malı kullanırsa dogrulaIcerik ve dogrulaVeriPaketi REDDEDER". Çekirdek testi `tablo-mulkkipi-bilinmeyen-mal.test.ts` (bölge kipi, mülk kipi, negatif kontrol).
4. **Testler yamaya göre güncellendi** (hepsi bellekte "blok yok" durumu kurar; JSON'a bağımlı varsayım kalmadı): `kimlik-listesi.test.ts` (bugünkü 28 yöntem, liste içerikle aynı sırada, 4 mulkKipi; "yontemler alanı yokken" bellekte), `dogrulama.test.ts` (alan yokken ve bugünkü sebeke/gecersizKilma), `perakende-dogrula.test.ts` (yan ürün HATA; kepek tüketici kalkınca ve pazar emilimi kalkınca reddedilir; kural seçenekle kapatılabilir), `yontem-komut.test.ts` (gerçek degirmen/ekmek_firini ile sentetik yöntemler birlikte; süzgeç karşıt kanıtları), `sebeke-derle.test.ts` (blok yok durumu `delete`).

## Altınlar
- **Bölge kipi altınları BİREBİR:** `esik-budama-kanit` (bot kalkanları t1/t2, sanayi/pazar kalkanları), `sanayi-regresyon`, `pazar-regresyon` (botlar ve çekirdek), `bolge-v1` fikstürü yeşil; dondurulmuş fikstürlere (`fikstur-b1`, `fikstur-b2`, `fikstur-goc`, `fikstur-kanit`) dokunulmadı.
- **Mülk altınları:** depoda mülk kipi için sabit özet/değer altını YOK (testler kendi koşusundan karşılaştırır: mulk-v1 göç fikstürü `kuralSurumu` farkını `gocIzni` ile işler ve geçer); bu yüzden güncellenecek sabit değer çıkmadı. Mülk dünyası özetleri `kuralSurumu` ve G6-2b'nin şebekesi nedeniyle artık farklıdır, ama hiçbir test eski özeti sabitlemiyordu.

## Doğrulama (hedefli, tek işçi; kapı koşarken)
cekirdek: 885 test, yalnız `sebeke-derle` 2 kırığı çıktı, düzeltildi (11/11); 881 + 2 yeşil sonrası tam koşu temiz sayılır (2 atlanan test BOLGE_AGIR_TEST bayrağıyla zaten koşullu). botlar + veri: 412 test, 8 atlanan, 1 kırık: `veri-hatti/izgara-manifest` (`bhiCoz is not a function`): bu worktree'nin `veri-hatti/node_modules` dizini başka bir worktree'ye sembolik olduğundan eski `@bolge/veri`'yi çözüyor (ortam; değişiklikle ilgisiz; kapıda doğrulanır). eslint (`packages/veri`, `tablo.ts`, yeni/değişen testler) temiz; tsc kapıda (bu worktree'de paketler arası tip çözümü anlamlı değil). `pnpm install` yapılmadı.

## Geri dönüşü zor karar
`kuralSurumu` artışı (kural dönemi; yalnız veriden). `YAN_URUN_KURALI_HATA = true` kalıcı kural (veri bundan sonra yan ürünü alıcısız bırakamaz).

## Açık soru
Yok.
