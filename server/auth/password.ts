import "server-only";

import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { AUTH, PASSWORD } from "./constants";

const hashPattern = /^scrypt-v1\$([a-f0-9]{32})\$([a-f0-9]{128})$/;
const dummyHash = `${PASSWORD.prefix}$${"0".repeat(32)}$${"0".repeat(128)}`;

function deriveKey(password: string, salt: string): Promise<Buffer> {
  return new Promise((resolve, reject): void => {
    scrypt(password, salt, PASSWORD.keyBytes, PASSWORD.options, (error, key): void => {
      if (error) reject(error);
      else resolve(key);
    });
  });
}

export async function hashPassword(password: string): Promise<string> {
  if (password.length < AUTH.passwordMinLength || password.length > AUTH.passwordMaxLength) {
    throw new RangeError("Password must contain 12 to 128 characters.");
  }

  const salt = randomBytes(PASSWORD.saltBytes).toString("hex");
  const key = await deriveKey(password, salt);
  return `${PASSWORD.prefix}$${salt}$${key.toString("hex")}`;
}

export async function verifyPassword(password: string, storedHash: string | null): Promise<boolean> {
  const match = hashPattern.exec(storedHash ?? dummyHash);
  if (!match || password.length > AUTH.passwordMaxLength) return false;

  const [, salt, hash] = match;
  const key = await deriveKey(password, salt);
  return timingSafeEqual(key, Buffer.from(hash, "hex")) && storedHash !== null;
}
