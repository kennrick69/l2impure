# L2 Impure — Bridge HTTP

Servidor HTTP que roda **dentro da VPS L2J** (`76.13.170.153`), conecta no MySQL local (`l2jdb`) e expõe endpoints REST autenticados pro Next.js no Railway consumir. Não é exposto direto na internet — fica atrás de **Cloudflare Tunnel** em `bridge.l2impure.com`.

Stack: Node 20 · TypeScript · Fastify 5 · mysql2 · zod · pm2.

## Endpoints

Todos exigem 3 headers (exceto `/health`):
- `X-API-Key` — string compartilhada com o Railway
- `X-Timestamp` — epoch ms (rejeitado se diff > `HMAC_MAX_SKEW_MS`, default 30s)
- `X-Signature` — `HMAC-SHA256(<HMAC_SECRET>, "<ts>.<METHOD><path>.<rawBody>")` em hex

| Método | Path | Auth | Descrição |
|---|---|---|---|
| `GET` | `/health` | ❌ | Liveness probe (sempre 200 se processo vivo) |
| `GET` | `/status` | ✅ | `{online, players, dbOk, gameServerReachable, loginServerReachable}` |
| `POST` | `/accounts/create` | ✅ | Body `{login, password}` → cria conta L2J (SHA1+Base64) |
| `GET` | `/characters/:login` | ✅ | Lista personagens da conta |

## Setup na VPS

### 1. MySQL — user `l2jbridge` com permissões mínimas

```sql
CREATE USER 'l2jbridge'@'localhost' IDENTIFIED BY 'TROCA_AQUI';

-- Read-only nas tabelas de leitura
GRANT SELECT ON l2jdb.accounts TO 'l2jbridge'@'localhost';
GRANT SELECT ON l2jdb.characters TO 'l2jbridge'@'localhost';
GRANT SELECT ON l2jdb.clan_data TO 'l2jbridge'@'localhost';
GRANT SELECT ON l2jdb.character_subclasses TO 'l2jbridge'@'localhost';
GRANT SELECT ON l2jdb.heroes TO 'l2jbridge'@'localhost';
GRANT SELECT ON l2jdb.olympiad_nobles TO 'l2jbridge'@'localhost';

-- INSERT só em accounts (criar conta)
GRANT INSERT ON l2jdb.accounts TO 'l2jbridge'@'localhost';

-- UPDATE só em accounts (reset HWID quando chegar essa rota)
GRANT UPDATE ON l2jdb.accounts TO 'l2jbridge'@'localhost';

FLUSH PRIVILEGES;
```

NÃO conceder `DELETE`, `DROP`, `ALTER` ou acesso a outras DBs.

### 2. Instalar Node 20 (se ainda não tiver)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # deve mostrar v20.x
```

### 3. PM2 global

```bash
sudo npm install -g pm2
```

### 4. Deploy do código

Do seu PC (sai daqui na pasta `bridge/`):

```bash
# Cria pasta na VPS e copia
ssh root@76.13.170.153 "mkdir -p /root/l2j-bridge"
scp -r package.json package-lock.json tsconfig.json ecosystem.config.cjs src \
    root@76.13.170.153:/root/l2j-bridge/

# Na VPS
ssh root@76.13.170.153 "cd /root/l2j-bridge && npm ci && npm run build"
```

### 5. Configurar .env na VPS

```bash
ssh root@76.13.170.153
cd /root/l2j-bridge
cp .env.example .env
nano .env    # preenche DB_PASSWORD, API_KEY, HMAC_SECRET
chmod 600 .env
```

Gerar segredos fortes:
```bash
openssl rand -hex 32   # API_KEY (>= 16 chars OK, mas use 64 hex chars)
openssl rand -hex 64   # HMAC_SECRET
```

**Importante:** os mesmos valores de `API_KEY` e `HMAC_SECRET` precisam estar no Railway como `BRIDGE_API_KEY` e `BRIDGE_HMAC_SECRET`.

### 6. Subir com PM2

```bash
cd /root/l2j-bridge
mkdir -p logs
pm2 start ecosystem.config.cjs --env production
pm2 save
pm2 startup    # copia o comando que ele imprime e cola
pm2 logs l2impure-bridge --lines 50
```

### 7. Cloudflare Tunnel

Cria um tunnel pra `bridge.l2impure.com → http://127.0.0.1:8080`:

