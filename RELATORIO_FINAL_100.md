# RELATÓRIO FINAL — l2impure.com fechado em 100%

> Fable, 2026-07-11. Missão: fechar o projeto site-launch sem pendência
> técnica do meu lado. Branch `arq-definitiva`, deploy Railway
> confirmado no ar (commit `4dc09aa`, validado com 24/24 checks verdes
> contra produção às 02:08 BRT).

## 1. Estado consolidado por área

### Site (Next.js 16 @ Railway)
- 11 páginas públicas no ar, todas 200: `/`, `/hibridos`, `/roadmap`,
  `/faq`, `/regras`, `/sobre`, `/termos`, `/privacidade`, `/download`,
  `/register`, `/login`.
- **404 customizada** no ar (rota inexistente → 404 com logo, CTA "voltar
  pra home" + "pedir ajuda no Discord"). Nunca 500.
- **Ícones completos**: `favicon.ico` (16/32/48 multi-size),
  `icon.png` 512², `apple-icon.png` 180² com fundo do site,
  `manifest.webmanifest` PWA — tudo gerado do logo oficial e servido
  pelas file conventions do App Router.

### SEO
- `sitemap.xml` XML válido com as páginas públicas e prioridades.
- `robots.txt` 200; meta OG + Twitter card completos no HTML renderizado
  (título, descrição, og.png 1200×630, locale pt_BR); JSON-LD; HSTS com
  preload; títulos sem sufixo duplicado (fix `c94dedc`).
- **Google Search Console/GA4**: bloqueado por login Google — guia de
  15 min pronto em `SETUP_GOOGLE.md` (GSC primeiro; indexar leva semanas).

### Comunicação site ↔ servidor (o trabalho invisível desta rodada)
- `COMUNICACAO_SITE_SERVIDOR.md` completo: diagrama de topologia, tabela
  endpoint × auth × cache × timeout × fallback, runbook "a VPS caiu",
  riscos residuais. Espelhado no repo antigo (`/mnt/c/Projetos/l2impure/`).
- **Hardening entregue e deployado**:
  - Timeouts na bridge: reads 4s / writes 12s / restart 60s → erro limpo
    502/504, o site nunca trava esperando a VPS.
  - `cached()` com **stale-while-error**: snapshot de 24h serve o último
    dado bom quando a bridge cai. Nunca 500 no caminho público.
  - Rollback compensatório na criação de conta de jogo (bridge OK + PG
    falhou → DELETE na bridge; zero contas órfãs).
- **`GET /api/status` público NO AR** (e alias canônico
  `/api/server/status`): `{online, players, contas, timestamp,
  ageSeconds, stale}`, rate-limit 60/min/IP, CDN 15s, header
  `X-Data-Stale`. Validado: 200 em produção.
  (`chars` total exigiria release nova da bridge — documentado no §6 do
  COMUNICACAO; `contas` já sai do PG do site.)

### Sistema de voto
- Bridge: callbacks HopZone (GET+HMAC) e L2Top.CO (POST+IP whitelist),
  `/vote/check` assinado pro gameserver, log de callbacks. **Testado ao
  vivo**: 5 cenários de erro respondem 400/403 corretos, zero 500.
- Java no server: `VoteManager.java`, bypass handler e `build-vote.sh`
  commitados em `server/impure-classes/`.
- Recompensa in-game de ponta a ponta: só testável com o gameserver
  ligado + cadastro real no HopZone (item 10 do CHECKLIST_JOS).

### Backup da VPS (item FATAL do checklist)
- Sem SSH na VPS pra este agente (só o JOs tem) — então o trabalho foi
  empacotado pra virar **2 comandos de 1 minuto**:
  `scripts/setup-backup-vps.sh` (idempotente: mysqldump
  `--single-transaction` a cada 4h via `/etc/cron.d/`, retenção 7 dias,
  gancho rclone→R2 comentado, teste imediato no fim) + `BACKUP_VPS_GUIA.md`
  (instalação, off-site, teste de restore mensal, verificação).

### Secrets vazados (04/2026)
- `scripts/rotate-secrets.sh` pronto: gera JWT novos, aplica via Railway
  CLI se logado (senão imprime os comandos), lista os 2 passos manuais
  (SMTP na Hostinger, reCAPTCHA no console Google). 30 segundos de
  execução. Aviso embutido: rotação desloga todo mundo (indolor agora).

### Testes
- `scripts/smoke-test.sh` — 24 checks, **24/24 [OK]** contra produção.
- `scripts/chaos-test.sh` — baseline de 30s executado e documentado em
  `TESTES_CHAOS.md`; ensaio de queda real precisa do SSH do JOs (roteiro
  pronto no doc, 5 min).

## 2. Checklist "pronto pra tráfego pesado no launch"

| Item | Status | Nota |
|---|---|---|
| Páginas públicas 200 + zero placeholders | ✅ | validado ao vivo |
| SEO (sitemap, robots, OG, JSON-LD, HSTS) | ✅ | validado ao vivo |
| Ícones/manifest/404 | ✅ | validado ao vivo |
| API pública de status com cache + fallback | ✅ | nunca 500 por design; baseline medido |
| Site sobrevive à queda da VPS | ✅* | código + baseline OK; ensaio real = 5 min do JOs (TESTES_CHAOS.md) |
| CDN/Cloudflare na frente de tudo | ✅ | prerender + s-maxage; Railway atrás do CF |
| Vote callbacks sem 500 | ✅ | 5 cenários testados ao vivo |
| Vote end-to-end in-game | ⏳ | precisa gameserver ligado + cadastro HopZone (JOs, item 10) |
| Backup 4h na VPS | ⏳ | script pronto — **2 comandos do JOs** (item urgente abaixo) |
| Secrets rotacionados | ⏳ | script pronto — 30s do JOs + 2 trocas manuais |
| GSC + GA4 | ⏳ | conta Google — guia de 15 min pronto |
| MySQL 3306 fechado pra internet | ⏳ | `ufw deny 3306` após desligar API legada (COMUNICACAO §6.1) |

## 3. Riscos residuais REAIS (não teóricos)

1. **MySQL 3306 aberto na internet na VPS** — DB de L2 é alvo de
   bruteforce constante no nicho. Um vazamento de `accounts` pré-launch
   mata a confiança antes de existir comunidade. Fix: desligar a API
   legada no Railway → `ufw deny 3306`. (Detalhe: COMUNICACAO §6.)
2. **Zero backup até o setup-backup rodar** — hoje, um `rm -rf` ou disco
   morto na VPS = perda total. É literalmente 1 minuto de colar comando.
3. **Offset de players (55 com servidor offline)** — jogador L2 hardcore
   compara com `/who` in-game e chama de fake no fórum. Decisão de
   produto: zerar o offset no launch ou assumir o risco (COMUNICACAO §4).
4. **Secrets de abril ainda válidos** — quem tiver o log daquele chat
   assina JWT válido. Baixa probabilidade, dano alto, custo 30s.

## 4. Item URGENTE pro JOs fazer HOJE (1 coisa só)

**Instalar o backup na VPS — 2 comandos, 1 minuto:**

```bash
cd /mnt/c/Projetos/l2impure-arq
scp scripts/setup-backup-vps.sh root@76.13.170.153:/root/
ssh root@76.13.170.153 "MYSQL_PWD='SENHA_DO_MYSQL' bash /root/setup-backup-vps.sh"
```

O script já dispara um backup de teste no final e mostra o `.sql.gz`
criado. Tudo o resto do projeto tem plano B; perda do banco não tem.

## 5. Smoke test pra rodar amanhã (ou qualquer dia)

```bash
cd /mnt/c/Projetos/l2impure-arq && bash scripts/smoke-test.sh
```

24 checks em ~20s, saída `[OK]`/`[ERRO]` textual, exit 0 = tudo no ar.
Cobre: 11 páginas, SEO/PWA (sitemap, robots, favicon, manifest, og.png),
404 custom, HSTS, `/api/status` (com payload), bridge health e os 2
callbacks de voto. Sem depender de cor de terminal.

Versão de uma linha (sem repo, de qualquer máquina):

```bash
curl -s https://l2impure.com/api/status && curl -s -o /dev/null -w " site:%{http_code}\n" https://l2impure.com/
```

---

*Arquivos novos desta rodada:* `src/app/{favicon.ico,icon.png,apple-icon.png,manifest.ts,not-found.tsx}`,
`src/app/api/status/route.ts`, `src/app/api/server/status/route.ts`,
`src/lib/server-status.ts`, `scripts/{smoke-test,chaos-test,rotate-secrets,setup-backup-vps}.sh`,
`COMUNICACAO_SITE_SERVIDOR.md`, `BACKUP_VPS_GUIA.md`, `SETUP_GOOGLE.md`,
`TESTES_CHAOS.md` — mais o hardening em `src/lib/{bridge,redis}.ts` e o
rollback em `src/app/api/game/accounts/route.ts`.
