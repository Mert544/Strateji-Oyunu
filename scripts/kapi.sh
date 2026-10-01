#!/usr/bin/env bash
# Entegrasyon kapısı: tek komutla temiz worktree'de yeniden tabanla, doğrula, geçerse `entegrasyon`u ileri sar.
#
#   scripts/kapi.sh <dal> [--istemci] [--kuru] [--sakla]
#
# Asıl iş scripts/kapi.ts içindedir (kilit, süre aşımı ve süreç temizliği Windows'ta da çalışsın diye .ts'te).
# Çıktı: stdout'a tek özet satırı (KAPI GECTI|KIRIK ...), ayrıntı SP/takim/kapi-sonuclari/<dal>-<zaman>.json.
# Çıkış kodu: 0 geçti, 1 kırık, 2 kullanım ya da ortam hatası.
set -euo pipefail

KOK="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$KOK"

if [ -x node_modules/.bin/tsx ]; then
  exec node_modules/.bin/tsx scripts/kapi.ts "$@"
elif [ -x node_modules/.bin/tsx.cmd ]; then
  exec node_modules/.bin/tsx.cmd scripts/kapi.ts "$@"
else
  # tsx kurulu değil: Node'un yerleşik tür soyma desteği (22.18+; kapi.ts yalnız silinebilir söz dizimi kullanır)
  exec node --experimental-strip-types --no-warnings scripts/kapi.ts "$@"
fi
