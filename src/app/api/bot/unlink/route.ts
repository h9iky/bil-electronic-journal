import { isBotAuthorized, isTelegramId, unlinkTelegramByTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * POST /api/bot/unlink
 * Тело: `{ telegramId }` — отвязка аккаунта (команда `/unlink` в боте).
 */
export async function POST(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return botError("invalid_request");
  }

  const { telegramId } = (body ?? {}) as Record<string, unknown>;
  if (!isTelegramId(telegramId)) return botError("invalid_request");

  const removed = await unlinkTelegramByTelegramId(telegramId);
  if (!removed) return botError("not_linked");

  return botOk();
}
