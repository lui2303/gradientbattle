import "dotenv/config";

export const treshhold = 0.001

export const MAX_STEPS = 100

export const MAX_SUBMISSIONS = 2

export const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL ?? "ws://localhost:3001"

export const READY_UP_TIME = 20_000 // time for a player to ready up

export const MATCH_HISTORY_LENGTH = 10

export const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000"

export const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? ""

export const STALE_GRACE_MS = 2000 // time after endsAt before the sweeper can detect the run