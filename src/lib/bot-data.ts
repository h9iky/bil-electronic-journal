/**
 * Данные для команд бота Ask BIL: `/hw`, `/marks`, `/today`
 * и вечерний дайджест.
 *
 * Только чтение. Математика берётся из `queries.ts`/`grading.ts` — поэтому
 * цифры в Telegram совпадают с сайтом. Своих формул здесь нет и быть не должно.
 */

import { db } from "./db";
import { formatDay, parseDay } from "./day";
import { getStudentDashboard } from "./queries";
import { SCHOOL_DAYS, isoDayOfWeek } from "./schedule";

/** Максимум дней в диапазоне домашки — защита от «дай всё за год». */
const MAX_HOMEWORK_SPAN_DAYS = 31;

/** Максимум дней в горизонте дайджеста. */
const MAX_DIGEST_DAYS = 14;

const DAY_MS = 86_400_000;

export interface BotHomeworkItem {
  id: string;
  subject: string;
  title: string;
  description: string | null;
  /** День урока, на который задано (`YYYY-MM-DD`). */
  date: string;
  /** Срок сдачи (`YYYY-MM-DD`) или null. */
  dueDate: string | null;
  teacher: string;
}

function toBotHomework(row: {
  id: string;
  title: string;
  description: string | null;
  date: Date;
  dueDate: Date | null;
  subject: { name: string };
  teacher: { fullName: string };
}): BotHomeworkItem {
  return {
    id: row.id,
    subject: row.subject.name,
    title: row.title,
    description: row.description,
    date: formatDay(row.date),
    dueDate: row.dueDate ? formatDay(row.dueDate) : null,
    teacher: row.teacher.fullName,
  };
}

/**
 * Домашка класса ученика за диапазон дней (включительно).
 * `null` — если диапазон битый или ученик не состоит в классе.
 */
export async function getStudentHomeworkRange(
  studentId: string,
  fromIso: string,
  toIso: string,
): Promise<BotHomeworkItem[] | null> {
  const from = parseDay(fromIso);
  const to = parseDay(toIso);
  if (!from || !to || to < from) return null;
  if ((to.getTime() - from.getTime()) / DAY_MS > MAX_HOMEWORK_SPAN_DAYS) return null;

  // `lt` конца следующих суток, а не `lte` — некоторые даты в базе имеют
  // ненулевое время (сид создавал их локальным временем), день всё равно нужен.
  const endExclusive = new Date(to.getTime() + DAY_MS);

  const enrollment = await db.enrollment.findFirst({
    where: { studentId },
    select: { classId: true },
  });
  if (!enrollment) return null;

  const rows = await db.homework.findMany({
    where: {
      classId: enrollment.classId,
      // И задано на эти дни, и «сдать в эти дни» — второе важно для старых
      // уроков: их срок сдачи ещё впереди.
      OR: [
        { date: { gte: from, lt: endExclusive } },
        { dueDate: { gte: from, lt: endExclusive } },
      ],
    },
    include: { subject: true, teacher: true },
    orderBy: [{ date: "asc" }, { subject: { name: "asc" } }],
  });

  return rows.map(toBotHomework);
}

// --- Расписание ---

export interface BotScheduleSlot {
  /** Номер урока в дне (1..7). */
  lesson: number;
  subject: string;
}

export interface BotDaySchedule {
  /** День недели: 1=Пн..7=Вс. */
  dayOfWeek: number;
  className: string | null;
  slots: BotScheduleSlot[];
}

/**
 * Расписание класса ученика на день (`dateIso`).
 * `null` — битая дата или ученик не состоит в классе.
 */
export async function getStudentDaySchedule(
  studentId: string,
  dateIso: string,
): Promise<BotDaySchedule | null> {
  const dayOfWeek = isoDayOfWeek(dateIso);
  if (!dayOfWeek) return null;

  const enrollment = await db.enrollment.findFirst({
    where: { studentId },
    include: { klass: true },
  });
  if (!enrollment) return null;

  // В субботу и воскресенье уроков по определению нет — пустой список.
  if (dayOfWeek > SCHOOL_DAYS) {
    return { dayOfWeek, className: enrollment.klass.name, slots: [] };
  }

  const rows = await db.scheduleSlot.findMany({
    where: { classId: enrollment.classId, dayOfWeek },
    include: { subject: true },
    orderBy: { lessonNumber: "asc" },
  });

  return {
    dayOfWeek,
    className: enrollment.klass.name,
    slots: rows.map((row) => ({ lesson: row.lessonNumber, subject: row.subject.name })),
  };
}

// --- Оценки ---

export interface BotGradeLine {
  title: string;
  type: string;
  score: number | null;
  maxScore: number;
  percent: number | null;
  date: string;
}

