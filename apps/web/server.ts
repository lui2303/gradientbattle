import { createServer, validateHeaderValue } from "node:http";
import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";
import { decode } from "next-auth/jwt";
import { getRedis, redis } from "./lib/redisClient";
import { userAgent } from "next/server";

const PORT = Number(process.env.BATTLE_PORT ?? 3001);
const SECRET = process.env.AUTH_SECRET;
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
const connections = new Map<string, AuthedSocket>();

wss.on("connection", (raw) => {
    const ws = raw as AuthedSocket;
    send(ws, "connected", { user: ws.user });

    connections.set(ws.user.id, ws)

    console.log("Send message")

    ws.on("message", (buf) => {
        let msg: { type?: string };
        try {
            msg = JSON.parse(buf.toString());
        } catch {
            return;
        }

        switch (msg.type) {
            case "find_opponent": {
                queue(ws.user.id, 400).then((opponent) => {
                    if(!opponent) {
                        send(ws, "enqueued")
                        return
                    }

                    opponent = sanitize_opponent(opponent)
                    console.log(opponent)
                    
                    const opponentWs = connections.get(opponent.value)
                    if(!opponentWs) {
                        console.log("FATAL ERROR: OPPONENTS CONNECTION DOES NOT EXIST")
                        return
                    } // report errors to the client

                    send(ws, "found_opponent", {...opponentWs.user, elo: 400})
                    send(connections.get(opponent.value)!, "found_opponent", {...ws.user, elo: 400})
                }) 
                break;
                }
            }
    })

    ws.on("close", () => {
        connections.delete(ws.user.id)
    });
});

server.listen(PORT, () => console.log(`battle server listening on :${PORT}`));
