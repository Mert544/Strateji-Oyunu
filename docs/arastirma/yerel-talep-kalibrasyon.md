# Yerel talep kalibrasyonu: gerçek ilçe nüfusu (A2, G7 şartname S-6)

> **Durum.** 1 Ekim 2026. Öneridir; karar baş liderindir. Nüfus: T3 kaynak taraması (`SP/t3/g7-kaynak-taramasi.md`, `SP/t3/ilce-nufus.tsv`): TÜİK ADNKS 2025 (31.12.2025; bülten 9.2.2026), ikincil derleme, **birincil teyit yok (doğrulanmadı)**; ilçe toplamları il toplamlarıyla birebir eşit (dolaylı kanıt). Bu belge sayıları kopyalamaz, betik dosyayı argüman olarak okur. Hesaplar `docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs` (çıktı: `yerel-talep-kalibrasyon-hesap-cikti.md`), model `p4-p5-ekonomi-hesap.mjs` §5 ile aynı (fırın dükkânı, ekmek rafı, 1,05 R, kasa 90 birim/sa). Çekirdek koşulmadı.

## 1. Özet (önce bu)

1. **Asıl bulgu, nüfus verisinden önce sınıf kuralı.** A3 §6.5 ilçe sınıfını "uygun hücrelerin baskın sınıfı" olarak tanımlıyor. Üç ızgaralı Alfa-0 ilçesinde (z20 manifesti, `arsaSinifi` geçici eşlemesi) kırsal hücre payı **%93–97**: Gemlik 97, Gebze 93, Körfez 93. Üçü de **kırsal** çıkar; sınıf eşdeğeri 10.000 iken ADNKS 2025 nüfusları Gemlik 124.400, Körfez 183.077, Gebze 414.960 (eşdeğer/gerçek 0,02–0,08). T3'ün nüfus bandı kuralı (20 bin / 69 bin) üçünü de şehir yapar. Bu kuralla dünya `yerelNpc` ≈ 10 M ₺/hafta (ZP8 %8–9) ve ilçelerin 0–13'ünde dükkân kârlı; A2 §1.10 beklentisi 92,9 M ₺ (%45) idi.
2. **Karar (baş lider, 241f1b9 üzerine): (b) ilçe başına gerçek nüfus, `yerelOlcek` 40.** T3 nüfus verisiyle yeniden hesaplandı: ZP8 %44 (U) / %52 (N), geri ödeme medyanı 37 / 22 sa, dünya `yerelNpc` 87 / 123 M ₺/hafta, kârlı ilçe 36 / 42. Daha küçük değişiklik isteyen yedek yol (c0): sınıf nüfus bandından (20 bin / 69.282), A3 sabitleri ve `yerelOlcek` 50 (ZP8 %43–44, geri ödeme 23–30 sa, hata 1,6×). (a) tek başına yetmez.
3. **Geri dönüşü zor:** ilçe başına nüfus (ya da sınıf) alanının şemaya girmesi (fikstür/göç). İsteğe bağlı alan olarak girerse geriye uyumlu; sabitler, eşikler ve `yerelOlcek` kolay geri dönüşlüdür.

## 2. Nüfus dağılımı (45 ilçe, ADNKS 2025; Kocaeli 12, Sakarya 16, Bursa 17)

| Nüfus bandı | İlçe | Toplam nüfus | Pay |
|---|---|---|---|
| < 10 bin | 3 | 22.301 | %0 |
| 10–30 bin | 6 | 109.330 | %2 |
| 30–60 bin | 10 | 492.575 | %8 |
| 60–100 bin | 7 | 607.901 | %9 |
| 100–200 bin | 11 | 1.575.153 | %24 |
| 200–400 bin | 4 | 1.206.896 | %18 |
| ≥ 400 bin | 4 | 2.533.719 | %39 |

