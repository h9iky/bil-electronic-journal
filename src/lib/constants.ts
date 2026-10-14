/**
 * Единый источник правды для «перечислений» и числовых границ.
 *
 * Почему не Prisma `enum`: SQLite его не поддерживает, а строки без проверок
 * превращаются в опечатки по всему проекту. Поэтому держим union-типы здесь
 * и валидируем ими данные на границах (seed, server actions, маппинг из БД).
 */

export const ROLES = ["STUDENT", "TEACHER", "ADMIN"] as const;
export type Role = (typeof ROLES)[number];

/**
 * Типы работ.
 * - FORMATIVE — текущая формативка (не идёт в четвертную по умолчанию);
 * - SAS       — суммативное оценивание за раздел (СОР);
 * - SAT       — суммативное оценивание за четверть (СОЧ).
 */
export const ASSESSMENT_TYPES = ["FORMATIVE", "SAS", "SAT"] as const;
export type AssessmentType = (typeof ASSESSMENT_TYPES)[number];

/** Черновик виден только учителю; публикация открывает работу ученикам. */
export const ASSESSMENT_STATUSES = ["DRAFT", "PUBLISHED"] as const;
export type AssessmentStatus = (typeof ASSESSMENT_STATUSES)[number];

export const BEHAVIOR_KINDS = ["POSITIVE", "NEGATIVE", "NEUTRAL"] as const;
export type BehaviorKind = (typeof BEHAVIOR_KINDS)[number];

export const PROPOSAL_STATUSES = ["PENDING", "ACCEPTED", "REJECTED"] as const;
export type ProposalStatus = (typeof PROPOSAL_STATUSES)[number];

/** На чём основана «потенциальная оценка». */
export const PROPOSAL_BASES = ["activity", "behavior"] as const;
export type ProposalBasis = (typeof PROPOSAL_BASES)[number];

export const ROUNDING_MODES = ["HALF_UP", "FLOOR", "CEIL", "NONE"] as const;
export type RoundingMode = (typeof ROUNDING_MODES)[number];

/** Границы метрики активности (1–10). */
export const ACTIVITY_MIN = 1;
export const ACTIVITY_MAX = 10;

/** Границы итоговой оценки по 5-балльной шкале. */
export const GRADE_MIN = 2;
export const GRADE_MAX = 5;

/** Четверть — целое 1..4. */
export const QUARTER_MIN = 1;
export const QUARTER_MAX = 4;

/** Пороги перевода процента в оценку: < three → 2, ≥ five → 5 и т.д. */
export interface Thresholds {
  three: number;
  four: number;
  five: number;
}

/** Веса слагаемых четвертной оценки (в процентах, в сумме обычно 100). */
export interface GradingWeights {
  sas: number;
  sat: number;
  formative: number;
}

/** Настройки оценивания, применимые к набору работ одного периода. */
export interface GradingRules {
  weights: GradingWeights;
  thresholds: Thresholds;
  rounding: RoundingMode;
}

/** Настройки по умолчанию — совпадают с дефолтами `ClassSettings` в БД. */
export const DEFAULT_THRESHOLDS: Thresholds = { three: 40, four: 65, five: 85 };
export const DEFAULT_WEIGHTS: GradingWeights = { sas: 50, sat: 50, formative: 0 };
export const DEFAULT_ROUNDING: RoundingMode = "HALF_UP";
export const DEFAULT_RULES: GradingRules = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
  rounding: DEFAULT_ROUNDING,
};

// --- Type guards (для валидации значений, пришедших из БД или форм) ---

function isOneOf<T extends string>(
  allowed: readonly T[],
  value: unknown,
): value is T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value);
}

export const isRole = (v: unknown): v is Role => isOneOf(ROLES, v);
export const isAssessmentType = (v: unknown): v is AssessmentType =>
  isOneOf(ASSESSMENT_TYPES, v);
export const isAssessmentStatus = (v: unknown): v is AssessmentStatus =>
  isOneOf(ASSESSMENT_STATUSES, v);
export const isBehaviorKind = (v: unknown): v is BehaviorKind =>
  isOneOf(BEHAVIOR_KINDS, v);
export const isProposalStatus = (v: unknown): v is ProposalStatus =>
  isOneOf(PROPOSAL_STATUSES, v);
export const isProposalBasis = (v: unknown): v is ProposalBasis =>
  isOneOf(PROPOSAL_BASES, v);
export const isRoundingMode = (v: unknown): v is RoundingMode =>
  isOneOf(ROUNDING_MODES, v);
export const isQuarter = (v: unknown): v is number =>
  typeof v === "number" && Number.isInteger(v) && v >= QUARTER_MIN && v <= QUARTER_MAX;
