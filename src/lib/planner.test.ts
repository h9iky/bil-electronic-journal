import { describe, expect, it } from "vitest";
import { addDaysIso, isValidTime, weekStartIso } from "./planner";

describe("weekStartIso", () => {
  it("находит понедельник недели", () => {
    expect(weekStartIso("2026-10-18")).toBe("2026-10-12"); // воскресенье → пн той же недели
    expect(weekStartIso("2026-10-19")).toBe("2026-10-19"); // понедельник → сам себя
    expect(weekStartIso("2026-10-23")).toBe("2026-10-19"); // пятница
  });

  it("битую дату не пропускает", () => {
    expect(weekStartIso("18.10.2026")).toBeNull();
    expect(weekStartIso("")).toBeNull();
  });
});

describe("addDaysIso", () => {
  it("сдвигает по дням в обе стороны", () => {
    expect(addDaysIso("2026-10-18", 1)).toBe("2026-10-19");
    expect(addDaysIso("2026-10-19", -7)).toBe("2026-10-12");
    expect(addDaysIso("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("битую дату не пропускает", () => {
    expect(addDaysIso("не дата", 1)).toBeNull();
  });
});

describe("isValidTime", () => {
  it("строгий формат HH:MM в 24 часах", () => {
    expect(isValidTime("00:00")).toBe(true);
    expect(isValidTime("18:00")).toBe(true);
    expect(isValidTime("23:59")).toBe(true);
    expect(isValidTime("24:00")).toBe(false);
    expect(isValidTime("9:00")).toBe(false);
    expect(isValidTime("18:60")).toBe(false);
    expect(isValidTime("18.00")).toBe(false);
  });
});
