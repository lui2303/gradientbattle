#!/usr/bin/env bash
# Postgres   -> :5433  (docker compose service, data kept in a named volume)
# Redis      -> :6379  (ephemeral, no persistence files written to the repo)
# Web (Next) -> :3000
# Battle WS  -> :3001
set -euo pipefail

cd "$(dirname "$0")" # repo root

pids=()
started_postgres="" # set only if *we* brought the container up, so we only stop what we started

cleanup() {
    echo
    echo "Shutting down..."
    # kill the whole process group of each child so pnpm's nested next/tsx die too
    for pid in "${pids[@]}"; do
        kill -- -"$pid" 2>/dev/null || kill "$pid" 2>/dev/null || true
    done
    wait 2>/dev/null || true
    # Stop (not remove) the container — the gradientbattle-postgres volume keeps the data.
    # Left running if it was already up before us: it may well be someone else's.
    if [[ -n "$started_postgres" ]]; then
        docker compose stop postgres >/dev/null 2>&1 || true
    fi
}
trap cleanup INT TERM EXIT

# Each child runs in its own process group (setsid) so cleanup can take down the
# whole tree — pnpm spawns next/tsx as grandchildren that a plain kill would orphan.
start() {
    setsid "$@" &
    pids+=($!)
}

# Postgres: the docker compose service on host port 5433, matching DATABASE_URL in
# apps/web/.env. This script runs both on the host and inside the devcontainer, and
# that container has no docker CLI — but it does run with --network=host, so the same
# :5433 is reachable either way. Hence: probe the port first, and only reach for
# docker when nothing is listening.
postgres_listening() {
    (exec 3<>/dev/tcp/localhost/5433) >/dev/null 2>&1
}

if postgres_listening; then
    : # already up (started on the host, or by a previous run) — nothing to do
elif command -v docker >/dev/null 2>&1; then
    # --wait blocks on the container's pg_isready healthcheck, so the web app never
    # races a server that is listening but not yet accepting queries.
    if ! docker compose up -d --wait postgres; then
        echo "Failed to start the postgres container — is Docker running?" >&2
        exit 1
    fi
    started_postgres=1
else
    echo "Nothing is listening on :5433 and there is no docker CLI here" >&2
    echo "(you are probably in the devcontainer). Start it from the host with:" >&2
    echo "    docker compose up -d postgres" >&2
    exit 1
fi

# Redis: ephemeral dev instance — no RDB/AOF files dumped into the repo.
start redis-server --port 6379 --save "" --appendonly no
# Next.js dev server (:3000)
start pnpm --filter web dev
# Battle WebSocket server (:3001) — reads AUTH_SECRET from apps/web/.env
start pnpm --filter web battle

echo "postgres :5433 | redis :6379 | web :3000 | battle :3001  (Ctrl-C to stop all)"

# Exit (and tear everything down) as soon as any one of them dies.
wait -n
