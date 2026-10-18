"use client";

/**
 * Форма настроек оценивания класса (админ): веса, пороги %→оценка, округление.
 *
 * Черновик валидируется той же функцией, что и server action
 * (`validateClassSettings`), — сервер всё равно перепроверит, но кнопка
 * «Сохранить» не отправляет заведомо битые данные и объясняет, что не так.
 */

import { useState, useTransition, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { RotateCcw, Save } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/toast";
import { saveClassSettings } from "@/lib/actions/class-settings";
import { validateClassSettings } from "@/lib/class-settings";
import {
  DEFAULT_RULES,
  ROUNDING_MODES,
  type GradingRules,
  type RoundingMode,
} from "@/lib/constants";
import { gradeBadgeClass } from "./badges";

interface ClassSettingsFormProps {
  classId: string;
  initialRules: GradingRules;
}

const SELECT_CLASS =
  "h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

const LABEL_CLASS = "flex flex-col gap-1";
const LABEL_TEXT_CLASS = "text-xs font-semibold uppercase text-muted-foreground";

export function ClassSettingsForm({ classId, initialRules }: ClassSettingsFormProps) {
  const t = useTranslations("classSettings");
  const tRounding = useTranslations("rounding");
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();

  // Поля держим строками (как в форме работ) — так проще ловить пустой ввод.
  const [sasWeight, setSasWeight] = useState(String(initialRules.weights.sas));
  const [satWeight, setSatWeight] = useState(String(initialRules.weights.sat));
  const [formativeWeight, setFormativeWeight] = useState(String(initialRules.weights.formative));
  const [thresholdThree, setThresholdThree] = useState(String(initialRules.thresholds.three));
  const [thresholdFour, setThresholdFour] = useState(String(initialRules.thresholds.four));
  const [thresholdFive, setThresholdFive] = useState(String(initialRules.thresholds.five));
  const [rounding, setRounding] = useState<RoundingMode>(initialRules.rounding);

  const draft = {
    sasWeight: Number(sasWeight),
    satWeight: Number(satWeight),
    formativeWeight: Number(formativeWeight),
    thresholdThree: Number(thresholdThree),
    thresholdFour: Number(thresholdFour),
    thresholdFive: Number(thresholdFive),
    rounding,
  };
  const check = validateClassSettings(draft);
  const weightsSum = draft.sasWeight + draft.satWeight + draft.formativeWeight;
  const weightsSumValid = Number.isFinite(weightsSum);

  // Шкала «проценты → оценка» по текущим порогам (живёт прямо во время набора).
  const legendValid =
    check.ok ||
    (Number.isInteger(draft.thresholdThree) &&
      Number.isInteger(draft.thresholdFour) &&
      Number.isInteger(draft.thresholdFive) &&
      draft.thresholdThree >= 1 &&
      draft.thresholdThree < draft.thresholdFour &&
      draft.thresholdFour < draft.thresholdFive &&
      draft.thresholdFive <= 100);
  const legend = [
    { grade: 5, from: draft.thresholdFive, to: 100 },
    { grade: 4, from: draft.thresholdFour, to: draft.thresholdFive - 1 },
    { grade: 3, from: draft.thresholdThree, to: draft.thresholdFour - 1 },
    { grade: 2, from: 0, to: draft.thresholdThree - 1 },
  ];

  function submit(event: FormEvent) {
    event.preventDefault();

    if (!check.ok) {
      toast(t(`error.${check.error}`), "error");
      return;
    }

    startTransition(async () => {
      const result = await saveClassSettings({ classId, ...draft });
      if (result.ok) {
        toast(t("saved"));
      } else {
        toast(t(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  function resetToDefaults() {
    setSasWeight(String(DEFAULT_RULES.weights.sas));
    setSatWeight(String(DEFAULT_RULES.weights.sat));
    setFormativeWeight(String(DEFAULT_RULES.weights.formative));
    setThresholdThree(String(DEFAULT_RULES.thresholds.three));
    setThresholdFour(String(DEFAULT_RULES.thresholds.four));
    setThresholdFive(String(DEFAULT_RULES.thresholds.five));
    setRounding(DEFAULT_RULES.rounding);
    toast(t("resetDone"));
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      {/* Веса четвертной */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">{t("weightsTitle")}</CardTitle>
          <CardDescription className="text-xs">{t("weightsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("weightSas")}</span>
              <Input
                type="number"
                min={0}
                max={100}
                required
                value={sasWeight}
                onChange={(event) => setSasWeight(event.target.value)}
                className="text-center"
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("weightSat")}</span>
              <Input
                type="number"
                min={0}
                max={100}
                required
                value={satWeight}
                onChange={(event) => setSatWeight(event.target.value)}
                className="text-center"
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("weightFormative")}</span>
              <Input
                type="number"
                min={0}
                max={100}
                required
                value={formativeWeight}
                onChange={(event) => setFormativeWeight(event.target.value)}
                className="text-center"
              />
            </label>
          </div>
          <p className="text-xs text-muted-foreground">
            {weightsSumValid ? t("weightSum", { sum: weightsSum }) : "—"}
          </p>
        </CardContent>
      </Card>

      {/* Пороги % → оценка */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">{t("thresholdsTitle")}</CardTitle>
          <CardDescription className="text-xs">{t("thresholdsHint")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("thresholdThree")}</span>
              <Input
                type="number"
                min={1}
                max={100}
                required
                value={thresholdThree}
                onChange={(event) => setThresholdThree(event.target.value)}
                className="text-center"
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("thresholdFour")}</span>
              <Input
                type="number"
                min={1}
                max={100}
                required
                value={thresholdFour}
                onChange={(event) => setThresholdFour(event.target.value)}
                className="text-center"
              />
            </label>
            <label className={LABEL_CLASS}>
              <span className={LABEL_TEXT_CLASS}>{t("thresholdFive")}</span>
              <Input
                type="number"
                min={1}
                max={100}
                required
                value={thresholdFive}
                onChange={(event) => setThresholdFive(event.target.value)}
                className="text-center"
              />
            </label>
          </div>

          <div className="rounded-lg border border-dashed border-border/70 bg-muted/20 p-3">
            <p className={LABEL_TEXT_CLASS}>{t("previewTitle")}</p>
            {legendValid ? (
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1.5 text-xs">
                {legend.map((row) => (
                  <li key={row.grade} className="flex items-center gap-1.5">
                    <Badge
                      variant="outline"
                      className={`text-xs font-bold ${gradeBadgeClass(row.grade).badge}`}
                    >
                      {row.grade}
                    </Badge>
                    <span className="text-muted-foreground">
                      {row.from}–{row.to}%
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{t("previewInvalid")}</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Округление и действия */}
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-bold">{t("roundingTitle")}</CardTitle>
          <CardDescription className="text-xs">{t("roundingHint")}</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end justify-between gap-4">
          <label className={LABEL_CLASS}>
            <span className={LABEL_TEXT_CLASS}>{t("roundingLabel")}</span>
            <select
              value={rounding}
              onChange={(event) => setRounding(event.target.value as RoundingMode)}
              className={SELECT_CLASS}
            >
              {ROUNDING_MODES.map((mode) => (
                <option key={mode} value={mode}>
                  {tRounding(mode)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={resetToDefaults}
              className="gap-1.5 cursor-pointer"
            >
              <RotateCcw className="h-4 w-4" />
              {t("reset")}
            </Button>
            <Button
              type="submit"
              disabled={pending || !check.ok}
              title={check.ok ? undefined : t(`error.${check.error}`)}
              className="gap-1.5 cursor-pointer"
            >
              <Save className="h-4 w-4" />
              {t("save")}
            </Button>
          </div>
        </CardContent>
      </Card>
    </form>
  );
}
