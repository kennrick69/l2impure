# L2 Impure — Documentação Mestre do Projeto

> **Para o Claude Code:** Este é o documento de contexto. Leia-o inteiro antes
> de fazer qualquer alteração. Ele contém o estado exato onde paramos,
> decisões arquiteturais tomadas, credenciais (em placeholders), e os próximos
> passos. **Nunca commitar secrets reais neste arquivo** — eles ficam em
> `.env.local` (gitignored) e em `ACESSOS-FASE1-CLAUDE-CODE.txt` (na pasta
> Downloads do usuário).

---

## 1. Identidade do Projeto

- **Nome:** L2 Impure
- **O que é:** Servidor privado de Lineage 2 Interlude
- **Diferencial (planejado, não anunciado no site ainda):** **Sistema de
  Híbridos** — combina 2 classes lvl 78 em um personagem com skills das
  duas (sistema de cromossomos, documentado em
  `L2-IMPURE-CLASSES-IMPURAS-v2.md`). É **Fase 5** do roadmap. Toda
  menção foi REMOVIDA do UI público em 2026-04-25 (commit `ddc62ce`)
  pra não anunciar feature inexistente — só voltar a aparecer quando
  tiver tabela SQL + bridge endpoint + tela funcionando.
- **Rates:** x10 XP/SP/Drop/Adena, Spoil x10, Raid x5
- **Features complementares:** Auto-Farm, Olympiad dupla (normal + híbrida),
  Eventos 24/7 (DeathMatch, TvT, CTF), Rebirth lvl 81→84 com +3 stats
- **Status de lançamento:** Beta aberto — "EM BREVE" (data a definir)
- **Idioma principal:** pt-BR (UI suporta ainda en + es, com setlocale)

## 2. URLs & Acessos (público)

| Item | URL |
|---|---|
| Repositório | https://github.com/kennrick69/l2impure |
| Deploy Next.js (branch `arq-definitiva`) | https://l2impure-production-49e6.up.railway.app |
| Deploy legado Express (branch `main`) | https://l2impure-production.up.railway.app |
| Domínio futuro | https://l2impure.com (Cloudflare → Railway quando promovido) |
| Admin reCAPTCHA | https://www.google.com/recaptcha/admin/site/751359679 |
| Console Google reCAPTCHA (criação) | https://www.google.com/recaptcha/admin/create |
| Painel Railway | https://railway.app |
| Painel Hostinger (SMTP + domínio) | https://hpanel.hostinger.com |
| Owner GitHub/Railway | kennrick69 |
| Email admin (GitHub/Railway/Hostinger) | kennrick@gmail.com |
| Email da conta Resend | ocaradaia.br@gmail.com |
| Email SMTP sender / Resend FROM | admin@l2impure.com |

## 3. Branches git (GitHub)

| Branch | Conteúdo | Status |
|---|---|---|
| `main` | Site HTML/CSS/JS vanilla + Express (`server.js`) — original | Railway antigo roda daqui |
| `legacy-express` | Snapshot do `main` antes da migração | Arquivado |
| `arq-definitiva` | Next.js 16 + Postgres + Redis + auth completo (Fase 1) | **Atual — trabalhar aqui** |

Nunca mergear `arq-definitiva` em `main` sem validar primeiro — o deploy em
produção do domínio l2impure.com depende disso.

## 4. Stack Final (L2-IMPURE-ARQUITETURA-DEFINITIVA)

| Camada | Tecnologia | Onde roda |
|---|---|---|
| Frontend + Backend | **Next.js 16 (App Router, Turbopack)** + React 19 | Railway |
| Linguagem | TypeScript strict (`tsconfig.json`) | - |
| CSS | Tailwind v4 + shadcn base-nova + CSS vars | - |
| Fontes | Oswald (display) + Open Sans (corpo) via `next/font/google` | - |
| DB usuários | **PostgreSQL via Prisma 6** | Railway (addon) |
| Cache / rate-limit | **Redis via ioredis** | Railway (addon) |
| DB do jogo | MySQL 8 (já existente, L2J) | VPS 76.13.170.153 (localhost:3306) |
| Bridge VPS | Node.js/Fastify (**Fase 3, ainda não construído**) | VPS:8080 atrás de Cloudflare Tunnel |
| Game server | L2J Interlude (login :2106, game :7777) | VPS |
| Email | **Resend** (HTTPS API) com fallback Nodemailer SMTP — auto-detect via `RESEND_API_KEY` | Next API routes |
| Auth | JWT access 15min + refresh UUID 7d, tudo em cookie HttpOnly+Secure+SameSite=Lax | Next API routes + Postgres |
| Password hashing | bcryptjs 12 rounds | - |
| Validação | zod | - |
| Anti-bot | reCAPTCHA v3 Classic (invisível) | Client + API routes |

## 5. Estrutura do Projeto

