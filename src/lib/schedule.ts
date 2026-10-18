/**
 * Расписание уроков: класс × день недели × номер урока.
 *
 * День недели и номер урока — маленькие целые (позиция в сетке, а не дата):
 * 1..5 = Пн..Пт, 1..7 = номер урока. Конверсия «дата → день недели» живёт
 * только здесь, чтобы сайт и бот считали одинаково.
 */

import { db } from "./db";
import { parseDay } from "./day";

export const SCHOOL_DAYS = 5; // Пн..Пт
export const MAX_LESSONS = 7;

export function isSchoolDay(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= SCHOOL_DAYS;
}

export function isLessonNumber(value: number): boolean {
  return Number.isInteger(value) && value >= 1 && value <= MAX_LESSONS;
}

/** День недели по ISO-дате (`YYYY-MM-DD`): 1=Пн..7=Вс; `null` — битая дата. */
export function isoDayOfWeek(dateIso: string): number | null {
  const date = parseDay(dateIso);
  if (!date) return null;
  const day = date.getUTCDay(); // 0=Вс..6=Сб
  return day === 0 ? 7 : day;
}

/** Урок сетки: где стоит и что ведут. */
export interface ScheduleSlotRow {
  dayOfWeek: number;
  lessonNumber: number;
  subjectId: string;
}

export interface ClassScheduleData {
  classId: string;
  className: string;
  year: string;
  /** Предметы, которые классу преподают (из `Teaching`) — только они доступны в сетке. */
  subjects: { id: string; name: string }[];
  slots: ScheduleSlotRow[];
}

/** Данные страницы «Расписание класса» (админ). `null` — класса нет. */
export async function getClassScheduleData(
  classId: string,
): Promise<ClassScheduleData | null> {
  const klass = await db.klass.findUnique({
    where: { id: classId },
    include: {
      teachings: { include: { subject: true } },
      scheduleSlots: true,
    },
  });
  if (!klass) return null;

  const subjects = [
    ...new Map(
      klass.teachings.map((teaching) => [
        teaching.subject.id,
        { id: teaching.subject.id, name: teaching.subject.name },
      ]),
    ).values(),
  ].sort((a, b) => a.name.localeCompare(b.name));

  return {
    classId: klass.id,
    className: klass.name,
    year: klass.year,
    subjects,
    slots: klass.scheduleSlots.map((slot) => ({
      dayOfWeek: slot.dayOfWeek,
      lessonNumber: slot.lessonNumber,
      subjectId: slot.subjectId,
    })),
  };
}
