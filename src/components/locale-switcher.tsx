"use client";

import { useLocale } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { routing } from "@/i18n/routing";

export function LocaleSwitcher() {
  const activeLocale = useLocale();
  const pathname = usePathname();

  return (
    <div className="flex items-center gap-1 rounded-md border p-0.5 bg-background">
      {routing.locales.map((locale) => {
        const isActive = locale === activeLocale;
        return (
          <Link
            key={locale}
            href={pathname}
            locale={locale}
            aria-current={isActive}
            className={`rounded px-2.5 py-1 text-xs font-semibold uppercase transition-all ${
              isActive
                ? "bg-primary text-primary-foreground shadow-xs pointer-events-none"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            {locale}
          </Link>
        );
      })}
    </div>
  );
}
