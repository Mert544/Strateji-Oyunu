#!/usr/bin/env bash
# Postgres doğrulaması: geçici bir pg 16 kümesi açar, verilen uçta pg testlerini ve şema sürümü sorgusunu koşar,
# sonucu tek özet satırı ve JSON olarak yazar, kümeyi HER koşulda kapatıp siler.
#
#   deploy/pg-dogrula.sh <sha | worktree-yolu> [--taban <ref>] [--sema <N>] [--dosya <test>]...
#
#   <sha>            commit (ya da ref, örn. refs/kapi/<dal>). O ucun bir worktree'si (node_modules'lu) varsa o kullanılır;
#                    yoksa geçici ayrık worktree açılıp `pnpm install --frozen-lockfile --offline` koşulur (kapı koşarken
#                    kurulum istemiyorsan worktree yolu ver).
#   <worktree-yolu>  hazır, kurulu worktree: oradaki node_modules kullanılır, yeniden kurulum YOK.
#   --taban <ref>    "değişmiş test dosyaları" için karşılaştırma tabanı (varsayılan: entegrasyon).
#   --sema <N>       beklenen şema sürümü (varsayılan: packages/sunucu/sql/NNN-*.sql dosyalarının en büyük NNN'si).
#   --dosya <test>   ek test dosyası (tekrarlanabilir).
#
# Koşulan: packages/sunucu/test/pg.test.ts ve yedek-geri-yukle.test.ts, ayrıca taban...uç arasında DEĞİŞMİŞ ve BOLGE_PG_URL
# içeren test dosyaları (tam vitest koşulmaz). Kapı koşuyorsa vitest --minWorkers=1 --maxWorkers=1, değilse 2 (vitest 2.1.9 tek başına --maxWorkers=1 kabul etmez) (PG_DOGRULA_ISCI ile ezilir).
# Ortam: PG_BIN (varsayılan /usr/lib/postgresql/16/bin), KAPI_SP (varsayılan: entegrasyon worktree'sinin üst dizini),
#        PG_DOGRULA_TMP (küme kökü, varsayılan /tmp), PG_DOGRULA_ZAMAN_ASIMI_SN (vitest için, varsayılan 1200).
# Çıktı: stdout'a tek satır "PG GECTI|KIRIK sha=... test=gecen/toplam sema=bulunan/beklenen sure=Ns kirik=<adim|->";
#        ayrıntı KAPI_SP/takim/kapi-sonuclari/pg-<kisa sha>.json (günlükler pg-<kisa sha>/ altında).
# Çıkış kodu: 0 geçti, 1 kırık, 2 kullanım ya da ortam hatası.
# Kümeye yalnız unix soketiyle (TCP portu yok), fsync=off; dizin her koşuda benzersizdir. Linux/macOS (bash) içindir.
set -uo pipefail

KULLANIM() { sed -n '2,23p' "$0"; }
[ $# -ge 1 ] || { KULLANIM; exit 2; }
HEDEF="$1"; shift
TABAN="entegrasyon"; SEMA_BEKLENEN=""; EK_DOSYALAR=()
while [ $# -gt 0 ]; do
  case "$1" in
    --taban) TABAN="${2:?--taban deger ister}"; shift 2 ;;
    --sema) SEMA_BEKLENEN="${2:?--sema deger ister}"; shift 2 ;;
    --dosya) EK_DOSYALAR+=("${2:?--dosya deger ister}"); shift 2 ;;
    *) echo "bilinmeyen secenek: $1" >&2; KULLANIM; exit 2 ;;
  esac
done

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
for k in initdb pg_ctl createdb psql; do
  [ -x "$BIN/$k" ] || { echo "pg araci yok: $BIN/$k (PG_BIN ile verin)" >&2; exit 2; }
done
command -v node >/dev/null || { echo "node yok" >&2; exit 2; }
command -v pnpm >/dev/null || { echo "pnpm yok" >&2; exit 2; }

