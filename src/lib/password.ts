import { randomBytes, scrypt, timingSafeEqual, type ScryptOptions } from "node:crypto";
import { promisify } from "node:util";

/**
 * Пароли: scrypt из `node:crypto` — без bcrypt/argon2 и лишних зависимостей.
 *
 * Формат хранения: `scrypt$N$r$p$salt$hash` (base64url). Параметры лежат в
 * самой строке, поэтому завтрашнее изменение стоимости не сломает старые хеши:
 * проверка берёт те параметры, с которыми пароль был захеширован.
 *
 * Соль — 16 случайных байт на каждый пароль. Сравнение — `timingSafeEqual`,
 * чтобы по времени ответа нельзя было подбирать хеш по байтам.
 */

const SCHEME = "scrypt";
const N = 16384; // 2^14 — ~16 МБ памяти на хеш, для школьного сервера норм
const R = 8;
const P = 1;
const KEY_LENGTH = 64;
const SALT_LENGTH = 16;
const MAXMEM = 64 * 1024 * 1024;

/** `promisify(scrypt)` теряет перегрузку с options — типизируем явно. */
const derive = promisify(scrypt) as (
  password: string,
  salt: Buffer,
  keylen: number,
  options: ScryptOptions,
) => Promise<Buffer>;

async function deriveKey(
  password: string,
  salt: Buffer,
  n: number,
  r: number,
  p: number,
): Promise<Buffer> {
  return derive(password.normalize("NFKC"), salt, KEY_LENGTH, {
    N: n,
    r,
    p,
    maxmem: MAXMEM,
  });
}

/** Хеш пароля для хранения в `User.passwordHash`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(SALT_LENGTH);
  const hash = await deriveKey(password, salt, N, R, P);
  return [SCHEME, N, R, P, salt.toString("base64url"), hash.toString("base64url")].join("$");
}

/**
 * Проверка пароля. `false` — для пустого/битого хеша и неверного пароля:
 * логин не должен падать из-за плохих данных в БД.
 */
export async function verifyPassword(
  password: string,
  stored: string | null | undefined,
): Promise<boolean> {
  if (!stored) return false;

  const parts = stored.split("$");
  if (parts.length !== 6 || parts[0] !== SCHEME) return false;

  const n = Number(parts[1]);
  const r = Number(parts[2]);
  const p = Number(parts[3]);
  if (
    !Number.isInteger(n) ||
    !Number.isInteger(r) ||
    !Number.isInteger(p) ||
    n < 2 ||
    n > 2 ** 20 ||
    r < 1 ||
    r > 32 ||
    p < 1 ||
    p > 16
  ) {
    return false;
  }

  const salt = Buffer.from(parts[4], "base64url");
  const expected = Buffer.from(parts[5], "base64url");
  if (salt.length === 0 || expected.length !== KEY_LENGTH) return false;

  try {
    const actual = await deriveKey(password, salt, n, r, p);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}
