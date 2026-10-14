import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Подпись сессионной куки (HMAC-SHA256).
 *
 * Кука хранит `userId` + подпись, поэтому подделать чужой `id` вручную уже
 * нельзя: сервер проверяет подпись до любого запроса к БД. Секрет берём из
 * `SESSION_SECRET`; в dev есть безопасный дефолт, в prod без секрета
 * приложение падает — чтобы «демо» не уехало в интернет дырявым.
 */

const SESSION_COOKIE = "bil_session_user";

function getSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV === "production") {
    throw new Error("SESSION_SECRET is required in production");
  }
  return "bil-dev-insecure-secret-change-me";
}

function sign(userId: string): string {
  return createHmac("sha256", getSecret()).update(userId).digest("base64url");
}

/** Упаковывает id пользователя в подписанный токен `userId.signature`. */
export function encodeSession(userId: string): string {
  return `${userId}.${sign(userId)}`;
}

/** Достаёт id из токена. `null`, если подпись не совпала или токен битый. */
export function decodeSession(token: string | undefined | null): string | null {
  if (!token) return null;

  const separator = token.lastIndexOf(".");
  if (separator <= 0) return null;

  const userId = token.slice(0, separator);
  const signature = token.slice(separator + 1);
  const expected = sign(userId);

  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  if (signatureBuffer.length !== expectedBuffer.length) return null;

  return timingSafeEqual(signatureBuffer, expectedBuffer) ? userId : null;
}

export { SESSION_COOKIE };
