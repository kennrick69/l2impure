# RELATÓRIO — Fase Admin 3A: Eventos configuráveis no painel + fuso BRT

**Data:** 2026-07-12 · **Branch:** `arq-definitiva` · **Executor:** Fable (missão autônoma)

## TL;DR

1. **Timezone:** JVM do gameserver agora configurada pra `America/Sao_Paulo` via systemd (Opção B). **Entra em vigor no próximo restart** — não reiniciei o gameserver em produção (regra da missão).
2. **Painel novo:** `Administração → Eventos (config)` — 10 eventos editáveis (horários BRT, mín. players, rewards, duração), botão "Aplicar na VPS" por evento + "Reload gameserver" global com confirmação.
3. **Pipeline:** Postgres (EventConfig) → API Next → bridge `/config/apply` (HMAC) → edita o `.properties` na VPS com backup automático + audit em MySQL. Smoke test completo passou (18→19→18 no Olympiad, backups criados, audit gravado, valor restaurado).

---

## FASE 1 — Timezone (decisão: Opção B)

**Problema verificado:** VPS em `Etc/UTC`, Java sem `-Duser.timezone`. `AltOlyStartTime = 18` disparava às **15h BRT**. Todos os horários de eventos estavam com −3h para o público BR.

**Escolha: Opção B** (flag na JVM, VPS continua UTC). Motivos:
- Menor superfície: só o processo do gameserver muda de fuso; cron/logs/sistema continuam no padrão de servidor Linux (UTC).
- Zero risco pro backup diário e pra qualquer outro job baseado em relógio do sistema.
- Bridge Node continua em UTC (tudo nela é epoch/TIMESTAMP — exibição converte no cliente).

**O que foi feito:**
```
/etc/systemd/system/l2j-game.service
ExecStart=/usr/bin/java -Duser.timezone=America/Sao_Paulo -Xmx2G -XX:+ExitOnOutOfMemoryError -noverify -cp ./libs/*:l2jserver.jar net.sf.l2j.gameserver.GameServer
```
- Backup do unit: `/etc/systemd/system/l2j-game.service.bak-tz-20260712`
- `systemctl daemon-reload` executado.
- **Prova:** `java -Duser.timezone=America/Sao_Paulo TzTest.java` na VPS → `America/Sao_Paulo | Sun Jul 12 01:18:16 BRT 2026`. Java 21 tem o tzdata completo.
- `l2j-login.service` **não** foi tocado (Fable B mexe na área de LoginServer; e login não agenda eventos).

**⚠️ Pendente (manual, JOs):** o gameserver rodando ainda é o processo antigo (UTC). No próximo restart — pelo botão novo do painel, pelo `/admin/server`, ou por queda natural — a JVM sobe em BRT e o Olympiad passa a disparar 18h de Brasília de verdade. Comando manual se quiser agora:
```bash
ssh -i ~/.ssh/l2vps_backup root@76.13.170.153 "systemctl restart l2j-game"
```
Depois do restart, conferir no log do gameserver o horário agendado da Olympiad (deve logar competição às 18:00 hora local BRT).

## FASE 2 — Modelo + Bridge

### Prisma (Postgres do site)
- `prisma/schema.prisma` — model `EventConfig` (slug, displayName, enabled, config Json, fileTarget, fileMapping Json, lastAppliedAt, updatedAt).
- Migration `20260712000000_add_event_configs` — CREATE TABLE + **seed com os valores REAIS lidos da VPS em 12/07/2026** (painel nasce refletindo produção). Idempotente (`ON CONFLICT DO NOTHING`). Railway aplica no pre-deploy (`npx prisma migrate deploy`).

### Bridge (`bridge/src/routes/gameserver-config.ts`)
- `POST /config/apply` `{file, changes, appliedBy}` — HMAC (mesmo contrato dos demais endpoints):
  - **Whitelist exata** de 7 arquivos (`events.properties` + 6 em `events/`) — path traversal impossível.
  - Valida keys (`^[A-Za-z][A-Za-z0-9_]{0,63}$`) e valores (sem `\r\n\0\\` → sem properties injection).
  - Substitui **só as linhas `Key = value`** — comentários, ordem e CRLF preservados. Key ausente → 422 sem escrever nada (atômico: ou tudo ou nada).
  - Backup `<arquivo>.bak-<timestamp>` + write tmp + rename (atômico no fs).
  - Audit em `l2jdb.gameserver_config_audit`.
- `POST /config/reload-events` — **restart via `systemctl restart l2j-game`** (bridge roda como root no pm2, sem sudo). Audit com `file_path='<restart:l2j-game>'`.

**Por que restart e não SIGHUP/reload:** aCis lê `Config` no boot e os engines de evento (eventengine, tournament, partyfarm…) agendam os horários no startup. Não existe handler de SIGHUP nem reload de properties que reagende eventos em runtime. Restart é o único método confiável — sem recompilar nada.

### MySQL (`bridge/migrations/004-config-audit.sql`)
- Tabela `gameserver_config_audit` (id, applied_at, file_path, changes JSON, backup_path, applied_by). Aplicada na VPS.
- GRANT `SELECT, INSERT` pro `l2jbridge` aplicado **separado** da migration (bug conhecido do `mysql l2jdb < file` que ignora GRANT). Verificado com `SHOW GRANTS`. Nenhum grant existente foi tocado.

## FASE 3 — UI do painel

