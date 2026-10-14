/*
  Warnings:

  - Added the required column `classId` to the `ProposedGrade` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "ClassSettings" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "sasWeight" INTEGER NOT NULL DEFAULT 50,
    "satWeight" INTEGER NOT NULL DEFAULT 50,
    "formativeWeight" INTEGER NOT NULL DEFAULT 0,
    "thresholdThree" INTEGER NOT NULL DEFAULT 40,
    "thresholdFour" INTEGER NOT NULL DEFAULT 65,
    "thresholdFive" INTEGER NOT NULL DEFAULT 85,
    "maxSasPerQuarter" INTEGER NOT NULL DEFAULT 4,
    "maxSatPerQuarter" INTEGER NOT NULL DEFAULT 1,
    "rounding" TEXT NOT NULL DEFAULT 'HALF_UP',
    CONSTRAINT "ClassSettings_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Klass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Section" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "subjectId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "title" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "Section_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Assessment" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "classId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "teacherId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "sectionId" TEXT,
    "title" TEXT NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "maxScore" INTEGER NOT NULL,
    "quarter" INTEGER NOT NULL,
    CONSTRAINT "Assessment_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Klass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_teacherId_fkey" FOREIGN KEY ("teacherId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Assessment_sectionId_fkey" FOREIGN KEY ("sectionId") REFERENCES "Section" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Assessment" ("classId", "date", "id", "maxScore", "quarter", "subjectId", "teacherId", "title", "type") SELECT "classId", "date", "id", "maxScore", "quarter", "subjectId", "teacherId", "title", "type" FROM "Assessment";
DROP TABLE "Assessment";
ALTER TABLE "new_Assessment" RENAME TO "Assessment";
CREATE TABLE "new_ProposedGrade" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "studentId" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "classId" TEXT NOT NULL,
    "quarter" INTEGER NOT NULL,
    "value" INTEGER NOT NULL,
    "basis" TEXT NOT NULL DEFAULT 'activity',
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "createdById" TEXT NOT NULL,
    CONSTRAINT "ProposedGrade_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProposedGrade_subjectId_fkey" FOREIGN KEY ("subjectId") REFERENCES "Subject" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProposedGrade_classId_fkey" FOREIGN KEY ("classId") REFERENCES "Klass" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "ProposedGrade_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ProposedGrade" ("basis", "createdById", "id", "quarter", "status", "studentId", "subjectId", "value") SELECT "basis", "createdById", "id", "quarter", "status", "studentId", "subjectId", "value" FROM "ProposedGrade";
DROP TABLE "ProposedGrade";
ALTER TABLE "new_ProposedGrade" RENAME TO "ProposedGrade";
CREATE UNIQUE INDEX "ProposedGrade_studentId_subjectId_quarter_basis_key" ON "ProposedGrade"("studentId", "subjectId", "quarter", "basis");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "ClassSettings_classId_key" ON "ClassSettings"("classId");
