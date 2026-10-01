#!/usr/bin/env bash
# Yedegi YENI bir veritabanina geri yukler (`pg_restore`). Sunucu sonra bu veritabanindan acilir: son goruntu + gunluk kuyrugu
# oynatilir; `durumOzeti` canli dunyanin ayni t'deki ozetiyle ayni olur (tatbikat: packages/sunucu/test/yedek-geri-yukle.test.ts).
#
# Kullanim:  deploy/geri-yukle.sh <yedek.dump> <hedef-pg-uri> [--olustur] [--uzerine-yaz]
#   --olustur      hedef veritabani yoksa olusturur (ayni sunucuda `postgres` veritabani uzerinden; yetkili kullanici gerekir)
#   --uzerine-yaz  hedef bos degilse de yukler (VARSAYILAN: dolu hedef reddedilir; `pg_restore --clean --if-exists` uygulanir)
# Ortam: PG_BIN = pg_restore/psql dizini (PATH'te degilse)
set -euo pipefail

[ $# -ge 2 ] || { sed -n '2,10p' "$0"; exit 2; }
DUMP="$1"
HEDEF="$2"
shift 2
OLUSTUR=0
UZERINE=0
for a in "$@"; do
  case "$a" in
    --olustur) OLUSTUR=1 ;;
    --uzerine-yaz) UZERINE=1 ;;
    *) echo "bilinmeyen secenek: $a" >&2; exit 2 ;;
  esac
done
BIN="${PG_BIN:+$PG_BIN/}"

# Butunluk: .sha256 yaninda varsa dogrulanir.
if [ -f "$DUMP.sha256" ]; then
  ( cd "$(dirname "$DUMP")" && sha256sum --check --quiet "$(basename "$DUMP").sha256" ) || { echo "yedek sha256 uyusmuyor: $DUMP" >&2; exit 1; }
fi

# URI'den veritabani adi ve yonetici (postgres) URI'si: sema://kullanici@sunucu/ad?sorgu
AD="$(printf '%s' "$HEDEF" | sed -E 's#^[a-zA-Z]+://[^/]*/([^?]*).*$#\1#')"
YONETICI="$(printf '%s' "$HEDEF" | sed -E 's#^([a-zA-Z]+://[^/]*/)[^?]*(.*)$#\1postgres\2#')"
[ -n "$AD" ] || { echo "hedef URI'de veritabani adi yok: $HEDEF" >&2; exit 2; }

if [ "$OLUSTUR" = 1 ]; then
  VAR="$("${BIN}psql" --dbname="$YONETICI" --no-psqlrc --tuples-only --quiet -c "SELECT 1 FROM pg_database WHERE datname = '$AD'")"
  if [ -n "${VAR//[[:space:]]/}" ]; then
    echo "hedef veritabani zaten var: $AD (--olustur yalniz yeni veritabani acar)" >&2
    exit 1
  fi
  "${BIN}psql" --dbname="$YONETICI" --no-psqlrc --quiet -c "CREATE DATABASE \"$AD\""
fi

# Dolu hedef reddedilir (kazara uzerine yazma yok).
TABLO_SAYISI="$("${BIN}psql" --dbname="$HEDEF" --no-psqlrc --tuples-only --quiet -c "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")"
if [ "${TABLO_SAYISI//[[:space:]]/}" != "0" ] && [ "$UZERINE" != 1 ]; then
  echo "hedef veritabani bos degil ($TABLO_SAYISI tablo): $AD (bilerek uzerine yazmak icin --uzerine-yaz)" >&2
  exit 1
fi

if [ "$UZERINE" = 1 ]; then
  "${BIN}pg_restore" --dbname="$HEDEF" --no-owner --exit-on-error --clean --if-exists "$DUMP"
else
  "${BIN}pg_restore" --dbname="$HEDEF" --no-owner --exit-on-error "$DUMP"
fi

echo "geri yuklendi: $AD"
"${BIN}psql" --dbname="$HEDEF" --no-psqlrc --tuples-only --quiet -c \
  "SELECT 'dunya='||l.dunya||' son_seq='||l.s||' goruntu='||coalesce(g.n,0) FROM (SELECT dunya, max(seq) s FROM log GROUP BY dunya) l LEFT JOIN (SELECT dunya, count(*) n FROM snapshots GROUP BY dunya) g USING (dunya) ORDER BY 1" || true
