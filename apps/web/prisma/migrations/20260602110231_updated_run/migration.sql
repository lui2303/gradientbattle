/*
  Warnings:

  - You are about to drop the column `traces` on the `Run` table. All the data in the column will be lost.
  - Added the required column `funcName` to the `Run` table without a default value. This is not possible if the table is not empty.
  - Added the required column `optimizers` to the `Run` table without a default value. This is not possible if the table is not empty.
  - Added the required column `steps` to the `Run` table without a default value. This is not possible if the table is not empty.

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
    "challengeID" INTEGER
);
INSERT INTO "new_Run" ("bestRun", "challengeID", "createdAt", "id") SELECT "bestRun", "challengeID", "createdAt", "id" FROM "Run";
DROP TABLE "Run";
ALTER TABLE "new_Run" RENAME TO "Run";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
