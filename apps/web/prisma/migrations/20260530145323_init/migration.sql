-- CreateTable
CREATE TABLE "LeaderboardEntry" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "iterations" INTEGER NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "LeaderboardEntry_name_key" ON "LeaderboardEntry"("name");
