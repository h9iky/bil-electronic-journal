"use client";

import { useState, useTransition, type FormEvent, type ReactNode } from "react";
import { useTranslations } from "next-intl";
import { Award, Check, Pencil, RotateCcw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { deleteProposal, saveProposal, setProposalStatus } from "@/lib/actions/journal";
import {
  GRADE_MAX,
  GRADE_MIN,
  PROPOSAL_BASES,
  type ProposalBasis,
  type ProposalStatus,
} from "@/lib/constants";
import { gradeBadgeClass } from "@/components/dashboard/badges";

export interface ProposalCellData {
  value: number;
  basis: ProposalBasis;
  status: ProposalStatus;
}

interface ProposalCellProps {
  teachingId: string;
  studentId: string;
  studentName: string;
  quarter: number;
  /** Формульный итог — подсказка значения по умолчанию. */
  suggestion: number | null;
  proposal: ProposalCellData | null;
}

const SELECT_CLASS =
  "h-9 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Оценки 2..5 для выбора в рекомендации. */
const GRADES = Array.from({ length: GRADE_MAX - GRADE_MIN + 1 }, (_, i) => GRADE_MIN + i);

const STATUS_CLASS: Record<ProposalStatus, string> = {
  PENDING: "bg-amber-500/10 text-amber-700 border-amber-500/30 dark:text-amber-400",
  ACCEPTED: "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400",
  REJECTED: "bg-destructive/10 text-destructive border-destructive/30",
};

const STATUS_TOAST: Record<ProposalStatus, string> = {
  PENDING: "proposalReset",
  ACCEPTED: "proposalAccepted",
  REJECTED: "proposalRejected",
};

/** Крошечная иконочная кнопка для строки таблицы. */
function CellIcon({
  title,
  onClick,
  children,
  danger = false,
}: {
  title: string;
  onClick: () => void;
  children: ReactNode;
  danger?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon-xs"
      onClick={onClick}
      title={title}
      className={`cursor-pointer text-muted-foreground ${
        danger ? "hover:text-destructive" : "hover:text-foreground"
      }`}
    >
      {children}
    </Button>
  );
}

/**
 * «Потенциальная оценка» в строке ученика: учитель даёт рекомендацию на основе
 * активности/поведения и сам решает — применить её или отклонить (§6.5).
 */
export function ProposalCell({
  teachingId,
  studentId,
  studentName,
  quarter,
  suggestion,
  proposal,
}: ProposalCellProps) {
  const t = useTranslations("journal");
  const tStatus = useTranslations("proposalStatus");
  const tBasis = useTranslations("proposalBasis");
  const { toast } = useToast();

  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(GRADE_MIN);
  const [basis, setBasis] = useState<ProposalBasis>("activity");

  function openDialog() {
    setValue(proposal?.value ?? suggestion ?? GRADE_MIN);
    setBasis(proposal?.basis ?? "activity");
    setOpen(true);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    startTransition(async () => {
      const result = await saveProposal({ teachingId, studentId, quarter, value, basis });
      if (result.ok) {
        setOpen(false);
        toast(t(proposal ? "proposalUpdated" : "proposalCreated"));
      } else {
        toast(t(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  function decide(status: ProposalStatus) {
    startTransition(async () => {
      const result = await setProposalStatus({ teachingId, studentId, quarter, status });
      if (result.ok) toast(t(STATUS_TOAST[status]));
      else toast(t(`error.${result.error ?? "unknown"}`), "error");
    });
  }

  function remove() {
    if (!window.confirm(t("proposalDeleteConfirm"))) return;
    startTransition(async () => {
      const result = await deleteProposal({ teachingId, studentId, quarter });
      if (result.ok) toast(t("proposalDeleted"));
      else toast(t(`error.${result.error ?? "unknown"}`), "error");
    });
  }

  return (
    <>
      {proposal ? (
        <div className="flex flex-wrap items-center justify-center gap-1">
          <Badge
            variant="outline"
            className={`text-xs font-bold ${gradeBadgeClass(proposal.value).badge}`}
          >
            {proposal.value}
          </Badge>
          <Badge
            variant="outline"
            className={`text-[10px] ${STATUS_CLASS[proposal.status]}`}
            title={tBasis(proposal.basis)}
          >
            {tStatus(proposal.status)}
          </Badge>
          <div className="flex items-center">
            {proposal.status === "PENDING" ? (
              <>
                <CellIcon title={t("accept")} onClick={() => decide("ACCEPTED")}>
                  <Check className="h-3.5 w-3.5" />
                </CellIcon>
                <CellIcon title={t("reject")} onClick={() => decide("REJECTED")} danger>
                  <X className="h-3.5 w-3.5" />
                </CellIcon>
              </>
            ) : (
              <CellIcon title={t("resetProposal")} onClick={() => decide("PENDING")}>
                <RotateCcw className="h-3.5 w-3.5" />
              </CellIcon>
            )}
            <CellIcon title={t("edit")} onClick={openDialog}>
              <Pencil className="h-3 w-3" />
            </CellIcon>
            <CellIcon title={t("delete")} onClick={remove} danger>
              <Trash2 className="h-3.5 w-3.5" />
            </CellIcon>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon-xs"
          disabled={pending}
          onClick={openDialog}
          title={t("recommend")}
          className="cursor-pointer text-muted-foreground hover:text-primary"
        >
          <Award className="h-3.5 w-3.5" />
        </Button>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-xs">
          <DialogHeader>
            <DialogTitle>{t("proposalTitle")}</DialogTitle>
            <DialogDescription>
              {t("proposalDesc", { student: studentName })}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {t("proposalValue")}
              </span>
              <select
                value={value}
                onChange={(event) => setValue(Number(event.target.value))}
                className={SELECT_CLASS}
              >
                {GRADES.map((grade) => (
                  <option key={grade} value={grade}>
                    {grade}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex flex-col gap-1">
              <span className="text-xs font-semibold uppercase text-muted-foreground">
                {t("proposalBasis")}
              </span>
              <select
                value={basis}
                onChange={(event) => setBasis(event.target.value as ProposalBasis)}
                className={SELECT_CLASS}
              >
                {PROPOSAL_BASES.map((option) => (
                  <option key={option} value={option}>
                    {tBasis(option)}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                className="cursor-pointer"
              >
                {t("cancel")}
              </Button>
              <Button type="submit" disabled={pending} className="cursor-pointer">
                {t("save")}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
