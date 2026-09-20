<p align="center">
  <a href="https://gradientbattle.com"><img src="apps/web/app/icon.svg" width="72" alt="gradientbattle logo"></a>
</p>

<h1 align="center"><a href="https://gradientbattle.com">gradientbattle.com</a></h1>

<p align="center">
  Tune gradient-descent optimizers and race them to the minimum — alone, or against another player in a ranked, Elo-rated battle.
</p>

<p align="center">
  <a href="https://github.com/lui2303/gradientbattle/actions/workflows/ci.yml"><img alt="CI status" src="https://img.shields.io/github/actions/workflow/status/lui2303/gradientbattle/ci.yml?branch=main&amp;label=CI&amp;logo=githubactions&amp;logoColor=white"></a>
  <a href="apps/web/tsconfig.json"><img alt="TypeScript, strict mode" src="https://img.shields.io/badge/TypeScript-strict-3178c6?logo=typescript&amp;logoColor=white"></a>
  <a href="apps/web/package.json"><picture>
    <source media="(prefers-color-scheme: dark)" srcset="https://img.shields.io/badge/Next.js-16-ffffff?logo=nextdotjs&amp;logoColor=white">
    <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-000000?logo=nextdotjs&amp;logoColor=white">
  </picture></a>
  <a href="docker-compose.prod.yaml"><img alt="PostgreSQL 17" src="https://img.shields.io/badge/PostgreSQL-17-4169e1?logo=postgresql&amp;logoColor=white"></a>
  <a href="docker-compose.prod.yaml"><img alt="Redis 7" src="https://img.shields.io/badge/Redis-7-dc382d?logo=redis&amp;logoColor=white"></a>
  <a href="Dockerfile"><img alt="Docker, multi-stage build" src="https://img.shields.io/badge/Docker-multi--stage-2496ed?logo=docker&amp;logoColor=white"></a>
</p>

<p align="center">
  <img src="docs/screenshots/hero.png" alt="Free play: Gradient Descent, Adam and Momentum racing on the quadratic bowl from different starting points, with the trajectory, distance-to-optimum and objective-value plots, the live leaderboard and the three optimizer cards" width="1000">
</p>


In **free play** anyone can run up to five optimizers (Gradient Descent, Momentum, AdaGrad, RMSProp, Adam) side by side on a 2-D objective with custom parameters and starting points, while three synchronized plots animate the trajectory on a contour plot, the distance to the optimum and the objective value.

In **ranked battle** mode two signed-in players are matched within an Elo window over a WebSocket, receive the same randomly generated optimizer configuration, parts of which are pinned by the server, and have two minutes and $k$ submissions each to reach the minimum in the fewest steps, with the last step of the run counting.

Every trajectory is computed on the server. A battle is settled by one idempotent database transaction. The whole application, that is web app, WebSocket server, sweeper and migrations, ships as one Docker image that CI builds, SHA-tags and uploads to GHCR on every push to `main`.

