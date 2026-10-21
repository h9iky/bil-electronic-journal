import { PrismaClient } from "@prisma/client";

/**
 * Синглтон: в dev-режиме hot-reload плодит кучу подключений без него.
 *
 * `omit` — страховка от утечки парольных хешей: по умолчанию Prisma вообще
 * не отдаёт `User.passwordHash`, поэтому случайный `findMany()` не утащит
 * его в дашборд или клиентский компонент. Явный `select` нужного поля
 * (как в `loginWithPassword`) это ограничение осознанно обходит.
 */
const createPrismaClient = () =>
  new PrismaClient({
    omit: { user: { passwordHash: true } },
  });

type Db = ReturnType<typeof createPrismaClient>;

const globalForPrisma = globalThis as unknown as { prisma?: Db };

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
