import { getTranslations } from "next-intl/server";
import { Info } from "lucide-react";
import type { GradingRules } from "@/lib/constants";

/**
 * Тонкая полоска «по каким правилам считается четвертная» в журнале учителя.
 * Read-only: настройки класса меняет админ (страница /dashboard/classes/[id]/settings).
 */
export async function ClassRulesPanel({ rules }: { rules: GradingRules }) {
  const t = await getTranslations("journal");
  const tRounding = await getTranslations("rounding");

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 rounded-xl border border-dashed border-border/70 bg-muted/20 px-4 py-2.5 text-xs text-muted-foreground">
      <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
        <Info className="h-3.5 w-3.5 text-primary" />
        {t("rulesTitle")}
      </span>
      <span>
        {t("rulesWeights", {
          sas: rules.weights.sas,
          sat: rules.weights.sat,
          formative: rules.weights.formative,
        })}
      </span>
      <span>
        {t("rulesThresholds", {
          three: rules.thresholds.three,
          four: rules.thresholds.four,
          five: rules.thresholds.five,
        })}
      </span>
      <span>{t("rulesRounding", { mode: tRounding(rules.rounding) })}</span>
      <span className="ml-auto text-[10px] uppercase tracking-wide">{t("rulesNote")}</span>
    </div>
  );
}
