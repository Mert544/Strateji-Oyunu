# G6, G7, G8 bot karar kuralları: ekmek zinciri, dükkân, cam → pencere (A2)

> **Durum.** 2 Ekim 2026. Yalnız belge; kod ve veri değişmedi. O2'nin G6/G7/G8 ön ayarlarının girdisidir. Kuralların sayıları `p4-p5-ekonomi.md` (§1.4, §1.7, §1.9, §1.12), `yerel-talep-kalibrasyon.md` (§7, `yerelOlcek` 40) ve `eskiya-kalibrasyon.md` ile tutarlıdır. Hedef **gerçek oyuncuya yakınlık**, en iyi strateji değil: kurallar Esnaf Defteri akışını (rehber) izleyen sade eşiklerdir. Kod atıfları taban 7553b55 `packages/botlar/src/parsel.ts`; **kesin değil** olanlar "(doğrulanmadı)" işaretlidir. Kit 3 pencere ve `ilk_pencere` ödülü 8 bakım parçası kesindir. Sanayici bakımı Alfa-1'e kalır (bu belgede yok). **Davranış dağılımları (§1.1) A1'in oyuncu gözüyle bakışından gelir (`takim/a1/bot-kurallari-bakis.md`): hepsi ilk tahmindir, pilotta kalibre edilir; aşağıdaki satırlardaki eşikler (hazine, kit pencere, 84.000 ₺) değişmez, yalnız zamanlama ve tercih tek sabit değer yerine bot başına çekilir.**

## 0. Özet

| # | Kural | Koşul ve eşik | Kaynak sayı | Bağlanacağı yer (`parsel.ts`) |
|---|---|---|---|---|
| 1 | Tarla + 1. fabrika (değirmen) | Tarla katılımda; fab #1 bot başına U(1, 6) sa (§1.1-a); hazine ≥ yapı bedeli (indirimli 4.200 / 7.000 ₺) | A2 §1.7, §1.12 S1 | plan: yeni `ZINCIR` tanımı (`:102` kalıbı), yapı döngüsü `:966-998` |
| 2 | 2. fabrika (fırın) + yöntemler | fab #2: bot başına U(3, 24) sa (§1.1-a; kâğıt senaryosunda t = 1 sa); fab #1 değirmen, fab #2 fırın; **ya da** §5 seçicisi | A2 §1.8, §1.3-B2 | `yontemKomutlari` (yeni, `:1006` yanına), `yontem_degistir` (`tipler.ts:641`) |
| 3 | Dükkân (tür dağılımı §1.1-d) | Gecikme U(3, 24) sa, %25 ilk 24 sa kurmaz (§1.1-a); fırın plan/yapı + hazine ≥ 4.200 + hücre + 1.000 ₺ tampon; kit pencere ≥ 2,8 | A2 §1.7, §1.9 | plan sırası + `dukkanTuru` (A3 G7b), `dukkanKomutlari` (yeni) |
| 4 | Fiyat kademesi | Bot başına bir kez, ilk 24 sa: %60 dokunmaz (2) / %20 → 3 / %15 → 1 / %5 → 0 (§1.1-c); 72 sa kasa kuralı kalktı | A2 §1.9 (5.4) | `dukkan_fiyat` (A3 §7.5) |
| 5 | Raf | yuva 0 ekmek; yuva 1 gıda (varsa); kalan boş; gecikme U(0, 6) sa, %15 ilk 24 sa doldurmaz (§1.1-d) | perakende §5.1 | `dukkan_raf` |
| 6 | Ahır (`kepek_gubresi`) | İlk ekmekten 24 sa sonra, hazine ≥ 5.600 | A2 §1.6 | plan, yöntem komutu |
| 7 | Cam → pencere (G8) | t ≥ 72 sa + U(0, 96) sa, %50 hiç geçmez (§1.1-e); ekmek hattı ≥ 48 sa çalışıyor, ilk dükkân kuruldu, hazine ≥ **84.000 ₺** | A2 §1.12 S2 (yatırım 73.000 ₺) | plan genişlemesi, yöntem komutu |
| 8 | Yapı market (2. dükkân) | Pencere stoğu ≥ 8, hazine ≥ 3 × bedel | A2 §1.9, §1.12 | `dukkanKomutlari` |
| 9 | Yöntem seçici ("marjinal net") ve M | Bkz. §5 | A2 §1.3-B2, §5.7 tablosu | `yontemKomutlari` |