```
l2impure/
├── PROJECT.md                   # este arquivo
├── README.md                    # (herança do scaffold)
├── package.json                 # scripts: dev, build, start, lint, typecheck, db:*
├── next.config.ts               # vazio (output: standalone FOI REMOVIDO)
├── tsconfig.json                # strict + paths @/* → src/*
├── tailwind.config.*            # (via components.json)
├── postcss.config.mjs
├── eslint.config.mjs
├── components.json              # shadcn config (style base-nova)
├── prisma/
│   ├── schema.prisma            # users, refresh_tokens, verification_tokens, game_accounts, audit_log
│   └── migrations/
│       ├── migration_lock.toml
│       └── 20260424000000_initial/migration.sql
├── public/
│   ├── images/                  # logo.png, logo.svg
│   ├── videos/                  # header.mp4, join.mp4, logo-animated.mp4
│   ├── fonts/                   # (vazio — Next.js baixa Oswald/Open Sans via next/font)
│   └── seo/                     # (vazio por enquanto — favicon via layout.tsx)
└── src/
    ├── app/
    │   ├── layout.tsx           # root: fonts + <Script> reCAPTCHA global
    │   ├── globals.css          # tokens L2 Impure (cores, fibonacci, oswald/opensans)
    │   ├── (public)/
    │   │   └── page.tsx         # landing (Hero, MainContent, Discord, Features, Stats, Join, Footer)
    │   ├── (auth)/
    │   │   ├── layout.tsx       # split 50/50 com vídeo de fundo + tagline híbridos
    │   │   ├── login/page.tsx
    │   │   ├── register/page.tsx
    │   │   ├── verify/page.tsx
    │   │   ├── forgot-password/page.tsx
    │   │   └── reset-password/page.tsx
    │   ├── (dashboard)/         # PROTEGIDO — layout chama getSession()
    │   │   ├── layout.tsx       # shell: <Sidebar/> + <DashboardHeader/> + main
    │   │   ├── dashboard/page.tsx       # 3 stat cards + tabela contas + help
    │   │   ├── characters/page.tsx      # placeholder "Em construção"
    │   │   ├── warehouse/page.tsx       # placeholder
    │   │   ├── wallet/page.tsx          # placeholder
    │   │   ├── settings/page.tsx        # placeholder
    │   │   ├── referrals/page.tsx       # placeholder
    │   │   ├── support/page.tsx         # placeholder
    │   │   ├── rankings/page.tsx        # placeholder
    │   │   └── promo-code/page.tsx      # placeholder
    │   └── api/
    │       └── auth/
    │           ├── register/route.ts    # POST — cria user, manda email
    │           ├── login/route.ts       # POST — seta cookies HttpOnly
    │           ├── logout/route.ts      # POST — revoga refresh + limpa cookies
    │           ├── refresh/route.ts     # POST — rotation: revoga atual, emite novo
    │           ├── verify/route.ts      # POST e GET — confirma email
    │           ├── forgot/route.ts      # POST — envia email de reset
    │           ├── reset/route.ts       # POST — valida token e reseta senha
    │           └── me/route.ts          # GET — retorna {user} ou {user:null}
    ├── components/
    │   ├── dashboard/
    │   │   ├── Sidebar.tsx          # nav lateral 260px com active state via usePathname
    │   │   ├── DashboardHeader.tsx  # CTA criar conta + ícones + avatar/logout
    │   │   └── Placeholder.tsx      # <Placeholder> + <PageTitle> reutilizáveis
    │   ├── Header.tsx           # nav L2 Impure (Sobre/Comunidade/Promoções/Doações)
    │   ├── Hero.tsx             # "INTERLUDE X10 / EM BREVE"
    │   ├── MainContent.tsx      # Status servidores + Notícias
    │   ├── DiscordBanner.tsx
    │   ├── FeaturesSection.tsx  # 6 cards (Híbridos highlight, Rates, Auto-Farm, Olympiad Dupla, Eventos, Rebirth)
    │   ├── StatisticsSection.tsx # TOP-5 Clãs / PVP / PK com dropdown de servidor
    │   ├── JoinSection.tsx      # "FAÇA PARTE DA L2 IMPURE" com vídeo bg
    │   ├── Footer.tsx
    │   ├── PlayModal.tsx        # "Como começar a jogar" (3 etapas, 3 blocos download)
    │   ├── icons.tsx            # SVG inline (Discord, Telegram, Globe, Play, Close, etc.)
    │   └── ui/
    │       ├── Toast.tsx        # ToastProvider + useToast
    │       ├── Input.tsx        # Input com label/hint/error
    │       ├── GoldButton.tsx   # variantes primary/outline/ghost + sizes
    │       └── button.tsx       # shadcn button (herdado)
    ├── hooks/
    │   └── useRecaptcha.ts      # carrega grecaptcha ready + execute(action)
    ├── lib/
    │   ├── db.ts                # Prisma singleton (globalThis.prismaClient)
    │   ├── redis.ts             # ioredis singleton + helper cached()
    │   ├── auth.ts              # hashPassword, verifyPassword, sign/verify JWT, cookies, createVerificationToken
    │   ├── auth-cookies.ts      # SÓ as constantes ACCESS_COOKIE/REFRESH_COOKIE (sem deps, pode ser importado em edge)
    │   ├── email.ts             # Nodemailer + templates HTML (verification, reset)
    │   ├── rate-limit.ts        # rateLimit() via Redis + tabela rateLimits configurável por env
    │   ├── recaptcha.ts         # verifyRecaptcha(token, action, minScore=0.5)
    │   ├── bridge.ts            # scaffold HMAC pra Fase 3 (não testado ainda)
    │   ├── audit.ts             # audit({userId, action, ipAddress, details}) — nunca lança
    │   ├── email.ts             # dispatch dual: Resend (HTTPS) | Nodemailer SMTP — auto-detect via RESEND_API_KEY
    │   ├── utils.ts             # cn() = clsx + twMerge
    │   ├── l2impure-data.ts     # conteúdo pt-BR (navItems, languages, serverCards, newsItems, featureCards, statisticsServers, footerColumns, downloadBlocks, joinSection, siteConfig)
    │   └── ~~l2impure-data.ts  (legado do clone L2MAD)~~
    └── types/
        └── l2impure.ts          # NavItem, Language, ServerCard, NewsItem, FeatureCard, TopRow, TopCard, StatisticsServer, FooterColumn, DownloadBlock
```

