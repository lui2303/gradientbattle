/*
  Warnings:

  - You are about to drop the `LeaderboardEntry` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "LeaderboardEntry";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Leaderboard" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL,
    "challengeID" INTEGER NOT NULL
);
