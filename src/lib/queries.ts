/**
 * Слой данных: всё, что читается из БД для дашбордов, собирается здесь.
 *
 * Страница-дашборд больше не знает про Prisma: она вызывает одну функцию и
 * получает готовые, типизированные данные. Математика — в `grading.ts`,
 * допустимые значения — в `constants.ts`.
 */

import { db } from "./db";
import {
  DEFAULT_ROUNDING,
  DEFAULT_RULES,
  isAssessmentType,
  isBehaviorKind,
  isProposalStatus,
  isRoundingMode,
  type AssessmentType,
  type BehaviorKind,
  type GradingRules,
  type ProposalStatus,
} from "./constants";
import {
  averageActivity,
  behaviorBalance,
  quarterGrade,
  quarterPercent,
  round,
  type BehaviorBalance,
  type GroupScore,
} from "./grading";

const EMPTY_GROUP = (): GroupScore => ({ sumScore: 0, sumMax: 0, count: 0 });

/** Несданные работы (score = null) не искажают процент — их просто нет в группе. */
function addToGroup(group: GroupScore, score: number | null, maxScore: number): void {
  if (score == null || maxScore <= 0) return;
  group.sumScore += score;
  group.sumMax += maxScore;
  group.count += 1;
}

/** Настройки оценивания класса или дефолт, если их ещё не задали. */
export async function loadGradingRules(classId: string | null): Promise<GradingRules> {
  if (!classId) return DEFAULT_RULES;

  const settings = await db.classSettings.findUnique({ where: { classId } });
  if (!settings) return DEFAULT_RULES;

  return {
    weights: {
      sas: settings.sasWeight,
      sat: settings.satWeight,
      formative: settings.formativeWeight,
    },
    thresholds: {
      three: settings.thresholdThree,
      four: settings.thresholdFour,
      five: settings.thresholdFive,
    },
    rounding: isRoundingMode(settings.rounding) ? settings.rounding : DEFAULT_ROUNDING,
  };
}

// ---------------------------------------------------------------------------
// Ученик
// ---------------------------------------------------------------------------

export interface StudentGradeRow {
  id: string;
  type: AssessmentType;
  title: string;
  score: number | null;
  maxScore: number;
  percent: number | null;
  date: Date;
  comment: string | null;
}

export interface StudentActivityRow {
  id: string;
  value: number;
  comment: string | null;
  date: Date;
}

export interface StudentBehaviorRow {
  id: string;
  kind: BehaviorKind;
  points: number;
  comment: string | null;
  date: Date;
}

export interface StudentProposal {
  value: number;
  basis: string;
  status: ProposalStatus;
}

export interface StudentSubjectBlock {
  subjectId: string;
  subjectName: string;
  grades: StudentGradeRow[];
  quarterPercent: number | null;
  quarterGrade: number | null;
}

export interface StudentDashboard {
  className: string | null;
  year: string | null;
  subjects: StudentSubjectBlock[];
  overallPercent: number | null;
  activities: StudentActivityRow[];
  activityAverage: number | null;
  behaviors: StudentBehaviorRow[];
  behavior: BehaviorBalance;
  proposal: StudentProposal | null;
}

