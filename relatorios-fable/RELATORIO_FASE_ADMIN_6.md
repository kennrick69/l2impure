# Relatório — Fase Admin 6

**Data:** 2026-07-12 · **Branch:** `arq-definitiva` · **Base:** `8513b17`

Pedido do JOs: (1) editar a mensagem de login do server pelo painel; (2) campo
para Seven Signs "sempre ativo" vs calendário do servidor; (3) campos para
alterar o respawn dos epic bosses. Tudo dentro do painel `/admin/events/config`
existente (Fase 3A), mesmo pipeline Postgres → API Next → bridge `/config/apply`.

---

## BLOCO 1 — Welcome message multi-line ✅

**Como era:** mod legado do aCis em `custom.properties`
(`ActiveWellcomeMessageOnLogin` + `WellcomeMessageServerName` +
`WellcomeMessageSecondaryText`), hardcoded em 2 linhas no `EnterWorld`.

**O que foi feito (Opção A do briefing — config + patch Java mínimo):**

- **Keys novas** `WellcomeMessageLine1..5` adicionadas ao `custom.properties`
  da VPS (backup `custom.properties.bak-fase6-20260712_214634`). Linha 1
  nasceu com o texto que já rodava em produção.
- **Java:** classe nova `net.sf.l2j.gameserver.custom.WelcomeMessageData`
  lê as 5 keys direto do arquivo **em UTF-8** (Properties default é
  ISO-8859-1 e quebraria acento digitado no painel) — sem tocar na classe
  `Config` gigante. `EnterWorld` patcheado: se houver linha preenchida,
  manda cada uma como `CreatureSay` do remetente `WellcomeMessageServerName`,
  com `%player%` substituído pelo nome do jogador; se todas vazias, cai no
  comportamento legado byte a byte.
- **Painel:** card novo "Mensagem de Login" (categoria própria
  "Login / Boas-vindas"), com toggle on/off (`ActiveWellcomeMessageOnLogin`),
  campo remetente e **textarea multi-line** — cada linha do editor vira uma
  mensagem no chat (máx 5 linhas × 500 chars, validação nova tipo `multiline`
  no catálogo; a API expande em `WellcomeMessageLine1..5` e limpa as sobras).
- **Bridge:** `custom.properties` na whitelist do `/config/apply`.

**Evidência:** smoke na VPS — `POST /config/apply` HMAC em
`custom.properties` (`WellcomeMessageLine2` → "SMOKE TEST fase6" → "")
retornou 200 duas vezes, backups `custom.properties.bak-2026-07-12T21-48-08`,
2 linhas de audit em `gameserver_config_audit`, arquivo restaurado.

## BLOCO 2 — Epic boss respawn no painel ✅

**Descoberta (Config.java decompilado, produção):** 9 bosses com keys em
`npcs.properties` — Queen Ant, Antharas, Baium, Core, Orfen, Zaken, Valakas
(interval + random + **cron** `*RespawnTimePattern`) e Frintezza, Sailren
(**só interval** — aCis não tem key de cron pra eles). Pegadinha real do
aCis: interval do Queen Ant é `AntQueen*`, mas o cron é `QueenAnt*` —
mapeado corretamente no seed.

**O que foi feito:**

- 9 cards novos na seção "Epic Bosses — Respawn" (slugs `boss.*` no
  `event_configs` — reuso da tabela, sem tabela nova): campos
  "Respawn (horas)", "Variação aleatória (± horas)" e "Cron fixo (opcional)".
  Semântica igual à do aCis: **cron preenchido ignora o interval; cron vazio
  = modo interval** (o toggle de modo é o próprio campo, sem key fantasma).
  Tipo de campo novo `cron` com validação (5 campos, `30 20 * * *`, BRT).
- Seed da migration com os **valores reais da VPS de hoje** (7/1h maioria,
  Frintezza 48/8, Sailren 36/24, crons vazios).
- **Bridge:** `npcs.properties` na whitelist.
- Mudança vale na **próxima morte** do boss (respawn já agendado fica no
  MySQL `grand_boss_data`) + reload do gameserver — avisado no card.
  Botão "Reload gameserver" global já existia (aCis não tem hot-reload).

**Evidência:** smoke `POST /config/apply` em `npcs.properties`
(`CoreSpawnInterval` 7→8→7) — 2× 200, backup, audit, valor restaurado.

## BLOCO 3 — Seven Signs "sempre ativo" ✅ (com patch Java)

