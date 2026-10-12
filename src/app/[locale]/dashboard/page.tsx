import { getTranslations, setRequestLocale } from "next-intl/server";
import { getCurrentUser, logoutAction } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { db } from "@/lib/db";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  School,
  LogOut,
  GraduationCap,
  BookOpen,
  ShieldCheck,
  Award,
  Sparkles,
  TrendingUp,
  HeartHandshake,
  CheckCircle2,
  Calendar,
  Layers,
  Users,
} from "lucide-react";

export default async function DashboardPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user) {
    redirect(`/${locale}/login`);
  }

  const t = await getTranslations("dashboard");
  const tc = await getTranslations("common");
  const tr = await getTranslations("roles");

  // Загружаем предметные данные в зависимости от роли
  const studentGrades =
    user.role === "STUDENT"
      ? await db.grade.findMany({
          where: { studentId: user.id },
          include: {
            assessment: {
              include: { subject: true, teacher: true },
            },
          },
          orderBy: { assessment: { date: "desc" } },
        })
      : [];

  const studentActivities =
    user.role === "STUDENT"
      ? await db.activityScore.findMany({
          where: { studentId: user.id },
          include: { subject: true, teacher: true },
          orderBy: { date: "desc" },
        })
      : [];

  const studentBehaviors =
    user.role === "STUDENT"
      ? await db.behaviorRecord.findMany({
          where: { studentId: user.id },
          include: { teacher: true, klass: true },
          orderBy: { date: "desc" },
        })
      : [];

  const studentProposedGrades =
    user.role === "STUDENT"
      ? await db.proposedGrade.findMany({
          where: { studentId: user.id },
          include: { subject: true, creator: true },
        })
      : [];

  // Статистика для админа
  const totalUsers = user.role === "ADMIN" ? await db.user.count() : 0;
  const totalClasses = user.role === "ADMIN" ? await db.klass.count() : 0;
  const totalSubjects = user.role === "ADMIN" ? await db.subject.count() : 0;
  const allUsersList =
    user.role === "ADMIN"
      ? await db.user.findMany({
          orderBy: { createdAt: "desc" },
          take: 10,
        })
      : [];

  // Классы учителя
  const teacherTeachings =
    user.role === "TEACHER"
      ? await db.teaching.findMany({
          where: { teacherId: user.id },
          include: { klass: true, subject: true },
        })
      : [];

  // Расчет среднего балла и активности для ученика
  const avgActivity =
    studentActivities.length > 0
      ? (
          studentActivities.reduce((acc, curr) => acc + curr.value, 0) /
          studentActivities.length
        ).toFixed(1)
      : null;

  const totalBehaviorPoints = studentBehaviors.reduce(
    (acc, curr) => acc + curr.points,
    0
  );

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top Navbar */}
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

      {/* Main Content */}
      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 space-y-8">
        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary/10 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
          <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
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
                {user.role === "TEACHER" && "BIL математика пәні бірлестігі • 2025/2026 оқу жылы"}
                {user.role === "ADMIN" && "Мектеп жүйесінің толық әкімшілік бақылау орталығы"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="px-3 py-1 bg-background/80 text-xs font-medium">
                {new Date().toLocaleDateString(locale === "kk" ? "kk-KZ" : locale === "ru" ? "ru-RU" : "en-US", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </Badge>
            </div>
          </div>
        </div>

        {/* ================= STUDENT DASHBOARD ================= */}
        {user.role === "STUDENT" && (
          <div className="space-y-8">
            {/* 4 Feature KPI Cards */}
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {/* 1. Grades Average */}
              <Card className="border-border/60 hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                      {t("gradesOverview")}
                    </CardTitle>
                    <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                      <TrendingUp className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">92.8%</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    БЖБ (19/20) + ТЖБ (28/30) + Формативті
                  </p>
                </CardContent>
              </Card>

              {/* 2. 🔥 Activity 1–10 */}
              <Card className="border-border/60 hover:shadow-md transition border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase font-semibold text-primary">
                      {t("activityMetric")} (1–10)
                    </CardTitle>
                    <div className="rounded-lg bg-primary/20 p-2 text-primary">
                      <Sparkles className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">
                    {avgActivity ? `${avgActivity} / 10` : "—"}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("activityDesc")}
                  </p>
                </CardContent>
              </Card>

              {/* 3. 🔥 Behavior (Separate category) */}
              <Card className="border-border/60 hover:shadow-md transition">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                      {t("behaviorMetric")}
                    </CardTitle>
                    <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                      <HeartHandshake className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                    +{totalBehaviorPoints} балл
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {studentBehaviors.length} мадақтау жазбасы (бөлек санат)
                  </p>
                </CardContent>
              </Card>

              {/* 4. 🔥 Proposed Potential Grade */}
              <Card className="border-border/60 hover:shadow-md transition border-amber-500/30 bg-amber-500/5">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-xs uppercase font-semibold text-amber-700 dark:text-amber-400">
                      {t("potentialGrade")}
                    </CardTitle>
                    <div className="rounded-lg bg-amber-500/20 p-2 text-amber-700 dark:text-amber-400">
                      <Award className="h-4 w-4" />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                      5 (Өте жақсы)
                    </span>
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                      МАҚҰЛДАНДЫ
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("potentialGradeDesc")}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Official Grades Table */}
            <Card className="border-border/60">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-lg font-bold">{t("gradesOverview")}</CardTitle>
                    <CardDescription>
                      1-тоқсан: БЖБ және ТЖБ максималды баллдарымен есептелген нәтижелер
                    </CardDescription>
                  </div>
                  <Badge variant="secondary">1-тоқсан</Badge>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3 px-4">{t("subject")}</th>
                      <th className="py-3 px-4">{t("type")}</th>
                      <th className="py-3 px-4">{t("score")} / {t("maxScore")}</th>
                      <th className="py-3 px-4">{t("percent")}</th>
                      <th className="py-3 px-4">{t("date")}</th>
                      <th className="py-3 px-4">Пікір</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {studentGrades.map((g) => {
                      const max = g.assessment.maxScore;
                      const score = g.score ?? 0;
                      const percent = Math.round((score / max) * 100);
                      return (
                        <tr key={g.id} className="hover:bg-muted/20 transition">
                          <td className="py-3.5 px-4 font-semibold text-foreground">
                            {g.assessment.subject.name}
                          </td>
                          <td className="py-3.5 px-4">
                            <Badge
                              variant="outline"
                              className={
                                g.assessment.type === "SOCH"
                                  ? "border-purple-500/40 text-purple-600 bg-purple-500/5 font-semibold"
                                  : g.assessment.type === "SOR"
                                  ? "border-blue-500/40 text-blue-600 bg-blue-500/5 font-semibold"
                                  : "border-gray-400/40 text-muted-foreground"
                              }
                            >
                              {g.assessment.type}
                            </Badge>
                            <span className="block text-xs text-muted-foreground mt-0.5">
                              {g.assessment.title}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                            {score} <span className="text-muted-foreground font-normal">/ {max}</span>
                          </td>
                          <td className="py-3.5 px-4">
                            <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                              <CheckCircle2 className="h-4 w-4" />
                              {percent}%
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground">
                            {new Date(g.assessment.date).toLocaleDateString()}
                          </td>
                          <td className="py-3.5 px-4 text-xs text-muted-foreground italic">
                            {g.comment || "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </CardContent>
            </Card>

            {/* Split: Activity (1-10) and Behavior (Separate category) */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Activity Log */}
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <span>{t("activityMetric")} (1–10 күнделігі)</span>
                  </CardTitle>
                  <CardDescription>
                    Оқушының сабақ сайынғы белсенділігі мен ынтасын бағалау
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentActivities.map((act) => (
                    <div
                      key={act.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                    >
                      <div className="space-y-1">
                        <div className="text-sm font-semibold">{act.subject.name}</div>
                        <div className="text-xs text-muted-foreground">{act.comment}</div>
                      </div>
                      <div className="text-right">
                        <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-bold text-sm">
                          {act.value} / 10
                        </span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Behavior Log */}
              <Card className="border-border/60">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    <span>{t("behaviorMetric")} (Бөлек санат)</span>
                  </CardTitle>
                  <CardDescription>
                    Академиялық бағамен араласпайтын, тәрбие мен тәртіп есебі
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {studentBehaviors.map((beh) => (
                    <div
                      key={beh.id}
                      className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                            {beh.kind}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {new Date(beh.date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-xs text-foreground font-medium">{beh.comment}</div>
                      </div>
                      <div className="text-right font-bold text-emerald-600 dark:text-emerald-400">
                        +{beh.points} балл
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* ================= TEACHER DASHBOARD ================= */}
        {user.role === "TEACHER" && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    Бекітілген сыныптар
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">10А сыныбы</div>
                  <p className="text-xs text-muted-foreground mt-1">Алгебра және анализ бастамалары</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    БЖБ / ТЖБ бақылауы
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">3 жұмыс</div>
                  <p className="text-xs text-muted-foreground mt-1">1-тоқсан бойынша толық енгізілді</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    Потенциалды ұсыныстар
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-emerald-600">1 мақұлданды</div>
                  <p className="text-xs text-muted-foreground mt-1">Белсенділік негізінде қорытылды</p>
                </CardContent>
              </Card>
            </div>

            {/* Teacher Classes & Action Cards */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg font-bold">10А Сыныбы — Пән журналы</CardTitle>
                <CardDescription>
                  Оқушылар тізімі, бағалар қою және белсенділік пен тәртіпті белгілеу
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="rounded-xl border border-border/80 overflow-hidden">
                  <div className="p-4 bg-muted/30 border-b flex items-center justify-between flex-wrap gap-3">
                    <div>
                      <span className="font-semibold text-sm">Сынып: 10А</span>
                      <span className="text-muted-foreground text-xs ml-3">Пән: Алгебра • Оқушылар: 3</span>
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" className="text-xs">
                        + БЖБ/ТЖБ қосу
                      </Button>
                      <Button size="sm" className="text-xs">
                        Журналды ашу
                      </Button>
                    </div>
                  </div>
                  <div className="p-4 space-y-3">
                    <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                          АҚ
                        </div>
                        <div>
                          <div className="font-semibold">Арман Қайрат</div>
                          <div className="text-xs text-muted-foreground">student@bil.edu.kz</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span>БЖБ: 19/20</span>
                        <span>ТЖБ: 28/30</span>
                        <span className="text-primary font-bold">Белсенділік: 10/10</span>
                        <Badge variant="secondary" className="font-sans text-[11px]">Қорытынды: 5</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                          ДС
                        </div>
                        <div>
                          <div className="font-semibold">Диас Сәдуақас</div>
                          <div className="text-xs text-muted-foreground">dias@bil.edu.kz</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span>БЖБ: 17/20</span>
                        <span>ТЖБ: 25/30</span>
                        <span className="text-primary font-bold">Белсенділік: 8/10</span>
                        <Badge variant="secondary" className="font-sans text-[11px]">Қорытынды: 4</Badge>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-sm py-2">
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">
                          АМ
                        </div>
                        <div>
                          <div className="font-semibold">Айсұлу Мұрат</div>
                          <div className="text-xs text-muted-foreground">aisulu@bil.edu.kz</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span>БЖБ: 20/20</span>
                        <span>ТЖБ: 29/30</span>
                        <span className="text-primary font-bold">Белсенділік: 9/10</span>
                        <Badge variant="secondary" className="font-sans text-[11px]">Қорытынды: 5</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* ================= ADMIN DASHBOARD ================= */}
        {user.role === "ADMIN" && (
          <div className="space-y-8">
            <div className="grid gap-4 sm:grid-cols-3">
              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    {t("totalUsers")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalUsers}</div>
                  <p className="text-xs text-muted-foreground mt-1">Оқушылар, мұғалімдер және әкімшілер</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    {t("totalClasses")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalClasses}</div>
                  <p className="text-xs text-muted-foreground mt-1">10А (2025/2026 оқу жылы)</p>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                    {t("totalSubjects")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{totalSubjects}</div>
                  <p className="text-xs text-muted-foreground mt-1">Алгебра, Физика, Информатика</p>
                </CardContent>
              </Card>
            </div>

            {/* Users table */}
            <Card className="border-border/60">
              <CardHeader>
                <CardTitle className="text-lg font-bold">Жүйе пайдаланушылары</CardTitle>
                <CardDescription>Барлық тіркелген аккаунттар мен олардың құқықтары</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                    <tr>
                      <th className="py-3 px-4">Аты-жөні</th>
                      <th className="py-3 px-4">Email</th>
                      <th className="py-3 px-4">Рөл</th>
                      <th className="py-3 px-4">Тіркелген күні</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {allUsersList.map((u) => (
                      <tr key={u.id} className="hover:bg-muted/20 transition">
                        <td className="py-3 px-4 font-semibold">{u.fullName}</td>
                        <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                        <td className="py-3 px-4">
                          <Badge
                            variant={
                              u.role === "ADMIN"
                                ? "destructive"
                                : u.role === "TEACHER"
                                ? "default"
                                : "secondary"
                            }
                            className="text-xs"
                          >
                            {tr(u.role.toLowerCase() as "student" | "teacher" | "admin")}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">
                          {new Date(u.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
