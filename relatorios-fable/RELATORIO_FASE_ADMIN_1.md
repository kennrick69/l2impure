# Relatório Fase Admin 1 — Fila de Comandos GM + Vote Sites Editável

**Data:** 11/07/2026
**Autor:** Orquestrador (Opus 4.7) + Fable a0ebd8ae (stopado antes de commit — orquestrador terminou)
**Contexto:** JOs saiu com autonomia delegada; Fable produziu 12 arquivos novos + 6 modificados mas foi encerrado antes de commit/deploy/relatório.

## 🎯 Escopo entregue

Duas frentes de valor imediato pro launch:

### 1. Fila de comandos GM (`gm_commands`)

Elimina a necessidade de logar como GM in-game pra broadcast/kick/give-item ao vivo. Reusa o padrão existente do vote system (`gameserver polla a bridge`).

**Contrato canônico** (docs em `PAINEL_ADMIN_ANALISE.md` §5):
- Site → POST `/api/admin/gm-commands` (audit + PIN gate + rate limit)
- Bridge INSERT `gm_commands (status='pending')` na l2jdb
- Gameserver polling GET `/gm-commands/pending?limit=10&ts=T&sig=H` a cada 5s
- Bridge FOR UPDATE + marca 'running'
- Gameserver POST `/gm-commands/:id/result` → 'done' ou 'failed'
- Recovery: `running` > 120s vira `failed` automático

**Segurança:**
- HMAC-SHA256 timing-safe, janela 30s
- Validação zod estrita por tipo de comando no site
- Regex `^[a-z][a-z0-9_]{1,31}$` no `type` da bridge
- Payload máx 8KB
- Priority 0-100

**Estado da implementação:**
- ✅ Site: API + UI + tipos + component reutilizável
- ✅ Bridge: rota + migration + HMAC + FOR UPDATE + recovery
- ⏳ Java handler no fork L2J: **não implementado** (P0 próxima rodada)

### 2. Vote sites editável no painel

Fim das configurações hardcoded. `vote_sites` (Postgres) vira single source of truth; a bridge lê via HTTP com cache 5min stale-on-error.

**Fluxo:**
- Admin edita em `/admin/marketing/vote-sites` (React table)
- Prisma UPDATE em `vote_sites`
- Bridge próxima ~5min pega config nova via `GET /api/vote-sites/{slug}`
- Se site fora → cache velho serve (nunca quebra callback)
- Se site fora + sem cache → fail-open (permite callback — perder voto legítimo é pior que dar coin com site desativado)

**Seed idempotente** com 5 rankings pré-cadastrados como `active: false`:
- HopZone (implementado)
- L2Top.CO (implementado)
- MMOTop (callback pendente)
- L2Servera (callback pendente)
- GTop100 (callback pendente)

## 📦 Arquivos entregues

**Site (branch `arq-definitiva`):**
- `src/lib/gm-commands.ts` (69 linhas)
- `src/app/api/admin/gm-commands/route.ts` (158)
- `src/app/api/admin/gm-commands/[id]/route.ts` (51)
- `src/app/api/vote-sites/[slug]/route.ts` (38)
- `src/app/admin/gm-console/page.tsx` (58)
- `src/app/admin/marketing/vote-sites/page.tsx` (38)
- `src/components/admin/GmConsole.tsx` (258)
- `src/components/admin/GmCommandTrigger.tsx`
- `src/components/admin/VoteSitesManager.tsx` (324)
- `src/components/admin/AdminSidebar.tsx` (reorganizado em grupos)
- `scripts/seed-vote-sites.mjs` (idempotente)

**Bridge (VPS):**
- `bridge/migrations/003-gm-commands.sql` (grant separado por causa de bug MySQL 8)
- `bridge/src/routes/gm-commands.ts` (328)
- `bridge/src/vote-config.ts` (87 — cache + stale-on-error + fail-open)
- `bridge/src/routes/vote.ts` (integração vote-config)
- `bridge/src/server.ts` (registro rota)
- `bridge/src/env.ts` (+3 vars com defaults)

## 🧪 Validação executada

### MySQL VPS
```
mysql l2jdb -e 'SHOW TABLES LIKE "gm_commands";'  → gm_commands
mysql l2jdb -e 'DESCRIBE gm_commands;'            → 10 colunas confirmadas
mysql l2jdb -e 'SHOW GRANTS FOR l2jbridge@localhost;'
  → GRANT SELECT, INSERT, UPDATE ON l2jdb.gm_commands ✅
```

**⚠️ Bug descoberto:** `mysql l2jdb < migration.sql` **ignora o GRANT** silenciosamente (executa no contexto do DB, e MySQL 8 exige contexto global pra GRANT). Documentado no comment da migration + aplicado grant fora do arquivo.

### Bridge deploy
- rsync dist/ → VPS
- pm2 restart `l2impure-bridge` — uptime reset OK, sem erros no log
- `curl /health` → `{"ok":true, service:"l2impure-bridge"}`
- `curl /status` (sem HMAC) → 401 ✅
- `curl /gm-commands` (sem HMAC) → 401 ✅
- `curl "/gm-commands/pending?limit=10&ts=1&sig=bad"` → 403 ✅

### Site produção
- `curl /api/status` → `{online:true, players:55, timestamp, ageSeconds:0, stale:false, contas:5}` ✅

## 🚨 Descobertas + decisões tomadas

### Bridge usa senha diferente da que JOs passou
JOs passou `L2impure@DB2026` — essa é a senha do **user `l2jserver`** (gameserver Java). A bridge Node usa **user `l2jbridge`** com senha `dctcNmPe9mEkpiRXA9nxEQ5jChBIbv` (gerada pelo deploy script em 25/abr). **Ambas mantidas** — decisão do dono. `SECRETS_ROTACAO.md` continua pronta mas não aplicada.

### Menu admin reorganizado em grupos
Antes: lista plana com 11 itens. Agora:
- **Administração** (11 itens + Console GM novo)
- **Marketing** (Vote sites)

Escala melhor conforme adicionamos P1/P2 do backlog.

### Fila NÃO usa Postgres (usa MySQL da VPS)
Motivo: reusar o padrão do vote system (que já funciona). Audit log fica no Postgres (via `audit()`); execução fica no MySQL onde a bridge tem acesso local.

## ⏳ O que ficou pra próxima rodada (declaradamente P0)

**Java handler no fork L2J** — sem ele, comandos ficam eternamente `pending`. Contrato pronto no site+bridge; falta:
- TaskScheduler que polla `/gm-commands/pending` a cada 5s
- Handler por tipo (`broadcast` → `Announcements.getInstance().announceToAll(msg)`, `kick` → `L2World.getPlayer(name).logout()`, `give_item` → `player.getInventory().addItem(...)`)
- POST resultado com HMAC (mesma lib do vote — reusa)

Estimativa: 4-6h por dev Java familiar com L2J.

**Endpoint público `/api/vote-sites/{slug}` só será testável após próximo deploy Railway** (leva ~1min após push).

**Migração 20260711 (VoteSite) já foi aplicada no Railway em `df7adac`.**

## ✅ Ao final, você terá

Um menu admin novo `Marketing → Vote sites` onde cadastra rankings, e um `Administração → Console GM (fila)` onde broadcast/kick/give-item ficam a 3 cliques (com PIN gate). Tudo com audit trilha.

**Fim do relatório.**
