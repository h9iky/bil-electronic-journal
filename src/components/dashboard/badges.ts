import type { AssessmentType } from "@/lib/constants";

/** Цветовая схема бейджа по типу работы (FORMATIVE / SAS / SAT). */
export function assessmentTypeBadgeClass(type: AssessmentType): string {
  switch (type) {
    case "SAT":
      return "border-purple-500/40 text-purple-600 bg-purple-500/5";
    case "SAS":
      return "border-blue-500/40 text-blue-600 bg-blue-500/5";
    case "FORMATIVE":
    default:
      return "border-slate-400/40 text-muted-foreground";
  }
}

const GRADE_STYLES: Record<number, { text: string; badge: string }> = {
  5: {
    text: "text-emerald-600 dark:text-emerald-400",
    badge: "border-emerald-500/40 text-emerald-600 bg-emerald-500/5",
  },
  4: {
    text: "text-blue-600 dark:text-blue-400",
    badge: "border-blue-500/40 text-blue-600 bg-blue-500/5",
  },
  3: {
    text: "text-amber-600 dark:text-amber-400",
    badge: "border-amber-500/40 text-amber-700 bg-amber-500/5",
  },
};

const GRADE_FALLBACK = {
  text: "text-destructive",
  badge: "border-destructive/40 text-destructive bg-destructive/5",
};

/** Цвет текста и бейджа по значению итоговой оценки (2–5). */
export function gradeBadgeClass(value: number): { text: string; badge: string } {
  return GRADE_STYLES[value] ?? GRADE_FALLBACK;
}
