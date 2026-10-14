import { getTranslations } from "next-intl/server";
import { BookOpen, GraduationCap, LogOut, School, ShieldCheck } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { LocaleSwitcher } from "@/components/locale-switcher";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logoutAction, type SessionUser } from "@/lib/auth";
import { isRole, type Role } from "@/lib/constants";

const ROLE_BADGE_VARIANT: Record<Role, "default" | "secondary" | "destructive"> = {
  ADMIN: "destructive",
  TEACHER: "default",
  STUDENT: "secondary",
};

const ROLE_ICON: Record<Role, typeof ShieldCheck> = {
  ADMIN: ShieldCheck,
  TEACHER: BookOpen,
  STUDENT: GraduationCap,
};

/**
 * Верхняя панель кабинета: лого, роль, пользователь, язык, выход.
 * Общая для дашборда и журнала — чтобы шапка не расползалась копипастой.
 */
export async function AppHeader({
  user,
  locale,
}: {
  user: SessionUser;
  locale: string;
}) {
  const tc = await getTranslations("common");
  const tRoles = await getTranslations("roles");
  const role: Role = isRole(user.role) ? user.role : "STUDENT";
  const RoleIcon = ROLE_ICON[role];

  return (
    <header className="border-b bg-card/60 backdrop-blur-md sticky top-0 z-20">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 sm:px-6 py-3">
        <div className="flex items-center gap-3">
          <Link href="/dashboard" className="flex items-center gap-2.5 font-bold text-lg">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <School className="h-5 w-5" />
            </div>
            <span className="hidden sm:inline font-semibold">{tc("appName")}</span>
          </Link>
          <Badge variant={ROLE_BADGE_VARIANT[role]} className="text-xs capitalize font-semibold">
            <RoleIcon className="mr-1 h-3.5 w-3.5" />
            {tRoles(role.toLowerCase())}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-sm font-semibold leading-tight">{user.fullName}</div>
            <div className="text-xs text-muted-foreground">{user.email}</div>
          </div>
          <LocaleSwitcher />
          <form
            action={async () => {
              "use server";
              await logoutAction(locale);
            }}
          >
            <Button
              variant="ghost"
              size="sm"
              type="submit"
              className="gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden md:inline">{tc("logout")}</span>
            </Button>
          </form>
        </div>
      </div>
    </header>
  );
}