export async function getStudentDashboard(
  studentId: string,
  quarter = 1,
): Promise<StudentDashboard> {
  const enrollment = await db.enrollment.findFirst({
    where: { studentId },
    include: { klass: true },
  });
  const rules = await loadGradingRules(enrollment?.classId ?? null);

  const [grades, activities, behaviors, proposals] = await Promise.all([
    db.grade.findMany({
      where: { studentId, assessment: { status: "PUBLISHED", quarter } },
      include: { assessment: { include: { subject: true } } },
      orderBy: { assessment: { date: "desc" } },
    }),
    db.activityScore.findMany({
      where: { studentId },
      include: { subject: true },
      orderBy: { date: "desc" },
    }),
    db.behaviorRecord.findMany({
      where: { studentId },
      orderBy: { date: "desc" },
    }),
    db.proposedGrade.findMany({
      where: { studentId, quarter },
      include: { subject: true },
      orderBy: { value: "desc" },
    }),
  ]);

  const subjectBlocks = new Map<string, StudentSubjectBlock>();

  for (const grade of grades) {
    const assessment = grade.assessment;
    if (!isAssessmentType(assessment.type)) continue;

    const block = subjectBlocks.get(assessment.subjectId) ?? {
      subjectId: assessment.subjectId,
      subjectName: assessment.subject.name,
      grades: [],
      quarterPercent: null,
      quarterGrade: null,
    };
    block.grades.push({
      id: grade.id,
      type: assessment.type,
      title: assessment.title,
      score: grade.score,
      maxScore: assessment.maxScore,
      percent:
        grade.score == null || assessment.maxScore <= 0
          ? null
          : round((grade.score / assessment.maxScore) * 100, rules.rounding),
      date: assessment.date,
      comment: grade.comment,
    });
    subjectBlocks.set(assessment.subjectId, block);
  }

  for (const block of subjectBlocks.values()) {
    const groups: Record<AssessmentType, GroupScore> = {
      FORMATIVE: EMPTY_GROUP(),
      SAS: EMPTY_GROUP(),
      SAT: EMPTY_GROUP(),
    };
    for (const row of block.grades) {
      addToGroup(groups[row.type], row.score, row.maxScore);
    }
    block.quarterPercent = quarterPercent(
      { sas: groups.SAS, sat: groups.SAT, formative: groups.FORMATIVE },
      rules,
    );
    block.quarterGrade = quarterGrade(
      { sas: groups.SAS, sat: groups.SAT, formative: groups.FORMATIVE },
      rules,
    );
  }

  const blocks = [...subjectBlocks.values()];
  const percents = blocks
    .map((b) => b.quarterPercent)
    .filter((p): p is number => p != null);
  const overallPercent =
    percents.length > 0
      ? round(percents.reduce((a, b) => a + b, 0) / percents.length, rules.rounding)
      : null;

  const activityValues = activities.map((a) => a.value);
  const acceptedProposal = proposals.find((p) => p.status === "ACCEPTED");

  return {
    className: enrollment?.klass.name ?? null,
    year: enrollment?.klass.year ?? null,
    subjects: blocks,
    overallPercent,
    activities: activities.map((a) => ({
      id: a.id,
      value: a.value,
      comment: a.comment,
      date: a.date,
    })),
    activityAverage: averageActivity(activityValues),
    behaviors: behaviors
      .filter((b) => isBehaviorKind(b.kind))
      .map((b) => ({
        id: b.id,
        kind: b.kind as BehaviorKind,
        points: b.points,
        comment: b.comment,
        date: b.date,
      })),
    behavior: behaviorBalance(behaviors),
    proposal: acceptedProposal
      ? {
          value: acceptedProposal.value,
          basis: acceptedProposal.basis,
          status: "ACCEPTED",
        }
      : null,
  };
}

// ---------------------------------------------------------------------------
// Учитель
// ---------------------------------------------------------------------------

export interface TeacherStudentRow {
  id: string;
  fullName: string;
  email: string;
  sas: GroupScore;
  sat: GroupScore;
  activityAverage: number | null;
  proposal: { value: number; status: ProposalStatus } | null;
  quarterPercent: number | null;
  quarterGrade: number | null;
}

export interface TeacherClassBlock {
  teachingId: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
  rules: GradingRules;
  students: TeacherStudentRow[];
}

