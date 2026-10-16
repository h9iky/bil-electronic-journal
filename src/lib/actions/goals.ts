"use server";

/**
 * Мутации ученика: цель по предмету («симулятор оценки»).
 *
 * Как и в журнале учителя, каждое действие — недоверенный вход: сначала берём
 * ученика из сессии, затем проверяем, что предмет реально ведётся в его классе,
 * и только потом пишем. Никаких `where: { id }` без проверки.
 */

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import { isQuarter } from "@/lib/constants";
import { isGradeInRange } from "@/lib/grading";
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

/** Ставит/переставляет цель ученика по предмету за четверть. */
export async function saveGoal(input: {
  subjectId: string;
  quarter: number;
  targetGrade: number;
}): Promise<ActionResult> {
  const student = await requireStudent();
  if (!isQuarter(input.quarter) || !isGradeInRange(input.targetGrade)) return fail("invalid");
  if (!(await subjectInStudentClass(student.id, input.subjectId))) return fail("forbidden");

  await db.gradeGoal.upsert({
    where: {
      studentId_subjectId_quarter: {
        studentId: student.id,
        subjectId: input.subjectId,
        quarter: input.quarter,
      },
    },
    create: {
      studentId: student.id,
      subjectId: input.subjectId,
      quarter: input.quarter,
      targetGrade: input.targetGrade,
    },
    update: { targetGrade: input.targetGrade },
  });

  refresh();
  return ok;
}

/** Убирает цель ученика по предмету за четверть. */
export async function clearGoal(input: {
  subjectId: string;
  quarter: number;
}): Promise<ActionResult> {
  const student = await requireStudent();
  if (!isQuarter(input.quarter)) return fail("invalid");

  await db.gradeGoal.deleteMany({
    where: { studentId: student.id, subjectId: input.subjectId, quarter: input.quarter },
  });

  refresh();
  return ok;
}
