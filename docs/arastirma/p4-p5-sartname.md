# P4/P5 uygulama şartnamesi (G4): ekmek zinciri, yerel pazar kanalı, dükkân, şebeke elektriği ve cam → pencere

> **Durum.** 1 Ekim 2026, Sprint A0-02, görev G4 (Ar-Ge, A3). Taban: `entegrasyon` = `d28447d`; bütün `dosya:satır` göndermeleri bu tabana göredir. Bu belge kod yazmaz; K3'ün (çekirdek, tek yazar) **yorum yapmadan** kodlayabileceği kesinlikte şartnamedir. Baş lider onayı olmadan çekirdek işi başlamaz (docs/10 §5A).
>
> **Girdiler ve atıf biçimi.**
> - **A2** (sayıların tek kaynağı): `docs/arastirma/p4-p5-ekonomi.md`, dal `takim/a2/p4-p5-ekonomi`, **commit `afdf29f`** (ara teslim; §1 sonraki commit'te değişmeyecek, yalnız §2 bakım gelecek). `A2 §n` = o raporun bölümü. Bu belge sayıları **kopyalamaz**: yapı, parametre adı ve şema kesindir; değerleri T3 A2'nin §1.4, §1.9 ve §1.13 bloklarından işler. (Atıf haritası: §1.3-B1 şebeke/santral/kasa payı; §1.3-B2 zincir ↔ standart ve tetik; §1.3-B3 NPC derinliği; §1.4 yöntem satırları; §1.6 kepek; §1.7 yapı; §1.8 süre; §1.9 dükkân/kademe/talep/kamu tavanı/kamu siparişi; §1.10 `yerelNpc` ve `lavabo.sebeke`; §1.11 çıkmaz mal; §1.12 senaryo ve ev sahibi; §1.13 veri; §1.14 T3 sapmaları.) İki istisna: şemayı açıklayan örnek değerler ve test vektörleri (Ek B; çekirdek dışı betikle üretildi).
> - **T3** (içerik taslağı): `takim/t3/p4-p5-icerik`, commit `0561728`, `docs/arastirma/p4-p5-icerik-taslagi.md` (621 satır; `git show` ile okundu). `T3 §n` = o belgenin bölümü. T3'ün sekiz karar maddesi §19.B'de, 16 açık sorusu §21.B'de tek tek karşılanır.
> - **K3 keşif notu** (`takim/k3-kesif.md`): 12 soru §19.A'da tek tek yanıtlı.
>
> **Ad notu (baş lider).** İşler **G6** (ekmek zinciri + şebeke elektriği), **G7** (yerel pazar kanalı + `dukkan` S; iki alt parça: **G7a** kanal, **G7b** dükkân) ve **G8** (cam → pencere + yapı market) diye anılır. "P4a" adı yalnız `e1080dd` commit'indeki ölçek işine aittir (docs/06 §15.10).
>
> **İşaretler.** `(doğrulanmadı)` = bu belgenin yazımında kanıtlanmamış iddia. `(doğrulandı: yöntem)` = bu çalışmada çekirdekte ya da betikle denenmiş (geçici test, commit'lenmedi, silindi; ya da `SP` betiği).

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
3. **Yerel pazar kanalı (G7a).** Mülk kipinin ilk NPC **hane talebi**. Talep ilçe sınıfı × taban × iklim takvimi × bayram (nüfus yok). Çekim formülü tamsayı/PPM, su-doldurma; satış, ihracattan **önce** gelen yeni bir öncelik katmanında (4a) düğüm stoğundan çekilir; NPC dünya fiyatını **etkilemez**; geliri yeni, isteğe bağlı, tembel yazılan musluk `yerelNpc`'dir.
4. **Dükkân (G7b).** `EkYapiDurumu.dukkan?` ile durum; raf yuvası (mal dize kimlik), **fiyat kademesi** (`secim`, tutar yok), marka (sınırlı serbest metin), 4 yeni komut. Ölçek ayak izi `[1, 2, 3]` (süpermarket 3 hücre, sahip kararı S4-4) tür verisindedir; Alfa-0'da yalnız beş S türü vardır, market ve süpermarket kaydı **yoktur**.

### 0.2 Bu çalışmanın yedi kritik bulgusu (K3 ve baş lider bilmeli)

| # | Bulgu | Etki | Karar yeri |
|---|---|---|---|
| B1 | **Mülk kipinde elektrik bugün yalnız aynı işletme düğümündeki santralden gelir; santralsiz elektrik girdili tesisin verimi 0'dır.** `standart_gida_isleme` (10 elektrik) ile denendi: `verimPpm = 0`, `elektrik.karsilanmaPpm = 0` (doğrulandı: yöntem; §2.3). Dikey rapor değirmen (12) ve fırın (15) tariflerinde elektrik varsayıyor, santrali saymıyor. | Baş lider kararı: santral zorunlu olmayacak; **şebeke enerjisi** (elektrik + yakıt; §5.2). Aksi halde G6 yeni oyuncu için çalışmaz (A2 §1.3-B1: santral ilk gün yatırımına +%40 ekler). | §5.2, GZ-2 |
| B2 | **Referans fiyat R taban fiyat değildir.** `d.pazar.fiyat[m]` = taban + taban × oran × 0,75; yeni mallarda emilim/arz oranı yüzünden R0 tabanın 1,12–1,50 katıdır (ekmek 85,3 ₺ ↔ taban 60 ₺; pencere 540 ₺ ↔ 360 ₺). Dikey ve perakende raporlarının ₺ sayıları R = taban varsayar. | A2'nin sayıları taban fiyatla (kâğıt model); çekirdek R0 kullanır. Dükkân geliri, R0'a ve oyuncu emirlerine göre oynar: A2 §1.9 rakamları **yön** gösterir, mutlak ₺ kalibre değildir (A2 §1.12 okuma ii). | §6.2, GZ-5 |
| B3 | **Pencere NPC ithalatıyla alınabilir ama kırılgandır** (emir kalıcı oran, gerçekleşme bir sonraki tam saat tıkında; doğrulandı: yöntem; §2.4). | Dükkân bedelinde pencere G7'de yok, G8'de eklenir (A2 §1.7'nin sayısal önerisi P-Yok ile aynı yönde). | §7.4, GZ-15 |
| B4 | **G6'nın eklediği yöntemler `mal-izdusumu-kanit.test.ts` içindeki `p3Oncesi` yardımcısını kırar** (14 mallı içerikte olmayan `un`/`kepek`'i anan yöntem; T3 §9.3 deneyi aynı: 4 test). | K3 teslimine yardımcı güncellemesi şart. | §13.4 |
| B5 | **Çekirdek `Komut` birliğine tür eklemek `@bolge/protokol` derlemesini kırar** (`_KomutDenetimi`, `komut-sema.ts:81`) ve K1 komut testlerini. | K3 ve K2 teslimleri **aynı kapıda** birleşmeli. | §17 |
| B6 | **`standart_gida_isleme` ekmek zincirinin rakibidir.** 200 tahıl → 160 gıda, oran 1,84; bölge kipi altınlarının parçası, değiştirilemez. A2 (zincir / standart): **tahıl başına KD +%42,1 (NPC net +%33,6); tesis başına −%28,9; işçi başına −%34,4.** Erken oyunun bağlayıcı kısıtı NPC pazar derinliğidir; zincir ikinci talep havuzudur (A2 §1.3-B2). | **Baş lider kararı: çarpan yok.** Tesis tabanı da kural sayılırsa yedek: mülk kipinde `standart_gida_isleme` çıktısı ×0,75 (`mulk.yontemGecersizKilma`, **varsayılan KAPALI**; şema ve çekirdek yolu G6'da hazır, §5.9). Tetik: A2'nin ölçütü M. Zincir +%33,6 fark K/U bandının (+%10–25) üstündedir: açık soru S-17. | §5.9, S-1, S-17 |
| B7 | **Kömür santrali S ölçekte şebekeden ucuz değildir** (A2: kömür tam yükte yalnız %5–6 avantaj, başabaş yük %59–67; yakıt jeneratörü hiç avantajlı değil; hidro %12–14; P4 yükünde %13'te kömür S −195 ₺/sa). | **Baş lider kararı:** santral isteğe bağlıdır; yalnız hidroda ve yüksek yükte kârlıdır; şartnamede ve oyun içi metinde **"daha ucuz" vaadi yer almaz**, gerçek sayılar gösterilir; santral fiyatına/maliyetine dokunulmaz. | §5.2, S-2 (kapandı) |

### 0.3 Kapsam

- **G6:** `degirmen`, `ekmek_firini`, `kepek_gubresi`, `sut_kepekli` (4 yöntem, `yontemler[24..27]`), `mulkKipi` bayrağı ve bölge kipi etkisizlik kanıtı, **şebeke elektriği ve yakıtı** (§5.2: çekirdek, para defteri, kasa girişi), yöntem kimlik listesi (§3.5), yapı komutlarına isteğe bağlı `yontem` alanı (§5.8), `yontemGecersizKilma` yedek yolu (§5.9; kapalı), göç testi, ödül dedektörü doğrulaması, bot ekmek zinciri önayarı.
- **G7a:** yerel talep (Q), çekim (su-doldurma), esnaf payı, kasa kırpması, öncelik katmanı 4a, para akışı ve `yerelNpc` musluğu, yetişme davranışı.
- **G7b:** `dukkan` ek yapısı (durum, ölçek ayak izi, inşa), 4 yeni komut (`dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka`), `yapi_yerlestir`/`tesis_insa_hucre`'ye `dukkanTuru` alanı, dört dükkân türü verisi (`bakkal`, `firin`, `sarkuteri`, `sekerci`), marka, `ilk_dukkan` tetiği, protokol ve sunucu kancaları.
- **G8:** `cam_firini` (ev sahibi `parca_fabrikasi`), `celik_dograma`, `yapi_market` dükkân türü (yalnız NPC alıcı), dükkân bedeline pencere eklenmesi (parametre; §7.4), bot cam → pencere zinciri.

### 0.4 Kapsam dışı (bilinçli)

- Market (M) ve süpermarket (L) **oynanışı ve veri kayıtları**: Alfa-0 `dukkanTurleri` yalnız beş S türüdür (`bakkal`, `firin`, `sarkuteri`, `sekerci`, `yapi_market`); `market` ve `supermarket` tür kaydı A1'dedir (baş lider; T3 §11 soru 14). `ekYapilar.dukkan.olcekHucre = [1, 2, 3]` (süpermarket 3 hücre) yine yazılır ve `olcek` 1/2 komutları `acikOlcekler = [0]` ile reddedilir (§7.3, GZ-12). Kademe çarpanı dışındaki Alfa-1 kuralları (Yakınlık Havuzu, kademeli pay tavanı, ruhsat/kota, Zincir Kartı, `dukkan_yukselt`, kampanya penceresi) **yok**.
- Açılış Tezgâhı (`tezgah`): T-39 karar bekler; **G7'de yok** (kimlik listede durur, tür kaydı eklenmez). Sahip kararı: §21 S-3.
- Oyuncu-alıcı (oyuncudan oyuncuya raf satışı), raf tedarik sözleşmesi, toptan, hal, üretici satış noktası modülü.
- Bayat ekmek → kepek döngüsü (baş lider kararı 8; G6'ya girmez).
- Satış harcı (kasaya pay): yok (§19.A Soru 11). Şebeke bedelinin kasa payı **vardır** ve ayrıdır (§5.2.5).
- Yeni PRNG akışı, `ilce_gunluk` olayı, `IlceDurumu` nüfus alanları, göç: yok (GZ-10).
- Alfa-1 işi: fiyat önayarları, halka havuzu, çeşit için 24 saatlik pencere, hane fiyat esnekliği (η), takvim sonrası telafi dalgası dışındaki bayram kuralları.
- Nüfus modeli, `gelirEndeksi`, ilçe gelişim seviyesinin hesabı: **kilitsizlik** (Y-33) gereği yerel talep seviyeden bağımsızdır.
- **Bakım ve aşınma kalibrasyonu** (A2 §2: `mulk.bakim` bloğu, aşınma hızı ×0,55, tavan %30; `bakim_duzeyi.otomatikParca`): A2 kendisi **(doğrulanmadı; O2 bekleniyor)** işaretliyor. Bu şartnameye **girmez**; O2 R1–R7 ölçümü sonrası ayrı dilim (G6b) ve ayrı şartname ekidir; açık soru S-9.
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
6. Yerel talep Q = ilçe sınıfı × taban × iklim takvimi × bayram; bayram dalgası ayrı parametre; sayılar A2 §1.9.
7. Yapı market satışı yalnız NPC'ye; oyuncu-alıcı kapsam dışı.
8. Bayat ekmek → kepek G6'da yok; kepeğin P0'da iki tüketicisi olmalı.
9. İş bölümü: O2 `parsel.ts` zincir önayarı; K2 protokol/`kare.ts`/dedektör; K1 `gizli.ts`/`komut.test.ts`/hata çevirileri; veri sınırı: önce K3 şemayı isteğe bağlı/no-op indirir, sonra T3 değer yazar; bundle payı 31 KB (G7 +3–5 KB); Node-only doğrulayıcı `saf`a girmez.
10. **Yöntem kimlik listesi** makine-denetimli, yalnız-ekle (mal listesi gibi); mevcut 24 yöntem ilk kayıtlar; 6 yeni sona (§3.5).
11. **Yeni tesis türü yok**; `cam_firini` ev sahibi A2'nin maliyetine göre seçilir (**`parca_fabrikasi`**; §3.2).
12. **Enerji:** santral seçeneği düştü; ilk oturumda santral zorunlu değil. Alfa-0'da **elektrik ve yakıt** (A2 §1.3-B1: "elektrik ve yakıt kamu şebekesinden otomatik gelir") kamu şebekesinden otomatik tedarik edilir, yeni komut yok; fiyat kamu fiyat tavanı kuralı; ödeme ilçe kamu kasasına (`kasaPayiPpm`) ve lavaboya, ayrı defter satırlarıyla; santral isteğe bağlı oyuncu yatırımı (kendi elektriği; fazlasını kamuya satamaz); yalnız mülk kipi, bayrak arkasında; bölge kipi altınları birebir (§5.2). **Yakıtın kapsamı** Ar-Ge liderinin A2 aktarımına dayanır ve baş lider onayında teyit edilir (S-10).
13. **Ekmek zinciri sayıları A2 raporundan** gelir (tek kaynak; `afdf29f`). **Çarpan yok**; zincir ikinci talep havuzudur. Tesis tabanı da kural sayılırsa yedek seçenek parametre olarak hazır durur: mülk kipinde `standart_gida_isleme` çıktısı ×0,75, **varsayılan kapalı** (`mulk.yontemGecersizKilma`; §5.9). Tetik ölçütü sayısaldır (A2'nin M ölçütü; A0-11 bot ölçümü).
14. **Santral** isteğe bağlıdır; yalnız hidroda ve yüksek yükte kârlıdır; "daha ucuz" vaadi şartnamede ve oyun içi metinde yoktur; santral fiyatı/maliyeti değişmez.
15. **Şebeke bedelinin kasa payı** (`kasaPayiPpm` + `KASA_GIRIS`): kasa ilçe kamu kasasıdır; pay ekonomide kalır ve kamu siparişini besler, kalanı lavaboya gider; değeri A2 önerir.
16. Sıra değişmedi: G4 → baş lider onayı → K3 ("hücre dizini" işinden sonra, sonra G6).

### 1.3 Okunan kaynaklar

docs/14; docs/10 §5A; docs/12 §13–§14; docs/13; docs/06 §14–§15; GDD v1 (§1, §3.1–§3.4, §3A, §3B, §3C.2, §5.3, §6, §8); `perakende-kademeleri.md` (§3, §5, §7.5, §12, §14); `uretim-agi-genisletme.md` (§3.3, §5.3, §9, UA1, K-4, K-5); `dikey-zincirler-ve-perakende.md` (§2.2, §3.1–§3.5, §4, §5, §9, §11); `kimlik-listesi-v1.md`; `canli-dunya-simulasyonu.md` (§3.2–§3.4, §4.1–§4.2, §10); **A2 raporu** `p4-p5-ekonomi.md` (`afdf29f`; §1 tamamı) ve **T3 taslağı** `p4-p5-icerik-taslagi.md` (0561728, tamamı); kod: `packages/cekirdek/src/{tipler,derle,motor,komutSemasi,serilestir,goc,ozet,paraSayac,stok}.ts`, `ekonomi/{komut,uretim,tablo,insaat,index}.ts`, `sanayi/elektrik.ts`, `lojistik/cozum.ts`, `pazar/{piyasa,fiyat,tablo}.ts`, `mulk/{komut,yapi,durum,kasa,kamuFiyat,isletme}.ts`, `tarim/iklim.ts`, `packages/veri/src/{tipler,sema,dogrula,kimlik-listesi,parsel,yukle}.ts`, `veri/icerik/{icerik,parametreler,kimlik-listesi}.json`, `packages/protokol/src/{komut-sema,kare,mesajlar,donus}.ts`, `packages/sunucu/src/{odul/dedektor,donus/*}.ts`, `packages/botlar/src/{parsel,onayarlar,tablo}.ts`, `packages/istemci/src/{komut,harita/hata-mulk}.ts`, K3 keşif notu.

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

`mulk.ekYapilar.dukkan` (+ `olcekHucre?`), `mulk.perakende.{acikOlcekler, ilceBasinaEnFazla, fiyatBandiPpm, fiyatKademeleriPpm, varsayilanFiyatKademesi, kampanyaKademesi, fiyatDegisimEnAzSaat, cesitKatsayiPpm, esnaf, olcekler, dukkanTurleri, talep, marka}` (§4.3), `mulk.sebeke` (§4.7, §5.2). Yeni üst düzey parametre bloğu yoktur; hepsi `param.mulk` altındadır (mülk kipi kapalıyken okunmaz: bölge kipi etkilenmez).

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
  /** Kampanya kademesinin indeksi (en düşük kademe, 0). Alfa-0'da kampanya penceresi mekaniği YOKTUR: bu kademe `dukkan_fiyat` ile SEÇİLEMEZ (DUK-20); indeks yalnız yer tutar (araya kademe eklemek indeksleri kaydırırdı). Tanımsız = kampanya kademesi yok. */
  kampanyaKademesi?: number;
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
  marka: { hesapBasinaEnFazla: number; adMin: number; adMax: number; simgeSayisi: number; renkSayisi: number };
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
  /** Nüfus-başı talebi ilçe büyüklüğüne çeviren ölçek (kalibre DEĞİL; A2 §1.9: 50; A2 §4 soru 4). */
  yerelOlcek: number;
  /** İlçe sınıfı (`ParselIlceTanimi.sinif`: kirsal | kasaba | sehir; `veri/src/parsel.ts:89`) başına nüfus EŞDEĞERİ. A2 §1.13. Gerçek ilçe nüfusu YOKTUR (§6.5). */
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
| V6 | `fiyatKademeleriPpm` kesin artan, hepsi `fiyatBandiPpm` içinde, uzunluk ≥ 3; `varsayilanFiyatKademesi < uzunluk`; `kampanyaKademesi` varsa `= 0` | `perakende.fiyatKademeleriPpm: ...` |
| V7 | `esnaf.tabanPayPpm ∈ [0, 1 000 000)`, `esnaf.fiyatPpm` bant içinde | `perakende.esnaf: ...` |
| V8 | `olcekAraligi ⊂ {0,1,2}` ve `acikOlcekler`'le tutarlı; `tamCesit ≥ 1` ve `tamCesit ≤ mallar.length`; mal listesi tekrarsız | `perakende.dukkanTurleri.<id>: ...` |
| V9 | `talep`: `ilceSinifiNufus` üç anahtar > 0; `yerelOlcek ≥ 1`; her grubun `takvimPpm` uzunluğu 12, değerler > 0 ve **toplamı tam 12 000 000**; `gruplar` kapsaması: her `talep1000Saat` malı tam bir grupta; `bayram` varsa `oncesiGun × (oncesiPpm − 1 000 000) + sonrasiGun × (sonrasiPpm − 1 000 000) = 0` (toplam sabit; A2 §1.9) ve ppm değerleri > 0; `bayramGunleri` kesin artan, komşu fark ≥ en büyük `oncesiGun + sonrasiGun` | `perakende.talep: ...` |
| V10 | Marka: `adMin ≥ 2`, `adMax ≤ 24` (protokol üst sınırıyla uyumlu), `hesapBasinaEnFazla ∈ [1, 3]`, `simgeSayisi`, `renkSayisi ≥ 1` | `perakende.marka: ...` |
| V11 | Kilitsizlik taraması: `perakende` ve `ekYapilar.dukkan` alt ağacında seviye/teknoloji/önkoşul anahtarı yok (A0-17) | `perakende: kilit alani yasak: <anahtar>` |
| V12 | `ekYapilar.dukkan.insaMaliyeti` malları içerikte | mevcut genel doğrulama |
| V13 | **Çıkmaz mal (UA1)**: (a) yan ürün kuralı **hata**: `kepek` için en az bir yöntemin girdisinde `kepek` geçer (Ü) **ve** `emilimSaat.kepek > 0` (N: NPC dünya pazarı güvence alıcıdır, §5.4); aynı kural `gubre` için (Ü: Tarla gübre dozu, `tarim.gubreTuketimiSaat`; N: `emilimSaat.gubre > 0`); (b) genel kural **uyarı** (A0): her depolanabilir mal en az iki farklı tüketici türüne sahip (Ü yöntem girdisi, H raf, Y yapı maliyeti, P pazar emilimi > 0; **K ve N ancak kodda var olunca sayılır**); `elektrik` muaftır (depolanamaz). Sabit `CIKMAZ_MAL_HATA = false`; P1 teslim kapısı bunu `true` yapar (S15) | hata: `icerik: yan urun alicisiz: <mal>`; uyarı: `icerik: cikmaz mal: <mal> (tuketici turu <n> < 2)` |
| V14 | `mulk.sebeke` (§4.7): `elektrik` açıksa `elektrik` malı içerikte ve depolanamaz, `elektrik` girdisi taşıyan en az bir yöntem var; `yakit` açıksa `yakit` malı içerikte ve `yakit` girdisi taşıyan en az bir yöntem var; en az bir bayrak açık; `0 < tavanOraniPpm ≤ 1 000 000`; `kasaPayiPpm ∈ [0, 1 000 000]` | `sebeke: ...` |
| V15 | Yöntem oranı bandı (A2 §1.13 son satır): her `mulkKipi` yönteminin çıktı/girdi değeri oranı [1,16; 1,48] dışında **uyarı** (hata değil; taban fiyatla) | uyarı: `icerik.yontemler.<id>: oran bandi disi` |
| V16 | `mulkKipi` yöntemi hiçbir türün `yontemler[0]` (varsayılan) elemanı olamaz ve `gerekliTeknoloji` taşıyamaz (§4.1; yeniden belirtilir: bu dosya içeriğe bakan tek yer) | §4.1 iletileri |

**Kimlik kilidi bağlantısı:** §3.5 (`dogrulaKimlikKilidi` `dukkanTurleri` ve `yontemler` geçirir).

### 4.6 Çekirdekte derleme (`derle.ts`)

`DerlenmisMulk` (`tipler.ts:80-114`) alanları (hepsi ilgili blok tanımlıysa dolu, değilse `undefined`):

```ts
export interface DerlenmisPerakende {
  p: MulkPerakendeParametreleri;
  /** tür kimliği -> tür (mal indeksleri çevrilmiş, sıralı). */
  turler: Map<string, { ad: string; mallar: number[]; malKumesi: Set<number>; tamCesit: number; olcekAraligi: (0|1|2)[] }>;
  /** ilçe sınıfı (0 kirsal, 1 kasaba, 2 sehir) -> mal indeksi -> taban talep (mili-birim/saat) = carpBol(talep1000Saat[m] × yerelOlcek, ilceSinifiNufus[sınıf], 1000); satırı yoksa 0. */
  talepTaban: number[][];
  /** mal indeksi -> grup indeksi (-1: grupsuz) ve grup başına 12 aylık çarpan (ppm). */
  malGrubu: number[];
  grupTakvim: number[][];
  /** grup başına bayram dalgası (yoksa null); bayram günleri artan sırayla. */
  grupBayram: ({ oncesiGun: number; oncesiPpm: number; sonrasiGun: number; sonrasiPpm: number } | null)[];
  bayramGunleri: number[];
  /** ilçe kimliği -> sınıf (0..2); fikstürden. */
  ilceSinifi: Map<string, 0 | 1 | 2>;
  /** `ekYapilar.dukkan` indeksi (`DerlenmisMulk.ekYapiIndeks.get("dukkan")`). */
  dukkanEkYapi: number;
}

export interface DerlenmisSebeke {
  /** `icerik.mallar` indeksi; ilgili bayrak kapalıysa -1. */
  elektrikMal: number;
  yakitMal: number;
  tavanOraniPpm: number;
  kasaPayiPpm: number;
  /** "canli": kamuFiyatTavani(d, ic, mal); "taban": mallar[mal].tabanFiyat × kamuIthalatCarpaniPpm. */
  fiyatReferansi: "canli" | "taban";
}
```

`DerlenmisMulk.perakende?: DerlenmisPerakende` ve `DerlenmisMulk.sebeke?: DerlenmisSebeke` eklenir. Hatalar `Error` ile (derleme sırasında; `mulkDerle` `derle.ts:114-198`): bilinmeyen mal/tür, `acikOlcekler` boş, `dukkan` ek yapısı yok, `sebeke.mal` yok. Node-only ek semantik kurallar (V3–V5, V13, V15) çekirdekte **yok** (çekirdek `@bolge/veri`'den yalnız tip alır; `mal-kimlik-kilidi-paket.test.ts` güvencesi).

### 4.7 `param.mulk.sebeke` (yeni isteğe bağlı blok; şebeke elektriği ve yakıtı)

Tip `veri/src/tipler.ts` `MulkParametreleri.sebeke?: MulkSebekeParametreleri`; şema `sema.ts` `mulkSema` (`.strict()`); `parametreler.json` `mulk` altında. **Blok yoksa şebeke yoktur ve çekirdek davranışı bugünküyle bayt bayt aynıdır** (bayrak = bloğun varlığı; ayrı mantıksal bayrak yok). A2 §1.13 taslağıyla uyumludur (`elektrik`, `yakit`, `kasaPayiPpm`); A2'nin `fiyatKaynagi: "kamuFiyatTavani"` ve `lavaboKalemi: "sebeke"` alanları **sabit** kod davranışıdır, şemada alan değildir.

```ts
export interface MulkSebekeParametreleri {
  surum: 1;
  /** Elektrik şebekeden otomatik alınır (kendi santralden SONRA kalan açık; §5.2.2). */
  elektrik: boolean;
  /** Yakıt girdisi şebekeden tüketim anında stoksuz alınır (§5.2.2b). */
  yakit: boolean;
  /**
   * Birim fiyatın kamu fiyat tavanına oranı (ppm). Fiyat = kamu tavanı × tavanOraniPpm / PPM (§5.2.4). 0 < değer ≤ 1 000 000:
   * şebeke ASLA tavanın üstünde satmaz. Değer 1 000 000 (A2: 1,035 R; elektrik 10,35 ₺, yakıt 103,5 ₺ [taban referansı]). Santralin cazibesi
   * bu parametreyle AYARLANMAZ (baş lider: santral fiyatına/maliyetine dokunulmaz).
   */
  tavanOraniPpm: number;
  /** Bedelin ilçe kamu kasasına giden payı (ppm); kalanı lavaboda yanar. A2 §1.3-B1: 120 000. Tamsayı: kasa = floor(ödeme × pay / 1e6), lavabo = ödeme − kasa. */
  kasaPayiPpm: number;
  /** Fiyat referansı: "canli" = d.pazar.fiyat[mal] (kamuFiyatTavani; yakıtta R0 111,54 ≠ taban 100), "taban" = mal taban fiyatı. Varsayılan "canli"; ÖNERİ "taban" (S-16). */
  fiyatReferansi?: "canli" | "taban";
}
```

Değerler (T3 yazar): `elektrik: true`, `yakit: true`, `tavanOraniPpm: 1000000`, `kasaPayiPpm: 120000`, `fiyatReferansi` baş lider kararıyla (S-16). Doğrulayıcı V14: `elektrik` açıksa `elektrik` malı içerikte ve depolanamaz; `yakit` açıksa `yakit` malı içerikte; en az bir bayrak açık; `0 < tavanOraniPpm ≤ 1 000 000`; `kasaPayiPpm ∈ [0, 1 000 000]`.

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

**Kapsam:** yalnız mülk kipi (`ic.mulk !== undefined`), yalnız işletme düğümü (`BolgeDurumu.merkez !== undefined`), yalnız `ic.mulk.sebeke !== undefined` iken ve mal bazında `sebeke.elektrik` / `sebeke.yakit` bayraklarıyla (blok yoksa hiçbir kod yolu değişmez). Bölge kipi ve harita bölgeleri **dokunulmaz** (§13 K-4). Elektrik ve yakıt **aynı tedarik ilkesini** paylaşır (otomatik, kamu fiyat tavanı, tek defter satırı) ama **farklı mekanikle** çözülür: elektrik anlık dengedir (§5.2.2), yakıt tüketim anında stoksuz alınır (§5.2.2b).

**Santral** isteğe bağlı oyuncu yatırımıdır: kendi elektriğini üretir (önce o kullanılır); **fazlasını kamuya satamaz** (`elektrikDagit` santral yükü talebi izler: fazla üretim yoktur, satış yolu yoktur); yakıtı (`kömür`, `yakıt`) bugünkü gibi **ticaret emri ithalatıdır** (§5.2.8). **Santralin şebekeye göre ekonomisi (baş lider kararı):** yalnız hidroda ve yüksek yükte kârlıdır; şartnamede, oyun içi metinde ve arayüzde **"daha ucuz" vaadi yoktur**, oyuncuya gerçek sayılar gösterilir (A2: kömür tam yükte yalnız %5–6 avantaj, başabaş yük %59–67; yakıt jeneratörü hiç avantajlı değil; hidro %12–14); santral fiyatına ve maliyetine **dokunulmaz** (B7).

#### 5.2.2 Algoritma (`ekonomi/uretim.ts`)

`elektrikUygula(sn, h, tesisSayisi)` (`:381`) `sebeke: DerlenmisSebeke | null` parametresi alır. `bolgeVerimCoz` (`:421`) bunu hesaplar ve **iki** çağrı noktasına (`:436` ve `:517`) geçirir:

```ts
const sb = ctx.ic.mulk?.sebeke;
const sebeke = sb !== undefined && sb.elektrikMal >= 0 && h.bolge.merkez !== undefined ? sb : null;      // elektrik yolu
const yakitMal = sb !== undefined && sb.yakitMal >= 0 && h.bolge.merkez !== undefined ? sb.yakitMal : -1;  // yakıt yolu (§5.2.2b)
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

#### 5.2.2b Yakıt: tüketim anında stoksuz tedarik (`sebeke.yakit`)

Yakıt depolanabilir bir maldır; "eksik stoğu tamamlayan örtük ithalat" yaklaşımı (talep − stok) öncelik katmanlarıyla (fr1–fr4) ve stok ufkuyla iç içe geçer ve **fazla alıp stokta biriktirme** riski taşır. Bu yüzden yakıt **elektrik gibi tüketim anında** alınır: yakıt girdisi şebekeli düğümde **stoktan talep edilmez ve stoktan düşülmez**; yöntemin verimi yakıt stoğuyla **sınırlanmaz**; alınan miktar = gerçek tüketim. (Oyuncunun yakıt stoğu ve ithalat emirleri **etkilenmez**: stokta yakıt tutmak ve satmak serbesttir; şebekeli tesis o stoğu kullanmaz.)

Dört değişiklik (hepsi `ekonomi/uretim.ts`; `yakitMal` (yukarıdaki `bolgeVerimCoz` tanımı; `yakit` bayrağı açık ve `h.bolge.merkez !== undefined` iken `icerik.mallar` indeksi, aksi halde `-1`; `bolgeHesapla` ve `bolgeOranlariUygula` aynı ifadeyi yerel olarak hesaplar)):

| # | Yer | Değişiklik |
|---|---|---|
| Y-a | `bolgeHesapla` girdi döngüsü `:338` (`for (const [m, q] of y.girdi)`) | `if (m === yakitMal) continue;` (`girdiPot` ve dolayısıyla `talep[m]` bu girdiyi **içermez**) |
| Y-b | `bolgeVerimCoz` verim döngüsü `:501-504` (`for (const [m] of y.girdi) { const f = h.fr3[m] … }`) | `if (m === yakitMal) continue;` (yakıt verimi kısmaz) |
| Y-c | `bolgeVerimCoz` sonu (`:521-529` "son verimle brüt çıktıyı tazele" bloğunun yanında) | `h.sebekeYakitMili = Σ_i Σ_(m = yakitMal ∈ y.girdi) carpBol(carpBol(q, olcek_i, PPM), verimPpm_i, PPM)` (gerçek tüketim; santral yakıtı `verimPpm` zaten yükle ölçekli) |
| Y-d | `bolgeOranlariUygula` `girdiGercek` döngüsü `:640-654` (`:646`) | `if (m === yakitMal) continue;` (stok düşmez) |

- Önce hesap (Y-c) sonra kalıcı yazım: `bolgeDurumunaYaz` (`cozum.ts:288`, `bolgeVerimCoz`'dan sonra) `BolgeDurumu.sebekeYakitMili?` alanını yazar (`> 0` iken; aksi halde yazılmaz). Alan `tipler.ts:238` `BolgeDurumu`'na (`elektrik?` alanının yanına, `:270`) isteğe bağlı eklenir.
- `BolgeHesabi.sebekeYakitMili: Mili` (geçici; `hesapAl` sıfırlar).
- Şebekeli düğümde yakıt girdili yöntemi bulunan tesisin (ekmek fırını, cam fırını, yakıt jeneratörü) yakıt için **ticaret emri vermesi gerekmez**; emir vermek zararsızdır (stok birikir, satılabilir). Kömür santrali (`komur_santrali`) girdisi **kömürdür** (yakıt değil): şebekeden gelmez, ithalatla gelir (§5.2.8).
- `yakit: false` iken Y-a…Y-d koşulları yanlıştır: davranış bugünküyle aynı.

#### 5.2.3 Tik adımı ve sıra (`lojistik/cozum.ts`)

`lojistikCoz` (`:228`) saatlik tıkta (`ekonomi/index.ts:18`) ve her kirli komutta çalışır. Şebeke şu noktalarda devreye girer:

| # | Adım (`cozum.ts`) | Şebeke ile ilgili iş |
|---|---|---|
| 0 | muhasebe `:237-239` | `paraMuhasebesi` önceki saatlik akışları kesin işler: **şebeke bedelinin lavabo ve kasa girişi birikimi** (§5.2.5) |
| 1 | `:243-253` `hazineKalemleri(d, ctx, o, null, dl)` | `hesaplar = null`: bedel, bir önceki çözümün kalıcı `b.elektrik.sebekeMili` ve `b.sebekeYakitMili` değerlerinden **tahmin** edilir (ihracat için `e.gerceklesenSaat` kalıbı); ödeme gücü bu gider dahil hesaplanır |
| 4–5 | `:281-290` `bolgeVerimCoz` → `elektrikUygula` ve yakıt tüketimi (Y-c) | elektrik açığı ve yakıt tüketimi bulunur; `bolgeDurumunaYaz` (`:288`) kalıcı yazar; `bolgeOranlariUygula` yakıtı stoktan düşmez (Y-d) |
| 6 | `:293-308` `hazineKalemleri(d, ctx, o, hesaplar, dl)` | bedel `hesaplar[b.indeks].sebekeMili` ve `.sebekeYakitMili`'den kesin hesaplanır; `hazineOranAyarla(gelir − gider)`; `paraAkisiYaz({…, sebeke, kasa})` |

**Sıra özeti (bir çözüm içinde):** kendi santral (`elektrikDagit`) → şebeke açığı (`acik`) → verim → gider (bedel) → hazine oranı → defter oranları. Bedel **saatlik oran** olarak yazılır, tembel birikir (yeni olay yok).

#### 5.2.4 Fiyat ve bedel

```
birimFiyat(mal) = carpBol(fiyatReferansi(mal), sebeke.tavanOraniPpm, PPM) ile BİRLİKTE kamu tavanı:
                = carpBol(kamuFiyatTavani(d, ic, mal), sebeke.tavanOraniPpm, PPM)                     // fiyatReferansi = "canli" (varsayılan)
                = carpBol(carpBol(ic.mallar[mal].tabanFiyat, ic.mulk.kamuIthalatCarpaniPpm, PPM), sebeke.tavanOraniPpm, PPM)   // fiyatReferansi = "taban"
bedel = carpBol(sebekeMili, birimFiyat(elektrik), MILI) + carpBol(sebekeYakitMili, birimFiyat(yakit), MILI)   // mili-₺ / saat  (cozum.ts:127 ile aynı birim kalıbı)
```

- `kamuFiyatTavani(d, ic, mal)` (`mulk/kasa.ts:420`; A2 atfı `:415-424`, `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`) = `d.pazar.fiyat[mal] × ic.mulk.kamuIthalatCarpaniPpm / PPM`; **yeni fiyat mantığı yok**, mevcut kamu fiyat tavanı kuralıdır (ulaşılabilecek en düşük NPC ithalat çarpanı, 1,035). Oyuncudan bağımsızdır (Ticaret ofisi ve anlaşma makası etkilemez: çarpan derleme zamanında sabittir).
- **Elektrik:** NPC pazar kaydı yok (`emilim = arz = 0`), `pazarFiyatlari` (`pazar/piyasa.ts:123-135`) `oran = 0` verir ve `d.pazar.fiyat[elektrik]` **her zaman tabandır**. **(doğrulandı: yöntem)** geçici test, `mulkVeriTam` + `mulkSim`: `elektrik` mal indeksi 13, `d.pazar.fiyat[13] = 10 000`, `kamuFiyatTavani = 10 350` (10,35 ₺), `kamuIthalatCarpaniPpm = 1 035 000`. Örnek: `degirmen` S 12 elektrik/sa → `12 000 × 10 350 / 1 000 = 124 200` mili-₺/sa = 124,2 ₺/sa.
- **Yakıt (önemli fark):** `yakit` NPC pazar kaydı taşır; canlı referans **tabana eşit değildir** (B2: `R0(yakit)` = 111,54 ₺, taban 100 ₺). `fiyatReferansi = "canli"` ile şebeke yakıt fiyatı ≈ 111,54 × 1,035 ≈ **115,4 ₺**; A2'nin tüm hesapları **taban referanslıdır** (103,5 ₺; A2 §1.3-B1 "doğrulanmadı: `pazar.fiyat` dinamiği çekirdekte koşulmadı"). Fark ≈ +%11,5 ve **canlı R oyuncu emirleriyle oynar** (büyük yakıt ithalatı R'yi yükseltir: herkesin şebeke yakıt fiyatı artar). Bu yüzden şemada `fiyatReferansi?: "canli" | "taban"` vardır; **varsayılan `"canli"`** (baş lider kararındaki "mevcut `kamuFiyat` mantığı"nın düz okuması); **öneri `"taban"`** (A2'nin sayıları geçerli kalır, fiyat manipüle edilemez, tamsayı sabit). Karar baş liderdedir (S-16); iki mod da aynı koddur (K3 ikisini uygular ve test eder).
- `tavanOraniPpm < 1 000 000` şebekeyi tavanın altına çeker (parametre); `> 1 000 000` doğrulayıcıda yasak.

#### 5.2.5 Para defteri: kasa payı + lavabo, iki ayrı satır

Bedelin bir kısmı **ilçe kasasına** (kamu bütçesi; kasa yalnız yanan paradan beslenir kuralı bununla uyumludur: bedel oyuncunun hazinesinden çıkan, **yanan** paradır), kalanı **lavaboda** yanar. Pay `mulk.sebeke.kasaPayiPpm`:

| Satır | Kalem | Tür | Tutar |
|---|---|---|---|
| lavabo | `lavabo.sebeke` (YENİ, isteğe bağlı, tembel) | yanan para | `bedel − kasa payı` |
| kasa girişi | `kasa.giris.sebeke` (YENİ, isteğe bağlı, tembel; `KasaGirisKalemi` + `"sebeke"`) | kamu bütçesi | `Σ_ilçe carpBol(bedel_ilçe, kasaPayiPpm, PPM)` |

- **Hangi kasa:** düğümün **ilçe kasası** `k:ilce:<id>` (`kamuIlceKimligi`, `mulk/kamu.ts`); ilçe `dugumIlcesi(d, ic, oyuncu, b.id)` (`mulk/kasa.ts:179`: oyuncunun düğümün ilindeki en çok hücreli ilçesi; eşitlikte kimlik; hücre yoksa ilin ilk ilçesi) ile bulunur. Gerekçe: ithalat makası ve komisyonu da ilçe kasasına gider (`kasaOranlariHesapla`, `kasa.ts:302-303`); elektrik şebekesi ilçe düzeyi kamu hizmetidir; mahalle/il bölüşümü (vergi gibi 20/40/15) bu parametreyle gelmez (S-4: sahip isterse `kasaPayi` üçe bölünür, **şema genişletilebilir**: `kasaPayiPpm` yalnız ilçe).
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
  const eMili = sb.elektrikMal >= 0 ? (hs === null ? (b.elektrik?.sebekeMili ?? 0) : hs.sebekeMili) : 0;
  const yMili = sb.yakitMal >= 0 ? (hs === null ? (b.sebekeYakitMili ?? 0) : hs.sebekeYakitMili) : 0;
  let bedel = 0;
  if (eMili > 0) bedel += carpBol(eMili, sebekeBirimFiyati(d, ctx.ic, sb, sb.elektrikMal), MILI);   // mulk/sebeke.ts (yeni, saf)
  if (yMili > 0) bedel += carpBol(yMili, sebekeBirimFiyati(d, ctx.ic, sb, sb.yakitMal), MILI);
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

- **Yakıt girdisi** (`ekmek_firini`, `cam_firini`, `yakit_jeneratoru`) §5.2.2b ile şebekeden gelir (`sebeke.yakit`). **Kömür** (`komur_santrali` girdisi) ve diğer ham/ara mallar (silis, çelik, parça, kepek...) **şebekeden gelmez**: bugünkü gibi ticaret emri ithalatı ya da kendi üretimidir (`ekonomi/komut.ts:99-130`; emir kalıcı oran; gerçekleşme saat tıkında; yuva 4 + Ticaret ofisi). Böylece "kömür santrali ithal kömürle" ekonomisi (A2 §1.3-B1: kömür 33,3 ₺) korunur ve **santral fiyatına/maliyetine dokunulmaz** (baş lider).
- Santral kurmayan oyuncunun elektrik için ticaret emri vermesi **gerekmez** (elektrik depolanamaz; `ekonomi/komut.ts:108` reddi değişmez); yakıt için de gerekmez (§5.2.2b).
- Fırın/santral yakıtı için S-10 (kapsam onayı): A2 yakıtı şebekeye dahil etmiştir; baş lider onayında teyit edilir. `yakit: false` verisi bu davranışı kapatır (kod yolu kalır).

#### 5.2.9 Serileştirme ve göç (özet; ayrıntı §11)

Yeni durum alanları hepsi isteğe bağlı ve yalnız kullanılınca yazılır: `BolgeElektrikDurumu.sebekeMili?`, `BolgeDurumu.sebekeYakitMili?`, `ParaAkisi.sebeke?`, `ParaDurumu.lavabo.sebeke?`, `KasaDurumu.giris.sebeke?`. `fikstur-goc/mulk-v1.json` yüklenmeye devam eder; `mulk.sebeke` bloğu yoksa durum özeti bugünküyle aynıdır; blok eklenmesi `kuralSurumu`'nu değiştirir (veri değişikliği).

#### 5.2.10 Mevcut mülk testlerine ve botlara etkisi

`parametreler.json`'a `mulk.sebeke` yazılınca **tüm mülk kipi testleri ve botları şebekeli dünyada koşar**: santralsiz elektrik girdili tesis artık `verim 0` değildir. Etkilenebilecek testler (arama; **doğrulanmadı: tam liste**, K3 koşarak belirler): `cekirdek/test/{mulk-ilk-satis,mulk-olcek-kilitsiz,mulk-serilestir,mulk-yapilar}.test.ts`, `botlar/test/parsel.test.ts`, `olcum/test/parsel-kosu.test.ts`. Düzeltme ilkesi: brownout/verim 0 bekleyen mülk testi kendi veri kopyasında `delete v.param.mulk.sebeke` yapar (test amacı şebeke değilse); aksi halde beklenen sayılar güncellenir. `botlar/src/parsel.ts:105-109` `SANAYICI` önayarı hidro santralle açılmaya devam edebilir ama artık **zorunlu değildir** (O2 önayar kararı, §15).

### 5.3 Zincirin işleyişi (oyuncu ve çekirdek)

1. Oyuncu `ciftlik` (Tarla, S: 2 hücre) kurar: çıktı `tahil` (hasat eğrisi).
2. `gida_fabrikasi` kurar (2 hücre) ve **`yontem: "degirmen"`** alanını **aynı komutta** verir (§5.8; alan verilmezse varsayılan `standart_gida_isleme`, `ekonomi/insaat.ts:24`). Sonradan değiştirmek isterse `yontem_degistir {bolge, tesis, yontem}` (bedelsiz, anlık; `ekonomi/komut.ts:78-88`). İkinci `gida_fabrikasi` için `yontem: "ekmek_firini"`.
3. `degirmen`: tahıl + elektrik → un + kepek. `ekmek_firini`: un + yakıt + elektrik → ekmek. Elektrik **şebekeden otomatik** gelir (§5.2): oyuncu santral kurmak zorunda değildir. Aynı il düğümünde stok ortaktır (il içi taşıma bedava); farklı ilde MCF taşır.
4. Satış: ekmek, G6 anında yalnız NPC pazarı (`ticaret_emri` ihracat; `pazar/piyasa.ts`); G7 ile dükkân eklenir. **Yakıt** da şebekeden otomatik gelir (§5.2.2b): fırın için ithalat emri gerekmez.
5. Kapalı döngü: `ahir` kurup `kepek_gubresi` yöntemini seçerse kepek tüketilir, `gubre` doğar; Tarla gübre dozu (`gubre_dozu`) gübreyi tüketir (mevcut `tarim` mekaniği). `sut_kepekli` ikinci (daha zayıf; A2 §1.6) seçenektir.
6. Oran bulmacası ölçekten gelir: 1 değirmen (S) ≈ 1 fırın (S) (A2 §1.4 eşleşmesi: 200 tahıl → 165 un → 250 ekmek); ölçek kademeleri (S/M/L) çıktıyı ×1/2,2/3,6 yapar (`sanayi.olcekKademeleri`).

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

`derle.ts:27-72` (`icerikDerle`): mülk açıklığı `param.mulk !== undefined && veri.parsel !== undefined` (bugün `:78`, `ic` kurulduktan SONRA) **önce** hesaplanır ve `ic` nesnesinin `tesisTurleri` alanı bölge kipinde süzülmüş kopya olur:

```ts
const mulkAcik = param.mulk !== undefined && veri.parsel !== undefined;
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
- `ic.icerik` değişmez: `goc.ts:45` `icerikKimlikTablosuOlustur(ic)` ve `sunucu/src/yazar.ts:611` dizinleri tam listeyi görür (indeks tabloları sabit).
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

### 5.8 Yapı komutlarında isteğe bağlı `yontem` alanı (T3 §11 soru 2; A3 görüşü)

**Görüş: evet, G6'ya alınır.** `tesis_insa_hucre` ve `yapi_yerlestir` komutlarına isteğe bağlı `yontem?: string` (yöntem kimliği) eklenir.

| Seçenek | Değerlendirme |
|---|---|
| **A (öneri): inşa komutunda `yontem?`** | "Değirmen kur" **tek adım**; yapı yöntemin kimliğidir (yapı adı yöntemden gelir; üretim §7.1). Tesis tamamlandığı anda doğru yöntemle başlar: inşa bittiğinde `standart_gida_isleme` **tahılı boş yere tüketmez** (kurulumdan sonra yöntem değişimi, inşa saatlerce sürebildiği için, oyuncu çevrimdışıyken yanlış yöntemle bir süre çalışmaya yol açar). Maliyet: komut alanı, `InsaatDurumu.yontem?`, protokol alanı; hepsi isteğe bağlı |
| B: kurulumdan sonra `yontem_degistir` | Ek komut gerekmez; ama iki adımlı akış (inşa bitişini beklemek) onboarding'e (G9 Esnaf Defteri) sürtünme ekler ve ara dönemde yanlış yöntem çalışır. `yontem_degistir` zaten **kalır** (A'da da) |

Baş lider A'yı reddederse bu madde düşer ve geri kalan G6 **hiç değişmez** (B zaten çalışır).

**Kurallar:**
- `yontem` yalnız **tesis türü** inşasında verilebilir (ek yapıda verilirse: `yontem yalniz tesis turunde verilebilir: <tesisTuru>`).
- Denetimler `yontem_degistir` ile **aynıdır**, aynı iletilerle (`ekonomi/komut.ts:84-86`): `bilinmeyen yontem: <id>`; `yontem bu tesis turunde yok: <id>` (süzülmüş tür listesi: bölge kipinde `mulkKipi` yöntemi reddedilir; ama komut mülk komutudur); `yontem acik degil: <id>` (`yontemAcikMi`, teknoloji). **Başarısız komut durumu değiştirmez** (denetimler hazine/stok düşmeden önce).
- Durum: `InsaatDurumu.yontem?: string` (**dize kimlik**, indeks değil; `dunyaYenidenIndeksle` kapsamına girmez) yalnız verilince yazılır. `insaatBitti` (`ekonomi/insaat.ts:24`): `const yontem = insaat.yontem !== undefined ? ctx.ic.yontemIndeks[insaat.yontem] : tur?.yontemler[0];` ve `yontem === undefined` ise tesis kurulmaz (mevcut `if (… && yontem !== undefined)` koşulu).
- `dunyaDogrula` (`serilestir.ts:392` `$.insaatlar[i]`): `yontem` varsa `dize`; `dunyaIcerikUyumu`: `yontem` içerikte tanımlı ve tesis türünün listesinde.
- Protokol: `komut-sema.ts:62-71` iki komuta `yontem: kimlik.optional()`; `komutSemasi.ts:60,62` `yontem: "kimlik"`. Bölge kipi komutu etkilenmez (alan mülk komutlarındadır).
- Ret iletileri (§9.3 genişler): `YON-01 yontem yalniz tesis turunde verilebilir: <tesisTuru>`; diğerleri mevcut.

## 6. G7a: yerel pazar kanalı

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


### 6.1 Ne eklenir

Mülk kipine **NPC hane talebi**: ilçedeki dükkânlar (ve görünmez esnaf) arasında paylaştırılan, düğüm stoğundan çekilen, oyuncu hazinesine **yeni para** olarak giren (musluk `yerelNpc`) satış akışı. Mevcut NPC dünya pazarı (toptan ihracat, ≤ 0,9 R, hacim sınırlı; `pazar/piyasa.ts`) **değişmez**; yerel kanal ondan ayrı bir talep kaynağıdır, ikisi birbirini dışlamaz (K3 keşif §2).

### 6.2 Kararlar (geri dönüşü zor olanlar §20'de)

| Konu | Karar | Gerekçe |
|---|---|---|
| **R tanımı** (GZ-5) | `R[m] = d.pazar.fiyat[m]` (dünya referans fiyatı, saatlik tıkta güncellenir; `pazar/piyasa.ts:123-135`) | docs/06 §15.7 kamu tavanı, 0,891 R çıpası, band [0,7; 1,4] R hep bu R'ye göre yazıldı; tek referans |
| **Q kimliği** (GZ-4) | `Q[ilçe, mal, t] = ilceTabanSaat[sınıf][mal] × aylık(mal, ay) × bayram(mal, gün)`; **nüfus yok**, **ilçe seviyesi yok** | Baş lider kararı 6; mülk kipinde nüfus yok (`isletme.ts` düğüm `nufus = 0`), fikstürde ilçe nüfusu yok (`veri/src/parsel.ts:81-104`); seviye kilit olamaz (Y-33) |
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

Sabitler: `PPM = 1_000_000`, `MILI = 1000`, `carpBol(a, b, c) = floor(a × b / c)` (`sabit.ts:42`; BigInt yedekli). Kayan nokta, `Math.pow`, `Math.sqrt` yok.

**Adım 0: dükkânları topla (sıra sabit).** `d.mulk.isletmeler` sırasıyla (oyuncu, il) her düğüm; düğümde `b.ekYapilar`'ın (tamamlanma sırası) `tur === "dukkan" && dukkan !== undefined` olanları. Her dükkânın ilçesi `mk.hucreler.get(ekYapi.hucreler[0]).ilce`. İlçelere göre grupla; ilçeler **kimlik sırasıyla** (JS dize sırası), ilçe içinde dükkânlar **(oyuncu kimliği, `EkYapiDurumu.id`)** sırasıyla.

**Adım 1: mal mevcudiyeti.** `mevcut(oyuncu, mal)`: oyuncunun herhangi bir işletme düğümünde `anlikMiktar(stok, t) > 0 || uretimOrani[mal] > 0 || stok.gelenOran > 0` (`pazar/piyasa.ts:64-73` `isletmeAgindaMalVarMi` ile aynı koşul; K3 dışa açar ya da eşini yazar). Stoksuz yuva çekime girmez (ağırlık 0), payı diğerlerine kalır. Çözüm başına (oyuncu, mal) çifti için bir kez hesaplanır.

**Adım 2: çeşit.** Dükkân `j` için `dolu_j` = `mal` tanımlı **ve** `mevcut` olan yuva sayısı; `cesitPpm_j = dolu_j ≥ tamCesit ? PPM : carpBol(dolu_j, PPM, tamCesit)`. (Alfa-0 sadeleştirmesi: 24 saatlik pencere yok, GZ-11.)

**Adım 3: ağırlık.** Yuva `y` (mal `m`, kademe `k`, `p = fiyatKademeleriPpm[k]`):

```
ters  = carpBol(PPM, PPM, p)                       // PPM² / p ; p ∈ [700 000, 1 400 000] -> [714 285, 1 428 571]
kare  = carpBol(ters, ters, PPM)                   // (R/fiyat)²  ∈ [510 204, 2 040 816]
cesitC = PPM + carpBol(cesitKatsayiPpm, cesitPpm_j, PPM)
w     = carpBol(carpBol(kare, cesitC, PPM), olcekler[olcek_j].cekimCarpaniPpm, PPM)
```

Esnaf ağırlığı: `wE = kare(esnaf.fiyatPpm)` (aynı `ters/kare`, çeşit ve ölçek çarpanı yok).

**Adım 4: ilçe × mal paylaşımı.** `m` artan sırada; `L` = o ilçede `mal = m`, `mevcut`, `w > 0` olan yuvalar, (oyuncu kimliği, `EkYapiDurumu.id`, yuva indeksi) sırasıyla; `L` boşsa geç.

```
Q        = yerelTalep(m, ilce, t)                         // §6.5; 0 ise geç
Σw       = Σ w(L)
esnafPay = max(esnaf.tabanPayPpm, carpBol(wE, PPM, Σw + wE))     // ppm
esnaf    = carpBol(Q, esnafPay, PPM)
P        = Q - esnaf                                      // oyuncu havuzu (mili-birim/saat)
s_i      = carpBol(P, w_i, Σw)                            // her i ∈ L
kalan    = P - Σ s_i                                      // 0 <= kalan < |L|
// kalan birimler L sırasıyla birer birim: ilk `kalan` giriş +1
```

**Adım 5: kasa kırpması (tek geçiş).** İlçedeki her dükkân `j` için `top_j = Σ_y s_(j,y)` (tüm mallar, adım 4 bitince). `top_j > olcekler[olcek_j].kasaMiliSaat` ise her yuva için `s = carpBol(s, kasa, top_j)` (aşağı yuvarlama). **Taşan talep başka dükkâna yeniden dağıtılmaz** (esnafa/boşa gider; GZ-11). Sonuç `istek(j, y)`.

**Adım 6: satırlar.** `YerelSatir { dugum, mal, istek, fiyatPpm = p, ekYapi, yuva }` listesi (düğüm indeksi, mal, `ekYapi`, yuva sırasıyla) ve düğüm başına mal toplamı `dugumIstek[dugum][mal]` (`h.dukkan` doldurur). Düğüm başına dükkân gideri `Σ olcekler[olcek].giderMiliSaat` (`yerel.gider`).

**Adım 7: gerçekleşen satış ve gelir** (`hazineKalemleri` içinde, `hesaplar !== null`):

```
gercek = carpBol(istek, hesaplar[dugum].frD[mal], PPM)               // mili-birim/saat
brut   = carpBol(gercek, d.pazar.fiyat[mal], MILI)                   // mili-₺/saat, R'de (cozum.ts:127 ile aynı birim)
gelir  = carpBol(brut, fiyatPpm, PPM)                                // dükkân fiyatı = R × kademe
```

`hesaplar === null` iken (ödeme gücü tahmini; `cozum.ts:248-253`) `gercek = istek` alınır (ihracatın `e.gerceklesenSaat` kalıbı). Gelir **oyuncu başına toplanır**; `gelir += yerelGelir`, `gider += dükkân gideri`.

### 6.5 Talep Q: formül ve takvim

```
yerelTalep(m, ilce, t):
  taban = mk.perakende.talepTaban[sinif(ilce)][m]                    // mili-birim/saat; 0 ise 0 dön
  ay    = takvimAyi(ic, t)                                            // tarim/iklim.ts:44; tarım kapalıysa null
  q     = taban
  aylik = talepAylik[m]; if (aylik !== undefined && ay !== null) q = carpBol(q, aylik[ay], PPM)
  gun   = Math.floor(t / GUN)                                         // çekirdeğin sim günü (TRT gece yarısına hizalı)
  for b of bayram (dizi sırası): if (b.mallar.includes(m) && gun >= b.baslangicGun && gun < b.baslangicGun + b.sureGun) q = carpBol(q, b.carpanPpm, PPM)
  return q
```

- `sinif(ilce)` = `ParselIlceTanimi.sinif` (kirsal 0, kasaba 1, sehir 2; `veri/src/parsel.ts:89`), derlemede `ilceSinifi` haritası.
- `ilceTabanSaat` değerleri ve `aylikPpm` `[A2]`. **Soru (A2):** taban ilçe büyüklüğüne (`uygunHucre`) bağlanacak mı? Varsayılan: hayır (sınıf başına sabit); bağlanacaksa ek parametre gerekir (§21 S-6).
- Bayram penceresi: `baslangicGun` **sim günüdür** (dünya epoch'undan; epoch 1 Ekim 2026 00:00 TRT, `docs/12 §7`). Resmî bayram tarihleri `[A2]` (doğrulanmadı); toplam-sabit telafi dalgası (dikey §5.6 "bayram sonrası −%15") G7'de **yok**; A2 isterse ikinci pencere (`carpanPpm < PPM`) olarak aynı yapıyla yazar.
- Takvim ve bayram çarpanları **veri**dir; takvim hesabı (hicri tarih vb.) çekirdekte yoktur.

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

`mulk/yerelPazar.ts`: `yerelPazarGorunumu(d, ic, oyuncu)` → dükkân başına `{ ekYapi, yuvalar: [{ mal, fiyatKademesi, istek, esnafPay, q }], kasaDoluluk, giderMiliSaat }`: arayüz "tahmini satış", ZP ölçümleri ve K2 `kare` alanları için; çözümle **aynı** `yerelPazarHesapla` çekirdeğini kullanır (`istek` = kasa kırpmalı istek; `gercek` stoğa bağlıdır, gösterilmez).

### 6.9 Performans ve bundle

Maliyet: çözüm başına `O(D × Y + I × M)` (D dükkân, Y ≤ 8 yuva, I dükkânlı ilçe, M ≤ 24 mal): ihmal edilebilir; yine de `cekirdek/bench/komut-maliyeti.ts` dükkânlı senaryoyla yeniden koşulur, çözüm başına CPU artışı ≤ %5 hedeflenir (docs/06 §15.9 taban 2,6–2,9 ms). Önbellek gerekirse yalnız `WeakMap` ve girdiyle anahtarlı (durum metnine girmez, §15.9 kalıbı). Bundle: çekirdek +2–3 KB gzip (K3 keşif §4).

### 6.10 Bilinçli sadeleştirmeler (Alfa-0)

Tek geçiş kasa kırpması; çeşit anlık (24 saat penceresi yok); konum, vitrin, bakım çarpanları yok; hane fiyat esnekliği (η) yok (üst sınır §12.4'te invariant olarak testlenir); esnaf payı anlık (14 günlük EMA yok); kampanya penceresi yok. Hepsi Alfa-1 parametre/kural dönemi işi; GZ-11.

---

## 7. G7b: `dukkan` S

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


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
}

export interface RafYuvasi {
  /** Mal KİMLİĞİ (dize; `dunyaYenidenIndeksle` kapsamına girmez). Tanımsız = boş yuva. */
  mal?: string;
  /** `perakende.fiyatKademeleriPpm` indeksi (tutar DEĞİL). Boş yuvada da varsayılan değerdedir. */
  fiyat: number;
  /** Son fiyat/mal DEĞİŞİMİ (ms; hız sınırı için). İlk doldurma ve boşaltma yazmaz. */
  fiyatT?: Ms;
}

// tipler.ts:773-797 MulkOyuncuDurumu'na
markalar?: OyuncuMarka[];        // en çok perakende.marka.hesapBasinaEnFazla; ilk marka tanımlanınca yazılır
dukkanGeliri?: ParaSayaci;       // kümülatif NPC dükkân geliri (mili-₺); ilk gelirde yazılır

export interface OyuncuMarka { ad: string; simge: number; renk: number }

// tipler.ts:476-503 InsaatDurumu'na (inşa sürerken tür taşınır)
dukkanTuru?: string;
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

**S dükkân bedeli (G7):** `ekYapilar.dukkan`: `yuva: 1`, `insaSaati: 4`, `insaParasi: [A2]` (taslak 6 000 000 mili-₺ = 6.000 ₺), `insaMaliyeti: { celik: [A2], parca: [A2] }` (taslak 20 000 + 8 000), **`pencere` yok** (§7.4), `enFazlaIlBasina: 6`, `olcekHucre: [1, 2, 3]`. İlk 5 yapı %30 indirimi ve ilk 24 saat %10 süre mevcut mekanizmayla uygulanır (`mulk/komut.ts:369-380`; indirim tutarı S tabanından, ölçekten bağımsız).

### 7.3 Ölçek ve türler: G7'de yalnız S açık

- `acikOlcekler = [0]`. Komutta `olcek` 1 ya da 2 (veya tür `market`/`supermarket`) → `dukkan olcegi henuz acik degil: <m|l>` (DUK-04). **Bu bir oyuncu kilidi değildir:** dünyaya özelliğin açılış zamanlamasıdır (perakende §12.3 "M erken açılış kapısı"); A0-17 testi parametrenin varlığını izin verir, hiçbir oyuncu özelliğine (seviye, teknoloji, sıra) bağlı olmadığını doğrular. **T-43 baş lider kararı** gelene dek varsayılan budur (§21 S-1).
- G7 tür kayıtları: `bakkal` (olcekAraligi `[0]`), `firin` (`[0, 1]`), `market` (`[1]`), `supermarket` (`[2]`). `mallar` ve `tamCesit` T3 verisi; `bakkal.mallar` taslak: `gida, ekmek, un, sut, sut_urunu, sekerleme, findik_urunu, yakit` (perakende §3.2; ancak V3/V4 gereği her mal için pazar kaydı ve talep satırı `[A2]` olmalı). `firin.mallar` taslak: `ekmek, gida`.
- `ekYapilar.dukkan.olcekHucre = [1, 2, 3]`: market 2 hücre, **süpermarket 3 hücre** (sahip kararı); komut doğrulaması bunu `acikOlcekler` kapıdan geçirmeden bile aynı ayak izi kuralıyla (`kenar-bitişik, ≤ 5`) denetler, M/L açıldığında ek kod gerekmez.

### 7.4 `dukkan` bedelinde pencere: seçenekler ve karar (baş lider kararı 2)

| Seçenek | Açıklama | Değerlendirme (doğrulanmış bulgulara göre, §2.4) |
|---|---|---|
| A | G7'de bedel dikeydeki gibi 4 pencere içerir; oyuncu NPC'den ithal eder | Mümkün ama kırılgan: emir **bir sonraki saat tıkında** gerçekleşir, elle oran/süre/iptal gerekir, unutulursa tüketim sürer; yeni oyuncu zinciri (ekmek) kurarken ek bir ticaret emri yuvası ve ≈ 2.450 ₺ (R0 = 558 ₺ × 4 × 1,1) harcar; "ilk dükkân medyan ≤ 36 sa" (A0-11) bu bekleme ve hataya duyarlı |
| **B (önerim)** | **G7'de bedel pencere içermez** (`celik`, `parca`); G8'de `ekYapilar.dukkan.insaMaliyeti.pencere` eklenir (yalnız yeni kurulumlar; bedel tek sefer ödendiği için mevcut dükkânlar etkilenmez) | G7 kabulü pazar ithalat hattına bağlı değil; G8'de zincir bitince bağ kurulur (dükkân → pencere talebi = G11'in amacı); parametre değişimi kural sürümünü değiştirir (dönem sınırı; Alfa-0 öncesi canlı dünya yok) |
| C | `yeniOyuncu.baslangicStok`'a `pencere` eklenir | Kit değişimi tüm yeni oyuncuları etkiler, "başlangıç kiti yeni mala verilmez" göç ilkesine (docs/06 §14.2) ters, mal faucet'ı |

**Önerim B.** Baş lider onayı bekler (GZ-15). **Etkileşim:** dükkân bedeli G8'de pencere içerdiğinde ilk-5 indirimi `floor(4 000 × 0,7)` ile hesaplar (`mulk/komut.ts:373-380`); A2 yeni bedeli R0'la hesaplar.

### 7.5 Raf, fiyat, hız sınırı

- 1 yuva = 1 mal; aynı mal iki yuvada olamaz. Yuva indeksi 0'dan; sayı `olcekler[olcek].rafYuvasi`.
- Rafa konabilen mal: `dukkanTurleri[tur].mallar` içinde (DUK-13). Mal koymak/değiştirmek yuvanın fiyat kademesini `varsayilanFiyatKademesi`'ne çeker.
- **Fiyat kademesi** `dukkan_fiyat.fiyat`: `0 .. fiyatKademeleriPpm.length − 1` (`secim`); fiyat = `R × fiyatKademeleriPpm[k] / PPM`. **Tutar komutta ve durumda yoktur.** İsimler (ucuz, normal, pahalı, ...) arayüz (T1) işidir; çekirdek yalnız indeks bilir. Kademe **sayısı ve sırası kalıcıdır**; çarpan değerleri kalibre edilebilir (GZ-3).
- **Hız sınırı:** dolu yuvada `mal` değiştirme ya da `fiyat` değiştirme, yuvanın son değişiminden (`fiyatT`) `fiyatDegisimEnAzSaat` saat sonra yapılabilir (DUK-18). İlk doldurma ve boşaltma sınırdan muaftır. Sınır komut başına tam çözüm maliyetini (docs/06 §15.9) sınırlamak içindir.
- Raf yuvası **boşken** çekime girmez; çeşit paydasında sayılmaz.

### 7.6 Sayı sınırları

Oyuncu başına ilçede ≤ `ilceBasinaEnFazla` (taslak 2) dükkân (biten + süren), ilde ≤ `ekYapilar.dukkan.enFazlaIlBasina` (taslak 6; mevcut genel kural `mulk/komut.ts:334-336`), ilçe %25 ve 72 hücre tavanı dükkânın hücrelerine de uygulanır (`alimPlani`). Arsa kullanım türü (konut/ticari) **yok** (§19 Soru 5): fikstürde alan yoktur; her uygun hücreye dükkân kurulur.

### 7.7 Marka (sınırlı serbest metin; baş lider kararı 4)

**Yer: çekirdek durumunda** (`MulkOyuncuDurumu.markalar`), gerekçe ve karşı seçenek §20 GZ-8'de. Komutlar: `marka_tanimla`, `dukkan_marka`, sistem yolunda `marka_sifirla` (moderasyon).

**Marka çekimi, fiyatı, satışı, çeşidi etkilemez** (canlı §4.1 kuralı; perakende §3.1). Test: aynı dünya markalı ve markasız, `istek` ve gelir birebir aynı.

**Doğrulama (çekirdek, saf, `mulk/marka.ts` `markaAdiHatasi(ad, p)`; kural dönemi dışında DEĞİŞMEZ, tekrar oynatma güvenli):**

| Madde | Kural |
|---|---|
| 1. Uzunluk | `ad.length` (UTF-16 kod birimi) `adMin` (2) ile `adMax` (24) arasında. İzinli kümede yalnız BMP, ön bileşik karakterler bulunduğundan **bir karakter = bir kod birimi**; Türkçe harfler (ç ğ ı i ö ş ü, İ) tek karakterdir. Protokol de `min(2).max(24)` |
| 2. İzinli küme | Yalnız: `A-Z a-z Ç Ğ İ Ö Ş Ü ç ğ ı ö ş ü`, `0-9`, boşluk (U+0020), `.`, `'`, `-`, `&`. Düzenli ifade (çekirdekte sabit): `^[A-Za-zÇĞİÖŞÜçğıöşü0-9 .'&-]+$`. Birleşen işaretler, emoji, kontrol karakterleri, eğik/Unicode kesme işaretleri **reddedilir** (normalleştirme gerekmez) |
| 3. Düzenleme | **Reddet, düzeltme yapma:** baştaki/sondaki boşluk (`ad !== ad.trim()` değil; yalnız U+0020 denetlenir), ardışık boşluk (`"  "`), **en az bir harf** (`[A-Za-zÇĞİÖŞÜçğıöşü]`). İstemci göndermeden önce kırpar (K1). Böylece günlükteki metin = durumdaki metin (yeniden oynatmada dönüşüm yok) |
| 4. Yasaklı adlar | **Çekirdekte yok.** Liste **veri dosyasıdır** (`packages/veri/icerik/yasakli-adlar.json`, T3 + hukuk/hassasiyet incelemesi) ve **sunucunun komut kabul süzgecinde** (günlüğe yazmadan ÖNCE) uygulanır: `sunucu/src/marka-suzgec.ts` (K2). Gerekçe: liste moderasyon için güncellenir; çekirdekte olsaydı (a) her güncelleme kural sürümünü değiştirirdi (dönem sınırı), (b) günlükte kabul edilmiş eski bir ad, yeni listeyle **yeniden oynatmada reddedilir** ve "başarılılar günlüğü = canlı dünya" değişmezi bozulurdu. Çekirdek yalnız sözdizimini denetler (değişmez kural) |
| 4a. Karşılaştırma | Büyük/küçük harf ve aksan **duyarsız**; çekirdek-dışı sabit katlama tablosu (yerel ayar yok): `A-Z → a-z`; `İ I ı i → i`; `Ç ç → c`; `Ğ ğ → g`; `Ö ö → o`; `Ş ş → s`; `Ü ü → u`; ayırıcılar (`boşluk . ' - &`) kaldırılır. İki liste: `yasakliKelimeler` (katlanmış **kelime** eşitliği; kısa adlar: "bim", "a101", "sok"), `yasakliIcerik` (katlanmış, ayırıcısız adın **alt dizgisi**; uzun adlar ≥ 5 karakter: "migros", "carrefour"...). Liste içeriği K34 (gerçek zincir adları) + küfür/hassas içerik; kapsamı **(doğrulanmadı)**; hukuki/marka taraması ayrı iştir. Süzgeç bot/ajan yoluna uygulanmaz (bot `marka_tanimla` vermez) |
| 5. Reddin kaynağı | Sözdizimi ret iletileri çekirdekten (MRK-01…MRK-10, §9.3); liste reddi sunucudan (`marka adi kullanilamaz`, MRK-12) |

**Durum ve özet etkisi.**

- Alan: `MulkOyuncuDurumu.markalar?: { ad: string; simge: number; renk: number }[]` (en çok `hesapBasinaEnFazla` = 3). **Yalnız ilk `marka_tanimla` başarılı olunca yazılır**; hiç marka tanımlamamış oyuncuların ve eski dünyaların durum metni ve `durumOzeti` **değişmez** (`yaz`, `ozet.ts:31-80`, tanımsız alanı atlar).
- Metin kanonik JSON'da `JSON.stringify` ile ve UTF-8 üzerinden FNV-1a 64 ile özetlenir (`ozet.ts:93-110`); izinli küme yalnız BMP karakterlerinden oluştuğu için platformlar arası kodlama farkı doğmaz (tek başına duran vekil (surrogate) kod birimi kümede yoktur). `mulkDogrula` (`serilestir.ts:522-`): `markalar` dizisi uzunluğu ≤ 3, her `ad` aynı `markaAdiHatasi` ile, `simge < simgeSayisi`, `renk < renkSayisi`; ihlal `SerilestirmeHatasi` (bozuk görüntü reddi).
- `dunyaIcerikUyumu` (`serilestir.ts:681`): her `DukkanDurumu.marka < markalar.length`.

**KVKK ve kötüye kullanım.** Marka adı serbest metindir ve kişisel veri içerebilir (ör. kişi adı); komut günlüğü ekleme-yalnız olduğundan **silme** doğrudan mümkün değildir. Önlemler: (1) kısa ve kısıtlı karakter kümesi (adresleme/URL/e-posta kalıpları zor); (2) arayüzde "marka adın dünyadaki herkese görünür ve kalıcıdır" uyarısı (T1 metni, G9); (3) sunucu yönetici yolu **`marka_sifirla {oyuncu, marka}`** (sistem yolu, yalnız `kimlik` + `secim` alanı): adı çekirdek sabiti `"adsiz marka"` yer tutucusuna çevirir (izinli kümede, `markaAdiHatasi`'ndan geçer); günlüğün eski komut metni için sunucu saklama politikası (anlık görüntü + günlük kırpma) K2/O3 işidir **(doğrulanmadı: günlük kırpma ilkesi)**; (4) KVKK hukuki görüşü (docs/12 S4-5 ile aynı iş). Karşı seçenek (sunucu profili) GZ-8'de.

### 7.8 `ilk_dukkan` tetiği (K2) ve çekirdek okuma API'si

Rehber değişmezi: ödül bedelden ucuz alınamasın (`dedektor.ts:23-26`). **Tetik: ilk satış** (yapı bitti DEĞİL): koşul = oyuncunun düğümlerinden birinde tamamlanmış `dukkan` ek yapısı **ve** `dukkanGeliri(d, oyuncu, t) > 0`. Çekirdek okuma API'si (`mulk/perakende.ts`, dışa açılır): `dukkanGeliri(d, oyuncu, t): Mili` (`n + oran × (t − t0)/SAAT` tembel; `uretimTembel` kalıbı `dedektor.ts:57-62`), `dukkanlar(d, oyuncu): { dugum, yapi }[]`. K2: `ODUL_YER_TUTUCULARI`'ndan `ilk_dukkan` çıkar, `ODUL_IZGARA_KAVRAMLARI`'na girer (`dedektor.ts:27-29`), `kavramSaglandi` `case "ilk_dukkan"`; istemci `harita/baglanti.ts:376` `etkin` listesi (K1). Ödül tablosu (`ilk_dukkan`: 10 000 mili çelik, `parametreler.json:11`) **değişmez**.

### 7.9 Çevrimdışı ve sahiplik

Satış tembeldir; sahip çevrimdışıyken sürer ("çevrimdışı satar"). Dükkân bırakılamaz/yıkılamaz (mevcut `parsel_birak` yapılı hücreyi reddeder, `mulk/komut.ts:582`); yıkım/iade bu şartnamede yok. Hareketsizlik merdiveni (docs/11 §7.8) bugün yalnız veridir; dükkâna özel kural yok.

---

## 8. G8: cam → pencere ve yapı market

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


### 8.1 Ne eklenir

1. **Veri (T3):** yöntemler `cam_firini` (indeks 28, ev sahibi **`parca_fabrikasi`**) ve `celik_dograma` (indeks 29, `parca_fabrikasi`), `mulkKipi: true` (§3.2, §4.4; **değerler A2 §1.4/§1.13**: cam 60 silis + 16 yakıt + 18 elektrik → 50; doğrama 24 çelik + 32 cam + 5 parça + 15 elektrik → 28); tür listesi `parca_fabrikasi.yontemler = [standart_parca, otomatik_hat, cam_firini, celik_dograma]`; dükkân türü `yapi_market` (`olcekAraligi [0]`, `mallar`: `pencere, celik, cam, parca`); `talep1000Saat` satırları bu mallar için A2 §1.9'da (V4 gereği zorunlu); `kimlik-listesi.json` `yontemler`'e iki kayıt (§3.5).
2. **Dükkân bedeli:** `ekYapilar.dukkan.insaMaliyeti.pencere` eklenir ve para eşdeğeri düşer (parametre; §7.4, S-13; A2 §1.7).
3. **Çekirdek kodu: yok.** Cam/pencere yalnız yöntem; `yapi_market` yalnız tür verisi; yerel kanal G7a'dan gelir; elektrik ve yakıt G6'nın şebekesinden gelir.
4. **Testler/bot:** §16, §15.

### 8.2 Zincir ve enerji

`cam_firini` (18 elektrik, 16 yakıt) ve `celik_dograma` (15 elektrik) **santralsiz çalışır**: elektrik ve yakıt şebekeden gelir (§5.2). Bir tesis bir anda tek yöntemle çalışır: pencere hattı **iki** `parca_fabrikasi` tesisi (biri `cam_firini`, biri `celik_dograma`) tutar. Zincirin tesis dökümü (Alfa-0): silis (ithal ya da kendi `silis_ocagi`, rezervli il), cam fırını, çelik doğrama; çelik ve parça NPC ithalatıyla (ticaret emri); çıktı: pencere ihracatı ve `yapi_market` rafı. Ticaret emri yuvası (temel 4 + Ticaret ofisi): silis, çelik/parça, pencere ihracatı (A2 §1.3-B2 emir yuvası tablosu: yakıt ve elektrik yuva harcamaz). `esZamanliInsaat = 2` ve ilk 5 yapı indirimi zincir kuruluş süresini belirler (A2 §1.8: cam → pencere santralsiz 1,2 sa). Pencere hattı ekmek hattının ≈ %20'si kadar kazandırır (A2 §1.12): vaat zincir marjından değil yapı market perakendesinden ve kamu/yapı talebinden gelir.

### 8.3 Yapı market ve alıcı

`yapi_market` dükkânı pencere, çelik, cam, parçayı **yalnız NPC hane talebine** satar (G7a). **Oyuncu-alıcı (toplu alım) yok** (baş lider kararı 7): oyuncudan oyuncuya fiyat ayarlı satış, alt hesaplar arası para aktarma (aklama) kanalıdır. Fiyat bandı ve esnaf payı diğer türlerle aynıdır. `ilk_dukkan` G7'de zaten tetiklenir.

### 8.4 G8 kabul ölçütü

§17. Özet: yeni iki yöntemle bölge kipi yöntem izdüşümü 12 noktada birebir (yalnız G8 eklemesi + G6 eklemesi birlikte); mülk kipinde santralli ilde silis → cam → pencere zinciri `pencere` üretir, `yapi_market` rafında satılır, `yerelNpc` > 0; bot zinciri (A0-11) tamamlanır; dükkân bedeli pencere içerir ve dükkân inşa testi (ithal pencereyle) geçer.

## 9. Komutlar ve ret iletileri

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


Çekirdek ret iletileri **küçük harfli ASCII-Türkçe** düz dizgidir (mevcut gelenek: `mulk/komut.ts`; `KomutSonucu = { tamam: false, hata }`, hata kodu alanı yoktur). Aşağıdaki **kod** belge, test ve K1 çeviri tablosu içindir; çekirdek yalnız ileti metnini döndürür. Görünen Türkçe metin (aksanlı, cümle düzeni) K1/T1'in `hata-mulk.ts` düzenli ifade tablosundadır (`istemci/src/harita/hata-mulk.ts:12-52` kalıbı); arayüz metninde büyük harf yok, para `1.234 ₺`.

### 9.1 Yeni komutlar (`tipler.ts` `Komut` birliği, `:638-674`)

```ts
// tipler.ts: MulkKomutu (:966-975) ve Komut içine
| { tur: "dukkan_raf";    dukkan: number; yuva: number; mal: string | null }   // null = yuvayı boşalt
| { tur: "dukkan_fiyat";  dukkan: number; yuva: number; fiyat: number }         // fiyat = kademe indeksi (secim)
| { tur: "marka_tanimla"; marka: number; ad: string; simge: number; renk: number }
| { tur: "dukkan_marka";  dukkan: number; marka: number }
// Sistem yolu (motor.ts uygula(), sistem_odul kalıbı :182-184):
| { tur: "marka_sifirla"; oyuncu: OyuncuId; marka: number }

// Mevcut komutlara isteğe bağlı alan (tipler.ts:966-975):
| { tur: "tesis_insa_hucre"; ...; olcek?: 0 | 1 | 2; dukkanTuru?: string }
| { tur: "yapi_yerlestir";   ...; olcek?: 0 | 1 | 2; dukkanTuru?: string }
```

`dukkan` = `EkYapiDurumu.id` (dünya genelinde benzersiz, `mulk/yapi.ts:54`). Tutar, miktar, oran, adet alanı **yoktur**.

**`komutSemasi.ts` (`:14`, `:17`, `:27-64`):** `AlanTuru`'na `"metin"` eklenir (**`SISTEM_ALAN_TURLERI`'ne EKLENMEZ**: sistem/ajan yolunda serbest metin yasak, docs/12 §10 "oyuncu serbest metni ajana girmez"). Girişler (tip tam olduğu için derleme zorlar):

```ts
dukkan_raf:    { yol: "oyuncu", alanlar: { dukkan: "kimlik", yuva: "secim", mal: "kimlik" } },
dukkan_fiyat:  { yol: "oyuncu", alanlar: { dukkan: "kimlik", yuva: "secim", fiyat: "secim" } },
marka_tanimla: { yol: "oyuncu", alanlar: { marka: "secim", ad: "metin", simge: "secim", renk: "secim" } },
dukkan_marka:  { yol: "oyuncu", alanlar: { dukkan: "kimlik", marka: "secim" } },
marka_sifirla: { yol: "sistem", alanlar: { oyuncu: "kimlik", marka: "secim" } },
tesis_insa_hucre: { ..., dukkanTuru: "kimlik" },   // :60
yapi_yerlestir:   { ..., dukkanTuru: "kimlik" },   // :62
```

`para-guvenligi.test.ts` "miktar/oran/adet açık listesi" **değişmez** (yeni hiçbir alan miktar/oran/adet değil); yeni test: sistem yolundaki tüm komutlar `SISTEM_ALAN_TURLERI` içinde kalır (`marka_sifirla` uyar; `metin` yok).

**`motor.ts`:** `yonlendir` (`:203-249`): `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka` → `mulkKomutu` (`:234-239` listesine), `mulkKomutu` içinde `perakendeKomutu`'na devir (`mulk/komut.ts:497` switch'ine dört `case`); `marka_sifirla` `uygula` içinde `sistem_odul` yanına (`:182-185`): `k.oyuncu === SISTEM_OYUNCUSU ? markaSifirla(d, komut.oyuncu, komut.marka) : hata("marka_sifirla yalnizca 'sistem' ile verilebilir")`; `yonlendir` kapsayıcılık `default: never` kolu (`:244-248`) ve `case "marka_sifirla": return hata("marka_sifirla yonlendirilemez")`.

### 9.2 Doğrulama sırası (hepsi ya da hiçbiri; başarısız komut durumu değiştirmez, docs/06 §14)

**Dükkân kurulumu** (`yapi_yerlestir`, `tesis_insa_hucre`; `tesisTuru === "dukkan"`): mevcut denetimler aynen (ilçe, hücre listesi, kenar-bitişiklik, sahiplik, 72/%25, ayrılmış hücre, ilk-yapı indirimi, `esZamanliInsaat`, hazine/stok) **+** sıra: (1) `perakende` açık (DUK-00); (2) `dukkanTuru` var (DUK-01), `dukkan` dışı tür için verilemez (DUK-02); (3) bilinen tür (DUK-03); (4) `olcek` `acikOlcekler` içinde (DUK-04) ve türün `olcekAraligi`'nda (DUK-05); (5) hücre sayısı `ekYapilar.dukkan.olcekHucre[olcek]` (mevcut ileti DUK-08); (6) ilçe sınırı (DUK-06) ve il sınırı (mevcut DUK-07).

**`dukkan_raf`:** (1) DUK-00; (2) dükkân bul (oyuncunun düğümleri; yoksa DUK-10); (3) `yuva` tamsayı ve `[0, raf.length)` (DUK-12); (4) `mal === null`: yuva boşsa DUK-19a, değilse boşalt; (5) `mal` dize ve `ic.malIndeks`'te (DUK-15); türün mal kümesinde (DUK-13); başka yuvada değil (DUK-14); aynı yuvada aynı mal değil (DUK-19b); (6) dolu yuvada mal **değiştirme** ise hız sınırı (DUK-18); (7) uygula: `mal` yaz, `fiyat = varsayilanFiyatKademesi`, değiştirme ise `fiyatT = d.zaman` (ilk doldurma `fiyatT` yazmaz), boşaltmada `fiyatT` silinir.

**`dukkan_fiyat`:** (1)–(3) aynı; (4) yuva boşsa DUK-17; (5) `fiyat` tamsayı ve `[0, K)` (DUK-16); mevcut kademeyle aynıysa DUK-19c; (6) hız sınırı DUK-18; (7) `fiyat`, `fiyatT = d.zaman`.

**`marka_tanimla`:** (1) DUK-00; (2) `marka` tamsayı, `0 ≤ marka ≤ markalar.length` (MRK-01) ve `marka < hesapBasinaEnFazla` (MRK-02); (3) `ad` sözdizimi (MRK-03…MRK-08, §7.7); (4) `simge`/`renk` aralık (MRK-09, MRK-10); (5) mevcut markayla birebir aynıysa MRK-11; (6) uygula: `marka === length` ise ekle, değilse üzerine yaz.

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

Mevcut kodun yeni durumlarda da döndüreceği iletiler (K1 çevirisi var): `yetersiz stok: <düğüm> (mal indeksi <n>)`, `yetersiz hazine (gereken <n>)`, `hucre ...`, `ayni anda en cok <n> insaat`, `ilde isletme yok: <il>`. **K1 notu:** `yetersiz stok` çevirisi bugün "çelik ya da makine parçası" der (`hata-mulk.ts:~41`); G8'den sonra dükkân bedeli pencere içerir: ileti mal adını söylemeli (çekirdek iletisi mal **indeksi** verir; `ad` çevirisi K1'de dizinden).

---

## 10. Protokol alanları (yalnız ekleme)

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


`PROTOKOL_SURUMU` (`mesajlar.ts:~28`) **değişmez**; tüm yeni alanlar isteğe bağlıdır, eski istemci yok sayar, eski sunucu göndermez. K3'ün tür eklemesi ile K2'nin zod satırları **aynı kapıda** birleşmelidir (B5): `komut-sema.ts:80-82` `_KomutDenetimi` ve `Esit` kontrolü K3 tek başına landed olursa `@bolge/protokol` derlenmez.

### 10.1 `packages/protokol/src/komut-sema.ts` (K2)

`discriminatedUnion` (`:24-77`) içine ve mevcut iki komuta:

```ts
z.object({ tur: z.literal("dukkan_raf"), dukkan: tamsayi, yuva: tamsayi, mal: z.union([kimlik, z.null()]) }),
z.object({ tur: z.literal("dukkan_fiyat"), dukkan: tamsayi, yuva: tamsayi, fiyat: tamsayi }),
z.object({ tur: z.literal("marka_tanimla"), marka: tamsayi, ad: z.string().min(2).max(24), simge: tamsayi, renk: tamsayi }),
z.object({ tur: z.literal("dukkan_marka"), dukkan: tamsayi, marka: tamsayi }),
z.object({ tur: z.literal("marka_sifirla"), oyuncu: kimlik, marka: tamsayi }),   // yalnız yönetici kimliği (sunucu "sistem" damgalar)
// :62-71 tesis_insa_hucre ve yapi_yerlestir: dukkanTuru: kimlik.optional()
```

Protokol yalnız **biçim** denetler (docs: `komut-sema.ts` başlığı); sözdizimi kuralları çekirdektedir. `ad` üst sınırı bayt değil kod birimi (BMP).

### 10.2 `packages/protokol/src/kare.ts` (K2; hepsi isteğe bağlı)

| Alan | Kime | Biçim | Not |
|---|---|---|---|
| `GenelBolgeKaresi.dukkanlar?` (`:~67`) | herkese | `Array<[id: number, tur: string, olcek: 0\|1\|2, markaAd: string, simge: number, renk: number]>` | tabela için; markasızsa `markaAd = ""`, simge/renk 0. Hücrenin `tur` alanı (`HucreKaresi`) zaten `"dukkan"` der |
| `OzelBolgeKaresi.dukkanlar?` (`:~81`) | yalnız sahibine | `Array<[id: number, raf: Array<[mal: string, fiyat: number]>, istekMiliSaat: Mili]>` | raf yuva sırasıyla; boş yuva `mal = ""`; `istekMiliSaat` = §6.8 `yerelPazarGorunumu` toplamı (türetilmiş) |
| `OyuncuKaresi.markalar?` (`:~128`) | yalnız kendisine | `Array<[ad: string, simge: number, renk: number]>` | |
| `IlgiKaresi.fiyat` | herkese (mevcut) | mal indeksine göre R (`d.pazar.fiyat`) | dükkân panelinin "R" ve kademe fiyatı hesabı için zaten var |

İstemci dükkân panelinin (G9) ihtiyacı: kademe tablosu, tür/mal listeleri, ölçek tabloları **veri paketinden** (`param.mulk.perakende`) okunur: ek mesaj yok. İlçe talebi (`Q`) ve esnaf payı gösterimi G9'da `IlceKaresi.talep?` ile istenirse K2 sonra ekler (G7 kabulünü bağlamaz).

### 10.3 Sunucu (K2)

| Konu | Dosya | Değişiklik |
|---|---|---|
| `ilk_dukkan` dedektörü | `sunucu/src/odul/dedektor.ts:14,27-29,158-175` | §7.8 |
| Marka süzgeci (günlüğe yazmadan önce) | `sunucu/src/yazar.ts` komut kabul yolu (**doğrulanmadı: tam konum**) + yeni `marka-suzgec.ts` | `marka_tanimla.ad` katlanıp `yasakli-adlar.json` ile karşılaştırılır; ret `marka adi kullanilamaz`; süzgeç dosyası sıcak güncellenebilir (kural sürümü değişmez) |
| "Sen yokken" net sonucu: satış kalemi | `sunucu/src/donus/anlik.ts:27-29`, `donus/ozet.ts:76`, `donus/izleyici.ts:95-104` | anlık görüntüye `dukkanGeliri` (çekirdek `dukkanGeliri(d, oyuncu, t)`); `satis = ihracat farkı + dukkan geliri farkı`; `satis + gider + diger = hazineFarki` birebirliği korunur. Yeni şablon gerekmez (`donus.bitti.insaat` ek yapı kimliği `dukkan`'ı zaten taşır, `donus.ts` `DONUS_SABLON`) |
| Para arzı panosu satırları | `sunucu/src/metrik.ts` (**doğrulanmadı**: pano bugün yok, `mulk.para` sayaçları var) | §12.3 |
| Kural sürümü göçü | `sunucu/src/yazar.ts:~611` | her G6/G7/G8 veri değişimi `kuralSurumu`'nu değiştirir; dönem sınırında `gocIzni` (docs/06 §14.2 sunucu notu) |

### 10.4 İstemci (K1/T1; G9 öncesi kancalar)

`istemci/src/komut/gizli.ts:11,19`: `marka_sifirla` → `GIZLI_KOMUTLAR`; `dukkan_raf`, `dukkan_fiyat`, `marka_tanimla`, `dukkan_marka` → `HARITA_KOMUTLARI` (dükkân paneli haritadan/İşletmem'den gönderir; G9). `istemci/test/komut.test.ts:92-117` `toEqual` listeleri güncellenir. `harita/hata-mulk.ts`: §9.3 çevirileri. `harita/baglanti.ts:376`: `ilk_dukkan` `etkin`. Dükkân paneli ve giriş ekranı G9.

---

## 11. Serileştirme ve göç

### 11.1 Yeni durum alanları

| Alan | Konum | Ne zaman yazılır | Doğrulayıcı (`serilestir.ts`) |
|---|---|---|---|
| `EkYapiDurumu.dukkan?` | `tipler.ts:303` | `ekYapiTamamla` (`tur === "dukkan"`) | `dunyaDogrula` ekYapılar bloğu (`:327-336`) bugün yalnız `{id, tur, hucreler}` doğruluyor, `alanlar()` ek alana izin veriyor → **açık doğrulayıcı şart**: `tur: dize`, `olcek ∈ {0,1,2}`, `marka` tamsayı ≥ 0, `raf` dizi, her yuva `{mal?: dize, fiyat: tamsayı ≥ 0, fiyatT?: tamsayı ≥ 0}`; ek yapı kimliği `dukkan` olmayanda `dukkan` alanı **yasak** |
| `InsaatDurumu.dukkanTuru?` | `tipler.ts:476-503` | dükkân inşaatı sürerken | `$.insaatlar[i]` (`:392`) `dize` |
| `MulkOyuncuDurumu.markalar?` | `tipler.ts:773-797` | ilk `marka_tanimla` | `mulkDogrula` oyuncular (`:557-585`): ≤ 3 eleman, `ad` = `markaAdiHatasi` sonucu null, `simge`/`renk` ≥ 0 |
| `MulkOyuncuDurumu.dukkanGeliri?` | aynı | ilk dükkân gelirinde | `sayacDogrula` (`:470-476`) |
| `ParaAkisi.yerel?` (G7) | `tipler.ts:884-896` | `yerel > 0` iken | `paraAkisi` alanları (`:568-584`): `alanlar(...)` zorunlu listesine **eklenmez**, isteğe bağlı: tamsayı ≥ 0 |
| `ParaDurumu.musluk.yerelNpc?` | `tipler.ts:854-860` | ilk yerel gelirde (tembel; G7) | `paraDogrula` (`:478-505`): izinli anahtarlar = `MUSLUK_KALEMLERI` ∪ `MUSLUK_ISTEGE_BAGLI = ["yerelNpc"]`; **zorunlu** liste değişmez; varsa `sayacDogrula` |
| `ParaDurumu.lavabo.sebeke?` | `tipler.ts:854-860` | ilk şebeke bedeli birikiminde (tembel; G6) | `paraDogrula`: izinli lavabo anahtarları = `LAVABO_KALEMLERI` ∪ `LAVABO_ISTEGE_BAGLI = ["sebeke"]`; zorunlu liste değişmez |
| `KasaDurumu.giris.sebeke?` | `tipler.ts:863-865` | ilk kasa payı birikiminde (tembel; G6) | `paraDogrula` (`serilestir.ts:493-494`): izinli = `KASA_GIRIS_KALEMLERI` ∪ `KASA_GIRIS_ISTEGE_BAGLI = ["sebeke"]`; zorunlu `sayacDogrula` döngüsü yalnız zorunlu kalemleri dolaşır, `sebeke` varsa ayrıca |
| `ParaAkisi.sebeke?` | `tipler.ts:884-896` | `sebeke > 0` iken (G6) | `paraAkisi` (`serilestir.ts:570-572`): `alanlar(pa, …, [... , "sebeke"])` izinli listesine **isteğe bağlı** eklenir; `tamsayi ≥ 0`; `paraAkisi.kasa[].kalem` kontrolü (`:581`) `KASA_GIRIS_ISTEGE_BAGLI`'yı da kabul eder |
| `BolgeElektrikDurumu.sebekeMili?` | `tipler.ts:222-237` | `sebekeMili > 0` iken (G6) | `serilestir.ts` bu nesneyi doğrulamıyor (doğrulandı: arama); K3 `tamsayi ≥ 0` denetimi ekler |
| `InsaatDurumu.yontem?` | `tipler.ts:476-503` | `yontem` verilen tesis inşaatında (G6) | `$.insaatlar[i]` (`:392`): `dize`; `dunyaIcerikUyumu`: yöntem içerikte ve türün listesinde |

`Dunya` üst düzeyine alan **eklenmez** (`DUNYA_ISTEGE_BAGLI`, `serilestir.ts:244`, değişmez). `paraDurumuKur` (`paraSayac.ts:54-60`) **yeni kalemi yaratmaz** (yoksa tüm mülk dünyalarının özeti değişirdi; K3 keşif tuzağı).

**Lazy yaratma kuralı (şebeke, yerelNpc, kasa kalemleri ortak):** `paraDurumuKur` (`paraSayac.ts:54-60`) ve `kasaAl` (`mulk/kasa.ts:47`) yeni kalemi **yaratmaz**; kalem yalnız ilk birikimde `??= sayacSifir()` ile doğar (aksi halde her mülk dünyasının özeti ve `fikstur-goc/mulk-v1.json` yüklemesi değişirdi). Korunum testinin toplayıcıları (`para-guvenligi.test.ts:98-100`, `:215-216`) ve `kasaToplam` (`kasa.ts:56`) isteğe bağlı kalemleri de toplar.

### 11.2 İçerik uyumu (`dunyaIcerikUyumu`, `serilestir.ts:681-`)

Eklenenler: (a) `perakende` tanımsızken herhangi bir `DukkanDurumu` varsa hata; (b) `DukkanDurumu.tur` ∈ `perakende.dukkanTurleri`; (c) her yuvanın `mal` kimliği `ic.malIndeks`'te ve türün mal kümesinde (**yeni içerik eski dükkânın malını kaldırırsa** hata değil uyarı değildir: yalnız-ekle ilkesi mal/tür çıkarmayı yasaklar); (d) `fiyat < fiyatKademeleriPpm.length`; (e) `raf.length === olcekler[olcek].rafYuvasi`; (f) `marka < markalar.length`.

### 11.3 Göç ve eski görüntü

- **Yöntem ekleme yalnız-ekle:** `anlikGoruntuUyarla` (`goc.ts`), `gocIzni + yalnizEkleZorunlu` ile ihlalsiz; `eklenen.yontemler` G6'da 4, G8'de +2 (G6+G8 birlikte 6); `Dunya`'da yöntem indeksli dizi yoktur (`tesis.yontem` indeks) → **`durumOzeti` değişmez, `kuralSurumu` değişir** (K3 keşif §1). `icerik-kimlik-kilidi.json` sona ekleme olduğundan güncellenmez.
- **`fikstur-goc/mulk-v1.json` yüklenmeye devam eder:** yeni alanların hepsi isteğe bağlı ve yalnız kullanılınca yazılır; `paraDogrula` zorunlu listesi değişmez. Test §16.
- **Göçsüz eski dünya (G6/G7 öncesi dünya yeni kodla):** `mulk.perakende` yok = dükkân kapalı; eski dünya olduğu gibi çalışır.
- **Yeni görüntü eski kodla:** yüklenemez (bilinmeyen alan/komut); geriye dönüş yok; kural dönemi geçişi yapılmadan sürüm geri alınmaz.
- **Komut günlüğü:** yeni komut türleri günlükte dize kimlikli; eski günlük yeni çekirdekle aynı sonucu verir (yeni komut içermez). **Dikkat:** marka adı günlükte açık metin kalır (§7.7 KVKK).
- **Dönem sınırı:** G6, G7 ve G8 verisi her biri `kuralSurumu`'nu değiştirir. Alfa-0 açılmadığından canlı dünya yoktur; yine de her dilimin kabulünde `anlikGoruntudenYukle(..., { gocIzni: true, yalnizEkleZorunlu: true })` provası yapılır (§16).
- **Boyut:** dükkân başına ≈ 0,3 KB (4 yuva), marka ≈ 0,06 KB; 1.000 oyuncu × 2 dükkân ≈ 0,6 MB ham görüntü (docs/06 §14 ölçekleriyle uyumlu; **doğrulanmadı**: ölçülmedi, K3 ölçer).

---

## 12. Para korunumu ve para arzı panosu

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


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
- **Üst sınır (hane bütçesi invariantı):** ilçe başına, mal başına, saatlik oyuncu geliri `≤ Q × R × 1,4 × (1 − esnaf.tabanPayPpm/PPM)` (en pahalı kademe ve esnaf tabanı); toplamı (dikey §5.9 hane bütçesi `B = Σ Q·R·1,12`) `B`'yi aşamaz **mekanik olarak** (1,4 × 0,75 = 1,05 < 1,12 `[A2]` taban payı %25 ise). Test §16 `perakende-para`: yerel gelir ≤ `Σ Q × R × 1,4 × (1 − taban)`.
- **Dağıtım sorusu (A2):** global NPC emilim ölçeği oyuncu sayısıyla büyüyor (`npcLikiditeOlcekPpm`, `pazar/tablo.ts:75-79`); yerel Q sabit. B5 "çift sayım" düzeltmesi (canlı §3.7) G7'de **yok**; ZP8 (`perakende NPC geliri / toplam NPC faucet ≤ %50`) izlenir; aşılırsa ayrı bir kalibrasyon sürümü (§21 S-5).

### 12.3 Para arzı panosu satırları (K2 pano oluşturduğunda)

| Satır | Kaynak | Tür |
|---|---|---|
| Yerel pazar (dükkân) geliri | `mulk.para.musluk.yerelNpc` (yoksa 0) | musluk (yeni para) |
| Dükkân işletme gideri | lavabo `isletme` içinde; ayrı satır için `ParaAkisi` değil, `yerelPazarGorunumu` `giderMiliSaat` toplamı | lavabo |
| NPC ihracat geliri, nüfus geliri, hibe, ödül | mevcut musluk kalemleri | musluk |
| Dükkân gelirinin ihracata oranı | `yerelNpc / (yerelNpc + ihracatNpc)` | ZP8 göstergesi |

### 12.4 Değişmezler ve testler (§16 `perakende-para`)

I1 korunum: 3 tohum × tohumlu rastgele koşu (parsel al/bırak, yapı, dükkân kur/raf/fiyat/marka, ithalat/ihracat, ödül, araştırma), her kontrol noktasında tam eşitlik (`para-guvenligi.test.ts:82-100` yardımcısı `yerelNpc`'yi toplar). I2 `Σ oyuncu dukkanGeliri == musluk.yerelNpc` (SAAT ölçekli). I3 hane bütçesi üst sınırı. I4 kasa girişleri yerel satıştan **etkilenmez** (`kasalar[].giris` aynı). I5 `d.pazar.fiyat`, `oyuncuArzi`, `oyuncuTalebi` yerel satışla **değişmez**. I6 nötrlük: sık/seyrek `paraUzlastir` kontrol noktası aynı sayaç.

### 12.5 Tutar taşımayan komut ilkesi

Dükkân komutlarının alanları: `dukkan` (kimlik), `yuva` (`secim`), `mal` (kimlik), `fiyat` (**`secim`: kademe indeksi**), `marka`, `simge`, `renk` (`secim`), `ad` (`metin`). Hiçbiri para/miktar/oran/adet değildir; sistem yolunda (`marka_sifirla`) yalnız `kimlik` ve `secim`. Fiyat tutarı çekirdekte **türetilir** (`R × kademe`), komutta ve durumda yoktur. Ajan yolu dükkân komutu taşıyamaz (sistem yolu `metin`/oyuncu komutu içermez).

### 12.6 Arbitraj analizi

NPC'den ithal edip rafa koymak **meşru ticaret yönüdür** (G12; ZP11 izler). Sınırlar: (1) ithalatın nakit çarpanı ≥ 1,035 R (en iyi durum: anlaşma + 2 Ticaret ofisi; `mulk/kamuFiyat.ts`), dükkân satış tavanı 1,4 R: birim marj ≤ 0,365 R; (2) satış hacmi `Q × (1 − esnafPay)` ile ve kasayla sınırlı; esnaf payı alt sınırı %25 `[A2]`; (3) stok **kaynağa göre ayrılmaz** (tembel stok; ithal/yerli ayrımı yok), bu yüzden "ithal rafa fiyat tavanı" (dikey §5.6) uygulanamaz; ZP11 alarmında çare yalnız bandın üst sınırını daraltmaktır (parametre); (4) kamu fiyat tavanı ve sipariş kancaları etkilenmez; (5) "S kur + yükselt = doğrudan" eşitliği G7'de dükkân için yoktur (`dukkan_yukselt` Alfa-1); doğrudan M/L bedeli tablo çarpanıdır ve test: `bedel(M) = bedel(S) × 2,5` tesis ölçek tablosuyla birebir (§16). **Risksiz sınırsız arbitraj yok** testi: ithalat → dükkân zincirinin saatlik net marjı `≤ (1,4 − 1,035) × R × hacim üst sınırı`.

---

## 13. Bölge kipi altınlarına etkisizlik kanıt planı

### 13.1 Üç ayrı kanıt (hepsi kapıda koşar)

**K-1: yöntem izdüşümü (bölge kipi).** P3 mal izdüşümü kalıbı (`mal-izdusumu-kanit.test.ts`, `esik-budama-kanit.ts` `kanitKaydi`/`esitNoktalar`): iki içerik, aynı koşu.

- `p4Oncesi(veri)`: güncel veriden tüm `mulkKipi` yöntemleri `icerik.yontemler`'den, ilgili tür listelerinden, `param.mulk.perakende` ve `ekYapilar.dukkan`'dan çıkarılır (başka hiçbir değişiklik yapılmaz); `kimlikListesi` eklenmez (dondurulmuş eski paket).
- Senaryo: mevcut 4 bot + bulanık komut, mini-6, tohum 3, 6 gün, `esitNoktalar(son, 12)` (en az `senaryolar` P3'tekiyle aynı; ek olarak sentetik-50 4 gün).
- Beklenen: 12 kontrol noktasında **tam `durumOzeti`**, etkin kuyruk (`sira` sıralı), işlenen etkin olay dizisinin zincir özeti ve `sayac.olay` **birebir aynı**. (P3'ten farkı: yöntem uzayı durumda indeks dizisi olarak yer almadığından izdüşüm gerekmez, **tam özet** eşit olmalıdır; eşit çıkmazsa süzgeç hatalıdır.)
- Ek: `p4Oncesi` ve güncel içerik `kuralSurumu` **farklı** (`kuralSurumuHesapla`), kimlik tablosu güncel için `yontemler` 29 elemanlı.
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

> **TASLAK (Parça 2):** Bu bölüm A2 `afdf29f` sayılarıyla, DUK/MRK tablolarıyla ve protokol ayrıntısıyla **Parça 2'de güncellenecektir**; K3'ün G6 şema dalı bu bölüme bağlı değildir. Önceki sürümden kalan A2 öncesi değerler ve `A2'den` işaretleri geçerli sayılmaz.


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

## 15. Botlar ve ölçüm

> **Parça 1 durumu:** G6 maddeleri tamdır; G7/G8 maddeleri (A0-11/A0-12, ZP ölçüleri, dükkân botu) **Parça 2**'de A2'nin sayılarıyla yazılır.

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

### 15.3 G7/G8 (Parça 2)

A0-11 ("ilk dükkân medyan ≤ 36 sa"), A0-12 (geri ödeme ≤ 48 sa; prim 1,05–1,20), ZP3/ZP8/ZP11 sayaçları, `yerelNpc` panosu, dükkân botu, cam → pencere önayarı (santralsiz) ve süre hedefi (A2 §1.8: ≤ 6 sa).

## 16. Test listesi

> **Parça 1 durumu:** G6 testleri tamdır. G7/G8 test adları taslaktır ve Parça 2'de ayrıntılanır. Hepsi **atlanmaz** (`skip`/`todo` yasak); yalnız kendi paketinin hedefli testleri koşulur, tam kapı O1'indir.

### 16.1 G6

| Test (dosya) | Sahip | Ne sınar |
|---|---|---|
| `veri/test/kimlik-listesi.test.ts` (genişler) | K3 | Y1–Y8: bozuk biçim, tekrar, ev sahibi listede yok, ad alanı kesişimi (+`hidro_santrali` istisnası), listede olmayan yöntem, araya ekleme / sıra değişimi / silme (önek ihlali), ev sahibi değişimi, `mulkKipi` uyuşmazlığı, 10'dan fazla yöntem **uyarısı**; `dukkanTurleri` geçişi; `yontemler` alanı yokken kilit uygulanmaz |
| `veri/test/dogrulama.test.ts` (genişler) | K3 | `mulkKipi`: varsayılan olamaz, teknoloji şartı yok; `sebeke`: `tavanOraniPpm` 0 / > 1 000 000 reddi, `kasaPayiPpm` aralığı, `mal` depolanamaz değilse ret, elektrik girdili yöntem yoksa ret; `yontemGecersizKilma`: bilinmeyen yöntem, aralık dışı değer; `.strict()` (yasak kilit anahtarları); sayım testleri (`yontemler` 24 → 28; G8: 30) |
| `cekirdek/test/yontem-izdusumu-kanit.test.ts` (yeni; `mal-izdusumu-kanit` kalıbı) | K3 | **K-1:** `p4Oncesi(veri)` (yeni yöntemler, `sebeke`, `yontemGecersizKilma` çıkarılmış) ↔ güncel içerik, bölge kipi, mevcut 4 bot + bulanık komut, mini-6, tohum 3, 6 gün, 12 kontrol noktasında tam `durumOzeti`, etkin kuyruk, olay zinciri özeti, `sayac.olay` birebir; `kuralSurumu` **farklı**; kimlik tablosu `yontemler` 28 elemanlı; **karşıt kanıt:** bayraksız sahte yöntem bölge botlarına görünür, bayraklısı görünmez |
| `cekirdek/test/sebeke-elektrik.test.ts` (yeni) | K3 | §5.2: (1) santralsiz `verimPpm > 0`, `sebekeMili = talep`, bedel formülü (`mili × 10 350 / 1 000`); **yakıt:** `ekmek_firini` ticaret emri **olmadan** çalışır, yakıt stoğu değişmez, `sebekeYakitMili = Σ girdi × verim`, `yakit: false` iken eski davranış (verim yakıt stoğuna bağlı); `fiyatReferansi` "canli" ↔ "taban" (yakıt fiyatı 115,4 ↔ 103,5 ₺ civarı); (2) santral ≥ talep: `sebekeMili` yok, yakıt tüketimi yükle ölçekli; (3) kısmi santral: `sebekeMili = talep − arz` tam; (4) santral tam yükte iken şebeke açığı; (5) **korunum I1** 3 tohum × rastgele koşu (şebekeli, kasa payı > 0 ve = 0); (6) lavabo + kasa girişi = bedel birikimi; **tamsayı örneği:** ödeme 397.576.620 → kasa 47.709.194 + lavabo 349.867.426 (`kasaPayiPpm = 120 000`); `kasaPayiPpm = 0` iken `giris.sebeke` yazılmaz; `ithalatNpc` ayrı ve etkilenmez (`ithKasa` kolu); (7) hazine 0: ödeme gücü, `borcSilme`, korunum tam, 48 saat tekrarlanabilirlik; (8) `tavanOraniPpm` < 1M fiyatı düşürür; (9) yetişme nötrlüğü: tek sıçrama = parçalı sıçrama = günlükten yeniden oynatma; (10) **bölge kipi** santralsiz verim 0, `sebekeMili` yazılmaz (K-4b) |
| `cekirdek/test/yontem-komut.test.ts` (yeni) | K3 | §5.8: `yontem` ile inşa → bitince tesis o yöntemle; `yontem` yokken `yontemler[0]`; ek yapıda `yontem` reddi; bilinmeyen yöntem; türde olmayan yöntem; `yontemAcikMi` reddi; reddedilen komut **durumu değiştirmez** (özet aynı); bölge kipi etkilenmez |
| `cekirdek/test/yontem-gecersiz-kilma.test.ts` (yeni) | K3 | §5.9: blok yok / `ciktiPpm = 1 000 000` aynı `durumOzeti` (K-5); `ciktiPpm = 750 000` mülk kipinde çıktı ×0,75, girdi aynı; bölge kipinde etkisiz; yalnız `b.merkez` düğümlerde |
| `cekirdek/test/serilestir-goc.test.ts` (güncel) | K3 | yöntem sona ekleme göç provası (`gocIzni + yalnizEkleZorunlu`); `eklenen.yontemler = 4`; `fikstur-goc/mulk-v1.json` yüklenir; yeni isteğe bağlı alanların tam gidiş-dönüşü (`sebekeMili`, `ParaAkisi.sebeke`, `lavabo.sebeke`, `giris.sebeke`, `InsaatDurumu.yontem`); bozuk değer ret testleri (negatif sayaç, bilinmeyen kalem) |
| `cekirdek/test/mal-izdusumu-kanit.test.ts` (güncel) | K3 | `p3Oncesi` yeni yöntemleri de çıkarır (B4); "eklenen" beklentileri |
| `cekirdek/test/para-guvenligi.test.ts` (güncel) | K3 | korunum yardımcısı isteğe bağlı kalemleri toplar; sistem komutu alan türleri değişmez; `yontem` alanı miktar/oran/adet **değil** (açık liste değişmez) |
| `mulk-{ilk-satis,olcek-kilitsiz,serilestir,yapilar}.test.ts`, `botlar/test/parsel.test.ts`, `olcum/test/parsel-kosu.test.ts` | K3 / O2 | §5.2.10 uyarlama |
| **K-2 (CI denetimi, test değil)** | O1 | dondurulmuş altınlar için `git diff --exit-code` (§13.1 K-2 listesi) |
| `sunucu/test/odul.test.ts` (güncel) | K2 | `degirmen` ve `ekmek_firini` ile `ilk_isleme` ve `zincir_kapandi` tetiklenir; `ilk_yapi`/`ikinci_ilce` etkilenmez |
| `protokol` komut-sema testi | K2 | `tesis_insa_hucre` ve `yapi_yerlestir` `yontem` alanı biçimi (isteğe bağlı, kimlik) |
| `botlar/test/` zincir önayarı | O2 | bot 7 günde `ekmek` üretir ve satar (santralsiz); bölge kipi botları yeni yöntemi seçmez |

### 16.2 G7 ve G8 (Parça 2 taslağı)

`perakende-veri` (şema, V1–V16, kilitsizlik, `.strict()`), `perakende-komut` (DUK/MRK reddi, durum değişmez), `perakende-cekim` (Ek B vektörleri, determinizm, sıra bağımsızlığı), `perakende-para` (I1–I6), `perakende-serilestir`, `perakende-yetisme`, `perakende-arbitraj`, `perakende-determinizm`, `marka-sozdizimi`, `marka-suzgec` (K2), `bolge-kipi-etkisiz` (K-3), G8: `yapi-market`, dükkân bedeli pencere, bot cam → pencere. K2/K1 listeleri (`kare`, `gizli.ts`, `komut.test.ts`).

## 17. Uygulama sırası ve kabul ölçütleri

**Sıra:** G4 (bu şartname) → baş lider onayı → K3 "hücre dizini" işi biter → **G6** → G7 → G8. Her dilim "öncekiler yeşilken" başlar: bir dilim, öncekinin tam kapısı (O1) yeşil olmadan başlamaz. **Aynı kapı kuralı (B5):** K3'ün `Komut` birliğine yaptığı her tür/alan eklemesi ile K2'nin `komut-sema.ts` zod satırı **aynı birleştirmede** gelir (`_KomutDenetimi` eşitliği, `komut-sema.ts:80-82`); K1'in `komut.test.ts` listeleri aynı kapıda güncellenir.

### 17.1 G6 alt adımları

| Adım | İş | Sahip | Bağımlılık | Kabul (komut: hedefli test) |
|---|---|---|---|---|
| G6-1 | **Şema (isteğe bağlı/no-op):** `YontemTanimi.mulkKipi`, `mulk.sebeke`, `mulk.yontemGecersizKilma`, `kimlik-listesi.json` `yontemler` bölümü + doğrulayıcı (Y1–Y8), `dogrulaKimlikKilidi`'ne `dukkanTurleri`, `MulkEkYapiTanimi.olcekHucre?` (G7 için, no-op) ve **komutlara `yontem?` tipi** (K2'nin zod satırıyla aynı birleştirme) | K3 (+K2 1 satır) | hücre dizini işi | `pnpm --filter @bolge/veri exec vitest run` (kimlik-listesi, dogrulama); `pnpm -r typecheck` yeşil; **hiçbir JSON değişmedi**, `durumOzeti` ve altınlar aynı |
| G6-2 | **Çekirdek (blok yokken no-op):** `icerikDerle` süzgeci; `elektrikUygula` şebeke yolu + `BolgeHesabi.sebekeMili`; `hazineKalemleri`/`paraAkisiYaz`/`paraMuhasebesi`/`kasaOranlari` şebeke kolları; `ParaAkisi.sebeke`, `lavabo.sebeke`, `giris.sebeke`, `BolgeElektrikDurumu.sebekeMili`, `InsaatDurumu.yontem` + doğrulayıcılar; `yontem` komut alanı; `yontemGecersizKilma` yolu | K3 | G6-1 | `sebeke-elektrik`, `yontem-komut`, `yontem-carpani` (sentetik veriyle: testler kendi veri kopyasında bloğu ekler), `serilestir-goc`, `para-guvenligi`; mevcut tüm çekirdek testler **değişiksiz** yeşil (blok yok = no-op kanıtı) |
| G6-3 | **Veri (tek commit; kural sürümü değişir):** T3: `icerik.json` 4 yöntem + tür listeleri; `parametreler.json` `mulk.sebeke`, `mulk.yontemGecersizKilma` (kapalı); `kimlik-listesi.json` `yontemler` (28 kayıt) | T3 | G6-2 | `dogrulaVeriPaketi`, `dogrulaKimlikKilidi`, `dogrulaPerakende` (V13–V17) geçer; `icerikDerle` tamam |
| G6-4 | **Kanıtlar ve test uyarlama:** `yontem-izdusumu-kanit` (K-1), `mal-izdusumu-kanit` uyarlama (B4), `mulk-*` ve `botlar` uyarlama (§5.2.10), K-2 CI denetimi | K3, O2 | G6-3 | §16.1 tablosu; `git diff --exit-code` K-2 listesi |
| G6-5 | **Dedektör doğrulaması, bot önayarı, ölçüm:** `odul.test.ts` (K2); bot ekmek zinciri (O2); §15.2 raporları | K2, O2 | G6-4 | `sunucu` odul testi; bot 7 günde `ekmek` |

**G6 teslim kapısı (O1):** tam kapı yeşil (`pnpm typecheck`, tam vitest, `dunya.html` gzip ≤ 400 KB; G6 payı < 0,5 KB beklenir, K3 ölçer: **doğrulanmadı**); bölge kipi altınları **birebir** (K-1: 12 noktada tam özet; K-2: dondurulmuş dosyalarda boş diff); eski mülk görüntüsü yüklenir.

### 17.2 G7 ve G8 (Parça 2)

G7-1 şema (`perakende`) → G7-2 çekirdek (talep, çekim, katman 4a, `yerelNpc`) → G7-3 dükkân (durum, komutlar, marka) → G7-4 veri (T3) → G7-5 K2/K1 kancaları ve kanıtlar; G8: veri (iki yöntem, `yapi_market`, dükkân bedeli) + bot + kanıt. Kabul ölçütleri Parça 2'de.

## 18. Rollere istek listesi

**Dosya sınırı (baş lider):** K3 `packages/veri/src/**` ve **testlerini**, çekirdek kodunu yazar (tek yazar). T3 `packages/veri/icerik/{icerik,parametreler,kimlik-listesi}.json` **değerlerini** yazar. `sema.ts` `.strict()` olduğundan: önce K3 yeni alanları **isteğe bağlı/no-op** indirir, **sonra** T3 değer yazar (G6-1 → G6-3). Hiç kimse başkasının dosyasına yazmaz.

| Rol | İstek | Dilim |
|---|---|---|
| **K3** | §5, §3.5, §4, §11, §13 ve Ek A'daki değişiklikler; **blok yokken no-op** her yerde; testler §16.1; K3 `p3Oncesi`/`p4Oncesi` yardımcılarını yazar; `veri-importu` kuralı (çekirdek `@bolge/veri` çalışma zamanı importu yok) korunur; Node-only doğrulayıcılar `saf`a girmez; bundle ölçümü | G6 |
| **T3** | **G6-3 tek commit:** (a) `icerik.json`: `yontemler[]` sonuna 4 yöntem (A2 §1.4/§1.13 değerleri; `mulkKipi: true`); `gida_fabrikasi` ve `ahir` listeleri sonlarına ekleme; **`celikhane` listesi DEĞİŞMEZ** (T3 §8.2 `cam_firini` satırı geçersiz; G8'de `parca_fabrikasi`'ne); (b) `parametreler.json`: `mulk.sebeke` (`elektrik: true`, `yakit: true`, `tavanOraniPpm` 1 000 000, `kasaPayiPpm` **120 000** (A2 §1.3-B1)), `mulk.yontemGecersizKilma` (`standart_gida_isleme: { ciktiPpm: 1000000 }`, kapalı; G2 açılırsa 750 000); (c) `kimlik-listesi.json` `yontemler`: §3.5'teki 28 kayıt, sırayla. **K3'ün G6-1 dalı birleşmeden önce yazma.** Her yeni kimlik önce listeye. | G6 |
| **K2** | `komut-sema.ts:62-71` iki komuta `yontem: kimlik.optional()` (K3 ile aynı birleştirme); `sunucu/src/odul/dedektor.ts` `ilk_isleme`/`zincir_kapandi` doğrulama testi (kod değişmez); sunucu `kuralSurumu` göçü (`yazar.ts:363,385,1318`) G6-3 sonrası `gocIzni` | G6 |
| **K1** | G6'da komut **tür** değişikliği yoktur (`gizli.ts`, `komut.test.ts` listeleri değişmez); `harita/hata-mulk.ts` çevirileri: `bilinmeyen yontem`, `yontem bu tesis turunde yok`, `yontem acik degil`, `yontem yalniz tesis turunde verilebilir` (§9.3 ekleri); **oyun içi metinde santral için "daha ucuz" vaadi yoktur**, gerçek sayılar gösterilir (§5.2.1); Dikkat paneli notu "pazar doydu → ekmek zinciri" (G9; §5.9) | G6, G9 |
| **O2** | `botlar/src/parsel.ts` (`g6-onayar` işi): `yontem_degistir`/`yontem` kullanan **ekmek zinciri önayarı** (Çiftlik → `gida_fabrikasi` ×2 → ihracat; yakıt ithalat emri **yok**; kepek); santralsiz açılış; **marjinal-net `degirmen` yöntem seçici = G6 kabul koşulu** (§5.9 ölçümünün ön koşulu; yoksa M ölçülemez); §15.2 raporları; mülk testleri şebeke açıkken yeniden | G6 |
| **A2** | (SHA bağlandı: `afdf29f`); **şebeke yakıt fiyatı:** `canli` referansla (R0 111,54 ⇒ ≈ 115,4 ₺, +%11,5) yeniden hesap ve `fiyatReferansi` önerisi (S-16); bayram sınır günü tanımı (§4.3, S-8); zincir +%33,6 ↔ K/U bandı (S-17); `kamuSiparisi` şeması gerekirse (S-11) | G6, G7 |
| **O1** | G6 teslim kapısı + K-2 `git diff --exit-code` listesi; `dunya.html` boyut ölçümü | G6 |
| **T1/T2** | `kullanici` metinleri (Türkçe, büyük harf yok): şebeke elektriği açıklaması ve fatura satırı; santral kartı gerçek sayılarla; yöntem adları (`degirmen` Değirmen Atölyesi → …, T3 §3.3) | G9 |
| **O3** | Bu şartname için istek yok (ilçe nüfusu verisi **gerekmez**: nüfus eşdeğeri sınıf başına parametredir; §4.3) | - |

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
- **Karar: G7'de pencere yok** (para eşdeğeri; A2 §1.7 P-Yok sayısal önerisiyle uyumlu), G8'de eklenir (parametre; §7.4). **Arsa kullanım türü şartı yok** (fikstürde alan yok).
- Gerekçe: pencere ithalatı kırılgandır (emir saat tıkında gerçekleşir, elle iptal; doğrulandı: yöntem §2.4); R0(pencere) 540 ₺'dir (taban 360 ₺: B2).
- Dosya:satır: `pazar/piyasa.ts:106` (`hazineVar`), `ekonomi/komut.ts:99-130`, `veri/src/parsel.ts:58-71` (`sinif`, `uygun`, `engel`, `kamu`; kullanım türü yok).

**6. Yerel talep Q: `seviye × uygunHucre` parametresi mi, fikstüre nüfus alanı mı?**
- **Karar: ikisi de değil.** `Q = talep1000Saat × ilceSinifiNufus[sınıf] × yerelOlcek / 1000 × takvim × bayram` (A2 §1.9); sınıf = `ParselIlceTanimi.sinif`; **nüfus verisi ve ilçe seviyesi yok** (kilitsizlik, Y-33). A2'nin `yerelOlcek` kalibre değildir; gerçek ilçe nüfusu geldiğinde yeniden kalibre (A2 §4 soru 4; S-6). O3'ten istek yok.
- Dosya:satır: `veri/src/parsel.ts:81-104` (ilçe: nüfus yok), `:89` (`sinif`), `tarim/iklim.ts:44` (`takvimAyi`), `mulk/isletme.ts` (düğüm `nufus = 0`). Ayrıntı §4.3, §6.5 (Parça 2).

**7. Çekim, su-doldurma ve kasa formülü tamsayı/PPM adımlarıyla ve sıralama kuralıyla.**
- **Karar:** §6.4 (Parça 2): A2'nin formülü (`ters`, `kare`, `agirlik`, esnaf ağırlığı, esnaf taban payı, **su-doldurma en çok 32 tur**, tek oyuncu toplamı `Q − floor(Q × tabanPay)` üst sınırı) birebir; kalan birimler sıralı; Ek B test vektörleri (betikle üretildi; çekirdek dışı).
- Dosya:satır: `sabit.ts:42` (`carpBol`, BigInt yedekli), `lojistik/cozum.ts:127` (birim kalıbı).

**8. Yerel satış hangi öncelik katmanında? NPC dünya fiyatını etkilesin mi?**
- **Karar: yeni katman 4a** (ihracattan önce, tesis girdisinden sonra); **NPC dünya fiyatını etkilemez** (`oyuncuArzi/oyuncuTalebi` yerel satışla değişmez; I5 değişmezi).
- Dosya:satır: `ekonomi/uretim.ts:421-483` (`bolgeVerimCoz`), `:455` (`d4`), `pazar/piyasa.ts:117-118`, `:123-135` (`pazarFiyatlari`). Ayrıntı §6.2–§6.3 (Parça 2).

**9. Yapı market oyuncu-alıcı G8'de mi? Fiyat komutu `oran` mı kademe mi? Fiyat değişim sınırı G7'de mi?**
- **Karar: oyuncu-alıcı yok** (aklama kanalı; baş lider kararı 7); **fiyat = kademe indeksi (`secim`)**, tutar/oran alanı yok; **hız sınırı G7'de** (`fiyatDegisimEnAzSaat`, DUK-18).
- Dosya:satır: `komutSemasi.ts:14-27` (`AlanTuru`), `:17` (`SISTEM_ALAN_TURLERI`); `para-guvenligi.test.ts` açık liste. Ayrıntı §7, §9 (Parça 2).

**10. İthal edip rafa koyma için kamu çarpanı benzeri fiyat tavanı var mı?**
- **Karar: yok; yalnız fiyat bandı** `[0,7; 1,4] R` ve (A2) kademeler ≤ 1,15 R. Stok kaynağa göre ayrılmaz (tembel stok): "ithal rafa tavan" uygulanamaz; ZP11 izler, çare bandın üstünü daraltmaktır. Kamu tavanı yalnız kamu siparişi/şebeke fiyatıdır (şebeke bu tavanı kullanır: §5.2.4).
- Dosya:satır: `mulk/kasa.ts:415-424` (`kamuFiyatTavani`), `mulk/kamuFiyat.ts:18-22`, `derle.ts:193`.

**11. Satış harcı (kasaya pay) var mı? Marka/tabela G7'de mi?**
- **Karar: dükkân satışından harç yok** (kasa yalnız yanan paradan; yerel NPC geliri musluk). **Marka G7'de** (baş lider kararı 4: sınırlı serbest metin; K3'ün "G7 dışı" önerisi değişti), kural §7.7. (Şebeke bedelinin **kasa payı** ayrı bir şeydir ve vardır: §5.2.5.)
- Dosya:satır: `mulk/kasa.ts:94-125`, `:205` (`kasaOranlari`), `tipler.ts:850-851` (`KasaGirisKalemi`).

**12. `ilk_dukkan` tetiği: yapı bitti mi, ilk satış mı?**
- **Karar: ilk satış** (yapı bitti DEĞİL): tamamlanmış `dukkan` ve `dukkanGeliri(d, oyuncu, t) > 0`. Rehber değişmezi: ödül bedelden ucuz alınamasın.
- Dosya:satır: `sunucu/src/odul/dedektor.ts:14`, `:27-29`, `:57-62`, `:158-175`; `veri/icerik/parametreler.json:11`; `istemci/src/harita/baglanti.ts:376`. Ayrıntı §7.8 (Parça 2).

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
| GZ-2 | **Şebeke enerjisi (elektrik + yakıt):** otomatik tedarik, fiyat = kamu tavanı × `tavanOraniPpm` (+ `fiyatReferansi`), bayrak = `mulk.sebeke` bloğu, ledger kalemleri (`lavabo.sebeke`, `kasa.giris.sebeke`), `kasaPayiPpm` 120 000 | para arzı ve sanayi dengesi (santralin rolü, yatırım sırası); defter kalem adları kalıcıdır; yakıtın stoksuz alınması oyuncu stok davranışını değiştirir | baş lider kararı (yakıt kapsamı S-10; referans S-16) |
| GZ-3 | **Fiyat kademesi sayısı ve indeks anlamı** (4 kademe; kampanya indeks 0) | kayıtlı dükkân fiyatları indeksle saklanır; araya kademe eklemek anlamı kaydırır (A2 ZA-6) | A2 önerisi, onay bekler |
| GZ-4 | **Yerel talep kimliği:** ilçe sınıfı × `talep1000Saat` × nüfus eşdeğeri × takvim grubu × bayram (nüfus yok) | arsa fiyat beklentileri ve dükkân kararları buna dayanır (A2 ZA-5); grup adları ve formül biçimi kalıcı | önerilen |
| GZ-5 | **R tanımı:** `d.pazar.fiyat[m]` (R0 ≠ taban) | bütün oran/bant/tavan R'ye göre yazıldı | önerilen |
| GZ-6 | **Öncelik katmanı 4a** (ihracattan önce) | stok kıtken kimin payı kaybettiği oyun dengesidir | önerilen |
| GZ-7 | **Defterde isteğe bağlı/tembel kalemler** (`yerelNpc`, `lavabo.sebeke`, `kasa.giris.sebeke`) | para defteri şeması; bir kez yanlışsa eski görüntüler yüklenemez | önerilen |
| GZ-8 | **Marka çekirdek durumunda** (serbest metin) + yasaklı liste sunucuda | günlükte açık metin kalır (KVKK); replay determinismi | baş lider kararı 4; KVKK görüşü S-12 |
| GZ-9 | **`AlanTuru += "metin"`** (`SISTEM_ALAN_TURLERI`'ne girmez) | komut sözdizimi kalıcı; sistem/ajan yoluna metin ASLA | önerilen |
| GZ-10 | PRNG akışı ve `ilce_gunluk` olayı **yok**; çözüm tek geçiş | sonradan eklemek özeti ve PRNG kuyruğunu değiştirir | önerilen |
| GZ-11 | Alfa-0 sadeleştirmeleri (çeşit anlık, esnaf payı anlık, η yok) | kural sürümü dönemi; geri alınabilir ama bot/ölçüm altınları yeni kurala dayanır | önerilen |
| GZ-12 | **`acikOlcekler` = dünya zamanlaması** (oyuncu kilidi değil) | "kilit yok" ilkesiyle sınırı ince | önerilen; T-43 |
| GZ-13 | **`dukkanTuru` alanı** (`tesis_insa_hucre`/`yapi_yerlestir`) | komut sözleşmesi | önerilen |
| GZ-14 | **`ilk_dukkan` = ilk satış** | ödül ekonomisi ve rehber | önerilen |
| GZ-15 | **Dükkân bedelinde pencere** (G7 yok, G8'de eklenir) | yalnız veri; mevcut dükkânlar ödenmiş | A2 + baş lider |
| GZ-16 | Sayı sınırları (ilçe başına 2 dükkân, il başına 6, marka 3) | yeni sınır eklemek kolay, gevşetmek hakları açar | önerilen |
| GZ-17 | **`yontem?` inşa komutu alanı** (§5.8) | komut sözleşmesi; `InsaatDurumu.yontem` | A önerildi; reddedilirse düşer |
| GZ-18 | **`mulkKipi` bayrağı** ve `mulk.yontemGecersizKilma` şeması (`ciktiPpm`) | `YontemTanimi`/`MulkParametreleri` alan kalıcı; çarpan çıktıya uygulanır (girdiye değil) | baş lider kararı 2 ve 13 |

## 21. Açık sorular

### 21.A Açık sorular (sahip / baş lider / A2)

| # | Soru | Varsayılan (K3 bunu uygular) | Kime |
|---|---|---|---|
| S-1 | **G2 (yedek çarpan ×0,75) tetiği:** A2'nin ölçütü M (tohum medyanı < %30, ≥ 8/10 tohum, gıda arzının ≥ %85'i standarttan) kabul mü; **tesis tabanı kural sayılsın mı** | çarpan kapalı (`ciktiPpm` 1 000 000); tetik A2'nin ölçütü | baş lider |
| S-2 | ~~Santral ekonomisi~~ **KAPANDI** (baş lider kararı: santral isteğe bağlı, yalnız hidroda ve yüksek yükte kârlı, "daha ucuz" vaadi yok, fiyat/maliyet değişmez) | - | kapandı |
| S-3 | **Açılış Tezgâhı** (`tezgah`) P1 mi A1 mi | G7'de yok | sahip (T-39) |
| S-4 | ~~`kasaPayiPpm` değeri~~ **KAPANDI:** A2 §1.3-B1 = 120 000 (%12); kasa = floor(ödeme × pay / 1e6), lavabo = ödeme − kasa | 120 000 | kapandı |
| S-5 | Şebeke **kapasite sınırı** (yok) ve düğüm başına tavan | sınır yok | baş lider |
| S-6 | Talep ilçe büyüklüğüne (`uygunHucre`) bağlansın mı; gerçek ilçe nüfusu ne zaman | hayır; sınıf başına sabit (A2 §4 soru 4) | A2, sahip |
| S-7 | **M erken açılış** (`acikOlcekler`, T-43) | `[0]` | baş lider |
| S-8 | **Bayram sınır günü ve tarihler:** `oncesi` penceresi `[B − Do, B − 1]`, `sonrasi` penceresi `[B, B + Ds − 1]` (bayram günü sonrasında); resmî bayram tarihleri (doğrulanmadı) | Alfa-0 listesi T3'te, boş olabilir | A2 (sınır), T3 (tarih) |
| S-9 | **Bakım ve aşınma kalibrasyonu** (`mulk.bakim`, `otomatikParca`) hangi dilimde | bu şartname dışı; O2 R1–R7 sonrası G6b | baş lider, O2 |
| S-10 | **Yakıt şebekeden otomatik** (A2 §1.3-B1'in baş lider kararı aktarımı; stoksuz tüketim anı tedariki, §5.2.2b) kapsamda mı; reddedilirse `sebeke.yakit: false` (kod yolu kalır, A2 sayıları değişir) | evet (şartname uygular) | baş lider (teyit) |
| S-11 | **Kamu siparişi v0** (ekmek, gıda, pencere, celik, parca; A2 §1.9: fiyat 1,03 R, boyutlar 100/50/10/30/20, ilçede haftada ≤ 5, vade 3 gün; A2 §1.13 `kamuSiparisi` taslağı: doğrulayıcı `malFiyatPpm ≤ kamuIthalatCarpaniPpm`) için kod ve şema ne zaman | bu şartnamenin dışı | baş lider |
| S-12 | Marka adında **büyük harf** (arayüz kuralı sabit metinler içindir) ve **KVKK** hukuki görüşü | izinli küme büyük harfe izin verir | sahip, hukuk |
| S-13 | G8'de dükkân bedeline **pencere eklensin mi** | eklenir (para eşdeğeri düşer) | baş lider |
| S-14 | `yontem?` inşa alanı (§5.8) | alınır | baş lider |
| S-15 | ~~A2 commit SHA'sına atıf bağlama~~ **KAPANDI:** `afdf29f` (A2 §2 bakım sonraki commit'te) | - | kapandı |
| S-16 | **Şebeke fiyat referansı** (`fiyatReferansi`): `canli` (`kamuFiyatTavani`'nın düz okuması; yakıtta ≈ 115,4 ₺, oyuncu emirleriyle oynar) mı, `taban` (A2'nin 103,5 ₺ sayıları, manipüle edilemez; **öneri**) mı | `canli` (baş lider kararındaki "mevcut kamuFiyat mantığı") | baş lider, A2 |
| S-17 | **Zincir +%33,6 (NPC net, tahıl) K/U ilkesinin +%10–25 bandının üstünde;** fırın 243 ekmekle +%25'e iner (A2 §1.3-B2) | A2 tarifleri (250 ekmek) kabul | baş lider |

### 21.B T3 §11'in 16 sorusu (tek tek)

| T3 # | Soru | Sonuç | Tür |
|---|---|---|---|
| 1 | Yöntem mi tür mü | **yöntem** (baş lider 1) | karar |
| 2 | Yöntem seçimi akışı | **inşa komutunda isteğe bağlı `yontem?`**; `yontem_degistir` bedelsiz kalır. Görüş: kurulumdan sonra değişimden üstün (inşa saatlerce sürerken yanlış yöntemle çalışmaz; tek adım UX); maliyet küçük ve isteğe bağlı (§5.8) | karar (onaya bağlı; S-14) |
| 3 | `cam_firini` ev sahibi | **`parca_fabrikasi`** (A2 maliyeti −9.700 ₺, −1 hücre; ev sahibi görünen ad taşımaz; `celikhane` tavanı korunur) | karar |
| 4 | A2 ön önerisi mi rapor değerleri mi | **A2** (tek kaynak); `standart_gida_isleme` ile ilişki §5.9 | karar |
| 5 | Kepek ikinci tüketici | **`kepek_gubresi`**; `besi_kepekli` düştü; yeni `NpcAlici` türü yok | karar |
| 6 | `sut_kepekli` G6'da mı | **veri satırı G6'da**, dengesi P1 (indeks 27 sabit) | karar |
| 7 | Dükkân pencere bedeli | G7: yok (para eşdeğeri), G8: eklenir | karar (parametre: S-13) |
| 8 | `tezgah` | G7'de yok | sahip (S-3) |
| 9 | `tamCesit` A0 değerleri | mal sayısına çekilir (sarkuteri 3, sekerci 2, yapi_market 4; bakkal 6, firin 2); V8 `tamCesit ≤ mallar.length` | parametre (varsayılan bu) |
| 10 | Raf–talep eşleşmesi | yedi malın hepsi hane talebine girer (A2 §1.9); oyuncu-alıcı yok | karar |
| 11 | Kamu siparişi v0 listesi | `ekmek`, `gida`, `pencere`, `celik`, `parca` | parametre (varsayılan bu; S-11) |
| 12 | İlçe nüfusu kaynağı | nüfus verisi **yok**; sınıf başına nüfus eşdeğeri parametresi (A2) | karar; gerçek nüfus: sahip (S-6) |
| 13 | Yapı market oyuncu-alıcı | **yok** (baş lider 7) | karar |
| 14 | Süpermarket A0 verisinde | **hayır** (beş S türü) | karar |
| 15 | Çıkmaz mal (P4/P5 dışı): uyarı mı hata mı | **uyarı** (A0); `CIKMAZ_MAL_HATA = false`, P1 teslim kapısı `true` yapar; yan ürün (kepek, gübre) kuralı **hata** (V13) | karar |
| 16 | Yöntem sayısı sınırı (tür başına ≤ 10) | **uyarı** (Y8, > 10); seçici/ayrı tür A1 işidir | parametre (uyarı eşiği 10); A1 kararı sahip |

## Ek A. Değişen dosya ve fonksiyonlar (`dosya:satır`, taban `d28447d`)

> **Parça 1 durumu:** G6 tamdır; G7/G8 satırları Parça 2'de eklenir.

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
| `ekonomi/uretim.ts:338`, `:501`, `:521-529`, `:640-654` | yakıt: Y-a…Y-d (§5.2.2b); `BolgeHesabi.sebekeYakitMili` |
| `tipler.ts:238` `BolgeDurumu` | `sebekeYakitMili?: Mili` |
| `ekonomi/uretim.ts:421` `bolgeVerimCoz` | `sebeke` bağlamını kurar |
| `ekonomi/uretim.ts:596-603` `bolgeDurumunaYaz` | `b.elektrik.sebekeMili` |
| `ekonomi/uretim.ts:204-222` `ciktiCarpaniHesapla` | `yontemCiktiPpm` (§5.9) |
| `lojistik/cozum.ts:73-81` `ParaBilesenleri`, `:91-181` `hazineKalemleri` (`:127`, `:176`, `:180`) | `sebeke`, `sebekeIlce`; `isletmeGideri = gider − ithalat − sebeke`; bedel döngüsü |
| `lojistik/cozum.ts:293-308` | `paraAkisiYaz({ …, sebeke, kasa: kasaOranlari(…, sebekeIlce) })` |
| `mulk/kasa.ts:94-125` `paraMuhasebesi` | `sebeke` kolu, lazy kalemler (§5.2.5) |
| `mulk/kasa.ts:133-159` `paraAkisiYaz` | `sebeke` alanı ve eşitlik dalı |
| `mulk/kasa.ts:205` `kasaOranlari` ve `kasaOranlariHesapla`, `KasaOnbellegi` | `sebekeIlce` girdisi ve önbellek anahtarı |
| `mulk/kasa.ts:47`, `:56` (`kasaAl`, `kasaToplam`) | `giris.sebeke` toplama (kurma **değil**) |
| `mulk/sebeke.ts` (YENİ, saf) | `sebekeBirimFiyati(d, ic, sb, mal)` = (`kamuFiyatTavani` ya da taban × `kamuIthalatCarpaniPpm`) × `tavanOraniPpm` |
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

## Ek B. Çekim hesabı test vektörleri

> **Parça 1 durumu:** vektörler üretildi ve doğrulandı (betik); algoritmanın metni §6.4'te (Parça 2). Bu ek çekirdek DIŞI bir referans uygulamadır: K3 testleri vektörleri sabit olarak gömer, betiği çalıştırmaz.

**Yöntem:** `SP` betiği (BigInt, `floor(a·b/c)`), `Math.pow/sqrt` yok; Alfa-0 ölçeğinde `cekimCarpaniPpm = 1 000 000` (S). Girdi birimleri mili-birim/saat; `p` = fiyat kademesi çarpanı (ppm); `esnaf.fiyatPpm = 1 120 000`, `tabanPayPpm = 250 000`, `cesitKatsayiPpm = 250 000`. (doğrulandı: yöntem)

| Vektör | Girdi | Beklenen çıktı (`s` = yuva başına istek, mili-birim/saat) |
|---|---|---|
| **V1** (kasa bağlayıcı değil; iki dükkân, tek mal) | `Q[ekmek] = 300 000`; A: `p = 1 000 000`, `tamCesit 2`, 1 dolu yuva; B: `p = 1 080 000`, `tamCesit 2`, 1 dolu yuva; `kasa = 900 000` | `w_A = 1 125 000`, `w_B = 964 504`, `w_esnaf = 797 193` (kare: 1 000 000 / 857 337 / 797 193; çeşit çarpanı 1 125 000); `esnafPay = 276 160`; `esnaf = 82 848`; `P = 217 152`; **`s_A = 116 916`** (116 915 + kalan 1), **`s_B = 100 236`** |
| **V2** (tek dükkân, kasa kırpması) | `Q[ekmek] = 300 000`; A: `p = 1 050 000`, `tamCesit 1`; `kasa = 90 000` | `w = 1 133 783`; **`s_A = 90 000`** |
| **V3** (kasası dolan dükkânın payı diğerine kayar: su-doldurma) | `Q[ekmek] = 300 000`; A: `kasa = 50 000`; B: `kasa = 90 000`; ikisi `p = 1 050 000` | **`s_A = 50 000`**, **`s_B = 90 000`** (B'nin payı A'nın taşan talebiyle büyür; kasada kırpılır) |
| **V4** (çok mal, dükkân başına toplam kasa) | `Q[ekmek] = 300 000`, `Q[gida] = 540 000`; A: `ekmek` ve `gida` (`p = 1 050 000`), `tamCesit 2`; B: `ekmek` (`p = 950 000`), `tamCesit 2`; `kasa = 90 000` (ikisi) | A: `ekmek 22 715` + `gida 67 284` (toplam 89 999 ≤ 90 000); B: `ekmek 90 000` |

**Referans uygulama (çekirdek dışı; algoritma §6.4'ün birebir karşılığı):**

```js
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
      if (L.length === 0 || Qr <= 0n) continue;
      const sw = L.reduce((a, y) => a + y.w, 0n);
      const pay0 = cb(wE, PPM, sw + wE);
      const esnafPay = pay0 > tabanPayPpm ? pay0 : tabanPayPpm;
      const P = Qr - cb(Qr, esnafPay, PPM);
      let top = 0n;
      for (const y of L) { y.s = cb(P, y.w, sw); top += y.s; }
      let kalan = P - top;
      for (let i = 0; kalan > 0n; i++, kalan--) L[i].s += 1n;
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
