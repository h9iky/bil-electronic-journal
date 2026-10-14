import { getTranslations } from "next-intl/server";
import { ClipboardList } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatSigned, round } from "@/lib/grading";
import type { JournalData } from "@/lib/queries";
import { assessmentTypeBadgeClass, gradeBadgeClass } from "@/components/dashboard/badges";
import { GradeCell } from "./grade-cell";
import { AssessmentActions } from "./assessment-actions";
import { NewAssessmentForm } from "./new-assessment-form";
import { QuickActions } from "./quick-actions";
import { JournalRecords } from "./journal-records";

interface JournalViewProps {
  data: JournalData;
}

/** Журнал одного класса/предмета за четверть: работы, матрица баллов, быстрые записи. */
export async function JournalView({ data }: JournalViewProps) {
  const t = await getTranslations("journal");
  const tType = await getTranslations("assessmentType");
  const tStatus = await getTranslations("assessmentStatus");

  const satExists = data.assessments.some((a) => a.type === "SAT");

  return (
    <div className="space-y-6">
      {/* Управление работами */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-base font-bold">
            <ClipboardList className="h-4 w-4 text-primary" />
            {t("works")}
          </CardTitle>
          <CardDescription className="text-xs">
            {t("worksDesc", {
              sas: data.rules.weights.sas,
              sat: data.rules.weights.sat,
            })}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <NewAssessmentForm
            teachingId={data.teaching.id}
            quarter={data.quarter}
            sections={data.sections}
            satExists={satExists}
          />

          {data.assessments.length === 0 ? (
            <p className="py-2 text-sm text-muted-foreground">{t("noWorks")}</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {data.assessments.map((assessment) => (
                <div
                  key={assessment.id}
                  className="flex items-center gap-2 rounded-lg border border-border/70 bg-card px-3 py-1.5"
                >
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-bold ${assessmentTypeBadgeClass(assessment.type)}`}
                  >
                    {tType(assessment.type)}
                  </Badge>
                  <span className="text-sm font-medium">{assessment.title}</span>
                  <span className="text-xs text-muted-foreground">/ {assessment.maxScore}</span>
                  <Badge
                    variant={assessment.status === "PUBLISHED" ? "default" : "outline"}
                    className="text-[10px]"
                  >
                    {tStatus(assessment.status)}
                  </Badge>
                  <AssessmentActions
                    assessmentId={assessment.id}
                    status={assessment.status}
                    title={assessment.title}
                  />
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Матрица баллов */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">
            {t("class")} {data.teaching.className}
          </CardTitle>
          <CardDescription className="text-xs">{t("gridHint")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto p-0">
          {data.students.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("noStudents")}
            </p>
          ) : (
            <table className="w-full border-collapse text-left text-sm">
              <thead className="bg-muted/40 text-xs font-semibold uppercase text-muted-foreground">
                <tr>
                  <th className="sticky left-0 z-10 bg-muted/40 px-4 py-3">
                    {t("student")}
                  </th>
                  {data.assessments.map((assessment) => (
                    <th key={assessment.id} className="px-3 py-3 text-center">
                      <div className="font-bold text-foreground">{assessment.title}</div>
                      <div className="mt-0.5 font-normal normal-case">
                        {tType(assessment.type)} · max {assessment.maxScore}
                      </div>
                    </th>
                  ))}
                  <th className="px-3 py-3 text-center">{t("activity")}</th>
                  <th className="px-3 py-3 text-center">{t("behavior")}</th>
                  <th className="px-3 py-3 text-center">{t("final")}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {data.students.map((student) => (
                  <tr key={student.id} className="hover:bg-muted/20 transition">
                    <td className="sticky left-0 z-10 bg-card px-4 py-2">
                      <div className="font-semibold">{student.fullName}</div>
                      <div className="text-xs text-muted-foreground">{student.email}</div>
                    </td>
                    {data.assessments.map((assessment) => (
                      <td key={assessment.id} className="px-3 py-2 text-center">
                        <GradeCell
                          assessmentId={assessment.id}
                          studentId={student.id}
                          maxScore={assessment.maxScore}
                          initialScore={student.scores[assessment.id] ?? null}
                        />
                      </td>
                    ))}
                    <td className="px-3 py-2 text-center text-xs font-semibold text-primary">
                      {student.activityAverage == null
                        ? "—"
                        : round(student.activityAverage, "HALF_UP", 1)}
                    </td>
                    <td className="px-3 py-2 text-center text-xs font-semibold">
                      <span
                        className={
                          student.behavior.net < 0
                            ? "text-destructive"
                            : "text-emerald-600 dark:text-emerald-400"
                        }
                      >
                        {formatSigned(student.behavior.net)}
                      </span>
                    </td>
                    <td className="px-3 py-2 text-center">
                      {student.quarterGrade == null ? (
                        <span className="text-xs text-muted-foreground">—</span>
                      ) : (
                        <Badge
                          variant="outline"
                          className={`text-xs font-bold ${gradeBadgeClass(student.quarterGrade).badge}`}
                        >
                          {student.quarterGrade}
                        </Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <JournalRecords activities={data.activities} behaviors={data.behaviors} />

      <QuickActions
        teachingId={data.teaching.id}
        students={data.students.map((s) => ({ id: s.id, fullName: s.fullName }))}
      />
    </div>
  );
}