Toplam 6.547.875; medyan ilçe 86.543; en büyük/en küçük 886.111 (Osmangazi) / 6.089 (146×); ilk 6 ilçe toplamın %49'u. Sınıf sabitleri (10 / 40 / 120 bin) medyana yakındır ama kuyruğu (400–890 bin) ve alt ucu (6–10 bin) kapsamaz. T3 sınıf medyanları: kırsal 10.939, kasaba 49.606, şehir 151.134.

## 3. Dükkân neti nüfusa göre doğrusal değil

| Nüfus | Satış birim/sa | Net ₺/sa | Geri ödeme (sa) |
|---|---|---|---|
| 5 bin | 8,4 | −52 | hiç |
| 10 bin | 16,8 | 29 | 312 |
| 20 bin | 33,7 | 189 | 47 |
| 40 bin | 67,4 | 511 | 18 |
| ≥ 60 bin | 90 (kasa dolu) | 727 | 12 |

Q nüfusa doğrusal; net 7–60 bin arasında artar, **60 binden sonra sabittir** (kasa 90/sa). Nüfus hatası yalnız küçük ve orta ilçelerde (< 60 bin; 45 ilçenin 19'u, nüfusun %10'u) dükkân ekonomisini değiştirir. Büyük ilçelerde (Gebze, Osmangazi) talep fazlası dükkân sayısını (k) artırır: rakip sayısı, fiyat ve çeşitlilik rekabeti.

## 4. Seçenekler (45 ilçe, 200 oyuncu, her biri 1 fırın dükkânı)

Yerleşim **U**: eşit (4–5/ilçe); **N**: nüfusla orantılı (en az 1). ZP8 = yerelNpc / (yerelNpc + ihracatNpc 112,3 M). Hedefler: ZP8 ≤ %50 (alarm), geri ödeme medyanı ≤ 48 sa (A0-12).

| Seçenek | yerelOlcek | yerelNpc M ₺/hafta (U / N) | ZP8 (U / N) | Kârlı ilçe (U / N) | Medyan net ₺/sa (U / N) | Medyan geri ödeme sa (U / N) |
|---|---|---|---|---|---|---|
| **A3 olduğu gibi** (baskın hücre sınıfı → kırsal 10 bin) | 50 | 10,7 / 9,9 | %9 / %8 | 0 / 13 | −78 / −60 | hiç / hiç |
| (a) sınıf sabiti kalır, yerelOlcek kalibre (toplam talep gerçeğe eşit) | ≈ 700 (×14) | 155,9 / 105,9 | %58 / %49 | 45 / 44 | 649 / 727 | 14 / 12 |
| (c0) sınıf nüfus bandından (20 bin / 69 bin), A3 sabitleri 10 / 40 / 120 bin (yedek) | 50 | 87,4 / 83,4 | %44 / %43 | 38 / 43 | 383 / 297 | 23 / 30 |
| (b) ilçe başına gerçek nüfus | 50 | 99,4 / 153,7 | %47 / %58 | 38 / 43 | 332 / 530 | 27 / 17 |
| **(b), baş lider kararı** | **40** | 86,5 / 123,0 | %44 / %52 | 36 / 42 | 240 / 398 | 37 / 22 |
| (b) | 35 | 79,3 / 107,6 | %41 / %49 | 35 / 41 | 193 / 332 | 46 / 27 |
| (c) karma: sınıf nüfus bandından (30 / 150 bin), eşdeğer 13 / 73 / 299 bin | 50 | 97,1 / 120,6 | %46 / %52 | 36 / 45 | 260 / 390 | 34 / 23 |

