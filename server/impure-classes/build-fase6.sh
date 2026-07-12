#!/bin/bash
# Build & inject Fase Admin 6 classes into l2jserver.jar:
#   - custom/WelcomeMessageData        (welcome multi-line, novo)
#   - network/clientpackets/EnterWorld (patch welcome lines)
#   - data/manager/SevenSignsManager   (patch SevenSignsAlwaysActive)
# Mesmo pipeline do build-gmqueue.sh (precedente validado em produção).
set -e

JAR="/root/l2j-server/gameserver/libs/l2jserver.jar"
SRC_ROOT="/root/impure-classes/java"
BUILD_DIR="/tmp/l2j-fase6-build"

echo "=== Fase Admin 6 build (welcome + sevensigns) ==="
BACKUP="$JAR.backup-fase6-$(date +%Y%m%d_%H%M%S)"
cp "$JAR" "$BACKUP"
echo "Backup: $BACKUP"

rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR/classes"

SOURCES=(
  "$SRC_ROOT/net/sf/l2j/gameserver/custom/WelcomeMessageData.java"
  "$SRC_ROOT/net/sf/l2j/gameserver/network/clientpackets/EnterWorld.java"
  "$SRC_ROOT/net/sf/l2j/gameserver/data/manager/SevenSignsManager.java"
)

for s in "${SOURCES[@]}"; do
  if [ ! -f "$s" ]; then echo "ERRO: $s ausente"; exit 1; fi
done

echo "Compiling..."
javac --release 21 -encoding UTF-8 -cp "/root/l2j-server/gameserver/libs/*" \
  -d "$BUILD_DIR/classes" "${SOURCES[@]}" 2>&1 | tee /tmp/fase6-build.log
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "ERRO compilação. JAR intacto (nada injetado)."
  exit 1
fi
echo "Compile OK"

cd "$BUILD_DIR/classes"
# Injeta TODAS as classes geradas (inclui inner classes SevenSignsManager$*)
CLASSES=$(find . -name '*.class' | sed 's|^\./||')
for c in $CLASSES; do
  jar uf "$JAR" "$c"
  echo "  injected: $c"
done

echo ""
echo "=== Verify in JAR ==="
for c in $CLASSES; do
  jar tf "$JAR" | grep -qF "$c" && echo "  OK $c" || echo "  MISSING $c"
done

echo ""
echo "Build OK. Restart (SO com 0 players online):"
echo "  systemctl restart l2j-game"
echo "Rollback:"
echo "  cp $BACKUP $JAR && systemctl restart l2j-game"
