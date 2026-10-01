# 06 — Çekirdek Simülasyon Spesifikasyonu (v0.1)

Bu belge Aşama 2 çekirdek simülasyonunun **kurallarını** tanımlar. v0.1 kalibrasyon kuralları ve v0.2 veri dengesi §10'dadır; Tarım katmanı (Faz B1) §11'de, Sanayi katmanı (Faz B2) §12'de, Pazar katmanı (Faz B3) §13'tedir. Kod sözleşmesi
`packages/veri/src/tipler.ts` ve `packages/cekirdek/src/tipler.ts` dosyalarındadır.
Sayılar başlangıç varsayımıdır; `packages/veri/icerik/parametreler.json` içinden ayarlanır.

## 1. Temel ilkeler

1. **Determinizm.** Aynı tohum + aynı komut günlüğü → bit bit aynı dünya (aynı `durumOzeti`).
   - Tüm durum tamsayıdır (mili-birim, mili-para, ms, ppm).
   - Çekirdekte `Math.random`, `Date`, `performance`, transandantal `Math` fonksiyonları yasaktır (ESLint).
     `Math.sqrt`, `Math.floor`, `Math.min/max`, `Math.abs`, `Math.trunc` serbesttir.
   - Diziler indeksle ve artan sırada gezilir. Nesne anahtarları gezilecekse önce sıralanır.
   - Rastgelelik yalnızca `ctx.rastgele(d, akis)` ile (sfc32, alt sistem başına ayrı akış).
2. **Tur yok.** Zaman ms cinsinden sürekli akar. Olaylar arasında tüm oranlar sabittir
   (parça-sabit). Üretim "zaman damgası × oran" ile tembel hesaplanır.
3. **Tek mal akışı.** Ekonomi, lojistik ve ordu aynı stokları ve aynı kenar kapasitesini paylaşır.
   Teknoloji ve politika bu akışın kurallarını değiştirir.
4. **Tavanlı bölme.** `a × b / c` işlemleri `carpBol(a, b, c)` ile yapılır (taşmaya karşı BigInt yedekli, aşağı yuvarlar).
   Girdi koruması: `a`, `b` güvenli tamsayı ve `c` pozitif güvenli tamsayı olmalıdır; `NaN`, `Infinity`, ondalık veya 2^53 üstü
   girdi anlamlı bir `RangeError` verir (BigInt'in anlamsız hatası yerine). `carpBolTavan` yukarı yuvarlar.

## 2. Motor

- Olay kuyruğu: ikili yığın, anahtar `(t, oncelik, sira)`. `sira` artan sayaçtır.
- `calistirKadar(t)`: kuyruktaki `≤ t` olayları sırayla işler, sonra `dunya.zaman = t`.
- `uygula(damgaliKomut)`: önce `calistirKadar(komut.t)`, sonra komutu ilgili alt sisteme
  yönlendirir, başarılıysa günlüğe ekler ve `ctx.kirlet(d)` çağırır. Emir değişimi **anında** geçerlidir:
  çözüm aynı `t`'de, `cozum` önceliğiyle çalışır.
- **Komut doğrulama (v0.1 düzeltmesi):** `t` güvenli tamsayı olmalı ve `dunya.zaman + 400 gün`ü aşmamalıdır (aksi halde hata sonucu;
  `t = 1e15` milyonlarca tıklık fiilen sonsuz döngü olurdu). `calistirKadar(t)` güvenli tamsayı ister (`RangeError`).
  Tüm sayısal komut alanları `Number.isSafeInteger` ile denetlenir: `ticaret_emri.oranSaat` ∈ [0, 1_000_000_000]
  (1e6 birim/saat), `vergi_ayarla.oranPpm` ∈ [0, 1_000_000], `askeri_rezerv.oranPpm` ∈ [0, 500_000], `birlik_uret.adet` ∈ [1, 100],
  `kenar_gelistir.kenar` geçerli kenar indeksi. `tesis_durum.aktif` ve `yaptirim.aktif` boolean olmalıdır; `anlasma_*`
  komutlarında `anlasma` yalnızca `"ticaret"` veya `"ortak_altyapi"` olabilir (çalışma zamanında doğrulanır).
- **Parametre alt sınırları (veri şeması):** sıfıra bölme yaratabilecek `lojistik.tamponSaat`, `askeri.ilanHazirlikSaatMin` ve
  `askeri.pencereSaat` en az 1 olmalıdır.
- `saatlik_tik` her tam sim-saatinde (t = k × SAAT) çalışır ve bir sonrakini planlar.
- `ctx.kirlet(d)`: `lojistik.kirli = true`; kuyrukta çözüm yoksa `max(d.zaman, …)` anına bir `cozum`
  planlar. Komut/tik/inşaat kaynaklı kirletmede çözüm **aynı t**'dedir. Eşik ve oran_delta
  kaynaklı kirletmede çözüm en erken `sonCozum + enAzCozumAraligiDakika`'dadır (titreşimi önler).
- `esik` olayı: `surum` stoktaki sürümle eşleşmiyorsa yok sayılır; eşleşiyorsa stok uzlaştırılır
  ve kirletilir (boşalan stok tüketicileri kısar, dolan stok israfa başlar).
- `oran_delta` olayı: stok uzlaştırılır, `gelenOran += delta`, eşik yeniden planlanır, kirletilir.

## 3. Stok (tembel birikim)

`anlik = miktar + floor((oran × (t − t0) + artik) / SAAT)`, `[0, kapasite]` aralığına kelepçelenir.
Taşan miktar `israf`'a yazılır. **İsraf yalnızca depo taşması ve yağma taşmasıdır (saldıranın deposuna sığmayan yağma);
bozulma ayrı izlenmez (v0.1).** Her oran değişiminde: uzlaştır → oranı ayarla → `surum++` →
eşik zamanını hesapla (boşalma: oran < 0 ve miktar > 0; dolma: oran > 0 ve miktar < kapasite) →
`esik` olayı planla. Hazine de bir `Stok`'tur (kapasite çok büyük, 0'ın altına inmez).

## 4. Ekonomi

**Mallar (v0, 12 adet):** `tahil, gida, cevher, komur, celik, bakir, silis, parca, elektronik, petrol, yakit, muhimmat`.
Ham (rezervden çıkarılır): `tahil, cevher, komur, bakir, silis, petrol`.

**Zincirler:**
| Zincir | Tesis | Varsayılan yöntem |
|---|---|---|
| Gıda | çiftlik (ova, rezerv tahil) → gıda fabrikası | tahil → gida |
| Çelik | cevher madeni, kömür ocağı → çelikhane | cevher + komur → celik |
| Makine | parça fabrikası | celik + yakit → parca |
| Elektronik | bakır madeni, silis ocağı → elektronik fabrikası | bakir + silis + parca → elektronik |
| Yakıt | petrol kuyusu → rafineri | petrol → yakit |
| Askeri | mühimmat fabrikası | celik + yakit → muhimmat |

**Tesis çalışması (her çözümde):**
- İstihdam: bölgenin işgücü (`nufus × isgucuPpm`) tesislere id sırasıyla dağıtılır.
  `isciPpm = atanan / yontem.isci`.
- Verim: `verimPpm = min(isciPpm, girdi yeterliliği)`. Girdi yeterliliği: girdinin stoğu > 0 ise %100,
  stok 0 ise `(yerel üretim + gelen akış) / ihtiyaç`. (Gıda ve ikmal girdileri tesislerden önce ayrılır.)
- Çıktı oranı = `ciktilar × verimPpm / PPM`, girdi oranı = `girdiler × verimPpm / PPM`.
- Bakım (`bakim`) tesis aktif olsun olmasın her zaman tüketilir (batma).
- Ham çıkarımda verim ayrıca `sqrt(rezervKalan / rezervIlk)` ile çarpılır (tamsayı karekök, ppm).
  Rezerv her saatlik tıkta üretilen miktar kadar azalır.

**Sahipsiz bölgeler "uykuda" (v0.1 düzeltmesi):** sahibi olmayan bir bölgede üretim, tüketim, bozulma ve rezerv tükenmesi yoktur:
lojistik çözümde hesapları sıfırdır (tüm stok yerel oranları 0, `uretimOrani` 0, tesis verimi 0, karşılanma %100), saatlik tıkta
nüfusu sabit kalır. Stok ve rezerv ilk değerinde donar; geç katılan oyuncu tükenmemiş bölgeye başlar. Bölgeyi biri sahiplenince
(`oyuncu_katil`) ilk çözümde (aynı `t`) normal hesaba geçer ve üretime başlar. Sahipsiz bölgeler zaten lojistiğe katılmaz.

**Nüfus (saatlik tık):** 1000 kişi başına `tuketim1000Saat` (gıda, yakıt, elektronik) tüketir.
Gıda karşılanma ≥ %95 ve vergi eşiğin altındaysa `buyumePpmGun/24` kadar büyür; gıda < %80 ise küçülür.

**Vergi:** hazineye saatlik `nufus/1000 × vergiTabani1000Saat × vergiPpm / PPM` eklenir
(hazine oranı olarak ayarlanır). Yüksek vergi (eşik üstü) büyümeyi keser.

**Bozulma (batma):** her mal için saatlik `miktar × bozulmaPpmGun / 24 / PPM` stok oranından düşülür.
**Depo:** mal başına `depoKapasitesi`; taşan üretim `israf` olur (bozulma israfa yazılmaz, yalnızca stoktan düşer). Bu iki kural "stok birikmesi"ni önler.
(v0.1 değerleri §10.4.)
**Para lavaboları (v0.1):** hazine oranından aktif tesis başına `tesisIsletmeParasiSaat` ve birlik başına `birlikMaasiSaat` düşülür (§10.2).

**Dünya pazarı:** yalnızca `liman` etiketli bölgelerden erişilir. Oyuncu limanda sürekli
`ticaret_emri` verir (ihracat/ithalat, birim/saat). Saatlik tıkta fiyat:
`fiyat = taban × (1 + e × clamp((T − A) / min(T, A), −1, +1))` ; `T` = pazar talebi (emilim + oyuncu ithalatı),
`A` = pazar arzı (arz + oyuncu ihracatı), `e = fiyatEsnekligiPpm`. Gerçekleşen ihracat en fazla
`emilimSaat`, ithalat en fazla `arzSaat` (oyuncular arasında istenen oranla orantılı, tamsayı).
İthalat fiyatı `× ithalatCarpani`, ihracat `× ihracatCarpani` (anlaşma/yaptırım çarpanları yerine geçer).
Pazar v1 açıkken (§13) bu çarpanlar açık NPC makasından türer ve liman primi, komisyon ve tarife de uygulanır. Ödemeler hazine oranına yansır. Hazine 0 iken ithalat gerçekleşmez: saatlik tıkta hazine 0 ise ithalat emri gerçekleşmez; ayrıca
tıklar arasında hazinenin tükenip mal gelmeye devam etmesini önlemek için lojistik çözümde ithalat hazineye sığdırılır (§10.2).

