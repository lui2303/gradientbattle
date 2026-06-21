import { createServer  } from "node:http";
import { WebSocketServer, WebSocket } from "ws";
import { decode } from "next-auth/jwt";
import { getRedis, redis } from "./lib/redisClient";
import { prisma } from "./lib/prisma";
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
const PREP_PHASE_TIME = 10_000
const GAME_DURATION = 120_000

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";
const EVAL_BUFFER_MS = 2_000; // fire just after the endpoint's elapsed-time gate opens
const RESULT_GRACE_SECONDS = 120; // how long the ended battle stays in redis so a refresh can show the result


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
    if(possibleOpponents.length != 0) {
        const opponent = possibleOpponents[0]
        await redis.ZREM("queue", opponent["value"])
        console.log("REMOVED USER: " + userID + "FROM QUEUE")
        return sanitize_opponent(opponent)
    }
    
    await redis.ZADD("queue", [{score: elo, value: `user:${userID}`}]);

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
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
        (ws as AuthedSocket).user = user;
        wss.emit("connection", ws, req);
    });
});

function send(ws: WebSocket, message: ServerResponse) {
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
}

async function onOpponentFound(ws: AuthedSocket, opponentWs: AuthedSocket, battleID: string) {
    // create a battle inside the database, by deciding which function is optimized on
    setTimeout(async () => {
        const currentGameState = await redis.HGET(`battle:${battleID}`, "state") as GameStatus
        
        if(!currentGameState) {
            console.log(`games:${ws.user.id}#${opponentWs.user.id} was not found in redis after waiting for players to ready up -> aborting`)
            ws.close()
            opponentWs.close()
            return
        }

        console.log("STATUS AFTER 20 SECONDS: " + currentGameState)

        if(currentGameState === "PLAYERS_READY_0" || currentGameState === "PLAYERS_READY_1") {
            send(ws, {type: ServerMessageTypes.ABORT, payload: "A player did not click ready -> Aborting game"})
            send(opponentWs, {type: ServerMessageTypes.ABORT, payload: "A player did not click ready -> Aborting game"})

            await cleanUpRedis(battleID, ws.user.id, opponentWs.user.id)

            return
        }
    }, READY_TIME_MS)
}

function scheduleEvaluation(battleID: string, playerIds: string[]) {
    setTimeout(async () => {
        try {
            const res = await fetch(`${API_BASE_URL}/api/battle/${battleID}/evaluate`, {
                headers: { authorization: `Bearer ${INTERNAL_SERVICE_TOKEN}` },
            })
            if (!res.ok) {
                console.error(`evaluate ${battleID} failed: ${res.status} ${await res.text()}`)
                return
            }
            const result = await res.json() // { winnerId, winningRunId, status }

            // Persist the ended state + winner so a reconnecting/refreshing client
            // can SYNC and render the result instead of replaying the simulation.
            // Keep the keys for a short grace window, then let them expire (the
            // permanent record lives in the DB).
            await redis.HSET(`battle:${battleID}`, { state: "BATTLE_ENDED", winnerId: result.winnerId ?? "" })
            await redis.expire(`battle:${battleID}`, RESULT_GRACE_SECONDS)
            for (const id of playerIds) await redis.expire(`user:${id}`, RESULT_GRACE_SECONDS)

            for (const id of playerIds) {
                const sock = connections.get(id)
                if (sock) send(sock, {type: ServerMessageTypes.BATTLE_RESULT, payload: result})
                    console.log(`NOTIFIED ${id} OF BATTLE RESULTS`)
            }
        } catch (err) {
            console.error(`evaluate ${battleID} threw`, err)
        }
    }, PREP_PHASE_TIME + GAME_DURATION + EVAL_BUFFER_MS)
}

