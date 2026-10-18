import { getTranslations } from "next-intl/server";
import { Layers, BookOpen, Users, Settings2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { isRole, type Role } from "@/lib/constants";
import type { AdminDashboard } from "@/lib/queries";

interface AdminViewProps {
  data: AdminDashboard;
}

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "destructive"> = {
  ADMIN: "destructive",
  TEACHER: "default",
  STUDENT: "secondary",
};

export async function AdminView({ data }: AdminViewProps) {
  const t = await getTranslations("dashboard");
  const tRoles = await getTranslations("roles");

  const cards = [
    { title: t("totalUsers"), value: data.totalUsers, icon: Users, hint: null },
    {
      title: t("totalClasses"),
      value: data.totalClasses,
      icon: Layers,
      hint:
        data.classes.length === 0 ? (
          "—"
        ) : (
          <span className="flex flex-wrap gap-1.5">
            {data.classes.map((klass) => (
              <Link
                key={klass.id}
                href={`/dashboard/classes/${klass.id}/settings`}
                title={t("openClassSettings")}
                className="inline-flex items-center gap-1 rounded-md border border-border/70 bg-card px-2 py-0.5 text-xs font-medium text-foreground transition hover:border-primary/50 hover:text-primary"
              >
                <Settings2 className="h-3 w-3" />
                {klass.name}
              </Link>
            ))}
          </span>
        ),
    },
    {
      title: t("totalSubjects"),
      value: data.totalSubjects,
      icon: BookOpen,
      hint: data.subjectNames.join(", ") || "—",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="grid gap-4 sm:grid-cols-3">
        {cards.map(({ title, value, icon: Icon, hint }) => (
          <Card key={title} className="border-border/60">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xs uppercase font-semibold text-muted-foreground">
                  {title}
                </CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{value}</div>
              <p className="text-xs text-muted-foreground mt-1">{hint ?? t("usersDesc")}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-border/60">
        <CardHeader>
          <CardTitle className="text-lg font-bold">{t("usersTitle")}</CardTitle>
          <CardDescription>{t("usersDesc")}</CardDescription>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase">
              <tr>
                <th className="py-3 px-4">{t("name")}</th>
                <th className="py-3 px-4">{t("email")}</th>
                <th className="py-3 px-4">{t("role")}</th>
                <th className="py-3 px-4">{t("registeredAt")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {data.users.map((user) => {
                const role: Role = isRole(user.role) ? user.role : "STUDENT";
                return (
                  <tr key={user.id} className="hover:bg-muted/20 transition">
                    <td className="py-3 px-4 font-semibold">{user.fullName}</td>
                    <td className="py-3 px-4 text-muted-foreground">{user.email}</td>
                    <td className="py-3 px-4">
                      <Badge variant={ROLE_BADGE_VARIANT[role]} className="text-xs">
                        {tRoles(role.toLowerCase())}
                      </Badge>
                    </td>
                    <td className="py-3 px-4 text-xs text-muted-foreground">
                      {new Date(user.createdAt).toLocaleDateString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
