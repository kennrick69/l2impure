# Relatório Fase Admin 3B — Hardening de Segurança L2 Impure

**Autor:** Fable 5 (missão autônoma)
**Data:** 2026-07-12
**Escopo:** Auditoria de vazamento de secret, fail2ban+SSH, anti-exploit aCis, race condition wallet, rate limit LoginServer.
**Alvos:** VPS Hostinger `76.13.170.153`, site `l2impure.com` (branch `arq-definitiva`), bridge Node (PM2 `l2impure-bridge`).

---

## TL;DR

- **1 vulnerabilidade REAL de duplicação encontrada e corrigida:** race condition (TOCTOU) no claim de voto da bridge — 2 requests concorrentes davam a coin 2×. Corrigido com UPDATE atômico guardado.
- fail2ban **instalado e ativo** (jail sshd, ban 24h após 5 falhas).
- LoginServer aCis **já tinha** proteção bruteforce — apenas afrouxada; **endurecida** (10 tentativas → ban 15min) via config, sem patch Java.
- Wallet do site: **sem double-spend** (código já atômico); fechada uma brecha menor de *durabilidade* (crash podia perder coins).
- **Nenhum secret vazou** para o repositório git (auditoria limpa).
- Anti-dupe do gameserver já é forte: **AntiBot ON + HWID multibox=3 ON**.

**Score de segurança (subjetivo 1-10):** antes **5.5** → depois **8.0**.

---

## FASE 1 — Auditoria de vazamento de secret → LIMPO ✅

Verificações realizadas em `/mnt/c/Projetos/l2impure-arq`:

| Check | Resultado |
|---|---|
| `.env` / `prisma/.env` / `bridge/.env` já commitados? | **Não** — só `.env.example` com placeholders |
| Secret hardcoded em `.ts/.tsx/.js`? | **Não** — só nomes de env-var e comentários HMAC |
| Padrões de secret real (sk_live, AKIA, hex64) em tracked files? | **Zero** |
| `.gitignore` cobre env? | **Sim** — `.env`, `.env.local`, `.env.*.local`, `prisma/.env` |
| `.properties` do gameserver commitados? | **Não** — nenhum tracked |
| Valor do `VoteHmacSecret` (achado no VPS) presente no repo/histórico? | **Zero ocorrências** em `git log --all -p` |

**Observação (não é vazamento, mas registrar):** `vote.properties` no VPS contém `VoteHmacSecret` em plaintext (é o mesmo `HMAC_SECRET` da bridge `.env`). O arquivo é root-only e **não está no git** — portanto não é incidente. Só existe no filesystem do VPS e no `.env` (gitignored). Sem ação obrigatória. Se algum dia expor a pasta `config/` publicamente, rotacionar.

**`SECURITY_INCIDENT.md` NÃO foi criado** — não houve incidente.

---

## FASE 2 — fail2ban + hardening SSH → FEITO ✅

Estado anterior: fail2ban **não instalado**; ufw ativo (22/2106/7777); `PermitRootLogin yes`; `PasswordAuthentication` no default (yes).

Ações aplicadas na VPS:

- `apt-get install -y fail2ban` → **Fail2Ban v0.11.2 instalado**.
- `/etc/fail2ban/jail.local` criado com **backend systemd** (mais robusto no Ubuntu que `logpath`, que pode não existir sem rsyslog):
  ```ini
  [DEFAULT]
  bantime = 3600 ; findtime = 600 ; maxretry = 5
  backend = systemd
  ignoreip = 127.0.0.1/8 ::1
  [sshd]
  enabled = true ; port = ssh ; maxretry = 5 ; bantime = 86400 (24h)
  ```
- `systemctl enable --now fail2ban` → **active**, jail `sshd` monitorando `_SYSTEMD_UNIT=sshd.service`.

### ⚠️ P1 pendente pro JOs (NÃO fiz — pode te trancar fora):
Desabilitar login por senha e deixar só chave. **Só rode se a key `l2vps_backup` estiver garantida:**
```bash
ssh -i ~/.ssh/l2vps_backup root@76.13.170.153 \
  "sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' /etc/ssh/sshd_config && sshd -t && systemctl reload ssh && echo OK"
```
Isso corta 100% dos bruteforce de senha SSH (fail2ban vira só defesa secundária). Root login por chave continua funcionando.

---

## FASE 3 — Anti-exploit flags aCis → AUDITADO + 1 FLAG ENDURECIDA ✅

Li todos os `.properties` de `/root/l2j-server/gameserver/config/` (14 arquivos + 17 no `engine/`).

