# P4/P5 içerik verisi taslağı (G4, T3)

> **Durum.** 1 Ekim 2026, Sprint A0-02, G4. Yazar: T3 (oyun içeriği ve denge verisi). **Sürüm 2:** baş lider kararları ve A2'nin teslim edilmiş raporu (`takim/a2/p4-p5-ekonomi`, **afdf29f**, `docs/arastirma/p4-p5-ekonomi.md`) işlendi. Dal: `takim/t3/p4-p5-icerik-2`, taban `entegrasyon` (de9959c). **`icerik.json`, `parametreler.json` ve `kimlik-listesi.json` bu işte de değişmedi;** G6 ve G8 içerik yamaları depo dışında hazırdır (§9.4). Veri bloklarının dosyalara girişi K3'ün şema dalından sonradır (§9).
>
> **Karar vermez.** Bu belge öneri ve seçenek yazar; kararlar A3 ve baş liderdedir. Ekmek zinciri ve genel olarak sayıların **tek kaynağı A2**'dir; A2 ile T3'ün ilk taslağı arasındaki sapmalar kapanmış, rapor (dikey/üretim) değerleri **tarihçe** satırına inmiştir. Hâlâ A2 ya da karar bekleyen sayılar **(A2 teyit)** ya da **(karar bekliyor)** ile işaretlidir.
>
> **Kaynaklar.** [dikey-zincirler-ve-perakende](dikey-zincirler-ve-perakende.md) §2.2, §3.1, §3.3, §3.5, §5.2–§5.10, §9.2–§9.4 · [uretim-agi-genisletme](uretim-agi-genisletme.md) §2.4, §3.2, §3.3, §5.2, §7.1–§7.5 · [perakende-kademeleri](perakende-kademeleri.md) §3.2, §3.6, §5.1, §5.2, §12.1 · [kimlik-listesi-v1](kimlik-listesi-v1.md) §0, §1.2, §2.3, §2.4 · docs/06 §15.8, §15.10 · docs/10 §5A · docs/12 §10, §13, §14 · A2 `p4-p5-ekonomi.md` (afdf29f) §0, §1.3–§1.14 · `packages/veri/icerik/{icerik,parametreler,kimlik-listesi}.json` (de9959c) · K3 keşif notu ve A3 ön yanıtları (yalnız okundu).

## 0. Birimler, kapanan kararlar ve okuma kılavuzu

- **Kod birimi mili.** Miktar mili-birim/sa, para mili-₺: `tabanFiyat: 50000` = 50 ₺; `girdiler: { tahil: 200000 }` = 200 birim/sa; `isci: 5000` = 5 işçi. Tablolarda ₺ ve birim/sa yazılır; JSON'da mili.
- **Süre.** Üretim **sürekli akıştır** (saatlik tik); yöntemin parti ya da çevrim süresi yoktur. "Süre" sütunu üretimde "sürekli, 1 sa tik", yapıda **inşa süresidir** (`mulk.yapiInsaSaati`; doğrudan M/L kurulumunda ×1,5 / ×2; ilk 24 saatte erken oyun çarpanı ayrıca).
- **S/M/L ölçek çarpanları** (`sanayi.olcekKademeleri`): çıktı, girdi ve elektrik ×1 / 2,2 / 3,6; işçi ×1 / 1,8 / 2,6; bakım ×1 / 2 / 3,2; inşa bedeli ×1 / 2,5 / 4,5. Ayak izi `olcekHucre = [yuva, yuva+1, yuva+2]` (docs/06 §15.10). Yöntem verisi **yalnız S** yazılır; M ve L çalışma zamanında türer.
- **Pazar.** NPC ithalat ×1,10 ve komisyon %1 → **1,111 R**; ihracat ×0,90 ve komisyon %1 → **0,891 R**. **Kamu şebekesi ve kamu siparişi tavanı 1,035 R** (`mulk/kasa.ts:415-424`; GDD'deki 1,10 R üst sınırdır).
- **Aşama etiketleri:** A0, A0-ops, A1 (kimlik-listesi-v1 §0). Kapsam G6 (ekmek zinciri), G7 (yerel pazar kanalı ve `dukkan` S), G8 (cam → pencere, yapı market).

**Kapanan kararlar (baş lider; bu sürümde işlendi):**

| # | Karar | Bu belgede |
|---|---|---|
| K1 | **Yeni tesis türü yok.** Yöntem + ev sahibi tesis yolu kesinleşti; §4.1'deki seçenek sütunu yalnız tarihçedir | §1, §4.1 |
| K2 | **Yöntem kimlikleri için ayrı bir kimlik listesi açılır:** yalnız sona ekleme, makine denetimli; biçim ve yer K3'ün (şema ve denetim). İçerik: §2.2 tablosu | §2.2, §9.1 |
| K3 | **Alfa-0'da elektrik (A2: yakıt da) kamu şebekesinden gelir:** fiyat kamu fiyat tavanıdır (elektrik 10,35 ₺, yakıt 103,5 ₺), ödeme kamu kasasına (A2: `kasaPayiPpm` %12) ve kalanı lavaboya gider; **santral isteğe bağlı yatırımdır.** "Santral olmadan sıfır üretim" bulgusu **çözüldü** | §1, §3.4, §4.4 |
| K4 | **`cam_firini` → `parca_fabrikasi`** (A3 seçti; A2: −9.666 ₺ ve −1 hücre) | §3.1, §4.1, §4.2 |
| K5 | **Ekmek zinciri sayılarında tek kaynak A2**; ön öneri ile rapor değerleri yan yana durması A2 lehine kapandı | §3.2, §7 |
| K6 | Yeni yöntemler yalnız mülk kipinde (`mulkKipi: true`); bölge kipi altınları birebir | §9.1 |

A3'ün ön yanıtları (şartname §5.2; baş lider onayına kadar ön bilgi): `girdiler.elektrik` **değişmez**, şema aynı; tedarik çekirdekte çözülür: önce işletmenin kendi santrali, açık kalan kısım şebekeden; bedel saatlik gider; yeni isteğe bağlı blok `mulk.sebeke = { "surum": 1, "mal": "elektrik", "tavanOraniPpm": 1000000 }`, büyük olasılıkla `kasaPayiPpm` de eklenir (karar bekliyor).

## 1. Özet ve bulgular

1. **Yeni mal, yeni tesis türü ve yeni dükkân türü kimliği gerekmez.** 24 mal içerikte, `dukkan` ve 13 dükkân türü kimlik listesinde zaten var. Gereken tek yeni kimlik grubu **6 yöntemdir** (`degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli`, `cam_firini`, `celik_dograma`); yöntemler kimlik kilidinin kapsamı dışındadır (kimlik-listesi-v1 §3 madde 4), bu yüzden ayrı bir yöntem kimlik listesi açılır (K2) ve §2.2'de "yeni kimlik önerisi" diye işaretlenir.
2. **Kesinleşen yol: yöntem + ev sahibi tesis** (K1, K4): `degirmen` ve `ekmek_firini` → `gida_fabrikasi`; `kepek_gubresi` ve `sut_kepekli` → `ahir`; `cam_firini` ve `celik_dograma` → `parca_fabrikasi`. `celikhane` listesi **değişmez**. Ayrı tesis türü seçeneği (§4.1) tarihçedir; engeli: `icerik.tesisTurleri[]` listenin önekidir ve `hafif_sanayi` (A1) listede 19. sıradadır.
3. **Elektrik: çözüldü** (K3). Önceki taslağın "santral yoksa elektrik girdili tesis sıfır üretir" bulgusu (`sanayi/elektrik.ts` `elektrikDagit`) kodda hâlâ doğrudur, ama kararla eksik elektrik ve yakıt şebekeden tamamlanır; santral isteğe bağlı yatırımdır. A2 §1.3-B1: şebeke fiyatı tabandan %3,5 yüksektir (KD'ye etkisi çoğu yöntemde < %2, en çok `cam_firini` −%4,2); S kömür santrali ancak %5–6 avantaj sağlar, P4 oyuncusunun yükünde (%13) hiç geri ödemez; yalnız hidro (dağ etiketi) kazanır. Yöntemlerin `girdiler.elektrik` ve `girdiler.yakit` değerleri **tarifte aynen kalır**.
4. **Ekmek zinciri: A2 tek kaynak** (K5). Rapor tarifleriyle (150 un + 30 kepek; 150 un → 225 ekmek) zincir `standart_gida_isleme`'nin (oran 1,84, bölge kipi altını) tahıl başına net getirisinin %3,3 altındadır; A2 tarifleriyle (`degirmen` 165 un + 33 kepek; `ekmek_firini` 165 un + 20 yakıt + 15 elektrik → 250 ekmek) +%33,6 üstündedir. Tesis, işçi ve hücre tabanında zincir %29–34 geridedir; erken oyunda bağlayıcı kısıt NPC pazar derinliğidir ve standart ile zincir **tamamlayıcıdır** (A2 §1.3-B2). A2 yedek düğme önerir (`standart_gida_isleme` mülk kipinde ×0,75, varsayılan kapalı; tetik M < %30). T3 bu belgede A2 değerlerini ana sürüm alır; rapor değerleri §3.2 ve §8.4'te tarihçedir.
5. **Kepek: P0'da iki tüketici (A2 §1.6).** (a) NPC pazar kaydı (emilim 120 / arz 80, kepek 16 ₺) ve (b) **`kepek_gubresi`** (kepeğe 21,9 ₺ öder, NPC'nin %37 üstü; Tarla gübre dozuna döner). `sut_kepekli` P1'e bırakılır (ahır saatinde `ahir_besi`'nin gerisindedir); veri satırı yine de G6 yamasındadır (Y-37 P0; A2: "isterse veri satırı P0'da bulunur"). Yan ürün kuralı için `NpcAlici` güvence kaydı isteğe bağlıdır (A2: ≈ 1,06 M ₺/hafta, yeni musluk kalemi yok). T3'ün ilk taslaktaki seçeneği `besi_kepekli` düşmüştür.
6. **`ekmek`'in ikinci tüketicisi kamu siparişi v0'dır.** A2 §1.9 önerisi: mal listesi **`ekmek`, `gida`, `pencere`, `celik`, `parca`** (okul/hastane ekmeği, onarım, yol malzemesi), fiyat 1,03 R (tavan 1,035 R'nin altı), boyutlar 100 / 50 / 10 / 30 / 20 birim, ilçe başına haftada ≤ 5 sipariş, vade 3 gün. Liste baş lider onayına bağlıdır.
7. **Raf-talep açığı: çözüldü (A2 §1.9).** T3'ün ilk taslağındaki yedi raf malına (`un`, `sut`, `findik_urunu`, `yakit`, `celik`, `parca`, `cam`) A2 `talep1000Saat` verdi; gıda 120 → 90 (K1 sepeti 200 sabit). Takvim (4 grup, her satır 12.000.000 ppm) ve bayram dalgası da A2'dendir (§8.3).
8. **Test etkisi (kanıt: geçici birleştirme, sonra geri alındı).** Taslak bloklar birleştirildiğinde `dogrulaVeriPaketi`, `dogrulaKimlikKilidi` ve `icerikDerle` geçer; `veri/test` yeşil kalır. Kırılan testler **beklenen** ve K3'ündür: `mulk-yapilar.test.ts:50` ve `mal-izdusumu-kanit.test.ts` (4 test; "bilinmeyen mal: un"; Kod lideri çözümün K3'te olduğunu teyit etti). Gerekçe `mulkKipi` bayrağıdır (§9.1). İçerik değişimi `kuralSurumu`'nu değiştirir (yalnız-ekle göçü; K3 testi).
9. **Dükkân.** 5 A0 S türü, 13 türün tamamı kimlik listesinde. **Süpermarket 3 hücre** (S4-4, sahip kararı): `olcekHucre [1, 2, 3]`; `[1, 2, 2]` istisnası kapandı. Dükkân bedelindeki 4 `pencere` G7 önyükleme sorunudur: **A3 seçecek**; A2 sayıca P-Yok, T3 taslağının ana sürümü P-İthal'dir (§4.5).

