"use client";

/**
 * Форма саморегистрации: ученик (обязательно класс) или учитель.
 *
 * Черновик проверяется той же `validateRegistration`, что и server action:
 * кнопка не блокируется на каждый чих, но заведомо битые данные не уходят
 * на сервер, а ошибка объясняется по-человечески.
 */

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { BookOpen, GraduationCap, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { registerUser } from "@/lib/actions/account";
import {
  PASSWORD_MIN,
  SIGNUP_ROLES,
  validateRegistration,
  type SignupRole,
} from "@/lib/registration";

export interface RegisterClassOption {
  id: string;
  name: string;
  year: string;
}

interface RegisterFormProps {
  classes: RegisterClassOption[];
  locale: string;
}

const INPUT_CLASS =
  "w-full rounded-lg border border-border bg-background px-3.5 py-2.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition";

const LABEL_CLASS = "block text-xs font-medium text-foreground mb-1.5";

export function RegisterForm({ classes, locale }: RegisterFormProps) {
  const t = useTranslations("register");
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [role, setRole] = useState<SignupRole>("STUDENT");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [classId, setClassId] = useState(classes[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  const noClassesForStudent = role === "STUDENT" && classes.length === 0;

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const check = validateRegistration({
      fullName,
      email,
      password,
      role,
      classId: role === "STUDENT" ? classId : null,
    });
    if (!check.ok) {
      setError(check.error);
      toast(t(`error.${check.error}`), "error");
      return;
    }
    if (password !== confirm) {
      setError("password_mismatch");
      toast(t("error.password_mismatch"), "error");
      return;
    }

    startTransition(async () => {
      const result = await registerUser({ ...check.value, locale });
      if (!result.ok) {
        const code = result.error ?? "unknown";
        setError(code);
        toast(t(`error.${code}`), "error");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <span className={LABEL_CLASS}>{t("roleLabel")}</span>
        <div className="grid grid-cols-2 gap-2">
          {SIGNUP_ROLES.map((value) => {
            const active = role === value;
            const Icon = value === "STUDENT" ? GraduationCap : BookOpen;
            return (
              <button
                key={value}
                type="button"
                onClick={() => setRole(value)}
                aria-pressed={active}
                className={[
                  "flex items-center justify-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-semibold transition cursor-pointer",
                  active
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border/80 bg-card text-muted-foreground hover:border-primary/40 hover:text-foreground",
                ].join(" ")}
              >
                <Icon className="h-4 w-4" />
                {t(value === "STUDENT" ? "roleStudent" : "roleTeacher")}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="fullName" className={LABEL_CLASS}>
          {t("nameLabel")}
        </label>
        <input
          id="fullName"
          name="fullName"
          type="text"
          required
          autoComplete="name"
          maxLength={80}
          value={fullName}
          onChange={(event) => setFullName(event.target.value)}
          placeholder={t("namePlaceholder")}
          className={INPUT_CLASS}
        />
      </div>

      <div>
        <label htmlFor="registerEmail" className={LABEL_CLASS}>
          {t("emailLabel")}
        </label>
        <input
          id="registerEmail"
          name="email"
          type="email"
          required
          autoComplete="email"
          maxLength={254}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder={t("emailPlaceholder")}
          className={INPUT_CLASS}
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label htmlFor="registerPassword" className={LABEL_CLASS}>
            {t("passwordLabel")}
          </label>
          <input
            id="registerPassword"
            name="password"
            type="password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder={t("passwordPlaceholder")}
            className={INPUT_CLASS}
          />
        </div>
        <div>
          <label htmlFor="registerConfirm" className={LABEL_CLASS}>
            {t("confirmLabel")}
          </label>
          <input
            id="registerConfirm"
            name="confirm"
            type="password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(event) => setConfirm(event.target.value)}
            placeholder={t("confirmPlaceholder")}
            className={INPUT_CLASS}
          />
        </div>
      </div>
      <p className="-mt-2 text-[11px] text-muted-foreground">
        {t("passwordHint", { min: PASSWORD_MIN })}
      </p>

      {role === "STUDENT" && (
        <div>
          <label htmlFor="registerClass" className={LABEL_CLASS}>
            {t("classLabel")}
          </label>
          {classes.length === 0 ? (
            <p className="rounded-lg border border-dashed border-destructive/40 bg-destructive/5 px-3 py-2.5 text-xs font-medium text-destructive">
              {t("noClasses")}
            </p>
          ) : (
            <select
              id="registerClass"
              name="classId"
              required
              value={classId}
              onChange={(event) => setClassId(event.target.value)}
              className={INPUT_CLASS}
            >
              <option value="">{t("classPlaceholder")}</option>
              {classes.map((klass) => (
                <option key={klass.id} value={klass.id}>
                  {klass.name} • {klass.year}
                </option>
              ))}
            </select>
          )}
        </div>
      )}

      {role === "TEACHER" && (
        <p className="rounded-lg border border-border/60 bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          {t("teacherNote")}
        </p>
      )}

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
          {t(`error.${error}`)}
        </div>
      )}

      <Button
        type="submit"
        className="w-full cursor-pointer font-medium"
        disabled={pending || noClassesForStudent}
      >
        <UserPlus className="h-4 w-4" />
        {t("submit")}
      </Button>
    </form>
  );
}
