"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAssessment, setAssessmentStatus } from "@/lib/actions/journal";
import { useToast } from "@/components/ui/toast";
import type { AssessmentStatus } from "@/lib/constants";

interface AssessmentActionsProps {
  assessmentId: string;
  status: AssessmentStatus;
  title: string;
}

/** Публикация/снятие с публикации и удаление работы — прямо из шапки колонки. */
export function AssessmentActions({
  assessmentId,
  status,
  title,
}: AssessmentActionsProps) {
  const t = useTranslations("journal");
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  function toggle() {
    const next: AssessmentStatus = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    startTransition(async () => {
      const result = await setAssessmentStatus({ assessmentId, status: next });
      if (result.ok) {
        toast(next === "PUBLISHED" ? t("published") : t("unpublished"));
      } else {
        toast(t(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  function remove() {
    if (!window.confirm(t("deleteConfirm", { title }))) return;
    startTransition(async () => {
      const result = await deleteAssessment({ assessmentId });
      if (result.ok) toast(t("deleted"));
      else toast(t(`error.${result.error ?? "unknown"}`), "error");
    });
  }

  return (
    <div className="flex items-center gap-1">
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={toggle}
        title={status === "PUBLISHED" ? t("unpublish") : t("publish")}
        className="cursor-pointer text-muted-foreground hover:text-foreground"
      >
        {status === "PUBLISHED" ? (
          <EyeOff className="h-3.5 w-3.5" />
        ) : (
          <Eye className="h-3.5 w-3.5" />
        )}
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="icon-xs"
        disabled={pending}
        onClick={remove}
        title={t("delete")}
        className="cursor-pointer text-muted-foreground hover:text-destructive"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
