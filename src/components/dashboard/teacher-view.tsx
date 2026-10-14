import { getTranslations } from "next-intl/server";
import { BookOpen, Layers, Users } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "cn";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { groupPercent, round, type GroupScore } from "@/lib/grading";
import type { TeacherClassBlock } from "@/lib/queries";
import { gradeBadgeClass } from "./badges";

interface TeacherViewProps {
  blocks: TeacherClassBlock[];
}

/** «18/20 (90%)» или «—», если работ этого типа ещё нет. */
function formatGroup(group: GroupScore): string {
  if (group.count === 0) return "—";
  const pct = groupPercent(group);
  return `${group.sumScore}/${group.sumMax} (${pct == null ? "—" : round(pct)}%)`;
}

export async function TeacherView({ blocks }: TeacherViewProps) {
  const t = await getTranslations("dashboard");
  const tStatus = await getTranslations("proposalStatus");

  const uniqueStudents = new Set(blocks.flatMap((b) => b.students.map((s) => s.id)));
  const acceptedProposals = blocks
    .flatMap((b) => b.students)
    .filter((s) => s.proposal?.status === "ACCEPTED").length;

  return (
    <div className="space-y-8">
      {/* Сводка по учителю */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("attachedClasses")}
              </CardTitle>
              <Layers className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{blocks.length}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {blocks.map((b) => `${b.className} · ${b.subjectName}`).join(", ") || "—"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("contingent")}
              </CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {t("studentsCount", { count: uniqueStudents.size })}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("contingentDesc")}</p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("proposals")}
              </CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {acceptedProposals}
            </div>
            <p className="text-xs text-muted-foreground mt-1">{t("proposalsDesc")}</p>
          </CardContent>
        </Card>
      </div>

      {/* Журналы по каждому классу/предмету учителя */}
      {blocks.map((block) => (
        <Card key={block.teachingId} className="border-border/60">
          <CardHeader>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <CardTitle className="text-lg font-bold">
                  {block.className} — {block.subjectName}
                </CardTitle>
                <CardDescription>
                  {t("weightsLabel")}: {t("sasShort")} {block.rules.weights.sas}% / {t("satShort")}{" "}
                  {block.rules.weights.sat}%
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Link
                  href={{
                    pathname: "/dashboard/journal",
                    query: { teaching: block.teachingId },
                  }}
                  className={cn(buttonVariants({ size: "sm" }), "text-xs")}
                >
                  {t("openJournal")}
                </Link>
              </div>
            </div>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {block.students.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">{t("noStudents")}</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
                  <tr>
                    <th className="py-3 px-4">{t("studentsLabel")}</th>
                    <th className="py-3 px-4">{t("sasShort")}</th>
                    <th className="py-3 px-4">{t("satShort")}</th>
                    <th className="py-3 px-4">{t("activityShort")}</th>
                    <th className="py-3 px-4">{t("percent")}</th>
                    <th className="py-3 px-4">{t("finalGrade")}</th>
                    <th className="py-3 px-4">{t("proposals")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {block.students.map((student) => {
                    const initials = student.fullName
                      .split(" ")
                      .map((part) => part[0])
                      .join("")
                      .slice(0, 2);
                    return (
                      <tr key={student.id} className="hover:bg-muted/20 transition">
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                              {initials}
                            </div>
                            <div>
                              <div className="font-semibold">{student.fullName}</div>
                              <div className="text-xs text-muted-foreground">{student.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 font-mono text-xs">{formatGroup(student.sas)}</td>
                        <td className="py-3 px-4 font-mono text-xs">{formatGroup(student.sat)}</td>
                        <td className="py-3 px-4 text-xs font-semibold text-primary">
                          {student.activityAverage == null
                            ? "—"
                            : `${round(student.activityAverage, "HALF_UP", 1)}/10`}
                        </td>
                        <td className="py-3 px-4 text-xs font-semibold">
                          {student.quarterPercent == null
                            ? "—"
                            : `${round(student.quarterPercent)}%`}
                        </td>
                        <td className="py-3 px-4">
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
                        <td className="py-3 px-4">
                          {student.proposal == null ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{student.proposal.value}</span>
                              <Badge variant="outline" className="text-[10px]">
                                {tStatus(student.proposal.status)}
                              </Badge>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
