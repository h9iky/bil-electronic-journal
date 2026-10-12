import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface AdminUserItem {
  id: string;
  fullName: string;
  email: string;
  role: string;
  createdAt: Date;
}

interface AdminViewProps {
  totalUsers: number;
  totalClasses: number;
  totalSubjects: number;
  users: AdminUserItem[];
  t: (key: string) => string;
  tr: (key: "student" | "teacher" | "admin") => string;
}

export function AdminView({
  totalUsers,
  totalClasses,
  totalSubjects,
  users,
  t,
  tr,
}: AdminViewProps) {
  return (
    <div className="space-y-8">
      {/* 3 Карточки статистики всей школы */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              {t("totalUsers")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalUsers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Оқушылар, мұғалімдер және әкімшілер
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              {t("totalClasses")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalClasses}</div>
            <p className="text-xs text-muted-foreground mt-1">
              10А (2025/2026 оқу жылы)
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/60">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
              {t("totalSubjects")}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalSubjects}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Алгебра, Физика, Информатика
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Таблица пользователей системы */}
      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">Жүйе пайдаланушылары</CardTitle>
          <CardDescription>
            Барлық тіркелген аккаунттар мен олардың рөлдері
          </CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="py-3 px-4">Аты-жөні</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Рөл</th>
                <th className="py-3 px-4">Тіркелген күні</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-muted/20 transition">
                  <td className="py-3 px-4 font-semibold">{u.fullName}</td>
                  <td className="py-3 px-4 text-muted-foreground">{u.email}</td>
                  <td className="py-3 px-4">
                    <Badge
                      variant={
                        u.role === "ADMIN"
                          ? "destructive"
                          : u.role === "TEACHER"
                          ? "default"
                          : "secondary"
                      }
                      className="text-xs"
                    >
                      {tr(u.role.toLowerCase() as "student" | "teacher" | "admin")}
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-xs text-muted-foreground">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
