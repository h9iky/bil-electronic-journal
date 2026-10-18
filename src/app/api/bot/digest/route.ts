import { getStudentDigest } from "@/lib/bot-data";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

const DEFAULT_DAYS = 2;

/**
 * GET /api/bot/digest?telegramId=&from=YYYY-MM-DD&days=2
 * Вечерний дайджест: что задано на завтра, что сдать завтра, работы рядом.
 * Битые `from`/`days` ловит `getStudentDigest` и отдаёт `null` → 400.
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const params = new URL(request.url).searchParams;
  const telegramId = params.get("telegramId");
  const from = params.get("from");
  const daysParam = params.get("days");
  const days = daysParam === null ? DEFAULT_DAYS : Number(daysParam);

  if (!isTelegramId(telegramId) || !from) return botError("invalid_request");

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const digest = await getStudentDigest(profile.userId, from, days);
  if (digest === null) return botError("invalid_request");

  return botOk({ digest });
}
