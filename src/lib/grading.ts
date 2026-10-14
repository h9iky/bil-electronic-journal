/**
 * Вся математика оценивания живёт здесь — и только здесь.
 *
 * Правило проекта: ни один компонент не считает проценты, средние или
 * перевод в оценку вручную. Иначе ученик видит `9.5`, учитель `10`,
 * а третья карточка вообще хардкод (так и было до этого файла).
 */

import {
  ACTIVITY_MAX,
  ACTIVITY_MIN,
  DEFAULT_ROUNDING,
  DEFAULT_THRESHOLDS,
  GRADE_MAX,
  GRADE_MIN,
  type GradingRules,
  type RoundingMode,
  type Thresholds,
} from "./constants";

/** Результат любой оценки: балл из максимума. */
export interface Scoring {
  score: number | null;
  maxScore: number;
}

/** Сводка по группе работ (все SAS за четверть, один SAT и т.д.). */
export interface GroupScore {
  sumScore: number;
  sumMax: number;
  count: number;
}

/**
 * Процент выполнения. `null`, если балл ещё не выставлен или максимум
 * некорректен. `null` — это «нет данных», а не ноль: несданная работа не
 * должна выглядеть как честная двойка.
 */
export function percent(score: number | null | undefined, maxScore: number): number | null {
  if (score == null || maxScore <= 0) return null;
  return (score / maxScore) * 100;
}

/** Процент по группе работ. `null`, если работ нет. */
export function groupPercent(group: GroupScore): number | null {
  return percent(group.sumScore, group.sumMax);
}

/** Округление по выбранному правилу (по умолчанию — математическое). */
export function round(
  value: number,
  mode: RoundingMode = DEFAULT_ROUNDING,
  digits = 0,
): number {
  const factor = 10 ** digits;
  const scaled = value * factor;
  switch (mode) {
    case "FLOOR":
      return Math.floor(scaled) / factor;
    case "CEIL":
      return Math.ceil(scaled) / factor;
    case "NONE":
      return value;
    case "HALF_UP":
    default:
      return Math.round(scaled) / factor;
  }
}

/** Среднее арифметическое. `null` для пустого списка. */
export function average(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Перевод процента в оценку 2–5 по настраиваемым порогам. */
export function gradeFromPercent(
  value: number | null,
  thresholds: Thresholds = DEFAULT_THRESHOLDS,
): number | null {
  if (value == null) return null;
  if (value >= thresholds.five) return 5;
  if (value >= thresholds.four) return 4;
  if (value >= thresholds.three) return 3;
  return 2;
}

/** Процент → оценка → проверка допустимости. `null`, если данных нет. */
export function gradeFromGroupPercent(
  group: GroupScore,
  rules: GradingRules,
): number | null {
  const value = groupPercent(group);
  if (value == null) return null;
  return gradeFromPercent(round(value, rules.rounding), rules.thresholds);
}

/**
 * Четвертная оценка: взвешенная сумма SAS / SAT / формативки.
 *
 * Ключевая деталь — **ренормализация весов**: если SAT ещё не проведён,
 * его вес не «съедает» четвертную, а распределяется между присутствующими
 * компонентами. Иначе при весах 50/50 и одном только SAS четвертная
 * показала бы половину результата.
 */
export function quarterPercent(
  parts: { sas?: GroupScore | null; sat?: GroupScore | null; formative?: GroupScore | null },
  rules: GradingRules,
): number | null {
  const candidates: { pct: number; weight: number }[] = [];
  const push = (group: GroupScore | null | undefined, weight: number) => {
    if (!group || weight <= 0) return;
    const pct = groupPercent(group);
    if (pct != null) candidates.push({ pct, weight });
  };

  push(parts.sas, rules.weights.sas);
  push(parts.sat, rules.weights.sat);
  push(parts.formative, rules.weights.formative);

  const totalWeight = candidates.reduce((sum, c) => sum + c.weight, 0);
  if (totalWeight === 0) return null;
  const weighted = candidates.reduce((sum, c) => sum + c.pct * c.weight, 0);
  return weighted / totalWeight;
}

/** Четвертная оценка (2–5) с учётом правил округления и порогов. */
export function quarterGrade(
  parts: { sas?: GroupScore | null; sat?: GroupScore | null; formative?: GroupScore | null },
  rules: GradingRules,
): number | null {
  const value = quarterPercent(parts, rules);
  if (value == null) return null;
  return gradeFromPercent(round(value, rules.rounding), rules.thresholds);
}

/** Полугодовая = среднее процентов состоявшихся четвертей (1–2 и 3–4). */
export function semesterPercent(quarterPercents: (number | null)[]): number | null {
  return average(quarterPercents.filter((p): p is number => p != null));
}

/** Годовая = среднее процентов полугодий. */
export function yearPercent(semesterPercents: (number | null)[]): number | null {
  return average(semesterPercents.filter((p): p is number => p != null));
}

/** Итоговая оценка по произвольному проценту (полугодие/год). */
export function gradeFromValue(
  value: number | null,
  rules: GradingRules,
): number | null {
  if (value == null) return null;
  return gradeFromPercent(round(value, rules.rounding), rules.thresholds);
}

/** Средний балл активности (1–10). `null`, если оценок нет. */
export function averageActivity(values: number[]): number | null {
  return average(values);
}

/** Активность в пределах допустимого диапазона. */
export function isActivityInRange(value: number): boolean {
  return Number.isInteger(value) && value >= ACTIVITY_MIN && value <= ACTIVITY_MAX;
}

/** Оценка в пределах допустимого диапазона 2–5. */
export function isGradeInRange(value: number): boolean {
  return Number.isInteger(value) && value >= GRADE_MIN && value <= GRADE_MAX;
}

/** Балл не превышает максимум (и оба неотрицательны). */
export function isScoreValid(score: number, maxScore: number): boolean {
  return Number.isFinite(score) && score >= 0 && maxScore > 0 && score <= maxScore;
}

export interface BehaviorBalance {
  positive: number;
  negative: number;
  net: number;
  count: number;
}

/**
 * Баланс поведения. Баллы хранятся со знаком (negative → минус),
 * поэтому суммировать их «в лоб» нельзя — иначе получится «+-5».
 */
export function behaviorBalance(
  records: { kind: string; points: number }[],
): BehaviorBalance {
  let positive = 0;
  let negative = 0;
  for (const record of records) {
    const points = Math.abs(record.points);
    if (record.kind === "NEGATIVE") negative += points;
    else if (record.kind === "POSITIVE") positive += points;
  }
  return { positive, negative, net: positive - negative, count: records.length };
}

/** Знаковое форматирование баланса: `+5`, `-3`, `0`. */
export function formatSigned(value: number): string {
  return value > 0 ? `+${value}` : `${value}`;
}
