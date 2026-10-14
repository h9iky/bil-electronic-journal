"use client";

/**
 * Реестр ячеек журнала: по нему работает клавиатурная навигация и вставка
 * колонки из буфера. Ячейки сами себя регистрируют, провайдер их не знает.
 */

import { createContext, useCallback, useContext, useMemo, useRef, type ReactNode } from "react";

export interface GradeGridCellApi {
  /** Поставить фокус на ячейку (и выделить содержимое). */
  focus: () => void;
  /** Записать значение без ручного ввода (используется при вставке). */
  apply: (value: number | null) => void;
}

interface GradeGridContextValue {
  register: (key: string, api: GradeGridCellApi | null) => void;
  /** Вернёт `true`, если такая ячейка есть и фокус переведён. */
  focusCell: (key: string) => boolean;
  applyCell: (key: string, value: number | null) => void;
}

/** Ключ ячейки: `"строка:колонка"`. */
export const cellKey = (row: number, col: number): string => `${row}:${col}`;

const GradeGridContext = createContext<GradeGridContextValue | null>(null);

export function useGradeGrid(): GradeGridContextValue {
  const context = useContext(GradeGridContext);
  if (!context) throw new Error("useGradeGrid must be used within <GradeGridProvider>");
  return context;
}

export function GradeGridProvider({ children }: { children: ReactNode }) {
  const cells = useRef(new Map<string, GradeGridCellApi>());

  const register = useCallback((key: string, api: GradeGridCellApi | null) => {
    if (api) cells.current.set(key, api);
    else cells.current.delete(key);
  }, []);

  const focusCell = useCallback((key: string) => {
    const cell = cells.current.get(key);
    if (!cell) return false;
    cell.focus();
    return true;
  }, []);

  const applyCell = useCallback((key: string, value: number | null) => {
    cells.current.get(key)?.apply(value);
  }, []);

  const value = useMemo(
    () => ({ register, focusCell, applyCell }),
    [register, focusCell, applyCell],
  );

  return <GradeGridContext.Provider value={value}>{children}</GradeGridContext.Provider>;
}
