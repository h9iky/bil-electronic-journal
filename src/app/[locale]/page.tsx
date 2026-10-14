import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { getSessionUser } from "@/lib/auth";
import {
  School,
  TrendingUp,
  Sparkles,
  HeartHandshake,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
} from "lucide-react";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  const features = [
    {
      title: t("features.gradesTitle"),
      text: t("features.gradesText"),
      icon: TrendingUp,
      color: "text-blue-600 bg-blue-500/10",
    },
    {
      title: t("features.activityTitle"),
      text: t("features.activityText"),
      icon: Sparkles,
      color: "text-amber-600 bg-amber-500/10",
    },
    {
      title: t("features.behaviorTitle"),
      text: t("features.behaviorText"),
      icon: HeartHandshake,
      color: "text-emerald-600 bg-emerald-500/10",
    },
    {
      title: t("features.classesTitle"),
      text: t("features.classesText"),
      icon: Layers,
      color: "text-indigo-600 bg-indigo-500/10",
    },
  ];

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Header */}
      <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-20">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <School className="h-5 w-5" />
            </div>
            <span>{tc("appName")}</span>
          </Link>

          <div className="flex items-center gap-4">
            <LocaleSwitcher />
            {user ? (
              <Link
                href="/dashboard"
                className={buttonVariants({ size: "sm" })}
              >
                {t("dashboard")}
              </Link>
            ) : (
              <Link
                href="/login"
                className={buttonVariants({ size: "sm" })}
              >
                {t("login")}
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16 sm:py-24">
        <section className="mx-auto max-w-3xl text-center space-y-6">
          <Badge
            variant="outline"
            className="px-3.5 py-1 text-xs font-semibold text-primary border-primary/30 bg-primary/5 inline-flex items-center gap-1.5"
          >
            <ShieldCheck className="h-3.5 w-3.5" />
            {t("badge")}
          </Badge>

          <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl text-foreground">
            {t("title")}
          </h1>

          <p className="text-muted-foreground mx-auto max-w-2xl text-lg sm:text-xl leading-relaxed">
            {t("subtitle")}
          </p>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className={buttonVariants({
                  size: "lg",
                  className: "w-full sm:w-auto gap-2 px-8 font-semibold shadow-md",
                })}
              >
                <span>{t("dashboard")} ({user.fullName})</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link
                href="/login"
                className={buttonVariants({
                  size: "lg",
                  className: "w-full sm:w-auto gap-2 px-8 font-semibold shadow-md",
                })}
              >
                <span>{t("login")}</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            )}
          </div>

          <div className="pt-2 flex items-center justify-center gap-6 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t("bulletGrades")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t("bulletActivity")}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              {t("bulletBehavior")}
            </span>
          </div>
        </section>

        {/* Feature Highlights Grid */}
        <section className="mt-20 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <Card key={feature.title} className="border-border/60 hover:border-primary/40 hover:shadow-md transition">
                <CardHeader>
                  <div className={`mb-3 inline-flex h-11 w-11 items-center justify-center rounded-xl ${feature.color}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <CardTitle className="text-base font-bold">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-muted-foreground text-sm leading-relaxed">
                  {feature.text}
                </CardContent>
              </Card>
            );
          })}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t bg-muted/20">
        <div className="text-muted-foreground mx-auto flex w-full max-w-6xl flex-col sm:flex-row items-center justify-between px-6 py-6 text-xs gap-3">
          <div>{tc("appName")} • {tc("tagline")}</div>
          <div>Next.js 16 • Tailwind v4 • Prisma SQLite • PWA Ready</div>
        </div>
      </footer>
    </div>
  );
}
