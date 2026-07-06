-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT,
    "elo" INTEGER NOT NULL DEFAULT 400,
    "peakElo" INTEGER NOT NULL DEFAULT 400,
    "gamesPlayed" INTEGER NOT NULL DEFAULT 0,
    "email" TEXT,
    "emailVerified" DATETIME,
    "image" TEXT
);
INSERT INTO "new_User" ("elo", "email", "emailVerified", "id", "image", "name") SELECT "elo", "email", "emailVerified", "id", "image", "name" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
