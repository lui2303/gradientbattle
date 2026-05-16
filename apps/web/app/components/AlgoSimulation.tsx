'use client'

import { optimizationAlgorithms, optimizationAlgorithmsList } from "@gradientbattle/core/src/optimizers/optimizer_registry"
import AlgorithmSelectContainer from "./AlgorithmSelectContainer"
import { useMemo, useRef, useState } from "react"
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
    const id = crypto.randomUUID()
    const [optimizers, setOptimizers] = useState<Record<string, Optimizer>>({[id]: defaultOptimizer})
    const [running, setRunning] = useState(false);
    const runningRef = useRef(false);
    
    const [optimizerTraces, setOptimizerTraces] = useState<TraceData>([{
                        x: [defaultOptimizer.startingPoint.x],
                        y: [defaultOptimizer.startingPoint.y],
                        type: "scatter" as const,
                        mode: "lines+markers" as const,
                        name: id,
                        line: { color: defaultOptimizer.color },
                        distances: [norm(defaultOptimizer.startingPoint)],
                        objectiveValues: [func.objective(defaultOptimizer.startingPoint)]
                }])
    
    const engine = useMemo(
        () => {
            const engine = new SimulationEngine(func, 100, Object.values(optimizers).map(x => x.startingPoint));
            Object.keys(optimizers).forEach((optiKey) => {
                engine.addOptimizer(optimizerFactory(optimizers[optiKey].name, {...optimizers[optiKey].params,
                    objective: func, 
                    startingPoint: optimizers[optiKey].startingPoint,
                    id: optiKey}))
            })
            return engine
            
        },
        [optimizers, func]
    );


    return (
        <div>
            <div className="flex flex-col gap-4 p-4">
                <ContourPlot simulationEngine={engine}
                    objFunction={func} optimizers={optimizers}
                    running={running} setRunning={setRunning}
                    runningRef={runningRef} optimizerTraces={optimizerTraces}
                    setOptimizerTraces={setOptimizerTraces}></ContourPlot>
                
                <DistancePlot optimizerTraces={optimizerTraces}></DistancePlot>

                <ObjectiveValuePlot optimizerTraces={optimizerTraces}></ObjectiveValuePlot>

                <Leaderboard optimizers={optimizers} optimizerTraces={optimizerTraces} objectiveFunction={func}></Leaderboard>

                <FunctionSelector func={func} setFuncCallback={(func) => {
                    setFunc(func)
                    setOptimizerTraces(prev => prev.map((item) => ({...item,
                        x: [(item.x! as number[])[0]],
                        y: [(item.y! as number[])[0]],
                        distances: [item.distances[0]],
                        objectiveValues: [item.objectiveValues[0]]})))
                }}></FunctionSelector>
                
                <AlgorithmSelectContainer func={func} optimizers={optimizers} setOptimizers={setOptimizers} defaultOptimizer={defaultOptimizer} setOptimizerTraces={setOptimizerTraces}>
                </AlgorithmSelectContainer>
            </div>
        </div>

    )
}