"use client";

import { useRef, useState, useTransition } from "react";
import { Input } from "@/components/ui/input";
import { saveGrade } from "@/lib/actions/journal";

interface GradeCellProps {
  assessmentId: string;
  studentId: string;
  maxScore: number;
  initialScore: number | null;
}

/**
 * Инлайн-редактор балла: сохраняет на blur или Enter, если значение изменилось.
 * Оптимистики нет намеренно — после `refresh()` серверная матрица перерисуется
 * сама, а локальный стейт не даст «прыгнуть» цифре под руками учителя.
 */
export function GradeCell({
  assessmentId,
  studentId,
  maxScore,
  initialScore,
}: GradeCellProps) {
  const [value, setValue] = useState(initialScore == null ? "" : String(initialScore));
  const [invalid, setInvalid] = useState(false);
  const [pending, startTransition] = useTransition();
  const saved = useRef<number | null>(initialScore);

  function submit() {
    const trimmed = value.trim();
    const parsed = trimmed === "" ? null : Number(trimmed);

    if (parsed != null && (!Number.isFinite(parsed) || parsed < 0 || parsed > maxScore)) {
      setInvalid(true);
      return;
    }
    setInvalid(false);
    if (parsed === saved.current) return;

    startTransition(async () => {
      const result = await saveGrade({ assessmentId, studentId, score: parsed });
      if (result.ok) saved.current = parsed;
      else setInvalid(true);
    });
  }

  return (
    <Input
      inputMode="decimal"
      value={value}
      placeholder="—"
      aria-invalid={invalid}
      disabled={pending}
      onChange={(event) => setValue(event.target.value)}
      onBlur={submit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
        if (event.key === "Escape") {
          setValue(saved.current == null ? "" : String(saved.current));
          setInvalid(false);
          event.currentTarget.blur();
        }
      }}
      className={`h-8 w-16 text-center font-mono text-sm ${pending ? "opacity-50" : ""}`}
    />
  );
}