## 2. Kimlikler

### 2.1 Mallar (yeni kimlik yok)

P4/P5 kapsamındaki mallar `icerik.json`'da, `kimlik-listesi.json`'da ve `parametreler.json` pazar tablolarında **birebir** vardır. Taban fiyatlar listeyle aynıdır (A2 §1.2 denetimi: 24 malda fark yok; **fiyat değişikliği önerilmiyor**).

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

Yeni yöntemlerin girdi ve çıktı kimlikleri bu mallardır; hiçbiri mal listesine yeni eleman eklemez. `elektrik` depolanamaz olduğundan ticarete konu olamaz; şebeke ve santral dışında tedarik yoludur.

### 2.2 Yeni kimlik önerileri (yöntem kimlik listesi için; K2)

| Tür | Kimlik | Ad | Ev sahibi | Önerilen sıra | Aşama | Kaynak |
|---|---|---|---|---:|---|---|
| **yeni kimlik önerisi: yöntem** | `degirmen` | Değirmen | `gida_fabrikasi` | `yontemler[24]` | G6 | dikey §3.1; üretim §3.3; A2 §1.4 |
| yeni kimlik önerisi: yöntem | `ekmek_firini` | Ekmek Fırını | `gida_fabrikasi` | `yontemler[25]` | G6 | dikey §3.1; A2 §1.4 |
| yeni kimlik önerisi: yöntem | `kepek_gubresi` | Kepekten Gübre | `ahir` | `yontemler[26]` | G6 | A2 §1.4, §1.6 |
| yeni kimlik önerisi: yöntem | `sut_kepekli` | Kepekli Süt Besisi | `ahir` | `yontemler[27]` | G6 (Y-37 P0; A2: P1'de anlam kazanır) | üretim §3.3, §9.1 A0-2 |
| yeni kimlik önerisi: yöntem | `cam_firini` | Cam Fırını | `parca_fabrikasi` | `yontemler[28]` | G8 | dikey §3.3; A3 seçimi |
| yeni kimlik önerisi: yöntem | `celik_dograma` | Çelik Doğrama | `parca_fabrikasi` | `yontemler[29]` | G8 | dikey §3.4, §3.5 |
| mal / tesis türü | yok | | | | | |
| ek yapı | `dukkan` (listede, A0) | | | | G7 | kimlik-listesi-v1 §2.3 |
| dükkân türü | 13 tür listede; A0 verisine 5'i girer | | | | | kimlik-listesi-v1 §2.4 |

- **Sıra gerekçesi.** `yontemler[]` bugün 24 elemanlıdır (0–23). Yeni yöntemler G adımlarının sırasıyla eklenir (G6: 4, G8: 2); sıra kalıcıdır (`icerik-kimlik-kilidi.json` yalnız-ekle denetimi).
- **Ad alanı denetimi.** Altı yöntem kimliği `mallar[]`, `tesisTurleri[]`, `mulk.ekYapilar` ve 13 dükkân türü kimliğiyle **çakışmaz** (betikle denetlendi). `firin` (dükkân türü) ile `ekmek_firini` (yöntem) ayrı kimliklerdir.
- **Yöntem kimlik listesi (K2).** Biçim ve yer K3'ündür. T3'ün G6 yaması şu **varsayımı** taşır: `kimlik-listesi.json`'da üst düzey `"yontemler": [{ "id", "tur" (ev sahibi), "asama" }]` bölümü, `icerik.yontemler[]`'in önekini kilitler (§9.4). Bu belgenin yukarıdaki tablosu o listenin içeriğidir.
- **Teknoloji kimliği gerekmez.** Altı yöntemin hiçbiri `gerekliTeknoloji` istemez.

## 3. Yöntemler ve tarifler

### 3.1 Tarif tablosu (S ölçek, birim/sa; süre: sürekli akış; A2 afdf29f §1.4)

| Kimlik | Ad | Ev sahibi tesis | Girdi (birim/sa) | Çıktı (birim/sa) | İşçi | Bakım (parça/sa) | Kirlilik ppm/sa | Kaynak (§) | Aşama |
|---|---|---|---|---|---:|---:|---:|---|---|
| `degirmen` | Değirmen | `gida_fabrikasi` | 200 tahıl + 12 elektrik | 165 un + 33 kepek | 5 | 0,8 | 20 | A2 §1.4; dikey §3.1 | G6 |
| `ekmek_firini` | Ekmek Fırını | `gida_fabrikasi` | 165 un + 20 yakıt + 15 elektrik | 250 ekmek | 8 | 0,8 | 20 | A2 §1.4; dikey §3.1 | G6 |
| `kepek_gubresi` | Kepekten Gübre | `ahir` | 100 kepek + 5 elektrik | 18 gübre | 3 | 0,5 | 10 | A2 §1.4, §1.6 | G6 |
| `sut_kepekli` | Kepekli Süt Besisi | `ahir` | 50 tahıl + 60 kepek + 5 elektrik | 82 süt + 4 gübre | 5 | 0,5 | 10 | üretim §3.3; A2 §1.4 | G6 (P1'de anlamlı) |
| `cam_firini` | Cam Fırını | **`parca_fabrikasi`** | 60 silis + **16 yakıt + 18 elektrik** | 50 cam | 5 | 1,0 | 60 | A2 §1.4; dikey §3.3 | G8 |
| `celik_dograma` | Çelik Doğrama | `parca_fabrikasi` | 24 çelik + 32 cam + **5 parça** + 15 elektrik | **28 pencere** | 7 | 1,0 | 20 | A2 §1.4; dikey §3.4, §3.5 | G8 |

**3.1b Yöntem × yapı özeti** (ev sahibi tesis verisi §4.2'den; ₺ + malzeme S ölçek, mülk kipi)

| Kimlik | Ad | Yuva ve ayak izi `[y, y+1, y+2]` | Maliyet (S) | İnşa süresi (S) | Çıktı taban ₺ | Kaynak (§) | Aşama |
|---|---|---|---|---:|---|---|---|
| `degirmen` | Değirmen | 2: [2, 3, 4] (`gida_fabrikasi`) | ₺10.000 + 60 çelik + 20 parça | 6 sa | un 50, kepek 18 | dikey §3.1, §9.3; üretim §7.5 | G6 |
| `ekmek_firini` | Ekmek Fırını | 2: [2, 3, 4] (`gida_fabrikasi`) | ₺10.000 + 60 çelik + 20 parça | 6 sa | ekmek 60 | dikey §3.1, §9.3 | G6 |
| `kepek_gubresi` | Kepekten Gübre | 2: [2, 3, 4] (`ahir`) | ₺8.000 + 40 çelik + 15 parça | 4 sa | gübre 140 | A2 §1.4 | G6 |
| `sut_kepekli` | Kepekli Süt Besisi | 2: [2, 3, 4] (`ahir`) | ₺8.000 + 40 çelik + 15 parça | 4 sa | süt 40, gübre 140 | üretim §3.3, §7.4 | G6 |
| `cam_firini` | Cam Fırını | 2: [2, 3, 4] (`parca_fabrikasi`) | ₺15.000 + 80 çelik + 30 parça | 8 sa | cam 95 | A2 §1.4; A3 seçimi | G8 |
| `celik_dograma` | Çelik Doğrama | 2: [2, 3, 4] (`parca_fabrikasi`) | ₺15.000 + 80 çelik + 30 parça | 8 sa | pencere 360 | dikey §3.4, §3.5, §9.3 | G8 |
| (ek yapı) `dukkan` | Dükkân | 1: [1, 2, 3] | ₺6.000 + 20 çelik + 8 parça + 4 pencere | 4 sa | (satış; §5) | dikey §5.2, §5.10; perakende §3.2, §3.6 | G7 |

- **Enerji.** Her yöntem elektrik ister; `ekmek_firini` ve `cam_firini` ayrıca yakıt ister. Eksik elektrik ve yakıt şebekeden gelir (K3, §3.4); tarifte kalırlar.
- **S6 kuralı** (≤ 3 girdi çeşidi, elektrik ve yakıt hariç; ≤ 3 çıktı satırı) hepsinde sağlanır.
- **Eşleşme (S).** 1 Tarla (200 tahıl) → 1 `degirmen` (165 un, 33 kepek) → 1 `ekmek_firini` (165 un): **1:1:1**. 1 `degirmen`'in kepeği (33/sa) `kepek_gubresi`'ni (100/sa) üçte bir, `sut_kepekli`'yi (60/sa) yarı doyurur; fazla kepek NPC pazarına gider. 1 `cam_firini` (50 cam) 1,56 `celik_dograma` besler (32 cam/sa); çelik tarafında yüksek fırın 60 çelik/sa ÷ 24 = 2,5 hat.
- **`kepek_gubresi` Tarla bağı.** 18 gübre/sa, `tarim.gubreTuketimiSaat` = 4/sa/Tarla ile 4,5 Tarla'yı besler.
- **Bayat ekmek → kepek %30 döngüsü** G6'ya **alınmadı** (K3: bozulma kuralına dokunur).

### 3.2 Katma değer sınaması (betik; taban fiyat; ₺/sa)

Betik `SP/t3/hesap.ts`: girdi ve çıktı değeri taban fiyattır, elektrik 10 ₺. "Oran" = çıktı ÷ girdi (hedef bant 1,15–1,5; dikey §2.2). "Net" = KD − bakım parçası (×180 ₺) − işletme (60 ₺/sa). "Makas altı" = ithal edilebilen girdiler ×1,111, elektrik taban, çıktı ×0,891 ile **tek halka** kârı. "A2 KD (şebeke)" A2 §1.4'ün şebeke fiyatlı KD değeridir; T3 hesabıyla uyumludur (aradaki fark şebeke fiyatından).

| Yöntem | Sürüm | Girdi ₺ | Çıktı ₺ | Oran | KD (taban) | A2 KD (şebeke) | KD/işçi | Net | Makas altı tek halka |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|
| `degirmen` | **A2 (geçerli)** | 6.120 | 8.844 | 1,45 | 2.724 | 2.720 | 545 | 2.520 | +1.094 |
| `ekmek_firini` | **A2 (geçerli)** | 10.400 | 15.000 | 1,44 | 4.600 | 4.525 | 575 | 4.396 | +1.827 |
| `kepek_gubresi` | **A2 (geçerli)** | 1.850 | 2.520 | 1,36 | 670 | 668 | 223 | 520 | +196 |
| `sut_kepekli` | A2 = rapor | 2.630 | 3.840 | 1,46 | 1.210 | 1.208 | 242 | 1.060 | +505 |
| `cam_firini` | **A2 (geçerli)** | 3.280 | 4.750 | 1,45 | 1.470 | 1.408 | 294 | 1.230 | +608 |
| `celik_dograma` | **A2 (geçerli)** | 6.970 | 10.080 | 1,45 | 3.110 | 3.105 | 444 | 2.870 | +1.254 |
| *tarihçe* `degirmen` | rapor (150 + 30) | 6.120 | 8.040 | 1,31 | 1.920 | n/a | 384 | 1.716 | +378 |
| *tarihçe* `ekmek_firini` | rapor (150 → 225) | 9.850 | 13.500 | 1,37 | 3.650 | n/a | 456 | 3.446 | +1.102 |
| *tarihçe* `cam_firini` | rapor (18 yakıt + 20 elektrik) | 3.500 | 4.750 | 1,36 | 1.250 | n/a | 250 | 1.010 | +366 |
| *tarihçe* `celik_dograma` | rapor (6 parça → 27) | 7.150 | 9.720 | 1,36 | 2.570 | n/a | 367 | 2.330 | +734 |
| (referans) `standart_gida_isleme` | mevcut | 6.100 | 11.200 | 1,84 | 5.100 | 5.097 | 850 | 4.896 | +3.213 |
| (referans) `ahir_besi` | mevcut | 3.600 | 6.580 | 1,83 | 2.980 | n/a | 596 | 2.830 | +1.863 |
| (referans) `standart_parca` | mevcut | 5.920 | 7.200 | 1,22 | 1.280 | 1.241 | 233 | 1.040 | −149 |

Okuma:
1. **Katma değer > 0 hepsinde** (oran 1,36–1,46; makas altı tek halka kârı pozitif); hepsi 1,15–1,5 bandında. KD/işçi 223–575; `degirmen` ve `ekmek_firini` hedefin (250–400) üstündedir. İşçi mülk kipinde bağlayıcı değildir (`kalanIsci` sınırsız), bu bir uyarıdır.
2. **Sapma kapandı (K5).** A2 üst bant tarifleri dikey rapordan bilinçli sapar: `degirmen` oran 1,314 → 1,445, `ekmek_firini` 1,371 → 1,442, `cam_firini` 1,357 → 1,448, `celik_dograma` 1,359 → 1,446 (A2 §1.4: uzman kademe ithalatla başlarken zarar etmesin; K/U ilkesi). A2 açık sorusu: fırın çıktısı 250 (A0-11 güvencesi) mi 243 (K/U ilkesinin +%25'ine oturur) mı? **(karar bekliyor, A3/baş lider; veri değişikliği kolay)**.
3. **Zincir ↔ tek tesis** (A2 §1.3-B2, komisyonlu): tahıl başına NPC net: standart 4.310 ₺/sa, zincir 5.759 ₺/sa (**+%33,6**; rapor tarifleriyle 4.167, −%3,3); tesis başına KD standart 5.097, zincir 3.622 (−%28,9). Standart ve zincir tamamlayıcıdır (iki havuz birlikte 8.465 ₺/sa; doymuş havuza ikinci standart tesis −3.175).

### 3.3 Ölçek türevleri (M ve L; A2 değerleriyle)

Çıktı, girdi ve elektrik ×2,2 / ×3,6; işçi ×1,8 / ×2,6; bakım ×2 / ×3,2; kirlilik çıktıyla (doğrusal). Çalışma zamanında türer; JSON'a yazılmaz.

| Yöntem | M (İmalathane) | L (Fabrika) |
|---|---|---|
| `degirmen` | 440 tahıl + 26,4 elektrik → 363 un + 72,6 kepek; işçi 9; bakım 1,6; kirlilik 44 | 720 tahıl + 43,2 elektrik → 594 un + 118,8 kepek; işçi 13; bakım 2,56; kirlilik 72 |
| `ekmek_firini` | 363 un + 44 yakıt + 33 elektrik → 550 ekmek; işçi 14,4; bakım 1,6 | 594 un + 72 yakıt + 54 elektrik → 900 ekmek; işçi 20,8; bakım 2,56 |
| `kepek_gubresi` | 220 kepek + 11 elektrik → 39,6 gübre; işçi 5,4 | 360 kepek + 18 elektrik → 64,8 gübre; işçi 7,8 |
| `sut_kepekli` | 110 tahıl + 132 kepek + 11 elektrik → 180,4 süt + 8,8 gübre; işçi 9 | 180 tahıl + 216 kepek + 18 elektrik → 295,2 süt + 14,4 gübre; işçi 13 |
| `cam_firini` | 132 silis + 35,2 yakıt + 39,6 elektrik → 110 cam; işçi 9; kirlilik 132 | 216 silis + 57,6 yakıt + 64,8 elektrik → 180 cam; işçi 13; kirlilik 216 |
| `celik_dograma` | 52,8 çelik + 70,4 cam + 11 parça + 33 elektrik → 61,6 pencere; işçi 12,6 | 86,4 çelik + 115,2 cam + 18 parça + 54 elektrik → 100,8 pencere; işçi 18,2 |

Bina adları (arayüz metni; T1 metin tablosuna girdi, `icerik.json`'a girmez): `degirmen` Değirmen Atölyesi → Un İmalathanesi → Un Fabrikası; `ekmek_firini` Fırın Atölyesi → Fırın İmalathanesi → Ekmek Fabrikası; `cam_firini` Cam Atölyesi → Cam İmalathanesi → Cam Fabrikası; `celik_dograma` Doğrama Atölyesi → Doğrama İmalathanesi → Doğrama Fabrikası. Ad bir boyutu anlatır, seviyeyi değil.

### 3.4 Enerji: kamu şebekesi (çözüldü)

| Girdi | Kaynak (mülk kipi, Alfa-0) | Fiyat | Not |
|---|---|---|---|
| `elektrik` | **kamu şebekesi** (otomatik); isteğe bağlı kendi santrali | kamu fiyat tavanı kuralı: 1,035 R ⇒ **10,35 ₺** | pazara girmez (depolanamaz) |
| `yakit` | **kamu şebekesi** (A2; A3'ün ön yanıtı yalnız `mal: "elektrik"` der: **soru §11-3**) | **103,5 ₺** (NPC ithalatı 111,1 ₺'nin %6,8 altı) | emir yuvası harcamaz |

- **Ödeme:** kamuya; `kasaPayiPpm` (A2 önerisi **120.000, %12**) ilçe kamu kasasına, kalanı lavaboya (`sebeke`); tamsayı kuralı kasa = ⌊ödeme × `kasaPayiPpm` ÷ 1.000.000⌋, lavabo = ödeme − kasa (korunum her tikte tam). Bir P4 oyuncusu haftada 397.577 ₺ ödeme yapar (elektrik 49.817 + yakıt 347.760); P4 + P5 733.165 ₺ (A2 §1.3-B1).
- **Santral isteğe bağlı** (K3): S kömür santrali tam yükte %5–6 avantaj, başabaş yük %67; P4 oyuncusu yükünde (%13) −195 ₺/sa. A2'nin önerisi O5 (vaadi "bağımsızlık ve büyük ölçek" olarak düzelt) + gerekirse O3 (mülk kipinde kömür girdisi ×0,75); karar baş liderin.
- **Çekirdek tarafı (A3 ön yanıtı):** önce işletmenin kendi santrali, açık kalan kısım şebekeden; bedel saatlik gider; veri şeması değişmez (`girdiler.elektrik` aynen). Blok `mulk.sebeke` §8.3'te.

## 4. Tesis ve yapı verisi

### 4.1 Karar: yöntem + ev sahibi (K1); ayrı tesis türü seçeneği tarihçe

| | **Kesinleşen yol: yöntem + ev sahibi tesis** | *Tarihçe: ayrı tesis türü seçeneği* |
|---|---|---|
| Kimlikler | 6 yöntem | 4 tür (`degirmen`, `ekmek_firini`, `cam_ocagi`, `pencere_atolyesi`) + yöntemler |
| `tesisTurleri[]` (icerik) | değişmez; ev sahiplerinin `yontemler` listesi uzar | +4 sona |
| `yapiYuva`, `olcekHucre`, `yapiInsaSaati` | değişmez | her yeni tür için 3 satır |
| `kimlik-listesi.json` | etkisiz (yöntem kimlik listesi ayrı, K2) | `tesisTurleri` +4; **`hafif_sanayi` (A1) 19. sırada**: önek kuralı gereği ya A0'a çekilir ya araya ekleme gerekir |
| Yapı sayısı bütçesi | etkisiz | 18 → 22 (+ `dukkan`, `hafif_sanayi` ile 24); S-4 "≤ 19" aşılır |
| Bölge kipi | yöntemler `mulkKipi` ile süzülür | yeni türler bölge kipine girer |
| Oyuncu akışı | "Gıda fabrikası kur" + `yontem_degistir` (bedelsiz, anlık); varsayılan `yontemler[0]` | tek adım |
| Dezavantaj | `gida_fabrikasi` yöntem sayısı artar (üretim §7.4, K-7); iki adımlı kurulum | yukarıdaki bütçe ve önek engelleri |

Ev sahibi gerekçeleri:

| Yöntem | Ev sahibi | Gerekçe | Alternatif ve farkı |
|---|---|---|---|
| `degirmen`, `ekmek_firini` | `gida_fabrikasi` | `standart_gida_isleme` (tahıl → gıda) ile aynı işi genelleştirir; etiket ve rezerv şartı yok; S 2 hücre ₺10.000, 6 sa | `ciftlik`: işleme değil üretim |
| `kepek_gubresi`, `sut_kepekli` | `ahir` | Gübre ve süt ahır ürünüdür; `ova` etiketi bölgesel kimlik verir | `gida_fabrikasi`: yem tüketimi hayvancılıktır |
| `cam_firini` | **`parca_fabrikasi`** (A3 seçti, K4) | A2: `celikhane`'ye göre **−9.666 ₺ taban değer ve −1 hücre** (`celikhane` S 3 hücre ₺20.000 + 100/40, 10 sa ↔ `parca_fabrikasi` S 2 hücre ₺15.000 + 80/30, 8 sa); cam fırını `standart_parca`'yı +%13 geçer, `otomatik_hat`'ın %20 altında kalır (A2 §1.12). Cam ve doğrama aynı türe düşer (iki ayrı tesis) | *tarihçe:* `celikhane` (dikey §9.3 kararı; "fırın ve metalurji" ailesi) |
| `celik_dograma` | `parca_fabrikasi` | Doğrama montajdır; parça ailesi (dikey §9.3; üretim §7.4) | `hafif_sanayi` (A1): henüz yok |

### 4.2 Ev sahibi tesis türü verisi (S / M / L)

Değerler mevcut `icerik.json` ve `parametreler.json`'dandır (**değişmez**); ölçek bedelleri `olcekKademeleri.insaPpm` ×1 / 2,5 / 4,5 (aşağı yuvarlanır), süre `yapiInsaSaati` × 1 / 1,5 / 2, hücre `olcekHucre`.

| Tesis türü | `yapiYuva` | `olcekHucre` [S, M, L] | Para ₺ (S / M / L) | Çelik (S / M / L) | Parça (S / M / L) | Süre sa (S / M / L) | Taban değer S | `gerekliEtiket` / rezerv | Barındırdığı yeni yöntem |
|---|---:|---|---|---|---|---|---:|---|---|
| `gida_fabrikasi` | 2 | [2, 3, 4] | 10.000 / 25.000 / 45.000 | 60 / 150 / 270 | 20 / 50 / 90 | 6 / 9 / 12 | 20.800 | yok / yok | `degirmen`, `ekmek_firini` |
| `ahir` | 2 | [2, 3, 4] | 8.000 / 20.000 / 36.000 | 40 / 100 / 180 | 15 / 37 / 67 | 4 / 6 / 8 | 15.500 | `ova` / yok | `kepek_gubresi`, `sut_kepekli` |
| `parca_fabrikasi` | 2 | [2, 3, 4] | 15.000 / 37.500 / 67.500 | 80 / 200 / 360 | 30 / 75 / 135 | 8 / 12 / 16 | 30.000 | yok / yok | `cam_firini`, `celik_dograma` |
| (ilgili) `celikhane` | 3 | [3, 4, 5] | 20.000 / 50.000 / 90.000 | 100 / 250 / 450 | 40 / 100 / 180 | 10 / 15 / 20 | 39.200 | yok / yok | **yok** (listesi değişmez; çelik kolu `yuksek_firin`) |
| (isteğe bağlı) `santral` | 3 | [3, 4, 5] | 12.000 / 30.000 / 54.000 | 70 / 175 / 315 | 30 / 75 / 135 | 10 / 15 / 20 | 25.800 | yok / yok | bağımsızlık ve büyük ölçek tercihi |
| (ilgili) `silis_ocagi` | 2 | [2, 3, 4] | 6.000 / 15.000 / 27.000 | 30 / 75 / 135 | 10 / 25 / 45 | 6 / 9 / 12 | 11.400 | yok / `silis` | cam girdisi (A2 senaryosu silisi ithal alır) |

Not: `ahir` mülk kipi inşa süresi 4 sa (`yapiInsaSaati`), bölge kipi `insaSuresiSaat` 6 sa. İlk 5 yapıda %30 indirim ölçekten bağımsız sabit tutardır (docs/06 §15.10).

### 4.3 Kurulabildiği yerler (ilçe ve arsa koşulları)

Kilit yok, seçim var (docs/12 §13): ilçe gelişim seviyesi hiçbir yapıyı açmaz ya da kapatmaz. Kodda bugün **yalnız** arsa sınıfı (`kirsal`, `kasaba`, `sehir`: fiyat sınıfı), il etiketi ve rezerv koşulu vardır; **arsa kullanım türü (imar) ve izin matrisi kodda yoktur** (arsa-ve-insa §7.1; K3 Soru 5). A2'nin yerel talep modeli ilçe sınıfını "ilçenin baskın hücre sınıfı" (eşitlikte büyük) olarak tanımlar ve nüfus eşdeğeri 10.000 / 40.000 / 120.000 kullanır.

| Bina | Arsa sınıfı (kodda) | İl etiketi / rezerv (kodda) | Kullanım türü izni (imar matrisi geldiğinde; arsa-ve-insa §2.2) | Öneri: ekonomik tercih (kilit değil) |
|---|---|---|---|---|
| `gida_fabrikasi` (değirmen, fırın) | kırsal, kasaba, şehir | yok | Sanayi ✓; Tarla/Bahçe ○ (S, ada başı 1); Kıyı ○; Ticari ✗; Konut ✗ | kırsal/kasaba; hammadde Tarla'ya yakın |
| `ahir` (kepek yöntemleri) | üçü de | **`ova`** | Tarla ✓ | ova ilçesi; Tarla ve değirmenle aynı il |
| `parca_fabrikasi` (cam fırını, doğrama) | üçü de | yok (silis ve çelik girdisi ithal olabilir) | Sanayi ✓; Ticari ○ (S, zanaat atölyesi) | cam fırını kirlilik 60: hassas yapıdan uzak |
| `santral` (isteğe bağlı) | üçü de | yok | Sanayi ✓ | |
| `dukkan` (tüm türler) | üçü de (hücre fiyatı sınıfa göre: ₺1.000 / 2.500 / 6.500, artımlı) | yok | Ticari ✓; Konut ○ (`firin`, `bakkal`); Sanayi ○ (`yapi_market`, ana yol cephesi); Kıyı ○ (`sekerci`, `bakkal`); Tarla/Bahçe/Orman ✗ | **kasaba ve şehir:** A2 §1.9 geri ödeme: kırsal 281–352 sa (hedef ≤ 48 tutmaz), kasaba 17–21, şehir 12–15 |

Dükkân için A0'da arsa şartı yoktur. `arsaIzin` alanı veri olarak şimdiden yazılır; çekirdek imar matrisi gelince okur.

### 4.4 Zincir yatırımı ve kurulum süresi (S ölçek, taban fiyat; santralsiz)

| Zincir | Yapılar | Hücre | Para ₺ | Çelik / parça / pencere | Taban değer ₺ | Ardışık süre sa |
|---|---|---:|---:|---|---:|---:|
| P4 çekirdek (şebekeyle) | Tarla + 2 Gıda fabrikası + dükkân | 7 | 32.000 | 170 / 58 / 4 | 64.280 | 18 |
| + kepek ahırı | + `ahir` | +2 | +8.000 | +40 / +15 | +15.500 | +4 |
| + isteğe bağlı santral | + `santral` | +3 | +12.000 | +70 / +30 | +25.800 | +10 |
| P5 çekirdek (şebekeyle) | 2 `parca_fabrikasi` (cam, doğrama) + dükkân (yapı market) | 5 | 36.000 | 180 / 68 / 4 | 71.280 | 20 |
| P5 + kendi silis ocağı | + `silis_ocagi` | +2 | +6.000 | +30 / +10 | +11.400 | +6 |

A2 §1.8 kurulum süresi (santralsiz; ≤ 2 eşzamanlı inşaat, erken oyun çarpanı): ekmek zinciri **1,0 sa**, cam → pencere **1,2 sa** (t0 = 0); 7. günden sonra 10,0 / 12,0 sa; isteğe bağlı santral her zincire +0,4 sa ve ≈ +35.000 ₺. Bağlayıcı olan süre değil **nakit ve emir yuvasıdır**: hibe ₺50.000 + kit gıdası satışı ≈ 12.600 ₺ ekmek zincirini ilk 2 saatte karşılar (A2: saat 2'de hazine 41.710 ₺, santralli varyantta saat 3'te en düşük 30.781 ₺). Bot hedefi önerisi (A2): ekmek zinciri katılımdan ≤ 3 sim-saat; cam → pencere ≤ 6 sim-saat.

### 4.5 `dukkan` ek yapısı

| Alan | Değer | Kaynak |
|---|---|---|
| `yuva` | 1 | dikey §5.2; kimlik-listesi-v1 §2.3 |
| `olcekHucre` [S, M, L] | [1, 2, 3]. **Yer:** A2 §1.13 `mulk.olcekHucre.dukkan` der; T3 taslağı `mulk.perakende.olcek.olcekHucre`'ye yazar (doğrulayıcı `mulk.olcekHucre` satırlarını `yapiYuva` türleriyle eşler, ek yapı orada yok). **K3 seçer** | perakende §3.6; docs/12 §13 |
| Bedel S | ₺6.000 + 20 çelik + 8 parça + **4 pencere** (P-İthal) | dikey §5.10 |
| Bedel M / L (A1) | ₺15.000 / 27.000; 50 / 90 çelik; 20 / 36 parça; 10 / 18 pencere | ×2,5 / ×4,5 |
| Süre (S / M / L) | 4 / 6 / 8 sa | `yapiInsaSaati` 4 × 1 / 1,5 / 2 |
| `enFazlaIlBasina` | 6 | dikey §5.2 |
| İlçe başına | ≤ 2 (A2: `enFazlaIlcedeBasina: 2`; T3: `mulk.perakende.ilceBasinaEnFazla` ya da ek yapı şemasına alan: **K3 seçer**) | dikey §5.2 |
| Taban değer S | **11.280 ₺** (pencere 360 ₺); yalnız pencere ithal: 11.440 ₺ (perakende §3.2); hepsi ithal fiyatla: 11.866 ₺ (A2 §1.2) | |

**G7 önyükleme sorunu: dükkân bedelindeki pencere (A3 seçecek).** A2 §1.7:

| Seçenek | Veri | İlk dükkân nakit (indirimsiz / ilk-5 indirimiyle) | Not |
|---|---|---|---|
| **P-İthal** (taslağın ana sürümü) | `insaParasi` 6.000.000; `insaMaliyeti` {çelik 20.000, parça 8.000, **pencere 4.000**} | ₺6.000 + 1.600 pencere ithalatı + 20 çelik + 8 parça / ₺4.200 + 1.109 + 14 + 5,6 | `pencere` pazar kaydı var; ithalat emri 1 emir yuvası ve ≈ 1 sa; pencere talebini erken dünyaya taşır |
| **P-Yok** (**A2 sayıca önerisi**) | `insaParasi` 7.440.000; `insaMaliyeti` {çelik 20.000, parça 8.000} | ₺7.440 + 20 çelik + 8 parça / ₺5.208 + 14 + 5,6 | ithalat emri gerekmez; ilk dükkân akışı kısalır (A0-11); G8'de `insaMaliyeti.pencere` eklemek yalnız veri değişikliği; Y tüketicisi (pencere) G8'e kalır |

Üçüncü seçenek (T3): yeni oyuncu `baslangicStok`'una 4 `pencere`: mülk yeni oyuncu altınlarını etkiler; önerilmez.

## 5. Dükkân türleri (`mulk.perakende.dukkanTurleri[]`)

### 5.1 A0 S türleri

Hepsi **tür = veri**, ayrı kod yolu yok (dikey §5.1 B seçeneği). Kimlikler `kimlik-listesi.json` `dukkanTurleri`'nde var; mal listeleri `mallar[]`'a ve NPC pazar kaydına referanstır (perakende §12.1: pazar kaydı olmayan mal rafa konamaz).

| Kimlik | Ad | Aile | Ölçek (A0 / A1 hedefi) | Raf mal listesi (A0) | `tamCesit` (A0 etkin ↔ rapor) | Talep kalemi | Arsa izni | Kaynak |
|---|---|---|---|---|---|---|---|---|
| `bakkal` | Bakkal | çeşit | S / S → `market` | `gida`, `ekmek`, `un`, `sut`, `sut_urunu`, `sekerleme`, `findik_urunu`, `yakit` | 6 ↔ 6 | K1 | ticari ✓, konut ✓ | perakende §3.2, §5.1; dikey §5.3 |
| `firin` | Fırın | üretici | S / S–M | `ekmek`, `gida` | 2 ↔ 2 | K1 | ticari ✓, konut ✓ | dikey §5.3; perakende §5.1 |
| `sarkuteri` | Şarküteri | üretici | S / S–M | `sut`, `sut_urunu`, `gida` | **3 ↔ 4** (`et`, `zeytinyagi` A0'da yok) | K1 | ticari ✓ | perakende §5.1 |
| `sekerci` | Şekerci | üretici | S / S | `sekerleme`, `findik_urunu` | **2 ↔ 3** (`kuru_meyve` yok) | K1 | ticari ✓ | perakende §5.1 |
| `yapi_market` | Yapı Market | çeşit | S / S–L | `pencere`, `celik`, `parca`, `cam` | **4 ↔ 5** (`cimento` A0-ops, `kereste` yok) | K2 | ticari ✓, sanayi ○ (ana yol cephesi) | perakende §5.1, §5.2 |

- **`tamCesit` A0'da mal sayısına çekilir (A2 teyit).** A0'da mal olmayan `et`, `zeytinyagi`, `kuru_meyve`, `cimento` rafa konamaz; `tamCesit` > mal sayısı olursa çeşitlilik 1'e ulaşmaz. Parametredir; A1'de artırılır.
- **Raf listeleri tür başınadır.** Bakkal 8 mal, S raf yuvası 4: oyuncu hangi 4 malı koyacağını seçer; `tamCesit` 6 ile S'de çeşitlilik en çok 0,67 (perakende §3.3 bakkal çeşidi 0,7).
- **Ölçek başına sayılar** (`olcek` bloğu): raf yuvası 4 / 6 / 8; kasa 90 / 198 / 324 birim/sa; gider ₺132 / 204 / ≈330 saat (`giderMiliSaat`; ek yapıda bugün işletme gideri yok, para-yalnız gider, A2 §1.9); çekim çarpanı 1,0 / 1,6 / 2,4 (A1'de kullanılır); `olcekHucre` [1, 2, 3].
- **Fiyat kademeleri (A2 §1.9; `secim`, tutar yok):** 4 kademe, R çarpanı **0,85 (yalnız kampanya penceresi), 0,95, 1,05 (varsayılan), 1,15**; fiyat savaşı kendini cezalandırır (0,85 R'de dört senaryoda net eksi); üst sınır 1,15 R (ZP3 1,291 < alarm 1,30); bant [0,7; 1,4] parametre. Üç kademe seçeneği açık (A2 soru 8).
- **Dükkân ekonomisi (A2 §1.9):** fırın dükkânı (1,05 R) ilçede tek oyuncu iken net: 5 bin nüfus −52 ₺/sa; 20 bin +189; 50 bin +671; 100 bin ve üstü +727 (kasa dolu); geri ödeme şehir 12–15 sa, kasaba 17–21 sa, kasabada 3 dükkânla 56 sa (hedef ≤ 48 tutmaz; "kilit değil sonuç").
- **Açık saatler** (bakkal 06:00–24:00, fırın 05:30–20:00) ve tabela/vitrin **sunumdur** (T1/T2).

### 5.2 Raf grupları ve mal × kanal denetimi (A0, P4/P5 ile ilgili kısım)

Kanallar: **Raf** (dükkân türü), **Ü** (üretim yöntemi), **K** (kamu siparişi), **Y** (yapı maliyeti), **O** (ordu), **P** (NPC pazar), **N** (`NpcAlici` güvence). Raf listeleri perakende §5.2 matrisiyle uyumludur.

| Mal | Raf (tür) | Ü (yöntem) | K | Y | O | P | Sonuç |
|---|---|---|---|---|---|---|---|
| `un` | `bakkal` | `ekmek_firini` (A1: makarna, hamur işi, bisküvi) | | | | ✓ | Ü + H = 2 tür; tamam |
| `ekmek` | `firin`, `bakkal` | yok | okul ekmeği (A2 v0 listesi) | | | ✓ | H + K = 2 tür; **K listesine bağlı** |
| `kepek` | yok (ham yan ürün) | `kepek_gubresi`, `sut_kepekli` (P1) | | | | ✓ | A2: P + `kepek_gubresi`; N güvence isteğe bağlı |
| `cam` | `yapi_market` | `celik_dograma` | | | | ✓ | Ü + H = 2 tür; tamam |
| `pencere` | `yapi_market` | yok | onarım (v0 listesi) | `dukkan` (P-İthal) | | ✓ | H + Y = 2 tür; tamam (+K) |
| `sut` | `bakkal`, `sarkuteri` | yok (P1: `peynir_mandira`) | | | | ✓ | H; **Ü P1'e kalır** (G4 dışı) |
| `gubre` | yok (ham ara) | Tarla gübre dozu | | | | ✓ | Ü ×1 (+ yeni üretici yöntemler); mevcut mal |

Hâlâ rafsız, perakende çıkışsız: `elektronik`, `gubre`, `kepek` (P4/P5 kapsamı dışı).

### 5.3 A1: `market` ve `supermarket` (taslak; A0 içeriğine girmez)

| Alan | `market` (M) | `supermarket` (L) |
|---|---|---|
| `olcekAraligi` | M | L |
| `olcekHucre` | **2 bitişik hücre** | **3 bağlı hücre (S4-4, sahip kararı)**; `[1, 2, 2]` istisnası kapandı |
| Arsa | ticari ✓, konut ✗ | ticari ✓ + **cadde/ana yol cephesi**; sanayi ○ ana yol |
| Raf yuvası / `tamCesit` | 6 / 9 | 8 / 12 |
| Kasa, gider, çekim | 198 birim/sa, ₺204/sa, ×1,6 | 324 birim/sa, ≈₺330/sa, ×2,4 |
| Bedel (yapı) / süre | ₺15.000 + 50 çelik + 20 parça + 10 pencere / 6 sa | ₺27.000 + 90 çelik + 36 parça + 18 pencere / 8 sa |
| Ruhsat | yok | N14 kartı ve kota (A1) |
| Mal listesi (A1 hedefi) | bakkal ⊂ + `zeytinyagi`, `kuru_meyve`, `bal`, `cay` | market ⊂ + `kagit`, `bakliyat`, `hazir_giyim`, `elektronik` (küçük raf) |
| Yükseltme | `yukseltmeHedefi`: `supermarket` | yok |

Gelecek kimlikler "ileride"dir; rafa konmaları için önce mal olmaları gerekir. Ek yapılar bugün ölçeklenemez (`olcek > 0` reddedilir); `dukkan_yukselt` A1 komutudur.

### 5.4 `tezgah` (K0, açık karar)

`tezgah` kimlik listesinde A0'dır ama **"P1 ya da A1" kararı açık**. Taslak verisi: kamu pazar yeri yuvası (hücre yok); raf 2; kasa 20 birim/sa; çekim 0,6; mal "oyuncunun seçimi" (≤ 2); parasız, anında, hesap başına bir kez; gider ₺0. Çekirdekte kamu pazar yeri yerleşimi ve oyuncu seçimi mal listesi yok; bu yüzden bloğu **JSON'a girmez** (§8.4).

## 6. Çıkmaz mal denetimi (UA1) ve tüketici sayısı

Kural (üretim §2.4): her mal en az iki **farklı tür** tüketiciye sahip; yan ürün için Ü ≥ 1 ve N ≥ 1. A2 §1.11 (P dahil sayım) ile T3'ün katı sayımı (P hariç) yan yana:

| Mal | Ü | H (raf) | K | Y | O | N | Tür, kodda olanlarla (P hariç) | Tür, planlılarla (P hariç) | A2 (P dahil) | Sonuç |
|---|---|---|---|---|---|---|---:|---:|---:|---|
| `un` | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 3 | tamam |
| `ekmek` | 0 | 2 dükkân türü (1 tür) | planlı | 0 | 0 | 0 | 1 | 2 | 3 | **K'ya bağlı** (kamu siparişi v0 listesi) |
| `kepek` | 1 (`kepek_gubresi`; `sut_kepekli` P1) | 0 | 0 | 0 | 0 | isteğe bağlı | 1 | 2 | 3 | A2: P0'da iki tüketici = P + `kepek_gubresi`; N güvence isteğe bağlı |
| `cam` | 1 | 1 | 0 | 0 | 0 | 0 | 2 | 2 | 4 | tamam |
| `pencere` | 0 | 1 | planlı | 1 (`dukkan`, P-İthal) | 0 | 0 | 2 | 3 | 4 | tamam (P-Yok'ta Y G8'e kadar yok: A2 3) |
| `sut` | 0 (P1) | 2 dükkân türü (1 tür) | 0 | 0 | 0 | 0 | 1 | 1 (+Ü P1'de 2) | 2 (P1 ile 3) | **G4 dışı:** Ü `peynir_mandira` P1'de |
| `gubre` | 1 (Tarla gübre dozu) | 0 | 0 | 0 | 0 | isteğe bağlı | 1 | 2 | 3 | mevcut mal |

"Planlı" kodda olmayan tüketicidir. "Tür" sayımında aynı türden birden çok tüketici tek sayılır.

- **Kamu siparişi v0 (A2 §1.9):** `ekmek` 100 birim (61,80 ₺/birim), `gida` 50 (72,10), `pencere` 10 (370,80), `celik` 30 (123,60), `parca` 20 (185,40); fiyat 1,03 R; vade 3 gün; ilçe başına haftada ≤ 5 sipariş (ekmek 2, gıda 1, pencere 1, çelik 1; parça yedek); ilk kabul eden alır. Kasa kuralları (`mulk.kasa`) hacmi sınırlar.
- **P4/P5 dışı boşluklar (bilgi):** `findik` (Ü yok; P1 `findik_kavurma`), `findik_urunu`, `sekerleme`, `sut_urunu`. A2 `findik` için "P1'de tamam" der; UA1 derleme uyarısı (üretim §9.1 A0-3).
- **Bayat ekmek** döngüsü G6 dışıdır (§3.1).

## 7. Taban fiyatlar ve sayılar: A2 tek kaynak

### 7.1 Taban fiyatlar

`un` 50, `ekmek` 60, `cam` 95, `pencere` 360, `kepek` 18, `sut` 40: `icerik.json` = `kimlik-listesi.json` × 1000 (A2 §1.2: 24 malda fark yok). **Değişiklik önerisi yok.**

### 7.2 Sayılar: A2 (geçerli) ve tarihçe

Önceki T3 taslağının yan yana tablosu A2 §1.14'te satır satır karşılaştırıldı; sapmalar aşağıdaki gibi **kapandı**:

| Konu | Rapor (dikey, üretim, perakende) = tarihçe | **A2 afdf29f (geçerli)** | T3 taslağı | Durum |
|---|---|---|---|---|
| `degirmen` | 150 un + 30 kepek | **165 un + 33 kepek** | A2 | kapandı (K5) |
| `ekmek_firini` | 150 un + 22 yakıt + 15 elektrik → 225 ekmek | **165 un + 20 yakıt + 15 elektrik → 250 ekmek** | A2 | kapandı; 250 ↔ 243 sorusu açık (§3.2) |
| `kepek_gubresi` | yok | 100 kepek + 5 elektrik → 18 gübre | A2 | kapandı |
| `sut_kepekli` | 50 tahıl + 60 kepek + 5 elektrik → 82 süt + 4 gübre | aynı | aynı | P1'de anlamlı |
| `cam_firini` | 60 silis + 18 yakıt + 20 elektrik → 50 cam (ev sahibi `celikhane`) | **60 silis + 16 yakıt + 18 elektrik → 50 cam; `parca_fabrikasi`** | A2 | kapandı (K4) |
| `celik_dograma` | 24 çelik + 32 cam + 6 parça + 15 elektrik → 27 | **24 çelik + 32 cam + 5 parça + 15 elektrik → 28** | A2 | kapandı |
| işçi, bakım, kirlilik | tablolar | aynı | aynı | `isci` 5 / 8 / 3 / 5 / 5 / 7; bakım 800 / 800 / 500 / 500 / 1000 / 1000; kirlilik 20 / 20 / 10 / 10 / 60 / 20 |
| Enerji | santral zorunlu | **şebeke; santral isteğe bağlı** (fiyat 10,35 ₺ / 103,5 ₺; `kasaPayiPpm` 120.000) | A2 | kapandı (K3) |
| Dükkân S bedeli | P-İthal | P-Yok sayıca öneri (₺7.440) | P-İthal (ana) | **A3 seçecek** |
| Dükkân gider, kasa, raf | 132 / 204 / 330; 90 / 198 / 324; 4 / 6 / 8 | aynı | aynı | |
| `talep1000Saat` | gıda 120; yedi mal yok | **gıda 90, ekmek 60, un 10, süt 20, süt ürünü 20, şekerleme 6, fındık ürünü 3, yakıt 15, pencere 8, cam 4, çelik 6, parça 5** (cimento 6, A0-ops) | A2 | kapandı (K3 sepeti 200 sabit) |
| `yerelOlcek`, fiyat bandı, esnaf | 50; [0,7; 1,4]; %25; 1,12 R | aynı; fiyat kademeleri 4 | A2 | `yerelOlcek` kalibre değil **(A2 teyit)** |
| Kamu tavanı | ≤ 1,10 R | uygulanan 1,035 R | referans | |
| Tesis tabanı | zincir üstün (K/U) | **yalnız tahıl tabanında üstün**; tesis/işçi/hücre tabanında geride; yedek düğme G2 | A2 | eklendi (§3.2) |

### 7.3 A2'nin açık sayısal soruları (baş lider/A3)

Santral vaadi (O5 + O3); ekmek çıktısı 250 ↔ 243; yedek düğme G2 ve tetik eşiği M < %30; cam/doğrama üst bant ↔ rapor; dükkân P-İthal ↔ P-Yok; `kasaPayiPpm` %12 ve kamu siparişi listesi; fiyat kademeleri 4 ↔ 3. Bu belge hiçbirini seçmez (A2 §4).

## 8. JSON taslak blokları

Dosyalara **yazılmadı.** Bloklar A2 afdf29f değerleridir (A2 §1.13 ile satır satır karşılaştırıldı: altı yöntem birebir aynı). Geçerlilik kanıtı §12'dedir.

### 8.1 `icerik.json`: `yontemler[]` sonuna eklenecekler

Sıra kalıcıdır (`yontemler[24]` … `[29]`). G6 ilk dördü, G8 son ikiyi ekler (yamalar §9.4).

```json
{ "id": "degirmen", "ad": "Değirmen",
  "girdiler": { "tahil": 200000, "elektrik": 12000 }, "ciktilar": { "un": 165000, "kepek": 33000 }, "isci": 5000,
  "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20, "mulkKipi": true },
{ "id": "ekmek_firini", "ad": "Ekmek Fırını",
  "girdiler": { "un": 165000, "yakit": 20000, "elektrik": 15000 }, "ciktilar": { "ekmek": 250000 }, "isci": 8000,
  "bakim": { "parca": 800 }, "kirlilikPpmSaat": 20, "mulkKipi": true },
{ "id": "kepek_gubresi", "ad": "Kepekten Gübre",
  "girdiler": { "kepek": 100000, "elektrik": 5000 }, "ciktilar": { "gubre": 18000 }, "isci": 3000,
  "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10, "mulkKipi": true },
{ "id": "sut_kepekli", "ad": "Kepekli Süt Besisi",
  "girdiler": { "tahil": 50000, "kepek": 60000, "elektrik": 5000 }, "ciktilar": { "sut": 82000, "gubre": 4000 }, "isci": 5000,
  "bakim": { "parca": 500 }, "kirlilikPpmSaat": 10, "mulkKipi": true },
{ "id": "cam_firini", "ad": "Cam Fırını",
  "girdiler": { "silis": 60000, "yakit": 16000, "elektrik": 18000 }, "ciktilar": { "cam": 50000 }, "isci": 5000,
  "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 60, "mulkKipi": true },
{ "id": "celik_dograma", "ad": "Çelik Doğrama",
  "girdiler": { "celik": 24000, "cam": 32000, "parca": 5000, "elektrik": 15000 }, "ciktilar": { "pencere": 28000 }, "isci": 7000,
  "bakim": { "parca": 1000 }, "kirlilikPpmSaat": 20, "mulkKipi": true }
```

### 8.2 `icerik.json`: `tesisTurleri[].yontemler` listelerinin sonuna eklenecekler

İlk eleman (varsayılan yöntem, `yontemler[0]`) **değişmez**. `celikhane` listesi değişmez. `parca_fabrikasi` sırası A2 §1.13'tendir; `yontemler[]` sırası (`cam_firini` [28], `celik_dograma` [29]) ayrıdır.

```json
"gida_fabrikasi":  ["standart_gida_isleme", "degirmen", "ekmek_firini"],
"ahir":            ["ahir_besi", "kepek_gubresi", "sut_kepekli"],
"parca_fabrikasi": ["standart_parca", "otomatik_hat", "celik_dograma", "cam_firini"]
```

### 8.3 `parametreler.json`

**(a) `mulk.ekYapilar.dukkan`:** mevcut `mulkEkYapiSema` ile uyumlu (P-İthal; yeni alan yok).

```json
"dukkan": {
  "ad": "Dükkân", "yuva": 1, "insaSaati": 4, "insaParasi": 6000000,
  "insaMaliyeti": { "celik": 20000, "parca": 8000, "pencere": 4000 },
  "enFazlaIlBasina": 6
}
```

**(b) `mulk.perakende`:** yeni blok; şema K3'ün (A2 §1.13 ve §1.9 değerleri; A2'nin taslağı yerel pazar alanlarını da bu blokta tutar; K3 `mulk.yerelPazar` ayrımını yaparsa `yerelOlcek`, `esnaf*`, `cesitKatsayiPpm`, `ilceSinifiNufus`, `talep1000Saat`, `takvim*`, `bayram` oraya taşınır). `cimento` A0-ops mal olduğundan talepte yoktur.

```json
"perakende": {
  "surum": 1,
  "fiyatBandiPpm": [700000, 1400000],
  "fiyatKademeleriPpm": [850000, 950000, 1050000, 1150000],
  "varsayilanKademe": 2,
  "kampanyaKademesi": 0,
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
  "yerelOlcek": 50,
  "esnafTabaniPpm": 250000,
  "esnafFiyatPpm": 1120000,
  "cesitKatsayiPpm": 250000,
  "ilceSinifiNufus": { "kirsal": 10000, "kasaba": 40000, "sehir": 120000 },
  "talep1000Saat": { "gida": 90, "ekmek": 60, "un": 10, "sut": 20, "sut_urunu": 20, "sekerleme": 6,
                     "findik_urunu": 3, "yakit": 15, "pencere": 8, "cam": 4, "celik": 6, "parca": 5 },
  "takvimGrubu": { "gida": ["gida", "ekmek", "un", "sut", "sut_urunu"], "tatli": ["sekerleme", "findik_urunu"],
                   "yakit": ["yakit"], "yapi": ["pencere", "cam", "celik", "parca"] },
  "takvimPpm": {
    "gida":  [1030000, 1020000, 1010000, 1000000, 990000, 970000, 960000, 970000, 1000000, 1020000, 1020000, 1010000],
    "tatli": [1100000, 1050000, 980000, 950000, 900000, 850000, 820000, 850000, 950000, 1100000, 1200000, 1250000],
    "yakit": [1400000, 1400000, 1200000, 950000, 750000, 650000, 600000, 600000, 750000, 950000, 1300000, 1450000],
    "yapi":  [650000, 650000, 900000, 1150000, 1300000, 1250000, 1200000, 1200000, 1200000, 1100000, 800000, 600000]
  },
  "bayram": {
    "tatli": { "oncesiGun": 7, "oncesiPpm": 1800000, "sonrasiGun": 28, "sonrasiPpm": 800000 },
    "gida":  { "oncesiGun": 5, "oncesiPpm": 1250000, "sonrasiGun": 10, "sonrasiPpm": 875000 }
  },
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

`talep1000Saat` birimi mili-birim/1000 kişi/sa (mevcut `nufus.tuketim1000Saat` ile aynı). Formül (A2): `Q = taban[sınıf][mal] × takvim[grup][ay] × bayram[grup]`, `taban = talep1000Saat × nüfusEşdeğeri × yerelOlcek ÷ 1000`; hepsi tamsayı/ppm. Denetimler (betik): her takvim satırı toplamı tam 12.000.000; bayram `Ws = 1.000.000 − ⌈Do·(Wo − 1.000.000)/Ds⌉` eşitliği sağlanır.

**(c) Şebeke, kamu siparişi ve yedek düğme (A2 §1.13; şema A3 ve K3'ün; yama yok):**

```json
"sebeke": { "surum": 1, "mal": "elektrik", "tavanOraniPpm": 1000000 },
```

A3'ün ön yanıtının biçimidir. A2'nin taslağı daha geniştir ve **uzlaştırılmalıdır** (§11-3): `{ "elektrik": true, "yakit": true, "fiyatKaynagi": "kamuFiyatTavani", "lavaboKalemi": "sebeke", "kasaPayiPpm": 120000 }` (fiyat = referans × `kamuIthalatCarpaniPpm` = 1,035; kasa payı ödemenin %12'si ilçe kamu kasasına, kalanı lavabo).

```json
"kamuSiparisi": {
  "malFiyatPpm": 1030000,
  "boyutMili": { "ekmek": 100000, "gida": 50000, "pencere": 10000, "celik": 30000, "parca": 20000 },
  "ilcedeHaftalikEnFazla": 5, "vadeGun": 3
},
"yontemGecersizKilma": { "standart_gida_isleme": { "ciktiPpm": 1000000 } }
```

`yontemGecersizKilma` varsayılan kapalıdır (`ciktiPpm` 1.000.000 = etkisiz); G2 açılırsa 750.000 (A2 §1.3-B2, tetik M < %30). A2'nin doğrulayıcı önerileri: `kasaPayiPpm ≤ 1.000.000`; `kamuSiparisi.malFiyatPpm ≤ kamuIthalatCarpaniPpm`; `fiyatKademeleriPpm` bant içinde ve artan; her yöntem ya `mulkKipi` ya bölge listesinde.

### 8.4 Seçenek ve karar bekleyen bloklar (ana sürüme girmez)

**(a) Tarihçe: rapor değerleri** (karar K5 ile A2 değerleri geçerlidir; yalnız kayıt):

```json
{ "id": "degirmen", "girdiler": { "tahil": 200000, "elektrik": 12000 }, "ciktilar": { "un": 150000, "kepek": 30000 } },
{ "id": "ekmek_firini", "girdiler": { "un": 150000, "yakit": 22000, "elektrik": 15000 }, "ciktilar": { "ekmek": 225000 } },
{ "id": "cam_firini", "girdiler": { "silis": 60000, "yakit": 18000, "elektrik": 20000 }, "ciktilar": { "cam": 50000 } },
{ "id": "celik_dograma", "girdiler": { "celik": 24000, "cam": 32000, "parca": 6000, "elektrik": 15000 }, "ciktilar": { "pencere": 27000 } }
```

**(b) P-Yok dükkân bedeli** (A3 seçerse):

```json
"dukkan": { "ad": "Dükkân", "yuva": 1, "insaSaati": 4, "insaParasi": 7440000,
  "insaMaliyeti": { "celik": 20000, "parca": 8000 }, "enFazlaIlBasina": 6 }
```

**(c) `tezgah` iskeleti (karar sonrası):**

```json
{ "id": "tezgah", "ad": "Açılış Tezgâhı", "aile": "tezgah", "tamCesit": 2, "mallar": [],
  "talepKalemi": "K1", "olcekAraligi": [], "hucre": 0,
  "rafYuvasi": 2, "kasaMiliSaat": 20000, "cekimCarpaniPpm": 600000, "giderMiliSaat": 0 }
```

**(d) A1 `market` ve `supermarket`:**

```json
{ "id": "market", "ad": "Market", "aile": "cesit", "tamCesit": 9, "talepKalemi": "K1",
  "olcekAraligi": ["M"], "yukseltmeHedefi": "supermarket",
  "arsaIzin": { "ticari": true, "konut": false, "sanayi": false, "cadde": false } },
{ "id": "supermarket", "ad": "Süpermarket", "aile": "cesit", "tamCesit": 12, "talepKalemi": "K1",
  "olcekAraligi": ["L"], "olcekHucre": [1, 2, 3], "ruhsat": true,
  "arsaIzin": { "ticari": true, "konut": false, "sanayi": true, "cadde": true } }
```

(`mallar` listeleri A1'de mal kimlikleri geldiğinde yazılır, §5.3.) Süpermarket `olcekHucre` sahip kararıyla 3 hücredir.

**(e) Düşen T3 seçenekleri:** `besi_kepekli` (ikinci kepek tüketicisi; A2 `kepek_gubresi`'ni seçtiği için düştü) ve `sut_sigirciligi` (süt zinciri P1).

## 9. K3 için şema ve bayrak girdileri

Sınır (K3 keşfi ve Tasarım lideri): K3 `packages/veri/src/**` ve testlerini yazar; T3 `icerik.json`, `parametreler.json` **değerlerini** ve `kimlik-listesi.json`'u yazar. `sema.ts` `.strict()` olduğundan yeni alanlar önce K3'ün şema dalında isteğe bağlı olarak açılır, T3 değer dalı onun üstüne gelir. Sıra: G3b → K3'ün G6 şema dalı → T3 değer dalı.

### 9.1 G6: `YontemTanimi.mulkKipi?` ve yöntem kimlik listesi

Altı yöntemin hepsi `mulkKipi: true` (bölge kipi altınları ve botlar etkilenmesin; derleyici parsel fikstürü yokken bu yöntemleri tür listesinden süzer, indeksler sabit kalır; K6). Kanıt (T3 deneyi): yöntemler bayraksız eklenince `mal-izdusumu-kanit.test.ts` 4 test kırılır ("bilinmeyen mal: un"; 14 mallı izdüşüm içeriği); `botlar/src/tablo.ts` `ureticiTurler` tüm `tur.yontemler`'i tarar. **Yöntem kimlik listesi (K2):** biçim ve yer K3'ün; T3 varsayımı §2.2'de.

### 9.2 G7: `mulk.perakende`, şebeke ve kamu siparişi

| Blok | Alan | Değer | Kaynak |
|---|---|---|---|
| `perakende` | `fiyatBandiPpm`, `fiyatKademeleriPpm`, `varsayilanKademe`, `kampanyaKademesi` | [700000, 1400000]; [850000, 950000, 1050000, 1150000]; 2; 0 | dikey §5.5; A2 §1.9 |
| | `fiyatDegisimEnAzSaat`, `gunlukFiyatDegisimEnFazla`, `ilceBasinaEnFazla` | 6, 4, 2 | dikey §5.2, §5.5 |
| | `olcek.*` | `olcekHucre` [1, 2, 3]; `rafYuvasi` [4, 6, 8]; `kasaMiliSaat` [90000, 198000, 324000]; `giderMiliSaat` [132000, 204000, 330000]; `cekimCarpaniPpm` [1000000, 1600000, 2400000] | perakende §3.2, §3.4; A2 §1.9 |
| | `yerelOlcek`, `esnafTabaniPpm`, `esnafFiyatPpm`, `cesitKatsayiPpm` | 50, 250000, 1120000, 250000 | canlı-dünya §3.4, §4.2; dikey §5.6; **(A2 teyit: kalibre değil)** |
| | `ilceSinifiNufus` | kırsal 10.000, kasaba 40.000, şehir 120.000 | A2 §1.9 (**K3 Soru 6 ve T3'ün "nüfus kaynağı eksik" sorusuna A2'nin cevabı**; O3 gerçek nüfus verisi gelince değişir) |
| | `talep1000Saat`, `takvimGrubu`, `takvimPpm`, `bayram` | §8.3b | A2 §1.9 |
| | `dukkanTurleri[]` | 5 A0 türü | §5.1 |
| `sebeke` | `surum`, `mal`, `tavanOraniPpm` (+ A2: `kasaPayiPpm` 120000) | 1, `elektrik`, 1000000 | A3 ön yanıtı; A2 §1.13 |
| `kamuSiparisi` | `malFiyatPpm`, `boyutMili`, `ilcedeHaftalikEnFazla`, `vadeGun` | 1030000; ekmek 100 / gida 50 / pencere 10 / çelik 30 / parça 20; 5; 3 | A2 §1.9 |
| `yontemGecersizKilma` | `standart_gida_isleme.ciktiPpm` | 1000000 (kapalı); G2 için 750000 | A2 §1.3-B2 |
| para defteri | `musluk.yerelNpc`, `lavabo.sebeke` | isteğe bağlı kalemler (blok açıkken tembel yazılır; eski mülk görüntüleri yüklenebilmeli, K3 keşfi) | A2 §1.10 |

**Doğrulayıcı kuralları (K3):** `mallar[]` kimlikleri `mallar[]`'da var **ve** pazar kaydı var (betikte denendi: 12 farklı raf malı geçer); `tamCesit` ≤ `mallar` sayısı; tür kimlikleri mal kimlikleriyle kesişmez; `dogrulaKimlikKilidi` `param.mulk.perakende.dukkanTurleri` kimliklerini kimlik listesi `dukkanTurleri` ile denetlemeli (bugün bağlı değil); `takvimPpm` her satır toplamı 12.000.000; `fiyatKademeleriPpm` bant içinde ve artan; `kasaPayiPpm ≤ 1.000.000`; `kamuSiparisi.malFiyatPpm ≤ kamuIthalatCarpaniPpm`; yöntem oranı bandı (uyarı). `mulkEkYapiSema` `dukkan` için yeni alan istemez (ilçe başına sınır ve `olcekHucre` yeri hariç, §4.5).

### 9.3 Test etkisi (K3 listesi; T3 deneyinin bulguları)

| Test | Neden kırılır | Beklenen düzeltme |
|---|---|---|
| `cekirdek/test/mulk-yapilar.test.ts:50` | "6 ek yapı" listesi `dukkan` ile 7 olur | beklenen liste güncellenir (G7) |
| `cekirdek/test/mal-izdusumu-kanit.test.ts` (4 test) | yeni yöntemler: 14 mallı izdüşüm içeriği `un` girdisini tanımıyor. `dukkan` tek başına yalnız "mülk kipi: P3 öncesi mülk dünyası göçer" testini (1) ve `mulk-yapilar`'ı kırar | `mulkKipi` süzmesi ve yöntem izdüşümü (G6; K3, Kod lideri teyit etti); ek yapı göç beklentisi (G7) |
| `veri/test/*` | **kırılmaz** (şema varsayımıyla 9 dosya 172 test yeşil) | sayım testleri (`yontemler` 24 → 30) K3'te |

### 9.4 G6 ve G8 içerik yamaları (depo dışı; commit yok)

`SP/t3/g6-icerik.patch` (G6: 4 yöntem + `gida_fabrikasi` ve `ahir` listeleri + yöntem kimlik listesi bölümü) ve `SP/t3/g8-icerik.patch` (G8: `cam_firini` ve `celik_dograma` + `parca_fabrikasi` listesi + kimlik listesine 2 satır; **G6'nın üstüne** uygulanır). Okuma notu `SP/t3/g6-icerik-notu.md`. Yamalar `SP/t3/veri.ts`'ten (A2 afdf29f) üretilir (`g6-uret.ts`, `g8-uret.ts`). `git apply --check` güncel `entegrasyon` üzerinde (de9959c): G6 temiz, G8 G6'nın üstünde temiz. Şema varsayımıyla (`g6-sema-varsayim.patch`; yamaya girmez) `dogrulaVeriPaketi` ve `dogrulaKimlikKilidi` geçerli, `veri/test` 9 dosya 172 test yeşil. Yamadaki altı yöntem A2 §1.13'ün JSON bloğuyla **birebir aynıdır**.

## 10. Geri dönüşü zor kararlar

| # | Karar | Neden zor | T3 notu | Durum |
|---|---|---|---|---|
| 1 | Yöntem mi tesis türü mü | canlı tesisler `tesis.tur`, `tesis.yontem` taşır; kimlik listesi önek kuralı | yöntem + ev sahibi | **kapandı (K1)** |
| 2 | `cam_firini` ev sahibi | yöntemin tesis türü kalıcı (üretim K-8) | `parca_fabrikasi` | **kapandı (K4)**; A2 ZA-3 |
| 3 | Yöntem kimlikleri ve **sırası** (`yontemler[24..29]`), ayrı yöntem kimlik listesi | yalnız sona ekleme; altın ve bot indeksleri | §2.2 sırası | **kapandı (K2)**; biçim K3'te |
| 4 | `dukkan` `yuva` 1 ve `olcekHucre` [1, 2, 3] (süpermarket 3) | doğrudan kurulum ayak izini baştan alır | sahip kararı uygulandı | kapandı |
| 5 | `mulk.perakende`, `sebeke` alan adları ve `kasaPayiPpm` anlamı | para defteri ve şema | §8.3 | K3, A3 |
| 6 | Dükkân bedelinde pencere (P-İthal ↔ P-Yok) | yalnız veri; ilk dükkân akışı ve rehber adımı buna bağlı | A2 sayıca P-Yok; T3 ana P-İthal | **A3 seçecek** (A2 ZA-9) |
| 7 | Tarif sayıları (A2) | yayımlandıktan sonra değişim bot dengesini kırar (A2 ZA-2) | A2 geçerli | **kapandı (K5)**; 250 ↔ 243 açık |
| 8 | `mulkKipi` bayrağı (şema) | `YontemTanimi` alanı kalıcı | evet | **kapandı (K6)** |
| 9 | Enerji şebekeden ve fiyat kuralı | KD ve oran bandı; lavabo kalem adı | K3 | **kapandı (K3)**; A2 ZA-1 |

Kolay geri dönüşlüler (kilitlemeyin): yöntem oranları (veri), `tamCesit`, fiyat kademeleri, talep değerleri, `giderMiliSaat`, `yerelOlcek`, `cekimCarpaniPpm`, `kasaPayiPpm`.

## 11. Açık sorular

Önceki sürümün 16 sorusundan **kapananlar** "kapandı (karar)" ile, yeni ve kalan sorular açık işaretlidir.

1. ~~Yöntem mi, tesis türü mü?~~ **Kapandı (karar K1):** yöntem + ev sahibi; seçenek yalnız tarihçe.
2. **Açık (A3/K1/K2): yöntem seçimi akışı.** yapı kurulunca varsayılan `yontemler[0]`; "Değirmen kur" tek adım olacaksa `yapi_yerlestir`'e isteğe bağlı `yontem` alanı mı (protokolde yalnız ekleme), istemcide kurulum sonrası yöntem seçimi mi? `yontem_degistir` bedelsiz ve anlıktır; "yeniden donatım %20 + 6 sa" (üretim §7.1) Alfa-1.
3. **Açık (A3/K3): şebeke kapsamı ve bloğu.** `mulk.sebeke` yalnız `elektrik` mi (A3 ön yanıtı) yoksa `elektrik` ve `yakit` mi (A2: yakıt da şebekeden, 103,5 ₺)? `kasaPayiPpm` %12 (A2) blokta mı kamu kasası kuralında mı? Şebeke fiyatı canlı referans mı taban mı (A2 soru 6)?
4. ~~`cam_firini` ev sahibi~~ **Kapandı (karar K4):** `parca_fabrikasi`.
5. ~~A2 ön önerisi mi rapor değerleri mi?~~ **Kapandı (karar K5):** A2. **Açık kalan:** fırın çıktısı 250 ↔ 243 (A2 soru 2).
6. ~~Kepek ikinci tüketici~~ **Kapandı (A2 §1.6):** NPC pazar kaydı + `kepek_gubresi`; `NpcAlici` güvence isteğe bağlı.
7. `sut_kepekli` G6'da mı? **Kısmen kapandı (A2):** P1'de anlamlı; veri satırı G6 yamasında (Y-37). A3 şartnamesi karar verir.
8. **Açık (A3/baş lider): dükkân pencere bedeli** P-İthal ↔ P-Yok.
9. **Açık (sahip/baş lider): `tezgah`** (K0), P1 mi A1 mi.
10. **Açık (A2 teyit): `tamCesit` A0 değerleri:** sarkuteri 3, sekerci 2, yapi_market 4 (mal sayısı).
11. ~~Raf-talep eşleşmesi~~ **Kapandı (A2 §1.9):** yedi mala `talep1000Saat` verildi.
12. Kamu siparişi v0 mal listesi **Kısmen kapandı:** A2 önerisi `ekmek`, `gida`, `pencere`, `celik`, `parca` (§6); baş lider onayı bekliyor.
13. İlçe nüfusu kaynağı **Kısmen kapandı:** A2 `ilceSinifiNufus` (10.000 / 40.000 / 120.000); O3 gerçek nüfus verisi gelince yeniden kalibre (A2 soru 7).
14. **Açık (K3): yapı market "oyuncu alıcı"** (toplu alım) aklama riski; T3 verisine girmez (`talepKalemi: "K2"` yalnız NPC talebi).
15. **Açık (A3): süpermarket verisi A0 içeriğine girsin mi?** T3 önerisi: A1'e kadar `dukkanTurleri` yalnız 5 A0 türünü içersin.
16. **Açık (K3/baş lider): çıkmaz mal (P4/P5 dışı)** `findik`, `findik_urunu`, `sekerleme`, `sut_urunu`: UA1 uyarısı mı, P1'e kadar hata mı? A2: `findik` "P1'de tamam".
17. **Açık (A1/K3): yöntem sayısı sınırı** (üretim §7.4: tür başına ≤ 10): `gida_fabrikasi` 3 yöntemde; A1'de 18. K-7 A1 kararı.
18. **Açık (K3): `mulk.olcekHucre.dukkan` (A2) ↔ `mulk.perakende.olcek.olcekHucre` (T3)** ve ilçe başına dükkân sınırının yeri (§4.5).
19. **Açık (baş lider): santral vaadi** O5 (+ O3), `standart_gida_isleme` yedek düğmesi ve tetik eşiği (§7.3).

## 12. Yöntem ve doğrulama

**Betikler** (`SP/t3/`, depoda yok; yeniden üretim: temiz worktree kökünde `T3_KOK=$PWD pnpm exec tsx <betik>`):
- `veri.ts`: tek veri kaynağı (A2 afdf29f değerleri; rapor değerleri tarihçe).
- `hesap.ts`: katma değer, ölçek türevi, tesis bedeli, zincir yatırımı, tüketici matrisi (§3.2–§3.3, §4.2, §4.4).
- `dogrula.ts`: blokları **bellekte** `icerik.json` ve `parametreler.json` ile birleştirir; `dogrulaVeriPaketi` (harita `sentetik-50.json`), `dogrulaKimlikKilidi`, `icerikDerle` çağırır; `mulk.perakende` için elle denetimler yapar (mal kimliği ve pazar kaydı var, `tamCesit` ≤ mal sayısı, ad alanı kesişmez, dükkân türü kimlik listesinde, yöntem kimliği çakışmaz, takvim satır toplamları 12.000.000, bayram `Ws` eşitliği, kamu siparişi fiyatı ≤ 1,035 R).
- `g6-uret.ts`, `g8-uret.ts`: yamaları üretir (§9.4).

**Sonuçlar (taban de9959c, A2 afdf29f):**
- `dogrulaVeriPaketi`, `dogrulaKimlikKilidi`: **geçerli**; `icerikDerle`: **tamam**; perakende ve kimlik denetimi: **temiz** (24 mal, 6 yöntem, `parca_fabrikasi` 4 yöntemle).
- Yamalar: `git apply --check` G6 ve (G6 üstünde) G8 **temiz**; şema varsayımıyla `veri/test` 9 dosya 172 test **yeşil** (`--poolOptions.forks.singleFork`; bu vitest sürümünde `--maxWorkers=1` çakışma hatası verir).
- Önceki sürümdeki geçici dosya birleştirmesi (sanayi/pazar regresyon, göç, kimlik kilidi paketi, özet testleri yeşil; `mulk-yapilar` 1 ve `mal-izdusumu-kanit` 4 beklenen kırık) bu sürümde tekrarlanmadı: değişen yalnız tarif sayıları ve ev sahibi listesidir; çekirdek testleri koşulmadı.
- `icerik.json`, `parametreler.json`, `kimlik-listesi.json`: **değişmedi**.

**Sınırlamalar.** (1) Katma değer taban fiyatla hesaplanır; ithalat, şebeke, bakım ve işletme dahil kanal hesabı A2'nindir. (2) İmar (kullanım türü) kodda yok; §4.3'ün imar sütunu planlıdır. (3) Botlar ve ölçüm testleri koşulmadı (O1/O2). (4) A3'ün şartnamesi (`mulk.sebeke` biçimi) baş lider onayına kadar ön bilgidir.
