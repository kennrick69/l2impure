# Comunicação Site ↔ API ↔ Servidor L2J

> Auditoria + hardening de 2026-07-10. Fonte canônica de como o site
> l2impure.com conversa com o servidor de jogo. Atualizar sempre que a
> topologia mudar.

## 1. Arquitetura (quem fala com quem)

```
Jogador (browser)
   │ HTTPS
   ▼
Cloudflare CDN ── l2impure.com
   │
   ▼
Next.js 16 (Railway, branch arq-definitiva)
   ├── Postgres (Railway)   ← contas do SITE (users, game_accounts, wallet, promo, referrals, audit)
   ├── Redis (Railway)      ← cache (status 30s, rankings 5min) + snapshots stale 24h + rate-limit
   │
   │ HTTPS + HMAC-SHA256 (X-API-Key / X-Timestamp / X-Signature, skew máx 30s)
   ▼
bridge.l2impure.com ── Cloudflare Tunnel
   │
   ▼
Bridge Fastify (VPS 76.13.170.153, 127.0.0.1:8080, pm2 "l2impure-bridge")
   ├── MySQL l2jdb (localhost:3306)      ← accounts, characters, clan_data...
   ├── TCP probe login server :2106      ← "online?"
   └── TCP probe game server  :7777      ← "online?"
```

**Regras de ouro:**
- O Next NUNCA fala com o MySQL do jogo direto — só via bridge.
- A bridge NUNCA é exposta direto na internet — só via tunnel (bind 127.0.0.1).
- Senha de jogo = `SHA1+Base64` (canônico L2J, `bridge/src/l2j.ts`).
  Senha do site = bcrypt 12 rounds no Postgres. **São mundos separados**
  — jogador cria conta de jogo pelo painel e a bridge grava o hash que o
  login server espera. Não existe mismatch possível.

## 2. Endpoints × propriedades

| Endpoint (site) | Tipo | Auth | Cache | Timeout bridge | Fallback |
|---|---|---|---|---|---|
| `GET /api/server/status` | read | pública (rate-limit 60/min/IP) | Redis 30s + CDN 15s | 4s | snapshot stale 24h → `stale:true` + `X-Data-Stale` |
| `GET /api/status` | read | pública (rate-limit 60/min/IP) | Redis 30s (+contas 60s) + CDN 15s | 4s | idem acima; `contas:null` se PG falhar |
| Sidebar do painel (status) | read | sessão | Redis 30s | 4s | stale 24h → senão badge "Indisponível" |
| `/rankings` (pvp/pk/clans) | read | sessão | Redis 5min | 4s | stale 24h → senão empty-state "bridge não respondeu" |
| `/characters` | read | sessão | sem cache (freshness) | 4s | fail-soft por conta ("algumas contas não carregaram") |
| `POST /api/game/accounts` | write | sessão, 5/h/user | — | 12s | bridge-first; PG falhou → rollback `DELETE` na bridge |
| `POST .../change-password` | write | sessão, 5/h/user | — | 12s | erro claro, sem estado parcial (UPDATE único) |
| `POST .../reset-hwid` | write | sessão, 1/semana/conta | — | 12s | idem |
| `DELETE /api/game/accounts/:login` | write | sessão | — | 12s | bloqueia se char online (409) |
| `POST /api/promo-codes/redeem` | write | sessão | — | n/a (PG only) | transação + unique constraint = idempotente |
| `POST /api/admin/server/restart` | write | admin | — | 60s | — |
| `POST /api/wallet/webhook` | write | assinatura MP | — | n/a | idempotência por transaction id |

**Ordem canônica de escrita de conta de jogo:** bridge (MySQL L2J)
PRIMEIRO, Postgres depois. Se a bridge falha → aborta sem tocar no PG
(painel nunca mostra conta que não existe no jogo). Se o PG falha →
rollback compensatório na bridge (`src/app/api/game/accounts/route.ts`).

