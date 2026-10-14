import { getTranslations, setRequestLocale } from "next-intl/server";
import { BookOpen, GraduationCap, LogOut, School, ShieldCheck, Sparkles } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction, requireUser } from "@/lib/auth";
import { isRole, type Role } from "@/lib/constants";
import {
  getAdminDashboard,
  getStudentDashboard,
  getTeacherDashboard,
} from "@/lib/queries";
import { StudentView } from "@/components/dashboard/student-view";
import { TeacherView } from "@/components/dashboard/teacher-view";
import { AdminView } from "@/components/dashboard/admin-view";

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "destructive"> = {
  ADMIN: "destructive",
  TEACHER: "default",
  STUDENT: "secondary",
};

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  TEACHER: BookOpen,
  STUDENT: GraduationCap,
};

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
  const tc = await getTranslations("common");
  const tRoles = await getTranslations("roles");

  const roleTitle =
    role === "STUDENT" ? t("studentTitle") : role === "TEACHER" ? t("teacherTitle") : t("adminTitle");
  const RoleIcon = ROLE_ICON[role];

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

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <School className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline font-semibold">{tc("appName")}</span>
            </Link>
            <Badge variant={ROLE_BADGE_VARIANT[role]} className="text-xs capitalize font-semibold">
              <RoleIcon className="mr-1 h-3.5 w-3.5" />
              {tRoles(role.toLowerCase())}
            </Badge>
          </div>

          <div className="flex items-center gap-3">
            <div className="text-right hidden sm:block">
              <div className="text-sm font-semibold leading-tight">{user.fullName}</div>
              <div className="text-xs text-muted-foreground">{user.email}</div>
            </div>
            <LocaleSwitcher />
            <form
              action={async () => {
                "use server";
                await logoutAction(locale);
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                type="submit"
                className="gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
              >
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">{tc("logout")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

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

        {studentData && <StudentView data={studentData} />}
        {teacherData && <TeacherView blocks={teacherData} />}
        {adminData && <AdminView data={adminData} />}
      </main>
    </div>
  );
}
