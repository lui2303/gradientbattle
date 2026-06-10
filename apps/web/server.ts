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

const PORT = Number(process.env.BATTLE_PORT ?? 3001);
const SECRET = process.env.AUTH_SECRET;
const READY_TIME_MS = 20000
const PREP_PHASE_TIME = 10_000
const GAME_DURATION = 120_000

const API_BASE_URL = process.env.API_BASE_URL ?? "http://localhost:3000";
const INTERNAL_SERVICE_TOKEN = process.env.INTERNAL_SERVICE_TOKEN ?? "";
const EVAL_BUFFER_MS = 2_000; // fire just after the endpoint's elapsed-time gate opens


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
    opponent?: BattleUser;
    redisBattleID?: string
}

const ELO_TOLERANCE = 800


async function queue(userID: string, elo: number) {
    const redis = await getRedis();

    const possibleOpponents = await redis.ZRANGEBYSCORE_WITHSCORES("queue", Math.max(elo - ELO_TOLERANCE, 0), elo + ELO_TOLERANCE)
    if(possibleOpponents.length != 0) {
        const opponent = possibleOpponents[0]
        await redis.ZREM("queue", opponent["value"])
        console.log("REMOVED USER: " + userID + "FROM QUEUE")
        return opponent
    }
    
    await redis.ZADD("queue", [{score: elo, value: `user:${userID}`}]);

    // make this operation atomic in the future. can slow down if too many clients exist because ghost games can occur
}





function sanitize_opponent(opponent: {value: string, score: number}) {
    return {...opponent, value: opponent.value.replace("user:", "")}
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

function send(ws: WebSocket, type: string, data: object = {}) {
    ws.send(JSON.stringify({ type, ...data }));
}

const connections = new Map<string, AuthedSocket>()

type gameState = "ABORTED" | "WAITING_FOR_READY" | "PLAYERS_READY_1" | "PREP_PHASE" | "RUNNING"

type RankedOptimizationAlgorithm = {name: string, params: Record<string, {enabled: boolean, value: number}>, startingPoint: {fixed: boolean, value: Point}}

export const RANKED_OPTIMIZER_PROBABILTIES: Record<string, number> = {
    [GD_NAME]: 1,
    [GD_MOMENTUM_NAME]: 0.95,
    [ADAGRAD_NAME]: 0.8,
    [RMSPROP_NAME]: 0.7,
    [ADAM_NAME]: 0.3
}


type rankedGame = {
    "objective": string,
    "startingPointsInequalities" : ((point: Point) => boolean)[], // inequalities that every non fixed starting point needs to satisfy
    "optimizers": RankedOptimizationAlgorithm[],
    "max_number_of_optimizers": number,
    "battleID": string | null
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
            startingPoint: startingPoint
        })
    }

    return {
        max_number_of_optimizers: Math.floor(Math.random() * 5) + 1,
        startingPointsInequalities: STARTING_POINT_INEQUALITIES,
        optimizers: rankedOptimizers,
        objective: quadraticFunction.name // TODO: randomize this
    }
}


async function onOpponentFound(ws: AuthedSocket, opponentWs: AuthedSocket) {
    // create a battle inside the database, by deciding which function is optimized on
    await redis.HSET(`games:${ws.user.id}#${opponentWs.user.id}`, {state: "WAITING_FOR_READY", player1: ws.user.id, player2: opponentWs.user.id})
    setTimeout(async () => {
        const currentGameState = await redis.HGET(`games:${ws.user.id}#${opponentWs.user.id}`, "state")
        
        if(!currentGameState) {
            console.log(`games:${ws.user.id}#${opponentWs.user.id} was not found in redis after waiting for players to ready up -> aborting`)
            ws.close()
            opponentWs.close()
            return
        }

        console.log("STATUS AFTER 20 SECONDS: " + currentGameState)

        if(currentGameState === "WAITING_FOR_READY" || currentGameState === "PLAYERS_READY_1") {
            send(ws, "abort", {message: "A player did not click ready -> Aborting game"})
            send(opponentWs, "abort", {message: "A player did not click ready -> Aborting game"})
            await redis.del(`games:${ws.user.id}#${opponentWs.user.id}`)
            return
        }

        //await redis.HSET(`games:${ws.user.id}#${opponentWs.user.id}`, {state: gameState.PREP_PHASE, player1: ws.user.id, player2: opponentWs.user.id})
        
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

            for (const id of playerIds) {
                const sock = connections.get(id)
                if (sock) send(sock, "battle_result", result)
                    console.log(`NOTIFIED ${id} OF BATTLE RESULTS`)
            }
        } catch (err) {
            console.error(`evaluate ${battleID} threw`, err)
        }
    }, PREP_PHASE_TIME + GAME_DURATION + EVAL_BUFFER_MS)
}

