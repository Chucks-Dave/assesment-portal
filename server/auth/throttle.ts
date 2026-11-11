import "server-only";

import { createHash } from "node:crypto";
import { prisma } from "../db";
import { HttpError } from "../http";
import { AUTH } from "./constants";

type Counter = { attempts: number; expiresAt: Date };

export async function throttleLogin(email: string): Promise<void> {
  const key = `email:${createHash("sha256").update(email).digest("hex")}`;
  // Global first: cap password work and distinct-email counter creation without trusting spoofable IP headers.
  await consumeCounter("global", AUTH.globalAttemptLimit, AUTH.globalWindowSeconds);
  await consumeCounter(key, AUTH.accountAttemptLimit, AUTH.accountWindowSeconds);
  await prisma.$executeRaw`
    DELETE FROM "LoginThrottle" WHERE "key" IN (
      SELECT "key" FROM "LoginThrottle" WHERE "expiresAt" <= CURRENT_TIMESTAMP
      LIMIT ${AUTH.cleanupBatchSize}
    ) AND "expiresAt" <= CURRENT_TIMESTAMP
  `;
}

async function consumeCounter(key: string, limit: number, seconds: number): Promise<void> {
  const [counter] = await prisma.$queryRaw<Counter[]>`
    INSERT INTO "LoginThrottle" ("key", "attempts", "expiresAt")
    VALUES (${key}, 1, CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second')
    ON CONFLICT ("key") DO UPDATE SET
      "attempts" = CASE WHEN "LoginThrottle"."expiresAt" <= CURRENT_TIMESTAMP THEN 1
        ELSE LEAST("LoginThrottle"."attempts" + 1, ${limit + 1}) END,
      "expiresAt" = CASE WHEN "LoginThrottle"."expiresAt" <= CURRENT_TIMESTAMP
        THEN CURRENT_TIMESTAMP + ${seconds} * INTERVAL '1 second' ELSE "LoginThrottle"."expiresAt" END
    RETURNING "attempts", "expiresAt"
  `;
  if (counter.attempts > limit) {
    const retryAfter = Math.max(1, Math.ceil((counter.expiresAt.getTime() - Date.now()) / 1000));
    throw new HttpError(429, "RATE_LIMITED", "Too many login attempts. Try again later.", retryAfter);
  }
}
