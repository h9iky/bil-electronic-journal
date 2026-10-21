"use server";

/**
 * Мутации справочника классов.
 *
 * Классы заводит только администратор (ТЗ §3): ученику на регистрации
 * выбирать больше не из чего, поэтому «пустых» классов не плодим.
 * Проверка прав — на сервере, экшен вызывается и напрямую по POST.
 */

import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import { validateClass } from "@/lib/klass";
import type { ActionResult } from "./journal";

/** Только админ. Бросаем — такие вызовы не должны случаться из UI. */
async function requireAdmin() {
  const user = await getSessionUser();
  if (!user || user.role !== "ADMIN") throw new Error("Forbidden");
  return user;
}

/** Гонка двух админов на одинаковом классе — ловится уникальным индексом. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}

/**
 * Создать класс: номер 7–11 × буква A–E × учебный год.
 * Имя (`10A`) собирает `validateClass` — сюда оно не приходит с клиента.
 */
export async function createClass(input: {
  grade: number;
  letter: string;
  year: string;
}): Promise<ActionResult> {
  await requireAdmin();

  const check = validateClass(input);
  if (!check.ok) return { ok: false, error: check.error };

  const { name, year } = check.value;

  const existing = await db.klass.findUnique({
    where: { name_year: { name, year } },
    select: { id: true },
  });
  if (existing) return { ok: false, error: "already_exists" };

  try {
    await db.klass.create({ data: { name, year } });
  } catch (error) {
    if (isUniqueViolation(error)) return { ok: false, error: "already_exists" };
    throw error;
  }

  refresh();
  return { ok: true };
}
