export const treshhold = 0.001

// Iterations every simulation runs for. Was hardcoded as a literal 100 in the client
// and in each run endpoint; the evaluation logic in /api/battle/[id]/evaluate also
// treats "100 iterations" as "did not converge", so the value has to stay shared.
export const MAX_STEPS = 100

export const MAX_SUBMISSIONS = 2

export const WS_URL = process.env.NEXT_PUBLIC_BATTLE_WS_URL ?? "ws://localhost:3001"

export const READY_UP_TIME = 20_000 // time for a player to ready up

export const MATCH_HISTORY_LENGTH = 10