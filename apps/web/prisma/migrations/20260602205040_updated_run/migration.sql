/*
  Warnings:

  - Added the required column `lastIterate` to the `Run` table without a default value. This is not possible if the table is not empty.

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
    "challengeID" INTEGER,
    "lastIterate" JSONB NOT NULL
);
INSERT INTO "new_Run" ("bestRun", "challengeID", "createdAt", "funcName", "id", "optimizers", "steps") SELECT "bestRun", "challengeID", "createdAt", "funcName", "id", "optimizers", "steps" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
