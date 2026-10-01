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

# Postgres (şema sql/001-baslangic.sql açılışta kurulur)
BOLGE_PG_URL=postgres://localhost/bolge pnpm sunucu -- --depo pg --dunya ana
```

Bütün seçenekler: `pnpm -s sunucu -- --yardim`. İmza sırrını `BOLGE_GELISTIRME_SIRRI` ile verin (varsayılan yalnız yerel geliştirme içindir). Sunucu olayları stdout'a satır başına bir JSON olarak yazar (`hazir`, `uyari`, `kapandi`, `olumcul`). SIGINT/SIGTERM'de kuyruğu yazar, kapanış görüntüsünü alır ve çıkar. kill -9 sonrası yeniden başlatma son görüntü + günlük kuyruğuyla devam eder.

## Mutlak saat ve kapalıyken yetişme

Dünya sunucu kapalıyken de akar (sahip kararı, docs/12 §7). Varsayılan saat (`DuvarSaati`, `--hiz 1`) mutlaktır: `t = duvar saati − dunyaEpochMs`. Epoch dünyayla birlikte anlık görüntü üst verisinde saklanır; yeni dünyada varsayılan `2026-09-30T21:00Z` (1 Ekim 2026 00:00 TRT, kalıcı UTC+3; `--dunya-epoch` yalnız yeni dünyada, bir Türkiye gece yarısı olmalı). Epoch'suz eski dünya ilk mutlak açılışta "şimdi = dünyanın şimdiki zamanı" olarak bağlanır.

- **Yetişme:** açılışta son görüntü + kalan günlük uygulanır; dünya duvar saatinin gerisindeyse (`yetisiyor`) ana döngü 1 sim-saatlik adımlarla yetişir (uykusuz, her adımda olay döngüsüne nefes; görüntü 24 sim-saatte bir ve bitişte). İlerleme stdout'a `{"olay":"yetisme",...}` / `{"olay":"yetisti",...}` satırlarıyla (~1 sn'de bir) yazılır. Ölçü: sentetik harita + 2 bot, 30 gün ≈ 11 sn.
- **Komut sözleşmesi:** yetişirken dışarıdan gelen yeni komut kuyruklanmaz, `yetisiyor` hata koduyla reddedilir (günlüğe girmez; işlenmiş anahtar ilk sonucuyla yanıtlanır). Bağlantı `hosgeldin.yetisiyor` ve sonraki `durum` mesajlarıyla ilerlemeyi ve bitişi öğrenir; istemci bitince aynı anahtarla yeniden dener. Sunucu botları yetişirken de karar verir (dünyanın zamanıyla damgalanır).
- **Monoton koruma:** duvar saati geri giderse (NTP) sim zamanı geri gitmez; saat eski değeri aşana kadar bekler, bir kez `uyari` olayı yazılır. Yeniden başlatmada duvar dünyadan gerideyse hata yoktur (`kurtarma.saatGeriMs`).
- `--hiz` ≠ 1 ya da `--birikimli`: eski kapalıyken-duran saat (hızlandırılmış geliştirme dünyaları); `--elle-saat` ve testlerdeki `ElleSaat` değişmedi. `DuvarSaati`'na `duvar` işlevi enjekte edilebilir (testler sahte saatle koşar).
- Henüz yok (çekirdek işi): kesinti adaleti (kesinti > 15 dk ise rastgele olumsuz olayların ön duyuru→etki geçişini kesinti kadar öteleme; canli-dunya-simulasyonu.md §2.2). Sunucu botlarının iç durumu görüntüye girmez, yeniden başlatmada sıfırlanır.

## Mülk kipi, oyuncu katılımı ve kare eklemeleri (F4)

- **`--parsel-dosya YOL`:** mülk kipinde verilen parsel fikstürü JSON'u açılır. Dosya `@bolge/veri` `dogrulaParselFiksturu` doğrulayıcısından (harita ile) geçer; bozuksa `olumcul` olayında madde madde hata, `param.mulk` yoksa açık hata. `--parsel` ile birlikte verilmez.
- **`katil {anahtar, ilce?}` istemci mesajı** (yalnız mülk kipi): sunucu `oyuncu_katil {oyuncu: <doğrulanmış kimlik>, bolgeler: [], ilce}` komutunu "sistem" olarak damgalar; oyuncu kimliği mesajdan GELMEZ (başkası adına katılım olmaz). Yanıt `komutSonucu`; ikinci katılım çekirdeğin "oyuncu zaten katilmis" hatasını, aynı anahtar ilk sonucu (`tekrar`) döner. Hız sınırı ve yetişme reddi (`yetisiyor`) uygulanır; yönetici `katil` kullanmaz (`komut` + `oyuncu_katil` yolu aynen kalır). İdempotans kapsamı `katil:<oyuncu>`.
- **Periyodik `zaman` yayını:** kimliği doğrulanmış bağlantılara ~15 sn'de bir `{tur:"zaman", yayin:true, istemciGonderim:-1, simZamani, hiz}` (yalnız `t` değiştiğinde de istemci saati kaymasın; `zamanIste` yanıtında `yayin` yoktur). `SunucuSecenekleri.zamanYayinAraligiMs` (0 = kapalı) ve test için `duvarMs`.
- **Merhaba `kuralSurumu`:** istemci göndermezse bağlantı kabul edilir ve bağlayıcı değer `hosgeldin.kuralSurumu`'dur; gönderir ve uyuşmazsa `kural_surumu` hatası + kapanış.
- **Kare eklemeleri (hepsi isteğe bağlı alan, `@bolge/protokol` `kare.ts`):** hücrede tesis/ek yapı türü (`[..., tur?, degerMili?]`: tür herkese, değer yalnız sahibine); ilçede `ayrilmisAdet` (her zaman) ve `ayrilmis` listesi (yalnız `abone {ayrilmis:true}` isteyen bağlantıya; Gebze ölçeğinde ilçe başına ~1,5 MB / gzip ~200 KB, değişmezdir: deltada tekrarlanmaz); yalnız sahibine `oyuncu.erkenOyun` (formül; `erkenOyunCarpani(f, t)`), `oyuncu.mulk.indirimliYapiKalan`, `oyuncu.mulk.ayrilmisBitis`, `insaatlar` demetinde `baslangic` ve ek yapı kimliği.

## Kamu arsası (satılmayan hücreler)

- **Yayın (ilçe karesi, hepsi isteğe bağlı alan):** `ilceler[].kamuAdet` (kamu hücre sayısı = blok alanları toplamı; her zaman, kamu yoksa alan yok) ve `ilceler[].kamu` (gruplar; yalnız `abone {kamu: true}` isteyen bağlantıya). Grup: `{sahip: "k:mahalle:<id>" | "k:ilce:<id>", tur: "meydan"|"pazar"|"park"|"hizmet"|"kiyi"|"sanayi_rezervi"|"hazine", blok: [x0, y0, x1, y1][]}`; hücre kimliği "x:y" olduğundan blok x0..x1 × y0..y1 (dört uç dahil) hücreleridir. Çekirdeğin `kamuBloklari` API'si bloğu YALNIZ uygun kamu hücrelerine kısıtlar: bloğun içindeki her hücre kamudur (yol/su blok dışındadır). Gruplar (sahip, tür), bloklar (y0, x0) sıralı. Kamu kümesi dünya kurulurken donar: delta ilçe zaten istemcideyken tekrarlamaz (`deltaUygula` korur). Kamu hücreleri `hucreler` listesinde YOKTUR (satılmaz). Protokol yardımcıları: `kamuBilgisiBul(kamu, "x:y")` (hücre kartı: tür + sahip, sunucuya sormadan), `blokHucreleri(blok)` (blokları hücre kimliklerine açar).
- **Boyut (Gebze f4 fikstürü, tek ilçe 508 634 hücre / 485 856 uygun):** 22 854 kamu hücresi = 210 grup, 1 396 blok; `kamu` listesi 54,4 KB JSON (gzip 10,1 KB); ilçe karesi listesiz 1,5 KB (gzip 0,6 KB), listeli 55,9 KB (gzip 10,8 KB). Ayrılmış hücre listesi (karşılaştırma): 92 600 hücre, kare 1,48 MB. `Simulasyon.olustur` 1,4 sn. Kare çıkarma: ilk çağrı 145 ms (önbellek kurulumu: kamu blokları + ayrılmış küme), sonra 0,1 ms (liste önbellekli).
- **Ret:** kamu hücresine `parsel_al`/`yapi_yerlestir` çekirdekten reddedilir; sunucu iletiyi `komutSonucu.sonuc.hata` olarak aynen iletir.
- **Açılış uyarısı:** mülk kipi açık, parametrede `mulk.kamu` var ama yüklenen dünyada kamu kümesi yok (kamu öncesi kurulmuş dünya) ise `uyari` olayı ve `kurtarma.kamuKapali: true` / `kurtarma.uyarilar`: "bu dunyada kamu arsasi kurali kapali ...; ilk gercek satistan once yeni dunya baslatin".

## İçerik göçü (`--goc` / `gocIzni`, docs/06 §14.2)

`icerik.json`'a kimlik eklemek (yalnız SONA) ya da parametre/denge değiştirmek kural sürümünü değiştirir. Varsayılan (bayrak yok): kural sürümü ya da özet uyuşmazsa açılış hata verir. `--goc` (kodda `gocIzni: true`) ile:

1. Yalnız **dönem sınırında** çalışır: görüntüden sonra günlükte kayıt yokken. Görüntüden sonraki HER kayıt eski kural sürümüyle yazılmıştır (açılış hep görüntü + kuyruktur; yeni kuralla hiç açılmamıştır; kayıtta kural sürümü alanı bulunsa da bulunmasa da görüntü seq'inden sonra kayıt sayısı > 0 ise reddetmek yeterlidir) ve günlük kural sürümleri arasında yeniden oynatılamaz. Kuyruk doluysa açılış `goc yalniz donem sinirinda: goruntuden (seq N) sonra K gunluk kaydi var` hatasıyla durur, günlük OYNATILMAZ. Yapılacak: eski kural sürümüyle (bayraksız) açıp düzgün kapatın (kapanış görüntüsü kuyruğu boşaltır), sonra göç edin.
2. `Simulasyon.anlikGoruntudenYukleSonuclu(..., { gocIzni: true, yalnizEkleZorunlu })` ile yüklenir; üst verideki özet göçte `goc.eskiDurumOzeti`'ne karşı denetlenir (yeniden indekslendiyse göçmüş dünyanın özeti görüntününkinden farklıdır, bu beklenir). `yalnizEkleZorunlu` sunucuda varsayılan AÇIK: araya ekleme/yeniden sıralama reddedilir (`--goc-esnek` yalnız geliştirmede kapatır).
3. Göçten hemen sonra yeni (güncel kural sürümlü, zarf v2) görüntü alınır; sonraki açılış göç etmez. Yeni görüntü eskisiyle AYNI seq ve sim zamanında yazılır; bu yüzden eski görüntü ÖNCE depo `goruntu.yedekle` ile ayrı ve kalıcı saklanır (yedek alınmadan üzerine yazılmaz; yedek yoksa/alınamazsa göç durur, dünya ve depo değişmez). Dosya deposu: `goruntu/<ad>.goruntu.goc-<eskiKural>.yedek` (fsync'li kopya; `.goruntu` ile bitmediğinden `sonuncu()`a girmez ve saklama sınırıyla silinmez); yeri `kurtarma.goc.yedek`. **Geri dönüş:** sunucuyu durdurun, yedeği `<ad>.goruntu` üzerine kopyalayın, eski içerikle (bayraksız) açın; yalnız yeni kural sürümüyle HİÇ komut kabul edilmediyse geçerlidir (sonraki günlük kayıtları yeni kural sürümlüdür). **pg deposunda göç henüz desteklenmiyor** (`snapshots` birincil anahtarı `(dunya, seq, sim_t)` aynı seq/zamandaki göç görüntüsünü reddeder; `yedekle` açık hatayla reddeder): göç için dosya deposu kullanın.
4. `kurtarma.goc` (`hazir` olayında): `yenidenIndekslendi`, `eskiKuralSurumu`, `yeniKuralSurumu`, `yalnizEkle`, `eklenen` (uzay -> kimlikler), `eklenenSayisi`, `ihlalSayisi`; göç yoksa `null`.
5. Zarf SÜRÜM 1 (tablosuz) eski görüntü: kural sürümü aynıysa bayraksız açılır. Kural farklıysa göç için görüntünün yazıldığı içeriğin kimlik tablosu gerekir (`--goc-eski-tablo YOL.json`, kodda `gocEskiTablo`); sürüm 2 görüntü tablosunu kendisi taşır.

## Testler

`pnpm vitest run packages/sunucu packages/protokol` (~15 sn; kill -9 testi alt süreç başlatır; `mutlak-saat.test.ts` sahte duvar saatiyle koşar). Gerçek Postgres testi yalnız `BOLGE_PG_URL` tanımlıysa koşar. `BOLGE_TEST_DIZIN_TUT=1` kill -9 testinin veri dizinini inceleme için bırakır.