# --- ucu ve worktree'yi coz --------------------------------------------------------------------------------------------
ENTEG_DIZIN="$(git -C "$KOK" worktree list --porcelain | awk '/^worktree /{w=$2} /^branch refs\/heads\/entegrasyon$/{print w; exit}')"
SP="${KAPI_SP:-$( [ -n "$ENTEG_DIZIN" ] && dirname "$ENTEG_DIZIN" || echo "$KOK/..")}"
SONUC_DIZIN="$SP/takim/kapi-sonuclari"
mkdir -p "$SONUC_DIZIN" || { echo "sonuc dizini acilamadi: $SONUC_DIZIN" >&2; exit 2; }

GECICI_WT=""
if [ -d "$HEDEF" ]; then
  WT="$(cd "$HEDEF" && pwd)"
  SHA="$(git -C "$WT" rev-parse HEAD)" || { echo "git worktree degil: $HEDEF" >&2; exit 2; }
  KIRLI="$(git -C "$WT" status --porcelain | head -1)"
else
  SHA="$(git -C "$KOK" rev-parse --verify "$HEDEF^{commit}" 2>/dev/null)" || { echo "commit bulunamadi: $HEDEF" >&2; exit 2; }
  # Ana çalışma ağacı (listenin ilki) kullanılmaz: ona yazılmaz. Kurulu başka bir worktree aranır.
  WT="$(git -C "$KOK" worktree list --porcelain | awk -v s="$SHA" '/^worktree /{w=$2; n++} /^HEAD /{if($2==s && n>1) print w}' | while read -r w; do [ -d "$w/node_modules" ] && { echo "$w"; break; }; done)"
  KIRLI=""
fi
KISA="${SHA:0:7}"
SONUC_JSON="$SONUC_DIZIN/pg-$KISA.json"
GUNLUK_DIZIN="$SONUC_DIZIN/pg-$KISA"
rm -rf "$GUNLUK_DIZIN"; mkdir -p "$GUNLUK_DIZIN"

# --- temizlik: HER koşulda küme kapanır, dizin silinir, başlatılan süreçler pid ile kapatılır ----------------------------------
KUME=""; KOSU_PID=""; KUME_ACIK=0
temizle() {
  trap - EXIT INT TERM HUP
  if [ -n "$KOSU_PID" ] && kill -0 "$KOSU_PID" 2>/dev/null; then
    kill -TERM -- "-$KOSU_PID" 2>/dev/null || kill -TERM "$KOSU_PID" 2>/dev/null
    sleep 1
    kill -KILL -- "-$KOSU_PID" 2>/dev/null || kill -KILL "$KOSU_PID" 2>/dev/null
  fi
  if [ "$KUME_ACIK" = 1 ] && [ -n "$KUME" ]; then pg_calistir pg_ctl -D "$KUME/veri" -m immediate -w stop >/dev/null 2>&1; fi
  if [ -n "$KUME" ]; then rm -rf "$KUME"; fi
  if [ -n "$GECICI_WT" ]; then git -C "$KOK" worktree remove --force "$GECICI_WT" >/dev/null 2>&1; rm -rf "$GECICI_WT"; fi
}
trap temizle EXIT
trap 'exit 130' INT
trap 'exit 143' TERM HUP

# postgres kullanıcısıyla (root ise runuser/su; değilse doğrudan) çalıştır
pg_calistir() {
  local k="$1"; shift
  if [ "$(id -u)" = 0 ]; then runuser -u postgres -- "$BIN/$k" "$@"; else "$BIN/$k" "$@"; fi
}

T0=$(date +%s)
ADIMLAR_TSV="$GUNLUK_DIZIN/adimlar.tsv"; : > "$ADIMLAR_TSV"
adim_kaydet() { printf '%s\t%s\t%s\t%s\n' "$1" "$2" "$3" "$4" >> "$ADIMLAR_TSV"; }   # ad durum kod sure
KIRIK_ADIM="-"
TEST_TOPLAM=0; TEST_GECEN=0; TEST_KIRIK=0; TEST_ATLANAN=0; SEMA_BULUNAN="-"; TEST_DOSYALARI=()
NEDEN=""

