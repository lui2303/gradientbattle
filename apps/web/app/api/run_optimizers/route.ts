import { objectiveFunction } from "@gradientbattle/core";
import { matyasFunction } from "@gradientbattle/core/src/functions/matyas_function";
import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory";
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";


const CHALLENGE_ID_FUNC_LOOKUP: Record<number, objectiveFunction> = {
    1: new matyasFunction()
}

export async function POST(request: Request) {
    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { optimizers, steps, challengeId } = body;
    if (!optimizers) {
        return NextResponse.json({ error: "Missing fields" }, { status: 422 });
    }

    const func = CHALLENGE_ID_FUNC_LOOKUP[challengeId]
    const sim_engine = new SimulationEngine(func, steps)

    Object.keys(optimizers).forEach((optiKey) => {
                    sim_engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params,
                        objective: func, 
                        startingPoint: optimizers[optiKey].startingPoint,
                        id: optiKey}))
                })

    const traces = Array.from(sim_engine)

    const entry = await prisma.run.create({ data: { traces: traces, iterations: traces.length, challengeID: challengeId } });
    
    return NextResponse.json({ "id": entry.id, "traces": traces, "iterations": entry.iterations }, { status: 201 });
  }

export async function GET(request: Request) {
    const data = await prisma.run.findMany()
    return NextResponse.json(data, {status: 200});
}