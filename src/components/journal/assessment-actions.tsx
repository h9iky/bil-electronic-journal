"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeOff, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteAssessment, setAssessmentStatus } from "@/lib/actions/journal";
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

  function toggle() {
    const next: AssessmentStatus = status === "PUBLISHED" ? "DRAFT" : "PUBLISHED";
    startTransition(async () => {
      await setAssessmentStatus({ assessmentId, status: next });
    });
  }

  function remove() {
    if (!window.confirm(t("deleteConfirm", { title }))) return;
    startTransition(async () => {
      await deleteAssessment({ assessmentId });
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
