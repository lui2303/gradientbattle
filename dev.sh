# Redis      -> :6379  (ephemeral, no persistence files written to the repo)
# Web (Next) -> :3000
# Battle WS  -> :3001
set -euo pipefail

cd "$(dirname "$0")" # repo root

pids=()

cleanup() {
    echo
    echo "Shutting down..."
    # kill the whole process group of each child so pnpm's nested next/tsx die too
    for pid in "${pids[@]}"; do
        kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# Each child runs in its own process group (setsid) so cleanup can take down the
# whole tree — pnpm spawns next/tsx as grandchildren that a plain kill would orphan.
start() {
    setsid "$@" &
    pids+=($!)
}

# Postgres is not started here — bring it up with `docker compose up -d postgres`
# (host port 5433, matching DATABASE_URL in apps/web/.env).

# Redis: ephemeral dev instance — no RDB/AOF files dumped into the repo.
start redis-server --port 6379 --save "" --appendonly no
# Next.js dev server (:3000)
start pnpm --filter web dev
# Battle WebSocket server (:3001) — reads AUTH_SECRET from apps/web/.env
start pnpm --filter web battle

echo "redis :6379 | web :3000 | battle :3001  (Ctrl-C to stop all)"

# Exit (and tear everything down) as soon as any one of them dies.
wait -n
