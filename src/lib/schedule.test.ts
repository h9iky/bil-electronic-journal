import { describe, expect, it } from "vitest";
import { isLessonNumber, isSchoolDay, isoDayOfWeek } from "./schedule";

describe("isoDayOfWeek", () => {
  it("переводит даты в 1=Пн..7=Вс", () => {
    expect(isoDayOfWeek("2026-10-19")).toBe(1); // понедельник
    expect(isoDayOfWeek("2026-10-23")).toBe(5); // пятница
    expect(isoDayOfWeek("2026-10-24")).toBe(6); // суббота
    expect(isoDayOfWeek("2026-10-25")).toBe(7); // воскресенье
  });

  it("битую дату не пропускает", () => {
    expect(isoDayOfWeek("19.10.2026")).toBeNull();
    expect(isoDayOfWeek("")).toBeNull();
    expect(isoDayOfWeek("2026-13-01")).toBeNull();
  });
});

describe("валидаторы сетки", () => {
  it("день недели: 1..5", () => {
    expect(isSchoolDay(1)).toBe(true);
    expect(isSchoolDay(5)).toBe(true);
    expect(isSchoolDay(0)).toBe(false);
    expect(isSchoolDay(6)).toBe(false);
    expect(isSchoolDay(2.5)).toBe(false);
  });

  it("номер урока: 1..7", () => {
    expect(isLessonNumber(1)).toBe(true);
    expect(isLessonNumber(7)).toBe(true);
    expect(isLessonNumber(0)).toBe(false);
    expect(isLessonNumber(8)).toBe(false);
  });
});
