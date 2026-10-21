/**
 * Справочник классов: номер (7–11) × буква (A–E) × учебный год.
 *
 * Имя класса — производная от номера и буквы (`10A`), а не отдельное поле,
 * которое можно рассинхронизировать. Буквы — латиница: так класс однозначно
 * читается в URL, CSV и логах, без путаницы «А» (кириллица) / «A» (латиница).
 *
 * Модуль общий для сервера и клиента: server action проверяет им недоверенный
 * вход, форма — черновик до отправки (как в `class-settings.ts`).
 */

export const CLASS_GRADES = [7, 8, 9, 10, 11] as const;
export type ClassGrade = (typeof CLASS_GRADES)[number];

export const CLASS_LETTERS = ["A", "B", "C", "D", "E"] as const;
export type ClassLetter = (typeof CLASS_LETTERS)[number];

/** Строгий формат имени: `10A`, `7E`. Нижний регистр и кириллица — не наши. */
const CLASS_NAME_PATTERN = /^(7|8|9|10|11)[A-E]$/;

const ACADEMIC_YEAR_PATTERN = /^(\d{4})\/(\d{4})$/;

export function isClassGrade(value: unknown): value is ClassGrade {
  return (
    typeof value === "number" &&
    (CLASS_GRADES as readonly number[]).includes(value)
  );
}

export function isClassLetter(value: unknown): value is ClassLetter {
  return (
    typeof value === "string" &&
    (CLASS_LETTERS as readonly string[]).includes(value)
  );
}

/** `10` + `A` → `10A`. Вызывать после `isClassGrade`/`isClassLetter`. */
export function buildClassName(grade: ClassGrade, letter: ClassLetter): string {
  return `${grade}${letter}`;
}

/** Обратный разбор имени: `10A` → `{ grade: 10, letter: "A" }`, иначе `null`. */
export function parseClassName(
  name: string,
): { grade: ClassGrade; letter: ClassLetter } | null {
  if (!CLASS_NAME_PATTERN.test(name)) return null;

  const grade = Number(name.slice(0, -1));
  const letter = name.slice(-1);
  if (!isClassGrade(grade) || !isClassLetter(letter)) return null;

  return { grade, letter };
}

/**
 * Учебный год для даты: сентябрь открывает новый год.
 * Октябрь 2026 → `2026/2027`, февраль 2026 → `2025/2026`.
 */
export function academicYear(date: Date = new Date()): string {
  const year = date.getMonth() >= 8 ? date.getFullYear() : date.getFullYear() - 1;
  return `${year}/${year + 1}`;
}

/**
 * Порядок справочника: свежий учебный год сверху, внутри — номер 7→11,
 * затем буква. Лексикографический `orderBy name` здесь не годится:
 * «10A» < «7A» по строке, хотя десятиклассники старше семиклассников.
 */
export function compareClasses(
  a: { name: string; year: string },
  b: { name: string; year: string },
): number {
  const byYear = b.year.localeCompare(a.year);
  if (byYear !== 0) return byYear;

  const gradeA = parseClassName(a.name)?.grade ?? Number.POSITIVE_INFINITY;
  const gradeB = parseClassName(b.name)?.grade ?? Number.POSITIVE_INFINITY;
  if (gradeA !== gradeB) return gradeA - gradeB;

  return a.name.localeCompare(b.name);
}

/** `2026/2027` — две четырёхзначные даты подряд, вторая = первая + 1. */
export function isValidAcademicYear(value: unknown): value is string {
  if (typeof value !== "string") return false;

  const match = ACADEMIC_YEAR_PATTERN.exec(value);
  if (!match) return false;

  const start = Number(match[1]);
  const end = Number(match[2]);
  return start >= 2000 && start <= 2100 && end === start + 1;
}

/** Черновик класса из формы: номер, буква, учебный год. */
export interface ClassDraft {
  grade: ClassGrade;
  letter: ClassLetter;
  year: string;
}

export type ClassCheck =
  | { ok: true; value: ClassDraft & { name: string } }
  | { ok: false; error: string };

/**
 * Проверка черновика класса.
 *
 * Год из формы приходит строкой, поэтому `trim` здесь, а не в экшене:
 * форма и сервер валидируют один и тот же вход одинаково.
 */
export function validateClass(input: {
  grade: unknown;
  letter: unknown;
  year: unknown;
}): ClassCheck {
  if (!isClassGrade(input.grade)) return { ok: false, error: "invalid_grade" };
  if (!isClassLetter(input.letter)) return { ok: false, error: "invalid_letter" };

  const year = typeof input.year === "string" ? input.year.trim() : "";
  if (!isValidAcademicYear(year)) return { ok: false, error: "invalid_year" };

  return {
    ok: true,
    value: {
      grade: input.grade,
      letter: input.letter,
      year,
      name: buildClassName(input.grade, input.letter),
    },
  };
}
