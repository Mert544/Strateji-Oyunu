# Açılış kontrol listesi provası: Docker dışı adımlar (O3, 1 Ekim 2026)

Dal `takim/o3/acilis-prova`, taban `entegrasyon` (8064ded). Kod: sunucu kaynağı `d28447d` ile aynı (aradaki commit yalnız belge). Ortam: Postgres 16.13 (`/usr/lib/postgresql/16/bin`), Node 22.22.2, Linux, Docker CLI 29.3.1 ve compose v5.1.1 var, **Docker daemon yok**.

Küme: `/tmp/o3-pg` (postgres kullanıcısıyla, yalnız unix soketi, `fsync=off`), veritabanı `bolge`; sunucu `BOLGE_URETIM=1 BOLGE_DEPO=pg` ile, portlar 28787 (oyuncu) ve 29464 (metrik, `0.0.0.0` + token), dünya `ana` (sentetik harita, mülk kipi kapalı). Etkinlik: iki oyuncu katıldı, vergi ve tesis komutları ws ile gönderildi. İş bitince sunucular durduruldu, küme durduruldu, `/tmp/o3-pg` silindi, açık süreç kalmadı. Yük testi (adım 9) ve Docker'a özgü adımlar (1, konteyner komutları) koşulmadı.

## Sonuç tablosu