## 6. Variáveis de Ambiente

Valores reais em `.env.local` (gitignored) e no painel Railway. Abaixo a
lista completa com descrição e onde buscar.

### Públicas (podem aparecer neste doc)

| Var | Valor | Descrição |
|---|---|---|
| `NEXT_PUBLIC_RECAPTCHA_SITE_KEY` | `6Le_1sgsAAAAAC2lqfxlnFd1XpKoDX_ZP7Fay07P` | Site key reCAPTCHA v3 Classic. Posições 15 e 19 são `l` (L minúsculo) — confirmado direto no Google admin em 2026-04-25. Versões anteriores deste doc tinham `I` por engano (font confusion) — **a chave correta é com `l`** |
| `NEXT_PUBLIC_SITE_URL` | `https://l2impure-production-49e6.up.railway.app` (hoje) → `https://l2impure.com` (prod) | URL pública usada em templates de email e OG tags |
| `NEXT_PUBLIC_RECAPTCHA_DISABLED` | `false` (ou ausente) | Se `true`, cliente não carrega script nem chama execute. Bypass pra troubleshooting |
| `NEXT_PUBLIC_RECAPTCHA_ENTERPRISE` | `false` (ou ausente) | Se `true`, cliente usa `grecaptcha.enterprise.execute` + `enterprise.js`. Hoje a chave é Classic, então `false` |

### Privadas (valor só em `.env.local` e Railway)

| Var | Formato | Descrição |
|---|---|---|
| `DATABASE_URL` | `postgresql://postgres:<senha>@postgres.railway.internal:5432/railway` | Postgres interno Railway. Dev local precisa usar `DATABASE_PUBLIC_URL` equivalente |
| `REDIS_URL` | `redis://default:<senha>@redis.railway.internal:6379` | Redis interno Railway. Idem, dev local usa `REDIS_PUBLIC_URL` |
| `JWT_SECRET` | string 40+ chars | Assina access tokens. Atual é fraco (`L2impure_SecretKey_2026_Railway`) — **trocar por `openssl rand -hex 64`** antes de abrir produção |
| `JWT_REFRESH_SECRET` | string 40+ chars | Assina refresh tokens (reservado pra versão futura — hoje refresh token é UUID opaco no DB, não JWT). Pode gerar com `openssl rand -hex 64` |
| `RESEND_API_KEY` | `re_...` (~36 chars) | Resend transactional email (preferido). Se setada, `lib/email.ts` usa Resend e ignora SMTP_*. Cria em resend.com → API Keys |
| `RESEND_FROM` | `L2 Impure <admin@l2impure.com>` | From header pros emails Resend (cai pra `SMTP_FROM` se ausente). Domínio precisa estar verificado no Resend (DNS SPF + DKIM na Hostinger) |
| `SMTP_HOST` | `smtp.hostinger.com` | SMTP Hostinger (fallback — Railway bloqueia :465 outbound, então só funciona em dev local) |
| `SMTP_PORT` | `465` | SSL |
| `SMTP_USER` | `admin@l2impure.com` | caixa criada na Hostinger |
| `SMTP_PASS` | string ~10 chars com símbolos | Senha gerada na Hostinger. Atual tem `:` que pode precisar escapar em YAML |
| `SMTP_FROM` | `L2 Impure <admin@l2impure.com>` | From header nos emails (fallback pra RESEND_FROM) |
| `RECAPTCHA_SECRET_KEY` | string 40 chars (prefixo `6Le_1sgsAAAA`) | Server-side reCAPTCHA verify. Nunca expor ao cliente |
| `RECAPTCHA_DISABLED` | `false` (ou ausente) | Bypass server-side. `true` aceita qualquer request sem verificar |
| `RATE_LIMIT_*_MAX` / `RATE_LIMIT_*_WINDOW` | number | Override dos defaults. Ex: `RATE_LIMIT_REGISTER_MAX=20`, `RATE_LIMIT_REGISTER_WINDOW=3600` |
| `BRIDGE_URL` (Fase 3) | `https://bridge.l2impure.com` | Via Cloudflare Tunnel pra bridge da VPS |
| `BRIDGE_API_KEY` (Fase 3) | string aleatória | Compartilhada com bridge |
| `BRIDGE_HMAC_SECRET` (Fase 3) | string aleatória | HMAC assinatura request |
| MySQL VPS (Fase 3) | host `76.13.170.153`, port `3306`, user `l2impure`, db `l2jdb` | Acessado só pela bridge, nunca pelo Next |

