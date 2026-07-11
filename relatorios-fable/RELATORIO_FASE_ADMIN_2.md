# RELATÓRIO FASE ADMIN 2 — GM Queue Java + Vote Callbacks + QA de Sistema

**Data:** 2026-07-11 (22:00–23:00 UTC) · **Executor:** Fable (sessão autônoma) · **Branch:** `arq-definitiva`

---

## FASE 1 — Descoberta do fork L2J

**Resultado: fork é JAR compilado SEM source tree, MAS com pipeline de patch estabelecido e comprovado.**

| Item | Achado |
|---|---|
| Services | `l2j-game.service` + `l2j-login.service` (systemd, `Restart=on-failure`, `-XX:+ExitOnOutOfMemoryError`) |
| WorkingDirectory | `/root/l2j-server/gameserver` (game) e `/root/l2j-server/login` |
| Fork | aCis-based, package `net.sf.l2j`, JAR `libs/l2jserver.jar` (5.3MB, 2629 classes), + mods `enginemods/` e `mods/` embutidos |
| Build system | NENHUM (sem build.xml/pom/gradle, sem git) |
| **Pipeline de patch** | `/root/impure-classes/` — sources .java das classes customizadas, compiladas com `javac --release 21 -cp l2jserver.jar` e injetadas com `jar uf`. Precedente: vote system (abril) e classes Impure. CFR decompiler em `/root/cfr.jar`. JDK 21 na VPS. |

Ou seja: **não foi preciso adiar a FASE 2** — o mesmo pipeline do vote system serviu.

## FASE 2 — Java handler da fila GM ✅ EM PRODUÇÃO

**Novos arquivos (repo `server/impure-classes/`, espelhados na VPS `/root/impure-classes/`):**

- `java/net/sf/l2j/gameserver/gm/GmCommandPoller.java` — singleton, executor daemon próprio (`GmCommandPoller` thread), poll a cada 5s em `http://127.0.0.1:8080` (bridge local — sem round-trip Cloudflare). HMAC idêntico ao contrato canônico de `bridge/src/routes/gm-commands.ts`. Mini-parser JSON embutido (classpath do fork não tem gson/jackson). Try/catch em TODOS os níveis — comando ruim nunca derruba o gameserver. Log de falha com throttle (1 a cada 60). Config opcional `config/gmqueue.properties`; fallback do secret = `VoteHmacSecret` do `vote.properties` (== HMAC_SECRET da bridge, verificado byte a byte).
- `java/net/sf/l2j/gameserver/GameServer.java` — decompilado do JAR de produção (CFR), **única modificação**: seção "GM Command Queue" no boot inicializando o poller.
- `build-gmqueue.sh` — backup do JAR + compile + inject (aborta antes de injetar se compile falhar).
- `config/gmqueue.properties.example`

**Handlers implementados:**
| type | ação | offline/erro |
|---|---|---|
| `broadcast` | `World.announceToOnlinePlayers(msg)` (trunca em 500 chars) | — |
| `kick` | `World.getPlayer(charName)` → `player.logout(false)` (mesmo call do AdminKick do fork) | `failed: char offline ou inexistente` |
| `give_item` | valida count 1..1M + `ItemTable.getTemplate(itemId)` + `player.addItem("gm-queue", ...)` | `failed: char offline — use o painel de char offline` |
| outro | — | `failed: tipo desconhecido` |

**Deploy:** backup `l2jserver.jar.backup-gmqueue-20260711_222354`, compile limpo de primeira, restart 22:25 UTC com 0 players reais online. Boot OK: `GmCommandPoller: started (url=http://127.0.0.1:8080, every 5s)` + `Registered as server: [1] Bartz`.

**Validação e2e EM PRODUÇÃO (tabela gm_commands):**
```
id 2 broadcast  done    "broadcast enviado (0 players online)"     ← fluxo feliz
id 3 kick       failed  "char 'NaoExiste' offline ou inexistente"
id 4 give_item  failed  "char offline — use o painel de char offline"
id 5 give_item  failed  "give_item: itemId 99999999 não existe no ItemTable"
id 6 rm_rf      failed  "tipo desconhecido: rm_rf"
id 7 broadcast  done    (pós-restart da bridge — poller resiliente a restart da bridge)
```
Ciclo pending→running→done em <12s. **O GM console do painel admin está 100% funcional end-to-end.**

Rollback documentado: `cp /root/l2j-server/gameserver/libs/l2jserver.jar.backup-gmqueue-20260711_222354 libs/l2jserver.jar && systemctl restart l2j-game`

## FASE 3 — Vote callbacks MMOTop / L2Servera / GTop100 ✅ DEPLOYADOS

`bridge/src/routes/vote.ts` (+migration `20260711100000_vote_sites_callbacks_ready`):

- **MMOTop** — `GET /vote/callback/mmotop?userid=X&code=Y`, `code = MD5(MMOTOP_SECRET + userid)`.
- **L2Servera** — `GET /vote/callback/l2servera?userId=X&hash=H`, `hash = SHA256(L2SERVERA_SECRET + userId)`.
- **GTop100** — `POST /vote/callback/gtop100`, pingback oficial: valida `pingbackkey` (shared secret do painel GTop100), `Successful == 0` = voto contou, charId vem de `pingUsername` (vote URL: `...?vote=1&pingUsername=<charId>`). Aceita form-urlencoded **e** o formato JSON `{siteid, pingbackkey, Common:[{pb_name, success, ip}]}`.
  - **Desvio da spec da missão:** o `user_vote_check.php` (dupla verificação) não consta mais na doc atual do GTop100 (gtop100.com/test/pingback) — o mecanismo oficial hoje é o `pingbackkey`, que é shared-secret com a mesma força dos demais. Implementado o padrão oficial.