- **A3 olduğu gibi:** talep nüfusa değil ilçe sayısına bağlanır; Gebze ile Harmancık aynıdır. Dükkân hiçbir ilçede kârlı değildir (U); P7 dükkân akışı ve A0-12 ölçütü tutmaz.
- **(a):** toplam talebi gerçeğe eşitler ama ilçeleri eşitler (küçük ilçe zengin, büyük fakir). ZP8 sınırı aşılır (%58). Tek başına yeterli değil.
- **(c0), yedek yol:** A3'ün sabitleri ve `yerelOlcek` 50 aynen kalır; yalnız ilçe sınıfının kaynağı değişir (baskın hücre sınıfı → nüfus bandı). Her iki hedef (ZP8 ≤ %50, geri ödeme ≤ 48 sa) iki yerleşimde de tutar; hata 1,6×.
- **(b):** hata 1,0× (ortalama mutlak log hatası), tam nüfus kullanımı. `yerelOlcek` 50'de ZP8 N yerleşiminde %58'e çıkar; 35'te %41–49 ve geri ödeme 27–46 sa (hedefler tutar). Gerçeğe en yakın ama `yerelOlcek` değişir; (c0)'ın üstüne sonradan eklenebilir.
- **(c):** hata 1,5× (A3 olduğu gibi 8,1×); sabitleri 13 / 73 / 299 bine çeker. (c0)'a göre kazanç küçük, ama sabitler (A3 §6.5, T3 verisi) değişir; önerilmez.

## 5. Etkiler

| Konu | A3 olduğu gibi | (b), 40 |
|---|---|---|
| Dükkân geri ödemesi (medyan) | hiç (net < 0) | 22–37 sa (A0-12 ≤ 48 sa tutar) |
| `yerelNpc` musluğu | ≈ 10 M ₺/hafta | 87–123 M ₺/hafta |
| ZP8 | %8–9 | %44–52 (N yerleşimi sınırda; izlenir) |
| Arsa fiyat beklentisi | Hücre fiyatı sınıf tabanından gelir (1.000 / 2.500 / 6.500 ₺), talepten bağımsız. Dolaylı: doyma neti 727 ₺/sa ile şehir hücresi ≈ 9 sa, ticari hücre (×1,45) ≈ 13 sa'te çıkar; nüfus ≥ 30 bin ilçelerde arsa fiyatı dükkân kararını bağlamaz. A3 olduğu gibi: hiçbir ilçede dükkân kârlı değil, ticari hücre talebi doğmaz | Nüfusu ≥ 30 bin olan 36 ilçede dükkân kurulur; nüfusu < 10 bin olan 3 ilçede kurulmaz (net ≈ 0) |

## 6. Kaynak (T3 taraması; doğrulanmadı)

- **TÜİK ADNKS 2025** (referans 31.12.2025; bülten 9.2.2026), 45 ilçe, `hiyerarsi.json` kimlikleriyle 45/45 eşleşir. İlçe sayıları **ikincil derlemeden** (nufusune.com, nufusu.com); TÜİK portalı okunamadı, birincil teyit yok. Dolaylı kanıt: ilçe toplamları il toplamlarıyla birebir eşit (Kocaeli 2.161.171, Sakarya 1.123.693, Bursa 3.263.011).
- **Lisans:** TÜİK Yasal Uyarı: kaynak gösterilerek izin gerekmeksizin yeniden kullanım; ticari yasak yok; hukuk teyidi yapılmadı. Önerilen atıf: "TÜİK, ADNKS Sonuçları, 2025 (9 Şubat 2026)". İlçe toplamları mikro veri değildir.
- Alternatif (WorldPop/GHS-POP, CC BY 4.0) gerekmedi; çapraz kontrol için kalır. Birincil tabloyu portal indirmesiyle bir kez teyit etmek T3/O3 işidir.
- Bu belge ve betik sayıları kopyalamaz: `SP/t3/ilce-nufus.tsv` yolu betiğe argümandır. Veri yazımı T3'te, karardan sonra.

## 7. Geri dönüşü zor kararlar ve açık sorular

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| Z-1 | İlçe başına `nufus` (ya da talep sınıfı) alanının fikstür şemasına girmesi | Fikstür/göç, çekirdek derleme ve canlı durum (seviye, esnaf yoğunluğu) ona bağlanır | İsteğe bağlı alan (yoksa sınıf sabiti yedek); geriye uyum testi |
| Z-2 | Talep sınıfı kuralı (baskın hücre sınıfı ↔ nüfus) | `ilceSinifi` derlemede bir kez hesaplanır; Q kimliği (GZ-4) ona dayanır | Baskın hücre sınıfı talep için kullanılmaz (üç ölçülü ilçede de kırsal) |

