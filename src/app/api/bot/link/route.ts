import {
  consumeTelegramCode,
  isBotAuthorized,
  isLinkCode,
  isTelegramId,
  isTelegramUsername,
} from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * POST /api/bot/link
 * Тело: `{ code, telegramId, username? }` — бот гасит код привязки.
 * Ответ: `{ ok: true, profile }`.
 */
export async function POST(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return botError("invalid_request");
  }

  const { code, telegramId, username } = (body ?? {}) as Record<string, unknown>;
  if (!isLinkCode(code) || !isTelegramId(telegramId) || !isTelegramUsername(username)) {
    return botError("invalid_request");
  }

  const result = await consumeTelegramCode({
    code,
    telegramId,
    username: typeof username === "string" ? username : null,
  });
  if (!result.ok) return botError(result.error);

  return botOk({ profile: result.profile });
}
