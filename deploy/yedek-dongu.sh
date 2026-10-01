#!/usr/bin/env bash
# Konteyner döngüsü (compose `yedek` servisi): başlangıçta bir yedek, sonra her gün YEDEK_SAAT'te (UTC) deploy/yedek-dondur.sh.
# Hata olursa döngü sürer (bir sonraki gün yeniden dener); başarısız koşu `.son-basari` işaretini GÜNCELLEMEZ, healthcheck bunu görür.
# Ortam: YEDEK_PG_URL (parolasız URI), PGPASSWORD, YEDEK_HEDEF (varsayılan /yedekler), YEDEK_SAKLA (7), YEDEK_SAAT ("SS:DD" UTC, varsayılan 00:30
# = 03:30 Türkiye saati), YEDEK_BASLANGICTA (1: başlangıçta da yedek al; 0 kapalı).
set -uo pipefail
KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
HEDEF="${YEDEK_HEDEF:-/yedekler}"
SAAT="${YEDEK_SAAT:-00:30}"
: "${YEDEK_PG_URL:?YEDEK_PG_URL gerekli}"
case "$SAAT" in [0-2][0-9]:[0-5][0-9]) ;; *) echo "YEDEK_SAAT SS:DD olmali: $SAAT" >&2; exit 2 ;; esac

kos() { bash "$KOK/yedek-dondur.sh" "$YEDEK_PG_URL" "$HEDEF" --sakla "${YEDEK_SAKLA:-7}" || echo "yedek HATA (kod $?); bir sonraki zamanlamada yeniden denenecek" >&2; }
[ "${YEDEK_BASLANGICTA:-1}" = 1 ] && kos
while true; do
  simdi=$(date -u +%s)
  sonraki=$(date -u -d "today $SAAT" +%s)
  [ "$sonraki" -gt "$simdi" ] || sonraki=$(date -u -d "tomorrow $SAAT" +%s)
  bekle=$(( sonraki - simdi ))
  echo "sonraki yedek: $(date -u -d "@$sonraki" +%FT%TZ) ($bekle sn sonra)"
  sleep "$bekle"
  kos
done
