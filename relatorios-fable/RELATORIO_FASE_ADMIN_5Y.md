# RELATÓRIO FASE ADMIN 5Y — Online / Wallet history / Audit logs

Data: 2026-07-12 · Branch: `arq-definitiva` · Fable Y (paralelo ao Fable X, escopos isolados)

## Entregas

### 1. `/admin/online` — jogadores in-game em tempo real

- **Página** `src/app/admin/online/page.tsx` — SSR carrega snapshot direto da bridge (se a bridge cair, a página abre mesmo assim com aviso e o client re-tenta).
- **Client** `src/components/admin/OnlinePlayersPanel.tsx` — auto-refresh **5s** (com botão Pausar), filtros: busca por nome, level min/max, classe (dropdown com as 99 classes de `l2j-classes.ts`).
- **Colunas:** Nome (+conta), Level, Classe, Localização (cidade), Online desde (`lastAccess`), Tempo total (`onlinetime`), Clan, Kick.
- **Kick por linha:** POST `/api/admin/gm-commands {type:"kick"}` — usa a fila GM existente, **exige PIN GM desbloqueado** (senão toast manda desbloquear no Game master).
- **Site API** `GET /api/admin/online` — requireAdmin + rate limit 40/min/admin, forward pra bridge, enriquece com `city`.
- **Bridge** `bridge/src/routes/players.ts` (NOVA) — `GET /players/online` (HMAC): `WHERE online > 0`, filtros search/levelMin/levelMax/classId, paginação, `ORDER BY level DESC`. Read-only puro.
  - **Deployada na VPS**: scp + patch mínimo no `src/server.ts` da VPS (só import+register do playersRoutes — NÃO enviei o server.ts local inteiro porque ele já contém imports das rotas do Fable X ainda não deployadas). Backup `dist.bak-*`, `npm run build`, `pm2 restart`, `/health` ok.
  - **Teste real na VPS:** `GET /players/online?limit=5` assinado HMAC → `HTTP 200 {"players":[],"total":0,...}` (ninguém online no momento do teste — resposta correta).

**Mapping classId → nome:** reutilizei `src/lib/l2j-classes.ts` já existente — cobre **0–118 completo** (Interlude + 3ª classe). Bridge também devolve `className` via `bridge/src/l2j.ts`. Fallback `Unknown (id)`.

**Mapping coords → cidade:** reutilizei `src/lib/l2j-cities.ts` já existente — **17 cidades** (Talking Island, Elven, Dark Elven, Dwarven, Orc, Gludin, Gludio, Dion, Giran, Hardin's, Heine, Hunter's, Aden, Goddard, Schuttgart, Rune, Oren). Fora dos ranges → fallback `[X, Y]` bruto.

**Ping:** não existe no MySQL do L2J (aCis não persiste ping em `characters`) — coluna omitida em vez de mostrar dado falso.

**Fake players (+55):** intocado — é offset do status público do site; o `/admin/online` mostra a verdade do banco (chars com `online > 0`), que é exatamente o propósito da página admin.

### 2. `/admin/wallet/history` — transações filtráveis + refund