## 5. Lojistik (ana yenilik)

- **Ağ:** bölgeler düğüm, kenarlar kara/deniz/hava. Kenar kapasitesi (`kapasiteSaat`) **tüm mallar ve
  iki yön toplamıdır**; sivil ve askeri mallar aynı kapasiteyi paylaşır.
- **Erişim:** oyuncu, iki ucu kendisinin (veya `ortak_altyapi` anlaşmalı ortağının) olan kenarları
  kullanır. Sahipsiz bölgeler lojistiğe katılmaz (kendi kendine yeter).
- **Arz/talep (çözüm başında, bölge × mal):**
  - `talep` = tesis girdileri (tam verimde) + nüfus tüketimi + ordu ikmali + ihracat emri + bakım.
  - `yerel arz` = tesis çıktıları (istihdam ve rezerv verimiyle).
  - Açık = `max(0, talep − yerel arz)`, ayrıca stok `tamponSaat` × talebin altındaysa tampon doldurma payı.
  - Fazla = `max(0, yerel arz − talep)` + stok tamponun üstündeyse `(stok − tampon) / tamponSaat`.
- **Çözüm:** oyuncular kimlik sırasıyla, mallar `lojistikSirasi` ile (askeri ikmal ve gıda önce);
  her mal için tamsayı **ardışık en kısa yol min-maliyet akışı** (maliyet = taşıma süresi),
  kaynak = fazla, hedef = açık, kenar kapasitesi = kalan kapasite. `askeriRezervPpm` kadar kapasite
  sivil akışa kapalıdır (**sert rezerv**); askeri akış (`muhimmat`, ordu ikmalindeki mallar) tüm kapasiteyi kullanabilir.
  Kullanılmayan rezerv sivile açılmaz.
- **Gecikme:** akış `f` kaynakta hemen düşülür; hedefe `t + yol süresi`nde `oran_delta(+f)` ile ulaşır.
  Sonraki çözüm akışı `f'` yaparsa fark `(f' − f)` aynı gecikmeyle planlanır; yoldaki mal korunur.
- **Kapsam ("nerede açık, neden"):** her bölge × mal için karşılanma oranı, en yakın kaynağa süre
  (çok kaynaklı Dijkstra) ve neden: `kapasite` (yol var ama kenar dolu), `girdi_eksik` (hiçbir yerde fazla yok),
  `mesafe` (kaynak > 72 saat), `erisim_yok` (yol yok), `yok` (karşılanıyor).
- **Kenar geliştirme** (karar): `gelistirmeMaliyeti` + `gelistirmeParasi`, `gelistirmeSuresiSaat` (erken oyun çarpanıyla kısalır, §10.1) sonra
  kapasite `+gelistirmeArtisPpm`.

## 6. Askeri

- **Birlik üretimi:** `birlik_uret` maliyeti bölge stoğundan hemen düşer, `partiSuresiSaat` (erken oyun çarpanıyla kısalır, §10.1) sonra birlik eklenir. Her birlik saatlik `birlikMaasiSaat` para gideri doğurur (§10.2).
- **İkmal:** her birlik `ikmal` malını saatlik tüketir (lojistik talebi). Karşılanma oranı
  (`ikmalKarsilanmaPpm`) savaş gücünü çarpar. İkmalsiz ordu güçsüzdür.
- **Savaş:** `savas_ilan` → saldıran bölge hedefe kenarla komşu olmalı, hedef sahibi korumada olmamalı.
  Hazırlık `U(ilanHazirlikSaatMin, ilanHazirlikSaatMax)` (savas akışı), sonra `pencereSaat` pencere.
  Pencere kapanınca **otomatik çözüm** (ilan kuralları aşağıda):
  `güç = Σ(adet × guc) × ikmalKarsilanma × (savunan için arazi ve duruş çarpanları)`; küçük rastgele
  sapma (±%10, savas akışı). Kazanan belirlenir; kaybeden %30, kazanan %10 birlik kaybeder. Birlik kaybı **yukarı yuvarlanır**
  (`carpBolTavan`): adet > 0 ve oran > 0 ise her birlik türünde kayıp en az 1 (küçük ordular kayıpsız kalmaz), en çok adet kadardır.
- **Kayıp tavanı (H5):** saldıran kazanırsa hedef bölgeden her mal için `yagmaOraniPpm` kadar alınır,
  ama **tek noktada** `min(hesap, kayipTavaniPpm × stok)` ile kelepçelenir. Alınan mal saldıranın bölgesine eklenir.
- **İlan kuralları (kayıp tavanını korur, v0.1 düzeltmesi):** `savas_ilan` şu durumlarda reddedilir:
  (a) hedef bölgede bitmemiş (`hazirlik`/`pencere`) herhangi bir savaş varsa (saldıran kim olursa olsun);
  (b) hedef bölge yağmalandıysa (bir savaşta saldıran kazandı ve toplam stok kaybı > 0) çözüm anından (`pencereBitis`) itibaren
  `pencereSaat` (24 sa) boyunca; bu `dunya.savaslar` taranarak denetlenir (sözleşmeye alan eklenmez);
  (c) saldıran bölge zaten bitmemiş bir savaşta saldıran ise (ordu çoklanmaz). Mevcut kural da sürer: aynı iki bölge arasında
  (her iki yönde) bitmemiş savaş olamaz.
  **Garanti:** bir bölgede iki yağma arası en az `pencereSaat + hazırlık(≥1) + pencereSaat` olduğundan herhangi `pencereSaat`'lik
  (24 saat) kayan pencerede en çok bir yağma olur; her mal için pencere kaybı ≤ `kayipTavaniPpm` (%25). Yağma yapılmayan savaşlar
  (savunan kazandı, sonuçsuz, hedef stoğu boş) beklemeye yol açmaz.
- **Hazır savunma emirleri:** `savunma` duruşu savunma gücünü artırır ama ordunun ikmal talebini artırmaz;
  `geri_cekil` birlikleri korur (kayıp yok) ama savunma gücü 0'dır. Emirler çevrimdışıyken de geçerlidir.
- **Yeni oyuncu koruması:** katılımdan itibaren `yeniOyuncuKorumasiGun`; korumadaki oyuncuya savaş ilan edilemez.

## 7. Teknoloji (sığ, veri güdümlü)

6 düğüm; her biri **yeni yöntem, tesis türü veya karar** açar, yüzde artış vermez.
`arastir` maliyeti hazineden düşer; `sureGun` sonra açılır. Aynı anda tek araştırma. Süre erken oyun çarpanıyla, maliyet ve süre teknoloji yayılımıyla kısalır (§10.1, §10.3).

## 8. Politika (sığ)

- `ticaret` anlaşması: iki taraf da teklif edince aktif; pazar çarpanları `anlasma*` değerlerine iyileşir.
- `ortak_altyapi` anlaşması: taraflar birbirinin kenarlarını lojistikte kullanabilir.
- `yaptirim`: hedef oyuncunun pazar çarpanları `yaptirim*` değerlerine kötüleşir (en az bir yaptırım yeterli).
- `vergi_ayarla`: vergi oranı (ppm).

## 9. Ölçüm için dünya çıktıları

`uretimToplam` (bölge × mal kümülatif üretim), `israf`, `pazar.fiyat`, `lojistik.kapsam`,
`kenarlar[].kullanilanSaat/askeriKullanilanSaat`, `savaslar[].sonuc`. Ölçüm takımı bunlardan H1–H3, H5–H7'yi hesaplar.

## 10. v0.1 kalibrasyon kuralları

Kaynak: ilk ölçüm (v0) bulguları (`docs/olcum/v0-t1-3.md`). Sayılar `parametreler.json` / `icerik.json` içindedir.

### 10.1 Erken oyun hızlandırması (PDF zaman kuralı 2)

Oyuncunun katılımından itibaren geçen süre `gecen = t − katilmaZamani` için **süre çarpanı**:

| `gecen` | çarpan |
|---|---|
| `≤ sabitSaat` | `baslangicCarpaniPpm` |
| `sabitSaat < gecen < bitisSaat` | doğrusal olarak `PPM`'e yükselir |
| `≥ bitisSaat` | `PPM` (normal süre) |

Kapsam: `tesis_insa`, `kenar_gelistir`, `birlik_uret` (parti), `arastir` süreleri. Çarpan işin başladığı anda bir kez hesaplanır;
süre `max(1 dakika, özgün × çarpan)` olur (özgün süre bundan kısaysa özgün süre). Savaş hazırlık ve pencere süreleri ETKİLENMEZ
(çevrimdışı koruma kuralları sabit). Geç katılan oyuncu kendi katılımından sayar ve aynı hızlandırmayı alır (yetişme yardımı, H6).
Kod: `cekirdek/src/erkenOyun.ts` (`sureCarpaniPpm`, `hizlandirilmisSure`).
v0.1 değerleri: `baslangicCarpaniPpm = 100000` (%10: 4-12 saatlik inşa 24-72 dakika), `sabitSaat = 24`, `bitisSaat = 168`.

### 10.2 Para lavaboları

