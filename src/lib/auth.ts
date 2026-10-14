import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "./db";
import { isRole, type Role } from "./constants";
import { SESSION_COOKIE, decodeSession, encodeSession } from "./session";

/**
 * Сессия = подписанная кука с id пользователя.
 * Проверка роли и прав — только на сервере (см. §3 заметки проекта).
 */

const SESSION_MAX_AGE_SECONDS = 60 * 60 * 24 * 7; // 7 дней

export interface SessionUser {
  id: string;
  fullName: string;
  email: string;
  role: Role;
  createdAt: Date;
}

/** Достаёт id из куки и грузит «лёгкого» пользователя без связей. */
export async function getSessionUser(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const userId = decodeSession(cookieStore.get(SESSION_COOKIE)?.value);
  if (!userId) return null;

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, fullName: true, email: true, role: true, createdAt: true },
    });
    if (!user || !isRole(user.role)) return null;
    return { ...user, role: user.role };
  } catch (error) {
    console.error("Failed to load user session:", error);
    return null;
  }
}

/** Гарантирует вход: если сессии нет — редирект на логин. */
export async function requireUser(locale: string): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect(`/${locale}/login`);
  return user;
}

/** Гарантирует вход с нужной ролью — иначе редирект в личный кабинет. */
export async function requireRole(locale: string, role: Role): Promise<SessionUser> {
  const user = await requireUser(locale);
  if (user.role !== role) redirect(`/${locale}/dashboard`);
  return user;
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, encodeSession(userId), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_MAX_AGE_SECONDS,
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

/**
 * Вход по email. Паролей пока нет — это демо-режим для защиты проекта:
 * аккаунты заводятся сидом, права всё равно проверяются на сервере.
 */
export async function loginWithRole(email: string, locale: string) {
  "use server";
  const user = await db.user.findUnique({ where: { email } });

  if (!user) {
    redirect(`/${locale}/login?error=not_found`);
  }

  await setSessionUser(user.id);
  redirect(`/${locale}/dashboard`);
}

export async function logoutAction(locale: string) {
  "use server";
  await clearSessionUser();
  redirect(`/${locale}/login`);
}