### Onde ficam os valores reais

1. `.env.local` na raiz do projeto (gitignored) — dev local
2. Railway → serviço Next → aba Variables — prod
3. Backup offline: `C:\Users\sss\Downloads\ACESSOS-FASE1-CLAUDE-CODE.txt`

## 7. Schema do Banco (Prisma)

Ver `prisma/schema.prisma`. Resumo:

```
users (1) ─ (N) refresh_tokens
      (1) ─ (N) verification_tokens  [type: verification | reset]
      (1) ─ (N) game_accounts
      (1) ─ (N) audit_log
```

- **users**: `email UNIQUE`, `password_hash` (bcrypt 12), `is_verified`
- **refresh_tokens**: token UUID opaco (256 bits base64url), `revoked` flag, `expires_at`. Rotation: cada refresh revoga o anterior
- **verification_tokens**: one-shot (`used` flag), TTL 24h pra verification, 1h pra reset
- **game_accounts**: `game_login UNIQUE` (Fase 3 — vincula conta do site ao login L2J)
- **audit_log**: ações sensíveis (register, login, logout, verify_email, forgot_password, reset_password, login_fail_*, register_duplicate)

Migration inicial em `prisma/migrations/20260424000000_initial/migration.sql`.
Railway roda `npx prisma migrate deploy` como Pre-deploy command.

## 8. Design System

Todos os tokens em `src/app/globals.css` via CSS vars. Nunca hardcode.

### Cores

```css
--l2-bg-primary:  #0a0a0f        /* fundo da página */
--l2-bg-secondary:#101018         /* sidebar, seções destacadas */
--l2-bg-tertiary: #16161f
--l2-bg-card:     #1a1a25         /* cards */
--l2-bg-card-hover:#22222f
--l2-bg-input:    #0d0d14
--l2-gold:        212, 161, 74    /* #d4a14a — accent-primary */
--l2-gold-hover:  230, 181, 90    /* #e6b55a */
--l2-gold-deep:   184, 134, 46    /* #b8862e */
--l2-red:         230, 57, 70     /* #e63946 */
--l2-green:       0, 200, 83      /* #00c853 */
--l2-discord:     88, 101, 242    /* #5865F2 */
--l2-text-primary:   #ffffff
--l2-text-secondary: #b0b0c0
--l2-text-muted:     #707080
--l2-text-gold:      #d4a14a
--l2-border:         rgba(255,255,255,0.08)
--l2-border-gold:    rgba(212,161,74,0.3)
--l2-shadow-gold:    0 5px 21px rgba(212,161,74,0.25)
--l2-gold-gradient:  linear-gradient(135deg, #e6b55a 0%, #d4a14a 50%, #b8862e 100%)
```

### Tipografia (proporção áurea, base 16×1.618)

- **Display:** `Oswald` 400/500/600/700 — títulos, botões, nav
- **Corpo:** `Open Sans` 400/500/600/700 — parágrafos, labels

Escala:
- `--text-xs: 10px` / `--text-sm: 13px` / `--text-base: 16px` / `--text-lg: 21px`
- `--text-xl: 26px` / `--text-2xl: 34px` / `--text-3xl: 42px` / `--text-4xl: 55px` / `--text-5xl: 68px`

Regras:
- h1-h6: Oswald, weight 600, line-height 1.236, letter-spacing 0.5px
- Corpo: Open Sans, line-height 1.618
- Botões: 13px, weight 600, uppercase, letter-spacing 1px

### Spacing (Fibonacci)

```
xs=5  sm=8  md=13  lg=21  xl=34  2xl=55  3xl=89  4xl=144
```

### Radius (Fibonacci)

```
sm=3  md=5  lg=8  xl=13
```

### Layout

```
--l2-container:      1100px   (forms, conteúdo denso)
--l2-container-wide: 1440px   (landing, stats)
--l2-header-h:       100px    (desktop)
```

### Componentes-chave

