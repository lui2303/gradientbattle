import { getCurrentChallenge } from "../../challenge";
import { MAX_STEPS } from "@/app/constants";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

    const { optimizers } = body;

    if (!optimizers) {
        return NextResponse.json({ error: "Missing fields" }, { status: 422 });
    }

    const currentChallenge = await getCurrentChallenge()

    if(Number(id) != currentChallenge.id) return NextResponse.json({error: "challenge for submitted ID is not the current daily challenge"}, { status: 409 })

    const func = functionFactory(currentChallenge.name)

    const sim_engine = new SimulationEngine(func, MAX_STEPS)

    Object.keys(optimizers).forEach((optiKey) => {
                    sim_engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params,
                        objective: func, 
                        startingPoint: optimizers[optiKey].startingPoint,
                        id: optiKey}))
                })

    const traces = Array.from(sim_engine)

    const query = {
            data: {
                challengeID: Number(id),
                username: username,
                optimizers: optimizers,
                iterations: sim_engine.bestRun ? sim_engine.bestRun.iterations : 101,
                lastIterate: Object.fromEntries(sim_engine.optimizers.map((opt, k) => [opt.id, traces[traces.length - 1][k]]))
            }
        }
    const entry = await prisma.challengeRun.create(query);

    return NextResponse.json({id: entry.id, traces: traces, createdAt: entry.createdAt}, { status: 201 });
}