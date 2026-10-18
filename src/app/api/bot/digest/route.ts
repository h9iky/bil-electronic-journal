import { getStudentDigest } from "@/lib/bot-data";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

const DEFAULT_DAYS = 2;
const MAX_DAYS = 14;

/**
 * GET /api/bot/digest?telegramId=&from=YYYY-MM-DD&days=2
 * Вечерний дайджест: что задано на завтра, что сдать завтра, работы рядом.
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const params = new URL(request.url).searchParams;
  const telegramId = params.get("telegramId");
  const from = params.get("from");
  const daysParam = params.get("days");
  const days = daysParam === null ? DEFAULT_DAYS : Number(daysParam);

  if (!isTelegramId(telegramId) || !from || !Number.isInteger(days) || days < 1 || days > MAX_DAYS) {
    return botError("invalid_request");
  }

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const digest = await getStudentDigest(profile.userId, from, days);
  if (digest === null) return botError("invalid_request");

  return botOk({ digest });
}