bitir() {  # JSON + özet satırı yaz, çıkış kodunu belirle
  local sonuc="GECTI"; [ "$KIRIK_ADIM" = "-" ] || sonuc="KIRIK"
  local sure=$(( $(date +%s) - T0 ))
  local ozet="PG $sonuc sha=$KISA test=$TEST_GECEN/$TEST_TOPLAM sema=$SEMA_BULUNAN/${SEMA_BEKLENEN:-?} sure=${sure}s kirik=$KIRIK_ADIM"
  ADIMLAR_TSV="$ADIMLAR_TSV" SONUC="$sonuc" OZET="$ozet" SHA="$SHA" HEDEF="$HEDEF" TABAN="$TABAN" SURE="$sure" \
  TG="$TEST_GECEN" TT="$TEST_TOPLAM" TK="$TEST_KIRIK" TA="$TEST_ATLANAN" SB="$SEMA_BULUNAN" SX="${SEMA_BEKLENEN:-}" \
  KA="$KIRIK_ADIM" WTY="$WT" NEDEN="$NEDEN" KIRLI="${KIRLI:-}" DOSYALAR="${TEST_DOSYALARI[*]:-}" ISCI="${ISCI:-}" node -e '
    const fs = require("fs");
    const e = process.env;
    const adimlar = fs.readFileSync(e.ADIMLAR_TSV, "utf8").split("\n").filter(Boolean).map((l) => {
      const [ad, durum, kod, sure] = l.split("\t");
      return { ad, durum, kod: Number(kod), sure_sn: Number(sure) };
    });
    const j = {
      surum: 1, sonuc: e.SONUC, ozet: e.OZET, sha: e.SHA, hedef: e.HEDEF, worktree: e.WTY || null, taban: e.TABAN, kirli_agac: e.KIRLI !== "",
      sure_sn: Number(e.SURE), kirik_adim: e.KA === "-" ? null : e.KA, kirik_ileti: e.NEDEN || null,
      test: { gecen: Number(e.TG), toplam: Number(e.TT), kirik: Number(e.TK), atlanan: Number(e.TA), dosyalar: e.DOSYALAR ? e.DOSYALAR.split(" ") : [], isci: e.ISCI ? Number(e.ISCI) : null },
      sema: { bulunan: e.SB === "-" ? null : Number(e.SB), beklenen: e.SX === "" ? null : Number(e.SX) },
      adimlar,
    };
    fs.writeFileSync(process.argv[1], JSON.stringify(j, null, 2) + "\n");
  ' "$SONUC_JSON"
  echo "$ozet"
  [ "$sonuc" = "GECTI" ]
}
kirik() {  # adim, ileti
  KIRIK_ADIM="$1"; NEDEN="$2"
  bitir; exit 1
}

# --- worktree hazır değilse geçici kur -----------------------------------------------------------------------------------
if [ -z "$WT" ]; then
  GECICI_WT="$SP/wt-pgd-$KISA-$$"
  s=$(date +%s)
  if git -C "$KOK" worktree add --detach "$GECICI_WT" "$SHA" >"$GUNLUK_DIZIN/worktree.log" 2>&1 && (cd "$GECICI_WT" && CI=true pnpm install --frozen-lockfile --offline) >>"$GUNLUK_DIZIN/kurulum.log" 2>&1; then
    adim_kaydet kurulum gecti 0 $(( $(date +%s) - s ))
    WT="$GECICI_WT"
  else
    adim_kaydet kurulum kirik 1 $(( $(date +%s) - s ))
    kirik kurulum "gecici worktree ya da pnpm install --offline basarisiz (bkz. $GUNLUK_DIZIN/kurulum.log); kurulu worktree yolu verin"
  fi
fi
[ -x "$WT/node_modules/.bin/vitest" ] || { echo "node_modules/.bin/vitest yok: $WT (kurulu worktree gerekli)" >&2; exit 2; }

