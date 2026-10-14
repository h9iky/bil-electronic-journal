"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { CalendarCheck } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { useRouter } from "@/i18n/navigation";
import { deleteAttendance, saveAttendance } from "@/lib/actions/journal";
import { ATTENDANCE_STATUSES, type AttendanceStatus } from "@/lib/constants";

interface AttendanceBoardProps {
  teachingId: string;
  quarter: number;
  /** День в формате `yyyy-mm-dd`. */
  date: string;
  students: { id: string; fullName: string }[];
  statuses: Record<string, AttendanceStatus>;
  summary: Record<AttendanceStatus, number>;
}

const SELECT_CLASS =
  "h-8 rounded-lg border border-input bg-transparent px-2 text-xs outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

/** Цвет текста селекта по статусу. */
const STATUS_TEXT: Record<AttendanceStatus, string> = {
  PRESENT: "text-emerald-600 dark:text-emerald-400",
  ABSENT: "text-destructive",
  LATE: "text-amber-600 dark:text-amber-400",
  EXCUSED: "text-blue-600 dark:text-blue-400",
};

/** Цвет «чипа» сводки. */
const STATUS_CHIP: Record<AttendanceStatus, string> = {
  PRESENT: "border-emerald-500/40 text-emerald-600 bg-emerald-500/5",
  ABSENT: "border-destructive/40 text-destructive bg-destructive/5",
  LATE: "border-amber-500/40 text-amber-700 bg-amber-500/5",
  EXCUSED: "border-blue-500/40 text-blue-600 bg-blue-500/5",
};

/**
 * Посещаемость класса на конкретный день.
 *
 * День живёт в URL (`?date=`), поэтому навигация по дням — обычный переход
 * страницы, а отметки приходят с сервера. Локальный `marks` даёт мгновенный
 * отклик и откатывается, если экшен вернул ошибку.
 */
export function AttendanceBoard({
  teachingId,
  quarter,
  date,
  students,
  statuses,
  summary,
}: AttendanceBoardProps) {
  const t = useTranslations("attendance");
  const tJournal = useTranslations("journal");
  const { toast } = useToast();
  const router = useRouter();

  const [pending, startTransition] = useTransition();
  const [day, setDay] = useState(date);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>(statuses);

  function changeDay(next: string) {
    setDay(next);
    router.push({
      pathname: "/dashboard/journal",
      query: { teaching: teachingId, quarter, date: next },
    });
  }

  function mark(studentId: string, next: AttendanceStatus | "") {
    const previous = marks[studentId];
    setMarks((current) => {
      const copy = { ...current };
      if (next === "") delete copy[studentId];
      else copy[studentId] = next;
      return copy;
    });

    startTransition(async () => {
      const result =
        next === ""
          ? await deleteAttendance({ teachingId, studentId, date: day })
          : await saveAttendance({ teachingId, studentId, date: day, status: next });

      if (!result.ok) {
        setMarks((current) => {
          const copy = { ...current };
          if (previous === undefined) delete copy[studentId];
          else copy[studentId] = previous;
          return copy;
        });
        toast(tJournal(`error.${result.error ?? "unknown"}`), "error");
      }
    });
  }

  return (
    <Card className="border-border/60">
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2 text-base font-bold">
              <CalendarCheck className="h-4 w-4 text-primary" />
              {t("title")}
            </CardTitle>
            <CardDescription className="text-xs">{t("desc")}</CardDescription>
          </div>
          <input
            type="date"
            value={day}
            onChange={(event) => changeDay(event.target.value)}
            className={SELECT_CLASS}
          />
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {ATTENDANCE_STATUSES.map((status) => (
            <span
              key={status}
              className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${STATUS_CHIP[status]}`}
            >
              {t(`status.${status}`)}: {summary[status]}
            </span>
          ))}
        </div>
      </CardHeader>

      <CardContent className="p-0">
        {students.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{tJournal("noStudents")}</p>
        ) : (
          <ul className="divide-y divide-border/60">
            {students.map((student) => {
              const current = marks[student.id] ?? "";
              return (
                <li
                  key={student.id}
                  className="flex items-center justify-between gap-3 px-4 py-2 transition hover:bg-muted/20"
                >
                  <span className="text-sm font-medium">{student.fullName}</span>
                  <select
                    value={current}
                    disabled={pending}
                    onChange={(event) =>
                      mark(student.id, event.target.value as AttendanceStatus | "")
                    }
                    className={`${SELECT_CLASS} ${
                      current ? STATUS_TEXT[current as AttendanceStatus] : "text-muted-foreground"
                    }`}
                  >
                    <option value="">{t("none")}</option>
                    {ATTENDANCE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {t(`status.${status}`)}
                      </option>
                    ))}
                  </select>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
