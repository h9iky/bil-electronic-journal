"use client";

import { useEffect, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Target, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { gradeBadgeClass } from "@/components/dashboard/badges";
import { clearGoal, saveGoal } from "@/lib/actions/goals";
import { GRADE_MAX, GRADE_MIN, type GradingRules } from "@/lib/constants";
import {
  quarterGrade,
  quarterPercent,
  requiredScoreForTarget,
  round,
  simulateQuarter,
  type GroupKey,
  type SubjectGroups,
} from "@/lib/grading";

interface UpcomingWork {
  title: string;
  key: GroupKey;
  maxScore: number;
}

interface GoalCardProps {
  subjectId: string;
  subjectName: string;
  quarter: number;
  groups: SubjectGroups;
  upcoming: UpcomingWork | null;
  goal: number | null;
  rules: GradingRules;
}

/** Оценки 2..5 для выбора цели. */
const GRADES = Array.from({ length: GRADE_MAX - GRADE_MIN + 1 }, (_, i) => GRADE_MIN + i);

function errorKey(code?: string): string {
  if (code === "forbidden") return "goalErrorForbidden";
  if (code === "invalid") return "goalErrorInvalid";
  return "goalErrorUnknown";
}

/**
 * «Цель и прогноз»: ученик ставит желаемую оценку по предмету, а журнал считает,
 * что нужно на предстоящей работе. Прогноз гоняется через тот же `quarterGrade`,
 * что и официальный итог — расхождений быть не может.
 */
export function GoalCard({
  subjectId,
  subjectName,
  quarter,
  groups,
  upcoming,
  goal,
  rules,
}: GoalCardProps) {
  const t = useTranslations("dashboard");
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [target, setTarget] = useState<number | null>(goal);
  const [simScore, setSimScore] = useState(0);

  const parts = { sas: groups.sas, sat: groups.sat, formative: groups.formative };
  const currentPercent = quarterPercent(parts, rules);
  const currentGrade = quarterGrade(parts, rules);

  const required =
    upcoming && target ? requiredScoreForTarget(groups, upcoming, target, rules) : null;

  // Ползунок по умолчанию встаёт на «необходимый балл» — сразу видно цель в действии.
  useEffect(() => {
    if (!upcoming) return;
    const next = required ?? Math.round(upcoming.maxScore * 0.7);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSimScore(next);
  }, [target, upcoming, required]);

  const predicted = upcoming
    ? simulateQuarter(groups, upcoming, simScore, rules)
    : null;
  const achieved = target != null && currentGrade != null && currentGrade >= target;

  function pick(grade: number) {
    const next = target === grade ? null : grade;
    setTarget(next);
    startTransition(async () => {
      const result = next == null
        ? await clearGoal({ subjectId, quarter })
        : await saveGoal({ subjectId, quarter, targetGrade: next });
      if (result.ok) toast(t(next == null ? "goalCleared" : "goalSaved"));
      else toast(t(errorKey(result.error)), "error");
    });
  }

  function clear() {
    setTarget(null);
    startTransition(async () => {
      const result = await clearGoal({ subjectId, quarter });
      if (result.ok) toast(t("goalCleared"));
      else toast(t(errorKey(result.error)), "error");
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Target className="h-4 w-4 text-primary" />
              {subjectName}
            </CardTitle>
            <p className="mt-1 text-xs text-muted-foreground">
              {t("goalCurrent")}:{" "}
              {currentPercent == null ? (
                "—"
              ) : (
                <span className="font-semibold text-foreground">
                  {round(currentPercent, rules.rounding)}%
                </span>
              )}{" "}
              {currentGrade != null && (
                <Badge
                  variant="outline"
                  className={`ml-1 text-[10px] font-bold ${gradeBadgeClass(currentGrade).badge}`}
                >
                  {currentGrade}
                </Badge>
              )}
            </p>
          </div>
          {target != null && (
            <button
              type="button"
              onClick={clear}
              disabled={pending}
              className="text-[11px] text-muted-foreground underline-offset-2 hover:text-foreground hover:underline cursor-pointer"
            >
              {t("goalClear")}
            </button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Выбор цели */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            {t("goalSet")}
          </span>
          <div className="flex gap-1.5">
            {GRADES.map((grade) => {
              const active = target === grade;
              return (
                <button
                  key={grade}
                  type="button"
                  disabled={pending}
                  onClick={() => pick(grade)}
                  aria-pressed={active}
                  className={`h-8 w-8 rounded-lg border text-sm font-bold transition cursor-pointer ${
                    active
                      ? `${gradeBadgeClass(grade).badge} ring-2 ring-primary/30`
                      : "border-border/60 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                  }`}
                >
                  {grade}
                </button>
              );
            })}
          </div>
        </div>

        {/* Прогноз */}
        {!upcoming ? (
          <p className="text-xs text-muted-foreground">{t("goalNoUpcoming")}</p>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold uppercase text-muted-foreground">
                {t("goalUpcoming")}
              </span>
              <span className="text-muted-foreground">
                {upcoming.title} · max {upcoming.maxScore}
              </span>
            </div>

            {target != null && (
              <p className="text-sm">
                {achieved ? (
                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                    {t("goalAchieved")}
                  </span>
                ) : required == null ? (
                  <span className="font-medium text-destructive">{t("goalImpossible")}</span>
                ) : (
                  <span>
                    {t("goalNeedOn", {
                      grade: target,
                      score: required,
                      max: upcoming.maxScore,
                      work: upcoming.title,
                    })}
                  </span>
                )}
              </p>
            )}

            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold uppercase text-muted-foreground">
                  {t("goalWhatIf")}
                </span>
                <span className="font-mono font-bold text-foreground">
                  {simScore} / {upcoming.maxScore}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={upcoming.maxScore}
                step={1}
                value={simScore}
                onChange={(event) => setSimScore(Number(event.target.value))}
                className="w-full cursor-pointer accent-primary"
              />
              <div className="flex items-center gap-2 text-sm">
                <TrendingUp className="h-3.5 w-3.5 text-muted-foreground" />
                <span className="text-muted-foreground">{t("goalPredicted")}:</span>
                <span className="font-semibold">
                  {predicted?.percent == null ? "—" : `${round(predicted.percent, rules.rounding)}%`}
                </span>
                {predicted?.grade != null && (
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${gradeBadgeClass(predicted.grade).badge}`}
                  >
                    {predicted.grade}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">{t("goalHint")}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
