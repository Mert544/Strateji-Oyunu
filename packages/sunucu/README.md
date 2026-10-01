# @bolge/sunucu

Paylaşılan dünyanın tek yazar sunucusu (Node + `ws`). Mesaj sözleşmesi `@bolge/protokol`'dedir; tasarım gerekçeleri `docs/arastirma/sunucu-tasarimi.md`'dedir.

## Çalıştırma

```sh
# Geliştirme dünyası: mini harita, dosya deposu (varsayılan raporlar/dunya, git dışı), 1 sim-saat/sn, iki sunucu botu
pnpm sunucu -- --harita mini --hiz 3600 --botlar sanayici,tuccar

# Geliştirme token'ı ("sistem" = yönetici: oyuncu_katil, elle saatte zamanIlerlet)
pnpm -s sunucu -- --token sistem
pnpm -s sunucu -- --token ali

# Mülk kipi (mini-6 parsel fikstürü), elle saat (dünya yalnız zamanIlerlet ile ilerler)
pnpm sunucu -- --harita mini --parsel --elle-saat --depo bellek

# Postgres (şema sürümlü: sql/001-baslangic.sql + sql/002-goc-profil.sql açılışta uygulanır; bkz. "Postgres" bölümü)
BOLGE_PG_URL=postgres://localhost/bolge pnpm sunucu -- --depo pg --dunya ana
```

Bütün seçenekler: `pnpm -s sunucu -- --yardim`. İmza sırrını `BOLGE_GELISTIRME_SIRRI` ile verin (varsayılan yalnız yerel geliştirme içindir). Sunucu olayları stdout'a satır başına bir JSON olarak yazar (`hazir`, `uyari`, `kapandi`, `olumcul`). SIGINT/SIGTERM'de kuyruğu yazar, kapanış görüntüsünü alır ve çıkar. kill -9 sonrası yeniden başlatma son görüntü + günlük kuyruğuyla devam eder.

## Mutlak saat ve kapalıyken yetişme

Dünya sunucu kapalıyken de akar (sahip kararı, docs/12 §7). Varsayılan saat (`DuvarSaati`, `--hiz 1`) mutlaktır: `t = duvar saati − dunyaEpochMs`. Epoch dünyayla birlikte anlık görüntü üst verisinde saklanır; yeni dünyada varsayılan `2026-09-30T21:00Z` (1 Ekim 2026 00:00 TRT, kalıcı UTC+3; `--dunya-epoch` yalnız yeni dünyada, bir Türkiye gece yarısı olmalı). Epoch'suz eski dünya ilk mutlak açılışta "şimdi = dünyanın şimdiki zamanı" olarak bağlanır.

- **Yetişme:** açılışta son görüntü + kalan günlük uygulanır; dünya duvar saatinin gerisindeyse (`yetisiyor`) ana döngü 1 sim-saatlik adımlarla yetişir (uykusuz, her adımda olay döngüsüne nefes; görüntü 24 sim-saatte bir ve bitişte). İlerleme stdout'a `{"olay":"yetisme",...}` / `{"olay":"yetisti",...}` satırlarıyla (~1 sn'de bir) yazılır. Ölçü: sentetik harita + 2 bot, 30 gün ≈ 11 sn.
- **Esnaf Defteri ödülleri yetişirken de verilir** (sistem komutu, dünya zamanıyla damgalı, sim-saat sınırlarında): kesintisiz sunucuyla aynı t'de aynı sırada (bkz. "Esnaf Defteri").
- **Komut sözleşmesi:** yetişirken dışarıdan gelen yeni komut kuyruklanmaz, `yetisiyor` hata koduyla reddedilir (günlüğe girmez; işlenmiş anahtar ilk sonucuyla yanıtlanır). Bağlantı `hosgeldin.yetisiyor` ve sonraki `durum` mesajlarıyla ilerlemeyi ve bitişi öğrenir; istemci bitince aynı anahtarla yeniden dener. Sunucu botları yetişirken de karar verir (dünyanın zamanıyla damgalanır).
- **Gerçek tarih için epoch:** mutlak saatli ve epoch'lu dünyada `hosgeldin.dunyaEpochMs` (epoch ms, isteğe bağlı alan; protokole yalnız ekleme) gelir: gerçek tarih = `dunyaEpochMs + simZamani`. Elle saatli (`--elle-saat`), birikimli/hızlı ya da epoch'suz dünyada alan HİÇ gönderilmez (test: `hosgeldin-epoch.test.ts`, `protokol.test.ts`).
- **Monoton koruma:** duvar saati geri giderse (NTP) sim zamanı geri gitmez; saat eski değeri aşana kadar bekler, bir kez `uyari` olayı yazılır. Yeniden başlatmada duvar dünyadan gerideyse hata yoktur (`kurtarma.saatGeriMs`).
- `--hiz` ≠ 1 ya da `--birikimli`: eski kapalıyken-duran saat (hızlandırılmış geliştirme dünyaları); `--elle-saat` ve testlerdeki `ElleSaat` değişmedi. `DuvarSaati`'na `duvar` işlevi enjekte edilebilir (testler sahte saatle koşar).
- Henüz yok (çekirdek işi): kesinti adaleti (kesinti > 15 dk ise rastgele olumsuz olayların ön duyuru→etki geçişini kesinti kadar öteleme; canli-dunya-simulasyonu.md §2.2). Sunucu botlarının iç durumu görüntüye girmez, yeniden başlatmada sıfırlanır.

## Mülk kipi, oyuncu katılımı ve kare eklemeleri (F4)

