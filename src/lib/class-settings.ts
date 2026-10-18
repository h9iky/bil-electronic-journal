/**
 * Валидация настроек оценивания класса (ClassSettings).
 *
 * Живёт отдельно от server action по двум причинам:
 * 1) сервер обязан проверять недоверенный вход — и делает это ровно этой функцией;
 * 2) клиентская форма использует её же, чтобы не отправлять заведомо битые данные
 *    и сразу подсвечивать ошибку. Одна правда — два потребителя.
 */

import { isRoundingMode, type RoundingMode } from "./constants";

/** Черновик настроек: то, что реально пишется в `ClassSettings`. */
export interface ClassSettingsDraft {
  sasWeight: number;
  satWeight: number;
  formativeWeight: number;
  thresholdThree: number;
  thresholdFour: number;
  thresholdFive: number;
  rounding: RoundingMode;
}

export type ClassSettingsCheck =
  | { ok: true; value: ClassSettingsDraft }
  | { ok: false; error: string };

/** Вес — целое 0..100 (0 = тип работ не участвует в четвертной). */
function isWeight(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 100;
}

/** Порог — целое 1..100: «процент и выше → оценка». */
function isThreshold(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 1 && value <= 100;
}

/**
 * Проверка черновика настроек.
 *
 * Правила:
 * - веса: целые 0–100, хотя бы один больше нуля (иначе четвертная не считается);
 * - пороги: целые 1–100, строго по возрастанию (`three < four < five`) —
 *   иначе перевод процента в оценку теряет смысл;
 * - округление: один из режимов `ROUNDING_MODES`.
 */
export function validateClassSettings(input: {
  sasWeight: unknown;
  satWeight: unknown;
  formativeWeight: unknown;
  thresholdThree: unknown;
  thresholdFour: unknown;
  thresholdFive: unknown;
  rounding: unknown;
}): ClassSettingsCheck {
  const { sasWeight, satWeight, formativeWeight } = input;

  if (!isWeight(sasWeight) || !isWeight(satWeight) || !isWeight(formativeWeight)) {
    return { ok: false, error: "invalid_weights" };
  }
  if (sasWeight + satWeight + formativeWeight === 0) {
    return { ok: false, error: "invalid_weights" };
  }

  const { thresholdThree, thresholdFour, thresholdFive } = input;
  if (
    !isThreshold(thresholdThree) ||
    !isThreshold(thresholdFour) ||
    !isThreshold(thresholdFive) ||
    thresholdThree >= thresholdFour ||
    thresholdFour >= thresholdFive
  ) {
    return { ok: false, error: "invalid_thresholds" };
  }

  if (!isRoundingMode(input.rounding)) {
    return { ok: false, error: "invalid_rounding" };
  }

  return {
    ok: true,
    value: {
      sasWeight,
      satWeight,
      formativeWeight,
      thresholdThree,
      thresholdFour,
      thresholdFive,
      rounding: input.rounding,
    },
  };
}