- **GoldButton** (variants `primary | outline | ghost`, sizes `small | default | large | full`)
- **Input** (com label, hint, error, focus gold)
- **Toast** (via provider, não usar `alert()`)
- Modais custom (overlay rgba(0,0,0,0.85), body bg-secondary, radius-xl 13px)
- Emojis como ícones — nunca icon fonts (🔥 ⚔️ 🦄 ⚡ 📺 🏆 💎 🧬 etc.)

## 9. Fluxo de Autenticação

1. **Register** (`POST /api/auth/register`)
   - rate limit 10/hora/IP (era 3, afrouxado)
   - reCAPTCHA v3 verify (action=`register`, minScore 0.5)
   - cria user com `is_verified=false`, `password_hash` bcrypt
   - gera `verification_token` (24h TTL)
   - envia email via Nodemailer
   - **anti-enumeração:** se email já existe, responde 201 igual (não dá pra saber)

2. **Verify email** (`GET /api/auth/verify?token=...` ou `POST` com body)
   - consome o token one-shot
   - seta `user.is_verified=true`
   - GET redireciona pra `/login?verified=1`

3. **Login** (`POST /api/auth/login`)
   - rate limit 5/min/IP
   - valida senha (bcrypt compare)
   - se `!is_verified` → 403 com `code: "unverified"`
   - gera access token JWT (15min) + refresh token UUID (7d, salvo no DB)
   - seta ambos como cookies **HttpOnly + Secure + SameSite=Lax**

4. **Refresh** (`POST /api/auth/refresh`)
   - lê cookie refresh, valida no DB (não revogado, não expirado)
   - **rotation:** revoga o atual, emite novo access + novo refresh
   - rate limit 30/min/user

5. **Logout** (`POST /api/auth/logout`)
   - revoga refresh no DB
   - limpa os 2 cookies

6. **Forgot password** (`POST /api/auth/forgot`)
   - rate limit 3/hora/email
   - reCAPTCHA action=`forgot`
   - cria verification_token type=`reset` (1h TTL)
   - email via Nodemailer
   - anti-enumeração: sempre responde OK

7. **Reset password** (`POST /api/auth/reset`)
   - consome token one-shot
   - hash nova senha
   - **invalida todos os refresh tokens** do usuário (força re-login em todos os devices)

8. **me** (`GET /api/auth/me`)
   - lê cookie access, valida JWT
   - retorna `{user: {id,email}}` ou `{user: null}`

**Proteção de páginas internas:** `src/app/(dashboard)/layout.tsx` chama
`await getSession()` em Server Component. Sem sessão → `redirect('/login')`.
Isso roda em Node runtime (middleware edge foi removido por bug de bundling
do Next 16 que puxa `node:crypto` pro edge).

## 10. Rate Limits (defaults)

| Endpoint | Max | Window (s) | Override via env |
|---|---|---|---|
| `login` | 5 | 60 | `RATE_LIMIT_LOGIN_MAX` / `..._WINDOW` |
| `register` | 10 | 3600 | `RATE_LIMIT_REGISTER_*` |
| `forgot` | 3 | 3600 | `RATE_LIMIT_FORGOT_*` |
| `refresh` | 30 | 60 | `RATE_LIMIT_REFRESH_*` |
| `createGameAccount` (Fase 3) | 5 | 3600 | `RATE_LIMIT_CREATE_GAME_ACCOUNT_*` |
| default | 60 | 60 | `RATE_LIMIT_DEFAULT_*` |

## 11. Bridge VPS (Fase 3 — NÃO construído ainda)

Especificação futura, código em `src/lib/bridge.ts` já scaffold:

- **VPS:** `76.13.170.153` com L2J Interlude
- **Bridge:** Node.js/Fastify em `:8080`, exposto via Cloudflare Tunnel em `bridge.l2impure.com`
- **MySQL:** `l2jdb` em `localhost:3306`, user `l2impure` com permissões mínimas (SELECT em accounts/characters/clan_data/etc., INSERT+UPDATE só em accounts, NENHUM DELETE/DROP/ALTER)
- **Auth Railway ↔ Bridge:** headers `X-API-Key` + `X-Timestamp` (epoch ms) + `X-Signature` (HMAC-SHA256 do `timestamp + "." + method + path + "." + body` com `BRIDGE_HMAC_SECRET`). Bridge rejeita requests com timestamp > 30s de diff (anti-replay)
- **Endpoints previstos:**
  - `GET /status` → `{online, players, uptime}`
  - `GET /rankings/pvp` / `/rankings/pk` / `/rankings/clans`
  - `GET /characters/:login`
  - `POST /accounts/create` (cria no MySQL L2J)
  - `POST /accounts/reset-hwid`
  - `GET /health`
- **Cache no Next:** Redis — status 30s, rankings 5min

## 12. Deploy & Infraestrutura

### Railway (atual)

