/**
 * Валидация саморегистрации.
 *
 * Одна правда для клиентской формы и server action: форма не отправляет
 * заведомо битый черновик, сервер всё равно перепроверяет каждое поле —
 * экшен доступен и прямым POST-запросом.
 *
 * Саморегистрация открыта только ученику и учителю: админа создаёт сид/другой
 * админ, иначе первый встречный выдал бы себе права на всю школу.
 */

export const SIGNUP_ROLES = ["STUDENT", "TEACHER"] as const;
export type SignupRole = (typeof SIGNUP_ROLES)[number];

export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 200;
export const NAME_MIN = 2;
export const NAME_MAX = 80;
export const EMAIL_MAX = 254;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function isSignupRole(value: unknown): value is SignupRole {
  return (
    typeof value === "string" &&
    (SIGNUP_ROLES as readonly string[]).includes(value)
  );
}

/** Email — без пробелов по краям, в нижнем регистре: `Ivan@BIL.kz` = `ivan@bil.kz`. */
export function normalizeEmail(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().toLowerCase() : "";
}

/** Имя — схлопываем повторные пробелы, чтобы `Асан   Асанов` не ломал вид. */
export function normalizeFullName(raw: unknown): string {
  return typeof raw === "string" ? raw.trim().replace(/\s+/g, " ") : "";
}

export interface RegistrationDraft {
  fullName: string;
  email: string;
  /** Открытый пароль — нужен только экшену, чтобы сразу посчитать хеш. */
  password: string;
  role: SignupRole;
  classId: string | null;
}

export type RegistrationCheck =
  | { ok: true; value: RegistrationDraft }
  | { ok: false; error: string };

/**
 * Проверка черновика регистрации.
 *
 * Правила простые и предсказуемые:
 * - имя 2–80 символов после нормализации;
 * - email — базовая форма `x@y.zz`, не длиннее 254;
 * - пароль 8–200 символов (длину не режем: пробелы внутри — валидный пароль);
 * - роль — только `STUDENT` / `TEACHER`;
 * - ученику обязателен класс, учителю — нет (даже если прилетел classId).
 */
export function validateRegistration(input: {
  fullName: unknown;
  email: unknown;
  password: unknown;
  role: unknown;
  classId?: unknown;
}): RegistrationCheck {
  const fullName = normalizeFullName(input.fullName);
  if (fullName.length < NAME_MIN || fullName.length > NAME_MAX) {
    return { ok: false, error: "invalid_name" };
  }

  const email = normalizeEmail(input.email);
  if (email.length === 0 || email.length > EMAIL_MAX || !EMAIL_PATTERN.test(email)) {
    return { ok: false, error: "invalid_email" };
  }

  const password = typeof input.password === "string" ? input.password : "";
  if (password.length < PASSWORD_MIN || password.length > PASSWORD_MAX) {
    return { ok: false, error: "invalid_password" };
  }

  if (!isSignupRole(input.role)) {
    return { ok: false, error: "invalid_role" };
  }

  let classId: string | null = null;
  if (input.role === "STUDENT") {
    const rawClassId = typeof input.classId === "string" ? input.classId.trim() : "";
    if (!rawClassId) return { ok: false, error: "class_required" };
    classId = rawClassId;
  }

  return {
    ok: true,
    value: { fullName, email, password, role: input.role, classId },
  };
}
