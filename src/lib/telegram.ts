/**
 * Мост «журнал ↔ Telegram-бот» (проект Ask BIL).
 *
 * Бот — тонкий клиент: он не знает ни про Prisma, ни про оценки. Всё, что он
 * умеет, — дёрнуть `/api/bot/*` с секретом `BOT_API_TOKEN` в заголовке
 * `X-Bot-Token`. Проверка секрета и вся логика привязки живут здесь.
 *
 * Схема потока:
 *   1. Пользователь в кабинете жмёт «Получить код» → журнал кладёт
 *      `TelegramLinkCode` (6 цифр, TTL).
 *   2. Он отправляет боту `/start 123456`.
 *   3. Бот зовёт `POST /api/bot/link` → здесь код гасится, создаётся
 *      `TelegramLink` (userId ↔ telegramId).
 */

import { createHash, randomInt, timingSafeEqual } from "node:crypto";
import { db } from "./db";
import { isRole, type Role } from "./constants";

/** Сколько минут живёт код привязки. */
export const TELEGRAM_CODE_TTL_MINUTES = 10;

/** Языки, на которых бот умеет говорить (см. locales в ask-bil). */
export const BOT_LOCALES = ["ru", "kk", "en"] as const;
export type BotLocale = (typeof BOT_LOCALES)[number];

export const isBotLocale = (v: unknown): v is BotLocale =>
  typeof v === "string" && (BOT_LOCALES as readonly string[]).includes(v);

/** Приводим язык к известному: мусор из базы не должен ронять бот. */
export const normalizeBotLocale = (v: string): BotLocale => (isBotLocale(v) ? v : "ru");

/** Профиль аккаунта журнала, который бот показывает в Telegram. */
export interface BotProfile {
  userId: string;
  fullName: string;
  role: Role;
  /** Класс ученика (null у остальных ролей). */
  className: string | null;
  /** Предметы учителя (пусто у остальных ролей). */
  subjects: string[];
  /** Язык сообщений бота и тумблер вечерней сводки. */
  locale: BotLocale;
  digestEnabled: boolean;
}

/** Результат привязки: либо профиль, либо машинный код ошибки для бота. */
export type LinkResult =
  | { ok: true; profile: BotProfile }
  | {
      ok: false;
      error:
        | "code_not_found"
        | "code_expired"
        | "code_used"
        | "already_linked"
        | "telegram_taken";
    };

// --- Валидация входных данных (бот — такой же недоверенный вход, как форма) ---

const TELEGRAM_ID_PATTERN = /^\d{5,15}$/;
const CODE_PATTERN = /^\d{6}$/;
const USERNAME_PATTERN = /^[A-Za-z0-9_]{3,32}$/;

export const isTelegramId = (v: unknown): v is string =>
  typeof v === "string" && TELEGRAM_ID_PATTERN.test(v);

export const isLinkCode = (v: unknown): v is string =>
  typeof v === "string" && CODE_PATTERN.test(v);

/** Username необязателен: у части аккаунтов его просто нет. */
export const isTelegramUsername = (v: unknown): v is string | null | undefined =>
  v == null || (typeof v === "string" && USERNAME_PATTERN.test(v));

// --- Секрет бота ---

/**
 * Проверка заголовка `X-Bot-Token`. Сравниваем хэши через `timingSafeEqual`,
 * чтобы по времени ответа нельзя было подбирать секрет посимвольно.
 */
export function isBotAuthorized(request: Request): boolean {
  const expected = process.env.BOT_API_TOKEN;
  if (!expected) return false;

  const provided = request.headers.get("x-bot-token");
  if (!provided) return false;

  const a = createHash("sha256").update(provided).digest();
  const b = createHash("sha256").update(expected).digest();
  return timingSafeEqual(a, b);
}

// --- Коды привязки ---

/**
 * Свежий код для пользователя: старые гасим — активным может быть только один.
 * Шесть цифр могут совпасть с чужим кодом; от этого спасает уникальный индекс,
 * поэтому просто пробуем ещё раз.
 */
export async function createTelegramCode(userId: string): Promise<string> {
  await db.telegramLinkCode.deleteMany({ where: { userId } });

  for (let attempt = 0; attempt < 5; attempt++) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    try {
      await db.telegramLinkCode.create({
        data: {
          userId,
          code,
          expiresAt: new Date(Date.now() + TELEGRAM_CODE_TTL_MINUTES * 60_000),
        },
      });
      return code;
    } catch {
      // Код уже занят другим пользователем — берём следующий.
    }
  }

  throw new Error("failed to generate telegram link code");
}

/**
 * Погашение кода и создание привязки. Идемпотентно: если этот же Telegram уже
 * привязан к тому же аккаунту — это успех, а не ошибка (повторный /start).
 */
