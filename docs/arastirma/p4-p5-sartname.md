# P4/P5 uygulama şartnamesi (G4): ekmek zinciri, yerel pazar kanalı, dükkân, şebeke elektriği ve cam → pencere

> **Durum.** 1 Ekim 2026, Sprint A0-02, görev G4 (Ar-Ge, A3). Taban: `entegrasyon` = `d28447d`; bütün `dosya:satır` göndermeleri bu tabana göredir. Bu belge kod yazmaz; K3'ün (çekirdek, tek yazar) **yorum yapmadan** kodlayabileceği kesinlikte şartnamedir. Baş lider onayı olmadan çekirdek işi başlamaz (docs/10 §5A).
>
> **Girdiler ve atıf biçimi.**
> - **A2** (sayıların tek kaynağı): `docs/arastirma/p4-p5-ekonomi.md`, dal `takim/a2/p4-p5-ekonomi`, **commit `eab8fcc`** (son teslim; tablolar fırın 240'a göre yeniden üretilmiş; §1.13 şeması bu şartnameye bırakılmıştır; atıflar bölüm numarasıyladır). `A2 §n` = o raporun bölümü. Bu belge sayıları **kopyalamaz**: yapı, parametre adı ve şema kesindir; değerleri T3 A2'nin §1.4, §1.9 ve §1.13 bloklarından işler. (Atıf haritası: §1.3-B1 şebeke/santral/kasa payı; §1.3-B2 zincir ↔ standart ve tetik; §1.3-B3 NPC derinliği; §1.4 yöntem satırları; §1.6 kepek; §1.7 yapı; §1.8 süre; §1.9 dükkân/kademe/talep/kamu tavanı/kamu siparişi; §1.10 `yerelNpc` ve `lavabo.sebeke`; §1.11 çıkmaz mal; §1.12 senaryo ve ev sahibi; §1.13 veri; §1.14 T3 sapmaları.) İki istisna: şemayı açıklayan örnek değerler ve test vektörleri (Ek B; çekirdek dışı betikle üretildi).
> - **T3** (içerik taslağı): `takim/t3/p4-p5-icerik`, commit `0561728`, `docs/arastirma/p4-p5-icerik-taslagi.md` (621 satır; `git show` ile okundu). `T3 §n` = o belgenin bölümü. T3'ün sekiz karar maddesi §19.B'de, 16 açık sorusu §21.B'de tek tek karşılanır.
> - **K3 keşif notu** (`takim/k3-kesif.md`): 12 soru §19.A'da tek tek yanıtlı.
>
> **Ad notu (baş lider).** İşler **G6** (ekmek zinciri + şebeke elektriği), **G7** (yerel pazar kanalı + `dukkan` S; iki alt parça: **G7a** kanal, **G7b** dükkân) ve **G8** (cam → pencere + yapı market) diye anılır. "P4a" adı yalnız `e1080dd` commit'indeki ölçek işine aittir (docs/06 §15.10).
>
> **İşaretler.** `(doğrulanmadı)` = bu belgenin yazımında kanıtlanmamış iddia. `(doğrulandı: yöntem)` = bu çalışmada çekirdekte ya da betikle denenmiş (geçici test, commit'lenmedi, silindi; ya da BigInt referans betiğiyle).

## İçindekiler

0. Özet, kapsam, kapsam dışı
1. Kaynaklar ve kilitler
2. Mevcut kod durumu (`d28447d`) ve bu çalışmada doğrulanan bulgular
3. Kimlikler (3.5: yöntem kimlik listesi)
4. Veri şeması ve doğrulayıcı
5. G6: ekmek zinciri ve şebeke enerjisi (5.2: şebeke enerjisi)
6. G7a: yerel pazar kanalı
7. G7b: `dukkan` S
8. G8: cam → pencere ve yapı market
9. Komutlar ve ret iletileri
10. Protokol alanları
11. Serileştirme ve göç
12. Para korunumu ve para arzı panosu
13. Bölge kipi altınlarına etkisizlik kanıt planı
14. Değişmez tablosu
15. Botlar ve ölçüm
16. Test listesi
17. Uygulama sırası ve kabul ölçütleri
18. Rollere istek listesi
19. A) K3 keşif notunun 12 sorusu; B) baş liderin T3 karar maddeleri
20. Geri dönüşü zor kararlar
21. Açık sorular (B: T3'ün 16 sorusu)
Ek A. Değişen dosya ve fonksiyonlar (`dosya:satır`)
Ek B. Çekim hesabı test vektörleri

---

## 0. Özet, kapsam, kapsam dışı

### 0.1 Bir sayfalık özet

Sprint, sahibin "döngüsel zincirler oyunun kalbi" yönergesinin (docs/12 §8) ilk iki örneğini oynanır kılar: **buğday → un → ekmek → kendi dükkânın** (G6 + G7) ve **silis → cam → pencere → yapı market** (G8). Yeni **mal yok** (24 mal P3'te girdi), yeni **tesis türü yok**, tek yeni yapı `dukkan`. Değirmen, ekmek fırını, kepekten gübre, kepekli süt, cam fırını ve çelik doğrama **yöntemdir** (baş lider kararı): `gida_fabrikasi`, `ahir` ve `parca_fabrikasi` yöntem listelerinin SONUNA eklenir; ayrı yapı gibi görünmesi yalnız arayüz adıdır (ad yöntemden gelir).

Yapının dört taşı:

1. **Yöntemler, bayrak ve yöntem kimlik listesi (G6, G8).** Altı yeni yöntem (`yontemler[24..29]`: `degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli`, `cam_firini`, `celik_dograma`), hepsi `mulkKipi: true`. Bayrak, bölge kipinde bu yöntemleri tür listelerinden süzer; indeksler sabit kalır; etkisizlik **yöntem izdüşümü** kanıtıyla gösterilir (P3 mal izdüşümü kalıbı). Yöntem kimlikleri ilk kez **makine-denetimli, yalnız-ekle** bir listeye girer (§3.5): mevcut 24 yöntem ilk kayıtlar, 6 yeni sona eklenir.
2. **Şebeke enerjisi (G6).** Alfa-0'da **elektrik ve yakıt**, mülk kipinde işletme düğümüne kamu şebekesinden **otomatik** tedarik edilir; yeni komut yoktur. Elektrik: önce düğümdeki kendi santral, kalan açık şebekeden; yakıt: tüketim anında stoksuz. Fiyat mevcut kamu fiyat tavanı mantığıdır (`kamuIthalatCarpaniPpm` × referans; elektrik 10,35 ₺, yakıt 103,5 ₺ [taban referansı]); bedel saatlik türetilmiş gider, %12'si ilçe kamu kasasına (`kasaPayiPpm`, A2), kalanı lavaboda yanar; defterde ayrı satırlar. Bölge kipi koduna dokunulmaz (§5.2).
3. **Yerel pazar kanalı (G7a).** Mülk kipinin ilk NPC **hane talebi**. Talep ilçe nüfus eşdeğeri (ilçede isteğe bağlı `nufus`, yoksa sınıf sabiti) × taban × iklim takvimi × bayram. Çekim formülü tamsayı/PPM, su-doldurma; satış, ihracattan **önce** gelen yeni bir öncelik katmanında (4a) düğüm stoğundan çekilir; NPC dünya fiyatını **etkilemez**; geliri yeni, isteğe bağlı, tembel yazılan musluk `yerelNpc`'dir.
4. **Dükkân (G7b).** `EkYapiDurumu.dukkan?` ile durum; raf yuvası (mal dize kimlik), **fiyat kademesi** (`secim`, tutar yok), marka (sınırlı serbest metin), 5 yeni oyuncu komutu (raf, fiyat, marka tanımı, markayı bağlama, yıkım) ve 1 sistem komutu (marka sıfırlama), kampanya penceresi (varsayılan kapalı). Ölçek ayak izi `[1, 2, 3]` (süpermarket 3 hücre, sahip kararı S4-4) tür verisindedir; Alfa-0'da yalnız beş S türü vardır, market ve süpermarket kaydı **yoktur**.

### 0.2 Bu çalışmanın yedi kritik bulgusu (K3 ve baş lider bilmeli)

| # | Bulgu | Etki | Karar yeri |
|---|---|---|---|
| B1 | **Mülk kipinde elektrik bugün yalnız aynı işletme düğümündeki santralden gelir; santralsiz elektrik girdili tesisin verimi 0'dır.** `standart_gida_isleme` (10 elektrik) ile denendi: `verimPpm = 0`, `elektrik.karsilanmaPpm = 0` (doğrulandı: yöntem; §2.3). Dikey rapor değirmen (12) ve fırın (15) tariflerinde elektrik varsayıyor, santrali saymıyor. | Baş lider kararı: santral zorunlu olmayacak; **şebeke enerjisi** (elektrik + yakıt; §5.2). Aksi halde G6 yeni oyuncu için çalışmaz (A2 §1.3-B1: santral ilk gün yatırımına +%40 ekler). | §5.2, GZ-2 |
| B2 | **Referans fiyat R taban fiyat değildir.** `d.pazar.fiyat[m]` = taban + taban × oran × 0,75; yeni mallarda emilim/arz oranı yüzünden R0 tabanın 1,12–1,50 katıdır (ekmek 85,3 ₺ ↔ taban 60 ₺; pencere 540 ₺ ↔ 360 ₺). Dikey ve perakende raporlarının ₺ sayıları R = taban varsayar. | A2'nin sayıları taban fiyatla (kâğıt model); çekirdek R0 kullanır. Dükkân geliri, R0'a ve oyuncu emirlerine göre oynar: A2 §1.9 rakamları **yön** gösterir, mutlak ₺ kalibre değildir (A2 §1.12 okuma ii). | §6.2, GZ-5 |
| B3 | **Pencere NPC ithalatıyla alınabilir ama kırılgandır:** NPC pencere arzı VAR (`parametreler.json` `pazar.arzSaat.pencere = 60 000` mili/sa, `emilimSaat.pencere = 100 000`; doğrulandı: kod okuma), ithalat emri teknik olarak çalışır; fakat emir kalıcı orandır, gerçekleşme bir sonraki tam saat tıkında başlar, bitince elle iptal gerekir (doğrulandı: yöntem; §2.4). Gerçek maliyet R0 ile ≈ 2.400 ₺ (4 × 540 × 1,111), A2'nin 1.600 ₺'sinden fazla (B2). | **Baş lider kuralı:** G7 anında pencere ithal edilebiliyorsa P-İthal. Arz var ⇒ **dükkân bedeli pencere içerir (G7)**; kırılganlık ve gerçek maliyet açık risk olarak §7.4'te. | §7.4, GZ-15 |
| B4 | **G6'nın eklediği yöntemler `mal-izdusumu-kanit.test.ts` içindeki `p3Oncesi` yardımcısını kırar** (14 mallı içerikte olmayan `un`/`kepek`'i anan yöntem; T3 §9.3 deneyi aynı: 4 test). | K3 teslimine yardımcı güncellemesi şart. | §13.4 |
| B5 | **Çekirdek `Komut` birliğine tür eklemek `@bolge/protokol` derlemesini kırar** (`_KomutDenetimi`, `komut-sema.ts:81`) ve K1 komut testlerini. | K3 ve K2 teslimleri **aynı kapıda** birleşmeli. | §17 |
| B6 | **`standart_gida_isleme` ekmek zincirinin rakibidir.** 200 tahıl → 160 gıda, oran 1,84; bölge kipi altınlarının parçası, değiştirilemez. A2 (zincir / standart): **tahıl başına NPC net +%21,2 (fırın 240 ekmek; 250 ekmekle +%33,6); tesis ve hücre başına KD −%34,8, işçi başına −%39,8 (A2 §1.3-B2 240 tablosu).** Erken oyunun bağlayıcı kısıtı NPC pazar derinliğidir; zincir ikinci talep havuzudur (A2 §1.3-B2). | **Baş lider kararı: çarpan yok.** Tesis tabanı da kural sayılırsa yedek: mülk kipinde `standart_gida_isleme` çıktısı ×0,75 (`mulk.yontemGecersizKilma`, **varsayılan KAPALI**; şema ve çekirdek yolu G6'da hazır, §5.9). Tetik: A2'nin ölçütü M. Fırın çıktısı **240** (baş lider): zincir +%21,2, K/U bandının (+%10–25) içinde; S-17 kapandı. | §5.9, S-1, S-17 |
| B7 | **Kömür santrali S ölçekte şebekeden ucuz değildir** (A2: kömür tam yükte yalnız %5–6 avantaj, başabaş yük %59–67; yakıt jeneratörü hiç avantajlı değil; hidro %12–14; P4 yükünde %13'te kömür S −195 ₺/sa). | **Baş lider kararı:** santral isteğe bağlıdır; yalnız hidroda ve yüksek yükte kârlıdır; şartnamede ve oyun içi metinde **"daha ucuz" vaadi yer almaz**, gerçek sayılar gösterilir; santral fiyatına/maliyetine dokunulmaz. | §5.2, S-2 (kapandı) |

### 0.3 Kapsam

- **G6:** `degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli` (4 yöntem, `yontemler[24..27]`), `mulkKipi` bayrağı ve bölge kipi etkisizlik kanıtı, **şebeke elektriği ve yakıtı** (§5.2: çekirdek, para defteri, kasa girişi), yöntem kimlik listesi (§3.5), yapı komutlarına isteğe bağlı `yontem` alanı (§5.8), `yontemGecersizKilma` yedek yolu (§5.9; kapalı), göç testi, ödül dedektörü doğrulaması, bot ekmek zinciri önayarı.
- **G7a:** yerel talep (Q), çekim (su-doldurma), esnaf payı, kasa kırpması, öncelik katmanı 4a, para akışı ve `yerelNpc` musluğu, yetişme davranışı.
- **G7b:** `dukkan` ek yapısı (durum, ölçek ayak izi, inşa), 5 yeni oyuncu komutu (`dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, **`dukkan_yik`**) ve 1 sistem komutu (`marka_sifirla`), `yapi_yerlestir`/`tesis_insa_hucre`'ye `dukkanTuru` alanı, dört dükkân türü verisi (`bakkal`, `firin`, `sarkuteri`, `sekerci`), marka, `ilk_dukkan` tetiği, protokol ve sunucu kancaları.
- **G8:** `cam_firini` (ev sahibi `parca_fabrikasi`), `celik_dograma`, `yapi_market` dükkân türü (yalnız NPC alıcı), dükkân bedeli **değişmez** (G7'de zaten ithal pencereli; §7.4), bot cam → pencere zinciri.

### 0.4 Kapsam dışı (bilinçli)

- Market (M) ve süpermarket (L) **oynanışı ve veri kayıtları**: Alfa-0 `dukkanTurleri` yalnız beş S türüdür (`bakkal`, `firin`, `sarkuteri`, `sekerci`, `yapi_market`); `market` ve `supermarket` tür kaydı A1'dedir (baş lider; T3 §11 soru 14). `ekYapilar.dukkan.olcekHucre = [1, 2, 3]` (süpermarket 3 hücre) yine yazılır ve `olcek` 1/2 komutları `acikOlcekler = [0]` ile reddedilir (§7.3, GZ-12). Kademe çarpanı dışındaki Alfa-1 kuralları (Yakınlık Havuzu, kademeli pay tavanı, ruhsat/kota, Zincir Kartı, `dukkan_yukselt`) **yok**; kampanya penceresi G7 şemasındadır ama **varsayılan kapalıdır** (§7.5b).
- Açılış Tezgâhı (`tezgah`): T-39 karar bekler; **G7'de yok** (kimlik listede durur, tür kaydı eklenmez). Sahip kararı: §21 S-3.
- Oyuncu-alıcı (oyuncudan oyuncuya raf satışı), raf tedarik sözleşmesi, toptan, hal, üretici satış noktası modülü.
- Bayat ekmek → kepek döngüsü (baş lider kararı 8; G6'ya girmez).
- Satış harcı (kasaya pay): yok (§19.A Soru 11). Şebeke bedelinin kasa payı **vardır** ve ayrıdır (§5.2.5).
- Yeni PRNG akışı, `ilce_gunluk` olayı, `IlceDurumu` nüfus alanları, göç: yok (GZ-10).
- Alfa-1 işi: fiyat önayarları, halka havuzu, çeşit için 24 saatlik pencere, hane fiyat esnekliği (η), takvim sonrası telafi dalgası dışındaki bayram kuralları.
- Nüfus modeli, `gelirEndeksi`, ilçe gelişim seviyesinin hesabı: **kilitsizlik** (Y-33) gereği yerel talep seviyeden bağımsızdır.
- **Bakım ve aşınma kalibrasyonu** (A2 eab8fcc §2: O2 ölçümüyle yeniden yazıldı; son öneri C: aşınma hızı ×0,50 yani kıtlık 10.000 ppm/gün, tavan %25; `mulk.bakim` bloğu; `bakim_duzeyi.otomatikParca`): **baş lider kararıyla bu sprintte karar yok** ve G4 kapsamı dışındadır. Şema rezervi **gerekmez** (yeni `mulk.bakim` bloğu isteğe bağlı eklenebilir; bu şartnamenin hiçbir alanı onunla çakışmaz). Sonraki iş.
- Kömür, silis, çelik, parça gibi ham/ara malların şebekeden tedariki (yalnız elektrik ve yakıt şebekedendir; §5.2.8).
- Sabit fiyatlı kamu siparişi (`kamuSiparisi`, A2 §1.13) kodu ve şeması: S-11.

## 1. Kaynaklar ve kilitler

### 1.1 Kilitler (karar vermeden uyulacaklar)

| Kilit | Kaynak | Bu şartnamede sonucu |
|---|---|---|
| Kilit yok, seçim var (Y-31, Y-33, Y-34; A0-17) | docs/12 §12–§13; GDD §3B.0, §6.5 | Dükkân ve yöntemde sıra/seviye/teknoloji şartı yok; kısıt yalnız sermaye, arsa/ayak izi, girdi, gider, ilçe/il sayısı. `acikOlcekler` oyuncuya konmuş kilit değil, **özelliğin dünyaya açılış zamanlamasıdır** (perakende §12.3 notu) |
| Ayak izi ölçekle büyür: `olcekHucre = [yuva, yuva+1, yuva+2]`, en çok 5, bağlı küme (Y-34) | docs/12 §13 | `dukkan` için `[1, 2, 3]`; süpermarket 3 hücre (sahip kararı S4-4, docs/12 §14) |
| Para alanı taşıyan sistem ya da ajan komutu yok (G4) | docs/12 §10 | Dükkân fiyatı `secim` kademesidir; serbest metin (`ad`) yalnız oyuncu yolunda, sistem yolunda yasak |
| Kamu bütçesi yalnız yanan paradan; ihracat kasa kaynağı değil (G8, G9) | docs/06 §15.7 | Yerel NPC geliri **musluktur**, kasaya pay yok |
| Kamu fiyat tavanı = en düşük ithalat çarpanı (1,035) | docs/06 §15.7 madde 5 | Dükkân satışı kamu değildir; band [0,7; 1,4] R (G12) |
| Tek yeni yapı `dukkan`, tür = veri (G11) | docs/12 §10 | Yeni tesis türü yok; yeni dükkân türü yalnız veri kaydı |
| Mal kimlikleri kilitli, yalnız-ekle (G5, G8; P3 kimlik kilidi) | docs/06 §15.8 | Yeni mal yok; mal ∩ dükkân türü = ∅ |
| Çıkmaz mal yok (UA1) | üretim §3A.2 madde 4 | Kepek için §5.4 |
| Arayüzde büyük harf yok; para biçimi `1.234 ₺`; Türkçe | docs/12 §4, §14 | Ret iletileri küçük harfli ASCII-Türkçe (çekirdek geleneği), istemci çevirisi T1/K1'in |
| Deterministik çekirdek: tamsayı, `Math.random`/`Date`/kayan nokta yok | docs/14 §4 | Çekim formülü PPM tamsayı, `carpBol` |
| Bölge kipi altınları birebir | docs/14 §4 | §13 |
| Protokolde yalnız ekleme | docs/14 §4 | §10 |
| Parsel asla zorla el değiştirmez; NPC arsa sahibi/rakip firma yok | docs/12 §7 | `NpcAlici`/esnaf bir kayıt, mülk sahibi değil |

### 1.2 Baş lider yön kararları (Ar-Ge lideri iletisi, bağlayıcı)

1. Değirmen, ekmek fırını, kepek yöntemleri, cam fırını, çelik doğrama **yöntemdir**; yeni tesis türü açılmaz; `hafif_sanayi` A0'a çekilmez.
2. `YontemTanimi.mulkKipi?: true`; bölge kipinde derleme süzer, indeksler sabit; etkisizlik yöntem izdüşümü kanıtıyla.
3. Dükkân fiyat komutu tutar taşımaz; fiyat `secim` kademesidir; `hedefStokGun` yok. Kademe sayısı ve R çarpanları A2 §1.9.
4. Marka adı serbest ama **sınırlı** metindir (§7.7).
5. Para defterine `yerelNpc` musluğu **isteğe bağlı**, tembel yazılır; `fikstur-goc/mulk-v1.json` yüklenmeye devam eder.
6. Yerel talep Q = ilçe nüfus eşdeğeri (`ilceNufusEsdegeri`) × taban × iklim takvimi × bayram; bayram dalgası ayrı parametre; sayılar A2 §1.9.
7. Yapı market satışı yalnız NPC'ye; oyuncu-alıcı kapsam dışı.
8. Bayat ekmek → kepek G6'da yok; kepeğin P0'da iki tüketicisi olmalı.
9. İş bölümü: O2 `parsel.ts` zincir önayarı; K2 protokol/`kare.ts`/dedektör; K1 `gizli.ts`/`komut.test.ts`/hata çevirileri; veri sınırı: önce K3 şemayı isteğe bağlı/no-op indirir, sonra T3 değer yazar; bundle payı 31 KB (G7 +3–5 KB); Node-only doğrulayıcı `saf`a girmez.
10. **Yöntem kimlik listesi** makine-denetimli, yalnız-ekle (mal listesi gibi); mevcut 24 yöntem ilk kayıtlar; 6 yeni sona (§3.5).
11. **Yeni tesis türü yok**; `cam_firini` ev sahibi A2'nin maliyetine göre seçilir (**`parca_fabrikasi`**; §3.2).
12. **Enerji:** santral seçeneği düştü; ilk oturumda santral zorunlu değil. Alfa-0'da **elektrik ve yakıt** (A2 §1.3-B1: "elektrik ve yakıt kamu şebekesinden otomatik gelir") kamu şebekesinden otomatik tedarik edilir, yeni komut yok; fiyat kamu fiyat tavanı kuralı; ödeme ilçe kamu kasasına (`kasaPayiPpm`) ve lavaboya, ayrı defter satırlarıyla; santral isteğe bağlı oyuncu yatırımı (kendi elektriği; fazlasını kamuya satamaz); yalnız mülk kipi, bayrak arkasında; bölge kipi altınları birebir (§5.2). **Yakıtın kapsamı** baş lider tarafından teyit edilmiştir (S-10 kapandı).
13. **Ekmek zinciri sayıları A2 raporundan** gelir (tek kaynak; `eab8fcc`). **Çarpan yok**; zincir ikinci talep havuzudur. Tesis tabanı da kural sayılırsa yedek seçenek parametre olarak hazır durur: mülk kipinde `standart_gida_isleme` çıktısı ×0,75, **varsayılan kapalı** (`mulk.yontemGecersizKilma`; §5.9). Tetik ölçütü sayısaldır (A2'nin M ölçütü; A0-11 bot ölçümü).
14. **Santral** isteğe bağlıdır; yalnız hidroda ve yüksek yükte kârlıdır; "daha ucuz" vaadi şartnamede ve oyun içi metinde yoktur; santral fiyatı/maliyeti değişmez.
15. **Şebeke bedelinin kasa payı** (`kasaPayiPpm` + `KASA_GIRIS`): kasa ilçe kamu kasasıdır; pay ekonomide kalır ve kamu siparişini besler, kalanı lavaboya gider; değer 120.000 (A2 §1.3-B1).
16. Sıra değişmedi: G4 → baş lider onayı → K3 ("hücre dizini" işinden sonra, sonra G6).

### 1.3 Okunan kaynaklar

docs/14; docs/10 §5A; docs/12 §13–§14; docs/13; docs/06 §14–§15; GDD v1 (§1, §3.1–§3.4, §3A, §3B, §3C.2, §5.3, §6, §8); `perakende-kademeleri.md` (§3, §5, §7.5, §12, §14); `uretim-agi-genisletme.md` (§3.3, §5.3, §9, UA1, K-4, K-5); `dikey-zincirler-ve-perakende.md` (§2.2, §3.1–§3.5, §4, §5, §9, §11); `kimlik-listesi-v1.md`; `canli-dunya-simulasyonu.md` (§3.2–§3.4, §4.1–§4.2, §10); **A2 raporu** `p4-p5-ekonomi.md` (`eab8fcc`; §1 tamamı) ve **T3 taslağı** `p4-p5-icerik-taslagi.md` (0561728, tamamı); kod: `packages/cekirdek/src/{tipler,derle,motor,komutSemasi,serilestir,goc,ozet,paraSayac,stok}.ts`, `ekonomi/{komut,uretim,tablo,insaat,index}.ts`, `sanayi/elektrik.ts`, `lojistik/cozum.ts`, `pazar/{piyasa,fiyat,tablo}.ts`, `mulk/{komut,yapi,durum,kasa,kamuFiyat,isletme}.ts`, `tarim/iklim.ts`, `packages/veri/src/{tipler,sema,dogrula,kimlik-listesi,parsel,yukle}.ts`, `veri/icerik/{icerik,parametreler,kimlik-listesi}.json`, `packages/protokol/src/{komut-sema,kare,mesajlar,donus}.ts`, `packages/sunucu/src/{odul/dedektor,donus/*}.ts`, `packages/botlar/src/{parsel,onayarlar,tablo}.ts`, `packages/istemci/src/{komut,harita/hata-mulk}.ts`, K3 keşif notu.

## 2. Mevcut kod durumu (`d28447d`) ve doğrulanan bulgular

### 2.1 Bugün var olanlar (G6–G8'in dayandığı)

| Konu | Dosya:satır | Not |
|---|---|---|
| 24 mal, `kepek` dahil; `un/ekmek/cam/pencere/kepek` için NPC emilim/arz | `veri/icerik/parametreler.json:50`, `:55`; `veri/icerik/icerik.json` `mallar[]` | Mal göçü yok |
| 18 tesis türü; `gida_fabrikasi` tek yöntem `standart_gida_isleme` | `icerik.json:159-161`, `:41` | Değirmen/fırın bunun yanına eklenir |
| `yapiYuva`/`olcekHucre`: `gida_fabrikasi` 2 → `[2,3,4]`, `ahir` `[2,3,4]`, `celikhane` `[3,4,5]`, `parca_fabrikasi` `[2,3,4]` | `parametreler.json:210` (`olcekHucre`) | Ölçek ayak izi yöntemden bağımsız, türe bağlı |
| Ek yapılar: ambar, ticaret_ofisi, muhtarlik, konut, garaj, atolye_lab | `parametreler.json:259`; tip `veri/src/tipler.ts:577` | `dukkan` buraya eklenir |
| `kimlik-listesi.json`: `dukkan` ek yapı (A0); 13 dükkân türü; `dogrulaKimlikKilidi` `dukkanTurleri`'ni henüz geçirmiyor | `veri/icerik/kimlik-listesi.json`; `veri/src/kimlik-listesi.ts` `dogrulaKimlikKilidi` | Kilit `param.mulk.perakende.dukkanTurleri`'ne bağlanmalı (§4.5) |
| Çok çıktılı yöntem desteği (`ahir_besi`: gida + gubre) | `veri/src/tipler.ts:140-169`; `ekonomi/tablo.ts` `cift()`; `ekonomi/uretim.ts` `bolgeHesapla` | Kepek yan ürünü kod değişmeden çalışır; tüm çıktılar aynı verim/çarpanla ölçeklenir |
| Yöntem değişimi bedelsiz ve anlık | `ekonomi/komut.ts:78-88` | G6'da kalır (GDD §3A.3: yeniden donatım Alfa-0'da ücretsiz) |
| Ticaret emri (ithalat/ihracat), mülk kipinde liman şartı yok; yuva 4 + ofis | `ekonomi/komut.ts:99-130` (`yerelPazar` bayrağı `:104`) | Emir kalıcı orandır |
| NPC pazar hacimleri ve fiyat | `pazar/piyasa.ts:53` (`npcHacimleri`), `:75` (`pazarEmirleriniGerceklestir`), `:123` (`pazarFiyatlari`); saatlik tık `ekonomi/index.ts:18` | Gerçekleşme **yalnız saat tıkında**; fiyat `taban + taban × oran × 0,75`, [%25, %175] |
| Para defteri: musluk/lavabo sayaçları, kasalar | `tipler.ts:842-896`, `paraSayac.ts:54`, `mulk/kasa.ts:94` | `MUSLUK_KALEMLERI` zorunlu liste |
| Ödül tablosu: `ilk_dukkan` (10 000 mili çelik) var, dedektör yer tutucu | `parametreler.json:11`; `sunucu/src/odul/dedektor.ts:14`, `:29` | Dedektör K2 işi (§10.4) |
| Ek yapı inşası ve ölçek reddi | `mulk/komut.ts:262-279` (`yapiTuruCoz`, `:274` "ek yapi olceklenemez"), `mulk/yapi.ts:54` (`ekYapiTamamla`) | `dukkan` için `olcekHucre` ile açılır |
| Kare ve protokol: komut şeması tip eşitliği derleme zamanında | `protokol/src/komut-sema.ts:24`, `:80-82` | K3/K2 eş zamanlı |

### 2.2 Bugün olmayanlar

Dükkân, raf, kasa, marka, yerel talep/çekim, `yerelNpc` musluğu, `mulkKipi` bayrağı, `AlanTuru` içinde `metin`, `dukkan` komutları, yeni yöntemler, `ilk_dukkan` tetiği, fikstürde arsa kullanım türü (konut/ticari: `veri/src/parsel.ts:58-71` yalnız `sinif`, `uygun`, `engel`, `kamu`), ilçe nüfusu (fikstürde yok; `parsel.ts:81-104`).

### 2.3 Doğrulanan bulgu B1: elektrik (bugünkü davranış) ve çözümü yapan kod yolu

Geçici test (commit'lenmedi, silindi): `mulkVeriTam` + `mulkSim(["a"])`; yurt 6 hücre; Tarla (2 hücre) + `gida_fabrikasi` (2 hücre, varsayılan yöntem `standart_gida_isleme`, 10 elektrik girdisi), santralsiz, 2 saat çalıştırıldı:

```
tesis ciftlik geleneksel_tarim   verim 1000000
tesis gida_fabrikasi standart_gida_isleme verim 0 isci 1000000
elektrik {"uretimMili":0,"talepMili":10000,"karsilanmaPpm":0,"haneKarsilanmaPpm":0,"yukPpm":0}
```

**Bugün elektrik çekirdekte şöyle çözülür** (hepsi `d28447d`):

| Adım | Yer | Ne yapar |
|---|---|---|
| 1 | `ekonomi/uretim.ts:315-319` (`bolgeHesapla` içi) | tesis başına `elektrikGirdi[i]` (tüketici; ölçekli) ve `elektrikKap[i]` (santral kapasitesi; aşınma ve akarsu çarpanlı) doldurulur |
| 2 | `ekonomi/uretim.ts:436` ve `:517` (`bolgeVerimCoz` :421 içinde; ilk durum ve yinelemeli döngü) | `elektrikUygula(sn, h, tesisSayisi)` çağrılır |
| 3 | `ekonomi/uretim.ts:381-410` `elektrikUygula` | `kapasite = Σ elektrikKap × verimOn`, `talepTesis = Σ elektrikGirdi × verimOn`; `elektrikDagit(kapasite, talepTesis, h.haneElektrik, iletimKaybiPpm, haneOnceligi)` (`h.haneElektrik` mülk düğümünde 0: nüfus 0); tüketici verimi `× e.tesisKarsilanmaPpm`, santral verimi `× e.yukPpm` |
| 4 | `sanayi/elektrik.ts:40-66` `elektrikDagit` | `arz = kapasiteBrut × (PPM − iletimKaybi)/PPM`; `karsilanma = min(PPM, arz/talep)`; **kapasite 0 ve talep > 0 ⇒ karşılanma 0**; santral yükü talebi izler (talep arzı aşarsa PPM) |
| 5 | `ekonomi/uretim.ts:596-612` (`bolgeDurumunaYaz`) | `b.elektrik = { uretimMili, talepMili, karsilanmaPpm, haneKarsilanmaPpm, yukPpm }` kalıcı durumda (`tipler.ts:222-237` `BolgeElektrikDurumu`); `serilestir.ts` bu alanı **ayrıca doğrulamıyor** (`serilestir.ts` içinde "elektrik" geçmez; doğrulandı: arama) |
| 6 | `lojistik/cozum.ts:228` `lojistikCoz` | saatlik tıkta ve her kirli komutta çalışır: adım 1 `hazineKalemleri(…null…)` ile ödeme gücü tahmini (`:243-253`), adım 4-5 `bolgeVerimCoz`, adım 6 `hazineKalemleri(…hesaplar…)` + `paraAkisiYaz` (`:293-308`) |

Elektrik depolanamaz, ithal edilemez (`ekonomi/komut.ts:108` `depolanamaz` reddi); düğüm başına santral `komur_santrali` (60 kömür → 240 elektrik), `yakit_jeneratoru`, `hidro_santrali` (`dag` etiketli il). Mevcut mülk botları bu yüzden ya elektriksiz yapılarla (`ciftlik`, `ahir`, `mera`) ya da hidro santralle başlıyor (`botlar/src/parsel.ts:105-109`: `CIFTCI`, `SANAYICI`). **Karar ve değişiklik:** §5.2.

### 2.4 Doğrulanan bulgu B3: pencere ithalatı

Aynı düzende, ek yapı bedeli 4 pencere içeren geçici bir `dukkan_deneme` tanımıyla:

```
ilk deneme (stok yok)          {"tamam":false,"hata":"yetersiz stok: sn_m_ova#a (mal indeksi 17)"}
emir: pencere ithalat 4 birim/sa
+30 dk   pencere stok 0        emir.gerceklesenSaat 0   (emir saat tıkında gerçekleşir)
+70 dk   pencere stok 666 mili (tık t=1 sa'de başladı: 10 dk x 4 birim/sa)
```

Sonuç: ithalat **teknik olarak** çalışır (`pazar/piyasa.ts:106` `hazineVar` şartı, arz `hacim.arz[pencere]` = 60 birim/sa; `pencere` stoğu işletme düğümüne girer), ama (a) gerçekleşme bir sonraki tam saat tıkını bekler, (b) 4 birim için emir oranı ve süre elle ayarlanmalı, (c) emir iptal edilmezse tüketim sürer. Ayrıca R0(pencere) = 558 ₺ (taban 360 ₺), yani 4 pencere ithalatı ≈ 4 × 558 × 1,1 ≈ **2.450 ₺**; dikeydeki 1.600 ₺ değil.

### 2.5 Referans fiyat R (B2)

`pazar/piyasa.ts:123-135`: `oran = clamp((T − A)/min(T, A), −1, +1)`, `fiyat = taban + taban × oran × 0,75` (`fiyatEsnekligiPpm = 750 000`, `parametreler.json` `pazar.fiyatEsnekligiPpm`). Oyuncu emri yokken hesaplanan R0 (tamsayı; `emilim/arz` `parametreler.json:50,55`):

| mal | taban (₺) | R0 (₺) | çarpan | | mal | taban (₺) | R0 (₺) | çarpan |
|---|---:|---:|---:|---|---|---:|---:|---:|
| `un` | 50 | 68,75 | 1,375 | | `sut` | 40 | 56,15 | 1,404 |
| `ekmek` | 60 | 85,31 | 1,422 | | `sut_urunu` | 120 | 160,00 | 1,333 |
| `cam` | 95 | 134,58 | 1,417 | | `findik_urunu` | 240 | 336,92 | 1,404 |
| `pencere` | 360 | 540,00 | 1,500 | | `sekerleme` | 180 | 261,00 | 1,450 |
| `kepek` | 18 | 24,75 | 1,375 | | `gida` | 70 | 96,25 | 1,375 |
| `yakit` | 100 | 111,54 | 1,115 | | `celik` | 120 | 133,85 | 1,115 |

Oyuncu ihracat/ithalatı R'yi oynatır (ör. +4 birim/sa ithalatla pencere 558 ₺ oldu). Tanım kararı §6.2'de.

### 2.6 Test ve altın kırılma noktaları (G6–G8 teslimi şart)

| Dosya | Neden etkilenir |
|---|---|
| `cekirdek/test/mal-izdusumu-kanit.test.ts:51` `p3Oncesi` | 14 mala kısalan içerikte yeni yöntemler olmayan mala başvurur → `icerikTablosu` hata (`ekonomi/tablo.ts:62`) |
| `cekirdek/test/serilestir-goc.test.ts` ve `mal-izdusumu-kanit.test.ts:155-224` | "eklenen" kimlik sayıları (`eklenen.yontemler`) ve "diğer uzaylar boş" beklentileri |
| `cekirdek/test/para-guvenligi.test.ts:98-100`, `:215-216` | korunum toplamı `MUSLUK_KALEMLERI` üzerinden; isteğe bağlı `yerelNpc` toplama girmeli |
| `cekirdek/test/mal-kimlik-kilidi-paket.test.ts:23-24`, `veri/test/dogrulama.test.ts:27`, `veri/test/kimlik-listesi.test.ts:16-23`, `:49`, `:100-106` | sayım ve `ekYapilar` beklentileri, `dukkanTurleri` geçişi |
| `istemci/test/komut.test.ts:92-117` | `GIZLI_KOMUTLAR`/`HARITA_KOMUTLARI` `toEqual` listeleri |
| `botlar/test/pazar-regresyon`, `olcum/test/*` | güncel içerikli koşular; `mulkKipi` süzgeciyle etkisiz olmalı |

---

## 3. Kimlikler

### 3.1 Mal kimlikleri: değişmez

Yeni mal yok. Kullanılan: `tahil` (buğday; ayrı `bugday` malı yoktur), `un`, `kepek`, `ekmek`, `gida`, `yakit`, `sut`, `gubre`, `silis`, `cam`, `celik`, `parca`, `pencere`. `kimlik-listesi.json` `mallar` aynen kalır; `icerik-kimlik-kilidi.json` güncellenmez (yalnız sona ekleme yapılmadığı için).

### 3.2 Yöntem kimlikleri, dizi sırası ve ev sahipleri

Sıra `icerik.yontemler[]` içinde mevcut 24'ün (indeks 0–23: `geleneksel_tarim` … `sulama_pompasi`) ardına eklenir ve **kalıcıdır** (§3.5 makine-denetimli kilit). Sıra T3 §2.2 ile aynıdır:

| İndeks | Kimlik | Ad (görünen) | Ev sahibi tür | Dilim | `mulkKipi` |
|---:|---|---|---|---|---|
| 24 | `degirmen` | Değirmen | `gida_fabrikasi` | G6 | evet |
| 25 | `ekmek_firini` | Ekmek Fırını | `gida_fabrikasi` | G6 | evet |
| 26 | `kepek_gubresi` | Kepekten Gübre | `ahir` | G6 | evet |
| 27 | `sut_kepekli` | Kepekli Süt Besisi | `ahir` | G6 | evet |
| 28 | `cam_firini` | Cam Fırını | **`parca_fabrikasi`** | G8 | evet |
| 29 | `celik_dograma` | Çelik Doğrama | `parca_fabrikasi` | G8 | evet |

Tür listelerine ekleme (her listenin SONUNA): `gida_fabrikasi.yontemler = [standart_gida_isleme, degirmen, ekmek_firini]`; `ahir.yontemler = [ahir_besi, kepek_gubresi, sut_kepekli]`; `parca_fabrikasi.yontemler = [standart_parca, otomatik_hat, cam_firini, celik_dograma]`; **`celikhane.yontemler` değişmez** (`[yuksek_firin, elektrik_ark]`). **Her tür listesinde ilk eleman değişmez** (varsayılan yöntem; `ekonomi/insaat.ts:24` `tur.yontemler[0]`). T3 taslağı (`T3 §8.2`) `celikhane`'ye `cam_firini` ekliyordu: bu şartname onu **geçersiz kılar**.

**`cam_firini` ev sahibi kararı: `parca_fabrikasi` (gerekçe, A2 maliyetine göre).**

| Ölçüt | `celikhane` | `parca_fabrikasi` | Kaynak |
|---|---|---|---|
| S yapı bedeli | ₺20.000 + 100 çelik + 40 parça | ₺15.000 + 80 çelik + 30 parça (**−₺5.000, −20 çelik, −10 parça ≈ −9.700 ₺ ithal değer**) | A2 §1.7, §1.12 "barındıran tesis" |
| S ayak izi / inşa süresi | 3 hücre / 10 sa | **2 hücre / 8 sa** | A2 §1.2 |
| M ve L ayak izi | 4 / 5 | 3 / 4 | `parametreler.json:210` |
| Tür başına yöntem tavanı (üretim K-8: ≤ 10) | alüminyum, çelik kolları A1'de gelecek: payı korunur | 4 yöntem | A2 ZA-3 |
| Görünen ad | yapı adı yöntemden gelir (üretim §7.1), ev sahibi görünmez | aynı | T3 §4.1 |

Ev sahibi görünen ad taşımadığı için "ağır fırın ailesi" semantiği (T3'ün gerekçesi) oyuncuya yansımaz; ölçüt maliyet ve ayak izidir (A2 ZA-3: sayısal tercih `parca_fabrikasi`). Pencere hattı kuran oyuncu iki `parca_fabrikasi` tesisi tutar (biri `cam_firini`, biri `celik_dograma`; bir tesis tek yöntemle çalışır): toplam ₺30.000 (iki S), `celikhane` + `parca_fabrikasi` yoluna göre ₺5.000 ucuz. **Geri dönüşü zor (GZ-1):** yöntemin ev sahibi canlı tesislerde `tesis.tur` ile bağlıdır; kimlik listesi bunu kilitler (§3.5).

Görünen ad notu: "Un İmalathanesi", "Un Fabrikası" gibi ölçeğe göre adlar (GDD §3A.3) arayüz kuralıdır: ad = yöntem adı + ölçek; çekirdek yalnız `YontemTanimi.ad` taşır.

`aluminyum_dograma`, `alumina_bayer`, `aluminyum_ergitme`, `cimento_firini`, `sut_sigirciligi`, `peynir_mandira`, `findik_*`, `besi_kepekli` (T3 seçeneği; düştü): **bu şartnamede yok** (A0-ops / P1).

### 3.3 Dükkân kimlikleri

- Ek yapı: `dukkan` (listede A0; `ekYapilar.dukkan` anahtarı).
- Dükkân türleri (`kimlik-listesi.json` `dukkanTurleri` listesinden; mal kimlikleriyle kesişmez). **Alfa-0 verisi yalnız beş S türüdür** (baş lider; T3 §5.1): `bakkal`, `firin`, `sarkuteri`, `sekerci` (G7) ve `yapi_market` (G8). **Kayıt edilmeyecekler:** `market`, `supermarket` (A1; T3 §11 soru 14), `tezgah` (T-39), `giyim`, `kasap`, `manav`, `toptan`, `mobilyaci`. `olcekAraligi` beşinde de `[0]` (yalnız S).
- Dükkân türü kimlikleri **dize** olarak saklanır (`DukkanDurumu.tur`); dizi indeksi yoktur, bu yüzden tür sırası serbesttir ve `dunyaYenidenIndeksle` kapsamına girmez.
- Marka: `MulkOyuncuDurumu.markalar[]` indeksi (0..2); simge ve renk indeksleridir (`simgeSayisi`, `renkSayisi` parametresi; palet T1/T2 işi, AÖ-15).

### 3.4 Parametre adları (özet)

`mulk.ekYapilar.dukkan` (+ `olcekHucre?`), `mulk.perakende.{acikOlcekler, ilceBasinaEnFazla, fiyatBandiPpm, fiyatKademeleriPpm, varsayilanFiyatKademesi, kampanyaKademesi, kampanyaGunlukEnFazlaSaat, kampanyaHaftalikEnFazlaGun, fiyatDegisimEnAzSaat, cesitKatsayiPpm, esnaf, olcekler, dukkanTurleri, talep, marka}` (§4.3), `mulk.sebeke` (§4.7, §5.2), `mulk.yontemGecersizKilma` (§4.8, §5.9). Yeni üst düzey parametre bloğu yoktur; hepsi `param.mulk` altındadır (mülk kipi kapalıyken okunmaz: bölge kipi etkilenmez).

### 3.5 Yöntem kimlik listesi (makine-denetimli, yalnız-ekle)

**Karar (baş lider):** yöntem kimlikleri mal ve tesis türü gibi **kimlik kilidine** girer (bugün kapsam dışıdır: `veri/src/kimlik-listesi.ts` başlık yorumu; kimlik-listesi-v1 açık nokta 3). Gerekçe: yöntemin hangi tesiste doğduğu geri dönüşü zor bir karardır (üretim §7.4), `tesis.yontem` durumda **indekstir** (sıra bozulursa canlı dünyalar bozulur) ve `mulkKipi` bayrağı bölge kipi altınlarını korur (bayrağın tersine çevrilmesi altınları kırar).

**Konum: `packages/veri/icerik/kimlik-listesi.json` içinde yeni üst düzey alan `yontemler`** (ayrı dosya değil). Gerekçe: kilit yükleyicisi, `dogrulaKimlikKilidi` çağrısı (`yukle.ts:48`), önek denetimi yardımcısı (`onek`, `kimlik-listesi.ts`) ve test dosyası zaten buradadır; tek kilit dosyası, tek yazar (T3), tek doğrulayıcı (K3).

**Şema (K3; `veri/src/kimlik-listesi.ts`):**

```ts
const YontemKaydi = z.object({
  id: Kimlik,
  evSahibi: Kimlik,                         // yöntemin doğduğu tesis türü (yapilar.tesisTurleri üyesi)
  asama: Asama,                             // A0 | A0-ops | A1 | S | ileride
  mulkKipi: z.literal(true).optional(),     // içerikteki YontemTanimi.mulkKipi ile AYNI olmalı
}).strict();
// KimlikListesiSema içine:
yontemler: z.array(YontemKaydi).optional(),   // optional: alan yoksa yöntem kilidi uygulanmaz (eski paketler, testler)
```

`surum` 1 kalır (alan eklemesi). `KimlikKilidiGirdisi`'ne `yontemler?: readonly { id: string; evSahibi: string | undefined; mulkKipi: boolean }[]` eklenir; `dogrulaKimlikKilidi` (`:157`) bunu `paket.icerik.yontemler` ve `paket.icerik.tesisTurleri` üzerinden kurar (`evSahibi` = yöntemi `yontemler[]` listesinde barındıran tür; yoksa `undefined`) ve **aynı çağrıda** `dukkanTurleri: paket.param.mulk?.perakende?.dukkanTurleri.map((t) => t.id)` geçirir (bugün geçirmiyor).

**Doğrulayıcı kuralları** (Node-only, `saf`a girmez; ret testleri `veri/test/kimlik-listesi.test.ts`). Liste kendi tutarlılığı (`kimlikListesiHatalari`):

| # | Kural | İleti |
|---|---|---|
| Y1 | `yontemler[].id` biçimi `KIMLIK_BICIMI` ve tekil | `kimlik-listesi.yontemler: gecersiz kimlik bicimi ... / tekrarlanan kimlik: <id>` |
| Y2 | `evSahibi` ∈ `yapilar.tesisTurleri` | `kimlik-listesi.yontemler.<id>: evSahibi listede yok: <tur>` |
| Y3 | Ad alanı: yöntem kimliği mal, ek yapı, kamu yapısı ve dükkân türü kimlikleriyle kesişmez; **tesis türü kimlikleriyle** de kesişmez, **tek istisna** `hidro_santrali` (mevcut 24 içinde hem tür hem yöntem; sabit `YONTEM_TUR_CAKISMA_ISTISNALARI = ["hidro_santrali"]`; doğrulandı: betik) | `kimlik-listesi: yontem ve <mal\|yapi\|dukkan turu> ad alanlari kesisiyor: <id>` |

İçeriğin listeye karşı kilidi (`kimlikKilidiHatalari`; `yontemler` alanı varsa):

| # | Kural | İleti |
|---|---|---|
| Y4 | Üyelik: `icerik.yontemler[].id` listede olmalı | `icerik.yontemler: kimlik listede yok (kimlik-listesi.json'a once eklenmeli): <id>` |
| Y5 | Önek: içerik sırası liste sırasının önekidir (yalnız sona ekleme; araya ekleme, yeniden sıralama, silme yasak) | `icerik.yontemler[<i>]: onek ihlali: icerikte "<a>", listede "<b>"` |
| Y6 | Ev sahibi: içerikte yöntemi barındıran tür = listedeki `evSahibi` (yöntem hiçbir türde yoksa ya da başka türdeyse ihlal) | `icerik.yontemler.<id>: ev sahibi degisti: icerikte <a>, listede <b>` |
| Y7 | `mulkKipi` eşitliği: içerik bayrağı = liste bayrağı (ikisi de var ya da ikisi de yok) | `icerik.yontemler.<id>: mulkKipi listeyle ayni degil` |
| Y8 | Her tür başına yöntem sayısı ≤ 10 **uyarıdır** (üretim K-8); hata değil (S16) | uyarı: `icerik.tesisTurleri.<tur>: yontem sayisi > 10` (uyarı kanalı: §4.5 `dogrulaCikmazMal` ile aynı sonuç biçimi) |

**İlk kayıtlar (T3 yazar; K3 şemayı ve doğrulayıcıyı indirdikten SONRA):** önce mevcut 24 yöntem `icerik.json` sırasıyla, hepsi `asama: "A0"`, `evSahibi` = bugünkü tür (`mulkKipi` yok); ardından 6 yeni, sırayla:

```json
"yontemler": [
  { "id": "geleneksel_tarim", "evSahibi": "ciftlik", "asama": "A0" },
  { "id": "mekanize_tarim", "evSahibi": "ciftlik", "asama": "A0" },
  { "id": "standart_gida_isleme", "evSahibi": "gida_fabrikasi", "asama": "A0" },
  { "id": "yuzey_cevher", "evSahibi": "cevher_madeni", "asama": "A0" },
  { "id": "derin_cevher", "evSahibi": "cevher_madeni", "asama": "A0" },
  { "id": "yuzey_komur", "evSahibi": "komur_ocagi", "asama": "A0" },
  { "id": "derin_komur", "evSahibi": "komur_ocagi", "asama": "A0" },
  { "id": "bakir_cikarim", "evSahibi": "bakir_madeni", "asama": "A0" },
  { "id": "silis_cikarim", "evSahibi": "silis_ocagi", "asama": "A0" },
  { "id": "petrol_cikarim", "evSahibi": "petrol_kuyusu", "asama": "A0" },
  { "id": "yuksek_firin", "evSahibi": "celikhane", "asama": "A0" },
  { "id": "elektrik_ark", "evSahibi": "celikhane", "asama": "A0" },
  { "id": "standart_parca", "evSahibi": "parca_fabrikasi", "asama": "A0" },
  { "id": "otomatik_hat", "evSahibi": "parca_fabrikasi", "asama": "A0" },
  { "id": "standart_elektronik", "evSahibi": "elektronik_fabrikasi", "asama": "A0" },
  { "id": "standart_rafineri", "evSahibi": "rafineri", "asama": "A0" },
  { "id": "standart_muhimmat", "evSahibi": "muhimmat_fabrikasi", "asama": "A0" },
  { "id": "ahir_besi", "evSahibi": "ahir", "asama": "A0" },
  { "id": "mera_hayvancilik", "evSahibi": "mera", "asama": "A0" },
  { "id": "azotlu_gubre", "evSahibi": "gubre_fabrikasi", "asama": "A0" },
  { "id": "komur_santrali", "evSahibi": "santral", "asama": "A0" },
  { "id": "yakit_jeneratoru", "evSahibi": "santral", "asama": "A0" },
  { "id": "hidro_santrali", "evSahibi": "hidro_santrali", "asama": "A0" },
  { "id": "sulama_pompasi", "evSahibi": "sulama_kanali", "asama": "A0" },
  { "id": "degirmen", "evSahibi": "gida_fabrikasi", "asama": "A0", "mulkKipi": true },
  { "id": "ekmek_firini", "evSahibi": "gida_fabrikasi", "asama": "A0", "mulkKipi": true },
  { "id": "kepek_gubresi", "evSahibi": "ahir", "asama": "A0", "mulkKipi": true },
  { "id": "sut_kepekli", "evSahibi": "ahir", "asama": "A0", "mulkKipi": true },
  { "id": "cam_firini", "evSahibi": "parca_fabrikasi", "asama": "A0", "mulkKipi": true },
  { "id": "celik_dograma", "evSahibi": "parca_fabrikasi", "asama": "A0", "mulkKipi": true }
]
```

(İlk 24 satır `icerik.json` `yontemler[]` ve `tesisTurleri[].yontemler` ile betikle üretildi: her yöntem tam bir türde, hiçbiri sahipsiz; doğrulandı: betik.) **Dosya sınırı:** K3 şema, doğrulayıcı ve testleri yazar (`veri/src/kimlik-listesi.ts`, `veri/test/kimlik-listesi.test.ts`); **T3 listeye kayıtları yazar** (`kimlik-listesi.json`). Sıra: K3 `yontemler` alanını isteğe bağlı indirir (kayıt yokken no-op) → T3 24 kaydı + G6 için 4 yeni kaydı yazar → G8'de son iki kayıt eklenir. Her yeni yöntem **önce listeye, sonra içeriğe** girer (mal kuralıyla aynı; Y4). Bu liste `cekirdek/test/fikstur-goc/icerik-kimlik-kilidi.json` önek denetimini (çekirdek içerik kilidi) değiştirmez; o ayrı dosyadır.

## 4. Veri şeması ve doğrulayıcı

Sınır (baş lider): **önce K3 şemayı isteğe bağlı/no-op indirir** (`veri/src/{tipler,sema,dogrula}.ts`, testler); **sonra T3 değer yazar** (`icerik.json`, `parametreler.json`, `kimlik-listesi.json`). `sema.ts` her yerde `.strict()` olduğu için şema değişmeden değer yazılırsa yükleme hata verir. Yeni alanların hepsi **isteğe bağlı** ve yalnız-ekle'dir; hiçbiri yoksa davranış ve durum özeti bugünküyle aynıdır.

### 4.1 `YontemTanimi.mulkKipi?: true`

- `veri/src/tipler.ts:140-169` `YontemTanimi`'ne `mulkKipi?: true`; `veri/src/sema.ts:142-157` `yontemSema`'ya `mulkKipi: z.literal(true).optional()`.
- Anlam: yöntem yalnız **mülk kipinde** (parsel fikstürü + `param.mulk` birlikte verilmiş) seçilebilir. Bölge kipinde `icerikDerle` bu yöntemleri tür listelerinden süzer (§5.5). `ic.icerik.yontemler` ve `ic.yontemler` **tam** kalır (indeksler sabit, kimlik tablosu sabit).
- `dogrulaIcerik` (`veri/src/dogrula.ts:245`, "yöntem hiçbir tesiste kullanılmıyor" kuralı `:358`) yeni kurallar:

| Kural | İleti (veri doğrulayıcı) |
|---|---|
| `mulkKipi` yöntemi hiçbir türün `yontemler[0]` (varsayılan) elemanı olamaz | `yontemler: "<id>" mulkKipi yontemi tur varsayilani olamaz (<tur>)` |
| `mulkKipi` yöntemine `gerekliTeknoloji` konamaz (kilitsizlik, A0-17) | `yontemler: "<id>" mulkKipi yontemi teknoloji sarti tasiyamaz` |
| `mulkKipi` yöntemi en az bir türde kullanılmalı (mevcut `:358` kuralı yeter) | mevcut ileti |

### 4.2 `MulkEkYapiTanimi.olcekHucre?: [number, number, number]`

- `veri/src/tipler.ts:577-600` `MulkEkYapiTanimi`'ne `olcekHucre?: [number, number, number]` (ek yapının ölçeğe göre kapladığı hücre sayısı; yalnız `dukkan` kullanır). `veri/src/sema.ts:364` `mulkEkYapiSema`'ya karşılığı.
- `dogrulaParametreler` (`dogrula.ts:537-551` mevcut tesis `olcekHucre` kuralının eşi): `[0] === yuva`, `[1] ≥ [0]`, `[2] ≥ [1]`, hepsi ≤ 5 (`ENCOK_AYAK_IZI`, `mulk/komut.ts:297`).
- Derleme (`derle.ts:163-187`): `DerlenmisEkYapi.olcekHucre?: number[]` (`tipler.ts:124-136`), tanımlıysa `[a, b, c]` kopyası.
- `dukkan` için değer **`[1, 2, 3]`** (bakkal 1, market 2, süpermarket 3 hücre). `[1, 2, 2]` istisnası **kullanılmaz** (sahip kararı S4-4: süpermarket 3 hücre).

### 4.3 `param.mulk.perakende` (yeni isteğe bağlı blok)

Tip `veri/src/tipler.ts`, `MulkParametreleri`'ne `perakende?: MulkPerakendeParametreleri` (`:627`); şema `veri/src/sema.ts:415` `mulkSema`. **Blok tanımsızsa** dükkân kuralları kapalıdır: `dukkan` ek yapısı tanımlı olsa bile `dukkan_*` komutları `perakende kapali` ile reddedilir ve çözümde hiçbir iş yapılmaz. Parametre adları A2 §1.13 taslağıyla uyumludur; T3 §8.3'teki `yerelPazar` bloğu **ayrı blok olmaz**, `perakende.talep` altına girer (tek kapı: perakende bloğu yoksa yerel pazar da yok).

```ts
export interface MulkPerakendeParametreleri {
  surum: 1;
  /** Dünyaya AÇIK dükkân ölçekleri (0 = S, 1 = M, 2 = L). Alfa-0: [0]. Oyuncuya konmuş kilit değil; özelliğin dünyaya açılış zamanlaması (T-43). */
  acikOlcekler: (0 | 1 | 2)[];
  /** Oyuncu başına ilçede en çok dükkân (biten + süren). A2 §1.13: 2. İl başına sınır `ekYapilar.dukkan.enFazlaIlBasina`. */
  ilceBasinaEnFazla: number;
  /** Fiyat bandı (R çarpanı, ppm): hem kademeler hem esnaf fiyatı bu aralıkta olmalı. A2 §1.13: [700 000, 1 400 000] (G12). */
  fiyatBandiPpm: [number, number];
  /** Fiyat kademeleri: dükkân fiyatı = R × kademe (ppm). Kesin artan, hepsi bant içinde. A2 §1.9: 4 kademe (kampanya, uygun, normal, yüksek). SAYI VE SIRA KALICI (GZ-3). */
  fiyatKademeleriPpm: number[];
  /** Yeni rafın / yeni malın varsayılan kademesi (indeks). A2 §1.13: 2 ("normal"). */
  varsayilanFiyatKademesi: number;
  /** Kampanya kademesinin indeksi (en düşük kademe, 0). KAMPANYA PENCERESİ SINIRLARI VARDIR (G7-1 şeması, mekanik §7.5b): aşağıdaki iki parametre tanımlı VE > 0 değilse kampanya kademesi `dukkan_fiyat` ile SEÇİLEMEZ (DUK-20); indeks her durumda yer tutar (araya kademe eklemek indeksleri kaydırırdı). Tanımsız = kampanya kademesi yok. */
  kampanyaKademesi?: number;
  /** Kampanya: dükkân başına günde en çok saat (sim günü içinde). A2/baş lider: 6. Tanımsız ya da 0 = kampanya KAPALI (varsayılan kapalı açılabilir). */
  kampanyaGunlukEnFazlaSaat?: number;
  /** Kampanya: dükkân başına sim haftasında en çok gün (en az bir kampanya saati olan gün). A2/baş lider: 2. Tanımsız ya da 0 = kampanya KAPALI. */
  kampanyaHaftalikEnFazlaGun?: number;
  /** Aynı yuvada iki fiyat/mal değişimi arası en az saat (hız sınırı). dikey §5.5 ve T3 §8.3: 6. 0 = sınır yok. (Günlük en çok 24/6 = 4 değişim bundan zaten çıkar: T3'ün `gunlukFiyatDegisimEnFazla` alanı alınmadı.) */
  fiyatDegisimEnAzSaat: number;
  /** Çeşit çarpanı: w × (PPM + cesitKatsayiPpm × cesit / PPM). A2 §1.13: 250 000. */
  cesitKatsayiPpm: number;
  /** Esnaf (NPC arka plan dükkân): fiyat R'nin katı ve oyuncu havuzunun tabanı. A2 §1.13: 1 120 000 ve 250 000. */
  esnaf: { fiyatPpm: number; tabanPayPpm: number };
  /** Ölçeğe göre dükkân sabitleri; indeks 0 = S, 1 = M, 2 = L. */
  olcekler: [DukkanOlcegi, DukkanOlcegi, DukkanOlcegi];
  /** Dükkân türleri (kimlik-listesi.json `dukkanTurleri` üyesi; mal kimlikleriyle kesişmez). Alfa-0: beş S türü (§3.3). */
  dukkanTurleri: DukkanTuruTanimi[];
  /** Yerel NPC hane talebi (G7a). */
  talep: YerelTalepParametreleri;
  /** Marka kuralları (§7.7). */
  marka: { hesapBasinaEnFazla: number; simgeSayisi: number; renkSayisi: number };   // ad uzunluk/kümesi parametre DEĞİL: AD_KURALI (cekirdek/src/ad.ts; §7.7)
}

export interface DukkanOlcegi {
  /** Raf yuvası sayısı. A2 §1.13. */
  rafYuvasi: number;
  /** Kasa kapasitesi, mili-birim/saat, TÜM mallar toplamı. A2 §1.13. */
  kasaMiliSaat: number;
  /** İşletme gideri, mili-₺/saat (para-yalnız gider: parça tüketimi ve aşınma yok; lavabo `isletme`). A2 §1.9. */
  giderMiliSaat: number;
  /** Çekim çarpanı (ppm). A2 §1.13 değil, perakende §3.4: 1 000 000 / 1 600 000 / 2 400 000 (Alfa-0'da yalnız S kullanılır). */
  cekimCarpaniPpm: number;
}

export interface DukkanTuruTanimi {
  id: string;
  ad: string;
  /** Rafa konabilen mallar (mal kimlikleri). */
  mallar: string[];
  /** Çeşit paydası (tam çeşit için gereken dolu yuva). A0 değeri mal sayısını AŞAMAZ (T3 §5.1, soru 9: parametre). */
  tamCesit: number;
  /** Bu türün geçerli ölçekleri. Alfa-0'da beşinde de [0]. */
  olcekAraligi: (0 | 1 | 2)[];
}

export interface YerelTalepParametreleri {
  /** Nüfus-başı talebi ilçe büyüklüğüne çeviren ölçek. A2 yerel talep kalibrasyonu (`241f1b9`, baş lider onaylı): **40**. */
  yerelOlcek: number;
  /** YEDEK nüfus eşdeğeri: ilçede `ParselIlceTanimi.nufus` YOKSA kullanılır; ilçe sınıfı (kirsal | kasaba | sehir) = fikstürdeki `ParselIlceTanimi.sinif` (§6.5; hücre sınıfından HESAPLANMAZ). A2 (`241f1b9`): 10 000 / 40 000 / 120 000. */
  ilceSinifiNufus: { kirsal: number; kasaba: number; sehir: number };
  /** Mal -> talep, mili-birim / 1000 nüfus / saat. Rafa girebilen HER mal için satır zorunlu (çıkmaz raf yok). A2 §1.9 tablosu: gida, ekmek, un, sut, sut_urunu, sekerleme, findik_urunu, yakit, pencere, cam, celik, parca (cimento A0'da mal değildir: satırı YAZILMAZ). */
  talep1000Saat: Record<string, number>;
  /** Talep grubu: her mal TAM BİR grupta. Grup iklim takvimini ve (varsa) bayram dalgasını taşır. A2 §1.9: gida, tatli, yakit, yapi. */
  gruplar: Record<string, { mallar: string[]; takvimPpm: number[]; bayram?: BayramDalgasi }>;
  /** Bayram günleri (sim günü indeksi; kesin artan; bayramın ilk günü). Alfa-0 değeri T3'ün resmî takvimden yazdığı listedir (doğrulanmadı: tarihler); boş olabilir. */
  bayramGunleri: number[];
}

/** Toplam-sabit bayram dalgası (A2 §1.9): bayramdan `oncesiGun` gün önce talep × oncesiPpm, bayram günü dahil sonraki `sonrasiGun` gün × sonrasiPpm. */
export interface BayramDalgasi { oncesiGun: number; oncesiPpm: number; sonrasiGun: number; sonrasiPpm: number }
```

Kurallar:

- `acikOlcekler` boş olamaz; her açık ölçek için en az bir tür `olcekAraligi`'nda o ölçeği taşır.
- `olcekler[o].rafYuvasi ≥ 1`, `kasaMiliSaat > 0`, `giderMiliSaat ≥ 0`, `cekimCarpaniPpm > 0`.
- Dükkân inşa bedeli ve süresi **ölçek için ayrı alan taşımaz**: M/L bedeli `ekYapilar.dukkan` S bedeli × `sanayi.olcekKademeleri[olcek].insaPpm` (1 / 2,5 / 4,5), süresi `mulk.olcekInsaSureCarpaniPpm` (1 / 1,5 / 2) ile çarpılır; tesis ölçeğiyle sapma yoktur. Bu, dükkânın sanayi katmanına bağımlı olduğu anlamına gelir (`sanayiTablosu(ic) === null` iken M/L reddi mevcut davranıştır, `mulk/komut.ts:273`).
- **Şemada bulunmayacak alanlar (A0-17 kilitsizlik testi):** `ilceSeviyesi`, `gerekliTeknoloji`, `oncekiTur`, `yukseltmeSarti` ve benzeri. `.strict()` bunu otomatik sağlar; test şema anahtar kümesini sabitler (§16).
- **İlçe nüfusu (baş lider onaylı, A2 `241f1b9`):** parsel fikstüründe `ParselIlceTanimi.nufus?: number` **isteğe bağlı** alandır (yalnız ekleme; §6.5, §17.2 G7-1). Fikstür sahibi O3'tür; T3 `ilceSinifiNufus` ve `yerelOlcek` (40) değerlerini yazar.
- **A2'nin `ilceSinifiNufus`, `talep1000Saat`, takvim ve bayram satırları aynen T3 tarafından işlenir** (A2 §1.9 ve §1.13); K3 bu sayılara dokunmaz ve çekirdekte sabit değer bulunmaz.
- **Mevcut mülk kipi davranışını ve ölçüm temel çizgisini DEĞİŞTİRMEZ (Ar-Ge lideri sorusu; doğrulandı: kod okuma).** A2'nin `talep1000Saat.gida = 90` (T3'ün 120'si değil; gıda 90 + ekmek 60 + un 10 + süt 20 + süt ürünü 20 = 200 sepeti sabit) **yalnız yeni `perakende.talep` bloğunda** yaşar. Bölge kipinin hane tüketimi ayrı bir bloktur (`param.nufus.tuketim1000Saat`; sepet toplamı aynı sayıdır ama iki blok **bağlı değildir**, biri değişince öteki değişmez). Mülk kipinde NPC hane gıda talebi **bugün yoktur**: işletme düğümünün `nufus = 0`'dır ve `bolgeHesapla` `h.nufusTuketim[m] = carpBol(b.nufus, q, 1000)` (`ekonomi/uretim.ts:353`) 0 verir. Yani `perakende` bloğu yokken ya da dükkân yokken mevcut mülk kipi NPC gıda talebi ve botların ölçüm temel çizgisi **aynıdır**; yerel talep yalnız bir `dukkan` kurulunca ve yalnız o dükkânın çekimine girer (§6). Bu bir baş lider kararı gerektirmez, ama A2'nin 120 → 90 düzeltmesi bilgi olarak kayıtlıdır (T3 §7.2 sapma tablosu, A2 §1.14).

### 4.4 `icerik.json` yöntem satırları

Biçim (`veri/src/tipler.ts:140`): tüm miktarlar **mili-birim/saat**, tam kadro ve tam verim, S ölçekte; `isci` kişi (mili); `bakim` mili-birim/saat; `kirlilikPpmSaat` ppm/saat. Her satır `mulkKipi: true`. **Değerler A2 §1.4 tablosu ve §1.13 JSON bloğudur (T3 oradan işler; bu belge kopyalamaz).** A2'nin "Y" varyantı (elektriksiz P4 tarifleri) **uygulanmaz**: şebeke elektriği (§5.2) A2 §4 soru 1'e yanıttır; tüm altı yöntem `elektrik` girdisini korur.

| Yöntem | Girdi kimlikleri | Çıktı kimlikleri | A2 satırı | Not |
|---|---|---|---|---|
| `degirmen` | `tahil`, `elektrik` | `un`, `kepek` | §1.4, §1.13 | yan ürün satırı yöntemin kendisinde (üretim K-4) |
| `ekmek_firini` | `un`, `yakit`, `elektrik` | `ekmek` | §1.4, §1.13 | yakıt şebekeden otomatik (§5.2.2b) |
| `kepek_gubresi` | `kepek`, `elektrik` | `gubre` | §1.4, §1.13 | kepeğin P0 Ü tüketicisi (§5.4); Tarla gübre dozuna döner |
| `sut_kepekli` | `tahil`, `kepek`, `elektrik` | `sut`, `gubre` | §1.4, §1.13 | veri satırı G6'da; dengesi P1 (A2 §1.6: ahır başına net `ahir_besi`nin gerisinde) |
| `cam_firini` (G8) | `silis`, `yakit`, `elektrik` | `cam` | §1.4, §1.13 (T3'ten FARKLI: A2 yakıt/elektrik değerleri) | ev sahibi `parca_fabrikasi` |
| `celik_dograma` (G8) | `celik`, `cam`, `parca`, `elektrik` | `pencere` | §1.4, §1.13 (T3'ten FARKLI: A2 parça ve çıktı değerleri) | ev sahibi `parca_fabrikasi` |

`isci`, `bakim`, `kirlilikPpmSaat`: A2 §1.4. Katma değer oranı bandı (A2 §1.4: 1,16–1,48; yöntem oranı bandı **uyarı** doğrulayıcısıdır, A2 §1.13 son satır). **A2 ↔ T3 farkı:** T3 §3.1'in `cam_firini` ve `celik_dograma` satırları dikey rapor değerleridir; A2 raporu üst-bant tarifleri önerir. **A2 tek kaynaktır** (baş lider; §1.2 madde 13): T3 bu iki satırı A2'ye göre yazar. A2'nin KD hesabı taban fiyatladır; çekirdek R0 ile çalışır (B2).

### 4.5 Doğrulayıcılar (iki katman, bundle sınırı)

**Katman 1 (zod şeması, `saf` paketine girer; +1–2 KB gzip tahmini):** `veri/src/sema.ts` `perakende` ve `sebeke` şemaları, `olcekHucre`, `mulkKipi`; biçim ve aralık denetimi.

**Katman 2 (Node-only, `saf`a GİRMEZ; yükleyiciler `dogrulaVeriPaketi`den sonra çağırır, `dogrulaKimlikKilidi` kalıbı, `veri/src/yukle.ts:48`):** yeni dosya `veri/src/perakende-dogrula.ts`, `dogrulaPerakende(paket): DogrulamaSonucu` (+ `uyarilar: string[]`; hata kanalı ve uyarı kanalı ayrıdır):

| # | Kural | İleti |
|---|---|---|
| V1 | `perakende` tanımlıysa `ekYapilar.dukkan` tanımlı ve `yuva = 1`; tersi de | `perakende: ekYapilar.dukkan ile birlikte tanimlanmali` |
| V2 | `dukkanTurleri[].id` tekil, `kimlik-listesi.json` `dukkanTurleri` üyesi; mal kimlikleriyle kesişmez | `perakende.dukkanTurleri: kimlik listede yok / mal ile kesisiyor: <id>` |
| V3 | `mallar[]` ⊂ `icerik.mallar`, depolanabilir, NPC pazar kaydı var (`emilimSaat > 0` ve `arzSaat > 0`) | `perakende.dukkanTurleri.<id>.mallar: pazar kaydi yok: <mal>` |
| V4 | **Çıkmaz raf yok:** rafa girebilen her malın `talep.talep1000Saat` satırı > 0 ve tam bir `gruplar[*].mallar` içinde | `perakende.talep: raf malinin talebi yok: <mal>` |
| V5 | (A1 için; G7'de yalnız uyarı) `market ⊇ bakkal`, `supermarket ⊇ market` (kayıtlar varsa) | uyarı: `perakende: mal listeleri ic ice degil: <tur>` |
| V6 | `fiyatKademeleriPpm` kesin artan, hepsi `fiyatBandiPpm` içinde, uzunluk ≥ 3; `varsayilanFiyatKademesi < uzunluk`; `kampanyaKademesi` varsa `= 0`; `kampanyaGunlukEnFazlaSaat ∈ [0, 24]`, `kampanyaHaftalikEnFazlaGun ∈ [0, 7]` (ikisi de yoksa kampanya kapalı) | `perakende.fiyatKademeleriPpm: ...` |
| V7 | `esnaf.tabanPayPpm ∈ [0, 1 000 000)`, `esnaf.fiyatPpm` bant içinde | `perakende.esnaf: ...` |
| V8 | `olcekAraligi ⊂ {0,1,2}`, **boş ve yinelenen olamaz**; `acikOlcekler` tekil ve **her açık ölçeği en az bir dükkân türü taşımalı** (taşıyıcı tür yoksa açık ölçek ölü ayardır; K4 G7-1a, Kod lideri kabul); `tamCesit ≥ 1` ve `tamCesit ≤ mallar.length`; mal listesi tekrarsız | `perakende.dukkanTurleri.<id>: ...` |
| V9 | `talep`: `ilceSinifiNufus` (yedek eşdeğer) üç anahtar > 0; `yerelOlcek ≥ 1`; her grubun `takvimPpm` uzunluğu 12, değerler > 0 ve **toplamı tam 12 000 000**; `gruplar` kapsaması: her `talep1000Saat` malı tam bir grupta; `bayram` varsa `oncesiGun × (oncesiPpm − 1 000 000) + sonrasiGun × (sonrasiPpm − 1 000 000) = 0` (toplam sabit; A2 §1.9) ve ppm değerleri > 0; `bayramGunleri` kesin artan, komşu fark ≥ en büyük `oncesiGun + sonrasiGun` | `perakende.talep: ...` |
| V9b | **Fikstür ve ızgara girdisi** (`veri/src/parsel.ts` zod `ilceSema` + `parselFiksturuDogrula`; `veri/src/izgara.ts` `ParselIzgaraIlce.nufus?` + `parselIzgaraHatalari`, Katman 1): `nufus` varsa tamsayı, `1 ≤ nufus ≤ 20 000 000` (`ILCE_NUFUS_ENCOK`); ızgara ilçesinde `sinif` yoksa `ilceSinifiTuret` (en yüksek hücre sınıfı) türetilir ve yedek eşdeğer ondan okunur; yoksa kural yok (alan **isteğe bağlı**, bozuk fikstür hatası: `ilceler[i] (<id>): nufus tamsayi ve 1..20000000 olmali`) | `ilceler[i]: ...` |
| V10 | Marka: `hesapBasinaEnFazla ∈ [1, 3]`, `simgeSayisi`, `renkSayisi ≥ 1` (ad uzunluğu ve izinli küme parametre değil, çekirdek sabiti `AD_KURALI`) | `perakende.marka: ...` |
| V11 | Kilitsizlik taraması: `perakende` ve `ekYapilar.dukkan` alt ağacında seviye/teknoloji/önkoşul anahtarı yok (A0-17) | `perakende: kilit alani yasak: <anahtar>` |
| V12 | `ekYapilar.dukkan.insaMaliyeti` malları içerikte **ve depolanabilir**. Genel doğrulama ek yapı malzemelerine bakmaz (bugün `icerikDerle` Error atar), bu yüzden kural `dukkan` için veri katmanında yazılır (K4 G7-1a; diğer ek yapılar değişmez) | `mulk.ekYapilar.dukkan.insaMaliyeti: bilinmeyen mal "<m>"` / `"<m>" depolanamaz mal` |
| V13 | **Çıkmaz mal (UA1)**: (a) yan ürün kuralı **hata**: `kepek` için en az bir yöntemin girdisinde `kepek` geçer (Ü) **ve** `emilimSaat.kepek > 0` (N: NPC dünya pazarı güvence alıcıdır, §5.4); aynı kural `gubre` için (Ü: Tarla gübre dozu, `tarim.gubreTuketimiSaat`; N: `emilimSaat.gubre > 0`); (b) genel kural **uyarı** (A0): her depolanabilir mal en az iki farklı tüketici türüne sahip (Ü yöntem girdisi, H raf, Y yapı maliyeti, P pazar emilimi > 0; **K ve N ancak kodda var olunca sayılır**); `elektrik` muaftır (depolanamaz). Sabit `CIKMAZ_MAL_HATA = false`; P1 teslim kapısı bunu `true` yapar (S15) | hata: `icerik: yan urun alicisiz: <mal>`; uyarı: `icerik: cikmaz mal: <mal> (tuketici turu <n> < 2)` |
| V14 | `mulk.sebeke` (§4.7): `mallar` boş değil, `mal` kimlikleri içerikte ve tekil; `elektrik` kaydı varsa `elektrik` malı depolanamaz ve en az bir yöntem `elektrik` girdisi taşır; `elektrik` dışındaki mallar depolanabilir ve en az bir yöntem girdisinde geçer (aksi halde uyarı: ölü kayıt); `0 < tavanOraniPpm ≤ 1 000 000`; `kasaPayiPpm ∈ [0, 1 000 000]` | `sebeke: ...` |
| V15 | Yöntem oranı bandı (A2 §1.13 son satır): her `mulkKipi` yönteminin çıktı/girdi değeri oranı [1,16; 1,48] dışında **uyarı** (hata değil; taban fiyatla) | uyarı: `icerik.yontemler.<id>: oran bandi disi` |
| V16 | `mulkKipi` yöntemi hiçbir türün `yontemler[0]` (varsayılan) elemanı olamaz ve `gerekliTeknoloji` taşıyamaz (§4.1) | §4.1 iletileri |
| V17 | `mulk.yontemGecersizKilma` (§4.8): anahtarlar `icerik.yontemler` kimlikleri; `0 < ciktiPpm ≤ 2 000 000` | `yontemGecersizKilma: ...` |

**Kimlik kilidi bağlantısı:** §3.5 (`dogrulaKimlikKilidi` `dukkanTurleri` ve `yontemler` geçirir).

### 4.6 Çekirdekte derleme (`derle.ts`)

`DerlenmisMulk` (`tipler.ts:80-114`) alanları (hepsi ilgili blok tanımlıysa dolu, değilse `undefined`):

```ts
export interface DerlenmisPerakende {
  p: MulkPerakendeParametreleri;
  /** tür kimliği -> tür (mal indeksleri çevrilmiş, sıralı). */
  turler: Map<string, { ad: string; mallar: number[]; malKumesi: Set<number>; tamCesit: number; olcekAraligi: (0|1|2)[] }>;
  /** ilçe kimliği -> mal indeksi -> taban talep (mili-birim/saat) = carpBol(talep1000Saat[m] × yerelOlcek, ilceNufusEsdegeri(ilce), 1000); satırı yoksa 0. Derlemede bir kez (her ilçe için 12 mal). */
  talepTaban: Map<string, number[]>;
  /** mal indeksi -> grup indeksi (-1: grupsuz) ve grup başına 12 aylık çarpan (ppm). */
  malGrubu: number[];
  grupTakvim: number[][];
  /** grup başına bayram dalgası (yoksa null); bayram günleri artan sırayla. */
  grupBayram: ({ oncesiGun: number; oncesiPpm: number; sonrasiGun: number; sonrasiPpm: number } | null)[];
  bayramGunleri: number[];
  /** ilçe kimliği -> nüfus eşdeğeri = `ilceNufusEsdegeri` sonucu (fikstürden; §6.5). */
  ilceNufus: Map<string, number>;
  /** `ekYapilar.dukkan` indeksi (`DerlenmisMulk.ekYapiIndeks.get("dukkan")`). */
  dukkanEkYapi: number;
}

export interface DerlenmisSebeke {
  /** Elektrik kaydı (anlık denge yolu) ya da undefined (listede yok). */
  elektrik?: { mal: number; birimFiyatMili: number /* derleme zamanında: tabanFiyat × kamuIthalatCarpaniPpm × tavanOraniPpm */ };
  /** Stoksuz tüketim anı yolu: mal indeksi -> kayıt (hepsi depolanabilir mallar; mal indeksine göre sıralı). */
  stoksuz: { mal: number; birimFiyatMili: number }[];
  /** mal indeksi -> stoksuz kayıt indeksi ya da -1 (hızlı sorgu). */
  stoksuzIndeks: number[];
  kasaPayiPpm: number;
}
```

`DerlenmisMulk.perakende?: DerlenmisPerakende` ve `DerlenmisMulk.sebeke?: DerlenmisSebeke` eklenir. Hatalar `Error` ile (derleme sırasında; `mulkDerle` `derle.ts:114-198`): bilinmeyen mal/tür, `acikOlcekler` boş, `dukkan` ek yapısı yok, `sebeke.mallar[].mal` içerikte yok. Node-only ek semantik kurallar (V3–V5, V13, V15) çekirdekte **yok** (çekirdek `@bolge/veri`'den yalnız tip alır; `mal-kimlik-kilidi-paket.test.ts` güvencesi).

### 4.7 `param.mulk.sebeke` (yeni isteğe bağlı blok; şebekeden otomatik tedarik edilen mallar)

Tip `veri/src/tipler.ts` `MulkParametreleri.sebeke?: MulkSebekeParametreleri`; şema `sema.ts` `mulkSema` (`.strict()`); `parametreler.json` `mulk` altında. **Blok yoksa şebeke yoktur ve çekirdek davranışı bugünküyle bayt bayt aynıdır** (bayrak = bloğun varlığı; ayrı mantıksal bayrak yok). **Mal listesi genişletilebilirdir** (baş lider kararı): şebekeden alınan mallar `mallar[]` içindedir; listede olmayan mal şebekeden alınmaz (`yakit: false` gibi bayrak yoktur). A2 §1.13 taslağının `elektrik`/`yakit` bayrakları ve `fiyatKaynagi`/`lavaboKalemi` alanları şemada **yoktur** (kod sabiti: defter satırı `sebeke`).

**Fiyat (baş lider kararı, S-16): TABAN.** `birimFiyat(mal) = tabanFiyat(mal) × kamuIthalatCarpaniPpm × tavanOraniPpm` (elektrik 10,35 ₺, yakıt 103,5 ₺). **Canlı referans (`d.pazar.fiyat`) yolu kodda YOKTUR** (ölü kod istenmiyor): bu şemada `fiyatReferansi` alanı bulunmaz.

```ts
export interface MulkSebekeParametreleri {
  surum: 1;
  /** Şebekeden otomatik alınan mallar (içerik mal kimliği; tekil). Alfa-0: elektrik ve yakıt. Sıra anlamsızdır; çekirdek mal indeksine göre sıralar. */
  mallar: SebekeMali[];
  /** Toplam bedelin (tüm mallar) ilçe kamu kasasına giden payı (ppm); kalanı lavaboda yanar. A2 §1.3-B1: 120 000. Tamsayı: kasa = floor(ödeme × pay / 1e6), lavabo = ödeme − kasa. */
  kasaPayiPpm: number;
}

export interface SebekeMali {
  /** Mal kimliği. "elektrik" (depolanamaz) anlık denge yoluyla (§5.2.2), diğer depolanabilir mallar stoksuz tüketim anı yoluyla (§5.2.2b) çözülür. */
  mal: string;
  /**
   * Birim fiyatın kamu fiyat tavanına oranı (ppm); 0 < değer ≤ 1 000 000: şebeke ASLA tavanın üstünde satmaz. Değer 1 000 000 (A2: 1,035 R).
   * Santralin cazibesi bu parametreyle AYARLANMAZ (baş lider: santral fiyatına/maliyetine dokunulmaz; O5).
   */
  tavanOraniPpm: number;
}
```

**Neden mal başına `tavanOraniPpm`:** ileride tek bir malın şebeke fiyatını ayrı ayarlamak (örn. yakıt) kod değişikliği gerektirmez, yalnız veri (kural dönemi). **Genişletme:** üçüncü bir mal eklemek listeye bir satırdır (içerikte olmalı; depolanabilirse stoksuz yol, `elektrik` ise anlık denge yolu).

Değerler (T3 yazar): `mallar: [{ mal: "elektrik", tavanOraniPpm: 1000000 }, { mal: "yakit", tavanOraniPpm: 1000000 }]`, `kasaPayiPpm: 120000`. Doğrulayıcı V14: `mallar` boş değil; `mal` kimlikleri içerikte ve tekil; `elektrik` kaydı varsa `elektrik` malı depolanamaz ve en az bir yöntem `elektrik` girdisi taşır; `elektrik` dışındaki mallar depolanabilir ve en az bir yöntem girdisinde geçer (aksi halde uyarı: ölü kayıt); `0 < tavanOraniPpm ≤ 1 000 000`; `kasaPayiPpm ∈ [0, 1 000 000]`.

### 4.8 `param.mulk.yontemGecersizKilma` (yeni isteğe bağlı blok; yedek seçenek, varsayılan KAPALI)

Şema ve çekirdek yolu §5.9'dadır. Bu bölümde şemanın yeri: `veri/src/tipler.ts` `MulkParametreleri.yontemGecersizKilma?: MulkYontemGecersizKilmaParametreleri`; `sema.ts` `mulkSema` (`.strict()`; anahtarlar serbest kimlik, değer `{ ciktiPpm }` `.strict()`); doğrulayıcı V17 (`perakende-dogrula.ts`, Katman 2). `ciktiPpm = 1 000 000` iken çekirdek davranışı bugünküyle aynıdır.

## 5. G6: ekmek zinciri ve şebeke enerjisi

### 5.1 Ne eklenir

1. **Şema (K3, önce; hepsi isteğe bağlı/no-op):** `YontemTanimi.mulkKipi` (§4.1); `mulk.sebeke` bloğu (§4.7); `mulk.yontemGecersizKilma` bloğu (§4.8; varsayılan kapalı); `kimlik-listesi.json` `yontemler` bölümü (§3.5); `tesis_insa_hucre`/`yapi_yerlestir` komutlarına `yontem?` alanı için tip (§5.8).
2. **Veri (T3; K3'ün şeması indikten sonra):** `icerik.json` `yontemler[]` SONUNA `degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli` (indeks 24–27; §3.2, §4.4); `gida_fabrikasi.yontemler` ve `ahir.yontemler` sonlarına ekleme; `parametreler.json` `mulk.sebeke` ve `mulk.yontemGecersizKilma` (`ciktiPpm: 1000000`, kapalı); `kimlik-listesi.json` `yontemler` kayıtları (28 kayıt).
3. **Çekirdek (K3):**
   - `icerikDerle` bölge kipi süzgeci (§5.5);
   - **şebeke elektriği** (§5.2): `ekonomi/uretim.ts`, `lojistik/cozum.ts`, `mulk/kasa.ts`, `tipler.ts`, `serilestir.ts`, `paraSayac.ts`;
   - yapı komutlarında `yontem` alanı (§5.8): `mulk/komut.ts`, `ekonomi/insaat.ts`, `tipler.ts`;
   - `yontemGecersizKilma` yolu (§5.9): `ekonomi/uretim.ts:204-222` sonunda 2 satır, `derle.ts` (kapalıyken no-op).
   Başka çekirdek kodu **yok**: çok çıktılı yöntem, `yontem_degistir`, ödül dedektörü zaten çalışıyor (§2.1).
4. **Testler (K3, K2, O2):** §16 G6 satırları.
5. **Bot önayarı (O2):** §15.

### 5.2 Şebeke elektriği (SE): mülk kipinde elektriğin otomatik tedariki

#### 5.2.1 Karar

Baş lider kararı: Alfa-0'da **santral zorunlu değildir**. Mülk kipinde, işletme düğümünde **elektrik** ihtiyacının kendi santralden karşılanamayan kısmı ve **yakıt** girdisi (A2 §1.3-B1: "elektrik ve yakıt kamu şebekesinden otomatik gelir") kamu şebekesinden otomatik alınır. Yeni komut yoktur. Veri şeması değişmez: yöntemlerin `girdiler.elektrik` alanı aynı kalıpla kalır; tedarik kaynağı **çekirdekte** çözülür (Ar-Ge lideri önerisi; yanıt: "yöntemlerdeki `girdiler.elektrik` şebekeden çekim olarak yorumlanır; ayrı alan ya da mekanizma yok"). Gerekçe: (a) A2 §1.3-B1: santral ilk gün yatırımına +%40 (santralsiz en düşük nakit 41.710 ₺, santralli 30.781 ₺: A2 §1.14) ve ilk-5 indirim hakkından birini yer; (b) "kilit yok, seçim var": santral kurmak bir **seçimdir**, ön koşul değil; (c) A2'nin "Y" varyantı (elektriksiz tarifler) yöntem tariflerini kalıcı olarak değiştirirdi (A2 ZA-1: geri dönüşü zor), şebeke ise yalnız bir parametre bloğudur.

**Kapsam:** yalnız mülk kipi (`ic.mulk !== undefined`), yalnız işletme düğümü (`BolgeDurumu.merkez !== undefined`), yalnız `ic.mulk.sebeke !== undefined` iken ve yalnız `sebeke.mallar[]` listesindeki mallar için (blok yoksa ya da mal listede yoksa hiçbir kod yolu değişmez). Bölge kipi ve harita bölgeleri **dokunulmaz** (§13 K-4). Listedeki mallar **aynı tedarik ilkesini** paylaşır (otomatik, kamu fiyat tavanı, tek defter satırı) ama **iki mekanikle** çözülür: `elektrik` anlık dengedir (§5.2.2), listedeki diğer (depolanabilir) mallar, Alfa-0'da `yakit`, tüketim anında stoksuz alınır (§5.2.2b).

**Santral** isteğe bağlı oyuncu yatırımıdır: kendi elektriğini üretir (önce o kullanılır); **fazlasını kamuya satamaz** (`elektrikDagit` santral yükü talebi izler: fazla üretim yoktur, satış yolu yoktur); santralin **kömürü** bugünkü gibi **ticaret emri ithalatıdır**; `yakit_jeneratoru`'nun yakıtı şebekeden gelir (§5.2.2b, §5.2.8). **Santralin şebekeye göre ekonomisi (baş lider kararı):** yalnız hidroda ve yüksek yükte kârlıdır; şartnamede, oyun içi metinde ve arayüzde **"daha ucuz" vaadi yoktur**, oyuncuya gerçek sayılar gösterilir (A2: kömür tam yükte yalnız %5–6 avantaj, başabaş yük %59–67; yakıt jeneratörü hiç avantajlı değil; hidro %12–14); santral fiyatına ve maliyetine **dokunulmaz** (B7).

#### 5.2.2 Algoritma (`ekonomi/uretim.ts`)

`elektrikUygula(sn, h, tesisSayisi)` (`:381`) `sebeke: DerlenmisSebeke | null` parametresi alır. `bolgeVerimCoz` (`:421`) bunu hesaplar ve **iki** çağrı noktasına (`:436` ve `:517`) geçirir:

```ts
const sb = ctx.ic.mulk?.sebeke;
const sebeke = sb !== undefined && sb.elektrik !== undefined && h.bolge.merkez !== undefined ? sb : null;   // elektrik yolu
const stoksuz = sb !== undefined && sb.stoksuz.length > 0 && h.bolge.merkez !== undefined ? sb.stoksuzIndeks : null; // stoksuz yol (§5.2.2b)
```

`elektrikUygula` içinde, `elektrikDagit` çağrısından SONRA ve `h.elektrik = e` atamasından ÖNCE:

```ts
let e = elektrikDagit(kapasite, talepTesis, h.haneElektrik, sn.p.iletimKaybiPpm, sn.p.haneOnceligi);   // 1. kendi santral
h.sebekeMili = 0;
if (sebeke !== null) {
  const toplam = talepTesis + h.haneElektrik;
  const arz = carpBol(kapasite, PPM - sn.p.iletimKaybiPpm, PPM);          // elektrikDagit içindeki arz ile AYNI ifade
  const acik = toplam > arz ? toplam - arz : 0;                           // 2. kalan açık
  if (acik > 0) {
    h.sebekeMili = acik;                                                   // şebekeden teslim edilen (mili-birim/saat; kayıpsız)
    e = { ...e, tesisKarsilanmaPpm: PPM, haneKarsilanmaPpm: PPM };         // yukPpm ve uretim e'den kalır: santral tam yükte
  }
}
h.elektrik = e;
```

- **Sıra: önce kendi santral, sonra şebeke.** `elektrikDagit` santral yükünü talebi izleyecek biçimde zaten ayarlar (`sanayi/elektrik.ts:50-65`); talep arzı aşınca yük `PPM` olur: yani kendi santral **tam yükte** çalışır, açık şebekeden gelir. Santral yoksa `kapasite = 0`, `arz = 0`, `acik = toplam`.
- Şebekeden alınan elektrik **iletim kaybına uğramaz** (teslim edilen miktar kadar ödenir): `acik` zaten teslim miktarıdır.
- Şebeke **kapasite sınırı yoktur** (Alfa-0; S-5).
- `elektrikUygula` iki kez çağrıldığı için (`:436`, `:517` yinelemeli döngü) şebeke her çağrıda yeniden hesaplanır; son çağrının `h.sebekeMili` değeri geçerlidir (idempotent: `acik` yalnız `verimOn`'un fonksiyonudur).
- `BolgeHesabi` (`:31`) `sebekeMili: Mili` (geçici; `hesapAl` `:117` her çözümde `0`'a sıfırlar, `:183-187` `h.elektrikGirdi.fill(0)` kalıbı).

**Kalıcı durum:** `BolgeElektrikDurumu` (`tipler.ts:222-237`) `sebekeMili?: Mili`. `bolgeDurumunaYaz` (`:596-603`) `b.elektrik` nesnesini kurduktan sonra: `h.sebekeMili > 0` ise `b.elektrik.sebekeMili = h.sebekeMili`, değilse alan **yazılmaz** (nesne her seferinde baştan kurulduğu için ayrıca silmek gerekmez). `bolgeUykuUygula` (`:562-563`) değişmez. Alan yalnız şebeke etkinken ve gerçekten alım varken görünür: bölge kipi ve eski mülk görüntüleri bayt bayt aynıdır. `serilestir.ts` `b.elektrik`'i doğrulamadığı için doğrulayıcı değişikliği gerekmez (doğrulandı: arama); yine de K3 `sebekeMili` için `tamsayi ≥ 0` denetimini ekler (§11.1).

#### 5.2.2b Stoksuz tedarik: listedeki depolanabilir mallar (Alfa-0: yakıt)

`sebeke.mallar[]` içindeki `elektrik` dışı mallar (Alfa-0'da `yakit`) depolanabilir mallardır; "eksik stoğu tamamlayan örtük ithalat" yaklaşımı (talep − stok) öncelik katmanlarıyla (fr1–fr4) ve stok ufkuyla iç içe geçer ve **fazla alıp stokta biriktirme** riski taşır. Bu yüzden bu mallar **elektrik gibi tüketim anında** alınır: yöntem girdisi olarak geçtikleri tesisler için mal **stoktan talep edilmez ve stoktan düşülmez**; yöntemin verimi o malın stoğuyla **sınırlanmaz**; alınan miktar = gerçek tüketim.

**NPC ithalat yoluyla birlikte yaşama (yakıt):** şebeke yakıtı ticaret emri (NPC ithalatı) yolunu **devre dışı bırakmaz**; ikisi **bağımsızdır**. Oyuncu yakıt ithalat emri verebilir ve ithal yakıt düğüm stoğuna girer (stok birikir, satılabilir, `kömür santrali` dışındaki tüketiciler için de kullanılabilir), ama **şebekeli tesis o stoğu kullanmaz**: tesis yakıt girdisini şebekeden alır, stok olduğu gibi kalır. Yani (a) fırın/cam fırını için yakıt ithalat emri **gerekmez** ve emir yuvası harcanmaz (A2 §1.3-B2 emir yuvası tablosu); (b) emir vermek zararsızdır ama yararsızdır (ithalat nakit çarpanı ≥ 1,035 R'dir; şebeke fiyatı tavan olduğundan şebeke ithalattan ucuzdur: A2 "NPC ithalatının %6,8 altı"); (c) yakıt arz/talebi `d.pazar.oyuncuTalebi/oyuncuArzi`'ni **etkilemez** (şebeke pazar hacmine girmez); (d) yakıtın stoktan başka tüketicisi (ör. bölge kipi hane yakıtı, mülk düğümünde yok; santral girdisi `komur_santrali` kömürdür, `yakit_jeneratoru` yakıtı şebekeli tesis olarak şebekeden alır) etkilenmez.

Dört değişiklik (hepsi `ekonomi/uretim.ts`; `stoksuz` = `bolgeVerimCoz`'un yukarıdaki `stoksuzIndeks` tablosu ya da `null`; `bolgeHesapla` ve `bolgeOranlariUygula` aynı ifadeyi yerel olarak hesaplar; mal `m` için `stoksuz !== null && stoksuz[m] >= 0` "şebekeli mal" demektir):

| # | Yer | Değişiklik |
|---|---|---|
| Y-a | `bolgeHesapla` girdi döngüsü `:338` (`for (const [m, q] of y.girdi)`) | şebekeli mal ise `continue` (`girdiPot` ve dolayısıyla `talep[m]` bu girdiyi **içermez**) |
| Y-b | `bolgeVerimCoz` verim döngüsü `:501-504` (`for (const [m] of y.girdi) { const f = h.fr3[m] … }`) | şebekeli mal ise `continue` (şebekeli mal verimi kısmaz) |
| Y-c | `bolgeVerimCoz` sonu (`:521-529` "son verimle brüt çıktıyı tazele" bloğunun yanında) | her şebekeli mal `m` için `h.sebekeStoksuz[m] = Σ_i Σ_(m ∈ y.girdi) carpBol(carpBol(q, olcek_i, PPM), verimPpm_i, PPM)` (gerçek tüketim; santral girdisi `verimPpm` zaten yükle ölçekli) |
| Y-d | `bolgeOranlariUygula` `girdiGercek` döngüsü `:640-654` (`:646`) | şebekeli mal ise `continue` (stok düşmez) |

- Önce hesap (Y-c), sonra kalıcı yazım: `bolgeDurumunaYaz` (`cozum.ts:288`, `bolgeVerimCoz`'dan sonra) `BolgeDurumu.sebekeTuketim?: Record<string, Mili>` alanını **mal kimliği** anahtarıyla yazar (yalnız `> 0` olanlar; hiç yoksa alan yazılmaz). Alan `tipler.ts:238` `BolgeDurumu`'na (`elektrik?` alanının yanına, `:270`) isteğe bağlı eklenir; **mal kimliği** anahtarı `dunyaYenidenIndeksle` kapsamına girmez (mal indeksi durumda tutulmaz).
- `BolgeHesabi.sebekeStoksuz: Mili[]` (mal indeksine göre; geçici; `hesapAl` sıfırlar).
- Kömür (`komur_santrali` girdisi) şebeke listesinde değildir: şebekeden gelmez, ithalatla gelir (§5.2.8).
- Listede stoksuz mal yoksa (`stoksuz === null`) Y-a…Y-d atlanır: davranış bugünküyle aynıdır.

#### 5.2.3 Tik adımı ve sıra (`lojistik/cozum.ts`)

`lojistikCoz` (`:228`) saatlik tıkta (`ekonomi/index.ts:18`) ve her kirli komutta çalışır. Şebeke şu noktalarda devreye girer:

| # | Adım (`cozum.ts`) | Şebeke ile ilgili iş |
|---|---|---|
| 0 | muhasebe `:237-239` | `paraMuhasebesi` önceki saatlik akışları kesin işler: **şebeke bedelinin lavabo ve kasa girişi birikimi** (§5.2.5) |
| 1 | `:243-253` `hazineKalemleri(d, ctx, o, null, dl)` | `hesaplar = null`: bedel, bir önceki çözümün kalıcı `b.elektrik.sebekeMili` ve `b.sebekeTuketim` değerlerinden **tahmin** edilir (ihracat için `e.gerceklesenSaat` kalıbı); ödeme gücü bu gider dahil hesaplanır |
| 4–5 | `:281-290` `bolgeVerimCoz` → `elektrikUygula` ve yakıt tüketimi (Y-c) | elektrik açığı ve yakıt tüketimi bulunur; `bolgeDurumunaYaz` (`:288`) kalıcı yazar; `bolgeOranlariUygula` yakıtı stoktan düşmez (Y-d) |
| 6 | `:293-308` `hazineKalemleri(d, ctx, o, hesaplar, dl)` | bedel `hesaplar[b.indeks].sebekeMili` ve `.sebekeStoksuz[m]`'den kesin hesaplanır; `hazineOranAyarla(gelir − gider)`; `paraAkisiYaz({…, sebeke, kasa})` |

**Sıra özeti (bir çözüm içinde):** kendi santral (`elektrikDagit`) → şebeke açığı (`acik`) → verim → gider (bedel) → hazine oranı → defter oranları. Bedel **saatlik oran** olarak yazılır, tembel birikir (yeni olay yok).

#### 5.2.4 Fiyat ve bedel (TABAN; baş lider kararı)

```
birimFiyatMili(mal) = carpBol(carpBol(ic.mallar[mal].tabanFiyat, ic.mulk.kamuIthalatCarpaniPpm, PPM), sebeke.tavanOraniPpm(mal), PPM)   // DERLEME ZAMANINDA bir kez; DerlenmisSebeke'de sabit
bedel = Σ_mal carpBol(tüketilenMili(mal), birimFiyatMili(mal), MILI)       // mili-₺ / saat  (cozum.ts:127 ile aynı birim kalıbı)
```

- Fiyat **tamsayı sabittir**: `tabanFiyat × kamuIthalatCarpaniPpm × tavanOraniPpm`. `kamuIthalatCarpaniPpm` (1 035 000) `derle.ts:193` `kamuIthalatCarpaniHesapla`'dan gelir (`mulk/kamuFiyat.ts:18-22`; kamu fiyat tavanı kuralı: ulaşılabilecek en düşük NPC ithalat çarpanı; Ticaret ofisi ve anlaşma makası dahil, oyuncudan bağımsız). `d.pazar.fiyat` (canlı referans) **okunmaz**: şebeke fiyatı oyuncu emirleriyle oynamaz, manipüle edilemez; `kamuFiyatTavani` (`mulk/kasa.ts:415-424`) kamu sipariş tavanı için kalır ve şebeke onu çağırmaz. Canlı referans yolu kodda **yoktur** (ölü kod istenmiyor).
- **Elektrik** 10,35 ₺ (`10 000 × 1 035 000 / 1 000 000 = 10 350` mili-₺/birim); **yakıt** 103,5 ₺ (`100 000 → 103 500`). Örnek: `degirmen` S 12 elektrik/sa → `12 000 × 10 350 / 1 000 = 124 200` mili-₺/sa = 124,2 ₺/sa. **(doğrulandı: yöntem)** geçici test, `mulkVeriTam` + `mulkSim`: `elektrik` mal indeksi 13, `kamuIthalatCarpaniPpm = 1 035 000`, `kamuFiyatTavani(elektrik) = 10 350` (elektrik için canlı referans zaten tabandır; yakıt için canlı R0 111,54 ₺ olurdu, bu yüzden canlı yol seçilmedi: B2).
- A2'nin tüm şebeke sayıları (§1.3-B1) bu fiyatlarla tutarlıdır; yeniden hesap gerekmez (S-16 kapandı).
- `tavanOraniPpm < 1 000 000` o malın şebeke fiyatını tavanın altına çeker (parametre); `> 1 000 000` doğrulayıcıda yasak.

#### 5.2.5 Para defteri: kasa payı + lavabo, iki ayrı satır

Bedelin bir kısmı **ilçe kasasına** (kamu bütçesi; kasa yalnız yanan paradan beslenir kuralı bununla uyumludur: bedel oyuncunun hazinesinden çıkan, **yanan** paradır), kalanı **lavaboda** yanar. Pay `mulk.sebeke.kasaPayiPpm`:

| Satır | Kalem | Tür | Tutar |
|---|---|---|---|
| lavabo | `lavabo.sebeke` (YENİ, isteğe bağlı, tembel) | yanan para | `bedel − kasa payı` |
| kasa girişi | `kasa.giris.sebeke` (YENİ, isteğe bağlı, tembel; `KasaGirisKalemi` + `"sebeke"`) | kamu bütçesi | `Σ_ilçe carpBol(bedel_ilçe, kasaPayiPpm, PPM)` |

- **Hangi kasa:** düğümün **ilçe kasası** `k:ilce:<id>` (`kamuIlceKimligi`, `mulk/kamu.ts`); ilçe `dugumIlcesi(d, ic, oyuncu, b.id)` (`mulk/kasa.ts:179`: oyuncunun düğümün ilindeki en çok hücreli ilçesi; eşitlikte kimlik; hücre yoksa ilin ilk ilçesi) ile bulunur. Gerekçe: ithalat makası ve komisyonu da ilçe kasasına gider (`kasaOranlariHesapla`, `kasa.ts:302-303`); elektrik şebekesi ilçe düzeyi kamu hizmetidir; mahalle/il bölüşümü (vergi gibi 20/40/15) bu parametreyle gelmez (gerekirse `kasaPayi` üçe bölünür: şema genişletilebilir; `kasaPayiPpm` şimdilik yalnız ilçe).
- **`kasaPayiPpm = 120 000` (%12; A2 §1.3-B1)**: tek P4 oyuncusu olan en ince ilçede bile kamu siparişi v0 çekirdeğini (23.381 ₺/hafta) 1,1× karşılar; kalabalık ilçede kasa kapasitesi 4–10×, sipariş sayısı (≤ 5/hafta) bağlayıcıdır; lavabo payı %88 kalır. Baş lider kararı: pay ekonomide kalır ve kamu siparişini besler; kalanı lavaboya gider. Kamu NPC alıcısı bu kasadan ödenek verir (`kamuAlici` `mulk/kasa.ts:320`; `kasa.haftalikButcePpm`, `oyuncuPayiTavaniPpm`; `parametreler.json:235-243`), yani pay **dolaşıma geri döner** (kamu siparişiyle oyunculara); lavaboya giden kısım yanar. **Tamsayı kuralı (A2 §1.3-B1; test örneği):** `kasa = floor(ödeme × kasaPayiPpm / 1 000 000)`, `lavabo = ödeme − kasa`. Örnek: ödeme 397.576.620 mili-₺ → kasa 47.709.194, lavabo 349.867.426 (toplamları eşit; korunum her tikte tam kapanır; P4 oyuncusunun haftalık şebeke ödemesi 397.577 ₺ = elektrik 49.817 + yakıt 347.760, A2 §1.3-B1). Pay 0 verilirse kasa alanı hiç yazılmaz (`giris.sebeke` oluşmaz, `ParaAkisi.kasa`'ya girmez); bu karar değildir.
- `kasaOranlari` (`mulk/kasa.ts:205`) imzasına `sebekeIlce: ReadonlyMap<string, Mili>` eklenir; `kasaOranlariHesapla` (`:302-303` yanına): `for (const [ilce, x] of sebekeIlce) ekle(kamuIlceKimligi(ilce), "sebeke", carpBol(x, kasaPayiPpm, PPM))`. Önbellek anahtarına (`KasaOnbellegi`, `kasa.ts:~232-239`) `sebeke: [string, Mili][]` eklenir ve `haritaAyni` ile karşılaştırılır (önbellek yanlış sonuç vermesin).
- `paraMuhasebesi` (`mulk/kasa.ts:94-125`) değişiklikleri:

```ts
let sebekeKasa = 0;
for (const e of a.kasa) {
  const k = kasaAl(para, e.sahip);
  const sayac = e.kalem === "sebeke" ? (k.giris.sebeke ??= sayacSifir()) : k.giris[e.kalem];     // tembel
  const eklenen = sayacOranEkle(sayac, e.oran, dt);
  if (eklenen > 0) gunKaydi(k, gun, kp.pencereGun).giris += eklenen;
  if (e.kalem === "vergi") vergiKasa += e.oran;
  else if (e.kalem === "sebeke") sebekeKasa += e.oran;                 // YENİ dal: ithKasa'ya KARIŞMASIN (ithalatNpc = a.ithalat − ithKasa)
  else ithKasa += e.oran;
}
if (a.sebeke !== undefined && a.sebeke > 0) sayacOranEkle((para.lavabo.sebeke ??= sayacSifir()), a.sebeke - sebekeKasa, dt);
```

- `kasaToplam`/bakiye (`mulk/kasa.ts:56` `for (const kalem of KASA_GIRIS_KALEMLERI) t += k.giris[kalem].n`) `k.giris.sebeke?.n` toplamını da içerir (**yoksa kasa bakiyesi eksik hesaplanır ve korunum bozulur**: en kolay unutulan satır).
- `kasaAl` (`mulk/kasa.ts:47`) `giris`'i yalnız `KASA_GIRIS_KALEMLERI` ile kurar: `sebeke` **kurulmaz** (tembel; mevcut kasaların özeti değişmez).
- `kasaOranlariHesapla` sonucu `(sahip, kalem)` dize sırasıyla sıralanır (`:~305-316`): `"sebeke"` kalemi `ithalatMakas` ile `vergi` arasına düşer; `paraAkisi.kasa` doğrulayıcısı (`serilestir.ts:584`, "kesin artan") bu sırayla uyumludur.
- `ParaAkisi` (`tipler.ts:884`) `sebeke?: Mili` (toplam bedel oranı; `> 0` iken yazılır, `0` iken **alan silinir**). `paraAkisiYaz` (`:133-159`): ilk kayıt koşulu (`:137`) `akis.sebeke === 0`'ı da içerir; "aynı oranlar" yerinde güncelleme dalı (`:140-152`) `sebeke`'yi de karşılaştırır ve günceller.
- `hazineKalemleri` (`cozum.ts:91-181`): düğüm döngüsüne (`:127` ithalat kolunun kardeşi) şebeke bedeli eklenir; `gider += bedel`; `ParaBilesenleri`'ne (`:73-81`) `sebeke: Mili`, `sebekeIlce: Map<string, Mili>`; `isletmeGideri = gider − ithalat − sebeke` (`:176`; **şebeke `isletme` lavabosuna karışmaz**). `para` nesnesi (`:180`) `sebeke` ve `sebekeIlce` taşır; `paraAkisiYaz` çağrısı (`:297-304`) `sebeke: k.para.sebeke` ve `kasaOranlari(..., k.para.sebekeIlce)` geçirir.

```ts
// hazineKalemleri, düğüm döngüsünde (b.merkez !== undefined iken), ithalat kolunun yanında:
const sb = ctx.ic.mulk?.sebeke;
if (sb !== undefined && b.merkez !== undefined) {
  const hs = hesaplar === null ? null : (hesaplar[b.indeks] as BolgeHesabi);
  let bedel = 0;
  if (sb.elektrik !== undefined) {
    const mili = hs === null ? (b.elektrik?.sebekeMili ?? 0) : hs.sebekeMili;
    if (mili > 0) bedel += carpBol(mili, sb.elektrik.birimFiyatMili, MILI);
  }
  for (const k of sb.stoksuz) {                                                                          // mal indeksine göre sıralı
    const mili = hs === null ? (b.sebekeTuketim?.[ctx.ic.mallar[k.mal].id] ?? 0) : (hs.sebekeStoksuz[k.mal] as number);
    if (mili > 0) bedel += carpBol(mili, k.birimFiyatMili, MILI);
  }
  if (bedel > 0) {
    gider += bedel; sebekeGider += bedel;
    const ilce = dugumIlcesi(d, ctx.ic, o.id, b.id);
    if (ilce !== undefined) sebekeIlce.set(ilce, (sebekeIlce.get(ilce) ?? 0) + bedel);
  }
}
```

**Korunum** (§12): `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` değişmez; şebeke oyuncunun hazinesinden **düşer**, aynı miktar lavabo + kasa girişine **eklenir**; yeni musluk **yoktur**.

#### 5.2.6 Hazine yetersizse

- Şebeke **kesilmez ve karşılanma oranı düşmez**: bedel yalnız bir gider kalemidir.
- Hazine tükenir ve net oran negatifse mevcut **ödeme gücü** mekanizması devreye girer: `odemeGucuPpm` (`cozum.ts:222-225`) = `gelir/gider` (hazine 0 ve gider > gelir iken), bu oran oyuncunun **tüm** tesislerinin verimini çarpar (`bolgeHesapla`'ya `odeme` geçer, `:255-257`). Şebeke bedeli `k.gider` içinde olduğundan ödeme gücünü bilinen şekilde düşürür ("maaş ödenemiyor" ile aynı anlam).
- Hazine 0'da kelepçelenir (`stok.ts:246-254`); nominal borç `borcSilme` musluğuna yazılır (`paraSayac.ts:74`): **korunum bu yolla da bozulmaz** (lavabo ve kasa girişi nominal oranla birikir; kelepçede silinen borç musluktan karşılanır, mevcut ithalat/işletme gideriyle aynı örüntü).
- **Bilinen davranış (salınım):** adım 1'deki bedel tahmini bir önceki çözümün verimine dayanır; ödeme gücü verimi düşürünce talep ve bedel düşer, sonraki çözümde ödeme gücü yükselir. Saatlik çözümler arasında sınırlı ve **belirlenimcidir** (aynı girdi aynı sonuç; rastgelelik yok); ithalat için aynı örüntü (`ithalatiHazineyeSigdir`, `:200`) zaten mevcuttur. Test: hazine 0 senaryosunda 48 saat sonunda sonuç tekrarlanabilir ve korunum eşitliği tam (§16).
- Yeni oyuncunun hibesi ve kiti şebeke bedelini ilk günlerde rahat karşılar (A2'nin şebeke fiyatıyla gün-1 yeniden hesabı bilgi amaçlıdır).

#### 5.2.7 Santral ile karşılaştırma testi (sınanan: muhasebe doğruluğu; iddia edilmeyen: "ucuzluk")

Aynı tesis kümesi (Tarla + `gida_fabrikasi` ×2 [biri `ekmek_firini`: yakıt girdili] + santral) üç düzeneğin karşılaştırması: (1) santralsiz; (2) santral kapasitesi talebi karşılar; (3) santral kapasitesi talebin yarısı. Her biri için sınanan: `sebekeMili` = `max(0, talep − arz)`; bedel formülü; lavabo + kasa girişi = bedel birikimi; yakıt tüketimi (2 ve 3'te santral yüküyle ölçeklenir, 1'de yok); santral tam yükteyken açık şebekeden gelir; `hazine` farkı = −(bedel + santral yakıt/bakım/işletme + diğer). **Santralin şebekeden ucuz olduğu iddia edilmez** (B7; baş lider kararı): test yalnız **iki gider kalemi toplamının tutarlı** olduğunu sınar (şebeke bedeli + santral yakıt/bakım/işletme + diğer = hazine farkı). Başabaş karşılaştırması (kömür %59–67 yük, hidro %12–14) bir **ölçüm raporudur** (O2/A2, §15), test iddiası değil.

#### 5.2.8 Santral yakıtı ve kömür

- **Yakıt girdisi** (`ekmek_firini`, `cam_firini`, `yakit_jeneratoru`) §5.2.2b ile şebekeden gelir (`sebeke.mallar[]` içinde `yakit` kaydı olduğu için). **Kömür** (`komur_santrali` girdisi) ve diğer ham/ara mallar (silis, çelik, parça, kepek...) **şebekeden gelmez**: bugünkü gibi ticaret emri ithalatı ya da kendi üretimidir (`ekonomi/komut.ts:99-130`; emir kalıcı oran; gerçekleşme saat tıkında; yuva 4 + Ticaret ofisi). Böylece "kömür santrali ithal kömürle" ekonomisi (A2 §1.3-B1: kömür 33,3 ₺) korunur ve **santral fiyatına/maliyetine dokunulmaz** (baş lider).
- Santral kurmayan oyuncunun elektrik için ticaret emri vermesi **gerekmez** (elektrik depolanamaz; `ekonomi/komut.ts:108` reddi değişmez); yakıt için de gerekmez (§5.2.2b).
- Yakıtın şebekeye dahil olması baş lider tarafından teyit edilmiştir (S-10 kapandı). Yakıt kaydı `mallar[]`'dan **çıkarılırsa** bu davranış kapanır (kod yolu kalır; kural dönemi).

#### 5.2.9 Serileştirme ve göç (özet; ayrıntı §11)

Yeni durum alanları hepsi isteğe bağlı ve yalnız kullanılınca yazılır: `BolgeElektrikDurumu.sebekeMili?`, `BolgeDurumu.sebekeTuketim?` (mal kimliği → mili), `ParaAkisi.sebeke?`, `ParaDurumu.lavabo.sebeke?`, `KasaDurumu.giris.sebeke?`. `fikstur-goc/mulk-v1.json` yüklenmeye devam eder; `mulk.sebeke` bloğu yoksa durum özeti bugünküyle aynıdır; blok eklenmesi `kuralSurumu`'nu değiştirir (veri değişikliği).

#### 5.2.10 Mevcut mülk testlerine ve botlara etkisi

`parametreler.json`'a `mulk.sebeke` yazılınca **tüm mülk kipi testleri ve botları şebekeli dünyada koşar**: santralsiz elektrik girdili tesis artık `verim 0` değildir. Etkilenebilecek testler (arama; **doğrulanmadı: tam liste**, K3 koşarak belirler): `cekirdek/test/{mulk-ilk-satis,mulk-olcek-kilitsiz,mulk-serilestir,mulk-yapilar}.test.ts`, `botlar/test/parsel.test.ts`, `olcum/test/parsel-kosu.test.ts`. Düzeltme ilkesi: brownout/verim 0 bekleyen mülk testi kendi veri kopyasında `delete v.param.mulk.sebeke` yapar (test amacı şebeke değilse); aksi halde beklenen sayılar güncellenir. `botlar/src/parsel.ts:105-109` `SANAYICI` önayarı hidro santralle açılmaya devam edebilir ama artık **zorunlu değildir** (O2 önayar kararı, §15).

### 5.3 Zincirin işleyişi (oyuncu ve çekirdek)

1. Oyuncu `ciftlik` (Tarla, S: 2 hücre) kurar: çıktı `tahil` (hasat eğrisi).
2. `gida_fabrikasi` kurar (2 hücre) ve **`yontem: "degirmen"`** alanını **aynı komutta** verir (§5.8; alan verilmezse varsayılan `standart_gida_isleme`, `ekonomi/insaat.ts:24`). Sonradan değiştirmek isterse `yontem_degistir {bolge, tesis, yontem}` (bedelsiz, anlık; `ekonomi/komut.ts:78-88`). İkinci `gida_fabrikasi` için `yontem: "ekmek_firini"`.
3. `degirmen`: tahıl + elektrik → un + kepek. `ekmek_firini`: un + yakıt + elektrik → ekmek. Elektrik **şebekeden otomatik** gelir (§5.2): oyuncu santral kurmak zorunda değildir. Aynı il düğümünde stok ortaktır (il içi taşıma bedava); farklı ilde MCF taşır.
4. Satış: ekmek, G6 anında yalnız NPC pazarı (`ticaret_emri` ihracat; `pazar/piyasa.ts`); G7 ile dükkân eklenir. **Yakıt** da şebekeden otomatik gelir (§5.2.2b): fırın için ithalat emri gerekmez.
5. Kapalı döngü: `ahir` kurup `kepek_gubresi` yöntemini seçerse kepek tüketilir, `gubre` doğar; Tarla gübre dozu (`gubre_dozu`) gübreyi tüketir (mevcut `tarim` mekaniği). `sut_kepekli` ikinci (daha zayıf; A2 §1.6) seçenektir.
6. Oran bulmacası ölçekten gelir: 1 değirmen (S) ≈ 1 fırın (S) (A2 §1.4 eşleşmesi: 200 tahıl → 165 un → fırın çıktısı A2'nin tek önerisi **240**, §1.3-B2); ölçek kademeleri (S/M/L) çıktıyı ×1/2,2/3,6 yapar (`sanayi.olcekKademeleri`).

**Kapasite notu (çekirdek sınırı):** yan ürün deposu dolunca fazlası israf olur, geri basınç yoktur (K3 keşif §0 madde 3); değirmen kepeği tüketilmezse birikir. Bu bilinçli kabuldür; kepek NPC pazara satılabilir (§5.4).

### 5.4 Kepeğin P0'daki iki tüketicisi (baş lider kararı 8) ve güvence alıcı sorusu

Kural (üretim §3A.2 madde 4, UA1): her mal en az iki farklı tüketici türüne sahip olmalı; **yan ürünlerde (kepek, gübre, deri) Ü ≥ 1 ve N ≥ 1 şarttır**. Ü = üretim yöntemi tüketicisi, N = güvence alıcı (NPC).

**Karar (A2 §1.6 ve T3 §1 madde 5 ile aynı yönde):**

| Tüketici | Tür | P0'da | Not |
|---|---|---|---|
| **`kepek_gubresi`** (ahır) | Ü (yöntem) | **evet (G6)** | tek girdi (kepek + elektrik), tek çıktı (`gubre`), yeni mal yok; kepeğe NPC'nin ≈ %37 üstünde değer verir (A2 §1.6); gübre Tarla gübre dozuna döner (ilk kapalı döngü) |
| `sut_kepekli` (ahır) | Ü (yöntem) | **veri satırı G6'da** (Y-37, üretim §9.1 A0-2); oynanış dengesi P1 | A2 §1.6: ahır başına net `ahir_besi`nin çok gerisinde; yalnız süt zinciri (P1) ile anlam kazanır. Yöntem sırası (indeks 27) G8'in yöntemlerini kaydırmamak için **şimdi** sabitlenir |
| NPC dünya pazarı kepek kaydı (`emilim 120`, `arz 80`; `parametreler.json:50`, `:55`) | P ve N | **evet, mevcut** | UA1'in N tanımı (yan ürünün çöpe gitmemesi için güvence alıcı) bununla sağlanır: kepek her zaman pazara satılabilir |

**`NpcAlici tur: "kamu"` yeterli mi? — Hayır, ve yeni alıcı türü AÇILMAZ.** Gerekçe:
1. `NpcAlici` (`tipler.ts:903`, `kamuAlici` `mulk/kasa.ts:320`) **kasa kaynaklı bütçeli** kamu alıcısıdır: ödenek rezervi, haftalık bütçe, oyuncu payı ≤ %50 (`mulk/kasa.ts:17`); sipariş komutları yoktur. Kepek için güvence alıcı olarak kullanılamaz (kasa yalnız yanan paradan beslenir; kamu bütçesi kepek alımına bağlanmaz).
2. Dış NPC paraya dayalı güvence alıcı **mevcut dünya pazarı kaydıdır** (`pazarEmirleriniGerceklestir`, `pazar/piyasa.ts:75`; para kaynağı `ihracatNpc`). Yeni bir alıcı türü yeni bir para kaynağı (musluk) gerektirirdi: gereksiz (A2 §1.10: "NPC güvence alıcıları ... yeni musluk açmaz"; yerelNpc dışında musluk eklenmez).
3. Doğrulayıcı V13(a) bu kuralı **makineyle** zorlar: `kepek` için en az bir yöntem girdisi (Ü) ve `emilimSaat.kepek > 0` (N); aksi veri paketi geçersiz.

**Yedek (B), yalnız baş lider "iki yöntem tüketicisi" isterse:** zaten sağlanır (`kepek_gubresi` + `sut_kepekli` iki Ü yöntemdir; ikisi de `ahir`dedir: tek tür). T3'ün `besi_kepekli` seçeneği **düştü** (A2 `kepek_gubresi`'ni seçti; T3 §8.4c). `kepek_kompost` (`gubre_fabrikasi`) seçeneği de düştü (yeni yöntem sırası kayardı).

### 5.5 `mulkKipi` süzgeci: `derle.ts` değişikliği

`derle.ts:27-72` (`icerikDerle`): mülk açıklığı `param.mulk !== undefined && (veri.parsel !== undefined || veri.parselIzgara !== undefined)` (parsel dünyası fikstür ya da ızgara girdisiyle verilir; K3 G6-2a `derle.ts:47`) (bugün `:78`, `ic` kurulduktan SONRA) **önce** hesaplanır ve `ic` nesnesinin `tesisTurleri` alanı bölge kipinde süzülmüş kopya olur:

```ts
const mulkAcik = param.mulk !== undefined && (veri.parsel !== undefined || veri.parselIzgara !== undefined);
// ...
tesisTurleri: mulkAcik ? icerik.tesisTurleri : bolgeKipiTurleri(icerik),
```

```ts
/** Bölge kipi: `mulkKipi` yöntemleri tür listelerinden süzülür; `icerik.yontemler` ve indeksler DEĞİŞMEZ. İçerik nesnesine DOKUNULMAZ (kopya). */
function bolgeKipiTurleri(icerik: IcerikDosyasi): TesisTuruTanimi[] {
  const mulkOnly = new Set(icerik.yontemler.filter((y) => y.mulkKipi === true).map((y) => y.id));
  if (mulkOnly.size === 0) return icerik.tesisTurleri; // aynı referans: bugünkü davranış bit bit aynı
  return icerik.tesisTurleri.map((t) => (t.yontemler.some((y) => mulkOnly.has(y)) ? { ...t, yontemler: t.yontemler.filter((y) => !mulkOnly.has(y)) } : t));
}
```

- `ic.tesisTuruIndeks` (`derle.ts:31`) ve `ic.yontemIndeks` (`:30`) **tam içerikten** kurulur (indeks sabit).
- Tüketiciler (hepsi `ic.tesisTurleri`'ni okur, dolayısıyla süzülmüş görünümü alır; K3 listeyi grep ile tamamlar, **doğrulanmadı: tam liste**): `ekonomi/tablo.ts:83-84`, `tarim/tablo.ts:176`, `botlar/src/tablo.ts:144`, `istemci/src/komut/tablo.ts:124`, `teknoloji.ts:122`, `kurulum.ts:117`. **Tam içerik üzerinden kurulan tablolar** (`ic.yontemler`: `sanayi/tablo.ts:57-60`, `ekonomi/tablo.ts:79`, `tarim/tablo.ts:173-175`) bölge kipinde de tam yöntem listesini görür; bunlar durum değil türetilmiş tablodur, özeti etkilemez (doğrulandı: kod okuma).
- `ic.icerik` değişmez: `goc.ts:45` `icerikKimlikTablosuOlustur(ic)` ve `sunucu/src/yazar.ts:1318` dizinleri tam listeyi görür (indeks tabloları sabit).
- Bölge kipinde `yontem_degistir` bu yönteme: `yontem bu tesis turunde yok: <id>` (`ekonomi/komut.ts:85`; ileti mevcut).
- `kurulum.ts:117` (`ilkYontem = ic.tesisTurleri[tur].yontemler[0]`) süzülmüş listeyi okur: bölge kipinde ilk yöntem değişmez (`mulkKipi` yöntemi `[0]` olamaz, §4.1).
- **Karşıt kanıt (süzgeç gerçekten etkili):** `mulkKipi` bayrağı **olmayan** sahte bir yöntem bölge kipinde `botlar/src/planlayici.ts` `yontemAdaylari`'nda görünür; bayraklısı görünmez (test §16).

### 5.6 Ödül dedektörü (K2: doğrulama, kod değişikliği yok)

`sunucu/src/odul/dedektor.ts` içerikten türetiyor: `ilk_isleme` (`islemeYontemiMi`: ham/ara girdi → ara/tüketim çıktı: `degirmen` tahıl→un uyar), `zincir_kapandi` (iki farklı aktif yapı: Tarla çıktısı `tahil` = değirmen girdisi, kümülatif üretim > 0). K2 testi: `degirmen` ve `ekmek_firini` ile kavramlar tetiklenir (`sunucu/test/odul.test.ts` kalıbı); `ilk_yapi`/`ikinci_ilce` etkilenmez.

### 5.7 G6 kabul ölçütü

Ayrıntı §17. Özet:
1. Yeni dört yöntemle **bölge kipi** yöntem izdüşümü kanıtı 12 noktada **tam `durumOzeti`** birebir; şebeke etkisizlik kanıtı (K-4) aynı kapıda.
2. Mülk kipinde, **santralsiz** yeni oyuncu: Tarla → değirmen → fırın zinciri kısa bir testte `ekmek` üretir (`verimPpm > 0`; fırın için yakıt ticaret emri **verilmeden**), NPC pazara satar; şebeke bedeli (elektrik + yakıt) defterde (lavabo + kasa girişi) ve korunum eşitliği tam.
3. Eski mülk anlık görüntüsü (`fikstur-goc/mulk-v1.json`) `gocIzni + yalnizEkleZorunlu` ile ihlalsiz yüklenir, `eklenen.yontemler` = 4.
4. **Zincir ölçümü** (§5.9): çarpan **yok**; A2'nin M ölçütü raporlanır (bot yöntem seçiciyle); açılma koşulu sağlanırsa `yontemGecersizKilma.standart_gida_isleme.ciktiPpm = 750000` önerisi baş lidere gider (kapıyı bloke etmez).
4b. `yontemGecersizKilma` kapalıyken (`ciktiPpm: 1 000 000`) ve blok yokken `durumOzeti` aynı; `ciktiPpm: 750 000` ile `standart_gida_isleme` çıktısı ×0,75 (birim testi).
5. Bot ekmek zinciri 7 günde tamamlanır (O2; yöntem seçimi `yontem` alanıyla ya da `yontem_degistir`'le) **ve botlarda marjinal-net yöntem seçici vardır** (§5.9 ölçümün ön koşulu; G6 kabul koşulu).
6. Tam kapı yeşil, `dunya.html` gzip ≤ 400 KB (G6 < 0,5 KB beklenir; şebeke + `yontem` alanı ≈ +0,3 KB: K3 ölçer, **doğrulanmadı**).

### 5.8 Yapı komutlarında isteğe bağlı `yontem` alanı (T3 §11 soru 2; baş lider KABUL, S-14 kapandı)

**Görüş: evet, G6'ya alınır.** `tesis_insa_hucre` ve `yapi_yerlestir` komutlarına isteğe bağlı `yontem?: string` (yöntem kimliği) eklenir.

| Seçenek | Değerlendirme |
|---|---|
| **A (öneri): inşa komutunda `yontem?`** | "Değirmen kur" **tek adım**; yapı yöntemin kimliğidir (yapı adı yöntemden gelir; üretim §7.1). Tesis tamamlandığı anda doğru yöntemle başlar: inşa bittiğinde `standart_gida_isleme` **tahılı boş yere tüketmez** (kurulumdan sonra yöntem değişimi, inşa saatlerce sürebildiği için, oyuncu çevrimdışıyken yanlış yöntemle bir süre çalışmaya yol açar). Maliyet: komut alanı, `InsaatDurumu.yontem?`, protokol alanı; hepsi isteğe bağlı |
| B: kurulumdan sonra `yontem_degistir` | Ek komut gerekmez; ama iki adımlı akış (inşa bitişini beklemek) onboarding'e (G9 Esnaf Defteri) sürtünme ekler ve ara dönemde yanlış yöntem çalışır. `yontem_degistir` zaten **kalır** (A'da da) |

**Baş lider A'yı kabul etti.** Protokolde yalnız ekleme (nesne alanı) ve **geriye uyum testi** şarttır: alan olmadan gelen eski komut aynı sonucu verir (§16.1). Protokol kısmı K2'nindir, sırayı Kod lideri belirler. (B yolu `yontem_degistir` olarak her durumda çalışmaya devam eder.)

**Kurallar:**
- `yontem` yalnız **tesis türü** inşasında verilebilir (ek yapıda verilirse: `yontem yalniz tesis turunde verilebilir: <tesisTuru>`).
- Denetimler `yontem_degistir` ile **aynıdır**, aynı iletilerle (`ekonomi/komut.ts:84-86`): `bilinmeyen yontem: <id>`; `yontem bu tesis turunde yok: <id>` (süzülmüş tür listesi: bölge kipinde `mulkKipi` yöntemi reddedilir; ama komut mülk komutudur); `yontem acik degil: <id>` (`yontemAcikMi`, teknoloji). **Başarısız komut durumu değiştirmez** (denetimler hazine/stok düşmeden önce).
- Durum: `InsaatDurumu.yontem?: string` (**dize kimlik**, indeks değil; `dunyaYenidenIndeksle` kapsamına girmez) yalnız verilince yazılır. `insaatBitti` (`ekonomi/insaat.ts:24`): `const yontem = insaat.yontem !== undefined ? ctx.ic.yontemIndeks[insaat.yontem] : tur?.yontemler[0];` ve `yontem === undefined` ise tesis kurulmaz (mevcut `if (… && yontem !== undefined)` koşulu).
- `dunyaDogrula` (`serilestir.ts:392` `$.insaatlar[i]`): `yontem` varsa `dize`; `dunyaIcerikUyumu`: `yontem` içerikte tanımlı, tesis türü inşaatında (ek yapı ve diğer inşaat türlerinde yazılamaz) ve türün listesinde.
- Protokol: `komut-sema.ts:62-71` iki komuta `yontem: kimlik.optional()`; `komutSemasi.ts:60,62` `yontem: "kimlik"`. Bölge kipi komutu etkilenmez (alan mülk komutlarındadır).
- Ret iletileri (§9.3 genişler): `YON-01 yontem yalniz tesis turunde verilebilir: <tesisTuru>`; diğerleri mevcut.

### 5.9 Ekmek zinciri ↔ `standart_gida_isleme`: baş lider kararı ve hazır yedek (`mulk.yontemGecersizKilma`)

**Sayılar A2'nin tek kaynağıdır** (§1.3-B2; commit `eab8fcc`); bu belge kopyalamaz, yalnız yönü kaydeder. **Fırın çıktısı A2'nin tek önerisiyle 240'tır** (baş lider kararı; zincir tahıl başına NPC net **+%21,2**, K/U ilkesinin +%10–25 bandının içinde; 250 ekmekle +%33,6 idi; S-17 kapandı). Tesis, işçi ve hücre tabanlarında zincir **geridedir**: A2 §1.3-B2 (fırın 240) tablosu: tesis başına KD 3.322 ↔ 5.097 ₺ (**−%34,8**), işçi başına 511 ↔ 849 ₺ (**−%39,8**), hücre ve sermaye başına −%34,8. A2'nin okuması: erken oyunun bağlayıcı kısıtı tahıl ya da sermaye değil **NPC pazar derinliğidir**; standart ve zincir **tamamlayıcıdır** (iki pazar havuzu: A+ ve B+ birlikte 8.309 ₺/sa [240]; doymuş havuza ikinci standart tesis zarar eder).

**Karar (baş lider, bağlayıcı):** (ii) güçlendirme **gerekmez**, (i) kapatma **yapılmaz**; çarpan **uygulanmaz**. Tesis tabanı da kural sayılırsa **yedek seçenek (G2) parametre olarak hazır durur, varsayılan KAPALI:** mülk kipinde `standart_gida_isleme` çıktısı ×0,75. G6'ya yalnız **şema ve çekirdek yolu** girer (kapalıyken bit-exact no-op); açmak veri değişikliğidir (kural dönemi).

**Şema (K3; `veri/src/{tipler,sema}.ts`; A2 §1.13 adı):** `MulkParametreleri.yontemGecersizKilma?`, isteğe bağlı, yöntem kimliği → geçersiz kılma:

```ts
export interface MulkYontemGecersizKilmaParametreleri {
  /** yöntem kimliği -> mülk kipine özel geçersiz kılma. Girdi bölge kipinde ve mülk kipinde AYNI kalır; yalnız çıktı ölçeklenir. */
  [yontem: string]: {
    /** ÇIKTI çarpanı (ppm; 0 < değer ≤ 2 000 000). 1 000 000 = kapalı (kimlik; bit-exact no-op). Yedek G2: standart_gida_isleme için 750 000. */
    ciktiPpm: number;
  };
}
```

Gönderilecek veri (T3 yazar): `"yontemGecersizKilma": { "standart_gida_isleme": { "ciktiPpm": 1000000 } }` (kapalı). **G2'yi açmak** = `ciktiPpm: 750000` (baş lider kararı + O2 ölçümü sonrası, ayrı veri commit'i). Doğrulayıcı (Katman 2, V17): anahtarlar `icerik.yontemler` kimlikleri; `0 < ciktiPpm ≤ 2 000 000`; `mulkKipi` yöntemleri de ayarlanabilir.

**Nerede uygulanır (çekirdek):** `ekonomi/uretim.ts:204-222` `ciktiCarpaniHesapla`, fonksiyonun **sonunda**, `return c`'den önce:

```ts
const mc = ic.mulk?.yontemCiktiPpm?.[ts.yontem];                     // DerlenmisMulk.yontemCiktiPpm: yöntem indeksi -> ppm; YALNIZ ciktiPpm !== PPM olan yöntemler tablolanır, hiç yoksa alan OLUŞMAZ
if (mc !== undefined && b.merkez !== undefined) c = carpBol(c, mc, PPM);
```

- **Çıktıya uygulanır, girdiye değil** (aşınma cezasıyla aynı mekanizma, A2 §2.1): yöntemin katma değeri çarpan oranında düşer; girdi, bakım ve işçi aynı kalır.
- Çağrı noktaları `:313`, `:325` ve `carpanlariYenile` (`:231`, yalnız tarımsal) fonksiyonu çağırdığından yeni çağrı yeri gerekmez. **Tek ek (K3 G6-2a, `ekonomi/uretim.ts:327`):** `bolgeHesapla`'nın **sanayi-kapalı** dalı `ciktiCarpaniHesapla`'yı yalnız `tarimsal || kitlikAktif` iken çağırır; sanayisiz mülk dünyasında kilma etkisiz kalmasın diye koşula `|| ctx.ic.mulk?.yontemCiktiPpm !== undefined` eklenir (blok yokken koşul eskisiyle aynıdır).
- `derle.ts` `mulkDerle`: tablo yalnız `ciktiPpm !== PPM` satırlarından kurulur; hepsi `PPM` ise `DerlenmisMulk.yontemCiktiPpm` **hiç oluşmaz** (kod yolu atlanır).
- **Bölge kipi altınları:** `ic.mulk` bölge kipinde tanımsızdır ve işletme düğümü (`b.merkez`) yalnız mülk kipinde vardır: iki koşul da bölge kipinde yanlış; kod yolu **hiç çalışmaz** (K-5, §13). Mülk kipinde kapalıyken (`ciktiPpm: 1 000 000` ya da blok yok) de bayt bayt aynıdır (test: üç veri kopyası aynı `durumOzeti`).
- Serileştirme: durum alanı **yok** (parametre); `kuralSurumu` değişir (veri). Göç gerekmez.

**Tetik ölçütü (A2 §1.3-B2, bağlayıcı; ölçüm O2 ve A0-11 kapsamı):**

| Öğe | Değer |
|---|---|
| Ölçüt | **M = (ilk 7 günde en az 24 saat `degirmen` yönteminde çalışan tesisi olan bot) / (ilk 7 günde en az bir `gida_fabrikasi` kurmuş bot)** |
| Açılma koşulu (**X = %30, baş lider onaylı**) | A0-11 bot ölçümünde **tohum medyanında M < %30**, **≥ 8/10 tohumda** eşiğin altında **ve** gıda arzının **≥ %85'i** `standart_gida_isleme`'den geliyor (zincirin ekmek havuzu boş) ⇒ G2 (`ciktiPpm: 750000`) açılır (baş lider onayıyla) |
| Hedef (G2 sonrası) | M ≥ %50 (tekrar ölçüm) |
| Pencere / örneklem | katılımdan ilk 7 sim-günü (168 sa); tohum 1–10 × tohum başına 100 bot (A0-4 ölçeği) |
| Bot dağılımı | yalnız yeni oyuncular (gün 0); çiftçi / sanayici / tüccar 1/3'er (`botlar/src/parsel.ts` planları); yerleşik ve geç katılan botlar girmez |

**Ölçümün ön koşulu (kabul koşulu; iş bölümü §18):** mülk botlarında bugün **`degirmen` yöntem seçici ve `yontem_degistir` kullanımı yoktur** (K3 keşfi §1; `botlar/src/parsel.ts`). A2: ölçüm **yalnız yöntem seçen botlarla** (marjinal net kuralı) yapılmalıdır; "varsayılan yöntem" botuyla M ≈ %0 çıkar ve ölçüt bot ayarı hatasını ekonomik hatadan ayıramaz **(doğrulanmadı)**. Bu yüzden O2'nin G6 bot önayarı işi (`g6-onayar`) **marjinal-net yöntem seçiciyi** ve `yontem_degistir`/`yontem` kullanımını içermek zorundadır ve **G6 kabul koşulu**dur (§17 G6-5).

**Dikkat paneli notu (G9 kapsamı; K1/T1):** "pazar doydu → ekmek zinciri" geçişi: `gida` referans fiyatı tabanın altına indiğinde (eşik G9'da) Dikkat paneli "ekmek zinciri ikinci talep havuzudur" önerisini gösterir (kural bildirimi; zorunlu değil; "kilit yok, seçim var"). Çekirdek değişikliği yok; veri kaynağı `IlgiKaresi.fiyat` (mevcut). G4'ün G9'a bıraktığı nottur; bu şartnamede ek iş değildir.

## 6. G7a: yerel pazar kanalı

### 6.1 Ne eklenir

Mülk kipine **NPC hane talebi**: ilçedeki dükkânlar (ve görünmez esnaf) arasında paylaştırılan, düğüm stoğundan çekilen, oyuncu hazinesine **yeni para** olarak giren (musluk `yerelNpc`) satış akışı. Mevcut NPC dünya pazarı (toptan ihracat, ≤ 0,9 R, hacim sınırlı; `pazar/piyasa.ts`) **değişmez**; yerel kanal ondan ayrı bir talep kaynağıdır, ikisi birbirini dışlamaz (K3 keşif §2).

### 6.2 Kararlar (geri dönüşü zor olanlar §20'de)

| Konu | Karar | Gerekçe |
|---|---|---|
| **R tanımı** (GZ-5) | `R[m] = d.pazar.fiyat[m]` (dünya referans fiyatı, saatlik tıkta güncellenir; `pazar/piyasa.ts:123-135`); dükkân geliri `R × kademe`. **Şebeke fiyatı R'yi KULLANMAZ** (taban; §5.2.4) | docs/06 §15.7 kamu tavanı, 0,891 R çıpası, band [0,7; 1,4] R hep bu R'ye göre yazıldı; tek referans |
| **Q kimliği** (GZ-4) | `Q[ilçe, mal, t] = talep1000Saat[mal] × ilceNufusEsdegeri(ilçe) × yerelOlcek / 1000 × takvim[grup][ay] × bayram[grup](gün)`; `ilceNufusEsdegeri` = isteğe bağlı fikstür `nufus`, yoksa `ilceSinifiNufus[sinif]` | Baş lider onaylı (A2 `241f1b9`); mülk kipinde düğüm `nufus = 0` (`isletme.ts`), bu yüzden nüfus fikstürün ilçe kaydından gelir (`veri/src/parsel.ts:81-104`; alan isteğe bağlı); seviye kilit olamaz (Y-33). Hücre sınıfı kullanılmaz (§6.5) |
| **NPC dünya fiyatına etkisi** | **Etkilemez.** Yerel satış `d.pazar.oyuncuArzi/oyuncuTalebi` (`pazar/piyasa.ts:117-118`) ve dolayısıyla `pazarFiyatlari`'na girmez | Geri besleme döngüsü (dükkân satışı → R → dükkân gelirine çarpan) ve oyuncu sayısıyla ölçeklenen NPC emilimine çift sayım yok; test §16 |
| **Öncelik katmanı** (GZ-6) | **Yeni katman 4a: ihracattan ÖNCE, tesis girdisinden SONRA.** Sıra: 1 nüfus+ordu, 2 bakım, 3 tesis girdisi, **4a yerel (dükkân) satış**, 4 ihracat | Dikey §4.3 taşma sırası: önce kendi dükkânı, sonra NPC pazar (taşma). Aynı `fr4`'ü paylaşmak, stok kıtken ihracatın dükkândan pay almasına yol açardı |
| **Çekim uzayı** | İlçe düzeyi tek havuz (halka havuzu Alfa-1); konum çarpanı yok (PPM) | Dikey §5.7, karar 7 |
| **Para** | Yerel gelir **musluk** `yerelNpc`; kasaya pay yok; dükkân gideri lavabo `isletme` | docs/06 §15.7: kasa yalnız yanan para; hane talebi dış NPC parasıdır |
| **PRNG, olay** | Yeni PRNG akışı ve `ilce_gunluk` olayı **yok** | Çekim saftır (rastgelelik yok); çözüm saatlik tıkta ve her komutta zaten çalışır (`ekonomi/index.ts:18-35`) |

### 6.3 Veri akışı ve çağrı noktaları

Çözüm başına tek geçiş; sonuç **geçici** (dünya durumuna girmez), `lojistikCoz` içinde taşınır.

```
lojistikCoz(d, ctx)                                   lojistik/cozum.ts:228
  0. muhasebe (paraMuhasebesi: yerel gelir birikimi)  :237-239
  1. YENİ: const yerel = yerelPazarHesapla(d, ctx)    // null = dükkân yok / perakende kapalı
     for oyuncu: hazineKalemleri(d,ctx,o,null,dl, yerel) ... odeme   :243-253
     hesaplar = d.bolgeler.map(... bolgeHesapla(d, ctx, r, odeme, yerel) ...)   :255-257
  4-5. bolgeVerimCoz (katman 4a)  -> bolgeOranlariUygula (dukkanGercek çıkışı)   :281-290
  6. hazineKalemleri(d,ctx,o,hesaplar,dl, yerel) -> hazineOranAyarla + paraAkisiYaz(yerel)   :293-308
```

| # | Değişiklik | Dosya:satır (`d28447d`) |
|---|---|---|
| a | `BolgeHesabi`'na `dukkan: Mili[]` (düğümün dükkân satış isteği, mal bazında), `dukkanGercek: Mili[]`, `frD: number[]`; `hesapAl` ilk oluşturma ve sıfırlama | `ekonomi/uretim.ts:31-88`, `:117-170` (`h.ihracat.fill(0)` `:168` kalıbı) |
| b | `bolgeHesapla(d, ctx, r, odemePpm, yerel?)`: `h.dukkan[m]` doldur; `h.talep[m]` toplamına ekle | `:236`, `:362` |
| c | `bolgeVerimCoz`: katman 4a (kod aşağıda) | `:421-483`, `:531` |
| d | `bolgeOranlariUygula`: `hareketsiz` koşuluna `h.dukkanGercek[m] === 0`; `yerel` toplamından `− h.dukkanGercek[m]` | `:660-668` |
| e | `hazineKalemleri`: `gelir += yerelGelir`; `gider += dükkân gideri`; `ParaBilesenleri.yerel` | `lojistik/cozum.ts:73-81`, `:91-181` (`:162` işletme gideri satırı) |
| f | `paraAkisiYaz` çağrısına `yerel: k.para.yerel` | `lojistik/cozum.ts:297-304`, `mulk/kasa.ts:133-159` |
| g | `bolgeDurumunaYaz`: `b.yerelKarsilanmaPpm = min(frD[m])` (dükkân isteği olan mallar; PPM ise **yazılmaz**, alan silinir); `paraAkisiYaz`: `akis.yerel > 0` iken `mo.ilkSatisT ??= d.zaman` | `ekonomi/uretim.ts:596-620` (`gidaKarsilanmaPpm` örüntüsü `:621`), `mulk/kasa.ts:133-159` |

**`bolgeVerimCoz` katman 4a (tam kural):**

```ts
// :455 civarı, mal döngüsü içinde
const d4a = h.dukkan[m] as number;          // YENİ: yerel satış isteği
const d4 = h.ihracat[m] as number;
let a = (h.ciktiGercek[m] as number) + (h.ithalat[m] as number) + s.gelenOran - (giden[m] as number);
if (a < 0) a = 0;
const acik = d1 + d2 + d3 + d4a + d4 - a;   // d4a EKLENDİ
if (acik <= 0 || stok >= acik * STOK_UFKU_SAAT) { h.fr1[m] = h.fr2[m] = h.fr3[m] = h.frD[m] = h.fr4[m] = PPM; continue; }
paylasim = true;
a += Math.floor(stok / STOK_UFKU_SAAT);
const p1 = a < d1 ? a : d1; a -= p1;
const p2 = a < d2 ? a : d2; a -= p2;
const p3 = a < d3 ? a : d3; a -= p3;
const p4a = a < d4a ? a : d4a; a -= p4a;    // YENİ
const p4 = a < d4 ? a : d4;
h.fr1[m] = oranPpm(p1, d1); h.fr2[m] = oranPpm(p2, d2); h.fr3[m] = oranPpm(p3, d3);
h.frD[m] = oranPpm(p4a, d4a);               // YENİ
h.fr4[m] = oranPpm(p4, d4);
// :531 civarı
h.dukkanGercek[m] = d4a === 0 ? 0 : carpBol(d4a, h.frD[m] as number, PPM);
```

**Bit-exact no-op kanıtı (mekanik):** dükkân yokken `h.dukkan` hep 0 → `d4a = 0` → `p4a = 0` (a ≥ 0), `a` değişmez, `acik` aynı, `frD = PPM` (`oranPpm(0, 0) = PPM`, `ekonomi/uretim.ts:369-374`: `bolen <= 0` ise PPM), `dukkanGercek = 0`; `yerel` toplamından 0 çıkar. Bölge kipi ve dükkânsız mülk dünyası sayıları değişmez. Test: §13.

`yerelPazarHesapla` `d.mulk === undefined`, `ic.mulk?.perakende === undefined` ya da dünyada hiç `dukkan` ek yapısı yoksa **`null`** döner ve hiçbir tahsis yapmaz.

### 6.4 Algoritma (tamsayı, PPM; K3 bunu birebir uygular)

Sabitler: `PPM = 1_000_000`, `MILI = 1000`, `carpBol(a, b, c) = floor(a × b / c)` (`sabit.ts:42`; BigInt yedekli). Kayan nokta, `Math.pow`, `Math.sqrt` yok. **Referans uygulama ve test vektörleri: Ek B** (çekirdek dışı betik; K3 vektörleri sabit gömer). Formül A2 §1.9 "Tamsayı çekim formülü" ile aynıdır.

**Adım 0: dükkânları topla (sıra sabit).** `d.mulk.isletmeler` sırasıyla (oyuncu, il) her düğüm; düğümde `b.ekYapilar`'ın (tamamlanma sırası) `tur === "dukkan" && dukkan !== undefined` olanları. Her dükkânın ilçesi `mk.hucreler.get(ekYapi.hucreler[0]).ilce`. İlçelere göre grupla; ilçeler **kimlik sırasıyla** (JS dize sırası), ilçe içinde dükkânlar **(oyuncu kimliği, `EkYapiDurumu.id`)** sırasıyla.

**Adım 1: mal mevcudiyeti.** `mevcut(oyuncu, mal)`: oyuncunun herhangi bir işletme düğümünde `anlikMiktar(stok, t) > 0 || uretimOrani[mal] > 0 || stok.gelenOran > 0` (`pazar/piyasa.ts:64-73` `isletmeAgindaMalVarMi` ile aynı koşul; K3 dışa açar ya da eşini yazar). Stoksuz yuva çekime girmez (ağırlık 0), payı diğerlerine kalır. Çözüm başına (oyuncu, mal) çifti için bir kez hesaplanır.

**Adım 2: çeşit.** Dükkân `j` için `dolu_j` = `mal` tanımlı **ve** `mevcut` olan yuva sayısı; `cesitPpm_j = dolu_j ≥ tamCesit ? PPM : carpBol(dolu_j, PPM, tamCesit)`. (Alfa-0 sadeleştirmesi: 24 saatlik pencere yok, GZ-11.)

**Adım 3: ağırlık.** Yuva `y` (mal `m`, **etkin** kademe `k`, `p = fiyatKademeleriPpm[k]`; etkin kademe kampanya kuralıyla belirlenir, §7.5b):

```
ters   = carpBol(PPM, PPM, p)                      // PPM² / p ; p ∈ [700 000, 1 400 000] -> [714 285, 1 428 571]
kare   = carpBol(ters, ters, PPM)                  // (R/fiyat)²
cesitC = PPM + carpBol(cesitKatsayiPpm, cesitPpm_j, PPM)
w      = carpBol(carpBol(kare, cesitC, PPM), olcekler[olcek_j].cekimCarpaniPpm, PPM)       // Alfa-0 S: cekimCarpaniPpm = PPM (etkisiz)
wE     = kare(esnaf.fiyatPpm)                      // esnaf: aynı ters/kare, çeşit ve ölçek çarpanı yok
```

**Adım 4: ilçe × mal paylaşımı, su-doldurma (en çok 32 tur).** İlçe için `donuk[j] = false` (tüm dükkânlar), `sabit[m] = 0` (mal başına, donmuş dükkânların aldığı toplam). `tur = 0 … 31`:

```
a) m artan sırada, Q[m] > 0 olan her mal için:
     L  = donmamış dükkânların, mal = m, mevcut, w > 0 olan yuvaları; sıra (oyuncu kimliği, EkYapiDurumu.id, yuva indeksi)
     Qr = Q[m] − sabit[m];                    L boşsa bu mal bu turda atlanır; Qr ≤ 0 ise L'deki HER yuvanın s'i 0 yapılır (SIFIRLA; eski turun payı taşınmaz) ve mal atlanır
     Σw       = Σ w(L)
     esnafPay = max(esnaf.tabanPayPpm, carpBol(wE, PPM, Σw + wE))        // ppm
     esnaf    = carpBol(Qr, esnafPay, PPM)
     P        = Qr − esnaf                                                // oyuncu havuzu
     s_i      = carpBol(P, w_i, Σw)                                       // her i ∈ L
     kalan    = P − Σ s_i                                                 // 0 ≤ kalan < |L|; L sırasıyla ilk `kalan` yuvaya +1
b) her donmamış dükkân j için top_j = Σ_y s(j,y)  (tüm mallar); top_j > olcekler[olcek_j].kasaMiliSaat ise j "yeni dolan"
c) yeni dolan yoksa DUR. Varsa (dükkân sırasıyla): her yuva için s = carpBol(s, kasa_j, top_j); sabit[mal] += s; donuk[j] = true. Sonraki tur.
```

`32` tur dolduğunda hâlâ kasayı aşan dükkân varsa son bir kez `s = carpBol(s, kasa_j, top_j)` ile orantılı kısılır. (Kasa kırpması **su-doldurmadır**: kasası dolan dükkânın taşan talebi `Qr` üzerinden **diğer açık dükkânlara ve esnafa** yeniden dağıtılır; K3 keşfinin "su-doldurma" isteği; A2 §1.9 ile aynı.)

**`Qr ≤ 0` kuralı (açık kural; baş lider "siz karar verin", Kod lideri kabul):** `Qr ≤ 0` ise donmamış yuvaların `s` değeri **0'a sıfırlanır** (korunmaz). Gerekçe: donmuş dükkânlar `Q[m]`'nin tamamını almışsa donmamışlara talep kalmamıştır; önceki turdan kalan `s` o turun (daha büyük `Qr`) payıdır ve `Σ s ≤ Q − esnaf` değişmezini yalnız Adım 5'in kısmasına bırakırdı. Esnafın o turdaki payı yoktur (esnaf payı saklanmaz; esnaf, `Q[m]`'nin oyuncu `s` toplamı dışında kalanıdır). **Durum ulaşılabilir değildir** (kanıt: bir turda yeni donan dükkânların `s` toplamı, kasa kırpması her `s > 0` yuvayı kesin küçülttüğü için o turun `P ≤ Qr` havuzundan **kesin küçüktür**; dolayısıyla `Qr` her turda `≥ 1` kalır; ayrıca 300 000 rastgele küçük-`Q` denemesinde 0 isabet, Ek B): kural savunmadır, ama **belirlenimcidir** ve Ek B V5 tur adımı vektörü ve K3 değişmez testiyle (her turda `Qr ≥ 1`) bağlanır.

**Adım 5: oyuncu havuzu üst sınırı (ilçe × mal).** `limit_m = Q[m] − carpBol(Q[m], esnaf.tabanPayPpm, PPM)`; o maldaki **tüm** yuvaların (donmuşlar dahil) toplamı `limit_m`'yi aşarsa her yuva `s = carpBol(s, limit_m, toplam_m)` ile orantılı kısılır (donmuş dükkânlar yeniden dağıtımla biraz fazla alabildiği için gerekir; sonuçta kasa aşılmaz: kısma yalnız küçültür).

**Adım 6: satırlar.** `YerelSatir { dugum, mal, istek = s, fiyatPpm = p, ekYapi, yuva }` listesi (düğüm indeksi, mal, `ekYapi`, yuva sırasıyla) ve düğüm başına mal toplamı `dugumIstek[dugum][mal]` (`h.dukkan` doldurur). Düğüm başına dükkân gideri `Σ olcekler[olcek].giderMiliSaat` (`yerel.gider`).

**Adım 7: gerçekleşen satış ve gelir** (`hazineKalemleri` içinde, `hesaplar !== null`):

```
gercek = carpBol(istek, hesaplar[dugum].frD[mal], PPM)               // mili-birim/saat
brut   = carpBol(gercek, d.pazar.fiyat[mal], MILI)                   // mili-₺/saat, R'de (cozum.ts:127 ile aynı birim)
gelir  = carpBol(brut, fiyatPpm, PPM)                                // dükkân fiyatı = R × kademe
```

`hesaplar === null` iken (ödeme gücü tahmini; `cozum.ts:248-253`) `gercek = istek` alınır (ihracatın `e.gerceklesenSaat` kalıbı). Gelir **oyuncu başına toplanır**; `gelir += yerelGelir`, `gider += dükkân gideri`.

**Sıra bağımsızlığı ve determinizm:** sonuç yalnız (durum, `t`) fonksiyonudur; `Map` yalnız geçici ve **sıralı** gezilir; tüm bölmeler aşağı yuvarlar; kalan birimler sıralı dağıtılır. **Bozulmaz değişmezler** (test §16.2): `Σ s ≤ Q[m] − floor(Q[m] × tabanPay / PPM)`; `top_j ≤ kasa_j`; dükkân eklemek/çıkarmak diğer ilçeleri etkilemez; aynı girdi iki kez aynı sonuç.

### 6.5 Talep Q: formül ve takvim (A2 §1.9)

```
ilceNufusEsdegeri(ilce) = ilce.nufus ?? ilceSinifiNufus[ilce.sinif]            // SAF işlev (K4: `ilceNufusEsdegeri`); tamsayı kişi
                   // nufus: ParselIlceTanimi.nufus? (isteğe bağlı, §4.3); yoksa YEDEK: sınıf sabiti. Sınıf = ParselIlceTanimi.sinif (fikstürün kendi ilçe sınıfı; veri/src/parsel.ts:89).
                   // HÜCRE SINIFI KULLANILMAZ: hücrelerden "baskın sınıf" HESAPLANMAZ (A2 241f1b9: üç ızgaralı ilçede de kırsal çıkıyor, %93–97; talep 12–41 kat eksik sayılıyordu).
taban[ilce][m]   = carpBol(talep1000Saat[m] × yerelOlcek, ilceNufusEsdegeri(ilce), 1000)        // mili-birim/saat; derlemede (DerlenmisPerakende.talepTaban: ilçe -> mal)
yerelTalep(m, ilce, t):
  taban = talepTaban.get(ilce)[m]; 0 ise 0 dön
  g     = malGrubu[m]
  ay    = takvimAyi(ic, t)                                           // tarim/iklim.ts:44; tarım kapalıysa null
  q     = ay === null ? taban : carpBol(taban, grupTakvim[g][ay], PPM)
  w     = bayramCarpani(g, Math.floor(t / GUN))                     // sim günü (dünya epoch'undan)
  return w === PPM ? q : carpBol(q, w, PPM)                          // A2: Q = floor(floor(taban × takvim / 1e6) × bayram / 1e6)

bayramCarpani(g, gun):
  by = grupBayram[g]; by === null ise PPM
  for B of bayramGunleri (artan):
     if gun < B − by.oncesiGun: break                                 // sonraki bayramlar daha ileri
     if gun < B: return by.oncesiPpm                                  // [B − Do, B − 1]
     if gun < B + by.sonrasiGun: return by.sonrasiPpm                 // [B, B + Ds − 1] (bayram günü dahil)
  return PPM
```

- **İlçe nüfusu (baş lider onaylı; A2 `241f1b9`, S-6 kapandı):** `ParselIlceTanimi.nufus?: number` isteğe bağlı fikstür alanıdır; **yalnız ekleme** (eski fikstürler değişmeden geçerli). **Alan yoksa** nüfus eşdeğeri `ilceSinifiNufus[ParselIlceTanimi.sinif]`'tir (10 000 / 40 000 / 120 000). `yerelOlcek` = **40**. **İlçe seviyesi yoktur** (Y-33 kilitsizlik); taban `uygunHucre`'ye bağlanmaz.
- **Neden fikstür alanı (param tablosu değil):** nüfus coğrafi bir olgudur, ilçenin diğer verisiyle (hücreler, sınıf) aynı yerde ve aynı üretim hattında (O3) yaşar; `param.mulk.perakende.talep` altında 900'ü aşkın ilçe için kimlik anahtarlı tablo T3'ü ve fikstür sahibini iki kaynağa ve kimlik kaymasına mahkûm ederdi. Alan fikstür şemasında isteğe bağlı olduğundan eski fikstürler (`mini-6`, sentetik) aynen geçerlidir.
- **Neden yedek sınıf `ParselIlceTanimi.sinif` (tek varsayılan değil):** veri sahibinin kendi ilçe sınıfıdır, deterministiktir ve hücre taraması gerektirmez; test fikstürlerindeki ilçe çeşitliliğini korur (tek varsayılan tüm ilçeleri eşitlerdi). Bilinen yan etki: `sinif` "en yüksek hücre sınıfı" olduğundan yedek yolda talebi **fazla** sayabilir; yedek yalnız `nufus` olmayan fikstürlerde (test/sentetik) çalışır, gerçek veride `nufus` bunu değiştirir. Bölge kipi etkilenmez (`perakende` ve fikstür yalnız mülk kipindedir).
- **Derleme:** `mulkDerle` her ilçe için `ilceNufus` (`ilceNufusEsdegeri`) ve `talepTaban` satırını bir kez kurar; çözümde yalnız arama yapılır.
- **Değerler (T3; A2 §1.9, §1.13'ten):** `talep1000Saat` (12 mal), `ilceSinifiNufus`, 4 takvim grubu (her satır toplamı tam 12.000.000), 2 bayram grubu (toplam sabit: `Do·(Wo − 1e6) + Ds·(Ws − 1e6) = 0`), `bayramGunleri`. Çekirdekte sabit değer yoktur.
- **Bayram sınırı:** `oncesi` penceresi `[B − Do, B − 1]`, `sonrasi` penceresi `[B, B + Ds − 1]` (bayram günü sonrasında; A2 bu tanımı açıkça yazmamıştır: A2'ye teyit, S-8). Pencereler çakışmaz (V9: komşu bayram farkı ≥ `Do + Ds`). Resmî bayram tarihleri (sim günü indeksi, 1 Ekim 2026 = gün 0; TRT gece yarısına hizalı) **T3 verisidir** ve (doğrulanmadı: tarihler); boş liste geçerlidir (bayram yok).
- Takvim ve bayram çarpanları **veri**dir; takvim hesabı (hicri tarih vb.) çekirdekte yoktur. Kış fırtınası olayı (cam/pencere ×1,5; canlı-dünya §5) takvimden bağımsızdır ve **bu şartnamede yoktur**.
- `talep1000Saat` mevcut mülk/bölge davranışını değiştirmez (§4.3 son madde).

### 6.6 Para akışı (özet; ayrıntı §12)

| Kalem | Defter | Not |
|---|---|---|
| Dükkân satış geliri | **musluk `yerelNpc`** (isteğe bağlı kalem) + oyuncu başına kümülatif `MulkOyuncuDurumu.dukkanGeliri` | `paraMuhasebesi` (`mulk/kasa.ts:94-125`) `a.yerel` oranını `dt` ile kesin işler |
| Dükkân işletme gideri | lavabo `isletme` | `hazineKalemleri` `gider − ithalat` içinde (`cozum.ts:176`) |
| Esnaf payı | **hiçbir yere yazılmaz** | para hiç basılmaz |
| NPC ithalatıyla rafı doldurma | lavabo `ithalatNpc` (mevcut) | net para girişi yalnız `(satış − ithalat maliyeti) × hacim` |

### 6.7 Yetişme (kapalıyken)

Sunucu kapalıyken geçen süre açılışta 1 sim-saatlik adımlarla yetiştirilir (`Simulasyon.calistirKadar`, `motor.ts:357-375`; her saatlik tık `kirlet` eder). Dükkân satışı **ek mekanizma gerektirmez**: oranlar çözümde yazılır, tembel birikir. Test: tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma, durum özeti birebir (§16).

### 6.8 Okuma API'si (saf, durumu değiştirmez)

`mulk/perakende.ts`: `yerelPazarGorunumu(d, ic, oyuncu)` → dükkân başına `{ ekYapi, yuvalar: [{ mal, fiyatKademesi, etkinKademe, mevcut, istek, esnafPay, q }], kasaDoluluk, giderMiliSaat, kampanya: { bitis, kalanSaat, kalanGun } }`: arayüz "tahmini satış", "neden satmıyor" (`mevcut`, `kasaDoluluk`), ZP ölçümleri ve K2 `kare` alanları (§10.2) için; çözümle **aynı** `yerelPazarHesapla` çekirdeğini kullanır (`istek` = kasa kırpmalı istek; dükkân başına `gercek` stoğa bağlıdır ve **durumda tutulmaz**: düğüm düzeyinde `BolgeDurumu.yerelKarsilanmaPpm` ve oyuncu düzeyinde `ParaAkisi.yerel` okunur).

### 6.9 Performans ve bundle

Maliyet: çözüm başına `O(D × Y + I × M)` (D dükkân, Y ≤ 8 yuva, I dükkânlı ilçe, M ≤ 24 mal): ihmal edilebilir; yine de `cekirdek/bench/komut-maliyeti.ts` dükkânlı senaryoyla yeniden koşulur, çözüm başına CPU artışı ≤ %5 hedeflenir (docs/06 §15.9 taban 2,6–2,9 ms). Önbellek gerekirse yalnız `WeakMap` ve girdiyle anahtarlı (durum metnine girmez, §15.9 kalıbı). Bundle: çekirdek +2–3 KB gzip (K3 keşif §4).

### 6.10 Bilinçli sadeleştirmeler (Alfa-0)

Kasa kırpması **su-doldurmadır** (en çok 32 tur; A2 ile aynı), tek geçişli değil; çeşit anlık (24 saat penceresi yok); konum, vitrin, bakım çarpanları yok; hane fiyat esnekliği (η) yok (üst sınır §12.4'te invariant olarak testlenir); esnaf payı anlık (14 günlük EMA yok); kampanya penceresi G7 şemasındadır ama **varsayılan kapalıdır** (§7.5b). Hepsi Alfa-1 parametre/kural dönemi işi; GZ-11.

---

## 7. G7b: `dukkan` S

### 7.1 Durum alanları (`tipler.ts`, hepsi isteğe bağlı: yalnız kullanılınca yazılır)

```ts
// tipler.ts:303-308 EkYapiDurumu'na
export interface EkYapiDurumu {
  id: number;
  tur: string;
  hucreler: HucreId[];
  /** Yalnız tur === "dukkan" iken. */
  dukkan?: DukkanDurumu;
}

export interface DukkanDurumu {
  /** `mulk.perakende.dukkanTurleri[].id` (dize; dizi indeksi DEĞİL). */
  tur: string;
  /** 0 = S, 1 = M, 2 = L (Alfa-0'da yalnız 0). */
  olcek: 0 | 1 | 2;
  /** `MulkOyuncuDurumu.markalar` indeksi; yoksa markasız. */
  marka?: number;
  /** Uzunluk = `perakende.olcekler[olcek].rafYuvasi`; boş yuva `mal` taşımaz. */
  raf: RafYuvasi[];
  /** Kampanya sayaçları (§7.5b); yalnız bir kampanya başlatılınca yazılır. */
  kampanya?: KampanyaDurumu;
  /** Yapı komutunun verildiği an (`InsaatDurumu.baslangic`'ten kopyalanır) ve tamamlanma anı (`ekYapiTamamla`: d.zaman). A0-11 ölçümü ve rehber için durumdan okunur (§15.3). */
  baslangic: Ms;
  kurulus: Ms;
}

export interface KampanyaDurumu {
  /** Sayaçların ait olduğu sim haftası (`floor(gun / 7)`). */
  hafta: number;
  /** Bu haftada en az bir kampanya saati olan gün sayısı. */
  gunSayisi: number;
  /** En son kampanya kullanılan sim günü ve o gün kullanılan saat. */
  gun: number;
  saat: number;
  /** Etkin kampanyanın bitişi (ms; tam saat sınırı). `bitis > d.zaman` iken kampanya etkindir. */
  bitis: Ms;
}

export interface RafYuvasi {
  /** Mal KİMLİĞİ (dize; `dunyaYenidenIndeksle` kapsamına girmez). Tanımsız = boş yuva. */
  mal?: string;
  /** `perakende.fiyatKademeleriPpm` indeksi (tutar DEĞİL). Boş yuvada da varsayılan değerdedir. Kampanya kademesi (0) seçiliyse ETKİN kademe kampanya penceresine göre belirlenir (§7.5b). */
  fiyat: number;
  /** Son fiyat/mal DEĞİŞİMİ (ms; hız sınırı için). İlk doldurma ve boşaltma yazmaz. */
  fiyatT?: Ms;
}

// tipler.ts:773-797 MulkOyuncuDurumu'na
markalar?: OyuncuMarka[];        // en çok perakende.marka.hesapBasinaEnFazla; ilk marka tanımlanınca yazılır
dukkanGeliri?: ParaSayaci;       // kümülatif NPC dükkân geliri (mili-₺); ilk gelirde yazılır
ilkSatisT?: Ms;                  // yerel satış oranının ilk kez > 0 olduğu an (paraAkisiYaz: akis.yerel > 0 iken `??= d.zaman`); A0-11 "ilk satış" zamanı (§15.3)

export interface OyuncuMarka { ad: string; simge: number; renk: number }

// tipler.ts:476-503 InsaatDurumu'na (inşa sürerken tür taşınır)
dukkanTuru?: string;

// tipler.ts:238 BolgeDurumu'na (yalnız dükkân varken ve < PPM iken yazılır; `gidaKarsilanmaPpm` örüntüsü): düğümün dükkân satış isteğinin
// karşılanma oranı = min(frD[m]) (stoğun yetmediği durumu panele söyler: "neden satmıyor")
yerelKarsilanmaPpm?: number;
```

### 7.2 Yerleşim ve inşa (mevcut komutlara `dukkanTuru`)

`tesis_insa_hucre` ve `yapi_yerlestir` komutlarına isteğe bağlı **`dukkanTuru?: string`** eklenir (`tipler.ts:966-975`; protokol §10.1). `tesisTuru === "dukkan"` iken zorunlu, değilken yasak. **Gerekçe (GZ-13):** ayrı `dukkan_ac` komutu atomik "yapı önce yerleşim" hattını (hücre satın alma, 72/%25, ayrılmış hücre, ilk-yapı indirimi, `esZamanliInsaat`) kopyalardı; mevcut hat `mulk/komut.ts`'te tek yerde.

**`mulk/komut.ts` değişiklikleri:**

| Fonksiyon | Satır | Değişiklik |
|---|---|---|
| `yapiTuruCoz(ctx, mk, tesisTuru, olcek)` → `(…, dukkanTuru)` | `:262-279` | `:274` "ek yapi olceklenemez" yalnız `ek.olcekHucre === undefined` iken; `olcek > 0 && ek.olcekHucre` ise `yuva = ek.olcekHucre[olcek]`; `dukkan` ise tür ve ölçek denetimleri (DUK-01…DUK-06); `YapiTuru`'ne `dukkanTuru?: string` |
| `yapiHucreleri` | `:285-294` | değişmez (`tur.yuva` ayak izi) |
| `yapiPlani` | `:321-382` | ek yapı dalında (`:333-341`) `tur.olcek > 0` ise **tesis dalındaki** (`:357-363`) ölçek çarpanı: `para`, `mal` × `sanayiTablosu(ic).p.olcekKademeleri[olcek].insaPpm`; süre `:365` zaten ölçek çarpanını kullanır; **ilçe sınırı** (§7.6) ve ek yapı `enFazlaIlBasina` (mevcut `:334-336`) |
| `yapiUygula` | `:468-495` | `ins.dukkanTuru = plan.tur.dukkanTuru` |
| `ilcedeDukkanSayisi(d, oyuncu, ilceId)` (yeni) | `mulk/perakende.ts` | biten (düğüm `ekYapilar`, ilçe `hucreler[0]`) + süren (`d.insaatlar`, `ekYapi === "dukkan"`) |

`mulk/yapi.ts:54-83` `ekYapiTamamla`: `tur === "dukkan"` ise `(b.ekYapilar).push({ id, tur, hucreler, dukkan: dukkanVarsayilani(mk, insaat.dukkanTuru, insaat.olcek ?? 0) })`; `dukkanVarsayilani`: `{ tur, olcek, raf: Array.from({ length: rafYuvasi }, () => ({ fiyat: varsayilanFiyatKademesi })) }` (marka yok). `ekonomi/insaat.ts:12-17` değişmez (`ekYapiTamamla` çağırır, sonunda `kirlet`).

**S dükkân bedeli (G7; baş lider kuralı: P-İthal):** `ekYapilar.dukkan`: `yuva: 1`, `insaSaati: 4`, `insaParasi: 6 000 000` mili-₺ (A2 §1.7 P-İthal), `insaMaliyeti: { celik: 20 000, parca: 8 000, pencere: 4 000 }`, `enFazlaIlBasina: 6`, `olcekHucre: [1, 2, 3]` (değerler A2 §1.7/§1.13; T3 yazar). İlk 5 yapı %30 indirimi ve ilk 24 saat %10 süre mevcut mekanizmayla uygulanır (`mulk/komut.ts:369-380`; indirim tutarı S tabanından, ölçekten bağımsız); `floor(4 000 × 0,7)` = 2 800 pencere indirimli.

### 7.3 Ölçek ve türler: G7'de yalnız S açık

- `acikOlcekler = [0]`. Komutta `olcek` 1 ya da 2 → `dukkan olcegi henuz acik degil: <m|l>` (DUK-04). **`acikOlcekler` yalnız dükkân ölçeği içindir ve bir özellik açılış zamanlamasıdır; e1080dd'deki fabrika/tesis ölçek serbestliğini (doğrudan M/L kurulum) etkilemez.** Bir oyuncu kilidi değildir: A0-17 testi parametrenin varlığına izin verir, hiçbir oyuncu özelliğine (seviye, teknoloji, sıra) bağlı olmadığını doğrular. Baş lider kararı (S-7): `[0]`.
- **Alfa-0 dükkân türleri (beş S türü; baş lider; T3 §5.1):** G7'de `bakkal`, `firin`, `sarkuteri`, `sekerci`; G8'de `yapi_market`. Hepsinde `olcekAraligi = [0]`. **`market` ve `supermarket` kaydı yoktur** (A1; T3 §11 soru 14). Mal listeleri ve `tamCesit` T3 verisidir (T3 §5.1 tablosu; her `mal` için NPC pazar kaydı ve `talep1000Saat` satırı zorunlu: V3, V4); `tamCesit` ≤ mal sayısı (V8): `bakkal` 6, `firin` 2, `sarkuteri` 3, `sekerci` 2, `yapi_market` 4 (T3 §11 soru 9: parametre, varsayılan bu).
- `ekYapilar.dukkan.olcekHucre = [1, 2, 3]`: market 2 hücre, **süpermarket 3 hücre** (sahip kararı S4-4); A0'da kullanılmaz (tür kaydı yok) ama komut doğrulaması ayak izini aynı kuralla (`kenar-bitişik, ≤ 5`) denetler, M/L açıldığında ek kod gerekmez.

### 7.4 `dukkan` bedelinde pencere: karar, kırılganlık ve geçiş (baş lider kararı 2)

**Baş lider kuralı:** G7 anında pencere NPC'den ithal edilebiliyorsa **P-İthal**, edilemiyorsa **P-Yok**. **Doğrulama (koddan):** NPC pencere arzı **vardır**: `veri/icerik/parametreler.json` `pazar.arzSaat.pencere = 60 000` mili-birim/sa ve `emilimSaat.pencere = 100 000` (oyuncu başına ölçek `max(4, oyuncu)/4 ≥ 1`: `pazar/piyasa.ts:53` `npcHacimleri`); ithalat emri `hazineVar` şartıyla gerçekleşir (`pazar/piyasa.ts:106`) ve pencere işletme düğümü stoğuna girer. **Sonuç: P-İthal** (`insaParasi 6 000 000`, `insaMaliyeti.pencere 4 000`).

**Deneyle doğrulama (§2.4):** 4 pencere ithalatı teknik olarak çalışır (emir `pencere` ithalat 4 birim/sa; +70 dk'da stok 666 mili) ama **kırılgandır**: gerçekleşme bir sonraki tam saat tıkında başlar, 4 birim için emir oranı ve süresi elle ayarlanır, bitince **elle iptal gerekir** (iptal edilmezse tüketim sürer). **Gerçek maliyet** R0 ile: 4 × 540 ₺ × 1,111 ≈ **2.400 ₺** (A2 §1.7'nin taban hesabı 1.600 ₺'dir; B2). İlk dükkân akışına ≥ 1 saat ve bir ticaret emri yuvası ekler (A0-11 ≤ 36 sa hedefinde sorun değil). **Açık risk (G9 onboarding):** `yapi_yerlestir` stok yetmezse `yetersiz stok: <düğüm> (mal indeksi <n>)` döner; K1 çevirisi mal adını söylemeli (§9.3 notu); Esnaf Defteri "pencere al" adımını göstermeli.

**P-Yok'a dönüş / geçiş (gerekirse; veri değişikliği olarak):**

| Konu | Yanıt |
|---|---|
| Ne değişir | `ekYapilar.dukkan`: `insaParasi` 6 000 000 ↔ 7 440 000 (pencere para eşdeğeri; A2 §1.7: 4 × 360 ₺ taban) ve `insaMaliyeti.pencere` 4 000 ↔ yok. **Yalnız veri**; çekirdek kodu aynıdır (bedel tablodan okunur, `mulk/komut.ts:333-341`) |
| Mekanizma | **Kural dönemi** (`kuralSurumuHesapla`, `serilestir.ts:802`: içerik/parametre değişimi `kuralSurumu`'nu değiştirir; sunucu `gocIzni` ile dönem sınırında geçer, docs/06 §14.2). **Parametre bayrağı DEĞİL** |
| Mevcut dükkânlara etkisi | **Yok.** Bedel inşa komutunda tahsil edilir ve `InsaatDurumu.odenenPara/odenenMal`'a yazılır (`tipler.ts:476-503`); biten dükkân bedelden bağımsızdır. **Süren inşaatın iptal iadesi** ödenmiş (eski) bedelle yapılır: iade `odenenMal` tabanlıdır, yeni bedelle değil |
| Yeni kurulumlar | dönem sınırından sonra yeni bedelle |
| Test | `dukkan` inşa testi iki veri kopyasıyla (pencereli/pencere-siz); eski görüntü yeni bedelle yüklenir ve süren inşaat iptali eski bedeli iade eder |

**G8'de değişiklik yok** (zaten ithal pencereli): G8 yalnız pencerenin yerli kaynağını (cam → doğrama) ekler; ithalat gerekmez olur (S-13 kapandı).

### 7.5 Raf, fiyat, hız sınırı

- 1 yuva = 1 mal; aynı mal iki yuvada olamaz. Yuva indeksi 0'dan; sayı `olcekler[olcek].rafYuvasi`.
- Rafa konabilen mal: `dukkanTurleri[tur].mallar` içinde (DUK-13). Mal koymak/değiştirmek yuvanın fiyat kademesini `varsayilanFiyatKademesi`'ne çeker.
- **Fiyat kademesi** `dukkan_fiyat.fiyat`: `0 .. fiyatKademeleriPpm.length − 1` (`secim`); fiyat = `R × fiyatKademeleriPpm[etkinKademe] / PPM`. A2 §1.9 kademeleri (baş lider onaylı): 0 = kampanya 0,85 R, 1 = uygun 0,95 R, **2 = normal 1,05 R (varsayılan)**, 3 = yüksek 1,15 R (üst sınır; ZP3 alarmı 1,30'un altı). **Tutar komutta ve durumda yoktur.** İsimler (ucuz, normal, pahalı, ...) arayüz (T1) işidir; çekirdek yalnız indeks bilir. Kademe **sayısı ve sırası kalıcıdır**; çarpan değerleri kalibre edilebilir (GZ-3).
- **Hız sınırı:** dolu yuvada `mal` değiştirme ya da `fiyat` değiştirme, yuvanın son değişiminden (`fiyatT`) `fiyatDegisimEnAzSaat` saat sonra yapılabilir (DUK-18). İlk doldurma ve boşaltma sınırdan muaftır. Kampanya kademesini seçmek de bir fiyat değişimidir (sınır uygulanır). Sınır komut başına tam çözüm maliyetini (docs/06 §15.9) sınırlamak içindir.
- Raf yuvası **boşken** çekime girmez; çeşit paydasında sayılmaz.

### 7.5b Kampanya penceresi (G7-1 şeması; baş lider: kademe 0, günde ≤ 6 sa, haftada ≤ 2 gün)

**Varsayılan kapalıdır:** `kampanyaKademesi`, `kampanyaGunlukEnFazlaSaat` ve `kampanyaHaftalikEnFazlaGun` üçü de tanımlı **ve** sınırlar > 0 değilse kampanya kademesi seçilemez: `dukkan_fiyat` kademe `kampanyaKademesi` ile **DUK-20** `kampanya kademesi acik degil` döner. Açmak veri değişikliğidir (kural dönemi). A2/baş lider değerleri: `kampanyaGunlukEnFazlaSaat = 6`, `kampanyaHaftalikEnFazlaGun = 2`.

**Zaman tanımları (sim zamanı; gerçek saat yok; hepsi tamsayı):** `gun = floor(t / GUN)` (epoch 1 Ekim 2026 00:00 TRT = gün 0), `hafta = floor(gun / 7)` (takvim haftası **değil**, sim-günü bloğu; S-18), saat sınırı `SAAT`. **Kabul (baş lider, S-18):** hafta sim haftasıdır (`floor(gun / 7)`), gün sınırı 00:00 TRT; oyuncuya yalnız **"bu hafta kalan gün"** (`kalanGun`, §10.2) gösterilir, hafta numarası ve hafta başlangıcı gösterilmez (sim haftaları 1 Ekim 2026 perşembe başlar; takvim haftasıyla çakışmaz). Kampanya **tam saat sınırlarında** işler: başlangıç anının içinde bulunduğu saat tam saat sayılır; bitiş her zaman bir tam saattir (böylece bitiş saatlik tıka denk gelir ve **yeni olay gerekmez**: her saatlik tık `lojistikCoz` çalıştırır).

**Durum (`DukkanDurumu.kampanya?`, §7.1):** `{ hafta, gunSayisi, gun, saat, bitis }`. Yalnız ilk kampanya başlatılınca yazılır.

**Başlatma (`dukkan_fiyat` kademe = `kampanyaKademesi`; hepsi ya da hiçbiri):**
1. Kampanya kapalıysa DUK-20.
2. `g = floor(d.zaman / GUN)`, `h = floor(g / 7)`. Kampanya zaten etkinse (`kampanya.bitis > d.zaman`): başka yuvaya kampanya kademesi vermek **ücretsizdir** (pencere paylaşılır; sayaç artmaz); 3-5 atlanır.
3. Sayaç yoksa ya da `kampanya.hafta !== h` ise sayaçlar sıfırlanır (`gunSayisi = 0`; **hesapta**, durum bu komut başarılı olunca yazılır).
4. `g !== kampanya.gun` (yeni gün) ise: `gunSayisi ≥ kampanyaHaftalikEnFazlaGun` → **DUK-21** `kampanya haftalik gun siniri (en cok <n> gun)`; değilse `saat = 0`. Aynı günse: `saat ≥ kampanyaGunlukEnFazlaSaat` → **DUK-22** `kampanya gunluk saat siniri (en cok <n> saat)`.
5. Yazım: `kalan = kampanyaGunlukEnFazlaSaat − saat`; `baslangicSaat = floor(d.zaman / SAAT)`; `gunSonuSaat = (g + 1) × 24`; `bitisSaat = min(baslangicSaat + kalan, gunSonuSaat)`; `saat += bitisSaat − baslangicSaat`; yeni günse `gunSayisi += 1`; `gun = g`; `hafta = h`; `bitis = bitisSaat × SAAT`. (Kampanya gün sınırını **geçmez**: bir sim gününün sonunda biter; ertesi gün yeniden başlatmak haftalık gün sınırına sayılır.)

**Etkin kademe (saf; çekim, okuma API'si ve gelir hesabında tek işlev `etkinKademe(dukkan, yuva, t)`):** yuva `fiyat !== kampanyaKademesi` ise `fiyat`; kampanya kademesindeyse ve `kampanya !== undefined && kampanya.bitis > t` ise `kampanyaKademesi`; aksi halde **`varsayilanFiyatKademesi`** (otomatik dönüş). Durum **değiştirilmez** (yuvanın `fiyat` alanı kampanya kademesinde kalır; oyuncu görünümünde "kampanya bitti, normal fiyat" yazar): bu, çözüm sırasında durum yazma ihtiyacını ortadan kaldırır ve "tek sıçrama = parçalı sıçrama" değişmezini korur (etkin kademe yalnız (durum, `t`) fonksiyonudur).

**Erken bitirme:** oyuncu kampanya yuvasına başka kademe verirse (hız sınırı geçerli) yuva hemen normale döner; tüketilmiş saat **iade edilmez** (sayaç değişmez). Kalan etkin kampanya diğer yuvalar için sürer.

**Ret iletileri:** DUK-20, DUK-21, DUK-22 (§9.3). **Testler (§16.2):** (a) kapalıyken DUK-20; (b) 6 saat sınırı: 10:20'de başlat → 16:00'da biter (6 tam saat sayılır); aynı gün ikinci başlatma DUK-22; (c) gün sonu kesmesi: 21:00'da başlatılan kampanya 24:00'te biter, kalan saat ertesi güne **taşınmaz**; (d) haftalık gün sınırı: 3. farklı günde DUK-21; yeni haftada (gun/7 değişince) sayaç sıfır; (e) bitişte çözüm gelir/çekim `varsayilanFiyatKademesi` kullanır, durum özeti (yuva `fiyat`) değişmez; (f) tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma; (g) iki yuvada paylaşılan pencere; (h) fiyat sınırı DUK-18 ile etkileşim.

### 7.6 Sayı sınırları

Oyuncu başına ilçede ≤ `ilceBasinaEnFazla` (A2 §1.13: 2) dükkân (biten + süren), ilde ≤ `ekYapilar.dukkan.enFazlaIlBasina` (taslak 6; mevcut genel kural `mulk/komut.ts:334-336`), ilçe %25 ve 72 hücre tavanı dükkânın hücrelerine de uygulanır (`alimPlani`). Arsa kullanım türü (konut/ticari) **yok** (§19 Soru 5): fikstürde alan yoktur; her uygun hücreye dükkân kurulur.

### 7.7 Marka ve oyuncu görünen adı: paylaşılan ad kuralı (sınırlı serbest metin; baş lider kararları 4 ve ad kararı)

**Paylaşılan kural (baş lider):** oyuncunun **görünen adı** (hesap başına bir ad; sunucu profilinde, çekirdeğe GİRMEZ) ve **marka adı** (çekirdekte) **AYNI kuralları** kullanır: uzunluk 2–24, izinli küme, boşluk kuralları, yasaklı ad süzgeci. Tek yerde tanımlı tek doğrulayıcı:

| Parça | Yer | Not |
|---|---|---|
| **Sözdizimi doğrulayıcı** `adSozdizimiHatasi(ad): string \| null`, **kanonik biçim** `adKanonik(ad)` (aşağıda) ve sabit `AD_KURALI = { min: 2, max: 24, izinli: /^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$/, kucukHarf: true }` | **`packages/cekirdek/src/ad.ts`** (saf, yeni; `@bolge/cekirdek` `index.ts`'ten dışa açılır; marka komutu `mulk/marka.ts` bunu çağırır) | Sunucu zaten `@bolge/cekirdek`'e bağlıdır (`sunucu/src/yazar.ts:49`): görünen ad ucu **aynı işlevi** çağırır; istemci de gönderim öncesi UX denetimi için çağırabilir. **Neden çekirdekte, `veri/saf` ya da `protokol`'de değil:** (a) çekirdek `@bolge/veri` çalışma zamanı importu yapamaz (`mal-kimlik-kilidi-paket.test.ts` güvencesi; ters yön serbest); (b) `protokol` yalnız biçim denetler (zod) ve çekirdeğe bağımlı olmamalıdır; (c) marka komutu çekirdekte doğrulanır ve kuralın günlükte "kural dönemi dışında değişmez" olması gerekir |
| **Yasaklı ad listesi** | **`packages/veri/icerik/yasakli-adlar.json`** (T3 + hukuk/hassasiyet incelemesi) | İki ad için **aynı** dosya |
| **Yasaklı ad süzgeci** `adYasakliMi(ad)` | **`packages/sunucu/src/ad-suzgec.ts`** (K2; önceki adı `marka-suzgec.ts`) | İki yolda da çağrılır: (1) `marka_tanimla` komut kabulünde günlüğe yazmadan ÖNCE, (2) görünen ad profil ucunda. Çekirdekte yok (liste güncellenir; replay güvenli) |
| **Protokol sınırı** | `komut-sema.ts` `marka_tanimla.ad: z.string().min(2).max(24)`; profil ucu aynı `min(2).max(24)` | Test: protokol sınırları `AD_KURALI.min/max`'a eşit (§16.2 `ad-kurali`) |

**Bundle etkisi:** `adSozdizimiHatasi` ≈ 0,2–0,3 KB gzip ve **zaten marka komutu için çekirdek paketindedir** (§6.9: G7 +3–5 KB payının içinde); görünen ad ucu **ek bundle maliyeti getirmez** (aynı işlev; sunucu tarafı bundle dışı). Yasaklı liste istemci paketine **girmez** (yalnız sunucu). **Büyük harf (S-12; baş lider varsayılanı, sahip kararı bekler):** girişte büyük harf **izinlidir** (izinli küme `A-Z`/`ÇĞİÖŞÜ` içerir), ama marka adı ve görünen ad **küçük harfe çevrilerek saklanır** (Türkçe kural: `İ→i`, `I→ı`); çeviri **tek yerde**, `ad.ts` `adKanonik`'te yapılır. "Arayüzde büyük harf yok" kuralı böylece sunucudan gelen kullanıcı adlarına da uyar. Sahip "serbest" derse yalnız `AD_KURALI.kucukHarf` `true → false` olur (bkz. aşağıdaki kanonik biçim bölümü); sahip teyidi S-12. **Görünen ad değişim sınırı (K2 kararı):** görünen ad değişimi **günlük sınıra** tabidir ve gün **00:00 TRT**'de değişir (sayaç gece yarısı sıfırlanır; sınır değeri ve sayacın saklanması K2'nin, çekirdeğe girmez); **otomatik addan (hesap açılışında verilen ad) ilk bilinçli seçime geçiş günlük sınıra SAYILMAZ**.  Bu sınır yalnız görünen ad (sunucu profil ucu) içindir; marka adı komutunda ad değişimi için ayrı bir günlük sınır yoktur (sınır `hesapBasinaEnFazla` marka sayısıdır). **Görünen ad KVKK:** profilde saklanır (sunucu); çekirdek günlüğüne ve dünya durumuna girmez; sıfırlama sunucu yönetici yoludur (marka için `marka_sifirla`).

**Kanonik biçim `adKanonik(ad)` (S-12 varsayılanı; `packages/cekirdek/src/ad.ts`, saf):**

```ts
// Sabit eşleme tablosu; yerel ayar ve toLowerCase/toLocaleLowerCase YOK.
const KUCUK_HARF: Readonly<Record<string, string>> = {
  A: "a", B: "b", C: "c", D: "d", E: "e", F: "f", G: "g", H: "h", I: "ı", J: "j",
  K: "k", L: "l", M: "m", N: "n", O: "o", P: "p", Q: "q", R: "r", S: "s", T: "t",
  U: "u", V: "v", W: "w", X: "x", Y: "y", Z: "z",
  "İ": "i", "Ç": "ç", "Ğ": "ğ", "Ö": "ö", "Ş": "ş", "Ü": "ü",
};
export function adKanonik(ad: string): { tamam: true; ad: string } | { tamam: false; hata: string } {
  const hata = adSozdizimiHatasi(ad);            // 1) önce sözdizimi (büyük harf girişte izinli)
  if (hata !== null) return { tamam: false, hata };
  if (!AD_KURALI.kucukHarf) return { tamam: true, ad };
  let c = "";
  for (let i = 0; i < ad.length; i++) c += KUCUK_HARF[ad[i]] ?? ad[i];   // 2) sabit tablo, uzunluk korunur
  return { tamam: true, ad: c };
}
```

- **`toLowerCase`/`toLocaleLowerCase` KULLANILMAZ:** sonuç çalışma ortamına (yerel ayar, Node/ICU sürümü, Windows/Linux) bağlıdır; `"I".toLowerCase()` = `"i"` (Türkçede `ı` olmalı) ve çekirdeğin determinizm kuralını bozar. Tablo tek doğruluk kaynağıdır; tabloda olmayan karakter (küçük harf, rakam, boşluk, `.'&-`) olduğu gibi geçer. K3 testi: `ad.ts` kaynağında bu iki işlevin adı geçmez (kaynak taraması; `Math.pow/sqrt yok` lint kalıbı).
- **Tek çağrı yeri iki yol için:** `marka_tanimla` (`mulk/marka.ts`: `const r = adKanonik(ad); if (!r.tamam) return { tamam: false, hata: r.hata };` sonra durumda `r.ad` saklanır ve MRK-11 karşılaştırması da `r.ad` ile yapılır) ve sunucudaki görünen ad ucu (profilde `r.ad` saklanır; yasaklı ad süzgeci `r.ad` üzerinde koşar). İstemci isterse gönderim öncesi aynı işlevle küçültebilir (UX); **sunucu ve çekirdek istemciye güvenmez**, yeniden çevirir. Çeviri **idempotent**tir: `adKanonik(adKanonik(x).ad)` aynı sonucu verir.
- **Uzunluk ve izinli küme çeviriden önce denetlenir; çeviri uzunluğu korur** (bire bir BMP eşleme; MRK-04/05 ileti ve kuralları değişmez). Büyük harf ret nedeni **değildir**; yeni MRK kodu yoktur.
- **Madde 3 ("reddet, düzeltme yapma; günlükteki metin = durumdaki metin") ile ilişki:** düzeltme yasağı **boşluk ve karakter kümesi** için aynen sürer (baş/son boşluk, ardışık boşluk, geçersiz karakter reddedilir, kırpılmaz). **Tek istisna sabit tablolu büyük→küçük harf çevirisidir:** günlükte **girilen metin** kalır (`marka_tanimla.ad` olduğu gibi, `"İSTANBUL Fırını"`), durumda **kanonik biçim** (`"istanbul fırını"`) tutulur. Yeniden oynatma güvenlidir, çünkü çeviri (a) saf ve (b) sabit tablolu ve (c) aynı kod sürümünde her zaman aynı çıktıyı verir; günlük + kod = durum kuralı sürer (dönüşüm girdinin saf işlevidir). **Tablo değişirse yeniden oynatma sonucu değişir:** bu yüzden tablo ve `AD_KURALI.kucukHarf` kural dönemi (kuralSurumu) kararıdır, serbestçe değiştirilmez.
- **Durum doğrulayıcı:** `mulkDogrula` `markalar[i].ad` için `adSozdizimiHatasi(ad) === null` **ve** (`kucukHarf` iken) `adKanonik(ad).ad === ad` (durumda büyük harf kalamaz) arar; ihlal `SerilestirmeHatasi`. Kısıtlıdan serbeste geçiş (`true → false`) eski görüntüleri **bozmaz**, tersi bozar: bu yüzden varsayılan küçük harftir (kısıtlı başlanır, sonra gevşetilir; yer tutucu `"adsiz marka"` zaten kanoniktir).
- **Sahip "serbest" derse:** yalnız `AD_KURALI.kucukHarf = false` (ve bu cümlenin `mulkDogrula` kanonik denetimi devre dışı kalır); başka satır değişmez.
- **Testler** (§16.2 `ad-kurali`, `marka-sozdizimi`): `"İSTANBUL Fırını"` → `"istanbul fırını"`; `"IŞIK"` → `"ışık"`; `"ISIK"` → `"ısık"`; aynı girdi iki kez aynı çıktı; idempotans; **özet etkisi:** `"IŞIK"` ve `"ışık"` ile tanımlanan marka aynı `durumOzeti`'ni verir (günlük farklıdır, durum aynıdır); günlükten yeniden oynatma = canlı dünya; `kucukHarf = false` veri kopyasında büyük harf aynen kalır; durum doğrulayıcı büyük harfli ad içeren görüntüyü reddeder; sunucu görünen ad ucu ve `marka_tanimla` aynı çıktıyı verir.

**Yer: çekirdek durumunda** (`MulkOyuncuDurumu.markalar`), gerekçe ve karşı seçenek §20 GZ-8'de. Komutlar: `marka_tanimla`, `dukkan_marka`, sistem yolunda `marka_sifirla` (moderasyon).

**Akıllı tırnak (A1 G9 notu; baş lider kararı) — İSTEMCİ NOTU:** iOS/Android klavyelerinin `’` (U+2019) ve `‘` (U+2018) karakterleri **istemcide** `'` (U+0027) işaretine çevrilir (K1/T1; §10.4); çift akıllı tırnak (`“ ”`) çevrilmez. **Çekirdek izinli kümesi DEĞİŞMEZ** ve sunucu/çekirdek yalnız izinli karakterleri kabul etmeye devam eder; böylece (büyük/küçük harf çevirisi `adKanonik` dışında) günlükteki metin = durumdaki metindir ve kural değişmez.

**Marka çekimi, fiyatı, satışı, çeşidi etkilemez** (canlı §4.1 kuralı; perakende §3.1). Test: aynı dünya markalı ve markasız, `istek` ve gelir birebir aynı.

**Doğrulama (çekirdek, saf, `ad.ts` `adSozdizimiHatasi(ad)`; marka komutunda `mulk/marka.ts` çağırır; kural dönemi dışında DEĞİŞMEZ, tekrar oynatma güvenli):**

| Madde | Kural |
|---|---|
| 1. Uzunluk | `ad.length` (UTF-16 kod birimi) `AD_KURALI.min` (2) ile `AD_KURALI.max` (24) arasında (**sabit; parametre değil**: iki ad için tek kaynak). İzinli kümede yalnız BMP, ön bileşik karakterler bulunduğundan **bir karakter = bir kod birimi**; Türkçe harfler (ç ğ ı i ö ş ü, İ) tek karakterdir. Protokol de `min(2).max(24)` |
| 2. İzinli küme | Yalnız: `A-Z a-z Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü`, `0-9`, boşluk (U+0020), `.`, `'`, `-`, `&`. Düzenli ifade (çekirdekte sabit): `^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$`. Birleşen işaretler, emoji, kontrol karakterleri, eğik/Unicode kesme işaretleri **reddedilir** (normalleştirme gerekmez) |
| 3. Düzenleme | **Reddet, düzeltme yapma:** baştaki/sondaki boşluk (`ad !== ad.trim()` değil; yalnız U+0020 denetlenir), ardışık boşluk (`"  "`), **en az bir harf** (`[A-Za-zÇĞİÖŞÜçğıöşü]`). İstemci göndermeden önce kırpar (K1). Boşluk ve karakter için günlükteki metin = durumdaki metin; **tek istisna** sabit tablolu büyük→küçük harf çevirisidir (`adKanonik`, yukarıda; S-12) |
| 4. Yasaklı adlar | **Çekirdekte yok.** Liste **veri dosyasıdır** (`packages/veri/icerik/yasakli-adlar.json`, T3 + hukuk/hassasiyet incelemesi) ve **sunucunun komut kabul süzgecinde** (günlüğe yazmadan ÖNCE) uygulanır: `sunucu/src/ad-suzgec.ts` (K2; marka ve görünen ad için ortak). Gerekçe: liste moderasyon için güncellenir; çekirdekte olsaydı (a) her güncelleme kural sürümünü değiştirirdi (dönem sınırı), (b) günlükte kabul edilmiş eski bir ad, yeni listeyle **yeniden oynatmada reddedilir** ve "başarılılar günlüğü = canlı dünya" değişmezi bozulurdu. Çekirdek yalnız sözdizimini denetler (değişmez kural) |
| 4a. Karşılaştırma | Büyük/küçük harf ve aksan **duyarsız**; çekirdek-dışı sabit katlama tablosu (yerel ayar yok): `A-Z → a-z`; `İ I ı i → i`; `Ç ç → c`; `Ğ ğ → g`; `Ö ö → o`; `Ş ş → s`; `Ü ü → u`; ayırıcılar (`boşluk . ' - &`) kaldırılır. İki liste: `yasakliKelimeler` (katlanmış **kelime** eşitliği; kısa adlar: "bim", "a101", "sok"), `yasakliIcerik` (katlanmış, ayırıcısız adın **alt dizgisi**; uzun adlar ≥ 5 karakter: "migros", "carrefour"...). Liste içeriği K34 (gerçek zincir adları) + küfür/hassas içerik; kapsamı **(doğrulanmadı)**; hukuki/marka taraması ayrı iştir. Süzgeç bot/ajan yoluna uygulanmaz (bot `marka_tanimla` vermez) |
| 5. Reddin kaynağı | Sözdizimi ret iletileri çekirdekten (MRK-01…MRK-10, §9.3); liste reddi sunucudan (`marka adi kullanilamaz`, MRK-12) |

**Durum ve özet etkisi.**

- Alan: `MulkOyuncuDurumu.markalar?: { ad: string; simge: number; renk: number }[]` (en çok `hesapBasinaEnFazla` = 3). **Yalnız ilk `marka_tanimla` başarılı olunca yazılır**; hiç marka tanımlamamış oyuncuların ve eski dünyaların durum metni ve `durumOzeti` **değişmez** (`yaz`, `ozet.ts:31-80`, tanımsız alanı atlar).
- Metin kanonik JSON'da `JSON.stringify` ile ve UTF-8 üzerinden FNV-1a 64 ile özetlenir (`ozet.ts:93-110`); izinli küme yalnız BMP karakterlerinden oluştuğu için platformlar arası kodlama farkı doğmaz (tek başına duran vekil (surrogate) kod birimi kümede yoktur). `mulkDogrula` (`serilestir.ts:522-`): `markalar` dizisi uzunluğu ≤ 3, her `ad` aynı `adSozdizimiHatasi` ile, `simge < simgeSayisi`, `renk < renkSayisi`; ihlal `SerilestirmeHatasi` (bozuk görüntü reddi).
- `dunyaIcerikUyumu` (`serilestir.ts:681`): her `DukkanDurumu.marka < markalar.length`.

**KVKK ve kötüye kullanım.** Marka adı serbest metindir ve kişisel veri içerebilir (ör. kişi adı); komut günlüğü ekleme-yalnız olduğundan **silme** doğrudan mümkün değildir. Önlemler: (1) kısa ve kısıtlı karakter kümesi (adresleme/URL/e-posta kalıpları zor); (2) arayüzde "marka adın dünyadaki herkese görünür ve kalıcıdır" uyarısı (T1 metni, G9); (3) sunucu yönetici yolu **`marka_sifirla {oyuncu, marka}`** (sistem yolu, yalnız `kimlik` + `secim` alanı): adı çekirdek sabiti `"adsiz marka"` yer tutucusuna çevirir (izinli kümede, `adSozdizimiHatasi`'ndan geçer); günlüğün eski komut metni için sunucu saklama politikası (anlık görüntü + günlük kırpma) K2/O3 işidir **(doğrulanmadı: günlük kırpma ilkesi)**; (4) KVKK hukuki görüşü (docs/12 S4-5 ile aynı iş). Karşı seçenek (sunucu profili) GZ-8'de.

### 7.8 `ilk_dukkan` tetiği (K2) ve çekirdek okuma API'si

Rehber değişmezi: ödül bedelden ucuz alınamasın (`dedektor.ts:23-26`). **Tetik: ilk satış** (yapı bitti DEĞİL): koşul = oyuncunun düğümlerinden birinde tamamlanmış `dukkan` ek yapısı **ve** `dukkanGeliri(d, oyuncu, t) > 0`. **Ölçüm için zaman alanları (A1 G9 bulgusu 4; A0-11 iki zaman ister):** (a) **yapı komutu zamanı** = `DukkanDurumu.baslangic` (inşa sürerken `InsaatDurumu.baslangic`); (b) **dükkân kurulma zamanı** = `DukkanDurumu.kurulus`; (c) **ilk satış zamanı** = `MulkOyuncuDurumu.ilkSatisT` (yerel satış oranının ilk > 0 olduğu çözüm anı; `paraAkisiYaz` `akis.yerel > 0` iken `??= d.zaman`). `ilk_dukkan` tetiği **ilk satıştır** (GZ-14): `dukkanGeliri(d, oyuncu, t) > 0`; ölçüm ilk satışı `ilkSatisT`'den okur. Çekirdek okuma API'si (`mulk/perakende.ts`, dışa açılır): `dukkanGeliri(d, oyuncu, t): Mili` (`n + oran × (t − t0)/SAAT` tembel; `uretimTembel` kalıbı `dedektor.ts:57-62`), `dukkanlar(d, oyuncu): { dugum, yapi }[]`. K2: `ODUL_YER_TUTUCULARI`'ndan `ilk_dukkan` çıkar, `ODUL_IZGARA_KAVRAMLARI`'na girer (`dedektor.ts:27-29`), `kavramSaglandi` `case "ilk_dukkan"`; istemci `harita/baglanti.ts:376` `etkin` listesi (K1). Ödül tablosu (`ilk_dukkan`: 10 000 mili çelik, `parametreler.json:11`) **değişmez**.

### 7.9 Çevrimdışı, sahiplik ve geri alma: `dukkan_yik` (A1 G9 ZG-5; baş lider kararı)

Satış tembeldir; sahip çevrimdışıyken sürer ("çevrimdışı satar"). Hareketsizlik merdiveni (docs/11 §7.8) bugün yalnız veridir; dükkâna özel kural yok. **"Kilit yok, seçim var":** yanlış tür ya da yer seçimi bedelle kalıcı olmamalıdır; iki yol vardır.

**1. İnşa sürerken: mevcut `insaat_iptal` AYNEN uygulanır (yeni komut yok; kapsam doğrulandı: kod okuma).** `insaat_iptal` (`mulk/komut.ts:607-632`) oyuncunun **süren hücreli** inşaatını iptal eder (`ins.hucreler !== undefined`, `:611`); dükkân inşaatı `yapiUygula`'da (`:468-495`) `hucreler: plan.liste`, `odenenPara`, `odenenMal` ve `ekYapi: "dukkan"` taşır, dolayısıyla **kapsamdadır** (gerekli değişiklik yok). İade: ödenen paranın ve **malzemenin (pencere dahil)** `insaatIptalIadePpm` (%50; `parametreler.json:195`) kadarı (`:612-619`; para `hazineEkle(…, "iade")` = mevcut `iade` musluk kalemi; malzeme düğüm stoğuna); ilk-yapı indirimi hakkı geri verilir (`:625-631`). **Sınır:** ilk 24 saatte dükkân inşa süresi 24 dk'dır (4 sa × 0,1; A2 §1.7): iptal penceresi dakikalarla ölçülür.

**2. Tamamlanmış dükkân: YENİ komut `dukkan_yik` (G7b; baş lider kararı): iade YOKTUR.** Harcanan para lavaboya gitti; iade yeni bir musluk açardı. **Arsa oyuncuda kalır** (hücre sahibi, ilçe hücre sayacı ve arazi değeri değişmez; sonra `parsel_birak %70` ile bırakılabilir). **Diğer yapı türleri için YOKTUR** (sonraki sprint; bu kural genellenmez: komut yalnız `dukkan` ek yapısına bakar).

| Konu | Karar |
|---|---|
| Komut | `{ tur: "dukkan_yik"; dukkan: number }` (oyuncu yolu; `dukkan` = `EkYapiDurumu.id`; **tutar, oran, adet alanı yok**); `komutSemasi.ts`: `dukkan_yik: { yol: "oyuncu", alanlar: { dukkan: "kimlik" } }` |
| Doğrulama sırası | (1) `perakende` açık (DUK-00); (2) `dukkan` tamsayı; oyuncunun düğümlerinde bu kimlikte `tur === "dukkan"` tamamlanmış yapı yoksa: kimlik oyuncunun **süren dükkân inşaatı**na aitse **DUK-23**, değilse **DUK-10** (başkasının dükkânı ve bilinmeyen kimlik aynı ileti: bilgi sızdırmaz); (3) uygula |
| Uygulama (hepsi ya da hiçbiri; artık başarısız olamaz) | `b.ekYapilar`'dan yapı silinir (liste boşalırsa alan **silinir**: "yalnız kullanılınca yazılır"); kapladığı hücrelerin `tesis` alanı silinir (`delete h.tesis`; `mulk/yapi.ts:61-68` `ekYapiTamamla`'nın tersi; hücre sahibi ve arazi değeri **değişmez**); `DukkanDurumu` (raf, fiyat, kampanya sayaçları, marka bağı, `baslangic`, `kurulus`) yapıyla birlikte silinir. `ctx.planla` yok (olay yok); motor her başarılı komuttan sonra lojistiği kirletir (çekim ve dükkân gideri sonraki çözümde kalkar) |
| **Raftaki satılmamış mallar** | **Ayrı raf stoğu YOKTUR** (§7.1: raf yuvası yalnız mal kimliği ve kademe tutar; satış **il düğümü stoğundan** çekilir). Yıkımda taşınacak mal yoktur: mallar zaten oyuncunun deposunda (düğüm stoğu) kalır. Kod tarafında stok işlemi yok |
| Para | **Yıkımda para hareketi 0:** hazine, musluk, lavabo, kasa girişi/çıkışı değişmez; `paraKaydet`/`hazineEkle` çağrılmaz. (İptalde %50 iade mevcut `iade` kalemidir: `mulk/komut.ts:612`.) Korunum testi: yıkım öncesi ve sonrası `Σ hazine + Σ kasa + Σ lavabo = Σ musluk` ve her kalem sayacı **bayt bayt aynı** |
| **İlk 5 yapı %30 indirimi sayacı** | Sayaç `MulkOyuncuDurumu.indirimliYapi`'dir (`tipler.ts:787`): `yapiUygula` indirimli inşaatta `mo.indirimliYapi += 1` ve `ins.indirimli = true` yazar (`mulk/komut.ts:371`, `:487-489`); sınır `yeniOyuncu.indirimliYapiSayisi` (5). **İptalde bugünkü davranış AYNEN kalır** (dükkân dahil): `insaat_iptal` indirimli inşaatta sayacı geri verir (`mo.indirimliYapi--`, ≤ 0 ise alan silinir; `:625-631`); ödenenin %50'si zaten iade edildiği için hak geri verilir. **Tamamlanmış dükkânın yıkımında sayaç GERİ VERİLMEZ** (hak harcanmıştır; aksi halde kur-yık döngüsüyle indirim tekrar kullanılırdı); `dukkan_yik` bu alana **dokunmaz** |
| Marka | `markalar[]` **oyuncuda kalır** (marka tanımı dükkâna bağlı değil); silinen yalnız `dukkan.marka` bağıdır |
| Sayı sınırı | İlçe (`ilceBasinaEnFazla`) ve il (`enFazlaIlBasina`) sayaçları **türetilmiştir** (düğüm `ekYapilar` + süren inşaat sayımı): yıkımla otomatik düşer; ayrı sayaç yok |
| `ilk_dukkan` damgası | Ödül bir kez verilir (ödül kaydı kalıcı: `alinanOdulDegeri`); **yıkım ödülü geri almaz ve yeniden kurulum tekrar vermez**. `MulkOyuncuDurumu.ilkSatisT` ve `dukkanGeliri` (kümülatif) **kalır** (oyuncu düzeyinde geçmiş) |
| Kare / protokol | Yeni mesaj yok. `GenelBolgeKaresi.dukkanlar` ve `OzelBolgeKaresi.dukkanlar` yapı silinince listeden düşer; hücre karesinin `tur` alanı boşalır. `komut-sema.ts`: `dukkan_yik` zod satırı (K2; aynı kapı); `istemci/src/komut/gizli.ts`: `HARITA_KOMUTLARI`'na `dukkan_yik` (K1; `komut.test.ts` listesi) |
| Serileştirme / göç | Yeni durum alanı **yok** (yapı silinir). `dunyaDogrula`/`dunyaIcerikUyumu` değişmez. Eski görüntü yeni kodla aynı |
| Ret iletileri | DUK-00; **DUK-10** `dukkan bulunamadi: <id>`; **DUK-23** `dukkan henuz tamamlanmadi: insaat_iptal kullanin (<id>)` (§9.3) |
| Testler (`perakende-komut`) | yıkım başarılı: yapı ve `dukkan` alanı yok, hücre `tesis` yok, hücre sahibi aynı; başkasının dükkânı DUK-10 (durum değişmez); inşaattaki kimlik DUK-23 (durum değişmez); para korunumu ve kalem sayaçları aynı (yıkım hareketi 0); yıkımdan sonra `parsel_birak` aynı hücrede başarılı; yıkımdan sonra aynı hücreye yeniden dükkân kurulabilir ve ödül tekrar verilmez; `insaat_iptal` dükkân inşaatını %50 (para + pencere) iade eder ve indirim hakkını geri verir; bölge kipi ve dükkânsız mülk dünyası etkilenmez |

## 8. G8: cam → pencere ve yapı market

### 8.1 Ne eklenir

1. **Veri (T3):** yöntemler `cam_firini` (indeks 28, ev sahibi **`parca_fabrikasi`**) ve `celik_dograma` (indeks 29, `parca_fabrikasi`), `mulkKipi: true` (§3.2, §4.4; **değerler A2 §1.4/§1.13**: cam 60 silis + 16 yakıt + 18 elektrik → 50; doğrama 24 çelik + 32 cam + 5 parça + 15 elektrik → 28); tür listesi `parca_fabrikasi.yontemler = [standart_parca, otomatik_hat, cam_firini, celik_dograma]`; dükkân türü `yapi_market` (`olcekAraligi [0]`, `mallar`: `pencere, celik, cam, parca`); `talep1000Saat` satırları bu mallar için A2 §1.9'da (V4 gereği zorunlu); `kimlik-listesi.json` `yontemler`'e iki kayıt (§3.5).
2. **Dükkân bedeli:** G7'de zaten ithal pencereli (P-İthal; §7.4); G8'de **bedel değişmez**, yalnız pencerenin yerli kaynağı (cam → doğrama) doğar ve ithalat artık gerekmez.
3. **Çekirdek kodu: yok.** Cam/pencere yalnız yöntem; `yapi_market` yalnız tür verisi; yerel kanal G7a'dan gelir; elektrik ve yakıt G6'nın şebekesinden gelir.
4. **Testler/bot:** §16, §15.

### 8.2 Zincir ve enerji

`cam_firini` (18 elektrik, 16 yakıt) ve `celik_dograma` (15 elektrik) **santralsiz çalışır**: elektrik ve yakıt şebekeden gelir (§5.2). Bir tesis bir anda tek yöntemle çalışır: pencere hattı **iki** `parca_fabrikasi` tesisi (biri `cam_firini`, biri `celik_dograma`) tutar. Zincirin tesis dökümü (Alfa-0): silis (ithal ya da kendi `silis_ocagi`, rezervli il), cam fırını, çelik doğrama; çelik ve parça NPC ithalatıyla (ticaret emri); çıktı: pencere ihracatı ve `yapi_market` rafı. Ticaret emri yuvası (temel 4 + Ticaret ofisi): silis, çelik/parça, pencere ihracatı (A2 §1.3-B2 emir yuvası tablosu: yakıt ve elektrik yuva harcamaz). `esZamanliInsaat = 2` ve ilk 5 yapı indirimi zincir kuruluş süresini belirler (A2 §1.8: cam → pencere santralsiz 1,2 sa). Pencere hattı ekmek hattının ≈ %20'si kadar kazandırır (A2 §1.12): vaat zincir marjından değil yapı market perakendesinden ve kamu/yapı talebinden gelir.

### 8.3 Yapı market ve alıcı

`yapi_market` dükkânı pencere, çelik, cam, parçayı **yalnız NPC hane talebine** satar (G7a). **Oyuncu-alıcı (toplu alım) yok** (baş lider kararı 7): oyuncudan oyuncuya fiyat ayarlı satış, alt hesaplar arası para aktarma (aklama) kanalıdır. Fiyat bandı ve esnaf payı diğer türlerle aynıdır. `ilk_dukkan` G7'de zaten tetiklenir.

### 8.4 G8 kabul ölçütü

§17. Özet: yeni iki yöntemle bölge kipi yöntem izdüşümü 12 noktada birebir (yalnız G8 eklemesi + G6 eklemesi birlikte); mülk kipinde santralli ilde silis → cam → pencere zinciri `pencere` üretir, `yapi_market` rafında satılır, `yerelNpc` > 0; bot zinciri (A0-11) tamamlanır; dükkân bedeli pencere içerir ve dükkân inşa testi (ithal pencereyle) geçer.

## 9. Komutlar ve ret iletileri

Çekirdek ret iletileri **küçük harfli ASCII-Türkçe** düz dizgidir (mevcut gelenek: `mulk/komut.ts`; `KomutSonucu = { tamam: false, hata }`, hata kodu alanı yoktur). Aşağıdaki **kod** belge, test ve K1 çeviri tablosu içindir; çekirdek yalnız ileti metnini döndürür. Görünen Türkçe metin (aksanlı, cümle düzeni) K1/T1'in `hata-mulk.ts` düzenli ifade tablosundadır (`istemci/src/harita/hata-mulk.ts:12-52` kalıbı); arayüz metninde büyük harf yok, para `1.234 ₺`.

### 9.1 Yeni komutlar (`tipler.ts` `Komut` birliği, `:638-674`)

```ts
// tipler.ts: MulkKomutu (:966-975) ve Komut içine
| { tur: "dukkan_raf";    dukkan: number; yuva: number; mal: string | null }   // null = yuvayı boşalt
| { tur: "dukkan_fiyat";  dukkan: number; yuva: number; fiyat: number }         // fiyat = kademe indeksi (secim)
| { tur: "marka_tanimla"; marka: number; ad: string; simge: number; renk: number }
| { tur: "dukkan_marka";  dukkan: number; marka: number }
| { tur: "dukkan_yik";    dukkan: number }                                    // tamamlanmış dükkânı yıkar; iade YOK (§7.9)
// Sistem yolu (motor.ts uygula(), sistem_odul kalıbı :182-184):
| { tur: "marka_sifirla"; oyuncu: OyuncuId; marka: number }

// Mevcut komutlara isteğe bağlı alan (tipler.ts:966-975):
| { tur: "tesis_insa_hucre"; ...; olcek?: 0 | 1 | 2; dukkanTuru?: string; yontem?: string }   // yontem: G6 (§5.8)
| { tur: "yapi_yerlestir";   ...; olcek?: 0 | 1 | 2; dukkanTuru?: string; yontem?: string }
```

`dukkan` = `EkYapiDurumu.id` (dünya genelinde benzersiz, `mulk/yapi.ts:54`). Tutar, miktar, oran, adet alanı **yoktur**.

**`komutSemasi.ts` (`:14`, `:17`, `:27-64`):** `AlanTuru`'na `"metin"` eklenir (**`SISTEM_ALAN_TURLERI`'ne EKLENMEZ**: sistem/ajan yolunda serbest metin yasak, docs/12 §10 "oyuncu serbest metni ajana girmez"). Girişler (tip tam olduğu için derleme zorlar):

```ts
dukkan_raf:    { yol: "oyuncu", alanlar: { dukkan: "kimlik", yuva: "secim", mal: "kimlik" } },
dukkan_fiyat:  { yol: "oyuncu", alanlar: { dukkan: "kimlik", yuva: "secim", fiyat: "secim" } },
marka_tanimla: { yol: "oyuncu", alanlar: { marka: "secim", ad: "metin", simge: "secim", renk: "secim" } },
dukkan_marka:  { yol: "oyuncu", alanlar: { dukkan: "kimlik", marka: "secim" } },
dukkan_yik:    { yol: "oyuncu", alanlar: { dukkan: "kimlik" } },
marka_sifirla: { yol: "sistem", alanlar: { oyuncu: "kimlik", marka: "secim" } },
tesis_insa_hucre: { ..., dukkanTuru: "kimlik", yontem: "kimlik" },   // :60 (yontem: G6)
yapi_yerlestir:   { ..., dukkanTuru: "kimlik", yontem: "kimlik" },   // :62
```

`para-guvenligi.test.ts` "miktar/oran/adet açık listesi" **değişmez** (yeni hiçbir alan miktar/oran/adet değil); yeni test: sistem yolundaki tüm komutlar `SISTEM_ALAN_TURLERI` içinde kalır (`marka_sifirla` uyar; `metin` yok).

**`motor.ts`:** `yonlendir` (`:203-249`): `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik` → `mulkKomutu` (`:234-239` listesine), `mulkKomutu` içinde `perakendeKomutu`'na devir (`mulk/komut.ts:497` switch'ine beş `case`); `marka_sifirla` `uygula` içinde `sistem_odul` yanına (`:182-185`): `k.oyuncu === SISTEM_OYUNCUSU ? markaSifirla(d, komut.oyuncu, komut.marka) : hata("marka_sifirla yalnizca 'sistem' ile verilebilir")`; `yonlendir` kapsayıcılık `default: never` kolu (`:244-248`) ve `case "marka_sifirla": return hata("marka_sifirla yonlendirilemez")`.

### 9.2 Doğrulama sırası (hepsi ya da hiçbiri; başarısız komut durumu değiştirmez, docs/06 §14)

**Dükkân kurulumu** (`yapi_yerlestir`, `tesis_insa_hucre`; `tesisTuru === "dukkan"`): mevcut denetimler aynen (ilçe, hücre listesi, kenar-bitişiklik, sahiplik, 72/%25, ayrılmış hücre, ilk-yapı indirimi, `esZamanliInsaat`, hazine/stok) **+** sıra: (1) `perakende` açık (DUK-00); (2) `dukkanTuru` var (DUK-01), `dukkan` dışı tür için verilemez (DUK-02); (3) bilinen tür (DUK-03); (4) `olcek` `acikOlcekler` içinde (DUK-04) ve türün `olcekAraligi`'nda (DUK-05); (5) hücre sayısı `ekYapilar.dukkan.olcekHucre[olcek]` (mevcut ileti DUK-08); (6) ilçe sınırı (DUK-06) ve il sınırı (mevcut DUK-07).

**`dukkan_raf`:** (1) DUK-00; (2) dükkân bul (oyuncunun düğümleri; yoksa DUK-10); (3) `yuva` tamsayı ve `[0, raf.length)` (DUK-12); (4) `mal === null`: yuva boşsa DUK-19a, değilse boşalt; (5) `mal` dize ve `ic.malIndeks`'te (DUK-15); türün mal kümesinde (DUK-13); başka yuvada değil (DUK-14); aynı yuvada aynı mal değil (DUK-19b); (6) dolu yuvada mal **değiştirme** ise hız sınırı (DUK-18); (7) uygula: `mal` yaz, `fiyat = varsayilanFiyatKademesi`, değiştirme ise `fiyatT = d.zaman` (ilk doldurma `fiyatT` yazmaz), boşaltmada `fiyatT` silinir.

**`dukkan_fiyat`:** (1)–(3) aynı; (4) yuva boşsa DUK-17; (5) `fiyat` tamsayı ve `[0, K)` (DUK-16); mevcut kademeyle aynıysa DUK-19c; (6) `fiyat === kampanyaKademesi` ise kampanya kuralları (§7.5b): kapalıysa DUK-20, haftalık gün sınırı DUK-21, günlük saat sınırı DUK-22 (kampanya zaten etkinse atlanır); (7) hız sınırı DUK-18; (8) `fiyat`, `fiyatT = d.zaman`; kampanya başlatıldıysa `DukkanDurumu.kampanya` yazılır.

**`dukkan_yik`:** (1) DUK-00; (2) `dukkan` tamsayı değilse DUK-10; oyuncunun tamamlanmış `dukkan` yapısı bulunamazsa: kimlik oyuncunun süren dükkân inşaatıysa DUK-23, değilse DUK-10; (3) uygula (§7.9 tablosu): yapı ve hücre `tesis` işareti silinir; **para, stok, kasa, marka tanımı değişmez**.

**`marka_tanimla`:** (1) DUK-00; (2) `marka` tamsayı, `0 ≤ marka ≤ markalar.length` (MRK-01) ve `marka < hesapBasinaEnFazla` (MRK-02); (3) `ad` sözdizimi ve kanonik biçim: `adKanonik(ad)` (MRK-03…MRK-08, §7.7); (4) `simge`/`renk` aralık (MRK-09, MRK-10); (5) mevcut markayla (kanonik `ad`, `simge`, `renk`) birebir aynıysa MRK-11; (6) uygula: `marka === length` ise ekle, değilse üzerine yaz.

**`dukkan_marka`:** DUK-00; dükkân (DUK-10); `marka` tamsayı ve `< markalar.length` (MRK-13); zaten bu markadaysa MRK-14; `dukkan.marka = marka`.

**`marka_sifirla`** (yalnız `sistem`): oyuncu mülk kaydı var (mevcut `bilinmeyen oyuncu`), `marka < markalar.length` (MRK-13); `ad = "adsiz marka"`; `simge`, `renk` değişmez; dükkân bağlantıları kalır.

### 9.3 Ret iletileri: kod ve metin

| Kod | Çekirdek iletisi (kesin) | Ne zaman | Görünen metin önerisi (K1/T1 son kararı verir) |
|---|---|---|---|
| DUK-00 | `perakende kapali` | `mulk.perakende` tanımsız | bu dünyada dükkân henüz açık değil |
| DUK-01 | `dukkan turu gerekli (dukkanTuru)` | `tesisTuru: "dukkan"`, `dukkanTuru` yok | dükkân türünü seçmelisin |
| DUK-02 | `dukkanTuru yalniz dukkan yapisinda verilebilir: <tesisTuru>` | başka yapıya `dukkanTuru` | dükkân türü yalnız dükkân kurarken seçilir |
| DUK-03 | `bilinmeyen dukkan turu: <id>` | tür listede yok | bu dükkân türü yok |
| DUK-04 | `dukkan olcegi henuz acik degil: <s\|m\|l>` | `olcek` ∉ `acikOlcekler` | bu dükkân boyu henüz açılmadı |
| DUK-05 | `<tur> dukkani <s\|m\|l> olceginde kurulamaz` | `olcek` ∉ türün `olcekAraligi` | bu dükkân türü bu boyda kurulamaz |
| DUK-06 | `ilcede en cok <n> dukkan (biten + suren)` | ilçe sınırı | bu ilçede en çok `<n>` dükkânın olabilir |
| DUK-07 | `ilde en cok <n> <ad> (biten + suren)` (mevcut, `mulk/komut.ts:336`) | il sınırı | bu ilde en çok `<n>` dükkânın olabilir (K1 mevcut kuralı yeter) |
| DUK-08 | `dukkan <S\|M\|L> olceginde <n> hucre kaplar (verilen <k>)` (mevcut, `:289`) | hücre sayısı ayak izine eşit değil | dükkân `<n>` hücre kaplar |
| DUK-10 | `dukkan bulunamadi: <id>` | dükkân yok ya da oyuncunun değil | bu dükkân yok |
| DUK-12 | `gecersiz yuva: <n> (0..<son>)` | yuva aralık dışı | geçersiz raf yuvası |
| DUK-13 | `bu mal bu dukkan turunde satilamaz: <mal>` | mal türün listesinde yok | bu dükkânda bu mal satılamaz |
| DUK-14 | `bu mal baska yuvada: <mal>` | aynı mal iki yuvada | bu mal zaten başka rafta |
| DUK-15 | `bilinmeyen mal: <mal>` (mevcut, `ekonomi/komut.ts:107`) | mal yok | bilinmeyen mal |
| DUK-16 | `gecersiz fiyat kademesi: <n> (0..<son>)` | kademe aralık dışı | geçersiz fiyat |
| DUK-17 | `bos yuvaya fiyat verilemez` | boş yuvada `dukkan_fiyat` | önce rafa mal koy |
| DUK-18 | `fiyat degisimi icin <n> saat beklenmeli` | hız sınırı (`n` = kalan saat, yukarı yuvarlanır) | fiyatı en erken `<n>` saat sonra değiştirebilirsin |
| DUK-19a | `yuva zaten bos` | boş yuvayı boşaltma | raf zaten boş |
| DUK-19b | `yuva zaten bu malla dolu: <mal>` | aynı mal aynı yuvaya | bu raf zaten bu malla dolu |
| DUK-19c | `fiyat zaten bu kademede` | aynı kademe | fiyat zaten bu seviyede |
| DUK-23 | `dukkan henuz tamamlanmadi: insaat_iptal kullanin (<id>)` | `dukkan_yik`: kimlik oyuncunun süren dükkân inşaatına ait | dükkân henüz bitmedi; inşaatı iptal edebilirsin |
| DUK-20 | `kampanya kademesi acik degil` | kampanya kademesi seçildi ama kampanya kapalı (parametre yok ya da 0) | kampanya fiyatı şu an kullanılamıyor |
| DUK-21 | `kampanya haftalik gun siniri (en cok <n> gun)` | yeni günde haftalık gün sayacı dolu | bu hafta en çok `<n>` gün kampanya yapabilirsin |
| DUK-22 | `kampanya gunluk saat siniri (en cok <n> saat)` | aynı günde saat sayacı dolu | bugün en çok `<n>` saat kampanya yapabilirsin |
| YON-01 | `yontem yalniz tesis turunde verilebilir: <tesisTuru>` | `yontem` ek yapı inşasında verildi (G6; §5.8) | yöntem yalnız tesis kurarken seçilir |
| MRK-01 | `gecersiz marka sirasi: <n>` | `marka` aralık dışı ya da boşluk bırakıyor | geçersiz marka |
| MRK-02 | `hesap basina en cok <n> marka` | üst sınır | en çok `<n>` marka tanımlayabilirsin |
| MRK-03 | `marka adi metin olmali` | `ad` dize değil | marka adı yazılmalı |
| MRK-04 | `marka adi <min> ile <max> karakter arasinda olmali` | uzunluk | marka adı `<min>` ile `<max>` karakter olmalı |
| MRK-05 | `marka adinda gecersiz karakter` | izinli küme dışı | marka adında yalnız harf, rakam, boşluk, nokta, kesme işareti, tire ve & kullanılabilir |
| MRK-06 | `marka adi bastan ya da sondan bosluk icermemeli` | baş/son boşluk | marka adı boşlukla başlayıp bitemez |
| MRK-07 | `marka adinda art arda bosluk olamaz` | `"  "` | art arda boşluk olamaz |
| MRK-08 | `marka adi en az bir harf icermeli` | yalnız rakam/noktalama | marka adında en az bir harf olmalı |
| MRK-09 | `gecersiz marka simgesi: <n> (0..<son>)` | simge aralık dışı | geçersiz simge |
| MRK-10 | `gecersiz marka rengi: <n> (0..<son>)` | renk aralık dışı | geçersiz renk |
| MRK-11 | `marka zaten bu degerlerde` | değişiklik yok | marka zaten böyle |
| MRK-12 | `marka adi kullanilamaz` | **sunucu** süzgeci (yasak liste); çekirdek üretmez | bu ad kullanılamaz |
| MRK-13 | `bilinmeyen marka: <n>` | tanımsız marka | önce marka tanımlamalısın |
| MRK-14 | `dukkan zaten bu markada` | aynı marka | dükkân zaten bu markada |
| SIS-01 | `marka_sifirla yalnizca 'sistem' ile verilebilir` | oyuncu yolundan | (istemciye gösterilmez) |

Mevcut kodun yeni durumlarda da döndüreceği iletiler (K1 çevirisi var): `bilinmeyen yontem: <id>`, `yontem bu tesis turunde yok: <id>`, `yontem acik degil: <id>` (G6 `yontem` alanı; `ekonomi/komut.ts:84-86`), `yetersiz stok: <düğüm> (mal indeksi <n>)`, `yetersiz hazine (gereken <n>)`, `hucre ...`, `ayni anda en cok <n> insaat`, `ilde isletme yok: <il>`. **K1 notu:** `yetersiz stok` çevirisi bugün "çelik ya da makine parçası" der (`hata-mulk.ts:33`); **G7'de dükkân bedeli pencere içerir (P-İthal, §7.4)**: ileti mal adını söylemeli (çekirdek iletisi mal **indeksi** verir; `ad` çevirisi K1'de dizinden).

---

## 10. Protokol alanları (yalnız ekleme)

`PROTOKOL_SURUMU` (`mesajlar.ts:~28`) **değişmez**; tüm yeni alanlar isteğe bağlıdır, eski istemci yok sayar, eski sunucu göndermez. K3'ün tür eklemesi ile K2'nin zod satırları **aynı kapıda** birleşmelidir (B5): `komut-sema.ts:80-82` `_KomutDenetimi` ve `Esit` kontrolü K3 tek başına landed olursa `@bolge/protokol` derlenmez.

### 10.1 `packages/protokol/src/komut-sema.ts` (K2)

`discriminatedUnion` (`:24-77`) içine ve mevcut iki komuta:

```ts
z.object({ tur: z.literal("dukkan_raf"), dukkan: tamsayi, yuva: tamsayi, mal: z.union([kimlik, z.null()]) }),
z.object({ tur: z.literal("dukkan_fiyat"), dukkan: tamsayi, yuva: tamsayi, fiyat: tamsayi }),
z.object({ tur: z.literal("marka_tanimla"), marka: tamsayi, ad: z.string().min(2).max(24), simge: tamsayi, renk: tamsayi }),
z.object({ tur: z.literal("dukkan_marka"), dukkan: tamsayi, marka: tamsayi }),
z.object({ tur: z.literal("dukkan_yik"), dukkan: tamsayi }),
z.object({ tur: z.literal("marka_sifirla"), oyuncu: kimlik, marka: tamsayi }),   // yalnız yönetici kimliği (sunucu "sistem" damgalar)
// :62-71 tesis_insa_hucre ve yapi_yerlestir: dukkanTuru: kimlik.optional(), yontem: kimlik.optional()   // yontem: G6 (§5.8); protokolde yalnız ekleme, nesne alanı; geriye uyum testi (§16.1)
```

Protokol yalnız **biçim** denetler (docs: `komut-sema.ts` başlığı); sözdizimi kuralları çekirdektedir. `ad` üst sınırı bayt değil kod birimi (BMP).

### 10.2 `packages/protokol/src/kare.ts` (K2; hepsi isteğe bağlı)

| Alan | Kime | Biçim | Not |
|---|---|---|---|
| `GenelBolgeKaresi.dukkanlar?` (`:~67`) | herkese | `Array<[id: number, tur: string, olcek: 0\|1\|2, markaAd: string, simge: number, renk: number]>` | tabela için; markasızsa `markaAd = ""`, simge/renk 0. Hücrenin `tur` alanı (`HucreKaresi`) zaten `"dukkan"` der |
| `OzelBolgeKaresi.dukkanlar?` (`:~81`) | yalnız sahibine | `Array<[id: number, raf: Array<[mal: string, fiyat: number, etkin: number, mevcut: 0 \| 1, istekMiliSaat: Mili, fiyatT: Ms]>, kasaPpm: number, kampanya: [bitis: Ms, kalanSaat: number, kalanGun: number], karsilanmaPpm: number]>` | raf yuva sırasıyla; boş yuva `mal = ""`; `fiyat` saklanan kademe, `etkin` = `etkinKademe` (§7.5b); **`mevcut`** = §6.4 Adım 1 (stoksuz yuva çekime girmez: panelin "neden satmıyor" yanıtı); **`fiyatT`** = yuvanın son fiyat/mal değişim zamanı (`Ms`; yuva durumundaki `fiyatT`, §7.1; yuva hiç değiştirilmemişse `fiyatT` tanımsızdır ve demette `0` gönderilir: hız sınırı yok), **DUK-18 geri sayımı istemcide bu alandan hesaplanır** (`fiyatDegisimEnAzSaat` veri paketinden okunur: ek mesaj yok); **raf demeti `fiyatT` ile İLK tanımda tamamdır: G7 tanımından sonra bu demete öğe eklenmez; yeni veri nesne alanı olarak gelir** (protokolde yalnız ekleme ilkesinin demet biçimi için sonucu: demetin uzunluğu ve sırası kalıcıdır); `istekMiliSaat` = yuvanın kasa kırpmalı isteği; **`kasaPpm`** = `Σ istek / kasaMiliSaat` (ppm, ≤ PPM: kasa doluluğu); **`kampanya`**: `bitis` (0 = yok), `kalanSaat` = `kampanyaGunlukEnFazlaSaat − (bugünse saat, değilse 0)`, `kalanGun` = `kampanyaHaftalikEnFazlaGun − (bu haftaysa gunSayisi, değilse 0)` (kampanya kapalıysa `[0, 0, 0]`; **tutar alanı yok**); **`karsilanmaPpm`** = `BolgeDurumu.yerelKarsilanmaPpm ?? PPM` (stok isteği karşılamıyorsa < PPM). Gerçekleşen satış geliri sahibin `ParaAkisi.yerel` oranından (saatlik toplam, mevcut paraAkisi görünümü) okunur: dükkân başına gerçekleşen satış durumda **tutulmaz** |
| `OzelBolgeKaresi.sebeke?` (G6; isteğe bağlı, G9 faturası için) | yalnız sahibine | `Array<[mal: string, miliSaat: Mili]>` | şebekeden son çözümde alınan miktar (`b.elektrik.sebekeMili`, `b.sebekeTuketim`); fiyat veri paketinden (`param.mulk.sebeke`); yalnız `> 0` iken |
| `OyuncuKaresi.markalar?` (`:~128`) | yalnız kendisine | `Array<[ad: string, simge: number, renk: number]>` | |
| `IlgiKaresi.fiyat` | herkese (mevcut) | mal indeksine göre R (`d.pazar.fiyat`) | dükkân panelinin "R" ve kademe fiyatı hesabı için zaten var |

İstemci dükkân panelinin (G9) ihtiyacı: kademe tablosu, tür/mal listeleri, ölçek tabloları **veri paketinden** (`param.mulk.perakende`) okunur: ek mesaj yok. İlçe talebi (`Q`) ve esnaf payı gösterimi G9'da `IlceKaresi.talep?` ile istenirse K2 sonra ekler (G7 kabulünü bağlamaz).

### 10.3 Sunucu (K2)

| Konu | Dosya | Değişiklik |
|---|---|---|
| `ilk_dukkan` dedektörü | `sunucu/src/odul/dedektor.ts:14,27-29,158-175` | §7.8 |
| Ad süzgeci (marka ve görünen ad; günlüğe yazmadan önce) | `sunucu/src/yazar.ts` komut kabul yolu (**doğrulanmadı: tam konum**) + yeni `ad-suzgec.ts` | `marka_tanimla.ad` ve profil ucundaki görünen ad **aynı** süzgeçten geçer: katlanıp `yasakli-adlar.json` ile karşılaştırılır; ret `marka adi kullanilamaz` (marka) / profil ucu iletisi (görünen ad); sözdizimi ve kanonik küçük harf biçimi `adKanonik` (`@bolge/cekirdek`; profilde kanonik biçim saklanır, süzgeç kanonik adı karşılaştırır); süzgeç dosyası sıcak güncellenebilir (kural sürümü değişmez) |
| Görünen ad değişim sınırı | `sunucu/src/` profil ucu (**doğrulanmadı: tam konum**) | günlük sınır, gün sınırı 00:00 TRT; otomatik addan ilk seçime geçiş sayılmaz (K2 kararı; §7.7) |
| "Sen yokken" net sonucu: satış kalemi | `sunucu/src/donus/anlik.ts:27-29`, `donus/ozet.ts:76`, `donus/izleyici.ts:95-104` | anlık görüntüye `dukkanGeliri` (çekirdek `dukkanGeliri(d, oyuncu, t)`); `satis = ihracat farkı + dukkan geliri farkı`; `satis + gider + diger = hazineFarki` birebirliği korunur. Yeni şablon gerekmez (`donus.bitti.insaat` ek yapı kimliği `dukkan`'ı zaten taşır, `donus.ts` `DONUS_SABLON`) |
| Para arzı panosu satırları | `sunucu/src/metrik.ts` (**doğrulanmadı**: pano bugün yok, `mulk.para` sayaçları var) | §12.3 |
| Kural sürümü göçü | `sunucu/src/yazar.ts:363,385,1318` | her G6/G7/G8 veri değişimi `kuralSurumu`'nu değiştirir; dönem sınırında `gocIzni` (docs/06 §14.2 sunucu notu) |

### 10.4 İstemci (K1/T1; G9 öncesi kancalar)

`istemci/src/komut/gizli.ts:11,19`: `marka_sifirla` → `GIZLI_KOMUTLAR`; `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik` → `HARITA_KOMUTLARI` (dükkân paneli haritadan/İşletmem'den gönderir; G9). `istemci/test/komut.test.ts:92-117` `toEqual` listeleri güncellenir. `harita/hata-mulk.ts`: §9.3 çevirileri. `harita/baglanti.ts:376`: `ilk_dukkan` `etkin`. Dükkân paneli ve giriş ekranı G9.

**Marka adı girişi (A1 G9 notu; baş lider kararı):** istemci iOS/Android akıllı tırnağını (`’` U+2019, `‘` U+2018) gönderimden önce `'` (U+0027) işaretine **çevirir** ve baştaki/sondaki boşluğu kırpar; çift akıllı tırnak (`“ ”`) çevrilmez (kümede yok: ret). **Sunucu ve çekirdek yalnız izinli karakterleri kabul etmeye devam eder; çekirdek izinli kümesi DEĞİŞMEZ** (§7.7). K1/T1: giriş alanı bu çeviriyi yapar ve ret iletisini gösterir (MRK-05).

---

## 11. Serileştirme ve göç

### 11.1 Yeni durum alanları

| Alan | Konum | Ne zaman yazılır | Doğrulayıcı (`serilestir.ts`) |
|---|---|---|---|
| `EkYapiDurumu.dukkan?` | `tipler.ts:303` | `ekYapiTamamla` (`tur === "dukkan"`) | `dunyaDogrula` ekYapılar bloğu (`:327-336`) bugün yalnız `{id, tur, hucreler}` doğruluyor, `alanlar()` ek alana izin veriyor → **açık doğrulayıcı şart**: `tur: dize`, `olcek ∈ {0,1,2}`, `marka` tamsayı ≥ 0, `raf` dizi, her yuva `{mal?: dize, fiyat: tamsayı ≥ 0, fiyatT?: tamsayı ≥ 0}`; ek yapı kimliği `dukkan` olmayanda `dukkan` alanı **yasak** |
| `InsaatDurumu.dukkanTuru?` | `tipler.ts:476-503` | dükkân inşaatı sürerken | `$.insaatlar[i]` (`:392`) `dize` |
| `MulkOyuncuDurumu.markalar?` | `tipler.ts:773-797` | ilk `marka_tanimla` | `mulkDogrula` oyuncular (`:557-585`): ≤ 3 eleman, `ad` = `markaAdiHatasi` sonucu null, `simge`/`renk` ≥ 0 |
| `MulkOyuncuDurumu.dukkanGeliri?` | aynı | ilk dükkân gelirinde | `sayacDogrula` (`:470-476`) |
| `MulkOyuncuDurumu.ilkSatisT?` | aynı | yerel satış oranı ilk kez > 0 olduğunda (`paraAkisiYaz`) | tamsayı ≥ 0 |
| `DukkanDurumu.baslangic`, `.kurulus`, `.kampanya?` | `EkYapiDurumu.dukkan` içinde | `ekYapiTamamla` (`baslangic` = `InsaatDurumu.baslangic`, `kurulus` = `d.zaman`); `kampanya` ilk kampanyada | `baslangic`, `kurulus` tamsayı ≥ 0 ve `baslangic ≤ kurulus`; `kampanya`: `hafta, gunSayisi, gun, saat, bitis` tamsayı ≥ 0, `gunSayisi ≤ kampanyaHaftalikEnFazlaGun`, `saat ≤ kampanyaGunlukEnFazlaSaat` (parametre yoksa alan **yasak**) |
| `BolgeDurumu.yerelKarsilanmaPpm?` | `tipler.ts:238` | dükkân isteği olan düğümde ve `< PPM` iken | `0 ≤ değer < PPM`; düğüm işletme düğümü olmalı |
| `ParaAkisi.yerel?` (G7) | `tipler.ts:884-896` | `yerel > 0` iken | `paraAkisi` alanları (`:568-584`): `alanlar(...)` zorunlu listesine **eklenmez**, isteğe bağlı: tamsayı ≥ 0 |
| `ParaDurumu.musluk.yerelNpc?` | `tipler.ts:854-860` | ilk yerel gelirde (tembel; G7) | `paraDogrula` (`:478-505`): izinli anahtarlar = `MUSLUK_KALEMLERI` ∪ `MUSLUK_ISTEGE_BAGLI = ["yerelNpc"]`; **zorunlu** liste değişmez; varsa `sayacDogrula` |
| `ParaDurumu.lavabo.sebeke?` | `tipler.ts:854-860` | ilk şebeke bedeli birikiminde (tembel; G6) | `paraDogrula`: izinli lavabo anahtarları = `LAVABO_KALEMLERI` ∪ `LAVABO_ISTEGE_BAGLI = ["sebeke"]`; zorunlu liste değişmez |
| `KasaDurumu.giris.sebeke?` | `tipler.ts:863-865` | ilk kasa payı birikiminde (tembel; G6) | `paraDogrula` (`serilestir.ts:493-494`): izinli = `KASA_GIRIS_KALEMLERI` ∪ `KASA_GIRIS_ISTEGE_BAGLI = ["sebeke"]`; zorunlu `sayacDogrula` döngüsü yalnız zorunlu kalemleri dolaşır, `sebeke` varsa ayrıca |
| `ParaAkisi.sebeke?` | `tipler.ts:884-896` | `sebeke > 0` iken (G6) | `paraAkisi` (`serilestir.ts:570-572`): `alanlar(pa, …, [... , "sebeke"])` izinli listesine **isteğe bağlı** eklenir; `tamsayi ≥ 0`; `paraAkisi.kasa[].kalem` kontrolü (`:581`) `KASA_GIRIS_ISTEGE_BAGLI`'yı da kabul eder |
| `BolgeElektrikDurumu.sebekeMili?` | `tipler.ts:222-237` | `sebekeMili > 0` iken (G6) | `serilestir.ts` bu nesneyi doğrulamıyor (doğrulandı: arama); K3 `tamsayi ≥ 0` denetimi ekler |
| `InsaatDurumu.yontem?` | `tipler.ts:476-503` | `yontem` verilen tesis inşaatında (G6) | `$.insaatlar[i]` (`:392`): `dize`; `dunyaIcerikUyumu`: yöntem içerikte ve türün listesinde; **ek kural (K3 G6-2a, `serilestir.ts:717`):** `yontem` yalnız `tur === "tesis"` ve `ekYapi === undefined` inşaatında olabilir (bozuk görüntü reddi) |

`Dunya` üst düzeyine alan **eklenmez** (`DUNYA_ISTEGE_BAGLI`, `serilestir.ts:244`, değişmez). `paraDurumuKur` (`paraSayac.ts:54-60`) **yeni kalemi yaratmaz** (yoksa tüm mülk dünyalarının özeti değişirdi; K3 keşif tuzağı).

**Lazy yaratma kuralı (şebeke, yerelNpc, kasa kalemleri ortak):** `paraDurumuKur` (`paraSayac.ts:54-60`) ve `kasaAl` (`mulk/kasa.ts:47`) yeni kalemi **yaratmaz**; kalem yalnız ilk birikimde `??= sayacSifir()` ile doğar (aksi halde her mülk dünyasının özeti ve `fikstur-goc/mulk-v1.json` yüklemesi değişirdi). Korunum testinin toplayıcıları (`para-guvenligi.test.ts:98-100`, `:215-216`) ve `kasaToplam` (`kasa.ts:56`) isteğe bağlı kalemleri de toplar.

### 11.2 İçerik uyumu (`dunyaIcerikUyumu`, `serilestir.ts:681-`)

Eklenenler: (a) `perakende` tanımsızken herhangi bir `DukkanDurumu` varsa hata; (b) `DukkanDurumu.tur` ∈ `perakende.dukkanTurleri`; (c) her yuvanın `mal` kimliği `ic.malIndeks`'te ve türün mal kümesinde (**yeni içerik eski dükkânın malını kaldırırsa** hata değil uyarı değildir: yalnız-ekle ilkesi mal/tür çıkarmayı yasaklar); (d) `fiyat < fiyatKademeleriPpm.length`; (e) `raf.length === olcekler[olcek].rafYuvasi`; (f) `marka < markalar.length`.

### 11.3 Göç ve eski görüntü

- **Yöntem ekleme yalnız-ekle:** `anlikGoruntuUyarla` (`goc.ts`), `gocIzni + yalnizEkleZorunlu` ile ihlalsiz; `eklenen.yontemler` G6'da 4, G8'de +2 (G6+G8 birlikte 6); `Dunya`'da yöntem indeksli dizi yoktur (`tesis.yontem` indeks) → **`durumOzeti` değişmez, `kuralSurumu` değişir** (K3 keşif §1). `icerik-kimlik-kilidi.json` sona ekleme olduğundan güncellenmez.
- **`fikstur-goc/mulk-v1.json` yüklenmeye devam eder:** yeni alanların hepsi isteğe bağlı ve yalnız kullanılınca yazılır; `paraDogrula` zorunlu listesi değişmez. Test §16.
- **Göçsüz eski dünya (G6/G7 öncesi dünya yeni kodla):** `mulk.perakende` yok = dükkân kapalı; eski dünya olduğu gibi çalışır.
- **Yeni görüntü eski kodla:** yüklenemez (bilinmeyen alan/komut); geriye dönüş yok; kural dönemi geçişi yapılmadan sürüm geri alınmaz.
- **Komut günlüğü:** yeni komut türleri günlükte dize kimlikli; eski günlük yeni çekirdekle aynı sonucu verir (yeni komut içermez). **Dikkat:** marka adı günlükte açık metin (girilen biçimiyle) kalır, durumda kanonik küçük harf (§7.7 KVKK, S-12).
- **Dönem sınırı:** G6, G7 ve G8 verisi her biri `kuralSurumu`'nu değiştirir. Alfa-0 açılmadığından canlı dünya yoktur; yine de her dilimin kabulünde `anlikGoruntudenYukle(..., { gocIzni: true, yalnizEkleZorunlu: true })` provası yapılır (§16).
- **Boyut:** dükkân başına ≈ 0,3 KB (4 yuva), marka ≈ 0,06 KB; 1.000 oyuncu × 2 dükkân ≈ 0,6 MB ham görüntü (docs/06 §14 ölçekleriyle uyumlu; **doğrulanmadı**: ölçülmedi, K3 ölçer).

---

## 12. Para korunumu ve para arzı panosu

### 12.1 Defter

Korunum (docs/06 §15.7 madde 3) aynen geçerli ve **isteğe bağlı kalemi de kapsar:**

```
Σ oyuncu hazinesi + Σ kasa bakiyesi + Σ lavabo = Σ musluk        (SAAT ile ölçeklenmiş tamsayıda, her an)
musluk = hibe + odul + iade + ihracatNpc + nufusGeliri + borcSilme + diger + (yerelNpc varsa)
lavabo = arsa + harcama + arastirma + ithalatNpc + isletme + araziVergisi + kamuNpc + (sebeke varsa)
kasa girişi = vergi + ithalatMakas + ithalatKomisyon + (sebeke varsa)
```

**`yerelNpc` isteğe bağlı kalemi** (baş lider kararı 5):

- `tipler.ts:842-843` `MuslukKalemi`/`MUSLUK_KALEMLERI` **değişmez**; yeni `export const MUSLUK_ISTEGE_BAGLI: readonly ("yerelNpc")[] = ["yerelNpc"]` ve `ParaDurumu.musluk: Record<MuslukKalemi, ParaSayaci> & { yerelNpc?: ParaSayaci }` (`:854-860`).
- `paraMuhasebesi` (`mulk/kasa.ts:94-125`), `ihracatNpc` satırının (`:106`) yanına: `if (a.yerel !== undefined && a.yerel > 0) { const ys = (para.musluk.yerelNpc ??= sayacSifir()); sayacOranEkle(ys, a.yerel, dt); sayacOranEkle((mo.dukkanGeliri ??= sayacSifir()), a.yerel, dt); }` (aynı `dt`, aynı oran → iki sayaç eşit artar).
- `paraAkisiYaz` (`:133-159`): `akis.yerel` > 0 ise `paraAkisi.yerel` yazılır, 0 ise **alan silinir** (kanonik özet için; "aynı oranlar" yerinde güncelleme dalı `yerel`i de karşılaştırır, `:140-152`). İlk kayıt koşulu (`:137`) `yerel === 0` şartını da içerir.
- `paraKaydet` (`paraSayac.ts:80-90`) değişmez (komutla gelen para değil).

**Şebeke kalemleri (G6; ayrıntı §5.2.5):** oyuncunun hazinesinden **düşen** şebeke bedeli iki satıra bölünür: `lavabo.sebeke` (yanan) ve `kasa.giris.sebeke` (ilçe kamu kasası; kamu siparişini besler). **Yeni musluk yoktur** (para basılmaz). Korunum: her saatlik `bedel` için `hazine −bedel`, `lavabo + kasa girişi +bedel` (aynı oran, aynı `dt`, kayıpsız sayaç `{n, a}`): toplam değişmez. `paraMuhasebesi`'nde `ithKasa`'ya **karışmaması** için `sebeke` kolu ayrıdır (§5.2.5; unutulursa `lavabo.ithalatNpc` yanlış hesaplanır). Test (§16 `sebeke-elektrik`): 3 tohum × tohumlu rastgele koşu (şebekeli; santralli/santralsiz oyuncular, parsel/yapı/ithalat/ihracat), her kontrol noktasında tam eşitlik; `Σ lavabo.sebeke + Σ kasa.giris.sebeke == Σ_oyuncu ∫ bedel dt` (SAAT ölçekli); kasa payı 0 ve kasa payı > 0 iki veri kopyası.

### 12.2 Para kaynağı ve para arzı

- **Kaynak:** NPC hane talebi (dış NPC parası); **yeni para musluğudur.** İhracat gibi yeni para basar, ama kayıtlı kalemde ayrıdır.
- **Üst sınır (hane bütçesi invariantı):** ilçe başına, mal başına, saatlik oyuncu geliri `≤ Q × R × k_max × (1 − esnaf.tabanPayPpm/PPM)` (`k_max` = en yüksek **kademe** çarpanı = 1,15; A2 §1.9: üst sınır 1,15 R); toplamı (dikey §5.9 hane bütçesi `B = Σ Q·R·1,12`) `B`'yi aşamaz **mekanik olarak** (1,15 × 0,75 = 0,8625 < 1,12; esnaf tabanı %25). A2 §1.10: oyuncuya akabilecek tavan `B × (1 − %25)`; ilçe başına haftalık `yerelNpc` kırsal 0,18 M ₺ … şehir 2,91 M ₺; Alfa-0 ölçeğinde (200 oyuncu, 45 ilçe) 92,9 M ₺/hafta, bunun yalnız primi (14,1 M ₺/hafta) **ek** paradır. Test §16.2 `perakende-para`: yerel gelir ≤ `Σ Q × R × 1,15 × (1 − taban)`; fiyat bandı genişletilirse (kademe > 1,15) bu satır `k_max`'a göre güncellenir.
- **Dağıtım sorusu (A2):** global NPC emilim ölçeği oyuncu sayısıyla büyüyor (`npcLikiditeOlcekPpm`, `pazar/tablo.ts:75-79`); yerel Q sabit. B5 "çift sayım" düzeltmesi (canlı §3.7) G7'de **yok**; ZP8 (`perakende NPC geliri / toplam NPC faucet ≤ %50`; A2 §1.10: %45,3) izlenir; aşılırsa ayrı bir kalibrasyon sürümü (A2 §4 soru 4). **Şebeke lavabosu (A2 §1.10):** 200 P4 oyuncusunda elektrik ≈ 10,0 M ₺/hafta + yakıt ≈ 69,6 M ₺/hafta kamuya gider (yakıt eskiden `ithalatNpc` lavabosundaydı); kasa payı %12.

### 12.3 Para arzı panosu satırları (K2 pano oluşturduğunda)

| Satır | Kaynak | Tür |
|---|---|---|
| Yerel pazar (dükkân) geliri | `mulk.para.musluk.yerelNpc` (yoksa 0) | musluk (yeni para) |
| Dükkân işletme gideri | lavabo `isletme` içinde; ayrı satır için `ParaAkisi` değil, `yerelPazarGorunumu` `giderMiliSaat` toplamı | lavabo |
| Şebeke ödemesi (elektrik + yakıt) | `mulk.para.lavabo.sebeke` (yanan) ve `kasalar[].giris.sebeke` (ilçe kasası) | lavabo ve kasa girişi |
| Şebeke kasa payı oranı | `Σ kasa.giris.sebeke / (Σ kasa.giris.sebeke + Σ lavabo.sebeke)` (beklenen ≈ `kasaPayiPpm`) | izleme |
| NPC ihracat geliri, nüfus geliri, hibe, ödül | mevcut musluk kalemleri | musluk |
| Dükkân gelirinin ihracata oranı | `yerelNpc / (yerelNpc + ihracatNpc)` | ZP8 göstergesi |

### 12.4 Değişmezler ve testler (§16 `perakende-para`)

I1 korunum (şebeke kalemleri dahil; §12.1): 3 tohum × tohumlu rastgele koşu (parsel al/bırak, yapı, dükkân kur/raf/fiyat/marka, ithalat/ihracat, ödül, araştırma), her kontrol noktasında tam eşitlik (`para-guvenligi.test.ts:82-100` yardımcısı `yerelNpc`'yi toplar). I2 `Σ oyuncu dukkanGeliri == musluk.yerelNpc` (SAAT ölçekli). I3 hane bütçesi üst sınırı. I4 kasa girişleri yerel satıştan **etkilenmez** (`kasalar[].giris` aynı). I5 `d.pazar.fiyat`, `oyuncuArzi`, `oyuncuTalebi` yerel satışla **değişmez**. I6 nötrlük: sık/seyrek `paraUzlastir` kontrol noktası aynı sayaç.

### 12.5 Tutar taşımayan komut ilkesi

Dükkân komutlarının alanları: `dukkan` (kimlik), `yuva` (`secim`), `mal` (kimlik), `fiyat` (**`secim`: kademe indeksi**), `marka`, `simge`, `renk` (`secim`), `ad` (`metin`). Hiçbiri para/miktar/oran/adet değildir; sistem yolunda (`marka_sifirla`) yalnız `kimlik` ve `secim`. Fiyat tutarı çekirdekte **türetilir** (`R × kademe`), komutta ve durumda yoktur. Ajan yolu dükkân komutu taşıyamaz (sistem yolu `metin`/oyuncu komutu içermez).

### 12.6 Arbitraj analizi

NPC'den ithal edip rafa koymak **meşru ticaret yönüdür** (G12; ZP11 izler). Sınırlar: (1) ithalatın nakit çarpanı ≥ 1,035 R (en iyi durum: anlaşma + 2 Ticaret ofisi; `mulk/kamuFiyat.ts`), dükkân satış tavanı **1,15 R (en yüksek kademe)**: birim marj ≤ 0,115 R (A2: ithalat nakit çarpanı 1,100–1,111 R, yani kademe 1,15 R ile marj ≈ 0,04 R); **şebeke** (taban × 1,035) ve NPC ithalatı birbirinden bağımsızdır (§5.2.2b); (2) satış hacmi `Q × (1 − esnafPay)` ile ve kasayla sınırlı; esnaf payı alt sınırı %25 `[A2]`; (3) stok **kaynağa göre ayrılmaz** (tembel stok; ithal/yerli ayrımı yok), bu yüzden "ithal rafa fiyat tavanı" (dikey §5.6) uygulanamaz; ZP11 alarmında çare yalnız bandın üst sınırını daraltmaktır (parametre); (4) kamu fiyat tavanı ve sipariş kancaları etkilenmez; (5) "S kur + yükselt = doğrudan" eşitliği G7'de dükkân için yoktur (`dukkan_yukselt` Alfa-1); doğrudan M/L bedeli tablo çarpanıdır ve test: `bedel(M) = bedel(S) × 2,5` tesis ölçek tablosuyla birebir (§16). **Risksiz sınırsız arbitraj yok** testi: ithalat → dükkân zincirinin saatlik net marjı `≤ (1,15 − 1,035) × R × hacim üst sınırı`.

---

## 13. Bölge kipi altınlarına etkisizlik kanıt planı

### 13.1 Üç ayrı kanıt (hepsi kapıda koşar)

**İlke (Kod lideri kararı; G6-4 bulgusu): her kanıtın yanında, kanıtın farkı yakalayabildiğini gösteren negatif bir kontrol bulunur.** Yalnız "eşit çıktı" gösteren bir kanıt, süzgeç/şebeke/kilma hiç yokken de geçebilir (G6-4'te doğrulandı: yöntem izdüşümü koşusu mini-6'da 4 bot + bulanık komutla süzgeç YOKKEN de 12 noktada eşit çıktı; botlar ve bulanık komut yeni yöntemi seçmiyor). Negatif kontroller (K-1…K-5):

| Kanıt | Negatif kontrol (kanıtın duyarlılığı) |
|---|---|
| K-1 | **(a)** sabit bir `yontem_degistir` (yeni yönteme) enjekte edilen aynı koşu: süzgeçli içerik P4 öncesiyle 12 noktada AYNI, bayraksız içerik FARKLI; **(b)** karşıt testler: bayraksız yöntem tür listesinde, `yontemAdaylari`nda görünür ve `yontem_degistir` ile seçilip dünyayı değiştirir; bayraklısı üçünde de görünmez/reddedilir. **(a) ve (b) olmadan K-1 kabul edilmez.** |
| K-2 | `git diff --exit-code` denetiminin kendisi: dondurulmuş bir altın dosyasının geçici kopyasında bir bayt değiştirilince denetim KIRMIZI olur (O1 kapı betiği testi) |
| K-3 | şebeke bloğu eklenince mülk kipi özeti BİLEREK değişir (santralsiz elektrik girdili tesis verim 0 → > 0): K-3 koşusunun farkı yakalayabildiği; K-3(a) şebekesiz koşar |
| K-4 | aynı santralsiz tesis mülk kipinde (şebeke açık) verim kazanır, bölge kipinde 0 kalır: şebeke yolu mülk kipinde gözlenebilir, bölge kipinde gerçekten okunmaz |
| K-5 | mülk kipinde `ciktiPpm = 750 000` çıktıyı ×0,75 yapar (birim test): kilma yolu etkili; bölge kipinde ve `1 000 000`'da özet eşitliğinin anlamı budur |


**K-1: yöntem izdüşümü (bölge kipi).** P3 mal izdüşümü kalıbı (`mal-izdusumu-kanit.test.ts`, `esik-budama-kanit.ts` `kanitKaydi`/`esitNoktalar`): iki içerik, aynı koşu.

- `p4Oncesi(veri)`: güncel veriden tüm `mulkKipi` yöntemleri `icerik.yontemler`'den, ilgili tür listelerinden, `param.mulk.perakende` ve `ekYapilar.dukkan`'dan çıkarılır (başka hiçbir değişiklik yapılmaz); `kimlikListesi` eklenmez (dondurulmuş eski paket).
- Senaryo: mevcut 4 bot + bulanık komut, mini-6, tohum 3, 6 gün, `esitNoktalar(son, 12)` (en az `senaryolar` P3'tekiyle aynı; ek olarak sentetik-50 4 gün).
- Beklenen: 12 kontrol noktasında **tam `durumOzeti`**, etkin kuyruk (`sira` sıralı), işlenen etkin olay dizisinin zincir özeti ve `sayac.olay` **birebir aynı**. (P3'ten farkı: yöntem uzayı durumda indeks dizisi olarak yer almadığından izdüşüm gerekmez, **tam özet** eşit olmalıdır; eşit çıkmazsa süzgeç hatalıdır.)
- Ek: `p4Oncesi` ve güncel içerik `kuralSurumu` **farklı** (`kuralSurumuHesapla`), kimlik tablosu güncel için `yontemler` 28 elemanlı (24 + G6'nın 4'ü; G8 sonrası 30; doğrulandı: `icerik.json` bugün 24 yöntem).
- **Süzgeç yokken** sınamak (karşıt kanıt): `mulkKipi` bayrağı olmayan sahte bir yöntem bölge kipinde botlarca seçilebiliyorsa `botlar/src/planlayici.ts` `yontemAdaylari`'nda görünmeli (K3 keşif §1; test bayrağın gerçekten etkili olduğunu gösterir).

**K-2: dondurulmuş altınlar değişmez.** `git diff` bu dosyalarda **boş** olmalı: `cekirdek/test/fikstur-b1/**`, `fikstur-b2/**`, `fikstur-kanit/**` (`esik-budama-referans.json` dahil), `fikstur-goc/{bolge,mulk}-v1*.json`, `fikstur-goc/icerik-kimlik-kilidi.json`, `sanayi-regresyon`, `pazar-regresyon`, `botlar/test/pazar-regresyon` altın sabitleri. Bu testler **değişiklik yapılmadan** geçer.

**K-3: mülk kipi, kullanılmayan özellik.** (a) `perakende` bloğu, `dukkan` ek yapısı ve **`yontemGecersizKilma` (`ciktiPpm: 1 000 000`, kapalı)** veride **var** ama hiç dükkân kurulmamış, yeni yöntem kullanılmamış ve **`mulk.sebeke` bloğu YOK** mülk senaryosu (mevcut `mulk-serilestir` tohumlu koşusu) 12 noktada **blok yokken** ile aynı `durumOzeti`; (b) aynı senaryo `p4Oncesi` ile aynı. **Şebeke** açıldığında (blok var) mülk dünyası **bilerek değişir** (santralsiz tesis verim kazanır); bu yüzden (a) şebekesiz koşar, şebekeli koşunun doğruluğu `sebeke-elektrik.test.ts`'tedir. Bu, `yerelPazarHesapla`'nın `null` yolu ve katman 4a'nın `d4a = 0` aritmetiğinin mülk kipinde de no-op olduğunu kanıtlar.

**K-4: şebeke etkisizlik kanıtı (bölge kipi).** `mulk.sebeke` bölge kipinde okunmaz: `ic.mulk` bölge kipinde tanımsızdır (`derle.ts:78`) ve `elektrikUygula`'ya `sebeke = null` geçer (`h.bolge.merkez` yalnız mülk düğümünde tanımlıdır). Kanıt (iki katman): (a) **yöntem izdüşümü testi (K-1)** şebekeyle birlikte koşar (güncel içerikte `mulk.sebeke` var, `p4Oncesi`'nde yok): bölge kipi 12 kontrol noktasında tam `durumOzeti` aynı; (b) birim test: bölge kipinde elektrik girdili tesis santralsiz **verim 0** kalır (`elektrik.karsilanmaPpm = 0`, bugünkü davranış) ve `BolgeElektrikDurumu.sebekeMili` hiç yazılmaz.

**K-5: `yontemGecersizKilma` etkisizlik kanıtı.** `ciktiPpm = 1 000 000` ve blok yok: mülk kipi tohumlu koşu 12 noktada aynı `durumOzeti` (K-3 ile aynı koşu, iki veri kopyası); bölge kipinde `ciktiPpm = 750 000` bile `durumOzeti`'ni değiştirmez (`ic.mulk` tanımsız); mülk kipinde `ciktiPpm = 750 000` `standart_gida_isleme` tesisinin `ciktiGercek`'ini ×0,75 yapar, girdi aynı (birim test).

### 13.2 Aritmetik kanıt (belge)

Katman 4a (§6.3): `d4a = 0 ⇒ p4a = 0, a değişmez, acik değişmez, frD = PPM` ve `dukkanGercek = 0`; `bolgeOranlariUygula`'da `− 0`; `hazineKalemleri`'nde `+ 0`. `BolgeHesabi` yeni dizileri sıfırla başlar ve durum metnine girmez (`BolgeHesabi` geçici).

### 13.3 `mulkKipi` süzgecinin etki alanı

Yalnız `icerikDerle`'de `ic.tesisTurleri` görünümü (§5.5). `ic.icerik`, `ic.yontemler`, `ic.yontemIndeks`, `icerikKimlikTablosuOlustur` (`goc.ts:38-46`) tam kalır. Bölge kipinde `yontem_degistir` yeni yönteme `yontem bu tesis turunde yok` der (`ekonomi/komut.ts:85`); test: bölge kipi komutu reddedilir ve dünya değişmez.

### 13.4 Mevcut testlerin uyarlanması (K3 teslimine dahil)

| Test | Uyarlama |
|---|---|
| `mal-izdusumu-kanit.test.ts:51` `p3Oncesi` | yeni yöntemleri, `perakende`'yi ve `ekYapilar.dukkan`'ı da çıkarmalı (14 mallı içerikte `un`/`kepek`'i anan yöntem `icerikTablosu`'nda hata atar); `expect(...).toEqual(YENI_MALLAR)` ve `:155-224` "eklenen" beklentileri (`yontemler` boş) |
| `serilestir-goc.test.ts` | (a) "sona eklenmiş içerik" testine yeni yöntem eklemesi senaryosu; sabit sayılar güncellenir |
| `para-guvenligi.test.ts:98-100,215-216` | korunum yardımcısı `yerelNpc`, `lavabo.sebeke` ve `kasa.giris.sebeke`'yi toplar; kalem kıyası isteğe bağlı kalemleri içerir |
| `mulk-{ilk-satis,olcek-kilitsiz,serilestir,yapilar}.test.ts`, `botlar/test/parsel.test.ts`, `olcum/test/parsel-kosu.test.ts` | şebeke açılınca brownout/verim 0 bekleyen testler `delete v.param.mulk.sebeke` ya da güncel sayılar (§5.2.10) |
| `veri/test/dogrulama.test.ts:27`, `kimlik-listesi.test.ts:16-23,49,100-106`, `il-imza.test.ts:656` | sayım ve `dukkanTurleri` geçişi |

---

## 14. Değişmez tablosu

| Değişmez | G6 | G7 | G8 | Nasıl sağlanır | Test |
|---|---|---|---|---|---|
| Deterministik çekirdek (tamsayı, `Math.random`/`Date`/kayan nokta yok) | evet (veri) | evet: çekim PPM `carpBol`; sabit sıra (oyuncu kimliği, `EkYapiDurumu.id`, yuva, mal indeksi, ilçe kimliği); kalan birimler sıralı | evet (veri) | `carpBol` (BigInt yedekli); `Math.pow/sqrt` yok (lint); `Map` yalnız geçici ve sıralı gezilir | `perakende-determinizm` (aynı tohum + günlük = aynı özet; komut sırası) |
| Bölge kipi altınları birebir | `mulkKipi` süzgeci | katman 4a no-op; `perakende` mülk-only | süzgeç | §13 | K-1/K-2/K-3 |
| Protokolde yalnız ekleme | yok | komut/kare alanları isteğe bağlı | yok | §10 | `protokol` komut-sema ve kare delta testleri; `PROTOKOL_SURUMU` aynı |
| Tutar taşıyan komut yok | yok | fiyat = kademe `secim`; `metin` yalnız oyuncu yolu | yok | §9, §12.5 | `para-guvenligi` komut sözlüğü testi |
| Para korunumu | yok | `yerelNpc` isteğe bağlı musluk; I1-I6 | yok | §12 | `perakende-para` |
| Kilitsizlik (A0-17) | yöntemde teknoloji/seviye şartı yok | dükkân şemasında seviye/teknoloji/önkoşul alanı yok; `acikOlcekler` dünya zamanlaması | aynı | V1, V11, `.strict()` | `perakende-veri` kilitsizlik testi |
| Yalnız-ekle / kimlik kalıcılığı | yöntem sona; `icerik-kimlik-kilidi.json` önek | raf `mal` dize; dükkân türü dize | yöntem sona | §3, §11 | `serilestir-goc`, kimlik kilidi |
| Başarısız komut durumu değiştirmez | — | tüm denetimler önce; no-op komut reddedilir | — | §9.2 | `perakende-komut` (özet değişmez) |
| Başarılılar günlüğü = canlı dünya | — | çözüm komutla/saatle; hız sınırı `d.zaman` ile | — | §6, §7.5 | yeniden oynatma testi |
| Çekirdek paketi `@bolge/veri` çalışma zamanı importu yok | — | yeni dosyalar yalnız tip alır | — | `mal-kimlik-kilidi-paket.test.ts` | aynı test |
| Arayüzde büyük harf yok; `1.234 ₺`; Türkçe | — | ret iletileri küçük harf | — | §9.3 | K1 çeviri testi |
| Oyuncu serbest metni sistem/ajan yoluna girmez | — | `metin` ∉ `SISTEM_ALAN_TURLERI` | — | §9.1 | `para-guvenligi` sistem alan türleri testi |
| Para korunumu (şebeke) | `mulk.sebeke` ile (G6) | - | - | `lavabo.sebeke` + `kasa.giris.sebeke` = hazineden düşen bedel; yeni musluk yok; `ithKasa` kolu ayrı | `sebeke-elektrik` I1 |
| Blok yokken no-op (sebeke, yontemGecersizKilma, perakende) | evet | evet | evet | `ic.mulk.<blok> === undefined` ⇒ hiçbir kod yolu; durum alanları yalnız kullanılınca yazılır | K-3, K-4, K-5 |
| Şebeke fiyatı oyuncudan ve pazardan bağımsız | evet (taban sabit) | - | - | derleme zamanı tamsayı; `d.pazar` okunmaz | `sebeke-elektrik` (8) |
| Etkin kademe saf | - | evet | - | `etkinKademe(durum, t)`; çözümde durum yazılmaz | `perakende-kampanya` |

## 15. Botlar ve ölçüm

### 15.1 G6: bot önayarı ve ölçüm (O2)

| # | İş | Dosya | Ayrıntı |
|---|---|---|---|
| B-1 | **Ekmek zinciri önayarı:** Çiftlik → `gida_fabrikasi` ×2 (`yontem: "degirmen"`, `yontem: "ekmek_firini"`) → ihracat (ekmek, kepek); yakıt ithalat emri; kepek ihracatı ya da `ahir` + `kepek_gubresi` | `botlar/src/parsel.ts:105-109` (`CIFTCI`/`SANAYICI`), `:392` (`yapiMaliyeti`), `:470` (`ithalatEmirleri`), `onayarlar.ts:77` | Bot bugün yalnız `yapi_yerlestir`/`ticaret_emri` verir, **`yontem_degistir` yok** (K3 keşif §1; O2 isteği). Önayar iki yoldan birini kullanır: (a) `yapi_yerlestir.yontem` alanı (§5.8; baş lider kabul ederse), (b) kurulum bitince `yontem_degistir` |
| B-2 | **Şebeke ile açılış:** önayarlar santral kurmadan elektrikli yöntem çalıştırır; `SANAYICI`'nın hidro santralle açılması **zorunlu değildir** (ama kalabilir: ölçüm için iki düzenek) | `botlar/src/parsel.ts:105-109` | A0-11 ölçümü iki düzenekle koşar: santralsiz ve hidro santralli (karşılaştırma raporu: B7) |
| B-3 | **Marjinal-net yöntem seçici (`g6-onayar`; G6 KABUL KOŞULU):** `gida_fabrikasi` için `standart_gida_isleme` ↔ `degirmen`/`ekmek_firini` kararını marjinal net (A2 tablosu) ile verir; `yontem_degistir` ve `yontem` alanını kullanır | `botlar/src/` | §5.9 tetik ölçütü M'nin **ön koşulu**: seçici yoksa M ≈ %0 çıkar ve ölçüt ekonomik hatayı bot ayarı hatasından ayıramaz (A2); yalnız mülk kipi botları |
| B-4 | **`mulkKipi` süzgeci botlar için:** bölge kipi botları `yontemAdaylari`'nda yeni yöntemleri **görmez** (K-1 karşıt kanıtı) | `botlar/src/planlayici.ts` (`yontemAdaylari`) | Süzgeç `ic.tesisTurleri` üzerinden geldiği için bot kodu değişmez; O2 test eder |
| B-5 | **Bot hedefi:** ekmek zinciri (4 yapı + ilk ekmek satışı) katılımdan ≤ 3 sim-saat (santralsiz; A2 §1.8) | `olcum` | A2'nin süre tablosu (§1.8): nakit ve emir yuvası bağlayıcıdır, süre değil; hazine yetersizse bot **bekler** |

### 15.2 G6: ölçüm raporları (O2/A2; kod değil)

1. **Zincir ↔ tek tesis** (§5.9): A2'nin M ölçütü (ilk 7 gün, tohum 1–10 × 100 bot, yeni oyuncu, 1/3 arketip), gıda arzında `standart_gida_isleme` payı; tahıl/tesis/işçi başına oranlar.
2. **Santral başabaş raporu:** kömür / yakıt jeneratörü / hidro santral, S ve M ölçek, yük %13 / %50 / %100: şebeke bedeli ↔ santral yakıt + bakım + işletme. Baş lider kararı: oyuncuya **gerçek sayılar** gösterilir, "daha ucuz" vaadi yoktur (§5.2.1, B7). Rapor Esnaf Defteri / Yatırım Tahmini kartı verisinin kaynağıdır (G9).
3. **Ödeme gücü salınımı** (§5.2.6): hazine 0 koşusunda `odemePpm` ve `sebekeMili` zaman serisi.
4. Mülk kipi testleri/botları şebeke açıkken: §5.2.10 etkilenen koşular yeniden çalıştırılır.

### 15.3 G7/G8: A0-11, A0-12, ZP ölçüleri, dükkân ve cam → pencere botları

**A0-11 ("ilk dükkân medyan ≤ 36 sa") iki zaman ister; ikisi de DURUMDAN okunur (A1 G9 bulgusu 4):**

| Zaman | Okunacağı yer | Tanım |
|---|---|---|
| **Yapı komutu zamanı** | `InsaatDurumu.baslangic` (inşa sürerken); biten dükkânda `DukkanDurumu.baslangic` (§7.1) | `yapi_yerlestir`/`tesis_insa_hucre` komutunun uygulandığı `d.zaman` |
| **Dükkân kurulma zamanı** | `DukkanDurumu.kurulus` | `ekYapiTamamla`'nın çalıştığı `d.zaman` (inşaat bitişi) |
| **İlk satış zamanı** | `MulkOyuncuDurumu.ilkSatisT` | yerel satış oranının (`ParaAkisi.yerel`) ilk kez > 0 olduğu çözüm anı |

- **`ilk_dukkan` tetiği ilk satıştır, yapı bitişi değil (GZ-14):** koşul `dukkanGeliri(d, oyuncu, t) > 0` ve tamamlanmış `dukkan` (§7.8); ölçüm "ilk satış"ı `ilkSatisT`'den okur. A0-11'in ölçtüğü süre = `ilkSatisT − katılım` (katılım zamanı `MulkOyuncuDurumu` kayıt anı); ara kırılım: `baslangic − katılım`, `kurulus − baslangic`, `ilkSatisT − kurulus` (A2 §1.12: süre değil nakit ve emir yuvası bağlayıcıdır; P-İthal pencere ithalatı ilk dükkânda ≥ 1 saat ekler; §7.4).
- **A0-12** (geri ödeme ≤ 48 sa; prim 1,05–1,20): `Σ dukkanGeliri` ve `dukkan` bedeli; A2 §1.9 geri ödeme tablosu (şehir 12–15 sa, kasaba 17–21 sa, kırsal tutmaz) beklenen yöndür.
- **ZP sayaçları:** ZP3 (perakende primi = dükkân fiyatı / 0,891 R; kademe 3'te 1,291, alarm 1,30), ZP8 (`yerelNpc` payı ≤ %50; A2 §1.10: %45,3), ZP11 (ithal alıp perakende satış payı ≤ %15); kaynak `mulk.para.musluk.yerelNpc` ve `ticaretDefteri` (§12.3).
- **Dükkân botu (O2):** zincir önayarına eklenir: ekmek zinciri sonrası `yapi_yerlestir {dukkanTuru: "firin"|"bakkal"}` + `dukkan_raf` (ekmek, gıda) + varsayılan kademe (normal); P-İthal pencere için `ticaret_emri` ithalat 4 pencere (iptal edilmezse tüketim sürer: bot emri iptal etmeli); botlar `marka_tanimla` vermez; `dukkan_fiyat` yalnız normal/yüksek kademe (kampanya kapalı varsayılan).
- **Cam → pencere önayarı (O2, G8):** santralsiz (şebeke); silis ithal ya da `silis_ocagi`; `parca_fabrikasi` ×2 (`yontem: "cam_firini"`, `yontem: "celik_dograma"`); çelik ve parça ithalatı; pencere ihracatı ve `yapi_market` rafı; A2 §1.8 hedefi: katılımdan ≤ 6 sim-saat (gün 3 sonrası, santral yok) / 7. günden sonra ≤ 14 sa.
- **Kapasite notu:** A2 §1.3-B3: NPC pazar derinliği ekmek zinciri sayısını sınırlar (oyuncuların ancak %43'ü fiyat düşmeden); bot koşusunda (A0-4, 100 bot) tek zincire yığılmama izlenir.

## 16. Test listesi

> Hepsi **atlanmaz** (`skip`/`todo` yasak); yalnız kendi paketinin hedefli testleri koşulur, tam kapı O1'indir.

### 16.1 G6

| Test (dosya) | Sahip | Ne sınar |
|---|---|---|
| `veri/test/kimlik-listesi.test.ts` (genişler) | K3 | Y1–Y8: bozuk biçim, tekrar, ev sahibi listede yok, ad alanı kesişimi (+`hidro_santrali` istisnası), listede olmayan yöntem, araya ekleme / sıra değişimi / silme (önek ihlali), ev sahibi değişimi, `mulkKipi` uyuşmazlığı, 10'dan fazla yöntem **uyarısı**; `dukkanTurleri` geçişi; `yontemler` alanı yokken kilit uygulanmaz |
| `veri/test/dogrulama.test.ts` (genişler) | K3 | `mulkKipi`: varsayılan olamaz, teknoloji şartı yok; `sebeke`: boş `mallar`, tekrarlı/bilinmeyen mal, `tavanOraniPpm` 0 / > 1 000 000 reddi, `kasaPayiPpm` aralığı, `elektrik` dışı mal depolanamazsa ret, elektrik girdili yöntem yoksa ret; `yontemGecersizKilma`: bilinmeyen yöntem, aralık dışı değer; `.strict()` (yasak kilit anahtarları); sayım testleri (`yontemler` 24 → 28; G8: 30) |
| `cekirdek/test/yontem-izdusumu-kanit.test.ts` (yeni; `mal-izdusumu-kanit` kalıbı) | K3 | **K-1 (negatif kontrol (a) ve (b) ZORUNLU, §13.1):** `p4Oncesi(veri)` (yeni yöntemler, `sebeke`, `yontemGecersizKilma` çıkarılmış) ↔ güncel içerik, bölge kipi, mevcut 4 bot + bulanık komut, mini-6, tohum 3, 6 gün, 12 kontrol noktasında tam `durumOzeti`, etkin kuyruk, olay zinciri özeti, `sayac.olay` birebir; `kuralSurumu` **farklı**; kimlik tablosu `yontemler` 28 elemanlı; **karşıt kanıt:** bayraksız sahte yöntem bölge botlarına görünür, bayraklısı görünmez |
| `cekirdek/test/sebeke-elektrik.test.ts` (yeni) | K3 | §5.2: (1) santralsiz `verimPpm > 0`, `sebekeMili = talep`, bedel formülü (`mili × 10 350 / 1 000`); **yakıt (stoksuz mal):** `ekmek_firini` ticaret emri **olmadan** çalışır, yakıt stoğu değişmez, `sebekeTuketim.yakit = Σ girdi × verim`; yakıt `mallar[]`'dan çıkarılınca eski davranış (verim yakıt stoğuna bağlı); yakıt ithalat emri verilirse stok birikir ve şebekeli tesis onu kullanmaz; **fiyat taban sabit:** yakıt 103 500, elektrik 10 350 mili-₺/birim; `d.pazar.fiyat[yakit]` değiştirilince (büyük ithalat emri) şebeke fiyatı **değişmez**; (2) santral ≥ talep: `sebekeMili` yok, yakıt tüketimi yükle ölçekli; (3) kısmi santral: `sebekeMili = talep − arz` tam; (4) santral tam yükte iken şebeke açığı; (5) **korunum I1** 3 tohum × rastgele koşu (şebekeli, kasa payı > 0 ve = 0); (6) lavabo + kasa girişi = bedel birikimi; **tamsayı örneği:** ödeme 397.576.620 → kasa 47.709.194 + lavabo 349.867.426 (`kasaPayiPpm = 120 000`); `kasaPayiPpm = 0` iken `giris.sebeke` yazılmaz; `ithalatNpc` ayrı ve etkilenmez (`ithKasa` kolu); (7) hazine 0: ödeme gücü, `borcSilme`, korunum tam, 48 saat tekrarlanabilirlik; (8) `tavanOraniPpm` < 1M fiyatı düşürür; (9) yetişme nötrlüğü: tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma; (10) **bölge kipi** santralsiz verim 0, `sebekeMili` yazılmaz (K-4b) |
| `cekirdek/test/yontem-komut.test.ts` (yeni) | K3 | §5.8: `yontem` ile inşa → bitince tesis o yöntemle; `yontem` yokken `yontemler[0]`; ek yapıda `yontem` reddi; bilinmeyen yöntem; türde olmayan yöntem; `yontemAcikMi` reddi; reddedilen komut **durumu değiştirmez** (özet aynı); bölge kipi etkilenmez; **geriye uyum:** `yontem` alanı OLMADAN eski komut (günlükten) bugünkü sonucu ve `durumOzeti`'ni verir |
| `cekirdek/test/yontem-gecersiz-kilma.test.ts` (yeni) | K3 | §5.9: blok yok / `ciktiPpm = 1 000 000` aynı `durumOzeti` (K-5); `ciktiPpm = 750 000` mülk kipinde çıktı ×0,75, girdi aynı; bölge kipinde etkisiz; yalnız `b.merkez` düğümlerde |
| `cekirdek/test/serilestir-goc.test.ts` (güncel) | K3 | yöntem sona ekleme göç provası (`gocIzni + yalnizEkleZorunlu`); `eklenen.yontemler = 4`; `fikstur-goc/mulk-v1.json` yüklenir; yeni isteğe bağlı alanların tam gidiş-dönüşü (`sebekeMili`, `ParaAkisi.sebeke`, `lavabo.sebeke`, `giris.sebeke`, `InsaatDurumu.yontem`); bozuk değer ret testleri (negatif sayaç, bilinmeyen kalem) |
| `cekirdek/test/mal-izdusumu-kanit.test.ts` (güncel) | K3 | `p3Oncesi` yeni yöntemleri de çıkarır (B4); "eklenen" beklentileri |
| `cekirdek/test/para-guvenligi.test.ts` (güncel) | K3 | korunum yardımcısı isteğe bağlı kalemleri toplar; sistem komutu alan türleri değişmez; `yontem` alanı miktar/oran/adet **değil** (açık liste değişmez) |
| `mulk-{ilk-satis,olcek-kilitsiz,serilestir,yapilar}.test.ts`, `botlar/test/parsel.test.ts`, `olcum/test/parsel-kosu.test.ts` | K3 / O2 | §5.2.10 uyarlama |
| **K-2 (CI denetimi, test değil)** | O1 | dondurulmuş altınlar için `git diff --exit-code` (§13.1 K-2 listesi); negatif kontrol: geçici kopyada 1 bayt değişikliği denetimi kırar |
| **Negatif kontroller K-1…K-5** (§13.1 ilke tablosu) | K3 (G6-4: A3) | K-1: enjekte `yontem_degistir` + bayraksız karşıt testler; K-3: şebekeli mülk özeti farklı; K-4: mülk kipinde verim > 0 / bölge kipinde 0; K-5: `750 000` çıktıyı ×0,75 yapar; kanıt dosyalarının her biri kendi negatif kontrolünü AYNI dosyada taşır |
| `sunucu/test/odul.test.ts` (güncel) | K2 | `degirmen` ve `ekmek_firini` ile `ilk_isleme` ve `zincir_kapandi` tetiklenir; `ilk_yapi`/`ikinci_ilce` etkilenmez |
| `protokol` komut-sema testi | K2 | `tesis_insa_hucre` ve `yapi_yerlestir` `yontem` alanı biçimi (isteğe bağlı, kimlik, nesne alanı; protokolde yalnız ekleme); **geriye uyum testi:** alan olmadan gelen eski komut (örnek komut günlüğü satırı) aynı biçimden geçer ve çekirdekte aynı sonucu/durum özetini verir (`yontem-komut.test.ts` ile birlikte) |
| `botlar/test/` zincir önayarı | O2 | bot 7 günde `ekmek` üretir ve satar (santralsiz); bölge kipi botları yeni yöntemi seçmez |

### 16.2 G7 ve G8

| Test (dosya) | Sahip | Ne sınar |
|---|---|---|
| `veri/test/perakende-veri.test.ts` (yeni) | K3 | V1-V12 ret testleri (bozuk kademe, bant dışı, tamCesit > mal sayısı, takvim satır toplamı ≠ 12.000.000, bayram toplam sapma ≠ 0, çakışan bayram, raf malının talebi yok, pazar kaydı olmayan raf malı, kampanya parametre aralığı, marka sınırları); kilitsizlik taraması (V11: seviye/teknoloji/önkoşul anahtarı yok; `.strict()`); `dukkan` `olcekHucre` kuralı; beş S türü geçerli, `market`/`supermarket` kaydı yok |
| `cekirdek/test/perakende-cekim.test.ts` (yeni) | K3 | **Ek B vektörleri V1-V5 birebir** (V5: `Qr ≤ 0` tur adımı → hepsi 0); sıra bağımsızlığı (aynı girdi, dükkân girişi permütasyonu aynı sonuç); `Σ s ≤ Q − floor(Q × tabanPay)`; `top_j ≤ kasa_j`; su-doldurma yakınsaması (≤ 32 tur); **her turda `Qr ≥ 1`** (kanıt §6.4; `Qr ≤ 0` ulaşılamaz); BigInt/`carpBol` taşma sınırı (Q ≈ 1e9 × w ≈ 1,1e6); mevcut olmayan (stoksuz) yuva çekime girmez ve payı diğerlerine kalır |
| `cekirdek/test/perakende-talep.test.ts` (yeni) | K3 | Q: nüfus eşdeğeri × takvim × bayram; **iki yol:** (a) `nufus` alanlı ilçe: `Q ∝ nufus` (nufus ikiye katlanınca Q ikiye katlanır, ±1 yuvarlama), (b) alansız ilçe: eşdeğer = `ilceSinifiNufus[sinif]` ve `nufus = ilceSinifiNufus[sinif]` verilen kopyayla **birebir aynı** Q (tutarlılık); hücre sınıfı karışımı (kırsal ağırlıklı ilçede `sinif = sehir`) Q'yu **değiştirmez**; `bayramCarpani` sınırları (`[B − Do, B − 1]`, `[B, B + Ds − 1]`); toplam-sabit (bir bayram döngüsünde Σ sapma = 0); tarım kapalıyken takvim yok; fikstür `nufus` doğrulaması (V9b: 0, −1, 1,5, 20 000 001 reddi; alanın yokluğu geçerli); `talep1000Saat` mevcut mülk/bölge davranışını değiştirmez (dükkânsız dünya aynı `durumOzeti`) |
| `cekirdek/test/perakende-komut.test.ts` (yeni) | K3 | **kur-yık döngüsü (baş lider):** oyuncu dükkânı indirimli kurar, tamamlar, `dukkan_yik` ile yıkar, yeniden kurar: ikinci kurulumda `indirimliYapi` sayacı **ilerlemiş**, indirim hakkı **geri gelmemiş** (ikinci kurulum indirimsiz bedel), yıkımda para hareketi 0, korunum tam; DUK-00…DUK-23 ve MRK-01…MRK-14 reddi; **reddedilen komut durumu değiştirmez**; `dukkan_raf`/`dukkan_fiyat`/`dukkan_marka` başarı yolları; hız sınırı (DUK-18); `dukkanTuru` alanı; **`dukkan_yik`** (§7.9 test listesi: iade yok, para korunumu, indirim sayacı geri verilmez, `insaat_iptal` dükkân %50 iadesi); G7'de ölçek 1/2 reddi (DUK-04) |
| `cekirdek/test/perakende-kampanya.test.ts` (yeni) | K3 | §7.5b (a)-(h): kapalıyken DUK-20; 6 saat sınırı ve tam saat sayımı; gün sonu kesmesi; haftalık gün sınırı DUK-21 ve hafta sıfırlaması; bitişte etkin kademe varsayılana döner (durum değişmez); tek sıçrama = parçalı sıçrama |
| `cekirdek/test/perakende-para.test.ts` (yeni) | K3 | I1-I6 (§12.4): korunum 3 tohum × rastgele koşu; `Σ dukkanGeliri == musluk.yerelNpc`; hane bütçesi üst sınırı (`≤ Σ Q × R × 1,15 × (1 − taban)`); kasa girişleri yerel satıştan etkilenmez; `d.pazar.fiyat/oyuncuArzi/oyuncuTalebi` değişmez; nötrlük (sık/seyrek `paraUzlastir`) |
| `cekirdek/test/perakende-serilestir.test.ts` (yeni) | K3 | `dukkan`, `marka`, `kampanya`, `ilkSatisT`, `yerelKarsilanmaPpm`, `ParaAkisi.yerel`, `musluk.yerelNpc` tam gidiş-dönüş; bozuk değer ret; `dunyaIcerikUyumu` (§11.2); `fikstur-goc/mulk-v1.json` yüklenir; eski dünya + yeni kod aynı |
| `cekirdek/test/perakende-yetisme.test.ts` (yeni) | K3 | tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma (`durumOzeti` birebir); sunucu kapalıyken geçen süre |
| `cekirdek/test/perakende-arbitraj.test.ts` (yeni) | K3 | ithalat → dükkân zincirinin saatlik net marjı ≤ `(1,15 − 1,035) × R × hacim`; ithal rafı şebeke ve NPC ithalatıyla etkileşmez |
| `cekirdek/test/perakende-determinizm.test.ts` (yeni) | K3 | aynı tohum + günlük = aynı özet; komut sırası; `Map` sıralı gezilir (permütasyon testi) |
| `cekirdek/test/marka-sozdizimi.test.ts` (yeni) | K3 | MRK-03…MRK-08 (uzunluk, izinli küme, baş/son boşluk, art arda boşluk, harf şartı); Türkçe harfler tek karakter; emoji/birleşen işaret/akıllı tırnak reddi; durum özeti: marka tanımlamamış oyuncu ve eski dünya aynı |
| `cekirdek/test/bolge-kipi-etkisiz.test.ts` (K-3 genişler) | K3 | `perakende` ve `yontemGecersizKilma` veride var, dükkân yok ⇒ aynı `durumOzeti`; katman 4a `d4a = 0` aritmetiği |
| `cekirdek/test/mulk-yapilar.test.ts:50`, `mal-izdusumu-kanit` | K3 | ek yapı listesi 6 → 7 (`dukkan`), göç beklentileri |
| `sunucu/test/ad-suzgec.test.ts` (yeni) | K2 | yasaklı ad katlama (büyük/küçük harf, aksan, ayırıcı); yasaklı kelime ↔ içerik; **marka komutu ve görünen ad ucu AYNI süzgeci kullanır**; bot/ajan yoluna uygulanmaz; günlüğe yazmadan önce ret (MRK-12) |
| `cekirdek/test/ad-kurali.test.ts` (yeni) | K3 | `adSozdizimiHatasi` ve `adKanonik` tek kaynak (§7.7 kanonik biçim testleri: `"İSTANBUL Fırını"` → `"istanbul fırını"`, `"IŞIK"` → `"ışık"`, idempotans, kaynakta `toLowerCase` yok): marka komutu ve (sunucu testinde) görünen ad aynı sonucu verir; protokol zod sınırı `min/max` = `AD_KURALI.min/max` |
| `sunucu/test/odul.test.ts` | K2 | `ilk_dukkan` = ilk satış (yapı bitişiyle tetiklenmez); `ilk_dukkan` yıkımdan sonra tekrar verilmez |
| `protokol` kare/komut delta testleri | K2 | `dukkanlar`, `sebeke`, `markalar` kare alanları isteğe bağlı; `PROTOKOL_SURUMU` aynı; yeni komut zod satırları; eski istemci/sunucu alan yok sayar |
| `istemci/test/komut.test.ts:92-117` | K1 | `GIZLI_KOMUTLAR` (+ `marka_sifirla`), `HARITA_KOMUTLARI` (+ 5 komut) `toEqual` |
| `botlar/test/` dükkân ve cam → pencere önayarı | O2 | bot ilk dükkânı kurar ve ilk satışı yapar; cam → pencere zinciri santralsiz tamamlanır; A0-11 zaman alanları durumdan okunur |

## 17. Uygulama sırası ve kabul ölçütleri

**Sıra:** G4 (bu şartname) → baş lider onayı → K3 "hücre dizini" işi biter → **G6** → G7 → G8. Her dilim "öncekiler yeşilken" başlar: bir dilim, öncekinin tam kapısı (O1) yeşil olmadan başlamaz. **Aynı kapı kuralı (B5):** K3'ün `Komut` birliğine yaptığı her tür/alan eklemesi ile K2'nin `komut-sema.ts` zod satırı **aynı birleştirmede** gelir (`_KomutDenetimi` eşitliği, `komut-sema.ts:80-82`); K1'in `komut.test.ts` listeleri aynı kapıda güncellenir.

### 17.1 G6 alt adımları

| Adım | İş | Sahip | Bağımlılık | Kabul (komut: hedefli test) |
|---|---|---|---|---|
| G6-1 | **Şema (isteğe bağlı/no-op):** `YontemTanimi.mulkKipi`, `mulk.sebeke`, `mulk.yontemGecersizKilma`, `kimlik-listesi.json` `yontemler` bölümü + doğrulayıcı (Y1–Y8), `dogrulaKimlikKilidi`'ne `dukkanTurleri`, `MulkEkYapiTanimi.olcekHucre?` (G7 için, no-op) ve **komutlara `yontem?` tipi** (K2'nin zod satırıyla aynı birleştirme) | K3 (+K2 1 satır) | hücre dizini işi | `pnpm --filter @bolge/veri exec vitest run` (kimlik-listesi, dogrulama); `pnpm -r typecheck` yeşil; **hiçbir JSON değişmedi**, `durumOzeti` ve altınlar aynı |
| G6-2 | **Çekirdek (blok yokken no-op):** `icerikDerle` süzgeci; `elektrikUygula` şebeke yolu + `BolgeHesabi.sebekeMili`; `hazineKalemleri`/`paraAkisiYaz`/`paraMuhasebesi`/`kasaOranlari` şebeke kolları; `ParaAkisi.sebeke`, `lavabo.sebeke`, `giris.sebeke`, `BolgeElektrikDurumu.sebekeMili`, `InsaatDurumu.yontem` + doğrulayıcılar; `yontem` komut alanı; `yontemGecersizKilma` yolu | K3 | G6-1 | `sebeke-elektrik`, `yontem-komut`, `yontem-carpani` (sentetik veriyle: testler kendi veri kopyasında bloğu ekler), `serilestir-goc`, `para-guvenligi`; mevcut tüm çekirdek testler **değişiksiz** yeşil (blok yok = no-op kanıtı) |
| G6-3 | **Veri (tek commit; `kuralSurumu` ARTAR):** T3: `icerik.json` 4 yöntem + tür listeleri; `parametreler.json` `mulk.sebeke`, `mulk.yontemGecersizKilma` (kapalı); `kimlik-listesi.json` `yontemler` (28 kayıt) | T3 | G6-2 | `dogrulaVeriPaketi`, `dogrulaKimlikKilidi`, `dogrulaPerakende` (V13–V17) geçer; `icerikDerle` tamam. **Bu bir mülk kipi kural değişikliğidir** (`mulk.sebeke`: santralsiz tesis artık üretir): `kuralSurumu` artar; **mülk kipi altınları (mülk fikstürlü altın/ölçüm sabitleri) TEK commit'te, eski ve yeni değerler raporlanarak güncellenir**; bölge kipi altınları **BİREBİR** kalır (K-1…K-5). **G6-3 sonrası O2 ölçüm temel çizgisini (parsel-v1, bakım) yeniden alır;** önceki raporlarla birebir karşılaştırılmaz |
| G6-4 | **Kanıtlar, test uyarlama ve mülk altınlarının tek commit'te güncellenmesi:** `yontem-izdusumu-kanit` (K-1), `mal-izdusumu-kanit` uyarlama (B4), `mulk-*` ve `botlar` uyarlama (§5.2.10), K-2 CI denetimi | K3, O2 | G6-3 | §16.1 tablosu; `git diff --exit-code` K-2 listesi (**bölge** altınları); mülk altınları güncellemesi **tek commit'te** ve commit gövdesinde eski/yeni değer raporu |
| G6-5 | **Dedektör doğrulaması, bot önayarı, ölçüm:** `odul.test.ts` (K2); bot ekmek zinciri (O2); §15.2 raporları | K2, O2 | G6-4 | `sunucu` odul testi; bot 7 günde `ekmek` |

**G6 teslim kapısı (O1):** tam kapı yeşil (`pnpm typecheck`, tam vitest, `dunya.html` gzip ≤ 400 KB; G6 payı < 0,5 KB beklenir, K3 ölçer: **doğrulanmadı**); bölge kipi altınları **birebir** (K-1: 12 noktada tam özet; K-2: dondurulmuş dosyalarda boş diff); eski mülk görüntüsü yüklenir.

### 17.2 G7 alt adımları

| Adım | İş | Sahip | Bağımlılık | Kabul (hedefli test) |
|---|---|---|---|---|
| G7-1 | **Şema (isteğe bağlı/no-op):** `mulk.perakende` (kampanya parametreleri dahil), **`ParselIlceTanimi.nufus?` (fikstür şeması, V9b)**, `MulkEkYapiTanimi.olcekHucre?`, `dukkanTurleri` kilit bağlantısı, V1-V12 (`perakende-dogrula.ts`), `DerlenmisPerakende`; komut tipleri (5 + 1) **K2 zod satırlarıyla aynı birleştirmede**; `AlanTuru += "metin"` | K3 (+K2) | G6 teslim kapısı yeşil | `perakende-veri`; `pnpm -r typecheck`; **hiçbir JSON değişmedi**, altınlar aynı |
| G7-2 | **Çekirdek (blok yokken no-op):** `yerelPazarHesapla`, katman 4a, `BolgeHesabi.dukkan*`, `hazineKalemleri`/`paraAkisiYaz`/`paraMuhasebesi` yerel kolları, `musluk.yerelNpc` (lazy), `ilkSatisT`, `yerelKarsilanmaPpm` | K3 | G7-1 | `perakende-cekim`, `perakende-talep`, `perakende-para`, `perakende-yetisme`; mevcut tüm çekirdek testler değişiksiz yeşil |
| G7-3 | **Dükkân:** durum, `ekYapiTamamla`, `yapi_yerlestir`/`tesis_insa_hucre` `dukkanTuru`, 5 komut + `marka_sifirla`, kampanya, marka, `dukkan_yik`, serileştirme/doğrulayıcılar | K3 | G7-2 | `perakende-komut`, `perakende-kampanya`, `marka-sozdizimi`, `perakende-serilestir`, `perakende-arbitraj`, `perakende-determinizm` |
| G7-4 | **Veri (tek commit; `kuralSurumu` ARTAR):** T3: `ekYapilar.dukkan` (P-İthal bedeli), `mulk.perakende` (A2 §1.9/§1.13; 4 dükkân türü), `kimlik-listesi.json` (dükkân türleri zaten listede) | T3 | G7-3 | `dogrulaVeriPaketi`, `dogrulaPerakende` (V1-V16); `icerikDerle`; **mülk altınları tek commit'te** (eski/yeni raporlu); bölge altınları BİREBİR |
| G7-5 | **K2/K1 kancaları ve kanıtlar:** `kare.ts` alanları, `ilk_dukkan` dedektörü, marka süzgeci, sunucu göçü; K1 `gizli.ts`/`komut.test.ts`/çeviriler; K-3 testi; ölçüm temel çizgisi | K2, K1, O2 | G7-4 | §16.2 K2/K1 satırları; `bolge-kipi-etkisiz` |

**G7 teslim kapısı (O1):** tam kapı yeşil; `dunya.html` gzip ≤ 400 KB (G7 payı +3–5 KB: çekirdek 2–3, zod/doğrulayıcı 1–2; **K3 ölçer**); bölge kipi altınları birebir (K-1…K-5); eski mülk görüntüsü yüklenir; bot ilk dükkânı kurar ve satar (A0-11 zaman alanları durumdan).

### 17.3 G8 adımları

| Adım | İş | Sahip | Kabul |
|---|---|---|---|
| G8-1 | **Veri (tek commit; `kuralSurumu` ARTAR):** T3: `cam_firini` (28) ve `celik_dograma` (29) yöntemleri (A2 §1.4/§1.13), `parca_fabrikasi.yontemler`'e ekleme, `yapi_market` dükkân türü ve `talep1000Saat` satırları (cam, çelik, parça, pencere), `kimlik-listesi.json` `yontemler`'e 2 kayıt | T3 | `dogrulaVeriPaketi`, `dogrulaKimlikKilidi`, V3/V4; `icerikDerle` |
| G8-2 | **Kanıtlar:** yöntem izdüşümü kanıtı (K-1) 6 yöntemle; mülk altınları (tek commit); `yapi-market` testi (yalnız NPC talebi; oyuncu-alıcı yok) | K3 | `yontem-izdusumu-kanit` (6 yöntem); `serilestir-goc` `eklenen.yontemler = 2` (G6'dan sonra) |
| G8-3 | **Bot cam → pencere zinciri ve ölçüm** (santralsiz) | O2 | A2 §1.8 hedefi (≤ 6 sa; 7. günden sonra ≤ 14 sa) |

**G8 teslim kapısı:** tam kapı yeşil; `dunya.html` < 1 KB artış; bölge kipi altınları birebir; pencere zinciri santralsiz çalışır.

## 18. Rollere istek listesi

**Dosya sınırı (baş lider):** K3 `packages/veri/src/**` ve **testlerini**, çekirdek kodunu yazar (tek yazar). T3 `packages/veri/icerik/{icerik,parametreler,kimlik-listesi}.json` **değerlerini** yazar. `sema.ts` `.strict()` olduğundan: önce K3 yeni alanları **isteğe bağlı/no-op** indirir, **sonra** T3 değer yazar (G6-1 → G6-3). Hiç kimse başkasının dosyasına yazmaz.

| Rol | İstek | Dilim |
|---|---|---|
| **K3** | §5, §3.5, §4, §11, §13 ve Ek A'daki değişiklikler; **blok yokken no-op** her yerde; testler §16.1; K3 `p3Oncesi`/`p4Oncesi` yardımcılarını yazar; `veri-importu` kuralı (çekirdek `@bolge/veri` çalışma zamanı importu yok) korunur; Node-only doğrulayıcılar `saf`a girmez; bundle ölçümü | G6 |
| **T3** | **G6-3 tek commit:** (a) `icerik.json`: `yontemler[]` sonuna 4 yöntem (A2 §1.4/§1.13 değerleri; `mulkKipi: true`); `gida_fabrikasi` ve `ahir` listeleri sonlarına ekleme; **`celikhane` listesi DEĞİŞMEZ** (T3 §8.2 `cam_firini` satırı geçersiz; G8'de `parca_fabrikasi`'ne); (b) `parametreler.json`: `mulk.sebeke` (`mallar: [{ mal: "elektrik", tavanOraniPpm: 1000000 }, { mal: "yakit", tavanOraniPpm: 1000000 }]`, `kasaPayiPpm` **120 000** (A2 §1.3-B1)), `mulk.yontemGecersizKilma` (`standart_gida_isleme: { ciktiPpm: 1000000 }`, kapalı; G2 açılırsa 750 000); (c) `kimlik-listesi.json` `yontemler`: §3.5'teki 28 kayıt, sırayla. **K3'ün G6-1 dalı birleşmeden önce yazma.** Her yeni kimlik önce listeye. | G6 |
| **K2** | `komut-sema.ts:62-71` iki komuta `yontem: kimlik.optional()` (K3 ile aynı birleştirme); (G7) `dukkan_yik` ve diğer yeni komut satırları, `kare.ts` alanları (§10.2); `sunucu/src/odul/dedektor.ts` `ilk_isleme`/`zincir_kapandi` doğrulama testi (kod değişmez); sunucu `kuralSurumu` göçü (`yazar.ts:363,385,1318`) G6-3 sonrası `gocIzni` | G6 |
| **K1** | G6'da komut **tür** değişikliği yoktur (`gizli.ts`, `komut.test.ts` listeleri değişmez); **G7:** `HARITA_KOMUTLARI`'na `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik`, `GIZLI_KOMUTLAR`'a `marka_sifirla` (`gizli.ts:11,19`; `komut.test.ts:92-117` `toEqual` listeleri); DUK/MRK/YON çevirileri (§9.3); marka adı girişinde `’` → `'` çevirisi ve kırpma (§7.7, §10.4); kampanya kalan hak ve "mevcut" bayrağı gösterimi (§10.2); `harita/hata-mulk.ts` çevirileri: `bilinmeyen yontem`, `yontem bu tesis turunde yok`, `yontem acik degil`, `yontem yalniz tesis turunde verilebilir` (§9.3 ekleri); **oyun içi metinde santral için "daha ucuz" vaadi yoktur**, gerçek sayılar gösterilir (§5.2.1); Dikkat paneli notu "pazar doydu → ekmek zinciri" (G9; §5.9) | G6, G9 |
| **O2** | `botlar/src/parsel.ts` (`g6-onayar` işi): `yontem_degistir`/`yontem` kullanan **ekmek zinciri önayarı** (Çiftlik → `gida_fabrikasi` ×2 → ihracat; yakıt ithalat emri **yok**; kepek); santralsiz açılış; **marjinal-net `degirmen` yöntem seçici = G6 kabul koşulu** (§5.9 ölçümünün ön koşulu; yoksa M ölçülemez); §15.2 raporları; mülk testleri şebeke açıkken yeniden; **G6-3 sonrası temel çizgiyi (parsel-v1, bakım ölçümleri) yeniden alır** ve eski raporlarla birebir karşılaştırmaz | G6 |
| **A2** | (SHA: son teslim); **şebeke fiyatı TABAN kararı:** yeniden hesap gerekmez (S-16 kapandı); bayram sınır günü tanımı (§4.3, S-8); zincir +%33,6 ↔ K/U bandı (S-17); `kamuSiparisi` şeması gerekirse (S-11) | G6, G7 |
| **O1** | G6 teslim kapısı + K-2 `git diff --exit-code` listesi; `dunya.html` boyut ölçümü | G6 |
| **T1/T2** | `kullanici` metinleri (Türkçe, büyük harf yok): şebeke elektriği açıklaması ve fatura satırı; santral kartı gerçek sayılarla; yöntem adları (`degirmen` Değirmen Atölyesi → …, T3 §3.3) | G9 |
| **O3** | Fikstür sahibi: `ParselIlceTanimi.nufus?` **isteğe bağlı** alanı (G7-1'de K3 şemayı indirir; O3 gerçek veri hattından yazar; kaynak ve lisans A2 `241f1b9` açık sorusu). Alan eklenmese de G7 çalışır (yedek: sınıf sabiti) | G7 (isteğe bağlı) |

## 19. K3 keşif notunun 12 sorusu ve baş liderin T3 karar maddeleri

### 19.A K3'ün 12 sorusu: yanıtlar

(Soru numaraları `takim/k3-kesif.md` §6'daki sırayladır. Dosya:satır göndermeleri `d28447d`'dir.)

**1. Değirmen, fırın, cam fırını, doğrama: yöntem mi, ayrı tesis türü mü?**
- **Karar: yöntem** (baş lider kararı 1). Ev sahipleri: `gida_fabrikasi` (`degirmen`, `ekmek_firini`), `ahir` (`kepek_gubresi`, `sut_kepekli`), **`parca_fabrikasi`** (`cam_firini`, `celik_dograma`; K3 keşfinin ve T3'ün öngördüğü `celikhane` **değil**, §3.2). `hafif_sanayi` A0'a çekilmez; `yapiYuva`, `olcekHucre`, `yapiInsaSaati` satırları **değişmez**.
- Gerekçe: tür yolu 3 tabloyu, kimlik listesi önek kuralını (`hafif_sanayi` 19. sırada), bot ve istemci tablolarını kaydırırdı (T3 §4.1 tablosu); yöntem yolu yalnız `yontemler[]` ve 3 tür listesine ekleme. Ev sahibi seçimi A2 maliyetine göre (−9.700 ₺, −1 hücre; A2 ZA-3).
- Dosya:satır: `veri/src/tipler.ts:140` (`YontemTanimi`), `veri/icerik/parametreler.json:198-209` (`yapiYuva`), `:210` (`olcekHucre`), `ekonomi/insaat.ts:24` (`tur.yontemler[0]`), `veri/src/kimlik-listesi.ts:157` (`dogrulaKimlikKilidi`; yöntem kilidi §3.5).

**2. Yöntem değişimi bedelsiz ve anlık: "%20 + 6 sa" bedeli G6'da mı, sonra mı?**
- **Karar: G6'da bedelsiz ve anlık kalır; bedel Alfa-1** (GDD §3A.3: yeniden donatım Alfa-0'da ücretsiz). G6'ya ek olarak inşa komutuna **isteğe bağlı `yontem` alanı** girer (§5.8): "değirmen kur" tek adım, bedelsiz değişim ek olarak kalır.
- Gerekçe: bedel eklemek komut sözleşmesini değiştirmez (yalnız kural: kural sürümü dönemi, kolay geri dönüş); G6'ya almak onboarding'e (G9) sürtünme ekler ve A2'nin zincir ekonomisini (bedelsiz değişim varsayımı) bozar.
- Dosya:satır: `ekonomi/komut.ts:78-88` (`yontem_degistir`), `:85` (`yontem bu tesis turunde yok`).

**3. Yeni yöntemler bölge kipinde kapalı olsun mu (`mulkKipi`)?**
- **Karar: evet**; `YontemTanimi.mulkKipi?: true`, `icerikDerle` bölge kipinde tür listelerinden süzer (indeksler sabit), etkisizlik **yöntem izdüşümü** kanıtıyla (§4.1, §5.5, §13 K-1). Kimlik listesi bayrağı ayrıca kilitler (Y7).
- Gerekçe: bayraksız kanıt "botlar seçmiyor" gözlemine (şansa) dayanır; bayrak yapıyla garanti eder.
- Dosya:satır: `derle.ts:27-72` (`icerikDerle`), `:78` (mülk açıklığı), `:30` (`yontemIndeks` tam içerikten), `botlar/src/planlayici.ts` (`yontemAdaylari`), `kurulum.ts:117`, `ekonomi/insaat.ts:24`.

**4. Bayat ekmek → kepek döngüsü ve kepek güvence alıcısı G6'da mı?**
- **Karar: hayır (ikisi de).** Bayat ekmek→kepek döngüsü G6'da yok (baş lider kararı 8; çekirdek bozulma kuralına dokunur). **Güvence alıcı = mevcut NPC dünya pazarı kepek kaydı**; yeni alıcı türü açılmaz; `NpcAlici tur: "kamu"` bu iş için uygun değildir (§5.4). P0 iki tüketici: `kepek_gubresi` + NPC pazarı (+ `sut_kepekli` veri satırı).
- Dosya:satır: `ekonomi/uretim.ts:635` (`bolgeOranlariUygula`, bozulma), `veri/icerik/parametreler.json:50`, `:55` (kepek emilim/arz), `pazar/piyasa.ts:75` (`pazarEmirleriniGerceklestir`), `tipler.ts:903` (`NpcAlici`), `mulk/kasa.ts:320` (`kamuAlici`).

**5. `dukkan` bedeli pencere içeriyor mu? Arsada konut/ticari şartı var mı?**
- **Karar: G7'de dükkân bedeli pencere İÇERİR (P-İthal)** — baş lider kuralı: NPC pencere arzı varsa ithal pencereli bedel; arz VAR (`parametreler.json` `pazar.arzSaat.pencere = 60 000`, `emilimSaat.pencere = 100 000`; doğrulandı: kod okuma). Kırılganlık ve gerçek maliyet açık not (§7.4). **Arsa kullanım türü şartı yok** (fikstürde alan yok).
- Gerekçe: kural gereği; kırılganlık: emir saat tıkında gerçekleşir, elle iptal (doğrulandı: yöntem §2.4); R0(pencere) 540 ₺ (taban 360 ₺: B2) ⇒ gerçek ithalat ≈ 2.400 ₺.
- Dosya:satır: `pazar/piyasa.ts:106` (`hazineVar`), `ekonomi/komut.ts:99-130`, `veri/src/parsel.ts:58-71` (`sinif`, `uygun`, `engel`, `kamu`; kullanım türü yok).

**6. Yerel talep Q: `seviye × uygunHucre` parametresi mi, fikstüre nüfus alanı mı?**
- **Karar (güncel; baş lider onaylı, A2 `241f1b9`):** `Q = talep1000Saat × ilceNufusEsdegeri × yerelOlcek / 1000 × takvim × bayram`; `ilceNufusEsdegeri` = fikstürde isteğe bağlı `ParselIlceTanimi.nufus`, yoksa `ilceSinifiNufus[ParselIlceTanimi.sinif]`; `yerelOlcek` 40; **hücre sınıfı kullanılmaz**; ilçe seviyesi yok (kilitsizlik, Y-33). S-6 kapandı.
- Dosya:satır: `veri/src/parsel.ts:81-104` (ilçe: nüfus alanı yok; isteğe bağlı `nufus` eklenir), `:89` (`sinif`), `tarim/iklim.ts:44` (`takvimAyi`), `mulk/isletme.ts` (düğüm `nufus = 0`). Ayrıntı §4.3, §6.5.

**7. Çekim, su-doldurma ve kasa formülü tamsayı/PPM adımlarıyla ve sıralama kuralıyla.**
- **Karar:** §6.4: A2'nin formülü (`ters`, `kare`, `agirlik`, esnaf ağırlığı, esnaf taban payı, **su-doldurma en çok 32 tur**, tek oyuncu toplamı `Q − floor(Q × tabanPay)` üst sınırı) birebir; kalan birimler sıralı; Ek B test vektörleri V1-V5 (betikle üretildi; çekirdek dışı).
- Dosya:satır: `sabit.ts:42` (`carpBol`, BigInt yedekli), `lojistik/cozum.ts:127` (birim kalıbı).

**8. Yerel satış hangi öncelik katmanında? NPC dünya fiyatını etkilesin mi?**
- **Karar: yeni katman 4a** (ihracattan önce, tesis girdisinden sonra); **NPC dünya fiyatını etkilemez** (`oyuncuArzi/oyuncuTalebi` yerel satışla değişmez; I5 değişmezi).
- Dosya:satır: `ekonomi/uretim.ts:421-483` (`bolgeVerimCoz`), `:455` (`d4`), `pazar/piyasa.ts:117-118`, `:123-135` (`pazarFiyatlari`). Ayrıntı §6.2–§6.3.

**9. Yapı market oyuncu-alıcı G8'de mi? Fiyat komutu `oran` mı kademe mi? Fiyat değişim sınırı G7'de mi?**
- **Karar: oyuncu-alıcı yok** (aklama kanalı; baş lider kararı 7); **fiyat = kademe indeksi (`secim`)**, tutar/oran alanı yok; **hız sınırı G7'de** (`fiyatDegisimEnAzSaat`, DUK-18).
- Dosya:satır: `komutSemasi.ts:14-27` (`AlanTuru`), `:17` (`SISTEM_ALAN_TURLERI`); `para-guvenligi.test.ts` açık liste. Ayrıntı §7, §9.

**10. İthal edip rafa koyma için kamu çarpanı benzeri fiyat tavanı var mı?**
- **Karar: yok; yalnız fiyat bandı** `[0,7; 1,4] R` ve (A2) kademeler ≤ 1,15 R. Stok kaynağa göre ayrılmaz (tembel stok): "ithal rafa tavan" uygulanamaz; ZP11 izler, çare bandın üstünü daraltmaktır. Kamu tavanı yalnız kamu siparişi/şebeke fiyatıdır (şebeke bu tavanı kullanır: §5.2.4).
- Dosya:satır: `mulk/kasa.ts:415-424` (`kamuFiyatTavani`), `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`.

**11. Satış harcı (kasaya pay) var mı? Marka/tabela G7'de mi?**
- **Karar: dükkân satışından harç yok** (kasa yalnız yanan paradan; yerel NPC geliri musluk). **Marka G7'de** (baş lider kararı 4: sınırlı serbest metin; K3'ün "G7 dışı" önerisi değişti), kural §7.7. (Şebeke bedelinin **kasa payı** ayrı bir şeydir ve vardır: §5.2.5.)
- Dosya:satır: `mulk/kasa.ts:94-125`, `:205` (`kasaOranlari`), `tipler.ts:850-851` (`KasaGirisKalemi`).

**12. `ilk_dukkan` tetiği: yapı bitti mi, ilk satış mı?**
- **Karar: ilk satış** (yapı bitti DEĞİL): tamamlanmış `dukkan` ve `dukkanGeliri(d, oyuncu, t) > 0`. Rehber değişmezi: ödül bedelden ucuz alınamasın.
- Dosya:satır: `sunucu/src/odul/dedektor.ts:14`, `:27-29`, `:57-62`, `:158-175`; `veri/icerik/parametreler.json:11`; `istemci/src/harita/baglanti.ts:376`. Ayrıntı §7.8.

### 19.B Baş liderin T3 taslağına karar maddeleri

| # | Madde | Karar | Yer |
|---|---|---|---|
| 1 | Santral / elektrik | **Santral zorunluluğu düştü;** şebeke elektriği (otomatik, yeni komut yok, kamu fiyat tavanı kuralı, ayrı defter satırları). T3 §3.4 ve §4.4'ün santral varsayımı ve "P4 + santral" yatırım satırı **geçersiz** | §5.2 |
| 2 | Yöntem kimlikleri ve sıra | `yontemler[24..29]` T3 §2.2 sırasıyla kabul: `degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli`, `cam_firini`, `celik_dograma`. **Fark:** `cam_firini` ev sahibi `parca_fabrikasi`. Yöntem kimlik listesi makine-denetimli ve yalnız-ekle | §3.2, §3.5 |
| 3 | Ekmek zinciri sayıları | **Yalnız A2 raporundan**; bu belge kopyalamaz (T3'ün A2 ön önerisi satırları A2'nin §1.4/§1.13 satırlarıyla aynı; `cam_firini` ve `celik_dograma` A2'ye göre) | §4.4 |
| 4 | Kepek | İki Ü tüketici: `kepek_gubresi` ve `sut_kepekli`; `sut_kepekli` **veri satırı G6'da**, dengesi P1; `NpcAlici tur: "kamu"` **yeterli değil, yeni alıcı türü açılmaz**: güvence alıcı = mevcut NPC pazar kaydı (doğrulayıcı V13a zorlar) | §5.4 |
| 5 | Kamu siparişi v0 mal listesi | **Kabul (parametre, varsayılan):** `ekmek`, `gida`, `pencere`, `celik`, `parca`. Sabit fiyatlı kamu siparişi kodu **bu şartnamenin kapsamı dışıdır** (kodda sipariş komutu yok); fiyat tavanı kamu tavanıdır (1,035 R: `kamuFiyatTavani`). UA1 sayımında K ancak kodda var olunca sayılır (V13b) | §4.5 V13, §21.A S-11 |
| 6 | Talepsiz yedi raf malı | **Hepsi hane talebine girer** (A2 §1.9 `talep1000Saat`: `un`, `sut`, `findik_urunu`, `yakit`, `celik`, `parca`, `cam`); K1 sepeti toplamı sabit (gıda + ekmek + un + süt + süt ürünü); `cimento` A0'da mal değil, satırı yazılmaz. **Oyuncu-alıcı yok;** yapı market yalnız NPC'ye satar | §4.3, V4 |
| 7 | Süpermarket | A0'da **yok**; `dukkanTurleri` yalnız beş S türü; `olcekHucre [1, 2, 3]` kalır (süpermarket 3 hücre) | §3.3, §0.4 |
| 8 | T3 §11'in 16 sorusu | Tek tek karar/parametre/sahip | §21.B |

## 20. Geri dönüşü zor kararlar

"Zor": canlı durumda ya da protokolde kalıcı iz bırakır, kimlik kilidiyle bağlanır ya da para arzını bir kez yanlış yazınca geri sarılamaz. Her satır baş lider onayı ister (onay yoksa K3 başlamaz). **Kolay geri dönüşlüler** (kilitlemeyin): yöntem oranları ve tarif sayıları (veri; kural sürümü dönemi), `tamCesit`, fiyat bandı, `talep1000Saat`, `giderMiliSaat`, `yerelOlcek`, `cekimCarpaniPpm`, `kasaPayiPpm`, `tavanOraniPpm`, `yontemGecersizKilma`.

| # | Karar | Neden zor | Durum |
|---|---|---|---|
| GZ-1 | **Yöntem, tesis türü değil;** ev sahipleri (`cam_firini` → `parca_fabrikasi`); yöntem sırası `[24..29]` | canlı tesis `tesis.tur` ve `tesis.yontem` **indeksi** taşır; ev sahibi taşınamaz; kimlik listesi kilitler (§3.5) | önerilen, baş lider kararı 1 ve 11 |
| GZ-2 | **Şebeke enerjisi (elektrik + yakıt):** otomatik tedarik, fiyat = **taban × `kamuIthalatCarpaniPpm` × mal başına `tavanOraniPpm` (sabit tamsayı; canlı referans yok)**, bayrak = `mulk.sebeke` bloğu ve mal listesi (genişletilebilir), ledger kalemleri (`lavabo.sebeke`, `kasa.giris.sebeke`), `kasaPayiPpm` 120 000 | para arzı ve sanayi dengesi (santralin rolü, yatırım sırası); defter kalem adları kalıcıdır; yakıtın stoksuz alınması oyuncu stok davranışını değiştirir | baş lider kararı (yakıt kapsamı S-10; referans S-16) |
| GZ-3 | **Fiyat kademesi sayısı ve indeks anlamı** (4 kademe; kampanya indeks 0) | kayıtlı dükkân fiyatları indeksle saklanır; araya kademe eklemek anlamı kaydırır (A2 ZA-6) | baş lider onaylı (0,85 / 0,95 / 1,05 varsayılan / 1,15) |
| GZ-4 | **Yerel talep kimliği:** `talep1000Saat` × `ilceNufusEsdegeri` (isteğe bağlı fikstür `nufus`, yoksa sınıf sabiti) × `yerelOlcek` × takvim grubu × bayram; **ParselIlceTanimi.nufus? fikstür alanının şemaya girmesi** (yalnız ekleme) | arsa fiyat beklentileri ve dükkân kararları buna dayanır (A2 ZA-5); fikstür şeması ve grup adları, formül biçimi kalıcı | baş lider onaylı (A2 `241f1b9`) |
| GZ-5 | **R tanımı:** `d.pazar.fiyat[m]` (R0 ≠ taban) | bütün oran/bant/tavan R'ye göre yazıldı | önerilen |
| GZ-6 | **Öncelik katmanı 4a** (ihracattan önce) | stok kıtken kimin payı kaybettiği oyun dengesidir | önerilen |
| GZ-7 | **Defterde isteğe bağlı/tembel kalemler** (`yerelNpc`, `lavabo.sebeke`, `kasa.giris.sebeke`) | para defteri şeması; bir kez yanlışsa eski görüntüler yüklenemez | önerilen |
| GZ-8 | **Marka çekirdek durumunda** (sınırlı serbest metin; durumda kanonik küçük harf, `adKanonik`) + yasaklı liste sunucuda | günlükte girilen metin açık kalır (KVKK); replay determinismi sabit tablo ile; tablo/`kucukHarf` kural dönemi kararı | baş lider kararı 4 ve S-12 varsayılanı; KVKK görüşü ve sahip kararı S-12 |
| GZ-9 | **`AlanTuru += "metin"`** (`SISTEM_ALAN_TURLERI`'ne girmez) | komut sözdizimi kalıcı; sistem/ajan yoluna metin ASLA | önerilen |
| GZ-10 | PRNG akışı ve `ilce_gunluk` olayı **yok**; çözüm tek geçiş | sonradan eklemek özeti ve PRNG kuyruğunu değiştirir | önerilen |
| GZ-11 | Alfa-0 sadeleştirmeleri (çeşit anlık, esnaf payı anlık, η yok) | kural sürümü dönemi; geri alınabilir ama bot/ölçüm altınları yeni kurala dayanır | önerilen |
| GZ-12 | **`acikOlcekler` = dünya zamanlaması** (oyuncu kilidi değil) | "kilit yok" ilkesiyle sınırı ince | önerilen; T-43 |
| GZ-13 | **`dukkanTuru` alanı** (`tesis_insa_hucre`/`yapi_yerlestir`) | komut sözleşmesi | önerilen |
| GZ-14 | **`ilk_dukkan` = ilk satış** | ödül ekonomisi ve rehber | önerilen |
| GZ-15 | **Dükkân bedelinde pencere:** NPC pencere arzı var ⇒ G7'de ithal pencereli bedel (baş lider kuralı); geçiş veri değişikliğidir (§7.4) | yalnız veri; mevcut dükkânlar ödenmiş; kırılgan ithalat akışı ilk dükkân deneyimini etkiler | baş lider kuralı |
| GZ-16 | Sayı sınırları (ilçe başına 2 dükkân, il başına 6, marka 3) | yeni sınır eklemek kolay, gevşetmek hakları açar | önerilen |
| GZ-17 | **`yontem?` inşa komutu alanı** (§5.8) | komut sözleşmesi; `InsaatDurumu.yontem`; protokolde yalnız ekleme (nesne alanı), geriye uyum testi | **kabul (baş lider)** |
| GZ-18 | **`mulkKipi` bayrağı** ve `mulk.yontemGecersizKilma` şeması (`ciktiPpm`) | `YontemTanimi`/`MulkParametreleri` alan kalıcı; çarpan çıktıya uygulanır (girdiye değil) | baş lider kararı 2 ve 13 |
| GZ-19 | **G6-3 sonrası ölçüm temel çizgisi yeniden alınır** (`mulk.sebeke` ile mülk kipi kuralı değişir: santralsiz tesis üretir) | `kuralSurumu` artar; mülk altınları tek commit'te yeni değerle; parsel-v1 ve bakım ölçümleri önceki raporlarla birebir karşılaştırılmaz; **bölge kipi altınları birebir** | baş lider (kabul) |
| GZ-20 | **`dukkan_yik` komutu** (iade yok; arsa oyuncuda; yalnız dükkân) | komut sözleşmesi; "yıkımda iade yok" kuralı para dengesini sabitler; diğer yapılara genelleme sonraki sprint | baş lider kararı |

## 21. Açık sorular

### 21.A Açık sorular (sahip / baş lider / A2)

| # | Soru | Varsayılan (K3 bunu uygular) | Kime |
|---|---|---|---|
| S-1 | ~~G2 tetiği~~ **KAPANDI (baş lider):** X = %30 (A2'nin M ölçütü); tesis tabanı kural DEĞİL; G2 yalnız yedek (varsayılan kapalı) | çarpan kapalı | kapandı |
| S-2 | ~~Santral ekonomisi~~ **KAPANDI** (baş lider kararı: santral isteğe bağlı, yalnız hidroda ve yüksek yükte kârlı, "daha ucuz" vaadi yok, fiyat/maliyet değişmez) | - | kapandı |
| S-3 | **Açılış Tezgâhı** (`tezgah`) P1 mi A1 mi | G7'de yok (parametre/tür kaydı eklenmez); **sahip listesinde, G7'yi bekletmez** | sahip (T-39) |
| S-4 | ~~`kasaPayiPpm` değeri~~ **KAPANDI:** A2 §1.3-B1 = 120 000 (%12); kasa = floor(ödeme × pay / 1e6), lavabo = ödeme − kasa | 120 000 | kapandı |
| S-5 | ~~Şebeke kapasite sınırı~~ **KAPANDI (baş lider):** sınır yok | sınır yok | kapandı |
| S-6 | ~~Talep ilçe büyüklüğüne bağlansın mı~~ **KAPANDI (baş lider, A2 `241f1b9`):** isteğe bağlı fikstür `nufus` alanı, `yerelOlcek` 40, alan yoksa sınıf sabiti (`ParselIlceTanimi.sinif`); hücre sınıfı kullanılmaz. **Açık kalan (sahip/O3):** gerçek nüfus kaynağı ve lisansı (TÜİK ADNKS; hukuki görüş) | alanlı ve alansız iki yol | kapandı (kaynak: O3, sahip) |
| S-7 | ~~M erken açılış (`acikOlcekler`, T-43)~~ **KAPANDI (baş lider):** `[0]`. **`acikOlcekler` yalnız dükkân ölçeği içindir ve bir özellik açılış zamanlamasıdır; e1080dd'deki fabrika/tesis ölçek serbestliğini (doğrudan M/L kurulum) etkilemez.** | `[0]` | kapandı |
| S-8 | **Bayram sınır günü ve tarihler:** `oncesi` penceresi `[B − Do, B − 1]`, `sonrasi` penceresi `[B, B + Ds − 1]` (bayram günü sonrasında); resmî bayram tarihleri (doğrulanmadı) | bayram listesi **boş geçerlidir** (parametre; V9 boş listeyi kabul eder); tarih listesi T3'te sonradan eklenir; **sahip listesinde, G7'yi bekletmez** | A2 (sınır), T3 (tarih) |
| S-9 | ~~Bakım ve aşınma kalibrasyonu~~ **KAPANDI (baş lider):** bu sprintte karar yok; G4 dışı; şema rezervi gerekmez (A2 eab8fcc §2: öneri C, ×0,50 ve tavan %25, O2 ölçümü sonrası) | - | kapandı |
| S-10 | ~~Yakıt şebekeden otomatik~~ **KAPANDI (baş lider):** elektrik ve yakıt şebekeden (§5.2.2b; mal listesi `mallar[]`) | kapsamda | kapandı |
| S-11 | **Kamu siparişi v0** değerleri **onaylı** (A2 §1.9, §1.13 `kamuSiparisi`): mallar `ekmek`, `gida`, `pencere`, `celik`, `parca`; fiyat 1,03 R; boyutlar 100/50/10/30/20; ilçede haftada ≤ 5; vade 3 gün; `kasaPayiPpm` %12. **Sipariş kodu ve şeması sonraki sprintte** (bu şartnamenin dışı); değerler durur | veri taslağı A2'de | kapandı (kod: sonraki sprint) |
| S-12 | **Büyük harf** (marka ve görünen ad için AYNI çözüm) ve **KVKK** hukuki görüşü | **varsayılan: küçük harf (baş lider); sahip kararı bekler:** girişte büyük harf izinli, küçük harfe sabit tabloyla çevrilip saklanır (`adKanonik`, §7.7; `toLowerCase` yok). Sahip "serbest" derse yalnız `AD_KURALI.kucukHarf = false` | sahip, hukuk |
| S-13 | ~~G8'de dükkân bedeline pencere~~ **KAPANDI (baş lider kuralı):** NPC pencere arzı var ⇒ G7'de ithal pencereli bedel (P-İthal); G8'de değişiklik yok | P-İthal | kapandı |
| S-14 | ~~`yontem?` inşa alanı~~ **KAPANDI (baş lider):** kabul; protokolde yalnız ekleme (nesne alanı), geriye uyum testi (§16.1); protokol kısmı K2, sırayı Kod lideri belirler | alınır | kapandı |
| S-15 | ~~A2 commit SHA'sına atıf bağlama~~ **KAPANDI:** `eab8fcc` (A2 §2 bakım sonraki commit'te) | - | kapandı |
| S-16 | ~~Şebeke fiyat referansı~~ **KAPANDI (baş lider):** TABAN (yakıt 103,5 ₺); `canli` yolu kodda yok; `fiyatReferansi` alanı şemada yok | taban | kapandı |
| S-17 | ~~Zincir +%33,6 K/U bandının üstünde~~ **KAPANDI (baş lider):** fırın çıktısı 240 (+%21,2) | 240 | kapandı |
| S-18 | ~~Kampanya sim haftası~~ **KAPANDI (baş lider):** hafta = sim haftası (`floor(gun/7)`), gün sınırı 00:00 TRT; oyuncuya yalnız "bu hafta kalan gün" gösterilir (§7.5b) | kabul | kapandı |
| S-19 | ~~Dükkân yıkımı~~ **KAPANDI (baş lider):** `insaat_iptal` (%50) inşa sürerken; tamamlanmış dükkân `dukkan_yik` ile yıkılır, **iade yok**, arsa oyuncuda; yalnız `dukkan` (diğer yapılar sonraki sprint) | `dukkan_yik` (§7.9) | kapandı |

### 21.B T3 §11'in 16 sorusu (tek tek)

| T3 # | Soru | Sonuç | Tür |
|---|---|---|---|
| 1 | Yöntem mi tür mü | **yöntem** (baş lider 1) | karar |
| 2 | Yöntem seçimi akışı | **inşa komutunda isteğe bağlı `yontem?`**; `yontem_degistir` bedelsiz kalır. Görüş: kurulumdan sonra değişimden üstün (inşa saatlerce sürerken yanlış yöntemle çalışmaz; tek adım UX); maliyet küçük ve isteğe bağlı (§5.8) | karar (baş lider kabul; S-14 kapandı) |
| 3 | `cam_firini` ev sahibi | **`parca_fabrikasi`** (A2 maliyeti −9.700 ₺, −1 hücre; ev sahibi görünen ad taşımaz; `celikhane` tavanı korunur) | karar |
| 4 | A2 ön önerisi mi rapor değerleri mi | **A2** (tek kaynak); `standart_gida_isleme` ile ilişki §5.9 | karar |
| 5 | Kepek ikinci tüketici | **`kepek_gubresi`**; `besi_kepekli` düştü; yeni `NpcAlici` türü yok | karar |
| 6 | `sut_kepekli` G6'da mı | **veri satırı G6'da**, dengesi P1 (indeks 27 sabit) | karar |
| 7 | Dükkân pencere bedeli | **G7: ithal pencereli bedel (P-İthal)**; NPC pencere arzı var (baş lider kuralı) | karar (S-13 kapandı) |
| 8 | `tezgah` | G7'de yok | sahip (S-3) |
| 9 | `tamCesit` A0 değerleri | mal sayısına çekilir (sarkuteri 3, sekerci 2, yapi_market 4; bakkal 6, firin 2); V8 `tamCesit ≤ mallar.length` | parametre (varsayılan bu) |
| 10 | Raf–talep eşleşmesi | yedi malın hepsi hane talebine girer (A2 §1.9); oyuncu-alıcı yok | karar |
| 11 | Kamu siparişi v0 listesi | `ekmek`, `gida`, `pencere`, `celik`, `parca` | parametre (varsayılan bu; S-11) |
| 12 | İlçe nüfusu kaynağı | isteğe bağlı fikstür `ParselIlceTanimi.nufus`; yoksa sınıf başına nüfus eşdeğeri (A2 `241f1b9`) | karar (S-6 kapandı); gerçek nüfus kaynağı: O3, sahip |
| 13 | Yapı market oyuncu-alıcı | **yok** (baş lider 7) | karar |
| 14 | Süpermarket A0 verisinde | **hayır** (beş S türü) | karar |
| 15 | Çıkmaz mal (P4/P5 dışı): uyarı mı hata mı | **uyarı** (A0); `CIKMAZ_MAL_HATA = false`, P1 teslim kapısı `true` yapar; yan ürün (kepek, gübre) kuralı **hata** (V13) | karar |
| 16 | Yöntem sayısı sınırı (tür başına ≤ 10) | **uyarı** (Y8, > 10); seçici/ayrı tür A1 işidir | parametre (uyarı eşiği 10); A1 kararı sahip |

## Ek A. Değişen dosya ve fonksiyonlar (`dosya:satır`, taban `d28447d`)

> G6, G7 ve G8 satırları.

### A.1 G6: `packages/veri` (K3: şema, doğrulayıcı, test; T3: yalnız JSON)

| Dosya | Değişiklik |
|---|---|
| `veri/src/tipler.ts:140` `YontemTanimi` | `mulkKipi?: true` |
| `veri/src/tipler.ts:627` `MulkParametreleri` | `sebeke?: MulkSebekeParametreleri`, `yontemGecersizKilma?: MulkYontemGecersizKilmaParametreleri`, (G7) `perakende?` |
| `veri/src/sema.ts:142` `yontemSema`; `:415` `mulkSema` | `mulkKipi: z.literal(true).optional()`; `sebeke` ve `yontemGecersizKilma` şemaları (`.strict()`) |
| `veri/src/dogrula.ts:245` `dogrulaIcerik` (`:358` kullanılmayan yöntem kuralı yanında) | `mulkKipi` kuralları (§4.1); `dogrulaParametreler` (`:558`) `sebeke` ve `yontemGecersizKilma` aralıkları |
| `veri/src/kimlik-listesi.ts` (`:157` `dogrulaKimlikKilidi`; `KimlikListesiSema`; `kimlikListesiHatalari`; `kimlikKilidiHatalari`) | `yontemler` bölümü, Y1–Y8, `KimlikKilidiGirdisi.yontemler`, `dukkanTurleri` geçişi |
| `veri/src/perakende-dogrula.ts` (YENİ; Node-only; `yukle.ts:48` çağırır) | V13 (çıkmaz mal; G6'da `kepek`/`gubre` yan ürün kuralı), V14 (`sebeke`), V15 (oran bandı uyarısı), V16, V17 (`yontemGecersizKilma`); `perakende` kuralları G7'de |
| `veri/src/yukle.ts:48` | `dogrulaPerakende` çağrısı (uyarılar yazdırılır, hata paketi reddeder) |
| `veri/icerik/{icerik,parametreler,kimlik-listesi}.json` | **T3** (G6-3) |
| testler | §16.1 |

### A.2 G6: `packages/cekirdek/src` (K3)

| Dosya:satır | Değişiklik |
|---|---|
| `derle.ts:27-72` `icerikDerle`, `:78` | `bolgeKipiTurleri` süzgeci (`mulkAcik` önce hesaplanır) |
| `derle.ts:114-198` `mulkDerle` | `DerlenmisMulk.sebeke`, `.yontemCiktiPpm` (etkinse); (G7: `.perakende`) |
| `tipler.ts:80-114` `DerlenmisMulk` | yukarıdaki alanlar |
| `tipler.ts:222-237` `BolgeElektrikDurumu` | `sebekeMili?: Mili` |
| `tipler.ts:476-503` `InsaatDurumu` | `yontem?: string` |
| `tipler.ts:842-896` `MuslukKalemi`…`ParaAkisi`, `KasaDurumu` | `LAVABO_ISTEGE_BAGLI`, `KASA_GIRIS_ISTEGE_BAGLI`; `ParaDurumu.lavabo` tipi `Record<LavaboKalemi, ParaSayaci> & { sebeke?: ParaSayaci }`; `KasaDurumu.giris` `& { sebeke?: ParaSayaci }`; `ParaAkisi.sebeke?: Mili`; `KasaGirisKalemi` + `"sebeke"` birliği (zorunlu liste `KASA_GIRIS_KALEMLERI` değişmez) |
| `tipler.ts:966-975` `MulkKomutu` ve `:638-674` `Komut` | `tesis_insa_hucre` ve `yapi_yerlestir`'e `yontem?: string` |
| `komutSemasi.ts:60,62` | iki girişe `yontem: "kimlik"` |
| `ekonomi/uretim.ts:31-88` `BolgeHesabi`, `:117-187` `hesapAl` | `sebekeMili: Mili` (geçici; sıfırla) |
| `ekonomi/uretim.ts:381-410` `elektrikUygula` | `sebeke` parametresi ve açık hesabı (§5.2.2); çağrılar `:436`, `:517` |
| `ekonomi/uretim.ts:338`, `:501`, `:521-529`, `:640-654` | stoksuz mallar (yakıt): Y-a…Y-d (§5.2.2b); `BolgeHesabi.sebekeStoksuz` |
| `tipler.ts:238` `BolgeDurumu` | `sebekeTuketim?: Record<string, Mili>` |
| `ekonomi/uretim.ts:421` `bolgeVerimCoz` | `sebeke` bağlamını kurar |
| `ekonomi/uretim.ts:596-603` `bolgeDurumunaYaz` | `b.elektrik.sebekeMili` |
| `ekonomi/uretim.ts:204-222` `ciktiCarpaniHesapla` | `yontemCiktiPpm` (§5.9) |
| `lojistik/cozum.ts:73-81` `ParaBilesenleri`, `:91-181` `hazineKalemleri` (`:127`, `:176`, `:180`) | `sebeke`, `sebekeIlce`; `isletmeGideri = gider − ithalat − sebeke`; bedel döngüsü |
| `lojistik/cozum.ts:293-308` | `paraAkisiYaz({ …, sebeke, kasa: kasaOranlari(…, sebekeIlce) })` |
| `mulk/kasa.ts:94-125` `paraMuhasebesi` | `sebeke` kolu, lazy kalemler (§5.2.5) |
| `mulk/kasa.ts:133-159` `paraAkisiYaz` | `sebeke` alanı ve eşitlik dalı |
| `mulk/kasa.ts:205` `kasaOranlari` ve `kasaOranlariHesapla`, `KasaOnbellegi` | `sebekeIlce` girdisi ve önbellek anahtarı |
| `mulk/kasa.ts:47`, `:56` (`kasaAl`, `kasaToplam`) | `giris.sebeke` toplama (kurma **değil**) |
| `derle.ts:114-198` `mulkDerle` (şebeke) | `DerlenmisSebeke.*.birimFiyatMili = taban × kamuIthalatCarpaniPpm × tavanOraniPpm` (derleme zamanı; ayrı fiyat işlevi yok) |
| `mulk/komut.ts:262-279` `yapiTuruCoz`, `:468-495` `yapiUygula`, `:514` | `yontem` alanı denetimi ve `ins.yontem` yazımı |
| `ekonomi/insaat.ts:24` | `insaat.yontem` varsa o, yoksa `tur.yontemler[0]` |
| `serilestir.ts:392` (insaatlar), `:478-505` `paraDogrula`, `:493-494`, `:568-584` (`paraAkisi`), `:681-` `dunyaIcerikUyumu` | §11.1 satırları |
| `paraSayac.ts:54-60` | **değişmez** (kalem yaratılmaz) |
| `goc.ts:38-46` `icerikKimlikTablosuOlustur` | değişmez (tam içerik) |

### A.3 G6: diğer paketler

| Dosya:satır | Sahip | Değişiklik |
|---|---|---|
| `protokol/src/komut-sema.ts:62-71` | K2 | `yontem: kimlik.optional()` (K3 ile aynı birleştirme) |
| `sunucu/src/odul/dedektor.ts` | K2 | doğrulama testi; kod değişmez |
| `sunucu/src/yazar.ts:363,385,1318` | K2 | `kuralSurumu` göçü G6-3 sonrası |
| `istemci/src/harita/hata-mulk.ts` | K1 | §9.3 çevirileri |
| `botlar/src/parsel.ts:105-109,392,470`, `onayarlar.ts:77` | O2 | §15.1 |

### A.4 G7: `packages/veri` ve `packages/cekirdek/src` (K3)

| Dosya:satır | Değişiklik |
|---|---|
| `veri/src/tipler.ts:577` `MulkEkYapiTanimi`; `:627` `MulkParametreleri` | `olcekHucre?: [n, n, n]`; `perakende?: MulkPerakendeParametreleri` (§4.3) |
| `veri/src/sema.ts:364` `mulkEkYapiSema`, `:415` `mulkSema` | `olcekHucre`; `perakende` şeması (kampanya parametreleri dahil) |
| `veri/src/dogrula.ts:537-551` | `olcekHucre` kuralı (`[0] === yuva`, artan, ≤ 5) |
| `veri/src/perakende-dogrula.ts` (G6'da açılır) | V1-V12, V15, V16 (`perakende`) |
| `tipler.ts:303` `EkYapiDurumu` | `dukkan?: DukkanDurumu` (`tur`, `olcek`, `marka?`, `raf`, `kampanya?`, `baslangic`, `kurulus`) |
| `tipler.ts:773-797` `MulkOyuncuDurumu` | `markalar?`, `dukkanGeliri?`, `ilkSatisT?` |
| `tipler.ts:476-503` `InsaatDurumu` | `dukkanTuru?: string` |
| `tipler.ts:238` `BolgeDurumu` | `yerelKarsilanmaPpm?: number` |
| `tipler.ts:842-896` | `MUSLUK_ISTEGE_BAGLI = ["yerelNpc"]`; `ParaDurumu.musluk` `& { yerelNpc?: ParaSayaci }`; `ParaAkisi.yerel?: Mili` |
| `tipler.ts:638-674`, `:966-975` `Komut`, `MulkKomutu` | `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`, `dukkan_yik`, `marka_sifirla`; `dukkanTuru?` |
| `komutSemasi.ts:14,17,27-64` | `AlanTuru += "metin"` (`SISTEM_ALAN_TURLERI`'ne eklenmez); altı giriş |
| `derle.ts:114-198` `mulkDerle` | `DerlenmisPerakende` (§4.6), `ilceNufus`, `talepTaban` (ilçe → mal; `ilceNufusEsdegeri`) |
| `veri/src/parsel.ts:~89` `ParselIlceTanimi`, `ilceSema` (`:~191` yanı), `parselFiksturuDogrula` (`:~242`) | `nufus?: number` isteğe bağlı (V9b) |
| `ekonomi/uretim.ts:31-88`, `:117-187`, `:236`, `:362`, `:421-483`, `:531`, `:660-668` | `BolgeHesabi.dukkan/dukkanGercek/frD`; `bolgeHesapla(…, yerel)`; katman 4a; `bolgeOranlariUygula` `dukkanGercek`; `bolgeDurumunaYaz` `yerelKarsilanmaPpm` |
| `lojistik/cozum.ts:228-308`, `:73-81`, `:91-181` | `yerelPazarHesapla` çağrısı; `ParaBilesenleri.yerel`; `hazineKalemleri` gelir ve dükkân gideri |
| `mulk/perakende.ts` (YENİ) | `yerelPazarHesapla`, `yerelPazarGorunumu`, `dukkanGeliri`, `dukkanlar`, `etkinKademe`, kampanya, `ilcedeDukkanSayisi`, `perakendeKomutu` (5 komut) |
| `mulk/marka.ts` (YENİ), `ad.ts` (YENİ; `cekirdek/src/ad.ts`) | marka komutları; `adSozdizimiHatasi`, `adKanonik` (sabit küçük harf tablosu), `AD_KURALI` (§7.7) |
| `mulk/komut.ts:262-279`, `:321-382`, `:468-495`, `:497`, `:514`, `:582` | `yapiTuruCoz` (`olcekHucre`, `dukkanTuru`), `yapiPlani` (ek yapı ölçek çarpanı, ilçe sınırı), `yapiUygula` (`ins.dukkanTuru`), `mulkKomutu` switch |
| `mulk/yapi.ts:54-83` `ekYapiTamamla` | `dukkanVarsayilani` (`baslangic`, `kurulus`) |
| `mulk/kasa.ts:94-159` | `paraMuhasebesi`: `a.yerel` ⇒ `musluk.yerelNpc` + `dukkanGeliri`; `paraAkisiYaz`: `yerel`, `ilkSatisT` |
| `motor.ts:182-185`, `:203-249` | `marka_sifirla` (`sistem_odul` yanına); `yonlendir` kapsayıcılık |
| `serilestir.ts:327-336`, `:392`, `:478-505`, `:522-585`, `:681-` | `dukkan`, `kampanya`, `markalar`, `yerelNpc`, `ParaAkisi.yerel`, `dunyaIcerikUyumu` (§11) |

### A.5 G7/G8: diğer paketler

| Dosya:satır | Sahip | Değişiklik |
|---|---|---|
| `protokol/src/komut-sema.ts:24-82` | K2 | 6 yeni komut + iki `dukkanTuru`/`yontem` alanı; `_KomutDenetimi` aynı kapı |
| `protokol/src/kare.ts` | K2 | `GenelBolgeKaresi.dukkanlar?`, `OzelBolgeKaresi.dukkanlar?`, `OzelBolgeKaresi.sebeke?`, `OyuncuKaresi.markalar?` (§10.2) |
| `sunucu/src/odul/dedektor.ts:14,27-29,57-62,158-175` | K2 | `ilk_dukkan` = ilk satış |
| `sunucu/src/donus/{anlik,ozet,izleyici}.ts` (`anlik.ts:27-29`, `ozet.ts:76`, `izleyici.ts:95-104`) | K2 | "sen yokken" `satis` = ihracat farkı + dükkân geliri farkı |
| `sunucu/src/ad-suzgec.ts` (YENİ), `yazar.ts:363,385` | K2 | ortak ad süzgeci; `kuralSurumu` göçü |
| `istemci/src/komut/gizli.ts:11,19`, `test/komut.test.ts:92-117`, `harita/hata-mulk.ts`, `harita/baglanti.ts:376` | K1 | §10.4 |
| `veri/icerik/yasakli-adlar.json` (YENİ) | T3 | §7.7 |

## Ek B. Çekim hesabı test vektörleri

> Vektörler betikle üretildi ve doğrulandı (doğrulandı: `cekim.mjs` BigInt referansı); algoritmanın metni §6.4'te. Bu ek çekirdek DIŞI bir referans uygulamadır: K3 testleri vektörleri sabit olarak gömer, betiği çalıştırmaz.

**Yöntem:** aşağıdaki referans betik (BigInt, `floor(a·b/c)`), `Math.pow/sqrt` yok; Alfa-0 ölçeğinde `cekimCarpaniPpm = 1 000 000` (S). Girdi birimleri mili-birim/saat; `p` = fiyat kademesi çarpanı (ppm); `esnaf.fiyatPpm = 1 120 000`, `tabanPayPpm = 250 000`, `cesitKatsayiPpm = 250 000`. (doğrulandı: yöntem)

| Vektör | Girdi | Beklenen çıktı (`s` = yuva başına istek, mili-birim/saat) |
|---|---|---|
| **V1** (kasa bağlayıcı değil; iki dükkân, tek mal) | `Q[ekmek] = 300 000`; A: `p = 1 000 000`, `tamCesit 2`, 1 dolu yuva; B: `p = 1 080 000`, `tamCesit 2`, 1 dolu yuva; `kasa = 900 000` | `w_A = 1 125 000`, `w_B = 964 504`, `w_esnaf = 797 193` (kare: 1 000 000 / 857 337 / 797 193; çeşit çarpanı 1 125 000); `esnafPay = 276 160`; `esnaf = 82 848`; `P = 217 152`; **`s_A = 116 916`** (116 915 + kalan 1), **`s_B = 100 236`** |
| **V2** (tek dükkân, kasa kırpması) | `Q[ekmek] = 300 000`; A: `p = 1 050 000`, `tamCesit 1`; `kasa = 90 000` | `w = 1 133 783`; **`s_A = 90 000`** |
| **V3** (kasası dolan dükkânın payı diğerine kayar: su-doldurma) | `Q[ekmek] = 300 000`; A: `kasa = 50 000`; B: `kasa = 90 000`; ikisi `p = 1 050 000` | **`s_A = 50 000`**, **`s_B = 90 000`** (B'nin payı A'nın taşan talebiyle büyür; kasada kırpılır) |
| **V4** (çok mal, dükkân başına toplam kasa) | `Q[ekmek] = 300 000`, `Q[gida] = 540 000`; A: `ekmek` ve `gida` (`p = 1 050 000`), `tamCesit 2`; B: `ekmek` (`p = 950 000`), `tamCesit 2`; `kasa = 90 000` (ikisi) | A: `ekmek 22 715` + `gida 67 284` (toplam 89 999 ≤ 90 000); B: `ekmek 90 000` |
| **V5** (`Qr ≤ 0` tur adımı birim vektörü; tam algoritma bu duruma ulaşamaz, kural savunmadır) | `turPayi(Qr, [w_A, w_B], w_esnaf, tabanPayPpm)`: `w_A = 1 125 000`, `w_B = 964 504`, `w_esnaf = 797 193`, `tabanPayPpm = 250 000`; `Qr ∈ {0, −7, 300 000}` | `Qr = 0` → **`[0, 0]`**; `Qr = −7` → **`[0, 0]`** (eski tur payı taşınmaz); `Qr = 300 000` → `[116 916, 100 236]` (V1 ile aynı) |

**`Qr` ulaşılamazlık taraması (doğrulandı: yöntem, betik):** `Qr ≤ 0` dalı 300 000 rastgele küçük girdiyle (`Q` 1–400 mili, 1–2 mal, 1–4 dükkân, 1–2 yuva, kasa 0–60, fiyat 700 000–1 400 000, esnaf 0,9–1,4 R, taban pay %25–%65) koşuldu: **0 isabet**; V1–V4 sonuçları kural değişikliğinden ÖNCEKİ betikle **birebir aynıdır** (değişen vektör yok). K3 değişmez testi (§16.2 `perakende-cekim`): her turda `Qr ≥ 1`; V5 yalnız tur adımının `Qr ≤ 0` dalını sabitler.

**Referans uygulama (çekirdek dışı; algoritma §6.4'ün birebir karşılığı; `Qr ≤ 0` kuralı `turPayi` içindedir):**

```js
const PPM = 1_000_000n;
const cb = (a, b, c) => (a * b) / c;          // floor(a·b/c), BigInt (negatif girdi yok)
// Tek (ilçe, mal) turunun oyuncu payı: Qr <= 0 ise HERKES SIFIR (eski tur payı taşınmaz); aksi halde esnaf tabanlı oyuncu havuzu ağırlıkla bölünür, kalan birimler sıralı +1.
function turPayi(Qr, ws, wE, tabanPayPpm) {
  if (Qr <= 0n) return ws.map(() => 0n);
  const sw = ws.reduce((a, w) => a + w, 0n);
  const pay0 = cb(wE, PPM, sw + wE);
  const esnafPay = pay0 > tabanPayPpm ? pay0 : tabanPayPpm;
  const P = Qr - cb(Qr, esnafPay, PPM);
  const s = ws.map((w) => cb(P, w, sw));
  let kalan = P - s.reduce((a, x) => a + x, 0n);
  for (let i = 0; kalan > 0n; i++, kalan--) s[i] += 1n;
  return s;
}
function cekim({ Q, dukkanlar, esnaf, cesitKatsayiPpm, tabanPayPpm, enCokTur = 32 }) {
  // Q: {mal: BigInt}; dukkanlar: [{ad, kasa, olcekCarpanPpm, tamCesit, yuvalar:[{mal, p}]}]
  const ters = (p) => cb(PPM, PPM, p);
  const kare = (x) => cb(x, x, PPM);
  const wE = kare(ters(esnaf));
  for (const d of dukkanlar) {
    const dolu = BigInt(d.yuvalar.length);
    d.cesit = dolu >= d.tamCesit ? PPM : cb(dolu, PPM, d.tamCesit);
    for (const y of d.yuvalar) {
      const k = kare(ters(y.p));
      y.w = cb(cb(k, PPM + cb(cesitKatsayiPpm, d.cesit, PPM), PPM), d.olcekCarpanPpm, PPM);
      y.s = 0n;
    }
    d.donuk = false;
  }
  const mallar = Object.keys(Q).sort();
  const sabit = Object.fromEntries(mallar.map((m) => [m, 0n]));
  for (let tur = 0; tur < enCokTur; tur++) {
    for (const m of mallar) {
      const L = [];
      for (const d of dukkanlar) if (!d.donuk) for (const y of d.yuvalar) if (y.mal === m && y.w > 0n) L.push(y);
      const Qr = Q[m] - sabit[m];
      if (L.length === 0) continue;
      const pay = turPayi(Qr, L.map((y) => y.w), wE, tabanPayPpm);
      L.forEach((y, i) => { y.s = pay[i]; });
    }
    const yeni = [];
    for (const d of dukkanlar) {
      if (d.donuk) continue;
      const top = d.yuvalar.reduce((a, y) => a + y.s, 0n);
      if (top > d.kasa) yeni.push([d, top]);
    }
    if (yeni.length === 0) break;
    for (const [d, top] of yeni) {
      for (const y of d.yuvalar) { y.s = cb(y.s, d.kasa, top); sabit[y.mal] += y.s; }
      d.donuk = true;
    }
    if (tur === enCokTur - 1) break;
  }
  // son geçiş: hâlâ kasa aşan (32 tur dolduysa) orantılı kısılır
  for (const d of dukkanlar) {
    const top = d.yuvalar.reduce((a, y) => a + y.s, 0n);
    if (top > d.kasa) for (const y of d.yuvalar) y.s = cb(y.s, d.kasa, top);
  }
  for (const m of mallar) {
    const limit = Q[m] - cb(Q[m], tabanPayPpm, PPM);
    let t = 0n;
    for (const d of dukkanlar) for (const y of d.yuvalar) if (y.mal === m) t += y.s;
    if (t > limit) for (const d of dukkanlar) for (const y of d.yuvalar) if (y.mal === m) y.s = cb(y.s, limit, t);
  }
  return dukkanlar.map((d) => ({ ad: d.ad, yuvalar: d.yuvalar.map((y) => ({ mal: y.mal, w: String(y.w), s: String(y.s) })) }));
}
```
