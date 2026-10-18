-- CreateTable
CREATE TABLE "TelegramLink" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "telegramId" TEXT NOT NULL,
    "username" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramLink_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "TelegramLinkCode" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "expiresAt" DATETIME NOT NULL,
    "usedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "TelegramLinkCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_userId_key" ON "TelegramLink"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLink_telegramId_key" ON "TelegramLink"("telegramId");

-- CreateIndex
CREATE UNIQUE INDEX "TelegramLinkCode_code_key" ON "TelegramLinkCode"("code");

-- CreateIndex
CREATE INDEX "TelegramLinkCode_userId_idx" ON "TelegramLinkCode"("userId");
