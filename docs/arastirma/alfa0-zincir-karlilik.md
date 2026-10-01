# Alfa-0 zincir kârlılık tablosu (A2)

> **Durum.** Yalnız belge; kod ve veri değişmedi. Taban 7553b55, dal `takim/a2/zincir-karlilik`. Alıcı: Ar-Ge lideri (baş lider isteği). Sayıların kaynağı: `p4-p5-ekonomi.md` (G4: ekmek, cam → pencere, `sut_kepekli`, dükkân S, şebeke, kasa), `yerel-talep-kalibrasyon.md` (`yerelOlcek` 40), A3 `p4-p5-sartname.md` §5.10 (bakım C), `bot-kurallari-g6-g8.md` §1.1. Hesap betiği `alfa0-zincir-karlilik-hesap.mjs` (çıktı `alfa0-zincir-karlilik-hesap-cikti.md`; node ile deterministik, `eslint` temiz, iki koşu `cmp` aynı).
>
> **Süt ve fındık G4'ün dışındadır.** G4 yalnız ekmek, cam → pencere ve `sut_kepekli` yöntemini sayılandırdı. Süt ürünü ve fındık zincirinin tarifleri `dikey-zincirler-ve-perakende.md` §3.6 ve §3.8'dendir (`peynir_mandira`, `findik_kavurma`, `findik_ezme_sekerleme`); `findik_bahcesi` yöntemi **hiçbir belgede sayısal değildir**: bu belgede 80 fındık/sa ve tarla bakımı **A2 varsayımıdır** (doğrulanmadı). Her ikisi P1 işidir (A3: hiçbir yöntem `sut_urunu`, `findik_urunu`, `sekerleme` üretmez). Süt ve fındık sonuçları bu yüzden **iki kat belirsizdir** (tarif ve varsayım).

## 0. Cevaplar ve öneriler

**Soru 1: zarar eden ya da baskın zincir var mı?** *Zarar eden yok.* Pazar sınırlı en iyi akışta dört zincirin hepsi pozitif (net ₺/sa, N = 200, bakımlı, yerel kanal açık, ilk 24 saat sonrası kararlı hâl):

| Zincir | Net ₺/sa | Yatırım ₺ (kasaba) | Geri ödeme sa | Not |
|---|---|---|---|---|
| Fındık → iç → şekerleme (P1 tarifi, varsayım) | **7.765** | 49.772 | **6,4** | en yüksek; tarif ve mevsim varsayımına bağlı |
| Süt → süt ürünü (P1) | 4.933 | 62.206 | 12,6 | kepek ithal (2.400 ₺/sa) en büyük kalem |
| Ekmek (G4) | 4.492 | 49.772 | 11,1 | G4 S1'in (4.877 ₺/sa) %8 altında (bakım parçası dahil) |
| Cam → pencere (G4, P5) | **2.335** | 88.433 | **37,9** | en zayıf; yatırım pahalı, indirimsiz |

- **Baskın (göreceli) olan fındık → şekerleme**: ekmeğin 1,7 katı, geri ödemesi yarı. Nedeni zincirin her kademesinin ayrı bir NPC dilimine sahip olması (iç 25 + 2, şekerleme 20 + 4 birim/sa) ve yüksek birim değer (iç 240 ₺, şekerleme 180 ₺). Ama **P1 tarifi ve bahçe varsayımı kesin değil**, ayrıca Alfa-0 1 Ekim'de açıldığından fındık hasat dönemi dışındadır (dikey §3.8); sayılar yıl ortalamasıdır, mevsim ve ambar kararı net'i dalgalandırır. G4 kapsamındaki zincirler arasında baskın yok: ekmek ve süt aynı sınıfta (±10%).
- **Ekmek zincirinin gizli gücü:** dört ayrı kapısı vardır (ekmek, un, tahıl, kepek dilimleri). Tüm ara mal dilimleri de satılırsa net 8.346 ₺/sa'e çıkar (fındık ve süt de 8.097 / 7.338); yani zincirler **kapı sayısı** kadar kazanır. Temel emir yuvası 4 olduğundan (`mulk.temelEmirYuvasi`) ekmek zinciri 4 yuvayı tamamen doldurur.
- **Zayıf olan cam → pencere**: net ekmeğin yarısı, yatırımı 1,8 katı, geri ödeme 38 sa; NPC fiyatı doymada (×0,625) net 160 ₺/sa'e düşer (ekmek 3.061, süt 2.645, fındık 4.559). Şebeke ödemesi net'in %86'sıdır (yakıt 16 + elektrik 33 birim/sa = 1.998 ₺/sa). Bu bir "kilit değil, sonuç" olabilir (pencere yapı malzemesi ve kamu siparişi talebi içindir), ama ilk P5 zinciri olarak oyuncuya pahalı bir tercihtir.
- **Bakım bu zincirlerde ekonomik olarak neredeyse anlamsızdır** (bakımlı/bakımsız, 60 g ort.): ekmek **0,93**, süt 1,06, fındık 1,08, pencere 1,35. Sebep: zincirler pazar sınırlıdır (fırın %45 dolu) ve atıl kapasite aşınmayı emer. Bkz. §5 (karar gerekir).

