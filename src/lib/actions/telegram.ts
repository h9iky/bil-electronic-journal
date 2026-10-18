"use server";

/**
 * Экшены карточки «Telegram-бот» в кабинете.
 *
 * Логика (коды, TTL, привязки) — в `lib/telegram.ts`; здесь только сессия
 * и то, что должно вернуться клиенту.
 */

import { refresh } from "next/cache";
import { getSessionUser } from "@/lib/auth";
import {
  TELEGRAM_CODE_TTL_MINUTES,
  createTelegramCode,
  unlinkTelegramByUserId,
} from "@/lib/telegram";
import type { ActionResult } from "./journal";

export type TelegramCodeResult =
  | { ok: true; code: string; minutes: number }
  | { ok: false; error: string };

/** Новый код привязки (старый код пользователя при этом гаснет). */
export async function generateTelegramCode(): Promise<TelegramCodeResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  try {
    const code = await createTelegramCode(user.id);
    return { ok: true, code, minutes: TELEGRAM_CODE_TTL_MINUTES };
  } catch (error) {
    console.error("Failed to create telegram link code:", error);
    return { ok: false, error: "unknown" };
  }
}

/** Отвязка Telegram от текущего аккаунта журнала. */
export async function unlinkTelegram(): Promise<ActionResult> {
  const user = await getSessionUser();
  if (!user) return { ok: false, error: "unauthorized" };

  const removed = await unlinkTelegramByUserId(user.id);
  if (!removed) return { ok: false, error: "not_linked" };

  refresh();
  return { ok: true };
}