export interface BotSubjectMarks {
  subject: string;
  percent: number | null;
  grade: number | null;
  /** Цель ученика по предмету (2–5) или null. */
  goal: number | null;
  /** Последние оценки по предмету (свежие сверху). */
  lastGrades: BotGradeLine[];
}

export interface BotMarks {
  quarter: number;
  className: string | null;
  overallPercent: number | null;
  activityAverage: number | null;
  subjects: BotSubjectMarks[];
}

/** Сколько последних оценок по предмету показывать в Telegram. */
const MARKS_PER_SUBJECT = 3;

/** Оценки ученика: тот же дашборд, что на сайте, но компактно. */
export async function getStudentMarks(studentId: string, quarter = 1): Promise<BotMarks> {
  const dashboard = await getStudentDashboard(studentId, quarter);

  return {
    quarter,
    className: dashboard.className,
    overallPercent: dashboard.overallPercent,
    activityAverage: dashboard.activityAverage,
    subjects: dashboard.subjects.map((block) => ({
      subject: block.subjectName,
      percent: block.quarterPercent,
      grade: block.quarterGrade,
      goal: block.goal,
      lastGrades: block.grades.slice(0, MARKS_PER_SUBJECT).map((grade) => ({
        title: grade.title,
        type: grade.type,
        score: grade.score,
        maxScore: grade.maxScore,
        percent: grade.percent,
        date: formatDay(grade.date),
      })),
    })),
  };
}

// --- Дайджест ---

export interface BotAssessmentSoon {
  subject: string;
  type: string;
  title: string;
  date: string;
  maxScore: number;
}

export interface BotDigest {
  className: string | null;
  /** Что задано на завтра (урок завтра). */
  assigned: BotHomeworkItem[];
  /** Что нужно сдать завтра (dueDate завтра), не пересекаясь с assigned. */
  due: BotHomeworkItem[];
  /** Работы SAS/SAT в ближайшие дни. */
  assessments: BotAssessmentSoon[];
}

/**
 * Дайджест ученика: `from` — сегодня, `days` — на сколько дней смотреть вперёд.
 * `null` — если вход битый или ученик не состоит в классе.
 */
export async function getStudentDigest(
  studentId: string,
  fromIso: string,
  days: number,
): Promise<BotDigest | null> {
  const from = parseDay(fromIso);
  if (!from || !Number.isInteger(days) || days < 1 || days > MAX_DIGEST_DAYS) return null;

  const enrollment = await db.enrollment.findFirst({
    where: { studentId },
    include: { klass: true },
  });
  if (!enrollment) return null;

  const tomorrow = new Date(from.getTime() + DAY_MS);
  const tomorrowEnd = new Date(tomorrow.getTime() + DAY_MS);
  // Конец горизонта — начало суток после последнего дня (см. комментарий про
  // время в датах у getStudentHomeworkRange).
  const horizonEnd = new Date(from.getTime() + days * DAY_MS);

  const [assigned, due, assessments] = await Promise.all([
    db.homework.findMany({
      where: { classId: enrollment.classId, date: { gte: tomorrow, lt: tomorrowEnd } },
      include: { subject: true, teacher: true },
      orderBy: { subject: { name: "asc" } },
    }),
    db.homework.findMany({
      where: { classId: enrollment.classId, dueDate: { gte: tomorrow, lt: tomorrowEnd } },
      include: { subject: true, teacher: true },
      orderBy: { subject: { name: "asc" } },
    }),
    db.assessment.findMany({
      where: {
        classId: enrollment.classId,
        status: "PUBLISHED",
        type: { in: ["SAS", "SAT"] },
        date: { gte: from, lt: horizonEnd },
      },
      include: { subject: true },
      orderBy: [{ date: "asc" }, { subject: { name: "asc" } }],
    }),
  ]);

  const assignedItems = assigned.map(toBotHomework);
  const assignedIds = new Set(assignedItems.map((item) => item.id));

  return {
    className: enrollment.klass.name,
    assigned: assignedItems,
    due: due.map(toBotHomework).filter((item) => !assignedIds.has(item.id)),
    assessments: assessments.map((assessment) => ({
      subject: assessment.subject.name,
      type: assessment.type,
      title: assessment.title,
      date: formatDay(assessment.date),
      maxScore: assessment.maxScore,
    })),
  };
}

// --- Получатели рассылки ---

/** Кому бот может писать: привязанные ученики (учителя пока не получатели). */
export async function listLinkedStudents(): Promise<{ telegramId: string }[]> {
  return db.telegramLink.findMany({
    where: { user: { role: "STUDENT" } },
    select: { telegramId: true },
    orderBy: { createdAt: "asc" },
  });
}
