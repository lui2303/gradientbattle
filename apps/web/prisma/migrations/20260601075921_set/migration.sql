/*
  Warnings:

  - You are about to drop the column `iterations` on the `Run` table. All the data in the column will be lost.

*/
-- CreateTable
CREATE TABLE "Challenge" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "params" JSONB
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "traces" JSONB NOT NULL,
    "bestRun" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "challengeID" INTEGER
);
INSERT INTO "new_Run" ("challengeID", "createdAt", "id", "traces") SELECT "challengeID", "createdAt", "id", "traces" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
