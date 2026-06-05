-- CreateTable
CREATE TABLE "ChallengeRun" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "username" TEXT NOT NULL,
    "optimizers" JSONB NOT NULL,
    "lastIterate" JSONB NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "challengeID" INTEGER NOT NULL,
    "iterations" INTEGER NOT NULL,
    CONSTRAINT "ChallengeRun_challengeID_fkey" FOREIGN KEY ("challengeID") REFERENCES "Challenge" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
