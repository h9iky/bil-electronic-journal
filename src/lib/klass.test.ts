import { describe, expect, it } from "vitest";
import {
  CLASS_GRADES,
  CLASS_LETTERS,
  academicYear,
  buildClassName,
  compareClasses,
  isClassGrade,
  isClassLetter,
  isValidAcademicYear,
  parseClassName,
  validateClass,
} from "./klass";

describe("buildClassName / parseClassName", () => {
  it("собирает имя из номера и буквы", () => {
    expect(buildClassName(10, "A")).toBe("10A");
    expect(buildClassName(7, "E")).toBe("7E");
  });

  it("разбирает валидные имена", () => {
    expect(parseClassName("10A")).toEqual({ grade: 10, letter: "A" });
    expect(parseClassName("11E")).toEqual({ grade: 11, letter: "E" });
  });

  it("не принимает мусор, нижний регистр и кириллицу", () => {
    expect(parseClassName("10a")).toBeNull();
    expect(parseClassName("10А")).toBeNull(); // кириллическая А
    expect(parseClassName("6A")).toBeNull();
    expect(parseClassName("12B")).toBeNull();
    expect(parseClassName("10F")).toBeNull();
    expect(parseClassName("A10")).toBeNull();
    expect(parseClassName("10 A")).toBeNull();
    expect(parseClassName("")).toBeNull();
  });
});

describe("isClassGrade / isClassLetter", () => {
  it("знает допустимые номера", () => {
    for (const grade of CLASS_GRADES) expect(isClassGrade(grade)).toBe(true);
    expect(isClassGrade(6)).toBe(false);
    expect(isClassGrade(12)).toBe(false);
    expect(isClassGrade("10")).toBe(false);
    expect(isClassGrade(10.5)).toBe(false);
  });

  it("знает допустимые буквы", () => {
    for (const letter of CLASS_LETTERS) expect(isClassLetter(letter)).toBe(true);
    expect(isClassLetter("F")).toBe(false);
    expect(isClassLetter("А")).toBe(false); // кириллическая
    expect(isClassLetter("a")).toBe(false);
    expect(isClassLetter(1)).toBe(false);
  });
});

describe("academicYear", () => {
  it("сентябрь открывает новый учебный год", () => {
    expect(academicYear(new Date(2026, 8, 1))).toBe("2026/2027");
    expect(academicYear(new Date(2026, 9, 21))).toBe("2026/2027");
  });

  it("январь–август относятся к прошлому сентябрю", () => {
    expect(academicYear(new Date(2027, 0, 15))).toBe("2026/2027");
    expect(academicYear(new Date(2027, 7, 31))).toBe("2026/2027");
  });
});

describe("compareClasses", () => {
  it("сортирует по году, номеру и букве — как человек, а не как строка", () => {
    const rows = [
      { name: "10B", year: "2026/2027" },
      { name: "7A", year: "2026/2027" },
      { name: "11A", year: "2025/2026" },
      { name: "10A", year: "2026/2027" },
    ];

    expect([...rows].sort(compareClasses).map((row) => `${row.name} ${row.year}`)).toEqual([
      "7A 2026/2027",
      "10A 2026/2027",
      "10B 2026/2027",
      "11A 2025/2026",
    ]);
  });

  it("не падает на нестандартном имени и держит его в конце", () => {
    const rows = [
      { name: "10Z", year: "2026/2027" },
      { name: "7A", year: "2026/2027" },
    ];

    expect([...rows].sort(compareClasses).map((row) => row.name)).toEqual(["7A", "10Z"]);
  });
});

describe("isValidAcademicYear", () => {
  it("принимает только последовательные годы", () => {
    expect(isValidAcademicYear("2026/2027")).toBe(true);
    expect(isValidAcademicYear("2026/2028")).toBe(false);
    expect(isValidAcademicYear("2026-2027")).toBe(false);
    expect(isValidAcademicYear("26/27")).toBe(false);
    expect(isValidAcademicYear("1999/2000")).toBe(false);
    expect(isValidAcademicYear("2026/2027 ")).toBe(false);
    expect(isValidAcademicYear(2026)).toBe(false);
  });
});

describe("validateClass", () => {
  it("принимает корректный черновик и собирает имя", () => {
    expect(validateClass({ grade: 10, letter: "B", year: " 2026/2027 " })).toEqual({
      ok: true,
      value: { grade: 10, letter: "B", year: "2026/2027", name: "10B" },
    });
  });

  it("отклоняет битые поля по одному коду за раз", () => {
    expect(validateClass({ grade: 6, letter: "A", year: "2026/2027" })).toEqual({
      ok: false,
      error: "invalid_grade",
    });
    expect(validateClass({ grade: 10, letter: "F", year: "2026/2027" })).toEqual({
      ok: false,
      error: "invalid_letter",
    });
    expect(validateClass({ grade: 10, letter: "A", year: "2026/2028" })).toEqual({
      ok: false,
      error: "invalid_year",
    });
    expect(validateClass({ grade: 10, letter: "A", year: null })).toEqual({
      ok: false,
      error: "invalid_year",
    });
  });
});
