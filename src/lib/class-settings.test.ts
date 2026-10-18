import { describe, expect, it } from "vitest";
import { DEFAULT_RULES } from "./constants";
import { validateClassSettings, type ClassSettingsDraft } from "./class-settings";

/** Валидный черновик — дефолты из constants (они же дефолты схемы). */
const draft = (overrides: Partial<ClassSettingsDraft> = {}) => ({
  sasWeight: DEFAULT_RULES.weights.sas,
  satWeight: DEFAULT_RULES.weights.sat,
  formativeWeight: DEFAULT_RULES.weights.formative,
  thresholdThree: DEFAULT_RULES.thresholds.three,
  thresholdFour: DEFAULT_RULES.thresholds.four,
  thresholdFive: DEFAULT_RULES.thresholds.five,
  rounding: DEFAULT_RULES.rounding,
  ...overrides,
});

/** Ожидание ошибки — короче, чем каждый раз распаковывать union. */
const errorOf = (input: ReturnType<typeof draft>): string | null => {
  const check = validateClassSettings(input);
  return check.ok ? null : check.error;
};

describe("validateClassSettings", () => {
  it("пропускает дефолтные настройки как есть", () => {
    const check = validateClassSettings(draft());
    expect(check.ok).toBe(true);
    if (check.ok) expect(check.value).toEqual(draft());
  });

  it("пропускает кастомные значения и нормализованные веса (сумма ≠ 100)", () => {
    const check = validateClassSettings(
      draft({
        sasWeight: 30,
        satWeight: 60,
        formativeWeight: 10,
        thresholdThree: 35,
        thresholdFour: 60,
        thresholdFive: 90,
        rounding: "FLOOR",
      }),
    );
    expect(check.ok).toBe(true);
    if (check.ok) {
      expect(check.value.rounding).toBe("FLOOR");
      expect(check.value.thresholdFive).toBe(90);
    }
  });

  it("веса: отрицательные, дробные и больше 100 — invalid_weights", () => {
    expect(errorOf(draft({ satWeight: -1 }))).toBe("invalid_weights");
    expect(errorOf(draft({ formativeWeight: 12.5 }))).toBe("invalid_weights");
    expect(errorOf(draft({ sasWeight: 101 }))).toBe("invalid_weights");
    expect(errorOf(draft({ sasWeight: Number.NaN }))).toBe("invalid_weights");
    expect(errorOf(draft({ satWeight: "50" as unknown as number }))).toBe("invalid_weights");
  });

  it("веса: все три нуля — четвёртная не считается, invalid_weights", () => {
    expect(
      errorOf(draft({ sasWeight: 0, satWeight: 0, formativeWeight: 0 })),
    ).toBe("invalid_weights");
  });

  it("веса: один ненулевой — этого достаточно", () => {
    const check = validateClassSettings(
      draft({ sasWeight: 100, satWeight: 0, formativeWeight: 0 }),
    );
    expect(check.ok).toBe(true);
  });

  it("пороги: равные или перепутанные — invalid_thresholds", () => {
    expect(errorOf(draft({ thresholdFour: 40 }))).toBe("invalid_thresholds");
    expect(errorOf(draft({ thresholdThree: 70 }))).toBe("invalid_thresholds");
    expect(errorOf(draft({ thresholdFour: 95 }))).toBe("invalid_thresholds");
  });

  it("пороги: вне диапазона 1..100 — invalid_thresholds", () => {
    expect(errorOf(draft({ thresholdThree: 0 }))).toBe("invalid_thresholds");
    expect(errorOf(draft({ thresholdFive: 101 }))).toBe("invalid_thresholds");
    expect(errorOf(draft({ thresholdFour: 64.9 }))).toBe("invalid_thresholds");
  });

  it("пороги: минимально допустимый строй 1 < 2 < 3", () => {
    const check = validateClassSettings(
      draft({ thresholdThree: 1, thresholdFour: 2, thresholdFive: 3 }),
    );
    expect(check.ok).toBe(true);
  });

  it("округление: не из ROUNDING_MODES — invalid_rounding", () => {
    expect(errorOf(draft({ rounding: "BANKERS" as unknown as ClassSettingsDraft["rounding"] }))).toBe(
      "invalid_rounding",
    );
    expect(errorOf(draft({ rounding: "" as unknown as ClassSettingsDraft["rounding"] }))).toBe(
      "invalid_rounding",
    );
  });

  it("порядок проверок: битые веса не маскируются битыми порогами", () => {
    expect(
      errorOf(
        draft({
          sasWeight: -5,
          thresholdThree: 90,
          thresholdFour: 10,
          thresholdFive: 20,
        }),
      ),
    ).toBe("invalid_weights");
  });
});
