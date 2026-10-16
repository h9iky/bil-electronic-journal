"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { BookOpenCheck, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { deleteHomework, saveHomework } from "@/lib/actions/journal";

interface HomeworkItem {
  id: string;
  title: string;
  description: string | null;
  dueDate: Date | null;
  editable: boolean;
}

interface HomeworkBoardProps {
  teachingId: string;
  quarter: number;
  /** День урока в формате `yyyy-mm-dd` (общий с посещаемостью). */
  date: string;
  items: HomeworkItem[];
}

const DATE_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const formatDate = (value: Date): string => new Date(value).toLocaleDateString();

/**
 * Домашние задания на учебный день (класс × предмет).
 *
 * День живёт в URL (`?date=`) — как у посещаемости, поэтому «урок» у обоих
 * разделов один. Удаление оптимистично: строку прячем сразу и откатываем,
 * если экшен вернул ошибку.
 */
export function HomeworkBoard({ teachingId, quarter, date, items }: HomeworkBoardProps) {
  const t = useTranslations("homework");
  const tJournal = useTranslations("journal");
  const { toast } = useToast();
  const router = useRouter();

  const [pending, startTransition] = useTransition();
  const [day, setDay] = useState(date);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [removed, setRemoved] = useState<Set<string>>(new Set());

  const visible = items.filter((item) => !removed.has(item.id));

  function changeDay(next: string) {
    setDay(next);
    router.push({
      pathname: "/dashboard/journal",
      query: { teaching: teachingId, quarter, date: next },
    });
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveHomework({
        teachingId,
        date: day,
        title,
        description,
        dueDate: dueDate || null,
      });
      if (result.ok) {
        setTitle("");
        setDescription("");
        setDueDate("");
        toast(t("saved"));
      } else {
        toast(tJournal(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  function remove(id: string) {
    setRemoved((current) => new Set(current).add(id));
    startTransition(async () => {
      const result = await deleteHomework({ homeworkId: id });
      if (result.ok) {
        toast(t("deleted"));
      } else {
        setRemoved((current) => {
          const next = new Set(current);
          next.delete(id);
          return next;
        });
        toast(tJournal(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <BookOpenCheck className="h-4 w-4 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription className="text-xs">{t("desc")}</CardDescription>
          </div>
          <input
            type="date"
            value={day}
            onChange={(event) => changeDay(event.target.value)}
            className={DATE_CLASS}
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <form
          onSubmit={submit}
          className="flex flex-col gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3"
        >
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex min-w-48 flex-1 flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {t("titleLabel")}
              </span>
              <Input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t("titlePlaceholder")}
                required
                maxLength={200}
              />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {t("dueLabel")}
              </span>
              <input
                type="date"
                value={dueDate}
                min={day}
                onChange={(event) => setDueDate(event.target.value)}
                className={DATE_CLASS}
              />
            </label>
            <Button type="submit" disabled={pending} className="gap-1.5 cursor-pointer">
              <Plus className="h-4 w-4" />
              {t("add")}
            </Button>
          </div>

          <label className="flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase text-muted-foreground">
              {t("descLabel")}
            </span>
            <Textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder={t("descPlaceholder")}
              maxLength={2000}
              rows={2}
            />
          </label>
        </form>

        {visible.length === 0 ? (
          <p className="py-2 text-center text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ul className="space-y-2">
            {visible.map((item) => (
              <li
                key={item.id}
                className="flex items-start justify-between gap-3 rounded-xl border border-border/60 bg-card p-3"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{item.title}</div>
                  {item.description && (
                    <p className="text-xs text-muted-foreground whitespace-pre-line">
                      {item.description}
                    </p>
                  )}
                  {item.dueDate && (
                    <span className="inline-block rounded-full border border-amber-500/40 bg-amber-500/5 px-2 py-0.5 text-[11px] font-medium text-amber-700 dark:text-amber-400">
                      {t("due", { date: formatDate(item.dueDate) })}
                    </span>
                  )}
                </div>
                {item.editable && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => remove(item.id)}
                    title={t("delete")}
                    aria-label={t("delete")}
                    className="shrink-0 rounded-lg p-1.5 text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive disabled:opacity-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
