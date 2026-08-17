import { createServer  } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { decode } from "next-auth/jwt";
import { getRedis, redis } from "./lib/redisClient";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import { objectiveFunction, Optimizer, Point } from "@gradientbattle/core";
import { ADAGRAD_NAME, ADAM_NAME, GD_MOMENTUM_NAME, GD_NAME, RMSPROP_NAME } from "@gradientbattle/core/src/optimizers/constants";
import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry";
import { start } from "node:repl";
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic_function";
import { MAX_SUBMISSIONS, READY_UP_TIME } from "./app/constants";
import { ClientMessageTypes, ClientResponse, GameStatus, rankedGame, redisBattleRaw, ServerMessageTypes, ServerResponse } from "./app/types";

const PORT = Number(process.env.BATTLE_PORT ?? 3001);
const SECRET = process.env.AUTH_SECRET;
const READY_TIME_MS = 20000
const GAME_DURATION = 120_000

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";
const EVAL_BUFFER_MS = 2_000; // fire just after the endpoint's elapsed-time gate opens
const RESULT_GRACE_SECONDS = 120;


if (!SECRET) throw new Error("AUTH_SECRET is required (must match the Next.js app)");

// NextAuth v5 cookie names. The cookie name is also the JWE decryption salt.
// dev (http) -> unprefixed; prod (https) -> __Secure- prefix.
const COOKIE_NAMES = ["__Secure-authjs.session-token", "authjs.session-token"] as const;

export interface BattleUser {
    id: string
    name: string | null
}

function parseCookies(header: string | undefined): Record<string, string> {
    const out: Record<string, string> = {};
    for (const part of header?.split(";") ?? []) {
        const i = part.indexOf("=")
        if (i === -1) continue;
        out[part.slice(0, i).trim()] = decodeURIComponent(part.slice(i + 1).trim());
    }
    return out;
}

// Reuses the exact session JWE the Next.js app set. The token is *encrypted*
// (key derived from AUTH_SECRET), so we decrypt with the shared secret — we
// can't verify it like a signed JWT. Returns null on missing/expired/tampered.
async function authenticate(cookieHeader: string | undefined): Promise<BattleUser | null> {
    const cookies = parseCookies(cookieHeader);
    for (const salt of COOKIE_NAMES) {
        const token = cookies[salt];
        if (!token) continue;
        try {
            const payload = await decode({ token, secret: SECRET!, salt });
            // `id` was put on the token by the jwt() callback in auth.config.ts.
            if (payload?.id) return { id: payload.id as string, name: (payload.name as string) ?? null };
        } catch {
            /* wrong secret / expired / tampered — try the next cookie name */
        }
    }
    return null;
}

const server = createServer((req, res) => {
    if (req.url === "/health") {
        res.writeHead(200);
        res.end("ok");
        return;
    }
    res.writeHead(426);
    res.end("Upgrade Required");
});

const wss = new WebSocketServer({ noServer: true });
interface AuthedSocket extends WebSocket {
    user: BattleUser;
}

const ELO_TOLERANCE = 800


async function queue(userID: string, elo: number): Promise<{elo: number, id: string} | null> {
    const redis = await getRedis();

    const possibleOpponents = await redis.ZRANGEBYSCORE_WITHSCORES("queue", Math.max(elo - ELO_TOLERANCE, 0), elo + ELO_TOLERANCE)
    logger.debug({ userID, elo, candidates: possibleOpponents.length }, "searched queue for opponents in elo range")
    if(possibleOpponents.length != 0) {
        const opponent = possibleOpponents[0]
        await redis.ZREM("queue", opponent["value"])
        logger.info({ userID, opponent: opponent.value }, "matched opponent, removed from queue")
        return sanitize_opponent(opponent)
    }
    
    await redis.ZADD("queue", [{score: elo, value: `user:${userID}`}]);
    logger.info({ userID, elo }, "no opponent found, enqueued")

    return null
    // make this operation atomic in the future. can slow down if too many clients exist because ghost games can occur
}





function sanitize_opponent(opponent: {value: string, score: number}) {
    return {elo: opponent.score, id: opponent.value.replace("user:", "")}
}

// Authenticate during the HTTP upgrade, before accepting the socket.
server.on("upgrade", async (req, socket, head) => {
    const user = await authenticate(req.headers.cookie);
    if (!user) {
        logger.warn({ url: req.url }, "upgrade rejected: unauthenticated")
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }
    logger.debug({ userID: user.id, name: user.name }, "upgrade authenticated")
    wss.handleUpgrade(req, socket, head, (ws) => {
        (ws as AuthedSocket).user = user;
        wss.emit("connection", ws, req);
    });
});

