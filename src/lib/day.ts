/**
 * Работа с «учебным днём» для посещаемости.
 *
 * День храним как начало суток по UTC. Так `@@unique([studentId, subjectId, date])`
 * ловит повторную отметку, а сравнение дат не зависит от часового пояса сервера.
 */

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** `"2026-10-14"` → `Date` на 00:00 UTC; `null`, если формат битый. */
export function parseDay(input: string | undefined | null): Date | null {
  if (!input || !DAY_PATTERN.test(input)) return null;
  const date = new Date(`${input}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `Date` → `"2026-10-14"` по UTC. */
export function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Сегодняшняя дата (UTC) в формате `"2026-10-14"`. */
export function todayIso(): string {
  return formatDay(new Date());
}