| Adım | Komut (yerel eşdeğer) | Sonuç |
|---|---|---|
| ön koşul NTP | `timedatectl show -p NTPSynchronized` | Koşulamadı: ortamda systemd yok. Gerçek makinede koşulacak. |
| 4 statik | `docker compose -f deploy/docker-compose.yml --env-file deploy/.env.ornek config` | `yapi ok`; sırsız çağrı `PG_SIFRE gerekli (deploy/.env)` hatası verdi. Geçti. |
| 2 sağlık ve hazır | `curl -si :28787/saglik`, `/hazir` | İkisi de 200, `{"durum":"ok","seq":0,"simZamaniMs":78646569}`. Geçti. Yetişirken 503 gözlenemedi (aşağıda). |
| 3 metrik | `curl :29464/metrik` tokensiz; Bearer ile; POST; yanlış token; bilinmeyen yol; `:28787/metrik` | 401; 200 (`bolge_olumcul 0`, `bolge_yetisiyor 0`, `bolge_seq 0`, `bolge_bagli_oyuncu 0`); POST 405; yanlış token 401; bilinmeyen yol 404; ana portta `/metrik` 404. Geçti. Sapma: yeni dünyada `seq` 0 (README "seq > 0" diyordu, düzeltildi); `ss` yok (README'ye `lsof` alternatifi eklendi). Port denetimi: 28787 yalnız 127.0.0.1, metrik 0.0.0.0 (konteyner eşdeğeri), 5432 TCP dinleyen yok. |
| 4 üretim kipi reddi | `BOLGE_URETIM=1 ...` sırsız; `degistir...` sır; kısa sır; `BOLGE_ELLE_SAAT=1`; örnek metrik token'ı; metrik `0.0.0.0` tokensiz; `.env.ornek` değerleri | Hepsi çıkış kodu 1, beklenen iletiler (olay `olumcul`). Geçti. Not: iletide yığın izi (mutlak yol) var. |
| 7 şema sürümü | `psql -tAc "SELECT surum, ad FROM sunucu_sema ORDER BY surum"` | `1\|baslangic`, `2\|goc-profil`, `3\|defter`. Geçti (G5'ten sonra 4 olacak). |
| 10 SIGTERM | pid'e `kill -TERM`, çıkışı bekle | Çıkış kodu 0, 255 ms - 2,1 sn; son satır `{"olay":"kapandi","sinyal":"SIGTERM","seq":N,...}`; yeniden açılışta `kalanKayit 0`, `goruntuSeq = seq`. Geçti. |
| 5 yedek ve geri yükleme | `deploy/yedek.sh`, `deploy/geri-yukle.sh --olustur`, ikinci yükleme, bozuk `.sha256`; iki sunucu | Yedek 34.260 bayt, sha256 yazıldı, özet `dunya=ana son_seq=4 goruntu=3`, geri yüklenen DB aynı özet. Dolu hedef reddedildi (kod 1), bozuk sha reddedildi (kod 1). Geri yüklenen ve canlı DB'den açılan sunucuların `kurtarma.seq=4`, `simZamani=78687922`, `durumOzeti=07655202aa4d191c`, `goruntuSeq=4` değerleri AYNI. Geçti. |
| 6 göç | `bolge_prova` kopyası; içeriğe sona `titanyum` (+ kimlik listesi + pazar parametreleri); `BOLGE_GOC=1` | `kurtarma.goc = {yenidenIndekslendi: true, eskiKuralSurumu: k1-78e0..., yeniKuralSurumu: k1-3f6f..., yalnizEkle: true, eklenen: {mallar: ["titanyum"]}, eklenenSayisi: 1, yedek: "pg:snapshot_yedek:ana:goc-k1-78e0...", ihlalSayisi: 0}`; `snapshot_yedek` satırı oluştu; bayraksız ikinci açılışta `goc: null`. **Sapma 1:** README `yenidenIndekslendi: false` bekliyordu; yeni kimlik eklenince `true` (yalnız parametre değişiminde false). Düzeltildi. |
| 6 geri dönüş | `--yedekten-don goc-k1-78e0...`; eski içerikle bayraksız açılış | `yedektenDon` çıkış kodu 0, doğru özet (`07655202aa4d191c`); yok etiket: kod 1 `goc yedegi yok`. **Sapma 2 (hata, K2):** göç açılışı ve ikinci açılış normal kapatıldığı için yeni-kural görüntüleri daha geç `sim_t`'de; `yedektenDon` yedeği en yeni yapamadı ve eski içerikle açılış `kural surumu uyusmuyor` ile reddedildi. Yeni-kural görüntülerini silince (hiç komut kabul edilmemişti: `max(seq)=4`) eski içerikle açılış `durumOzeti=07655202aa4d191c` verdi. Geçici çözüm README'ye yazıldı. |
| 8 epoch | yeni dünya `ep2` + `BOLGE_DUNYA_EPOCH=2026-09-29T21:00:00Z`; gece yarısı olmayan epoch; var olan dünyada farklı epoch | `dunyaEpochMs=1790715600000`, `/saglik simZamaniMs` = şimdi - epoch (fark < 0,5 sn); gece yarısı olmayan epoch `dunyaEpochMs bir Turkiye gece yarisi olmali (UTC+3)` ile reddedildi (kod 1); var olan `ana` dünyada env'deki epoch yok sayıldı (`1790802000000`). Geçti. |
| 8 kapalıyken yetişme | `ana` sunucusunu durdur, 127 sn bekle, başlat | `kurtarma.simZamani=78826143` (kapanış), tek `{"olay":"yetisti","adim":0,...}` satırı (93 ms), `/saglik` `simZamaniMs` ≈ şimdi - epoch (fark 40 ms), `/hazir` 200, metrikte `bolge_yetisiyor 0`. Geçti. **Sapma 3:** README `yetisme` satırları ve yetişirken `/hazir` 503 bekliyordu; 1 sim-saatten kısa kapalılıkta `yetisme` satırı yok, 21,8 saatlik ilk açılış yetişmesi 21 adımda 98 ms sürdü; 503 elle gözlenemez. Düzeltildi. |
| 10 kill -9 | iki komut turu sonrası pid'e `kill -9`, yeniden başlat | `kurtarma.seq 6` (öncesi `max(seq)=6`, geri gitmedi), `goruntuSeq 0`, `kalanKayit 6`, `kalanBasarisiz 0`, uyarı yok. Geçti. (Aynı sim anında özet eşitliği `test/kurtarma-sureci.test.ts` kapsamında; mutlak saatte iki açılışın özeti farklı `t`'dedir.) |
| 10 pg düşmesi | sunucu açıkken `pg_ctl -m immediate stop`; pg'yi başlat, sunucuyu yeniden aç | **Sapma 4 (K2):** süreç çıkış kodu 1 ile çöktü: `Error: Connection terminated unexpectedly` işlenmeyen `error` olayı (havuzun boştaki bağlantısı dinlenmiyor); `olumcul` olayı yazılmadı, `/saglik` 503 görülmedi. Kurtarma temiz: pg dönünce `seq 8`, `goruntuSeq 8`, `kalanKayit 0`. Davranış fail-stop'a eşdeğer ama günlük satırı yok; README güncellendi. |
| 9 yük | `packages/sunucu/scripts/yuk.sh kademeli pg 3` | Koşulmadı (ayrı AĞIR satırı gerekir). |

## Listede düzeltilenler (packages/sunucu/README.md)

- Adım 3: yeni dünyada `seq >= 0`; `ss` yoksa `lsof`.
- Adım 4: yerel eşdeğer komutu ve her ret için gerçek ileti.
- Adım 5: yerel `yedek.sh` / `geri-yukle.sh` yolu, doğrulanan çıktılar ve ret durumları.
- Adım 6: `yenidenIndekslendi` beklentisi, `yedek` alanının gerçek biçimi, yerel göç provasında içerik değişikliğinin gereği (kimlik listesi ve pazar parametreleri), geri dönüş uyarısı ve geçici çözüm; "Kural dönemi provası" 4. madde aynı uyarı.
- Adım 8: yetişme satırlarının ne zaman çıktığı, yetişirken 503'ün neden gözlenemediği, çok adımlı yetişmeyi görme yolu.
- Adım 10: pg düşmesinde gerçek davranış.
- Giriş: yerel prova notu ve Docker'ın durumu.

Dokunulmayanlar (G5 sırası, operasyon lideri kararı): giriş/kimlik bölümü ve "Ortam değişkenleri" listesi. Provada bu listede yanlış bulunmadı.

## K2'ye iletilecek bulgular

1. `postgresDeposu.yedektenDon` (`src/depo/postgres.ts`): yedek, `ORDER BY seq DESC, sim_t DESC` sıralamasında daha geç `sim_t`'li yeni-kural görüntülerinin altında kalıyor. Mutlak saatte göç açılışının normal kapanışı bu durumu üretir (testler `ElleSaat` kullandığından aynı `sim_t` ve görmüyor). Öneri: geri dönüşte, yedekle aynı `seq`'te olan ve yedekten sonra `sim_t`'li, farklı `kural_sur`'lu görüntüleri silmek (yalnız `max(log.seq)` yedeğin `seq`'ine eşitse); test `ElleSaat` ilerleterek.
2. `postgresDeposu` havuzu: `havuz.on("error", ...)` yok. pg düşünce boştaki bağlantı işlenmeyen olayla süreci çökertiyor; öneri: `error` olayını dinleyip `olumcul` olayına çevirmek ve `/saglik` 503'e düşürmek.
