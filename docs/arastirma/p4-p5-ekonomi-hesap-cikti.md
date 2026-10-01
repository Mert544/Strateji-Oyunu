# P4/P5 ekonomi hesap çıktısı (otomatik üretildi)

Kaynak: `docs/arastirma/p4-p5-ekonomi-hesap.mjs`. Bu dosyayı elle düzenleme; betiği yeniden koş.

## 0. Sabitler (veriden okunan)

| Sabit | Değer | Kaynak |
|---|---|---|
| NPC ithalat çarpanı (komisyonlu / korumada) | 1,1110 / 1,1000 | pazar.makasPpm 200000, islemKomisyonuPpm 10000; docs/06 §13 |
| NPC ihracat çarpanı (komisyonlu / korumada) | 0,8910 / 0,9000 | aynı |
| Kamu fiyat tavanı (derleme zamanı, referans × ) | 1,035 | docs/06 §15.7 madde 5: min(1,10; 1,05; 1,30)=1,05, 2 Ticaret ofisi makas indirimi %30 → 1,035. GDD'deki '1,10 R' üst sınırdır, uygulanan 1,035'tir |
| Şebeke elektrik / yakıt fiyatı (kamu tavanı × taban) | 10,35 ₺ (10.350 mili) / 103,5 ₺ (103.500 mili) | baş lider kararı (G4): santral zorunlu değil; ödeme kamuya (lavabo) |
| Erken oyun süre çarpanı | 0–24 sa %10, 24–168 sa doğrusal %100 | parametreler.erkenOyun; erkenOyun.ts |
| İlk yapı indirimi | ilk 5 yapı %30 (para+mal; ölçekten bağımsız sabit tutar) | mulk.yeniOyuncu; docs/06 §15.10 |
| Hibe / kit | 50.000 ₺ / 120 celik, 40 parca, 200 gida | mulk.yeniOyuncu |
| İşletme gideri | 60 ₺/sa/tesis (bakım düzeyi×ölçek çarpanlı); santral 0 | ekonomi.tesisIsletmeParasiSaat; sanayi.santralIsletmePpm |
| Eşzamanlı inşaat / emir yuvası | 2 / 4 (+4 Ticaret ofisi başına) | mulk |
| NPC likidite ölçeği | max(4, oyuncu)/4 | docs/06 §13; emilim ve arz bu kadar büyür |

### 0.1 Taban fiyat denetimi (kimlik-listesi.json ↔ icerik.json)

| Mal | kimlik-listesi ₺ | icerik ₺ | Durum |
|---|---|---|---|
| un | 50 | 50 | eşit |
| ekmek | 60 | 60 | eşit |
| cam | 95 | 95 | eşit |
| pencere | 360 | 360 | eşit |
| sut | 40 | 40 | eşit |
| sut_urunu | 120 | 120 | eşit |
| findik | 85 | 85 | eşit |
| findik_urunu | 240 | 240 | eşit |
| sekerleme | 180 | 180 | eşit |
| kepek | 18 | 18 | eşit |

Listede ve içerikte birlikte bulunan 24 malın taban farkı: yok.

## 1. Mevcut yöntemlerin katma değeri (taban fiyat; elektrik 10 ₺)

KD = çıktı değeri − girdi değeri (₺/sa, S ölçek, bakım ve işletme hariç). İşçi mülk kipinde bağlayıcı değildir (`kalanIsci` sınırsız, ekonomi/uretim.ts:265), KD/işçi yalnız tutarlılık göstergesidir.

| Yöntem | Girdi → çıktı | Oran | KD ₺/sa | İşçi | KD/işçi | Bant 1,16–1,48 |
|---|---|---|---|---|---|---|
| mekanize_tarim | 20 yakit + 4 parca + 8 elektrik → 320 tahil | 3,43 | 6.800 | 8 | 850 | ÜSTÜNDE |
| standart_gida_isleme | 200 tahil + 10 elektrik → 160 gida | 1,84 | 5.100 | 6 | 850 | ÜSTÜNDE |
| yuzey_cevher | 5 elektrik → 100 cevher | 70,00 | 3.450 | 10 | 345 | ÜSTÜNDE |
| derin_cevher | 12 yakit + 15 elektrik → 190 cevher | 4,93 | 5.300 | 14 | 379 | ÜSTÜNDE |
| yuzey_komur | 5 elektrik → 90 komur | 54,00 | 2.650 | 9 | 294 | ÜSTÜNDE |
| derin_komur | 10 yakit + 12 elektrik → 170 komur | 4,55 | 3.980 | 12 | 332 | ÜSTÜNDE |
| bakir_cikarim | 6 elektrik → 60 bakir | 50,00 | 2.940 | 8 | 368 | ÜSTÜNDE |
| silis_cikarim | 5 elektrik → 60 silis | 30,00 | 1.450 | 6 | 242 | ÜSTÜNDE |
| petrol_cikarim | 6 elektrik → 150 petrol | 150,00 | 8.940 | 5 | 1.788 | ÜSTÜNDE |
| yuksek_firin | 100 cevher + 50 komur + 25 elektrik → 60 celik | 1,37 | 1.950 | 7 | 279 | içinde |
| elektrik_ark | 60 cevher + 20 yakit + 50 elektrik → 63 celik | 1,64 | 2.960 | 10 | 296 | ÜSTÜNDE |
| standart_parca | 40 celik + 10 yakit + 12 elektrik → 40 parca | 1,22 | 1.280 | 5.5 | 233 | içinde |
| otomatik_hat | 40 celik + 10 yakit + 3 elektronik + 20 elektrik → 50 parca | 1,25 | 1.800 | 3 | 600 | içinde |
| standart_elektronik | 40 bakir + 40 silis + 10 parca + 30 elektrik → 30 elektronik | 2,35 | 6.900 | 8 | 863 | ÜSTÜNDE |
| standart_rafineri | 150 petrol + 25 elektrik → 120 yakit | 1,30 | 2.750 | 7 | 393 | içinde |
| standart_muhimmat | 30 celik + 10 yakit + 15 elektrik → 40 muhimmat | 1,26 | 1.250 | 5 | 250 | içinde |
| ahir_besi | 120 tahil → 70 gida + 12 gubre | 1,83 | 2.980 | 5 | 596 | ÜSTÜNDE |
| azotlu_gubre | 50 petrol + 15 elektrik → 40 gubre | 1,78 | 2.450 | 6 | 408 | ÜSTÜNDE |
| komur_santrali | 60 komur → 240 elektrik | 1,33 | 600 | 4 | 150 | içinde |
| yakit_jeneratoru | 40 yakit → 160 elektrik | 0,40 | -2.400 | 2 | -1.200 | altında |

Not: `standart_gida_isleme` oran 1,84, KD 5.100 ₺/sa, işçi başına 850 ₺; `ahir_besi` oran 1,83. İkisi de bant dışındadır ve bölge kipi altınlarının parçasıdır (değiştirilemez); yeni zincirlerin rakibi budur.

## 2. Yeni yöntemler (S ölçek; kod birimi mili, ₺ yanında)

Çevrim: sürekli akış, saatlik tik (kesikli parti yok). Çıktı/girdi/bakım mili-birim/sa; ölçek M ×2,2 / L ×3,6 (çıktı, girdi, elektrik), işçi ×1,8/×2,6, bakım ×2/×3,2 (`parametreler.sanayi.olcekKademeleri`).

| Yöntem (tesis) | Girdiler (mili) | Çıktılar (mili) | İşçi | Bakım (mili parça/sa) | Kirlilik ppm/sa |
|---|---|---|---|---|---|
| `degirmen` (gida_fabrikasi) | tahil 200.000, elektrik 12.000 | un 165.000, kepek 33.000 | 5.000 | 800 | 20 |
| `ekmek_firini` (gida_fabrikasi) | un 165.000, yakit 20.000, elektrik 15.000 | ekmek 250.000 | 8.000 | 800 | 20 |
| `cam_firini` (celikhane) | silis 60.000, yakit 16.000, elektrik 18.000 | cam 50.000 | 5.000 | 1.000 | 60 |
| `celik_dograma` (parca_fabrikasi) | celik 24.000, cam 32.000, parca 5.000, elektrik 15.000 | pencere 28.000 | 7.000 | 1.000 | 20 |
| `kepek_gubresi` (ahir) | kepek 100.000, elektrik 5.000 | gubre 18.000 | 3.000 | 500 | 10 |
| `sut_kepekli` (ahir) | tahil 50.000, kepek 60.000, elektrik 5.000 | sut 82.000, gubre 4.000 | 5.000 | 500 | 10 |

### 2.1 Oran, KD ve işçi başına KD (öneri ↔ rapor değerleri; elektrikli varyant E)

| Yöntem | Sürüm | Girdi ₺/sa | Çıktı ₺/sa | Oran | KD ₺/sa | KD/işçi | Bant |
|---|---|---|---|---|---|---|---|
| degirmen | öneri | 6.120 | 8.844 | 1,445 | 2.724 | 545 | içinde |
| degirmen | rapor | 6.120 | 8.040 | 1,314 | 1.920 | 384 | içinde |
| ekmek_firini | öneri | 10.400 | 15.000 | 1,442 | 4.600 | 575 | içinde |
| ekmek_firini | rapor | 9.850 | 13.500 | 1,371 | 3.650 | 456 | içinde |
| cam_firini | öneri | 3.280 | 4.750 | 1,448 | 1.470 | 294 | içinde |
| cam_firini | rapor | 3.500 | 4.750 | 1,357 | 1.250 | 250 | içinde |
| celik_dograma | öneri | 6.970 | 10.080 | 1,446 | 3.110 | 444 | içinde |
| celik_dograma | rapor | 7.150 | 9.720 | 1,359 | 2.570 | 367 | içinde |
| kepek_gubresi | öneri | 1.850 | 2.520 | 1,362 | 670 | 223 | içinde |
| sut_kepekli | öneri | 2.630 | 3.840 | 1,460 | 1.210 | 242 | içinde |
| sut_kepekli | rapor | 2.630 | 3.840 | 1,460 | 1.210 | 242 | içinde |

### 2.2 (Arşiv) Elektriksiz varyant Y: elektrik e → yakıt e/10 — baş lider kararıyla santral zorunluluğu kalktığı için kullanılmıyor

| Yöntem | E: elektrik | Y: ek yakıt | Y oran | Y KD ₺/sa |
|---|---|---|---|---|
| degirmen | 12.000 | 1.200 | 1,445 | 2.724 |
| ekmek_firini | 15.000 | 1.500 | 1,442 | 4.600 |
| cam_firini | 18.000 | 1.800 | 1,448 | 1.470 |
| celik_dograma | 15.000 | 1.500 | 1,446 | 3.110 |
| kepek_gubresi | 5.000 | 500 | 1,362 | 670 |
| sut_kepekli | 5.000 | 500 | 1,460 | 1.210 |

### 2.3 Uzun yol kısa yolu geçiyor mu? (200 birim tahıl/sa; hepsi NPC pazarına satış; tahıl fırsat maliyeti = ihracat paritesi)

Ölçüt (uretim-agi §2.2): uzun yol kısa yoldan +%10–25 net değer vermeli. Net = satış − dış girdi (yakıt, elektrik: şebeke; parça: ithalat ×1,111) − bakım parçası − işletme gideri. Elektrik ve yakıt kamu şebekesi fiyatıyla (10,35 ve 103,5 ₺; §3.2) hesaplanır.

**komisyonlu (14. günden sonra)**

| Yol | Tesis | Satış ₺/sa | Dış girdi ₺/sa | Bakım+işletme ₺/sa | Net ₺/sa | Tahıl başına net | Standarta göre |
|---|---|---|---|---|---|---|---|
| standart_gida_isleme → gida (1 tesis) | 1 | 9.979 | 5.450 | 220 | 4.310 | 22 ₺ | 0,0% |
| zincir, rapor değerleri (2 tesis) | 2 | 12.510 | 7.902 | 440 | 4.167 | 21 ₺ | -3,3% |
| zincir, A2 önerisi (2 tesis) | 2 | 13.894 | 7.695 | 440 | 5.759 | 29 ₺ | 33,6% |

**korumada (ilk 14 gün; komisyon yok)**

| Yol | Tesis | Satış ₺/sa | Dış girdi ₺/sa | Bakım+işletme ₺/sa | Net ₺/sa | Tahıl başına net | Standarta göre |
|---|---|---|---|---|---|---|---|
| standart_gida_isleme → gida (1 tesis) | 1 | 10.080 | 5.504 | 218 | 4.358 | 22 ₺ | 0,0% |
| zincir, rapor değerleri (2 tesis) | 2 | 12.636 | 7.956 | 437 | 4.243 | 21 ₺ | -2,6% |
| zincir, A2 önerisi (2 tesis) | 2 | 14.035 | 7.749 | 437 | 5.848 | 29 ₺ | 34,2% |

### 2.4 İthalatla ortadan başlamak ↔ kapalı zincir (kademe başına uzman marjı; komisyonlu; ₺/sa; elektrik ve yakıt şebeke fiyatıyla)

| Kademe | Satış (0,891 R) ₺/sa | Girdi (1,111 R) ₺/sa | Bakım+işletme ₺/sa | Net ₺/sa | Satış/girdi |
|---|---|---|---|---|---|
| değirmen uzmanı (tahıl, elektrik ithal) | 7.880 | 6.790 | 220 | 870 | 1,160 |
| değirmen uzmanı, rapor değerleri | 7.164 | 6.790 | 220 | 153 | 1,055 |
| fırın uzmanı (un, yakıt ithal) | 13.365 | 11.391 | 220 | 1.754 | 1,173 |
| fırın uzmanı, rapor değerleri | 12.029 | 10.765 | 220 | 1.044 | 1,117 |
| cam fırını uzmanı (silis, yakıt ithal) | 4.232 | 3.509 | 260 | 463 | 1,206 |
| doğrama uzmanı (çelik, cam, parça ithal) | 8.981 | 7.732 | 260 | 989 | 1,162 |
| kepek_gubresi uzmanı (kepek ithal 20 ₺) | 2.245 | 2.052 | 160 | 34 | 1,094 |

