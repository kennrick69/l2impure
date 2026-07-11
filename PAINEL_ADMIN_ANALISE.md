# Painel Admin L2Impure — Análise de Gaps

**Data:** 11/07/2026
**Autor:** Orquestrador (Opus 4.7) + Fable (a0ebd8ae)
**Escopo:** identificar tudo o que precisa entrar no painel `/admin` pra JOs operar o servidor **sem logar como GM in-game**.

> **Regra-mãe (JOs):** *"quero ter controle máximo sobre o painel do adm, pra não precisar ficar logando GM e editando coisas dentro do jogo"*

---

## 1. Estado atual do painel (o que já existe)

### Páginas admin
| Rota                          | O que faz hoje                                    | Depende de          |
|-------------------------------|---------------------------------------------------|---------------------|
| `/admin/dashboard`            | Status servidor + KPIs                            | Bridge `/status`    |
| `/admin/users`                | CRUD user site + reset senha                      | Postgres            |
| `/admin/promo-codes`          | Criar/desativar códigos                           | Postgres            |
| `/admin/server`               | Restart gameserver (com audit)                    | Bridge `/server/*`  |
| `/admin/referrals`            | Ver indicações + coins                            | Postgres            |
| `/admin/announcements`        | CRUD anúncios (só site — **não faz shout in-game**)| Postgres            |
| `/admin/game-master`          | Editar char OFFLINE + PIN gate                    | Bridge MySQL direto |
| `/admin/gm-console` ⭐         | Broadcast/kick/give-item **ao vivo** (via fila)   | Bridge queue + Java |
| `/admin/characters`           | Buscar char + detalhe                             | Bridge MySQL        |
| `/admin/items`                | Buscar itens (game data)                          | Bridge              |
| `/admin/npcs`                 | Buscar NPCs (game data)                           | Bridge              |
| `/admin/wallet`               | Ajuste manual coins de user                       | Postgres            |
| `/admin/marketing/vote-sites` ⭐ | Config rankings editável                        | Postgres            |

⭐ = criado nesta rodada (11/jul).

### Endpoints bridge relevantes (14 rotas)
Autenticados por HMAC (`ts` + `sig` no querystring, janela 30s):
- Status: `/health`, `/status`
- Character: `/character/:name`, edições OFFLINE em `/admin-*`
- Items/NPCs game data: `/items/search`, `/npcs/search`
- Server control: `/server/restart` (audit)
- Vote: `/vote/callback/:site`, `/vote/check`, `/vote/history/:charId`
- **GM Queue (novo):** `/gm-commands`, `/gm-commands/pending`, `/gm-commands/:id/result`
- Icons proxy: `/icons/*`

---

## 2. Arquitetura descoberta — o padrão inverso

**Nunca teve** telnet/RCON no gameserver L2J. O único caminho vivo é o **inverso**:
> *gameserver polla a bridge, a bridge é passiva*

Vale ouro porque:
- Sem porta nova aberta na VPS
- Firewall permanece `22/2106/7777` só
- Auditoria centralizada no MySQL da bridge
- Idempotência natural (comando já pego = `running`, timeout → `failed`)
- Recovery automática (running > 120s vira `failed` com mensagem)

**Implementação nesta rodada:** fila `gm_commands` na l2jdb + endpoints bridge + página admin com PIN gate. Falta só o **handler Java no fork L2J** (P0 próxima rodada).

---

## 3. Gaps categorizados por prioridade

### P0 — Bloqueadores do launch (10/out)

| # | Item | Situação | Estimativa |
|---|------|----------|------------|
| P0-1 | **Handler Java da fila GM no fork L2J** — TaskScheduler pollando `/gm-commands/pending` a cada 5s + handlers `broadcast`/`kick`/`give_item` + POST resultado | Contrato definido no site + bridge; Java **não implementado** | M (4-6h) |
| P0-2 | **Announcements fazerem shout in-game** | Anúncio hoje é só tabela Postgres; ninguém vê no jogo. Solução: novo tipo `announcement_broadcast` na queue GM | S (1-2h) |
| P0-3 | **Real IP do L2Top.CO na whitelist** | Placeholder `127.0.0.2` bloqueia forja mas também bloqueia votos legítimos. Passo T-14 do plano | XS (5min quando registrar) |
| P0-4 | **Callbacks vote — implementar MMOTop/L2Servera/GTop100** | Vote sites cadastrados mas 3 dos 5 rankings sem handler na bridge. Priorizar por relevância BR | M (3-4h por ranking) |

