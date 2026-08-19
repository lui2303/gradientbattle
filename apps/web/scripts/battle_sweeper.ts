import { API_BASE_URL, INTERNAL_SERVICE_TOKEN, STALE_GRACE_MS } from "@/app/constants";
import { prisma } from "@/lib/prisma";

async function sweep_battles(){
    const stale = await prisma.battle.findMany({
        where: {
            status: { not: "evaluated" },
            endsAt: { lt: new Date(Date.now() - STALE_GRACE_MS) },
        },
        select: { id: true },
        orderBy: { endsAt: "asc" },
        take: 200,
    })

    stale.forEach(async (battle) => {
        const res = await fetch(`${API_BASE_URL}/api/battle/${battle.id}/evaluate`, {
                        headers: { authorization: `Bearer ${INTERNAL_SERVICE_TOKEN}` },
                    })
                    if (!res.ok) {
                        console.error({ battleId: battle.id, status: res.status, body: await res.text() }, "evaluate request failed")
                        return
                    }
    })
}

await sweep_battles()