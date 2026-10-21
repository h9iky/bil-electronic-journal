import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("hashPassword / verifyPassword", () => {
  it("хеширует и проверяет пароль", async () => {
    const hash = await hashPassword("bilgrade-2026");

    expect(hash.startsWith("scrypt$16384$8$1$")).toBe(true);
    await expect(verifyPassword("bilgrade-2026", hash)).resolves.toBe(true);
  });

  it("не принимает неверный пароль", async () => {
    const hash = await hashPassword("bilgrade-2026");

    await expect(verifyPassword("bilgrade-2027", hash)).resolves.toBe(false);
    await expect(verifyPassword("", hash)).resolves.toBe(false);
  });

  it("соль разная — хеши одного пароля не совпадают", async () => {
    const first = await hashPassword("same-password");
    const second = await hashPassword("same-password");

    expect(first).not.toBe(second);
    await expect(verifyPassword("same-password", first)).resolves.toBe(true);
    await expect(verifyPassword("same-password", second)).resolves.toBe(true);
  });

  it("нормализует Unicode: composed и decomposed — один пароль", async () => {
    const hash = await hashPassword("café-password");

    await expect(verifyPassword("cafe\u0301-password", hash)).resolves.toBe(true);
  });

  it("пустой и битый хеш — false, без исключений", async () => {
    await expect(verifyPassword("any", null)).resolves.toBe(false);
    await expect(verifyPassword("any", "")).resolves.toBe(false);
    await expect(verifyPassword("any", "bcrypt$whatever")).resolves.toBe(false);
    await expect(verifyPassword("any", "scrypt$16384$8$1$salt")).resolves.toBe(false);
    await expect(verifyPassword("any", "scrypt$0$8$1$AAAA$AAAA")).resolves.toBe(false);
    await expect(verifyPassword("any", "scrypt$16384$8$1$AAAA$AAAA")).resolves.toBe(false);
  });
});
