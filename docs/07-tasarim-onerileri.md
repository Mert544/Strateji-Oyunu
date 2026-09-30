# 07 — Tasarım Önerileri: H1 Teşhisi ve v0.2 Paketi

> **Özet.** H1 (v0.1: rekabetli dünya, net değer skoru) iki katmanlı bir nedenle kalıyor. **(a) Ölçüm artefaktları:** odak oyuncu tek bölgeli (ticaret yalnızca limanda, haritada 9/50; lojistik ve zincir girdisi yok), skor depo tavanına ve taban fiyata bağlı, "hiçbir şey yapma" referansı yok ve `ihracatci` önayarı diğerlerinin ham-çıkarım kümesini kapsayan bir üst küme; bu yüzden ilk üç sıralaması çoğunlukla "kendine zarar vermeyen" önayarı ödüllendiriyor. **(b) Gerçek tasarım sorunları:** bölgelerin yarısı (26/50) işgücü-kısıtlı maden bölgesi ve orada ham çıkarım işlemeden 1.00-1.05 kat iyi; ithalat→işleme→ihracat döngüsü yapısal olarak zararlı (marj −2 bin ile −13 bin para/saat); çelik/parça/mühimmat zincirinin işçi başına katma değeri ham çıkarımın yalnızca %20-70'i; maden/ova/petrol dışındaki 5 limanın (rezervsiz) yerel değer üretme yolu yok. **Önerilen v0.2 paketi (3 değişiklik):** (1) H1 düzeneği v0.2 (yalnızca ölçüm), (2) işleme zinciri ekonomisi (yalnızca veri: yöntem ve işlenmiş mal pazarı), (3) bölge verim çarpanları (küçük kural). Damar ölçeği, liman elleçleme kapasitesi ve yerel iç pazar v0.3 adaylarıdır.

**Durum.** Bu belge bir **öneridir**; kod ve veri değiştirilmedi. Sayılar `packages/veri/icerik/{icerik,parametreler}.json` ve `sentetik-50.json` üzerinden (HEAD `7fe552b`) hesaplandı. "Tahmin" etiketli etkiler doğrulanmamıştır; doğrulama planı §3'tedir. İlgili belgeler: [00 — Vizyon](00-vizyon-ve-kararlar.md) · [02 — Tasarım Ar-Ge](02-tasarim-arge.md) · [06 — Simülasyon Spesifikasyonu](06-simulasyon-spesifikasyonu.md) · [v0 ölçümü](olcum/v0-t1-3.md).

---

## 1. Teşhis

### 1.1 H1 ne ölçüyor?

`packages/olcum/src/h1.ts`: 16/50 bölge örneği; her bölge için odak bölge, devletinden çıkarılıp **tek bölgeli** bir oyuncuya verilir; arka planda 4 devletin botları (sanayici, tüccar, lojistikçi, sanayici) oynar. Odak oyuncu t=0'da ve 24 saatte bir bir önayarı uygular, 7 gün koşulur. Skor = Δhazine + Δstok (taban fiyat) + yatırım (maliyetle geri eklenir). Sabit 7 önayar sıralanır; bir önayarın ortalama sırası ≤ 3 ise "ilk üçte" sayılır; en yüksek oran > %70 ise H1 kalır.

Şansa bırakılsa 7 önayardan 3'ü ilk üçte olur (beklenti %43); %70 üstü için sistematik bir üstünlük gerekir. v0.1'de bu üstünlük `ihracatci` %87.5, `elektronik` %75.0, `lojistik_yatirimi` %68.8'dir. Son ikisinin ilk üçe girmesi tek başına ölçümün "ne zaman kazanıldığına" dair ipucudur (§1.3).

### 1.2 Birim kaynak başına değer (hesap tabloları)

Fiyat ve miktarlar: mili birimler birime çevrildi; para = taban fiyat birimi. `tesisIsletmeParasiSaat` = 60 para/saat, bakım = parça girdisi (taban 180).

**Tablo 1 — Tesis yöntemi: katma değer ve işçi verimi (taban fiyat, tam verimde).** KD = çıktı değeri − girdi değeri. "Sabit gider" = bakım + işletme.

| Yöntem | İşçi | Girdi | Çıktı | KD/saat | Sabit gider/KD | KD / işçi (×1000 para·saat) |
|---|---|---|---|---|---|---|
| petrol_cikarim | 5 000 | 0 | 9 000 | 9 000 | %3 | **1 800** |
| standart_elektronik | 8 000 | 4 800 | 12 000 | 7 200 | %3 | 900 |
| standart_gida_isleme | 6 000 | 6 000 | 11 200 | 5 200 | %4 | 867 |
| mekanize_tarim | 8 000 | 2 720 | 9 600 | 6 880 | %5 | 860 |
| otomatik_hat (parça) | 3 000 | 7 000 | 9 000 | 2 000 | %12 | 667 |
| standart_rafineri | 7 000 | 9 000 | 12 000 | 3 000 | %8 | 429 |
| geleneksel_tarim | 15 000 | 0 | 6 000 | 6 000 | %3 | 400 |
| derin_cevher | 14 000 | 1 200 | 6 650 | 5 450 | %6 | 389 |
| bakir_cikarim | 8 000 | 0 | 3 000 | 3 000 | %7 | 375 |
| yuzey_cevher | 10 000 | 0 | 3 500 | 3 500 | %7 | 350 |
| derin_komur | 12 000 | 1 000 | 5 100 | 4 100 | %8 | 342 |
| yuzey_komur | 9 000 | 0 | 2 700 | 2 700 | %9 | 300 |
| silis_cikarim | 6 000 | 0 | 1 500 | 1 500 | %11 | 250 |
| standart_muhimmat | 8 000 | 4 600 | 6 000 | 1 400 | %17 | 175 |
| standart_parca | 10 000 | 5 800 | 7 200 | 1 400 | %17 | 140 |
| yuksek_firin (çelik) | 12 000 | 5 000 | 6 000 | 1 000 | **%33** | **83** |
| elektrik_ark (çelik) | 9 000 | 5 800 | 6 000 | **200** | %165 | **22 (net −130/saat)** |

Bulgular: (i) sabit gider ham çıkarımda ve gıda/elektronikte KD'nin %3-11'idir: "sabit işletme gideri küçük tesisi ezer" hipotezi **çürük**; yalnızca çelik (%33) ve parça/mühimmat (%17) etkilenir. (ii) Asıl fark **işçi başına KD**'dir: çelik zinciri 83-175, ham çıkarım 250-400, petrol 1 800. Bölgelerin işgücü (nüfus × %50) 25-125 bin olduğundan (tesis başına 5-15 bin işçi) işgücü küçük bölgelerde bağlayıcı kısıttır. (iii) `elektrik_ark` (3 gün, 30M para araştırma) `yuksek_firin`'dan **kesin kötüdür** (KD 200 < 1 000, net negatif): teknoloji ağacında ölü uç; `agir_sanayi` önayarı bu yöntemi seçiyor.