Okuma: bir kademe NPC pazarından alıp NPC pazarına satınca marjı yaklaşık `oran × 0,891/1,111 − 1` = `oran × 0,802 − 1` kadardır; bant 1,16–1,48 için bu −%7 ile +%19 aralığıdır. Bu yüzden bandın alt yarısındaki kademeler (cam 1,36; doğrama 1,36) uzman olarak sıfıra yakındır (Alfa-0'da ara kademe uzmanlığı yok kararıyla uyumlu, G13); üst uçtaki değirmen ve fırın küçük pozitiftir. İthalatla ortadan başlamak her kademede mümkündür ve zarar etmez, ama kapalı zincirin yanında marj çok incedir (§2.3).

P5 tarifleri: rapor (dikey §2.2) ↔ A2 önerisi (üst bant): cam 16 yakıt + 18 elektrik; doğrama 5 parça → 28 pencere.

| Yöntem | Sürüm | Oran | KD ₺/sa | KD/işçi | Uzman net ₺/sa (ithalatla başla) |
|---|---|---|---|---|---|
| cam_firini | rapor | 1,357 | 1.250 | 250 | 236 |
| cam_firini | öneri | 1,448 | 1.470 | 294 | 463 |
| celik_dograma | rapor | 1,359 | 2.570 | 367 | 468 |
| celik_dograma | öneri | 1,446 | 3.110 | 444 | 989 |

### 2.5 Kepek tüketicileri: NPC pazar alımı ↔ `kepek_gubresi` ↔ `sut_kepekli` (komisyonlu; ₺)

| Yol (ahır, 33 kepek/sa arzıyla) | Kepeğin birim değeri ₺ | NPC kepek alımına göre | Ahır yükü | Ahır net ₺/sa (kepek fırsat maliyeti dahil) |
|---|---|---|---|---|
| NPC pazar kepek alımı (0,891 R) | 16,0 | - | - | 0 (yapı gerekmez) |
| `kepek_gubresi` (100 kepek + 5 elektrik → 18 gübre) | 21,9 | +%37 | %33 | 35 |
| `sut_kepekli` (50 tahıl + 60 kepek → 82 süt + 4 gübre) | 33,9 | - | %55 | 429 |
| karşılaştırma: `ahir_besi` (120 tahıl → 70 gıda + 12 gübre; kepek yok) | - | - | %100 | 2.495 |

Okuma: (1) NPC pazar kepek alımı kepeği çöpe gitmekten korur ama değeri yalnız 16 ₺/birimdir. (2) `kepek_gubresi` kepeğe NPC'nin %37 üstünde ödeyen en sade ikinci tüketicidir; tek girdi, tek çıktı, yeni mal yok, ahır tesisi. (3) `sut_kepekli` ve `kepek_gubresi` ahırın saatlik netinde mevcut `ahir_besi`nin (gıda ₺70 anomalisi, §1) çok gerisindedir: kepek yüzünden ahır kuran oyuncu çıkmaz, ahırı zaten tahılla besi için kuranın kepeği değerlendirmesi beklenir. Bu yüzden kepeğin P0 tüketicileri: **(a) NPC pazar kaydı (mevcut) + (b) `kepek_gubresi`**; `sut_kepekli` süt zinciri ile P1'e kalır (P0'da veri satırı olarak da girebilir, oynanış etkisi küçük).

**Güvence alıcı bütçesi (isteğe bağlı `NpcAlici{tur:"guvence"}`; fiyat R×%50).** NPC pazarı kepeği 120 × ölçek = 6.000 birim/sa emer ve fiyatı ancak doyunca ×0,25'e (4,5 ₺) iner; güvence alıcı bu tabanı 9 ₺'de tutar. Alfa-0 varsayımı 50 değirmen: kepek 277.200 birim/hafta, gübre (`kepek_gubresi`) 24.948 birim/hafta. Haftalık hacim = üretimin %25'i: kepek 69.300 birim × 9 ₺ = **623.700 ₺**, gübre 6.237 birim × 70 ₺ = **436.590 ₺**; toplam 1.060.290 ₺/hafta (NPC faucet'ın <%1'i). Muhasebe: NPC'nin oyuncuya ödemesi mevcut `musluk.ihracatNpc` kalemine yazılır (yeni kalem yok); bütçe toplamı sabittir (K-5). Kodda `NpcAlici` yalnız `tur: "kamu"`'dur; güvence türü ek olurdu. **Gerekmez diyorsanız:** NPC pazarı zaten kepek ve gübreyi ≥ 0,25 R ile alır; çöpe gitme riski yoktur, güvence yalnız taban fiyatı yükseltir.

## 3. Yapı bedeli, süre ve ayak izi (S/M/L)

| Yapı | Ölçek | Para | Çelik | Parça | Pencere | Hücre | Doğrudan süre (sa) | Taban değer | İthal değer |
|---|---|---|---|---|---|---|---|---|---|
| ciftlik | S | 6.000 ₺ | 30,0 | 10,0 | 0,0 | 2 | 2,0 | 11.400 ₺ | 11.999 ₺ |
| ciftlik | M | 15.000 ₺ | 75,0 | 25,0 | 0,0 | 3 | 3,0 | 28.500 ₺ | 29.999 ₺ |
| ciftlik | L | 27.000 ₺ | 135,0 | 45,0 | 0,0 | 4 | 4,0 | 51.300 ₺ | 53.997 ₺ |
| gida_fabrikasi | S | 10.000 ₺ | 60,0 | 20,0 | 0,0 | 2 | 6,0 | 20.800 ₺ | 21.999 ₺ |
| gida_fabrikasi | M | 25.000 ₺ | 150,0 | 50,0 | 0,0 | 3 | 9,0 | 52.000 ₺ | 54.997 ₺ |
| gida_fabrikasi | L | 45.000 ₺ | 270,0 | 90,0 | 0,0 | 4 | 12,0 | 93.600 ₺ | 98.995 ₺ |
| ahir | S | 8.000 ₺ | 40,0 | 15,0 | 0,0 | 2 | 4,0 | 15.500 ₺ | 16.333 ₺ |
| ahir | M | 20.000 ₺ | 100,0 | 37,5 | 0,0 | 3 | 6,0 | 38.750 ₺ | 40.831 ₺ |
| ahir | L | 36.000 ₺ | 180,0 | 67,5 | 0,0 | 4 | 8,0 | 69.750 ₺ | 73.496 ₺ |
| celikhane | S | 20.000 ₺ | 100,0 | 40,0 | 0,0 | 3 | 10,0 | 39.200 ₺ | 41.331 ₺ |
| celikhane | M | 50.000 ₺ | 250,0 | 100,0 | 0,0 | 4 | 15,0 | 98.000 ₺ | 103.328 ₺ |
| celikhane | L | 90.000 ₺ | 450,0 | 180,0 | 0,0 | 5 | 20,0 | 176.400 ₺ | 185.990 ₺ |
| parca_fabrikasi | S | 15.000 ₺ | 80,0 | 30,0 | 0,0 | 2 | 8,0 | 30.000 ₺ | 31.665 ₺ |
| parca_fabrikasi | M | 37.500 ₺ | 200,0 | 75,0 | 0,0 | 3 | 12,0 | 75.000 ₺ | 79.163 ₺ |
| parca_fabrikasi | L | 67.500 ₺ | 360,0 | 135,0 | 0,0 | 4 | 16,0 | 135.000 ₺ | 142.493 ₺ |
| santral | S | 12.000 ₺ | 70,0 | 30,0 | 0,0 | 3 | 10,0 | 25.800 ₺ | 27.332 ₺ |
| santral | M | 30.000 ₺ | 175,0 | 75,0 | 0,0 | 4 | 15,0 | 64.500 ₺ | 68.330 ₺ |
| santral | L | 54.000 ₺ | 315,0 | 135,0 | 0,0 | 5 | 20,0 | 116.100 ₺ | 122.993 ₺ |
| silis_ocagi | S | 6.000 ₺ | 30,0 | 10,0 | 0,0 | 2 | 6,0 | 11.400 ₺ | 11.999 ₺ |
| silis_ocagi | M | 15.000 ₺ | 75,0 | 25,0 | 0,0 | 3 | 9,0 | 28.500 ₺ | 29.999 ₺ |
| silis_ocagi | L | 27.000 ₺ | 135,0 | 45,0 | 0,0 | 4 | 12,0 | 51.300 ₺ | 53.997 ₺ |
| dukkan | S | 6.000 ₺ | 20,0 | 8,0 | 4,0 | 1 | 4,0 | 11.280 ₺ | 11.866 ₺ |
| dukkan | M | 15.000 ₺ | 50,0 | 20,0 | 10,0 | 2 | 6,0 | 28.200 ₺ | 29.665 ₺ |
| dukkan | L | 27.000 ₺ | 90,0 | 36,0 | 18,0 | 3 | 8,0 | 50.760 ₺ | 53.397 ₺ |

Hücre fiyatı (taban): kırsal 1.000 ₺, kasaba 2.500 ₺, şehir 6.500 ₺; ayrılmış hücre tabandan satılır. Ticari hücre dükkân için ≈×1,45 varsayıldı (dikey §5.2).

### 3.1 Dükkân bedelindeki pencere: iki seçenek (A3 seçecek)

| Seçenek | Veri (kod birimi) | Taban değer | İlk dükkân (indirimsiz) nakit | İlk 5 yapıda %30 ile nakit | Ek koşul |
|---|---|---|---|---|---|
| P-İthal: 4 pencere dükkân bedelinde (G7) | insaParasi 6000000; insaMaliyeti {celik 20000, parca 8000, pencere 4000} | 11.280 ₺ | 6.000 ₺ + 1.600 ₺ pencere ithalatı + 20 çelik + 8 parça | 4.200 ₺ + 1.109 ₺ pencere + 14 çelik + 5,6 parça | `pencere` NPC pazar kaydı var (emilim 100/arz 60); ithalat emri 1 yuva ve ≈1 sa ister; kasa payı ilçe kasasına gider |
| P-Yok: dükkân bedeli pencere içermez, para eşdeğeri eklenir (G7); 4 pencere G8'de eklenir | insaParasi 7440000; insaMaliyeti {celik 20000, parca 8000} | 11.280 ₺ | 7.440 ₺ + 20 çelik + 8 parça | 5.208 ₺ + 14 çelik + 5,6 parça | ithalat emri gerekmez; yapı pencere talebi (Y tüketicisi) G8'e kalır, G8'de `insaMaliyeti.pencere` eklemek yalnız veri değişikliğidir (mevcut dükkânlar ödenmiş kalır) |

Not: GDD'nin "≈11.440 ₺" değeri pencereyi ithalat fiyatıyla (≈400 ₺) sayar; taban fiyatla (360 ₺) dükkân 11.280 ₺, ithalatla 11.866 ₺.

### 3.2 Enerji: kamu şebekesi (elektrik ve yakıt) ve isteğe bağlı santral

Mevcut kod: mülk işletme düğümünde santral yoksa elektrik girdili tesis sıfır üretir (`sanayi/elektrik.ts:40-66`, `ekonomi/uretim.ts:381-410`); nüfus 0, kitte santral yok. **Baş lider kararı (G4): santral zorunluluğu yok.** Elektrik ve yakıt kamu şebekesinden otomatik gelir; fiyat kamu fiyat tavanı kuralıdır (`kamuFiyatTavani`: ulaşılabilir en düşük ithalat çarpanı = 1,035); ödeme kamuya (lavabo). Santral isteğe bağlı yatırımdır; fazlası satılamaz.

| Kalem | Taban ₺ | Şebeke fiyatı ₺ | Kod birimi (mili/birim) | NPC ithalat (komisyonlu) ₺ | Not |
|---|---|---|---|---|---|
| elektrik | 10,00 | 10,350 | 10.350 | - | pazara girmez (depolanamaz); tek tedarik yolu şebeke ya da santral |
| yakıt | 100,0 | 103,50 | 103.500 | 111,1 | şebeke fiyatı NPC ithalatının %6,8 altındadır; emir yuvası harcamaz |

### 3.2.1 Elektrik ve yakıt maliyetinin KD'ye etkisi (S ölçek; KD taban fiyatla elektrik 10 ₺, yakıt 100 ₺ idi)

| Yöntem | Elektrik birim/sa | Elektrik ₺/sa (şebeke) | Yakıt birim/sa | Yakıt ₺/sa (şebeke) | KD taban ₺/sa | KD şebeke ₺/sa | Değişim |
|---|---|---|---|---|---|---|---|
| degirmen (öneri) | 12,0 | 124,2 | 0,0 | 0,0 | 2.724 | 2.720 | -0,15% |
| ekmek_firini (öneri) | 15,0 | 155,3 | 20,0 | 2070,0 | 4.600 | 4.525 | -1,64% |
| kepek_gubresi (öneri) | 5,0 | 51,8 | 0,0 | 0,0 | 670 | 668 | -0,26% |
| sut_kepekli (öneri) | 5,0 | 51,8 | 0,0 | 0,0 | 1.210 | 1.208 | -0,14% |
| cam_firini (öneri) | 18,0 | 186,3 | 16,0 | 1656,0 | 1.470 | 1.408 | -4,24% |
| celik_dograma (öneri) | 15,0 | 155,3 | 0,0 | 0,0 | 3.110 | 3.105 | -0,17% |
| standart_gida_isleme (mevcut) | 10,0 | 103,5 | 0,0 | 0,0 | 5.100 | 5.097 | -0,07% |
| yuksek_firin (mevcut) | 25,0 | 258,8 | 0,0 | 0,0 | 1.950 | 1.941 | -0,45% |
| standart_parca (mevcut) | 12,0 | 124,2 | 10,0 | 1035,0 | 1.280 | 1.241 | -3,06% |

Şebeke fiyatı taban fiyatın %3,5 üstündedir; KD etkisi çoğu yöntemde %2 altındadır; yakıt ağırlıklı olanlarda daha büyüktür (cam fırını -%4,2, standart_parca -%3,1). `standart_gida_isleme` 10 elektrik ister (103,5 ₺/sa; KD −3,5 ₺).

### 3.2.2 Santralin geri ödemesi (isteğe bağlı yatırım; şebeke fiyatına karşı)

Yatırım (ithal malzeme + 3 hücre): komür santrali 34.832 ₺, hidro 41.498 ₺ (`dag` etiketi). Elektrik birim maliyeti kömür santralinde 8,77 ₺ (kömür ithal), bakım 1,2 parça/sa = 240 ₺/sa sabit; hidroda 0 yakıt, bakım 2 parça/sa = 400 ₺/sa, çıktı 300 × akarsu eğrisi (0,4–2,4, yıllık ortalama 1).

| Elektrik talebi (birim/sa) | Kömür santrali tasarruf ₺/sa | Geri ödeme (sa) | Hidro tasarruf ₺/sa | Geri ödeme (sa) |
|---|---|---|---|---|
| 28,65 | -195 | hiç | -103 | hiç |
| 61,65 | -143 | hiç | 238 | 174 |
| 100,00 | -82 | hiç | 635 | 65 |
| 150,00 | -3 | hiç | 1.153 | 36 |
| 200,00 | 76 | 459 | 1.670 | 25 |

28,65 = P4 zinciri (12 + 15 + kepek_gubresi 5×%33); 61,65 = P4 + P5 (+18 + 15). Kömür santralinin başa baş talebi ≈ 152 birim/sa; küçük ve orta ölçekli oyuncuya hiç geri ödemez. Hidro ≥ 100 birim/sa'te anlamlıdır ve yalnız dağ etiketli ilde mümkündür: **santral Alfa-0 için ekonomik zorunluluk değil, büyük ölçek (M/L) tercihidir.**

### 3.2.3 Santral türü × ölçek × yük: kendi elektriği ↔ şebeke (A3 uyarısı: tam yükte avantaj yalnız ≈%6)

| Tür | Ölçek | Kapasite (elektrik/sa, iletim sonrası) | Bakım ₺/sa | Yatırım (ithal malzeme + hücre) ₺ | Tasarruf ₺/sa @%10 yük | @%25 | @%50 | @%100 | Birim maliyet ₺ @%100 (şebeke 10,35) | Başabaş yük | Geri ödeme @%100 yük (sa) |
|---|---|---|---|---|---|---|---|---|---|---|---|
| komur_santrali | S | 228 | 240 | 34.832 | -204 | -150 | -60 | 120 | 9,82 | %67 | 290 |
| komur_santrali | M | 502 | 480 | 78.330 | -401 | -282 | -84 | 312 | 9,73 | %61 | 251 |
| komur_santrali | L | 821 | 768 | 135.493 | -638 | -444 | -120 | 528 | 9,71 | %59 | 257 |
| yakit_jeneratoru | S | 152 | 160 | 34.832 | -417 | -802 | -1.443 | -2.727 | 28,29 | hiç | hiç |
| yakit_jeneratoru | M | 334 | 320 | 78.330 | -885 | -1.732 | -3.143 | -5.967 | 28,19 | hiç | hiç |
| yakit_jeneratoru | L | 547 | 512 | 135.493 | -1.436 | -2.822 | -5.132 | -9.752 | 28,17 | hiç | hiç |
| hidro_santrali | S | 285 | 400 | 41.498 | -105 | 337 | 1.075 | 2.550 | 1,40 | %14 | 16 |
| hidro_santrali | M | 627 | 800 | 94.995 | -151 | 822 | 2.445 | 5.690 | 1,28 | %12 | 17 |
| hidro_santrali | L | 1026 | 1.280 | 165.490 | -218 | 1.375 | 4.030 | 9.339 | 1,25 | %12 | 18 |

Notlar: kömür santrali kömürü NPC ithalatından alır (33,3 ₺; kendi kömür ocağıyla fırsat maliyeti ihracat paritesi 26,7 ₺ olur: aşağıda), yakıt jeneratörü yakıtı şebekeden (103,5 ₺); hidro yakıtsızdır ve çıktı akarsu eğrisiyle 0,4–2,4 değişir (tablo yıllık ortalama 1). Tasarruf negatifse santral şebekeden pahalıdır. Yük = tesislerin elektrik talebi / santral teslim kapasitesi.

Kendi kömür ocağıyla (kömür fırsat maliyeti 26,7 ₺) kömür santralinin tam yük birim maliyeti 8,09 ₺'dir (şebeke 10,35): tasarruf 516 ₺/sa. 

### 3.2.4 Vaat tutmuyor: seçenekler (şebeke fiyat çarpanı × santral girdi/bakım oranı)

Şebeke fiyatı kamu fiyat tavanı kuralından (1,035 R) türediği için tam yükte kömür santralinin avantajı +%5–6, yakıt jeneratörünün negatiftir; yalnız hidro (yakıtsız) ve ≥ %14 yükte anlamlıdır. Aşağıda **başabaş yük** (tasarrufun sıfır olduğu yük) üç kaldıraçla gösterilir; birim ₺, S ölçek:

| Seçenek | Şebeke fiyatı ₺/birim | Kömür santrali S başabaş yük | M | L | Jeneratör S | Hidro S | P4 oyuncusu (28,65/sa) şebeke gideri ₺/hafta | Not |
|---|---|---|---|---|---|---|---|---|
| 0 — bugünkü (kural 1,035 R) | 10,35 | %67 | %61 | %59 | hiç | %14 | 49.817 | vaat yalnız hidroda tutar |
| O1 — şebeke satış çarpanı 1,25 R (tavan kuralı yalnız kamu ALIMINA uygulanır) | 12,50 | %28 | %26 | %25 | hiç | %11 | 60.165 | satış fiyatı arbitraj açmaz; G4 metniyle çelişir |
| O2 — şebeke satış çarpanı 1,50 R | 15,00 | %17 | %15 | %15 | hiç | %9 | 72.198 | oyuncu şebeke gideri +%45 |
| O3 — santral kömür girdisi ×0,75 (mülk kipi; 60 → 45) | 10,35 | %28 | %25 | %25 | hiç | %14 | 49.817 | bölge kipi `komur_santrali` aynı; mülk veri geçersiz kılma |
| O4 — O3 + şebeke 1,25 R | 12,50 | %18 | %16 | %16 | hiç | %11 | 60.165 | - |

Okuma: (O0) küçük oyuncunun yükü %10–25'tir (P4: 28,65/228 = %13), bu yükte bütün santral türleri şebekeden pahalıdır; M/L kömür santrali tam yükte +%5–6 yapar. (O1–O2) şebeke fiyatı yükseltilirse santral kömürde de anlamlı hâle gelir ama oyuncu elektrik gideri artar (P4 haftada 49.817 ₺ → 60.500–72.000 ₺, KD'nin ≤ %3'ü) ve G4'ün 'fiyat kamu tavanı kuralıyla' ifadesinden sapılır. (O3) santral maliyetini mülk kipinde düşürmek yalnız veri geçersiz kılma ister, bölge kipi altınları değişmez. (O5) 'vaadi düzelt': santral Alfa-0'da bir **ekonomik tasarruf değil bağımsızlık ve büyük ölçek tercihi** (hidro ve ≥ %50 yük) olarak tanımlanır; arayüz Yatırım Tahmini kartında tasarrufu açık yazar. Seçim baş liderindir.


### 3.2.5 Şebeke ödemesi: haftalık tutar ve para arzı

| Oyuncu | Elektrik birim/sa | Yakıt birim/sa | Elektrik ₺/hafta | Yakıt ₺/hafta | Toplam ₺/hafta |
|---|---|---|---|---|---|
| P4 (ekmek zinciri + kepek_gubresi) | 28,65 | 20 | 49.817 | 347.760 | 397.577 |
| P4 + P5 (cam → pencere) | 61,65 | 36 | 107.197 | 625.968 | 733.165 |

| İlçe başına haftalık şebeke ödemesi | Elektrik ₺ | Yakıt ₺ | Toplam ₺ |
|---|---|---|---|
| 1,0 P4 oyuncusu | 49.817 | 347.760 | 397.577 |
| 4,4 P4 oyuncusu | 219.193 | 1.530.144 | 1.749.337 |
| 10,0 P4 oyuncusu | 498.166 | 3.477.600 | 3.975.766 |
| 4,4 oyuncu, %25'i P5'li | 282.312 | 1.836.173 | 2.118.484 |

Dünya (200 P4 oyuncusu): elektrik 9.963.324 ₺/hafta, yakıt 69.552.000 ₺/hafta. Karşılaştırma (§6.3, ekmek): `yerelNpc` 92.910.226 + `ihracatNpc` 112.266.000 = 205.176.226 ₺/hafta musluk. **Yeni lavabo yalnız elektriktir** (%4,9 musluk); yakıt zaten NPC ithalatı olarak lavabodaydı (şimdi şebekeye ve -6,8% ucuza geçer). Muhasebe: oyuncudan çıkan para ya doğrudan `lavabo.sebeke` (yanar; öneri) ya da kamu kasası girişi olur; ikinci yolda kasa bakiyesi büyür ve harcama tavanları (tek alım %40, haftalık %25, oyuncu payı %50) paranın bir kısmını geri dolaşıma sokar. Kasaya yönlendirme "kasa yalnız zaten yanan paradan beslenir" kuralına uymaz (G4); bu yüzden doğrudan lavabo ya da ithalat makasındaki gibi %20 kasa payı (lavabodan ayrılan) seçilebilir.


## 4. Satış kanalları ve kamu fiyat tavanı (R = taban fiyat)

**ekmek** (R = 60 ₺)

| Kanal | ₺/birim | R çarpanı |
|---|---|---|
| NPC ihracat (korumada / sonra) | 54,0 / 53,5 | 0,900 / 0,891 R |
| Esnaf fiyatı (ref ×1,12) | 67,2 | 1,120 R |
| Kamu siparişi tavanı | 62,1 | 1,035 R |
| Dükkân bandı [0,7; 1,4] R | 42,0 – 84,0 | 0,700 – 1,400 R |
| NPC ithalat maliyeti (korumada / sonra) | 66,0 / 66,7 | 1,100 / 1,111 R |

**pencere** (R = 360 ₺)

| Kanal | ₺/birim | R çarpanı |
|---|---|---|
| NPC ihracat (korumada / sonra) | 324,0 / 320,8 | 0,900 / 0,891 R |
| Esnaf fiyatı (ref ×1,12) | 403,2 | 1,120 R |
| Kamu siparişi tavanı | 372,6 | 1,035 R |
| Dükkân bandı [0,7; 1,4] R | 252,0 – 504,0 | 0,700 – 1,400 R |
| NPC ithalat maliyeti (korumada / sonra) | 396,0 / 400,0 | 1,100 / 1,111 R |

Okuma: (1) kamu tavanı (1,035 R) ithalat maliyetinin (1,100–1,111 R) altındadır: NPC'den alıp kamuya satmak her oyuncu için ≤ 0 marj (docs/06 §15.7 madde 5). (2) Kamu siparişi NPC ihracatının %16,2 (komisyonlu) üstünde öder, dükkân fiyatı 1,035 R'nin altına indiğinde kamu siparişi dükkândan iyidir; üstüne çıkınca dükkân kazanır. (3) Dükkân perakende fiyatına kamu tavanı uygulanmaz (tavan kamu sipariş/ihale/esnaf siparişi içindir); tek üst sınır banttır (1,4 R) ve ithalat arbitrajı eşiği 1,111 R'dir (ZP11).

### 4.1 Kamu siparişi v0: mal listesi, fiyat ve hacim önerisi (ekmek, gıda, pencere, çelik, parça)

| Mal | R ₺ | Tavan 1,035 R ₺ (kod: mili) | Öneri 1,03 R ₺ (kod: mili) | Sipariş boyutu (birim) | Sipariş tutarı ₺ | Vade | Rakip kanal: NPC ihracat 0,891 R ₺ |
|---|---|---|---|---|---|---|---|
| ekmek | 60 | 62,10 (62.100) | 61,80 (61.800) | 100 | 6.180 | 3 gün | 53,5 |
| gida | 70 | 72,45 (72.450) | 72,10 (72.100) | 50 | 3.605 | 3 gün | 62,4 |
| pencere | 360 | 372,60 (372.600) | 370,80 (370.800) | 10 | 3.708 | 3 gün | 320,8 |
| celik | 120 | 124,20 (124.200) | 123,60 (123.600) | 30 | 3.708 | 3 gün | 106,9 |
| parca | 180 | 186,30 (186.300) | 185,40 (185.400) | 20 | 3.708 | 3 gün | 160,4 |

Kural: `kamuFiyatTavani(d, ic, mal) = referans × kamuIthalatCarpaniPpm` (`packages/cekirdek/src/mulk/kasa.ts:415-424`; çarpan derleme zamanında `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`): min(1,10; 1,05; 1,30)=1,05, iki Ticaret ofisi makas indirimi (%30) ile 1,035. **Toplantı notu/GDD'deki "≤ 1,10 R" üst sınırdır; uygulanan 1,035 R'dir.** Öneri fiyat 1,03 R: NPC ihracatının %15,6 üstü, ithalat maliyetinin (1,10–1,111 R) altı, dükkân normal kademesinin (1,05 R) altı. Hacim sınırı kasa kurallarından gelir (`mulk.kasa`): tek alım ≤ bakiyenin %40, haftalık bütçe ≤ 28 günlük girişin %25'i (4 haftada = haftalık giriş kadar), oyuncuya giden ≤ girişin %50'i.

| İlçe kasası haftalık girişi (oyuncu başına, P4 oyuncusu) | ₺/hafta | 4,4 oyuncu/ilçe | Oyuncuya giden tavan (%50) | Ekmek siparişi (100 birim, 103 ₺×100) |
|---|---|---|---|---|
| mevcut kaynaklar (ithalat makası %20 + komisyon %50; bakım parçası ithalatı) | 1.588 | 6.985 | 3.493 | 0,6 sipariş/hafta |
| + şebeke ödemesinin %20'si ilçe kasasına (öneri seçeneği) | 81.103 | 356.853 | 178.427 | 28,9 sipariş/hafta |

Okuma: mevcut kaynaklarla ilçe kasası haftada birkaç bin ₺ toplar (GDD: ≈2.200 ₺); kamu siparişi v0 bu hâlde sembolik kalır (≈ haftada bir ekmek siparişi). Şebeke ödemesinin kasaya %20 pay vermesi siparişi oynanabilir yapar (haftada ≈ 29 ekmek siparişi/ilçe) ve ödeme zaten lavabodan ayrılan paydır (kasa kuralıyla uyumlu). **Öneri v0 hacmi:** ilçe başına haftada en çok 5 sipariş (ekmek 2, gıda 1, pencere 1, çelik 1; parça yedek), ilk kabul eden alır.

### 4.2 Şebeke ödemesinin ilçe kasası payı (`kasaPayiPpm`): kamu siparişi v0 hacmini karşılar mı, korunum tam kapanır mı

Kamu siparişi v0 hacmi (ilçe başına haftada en çok 5 sipariş, fiyat 1,03 R): çekirdek (ekmek 2 + gıda 1 + pencere 1 + çelik 1) **23.381 ₺/hafta**; parça yedeği dahil 27.089 ₺/hafta. Kasa kuralları (`mulk.kasa`): oyuncuya giden ≤ girişin %50'si (28 günlük pencere), haftalık bütçe ≤ 28 günlük girişin %25'i, tek alım ≤ bakiyenin %40'ı. Sürekli rejimde haftalık sipariş kapasitesi = 0,5 × haftalık giriş. Gerekli haftalık giriş: 46.762 ₺ (çekirdek), 54.178 ₺ (yedekli). Giriş = oyuncu sayısı × (mevcut kaynaklar 1.588 ₺ + `kasaPayiPpm` × şebeke ödemesi 397.577 ₺/hafta/P4 oyuncusu).

| İlçedeki P4 oyuncusu | Asgari kasaPayi (çekirdek) | Asgari kasaPayi (parça yedekli) |
|---|---|---|
| 1 | %11,4 | %13,2 |
| 2 | %5,5 | %6,4 |
| 4,4 | %2,3 | %2,7 |
| 10 | %0,8 | %1,0 |

| kasaPayiPpm | Oyuncu/ilçe | Haftalık giriş ₺ | Sipariş kapasitesi ₺/hafta (giriş × %50) | v0 çekirdeği / kapasite | Haftalık bütçe tavanı ₺ (giriş × %100) | Lavaboya yanan ₺/hafta (şebekenin kalanı) |
|---|---|---|---|---|---|---|
| 50000 | 1 | 21.466 | 10.733 | **karşılamaz** (0,46x) | 21.466 | 377.698 |
| 50000 | 4,4 | 94.452 | 47.226 | karşılar (2,0x) | 94.452 | 1.661.870 |
| 50000 | 10 | 214.664 | 107.332 | karşılar (4,6x) | 214.664 | 3.776.978 |
| 100000 | 1 | 41.345 | 20.673 | **karşılamaz** (0,88x) | 41.345 | 357.819 |
| 100000 | 4,4 | 181.919 | 90.960 | karşılar (3,9x) | 181.919 | 1.574.403 |
| 100000 | 10 | 413.453 | 206.726 | karşılar (8,8x) | 413.453 | 3.578.190 |
| 120000 | 1 | 49.297 | 24.648 | karşılar (1,1x) | 49.297 | 349.867 |
| 120000 | 4,4 | 216.906 | 108.453 | karşılar (4,6x) | 216.906 | 1.539.417 |
| 120000 | 10 | 492.968 | 246.484 | karşılar (10,5x) | 492.968 | 3.498.674 |
| 150000 | 1 | 61.224 | 30.612 | karşılar (1,3x) | 61.224 | 337.940 |
| 150000 | 4,4 | 269.386 | 134.693 | karşılar (5,8x) | 269.386 | 1.486.937 |
| 150000 | 10 | 612.241 | 306.120 | karşılar (13,1x) | 612.241 | 3.379.401 |
| 200000 | 1 | 81.103 | 40.551 | karşılar (1,7x) | 81.103 | 318.061 |
| 200000 | 4,4 | 356.853 | 178.426 | karşılar (7,6x) | 356.853 | 1.399.470 |
| 200000 | 10 | 811.029 | 405.515 | karşılar (17,3x) | 811.029 | 3.180.613 |

Tamsayı korunum örneği (bir P4 oyuncusu, bir hafta, `kasaPayiPpm` 120.000): ödeme P = 397.576.620 mili; kasa = ⌊P × 120.000 / 1.000.000⌋ = 47.709.194 mili; lavabo `sebeke` = P − kasa = 349.867.426 mili; kasa + lavabo = 397.576.620 = P (**fark 0**). Kural: önce kasa payı alt tamsayıya yuvarlanır, kalan lavaboya yazılır; böylece `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` her tikte tam eşit kalır. Oyuncuya kasadan ödenen sipariş bedeli kasa → hazine devridir (musluk toplamı değişmez).

Dünya (200 P4 oyuncusu, 45 ilçe): şebeke ödemesi 79.515.324 ₺/hafta; %12 payla kasaya 9.541.839 ₺/hafta gider, lavaboya 69.973.485 ₺/hafta yanar. Kamu siparişi v0 en çok 1.052.145 ₺/hafta harcar (45 ilçe × çekirdek); kalan kasa girişi bakiyede birikir (tek alım ve haftalık bütçe tavanları geçerli) ve para arzını **büyütmez** (kasa yalnız zaten yanan paranın bir kısmıdır; sink payı %88'dir). Kasadan oyuncuya akan para sink'i en çok %6 azaltır.


## 5. Dükkân S ekonomisi ve yerel pazar kanalı

Model (dikey §5.6, canlı-dünya §4.1): `w = (1/p)² × (1+0,25·çeşit)`, esnaf `w = 0,797`, esnaf tabanı %25, kasa 90 birim/sa, `yerelOlcek` 50 (kalibre değil), η etkisi ihmal. Q: talep1000Saat × nüfus/1000 × 50.

### 5.1 Fırın dükkânı (ekmek; çeşit 0,5) satış hızı, ilçe nüfusuna göre (ilçede tek oyuncu, tek dükkân)

| Nüfus | Q ekmek (birim/sa) | Fiyat (R) | Satış (birim/sa) | Kasa doluluğu | Gelir ₺/sa | NPC eşdeğeri ₺/sa | Prim ₺/sa | Gider ₺/sa | Net ₺/sa | ZP3 oranı |
|---|---|---|---|---|---|---|---|---|---|---|
| 5.000 | 15,0 | 1,00 | 8,8 | %10 | 527 | 469 | 57 | 132 | -75 | 1,122 |
| 5.000 | 15,0 | 1,05 | 8,4 | %9 | 531 | 450 | 80 | 132 | -52 | 1,178 |
| 5.000 | 15,0 | 1,12 | 7,9 | %9 | 534 | 425 | 109 | 132 | -23 | 1,257 |
| 20.000 | 60,0 | 1,00 | 35,1 | %39 | 2.107 | 1.877 | 230 | 132 | 98 | 1,122 |
| 20.000 | 60,0 | 1,05 | 33,7 | %37 | 2.122 | 1.801 | 321 | 132 | 189 | 1,178 |
| 20.000 | 60,0 | 1,12 | 31,8 | %35 | 2.135 | 1.698 | 436 | 132 | 304 | 1,257 |
| 50.000 | 150,0 | 1,00 | 87,8 | %98 | 5.267 | 4.693 | 574 | 132 | 442 | 1,122 |
| 50.000 | 150,0 | 1,05 | 84,2 | %94 | 5.305 | 4.502 | 803 | 132 | 671 | 1,178 |
| 50.000 | 150,0 | 1,12 | 79,4 | %88 | 5.336 | 4.245 | 1.091 | 132 | 959 | 1,257 |
| 100.000 | 300,0 | 1,00 | 90,0 | %100 | 5.400 | 4.811 | 589 | 132 | 457 | 1,122 |
| 100.000 | 300,0 | 1,05 | 90,0 | %100 | 5.670 | 4.811 | 859 | 132 | 727 | 1,178 |
| 100.000 | 300,0 | 1,12 | 90,0 | %100 | 6.048 | 4.811 | 1.237 | 132 | 1.105 | 1,257 |
| 145.000 | 435,0 | 1,00 | 90,0 | %100 | 5.400 | 4.811 | 589 | 132 | 457 | 1,122 |
| 145.000 | 435,0 | 1,05 | 90,0 | %100 | 5.670 | 4.811 | 859 | 132 | 727 | 1,178 |
| 145.000 | 435,0 | 1,12 | 90,0 | %100 | 6.048 | 4.811 | 1.237 | 132 | 1.105 | 1,257 |

ZP3 oranı = dükkân satış fiyatı / NPC ihracat net fiyatı. Hedef bandı 1,05–1,20 (dikey §10): p ∈ [0,936; 1,069] R (komisyonlu) ve [0,945; 1,080] R (korumada).

### 5.2 Kalabalık ilçe: aynı ilçede k fırın dükkânı (hepsi 1,05 R), 100 bin nüfus

| Dükkân sayısı | Q ekmek | Oyuncu satışı toplam | Dükkân başına | Esnafa kalan | Dükkân başı net ₺/sa | Geri ödeme (sa; ithal bedel 11.280 ₺ ≈ indirimsiz) |
|---|---|---|---|---|---|---|
| 1 | 300 | 90,0 | 90,0 | %70 | 727 | 16,3 |
| 2 | 300 | 180,0 | 90,0 | %40 | 727 | 16,3 |
| 3 | 300 | 225,0 | 75,0 | %25 | 583 | 20,3 |
| 5 | 300 | 225,0 | 45,0 | %25 | 297 | 39,9 |
| 10 | 300 | 225,0 | 22,5 | %25 | 83 | 143,6 |

### 5.3 Dükkân S gider kalemi önerisi (ek yapıda işletme gideri bugün yok)

Kod: ek yapılar `b.tesisler`e girmez; üretim, işletme gideri, işgücü ve elektrik hesabını etkilemez (docs/06 §15.3). Perakende raporu 132 ₺/sa (S), 204 (M), ≈330 (L) der: 60 ₺ işletme + bakım parçası ≈72 ₺. Öneri (G7): para-yalnız gider `mulk.perakende.giderMiliSaat` = [132000, 204000, 330000] (S/M/L); parça tüketimi ve aşınma YOK (ek yapının `TesisDurumu`'su yok; bakım döngüsünü dükkâna taşımak G7'yi büyütür). Lavabo kalemi: `isletme`. Hesap kaynağı: dükkân giderinin %2,3'i kasa dolu bir fırın cirosudur.

### 5.4 Dükkân fiyatı: `secim` kademesi (tutar değil) — kademe başına satış, gelir ve net

**şehir (120 bin), ilçede 1 dükkân (kasa bağlayıcı)**

| Fiyat (R) | Satış birim/sa | Gelir ₺/sa | Prim ₺/sa (NPC 0,891 R'ye göre) | Net ₺/sa | ZP3 (fiyat/0,891) | NPC'den iyi mi |
|---|---|---|---|---|---|---|
| 0,70 | 90,0 | 3.780 | -1.031 | -1.163 | 0,786 | HAYIR (zararına) |
| 0,80 | 90,0 | 4.320 | -491 | -623 | 0,898 | HAYIR (zararına) |
| 0,85 | 90,0 | 4.590 | -221 | -353 | 0,954 | HAYIR (zararına) |
| 0,90 | 90,0 | 4.860 | 49 | -83 | 1,010 | evet |
| 0,95 | 90,0 | 5.130 | 319 | 187 | 1,066 | evet |
| 1,00 | 90,0 | 5.400 | 589 | 457 | 1,122 | evet |
| 1,05 | 90,0 | 5.670 | 859 | 727 | 1,178 | evet |
| 1,10 | 90,0 | 5.940 | 1.129 | 997 | 1,235 | evet |
| 1,15 | 90,0 | 6.210 | 1.399 | 1.267 | 1,291 | evet |
| 1,20 | 90,0 | 6.480 | 1.669 | 1.537 | 1,347 | evet |
| 1,30 | 90,0 | 7.020 | 2.209 | 2.077 | 1,459 | evet |
| 1,40 | 90,0 | 7.560 | 2.749 | 2.617 | 1,571 | evet |

**kasaba (40 bin), ilçede 1 dükkân (talep bağlayıcı)**

| Fiyat (R) | Satış birim/sa | Gelir ₺/sa | Prim ₺/sa (NPC 0,891 R'ye göre) | Net ₺/sa | ZP3 (fiyat/0,891) | NPC'den iyi mi |
|---|---|---|---|---|---|---|
| 0,70 | 89,1 | 3.741 | -1.021 | -1.153 | 0,786 | HAYIR (zararına) |
| 0,80 | 82,6 | 3.963 | -451 | -583 | 0,898 | HAYIR (zararına) |
| 0,85 | 79,4 | 4.048 | -195 | -327 | 0,954 | HAYIR (zararına) |
| 0,90 | 76,2 | 4.117 | 41 | -91 | 1,010 | evet |
| 0,95 | 73,2 | 4.172 | 259 | 127 | 1,066 | evet |
| 1,00 | 70,2 | 4.214 | 459 | 327 | 1,122 | evet |
| 1,05 | 67,4 | 4.244 | 643 | 511 | 1,178 | evet |
| 1,10 | 64,6 | 4.264 | 810 | 678 | 1,235 | evet |
| 1,15 | 61,9 | 4.274 | 963 | 831 | 1,291 | evet |
| 1,20 | 59,4 | 4.276 | 1.101 | 969 | 1,347 | evet |
| 1,30 | 54,6 | 4.259 | 1.340 | 1.208 | 1,459 | evet |
| 1,40 | 50,2 | 4.219 | 1.534 | 1.402 | 1,571 | evet |

**şehir (120 bin), 5 dükkân (4 rakip 1,05 R)**

| Fiyat (R) | Satış birim/sa | Gelir ₺/sa | Prim ₺/sa (NPC 0,891 R'ye göre) | Net ₺/sa | ZP3 (fiyat/0,891) | NPC'den iyi mi |
|---|---|---|---|---|---|---|
| 0,70 | 76,9 | 3.231 | -882 | -1.014 | 0,786 | HAYIR (zararına) |
| 0,80 | 76,9 | 3.692 | -420 | -552 | 0,898 | HAYIR (zararına) |
| 0,85 | 74,6 | 3.802 | -183 | -315 | 0,954 | HAYIR (zararına) |
| 0,90 | 68,5 | 3.702 | 37 | -95 | 1,010 | evet |
| 0,95 | 63,2 | 3.601 | 224 | 92 | 1,066 | evet |
| 1,00 | 58,3 | 3.500 | 382 | 250 | 1,122 | evet |
| 1,05 | 54,0 | 3.402 | 515 | 383 | 1,178 | evet |
| 1,10 | 50,1 | 3.306 | 628 | 496 | 1,235 | evet |
| 1,15 | 46,6 | 3.213 | 724 | 592 | 1,291 | evet |
| 1,20 | 43,4 | 3.123 | 804 | 672 | 1,347 | evet |
| 1,30 | 37,9 | 2.953 | 929 | 797 | 1,459 | evet |
| 1,40 | 33,3 | 2.796 | 1.017 | 885 | 1,571 | evet |

**kasaba (40 bin), 3 dükkân (2 rakip 1,05 R)**

| Fiyat (R) | Satış birim/sa | Gelir ₺/sa | Prim ₺/sa (NPC 0,891 R'ye göre) | Net ₺/sa | ZP3 (fiyat/0,891) | NPC'den iyi mi |
|---|---|---|---|---|---|---|
| 0,70 | 47,6 | 2.001 | -546 | -678 | 0,786 | HAYIR (zararına) |
| 0,80 | 41,6 | 1.999 | -227 | -359 | 0,898 | HAYIR (zararına) |
| 0,85 | 38,9 | 1.986 | -96 | -228 | 0,954 | HAYIR (zararına) |
| 0,90 | 36,4 | 1.968 | 20 | -112 | 1,010 | evet |
| 0,95 | 34,1 | 1.945 | 121 | -11 | 1,066 | evet |
| 1,00 | 32,0 | 1.919 | 209 | 77 | 1,122 | evet |
| 1,05 | 30,0 | 1.890 | 286 | 154 | 1,178 | evet |
| 1,10 | 28,2 | 1.859 | 353 | 221 | 1,235 | evet |
| 1,15 | 26,5 | 1.827 | 411 | 279 | 1,291 | evet |
| 1,20 | 24,9 | 1.794 | 462 | 330 | 1,347 | evet |
| 1,30 | 22,1 | 1.727 | 543 | 411 | 1,459 | evet |
| 1,40 | 19,8 | 1.659 | 603 | 471 | 1,571 | evet |

Fiyat savaşının kendini cezalandırma eşiği: NPC ihracat net fiyatı 0,891 R (korumada 0,900 R). Dükkân bunun altında sattığında aynı birimi NPC pazarına satmaktan daha az alır: prim eksiye geçer. Kasa bağlayıcı olduğunda (120 bin nüfus) fiyat indirimi satışı artırmaz: yalnız gelir kaybıdır. Talep bağlayıcı ilçede (40 bin) indirim satışı artırır ama birim başına kaybı telafi etmez.

**Önerilen kademeler** (`secim`: 0..3; çarpan PPM, `mulk.perakende.fiyatKademeleri`; bant [700000; 1400000] parametre olarak kalır, kademeler bandın içindedir):

| Kademe | Kod | R çarpanı (ppm) | ZP3 (komisyonlu) | Net ₺/sa: şehir 1 dükkân | kasaba 1 dükkân | şehir 5 dükkân | kasaba 3 dükkân |
|---|---|---|---|---|---|---|---|
| kampanya (yalnız kampanya penceresi) | 0 | 850.000 | 0,954 | -353 | -327 | -315 | -228 |
| uygun | 1 | 950.000 | 1,066 | 187 | 127 | 92 | -11 |
| normal (varsayılan) | 2 | 1.050.000 | 1,178 | 727 | 511 | 383 | 154 |
| yüksek | 3 | 1.150.000 | 1,291 | 1.267 | 831 | 592 | 279 |


### 5.5 Yerel talep modeli: ilçe sınıfı × taban × iklim takvimi × bayram (tamsayı/PPM)

Formül (tamsayı): `Q[mal] = taban[sınıf][mal] × takvim[grup][ay] / 1.000.000 × bayram[grup] / 1.000.000`; `taban[sınıf][mal] = talep1000Saat[mal] × nüfusEşdeğeri[sınıf] × yerelOlcek / 1000` (mili-birim/sa). `yerelOlcek` = 50 (kalibre edilmedi; dikey R1).

İlçe sınıfı nüfus eşdeğeri: kırsal 10.000, kasaba 40.000, şehir 120.000 (Alfa-0 ilçelerinin ortalaması ≈145 bin, canlı-dünya §3.3: çoğu şehir sınıfı).

| Mal | talep1000Saat (mili) | Takvim grubu | Kırsal taban (mili-birim/sa) | Kasaba taban | Şehir taban | Şehir birim/sa |
|---|---|---|---|---|---|---|
| gida | 90 | gida | 45.000 | 180.000 | 540.000 | 540,0 |
| ekmek | 60 | gida | 30.000 | 120.000 | 360.000 | 360,0 |
| un | 10 | gida | 5.000 | 20.000 | 60.000 | 60,0 |
| sut | 20 | gida | 10.000 | 40.000 | 120.000 | 120,0 |
| sut_urunu | 20 | gida | 10.000 | 40.000 | 120.000 | 120,0 |
| sekerleme | 6 | tatli | 3.000 | 12.000 | 36.000 | 36,0 |
| findik_urunu | 3 | tatli | 1.500 | 6.000 | 18.000 | 18,0 |
| yakit | 15 | yakit | 7.500 | 30.000 | 90.000 | 90,0 |
| pencere | 8 | yapi | 4.000 | 16.000 | 48.000 | 48,0 |
| cam | 4 | yapi | 2.000 | 8.000 | 24.000 | 24,0 |
| celik | 6 | yapi | 3.000 | 12.000 | 36.000 | 36,0 |
| parca | 5 | yapi | 2.500 | 10.000 | 30.000 | 30,0 |
| cimento | 6 | yapi | 3.000 | 12.000 | 36.000 | 36,0 |

K1 sepet denetimi (hane harcaması sabit): gida+ekmek+un+sut+sut_urunu = 200 mili/1000 kişi/sa = bölge kipi `nufus.tuketim1000Saat.gida` 200 (ayrılan paylar toplamı değiştirmez; bölge kipi bloğuna dokunulmaz).

Aylık takvim çarpanları (ppm; Ocak … Aralık; toplam 12.000.000):

| Grup | Mallar | Oca | Şub | Mar | Nis | May | Haz | Tem | Ağu | Eyl | Eki | Kas | Ara |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| gida | gida, ekmek, un, sut, sut_urunu | 1.030.000 | 1.020.000 | 1.010.000 | 1.000.000 | 990.000 | 970.000 | 960.000 | 970.000 | 1.000.000 | 1.020.000 | 1.020.000 | 1.010.000 |
| tatli | sekerleme, findik_urunu | 1.100.000 | 1.050.000 | 980.000 | 950.000 | 900.000 | 850.000 | 820.000 | 850.000 | 950.000 | 1.100.000 | 1.200.000 | 1.250.000 |
| yakit | yakit | 1.400.000 | 1.400.000 | 1.200.000 | 950.000 | 750.000 | 650.000 | 600.000 | 600.000 | 750.000 | 950.000 | 1.300.000 | 1.450.000 |
| yapi | pencere, cam, celik, parca, cimento | 650.000 | 650.000 | 900.000 | 1.150.000 | 1.300.000 | 1.250.000 | 1.200.000 | 1.200.000 | 1.200.000 | 1.100.000 | 800.000 | 600.000 |

Gerekçe: gıda sepeti hafif (kışın +%3, yazın −%4); tatlı ve kuruyemiş serin dönemde yüksek; yakıt kışın ×1,40–1,45, yazın ×0,60; yapı malzemesi ve pencere/cam bahar–yaz onarım–inşaat sezonunda yüksek, kışın düşük (kış fırtınası cam/pencere olayı bu takvimin üstüne gelir: canlı-dünya §5, ×1,5, tavanlı, takvimden bağımsız).

Bayram dalgası (ayrı parametre; **toplam sabit, yalnız zamanlama**): bayramdan `Do` gün önce çarpan `Wo`, sonraki `Ds` gün çarpan `Ws = 1.000.000 − ⌈Do·(Wo − 1.000.000)/Ds⌉`. Tarihler takvim paketinden gelir (canlı-dünya §5.2); dükkân açık/kapalı kuralı yoktur (docs/12 §7).

| Grup | Do (gün) | Wo (ppm) | Ds (gün) | Ws (ppm) | Toplam sapma (gün·ppm) | Uygulandığı mallar |
|---|---|---|---|---|---|---|
| tatli | 7 | 1.800.000 | 28 | 800.000 | 0 | sekerleme, findik_urunu |
| gida | 5 | 1.250.000 | 10 | 875.000 | 0 | gida, ekmek, un, sut, sut_urunu |

Yapı ve yakıt grupları bayramdan etkilenmez. Örnek (şehir, ekmek, birim/sa): Ocak 370,8, Temmuz 345,6; bayram öncesi 5 günde Ocak 463,5; şekerleme şehir: normal 36,0, bayram öncesi 64,8, sonrası 28,8 birim/sa.



### 5.6 İlk dükkân geri ödeme (fırın, 1,05 R; ilk 24 saatte süre ×0,1; saat = kasa dolu/talep sınırlı satışla)

| İlçe sınıfı / k | Net ₺/sa | Nakit yatırım (kit stoğu var) indirimli / indirimsiz | Geri ödeme sa (nakit) | Tam ithal yatırım indirimli / indirimsiz | Geri ödeme sa (tam ithal) |
|---|---|---|---|---|---|
| kirsal / 1 | 32 | 8.945 ₺ / 11.225 ₺ | 280,6 / 352,1 | 11.931 ₺ / 15.491 ₺ | 374,3 / 485,9 |
| kasaba / 1 | 524 | 8.945 ₺ / 11.225 ₺ | 17,1 / 21,4 | 11.931 ₺ / 15.491 ₺ | 22,8 / 29,6 |
| sehir / 1 | 727 | 8.945 ₺ / 11.225 ₺ | 12,3 / 15,4 | 11.931 ₺ / 15.491 ₺ | 16,4 / 21,3 |
| sehir / 5 | 393 | 8.945 ₺ / 11.225 ₺ | 22,7 / 28,5 | 11.931 ₺ / 15.491 ₺ | 30,3 / 39,4 |
| kasaba / 3 | 160 | 8.945 ₺ / 11.225 ₺ | 55,9 / 70,2 | 11.931 ₺ / 15.491 ₺ | 74,6 / 96,9 |

Hedefler (dikey §10, perakende §13): ilk dükkân medyan ≤ 36 sa (katılımdan), geri ödeme medyanı ≤ 48 sa. İlk dükkânın zamanı nakit değil çoğunlukla ilk iki saatteki inşaat sırası ve ithalat emri yuvasıdır (§8.2); geri ödeme kırsal ilçede hedefi tutturmaz (tek dükkânın neti ≈ gideri karşılar), kasaba ve şehirde tek dükkân 12–23 saatte kapanır; kalabalık kasabada (3 dükkân) 56–70 saate uzar ve hedefi aşar.


### 5.7 Ekmek zinciri ↔ `standart_gida_isleme`: üç tabanda karşılaştırma, erken oyun kısıtı, karar

Oyuncu yöntemi tesis başına seçer: iki yöntem de aynı `gida_fabrikasi`'nda çalışır (bedel, hücre, işçi aynı). Aşağıda her taban ayrı verilir. KD taban fiyatla (elektrik 10,35, yakıt 103,5 şebeke fiyatı dahil, §3.2.1); "NPC net" = satış ×0,891, dış girdi şebeke/ithalat, bakım ve işletme dahil, tahıl fırsat maliyeti ihracat paritesi.

| Taban | `standart_gida_isleme` (1 tesis) | zincir (değirmen + fırın, 2 tesis) | Zincir / standart | Okuma |
|---|---|---|---|---|
| tahıl başına KD (200 tahıl/sa) | 5.097 ₺/sa | 7.245 ₺/sa | 42,1% | tahıl kısıtlıysa zincir kazanır |
| tahıl başına NPC net (§2.3) | 4.310 ₺/sa | 5.759 ₺/sa | +33,6% | aynı |
| tesis başına KD | 5.097 ₺ | 3.622 ₺ (değirmen 2.720, fırın 4.525) | -28,9% | **tesis kısıtlıysa standart kazanır**; tek kademe de tek başına standardı geçemez (değirmen 2.720 < 5.097) |
| işçi başına KD | 849 ₺ | 557 ₺ | -34,4% | işçi mülk kipinde bağlayıcı değil (`kalanIsci` sınırsız), Alfa-1 işgücü havuzunda bağlayıcı olabilir |
| hücre başına KD (her tesis 2 hücre) | 2.548 ₺ | 1.811 ₺ | -28,9% | tesis tabanıyla aynı |
| sermaye başına KD/sa (S taban değer) | 245 ‰ | 174 ‰ | -28,9% | saatlik getiri binde (taban değer 20.800 ₺/tesis) |

Yani tahıl tabanında zincir +%42,1 (KD) / +%33,6 (NPC net) önde; tesis, işçi ve hücre tabanlarında %29–%34 geridedir. Önemli olan hangi kısıtın erken oyunda bağlayıcı olduğudur.

**Erken oyunda (0–7 gün) bağlayıcı kısıt: tahıl değil, tesis sermayesi değil; NPC pazar derinliği.**

| Kısıt | Değer | Bağlayıcı mı? |
|---|---|---|
| Sermaye (S1-S: hazine ≥ 4 yapının tamamı) | saat 2'de 41.710 ₺ (en düşük), saat 8'de 112.793 ₺ | hayır: 2 saat sonra |
| Tahıl | Tarla 6.000 ₺ (indirimli 4.200 ₺), 12 dk inşa, 200 tahıl/sa; bir Tarla bir standart tesisi ya da zinciri besler | hayır: Tarla her tesise yetişir (2 hücre) |
| Eşzamanlı inşaat | 2; ilk 24 saatte 4 yapı 1,0 sa | yalnız ilk saatte |
| Hücre / ilçe tavanı | yurt 6 + satın alma; ≤ 72 hücre/ilçe, ≤ %25 pay | hayır (S1-S 7 hücre) |
| Emir yuvası | temel 4 (+4 Ticaret ofisi): ekmek ihracat, parça ithalat, çelik/silis ithalat, kepek ihracat; yakıt ve elektrik şebekeden gelir (yuva harcamaz) | P5'te sınırda |
| **NPC pazar derinliği (oyuncu dilimi)** | n=4: gıda 75,0, ekmek 62,5 birim/sa; n=20: gıda 75,0, ekmek 62,5 birim/sa; n=200: gıda 75,0, ekmek 62,5 birim/sa | **evet** (n ≥ 4 için kişi başı dilim sabit: gıda 75, ekmek 62,5; bir S standart tesis 160, bir S fırın 250 üretir) |

**Pazar dilimli oyuncu karşılaştırması (n = 200, şehir ilçesi, ilçede 4 dükkân, 1,05 R; NPC dilimi gıda 75,0, ekmek 62,5 birim/sa; ₺/sa, tahıl fırsat maliyeti dahil).**

| Strateji | Yük | Net ₺/sa | Not |
|---|---|---|---|
| A: yalnız `standart_gida_isleme`, NPC dilimi (dükkânsız) | %47 | 1.903 | 75 birim/sa sat |
| A+: standart + bakkal dükkânı (gıda rafı; NPC dilimi + dükkân) | %100 | 5.124 | dükkân 85,0 birim/sa |
| B: yalnız ekmek zinciri, NPC dilimi (dükkânsız) | %25 | 1.110 | 2 tesis sabit gideri; düşük yük |
| B+: ekmek zinciri + fırın dükkânı | %53 | 3.342 | dükkân 68,8 birim/sa |
| **C: A+ ve B+ birlikte (iki ayrı tahıl hattı, iki dükkân; ilçe ≤ 2)** | - | 8.465 | iki pazar havuzu; tesis tabanı karşılaştırması değil, tamamlayıcılık |
| D: ikinci standart tesis (gıda havuzu zaten doluyken; fazla gıda fiyat ×0,25'e iner) | - | -3.175 | marjinal gelir negatif: doymuş havuza ikinci tesis kâr etmez |

Okuma: tek ürünle (A+ 5.124 ↔ B+ 3.342) standart yol 53% önde kalır (gıda ₺70 ve oran 1,84'ün sonucu); ama oyuncu dilimi tek mal havuzunu doldurur ve **ikinci tesis marjinal olarak değersizdir (D)**: oyuncunun asıl kararı "ikinci standart mı, zincir mi" ise zincir 3.342 ₺/sa kazandırır, ikinci standart eksiye düşer. Standart ve zincir ikame değil **tamamlayıcıdır** (C = 8.465 ₺/sa). Tesis tabanındaki −%28 kayıp bu yüzden erken oyunda ve n ≥ 4 her dünyada bağlayıcı değildir.

**Yine de tesis tabanını garanti etmek istenirse (seçenekler; bandı aşmadan):**

| Seçenek | Değişiklik | Standart tesis KD | Değirmen KD | Fırın KD | Kademe başına > standart? | İşçi başına | Yan etki |
|---|---|---|---|---|---|---|---|
| 0 — olduğu gibi | - | 5.097 | 2.720 | 4.525 | hayır | standart ≫ | pazar dilimi kısıtında tamamlayıcı (yukarıda) |
| G1 — zincir yoğunluğu ×2 (tesis başına hacim) | değirmen 400 tahıl → 330 un + 66 kepek; fırın 330 un + 40 yakıt + 30 elektrik → 500 ekmek (oranlar aynı) | 5.097 | 5.440 | 9.050 | **evet** (5.440 > 5.097; 9.050 > 5.097) | işçi ×2 ise ≈ 544/566 < 849 | Tarla:değirmen 2:1; fırın 500/sa pazar dilimini 2× aşar; mevcut yöntemlere dokunmaz |
| G2 — `standart_gida_isleme` mülk kipinde ×0,75 (160 → 120 gıda; oran 1,38 bantta) | mülk kipinde yöntem çıktı geçersiz kılma (bölge kipi aynı) | 2.297 | 2.720 | 4.525 | **evet** (2.720 ve 4.525 > 2.297) | standart 383 < 545/575 ✓ | mülk veri geçersiz kılma mekanizması (K3, M); çiftçi botu gıda fabrikası kurmaz: ölçüm temel çizgisi değişmez |
| G3 — (i) `standart_gida_isleme` mülk kipinde kapat | `mulkKipi`'nin tersi: `yalnizBolge: true` | - | 2.720 | 4.525 | n/a | n/a | yeni oyuncunun tek basit gıda işleme yolu kalkar; G6 kapsamı büyür (süzgeç); `gida` arzı yalnız ahır/mera |

Bant içinde başka güçlendirme yok: ekmek tabanını %10 artırmak fırın oranını 1,59'a çıkarır (bant dışı); fırında yakıt 20 → 15 oranı 1,52 yapar (bant dışı); değirmenin tek başına 5.097 KD'ye ulaşması 6.120 girdide 0,83 oran gerektirir (bant üstü). Yani tesis tabanında kademe başına standardı geçmek yalnız hacim (G1) ya da standardı zayıflatmak (G2) ile olur.

**Karar.** Erken oyunun bağlayıcı kısıtı pazar derinliğidir ve zincir ikinci havuz olarak standardın tamamlayıcısıdır: **(ii) güçlendirme zorunlu değil, (i) kapatma gereksiz.** Baş lider tesis tabanını da kural yaparsa: **G2** (standart ×0,75, mülk kipinde yalnız veri) en az yan etkili yoldur (bölge kipi, botlar, ölçüm temel çizgisi aynı); G1 hacmi ikiye katladığı için pazar doyumunu (§1.3-B3) hızlandırır, önerilmez.

### 5.8 Cam fırını ve doğrama: ev sahibi tesisin mevcut yöntemlerine karşı (tesis tabanı)

| Ev sahibi tesis | Yöntem | Oran | KD ₺/sa (şebeke) | KD/işçi | Not |
|---|---|---|---|---|---|
| celikhane | yuksek_firin | 1,371 | 1.941 | 277 | mevcut; cevher + kömür ister |
| celikhane | elektrik_ark | 1,643 | 2.872 | 287 | mevcut; teknoloji `elektrik_ark_ocagi` (30 M ₺, 3 gün) ister |
| celikhane | cam_firini (öneri) | 1,448 | 1.408 | 282 | yeni |
| parca_fabrikasi | standart_parca | 1,216 | 1.241 | 226 | mevcut (varsayılan yöntem) |
| parca_fabrikasi | otomatik_hat | 1,250 | 1.758 | 586 | mevcut; teknoloji `otomasyon` + elektronik ister |
| parca_fabrikasi | cam_firini (öneri, alternatif ev) | 1,448 | 1.408 | 282 | yeni; barındıran tesis `parca_fabrikasi` olursa |
| parca_fabrikasi | celik_dograma (öneri) | 1,446 | 3.105 | 444 | yeni |

| Cam fırını için ev sahibi | S yapı bedeli | Çelik / parça | Hücre | S süre (sa) | İthal değer | M / L yapı | Yöntem sayısı (A0 sonrası) | Aynı tesisteki rakip yöntem |
|---|---|---|---|---|---|---|---|---|
| `celikhane` (rapor önerisi) | 20.000 ₺ | 100 / 40 | 3 | 10 | 41.331 ₺ | 50.000 ₺ / 90.000 ₺ | 2 mevcut + `cam_firini` (K-8: 10'a doğru) | yuksek_firin 1.941 > cam 1.408 |
| `parca_fabrikasi` | 15.000 ₺ | 80 / 30 | 2 | 8 | 31.665 ₺ | 37.500 ₺ / 67.500 ₺ | 2 mevcut + `celik_dograma` + `cam_firini` | standart_parca 1.241 < cam 1.408 ✓ |
| fark (`parca_fabrikasi` − `celikhane`) | -5.000 ₺ | -20 / -10 | -1 | -2 | -9.666 ₺ | - | - | - |

Okuma: `celik_dograma` ev sahibinin iki mevcut yönteminden de iyidir (KD 3.105 ↔ 1.241 / 1.800). `cam_firini` `celikhane`'de varsayılan `yuksek_firin`in (1.941) **altında** kalır (−%27), `parca_fabrikasi`'nde varsayılan `standart_parca`yı (1.241) **geçer** (+%13) ve ev sahibi 5.000 ₺ + 20 çelik + 10 parça ve bir hücre ucuzdur (ithal değer −9.666 ₺). Sayısal tercih `parca_fabrikasi`'dir; seçim A3'ündür.

## 6. Yerel pazar kanalının para musluğu (`yerelNpc`)

Hane bütçesi B = Σ Q·R·1,12 (dikey §5.9; Q §5.5'in yeni taban tablosundan). Oyuncuya akabilecek tavan: B × (1 − esnaf tabanı %25). Esnaf payı parayı oyuncuya vermez ve defterde kalem değildir (NPC kesesi modellenmez, canlı-dünya §3.4). Haftalık musluk = Σ oyuncu yerel satışı × 168.

### 6.1 İlçe başına haftalık tavan ve tek dükkân (Ekim takvimi)

| İlçe sınıfı | B ₺/sa (13 mal) | Oyuncu tavanı ₺/hafta | Fırın (ekmek) Q birim/sa | 1 fırın dükkânı ₺/hafta (1,05 R) | Tavanın payı |
|---|---|---|---|---|---|
| kirsal | 12.848 | 1.618.788 | 30,6 | 181.812 | %11,2 |
| kasaba | 51.390 | 6.475.150 | 122,4 | 727.280 | %11,2 |
| sehir | 154.170 | 19.425.450 | 367,2 | 952.560 | %4,9 |

### 6.2 İnce dünya (ilçede 1 oyuncu) ve kalabalık: haftalık `yerelNpc` musluğu (fırın dükkânları, hepsi 1,05 R, Ekim)

| İlçe sınıfı | Dükkân sayısı (k) | Dükkân başı satış birim/sa | İlçe toplamı ₺/hafta (musluk) | Prim kısmı (NPC 0,891 R'ye göre) ₺/hafta | Esnafa kalan Q |
|---|---|---|---|---|---|
| kirsal | 1 | 17,2 | 181.812 | 27.532 | %44 |
| kirsal | 3 | 7,7 | 242.903 | 36.782 | %25 |
| kirsal | 5 | 4,6 | 242.903 | 36.782 | %25 |
| kirsal | 10 | 2,3 | 242.903 | 36.782 | %25 |
| kasaba | 1 | 68,7 | 727.280 | 110.131 | %44 |
| kasaba | 3 | 30,6 | 971.611 | 147.130 | %25 |
| kasaba | 5 | 18,4 | 971.611 | 147.130 | %25 |
| kasaba | 10 | 9,2 | 971.611 | 147.130 | %25 |
| sehir | 1 | 90,0 | 952.560 | 144.245 | %75 |
| sehir | 3 | 90,0 | 2.857.680 | 432.734 | %26 |
| sehir | 5 | 55,1 | 2.914.834 | 441.389 | %25 |
| sehir | 10 | 27,5 | 2.914.834 | 441.389 | %25 |

### 6.3 Dünya ölçeği: Alfa-0 (200 oyuncu, 45 ilçe), her oyuncu 1 fırın dükkânı + kapalı ekmek zinciri

| Kalem | ₺/hafta (dünya) | Not |
|---|---|---|
| `yerelNpc` (oyuncu yerel satışı) | 92.910.226 | k≈4,4 dükkân/ilçe; %10 kırsal, %30 kasaba, %60 şehir ilçesi varsayımı |
| · bunun primi (NPC ihracatına göre ek para) | 14.069.263 | yeni musluğun gerçek ek kısmı: aynı mal NPC'ye gitseydi `ihracatNpc` olurdu |
| `ihracatNpc` (ekmek, NPC emilimiyle sınırlı) | 112.266.000 | 12.500 birim/sa × 0,891 R; arz 50.000 birim/sa (200 × 250) |
| Pazar doyumu: arz / (yerel + NPC emilimi) | 2,35 | emen: yerel 8.778 + NPC 12.500 = 21.278 birim/sa; fiyat düşmeden ekmek zinciri kurabilen oyuncu payı ≤ %43 (≈85 fırın) |
| `yerelNpc` payı (ZP8: ≤ %50) | %45,3 | perakende NPC geliri / toplam NPC faucet |
| `hibe` (tek seferlik) | 10.000.000 | 200 × 50.000 ₺; haftalık değil, karşılaştırma için |
| `odul` tavanı (oyuncu başına 8.000 ₺, tek seferlik) | 1.600.000 | ilk_satis, zincir_kapandi, ilk_dukkan ... (docs/06 §15.7) |

Okuma: tüm oyuncular ekmek zinciri kurarsa NPC emilimi yetmez (arz/emilim yukarıda); bu yüzden Alfa-0'ın dört zincirinin dağılımı (ekmek, cam → pencere, süt, fındık) pazar doyumunu da sınar. Yerel kanal toplam NPC parasının %45'ini taşır ama **ek** (NPC ihracatına kıyasla) para yalnız primdir: 14.069.263 ₺/hafta = ihracatNpc'nin %12,5'i. Kanal ek bir kalem olarak izlenir; ihracat musluğunun yerine geçtiği ölçüde para arzı büyümez. Kırsal ilçelerde dükkân talep bağlayıcıdır ve musluk ≈ 181.812 ₺/hafta/ilçe ile ihmal edilebilir.

Para defteri: yeni musluk kalemi `yerelNpc` (NPC hane alımı). `Dunya.mulk.para` doğrulayıcısı bugün tüm musluk kalemlerinin var olmasını ve bilinmeyenin bulunmamasını ister (docs/06 §15.7 madde 7): kalem yalnız `mulk.perakende` bloğu açıkken yazılır ve doğrulayıcıda 'blok açıksa var, değilse yok' koşuluyla eklenir (diğer isteğe bağlı alanlar gibi). Korunum: `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` değişmez, yeni kalem yalnız musluk tarafına girer. Dükkân satışı komisyonsuz; esnaf payı defterde yok.


## 7. Senaryo 1: 50.000 ₺ hibe, Tarla → değirmen → fırın → dükkân (saatlik nakit)

Varsayımlar: ilçe nüfusu 50 bin (ilçede tek oyuncu), hasat çarpanı 1,0 (Ekim; karadeniz 1,05), dükkân fiyatı 1,05 R, yalnız ekmek rafı (çeşit 0,5), NPC satış korumada (komisyonsuz, ihracat ×0,90), ithalat ×1,10. Kit gıdası t=0'da satılır. Yapı sırası: esZamanliInsaat=2; gün 2'de ahır (kepek → gübre). Ödüller çekirdek tablosundan (`ilk_satis` 500 ₺, `zincir_kapandi` 700 ₺; mal ödülleri stoğa). Hücre: 6 yurt, gerisi kasaba 2.500 ₺ (dükkân ×1,45). Hasat, toprak ve NPC fiyat dinamiği yok.

### 7.1 Varyant S: santralsiz, kamu şebekesi (elektrik 10,35 ₺, yakıt 103,5 ₺)

Olaylar: t=0,00 sa Tarla başladı (indirimli, 12 dk); t=0,00 sa Değirmen başladı (indirimli, 36 dk); t=1,00 sa Ekmek fırını başladı (indirimli, 36 dk); t=1,00 sa Dükkân (fırın) başladı (indirimli, 24 dk); t=26,00 sa Ahır (kepek → gübre) başladı (indirimli, 27 dk).

| Saat | Hazine ₺ | Önceki satıra göre değişim ₺ | Ekmek (yerel + NPC) birikimli ₺ |
|---|---|---|---|
| 1 | 51.850 | 1.850 | 0 |
| 2 | 41.710 | -10.139 | 6.158 |
| 3 | 53.557 | 11.847 | 20.416 |
| 4 | 65.404 | 11.847 | 34.674 |
| 6 | 89.099 | 23.694 | 63.189 |
| 8 | 112.793 | 23.694 | 91.705 |
| 12 | 160.181 | 47.388 | 148.737 |
| 18 | 231.264 | 71.083 | 234.284 |
| 24 | 302.346 | 71.083 | 319.831 |
| 30 | 359.387 | 57.041 | 405.379 |
| 36 | 430.695 | 71.307 | 490.926 |
| 42 | 502.002 | 71.307 | 576.473 |
| 48 | 573.309 | 71.307 | 662.021 |
| 72 | 858.539 | 285.229 | 1.004.210 |
| 96 | 1.143.768 | 285.229 | 1.346.400 |
| 120 | 1.428.997 | 285.229 | 1.688.589 |
| 144 | 1.714.227 | 285.229 | 2.030.778 |
| 168 | 1.999.456 | 285.229 | 2.372.968 |

Gün özeti (kalemler o günün 24 saatlik farkı; + gelir, − gider):

| Kalem | Gün 1 | Gün 3 | Gün 7 |
|---|---|---|---|
| yapı bedeli (para) | -22.400 | - | - |
| bakım parçası | -9.611 | -12.355 | -12.355 |
| işletme gideri | -4.176 | -5.760 | -5.760 |
| şebeke elektrik (kamu) | -6.384 | -7.117 | -7.117 |
| kit gıdası satışı | 12.600 | - | - |
| ödül (ilk_satis) | 500 | - | - |
| kepek NPC ihracatı | 12.510 | - | - |
| hücre alımı | -3.625 | - | - |
| inşaat malzemesi ithalatı | -1.228 | - | - |
| şebeke yakıt (kamu) | -46.368 | -49.680 | -49.680 |
| ekmek yerel satış (dükkân) | 122.020 | 127.326 | 127.326 |
| ekmek NPC ihracatı | 197.811 | 214.864 | 214.864 |
| ödül (zincir_kapandi) | 700 | - | - |
| arazi vergisi | -3 | -11 | -11 |
| gubre NPC ihracatı | - | 17.963 | 17.963 |
| **Net** | 252.346 | 285.229 | 285.229 |
| **Gün sonu hazine** | 302.346 | 858.539 | 1.999.456 |

### 7.2 Varyant E: isteğe bağlı santral yatırımı (kendi elektriği; yakıt kamu)

Olaylar: t=0,00 sa Tarla başladı (indirimli, 12 dk); t=0,00 sa Santral (kömür) başladı (indirimli, 60 dk); t=1,00 sa Değirmen başladı (indirimli, 36 dk); t=1,00 sa Ekmek fırını başladı (indirimli, 36 dk); t=2,00 sa Dükkân (fırın) başladı (indirimli, 24 dk); t=26,00 sa Ahır (kepek → gübre) başladı (tam, 27 dk).

| Saat | Hazine ₺ | Önceki satıra göre değişim ₺ | Ekmek (yerel + NPC) birikimli ₺ |
|---|---|---|---|
| 1 | 54.693 | 4.693 | 0 |
| 2 | 31.017 | -23.676 | 5.400 |
| 3 | 30.781 | -237 | 19.658 |
| 4 | 42.435 | 11.654 | 33.916 |
| 6 | 65.743 | 23.308 | 62.432 |
| 8 | 89.051 | 23.308 | 90.947 |
| 12 | 135.667 | 46.616 | 147.979 |
| 18 | 205.591 | 69.924 | 233.526 |
| 24 | 275.515 | 69.924 | 319.074 |
| 30 | 325.741 | 50.227 | 404.621 |
| 36 | 395.907 | 70.165 | 490.168 |
| 42 | 466.072 | 70.165 | 575.716 |
| 48 | 536.238 | 70.165 | 661.263 |
| 72 | 816.899 | 280.662 | 1.003.452 |
| 96 | 1.097.561 | 280.662 | 1.345.642 |
| 120 | 1.378.223 | 280.662 | 1.687.831 |
| 144 | 1.658.884 | 280.662 | 2.030.020 |
| 168 | 1.939.546 | 280.662 | 2.372.210 |

Gün özeti (kalemler o günün 24 saatlik farkı; + gelir, − gider):

| Kalem | Gün 1 | Gün 3 | Gün 7 |
|---|---|---|---|
| yapı bedeli (para) | -30.800 | - | - |
| bakım parçası | -14.917 | -18.058 | -18.058 |
| işletme gideri | -4.116 | -5.760 | -5.760 |
| tahıl ihracatı | 4.320 | - | - |
| kit gıdası satışı | 12.600 | - | - |
| ödül (ilk_satis) | 500 | - | - |
| hücre alımı | -11.125 | - | - |
| inşaat malzemesi ithalatı | -11.062 | - | - |
| şebeke yakıt (kamu) | -46.368 | -49.680 | -49.680 |
| santral kömürü | -5.252 | -5.971 | -5.971 |
| ekmek NPC ihracatı | 202.359 | 214.864 | 214.864 |
| ödül (zincir_kapandi) | 700 | - | - |
| kepek NPC ihracatı | 11.975 | - | - |
| arazi vergisi | -14 | -21 | -21 |
| ekmek yerel satış (dükkân) | 116.715 | 127.326 | 127.326 |
| gubre NPC ihracatı | - | 17.963 | 17.963 |
| **Net** | 225.515 | 280.662 | 280.662 |
| **Gün sonu hazine** | 275.515 | 816.899 | 1.939.546 |

## 8. Senaryo 2: cam → pencere (gün 3 sonunda; santralsiz, kamu şebekesi)

Hat: silis (ithal) + yakıt + elektrik → cam fırını; çelik (ithal) + cam + parça (ithal) + elektrik → doğrama; pencere NPC'ye satılır, cam fazlası NPC'ye. S1-S planına gün 3'te iki yapı eklenir (altıncı ve yedinci yapı: indirim yok).

Olaylar: t=72,00 Cam fırını (parça fab.; A3 seçimi) başladı (tam, 192 dk); t=72,00 Çelik doğrama (parça fab.) başladı (tam, 192 dk).

Aralıklar 24 saatlik bloklardır: 72–96 sa = gün 4, ... 144–168 sa = gün 7 (yatırım gün 3'ün sonunda, 72. saatte başlar).

| Kalem | 72–96 sa | 96–120 sa | 120–144 sa | 144–168 sa |
|---|---|---|---|---|
| yapı bedeli (para) | -30.000 | - | - | - |
| bakım parçası | -20.592 | -21.859 | -21.859 | -21.859 |
| işletme gideri | -8.256 | -8.640 | -8.640 | -8.640 |
| şebeke elektrik (kamu) | -14.221 | -15.314 | -15.314 | -15.314 |
| hücre alımı | -10.000 | - | - | - |
| inşaat malzemesi ithalatı | -33.000 | - | - | - |
| şebeke yakıt (kamu) | -84.125 | -89.424 | -89.424 | -89.424 |
| ekmek yerel satış (dükkân) | 127.326 | 127.326 | 127.326 | 127.326 |
| ekmek NPC ihracatı | 214.864 | 214.864 | 214.864 | 214.864 |
| arazi vergisi | -25 | -25 | -25 | -25 |
| gubre NPC ihracatı | 17.963 | 17.963 | 17.963 | 17.963 |
| silis ithalatı | -34.320 | -39.600 | -39.600 | -39.600 |
| celik ithalatı | -65.894 | -76.032 | -76.032 | -76.032 |
| parca ithalatı | -20.592 | -23.760 | -23.760 | -23.760 |
| pencere NPC ihracatı | 188.698 | 217.728 | 217.728 | 217.728 |
| cam NPC ihracatı | 29.275 | 36.936 | 36.936 | 36.936 |
| **Net** | 257.100 | 340.162 | 340.162 | 340.162 |

Pencere hattının 72→168 sa artımlı katkısı (S2 − S1-S): 136.668 ₺ (yatırım ve hücre dahil). Aynı pencerede S1-S net 1.140.917 ₺.

### 8.1 Pencere hattı kararlı hâl marjı (komisyonlu, ₺/sa; S ölçek, 1 cam fırını : 1 doğrama; A2 önerisi tarifleri)

| Mod | Gelir | Girdi (dış) | Bakım+işletme | Net ₺/sa | Not |
|---|---|---|---|---|---|
| (a) yalnız doğrama, tüm ara mal ithal | 8.981 | 7.732 | 260 | 989 | cam ithal 1,111 × 95 |
| (b) cam fırını + doğrama (silis, çelik, parça ithal; elektrik ve yakıt şebeke) | 13.214 | 10.572 | 520 | 2.121 | cam: 32 birim/sa doğramaya, 18 fazla; iç cam ihracat paritesiyle (fırsat maliyeti) |
| (c) (b) + kendi silis ocağı (5 elektrik → 60 silis; fırsat maliyeti ihracat paritesi) | 13.214 | 11.631 | 700 | 2.220 | silis ocağı `silis` rezervi ister (damar) |

| Kalem | Para | Çelik | Parça | Hücre | Doğrudan süre (sa) | İthal değer ₺ |
|---|---|---|---|---|---|---|
| Parça fabrikası (cam fırını, A3 seçimi) S | 15.000 ₺ | 80 | 30 | 2 | 8 | 31.665 ₺ |
| Parça fabrikası (doğrama) S | 15.000 ₺ | 80 | 30 | 2 | 8 | 31.665 ₺ |
| Çelikhane (cam fırını, alternatif) S | 20.000 ₺ | 100 | 40 | 3 | 10 | 41.331 ₺ |
| Santral S (gerekiyorsa) | 12.000 ₺ | 70 | 30 | 3 | 10 | 27.332 ₺ |

### 8.2 Zincir kurulum süresi: ilk-5 indirimi, eşzamanlı ≤2 inşaat ve erken oyun çarpanı altında

Katılımdan `t0` saat sonra başlatılan zincirin tamamlanma süresi (sa; üretim ilk saat akışı ≈ +1 sa). Her görev başlangıçta o anki çarpanla kısalır (çarpan işin başladığı anda bir kez uygulanır, erkenOyun.ts).

| Zincir | t0=0 sa | t0=12 sa | t0=24 sa | t0=48 sa | t0=72 sa | t0=96 sa | t0=168 sa |
|---|---|---|---|---|---|---|---|
| Ekmek, santralsiz (Tarla, değirmen, fırın, dükkân) | 1,00 | 1,00 | 1,02 | 2,54 | 4,06 | 5,58 | 10,00 |
| Ekmek, + isteğe bağlı santral | 1,40 | 1,40 | 1,44 | 3,59 | 5,75 | 7,91 | 14,00 |
| Cam → pencere, santralsiz (cam fırını, doğrama, yapı market) | 1,20 | 1,20 | 1,22 | 3,05 | 4,88 | 6,71 | 12,00 |
| Cam → pencere, + isteğe bağlı santral | 1,60 | 1,60 | 1,64 | 4,10 | 6,56 | 9,02 | 16,00 |

Nakit kısıtı ayrıdır (S1 saatlik tablo): hibe + kit gıdası satışı santralsiz zinciri ilk 2 saatte karşılar; isteğe bağlı santral hücre ve ithal malzeme nedeniyle ≈ +35.000 ₺ daha ister. İlk 5 yapıda indirim yalnız ilk beş inşaata uygulanır: santralsiz zincirde dört yapı (Tarla, değirmen, fırın, dükkân) ve ahır indirimlidir; santral bir hakkı tüketir.

## 9. Çıkmaz mal denetimi (24 mal; tüketici türü sayısı)

Tüketici türleri (uretim-agi §2.4): Ü üretim yöntemi, H hane/raf, K kamu siparişi, Y yapı maliyeti, O ordu ikmali, P NPC pazar (piyasa yapıcı; `emilimSaat` kaydı) ve N `NpcAlici` güvence kaydı. Kural: ≥ 2 tür; yan ürün için Ü ≥ 1 ve N ≥ 1.

| Mal | Ü | Ü(P1) | H | K | Y | O | P | N | Tür sayısı (P1 hariç) | Tür sayısı (P1 dahil) | Sonuç |
|---|---|---|---|---|---|---|---|---|---|---|---|
| tahil | 4 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| gida | 0 | 1 | 4 | 1 | 0 | 1 | 1 | 0 | 4 | 5 | tamam |
| cevher | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| komur | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| celik | 4 | 0 | 1 | 1 | 25 | 2 | 1 | 0 | 6 | 6 | tamam |
| bakir | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| silis | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| parca | 3 | 0 | 1 | 1 | 25 | 1 | 1 | 0 | 6 | 6 | tamam |
| elektronik | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 3 | 3 | tamam |
| petrol | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| yakit | 10 | 1 | 2 | 0 | 0 | 1 | 1 | 0 | 4 | 4 | tamam |
| muhimmat | 0 | 0 | 0 | 0 | 0 | 2 | 1 | 0 | 2 | 2 | tamam |
| gubre | 1 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 3 | 3 | tamam |
| elektrik | 24 | 3 | 1 | 0 | 0 | 0 | 0 | 0 | 2 | 2 | tamam |
| un | 1 | 0 | 1 | 0 | 0 | 0 | 1 | 0 | 3 | 3 | tamam |
| ekmek | 0 | 0 | 2 | 1 | 0 | 0 | 1 | 0 | 3 | 3 | tamam |
| cam | 1 | 0 | 1 | 1 | 0 | 0 | 1 | 0 | 4 | 4 | tamam |
| pencere | 0 | 0 | 1 | 1 | 1 | 0 | 1 | 0 | 4 | 4 | tamam |
| sut | 0 | 1 | 2 | 0 | 0 | 0 | 1 | 0 | 2 | 3 | tamam |
| sut_urunu | 0 | 0 | 2 | 1 | 0 | 0 | 1 | 0 | 3 | 3 | tamam |
| findik | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 | 1 | 2 | P1'de tamam |
| findik_urunu | 0 | 1 | 2 | 0 | 0 | 0 | 1 | 0 | 2 | 3 | tamam |
| sekerleme | 0 | 0 | 2 | 0 | 0 | 0 | 1 | 0 | 2 | 2 | tamam |
| kepek | 2 | 0 | 0 | 0 | 0 | 0 | 1 | 1 | 3 | 3 | tamam |

`kepek` Ü tüketicileri: kepek_gubresi, sut_kepekli. Raf listeleri perakende-kademeleri §5.1; kamu türleri kamu-ve-kamu-arazileri önerisidir; N kayıtları bütçeli ve toplamı sabit olacak (K-5, para musluğu açmaz).

## 10. Bakım ve aşınma hesapları (kâğıt model; çekirdek koşulmadı)

Parametreler (`parametreler.json` sanayi.bakim): düzeyler asgari girdi×0.5, aşınma +2 puan/gün; normal girdi×1, aşınma 0 puan/gün; yuksek girdi×1.5, aşınma -1.5 puan/gün; verim kaybı tavanı %40; kıtlık eşiği %95, kıtlıkta aşınma 2 puan/gün; genel onarım 20% inşa bedeli + 6 sa duruş.

### 10.1 Bakım parçası maliyeti ↔ çıktı değeri ve KD (S ölçek, parça ithal 200 ₺)

Bakım maliyeti = bakım parçası × 180 × 1,111 + işletme 60 ₺; aşınma cezası çıktıyı çarpar, GİRDİYİ DEĞİL (`ekonomi/uretim.ts:204-222` (ceza çarpanı :212), çıktıya uygulanışı `:446`; girdiler `:335-340`): kayıp = %ceza × çıktı değeri. Kaldıraç = çıktı değeri / KD.

| Yöntem | Çıktı ₺/sa | KD ₺/sa | Bakım+işletme ₺/sa | Bakım / çıktı | Kaldıraç (çıktı/KD) | KD sıfır olduğu aşınma |
|---|---|---|---|---|---|---|
| standart_gida_isleme | 11.200 | 5.100 | 220 | %2,0 | 2,2 | %114 |
| yuksek_firin | 7.200 | 1.950 | 360 | %5,0 | 3,7 | %68 |
| standart_parca | 7.200 | 1.280 | 260 | %3,6 | 5,6 | %44 |
| standart_elektronik | 12.000 | 6.900 | 260 | %2,2 | 1,7 | %144 |
| ahir_besi | 6.580 | 2.980 | 160 | %2,4 | 2,2 | %113 |
| azotlu_gubre | 5.600 | 2.450 | 260 | %4,6 | 2,3 | %109 |
| geleneksel_tarim | 6.000 | 6.000 | 160 | %2,7 | 1,0 | yok (girdisiz) |
| degirmen | 8.844 | 2.724 | 220 | %2,5 | 3,2 | %77 |
| ekmek_firini | 15.000 | 4.600 | 220 | %1,5 | 3,3 | %77 |
| cam_firini | 4.750 | 1.470 | 260 | %5,5 | 3,2 | %77 |
| celik_dograma | 10.080 | 3.110 | 260 | %2,6 | 3,2 | %77 |
| kepek_gubresi | 2.520 | 670 | 160 | %6,3 | 3,8 | %66 |
| sut_kepekli | 3.840 | 1.210 | 160 | %4,2 | 3,2 | %79 |

### 10.1b Bakımın net getirisi (60 gün ortalaması; yönetimsiz ↔ yönetimli) ve KD ≥ 0 için en yüksek tavan

| Yöntem | Bakım parçası ₺/sa | KD≥0 en yüksek tavan (1−1/oran) | Net getiri ₺/sa: mevcut: çıktıya (20000; %40) | Net getiri ₺/sa: A: çıktıya (11000; %30) | Net getiri ₺/sa: A, parça fiyatı ×1,33 (kıtlık) | Net getiri ₺/sa: A + verime (11000; %30) |
|---|---|---|---|---|---|---|
| standart_gida_isleme | 160 | %46 | 2.453 | 949 | 896 | 345 |
| yuksek_firin | 300 | %27 | 1.380 | 413 | 314 | -107 |
| standart_parca | 200 | %18 | 1.480 | 513 | 447 | -73 |
| standart_elektronik | 200 | %57 | 2.600 | 988 | 922 | 483 |
| ahir_besi | 100 | %45 | 1.435 | 551 | 518 | 195 |
| azotlu_gubre | 200 | %44 | 1.107 | 354 | 288 | 43 |
| geleneksel_tarim | 100 | yok | 1.300 | 494 | 461 | 494 |
| degirmen | 160 | %31 | 1.904 | 716 | 663 | 110 |
| ekmek_firini | 160 | %31 | 3.340 | 1.325 | 1.272 | 295 |
| cam_firini | 200 | %31 | 908 | 270 | 204 | -54 |
| celik_dograma | 200 | %31 | 2.152 | 798 | 732 | 108 |
| kepek_gubresi | 100 | %27 | 488 | 149 | 116 | -34 |
| sut_kepekli | 100 | %32 | 796 | 280 | 247 | 20 |

Net getiri = (yönetimsizin 60 günlük ortalama kaybı) − bakım parçası maliyeti. Çıktıya uygulamada kayıp = çıktı × (1 − ort. çarpan); verime uygulamada kayıp = KD × (1 − ort. çarpan). Hepsi pozitifse bakım her tesis türü için yapmamaktan iyidir; negatifse bakım yapmak kaybettirir (O2 ölçümünde sanayicide görülen yön).

### 10.2 Aşınma yörüngesi (yönetimsiz: parça stoğu tükenir, karşılanma 0 → +%2/gün) ve çıktı çarpanı

| Parametre (kıtlık aşınma ppm/gün; tavan) | gün 7 | gün 14 | gün 30 | gün 45 | gün 60 | 60 gün ortalama | tavana varış (gün) | bakımlı/bakımsız (60 gün ort.) | bakımlı/bakımsız (tavan) |
|---|---|---|---|---|---|---|---|---|---|
| mevcut (20000; %40) | %-5,6 | %-11,2 | %-24,0 | %-36,0 | %-40,0 | %-23,3 | 50 | 1,304 | 1,667 |
| A: 11000; %30 | %-2,3 | %-4,6 | %-9,9 | %-14,8 | %-19,8 | %-9,9 | 91 | 1,110 | 1,429 |
| B: 15000; %30 | %-3,1 | %-6,3 | %-13,5 | %-20,3 | %-27,0 | %-13,5 | 67 | 1,156 | 1,429 |
| C: 10000; %25 | %-1,7 | %-3,5 | %-7,5 | %-11,3 | %-15,0 | %-7,5 | 100 | 1,081 | 1,333 |

Çıktı değişimi (çıktı × çarpan − 1). Tarla gibi girdisiz yöntemde bu KD kaybıdır; işleme yöntemlerinde KD kaybı = çıktı kaybı × kaldıraç (§10.1).

### 10.3 Kaldıraçlı KD kaybı: işleme yöntemlerinde gün 30 ve gün 45 (aşınma çıktıya uygulanırsa ↔ verime uygulanırsa)

| Yöntem | Parametre | KD gün 30 (çıktıya) | KD gün 45 (çıktıya) | KD gün 60 (çıktıya) | KD (verime; girdi de kısılır) gün 60 | Tavanda KD (çıktıya) |
|---|---|---|---|---|---|---|
| değirmen | mevcut (20000; %40) | 601 | -460 | -814 | 1.634 | -814 |
| değirmen | A: 11000; %30 | 1.848 | 1.411 | 973 | 2.185 | 71 |
| ekmek fırını | mevcut (20000; %40) | 1.000 | -800 | -1.400 | 2.760 | -1.400 |
| ekmek fırını | A: 11000; %30 | 3.115 | 2.373 | 1.630 | 3.689 | 100 |
| cam fırını | mevcut (20000; %40) | 330 | -240 | -430 | 882 | -430 |
| cam fırını | A: 11000; %30 | 1.000 | 765 | 530 | 1.179 | 45 |
| çelik doğrama | mevcut (20000; %40) | 691 | -519 | -922 | 1.866 | -922 |
| çelik doğrama | A: 11000; %30 | 2.112 | 1.613 | 1.114 | 2.494 | 86 |
| standart_gida_isleme | mevcut (20000; %40) | 2.412 | 1.068 | 620 | 3.060 | 620 |
| standart_gida_isleme | A: 11000; %30 | 3.991 | 3.437 | 2.882 | 4.090 | 1.740 |

### 10.4 Başlangıç kiti parça stoğu kaç saat yeter (yönetimsiz, düzey normal)

| Tesis seti | Bakım parçası/sa | Kit 40 parça yeter (sa) | Aşınma başlangıcı (gün) |
|---|---|---|---|
| Tarla | 0,5 | 80 | 3,3 |
| Tarla + değirmen + fırın | 2,1 | 19 | 0,8 |
| Tarla + değirmen + fırın + ahır | 2,6 | 15 | 0,6 |
| + santral + cam fırını + doğrama | 5,8 | 7 | 0,3 |

Not: P4'ün dört yapısı indirimli bile ≈ 40,6 parça ister (7 + 14 + 14 + 5,6); kit 40 parça inşaata bile yetmez, bakıma kalan yok (ödül `ilk_isleme` +5 parça ≈ 2 saat bakım). Bakım parçası ilk saatten ithalat ister ve bir emir yuvası harcar (temel 4 yuva).