**Key nova** `SevenSignsAlwaysActive = False` em `events.properties`
(backup `events.properties.bak-fase6-20260712_214634`) + toggle "Sempre
ativo (ignora o calendário semanal)" no card Seven Signs do painel.

**Patch (`SevenSignsManager` decompilado com CFR do jar de produção):**

- `True` → o ciclo **congela no período COMPETITION** (Quest Event): coleta
  de seal stones + Festival of Darkness rodando sempre. Quando o timer
  semanal dispara, o período é apenas re-agendado (sem `calcNewSealOwners`,
  sem cancelar o Festival). Se o server estiver em outro período
  (RECRUITING/RESULTS/SEAL_VALIDATION), avança em fast-forward de 15 min
  por período até chegar em COMPETITION — inclusive no boot.
- `False` (default) → **calendário normal**, fluxo original intacto.
- Trade-off documentado: com always-active os seals nunca entram em
  validação (Mammon/Lilith/Anakim não spawnam) — é o preço de manter a
  competição aberta. Reversível a qualquer momento pelo painel + reload.
- Bônus: corrigido artefato do CFR em `restoreSevenSignsData()` (`ps` usado
  fora do escopo do try-with-resources — não compilava).

**Evidência:** compile limpo (`javac 21`), 6 classes injetadas e verificadas
no jar; boot com flag `False` mostra fluxo normal:
`Next Seven Signs period change set to Mon Jul 13 18:00:00 BRT 2026` —
patch dormente até ligar no painel.

## BLOCO 4 — Deploy ✅

| Item | Status |
|---|---|
| Backup jar | `l2jserver.jar.backup-fase6-20260712_214634` |
| Build+inject Java | `build-fase6.sh` (espelho do pipeline gmqueue), 6 classes OK |
| Restart gameserver | 21:47 UTC com **0 players online** (checado imediatamente antes) — boot limpo: `GmCommandPoller: started` + `Registered as server: [1] Bartz`. Fake players :55 intacto (offset do site, não tocado) |
| Bridge VPS | `dist.bak-fase6-20260712_214721` → rsync → `pm2 restart` → `/health` ok; whitelist nova confirmada no `dist` |
| Migration | `20260712150000_add_welcome_bosses_configs` — INSERT welcome + 9 bosses (`ON CONFLICT DO NOTHING`) + UPDATE sevensigns (`alwaysActive` no config/fileMapping, com guard) — Railway aplica no pre-deploy |
| Site Railway | push `18b0ad7` → deploy Railway **success** 21:52 UTC (GitHub deployment status "Success - www.l2impure.com"); `GET /api/admin/events` → 401 (rota viva); home 200; `l2j-game`/`l2j-login` active; bridge online |

**Rollbacks:**
- Java: `cp /root/l2j-server/gameserver/libs/l2jserver.jar.backup-fase6-20260712_214634 /root/l2j-server/gameserver/libs/l2jserver.jar && systemctl restart l2j-game`
- Properties: `.bak-fase6-*` em `/root/l2j-server/gameserver/config/`
- Bridge: `dist.bak-fase6-*` + `pm2 restart l2impure-bridge`
- Postgres: rollback comentado no cabeçalho da migration

## Arquivos tocados

- `src/lib/event-config-catalog.ts` — tipos `cron`/`multiline`, categorias, welcome + 9 bosses + campo alwaysActive, `expandMultilineChanges`
- `src/app/api/admin/events/[slug]/route.ts` — expansão multiline → Line1..5
- `src/components/admin/EventConfigManager.tsx` — textarea, seções por categoria, contador só de eventos com on/off, texto por card de boss
- `prisma/migrations/20260712150000_add_welcome_bosses_configs/migration.sql`
- `bridge/src/routes/gameserver-config.ts` — whitelist +2 arquivos
- `server/impure-classes/java/.../custom/WelcomeMessageData.java` (novo)
- `server/impure-classes/java/.../clientpackets/EnterWorld.java` (patch)
- `server/impure-classes/java/.../data/manager/SevenSignsManager.java` (novo, decompilado+patch)
- `server/impure-classes/build-fase6.sh` (novo)

## Pendências

- **Smoke visual no browser:** o card novo foi validado por código + API; não
  abri browser real no painel (sem sessão admin nesta máquina). Primeiro
  "Aplicar" de cada card novo mostra o alerta amarelo "nunca aplicado" — esperado.
- **Welcome nova em jogo:** a mensagem multi-line aparece no próximo login de
  jogador (classe carrega no primeiro EnterWorld). Legado continua idêntico
  se as linhas forem apagadas.
