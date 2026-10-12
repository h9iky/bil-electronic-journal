import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export interface TeacherStudentItem {
  id: string;
  fullName: string;
  email: string;
  sorScore: string;
  sochScore: string;
  activityScore: string;
  finalGrade: string;
}

export interface TeacherClassItem {
  id: string;
  className: string;
  subjectName: string;
  students: TeacherStudentItem[];
}

interface TeacherViewProps {
  teachings: TeacherClassItem[];
}

export function TeacherView({ teachings }: TeacherViewProps) {
  const currentClass = teachings[0];
  const students = currentClass?.students || [];

  return (
    <div className="space-y-8">
      {/* 3 Сводные карточки учителя */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Бекітілген сыныптар
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currentClass ? `${currentClass.className} сыныбы` : "Сынып жоқ"}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {currentClass ? currentClass.subjectName : "Пән бекітілмеген"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Оқушылар контингенті
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{students.length} оқушы</div>
            <p className="text-xs text-muted-foreground mt-1">
              1-тоқсан бойынша тіркелген
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              Потенциалды ұсыныстар
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-emerald-600">
              {students.filter((s) => s.finalGrade !== "—").length} белсенді
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Белсенділік негізінде қорытылды
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Журнал класса */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">
            {currentClass?.className} Сыныбы — Пән журналы
          </CardTitle>
          <CardDescription>
            Оқушылар тізімі, бағалар қою және белсенділік пен тәртіпті белгілеу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <div className="p-4 bg-muted/30 border-b flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="font-semibold text-sm">
                  Сынып: {currentClass?.className}
                </span>
                <span className="text-muted-foreground text-xs ml-3">
                  Пән: {currentClass?.subjectName} • Оқушылар: {students.length}
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs cursor-pointer">
                  + БЖБ/ТЖБ қосу
                </Button>
                <Button size="sm" className="text-xs cursor-pointer">
                  Журналды ашу
                </Button>
              </div>
            </div>

            {/* Список реальных учеников из базы данных */}
            <div className="p-4 space-y-3">
              {students.length === 0 ? (
                <div className="py-6 text-center text-xs text-muted-foreground">
                  Бұл сыныпта әлі оқушылар жоқ
                </div>
              ) : (
                students.map((student) => {
                  const initials = student.fullName
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .slice(0, 2);

                  return (
                    <div
                      key={student.id}
                      className="flex items-center justify-between text-sm py-2 border-b border-border/40 last:border-b-0"
                    >
                      <div className="flex items-center gap-3">
                        <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs uppercase">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold">{student.fullName}</div>
                          <div className="text-xs text-muted-foreground">
                            {student.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4 text-xs font-mono">
                        <span>БЖБ: {student.sorScore}</span>
                        <span>ТЖБ: {student.sochScore}</span>
                        <span className="text-primary font-bold">
                          Белсенділік: {student.activityScore}
                        </span>
                        <Badge variant="secondary" className="font-sans text-[11px]">
                          Қорытынды: {student.finalGrade}
                        </Badge>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
