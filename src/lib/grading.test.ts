import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, type GradingRules } from "./constants";
import {
  average,
  averageActivity,
  behaviorBalance,
  effectiveQuarterGrade,
  formatSigned,
  gradeFromGroupPercent,
  gradeFromPercent,
  gradeFromValue,
  groupPercent,
  isActivityInRange,
  isGradeInRange,
  isScoreValid,
  percent,
  quarterGrade,
  quarterPercent,
  requiredScoreForTarget,
  round,
  semesterPercent,
  simulateQuarter,
  yearPercent,
  type GroupScore,
  type SubjectGroups,
} from "./grading";

/** Быстрый конструктор сводки по группе работ. */
const group = (sumScore: number, sumMax: number, count: number): GroupScore => ({
  sumScore,
  sumMax,
  count,
});

const rules = (overrides: Partial<GradingRules> = {}): GradingRules => ({
  ...DEFAULT_RULES,
  ...overrides,
});

describe("percent / groupPercent", () => {
  it("возвращает null, когда балла нет или максимум некорректен", () => {
    expect(percent(null, 20)).toBeNull();
    expect(percent(undefined, 20)).toBeNull();
    expect(percent(10, 0)).toBeNull();
    expect(percent(10, -5)).toBeNull();
  });

  it("считает процент выполнения", () => {
    expect(percent(10, 20)).toBe(50);
    expect(percent(0, 20)).toBe(0);
  });

  it("по пустой группе отдаёт null, а не 0", () => {
    expect(groupPercent(group(0, 0, 0))).toBeNull();
    expect(groupPercent(group(15, 20, 2))).toBe(75);
  });
});

describe("round", () => {
  it("HALF_UP — математическое округление", () => {
    expect(round(2.4)).toBe(2);
    expect(round(2.5)).toBe(3);
    expect(round(1.2345, "HALF_UP", 2)).toBeCloseTo(1.23, 5);
  });

  it("FLOOR / CEIL / NONE", () => {
    expect(round(2.9, "FLOOR")).toBe(2);
    expect(round(2.1, "CEIL")).toBe(3);
    expect(round(2.7, "NONE")).toBe(2.7);
  });
});

describe("average", () => {
  it("пустой список — null, иначе среднее", () => {
    expect(average([])).toBeNull();
    expect(average([2, 4, 6])).toBe(4);
  });
});

describe("gradeFromPercent", () => {
  it("null остаётся null", () => {
    expect(gradeFromPercent(null)).toBeNull();
  });

  it("переводит по порогам 40 / 65 / 85", () => {
    expect(gradeFromPercent(100)).toBe(5);
    expect(gradeFromPercent(85)).toBe(5);
    expect(gradeFromPercent(84.9)).toBe(4);
    expect(gradeFromPercent(65)).toBe(4);
    expect(gradeFromPercent(64.9)).toBe(3);
    expect(gradeFromPercent(40)).toBe(3);
    expect(gradeFromPercent(39.9)).toBe(2);
    expect(gradeFromPercent(0)).toBe(2);
  });

  it("уважает пользовательские пороги", () => {
    const custom = rules({ thresholds: { three: 50, four: 70, five: 90 } });
    expect(gradeFromPercent(70, custom.thresholds)).toBe(4);
    expect(gradeFromPercent(69, custom.thresholds)).toBe(3);
  });
});

describe("gradeFromGroupPercent", () => {
  it("сводит группу → процент → оценку", () => {
    expect(gradeFromGroupPercent(group(17, 20, 1), rules())).toBe(5);
    expect(gradeFromGroupPercent(group(0, 0, 0), rules())).toBeNull();
  });
});

