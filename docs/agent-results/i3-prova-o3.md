# İ3 provası: test dünyası silme, sayım ve döküm (O3, gerçek pg ve dosya deposu)

Dal `takim/o3/i3-prova`, taban `takim/o3/g5-deploy` (8d81b7f; P4'te) ve onun altı `entegrasyon` 2819a43 (P3: i2-i3 dahil). Kod değişmedi; README kontrol listesine adım 13, `deploy/docker-compose.yml` ve `.env.ornek`'e `OTURUM_KAYDI` eklendi.

Düzenek: yerel Postgres 16 (`/tmp/o3-pg`, unix soketi), mülk kipi (`--harita mini --parsel`), e-posta kimliği (dosya postası), `BOLGE_OTURUM_KAYDI=1`. Dünyalar `ana` ve `test_o3`; üç hesap gerçek giriş akışıyla açıldı (istek, posta, onay, bilet, ws `katil`): B ortak (iki dünyada oynuyor), C yalnız `ana` (üretim hesabı), A yalnız `test_o3`.

## pg: tablo tablo (silmeden önce → sonra)

| Tablo | ana önce | test_o3 önce | ana sonra | test_o3 sonra |
|---|---|---|---|---|
| log | 2 | 2 | 2 | 0 |
| snapshots | 4 | 3 (silmede 4: kapanış görüntüsü eklendi) | 4 | 0 |
| snapshot_yedek | 0 | 0 | 0 | 0 |
| profil_capa | 2 | 2 | 2 | 0 |
| profil_kayit, profil_damga | 0 | 0 | 0 | 0 |
| oyun_oturum | 2 | 2 | 2 | 0 |
| oyun_oturum_gunluk | 0 | 0 | 0 | 0 |
| hesap (toplam) | 3 | | 2 (ortak, uretim) | A silindi |
| hesap_oyuncu | 3 | | 2 | |
| oturum | 4 | | 3 | A'nın oturumu silindi |
| giris_baglanti | 0 | | 0 | |

- Silme raporu: `{"olay":"testDunyaSilindi","dunya":"test_o3","depo":"pg","silinen":{"oturum":1,"giris_baglanti":0,"hesap_oyuncu":1,"hesap":1,"log":2,"snapshots":4,"snapshot_yedek":0,"profil_capa":2,"profil_kayit":0,"profil_damga":0,"oyun_oturum":2,"oyun_oturum_gunluk":0},"oyuncular":["o_h8mmw0w3","o_zhyj94zh"],"korunanHesap":1,"toplam":13}`. Ortak hesap B (başka dünyada da var) korundu, yalnız A silindi.
- Silme sonrası `--test-dunya-say test_o3 --oyuncular <test oyuncusu>`: bütün tablolar 0, `toplam: 0`.
- (b) İki dünyalı depoda yalnız test dünyası silindi: `ana`'nın son görüntü özeti silmeden önce `seq 2 t=84825361 ozet=3826a29882055077`, sonra AYNI; `ana` log/snapshots/oyun_oturum satır sayıları aynı; silmeden sonra `ana` açıldı: `hazir.kurtarma.durumOzeti = 3826a29882055077`, `seq 2`; üretim hesabı C yeniden girişte çalıştı (`yeniHesap: false`, `katil: true`).
- Silmeden önce `--test-dunya-say` (oyuncu listesiz): `toplam 9` (hesap tabloları oyuncu listesi verilmediği için 0; K2 notu: dünya silinince oyuncular günlükten türetilemez, liste silme raporundadır).

## İ1 döküm

`--dok <boş dizin>` (pg `ana`, kilitsiz): `{"olay":"dokuldu","kayit":2,"sonSeq":2,"goruntuSeq":2}`; dökülen dizinden `--depo dosya` ile açılan dünya `durumOzeti = 3826a29882055077`, `seq 2`: pg'deki son görüntü özetiyle AYNI. Bu, O2'nin İ1 çıkarma betiğinin pg yolunu doğrular.

## Ret testleri (hepsi çıkış kodu 1, `olumcul`)

`--test-dunya-sil ana`: "varsayilan/canli dunyadir ve hicbir onekle silinemez"; `prod_x` ve `te`: "test oneki ile baslamiyor (paylasilan dunya silinmez)"; `--uretim` onaysız ve yanlış onaylı: "dunya adi ikinci kez yazilmali: --evet-sil test_o3"; test dünyasının yazarı açıkken: "dunya acik, baska bir yazar calisiyor (advisory lock): test_o3". `--uretim` ile üretim sırları verilmeden komut kimlik kipi denetimini geçemez (K2 notu; sırlar verilerek denendi).

## Dosya deposu (dizin düzeyinde)

Kök altında iki dizin: `ana/` ve `test_dosya/` (her biri `gunluk.jsonl`, `hesap.jsonl`, `oyun-oturum.jsonl`, `profil.jsonl`, `goruntu/*` 3 dosya). `--depo dosya --dizin <kök>/test_dosya --test-dunya-say test_dosya`: `toplam 7`; `--test-dunya-sil ana`: reddedildi; `--test-dunya-sil test_dosya`: `{"silinen":{"gunluk.jsonl":1,"profil.jsonl":1,"hesap.jsonl":0,"oyun-oturum.jsonl":2,"goruntu":3},"toplam":7}`. Sonra `test_dosya/` altında dosya yok (boş dizin kalır; küçük not), `--test-dunya-say` `toplam 0`; `ana/` dizininin bütün dosyalarının sha256 özeti silmeden önce ve sonra aynı (`01f3592791a0e31d`).

## Notlar

- Silmede `snapshots` 3 yerine 4 silindi: test dünyası sunucusu silmeden önce bir kez daha açılıp kapatılmıştı (yazar kilidi reddi denemesi); beklenen davranış.
- Kuyruk satırı kapandı; küme durduruldu, `/tmp/o3-pg` silindi, açık süreç yok.
- README adım 13'teki `$D run --rm --no-deps sunucu ...` biçimi Docker daemon olmadığı için koşulamadı; komutların kendisi (CLI bayrakları ve çıktıları) yerelde yukarıdaki gibi denendi. İlk gerçek makinede adım 13 ilk kez Docker ile denenecek.