- **Projeto:** contém 3 serviços — Next.js (branch `arq-definitiva`), Postgres, Redis
- **Build command:** default (detecta `npm run build`) — roda `prisma generate && next build`
- **Pre-deploy command:** `npx prisma migrate deploy` (aplica migrations)
- **Start command:** `npm start` → `next start`
- Vars linkadas via Reference Variables (Postgres/Redis → Next)
- Auto-deploy on push ao branch `arq-definitiva`

### Hostinger

- Domínio `l2impure.com` + SMTP `admin@l2impure.com`
- Site atual do domínio é o HTML estático (serve como fallback)
- Quando migração for promovida: Cloudflare DNS aponta para o Railway

### VPS (Fase 3)

- `76.13.170.153` — L2J com MySQL local
- Falta: instalar Node, configurar bridge, instalar cloudflared

## 13. Issues Conhecidos & Armadilhas

1. **Next 16 + Turbopack + edge runtime = bug `node:crypto`.**
   Middleware `src/middleware.ts` foi **removido** — proteção migrou pro
   `(dashboard)/layout.tsx` em Node runtime. Não recriar middleware sem
   testar build em produção no Railway primeiro.

2. **reCAPTCHA — site key tem `l` minúsculo** nas posições 15 e 19,
   confirmado direto no Google admin em 2026-04-25:
   `6Le_1sgsAAAAAC2lqfxlnFd1XpKoDX_ZP7Fay07P`. Versões anteriores deste
   doc tinham `I` (i maiúsculo) por engano de transcrição (font
   confusion) — passei semanas caçando "typo" que não existia. Sempre
   confirmar com o Google admin antes de mudar a env var.

3. **`output: "standalone"` no `next.config.ts`** causa warning `next start does not work with output: standalone`. Foi removido.

4. **`NEXT_PUBLIC_*` é congelado no build.** Alterar essas vars no Railway
   requer **rebuild manual** (Deployments → ⋮ → Redeploy). Apenas editar
   não propaga.

5. **Prisma Client global.** `src/lib/db.ts` usa `globalThis.prismaClient`
   pra evitar leaks em dev (hot reload). Se alguém trocar pra
   `new PrismaClient()` por arquivo, vai ter erro `too many connections`.

6. **Redis fail-open.** `rateLimit()` se não conseguir falar com Redis,
   deixa passar (logaa error). Em produção crítica, considerar fail-closed
   em endpoints de auth.

7. **reCAPTCHA v3 é INVISÍVEL.** Não tem caixa "Não sou um robô" — só um
   badge no canto inferior direito. Se o usuário espera uma caixa visível,
   precisamos criar chave nova v2 Checkbox e reescrever o hook.

8. **`redirect()` dentro de Server Component lança `NEXT_REDIRECT`** — não
   capturar com try/catch genérico.

9. **Cookie names:** `l2i_access` e `l2i_refresh`. Definidos em
   `src/lib/auth-cookies.ts` (arquivo isolado sem deps pra poder ser
   importado em edge, mesmo que middleware tenha sido removido).

10. **Segredos vazados no chat.** Em 2026-04-25, o usuário colou todos os
    env vars no chat durante debug. Recomendação: rotacionar
    `JWT_SECRET`, `JWT_REFRESH_SECRET`, `SMTP_PASS`. `NEXT_PUBLIC_*` são
    naturalmente públicos.

## 14. Commits Recentes em `arq-definitiva`

```
(git log --oneline --max-count=10 recent)
```
Ler com `git log arq-definitiva --oneline -20` pra ver o último estado.

## 15. Roadmap / Próximos Passos

### Fase 1 ✅ (concluída — 2026-04-24/25)
- [x] Next.js scaffold + Tailwind + shadcn + paleta L2 Impure
- [x] Prisma + Postgres schema com migration inicial
- [x] ioredis + helper `cached()`
- [x] Auth completo: register, login, logout, refresh (rotation), verify, forgot, reset, me
- [x] Cookies HttpOnly + Secure + SameSite=Lax
- [x] Rate limiting configurável via env
- [x] reCAPTCHA v3 (client carrega via `<Script>` no layout)
- [x] Nodemailer SMTP Hostinger + templates HTML
- [x] Páginas auth 5 + landing + dashboard placeholder
- [x] Audit log em ações sensíveis
- [x] Deploy Railway em `l2impure-production-49e6.up.railway.app`

### Fase 2 — em andamento
- [x] Sidebar compartilhada pro dashboard (`components/dashboard/Sidebar.tsx`)
- [x] DashboardHeader com avatar + logout (`components/dashboard/DashboardHeader.tsx`)
- [x] 8 páginas internas vazias mas navegáveis: `/characters`, `/warehouse`, `/wallet`, `/settings`, `/referrals`, `/support`, `/rankings`, `/promo-code`
- [x] Dashboard reescrito com 3 stat cards + tabela contas + help box (1:1 com legado `dashboard.html`)
- [x] Email: migração pra Resend com fallback SMTP (commit `753f1ac`) — falta o user fazer setup externo (Resend account + DNS + API key + Railway env)
- [x] Cleanup de Híbridos do UI público (commit `ddc62ce`)
- [ ] Validar fluxo end-to-end: register → email → verify → login → dashboard (bloqueado por Resend setup)
- [ ] Landing: lapidar visual até bater 1:1 com `public/css/homepage.css` do legado (branch `main`)
- [ ] `/api/game/accounts` POST e GET (persistência no Postgres, sem bridge ainda)