function send(ws: WebSocket, message: ServerResponse) {
    logger.debug({ userID: (ws as AuthedSocket).user?.id, type: ServerMessageTypes[message.type] }, "sending server message")
    ws.send(JSON.stringify(message));
}

const connections = new Map<string, AuthedSocket>()

type RankedOptimizationAlgorithm = {name: string, params: Record<string, {enabled: boolean, value: number}>, startingPoint: {fixed: boolean, value: Point}}

export const RANKED_OPTIMIZER_PROBABILTIES: Record<string, number> = {
    [GD_NAME]: 1,
    [GD_MOMENTUM_NAME]: 0.95,
    [ADAGRAD_NAME]: 0.8,
    [RMSPROP_NAME]: 0.7,
    [ADAM_NAME]: 0.3
}

function checkStartingPoint(startingPointsInequalities: ((point: Point) => boolean)[], point: Point): boolean {
    return startingPointsInequalities.some((inequality) => !inequality(point))
}

const STARTING_POINT_INEQUALITIES = [(point: Point) => {return point.x > 5 && point.y > 5}]
// TODO: use strategy pattern to fitler between different starting point inequalities
// TODO: add ranges for the parameters to also make them random

function generateRankedGame(): Omit<rankedGame, "battleID"> {
    const rankedOptimizers: RankedOptimizationAlgorithm[] = []

    for(const [optimizerName, config] of Object.entries(optimizationAlgorithms)) {
        const optimizerProbability: number = RANKED_OPTIMIZER_PROBABILTIES[optimizerName]

        if(Math.random() > optimizerProbability) continue

        const startingPoint: {fixed: boolean, value: Point} = {fixed: false, value: {x: 5, y: 5}}
        if(Math.random() > 1/2) {
            startingPoint.fixed = true
            startingPoint.value = {x: 5+Math.random()*5, y: 5+Math.random()*5}   
        }

        const optimizerParams: Record<string, {enabled: boolean, value: number}> = {}
        Object.keys(config.params).forEach((key) => {
            if(Math.random() > 0.5 && optimizerName != GD_NAME){
                optimizerParams[key] = {enabled: false, value: config.params[key]}
                return
            }
            optimizerParams[key] = {enabled: true, value: config.params[key]}
        })

        rankedOptimizers.push({
            name: optimizerName,
            params: optimizerParams,
            startingPoint: startingPoint,
        })
    }

    return {
        max_number_of_optimizers: Math.floor(Math.random() * 5) + 1,
        startingPointsInequalities: STARTING_POINT_INEQUALITIES,
        optimizers: rankedOptimizers,
        objective: quadraticFunction.name, // TODO: randomize this
        maxSubmissions: MAX_SUBMISSIONS
    }
}

async function cleanUpUserRedis(userID: string) {
    await redis.del(`user:${userID}`)
    await redis.del(`ready:${userID}`)
}

async function cleanUpRedis(battleID: string, user1ID: string, user2ID: string) {
    await redis.del(`battle:${battleID}`)
    cleanUpUserRedis(user1ID)
    cleanUpUserRedis(user2ID)
    logger.debug({ battleID, players: [user1ID, user2ID] }, "cleaned up battle state in redis")
}

async function onOpponentFound(ws: AuthedSocket, opponentWs: AuthedSocket, battleID: string) {
    logger.debug({ battleID, readyTimeMs: READY_TIME_MS }, "scheduled ready-up deadline check")
    // create a battle inside the database, by deciding which function is optimized on
    setTimeout(async () => {
        const currentGameState = await redis.HGET(`battle:${battleID}`, "state") as GameStatus
        
        if(!currentGameState) {
            logger.warn({ battleID, players: [ws.user.id, opponentWs.user.id] }, "battle not found in redis after ready window -> aborting")
            ws.close()
            opponentWs.close()
            return
        }

        logger.debug({ battleID, state: currentGameState }, "battle state after ready window")

        if(currentGameState === "PLAYERS_READY_0" || currentGameState === "PLAYERS_READY_1") {
            logger.info({ battleID, state: currentGameState, players: [ws.user.id, opponentWs.user.id] }, "ready-up deadline expired -> aborting battle")
            send(ws, {type: ServerMessageTypes.ABORT, payload: "A player did not click ready -> Aborting game"})
            send(opponentWs, {type: ServerMessageTypes.ABORT, payload: "A player did not click ready -> Aborting game"})

            await cleanUpRedis(battleID, ws.user.id, opponentWs.user.id)

            return
        }
    }, READY_TIME_MS)
}

