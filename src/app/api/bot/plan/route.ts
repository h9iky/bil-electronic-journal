import { parseDay } from "@/lib/day";
import {
  PLANNER_TITLE_MAX,
  getStudentPlannerRange,
  insertPlannerTask,
  isValidTime,
} from "@/lib/planner";
import { getProfileByTelegramId, isBotAuthorized, isTelegramId } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * GET /api/bot/plan?telegramId=&from=YYYY-MM-DD&to=YYYY-MM-DD
 * Дела ученика за диапазон дней (включительно; без времени — раньше).
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

  const tasks = await getStudentPlannerRange(profile.userId, from, to);
  if (tasks === null) return botError("invalid_request");

  return botOk({ className: profile.className, tasks });
}

/**
 * POST /api/bot/plan
 * Тело: `{ telegramId, date, time?, title }` — бот добавляет дело ученика.
 * Ответ: `{ ok: true, task }`.
 */
export async function POST(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return botError("invalid_request");
  }

  const { telegramId, date, time, title } = (body ?? {}) as Record<string, unknown>;
  if (!isTelegramId(telegramId)) return botError("invalid_request");

  const profile = await getProfileByTelegramId(telegramId);
  if (!profile) return botError("not_linked");
  if (profile.role !== "STUDENT") return botError("not_a_student");

  const day = parseDay(typeof date === "string" ? date : "");
  if (!day) return botError("invalid_request");

  const cleanTime = typeof time === "string" && time.trim() ? time.trim() : null;
  if (cleanTime && !isValidTime(cleanTime)) return botError("invalid_request");

  const cleanTitle = typeof title === "string" ? title.trim() : "";
  if (!cleanTitle || cleanTitle.length > PLANNER_TITLE_MAX) return botError("invalid_request");

  const task = await insertPlannerTask(profile.userId, {
    date: day,
    time: cleanTime,
    title: cleanTitle,
    subjectId: null,
  });

  return botOk({ task });
}