wss.on("connection", (raw) => {
    const ws = raw as AuthedSocket;
    
    send(ws, {type: ServerMessageTypes.CONNECTED});

    connections.set(ws.user.id, ws)

    //TODO: check if the client has a existing connection and process this case

    ws.on("message", async (buf) => {
        let message: ClientResponse
        try {
            message = JSON.parse(buf.toString()) as ClientResponse
        } catch {
            return;
        }

        switch (message.type) {
            case ClientMessageTypes.FIND_OPPONENT: {
                //TODO: check if the user is already in a match and report that to the client via a abort
                if (await redis.ZSCORE("queue", `user:${ws.user.id}`) !== null) return // already in queue

                const user = await prisma.user.findUnique({where: {id: ws.user.id}, select: {elo: true}}) // makes sure that connections can be reused
                if(!user) {
                    console.log("COULDN'T FIND USER IN DB")
                    return // send error message
                }

                queue(ws.user.id, user.elo).then(async (opponent) => {
                    if(!opponent) {
                        send(ws, {type: ServerMessageTypes.ENQUEUED})
                        return
                    }

                    const opponentWs = connections.get(opponent.id)
                
                    if(!opponentWs) {
                        console.log("FATAL ERROR: OPPONENTS CONNECTION DOES NOT EXIST")
                        send(ws, {type: ServerMessageTypes.ABORT, payload: "Opponent disconnected"})
                        return
                    } // report errors to the client
                    const battleID = crypto.randomUUID()
                    
                    const battle = {
                        player1: ws.user.id,
                        player2: opponentWs.user.id,
                        readyEndsAt: Date.now() + READY_UP_TIME,
                        state: "PLAYERS_READY_0",
                        maxSubmissions: MAX_SUBMISSIONS
                    } as unknown as redisBattleRaw
                    
                    const expiration = (READY_TIME_MS + GAME_DURATION + PREP_PHASE_TIME + EVAL_BUFFER_MS) / 1000
                    await redis.multi()
                        .HSET(`battle:${battleID}`, battle)
                        .expire(`battle:${battleID}`, expiration)
                        .set(`user:${ws.user.id}`, battleID, { EX: expiration })
                        .set(`user:${opponentWs.user.id}`, battleID, { EX: expiration })
                        .exec()

                    send(ws, {type: ServerMessageTypes.FOUND_OPPONENT, payload: {id: opponentWs.user.id, name: opponentWs.user.name!, elo: opponent.elo}})
                    send(connections.get(opponent.id)!, {type: ServerMessageTypes.FOUND_OPPONENT, payload:{id: ws.user.id, name: ws.user.name!, elo: user.elo}})
                    
                    onOpponentFound(ws, opponentWs, battleID)
                }) 
                break;
            }
            case ClientMessageTypes.ABORT: {
                console.log("Received abort message from client")
                ws.close()
                break;
            }

            case ClientMessageTypes.READY: {
                if(await redis.get(`ready:${ws.user.id}`)) return
                await redis.set(`ready:${ws.user.id}`, 1, { EX: READY_TIME_MS / 1000})

                const battleID = await redis.GET(`user:${ws.user.id}`)
                
                if(!battleID) {
                    send(ws, {type: ServerMessageTypes.ABORT, payload: "no battle found for this user"})
                    return
                }

                const battle = await redis.HGETALL(`battle:${battleID}`) as redisBattleRaw
                
                if(battle.state == "PLAYERS_READY_1") {
                    const generatedGame = generateRankedGame()

                    const redisRawGame = {
                        ...battle,
                        prepEndsAt: String(Date.now() + PREP_PHASE_TIME),
                        gameEndsAt: String(Date.now() + PREP_PHASE_TIME + GAME_DURATION),
                        game: JSON.stringify(generatedGame),
                        state: "PREP_PHASE"
                    }

                    await redis.HSET(`battle:${battleID}`, redisRawGame)

                    const opponentID = battle.player2 == ws.user.id ? battle.player1 : battle.player2

                    await prisma.battle.create({data: {
                        id: battleID,
                        status: "PREP_PHASE",
                        game: redisRawGame.game,
                        player1Id: ws.user.id,
                        player2Id: opponentID,
                    }})
                    
                    send(ws, {type: ServerMessageTypes.PREP_PHASE, payload: {battleID}})
                    send(connections.get(opponentID)!, {type: ServerMessageTypes.PREP_PHASE, payload: {battleID}})

                    scheduleEvaluation(battleID, [ws.user.id, opponentID])

                    break
                } //TODO CRITICAL: Make redis operations atomic with a lua script to prevent race conditions readying and matchmaking
                
                if(battle.state == "PLAYERS_READY_0") {
                    await redis.HSET(`battle:${battleID}`, {"state": "PLAYERS_READY_1"})
                }
                break
                
            }
            case ClientMessageTypes.SYNC: {
                const battleID = await redis.GET(`user:${ws.user.id}`)
                
                if(!battleID) {
                    send(ws, {type: ServerMessageTypes.SYNC, payload: null})
                    return
                }

                const battle = await redis.HGETALL(`battle:${battleID}`) as redisBattleRaw
                
                send(ws, {type: ServerMessageTypes.SYNC, payload: {...battle, battleID: battleID}})
            }
        }
    })

    ws.on("close", async () => {
        if (connections.get(ws.user.id) === ws) connections.delete(ws.user.id)  // fixes  accidentally closing reconnected sockets

        const rem = await redis.ZREM("queue", "user:" + ws.user.id)
        if(rem) console.log("REMOVED user " + ws.user.name + "FROM QUEUE (connection closed)")
    });
});

getRedis()
    .then(() => server.listen(PORT, () => console.log(`battle server listening on :${PORT}`)))
    .catch((e) => { console.error("failed to connect redis", e); process.exit(1); });


//TODO: add submissions to the SYNC payload, otherwise the client will display 0/N after reconnecting