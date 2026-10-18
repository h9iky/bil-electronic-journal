/**
 * Личный план ученика: дела по дням (планировщик).
 *
 * `date` — позиция дня (00:00 UTC, как в `Homework`), `time` — строка "HH:MM"
 * или null. Неделя начинается с понедельника; «дата → неделя» считаем только
 * здесь, чтобы страница журнала и бот не разошлись.
 */

import { db } from "./db";
import { formatDay, parseDay } from "./day";

const DAY_MS = 86_400_000;

/** Защита от «покажи план за год» — общая для ручек бота и диапазонов. */
export const MAX_PLAN_SPAN_DAYS = 31;

/** Максимальная длина текста дела (экшены и ручка бота проверяют одинаково). */
export const PLANNER_TITLE_MAX = 200;

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

/** "18:00", "09:30" — ок; "25:00", "9:00", "18.00" — нет. */
export function isValidTime(value: string): boolean {
  return TIME_PATTERN.test(value);
}

/** Понедельник недели, в которую попадает день (`YYYY-MM-DD`); null — битая дата. */
export function weekStartIso(dateIso: string): string | null {
  const date = parseDay(dateIso);
  if (!date) return null;
  const dayOfWeek = date.getUTCDay(); // 0=Вс..6=Сб
  const shift = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  return formatDay(new Date(date.getTime() - shift * DAY_MS));
}

/** Сдвиг дня на `days` (может быть отрицательным); null — битая дата. */
export function addDaysIso(dateIso: string, days: number): string | null {
  const date = parseDay(dateIso);
  if (!date) return null;
  return formatDay(new Date(date.getTime() + days * DAY_MS));
}

/** Дело планера для страницы и бота. */
export interface PlannerTaskRow {
  id: string;
  /** День дела (`YYYY-MM-DD`). */
  date: string;
  /** "HH:MM" или null. */
  time: string | null;
  title: string;
  done: boolean;
  /** Название предмета, если дело привязано. */
  subject: string | null;
}

function toPlannerRow(row: {
  id: string;
  date: Date;
  time: string | null;
  title: string;
  done: boolean;
  subject: { name: string } | null;
}): PlannerTaskRow {
  return {
    id: row.id,
    date: formatDay(row.date),
    time: row.time,
    title: row.title,
    done: row.done,
    subject: row.subject?.name ?? null,
  };
}

/**
 * Дела ученика за диапазон дней (включительно).
 * `null` — диапазон битый или шире `MAX_PLAN_SPAN_DAYS`.
 * Порядок: день ↑; без времени — раньше (в SQLite NULL первый), затем время ↑.
 */
export async function getStudentPlannerRange(
  studentId: string,
  fromIso: string,
  toIso: string,
): Promise<PlannerTaskRow[] | null> {
  const from = parseDay(fromIso);
  const to = parseDay(toIso);
  if (!from || !to || to < from) return null;
  if ((to.getTime() - from.getTime()) / DAY_MS > MAX_PLAN_SPAN_DAYS) return null;

  const rows = await db.plannerTask.findMany({
    where: { studentId, date: { gte: from, lt: new Date(to.getTime() + DAY_MS) } },
    include: { subject: true },
    orderBy: [{ date: "asc" }, { time: "asc" }, { createdAt: "asc" }],
  });
  return rows.map(toPlannerRow);
}

/** Предметы класса ученика — для выпадающего списка формы планера. */
export async function listStudentSubjects(
  studentId: string,
): Promise<{ id: string; name: string }[]> {
  const enrollment = await db.enrollment.findFirst({
    where: { studentId },
    include: { klass: { include: { teachings: { include: { subject: true } } } } },
  });
  if (!enrollment) return [];

  const subjects = new Map(
    enrollment.klass.teachings.map((teaching) => [teaching.subject.id, teaching.subject.name]),
  );
  return [...subjects.entries()]
    .map(([id, name]) => ({ id, name }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Вставить дело (значения уже провалидированы вызывающим). */
export async function insertPlannerTask(
  studentId: string,
  input: { date: Date; time: string | null; title: string; subjectId: string | null },
): Promise<PlannerTaskRow> {
  const row = await db.plannerTask.create({
    data: { studentId, ...input },
    include: { subject: true },
  });
  return toPlannerRow(row);
}

/** Переключить «сделано» у своего дела. `false` — дела нет (чужое или не существует). */
export async function toggleStudentPlannerTask(
  studentId: string,
  taskId: string,
): Promise<boolean> {
  const task = await db.plannerTask.findFirst({
    where: { id: taskId, studentId },
    select: { id: true, done: true },
  });
  if (!task) return false;

  await db.plannerTask.update({ where: { id: task.id }, data: { done: !task.done } });
  return true;
}
