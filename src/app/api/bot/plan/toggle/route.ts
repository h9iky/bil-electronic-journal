import { toggleStudentPlannerTask } from "@/lib/planner";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../../respond";

/**
 * POST /api/bot/plan/toggle
 * Тело: `{ telegramId, taskId }` — переключить «сделано» у своего дела.
 */
export async function POST(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return botError("invalid_request");
  }

  const { telegramId, taskId } = (body ?? {}) as Record<string, unknown>;
  if (!isTelegramId(telegramId) || typeof taskId !== "string" || !taskId) {
    return botError("invalid_request");
  }

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const found = await toggleStudentPlannerTask(profile.userId, taskId);
  if (!found) return botError("not_found");

  return botOk({});
}