**Geri ödeme (7 günlük ufuk yatırımı cezalandırıyor mu?).** Çiftlik 1.9 saat, petrol kuyusu 3.4, gıda fabrikası 4.2, cevher/kömür/bakır 6-7, elektronik 5.9, rafineri 11, **parça ve mühimmat 26, çelikhane 58 saat** (ufuk = 168 saat). Skor yatırımı ayrıca maliyetle geri eklediği için 7 günlük ufuk yatırımı **cezalandırmıyor**; yalnızca çelik/parça/mühimmat zincirinde gecikmeli geri dönüş var.

**Tablo 2 — Dünya pazarı: boş pazar mı, rekabetli pazar mı?** Fiyat = taban × (1 + 0.75 × clamp((T−A)/min(T,A))); T = emilim + ithalat, A = arz + ihracat. "Rekabetli" = arka plan botlarının (oyuncu eklenmeden) gün 5-7 ortalama fiyat/taban oranı (tohum 1, bkz. Ek).

| Mal | Taban | Emilim E | Arz | E/arz | Fiyat/taban (x=0, yalnız oyuncu) | (x=0.4·E) | Rekabetli (gün 5-7) | Gerçek ihracat geliri/birim (0.9×) |
|---|---|---|---|---|---|---|---|---|
| tahıl | 30 | 360 | 240 | 1.5 | 1.38 | 0.95 | 0.84 | 0.76× taban |
| gıda | 70 | 300 | 200 | 1.5 | 1.38 | 0.95 | 0.87 | 0.78× |
| cevher | 35 | 360 | 150 | 2.4 | 1.75 | 1.17 | **0.69** | **0.62×** |
| kömür | 30 | 450 | 150 | 3.0 | 1.75 | 1.27 | **0.75** | **0.68×** |
| bakır | 50 | 200 | 120 | 1.7 | 1.50 | 1.00 | 0.78 | 0.70× |
| silis | 25 | 240 | 100 | 2.4 | 1.75 | 1.17 | **0.70** | **0.63×** |
| petrol | 60 | 400 | 240 | 1.7 | 1.50 | 1.00 | 0.99 | 0.89× |
| çelik | 120 | 120 | 100 | 1.2 | 1.15 | 0.82 | 1.16 | 1.04× |
| parça | 180 | 80 | 80 | 1.0 | 1.00 | 0.70 | 1.33 | 1.20× |
| elektronik | 400 | 50 | 50 | 1.0 | 1.00 | 0.70 | 0.84 | 0.76× |
| yakıt | 100 | 150 | 150 | 1.0 | 1.00 | 0.70 | 0.84 | 0.76× |
| mühimmat | 150 | 50 | 80 | 0.6 | 0.55 | 0.25 | 0.55 | 0.50× |

Bulgular: (i) **Dünya pazarı emilimi 4 oyuncuya göre geniş değil:** arka plan botları tek başına 3. günde cevher (360/360), kömür (450/450), silis (240/240) ve tahıl (360) emilimini doldurur; ham maddede fiyat taban×0.50-0.75'e düşer. Boş pazarda görünen ham madde primi (1.38-1.75×) rekabetli dünyada yok; gerçek ihracat geliri ham maddede taban fiyatın **%62-76'sıdır**. (ii) Bu, stok değerinin taban fiyatla sayıldığı skorda "ham maddeyi ihraç etmek" değil "stokta tutmak" lehine işler; ihracat yalnızca depo tavanı dolduğunda kazandırır (inci_limani örneği, §1.3). (iii) İşlenmiş mallarda pazar çok ince: tek bir elektronik fabrikası (30/saat) emilimin %60'ını doldurur ve fiyatı 0.55×'a çeker (gelir 5 940 vs taban değer 12 000/saat); tek mühimmat hattı yapısal olarak taban altında kalır.

**Tablo 3 — İthalat→işleme→ihracat döngüsü (limanlı "işleme merkezi").** Girdiler 1.1× ithalat fiyatıyla (kendi ithalatının fiyat etkisi dahil), çıktı 0.9× ihracat fiyatıyla (kendi ihracatının etkisi dahil), işletme 60. Mevcut pazar:

| Yöntem | İthalat maliyeti/saat | İhracat geliri/saat | Marj/saat | Taban KD |
|---|---|---|---|---|
| yuksek_firin | 9 625 | 4 388 | **−5 298** | 1 000 |
| standart_parca | 8 811 | 4 050 | −4 821 | 1 400 |
| standart_elektronik | 7 941 | 5 940 | −2 061 | 7 200 |
| standart_gida_isleme | 11 550 | 8 568 | −3 042 | 5 200 |
| standart_rafineri | 17 325 | 4 320 | **−13 065** | 3 000 |
| standart_muhimmat | 6 600 | 1 350 | −5 310 | 1 400 |

Ham maddenin ithalat fiyatı (çarpan dahil) taban×1.7-1.9'dur (E/arz yapısı nedeniyle) ve ithalat/ihracat çarpanları (1.1/0.9) zaten %22 makas açar: **hiçbir işleme yöntemi ithalatla beslenerek kâr etmez**. Rezervsiz 5 liman (kopuk, gümüş, sisli, çelik, gündoğumu; toplam nüfus ≈ 1.1 milyon, haritanın %10'u) bu nedenle yerel değer üretemez; 250 bin nüfuslu bir limanın gıda ihtiyacı (49 birim/saat) ithalatla ≈ 5 900 para/saat tutar.

**Tablo 4 — Bölge türü başına, bölge içinde kapalı stratejinin üst sınırı (işgücü kısıtlı, taban değer, para/saat).** Modüller: ham çıkarım (tür başına ≤3 tesis), gıda zinciri (çiftlik+fabrika), rafineri zinciri (kuyu+rafineri), çelik zinciri (cevher+kömür+yüksek fırın). Mevcut içerik:

