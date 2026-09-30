# 06 — Çekirdek Simülasyon Spesifikasyonu (v0.1)

Bu belge Aşama 2 çekirdek simülasyonunun **kurallarını** tanımlar. v0.1 kalibrasyon kuralları §10'dadır. Kod sözleşmesi
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

## 2. Motor

- Olay kuyruğu: ikili yığın, anahtar `(t, oncelik, sira)`. `sira` artan sayaçtır.
- `calistirKadar(t)`: kuyruktaki `≤ t` olayları sırayla işler, sonra `dunya.zaman = t`.
- `uygula(damgaliKomut)`: önce `calistirKadar(komut.t)`, sonra komutu ilgili alt sisteme
  yönlendirir, başarılıysa günlüğe ekler ve `ctx.kirlet(d)` çağırır. Emir değişimi **anında** geçerlidir:
  çözüm aynı `t`'de, `cozum` önceliğiyle çalışır.
- `saatlik_tik` her tam sim-saatinde (t = k × SAAT) çalışır ve bir sonrakini planlar.
- `ctx.kirlet(d)`: `lojistik.kirli = true`; kuyrukta çözüm yoksa `max(d.zaman, …)` anına bir `cozum`
  planlar. Komut/tik/inşaat kaynaklı kirletmede çözüm **aynı t**'dedir. Eşik ve oran_delta
  kaynaklı kirletmede çözüm en erken `sonCozum + enAzCozumAraligiDakika`'dadır (titreşimi önler).
- `esik` olayı: `surum` stoktaki sürümle eşleşmiyorsa yok sayılır; eşleşiyorsa stok uzlaştırılır
  ve kirletilir (boşalan stok tüketicileri kısar, dolan stok israfa başlar).
- `oran_delta` olayı: stok uzlaştırılır, `gelenOran += delta`, eşik yeniden planlanır, kirletilir.

## 3. Stok (tembel birikim)

`anlik = miktar + floor((oran × (t − t0) + artik) / SAAT)`, `[0, kapasite]` aralığına kelepçelenir.
Taşan miktar `israf`'a yazılır. Her oran değişiminde: uzlaştır → oranı ayarla → `surum++` →
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

**Nüfus (saatlik tık):** 1000 kişi başına `tuketim1000Saat` (gıda, yakıt, elektronik) tüketir.
Gıda karşılanma ≥ %95 ve vergi eşiğin altındaysa `buyumePpmGun/24` kadar büyür; gıda < %80 ise küçülür.

**Vergi:** hazineye saatlik `nufus/1000 × vergiTabani1000Saat × vergiPpm / PPM` eklenir
(hazine oranı olarak ayarlanır). Yüksek vergi (eşik üstü) büyümeyi keser.

**Bozulma (batma):** her mal için saatlik `miktar × bozulmaPpmGun / 24 / PPM` stok oranından düşülür.
**Depo:** mal başına `depoKapasitesi`; taşan üretim `israf` olur. Bu iki kural "stok birikmesi"ni önler.
(v0.1 değerleri §10.4.)
**Para lavaboları (v0.1):** hazine oranından aktif tesis başına `tesisIsletmeParasiSaat` ve birlik başına `birlikMaasiSaat` düşülür (§10.2).

**Dünya pazarı:** yalnızca `liman` etiketli bölgelerden erişilir. Oyuncu limanda sürekli
`ticaret_emri` verir (ihracat/ithalat, birim/saat). Saatlik tıkta fiyat:
`fiyat = taban × (1 + e × clamp((T − A) / min(T, A), −1, +1))` ; `T` = pazar talebi (emilim + oyuncu ithalatı),
`A` = pazar arzı (arz + oyuncu ihracatı), `e = fiyatEsnekligiPpm`. Gerçekleşen ihracat en fazla
`emilimSaat`, ithalat en fazla `arzSaat` (oyuncular arasında istenen oranla orantılı, tamsayı).
İthalat fiyatı `× ithalatCarpani`, ihracat `× ihracatCarpani` (anlaşma/yaptırım çarpanları yerine geçer).
Ödemeler hazine oranına yansır. Hazine 0 iken ithalat gerçekleşmez.

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
  önce askeri mallara (`muhimmat`, ordu ikmalindeki mallar) ayrılır; kullanılmayanı sivile açılır.
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
  Pencere kapanınca **otomatik çözüm**:
  `güç = Σ(adet × guc) × ikmalKarsilanma × (savunan için arazi ve duruş çarpanları)`; küçük rastgele
  sapma (±%10, savas akışı). Kazanan belirlenir; kaybeden birliklerinin bir kısmını kaybeder.
- **Kayıp tavanı (H5):** saldıran kazanırsa hedef bölgeden her mal için `yagmaOraniPpm` kadar alınır,
  ama **tek noktada** `min(hesap, kayipTavaniPpm × stok)` ile kelepçelenir. Alınan mal saldıranın bölgesine eklenir.
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
hazine 0 iken gerçekleşmez. Hazine pozitifken giderler hazineden karşılanır ve verim tamdır; hazine pozitif olunca kısıntı kalkar.
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
  Bu nedenle kömür/cevher için tam çözüm botların fiyata duyarlı ihracatıdır (bot tarafı).
