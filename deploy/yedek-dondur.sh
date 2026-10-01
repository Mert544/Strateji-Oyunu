#!/usr/bin/env bash
# Düzenli yedek: bir yedek alır (deploy/yedek.sh, sha256'lı), doğrular, sonra eski yedekleri döndürür (en yeni N tane kalır).
#
# Kullanım:  deploy/yedek-dondur.sh <kaynak-pg-uri> <hedef-dizin> [--sakla N]
#   <kaynak-pg-uri>  postgres://kullanici@sunucu:5432/veritabani (libpq URI; parola PGPASSWORD ile verilebilir)
#   <hedef-dizin>    yedeklerin yazıldığı dizin (imaja/depoya girmez; compose'ta bağlama dizini). Dosyalar: bolge-<UTC>.dump + .sha256
#   --sakla N        saklanacak yedek sayısı (varsayılan 7; günde bir yedekle 7 gün). En az 1.
# Ortam: PG_BIN (pg_dump, pg_restore dizini; PATH'te değilse), YEDEK_SAKLA (--sakla yerine).
#
# Sıra: (1) yedek alınır, (2) sha256 ve `pg_restore --list` ile doğrulanır, (3) YALNIZ ikisi de geçtiyse eski yedekler silinir.
# Yedek alınamaz ya da doğrulanamazsa HİÇBİR eski yedek silinmez ve çıkış kodu 1 olur. Yalnız bu betiğin adlandırdığı
# `bolge-*.dump` (ve .sha256) dosyaları döndürülür; dizindeki başka dosyalara dokunulmaz. Başarıda `<hedef>/.son-basari` güncellenir.
# Host cron örneği (konteynersiz):  30 0 * * *  cd /opt/bolge && PG_BIN=/usr/lib/postgresql/16/bin deploy/yedek-dondur.sh "postgres://bolge@127.0.0.1:5432/bolge" /var/yedek/bolge --sakla 7 >> /var/log/bolge-yedek.log 2>&1
# (Parola: PGPASSWORD ya da ~/.pgpass; URI'ye parola yazmayın, süreç listesinde görünür.)
set -euo pipefail

[ $# -ge 2 ] || { sed -n '2,14p' "$0"; exit 2; }
KAYNAK="$1"; HEDEF="$2"; shift 2
SAKLA="${YEDEK_SAKLA:-7}"
while [ $# -gt 0 ]; do
  case "$1" in
    --sakla) SAKLA="${2:?--sakla sayi ister}"; shift 2 ;;
    *) echo "bilinmeyen secenek: $1" >&2; exit 2 ;;
  esac
done
case "$SAKLA" in ''|*[!0-9]*) echo "--sakla pozitif tamsayi olmali: $SAKLA" >&2; exit 2 ;; esac
[ "$SAKLA" -ge 1 ] || { echo "--sakla en az 1 olmali" >&2; exit 2; }

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BIN="${PG_BIN:+$PG_BIN/}"
mkdir -p "$HEDEF"
ZAMAN="$(date -u +%Y%m%dT%H%M%SZ)"
DOSYA="$HEDEF/bolge-$ZAMAN.dump"
# Ayni saniyede ikinci koşu: ad çakışmasın (zaman damgası sıralama anahtarıdır)
while [ -e "$DOSYA" ]; do sleep 1; ZAMAN="$(date -u +%Y%m%dT%H%M%SZ)"; DOSYA="$HEDEF/bolge-$ZAMAN.dump"; done

# (1) yedek (yedek.sh: pg_dump --format=custom + .sha256 + özet satırı)
if ! bash "$KOK/yedek.sh" "$KAYNAK" "$DOSYA"; then
  echo "yedek HATA: yedek alinamadi; eski yedeklere dokunulmadi" >&2
  rm -f "$DOSYA" "$DOSYA.sha256"
  exit 1
fi

# (2) dogrulama: sha256 ve dokumun okunabilirligi
if ! ( cd "$HEDEF" && sha256sum --check --quiet "$(basename "$DOSYA").sha256" ) || ! "${BIN}pg_restore" --list "$DOSYA" >/dev/null 2>&1; then
  echo "yedek HATA: dogrulama basarisiz ($DOSYA); eski yedeklere dokunulmadi" >&2
  mv -f "$DOSYA" "$DOSYA.bozuk" 2>/dev/null || true
  exit 1
fi
touch "$HEDEF/.son-basari"

# (3) donderme: en yeni SAKLA yedek kalir (ad = zaman damgasi, siralama guvenli)
SILINEN=0
mapfile -t HEPSI < <(ls -1 "$HEDEF" 2>/dev/null | grep -E '^bolge-[0-9]{8}T[0-9]{6}Z\.dump$' | sort)
if [ "${#HEPSI[@]}" -gt "$SAKLA" ]; then
  FAZLA=$(( ${#HEPSI[@]} - SAKLA ))
  for ((i = 0; i < FAZLA; i++)); do
    rm -f "$HEDEF/${HEPSI[$i]}" "$HEDEF/${HEPSI[$i]}.sha256"
    echo "eski yedek silindi: ${HEPSI[$i]}"
    SILINEN=$((SILINEN + 1))
  done
fi
echo "yedek tamam: $(basename "$DOSYA") (saklanan: $(( ${#HEPSI[@]} - SILINEN )), silinen: $SILINEN, sakla=$SAKLA)"
