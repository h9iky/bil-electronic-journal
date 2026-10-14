"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { HeartHandshake, Plus, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { saveActivity, saveBehavior } from "@/lib/actions/journal";
import {
  ACTIVITY_MAX,
  ACTIVITY_MIN,
  BEHAVIOR_KINDS,
  type BehaviorKind,
} from "@/lib/constants";

interface QuickActionsProps {
  teachingId: string;
  students: { id: string; fullName: string }[];
}

const SELECT_CLASS =
  "h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Быстрые записи: активность (1–10) и поведение. Оба — серверные мутации. */
export function QuickActions({ teachingId, students }: QuickActionsProps) {
  const t = useTranslations("journal");
  const tBehavior = useTranslations("behavior");

  const [studentId, setStudentId] = useState(students[0]?.id ?? "");
  const [activityValue, setActivityValue] = useState("8");
  const [activityComment, setActivityComment] = useState("");

  const [behaviorKind, setBehaviorKind] = useState<BehaviorKind>("POSITIVE");
  const [behaviorPoints, setBehaviorPoints] = useState("3");
  const [behaviorComment, setBehaviorComment] = useState("");

  const [pending, startTransition] = useTransition();
  const [notice, setNotice] = useState<string | null>(null);

  function addActivity(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await saveActivity({
        teachingId,
        studentId,
        value: Number(activityValue),
        comment: activityComment,
      });
      if (result.ok) {
        setActivityComment("");
        setNotice(t("saved"));
      } else {
        setNotice(t(`error.${result.error ?? "unknown"}`));
      }
    });
  }

  function addBehavior(event: FormEvent) {
    event.preventDefault();
    setNotice(null);
    startTransition(async () => {
      const result = await saveBehavior({
        teachingId,
        studentId,
        kind: behaviorKind,
        points: Number(behaviorPoints),
        comment: behaviorComment,
      });
      if (result.ok) {
        setBehaviorComment("");
        setNotice(t("saved"));
      } else {
        setNotice(t(`error.${result.error ?? "unknown"}`));
      }
    });
  }

  if (students.length === 0) return null;

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <Sparkles className="h-4 w-4 text-primary" />
            {t("addActivity")}
          </CardTitle>
          <CardDescription className="text-xs">{t("addActivityDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addActivity} className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">{t("student")}</span>
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className={SELECT_CLASS}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("comment")}</span>
              <Input
                value={activityComment}
                onChange={(event) => setActivityComment(event.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={200}
              />
            </label>
            <label className="flex w-20 flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("value")}</span>
              <Input
                type="number"
                min={ACTIVITY_MIN}
                max={ACTIVITY_MAX}
                value={activityValue}
                onChange={(event) => setActivityValue(event.target.value)}
                required
                className="text-center"
              />
            </label>
            <Button
              type="submit"
              disabled={pending}
              size="sm"
              className="cursor-pointer sm:col-span-2"
            >
              <Plus className="h-4 w-4" />
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold">
            <HeartHandshake className="h-4 w-4 text-primary" />
            {t("addBehavior")}
          </CardTitle>
          <CardDescription className="text-xs">{t("addBehaviorDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={addBehavior} className="grid gap-3 sm:grid-cols-2">
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">{t("student")}</span>
              <select
                value={studentId}
                onChange={(event) => setStudentId(event.target.value)}
                className={SELECT_CLASS}
              >
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.fullName}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("kind")}</span>
              <select
                value={behaviorKind}
                onChange={(event) => setBehaviorKind(event.target.value as BehaviorKind)}
                className={SELECT_CLASS}
              >
                {BEHAVIOR_KINDS.map((kind) => (
                  <option key={kind} value={kind}>
                    {tBehavior(kind)}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs font-medium text-muted-foreground">{t("points")}</span>
              <Input
                type="number"
                min={0}
                max={100}
                value={behaviorPoints}
                onChange={(event) => setBehaviorPoints(event.target.value)}
                required
                className="text-center"
              />
            </label>
            <label className="flex flex-col gap-1 sm:col-span-2">
              <span className="text-xs font-medium text-muted-foreground">{t("comment")}</span>
              <Input
                value={behaviorComment}
                onChange={(event) => setBehaviorComment(event.target.value)}
                placeholder={t("commentPlaceholder")}
                maxLength={200}
              />
            </label>
            <Button
              type="submit"
              disabled={pending}
              size="sm"
              className="cursor-pointer sm:col-span-2"
            >
              <Plus className="h-4 w-4" />
              {t("save")}
            </Button>
          </form>
        </CardContent>
      </Card>

      {notice && (
        <p className="text-xs font-medium text-muted-foreground lg:col-span-2">{notice}</p>
      )}
    </div>
  );
}
