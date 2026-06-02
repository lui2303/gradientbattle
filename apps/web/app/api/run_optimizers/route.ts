import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory";
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentChallenge } from "../challenge";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";

export async function POST(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { optimizers, steps, funcName , challengeMode } = body;

    if (!optimizers) {
        return NextResponse.json({ error: "Missing fields" }, { status: 422 });
    }

    let currentChallenge;
    const func = functionFactory(funcName)

    if(challengeMode) {
        currentChallenge = await getCurrentChallenge()
        if(currentChallenge.name != func.name) return NextResponse.json({ error: "Submitted function does not match the daily function" }, { status: 422 });
    }

    const sim_engine = new SimulationEngine(func, steps)

    Object.keys(optimizers).forEach((optiKey) => {
                    sim_engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params,
                        objective: func, 
                        startingPoint: optimizers[optiKey].startingPoint,
                        id: optiKey}))
                })

    const traces = Array.from(sim_engine)

    const query = {
            data: {
                optimizers: optimizers,
                steps: steps,
                funcName: funcName,
                ...(sim_engine.bestRun && { bestRun: sim_engine.bestRun }),
                ...(challengeMode && { challengeID: currentChallenge!.id }),
                lastIterate: traces[traces.length - 1]
            }
        }
    
    const entry = await prisma.run.create(query);

    return NextResponse.json({id: entry.id, traces: traces, createdAt: entry.createdAt}, { status: 201 });
  }

export async function GET(request: Request) {
    const data = await prisma.run.findMany()
    return NextResponse.json(data, {status: 200});
}
// inefeciency: dont render points if min is reached in contour plot