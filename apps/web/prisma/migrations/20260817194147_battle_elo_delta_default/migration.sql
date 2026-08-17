-- Backfill before the NOT NULL constraint: 11 rows predate the elo-delta columns and
-- hold NULL. SET NOT NULL rejects them outright, so they are collapsed to 0 first.
-- These are battles whose real rating change is unknown, not zero — the column stops
-- distinguishing "unrated" from "rated, no change" from here on.
UPDATE "Battle" SET "player1EloDelta" = 0 WHERE "player1EloDelta" IS NULL;
UPDATE "Battle" SET "player2EloDelta" = 0 WHERE "player2EloDelta" IS NULL;

-- AlterTable
ALTER TABLE "Battle" ALTER COLUMN "player1EloDelta" SET NOT NULL,
ALTER COLUMN "player1EloDelta" SET DEFAULT 0,
ALTER COLUMN "player2EloDelta" SET NOT NULL,
ALTER COLUMN "player2EloDelta" SET DEFAULT 0;
