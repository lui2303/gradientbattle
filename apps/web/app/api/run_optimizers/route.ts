import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory";
import { paramRangeError } from "@gradientbattle/core/src/optimizers/optimizer_registry";
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { functionFactory } from "@gradientbattle/core/src/functions/function_factory";
import { MAX_OPTIMIZERS, MAX_STEPS } from "@/app/constants";
import { clientIp, enforceRateLimit } from "@/lib/rateLimit";
import { FrontendOptimizer } from "@/app/types";

export async function POST(request: Request) {

    const limited = await enforceRateLimit("run_optimizers", clientIp(request));
    if (limited) return limited;

    let body;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const { optimizers, steps, funcName  } = body;

    if (!optimizers || !steps) {
        return NextResponse.json({ error: "Missing fields" }, { status: 422 });
    }

    if (Object.keys(optimizers).length > MAX_OPTIMIZERS) return NextResponse.json({ error: "Only allowed to submit  " + MAX_OPTIMIZERS + "optimizers" }, { status: 422 })

    if (steps > MAX_STEPS) {
        return NextResponse.json({ error: "Steps exceed the maximum of allowed steps of " + MAX_STEPS }, { status: 422 })
    }

    for (const opt of Object.values(optimizers as Record<string, FrontendOptimizer>)) {
        const rangeError = paramRangeError(opt?.name, opt?.params)
        if (rangeError) return NextResponse.json({ error: rangeError }, { status: 422 })
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

// inefeciency: dont render points if min is reached in contour plot