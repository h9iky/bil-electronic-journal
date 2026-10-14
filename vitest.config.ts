import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Юнит-тесты для чистой логики (математика оценивания).
 * Ничего из Next/DOM здесь не нужно — окружение `node`.
 */
export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