describe("quarterPercent — ключевая ренормализация весов", () => {
  it("без SAT вес перераспределяется, а не «съедает» половину", () => {
    // 18/20 = 90%; веса 50/50, но SAT нет → должно быть ровно 90, не 45.
    const value = quarterPercent({ sas: group(18, 20, 1), sat: null }, rules());
    expect(value).toBe(90);
  });

  it("с двумя компонентами считает взвешенную сумму", () => {
    // SAS 90% (вес 50) + SAT 50% (вес 50) = 70%.
    const value = quarterPercent(
      { sas: group(18, 20, 1), sat: group(10, 20, 1) },
      rules(),
    );
    expect(value).toBe(70);
  });

  it("нулевой вес формативки игнорируется (не влияет на итог)", () => {
    // formativeWeight = 0 по умолчанию → присутствие формативки ничего не меняет.
    const withFormative = quarterPercent(
      { sas: group(18, 20, 1), sat: group(10, 20, 1), formative: group(1, 10, 1) },
      rules(),
    );
    expect(withFormative).toBe(70);
  });

  it("формативка учитывается, если у неё есть вес", () => {
    // веса 40 / 40 / 20: SAS 90%, SAT 50%, FORMATIVE 100% → 0.4*90+0.4*50+0.2*100 = 76.
    const value = quarterPercent(
      { sas: group(18, 20, 1), sat: group(10, 20, 1), formative: group(10, 10, 1) },
      rules({ weights: { sas: 40, sat: 40, formative: 20 } }),
    );
    expect(value).toBe(76);
  });

  it("без данных — null", () => {
    expect(quarterPercent({}, rules())).toBeNull();
    expect(quarterPercent({ sas: group(0, 0, 0) }, rules())).toBeNull();
  });
});

describe("quarterGrade", () => {
  it("округляет процент и переводит в оценку", () => {
    expect(quarterGrade({ sas: group(18, 20, 1), sat: null }, rules())).toBe(5);
    expect(quarterGrade({ sas: group(13, 20, 1), sat: null }, rules())).toBe(4); // 65%
    expect(quarterGrade({}, rules())).toBeNull();
  });
});

describe("effectiveQuarterGrade — принятое предложение подменяет итог", () => {
  it("без предложения оставляет формульный итог", () => {
    expect(effectiveQuarterGrade(4, null)).toBe(4);
    expect(effectiveQuarterGrade(null, undefined)).toBeNull();
  });

  it("ACCEPTED напрямую подменяет итог (в т.ч. когда формулы нет)", () => {
    expect(effectiveQuarterGrade(3, { value: 5, status: "ACCEPTED" })).toBe(5);
    expect(effectiveQuarterGrade(null, { value: 4, status: "ACCEPTED" })).toBe(4);
  });

  it("PENDING и REJECTED на итог не влияют", () => {
    expect(effectiveQuarterGrade(4, { value: 5, status: "PENDING" })).toBe(4);
    expect(effectiveQuarterGrade(4, { value: 2, status: "REJECTED" })).toBe(4);
  });

  it("некорректное значение (вне 2–5) игнорируется — остаётся формула", () => {
    expect(effectiveQuarterGrade(4, { value: 7, status: "ACCEPTED" })).toBe(4);
    expect(effectiveQuarterGrade(4, { value: 1, status: "ACCEPTED" })).toBe(4);
  });
});

describe("requiredScoreForTarget / simulateQuarter — симулятор цели", () => {
  const empty = (): SubjectGroups => ({
    sas: { sumScore: 0, sumMax: 0, count: 0 },
    sat: { sumScore: 0, sumMax: 0, count: 0 },
    formative: { sumScore: 0, sumMax: 0, count: 0 },
  });

  it("считает минимальный балл СОЧ под цель (SAS 17/20 = 85%, веса 50/50)", () => {
    const groups = { ...empty(), sas: group(17, 20, 1) };
    expect(requiredScoreForTarget(groups, { key: "sat", maxScore: 30 }, 5, rules())).toBe(26);
    expect(requiredScoreForTarget(groups, { key: "sat", maxScore: 30 }, 4, rules())).toBe(14);
    expect(requiredScoreForTarget(groups, { key: "sat", maxScore: 30 }, 3, rules())).toBe(0);
  });

  it("возвращает null, когда цель недостижима даже при максимуме", () => {
    const groups = { ...empty(), sas: group(0, 20, 1) }; // SAS = 0%
    expect(requiredScoreForTarget(groups, { key: "sat", maxScore: 30 }, 5, rules())).toBeNull();
  });

  it("simulateQuarter повторяет официальную формулу (SAS 13/20 + СОЧ 30/30)", () => {
    const groups = { ...empty(), sas: group(13, 20, 1) };
    expect(simulateQuarter(groups, { key: "sat", maxScore: 30 }, 30, rules())).toEqual({
      percent: 82.5,
      grade: 4,
    });
  });

  it("ученик без оценок: всё решает предстоящая работа", () => {
    expect(simulateQuarter(empty(), { key: "sat", maxScore: 30 }, 30, rules())).toEqual({
      percent: 100,
      grade: 5,
    });
    expect(requiredScoreForTarget(empty(), { key: "sat", maxScore: 30 }, 5, rules())).toBe(26);
  });
});

