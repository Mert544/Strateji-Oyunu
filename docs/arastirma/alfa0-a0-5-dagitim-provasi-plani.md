# A0-5 kural dönemi dağıtım provası ve 24 sa gölge yeniden oynatma: plan (O3)

> **Durum.** Yalnız PLAN; hiçbir şey koşulmadı. **Ar-Ge yanıtları işlendi (§8):** gölge tanımı doğrulandı (docs/11:580), komut kaynağı O2'nin üç ilçe günlüğü, sapma eşikleri kural olarak netleştirildi, `kural_surumu_gec` komutsuz. Kaynak: A3 kalan kanıt tablosu (`alfa0-kalan-kanit.md`, A0-5 satırı), `docs/04` A0-5 satırı, README "Kural dönemi provası" ve "İçerik göçü". Ölçülmüş sayılar ayrı işaretlidir; geri kalanı **tahmin** ya da **ölçülecek**. "Gölge yeniden oynatma" tanımı Ar-Ge tarafından doğrulandı (docs/11:580: yedekten kopya, aynı 24 sa akış, saat başı `durumOzeti`); canlıyla PARALEL gölge Alfa-0 kapsamı DIŞINDADIR.

## 1. Ne kanıtlanacak

A0-5 = "kural dönemi dağıtım provası (24 sa gölge yeniden oynatma, sapma raporu)". Tanım: canlı dünyanın bir **yedeğinden** KOPYA (gölge) açılır, canlıyla **aynı 24 sim-saatlik komut akışı** gölgede yeniden oynatılır, her sim-saat başı `durumOzeti` karşılaştırılır; fark listesi = sapma raporu. İki kip:

- **K-A, aynı içerik (determinizm):** gölge canlıyla aynı imaj ve içerikle açılır. Sapma **0** bir determinizm KURALIDIR (sahip eşiği değil): tek fark bile HATA. (Yeniden oynatma kuralı: aynı günlük, aynı özet.) Bu, dönem sınırından önce "yedek + yeniden oynatma güvenilir" kanıtıdır.
- **K-B, yeni içerik göçü:** gölge yeni kural sürümüyle `BOLGE_GOC=1` açılır (yalnız sona ekleme), sonra aynı akış oynatılır. Beklenen sapma YALNIZ yeni kimliklerin dokunduğu alanlarda olabilir ve önceden LİSTELENİR; listede olmayan her sapma = göç hatası. `ihlalSayisi` 0. Göç raporu (`kurtarma.goc`: `eklenen`, `ihlalSayisi` 0, `yenidenIndekslendi`) ve geri dönüş (`--yedekten-don`) de bu kipte denenir.

**Baş lider kararı:** `kural_surumu_gec` komutu kodda YOK (A3, AÖ-16 "yapılacak") ve Alfa-0'da OLMADAN kanıtlanır. Yol: kapat → yedek → `BOLGE_GOC=1` → 24 sa gölge oynatma; K-A sapma 0. Komut Alfa-1'e kalır. **Kapalı 20 kişilik testte elle dönem geçişi kabul edilebilir; Alfa-1 öncesi komut zorunludur.**

## 2. Ne koşar

| Parça | İçerik |
|---|---|
| Canlı düğüm | gerçek harita (`gercek`) + arsa ızgarası (Gemlik, Körfez, Gebze; `ilce=3`), pg 16, `--uretim`, e-posta kimliği; sunucu botları KULLANILAMAZ (`--botlar` ızgarayla birlikte olmaz) |
| Komut akışı | **kayıt oynatma**: O2'nin üç ilçe koşusunun komut günlüğü; bot yok. O2 günlüğü gelmeden Aşama 1 geçici olarak elle yazılmış kısa betikle koşabilir, ama **kanıt O2 günlüğüyle sayılır** (elle betik yalnız betik denemesidir). Günlük biçimi eşleştirmesini Operasyon lideri yapar; O3'ün ihtiyaçları §8'dedir |
| Saat | K-A/K-B ana ölçüm **elle saat ile hızlandırılmış** 24 sim-saat; ayrıca daemon'lu makinede **gerçek zaman** 24 sa (`--hiz 1`) |
| Gölge düğüm | yedekten (`deploy/yedek.sh` → `geri-yukle.sh --olustur`) ayrı veritabanı; ayrı port; canlıya yazmaz |
| Karşılaştırma | her sim-saat başı `ozet` (`durumOzeti`, `seq`, `t`) iki düğümden; fark tablosu = sapma raporu |
| Dağıtım parçaları | imaj derleme, compose, `caddy`, healthcheck, `yedek` servisi, Caddy provası (adım 16) |

