import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LocaleSwitcher } from "@/components/locale-switcher";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const t = await getTranslations("landing");
  const tc = await getTranslations("common");

  const features = [
    { title: t("features.gradesTitle"), text: t("features.gradesText") },
    { title: t("features.activityTitle"), text: t("features.activityText") },
    { title: t("features.behaviorTitle"), text: t("features.behaviorText") },
    { title: t("features.classesTitle"), text: t("features.classesText") },
  ];

  return (
    <div className="flex min-h-full flex-col">
      <header className="border-b">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
          <span className="text-lg font-semibold">{tc("appName")}</span>
          <LocaleSwitcher />
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-6 py-16">
        <section className="mx-auto max-w-2xl text-center">
          <Badge variant="secondary" className="mb-4">
            {t("badge")}
          </Badge>
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            {t("title")}
          </h1>
          <p className="text-muted-foreground mt-4 text-lg">{t("subtitle")}</p>
          <div className="mt-8 flex justify-center">
            <Link href="/login" className={buttonVariants({ size: "lg" })}>
              {t("login")}
            </Link>
          </div>
        </section>

        <section className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {features.map((feature) => (
            <Card key={feature.title}>
              <CardHeader>
                <CardTitle className="text-base">{feature.title}</CardTitle>
              </CardHeader>
              <CardContent className="text-muted-foreground text-sm">
                {feature.text}
              </CardContent>
            </Card>
          ))}
        </section>
      </main>

      <footer className="border-t">
        <div className="text-muted-foreground mx-auto w-full max-w-6xl px-6 py-6 text-sm">
          {tc("tagline")}
        </div>
      </footer>
    </div>
  );
}
