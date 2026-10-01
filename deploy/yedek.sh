#!/usr/bin/env bash
# Postgres yedegi (mantiksal, tutarli): `pg_dump` tek bir tutarli goruntu alir (acik sunucuyla birlikte calisabilir; log + snapshots +
# profil tablolari ayni islemde). Cikti `pg_restore` ile `geri-yukle.sh` tarafindan yuklenir.
#
# Kullanim:  deploy/yedek.sh <kaynak-pg-uri> [cikti.dump]
#   <kaynak-pg-uri>  postgres://kullanici:sifre@sunucu:5432/veritabani  (libpq URI; unix soketi icin ?host=/yol)
#   cikti.dump       varsayilan: bolge-yedek-<UTC zaman>.dump ; yanina `.sha256` yazilir
# Ortam: PG_BIN = pg_dump/psql dizini (PATH'te degilse; ornek /usr/lib/postgresql/16/bin)
# Docker compose icinden:  docker compose -f deploy/docker-compose.yml exec -T pg pg_dump -U bolge -Fc --no-owner bolge > yedek.dump
set -euo pipefail

[ $# -ge 1 ] || { sed -n '2,11p' "$0"; exit 2; }
KAYNAK="$1"
CIKTI="${2:-bolge-yedek-$(date -u +%Y%m%dT%H%M%SZ).dump}"
BIN="${PG_BIN:+$PG_BIN/}"

"${BIN}pg_dump" --dbname="$KAYNAK" --format=custom --no-owner --file="$CIKTI"
( cd "$(dirname "$CIKTI")" && sha256sum "$(basename "$CIKTI")" > "$(basename "$CIKTI").sha256" )

echo "yedek: $CIKTI ($(wc -c < "$CIKTI") bayt)"
echo "sha256: $(cut -d' ' -f1 "$CIKTI.sha256")"
# Ozet: dunya basina son seq ve goruntu sayisi (geri yuklemeden sonra ayni cikmali).
"${BIN}psql" --dbname="$KAYNAK" --no-psqlrc --tuples-only --quiet -c \
  "SELECT 'dunya='||l.dunya||' son_seq='||l.s||' goruntu='||coalesce(g.n,0) FROM (SELECT dunya, max(seq) s FROM log GROUP BY dunya) l LEFT JOIN (SELECT dunya, count(*) n FROM snapshots GROUP BY dunya) g USING (dunya) ORDER BY 1" || true
