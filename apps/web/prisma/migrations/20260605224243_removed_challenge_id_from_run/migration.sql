/*
  Warnings:

  - You are about to drop the column `challengeID` on the `Run` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Run" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "optimizers" JSONB NOT NULL,
    "steps" INTEGER NOT NULL,
    "funcName" TEXT NOT NULL,
    "bestRun" JSONB,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastIterate" JSONB NOT NULL
);
INSERT INTO "new_Run" ("bestRun", "createdAt", "funcName", "id", "lastIterate", "optimizers", "steps") SELECT "bestRun", "createdAt", "funcName", "id", "lastIterate", "optimizers", "steps" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
