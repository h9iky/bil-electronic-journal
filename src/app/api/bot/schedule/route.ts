import { getStudentDaySchedule } from "@/lib/bot-data";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * GET /api/bot/schedule?telegramId=&date=YYYY-MM-DD
 * Расписание класса ученика на указанный день (дни недели хранит журнал,
 * чтобы сайт и бот считали их одинаково).
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const params = new URL(request.url).searchParams;
  const telegramId = params.get("telegramId");
  const date = params.get("date");
  if (!isTelegramId(telegramId) || !date) return botError("invalid_request");

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const schedule = await getStudentDaySchedule(profile.userId, date);
  if (schedule === null) return botError("invalid_request");

  return botOk({ className: profile.className, schedule });
}
