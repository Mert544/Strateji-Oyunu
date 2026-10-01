# pg-saglamlik: pg bağlantı kopması ve göç sonrası yedekten dönüş (K2)

Dal: `takim/k2/pg-saglamlik`, taban `entegrasyon` (8064ded). Kaynak: O3 açılış provası (`docs/agent-results/acilis-prova-o3.md`, "K2'ye iletilecek bulgular" 1 ve 2). Yalnız bu iki hata ve testleri.

## Hata 1: pg havuzunda `error` dinleyicisi yoktu

Belirti: pg düşünce boştaki bağlantı "Connection terminated unexpectedly" ile kopuyor, işlenmeyen `error` olayı süreci kod 1 ile çökertiyordu; `olumcul` olayı yazılmıyor, `/saglik` 503'e düşmüyordu.

Yapılan (`src/depo/postgres.ts`, `src/depo/tipler.ts`, `src/yazar.ts`):
- `postgresDeposu`: havuza `error` dinleyicisi ve dünya kilidini tutan istemciye (`kilitBaglantisi`) `error` dinleyicisi eklendi. Kilit bağlantısı havuzdan alınıp tutulduğu için havuz `error`'ına DEĞİL, istemcinin kendi `error` olayına düşer; o da aynı çökmeye yol açıyordu ve kilit gidince tek yazar garantisi de gider. İkisi de `Depo.hataDinle(f)` (yeni, isteğe bağlı) ile yazara iletilir; dinleyici gelmeden önce oluşan hata dinleyici eklenince bir kez iletilir; depo kapatıldıktan sonraki hatalar yok sayılır.
- `DunyaYazari.ac`: `depo.hataDinle` dinlenir; hata gelince yazar ölümcül olur (`depo baglantisi koptu; yazar durdu: ...`): bekleyen komutlar reddedilir, yeni komut kabul edilmez, `olumculHata` dinleyicisi çağrılır (CLI: `olumcul` olayı + çıkış kodu 1, mevcut yol), `/saglik` 503 `durum:"olumcul"`, `bolge_olumcul 1`. Kapanış (`kapat`) sırasındaki ya da zaten ölümcülken gelen hatalar yok sayılır. `olumculHata(f)` yazar zaten ölümcülse (açılışta kopan bağlantı) dinleyiciyi hemen çağırır.
- Davranış README ile aynı: fail-stop. Eksik olan günlük satırı ve sağlık durumuydu. Yeniden bağlanma YOK (kapsam dışı).
- Bilinen sınır: bir sorgu SÜRERKEN kopan bağlantı hatayı o sorguya verir (zaten `ekle` vb. fırlatır ve yazar ölümcül olur); yalnız sorgular arasında tutulan bağlantılar olay yayar ve onlar dinleniyor (kilit bağlantısı). Havuzdan kısa süre alınan istemciler (`ekle` içinde `BEGIN`/`COMMIT` arası) sorgular arasında bağlantı kopmasında teorik olarak olay yayabilir; pencere çok dardır ve ilgili yol zaten hatayla ölümcül olur.
- Test için `PostgresSecenekleri.havuz` (yalnız testler: sahte havuz) eklendi.

