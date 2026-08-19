import { API_BASE_URL, INTERNAL_SERVICE_TOKEN, STALE_GRACE_MS } from "@/app/constants";
import { prisma } from "@/lib/prisma";
import { logger } from "@/lib/logger";

const BATCH_SIZE = 200;


async function sweep_battles(): Promise<number> {
    if (!INTERNAL_SERVICE_TOKEN) throw new Error("INTERNAL_SERVICE_TOKEN is not set — every evaluate call would 401");

    const stale = await prisma.battle.findMany({
        where: {
            status: { not: "evaluated" },
            endsAt: { lt: new Date(Date.now() - STALE_GRACE_MS) },
        },
        select: { id: true },
        orderBy: { endsAt: "asc" },
        take: BATCH_SIZE,
    })

    if (stale.length === 0) {
        logger.debug("no stale battles to sweep")
        return 0
    }

    logger.info({ count: stale.length }, "sweeping stale battles")

    let failures = 0

    for (const battle of stale) {
        try {
            const res = await fetch(`${API_BASE_URL}/api/battle/${battle.id}/evaluate`, {
                headers: { authorization: `Bearer ${INTERNAL_SERVICE_TOKEN}` },
            })

            if (!res.ok) {
                failures++
                logger.error({ battleID: battle.id, status: res.status, body: await res.text() }, "evaluate request failed")
                continue
            }

            logger.info({ battleID: battle.id, result: await res.json() }, "stale battle evaluated")
        } catch (err) {
            failures++
            logger.error({ err, battleID: battle.id }, "evaluate request threw")
        }
    }

    logger.info({ swept: stale.length - failures, failures }, "sweep finished")

    return failures
}

sweep_battles()
    .then((failures) => { process.exitCode = failures > 0 ? 1 : 0 })
    .catch((err) => {
        logger.fatal({ err }, "sweep threw")
        process.exitCode = 1
    })
    .finally(() => prisma.$disconnect())