```bash
# Instala cloudflared (se não tiver)
curl -L --output cloudflared.deb \
  https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
sudo dpkg -i cloudflared.deb

# Autentica (abre URL no navegador, escolhe a zona l2impure.com)
cloudflared tunnel login

# Cria o tunnel
cloudflared tunnel create l2impure-bridge

# Cria /root/.cloudflared/config.yml com:
cat > /root/.cloudflared/config.yml <<'YAML'
tunnel: l2impure-bridge
credentials-file: /root/.cloudflared/<TUNNEL_ID>.json

ingress:
  - hostname: bridge.l2impure.com
    service: http://127.0.0.1:8080
  - service: http_status:404
YAML

# Aponta DNS no Cloudflare
cloudflared tunnel route dns l2impure-bridge bridge.l2impure.com

# Roda como serviço
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
sudo systemctl status cloudflared
```

A bridge **não fica exposta na porta 8080 pra internet** — só Cloudflare consegue alcançar (firewall + bind 127.0.0.1).

### 8. Configurar no Railway

No serviço Next, adicionar:
```
BRIDGE_URL=https://bridge.l2impure.com
BRIDGE_API_KEY=<mesmo da VPS>
BRIDGE_HMAC_SECRET=<mesmo da VPS>
```

### 9. Testar

```bash
# /health não precisa de auth
curl https://bridge.l2impure.com/health

# /status precisa — gera signature manualmente:
TS=$(date +%s)000
METHOD=GET
PATH_=/status
BODY=""
SIG=$(echo -n "${TS}.${METHOD}${PATH_}.${BODY}" | openssl dgst -sha256 -hmac "$HMAC_SECRET" -hex | awk '{print $2}')
curl -H "X-API-Key: $API_KEY" -H "X-Timestamp: $TS" -H "X-Signature: $SIG" \
  https://bridge.l2impure.com/status
```

## Update flow

```bash
# Local
cd bridge/
# edita src/...
npm run typecheck
npm run build

# Deploy
scp -r src package.json package-lock.json root@76.13.170.153:/root/l2j-bridge/
ssh root@76.13.170.153 "cd /root/l2j-bridge && npm ci --omit=dev && npm run build && pm2 restart l2impure-bridge"
```

## Troubleshooting

| Sintoma | Investigar |
|---|---|
| `/health` 200 mas `/status` 401 | API_KEY/HMAC_SECRET batendo? Confere `pm2 logs` |
| `/status` retorna `dbOk:false` | User `l2jbridge` tem grants? Senha certa no .env? |
| `/accounts/create` 500 com ER_NO_SUCH_TABLE | DB_NAME aponta pra `l2jdb` certo? L2J pode usar nome diferente |
| Cloudflare 530/1033 | Tunnel rodando? `systemctl status cloudflared` |
| `pm2 logs` mostra ECONNREFUSED 3306 | MySQL ouvindo localhost? `netstat -tlnp \| grep 3306` |

## Estrutura

```
bridge/
├── package.json
├── tsconfig.json
├── ecosystem.config.cjs
├── .env.example
└── src/
    ├── server.ts          # Fastify entry
    ├── env.ts             # Validação zod
    ├── db.ts              # MySQL pool
    ├── auth.ts            # Middleware HMAC
    ├── l2j.ts             # SHA1+Base64, classids
    └── routes/
        ├── health.ts
        ├── status.ts
        ├── accounts.ts
        └── characters.ts
```