### Fase 3 — Bridge VPS
- [ ] Bridge Node/Fastify na VPS em `:8080`
- [ ] MySQL user `l2jbridge` com permissões mínimas
- [ ] Cloudflare Tunnel → `bridge.l2impure.com`
- [ ] HMAC auth + cache Redis no Next (`src/lib/bridge.ts` já pronto)
- [ ] Testar `GET /status`, `GET /rankings/*`, `GET /characters/:login`

### Fase 4 — Features do Jogo
- [ ] Rankings dinâmicos (pegando da bridge)
- [ ] Server status real-time
- [ ] Characters page (lista personagens da conta)
- [ ] HWID reset via UI

### Fase 5 — Classes Impuras (sistema único)
- [ ] Tabelas SQL novas no MySQL VPS (`impure_lineage`, `impure_chromosomes`, etc.)
- [ ] Endpoints na Bridge (`POST /impure/generate-child`, `GET /impure/heritage/:charId`)
- [ ] `ImpureManager.java` no core L2J
- [ ] Telas no site: gerar híbrido, ver linhagem, trocar

## 16. Como Claude deve retomar em nova sessão

1. **Ler este `PROJECT.md` na íntegra.**
2. Ler `CLAUDE.md` (instruções base do repo) e `L2-IMPURE-DESIGN-GUIDE.md` + `L2-IMPURE-ARQUITETURA-DEFINITIVA.md` (em Downloads ou `docs/`) se precisar de detalhes de design ou decisões arquiteturais.
3. `cd C:/Users/sss/Pictures/l2impure && git status` pra ver estado local.
4. `git log arq-definitiva --oneline -20` pra ver progresso recente.
5. Confirmar qual o problema atual:
   - Checar se o último deploy em `l2impure-production-49e6.up.railway.app` está saudável (`/`, `/login`, `/register`, `/dashboard` devem responder)
   - Checar se existem commits sem push
6. Se precisar rodar dev local: copiar chaves de `ACESSOS-FASE1-CLAUDE-CODE.txt` pro `.env.local` (usar as URLs `DATABASE_PUBLIC_URL` / `REDIS_PUBLIC_URL` em vez das `*.railway.internal`)
7. Qualquer mudança → testar build local (`npm run build`), commit, push em `arq-definitiva`, validar redeploy em produção
8. **NUNCA** mergear em `main` sem confirmar com o usuário (Railway serve prod dali)
9. Usuário fala pt-BR, prefere respostas concisas e sem pedir confirmação pra ações reversíveis (tem `feedback_autonomy` no memory)
10. Usuário já viu prints do navegador ao vivo — não tirar screenshots só pra mostrar progresso (`feedback_no_screenshots`)

## 17. Comandos úteis

```bash
# Dev local
npm run dev                         # localhost:3000

# Produção local (testar build)
npm run build && npm start

# Checks
npm run check                       # lint + typecheck + build

# DB
npx prisma migrate deploy           # aplicar migrations (Railway roda no pre-deploy)
npx prisma db push                  # sync schema sem criar migration (dev)
npx prisma studio                   # GUI do DB
npx prisma generate                 # gerar Prisma Client

# Git
git status
git log arq-definitiva --oneline -20
git push origin arq-definitiva

# Gerar secret novo (JWT)
openssl rand -hex 64

# Testar endpoint em prod
curl -sI https://l2impure-production-49e6.up.railway.app/dashboard
curl -s  https://l2impure-production-49e6.up.railway.app/api/auth/me
```

---

**Última atualização:** 2026-04-25 (tarde — sessão Fase 2 + Resend + Híbridos cleanup)
**Último commit relevante:** ver `git log arq-definitiva --oneline -5`

---

## 18. Estado da última sessão (2026-04-25 tarde)

### O que funciona em produção
- ✅ Build Railway sobe sem erros (node:crypto resolvido removendo middleware edge)
- ✅ Landing `/` renderizando L2 Impure — title atualizado, sem menção a Híbridos
- ✅ `/login`, `/register`, `/forgot-password`, `/reset-password`, `/verify` carregam
- ✅ `/dashboard` + 8 páginas internas (`/characters`, `/warehouse`, `/wallet`, `/settings`, `/referrals`, `/support`, `/rankings`, `/promo-code`) — todas redirecionam 307 pra `/login` sem cookie (layout protege)
- ✅ Sidebar compartilhada com active state, header com avatar/logout
- ✅ Migration Prisma aplicada no Postgres (`No pending migrations to apply`)
- ✅ reCAPTCHA passa o gate do register (formulário aceita, mostra "Quase lá")

### O que NÃO funciona — bloqueadores ativos