### P1 — Fecha operação sem GM in-game

| # | Item | Situação | Estimativa |
|---|------|----------|------------|
| P1-1 | **Ban/unban conta** — via queue (kickar sessão ativa + flag no `accounts`) | Novo tipo `ban_account` na queue + página `/admin/moderation/bans` | M (3-4h) |
| P1-2 | **Ver quem está online agora** (lista com char/level/localização/IP) | Bridge tem tabela `characters` mas endpoint só faz search. Precisa listagem paginada de online | S (1-2h) |
| P1-3 | **Ajuste de karma/PK** — via queue (char precisa estar online) | Novo tipo `set_karma` + UI GM Console | S (1-2h) |
| P1-4 | **Broadcast agendado** (anunciar evento X hora) | Cron site → cria comando na queue no timestamp certo | S (2h) |
| P1-5 | **Eventos globais** (TvT, CTF, DM start/stop) | Novo tipo `event_start`/`event_stop` na queue + UI dedicada | M (4-6h) |
| P1-6 | **Wallet — histórico + reversão de compra** | UI `/admin/wallet` só ajusta; não mostra histórico nem reverte MP | S (2h) |
| P1-7 | **Logs de audit consultáveis por filtro** (data, admin, tipo) | Audit escreve mas não tem UI de leitura | S (2h) |

### P2 — QoL / Automação de médio prazo

| # | Item | Situação | Estimativa |
|---|------|----------|------------|
| P2-1 | **Raidboss respawn/status** | Só via banco hoje; precisa monitor + comando manual respawn | M (4h) |
| P2-2 | **Olympiad — abrir/fechar temporada, ver rankings** | Nada no painel | L (1 dia) |
| P2-3 | **Ver logs do gameserver** (últimas N linhas por tail via bridge) | Endpoint bridge novo `/gs-logs?lines=100` | S (1-2h) |
| P2-4 | **GM chat log** — quem falou o quê em cada canal | Depende do Java persistir em MySQL (feature nova no fork) | L |
| P2-5 | **Config de rates dinâmica** (XP/SP/drop rate hot-reload) | L2J não suporta hot-reload; precisa fork custom | XL |
| P2-6 | **Estatísticas de jogo** (dashboard classes populares, level distribution, drop histograms) | Pode ser view Postgres sync do MySQL, ou query direta bridge | M |

### P3 — Nice-to-have

| # | Item | Situação |
|---|------|----------|
| P3-1 | Tema claro do painel (hoje só dark) | Estético |
| P3-2 | Notificação push admin (Discord webhook) — quando quantidade suspeita de coins for creditada | Depende de webhook |
| P3-3 | Terminal SSH web pra intervenção emergencial | Redundante — JOs tem SSH direto |

---

## 4. Ordem de execução recomendada

**Sprint imediato (esta semana):**
1. P0-1 (Java handler GM queue) — desbloqueia P0-2, P1-1, P1-3, P1-4, P1-5
2. P0-3 quando JOs registrar L2Top.CO
3. P1-2 (lista online) — 2h, valor alto imediato
4. P1-7 (audit UI) — 2h, garantia contra você mesmo

**T-30 (10/set):**
5. P0-2 (announcement shout — depende do P0-1)
6. P0-4 pra rankings BR ativos
7. P1-1 (ban)

**T-14 (26/set):**
8. P1-3, P1-4, P1-5

**Pós-launch:**
9. P2-* conforme demanda real

---

## 5. Contratos canônicos (referência)

### 5.1. Comando GM na queue — payload por tipo

```typescript
// broadcast
{ type: "broadcast", payload: { message: string /* ≤500 */ } }

// kick
{ type: "kick", payload: { charName: string /* ≤35 */ } }

// give_item (jogador ONLINE — offline use /admin/game-master)
{ type: "give_item", payload: { charName, itemId: number, count: number } }
```

