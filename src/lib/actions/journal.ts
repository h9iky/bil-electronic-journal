"use server";

/**
 * Мутации журнала учителя.
 *
 * Каждое действие — недоверенный вход (см. Next docs: «treat every action as an
 * untrusted entry point»): сначала берём учителя из сессии, потом проверяем, что
 * работа/класс реально его, и только затем пишем в БД. Никаких `where: { id }`
 * без проверки владельца.
 */

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser, type SessionUser } from "@/lib/auth";
import {
  isAssessmentStatus,
  isAssessmentType,
  isBehaviorKind,
  isProposalBasis,
  isProposalStatus,
  isQuarter,
  GRADE_MAX,
  GRADE_MIN,
  type AssessmentStatus,
  type AssessmentType,
  type BehaviorKind,
  type ProposalBasis,
  type ProposalStatus,
} from "@/lib/constants";
import { isActivityInRange, isScoreValid } from "@/lib/grading";

export interface ActionResult {
  ok: boolean;
  error?: string;
}

const ok: ActionResult = { ok: true };
const fail = (error: string): ActionResult => ({ ok: false, error });

/** Только учитель. Бросаем — такие вызовы не должны случаться из UI. */
async function requireTeacher(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user || user.role !== "TEACHER") throw new Error("Forbidden");
  return user;
}

/** Работа существует и принадлежит этому учителю. */
async function ownedAssessment(teacherId: string, assessmentId: string) {
  return db.assessment.findFirst({ where: { id: assessmentId, teacherId } });
}

/** Преподавание существует и принадлежит этому учителю. */
async function ownedTeaching(teacherId: string, teachingId: string) {
  return db.teaching.findFirst({ where: { id: teachingId, teacherId } });
}

// ---------------------------------------------------------------------------
// Оценки
// ---------------------------------------------------------------------------

