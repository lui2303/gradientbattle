/*
  Warnings:

  - You are about to drop the column `iterations` on the `BattleRun` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_BattleRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "playerId" TEXT NOT NULL,
    "battleID" TEXT NOT NULL,
    "optimizers" JSONB NOT NULL,
    "lastIterate" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "bestRun" JSONB,
    CONSTRAINT "BattleRun_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "BattleRun_battleID_fkey" FOREIGN KEY ("battleID") REFERENCES "Battle" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_BattleRun" ("battleID", "createdAt", "id", "lastIterate", "optimizers", "playerId") SELECT "battleID", "createdAt", "id", "lastIterate", "optimizers", "playerId" FROM "BattleRun";
DROP TABLE "BattleRun";
ALTER TABLE "new_BattleRun" RENAME TO "BattleRun";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
