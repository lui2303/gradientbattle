import { getRedis } from "@/lib/redisClient";
import { EOL } from "node:os";
 
const ELO_TOLERANCE = 50


async function queue(userID: string, elo: number) {
    const redis = await getRedis();

    const possibleOpponents = await redis.ZRANGEBYSCORE_WITHSCORES("queue", Math.max(elo - ELO_TOLERANCE, 0), elo + ELO_TOLERANCE)
    if(possibleOpponents) return possibleOpponents[0]
    
    await redis.ZADD("queue", [{score: elo, value: `user:${userID}`}]);

    // make this operation atomic in the future. can slow down if too many clients exist because ghost games can occur
}

queue("SDASLDJSLAd", 2)
