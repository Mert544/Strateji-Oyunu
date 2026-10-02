# Yedek tatbikatı: yerel pg 16, gerçek harita + ızgara dünyası (O3; A0-3 + A0-5 sayıları)

Dal `takim/o3/yedek-tatbikati`, taban 456a7d6, yalnız docs. Betik `SP/o3-prova/yedek-tatbikati.sh` (adım başı kapı kilidi / kapı / Playwright / vitest denetimli; ham günlük `SP/o3-prova/yedek-tatbikati.kosu1.log` ve `.log`). Liderin "başla" penceresinde (main 456a7d6), makine boştu (kapı kilidi yok), iki koşu, her biri ~20 sn. Kendi tam kurulumum (`pnpm install --frozen-lockfile --offline`).

**A0-3: yerel pg ile kanıtlandı; Docker daemon'lu makinede TEKRAR EDİLECEK.**

## Akış (her adım gerçek komut)
1. Yerel pg 16 kümesi (unix soketi, fsync=off), sunucu `BOLGE_HARITA=gercek` + `BOLGE_IZGARA_MANIFEST` (ilçe 3: Gemlik, Gebze, Körfez; hücre 1 368 376), `BOLGE_PARSEL=0`, botlar yok, `BOLGE_DEPO=pg`, geliştirme kimliği, **elle saat**.
2. Üç oyuncu ilçelere `katil` olur (Gemlik, Körfez, Gebze); yönetici `zamanIlerlet` ile dünyayı 5, 11, 30 ve 49,5 sim-saate ilerletir (6 sim-saatlik görüntüler); `ozet` ile `durumOzeti` kaydedilir.
3. `deploy/yedek.sh` (sunucu AÇIKKEN pg_dump, tutarlı) → `.dump` + `.sha256`.
4. Kaynak sunucu kapatılır; veritabanı `dropdb` ile SİLİNİR (kalan veritabanı listesi boş doğrulandı).
5. `deploy/geri-yukle.sh <dump> <uri> --olustur` (sha256 doğrulamalı).
6. Sunucu geri yüklenen veritabanından (aynı elle saat modu) açılır: `hazir` olayı, `curl /hazir`, `ozet`.

## Sonuçlar
| | Koşu 1 (3 oyuncu, kuyruk yok) | Koşu 2 (+ son görüntüden sonra 1 komut) |
|---|---|---|
| durumOzeti yedekten önce / geri yüklemeden sonra | `9940ce1f40bcc6c5` = AYNI (t 178 200 000, seq 3) | `f65d99cb6b71a702` = AYNI (t 179 400 000, seq 5) |
| `/hazir` | 200 `{"durum":"ok","seq":3,"simZamaniMs":178200000}` | 200 `{"durum":"ok","seq":5,"simZamaniMs":179400000}` |
| yedek süresi / boyutu | 111 ms / 113 443 bayt | 186 ms / 113 883 bayt |
| geri yükleme süresi | 139 ms | 152 ms |
| kaynak açılış (başlatma → `hazir` olayı) | 2 771 ms | 3 104 ms |
| geri yüklenen sunucu açılışı | 2 539 ms (`kurtarma.sureMs` 1 783) | 3 501 ms (`kurtarma.sureMs` 2 502) |
| RSS kaynak (tepe) | 280 MB (292) | 290 MB (290) |
| RSS geri yüklenen (tepe) | 224 MB (231) | 222 MB (229) |
| ilerletme (49,5 sim-saat, 4 adım) | 1 620 ms | 1 962 ms |
| `log` / `snapshots` satırı, veritabanı boyutu | 3 / 3, 8 MB | 5 / 3, 8 MB |
| `kurtarma` | `kalanKayit` 0 | `kalanKayit` 1, `kalanBasarisiz` 1 |

Yük (loadavg 1/5/15): koşu başında 1,54 3,04 4,21; makine paylaşımlıdır.

## Dürüst sınırlar (ölçümün gücü)
- **Dünya çok küçük:** yalnız 3-4 `katil` ve zaman ilerlemesi; ekonomik etkinlik, komut yok. Yedek 113 KB, süreler ve RSS **alt sınırdır**, canlı Alfa-0 yükünü TEMSİL ETMEZ. A0-5 sayıları O2'nin üç ilçe komut günlüğüyle oynatılınca yeniden ölçülmelidir (plan: `takim/o3/a0-5-plan`).
- **Kuyruk oynatma zayıf kanıt:** koşu 2'de son görüntüden sonra yalnız 1 komut var ve o komut REDDEDİLDİ (aynı oyuncunun ikinci `katil`'i; `kalanBasarisiz` 1). Geri yüklemede aynı komut aynı sonuçla (ret) oynatıldı ve özet aynı kaldı; ama kabul edilen kuyruk komutu bu tatbikatta yok. O yol `sunucu/test/yedek-geri-yukle.test.ts` ve A0-5 oynatmasıyla örtülür.
- **Elle saat:** mutlak saat/epoch kapalı (kapalıyken yetişme yok); `durumOzeti` karşılaştırması aynı sim zamanında yapıldı.

## Farklar ve DENENMEDİ
Geliştirme kimliği (compose'ta `--uretim` + e-posta + sırlar), elle saat (compose mutlak saat), port 18789, pg unix soketi (compose'ta Docker ağı), manifest yolu depo yolu. **DENENMEDİ:** Docker imajı/konteyner/compose (daemon yok), `yedek` servisinin zamanlaması, `--uretim`, gerçek zamanlı 24 saat, canlı Alfa-0 yükü, A0-5 24 sa gölge oynatma (ayrı iş). Süreç ve kümeler: iki koşu sonunda `ps` ile postgres/`cli.ts`/tatbikat süreci 0, geçici dizin yok.
