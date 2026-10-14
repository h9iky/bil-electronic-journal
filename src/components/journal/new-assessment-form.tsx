"use client";

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createAssessment } from "@/lib/actions/journal";
import {
  ASSESSMENT_TYPES,
  type AssessmentType,
} from "@/lib/constants";

interface NewAssessmentFormProps {
  teachingId: string;
  quarter: number;
  sections: { id: string; title: string }[];
  /** SAT уже проведён в этой четверти — блокируем вариант. */
  satExists: boolean;
}

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Форма создания работы. SAS требует раздел, SAT — ровно один за четверть. */
export function NewAssessmentForm({
  teachingId,
  quarter,
  sections,
  satExists,
}: NewAssessmentFormProps) {
  const t = useTranslations("journal");
  const tType = useTranslations("assessmentType");

  const [type, setType] = useState<AssessmentType>("SAS");
  const [title, setTitle] = useState("");
  const [maxScore, setMaxScore] = useState("20");
  const [sectionId, setSectionId] = useState(sections[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      const result = await createAssessment({
        teachingId,
        type,
        title,
        maxScore: Number(maxScore),
        sectionId: type === "SAS" ? sectionId : null,
        quarter,
      });
      if (result.ok) {
        setTitle("");
      } else {
        setError(t(`error.${result.error ?? "unknown"}`));
      }
    });
  }

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-dashed border-border/70 bg-muted/20 p-3"
    >
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {t("workType")}
        </span>
        <select
          value={type}
          onChange={(event) => setType(event.target.value as AssessmentType)}
          className={SELECT_CLASS}
        >
          {ASSESSMENT_TYPES.map((value) => (
            <option key={value} value={value} disabled={value === "SAT" && satExists}>
              {tType(value)}
            </option>
          ))}
        </select>
      </label>

      {type === "SAS" && (
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold uppercase text-muted-foreground">
            {t("section")}
          </span>
          <select
            value={sectionId}
            onChange={(event) => setSectionId(event.target.value)}
            className={SELECT_CLASS}
            required
          >
            <option value="" disabled>
              —
            </option>
            {sections.map((section) => (
              <option key={section.id} value={section.id}>
                {section.title}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="flex min-w-48 flex-1 flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {t("workTitle")}
        </span>
        <Input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder={t("workTitlePlaceholder")}
          required
          maxLength={200}
        />
      </label>

      <label className="flex w-24 flex-col gap-1">
        <span className="text-xs font-semibold uppercase text-muted-foreground">
          {t("maxScore")}
        </span>
        <Input
          type="number"
          min={1}
          max={1000}
          value={maxScore}
          onChange={(event) => setMaxScore(event.target.value)}
          required
          className="text-center"
        />
      </label>

      <Button type="submit" disabled={pending} className="gap-1.5 cursor-pointer">
        <Plus className="h-4 w-4" />
        {t("create")}
      </Button>

      {error && (
        <p className="w-full text-xs font-medium text-destructive">{error}</p>
      )}
    </form>
  );
}