**Idempotência de criação:** o login é PK no MySQL (`accounts.login`) e
UNIQUE no PG (`game_accounts.game_login`). Duplo submit → segunda
request leva 409 "login já reservado". Race condition coberta por
`ER_DUP_ENTRY` na bridge.

## 3. Regras de fallback (stale-while-error)

Implementado em `src/lib/redis.ts` (`cached()`):

1. Todo fetch bem-sucedido grava 2 chaves: `key` (TTL curto) e
   `stale:key` (TTL 24h).
2. Se o fetcher falha (timeout 4s, tunnel fora, 5xx da bridge), serve
   `stale:key` e loga warning. Só propaga erro se NUNCA houve dado.
3. `/api/server/status` marca `stale: true` (+ header `X-Data-Stale`)
   quando o dado tem mais de 90s ou veio de fallback total.

Timeouts (`src/lib/bridge.ts`): reads 4s, writes 12s, restart 60s.
Timeout/erro de rede viram `BridgeError` 504/502 — nunca um hang.

## 4. Contagem de players — ATENÇÃO

`players` público = `COUNT(characters.online>0)` **+ offset de
marketing**. O offset vem de 2 lugares (o do PG vence):

1. `PLAYER_COUNT_OFFSET` no `.env` da bridge (`bridge/src/env.ts`)
2. Setting `player_count_offset` no PG, editável no painel admin
   (`src/lib/settings.ts` + `src/lib/server-status.ts`)

`playersRaw` (o número real) NÃO é exposto no endpoint público — só
circula entre bridge ↔ Next. **Risco de produto:** jogador L2 hardcore
compara o count do site com `/who` in-game e detecta inflação. Antes do
launch, decidir: offset 0 ou aceitar o risco conscientemente.

## 5. Runbook — "a VPS de jogo caiu, o que acontece?"

| Camada | Comportamento |
|---|---|
| Landing `/` | Continua 200 — não depende da bridge (cards estáticos "EM BREVE"). |
| `/api/server/status` | 200 com último snapshot (`stale:true`). Depois de 24h sem VPS: `online:false, players:0, stale:true`. Nunca 500. |
| Sidebar do painel | Último snapshot por 24h; depois badge "Indisponível". |
| `/rankings` | Snapshot 24h; depois empty-state com aviso. |
| `/characters` | "Algumas contas não puderam ser carregadas." |
| Criar conta de jogo | Erro claro 502 "tente em alguns minutos", nada gravado em lugar nenhum. |
| Latência pior caso | +4s no primeiro miss de cache (timeout da bridge), depois volta a <1s via stale. |

**Pra validar:** `bash scripts/chaos-test.sh` (instruções no cabeçalho —
bloqueia a 8080 na VPS por 60s e observa).

**Alerta:** monitorar `https://bridge.l2impure.com/health` (200 = bridge
viva) e `https://l2impure.com/api/server/status` (campo `online`) num
UptimeRobot/BetterStack + webhook Discord. *(pendente de configurar —
serviço externo, precisa de conta do JOs).*

## 6. Riscos residuais / pendências

> Atualizado 2026-07-11 (rodada de QA interno via SSH na VPS).

1. ~~CRÍTICO — MySQL 3306 aberto pra internet~~ **FECHADO 2026-07-11**:
   `bind-address = 127.0.0.1` em `/etc/mysql/mysql.conf.d/mysqld.cnf`
   (backup `.bak-20260711`) **e** regra `ufw allow 3306` removida
   (backup `/root/iptables.pre-fw-20260711.bak`). Validado de fora:
   conexão TCP a 76.13.170.153:3306 não completa. Detalhe importante:
   `mysql.user` não tem NENHUM user com host `%` — ou seja, nem a API
   legada conseguia usar 3306 remoto com credencial válida.
2. **API legada v1.2.0 ainda no ar no Railway** (zumbi) — responde 200
   na raiz, mas o MySQL dela ficou inacessível com o item 1 (era o único
   caminho). Desligar o serviço no Railway quando tiver login (limpeza,
   não urgência de segurança).
