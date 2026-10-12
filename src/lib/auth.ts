import { cookies } from "next/headers";
import { db } from "./db";
import { redirect } from "next/navigation";

const SESSION_COOKIE = "bil_session_user";

export async function getCurrentUser() {
  const cookieStore = await cookies();
  const userId = cookieStore.get(SESSION_COOKIE)?.value;

  if (!userId) {
    return null;
  }

  try {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        enrollments: {
          include: { klass: true },
        },
        teachings: {
          include: { klass: true, subject: true },
        },
      },
    });
    return user;
  } catch (error) {
    console.error("Failed to load user session:", error);
    return null;
  }
}

export async function setSessionUser(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearSessionUser() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}

export async function loginWithRole(email: string, locale: string) {
  "use server";
  const user = await db.user.findUnique({
    where: { email },
  });

  if (user) {
    await setSessionUser(user.id);
  }

  redirect(`/${locale}/dashboard`);
}

export async function logoutAction(locale: string) {
  "use server";
  await clearSessionUser();
  redirect(`/${locale}/login`);
}
