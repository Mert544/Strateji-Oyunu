# Birleşik Mal ve Yapı Kimlik Listesi v1 (G-K1)

> **Durum.** 1 Ekim 2026, Ar-Ge son turu (dalga 4 sonrası). Bu liste sentez-2 **G-K1** kararının uygulama girdisidir. G2'nin P3 işi (mal kimlik kilidi) buna dayanır. Bu belge yeni karar vermez. Kaynaklar:
> - baş lider kararları: docs/12 §10, §13 (Y-35…Y-37);
> - onaylı raporlar: [dikey-zincirler-ve-perakende](dikey-zincirler-ve-perakende.md) §9.2, [uretim-agi-genisletme](uretim-agi-genisletme.md) §3.2 ve §7.5, [perakende-kademeleri](perakende-kademeleri.md) §5, [askeri-katman-v1](askeri-katman-v1.md) §2.4;
> - kod ve veri: `packages/veri/icerik/icerik.json`, `parametreler.json` (`mulk.yapiYuva`, `mulk.ekYapilar`), `il-imza.json` (9f79e18).
>
> Kod ve veri değiştirilmedi.

## 0. Kilit kuralları

1. **Yalnız sona ekleme.** `mallar[]`, `yontemler[]`, `tesisTurleri[]`, `mulk.ekYapilar` ve dükkân türü dizilerinde mevcut elemanın sırası değişmez ve eleman silinmez (dikey §9.4, G8).
2. **Kimlik biçimi:** ASCII Türkçe, küçük harf, alt çizgi. Yayımlandıktan sonra kalıcıdır; görünen ad değişebilir, kimlik değişmez.
3. **Ad alanları ayrıktır.** Mal kimlikleri ile dükkân türü kimlikleri kesişmez (perakende karar 12). Örnek: `mobilya` mal, `mobilyaci` tür; `sarkuteri` yalnız tür kimliğidir.
4. **Birleşik mallar bölünmez:** `et`, `sut`, `yun`, `iplik` ve `gida` (üretim K-2).
5. **Aşamalar:** A0 = Alfa-0 veri imzasında; A0-ops = Alfa-0 isteğe bağlı; A1 = Alfa-1; S = sonra; ileride = il imzası ya da katalog planı (Tier 2/3).
6. **Sıra önerisi:** yeni kimlikler içerik dizisine aşağıdaki tablo sırasıyla eklenir: önce A0, sonra A0-ops, A1, S. Bir kimlik listeye girmeden içerik dizisine giremez (sentez-2 Ö4-1).

---

## 1. Mallar

### 1.1 Mevcut 14 mal (kodda; A0)

| # | Kimlik | Taban ₺ | Not |
|---:|---|---:|---|
| 1 | `tahil` | 30 | |
| 2 | `gida` | 70 | birleşik mal |
| 3 | `cevher` | 35 | |
| 4 | `komur` | 30 | |
| 5 | `celik` | 120 | |
| 6 | `bakir` | 50 | |
| 7 | `silis` | 25 | |
| 8 | `parca` | 180 | |
| 9 | `elektronik` | 400 | perakende çıkışı yok (sentez-2 Ö4-15) |
| 10 | `petrol` | 60 | |
| 11 | `yakit` | 100 | |
| 12 | `muhimmat` | 150 | dükkânda satılmaz |
| 13 | `gubre` | 140 | yalnız B2B ve NPC pazar |
| 14 | `elektrik` | 10 | depolanamaz |

### 1.2 Alfa-0 yeni mallar (10; toplam 24 mal, Y-37)

