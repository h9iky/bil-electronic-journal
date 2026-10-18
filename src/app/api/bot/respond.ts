import { NextResponse } from "next/server";

/**
 * Общий формат ответов `/api/bot/*` для Telegram-бота Ask BIL:
 * `{ ok: true, ... }` или `{ ok: false, error: "<машинный код>" }`.
 * Бот разбирает `error` и показывает пользователю человеческий текст.
 */

const STATUS_BY_ERROR: Record<string, number> = {
  unauthorized: 401,
  invalid_request: 400,
  not_linked: 404,
  code_not_found: 404,
  code_expired: 410,
  code_used: 409,
  already_linked: 409,
  telegram_taken: 409,
};

export function botError(error: string): NextResponse {
  return NextResponse.json({ ok: false, error }, { status: STATUS_BY_ERROR[error] ?? 500 });
}

export function botOk(payload: Record<string, unknown> = {}): NextResponse {
  return NextResponse.json({ ok: true, ...payload });
}
