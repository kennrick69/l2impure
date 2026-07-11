# RELATÓRIO FINAL 100% — v2 (QA interno via SSH)

> Fable, 2026-07-11 ~14:50 UTC. Instrução do JOs: *"não posso testar nada
> agora, você vai ter que se garantir interno... seguir a linha."* Então
> **eu fui o único QA**: SSH na VPS (`~/.ssh/l2vps_backup`), curl contra
> produção, MySQL direto, simulação de falha e rollback. Cada item abaixo
> tem o comando e o output que provam. Onde não deu pra provar, está
> marcado como risco explícito — não como "pronto".

Diferença pro `RELATORIO_FINAL_100.md` anterior: aquele fechou o **site**
com scripts prontos "pro JOs rodar". Esta rodada **rodou tudo** e no
caminho achou 4 coisas quebradas em produção que o relatório anterior não
tinha como saber (não tinha SSH). Todas corrigidas e testadas.

---

## 1. Itens FECHADOS com evidência

### [X] Backup 4h da VPS — o único risco fatal
- Testado com: `ssh root@VPS 'cat /etc/cron.d/l2impure-backup; ls -lh /var/backups/l2impure/; /usr/local/bin/l2impure-backup.sh'`
- Resultado: cron `0 */4 * * *` instalado; **2 dumps** no disco
  (`l2jdb-20260711-141949.sql.gz` e `-144737.sql.gz`, 393K cada); dump
  íntegro (`81 CREATE TABLE`, termina em `-- Dump completed`). Rodei um
  backup manual e o `.log` registrou `[OK]`. [OK]
- Pendência menor: off-site (rclone→R2) segue comentado no script — local
  já vale infinitamente mais que o zero de antes. Risco: **médio** (disco
  único). Mitigação: 1 linha do JOs após `rclone config`.

### [X] MySQL 3306 fechado pra internet (era CRÍTICO)
- Testado com: `bind-address=127.0.0.1` no `mysqld.cnf` + `ufw` sem 3306 +
  do meu lado `bash -c '</dev/tcp/76.13.170.153/3306'`
- Resultado: `[OK] 3306 inacessível de fora`. `mysql.user` não tem nenhum
  host `%` (confirmado), então nem com credencial vazada dá pra entrar
  remoto. Backups: `mysqld.cnf.bak-20260711` + `iptables.pre-fw-20260711.bak`. [OK]

### [X] Porta 9014 fechada pra internet
- Testado com: `bash -c '</dev/tcp/76.13.170.153/9014'` de fora
- Resultado: `[OK] 9014 inacessível de fora`. Identificada como canal
  login↔game interno; gameserver re-registra por `127.0.0.1:9014`
  ("Registered as server: [1] Bartz" no log). [OK]

### [X] GameServer online (site mostrava online:false)
- Achado: JVM do gameserver **travada** (jstack timeout, accept-queue de
  7777 cheia, uptime 75 dias). Login e game viviam de conexão de pool
  velha; qualquer reconexão batia `Access denied for user 'root'@'localhost'`
  (root é `auth_socket`, e o user `l2jserver` do loginserver **nem existia**).
- Fix testado com: criar user `l2jserver`@{localhost,127.0.0.1}
  (`mysql_native_password`, senha = a do `loginserver.properties`),
  `GRANT ALL ON l2jdb.*`, apontar gameserver pro mesmo user, restart de
  login e game.
- Resultado: boot com **0 SEVERE**; `</dev/tcp/.../7777` aceita;
  `/api/status` público virou `online:true`. Backup config:
  `server.properties.bak-20260711`. [OK]

### [X] API pública de status — nunca 500, com fallback real
- Testado com: `bash scripts/smoke-test.sh` → **24/24 [OK]**; payload
  `{"online":true,"players":55,"stale":false,"contas":5}`.
