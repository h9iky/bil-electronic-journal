/**
 * Ошибки Prisma, которые мы реально ловим в экшенах.
 *
 * `P2002` — нарушение уникального индекса. Нужен там, где между проверкой
 * «уже есть?» и вставкой может влезть параллельный запрос: проверка даёт
 * человеческую ошибку, индекс — гарантию.
 */
export function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === "P2002"
  );
}
