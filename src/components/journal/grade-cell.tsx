"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useTransition,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { Input } from "@/components/ui/input";
import { saveGrade } from "@/lib/actions/journal";
import { cellKey, useGradeGrid } from "./grade-grid";

interface GradeCellProps {
  assessmentId: string;
  studentId: string;
  maxScore: number;
  initialScore: number | null;
  /** Позиция в сетке — для клавиатурной навигации и вставки. */
  rowIndex: number;
  colIndex: number;
}

/** Значение из буфера: число, `null` (пусто → очистить) или `undefined` (мусор → пропустить). */
function parsePasted(raw: string): number | null | undefined {
  const trimmed = raw.trim();
  if (trimmed === "") return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : undefined;
}

/**
 * Инлайн-редактор балла.
 *
 * Сохранение — на blur или Enter. Навигация как в таблице: Enter/↓ вниз, ↑ вверх,
 * ← / → по краям строки. Вставка колонки из буфера раскладывает значения по сетке.
 * Оптимистики нет намеренно — после `refresh()` серверная матрица перерисуется сама.
 */
export function GradeCell({
  assessmentId,
  studentId,
  maxScore,
  initialScore,
  rowIndex,
  colIndex,
}: GradeCellProps) {
  const grid = useGradeGrid();
  const inputRef = useRef<HTMLInputElement>(null);
  const [value, setValue] = useState(initialScore == null ? "" : String(initialScore));
  const [invalid, setInvalid] = useState(false);
  const [pending, startTransition] = useTransition();
  // Последнее сохранённое (или уже отправленное) значение. Обновляем синхронно
  // до `await`, чтобы повторный blur не породил дубль-запрос; откатываем при ошибке.
  const committed = useRef<number | null>(initialScore);

  const commit = useCallback(
    (parsed: number | null) => {
      if (parsed != null && (!Number.isFinite(parsed) || parsed < 0 || parsed > maxScore)) {
        setInvalid(true);
        return;
      }
      setInvalid(false);
      if (parsed === committed.current) return;

      const previous = committed.current;
      committed.current = parsed;
      startTransition(async () => {
        const result = await saveGrade({ assessmentId, studentId, score: parsed });
        if (result.ok) return;
        committed.current = previous;
        setInvalid(true);
      });
    },
    [assessmentId, studentId, maxScore],
  );

  // Регистрируем ячейку в сетке — по ней ходит навигация и раскладывается вставка.
  useEffect(() => {
    const key = cellKey(rowIndex, colIndex);
    grid.register(key, {
      focus: () => {
        inputRef.current?.focus();
        inputRef.current?.select();
      },
      apply: (next) => {
        setValue(next == null ? "" : String(next));
        commit(next);
      },
    });
    return () => grid.register(key, null);
  }, [grid, rowIndex, colIndex, commit]);

  function submit() {
    const trimmed = value.trim();
    commit(trimmed === "" ? null : Number(trimmed));
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    const input = event.currentTarget;

    /** Уйти на соседнюю ячейку; если её нет — сохранить текущую. */
    const go = (row: number, col: number) => {
      if (!grid.focusCell(cellKey(row, col))) input.blur();
    };

    if (event.key === "Enter") {
      event.preventDefault();
      go(rowIndex + (event.shiftKey ? -1 : 1), colIndex);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      go(rowIndex + 1, colIndex);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      go(rowIndex - 1, colIndex);
      return;
    }
    // По горизонтали уходим только с края текста, чтобы не мешать правке.
    if (
      event.key === "ArrowRight" &&
      input.selectionStart === input.value.length &&
      input.selectionStart === input.selectionEnd
    ) {
      event.preventDefault();
      grid.focusCell(cellKey(rowIndex, colIndex + 1));
      return;
    }
    if (
      event.key === "ArrowLeft" &&
      input.selectionStart === 0 &&
      input.selectionStart === input.selectionEnd
    ) {
      event.preventDefault();
      grid.focusCell(cellKey(rowIndex, colIndex - 1));
      return;
    }
    if (event.key === "Escape") {
      setValue(committed.current == null ? "" : String(committed.current));
      setInvalid(false);
      input.blur();
    }
  }

  function onPaste(event: ClipboardEvent<HTMLInputElement>) {
    const text = event.clipboardData.getData("text");
    if (!text) return;

    const lines = text.replace(/\r?\n$/, "").split(/\r?\n/);
    const matrix = lines.map((line) => line.split("\t"));
    const isMulti = matrix.length > 1 || matrix[0].length > 1;
    if (!isMulti) return; // одиночное значение — пусть вставится как обычно

    event.preventDefault();
    matrix.forEach((columns, rowOffset) => {
      columns.forEach((raw, colOffset) => {
        const parsed = parsePasted(raw);
        if (parsed === undefined) return;
        grid.applyCell(cellKey(rowIndex + rowOffset, colIndex + colOffset), parsed);
      });
    });
  }

  return (
    <Input
      ref={inputRef}
      inputMode="decimal"
      value={value}
      placeholder="—"
      aria-invalid={invalid}
      disabled={pending}
      onChange={(event) => setValue(event.target.value)}
      onBlur={submit}
      onKeyDown={onKeyDown}
      onPaste={onPaste}
      className={`h-8 w-16 text-center font-mono text-sm ${pending ? "opacity-50" : ""}`}
    />
  );
}