1. **(Baş lider)** Para dengesi bandı (§7): kâğıt modelde yeniden yatırım olmadan R = 0,24–0,26 (bandın altı); banda ancak `yerelOlcek` ≤ 10 ile girer ve dükkân ekonomisi çöker. Yeniden yatırım payı r ≥ %10 ise 40 bantta. Öneri: 40'ta kal, gerçek koşuyla ölç (§8); r ölçülmeden `yerelOlcek` 10'a inilmesin. **Onaylandı (baş lider): `yerelOlcek` 40'ta kalır.**
2. **(O3/K3)** Kalan 42 ilçenin hücre sınıf dağılımı ölçülsün (üç ilçede 3/3 kırsal; kent merkezleri doğrulanmadı).
3. **(T3/O3)** Birincil TÜİK tablosuyla bir kez teyit; lisans için hukuk teyidi.
4. **(A3)** Şartname §6.5 ve S-6'daki "nüfus verisi yok" ve "sınıf baskın hücre sınıfı" satırları karar sonrası güncellenmeli (`yerelOlcek` 50 kalır).

## 7. Para dengesi: 30 günlük kâğıt model (200 oyuncu; %75 ekmek, %25 ekmek + cam → pencere)

Bant (docs/06 §10.5, :253): lavabo / (vergi + ihracat − ithalat) = **0,3–0,6**; altı enflasyondur. Mülk kipinde vergi = 0; ihracat = `ihracatNpc` + `yerelNpc`; ithalat = `ithalatNpc`; lavabo = `isletme` + `sebeke` + `araziVergisi` + `harcama` + `arsa`. G7 çekirdekte yok, bu yüzden kararlı hâl akışlı kâğıt model (betik §7); NPC dilimi kişi başı (ekmek 62,5, pencere 25 birim/sa), fiyat dinamiği ve doyum yok.

| yerelOlcek | Yerleşim | ihracat + yerel M ₺ (30 g) | ithalat M ₺ | lavabo M ₺ | **R** | (lavabo + ithalat) / musluk |
|---|---|---|---|---|---|---|
| 10 | U / N | 896 / 896 | 227 | 203 | 0,30 / 0,30 | 0,47 |
| 20 | U / N | 997 / 1.032 | 227 | 218 / 223 | 0,28 / 0,28 | 0,44 / 0,43 |
| 35 | U / N | 1.111 / 1.236 | 227 | 235 / 254 | 0,27 / 0,25 | 0,41 / 0,39 |
| **40** | U / N | 1.143 / 1.304 | 227 | 240 / 264 | **0,26 / 0,24** | 0,40 / 0,37 |
| 50 | U / N | 1.200 / 1.440 | 227 | 248 / 284 | 0,25 / 0,23 | 0,39 / 0,35 |

