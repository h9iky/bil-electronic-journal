import { getTranslations } from "next-intl/server";
import {
  Award,
  CheckCircle2,
  HeartHandshake,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSigned, round } from "@/lib/grading";
import type { StudentDashboard } from "@/lib/queries";
import { assessmentTypeBadgeClass, gradeBadgeClass } from "./badges";

interface StudentViewProps {
  data: StudentDashboard;
}

export async function StudentView({ data }: StudentViewProps) {
  const t = await getTranslations("dashboard");
  const tType = await getTranslations("assessmentType");
  const tBehavior = await getTranslations("behavior");
  const tProposalStatus = await getTranslations("proposalStatus");
  const tProposalBasis = await getTranslations("proposalBasis");

  const subjectsWithGrades = data.subjects.filter((subject) => subject.grades.length > 0);
  const { proposal, behavior } = data;

  return (
    <div className="space-y-8">
      {/* Ключевые показатели */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("overallProgress")}
              </CardTitle>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data.overallPercent == null ? "—" : `${data.overallPercent}%`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("overallProgressDesc")}</p>
          </CardContent>
        </Card>

        <Card className="border-primary/30 bg-primary/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-primary">
                {t("activityMetric")} (1–10)
              </CardTitle>
              <div className="rounded-lg bg-primary/20 p-2 text-primary">
                <Sparkles className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">
              {data.activityAverage == null
                ? "—"
                : `${round(data.activityAverage, "HALF_UP", 1)} / 10`}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("activityDesc")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("behaviorNet")}
              </CardTitle>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <HeartHandshake className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                behavior.net < 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
              }`}
            >
              {formatSigned(behavior.net)} балл
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("behaviorRecordsCount", { count: behavior.count })} · +{behavior.positive} / −
              {behavior.negative}
            </p>
          </CardContent>
        </Card>

        <Card className="border-amber-500/30 bg-amber-500/5">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-amber-700 dark:text-amber-400">
                {t("potentialGrade")}
              </CardTitle>
              <div className="rounded-lg bg-amber-500/20 p-2 text-amber-700 dark:text-amber-400">
                <Award className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {proposal ? (
              <div className="flex items-center gap-2">
                <span className={`text-2xl font-bold ${gradeBadgeClass(proposal.value).text}`}>
                  {proposal.value}
                </span>
                <Badge variant="outline" className="text-[10px]">
                  {tProposalStatus(proposal.status)}
                </Badge>
              </div>
            ) : (
              <div className="text-2xl font-bold text-muted-foreground">—</div>
            )}
            <p className="text-xs text-muted-foreground mt-1">
              {proposal
                ? tProposalBasis(proposal.basis === "behavior" ? "behavior" : "activity")
                : t("noProposal")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Официальный журнал */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">{t("gradesOverview")}</CardTitle>
              <CardDescription>{t("overallProgressDesc")}</CardDescription>
            </div>
            <Badge variant="secondary">{t("quarterLabel")}</Badge>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {subjectsWithGrades.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{t("noGrades")}</p>
          ) : (
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                <tr>
                  <th className="py-3 px-4">{t("subject")}</th>
                  <th className="py-3 px-4">{t("type")}</th>
                  <th className="py-3 px-4">
                    {t("score")} / {t("maxScore")}
                  </th>
                  <th className="py-3 px-4">{t("percent")}</th>
                  <th className="py-3 px-4">{t("date")}</th>
                  <th className="py-3 px-4">{t("comment")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {subjectsWithGrades.flatMap((subject) =>
                  subject.grades.map((grade) => (
                    <tr key={grade.id} className="hover:bg-muted/20 transition">
                      <td className="py-3.5 px-4 font-semibold text-foreground">
                        {subject.subjectName}
                      </td>
                      <td className="py-3.5 px-4">
                        <Badge
                          variant="outline"
                          className={`text-[11px] font-semibold ${assessmentTypeBadgeClass(grade.type)}`}
                        >
                          {tType(grade.type)}
                        </Badge>
                        <span className="block text-xs text-muted-foreground mt-0.5">
                          {grade.title}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                        {grade.score ?? "—"}{" "}
                        <span className="text-muted-foreground font-normal">/ {grade.maxScore}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        {grade.percent == null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="h-4 w-4" />
                            {grade.percent}%
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground">
                        {new Date(grade.date).toLocaleDateString()}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-muted-foreground italic">
                        {grade.comment || "—"}
                      </td>
                    </tr>
                  )),
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      {/* Активность и поведение — отдельные категории */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>
                {t("activityMetric")} (1–10)
              </span>
            </CardTitle>
            <CardDescription>{t("activityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.activities.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">—</p>
            ) : (
              data.activities.map((activity) => (
                <div
                  key={activity.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                >
                  <div className="space-y-1">
                    <div className="text-sm font-semibold">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                    <div className="text-xs text-muted-foreground">{activity.comment || "—"}</div>
                  </div>
                  <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-bold text-sm">
                    {activity.value} / 10
                  </span>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t("behaviorMetric")}</span>
            </CardTitle>
            <CardDescription>{t("behaviorDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.behaviors.length === 0 ? (
              <p className="py-4 text-center text-xs text-muted-foreground">—</p>
            ) : (
              data.behaviors.map((record) => {
                const signed = record.kind === "NEGATIVE" ? -record.points : record.points;
                return (
                  <div
                    key={record.id}
                    className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant="outline"
                          className={`text-[10px] ${
                            record.kind === "NEGATIVE"
                              ? "bg-destructive/10 text-destructive border-destructive/30"
                              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                          }`}
                        >
                          {tBehavior(record.kind)}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="text-xs text-foreground font-medium">
                        {record.comment || "—"}
                      </div>
                    </div>
                    <div
                      className={`font-bold ${
                        signed < 0
                          ? "text-destructive"
                          : "text-emerald-600 dark:text-emerald-400"
                      }`}
                    >
                      {formatSigned(signed)} балл
                    </div>
                  </div>
                );
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