# --- test dosyaları ------------------------------------------------------------------------------------------------------
SABIT=("packages/sunucu/test/pg.test.ts" "packages/sunucu/test/yedek-geri-yukle.test.ts")
for f in "${SABIT[@]}"; do [ -f "$WT/$f" ] || { echo "test dosyasi yok: $f ($KISA)" >&2; exit 2; }; TEST_DOSYALARI+=("$f"); done
if git -C "$WT" rev-parse --verify "$TABAN^{commit}" >/dev/null 2>&1; then
  MB="$(git -C "$WT" merge-base "$TABAN" "$SHA" 2>/dev/null || true)"
  if [ -n "$MB" ]; then
    while IFS= read -r f; do
      [ -n "$f" ] && [ -f "$WT/$f" ] || continue
      grep -q "BOLGE_PG_URL" "$WT/$f" || continue
      case " ${TEST_DOSYALARI[*]} " in *" $f "*) ;; *) TEST_DOSYALARI+=("$f") ;; esac
    done < <(git -C "$WT" diff --name-only "$MB" "$SHA" -- 'packages/*/test/*.test.ts' 'packages/*/test/**/*.test.ts')
  fi
fi
for f in "${EK_DOSYALAR[@]:-}"; do [ -n "$f" ] && { [ -f "$WT/$f" ] || { echo "ek test dosyasi yok: $f" >&2; exit 2; }; TEST_DOSYALARI+=("$f"); }; done

if [ -z "$SEMA_BEKLENEN" ]; then
  SEMA_BEKLENEN="$(ls "$WT/packages/sunucu/sql" 2>/dev/null | sed -n 's/^\([0-9]\{3\}\)-.*\.sql$/\1/p' | sort -n | tail -1 | sed 's/^0*//')"
  [ -n "$SEMA_BEKLENEN" ] || { echo "sema sql dosyalari bulunamadi (packages/sunucu/sql)" >&2; exit 2; }
fi

# --- 1. geçici küme ------------------------------------------------------------------------------------------------------
s=$(date +%s)
KUME="$(mktemp -d "${PG_DOGRULA_TMP:-/tmp}/pg-dogrula-$KISA-XXXXXX")" || { echo "kume dizini acilamadi" >&2; exit 2; }
if [ "$(id -u)" = 0 ]; then chown postgres:postgres "$KUME" && chmod 755 "$KUME"; fi
mkdir -p "$KUME/soket" && { [ "$(id -u)" != 0 ] || chown postgres:postgres "$KUME/soket"; }
if pg_calistir initdb -D "$KUME/veri" -A trust -U bolge --no-locale -E UTF8 >"$GUNLUK_DIZIN/initdb.log" 2>&1 \
  && pg_calistir pg_ctl -D "$KUME/veri" -o "-c listen_addresses='' -c unix_socket_directories=$KUME/soket -c fsync=off" -l "$KUME/pg.log" -w start >"$GUNLUK_DIZIN/pg-baslat.log" 2>&1; then
  KUME_ACIK=1
  pg_calistir createdb -h "$KUME/soket" -U bolge bolge_test >>"$GUNLUK_DIZIN/pg-baslat.log" 2>&1 || { adim_kaydet kume kirik 1 $(( $(date +%s) - s )); kirik kume "createdb basarisiz"; }
  adim_kaydet kume gecti 0 $(( $(date +%s) - s ))
else
  KUME_ACIK=1   # yarım açılmış olabilir: temizle() kapatmayı dener
  cp "$KUME/pg.log" "$GUNLUK_DIZIN/pg.log" 2>/dev/null
  adim_kaydet kume kirik 1 $(( $(date +%s) - s ))
  kirik kume "pg kumesi acilamadi (bkz. $GUNLUK_DIZIN/initdb.log, pg-baslat.log)"
fi
export BOLGE_PG_URL="postgres://bolge@localhost/bolge_test?host=$KUME/soket"

# --- 2. vitest -----------------------------------------------------------------------------------------------------------
KILIT="$SP/takim/kapi.kilit"
KAPI_KOSUYOR=0
if [ -f "$KILIT" ]; then
  KP="$(grep -o '"pid":[0-9]*' "$KILIT" | cut -d: -f2)"
  [ -n "$KP" ] && kill -0 "$KP" 2>/dev/null && KAPI_KOSUYOR=1