- **R bandın altında (0,23–0,26)** `yerelOlcek` 40'ta; her ölçekte 0,23–0,30. Sebep: lavabolar yalnız işletme (60 ₺/sa/tesis, dükkân 132), şebeke ve ilk yatırımdır; oyuncunun yeniden yatırımı modelde yoktur.
- **Hazine eğrisi** (tek oyuncu, yerelOlcek 40): ekmek zinciri gün 1: 141.894 ₺, gün 3: 376.000, gün 8: 961.266, gün 30: **3,54 M ₺** (günlük net 117.053 ₺); ekmek + pencere gün 30: 4,50 M ₺. Hibenin 50.000 ₺'sinin gün 1'de 3 katına çıkması ve 30 günde ~70 katı birikimi **para yutmazsa enflasyon** demektir (S1 tek oyunculu 272 bin ₺/gün değil, NPC dilimiyle 117 bin ₺/gün).
- **Banda çekmek:** r = 0 ile R ≥ 0,3 için `yerelOlcek` ≤ 10 gerekir (dükkân neti ≈ 30 ₺/sa; A0-12 geri ödeme > 300 sa çöker). Yeniden yatırım payı r (net kârın yapı/ölçek/hücreye giden kısmı) arttıkça R bantta kalır: r = %10 → 0,33 / 0,32; %25 → 0,44 / 0,43; %50 → 0,62 / 0,61 (`yerelOlcek` 40). Yani **belirsizlik `yerelOlcek`ten değil r'den gelir**. `yerelOlcek` 40'ta r ≥ %10 yeterlidir.
- **Öneri:** `yerelOlcek` 40'ta kal; gerçek koşuyla r ve R ölçülsün (§8). Banda çekme kuralı birebir uygulanırsa değer 10 olur ve dükkân ekonomisi A0-12'yi bozar: bu çatışma baş liderin bilgisine sunulur, `yerelOlcek`i 10'a indirmeyi önermiyorum. Gerçek koşuda R < 0,3 ve r < %10 çıkarsa ilk kaldıraç lavabo (M/L bedeli, hücre/arsa fiyatı, şebeke payı), son kaldıraç `yerelOlcek`.

## 8. O2 koşu listesi (G7 kapıdan geçince; tek seferlik ölçüm)