**Soru 2: A0-11 kâğıtta tutuyor mu?** *Evet, medyanda; iki istisnayla.*

| Ölçüt | Eşik | Kâğıt | Durum |
|---|---|---|---|
| İlk dükkân süresi (kit 3 pencere, ilk 5 yapı indirimi) | ≤ 36 sa | dükkân bitişi 0,6–1,0 sa (kâğıt, gecikmesiz); insan ≈ 1,2 sa (A1 karar 49 dk + 0,4 sa); bot (U(3, 24) sa gecikme) ortalama ≈ 13,9 sa | **tutar** (≥ 10× pay) |
| Dükkân geri ödemesi, medyan | ≤ 48 sa | 22 sa (nüfusla orantılı) / 37 sa (eşit yerleşim); tek ilçe örnekleri 14,8–28 sa (nüfus ≥ 40 bin) | **tutar** |
| İstisna 1: küçük ilçe | ≤ 48 sa | nüfus 20 bin: 86 sa; < 10 bin: hiç (net < 0) | tutmaz |
| İstisna 2: kasabada 3 oyuncu aynı ilçede | ≤ 48 sa | nüfus 40 bin, k = 3: 111 sa | tutmaz |

**Parametre önerileri (en çok 5; ikisi tarif, biri P1 tarifi):**