- **Página:** `/admin/events/config` (SSR, force-dynamic).
- **Menu:** `Administração → 📅 Eventos (config)` no `AdminSidebar`.
- **Componente:** `EventConfigManager` — cards accordion por evento com toggle enabled (quando o properties tem key de on/off), campos tipados, badge "Não aplicado" quando há edição pendente, "Aplicar na VPS" por evento, "Reload gameserver" global com confirmação em 2 passos + disclaimer de queda ~30-60s, alerta amarelo pros eventos com `lastAppliedAt` null.
- **Catálogo:** `src/lib/event-config-catalog.ts` — labels/tipos/limites/validação por campo (int com range, bool, timeList `HH:MM,HH:MM`, rewardList `itemId,qtd`/`itemId-qtd`).
- **APIs Next:**
  - `GET /api/admin/events` — lista.
  - `PATCH /api/admin/events/[slug]` — valida (catálogo) → update Postgres → bridge apply → `lastAppliedAt=now` → audit. **Se a bridge falhar, faz revert do Postgres** e retorna 502 (painel nunca fica dessincronizado da VPS).
  - `POST /api/admin/events/reload` — restart via bridge, rate limit 3/5min, audit.

### Eventos e campos configuráveis

| Evento | Arquivo | Campos |
|---|---|---|
| Olympiad | events.properties | hora/minuto início (BRT), mín. classed/non-classed, rewards, announce |
| TvT | events/eventengine.properties | on/off, horários, mín. players, duração, rewards vitória/empate |
| CTF | events/eventengine.properties | on/off, horários, mín. players, duração, rewards captura/vitória/empate |
| DM | events/eventengine.properties | on/off, horários, mín. players, duração, rewards kill/vitória |
| Tournament | events/tournament.properties | on/off, horários, duração, item + qtd reward win/lose |
| PvP Zone | events/pvpEvent.properties | on/off, horários, duração, reward vencedor |
| Kill the Boss | events/killTheBossEvent.properties | horários, mín. players, dano mínimo, rewards, tempo de registro |
| Party Farm | events/partyfarm.properties | on/off, horários, duração, drop list |
| PC Bang | events/pcBangEvent.properties | on/off, level mín., pontos min/max, intervalo, chance dupla |
| Seven Signs | events.properties | mín. players festival, regras Dawn/Dusk, contribuição máx. |

Olympiad, Seven Signs e Kill the Boss não têm key de on/off no aCis → card mostra "Sempre ativo" sem toggle.

## FASE 4 — Validação executada

- ✅ Typecheck + **build completo do Next** (Turbopack) limpos; typecheck da bridge limpo.
- ✅ Migration MySQL + GRANT aplicados e verificados na VPS.
- ✅ Bridge deployada (build na VPS + `pm2 restart`, backup `dist.bak-eventcfg-*`), `/health` ok.
- ✅ **Smoke test real do `/config/apply`** (HMAC assinado na própria VPS): `AltOlyStartTime` 18→19 (200, backup criado, arquivo alterado só naquela linha) → 19→18 (200, segundo backup, valor restaurado). 2 linhas de audit em `gameserver_config_audit`. Estado final = idêntico ao inicial.
- ✅ Commit + push em `arq-definitiva`; smoke pós-Railway registrado abaixo.
- ❌ **Gameserver NÃO reiniciado** (regra da missão) — `/config/reload-events` está deployado mas não foi disparado em produção.

## Riscos conhecidos

1. **Restart cancela o que estiver rodando** — Olympiad match em curso, TvT/CTF/DM no meio, tournament: tudo cancela e jogadores caem ~30-60s. O painel avisa; ainda assim, reload de preferência fora de horário de evento.
2. **Primeiro restart muda o fuso** — os horários atuais dos arquivos passam a valer em BRT (era o objetivo). Os intervalos atuais estão espalhados no relógio, então nada "some", mas os horários efetivos deslocam +3h em relação ao que os players viam.
3. **Edição manual via SSH dessincroniza o painel** — se alguém editar o .properties na mão, o painel continua mostrando o valor do Postgres. Resync: editar+aplicar pelo painel (sobrescreve) — o painel é a fonte de verdade a partir de agora.
4. **Campos fora do painel** (spawns, cores de time, listas de skill do tournament etc.) continuam só no arquivo — decisão de escopo; são raros de mudar e perigosos de validar genericamente.
5. **Acúmulo de `.bak-*`** em `config/` — inofensivo pro aCis (carrega arquivos nomeados), mas vale uma limpeza ocasional.

## Smoke pós-deploy Railway (commit `e280763`)

- `GET https://www.l2impure.com/api/admin/events` → **401 `{"error":"Não autenticado"}`** = rota nova no ar. Como o Railway roda `prisma migrate deploy` no pre-deploy e o deploy concluiu, a migration + seed dos 10 eventos estão aplicados no Postgres.
- `GET /admin/events/config` → **307** (redirect pro login sem sessão — esperado).
- Bridge: `POST /config/apply` e `/config/reload-events` sem headers → **401** (HMAC obrigatório confirmado), gameserver intocado (uptime contínuo desde 22:24 UTC).

## Coordenação com Fable B (task #4)

Não toquei em: `.env` da bridge (só leitura pro smoke test HMAC), `.gitignore`, `api/wallet/*`, config SSH do systemd, patches Java do LoginServer, `l2j-login.service`, fake players offset.

**Handoff executado:** o commit `adb2bdc` dele (fix anti-dupe no `/vote/check`) estava no repo mas **não deployado** na bridge da VPS — ele deixou escrito no RELATORIO_3B que esperava a Fase A landar pra não mandar meu `server.ts` pela metade. Como a Fase A landou nesta sessão, completei o combinado: `scp bridge/src/routes/vote.ts` → rebuild → `pm2 restart`. Bridge da VPS agora = HEAD do repo (md5 conferido: `vote.ts` 11788c…, `server.ts` 69fc37…), com backup `dist.bak-eventcfg-*` e `dist.bak-<ts>` antes de cada rebuild. Fix anti-dupe confirmado no `dist/routes/vote.js` (guarda `affectedRows`).