Testler:
- `test/pg-hata.test.ts` (Postgres'siz, sahte havuz/istemci; 5 test, geçti): havuz `error`: süreç çökmez (`emit` fırlatmaz), `olumculHata` bir kez çağrılır, `/saglik` 503, `bolge_olumcul 1`, komut reddedilir, ikinci hata tekrar bildirmez, kapanış kontrollüdür (`kapat` takılmaz, havuz kapanır); kilit istemcisi `error`: aynı yol; yazar kurulmadan önce gelen hata kaybolmaz (yazar kurulunca ölümcül, `olumculHata` eklenince hemen bildirim); kapanıştan sonraki hata yok sayılır; bellek/dosya depoları etkilenmez.
- `test/pg.test.ts` "postgres: baglanti kopmasi (fail-stop)" (gerçek pg, `BOLGE_PG_URL` ile; BU MAKİNEDE KOŞULMADI, O3 koşacak): ayrı bir veritabanı açılır, yazar + sunucu kurulur, `pg_terminate_backend` ile bütün bağlantılar kesilir; yazar ölümcül olur, `/saglik` 503, `bolge_olumcul 1`; dinleyici olmasaydı vitest "Unhandled Error" ile dosyayı kırardı.

## Hata 2: göçten sonra `--yedekten-don`

Neden: mutlak saatte göç açılışının normal kapanışı, yedekle AYNI seq'te ama DAHA GEÇ `sim_t`'li yeni-kural görüntüsü bırakır; `sonuncu()` `ORDER BY seq DESC, sim_t DESC, ...` seçtiğinden yedeğin (daha erken `sim_t`) üstünde kalırdı; eski içerikle açılış "kural surumu uyusmuyor" ile reddediliyordu. Mevcut testler `ElleSaat` (0'dan) kullandığı için kapanış görüntüsü aynı `sim_t`'ye düşüyor ve tuzağı görmüyordu.

Yapılan (`postgresDeposu.yedektenDon`): tek işlemde (BEGIN/COMMIT) yedek en yeni görüntü yapılır (önceki gibi) VE günlük yedeğin seq'inden ilerlemediyse (`max(log.seq) = yedek seq`), aynı seq'teki FARKLI kural sürümlü görüntüler `snapshot_yedek`'e (etiket `yedektenDon:<kural_sur>:<sim_t>`) taşınıp `snapshots`'tan çıkarılır. SİLİNMEZ: geri alınabilir (O3'ün önerisinden tek fark; veri kaybı yok). Sonuç tipi `GeriDonusSonucu` = görüntü + `temizlenenGoruntu` (taşınan sayı) + `gocSonrasiKomut` (bool). CLI `yedektenDon` olayı iki alanı da yazar; `gocSonrasiKomut` ise ayrıca `uyari` olayı yazar.

GÖÇTEN SONRA KOMUT KABUL EDİLDİYSE (`max(log.seq) > yedek seq`): yeni-kural görüntülerine DOKUNULMAZ (bugünkü davranış aynen): yedek yine "en yeni" yapılır ama `seq DESC` sıralamasında daha ileri seq'li yeni-kural görüntüsü üstte kalır ve eski içerikle açılış yine reddedilir. Bu durum geri dönüşün zaten geçersiz olduğu durumdur (README: "yalnız yeni kural sürümüyle hiç komut kabul edilmediyse geçerlidir"); CLI uyarı yazar. Testle sabitlendi.

Testler (`test/pg.test.ts`, "postgres: icerik gocu" bloğu; gerçek pg, BU MAKİNEDE KOŞULMADI, O3 koşacak):
- "geri donus, gocten sonra DAHA GEC sim_t'li kapanis goruntusu varken de calisir": eski dünya → göç açılışı → `ElleSaat` göçten sonra +6 sim-saat ilerletilir → normal kapanış (tuzak kurulduğu doğrulanır: en yeni görüntü yeni kural ve `sim_t > e.t`) → eski içerikle açılış reddedilir → `yedektenDon` → eski içerikle açılış `durumOzeti` yedekle aynı, `snapshots`'ta bu seq'te yalnız eski kural, taşınanlar `snapshot_yedek`'te.
- "gocten sonra KOMUT kabul edildiyse yedektenDon yeni-kural goruntulerine DOKUNMAZ": `gocSonrasiKomut: true`, `temizlenenGoruntu: 0`, yeni-kural görüntü sayısı değişmez, eski içerikle açılış reddedilir.
- Mevcut "geri donus" ve CLI testleri aynen geçmeli (CLI çıktısına yalnız alan eklendi, `toMatchObject`).

## Dosya deposunda aynı tuzak (bakıldı; kod değişikliği YOK)

Dosya deposunda `--yedekten-don` yoktur; geri dönüş README'de elle (`.yedek` dosyasını `<ad>.goruntu` üzerine kopyalamak). Aynı tuzak orada da VAR: görüntü dosya adı `<seq>-<simZamani>.goruntu` ve `sonuncu()` adı sıralar; göç görüntüsü eski dosyanın üzerine (aynı ad), kapanış görüntüsü ise daha geç `sim_t`'li YENİ bir dosyaya yazılır; yedeği kopyalasak da daha geç adlı yeni-kural dosyası sıralamada üstte kalır. Elle prosedüre "aynı seq'li, daha geç adlı `.goruntu` dosyalarını da kaldırın (yalnız göçten sonra hiç komut kabul edilmediyse)" eklenmeli. Kod eklemedim (kapsam pg); gerekirse küçük bir `--yedekten-don` dosya karşılığı ayrı iş olur.

## Doğrulama

- `npx vitest run` hedefli (tek işçi, kapı koşarken): `pg-hata` 5, `depolar`, `icerik-goc` 12, `metrik` 11, `basarisiz-gunluk` 3: geçti; `pg.test.ts` ve `yedek-geri-yukle.test.ts` BOLGE_PG_URL olmadığı için atlanır (yeni pg testleri dahil).
- `tsc --noEmit` (kök) ve `eslint packages/sunucu`: temiz. Postgres hiç açılmadı.

## O3 için

- README'deki geçici çözüm notları (göç sonrası yeni-kural görüntülerini elle silme) KALDIRILABİLİR: `--yedekten-don` artık bunu yapıyor (göçten sonra komut kabul edilmediyse). Komut kabul edildiyse geçici çözüm de, geri dönüş de geçerli değildir.
- README adım 6 çıktısı: `yedektenDon` olayında yeni alanlar `temizlenenGoruntu`, `gocSonrasiKomut`.
- README adım 10 (pg düşmesi): artık süreç işlenmemiş olayla çökmez; `olumcul` olayı (`depo baglantisi koptu; yazar durdu: ...`) yazılır ve çıkış kodu 1 verir; `/saglik` 503'ü süreç çıkana kadar (anlık) görülebilir.
- O3 PG satırında koşacaklar: `pg.test.ts` (yeni iki geri dönüş testi + "baglanti kopmasi"), `yedek-geri-yukle.test.ts`.