- **`oyuncu.mulk.katilimIlcesi?`** (kare eklemesi, isteğe bağlı): çekirdekteki `MulkOyuncuDurumu.katilimIlcesi` YALNIZ sahibinin oyuncu karesinde gelir (`ayrilmisBitis` ile aynı yerde; kare/delta mekanizması güncel tutar, `hosgeldin`'e gerek yok). Çekirdekte yoksa (ilçesiz katılım, kural kapalı) ya da bölge kipinde alan HİÇ gönderilmez; başkasına ve izleyiciye sızmaz (`katilim-ilcesi.test.ts`, protokol testleri).

- **`--parsel-dosya YOL`:** mülk kipinde verilen parsel fikstürü JSON'u açılır. Dosya `@bolge/veri` `dogrulaParselFiksturu` doğrulayıcısından (harita ile) geçer; bozuksa `olumcul` olayında madde madde hata, `param.mulk` yoksa açık hata. `--parsel` ile birlikte verilmez.
- **`katil {anahtar, ilce?}` istemci mesajı** (yalnız mülk kipi): sunucu `oyuncu_katil {oyuncu: <doğrulanmış kimlik>, bolgeler: [], ilce}` komutunu "sistem" olarak damgalar; oyuncu kimliği mesajdan GELMEZ (başkası adına katılım olmaz). Yanıt `komutSonucu`; ikinci katılım çekirdeğin "oyuncu zaten katilmis" hatasını, aynı anahtar ilk sonucu (`tekrar`) döner. Hız sınırı ve yetişme reddi (`yetisiyor`) uygulanır; yönetici `katil` kullanmaz (`komut` + `oyuncu_katil` yolu aynen kalır). İdempotans kapsamı `katil:<oyuncu>`.
- **Periyodik `zaman` yayını:** kimliği doğrulanmış bağlantılara ~15 sn'de bir `{tur:"zaman", yayin:true, istemciGonderim:-1, simZamani, hiz}` (yalnız `t` değiştiğinde de istemci saati kaymasın; `zamanIste` yanıtında `yayin` yoktur). `SunucuSecenekleri.zamanYayinAraligiMs` (0 = kapalı) ve test için `duvarMs`.
- **Merhaba `kuralSurumu`:** istemci göndermezse bağlantı kabul edilir ve bağlayıcı değer `hosgeldin.kuralSurumu`'dur; gönderir ve uyuşmazsa `kural_surumu` hatası + kapanış.
- **Kare eklemeleri (hepsi isteğe bağlı alan, `@bolge/protokol` `kare.ts`):** hücrede tesis/ek yapı türü (`[..., tur?, degerMili?]`: tür herkese, değer yalnız sahibine); ilçede `ayrilmisAdet` (her zaman) ve `ayrilmis` listesi (yalnız `abone {ayrilmis:true}` isteyen bağlantıya; Gebze ölçeğinde ilçe başına ~1,5 MB / gzip ~200 KB, değişmezdir: deltada tekrarlanmaz); yalnız sahibine `oyuncu.erkenOyun` (formül; `erkenOyunCarpani(f, t)`), `oyuncu.mulk.indirimliYapiKalan`, `oyuncu.mulk.ayrilmisBitis`, `insaatlar` demetinde `baslangic` ve ek yapı kimliği.

## "Sen yokken" (dönüş özeti, D1-D3; docs/arastirma/donus-deneyimi.md §5, docs/12 Y-37)

Sunum katmanıdır: çekirdek durumunu YALNIZ okur, `durumOzeti`ne girmez (testli: `donus: false` ile aynı özet). Depoda `profil` varsa varsayılan açıktır (bellek, dosya ve pg depoları; profilsiz özel bir depoda açılışta `uyari`, özet kapalı).

- **D1 `donusOzeti(girdi)`** (`src/donus/ozet.ts`, saf; `Math.random`/`Date` yok, `simdi` parametre, tohum `fnv1a32`): `{surum: 1, bant: K1..K7, aralik: {baslangicT, bitisT}, net: {hazineFarki, kalemler: {satis, gider, diger}, uretim: [{mal, miktar}] (≤3)}, maddeler, oneri: null}`. Net = `anlik − sonGorulen` (O(1)): `hazineFarki` birebir hazine farkı; `satis` = ihracat farkı, `gider` = −(ithalat + komisyon + liman primi farkları), `diger` artık (toplam her zaman = hazineFarki). Maddeler (en çok 8, önem sıralı): B2 biten işler (aynı türden çoğu `donus.bitti.insaat.cok` ile toplanır), B3 gelenler (yer tutucu). Metin yok: `DONUS_SABLON` anahtarı + değerler + tohum (`@bolge/protokol`). Bant sınırları parametre (`DonusEsikleri`, `YazarSecenekleri.donus.esikler`; varsayılan 1 sa / 6 sa / 2 gün / 7 gün / 14 gün / 45 gün / 90 gün); < 1 sa (K0) ve çapasız (ilk giriş) için özet yok. "Sunucu kapalıydı" satırı yoktur.
- **D2 iki çapa** (profil deposu, çekirdek dışı): `sonGorulen {t, hazine, defter {brutIhracat, brutIthalat, komisyon, prim}, stok, uretim}` (mal kimliğine göre) ve `ozetOkunduT`. `sonGorulen`: son bağlantı kapanınca (`yazar.cikis`) ve sunucu kapanırken bağlı oyuncular için yazılır; kirli çıkış yedeği: komut veren insan oyuncunun çapası her turda son kabul edilen komuttan sonraki duruma çekilir (çökmede en kötü bu; hata aşırı kapsama yönünde, kayıp yok). `ozetOkundu {t}` istemci mesajı: `ozetOkunduT = max(önceki, min(t, şimdi))` ve `sonGorulen` o ana çekilir. `hosgeldin.donusOzeti` yalnız oyuncu + yetişme bitmiş + yokluk ≥ 1 sa + oyuncunun başka açık bağlantısı yok iken; yetişme sürerken bağlanana özet yetişme bitince ayrı `donusOzeti {ozet}` mesajıyla (`durum` mesajından sonra) bir kez gelir.
- **D3 özet kayıtları:** oyuncu başına halka ≤ 200 kayıt, 30 sim-günü ömür; türler `insaat_bitti`, `satis_toplami`, `siparis_geldi` (yer tutucu, üretilmez). Kayıt yalnız olgu: `{t, tur, ilce, degerler, aktorRef?, sira}` (ad/metin yok). **Kayıt zamanı `t` = olayın sim zamanı** (inşaatın `bitis`'i durumdan okunur), yazılma zamanı değil. Çekirdeğe kanca eklenmez: izleyici (`src/donus/izleyici.ts`) süren inşaatları her başarılı komuttan sonra ve her turda durumla eşler; kaybolan inşaat `bitis ≤ şimdi` ise biten sayılır (başarılı `insaat_iptal` ayrıca elenir); satış toplamı her sim-günü sınırında kümülatif değiştiyse yazılır (`[günlükİhracat, günlükGider, kümülatifİhracat, kümülatifGider]`). `calistirKadar` adımları gün sınırında bölünür (bölünme nötr) ve komut öncesi aradaki sınırlar taranır: canlı, yetişme (1 sim-saat) ve kurtarma yeniden oynatması AYNI kaydı üretir. **İdempotans anahtarı `(oyuncu, tur, t, sira)`** (`sira` = inşaat kimliği; günlük `seq`'i kasıtlı yok: seq adım taneciğine bağlıdır). Kayıtlar anlık görüntüden ÖNCE kalıcılaşır (görüntü sonrası oynatma görüntü öncesi olayları türetmez); dosya deposu `profil.jsonl` (atomik sıkıştırma, yarım son satır atılır).

## Kamu arsası (satılmayan hücreler)

- **Yayın (ilçe karesi, hepsi isteğe bağlı alan):** `ilceler[].kamuAdet` (kamu hücre sayısı = blok alanları toplamı; her zaman, kamu yoksa alan yok) ve `ilceler[].kamu` (gruplar; yalnız `abone {kamu: true}` isteyen bağlantıya). Grup: `{sahip: "k:mahalle:<id>" | "k:ilce:<id>", tur: "meydan"|"pazar"|"park"|"hizmet"|"kiyi"|"sanayi_rezervi"|"hazine", blok: [x0, y0, x1, y1][]}`; hücre kimliği "x:y" olduğundan blok x0..x1 × y0..y1 (dört uç dahil) hücreleridir. Çekirdeğin `kamuBloklari` API'si bloğu YALNIZ uygun kamu hücrelerine kısıtlar: bloğun içindeki her hücre kamudur (yol/su blok dışındadır). Gruplar (sahip, tür), bloklar (y0, x0) sıralı. Kamu kümesi dünya kurulurken donar: delta ilçe zaten istemcideyken tekrarlamaz (`deltaUygula` korur). Kamu hücreleri `hucreler` listesinde YOKTUR (satılmaz). Protokol yardımcıları: `kamuBilgisiBul(kamu, "x:y")` (hücre kartı: tür + sahip, sunucuya sormadan), `blokHucreleri(blok)` (blokları hücre kimliklerine açar).
- **Boyut (Gebze f4 fikstürü, tek ilçe 508 634 hücre / 485 856 uygun):** 22 854 kamu hücresi = 210 grup, 1 396 blok; `kamu` listesi 54,4 KB JSON (gzip 10,1 KB); ilçe karesi listesiz 1,5 KB (gzip 0,6 KB), listeli 55,9 KB (gzip 10,8 KB). Ayrılmış hücre listesi (karşılaştırma): 92 600 hücre, kare 1,48 MB. `Simulasyon.olustur` 1,4 sn. Kare çıkarma: ilk çağrı 145 ms (önbellek kurulumu: kamu blokları + ayrılmış küme), sonra 0,1 ms (liste önbellekli).
- **Ret:** kamu hücresine `parsel_al`/`yapi_yerlestir` çekirdekten reddedilir; sunucu iletiyi `komutSonucu.sonuc.hata` olarak aynen iletir.
- **Açılış uyarısı:** mülk kipi açık, parametrede `mulk.kamu` var ama yüklenen dünyada kamu kümesi yok (kamu öncesi kurulmuş dünya) ise `uyari` olayı ve `kurtarma.kamuKapali: true` / `kurtarma.uyarilar`: "bu dunyada kamu arsasi kurali kapali ...; ilk gercek satistan once yeni dunya baslatin".

## İçerik göçü (`--goc` / `gocIzni`, docs/06 §14.2)

`icerik.json`'a kimlik eklemek (yalnız SONA) ya da parametre/denge değiştirmek kural sürümünü değiştirir. Varsayılan (bayrak yok): kural sürümü ya da özet uyuşmazsa açılış hata verir. `--goc` (kodda `gocIzni: true`) ile:

1. Yalnız **dönem sınırında** çalışır: görüntüden sonra günlükte kayıt yokken. Görüntüden sonraki HER kayıt eski kural sürümüyle yazılmıştır (açılış hep görüntü + kuyruktur; yeni kuralla hiç açılmamıştır; kayıtta kural sürümü alanı bulunsa da bulunmasa da görüntü seq'inden sonra kayıt sayısı > 0 ise reddetmek yeterlidir) ve günlük kural sürümleri arasında yeniden oynatılamaz. Kuyruk doluysa açılış `goc yalniz donem sinirinda: goruntuden (seq N) sonra K gunluk kaydi var` hatasıyla durur, günlük OYNATILMAZ. Yapılacak: eski kural sürümüyle (bayraksız) açıp düzgün kapatın (kapanış görüntüsü kuyruğu boşaltır), sonra göç edin.
2. `Simulasyon.anlikGoruntudenYukleSonuclu(..., { gocIzni: true, yalnizEkleZorunlu })` ile yüklenir; üst verideki özet göçte `goc.eskiDurumOzeti`'ne karşı denetlenir (yeniden indekslendiyse göçmüş dünyanın özeti görüntününkinden farklıdır, bu beklenir). `yalnizEkleZorunlu` sunucuda varsayılan AÇIK: araya ekleme/yeniden sıralama reddedilir (`--goc-esnek` yalnız geliştirmede kapatır).
3. Göçten hemen sonra yeni (güncel kural sürümlü, zarf v2) görüntü alınır; sonraki açılış göç etmez. Yeni görüntü eskisiyle AYNI seq ve sim zamanında yazılır; bu yüzden eski görüntü ÖNCE depo `goruntu.yedekle` ile ayrı ve kalıcı saklanır (yedek alınmadan üzerine yazılmaz; yedek yoksa/alınamazsa göç durur, dünya ve depo değişmez). Dosya deposu: `goruntu/<ad>.goruntu.goc-<eskiKural>.yedek` (fsync'li kopya; `.goruntu` ile bitmediğinden `sonuncu()`a girmez ve saklama sınırıyla silinmez); yeri `kurtarma.goc.yedek`. **Geri dönüş:** sunucuyu durdurun, yedeği `<ad>.goruntu` üzerine kopyalayın, eski içerikle (bayraksız) açın; yalnız yeni kural sürümüyle HİÇ komut kabul edilmediyse geçerlidir (sonraki günlük kayıtları yeni kural sürümlüdür). **pg:** yedek `snapshot_yedek` tablosuna yazılır (`kurtarma.goc.yedek = pg:snapshot_yedek:<dünya>:goc-<eskiKural>`), eski kural sürümlü `snapshots` satırı da yerinde kalır (anahtarda `kural_sur` var); geri dönüş `postgresDeposu(...).yedektenDon(etiket)` ile (yedeği en yeni görüntü yapar), sonra eski içerikle açılır.
4. `kurtarma.goc` (`hazir` olayında): `yenidenIndekslendi`, `eskiKuralSurumu`, `yeniKuralSurumu`, `yalnizEkle`, `eklenen` (uzay -> kimlikler), `eklenenSayisi`, `ihlalSayisi`; göç yoksa `null`.
5. Zarf SÜRÜM 1 (tablosuz) eski görüntü: kural sürümü aynıysa bayraksız açılır. Kural farklıysa göç için görüntünün yazıldığı içeriğin kimlik tablosu gerekir (`--goc-eski-tablo YOL.json`, kodda `gocEskiTablo`); sürüm 2 görüntü tablosunu kendisi taşır.

## Esnaf Defteri: kavram dedektörü, ödül ve damgalar (rehber-gorevler.md §3.1, sunucu P0)

Para ve mal ödülü ÇEKİRDEKTEdir (`sistem_odul {oyuncu, kavram}`, tutar komutta yok: tutar, tavan 8.000 ₺ ve "kavram başına bir kez" çekirdek ödül tablosunda, `parametreler.json odul`); kozmetik/bilgi damgaları profilde. Sunucu yalnız **ne zaman verileceğini** saptar (`src/odul/dedektor.ts`, çekirdeği YALNIZ okur), komutu **sistem kimliğiyle günlüğe yazar** ve profili/Defter okumasını sunar. Tutar sunucuda yazılmaz, LLM yoktur. **Yalnız mülk kipinde** çalışır (bölge kipinde başlangıç yapıları bedava ödül olurdu); insan oyuncular için (sunucu botları ve sistem hariç).

**Kavram koşulları** (çekirdek durumundan türetilir; tablo `dedektor.ts` başlığında):

| Kavram | Saptama | Koşul |
| --- | --- | --- |
| `ilk_yapi` | sim-saat sınırı | işletme düğümlerinden birinde TAMAMLANMIŞ üretim yapısı (`BolgeDurumu.tesisler`; süren inşaat sayılmaz) |
| `ilk_satis` | sim-saat sınırı | `ticaretDefteri.toplam.brutIhracat` (tembel: toplam + oran x dt) > 0 |
| `ilk_isleme` | sim-saat sınırı | düğümde işleme yapısı (aktif yöntemi ham/ara girdiyi ara/tüketim malına çevirir; enerji hariç) VE o çıktı malının kümülatif üretimi > 0 |
| `zincir_kapandi` | sim-saat sınırı | oyuncunun iki FARKLI aktif yapısından birinin (enerji dışı) çıktısı ötekinin girdisi VE o çıktının kümülatif üretimi > 0 (en az bir üretim çevrimi) |
| `ikinci_ilce` | sim-saat sınırı | tamamlanmış üretim yapıları EN AZ İKİ FARKLI ilçede (`ilk_yapi` ile aynı yapı tanımı; hücre sahipliği YETMEZ) |
| `ilk_arastirma` | sim-saat sınırı | `teknolojiler.length > 0` (araştırma TAMAMLANDI; başlatma değil: rehber başlamayı da kabul eder, güvenli olan tamamlanmadır) |
| `ilk_dukkan`, `ilk_sozlesme` | YER TUTUCU | çekirdekte olay yok (dükkân P4, sözleşme sonra): dedektörde durur, TETİKLENMEZ; Defter'de `etkin: false` |
| (damga) `ilk_parsel` | komut | başarılı `parsel_al` (para/mal ödülü YOK; baş lider kararı: arazi spekülasyon değil üretim aracıdır) |
| (damga) `ilk_uretim` | sim-saat sınırı | herhangi bir düğümde kümülatif üretim > 0 |
| (damga) `ilk_donus` | komut | iki kabul edilen komut arası >= 6 sa (`MulkOyuncuDurumu.sonEtkinlik`) |

**Günlüğe giriş ve idempotans.** Komut: oyuncu = `sistem`, istemci = `sunucu`, anahtar = `odul:<oyuncu>:<kavram>`. Aday verilmez: kavram oyuncunun `alinanOdul`'unda varsa, anahtar idempotans tablosunda varsa (denenmiş), ödül tavanı aşacaksa ya da mal ödülü için işletme düğümü yoksa (çekirdeğin reddedeceği her durum) komut ÜRETİLMEZ; böylece reddedilen komut günlükte birikmez. Kurtarmada günlükteki `sistem_odul` kayıtları normal oynatılır, yeniden oynatma YENİ ödül komutu üretmez (yalnız damga türetir); yeniden başlatma `alinanOdul` ve idempotans tablosundan çift ödülü engeller.

**Determinizm (en kritik nokta).** Ödülün t'si hazineyi/stoku etkiler; bu yüzden tespit anı canlı koşuda, yetişmede ve kurtarmada aynıdır:
- **Sabit ızgara = her sim-saat sınırı** (`t % SAAT === 0`). Dedektör açıkken dünya her sınırda DURDURULUR (`calistirKadar` bölünmesi nötrdür), dünya tam o t'deyken, aynı t'deki komutlardan ÖNCE zamanla oluşan kavramlar (`ilk_yapi`, `ilk_satis`, `ilk_isleme`, `zincir_kapandi`) değerlendirilir ve ödül günlüğe o t ile girer. Canlı turlar (rastgele aralık), yetişme (1 sim-saat adım) ve kurtarma aynı sınırlardan geçer; komut toplusu sim-saat pencerelerine bölünür, pencereler arasında dünya sınırda ilerletilir (hiçbir komut bir sınırı değerlendirmeden atlatmaz).
- **Hiçbir kavram komutla tek adımda verilmez:** altısı da sim-saat sınırında, tamamlanmış yapı/araştırma/üretim koşuluyla değerlendirilir (ödül, bedelinden ucuza alınamasın). Bu yüzden "komut anında ödül" t sapması da yoktur: her ödülün t'si bir sim-saat sınırıdır.
- Günlük kurtarmanın tek doğrusudur: çökmede ödül komutu günlüğe yazılmadıysa bir sonraki sınırda (kapalı süre dahil) verilir; yazıldıysa aynen oynatılır.
- Testler (`odul.test.ts`, `odul-sureci.test.ts`): kesintisiz sunucu (saatlik, 7 dk ve 90 dk tur adımı) ile 1, 8 ve 48 saat kapalı kalıp yetişen sunucu AYNI ödülleri aynı t'de aynı sırayla verir (günlük, `durumOzeti` ve damgalar birebir); kill -9 sonrası çift ödül yok; CLI + dosya deposu + SIGKILL; gerçek pg.

**"Sunum kapalı" ile fark.** "Sen yokken" izleyicisi (`donus: false`) çekirdek durumunu DEĞİŞTİRMEZ: kapalıyken `durumOzeti` aynıdır (`donus.test.ts`). Ödül dedektörü ise çekirdek durumunu değiştirir (hazine/stok): bu yüzden **sunum katmanı sayılmaz**. Kapalıyken (`odul: false` / `--odul 0` / `BOLGE_ODUL=0`) hiçbir ödül komutu yoktur ve durum YALNIZ ödül kadar farklıdır: açık yazarın günlüğünden ödül komutları çıkarılıp yeniden oynatılınca kapalı dünyayla aynı t'de aynı `durumOzeti` çıkar (test). Kitaplık varsayılanı kapalı, CLI/compose varsayılanı AÇIK.

**Damgalar** (profil deposu: bellek, dosya, pg `profil_damga`, şema 3 `sql/003-defter.sql`): `(oyuncu, kavram)` anahtarlı, ilk yazım kazanır; yalnız olgu tutulur: `kavram`, `t` (sim ms), `kaynak` (`odul` = çekirdek ödülü alındı, `damga` = para/mal taşımayan bilgi/kozmetik); metin YOK (KVKK). Ödül damgası t'yi taşır (tutar çekirdekte); `ilk_parsel`, `ilk_uretim`, `ilk_donus` yalnız burada. Yazım `donusYaz` ile aynı hatta (anlık görüntüden önce kalıcılaşır), kurtarmada günlükten yeniden türetilir (idempotent).

**Defter okuması (protokol, yalnız ekleme).** İstemci `{ tur: "defterIste", istek?: int }` (yalnız oyuncu; yönetici `yetki` hatası; hız sınırı jeton bedeli 2) gönderir, sunucu şu mesajı döner:

```
{ tur: "defter", istek?: int,
  kazanilan: [{ kavram, sablon, tur: "odul"|"damga", t?: ms, odul?: { paraMili?: int, mal?: {malKimligi: miliBirim}, degerMili: int } }],
  siradaki:  [{ kavram, sablon, etkin: bool, odul: { paraMili?, mal?, degerMili } }],
  toplamOdulMili: int, tavanMili: int }
```

`sablon` = `defter.kavram.<kavram>` (metin istemcide); tutarlar çekirdek ödül tablosundan okunur (`odulDegeri`, `alinanOdulDegeri`), sunucu tutar yazmaz. `kazanilan`: alınmış ödüller (çekirdek `alinanOdul`; `t` profil damgasından, yoksa alan yok) + bilgi/kozmetik damgalar, zaman sırasıyla. `siradaki`: alınmamış ödüllü kavramlar kritik yol sırasıyla (`ilk_yapi, ilk_satis, ilk_isleme, zincir_kapandi, ilk_dukkan, ilk_sozlesme, ikinci_ilce, ilk_arastirma`); `etkin: false` = yer tutucu, istemci gizler. Dedektör kapalıyken de çalışır. Metrikler: `bolge_odul_verilen_toplam`, `bolge_odul_reddedilen_toplam` (beklenmedik çekirdek reddi; 0 olmalı).

**Kötüye kullanım (ödül bedelden ucuza alınamaz).** (1) `ikinci_ilce`: hücre alıp ödülü bekleyip `parsel_birak` ile iade almak risksiz arbitrajdı; koşul artık ikinci ilçede TAMAMLANMIŞ üretim yapısıdır (yapı bedeli ödülden büyüktür). (2) `ilk_arastirma`: rehber başlamayı da kabul eder, ama ödül araştırmanın TAMAMLANMASINA bağlıdır (`teknolojiler.length` artınca, sim-saat sınırında): çekirdekte araştırma iptal komutu ve iade YOKTUR (maliyet başlangıçta lavaboya düşer), yine de başlatıp bırakmaya kapalı olması için tamamlanma seçildi. (3) `ilk_satis` (₺500) başlangıç kitinden tek birim satışla alınabilir: ödül küçük ve tek seferlik, rehberin amacı (ilk satışı yaptırmak) bu; kabul. (4) `zincir_kapandi`: iki yapının bedeli ödülden fazla; ayrıca çıktının en az bir üretim çevrimi şartı vardır. Testler: `odul.test.ts` "kotuye kullanim" (al-bırak döngüsü ödül vermez; araştırma sürerken ödül yok, tamamlanınca bir kez).

**Belirsiz kalan tanımlar** (rehber sözlüğü yapısal/ham; seçimler kabul edildi): `ilk_yapi` "üretim yapısı" ek yapıları (Ambar, Ticaret ofisi) saymaz; `ilk_isleme` işleme yapısı tanımı içerikten türetilir (girdi ham/ara + çıktı ara/tüketim, enerji hariç) ve yapıyla birlikte KÜMÜLATİF üretim ister; `zincir_kapandi` akış/verim şartı koymaz (yalnız yapısal zincir + bir üretim çevrimi); `ilk_donus` yalnız mülk kipinde (`sonEtkinlik`); `ilk_yapi` ödülünün "tabela rengi" kozmetiği (rehber) henüz ayrı damga değildir.

## Postgres

- **Şema ve göç adımları:** `sunucu_sema` tablosu sürümü tutar (`SQL_SEMA_SURUMU = 3`). `postgresSemasiKur` (CLI ve `semaKur: true` her açılışta çağırır) eksik adımları sırayla, her biri tek işlemde ve şema advisory kilidi altında uygular; idempotenttir. Sürüm kaydı olmayan ama `snapshots` tablosu olan eski veritabanı sürüm 1 sayılır ve 002'ye yükseltilir (veri korunur). `semaKur: false` ile eski şemalı veritabanı açılırsa açık hata verir (`pg sema surumu eski`).
  - 003: `profil_damga` (Esnaf Defteri damgaları; PK `(dunya, oyuncu, kavram)`, olgu: kavram, t, kaynak).
  - 002: `snapshots` birincil anahtarı `(dunya, seq, sim_t, kural_sur)` (içerik göçü görüntüsü eskisiyle aynı seq/zamanda yazılabilir; eski kayıt kalır), `snapshot_yedek` (göç yedeği), `profil_capa` ve `profil_kayit` (çapalar ve özet kayıtları; PK = idempotans anahtarı `(dunya, oyuncu, tur, t, sira)`; halka ≤ 200 ve 30 sim-günü ömür `kayitEkle`'de uygulanır).
  - En son görüntü: `ORDER BY seq DESC, sim_t DESC, olusturma DESC, kural_sur DESC` (deterministik; aynı anahtar yeniden yazılırsa `olusturma` yenilenir).
- **Yerel deneme kümesi** (root olmayan kullanıcıyla; unix soketi, TCP kapalı):

```sh
S=/tmp/bolge-pg; B=/usr/lib/postgresql/16/bin
mkdir -p $S/soket && chown -R postgres:postgres $S      # root iseniz; aksi halde kendi kullanıcınızla
runuser -u postgres -- $B/initdb -D $S/veri -A trust -U bolge --no-locale -E UTF8
runuser -u postgres -- $B/pg_ctl -D $S/veri -o "-c listen_addresses='' -c unix_socket_directories=$S/soket -c fsync=off" -l $S/pg.log -w start
runuser -u postgres -- $B/createdb -h $S/soket -U bolge bolge_test
export BOLGE_PG_URL="postgres://bolge@localhost/bolge_test?host=$S/soket"
pnpm vitest run packages/sunucu packages/protokol        # pg testleri BOLGE_PG_URL ile açılır (yoksa atlanır)
runuser -u postgres -- $B/pg_ctl -D $S/veri -m fast stop && rm -rf $S   # işiniz bitince kümeyi durdurun
```

  Testler `pgt-*` dünyalarını kullanır ve sonunda siler; şema göç testleri geçici veritabanları (`bolge_eski_*`, `bolge_yeni_*`) açıp kaldırır. Postgres 16 ile doğrulandı.

## Alfa-0 işletim

Bu bölüm tek makinede (sunucu + Postgres 16) açık alfa için gerekenleri toplar. Gerçek kimlik doğrulama (e-posta sihirli bağlantı + Google, oturum, çok hesap, KVKK) tasarım notu: [KIMLIK.md](KIMLIK.md). Hiçbir sır depoda yoktur; yapılandırma yalnız ortam değişkenleriyle yapılır. Dosyalar kökteki `deploy/` altındadır.

### Kurulum (Docker Compose)

```sh
cp deploy/.env.ornek deploy/.env          # deploy/.env git'e girmez; PG_SIFRE, GELISTIRME_SIRRI, METRIK_TOKEN'i DEGISTIRIN (>= 16 karakter)
docker compose -f deploy/docker-compose.yml --env-file deploy/.env up -d --build
curl -s http://127.0.0.1:8787/saglik       # {"durum":"ok",...}
```

- `deploy/Dockerfile`: çok aşamalı (node:22-bookworm-slim), `pnpm install --frozen-lockfile` yalnız sunucu bağımlılık kümesi için, **root olmayan** `node` kullanıcısı, `HEALTHCHECK` = `/saglik`, `VOLUME /veri` (yalnız `BOLGE_DEPO=dosya` için). İmaj `deploy/Dockerfile.dockerignore` ile küçültülür (istemci/veri hattı kaynakları girmez).
- `deploy/docker-compose.yml`: `pg` (postgres:16, adlandırılmış kalıcı hacim `pgdata`, veritabanı dışarıya yayınlanmaz) + `sunucu` (`BOLGE_URETIM=1`, `BOLGE_DEPO=pg`). Portlar **yalnız 127.0.0.1**'e yayınlanır: oyuncu ws portu 8787 ve metrik portu 9464; internete TLS sonlandıran bir ters vekille (Cloudflare, Caddy, nginx) açın. `stop_grace_period: 60s` (kapanışta kuyruk yazılır, kapanış görüntüsü alınır). Zorunlu sırlar `${VAR:?}` ile verilmezse `compose` açık hata verir.
- `--uretim` / `BOLGE_URETIM=1` kipi: gelişim varsayılan sırrıyla ve 16 karakterden kısa ya da `degistir...` örnek değerli sırlarla açılmayı reddeder, `--elle-saat` yasaktır; metrik token'ı da aynı denetimden geçer.
- **Doğrulama durumu:** ortamda Docker daemon yok; `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.ornek config` (statik doğrulama) geçer, sırsız çağrı sırasıyla "PG_SIFRE gerekli" hatası verir. **İmaj derlenemedi: daemon yok**; Dockerfile'ın `pnpm install --frozen-lockfile --filter` adımı ve CLI başlatma komutu yerelde aynı dosya kümesiyle denendi, ama `docker build` hiç koşmadı. İlk gerçek makinede `docker compose ... up -d --build` + `/saglik` denemesi yapılmalıdır.

### Ortam değişkenleri

Her seçenek `BOLGE_<AD>` ile verilebilir; komut satırı bayrağı ortam değişkenini ezer (`pnpm -s sunucu -- --yardim` tam liste).

| Değişken | Anlam | Varsayılan |
| --- | --- | --- |
| `BOLGE_URETIM` | `1` = üretim kipi (sır/elle-saat denetimleri) | kapalı |
| `BOLGE_DEPO` | `pg` \| `dosya` \| `bellek` | `dosya` |
| `BOLGE_PG_URL` | pg bağlantı URI'si (`BOLGE_DEPO=pg`) | yok |
| `BOLGE_DUNYA` | dünya adı (aynı veritabanında birden çok dünya olabilir) | `ana` |
| `BOLGE_GELISTIRME_SIRRI` | oyuncu token imza sırrı (üretimde >= 16 karakter, açıkça verilmeli) | yerel geliştirme değeri |
| `BOLGE_HOST` / `BOLGE_PORT` | ws + `/saglik` dinleme adresi | `127.0.0.1` / `8787` |
| `BOLGE_HARITA`, `BOLGE_PARSEL`, `BOLGE_TOHUM` | harita (`mini`, `sentetik`, `gercek[:ad]`), mülk kipi, ilk açılış tohumu | `sentetik`, kapalı, `1` |
| `BOLGE_DUNYA_EPOCH` | yalnız YENİ dünyada duvar saati epoch'u (Türkiye gece yarısı); boş = `2026-09-30T21:00:00Z` | boş |
| `BOLGE_GOC` | `1` = içerik göçüne izin (yalnız dönem sınırında) | kapalı |
| `BOLGE_COMMIT_MS`, `BOLGE_GORUNTU_SAAT` | grup commit aralığı (ms), görüntü aralığı (sim-saat) | `75`, `6` |
| `BOLGE_ODUL` | `1` = Esnaf Defteri ödül dedektörü (kavram → `sistem_odul` günlüğe; çekirdek durumunu değiştirir; bkz. "Esnaf Defteri"); `0` = kapalı | `1` |
| `BOLGE_GORUNTU_ISCI` | `1` = periyodik görüntü serileştirme/özet/gzip işi worker_threads işçisinde (bkz. "Performans"); `0` = ana döngüde | `1` |
| `BOLGE_HIZ_SINIRI` | bağlantı başına komut hız sınırı `N/saniye` | `20/5` |
| `BOLGE_METRIK_PORT`, `BOLGE_METRIK_HOST`, `BOLGE_METRIK_TOKEN` | ayrı metrik sunucusu; port boşsa kapalı | kapalı, `127.0.0.1`, yok |
| `BOLGE_DIZIN` | dosya deposu dizini (`BOLGE_DEPO=dosya`) | `raporlar/dunya` |

Compose düzeyinde (`deploy/.env`): `PG_SIFRE`, `GELISTIRME_SIRRI`, `METRIK_TOKEN` (zorunlu), `SUNUCU_PORT`, `METRIK_YAYIN_PORT` ve yukarıdaki `BOLGE_*` seçimleri.

### Yedek ve geri yükleme (pg)

```sh
# Yedek: tutarli mantiksal dokum (acik sunucuyla birlikte alinabilir) + .sha256 + son seq ozeti
deploy/yedek.sh "postgres://bolge:SIFRE@127.0.0.1:5432/bolge" yedekler/bolge-$(date -u +%F).dump
#   compose icinden:  docker compose -f deploy/docker-compose.yml exec -T pg pg_dump -U bolge -Fc --no-owner bolge > yedek.dump

# Geri yukleme: YENI bir kumeye/veritabanina (dolu hedef reddedilir; --uzerine-yaz bilincli ister)
deploy/geri-yukle.sh yedekler/bolge-2026-10-01.dump "postgres://bolge:SIFRE@127.0.0.1:5432/bolge_yeni" --olustur
BOLGE_PG_URL=".../bolge_yeni" pnpm sunucu -- --depo pg --dunya ana       # sunucu oradan acilir: goruntu + gunluk kuyrugu
```

`PG_BIN=/usr/lib/postgresql/16/bin` ile istemci araçlarının dizini verilebilir. `.sha256` yedeğin yanında varsa geri yükleme önce doğrular, uyuşmazsa durur. **Sağlama:** geri yüklenen veritabanından açılan sunucunun `durumOzeti`'si, aynı sim zamanında canlı dünyanın özetiyle aynıdır (seq ve profil çapaları da). Bu tatbikat `packages/sunucu/test/yedek-geri-yukle.test.ts` içinde gerçek pg ile otomatiktir (`BOLGE_PG_URL` arkasında; kaynak veritabanı + `yedek.sh` + `geri-yukle.sh --olustur` + sunucu açılışı, ayrıca dolu/var olan hedef ve bozuk sha reddi). Yedeği düzenli alın (ör. günlük cron) ve geri yüklemeyi dönemsel olarak deneyin; yedek yalnız pg'yi kapsar, `BOLGE_GELISTIRME_SIRRI`'nı ayrıca güvenle saklayın (kaybolursa oyuncu token'ları geçersiz olur).

### Kural dönemi provası (içerik göçü)

Kural sürümü değişimi (yeni kimlik eklemek, parametre/denge değiştirmek) bir dönem sınırı işidir; ayrıntı yukarıdaki "İçerik göçü" bölümündedir. Prova sırası:

1. Eski içerikle çalışan sunucuyu normal kapatın (SIGTERM: kuyruk yazılır, kapanış görüntüsü günlüğü boşaltır). Günlük kuyruğu boş olmalıdır, aksi halde göç reddedilir.
2. `deploy/yedek.sh` ile pg dökümünü alın (göç ayrıca kendi görüntü yedeğini `snapshot_yedek`'e yazar, ama tam döküm ikinci sigortadır).
3. Yeni içerikle `BOLGE_GOC=1` (ya da `--goc`) açın; `hazir` olayındaki `kurtarma.goc` (`eklenen`, `ihlalSayisi`, `yenidenIndekslendi`) beklenenle uyuşuyor mu bakın; ardından `BOLGE_GOC=0` ile yeniden başlatın (sonraki açılış göç etmez).
4. Geri dönüş: yalnız yeni kural sürümüyle hiç komut kabul edilmediyse geçerlidir. Sunucuyu durdurun, `postgresDeposu({...}).yedektenDon("goc-<eskiKural>")` ile yedeği en yeni görüntü yapın (ya da tam dökümü geri yükleyin), eski içerikle bayraksız açın. Dosya deposunda `.yedek` dosyasını `<ad>.goruntu` üzerine kopyalayın.

### Sağlık ve metrik

- **`/saglik`** (ana portta, kimlik doğrulamasız, kişisel veri yok): `{ durum: "ok"|"yetisiyor"|"olumcul"|"kapaniyor", seq, simZamaniMs }`. Ölümcül yazma hatası ya da kapanış sırasında **503**, yetişme sırasında **200** (`durum:"yetisiyor"`: süreç sağlıklı, yalnız oyuncu komutu bekletilir; orkestratör yeniden başlatmasın). **`/hazir`** yalnız `durum:"ok"` iken 200'dür (ters vekil / yük dengeleyici kabul testi için).
- **`/metrik`** (Prometheus metin 0.0.4) **ayrı bir portta** sunulur (`BOLGE_METRIK_PORT`): oyuncu portunun yanından internete sızmaz. **Güvenlik seçimi:** varsayılan dinleme `127.0.0.1`; loopback dışına bağlanırsa (konteyner, ayrı makine) en az 16 karakterli `BOLGE_METRIK_TOKEN` ZORUNLUDUR ve `Authorization: Bearer <token>` istenir (sabit zamanlı karşılaştırma; yetkisiz 401, `GET` dışı 405, bilinmeyen yol 404), aksi halde sunucu başlamaz. Etiketler sabit kümelidir (`sonuc`, `neden`, `quantile`, `le`); oyuncu kimliği, token, ad ya da konum yoktur. Prometheus: `scrape_configs: [{ job_name: bolge, metrics_path: /metrik, authorization: { credentials_file: /etc/prometheus/bolge-token }, static_configs: [{ targets: ["127.0.0.1:9464"] }] }]`.
- Başlıca metrikler: `bolge_bagli_oyuncu`, `bolge_baglanti`; `bolge_komut_toplam{sonuc}` ve `bolge_komut_reddedilen_toplam{neden}` (hız sınırı, `yetisiyor`); `bolge_commit_gecikme_ms` (histogram + `{quantile}`: komutun kuyruğa girişinden commit'e) ; `bolge_yetisiyor`, `bolge_yetisme_kalan_ms`, `bolge_saat_geride_ms`; `bolge_depo_gunluk_bayt`, `bolge_depo_goruntu_bayt`; `bolge_son_goruntu_yasi_sim_ms` / `_saniye`, `bolge_son_goruntu_bayt`, `bolge_goruntu_toplam`, `bolge_goruntu_hata_toplam`, `bolge_goruntu_sure_son_ms`; `bolge_seq`, `bolge_sim_zamani_ms`, `bolge_tur_toplam`, `bolge_bekleyen_komut`, `bolge_olumcul`; görüntü işçisi: `bolge_goruntu_kopya_son_ms` / `_en_uzun_ms` (ana iş parçacığında kalan yapısal kopya), `bolge_goruntu_isci_son_ms`, `bolge_goruntu_isci_toplam`, `bolge_goruntu_atlanan_toplam`, `bolge_goruntu_isci_hata_toplam`; kare yayını: `bolge_yayin_atlanan_kare_toplam`, `bolge_yayin_yavas_kopan_toplam`, `bolge_yayin_sira`; olay döngüsü (`perf_hooks.monitorEventLoopDelay`, 10 ms çözünürlük, 5 dk kayan pencere): `bolge_olay_dongusu_gecikme_p50_ms` / `_p99_ms` / `_en_buyuk_ms`; süreç: `bolge_surec_bellek_bayt`, `bolge_surec_cpu_saniye_toplam`, `bolge_calisma_saniye`. Önerilen alarmlar: `bolge_olumcul == 1`, `bolge_olay_dongusu_gecikme_p99_ms` > 250, `bolge_goruntu_isci_hata_toplam` artışı, `bolge_son_goruntu_yasi_saniye` > 2 saat, `bolge_commit_gecikme_ms{quantile="0.95"}` > 1000, `bolge_goruntu_hata_toplam` artışı. Testler (`test/metrik.test.ts`) sahte ölçü saatiyle koşar; sayaçlar gerçek zamandan bağımsızdır.

### Performans: görüntü işçisi, yayın parçaları, uygulama dilimleme

Ölçülen gerçek: 100 botluk yükte olay döngüsünü tutan üç iş vardı. (1) Anlık görüntü serileştirme + özet (1,4 MB dünyada ≈ 100 ms CPU; pg'de gzip ≈ 12 ms daha), (2) 100 bağlantıya kare yayını, (3) çekirdeğin `Simulasyon.uygula` maliyeti (bkz. "Kalan darboğaz"). İlk ikisi sunucuda çözüldü; üçüncüsü çekirdeğin işidir.

**1. Görüntü işçisi** (`src/goruntu.ts`, `goruntu-isci.ts`; `BOLGE_GORUNTU_ISCI=1`, CLI varsayılanı açık, kitaplıkta `YazarSecenekleri.goruntuIsci`, varsayılan kapalı):
- Ana döngü yalnız dünyanın **yapısal kopyasını** alır (`postMessage`, V8 serileştirmesi; 1,4 MB dünyada ≈ 15 ms CPU). Kopya, görüntü seq'inin anındaki dünyadır: seq, sim zamanı, idempotans tablosu ve kopya AYNI eşzamanlı kesitte alınır (aralarında `await` yok); iş sürerken dünya değişse de işçi o anın metnini üretir (test: `goruntu-isci.test.ts`).
- Serileştirme, `durumOzeti` ve (pg için) gzip işçide yapılır. İşçi çekirdeğin `anlikGoruntuOlusturOzetli`'sini AYNEN çağırır: metin ve özet, eşzamanlı üretilenle **bayt bayt aynıdır** (test: aynı dünya, 72 sim-saatlik koşuda her görüntü için `metin` eşitliği). Depo yazımı ana iş parçacığında kalır, ama zaten eşzamansız G/Ç'dir (dosya: libuv havuzu + fsync; pg: kablo); işçiye taşımak ikinci bir havuz/kilit düzeni ve depo sözleşmesi değişikliği getirirdi, ana iş parçacığında kalan iş ise yalnız dizeyi kodlayıp göndermektir (CPU-ağır olan serileştirme ve gzip işçide).
- **Tek iş kuralı:** aynı anda en çok bir görüntü işi. İşçi meşgulken sıradaki görüntü **atlanır** (kuyruklanmaz; `bolge_goruntu_atlanan_toplam`); koşul (aralık dolmuş) sürdüğü için iş biter bitmez sonraki turda yeniden denenir.
- **Hata ölümcül değildir:** işçi çökerse/yüklenemezse/istisna atarsa `uyari` olayı ve `bolge_goruntu_isci_hata_toplam`; görüntü zamanı geri alınır ve en erken `isciYenidenDenemeMs` (5 sn) sonra yeniden denenir (işçi tembelce yeniden kurulur); ardışık 3 işçi hatasında o görüntü eşzamanlı (ana iş parçacığında) alınır, görüntü kaybolmaz.
- **Sıra sözleşmesi:** günlük, görüntüden bağımsız ilerler (komutlar önce günlüğe yazılır, sonra uygulanır); görüntü yalnız kendi seq'ine kadarını kapsar. Görüntü yazılmadan çökme = eski görüntü + daha uzun günlük kuyruğu, aynı dünya (testler: bellek deposunda yarıda kalan iş, `kurtarma-sureci.test.ts` üç kipte: işçi kapalı, işçi açık + görüntü diskteyken SIGKILL, işçi açık + görüntü beklenmeden SIGKILL). **Açılış, kapanış, içerik göçü, yetişme sonu ve `goruntuAl()` görüntüleri hep eşzamanlıdır** ve süren işçi işi bitmeden başlamaz (eski seq'in yeni seq'in üstüne yazılması yok); `kapat` işçiyi sonlandırır.
- İşçi `tsx` ile yüklenir (`worker_threads` `--import`'u uygulamaz): `goruntu-isci-yukle.mjs` önyükleyicisi `tsx/esm/api.tsImport` kullanır (kök bağımlılık; imajda zaten var). İşçi RSS'e ≈ +60-100 MB ekler.

**2. Kare yayını parçaları ve yavaş istemci** (`sunucu.ts`): tur sonu yayını artık bağlantıları bir **yayın sırasına** koyar; sıra `setImmediate` ile parçalar hâlinde boşaltılır (`yayinParca` = 8 bağlantı ya da `yayinButceMs` = 6 ms, hangisi önce). Kare, gönderim anındaki en güncel dünyadan çıkarılır (sıradaki bağlantı için ara kareler birleşir; her kare kendi içinde tutarlıdır). Yavaş istemci kuralı (bağlantı başına bekleyen tampon = ws `bufferedAmount`): tampon `enCokTampon` (4 MiB) üstündeyse kare/delta **atlanır** ve delta zinciri sıfırlanır (yetişince DELTA değil TAM kare gider; `bolge_yayin_atlanan_kare_toplam`); `kopmaTamponu` (4 x `enCokTampon`) aşılırsa ya da `enCokTampon` üstünde `yavasSureMs` (30 sn) kalırsa bağlantı **kopar** (`terminate`; istemci yeniden bağlanıp tam kare alır; `bolge_yayin_yavas_kopan_toplam`). Komut yanıtları da aynı sert sınıra tabidir. Test: `yayin-parca.test.ts` (tampon `tamponOlcer` ile kurulur; loopback'te gerçek birikim olmaz; parça sayısı elle sürülen `sonrakiTur` zamanlayıcısıyla sayılır, gerçek zamana/yüke bağlı değildir; karşılaştırmalar sunucunun gerçek durumuna dayanır, ara kareler birleşebilir).

**3. Uygulama dilimleme** (`yazar.ts`, `uygulamaDilimiMs` = 20): büyük bir komut toplusu uygulanırken (ör. 361 komut x 3-5 ms çekirdek maliyeti) her ≥20 ms'de olay döngüsüne nefes verilir. Günlük zaten toplu yazılmıştır; uygulama SIRASI, sonuçlar, seq ve `durumOzeti` değişmez (test: `uygulama-dilim.test.ts`, dilimli ve dilimsiz koşu aynı sonuç/özet); yalnız önceki komutların yanıtları toplunun sonunu beklemez ve ws okumaları/ping/`/saglik` aç kalmaz.

**4. Olay döngüsü gecikmesi** metriği (`perf_hooks.monitorEventLoopDelay`): `bolge_olay_dongusu_gecikme_{p50,p99,en_buyuk}_ms` (10 ms çözünürlük tabanı dahil, 5 dk kayan pencere).

**Görüntü maliyeti (iş parçacığının KENDİ CPU süresi, `process.threadCpuUsage`; çekişmeden etkilenmez)**, yük testi sonu dünyası (sentetik-50 + 95 oyuncu, 6 sim-günü, görüntü metni 1,41 MB):

| İş | CPU (ms) | Nerede |
| --- | --- | --- |
| serileştirme + özet (`anlikGoruntuOlusturOzetli`) | 100 | önce: ana döngü; sonra: işçi |
| gzip (yalnız pg) | 12 | önce: ana döngü; sonra: işçi |
| `structuredClone(dunya)` (serileştir + çöz) | 35 | ölçü (kullanılmaz) |
| `postMessage(dunya)` (yalnız serileştirme) | 14.6 | **sonra: ana döngüde kalan tek iş** |

Ana iş parçacığındaki görüntü işi ≈ 100-112 ms → ≈ 15 ms (≈ 7 kat azalma); kopya maliyeti dünya boyutuyla doğrusal (≈ 10 ms/MB). **Gebze:** gerçek Gebze fikstürü (tek ilçe, 508 634 hücre) hücre listesi saklamaz (bloklar), bu yüzden dünya 3 oyuncuyla ≈ 96 KB'tır (serileştirme + özet 3,5 ms, `structuredClone` 0,6 ms): görüntü maliyetini hücre sayısı değil oyuncu/parsel/tesis sayısı belirler. Büyük olan yük testi dünyasıdır (95 oyuncu, çok parsel/tesis). (Gebze fikstürü depoda yalnız istemci betiğiyle üretilir, sunucu testine girmez; bu ölçüm tek seferliktir.)

### Yük testi (100 bot)

```sh
BOLGE_AGIR_TEST=1 pnpm vitest run packages/sunucu/test/yuk.test.ts                                 # dosya deposu
BOLGE_AGIR_TEST=1 BOLGE_YUK_DEPO=pg BOLGE_PG_URL=postgres://... pnpm vitest run packages/sunucu/test/yuk.test.ts
# ayarlar: BOLGE_YUK_SENARYO (patlama|kademeli), BOLGE_YUK_BOT (100), BOLGE_YUK_TUR (24), BOLGE_YUK_DEPO (bellek|dosya|pg), BOLGE_YUK_ABONE=0, BOLGE_YUK_GORUNTU_SAAT (6),
#          BOLGE_YUK_ISCI=0 (görüntü işçisi kapalı), BOLGE_YUK_ISINMA (4: ilk N tur ayrıca raporlanır), BOLGE_YUK_PROFIL=dosya.cpuprofile (ana iş parçacığı CPU profili)
```

`@bolge/botlar` parsel botları (yalnız içe aktarılır, çekirdek/bot kodu değişmez) gerçek ws üzerinden bir sunucuya `katil` olur; her tur 6 sim-saat (zaman sıkıştırılmıştır: yük, canlı dünyadaki dakikalara değil birkaç saniyeye yığılır, bu yüzden bir gerçek yükün DÜŞMANCA üst sınırıdır). JSON rapor `raporlar/yuk/yuk-<zaman>.json` (git dışı) ve konsol özeti: uçtan uca komut gecikmesi (tüm komutlar, ilk `BOLGE_YUK_ISINMA` tur ve ısınma sonrası ayrı), sunucu commit gecikmesi, olay döngüsü gecikmesi (p50/p99/en büyük), CPU, bellek, görüntü maliyeti. Test düşerse aşama günlüğü, ortam ve pg durumu `=== YUK TESTI DUSTU: TANI ===` bloğunda basılır. `BOLGE_AGIR_TEST` yoksa test atlanır.

**Senaryolar ve tek komutla tekrar** (G2'nin çekirdek maliyeti işi dahil önce/sonra ölçümü bununla alınır):

```sh
packages/sunucu/scripts/yuk.sh kademeli            # 100 bot, tur başına 5 bot katılır; dosya deposu
packages/sunucu/scripts/yuk.sh patlama dosya 3     # mevcut patlama senaryosu, 3 tekrar
BOLGE_PG_URL=postgres://... packages/sunucu/scripts/yuk.sh kademeli pg
BOLGE_YUK_HEDEF_ZORUNLU=1 packages/sunucu/scripts/yuk.sh kademeli   # ısınmış p95 > 300 ms ise başarısız
# ayarlar: BOLGE_YUK_KADEME (5; tur başına katılan bot), BOLGE_YUK_ISINMA (4), BOLGE_YUK_BOT (100), BOLGE_YUK_TUR, BOLGE_YUK_GORUNTU_SAAT, BOLGE_YUK_ISCI=0
```

Betik tek satırlık özet basar (senaryo, depo, tüm/katılım dönemi/ısınmış p50-p95, commit, olay döngüsü, makine yükü) ve ayrıntıyı `raporlar/yuk/*.json`'a yazar. Temiz bir çalışma ağacında (başka işlerin yarım değişiklikleri sonucu bozmasın) ve makine boşken koşun; sonuçta "yuk" (1 dk makine yük ortalaması) 4'ün çok üstündeyse mutlak değerler şişkindir, yalnız art arda alınan karşılaştırma anlamlıdır.
- **patlama** (varsayılan): 100 bot baştan katılır; ilk turlarda hepsi aynı grup commit'inde pahalı kurulum komutları (parsel, yapı, ticaret) yollar. Gerçek trafiği değil, DÜŞMANCA üst sınırı ölçer.
- **kademeli**: botlar tur başına `BOLGE_YUK_KADEME` (5) bot hızıyla katılır (1 tur = 6 sim-saat sıkıştırılmış zaman; "tur başına N bot" gerçek zamanda "dakikada N bot" ölçeğidir): 100 bot için 20 tur katılım dönemi, sonra `BOLGE_YUK_ISINMA` (4) tur ısınma, sonra 20 tur ısınmış durum. Rapor üç dilim verir: katılım dönemi, ilk turlar (katılım + ısınma) ve **ısınmış durum**.
- **Hedef:** ısınmış durumda uçtan uca komut p95 ≤ 300 ms (`hedefP95Ms`, rapordaki `hedefIsinmisTuttu`). Alfa-0 için kabul edilen tanım budur; patlama için hedef yoktur (çekirdek maliyeti, aşağıda).

Önce/sonra yerine iki senaryonun karşılaştırması (HEAD ce9a3ac; her hücre 6 koşunun medyanı, art arda koşuldu, **makine yükü 15-21 idi**: mutlak değerler yaklaşık 4 kat şişkin; ms):

| Senaryo / depo | komut | tüm komutlar p95 (min-maks) | katılım dönemi p50 / p95 | ısınmış p50 / p95 (min-maks p95) | commit p95 (tüm) | olay döngüsü p99 / en büyük |
| --- | --- | --- | --- | --- | --- | --- |
| patlama, dosya | 1326 | 2118 (1111-2650) | - | 121 / 208 (171-283) | 1982 | 462 / 1020 |
| patlama, pg | 1326 | 2191 (1424-2724) | - | 79 / 222 (128-334) | 2065 | 331 / 662 |
| kademeli, dosya | 1275 | 429 (257-458) | 235 / 444 | 106 / 211 (118-302) | 379 | 379 / 879 |
| kademeli, pg | 1275 | 340 (287-401) | 199 / 332 | 76 / 296 (99-361) | 308 | 382 / 560 |

Okuma: kademeli katılımda tüm komutların p95'i patlamanın 1/5'i kadardır (kalan darboğaz katılım dönemindeki 5 botluk kurulum dalgaları); ısınmış p95 iki senaryoda da ≈ 210-300 ms (hedefin içinde, yüklü makinede bile; en kötü koşu 360 ms). Daha az yüklü bir koşuda (yük 11,5, `yuk.sh kademeli dosya`) tüm komutların p95'i 251 ms, ısınmış p95 117 ms çıktı (hedef tuttu). Boş makinede (bu ölçümlerin 4 kat altı yüklü) kademeli senaryonun tümünün 300 ms'in altına inmesi beklenir; çekirdek komut maliyeti işi (G2) bunu ve patlamayı iyileştirmelidir.

**Ölçüm ortamı:** Intel Xeon 2.10 GHz, 4 çekirdek, 15.7 GB RAM, Linux 6.18, Node v22.22.2; sunucu, 100 bot ve test koşucusu AYNI süreçte ve aynı makinede (yerel pg 16, `fsync=off`; üretim donanımında diskli fsync commit'i yavaşlatır). Sentetik harita + sentetik-50 parsel (mülk kipi), 100 bot (95'inin `katil` komutu başarılı oldu), 24 tur, 1326-1588 komut (bot sürümüne göre), hiç protokol hatası yok. **Makine ölçüm sırasında başka geliştirme işleriyle paylaşıldı ve 4 çekirdeğe karşı ortalama 10-14 koşabilir iş vardı** (`yuk` sütunu): mutlak değerler yaklaşık 3 kat şişkindir, yalnız aynı koşulda art arda alınan "önce/sonra" karşılaştırması anlamlıdır.

**Önce / sonra** (aynı HEAD, aynı makine, her yapılandırma için önce-sonra ARDIŞIK, 3 tekrarın MEDYANI; ms; "önce" = bu işten önceki sunucu, "sonra" = işçi + parça + dilim). Gecikmeler uçtan uca (komutun gönderimi → `komutSonucu`):

| Yapılandırma | Sürüm | tüm komutlar p50 / p95 | ısınma sonrası p50 / p95 | commit p50 / p95 (tüm) | olay döngüsü p50 / p99 / en büyük | CPU çekirdek | RSS MB |
| --- | --- | --- | --- | --- | --- | --- | --- |
| dosya, görüntü 1 sa | önce | 487 / 1069 | 69 / 184 | 119 / 909 | 12 / 389 / 1001 | 0.73 | 285 |
|  | sonra | 177 / 1064 | 101 / 190 | 129 / 1026 | 13 / 256 / 857 | 0.88 | 379 |
| dosya, görüntü 6 sa | önce | 375 / 1256 | 44 / 148 | 109 / 1064 | 14 / 351 / 1187 | 0.79 | 307 |
|  | sonra | 204 / 988 | 108 / 206 | 152 / 953 | 13 / 234 / 625 | 0.93 | 372 |
| dosya, görüntü seyrek | önce | 303 / 943 | 42 / 101 | 86 / 774 | 14 / 523 / 850 | 0.97 | 234 |
|  | sonra | 151 / 1039 | 58 / 151 | 116 / 992 | 21 / 246 / 314 | 0.90 | 252 |
| pg, görüntü 1 sa | önce | 370 / 1396 | 29 / 110 | 97 / 1129 | 11 / 419 / 1344 | 0.77 | 304 |
|  | sonra | 131 / 988 | 47 / 135 | 79 / 946 | 14 / 257 / 271 | 1.15 | 379 |
| pg, görüntü 6 sa | önce | 338 / 898 | 27 / 116 | 61 / 737 | 11 / 365 / 857 | 0.94 | 304 |
|  | sonra | 123 / 897 | 33 / 123 | 86 / 852 | 12 / 195 / 355 | 1.24 | 378 |
| pg, görüntü seyrek | önce | 380 / 1067 | 30 / 117 | 85 / 794 | 10 / 444 / 864 | 0.86 | 248 |
|  | sonra | 178 / 1131 | 39 / 212 | 103 / 1044 | 12 / 268 / 439 | 0.78 | 249 |

Ne değişti, ne değişmedi: (a) **olay döngüsü p99 %33-53 düştü, en büyük gecikme %14-80 düştü** (çoğunda %50'den fazla; görüntü işçisi + yayın parçaları + dilimleme); (b) **tüm komutların p50'si %46-65 düştü** (dilimleme: patlamadaki ilk komutların yanıtı toplunun sonunu beklemiyor); (c) **tüm komutların p95'i büyük ölçüde DEĞİŞMEDİ (önce 0,9-1,4 sn, sonra 0,9-1,1 sn)**: hedef (≤ 300 ms) tüm komutlar için TUTMUYOR; (d) ısınmış durumda (ilk 4 turdan sonra) p95 100-210 ms, yani **hedefin içinde**, görüntü işçisi açıkken kuyrukla yarışan ek CPU yüzünden bu makinede sonra sürümün ısınma p50'si birkaç ms ila ~60 ms yüksek çıktı (işçi iş parçacığı çekişmeli 4 çekirdekte ana iş parçacığıyla yarışıyor; boş makinede beklenen tersidir). Not: "önce" sürümün ağır görüntü işi, test düzeninde komutların gönderildiği pencerenin DIŞINA düşüyordu (tur sonunda görüntü, sonra botlar komut gönderir); gerçek trafikte görüntü rastgele anlara denk gelir ve o an gelen her komuta ≈ 100 ms ekler: ölçülen kazanç bu yüzden olay döngüsü gecikmesinde ve CPU maliyetinde görünür, bu test düzeninde komut gecikmesinde değil.

**Kalan darboğaz: çekirdeğin komut maliyeti (sunucu değiştiremez).** Tüm komutların p95'ini ilk turlardaki patlama belirler: 100 bot ilk 3 turda 673 komut yollar (1326 komutun %51'i; ilk turda 361 komut aynı grup commit'inde). Tur içi zamanlama (yazar aşamaları, geçici enstrümantasyon, dosya deposu): 361 komutluk toplu için `Simulasyon.uygula` toplamı 979 ms, 191 komutluk için 797 ms, 121 komutluk için 835 ms; günlük yazımı 2-65 ms; yani **toplunun %86-92'si çekirdekte** (tur 1059 / 928 / 909 ms). Komut türüne göre `Simulasyon.uygula` (tüm koşu, çekişmeli makinede): `ticaret_emri` 337 komut, ort 7,8 ms (en yavaşı 337 ms); `yapi_yerlestir` 239 komut, ort 7,0 ms; `parsel_al` 722 komut, ort 2,2 ms (650'si reddedilen!); `oyuncu_katil` 100 komut, ort 6,8 ms. Isınmış turlarda 40-57 komutluk toplu 33-103 ms. **Öneri (çekirdek/G2):** `ticaret_emri` ve `yapi_yerlestir` sonrası lojistik/kapsam yeniden hesabını (`lojistikCoz`, `kapsamiHesapla`, profilde en yüksek öz süreler) komut başına değil toplu ya da tembel yap; reddedilen `parsel_al`'ı ön doğrulamada ucuzlat. **Öneri (test düzeni):** gerçek oyuncular ilk 4 turdaki gibi hepsi aynı 75 ms'de 361 pahalı komut göndermez; hedef p95'i ısınmış (ya da kademeli katılım) senaryo üzerinde tanımlamak daha gerçekçidir. Sunucu tarafı olarak yapılabilecek kalan: `commitAraligiMs` 75'ten 25-30'a (tur başına iş küçülür, p50 azalır), ama patlamanın toplam maliyetini azaltmaz.

## Testler

`pnpm vitest run packages/sunucu packages/protokol` (~60 sn; kill -9 testi üç kipte (işçi kapalı/açık) alt süreç başlatır; `goruntu-isci.test.ts` (bayt eşitliği, kopya anı, tek iş, hata, çökme), `yayin-parca.test.ts` (parçalı yayın, yavaş istemci), `uygulama-dilim.test.ts`; `mutlak-saat.test.ts` sahte duvar saatiyle koşar). Gerçek Postgres testleri (`pg.test.ts`, `yedek-geri-yukle.test.ts`) yalnız `BOLGE_PG_URL` tanımlıysa koşar. Yük testi (`yuk.test.ts`) yalnız `BOLGE_AGIR_TEST=1` ile koşar (bkz. "Alfa-0 işletim"). `BOLGE_TEST_DIZIN_TUT=1` kill -9 testinin veri dizinini inceleme için bırakır.