### 5.2. Fluxo end-to-end
```
Site POST /api/admin/gm-commands { type, payload }
  ↓ (HMAC + audit + rate limit + PIN gate)
Bridge POST /gm-commands → INSERT status='pending'
  ↓
Gameserver GET /gm-commands/pending?limit=10&ts=T&sig=H  (a cada 5s)
  ↓ (transação MySQL FOR UPDATE)
Retorna N comandos, marca como 'running'
  ↓
Gameserver executa comando (broadcast, kick, etc)
  ↓
Gameserver POST /gm-commands/:id/result { ok, message? }
  ↓
Bridge marca 'done' ou 'failed'
```

**Recovery:** `running` sem resultado por >120s vira `failed` com `{ok: false, message: "timeout: gameserver não reportou"}`.

### 5.3. Vote-sites — bridge lê config do site

```
Bridge GET https://l2impure.com/api/vote-sites/{slug}
  ↓
Site responde { slug, active, cooldownHours, rewardCoins, ... }
Cache in-memory bridge: 5min, stale-on-error, fail-open se site fora
  ↓
Bridge decide se aceita callback do ranking
```

Painel admin edita `vote_sites` no Postgres → bridge pega em ≤5min sem redeploy.

---

## 6. Arquivos entregues nesta rodada

**Site (Next.js, branch `arq-definitiva`):**
```
src/lib/gm-commands.ts                              # tipos + zod schema
src/app/api/admin/gm-commands/route.ts              # POST + GET
src/app/api/admin/gm-commands/[id]/route.ts         # GET id
src/app/api/vote-sites/[slug]/route.ts              # público, sem auth
src/app/admin/gm-console/page.tsx                   # PIN gate + console
src/app/admin/marketing/vote-sites/page.tsx         # lista editável
src/components/admin/GmConsole.tsx                  # UI 3 comandos
src/components/admin/GmCommandTrigger.tsx           # componente reutilizável
src/components/admin/VoteSitesManager.tsx           # UI editor
src/components/admin/AdminSidebar.tsx               # menu reorganizado em grupos
scripts/seed-vote-sites.mjs                         # seed idempotente
```

**Bridge (Node, VPS):**
```
bridge/migrations/003-gm-commands.sql               # MySQL migration
bridge/src/routes/gm-commands.ts                    # HMAC + poll + result
bridge/src/routes/vote.ts                           # integração com vote-config
bridge/src/vote-config.ts                           # cache stale-on-error
bridge/src/server.ts                                # registro rota
bridge/src/env.ts                                   # SITE_BASE_URL + TTLs
bridge/.env.example                                 # doc dos envs
```

**Prisma:** `VoteSite` model já commitado em `df7adac` (2026-07-11).

---

## 7. Como testar cada peça (checklist futura)

Quando Java handler estiver pronto:

```bash
# 1. Criar comando pela UI OU curl direto
curl -X POST https://l2impure.com/api/admin/gm-commands \
  -H "Cookie: <admin session>" \
  -H "Content-Type: application/json" \
  -d '{"type":"broadcast","payload":{"message":"Teste"}}'

# 2. Confirmar aparece na fila
curl https://l2impure.com/api/admin/gm-commands?limit=5 \
  -H "Cookie: <admin session>"
# → status: pending

# 3. Aguardar até 5s (polling do gameserver)
# → status: running → done ou failed

# 4. Confirmar mensagem apareceu no game
# 5. Ver audit no Postgres
```

---

## 8. Riscos conhecidos

- **PIN GM esquecido bloqueia queue** — mesmo padrão do `/admin/game-master`. Fallback: recovery via reset direto no Postgres (`UPDATE users SET gm_pin_hash = NULL WHERE id = ?`)
- **Fila cresce sem retention** — se gameserver ficar offline por dias, `pending` acumula. Considerar TTL 24h em `pending` (marca `failed` automático)
- **Comando de longa execução** — nenhum previsto ainda (broadcast/kick/give são instantâneos). Se surgir, ajustar `STALE_RUNNING_S` (hoje 120)
- **Race entre 2 admins criando comando pro mesmo char** — sem lock; o gameserver executa em ordem (`priority DESC, id ASC`). É o comportamento correto.

---

**Fim do relatório.** Próxima rodada: P0-1 (Java handler no fork L2J) — desbloqueia praticamente todo o P1 restante.