3. **Offset de players = 55** (ver §4; `PLAYER_COUNT_OFFSET=55` no
   `.env` da bridge, `playersRaw:0` real) — decisão de produto antes do
   launch, segue com o JOs.
4. ~~Porta 9014 conferir~~ **IDENTIFICADA E FECHADA 2026-07-11**: 9014 é
   o canal loginserver ← gameserver (registro de GS). O gameserver
   conecta via `127.0.0.1:9014` (LoginHost no server.properties), então
   o acesso público foi removido do ufw. Validado: gameserver
   re-registra ("Registered as server: [1] Bartz") com a porta fechada
   pra fora. Públicas restantes: só 22, 2106, 7777.
5. **Real-time de verdade (SSE/WebSocket)** — hoje é polling/cache 30s.
   Suficiente pré-launch; se quiser CCU ao vivo pós-launch, adicionar
   SSE lendo o mesmo `getPublicServerStatus()`.
6. **Secrets vazados em chat (2026-04-25)** — pendentes de rotação;
   exige Railway CLI logado (não disponível pro agente). 30s do JOs:
   `bash scripts/rotate-secrets.sh` + SMTP/reCAPTCHA manuais.
7. **`chars` total no `/api/status`** — exigiria endpoint novo na bridge
   (`SELECT COUNT(*) FROM characters`). Hoje o endpoint expõe `contas`
   (PG) + `players` online; total de chars fica pra quando a bridge
   ganhar release nova.

### 6.1 Incidentes encontrados e corrigidos no QA de 2026-07-11

- **GameServer travado há semanas** (JVM não respondia nem a jstack,
  accept-queue de 7777 lotada — site mostrava `online:false`). Reiniciado
  via systemd; boot atual com **0 SEVERE** e 7777 aceitando conexão.
- **Auth do MySQL quebrada pros L2J**: `root@localhost` é `auth_socket`
  (só socket unix) e o user `l2jserver` do loginserver **não existia**.
  Login/game viviam de conexões antigas de pool; qualquer reconexão
  falhava com Access denied. Fix: user `l2jserver`@localhost/127.0.0.1
  criado (`mysql_native_password`, senha a mesma do
  `login/config/loginserver.properties`), `GRANT ALL ON l2jdb.*`;
  gameserver apontado pro mesmo user (fim do `root` sem senha no
  server.properties, backup `.bak-20260711`). Ambos reiniciados, boot
  limpo, contas/chars legíveis.
- **Deploy acidental de bridge antiga** (14:33 UTC, build a partir do
  `src/` desatualizado da VPS): rotas vote/rankings/admin/icons sumiram
  de produção (404). Restaurado com build do fonte canônico
  (`bridge/` deste repo, 14 rotas registradas); dist quebrado preservado
  em `/root/l2j-bridge/dist.broken-20260711/`. **Regra: NUNCA buildar da
  VPS; sempre buildar do repo e subir o dist.**
- **Forja de voto L2Top.CO possível**: `L2TOP_CO_WHITELIST_IPS` não
  existia no `.env` da bridge → whitelist vazia → callback aceitava
  qualquer IP (validado: POST forjado retornou "OK" e gravou
  vote_pending). Fix: whitelist placeholder-bloqueante (`127.0.0.2`) —
  agora tudo responde 403. **Quando o JOs cadastrar no l2top.co, trocar
  pelo IP de callback real que eles informarem no painel.**

## 7. Latência medida (2026-07-10, de WSL BR, 5 amostras)

| Alvo | p50 | máx | Nota |
|---|---|---|---|
| `l2impure.com/` | 0.47s | 0.82s | CDN Cloudflare + Next prerender |
| `l2impure.com/api/auth/me` | 0.35s | 0.38s | Railway dinâmico |
| `bridge.l2impure.com/health` | 0.18s | 0.19s | Tunnel saudável |
| `/api/server/status` | medir pós-deploy | | alvo <300ms com cache quente |

Alvo geral: p95 < 1s em qualquer endpoint com cache quente; pior caso
absoluto 4s (timeout de bridge) uma única vez por janela de cache.
