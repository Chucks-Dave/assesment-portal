import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "../server/auth/password";
import { loginSchema } from "../server/auth/schema";

describe("password storage", (): void => {
  it("salts hashes and verifies exact passwords, including spaces and Unicode", async (): Promise<void> => {
    const password = "  My long passphrase 🔐  ";
    const first = await hashPassword(password);
    const second = await hashPassword(password);
    expect(first).not.toBe(second);
    expect(first).not.toContain(password);
    expect(await verifyPassword(password, first)).toBe(true);
    expect(await verifyPassword(password.trim(), first)).toBe(false);
    expect(await verifyPassword("wrong password", first)).toBe(false);
  });

  it("rejects missing, malformed, and unsupported password hashes", async (): Promise<void> => {
    expect(await verifyPassword("unknown user's password", null)).toBe(false);
    expect(await verifyPassword("some password", "scrypt-v999$abc$def")).toBe(false);
    expect(await verifyPassword("some password", "scrypt-v1$bad$hash")).toBe(false);
    await expect(hashPassword("short")).rejects.toThrow(RangeError);
    await expect(hashPassword("a".repeat(129))).rejects.toThrow(RangeError);
  });
});

describe("login contract", (): void => {
  it("normalizes email while preserving the password exactly", (): void => {
    expect(loginSchema.parse({ email: " STUDENT@Example.test ", password: "  pass  " })).toEqual({
      email: "student@example.test", password: "  pass  ",
    });
  });

  it.each(["role", "status", "studentId", "userId", "passwordHash"])("rejects the extra %s field", (field): void => {
    expect(loginSchema.safeParse({ email: "student@example.test", password: "valid password", [field]: "ADMIN" }).success).toBe(false);
  });

  it("rejects invalid email, empty password, and oversized passwords", (): void => {
    expect(loginSchema.safeParse({ email: "invalid", password: "password" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.test", password: "" }).success).toBe(false);
    expect(loginSchema.safeParse({ email: "a@b.test", password: "a".repeat(129) }).success).toBe(false);
  });
});
