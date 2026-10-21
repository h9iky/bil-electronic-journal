import { describe, expect, it } from "vitest";
import {
  PASSWORD_MIN,
  normalizeEmail,
  normalizeFullName,
  validateRegistration,
} from "./registration";

const base = {
  fullName: "Арман Қайрат",
  email: "arman@bil.edu.kz",
  password: "bilgrade-2026",
  role: "STUDENT",
  classId: "class-1",
};

describe("normalizeEmail / normalizeFullName", () => {
  it("чистит email и приводит к нижнему регистру", () => {
    expect(normalizeEmail("  Ivan@BIL.kz ")).toBe("ivan@bil.kz");
    expect(normalizeEmail(null)).toBe("");
  });

  it("схлопывает пробелы в имени", () => {
    expect(normalizeFullName("  Асан   Асанов  ")).toBe("Асан Асанов");
  });
});

describe("validateRegistration", () => {
  it("принимает корректного ученика и нормализует поля", () => {
    expect(
      validateRegistration({ ...base, fullName: "  Арман   Қайрат ", email: " Arman@BIL.kz " }),
    ).toEqual({
      ok: true,
      value: {
        fullName: "Арман Қайрат",
        email: "arman@bil.kz",
        password: "bilgrade-2026",
        role: "STUDENT",
        classId: "class-1",
      },
    });
  });

  it("принимает учителя без класса и игнорирует присланный classId", () => {
    const check = validateRegistration({ ...base, role: "TEACHER", classId: "class-1" });

    expect(check.ok).toBe(true);
    if (check.ok) expect(check.value.classId).toBeNull();
  });

  it("не даёт зарегистрироваться админом", () => {
    expect(validateRegistration({ ...base, role: "ADMIN" })).toEqual({
      ok: false,
      error: "invalid_role",
    });
  });

  it("проверяет имя", () => {
    expect(validateRegistration({ ...base, fullName: "А" })).toEqual({
      ok: false,
      error: "invalid_name",
    });
    expect(validateRegistration({ ...base, fullName: "x".repeat(81) })).toEqual({
      ok: false,
      error: "invalid_name",
    });
  });

  it("проверяет email", () => {
    for (const email of ["", "ivan", "ivan@", "ivan@bil", "@bil.kz", "ivan bil@kz", "a@b.c"]) {
      expect(validateRegistration({ ...base, email })).toEqual({
        ok: false,
        error: "invalid_email",
      });
    }
  });

  it("проверяет длину пароля", () => {
    expect(validateRegistration({ ...base, password: "x".repeat(PASSWORD_MIN - 1) })).toEqual({
      ok: false,
      error: "invalid_password",
    });
    expect(validateRegistration({ ...base, password: "x".repeat(201) })).toEqual({
      ok: false,
      error: "invalid_password",
    });
    expect(validateRegistration({ ...base, password: "x".repeat(PASSWORD_MIN) }).ok).toBe(true);
  });

  it("ученику нужен класс", () => {
    for (const classId of [undefined, null, "", "   "]) {
      expect(validateRegistration({ ...base, classId })).toEqual({
        ok: false,
        error: "class_required",
      });
    }
  });
});
