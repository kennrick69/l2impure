-- Callbacks MMOTop / L2-Servera / GTop100 implementados na bridge
-- (2026-07-11, rodada FASE_ADMIN_2). Sites CONTINUAM inativos — JOs ativa
-- pelo painel depois de cadastrar o server em cada ranking e setar o secret
-- correspondente no /root/l2j-bridge/.env da VPS.

UPDATE "vote_sites" SET "notes" =
    'Callback IMPLEMENTADO na bridge (GET ?userid=<charId>&code=MD5(secret+userid)). Antes de ativar: cadastrar em mmotop.ru e setar MMOTOP_SECRET no .env da bridge (VPS) + pm2 restart. Ranking russo-cêntrico (baixa prioridade BR).'
  WHERE "slug" = 'mmotop';

UPDATE "vote_sites" SET "notes" =
    'Callback IMPLEMENTADO na bridge (GET ?userId=<charId>&hash=SHA256(secret+userId)). Antes de ativar: cadastrar em l2-servera.com (registrar o LAUNCH no calendário de openings!) e setar L2SERVERA_SECRET no .env da bridge (VPS) + pm2 restart.'
  WHERE "slug" = 'l2servera';

UPDATE "vote_sites" SET "notes" =
    'Callback IMPLEMENTADO na bridge (pingback oficial POST — valida pingbackkey; charId via ?vote=1&pingUsername=<charId> na vote URL). Antes de ativar: cadastrar em gtop100.com, configurar Pingback URL + pingbackkey no painel deles e setar GTOP100_PINGBACK_KEY no .env da bridge (VPS) + pm2 restart.'
  WHERE "slug" = 'gtop100';
