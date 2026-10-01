# Alfa-0 canlı ekonomi izleme listesi (A2)

> **Durum.** Yalnız belge; kod ve veri değişmedi. Taban 7553b55 (dal `takim/a2/alfa0-izleme`). Alıcılar: Operasyon lideri (O3'ün `alfa0-isletim` kılavuzuna bağlayacak), Ar-Ge lideri. Sayıların kaynağı: `p4-p5-ekonomi.md` (G4, bakım §2), `yerel-talep-kalibrasyon.md` (§7 para dengesi, §8 K-1), `bot-kurallari-g6-g8.md` (M tanımı), A3 `p4-p5-sartname.md` (okuma API'si, ZP sayaçları). **Tüm eşikler ilk tahmindir (doğrulanmadı):** K-1 ve ilk canlı hafta sonrası kalibre edilir. Kâğıt model sayıları "beklenen" sütununda ayrıdır; eşikler beklenenin etrafına kurulmuştur, kâğıt modelin kendisi hata sayılmaz.
>
> **Düzeltme (atıf).** Dükkân geri ödeme medyanı ≤ 48 sa hedefi GDD'de **A0-11** satırındadır (`oyun-tasarim-belgesi-v1.md:1088`); **A0-12** (`:1089`) perakende primi (1,05–1,20; > 1,30 alarm), ilk dükkân ≤ 36 sa ve fiyat savaşı (< 0,85 R süre ≤ %5) satırıdır. `yerel-talep-kalibrasyon.md` ve bu belgenin eski anıları "geri ödeme (A0-12)" yazıyordu; bu belgede A0-11'e bağlanır.

## 0. Özet: on metrik, okuma yolu, eşikler

Okuma yolları: **[S]** = bugünkü `/metrik` ucu (`packages/sunucu/src/metrik.ts`): **ekonomi metriği yok** (yalnız sistem metrikleri ve ödül sayaçları, bkz. §1). **[O]** = O2'nin günlük oynatması (`takim/o2/g10-cikarma`, `packages/olcum/src/insan-cikarma.ts`): `Simulasyon` ile günlüğü oynar, `sim.dunya` her adımda okunur. **[K2]** = K2'nin `/metrik`'e ekleyeceği dünya düzeyi gauge'lar (§8.2). Oyuncu başına olanlar yalnız [O]'da (kardinalite).

