#!/usr/bin/env bash
#
# rotate-secrets.sh — rotaciona os secrets vazados em 2026-04-25
# (CHECKLIST_JOS item 7 / PROJECT.md §18).
#
# USO (30 segundos, da raiz do repo):
#   bash scripts/rotate-secrets.sh
#
# O que faz:
#   1. Gera JWT_SECRET e JWT_REFRESH_SECRET novos (openssl rand -hex 64).
#   2. Se o Railway CLI estiver logado, aplica direto no serviço
#      (railway variables --set) e o Railway redeploya sozinho.
#   3. Senão, imprime os comandos prontos pra colar.
#
# O que NÃO dá pra automatizar (contas de terceiros — fazer na mão):
#   - SMTP_PASS: trocar a senha da caixa no painel da Hostinger
#     (Emails → conta usada no SMTP → alterar senha) e atualizar no Railway.
#   - RECAPTCHA_SECRET_KEY: https://www.google.com/recaptcha/admin
#     → criar chave nova → atualizar SECRET no Railway e SITE_KEY no
#     NEXT_PUBLIC_RECAPTCHA_SITE_KEY.
#
# ATENÇÃO: rotacionar JWT_SECRET desloga TODO MUNDO (tokens antigos
# ficam inválidos). Pré-launch isso é indolor — melhor agora que depois.

set -euo pipefail

echo "[1/3] Gerando secrets novos..."
NEW_JWT_SECRET=$(openssl rand -hex 64)
NEW_JWT_REFRESH_SECRET=$(openssl rand -hex 64)
echo "[OK] 2 secrets de 128 hex chars gerados."

echo ""
echo "[2/3] Tentando aplicar via Railway CLI..."
if command -v railway >/dev/null 2>&1 && railway whoami >/dev/null 2>&1; then
  railway variables \
    --set "JWT_SECRET=${NEW_JWT_SECRET}" \
    --set "JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}"
  echo "[OK] Aplicado no Railway — redeploy automático em andamento."
else
  echo "[AVISO] Railway CLI ausente ou deslogado. Aplique manualmente:"
  echo ""
  echo "  railway login"
  echo "  railway variables \\"
  echo "    --set \"JWT_SECRET=${NEW_JWT_SECRET}\" \\"
  echo "    --set \"JWT_REFRESH_SECRET=${NEW_JWT_REFRESH_SECRET}\""
  echo ""
  echo "  (ou cole os valores em Railway → serviço do site → Variables)"
fi

echo ""
echo "[3/3] Pendências manuais (contas de terceiros):"
echo "  [ ] SMTP_PASS      → painel Hostinger → Emails → alterar senha → Railway"
echo "  [ ] RECAPTCHA      → google.com/recaptcha/admin → chave nova → Railway"
echo ""
echo "[OK] Depois do redeploy, valide: curl -s https://l2impure.com/api/auth/me"
echo "     (deve responder 401 limpo, não 500)"
