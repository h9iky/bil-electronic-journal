import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // ru — по умолчанию; kk — казахский (ISO 639-1)
  locales: ["ru", "kk"],
  defaultLocale: "ru",
});

export type Locale = (typeof routing.locales)[number];
