"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Send, Unlink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { generateTelegramCode, unlinkTelegram } from "@/lib/actions/telegram";

interface TelegramCardProps {
  /** Привязка текущего аккаунта (`null` — не привязан; username может быть null). */
  linked: { username: string | null } | null;
  /** Юзернейм бота без @ — для кнопки «Открыть бота». */
  botUsername: string | null;
}

/**
 * Карточка «Telegram-бот»: код привязки для бота Ask BIL.
 * Код гасит сам бот (команда `/start <код>`), карточка только показывает статус.
 */
export function TelegramCard({ linked, botUsername }: TelegramCardProps) {
  const t = useTranslations("telegram");
  const { toast } = useToast();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [code, setCode] = useState<{ value: string; minutes: number } | null>(null);

  const botHandle = botUsername?.replace(/^@/, "") || null;

  function requestCode() {
    startTransition(async () => {
      const result = await generateTelegramCode();
      if (result.ok) {
        setCode({ value: result.code, minutes: result.minutes });
        toast(t("codeReady"));
      } else {
        toast(t("errorUnknown"), "error");
      }
    });
  }

  function unlink() {
    startTransition(async () => {
      const result = await unlinkTelegram();
      if (result.ok) {
        setCode(null);
        toast(t("unlinked"));
        router.refresh();
      } else {
        toast(t("errorUnknown"), "error");
      }
    });
  }

  return (
    <Card className="border-sky-500/30 bg-sky-500/5">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <CardTitle className="text-base font-bold flex items-center gap-2">
            <Send className="h-4 w-4 text-sky-600 dark:text-sky-400" />
            {t("title")}
          </CardTitle>
          <Badge
            variant="outline"
            className={`text-[10px] font-semibold ${
              linked
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                : "text-muted-foreground"
            }`}
          >
            {linked ? t("linkedBadge") : t("notLinked")}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground">{t("desc")}</p>
      </CardHeader>

      <CardContent>
        {linked ? (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-sm">
              {t("linkedLabel")}{" "}
              <span className="font-semibold">
                {linked.username ? `@${linked.username}` : "Telegram"}
              </span>
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={unlink}
              disabled={pending}
              className="gap-1.5 cursor-pointer text-muted-foreground hover:text-destructive"
            >
              <Unlink className="h-3.5 w-3.5" />
              {t("unlink")}
            </Button>
          </div>
        ) : code ? (
          <div className="space-y-2">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              {t("codeHint")}
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <code className="rounded-lg border border-border/60 bg-background px-3 py-1.5 font-mono text-lg font-bold tracking-widest">
                /start {code.value}
              </code>
              {botHandle && (
                <a
                  href={`https://t.me/${botHandle}`}
                  target="_blank"
                  rel="noreferrer"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  {t("openBot")}
                </a>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground">
              {t("codeExpires", { minutes: code.minutes })}
            </p>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              size="sm"
              onClick={requestCode}
              disabled={pending}
              className="gap-1.5 cursor-pointer"
            >
              <Send className="h-3.5 w-3.5" />
              {t("getCode")}
            </Button>
            {botHandle && (
              <a
                href={`https://t.me/${botHandle}`}
                target="_blank"
                rel="noreferrer"
                className={buttonVariants({ variant: "ghost", size: "sm" })}
              >
                {t("openBot")}
              </a>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