### Já estava seguro (nenhuma mudança):
| Flag | Valor | Veredito |
|---|---|---|
| `Enable_AntiBot` (engine/AntiBot) | **True** | ✅ captcha anti-bot ativo |
| `AllowGuardSystem` (hwid) | **True** | ✅ proteção HWID ativa |
| `AllowedWindowsCount` | **3** por HWID | ✅ **anti-multibox forte** — trava dupe por multi-janela |
| `KickWithEmptyHWID` / `KickWithLastErrorHWID` | True | ✅ |
| `MaximumWarehouseSlots*` | 100-200 (<300) | ✅ sem overflow de client crash |
| `AutoCreateAccounts` (login) | **False** | ✅ conta só via site |
| `MultisellTime` | 100ms | ✅ flood protector ok |
| `AltGameFreights` | False | ✅ |

### Alterado (com backup):
| Arquivo | De → Para | Motivo |
|---|---|---|
| `server.properties` : `L2WalkerProtection` | `False` → **`True`** | Proteção básica contra client L2Walker (belt-and-suspenders sobre AntiBot+HWID) |

Backup: `server.properties.bak-secfix-20260712-011012`.

### Notas de análise:
- **Dupes clássicos de trade/warehouse/enchant NÃO são togglados por `.properties`** — são fixes no código Java do fork aCis (já corrigidos há anos no aCis mantido). Não há flag pra "desligar dupe".
- `GlobalChatTime = 0` / `TradeChatTime = 0`: chat sem anti-flood. É **spam**, não dupe — decisão de gameplay. Deixei intacto; se aparecer spam-bot de chat, subir `GlobalChatTime` pra ~3000.
- `OfflineTradeCraft`: offline shop habilitado (engine Fissban, seguro no aCis). Sem toggle de risco.

---

## FASE 4 — Race condition no wallet do site → SEM DOUBLE-SPEND + fix de durabilidade ✅

**Não existe endpoint de GASTO de coins no site.** Coins só são: creditados (webhook MP) ou ajustados por admin. Não há rota player-facing de "gastar coins" (isso acontece in-game).

Auditoria das rotas `src/app/api/wallet/**`:

| Rota | Veredito |
|---|---|
| `create-preference` | ✅ rate-limited, zod min/max, cria tx atômica. Sem race. |
| `transactions/[id]/cancel` | ✅ **totalmente atômico** — `updateMany` com todas as condições no WHERE. Sem race. |
| `webhook` | ✅ idempotência anti-double-credit via `updateMany WHERE status != approved` + `count === 1` antes de creditar. **Sem double-credit.** |

### Fix aplicado (`src/app/api/wallet/webhook/route.ts`):
O flip de status e o crédito de coins eram **dois statements separados**. Um crash entre eles deixaria a tx `approved` **sem** creditar (perda de coins pro jogador — durabilidade, não dupe). Envolvi ambos num único `prisma.$transaction` (all-or-nothing), **preservando** a trava anti-double-credit do `updateMany`.

> Isto **não** era um double-spend — o código já era seguro contra crédito duplicado. É hardening de robustez.

---

## FASE 5 — Rate limit no LoginServer L2J → JÁ EXISTIA, ENDURECIDO (sem patch Java) ✅

O LoginServer aCis **já tem** proteção bruteforce nativa e habilitada. **Nenhum patch/recompile necessário** — resolvido 100% via config, exatamente o que a Fase 5 pedia (10 tentativas → ban 15min).

`/root/l2j-server/login/config/loginserver.properties`:

| Flag | Antes | Depois | Motivo |
|---|---|---|---|
| `LoginTryBeforeBan` | 20 | **10** | menos tentativas antes do ban |
| `LoginBlockAfterBan` (s) | **30** ⚠️ | **900** (15min) | 30s era fraquíssimo — comentário do próprio arquivo diz default 600 |
| `LogLoginController` | False | **True** | forense: loga login sucesso/falha/criação de conta |
| `EnableFloodProtection` | True | True | ✅ (já ok — flood de conexão) |
| `FastConnectionLimit` / `MaxConnectionPerIP` | 15 / 50 | mantido | ok com HWID multibox=3 |

Backup: `loginserver.properties.bak-secfix-20260712-011053`.

**Observação:** `Password = a0368...` no loginserver.properties é a senha do MariaDB local (padrão L2J, arquivo root-only, **não** no git). Sem ação.

---

## ⏳ AÇÃO MANUAL PRO JOs (comandos exatos)

### 1. Aplicar as flags de segurança do gameserver+login (derruba players — rode quando quiser):
```bash
ssh -i ~/.ssh/l2vps_backup root@76.13.170.153 "bash /root/apply-security-flags.sh"
```
(reinicia `l2j-login.service` e `l2j-game.service`. Backups `.bak-secfix-*` ao lado dos arquivos.)

