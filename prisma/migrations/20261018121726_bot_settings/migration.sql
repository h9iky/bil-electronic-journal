-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_TelegramLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "locale" TEXT NOT NULL DEFAULT 'ru',
    "digestEnabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_TelegramLink" ("createdAt", "id", "telegramId", "userId", "username") SELECT "createdAt", "id", "telegramId", "userId", "username" FROM "TelegramLink";
DROP TABLE "TelegramLink";
ALTER TABLE "new_TelegramLink" RENAME TO "TelegramLink";
CREATE UNIQUE INDEX "TelegramLink_userId_key" ON "TelegramLink"("userId");
CREATE UNIQUE INDEX "TelegramLink_telegramId_key" ON "TelegramLink"("telegramId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
