import { listLinkedStudents } from "@/lib/bot-data";
import { isBotAuthorized } from "@/lib/telegram";
import { botError, botOk } from "../respond";

/**
 * GET /api/bot/recipients
 * Кому бот может писать: привязанные ученики (для вечернего дайджеста).
 */
export async function GET(request: Request) {
  if (!isBotAuthorized(request)) return botError("unauthorized");

  const recipients = await listLinkedStudents();
  return botOk({ recipients });
}