| # | Kimlik | Ad | Taban ₺ | Kaynak | `il-imza` `ileride` |
|---:|---|---|---:|---|:-:|
| 15 | `un` | Un | 50 | dikey §9.2 | var |
| 16 | `ekmek` | Ekmek | 60 | dikey §9.2 | var |
| 17 | `cam` | Cam | 95 | dikey §9.2 | var |
| 18 | `pencere` | Pencere | 360 | dikey §9.2 | var |
| 19 | `sut` | Süt | 40 | dikey §9.2 (birleşik mal) | var |
| 20 | `sut_urunu` | Süt Ürünleri | 120 | dikey §9.2 | var |
| 21 | `findik` | Fındık (kabuklu) | 85 | dikey §9.2 | var |
| 22 | `findik_urunu` | Fındık İçi | **240** | dikey §9.2 (katalogdaki 190'ın düzeltmesi; docs/12 §10) | var |
| 23 | `sekerleme` | Şekerleme | 180 | dikey §9.2 | var |
| 24 | `kepek` | Kepek (yan ürün) | 18 | üretim §3.2; docs/12 §13 Y-37 | **yok, eklenmeli** |

### 1.3 Alfa-0 isteğe bağlı (A0-ops; 4)

| Kimlik | Ad | Taban ₺ | Kaynak | `ileride` |
|---|---|---:|---|:-:|
| `cimento` | Çimento | 45 | dikey §9.2 | var |
| `boksit` | Boksit | 40 | dikey §9.2 | var |
| `alumina` | Alümina | 125 | dikey §9.2 | var |
| `aluminyum` | Alüminyum | 350 | dikey §9.2 | var |

### 1.4 Alfa-1 ve sonrası: dikey raporunun kimlikleri (4)

| Kimlik | Ad | Taban ₺ | Aşama | Kaynak | `ileride` |
|---|---|---:|---|---|:-:|
| `pamuk` | Pamuk | 70 | A1 | dikey §9.2 | var |
| `iplik` | İplik (birleşik) | 130 | A1 | dikey §9.2 | var |
| `kumas` | Kumaş | 200 | A1 | dikey §9.2 (`tekstil` yerine) | var |
| `hazir_giyim` | Hazır Giyim | 340 | A1 | dikey §9.2 (`tekstil` yerine) | var |

### 1.5 Üretim ağının kimlikleri (21 yeni + 3 planlı; `kepek` §1.2'de)

| Kimlik | Ad | Taban ₺ | Aşama | Aile | `ileride` |
|---|---|---:|---|---|:-:|
| `misir` | Mısır | 28 | A1 | tahıl | var (planlı) |
| `arpa` | Arpa | 32 | A1 | tahıl | **yok** |
| `yem` | Hayvan Yemi | 45 | A1 | hayvancılık | **yok** |
| `makarna` | Makarna | 95 | A1 | tahıl | **yok** |
| `kasaplik` | Kasaplık Hayvan (tek canlı hayvan malı) | 70 | A1 | hayvancılık | **yok** |
| `et` | Et (birleşik: kırmızı + beyaz) | 110 | A1 | hayvancılık | var (planlı) |
| `yumurta` | Yumurta | 50 | A1 | hayvancılık | **yok** |
| `yun` | Yün ve Tiftik (birleşik) | 60 | A1 | tekstil-deri | var (planlı) |
| `deri` | Ham Deri (yan ürün) | 60 | A1 | tekstil-deri | **yok** |
| `islenmis_deri` | İşlenmiş Deri | 135 | A1 | tekstil-deri | **yok** |
| `ayakkabi` | Ayakkabı | 300 | A1 | tekstil-deri | **yok** |
| `kirectasi` | Kireçtaşı | 20 | A1 | yapı-maden | **yok** |
| `kablo` | Kablo | 120 | A1 | yapı-maden | **yok** |
| `insaat_demiri` | İnşaat Demiri | 165 | A1 | yapı-maden | **yok** |
| `profil` | Çelik Profil | 190 | A1 | yapı-maden | **yok** |
| `biskuvi` | Bisküvi | 100 | S | tahıl | **yok** |
| `nisasta` | Nişasta | 60 | S | tahıl | **yok** |
| `malt` | Malt | 70 | S | tahıl | **yok** |
| `icecek` | Alkolsüz İçecek | 70 | S | tahıl | **yok** |
| `canta` | Çanta | 340 | S | tekstil-deri | **yok** |
| `mont` | Deri Mont | 520 | S | tekstil-deri | **yok** |
| `makine_halisi` | Makine Halısı (`hali` el halısından ayrı) | 250 | S | tekstil-deri | **yok** |
| `et_urunu` | Et Ürünleri (`sarkuteri` mal kimliği yerine) | 190 | S | hayvancılık | **yok** |

**Sayım ve tutarlılık.**
- Bu tablodaki 23 kimlik + `kepek` = üretim raporunun 24 malı.
- Bunlardan 21'i yeni (`kepek` dahil), 3'ü planlı (`misir`, `et`, `yun`).
- `il-imza.json` `ileride` listesinde (75 kimlik) yeni 21 kimliğin hiçbiri yok. Bunlar bu liste üzerinden eklenmeli; `ileride`ye eklenip eklenmeyeceği G2'nin P3 kararıdır.
- Çakışma denetimi:
  - `hali` (el halısı, Tier 3a) ile `makine_halisi`, `yassi_celik` ile `profil`/`insaat_demiri`, `ipek_kumas` ile `kumas` ayrı mallardır; ad karışmasın diye görünen adlar ayrıştırılmıştır.
  - Kod ve veri dosyalarında çakışan kimlik yok.

### 1.6 `il-imza.json` `ileride` listesinin geri kalanı (il imzası ve katalog; "ileride")

Yukarıda geçmeyen 55 kimlik, `il-imza.json` (9f79e18) içindeki sırasıyla aşağıdadır. Fiyatları cesitlilik-uretim §7 ve il imza kayıtlarındadır. Bu listeye **yalnız ekleme** yapılır.

`arac, kagit, kereste, mobilya, odun, petrokimya, taze, antep_fistigi, aycicegi, baharat, bakliyat, bal, balik, beyaz_esya, bor, cay, ceviz, elma, gemi, gul, hashas, incir, ipek, kayisi, kestane, kiraz, kivi, koza, kuru_meyve, mermer, muz, narenciye, patates, pirinc, sarimsak, seftali, seker_pancari, sera_sebze, seramik, tutun, tuz, uzum, yas_cay, yassi_celik, yer_fistigi, zeytin, zeytinyagi, bicak_demir, cini, dokuma_zanaat, hali, ipek_kumas, sepet_hasir, tas_isleme, telkari`

(Bu satırda 55 kimlik vardır: `ileride`nin 75 kimliğinden §1.2–§1.5'te geçen 20'si düşülmüştür; liste sayımı dosyadan yapılmıştır.)

### 1.7 Yasaklı mal kimlikleri

| Kimlik | Neden | Yerine |
|---|---|---|
| `tekstil` | Tek mal olarak tekstil, iplik → kumaş → giyim zincirini ve dükkân rafını bozar (dikey karar 4; docs/12 §10) | `kumas` + `hazir_giyim` |
| `sarkuteri` (mal olarak) | Dükkân türü kimliğiyle çakışır (tür ∩ mal = ∅; perakende karar 12); docs/12 §10'da yasak | `et_urunu` (mal); `sarkuteri` yalnız dükkân türü |

Derleme doğrulayıcısı bu iki kimliği `mallar[]` içinde reddetmelidir (öneri).

---

## 2. Yapılar

### 2.1 Mevcut tesis türleri (kod; `icerik.json` 18, mülk kipinde 17)

`ciftlik` (2), `gida_fabrikasi` (2), `cevher_madeni` (2), `komur_ocagi` (2), `bakir_madeni` (2), `silis_ocagi` (2), `petrol_kuyusu` (1), `celikhane` (3), `parca_fabrikasi` (2), `elektronik_fabrikasi` (2), `rafineri` (mülk kipinde yapılamaz; `yapiYuva`'da yok), `muhimmat_fabrikasi` (2), `ahir` (2), `mera` (3), `gubre_fabrikasi` (2), `santral` (3), `hidro_santrali` (3), `sulama_kanali` (1).

Parantez içi sayılar `mulk.yapiYuva`, yani S ölçek ayak izidir. M ve L için `olcekHucre = [yuva, yuva+1, yuva+2]` uygulanır (docs/12 §13, Y-34).

### 2.2 Mevcut ek yapılar (`mulk.ekYapilar`)

| Kimlik | Yuva | Not |
|---|---:|---|
| `ambar` | 1 | |
| `ticaret_ofisi` | 1 | Alfa-0'da `ilk_dukkan` yedek yolu (sentez-1 Ç5) |
| `muhtarlik` | 1 | **Kamu yapısı;** mülk kipinde oyuncuya kapalı (docs/12 §10, S9). Kimlik korunur |
| `konut` | 1 | yer tutucu |
| `garaj` | 1 | yer tutucu |
| `atolye_lab` | 1 | yer tutucu |

### 2.3 Yeni yapılar

| Kimlik | Tür | Yuva (S) / ölçek ayak izi | Aşama | Taban maliyet | Kaynak |
|---|---|---|---|---|---|
| `dukkan` | ek yapı (tür = veri) | 1 / [1, 2, 3] (süpermarket istisnası `[1, 2, 2]` alternatif) | A0 (yalnız S türleri) | ₺6.000 + 20 çelik + 8 parça + 4 pencere ≈ ₺11.440 | dikey §5.10; perakende §3.2; docs/12 §10 G11 |
| `ordugah` | ek yapı | 3 | A0, bayraklı (`askeri.eskiya.etkin`; Y-35) | ₺20.000 + 80 çelik + 30 parça ≈ ₺35.000; ilde ≤2 | askeri §2.4 |
| `karakol` | ek yapı | 1 | A0, bayraklı | ₺4.000 + 20 çelik + 8 parça ≈ ₺7.840; ilde ≤2 | askeri §2.4 |
| `gozetleme_kulesi` | ek yapı | 1 | A0, bayraklı | ₺2.000 + 10 çelik + 5 parça ≈ ₺4.100; ilde ≤1 | askeri §2.4 |
| `hafif_sanayi` | tesis türü (20. yapı) | 2 / [2, 3, 4] | A1 | ₺12.000 + 70 çelik + 25 parça (S) | üretim §7.4–7.5 (K-6); dikey §9.3 |

**Kamu hücresi ve kural kimlikleri (oyuncuya kapalı, yapı değil):**
- **Nöbet Evi:** ilçe merkezindeki `hizmet` kamu hücresi. Askeri raporda bir kimlik verilmedi; **öneri `nobet_evi`**, karar G2'de.
- **İl savunma düzeni:** kural ve görünümdür, kimlik gerektirmez.

**Sayım notu:** `dukkan` 19., `hafif_sanayi` 20. yapı olur. `ordugah`, `karakol` ve `gozetleme_kulesi` "18 yapı + ek yapılar" sayımına ek yapı olarak girer (oyun tasarım belgesi T-10). Sur/Barikat sonraya kaldı ve kimliği yok.

### 2.4 Dükkân türü kimlikleri (`mulk.perakende.dukkanTurleri[]`; tür = veri)

| Kimlik | Kademe / aile | Aşama |
|---|---|---|
| `tezgah` | Açılış Tezgâhı (K0) | A0 (karar: P1 ya da A1) |
| `bakkal` | S, genel gıda | A0 |
| `firin` | S, üretici-dükkân | A0 |
| `sarkuteri` | S, üretici/çeşit | A0 |
| `sekerci` | S, üretici-dükkân | A0 |
| `yapi_market` | S, çeşit-dükkân | A0 |
| `market` | M, genel gıda | A1 |
| `supermarket` | L, genel gıda | A1 |
| `giyim` | üretici/çeşit | A1 |
| `kasap` | mal bağımlı (`et`) | A1 |
| `manav` | mal bağımlı (`taze`) | A1 |
| `toptan` | toptan deposu | A1 sonu |
| `mobilyaci` | mal bağımlı (`mobilya`) | S |

Kesişme denetimi: bu 13 kimliğin hiçbiri §1'deki mal kimlikleriyle aynı değil (`sarkuteri` mal kimliği yasak, §1.7).

---

## 3. Açık noktalar (G2'nin P3'ü için)

1. Yeni 21 mal kimliği `il-imza.json` `ileride` listesine de eklenecek mi, yoksa yalnız `icerik.json`'a mı girecek? Öneri: yalnız `icerik.json` (aşamasıyla); `ileride` il imza planı olarak kalır.
2. `nobet_evi` kimliği ve kamu hizmet hücresinin şeması: kamu arsası çekirdek işiyle birlikte (Y-38).
3. Teknoloji kimlikleri (örn. dikeydeki `elektroliz`) bu listenin kapsamı dışında; ayrı teknoloji kimlik listesi gerekir (oyun tasarım belgesi AÖ-17).
4. Yöntem kimlikleri (dikeyde 19, üretimde 32 yöntem) bu listenin dışında. Hangi tesiste doğdukları sentez-2 G-K2'ye bağlıdır.