export async function saveGrade(input: {
  assessmentId: string;
  studentId: string;
  score: number | null;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const assessment = await ownedAssessment(teacher.id, input.assessmentId);
  if (!assessment) return fail("not_found");

  // Ученик должен учиться в этом классе — иначе оценка «в воздух».
  const enrolled = await db.enrollment.findFirst({
    where: { studentId: input.studentId, classId: assessment.classId },
  });
  if (!enrolled) return fail("not_enrolled");

  if (input.score == null) {
    await db.grade.deleteMany({
      where: { assessmentId: assessment.id, studentId: input.studentId },
    });
    refresh();
    return ok;
  }

  if (!isScoreValid(input.score, assessment.maxScore)) return fail("invalid_score");

  await db.grade.upsert({
    where: {
      assessmentId_studentId: {
        assessmentId: assessment.id,
        studentId: input.studentId,
      },
    },
    create: {
      assessmentId: assessment.id,
      studentId: input.studentId,
      score: input.score,
    },
    update: { score: input.score },
  });

  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Работы (FORMATIVE / SAS / SAT)
// ---------------------------------------------------------------------------

export async function createAssessment(input: {
  teachingId: string;
  type: AssessmentType;
  title: string;
  maxScore: number;
  sectionId: string | null;
  quarter: number;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const teaching = await ownedTeaching(teacher.id, input.teachingId);
  if (!teaching) return fail("not_found");

  if (!isAssessmentType(input.type)) return fail("invalid_type");

  const title = input.title.trim();
  if (title.length === 0 || title.length > 200) return fail("invalid_title");

  if (!Number.isInteger(input.maxScore) || input.maxScore <= 0 || input.maxScore > 1000) {
    return fail("invalid_max_score");
  }

  if (!isQuarter(input.quarter)) return fail("invalid_quarter");

  // SAS привязан к разделу программы, SAT — ровно один за четверть.
  let sectionId: string | null = null;
  if (input.type === "SAS") {
    if (!input.sectionId) return fail("section_required");
    const section = await db.section.findFirst({
      where: {
        id: input.sectionId,
        subjectId: teaching.subjectId,
        quarter: input.quarter,
      },
    });
    if (!section) return fail("invalid_section");
    sectionId = section.id;
  }

  if (input.type === "SAT") {
    const existing = await db.assessment.count({
      where: {
        classId: teaching.classId,
        subjectId: teaching.subjectId,
        quarter: input.quarter,
        type: "SAT",
      },
    });
    if (existing > 0) return fail("sat_exists");
  }

  await db.assessment.create({
    data: {
      classId: teaching.classId,
      subjectId: teaching.subjectId,
      teacherId: teacher.id,
      type: input.type,
      status: "DRAFT",
      sectionId,
      title,
      maxScore: input.maxScore,
      quarter: input.quarter,
    },
  });

  refresh();
  return ok;
}

export async function setAssessmentStatus(input: {
  assessmentId: string;
  status: AssessmentStatus;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  if (!isAssessmentStatus(input.status)) return fail("invalid_status");

  const assessment = await ownedAssessment(teacher.id, input.assessmentId);
  if (!assessment) return fail("not_found");

  await db.assessment.update({
    where: { id: assessment.id },
    data: { status: input.status },
  });

  refresh();
  return ok;
}

export async function deleteAssessment(input: {
  assessmentId: string;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const assessment = await ownedAssessment(teacher.id, input.assessmentId);
  if (!assessment) return fail("not_found");

  // Оценки держат внешний ключ на работу — чистим их первыми.
  await db.$transaction([
    db.grade.deleteMany({ where: { assessmentId: assessment.id } }),
    db.assessment.delete({ where: { id: assessment.id } }),
  ]);

  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Активность и поведение
// ---------------------------------------------------------------------------

/** Комментарий: обрезаем и превращаем пустую строку в `null`. */
const cleanComment = (value?: string | null): string | null => value?.trim() || null;

export async function saveActivity(input: {
  teachingId: string;
  studentId: string;
  value: number;
  comment?: string | null;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const teaching = await ownedTeaching(teacher.id, input.teachingId);
  if (!teaching) return fail("not_found");

  if (!isActivityInRange(input.value)) return fail("invalid_value");

  const enrolled = await db.enrollment.findFirst({
    where: { studentId: input.studentId, classId: teaching.classId },
  });
  if (!enrolled) return fail("not_enrolled");

  await db.activityScore.create({
    data: {
      studentId: input.studentId,
      subjectId: teaching.subjectId,
      teacherId: teacher.id,
      value: input.value,
      comment: cleanComment(input.comment),
    },
  });

  refresh();
  return ok;
}

/** Правка существующей записи активности — только своей. */
export async function updateActivity(input: {
  activityId: string;
  value: number;
  comment?: string | null;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  if (!isActivityInRange(input.value)) return fail("invalid_value");

  const record = await db.activityScore.findFirst({
    where: { id: input.activityId, teacherId: teacher.id },
  });
  if (!record) return fail("not_found");

  await db.activityScore.update({
    where: { id: record.id },
    data: { value: input.value, comment: cleanComment(input.comment) },
  });

  refresh();
  return ok;
}

export async function deleteActivity(input: { activityId: string }): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const record = await db.activityScore.findFirst({
    where: { id: input.activityId, teacherId: teacher.id },
  });
  if (!record) return fail("not_found");

  await db.activityScore.delete({ where: { id: record.id } });

  refresh();
  return ok;
}

export async function saveBehavior(input: {
  teachingId: string;
  studentId: string;
  kind: BehaviorKind;
  points: number;
  comment?: string | null;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const teaching = await ownedTeaching(teacher.id, input.teachingId);
  if (!teaching) return fail("not_found");

  if (!isBehaviorKind(input.kind)) return fail("invalid_kind");
  if (!Number.isInteger(input.points) || input.points < 0 || input.points > 100) {
    return fail("invalid_points");
  }

  const enrolled = await db.enrollment.findFirst({
    where: { studentId: input.studentId, classId: teaching.classId },
  });
  if (!enrolled) return fail("not_enrolled");

  await db.behaviorRecord.create({
    data: {
      studentId: input.studentId,
      classId: teaching.classId,
      teacherId: teacher.id,
      kind: input.kind,
      points: input.points,
      comment: cleanComment(input.comment),
    },
  });

  refresh();
  return ok;
}

/** Правка существующей записи поведения — только своей. */
export async function updateBehavior(input: {
  behaviorId: string;
  kind: BehaviorKind;
  points: number;
  comment?: string | null;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  if (!isBehaviorKind(input.kind)) return fail("invalid_kind");
  if (!Number.isInteger(input.points) || input.points < 0 || input.points > 100) {
    return fail("invalid_points");
  }

  const record = await db.behaviorRecord.findFirst({
    where: { id: input.behaviorId, teacherId: teacher.id },
  });
  if (!record) return fail("not_found");

  await db.behaviorRecord.update({
    where: { id: record.id },
    data: { kind: input.kind, points: input.points, comment: cleanComment(input.comment) },
  });

  refresh();
  return ok;
}

export async function deleteBehavior(input: { behaviorId: string }): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const record = await db.behaviorRecord.findFirst({
    where: { id: input.behaviorId, teacherId: teacher.id },
  });
  if (!record) return fail("not_found");

  await db.behaviorRecord.delete({ where: { id: record.id } });

  refresh();
  return ok;
}

// ---------------------------------------------------------------------------
// Предложения («потенциальная оценка»)
// ---------------------------------------------------------------------------

/**
 * Создать или заменить рекомендацию по (ученик, предмет, четверть).
 *
 * Схема допускает ключ `[studentId, subjectId, quarter, basis]`, но в журнале
 * держим одно предложение на четверть: `basis` — это лишь обоснование, а не
 * отдельная сущность. Поэтому при повторном вызове обновляем строку и снова
 * переводим её в `PENDING` — учитель передумал, пусть решает заново.
 */
export async function saveProposal(input: {
  teachingId: string;
  studentId: string;
  quarter: number;
  value: number;
  basis: ProposalBasis;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const teaching = await ownedTeaching(teacher.id, input.teachingId);
  if (!teaching) return fail("not_found");

  if (!Number.isInteger(input.value) || input.value < GRADE_MIN || input.value > GRADE_MAX) {
    return fail("invalid_grade");
  }
  if (!isProposalBasis(input.basis)) return fail("invalid_basis");
  if (!isQuarter(input.quarter)) return fail("invalid_quarter");

  const enrolled = await db.enrollment.findFirst({
    where: { studentId: input.studentId, classId: teaching.classId },
  });
  if (!enrolled) return fail("not_enrolled");

  const existing = await db.proposedGrade.findFirst({
    where: {
      studentId: input.studentId,
      subjectId: teaching.subjectId,
      quarter: input.quarter,
    },
  });

  if (existing) {
    await db.proposedGrade.update({
      where: { id: existing.id },
      data: {
        value: input.value,
        basis: input.basis,
        status: "PENDING",
        classId: teaching.classId,
        createdById: teacher.id,
      },
    });
  } else {
    await db.proposedGrade.create({
      data: {
        studentId: input.studentId,
        subjectId: teaching.subjectId,
        classId: teaching.classId,
        quarter: input.quarter,
        value: input.value,
        basis: input.basis,
        status: "PENDING",
        createdById: teacher.id,
      },
    });
  }

  refresh();
  return ok;
}

/** Решение учителя: применить (`ACCEPTED`), отклонить (`REJECTED`) или вернуть в `PENDING`. */
export async function setProposalStatus(input: {
  teachingId: string;
  studentId: string;
  quarter: number;
  status: ProposalStatus;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const teaching = await ownedTeaching(teacher.id, input.teachingId);
  if (!teaching) return fail("not_found");
  if (!isProposalStatus(input.status)) return fail("invalid_status");

  const proposal = await db.proposedGrade.findFirst({
    where: {
      studentId: input.studentId,
      subjectId: teaching.subjectId,
      quarter: input.quarter,
    },
  });
  if (!proposal) return fail("not_found");

  await db.proposedGrade.update({
    where: { id: proposal.id },
    data: { status: input.status },
  });

  refresh();
  return ok;
}

export async function deleteProposal(input: {
  teachingId: string;
  studentId: string;
  quarter: number;
}): Promise<ActionResult> {
  const teacher = await requireTeacher();
  const teaching = await ownedTeaching(teacher.id, input.teachingId);
  if (!teaching) return fail("not_found");

  const proposal = await db.proposedGrade.findFirst({
    where: {
      studentId: input.studentId,
      subjectId: teaching.subjectId,
      quarter: input.quarter,
    },
  });
  if (!proposal) return fail("not_found");

  await db.proposedGrade.delete({ where: { id: proposal.id } });

  refresh();
  return ok;
}
