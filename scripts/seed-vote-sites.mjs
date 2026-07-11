/**
 * Seed dos vote sites (rankings de divulgação) — idempotente.
 * Rodar 2× não duplica nem sobrescreve edições feitas no painel admin
 * (createMany + skipDuplicates: só insere slug que ainda não existe).
 *
 * A migration 20260711000000_add_vote_sites já faz o mesmo seed via SQL
 * (ON CONFLICT DO NOTHING) — esse script existe pra dev local / recuperação.
 *
 * Uso: DATABASE_URL=... node scripts/seed-vote-sites.mjs
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SITES = [
  {
    slug: "hopzone",
    displayName: "HopZone (l2.hopzone.net)",
    callbackUrl: "https://bridge.l2impure.com/vote/callback/hopzone",
    callbackMethod: "GET",
    cooldownHours: 12,
    rewardCoins: 1,
    rewardDescription: "1 vote coin",
    notes:
      "Callback implementado na bridge (HMAC). Cadastro: l2.hopzone.net → Add Server.",
  },
  {
    slug: "l2topco",
    displayName: "L2Top.CO",
    callbackUrl: "https://bridge.l2impure.com/vote/callback/l2topco",
    callbackMethod: "POST",
    cooldownHours: 12,
    rewardCoins: 1,
    rewardDescription: "1 vote coin",
    notes:
      "Callback implementado na bridge (IP whitelist via L2TOP_CO_WHITELIST_IPS). Cadastro: l2top.co → Add Server.",
  },
  {
    slug: "mmotop",
    displayName: "MMOTop",
    callbackUrl: "https://bridge.l2impure.com/vote/callback/mmotop",
    callbackMethod: "GET",
    cooldownHours: 24,
    rewardCoins: 1,
    rewardDescription: "1 vote coin",
    notes:
      "ATENÇÃO: callback ainda NÃO implementado na bridge — pedir implementação antes de ativar. Ranking russo-cêntrico (plano de negócio marcou como baixa prioridade BR).",
  },
  {
    slug: "l2servera",
    displayName: "L2-Servera.com",
    callbackUrl: "https://bridge.l2impure.com/vote/callback/l2servera",
    callbackMethod: "GET",
    cooldownHours: 12,
    rewardCoins: 1,
    rewardDescription: "1 vote coin",
    notes:
      "ATENÇÃO: callback ainda NÃO implementado na bridge — pedir implementação antes de ativar. Obrigatório cadastrar o LAUNCH no calendário de openings.",
  },
  {
    slug: "gtop100",
    displayName: "GTop100",
    callbackUrl: "https://bridge.l2impure.com/vote/callback/gtop100",
    callbackMethod: "POST",
    cooldownHours: 24,
    rewardCoins: 1,
    rewardDescription: "1 vote coin",
    notes:
      "ATENÇÃO: callback ainda NÃO implementado na bridge — pedir implementação antes de ativar. GTop100 usa postback POST (pingback URL).",
  },
];

const result = await prisma.voteSite.createMany({
  data: SITES, // active: false por default do schema
  skipDuplicates: true,
});
const total = await prisma.voteSite.count();
console.log(
  `[seed-vote-sites] inseridos: ${result.count}, total na tabela: ${total}`,
);
await prisma.$disconnect();
