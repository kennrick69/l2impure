# RELATÓRIO — Fase Admin 4: Painel de Secrets + CVEs do Webhook MP

Data: 2026-07-12 · Branch: `arq-definitiva` · Executor: Fable (missão autônoma)

## 1. O que foi entregue

### 1.1 Painel de secrets criptografado — `/admin/settings/secrets`

JOs agora troca credenciais (tokens MP etc) **pelo painel, sem tocar no
Railway e sem redeploy**. Mudança vale em até 30 segundos (TTL do cache).

**Como funciona:**

- Tabela nova `admin_secrets` (Prisma `AdminSecret`): `key` única
  (`mp.access_token`, `mp.public_key`, `mp.webhook_url`, `mp.webhook_secret`),
  `category`, `description`, `updated_at`, `updated_by`.
- `value` é **SEMPRE ciphertext**: AES-256-GCM, base64 no formato
  `iv(12) | ciphertext | tag(16)`. Nenhum plaintext no banco, nenhum no repo.
- Leitura em runtime: `getSecret(key, ENV_FALLBACK)` em `src/lib/secrets.ts` —
  **DB tem prioridade, env var é fallback**. Cache em memória de 30s.
- Acesso ao painel: admin logado **+ PIN GM desbloqueado** (mesmo gate do
  /admin/game-master — sem PIN, a página mostra o formulário de unlock).

**Endpoints:**

| Método | Rota | Proteção | Função |
|---|---|---|---|
| GET | `/api/admin/secrets` | requireAdmin | Lista com valores **mascarados** (`APP_USR-••••4932`); roda o bootstrap |
| PATCH | `/api/admin/secrets/[key]` | requireAdmin + PIN GM + rate-limit | Salva (encripta) um secret; string vazia limpa; audit log com máscara |
| POST | `/api/admin/secrets/mp/test` | requireAdmin + rate-limit | Testa o Access Token ativo via `GET /users/me` do MP |

**UI** (`src/app/admin/settings/secrets/page.tsx` +
`src/components/admin/SecretsManager.tsx`):

- Agrupado por categoria (Mercado Pago hoje; SMTP/reCAPTCHA é adicionar
  1 entrada no `SECRET_CATALOG` + trocar o consumer pra `getSecret()`).
- Cada secret: label, `key`, badge de status ([OK] verde configurado /
  [ATENÇÃO] amarelo vazio-obrigatório), valor atual mascarado + quem/quando
  atualizou, input password com Mostrar/Esconder, botão Salvar.
- Alerta amarelo dedicado no `mp.webhook_secret` vazio: "Configure antes de
  aceitar pagamentos".
- Botão **"Testar credenciais"** no grupo Mercado Pago.
- Menu: Administração → **Secrets (🔐)** no `AdminSidebar`.

### 1.2 Seed dos valores MP — como ficou (e por quê)

A missão pedia seed com ciphertext no migration. **Impossível fazer com
honestidade criptográfica**: o ciphertext depende da chave-mestra, que deriva
do `JWT_SECRET` **de produção** — que não existe neste notebook (sem Railway
CLI logado, sem `.env` local; confirmado também no RELATORIO_FASE_ADMIN_2).
Ciphertext pré-computado com outra chave seria lixo indecriptável no Railway.

Solução implementada (sem nenhum plaintext commitado):

1. **Migration** semeia as 4 linhas MP só com metadados (`value` vazio).
2. **Bootstrap em runtime** (`bootstrapSecrets()` — roda ao abrir o painel):
   se a linha está vazia e a env var `MP_*` existe no Railway, encripta com a
   chave real e persiste (`updated_by = bootstrap:env`). `mp.webhook_url`
   ganha o default não-secreto `https://l2impure.com/api/wallet/webhook`
   (`bootstrap:default`).
3. O que não vier de env var, **JOs cola no painel** (2 minutos — seção 4).
4. Enquanto isso, `getSecret()` cai no fallback de env var → **zero quebra
   de comportamento** pra quem já usava MP_* no Railway.

### 1.3 `mercadopago.ts` consumindo `getSecret()`

Getters estáticos de `process.env` viraram lookups async
(`accessToken()`, `publicKey()`, `webhookUrl()`, `webhookSecret()`), com
`isConfigured()` e `hasWebhookSecret()` async. Callers ajustados com `await`
em `create-preference/route.ts` e `webhook/route.ts`; o refund admin já
passava pelo `request()` interno (que agora resolve o token via
`headers()` async) — retro-compat preservada.