- **Página** `src/app/admin/wallet/history/page.tsx` + client `WalletHistoryPanel.tsx` — SSR primeira página, depois filtros/paginação server-side via API (50/página).
- **Filtros:** date range, status (pending/approved/rejected/cancelled/refunded), user (**id numérico OU trecho de email**, case-insensitive), min/max R$.
- **Colunas:** data (+#id), user email, R$ valor, coins, status (badge), MP payment ID, Refund (só em approved).
- **Site API** `GET /api/admin/wallet-history` — requireAdmin + rate limit + zod.
- **Refund** `POST /api/admin/wallet-history/[txId]/refund`:
  - requireAdmin + **PIN GM gate** (`isGmUnlocked`) + rate limit 10/min.
  - Lógica central em **`src/lib/wallet-refund.ts`** (novo, compartilhado):
    1. **Claim atômico** `updateMany(status: approved → refunding)` — concorrência/duplo-clique NUNCA debita 2x; 2º disparo em tx já reembolsada retorna `{ok:true, code:"already-refunded"}` **sem débito**.
    2. `mp.refund()` (método **já existia** em `mercadopago.ts` — reutilizado, nada adicionado). Falha MP → reverte pra `approved` e retorna 502. MP respondendo "already refunded" (refund manual prévio no painel MP) → segue pro débito local.
    3. `$transaction` interativa: lê coins atuais do user, debita `min(coins, tx.coins)`, marca `refunded`. **Parcial** (user já gastou parte) → debita só o que resta + audit `wallet_refund_partial_coins`; completo → audit `wallet_admin_refund`. Ambos com `coinsExpected/coinsDebited/partial` nos details.
  - **Edge documentado:** se o processo morrer entre claim e débito, a tx fica em `refunding` (visível com badge laranja) — nunca some dinheiro sozinho; conferir painel MP e ajustar via SQL.
- **Endpoint legado `/api/admin/wallet/refund`** (painel /admin/wallet) foi **refatorado pra mesma lib** — ganhou de graça a idempotência, refund parcial e o PIN gate (antes reembolsava dinheiro real SEM PIN, inconsistente com a régua da fila GM). Contrato preservado: mesmo body `{transactionId}`, mesma resposta `{ok:true}` (+ campos extras).

### 3. `/admin/audit-logs` — audit trail filtrável

- **Página** `src/app/admin/audit-logs/page.tsx` + client `AuditLogsPanel.tsx` — SSR primeira página, filtros server-side, 50/página (max 200).
- **Filtros:** date range, action (dropdown), userId, **contains** (busca textual no JSON `details`).
- **Colunas:** data, action (badge mono), user email (join `include user.email` — sem N+1), IP, details truncado 80 chars + botão **"Ver completo"** → modal com JSON prettified + **Copiar JSON**.
- **Site API** `GET /api/admin/audit-logs` — requireAdmin + rate limit + `orderBy createdAt DESC`.
  - `contains`: Prisma não filtra Json root por substring no Postgres → pré-filtro raw `details::text ILIKE` limitado aos **2000 matches mais recentes** (flag `containsWindowCapped` na resposta).
- **Bônus entregue:** `GET /api/admin/audit-logs/actions` — `SELECT DISTINCT action` (via Prisma `distinct`), **cache 5min no client** (module-level).

### 4. Menu + schema

- `AdminSidebar.tsx`: +3 itens (🟢 Jogadores online, 💰 Wallet histórico, 📋 Audit logs). Itens do Fable X (Moderação/Bans, Broadcasts agendados) preservados — merge por linhas distintas, sem conflito.
- **Schema Prisma: ZERO mudanças.** Os índices necessários já existiam: `audit_log(action, createdAt, userId)` e `wallet_transactions(userId, status, createdAt)`. Nenhuma migration.

## Arquivos

| Arquivo | Tipo |
|---|---|
| `bridge/src/routes/players.ts` | novo (deployado VPS) |
| `bridge/src/server.ts` | +2 linhas (registro) |
| `src/lib/bridge.ts` | +tipos e wrapper `bridge.onlinePlayers()` |
| `src/lib/wallet-refund.ts` | novo (lógica refund compartilhada) |
| `src/app/api/admin/online/route.ts` | novo |
| `src/app/api/admin/wallet-history/route.ts` | novo |
| `src/app/api/admin/wallet-history/[txId]/refund/route.ts` | novo |
| `src/app/api/admin/wallet/refund/route.ts` | refatorado (PIN + idempotência) |
| `src/app/api/admin/audit-logs/route.ts` | novo |
| `src/app/api/admin/audit-logs/actions/route.ts` | novo |
| `src/app/admin/online/page.tsx` + `OnlinePlayersPanel.tsx` | novos |
| `src/app/admin/wallet/history/page.tsx` + `WalletHistoryPanel.tsx` | novos |
| `src/app/admin/audit-logs/page.tsx` + `AuditLogsPanel.tsx` | novos |
| `src/components/admin/AdminSidebar.tsx` | +3 itens |

## Como testar (JOs)

1. Login admin em https://l2impure.com/login.
2. **Jogadores online (🟢):** abre com a lista in-game, contador atualiza a cada 5s. Filtra por nome/level/classe. Pro **Kick**: primeiro desbloqueia o PIN em Game master (⚔️), depois clica Kick na linha — comando entra na fila GM (executa quando o handler Java do Fable X estiver no ar; até lá fica `pending`, igual broadcast).
3. **Wallet histórico (💰):** filtra `status=approved`, escolhe uma tx de teste, clica **Refund** → confirma. Com PIN bloqueado recebe o aviso; desbloqueia e repete. Clicar Refund de novo na mesma tx → "já estava reembolsada — nada debitado" (idempotência). Confere o estorno no painel MP.
4. **Audit logs (📋):** o próprio refund do passo 3 aparece no topo (`wallet_admin_refund`). Testa o filtro "Contém" com o txId, e o "Ver completo" + Copiar JSON.

## Validação executada

- `tsc --noEmit` site: limpo (único erro é pré-existente de `tailwind-merge` types no node_modules local incompleto do WSL — não afeta Railway, que buildou o ec3ba81 com o mesmo utils.ts).
- `tsc --noEmit` bridge: limpo (incluindo as rotas novas do Fable X).
- Bridge VPS: build ok, pm2 online, `/health` ok, `GET /players/online` HMAC → 200.
- `next build` local não roda (WSL 3.8GB RAM — mesmo caso das fases anteriores); validação final no build do Railway + smoke em produção (seção abaixo, preenchida pós-deploy).

## Smoke pós-deploy (produção, 2026-07-12, commit 38bbbc8 no Railway)

```
/admin/online              -> 307   (redirect login, igual /admin/dashboard)
/admin/wallet/history      -> 307
/admin/audit-logs          -> 307
/api/admin/online          -> 401   (sem sessão)
/api/admin/audit-logs      -> 401
/api/admin/audit-logs/actions -> 401
/api/admin/wallet-history  -> 401
POST /api/admin/wallet-history/1/refund -> 401
POST /api/admin/wallet/refund (legado)  -> 401
/ (home, regressão)        -> 200
/api/server/status         -> {"online":true,"players":55,...}  [fake players intocado]
```

Bridge VPS: `GET /players/online?limit=5` HMAC → `200 {"players":[],"total":0,...}` (teste real assinado na VPS; 0 online no momento). pm2 `l2impure-bridge` online, `/health` ok, backup `dist.bak-*` criado antes do build.
