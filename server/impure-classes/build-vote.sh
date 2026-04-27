#!/bin/bash
# Build & inject Vote system classes into l2jserver.jar
set -e

JAR="/root/l2j-server/gameserver/libs/l2jserver.jar"
SRC_ROOT="/root/impure-classes/java"
BUILD_DIR="/tmp/l2j-vote-build"

echo "=== Vote system build ==="
cp "$JAR" "$JAR.backup-vote-$(date +%Y%m%d_%H%M%S)"

rm -rf "$BUILD_DIR" && mkdir -p "$BUILD_DIR/classes"
cd "$BUILD_DIR"
jar xf "$JAR"
echo "JAR extracted"

# Sources do vote system (incluindo as 2 classes do core que editamos)
SOURCES=(
  "$SRC_ROOT/net/sf/l2j/gameserver/model/vote/VoteManager.java"
  "$SRC_ROOT/net/sf/l2j/gameserver/handler/bypasshandlers/Vote.java"
  "$SRC_ROOT/net/sf/l2j/gameserver/handler/BypassHandler.java"
  "$SRC_ROOT/net/sf/l2j/gameserver/network/clientpackets/EnterWorld.java"
)

for s in "${SOURCES[@]}"; do
  if [ ! -f "$s" ]; then echo "ERRO: $s ausente"; exit 1; fi
done

# Compila com classpath = JAR atual (todas as deps)
echo "Compiling..."
javac --release 21 -cp "$JAR" -d "$BUILD_DIR/classes" "${SOURCES[@]}" 2>&1 | tee /tmp/vote-build.log
if [ ${PIPESTATUS[0]} -ne 0 ]; then
  echo "ERRO compilação. Restaurando backup."
  exit 1
fi
echo "Compile OK"

# Injeta no JAR
cd "$BUILD_DIR/classes"
INJECT=(
  "net/sf/l2j/gameserver/model/vote/VoteManager.class"
  "net/sf/l2j/gameserver/handler/bypasshandlers/Vote.class"
  "net/sf/l2j/gameserver/handler/BypassHandler.class"
  "net/sf/l2j/gameserver/handler/BypassHandler\$SingletonHolder.class"
  "net/sf/l2j/gameserver/network/clientpackets/EnterWorld.class"
)

for c in "${INJECT[@]}"; do
  if [ -f "$c" ]; then
    jar uf "$JAR" "$c"
    echo "  injected: $c"
  else
    echo "  skip (not built): $c"
  fi
done

# Verificação
echo ""
echo "=== Verify in JAR ==="
for c in "${INJECT[@]}"; do
  jar tf "$JAR" | grep -q "$c" && echo "  OK $c" || echo "  MISSING $c"
done

echo ""
echo "Build OK. Restart needed:"
echo "  systemctl restart l2j-game"