Hazine net oranı = vergi + ihracat − ithalat − **`aktif tesis × tesisIsletmeParasiSaat`** − **`birlik × birlikMaasiSaat`**
(pasif tesis, `tesis_durum aktif=false`, gider yazmaz). **Ödeme gücü:** oyuncunun hazinesi 0 ve net oranı negatifse
(`gider > gelir`) tüm tesislerinin potansiyel verimi `gelir / gider` (ppm) ile çarpılır ("maaş ödenemiyor"); ithalat zaten
hazine 0 iken gerçekleşmez.
**İthalat ve hazine (v0.1 düzeltmesi):** hazine yeterliliği saatlik tıkta denetlendiğinden, tıklar arasında hazine 0'a inerse mal bedava
gelmeye devam ederdi. Lojistik çözümde (hazine oranı ayarlanmadan önce) oyuncunun net oranı negatifse gerçekleşen ithalat, hazine
bir sonraki saatlik tıka kadar (en çok 1 saat) yetecek şekilde ölçeklenir: izin verilen ithalat gideri/saat ≤ gelir/saat − diğer
giderler/saat + anlık hazine × `SAAT` / `kalanMs` (`kalanMs` = sonraki tama saate kalan süre, (0, SAAT]); aşılıyorsa tüm
ithalat emirlerinin gerçekleşen oranı aynı oranla küçülür (tamsayı, aşağı yuvarlama; hazine 0 ise izin verilen ithalat en çok
`gelir − diğer giderler`). Ödeme gücü, ithalat kısıldıktan sonraki gider üzerinden hesaplanır. Gerçekleşen oran yalnızca düşer
(aynı saat içinde tekrar çözümlenince ölçekleme kendini tekrarlamaz); saatlik tık emirleri yeniden gerçekleştirir. Sonuç: hazine
hiçbir zaman ödenmemiş mal getirmez (ithal mal değeri ≤ ödenen para + yuvarlama toleransı). Bilinen sınır: ölçekleme ihracat gelirini
tahminle (çözüm öncesi gerçekleşen oran) sayar; girdi kıtlığı ihracatı sonradan kısarsa hazine en çok 1 saat içinde erken tükenebilir. Hazine pozitifken giderler hazineden karşılanır ve verim tamdır; hazine pozitif olunca kısıntı kalkar.
Kısıntı saatlik tıkta (en geç 1 saat içinde) devreye girer. Hazine negatife inmez.
v0.1 değerleri: `tesisIsletmeParasiSaat = 60000` (60 para/saat), `birlikMaasiSaat = 8000`. Hedef: 4 botlu 30 günlük koşuda brüt gelirin
kabaca %40-60'ı lavabolara gider.

### 10.3 Teknoloji yayılımı

`arastir` komutunda, teknolojiyi bilen DİĞER oyuncuların payı `p = bilen / (oyuncuSayisi − 1)` (tek oyuncuda 0). Maliyet ve süre
`(1 − p × yayilimIndirimiPpm / PPM)` ile çarpılır (erken oyun çarpanı yalnızca süreye ayrıca uygulanır). v0.1: `yayilimIndirimiPpm = 500000`
(herkes biliyorsa yarı maliyet ve yarı süre). Doğrulayıcı en çok 900000'e izin verir.

### 10.4 Bozulma, depo ve dünya pazarı (v0.1 notu)

- Bozulma (ppm/gün): tahıl 10000, gıda 20000, cevher/çelik/bakır/silis/parça/mühimmat 2000, kömür/elektronik/petrol 3000, yakıt 5000.
  Depo: `depoKapasitesi = 10000000` (10 000 birim/bölge/mal).
