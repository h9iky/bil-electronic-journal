import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  Sparkles,
  HeartHandshake,
  Award,
  CheckCircle2,
} from "lucide-react";

// Типы данных, которые приходят из базы данных (Prisma)
interface StudentViewProps {
  grades: any[];
  activities: any[];
  behaviors: any[];
  t: (key: string) => string;
}

export function StudentView({
  grades,
  activities,
  behaviors,
  t,
}: StudentViewProps) {
  // 1. Считаем средний балл активности (1–10)
  const avgActivity =
    activities.length > 0
      ? (
          activities.reduce((acc, curr) => acc + curr.value, 0) /
          activities.length
        ).toFixed(1)
      : null;

  // 2. Считаем сумму баллов за поведение
  const totalBehaviorPoints = behaviors.reduce(
    (acc, curr) => acc + curr.points,
    0
  );

  return (
    <div className="space-y-8">
      {/* ЧЕТЫРЕ КЛЮЧЕВЫХ ПОКАЗАТЕЛЯ (KPI) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Карточка 1: Официальный средний процент */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("gradesOverview")}
              </CardTitle>
              <div className="rounded-lg bg-blue-500/10 p-2 text-blue-600 dark:text-blue-400">
                <TrendingUp className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">92.8%</div>
            <p className="text-xs text-muted-foreground mt-1">
              БЖБ (19/20) + ТЖБ (28/30) + Формативті
            </p>
          </CardContent>
        </Card>

        {/* Карточка 2: 🔥 Активность 1–10 (фишка проекта) */}
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
              {avgActivity ? `${avgActivity} / 10` : "—"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("activityDesc")}
            </p>
          </CardContent>
        </Card>

        {/* Карточка 3: 🔥 Поведение (отдельная категория) */}
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                {t("behaviorMetric")}
              </CardTitle>
              <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-600 dark:text-emerald-400">
                <HeartHandshake className="h-4 w-4" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              +{totalBehaviorPoints} балл
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {behaviors.length} мадақтау жазбасы (бөлек санат)
            </p>
          </CardContent>
        </Card>

        {/* Карточка 4: 🔥 Потенциальная оценка */}
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
            <div className="flex items-center gap-2">
              <span className="text-2xl font-bold text-amber-700 dark:text-amber-400">
                5 (Өте жақсы)
              </span>
              <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                МАҚҰЛДАНДЫ
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("potentialGradeDesc")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* ОФИЦИАЛЬНЫЙ ЖУРНАЛ ОЦЕНОК */}
      <Card className="border-border/60">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-lg font-bold">{t("gradesOverview")}</CardTitle>
              <CardDescription>
                1-тоқсан: БЖБ және ТЖБ максималды баллдарымен есептелген нәтижелер
              </CardDescription>
            </div>
            <Badge variant="secondary">1-тоқсан</Badge>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="py-3 px-4">{t("subject")}</th>
                <th className="py-3 px-4">{t("type")}</th>
                <th className="py-3 px-4">{t("score")} / {t("maxScore")}</th>
                <th className="py-3 px-4">{t("percent")}</th>
                <th className="py-3 px-4">{t("date")}</th>
                <th className="py-3 px-4">Пікір</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {grades.map((g) => {
                const max = g.assessment.maxScore;
                const score = g.score ?? 0;
                const percent = Math.round((score / max) * 100);
                return (
                  <tr key={g.id} className="hover:bg-muted/20 transition">
                    <td className="py-3.5 px-4 font-semibold text-foreground">
                      {g.assessment.subject.name}
                    </td>
                    <td className="py-3.5 px-4">
                      <Badge
                        variant="outline"
                        className={
                          g.assessment.type === "SOCH"
                            ? "border-purple-500/40 text-purple-600 bg-purple-500/5 font-semibold"
                            : g.assessment.type === "SOR"
                            ? "border-blue-500/40 text-blue-600 bg-blue-500/5 font-semibold"
                            : "border-gray-400/40 text-muted-foreground"
                        }
                      >
                        {g.assessment.type}
                      </Badge>
                      <span className="block text-xs text-muted-foreground mt-0.5">
                        {g.assessment.title}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono font-bold text-foreground">
                      {score} <span className="text-muted-foreground font-normal">/ {max}</span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                        <CheckCircle2 className="h-4 w-4" />
                        {percent}%
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground">
                      {new Date(g.assessment.date).toLocaleDateString()}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-muted-foreground italic">
                      {g.comment || "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ДВА БЛОКА: АКТИВНОСТЬ (1-10) И ПОВЕДЕНИЕ (ОТДЕЛЬНО) */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Активность */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{t("activityMetric")} (1–10 күнделігі)</span>
            </CardTitle>
            <CardDescription>
              Оқушының сабақ сайынғы белсенділігі мен ынтасын бағалау
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {activities.map((act) => (
              <div
                key={act.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
              >
                <div className="space-y-1">
                  <div className="text-sm font-semibold">{act.subject.name}</div>
                  <div className="text-xs text-muted-foreground">{act.comment}</div>
                </div>
                <span className="inline-flex items-center justify-center px-2.5 py-1 rounded-md bg-primary text-primary-foreground font-bold text-sm">
                  {act.value} / 10
                </span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Поведение */}
        <Card className="border-border/60">
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <HeartHandshake className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>{t("behaviorMetric")} (Бөлек санат)</span>
            </CardTitle>
            <CardDescription>
              Академиялық бағамен араласпайтын, тәрбие мен тәртіп есебі
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {behaviors.map((beh) => (
              <div
                key={beh.id}
                className="flex items-center justify-between p-3 rounded-lg border border-border/60 bg-muted/20"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-[10px] bg-emerald-500/10 text-emerald-600 border-emerald-500/30">
                      {beh.kind}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {new Date(beh.date).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-xs text-foreground font-medium">{beh.comment}</div>
                </div>
                <div className="font-bold text-emerald-600 dark:text-emerald-400">
                  +{beh.points} балл
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
