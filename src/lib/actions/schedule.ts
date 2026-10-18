"use server";

/**
 * Мутации расписания класса — только админ (как настройки оценивания).
 * Пустой предмет = «убрать урок»: строку удаляем, пустышек в БД не держим.
 */

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { isLessonNumber, isSchoolDay } from "@/lib/schedule";
import type { ActionResult } from "./journal";

/** Только админ. Бросаем — такие вызовы не должны случаться из UI. */
async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

/**
 * Сохранить урок в сетке (upsert по классу × дню × номеру) или убрать его
 * (`subjectId = null`). В клетке допустимы только предметы, которые классу
 * реально преподают (`Teaching`).
 */
export async function saveScheduleSlot(input: {
  classId: string;
  dayOfWeek: number;
  lessonNumber: number;
  subjectId: string | null;
}): Promise<ActionResult> {
  await requireAdmin();

  if (!isSchoolDay(input.dayOfWeek) || !isLessonNumber(input.lessonNumber)) {
    return { ok: false, error: "invalid_slot" };
  }

  const klass = await db.klass.findUnique({
    where: { id: input.classId },
    select: { id: true },
  });
  if (!klass) return { ok: false, error: "not_found" };

  const key = {
    classId: klass.id,
    dayOfWeek: input.dayOfWeek,
    lessonNumber: input.lessonNumber,
  };

  if (!input.subjectId) {
    await db.scheduleSlot.deleteMany({ where: key });
    refresh();
    return { ok: true };
  }

  const teaching = await db.teaching.findFirst({
    where: { classId: klass.id, subjectId: input.subjectId },
    select: { id: true },
  });
  if (!teaching) return { ok: false, error: "subject_not_in_class" };

  await db.scheduleSlot.upsert({
    where: { classId_dayOfWeek_lessonNumber: key },
    create: { ...key, subjectId: input.subjectId },
    update: { subjectId: input.subjectId },
  });

  refresh();
  return { ok: true };
}
