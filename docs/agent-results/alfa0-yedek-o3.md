# alfa0-yedek: düzenli yedek, döndürme ve zamanlama (O3)

Dal `takim/o3/alfa0-yedek`, taban `takim/o3/i3-prova` (45c9830; altında g5-deploy 8d81b7f, P3 2819a43). `deploy/` dosyaları: g5-deploy ve i3 ile aynı compose dosyasını değiştirir; P4/P5'te o dallardan sonra girer.

## Yapılan

- `deploy/yedek-dondur.sh <pg-uri> <hedef> [--sakla N]`: `yedek.sh` ile sha256'lı döküm, `sha256sum --check` ve `pg_restore --list` doğrulaması, YALNIZ ikisi geçerse en yeni N yedek kalacak biçimde döndürme (varsayılan 7). Yedek alınamaz ya da doğrulanamazsa hiçbir eski yedek silinmez, çıkış 1. Yalnız `bolge-<UTC>.dump(+.sha256)` silinir; yabancı dosyaya dokunulmaz. Başarıda `.son-basari`. Host cron örneği başlıkta.
- `deploy/yedek-dongu.sh`: konteyner döngüsü; başlangıçta bir yedek, sonra her gün `YEDEK_SAAT` (UTC, varsayılan 00:30 = 03:30 TRT); hata döngüyü öldürmez.
- `deploy/docker-compose.yml`: `yedek` servisi (postgres:16-bookworm imajı, pg_dump sürüm uyumlu); betikler salt okunur bağlanır (imaja girmez), yedekler `YEDEK_DIZIN` bağlama dizinine (varsayılan `deploy/yedekler`, git dışı); parola `PGPASSWORD`; healthcheck `.son-basari` < 26 saat.
- `.env.ornek`: `YEDEK_SAKLA`, `YEDEK_SAAT`, `YEDEK_DIZIN`. `.gitignore`: `yedekler/`.
- README: Yedek bölümüne düzenli yedek paragrafı; kontrol listesine adım 14 (yedek zamanlaması çalışıyor).

## Prova (yerel pg 16, unix soketi; gerçek çıktılar)

| Deneme | Sonuç |
|---|---|
| iki ardışık yedek, `--sakla 1` | ikincisinde "eski yedek silindi: ...203842Z.dump"; dizinde yalnız yeni çift |
| `--sakla 2`, iki yedek daha | 2 çift kalır (önce "saklanan 2, silinen 0", sonra "saklanan 2, silinen 1") |
| var olmayan veritabanı | "yedek HATA: yedek alinamadi; eski yedeklere dokunulmadi", kod 1; eski çiftler ve `notlar.txt` yerinde |
| `--sakla 0` | kod 2 |
| son yedekten `geri-yukle.sh --olustur` | `dunya=ana son_seq=1 goruntu=3`; açılan sunucu `durumOzeti c32a3d845c80911d seq 1` = kaynak (AYNI) |
| `yedek-dongu.sh` (zamanlanan saat 2 sn sonra, `--sakla 2`) | başlangıç yedeği, zamanlanan yedek, "sonraki yedek: 2026-10-02T20:39:00Z (86400 sn sonra)"; `.son-basari` güncel (healthcheck koşulu 1) |

Koşulamayan: `docker compose up` (daemon yok): `yedek` servisinin konteyner içi yolu, bağlama izinleri ve healthcheck ilk gerçek makinede denenecek. `docker compose config` geçti.

## Notlar

- Yedek yalnız pg'yi kapsar: `.env` (sırlar), davet listesi ve posta dosyaları ayrıca saklanmalı. Aynı diskteki yedek tam yedek sayılmaz: dizini başka diske ya da makineye kopyalamak operatör işidir (kılavuzda).
- Saklama sayıyla (en yeni 7), takvimle değil: bir gün atlanırsa 7 yedek 7 günden eskiyi kapsar.
