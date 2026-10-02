# Alfa-0 varsayılanı: gerçek harita + arsa ızgarası (O3)

Dal `takim/o3/izgara-varsayilan`, taban 2103af0. Dosyalar: `deploy/docker-compose.yml`, `deploy/.env.ornek`, `packages/sunucu/README.md` (kontrol listesi adım 1b, env tablosu notu), `docs/alfa0-isletim.md`. Sunucu koduna ve Dockerfile'a dokunulmadı.

- **Compose:** sunucu ortamına `BOLGE_IZGARA_MANIFEST: ${IZGARA_MANIFEST-/uygulama/packages/veri/haritalar/odbl/izgara/manifest.json}` (imajdaki `/uygulama` köküne göre mutlak yol; CMD çalışma dizini de `/uygulama`). `${VAR-varsayılan}` (iki nokta YOK): satır yazılmazsa açık, `IZGARA_MANIFEST=` BOŞ yazılırsa kapalı (CLI boş değeri "verilmedi" sayar). `.env.ornek`'te kapatma anahtarı bu.
- **Harita varsayılanı `sentetik`'ten `gercek`'e:** bulgu. Izgara ilçelerinin bölgesi haritada olmalı (`izgaraGirdisiKur`: "ilcenin bolgesi haritada yok"); Gemlik `guney_marmara`, Körfez ve Gebze `izmit` bölgesindedir ve ikisi de `gercek-karadeniz` haritasında vardır, sentetik/mini'de yoktur. Aksi hâlde manifestle açılış durur. `.env.ornek` `BOLGE_HARITA=gercek` oldu. Mevcut `.env`'sinde `sentetik` olan operatörün değiştirmesi gerekir (kılavuzda yazılı).
- **Kısıtlar** (cli.ts:340-358): `--izgara-manifest` ile `--parsel`/`--parsel-dosya` birlikte verilemez (compose'ta `BOLGE_PARSEL` varsayılanı 0; `.env.ornek`'te uyarı); sunucu botları (`BOLGE_BOTLAR`) izgarayla birlikte olmaz (compose'ta BOLGE_BOTLAR yok); `param.mulk` gerekir: `gercekVeriyiYukle` da sentetikle aynı `icerik/parametreler.json`'u yükler (yukle.ts:47, kaynak okumasıyla), orada `mulk` bloğu var; sınır dosyası `gercek-karadeniz-sinirlar.topo.json` da `packages/veri/haritalar`'dadır ve imaja girer.
- **Dockerfile.dockerignore:** `odbl/izgara` ve `odbl/ornek`'i dışarıda bırakmıyor. Desenler yalnız `**/node_modules`, `.git`, `.env*`, `**/*.log`, `raporlar`, `docs`, `istemci`, `izleyici`, `**/dist` ve istemci/veri-hatti/olcum/izleyici paketlerinin içi ile `packages/*/test`; `packages/veri/haritalar/**` bunların hiçbirine uymaz. Gebze ızgarası manifestte `ornek/gebze-hucreler.bhi.gz` yolundadır ve o da imaja girer. İlgili dosyalar git'te izlenir (gemlik/körfez BHI ve şeritleri, gebze BHI, `hiyerarsi.json`, `gercek-karadeniz.json`).
- **Kontrol listesi adım 1b + kılavuz:** açılışta günlükte `{"olay":"izgara","manifest":...,"ilce":3,"hucre":N}` görülmeli; görünmezse ya da `ilce` 3 değilse DUR. Olumsuz iletiler eşlendi (bölge, birlikte olmaz, sha256/bayt).
- **Statik doğrulama:** `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.ornek config` geçti; çözülmüş değerler `BOLGE_HARITA=gercek`, `BOLGE_IZGARA_MANIFEST=/uygulama/packages/veri/haritalar/odbl/izgara/manifest.json`, `BOLGE_PARSEL="0"`. Ayrıca `IZGARA_MANIFEST=` boşken `""` (kapalı), satır yokken varsayılan yol (açık).

**DENENMEDİ:** Docker daemon yok, imaj derlenmedi ve konteynerde açılış görülmedi; `gercek` harita + manifest + `param.mulk` birleşimiyle GERÇEK açılış da denenmedi (kapı sessizliği: pnpm install ve sunucu koşusu yapılmadı). Mevcut `izgara-cli.test.ts` CLI yolunu sentetik/test verisiyle örter. İlk gerçek doğrulama adım 1b'dir; açılış hatası çıkarsa ileti adımda eşlenmiştir. Bellek ve açılış süresi ölçülmedi (docs/10 G3 notundaki 1,15 GB JSON-fikstür yoluna aittir; BHI yolu için sayı yok).

## Kanıt: Docker'sız yerel düğüm açılışı (baş lider şartı 1)

Taban 4704944 (kod: 2103af0 üstü). Betik `SP/o3-prova/izgara-acilis.sh` (adım başı kilit denetimli; pencere kapı kilidi kalktıktan sonra, 03:42Z, P11 push'u sonrası). Kendi tam kurulumum (`pnpm install --frozen-lockfile --offline`, symlink yok). Tek açılış, sunucu pid ile kapatıldı, `ps` ile süreç kalmadığı doğrulandı.

**Compose'tan farklar (dürüst liste):** depo `BOLGE_DEPO=bellek` (compose'ta pg; pg ve kalıcılık bu ölçüme girmedi); kimlik geliştirme kipi (`BOLGE_GELISTIRME_SIRRI` verildi; compose'ta `--uretim` + e-posta + sırlar); `BOLGE_PORT=18788`; manifest yolu depo yolu (`<worktree>/packages/veri/haritalar/odbl/izgara/manifest.json`, compose'ta `/uygulama/...`); görüntü işçisi, metrik portu ve davet listesi yok/varsayılan. Aynı: `BOLGE_HARITA=gercek`, `BOLGE_PARSEL=0`, botlar yok, hız 1 (mutlak saat, epoch 2026-09-30T21:00Z).

**Sonuçlar:**
- `izgara` olayı: `{"olay":"izgara","manifest":".../odbl/izgara/manifest.json","ilce":3,"hucre":1368376}`. Olay ilçe adı yazmaz; manifestteki üç ilçe: `tr_16_gemlik (Gemlik)`, `tr_41_gebze (Gebze)`, `tr_41_korfez (Körfez)`. `olumcul` olayı 0.
- `hazir` olayı geldi: `kimlik` "gelistirme", `kurtarma.sureMs` 1895 (yeni dünya, seq 0, `durumOzeti` 4dc938013deee118, `yetisecekMs` 110540356), uyarı yok.
- `curl /hazir` -> **200**, gövde `{"durum":"ok","seq":0,"simZamaniMs":110540441}`. `curl /saglik` aynı gövde.
- **Açılış süresi** (süreç başlatma -> `hazir` olayı): **3211 ms**; `/hazir` 200: **3245 ms** (yetişme dahil: ilk 30 adımda 629 ms ile mutlak saate yetişti). Yük: loadavg 3,14 4,77 4,24 (4 çekirdek; paylaşımlı makine).
- **RSS:** `hazir` olayında 257 440 kB (~251 MiB), +5 sn sonra 303 136 kB (~296 MiB), tepe (VmHWM) 303 136 kB. docs/10 G3 notundaki 1,15 GB, JSON fikstür yoluna aittir; BHI ızgara yolunda bu ölçümde ~0,3 GB. Hücre sayısı 1 368 376 (üç ilçe).
- Kapatma: pid 2017 SIGTERM ile kapatıldı; sonrasında çalışan `cli.ts` süreci ve geçici dizin yok.

**Hâlâ DENENMEDİ:** Docker imajı ve konteynerde açılış (daemon yok), pg deposuyla açılış, `--uretim` kipi (bu açılış geliştirme kipiydi), uzun süre çalışma ve oyuncu yükü altında bellek. Üretim sırlarıyla gerçek açılış kontrol listesi adım 1b'dir.