Built solo, after work, between March and September 2026: about 3,000 lines of TypeScript, plus the compose, Caddy, Docker and CI configuration. The count excludes AI-generated code, see the [declaration of AI use](#declaration-of-ai-use).

## Contents

- [Architecture](#architecture)
- [Engineering decisions](#engineering-decisions)
- [Ranked battles](#ranked-battles)
- [Simulation pipeline](#simulation-pipeline)
- [Authentication and security](#authentication-and-security)
- [Data model](#data-model)
- [Infrastructure and deployment](#infrastructure-and-deployment)
- [Observability](#observability)
- [Local development](#local-development)
- [Known limitations and roadmap](#known-limitations-and-roadmap)
- [Declaration of AI use](#declaration-of-ai-use)

## Architecture

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagrams/architecture-dark.svg">
  <img alt="System architecture: Caddy terminates TLS and routes /ws to the WebSocket server and everything else to Next.js; both talk to Redis and PostgreSQL; a sweeper and a migration job run from the same image" src="docs/diagrams/architecture-light.svg" width="1000">
</picture>

| Service    | Runtime                                       | Responsibility                                                                                                                                                                                                                 |
| ---------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `caddy`    | Caddy 2                                       | The only container that publishes ports (:80/:443), with automatic TLS. Routes `/ws` to the battle server and everything else to Next.js, compresses responses, sets security headers and a request-body cap, redirects `www`. |
| `web`      | Next.js 16, React 19, Node 24                 | App Router pages, route handlers, NextAuth v5 with the GitHub provider, a deny-by-default `proxy.ts`, Prisma 7 against PostgreSQL, Redis-backed rate limiting.                                                                 |
| `battle`   | `node:http` + `ws`                            | Long-lived WebSocket server for matchmaking, ready-up, random game generation and result fan-out. Holds one in-process `Map<userId, socket>` plus the 20 s ready-up timer; all other state lives in Redis or PostgreSQL.       |
| `sweep`    | shell loop around `scripts/battle_sweeper.ts` | Every 30 s calls the evaluate endpoint, with the service token, for battles that are past their deadline and not yet evaluated.                                                                                                |
| `migrate`  | `prisma migrate deploy`                       | One-shot container. `web` depends on it completing successfully, so new code never serves against an old schema.                                                                                                               |
| `postgres` | PostgreSQL 17                                 | Users, battles, submissions, free-play runs, OAuth accounts.                                                                                                                                                                   |
| `redis`    | Redis 7                                       | Matchmaking queue, live battle hashes, ready flags, submission counters, rate-limit windows. Reachable only on the compose network.                                                                                            |

## Engineering decisions

- **Compute on the server, replay on the client.** Trajectories are cheap, but a battle result must not depend on client code. Returning the full trajectory also made the client simple: it replays instead of simulating. The cost is one round trip before the animation starts.
- **Redis for what is live, PostgreSQL for what is true.** Queue membership, ready flags and the running battle are short-lived and are consulted on nearly every socket message. The battle hash, the user pointer and the ready flag carry TTLs, so a battle that dies midway cleans itself up. The queue has no TTL: entries leave on abort or disconnect, and the whole key is cleared when the battle server starts.
- **JWT sessions instead of database sessions.** `proxy.ts` runs in front of every matched request and the WebSocket server is a separate process. A self-contained session that both can verify with one shared secret keeps a database lookup out of either hot path. The trade-off is that revocation is not immediate.
- **Client-triggered evaluation with a sweeper, not a server timer.** The first version scheduled evaluation with `setTimeout` inside the socket server, and a restart orphaned every running battle. Now the client asks when its countdown ends, settlement is idempotent, and the sweeper catches whoever never asked.
- **A separate WebSocket process rather than a custom Next server.** `next start` stays stock, and the socket server restarts and is health-checked independently. Caddy makes the split invisible to the browser.
- **Durations, not timestamps.** The server's `SYNC` reply carries the remaining milliseconds instead of the absolute deadline, so the client never compares its own wall clock to a server timestamp. The countdown turns that into a local deadline and recomputes from `Date.now()` every 250 ms. A fast client clock cannot settle early, because both the socket server and the evaluate route re-check the deadline.
- **Fixed-window rate limiting.** A sliding window would be fairer at window boundaries. The goal was to bound sustained abuse of the simulation endpoints with one Redis round trip, not to police bursts.
- **FIDE-style Elo with a three-tier K.** Simple and explainable for a small player base; the K schedule lets new accounts converge quickly. Glicko-2 is the planned replacement once rating uncertainty matters.

## Ranked battles

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagrams/battle-flow-dark.svg">
  <img alt="Sequence diagram of a ranked battle: matchmaking on a Redis sorted set, ready-up with a 20 second timer, a 120 second running phase with server-side simulation, and a transactional evaluation with Elo update" src="docs/diagrams/battle-flow-light.svg" width="1000">
</picture>

### Game generation

`generateRankedGame()` builds one configuration that both players must play. The optimizers have the following probabilities of being available in a battle:

| Optimizer        | Chance of being available |
| ---------------- | ------------------------- |
| Gradient Descent | 100 %                     |
| Momentum         | 95 %                      |
| AdaGrad          | 80 %                      |
| RMSProp          | 70 %                      |
| Adam             | 30 %                      |

For every included optimizer the starting point is pinned to a random point in $[5, 10]^2$ with probability ½; otherwise the player chooses it. Except for plain Gradient Descent, each hyper-parameter is independently pinned at its default with probability ½. The UI shows pinned fields with a lock icon. On submission the server rejects any optimizer or pinned/free pattern that differs from the stored game with a 422, and overwrites pinned values with the stored ones.

### Evaluation and scoring

When the countdown reaches zero the client sends `EVALUATE`, up to five times in total with exponential backoff (500 ms, 1 s, 2 s, 4 s between sends), stopping once `BATTLE_RESULT` arrives. The socket server checks that `gameEndsAt` has passed and calls `GET /api/battle/:id/evaluate` with the internal service token. The route also accepts a call from a signed-in participant. It then works in this order:

1. **Fast path.** A battle that is already `evaluated` returns its stored result. Otherwise the deadline is re-checked.
2. **Ranking.** Each player's best submission is the one with the fewest steps to $\lVert x \rVert_2 < 10^{-3}$. A run that never converged counts as 100 steps and is tie-broken by its final distance. Comparing the two best runs yields the winner or a draw. If only one player submitted, that player wins. These are plain reads outside the transaction; new submissions are refused once the deadline has passed.
3. **Settlement, in one Prisma transaction.** `updateMany({ where: { id, status: { not: "evaluated" } }, … })` claims the battle. A count of 0 means another request got there first, and the stored result is returned in the same response shape. The claiming request then updates both users' `elo`, `peakElo` and `gamesPlayed` and stores the per-player deltas and pre-battle ratings on the battle row. A battle where nobody submitted is deleted, changes no rating and has no summary page.

Elo uses a three-tier K-factor (`elo.ts`): $K = 40$ for players with fewer than 30 games, $K = 10$ once a player's peak rating has reached 1300, and $K = 20$ otherwise. With $E_A = 1 / (1 + 10^{(R_B - R_A)/400})$ each player's change is $\mathrm{round}(K (S - E))$. Two new 400-rated players therefore exchange ±20. Each player uses their own K, so an update is not zero-sum across tiers.

The socket server then marks the hash `BATTLE_ENDED`, resets the TTL of the hash and both `user:{id}` pointers to a 120 s grace period so a late `SYNC` still finds the result, and pushes `BATTLE_RESULT` to both players. The page refreshes into a server-rendered **summary**: outcome, Elo before → after, every submission of both players with its parameters, steps and best distance, and a comparison plot. The summary returns 404 to anyone who was not a participant. The match history on `/battle` lists the last ten battles with their Elo delta, and the public ladder at `/leaderboards/battle` shows the top twenty players.

### Redis keys

| Key                                | Type                                    | Purpose                                           | TTL                                    |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------- | -------------------------------------- |
| `queue`                            | ZSET, score = Elo, member = `user:{id}` | matchmaking                                       | none; cleared on server start          |
| `battle:{id}`                      | HASH                                    | live state, players, game JSON, deadlines, winner | 143 s, reset to 120 s after the result |
| `user:{id}`                        | STRING → battle id                      | which battle a user is in                         | same as the battle                     |
| `ready:{userId}`                   | STRING                                  | idempotent ready-up                               | 20 s                                   |
| `battle:{id}:submissions:{userId}` | counter                                 | submission cap                                    | 130 s                                  |
| `rate:{scope}:{identity}:{window}` | counter                                 | fixed-window rate limit                           | 300 s                                  |

<details>
<summary><strong>Message protocol</strong></summary>

Messages are discriminated unions over numeric enums shared by client and server (`app/types.ts`).

| Client → server | Meaning                                            |
| --------------- | -------------------------------------------------- |
| `FIND_OPPONENT` | Join the queue, or re-sync if already in a battle. |
| `ABORT`         | Leave the queue.                                   |
| `READY`         | Confirm the found match.                           |
| `SYNC`          | Ask for the current battle snapshot.               |
| `EVALUATE`      | Countdown ended on the client; request settlement. |

| Server → client  | Payload                                                                                         |
| ---------------- | ----------------------------------------------------------------------------------------------- |
| `CONNECTED`      | —                                                                                               |
| `ENQUEUED`       | —                                                                                               |
| `FOUND_OPPONENT` | `{ id, name, elo }` of the opponent                                                             |
| `RUNNING`        | `{ battleID }`                                                                                  |
| `SYNC`           | battle hash without `gameEndsAt` (sent as `remainingMs`) + `battleID`, `submissions`; or `null` |
| `BATTLE_RESULT`  | `{ winnerId, winningRunId, status, eloDeltas }`                                                 |
| `ABORT`          | human-readable reason                                                                           |

Unparseable or non-object frames are logged and dropped. The per-socket `message` and `close` handlers are wrapped so a rejected promise is logged instead of going unhandled; process-level `unhandledRejection` and `uncaughtException` handlers log and keep the process alive, because an exit would drop every live battle.

</details>

<details>
<summary><strong>Battle state machine</strong></summary>

The four upper-case states are values of the `state` field of the Redis hash. _Queued_ is membership in the `queue` sorted set before a hash exists, and _Aborted_ means the server sent `ABORT` and deleted the hash.

```mermaid
stateDiagram-v2
    [*] --> Queued: FIND_OPPONENT
    Queued --> [*]: ABORT · socket closed
    Queued --> PLAYERS_READY_0: opponent within ±800 Elo
    PLAYERS_READY_0 --> PLAYERS_READY_1: first READY
    PLAYERS_READY_1 --> RUNNING: second READY → game generated, Battle row written
    PLAYERS_READY_0 --> Aborted: 20 s ready window elapsed
    PLAYERS_READY_1 --> Aborted: 20 s ready window elapsed
    RUNNING --> BATTLE_ENDED: EVALUATE after gameEndsAt
    RUNNING --> [*]: no EVALUATE · hash expires, the sweep settles the Postgres row
    BATTLE_ENDED --> [*]: keys expire after 120 s
    Aborted --> [*]
```

</details>

## Simulation pipeline

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagrams/simulation-pipeline-dark.svg">
  <img alt="Simulation pipeline: the client posts optimizer configs, the route handler validates and runs the engine, persists a Run row and returns the trajectory, which Plotly replays step by step" src="docs/diagrams/simulation-pipeline-light.svg" width="1000">
</picture>

**Free play** (`/`, public). Up to five optimizer cards, each with its own algorithm, hyper-parameters, starting point and trace colour, plus a function selector. Pressing _Start_ posts the configuration to `/api/run_optimizers`, which

1. applies the per-IP rate limit,
2. rejects malformed JSON, more than 5 optimizers, more than 100 steps and any parameter outside its registry range,
3. builds the engine via `functionFactory` and `optimizerFactory`, runs it, and stores a `Run` row (`optimizers`, `steps`, `funcName`, `lastIterate`, `bestRun`),
4. returns `{ id, traces, createdAt }`.

The client replays `traces` one step per tick with `Plotly.extendTraces` on three imperative figures: the contour plot with the loss surface (a 101×101 grid evaluated in the browser once per function change), $\lVert x \rVert_2$ over steps, and $f(x)$ over steps, at 50 to 2000 ms per step. A live leaderboard sorts the optimizers by either metric and doubles as the legend. Hovering a trace dims the others across all three plots. Optimizer cards are locked while a run animates, because the animation addresses Plotly traces by index.

**Modes.** The UI is a single `Simulation` component parameterised by a `SimulationMode` strategy object (`run`, `allowedOptimizer`, `allowedFunctions`, `maxOptimizers`, optional `onRunComplete`). Free play and the battle page inject different modes into the same component. The battle mode restricts the optimizer list to the server-pinned game, offers one optimizer per submission and posts to the battle endpoint.

## Authentication and security

- **Sign-in** is GitHub OAuth through NextAuth v5 with the Prisma adapter. Sessions use the JWT strategy: the cookie is a self-contained token encrypted with a key derived from `AUTH_SECRET`, so `proxy.ts` can verify it without a database round trip. The `jwt` callback copies the database user id into the token, and the `session` callback exposes it for ownership checks. `prompt=select_account` is forced so signing out does not silently re-authenticate the same GitHub account.
- **Route protection** lives in `proxy.ts` (the Next.js 16 successor of middleware, running in the Node.js runtime with an adapter-free auth config). The matcher covers every path except `/api/auth/*`, the `/login` page, static assets and icons, and the evaluate endpoint, which authenticates on its own. Only `/`, `/api/run_optimizers` and the ladder at `/leaderboards/battle` are allow-listed, so a new route is private unless deliberately made public.
- **WebSocket authentication** happens during the HTTP upgrade. The battle server parses the cookie header, decodes the session with `next-auth/jwt` using the cookie name as salt (`__Secure-` prefixed in production), and answers `401` and destroys the socket if that fails. It crashes at start-up without `AUTH_SECRET`, does not listen until its Redis connection succeeds, and answers any non-`/health` HTTP request with 426.
- **Service-to-service calls** (`battle` → `web`, `sweep` → `web`) carry `INTERNAL_SERVICE_TOKEN` as a bearer token, compared with `crypto.timingSafeEqual`. Without a valid token the evaluate route falls back to the session and requires the caller to be a participant.
- **Input validation** runs on the server: JSON parse errors return 400; step counts, optimizer counts, unknown optimizers and out-of-range parameters return 422; battle submissions are also matched against the server-pinned configuration, and pinned values are overwritten.
- **Rate limiting** is a fixed window in Redis (`INCR` + `EXPIRE` in a `MULTI`): 80 requests per 5 minutes per scope and caller. Battle submissions are keyed by user id. Free play and the evaluate route are keyed by the last `X-Forwarded-For` hop, which Caddy sets from the real peer address, so a client cannot forge it; on the evaluate route the limit runs before the session check. Calls with a valid service token bypass it. Excess returns 429 with `Retry-After`, which the client shows as a toast with the wait time.
- **Network and CI.** In production only Caddy publishes ports; PostgreSQL, Redis, `web` and `battle` are reachable only on the compose network. The workflow runs with `contents: read`, and only the image job is granted `packages: write`.
- **Secrets** never enter the image or the repository. Env files are git- and docker-ignored, and only the placeholder `.env.production.example` is committed. Production configuration is injected through `env_file`. The only build-time configuration is the public WebSocket URL, which the Dockerfile refuses to leave empty, next to the non-secret `GIT_SHA` revision stamp.

## Data model

PostgreSQL 17 via Prisma 7 with the `pg` driver adapter. JSON columns hold optimizer configurations, the final iterate, the best-run summary and the pinned game on `Battle`, because their shape is owned by the core package, not the database. Full trajectories are returned to the client but never persisted.

<details>
<summary><strong>Entity-relationship diagram</strong></summary>

```mermaid
erDiagram
    User ||--o{ Battle : "player1 · player2 · winner"
    User ||--o{ BattleRun : "submits"
    Battle ||--o{ BattleRun : "contains"
    Battle |o--o| BattleRun : "winningRun"
    User ||--o{ Account : "OAuth"
    User ||--o{ Session : "has"

    User {
        string id PK
        string name
        int elo "default 400"
        int peakElo "default 400"
        int gamesPlayed "default 0"
        string email UK
        string image
    }
    Battle {
        string id PK "uuid from the socket server"
        datetime startedAt
        datetime endsAt
        string status "RUNNING or evaluated"
        string player1Id FK
        string player2Id FK
        int player1EloDelta
        int player2EloDelta
        int player1EloBefore
        int player2EloBefore
        string winnerId FK "null = draw once evaluated"
        json game "pinned optimizers, objective, maxSubmissions"
        string winningRunId FK
    }
    BattleRun {
        string id PK
        string playerId FK
        string battleID FK "cascade delete"
        json optimizers
        json lastIterate
        json bestRun "optimizerID, iterations"
        datetime createdAt
    }
    Run {
        string id PK
        json optimizers
        int steps
        string funcName
        json bestRun
        json lastIterate
        datetime createdAt
    }
```

</details>

`Run` rows are anonymous free-play runs. `Challenge` and `ChallengeRun` remain in the schema from the parked daily-challenge mode. Four migrations track the schema history.

## Infrastructure and deployment

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/diagrams/deploy-pipeline-dark.svg">
  <img alt="Build, ship, run: GitHub Actions lints, type-checks, tests and builds, then pushes a SHA-tagged image to GHCR; deploy.sh pulls it and compose starts postgres, redis, migrate, web, battle, sweep and caddy in health-checked order" src="docs/diagrams/deploy-pipeline-light.svg" width="1000">
</picture>

### Production stack

`docker-compose.prod.yaml` runs the four application services from the same `ghcr.io/lui2303/gradientbattle:${TAG:-latest}` image, next to stock `postgres:17-alpine`, `redis:7-alpine` and `caddy:2-alpine`. Health checks order the start-up: `postgres` (`pg_isready`) → `migrate` (`service_completed_successfully`) → `web` (`GET /login`) → `battle` (`GET /health`) → `caddy`. `web` and `battle` additionally wait for `redis` (`redis-cli ping`), and `sweep` starts once `web` is healthy because it calls the evaluate endpoint. `battle` is fixed at `scale: 1` because the socket map is in-process. Long-running services restart `unless-stopped`; the one-shot `migrate` job does not restart.

### Deploying and rolling back

On the server, `./deploy.sh [TAG]` exports the tag, pulls, runs `compose up -d`, then polls the battle server's `/health` for up to 60 s until it answers and prints the revision it reports. `GIT_SHA` is baked into the image and returned by `/health`, so the operator sees which commit is actually running rather than which tag the registry points at. The script does not compare that revision with the requested tag.

Because `migrate` must finish before `web` starts, new code never serves traffic against an unmigrated schema. A failing migration does not leave the old version serving, though: by the time `migrate` fails, `compose up -d` has already replaced the previous `web`, `battle` and `sweep` containers, and the new ones stay created but not started. The stack is down until the migration is fixed or `./deploy.sh sha-<previous>` rolls back. Running the migration as its own step before `compose up -d` would close that gap.

<details>
<summary><strong>Configuration reference</strong></summary>

| Variable                               | Used by                     | Notes                                        |
| -------------------------------------- | --------------------------- | -------------------------------------------- |
| `DATABASE_URL`                         | web, battle, sweep, migrate | PostgreSQL connection string                 |
| `REDIS_URL`                            | web, battle                 | defaults to `redis://localhost:6379`         |
| `AUTH_SECRET`                          | web, battle                 | encrypts sessions; must be identical in both |
| `AUTH_GITHUB_ID`, `AUTH_GITHUB_SECRET` | web                         | OAuth app                                    |
| `AUTH_URL`, `AUTH_TRUST_HOST`          | web                         | public origin behind the proxy               |
| `INTERNAL_SERVICE_TOKEN`               | web, battle, sweep          | bearer token for the evaluate endpoint       |
| `API_BASE_URL`                         | battle, sweep               | where to reach `web` inside the network      |
| `BATTLE_PORT`                          | battle                      | defaults to 3001                             |
| `NEXT_PUBLIC_BATTLE_WS_URL`            | build time                  | public WebSocket URL inlined into the bundle |
| `LOG_LEVEL`                            | battle, sweep               | pino level; `sweep` is forced to `debug`     |
| `SWEEP_INTERVAL_SECONDS`               | sweep                       | loop interval, default 30                    |
| `GIT_SHA`                              | build arg                   | reported by `/health`                        |

`.env.production.example` documents the production set.

</details>

## Observability

The battle server and the sweeper log through **pino** (`lib/logger.ts`): structured JSON in production, pretty-printed with timestamps in development. The Next.js app itself does not use it. The battle server logs every state transition. Connection, matchmaking and ready-up lines (`client connected`, `matched opponent, removed from queue`, `first player ready, state -> PLAYERS_READY_1`, `battle persisted to db, state -> RUNNING`) come from per-connection child loggers that carry the user id, plus the battle id once one exists. The evaluation lines (`battle evaluated`, `notified players of battle result`) carry the battle id. Every unparseable or malformed frame is logged with its first 200 characters.

The sweeper runs at `debug` in production on purpose: its idle path logs nothing at `info`, which would make a healthy sweeper indistinguishable from a dead one. Its exit code reports whether any evaluation failed. Docker rotates every container's log at 3 × 10 MB (`json-file` driver), so that verbosity cannot fill the disk. `GET /health` on the battle server returns `{ status, revision }`, which `deploy.sh` and the compose health check both use.

## Local development

Prerequisites: Node 24, pnpm 10 (`corepack enable`), Docker with Compose. A GitHub OAuth app (callback `http://localhost:3000/api/auth/callback/github`) is needed for anything behind sign-in; free play works without it.

```bash
git clone https://github.com/lui2303/gradientbattle && cd gradientbattle
pnpm install                                   # also runs prisma generate
```

Create `apps/web/.env`. Everything not listed falls back to a localhost default (`REDIS_URL`, `API_BASE_URL`, `BATTLE_PORT`, the WebSocket URL):

```bash
DATABASE_URL=postgresql://gradientbattle:gradientbattle@localhost:5433/gradientbattle
AUTH_SECRET=              # openssl rand -base64 32
AUTH_GITHUB_ID=
AUTH_GITHUB_SECRET=
INTERNAL_SERVICE_TOKEN=   # openssl rand -hex 32
```

Start the backing services, apply the migrations and run the processes:

```bash
docker compose up -d --wait postgres redis     # postgres on :5433, redis on :6379
pnpm --filter web exec prisma migrate deploy

pnpm dev                                       # Next.js        :3000
pnpm --filter web battle                       # battle server  :3001 (tsx watch)
pnpm --filter web sweep                        # one sweeper pass, when needed
```

## Known limitations and roadmap

- **Atomicity in Redis.** Matchmaking and ready-up are several commands, not one script. Two searchers arriving together can both be matched to the same waiting player, and the two players' `READY` frames, if they interleave, can both read the initial ready state, after which the ready timer aborts the battle. Moving both into Lua scripts is the next correctness item.
- **Submission deadline.** The run endpoint checks the deadline when a request starts and inserts the row after the simulation, so a submission accepted in the last milliseconds can land after settlement.
- **Sweeper-settled battles are not pushed.** The sweeper settles the PostgreSQL row only. No `BATTLE_RESULT` is sent and the Redis hash stays `RUNNING` until its TTL. The battle page still converges, because it reads the status from PostgreSQL on every load.
- **No automatic reconnect.** A dropped WebSocket is recovered by reloading the correct page, which re-syncs from Redis.
- **Single battle replica.** Sockets live in process memory. Horizontal scaling needs Redis pub/sub for cross-instance delivery.
- **Evaluation hard-codes the step budget.** A non-converged run is always scored as 100 steps, so battles with a different step limit are not supported yet.
- **Data.** Only unique indexes exist. The sweeper query on `(status, endsAt)`, match history by player and the ladder by Elo are sequential scans, which is fine at today's size. Free-play `Run` rows accumulate without retention.
- **Parked features.** The daily-challenge mode is parked pending a rewrite. The local run-history sidebar is unwired.

**Planned features**

- **Custom objective functions.** Today an objective is a hand-written `objective` and `gradient` pair plus a LaTeX string for display. Players should be able to type their own function in LaTeX or a similar notation, which the server parses, differentiates and evaluates, so the function library is no longer limited to what is registered in the core package.
- **Optima away from the origin.** Every optimizer declares convergence when $\lVert x \rVert_2$ falls below $10^{-3}$, and the distance plot measures against the origin, so every landscape must have its minimum at $(0, 0)$. Giving each objective a `minimizer` and measuring convergence and distance relative to it opens up functions such as Rosenbrock.
- **Live pressure in battles.** A player currently learns what the opponent did only on the summary page. A push over the socket whenever the opponent's latest submission beats the player's current best would make the two minutes more engaging.

## Declaration of AI use

Claude Opus 5.0 (Anthropic) assisted with parts of this project. I reviewed and integrated everything it produced; everything else was written by hand.

- **Frontend, about 60 % written by Claude:** the shadcn/ui components and the Plotly architecture.
- **Backend, about 10 % written by Claude:** setting up NextAuth, the Docker Compose files, shell scripts, the Caddy configuration, and the cookie-based authentication of the WebSocket server.

The README diagrams were drafted with Claude and reviewed by me.
