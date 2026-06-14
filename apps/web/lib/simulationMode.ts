import { defaultOptimizer } from "@/app/constants";
import { objectiveFunction, Optimizer, Point } from "@gradientbattle/core";
import { functionList } from "@gradientbattle/core/src/functions/function_registry";
import { optimizationAlgorithms } from "@gradientbattle/core/src/optimizers/optimizer_registry";
import { Session } from "next-auth";


type RankedOptimizationAlgorithm = {name: string, params: Record<string, {enabled: boolean, value: number}>, startingPoint: {fixed: boolean, value: Point}}

type FrontendOptimizer = RankedOptimizationAlgorithm & {color: string}

export interface SimulationMode {
    run(optimizer: Record<string, FrontendOptimizer>, funcName: string, steps: number): Promise<{ traces: Point[][] } | { traces: null }> // callback for sending request to right server endpoint to start the run

    onRunComplete?(): void // for example logic for saving the run to a notebook
    onStep?(step: Point[], stepNumber: number): void

    allowedOptimizer: FrontendOptimizer[]
    allowedFunctions: string[] //objectiveFunction[]

    
    requiresAuth: boolean
    session?: Session | null // for authenticated use cases the parent needs to do the auth, because auth cant be conditional.
}

export const FreeForAllSimulationMode: SimulationMode = {
    async run(optimizer: Record<string, FrontendOptimizer>, funcName: string, steps: number) {
        const res = await fetch(
            "/api/run_optimizers",
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ optimizers: optimizer, steps: steps, funcName: funcName }
                ),
            }
        );
        const resp = await res.json();
        console.log(resp);

        const { traces }: { traces: Point[][]; id: string; createdAt: string; } = resp;

        return { traces };
    },

    allowedFunctions: functionList,
    requiresAuth: false,
    allowedOptimizer: Object.entries(optimizationAlgorithms).map(([k,v]) => { // convert the optimizer definitions inside the optimizer registry to the right frontend type
        return {
            name: k,
            startingPoint: {fixed: false, value: {x: 5, y: 5}},
            params: Object.fromEntries(
                Object.entries(v.params).map(([key, value]) => {
                    return [key, { enabled: true, value: value }]
                })
            ),
            color: "#000000"
        }
    })
}