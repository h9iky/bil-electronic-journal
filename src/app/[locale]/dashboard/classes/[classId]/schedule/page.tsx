import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, CalendarDays, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getClassScheduleData } from "@/lib/schedule";
import { AppHeader } from "@/components/dashboard/app-header";
import { ScheduleGrid } from "@/components/dashboard/schedule-grid";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Расписание класса — ручная сетка только для админа (С3 дорожной карты).
 * Эти же строки `ScheduleSlot` читает бот (/today) через /api/bot/schedule.
 */
export default async function ClassSchedulePage({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale, classId } = await params;
  setRequestLocale(locale);

  const user = await requireRole(locale, "ADMIN");
  const t = await getTranslations("schedule");

  const data = await getClassScheduleData(classId);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} locale={locale} />

      <main className="flex-1 mx-auto w-full max-w-5xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </Link>
            {data && (
              <Link
                href={`/dashboard/classes/${data.classId}/settings`}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
              >
                <Settings2 className="h-3.5 w-3.5" />
                {t("openSettings")}
              </Link>
            )}
          </div>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <CalendarDays className="h-6 w-6 text-primary" />
            {t("title")}
          </h1>
          {data && (
            <p className="mt-1 text-sm text-muted-foreground">
              {data.className} • {data.year}
            </p>
          )}
        </div>

        {!data ? (
          <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {t("notFound")}
          </p>
        ) : (
          <Card className="border-border/60">
            <CardHeader className="pb-3">
              <CardTitle className="text-base font-bold">{t("gridTitle")}</CardTitle>
              <CardDescription className="text-xs">{t("hint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {data.subjects.length === 0 ? (
                <p className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-4 text-center text-xs text-muted-foreground">
                  {t("noSubjects")}
                </p>
              ) : (
                <ScheduleGrid
                  classId={data.classId}
                  subjects={data.subjects}
                  slots={data.slots}
                />
              )}
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
}
