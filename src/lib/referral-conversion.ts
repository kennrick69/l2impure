import { prisma } from "./db";
import { bridge, BridgeError } from "./bridge";
import {
  REFERRAL_REWARD_REFERRED,
  REFERRAL_REWARD_REFERRER,
  REFERRAL_TARGET_LEVEL,
} from "./referral";

/**
 * Maior level entre todos os personagens de TODAS as contas de jogo
 * de um usuário. Usado pra checar conversão de indicação.
 */
export async function getUserMaxLevel(userId: number): Promise<number> {
  const accs = await prisma.gameAccount.findMany({
    where: { userId },
    select: { gameLogin: true },
  });
  if (accs.length === 0) return 0;
  const levels = await Promise.all(
    accs.map(async (a) => {
      try {
        const r = await bridge.getMaxLevel(a.gameLogin);
        return r.maxLevel;
      } catch (e) {
        if (e instanceof BridgeError) return 0;
        throw e;
      }
    }),
  );
  return Math.max(0, ...levels);
}

export type ConversionResult =
  | { status: "still_pending"; maxLevel: number }
  | { status: "converted"; maxLevel: number }
  | { status: "already_converted"; maxLevel: number }
  | { status: "not_found"; maxLevel: 0 };

/**
 * Checa o level do indicado e, se atingiu o alvo (40), converte a
 * indicação atomicamente: marca como "converted" + credita coins
 * pros dois lados (3/2). Idempotente: convertida só uma vez.
 *
 * Falhas da bridge não revertem nem marcam como erro — só retornam
 * still_pending com level 0 (UI mostra "Pendente").
 */
export async function checkAndConvertReferral(
  referralId: number,
): Promise<ConversionResult> {
  const ref = await prisma.referral.findUnique({
    where: { id: referralId },
    select: {
      id: true,
      status: true,
      referrerId: true,
      referredId: true,
    },
  });
  if (!ref) return { status: "not_found", maxLevel: 0 };
  if (ref.status === "converted") {
    return { status: "already_converted", maxLevel: REFERRAL_TARGET_LEVEL };
  }

  let maxLevel = 0;
  try {
    maxLevel = await getUserMaxLevel(ref.referredId);
  } catch (e) {
    console.warn(
      "[referral-conversion] getUserMaxLevel falhou:",
      (e as Error).message,
    );
    return { status: "still_pending", maxLevel: 0 };
  }

  if (maxLevel < REFERRAL_TARGET_LEVEL) {
    return { status: "still_pending", maxLevel };
  }

  // Updates atômicos: o updateMany com filtro pending evita double-credit
  // se duas chamadas concorrerem.
  const updated = await prisma.referral.updateMany({
    where: { id: ref.id, status: "pending" },
    data: { status: "converted", convertedAt: new Date() },
  });
  if (updated.count !== 1) {
    return { status: "already_converted", maxLevel };
  }

  await prisma.$transaction([
    prisma.user.update({
      where: { id: ref.referrerId },
      data: { coins: { increment: REFERRAL_REWARD_REFERRER } },
    }),
    prisma.user.update({
      where: { id: ref.referredId },
      data: { coins: { increment: REFERRAL_REWARD_REFERRED } },
    }),
  ]);

  return { status: "converted", maxLevel };
}