## 2. Chave-mestra — derivação e risco

```
MASTER_KEY = scrypt(JWT_SECRET, "l2impure-secrets-master-2026", 32 bytes)
```

- Funciona **sem env var nova** — Railway não precisa de nada.
- Derivação lazy (não roda no build), cacheada em memória.
- **RISCO ACEITO**: rotacionar `JWT_SECRET` invalida TODOS os secrets do DB
  (decrypt falha). O site NÃO cai — `getSecret` loga o erro e usa o fallback
  de env — e o painel mostra "[ERRO] Decrypt falhou — recole o valor".
- **ATENÇÃO JOs**: o `SECRETS_ROTACAO.md` local (gitignored) tinha uma
  rotação de JWT_SECRET **pendente da fase anterior**. Adicionei lá a seção 4
  com o procedimento correto: rotacionar → redeploy → **recolar os secrets no
  painel**. Script de re-encryption automática fica como P1 futuro.

## 3. CVEs do webhook MP (espelho da auditoria LocaCar)

| CVE | Status | Detalhe |
|---|---|---|
| #1 Valor pago não validado | **FIXED** | Confirmado real: o webhook creditava `tx.coins` com `status === "approved"` sem comparar valores. Agora `payment.transaction_amount` é comparado ao `amount` da transação (tolerância 0,9 centavo). Divergiu → `console.error` crítico + audit `wallet_webhook_amount_mismatch` + **HTTP 400, coins NÃO creditados**. |
| #2 Webhook secret opcional | **FIXED (fail-closed)** | Confirmado real: `validateWebhookSignature` retornava `valid: true` com secret vazio → POST forjado passava. Agora a rota responde **503** enquanto `mp.webhook_secret` estiver vazio, ANTES de qualquer processamento. MP reagenda a notificação — pagamento fica pendente, nunca se perde. Procedimento no SECRETS_ROTACAO.md §5 e na seção 4 abaixo. |
| #3 `mp_payment_id` sem UNIQUE | **FIXED (migration)** | Confirmado real: era só `@@index`. Migration `20260712120000` faz dedup defensivo (mantém a tx mais antiga) e cria `wallet_transactions_mp_payment_id_key UNIQUE`. Prisma schema: `@unique`. Mesmo payment_id nunca mais credita duas transações. |

Defesas pré-existentes preservadas: `updateMany` anti-double-credit,
`$transaction` atômico status+coins, idempotência por status.

## 4. Comandos exatos pro JOs — configurar o MP quando voltar

1. **Login admin** em https://l2impure.com/login → menu **Secrets (🔐)**.
2. Destravar com o **PIN GM** (o mesmo do game-master).
3. Conferir o que o bootstrap já importou das env vars do Railway
   (badge verde = OK). O que estiver amarelo, colar:
   - **Access Token** e **Public Key**: painel MP → Suas integrações → app →
     Credenciais de produção (os mesmos `APP_USR-…` que você já tem).
   - **Webhook Secret**: painel MP → Suas integrações → app → Webhooks →
     modo produção → URL `https://l2impure.com/api/wallet/webhook`, evento
     **Pagamentos** → copiar a **assinatura secreta** → colar no painel.
4. Botão **"Testar credenciais"** → precisa vir `[OK] Credencial válida`.
5. Recarga de R$5 de teste no /wallet → conferir coins creditados.

Sem passo 3 (webhook secret), o webhook responde 503 de propósito e nenhuma
recarga é creditada — é a trava anti-fraude, não um bug.

## 5. Score de segurança (webhook/pagamentos)

| Vetor | Antes | Depois |
|---|---|---|
| POST forjado sem assinatura | Aceito se secret vazio (era o caso) | 503 fail-closed |
| Pagamento de R$0,01 credita coins cheios | Sim | 400, não credita, audit |
| Mesmo payment MP em 2 transações | Possível | UNIQUE no Postgres |
| Tokens MP | Só env var Railway (troca = mexer no Railway) | Criptografados no DB, rotação via painel c/ PIN + audit |
| Exposição de secret no admin | n/a | Sempre mascarado; plaintext nunca sai da API |

Nota subjetiva: **6/10 → 9/10** no fluxo de pagamento. O que falta pro 10:
re-encryption automática na rotação de JWT_SECRET (P1) e secret manager
dedicado (overkill hoje).

## 6. Verificação

(preenchido pós-deploy — ver seção 7)

## 7. Deploy e smoke test

(preenchido pós-deploy)