| Tür (bölge sayısı) | Ort. nüfus | Ort. işçi | Yalnız ham çıkarım | + yerinde zincir | Zincir/ham | İç tüketim değeri* | Kapalı en iyi tema |
|---|---|---|---|---|---|---|---|
| ova_tarim (8) | 150 bin | 75 bin | 18 000 | 30 900 | **1.72** | 3 033 | gıda zinciri |
| baskent (4) | 515 bin | 258 bin | 15 750 | 27 450 | **1.74** | 10 408 | gıda zinciri |
| petrol (3) | 82 bin | 41 bin | 27 000 | 36 000 | 1.33 | 1 650 | rafineri zinciri |
| liman (9) | 211 bin | 106 bin | 9 900 | 12 900 | 1.30 | 4 267 | 5'i rezervsiz: **0** |
| maden_kiyi_col (11) | 86 bin | 43 bin | 7 500 | 7 591 | **1.01** | 1 732 | ham çıkarım |
| maden_dag (15) | 67 bin | 33 bin | 8 220 | 8 220 | **1.00** | 1 344 | ham çıkarım |

\* Nüfusun tükettiği gıda+yakıt+elektronik değeri (taban). Ham maddelerin **iç tüketimi yoktur**: cevher, kömür, bakır, silis, tahıl, petrol yalnızca zincir girdisi ve ihracat mahreci olarak kullanılır. Tüketim gelire dönüşmez (vergi 40 para/saat vs tüketim 2 020 para/saat, 100 bin nüfus için: vergi tüketim değerinin %2'sidir).

Bu tablo H1 için yapısal bir tespit içerir: haritanın **%52'si (26 maden bölgesi)** işgücü kısıtlı olduğundan ham çıkarım yerinde işlemeyi yener (zincir/ham 1.00-1.01); ova ve kentlerde (12 bölge) gıda zinciri, petrol bölgelerinde rafineri zinciri güçlü bir niş oluşturur. Çelik/ağır sanayi zinciri hiçbir bölge türünde niş değildir (yalnız komur_havzasi'nda ≈ +%5).

**Tablo 5 — "Birim ham kaynak başına değer" (para/birim; işlem yerinde, taban fiyat).**

| Ham | Taban | Stokta (skor) | İhracat, boş pazar | İhracat, rekabetli | Yerinde işleme (birim ham başına) | Zincir/taban |
|---|---|---|---|---|---|---|
| tahıl | 30 | 30 | 37.1 | 22.8 | 0.8 gıda × 70 = **56.0** | 1.87 |
| petrol | 60 | 60 | 81.0 | 53.4 | 0.8 yakıt × 100 = **80.0** | 1.33 |
| cevher+kömür (100+50) | 5 000 | 5 000 | 7 875 | 3 184 | 50 çelik × 120 = 6 000 | 1.20 |
| bakır+silis+parça | 4 800 | 4 800 | — | — | 30 elektronik × 400 = 12 000 | 2.50 |
| çelik+yakıt | 5 800 | 5 800 | — | — | 40 parça × 180 = 7 200 | 1.24 |

Birim başına işleme hemen her zaman ham ihracattan üstündür; yani **ihracatçının üstünlüğü "ham maddenin birim değeri yüksek" olmasından gelmiyor.** Üstünlük, zincirin işçi/girdi/çok-bölge gereksinimini karşılayamayan tek bölgeli, nakit akışı kısıtlı (limansız) bir ölçüm düzeneğinden ve skor yapısından geliyor (§1.3-1.5).

### 1.3 Ayrıştırma koşusu (4 bölge × 5 önayar, tohum 1, 7 gün, pasif referanslı)