describe("semesterPercent / yearPercent", () => {
  it("усредняет только состоявшиеся четверти", () => {
    expect(semesterPercent([50, 70])).toBe(60);
    expect(semesterPercent([null, 80])).toBe(80);
    expect(semesterPercent([null, null])).toBeNull();
  });

  it("год = среднее полугодий", () => {
    expect(yearPercent([60, 80])).toBe(70);
    expect(yearPercent([null, null])).toBeNull();
  });
});

describe("gradeFromValue", () => {
  it("произвольный процент → оценка", () => {
    expect(gradeFromValue(70, rules())).toBe(4);
    expect(gradeFromValue(90, rules())).toBe(5);
    expect(gradeFromValue(null, rules())).toBeNull();
  });
});

describe("активность и валидация", () => {
  it("averageActivity", () => {
    expect(averageActivity([])).toBeNull();
    expect(averageActivity([6, 8])).toBe(7);
  });

  it("isActivityInRange — только целые 1..10", () => {
    expect(isActivityInRange(1)).toBe(true);
    expect(isActivityInRange(10)).toBe(true);
    expect(isActivityInRange(0)).toBe(false);
    expect(isActivityInRange(11)).toBe(false);
    expect(isActivityInRange(3.5)).toBe(false);
  });

  it("isGradeInRange — только целые 2..5", () => {
    expect(isGradeInRange(2)).toBe(true);
    expect(isGradeInRange(5)).toBe(true);
    expect(isGradeInRange(1)).toBe(false);
    expect(isGradeInRange(6)).toBe(false);
    expect(isGradeInRange(4.5)).toBe(false);
  });

  it("isScoreValid — балл в пределах максимума", () => {
    expect(isScoreValid(0, 20)).toBe(true);
    expect(isScoreValid(20, 20)).toBe(true);
    expect(isScoreValid(21, 20)).toBe(false);
    expect(isScoreValid(-1, 20)).toBe(false);
    expect(isScoreValid(5, 0)).toBe(false);
    expect(isScoreValid(Number.NaN, 20)).toBe(false);
    expect(isScoreValid(Number.POSITIVE_INFINITY, 20)).toBe(false);
  });
});

describe("behaviorBalance", () => {
  it("суммирует модули баллов по знаку и считает баланс", () => {
    const balance = behaviorBalance([
      { kind: "POSITIVE", points: 3 },
      { kind: "NEGATIVE", points: 2 },
      { kind: "NEUTRAL", points: 5 },
    ]);
    expect(balance).toEqual({ positive: 3, negative: 2, net: 1, count: 3 });
  });

  it("берёт модуль (знак хранится в kind, а не в числе)", () => {
    const balance = behaviorBalance([{ kind: "NEGATIVE", points: -4 }]);
    expect(balance.negative).toBe(4);
    expect(balance.net).toBe(-4);
  });

  it("пустой список даёт нулевой баланс", () => {
    expect(behaviorBalance([])).toEqual({ positive: 0, negative: 0, net: 0, count: 0 });
  });
});

describe("formatSigned", () => {
  it("плюс, минус и ноль", () => {
    expect(formatSigned(5)).toBe("+5");
    expect(formatSigned(-3)).toBe("-3");
    expect(formatSigned(0)).toBe("0");
  });
});