| # | Metrik | Okuma | Yeşil | Sarı | Kırmızı | Kırmızıda ilk ayar (yön) |
|---|---|---|---|---|---|---|
| E1 | **R** = lavabo / (ihracat − ithalat), 7 gün kayan | [O] ya da [K2] (fark) | ≥ 0,30 ve ≤ 0,60 | 0,22–0,30 ya da 0,60–0,70 | < 0,22 ya da > 0,70 | Önce **lavabo kalemleri** (yön: R < için ↑), `yerelOlcek` **en son** (40 → 35 en çok) |
| E2 | **r** = yatırım / net kâr, oyuncu medyanı, 7 gün | [O] (+ K2 yatırım sayacı) | %10–%40 | %5–%10 ya da %40–%50 | < %5 ya da > %50 | Yatırım sürtünmesi (M/L ve hücre bedeli ↓, Defter yatırım kartı); R için E1'e |
| E3 | **ZP8** = yerelNpc / (yerelNpc + ihracatNpc) | [K2] ya da [O] | ≤ %45 | %45–%50 | > %50 iki ardışık hafta | `yerelOlcek` 40 → 35 (tek adım) |
| E4 | **İlk dükkân süresi** (kuruluş − katılım), kuranların medyanı | [O] (`dukkan`, `kurulus`) | ≤ 36 sa | 36–48 sa | > 48 sa ya da 48 sa sonra kuran payı < %30 | Dükkân para bedeli ↓, kit pencere ↑, Defter `ilk_dukkan` kartı |
| E5 | **Dükkân geri ödemesi** (bedel / ek net), medyan | [O] (+ K2 satış miktarı) | ≤ 48 sa | 48–150 sa | > 150 sa | `giderMiliSaat`, bedel; `yerelOlcek` ↑ yalnız son |
| E6 | **M** = ≥ 24 sa `degirmen` tesisi olan / ≥ 1 `gida_fabrikasi` kuran | [O] ya da [K2] (yöntem dağılımı) | ≥ %50 | %30–%50 | < %30 | Önce neden ayrımı (§6); ekonomik ise G2 `yontemGecersizKilma` 750.000 |
| E7 | **Kamu kasaları**: (a) kapasite karşılama, (b) birikim | [O] ya da [K2] | (a) ≥ 1,0; (b) ≤ %6 | (a) 0,6–1,0; (b) %6–%10 | (a) < 0,6; (b) > %10 | (a) `kasaPayiPpm` ↑ (R'yi düşürür), (b) sipariş hacmi ↑ ya da `kasaPayiPpm` ↓ |
| E8 | **Fiyat sınırına dayanan mal sayısı** (NPC fiyat/taban ≤ 0,26 ya da ≥ 1,74) | [K2] ya da [O] | 0 | 1–2 mal | ≥ 3 mal ya da bir mal 48 sa kesintisiz | `pazar.emilimSaat`/`arzSaat` (kapasite), `fiyatEsnekligiPpm` en son |
| E9 | **Bakım C**: aşınma ve zincir çıktı kaybı | [O] ya da [K2] | gün 14 ≤ %12, gün 45 ≤ %32 | ≤ %18 / ≤ %40 | üstü ya da < %5 (hiç aşınmıyor) | `asinmaHizCarpaniPpm` 500.000 → 400.000 (E varyantı) ↔ 600.000 |
| E10 | **Kit pencere ve ödül toplamı** (A0-10) | [S] kısmen, [O] | oyuncu başı ödül ≤ 6.790 ₺, ret 0 | 6.790–8.000 ₺ | > 8.000 ₺ ya da `odul_reddedilen` > 0 | Ödül tablosu (`ilk_pencere` 8 → 4 parça); kit pencere dokunulmaz |

**Örneklem koşulu (hepsi için).** n < 5 oyuncuda ya da n < 3 olay (ör. dükkân kuran) için sarı/kırmızı **verilmez**, "ölçülmedi" yazılır (aynı kural `insan-testi-kilavuzu.md:583`). **Küçük dünya uyarısı:** NPC pazar dilimi kişi başına `emilimSaat × max(4, N)/4 ÷ N` olduğundan N < 4'te kişi başı pazar derinliği büyür; ihracat ve ZP8 yukarı, R aşağı sapar. N < 4 koşulunda E1, E3, E8 kâğıt ölçekle karşılaştırılmaz.

## 1. Okuma yolları (koddan, dosya:satır)

**[S] `/metrik` bugün.** `metrikMetni` (`packages/sunucu/src/metrik.ts:173-240`) girdisi `MetrikGirdisi` (`:132-166`); `sunucu.ts` `metrikMetniUret` (`:178`) `yazar.sim.dunya` içinden yalnız `zaman` ve komut/commit/görüntü/ödül sayaçlarını geçirir (`:187-218`). Ekonomi alanı **yoktur**; ödülle ilgili tek ekonomi benzeri ucu `bolge_odul_verilen_toplam` ve `bolge_odul_reddedilen_toplam` (`metrik.ts:211-212`). Ayrı HTTP portunda Prometheus 0.0.4 metni.

**[Ç] Çekirdekte okunacak durum (hepsi okuma, durum değişmez).**

| Veri | Yer |
|---|---|
| Musluk ve lavabo sayaçları (`ParaSayaci`, gerçek değer = `n + a/SAAT` mili-para) | `Dunya.mulk.para` (`cekirdek/src/tipler.ts:854-860`); kalem adları `MuslukKalemi` `:842`, `LavaboKalemi` `:846`; P4 ekler: `musluk.yerelNpc?` (isteğe bağlı), `lavabo.sebeke` (A3 şartname §12.2, `:1667`, `:1702-1710`) |
| Kamu kasaları (giriş kalemleri, çıkış, rezerv, 28 gün pencere) | `KasaDurumu` (`tipler.ts:863`), `kasaBakiyesi` (`mulk/kasa.ts:61`), `kasaOranlari` (`:205`), `paraMuhasebesi` (`:94`) |
| Oyuncu başına saatlik para akışı | `ParaAkisi` (`tipler.ts:884`): ihracat, nufus, ithalat, isletme, vergi |
| NPC pazar fiyatı (mal indeksine göre) | `Dunya.pazar.fiyat` (`tipler.ts:419-430`); formül `pazar/piyasa.ts:123-134` (`fiyat = taban + taban × oran × esneklik`, `parametreler.json:46` `fiyatEsnekligiPpm 750000` ⇒ fiyat ∈ [0,25; 1,75] × taban) |
| Tesis yöntemi, aşınma | `TesisDurumu.yontem` (`tipler.ts:160-166`), `asinmaPpm` (`:173-174`; verim kaybı = aşınma × `asinmaVerimKaybiTavaniPpm`), `onarimBitis` |
| Dükkân (P4) | `MulkOyuncuDurumu.dukkanGeliri`, `ilkSatisT`; `DukkanDurumu.baslangic`/`kurulus` (A3 §12.4, `:1450`); `yerelPazarGorunumu` `kasaDoluluk`, `giderMiliSaat` (A3 §6.8, `:1227-1229`) |

**[O] Günlük oynatma (O2).** `insan-cikarma.ts` (dal `takim/o2/g10-cikarma`): `cikar` (`:195`), oynatma döngüsü (`:299-336`) her kaydı `sim.uygula` ile işler, `sim.dunya` her adımda okunabilir; `anlikHazine` içe aktarılır (`:18`). Bugün **yalnız test oyuncuları** için olgu çıkarır: `ilkSatis` (`:115`), `dukkan` (`:118`; ilk dükkân **yapı komutu** zamanı, `dukkanT` `:360`), `ikinciYapi`, Y7. Sermaye komutu izi `SERMAYE_KOMUTLARI` (`:29`: `parsel_al`, `yapi_yerlestir`, `tesis_insa_hucre`; `tesis_olcek_yukselt` ve `kenar_gelistir` yok). Ekonomi için bir **`ekonomi` çıktı bölümü** (dünya düzeyi, günde bir örnek) eklenmesi gerekir: bu belgenin K2/O2 işi listesi §8.2.

**Bu belgede "bugün yok" olan her şey** P4/P5 kodu girince (G7a `yerelNpc`, `lavabo.sebeke`, dükkân durumu) okunabilir; taban 7553b55'te `yerelNpc` ve dükkân alanları henüz yoktur (`grep` boş). Eşikler P5 sonrasına yazıldı.

## 2. Para dengesi: E1 R ve E2 r

### E1 R

- **Tanım (docs/06 §10.5, `:253`; mülk kipi):** `R = lavabo / (ihracat − ithalat)`; `ihracat = ihracatNpc + yerelNpc`, `ithalat = ithalatNpc`, `lavabo = isletme + sebeke + araziVergisi + harcama + arsa` (`yerel-talep-kalibrasyon.md` §7). **7 günlük kayan fark** (sayaç farkları; kümülatif oran ilk günlerde hibeyle bozulur: hibe musluğu paydaya girmez, ayrıca raporlanır). Kamu kasa girişi **lavabo sayılmaz** (kasa dolaşımdan çıkar); bilgi için `R_kasa = (lavabo + kasa girişi) / (ihracat − ithalat)` ayrıca yazılır (§10 soru 5).
- **Okuma:** [O] `sim.dunya.mulk.para` sayaç farkları (kalem başına `n + a/SAAT`, `tipler.ts:854-860`); [K2] aynı sayaçlar gauge olarak, R Prometheus'ta `increase(...[7d])` ile türetilir.
- **Beklenen (kâğıt, `yerelOlcek` 40):** r = 0 iken 0,24–0,26; r ≥ %10 iken 0,32–0,33; r = %25 ⇒ 0,44; r = %50 ⇒ 0,62 (`yerel-talep-kalibrasyon.md` §7).
- **Eşik gerekçesi.** Bant 0,30–0,60'tır (altı enflasyon). Kâğıtta r = 0 R'yi 0,23–0,26'ya iter; bu bölge **sarı** (22–30) sayılır ve yalnız r ile birlikte karar verilir: **R < 0,30 ve r < %10 ise ayar başlatılır** (baş lider kuralı, `yerel-talep-kalibrasyon.md` §8.1); R < 0,30 iken r ≥ %10 ise önce ölçüm doğrulanır (r tanımı, hibe/ödül payı, N < 4 sapması), parametre değişmez. **Kırmızı** < 0,22 (kâğıtta bile görülmeyen düzey) ya da > 0,70 (aşırı çekim, deflasyon).
- **Kırmızıda parametre sırası (R < 0,22 ya da sarıda r < %10):**
  1. **Lavabo kalemleri (önce):** (a) hücre/arsa fiyatı `hucreFiyati` (`parametreler.json:190`: kırsal 1.000, kasaba 2.500, şehir 6.500 ₺) ↑; (b) tesis M/L ölçek yükseltme bedeli ↑ (`tesis_olcek_yukselt`, `sanayi/komut.ts:57`); (c) işletme gideri (tesis 60 ₺/sa, dükkân `giderMiliSaat` 132.000 mili/sa) ↑; (d) `kasaPayiPpm` **↓** (şebeke ödemesinin lavaboya düşen payı ↑; **E7(a) ile çatışır**, bkz. §8.1); (e) şebeke fiyat çarpanı `kamuFiyatTavani` 1,035 R ↑ (şebeke ödemesi ↑).
  2. **`yerelOlcek` en son:** 40 → **35** (tek adım; payda küçülür, R ↑, ZP8 ↓). Alt sınır: geri ödeme medyanı ≤ 48 sa (E5) ve her hâlde 300 sa'i aşmamalı: ölçek 35'te kâğıt geri ödeme 46 (U) / 27 (N) sa, yani 35 **tek güvenli adımdır**; 30'a inilmez.
- **R > 0,70:** yön tersi (lavabo kalemleri ↓: önce işletme gideri, hücre fiyatı); `yerelOlcek` ↑ yalnız E5 sarı/kırmızı ise.
- **Ayar kuralı.** Bir seferde tek parametre, ≥ 7 gün gözlem; her ayarda korunum eşitliği (Σ hazine + Σ kasa + Σ lavabo = Σ musluk, `mulk/kasa.ts:13`) kontrol edilir.

### E2 r

- **Tanım (`yerel-talep-kalibrasyon.md` §8.1):** `r = Σ yatırım / Σ net kâr`, oyuncu başına 7 günlük pencere, sonra dünya medyanı (p10–p90). Yatırım: `lavabo.arsa` (`mulk/komut.ts:216`), yapı bedeli (`yapi_yerlestir` → `maliyetiDus` → `lavabo.harcama`, `mulk/komut.ts:469`, `ekonomi/maliyet.ts:22`), `tesis_olcek_yukselt` (`sanayi/komut.ts:57`), `kenar_gelistir` (`lojistik/cozum.ts:328,343`). **Yatırım değildir:** `genel_onarim` (`sanayi/komut.ts:113`), `arama_sondaji` (`:146`), `arastirma`. Net kâr: Δ(`ihracatNpc + yerelNpc`) − Δ(`ithalatNpc + isletme + sebeke + araziVergisi`) oyuncu başına (`ParaAkisi` ya da komut günlüğü).
- **Okuma:** [O]. `lavabo.harcama` yatırım ve bakımı **karıştırır**, bu yüzden dünya sayaçlarından r çıkmaz: komut başına hazine farkı gerekir (O2'nin `SERMAYE_KOMUTLARI` ve `hazineOnce - anlikHazine` kalıbı, `insan-cikarma.ts:317-336`; `tesis_olcek_yukselt` ve `kenar_gelistir` bu kümeye **eklenmeli**). Canlı [K2] için bir `yatirim` sayacı (komut anında yazılan) gerekir (§8.2).
- **Eşikler.** Yeşil %10–%40: R bantta kalır (r = %10 ⇒ R 0,32–0,33). Sarı %5–%10 ya da %40–%50. Kırmızı < %5 (hazine birikir, para yutulmaz: enflasyon riski; hazine eğrisi gün 30'da 3,5 M ₺/oyuncu) ya da > %50 (R 0,62 üstü).
- **Kırmızıda:** r < %5 ise ayarlanacak şey para değil **yatırım sürtünmesi**: yapı/ölçek bedeli ↓ (yatırım caziplik ↑), hücre fiyatı ↓, Defter yatırım kartı (tasarım işi); R'yi yükseltmek için E1 listesine bakılır (r'yi artırmak ve lavabo kalemi artırmak ayrı yollar). r > %50 ise lavabo kalemleri ↓ (E1 üst bölge).

## 3. Perakende: E3 ZP8, E4 ilk dükkân, E5 geri ödeme

### E3 ZP8

- **Tanım (A3 §12.3, `:1731`):** `yerelNpc / (yerelNpc + ihracatNpc)`, dünya ve ilçe kırılımı, 7 gün kayan. **Okuma:** [K2] iki musluk sayacı (`mulk.para.musluk.yerelNpc`, `musluk.ihracatNpc`; `yerelNpc` isteğe bağlı, yoksa 0) ya da [O].
- **Beklenen (b) + `yerelOlcek` 40:** %44 (U yerleşim) / %52 (N yerleşim); GDD alarmı %50 (ZP8 ≤ %50). Yani **nüfusla orantılı yerleşimde ilk haftalarda sarı-kırmızı sınırı beklenir**: kırmızı ancak **iki ardışık 7 günlük pencere > %50** ise.
- **Eşik:** yeşil ≤ %45; sarı %45–%50 (tek pencere > %50 dahil); kırmızı > %50 iki pencere.
- **Kırmızıda:** tek doğrudan kaldıraç `yerelOlcek` **40 → 35** (ZP8 −3 puan: %44/%52 → %41/%49; geri ödeme 37/22 → 46/27 sa; R ↑ da yardım eder). Ölçek 35'in altı yok (E5 sınırı). Ek yardımcılar: şehir/kasaba talep sabitleri (`ilceSinifiNufus`) değiştirilmez (sınıf kuralı kararı geri döndürülmez). ZP8 kırmızı ama E5 sarı/kırmızı ise **üçgen çatışması** (§7): baş lider kararı gerekir.

### E4 İlk dükkân süresi

- **Tanım (GDD A0-11/A0-12 `:1088-1089`, `insan-testi-kilavuzu.md:583`):** kurulma zamanı − katılma zamanı, **kuranların medyanı**; yanında **kuruluş oranı** (katılımdan ≥ 48 sa geçmiş oyuncular içinde dükkân kuran %) yazılır, çünkü yalnız medyan kurmayanları saklar. **A3 zaman alanları (§12.4, `:1450`):** (a) yapı komutu zamanı `DukkanDurumu.baslangic`, (b) kurulma `DukkanDurumu.kurulus`, (c) ilk satış `MulkOyuncuDurumu.ilkSatisT`; ölçü **(b) − katılma** (A0-11'in "kurulma" anlamı); (c) ayrıca "ilk satış süresi" olarak raporlanır (Defter A0-14).
- **Okuma:** [O] (`insan-cikarma.ts` `dukkan` bugün (a)'yı verir: **(b) alanı için çıkarmanın `dukkanT` yerine `DukkanDurumu.kurulus` okuması** eklenmeli; O2 işi). Test oyuncusu başına, dünya geneli için ayrı.
- **Koşul:** ≥ 3 kişi kurmuş (n < 3 ⇒ "ölçülmedi", `insan-testi-kilavuzu.md:583`). **Bot gerçekçilik dağılımı** (`bot-kurallari-g6-g8.md` §1.1: gecikme U(3,24) sa, %25 ilk 24 sa kurmaz) yalnız botlu koşuyu ilgilendirir; canlı insan ölçüsü bundan etkilenmez, ancak karma dünyada **bot ve insan ayrı** raporlanmalıdır.
- **Eşikler:** yeşil medyan ≤ 36 sa; sarı 36–48 sa; kırmızı > 48 sa **ya da** 48 sa sonrası kuran payı < %30.
- **Kırmızıda:** (1) dükkân para bedeli ↓ (`insaParasi` 4.200 indirimli; A2 §1.7); (2) **kit pencere** 3 → 4 (kit stoğu; para alarmı/ZP etkisi yok, `defter-odul-teyit.md` §3'te A seçeneği; ilk dükkân eşiği 2,8 pencere); (3) ticari hücre ×1,45 çarpanı ↓; (4) Defter `ilk_dukkan` kartı/ödül görünürlüğü (UI; `ilk_dukkan` yer tutucu etkinleştirilmeli, `insan-testi-kilavuzu.md:135`). **Para parametresi önce bedel, sonra kit; `yerelOlcek`'e dokunulmaz** (süre talep değil karar/sürtünme sorunudur).

### E5 Dükkân geri ödemesi

- **Tanım:** `geri ödeme = (dükkân para bedeli + hücre + malzeme değeri) / ek net`, `ek net = (p_dükkân − p_NPC ihracat) × q − gider` (A2 §1.9: NPC'ye satışa göre **ek** kazanç; 1,05 R'de şehir 727 ₺/sa; 0,85 R'de net negatif). Medyan (dükkân başına, 7 gün kayan net), yanında **kârlı dükkân payı** (ek net > 0).
- **Okuma:** [O]. Gelir `dukkanGeliri` (A3 §12.4) ve gider `giderMiliSaat` (`yerelPazarGorunumu`, `:1227-1229`) okunur; **satılan miktar** q için dükkân başına kümülatif satış miktarı sayacı gerekir (şartnamede yalnız gelir var: **K2 işi**, §8). Sayaç gelene kadar yaklaşık: `ek net ≈ dukkanGeliri/sa × (1 − 0,891 R / p_kademe) − gider` (kademe 2: çarpan %15,1; kademe bilgisi `OzelBolgeKaresi.dukkanlar` raf `fiyat`, A3 `:1627`).
- **Beklenen (b), `yerelOlcek` 40:** medyan 37 (U) / 22 (N) sa; kârlı ilçe 36 / 42 (nüfusu ≥ 30 bin ilçeler).
- **Eşikler:** yeşil ≤ 48 sa (GDD A0-11); sarı 48–150 sa; kırmızı > 150 sa (300 sa "çöküş" sınırı, `yerel-talep-kalibrasyon.md` §7).
- **Kırmızıda sıra:** (1) `giderMiliSaat` ↓ ve dükkân bedeli ↓ (R'yi biraz düşürür); (2) kademe bandı/fiyat tabanı (`fiyatKademeleriPpm`); (3) `yerelOlcek` ↑ (40 → 45) **yalnız en son** ve yalnız E3 (ZP8) ve E1 (R) yeşilse: aksi hâlde üçgen (§8.1). Ölçek ↑ ZP8'i ve payda'yı yükseltir (R ↓).

## 4. Zincir: E6 M

- **Tanım (`bot-kurallari-g6-g8.md` §5, 3479b55):** `M = (ilk 7 günde ≥ 24 sa `degirmen` yönteminde tesisi olan oyuncu) / (ilk 7 günde ≥ 1 `gida_fabrikasi` kurmuş oyuncu)`. **G4 tetik M'si botlarda yalnız seçici botlardan** hesaplanır (varsayılan ve rehberli hariç); **canlı insan dünyasında seçici/rehberli ayrımı yoktur**: M_canlı tüm `gida_fabrikasi` kuranların payıdır ve gerçek oyuncunun yöntem seçicisini bulmaması nedeniyle bot M'sinden (≈ %75 seçici) **düşük** çıkabilir (A1 bakışı: "kimse varsayılanda bırakmıyor" iyimserliği).
- **Okuma:** [O] ya da [K2] `sim.dunya` tesisleri (`TesisDurumu.yontem`, `tipler.ts:160-166`; yöntem indeksi → ad `icerik.yontemler`); `gida_fabrikasi` kurma anı ve ≥ 24 sa koşulu için tesis başına yöntem değişim zamanı (günlükte `yontem_degistir`, `ekonomi/komut.ts:78`) gerekir. [K2] yalnız anlık `yontem` dağılımı (gauge `{tur, yontem}`) verir; "≥ 24 sa" ve "ilk 7 gün" için [O].
- **Eşikler (GDD hedefi ≥ %50; G2 tetik X = %30):** yeşil ≥ %50; sarı %30–%50; kırmızı < %30.
- **Kırmızıda (neden ayrımı zorunlu):**
  1. **Ekonomik neden mi, keşfedilebilirlik mi?** `yontem_degistir` **deneme** payı (ret dahil, komut günlüğünden) yüksek (≥ %50) ve M düşükse oyuncu denedi ve standartta kaldı (**ekonomik**: zincir standarttan değerli değil); deneme payı düşükse **keşfedilebilirlik** (yöntem paneli, Defter kartı; ekonomi parametresi değil, tasarım işi).
  2. Ekonomik ise **G2**: `standart_gida_isleme` mülk kipinde `yontemGecersizKilma` 750.000 (×0,75; varsayılan kapalı). Etkisi: tek fabrika değeri ≈ 5.124 → ≈ 2.600 ₺/sa; ama zincir 2 fabrika ister, n_f = 1 oyuncu için yine zinciri seçmez (M n_f ≥ 2 payıdır). Önce tarif kaldıracı `FIRIN_EKMEK` 240 → 250 (tek parametre, +%4 ekmek; seçenek, G2'den ucuz) ve değirmen/fırın tarifleri; G2 son.
- **Not.** Canlı M bot tetiğinin yerine geçmez: G2 kararı K-1'deki seçici M ile verildi; canlı M **doğrulama** metriğidir (bot ↔ insan farkı raporlanır).

## 5. Kamu ve pazar: E7 kasalar, E8 fiyat sınırı

### E7 Kamu kasaları

- **Tanım (iki alt ölçü).** (a) **Kapasite karşılama** (ilçe başına): `0,5 × haftalık kasa girişi / v0 sipariş hacmi` (çekirdek 23.381 ₺/hafta; parça yedekli 27.089); tek P4 oyuncusu olan ilçede `kasaPayiPpm` 120.000'de 1,1×, 4,4 oyuncuda 4,6×, 10 oyuncuda 10,5× (A2 §1.9 "Kasa girişi ve `kasaPayiPpm`" tablosu; şebeke ödemesi §1.3-B1). Kasa kuralları: oyuncuya ödenen ≤ 28 gün girişin %50'si, haftalık bütçe ≤ 28 gün girişin %25'i, tek alım ≤ bakiyenin %40'ı (`mulk/kasa.ts:343-367`). (b) **Birikim:** `Σ kasa bakiyesi / (28 günlük Σ musluk)` (para dolaşımdan çıkan pay). Kâğıtta v0 harcaması girişin ≈ %11'idir (dünya: 1,05 M ₺/hafta harcama, 9,54 M ₺/hafta giriş), geri kalanı birikir: dünya ölçeğinde (200 oyuncu) 4 haftada ≈ 34 M ₺ ≈ 28 günlük musluğun **%4'ü**.
- **Okuma:** [O] ya da [K2]: `Dunya.mulk.para.kasalar[]` (`KasaDurumu`, `tipler.ts:863-885`), `kasaBakiyesi` (`mulk/kasa.ts:61`), `giris.sebeke`/`vergi`/`ithalat*` kalemleri, `gunler` (28 gün kayan pencere).
- **Eşikler.** (a) yeşil ≥ 1,0; sarı 0,6–1,0; kırmızı < 0,6 (kamu siparişleri karşılanamaz: ödenek yok, "ödeneği olmayan alım açılmaz"). (b) yeşil ≤ %6; sarı %6–%10; kırmızı > %10.
- **Kırmızıda.** (a): `kasaPayiPpm` 120.000 → 150.000 (ince ilçede 1,3×) **ya da** sipariş hacmini küçült; **dikkat: `kasaPayiPpm` ↑ lavaboyu (`sebeke`) azaltır ve R'yi düşürür (E1 üst).** (b): haftalık sipariş sayısı ≤ 5 → 8 ya da sipariş fiyatı 1,03 R → (tavan 1,035 R'a kadar) ya da `kasaPayiPpm` ↓ (ince ilçe riskini E7(a) ile birlikte ölç). **Para korunumu** her iki yönde tamsayı kuralıyla (kasa = ⌊ödeme × pay / 1e6⌋, lavabo = kalan) tam kalır.

### E8 Fiyat sınırına dayanan mal sayısı

- **Tanım.** NPC pazar referans fiyatı `fiyat[m] / tabanFiyat[m]` formülün sınırlarına dayanan mal sayısı: **alt sınır ≤ 0,26** (arz > talep, fiyat tabana çöker: doyma) ve **üst sınır ≥ 1,74** (talep > arz). Formül `pazar/piyasa.ts:123-134`: `oran = clamp((T − A)/min(T, A), −1, 1)`, `fiyat = taban + taban × oran × 0,75` ⇒ [0,25; 1,75] × taban. 23 mal; ayrı raporlanan: alt sınırdaki ve üst sınırdaki mal listesi, sınırda geçen saat.
- **Okuma:** [K2] `bolge_pazar_fiyat_taban_orani{mal}` (23 etiket) ya da [O] `sim.dunya.pazar.fiyat` ve `tabanFiyat` (`icerik.mallar[m].tabanFiyat`). **Kamu fiyat tavanı** (1,035 R, `mulk/kasa.ts:415-424`) başka şeydir: şebeke/kamu siparişi tavanıdır; bu metrik NPC fiyat bandıdır (açıklık için ikisi de adlandırılır).
- **Eşikler (24 saatlik medyan):** yeşil 0 mal; sarı 1–2 mal; kırmızı ≥ 3 mal **ya da** bir mal 48 sa kesintisiz sınırda. K-1 sorusu: 200 botta ekmek arz/emilim ≈ 2,26 (taban çöküşü, `bot-kurallari-g6-g8.md` §7 soru 4); canlı karşılığı bu metriktir.
- **Kırmızıda.** Alt sınır (taban): oyuncu arzı NPC emilimini aşıyor → `pazar.emilimSaat[mal]` ↑ (`parametreler.json:46-52`, ekmek 250.000 ppm; kapasite), yerel kanal payı ↑ (`yerelOlcek` **değil**, E3/E1'i bozar), bot/oyuncu başına ihracat oranı. Üst sınır: arz yetersiz → `pazar.arzSaat[mal]` ↑, ithalat çarpanı gözden. **`fiyatEsnekligiPpm` (750.000 → 600.000) en son** (tüm malların oynaklığını bozar). Zincir malı (ekmek, pencere, cam) sınırda ise E6/E10 ile birlikte okunur.

## 6. Bakım: E9 aşınma ve C

- **Tanım.** (i) **Aşınma yörüngesi:** aktif tesislerin `asinmaPpm` medyanı, **bakımsız** ve **bakımlı** oyuncu ayrı; çıktı kaybı = `asinmaPpm × asinmaVerimKaybiTavaniPpm / 1e6` (C: tavan %25). (ii) **Zincir çıktı kaybı** `1 − (1 − kayıp)^k` (k = zincir derinliği; çiftçi k = 2 ×2,78 mevcut, C'de 1,47). (iii) **Bakım uygulayan oyuncu payı** (`bakim_duzeyi`/`genel_onarim` komutu verenler, günlükten).
- **Okuma:** [O] `TesisDurumu.asinmaPpm` (`tipler.ts:173-174`) + `bakim_duzeyi` komutları; O2'nin mevcut ölçümü `packages/olcum/src/parsel-bakim.ts` (`--bakim-olc`, `--bakim-ozet`, `parsel-cli.ts:181-186`, YALNIZ OKUMA; bot koşusu için). [K2] `bolge_tesis_asinma_ppm` histogram/çeyreklik (tür etiketi).
- **Beklenen (C: kıtlık aşınması 10.000 ppm/gün, tavan %25; `asinmaHizCarpaniPpm` 500.000):** yönetimsiz zincir kaybı gün 14 %3,5 (k = 1) / %6,9 (k = 2) / %10,1 (k = 3); gün 45 %11,3 / %21,2 / %30,1; gün 70 %17,5 / %31,9 / %43,8; bakımlı/bakımsız çiftçi 1,455, tüccar 1,504 (O2 ölçümü). Aşınma ppm: gün 14 ≈ 140.000, gün 45 ≈ 450.000, tavana ≈ 100 günde (A2 §2.4).
- **Eşikler (zincir çıktı kaybı, k = 3 ekmek zinciri için):** yeşil gün 14 ≤ %12 ve gün 45 ≤ %32; sarı ≤ %18 ve ≤ %40; kırmızı üstü. **Ters kırmızı:** gün 45'te medyan aşınma < %5 (bakım "hiç kıtlık" değil, aşınma etkisiz: C anlamsız).
- **Kırmızıda.** Aşınma yüksek: `asinmaHizCarpaniPpm` 500.000 → **400.000** (E: 8.000 ppm/gün); tavan `asinmaVerimKaybiTavaniPpm` 250.000'de kalır. Aşınma düşük: 500.000 → 600.000. **Kırmızı ayrıca bakım parçası arzı:** başlangıç kiti parçası 40 → 60 (kit) ve `ilk_pencere` ödülü 8 parça (bot kuralı, sanayici bakımı Alfa-1). Sanayici bakımı bu listeye girmez (pazar sınırlı çıktı: net negatif, parça çarpanı önerisi A3 §5.10).
- **Uyarı (bot dünyası).** Mülk botları `bakim_duzeyi` vermiyor (O2 §7); canlı insan dünyası ile bot koşusu aşınmada **ayrılır**: raporlarda tek ortalama yazılmaz.

## 7. Ödül ve kit: E10

- **Tanım (GDD A0-10, `:1087`):** görev ödülü toplamı ≤ ₺8.000 ve kavram başına **bir kez**; ödül tutarı komutta yok. Tablo toplamı 6.790 ₺ (ilk_ekmek 5 ekmek ≈ 300 ₺, `ilk_pencere` 8 parça 1.440 ₺ vb., `defter-odul-teyit.md` §3). Kit pencere 3 (ilk dükkân 2,8): ayrı para alarmı yok; bakım parçası 40 (60 önerisi, E9).
- **Okuma:** [S] bugün **kısmen**: `bolge_odul_verilen_toplam` ve `bolge_odul_reddedilen_toplam` sayaçları (`metrik.ts:211-212`, `sunucu.ts:218`; ödül dedektörü `packages/sunucu/src/odul/dedektor.ts`). Oyuncu başına toplam **[O]**: günlükteki `odul` komutları ve `musluk.odul` farkı; dünya düzeyi `musluk.odul / oyuncu sayısı` [K2].
- **Eşikler.** Yeşil: oyuncu başı ödül ≤ 6.790 ₺, `odul_reddedilen` = 0. Sarı: 6.790–8.000 ₺ (yeni kavram eklendi). Kırmızı: herhangi oyuncu > 8.000 ₺ ya da ret > 0 (beklenmeyen ödül komutu).
- **İlgili izleme (aynı sayfada, ayrı satır yok):** `ilk_pencere` verilen sayısı / G8'e geçen oyuncu; ilk dükkânda pencere eksikliğinden **ret** (komut günlüğü: pencere yetersiz). Kırmızıda: ödül tablosu (`parametreler.json:11`) `ilk_pencere` 8 → 4 parça; **kit pencere ve dükkân bedeli dokunulmaz**.

## 8. Eşik çatışması ve K2/O2 işi

### 8.1 R, ZP8, geri ödeme üçgeni (tek kararla)

`yerelOlcek` yönü üç metriği zıt çeker: **↓** ⇒ R ↑, ZP8 ↓, geri ödeme ↑ (E5 kötüleşir); **↑** ⇒ tersi.

| Durum | İlk kaldıraç | `yerelOlcek` |
|---|---|---|
| R düşük, r < %10 | lavabo kalemleri (§2) | en son 40 → 35 |
| ZP8 kırmızı | yok (ZP8 doğrudan ölçeğe bağlı) | 40 → 35 |
| Geri ödeme kırmızı | bedel, gider (R'yi biraz düşürür) | en son 40 → 45, yalnız R ve ZP8 yeşilse |
| ZP8 kırmızı **ve** geri ödeme kırmızı | **çatışma** | baş lider kararı; öneri: ölçek sabit, geri ödemeyi bedel/gider, ZP8'i N yerleşim etkisi olarak izle |

`kasaPayiPpm` ↔ R (E7 ↑ ⇒ R ↓) ikinci çatışmadır; kasa kapasitesi kritik değilse (ince ilçe yok) `kasaPayiPpm` değişmez.

### 8.2 Uçta olmayan metrikler: "K2 işi" listesi

Bugün (7553b55) `/metrik` hiçbir ekonomi alanı sunmaz. **Seçenek 1 (önerilen, hızlı): O2'nin günlük oynatması** (`--kip cikarma`) genişletilir: günde bir örnek, dünya düzeyi `ekonomi` bölümü (E1–E3, E6–E9), oyuncu başına `r`, `ilk dükkân (b)`, geri ödeme, ödül toplamı. **Seçenek 2: K2 gauge'ları** (`metrik.ts` `MetrikGirdisi` `:132-166` + `metrikMetni` `:173-240` + `sunucu.ts` `metrikMetniUret` `:178-218`; sunucu `yazar.sim.dunya` içinden çekilir, `depoOnbellek` kalıbıyla 10 sn'de bir, `:176-180`). **Yalnız dünya toplamı**, oyuncu başına etiket yok (kardinalite).

| # | K2/O2 işi | Hangi metrik | Tür |
|---|---|---|---|
| K2-1 | `bolge_para_musluk_mili{kalem}` ve `bolge_para_lavabo_mili{kalem}` (kümülatif, ₺) | E1, E3 (Prometheus `increase`) | gauge (sayaç gibi) |
| K2-2 | `bolge_kasa_bakiye_mili`, `bolge_kasa_giris_mili{kalem}` | E7 (b), `R_kasa` | gauge |
| K2-3 | `bolge_pazar_fiyat_taban_orani{mal}` (23 mal) + `bolge_pazar_sinirda_mal` | E8 | gauge |
| K2-4 | `bolge_tesis_yontem{tur,yontem}` (anlık dağılım) | E6 anlık | gauge |
| K2-5 | `bolge_tesis_asinma_ppm{tur,ceyrek}` | E9 | gauge |
| K2-6 | `bolge_odul_musluk_mili` (`musluk.odul`) | E10 (dünya) | gauge |
| K2-7 | **Yatırım sayacı:** `yapiUygula`/`tesis_olcek_yukselt`/`kenar_gelistir` anında `lavabo.harcama`'dan ayrı `yatirim` kalemi (çekirdek değişikliği: K3, para defteri sürümü; **A2 önerisi, geri dönüşü zor**) | E2 | yeni kalem |
| K2-8 | **Dükkân başına kümülatif satış miktarı** (q) ve `DukkanDurumu.kurulus` | E4 (b), E5 | çekirdek alan (A3 şartnamesine eklenir) |
| O2-1 | `insan-cikarma.ts`: `tesis_olcek_yukselt` ve `kenar_gelistir` komutlarını `SERMAYE_KOMUTLARI`'na ekle (`:29`); dünya düzeyi çıktı (yalnız test oyuncusu değil) | E2, E4–E6 | O2 |
| O2-2 | `dukkan` olgusunu `kurulus`tan oku (şimdi ilk dükkân yapı komutu `:360`) | E4 | O2 |
| O2-3 | Bot ve insan oyuncuyu ayrı raporla (bot gerçekçilik dağılımı, `bot-kurallari-g6-g8.md` §1.1) | tümü | O2 |

**Hangi koşullarda hangisi.** İlk canlı gün için tek bakılacaklar [S]'de mevcut (ödül sayaçları) ve O2-1/O2-2 ile bir günlük oynatma; K2-1…K2-6 P5 sonrası ilk Alfa-0 haftasından önce eklenirse Grafana benzeri panoda E1, E3, E7, E8 canlı izlenir; K2-7 ve K2-8 çekirdek ve şartname işidir (Alfa-0'a yetişmezse E2 ve E5 yalnız [O] ile yaklaşık okunur).

## 9. İzleme çizelgesi

| Zaman | Ne okunur | Karar |
|---|---|---|
| Gün 1 (ilk 24 sa) | E10, E4 (kısmi), E8 | Para güvenliği ve ilk dükkân tıkanması; ayar yok |
| Gün 3 | E4, E6, E8 | Zincir ve dükkân tıkanması; kit/bedel ayarı olabilir |
| Gün 7 | E1, E2, E3, E5, E7, E9 | İlk ekonomi ayarı kararı (tek parametre, §2) |
| Gün 14 | E9 (ilk aşınma çeyreği), E1 yeniden | Bakım C ve R doğrulaması; gerekirse E varyantı |
| Haftalık | tümü | Ardışık iki pencere kuralı (E3), ayar sonrası 7 gün gözlem |

## 10. Doğrulanmayan ve açık sorular

1. Tüm eşikler öngörüdür; K-1 ve ilk hafta sonrası kalibre edilir. R sarı bölgesi (0,22–0,30) kâğıt tahminle çakışır: ölçüt r ile birlikte okunur.
2. `yerelNpc`, `lavabo.sebeke`, dükkân durumu alanları P5 sonrası oluşur; adlar A3 şartnamesine bağlıdır (alan adı öneri).
3. Canlı M insan karışımıdır (seçici/rehberli yok); G2 kararının tek kaynağı K-1 seçici M'dir.
4. E5 `ek net` tanımı NPC ihracat fiyatına göre (A2 §1.9); satış miktarı sayacı (K2-8) yoksa yaklaşıktır.
5. **Karar gerekli:** `R_kasa` bilgi olarak mı, E1'in resmi tanımı olarak mı (kasa girişi lavabo sayılsın mı)? Öneri: bilgi.
6. Bu belge ayar parametrelerinin **yönünü** verir; büyüklükleri (ör. `kasaPayiPpm` 150.000, `yerelOlcek` 35) K-1/K-2 sonrası kesinleşir. Bakım sanayicisi Alfa-1.
