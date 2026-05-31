'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useEffect, useMemo, useRef, useState } from "react"
import { Optimizer, TraceData } from "../types"
import ContourPlot from "./ContourPlot"
import { SimulationEngine } from "@gradientbattle/core/src/simulation_engine"
import { quadraticFunction } from "@gradientbattle/core/src/functions/quadratic_function"
import { optimizerFactory } from "@gradientbattle/core/src/optimizers/optimizer_factory"
import { FunctionSelector } from "./FunctionSelector"
import { objectiveFunction } from "@gradientbattle/core"
import { Leaderboard } from "./Leaderboard"
import { norm } from "@gradientbattle/core/src/math_helper"
import { DistancePlot } from "./DistancePlot"
import { ObjectiveValuePlot } from "./ObjectiveValuePlot"



export function AlgoSimulation() {
    const defaultOptimizer = {
            "name": optimizationAlgorithmsList[0],
            "params": optimizationAlgorithms[optimizationAlgorithmsList[0]]["params"],
            "startingPoint": {x: 5, y: 5},
            "color": "#0bf565"
        }

    const [func, setFunc] = useState<objectiveFunction>(new quadraticFunction([[1, 0],[0,1]], {x: 0, y:0}, 0))

    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[crypto.randomUUID()]: defaultOptimizer})
    
    const [running, setRunning] = useState(false);
    const runningRef = useRef(false);

    const [animationSpeed, setAnimationSpeed] = useState(50)
    
    const [optimizerTraces, setOptimizerTraces] = useState<TraceData>([{
                        x: [defaultOptimizer.startingPoint.x],
                        y: [defaultOptimizer.startingPoint.y],
                        type: "scatter" as const,
                        mode: "lines+markers" as const,
                        name: Object.keys(optimizers)[0],
                        line: { color: defaultOptimizer.color },
                        distances: [norm(defaultOptimizer.startingPoint)],
                        objectiveValues: [func.objective(defaultOptimizer.startingPoint)]
                }])
    
    
    const engine = useMemo(
        () => {
            const engine = new SimulationEngine(func, 100);
            Object.keys(optimizers).forEach((optiKey) => {
                engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params,
                    objective: func, 
                    startingPoint: optimizers[optiKey].startingPoint,
                    id: optiKey}))
            })
            return engine
        },
        [optimizers, func]
    )

    const playSimulation = async () => {
        if (runningRef.current) {
            runningRef.current = false;
            setRunning(false);
            return
        }

        if (engine.optimizers.length === 0) return
        
        engine.reset_optimizers()

        runningRef.current = true;
        setRunning(true);

        const res = await fetch("/api/run_optimizers", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                optimizers,          // ← your existing Record<string, Optimizer> state, unchanged
                steps: 100,
                challengeId: 1,
            }),
         });
        const { id, traces, iterations } = await res.json();

        setOptimizerTraces(prev => prev.map((item) => ({...item, x: [(item.x! as number[])[0]], y: [(item.y! as number[])[0]], distances: [item.distances[0]], objectiveValues: [item.objectiveValues[0]]})))

        for (const step of engine) {
        if (runningRef.current !== true) return

        setOptimizerTraces(prev =>
            prev.map((trace, index) => ({
                    ...trace,
                    x: [...((trace.x as number[])), step[index].x],
                    y: [...((trace.y as number[])), step[index].y],
                    distances: [...trace.distances, norm(step[index])],
                    objectiveValues: [...trace.objectiveValues,func.objective(step[index])]
                })
            )
        );

        await new Promise((r) => setTimeout(r, animationSpeed));
        }

        runningRef.current = false;
        setRunning(false);
    };

    return (
        <div>
            <div className="flex flex-col gap-4 p-4">

                <div className="grid grid-cols-3 gap-4"> 
                    <ContourPlot objFunction={func} optimizerTraces={optimizerTraces} setOptimizerTraces={setOptimizerTraces}></ContourPlot>
                
                    <DistancePlot optimizerTraces={optimizerTraces} setOptimizerTraces={setOptimizerTraces}></DistancePlot>

                    <ObjectiveValuePlot optimizerTraces={optimizerTraces} setOptimizerTraces={setOptimizerTraces}></ObjectiveValuePlot>
                </div>
                

                <Leaderboard optimizers={optimizers} optimizerTraces={optimizerTraces} objectiveFunction={func}></Leaderboard>
                <div className="flex flex-col gap-2 mt-2">
                    <button className="bg-cyan-800" onClick={playSimulation}>{running ? "Stop" : "Start"}</button>
                    <br />
                    <label>Animation Speed: { animationSpeed } ms</label>
                    <input
                    type="range"
                    min="50"
                    max="2000"
                    value={animationSpeed}
                    onChange={(e) => setAnimationSpeed(Number(e.target.value))}

                    />
                </div>
                <FunctionSelector func={func} setFuncCallback={(func) => {
                    setFunc(func)
                    setOptimizerTraces(prev => prev.map((item) => ({...item,
                        x: [(item.x! as number[])[0]],
                        y: [(item.y! as number[])[0]],
                        distances: [norm({x: (item.x! as number[])[0], y: (item.y! as number[])[0]})],
                        objectiveValues: [func.objective({x: (item.x! as number[])[0], y: (item.y! as number[])[0]})]})))
                }}></FunctionSelector>
                
                <AlgorithmSelectContainer func={func} optimizers={optimizers} setOptimizers={setOptimizers} defaultOptimizer={defaultOptimizer} setOptimizerTraces={setOptimizerTraces}>
                </AlgorithmSelectContainer>
            </div>
        </div>

    )
}