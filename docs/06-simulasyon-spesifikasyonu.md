# 06 — Çekirdek Simülasyon Spesifikasyonu (v0.1)

Bu belge Aşama 2 çekirdek simülasyonunun **kurallarını** tanımlar. v0.1 kalibrasyon kuralları ve v0.2 veri dengesi §10'dadır. Kod sözleşmesi
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
Ödemeler hazine oranına yansır. Hazine 0 iken ithalat gerçekleşmez: saatlik tıkta hazine 0 ise ithalat emri gerçekleşmez; ayrıca
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