fi
ISCI="${PG_DOGRULA_ISCI:-$([ "$KAPI_KOSUYOR" = 1 ] && echo 1 || echo 2)}"
VITEST_JSON="$GUNLUK_DIZIN/vitest.json"
s=$(date +%s)
cd "$WT" || exit 2
if command -v setsid >/dev/null; then
  CI=true setsid timeout "${PG_DOGRULA_ZAMAN_ASIMI_SN:-1200}" node_modules/.bin/vitest run --minWorkers=1 --maxWorkers="$ISCI" --reporter=json --outputFile="$VITEST_JSON" "${TEST_DOSYALARI[@]}" >"$GUNLUK_DIZIN/vitest.log" 2>&1 &
else
  CI=true timeout "${PG_DOGRULA_ZAMAN_ASIMI_SN:-1200}" node_modules/.bin/vitest run --minWorkers=1 --maxWorkers="$ISCI" --reporter=json --outputFile="$VITEST_JSON" "${TEST_DOSYALARI[@]}" >"$GUNLUK_DIZIN/vitest.log" 2>&1 &
fi
KOSU_PID=$!
wait "$KOSU_PID"; VK=$?
KOSU_PID=""
if [ -f "$VITEST_JSON" ]; then
  read -r TEST_TOPLAM TEST_GECEN TEST_KIRIK TEST_ATLANAN < <(VJ="$VITEST_JSON" KT="$GUNLUK_DIZIN/kirik-testler.txt" node -e '
    const fs = require("fs");
    const j = JSON.parse(fs.readFileSync(process.env.VJ, "utf8"));
    const kirik = [];
    for (const f of j.testResults ?? []) for (const t of f.assertionResults ?? []) if (t.status === "failed") kirik.push(`${String(f.name).split("/packages/").pop()} > ${t.fullName}`);
    fs.writeFileSync(process.env.KT, kirik.slice(0, 20).join(" | ") + "\n");
    console.log([j.numTotalTests ?? 0, j.numPassedTests ?? 0, j.numFailedTests ?? 0, (j.numPendingTests ?? 0) + (j.numTodoTests ?? 0)].join(" "));
  ')
  KIRIK_TESTLER="$(cat "$GUNLUK_DIZIN/kirik-testler.txt" 2>/dev/null | tr -d '\n')"
fi
S2=$(( $(date +%s) - s ))
if [ "$VK" != 0 ] || [ "$TEST_KIRIK" != 0 ] || [ "$TEST_TOPLAM" = 0 ]; then
  adim_kaydet vitest kirik "$VK" "$S2"
  ILETI="vitest cikis=$VK kirik=$TEST_KIRIK toplam=$TEST_TOPLAM"
  [ -n "${KIRIK_TESTLER:-}" ] && ILETI="$ILETI :: $KIRIK_TESTLER"
  [ "$VK" = 124 ] && ILETI="$ILETI (zaman asimi)"
  kirik vitest "$ILETI"
fi
# pg testleri BOLGE_PG_URL olmadan atlanır: hiçbiri çalışmadıysa (hepsi atlandı) başarı sayılmaz
if [ "$TEST_GECEN" = 0 ]; then adim_kaydet vitest kirik 0 "$S2"; kirik vitest "hicbir test kosmadi (hepsi atlandi)"; fi
adim_kaydet vitest gecti 0 "$S2"

# --- 3. şema sürümü ------------------------------------------------------------------------------------------------------
s=$(date +%s)
SEMA_BULUNAN="$("$BIN/psql" -h "$KUME/soket" -U bolge -d bolge_test -tAc "SELECT max(surum) FROM sunucu_sema" 2>"$GUNLUK_DIZIN/sema.log" | tr -d '[:space:]')"
[ -n "$SEMA_BULUNAN" ] || SEMA_BULUNAN="-"
if [ "$SEMA_BULUNAN" != "$SEMA_BEKLENEN" ]; then
  adim_kaydet sema kirik 1 $(( $(date +%s) - s ))
  kirik sema "sema surumu $SEMA_BULUNAN, beklenen $SEMA_BEKLENEN"
fi
adim_kaydet sema gecti 0 $(( $(date +%s) - s ))

bitir
exit $?