#### 🟡 Email — Resend setup quase completo, falta API key + Railway env
`src/lib/email.ts` suporta dois providers (auto-detect via
`RESEND_API_KEY`). SMTP Hostinger continua dando ETIMEDOUT no Railway
(GCP bloqueia :465 outbound). **Resend é o caminho.**

Status em 2026-04-25 tarde:
- ✅ Conta Resend criada (`ocaradaia.br@gmail.com`)
- ✅ Domínio `l2impure.com` adicionado e DNS verified (SPF + DKIM)
- ⏳ Falta: criar API key, setar `RESEND_API_KEY` no Railway, redeploy

Próximos passos:
1. Resend → API Keys → Create (Full access, domain l2impure.com) → guarda `re_...`
2. Railway → serviço Next → Variables → adiciona `RESEND_API_KEY=re_...`
   (opcional: `RESEND_FROM=L2 Impure <admin@l2impure.com>` — código tem default)
3. Salvar → redeploy automático
4. Testar: `curl -s 'https://l2impure-production-49e6.up.railway.app/api/debug/smtp?key=<DEBUG_KEY>'`
   deve voltar `{"ok":true,"env":{"provider":"resend",...}}`

#### 🟢 reCAPTCHA — RESOLVIDO (era erro de doc, não de código)
Em 2026-04-25 ficamos um tempo achando que o bundle Railway tinha
typo (`l` minúsculo) e a chave admin tinha `I` maiúsculo. Confirmação
direta do Google admin mostra que a chave SEMPRE foi com `l`
minúsculo: `6Le_1sgsAAAAAC2lqfxlnFd1XpKoDX_ZP7Fay07P`. Bundle
Railway está e sempre esteve correto.

PROJECT.md (esse arquivo) tinha o valor errado escrito por engano de
transcrição (font onde `I` e `l` se parecem). **Lição:** sempre
copiar a chave direto do `https://www.google.com/recaptcha/admin/site/751359679`,
nunca confiar no que está escrito em doc.

Quando quiser ativar a proteção real (hoje está em bypass via
`RECAPTCHA_DISABLED=true` no Railway), basta remover essa env var +
`NEXT_PUBLIC_RECAPTCHA_DISABLED` e redeploy.

### Próximas tarefas (depois de Resend + reCAPTCHA fechados)
- Validar fluxo end-to-end: register → email recebido → click link → verify → login → dashboard
- Lapidar landing pra bater 1:1 com `public/css/homepage.css` original (referência: branch `legacy-express`)
- `/api/game/accounts` POST e GET (persistência no Postgres, sem bridge ainda) — botão "Criar conta no jogo" do header já existe, só não tem ação
- Modal "Criar conta no jogo" (igual ao `dashboard.html` legado, linhas 224-264)
- Substituir 9 stub itens do menu Sidebar por dados reais conforme APIs forem ficando prontas

### Env vars sensíveis vazadas no chat (rotacionar antes do launch)
Em 2026-04-25 o usuário colou todos os valores no chat de debug. Antes de
abrir produção real:
- [ ] Gerar novos `JWT_SECRET` e `JWT_REFRESH_SECRET` com `openssl rand -hex 64`
- [ ] Trocar senha `SMTP_PASS` no painel da Hostinger
- [ ] Considerar trocar `RECAPTCHA_SECRET_KEY` (criar nova chave Classic v3 no console e arquivar a velha)
- [ ] Senhas Postgres/Redis: Railway gerencia automaticamente — pode regerar pelo painel

### Comandos pra retomar a sessão

```bash
# 1. Cd e sync
cd C:/Users/sss/Pictures/l2impure
git pull origin arq-definitiva

# 2. Confirmar estado dos servidores
curl -sI https://l2impure-production-49e6.up.railway.app/
curl -s https://l2impure-production-49e6.up.railway.app/api/debug/smtp?key=<DEBUG_KEY>

# 3. Continuar a partir do caminho A ou B do SMTP
```

### Onde estão os documentos importantes
- `PROJECT.md` (este arquivo, raiz do projeto, no git)
- `C:\Users\sss\Downloads\CLAUDE.md` — instruções do projeto original (legado, mas referência boa)
- `C:\Users\sss\Downloads\L2-IMPURE-DESIGN-GUIDE (1).md` — design system
- `C:\Users\sss\Downloads\L2-IMPURE-ARQUITETURA-DEFINITIVA.md` — decisões arquiteturais finais
- `C:\Users\sss\Downloads\ACESSOS-FASE1-CLAUDE-CODE.txt` — secrets reais (não commitar)
- `C:\Users\sss\Downloads\dashboard.html` — referência visual do dashboard interno (vanilla, do legado)
- Railway: https://railway.app → projeto L2 Impure → serviço Next + Postgres + Redis
- GitHub: https://github.com/kennrick69/l2impure → branch `arq-definitiva`

---

**Boa noite. Quando voltar, manda "leia PROJECT.md" e a gente continua.**
