# RELATÓRIO FASE ADMIN 5X — Fila GM estendida + Moderação/Bans + Broadcasts agendados

**Data:** 2026-07-12 (~20:00–20:40 UTC) · **Executor:** Fable (sessão autônoma) · **Branch:** `arq-definitiva`

Tudo abaixo foi **testado e2e em produção** (comandos reais → `done` na fila) antes deste commit.

---

## 1. Três tipos novos na fila GM

Definidos em `src/lib/gm-commands.ts` (zod, site valida semântica; bridge valida forma; gameserver executa):

| type | payload | o que faz |
|---|---|---|
| `announcement_broadcast` | `{title ≤80, message ≤500, persistOnSite}` | Shout in-game `título: mensagem` via `World.announceToOnlinePlayers` (o insert no Postgres do site é feito PELO site antes de enfileirar — o gameserver só shouta) |
| `ban_account` | `{accountLogin 3..48, reason ≤200, durationHours? 1..87600}` | (1) kicka TODA sessão ativa da conta com aviso do motivo, (2) `UPDATE accounts SET access_level=-100, lastServer=-1` (login server recusa), (3) INSERT histórico em `account_bans` (`expires_at = NOW()+durationHours` ou NULL = permanente) |
| `unban_account` | `{accountLogin}` | `UPDATE accounts SET access_level=0, lastServer=1` (guard `access_level < 0` — nunca zera nível positivo de GM) + fecha registros abertos em `account_bans` |

**Java** (`server/impure-classes/.../gm/GmCommandPoller.java`, espelhado em `/root/impure-classes/`):
- Novos handlers usam `net.sf.l2j.commons.pool.ConnectionPool` (pool JDBC do próprio fork) — try-with-resources, comando ruim nunca derruba o gameserver (padrão da classe mantido).
- Coluna real da accounts é **`access_level`** (snake_case) — a spec dizia `accessLevel`, verificado com `DESCRIBE` antes.
- `banned_by` vem do `requestedBy` do comando: o `GET /gm-commands/pending` da bridge agora devolve `requestedBy` (campo **aditivo** — poller antigo ignoraria sem quebrar).

**Pipeline de injeção** (idêntico à Fase Admin 2): scp do .java → `bash /root/impure-classes/build-gmqueue.sh` (backup automático + `javac --release 21` + `jar uf` + verify). 
- Backup desta rodada: `/root/l2j-server/gameserver/libs/l2jserver.jar.backup-gmqueue-20260712_202838`
- Rollback: `cp <backup> libs/l2jserver.jar && systemctl restart l2j-game`
- Restart 20:29 UTC com **0 players online** (checado 2× — antes do build e imediatamente antes do restart). Boot OK: `GmCommandPoller: started` + `Registered as server: [1] Bartz`. Fake players:55 é offset do site — intacto.

## 2. Tabelas novas (MySQL l2jdb na VPS)

- `bridge/migrations/005-account-bans.sql` — `account_bans` (histórico: quem/por quê/até quando/quem desbaniu). **Collation explícita `utf8mb4_0900_ai_ci`** — TEM que casar com a `accounts`, senão o JOIN do `GET /account-bans` explode com `Illegal mix of collations` (aconteceu no e2e; ALTER aplicado + migration corrigida).
- `bridge/migrations/006-scheduled-commands.sql` — `scheduled_gm_commands` (broadcast agendado; genérica pra qualquer type futuro).
- Grants aplicados SEPARADOS (bug conhecido do GRANT dentro de `mysql l2jdb < file`):
  `GRANT SELECT, INSERT, UPDATE ON l2jdb.account_bans TO 'l2jbridge'@'localhost';` (idem `scheduled_gm_commands`) + `FLUSH PRIVILEGES`.

**Timezone:** MySQL da VPS roda com session tz = SYSTEM = **UTC** (a spec dizia "bridge/JVM em BRT" — só a JVM tem `-Duser.timezone=America/Sao_Paulo`; node/mysql são UTC). Resultado prático = exatamente o que a spec pedia: `scheduled_at`/`expires_at` salvos e comparados em UTC, UI converte pra BRT com `toLocaleString("pt-BR", {timeZone:"America/Sao_Paulo"})`.

## 3. Bridge — endpoints novos + scheduler (deployados, pm2 30 restarts ok)

- `GET /account-bans?status=active|all&limit=&login=` (HMAC site) — lista com JOIN na accounts (traz `accessLevel` atual) + flag `active` calculada.
- `POST /scheduled-commands` `{type, payload, requestedBy, scheduledAt ISO}` — valida forma, rejeita passado (>60s) e futuro >370 dias.
- `GET /scheduled-commands?status=pending|fired|cancelled&limit=`
- `DELETE /scheduled-commands/:id` — cancela; `409 not_cancellable` se já disparado/cancelado.
- **`bridge/src/scheduler.ts`** — tick 30s (guard anti-overlap, `unref()`, para no graceful shutdown):
  1. **Disparo**: `scheduled_at <= NOW()` e não disparado/cancelado (LIMIT 20) → INSERT em `gm_commands` + `SET fired_at, gm_command_id` (só marca fired DEPOIS de enfileirar; se o INSERT falha, retry no próximo tick; corrida cancelamento×disparo tratada com guard + revert).
  2. **Auto-expire de bans**: `expires_at <= NOW()` sem `unbanned_at` → restaura `access_level=0` (só se `< 0`) + fecha com `unbanned_by='auto-expire'`. **Sem isso `durationHours` seria cosmético** — nada no fluxo original desbania sozinho.
