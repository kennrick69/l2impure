#!/usr/bin/env bash
#
# chaos-test.sh — valida como o site l2impure.com reage quando a VPS de
# jogo (76.13.170.153) some do mapa.
#
# COMO USAR (2 terminais):
#
#   Terminal 1 (este script, de qualquer máquina):
#     bash scripts/chaos-test.sh            # monitora por 120s (default)
#     bash scripts/chaos-test.sh 300        # monitora por 300s
#
#   Terminal 2 (SSH na VPS, pra simular a queda por ~60s):
#     # bloqueia a porta do tunnel/bridge (cloudflared continua de pé,
#     # mas a bridge para de responder — simula VPS travada)
#     sudo iptables -I INPUT -p tcp --dport 8080 -j DROP
#     sleep 60
#     sudo iptables -D INPUT -p tcp --dport 8080 -j DROP
#
#     # alternativa mais agressiva: derrubar a bridge inteira
#     pm2 stop l2impure-bridge && sleep 60 && pm2 start l2impure-bridge
#
# O QUE ESPERAR (comportamento correto):
#   - site/           -> [OK] 200 sempre (landing nao depende da bridge)
#   - api/status      -> [OK] 200 sempre; passa a "stale=true" quando o
#                        dado vem do snapshot de fallback (bridge fora)
#   - bridge/health   -> [ERRO] durante o bloqueio (esperado!)
#   - NUNCA deve aparecer 500/timeout de 30s+ no site
#
# Saida textual [OK]/[STALE]/[ERRO] — sem depender de cor ANSI.

DURATION="${1:-120}"
INTERVAL=3
SITE="https://l2impure.com/"
STATUS="https://l2impure.com/api/server/status"
BRIDGE="https://bridge.l2impure.com/health"

echo "== Chaos test: monitorando por ${DURATION}s (1 amostra a cada ${INTERVAL}s) =="
echo "== Agora derrube a bridge na VPS (ver instrucoes no cabecalho) =="
echo ""
printf "%-8s  %-28s  %-6s  %-8s  %s\n" "T+(s)" "ALVO" "HTTP" "LATENCIA" "OBS"

START=$(date +%s)
while true; do
  NOW=$(date +%s)
  ELAPSED=$((NOW - START))
  [ "$ELAPSED" -ge "$DURATION" ] && break

  # 1. Landing
  R=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 10 "$SITE" || echo "000 10.0")
  CODE=${R% *}; T=${R#* }
  TAG="[OK]"; [ "$CODE" != "200" ] && TAG="[ERRO]"
  printf "%-8s  %-28s  %-6s  %-8s  %s\n" "$ELAPSED" "site /" "$CODE" "${T}s" "$TAG"

  # 2. Status publico (o teste de verdade)
  BODY=$(curl -s --max-time 10 -w "\n%{http_code} %{time_total}" "$STATUS" || echo -e "\n000 10.0")
  META=$(echo "$BODY" | tail -1); JSON=$(echo "$BODY" | head -1)
  CODE=${META% *}; T=${META#* }
  STALE=$(echo "$JSON" | grep -o '"stale":[a-z]*' | cut -d: -f2)
  TAG="[OK]"
  [ "$CODE" != "200" ] && TAG="[ERRO]"
  [ "$STALE" = "true" ] && TAG="[STALE]"
  printf "%-8s  %-28s  %-6s  %-8s  %s %s\n" "$ELAPSED" "site /api/server/status" "$CODE" "${T}s" "$TAG" "$JSON"

  # 3. Bridge direto (referencia — DEVE falhar durante o bloqueio)
  R=$(curl -s -o /dev/null -w "%{http_code} %{time_total}" --max-time 10 "$BRIDGE" || echo "000 10.0")
  CODE=${R% *}; T=${R#* }
  TAG="[OK]"; [ "$CODE" != "200" ] && TAG="[ERRO] (esperado se bloqueada)"
  printf "%-8s  %-28s  %-6s  %-8s  %s\n" "$ELAPSED" "bridge /health" "$CODE" "${T}s" "$TAG"

  echo "---"
  sleep "$INTERVAL"
done

echo ""
echo "== Fim. Criterio de sucesso: =="
echo "   1. site / sempre [OK] 200"
echo "   2. /api/server/status sempre 200, virando [STALE] durante o bloqueio"
echo "   3. nenhuma latencia > 6s no site (timeout da bridge e 4s)"
