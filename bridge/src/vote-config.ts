/**
 * Config dos vote sites — lida do SITE (Postgres via Next) por HTTP,
 * não de env var. Source of truth: tabela vote_sites, editável pelo
 * admin em /admin/marketing/vote-sites.
 *
 * GET {SITE_BASE_URL}/api/vote-sites/{slug}
 *   → { slug, active, cooldownHours, rewardCoins, rewardDescription }
 *
 * Política de cache/falha (deliberada, pra nunca quebrar produção):
 *   - Cache em memória por slug, TTL VOTE_CONFIG_TTL_MS (default 5min).
 *   - Fetch falhou mas há cache velho → usa o cache (stale-on-error).
 *   - Fetch falhou e NUNCA houve cache (site fora, 404 pré-deploy do
 *     endpoint, etc) → fail-open: retorna null e o caller PERMITE o
 *     callback (comportamento idêntico ao anterior à feature). Perder
 *     voto legítimo é pior que dar 1 coin com site recém-desativado.
 *   - 404 com endpoint no ar = slug não cadastrado → também fail-open.
 */

import { env } from "./env.js";

export type VoteSiteConfig = {
  slug: string;
  active: boolean;
  cooldownHours: number;
  rewardCoins: number;
  rewardDescription: string | null;
};

type CacheEntry = { config: VoteSiteConfig; fetchedAt: number };

const cache = new Map<string, CacheEntry>();

const SITE_BASE_URL = env.SITE_BASE_URL.replace(/\/+$/, "");
const TTL_MS = env.VOTE_CONFIG_TTL_MS;
const FETCH_TIMEOUT_MS = env.VOTE_CONFIG_FETCH_TIMEOUT_MS;

/**
 * Retorna a config do site de voto, ou null quando desconhecida
 * (fail-open — caller deve permitir o callback e logar warning).
 */
export async function getVoteSiteConfig(
  slug: string,
): Promise<VoteSiteConfig | null> {
  const hit = cache.get(slug);
  const now = Date.now();
  if (hit && now - hit.fetchedAt < TTL_MS) return hit.config;

  try {
    const res = await fetch(`${SITE_BASE_URL}/api/vote-sites/${slug}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { accept: "application/json" },
    });
    if (res.status === 404) {
      // slug não cadastrado no site — trata como "sem config"
      cache.delete(slug);
      return null;
    }
    if (!res.ok) throw new Error(`site respondeu ${res.status}`);
    const body = (await res.json()) as Partial<VoteSiteConfig>;
    if (typeof body.slug !== "string" || typeof body.active !== "boolean") {
      throw new Error("payload inesperado");
    }
    const config: VoteSiteConfig = {
      slug: body.slug,
      active: body.active,
      cooldownHours: Number(body.cooldownHours ?? 12),
      rewardCoins: Number(body.rewardCoins ?? 1),
      rewardDescription: body.rewardDescription ?? null,
    };
    cache.set(slug, { config, fetchedAt: now });
    return config;
  } catch (e) {
    if (hit) {
      // stale-on-error: melhor config velha que nenhuma
      return hit.config;
    }
    console.warn(
      `[vote-config] fetch de ${slug} falhou sem cache (fail-open): ${(e as Error).message}`,
    );
    return null;
  }
}

/** Só pra testes — limpa o cache em memória. */
export function _clearVoteConfigCache(): void {
  cache.clear();
}