## 1. Ortak: yeni önayar `zincir` (öneri adı)

- **Plan** (bugünkü `CIFTCI`, `parsel.ts:102`, `plan: ["ciftlik","mera","ahir","ciftlik","mera"]` kalıbı): `["ciftlik", "gida_fabrikasi", "gida_fabrikasi", "dukkan", "ahir"]` (G6/G7); G8'de koşul sağlanınca eklenir: `"parca_fabrikasi", "parca_fabrikasi"`, ardından `"dukkan"` (`yapi_market`). `acilisTurleri: ["ciftlik"]`, `ilSirasi: "ova"`, `ithalat: true`, `birKez: false`, `yerlesikIlce: false`. Bağlanacak yerler: `ParselOnayari` birliği `:26` ve `PARSEL_ONAYARLARI` `:27`, `tanimSec` `:111` anahtarı, `Tanim` sabiti `:102-106` yanında.
- **Bakım:** `bakimYonetimi` açık (`:66`, `:871`, `bakimKomutlari` `:622`): zincir tesisleri bakım parçası ister (kit 40 parça inşaatta biter, O2 §7); `ilk_pencere` ödülü 8 parça bu açığı kapatır, ayrıca kural gerekmez.
- **Eşzamanlı inşaat ≤ 2:** mevcut döngü (`:969 bosYuva`, `:988`) zaten uyguluyor; yapı komutları plan sırasıyla, ilk karşılanamayan yapıda durur (`:977-985`: eksik malzeme ithalat `acik`'ına yazılır).
- **Karar aralığı:** mevcut `aralik` (`parsel-kosucu.ts`, doğrulanmadı) **bot başına 6–24 sa** çekilir (§1.1-b); "her sim-saat" kalktı.

### 1.1 Davranış dağılımları (A1 bakışı; **ilk tahmin, pilotta kalibre edilir**)

Kaynak: A1 `bot-kurallari-bakis.md` (1–5). Amaç **gerçek oyuncuya yakınlık**: tek sabit saat/tercih yerine bot başına çekilen dağılım. Yeni kural ya da ölçüm yok; eşikler (hazine, kit pencere ≥ 2,8, 84.000 ₺) aynı kalır. **Tüm yüzdeler ve aralıklar öngörüdür (doğrulanmadı):** pilot sonrası (A1 YA11/GZ-3, A0-11 medyanı) kalibre edilir. Çekimler tohumla yeniden üretilebilir olmalıdır (bot başına çekim `tohum + bot kimliği` ile).

| # | Kural | Dağılım (ilk tahmin) | Bu belgede etkilenen yer |
|---|---|---|---|
| a | **Yapı gecikmesi** (bot başına bir kez çekilir) | fab #1: **U(1, 6) sa**; fab #2 ve dükkân: **U(3, 24) sa**; botların **%25'i** dükkânı ilk 24 sa hiç kurmaz | §0 s.1–3, §2 fab #1/#2, §3 "Ne zaman" |
| b | **Karar aralığı** (`aralik`) | bot başına **6–24 sa** (ya da günde 1–3 sabit saat) | §1 "Karar aralığı" |
| c | **Fiyat kademesi** (ilk 24 sa içinde bir kez) | **%60 dokunmaz (2) / %20 yüksek (3) / %15 uygun (1) / %5 kampanya (0)**; kampanya yalnız açıksa (A3 §7.5b varsayılan kapalı; kapalıysa %5 → uygun) | §3 "Fiyat kademesi" |
| d | **Tür ve raf** | tür **%50 `bakkal` / %40 `firin` / %10 `sarkuteri`**; raf gecikmesi **U(0, 6) sa**; **%15** ilk 24 sa doldurmaz | §3 "Tür", "Raf" |
| e | **Karma ve G8 kapısı** | karma **%35 rehberli / %25 seçici / %40 varsayılan** (varsayılan = fabrikayı kurar, yöntemi hiç değiştirmez); G8: **t ≥ 72 + U(0, 96) sa**, botların **%50'si G8'e hiç geçmez** | §4 "Ne zaman", §5 karma, M tanımı |

**Tutarlı olanlar, dokunulmaz (A1):** kit pencere ≥ 2,8 ile ilk dükkân; ilk dükkânda pencere ithalatı yok, yalnız eksikse; ilk satış ve yıkım kuralları; `ilk_pencere` ödülü 8 parça; bot `marka_tanimla` vermiyor.

**G4 tetik M'si (e) ile DEĞİŞMEZ.** M yalnız **seçici** botlardan hesaplanır (§5 tek tanım); "varsayılan" botlar ve rehberli botlar tetiğe girmez. Üç sayı ayrı raporlanır: (i) **tetik M** (yalnız seçici; beklenen ≈ %75, eşik %30); (ii) **bilgi M, karma** (rehberli M = 1 sayılır, varsayılan M = 0, seçici ≈ 0,75): 0,35 × 1 + 0,25 × 0,75 + 0,40 × 0 ≈ **%54**; (iii) n_f dağılımı (seçici içinde). (ii) yalnız oyuncu karmasına yaklaşık bakış içindir; G2 kararı (i) ile verilir.

**Seçici örneklem küçülmemeli.** Karma %25 seçici ise tohum başına 100 bot yalnız **25 seçici** verir ve n_f = 1/2/3 dağılımıyla seçicilerin içi 6/12/6'ya bölünür. **K-1'de tohum başına en az 25 seçici bot** koşulu aranır: bu karma altında tohum başına ≥ 100 bot (3 tohum ⇒ ≥ 75 seçici; M standart hatası ≈ √(0,75 × 0,25 / 75) ≈ %5). Daha az botla koşulacaksa seçici sayısı korunur (karma yüzdeleri değil, seçici ≥ 25/tohum); kalan botlar rehberli/varsayılan paylarına orantılı dağıtılır.

**Ölçümlere etkisi (yeni ölçüm değil, yorum):**
- **A0-11 (ilk dükkân süresi)** botlardan gelen değerler yapay olarak ≈ 1–2 sa'ten **gerçek oyuncu beklentisine** (saatler) kayar; eşik (≤ 36 sa) değişmez, O2 temel çizgisi (B-1) yenilenir.
- **ZP8, R, r** (`yerel-talep-kalibrasyon.md` §7–8) kâğıt tahminleri **tüm botlar dükkânlı** varsayar. Yeni dağılımda dükkânı olan bot payı ilk günlerde düşüktür (%25 ilk 24 sa kurmaz, kalanı U(3, 24) sa gecikmeli; raf doldurmayan %15 satış yapmaz): **ZP8 ve dükkân geri ödemesi (A0-12) yalnız aktif dükkânı olan botlar üzerinden okunmalı**; R ve r tüm bot toplamında ilk günlerde düşük çıkar (beklenen yön; hata sayılmaz). K-1 r penceresi (gün 2–7) dükkân kuruluş gecikmesini taşır.
- **Fiyat kademesi karması (c):** yerel net kademe başına değişir (A2 §1.9: 0,85 R net eksi, 1,05 R varsayılan, 1,15 R daha yüksek net ama kasa bağlayıcı); dükkân geliri **kademeye göre kırılımla** raporlanır, bot ortalaması tek sayı olarak okunmaz.
- **Tür karması (d):** bot yalnız zincir malları (ekmek, gıda, kepek) taşır; `bakkal`/`sarkuteri` türlerinin raf kapasitesi ve kabul ettiği mal listesi A3 §7.4'ten **doğrulanmalıdır** (§7 açık soru 5). Çeşit çarpanı (1 + 0,25 · çeşit) bot malına bağlıdır, türün yuva sayısına değil.
- **G8 kapısı (e):** pencere/ithalat dalgası zamana yayılır (t ≥ 72 + U(0, 96) sa); 84.000 ₺ eşiği ilk iki günde aşıldığından bağlayıcı olan zamandır (§6). %50'nin G8'e hiç geçmemesi P5 ithalat toplamını ve NPC pencere payını yarıya yakın azaltır; kararlı hâl pencere sayıları "geçen bot sayısı" ile normalleştirilir.

## 2. G6: değirmen ve fırın

| Adım | Koşul | Eşik / sayı | Kaynak |
|---|---|---|---|
| Tarla | Katılım anı | Para 6.000 × 0,7 = **4.200 ₺**, 21 çelik + 7 parça (indirimli); yurt hücresi (ücretsiz, 2 hücre) | A2 §1.7 |
| Fabrika #1 (`gida_fabrikasi`) | bot başına **U(1, 6) sa** (§1.1-a; Tarla önce, katılım turunda) | **7.000 ₺** + 42 çelik + 14 parça (indirimli); hazine ≥ bedel; malzeme kit stoğundan | A2 §1.7, kit çelik 120, parça 40 |
| Fabrika #2 | bot başına **U(3, 24) sa** (§1.1-a; yuva boşsa; erken oyun çarpanı: Tarla 12 dk, fab 36 dk; kâğıt senaryosu A2 S1'de t = 1 sa alt sınırdır) | aynı bedel (indirimli); hazine ≥ **7.000 ₺**; 2 hücre (yurt toplam 6: Tarla 2 + fab 2 + fab 2) | A2 §1.8 (zincir 1,0 sa) |
| Yöntem: fab #1 | Tesis tamamlanınca (`tesisler` içinde, `yontem` hâlâ tür varsayılanı) | `degirmen` | A2 §1.4 |
| Yöntem: fab #2 | Tesis tamamlanınca | `ekmek_firini` | A2 §1.4 |
| Ahır + `kepek_gubresi` | İlk ekmekten ≥ 24 sa sonra; ahır sayısı 0 | hazine ≥ 8.000 × 0,7 = **5.600 ₺** (+ 28 çelik, 10,5 parça) | A2 §1.6, §1.12 (ahır saat 26) |
| İhracat emirleri | Mevcut `ihracatEmirleri` (`:444`): net çıktı oranında | ekmek, kepek (gübre ahırdan sonra) | `netCikti` `:419` |
| İthalat emirleri | Mevcut `ithalatEmirleri` (`:470`): eksik malzeme 1 sa'te kapanacak oranda; yakıt/elektrik **şebekeden** (emir yok, yuva harcamaz) | çelik/parça; parça eşiği 24 sa → 72 sa (`:622`) | A2 §1.3-B1 |

**Yöntem komutu:** `{ tur: "yontem_degistir", bolge: dugum.id, tesis: t.id, yontem: "degirmen" | "ekmek_firini" }` (`ekonomi/komut.ts:78-89`; `tesis` = `BolgeDurumu.tesisler[].id`, bu yüzden bot **tesis kimliğini** okur; `yontemAcikMi` `mulkKipi` yöntemlerini mülk kipinde açar). Karar bir kez verilir (tesis başına); tekrar değiştirme yok.

**Bağlama:** `karar` içinde `tarimKomutlari`/`bakimKomutlari` çağrılarının yanına (`:1006-1009`) yeni `yontemKomutlari(g, dugum)`. **Düzeltme gerekli:** `netCikti` `:419-440` planlanan yapı için `yontemler[0]` kullanır (`:429-439`); G6'da fabrika için `standart_gida_isleme` yanlış net çıktı verir. Planlanan yapılarda hedef yöntem (fab #1 `degirmen`, #2 `ekmek_firini`, parça fab. `cam_firini`/`celik_dograma`) bir `yontemHedefi: Map<tesisTuruSirasi, string>` ile geçilmelidir.

## 3. G7: dükkân

| Konu | Kural | Eşik / sayı | Kaynak |
|---|---|---|---|
| Ne zaman | Plan sırasında fabrikalardan sonra; bot başına **U(3, 24) sa** gecikme, botların **%25'i** ilk 24 sa hiç kurmaz (§1.1-a); **zincir tamamlanmadan da kurulur** (kit pencere varsa). Tek bir saat yok: A1'in "kit varsa ≈ 49. dk" kararı tek oyuncunun alt ucudur, bot nüfusunda gecikme dağılımıdır; "t = 1 sa" A2'nin gecikmesiz kâğıt senaryosudur (S1, §6) | — | A1 ilk-dükkan-boslugu §1, bot bakışı #1; A2 §1.12 S1 |
| Tür | **%50 `bakkal`, %40 `firin`, %10 `sarkuteri`** (§1.1-d; ilk tahmin); bot yalnız elindeki malları dizer, yani mal sayısı kadar yuva | `dukkanTuru` (A3 G7b `yapi_yerlestir.dukkanTuru`) | A3 §7.4 |
| Yapı koşulu | hazine ≥ dükkân para **4.200 ₺** (indirimli; indirimsiz 6.000) + hücre alımı (`arsaFiyati` `:302`; ticari hücre ≈ 3.625 ₺) + **1.000 ₺ tampon**; malzeme: çelik ≥ 14 (20), parça ≥ 5,6 (8), pencere ≥ **2,8** (4) | **kit 3 pencere** ilk dükkânı karşılar | A2 §1.7, §1.12 |
| Pencere eksikse | `ticaret_emri` ithalat, oran 4 birim/sa; yapı verilince emir silinir (mevcut `ithalatEmirleri` `:474` mantığı) | — | A3 §7.4 |
| Dükkân sayısı | ilk dükkân: 1. **İkinci dükkân** (`yapi_market`, §4): ilk dükkânın son 72 sa satış hızı ≥ 85 birim/sa (kasa 90'ın %95'i) **ve** hazine ≥ 3 × bedel (≈ 30.000 ₺) | ilçe başına ≤ 2 (`enFazlaIlcedeBasina`) | A2 §1.9, §1.12 |
| Fiyat kademesi | Bot başına **bir kez, ilk 24 sa içinde** çekilir (§1.1-c): **%60 dokunmaz (2, 1,05 R)**, **%20 yüksek (3, 1,15 R)**, **%15 uygun (1, 0,95 R)**, **%5 kampanya (0, 0,85 R)** (yalnız kampanya açıksa; kapalıysa %5 de uygun). 72 sa kasa kuralı kalktı. Hız sınırı DUK-18 (`fiyatDegisimEnAzSaat`) uyulur | 1,05 R'de şehir net 727 ₺/sa; fiyat arttıkça net artar, 0,85 R'de dört senaryoda net eksidir | A2 §1.9 (kademe tablosu) |
| Raf | yuva 0 = `ekmek`; yuva 1 = `gida` yalnız net `gida` üretimi/stoğu varsa (ahır `ahir_besi` ya da standart yöntem); kalan yuvalar boş (boş raf çekime girmez). **Raf gecikmesi: dükkân bittikten sonra U(0, 6) sa; botların %15'i ilk 24 sa hiç doldurmaz** (§1.1-d) | 4 yuva; `firin` `tamCesit` 2–3 | perakende §5.1, A3 §7.5 |

**Bağlama:** `dukkanKomutlari(g)` yeni işlev: `yapi_yerlestir` yapı döngüsünde (`:992`) plan sırasındaki `dukkan` girdisi için komut `dukkanTuru` alanıyla (A3 G7b) verilir; dükkân bitince `dukkan_raf { dukkan, yuva, mal }` ve `dukkan_fiyat { dukkan, yuva, fiyat }` (A3 §10 komut tipleri; `fiyat` = kademe indeksi, tutar yok). Satış hızı için A3 §6.8 okuma API'si (`dukkanlar(d, oyuncu)` içinde son 24 sa satış; alan adı **doğrulanmadı**). Plan sırası yeterli: hazine/malzeme yetmezse döngü o yapıda durur (`:977`).

## 4. G8: cam ve pencere

| Konu | Kural | Eşik / sayı | Kaynak |
|---|---|---|---|
| Ne zaman | **t ≥ 72 sa + bot başına U(0, 96) sa** (gün 3 sonu + gecikme; botların **%50'si hiç geçmez**, §1.1-e) **ve** ekmek hattı ≥ 48 sa kesintisiz (ihracat emri aktif, ekmek stoğu/ihracatı > 0) **ve** ilk dükkân kuruldu **ve** hazine ≥ **84.000 ₺** (P5 yatırımı 73.000 ₺ × 1,15) | yapı 30.000 + hücre 10.000 + malzeme ithalatı 33.000 = 73.000 ₺ | A2 §1.12 S2 |
| Yapılar | 2 × `parca_fabrikasi` (S: 15.000 ₺ + 80 çelik + 30 parça, 2 hücre, 8 sa → ×0,4 = 3,2 sa), eşzamanlı; altıncı/yedinci yapı **indirimsiz** | — | A2 §1.7, §1.12 |
| Yöntemler | 1. fabrika `cam_firini`, 2. `celik_dograma` (tamamlanınca `yontem_degistir`) | 60 silis + 16 yakıt + 18 elektrik → 50 cam; 24 çelik + 32 cam + 5 parça + 15 elektrik → 28 pencere | A2 §1.4 |
| İthalat | silis, çelik, parça `ticaret_emri` (mevcut `ithalatEmirleri`); yakıt/elektrik şebekeden | kararlı hâl ithalatı ≈ 140 bin ₺/gün (S2 tablosu) | A2 §1.12 |
| İhracat | pencere (28/sa, NPC dilimi 25), cam fazlası (50 − 32 = 18/sa) | pencere NPC ihracatı ≈ 218 bin ₺/gün | A2 §1.12 |
| Yapı market | `yapi_market` dükkânı: pencere stoğu ≥ **8** ve hazine ≥ 3 × bedel; raf: pencere, cam, çelik, parça (4 yuva); kademe 2 | pencere ödülü yok (ödül 8 parça); kit 3 pencere yalnız **ilk** dükkân içindir | A2 §1.9; Defter teyidi |
| `ilk_pencere` ödülü | Pencere üretimi başlayınca otomatik (8 parça, 1.440 ₺); bot bir şey yapmaz | bakım stoğunu besler | `defter-odul-teyit.md` §3 |

**Bağlama:** plan genişlemesi koşulu `karar` içinde (`:966`) plan listesine `parca_fabrikasi` ×2 eklemek için bir kapı (`g8Hazir(g)`): zaman (`g.d.zaman − katılım`), son 48 sa ihracat, `dukkan` sayısı, hazine. Aynı `netCikti` düzeltmesi (§2) cam ve pencere için de gerekir.

## 5. Yöntem seçici: "marjinal net" ve M

**Tanım (G4 tetik metriği için).** Seçici bot, bir `gida_fabrikasi` **tamamlandığında** tesis için yöntemi **bir kez** seçer; seçici yalnız bot **zaten kurduğu ya da planladığı fabrika sayısı n_f** üzerinde en yüksek toplam net saatlik değeri veren atamayı bulur:

```
V(X) = Σ_mal satis_m(X) · fiyat_m − Σ girdi_m(X) · yük · maliyet_m − bakım(X) − işletme(X)         [₺/sa]
X ∈ { standart_gida_isleme × k , (degirmen + ekmek_firini) çifti × j }, k + 2j = n_f
satis_m  = min(üretim_m(X), absorbe_m)                       absorbe_m = NPC dilimi + yerel dükkân satışı
NPC dilimi:  gıda  75 birim/sa,  ekmek 62,5 birim/sa   (emilimSaat × max(4, N)/4 ÷ N; N = dünyadaki oyuncu sayısı ≥ 4)
yerel dükkân satışı: s_y = 40 birim/sa (yerelOlcek 40 medyanı; dükkân yoksa 0) ; fiyat: NPC 0,891 R, yerel 1,05 R
fiyat_m / maliyet_m: `d.pazar.fiyat` referansı; girdi şebeke fiyatı (elektrik 10,35, yakıt 103,5), tahıl fırsat maliyeti 0,891 × 30
```

**Karar:** `argmax_X V(X)`; **eşitlikte tesisin varsayılan yöntemi (`standart_gida_isleme`)**; fab #1 tamamlanınca fab sayısı n_f (planlanan dahil) belli olduğundan atama o anda yapılır ve fab sayısı artarsa (3. fabrika) yalnız **yeni** tesis için yeniden hesaplanır (eski tesis değişmez; histerezis: kazanç ≥ %20 ve ≥ 7 gün).

**Sonuçlar (A2 sayılarından; dükkânlı, n ≥ 4 dünya):**

| n_f | Aday atamalar (V ₺/sa) | Seçim | Kaynak |
|---|---|---|---|
| 1 | standart 5.124 (bakkal + dilim) | `standart_gida_isleme` | A2 §5.7 A+ |
| 2 | 2 × standart = 5.124 − 3.175 = 1.949 ↔ değirmen + fırın 3.185 (B+) | **değirmen + fırın** | A2 §5.7 D, B+ |
| 3 | standart + (değirmen + fırın) = **8.309** (C) ↔ 3 × standart < 0 | standart + zincir (iki fırın-değirmen çifti değil) | A2 §5.7 C |

**Yani seçici zinciri yalnız ikinci fabrikadan itibaren seçer** (tek fabrikada standart önde; tek başına tesis tabanında standart kazanır, A2 §1.3-B2).

**M tanımı (A2 §1.3-B2 tetiği, X = %30):** `M = (ilk 7 günde ≥ 24 sa `degirmen` yönteminde tesisi olan bot) / (ilk 7 günde ≥ 1 `gida_fabrikasi` kurmuş bot)`; yalnız **seçici** botlar (`rehberli` zincir botu M = 1 olduğundan ölçüte girmez). **Beklenen M** seçici nüfusta: n_f dağılımı (tohum karması): n_f = 1 %25, 2 %50, 3 %25 ⇒ **M ≈ %75** (≥ %50 hedefi, X = %30 üstü). M < %30 çıkarsa G2 tetiklenir; G2 açılırsa (`standart_gida_isleme` ×0,75) tek fabrika değeri 5.124'ten ≈ 2.600 ₺/sa'e düşer (yaklaşık: 40 gıda/sa × ≈ 63 ₺ kaybı; kâğıt tahmin) ama zincir 2 fabrika ister, seçici n_f = 1 için yine zinciri **seçmez** (zincir 2 fabrika ister): M yine n_f ≥ 2 payıdır. (Bu yüzden M ölçüsü çıktı olarak **bot fabrika sayısı dağılımına** bağımlıdır: bot ayarı ile ekonomik hata ayrılamaz; O2 n_f dağılımını koşuyla raporlamalı.)

**Tek tanım: G4 tetiği M'si yalnız seçici botlardan hesaplanır (beklenen ≈ %75; eşik X = %30).** Bot nüfusu önerisi (K-1; yeni oyuncu; tohum 1–3), **A1 bakışıyla (§1.1-e, ilk tahmin) güncel:** %35 `rehberli` (n_f = 2, yöntem sabit: gerçek oyuncunun Defter yolu), %25 `seçici` (n_f tohum karmasıyla 1/2/3), %40 `varsayılan` (fabrikayı kurar, yöntemi hiç değiştirmez; M paydasına girmez). **Tohum başına ≥ 25 seçici bot** (≥ 100 bot/tohum). Karma M (rehberli M = 1, varsayılan 0, seçici ≈ 0,75: 0,35 + 0,1875 ≈ %54) yalnız **bilgi** olarak raporlanır, tetikte kullanılmaz; **tetik M değişmedi**: yalnız seçici botlar, beklenen ≈ %75, eşik %30. Eski %60/%40 karması (karma M ≈ %90) kalktı.

**Bağlama:** `yontemKomutlari(g, dugum)` (yeni; `:1006` yanında): (1) `dugum.tesisler` içinde `tur === gida_fabrikasi` ve `yontem === varsayılan` olan tesisleri bul (tesis `id`, `ekonomi/komut.ts:81`); (2) §5 hesabını `g.bilgi.yontem[...]` (girdi/çıktı/`isci`/`bakim`; `tablo.ts`) ve `g.d.pazar.fiyat`, `g.d.oyuncular.length` ile yap; (3) `yontem_degistir` komutu ver. Mevcut `BolgeDurumu.tesisler[].yontem` tek kaynak olduğundan bot durumsuz kalır (`parsel.ts:8-9`).

## 6. Tutarlılık kontrolü

| Kontrol | Sonuç |
|---|---|
| Zaman çizelgesi (A2 S1, gecikmesiz **kâğıt senaryosu**; bot dağılımı §1.1 bunu geciktirir) | t = 0: Tarla + değirmen; t = 1 sa: fırın + dükkân (kit pencere 2,8); ahır t ≈ 26 sa; hazine en düşük saat 2'de 41.494 ₺ (eşikler yetiyor) |
| Hücre | Yurt 6: Tarla 2 + fab 2 + fab 2; dükkân 1 + ahır 2 satın alınır (hücre ≈ 3.625 + 2 × 2.500) |
| `yerelOlcek` | Bot satış beklentisi s_y = 40 birim/sa (b seçeneği, `yerelOlcek` 40: ilçe başına 41 birim/sa/oyuncu) |
| Kit pencere | 3 ≥ 2,8 (ilk dükkân); ilk_pencere ödülü 8 parça (bakım) |
| P5 eşiği | 84.000 ₺ ≤ gün 3 hazine ≈ 376.000 ₺ (ekmek oyuncusu): eşik ilk iki günde aşılır, zaman koşulu (72 sa) bağlayıcıdır |
| İkinci dükkân | ilk dükkânın kasa doluluğu ≥ %95 yalnız ≥ 60 bin nüfuslu ilçelerde (A2 §1.9); küçük ilçede ikinci dükkân kurulmaz (net ≈ 0) |

## 7. Geri dönüşü zor kararlar ve açık sorular

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| B-1 | `zincir` önayarının plan sırası (Tarla, 2 fabrika, dükkân, ahır) ve `yapi_yerlestir` `dukkanTuru` ile birleşmesi | O2'nin ön ayarları ve ölçüm temel çizgileri bu sıraya bağlanır; sıra değişince tüm ölçümler yenilenir | Sıra kilitlensin; eşikler (ör. 84.000 ₺, 72 sa) kolay geri dönüşlü |
| B-2 | Yöntem seçicisinin "n_f'e göre seçim" tanımı (M'nin anlamı) | M, bot n_f dağılımına bağlı: G2 tetiği botun ayarından etkilenir. **Bot M'si oyuncu tercihini ölçmez; "marjinal net değirmeni seçtiriyor mu" sorusunu ölçer; n_f karması tohumla belirlenir.** Oyuncu tercihi A1'in pilot gözlemiyle tamamlanır | O2 n_f dağılımını raporlasın; seçici ve rehberli ayrı sayılsın; tetik yalnız seçici M |
| B-3 | `netCikti` düzeltmesi (planlanan yapı için yöntem hedefi) | Mevcut ihracat emirleri çiftçi/sanayici/tüccar için `yontemler[0]` varsayar; değişiklik bölge kipi altınlarını etkilememeli (yalnız mülk kipi, `ic.mulk`) | Yalnız `zincir` önayarına özgü yol; diğer önayarlar aynı kalsın |

**Açık sorular.** (1) Dükkân satış hızı okuma API'sinin alan adı (A3 §6.8; doğrulanmadı). (2) Bot karar aralığı (sim-saat; `parsel-kosucu.ts` `aralik`). (3) `gec_katilan` `acilis: "zincir"` eklenecek mi (Y7)? (5) `bakkal`/`sarkuteri` türlerinin mal listesi ve yuva sayısı (A3 §7.4) ve bot raf doldurma kuralının bu türlerde çalışıp çalışmadığı. (6) A1 yüzdelerinin (§1.1) pilot sonrası kalibrasyonu (A0-11 medyanı, ilk 24 sa dükkân kurmayan oran): hepsi öngörüdür. (7) Bot başına çekimin tohum + bot kimliğiyle yeniden üretilebilir olması (O2). (4) Ekmek ihracat oranı bugünkü `ihracatEmirleri` ile net çıktı kadardır (240/sa); NPC dilimi 62,5 olduğundan 200 botta pazar doyumu (arz/emilim 2,26) ve fiyat çöküşü olası: K-1'de ekmek NPC fiyat/taban ölçülsün (`yerel-talep-kalibrasyon.md` §8).