Bu belge için **tek seferlik** küçük bir koşu yapıldı (`pasif` = önayar uygulamayan odak oyuncu; 4 bölge × 5 önayar, toplam 20 koşu ≈ 78 sn). Ayrıca pazar fiyatlarını izleyen 2 kısa koşu (inci_limani, 8 sn). HEAD `7fe552b` kodunu kullandığı için v0.1 raporundan ±%5 (kor_ocak/agir_sanayi'de −%34) sapar (bot sırası rotasyonu ve çekirdek düzeltmeleri).

| Bölge | Önayar | Skor (bin) | Δ pasif | Δhazine | Δstok | Yatırım | İhracat geliri | İsraf değeri | Tesisler (7. gün) |
|---|---|---|---|---|---|---|---|---|---|
| kor_ocak (maden_dag, limansız) | **pasif** | 290 | 0 | −18 | 308 | 0 | 0 | 240 | cevher×1, kömür×1 |
| | ihracatci | 282 | −8 | −50 | 297 | 35 | 0 | **1 253** | cevher×2, kömür×2 |
| | elektronik | 318 | **+28** | −50 | 327 | 41 | 0 | 16 | + elektronik_fab |
| | gida_odakli | 272 | −18 | −44 | 295 | 21 | 0 | 240 | + gida_fab |
| | agir_sanayi | 187 | **−104** | −50 | 202 | 35 | 0 | 0 | cevher×2, kömür×2 |
| inci_limani (liman+petrol) | pasif | −342 | 0 | 2 | −344 | 0 | 0 | 0 | rafineri×1 |
| | ihracatci | **2 055** | **+2 398** | 1 011 | 984 | 60 | 1 067 | 0 | + 2 petrol kuyusu |
| | elektronik | −388 | −46 | −43 | −386 | 41 | 0 | 0 | |
| | gida_odakli | −387 | −45 | −30 | −378 | 21 | 0 | 0 | |
| | agir_sanayi | −367 | −25 | −23 | −344 | 0 | 0 | 0 | |
| sisli_liman (liman, rezervsiz) | pasif | −301 | 0 | 3 | −303 | 0 | 0 | 0 | parça_fab×1 |
| | ihracatci | −301 | −1 | 2 | −303 | 0 | 0 | 0 | (hiçbir şey yok) |
| | elektronik | −380 | −79 | −42 | −378 | 41 | 0 | 0 | |
| | gida_odakli | −316 | −16 | −13 | −303 | 0 | 0 | 0 | |
| | agir_sanayi | −326 | −25 | −22 | −303 | 0 | 0 | 0 | |
| yesil_vadi (ova) | pasif | 349 | 0 | −16 | 365 | 0 | 0 | 753 | çiftlik×1, gıda_fab×1 |
| | ihracatci | **632** | +283 | −27 | 647 | 11 | 0 | 617 | çiftlik×2 |
| | elektronik | 373 | +24 | −50 | 382 | 41 | 0 | 284 | |
| | gida_odakli | 617 | +268 | −42 | 647 | 11 | 0 | 616 | çiftlik×2 |
| | agir_sanayi | 324 | −25 | −41 | 365 | 0 | 0 | 752 | |

Okuma:

1. **Ortak mod baskın:** başlangıç stoku (460 bin para) bir haftada tüketimle erir (gıda −140 bin, elektronik −54/−80 bin, yakıt −50 bin, mühimmat −30 bin, parça −54 bin); tüm önayarlar ≈ −300 bin'lik ortak bir tabanı paylaşır. Önayarın katkısı bölge skorunun kor_ocak'ta %10'u, sisli_liman'da %0'ı. Bölgeleri **önayar değil bölge kaynağı** ayırır.
2. **Depo tavanı skoru kırpar:** kor_ocak'ta `pasif` bile 7 günde cevher ve kömür stokunu tavana (10 000 birim) çıkarır (+343 bin, +294 bin). `ihracatci` ikinci madenleri kurar, ama fazla üretim israf olur (1.25 milyon para değerinde) ve skor **düşer** (−8). Hazine 50 bin → 0 (limansız bölgede gelir yalnızca vergi ≈ 39 para/saat; tek tesisin işletmesi 60 para/saat).
3. **"Kaybeden" değil "kendine zarar vermeyen" kazanıyor:** sisli_liman'da `ihracatci` = `pasif` (hiçbir şey yapamıyor) birincidir; diğerleri kötü tesis kurarak 16-79 bin kaybeder. `lojistik_yatirimi` tek bölgede kenar bulamaz (`kenarAdaylari` ≥2 bölge ister), yalnız parça fabrikası kurar ≈ pasif; v0.1'de ilk üçte %68.8 olmasının büyük olasılıkla nedeni budur.
4. **`elektronik` hilesi:** elektronik fabrikası rezerv/etiket istemez; 200 bakır + 200 silis başlangıç stoku 150 elektroniğe dönüşür (kor_ocak: elektronik stoku −53.8 bin yerine +5.0 bin; +59 bin − 15 bin girdi − yatırım ve işletme ≈ net +28 bin). Her bölgede tekrarlanabilen bu **tek seferlik** kazanç, `elektronik`in ilk üç oranını %75'e çıkarıyor. Nüfusu büyük limanlarda (inci, sisli) nüfus elektroniği tükettiği için −46/−79 bin olur.
5. **`agir_sanayi` kendini vuruyor:** kor_ocak'ta tesis sayısı iki katına çıkarken cevher üretimi 16.7 bin → 8.8 bin birime iner; derin yöntemler yakıt girdisi ister (yakıt stoku başlangıçta tükenir, üretimde yakıt yok). Önayar tasarımı (bot heuristiği) zincir kapanışını görmüyor.
6. **İhracat yalnızca tavan dolunca ve limanda değer kazandırır:** inci_limani'nde `ihracatci` 13 013 petrol ve 8 725 yakıt ihraç eder (1.07 milyon para, birim başına ≈ 49 para) ve skor 2.06 milyona çıkar; hemen her diğer bölgede ihracat komutu verilemez (`bolge liman degil`).

### 1.4 Sorular ve hükümler

| Soru | Kanıt | Hüküm |
|---|---|---|
| Dünya pazarı emilimi 4 oyuncuya göre hâlâ geniş mi? | Arka plan botları ham maddenin emilimini 3. günde %100 doldurur (Tablo 2); fiyat 0.50-0.75×; gerçek ihracat geliri 0.62-0.76× taban | **Hayır.** Boş pazar primi (1.4-1.75×) rekabetli dünyada yok; ihracat "kolay para" değil |
| İşleme zincirlerinde girdi lojistiği mi pahalı? | 30 günlük 4 botlu koşuda kapsam açıklık nedeni yok; kenar kapasitesi 150-760 birim/saat (kara), tesis akışı 50-200 birim/saat | **Hayır (lojistik bağlamıyor).** Sorun girdinin *bulunabilirliği*: tek bölgede yok; ithalat 1.7-1.9×taban (Tablo 3); bakır+silis 50 bölgenin hiçbirinde birlikte yok |
| Sabit işletme gideri küçük tesisi mi ezer? | Sabit gider/KD: ham %3-11, çelik %33, parça/mühimmat %17 (Tablo 1) | **Hayır**, çelik zinciri hariç. Ama limansız bölgede vergi (40 para/saat) tek tesisin işletmesini (60) bile karşılamaz: nakit akışı yapısal olarak negatif |
| 7 günlük ufuk yatırımı cezalandırıyor mu? | Geri ödeme 2-12 saat (çelikhane 58, parça/mühimmat 26); skor yatırımı geri ekler | **Hayır.** Ama ufuk iki şeyi göremez: damar tükenmesi (medyan damar ≈ 98 günde verim 0.5) ve stok tavanı doluş sonrası dönem |
| Önayarların kendisi asimetrik mi? | `ihracatci` 6/6 ham çıkarım türü + 11 mal ihracatı; diğerleri 1-2 ham tür; `lojistik_yatirimi` tek bölgede kenarsız, `askeri_hazirlik` savaşsız dünyada salt maliyet | **Evet** (Tablo 6) |
| İhracatçı neden her yerde ilk üçte? | Ham çıkarımın tüm türlerini kurar (üst küme), işlemeye girişip kendine zarar vermez, pasife yakındır | Ölçüm artefaktı ağırlıklı (§1.5) |

**Tablo 6 — Önayar asimetrisi (`packages/botlar/src/onayarlar.ts`).**

| Önayar | Kurabileceği tesis türü | Ham çıkarım türü (6 üzerinden) | İhracat malı (11) | Yöntem/araştırma |
|---|---|---|---|---|
| gida_odakli | çiftlik, gıda fab. (2) | 1 | 2 | mekanize tarım |
| agir_sanayi | cevher, kömür, çelikhane, parça (4) | 2 | 4 | derin cevher/kömür, elektrik ark (yakıt girdisi!) |
| elektronik | bakır, silis, parça, elektronik fab., çelikhane (5) | 2 | 4 | otomatik hat, mekanize, otomasyon |
| enerji | petrol, rafineri, kömür (3) | 2 | 3 | derin kömür |
| **ihracatci** | çiftlik + 5 maden (6) | **6** | **11** | yok (derin yakıt tuzağına girmez) |
| lojistik_yatirimi | parça fab. (1) | 0 | 0 | kenar geliştirme (tek bölgede kenar yok) |
| askeri_hazirlik | çelikhane, rafineri, kömür, cevher (4) | 2 | 0 | birlik; dünyada savaş yok |

### 1.5 Ölçüm artefaktı mı, tasarım sorunu mu?

| # | Bulgu | Tür | Etki büyüklüğü |
|---|---|---|---|
| A1 | Odak tek bölgeli: ticaret yalnızca limanda (9/50 bölge; örneklenen 16'da 3), kenar yok → lojistik ve zincir girdisi yok | **Artefakt** | Bölgelerin ~%80'inde ihracat yok; `lojistik_yatirimi` ölçülemez |
| A2 | Depo tavanı (10 000 birim/mal) 7 günde doluyor (cevher/kömür 100-111 saatte, tahıl 50 saatte); skor taban fiyatla kırpılı "stok slotu doldurma" | **Artefakt** | kor_ocak: fazla madenin tamamı israf (1.25 milyon para) |
| A3 | Pasif referans yok; ortak mod (−300 bin) önayar farkından büyük | **Artefakt** | 4 bölgeden 3'ünde en iyi önayar pasifin ≤%10 üstünde veya pasifin altında |
| A4 | Beraberlikte "ortalama sıra": pasife eşit önayar ilk üçe sayılıyor | **Artefakt** | sisli_liman-tipi 5 rezervsiz liman |
| A5 | `ihracatci` üst küme; temalar ham çıkarım kümelerinin alt kümesi | **Artefakt (önayar)** | Hemen her bölgede `ihracatci` ≥ tematik önayar |
| A6 | `elektronik`: başlangıç stokundan tek seferlik dönüşüm (+28 bin) | **Artefakt** | %75 ilk üç oranının ana nedeni |
| A7 | Arka planda militarist yok → `askeri_hazirlik` değersiz; 7 gün tükenmeyi göstermez | **Artefakt** | 2/7 önayar yapısal olarak kazanamaz |
| D1 | Ham çıkarım girdisiz, işçi başına yüksek ve (petrol hariç) zincirden az işçiyle kâr ediyor; maden bölgeleri (%52) işgücü kısıtlı | **Tasarım** | zincir/ham 1.00-1.05 |
| D2 | Çelik/parça/mühimmat zinciri işçi başına 83-175 (ham 250-400); elektrik_ark dominated | **Tasarım** | ağır sanayi teması hiçbir bölgede niş değil |
| D3 | Pazar asimetrisi: ham E/arz 1.5-3.0 (boş pazarda +%38-75 prim), işlenmiş E/arz ≈ 1.0 ve çok ince; ithalat 1.7-1.9×, makas %22 | **Tasarım** | ithalat→işleme marjı −2 bin…−13 bin/saat |
| D4 | Nüfus = yalnızca lavabo; vergi tüketimin %2'si; ham maddenin iç tüketimi yok; limansız bölgede gelir kaynağı yok | **Tasarım** | limansız bölgede nakit akışı negatif (kor_ocak pasif −18 bin/hafta) |
| D5 | Damar ölçeği: medyan 392 bin birim; tek tesiste 25. günde verim medyan 0.90 (yalnız 7/48 damar <0.8); kayan yatak mekanizması (02 §2-5) eylemsiz | **Tasarım** | bölge farkı zamanla artmıyor |
| D6 | 5 rezervsiz liman (nüfus ≈ 1.1 milyon) için yerel değer üretme yolu yok; v0 H6 tablosunda sisli_liman ve gumus_limani içeren geç katılan oyuncu yerleşik medyanın %10'unda kaldı | **Tasarım** | H1 ve H6 aynı kaynaktan |

Sonuç: v0.1 H1 sonucu büyük ölçüde artefakttır, ama artefaktlar düzeltilince de bir "kaynak determinizmi" kalır: bölgeler birbirinden **rezerv** (ova→gıda, petrol→enerji, maden→ham) ile ayrılır, stratejiyle değil. Ağ rolü (hammadde/işleme/ihracat) farkı, tek bölgeli protokolde ve mevcut içerik sayılarında görünmez; bu yüzden hem ölçüm hem küçük veri/kural düzeltmeleri gerekir.

---

## 2. Öneriler

Her öneri için "beklenen etki" bu belgedeki sayılardan çıkarılan **tahmindir**; doğrulanmamıştır.

### Ö1 — H1 düzeneği v0.2 (yalnızca ölçüm)

| Alan | İçerik |
|---|---|
| Mekanizma | (a) **Pasif referans:** `pasif` odak oyuncu her bölgede koşulur; skor = eklenen değer = önayar − pasif. Önayar yalnız Δ ≥ max(10 bin para, pasifin %3'ü) ise sıralamaya girer; aksi halde "anlamlı fark yok" ve ilk üç sayımına katılmaz. (b) **Ortak yerel-ham tabanı:** tüm önayarlar, bölgenin her rezerv türü için bir tesis kurar (ortak aday); temalar yalnızca ek karar getirir. `ihracatci` "tüm ham türler" değil "ticaret teması" olur (limanı olan bölgede fazla malı ihraç eder). (c) **Odak kümesi:** odak oyuncu = odak bölge + kenarla bağlı en yakın liman (odak zaten limansa tek bölge). Ticaret ve kenar geliştirme böylece işler. (d) **Gün 4-7 akışı:** skor, gün 4-7 net değer artışı (başlangıç stoku dönüşümü ve ilk tavan dolumu dışlanır); (e) arka plandan biri `militarist` (H3 dünyasıyla aynı) — savaş ve savunma duruşu değer bulsun; tohum sayısı ≥5. (f) **Rapor:** Δhazine / Δstok / yatırım / ihracat / israf ayrıştırması ve "tek sabit önayarın ortalama pişmanlığı" (regret: her bölgede en iyi önayara göre kayıp yüzdesi) eklenir; ilk üç oranı ana verdict kalır. |
| Dosya | `packages/olcum/src/h1.ts` (skor, sıralama, küme), `packages/botlar/src/onayarlar.ts` (ortak taban, `ihracatci` daraltma), `packages/olcum/src/rapor.ts`, `packages/botlar/src/kosucu.ts` (küme) |
| Beklenen H1 etkisi | En yüksek ilk üç oranı %87.5 → **%50-65 (tahmin)**. 4 bölge örneğinde (§1.3) eşik uygulanınca anlamlı kazananlar: kor_ocak {elektronik}, inci {ihracatci}, sisli {hiçbiri}, yesil {ihracatci, gida, elektronik}: önayar başına pay ≤ %50. Önemli: bu düzeltme H1'i kendiliğinden "geçirmeyebilir"; amaç gerçek tabanı görmektir |
| Yan etkiler | Oyun kuralları değişmez; H2/H6/H7 etkilenmez. Koşu süresi ≈ 1.6× (pasif + küme) |
| Risk | Ölçüm tanımı değişir; PDF eşiği (%70) yeni tanımda kalibre edilmeli ([00 §6](00-vizyon-ve-kararlar.md): eşikler başlangıç önerisidir). Küme seçimi bölge türünü bulanıklaştırabilir (odak merkez bölge olarak etiketlenir). Skor "eklenen değer"e dönünce v0.1 ile doğrudan karşılaştırma kopar (v0.1 verileri yeni tanımla yeniden hesaplanmalı) |
| Maliyet | Düşük (yalnızca ölçüm paketi) |

### Ö2 — İşleme yöntemlerini işçi verimine göre dengele (veri)

| Alan | İçerik |
|---|---|
| Mekanizma | Hedef: zincir yöntemlerinin işçi başına KD'si ham çıkarımla yarışır (≥250-300), sabit gider/KD ≤ %20. Öneri (başlangıç değerleri): `yuksek_firin` işçi 12 000 → **7 000**, çıktı çelik 50 000 → **60 000** (KD 2 200, 314/işçi); `elektrik_ark` girdiler cevher 80 000 → **60 000**, yakıt 30 000 → **20 000**, çıktı 50 000 → **60 000** (KD 3 100, 344/işçi; gerek: yakıt akışı ve 3 günlük araştırma = "yöntemin bedeli"); `standart_parca` işçi 10 000 → **6 000** (233/işçi); `standart_muhimmat` işçi 8 000 → **5 000** (280/işçi) |
| Dosya | `packages/veri/icerik/icerik.json` (`yontemler[*]`) |
| Beklenen H1 etkisi | Tek bölgeli protokolde **neredeyse yok** (maden_dag zincir/ham 1.00 → 1.01, maden_kıyı 1.01 → 1.05; işgücü kısıtı sürüyor). Kümeli protokolde (Ö1c) ve gerçek oyunda işleme rolü (kent/liman) için KD çıtası düşer; `agir_sanayi` ve `askeri_hazirlik` temaları yaşayabilir. Ölü uç `elektrik_ark` ölçüm dışı kalmaz (ağ: tazelik mekanizması 4, [02 §2](02-tasarim-arge.md)) |
| Yan etkiler | H2 (+): teknoloji ağacında gerçek seçim (elektrik_ark artık yakıt bağımlısı ama üstün); H3 (+): mühimmat/çelik talebi ve kapsam etkisi büyür; H6 (nötr-olumlu): küçük bölgelere ucuz işleme; H7 (nötr) |
| Risk | Çelik ve parça bolluğu: inşa ve bakım maliyeti girdisi ucuzlar, yatırım daha hızlı biter (R2: karar tükenmesi 10-15. günde geri gelir mi, 30 günlük H2 ile izlenmeli). `yuksek_firin` çıktı +%20 tek başına depo tavanını erken doldurur |
| Maliyet | Çok düşük (JSON) |

### Ö3 — İşlenmiş mal pazarı derinliği (veri)

| Alan | İçerik |
|---|---|
| Mekanizma | İşlenmiş malların emilim ve arzını yükselt; ham maddeye **dokunma** (v0.1 ham pazar kalibrasyonunu ve lavabo/gelir dengesini koru). Öneri: çelik 120/100 → **300/260**; parça 80/80 → **200/170**; elektronik 50/50 → **120/100**; yakıt 150/150 → **300/260** (emilim/arz); mühimmat değişmez. Tek fabrikanın ihracatında fiyat/taban: elektronik 30/saat için **0.55 → 0.94** (gelir 5 940 → **10 100**/saat, +%70), parça 40/saat için 0.63 → 0.96 (101 → 155 para/birim), yakıt 120/saat için 0.40 → 0.80 |
| Dosya | `packages/veri/icerik/parametreler.json` (`pazar.emilimSaat`, `pazar.arzSaat`) |
| Beklenen H1 etkisi | Tek bölgede düşük (işlenmiş mal ihracatı limana bağlı); kümeli/gerçek oyunda zincir çıktısına bir pazar verir. Elektronik işleme merkezi marjı −2 061 → **+3 794**/saat olur; diğerleri hâlâ negatif (çelik −776, parça −1 580): ithalatla beslenen işleme merkezi **hedef değildir**, ağ içi girdiyle beslenen işleme hedeftir |
| Yan etkiler | H3 (±): işlenmiş mal fiyatı daha az oynak; askeri üretim kaymasının fiyat etkisi azalabilir, kapsam etkisi korunur (H3 iki göstergeden biri yeterli); H7 (nötr-hafif): pazar istikrarı aktif/pasif farkını küçültebilir |
| Risk | Gelir ↑ → lavabo/gelir oranı (hedef 0.4-0.6; 30 günlük koşuda) düşer; `israf/üretim` izlenmeli. Çok derin pazar "ayarla-unut" stratejisini güçlendirebilir (H7 eşitlenme yönü) |
| Maliyet | Çok düşük (JSON) |

### Ö4 — Bölge verim çarpanları: ova, dağ, kent (küçük kural)

| Alan | İçerik |
|---|---|
| Mekanizma | Bölge türü, **çıktı oranına** çarpan verir (girdiye değil): **ova** etiketli bölgede tarım (çiftlik) çıktısı ×1.25; **dağ/dar geçit** etiketli bölgede ham çıkarım (tahıl hariç) çıktısı ×1.25; **kent** (nüfus ≥ 400 bin; haritada 4 bölge) işleme yöntemleri (rezervsiz yöntemler) çıktısı ×1.30. Sayılar taslak; hedef: tür başına bir temayı +%25-30 öne çıkarmak, diğer temaları kapatmamak. Kent çarpanı (Ö2 ile) parça KD'sini 1 400 → ≈ 3 560/saat, çeliği 1 000 → ≈ 4 360'a çıkarır |
| Dosya | `packages/veri/icerik/parametreler.json` (yeni `bolge.verimCarpaniPpm`: `ova_tarim`, `dag_cikarim`, `kent_isleme`; `bolge.kentNufusEsigi`), `packages/veri/src/sema.ts` (şema), `packages/cekirdek/src/ekonomi/uretim.ts` (`bolgeHesapla`: `ciktiPot`; `bolgeVerimCoz`/`bolgeOranlariUygula`: `ciktiGercek`; ortak `ciktiCarpani(b, y)` yardımcısı; tamsayı ppm, determinizm korunur) |
| Beklenen H1 etkisi | Ölçüm artefaktları giderildikten sonra bölge türü → tema eşlemesi güçlenir: ova/kent → gıda ve işleme; dağ → ham çıkarım; kent → sanayi. **Tahmin:** Ö1+Ö2+Ö3 ile birlikte en yüksek ilk-üç oranı ≤ %60 ve bölge türü başına en iyi önayar en az 4 farklı (şu an 2 sınıf: liman/ova/kent → `ihracatci`, diğer → `elektronik`) |
| Yan etkiler | H2 (nötr-olumsuz): bölge içi tema "çözülür", ama dinamik (Ö5-Ö7) eksik kalırsa tekrar artar; H6 (+): küçük dağ bölgelerine +%25 (yetişme); H7 (nötr); H3 (nötr) |
| Risk | Çarpan >1 olunca verim %100'ü aşar; stok tavanını hızla doldurur (israf ↑). Kaynak determinizmini pekiştirir ("rezerv neyse tema odur"); bu H1 sayısını düzeltir ama strateji çeşitliliğini kendi başına artırmaz. Çarpanlar küçük tutulmalı (≤ +%30) |
| Maliyet | Orta (şema + ~30 satır çekirdek + 3 sabit; test eklenmeli) |

### Ö5 — Liman elleçleme kapasitesi (v0.3 adayı)

| Alan | İçerik |
|---|---|
| Mekanizma | Liman başına toplam ihracat+ithalat hacmi üst sınırı (öneri: 250 birim/saat; `konteyner_limani` teknolojisi ve deniz kenarı geliştirmesi +%50). Sınır aşılırsa emirler **değer yoğunluğu sırasıyla** (taban fiyat/birim) karşılanır: hacimli ham maddenin (tahıl, kömür, silis: 25-30 para/birim) önüne elektronik/parça/çelik (120-400) geçer |
| Dosya | `packages/veri/icerik/parametreler.json` (`pazar.limanKapasiteSaat`, `teknoloji` bağı), `packages/cekirdek/src/ekonomi/pazar.ts` (`pazarEmirleriniGerceklestir`), `packages/veri/icerik/icerik.json` (`konteyner_limani` şu an yalnız bir karar açıyor: ölü uç) |
| Beklenen H1 etkisi | Liman bölgelerinde ihracatçının ham-toptan üstünlüğünü kırar (inci_limani: petrol 150 + yakıt 120 = 270 birim/saat > 250); liman türünde tema farklılaşır. Haritanın yalnız %18'ini (9 liman) etkiler; tek bölgeli protokolde sınırlı |
| Yan etkiler | H4 (±): liman doluluğu arayüzde ek okunurluk yükü, ama "neresi açık ve neden" sorusuna yeni neden ("liman dolu") ekler; H2 (+): yeni karar ekseni; H7 (nötr) |
| Risk | Bir kapasite sınırı daha = ek karmaşıklık; liman sayısı az olduğundan etki dar. İlk v0.2 paketi yerine Ö1-Ö4 sonuçları gelince karar ver |

### Ö6 — Yerel iç pazar geliri (v0.3 adayı)

| Alan | İçerik |
|---|---|
| Mekanizma | Nüfusun fiilen tükettiği gıda, yakıt ve elektronik (karşılanma `fr1` ile ölçekli) hazineye `taban × çarpan` gelir getirir (öneri çarpan 1.2; yalnız bölgenin kendi stoku; ithal mal bu geliri bozmaz ama makas nedeniyle kârsızdır). 100 bin nüfus için gelir ≈ 2 400 para/saat (vergi 40); limansız bölgede nakit akışı ilk kez pozitif olur, işlenmiş mal (gıda/yakıt/elektronik) nüfusla orantılı bir iç pazar bulur |
| Dosya | `packages/veri/icerik/parametreler.json` (`ekonomi.yerelAlimCarpaniPpm`), `packages/cekirdek/src/lojistik/cozum.ts` (`hazineKalemleri`: gelir kalemi) |
| Beklenen H1 etkisi | Kent ve ova türünde gıda/yakıt zinciri değer kazanır; limansız bölgede hazine kısıtı kalkar, tek bölgeli ölçümün "kendine zarar" tuzağı küçülür. Mevcut durumda maden bölgeleri (küçük nüfus) etkilenmez |
| Yan etkiler | H6 (+): yeni oyuncunun erken geliri; H7 (**−risk**): gelir sabit tüketimden geldiği için kur-ve-unut oranı 24/48. saatte zaten %85 üstü (v0: %96-99 ve %76-92); bu oran yükselir; H2 (nötr) |
| Risk | Lavabo dengesi ([02 §3](02-tasarim-arge.md)): tüketim "ücretsiz lavabo" niteliğini kaybeder, para musluğu ↑, stok birikmesi (R2) geri gelebilir. Çarpan ve aralık 30 günlük koşuyla kalibre edilmeli; önce Ö1-Ö4 |

### Ö7 — Damar ölçeği ve tükenme (v0.3 adayı; H2 ve 20-25. gün hedefi)

| Alan | İçerik |
|---|---|
| Mekanizma | Damar büyüklüğünü küçült: medyan 392 bin birim → ≈ 150 bin (aralık 40-400 bin); tek tesiste 25. günde %25-45 tükenme, verim ≈ 0.75. Tükenme görünür hale gelir, `sqrt(kalan/ilk)` bir "kayan yatak" mekanizmasına dönüşür ([02 §2, mekanizma 5](02-tasarim-arge.md): 15-25. günlerde yer değiştirme zorlar). Şu an tek tesiste 25. günde yalnız 7/48 damar <0.8 verimde, medyan damarın verim 0.5'e inmesi ≈ 98 gün |
| Dosya | `packages/veri/haritalar/sentetik-50.json` (`rezervler`); parametre değil harita verisi |
| Beklenen H1 etkisi | 7 günlük ölçümde **görünmez**; H1'e 14-21 günlük alt ölçüm (en az 4 bölge × 4 tohum) eklenirse zengin/fakir damar farkı stratejiyi (ikame, işleme, ithalat) bölgeye göre ayrıştırır. Ana etkisi H2'dedir (20-25. gün yenilik) |
| Yan etkiler | H2 (+, ana); H6 (+): sahipsiz bölgeler uykuda donduğundan geç katılan taze damarla başlar (yetişme); H7 (**−risk**): kur-ve-unut oranı 168/336. saatte zaten %49.5-53.6; tükenme onu %50 altına (çöküş) itebilir |
| Risk | Tükenmenin ceza gibi hissedilmesi; yeni damar/keşif olayı (v0 dışı, [02 §2](02-tasarim-arge.md)) olmadan "sıkışma". 14-21 günlük ölçüm maliyeti ≈ 2-3× |

### Değerlendirilip ertelenenler

| Fikir | Gerekçe |
|---|---|
| Oyuncuya özgü pazar doygunluğu (kendi ihracatın fiyatını daha çok düşürür) | Rekabetli dünyada doygunluğu arka plan botları yaratıyor; tek bölgeli odakta kendi hacmi (≤160 birim/saat) fiyatı belirlemiyor. Tek malda yığılmayı cezalandırır (H2 için ilginç), ama H1 teşhisine doğrudan yanıt değil; v0.3+ |
| Ham malda parasal nakliye maliyeti | Tek bölgeli protokolde etki yok; kümeli protokol (Ö1c) sonrası anlamlı |
| Vergi tabanını yükseltmek (limansız bölgede nakit akışı) | H7 eşitlenme riski; Ö6 daha hedefli |
| İthalat/ihracat çarpanlarını daraltmak (1.1/0.9 → 1.05/0.95) | PDF/Ar-Ge değeri; ithalat→işleme marjı yine negatif kalır (Tablo 3), kazanç marjinal |

---

## 3. Önceliklendirme

### 3.1 v0.2 turu için önerilen paket (3 değişiklik)

| # | Değişiklik | İçerik | Gerekçe | Tür |
|---|---|---|---|---|
| **1** | **H1 düzeneği v0.2** | Ö1 (pasif referans, ortak ham taban, odak kümesi, gün 4-7 akışı, arka planda militarist, ayrıştırma + regret) | Diğer iki değişikliğin etkisini ancak düzeltilmiş ölçüm gösterebilir; oyun riski sıfır; artefaktların çoğunu kapatır | Ölçüm |
| **2** | **İşleme zinciri ekonomisi** | Ö2 + Ö3 (yöntem KD/işçi dengesi, elektrik_ark düzeltmesi, işlenmiş mal pazarı) | Yalnızca JSON; geri alınabilir; D2-D3'ü ve ölü teknolojiyi kapatır | Veri |
| **3** | **Bölge verim çarpanları** | Ö4 (ova/dağ/kent çıktı çarpanı) | H1'in kalan gerçek kısmı (kaynak determinizmi + ağ rolü) için en ucuz doğrudan kaldıraç; H6'ya da yardım eder | Küçük kural |

Sıra önemlidir: **3** yalnızca **1** sonrası H1 hâlâ > %70 ise devreye alınır (koşullu). Ö5-Ö7 v0.3 adayları; Ö7 (tükenme) 20-25. gün hedefi için en önemli gizli iş kalemidir ve H2 için mutlaka sonraki tura girmelidir.

### 3.2 Nasıl doğrulanır

Aşamalı, her adımda eşli tohumlarla (`--tohum 1-5`, Ö1 sonrası bölge örneği 16) ve önceki rapora `--karsilastir`:

| Adım | Değişken | Ölçüm | Kabul ölçütü |
|---|---|---|---|
| 0 | Yalnız Ö1 (oyun v0.1 değişmedi) | H1 v0.2 (yeni tanım); v0.1 verileri yeni tanımla yeniden hesaplanır | Yeni temel satırı: en yüksek ilk üç oranı, regret, tür başına en iyi önayar; bu, Ö2-Ö4'ün ölçeğidir |
| 1 | + Ö2 + Ö3 | H1, H2, H3, H7 | H1 ilk üç ≤ %70 (hedef ≤ %60); `esitBolge` = 0; H2 tekrar ≤ %60 ve kalıcı sıfır gün yok; H3 ≥ %10 değişim kaybolmaz; H7 ≤ ±5 puan sapma; lavabo/gelir 0.3-0.63 (30 günlük 4 botlu koşu) |
| 2 | + Ö4 (yalnızca adım 1 yetersizse) | H1, H6, H2 | H1 tür başına en iyi önayar ≥ 4 farklı; H6 ≥ %50 hedefi (şu an %33.3); H2 RI ≤ %60; israf/üretim artışı izlenir |

Taslak H1 v0.2 göstergeleri (kalibrasyon bu turda yapılır): (i) en yüksek önayarın anlamlı ilk üç oranı ≤ %70 (PDF eşiği korunur); (ii) tek sabit önayarın ortalama regret'i ≥ %10 (taslak: "tek strateji her bölgede ilk üçte" dışında "tek strateji her bölgeye yetmez" kanıtı); (iii) bölge türü başına en iyi önayar ≥ 4 farklı; (iv) normalize entropi ≥ 0.75 (şu an 0.53).

Doğrulama sırasında kesin **yapılmaması** gerekenler: H1'i geçirmek için eşiği gevşetmek; `ihracatci`yi sıralamadan çıkarmak (A5'in yerine ortak tabanı kurmak gerekir).

---

## Ek: Hesap yöntemi ve sınırlar

- **Tablo 1, 4, 5:** `icerik.json` ve `parametreler.json`; KD/saat = Σ çıktı × taban − Σ girdi × taban (mili-birim/saat → birim/saat çevrilerek); işçi başına KD = KD × 1000 / işçi. Sabit gider = bakım (parça × 180) + 60. **Tablo 4:** bölge başına işgücü = nüfus × %50; her rezerv türü için tesis ≤3, gıda/rafineri/çelik için bileşik modüller (çiftlik+fabrika 21 000 işçi → 11 200 para/saat; kuyu+rafineri 12 000 → 12 000; cevher+kömür+yüksek fırın 31 000 → 7 200); tam sayı kaba kuvvet; başlangıç tesisleri ve depo tavanı hesaba katılmadı (üst sınır). Bölge türü tanımı `h1.ts` `bolgeTuru` ile aynı.
- **Tablo 2/3:** `pazar.ts` formülü (`fiyat = taban × (1 + e × clamp((T−A)/min(T,A)))`, e = 0.75), ihracat çarpanı 0.9, ithalat 1.1; "kendi etkisi dahil" = oyuncunun kendi hacmi A veya T'ye eklenir.
- **§1.3 koşuları:** `H1` tekKosu mantığının bu çalışmaya özel kopyası (aynı arka plan botları, tohum 1, 7 gün, saatlik gözlem); HEAD `7fe552b`. `pasif` referansı (önayar uygulamayan odak oyuncu) yeni eklendi. Yalnızca tohum 1 ve 4 bölge: **istatistiksel değil, mekanizma gösterimidir**. Ek koşu: inci_limani'nde 2 koşu, pazar fiyatı ve oyuncu ihracat hacmi günlük izlendi (Tablo 2 "rekabetli" sütunu buradan: `pasif` koşusunda gün 5-7 ortalaması).
- **Sınırlar:** (i) Tablo 2 "rekabetli" değerleri tek tohum ve tek bölgeli odakta alınmış arka plan fiyatlarıdır; oyun içinde oyuncu sayısı ve bot tipi ile değişir. (ii) `agir_sanayi` üretim düşüşünün nedeni (derin yöntem + yakıt girdisi) olası nedendir, ayrıca doğrulanmadı. (iii) Ö2-Ö4 sayıları başlangıç değerleridir; etkileri 30 günlük koşuyla (lavabo/gelir, israf, H2/H7) kalibre edilmelidir. (iv) 06 v0.1 spesifikasyonundaki "sahipsiz bölgeler uykuda" kuralı (H6) Ö7 etkisi için dayanaktır; ölçülmedi. (v) Yukarıdaki hiçbir sayı insan oyununda eğlence kanıtı değildir ([00 R5](00-vizyon-ve-kararlar.md)).