| # | Koşu | Ölçülecek | Beklenen |
|---|---|---|---|
| P1 | Mülk kipi, 30 sim-günü, tohum 1–3, `yerelOlcek` 40, (b) ilçe nüfusu, 200 bot (%75 ekmek, %25 ekmek + cam → pencere), ağır koşu | `Dunya.mulk.para` kalemleri (`ihracatNpc`, `yerelNpc`, `ithalatNpc`, `isletme`, `sebeke`, `harcama`, `arsa`, `araziVergisi`, `hibe`, `odul`) günlük; korunum eşitliği; **R** ve (lavabo + ithalat) / musluk | R 0,23–0,33 (r'ye bağlı); korunum fark 0 |
| P2 | Aynı koşuda yeniden yatırım payı **r** = (`harcama` + `arsa`) / net kâr, gün 7–30 | r'nin bot dağılımı | r ≥ %10 ise R bantta |
| P3 | Hazine eğrisi: oyuncu başı medyan (p10–p90) gün 1, 3, 7, 14, 30 | Birikim (model: 3,5 M ₺ / 30 gün) | Gerçek < model (doyum, fiyat çöküşü) |
| P4 | Pazar doyumu: ekmek NPC fiyat/taban ve satış/emilim | Arz/emilim 2,26; fiyat çöküşü | Fiyat ×0,25'e doğru düşerse R ve ihracat düşer |
| P5 | Dükkân: geri ödeme medyanı, ZP3, ZP8 | A0-12 (≤ 48 sa), ZP8 ≤ %50 | 22–37 sa, %44–52 |
| P6 | `yerelOlcek` {20, 40, 50} yalnız P1'in bir tohumunda | R ve ZP8 duyarlılığı | 4b tablosuyla uyumlu |

### 8.1 r (yeniden yatırım payı) nasıl ölçülür (O2, P1/P2)

**Tanım.** r = Σ yatırım / Σ net kâr; oyuncu başına gün 7–30 penceresinde, sonra oyuncu medyanı (p10–p90) ve dünya toplamı. **Yatırım (pay):** oyuncunun sermaye komutlarıyla ödediği para: arsa (`parsel_al` ve `yapi_yerlestir`'in arsa kısmı; defterde `lavabo.arsa`, `mulk/komut.ts:216` `alimUygula` → `hazineEkle(…, "arsa")`), yapı bedeli (`yapi_yerlestir`; `mulk/komut.ts:469` `yapiUygula` → `maliyetiDus` → `hazineEkle(-para)`, kalem varsayılanı `harcama`, `ekonomi/maliyet.ts:22`, `paraSayac.ts:89`), **M/L ölçek yükseltme** (`tesis_olcek_yukselt`, `sanayi/komut.ts:57`; bedeli aynı `maliyetiDus`, `harcama`) ve kenar geliştirme (`kenar_gelistir`, `lojistik/cozum.ts:328,343`, `harcama`). **Yatırım sayılmaz:** `genel_onarim` (`sanayi/komut.ts:113`) ve `arama_sondaji` (`:146`) da `lavabo.harcama`ya yazar ama bakım/keşiftir; `arastirma` (teknoloji) ayrı kalemdir. Bu yüzden `lavabo.harcama` tek başına yatırım değildir; komut başına ölçülmelidir. **Payda (net kâr):** Δ(`musluk.ihracatNpc` + `musluk.yerelNpc`) − Δ(`lavabo.ithalatNpc` + `isletme` + `sebeke` + `araziVergisi`) (oyuncu başına saatlik `paraAkisi`; O2 bakım ölçümündeki yöntem). Hibe ve ödül paydaya girmez.

**Bot kararı nereden okunur.** Bot komutları `botlar/src/parsel-kosucu.ts:189` (`o.bot.karar(sim)`); sermaye komutları için koşucu zaten komut başına kayıt tutar: `SERMAYE_KOMUTLARI` (`:102`: `parsel_al`, `yapi_yerlestir`, `tesis_insa_hucre`), hazine farkı `tutar = önce − sonra` ve `yapiPara`, `yapiMalDegeri` (`:190, :199–212`, `ParselSermayeKaydi`). `tesis_olcek_yukselt` ve `kenar_gelistir` bu kümede yoktur: O2 `komutIzle` kancasıyla (`:46, :191`; bakım ölçümündeki `parsel-bakim.ts:340` gibi, komut öncesi/sonrası hazine farkı) ekler. Bot kararlarının kaynağı `botlar/src/parsel.ts`: arsa `:937` (`parsel_al`), yapı `:992` (`yapi_yerlestir`); bugün `tesis_olcek_yukselt` komutu botlarda yoktur (G6 bot önayarında eklenmedikçe M/L katkısı 0'dır ve r yalnız arsa + yapıdan gelir). Malzeme bedeli (çelik/parça) para değil stoktur; bot onu `ticaret_emri` ithalatıyla alır (`lavabo.ithalatNpc`): `r_para` = yukarıdaki tanım, `r_tam` = (yatırım para + `yapiMalDegeri`) / net kâr olarak ikisi birden raporlanır.

**Karar sırası ve sınır (baş lider).** R < 0,3 **ve** r < %10 çıkarsa: önce lavabo kalemleri ayarlanır (M/L bedeli, hücre/arsa fiyatı, şebeke payı, işletme gideri); `yerelOlcek` **en son** kaldıraçtır. A0-12 korunur: dükkân geri ödeme medyanı hedefi ≤ 48 sa'tir ve `yerelOlcek` hiçbir hâlde medyanı 300 sa'in üstüne çıkaracak kadar indirilmez. R ≥ 0,3 ise ya da r ≥ %10 ise `yerelOlcek` 40 aynen kalır.

## Ek A. Betik

`node docs/arastirma/yerel-talep-kalibrasyon-hesap.mjs <ilce-nufus.tsv> > docs/arastirma/yerel-talep-kalibrasyon-hesap-cikti.md` (Node 22, bağımlılık yok; `icerik.json` ve T3'ün TSV dosyasını okur; iki koşu `cmp` ile aynı; `eslint` temiz). Hücre sınıf sayımları (Gemlik, Gebze, Körfez) betikte sabittir; üretimi: manifest (`izgara/manifest.json`) ilçe başına `ilceIzgarasiOku`, içerideki ve su/askeri/yol olmayan hücrelerde istemci `arsaSinifi(durum)` sayımı (entegrasyon 7553b55).
