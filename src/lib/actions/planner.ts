"use server";

/**
 * Мутации личного плана ученика.
 *
 * Каждое действие — недоверенный вход: ученик берётся из сессии, дата/время/
 * текст проверяются теми же функциями, что и на клиенте, предмет — только из
 * `Teaching` класса ученика. Никаких `where: { id }` без `studentId`.
 */

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { parseDay } from "@/lib/day";
import {
  PLANNER_TITLE_MAX,
  insertPlannerTask,
  isValidTime,
  toggleStudentPlannerTask,
} from "@/lib/planner";
import type { ActionResult } from "./journal";

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

/** Только ученик. Бросаем — такие вызовы не должны случаться из UI. */
async function requireStudent(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "STUDENT") throw new Error("Forbidden");
  return user;
}

/** Предмет ведётся в классе, где состоит ученик. */
async function subjectInStudentClass(studentId: string, subjectId: string): Promise<boolean> {
  const enrollment = await db.enrollment.findFirst({ where: { studentId } });
  if (!enrollment) return false;
  const teaching = await db.teaching.findFirst({
    where: { classId: enrollment.classId, subjectId },
  });
  return teaching != null;
}

/** Добавить дело в личный план. */
export async function addPlannerTask(input: {
  date: string;
  time: string | null;
  title: string;
  subjectId: string | null;
}): Promise<ActionResult> {
  const student = await requireStudent();

  const date = parseDay(input.date);
  if (!date) return fail("invalid_date");

  const time = input.time?.trim() || null;
  if (time && !isValidTime(time)) return fail("invalid_time");

  const title = input.title.trim();
  if (!title || title.length > PLANNER_TITLE_MAX) return fail("invalid_title");

  let subjectId: string | null = null;
  if (input.subjectId) {
    if (!(await subjectInStudentClass(student.id, input.subjectId))) return fail("forbidden");
    subjectId = input.subjectId;
  }

  await insertPlannerTask(student.id, { date, time, title, subjectId });
  refresh();
  return ok;
}

/** Отметить дело сделанным / вернуть в план. */
export async function togglePlannerTask(input: { taskId: string }): Promise<ActionResult> {
  const student = await requireStudent();

  const found = await toggleStudentPlannerTask(student.id, input.taskId);
  if (!found) return fail("not_found");

  refresh();
  return ok;
}

/** Удалить дело из плана. */
export async function deletePlannerTask(input: { taskId: string }): Promise<ActionResult> {
  const student = await requireStudent();

  const result = await db.plannerTask.deleteMany({
    where: { id: input.taskId, studentId: student.id },
  });
  if (result.count === 0) return fail("not_found");

  refresh();
  return ok;
}
