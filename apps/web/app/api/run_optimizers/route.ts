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

    const { optimizers, steps, funcName  } = body;
    console.log(optimizers)

    if (!optimizers) {
        return NextResponse.json({ error: "Missing fields" }, { status: 422 });
    }

    const func = functionFactory(funcName)

    const sim_engine = new SimulationEngine(func, steps)

    Object.keys(optimizers).forEach((optiKey) => {
                    const opt = optimizers[optiKey]
                    sim_engine.addOptimizer(optimizerFactory(opt.name, opt.params, opt.startingPoint.value, optiKey, func))
        })

    const traces = Array.from(sim_engine)

    const query = {
            data: {
                optimizers: optimizers,
                steps: steps,
                funcName: funcName,
                ...(sim_engine.bestRun && { bestRun: sim_engine.bestRun }),
                lastIterate: Object.fromEntries(sim_engine.optimizers.map((opt, k) => [opt.id, traces[traces.length - 1][k]]))
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