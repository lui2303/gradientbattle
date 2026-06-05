import { createClient } from "redis";

// One shared client, reused across Next.js hot-reloads and the battle server,
// so module re-evaluation doesn't open a new socket each time.
const globalForRedis = globalThis as unknown as { redis?: ReturnType<typeof createClient> };

const redis = globalForRedis.redis ?? createClient({ url: process.env.REDIS_URL ?? "redis://localhost:6379" });
if (!globalForRedis.redis) {
    redis.on("error", (e) => console.error("redis error", e));
    globalForRedis.redis = redis;
}

// Connect lazily — node-redis commands only work after connect(). No top-level
// await (that breaks under CommonJS), and importing this file has no side effect.
async function getRedis() {
    if (!redis.isOpen) await redis.connect();
    return redis;
}

export { redis, getRedis };