function scheduleEvaluation(battleID: string, playerIds: string[]) {
    logger.debug({ battleID, playerIds, delayMs: GAME_DURATION + EVAL_BUFFER_MS }, "scheduled battle evaluation")
    setTimeout(async () => {
        try {
            logger.debug({ battleID }, "requesting battle evaluation")
            const res = await fetch(`${API_BASE_URL}/api/battle/${battleID}/evaluate`, {
                headers: { authorization: `Bearer ${INTERNAL_SERVICE_TOKEN}` },
            })
            if (!res.ok) {
                logger.error({ battleID, status: res.status, body: await res.text() }, "evaluate request failed")
                return
            }
            const result = await res.json() // { winnerId, winningRunId, status, [id]: eloDiff, [id2]: eloDiff }
            logger.info({ battleID, result }, "battle evaluated")

            await redis.HSET(`battle:${battleID}`, { state: "BATTLE_ENDED", winnerId: result.winnerId ?? "" })
            await redis.expire(`battle:${battleID}`, RESULT_GRACE_SECONDS)
            for (const id of playerIds) await redis.expire(`user:${id}`, RESULT_GRACE_SECONDS)

            for (const id of playerIds) {
                const sock = connections.get(id)
                if (sock) {
                    send(sock, {type: ServerMessageTypes.BATTLE_RESULT, payload: result})
                    logger.info({ battleID, userID: id }, "notified player of battle result")
                }
            }
        } catch (err) {
            logger.error({ err, battleID }, "evaluate request threw")
        }
    }, GAME_DURATION + EVAL_BUFFER_MS)
}