## 3. Nerede (bu makine ve daemon'lu makine)

Bu makine: 4 çekirdek, 16 GB RAM (~13 GB boş), disk ~15 GB boş (`df`), **Docker daemon YOK**, `caddy` yok, dış ağa kısıtlı proxy; konteyner 22:26'da bir kez yeniden başladı (süreçler ölür). Bu yüzden:

- **Bu makinede yapılabilir (Aşama 1):** Docker'sız yerel pg 16 + sunucu `--uretim` (e-posta kipi, sırlar) + gerçek harita + ızgara; yedek, silme, geri yükleme, açılış; **hızlandırılmış** 24 sim-saat gölge yeniden oynatma K-A ve K-B (dakikalar, aşağıda); göç ve `--yedekten-don`. Yerel yedek tatbikatı (ayrı iş, A0-3) bunun alt kümesidir ve sayı verir.
- **Bu makinede YAPILAMAZ:** imaj derleme ve konteynerde açılış, compose bağımlılık/healthcheck sırası, `yedek` servisinin zamanlaması, Caddy/TLS/ters vekil (adım 16), `--uretim`'in compose ortamıyla birebir hâli, gerçek 24 saat duvar saati koşusu (konteyner yeniden başlaması sürecin ortasında öldürür; ölçüm anlamsız olur) ve çok oturumlu alan testi. Bunlar **Aşama 2: daemon'lu makine** (baş liderin ya da operatörün) ve raporda "DENENMEDİ" kalır.

## 4. Ne kadar sürer, kaynak

Ölçülmüş: açılış 3,2 s, RSS ~0,25-0,3 GB (gerçek harita + ızgara, bellek deposu, yetişme 30 adım 0,6 s; `izgara-varsayilan-o3.md`). **Ölçülecek** (yerel yedek tatbikatı çıktısı, aynı komut akışıyla): hızlandırılmış 49,5 sim-saatin duvar süresi, `yedek`/`geri yükleme` süresi ve boyutu, pg boyutu. Bunlar gelince aşağıdaki tahminler güncellenir.