### 2. Deploy da bridge com o fix anti-dupe de voto (⚠️ coordenar com Fable A):
A bridge do VPS é deploy **não-git** (scp → `tsc` → pm2). O fix está em `bridge/src/routes/vote.ts` (commitado no repo). **NÃO deployei sozinho** porque a Fable A está mexendo em `bridge/src/server.ts` simultaneamente — deploy agora enviaria o trabalho dela pela metade. Depois que a Fase A landar:
```bash
# do repo local, sincroniza src e rebuilda no VPS:
cd /root/l2j-bridge && cp -r dist dist.bak-$(date +%Y%m%d-%H%M%S) && npm run build && pm2 restart l2impure-bridge && pm2 logs l2impure-bridge --lines 20
```
(assumindo que o `src/` do VPS foi atualizado com o repo — a bridge não é git, então suba o `bridge/src/routes/vote.ts` novo antes.)

### 3. P1 opcional — desabilitar PasswordAuthentication SSH (ver Fase 2, só com key garantida).

---

## CVEs / dupes conhecidos do L2J Interlude — status neste fork

| Vulnerabilidade | Vetor | Status neste fork |
|---|---|---|
| **Trade dup** | packet race no ADD/CANCEL de trade | **not fixable via config** — fix é código; aCis mantido já corrige. `needs review` se houver crash-report de trade. |
| **Warehouse dup** | split de transação deposit/withdraw | idem — código aCis. `presumed fixed` |
| **Enchant disconnect dup** | logout no meio do enchant | idem — código aCis. `presumed fixed` |
| **Multisell overflow** | quantidade forjada estoura int | mitigado por `MultisellTime=100`; overflow é código. `presumed fixed` |
| **Teleport packet forge** | coord forjada | proteção in-code aCis. `not fixed via config` |
| **Chat SQL injection** | raro | site usa **Prisma** (parametrizado) ✅; bridge usa **mysql2 com placeholders `?`** ✅ (verifiquei vote.ts). `fixed` |
| **Vote-coin double-claim** ⭐ | **race TOCTOU no `/vote/check`** | **ENCONTRADO E CORRIGIDO nesta missão** (UPDATE atômico guardado). `fixed` |
| **Login bruteforce** | sem lockout | **`fixed`** — nativo, endurecido (10→ban 15min) |
| **SSH bruteforce** | sem fail2ban | **`fixed`** — fail2ban instalado |

---

## Vulnerabilidade principal corrigida (detalhe técnico)

**Arquivo:** `bridge/src/routes/vote.ts`, endpoint `/vote/check` (game server chama pra creditar a coin de voto).

**Antes (vulnerável — check-then-act):**
```
SELECT id FROM vote_pending WHERE ... AND claimed = 0 LIMIT 1   -- check
UPDATE vote_pending SET claimed = 1 WHERE id = ?                -- act (statement separado, sem guarda)
reply ok:true  → game server credita 1 vote coin
```
Duas `/vote/check` concorrentes pro mesmo char liam ambas `claimed=0`, ambas davam UPDATE no mesmo id, ambas retornavam `ok:true` → **1 voto virava 2+ coins**. Como a bridge usa pool de conexões (sem transação), a janela de corrida é real.

**Depois (atômico):**
```sql
UPDATE vote_pending SET claimed = 1, claimed_at = NOW()
WHERE site = ? AND char_id = ? AND claimed = 0
ORDER BY voted_at DESC LIMIT 1;
```
Reward só é liberado se `affectedRows === 1`. O UPDATE guardado (`claimed = 0` no WHERE) faz o próprio banco serializar: só um request concorrente altera a linha; o perdedor recebe `affectedRows = 0` → `no_pending_vote`. Race eliminada num único statement.

Bridge typecheck: **limpo** (`tsc --noEmit` exit 0).

---

## Arquivos alterados neste commit
- `bridge/src/routes/vote.ts` — fix anti-dupe de voto (atômico)
- `src/app/api/wallet/webhook/route.ts` — crédito de coins em `$transaction` (durabilidade)
- `relatorios-fable/RELATORIO_FASE_ADMIN_3B.md` — este relatório

**Não commitados** (trabalho concorrente da Fable A, preservado intacto): `bridge/src/server.ts`, `prisma/schema.prisma`, `src/components/admin/AdminSidebar.tsx`, `src/lib/bridge.ts`, `bridge/migrations/004-*`, `bridge/src/routes/gameserver-config.ts`, `src/app/admin/events/`, `prisma/migrations/20260712000000_add_event_configs/`.