wss.on("connection", (raw) => {
    const ws = raw as AuthedSocket;
    const log = logger.child({ userID: ws.user.id })

    log.info({ name: ws.user.name }, "client connected")
    send(ws, {type: ServerMessageTypes.CONNECTED});

    if (connections.has(ws.user.id)) log.info("existing connection for this user replaced by new socket")
    connections.set(ws.user.id, ws)

    //TODO: check if the client has a existing connection and process this case

    ws.on("message", async (buf) => {
        let message: ClientResponse
        try {
            message = JSON.parse(buf.toString()) as ClientResponse
        } catch {
            log.warn({ raw: buf.toString().slice(0, 200) }, "received unparseable message, ignoring")
            return;
        }

        log.debug({ type: ClientMessageTypes[message.type] }, "received client message")

        switch (message.type) {
            case ClientMessageTypes.FIND_OPPONENT: {
                //TODO: check if the user is already in a match and report that to the client via a abort or SYNC
                if (await redis.ZSCORE("queue", `user:${ws.user.id}`) !== null) {
                    log.debug("find_opponent ignored: user already in queue")
                    return
                }

                const user = await prisma.user.findUnique({where: {id: ws.user.id}, select: {elo: true}}) // makes sure that connections can be reused
                if(!user) {
                    log.error("user not found in db")
                    return // send error message
                }

                queue(ws.user.id, user.elo).then(async (opponent) => {
                    if(!opponent) {
                        send(ws, {type: ServerMessageTypes.ENQUEUED})
                        return
                    }

                    const opponentWs = connections.get(opponent.id)
                
                    if(!opponentWs) {
                        log.error({ opponentID: opponent.id }, "opponent matched but has no live connection")
                        send(ws, {type: ServerMessageTypes.ABORT, payload: "Opponent disconnected"})
                        return
                    } // report errors to the client
                    const battleID = crypto.randomUUID()
                    
                    const battle = {
                        player1: ws.user.id,
                        player2: opponentWs.user.id,
                        player1Name: ws.user.name,
                        player2Name: opponentWs.user.name,
                        player1Elo: user.elo,
                        player2Elo: opponent.elo,
                        readyEndsAt: Date.now() + READY_UP_TIME,
                        state: "PLAYERS_READY_0",
                        maxSubmissions: MAX_SUBMISSIONS
                    } as unknown as redisBattleRaw
                    
                    const expiration = (READY_TIME_MS + GAME_DURATION + EVAL_BUFFER_MS) / 1000
                    await redis.multi()
                        .HSET(`battle:${battleID}`, battle)
                        .expire(`battle:${battleID}`, expiration)
                        .set(`user:${ws.user.id}`, battleID, { EX: expiration })
                        .set(`user:${opponentWs.user.id}`, battleID, { EX: expiration })
                        .exec()

                    log.info({ battleID, opponentID: opponentWs.user.id }, "battle created in redis, waiting for ready-up")

                    send(ws, {type: ServerMessageTypes.FOUND_OPPONENT, payload: {id: opponentWs.user.id, name: opponentWs.user.name!, elo: opponent.elo}})
                    send(connections.get(opponent.id)!, {type: ServerMessageTypes.FOUND_OPPONENT, payload:{id: ws.user.id, name: ws.user.name!, elo: user.elo}})
                    
                    onOpponentFound(ws, opponentWs, battleID)
                }) 
                break;
            }
            case ClientMessageTypes.ABORT: {
                log.info("received abort message from client")
                const rem = await redis.ZREM("queue", "user:" + ws.user.id)
                if (rem) log.info({ name: ws.user.name }, "removed user from queue (abort)")
                send(ws, { type: ServerMessageTypes.ABORT, payload: "Search aborted" })
                break;
            }

            case ClientMessageTypes.READY: {
                if(await redis.get(`ready:${ws.user.id}`)) {
                    log.debug("ready ignored: user already marked ready")
                    return
                }
                await redis.set(`ready:${ws.user.id}`, 1, { EX: READY_TIME_MS / 1000})

                const battleID = await redis.GET(`user:${ws.user.id}`)

                if(!battleID) {
                    log.warn("ready received but no battle found for this user -> aborting")
                    send(ws, {type: ServerMessageTypes.ABORT, payload: "no battle found for this user"})
                    return
                }

                const battle = await redis.HGETALL(`battle:${battleID}`) as redisBattleRaw
                
                if(battle.state == "PLAYERS_READY_1") {
                    const generatedGame = generateRankedGame()
                    log.info({ battleID, objective: generatedGame.objective, optimizers: generatedGame.optimizers.map((o) => o.name), maxOptimizers: generatedGame.max_number_of_optimizers }, "both players ready, game generated")

                    const gameEndsAt = Date.now() + GAME_DURATION

                    const redisRawGame = {
                        ...battle,
                        gameEndsAt: String(gameEndsAt),
                        game: JSON.stringify(generatedGame),
                        state: "RUNNING",
                    }

                    await redis.HSET(`battle:${battleID}`, redisRawGame)

                    const opponentID = battle.player2 == ws.user.id ? battle.player1 : battle.player2

                    const persistedGame = {
                        objective: generatedGame.objective,
                        optimizers: generatedGame.optimizers,
                        max_number_of_optimizers: generatedGame.max_number_of_optimizers,
                        maxSubmissions: generatedGame.maxSubmissions,
                    }

                    await prisma.battle.create({data: {
                        id: battleID,
                        status: "RUNNING",
                        game: persistedGame,
                        endsAt: new Date(gameEndsAt),
                        player1Id: ws.user.id,
                        player2Id: opponentID,
                    }})

                    log.info({ battleID, opponentID }, "battle persisted to db, state -> RUNNING")

                    send(ws, {type: ServerMessageTypes.RUNNING, payload: {battleID}})
                    send(connections.get(opponentID)!, {type: ServerMessageTypes.RUNNING, payload: {battleID}})

                    scheduleEvaluation(battleID, [ws.user.id, opponentID])

                    break
                } //TODO CRITICAL: Make redis operations atomic with a lua script to prevent race conditions readying and matchmaking
                
                if(battle.state == "PLAYERS_READY_0") {
                    await redis.HSET(`battle:${battleID}`, {"state": "PLAYERS_READY_1"})
                    log.info({ battleID }, "first player ready, state -> PLAYERS_READY_1")
                }
                break
                
            }
            case ClientMessageTypes.SYNC: {
                const battleID = await redis.GET(`user:${ws.user.id}`)

                if(!battleID) {
                    log.debug("sync requested: no active battle")
                    send(ws, {type: ServerMessageTypes.SYNC, payload: null})
                    return
                }

                const battle = await redis.HGETALL(`battle:${battleID}`) as redisBattleRaw

                const submissionCount = await redis.GET(`battle:${battleID}:submissions:${ws.user.id}`)
                log.debug({ battleID, state: battle.state }, "sync requested: sending battle state")
                send(ws, {type: ServerMessageTypes.SYNC, payload: {...battle, battleID: battleID, submissions: submissionCount ? Number(submissionCount) : 0 }})
                break
            }
            default: {
                log.warn({ type: (message as { type: number }).type }, "received unknown message type")
            }
        }
    })

    ws.on("close", async (code) => {
        log.info({ code }, "client disconnected")
        if (connections.get(ws.user.id) === ws) connections.delete(ws.user.id)  // fixes  accidentally closing reconnected sockets

        const rem = await redis.ZREM("queue", "user:" + ws.user.id)
        if(rem) log.info({ name: ws.user.name }, "removed user from queue (connection closed)")
    });
});

getRedis()
    .then(() => server.listen(PORT, () => logger.info(`battle server listening on :${PORT}`)))
    .catch((e) => { logger.fatal({ err: e }, "failed to connect redis"); process.exit(1); });