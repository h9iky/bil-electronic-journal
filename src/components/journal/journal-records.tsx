"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, HeartHandshake, Pencil, Sparkles, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  deleteActivity,
  deleteBehavior,
  updateActivity,
  updateBehavior,
} from "@/lib/actions/journal";
import {
  ACTIVITY_MAX,
  ACTIVITY_MIN,
  BEHAVIOR_KINDS,
  type BehaviorKind,
} from "@/lib/constants";
import { formatSigned } from "@/lib/grading";
import type { JournalActivityRecord, JournalBehaviorRecord } from "@/lib/queries";

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const DATE_FORMAT = new Intl.DateTimeFormat(undefined, { day: "2-digit", month: "2-digit" });

interface JournalRecordsProps {
  activities: JournalActivityRecord[];
  behaviors: JournalBehaviorRecord[];
}

/**
 * Панель последних записей активности и поведения с правкой и удалением.
 * Редактировать/удалять можно только записи, автором которых является учитель
 * (проверяется и тут, и на сервере).
 */
export function JournalRecords({ activities, behaviors }: JournalRecordsProps) {
  const t = useTranslations("journal");

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <CardTitle className="text-base font-bold">{t("records")}</CardTitle>
        <CardDescription className="text-xs">{t("recordsDesc")}</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-6 lg:grid-cols-2">
        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("activity")}
          </h3>
          {activities.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">{t("noRecords")}</p>
          ) : (
            <ul className="space-y-1.5">
              {activities.map((record) => (
                <ActivityRow key={record.id} record={record} />
              ))}
            </ul>
          )}
        </section>

        <section className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            {t("behavior")}
          </h3>
          {behaviors.length === 0 ? (
            <p className="py-2 text-xs text-muted-foreground">{t("noRecords")}</p>
          ) : (
            <ul className="space-y-1.5">
              {behaviors.map((record) => (
                <BehaviorRow key={record.id} record={record} />
              ))}
            </ul>
          )}
        </section>
      </CardContent>
    </Card>
  );
}

function ActivityRow({ record }: { record: JournalActivityRecord }) {
  const t = useTranslations("journal");

  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(String(record.value));
  const [comment, setComment] = useState(record.comment ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setValue(String(record.value));
    setComment(record.comment ?? "");
    setEditing(false);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await updateActivity({
        activityId: record.id,
        value: Number(value),
        comment,
      });
      if (result.ok) {
        setEditing(false);
        setNotice(t("saved"));
      } else {
        setNotice(t(`error.${result.error ?? "unknown"}`));
      }
    });
  }

  function remove() {
    if (!window.confirm(t("deleteRecordConfirm"))) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteActivity({ activityId: record.id });
      if (!result.ok) setNotice(t(`error.${result.error ?? "unknown"}`));
    });
  }

  return (
    <li className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-sm">
      {editing ? (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs font-semibold">{record.studentName}</span>
          <Input
            type="number"
            min={ACTIVITY_MIN}
            max={ACTIVITY_MAX}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
            className="h-8 w-16 text-center"
          />
          <Input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={200}
            className="h-8 min-w-32 flex-1"
          />
          <Button type="submit" size="icon-xs" disabled={pending} className="cursor-pointer">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={pending}
            onClick={reset}
            className="cursor-pointer text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{record.studentName}</span>
          <Badge
            variant="outline"
            className="shrink-0 border-primary/40 bg-primary/5 text-[10px] text-primary"
          >
            {t("value")} {record.value}
          </Badge>
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {record.comment || "—"}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {DATE_FORMAT.format(record.date)}
          </span>
          {record.editable && (
            <RecordButtons pending={pending} onEdit={() => setEditing(true)} onRemove={remove} />
          )}
        </div>
      )}
      {notice && <p className="pt-1 text-[10px] text-muted-foreground">{notice}</p>}
    </li>
  );
}

function BehaviorRow({ record }: { record: JournalBehaviorRecord }) {
  const t = useTranslations("journal");
  const tBehavior = useTranslations("behavior");

  const [editing, setEditing] = useState(false);
  const [kind, setKind] = useState<BehaviorKind>(record.kind);
  const [points, setPoints] = useState(String(record.points));
  const [comment, setComment] = useState(record.comment ?? "");
  const [notice, setNotice] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const signed = record.kind === "NEGATIVE" ? -record.points : record.points;

  function reset() {
    setKind(record.kind);
    setPoints(String(record.points));
    setComment(record.comment ?? "");
    setEditing(false);
  }

  function save(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await updateBehavior({
        behaviorId: record.id,
        kind,
        points: Number(points),
        comment,
      });
      if (result.ok) {
        setEditing(false);
        setNotice(t("saved"));
      } else {
        setNotice(t(`error.${result.error ?? "unknown"}`));
      }
    });
  }

  function remove() {
    if (!window.confirm(t("deleteRecordConfirm"))) return;
    setNotice(null);
    startTransition(async () => {
      const result = await deleteBehavior({ behaviorId: record.id });
      if (!result.ok) setNotice(t(`error.${result.error ?? "unknown"}`));
    });
  }

  return (
    <li className="rounded-lg border border-border/70 bg-card px-3 py-1.5 text-sm">
      {editing ? (
        <form onSubmit={save} className="flex flex-wrap items-center gap-2">
          <span className="w-full text-xs font-semibold">{record.studentName}</span>
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as BehaviorKind)}
            className={SELECT_CLASS}
          >
            {BEHAVIOR_KINDS.map((value) => (
              <option key={value} value={value}>
                {tBehavior(value)}
              </option>
            ))}
          </select>
          <Input
            type="number"
            min={0}
            max={100}
            value={points}
            onChange={(event) => setPoints(event.target.value)}
            required
            className="h-8 w-16 text-center"
          />
          <Input
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            placeholder={t("commentPlaceholder")}
            maxLength={200}
            className="h-8 min-w-32 flex-1"
          />
          <Button type="submit" size="icon-xs" disabled={pending} className="cursor-pointer">
            <Check className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={pending}
            onClick={reset}
            className="cursor-pointer text-muted-foreground"
          >
            <X className="h-3.5 w-3.5" />
          </Button>
        </form>
      ) : (
        <div className="flex items-center gap-2">
          <span className="truncate font-medium">{record.studentName}</span>
          <Badge
            variant="outline"
            className={`shrink-0 text-[10px] ${
              record.kind === "NEGATIVE"
                ? "border-destructive/30 bg-destructive/10 text-destructive"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-600"
            }`}
          >
            {tBehavior(record.kind)}
          </Badge>
          <span
            className={`shrink-0 text-xs font-bold ${
              signed < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
            }`}
          >
            {formatSigned(signed)}
          </span>
          <span className="flex-1 truncate text-xs text-muted-foreground">
            {record.comment || "—"}
          </span>
          <span className="shrink-0 text-[10px] text-muted-foreground">
            {DATE_FORMAT.format(record.date)}
          </span>
          {record.editable && (
            <RecordButtons pending={pending} onEdit={() => setEditing(true)} onRemove={remove} />
          )}
        </div>
      )}
      {notice && <p className="pt-1 text-[10px] text-muted-foreground">{notice}</p>}
    </li>
  );
}

function RecordButtons({
  pending,
  onEdit,
  onRemove,
}: {
  pending: boolean;
  onEdit: () => void;
  onRemove: () => void;
}) {
  const t = useTranslations("journal");
  return (
    <span className="flex shrink-0 items-center gap-0.5">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={onEdit}
        title={t("edit")}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={onRemove}
        title={t("deleteRecord")}
        className="cursor-pointer text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </span>
  );
}
