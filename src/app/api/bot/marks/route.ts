import { getStudentMarks } from "@/lib/bot-data";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * GET /api/bot/marks?telegramId=
 * Оценки ученика: проценты/итоги по предметам + последние работы.
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const telegramId = new URL(request.url).searchParams.get("telegramId");
  if (!isTelegramId(telegramId)) return botError("invalid_request");

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const marks = await getStudentMarks(profile.userId);
  return botOk({ marks });
}