wss.on("connection", (raw) => {
    const ws = raw as AuthedSocket;
    
    send(ws, "connected", { user: ws.user });

    connections.set(ws.user.id, ws)

    ws.on("message", async (buf) => {
        let msg: { type?: string };
        try {
            msg = JSON.parse(buf.toString());
        } catch {
            return;
        }

        let ready = false

        switch (msg.type) {
            case "find_opponent": {
                if (await redis.ZSCORE("queue", `user:${ws.user.id}`) !== null) return // already in queue

                const user = await prisma.user.findUnique({where: {id: ws.user.id}, select: {elo: true}}) // makes sure that connections can be reused
                if(!user) {
                    console.log("COULDN'T FIND USER IN DB")
                    return // send error message
                }

                queue(ws.user.id, user.elo).then(async (opponent) => {
                    if(!opponent) {
                        send(ws, "enqueued")
                        return
                    }
                    const sanitized_opponent = sanitize_opponent(opponent)

                    if(sanitized_opponent.value === ws.user.id) {
                        console.log("USER TRIED TO QUEUE TWICE => REJECTING") // add a TTL redis key into the queue so something going wrong doesnt break the app for the user forever
                        return
                    }
                    const opp = await prisma.user.findUnique({where: {id: sanitized_opponent.value}, select: {elo: true}})
                    if(!opp) {
                        console.log("DIDN'T FIND OPPONENT IN DB")
                        return
                    }
                    
                    const opponentWs = connections.get(sanitized_opponent.value)
                
                    if(!opponentWs) {
                        console.log("FATAL ERROR: OPPONENTS CONNECTION DOES NOT EXIST")
                        return
                    } // report errors to the client

                    const redisBattleID = `games:${ws.user.id}#${opponentWs.user.id}`

                    ;(ws as AuthedSocket).opponent = opponentWs?.user
                    ;(ws as AuthedSocket).redisBattleID = redisBattleID

                    ;(opponentWs as AuthedSocket).opponent = ws.user
                    ;(opponentWs as AuthedSocket).redisBattleID = redisBattleID

                    send(ws, "found_opponent", {id: opponentWs.user.id, name: opponentWs.user.name, elo: opp.elo})
                    send(connections.get(sanitized_opponent.value)!, "found_opponent", {...ws.user, elo: user.elo})

                    onOpponentFound(ws, opponentWs)
                }) 
                break;
            }
            case "abort": {
                break;
            }

            case "READY": {
                if(!ws.opponent || ready) return
                ready = true

                const opponent = ws.opponent
                const opponentWS = connections.get(opponent.id)

                if(!opponentWS || !ws.redisBattleID) {
                    console.log("Opponent web server does not exist in ready state") // report to client
                    return
                }
                
                const status = await redis.HGET(ws.redisBattleID, "state")
                console.log("STATUS: " + status)

                const generatedGame = generateRankedGame()

                if(status == "PLAYERS_READY_1") {
                    await redis.HSET(ws.redisBattleID, {"state": "PREP_PHASE"})

                    const entry = await prisma.battle.create({data: {
                        status: "PREP_PHASE",
                        game: JSON.stringify(generatedGame),
                        player1Id: ws.user.id,
                        player2Id: opponentWS.user.id,
                    }})

                    const game: rankedGame = {
                        ...generatedGame,
                        battleID: entry.id
                    }
                    
                    await redis.EXPIRE(ws.redisBattleID, PREP_PHASE_TIME + GAME_DURATION) // expire redis key for this battle after PREP_PHASE_TIME + GAME_DURATION. This allows reconnecting logic in the future but prevents database bugs that could arise from back to back games between the same players, because the game will have concluded by then
                    
                    send(ws, "PREP_PHASE", game)
                    send(opponentWS, "PREP_PHASE", game)

                    scheduleEvaluation(entry.id, [ws.user.id, opponentWS.user.id])

                    return
                }

                await redis.HSET(ws.redisBattleID, {"state": "PLAYERS_READY_1"})
                
            }
        }
    })

    ws.on("close", async () => {
        connections.delete(ws.user.id)
        const rem = await redis.ZREM("queue", "user:" + ws.user.id)
        if(rem) console.log("REMOVED user " + ws.user.name + "FROM QUEUE (connection closed)")
    });
});

getRedis()
    .then(() => server.listen(PORT, () => console.log(`battle server listening on :${PORT}`)))
    .catch((e) => { console.error("failed to connect redis", e); process.exit(1); });
