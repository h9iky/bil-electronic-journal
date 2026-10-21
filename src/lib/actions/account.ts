"use server";

/**
 * Саморегистрация: ученик (с классом) и учитель (без класса).
 *
 * Пароль сразу превращается в scrypt-хеш — открытый текст не пишется в БД
 * и не возвращается клиенту. После создания аккаунта сразу открываем сессию,
 * чтобы человек не вводил пароль второй раз.
 */

import { redirect } from "next/navigation";
import { hasLocale } from "next-intl";
import { db } from "@/lib/db";
import { setSessionUser } from "@/lib/auth";
import { hashPassword } from "@/lib/password";
import { isUniqueViolation } from "@/lib/prisma-errors";
import { validateRegistration } from "@/lib/registration";
import { routing } from "@/i18n/routing";
import type { ActionResult } from "./journal";

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: string;
  classId: string | null;
  locale: string;
}): Promise<ActionResult> {
  const check = validateRegistration(input);
  if (!check.ok) return { ok: false, error: check.error };

  const { fullName, email, password, role, classId } = check.value;

  // Быстрая человеческая ошибка; гонку двух одинаковых email всё равно
  // добивает уникальный индекс ниже.
  const existing = await db.user.findUnique({ where: { email }, select: { id: true } });
  if (existing) return { ok: false, error: "email_taken" };

  if (role === "STUDENT" && classId) {
    const klass = await db.klass.findUnique({
      where: { id: classId },
      select: { id: true },
    });
    if (!klass) return { ok: false, error: "class_not_found" };
  }

  const passwordHash = await hashPassword(password);

  let userId: string;
  try {
    const user = await db.user.create({
      data: {
        fullName,
        email,
        role,
        passwordHash,
        // Ученик сразу попадает в выбранный класс — одна транзакция с User.
        enrollments:
          role === "STUDENT" && classId ? { create: { classId } } : undefined,
      },
      select: { id: true },
    });
    userId = user.id;
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "email_taken" };
    throw error;
  }

  await setSessionUser(userId);

  const locale = hasLocale(routing.locales, input.locale)
    ? input.locale
    : routing.defaultLocale;
  redirect(`/${locale}/dashboard`);
}
