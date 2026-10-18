import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * GET /api/bot/me?telegramId=123
 * «Кто этот Telegram?» — бот вызывает перед каждой командой.
 * Ответ: `{ ok: true, profile }` или 404 `not_linked`.
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const telegramId = new URL(request.url).searchParams.get("telegramId");
  if (!isTelegramId(telegramId)) return botError("invalid_request");

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");

  return botOk({ profile });
}
