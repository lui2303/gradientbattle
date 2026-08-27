#!/usr/bin/env bash
# Pull the image CI published to GHCR and restart the stack. Runs on the server,
# next to docker-compose.prod.yaml — nothing is built here.
#
#   ./deploy.sh              -> latest (whatever main last built)
#   ./deploy.sh sha-abc1234  -> a specific build (this is also the rollback)
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE=(docker compose -f docker-compose.prod.yaml)

# Exported so compose can interpolate ${TAG} in docker-compose.prod.yaml. Nothing
# is written to disk: the deployed build is not stored here, it is reported by
# /health below.
export TAG="${1:-latest}"

# Best effort: a failure here just means the stack is down, which is not a reason
# to refuse to deploy.
revision() {
    "${COMPOSE[@]}" exec -T battle curl -fsS localhost:3001/health 2>/dev/null \
        | sed -n 's/.*"revision":"\([^"]*\)".*/\1/p'
}

echo "==> deploying $TAG (currently running: $(revision || true))"

"${COMPOSE[@]}" pull

# `migrate` runs prisma migrate deploy to completion before web starts, so a
# failed migration aborts here and leaves the old containers serving.
"${COMPOSE[@]}" up -d

# The containers are up once `up -d` returns, but the servers inside them are
# not necessarily accepting requests yet.
for _ in $(seq 30); do
    if now="$(revision)" && [[ -n "$now" ]]; then
        echo "==> up: $TAG (revision $now)"
        exit 0
    fi
    sleep 2
done

echo "==> $TAG deployed but /health did not respond within 60s" >&2
"${COMPOSE[@]}" ps
exit 1
