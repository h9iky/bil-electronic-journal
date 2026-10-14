import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { loginWithRole } from "@/lib/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  GraduationCap,
  BookOpen,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  School,
  Lock,
} from "lucide-react";

export default async function LoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ error?: string }>;
}) {
  const { locale } = await params;
  const sp = searchParams ? await searchParams : {};
  setRequestLocale(locale);

  const t = await getTranslations("auth");
  const tc = await getTranslations("common");

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-muted/30 to-background">
      {/* Top Navbar */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 font-bold text-lg hover:opacity-90 transition">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <School className="h-5 w-5" />
            </div>
            <span>{tc("appName")}</span>
          </Link>
          <div className="flex items-center gap-3">
            <LocaleSwitcher />
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-xl space-y-6">
          <Card className="border-border/60 shadow-lg shadow-primary/5">
            <CardHeader className="text-center pb-4 pt-6">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <Sparkles className="h-6 w-6" />
              </div>
              <Badge variant="outline" className="mx-auto mb-2 px-3 py-0.5 text-xs font-semibold text-primary border-primary/30">
                {t("portalBadge")}
              </Badge>
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("title")}
              </CardTitle>
              <CardDescription className="text-sm sm:text-base mt-1.5 text-muted-foreground">
                {t("subtitle")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-6 pt-2">
              {sp.error === "not_found" && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-center text-xs font-medium text-destructive">
                  {t("errorNotFound")}
                </div>
              )}

              {/* Quick Role Selection (Demo 1-Click) */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {t("demoTitle")}
                  </span>
                  <span className="text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                    {t("demoFastAccess")}
                  </span>
                </div>

                <div className="grid gap-2.5">
                  {/* Student */}
                  <form
                    action={async () => {
                      "use server";
                      await loginWithRole("student@bil.edu.kz", locale);
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-accent/40 hover:border-primary/50 transition-all text-left group shadow-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:scale-105 transition-transform">
                          <GraduationCap className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {t("asStudent")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("studentHint")}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </form>

                  {/* Teacher */}
                  <form
                    action={async () => {
                      "use server";
                      await loginWithRole("teacher@bil.edu.kz", locale);
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-accent/40 hover:border-primary/50 transition-all text-left group shadow-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:scale-105 transition-transform">
                          <BookOpen className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {t("asTeacher")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("teacherHint")}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </form>

                  {/* Admin */}
                  <form
                    action={async () => {
                      "use server";
                      await loginWithRole("admin@bil.edu.kz", locale);
                    }}
                  >
                    <button
                      type="submit"
                      className="w-full flex items-center justify-between p-3.5 rounded-xl border border-border/80 bg-card hover:bg-accent/40 hover:border-primary/50 transition-all text-left group shadow-xs cursor-pointer"
                    >
                      <div className="flex items-center gap-3.5">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:scale-105 transition-transform">
                          <ShieldCheck className="h-5 w-5" />
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors">
                            {t("asAdmin")}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {t("adminHint")}
                          </div>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary group-hover:translate-x-0.5 transition-all" />
                    </button>
                  </form>
                </div>
              </div>

              {/* Or manual email login */}
              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/80" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-3 text-muted-foreground">{t("orDivider")}</span>
                </div>
              </div>

              <form
                action={async (formData: FormData) => {
                  "use server";
                  const email = formData.get("email")?.toString() || "";
                  if (email) {
                    await loginWithRole(email, locale);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-foreground mb-1.5">
                    {t("emailLabel")}
                  </label>
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    placeholder={t("emailPlaceholder")}
                    className="w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition"
                  />
                </div>
                <Button type="submit" className="w-full cursor-pointer font-medium">
                  {t("submit")}
                </Button>
              </form>

              {/* Security Badge */}
              <div className="rounded-lg bg-muted/50 p-3 text-center border border-border/50">
                <p className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
                  <Lock className="h-3.5 w-3.5 text-primary" />
                  <span>{t("securityNote")}</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>

      <footer className="border-t py-4 text-center text-xs text-muted-foreground">
        {tc("tagline")} • BIL Electronic Journal
      </footer>
    </div>
  );
}