| # | Parametre | Yön | Etki (kâğıt) | Gerekçe |
|---|---|---|---|---|
| 1 | `celik_dograma` pencere çıktısı (`mulkKipi` yöntemi) | **28 → 30 pencere/sa** | pencere zinciri +27,5% (2.335 → 2.976 ₺/sa), geri ödeme 37,9 → 29,7 sa | pazar kapasitesi 30,3 (NPC 25 + yerel 5,3): 30 kapasiteyi pazara eşitler, doyma riski artmaz; yalnız mülk yöntemi (bölge altınları aynı) |
| 2 | `cam_firini` yakıt girdisi (`mulkKipi`) | **16 → 12 birim/sa** | pencere zinciri +17,7%; #1 ile birlikte **+45,2%** (3.390 ₺/sa, geri ödeme 26,1 sa); cam marjı %12 → ≈ %26 | cam fırını en ince basamak (iç marj %12, uzman %12); yakıt şebekeden 103,5 ₺ ve girdi giderinin %50'si |
| 3 | `findik_bahcesi` çıktısı (P1 tarifi yazılırken) | **80 → ≤ 60 fındık/sa** (+ mevsim/ambar kuralı) | fındık zinciri 7.765 → 6.358 ₺/sa (−18%); 50'de 5.414 | tek baskın zinciri ekmeğe yaklaştırır (ekmek 4.492); tarif henüz yok, sınır koymak ucuz |
| 4 | `yerelOlcek` | **değişmez, 40** | dükkân geri ödemesi 22–37 sa | A0-11 tutuyor; ölçek ↓ geri ödemeyi bozar (35'te 27–46 sa) |
| 5 | `mulk.bakim` (C) | **bu analizden değişiklik önerilmez; karar gerekli (§5)** | bakımlı/bakımsız 0,93–1,35 | tavanı yükseltmek yeni oyuncu korumasını (gün 14 kaybı ≤ %10) bozar |

Değişmeyenler: `kasaPayiPpm` 120.000 (oyuncu net'ini etkilemez, yalnız ödemenin %12'sini kasaya yönlendirir), kamu şebeke tavanı 1,035 R, kit 3 pencere, `ilk_pencere` 8 parça.

## 1. Yöntem ve varsayımlar

- **Kâğıt model**, kararlı hâl akışı (kayan nokta; çekirdek çalışmaz). NPC ihracat ×0,891, ithalat ×1,111 (korumada 1,10), şebeke elektrik 10,35 ₺ ve yakıt 103,5 ₺ (kamu tavanı 1,035 × taban), işletme 60 ₺/sa/tesis, bakım parçası ithal 200 ₺/parça, dükkân gideri 132 ₺/sa, kasa 90 birim/sa, esnaf tabanı %25, yerel kanal `yerelOlcek` 40.
- **Birim maliyet** = (girdi + şebeke enerjisi + bakım parçası + işletme − yan ürün kredisi) / ana çıktı. **İç:** ara girdi fırsat maliyeti (kendi ürettiğini NPC'ye satmama); **ithal:** bütün girdi NPC'den ×1,111 (uzman kademe). Marj = satış / maliyet − 1. **Satış fiyatı aralığı:** NPC denge 0,891 R, doyma 0,625 × 0,891 R (arz = 1,5 × emilim); yerel kademe 0,95 / 1,05 (varsayılan) / 1,15 R (kampanya 0,85 R net eksi, A2 §1.9).
- **Pazar sınırı:** NPC dilimi kişi başı `emilimSaat × max(4, N)/4 ÷ N` (N ≥ 4 ⇒ emilim/4: ekmek 62,5, un 75, tahıl 90, kepek 30, pencere 25, cam 35, süt 50, süt ürünü 32,5, fındık ürünü 25, şekerleme 20 birim/sa). Yerel kanal medyan ilçede ekmek 40 birim/sa/oyuncu, diğer mallar `talep1000Saat` oranıyla (pencere 5,3, süt 13,3, süt ürünü 13,3, şekerleme 4,0, fındık ürünü 2,0). **Zincir toplamı** aşama doluluklarının ızgara aramasıyla en iyi akıştır; eksik girdi NPC'den ithal edilir; yalnız **son ürün ve yan ürün** satılır (G4 S1 ile karşılaştırılabilir); tüm ara mallar da satılırsa sütun ayrıdır.
- **Yatırım** = yapı para + malzeme (ithal) + hücre; ilk 5 yapı %30 indirimli (ekmek, süt, fındık), pencere zinciri indirimsiz (P5, ilk 5 yapı P4'te tüketilmiş). Hücre: yurt 6 ücretsiz, ek hücre kasaba 2.500 ₺, dükkân ticari ×1,45. Dükkân bedeli P-İthal (6.000 ₺ + 20 çelik + 8 parça + 4 pencere), ilk dükkânda kit 3 pencere.
- **Eksik/kapsam dışı:** ilçe nüfusu dağılımı (yalnız temsilî ilçeler), fiyat dinamiği ve doyum (NPC dilimi sabit), toprak ve hasat çarpanı (1,0), kamu siparişi (≤ 5/hafta), işçi (mülk kipinde bağlayıcı değil).

## 2. Basamak kârlılığı (kapasite; S ölçek; ₺ ve ₺/sa)

Tam tablolar hesap çıktısı §1'dedir (10 sütun); burada özet. **Pazar** = NPC dilimi + yerel (birim/sa), **kapasite** = çıktı; kapasite pazarın üstündeyse basamak pazar sınırlıdır.

### 2.1 Ekmek (G4)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış ₺ (denge / doyma) | Marj iç / ithal | Net ₺/sa (iç / ithal) | Pazar ↔ kapasite | Yatırım ₺ | Geri ödeme sa |
|---|---|---|---|---|---|---|---|
| Tarla (tahıl) | 0,8 | 26,7 / 16,7 | ham mal | 5.186 | 90 ↔ 200 | 8.358 | 1,6 (pazar sınırlı) |
| Değirmen (un) | 31,3 / 39,3 | 44,5 / 27,8 | %42 / %13 | 2.190 / 870 | 75 ↔ 165 | 15.316 | 7,0 |
| Fırın (ekmek) | 40,8 / 48,4 | 53,5 / 33,4 (yerel 57,0 / 63,0 / 69,0) | %31 / %11 | 3.034 / 1.219 | 102,5 ↔ 240 | 15.316 | 5,0 |

Yerel 1,05 R'de fırın marjı %54. Fırın doluluğu %45: ekmek kapasitesinin yarısından fazlası pazarda karşılığını bulmaz.

### 2.2 Cam → pencere (G4, P5)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış ₺ (denge / doyma) | Marj iç / ithal | Net ₺/sa (iç / ithal) | Pazar ↔ kapasite | Yatırım ₺ (indirimsiz) | Geri ödeme sa |
|---|---|---|---|---|---|---|---|
| Cam fırını (cam) | 75,4 | 84,6 / 52,9 (yerel 90,3 / 99,8 / 109,2) | %12 / %12 | 463 | 37,7 ↔ 50 | 31.500 | 47,6 |
| Doğrama (pencere) | 261,6 / 285,4 | 320,8 / 200,5 (yerel 342 / 378 / 414) | %23 / %12 | 1.658 / 989 | 30,3 ↔ 28 | 31.500 | 13,3 |

Cam fırını en ince basamak: ithal silis + şebeke yakıt (16 birim, 1.656 ₺/sa) maliyeti ve doyma fiyatında zarara yakın. Doğrama pazarı doyurur (30,3 pazar, 28 kapasite).

### 2.3 Süt (P1; G4: yalnız `sut_kepekli`)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış ₺ (denge / doyma) | Marj iç / ithal | Net ₺/sa (iç / ithal) | Pazar ↔ kapasite | Yatırım ₺ | Geri ödeme sa |
|---|---|---|---|---|---|---|---|
| 2 Ahır (`sut_kepekli` ×2; süt) | 27,4 / 31,5 | 35,6 / 22,3 (yerel 38 / 42 / 46) | %30 / %13 | 1.347 / 687 | 63,3 ↔ 164 | 22.750 | 16,9 |
| Mandıra (`peynir_mandira`; süt ürünü) | 83,4 / 102,8 | 106,9 / 66,8 (yerel 114 / 126 / 138) | %28 / %4 | 1.601 / 281 | 45,8 ↔ 68 | 15.316 | 9,6 |

Eşleşme: 2 ahır (164 süt/sa) 1 mandırayı besler (150); kepek NPC'den ithal (60 × 2 birim/sa), değirmeni olan oyuncu (ekmek) kendi kepeğini (33/sa) kullanır: çapraz zincir.

### 2.4 Fındık (P1; `findik_bahcesi` varsayım)

| Basamak | Birim maliyet iç / ithal ₺ | NPC satış ₺ (denge / doyma) | Marj iç / ithal | Net ₺/sa (iç / ithal) | Pazar ↔ kapasite | Yatırım ₺ | Geri ödeme sa |
|---|---|---|---|---|---|---|---|
| Bahçe (fındık) | 2,0 | 75,7 / 47,3 | ham mal | 5.899 | 45 ↔ 80 | 8.358 | 1,4 (pazar sınırlı) |
| Kavurma (iç) | 171,5 / 208,9 | 213,8 / 133,7 (yerel 228 / 252 / 276) | %25 / %2 | 1.695 / 199 | 27 ↔ 40 | 15.316 | 9,0 |
| Ezme (şekerleme) | 124,8 / 148,3 | 160,4 / 100,2 (yerel 171 / 189 / 207) | %29 / %8 | 3.203 / 1.091 | 24 ↔ 90 | 15.316 | 4,8 |

Ezme doluluğu %30 (şekerleme pazarı 24 birim/sa, kapasite 90); kavurma %100 (iç hem ezmeye hem NPC'ye).

## 3. Zincir toplamı (N = 200; yerelOlcek 40; kademe 1,05 R; NPC denge)

| Zincir | Doluluk (aşama) | Net ₺/sa | Net ₺/gün | Yatırım ₺ | Geri ödeme sa | Tüm ara mal dilimleri satılırsa ₺/sa |
|---|---|---|---|---|---|---|
| Ekmek | tarla %90, değirmen %90, fırın %45 | 4.492 | 107.819 | 49.772 | 11,1 | 8.346 |
| Cam → pencere | cam %100, doğrama %100 | 2.335 | 56.037 | 88.433 | 37,9 | 2.335 |
| Süt | tarla %50, ahır %100, mandıra %70 | 4.933 | 118.385 | 62.206 | 12,6 | 7.338 |
| Fındık | bahçe %100, kavurma %100, ezme %30 | 7.765 | 186.356 | 49.772 | 6,4 | 8.097 |

**Doğrulama (G4 ile):** ekmek zinciri 107.819 ₺/gün, G4/yerel-talep §7 kâğıt modelinin 117.053 ₺/günü ile %8 içinde (fark: bakım parçası 420 ₺/sa ve dilim ızgara adımı). Yatırım kalemleri (ekmek): Tarla 8.358 + değirmen 15.316 + fırın 15.316 + dükkân 10.782 (ticari hücre 3.625 dahil) = 49.772 ₺.

### 3.1 Duyarlılık (net ₺/sa)

| Zincir | N = 200 | N = 4 | N = 1 (tek oyunculu) | NPC doyma ×0,625 | Kademe 0,95 R | Kademe 1,15 R | Yerel kanal yok |
|---|---|---|---|---|---|---|---|
| Ekmek | 4.492 | 4.492 | 10.660 | 3.061 | 4.252 | 4.732 | 2.438 |
| Cam → pencere | 2.335 | 2.335 | 2.335 | **160** | 2.118 | 2.552 | 1.865 |
| Süt | 4.933 | 4.933 | 5.668 | 2.645 | 4.719 | 5.146 | 3.305 |
| Fındık | 7.765 | 7.765 | 10.514 | 4.559 | 7.645 | 7.885 | 6.818 |

- **N < 4 pilot dünyası kâğıttan sapar:** N = 1'de NPC dilimi 4 × büyür (kişi başı emilim/N); ekmek 4.492 → 10.660 ₺/sa. Alfa-0 insan testinde (n ≈ 5) A0-11 ve R sapması bu yüzden okunurken N düşünülmelidir (`alfa0-ekonomi-izleme.md` E1, E3).
- **Pencere zinciri NPC fiyat çöküşüne en kırılgan** (160 ₺/sa): üretim ithal girdiye (silis, çelik, parça) ve şebekeye bağlı, satış tek NPC dilimine.
- **Yerel kanal** zincir net'inin %12–%46'sını taşır (ekmek %46: 2.438 → 4.492; fındık %12). Kademe 0,95 ↔ 1,15 farkı küçüktür (%3–%19): fiyat ayarı zincir kârlılığını değil dükkân payını oynatır.

## 4. A0-11: ilk dükkân ve geri ödeme

### 4.1 İlk dükkân süresi (kâğıt, erken oyun çarpanı %10)

Tarla 0,2 sa, fabrika 0,6 sa (ikinci yuva), dükkân 0,4 sa (yuva Tarla bitince boşalır, kit pencere 3 ≥ 2,8, çelik 120, parça 40 yeter). **Dükkân bitişi 0,6–1,0 sa** (kâğıt, gecikmesiz); raf kit gıdası (200) hemen satar. İnsan: A1 pilotu "kit varsa karar ≈ 49 dk" ⇒ ≈ 1,2 sa. Bot (G7 gecikmesi U(3, 24) sa, %25 ilk 24 sa kurmaz; `bot-kurallari-g6-g8.md` §1.1): ortalama ≈ 13,9 sa. Eşik ≤ 36 sa **tutar**; bağlayıcı olan ekonomi değil karar zamanıdır.

### 4.2 Dükkân geri ödemesi (tek dükkân, fırın, ekmek, 1,05 R, kit 3 pencere)

`s = min(90, pay × Q)`, Q = 60 × nüfus × 40 / 1e6; ek net = s × (1,05 − 0,891) × 60 − 132; pay: k = 1 oyuncu/ilçe 0,561, k = 3 0,25.

| İlçe (nüfus) | Q ekmek birim/sa | s birim/sa | Ek net ₺/sa | Yatırım ₺ (kit 3 pencere; ticari hücre) | Geri ödeme sa | k = 3 oyuncu: s / net / geri ödeme |
|---|---|---|---|---|---|---|
| kırsal 8.000 | 19 | 10,8 | −29 | 8.607 | hiç | 4,8 / −86 / hiç |
| küçük kasaba 20.000 | 48 | 26,9 | 125 | 10.782 | 86,2 | 12,0 / −18 / hiç |
| kasaba 40.000 | 96 | 53,9 | 382 | 10.782 | 28,2 | 24,0 / 97 / 111,2 |
| kasaba 70.000 | 168 | 90,0 | 727 | 10.782 | 14,8 | 42,0 / 269 / 40,1 |
| şehir 120.000 | 288 | 90,0 | 727 | 16.582 | 22,8 | 72,0 / 555 / 29,9 |
| büyük şehir 300.000 | 720 | 90,0 | 727 | 16.582 | 22,8 | 90,0 / 727 / 22,8 |

- **Şehirde geri ödeme kasabadan uzundur** (22,8 ↔ 14,8 sa): ticari hücre 9.425 ₺ (6.500 × 1,45) net'i değil bedeli yükseltir; kasa 90 birim/sa tavanı net'i 727 ₺/sa'te dondurur.
- Medyan (b, `yerelOlcek` 40, 45 ilçe): 37 sa (eşit yerleşim) / 22 sa (nüfusla orantılı); kârlı ilçe 36 / 42 (nüfusu ≥ 30 bin; `yerel-talep-kalibrasyon.md` §4). **Tutmayanlar:** nüfusu < 20 bin ilçeler ve k ≥ 3 dükkânlı kasaba ilçesi.
- **Kit 3 pencere** ilk dükkân yatırımını 11.891 → 10.782 ₺ (−1.109 ₺, −%9) düşürür ve ithalat adımını kaldırır; kasaba (40 bin) geri ödemesi 31,1 → 28,2 sa (−2,9). **`ilk_pencere` ödülü** 8 bakım parçası = 1.440 ₺ taban: pencere zinciri yatırımının %1,6'sı, geri ödemeyi yalnız 0,6 sa kısaltır; asıl işlevi bakım stoğudur (pencere zinciri 2 parça/sa tüketir ⇒ **8 parça ≈ 4 saatlik bakım**; kit 40 parça inşaatta biter, O2 §7).

## 5. Bakım ve aşınma (A3 §5.10: aşınma ×0,5, tavan %25)

Bakımlı: parça ithal (ekmek 420, pencere 400, süt 460, fındık 420 ₺/sa, tüm aşamalar). Bakımsız: parça yok, her aşamada çıktı kaybı (gün 14 %3,5, gün 45 %11,3, gün 70 %17,5; tavan %25 100. günde). Net ₺/sa:

| Zincir | Bakımlı | Bakımsız gün 14 | gün 45 | gün 70 | 60 g ort. | Bakımlı / bakımsız |
|---|---|---|---|---|---|---|
| Ekmek | 4.492 | 4.911 | 4.730 | 4.575 | 4.806 | **0,93** |
| Cam → pencere | 2.335 | 2.272 | 1.248 | 425 | 1.727 | 1,35 |
| Süt | 4.933 | 5.153 | 4.289 | 3.548 | 4.667 | 1,06 |
| Fındık | 7.765 | 7.899 | 6.635 | 5.465 | 7.187 | 1,08 |

**Bulgu.** C'nin hedefi yönetimsiz oyuncuyu yumuşak cezalandırmaktı (H-B5: gün 14 kaybı ≤ %10; bu sağlanıyor). Ama **pazar sınırlı zincirlerde bakım karşılığını vermiyor**: ekmek zincirinde bakımsız 60 gün ortalaması bakımlıdan **%7 daha kârlı**, gün 70'te bile eşit (4.575 ↔ 4.492). Sebep, satışın NPC dilimi (102,5 ekmek/sa) ile sınırlı olması: fırın %45 çalışırken aşınma atıl kapasiteyi yer. Yalnız kapasitesi pazarla dolan zincir (pencere, doğrama 28 ≈ pazar 30,3) bakımdan yararlanır (1,35; gün 70'te 425 ↔ 2.335).

**Aşınma kalibrasyonu varyantları** (bakımlı / bakımsız, 60 g ort.):

| Zincir | C (10.000; %25) | C hızı, tavan %40 | mevcut (20.000; %40) | E (8.000; %25) |
|---|---|---|---|---|
| Ekmek | 0,93 | 0,95 | 1,20 | 0,93 |
| Cam → pencere | 1,35 | 2,01 | 4,10 | 1,21 |
| Süt | 1,06 | 1,19 | 1,70 | 1,02 |
| Fındık | 1,08 | 1,22 | 1,65 | 1,04 |

Tavanı %40'a çıkarmak oranı yükseltir (0,95–2,01) ama **gün 14 kaybını da yükseltir** (k = 3 için %10,1 → ≈ %16; yeni oyuncu koruması H-B5 bozulur). C'nin iki hedefi (yumuşak başlangıç, bakımın değeri) **pazar sınırlı dünyada birlikte sağlanamıyor**; O2'nin Y7 sonucu (bakımlı/bakımsız çiftçi 1,455) pazar sınırı olmadan (botun tüm üretimi satması) ölçülmüştü. **Öneri:** C'yi şimdi değiştirmeyin; K-1/ilk canlı haftada bakımlı/bakımsız farkı **NPC dilimi sınırı altında** (gerçek oyuncu satışıyla) ölçülsün; fark < 1,1 çıkarsa karar baş liderindir: (a) bakım ikincil (genel onarım ucuz ikamedir) kabul, (b) bakıma "kapasite" yerine "kalite/fiyat" bağlamak (tasarım işi). `yuzey_cevher` ve `hidro_santrali` parça ×0,2 bu zincirlerde kullanılmaz (çelik ithal, elektrik şebekeden); etkisi §6'da.

## 6. Şebeke, kasa payı ve isteğe bağlı santral

| Zincir | Elektrik / yakıt birim/sa | Şebeke ödemesi ₺/sa | %12 kasaya ₺/sa | Lavabo `sebeke` ₺/sa | Ödeme / net |
|---|---|---|---|---|---|
| Ekmek | 17,6 / 9,0 | 1.113 | 134 | 980 | %25 |
| Cam → pencere | 33,0 / 16,0 | 1.998 | 240 | 1.758 | **%86** |
| Süt | 17,0 / 0 | 176 | 21 | 155 | %4 |
| Fındık | 9,6 / 5,0 | 617 | 74 | 543 | %8 |

- `kasaPayiPpm` 120.000 (kasa = ⌊ödeme × pay / 1e6⌋, lavabo = kalan) oyuncunun net'ini **değiştirmez**; yalnız ödemenin %12'sini ilçe kasasına yönlendirir. Pencere zinciri şebeke fiyatına en duyarlı: şebeke fiyatı +%10 ⇒ net −%8,6 (−200 ₺/sa); tavandan taban fiyata (1,00 R) inmek +%2,9 (+68 ₺/sa).
- **Hidro santrali** (dağ etiketi): 300 elektrik/sa, bakım 2,0 → 0,4 parça/sa (×0,2), yatırım 33.780 ₺. Ekmek zincirinin elektriği 17,6/sa: tasarruf 182 ₺/sa − bakım 80 ₺/sa = 102 ₺/sa ⇒ **geri ödeme ≈ 332 sa**. Fazla elektrik satılamaz (NPC kaydı yok): santral kâr değil şebeke tasarrufudur, bu yüzden isteğe bağlı kalması doğrudur.

## 7. Sonuç

1. **Zarar eden zincir yok**; zayıf olan cam → pencere (2.335 ₺/sa, geri ödeme 37,9 sa, NPC çöküşünde 160 ₺/sa), göreceli baskın olan fındık → şekerleme (7.765 ₺/sa) ama tarifi ve mevsim varsayımı kesin değil. Ekmek ve süt aynı sınıfta (4.5–4.9 bin ₺/sa).
2. **A0-11 tutuyor**: ilk dükkân kâğıtta ≈ 1 sa (eşik 36), geri ödeme medyanı 22–37 sa (eşik 48); nüfusu < 20 bin ilçeler ve kasabada ≥ 3 dükkân tutmaz.
3. **Kâğıt modelin ana sınırı pazardır**: tüm zincirler NPC dilimi ve yerel kanalla sınırlı çalışır (ekmek fırını %45, ezme %30); bakım bu yüzden etkisizdir.

## 8. Geri dönüşü zor kararlar

| # | Karar | Neden zor | Öneri |
|---|---|---|---|
| Z-1 | `celik_dograma` ve `cam_firini` tarifi (öneri #1, #2) | Yöntem kimliği ve çıktı miktarı yayımlanınca A3 şartnamesi, T3 içeriği, O2 ön ayarları ve bot ölçümleri bağlanır; değer sonradan değişse de her değişiklik ölçüm temel çizgilerini yeniler | P5 kapısından önce tek değer seçilsin (28 ya da 30), ikinci değişiklik yapılmasın |
| Z-2 | `findik_bahcesi` ve fındık/süt tarifleri (P1) | Bu belge varsayım: 80 fındık/sa ve mevsim kuralı yoktur; kimlikler kalıcıdır (00 K11) | Tarif yazılırken çıktı ≤ 60 ve ambar/mevsim kuralı birlikte karar verilsin |
| Z-3 | NPC dilimi (`pazar.emilimSaat`, `max(4, N)/4`) global parametredir | Yeni mallar bölge kipinde de pazar fiyatı hesabına girdiğinden değişirse bölge kipi altınlarının özeti değişebilir; mülk kipi ayrımı gerekir | Dilim değeri bu analizden değiştirilmesin; mülk-yalnız ek parametre gerekirse ayrı karar |
| Z-4 | Bakım C (`mulk.bakim`) | Pazar sınırlı dünyada bakımın değeri ≈ 1: parametreyi sıkılaştırmak yeni oyuncu korumasını bozar, gevşetmek bakımı anlamsız bırakır | Şimdi sabit tut; ilk canlı hafta ölçümü sonrası tek karar |
| Z-5 | `yerelOlcek` 40 ve dükkân bedeli P-İthal (6.000 + 4 pencere) | 40: geri ödeme 22–37 sa, ZP8 %44–52, R 0,24–0,26; kit 3 pencere ilk dükkânı ithalatsız tutuyor | Değiştirme; ölçek yalnız `alfa0-ekonomi-izleme.md` §8.1 sırasıyla |

## 9. Açık sorular ve doğrulanmayanlar

1. Süt ve fındık tarifleri (G4 dışı) ve `findik_bahcesi` (varsayım): P1 yazılana kadar iki kat belirsiz.
2. Hücre fiyatı sınıfı (kasaba 2.500 ₺) varsayılan; şehirde dükkân yatırımı 16.582 ₺ (geri ödeme 22,8 sa), kırsalda 8.607 ₺.
3. NPC fiyat dinamiği (doyum) modelde yok; yalnız iki uç (denge, ×0,625) verildi. Gerçek dünyada oyuncu arzı dilimi aşarsa fiyat çöker (G4: 200 botta ekmek arz/emilim ≈ 2,26).
4. Ekmek zinciri için dört emir yuvası yetmeyebilir (ekmek, un, tahıl, kepek + ithalat emirleri): yuva bağlayıcı ise net 4.492 ile 8.346 arasındadır.
5. Dükkân geri ödemesi ilçe başına oyuncu sayısı k'ye ve ilçenin gerçek nüfusuna bağlıdır; medyan değerleri `yerel-talep-kalibrasyon.md` §4'ten alınmıştır, bu belgenin temsilî ilçeleri tam dağılım değildir.
6. Bakım ölçümü (§5) ve fındık mevsimi canlı veriyle doğrulanmadan sonuç kesin sayılmamalı.
