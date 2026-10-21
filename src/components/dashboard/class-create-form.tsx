"use client";

/**
 * Форма создания класса (админ): номер × буква × учебный год.
 *
 * Имя класса (`10A`) не вводится руками — собирается из двух селектов.
 * Черновик проверяется той же `validateClass`, что и server action.
 */

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { createClass } from "@/lib/actions/classes";
import {
  CLASS_GRADES,
  CLASS_LETTERS,
  isValidAcademicYear,
  validateClass,
} from "@/lib/klass";

interface ClassCreateFormProps {
  /** Учебный год по умолчанию — текущий (считает страница на сервере). */
  defaultYear: string;
}

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";
const LABEL_CLASS = "flex flex-col gap-1";
const LABEL_TEXT_CLASS = "text-xs font-semibold uppercase text-muted-foreground";

export function ClassCreateForm({ defaultYear }: ClassCreateFormProps) {
  const t = useTranslations("classes");
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  const [grade, setGrade] = useState<number>(CLASS_GRADES[0]);
  const [letter, setLetter] = useState<string>("");
  const [year, setYear] = useState(defaultYear);

  const check = validateClass({ grade, letter, year });
  const yearLooksBad = year.trim().length > 0 && !isValidAcademicYear(year.trim());

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!check.ok) {
      toast(t(`error.${check.error}`), "error");
      return;
    }

    startTransition(async () => {
      const result = await createClass({ grade, letter, year });
      if (result.ok) {
        toast(t("created", { name: check.value.name }));
        setLetter(""); // следующая буква — осознанно, а не «случайно та же»
      } else {
        toast(t(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg font-bold">
          <Plus className="h-4 w-4 text-primary" />
          {t("createTitle")}
        </CardTitle>
        <CardDescription>{t("createHint")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("grade")}</span>
              <select
                className={SELECT_CLASS}
                value={grade}
                onChange={(event) => setGrade(Number(event.target.value))}
              >
                {CLASS_GRADES.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>

            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("letter")}</span>
              <select
                className={SELECT_CLASS}
                value={letter}
                onChange={(event) => setLetter(event.target.value)}
              >
                <option value="">—</option>
                {CLASS_LETTERS.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className={LABEL_CLASS}>
            <span className={LABEL_TEXT_CLASS}>{t("year")}</span>
            <input
              className={SELECT_CLASS}
              value={year}
              onChange={(event) => setYear(event.target.value)}
              placeholder={t("yearPlaceholder")}
              inputMode="numeric"
              aria-invalid={yearLooksBad}
            />
            {yearLooksBad && (
              <span className="text-xs font-medium text-destructive">
                {t("error.invalid_year")}
              </span>
            )}
          </label>

          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 px-3 py-2.5">
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("preview")}
            </div>
            <div className="text-lg font-extrabold tracking-tight">
              {check.ok ? check.value.name : "—"}
              {check.ok && (
                <span className="ml-2 align-middle text-xs font-medium text-muted-foreground">
                  {check.value.year}
                </span>
              )}
            </div>
          </div>

          <Button type="submit" className="w-full cursor-pointer" disabled={!check.ok || pending}>
            <Plus className="h-4 w-4" />
            {t("create")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
