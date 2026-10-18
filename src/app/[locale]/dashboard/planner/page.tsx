import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { parseDay, todayIso } from "@/lib/day";
import {
  addDaysIso,
  getStudentPlannerRange,
  listStudentSubjects,
  weekStartIso,
} from "@/lib/planner";
import { AppHeader } from "@/components/dashboard/app-header";
import { PlannerBoard } from "@/components/dashboard/planner-board";

/**
 * Личный план ученика — недельная сетка (С4 дорожной карты Ask BIL).
 * Те же строки `PlannerTask` читает бот (/plan) через /api/bot/plan.
 */
export default async function PlannerPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ week?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireRole(locale, "STUDENT");
  const sp = await searchParams;
  const t = await getTranslations("planner");

  // Неделя: пустую или битую дату молча считаем от сегодня.
  const today = todayIso();
  const anchor = sp.week && parseDay(sp.week) ? sp.week : today;
  const weekStart = weekStartIso(anchor) ?? weekStartIso(today)!;
  const days = Array.from({ length: 7 }, (_, index) => addDaysIso(weekStart, index)!);
  const weekEnd = days[6];

  const [tasks, subjects] = await Promise.all([
    getStudentPlannerRange(user.id, weekStart, weekEnd),
    listStudentSubjects(user.id),
  ]);

  const prevWeek = addDaysIso(weekStart, -7)!;
  const nextWeek = addDaysIso(weekStart, 7)!;
  const isCurrentWeek = weekStart === weekStartIso(today);

  const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

  const navButtonClass =
    "inline-flex h-8 w-8 items-center justify-center rounded-md border border-border/60 bg-background text-muted-foreground transition hover:bg-muted/40 hover:text-foreground";

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} locale={locale} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </Link>
            <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
              <CalendarDays className="h-6 w-6 text-primary" />
              {t("title")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">{t("subtitle")}</p>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href={`/dashboard/planner?week=${prevWeek}`}
              className={navButtonClass}
              aria-label={t("weekPrev")}
            >
              <ChevronLeft className="h-4 w-4" />
            </Link>
            <span className="text-sm font-semibold tabular-nums">
              {shortDate(weekStart)} – {shortDate(weekEnd)}
            </span>
            <Link
              href={`/dashboard/planner?week=${nextWeek}`}
              className={navButtonClass}
              aria-label={t("weekNext")}
            >
              <ChevronRight className="h-4 w-4" />
            </Link>
            {!isCurrentWeek && (
              <Link
                href="/dashboard/planner"
                className="text-xs font-medium text-primary underline-offset-4 hover:underline"
              >
                {t("weekCurrent")}
              </Link>
            )}
          </div>
        </div>

        <PlannerBoard tasks={tasks ?? []} subjects={subjects} days={days} today={today} />
      </main>
    </div>
  );
}
