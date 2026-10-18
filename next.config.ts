import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // Dev-сервер живёт на кастомном хосте bilgrade (см. /etc/hosts). Без этого
  // Next 16 блокирует cross-origin HMR-вебсокет, и клиент не гидратируется.
  allowedDevOrigins: ["bilgrade"],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
