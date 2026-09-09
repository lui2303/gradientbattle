import { NextResponse } from "next/server";
import { RATE_LIMIT_MAX_REQUESTS, RATE_LIMIT_WINDOW_SECONDS } from "@/app/constants";
import { getRedis } from "@/lib/redisClient";


export function clientIp(request: Request): string {
    const forwarded = request.headers.get("x-forwarded-for");
    if (!forwarded) return "unknown";
    return forwarded.split(",").pop()?.trim() || "unknown";
}


export async function enforceRateLimit(scope: string, identity: string): Promise<NextResponse | null> {
    const window = Math.floor(Date.now() / 1000 / RATE_LIMIT_WINDOW_SECONDS);
    const key = `rate:${scope}:${identity}:${window}`;

    const redis = await getRedis();
    const [count] = (await redis.multi().INCR(key).EXPIRE(key, RATE_LIMIT_WINDOW_SECONDS).exec()) as [number, unknown];

    if (count <= RATE_LIMIT_MAX_REQUESTS) return null;

    return NextResponse.json(
        { error: `Rate limit exceeded — at most ${RATE_LIMIT_MAX_REQUESTS} requests per ${RATE_LIMIT_WINDOW_SECONDS / 60} minutes.` },
        { status: 429, headers: { "Retry-After": String(RATE_LIMIT_WINDOW_SECONDS) } },
    );
}
