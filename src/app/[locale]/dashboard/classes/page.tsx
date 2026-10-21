import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, CalendarDays, Layers, Settings2, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getClassesOverview } from "@/lib/queries";
import { academicYear } from "@/lib/klass";
import { AppHeader } from "@/components/dashboard/app-header";
import { ClassCreateForm } from "@/components/dashboard/class-create-form";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Справочник классов — только админ.
 * Здесь классы заводятся, отсюда же ведут ссылки в настройки и расписание.
 */
export default async function ClassesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireRole(locale, "ADMIN");
  const t = await getTranslations("classes");
  const classes = await getClassesOverview();

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} locale={locale} />

      <main className="flex-1 mx-auto w-full max-w-6xl px-4 sm:px-6 py-8 space-y-6">
        <div>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t("back")}
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-2xl font-extrabold tracking-tight">
            <Layers className="h-6 w-6 text-primary" />
            {t("title")}
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{t("subtitle")}</p>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
          <Card className="order-2 border-border/60 lg:order-1">
            <CardHeader>
              <CardTitle className="text-lg font-bold">{t("listTitle")}</CardTitle>
              <CardDescription>{t("listHint")}</CardDescription>
            </CardHeader>
            <CardContent>
              {classes.length === 0 ? (
                <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
                  {t("empty")}
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                      <tr>
                        <th className="px-3 py-3">{t("colClass")}</th>
                        <th className="px-3 py-3">{t("colYear")}</th>
                        <th className="px-3 py-3">{t("students")}</th>
                        <th className="px-3 py-3">{t("teachers")}</th>
                        <th className="px-3 py-3">{t("curator")}</th>
                        <th className="px-3 py-3 text-right">{t("colActions")}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {classes.map((klass) => (
                        <tr key={klass.id} className="transition hover:bg-muted/20">
                          <td className="px-3 py-3 font-semibold">{klass.name}</td>
                          <td className="px-3 py-3 text-muted-foreground">{klass.year}</td>
                          <td className="px-3 py-3">
                            <span className="inline-flex items-center gap-1 text-muted-foreground">
                              <Users className="h-3.5 w-3.5" />
                              {klass.students}
                            </span>
                          </td>
                          <td className="px-3 py-3 text-muted-foreground">{klass.teachers}</td>
                          <td className="px-3 py-3">
                            {klass.curator ? (
                              <span className="text-muted-foreground">{klass.curator}</span>
                            ) : (
                              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                                {t("noCurator")}
                              </Badge>
                            )}
                          </td>
                          <td className="px-3 py-3">
                            <div className="flex items-center justify-end gap-2">
                              <Link
                                href={`/dashboard/classes/${klass.id}/settings`}
                                title={t("settings")}
                                className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-1 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                              >
                                <Settings2 className="h-3 w-3" />
                                {t("settings")}
                              </Link>
                              <Link
                                href={`/dashboard/classes/${klass.id}/schedule`}
                                title={t("schedule")}
                                className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-1 text-xs font-medium transition hover:border-primary/50 hover:text-primary"
                              >
                                <CalendarDays className="h-3 w-3" />
                                {t("schedule")}
                              </Link>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          <div className="order-1 lg:order-2">
            <ClassCreateForm defaultYear={academicYear()} />
          </div>
        </div>
      </main>
    </div>
  );
}
