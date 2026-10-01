#!/usr/bin/env bash
# Tek komutla tekrarlanabilir yuk senaryosu (100 bot, gercek ws). Kullanim (depo kokunden, temiz calisma agacinda onerilir):
#   packages/sunucu/scripts/yuk.sh [patlama|kademeli] [dosya|bellek|pg] [tekrar]
# Ornekler:
#   packages/sunucu/scripts/yuk.sh kademeli            # 100 bot, tur basina 5 bot katilir, dosya deposu
#   packages/sunucu/scripts/yuk.sh patlama dosya 3     # mevcut patlama senaryosu, 3 tekrar
#   BOLGE_PG_URL=postgres://... packages/sunucu/scripts/yuk.sh kademeli pg
# Ortam (hepsi istege bagli): BOLGE_YUK_KADEME (5), BOLGE_YUK_BOT (100), BOLGE_YUK_ISINMA (4), BOLGE_YUK_GORUNTU_SAAT (6), BOLGE_YUK_ISCI=0,
#   BOLGE_YUK_HEDEF_ZORUNLU=1 (isinmis p95 > 300 ms ise basarisiz). Rapor: raporlar/yuk/yuk-<zaman>.json (git disi).
# Cikti: her kosu icin tek satir ozet (senaryo, depo, p95'ler, olay dongusu, yuk ortalamasi). Makine paylasimliysa yuk ortalamasina bakin.
set -uo pipefail
SENARYO="${1:-patlama}"
DEPO="${2:-dosya}"
TEKRAR="${3:-1}"
KOK="$(cd "$(dirname "$0")/../../.." && pwd)"
cd "$KOK"
mkdir -p raporlar/yuk
for i in $(seq 1 "$TEKRAR"); do
  once=$(ls raporlar/yuk/*.json 2>/dev/null | sort | tail -1)
  BOLGE_AGIR_TEST=1 BOLGE_YUK_SENARYO="$SENARYO" BOLGE_YUK_DEPO="$DEPO" pnpm -s vitest run packages/sunucu/test/yuk.test.ts > "/tmp/yuk-son.log" 2>&1
  kod=$?
  son=$(ls raporlar/yuk/*.json 2>/dev/null | sort | tail -1)
  if [ -z "$son" ] || [ "$son" = "$once" ]; then
    echo "kosu $i: RAPOR YOK (vitest kodu $kod); ayrinti: /tmp/yuk-son.log"; tail -30 /tmp/yuk-son.log; continue
  fi
  node -e '
    const R = require(process.argv[1]); const r = R.sonuc, y = R.yapilandirma, o = r.olayDongusu || {};
    const f = (x) => (x && x.p95Ms !== undefined ? `${x.p50Ms}/${x.p95Ms}` : "-");
    console.log([
      `kosu ${process.argv[2]}: ${y.senaryo} ${y.depo} bot=${y.bot} tur=${y.tur} komut=${r.komut} kod=${process.argv[3]}`,
      `tum p50/p95=${r.uctanUca.p50Ms}/${r.uctanUca.p95Ms}`,
      r.uctanUcaKatilimDonemi ? `katilim-donemi p50/p95=${f(r.uctanUcaKatilimDonemi)}` : null,
      `ilk-turlar p95=${r.uctanUcaIlkTurlar.p95Ms}`,
      `ISINMIS p50/p95=${f(r.uctanUcaIsinmaSonrasi)} (hedef <= ${r.hedefP95Ms}: ${r.hedefIsinmisTuttu ? "TUTTU" : "TUTMADI"})`,
      `commit p50/p95=${r.sunucuCommit.p50Ms}/${r.sunucuCommit.p95Ms}`,
      `dongu p50/p99/max=${o.p50Ms}/${o.p99Ms}/${o.maxMs}`, `cpu=${r.cpu.ortCekirdek}`, `yuk=${(r.yukOrtalamasi || 0).toFixed(1)}`,
    ].filter(Boolean).join(" | "));
  ' "$KOK/$son" "$i" "$kod"
done