- Fallback validado com **chaos real** (derrubei a bridge por 60s via
  `pm2 stop`): 16 amostras a cada 4s. `/api/server/status` = **200 nas
  16** (nunca 500), `bridge/health` = 502 durante o corte (esperado),
  latência do site sempre < 1.05s, e voltou a `ageSeconds:0` quando a
  bridge subiu. Amostras salvas em `scratchpad/chaos-samples.txt`. [OK]

### [X] Voto — callbacks ponta a ponta (HopZone + L2Top.CO + /vote/check)
- Testado com: callback HopZone **assinado com o HMAC_SECRET real**,
  seguido de `/vote/check` assinado (simula o gameserver), lendo o MySQL
  a cada passo, com cleanup no fim.
- Resultado: sem params → 400; hash inválido → 403; callback válido →
  `{"ok":true}` + linha em `vote_pending`; `/vote/check` → `{"ok":true}`
  + `claimed=1` + linha em `vote_cooldown`; 2ª chamada →
  `no_pending_vote`. Todas as linhas de teste (char 999999) removidas. [OK]

### [X] Bridge com o build CORRETO em produção
- Achado grave: às 14:33 UTC um rebuild na VPS usou o `src/` **antigo**
  de `/root/l2j-bridge` (só 4 rotas) e derrubou vote/rankings/admin/icons
  → **callbacks de voto davam 404 em produção**.
- Fix testado com: build do fonte canônico (`bridge/` deste repo) →
  `grep -c register(` = **14 rotas**; deploy do dist; `pm2 restart`;
  `curl /health` = 200; re-teste de voto completo (acima) passou.
- dist quebrado preservado em `/root/l2j-bridge/dist.broken-20260711/`. [OK]
- **Regra gravada no COMUNICACAO §6.1: NUNCA buildar da VPS.**

### [X] Forja de voto L2Top.CO fechada
- Achado: `L2TOP_CO_WHITELIST_IPS` não existia no `.env` → whitelist
  vazia → POST forjado de qualquer IP retornava "OK" e gravava voto.
- Fix testado com: whitelist placeholder-bloqueante (`127.0.0.2`);
  re-POST forjado → `{"error":"ip_not_whitelisted"}` 403. [OK]
- **Ação do JOs ao cadastrar no l2top.co:** trocar `127.0.0.2` pelo IP de
  callback que o painel deles informar (COMUNICACAO §6.1, item l2topco).

### [X] Site — 24 checks de superfície
- `smoke-test.sh` 24/24; 11 páginas 200; SEO/PWA (sitemap, robots,
  favicon, icon, apple-icon, manifest, og.png) 200; 404 custom; HSTS.
- Conteúdo: 6 páginas-chave com `<title>` correto, OG presente, **zero**
  `undefined/null/Error/placeholder`, **zero** `href="#"`.
- Auth API: register sem captcha → 400 limpo; payload inválido → 400;
  login errado → 401 "Email ou senha incorretos"; `/api/auth/me` sem
  sessão → `{"user":null}` 200. Nenhum 500 em lugar nenhum. [OK]

---

## 2. Itens NÃO fechados internamente (risco explícito)

### [?] Registro real de usuário do site (cria linha em `users`)
- **NÃO testado** ponta a ponta: `/api/auth/register` exige reCAPTCHA v3
  (`verifyRecaptcha`), e produção tem `RECAPTCHA_SECRET_KEY` setado — sem
  token do browser, para em 400 "Falha na verificação anti-bot" (que é o
  comportamento correto). Não tenho browser nem o `RECAPTCHA_DISABLED`
  (é env do Railway, sem CLI logado).
- O que **provei**: o caminho de erro é limpo (400, não 500) e a validação
  Zod/rate-limit funciona. O caminho feliz (INSERT no Postgres + email de
  verificação) não foi exercido.
- Risco: **baixo** (código revisado, com rollback de referral e retry de
  colisão; a mesma lógica roda hoje em produção). Mitigação: o JOs cria 1
  conta real no browser no primeiro acesso — 2 min.

