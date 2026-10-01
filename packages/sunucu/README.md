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

## Postgres

- **Şema ve göç adımları:** `sunucu_sema` tablosu sürümü tutar (`SQL_SEMA_SURUMU = 2`). `postgresSemasiKur` (CLI ve `semaKur: true` her açılışta çağırır) eksik adımları sırayla, her biri tek işlemde ve şema advisory kilidi altında uygular; idempotenttir. Sürüm kaydı olmayan ama `snapshots` tablosu olan eski veritabanı sürüm 1 sayılır ve 002'ye yükseltilir (veri korunur). `semaKur: false` ile eski şemalı veritabanı açılırsa açık hata verir (`pg sema surumu eski`).
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

Bu bölüm tek makinede (sunucu + Postgres 16) açık alfa için gerekenleri toplar. Hiçbir sır depoda yoktur; yapılandırma yalnız ortam değişkenleriyle yapılır. Dosyalar kökteki `deploy/` altındadır.

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
- Başlıca metrikler: `bolge_bagli_oyuncu`, `bolge_baglanti`; `bolge_komut_toplam{sonuc}` ve `bolge_komut_reddedilen_toplam{neden}` (hız sınırı, `yetisiyor`); `bolge_commit_gecikme_ms` (histogram + `{quantile}`: komutun kuyruğa girişinden commit'e) ; `bolge_yetisiyor`, `bolge_yetisme_kalan_ms`, `bolge_saat_geride_ms`; `bolge_depo_gunluk_bayt`, `bolge_depo_goruntu_bayt`; `bolge_son_goruntu_yasi_sim_ms` / `_saniye`, `bolge_son_goruntu_bayt`, `bolge_goruntu_toplam`, `bolge_goruntu_hata_toplam`, `bolge_goruntu_sure_son_ms`; `bolge_seq`, `bolge_sim_zamani_ms`, `bolge_tur_toplam`, `bolge_bekleyen_komut`, `bolge_olumcul`; süreç: `bolge_surec_bellek_bayt`, `bolge_surec_cpu_saniye_toplam`, `bolge_calisma_saniye`. Önerilen alarmlar: `bolge_olumcul == 1`, `bolge_son_goruntu_yasi_saniye` > 2 saat, `bolge_commit_gecikme_ms{quantile="0.95"}` > 1000, `bolge_goruntu_hata_toplam` artışı. Testler (`test/metrik.test.ts`) sahte ölçü saatiyle koşar; sayaçlar gerçek zamandan bağımsızdır.

### Yük testi (100 bot)

```sh
BOLGE_AGIR_TEST=1 pnpm vitest run packages/sunucu/test/yuk.test.ts                                 # dosya deposu
BOLGE_AGIR_TEST=1 BOLGE_YUK_DEPO=pg BOLGE_PG_URL=postgres://... pnpm vitest run packages/sunucu/test/yuk.test.ts
# ayarlar: BOLGE_YUK_BOT (100), BOLGE_YUK_TUR (24), BOLGE_YUK_DEPO (bellek|dosya|pg), BOLGE_YUK_ABONE=0, BOLGE_YUK_GORUNTU_SAAT (6)
```

`@bolge/botlar` parsel botları (yalnız içe aktarılır, çekirdek/bot kodu değişmez) gerçek ws üzerinden bir sunucuya `katil` olur; her tur 6 sim-saat (zaman sıkıştırılmıştır: yük, canlı dünyadaki dakikalara değil birkaç saniyeye yığılır, bu yüzden bir gerçek yükün DÜŞMANCA üst sınırıdır). JSON rapor `raporlar/yuk/yuk-<zaman>.json` (git dışı) ve konsol özeti: uçtan uca komut gecikmesi (p50/p95/p99), sunucu commit gecikmesi, CPU, bellek, olay döngüsü en büyük sapması. `BOLGE_AGIR_TEST` yoksa test atlanır.

**Ölçüm ortamı:** Intel Xeon 2.10 GHz, 4 çekirdek, 15.7 GB RAM, Linux 6.18, Node v22.22.2; sunucu, 100 bot ve test koşucusu AYNI süreçte ve aynı makinede (yerel pg 16, `fsync=off`; üretim donanımında diskli fsync commit'i yavaşlatır). Makine ayrıca başka geliştirme işleriyle paylaşıldı: sayılar bu yüzden dalgalıdır (aynı yapılandırmanın tekrarlarında p95 1.6-2.1 sn arası). Sentetik harita + sentetik-50 parsel (mülk kipi), 100 bot (95'inin `katil` komutu başarılı oldu), 24 tur, 1326 komut, hiç protokol hatası yok (reddedilen komutlar oyun kuralı gereği: kaynak yetersiz vb.).

| Yapılandırma | komut/sn | uçtan uca p50 / p95 | sunucu commit p95 | CPU (çekirdek, bot dahil / hariç) | RSS tepe | olay döngüsü en büyük sapma |
| --- | --- | --- | --- | --- | --- | --- |
| dosya, görüntü 6 sa, abone açık (varsayılan) | 93 | 440 ms / 1589 ms | 1411 ms | 0.75 / 0.49 | 280 MB | 1454 ms |
| dosya, görüntü seyrek, abone açık | 200 | 252 ms / 720 ms | 591 ms | 1.24 / - | 258 MB | 646 ms |
| dosya, görüntü seyrek, abone kapalı | 172 | 373 ms / 869 ms | 742 ms | 0.94 / 0.60 | 243 MB | 817 ms |
| pg, görüntü 1 sa, abone açık | 105 | 259 ms / 971 ms | 783 ms | 0.88 / 0.63 | 299 MB | 894 ms |
| pg, görüntü 6 sa, abone açık (varsayılan; 2 koşu) | 73-77 | 540-702 ms / 1645-2067 ms | 1408-1809 ms | 0.65-0.68 / 0.45 | 326-331 MB | 1426-1682 ms |
| pg, görüntü seyrek, abone açık | 95 | 463 ms / 1854 ms | 1572 ms | 0.71 / 0.47 | 275 MB | 1673 ms |

Yorum: sunucu komut başına CPU'su düşüktür (bot kararı hariç 0.45-0.63 çekirdek, tek iş parçacığı); gecikme CPU doygunluğundan değil olay döngüsü duraklamalarından gelir (büyük görüntü serileştirme ~15-300 ms, 100 bağlantıya kare yayını ve sıkıştırılmış zamandaki bot patlamaları). Kabaca kural: p95 komut gecikmesi < 2 sn, RSS < 350 MB, 100 eşzamanlı oyuncu tek çekirdekten azıyla taşınır; gerçek oyuncular sıkıştırılmış botlardan çok daha seyrek komut verir. Açık alfada izlenecek: `bolge_commit_gecikme_ms{quantile="0.95"}` ve görüntü süresi; görüntü boyutu büyüdükçe (1.1-1.4 MB bu dünyada) duraklama artar. Sonuçlar yalnız bu makine/yapılandırma içindir, farklı donanımda yeniden ölçün.

## Testler

`pnpm vitest run packages/sunucu packages/protokol` (~15 sn; kill -9 testi alt süreç başlatır; `mutlak-saat.test.ts` sahte duvar saatiyle koşar). Gerçek Postgres testleri (`pg.test.ts`, `yedek-geri-yukle.test.ts`) yalnız `BOLGE_PG_URL` tanımlıysa koşar. Yük testi (`yuk.test.ts`) yalnız `BOLGE_AGIR_TEST=1` ile koşar (bkz. "Alfa-0 işletim"). `BOLGE_TEST_DIZIN_TUT=1` kill -9 testinin veri dizinini inceleme için bırakır.