| Aşama | Süre (tahmin) | CPU | RAM | Disk |
|---|---|---|---|---|
| 1 K-A hızlandırılmış 24 sim-saat (canlı + gölge) | dakikalar-onlarca dakika (tatbikat sayısıyla netleşir) | 2 düğüm x ~1 çekirdek + pg ~0,2 | 2 x ~0,35 GB + pg | yedek + pg birkaç yüz MB (tahmin) |
| 1 K-B göç + oynatma + geri dönüş | K-A kadar + göç/yedek süreleri | aynı | aynı | + `snapshot_yedek` kopyaları |
| 2 gerçek zaman 24 sa (daemon'lu) | 24 sa duvar saati | ~1 çekirdek sürekli | ~0,5 GB büyüme izlenir | pg günlük büyümesi izlenir |
| 2 imaj/compose/Caddy provası | ~1 saat | kısa tepe | imaj ~1 GB (tahmin) | imaj + katmanlar birkaç GB |

CPU yükü tek çekirdeğe yakın (Node tek iş parçacığı + görüntü işçisi), makine paylaşımlı; bu yüzden pencere kapı ve ölçüm koşusundan ayrı olmalı (§6).

## 5. Nasıl izlenir, başarı ölçütü

İzleme: iki düğümde de `/hazir` ve `/saglik` 200, `olumcul` olayı yok, `bolge_olumcul` 0; RSS ve tepe (`/proc/<pid>/status`); sim-saat başı `ozet` karşılaştırması betiği; pg boyutu ve `log`/`snapshots` satır sayısı; her adımın süresi. Betikler kapı kilidi, `kapi.ts`, Playwright/vitest süreci varken **başlamaz** ve adım başı yeniden denetler (yerel yedek tatbikatı betiğindeki gibi).

Başarı ölçütü (öneri, sahibi onaylar):
1. **K-A sapma = 0** (determinizm kuralı, eşik değil): 24 sim-saatin her saatinde canlı ve gölge `durumOzeti` ve `seq` aynı; tek fark hata.
2. **K-B**: göç raporu `ihlalSayisi` 0, `eklenen` beklenen kimlikler; sapma tablosunda YALNIZ yeni kimliklerin dokunduğu (önceden listelenmiş) alanlar olabilir; listede olmayan her fark = göç hatası = KIRIK.
3. Geri dönüş: `--yedekten-don` sonrası eski içerikle açılış, `durumOzeti` yedekle aynı (yalnız yeni kuralla komut kabul edilmediyse geçerli).
4. Geri yükleme: yedekten açılış `/hazir` 200 ve `durumOzeti` aynı (kural); süre ve boyut kayda geçer; süre eşiği SAHİBİN (öneri: geri yükleme + açılış < 5 dk).
5. Bellek: RSS tepe ve büyüme kayda geçer; eşik SAHİBİN (öneri: tepe < ~1 GB, sınırsız artış yok; tatbikat verisiyle güncellenir).
6. Aşama 2 için ek: imaj derlenir, `$D up` sonrası tüm servisler healthy, Caddy kontrol listesi adım 16 geçer, 24 sa gerçek zamanda `olumcul` yok.

## 6. Pencere önerisi

Ağır parça (Aşama 1, hızlandırılmış K-A/K-B, ~30-60 dk): **P14 push'undan sonra, O2'nin üç ilçe koşusu BİTİP makinede kapı/Playwright/vitest yokken**; "başla" baş liderden. O2 koşusunun bittiği, kapı kilidinin ve `kapi.ts`/Playwright süreçlerinin olmadığı betikle denetlenir (kilit varsa başlamaz). Bu makinede iki düğüm + pg ~1 GB RAM ve 2-3 çekirdek kullanır: O2'nin koşusuyla aynı anda çalışmasın. Aşama 2 daemon'lu makinede, bu makineden bağımsız takvimle.

## 7. Sırası

1. Yerel yedek tatbikatı (A0-3, ayrı iş) sayıları verir; bu plan o sayılarla güncellenir.
2. K-A (aynı içerik, sapma 0). 3. K-B (yeni içerik göçü, dönem sınırı provası, geri dönüş). 4. Rapor: sapma tablosu, süreler, boyutlar, RSS.
5. Daemon'lu makinede Aşama 2 (A0-3 geri yükleme tekrarı + imaj/compose/Caddy + gerçek zaman 24 sa).

## 8. Ar-Ge yanıtları ve kalan kararlar

Karara bağlanan: (1) gölge tanımı §1'deki gibi (docs/11:580), canlıyla paralel gölge kapsam dışı; (2) komut kaynağı O2'nin üç ilçe koşusu günlüğü; (3) K-A sapma 0 kuraldır, K-B'de beklenmeyen her sapma göç hatasıdır, beklenenler yalnız yeni kimliklerin dokunduğu alanlar ve listelenir, `ihlalSayisi` 0; süre ve bellek eşikleri sahibin; (4) `kural_surumu_gec` komutsuz kanıtlanır, komut baş lider kapsam kararıdır; (5) Aşama 2 makinesi sahip kararıdır.

**O2 günlüğünden O3'ün ihtiyacı** (eşleştirmeyi Operasyon lideri yapar):
- Oynatılabilir komut günlüğü: sıra (`seq`), sim zamanı (`t`), oyuncu kimliği, `komut` nesnesi (çekirdek `Komut` biçimi), idempotans anahtarı ya da benzersiz anahtar; pg `log` tablosu (`dunya, seq, t, hesap, istemci, anahtar, komut jsonb, kural_sur, sema_sur`) ya da `--dok`'un dosya deposu biçimi olarak yüklenebilir, ya da sunucuya ws ile gönderilecek komut listesi.
- Dünya kimliği: tohum, harita (`gercek` + ızgara manifesti sha256 ve `hiyerarsi.json`), kural sürümü (içerik karması), dünya epoch'u; günlüğün ait olduğu başlangıç durumu (sıfırdan mı, bir görüntüden mi).
- Oyuncu kimlikleri ve ilçe eşlemesi (hangi oyuncu hangi ilçeye `katil`ır) ve oyuncu başına geliştirme token'ı gerekmiyorsa sistem yolu (`sistem` komutları) bilgisi.
- Süre: günlüğün kapsadığı sim-saat (24 sa gerekir; saat başı kontrol noktaları) ve kendi kaydettiği saat başı `durumOzeti` ya da son özet (karşılaştırma için; yoksa canlı koşu O3'te yeniden üretilir).
- Kişisel veri YOK (opak oyuncu kimliği, adres yok).

Kalan: süre ve bellek eşikleri (sahibin). Aşama 2 (daemon'lu makine): baş lider kararıyla SAHİP LİSTESİNDE (makine ve takvim sahipte).
