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
  isAssessmentStatus,
  isAssessmentType,
  isAttendanceStatus,
  isBehaviorKind,
  isProposalBasis,
  isProposalStatus,
  isRoundingMode,
  type AssessmentStatus,
  type AssessmentType,
  type AttendanceStatus,
  type BehaviorKind,
  type GradingRules,
  type ProposalBasis,
  type ProposalStatus,
} from "./constants";
import { formatDay, parseDay, todayIso } from "./day";
import {
  averageActivity,
  behaviorBalance,
  effectiveQuarterGrade,
  quarterGrade,
  quarterPercent,
  round,
  type BehaviorBalance,
  type GroupKey,
  type GroupScore,
  type SubjectGroups,
} from "./grading";

const EMPTY_GROUP = (): GroupScore => ({ sumScore: 0, sumMax: 0, count: 0 });

/** Пустые группы работ предмета. */
const EMPTY_SUBJECT_GROUPS = (): SubjectGroups => ({
  sas: EMPTY_GROUP(),
  sat: EMPTY_GROUP(),
  formative: EMPTY_GROUP(),
});

/** Тип работы → ключ группы в четвертной. */
const GROUP_KEY_BY_TYPE: Record<AssessmentType, GroupKey> = {
  FORMATIVE: "formative",
  SAS: "sas",
  SAT: "sat",
};

/** Приоритет предстоящей работы при равных датах: сначала СОЧ, потом СОР. */
const UPCOMING_PRIORITY: Record<AssessmentType, number> = {
  SAT: 0,
  SAS: 1,
  FORMATIVE: 2,
};

/** Сколько последних записей активности/поведения показывать в панели правки. */
const RECORDS_LIMIT = 40;

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
  basis: ProposalBasis;
  status: ProposalStatus;
}

/** Предстоящая (опубликованная, но не оценённая) работа — для симулятора. */
export interface StudentUpcomingWork {
  title: string;
  key: GroupKey;
  maxScore: number;
}

export interface StudentSubjectBlock {
  subjectId: string;
  subjectName: string;
  grades: StudentGradeRow[];
  quarterPercent: number | null;
  quarterGrade: number | null;
  /** Группы работ — вход для симулятора цели «что нужно для 5». */
  groups: SubjectGroups;
  upcoming: StudentUpcomingWork | null;
  /** Желаемая оценка ученика по предмету за четверть (2–5). */
  goal: number | null;
}

export interface StudentDashboard {
  className: string | null;
  year: string | null;
  quarter: number;
  subjects: StudentSubjectBlock[];
  overallPercent: number | null;
  activities: StudentActivityRow[];
  activityAverage: number | null;
  behaviors: StudentBehaviorRow[];
  behavior: BehaviorBalance;
  proposal: StudentProposal | null;
  /** Правила оценивания класса — нужны симулятору на клиенте. */
  rules: GradingRules;
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