export async function consumeTelegramCode(params: {
  code: string;
  telegramId: string;
  username: string | null;
}): Promise<LinkResult> {
  const record = await db.telegramLinkCode.findUnique({ where: { code: params.code } });
  if (!record) return { ok: false, error: "code_not_found" };

  if (record.usedAt) {
    const link = await db.telegramLink.findUnique({ where: { userId: record.userId } });
    if (link?.telegramId === params.telegramId) {
      const profile = await getBotProfile(record.userId);
      return profile ? { ok: true, profile } : { ok: false, error: "code_used" };
    }
    return { ok: false, error: "code_used" };
  }

  if (record.expiresAt.getTime() < Date.now()) return { ok: false, error: "code_expired" };

  const byTelegram = await db.telegramLink.findUnique({
    where: { telegramId: params.telegramId },
  });
  if (byTelegram && byTelegram.userId !== record.userId) {
    return { ok: false, error: "telegram_taken" };
  }

  const byUser = await db.telegramLink.findUnique({ where: { userId: record.userId } });
  if (byUser && byUser.telegramId !== params.telegramId) {
    return { ok: false, error: "already_linked" };
  }

  await db.$transaction([
    db.telegramLink.upsert({
      where: { userId: record.userId },
      create: {
        userId: record.userId,
        telegramId: params.telegramId,
        username: params.username,
      },
      update: { telegramId: params.telegramId, username: params.username },
    }),
    db.telegramLinkCode.update({
      where: { id: record.id },
      data: { usedAt: new Date() },
    }),
  ]);

  const profile = await getBotProfile(record.userId);
  if (!profile) return { ok: false, error: "code_not_found" };
  return { ok: true, profile };
}

// --- Чтение ---

/** Профиль для бота: имя, роль, класс ученика или предметы учителя. */
export async function getBotProfile(userId: string): Promise<BotProfile | null> {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      fullName: true,
      role: true,
      enrollments: {
        select: { klass: { select: { name: true } } },
        take: 1,
      },
      teachings: { select: { subject: { select: { name: true } } } },
      telegramLink: { select: { locale: true, digestEnabled: true } },
    },
  });
  if (!user || !isRole(user.role)) return null;

  return {
    userId: user.id,
    fullName: user.fullName,
    role: user.role,
    className: user.role === "STUDENT" ? (user.enrollments[0]?.klass.name ?? null) : null,
    subjects:
      user.role === "TEACHER"
        ? [...new Set(user.teachings.map((teaching) => teaching.subject.name))]
        : [],
    locale: normalizeBotLocale(user.telegramLink?.locale ?? "ru"),
    digestEnabled: user.telegramLink?.digestEnabled ?? true,
  };
}

/** Профиль по telegramId — «кто это?» для `/me` и middleware бота. */
export async function getProfileByTelegramId(telegramId: string): Promise<BotProfile | null> {
  const link = await db.telegramLink.findUnique({
    where: { telegramId },
    select: { userId: true },
  });
  if (!link) return null;
  return getBotProfile(link.userId);
}

/**
 * Настройки бота (§5): язык сообщений и тумблер вечерней сводки.
 * Возвращаем свежий профиль; `null` — Telegram не привязан.
 */
export async function updateBotSettings(params: {
  telegramId: string;
  locale?: BotLocale;
  digestEnabled?: boolean;
}): Promise<BotProfile | null> {
  const link = await db.telegramLink.findUnique({
    where: { telegramId: params.telegramId },
    select: { userId: true },
  });
  if (!link) return null;

  await db.telegramLink.update({
    where: { telegramId: params.telegramId },
    data: {
      ...(params.locale !== undefined ? { locale: params.locale } : {}),
      ...(params.digestEnabled !== undefined ? { digestEnabled: params.digestEnabled } : {}),
    },
  });
  return getBotProfile(link.userId);
}

/** Привязка пользователя — для карточки в кабинете (или null). */
export async function getTelegramLink(userId: string) {
  return db.telegramLink.findUnique({
    where: { userId },
    select: { username: true, telegramId: true, createdAt: true },
  });
}

/** Отвязка по telegramId (команда `/unlink` в боте). `false` — привязки нет. */
export async function unlinkTelegramByTelegramId(telegramId: string): Promise<boolean> {
  const link = await db.telegramLink.findUnique({
    where: { telegramId },
    select: { id: true },
  });
  if (!link) return false;
  await db.telegramLink.delete({ where: { id: link.id } });
  return true;
}

/** Отвязка по userId (кнопка в кабинете журнала). `false` — привязки нет. */
export async function unlinkTelegramByUserId(userId: string): Promise<boolean> {
  const link = await db.telegramLink.findUnique({ where: { userId }, select: { id: true } });
  if (!link) return false;
  await db.telegramLink.delete({ where: { id: link.id } });
  return true;
}
