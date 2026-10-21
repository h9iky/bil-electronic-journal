import { getTranslations, setRequestLocale } from "next-intl/server";
import { redirect } from "next/navigation";
import { School, UserPlus } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { RegisterForm } from "@/components/auth/register-form";
import { getSessionUser } from "@/lib/auth";
import { getClassOptions } from "@/lib/queries";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Саморегистрация: ученик выбирает класс, учитель заходит без него.
 * Уже вошедшего отправляем в кабинет — второй аккаунт ему тут не нужен.
 */
export default async function RegisterPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getSessionUser();
  if (user) redirect(`/${locale}/dashboard`);

  const tc = await getTranslations("common");
  const t = await getTranslations("register");
  const classes = await getClassOptions();

  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-background via-muted/30 to-background">
      <header className="sticky top-0 z-10 border-b bg-background/80 backdrop-blur-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center justify-between px-6 py-3.5">
          <Link href="/" className="flex items-center gap-2.5 text-lg font-bold transition hover:opacity-90">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
              <School className="h-5 w-5" />
            </div>
            <span>{tc("appName")}</span>
          </Link>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="flex flex-1 items-center justify-center p-4 sm:p-6 md:p-10">
        <div className="w-full max-w-xl">
          <Card className="border-border/60 shadow-lg shadow-primary/5">
            <CardHeader className="pb-4 pt-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <UserPlus className="h-6 w-6" />
              </div>
              <Badge
                variant="outline"
                className="mx-auto mb-2 border-primary/30 px-3 py-0.5 text-xs font-semibold text-primary"
              >
                {t("badge")}
              </Badge>
              <CardTitle className="text-2xl font-bold tracking-tight sm:text-3xl">
                {t("title")}
              </CardTitle>
              <CardDescription className="mt-1.5 text-sm text-muted-foreground sm:text-base">
                {t("subtitle")}
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-5 pt-2">
              <RegisterForm classes={classes} locale={locale} />

              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/80" />
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-card px-3 text-muted-foreground">{t("haveAccount")}</span>
                </div>
              </div>

              <Link
                href="/login"
                className="flex w-full items-center justify-center rounded-lg border border-border/80 bg-card px-4 py-2.5 text-sm font-semibold text-foreground transition hover:border-primary/50 hover:text-primary"
              >
                {t("loginLink")}
              </Link>
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
