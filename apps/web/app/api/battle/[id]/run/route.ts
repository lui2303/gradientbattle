
import { MAX_SUBMISSIONS } from "@/app/constants";
import { FrontendOptimizer, rankedGame } from "@/app/types";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getRedis } from "@/lib/redisClient";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";
import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory";
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine";
import { NextResponse } from "next/server";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> },) {
    const session = await auth()
    const username = session?.user?.name
    if(!session || !username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    let body;
    const { id } = await params
    
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const optimizers = body.optimizers as Record<string, FrontendOptimizer>;

    if (!optimizers) {
        return NextResponse.json({ error: "Missing fields" }, { status: 422 });
    }

    const currentBattle = await prisma.battle.findUnique({where: {id: id, endsAt: { gt: new Date() }}})

    if(!currentBattle) return NextResponse.json({ error: "Game does not exist or is completed" }, { status: 422 });

    if(currentBattle.player1Id !== session.user?.id && currentBattle.player2Id !== session.user?.id ) {
        return NextResponse.json({ error: "You are not allowed to submit a run to this game" }, { status: 422 });
    }

    const game = JSON.parse(currentBattle.game as string) as rankedGame

    const optimizersAreValid = () => {
        return Object.entries(optimizers).every(([key, value]) => {
            const targetOptimizer = game.optimizers.find((opt) => opt.name === value.name)
            if(!targetOptimizer) return false

            if(value.startingPoint.fixed !== targetOptimizer.startingPoint.fixed) return false

            return Object.entries(value.params).every(([param, config]) => {
                const targetParam = targetOptimizer.params[param]
                return targetParam !== undefined && config.enabled === targetParam.enabled
            })
        })
    }

    if(!optimizersAreValid()) return NextResponse.json({ error: "You are not allowed to submit a run with different optimizer state then pined by the server" }, { status: 422 });

    const redis = await getRedis()
    const submissionKey = `battle:${id}:submissions:${session.user.id}`
    const submissionCount = await redis.INCR(submissionKey)

    await redis.EXPIRE(submissionKey, 130)
    if (submissionCount > MAX_SUBMISSIONS) {
        return NextResponse.json({ error: `You can't exceed the maximum of ${MAX_SUBMISSIONS} submissions`, submissionCount: MAX_SUBMISSIONS }, { status: 429 });
    }

    // Pinned fields are authoritative: overwrite client-supplied values for fixed starting
    // points and disabled params so a player can't smuggle in values the server pinned.
    for (const value of Object.values(optimizers)) {
        const targetOptimizer = game.optimizers.find((opt) => opt.name === value.name)!
        if (targetOptimizer.startingPoint.fixed) {
            value.startingPoint.value = targetOptimizer.startingPoint.value
        }
        for (const [param, config] of Object.entries(value.params)) {
            if (!targetOptimizer.params[param].enabled) {
                config.value = targetOptimizer.params[param].value
            }
        }
    }

    const func = functionFactory(game.objective)
    const sim_engine = new SimulationEngine(func, 100)

    Object.keys(optimizers).forEach((optiKey) => {
                    sim_engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, optimizers[optiKey].params,
                    optimizers[optiKey].startingPoint.value,
                    optiKey,
                    func
                ))
    })

    const traces = Array.from(sim_engine)

    const entry = await prisma.battleRun.create({
        data: {
        player: { connect: { id: session.user.id } }, 
        battle: { connect: { id: id } },
        optimizers,
        lastIterate: traces[traces.length - 1],
        bestRun: sim_engine.bestRun ? sim_engine.bestRun : undefined,
        },
    });

    return NextResponse.json({id: entry.id, traces: traces, createdAt: entry.createdAt, submissionCount: submissionCount}, { status: 201 });
} 