  const [grades, activities, behaviors, proposals, goals] = await Promise.all([
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
    db.gradeGoal.findMany({ where: { studentId, quarter } }),
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
      groups: EMPTY_SUBJECT_GROUPS(),
      upcoming: null,
      goal: null,
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

  // Принятое предложение по предмету напрямую подменяет формульный итог —
  // семантика описана в `effectiveQuarterGrade` (grading.ts).
  const acceptedBySubject = new Map<string, { value: number; status: ProposalStatus }>();
  for (const proposal of proposals) {
    if (proposal.status === "ACCEPTED") {
      acceptedBySubject.set(proposal.subjectId, { value: proposal.value, status: "ACCEPTED" });
    }
  }

  const goalBySubject = new Map<string, number>();
  for (const goal of goals) goalBySubject.set(goal.subjectId, goal.targetGrade);

  for (const block of subjectBlocks.values()) {
    const groups: Record<AssessmentType, GroupScore> = {
      FORMATIVE: EMPTY_GROUP(),
      SAS: EMPTY_GROUP(),
      SAT: EMPTY_GROUP(),
    };
    for (const row of block.grades) {
      addToGroup(groups[row.type], row.score, row.maxScore);
    }
    block.groups = { sas: groups.SAS, sat: groups.SAT, formative: groups.FORMATIVE };
    block.quarterPercent = quarterPercent(
      { sas: groups.SAS, sat: groups.SAT, formative: groups.FORMATIVE },
      rules,
    );
    block.quarterGrade = effectiveQuarterGrade(
      quarterGrade({ sas: groups.SAS, sat: groups.SAT, formative: groups.FORMATIVE }, rules),
      acceptedBySubject.get(block.subjectId),
    );
    block.goal = goalBySubject.get(block.subjectId) ?? null;

    // Предстоящая работа — опубликованная, но ещё не оценённая у ученика.
    // Берём ближайшую по дате; при равенстве приоритет у СОЧ, затем СОР.
    const ungraded = block.grades
      .filter((row) => row.score == null)
      .sort(
        (a, b) =>
          a.date.getTime() - b.date.getTime() ||
          UPCOMING_PRIORITY[a.type] - UPCOMING_PRIORITY[b.type],
      );
    const next = ungraded[0];
    block.upcoming = next
      ? { title: next.title, key: GROUP_KEY_BY_TYPE[next.type], maxScore: next.maxScore }
      : null;
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
    quarter,
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
          basis: isProposalBasis(acceptedProposal.basis) ? acceptedProposal.basis : "activity",
          status: "ACCEPTED",
        }
      : null,
    rules,
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
        quarterGrade: effectiveQuarterGrade(quarterGrade(parts, rules), finalProposal),
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
// Журнал учителя (класс × предмет × четверть)
// ---------------------------------------------------------------------------

export interface TeacherTeachingOption {
  id: string;
  classId: string;
  className: string;
  subjectId: string;
  subjectName: string;
}

/** Короткий список «класс — предмет» для переключателя в журнале. */
export async function getTeacherTeachings(
  teacherId: string,
): Promise<TeacherTeachingOption[]> {
  const teachings = await db.teaching.findMany({
    where: { teacherId },
    include: { klass: true, subject: true },
    orderBy: [{ klass: { name: "asc" } }, { subject: { name: "asc" } }],
  });
  return teachings.map(toTeachingOption);
}

function toTeachingOption(teaching: {
  id: string;
  classId: string;
  subjectId: string;
  klass: { name: string };
  subject: { name: string };
}): TeacherTeachingOption {
  return {
    id: teaching.id,
    classId: teaching.classId,
    className: teaching.klass.name,
    subjectId: teaching.subjectId,
    subjectName: teaching.subject.name,
  };
}

export interface JournalAssessment {
  id: string;
  type: AssessmentType;
  title: string;
  maxScore: number;
  status: AssessmentStatus;
}

export interface JournalStudent {
  id: string;
  fullName: string;
  email: string;
  /** Балл по работе: `scores[assessmentId]` (null = не выставлен). */
  scores: Record<string, number | null>;
  activityAverage: number | null;
  behavior: BehaviorBalance;
  quarterGrade: number | null;
  /** «Потенциальная оценка» по этому предмету и четверти, если учитель её создал. */
  proposal: { value: number; basis: ProposalBasis; status: ProposalStatus } | null;
}

/** Запись активности для панели правки. `editable` — автор записи это текущий учитель. */
export interface JournalActivityRecord {
  id: string;
  studentId: string;
  studentName: string;
  value: number;
  comment: string | null;
  date: Date;
  editable: boolean;
}

/** Запись поведения для панели правки. */
export interface JournalBehaviorRecord {
  id: string;
  studentId: string;
  studentName: string;
  kind: BehaviorKind;
  points: number;
  comment: string | null;
  date: Date;
  editable: boolean;
}

export interface JournalData {
  teaching: TeacherTeachingOption;
  quarter: number;
  rules: GradingRules;
  sections: { id: string; title: string; order: number }[];
  assessments: JournalAssessment[];
  students: JournalStudent[];
  activities: JournalActivityRecord[];
  behaviors: JournalBehaviorRecord[];
}

/**
 * Полный журнал одного преподавания за четверть: работы (колонки),
 * ученики (строки) и матрица баллов. Доступен только «своему» учителю —
 * иначе `null`, и страница честно покажет 404-подобную заглушку.
 */
export async function getTeacherJournal(
  teacherId: string,
  teachingId: string,
  quarter = 1,
): Promise<JournalData | null> {
  const teaching = await db.teaching.findFirst({
    where: { id: teachingId, teacherId },
    include: { klass: true, subject: true },
  });
  if (!teaching) return null;

  const [rules, assessments, sections, enrollments, activities, behaviors, proposals] =
    await Promise.all([
      loadGradingRules(teaching.classId),
      db.assessment.findMany({
        where: { classId: teaching.classId, subjectId: teaching.subjectId, quarter },
        orderBy: [{ type: "asc" }, { date: "asc" }],
      }),
      db.section.findMany({
        where: { subjectId: teaching.subjectId, quarter },
        orderBy: { order: "asc" },
      }),
      db.enrollment.findMany({
        where: { classId: teaching.classId },
        include: { student: true },
        orderBy: { student: { fullName: "asc" } },
      }),
      db.activityScore.findMany({ where: { subjectId: teaching.subjectId } }),
      db.behaviorRecord.findMany({ where: { classId: teaching.classId } }),
      db.proposedGrade.findMany({
        where: { subjectId: teaching.subjectId, quarter },
      }),
    ]);

  const assessmentIds = assessments.map((a) => a.id);
  const grades = assessmentIds.length
    ? await db.grade.findMany({ where: { assessmentId: { in: assessmentIds } } })
    : [];

  const scoreByKey = new Map<string, number | null>();
  for (const grade of grades) {
    scoreByKey.set(`${grade.assessmentId}|${grade.studentId}`, grade.score);
  }

  const journalAssessments: JournalAssessment[] = assessments
    .filter((a) => isAssessmentType(a.type))
    .map((a) => ({
      id: a.id,
      type: a.type as AssessmentType,
      title: a.title,
      maxScore: a.maxScore,
      status: isAssessmentStatus(a.status) ? a.status : "DRAFT",
    }));

  const proposalByStudent = new Map<string, JournalStudent["proposal"]>();
  for (const proposal of proposals) {
    if (!isProposalStatus(proposal.status) || !isProposalBasis(proposal.basis)) continue;
    proposalByStudent.set(proposal.studentId, {
      value: proposal.value,
      basis: proposal.basis,
      status: proposal.status,
    });
  }

  const students: JournalStudent[] = enrollments.map(({ student }) => {
    const scores: Record<string, number | null> = {};
    const groups: Record<AssessmentType, GroupScore> = {
      FORMATIVE: EMPTY_GROUP(),
      SAS: EMPTY_GROUP(),
      SAT: EMPTY_GROUP(),
    };
    for (const assessment of journalAssessments) {
      const score = scoreByKey.get(`${assessment.id}|${student.id}`) ?? null;
      scores[assessment.id] = score;
      addToGroup(groups[assessment.type], score, assessment.maxScore);
    }

    const parts = { sas: groups.SAS, sat: groups.SAT, formative: groups.FORMATIVE };
    const studentActivity = activities.filter((a) => a.studentId === student.id);
    const studentBehavior = behaviors.filter((b) => b.studentId === student.id);
    const studentProposal = proposalByStudent.get(student.id) ?? null;

    return {
      id: student.id,
      fullName: student.fullName,
      email: student.email,
      scores,
      activityAverage: averageActivity(studentActivity.map((a) => a.value)),
      behavior: behaviorBalance(studentBehavior),
      quarterGrade: effectiveQuarterGrade(quarterGrade(parts, rules), studentProposal),
      proposal: studentProposal,
    };
  });

  const nameById = new Map(
    enrollments.map(({ student }) => [student.id, student.fullName] as const),
  );
  const enrolledIds = new Set(nameById.keys());

  const recentActivities: JournalActivityRecord[] = activities
    .filter((a) => enrolledIds.has(a.studentId))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECORDS_LIMIT)
    .map((a) => ({
      id: a.id,
      studentId: a.studentId,
      studentName: nameById.get(a.studentId) ?? "—",
      value: a.value,
      comment: a.comment,
      date: a.date,
      editable: a.teacherId === teacherId,
    }));

  const recentBehaviors: JournalBehaviorRecord[] = behaviors
    .filter((b) => isBehaviorKind(b.kind))
    .sort((a, b) => b.date.getTime() - a.date.getTime())
    .slice(0, RECORDS_LIMIT)
    .map((b) => ({
      id: b.id,
      studentId: b.studentId,
      studentName: nameById.get(b.studentId) ?? "—",
      kind: b.kind as BehaviorKind,
      points: b.points,
      comment: b.comment,
      date: b.date,
      editable: b.teacherId === teacherId,
    }));

  return {
    teaching: toTeachingOption(teaching),
    quarter,
    rules,
    sections: sections.map((s) => ({ id: s.id, title: s.title, order: s.order })),
    assessments: journalAssessments,
    students,
    activities: recentActivities,
    behaviors: recentBehaviors,
  };
}

// ---------------------------------------------------------------------------
// Посещаемость (класс × предмет × день)
// ---------------------------------------------------------------------------

export interface JournalAttendance {
  /** День в формате `yyyy-mm-dd`. */
  date: string;
  /** Статус по ученику; нет ключа — не отмечен. */
  statuses: Record<string, AttendanceStatus>;
  /** Сводка по дню. */
  summary: Record<AttendanceStatus, number>;
}

const emptyAttendanceSummary = (): Record<AttendanceStatus, number> => ({
  PRESENT: 0,
  ABSENT: 0,
  LATE: 0,
  EXCUSED: 0,
});

/**
 * Отметки посещаемости класса на конкретный день.
 *
 * День нормализуем через `parseDay` (начало суток UTC) — так выборка совпадает
 * с уникальным ключом `[studentId, subjectId, date]`. Некорректная дата не
 * роняет страницу: откатываемся на сегодня.
 */
export async function getTeacherJournalAttendance(
  teacherId: string,
  teachingId: string,
  date: string,
): Promise<JournalAttendance> {
  const day = parseDay(date) ?? parseDay(todayIso())!;
  const iso = formatDay(day);
  const statuses: Record<string, AttendanceStatus> = {};
  const summary = emptyAttendanceSummary();

  const teaching = await db.teaching.findFirst({
    where: { id: teachingId, teacherId },
    select: { classId: true, subjectId: true },
  });
  if (!teaching) return { date: iso, statuses, summary };

  const records = await db.attendance.findMany({
    where: { classId: teaching.classId, subjectId: teaching.subjectId, date: day },
  });

  for (const record of records) {
    if (!isAttendanceStatus(record.status)) continue;
    statuses[record.studentId] = record.status;
    summary[record.status] += 1;
  }

  return { date: iso, statuses, summary };
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
