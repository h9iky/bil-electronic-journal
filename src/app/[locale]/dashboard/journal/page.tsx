import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowLeft, CalendarRange } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { requireRole } from "@/lib/auth";
import { getTeacherJournal, getTeacherJournalAttendance, getTeacherTeachings } from "@/lib/queries";
import { parseDay, todayIso } from "@/lib/day";
import { AppHeader } from "@/components/dashboard/app-header";
import { JournalView } from "@/components/journal/journal-view";

const QUARTERS = [1, 2, 3, 4] as const;

function normalizeQuarter(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isInteger(value) && value >= 1 && value <= 4 ? value : 1;
}

export default async function JournalPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ teaching?: string; quarter?: string; date?: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await requireRole(locale, "TEACHER");
  const sp = await searchParams;
  const quarter = normalizeQuarter(sp.quarter);
  // День посещаемости: битую дату молча меняем на сегодня.
  const date = sp.date && parseDay(sp.date) ? sp.date : todayIso();

  const teachings = await getTeacherTeachings(user.id);
  const active = teachings.find((t) => t.id === sp.teaching) ?? teachings[0] ?? null;
  const data = active ? await getTeacherJournal(user.id, active.id, quarter) : null;
  const attendance = active
    ? await getTeacherJournalAttendance(user.id, active.id, date)
    : null;

  const t = await getTranslations("journal");

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <AppHeader user={user} locale={locale} />

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 py-8 space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {t("back")}
            </Link>
            <h1 className="mt-1 text-2xl font-extrabold tracking-tight">{t("title")}</h1>
          </div>
        </div>

        {teachings.length === 0 || !active || !data || !attendance ? (
          <p className="rounded-xl border border-dashed border-border/70 bg-muted/20 p-8 text-center text-sm text-muted-foreground">
            {t("noTeachings")}
          </p>
        ) : (
          <>
            {/* Переключатели: класс/предмет и четверть */}
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex flex-wrap gap-1.5">
                {teachings.map((teaching) => {
                  const isActive = teaching.id === active.id;
                  return (
                    <Link
                      key={teaching.id}
                      href={{
                        pathname: "/dashboard/journal",
                        query: { teaching: teaching.id, quarter, date },
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-card hover:bg-muted"
                      }`}
                    >
                      {teaching.className} · {teaching.subjectName}
                    </Link>
                  );
                })}
              </div>

              <div className="flex items-center gap-1.5">
                <CalendarRange className="h-4 w-4 text-muted-foreground" />
                {QUARTERS.map((value) => {
                  const isActive = value === quarter;
                  return (
                    <Link
                      key={value}
                      href={{
                        pathname: "/dashboard/journal",
                        query: { teaching: active.id, quarter: value, date },
                      }}
                      className={`h-7 w-7 rounded-md border text-center text-xs font-semibold leading-7 transition ${
                        isActive
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border/70 bg-card hover:bg-muted"
                      }`}
                    >
                      {value}
                    </Link>
                  );
                })}
              </div>
            </div>

            <JournalView data={data} attendance={attendance} />
          </>
        )}
      </main>
    </div>
  );
}