- Pazar fiyatı `taban × (1 + e × oran)` ve ihracat ≤ `emilimSaat` olduğundan, doymuş (emilim tamamen dolu) ihracatta alt fiyat
  `taban × (1 − e × arzSaat / emilimSaat)` olur. Ham malların `emilimSaat` değerleri v0'ın 2-3 katına çıkarıldı (tahıl 360, gıda 300,
  cevher 360, kömür 450, bakır 200, silis 240, petrol 400 birim/saat), `arzSaat` ise emilimden belirgin düşük tutuldu
  (ithalat için yeterli, doygun ihracatta fiyat tabanın ~%60-75'inde kalır; v0'da %40'a yapışıyordu).
- Not: v0 botları ihracat emrini `0.4 × emilimSaat` ile sınırlar; 3 bot aynı malı ihraç ederse emilim (1.2×) her zaman dolar.
  Bu nedenle kömür/cevher için tam çözüm botların fiyata duyarlı ihracatıdır (bot tarafı; v0.2.1'de yapıldı, bkz. §10.6).

### 10.5 v0.2 veri dengesi (işleme zinciri ve işlenmiş mal pazarı)

Kaynak: [07 Ö2 ve Ö3](07-tasarim-onerileri.md). **Yalnızca veri** değişti (`icerik.json`, `parametreler.json`); çekirdek kuralları ve doğrulayıcı aynıdır.

**Yöntemler (işçi başına katma değer).** KD = Σ çıktı × taban − Σ girdi × taban (para/saat); işçi başına KD = KD × 1000 / işçi. Hedef: zincir yöntemleri ham çıkarımla (250-400) yarışsın, ham çıkarım anlamsızlaşmasın.

| Yöntem | Değişen alan | Önce → sonra | KD/işçi (önce → sonra) |
|---|---|---|---|
| `yuksek_firin` | işçi; çıktı çelik | 12 000 → 7 000; 50 000 → 60 000 | 83 → 314 |
| `elektrik_ark` | girdi cevher; girdi yakıt; çıktı çelik; işçi | 80 000 → 60 000; 30 000 → 20 000; 50 000 → 60 000; 9 000 → 10 000 | 22 → 310 |
| `standart_parca` | işçi | 10 000 → 5 500 | 140 → 255 |
| `standart_muhimmat` | işçi | 8 000 → 5 000 | 175 → 280 |

`elektrik_ark` artık `yuksek_firin`'a göre gerçek bir takastır: aynı çelik çıktısı (60), ama %40 daha çok işçi, tesis başına daha yüksek KD (3 100 / 2 200), kömürsüz ve %40 daha az cevher; bedeli yakıt akışı (20) ve 3 günlük / 30M araştırmadır. İşgücü kısıtlı bölgede iki yöntem başabaş (≈ 310), girdi kıtlığı olan bölgede (kömürsüz, petrollü) ark ocağı öne geçer. Sabit gider/KD: çelik %15, parça ve mühimmat %17 (hedef ≤ %20). Gıda, rafineri, elektronik ve ham çıkarım yöntemlerine dokunulmadı.

**İşlenmiş mal pazarı (`pazar.emilimSaat` / `pazar.arzSaat`, birim/saat).** Ham maddelere ve mühimmata dokunulmadı.

| Mal | emilim (önce → sonra) | arz (önce → sonra) |
|---|---|---|
| çelik | 120 → 300 | 100 → 260 |
| parça | 80 → 200 | 80 → 170 |
| elektronik | 50 → 120 | 50 → 100 |
| yakıt | 150 → 300 | 150 → 260 |

Sonuç: tek fabrikanın ihracatında fiyat/taban elektronikte 0.55 → 0.94, parçada 0.63 → 0.96 (07 Ö3). Bilinen sınır (v0.2.1'de giderildi, bkz. §10.6): mühimmat pazarı (emilim 50 < arz 80) taban altında (0.55) kalıyordu; mühimmat piyasa değeri ile üretilmez, yalnızca ordu ikmali ve birlik için üretilir.

Ölçüm özeti (4 botlu 30 günlük koşu, tohum 1-3; eski → yeni): lavabo / (vergi + ihracat − ithalat) 0.48 / 0.37 / 0.51 → 0.30 / 0.33 / 0.38 (hedef 0.3-0.6; alt sınıra yakın, brüt vergi + ihracata göre 0.13 → 0.11); 30. günde çelik üretimi 3 600-5 500 → 5 800-8 600 birim/gün (stok artıyor, israf 0); `elektrik_ark` 2-3 tesiste kullanılıyor (önceden 0); elektronik israfı 15-40 bin → 26-51 bin birim (önceden de vardı, artıyor). H1 (tohum 1): %68.8 ihracatçı (değişmedi).

Test notu: pazar derinliğine bağlı iki test dosyası güncellendi (`ekonomi-pazar.test.ts`: yakıt emilimine bağlı paylaşım sayıları; `duzeltme-hazine-ithalat.test.ts`: çelik pazarı test içinde eski değerlere sabitlendi, çünkü sınanan ithalat-hazine mekanizması fiyat yuvarlamasının içerik dengesinden bağımsız olmasını ister).

### 10.6 v0.2.1 pürüzler

Kaynak: v0.2 veri dengesi sonrası 4 botlu 30 günlük koşuda görülen pürüzler. Çekirdek kuralları ve doğrulayıcı değişmedi; **veri bir parametre çiftiyle, geri kalanı bot tarafıyla** ilgilidir.

**Veri (`parametreler.json`, `pazar`).** Mühimmat pazarı, işlenmiş mallardaki mantıkla (emilim ≈ 1,2 × arz; boş pazar fiyatı ≈ 1,15 × taban) dengelendi. Fiyat formülü `taban × (1 + 0,75 × clamp((T − A) / min(T, A)))` olduğundan emilim < arz fiyatı 0,55 × tabana kilitliyordu (kimse ticaret yapmadığında T = emilim, A = arz).

| Mal | emilim (önce → sonra) | arz (önce → sonra) | Boş pazar fiyatı (önce → sonra) |
|---|---|---|---|
| mühimmat | 50 → 120 | 80 → 100 | 0,55 × → 1,15 × |

Tek mühimmat fabrikası (40 birim/saat) ihraç ederse fiyat ≈ 0,875 × tabana iner; yani fiyat 0,9–1,2 × bandında salınır ve mühimmat üretimi piyasa için değil ordu ikmali için anlamlı kalır (bot bu malı yalnızca depo dolmak üzereyse ihraç eder, aşağıya bakın). `icerik.json`'a dokunulmadı (mühimmat yöntemi ve fabrikası aynı). Ölçüm (tohum 1-3, gün 5-30 ortalama fiyat/taban): mühimmat 0,55 → 1,00–1,07 (aralık 0,67–1,15).

**Bot ticareti fiyat ve depo duyarlı** (`packages/botlar/src/planlayici.ts`, `ticaretAdaylari`). Eski sınırlar (ihracat ≤ 0,3–0,4 × emilim, fiyat ne olursa olsun) kaldırıldı; emilim ≈ arz oranı nedeniyle 3 bot aynı malı satınca doygun pazarda fiyat çöküyor, dağınık (toplam oranı düşük) stok ise bölge depolarında israf tavanına çıkıyordu. Kurallar (hepsi deterministik; yalnızca canlı fiyat, stok ve depo doluluğu okunur):
- **İhracat ölçeği** `ihracatFiyatCarpani(fiyat/taban)`: taban oranı 0,95 ve üstünde 1, 0,55 ve altında 0, arası doğrusal. Hedef oran ve tavan (0,4 × emilim) bununla çarpılır: fiyat düştükçe ihracat azalır, 0,55 altında durur.
- **Depo acil (`DEPO_ACIL_ORANI` = 0,7):** malın herhangi bir bölgedeki deposu %70'in üstündeyse israf başlamak üzeredir. İhracat fiyat ölçeğine alt sınır (0,35) konarak sürer, tavan 0,6 × emilime çıkar, `%60 üstü stok / 24 saat` hedefi eklenir, toplam stok oranı eşiğin altında kalsa da devreye girer ve mühimmat gibi askeri mallar da ihraç edilebilir (ordu rezervi korunur: yalnızca dolu depo).
- **İthalat ölçeği** `ithalatFiyatCarpani`: taban oranı 1,0'a kadar 1, 1,5'te 0,3 (zorunlu ihtiyaç tamamen kesilmez); fiyat < 0,85 × tabansa tavan 1,25 × (ucuzken biraz fazla). İthalat limanının deposu %70'in üstündeyse ithalat başlamaz/iptal edilir; herhangi bir depo %70 üstündeyse yarıya iner.
- **Liman seçimi:** ihracat malı en çok tutan limandan, ithalat en az tutan limandan yapılır (mevcut emrin limanı korunur); ayrıca kendi deposu %70 üstü dolu her limanda kendi fazlası için ihracat emri açılır (eskiden yalnızca indeksi en küçük liman kullanılıyordu).
Ölçüm (tohum 1-3, 30. gün; eski → yeni): yakıt israfı 84 / 83 / 65 bin → 0 / 0 / 0; elektronik israfı 40 / 27 / 51 → 42 / 20 / 27 bin (kısmen azaldı; bkz. bilinen sınır). Bot ticareti değiştiği için piyasa yolları bütünüyle farklıdır; sayılar aynı tohumun eski ve yeni bot sürümü koşularıdır.
Bilinen sınır: kalan elektronik israfı limansız üretici bölgelerde (örn. fabrikası olan ama limana bağlantı kapasitesi yetmeyen bölge) birikir ve ihracat emriyle boşaltılamaz (kenar kapasitesi bağlayıcı; ihracat emri yalnızca limanda); ayrıca elektronik pazar derinliği (emilim 120) birkaç fabrikanın çıktısından dar, fiyat 0,7 × civarında kalır. Çözüm adayları: üretici bölgede fabrikayı kısmak (`tesis_durum`), elektronik emilimini derinleştirmek veya bot inşa kararında pazar doygunluğunu görmek (denendi, sonuç gürültü içinde kaldığı için alınmadı).

**Militarist bot: koruma farkındalığı** (`packages/botlar/src/askeri.ts`). Yeni oyuncu koruması 7 gündür (`yeniOyuncuKorumasiGun`; katılım t = 0 ise `korumaBitis` = 7. gün). Davranış: militarist t = 0'dan itibaren mühimmat fabrikası kurar, birlik üretir ve ikmal/rezerv ayarlar (2. günde 70+ birlik, birkaç fabrika), savaş ilanı ise ancak hedef oyuncunun koruması bitince (`korumaBitis ≤ t`) üretilir; ilk ilan korumanın bittiği 7. günde (t = 168 saat) verilir, tohum 1-3'te üçünde de ilk ilan tam 7,0. günde. Yeni `savasIlanEdilebilir` çekirdeğin `savas_ilan` denetimlerini komut üretmeden önce yineler: hedef korumada, hedef bölgede bitmemiş savaş, hedef `pencereSaat` içinde yağmalanmış, iki bölge arasında sürüyor ya da saldıran bölge zaten başka savaşta saldıran ise aday üretilmez. Sonuç: 30 günlük 4 botlu koşuda reddedilen `savas_ilan` komutu 13 / 11 / 18 → 0 / 0 / 0; ilan sayısı 15 / 14 / 15 → 25 / 25 / 26 (reddedilen denemeler yerine geçerli alternatif hedefler seçildiği için). Bilinen sınır: bot kararları 6 saatlik ızgarada verildiğinden, katılımı ızgaraya denk gelmeyen oyuncuların koruma bitişinde en çok 6 saat gecikme olur.

## 11. Tarım katmanı (v1)

Kaynak: [08 §1 ve §7-B1](08-alti-katman.md). Çekirdek: `packages/cekirdek/src/tarim/`; üretim çarpanı `ekonomi/uretim.ts` içinde. Aşağıda yalnızca kurallar vardır; gerekçe, sayı tabloları ve ölçüm hedefleri 08'dedir.

**Açma/kapama (regresyon kalkanı).** Tarım, yalnızca `parametreler.iklim` **ve** `parametreler.tarim` tanımlıysa açıktır (varsayılan oyun artık tarımlıdır). Kapalıyken `Dunya.iklim` ve `BolgeDurumu.tarim` **tanımsızdır** (durum özetine girmez), kuyrukta `iklim_gunluk` yoktur, `olay` akışından çekim yapılmaz; sonuç v0.2 ile birebir aynıdır (test: eski içerik + tarım kapalı 4 botlu koşuda aynı `durumOzeti`). Tüm tarım veri alanları opsiyoneldir (`bolge.tarim`, `icerik.tarimUrunleri`, `yontem.tarimsal/sulama`, `tesisTuru.tarimTesisi`); `surum` alanları 1'dir. Sözleşmeden sapma: 08'deki `BolgeDurumu.tarim: ... | null` ve `Dunya.iklim` **opsiyonel** (`?`) yapıldı ki kapalı mod özeti değiştirmesin.

**İklim takvimi (K20/K21; "sezon" yoktur, dünya sıfırlanmaz).** `mutlakGun = baslangicGunu + floor(t x gunCarpani / GUN)`; takvim günü = `mutlakGun mod 365` (0 = 1 Ocak); ay, `ayGunleri` kümülatifiyle tamsayı aramayla bulunur. **Varsayılan gerçek takvimdir** (`gunCarpani = 1`, `baslangicGunu = 273` = 1 Ekim); ölçüm için `gunCarpani = 12` (1 ay ~ 2,5 gün) kullanılabilir. Olay `iklim_gunluk` (öncelik 5) her takvim günü başında çalışır (sonraki tık `ceil(j x GUN / gunCarpani)`), sonunda lojistiği kirletir.

**Hasat oranı eğrisi.** 6 iklim tipinin her birinde 12 aylık eğri (toplamı tam 12 x PPM). Günlük değer, ay ortaları arasında tamsayı doğrusal enterpolasyondur (`hasatEnterpole`); ay uzunlukları eşit olmadığından günlük tablo, 365 günün toplamı tam 365 x PPM olacak biçimde ölçeklenir (iklim toplam üretimi değil zamanlamayı değiştirir). Sulama (`sulama` yöntemli tesis çalışırken) yalnız 1'in altındaki dipleri `sulamaDipPpm x sulanabilirPpm` oranında yumuşatır.

**Toprak ve ekim planı (T1).** `BolgeTarimDurumu`: `toprakPpm` (başlangıç PPM), `ekimPpm[]` (ürün payları, toplam PPM; başlangıç %100 ilk ürün), `gubreDozu`, `iklimPpm`, `olayKaybiPpm`, `gubreKarsilanmaPpm`. Günlük tikte, **yalnız sahipli ve ekili (rezervli tarımsal yöntemli) aktif tesisi olan** bölgede `toprak += Σ ekim[i] x urun[i].toprakDegisimPpmGun / PPM + doz x gubreToprakPpmGun x gubreKarsilanma / PPM`, `[toprakTabaniPpm, PPM]` aralığına kelepçelenir; sahipsiz bölge uykudadır (toprak donar; iklim ve olay dünya durumudur, sürer). Komut `ekim_plani {bolge, ekimPpm[]}`: sahip olmalı, bölgenin tarım alanı olmalı, ürün sayısı kadar eleman, paylar 0..PPM tamsayı, toplam PPM. `tesis_insa`: çiftlik + ahır + mera (`tarimTesisi`) toplamı (devam eden inşaat dahil) `bolge.tarim.tarimTesisTavani`'nı aşamaz.

**Üretim çarpanı (08 §0.2-b).** Tarımsal (`tarimsal`) yöntemde rezerv verimi (`sqrt`) yerine çıktıya `toprakTabanPpm x toprak x iklim x ürün x gübre` uygulanır (her çarpım `carpBol`; PPM'i aşabilir) ve bölgede rezerv (tahıl) tükenmez. Ürün çarpanı: ekili yöntemde `Σ ekim[i] x ciktiPpm[i] x (1 - olayKaybi x duyarlılık[i])`, ekilmeyen tarımsal yöntemde (mera) `1 - olayKaybi`. Girdi ve işçi hesabı değişmez; çıktı yalnız çarpılır.

**Yayılan iklim olayları (T3).** Günlük tikte bölge indeksi artan, her bölge için olay türü sırası sabit (`kuraklik, don, sel, kis_firtinasi`) **tam bir çekim** (`ctx.rastgeleAralik(d, "olay", PPM)`; çekim sayısı olaydan bağımsız sabit); `olasilik = olasilikPpmGun[ay] x tipCarpani[tur][iklimTipi] / PPM`. Olay oluşursa iki ek çekim (şiddet, süre). Olay önce `uyariSaat` (24 sa) uyarı ilan eder, sonra etki başlar ve süre boyunca doğrusal söner. Yayılma, yaratılırken **kara kenarlarıyla** BFS ile (`menzilKenar`, her kenarda `yayilimPpm`) bir kez hesaplanıp olaya yazılır; deniz/hava kenarı yaymaz. Bölge etkisi, etkin kuraklik/don/sel olaylarının çarpımsal birleşimidir; sulama kuraklık şiddetini `sulamaKuraklikKorumaPpm x sulama x sulanabilir` kadar azaltır. `kis_firtinasi` B1'de tarımı etkilemez (Lojistik B5).

**Gübre (T4).** `gubre_dozu {bolge, doz}`: 0..`azamiGubreDozu`. Her ekili/tarımsal aktif tesis, doz x `gubreTuketimiSaat` kadar `gubre` girdisi ister (lojistikte normal talep); girdi karşılandıkça (`gubreKarsilanmaPpm`) çıktıya doz x `gubreCiktiEkiPpm` ve toprağa doz x `gubreToprakPpmGun` verir. Gübre **verimi sınırlamaz** (yalnız etkisi azalır). **Kaynak kararı (08 B2 öncesi en küçük karşılık):** yeni mal `gubre`; `gubre_fabrikasi` (`azotlu_gubre`: petrol 50 -> gübre 40; elektrik girdisi B2'de eklenecek); ahır (tahıl -> gıda + gübre) ve mera (T5, `tarimsal`, gıda + gübre) içerikte vardır; pazarda `emilim 200 / arz 150` birim/saat. Başlangıç stokunda gübre yoktur.

**Bot.** `ekim_plani` ve `gubre_dozu` adayları `botlar/planlayici.ts` `tarimAdaylari`'nda: üç şablon (monokültür / ekim nöbeti 50-25-25 / toparlanma), toprak eşikleriyle histerezisli; gübre yalnız erişilebilirse (yurt içi üretim, stok, liman + makul fiyat) doz 3 + gübreli monokültür; `kur_ve_unut` ilk planında bir kez ekim nöbeti verir.

## 12. Sanayi katmanı (v1)

Kaynak: [08 §2 ve §7-B2](08-alti-katman.md). Çekirdek: `packages/cekirdek/src/sanayi/` (`tablo`, `elektrik`, `carpan`, `gunluk`, `damar`, `komut`); üretim çarpanı zinciri ve elektrik uygulaması `ekonomi/uretim.ts` içindedir. Aşağıda yalnızca kurallar ve 08'den **sapmalar** vardır; gerekçe ve ölçüm hedefleri 08'dedir.

**Açma/kapama (regresyon kalkanı).** Sanayi, yalnızca `parametreler.sanayi` tanımlıysa açıktır (varsayılan oyun sanayilidir; Tarım gibi opsiyonel, `surum` alanları 1'dir). Kapalıyken `BolgeDurumu.elektrik/kirlilikPpm/kesifSayisi/bakimKarsilanmaPpm`, `TesisDurumu.olcek/asinmaPpm/onarimBitis` ve `OyuncuDurumu.bakimDuzeyi` **tanımsızdır** (durum özetine girmez), `saatlik_tik` sanayi çağırmaz, `sondaj_bitti` hiç planlanmaz, sanayi komutları reddedilir, içerikteki elektrik girdisi/çıktısı, `kirlilikPpmSaat` ve `hidro` alanları **yok sayılır** (depolanamaz mal her durumda stok/lojistik çiftlerinden çıkarılır). Sonuç Tarım v1 ile birebir aynıdır. Kanıt: (i) `test/sanayi-regresyon.test.ts`: B2 öncesi veri fikstürü (`test/fikstur-b1/`, sanayi/elektrik/santral yok) + sabit komut dizisi, B2 öncesi kodla üretilmiş altın durum özetleriyle eşit (tohum 5 ve 6; 3., 7., 12. gün); (ii) yeni içerikte sanayi parametresi silinince elektrik/kirlilik/hidro alanlarını içerikten silmekle aynı özet; (iii) B2 öncesi veri + 4 botlu koşu (sentetik-50, tohum 1-2, 6 gün) B2 öncesi kodla aynı `durumOzeti`. Test yardımcıları: `yenilikleriKapat` artık `param.sanayi`yi ve mini haritanın başlangıç santrallerini de siler; `sanayiAc` açar.

**Elektrik (S1; depolanamaz mal).** Yeni mal `elektrik` (`kategori: "enerji"`, `depolanabilir: false`, gölge fiyat 10 para): stok tutulmaz, lojistik/pazara girmez, `ticaret_emri` reddedilir, `uretimToplam` yazılmaz; yalnız bölge içi anlık denge. Santral yöntemleri çıktıyı `ciktilar.elektrik`, tüketiciler `girdiler.elektrik` olarak yazar (`ekonomi/tablo.ts` bunları stok çiftlerinden ayırır). Her çözümde `bolgeVerimCoz` içinde (girdi yeterliliğinden sonra, brownout yinelemesiyle):

```
kapasite = Σ santral  elektrikCikti x ölçek x [akarsu (hidro)] x aşınma cezası x verimOn
talep    = Σ tüketici elektrikGirdi x ölçek x verimOn   +   nüfus/1000 x tuketim1000Saat.elektrik
arz      = kapasite x (PPM - iletimKaybiPpm) / PPM
karsilanma = min(PPM, arz / talep)                 // ortak; haneOnceligi: hane önce, kalan tesislere
tüketici verimi = verimOn x karsilanma             // orantılı yavaşlama (brownout)
santral verimi  = verimOn x yük,  yük = karşılanan talep / kapasite (talebi izler; talep arzı aşınca yük = PPM)
```

Sapmalar: (a) 08 §0.2-b'deki `min(isci, girdi, elektrik)` yerine S1'deki `verim x= karşılanma` (çarpım) uygulanır; (b) **santral yük takibi**: santral talep kadar çalışır, yakıt/kirlilik/aşınma yükle ölçeklenir (08 santrali her zaman tam yükte sayardı; her bölgede zorunlu santral yakıtı boşa yakardı); yakıt talebi planı önceki çözümün yükü + `yukPlanMarjiPpm` ile yapılır; (c) **işgücü önceliği**: santraller işçiyi diğer tesislerden önce alır (sıra sonunda kalan santral bölgeyi karartmasın); (d) `sanayi.haneOnceligi` (varsayılan false) D4 "enerji önceliği" yasasının B2 karşılığıdır (B4'te oyuncu yasasına bağlanacak); hane elektriği şimdilik yalnız `haneKarsilanmaPpm` olarak izlenir; (e) `santralIsletmePpm = 0`: santral `tesisIsletmeParasiSaat` ödemez (yakıt, parça ve işçi zaten maliyet; zorunlu santrallerin lavabosu ayarla-unut oyuncusunu boğuyordu, H7); (f) `ruzgar_gunes` ve `kombine_cevrim` yöntemleri B6 teknolojilerine bağlı olduğundan eklenmedi. Santraller: `komur_santrali` (kömür 60 -> 240), `yakit_jeneratoru` (yakıt 40 -> 160), `santral` türü (çelik 70 + parça 30, 12 000 para, 8 saat); `hidro_santrali` türü (`dag` etiketi, çelik 120 + parça 30, 12 saat) `hidro_santrali` yöntemi 300 x `akarsuEgrisiPpm` (12 ay, ay ortaları arası doğrusal, yıllık ortalama tam PPM; tarım takvimi kapalıysa PPM). Elektrik girdileri: yüksek fırın 25, ark 50 (çıktı 60 -> 63), parça 12, otomatik hat 20, elektronik 30, rafineri 25, mühimmat 15, gıda işleme 10, derin cevher 15, derin kömür 12, mekanize tarım 8, ham çıkarım 5-6, **gübre fabrikası 15, sulama pompası 8 (yakıt kalktı)**; hane 150 mili/1000 kişi/saat.

**Ölçek (S2).** `tesis_olcek_yukselt {bolge, tesis, olcek: 1|2}`: kademe `olcekKademeleri` (S/M/L: çıktı, girdi ve elektrik x1/2,2/3,6; işçi x1/1,8/2,6; bakım ve işletme x1/2/3,2; inşa x1/2,5/4,5). L için `otomasyon`. Maliyet = hedef - mevcut kademe inşa maliyeti (para + mal, bölge stoğundan), süre = tür inşa süresi x `olcekYukseltmeSureCarpaniPpm` (erken oyun hızlandırması uygulanır). Yükseltme `InsaatDurumu` (`tur: "olcek"`, `hedef` = tesis kimliği, `olcek` = hedef kademe) olarak izlenir; tesis yükseltme sırasında çalışır, bitişte kademe artar. Çıktı çarpanı `ciktiCarpan` içinde birleşir (ölçek x tarım x kirlilik x aşınma); girdi/bakım/elektrik/gübre talebi ölçekle büyür. (Bölge + tür düzeyinde toplu yükseltme ertelendi.)

**Bakım ve aşınma (S3).** `bakim_duzeyi {duzey: 0|1|2}` oyuncu düzeyindedir (varsayılan 1): bakım girdisi ve işletme gideri x0,5/1/1,5; günlük aşınma +20 000/0/-15 000 (`saatlik_tik` içinde her sim-günü başında, yalnız sahipli bölgenin aktif tesisleri, [0, PPM]). Bakım girdisi karşılanma oranı `kitlikEsigiPpm` (950 000) altındaysa günlük aşınma en az `kitlikAsinmaPpmGun x (1 - karşılanma)` olur (08: karşılanmazsa +20 000; burada oransal). Çıktı çarpanı `max(uretimTabaniPpm, PPM - aşınma x %40)` (en çok -%40; istikrar ve kıtlık çarpanları B3/B4'te bağlanır). `genel_onarim {bolge}`: aşınmış tesislerin inşa maliyetinin %20'si (ölçek dahil, para + mal), onarılan tesis `genelOnarimDurusSaat` (6) çalışmaz (`TesisDurumu.onarimBitis`, bölgeye bir `InsaatDurumu` `tur: "onarim"`), aşınma sıfırlanır; aşınması olmayan bölge reddedilir. İşletme gideri `lojistik/cozum.ts` içinde ölçek x düzey çarpanıyla değişir.

**Kirlilik (S4).** `BolgeDurumu.kirlilikPpm` [0, PPM]. Saatlik emisyon: Σ `kirlilikPpmSaat x verim x ölçek` (her tesis için yukarı yuvarlanır). Günlük (aşınmayla aynı tikte): kirliliğin `komsuYayilimPpmGun` (%10)'u **sahipli kara komşularına** eşit paylaşılır (sahipsiz bölge uykudadır: alıp vermez, donar), sonra kalanın `azalmaPpmGun` (%3)'ü yukarı yuvarlanarak düşer. Etki: tarımsal çıktı x (PPM - kirlilik x `tarimKatsayiPpm` (%25)); `kirlilikIstikrarCezasi` (kirlilik x %40) **B4 için hazır** alandır, B2'de hiçbir yerde okunmaz. Temiz enerji/filtre (emisyon -%50) B6'dadır.

**Damar ve keşif (S5).** (a) Ölçek harita verisidir: `sentetik-50` (`harita-uretici.ts`: maden rezervleri x0,4, tahıl hariç, PRNG sırası değişmedi; medyan ~126 bin birim, 36-360) ve gerçek harita (`karadeniz.json` rezerv tablosu x0,4, tahıl hariç, en az 50 bin; `pnpm harita:gercek`; medyan 140 bin). `damar.rezervOlcegiPpm` çekirdekte kurulumda ek ölçek uygular (varsayılan 1 000 000 = etkisiz). (b) Verim tabanı: `rezervVerimi(ilk, kalan, 250 000)`: damar tükenince (hatta `kalan = 0` iken) tesis sıfıra değil %25'e iner; rezerv negatife inmez; taban yalnız sanayi açıkken uygulanır. (c) `arama_sondaji {bolge, mal}`: sahip, ham (tarımsal olmayan) ve `rezervIlk > 0` olan mal, bölge x mal başına en çok `kesifHakkiBolgeMal` (2) hak (komutta harcanır, `kesifSayisi`); maliyet bölge stoğundan 20 parça + 8 000 para, süre 24 saat (erken oyun hızlandırması uygulanır); `sondaj_bitti` (öncelik 3) olayı `"olay"` akışından **tam iki çekim** yapar (başarı olasılığı, boyut; başarıdan bağımsız) ve %40 olasılıkla `rezervIlk` ve `rezervKalan`'ı `rezervIlk x U(0,3; 0,6)` artırır. Yeni damar yaratılmaz (yalnız var olan damar büyür).

**Bot (`botlar/planlayici.ts` `sanayiAdaylari`).** `santral`: elektrik açığı (karşılanma < %96) ya da proaktif (talep > %80 kapasite) olan, tüketicisi bulunan bölgede santral/hidro inşası; yakıtına erişilemeyen santralin erişilebilir yöntemine geçiş; elektrik girdili yeni tesis, şebekesi çökmüş ya da kapasitesi dolu bölgede kurulmaz. `olcek`, `bakim` (düzey seçimi histerezisli + ağır aşınmada genel onarım), `sondaj` (damar yarıdan çok tükenmişse). Dört arketipte santral + bakım; sanayici ve militaristte sondaj; sanayicide ölçek. `kur_ve_unut` ilk planında şebeke açığı kapatılır ve `bakim_duzeyi` normal ayarlanır. Önayarlar (H1) santral + dengeli bakım taşır. Yeni önayarlar (`enerji_onceligi`, `olcek_buyutucu`, `bakim_tasarrufcusu`) ertelendi.

**Başlangıç verisi.** `sentetik-50`: elektrik tüketen tesisi olan her bölgeye başlangıç santrali (dağda hidro) eklenir. Gerçek harita: tüketicisi olan 51 bölgenin 36'sına (tesis sayısı 3'ün altında olanlara; boru hattı bölge başına en çok 3 tesis verdiğinden 15 ağır sanayi bölgesinde yer yok) santral/hidro `sanayi` listesine yazıldı. `mini-6`: her bölgeye başlangıç santrali (dağda hidro) eklendi; eski testler için `yenilikleriKapat` bunları söker.

**Sözleşme eklemeleri.** Veri: `MalKategorisi += "enerji"`, `MalTanimi.depolanabilir?`, `YontemTanimi.kirlilikPpmSaat?`, `YontemTanimi.hidro?`, `OlcekKademesiTanimi`, `BakimDuzeyiTanimi`, `SanayiParametreleri` (08'e ek: `haneOnceligi`, `yukPlanMarjiPpm`, `santralIsletmePpm`, `bakim.kitlikEsigiPpm`, `bakim.kitlikAsinmaPpmGun`), `Parametreler.sanayi?`. Çekirdek (hepsi opsiyonel/ek): `BolgeElektrikDurumu` (08'e ek `yukPpm`), `BolgeDurumu.elektrik/kirlilikPpm/kesifSayisi/bakimKarsilanmaPpm`, `TesisDurumu.olcek/asinmaPpm/onarimBitis`, `OyuncuDurumu.bakimDuzeyi`, `InsaatTuru += "olcek" | "onarim"`, `InsaatDurumu.olcek?`, olay `sondaj_bitti`, komutlar `tesis_olcek_yukselt`, `genel_onarim`, `bakim_duzeyi`, `arama_sondaji`.

**Ölçüm özeti (B2).** 4 botlu 30 günlük koşu, sentetik-50, tohum 1-3 (B2 öncesi kod + B2 öncesi veri = taban; "kapalı" = yeni veri + `sanayi` silinmiş):

| Gösterge | B2 öncesi | Sanayi kapalı (yeni veri) | Sanayi açık |
|---|---|---|---|
| lavabo / (vergi + ihracat - ithalat) | 0,20-0,22 | 0,32-0,37 | 0,34-0,40 (tohum 3, ilk sürüm: 0,26) |
| brüt ihracat (ilgili birim) | 73-81 | 65-68 | 64-69 |
| brownout: tüketicili bölge-saatinin | - | - | %0,8-1,2 (ilk sürümde bot şebekesiz tesis kurarken %2-5) |
| brownout günü (bölge-saatinin >%5'i brownout) | - | - | %0-3 |
| kirlilik (ort / en yüksek bölge) | - | - | %3,0-3,4 / %9-11 (tarım çıktısı -%0,8 / -%2,8) |
| aşınma (ort / en yüksek) | - | - | %11-14 / %56-60 |
| damar verimi (ort sqrt(kalan/ilk)); %6'nın altına inen damar | 0,77; 0-1 | 0,49-0,51; 8 / 37 | 0,50-0,55; 6-9 / 37 |
| keşif sondajı (komut / yeni damar bulan) | - | - | 17-22 / 5-10 |
| elektronik israfı / üretim (6 tohum ortalaması) | 0,12 | 0,12-0,17 | 0,16 (aralıklar çakışıyor: gürültü içinde) |

Yorum: (i) brüt gelir düşüşünün büyük kısmı veri değişikliğinden gelir (maden rezervleri x0,4: "kapalı" sütunu); sanayi mekanikleri açıkken ek maliyet kalan farktır. (ii) Damar tükenmesi Ö7 hedefindedir (tek yüzey tesis 25. günde ~%40 tükenme, verim ~0,77); çok tesisli botlarda ortalama verim 0,5'e iner ve %25 tabanı çöküşü önler. (iii) Aşınma ortalaması bakım parçası kıtlığından gelir (parça piyasada kıt; bölge başına `bakimKarsilanmaPpm` < %95); bot yüksek düzeye geçip geri döner, onarım nadiren kârlıdır (6 saat durma + %20 maliyet). (iv) Elektronik israfı pürüzü sanayi mekanikleriyle belirgin değişmedi; yine de ölçek yükseltme adayı çıktı malının fiyatı doygunsa ya da deposu %50'yi aşmışsa değer kaybeder (deterministik, fiyata bağlı). (v) Ölçüm paketi `--hip H2,H7 --tohum 1 --hizli`: H2 tekrar endeksi %10 (eşik %60; B1: %10), karar tükenmesi 0/11, kalıcı sıfır karar günü yok; H7 24/48/72 saat %67,8 / %36,6 / %43,8 (B1: %71,3 / %41,8 / %53,8; 48. saatte B1'de de eşiğin altındaydı, bilinen sorun; 168/336. saat bilgi amaçlı %54,6 / %55,1).

**Performans.** Sanayi kapalı (B2 öncesi veri, yeni kod): 30 günlük 4 oyunculu lojistik koşusu B2 öncesi koda göre +%7 (2,55 sn -> 2,73 sn). Sanayi açık yeni veride 3,7 sn (B2 öncesi koda göre x1,45): sanayinin kendi hesabı (elektrik dağıtımı, çarpan zinciri) profilde ~%5; geri kalanı daha büyük akış problemidir (her bölgede yakıt/kömür akışı, +48 başlangıç santrali: çözüm sayısı 2889 -> 3342, çözüm başına 0,94 -> 1,11 ms). **08 §7 kabul ölçütü olan x1,15'i aşıyor (bilinen sorun).**

**Bilinen sınırlar ve ertelenenler.** (1) Elektrik bölge içidir; santrali olmayan tarım bölgesinde hane elektriği 0 karşılanır (B4 istikrar etkisi gelince karar verilecek). (2) Gerçek haritada 15 ağır sanayi bölgesi boru hattının 3 tesis sınırı yüzünden başlangıç santralsizdir (bot ilk kararda kurar). (3) Ayarla-unut oyuncusunun yakıt jeneratörü yakıtı bitince şebekesi söner (yakıtsız güney yarı, mini harita). (4) `ruzgar_gunes`, `kombine_cevrim`, filtre/temiz enerji (B6); `ortak_sebeke` (v1.5); tür düzeyinde toplu ölçek yükseltme; yeni önayarlar (`enerji_onceligi`, `olcek_buyutucu`, `bakim_tasarrufcusu`); istikrar x kıtlık çarpanları (B3/B4); keşifle yeni mal türü bulma. (5) `damar.rezervOlcegiPpm` tahılı da ölçekler (tarım bölgesinde rezerv tükenmediği için etkisiz).

## 13. Pazar katmanı (v1)

Kaynak: [08 §5 ve §7-B3](08-alti-katman.md). Çekirdek: `packages/cekirdek/src/pazar/` (`tablo`, `piyasa`, `fiyat`, `kitlik`, `defter`); eski `ekonomi/pazar.ts` `pazar/piyasa.ts`'e taşındı. Nakit akışı kırılımı `lojistik/cozum.ts` `hazineKalemleri` içindedir; kıtlık cezası `ekonomi/uretim.ts` çıktı çarpanı zincirine bağlanır. Aşağıda yalnızca kurallar ve 08'den **sapmalar** vardır; gerekçe ve ölçüm hedefleri 08'dedir.

**Açma/kapama (regresyon kalkanı).** Pazar v1, `parametreler.pazar` içinde B3 ek alanlarının **hepsi** (ya hiçbiri ya hepsi; doğrulayıcı denetler) tanımlıysa açıktır: `makasPpm`, `anlasmaMakasPpm`, `yaptirimMakasPpm`, `limanPrimPpmSaat`, `limanPrimTavaniPpm`, `islemKomisyonuPpm`, `npcLikiditeTabanOyuncu`, `kitlik`, `tarife` (varsayılan oyun artık pazarlıdır; `surum` alanları 1'dir, eski dosyalar yüklenir). Kapalıyken `PazarDurumu.kaynak`, `BolgeDurumu.kitlikKademesi/kitlikT/temelKarsilanmaPpm`, `OyuncuDurumu.ticaretRejimi/ticaretDefteri` **tanımsızdır** (durum özetine girmez), eski ithalat/ihracat/anlaşma/yaptırım çarpanları aynen geçerlidir, liman primi, komisyon, kıtlık cezası ve NPC likidite ölçeği yoktur; botlar B3 öncesiyle aynı karar verir. Kanıt: (i) `test/pazar-regresyon.test.ts`: B3 öncesi veri fikstürü (`test/fikstur-b2/`: mini-6 + Sanayi v1 içerik/parametre, pazar alanı ve liman tanımı yok) + sabit komut dizisi (ticaret emirleri, ticaret anlaşması, yaptırım; bol ve yoksul hazine), B3 öncesi kodla (ee4ee50) üretilmiş altın durum özetleriyle eşit (tohum 5 ve 6; 3., 7., 12., 16. gün); (ii) pazar **açık ama nötr** (makas 200 000, prim 0, komisyon 0, tarife 0, kıtlık cezası 0, oyuncu <= 4) iken B3 alanları özetten çıkarılınca özet aynı altınla eşit (ekonomik eşdeğerlik); (iii) `botlar/test/pazar-regresyon.test.ts`: B3 öncesi sentetik-50 + 4 botlu 6 günlük koşu (tohum 1-2), B3 öncesi çekirdek ve botlarla aynı `durumOzeti`. Test yardımcıları: `yenilikleriKapat` pazar alanlarını da siler; `pazarAc` (pazar-yardimci.ts) açar.

**Fiyat kırılımı (P1-P3; `pazar/fiyat.ts`).** `d.pazar.fiyat` artık **dünya referans fiyatıdır** (Vic3 formülü değişmedi). Oyuncunun nakit akışı, referans değer `brüt = oran x fiyat` üzerinde sırayla (her adım `carpBol`, aşağı yuvarlar) uygulanır:

```
ithalat nakit = brüt x (PPM + makas/2) x (PPM + prim) x (PPM + tarife) x (PPM + komisyon)
ihracat nakit = brüt x (PPM - makas/2) x (PPM - prim) x (PPM - ihracatVergisi) x (PPM - komisyon)
prim(liman)   = min(limanPrimTavaniPpm, dunyaMesafeSaat x limanPrimPpmSaat)
```

Kesintiler tam tamsayı olarak ayrışır ve toplamı korur: `brüt = ihracat nakit + makas + prim + komisyon`; `ithalat nakit = brüt + makas + prim + komisyon` (tarife ve ihracat vergisi hazineye geri yazılır, aşağıya bakın). Prim, komisyon, tarife ve vergi 0 iken sonuç eski tek çarpımla (`brüt x çarpan / PPM`) birebir aynıdır. **Risksiz arbitraj yoktur:** ithalatın nakit bedeli her zaman >= brüt >= ihracatın nakit geliri (aynı referans fiyat); A limanından al, B limanından sat döngüsü her zaman <= 0 (makas > 0 iken < 0). Kanıt: `test/pazar-arbitraj.test.ts` (40 tohumlu özellik testi + iki limanlı sim). 08'den sapma: komisyon yalnız ihracat değil **iki yönde** uygulanır ("her işlem değeri").

**Liman tanımı ve dünya kapıları.** `BolgeTanimi.liman?: { dunyaKapisi, dunyaMesafeSaat, kapasiteSinifi }` (yalnız `liman` etiketli bölgede; kapıda mesafe 0, değilse >= 1). `limanTanimlariTuret` (veri/dogrula.ts) deniz kenarları grafından türetir: dünya kapıları = haritada açıkça işaretli olanlar, yoksa deniz kenarı sayısı en çok olan limanlar (limanların üçte biri, en az 1, en çok 4; eşitlikte kimlik sırası); kapısı olmayan her deniz bileşeni kendi en çok bağlı limanını da kapı yapar; mesafe = deniz kenarları üzerinde (`sureSaat`) en yakın kapıya Dijkstra; deniz kenarsız liman 72 saat (kapı değil); `kapasiteSinifi = 1 + (deniz kenarı - 1) / 2` (1..4; NGA sınıfının yerine türetme, v1.5 için). **Sentetik-50:** tanım dosyadadır (`pnpm harita:uret` yazar; yalnız `liman` eklendi, harita başka hiçbir şeyde değişmedi): 9 liman, kapılar hilal_adasi, celik_limani, inci_limani, dogu_limani (ikinci deniz bileşeni); mesafeler 24-120 saat. **Gerçek harita:** boru hattı liman alanı üretmez (hat kodu değişmedi); yükleyici (`yukle.ts`) pazar açıksa `limanlariTamamla` ile aynı türetmeyi çalışma zamanında yapar: 27 liman, kapılar girit, ege_adalari, istanbul, canakkale; Karadeniz doğusu uzak (kastamonu 64, dogu_karadeniz 56, kolhis 48 saat: prim tavanı %15'e yakın), Boğaz yakını yakın (varna 11, burgaz 10). `liman` tanımı olmayan bölge (özel test haritası) prim 0 sayılır; çekirdek `@bolge/veri`'den yalnız tip aldığı için türetme yapmaz. **İstemci notu:** tarayıcı yükleyicisi `tarimAlanlariniTamamla` gibi `limanlariTamamla(paket)`'i de çağırmalıdır (aksi halde 3D'de prim 0 görünür).

**NPC piyasa yapıcı ve makas (P2).** `PazarDurumu.kaynak = "npc"` (arayüz etiketi "Dünya Piyasa Yapıcısı (NPC)"; NPC formülle çalışır, kâr peşinde değildir). Makas oyuncuya göre: yaptırım altında `yaptirimMakasPpm` (600 000: ±%30), aktif ticaret anlaşmasında `anlasmaMakasPpm` (100 000: ±%5), aksi halde `makasPpm` (200 000: ±%10); öncelik yaptırım > anlaşma > varsayılan. Çarpanlar makastan türer (`politika.ts` `pazarCarpanlari`; ithalat PPM + makas/2, ihracat PPM - makas/2) ve doğrulayıcı eski `ithalatCarpaniPpm`, `anlasma*`, `yaptirim*` alanlarının makasla tutarlı olduğunu denetler: sonuç eski çarpanlarla birebir aynıdır (test: `pazar-makas.test.ts`). NPC makas geliri defterde ayrı kalemdir. **NPC likidite ölçeği:** emilim ve arz hacimleri `max(npcLikiditeTabanOyuncu, oyuncu) / npcLikiditeTabanOyuncu` ile büyür (oyuncu <= 4: 1; `pazar/piyasa.ts` `npcHacimleri`).

**Komisyon, tarife ve ihracat vergisi (P3).** `islemKomisyonuPpm` (%1) her işlem değerinden sisteme gider (para lavabosu). `OyuncuDurumu.ticaretRejimi = { ithalatTarifePpm, ihracatVergisiPpm }` (varsayılan kademe 0 = 0; `tarife` kademeleri ve komutu B4 Devlet'te `tarife_ayarla` olarak gelir; `serbest_liman` muafiyeti B4'tedir). **Yeni oyuncu koruması süresince** (`korumaBitis`) komisyon, tarife ve ihracat vergisi yoktur (H6); liman primi taşıma bedeli olduğundan korumada da uygulanır. **Hazine muhasebesi (B3'e özgü sapma):** B3'te tek hazine vardır; tarife ve ihracat vergisi devlet gelirine yazılır ve aynı hazineye geri yazılır (hazineye net etkisi 0; yalnız fiyat/davranış ve defterde ayrı kalem). B4'te devlet bütçesi özel kesimden ayrılınca gerçek gelir/bedel olur. `OyuncuDurumu.ticaretDefteri = { toplam, oran, t0 }`: kalemler (`brutIhracat`, `brutIthalat`, `makas`, `prim`, `komisyon`, `ithalatTarifesi`, `ihracatVergisi`) çözümde saatlik oran olarak hesaplanır ve oran değişmeden önce `oran x dt` toplama işlenir (üretim muhasebesi gibi). Hazine korunumu: `Δhazine = brüt ihracat - brüt ithalat - (makas + prim + komisyon) + vergi geliri - lavabolar` (test: `pazar-komisyon.test.ts`; tarife/vergi açıkken hazine tarifesiz dünyayla birebir aynı).

**Kıtlık cezası (P4; `pazar/kitlik.ts`).** `temelKarsilanmaPpm = min(gıda, yakıt, hane elektriği)` (bölgenin son çözümünden; yakıt yalnız nüfus/ordu talebi varsa, hane elektriği yalnız bölgede **aktif santral varsa**: 08'den sapma; B2 notu (1): şebekesiz bölge elektrik kıtlığı yaşamaz, santrali olup yakıtı biten bölge yaşar). Kademe: karşılanma >= 900 000 -> 0; >= 700 000 -> 1; >= 500 000 -> 2; aksi 3; ceza 0 / 50 000 / 150 000 / 300 000 (en çok %30; doğrulayıcı üst sınırı 300 000'dir). Kademe **saatlik tıkta** güncellenir (kötüleşme anında; iyileşme son değişimden `toparlanmaSaat` = 24 saat sonra bir kademe: 3 -> 0 en az 72 saat). Ceza çıktı çarpanına girer: `cezaCarpani = max(uretimTabani, aşınma x kıtlık)` (sanayi kapalıyken kıtlık çarpanı doğrudan); **santral elektrik kapasitesi etkilenmez** (elektrik kıtlığın girdisidir; sarmal olmasın), yalnız çıktı çarpılır (girdi, işçi ve bakım değişmez; aşınma ve tarım çarpanlarıyla aynı yer). Sahipsiz bölge uykudadır (kademe donar, `temelKarsilanmaPpm = PPM`).

**P5 tedarik sözleşmesi: ertelendi** (B3.5; çok oyunculu sunucu gerektirir, 08 §5.3 P5). Emir defteri v1.5 kapısındadır (08 §5.4).

**Bot (`botlar/planlayici.ts`).** `Bakis` pazar yardımcıları: `pazarAcik`, `limanOlcegi` (liman primi ve komisyonun makas-yalnız çarpana oranı), `nakitCarpani`, `npcOlcegi`, `kitlikAcigi` (kıtlık altındaki bölgelerin gıda/yakıt açığı; gerçek karşılanmadan: `gidaKarsilanmaPpm` ve `temelKarsilanmaPpm`), `enYuksekKitlik`. `ticaretAdaylari`: NPC likidite ölçeği emilim/arza uygulanır; fiyat/taban oranları liman primi ve komisyonla düzeltilir (ihracat/ithalat fiyat ölçekleri etkin fiyata bakar); liman seçimi `primDuyarliligi` ile stok yanında prim farkını da dikkate alır (skor = doluluk -/+ 2 x duyarlılık x prim farkı, mevcut emir 0,1 skor farkına kadar korunur): **tüccar 1** (prim farkını kullanır), diğer arketipler ve önayarlar 0,5; fark yalnız liman seçimidir, yeni kâr kaynağı değildir (arbitraj yok); kıtlık altındaki bölgenin gıda/yakıt açığına ithalat (stok ufku koşulu aranmaz, fiyat duyarlılığı en az 0,8, bütçe payı %60 ve fayda x4). Pazar kapalıyken hepsi B3 öncesi sabitlerle (1,1 / 0,9, stok kuralı) aynıdır (regresyon testi).

**Sözleşme eklemeleri.** Veri: `LimanTanimi`, `BolgeTanimi.liman?`, `KitlikParametreleri`, `PazarEkAlanlari` (hepsi `Parametreler.pazar` içinde opsiyonel; tip `PazarParametreleri = PazarTemelParametreleri & Partial<PazarEkAlanlari>`), `limanTanimlariTuret`, `limanlariTamamla`, `ULASILAMAYAN_LIMAN_MESAFESI_SAAT`; şema ve doğrulayıcı (`sema.ts` `SEMA_UYUMU`, `dogrula.ts` makas-çarpan tutarlılığı, kıtlık sırası ve %30 tavanı, tarife ilk kademe 0, liman kuralları). Çekirdek (hepsi opsiyonel/ek): `PazarDurumu.kaynak`, `BolgeDurumu.kitlikKademesi/kitlikT/temelKarsilanmaPpm` (`temelKarsilanmaPpm` 08'e ek), `TicaretRejimi`, `TicaretKalemleri`, `TicaretDefteri`, `OyuncuDurumu.ticaretRejimi/ticaretDefteri`; API: `pazarTablosu`, `ticaretCarpanlari`, `ihracatKirilimi`, `ithalatKirilimi`, `ticaretNakitCarpanlari`, `kitlikTik`, `kitlikCarpani`, `npcHacimleri`, `pazarCarpanlari`, `oyuncuMakasPpm`.

**Ölçüm özeti (B3).** 4 botlu 30 günlük koşu, tohum 1-3 (sanayici, tüccar, lojistikçi, militarist; ort. tohum aralığı); "kapalı" = aynı kod ve veri, `pazar` B3 alanları silinmiş (B3 öncesi ekonomi):

| Gösterge | Sentetik-50 kapalı | Sentetik-50 açık | Gerçek harita kapalı | Gerçek harita açık |
|---|---|---|---|---|
| ihracat geliri / (vergi + ihracat) | 0,951-0,956 | 0,948-0,952 | 0,914-0,925 | 0,905-0,913 |
| lavabo / (vergi + ihracat - ithalat) | 0,34-0,40 | 0,41-0,45 | 0,35-0,38 | 0,41-0,49 |
| ihracat nakit geliri (milyon para) | 64-69 | 60-63 | 62-73 | 56-62 |
| makas geliri (NPC; milyon para) / brüt işlem | 11,1-11,6 / %10 | 10,7-11,3 / %10 | 10,3-12,3 / %10 | 10,0-10,7 / %10 |
| liman primi bedeli (milyon para) | 0 | 2,9-3,8 | 0 | 2,8-3,2 |
| komisyon (milyon para; koruma 7 gün muaf) | 0 | 0,86-0,92 | 0 | 0,81-0,87 |
| kıtlık bölge-günü (kademe 1 / 2 / 3; toplam bölge-günü 1500 / 1590) | 0 | 76-96 / 67-88 / 251-309 | 0 | 41-45 / 38-51 / 250-296 |
| elektronik israfı / üretim | 0,08-0,23 | 0-0,013 | 0 (israf yok) | 0 (israf yok) |

Fiyat/taban (gün 5-30 ortalaması, 3 tohum; kapalı -> açık), sentetik: gıda 0,85 -> 0,95; elektronik 0,75 -> 0,94; petrol 1,02 -> 1,25; yakıt 1,01 -> 0,88; parça 1,25 -> 1,33; gübre 1,34 -> 1,27 (diğerleri +-0,07 içinde); gerçek: bakır 0,59 -> 0,70; petrol 0,97 -> 1,06; gübre 0,95 -> 1,06; muhimmat 1,08 -> 1,15; gıda 0,70 -> 0,65 (diğerleri +-0,05 içinde). Reddedilen bot komutu 0.

H1 (tohum 1, `--hizli --harita gercek`, **tek tohum**): 16 bölge örneği (`--bolge 16`), `ihracatci` anlamlı ilk-üç oranı **%87,5 (kapalı, KALDI) -> %68,8 (açık, GEÇTİ; eşik %70)**, en iyi önayar payı %71,9 -> %59,4, `ihracatci` ortalama eklenen değer 318,9k -> 171,9k para (-%46: makas, liman primi ve komisyon), en iyi tek önayar regret %1,6 -> %3,8, bölge türü başına farklı en iyi önayar 4 -> 3 (bilgi göstergesi; hâlâ < 4), normalize entropi 0,34 -> 0,25. Varsayılan 4 bölgelik hızlı örnekte oran iki modda da %100 (en iyi payı %83,3 -> %83,3; `ihracatci` değeri 104,3k -> 61,6k): örnek küçüktür, yalnız yön gösterir. Kabul ölçütü olan "ilk üç <= %60" **henüz sağlanmadı** (08 §5.10); H1 baskınlığı düşüyor ama ihracat avantajı kalıyor (ihracat hâlâ ilk tercih). H2 (tohum 1, `--hizli --harita gercek`): tekrar endeksi %30 (kapalı) -> %10 (açık), GEÇTİ. H7: 24/48/72. saat oranları %69,0/42,5/38,5 (kapalı) -> %68,8/42,9/37,8 (açık); KALDI iki modda da (B2'den bilinen sorun, değişmedi).

**Performans (30 günlük 4 botlu koşu, tohum 1, aynı makine, kapalı -> açık).** Sentetik-50: 16,3-17,3 -> 14,9-15,9 sn (çözüm 6580 -> 6335; kıtlık cezası üretimi kısınca iş azalır). **Gerçek harita: 16,3-17,1 -> 21,0-22,2 sn (+%28; 08 §7'nin x1,15 ölçütü aşılıyor, bilinen sorun):** yalnız motor (günlük yeniden oynatılınca) 16,9 -> 21,6 sn, bot maliyeti ihmal edilebilir; neden olay hacmidir (çözüm 6332 -> 7535 +%19, `esik` olayı 129 908 -> 162 760 +%25, `oran_delta` 64 382 -> 75 662 +%18: kıtlık kademesi ve ithalat emirleri üretim/akış oranlarını sık oynatır), olay başına maliyet yalnız ~%7 artar (kırılım hesabı ve saatlik kıtlık taraması). Pazar kapalıyken B3 öncesine göre fark yoktur (aynı kod yolu).

**Bilinen sınırlar ve ertelenenler.** (1) **Kıtlık yaygındır:** 30 günlük 4 botlu koşuda bölge-gününün ~%27-31'i (sentetik) ve ~%22-24'ü (gerçek) kademe >= 1'dedir; çoğu kademe 3 (-%30). Nedenler: sentetik-50 (tohum 1) gıda ~%67, yakıt ~%30, elektrik ~%3; gerçek harita (tohum 1) yakıt ~%73, gıda ~%27 (elektrik ~%1). Yakıtın bir kısmı yapısaldır: gerçek haritada petrolsüz bölgelere konmuş rafineri girdisiz kalır ama kapsam tablosunda yerel arz sayılır ("girdi_eksik" hiçbir yerde çözülmediğinden bot ithalatı da NPC arzıyla [yakıt 260 birim/saat, dört oyuncu] sınırlıdır); bu B2'nin "zincir içi dolaylı kısıtlar tek çözümde tam yakınsamaz" sınırı ve kapsamın plan (gelen akış) ile fiilî (stok ve ulaşmış akış) karşılanma farkıdır, B5 Lojistik'te ele alınmalıdır. Kıtlık bot yanıtı (açığı kapatan ithalat) bunu kısmen hafifletir; veriyle ayarlanabilir parametreler `kitlik.esikPpm/cezaPpm/toparlanmaSaat`'tir. (2) **H5 kıtlık hedefi (48 saatte ceza kademesi <= 2) çevrimdışı oyuncuda sağlanmıyor:** 72 saatlik 4 oyunculu koşuda pasif oyuncunun 12 bölgesinden 48. saatte 2'si kademe 3'tedir (büyük nüfuslu bölgelerde başlangıç stoku gıda/yakıt için 20-60 saatte biter; toparlanma ataleti kademeyi 24 saat tutar). Çözüm adayları: yeni oyuncu korumasında ceza muafiyeti, başlangıç stoku ölçeği veya kötüleşmede de ataleti; B3'te spesifikasyonun dışına çıkılmadı. H5 ölçüm koşusu (`--hip H5`) bu çalışmada yürütülmedi. (3) **Tarife ve ihracat vergisi B3'te hazineye net 0'dır** (tek hazine; yukarıya bakın); gerçek bedel/gelir B4 ile gelir. (4) **P5 tedarik sözleşmesi, `serbest_liman` ve tarife komutu ertelendi** (B3.5/B4). (5) Liman primi bot yatırım kararlarına (hangi bölgeye tesis kurulacağı) bağlanmadı; yalnız liman seçiminde kullanılır ("kapı yakın ihracat" önayarı ve tüccarın bölge seçimi ertelendi). (6) Gerçek harita liman tanımı çalışma zamanında türetilir; 3D istemcinin yükleyicisi `limanlariTamamla`'yı çağırmalıdır. (7) NPC likidite ölçeği oyuncu sayısının tamamını (aktif olmayanlar dahil) sayar; 5 oyunculu ölçümlerde (H1: odak + 4 bot) emilim ve arz x1,25'tir.
