import { getStudentHomeworkRange } from "@/lib/bot-data";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * GET /api/bot/hw?telegramId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Домашка класса ученика за диапазон дней (включительно).
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const params = new URL(request.url).searchParams;
  const telegramId = params.get("telegramId");
  const from = params.get("from");
  const to = params.get("to");
  if (!isTelegramId(telegramId) || !from || !to) return botError("invalid_request");

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const items = await getStudentHomeworkRange(profile.userId, from, to);
  if (items === null) return botError("invalid_request");

  return botOk({ className: profile.className, items });
}
