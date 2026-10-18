import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, CalendarDays, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getClassSettingsData } from "@/lib/queries";
import { AppHeader } from "@/components/dashboard/app-header";
import { ClassSettingsForm } from "@/components/dashboard/class-settings-form";
import { Badge } from "@/components/ui/badge";

/**
 * Настройки оценивания класса — только админ (см. ТЗ §3).
 * Учитель видит те же правила read-only панелью в журнале.
 */
export default async function ClassSettingsPage({
  params,
}: {
  params: Promise<{ locale: string; classId: string }>;
}) {
  const { locale, classId } = await params;
  setRequestLocale(locale);

  const user = await requireRole(locale, "ADMIN");
  const t = await getTranslations("classSettings");

  const data = await getClassSettingsData(classId);

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} locale={locale} />

      <main className="flex-1 mx-auto w-full max-w-4xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("back")}
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Settings2 className="h-6 w-6 text-primary" />
            {t("title")}
          </h1>
          {data && (
            <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>
                {data.className} • {data.year}
              </span>
              <Badge variant="outline" className="text-[10px]">
                {data.customized ? t("statusCustom") : t("statusDefault")}
              </Badge>
            </p>
          )}
          {data && (
            <Link
              href={`/dashboard/classes/${data.classId}/schedule`}
              className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <CalendarDays className="h-3.5 w-3.5" />
              {t("openSchedule")}
            </Link>
          )}
        </div>

        {!data ? (
          <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {t("notFound")}
          </p>
        ) : (
          <ClassSettingsForm classId={data.classId} initialRules={data.rules} />
        )}
      </main>
    </div>
  );
}