export async function getTeacherDashboard(
  teacherId: string,
  quarter = 1,
): Promise<TeacherClassBlock[]> {
  const teachings = await db.teaching.findMany({
    where: { teacherId },
    include: { klass: true, subject: true },
  });
  if (teachings.length === 0) return [];

  const classIds = [...new Set(teachings.map((t) => t.classId))];
  const subjectIds = [...new Set(teachings.map((t) => t.subjectId))];

  const [enrollments, assessments, activities, proposals] = await Promise.all([
    db.enrollment.findMany({
      where: { classId: { in: classIds } },
      include: { student: true },
      orderBy: { student: { fullName: "asc" } },
    }),
    db.assessment.findMany({
      where: { classId: { in: classIds }, subjectId: { in: subjectIds }, quarter },
    }),
    db.activityScore.findMany({
      where: { subjectId: { in: subjectIds } },
    }),
    db.proposedGrade.findMany({
      where: { subjectId: { in: subjectIds }, quarter },
    }),
  ]);

  const assessmentIds = assessments.map((a) => a.id);
  const grades = assessmentIds.length
    ? await db.grade.findMany({ where: { assessmentId: { in: assessmentIds } } })
    : [];

  // Индекс «оценка по (работа, ученик)» — вместо вложенных поисков в цикле.
  const scoreByAssessment = new Map<string, number | null>();
  for (const grade of grades) {
    scoreByAssessment.set(`${grade.assessmentId}|${grade.studentId}`, grade.score);
  }

  const rulesByClass = new Map<string, GradingRules>();
  for (const id of classIds) {
    rulesByClass.set(id, await loadGradingRules(id));
  }

  return teachings.map((teaching) => {
    const rules = rulesByClass.get(teaching.classId) ?? DEFAULT_RULES;
    const classStudents = enrollments.filter((e) => e.classId === teaching.classId);
    const classAssessments = assessments.filter(
      (a) => a.subjectId === teaching.subjectId,
    );

    const students: TeacherStudentRow[] = classStudents.map(({ student }) => {
      const sas = EMPTY_GROUP();
      const sat = EMPTY_GROUP();

      for (const assessment of classAssessments) {
        const score = scoreByAssessment.get(`${assessment.id}|${student.id}`) ?? null;
        if (assessment.type === "SAS") addToGroup(sas, score, assessment.maxScore);
        if (assessment.type === "SAT") addToGroup(sat, score, assessment.maxScore);
      }

      const studentActivity = activities.filter(
        (a) => a.studentId === student.id && a.subjectId === teaching.subjectId,
      );
      const proposal = proposals.find(
        (p) => p.studentId === student.id && p.subjectId === teaching.subjectId,
      );

      const parts = { sas, sat };
      const finalProposal =
        proposal && isProposalStatus(proposal.status)
          ? { value: proposal.value, status: proposal.status }
          : null;

      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        sas,
        sat,
        activityAverage: averageActivity(studentActivity.map((a) => a.value)),
        proposal: finalProposal,
        quarterPercent: quarterPercent(parts, rules),
        quarterGrade: quarterGrade(parts, rules),
      };
    });

    return {
      teachingId: teaching.id,
      classId: teaching.classId,
      className: teaching.klass.name,
      subjectId: teaching.subjectId,
      subjectName: teaching.subject.name,
      rules,
      students,
    };
  });
}

// ---------------------------------------------------------------------------
// Админ
// ---------------------------------------------------------------------------

export interface AdminUserRow {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: Date;
}

export interface AdminDashboard {
  totalUsers: number;
  totalClasses: number;
  totalSubjects: number;
  classNames: string[];
  subjectNames: string[];
  users: AdminUserRow[];
}

export async function getAdminDashboard(): Promise<AdminDashboard> {
  const [totalUsers, totalClasses, totalSubjects, classes, subjects, users] =
    await Promise.all([
      db.user.count(),
      db.klass.count(),
      db.subject.count(),
      db.klass.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
      db.subject.findMany({ select: { name: true }, orderBy: { name: "asc" } }),
      db.user.findMany({ orderBy: { createdAt: "desc" }, take: 20 }),
    ]);

  return {
    totalUsers,
    totalClasses,
    totalSubjects,
    classNames: classes.map((c) => c.name),
    subjectNames: subjects.map((s) => s.name),
    users,
  };
}
