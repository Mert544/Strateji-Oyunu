# deploy/pg-dogrula.sh (O3)

Dal `takim/o3/pg-dogrula`. Yeni dosyalar: `deploy/pg-dogrula.sh`, bu rapor; `packages/sunucu/README.md` "Postgres" bölümüne tek paragraf.

Kullanım: `deploy/pg-dogrula.sh <sha | worktree-yolu> [--taban <ref>] [--sema <N>] [--dosya <test>]...`

- Geçici pg 16 kümesi: `mktemp -d /tmp/pg-dogrula-<sha>-XXXXXX`, yalnız unix soketi, `fsync=off`, kullanıcı `bolge`, veritabanı `bolge_test`; root ise `runuser -u postgres`.
- Koşulan: `pg.test.ts`, `yedek-geri-yukle.test.ts` ve `taban...uç` arasında değişmiş, `BOLGE_PG_URL` içeren test dosyaları (+ `--dosya`). Tam vitest koşulmaz. Kapı kilidi canlıysa `--minWorkers=1 --maxWorkers=1`, değilse en çok 2 (vitest 2.1.9 tek başına `--maxWorkers=1` kabul etmez; `PG_DOGRULA_ISCI` ezer).
- Şema: koşudan sonra `SELECT max(surum) FROM sunucu_sema`, beklenen `sql/NNN-*.sql` en büyük NNN'si.
- `<sha>` verilirse o uçta kurulu bir worktree aranır (ana çalışma ağacı hariç); yoksa geçici ayrık worktree + `pnpm install --frozen-lockfile --offline` (~6 sn). Kapı koşarken kurulum istemiyorsan worktree yolu ver.
- Çıktı: stdout'a tek satır `PG GECTI|KIRIK sha=... test=gecen/toplam sema=bulunan/beklenen sure=Ns kirik=<adim|->`; JSON `SP/takim/kapi-sonuclari/pg-<kisa sha>.json` (sha, adımlar, test sayıları, şema, süre, worktree); günlükler `pg-<kisa sha>/`. Çıkış kodu 0/1/2.
- JSON `testler`: bütün testlerin adı, durumu ve süresi (ms). `--izle <regex>` eşleşen testleri `izlenen` olarak JSON'a ve özet satırının altına yazar (örn. belirli bir regresyon testinin geçtiğini ve süresini göstermek için).
- `trap`: EXIT, INT, TERM, HUP'ta vitest süreç grubu, pg kümesi (`pg_ctl -m immediate stop`), dizin ve geçici worktree temizlenir.

## Kabul

| Koşu | Sonuç |
|---|---|
| `8064ded` (kurulu worktree, kapı boşken 2 işçi) | `PG GECTI sha=8064ded test=13/13 sema=3/3 sure=21s kirik=-` |
| `774ad97` (geçici worktree + offline kurulum) | `PG GECTI sha=774ad97 test=13/13 sema=3/3 sure=18s kirik=-` |
| kasıtlı kırık pg testi (kirli worktree) | `PG KIRIK sha=125c988 test=13/14 sema=-/3 sure=29s kirik=vitest`; ileti kırılan testin adını taşır |
| koşu sırasında SIGTERM | çıkış 143; küme dizini, pg ve vitest süreci kalmadı |

Üç tam koşunun sonunda da `/tmp/pg-dogrula-*` ve açık pg süreci yok. Bu makinede (4 çekirdek, yük 7-14) tek koşu 18-30 sn; "dakikalar" hedefi tutuyor. Kapı koşarken tek işçi ayarı (`--minWorkers=1 --maxWorkers=1`) kod yolu olarak var ama kabul koşuları kapı boşken yapıldı.

Bilinen sınırlar: yalnız Linux/macOS (bash, `runuser`); kapı kilidi denetimi anlık görüntüdür; sha modunda başka bir ajanın kurulu worktree'sini yalnız okumak için kullanabilir (`node_modules/.vite` önbelleği dışında yazma yok); koşan worktree JSON'da `worktree` alanında görünür.
