# P4/P5 içerik verisi taslağı (G4, T3)

> **Durum.** 1 Ekim 2026, Sprint A0-02, G4. Yazar: T3 (oyun içeriği ve denge verisi). Dal: `takim/t3/p4-p5-icerik`, taban `entegrasyon` (d28447d). **Bu belge bir taslaktır; `icerik.json`, `parametreler.json` ve `kimlik-listesi.json` değişmedi.** Veri bloklarının dosyalara girişi G4'ün baş lider onayından ve K3'ün şema dalından sonradır (§9). Belge A3'ün G4 şartnamesine girdidir; A3 değerleri **referansla** alır.
>
> **Karar vermez.** Tesis türü mü yöntem mi, tezgâh, pencere bedeli gibi konularda öneri ve seçenek yazar; karar A3 ve baş liderdedir. Sayılar için A2'nin P4/P5 ekonomi çalışması ana kaynaktır; A2'nin raporu henüz teslim edilmediğinden bu belge A2'nin taslak hesap betiğinin (`SP/wt/a2`, commit'siz) çıktısını **"A2 ön önerisi"** diye okur. Çelişen yerde iki değer yan yana yazılır. A2 ile teyit bekleyen her sayı **(A2 teyit)** ile işaretlidir.
>
> **Kaynaklar.** [dikey-zincirler-ve-perakende](dikey-zincirler-ve-perakende.md) §2.2, §3.1, §3.3, §3.5, §5.2–§5.10, §9.2–§9.4 · [uretim-agi-genisletme](uretim-agi-genisletme.md) §2.4, §3.2, §3.3, §5.2, §7.1–§7.5 · [perakende-kademeleri](perakende-kademeleri.md) §3.2, §3.6, §5.1, §5.2, §12.1 · [kimlik-listesi-v1](kimlik-listesi-v1.md) §0, §1.2, §2.3, §2.4 · docs/06 §15.8, §15.10 · docs/10 §5A · docs/12 §10, §13, §14 · `packages/veri/icerik/{icerik,parametreler,kimlik-listesi}.json` (d28447d) · K3 keşif notu ve A2 taslak betiği (yalnız okundu).

## 0. Birimler ve okuma kılavuzu

- **Kod birimi mili.** Miktar mili-birim/sa, para mili-₺: `tabanFiyat: 50000` = 50 ₺; `girdiler: { tahil: 200000 }` = 200 birim/sa; `isci: 5000` = 5 işçi. Tablolarda ₺ ve birim/sa yazılır; JSON'da mili.
- **Süre.** Üretim **sürekli akıştır** (saatlik tik); yöntemin parti ya da çevrim süresi yoktur. "Süre" sütunu üretimde "sürekli, 1 sa tik", yapıda **inşa süresidir** (`mulk.yapiInsaSaati`; doğrudan M/L kurulumunda ×1,5 / ×2; ilk 24 saatte erken oyun çarpanı ayrıca).
- **S/M/L ölçek çarpanları** (`sanayi.olcekKademeleri`): çıktı, girdi ve elektrik ×1 / 2,2 / 3,6; işçi ×1 / 1,8 / 2,6; bakım ×1 / 2 / 3,2; inşa bedeli ×1 / 2,5 / 4,5. Ayak izi `olcekHucre = [yuva, yuva+1, yuva+2]` (docs/06 §15.10). Yöntem verisi **yalnız S** yazılır; M ve L çalışma zamanında çarpanla türer.
- **Pazar.** NPC ithalat ×1,10 ve komisyon %1 → **1,111 R**; ihracat ×0,90 ve komisyon %1 → **0,891 R**.
- **Aşama etiketleri:** A0, A0-ops, A1 (kimlik-listesi-v1 §0). Bu belgenin kapsamı G6 (ekmek zinciri), G7 (yerel pazar kanalı ve `dukkan` S), G8 (cam → pencere, yapı market).

## 1. Özet ve bulgular

