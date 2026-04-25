import { prisma } from "./db";

/**
 * Registra uma ação sensível no audit_log.
 * Nunca lança — erros de audit são logados e ignorados.
 */
export async function audit(params: {
  userId?: number | null;
  action: string;
  ipAddress?: string | null;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? null,
        action: params.action,
        ipAddress: params.ipAddress ?? null,
        details: params.details
          ? (params.details as never)
          : undefined,
      },
    });
  } catch (e) {
    console.error("[audit] failed:", (e as Error).message, params);
  }
}
