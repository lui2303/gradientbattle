-- CreateTable
CREATE TABLE "BattleRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "battleID" TEXT NOT NULL,
    "optimizers" JSONB NOT NULL,
    "lastIterate" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "iterations" INTEGER NOT NULL,
    CONSTRAINT "BattleRun_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BattleRun_battleID_fkey" FOREIGN KEY ("battleID") REFERENCES "Battle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
