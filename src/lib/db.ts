import { PrismaClient } from "@prisma/client";

declare global {
  // eslint-disable-next-line no-var
  var prismaClient: PrismaClient | undefined;
}

/**
 * Singleton Prisma Client.
 * In dev, Next.js hot-reloads modules which would leak connections without this.
 */
export const prisma =
  globalThis.prismaClient ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalThis.prismaClient = prisma;
}
