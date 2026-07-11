#!/usr/bin/env bash
#
# smoke-test.sh — valida em ~20s que o l2impure.com está inteiro.
# USO: bash scripts/smoke-test.sh
# Saída textual [OK]/[ERRO] — exit 0 se tudo passou, 1 se algo falhou.

set -uo pipefail
FAIL=0

check() { # check <descricao> <esperado> <obtido>
  local DESC="$1" WANT="$2" GOT="$3"
  if [ "$GOT" = "$WANT" ]; then
    echo "[OK]   $DESC ($GOT)"
  else
    echo "[ERRO] $DESC — esperado $WANT, veio $GOT"
    FAIL=1
  fi
}

echo "== Smoke test l2impure.com — $(date '+%F %T') =="

# 1. Páginas públicas → 200
for P in / /hibridos /roadmap /faq /regras /sobre /termos /privacidade /download /register /login; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "https://l2impure.com$P")
  check "GET $P" "200" "$CODE"
done

# 2. SEO / PWA
for P in /sitemap.xml /robots.txt /favicon.ico /icon.png /apple-icon.png /manifest.webmanifest /images/og.png; do
  CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "https://l2impure.com$P")
  check "GET $P" "200" "$CODE"
done

# 3. 404 customizada (rota inexistente → 404, não 500)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "https://l2impure.com/pagina-que-nao-existe-xyz")
check "GET /pagina-inexistente" "404" "$CODE"

# 4. HSTS presente
HSTS=$(curl -sI -m 15 https://l2impure.com/ | grep -ci "strict-transport-security")
check "HSTS header" "1" "$HSTS"

# 5. API pública de status (nunca pode dar 500 — nem com a VPS morta)
BODY=$(curl -s -m 15 -w "\n%{http_code}" "https://l2impure.com/api/status")
CODE=$(echo "$BODY" | tail -1); JSON=$(echo "$BODY" | head -1)
check "GET /api/status" "200" "$CODE"
echo "       payload: $JSON"
echo "$JSON" | grep -q '"online"' || { echo "[ERRO] /api/status sem campo online"; FAIL=1; }

# 6. Bridge viva (tunnel + VPS)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "https://bridge.l2impure.com/health")
check "GET bridge /health" "200" "$CODE"

# 7. Callbacks de voto respondem com semântica certa (sem 500)
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 15 "https://bridge.l2impure.com/vote/callback/hopzone")
check "vote hopzone sem params (espera 400)" "400" "$CODE"
CODE=$(curl -s -o /dev/null -w "%{http_code}" -m 15 -X POST -H "Content-Type: application/x-www-form-urlencoded" -d "" "https://bridge.l2impure.com/vote/callback/l2topco")
check "vote l2topco payload inválido (espera 400)" "400" "$CODE"

echo ""
if [ "$FAIL" = "0" ]; then
  echo "== RESULTADO: [OK] tudo no ar =="
else
  echo "== RESULTADO: [ERRO] tem coisa quebrada acima =="
fi
exit $FAIL
