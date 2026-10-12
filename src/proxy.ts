import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Всё, кроме api, служебных путей и файлов с расширением
  matcher: "/((?!api|trpc|_next|_vercel|.*\\..*).*)",
};
