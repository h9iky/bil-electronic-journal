import { defineRouting } from "next-intl/routing";

export const routing = defineRouting({
  // kk — по умолчанию (қазақша); ru — орысша; en — ағылшынша
  locales: ["kk", "ru", "en"],
  defaultLocale: "kk",
});

export type Locale = (typeof routing.locales)[number];
