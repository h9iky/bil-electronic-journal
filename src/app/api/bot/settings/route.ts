import { isBotLocale, isTelegramId, isBotAuthorized, updateBotSettings } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * POST /api/bot/settings
 * Тело: `{ telegramId, locale?, digestEnabled? }` — настройки бота (§5).
 * Хотя бы одно поле обязательно; ответ — свежий профиль.
 */
export async function POST(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return botError("invalid_request");
  }

  const { telegramId, locale, digestEnabled } = (body ?? {}) as Record<string, unknown>;
  if (!isTelegramId(telegramId)) return botError("invalid_request");
  if (locale !== undefined && !isBotLocale(locale)) return botError("invalid_request");
  if (digestEnabled !== undefined && typeof digestEnabled !== "boolean") {
    return botError("invalid_request");
  }
  if (locale === undefined && digestEnabled === undefined) return botError("invalid_request");

  const profile = await updateBotSettings({
    telegramId,
    ...(locale !== undefined ? { locale } : {}),
    ...(digestEnabled !== undefined ? { digestEnabled } : {}),
  });
  if (!profile) return botError("not_linked");

  return botOk({ profile });
}
