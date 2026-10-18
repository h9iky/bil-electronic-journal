"use server";

/**
 * Мутации настроек оценивания класса.
 *
 * Настройки меняет только администратор (по ТЗ: админ управляет классами),
 * но проверка — как всегда, на сервере, а не в UI. Экшен валидирует вход
 * через `validateClassSettings` — той же функцией, что и клиентская форма.
 */

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validateClassSettings } from "@/lib/class-settings";
import type { ActionResult } from "./journal";

/** Только админ. Бросаем — такие вызовы не должны случаться из UI. */
async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

/**
 * Сохранить настройки класса (веса SAS/SAT/формативки, пороги %→оценка,
 * округление). Первый вызов создаёт строку `ClassSettings`, последующие —
 * обновляют её (upsert по уникальному `classId`).
 */
export async function saveClassSettings(input: {
  classId: string;
  sasWeight: number;
  satWeight: number;
  formativeWeight: number;
  thresholdThree: number;
  thresholdFour: number;
  thresholdFive: number;
  rounding: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const klass = await db.klass.findUnique({
    where: { id: input.classId },
    select: { id: true },
  });
  if (!klass) return { ok: false, error: "not_found" };

  const check = validateClassSettings(input);
  if (!check.ok) return { ok: false, error: check.error };

  await db.classSettings.upsert({
    where: { classId: klass.id },
    create: { classId: klass.id, ...check.value },
    update: check.value,
  });

  refresh();
  return { ok: true };
}
