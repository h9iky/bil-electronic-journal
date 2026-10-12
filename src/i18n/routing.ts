import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // ru — по умолчанию; kk — казахский; en — английский
  locales: ["ru", "kk", "en"],
  defaultLocale: "ru",
});

export type Locale = (typeof routing.locales)[number];
