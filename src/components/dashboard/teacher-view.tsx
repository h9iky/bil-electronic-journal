import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface TeacherViewProps {
  teachings: any[];
}

export function TeacherView({ teachings }: TeacherViewProps) {
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
            <div className="text-2xl font-bold">10А сыныбы</div>
            <p className="text-xs text-muted-foreground mt-1">
              Алгебра және анализ бастамалары
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              БЖБ / ТЖБ бақылауы
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">3 жұмыс</div>
            <p className="text-xs text-muted-foreground mt-1">
              1-тоқсан бойынша толық енгізілді
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
            <div className="text-2xl font-bold text-emerald-600">1 мақұлданды</div>
            <p className="text-xs text-muted-foreground mt-1">
              Белсенділік негізінде қорытылды
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Журнал класса */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">10А Сыныбы — Пән журналы</CardTitle>
          <CardDescription>
            Оқушылар тізімі, бағалар қою және белсенділік пен тәртіпті белгілеу
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-xl border border-border/80 overflow-hidden">
            <div className="p-4 bg-muted/30 border-b flex items-center justify-between flex-wrap gap-3">
              <div>
                <span className="font-semibold text-sm">Сынып: 10А</span>
                <span className="text-muted-foreground text-xs ml-3">
                  Пән: Алгебра • Оқушылар: 3
                </span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" className="text-xs">
                  + БЖБ/ТЖБ қосу
                </Button>
                <Button size="sm" className="text-xs">
                  Журналды ашу
                </Button>
              </div>
            </div>

            {/* Список учеников */}
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                    АҚ
                  </div>
                  <div>
                    <div className="font-semibold">Арман Қайрат</div>
                    <div className="text-xs text-muted-foreground">student@bil.edu.kz</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>БЖБ: 19/20</span>
                  <span>ТЖБ: 28/30</span>
                  <span className="text-primary font-bold">Белсенділік: 10/10</span>
                  <Badge variant="secondary" className="font-sans text-[11px]">
                    Қорытынды: 5
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm py-2 border-b border-border/40">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold text-xs">
                    ДС
                  </div>
                  <div>
                    <div className="font-semibold">Диас Сәдуақас</div>
                    <div className="text-xs text-muted-foreground">dias@bil.edu.kz</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>БЖБ: 17/20</span>
                  <span>ТЖБ: 25/30</span>
                  <span className="text-primary font-bold">Белсенділік: 8/10</span>
                  <Badge variant="secondary" className="font-sans text-[11px]">
                    Қорытынды: 4
                  </Badge>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm py-2">
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-full bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold text-xs">
                    АМ
                  </div>
                  <div>
                    <div className="font-semibold">Айсұлу Мұрат</div>
                    <div className="text-xs text-muted-foreground">aisulu@bil.edu.kz</div>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-xs font-mono">
                  <span>БЖБ: 20/20</span>
                  <span>ТЖБ: 29/30</span>
                  <span className="text-primary font-bold">Белсенділік: 9/10</span>
                  <Badge variant="secondary" className="font-sans text-[11px]">
                    Қорытынды: 5
                  </Badge>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
