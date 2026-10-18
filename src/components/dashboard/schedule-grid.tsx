"use client";

/**
 * Сетка расписания класса (админ): дни по столбцам, уроки по строкам.
 *
 * Каждая клетка — select с предметами класса (из `Teaching`); смена
 * сохраняется сразу server action'ом, ошибка откатывает значение
 * и показывает тост. Пустое значение = урока нет (строку удаляем).
 */

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/toast";
import { saveScheduleSlot } from "@/lib/actions/schedule";
import { MAX_LESSONS, SCHOOL_DAYS, type ScheduleSlotRow } from "@/lib/schedule";

interface ScheduleGridProps {
  classId: string;
  subjects: { id: string; name: string }[];
  slots: ScheduleSlotRow[];
}

/** Значение «урока нет» в select. */
const EMPTY = "";

const keyOf = (day: number, lesson: number) => `${day}-${lesson}`;

export function ScheduleGrid({ classId, subjects, slots }: ScheduleGridProps) {
  const t = useTranslations("schedule");
  const { toast } = useToast();
  const [, startTransition] = useTransition();

  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      slots.map((slot) => [keyOf(slot.dayOfWeek, slot.lessonNumber), slot.subjectId]),
    ),
  );
  const [saving, setSaving] = useState<string[]>([]);

  const days = Array.from({ length: SCHOOL_DAYS }, (_, index) => index + 1);
  const lessons = Array.from({ length: MAX_LESSONS }, (_, index) => index + 1);

  function change(day: number, lesson: number, subjectId: string) {
    const key = keyOf(day, lesson);
    const previous = values[key] ?? EMPTY;
    if (subjectId === previous) return;

    setValues((current) => ({ ...current, [key]: subjectId }));
    setSaving((keys) => [...keys, key]);

    startTransition(async () => {
      const result = await saveScheduleSlot({
        classId,
        dayOfWeek: day,
        lessonNumber: lesson,
        subjectId: subjectId === EMPTY ? null : subjectId,
      });
      setSaving((keys) => keys.filter((item) => item !== key));

      if (result.ok) {
        toast(subjectId === EMPTY ? t("cleared") : t("saved"));
      } else {
        setValues((current) => ({ ...current, [key]: previous }));
        toast(t(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/60">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
            <th className="w-14 px-3 py-2.5 text-left">{t("lesson")}</th>
            {days.map((day) => (
              <th key={day} className="px-2 py-2.5 text-left">
                {t(`day${day}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/60">
          {lessons.map((lesson) => (
            <tr key={lesson} className="hover:bg-muted/10">
              <td className="px-3 py-1.5 text-xs font-semibold text-muted-foreground">
                {lesson}
              </td>
              {days.map((day) => {
                const key = keyOf(day, lesson);
                const value = values[key] ?? EMPTY;
                const isSaving = saving.includes(key);
                return (
                  <td key={day} className="px-2 py-1.5">
                    <select
                      value={value}
                      disabled={isSaving}
                      onChange={(event) => change(day, lesson, event.target.value)}
                      className={`h-9 w-full min-w-28 rounded-md border border-input bg-background px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                        value === EMPTY ? "text-muted-foreground" : ""
                      } ${isSaving ? "opacity-50" : ""}`}
                    >
                      <option value={EMPTY}>{t("empty")}</option>
                      {subjects.map((subject) => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name}
                        </option>
                      ))}
                    </select>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
