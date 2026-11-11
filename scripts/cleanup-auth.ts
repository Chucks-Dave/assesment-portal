import "dotenv/config";

import { prisma } from "../server/db";
import { AUTH } from "../server/auth/constants";

async function main(): Promise<void> {
  const deletedSessions = await prisma.$executeRaw`
    DELETE FROM "Session" WHERE "id" IN (
      SELECT "id" FROM "Session" WHERE "expiresAt" <= CURRENT_TIMESTAMP LIMIT ${AUTH.cleanupBatchSize}
    ) AND "expiresAt" <= CURRENT_TIMESTAMP
  `;
  const deletedCounters = await prisma.$executeRaw`
    DELETE FROM "LoginThrottle" WHERE "key" IN (
      SELECT "key" FROM "LoginThrottle" WHERE "expiresAt" <= CURRENT_TIMESTAMP LIMIT ${AUTH.cleanupBatchSize}
    ) AND "expiresAt" <= CURRENT_TIMESTAMP
  `;
  console.info("Expired auth records removed", { deletedSessions, deletedCounters });
}

main().catch((): void => {
  console.error("Auth cleanup failed. Verify the database configuration and migrations.");
  process.exitCode = 1;
}).finally(async (): Promise<void> => {
  await prisma.$disconnect();
});
