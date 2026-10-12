import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser, logoutAction } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { db } from "@/lib/db";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { School, LogOut, GraduationCap, BookOpen, ShieldCheck, Sparkles } from "lucide-react";

// Импортируем наши 3 чистых модуля
import { StudentView } from "@/components/dashboard/student-view";
import { TeacherView } from "@/components/dashboard/teacher-view";
import { AdminView } from "@/components/dashboard/admin-view";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  // 1. Проверяем сессию пользователя (серверная авторизация через куки)
  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  // 2. Подключаем локализацию
  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tr = await getTranslations("roles");

  // 3. Загружаем данные для Ученика (STUDENT)
  const studentGrades =
    user.role === "STUDENT"
      ? await db.grade.findMany({
          where: { studentId: user.id },
          include: { assessment: { include: { subject: true } } },
        })
      : [];

  const studentActivities =
    user.role === "STUDENT"
      ? await db.activityScore.findMany({
          where: { studentId: user.id },
          include: { subject: true },
        })
      : [];

  const studentBehaviors =
    user.role === "STUDENT"
      ? await db.behaviorRecord.findMany({
          where: { studentId: user.id },
        })
      : [];

  // 4. Загружаем данные для Учителя (TEACHER) — реальные классы и ученики
  const rawTeacherTeachings =
    user.role === "TEACHER"
      ? await db.teaching.findMany({
          where: { teacherId: user.id },
          include: {
            klass: {
              include: {
                enrollments: {
                  include: {
                    student: {
                      include: {
                        studyGrades: {
                          include: { assessment: true },
                        },
                        studentActivityScores: true,
                        proposedForMe: true,
                      },
                    },
                  },
                },
              },
            },
            subject: true,
          },
        })
      : [];

  const teacherTeachings = rawTeacherTeachings.map((teaching) => ({
    id: teaching.id,
    className: teaching.klass.name,
    subjectName: teaching.subject.name,
    students: teaching.klass.enrollments.map(({ student }) => {
      const sor = student.studyGrades.find(
        (g) => g.assessment.type === "SOR" && g.assessment.subjectId === teaching.subjectId
      );
      const soch = student.studyGrades.find(
        (g) => g.assessment.type === "SOCH" && g.assessment.subjectId === teaching.subjectId
      );
      const acts = student.studentActivityScores.filter(
        (a) => a.subjectId === teaching.subjectId
      );
      const avgAct =
        acts.length > 0
          ? (acts.reduce((acc, c) => acc + c.value, 0) / acts.length).toFixed(0)
          : null;
      const prop = student.proposedForMe.find(
        (p) => p.subjectId === teaching.subjectId
      );

      return {
        id: student.id,
        fullName: student.fullName,
        email: student.email,
        sorScore: sor?.score != null ? `${sor.score}/${sor.assessment.maxScore}` : "—",
        sochScore: soch?.score != null ? `${soch.score}/${soch.assessment.maxScore}` : "—",
        activityScore: avgAct ? `${avgAct}/10` : "—",
        finalGrade: prop?.value ? `${prop.value}` : "—",
      };
    }),
  }));

  // 5. Загружаем данные для Админа (ADMIN)
  const totalUsers = user.role === "ADMIN" ? await db.user.count() : 0;
  const totalClasses = user.role === "ADMIN" ? await db.klass.count() : 0;
  const totalSubjects = user.role === "ADMIN" ? await db.subject.count() : 0;
  const allUsersList =
    user.role === "ADMIN"
      ? await db.user.findMany({ orderBy: { createdAt: "desc" }, take: 10 })
      : [];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Верхний Navbar */}
      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
                <School className="h-5 w-5" />
              </div>
              <span className="hidden sm:inline font-semibold">{tc("appName")}</span>
            </Link>
            <Badge
              variant={
                user.role === "ADMIN"
                  ? "destructive"
                  : user.role === "TEACHER"
                  ? "default"
                  : "secondary"
              }
              className="text-xs capitalize font-semibold"
            >
              {user.role === "ADMIN" && <ShieldCheck className="mr-1 h-3.5 w-3.5" />}
              {user.role === "TEACHER" && <BookOpen className="mr-1 h-3.5 w-3.5" />}
              {user.role === "STUDENT" && <GraduationCap className="mr-1 h-3.5 w-3.5" />}
              {tr(user.role.toLowerCase() as "student" | "teacher" | "admin")}
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
              <Button variant="ghost" size="sm" type="submit" className="gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <LogOut className="h-4 w-4" />
                <span className="hidden md:inline">{tc("logout")}</span>
              </Button>
            </form>
          </div>
        </div>
      </header>

      {/* Основная рабочая область */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        {/* Приветственный баннер */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-primary">
              {user.role === "STUDENT" && t("studentTitle")}
              {user.role === "TEACHER" && t("teacherTitle")}
              {user.role === "ADMIN" && t("adminTitle")}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
            {t("welcome")}, {user.fullName}!
          </h1>
          <p className="text-muted-foreground mt-1 text-sm sm:text-base">
            {user.role === "STUDENT" && "Оқу жылы: 2025/2026 • 10А сыныбы • 1-тоқсан"}
            {user.role === "TEACHER" && "BIL математика бірлестігі • 2025/2026 оқу жылы"}
            {user.role === "ADMIN" && "Мектеп жүйесінің басқару орталығы"}
          </p>
        </div>

        {/* Ролевые представления */}
        {user.role === "STUDENT" && (
          <StudentView
            grades={studentGrades}
            activities={studentActivities}
            behaviors={studentBehaviors}
            t={t}
          />
        )}

        {user.role === "TEACHER" && (
          <TeacherView teachings={teacherTeachings} />
        )}

        {user.role === "ADMIN" && (
          <AdminView
            totalUsers={totalUsers}
            totalClasses={totalClasses}
            totalSubjects={totalSubjects}
            users={allUsersList}
            t={t}
            tr={tr}
          />
        )}
      </main>
    </div>
  );
}
