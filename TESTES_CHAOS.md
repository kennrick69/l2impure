# Testes de caos — site × queda da VPS de jogo

> Executado em 2026-07-11 pós-deploy do commit `4dc09aa` (resiliência
> bridge). Ferramenta: `scripts/chaos-test.sh`.

## O que foi validado HOJE (baseline, bridge saudável)

Rodada de 30s contra produção (`bash scripts/chaos-test.sh 30`):

| Alvo | Resultado | Latência |
|---|---|---|
| `l2impure.com/` | 200 sempre | p50 ~0.38s |
| `/api/server/status` | 200 sempre, `stale:false` | ~0.31s (cache quente) / 2.4s (miss — bridge na ida) |
| `bridge.l2impure.com/health` | 200 sempre | ~0.12s |

Comportamento do cache confirmado ao vivo: `timestamp` congela por 30s
(janela do Redis) e `ageSeconds` cresce entre amostras — ou seja, a
maioria dos hits NÃO toca a bridge.

Smoke test completo (24 checks) no mesmo horário: **24/24 [OK]** —
páginas, SEO, ícones, 404, HSTS, API pública, bridge, callbacks de voto.
Rodar de novo com `bash scripts/smoke-test.sh`.

## Caminho de falha — validado por design + código, pendente de ensaio real

O ensaio completo exige bloquear a porta 8080 NA VPS (só o JOs tem SSH):

```bash
# Terminal 1 (qualquer máquina):
bash scripts/chaos-test.sh 300

# Terminal 2 (SSH na VPS 76.13.170.153):
sudo iptables -I INPUT -p tcp --dport 8080 -j DROP
sleep 60
sudo iptables -D INPUT -p tcp --dport 8080 -j DROP
```

**Resultado esperado** (o que o código garante — `src/lib/bridge.ts` +
`src/lib/redis.ts`):

1. `site /` continua [OK] 200 — landing não depende da bridge.
2. `/api/server/status` continua 200: primeiro hit pós-queda espera o
   timeout de 4s, cai no snapshot stale de 24h e responde
   `stale:true` + header `X-Data-Stale`. NUNCA 500.
3. `bridge /health` dá [ERRO] — esperado, é a referência da queda.
4. Latência pior caso: +4s uma vez por janela de cache; depois <1s.

**Critério de reprovação:** qualquer 500 no site, ou latência >6s.

## Por que dá pra confiar antes do ensaio real

- Timeout de 4s + `BridgeError` 502/504 testados em build (nenhum
  caminho sem catch entre rota pública e bridge).
- O fallback stale é o MESMO código (`cached()`) usado pelo status do
  painel/rankings — um único ponto de comportamento, não N cópias.
- O baseline provou que o snapshot stale está sendo gravado (chave
  `stale:server:status` populada a cada fetch bom) — na queda ele já
  tem conteúdo pra servir.

Quando o JOs rodar o ensaio real (sugestão: junto com o item 3 do
CHECKLIST, já que vai estar logado na VPS), colar o output aqui embaixo.

## Log do ensaio real (preencher)

```
(pendente — rodar chaos-test.sh 300 com bloqueio de 60s na VPS)
```
