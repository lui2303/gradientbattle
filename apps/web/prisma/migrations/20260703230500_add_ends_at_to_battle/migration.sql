/*
  Warnings:

  - Added the required column `endsAt` to the `Battle` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Battle" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "startedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endsAt" DATETIME NOT NULL,
    "status" TEXT NOT NULL,
    "player1Id" TEXT NOT NULL,
    "player2Id" TEXT NOT NULL,
    "winnerId" TEXT,
    "game" JSONB NOT NULL,
    "winningRunId" TEXT,
    CONSTRAINT "Battle_player1Id_fkey" FOREIGN KEY ("player1Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_player2Id_fkey" FOREIGN KEY ("player2Id") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Battle_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User" ("id") ON DELETE SET NULL ON UPDATE CASCADE,
    CONSTRAINT "Battle_winningRunId_fkey" FOREIGN KEY ("winningRunId") REFERENCES "BattleRun" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);
INSERT INTO "new_Battle" ("game", "id", "player1Id", "player2Id", "startedAt", "status", "winnerId", "winningRunId") SELECT "game", "id", "player1Id", "player2Id", "startedAt", "status", "winnerId", "winningRunId" FROM "Battle";
DROP TABLE "Battle";
ALTER TABLE "new_Battle" RENAME TO "Battle";
CREATE UNIQUE INDEX "Battle_winningRunId_key" ON "Battle"("winningRunId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
