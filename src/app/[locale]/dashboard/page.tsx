import { getTranslations, setRequestLocale } from "next-intl/server";
import { Sparkles } from "lucide-react";
import { requireUser } from "@/lib/auth";
import { isRole, type Role } from "@/lib/constants";
import {
  getAdminDashboard,
  getStudentDashboard,
  getTeacherDashboard,
} from "@/lib/queries";
import { AppHeader } from "@/components/dashboard/app-header";
import { StudentView } from "@/components/dashboard/student-view";
import { TeacherView } from "@/components/dashboard/teacher-view";
import { AdminView } from "@/components/dashboard/admin-view";
import { TelegramCard } from "@/components/dashboard/telegram-card";
import { getTelegramLink } from "@/lib/telegram";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireUser(locale);
  const role: Role = isRole(user.role) ? user.role : "STUDENT";

  const t = await getTranslations("dashboard");

  const roleTitle =
    role === "STUDENT" ? t("studentTitle") : role === "TEACHER" ? t("teacherTitle") : t("adminTitle");

  // Данные грузит соответствующий слой (см. src/lib/queries.ts).
  const studentData = role === "STUDENT" ? await getStudentDashboard(user.id) : null;
  const teacherData = role === "TEACHER" ? await getTeacherDashboard(user.id) : null;
  const adminData = role === "ADMIN" ? await getAdminDashboard() : null;

  const meta =
    role === "STUDENT" && studentData
      ? [studentData.className, studentData.year, t("quarterLabel")]
          .filter(Boolean)
          .join(" • ")
      : role === "TEACHER" && teacherData
        ? `${teacherData.length} • ${t("myClasses")}`
        : t("adminTitle");

  // Привязка Telegram для бота Ask BIL (сам бот живёт отдельным процессом).
  const telegramLink = await getTelegramLink(user.id);
  const botUsername = process.env.TELEGRAM_BOT_USERNAME ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} locale={locale} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {roleTitle}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("welcome")}, {user.fullName}!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">{meta}</p>
        </div>

        <TelegramCard
          linked={telegramLink ? { username: telegramLink.username } : null}
          botUsername={botUsername}
        />

        {studentData && <StudentView data={studentData} />}
        {teacherData && <TeacherView blocks={teacherData} />}
        {adminData && <AdminView data={adminData} />}
      </main>
    </div>
  );
}
