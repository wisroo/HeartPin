#!/bin/bash
# HeartPin Phase 0 데모 서버 러너 — 크래시 시 자동 재시작 (Ctrl+C로 종료)
VAULT="${HEARTPIN_VAULT:-/Volumes/Extreme SSD/여가/상우♥︎}"
cd "$(dirname "$0")/.."

if [ ! -d "$VAULT" ]; then
  echo "❌ 외장하드가 안 보여요: $VAULT"
  echo "   하드를 연결하거나, HEARTPIN_VAULT=/Volumes/<이름> ./scripts/demo.sh 로 실행하세요."
  exit 1
fi

# 기존 서버 정리 후 기동
pkill -f "HeartPin/server/index.js" 2>/dev/null && sleep 1

echo "♥ HeartPin 데모 서버 — 보관소: $VAULT"
while true; do
  HEARTPIN_VAULT="$VAULT" node server/index.js
  echo ""
  echo "⚠️  서버가 종료됐어요 — 2초 후 자동 재시작 (중단하려면 Ctrl+C)"
  sleep 2
done
