"use client";

/**
 * Недельная сетка личного плана: семь колонок-дней и форма добавления сверху.
 *
 * Каждое действие — server action: пока переход идёт, управление приглушено,
 * обновлённые данные приходят через `refresh()` из экшена (оптимистику не
 * рисуем — действия быстрые, а источник правды один).
 */

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { CheckCircle2, Circle, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { addPlannerTask, deletePlannerTask, togglePlannerTask } from "@/lib/actions/planner";
import type { PlannerTaskRow } from "@/lib/planner";

interface PlannerBoardProps {
  tasks: PlannerTaskRow[];
  subjects: { id: string; name: string }[];
  /** Семь ISO-дней недели, начиная с понедельника. */
  days: string[];
  today: string;
}

const EMPTY = "";

const shortDate = (iso: string) => `${iso.slice(8, 10)}.${iso.slice(5, 7)}`;

export function PlannerBoard({ tasks, subjects, days, today }: PlannerBoardProps) {
  const t = useTranslations("planner");
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  // Форма: день по умолчанию — сегодня, если он в текущей сетке, иначе понедельник.
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(days.includes(today) ? today : days[0]);
  const [time, setTime] = useState("");
  const [subjectId, setSubjectId] = useState(EMPTY);

  const byDay = new Map(days.map((day) => [day, [] as PlannerTaskRow[]]));
  for (const task of tasks) byDay.get(task.date)?.push(task);

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await addPlannerTask({
        date,
        time: time || null,
        title,
        subjectId: subjectId || null,
      });
      if (result.ok) {
        setTitle("");
        setTime("");
        toast(t("added"));
      } else {
        toast(t(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  function toggle(task: PlannerTaskRow) {
    startTransition(async () => {
      const result = await togglePlannerTask({ taskId: task.id });
      if (!result.ok) toast(t(`error.${result.error ?? "unknown"}`), "error");
    });
  }

  function remove(task: PlannerTaskRow) {
    startTransition(async () => {
      const result = await deletePlannerTask({ taskId: task.id });
      if (result.ok) toast(t("deleted"));
      else toast(t(`error.${result.error ?? "unknown"}`), "error");
    });
  }

  return (
    <div className="space-y-6">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">{t("addTitle")}</CardTitle>
          <CardDescription className="text-xs">{t("addHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            onSubmit={submit}
            className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto_auto_auto_auto]"
          >
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder={t("titlePlaceholder")}
              maxLength={200}
              aria-label={t("fieldTitle")}
            />
            <Input
              type="date"
              value={date}
              onChange={(event) => setDate(event.target.value || days[0])}
              aria-label={t("fieldDate")}
              className="lg:w-40"
            />
            <Input
              type="time"
              value={time}
              onChange={(event) => setTime(event.target.value)}
              aria-label={t("fieldTime")}
              className="lg:w-28"
            />
            <select
              value={subjectId}
              onChange={(event) => setSubjectId(event.target.value)}
              aria-label={t("fieldSubject")}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm lg:w-44"
            >
              <option value={EMPTY}>{t("noSubject")}</option>
              {subjects.map((subject) => (
                <option key={subject.id} value={subject.id}>
                  {subject.name}
                </option>
              ))}
            </select>
            <Button type="submit" disabled={pending || !title.trim()}>
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7">
        {days.map((day, index) => {
          const dayTasks = byDay.get(day) ?? [];
          const isToday = day === today;
          return (
            <div
              key={day}
              className={`rounded-xl border p-3 ${
                isToday ? "border-primary/50 bg-primary/5" : "border-border/60 bg-card"
              }`}
            >
              <div className="mb-2 flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                  {t(`day${index + 1}`)}
                </span>
                <span
                  className={`text-[11px] tabular-nums ${
                    isToday ? "font-semibold text-primary" : "text-muted-foreground"
                  }`}
                >
                  {isToday ? t("today") : shortDate(day)}
                </span>
              </div>

              {dayTasks.length === 0 ? (
                <p className="py-3 text-center text-[11px] text-muted-foreground/70">—</p>
              ) : (
                <ul className="space-y-1.5">
                  {dayTasks.map((task) => (
                    <li
                      key={task.id}
                      className="flex items-start gap-1.5 rounded-md border border-border/50 bg-background px-2 py-1.5"
                    >
                      <button
                        type="button"
                        onClick={() => toggle(task)}
                        disabled={pending}
                        title={task.done ? t("toggleUndone") : t("toggleDone")}
                        className="mt-0.5 shrink-0 text-muted-foreground transition hover:text-foreground disabled:opacity-50"
                      >
                        {task.done ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                        ) : (
                          <Circle className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div
                          className={`text-xs leading-snug ${
                            task.done ? "text-muted-foreground line-through" : "text-foreground"
                          }`}
                        >
                          {task.title}
                        </div>
                        {(task.subject || task.time) && (
                          <div className="mt-1 flex flex-wrap items-center gap-1">
                            {task.time && (
                              <span className="rounded bg-muted px-1 py-px text-[10px] font-semibold tabular-nums">
                                {task.time}
                              </span>
                            )}
                            {task.subject && (
                              <span className="rounded bg-primary/10 px-1 py-px text-[10px] font-medium text-primary">
                                {task.subject}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => remove(task)}
                        disabled={pending}
                        title={t("delete")}
                        className="mt-0.5 shrink-0 text-muted-foreground/40 transition hover:text-destructive disabled:opacity-30"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
