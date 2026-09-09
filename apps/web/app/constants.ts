import "dotenv/config";

export const treshhold = 0.001

export const MAX_STEPS = 100

export const MAX_SUBMISSIONS = 2

export const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL || "ws://localhost:3001"

export const READY_UP_TIME = 20_000 // time for a player to ready up

export const MATCH_HISTORY_LENGTH = 10

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000"

export const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? ""

export const STALE_GRACE_MS = 2000 // time after endsAt before the sweeper can detect the run

export const MAX_OPTIMIZERS = 5 // max number of optimizers allowed for submission in free for all mode

// Shared budget for every API route: 80 requests per client per 5 minutes. The window
// is a fixed one, so a client can spend two full budgets across a window boundary —
// the point is to bound sustained abuse of the simulation endpoints, not to police bursts.
export const RATE_LIMIT_MAX_REQUESTS = 80

export const RATE_LIMIT_WINDOW_SECONDS = 300
