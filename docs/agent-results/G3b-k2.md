# G3b (K2): arsa ızgarası manifestten yükleme, K3 hücre dizisine bağlama

Dal: `takim/k2/izgara-yukle`. Taban: `entegrasyon` 2819a43 (P3 sonrası: G5, i2-i3, davet, pg düzeltmesi, K3 hücre dizini içinde). Üç commit: yükleme iskeleti, hiyerarşi, K3'e bağlama.

## Ne yapıldı

- **Yükleme** (`sunucu/src/izgara/manifest.ts`): manifest okunur ve doğrulanır (biçim, kimliğe göre sıralı, yinelenen yok); her ilçenin dosyası sırayla denetlenir: dosya var mı, gz bayt sayısı, sha256 (GZ baytları üzerinde), gzip açılır ve `hamBayt`, gerçek `@bolge/veri` `bhiCoz` ile çözülür, çerçeve manifestle aynı mı, `izgaraSay` ile içerde/uygun hücre sayıları aynı mı. Uyuşmazlık/eksik dosya: açılış okunur `IzgaraHatasi` ile durur (sessizce eksik dünya kurulmaz). Varsayılan bağımlılıklar artık gerçek `bhiCoz` + `izgaraSay` (önceki TODO ve çözücü iskeleti kalktı; yükleme denetimleri arayüz arkasında test edilebilir kalıyor).
- **Hiyerarşi** (`--hiyerarsi`, vars. `<kök>/hiyerarsi.json`): il, bölge, ilçe ve il adları `hiyerarsi.json`'dan; elle il→bölge eşlemesi YOK. İlçe hiyerarşide yoksa, manifestteki il hiyerarşiyle uyuşmuyorsa ya da bölge haritada yoksa açılış durur. Çekirdeğin `parselIzgaraHatalari` denetimi de açılışta koşar.
- **Çekirdek bağlama**: `izgarayiVeriyeBagla(veri, girdi)` → `CekirdekVeriPaketi.parselIzgara` (`ParselIzgaraGirdisi`); `--izgara-manifest` ile `--parsel`/`--parsel-dosya` birlikte verilemez. `hazir`'dan önce `{"olay":"izgara","ilce":N,"hucre":M}` satırı.
- **K3 getter tablosu (§3)**: tek karşılığı sunucu/protokol tarafında `protokol/src/kare.ts:272-273`'ti: `ayrilmisListeHesapla` artık doğrudan `mk.dizin.ayrilmisListe(ilce)` (önbellekli; ilçe tanımının `hucreler` dizisi AÇILMAZ). Duck-typing arayüzü (`AyrilmisListeKaynagi`) kaldırıldı. Sunucu ve istemci kodunda başka `ilceler.get(id).hucreler` kullanımı yoktu (K3'ün tablosuyla uyumlu).
- **`HucreDiziniBuyukHatasi` komut sınırında**: `hucreDiziniBuyukMu` ad denetimi yerine `instanceof` (`@bolge/cekirdek`); aynı adlı yabancı sınıf tanınmaz (testle). Komut REDDEDİLİR (başarısız sonuç), dünya değişmez, yazar durmaz, günlükte yerinde, yeniden oynatmada aynı sonuç (G3b ilk teslimindeki davranış aynen).

## Kanıtlar (testler)

