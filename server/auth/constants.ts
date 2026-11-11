export const AUTH = {
  sessionSeconds: 60 * 60 * 24 * 7,
  tokenBytes: 32,
  passwordMinLength: 12,
  passwordMaxLength: 128,
  requestMaxBytes: 4096,
  accountAttemptLimit: 5,
  accountWindowSeconds: 60 * 15,
  globalAttemptLimit: 100,
  globalWindowSeconds: 60,
  cleanupBatchSize: 100,
} as const;

export const PASSWORD = {
  prefix: "scrypt-v1",
  saltBytes: 16,
  keyBytes: 64,
  options: { N: 32768, r: 8, p: 3, maxmem: 64 * 1024 * 1024 },
} as const;
