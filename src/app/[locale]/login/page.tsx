import { getTranslations, setRequestLocale } from "next-intl/server";

export default async function LoginPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("landing");

  return (
    <div className="flex min-h-full flex-1 items-center justify-center p-6">
      <div className="text-center">
        <h1 className="text-2xl font-semibold">{t("login")}</h1>
        <p className="text-muted-foreground mt-2">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