### [?] Recompensa de voto IN-GAME (Java)
- **NÃO deployado**: `VoteManager.java`/`Vote.java` existem no repo
  (`server/impure-classes/`) mas **não estão no jar rodando** (`unzip -l
  l2jserver.jar | grep -i vote` = 0). A bridge registra o voto no MySQL
  corretamente; falta o gameserver **consumir** e dar o item.
- **Não recompilei** de propósito: rebuildar o fork L2J às cegas
  arriscaria o gameserver que acabei de tirar do travamento. É o item 10
  do CHECKLIST_JOS, que já dependia de "gameserver ligado + cadastro real
  no HopZone".
- Risco: **médio** pro produto (voto não premia jogador ainda), **zero**
  pra estabilidade. Mitigação: tarefa dedicada de compilar+deployar as
  classes Impure num ambiente de staging antes do launch (M1/M2).

### [?] Secrets vazados (abril) — rotação
- **NÃO executado**: `rotate-secrets.sh` precisa do Railway CLI logado
  (não disponível pro agente) pra aplicar `JWT_SECRET`/`JWT_REFRESH_SECRET`,
  e SMTP/reCAPTCHA são painéis de terceiros.
- Risco: **médio** (dano alto, probabilidade baixa). Mitigação: 30s do
  JOs — `bash scripts/rotate-secrets.sh` + 2 trocas manuais. Indolor
  pré-launch (desloga uma base de usuários ainda pequena).

### [?] API legada v1.2.0 no Railway (zumbi)
- Responde 200 na raiz, mas `/api/rankings/server/status` agora dá
  **timeout** (HTTP 000) — o MySQL remoto dela morreu com o fecho da 3306.
  Ou seja: sem fonte de dado divergente e sem superfície de auth utilizável.
- Risco: **baixo**. Mitigação: desligar o serviço no Railway na próxima
  vez que o JOs logar (higiene, não urgência).

### [?] Offset de players = 55 (produto)
- `PLAYER_COUNT_OFFSET=55`, `playersRaw:0`. Decisão consciente do JOs
  antes do launch (zerar ou assumir). Não é bug.

---

## 3. Alterações que ficaram no working tree (não commitadas)

- `COMUNICACAO_SITE_SERVIDOR.md` §6 reescrito + §6.1 (incidentes do dia).
- `scripts/smoke-test.sh`: check do l2topco ajustado pra 403 (whitelist
  roda antes do payload) — reflete o fix de segurança.
- Este relatório em `relatorios-fable/`.
- Não commitei nem dei push (não foi pedido; e a branch `arq-definitiva`
  auto-deploya no Railway — melhor o JOs revisar antes). Nada aqui toca
  `src/`, então não muda o site no ar.

## 4. Estado final da VPS (snapshot)

```
Portas públicas:  22 (ssh), 2106 (login game), 7777 (game)   ← só essas
Fechadas p/ fora: 3306 (mysql), 9014 (login↔game interno)
Serviços:         l2j-login active | l2j-game active (0 SEVERE) | mysql active
Bridge pm2:       online, 14 rotas, /health 200
Backups:          cron 4h ativo, 2 dumps no disco, dump íntegro
Site:             smoke 24/24, /api/status online:true, chaos 16/16 sem 500
```

## 5. O que o JOs precisa fazer (nada é bloqueador de estabilidade)

1. `rotate-secrets.sh` + SMTP/reCAPTCHA (30s) — segurança.
2. Ao cadastrar no l2top.co: trocar `L2TOP_CO_WHITELIST_IPS` do
   placeholder `127.0.0.2` pro IP real (senão votos legítimos = 403).
3. Compilar+deployar as classes Impure de voto in-game (staging antes).
4. Configurar off-site do backup (`rclone config` + descomentar 1 linha).
5. Desligar a API legada no Railway (higiene).

**Regra que segui:** onde não tenho evidência (log/output) de que
funciona, marquei como risco — não como fechado.
