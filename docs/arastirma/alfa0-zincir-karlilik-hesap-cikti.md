# Alfa-0 zincir kârlılık hesap çıktısı (otomatik üretildi)

Kaynak: `docs/arastirma/alfa0-zincir-karlilik-hesap.mjs`. Bu dosyayı elle düzenleme; betiği yeniden koş.

## 0. Sabitler (veriden okunan ya da sabit)

| Sabit | Değer |
|---|---|
| NPC ihracat / ithalat çarpanı (komisyonlu) | 0,891 / 1,111 (korumada ithalat 1,10) |
| Şebeke elektrik / yakıt | 10,35 ₺ / 103,5 ₺ (kamu tavanı 1,035 × taban; ödemenin %12 ilçe kasasına, kalanı lavabo) |
| Bakım parçası (ithal) | 200,0 ₺/parça; işletme 60 ₺/sa/tesis |
| Dükkân S | gider 132 ₺/sa, kasa 90 birim/sa, kademe 0,95 / 1,05 (varsayılan) / 1,15 R, kampanya 0,85 R |
| Yerel kanal | yerelOlcek 40; medyan ilçede ekmek 40 birim/sa/oyuncu, diğer mallar talep oranıyla (pencere 5,3, süt 13,3, süt ürünü 13,3, şekerleme 4,0, fındık ürünü 2,0) |
| NPC dilimi (birim/sa/oyuncu; N ≥ 4 ⇒ emilim/4) | ekmek 62,5, tahil 90,0, un 75,0, kepek 30,0, pencere 25,0, cam 35,0, sut 50,0, sut_urunu 32,5, findik 45,0, findik_urunu 25,0, sekerleme 20,0, gubre 50,0 |
| Hücre fiyatı (kırsal / kasaba / şehir; ticari ×1,45) | 1.000 / 2.500 / 6.500 ₺ |
| İlk 5 yapı indirimi | %30 (para + malzeme) |
| Aşınma (C) | kıtlık aşınması 10.000 ppm/gün, tavan %25 (A3 §5.10 `asinmaHizCarpaniPpm` 500.000); aşama çıktı kaybı gün 14 %3,5, gün 45 %11,3, gün 70 %17,5 |

## 1. Basamak ekonomisi (kapasite; S ölçek; saatlik; yatırım ilk 5 yapı indirimli)

