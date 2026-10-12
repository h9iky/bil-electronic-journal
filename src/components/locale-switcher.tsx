"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5">
      {routing.locales.map((locale) => (
        <button
          key={locale}
          type="button"
          onClick={() => router.replace(pathname, { locale })}
          aria-current={locale === activeLocale}
          className={`rounded px-2 py-1 text-xs font-medium uppercase transition-colors ${
            locale === activeLocale
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted"
          }`}
        >
          {locale}
        </button>
      ))}
    </div>
  );
}