- `izgara-dunya.test.ts`: aynı ızgaralardan manifestle (gerçek çözücü) ve JSON fikstürüyle kurulan iki dünya: aynı ilk `durumOzeti`, aynı komut sonuçları (`oyuncu_katil` ilçeli, `parsel_al` ayrılmış hücre), aynı son `durumOzeti`, AYNI KARE çıktısı (`ilgiKaresiCikar`: herkese ve oyuncuya; ayrılmış liste ve kamu listesi dahil; `satilmisHucre` > 0, ayrılmış liste > 0 asserted). Kare hesabı ilçe `hucreler` getter'ı patlatılmış dünyada çalışır.
- `izgara-gercek.test.ts`: depodaki GERÇEK manifest, ÜÇ ilçe (Gemlik, Gebze, Körfez; Gebze `ornek/` yolundan, 508 bin hücre): tüm yükleme denetimleri gerçek çözücüyle geçer, hiyerarşi ve `gercekVeriyiYukle` ile üç ilçeli dünya kurulur, kare dizinden hesaplanır (yurt araması koşulmaz). Kapı süresi etkisi: test ~5 sn (yük ortalaması ~12'de; Gebze'nin yüklenmesi ve dünya kurulumu dahil), yani Gebze'yi manifest denetimiyle sınırlamaya gerek kalmadı.
- Yol güvenliği (`izgara-manifest.test.ts`): manifest yolları köke görelidir; mutlak yol, sürücü harfi, UNC ve `..` parçası biçim aşamasında VE yüklemede (çözülen yol köke göre) reddedilir; `izgara/` ve `ornek/` alt dizinleri serbesttir.
- `izgara-cli.test.ts` (gerçek süreç): `--izgara-manifest` + `--hiyerarsi` ile açılış (`izgara` olayı, hücre sayısı), ws ile ilçeli katılım ve kare (`katilimIlcesi`), hiyerarşide olmayan ilçe açılışı durdurur; manifest/dosya/sha256/bayt hataları (önceki).
- `izgara-manifest.test.ts` (15), `izgara-hata.test.ts` (4: gerçek sınıf `instanceof`, yabancı aynı adlı sınıf reddi, günlük/yeniden oynatma/ws) geçti. Protokol: `kare-mulk` (10), `protokol` (15). `katil`, `mulk-goruntu`, `parsel-dosya` yeniden koşuldu (yeşil).
- tsc (sunucu + protokol paketleri, geçici tsconfig) ve eslint (`packages/sunucu`, `packages/protokol/src`) temiz. Tüm koşular `--minWorkers=1 --maxWorkers=1`, kapı koşarken (tam tsc ve dunya yok).

## Açılış süresi ve bellek (önce / sonra)

Betik: `packages/sunucu/scripts/izgara-acilis-olc.ts` (iki biçim, AYNI komut; `durumOzeti` ÇIKTISI aynı olmalı; yük ortalaması çıktıda). Bu makinede P3 kapısı koşarken ve yük ortalaması 12-15 iken koşturulmadı; ölçüm Operasyon'un O2 AĞIR penceresinde, ÜÇ ilçeyle (Gemlik, Gebze, Körfez) koşulacak (Kod lideri kararı; K2 koşmaz) ve sonuç bu tabloya eklenir. Manifest üç ilçeyi listeler; Gebze'nin yolu `ornek/gebze-hucreler.bhi.gz`'dir (yollar `odbl/` köküne göredir, istemcideki `derle.ts` ile aynı kural) ve yükleyici onu çözer. (Geliştirme sırasında `izgara/` dizinindeki iki dosyaya bakıp manifestte yalnız iki ilçe sanıldı; test üçünü de açıkça sınar.)

| ölçüt | önce (JSON fikstürü, aynı ızgaralardan) | sonra (manifest, BHI1 + kompakt dizin) |
| --- | --- | --- |
| manifest yükleme (gunzip + sha256 + çözme, 2 ilçe) | | |
| `Simulasyon.olustur` (CPU / duvar ms) | | |
| RSS ve heapUsed (gc sonrası) | | |
| tepe RSS | | |
| `durumOzeti` | | |

Komutlar:
```
node --expose-gc --max-old-space-size=6144 --import tsx packages/sunucu/scripts/izgara-acilis-olc.ts --bicim json
node --expose-gc --max-old-space-size=6144 --import tsx packages/sunucu/scripts/izgara-acilis-olc.ts --bicim izgara
```

## Notlar

- Hata kodları ve iletiler Türkçe ASCII (`izgara dosyasi yok: <ilce>`, `izgara sha256 uyusmuyor`, `ilce hiyerarsi dosyasinda yok`, ...). Yükleme okuma dışında yan etkisizdir.
- Teslim dalı yalnız benim commit'lerim: `git log`'da K3'ün commit'i YOKTUR (bu dal G5 zincirinin üstünde, K3'ten bağımsız yazılmış arayüze dayanır; K3 girince `bhiCoz`/`izgaraSay`/`parselIzgara` doğrudan bağlanır). K3 dalı girmeden testler kırmızıdır (`@bolge/veri` `bhiCoz` yok); bu bilinçli ve sıralamaya bağlıdır.
- Gebze ayrıca: `izgara-gercek` yalnız 3 ilçenin kimliklerini ve Gebze'nin > 500 bin hücre olduğunu da sınar.
- O3 için: `BOLGE_IZGARA_MANIFEST`/`BOLGE_HIYERARSI` deploy `.env.ornek`'e ve compose'a eklenmeli.