Birim maliyet = (girdi + şebeke enerjisi + bakım parçası + işletme − yan ürün kredisi) / ana çıktı. **İç** = ara girdi fırsat maliyeti (kendi ürettiğini NPC'ye satmama, ×0,891); **ithal** = girdinin tamamı NPC'den ×1,111 (uzman kademe). Yan ürün (kepek, gübre) NPC ihracat fiyatıyla kredilenir. Satış: NPC ihracat 0,891 R (denge) ve doyma (×0,625); yerel dükkân 0,95 / 1,05 / 1,15 R. Marj = satış / maliyet − 1.

### Ekmek (Tarla → değirmen → fırın → dükkân)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış denge / doyma ₺ | Yerel 0,95 / 1,05 / 1,15 R ₺ | Marj NPC (iç / ithal) | Marj yerel 1,05 R (iç) | Net ₺/sa (iç, NPC denge) | Net ₺/sa (ithal, NPC denge) | Yatırım ₺ (ind. / indirimsiz) | Geri ödeme sa (iç, kapasite) | Pazar birim/sa (NPC dilimi + yerel) ↔ kapasite |
|---|---|---|---|---|---|---|---|---|---|---|
| Tarla (`geleneksel_tarim`) | 0,8 / 0,8 | 26,7 / 16,7 | - | %3241 / %3241 | - | 5.186 | 5.186 | 8.358 / 11.940 | 1,6 | 90,0 ↔ 200 |
| Değirmen (`degirmen`) | 31,3 / 39,3 | 44,5 / 27,8 | - | %42 / %13 | - | 2.190 | 870 | 15.316 / 21.880 | 7,0 | 75,0 ↔ 165 |
| Fırın (`ekmek_firini`) | 40,8 / 48,4 | 53,5 / 33,4 | 57,0 / 63,0 / 69,0 | %31 / %11 | %54 | 3.034 | 1.219 | 15.316 / 21.880 | 5,0 | 102,5 ↔ 240 |

### Cam → pencere (cam fırını → doğrama → yapı market)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış denge / doyma ₺ | Yerel 0,95 / 1,05 / 1,15 R ₺ | Marj NPC (iç / ithal) | Marj yerel 1,05 R (iç) | Net ₺/sa (iç, NPC denge) | Net ₺/sa (ithal, NPC denge) | Yatırım ₺ (ind. / indirimsiz) | Geri ödeme sa (iç, kapasite) | Pazar birim/sa (NPC dilimi + yerel) ↔ kapasite |
|---|---|---|---|---|---|---|---|---|---|---|
| Cam fırını (`cam_firini`) | 75,4 / 75,4 | 84,6 / 52,9 | 90,3 / 99,8 / 109,2 | %12 / %12 | %32 | 463 | 463 | 22.050 / 31.500 | 47,6 | 37,7 ↔ 50 |
| Doğrama (`celik_dograma`) | 261,6 / 285,4 | 320,8 / 200,5 | 342,0 / 378,0 / 414,0 | %23 / %12 | %45 | 1.658 | 989 | 22.050 / 31.500 | 13,3 | 30,3 ↔ 28 |

### Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış denge / doyma ₺ | Yerel 0,95 / 1,05 / 1,15 R ₺ | Marj NPC (iç / ithal) | Marj yerel 1,05 R (iç) | Net ₺/sa (iç, NPC denge) | Net ₺/sa (ithal, NPC denge) | Yatırım ₺ (ind. / indirimsiz) | Geri ödeme sa (iç, kapasite) | Pazar birim/sa (NPC dilimi + yerel) ↔ kapasite |
|---|---|---|---|---|---|---|---|---|---|---|
| Tarla (`geleneksel_tarim`) | 0,8 / 0,8 | 26,7 / 16,7 | - | %3241 / %3241 | - | 5.186 | 5.186 | 8.358 / 11.940 | 1,6 | 90,0 ↔ 200 |
| 2 Ahır (`sut_kepekli` ×2) | 27,4 / 31,5 | 35,6 / 22,3 | 38,0 / 42,0 / 46,0 | %30 / %13 | %53 | 1.347 | 687 | 22.750 / 32.500 | 16,9 | 63,3 ↔ 164 |
| Mandıra (`peynir_mandira`; varsayım: bakım 0,8) | 83,4 / 102,8 | 106,9 / 66,8 | 114,0 / 126,0 / 138,0 | %28 / %4 | %51 | 1.601 | 281 | 15.316 / 21.880 | 9,6 | 45,8 ↔ 68 |

### Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış denge / doyma ₺ | Yerel 0,95 / 1,05 / 1,15 R ₺ | Marj NPC (iç / ithal) | Marj yerel 1,05 R (iç) | Net ₺/sa (iç, NPC denge) | Net ₺/sa (ithal, NPC denge) | Yatırım ₺ (ind. / indirimsiz) | Geri ödeme sa (iç, kapasite) | Pazar birim/sa (NPC dilimi + yerel) ↔ kapasite |
|---|---|---|---|---|---|---|---|---|---|---|
| Fındık bahçesi (`findik_bahcesi`; varsayım: bakım 0,5) | 2,0 / 2,0 | 75,7 / 47,3 | - | %3687 / %3687 | - | 5.899 | 5.899 | 8.358 / 11.940 | 1,4 | 45,0 ↔ 80 |
| Kavurma (`findik_kavurma`; varsayım: bakım 0,8) | 171,5 / 208,9 | 213,8 / 133,7 | 228,0 / 252,0 / 276,0 | %25 / %2 | %47 | 1.695 | 199 | 15.316 / 21.880 | 9,0 | 27,0 ↔ 40 |
| Ezme/şekerleme (`findik_ezme_sekerleme`; varsayım: bakım 0,8) | 124,8 / 148,3 | 160,4 / 100,2 | 171,0 / 189,0 / 207,0 | %29 / %8 | %51 | 3.203 | 1.091 | 15.316 / 21.880 | 4,8 | 24,0 ↔ 90 |

## 2. Zincir toplamı: pazar sınırlı en iyi akış (N = 200 oyuncu; yerelOlcek 40; kademe 1,05 R; NPC denge)

Net = satış − eksik girdi ithalatı − enerji − bakım parçası − işletme − dükkân gideri (yerel satış varsa). Doluluk aşama başına ızgara aramasıyla (üstteki satış katmanları: yerel, sonra NPC dilimi). **Bakımlı** = parça alınır; **bakımsız** = parça yok, aşama çıktı kaybı (C). Yatırım hücre dahil (kasaba).

| Zincir | Doluluk (aşama) | Net ₺/sa (son ürün + yan ürün satılır) | Net ₺/gün | Yatırım ₺ (kasaba) | Geri ödeme sa | Ana akış (birim/sa) | Net ₺/sa, tüm ara mal dilimleri de satılırsa |
|---|---|---|---|---|---|---|---|
| Ekmek (Tarla → değirmen → fırın → dükkân) | tarla %90, degirmen %90, firin %45 | 4.492 | 107.819 | 49.772 | 11,1 | ekmek 108,0 | 8.346 |
| Cam → pencere (cam fırını → doğrama → yapı market) | cam %100, dograma %100 | 2.335 | 56.037 | 88.433 | 37,9 | pencere 28,0, cam 18,0 | 2.335 |
| Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | tarla %50, ahir2 %100, mandira %70 | 4.933 | 118.385 | 62.206 | 12,6 | sut_urunu 47,6, sut 59,0 | 7.338 |
| Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | bahce %100, kavurma %100, ezme %30 | 7.765 | 186.356 | 49.772 | 6,4 | findik_urunu 28,0, sekerleme 27,0 | 8.097 |

### 2.1 Yatırım kalemleri (kasaba hücre; ilk 5 yapı indirimli; ekmek ve süt P4, pencere P5 indirimsiz)

| Zincir | Kalemler (₺) | Toplam ₺ |
|---|---|---|
| Ekmek (Tarla → değirmen → fırın → dükkân) | Tarla (`geleneksel_tarim`) 8.358; Değirmen (`degirmen`) 15.316; Fırın (`ekmek_firini`) 15.316; Dükkân (firin) 10.782; Ek hücre (0 adet, kasaba) 0 | 49.772 |
| Cam → pencere (cam fırını → doğrama → yapı market) | Cam fırını (`cam_firini`) 31.500; Doğrama (`celik_dograma`) 31.500; Dükkân (yapi_market) 15.433; Ek hücre (4 adet, kasaba) 10.000 | 88.433 |
| Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | Tarla (`geleneksel_tarim`) 8.358; 2 Ahır (`sut_kepekli` ×2) #1 11.375; 2 Ahır (`sut_kepekli` ×2) #2 11.375; Mandıra (`peynir_mandira`; varsayım: bakım 0,8) 15.316; Dükkân (sarkuteri) 10.782; Ek hücre (2 adet, kasaba) 5.000 | 62.206 |
| Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | Fındık bahçesi (`findik_bahcesi`; varsayım: bakım 0,5) 8.358; Kavurma (`findik_kavurma`; varsayım: bakım 0,8) 15.316; Ezme/şekerleme (`findik_ezme_sekerleme`; varsayım: bakım 0,8) 15.316; Dükkân (bakkal) 10.782; Ek hücre (0 adet, kasaba) 0 | 49.772 |

## 3. Duyarlılık: dünya büyüklüğü N, NPC fiyatı, dükkân kademesi (net ₺/sa; bakımlı)

| Zincir | N = 200 (NPC dilimi emilim/4) | N = 4 | N = 1 (tek oyunculu pilot) | NPC doyma ×0,625 | Kademe 0,95 R | Kademe 1,15 R | Yerel kanal yok (yalnız NPC) |
|---|---|---|---|---|---|---|---|
| Ekmek (Tarla → değirmen → fırın → dükkân) | 4.492 | 4.492 | 10.660 | 3.061 | 4.252 | 4.732 | 2.438 |
| Cam → pencere (cam fırını → doğrama → yapı market) | 2.335 | 2.335 | 2.335 | 160 | 2.118 | 2.552 | 1.865 |
| Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | 4.933 | 4.933 | 5.668 | 2.645 | 4.719 | 5.146 | 3.305 |
| Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | 7.765 | 7.765 | 10.514 | 4.559 | 7.645 | 7.885 | 6.818 |

## 4. Bakım ve aşınma (A3 §5.10: aşınma ×0,5, tavan %25): bakımlı ↔ bakımsız (net ₺/sa)

Bakımlı: parça ithal (yukarıdaki sütun). Bakımsız: parça yok, her aşamada çıktı kaybı. Gün 14, 45, 70 anlık; "60 g ort." = 1..60. günlerin ortalaması. `yuzey_cevher` ve `hidro_santrali` parça çarpanı ×0,2 (mülk) bu dört zincirde kullanılmaz (çelik ithal; elektrik şebekeden): etkisi §5.

| Zincir | Bakımlı | Bakımsız gün 14 | gün 45 | gün 70 | 60 g ort. | Bakımlı / bakımsız (60 g ort.) | Bakım parçası ₺/sa (tüm aşamalar) |
|---|---|---|---|---|---|---|---|
| Ekmek (Tarla → değirmen → fırın → dükkân) | 4.492 | 4.911 | 4.730 | 4.575 | 4.806 | 0,93 | 420 |
| Cam → pencere (cam fırını → doğrama → yapı market) | 2.335 | 2.272 | 1.248 | 425 | 1.727 | 1,35 | 400 |
| Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | 4.933 | 5.153 | 4.289 | 3.548 | 4.667 | 1,06 | 460 |
| Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | 7.765 | 7.899 | 6.635 | 5.465 | 7.187 | 1,08 | 420 |

### 4.1 Aşınma kalibrasyonu varyantları: bakımlı / bakımsız oranı (60 g ort.)

Varyant = (kıtlık aşınması ppm/gün, çıktı kaybı tavanı). C = A2 önerisi (A3 §5.10); mevcut = `sanayi.bakim` (bölge kipi değeri); E = daha yumuşak.

| Zincir | C (10.000; %25) | C hızı, tavan %40 (10.000; %40) | mevcut (20.000; %40) | E (8.000; %25) |
|---|---|---|---|---|
| Ekmek (Tarla → değirmen → fırın → dükkân) | 0,93 | 0,95 | 1,20 | 0,93 |
| Cam → pencere (cam fırını → doğrama → yapı market) | 1,35 | 2,01 | 4,10 | 1,21 |
| Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | 1,06 | 1,19 | 1,70 | 1,02 |
| Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | 1,08 | 1,22 | 1,65 | 1,04 |

## 5. Şebeke ödemesi, kasa payı ve isteğe bağlı santral

| Zincir | Elektrik birim/sa | Yakıt birim/sa | Şebeke ödemesi ₺/sa | Ödemenin %12 kasaya ₺/sa | Lavabo `sebeke` ₺/sa | Ödeme / net (bakımlı) |
|---|---|---|---|---|---|---|
| Ekmek (Tarla → değirmen → fırın → dükkân) | 17,6 | 9,0 | 1.113 | 134 | 980 | %25 |
| Cam → pencere (cam fırını → doğrama → yapı market) | 33,0 | 16,0 | 1.998 | 240 | 1.758 | %86 |
| Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | 17,0 | 0,0 | 176 | 21 | 155 | %4 |
| Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | 9,6 | 5,0 | 617 | 74 | 543 | %8 |

Hidro santrali (dağ etiketi gerekir): 300 elektrik/sa üretir, bakım parçası 2,0 → 0,4/sa (×0,2); yatırım 33.780 ₺ (korumada ithal malzeme). Ekmek zincirinin elektriği 17,6/sa: şebeke tasarrufu 182 ₺/sa − bakım 80 ₺/sa = 102 ₺/sa net ⇒ geri ödeme 332 sa. Üretilen fazla elektrik satılamaz (elektrik NPC kaydı yok): santral yalnız şebeke tasarrufudur.

## 6. A0-11: ilk dükkân ve geri ödeme (kâğıt)

Dükkân (fırın, ekmek, 1,05 R): oyuncu satışı `s = min(90, p·Q) (k = 1: p = 0,561; k = 3: p = 0,25)` (çekim ağırlığı w = (1/p)²(1+0,25·çeşit), esnaf w, k = 1 oyuncu/ilçe; esnaf %25 tabanı); Q = 60 × nüfus × `yerelOlcek` / 1e6 birim/sa. Ek net = s × (1,05 − 0,891) × 60 − 132 (NPC'ye satışa göre ek kazanç). Yatırım: dükkân para 4.200 + çelik 14 + parça 5,6 + pencere 2,8 (korumada ithal) + ticari hücre (×1,45); **kit 3 pencere** pencere kalemini karşılar.

| İlçe (nüfus) | Q ekmek birim/sa | s birim/sa (k = 1) | Ek net ₺/sa | Yatırım ₺ (kit yok) | Yatırım ₺ (kit 3 pencere) | Geri ödeme sa (kit) | k = 3 oyuncu: s / net / geri ödeme sa |
|---|---|---|---|---|---|---|---|
| kırsal 8.000 | 19 | 10,8 | -29 | 9.716 | 8.607 | hiç | 4,8 / -86 / hiç |
| küçük kasaba 20.000 | 48 | 26,9 | 125 | 11.891 | 10.782 | 86,2 | 12,0 / -18 / hiç |
| kasaba 40.000 | 96 | 53,9 | 382 | 11.891 | 10.782 | 28,2 | 24,0 / 97 / 111,2 |
| kasaba 70.000 | 168 | 90,0 | 727 | 11.891 | 10.782 | 14,8 | 42,0 / 269 / 40,1 |
| şehir 120.000 | 288 | 90,0 | 727 | 17.691 | 16.582 | 22,8 | 72,0 / 555 / 29,9 |
| büyük şehir 300.000 | 720 | 90,0 | 727 | 17.691 | 16.582 | 22,8 | 90,0 / 727 / 22,8 |

Kit ve ödül: kit pencere 3 ≥ 2,8 (ilk dükkân ithalatsız; ithal pencere kalemi tasarrufu **1.109 ₺**'ye kadar, indirimsiz ithal)); `ilk_pencere` ödülü 8 bakım parçası = taban 1.440 ₺ (ithal 1.600 ₺): pencere zinciri yatırımının %1,6'ini karşılar, geri ödemeyi 0,6 sa kısaltır.

### 6.1 İlk dükkân süresi (kâğıt zaman çizelgesi, erken oyun çarpanı %10, ilk 24 sa)

| Adım | Süre | Not |
|---|---|---|
| Tarla (2 sa × %10) | 0,2 sa | katılım anında; yurt hücresi ücretsiz |
| Fabrika (6 sa × %10) | 0,6 sa | ikinci yuva, Tarla ile aynı anda |
| Dükkân (4 sa × %10) | 0,4 sa | yuva boşalınca (Tarla bitince); kit pencere 3 ≥ 2,8, çelik 120, parça 40 yeter |
| Dükkân bitişi (kâğıt, gecikmesiz) | ≈ 0,6–1,0 sa | ilk satış: raf kit gıdası (200) hemen; yönetim kararı bağlayıcıdır |
| İnsan (A1: kit varsa karar ≈ 49 dk) | ≈ 1,2 sa | tek oyuncu alt ucu; dağılım A1 pilotundadır |
| Bot (G7 gecikmesi U(3, 24) sa; %25 ilk 24 sa kurmaz) | ortalama ≈ 13,9 sa | `bot-kurallari-g6-g8.md` §1.1; eşik ≤ 36 sa |

Geri ödeme medyanı (b: ilçe başına gerçek nüfus, `yerelOlcek` 40; 45 ilçe): 37 sa (oyuncular ilçelere eşit) / 22 sa (nüfusla orantılı) (`yerel-talep-kalibrasyon.md` §4); kârlı ilçe 36 / 42 (nüfusu ≥ 30 bin).

## 7. Parametre duyarlılığı (öneri adayları; N = 200, bakımlı, son ürün satılır)

| Aday | Zincir | Önce net ₺/sa | Sonra net ₺/sa | Değişim | Geri ödeme sa (önce → sonra) |
|---|---|---|---|---|---|
| `celik_dograma` pencere çıktısı 28 → 30 | Cam → pencere (cam fırını → doğrama → yapı market) | 2.335 | 2.976 | +27,5% | 37,9 → 29,7 |
| `celik_dograma` 28 → 30 **ve** `cam_firini` yakıt 16 → 12 | Cam → pencere (cam fırını → doğrama → yapı market) | 2.335 | 3.390 | +45,2% | 37,9 → 26,1 |
| `celik_dograma` pencere çıktısı 28 → 32 | Cam → pencere (cam fırını → doğrama → yapı market) | 2.335 | 3.436 | +47,2% | 37,9 → 25,7 |
| `cam_firini` yakıt 16 → 12 | Cam → pencere (cam fırını → doğrama → yapı market) | 2.335 | 2.749 | +17,7% | 37,9 → 32,2 |
| `findik_bahcesi` çıktı 80 → 60 (P1 tarifi) | Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | 7.765 | 6.358 | -18,1% | 6,4 → 7,8 |
| `findik_bahcesi` çıktı 80 → 50 (P1 tarifi) | Fındık → iç → şekerleme (bahçe → kavurma → ezme → bakkal) | 7.765 | 5.414 | -30,3% | 6,4 → 9,2 |
| `sut_kepekli` kepek 60 → 40 (ahır başına) | Süt → süt ürünü (Tarla, 2 ahır → mandıra → şarküteri) | 4.933 | 5.733 | +16,2% | 12,6 → 10,9 |
