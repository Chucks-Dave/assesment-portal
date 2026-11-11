import "server-only";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { z } from "zod";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
};

function createPrismaClient(): PrismaClient {
  const result = z.url().pipe(z.string().refine((value): boolean => {
    return ["postgres:", "postgresql:"].includes(new URL(value).protocol);
  })).safeParse(process.env.DATABASE_URL);

  if (!result.success) {
    throw new TypeError("DATABASE_URL must be a PostgreSQL connection URL.");
  }

  return new PrismaClient({ adapter: new PrismaPg({ connectionString: result.data }) });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