- Deploy: `npm run build` local → rsync `dist/` (backup automático `dist.bak-<ts>`) → `pm2 restart l2impure-bridge`. Log confirma: `[scheduler] ativo — tick a cada 30s`.

## 4. Site (Next.js / Railway)

- **/admin/announcements** — checkbox "Também fazer shout in-game (jogadores online veem)" no form. Salva no Postgres primeiro; depois enfileira `announcement_broadcast` via `POST /api/admin/gm-commands` (audit dos dois lados). Exige PIN GM desbloqueado — se travado, o anúncio JÁ FOI salvo e o toast explica ("desbloqueie o PIN no Console GM").
- **/admin/moderation/bans** (nova) — mesmo gate de PIN do Console GM. Card "Banir conta" (login + motivo + duração 1h/24h/7d/30d/permanente) e lista com busca por login, toggle ativos/histórico, badges `[ATIVO]`/`[EXPIRADO]`/`[DESBANIDO]`, botão Desbanir por linha. Ações usam o `GmCommandTrigger` existente (acompanha pending→done ao vivo).
- **/admin/scheduled-broadcasts** (nova) — mensagem + `datetime-local` (browser em BRT converte pra UTC ISO), lista com status agendado/disparado/cancelado e botão Cancelar. Horários exibidos em BRT explícito.
- **APIs**: `GET /api/admin/bans` (forward → bridge). `POST/GET /api/admin/scheduled-broadcasts` + `DELETE /api/admin/scheduled-broadcasts/[id]` (forward → bridge, audit `admin_scheduled_broadcast_create/cancel`). POST de agendamento exige PIN GM (paridade com broadcast imediato); cancelar exige só admin.
  - **Desvio da spec (documentado):** o "PATCH pra unban" virou `POST /api/admin/gm-commands {type: unban_account}` — caminho único, PIN, audit e tracking de status de graça. `/api/admin/bans` é só leitura.
- **Sidebar**: + 🚫 Moderação/Bans, + ⏰ Broadcasts agendados (itens do Fable Y — Online/Wallet histórico/Audit logs — intactos).

## 5. Validação e2e EM PRODUÇÃO (ids reais na gm_commands)

```
id 10 announcement_broadcast done  "anúncio shoutado in-game (0 players online)"
id 11 ban_account            done  "conta bantest_fable banida (1h), 0 sessão(ões) derrubada(s)"
      → accounts: access_level=-100, lastServer=-1 · account_bans id 1 com expires_at=+1h e banned_by correto
id 12 unban_account          done  "conta bantest_fable desbanida — já pode logar"
      → access_level=0, lastServer=1, unbanned_at/unbanned_by preenchidos
id 13 ban_account            done  (+ expires_at forçado pro passado → scheduler desbaniu sozinho em ≤40s, unbanned_by='auto-expire')
id 14 broadcast              done  ← veio de scheduled_gm_commands id 1: agendado pra +20s, disparado no tick seguinte (16s depois)
scheduled id 2: cancelado OK · re-cancelar → 409 · cancelar já-disparado → 409 · agendar no passado → 400
GET /account-bans e GET /scheduled-commands → 200 com DTOs corretos
```
Conta de teste `bantest_fable` e registros de teste removidos no final.

## 6. Como o JOs testa (2 min)

1. **Ban**: `/admin/moderation/bans` → PIN → preencher login real + motivo + "24 horas" → Banir conta → badge vira `[OK] Concluído`; a linha aparece em "Bans ativos". Tentar logar no jogo com a conta → recusado. "Desbanir" → volta a logar.
2. **Broadcast agendado**: `/admin/scheduled-broadcasts` → PIN → mensagem + daqui 2 min → Agendar. Em até ~2min30s o status vira "disparado" e quem estiver in-game vê o shout.
3. **Anúncio com shout**: `/admin/announcements` → marcar o checkbox → Publicar. Site ganha o anúncio E os jogadores online veem o shout na hora.

## 7. Pendências

- **P2** `/api/admin/bans` não tem PATCH (desvio documentado acima — unban vai pela fila GM).
- **P3** Ban NÃO derruba sessão que está só no login server (lobby de seleção de char) — o kick é via World (in-game). O `access_level=-100` impede o ENTRAR; a janela é de segundos e irrelevante na prática.
- **P3** `scheduled_gm_commands` aceita qualquer type da fila — a UI só cria `broadcast` por ora; agendar ban/give_item é trivial no futuro.