1. **Yeni mal, yeni tesis türü ve yeni dükkân türü kimliği gerekmez.** 24 mal içerikte, `dukkan` ve 13 dükkân türü kimlik listesinde zaten var. Gereken tek yeni kimlik grubu **6 yöntemdir** (`degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli`, `cam_firini`, `celik_dograma`); yöntemler kimlik kilidinin kapsamı dışındadır (kimlik-listesi-v1 §3 madde 4), bu yüzden §2.2'de "yeni kimlik önerisi" diye işaretlenir.
2. **Önerilen yol: yöntem + ev sahibi tesis.** `degirmen` ve `ekmek_firini` → `gida_fabrikasi`; `cam_firini` → `celikhane`; `celik_dograma` → `parca_fabrikasi`; kepek yöntemleri → `ahir`. Seçenek (her biri ayrı tesis türü) §4.1'de, kimlik listesi etkisiyle ayrı sütunlarda. **Seçenek yolun sert bir engeli var:** `icerik.tesisTurleri[]` listenin önekidir ve listede `hafif_sanayi` (A1) 19. sıradadır; A0'da eklenen her yeni tür ya `hafif_sanayi`'yi A0'a çeker ya da listede araya ekleme gerektirir (§4.1).
3. **Elektrik ön koşulu (A2 ile aynı bulgu).** Mülk kipinde işletme düğümünde santral yoksa elektrik girdili her tesis (mevcut `standart_gida_isleme` dahil) **sıfır** üretir (`sanayi/elektrik.ts` `elektrikDagit`: kapasite 0 ⇒ karşılanma 0). Altı yeni yöntemin hepsi elektrik ister. P4 zinciri `santral` (S: 3 hücre, ₺12.000 + 70 çelik + 30 parça) olmadan kurulamaz; bu P4 ilk yatırımını yaklaşık %40 büyütür (§4.4). Yakıt ise mülk kipinde yalnız NPC ithalatıyla gelir (`rafineri` mülk kipinde yapılamaz).
4. **Rapor değerleriyle ekmek zinciri `standart_gida_isleme`'ye yenilir (A2 ile aynı bulgu).** `standart_gida_isleme` oranı 1,84, KD işçi başına 850 ₺'dir (bölge kipi altını; değiştirilemez). Rapor değerleriyle (150 un + 30 kepek; 150 un → 225 ekmek) iki tesisli zincirin net getirisi tek tesisli yolun altındadır (A2: −%6,5). A2 çıktıyı artırmayı önerir (`degirmen` 165 un + 33 kepek; `ekmek_firini` 165 un + 20 yakıt → 250 ekmek; zincir +%31). Bu belge **iki sürümü yan yana** verir; JSON taslakları A2 ön önerisini ana sürüm alır, rapor değerleri §8.4'te yama olarak durur. **Karar baş liderdedir.**
5. **Kepek: iki Ü tüketici.** Baş lider kararı 3 (kepek P0'da iki tüketici) `kepek_gubresi` (A2 ön önerisi) ve `sut_kepekli` (üretim §3.3, Y-37) ile sağlanır; ikisi de `ahir`dedir ve `ova` etiketi ister. Yan ürün kuralı (üretim §2.4 madde 3: Ü ≥ 1 ve N ≥ 1) için `NpcAlici` güvence kaydı ayrıca gerekir; kodda `NpcAlici` yalnız `tur: "kamu"` tanımlıdır (K3 keşfi). T3'ün seçeneği `besi_kepekli` §8.4'tedir.
6. **`ekmek` için ikinci tüketici kamu siparişine bağlıdır.** Raf (H) tek türdür; ikinci tür okul ekmeği siparişi (K; kamu-ve-kamu-arazileri §3 satır 383 ve 499) ve sabit fiyatlı kamu siparişi v0'ın mal listesi henüz yazılı değildir. Öneri: `ekmek`, `gida`, `pencere`, `celik` v0 listesine girsin (§6).
7. **Raf listesi talep demek değildir.** `talep1000Saat` (dikey §5.6) yalnız `gida`, `ekmek`, `sut_urunu`, `sekerleme`, `pencere` için tanımlı. Rafa konan `un`, `sut`, `findik_urunu`, `yakit`, `celik`, `parca`, `cam` için NPC hane talebi yoktur; bu mallar rafta duruyor ama hane satışı sıfırdır (yalnız oyuncu alıcı). A2 karar verecek (§11, soru 10).
8. **Test etkisi (kanıt: geçici birleştirme, sonra geri alındı).** Taslak bloklar bellekte `icerik.json` ve `parametreler.json` ile birleştirildiğinde `dogrulaVeriPaketi`, `dogrulaKimlikKilidi` ve `icerikDerle` geçer; `veri/test`, `sanayi-regresyon`, `pazar-regresyon`, `serilestir-goc`, `mal-kimlik-kilidi-paket` yeşil kalır. Kırılan testler **beklenen** ve K3'ündür: `mulk-yapilar.test.ts:50` (6 ek yapı listesi, `dukkan` eklenince 7) ve `mal-izdusumu-kanit.test.ts` (4 test; 14 mallı izdüşüm içeriği yeni yöntemlerin `un` girdisini bilmiyor: "ekonomi tablosu: bilinmeyen mal: un"). İkincisi `YontemTanimi.mulkKipi?` bayrağının gerekçesidir (§9.1).
9. **Dükkân.** 5 A0 S türü, 13 türün tamamı kimlik listesinde. **Süpermarket 3 hücre** (S4-4, sahip kararı): `olcekHucre [1, 2, 3]`; `[1, 2, 2]` istisnası kapandı. Dükkân bedelindeki 4 `pencere` G7 önyükleme sorunudur; A2 iki seçenek verdi (§4.5).

## 2. Kimlikler

### 2.1 Mallar (yeni kimlik yok)

P4/P5 kapsamındaki mallar `icerik.json`'da, `kimlik-listesi.json`'da ve `parametreler.json` pazar tablolarında **birebir** vardır. Taban fiyatlar listeyle aynıdır (`tabanFiyat` = liste `taban` × 1000; A2'nin denetimi de "fark yok" der).

| Kimlik | Ad | Kategori | Taban ₺ | Bozulma ppm/gün | Loj. | Emilim / arz (birim/sa) | İçerik sırası | Aşama | Kaynak |
|---|---|---|---:|---:|---:|---|---:|---|---|
| `tahil` | Tahıl | ham | 30 | 10.000 | 4 | 360 / 240 | 0 | A0 | mevcut |
| `un` | Un | ara | 50 | 8.000 | 4 | 300 / 200 | 14 | A0 | dikey §9.2 |
| `kepek` | Kepek (yan ürün) | ara | 18 | 6.000 | 4 | 120 / 80 | 23 | A0 | üretim §3.2; Y-37 |
| `ekmek` | Ekmek | tüketim | 60 | 250.000 | 1 | 250 / 160 | 15 | A0 | dikey §9.2 |
| `silis` | Silis | ham | 25 | 2.000 | 6 | 240 / 100 | 6 | A0 | mevcut |
| `cam` | Cam | ara | 95 | 2.000 | 5 | 140 / 90 | 16 | A0 | dikey §9.2 |
| `celik` | Çelik | ara | 120 | 2.000 | 5 | 300 / 260 | 4 | A0 | mevcut |
| `parca` | Makine Parçası | ara | 180 | 2.000 | 5 | 200 / 170 | 7 | A0 | mevcut |
| `pencere` | Pencere | tüketim | 360 | 2.000 | 5 | 100 / 60 | 17 | A0 | dikey §9.2 |
| `yakit` | Yakıt | ara | 100 | 5.000 | 2 | 300 / 260 | 10 | A0 | mevcut |
| `elektrik` | Elektrik | enerji (depolanamaz) | 10 | 0 | 8 | yok | 13 | A0 | mevcut |
| `gubre` | Gübre | ara | 140 | 1.000 | 4 | 200 / 150 | 12 | A0 | mevcut |
| `sut` | Süt | ham | 40 | 80.000 | 1 | 200 / 130 | 18 | A0 | dikey §9.2 |
| `gida`, `sut_urunu`, `sekerleme`, `findik_urunu` | dükkân rafı malları | | 70 / 120 / 180 / 240 | | | | 1 / 19 / 22 / 21 | A0 | mevcut |

Mal kimlikleri yeni yöntemlerin girdi ve çıktı kimlikleridir; hiçbiri mal listesine yeni eleman eklemez. `elektrik` depolanamaz olduğundan ticarete konu olamaz (`ekonomi/komut.ts`): elektrik yalnız aynı işletme düğümündeki santralden gelir.

### 2.2 Yeni kimlik önerileri

| Tür | Kimlik | Önerilen sıra | Aşama | Kaynak | Kimlik-listesi.json etkisi |
|---|---|---:|---|---|---|
| **yeni kimlik önerisi: yöntem** | `degirmen` | `yontemler[24]` | G6 | dikey §3.1; üretim §3.3 | etkisiz (yöntem kilidin dışında); ayrı yöntem kimlik listesi önerisi aşağıda |
| yeni kimlik önerisi: yöntem | `ekmek_firini` | `yontemler[25]` | G6 | dikey §3.1 | aynı |
| yeni kimlik önerisi: yöntem | `kepek_gubresi` | `yontemler[26]` | G6 | A2 ön önerisi | aynı |
| yeni kimlik önerisi: yöntem | `sut_kepekli` | `yontemler[27]` | G6 (Y-37 P0) | üretim §3.3, §9.1 A0-2 | aynı |
| yeni kimlik önerisi: yöntem | `cam_firini` | `yontemler[28]` | G8 | dikey §3.3 | aynı |
| yeni kimlik önerisi: yöntem | `celik_dograma` | `yontemler[29]` | G8 | dikey §3.4, §3.5 | aynı |
| mal | yok | | | | etkisiz |
| tesis türü (önerilen yol) | yok | | | | etkisiz |
| ek yapı | `dukkan` (zaten listede, A0) | | G7 | kimlik-listesi-v1 §2.3 | etkisiz |
| dükkân türü | 13 tür zaten listede; A0 verisine 5'i girer | | | kimlik-listesi-v1 §2.4 | etkisiz |

- **Sıra gerekçesi.** `yontemler[]` bugün 24 elemanlıdır (0–23: `geleneksel_tarim` … `sulama_pompasi`). Yeni yöntemler G adımlarının sırasıyla eklenir; K3 her adımda kendi parçasını ekler (G6: 4, G8: 2). Kararlı sıra `icerik-kimlik-kilidi.json` yalnız-ekle denetimini besler.
- **Ad alanı denetimi.** Altı yöntem kimliği `mallar[]`, `tesisTurleri[]`, `mulk.ekYapilar` ve 13 dükkân türü kimliğiyle **çakışmaz** (betikle denetlendi). `firin` (dükkân türü) ile `ekmek_firini` (yöntem) ayrı kimliklerdir.
- **Yöntem kimlik listesi ihtiyacı.** Yöntemlerin hangi tesiste doğduğu geri dönüşü zor bir karardır (üretim §7.4); kilit yalnız mal ve tesis türü içindir. Öneri: kimlik-listesi-v1 §3 madde 4 için `yontem-kimlik-listesi` (id, ev sahibi tür, aşama, sıra). Bu belgenin §2.2 ve §4.2 tabloları o listenin ilk taslağıdır.
- **Teknoloji kimliği gerekmez.** Altı yöntemin hiçbiri `gerekliTeknoloji` istemez (kilit yok, seçim var). `elektroliz` yalnız A0-ops alüminyum yolunun işidir ve bu belgenin dışındadır.

## 3. Yöntemler ve tarifler

### 3.1 Tarif tablosu (S ölçek, birim/sa; süre: sürekli akış)

Ana sürüm: **A2 ön önerisi** (`degirmen` ve `ekmek_firini` için). Rapor değerleri §3.2'de yan yanadır.

| Kimlik | Ad | Ev sahibi tesis | Girdi (birim/sa) | Çıktı (birim/sa) | İşçi | Bakım (parça/sa) | Kirlilik ppm/sa | Kaynak (§) | Aşama |
|---|---|---|---|---|---:|---:|---:|---|---|
| `degirmen` | Değirmen | `gida_fabrikasi` | 200 tahıl + 12 elektrik | **165 un + 33 kepek** | 5 | 0,8 | 20 | dikey §3.1; üretim §3.3, §7.2; A2 ön önerisi | G6 |
| `ekmek_firini` | Ekmek Fırını | `gida_fabrikasi` | **165 un + 20 yakıt + 15 elektrik** | **250 ekmek** | 8 | 0,8 | 20 | dikey §3.1; A2 ön önerisi | G6 |
| `kepek_gubresi` | Kepek Gübresi | `ahir` | 100 kepek + 5 elektrik | 18 gübre | 3 | 0,5 | 10 | A2 ön önerisi (yeni; rapor yok) | G6 |
| `sut_kepekli` | Kepekli Süt Çiftliği | `ahir` | 50 tahıl + 60 kepek + 5 elektrik | 82 süt + 4 gübre | 5 | 0,5 | 10 | üretim §3.3, §4.1 H1 | G6 (Y-37 P0) |
| `cam_firini` | Cam Fırını | `celikhane` | 60 silis + 18 yakıt + 20 elektrik | 50 cam | 5 | 1,0 | 60 | dikey §3.3 | G8 |
| `celik_dograma` | Çelik Doğrama | `parca_fabrikasi` | 24 çelik + 32 cam + 6 parça + 15 elektrik | 27 pencere | 7 | 1,0 | 20 | dikey §3.4, §3.5 | G8 |

**3.1b Yöntem × yapı özeti** (ev sahibi tesis verisi §4.2'den; ₺ + malzeme S ölçek, mülk kipi)

| Kimlik | Ad | Yuva ve ayak izi `[y, y+1, y+2]` | Maliyet (S) | İnşa süresi (S) | Çıktı taban ₺ | Kaynak (§) | Aşama |
|---|---|---|---|---:|---|---|---|
| `degirmen` | Değirmen | 2: [2, 3, 4] (`gida_fabrikasi`) | ₺10.000 + 60 çelik + 20 parça | 6 sa | un 50, kepek 18 | dikey §3.1, §9.3; üretim §7.5 | G6 |
| `ekmek_firini` | Ekmek Fırını | 2: [2, 3, 4] (`gida_fabrikasi`) | ₺10.000 + 60 çelik + 20 parça | 6 sa | ekmek 60 | dikey §3.1, §9.3 | G6 |
| `kepek_gubresi` | Kepek Gübresi | 2: [2, 3, 4] (`ahir`) | ₺8.000 + 40 çelik + 15 parça | 4 sa | gübre 140 | A2 ön önerisi | G6 |
| `sut_kepekli` | Kepekli Süt Çiftliği | 2: [2, 3, 4] (`ahir`) | ₺8.000 + 40 çelik + 15 parça | 4 sa | süt 40, gübre 140 | üretim §3.3, §7.4 | G6 |
| `cam_firini` | Cam Fırını | 3: [3, 4, 5] (`celikhane`) | ₺20.000 + 100 çelik + 40 parça | 10 sa | cam 95 | dikey §3.3, §9.3 | G8 |
| `celik_dograma` | Çelik Doğrama | 2: [2, 3, 4] (`parca_fabrikasi`) | ₺15.000 + 80 çelik + 30 parça | 8 sa | pencere 360 | dikey §3.4, §3.5, §9.3 | G8 |
| (ek yapı) `dukkan` | Dükkân | 1: [1, 2, 3] | ₺6.000 + 20 çelik + 8 parça + 4 pencere | 4 sa | (satış; §5) | dikey §5.2, §5.10; perakende §3.2, §3.6 | G7 |

- **Enerji.** Her yöntem elektrik ister. `ekmek_firini` ve `cam_firini` ayrıca **yakıt** ister (fırın); yakıt mülk kipinde yalnız ithalatla gelir. Elektriksiz seçenek (A2 "Y": elektrik e → yakıt e/10, değer eşit) A2'nin hesabındadır; bu belge onu ana sürüm yapmaz.
- **S6 kuralı** (≤ 3 girdi çeşidi, elektrik ve yakıt hariç; ≤ 3 çıktı satırı) hepsinde sağlanır; en kalabalığı `celik_dograma` (çelik, cam, parça).
- **Eşleşme (S).** 1 Tarla (200 tahıl) → 1 `degirmen` (165 un, 33 kepek) → 1 `ekmek_firini` (165 un): **1:1:1**. 1 `degirmen` (33 kepek/sa) `kepek_gubresi`'ni (100/sa) üçte bir, `sut_kepekli`'yi (60/sa) yarı doyurur; kepek stoğu birikir ve NPC pazarına (80 birim/sa arz) gider. 1 `cam_firini` (50 cam) 1,56 `celik_dograma` besler (32 cam/sa); dikey §3.4 "2,5 hat/fırın" çelik tarafıdır (yüksek fırın 60 çelik/sa ÷ 24).
- **`kepek_gubresi` Tarla bağı.** 18 gübre/sa, `tarim.gubreTuketimiSaat` = 4/sa/Tarla ile 4,5 Tarla'yı besler; `sut_kepekli` 4 gübre/sa = 1 Tarla.
- **Bayat ekmek → kepek %30 döngüsü** G6'ya **alınmadı** (K3: `bolgeOranlariUygula` bozulma kuralına dokunur; üretim §4.2 isteğe bağlı döngü).

### 3.2 Katma değer sınaması (betik; taban fiyat; ₺/sa)

Betik `SP/t3/hesap.ts`: girdi ve çıktı değeri taban fiyattır, elektrik 10 ₺. "Oran" = çıktı değeri ÷ girdi değeri (hedef bant 1,15–1,5; dikey §2.2). "Net" = KD − bakım parçası (×180 ₺) − işletme gideri (60 ₺/sa). "Makas altı" = ithal edilebilen girdiler ×1,111, elektrik taban, çıktı ×0,891 ile **tek halka** kârı; 0'ın üstü, halkanın makasa rağmen pozitif kaldığını gösterir.

| Yöntem | Sürüm | Girdi ₺ | Çıktı ₺ | Oran | KD | KD/işçi | Net | Makas altı tek halka |
|---|---|---:|---:|---:|---:|---:|---:|---:|
| `degirmen` | **A2 ön önerisi** | 6.120 | 8.844 | 1,45 | 2.724 | 545 | 2.520 | +1.094 |
| `degirmen` | rapor (150 + 30) | 6.120 | 8.040 | 1,31 | 1.920 | 384 | 1.716 | +378 |
| `ekmek_firini` | **A2 ön önerisi** | 10.400 | 15.000 | 1,44 | 4.600 | 575 | 4.396 | +1.827 |
| `ekmek_firini` | rapor (150 → 225) | 9.850 | 13.500 | 1,37 | 3.650 | 456 | 3.446 | +1.102 |
| `kepek_gubresi` | A2 ön önerisi | 1.850 | 2.520 | 1,36 | 670 | 223 | 520 | +196 |
| `sut_kepekli` | rapor = A2 | 2.630 | 3.840 | 1,46 | 1.210 | 242 | 1.060 | +505 |
| `cam_firini` | rapor = A2 | 3.500 | 4.750 | 1,36 | 1.250 | 250 | 1.010 | +366 |
| `celik_dograma` | rapor = A2 | 7.150 | 9.720 | 1,36 | 2.570 | 367 | 2.330 | +734 |
| (referans) `standart_gida_isleme` | mevcut | 6.100 | 11.200 | 1,84 | 5.100 | 850 | 4.896 | +3.213 |
| (referans) `ahir_besi` | mevcut | 3.600 | 6.580 | 1,83 | 2.980 | 596 | 2.830 | +1.863 |
| (referans) `standart_parca` | mevcut | 5.920 | 7.200 | 1,22 | 1.280 | 233 | 1.040 | −149 |
| (referans) `yuksek_firin` | mevcut | 5.250 | 7.200 | 1,37 | 1.950 | 279 | 1.620 | +610 |

Okuma:
1. **Katma değer > 0 hepsinde** (oran 1,31–1,46; makas altı tek halka kârı pozitif). Hepsi 1,15–1,5 bandındadır. KD/işçi 223–575; `degirmen` ve `ekmek_firini` A2 ön önerisinde hedefin (250–400) üstüne çıkar (545, 575); rapor değerlerinde 384 ve 456'dır. İşçi mülk kipinde bağlayıcı değildir (A2: `kalanIsci` sınırsız), bu yüzden bu bir uyarıdır, engel değildir.
2. **Zincir ↔ tek tesis.** Tahıl başına net (taban fiyat; elektrik 10 ₺, yakıt 100 ₺; bakım ve işletme hariç): tek tesis `standart_gida_isleme` ≈ 25,5 ₺; rapor değerleriyle zincir ≈ 27,9 ₺ (+%9). A2'nin ithalat (yakıt ×1,111), bakım ve işletme (2 tesis) dahil hesabında ise rapor değerli zincir tek tesisin altındadır (−%6,5, A2 §2.3); A2 ön önerisinde +%31'dir. **Rapor değerleri iki tesisli zinciri tek tesisli yolun gölgesinde bırakıyor; A2 ön önerisi bunu düzeltiyor.** Bu bir denge kararıdır (§11 soru 4), kimlik kararı değil.
3. `standart_parca` makas altı tek halka −149 ₺'dir: mevcut yöntemler de aynı koşulda negatif olabilir; yeni yöntemler bundan iyidir.

### 3.3 Ölçek türevleri (M ve L; A2 ön önerisi değerleriyle)

Çıktı, girdi ve elektrik ×2,2 / ×3,6; işçi ×1,8 / ×2,6; bakım ×2 / ×3,2; kirlilik çıktıyla (doğrusal). Çalışma zamanında türer; JSON'a yazılmaz.

| Yöntem | M (İmalathane) | L (Fabrika) |
|---|---|---|
| `degirmen` | 440 tahıl + 26,4 elektrik → 363 un + 72,6 kepek; işçi 9; bakım 1,6; kirlilik 44 | 720 tahıl + 43,2 elektrik → 594 un + 118,8 kepek; işçi 13; bakım 2,56; kirlilik 72 |
| `ekmek_firini` | 363 un + 44 yakıt + 33 elektrik → 550 ekmek; işçi 14,4; bakım 1,6 | 594 un + 72 yakıt + 54 elektrik → 900 ekmek; işçi 20,8; bakım 2,56 |
| `kepek_gubresi` | 220 kepek + 11 elektrik → 39,6 gübre; işçi 5,4 | 360 kepek + 18 elektrik → 64,8 gübre; işçi 7,8 |
| `sut_kepekli` | 110 tahıl + 132 kepek + 11 elektrik → 180,4 süt + 8,8 gübre; işçi 9 | 180 tahıl + 216 kepek + 18 elektrik → 295,2 süt + 14,4 gübre; işçi 13 |
| `cam_firini` | 132 silis + 39,6 yakıt + 44 elektrik → 110 cam; işçi 9; kirlilik 132 | 216 silis + 64,8 yakıt + 72 elektrik → 180 cam; işçi 13; kirlilik 216 |
| `celik_dograma` | 52,8 çelik + 70,4 cam + 13,2 parça + 33 elektrik → 59,4 pencere; işçi 12,6 | 86,4 çelik + 115,2 cam + 21,6 parça + 54 elektrik → 97,2 pencere; işçi 18,2 |

Bina adları (arayüz metni; T1 metin tablosuna girdi, `icerik.json`'a girmez): `degirmen` Değirmen Atölyesi → Un İmalathanesi → Un Fabrikası (üretim §7.2); `ekmek_firini` Fırın Atölyesi → Fırın İmalathanesi → Ekmek Fabrikası; `cam_firini` Cam Atölyesi → Cam İmalathanesi → Cam Fabrikası; `celik_dograma` Doğrama Atölyesi → Doğrama İmalathanesi → Doğrama Fabrikası. Ad bir boyutu anlatır, seviyeyi değil.

### 3.4 Enerji ön koşulu: elektrik ve yakıt

| Girdi | Kaynak (mülk kipi) | S ölçek toplam talep | Sonuç |
|---|---|---|---|
| `elektrik` | yalnız aynı işletme düğümünde `santral`/`hidro_santrali` (depolanamaz, taşınamaz) | P4 (değirmen 12 + fırın 15) = 27/sa; + ahır 5; P5 (cam 20 + doğrama 15) = 35/sa | santral yoksa 0 üretim; bir S `komur_santrali` 240/sa verir (60 kömür); bir santral tüm zinciri besler |
| `yakit` | yalnız NPC ithalatı (`rafineri` mülk kipinde yapılamaz) | fırın 20/sa; cam fırını 18/sa | sürekli ithalat gideri (A2: yakıt ithalatı P4 gün 1 gideri ≈ 49–56 bin ₺ ile en büyük kalemdir) |

Bu bulgu A2 §3.2 ile aynıdır ve T3'ün buna dair önerisi yoktur; onboarding (G9) ve bot zinciri (G10) için **santral zincirin parçasıdır**. A2'nin 0–48 saat senaryosu bu yüzden E (santralli) ve Y (elektriksiz) olmak üzere iki varyant verir.

## 4. Tesis ve yapı verisi

### 4.1 Yöntem mi, tesis türü mü (karar A3'te; T3 karar vermez)

| | **Önerilen yol: yöntem + ev sahibi tesis** | **Seçenek: ayrı tesis türü** |
|---|---|---|
| Kimlikler | 6 yöntem (`degirmen` … `celik_dograma`) | 4 tür: `degirmen`, `ekmek_firini`, `cam_ocagi`, `pencere_atolyesi` (yöntem kimlikleri ayrılır: örn. `unlama`, `ekmek_pisirme`, `cam_eritme`, `celik_dograma`) |
| `yontemler[]` (icerik) | +6 sona | +6 sona (yine yöntem gerekir) |
| `tesisTurleri[]` (icerik) | değişmez; 4 ev sahibinin `yontemler` listesi sona uzar | +4 sona |
| `yapiYuva`, `olcekHucre`, `yapiInsaSaati` | değişmez (ev sahibinin değerleri) | her yeni tür için 3 satır (zorunlu: doğrulayıcı "her yapiYuva türünün satırı var") |
| `kimlik-listesi.json` (ayrı sütun) | etkisiz | `yapilar.tesisTurleri` sonuna +4; **ama listede 19. sırada `hafif_sanayi` (A1) var**: içerik önek kuralı gereği ya `hafif_sanayi` A0'a çekilir (19. ve 20. yapı kararı) ya da liste `hafif_sanayi`'den önce araya eklenir ("yalnız sona" ilkesi) |
| `kimlik-listesi-v1.md` sayımı | etkisiz | §2.3 sayım notu: yapı sayısı 18 → 22 (+ `dukkan`, `hafif_sanayi` ile 24); S-4 "≤ 19 yapı" bütçesi aşılır |
| Bölge kipi | yöntemler `mulkKipi` bayrağıyla süzülür (§9.1); tesis türleri değişmez | yeni türler bölge kipi `tesisTurleri` dizisine girer; süzme ayrı mekanizma ister |
| Bot ve istemci tabloları | `yontemler[0]` varsayılanı korunur; `ureticiTurler` yöntemle genişler | palet, bot `tur` tablosu, istemci yapı listesi, `HARITA_KOMUTLARI` genişler |
| Oyuncu akışı | "Gıda fabrikası kur" ardından `yontem_degistir` (bedelsiz, anlık); yapı kurulunca varsayılan `yontemler[0]` = `standart_gida_isleme` | "Değirmen kur": tek adım |
| Yapı adı | yöntemden gelir (üretim §7.1) | tür adı |
| Dezavantaj | `gida_fabrikasi` 3 → 5 yöntem, tüm Alfa-1 sonrası 18 (üretim §7.4, K-7: "kalabalık"); iki adımlı kurulum | yapı sayısı bütçesi, kilit önek sorunu, 4 yeni palet öğesi |

**T3 önerisi ve gerekçesi (karar değil):** yöntem + ev sahibi.
1. Üç onaylı rapor aynı yönde: "çıktı/girdi kümesi değişiyorsa yöntem" (dikey §2.3 ilke 2), "mandıra, mezbaha, tabakhane ayrı yapı değil, yöntemden gelen bina adı" (üretim §7.1), yerleşim tablosu `gida_fabrikasi` ← `degirmen`, `ekmek_firini`; `celikhane` ← `cam_firini`; `parca_fabrikasi` ← `celik_dograma` (dikey §9.3, üretim §7.4).
2. Seçenek yolun kimlik kilidi engeli yukarıdaki tabloda: önek kuralı yüzünden ucuz değildir.
3. K3 keşfi de aynı sonuca varır ve tür yolunun `yapiYuva`, `olcekHucre`, `yapiInsaSaati`, kimlik listesi, bot ve istemci tablolarını kaydırdığını belirtir.
4. Kurulum UX'i çözülebilir: `yapi_yerlestir`'e isteğe bağlı bir `yontem` alanı (protokolde yalnız ekleme) ya da istemcide "yapı kurulunca yöntem seç" adımı (§11 soru 2).

**Ev sahibi gerekçeleri:**

| Yöntem | Ev sahibi | Gerekçe | Alternatif ve farkı |
|---|---|---|---|
| `degirmen`, `ekmek_firini` | `gida_fabrikasi` | Aynı tür `standart_gida_isleme` (tahıl → gıda) ile aynı işi genelleştirir; etiket ve rezerv şartı yok (her ilde kurulur); S 2 hücre ₺10.000, 6 sa | `ciftlik` (ova etiketi, tarım) uygun değil: işleme değil üretim |
| `kepek_gubresi`, `sut_kepekli` | `ahir` | Gübre ve süt ahır ürünüdür; `ahir_besi` ile aynı ailede (kepek hayvan yemi); `ova` etiketi şartı bölgesel kimlik verir | `gida_fabrikasi` (etiket yok): ama yem tüketimi hayvancılıktır |
| `cam_firini` | `celikhane` | Fırın ailesi (yüksek fırın, ark): yüksek ısı, kirlilik 60 (araya düşer); dikey §9.3 ve üretim §7.4 kararı; display "Fırın ve Metalurji" | `parca_fabrikasi`: S **₺5.000 + 20 çelik + 10 parça daha ucuz, 1 hücre ve 2 sa daha az** (₺30.000 ↔ ₺39.200 taban değer). P5'in girişini ucuzlatır; ama cam ile doğrama aynı türe düşer ve "ağır fırın" ailesi bozulur (karar A3/baş lider) |
| `celik_dograma` | `parca_fabrikasi` | Doğrama montajdır; parça ailesi (dikey §9.3; üretim §7.4); S 2 hücre ₺15.000, 8 sa | `hafif_sanayi` (A1): henüz yok |

### 4.2 Ev sahibi tesis türü verisi (S / M / L)

Değerler mevcut `icerik.json` ve `parametreler.json`'dandır (**değişmez**); ölçek bedelleri `olcekKademeleri.insaPpm` ×1 / 2,5 / 4,5 (aşağı yuvarlanır), süre `yapiInsaSaati` × 1 / 1,5 / 2, hücre `olcekHucre`.

| Tesis türü | `yapiYuva` | `olcekHucre` [S, M, L] | Para ₺ (S / M / L) | Çelik (S / M / L) | Parça (S / M / L) | Süre sa (S / M / L) | Taban değer S | `gerekliEtiket` / rezerv | Barındırdığı yeni yöntem |
|---|---:|---|---|---|---|---|---:|---|---|
| `gida_fabrikasi` | 2 | [2, 3, 4] | 10.000 / 25.000 / 45.000 | 60 / 150 / 270 | 20 / 50 / 90 | 6 / 9 / 12 | 20.800 | yok / yok | `degirmen`, `ekmek_firini` |
| `ahir` | 2 | [2, 3, 4] | 8.000 / 20.000 / 36.000 | 40 / 100 / 180 | 15 / 37 / 67 | 4 / 6 / 8 | 15.500 | `ova` / yok | `kepek_gubresi`, `sut_kepekli` |
| `celikhane` | 3 | [3, 4, 5] | 20.000 / 50.000 / 90.000 | 100 / 250 / 450 | 40 / 100 / 180 | 10 / 15 / 20 | 39.200 | yok / yok | `cam_firini` |
| `parca_fabrikasi` | 2 | [2, 3, 4] | 15.000 / 37.500 / 67.500 | 80 / 200 / 360 | 30 / 75 / 135 | 8 / 12 / 16 | 30.000 | yok / yok | `celik_dograma` |
| (ilgili) `santral` | 3 | [3, 4, 5] | 12.000 / 30.000 / 54.000 | 70 / 175 / 315 | 30 / 75 / 135 | 10 / 15 / 20 | 25.800 | yok / yok | elektrik ön koşulu |
| (ilgili) `silis_ocagi` | 2 | [2, 3, 4] | 6.000 / 15.000 / 27.000 | 30 / 75 / 135 | 10 / 25 / 45 | 6 / 9 / 12 | 11.400 | yok / `silis` | cam girdisi (A2 senaryosu silisi ithal alır) |

Not: `ahir` mülk kipi inşa süresi 4 sa (`yapiInsaSaati`), bölge kipi `insaSuresiSaat` 6 sa. İlk 5 yapıda %30 indirim ölçekten bağımsız sabit tutardır (docs/06 §15.10).

**Seçenek yolun veri satırları (yalnız karşılaştırma; JSON'a girmez):** tür `degirmen` ve `ekmek_firini` için `yapiYuva` 2, `olcekHucre` [2, 3, 4], ₺10.000 + 60 çelik + 20 parça, 6 sa (ev sahibiyle aynı); `cam_ocagi` için `celikhane` değerleri (3, [3, 4, 5], ₺20.000 + 100/40, 10 sa) ya da `parca_fabrikasi` değerleri; `pencere_atolyesi` için `parca_fabrikasi` değerleri. Farklılaştırma (örn. değirmeni ucuzlatmak) A2'nin işidir.

### 4.3 Kurulabildiği yerler (ilçe ve arsa koşulları)

Kilit yok, seçim var (docs/12 §13): ilçe gelişim seviyesi (Köy/Kasaba/Merkez/Şehir) hiçbir yapıyı açmaz ya da kapatmaz; yalnız talep `Q`, çeşit çekimi ve ruhsat kotası üzerinden ekonomik etki yaratır. Kodda bugün **yalnız** arsa sınıfı (`kirsal`, `kasaba`, `sehir`: fiyat sınıfı), il etiketi ve rezerv koşulu vardır; **arsa kullanım türü (imar) ve izin matrisi kodda yoktur** (arsa-ve-insa §7.1: A0 işi; K3 Soru 5).

| Bina | Arsa sınıfı (kodda) | İl etiketi / rezerv (kodda) | Kullanım türü izni (imar matrisi geldiğinde; arsa-ve-insa §2.2) | Öneri: ekonomik tercih (kilit değil) |
|---|---|---|---|---|
| `gida_fabrikasi` (değirmen, fırın) | kırsal, kasaba, şehir (üçü de) | yok | Sanayi ✓; Tarla/Bahçe ○ (S, ada başı 1); Kıyı ○; Ticari ✗; Konut ✗ | kırsal/kasaba (ucuz arsa); il içi taşıma bedava, hammadde Tarla'ya yakın |
| `ahir` (kepek yöntemleri) | üçü de | **`ova`** | Tarla ✓ | ova ilçesi; Tarla ve değirmenle aynı il |
| `celikhane` (cam fırını) | üçü de | yok (silis girdisi ithal olabilir) | Sanayi ✓; Orman ○ (yalnız mühimmat) | silis ocağı olan ya da liman ili; kirlilik 60 (komşu hassas yapı) |
| `parca_fabrikasi` (doğrama) | üçü de | yok | Sanayi ✓; Ticari ○ (S, zanaat atölyesi) | cam fırınına ve çelik kaynağına yakın |
| `santral` (ön koşul) | üçü de | yok | Sanayi ✓ | yakıt/kömür ithalatı |
| `dukkan` (tüm türler) | üçü de (hücre fiyatı sınıfa göre: ₺1.000 / 2.500 / 6.500, artımlı) | yok | Ticari ✓; Konut ○ (`firin`, `bakkal`); Sanayi ○ (`yapi_market`, ana yol cephesi); Kıyı ○ (`sekerci`, `bakkal`); Tarla/Bahçe/Orman ✗ | kasaba ve şehir (talep nüfusa bağlıdır; dikey §5.2'nin "Köy: yalnız `firin`, `bakkal`" şartı docs/12 §13 ile geçersizdir) |

Dükkân için A0'da arsa şartı yoktur (kullanım türü kodda olmayana kadar). `arsaIzin` alanı (§8.2) veri olarak şimdiden yazılır; çekirdek onu imar matrisi gelince okur.

### 4.4 Zincir yatırımı (S ölçek, taban fiyat; hesap `SP/t3/hesap.ts`)

| Zincir | Yapılar | Hücre | Para ₺ | Çelik / parça / pencere | Taban değer ₺ | Ardışık süre sa |
|---|---|---:|---:|---|---:|---:|
| P4 çekirdek | Tarla + 2 Gıda fabrikası + dükkân | 7 | 32.000 | 170 / 58 / 4 | 64.280 | 18 |
| P4 + santral | + `santral` | 10 | 44.000 | 240 / 88 / 4 | 90.080 | 28 |
| + kepek ahırı | + `ahir` (kepek → gübre) | +2 | +8.000 | +40 / +15 | +15.500 | +4 |
| P5 çekirdek | silis ocağı + `celikhane` (cam) + `parca_fabrikasi` (doğrama) + `dukkan` (yapı market) | 8 | 47.000 | 230 / 88 / 4 | 91.880 | 28 |
| P5 + çelik kolu | + cevher + kömür + `celikhane` (yüksek fırın) | 15 | 85.000 | 420 / 163 / 4 | 166.180 | 50 |

Yeni oyuncu: hibe ₺50.000, kit 120 çelik + 40 parça + 200 gıda, 6 hücre bedava yurt, ilk 5 yapıda %30 indirim, eşzamanlı inşaat 2. P4 + santralin taban değeri (₺90.080) hibeyi **aşar**; indirim, kit gıdasının satışı ve ithal malzeme ile kurulabilir mi, A2'nin saatlik senaryosu gösterir (A2 §7.2, santralli varyant: nakit en düşük ≈ 30,6 bin ₺, t = 3 sa; ilk 5 yapı Tarla, santral, değirmen, fırın, dükkân). Bu belge kalibrasyon yapmaz.

### 4.5 `dukkan` ek yapısı

| Alan | Değer | Kaynak |
|---|---|---|
| `yuva` (`yapiYuva` karşılığı) | 1 | dikey §5.2; kimlik-listesi-v1 §2.3 |
| `olcekHucre` [S, M, L] | [1, 2, 3] (ek yapıda `mulk.olcekHucre`'ye değil `mulk.perakende.olcek.olcekHucre`'ye yazılır; çünkü doğrulayıcı `olcekHucre` satırlarını `yapiYuva` türleriyle eşler) | perakende §3.6; docs/12 §13 |
| Bedel S | ₺6.000 + 20 çelik + 8 parça + **4 pencere** | dikey §5.10 |
| Bedel M / L (A1) | ₺15.000 / 27.000; 50 / 90 çelik; 20 / 36 parça; 10 / 18 pencere | ×2,5 / ×4,5 |
| Süre (S / M / L) | 4 / 6 / 8 sa | `yapiInsaSaati` 4 × 1 / 1,5 / 2 |
| `enFazlaIlBasina` | 6 (ilçe başına ≤ 2: `mulk.perakende.ilceBasinaEnFazla`) | dikey §5.2 |
| Taban değer S | **11.280 ₺** (pencere 360 ₺); yalnız pencere NPC'den ithal alınırsa **11.440 ₺** (perakende §3.2); çelik, parça ve pencerenin hepsi ithal fiyatla **11.866 ₺** (A2 §3) | A2 §3; perakende §3.2 |
| Arsa | 1 hücre (S); ticari hücre ≈ ×1,3–1,6 taban | dikey §5.2 |

**G7 önyükleme sorunu: dükkân bedelindeki pencere.** Pencere zinciri G8'de gelir; G7'de dükkân pencereyi ithal almak zorundadır. A2 iki seçenek verir (A3 seçecek):

| Seçenek | Veri | İlk dükkân nakit (indirimsiz) | Ek koşul |
|---|---|---|---|
| **P-İthal** (taslak ana sürüm) | `insaParasi` 6.000.000; `insaMaliyeti` {çelik 20.000, parça 8.000, **pencere 4.000**} | ₺6.000 + ₺1.600 pencere ithalatı + 20 çelik + 8 parça | `pencere` pazar kaydı var (emilim 100 / arz 60); ithalat emri 1 emir yuvası ve ≈ 1 sa ister |
| P-Yok | `insaParasi` 7.440.000; `insaMaliyeti` {çelik 20.000, parça 8.000} (pencere G8'de eklenir) | ₺7.440 + 20 çelik + 8 parça | ithalat emri gerekmez; G8'de `insaMaliyeti.pencere` eklemek yalnız veri değişikliğidir, mevcut dükkânlar ödenmiş kalır |

Üçüncü seçenek (T3): yeni oyuncu `baslangicStok`'una 4 `pencere` eklemek. Mülk kipi yeni oyuncu altınlarını (`mulk-yeni-oyuncu`) etkiler; önerilmez, yalnız A3'e bilgi.

## 5. Dükkân türleri (`mulk.perakende.dukkanTurleri[]`)

### 5.1 A0 S türleri

Hepsi **tür = veri**, ayrı kod yolu yok (dikey §5.1 B seçeneği). Kimlikler `kimlik-listesi.json` `dukkanTurleri`'nde var; mal listeleri `mallar[]`'a ve NPC pazar kaydına referanstır (perakende §12.1 doğrulayıcı kuralı 1: pazar kaydı olmayan mal rafa konamaz).

| Kimlik | Ad | Aile | Ölçek (A0 / A1 hedefi) | Raf mal listesi (A0) | `tamCesit` (A0 etkin ↔ rapor) | Talep kalemi | Arsa izni | Kaynak |
|---|---|---|---|---|---|---|---|---|
| `bakkal` | Bakkal | çeşit | S / S → `market` | `gida`, `ekmek`, `un`, `sut`, `sut_urunu`, `sekerleme`, `findik_urunu`, `yakit` | 6 ↔ 6 | K1 | ticari ✓, konut ✓ | perakende §3.2, §5.1; dikey §5.3 |
| `firin` | Fırın | üretici | S / S–M | `ekmek`, `gida` | 2 ↔ 2 | K1 | ticari ✓, konut ✓ | dikey §5.3; perakende §5.1 |
| `sarkuteri` | Şarküteri | üretici | S / S–M | `sut`, `sut_urunu`, `gida` | **3 ↔ 4** (`et`, `zeytinyagi` A0'da yok) | K1 | ticari ✓ | perakende §5.1 |
| `sekerci` | Şekerci | üretici | S / S | `sekerleme`, `findik_urunu` | **2 ↔ 3** (`kuru_meyve` yok) | K1 | ticari ✓ | perakende §5.1 |
| `yapi_market` | Yapı Market | çeşit | S / S–L | `pencere`, `celik`, `parca`, `cam` | **4 ↔ 5** (`cimento` A0-ops, `kereste` yok) | K2 | ticari ✓, sanayi ○ (ana yol cephesi) | perakende §5.1, §5.2 |

- **`tamCesit` A0'da mal sayısına çekilir (A2 teyit).** Rapor değerleri (4, 3, 5) A1 mal listesini varsayar; A0'da mal olmayan `et`, `zeytinyagi`, `kuru_meyve`, `cimento` raf listesinde bulunamaz (pazar kaydı şartı). `tamCesit` > mal sayısı olursa çeşitlilik hiçbir zaman 1'e ulaşmaz. `tamCesit` bir parametredir: A1'de mal gelince artırılır (kolay geri dönüşlü; kimlik değil).
- **Raf mal listeleri iç içe değil, tür başınadır.** Bakkal listesi 8 mal, S raf yuvası 4: oyuncu hangi 4 malı koyacağını seçer (üretim §5.4: "bilinçli seçim"). `tamCesit` 6, S'de çeşitlilik en çok 4/6 = 0,67 verir; perakende §3.3 betiğinin bakkal çeşidi 0,7'dir (tutarlı).
- **Ölçek başına sayılar** (`olcek` bloğu, tüm türler için ortak): raf yuvası 4 / 6 / 8; kasa 90 / 198 / 324 birim/sa; işletme gideri ₺132 / 204 / ≈330 saat; çekim çarpanı 1,0 / 1,6 / 2,4 (A1'de kullanılır, A0 yok sayar); `olcekHucre` [1, 2, 3]. Kaynak perakende §3.2; A2 gider kalemini ve `giderMiliSaat` = [132000, 204000, 330000] önerisini onaylar (A2 §5.3).
- **Açık saatler** (bakkal 06:00–24:00, fırın 05:30–20:00) ve tabela/vitrin **sunumdur** (T1/T2); çekirdek verisine girmez.

### 5.2 Raf grupları ve mal × kanal denetimi (A0'ın 24 malı, P4/P5 ile ilgili kısım)

Kanallar: **Raf** (dükkân türü), **Ü** (üretim yöntemi girdisi), **K** (kamu siparişi), **Y** (yapı maliyeti), **O** (ordu ikmali), **P** (NPC pazar; piyasa yapıcı), **N** (`NpcAlici` güvence). Raf listeleri perakende §5.2 matrisiyle uyumludur (`cam`, `un`, `sut`, `findik_urunu` rafa eklenmişti; burada A0 ile sınırlandı).

| Mal | Raf (tür) | Ü (yöntem) | K | Y | O | P | Sonuç |
|---|---|---|---|---|---|---|---|
| `un` | `bakkal` | `ekmek_firini` (A1: makarna, hamur işi, bisküvi) | | | | ✓ | Ü + H = 2 tür; tamam |
| `ekmek` | `firin`, `bakkal` | yok | okul ekmeği (öneri) | | | ✓ | H + K(planlı) = 2 tür; **K'ya bağlı** |
| `kepek` | yok (ham yan ürün) | `kepek_gubresi`, `sut_kepekli` | | | | ✓ | Ü ×2 (1 tür); yan ürün kuralı için N güvence (A0-4) bekler |
| `cam` | `yapi_market` | `celik_dograma` | | | | ✓ | Ü + H = 2 tür; tamam |
| `pencere` | `yapi_market` | yok | onarım (öneri) | `dukkan` | | ✓ | H + Y = 2 tür; tamam (+K planlı) |
| `sut` | `bakkal`, `sarkuteri` | yok (P1: `peynir_mandira`) | okul gıdası (öneri) | | | ✓ | H; **Ü P1'e kalır** (G4 dışı) |
| `gubre` | yok (ham ara) | Tarla gübre dozu (tarım sistemi) | | | | ✓ | Ü ×1; N güvence (A0-4) bekler; mevcut mal |
| `silis`, `celik`, `parca`, `yakit`, `elektrik` | `celik`, `parca`: `yapi_market`; `yakit`: `bakkal` | yeni yöntemlerle tüketici sayısı artar | `celik`, `parca`: yol malzemesi | `celik`, `parca` | `celik`, `parca`, `yakit` | ✓ | mevcut; çıkmaz değil |

**Hâlâ rafsız, perakende çıkışsız:** `elektronik` ve `gubre` (perakende §5.2: pazar çıkışı var, perakende çıkışı sonraya), `kepek`. Bunlar P4/P5 kapsamında değildir.

### 5.3 A1: `market` ve `supermarket` (taslak; A0 içeriğine girmez)

| Alan | `market` (M) | `supermarket` (L) |
|---|---|---|
| `olcekAraligi` | M | L |
| `olcekHucre` | **2 bitişik hücre** | **3 bağlı hücre (S4-4, sahip kararı)**; `[1, 2, 2]` istisnası kapandı |
| Arsa | ticari ✓, konut ✗ | ticari ✓ + **cadde/ana yol cephesi**; sanayi ○ ana yol |
| Raf yuvası / `tamCesit` | 6 / 9 | 8 / 12 |
| Kasa, gider, çekim | 198 birim/sa, ₺204/sa, ×1,6 | 324 birim/sa, ≈₺330/sa, ×2,4 |
| Bedel (yapı) | ×2,5 (₺15.000 + 50 çelik + 20 parça + 10 pencere) | ×4,5 (₺27.000 + 90 çelik + 36 parça + 18 pencere) |
| Süre | 6 sa | 8 sa |
| Ruhsat | yok | N14 kartı ve kota (A1) |
| Mal listesi (A1 hedefi) | bakkal ⊂ + `zeytinyagi`, `kuru_meyve`, `bal`, `cay` | market ⊂ + `kagit`, `bakliyat`, `hazir_giyim`, `elektronik` (küçük raf) |
| Yükseltme | `yukseltmeHedefi`: `supermarket` | yok |

Mal listesinin gelecek kimlikleri (`zeytinyagi`, `kuru_meyve`, `bal`, `cay`, `kagit`, `bakliyat`) `kimlik-listesi.json`'da "ileride"dir; rafa konmaları için **önce mal olmaları** gerekir. Bugün mevcut olanlar yalnız `hazir_giyim` (A1 mal) ve `elektronik` (A0 mal; perakende çıkışsız açığı bu raf kapatır). `bakkal` → `market` → `supermarket` yükseltme zinciri (`yukseltmeHedefi`) A1 verisinde yazılır; A0'da hedef tür yok, alan da yok. Yükseltmenin çekirdek tarafı ayrıdır: ek yapılar bugün ölçeklenemez (`olcek > 0` reddedilir, docs/06 §15.10); `dukkan_yukselt` A1 komutudur.

### 5.4 `tezgah` (K0, açık karar)

`tezgah` (Açılış Tezgâhı; perakende §3.2 K0) kimlik listesinde A0'dır ama **"P1 ya da A1" kararı açık**. Taslak verisi: kamu pazar yeri yuvası (hücre yok); raf yuvası 2; kasa 20 birim/sa; çekim çarpanı 0,6; mal listesi "oyuncunun seçimi" (≤ 2); parasız, anında, hesap başına bir kez (ilk 14 gün); gider ₺0 (izin ₺30/hafta). Çekirdekte kamu pazar yeri hücresine yerleşim ve "oyuncu seçimi mal listesi" mekaniği yoktur. Bu yüzden bloğu **JSON'a girmez**; karar sonrası §8.4'teki iskelet kullanılır.

## 6. Çıkmaz mal denetimi (UA1) ve tüketici sayısı

Kural (üretim §2.4): her mal en az iki **farklı tür** tüketiciye sahip; yan ürün için Ü ≥ 1 ve N ≥ 1. P (NPC pazar) kural metninde tür değildir; A2 onu ayrı sütun sayar. Aşağıdaki tablo katı sayımı (P hariç) ve A2'nin sayımını (P dahil) yan yana verir.

| Mal | Ü | H (raf) | K | Y | O | N | Tür, kodda olanlarla (P hariç) | Tür, planlılarla (P hariç) | Tür, A2 sayımı (P dahil) | Sonuç |
|---|---|---|---|---|---|---|---:|---:|---:|---|
| `un` | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 3 | tamam |
| `ekmek` | 0 | 2 dükkân türü (1 tür) | planlı | 0 | 0 | 0 | 1 | 2 | 3 | **K'ya bağlı** (kamu siparişi v0 mal listesi) |
| `kepek` | 2 yöntem (1 tür) | 0 | 0 | 0 | 0 | planlı | 1 | 2 | 3 | Ü ×2 ile baş lider kararı 3 sağlanır; yan ürün kuralı (Ü ≥ 1 ve N ≥ 1) N güvence kaydı ister |
| `cam` | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 4 | tamam |
| `pencere` | 0 | 1 | planlı | 1 (`dukkan`) | 0 | 0 | 2 | 3 | 4 | tamam |
| `sut` | 0 (P1) | 2 dükkân türü (1 tür) | planlı | 0 | 0 | 0 | 1 | 1 (+Ü P1'de 2) | 2 (P1 ile 3) | **G4 dışı:** Ü `peynir_mandira` P1'de |
| `gubre` | 1 (Tarla gübre dozu) | 0 | 0 | 0 | 0 | planlı | 1 | 2 | 3 | mevcut mal; N güvence kaydı bekler |

"Planlı" kodda olmayan tüketicidir (kamu siparişi v0, `NpcAlici` güvence). "Tür" sayımında aynı türden birden çok tüketici (örn. iki dükkân türü) tek sayılır.

- **K kamu siparişleri (A3/A1 için T3 önerisi):** sabit fiyatlı kamu siparişi v0'ın mal listesine `ekmek` (okul ekmeği), `gida`, `pencere` (okul/muhtarlık onarımı), `celik` ve `parca` (yol malzemesi) girmesi. Tavan ithalat paritesinin altındadır (A2: uygulanan 1,035 R, GDD'deki 1,10 R üst sınırdır).
- **Mevcut mallar** (14 + 24 yeni): yeni yöntemler `tahil`, `silis`, `celik`, `parca`, `yakit`, `elektrik`, `gubre` için tüketici ya da üretici ekler; hiçbirinde tüketici sayısı azalmaz. Betik `hesap.ts` sonundaki matrisi (24 satır) verir; Ü sayıları `icerik.json` + yeni yöntemler, H sayıları 5 A0 dükkân türünün raf listeleridir.
- **P4/P5 dışı boşluklar (bilgi):** `findik` (Ü yok, H yok; P1 zinciri `findik_kavurma`), `findik_urunu`, `sekerleme`, `sut_urunu` (yalnız raf; Ü P1 yöntemleriyle gelir). Bunlar G4 kapsamında değildir ama "çıkmaz mal yok" kuralı A0'da hâlâ ihlal edilir; P1 zincirleri (süt → şarküteri, fındık → şekerleme) gelene kadar uyarı olarak izlenmeli (UA1 derleme uyarısı, üretim §9.1 A0-3).
- **Bayat ekmek:** ekmek bozulması %30 kepek döngüsü G6 dışıdır (§3.1); eklenirse `kepek`e bir **üretici** ekler, tüketici değil.

## 7. Taban fiyatlar ve sayılar: A2 uyumu

### 7.1 Taban fiyatlar

`un` 50, `ekmek` 60, `cam` 95, `pencere` 360, `kepek` 18, `sut` 40: `icerik.json` = `kimlik-listesi.json` × 1000 (A2 §0.1 ve T3 denetimi: 24 malda fark yok). **Değişiklik önerisi yok.**

### 7.2 Yan yana tablo: rapor ↔ A2 ön önerisi ↔ T3 taslağı

| Konu | Rapor (dikey, üretim, perakende) | A2 ön önerisi (taslak betik) | T3 taslağı | Not |
|---|---|---|---|---|
| `degirmen` çıktı | 150 un + 30 kepek | **165 un + 33 kepek** | A2 değeri | A2 teyit; karar baş lider |
| `ekmek_firini` | 150 un + 22 yakıt + 15 elektrik → 225 ekmek | **165 un + 20 yakıt + 15 elektrik → 250 ekmek** | A2 değeri | A2 teyit; karar baş lider |
| `kepek_gubresi` | yok | 100 kepek + 5 elektrik → 18 gübre | A2 değeri | yeni yöntem; T3 seçeneği `besi_kepekli` §8.4 |
| `sut_kepekli` | 50 tahıl + 60 kepek + 5 elektrik → 82 süt + 4 gübre | aynı | aynı | Y-37 P0 |
| `cam_firini` | 60 silis + 18 yakıt + 20 elektrik → 50 cam | aynı | aynı | |
| `celik_dograma` | 24 çelik + 32 cam + 6 parça + 15 elektrik → 27 pencere | aynı | aynı | |
| işçi, bakım, kirlilik | tablolar | aynı | aynı | `isci` 5/8/3/5/5/7; bakım 800/800/500/500/1000/1000; kirlilik 20/20/10/10/60/20 |
| Dükkân S bedeli | ₺6.000 + 20 çelik + 8 parça + 4 pencere | + P-Yok seçeneği ₺7.440 | P-İthal (ana) | A3 seçecek |
| Dükkân gider ₺/sa | 132 / 204 / ≈330 | `giderMiliSaat` [132000, 204000, 330000] | aynı | A2 §5.3 |
| Kasa, raf yuvası | 90 / 198 / 324; 4 / 6 / 8 | aynı | aynı | |
| `talep1000Saat` | `gida` 120, `ekmek` 60, `sut_urunu` 20, `sekerleme` 6, `pencere` 8 | aynı (A2 §5, §6) | aynı | `un`, `sut`, `findik_urunu`, `yakit`, `celik`, `parca`, `cam` yok (§11 soru 10) |
| `yerelOlcek` | 50 (kalibre değil) | 50 | 50 | A2 teyit |
| Fiyat bandı, esnaf tabanı | [0,7; 1,4] R; %25; esnaf fiyatı 1,12 R | aynı | aynı | |
| Kamu tavanı | GDD: ≤ 1,10 R | uygulanan 1,035 R (docs/06 §15.7 madde 5) | referans | yalnız kamu siparişi için |

### 7.3 A2'nin dükkân S ekonomisi (referans; hesap A2'nindir)

A2 §5.1: fırın dükkânı (1,05 R, çeşit 0,5): ilçede tek oyuncu iken net ₺/sa: 5 bin nüfus −52; 20 bin +189; 50 bin +671; 100 bin ve üstü +727 (kasa dolu). A2 §5.2: aynı ilçede 3 dükkâna kadar dükkân başına net 583–727, 5 dükkânda 297; geri ödeme 16–40 sa. Perakende raporu (§3.3): rakipli ilçede bakkal net ₺490–717/sa, geri ödeme 16–23 sa. Hedefler A0-11/A0-12 (ilk dükkân medyan ≤ 36 sa, geri ödeme ≤ 48 sa, prim 1,05–1,20) A2 raporunda doğrulanır.

## 8. JSON taslak blokları

Dosyalara **yazılmadı.** Ana sürüm A2 ön önerisidir (A2 teyit). Bloklar `icerik.json` ve `parametreler.json` biçimindedir; K3 şema dalı gelince (§9) T3 değer dalında dosyalara işlenir. Geçerlilik kanıtı §12'dedir.

### 8.1 `icerik.json`: `yontemler[]` sonuna eklenecekler

Sıra kalıcıdır (`yontemler[24]` … `[29]`). Adım adım: G6 ilk dördü, G8 son ikiyi ekler.

```json
{ "id": "degirmen", "ad": "Değirmen",
  "girdiler": { "tahil": 200000, "elektrik": 12000 }, "ciktilar": { "un": 165000, "kepek": 33000 }, "isci": 5000,
  "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20 },
{ "id": "ekmek_firini", "ad": "Ekmek Fırını",
  "girdiler": { "un": 165000, "yakit": 20000, "elektrik": 15000 }, "ciktilar": { "ekmek": 250000 }, "isci": 8000,
  "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20 },
{ "id": "kepek_gubresi", "ad": "Kepek Gübresi",
  "girdiler": { "kepek": 100000, "elektrik": 5000 }, "ciktilar": { "gubre": 18000 }, "isci": 3000,
  "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10 },
{ "id": "sut_kepekli", "ad": "Kepekli Süt Çiftliği",
  "girdiler": { "tahil": 50000, "kepek": 60000, "elektrik": 5000 }, "ciktilar": { "sut": 82000, "gubre": 4000 }, "isci": 5000,
  "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10 },
{ "id": "cam_firini", "ad": "Cam Fırını",
  "girdiler": { "silis": 60000, "yakit": 18000, "elektrik": 20000 }, "ciktilar": { "cam": 50000 }, "isci": 5000,
  "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 60 },
{ "id": "celik_dograma", "ad": "Çelik Doğrama",
  "girdiler": { "celik": 24000, "cam": 32000, "parca": 6000, "elektrik": 15000 }, "ciktilar": { "pencere": 27000 }, "isci": 7000,
  "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 20 }
```

### 8.2 `icerik.json`: `tesisTurleri[].yontemler` listelerinin sonuna eklenecekler

Mevcut ilk eleman (varsayılan yöntem, `yontemler[0]`) **değişmez**; yalnız sona eklenir.

```json
"gida_fabrikasi":  ["standart_gida_isleme", "degirmen", "ekmek_firini"],
"ahir":            ["ahir_besi", "kepek_gubresi", "sut_kepekli"],
"celikhane":       ["yuksek_firin", "elektrik_ark", "cam_firini"],
"parca_fabrikasi": ["standart_parca", "otomatik_hat", "celik_dograma"]
```

### 8.3 `parametreler.json`

**(a) `mulk.ekYapilar.dukkan`:** mevcut `mulkEkYapiSema` ile uyumlu (yeni alan yok).

```json
"dukkan": {
  "ad": "Dükkân", "yuva": 1, "insaSaati": 4, "insaParasi": 6000000,
  "insaMaliyeti": { "celik": 20000, "parca": 8000, "pencere": 4000 },
  "enFazlaIlBasina": 6
}
```

**(b) `mulk.perakende`:** yeni blok; şema K3'ten sonra (§9.2). Alan adları perakende §12.1 ve dikey §5.10'a uyar.

```json
"perakende": {
  "surum": 1,
  "fiyatBandiPpm": [700000, 1400000],
  "fiyatDegisimEnAzSaat": 6,
  "gunlukFiyatDegisimEnFazla": 4,
  "ilceBasinaEnFazla": 2,
  "olcek": {
    "olcekHucre": [1, 2, 3],
    "rafYuvasi": [4, 6, 8],
    "kasaMiliSaat": [90000, 198000, 324000],
    "giderMiliSaat": [132000, 204000, 330000],
    "cekimCarpaniPpm": [1000000, 1600000, 2400000]
  },
  "talep1000Saat": { "gida": 120, "ekmek": 60, "sut_urunu": 20, "sekerleme": 6, "pencere": 8 },
  "dukkanTurleri": [
    { "id": "bakkal", "ad": "Bakkal", "aile": "cesit", "tamCesit": 6,
      "mallar": ["gida", "ekmek", "un", "sut", "sut_urunu", "sekerleme", "findik_urunu", "yakit"],
      "talepKalemi": "K1", "olcekAraligi": ["S"],
      "arsaIzin": { "ticari": true, "konut": true, "sanayi": false, "cadde": false } },
    { "id": "firin", "ad": "Fırın", "aile": "uretici", "tamCesit": 2,
      "mallar": ["ekmek", "gida"],
      "talepKalemi": "K1", "olcekAraligi": ["S"],
      "arsaIzin": { "ticari": true, "konut": true, "sanayi": false, "cadde": false } },
    { "id": "sarkuteri", "ad": "Şarküteri", "aile": "uretici", "tamCesit": 3,
      "mallar": ["sut", "sut_urunu", "gida"],
      "talepKalemi": "K1", "olcekAraligi": ["S"],
      "arsaIzin": { "ticari": true, "konut": false, "sanayi": false, "cadde": false } },
    { "id": "sekerci", "ad": "Şekerci", "aile": "uretici", "tamCesit": 2,
      "mallar": ["sekerleme", "findik_urunu"],
      "talepKalemi": "K1", "olcekAraligi": ["S"],
      "arsaIzin": { "ticari": true, "konut": false, "sanayi": false, "cadde": false } },
    { "id": "yapi_market", "ad": "Yapı Market", "aile": "cesit", "tamCesit": 4,
      "mallar": ["pencere", "celik", "parca", "cam"],
      "talepKalemi": "K2", "olcekAraligi": ["S"],
      "arsaIzin": { "ticari": true, "konut": false, "sanayi": true, "cadde": false } }
  ]
}
```

`olcekAraligi` A0'da `["S"]`'dir: `firin` ve `yapi_market`'in A1 hedefi (S–M ve S–L) A1 sürümünde genişler. `sarkuteri`, `sekerci` ve `yapi_market` `tamCesit` değerleri A0 etkin değerleridir (§5.1).

**(c) `mulk.yerelPazar`:** G7 yerel pazar kanalı; **K3 `param.mulk.yerelPazar` yoksa özelliği kapalı tutar** (bölge kipinde bit-exact no-op). Değerler ilk tahmindir, kalibre değildir (A2 teyit); kaynaklar canlı-dünya §3.4, §4.1, §4.2 ve dikey §5.5, §5.6.

```json
"yerelPazar": {
  "surum": 1,
  "yerelOlcek": 50,
  "esnafTabaniPpm": 250000,
  "esnafFiyatPpm": 1120000,
  "esneklikPpm": { "k1": 300000, "k2": 800000 },
  "cekimUssu": 2,
  "cesitKatsayiPpm": 250000,
  "vitrinTavaniPpm": 100000,
  "nufusEmaGun": 14,
  "talepCarpaniAralikPpm": [600000, 1500000]
}
```

### 8.4 Seçenek ve karar bekleyen bloklar (ana sürüme girmez)

**(a) Rapor değerleri yaması** (A2 ön önerisi yerine rapor değerleri seçilirse `degirmen` ve `ekmek_firini` satırları):

```json
{ "id": "degirmen", "ad": "Değirmen",
  "girdiler": { "tahil": 200000, "elektrik": 12000 }, "ciktilar": { "un": 150000, "kepek": 30000 }, "isci": 5000,
  "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20 },
{ "id": "ekmek_firini", "ad": "Ekmek Fırını",
  "girdiler": { "un": 150000, "yakit": 22000, "elektrik": 15000 }, "ciktilar": { "ekmek": 225000 }, "isci": 8000,
  "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20 }
```

**(b) P-Yok dükkân bedeli:**

```json
"dukkan": { "ad": "Dükkân", "yuva": 1, "insaSaati": 4, "insaParasi": 7440000,
  "insaMaliyeti": { "celik": 20000, "parca": 8000 }, "enFazlaIlBasina": 6 }
```

**(c) T3 seçeneği: `besi_kepekli` (ikinci kepek tüketicisi `kepek_gubresi` yerine).** Oran 1,77 (`ahir_besi` 1,83'e yakın), KD/işçi 432. Bir Ü tüketici daha, para musluğu açmaz; ama `gida` çıkışını ve `ahir_besi`'nin üstünlüğünü pekiştirir. A2 `kepek_gubresi`'ni seçtiği için seçenek olarak durur.

```json
{ "id": "besi_kepekli", "ad": "Kepekli Besi",
  "girdiler": { "tahil": 50000, "kepek": 70000, "elektrik": 5000 }, "ciktilar": { "gida": 55000, "gubre": 8000 }, "isci": 5000,
  "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10 }
```

**(d) `sut_sigirciligi` (G4 dışı; süt zinciri P1; kısa yol):** 90 tahıl + 5 elektrik → 85 süt + 4 gübre, işçi 6, bakım 500, kirlilik 10 (oran 1,44).

**(e) `tezgah` iskeleti (karar sonrası; JSON bloğuna girmez):**

```json
{ "id": "tezgah", "ad": "Açılış Tezgâhı", "aile": "tezgah", "tamCesit": 2, "mallar": [],
  "talepKalemi": "K1", "olcekAraligi": [], "hucre": 0,
  "rafYuvasi": 2, "kasaMiliSaat": 20000, "cekimCarpaniPpm": 600000, "giderMiliSaat": 0 }
```

**(f) A1 `market` ve `supermarket` (A1 verisi; A0'a girmez):**

```json
{ "id": "market", "ad": "Market", "aile": "cesit", "tamCesit": 9, "talepKalemi": "K1",
  "olcekAraligi": ["M"], "yukseltmeHedefi": "supermarket",
  "arsaIzin": { "ticari": true, "konut": false, "sanayi": false, "cadde": false } },
{ "id": "supermarket", "ad": "Süpermarket", "aile": "cesit", "tamCesit": 12, "talepKalemi": "K1",
  "olcekAraligi": ["L"], "olcekHucre": [1, 2, 3], "ruhsat": true,
  "arsaIzin": { "ticari": true, "konut": false, "sanayi": true, "cadde": true } }
```

(`mallar` listeleri A1'de mal kimlikleri geldiğinde yazılır, §5.3.) Süpermarket `olcekHucre` sahip kararıyla 3 hücredir.

## 9. K3 için şema ve bayrak girdileri

Sınır (K3 keşfi ve Tasarım lideri): K3 `packages/veri/src/**` ve testlerini yazar; T3 `icerik.json`, `parametreler.json` **değerlerini** ve `kimlik-listesi.json`'u yazar. `sema.ts` `.strict()` olduğundan yeni alanlar önce K3'ün dalında isteğe bağlı olarak açılır, T3 değer dalı onun üstüne gelir.

### 9.1 G6: `YontemTanimi.mulkKipi?`

| Yöntem | `mulkKipi` | Gerekçe |
|---|---|---|
| `degirmen` | `true` | bölge kipi altınları ve botlar etkilenmesin |
| `ekmek_firini` | `true` | aynı |
| `kepek_gubresi` | `true` | aynı |
| `sut_kepekli` | `true` | aynı |
| `cam_firini` | `true` | aynı |
| `celik_dograma` | `true` | aynı |

Kanıt (T3 deneyi): yöntemler yalnız `icerik.json`'a eklenince (bayraksız) `mal-izdusumu-kanit.test.ts` 4 test kırılır: 14 mallı izdüşüm içeriği yeni yöntemlerin `un` girdisini tanımıyor ("ekonomi tablosu: bilinmeyen mal: un"). Ayrıca `botlar/src/tablo.ts` `ureticiTurler` tablosu tüm `tur.yontemler`'i tarar, bölge botlarının yeni yönteme geçmesi bayrakla önlenir. Bayrak, `icerikDerle`'nin parsel fikstürü yoksa (bölge kipi) bu yöntemleri tür listesinden **süzmesi** demektir (indeksler sabit kalır; K3 keşfi §1). Varsayılan yöntem `yontemler[0]` olduğundan süzülen listede de ilk eleman değişmez.

### 9.2 G7: `mulk.perakende` ve `mulk.yerelPazar`

| Blok | Alan | Değer | Kaynak | A2 teyit |
|---|---|---|---|---|
| `perakende` | `surum` | 1 | G8 sürümleme (dikey §9.4) | |
| | `fiyatBandiPpm` | [700000, 1400000] | dikey §5.5 | |
| | `fiyatDegisimEnAzSaat`, `gunlukFiyatDegisimEnFazla` | 6, 4 | dikey §5.5 | |
| | `ilceBasinaEnFazla` | 2 (`dukkan.enFazlaIlBasina` 6) | dikey §5.2 | |
| | `olcek.olcekHucre` | [1, 2, 3] | perakende §3.6; S4-4 | |
| | `olcek.rafYuvasi` | [4, 6, 8] | dikey §5.4 | |
| | `olcek.kasaMiliSaat` | [90000, 198000, 324000] | dikey §5.4 | |
| | `olcek.giderMiliSaat` | [132000, 204000, 330000] | perakende §3.2; A2 §5.3 | evet |
| | `olcek.cekimCarpaniPpm` | [1000000, 1600000, 2400000] | perakende §3.4 (A1) | evet |
| | `talep1000Saat` | gida 120, ekmek 60, sut_urunu 20, sekerleme 6, pencere 8 | dikey §5.6 | evet |
| | `dukkanTurleri[]` | 5 A0 türü (§8.3b) | §5 | |
| `yerelPazar` | `yerelOlcek` | 50 | canlı-dünya §3.4 | evet |
| | `esnafTabaniPpm`, `esnafFiyatPpm` | 250000, 1120000 | canlı-dünya §4.2 | |
| | `esneklikPpm.k1/k2` | 300000, 800000 | canlı-dünya §3.4 | evet |
| | `cekimUssu`, `cesitKatsayiPpm`, `vitrinTavaniPpm` | 2, 250000, 100000 | dikey §5.6 | |
| | `nufusEmaGun`, `talepCarpaniAralikPpm` | 14, [600000, 1500000] | canlı-dünya §3.2, §3.4 | |

**Doğrulayıcı kuralları (K3; perakende §12.1):** `mallar[]` kimlikleri `mallar[]`'da var **ve** pazar kaydı (emilim/arz) var (betikte denendi: 5 türün 12 farklı rafı geçer); `tamCesit` ≤ `mallar` sayısı (A0 verisinde sağlanır); tür kimlikleri mal kimlikleriyle kesişmez; `dogrulaKimlikKilidi` `param.mulk.perakende.dukkanTurleri` kimliklerini kimlik listesi `dukkanTurleri` ile denetlemelidir (bugün bağlı değil; kimlik-listesi.ts `KimlikKilidiGirdisi.dukkanTurleri` alanı hazır). `mulkEkYapiSema` `dukkan` için yeni alan istemez.

**Eksik kaynak: ilçe nüfusu.** `yerelPazar` talep modeli ilçe nüfusu ister; mülk kipinde işletme düğümü ve fikstür nüfus taşımaz (K3 keşfi §0.4, soru 6). Seçenekler: fikstüre ilçe nüfus alanı (O3; TÜİK ADNKS ilçe nüfusu ya da WorldPop), ya da `seviye × uygunHucre`'den türetilen parametre. Alfa-0 verisi: Bursa 3.263.011, Kocaeli 2.161.171, Sakarya 1.123.693 (ilçe başı ortalama ≈ 145 bin; canlı-dünya §3.1). Bu belge değer önermez.

### 9.3 Test etkisi (K3 listesi; T3 deneyinin bulguları)

| Test | Neden kırılır | Beklenen düzeltme |
|---|---|---|
| `cekirdek/test/mulk-yapilar.test.ts:50` | "6 ek yapı" listesi `dukkan` ile 7 olur | beklenen liste ve açıklama güncellenir (G7) |
| `cekirdek/test/mal-izdusumu-kanit.test.ts` (4 test) | yeni yöntemler: izdüşüm içeriği 14 mal, yöntemler `un` girdisi kullanır ("bilinmeyen mal: un"). `dukkan` tek başına yalnız "mülk kipi: P3 öncesi mülk dünyası göçer" testini (1) ve `mulk-yapilar`'ı kırar (ek yapı kümesi değişir) | yöntem izdüşümü (`p4Oncesi` içerik) ya da `mulkKipi` süzmesi (G6); ek yapı göç beklentisi (G7) |
| `veri/test/dogrulama.test.ts`, `kimlik-listesi.test.ts` | **kırılmaz** (T3 deneyinde yeşil) | sayım testleri (`yontemler` 24 → 30) K3'te |

## 10. Geri dönüşü zor kararlar

| # | Karar | Neden zor | T3 önerisi | Kimin onayı |
|---|---|---|---|---|
| 1 | Yöntem mi tesis türü mü | canlı tesisler `tesis.tur`, `tesis.yontem` taşır; yerleşim sonradan değişirse bozulur; ayrıca kimlik listesi önek kuralı | yöntem + ev sahibi (§4.1) | A3, baş lider |
| 2 | Ev sahibi (`cam_firini` → `celikhane` mı `parca_fabrikasi` mı) | yöntemin tesis türü kalıcıdır | `celikhane` (rapor kararı); alternatifin maliyet farkı §4.1 | baş lider |
| 3 | Yöntem kimlikleri ve **sırası** (`yontemler[24..29]`) | yalnız sona ekleme; altın ve bot indeksleri | §2.2 sırası | A3, K3 |
| 4 | `dukkan` `yuva` 1 ve `olcekHucre` [1, 2, 3] (süpermarket 3 hücre) | doğrudan kurulum ayak izini baştan alır; yeni kurulumlarda değişir, mevcutlar kalır | sahip kararı uygulandı | sahip (kapandı) |
| 5 | `mulk.perakende` bloğu alan adları | şema sonradan alan eklemek kırıcıdır; alan **eklemek** kolay, **kaldırmak** zor | §8.3b | K3, A3 |
| 6 | `dukkan` `insaMaliyeti.pencere` (P-İthal ↔ P-Yok) | mevcut yapılar ödenmiş kalır; yeni yapıların bedeli değişir (veri) | A2 + A3 seçsin | baş lider |
| 7 | A2 ön önerisi ↔ rapor değerleri (`degirmen`, `ekmek_firini`) | yöntem tarifi değeri veri değişikliğidir (kolay); ama bot ve ölçüm altınları yeni tabloya dayanır | A2 ile karar | baş lider |
| 8 | `mulkKipi` bayrağı (şema) | `YontemTanimi` alanı kalıcı | evet (K3 önerisi) | K3, Kod lideri |

Kolay geri dönüşlüler (kilitlemeyin): yöntem oranları, `tamCesit`, fiyat bandı, talep değerleri, `giderMiliSaat`, `yerelOlcek`, `cekimCarpaniPpm`.

## 11. Açık sorular

1. **Yöntem mi, tesis türü mü?** (A3/baş lider) T3 önerisi yöntemdir; seçenek yolun kimlik listesi maliyeti (`hafif_sanayi` önek sorunu) §4.1'de.
2. **Yöntem seçimi akışı.** Yapı kurulunca varsayılan yöntem `yontemler[0]` (`standart_gida_isleme`). "Değirmen kur" tek adım olacaksa `yapi_yerlestir`'e isteğe bağlı `yontem` alanı (protokolde yalnız ekleme) mı, istemci tarafında kurulum sonrası yöntem seçimi mi? (A3/K1/K2.) `yontem_degistir` bedelsiz ve anlıktır; üretim §7.1 "yeniden donatım %20 + 6 sa" önerir (Alfa-1).
3. **`cam_firini` ev sahibi:** `celikhane` (rapor) mi `parca_fabrikasi` (₺5.000 + 20 çelik + 10 parça daha ucuz) mı? (baş lider.)
4. **A2 ön önerisi mi rapor değerleri mi?** `degirmen` 165 / 33 ve `ekmek_firini` 165 → 250 (A2) ile 150 / 30 ve 150 → 225 (rapor). İkisi de bantta; rapor değerleri zinciri `standart_gida_isleme`'nin altında bırakıyor. A2 raporu teslim edildiğinde teyit.
5. **Kepek ikinci tüketici:** `kepek_gubresi` (A2) mi, `besi_kepekli` (T3) mi, yoksa `NpcAlici` güvence kaydı mı? Güvence kaydı kodda yok (`tur: "kamu"` tek tür).
6. **`sut_kepekli` G6'da mı, P1'de mi?** `sut` P1'de Ü tüketiciye (`peynir_mandira`) kavuşur; G6'da `sut_kepekli` olmadan kepeğin tek Ü'si `kepek_gubresi` kalır.
7. **Dükkân pencere bedeli:** P-İthal, P-Yok ya da başlangıç stoğu? (A2/A3; baş lider kararı 2.)
8. **`tezgah`** (K0): P1 mi A1 mi? Kamu pazar yeri yuvası çekirdekte yok (§5.4).
9. **`tamCesit` A0 değerleri:** `sarkuteri` 3, `sekerci` 2, `yapi_market` 4 (mal sayısı) mı, rapor değerleri (4, 3, 5) mi?
10. **Raf-talep eşleşmesi.** `un`, `sut`, `findik_urunu`, `yakit`, `celik`, `parca`, `cam` raflarda ama `talep1000Saat` yok. Seçenekler: (a) A2 başlangıç değeri verir (K1 sepetinden pay: gıda 120 + ekmek 60 + süt ürünü 20 = 200 toplamı sabit kalmalı); (b) bu mallar rafta yalnız oyuncu alıcıya satılır (yapı market "oyuncu alıcı" K3 Soru 9: aklama riski). T3 değer önermez.
11. **Kamu siparişi v0 mal listesi:** `ekmek`, `gida`, `pencere`, `celik`, `parca` (§6). A3/A1.
12. **İlçe nüfusu kaynağı** (§9.2): O3/K3.
13. **Yapı market "oyuncu alıcı" mekaniği** (toplu alım): K3 aklama riski; T3 verisine girmez (`talepKalemi: "K2"` yalnız NPC talebi).
14. **Süpermarket verisi A0 içeriğine girsin mi?** Kimlik listesi izin verir ama A1 mallarına dayanır; T3 önerisi: A1'e kadar `dukkanTurleri` yalnız 5 A0 türünü içersin.
15. **Çıkmaz mal (P4/P5 dışı):** `findik`, `findik_urunu`, `sekerleme`, `sut_urunu` A0'da tek tüketici türüne sahip (§6); UA1 uyarısı mı, P1 zincirleri bitene kadar hata mı?
16. **Yöntem sayısı sınırı** (üretim §7.4: tür başına ≤ 10): `gida_fabrikasi` 3 yöntemde; A1'de 18'e çıkar. Üç aileli seçici ya da ayrı tür (K-7) A1 kararıdır.

## 12. Yöntem ve doğrulama

**Betikler** (`SP/t3/`, depoda yok; yeniden üretim: worktree kökünde `T3_KOK=$PWD pnpm exec tsx <betik>`):
- `veri.ts`: bu belgenin tek veri kaynağı (yöntemler, rapor değerleri, dükkân türleri).
- `hesap.ts`: katma değer, ölçek türevi, tesis bedeli, zincir yatırımı, tüketici matrisi (§3.2–§3.3, §4.2, §4.4, §6). Yalnız `icerik.json` ve `parametreler.json` okur.
- `dogrula.ts`: blokları **bellekte** `icerik.json` ve `parametreler.json` ile birleştirir ve `dogrulaVeriPaketi` (harita: `sentetik-50.json`), `dogrulaKimlikKilidi`, `icerikDerle` çağırır; `mulk.perakende` için elle denetimleri (mal kimliği var, pazar kaydı var, `tamCesit` ≤ mal sayısı, ad alanı kesişmez, dükkân türü kimlik listesinde, yöntem kimliği çakışmaz) yapar.

**Sonuçlar (taban d28447d, A2 ön önerisi ana sürüm):**
- `dogrulaVeriPaketi`: **geçerli**; `dogrulaKimlikKilidi`: **geçerli**; `icerikDerle`: **tamam**; perakende ve kimlik denetimi: **temiz**.
- Geçici dosya birleştirmesi (sonra `git checkout` ile geri alındı; `git diff` boş): `veri/test` (tümü), `sanayi-regresyon`, `pazar-regresyon`, `mal-kimlik-kilidi-paket`, `serilestir-goc`, `sanayi-ozet`, `tarim-ozet`, `sabit-prng-kuyruk-ozet` yeşil; `mulk-yapilar.test.ts` 1 ve `mal-izdusumu-kanit.test.ts` 4 kırık (§9.3). Tam koşu ve ağır ölçüm O1/O2'nindir; botlar ve ölçüm testleri koşulmadı.
- `icerik.json`, `parametreler.json`, `kimlik-listesi.json`: **değişmedi**.

**Sınırlamalar.** (1) Katma değer taban fiyatla hesaplanır; ithalat, bakım ve işletme dahil kanal hesabı A2'nindir. (2) A2 ön önerisi A2'nin commit'siz taslak betiğinin çıktısıdır; A2 raporu gelince değerler değişebilir ve bu belge güncellenir. (3) Çekirdek kodu bu işte çalıştırılmadı (yalnız yukarıdaki geçici test koşuları). (4) İmar (kullanım türü) kodda yok; §4.3'ün imar sütunu planlıdır.
