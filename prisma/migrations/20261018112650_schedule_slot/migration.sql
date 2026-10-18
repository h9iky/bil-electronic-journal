-- CreateTable
CREATE TABLE "ScheduleSlot" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "dayOfWeek" INTEGER NOT NULL,
    "lessonNumber" INTEGER NOT NULL,
    "subjectId" TEXT NOT NULL,
    CONSTRAINT "ScheduleSlot_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Klass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ScheduleSlot_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "ScheduleSlot_classId_dayOfWeek_lessonNumber_key" ON "ScheduleSlot"("classId", "dayOfWeek", "lessonNumber");