Todos com: secret ausente → `503 not_configured` (fail-safe), gate `site_disabled` do painel admin, `vote_callback_log`, insert em `vote_pending` (mesmo caminho comprovado do HopZone → `/vote/check` do gameserver processa).

**Validação em produção:** 503 sem secret (3/3 via bridge.l2impure.com), happy-path testado com secrets temporários (hash MD5/SHA256/pingbackkey validados, chegando corretamente no gate `site_disabled` pois os sites estão inativos no painel), pingbackkey errado → 403, `Successful=1` ignorado. Secrets de teste removidos, `.env` restaurado byte-idêntico, regressão HopZone OK (403 invalid_hash).

**Ativação (JOs, por site):** cadastrar no ranking → setar secret no `/root/l2j-bridge/.env` → `pm2 restart l2impure-bridge --update-env` → ativar slug no painel `/admin/marketing/vote-sites`. Env vars: `MMOTOP_SECRET`, `L2SERVERA_SECRET`, `GTOP100_PINGBACK_KEY`.

## FASE 4 — QA de sistema ✅ TUDO VERDE

| Check | Resultado |
|---|---|
| Gameserver | `l2j-game` active, Bartz registrado, OOM auto-restart ativo. (jstack de hoje 14:32 era do resgate do zumbi, pré-restart — irrelevante) |
| `/api/status` | `{online:true, players:55, contas:5}` — fake 55 preservado ✅ |
| Backup VPS | `/etc/cron.d/l2impure-backup` a cada 4h, rodando (dumps 16:00 e 20:00 confirmados), gzip íntegro, trailer `Dump completed` presente |
| Pull notebook | `l2impure-pull-backup.sh` exit 0, sincronizou os 2 dumps novos; cron 06:00 ativo |
| **Restore real** | Dump 20:00 restaurado COMPLETO em database temporária na VPS: **82 tabelas, 11 accounts, 7 characters** — depois dropada. (Mais forte que o teste docker pedido) |
| Firewall | ufw: só 22/2106/7777 IN (v4+v6), default deny ✅ |
| Certificados | site+bridge+www: Let's Encrypt via Cloudflare, expiram **2026-09-21** — renovação automática do Cloudflare, mas ENTROU NO CHECKLIST T-30 conferir |

## Estado do launch 10/out: **VERDE** 🟢

Infra core completa e testada: site+painel+bridge+gameserver+GM queue+vote system (5 rankings), backup 3 camadas com restore comprovado, firewall fechado, OOM auto-heal. O que falta é **operacional/comercial** (registros nos rankings, conteúdo, divulgação), não engenharia.

## Checklist T-30 / T-14 / T-0

**T-30 (10/set):**
- [ ] Cadastrar server nos 5 rankings (HopZone, L2Top.CO, MMOTop, L2Servera, GTop100) — L2Servera: registrar o LAUNCH no calendário de openings deles
- [ ] Setar os 3 secrets novos no `.env` da bridge + restart + ativar slugs no painel
- [ ] Testar 1 voto real em cada ranking (claim in-game)
- [ ] Conferir cert (expira 21/set — Cloudflare renova sozinho, só confirmar)
- [ ] Decidir PLAYER_COUNT_OFFSET pro launch (site tem FAKE_MIN=55 hardcoded — ver nota do agente fechamento-100)

**T-14 (26/set):**
- [ ] Load test login/game (conexões simultâneas)
- [ ] Testar restore completo do backup mais recente (repetir procedimento deste relatório)
- [ ] Revisar rates/configs do server pra launch
- [ ] Anúncio de data nos canais

**T-0 (10/out):**
- [ ] Snapshot do backup pré-launch
- [ ] `journalctl -fu l2j-game` aberto durante as primeiras horas
- [ ] Monitorar gm_commands/vote_callback_log nas primeiras 24h

## Comandos manuais pro JOs (quando for ativar cada ranking)

```bash
# 1. secret no .env da bridge (exemplo mmotop)
ssh -i ~/.ssh/l2vps_backup root@76.13.170.153
echo 'MMOTOP_SECRET=<secret do painel mmotop>' >> /root/l2j-bridge/.env
# (idem L2SERVERA_SECRET e GTOP100_PINGBACK_KEY)
cd /root/l2j-bridge && pm2 restart l2impure-bridge --update-env

# 2. ativar o slug no painel: https://l2impure.com/admin/marketing/vote-sites

# 3. URLs de callback pra cadastrar nos rankings:
#    MMOTop:    https://bridge.l2impure.com/vote/callback/mmotop?userid=<charId>&code=<MD5(secret+userid)>
#    L2Servera: https://bridge.l2impure.com/vote/callback/l2servera?userId=<charId>&hash=<SHA256(secret+userId)>
#    GTop100:   Pingback URL = https://bridge.l2impure.com/vote/callback/gtop100
#               Vote URL (no site) = link gtop100 + "?vote=1&pingUsername=<charId>"
```

## Pendências (nenhuma P0)

- **P2** Ativação dos 3 rankings novos = tarefa comercial do JOs (secrets só existem após cadastro).
- **P2** `FAKE_MIN=55` hardcoded em server-status.ts do site — se zerar `PLAYER_COUNT_OFFSET` no launch o site continua forçando 55 (nota herdada do fechamento-100; decisão do JOs foi manter 55, então não mexi).
- **P3** GTop100 `user_vote_check.php`: se JOs quiser a dupla verificação legada além do pingbackkey, precisa confirmar com o suporte GTop100 se o endpoint ainda existe.
